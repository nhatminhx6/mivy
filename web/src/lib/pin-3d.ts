'use client';
// Huy hiệu cài áo 3D: vỏ kim loại dập vòm, bản in ÔM theo mặt vòm rồi GẤP qua mép cong xuống hông (đúng như máy bấm
// huy hiệu: bản in Ø Dc gấp mép ra sau) — UV ánh xạ theo ĐỘ DÀI CUNG từ tâm nên giấy không bị giãn, vòng gấp mép
// trong file in hiện đúng ở hông huy hiệu. Phủ màng mylar bóng (clearcoat). Mặt sau: đế thiếc + kim cài / nam châm /
// khui bia / gương. Cảnh: 1 con nằm trên miếng vải canvas, 1 con nằm cạnh, 1 con lật ngửa khoe mặt sau.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { PinBack } from './pin-engine';

export interface Pin3DOpts {
  prints: (SVGSVGElement | null)[]; // bản in Ø Dc (mode 'print'), 1–2 mẫu
  d: number; dc: number;
  back: PinBack;
  fontCss: string;
}

// ---- mặt cắt vỏ huy hiệu (r, y) theo độ dài cung s từ tâm ----
interface Prof { r: number[]; y: number[]; s: number[]; R: number; H: number; side: number }
function profile(D: number): Prof {
  const R = D / 2, H = 0.1 * D + 0.6, rf = 0.07 * D, sd = 0.032 * D, Rd = R - rf;
  const Rs = (Rd * Rd + sd * sd) / (2 * sd);
  const pts: [number, number][] = [];
  const N1 = 80;
  for (let i = 0; i <= N1; i++) { const r = (i / N1) * Rd; pts.push([r, H - (Rs - Math.sqrt(Rs * Rs - r * r))]); }
  const cy = H - sd - rf; // tâm cung bo mép (Rd, cy)
  const N2 = 40;
  for (let i = 1; i <= N2; i++) { const a = Math.PI / 2 - (i / N2) * (Math.PI / 2); pts.push([Rd + rf * Math.cos(a), cy + rf * Math.sin(a)]); }
  const bottom = 0.35;
  for (let i = 1; i <= 6; i++) pts.push([R, cy - (i / 6) * (cy - bottom)]);
  const r: number[] = [], y: number[] = [], s: number[] = [];
  let acc = 0;
  pts.forEach(([pr, py], i) => {
    if (i) acc += Math.hypot(pr - pts[i - 1][0], py - pts[i - 1][1]);
    r.push(pr); y.push(py); s.push(acc);
  });
  return { r, y, s, R, H, side: acc };
}
const lerpAt = (p: Prof, s: number) => {
  let i = 1;
  while (i < p.s.length - 1 && p.s[i] < s) i++;
  const t = Math.min(1, Math.max(0, (s - p.s[i - 1]) / Math.max(1e-6, p.s[i] - p.s[i - 1])));
  return { r: p.r[i - 1] + (p.r[i] - p.r[i - 1]) * t, y: p.y[i - 1] + (p.y[i] - p.y[i - 1]) * t };
};

/** mặt vòm + hông có in: lưới vòng theo s, UV phẳng theo (s, góc) trên bản in Ø Dc */
function faceGeometry(p: Prof, Rc: number): THREE.BufferGeometry {
  const NR = 90, NS = 128;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= NR; i++) {
    const s = (i / NR) * p.side;
    const { r, y } = lerpAt(p, s);
    for (let j = 0; j < NS; j++) {
      const a = (j / NS) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      pos.push(r * ca * S, y * S, r * sa * S);
      uv.push(0.5 + (s * ca) / (2 * Rc), 0.5 - (s * sa) / (2 * Rc));
    }
  }
  for (let i = 0; i < NR; i++) for (let j = 0; j < NS; j++) {
    const a = i * NS + j, b = i * NS + ((j + 1) % NS), c = (i + 1) * NS + j, d = (i + 1) * NS + ((j + 1) % NS);
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const tin = () => new THREE.MeshStandardMaterial({ color: '#C9CDD2', metalness: 0.9, roughness: 0.34 });
const steel = () => new THREE.MeshStandardMaterial({ color: '#D9DCE1', metalness: 1, roughness: 0.2 });

/** mặt sau (đặt dưới mặt phẳng y=0, hướng xuống): mép cuộn + đế thiếc + phụ kiện */
function backParts(p: Prof, back: PinBack): THREE.Group {
  const g = new THREE.Group();
  const R = p.R;
  // mép vỏ cuộn vào trong (nhìn thấy khi lật)
  const lip = new THREE.LatheGeometry([
    new THREE.Vector2(R * S, 0.35 * S), new THREE.Vector2((R - 0.15) * S, 0.05 * S),
    new THREE.Vector2((R - 0.7) * S, -0.15 * S), new THREE.Vector2((R - 1.3) * S, -0.1 * S),
  ], 96);
  const lipM = new THREE.Mesh(lip, tin()); lipM.material.side = THREE.DoubleSide;
  g.add(lipM);
  const plateR = R - 1.25;
  if (back === 'mirror') {
    const m = new THREE.Mesh(new THREE.CylinderGeometry((plateR + 0.1) * S, (plateR + 0.1) * S, 0.3 * S, 96),
      new THREE.MeshStandardMaterial({ color: '#EEF3F8', metalness: 1, roughness: 0.03 }));
    m.position.y = -0.2 * S; g.add(m);
    return g;
  }
  if (back === 'opener') {
    // đế dày có lỗ khui (răng ở mép trong lỗ)
    const sh = new THREE.Shape(); sh.absarc(0, 0, plateR * S, 0, Math.PI * 2, false);
    const w = R * 0.95, h = R * 0.42, cx = R * 0.12, rr = h * 0.45;
    const hole = new THREE.Path();
    hole.moveTo((cx - w / 2 + rr) * S, (-h / 2) * S);
    hole.lineTo((cx + w / 2 - rr) * S, (-h / 2) * S);
    hole.quadraticCurveTo((cx + w / 2) * S, (-h / 2) * S, (cx + w / 2) * S, (-h / 2 + rr) * S);
    hole.lineTo((cx + w / 2) * S, (h / 2 - rr) * S);
    hole.quadraticCurveTo((cx + w / 2) * S, (h / 2) * S, (cx + w / 2 - rr) * S, (h / 2) * S);
    hole.lineTo((cx - w / 2 + rr + h * 0.5) * S, (h / 2) * S);
    hole.lineTo((cx - w / 2 + rr + h * 0.3) * S, (h * 0.12) * S); // răng khui
    hole.lineTo((cx - w / 2 + rr) * S, (h / 2) * S);
    hole.quadraticCurveTo((cx - w / 2) * S, (h / 2) * S, (cx - w / 2) * S, (h / 2 - rr) * S);
    hole.lineTo((cx - w / 2) * S, (-h / 2 + rr) * S);
    hole.quadraticCurveTo((cx - w / 2) * S, (-h / 2) * S, (cx - w / 2 + rr) * S, (-h / 2) * S);
    sh.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 1.1 * S, bevelEnabled: true, bevelThickness: 0.15 * S, bevelSize: 0.15 * S, bevelSegments: 2, curveSegments: 48 });
    const m = new THREE.Mesh(geo, steel());
    m.rotation.x = Math.PI / 2; m.position.y = -0.05 * S;
    m.castShadow = true;
    g.add(m);
    return g;
  }
  // đế thiếc phẳng có gờ dập vòng tròn
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(plateR * S, plateR * S, 0.25 * S, 96), tin());
  plate.position.y = -0.12 * S; g.add(plate);
  const rib = new THREE.Mesh(new THREE.TorusGeometry(plateR * 0.72 * S, 0.22 * S, 8, 96), tin());
  rib.rotation.x = Math.PI / 2; rib.position.y = -0.25 * S; g.add(rib);
  if (back === 'magnet') {
    const mag = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.36 * S, R * 0.36 * S, 2.4 * S, 64),
      new THREE.MeshStandardMaterial({ color: '#2B2D31', metalness: 0.35, roughness: 0.55 }));
    mag.position.y = -1.45 * S; mag.castShadow = true; g.add(mag);
    const glue = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.38 * S, R * 0.4 * S, 0.3 * S, 64), new THREE.MeshStandardMaterial({ color: '#E8E4DA', roughness: 0.4 }));
    glue.position.y = -0.3 * S; g.add(glue);
    return g;
  }
  // kim cài: thanh hàn + lò xo xoắn + kim + móc khoá
  const L = R * 1.25;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(L * S, 0.45 * S, 3.2 * S), tin());
  bar.position.set(0, -0.45 * S, 0); g.add(bar);
  const x0 = -L / 2 + 1.2, x1 = L / 2 - 1.6, yp = -1.9;
  const coil: THREE.Vector3[] = [];
  for (let t = 0; t <= 1; t += 1 / 40) {
    const a = t * Math.PI * 2 * 2.2;
    coil.push(new THREE.Vector3((x0 - 0.6 + t * 1.6) * S, (-1.25 + Math.cos(a) * 0.75) * S, Math.sin(a) * 0.75 * S));
  }
  const wire = new THREE.CatmullRomCurve3([
    ...coil,
    new THREE.Vector3((x0 + 2.2) * S, (yp + 0.05) * S, 0.3 * S),
    new THREE.Vector3((x1 - 1) * S, yp * S, 0.55 * S),
    new THREE.Vector3((x1 + 0.6) * S, (yp + 0.1) * S, 0.55 * S),
  ]);
  const wm = new THREE.Mesh(new THREE.TubeGeometry(wire, 160, 0.45 * S, 12, false), steel());
  wm.castShadow = true; g.add(wm);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.36 * S, 1.4 * S, 12), steel());
  tip.rotation.z = -Math.PI / 2; tip.position.set((x1 + 1.3) * S, (yp + 0.1) * S, 0.55 * S); g.add(tip);
  // móc khoá (chữ C dập)
  const hook = new THREE.Mesh(new THREE.CylinderGeometry(1.25 * S, 1.25 * S, 2.6 * S, 24, 1, true, Math.PI * 0.15, Math.PI * 1.45), steel());
  hook.material.side = THREE.DoubleSide;
  hook.rotation.z = Math.PI / 2; hook.position.set((x1 + 0.6) * S, (yp + 0.15) * S, 0.4 * S); g.add(hook);
  const post = new THREE.Mesh(new THREE.BoxGeometry(2.4 * S, 1.3 * S, 1 * S), tin());
  post.position.set((x1 + 0.6) * S, -1 * S, -0.6 * S); g.add(post);
  return g;
}

/** 1 huy hiệu hoàn chỉnh, mặt in hướng +y, đáy mép ở y = 0 (phụ kiện mặt sau nằm dưới y = 0) */
function button(p: Prof, Rc: number, tex: THREE.Texture, back: PinBack): THREE.Group {
  const g = new THREE.Group();
  const face = new THREE.Mesh(faceGeometry(p, Rc), new THREE.MeshPhysicalMaterial({
    map: tex, roughness: 0.32, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0,
  }));
  face.castShadow = true;
  g.add(face);
  g.add(backParts(p, back));
  return g;
}

// bóng tiếp xúc mềm dưới mỗi con
function contactShadow(rMm: number, opacity: number): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(64, 64, 10, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(rMm * 2.5 * S, rMm * 2.5 * S), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// miếng vải canvas mộc (dệt chéo sợi + viền may) — nền cho con huy hiệu chính
function canvasFabricCanvas(): HTMLCanvasElement {
  // vải canvas dệt trơn: mỗi ô sợi ngang/dọc đan xen sáng–tối + sợi lệch ngẫu nhiên + xơ bông
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#8E846F'; x.fillRect(0, 0, N, N);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const cell = 8; // ~0.5mm/sợi khi lặp mỗi 32mm
  for (let j = 0; j < N / cell; j++) {
    const rowJit = (rnd() - 0.5) * 18;
    for (let i = 0; i < N / cell; i++) {
      const over = (i + j) % 2 === 0;
      const v = (over ? 226 : 196) + rowJit + (rnd() - 0.5) * 16;
      // sợi bo tròn: giữa sáng, 2 mép tối → nổi vân dệt
      const gr = over ? x.createLinearGradient(0, j * cell, 0, (j + 1) * cell) : x.createLinearGradient(i * cell, 0, (i + 1) * cell, 0);
      const col = (k: number) => `rgb(${(v * k) | 0},${(v * k * 0.95) | 0},${(v * k * 0.84) | 0})`;
      gr.addColorStop(0, col(0.82)); gr.addColorStop(0.5, col(1)); gr.addColorStop(1, col(0.82));
      x.fillStyle = gr;
      if (over) x.fillRect(i * cell, j * cell + 1, cell, cell - 2); else x.fillRect(i * cell + 1, j * cell, cell - 2, cell);
    }
  }
  for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(80,60,35,${rnd() * 0.35})`; x.fillRect(rnd() * (N - 4), rnd() * N, 1 + rnd() * 2.5, 1); }
  return c;
}
function fabricPatch(wMm: number, dMm: number, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const cv = canvasFabricCanvas();
  const tex = canvasTex(cv, aniso); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(wMm / 32, dMm / 32);
  const bump = new THREE.CanvasTexture(cv); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.copy(tex.repeat);
  const wave = (px: number, pz: number) => 0.35 * Math.sin(px * 0.09 + pz * 0.05) + 0.25 * Math.cos(pz * 0.13); // gợn vải (mm)
  const geo = new THREE.BoxGeometry(wMm * S, 1.4 * S, dMm * S, 48, 1, 32);
  // gợn vải nhẹ trên mặt
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i) / S, pz = pos.getZ(i) / S;
    if (pos.getY(i) > 0) pos.setY(i, pos.getY(i) + wave(px, pz) * S);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, bumpMap: bump, bumpScale: 2.2, roughness: 0.97, color: '#FFFFFF' }));
  m.position.y = 0.7 * S; m.receiveShadow = true; m.castShadow = true;
  g.add(m);
  // đường may viền gần mép trước
  const stitchMat = new THREE.MeshStandardMaterial({ color: '#7A6446', roughness: 0.9 });
  const n = Math.floor(wMm / 5);
  for (let i = 0; i < n; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(3 * S, 0.3 * S, 0.5 * S), stitchMat);
    const sx = -wMm / 2 + 4 + i * ((wMm - 8) / (n - 1)), sz = dMm / 2 - 5;
    st.position.set(sx * S, (1.45 + wave(sx, sz)) * S, sz * S);
    g.add(st);
  }
  return g;
}

export function pinBuilder(o: Pin3DOpts): Builder {
  return async (aniso) => {
    const prints = o.prints.filter(Boolean) as SVGSVGElement[];
    if (!prints.length) throw new Error('Chưa dựng xong huy hiệu');
    const Rc = o.dc / 2;
    const px = Math.min(2048, Math.max(1024, Math.round(o.dc * 26)));
    const texs = await Promise.all(prints.slice(0, 2).map(async (el) => {
      const t = await svgTex(el, o.fontCss, px, aniso, '#FFFFFF');
      t.anisotropy = aniso; return t;
    }));
    const tA = texs[0], tB = texs[1] || texs[0];
    const p = profile(o.d);
    const D = o.d, out = new THREE.Group();

    // miếng vải canvas + con chính nằm trên vải (nghiêng nhẹ vì kim cài phía sau)
    const fw = D * 1.9, fd = D * 1.55;
    const fab = fabricPatch(fw, fd, aniso);
    fab.position.set(-D * 0.45 * S, 0, -D * 0.05 * S); fab.rotation.y = 0.12;
    out.add(fab);
    // mặt sau gồ (kim, nam châm…) → con nằm úp kê nghiêng 1 mép chạm nền
    const depth = o.back === 'pin' ? 2.3 : o.back === 'magnet' ? 2.65 : o.back === 'opener' ? 1.3 : 0.35;
    const tilt = Math.atan((depth * 0.5) / (D / 2));
    const hero = button(p, Rc, tA, o.back);
    hero.position.set(-D * 0.45 * S, (1.5 + depth * 0.5) * S, -D * 0.05 * S);
    hero.rotation.set(tilt * 0.6, -0.18, -tilt * 0.8);
    out.add(hero);

    // con thứ 2 nằm bên phải phía sau
    const b2 = button(p, Rc, tB, o.back);
    b2.position.set(D * 0.78 * S, depth * 0.5 * S, -D * 0.52 * S); b2.rotation.set(-tilt * 0.7, 0.5, tilt * 0.7);
    out.add(b2);
    const s2 = contactShadow(D / 2, 0.38); s2.position.set(D * 0.78 * S, 0.05 * S, -D * 0.52 * S); out.add(s2);

    // con thứ 3 lật ngửa khoe mặt sau
    const b3 = button(p, Rc, tA, o.back);
    b3.rotation.set(Math.PI, 0.35, 0);
    b3.position.set(D * 0.72 * S, p.H * S, D * 0.62 * S);
    out.add(b3);
    const s3 = contactShadow(D / 2, 0.42); s3.position.set(D * 0.72 * S, 0.05 * S, D * 0.62 * S); out.add(s3);

    // canh giữa cụm, đáy chạm đất
    const bb = new THREE.Box3().setFromObject(out);
    const c = bb.getCenter(new THREE.Vector3());
    out.position.set(-c.x, -bb.min.y, -c.z);
    const g = new THREE.Group(); g.add(out);
    return { group: g, view: { az: 0.22, el: 0.86 }, aim: 0.4, zoom: 1.6, blob: 0 };
  };
}
