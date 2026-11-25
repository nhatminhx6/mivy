'use client';
// Băng đeo chéo 3D: ma-nơ-canh bán thân (vải lanh, cổ gỗ, chân trụ) + băng satin vắt vai phải → hông trái.
// Băng = giao tuyến của 9 mặt phẳng song song (cách nhau theo bề rộng băng) với bề mặt thân → ôm sát cong ngực/vai/lưng.
// UV dọc băng = đúng vị trí x trên file in (hông → lưng → vai → ngực → hông), nên chữ đoạn trước hiện đúng chỗ.
// Nhũ vàng/bạc: kim loại thật (bản đồ metal/roughness dựng từ khuôn nhũ). Hông: hoa cài / tua rua + 2 đuôi băng.
// Thêm 1 băng thứ 2 gấp nằm dưới sàn, khoe đoạn chữ.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { frontZone, shInk, shSatin, shSize, type SHSpec } from './sash-engine';

export interface Sash3DOpts { tex: SVGSVGElement | null; mask: SVGSVGElement | null; spec: SHSpec; fontCss: string }

// ---- ma-nơ-canh (mm, gốc = đáy thân) ----
const PROF: [number, number][] = [ // [y, bán kính theo trục x]
  [0, 150], [30, 166], [80, 170], [170, 160], [260, 140], [320, 134], [400, 144], [470, 158], [540, 164], [610, 162],
  [660, 162], [695, 180], [718, 184], [740, 174], [756, 152], [768, 120], [777, 84], [782, 58],
];
const SZ = 0.66;        // dẹt trước-sau
const NECK_R = 55, NECK_TOP = 860;
// profile mịn (spline qua các điểm trên, 2mm/điểm) — DÙNG CHUNG cho lưới thân và phép tìm bề mặt → băng không bị thân xuyên qua
const DENSE: [number, number][] = (() => {
  const c = new THREE.SplineCurve(PROF.map(([y, r]) => new THREE.Vector2(y, r)));
  const n = Math.round(PROF[PROF.length - 1][0] / 2);
  return c.getSpacedPoints(n).map((p) => [p.x, p.y] as [number, number]);
})();
function radAt(y: number): number {
  if (y < 0) return -1;
  const top = DENSE[DENSE.length - 1][0];
  if (y > top) return y <= NECK_TOP ? NECK_R : -1;
  let lo = 0, hi = DENSE.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (DENSE[m][0] <= y) lo = m; else hi = m; }
  const [y0, r0] = DENSE[lo], [y1, r1] = DENSE[hi];
  return r0 + ((r1 - r0) * (y - y0)) / Math.max(1e-6, y1 - y0);
}
const inside = (p: THREE.Vector3) => { const r = radAt(p.y); return r > 0 && (p.x / r) ** 2 + (p.z / (r * SZ)) ** 2 < 1; };

function linenTex(aniso: number) {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#DCD1BF'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 512; i += 2) {
    x.fillStyle = `rgba(120,100,70,${0.03 + Math.random() * 0.04})`; x.fillRect(0, i, 512, 1);
    x.fillStyle = `rgba(255,255,255,${0.03 + Math.random() * 0.04})`; x.fillRect(i, 0, 1, 512);
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(10, 6);
  return t;
}

function mannequin(aniso: number): THREE.Group {
  const g = new THREE.Group();
  const pts = [new THREE.Vector2(0, 0), ...DENSE.map(([y, r]) => new THREE.Vector2(r, y))];
  const lathe = new THREE.LatheGeometry(pts, 160);
  lathe.scale(1, 1, SZ);
  lathe.computeVertexNormals();
  const fabric = new THREE.MeshStandardMaterial({ map: linenTex(aniso), roughness: 0.92 });
  const torso = new THREE.Mesh(lathe, fabric);
  torso.castShadow = true; torso.receiveShadow = true;
  g.add(torso);
  // đường may giữa thân (trước + sau) — chỉ mảnh màu đậm hơn vải
  const seamMat = new THREE.MeshStandardMaterial({ color: '#B9AE9A', roughness: 0.9 });
  for (const zs of [1, -1]) {
    const sp: THREE.Vector3[] = [];
    for (let y = 8; y <= 770; y += 12) sp.push(new THREE.Vector3(0, y, zs * (radAt(y) * SZ + 0.6)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(sp), 80, 0.9, 5, false), seamMat));
  }
  const wood = new THREE.MeshStandardMaterial({ color: '#6B4426', roughness: 0.45 });
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(NECK_R * 0.98, NECK_R, NECK_TOP - 778, 48), fabric);
  neck.scale.z = 0.92; neck.position.y = (778 + NECK_TOP) / 2; neck.castShadow = true; g.add(neck);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(NECK_R * 1.02, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), wood);
  cap.scale.set(1, 0.42, 0.94); cap.position.y = NECK_TOP; cap.castShadow = true; g.add(cap);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(16, 24, 16), wood); knob.position.y = NECK_TOP + 26; g.add(knob);
  return g;
}

function stand(h: number): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#2B2B2E', metalness: 0.7, roughness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ color: '#5A3A22', roughness: 0.5 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(165, 172, 22, 64), wood); base.position.y = 11; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(13, 15, h - 22, 24), metal); pole.position.y = 22 + (h - 22) / 2; pole.castShadow = true; g.add(pole);
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(30, 34, 26, 32), metal); collar.position.y = h - 13; g.add(collar);
  return g;
}

/** lưới băng: rows[k][i] (k ngang bề rộng, i dọc), us[i] = toạ độ u texture */
function gridGeo(rows: THREE.Vector3[][], us: number[], v0 = 0, v1 = 1): THREE.BufferGeometry {
  const K = rows.length, N = rows[0].length;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let k = 0; k < K; k++) for (let i = 0; i < N; i++) {
    const p = rows[k][i]; pos.push(p.x, p.y, p.z);
    uv.push(us[i], v0 + ((v1 - v0) * k) / (K - 1));
  }
  for (let k = 0; k < K - 1; k++) for (let i = 0; i < N - 1; i++) {
    const a = k * N + i, b = a + 1, c = a + N, d = c + 1;
    idx.push(a, c, b, b, c, d);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

async function raster(el: SVGSVGElement, css: string, w: number, h: number, bg: string) {
  return svgToCanvas(await selfContainedSvg(el, css), w, h, bg);
}
// G = độ nhám, B = kim loại (theo quy ước metalnessMap/roughnessMap của three)
async function foilMap(mask: SVGSVGElement, css: string, w: number, h: number, metal = 1) {
  const f = (await raster(mask, css, w, h, '#000000')).getContext('2d')!.getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = f[i] / 255;
    d[i] = 255; d[i + 1] = Math.round(255 * (0.4 - 0.06 * k)); d[i + 2] = Math.round(255 * k * metal); d[i + 3] = 255; // nhũ hơi nhám → sáng đều, không bắt mảng tối
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}

export function sashBuilder(o: Sash3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong băng');
    const sz = shSize(o.spec.size), sat = shSatin(o.spec.satin), ink = shInk(o.spec.ink);
    const { L, W } = sz;
    const TW = 8192, TH = Math.max(64, Math.round((TW * W) / L));
    const map = canvasTex(await raster(o.tex, o.fontCss, TW, TH, sat.bg), aniso);
    map.anisotropy = aniso;
    let fm: THREE.Texture | null = null;
    if (ink.foil && o.mask) fm = await foilMap(o.mask, o.fontCss, TW, TH, ink.id === 'silver' ? 0.5 : 1); // bạc: nửa kim loại → sáng như giấy nhũ bạc, không phản chiếu mảng tối
    const satin = new THREE.MeshPhysicalMaterial({
      map, roughness: fm ? 1 : 0.4, metalness: fm ? 1 : 0, ...(fm ? { roughnessMap: fm, metalnessMap: fm } : {}),
      sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(sat.bg).lerp(new THREE.Color('#FFFFFF'), 0.55),
      clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
    });
    const plainSatin = new THREE.MeshPhysicalMaterial({
      color: sat.bg, roughness: 0.4, sheen: 1, sheenRoughness: 0.32, sheenColor: new THREE.Color(sat.bg).lerp(new THREE.Color('#FFFFFF'), 0.55),
      clearcoat: 0.3, clearcoatRoughness: 0.35, side: THREE.DoubleSide,
    });
    const trimMat = ink.foil
      ? new THREE.MeshStandardMaterial({ color: ink.flat, metalness: 1, roughness: 0.28 })
      : new THREE.MeshStandardMaterial({ color: sat.band, roughness: 0.5 });

    const out = new THREE.Group();
    const Y0 = 360; // đáy thân trên chân trụ
    out.add(stand(Y0));
    const body = new THREE.Group(); body.position.y = Y0; out.add(body);
    body.add(mannequin(aniso));

    // ---- băng vắt chéo: vai trái màn hình (vai phải người mặc) → hông phải màn hình ----
    const SP = new THREE.Vector3(-150, 752, 0), HP = new THREE.Vector3(150, 150, 0);
    const C = SP.clone().add(HP).multiplyScalar(0.5);
    const u = SP.clone().sub(HP).normalize();
    const v = new THREE.Vector3(0, 0, 1);
    const n = new THREE.Vector3(u.y, -u.x, 0);
    const K = 11, N = 560, OFF = 3;
    const rows: THREE.Vector3[][] = [];
    for (let k = 0; k < K; k++) {
      const s = -W / 2 + (W * k) / (K - 1);
      const c0 = C.clone().addScaledVector(n, s);
      const ts: number[] = [], ds: THREE.Vector3[] = [];
      for (let i = 0; i < N; i++) {
        const phi = Math.PI + (2 * Math.PI * i) / (N - 1);
        const d = u.clone().multiplyScalar(Math.cos(phi)).addScaledVector(v, Math.sin(phi));
        // đi từ tâm ra tới điểm RA ĐẦU TIÊN (thân có eo lõm → chia đôi cả đoạn dễ bắt nhầm giao điểm xa)
        let lo = 0, hi = 0;
        for (let t = 1.5; t < 1200; t += 1.5) { if (!inside(c0.clone().addScaledVector(d, t))) { hi = t; break; } lo = t; }
        for (let it = 0; it < 16; it++) { const m = (lo + hi) / 2; if (inside(c0.clone().addScaledVector(d, m))) lo = m; else hi = m; }
        ts.push(lo); ds.push(d);
      }
      // lọc MAX theo dọc băng: chỗ tia "lọt" sớm qua mép vai bo tròn → điểm thụt vào trong thân (răng cưa) → lấy max lân cận
      const row: THREE.Vector3[] = [];
      for (let i = 0; i < N; i++) {
        let t = ts[i];
        for (let j = Math.max(0, i - 4); j <= Math.min(N - 1, i + 4); j++) t = Math.max(t, ts[j] * (1 - Math.abs(j - i) * 0.004));
        row.push(c0.clone().addScaledVector(ds[i], t + OFF));
      }
      rows.push(row);
    }
    // arc length dọc đường giữa → u texture (x trên file in, tính từ đầu hông A)
    const mid = rows[(K - 1) / 2];
    const acc = [0];
    for (let i = 1; i < N; i++) acc.push(acc[i - 1] + mid[i].distanceTo(mid[i - 1]));
    const P = acc[N - 1];
    const xs = Math.max(0, (L - P) / 2);
    const us = acc.map((a) => (xs + a) / L);
    const band = new THREE.Mesh(gridGeo(rows, us), satin);
    band.castShadow = true; band.receiveShadow = true;
    body.add(band);

    // ---- chỗ nối ở hông: đuôi băng + hoa cài / tua rua ----
    const hip = mid[0].clone();
    const outward = hip.clone().setY(0).normalize();
    const ornament = new THREE.Group();
    ornament.position.copy(hip).addScaledVector(outward, 3);
    ornament.lookAt(hip.clone().addScaledVector(outward, 100).add(new THREE.Vector3(0, 0, 40)));
    body.add(ornament);
    const finish = o.spec.finish;
    const tailLen = finish === 'plain' ? 85 : 150;
    for (const side of [-1, 1]) {
      // đuôi băng rủ xuống, cắt đuôi én
      const tw = W * 0.82, segs = 24;
      const tRows: THREE.Vector3[][] = [];
      for (let k = 0; k < 5; k++) {
        const x = -tw / 2 + (tw * k) / 4;
        const row: THREE.Vector3[] = [];
        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const cut = Math.abs(x) / (tw / 2) * 26; // đuôi én: giữa ngắn hơn mép
          const y = -t * (tailLen - (26 - cut));
          row.push(new THREE.Vector3(x + side * t * 30, y, 4 + Math.sin(t * Math.PI) * 6 + side * 2));
        }
        tRows.push(row);
      }
      const tail = new THREE.Mesh(gridGeo(tRows, tRows[0].map((_, i) => i / segs)), plainSatin);
      tail.rotation.z = side * 0.16; tail.castShadow = true;
      ornament.add(tail);
      if (finish === 'fringe') {
        const fr = new THREE.Group();
        const strands = 16;
        for (let j = 0; j < strands; j++) {
          const x = -tw / 2 + (tw * (j + 0.5)) / strands;
          const ln = 62 + ((j * 37) % 11);
          const cut = Math.abs(x) / (tw / 2) * 26;
          const top = -(tailLen - (26 - cut));
          const m = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.7, ln, 6), trimMat);
          m.position.set(x + side * 30, top - ln / 2, 4 + side * 2);
          m.rotation.z = (x / tw) * 0.25;
          m.castShadow = true;
          fr.add(m);
        }
        fr.rotation.z = side * 0.16;
        ornament.add(fr);
      }
    }
    if (finish === 'rosette') {
      // hoa cài: 2 vòng satin xếp ly + nút giữa
      const rose = (r0: number, r1: number, folds: number, amp: number, z: number, mat: THREE.Material) => {
        const g = new THREE.RingGeometry(r0, r1, 160, 6);
        const p = g.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < p.count; i++) {
          const x = p.getX(i), y = p.getY(i), r = Math.hypot(x, y), a = Math.atan2(y, x);
          p.setZ(i, z + Math.sin(a * folds) * amp * ((r - r0) / (r1 - r0)) + (r1 - r) * 0.12);
        }
        g.computeVertexNormals();
        const m = new THREE.Mesh(g, mat); m.castShadow = true; return m;
      };
      ornament.add(rose(14, 74, 18, 5, 8, plainSatin));
      ornament.add(rose(10, 46, 14, 4, 15, trimMat));
      const btn = new THREE.Mesh(new THREE.SphereGeometry(16, 32, 16), trimMat);
      btn.scale.z = 0.55; btn.position.z = 20; ornament.add(btn);
    } else {
      const knot = new THREE.Mesh(new THREE.SphereGeometry(20, 28, 16), plainSatin);
      knot.scale.set(1.1, 0.8, 0.5); knot.position.z = 6; ornament.add(knot);
    }

    // ---- băng thứ 2 gấp nằm dưới sàn, khoe đoạn chữ ----
    const fz = frontZone(L);
    const a = fz.a - 50, b = fz.b + 50, len = b - a;
    const segsF = 160;
    const fRows: THREE.Vector3[][] = [];
    const ang = -0.16;
    const dir = new THREE.Vector3(Math.cos(ang), 0, Math.sin(ang));
    const perp = new THREE.Vector3(-dir.z, 0, dir.x);
    const origin = new THREE.Vector3(-len * 0.42, 0, 285);
    for (let k = 0; k < 5; k++) {
      const s = -W / 2 + (W * k) / 4;
      const row: THREE.Vector3[] = [];
      for (let i = 0; i <= segsF; i++) {
        const t = i / segsF;
        const p = origin.clone().addScaledVector(dir, t * len).addScaledVector(perp, s + Math.sin(t * Math.PI * 1.6) * 14);
        p.y = 1.2 + Math.sin(t * 40 + k) * 0.25;
        row.push(p);
      }
      fRows.push(row);
    }
    // v ngược (nhìn từ trên xuống, chữ đọc đúng chiều)
    const floorMat = satin.clone(); floorMat.sheen = 0.45; floorMat.clearcoat = 0.12; // nằm phẳng dưới đèn trên → bớt bóng loá
    const floorBand = new THREE.Mesh(gridGeo(fRows, fRows[0].map((_, i) => (a + (len * i) / segsF) / L), 1, 0), floorMat);
    floorBand.receiveShadow = true; floorBand.castShadow = true;
    out.add(floorBand);
    out.scale.setScalar(S);
    const g = new THREE.Group(); g.add(out);
    return { group: g, view: { az: 0.22, el: 0.22 }, aim: 0.47, zoom: 1.16, blob: 0.4 };
  };
}
