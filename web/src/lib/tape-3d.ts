'use client';
// Băng keo in logo 3D: thùng carton kraft dán băng keo vắt qua mép nắp (chạy dọc nắp, gập xuống 2 đầu thùng)
// + cuộn băng keo đứng cạnh (lõi giấy, các lớp băng nhìn từ cạnh, đuôi băng bóc ra nằm trên mặt bàn).
// Texture = 1 đoạn lặp SVG của khách, lặp theo chiều dài dải băng (u = độ dài cung / L). Băng trong: màng trong + lớp mực.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface Tape3DOpts {
  el: SVGSVGElement | null; // 1 đoạn lặp (mode 'unit')
  fontCss: string;
  wMm: number; repMm: number;
  base: string; baseHex: string | null;
}

// ---------- texture phụ ----------
function noiseCanvas(n: number, base: string, specks: [string, number][], fibers = 0): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 10; i++) {
    const px = Math.random() * n, py = Math.random() * n, r = (0.25 + Math.random() * 0.5) * n;
    const dark = Math.random() < 0.5;
    // vẽ lặp 3×3 → texture liền mạch khi lặp (không lộ ô vuông sáng/tối trên mặt thùng)
    for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
      const g = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r);
      g.addColorStop(0, dark ? 'rgba(70,40,15,0.07)' : 'rgba(255,240,210,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, n, n);
    }
  }
  for (const [col, count] of specks) {
    x.fillStyle = col;
    for (let i = 0; i < count; i++) x.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 1.4, 1 + Math.random() * 1.4);
  }
  x.lineWidth = 1;
  for (let i = 0; i < fibers; i++) {
    const px = Math.random() * n, py = Math.random() * n, len = 2 + Math.random() * 9, a = Math.random() * Math.PI;
    x.strokeStyle = Math.random() < 0.6 ? 'rgba(70,42,16,0.22)' : 'rgba(255,244,222,0.25)';
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
  }
  return c;
}

let kraftC: HTMLCanvasElement | null = null;
function kraftTex(aniso: number, rep: number): THREE.Texture {
  kraftC ??= noiseCanvas(1024, '#C29468', [['rgba(80,50,20,0.25)', 9000], ['rgba(255,240,215,0.22)', 6000]], 16000);
  const t = canvasTex(kraftC, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  return t;
}

// mặt cạnh cuộn băng: các vòng băng đồng tâm (UV phẳng của RingGeometry)
function ringTex(rIn: number, rOut: number, col: string, line: string, aniso: number): THREE.Texture {
  const n = 1024, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const cx = n / 2, R = n / 2;
  x.fillStyle = col; x.fillRect(0, 0, n, n);
  const r0 = (rIn / rOut) * R;
  for (let r = r0; r < R; r += 1.4 + Math.random() * 1.6) {
    x.strokeStyle = line; x.globalAlpha = 0.25 + Math.random() * 0.45; x.lineWidth = 0.6 + Math.random() * 0.9;
    x.beginPath(); x.arc(cx, cx, r, 0, Math.PI * 2); x.stroke();
  }
  x.globalAlpha = 1;
  // ánh bóng xiên trên mặt cạnh
  const g = x.createLinearGradient(0, 0, n, n);
  g.addColorStop(0, 'rgba(255,255,255,0.18)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.08)');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  return canvasTex(c, aniso);
}

// nhãn vận chuyển dán trên nắp (mã vạch, dòng chữ giả)
function labelTex(aniso: number): THREE.Texture {
  const W = 720, H = 480, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#FBFAF7'; x.fillRect(0, 0, W, H);
  x.fillStyle = '#1D1D1F';
  x.fillRect(28, 26, 220, 26);
  for (let i = 0; i < 4; i++) x.fillRect(28, 80 + i * 30, 300 - i * 46, 12);
  x.fillRect(W - 210, 26, 182, 182);
  x.fillStyle = '#FBFAF7';
  for (let i = 0; i < 60; i++) x.fillRect(W - 200 + Math.random() * 160, 36 + Math.random() * 160, 14, 14);
  x.fillStyle = '#1D1D1F';
  let bx = 28;
  while (bx < W - 40) { const w = 2 + Math.random() * 7; x.fillRect(bx, 270, w, 140); bx += w + 2 + Math.random() * 6; }
  for (let i = 0; i < 2; i++) x.fillRect(28 + i * 200, 428, 150, 12);
  x.strokeStyle = '#1D1D1F'; x.lineWidth = 3; x.strokeRect(10, 10, W - 20, H - 20);
  x.beginPath(); x.moveTo(10, 240); x.lineTo(W - 10, 240); x.stroke();
  return canvasTex(c, aniso);
}

// ---------- dải băng theo đường cong ----------
/** ribbon qua các điểm tâm pts, bề ngang theo vector side (đơn vị 3D), u = độ dài cung (mm) / L, v: 1 ở phía −side */
function ribbon(pts: THREE.Vector3[], side: THREE.Vector3, width: number, L: number, u0 = 0): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let acc = u0;
  pts.forEach((p, i) => {
    if (i) acc += p.distanceTo(pts[i - 1]) / S / L;
    const a = p.clone().addScaledVector(side, -width / 2), b = p.clone().addScaledVector(side, width / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uv.push(acc, 1, acc, 0);
    if (i) { const k = i * 2; idx.push(k - 2, k - 1, k, k - 1, k + 1, k); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number, n = 14) =>
  Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r); });
const bez = (p0: THREE.Vector2, p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2, n = 24) =>
  Array.from({ length: n + 1 }, (_, i) => new THREE.CubicBezierCurve(p0, p1, p2, p3).getPoint(i / n));

export function tapeBuilder(o: Tape3DOpts): Builder {
  return async (aniso) => {
    if (!o.el) throw new Error('Chưa dựng xong băng keo');
    const clear = !o.baseHex;
    const W = o.wMm, L = o.repMm;
    const tex = await svgTex(o.el, o.fontCss, Math.min(2048, Math.round(L * 8)), aniso, clear ? '' : o.baseHex!);
    tex.wrapS = THREE.RepeatWrapping; tex.needsUpdate = true;

    // vật liệu băng: BOPP bóng. Đục: 1 lớp có màu nền. Trong: màng trong + lớp mực rời.
    const printMat = (t: THREE.Texture) => clear
      ? new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.04, roughness: 0.32, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 })
      : new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.12, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const film = new THREE.MeshPhysicalMaterial({ color: '#F6F0DA', transparent: true, opacity: 0.2, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const tapeMeshes = (geo: THREE.BufferGeometry, t: THREE.Texture) => {
      const g = new THREE.Group();
      const p = new THREE.Mesh(geo, printMat(t)); p.castShadow = !clear; g.add(p);
      if (clear) { const f = new THREE.Mesh(geo, film); f.renderOrder = 3; g.add(f); }
      return g;
    };

    const g = new THREE.Group();

    // ---- thùng carton ----
    const bw = 300, bh = 165, bd = 220, r = 3;
    const kraft = kraftTex(aniso, 1.4);
    const boxMat = new THREE.MeshStandardMaterial({ map: kraft, roughness: 0.9, color: '#FFFFFF' });
    const boxM = new THREE.Mesh(new RoundedBoxGeometry(bw * S, bh * S, bd * S, 4, r * S), boxMat);
    boxM.position.y = (bh / 2) * S; boxM.castShadow = true; boxM.receiveShadow = true;
    g.add(boxM);
    // khe ghép 2 nắp ngoài (chạy dọc thùng, nằm dưới băng keo)
    const seamMat = new THREE.MeshStandardMaterial({ color: '#4A321C', roughness: 0.95 });
    const seam = new THREE.Mesh(new THREE.PlaneGeometry((bw - 6) * S, 1.4 * S), seamMat);
    seam.rotation.x = -Math.PI / 2; seam.position.set(0, (bh + 0.06) * S, 0); g.add(seam);
    // nếp gấp nắp ở 2 mép trước/sau
    for (const z of [-1, 1]) {
      const crease = new THREE.Mesh(new THREE.PlaneGeometry((bw - 6) * S, 0.8 * S), new THREE.MeshStandardMaterial({ color: '#8E6740', roughness: 0.95 }));
      crease.rotation.x = -Math.PI / 2; crease.position.set(0, (bh + 0.05) * S, z * (bd / 2 - 2.2) * S); g.add(crease);
    }
    // nhãn vận chuyển
    const label = new THREE.Mesh(new THREE.PlaneGeometry(96 * S, 64 * S), new THREE.MeshStandardMaterial({ map: labelTex(aniso), roughness: 0.75 }));
    label.rotation.x = -Math.PI / 2; label.rotation.z = 0.06;
    label.position.set(-bw * 0.22 * S, (bh + 0.12) * S, (W / 2 + 14 + 32) * S); label.receiveShadow = true;
    g.add(label);

    // ---- băng keo vắt qua nắp, gập xuống 2 đầu thùng ----
    const e = 0.35, drop = Math.min(80, bh * 0.42);
    const path2: THREE.Vector2[] = [
      new THREE.Vector2(-bw / 2 - e, bh - drop), new THREE.Vector2(-bw / 2 - e, bh - r),
      ...arcPts(-bw / 2 + r, bh - r, r + e, Math.PI, Math.PI / 2).slice(1),
      ...arcPts(bw / 2 - r, bh - r, r + e, Math.PI / 2, 0),
      new THREE.Vector2(bw / 2 + e, bh - drop),
    ];
    // chia nhỏ đoạn thẳng để UV mịn
    const dense: THREE.Vector3[] = [];
    path2.forEach((p, i) => {
      if (i) {
        const a = path2[i - 1], n = Math.max(1, Math.ceil(a.distanceTo(p) / 8));
        for (let k = 1; k <= n; k++) { const q = a.clone().lerp(p, k / n); dense.push(new THREE.Vector3(q.x * S, q.y * S, 0)); }
      } else dense.push(new THREE.Vector3(p.x * S, p.y * S, 0));
    });
    const boxTape = tapeMeshes(ribbon(dense, new THREE.Vector3(0, 0, 1), W * S, L, 0.37), tex);
    g.add(boxTape);

    // ---- cuộn băng keo đứng ----
    const Rin = 38, Rc = 43.5, Ro = 57;
    const roll = new THREE.Group();
    const C = 2 * Math.PI * Ro;
    const rollTex = tex.clone(); rollTex.wrapS = THREE.RepeatWrapping; rollTex.repeat.set(C / L, 1); rollTex.needsUpdate = true;
    const bodyMat = clear
      ? new THREE.MeshPhysicalMaterial({ color: '#D9C385', roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, metalness: 0 })
      : printMat(rollTex);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(Ro * S, Ro * S, W * S, 160, 1, true), bodyMat);
    outer.castShadow = true; roll.add(outer);
    if (clear) {
      const pr = new THREE.Mesh(new THREE.CylinderGeometry((Ro + 0.12) * S, (Ro + 0.12) * S, W * S, 160, 1, true), printMat(rollTex));
      roll.add(pr);
      const fl = new THREE.Mesh(new THREE.CylinderGeometry((Ro + 0.2) * S, (Ro + 0.2) * S, W * S, 160, 1, true), film); fl.renderOrder = 3; roll.add(fl);
    }
    // 2 mặt cạnh: vòng băng
    const sideCol = clear ? '#CDB46E' : (o.baseHex || '#CDB46E');
    const sideLine = clear ? '#8E7434' : (o.base === 'black' ? '#000000' : 'rgba(0,0,0,0.6)');
    const sideMat = new THREE.MeshPhysicalMaterial({ map: ringTex(Rc, Ro, sideCol, sideLine, aniso), roughness: 0.22, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
    const coreMat = new THREE.MeshStandardMaterial({ map: kraftTex(aniso, 0.35), color: '#E9D2B4', roughness: 0.92 });
    for (const sgn of [-1, 1]) {
      const face = new THREE.Mesh(new THREE.RingGeometry(Rc * S, Ro * S, 160, 1), sideMat);
      face.rotation.x = sgn > 0 ? -Math.PI / 2 : Math.PI / 2; face.position.y = (sgn * W) / 2 * S; roll.add(face);
      const coreRim = new THREE.Mesh(new THREE.RingGeometry(Rin * S, Rc * S, 96, 1), coreMat);
      coreRim.rotation.x = face.rotation.x; coreRim.position.y = (sgn * (W / 2 + 0.6)) * S; roll.add(coreRim);
    }
    const coreOut = new THREE.Mesh(new THREE.CylinderGeometry(Rc * S, Rc * S, (W + 1.2) * S, 96, 1, true), coreMat); roll.add(coreOut);
    const coreIn = new THREE.Mesh(new THREE.CylinderGeometry(Rin * S, Rin * S, (W + 1.2) * S, 96, 1, true), new THREE.MeshStandardMaterial({ map: kraftTex(aniso, 0.3), color: '#C9A47A', roughness: 0.95, side: THREE.BackSide }));
    roll.add(coreIn);
    // trục cuộn nằm ngang (theo z) → đứng trên mặt bàn
    roll.rotation.x = Math.PI / 2;
    roll.position.y = Ro * S;
    roll.traverse((n) => { if ((n as THREE.Mesh).isMesh) (n as THREE.Mesh).castShadow = true; });

    // đuôi băng bóc ra: rời cuộn ở điểm phải nhất, cong xuống, nằm trên bàn
    // đuôi băng kéo ra từ chân cuộn (điểm chạm bàn), nằm dài trên mặt bàn, mép cuối hơi vểnh
    const tailEnd = Ro + Math.min(130, L * 0.5);
    const tail2: THREE.Vector2[] = [];
    for (let x = 2; x <= tailEnd - 14; x += 6) tail2.push(new THREE.Vector2(-x, 0.3));
    tail2.push(...bez(new THREE.Vector2(-(tailEnd - 14), 0.3), new THREE.Vector2(-(tailEnd - 8), 0.3), new THREE.Vector2(-(tailEnd - 3), 0.8), new THREE.Vector2(-tailEnd, 2.4), 8).slice(1));
    const tailPts = tail2.map((p) => new THREE.Vector3(p.x * S, p.y * S, 0));
    const tailTex = tex.clone(); tailTex.wrapS = THREE.RepeatWrapping; tailTex.needsUpdate = true;
    const tail = tapeMeshes(ribbon(tailPts, new THREE.Vector3(0, 0, -1), W * S, L, 0.12), tailTex); // đuôi chạy về −x → lật bề ngang để chữ không bị ngược gương
    const rollG = new THREE.Group();
    rollG.add(roll, tail);
    rollG.rotation.y = 1.05;
    rollG.position.set((bw * 0.18) * S, 0, (bd / 2 + 70) * S);
    g.add(rollG);

    return { group: g, view: { az: 0.26, el: 0.64 }, aim: 0.52, zoom: 1.28, blob: 0.5 };
  };
}
