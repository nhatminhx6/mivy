'use client';
// Ruy băng in logo 3D: hộp quà buộc ruy băng chữ thập + nơ (2 vòng, nút thắt, 2 đuôi cắt chữ V) và 1 cuộn ruy băng
// đứng cạnh (lõi giấy, các vòng ruy băng nhìn từ cạnh), đầu ruy băng thả xuống bàn uốn lượn + xoắn nhẹ.
// Mọi dải ruy băng là lưới 3 cột dựng từ đường tâm + pháp tuyến; u = độ dài cung / L (đoạn lặp) → hình in lặp liền mạch.
// Chất liệu: satin (anisotropy + sheen), grosgrain (gân bump), organza (trong mờ), vải bố (sợi thô). In: mực (map) hoặc nhũ (kim loại, alphaMap).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { RBType } from './ribbon-engine';

export interface Ribbon3DOpts {
  inkEl: SVGSVGElement | null;   // lớp in nền trong suốt (mode 'ink')
  maskEl: SVGSVGElement | null;  // lớp in trắng/nền đen (mode 'mask') — dùng khi in nhũ
  fontCss: string;
  wMm: number; lMm: number;
  type: RBType; baseHex: string;
  foilHex: string | null;        // null = in mực
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lumOf = (hex: string) => { const c = new THREE.Color(hex); return 0.299 * c.r + 0.587 * c.g + 0.114 * c.b; };

// ---------- dải ruy băng từ đường tâm + pháp tuyến (mặt in quay theo pháp tuyến) ----------
interface Strip { pts: THREE.Vector3[]; nrm: THREE.Vector3[]; u0?: number; notchEnd?: boolean; notchStart?: boolean; twist?: (i: number, n: number) => number }
function stripGeo(st: Strip, W: number, L: number): THREE.BufferGeometry {
  const { pts, nrm } = st;
  const n = pts.length;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let s = st.u0 ?? 0;
  for (let i = 0; i < n; i++) {
    if (i) s += pts[i].distanceTo(pts[i - 1]);
    const t = (i === 0 ? pts[1].clone().sub(pts[0]) : i === n - 1 ? pts[i].clone().sub(pts[i - 1]) : pts[i + 1].clone().sub(pts[i - 1])).normalize();
    const nn = nrm[i].clone();
    if (st.twist) nn.applyAxisAngle(t, st.twist(i, n));
    const side = t.clone().cross(nn).normalize(); // side × t = n → mặt trước (in) quay theo n
    for (let c = 0; c < 3; c++) {
      const k = c / 2 - 0.5;
      const p = pts[i].clone().addScaledVector(side, k * W);
      // cắt đuôi chữ V: cột giữa lùi vào trong
      if (c === 1 && st.notchEnd && i === n - 1) p.addScaledVector(t, -W * 0.45);
      if (c === 1 && st.notchStart && i === 0) p.addScaledVector(t, W * 0.45);
      pos.push(p.x, p.y, p.z);
      uv.push(s / L, 1 - c / 2);
    }
  }
  for (let i = 0; i < n - 1; i++) for (let c = 0; c < 2; c++) {
    const a = i * 3 + c, b = a + 1, cc = a + 3, d = cc + 1;
    idx.push(a, b, cc, b, d, cc);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
const stripLen = (pts: THREE.Vector3[]) => pts.reduce((a, p, i) => (i ? a + p.distanceTo(pts[i - 1]) : 0), 0);

// đường chữ nhật bo góc chạy qua đỉnh hộp (trái lên → ngang → phải xuống), toạ độ phẳng (a ngang, b đứng) + pháp tuyến
function wrapPath(half: number, y0: number, top: number, r: number): { a: number; b: number; na: number; nb: number }[] {
  const out: { a: number; b: number; na: number; nb: number }[] = [];
  const seg = (a0: number, b0: number, a1: number, b1: number, na: number, nb: number, k: number) => {
    for (let i = 0; i < k; i++) { const t = i / k; out.push({ a: a0 + (a1 - a0) * t, b: b0 + (b1 - b0) * t, na, nb }); }
  };
  seg(-half, y0, -half, top - r, -1, 0, 6);
  for (let i = 0; i < 8; i++) { const q = Math.PI - (i / 8) * (Math.PI / 2); out.push({ a: -half + r + Math.cos(q) * r, b: top - r + Math.sin(q) * r, na: Math.cos(q), nb: Math.sin(q) }); }
  seg(-half + r, top, half - r, top, 0, 1, 24);
  for (let i = 0; i < 8; i++) { const q = Math.PI / 2 - (i / 8) * (Math.PI / 2); out.push({ a: half - r + Math.cos(q) * r, b: top - r + Math.sin(q) * r, na: Math.cos(q), nb: Math.sin(q) }); }
  seg(half, top - r, half, y0, 1, 0, 6);
  out.push({ a: half, b: y0, na: 1, nb: 0 });
  return out;
}

// ---------- texture phụ (bump theo chất liệu, ring cạnh cuộn) ----------
function ribTex(aniso: number, L: number, pitch: number, cross: boolean): THREE.Texture {
  const n = 512, ribs = 64, c = document.createElement('canvas'); c.width = n; c.height = cross ? n : 32;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < ribs; i++) {
    const px = (i / ribs) * n;
    const g = x.createLinearGradient(px, 0, px + n / ribs, 0);
    g.addColorStop(0, '#5a5a5a'); g.addColorStop(0.5, '#d8d8d8'); g.addColorStop(1, '#5a5a5a');
    x.fillStyle = g; x.fillRect(px, 0, n / ribs, c.height);
  }
  if (cross) {
    x.globalAlpha = 0.5;
    for (let i = 0; i < ribs; i++) {
      const py = (i / ribs) * n;
      const g = x.createLinearGradient(0, py, 0, py + n / ribs);
      g.addColorStop(0, '#606060'); g.addColorStop(0.5, '#c8c8c8'); g.addColorStop(1, '#606060');
      x.fillStyle = g; x.fillRect(0, py, n, n / ribs);
    }
    x.globalAlpha = 1;
    for (let i = 0; i < 2500; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.12)'; x.fillRect(Math.random() * n, Math.random() * n, 2, 1); }
  }
  const t = canvasTex(c, aniso);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(L / (pitch * ribs), cross ? 1 : 1);
  return t;
}
function ringTex(rIn: number, rOut: number, col: string, aniso: number): THREE.Texture {
  const n = 1024, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const cx = n / 2, R = n / 2;
  x.fillStyle = col; x.fillRect(0, 0, n, n);
  const dark = lumOf(col) > 0.5 ? 'rgba(0,0,0,0.22)' : 'rgba(255,255,255,0.2)';
  for (let r = (rIn / rOut) * R; r < R; r += 2.2 + Math.random() * 1.6) {
    x.strokeStyle = dark; x.globalAlpha = 0.35 + Math.random() * 0.5; x.lineWidth = 0.7 + Math.random() * 0.8;
    x.beginPath(); x.arc(cx, cx, r, 0, Math.PI * 2); x.stroke();
  }
  x.globalAlpha = 1;
  const g = x.createLinearGradient(0, 0, n, n);
  g.addColorStop(0, 'rgba(255,255,255,0.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(0,0,0,0.08)');
  x.fillStyle = g; x.fillRect(0, 0, n, n);
  return canvasTex(c, aniso);
}
let kraftC: HTMLCanvasElement | null = null;
function kraftTex(aniso: number): THREE.Texture {
  if (!kraftC) {
    const n = 512; kraftC = document.createElement('canvas'); kraftC.width = kraftC.height = n;
    const x = kraftC.getContext('2d')!;
    x.fillStyle = '#C29468'; x.fillRect(0, 0, n, n);
    for (let i = 0; i < 7000; i++) { x.fillStyle = Math.random() < 0.5 ? 'rgba(80,50,20,0.18)' : 'rgba(255,240,215,0.18)'; x.fillRect(Math.random() * n, Math.random() * n, 1.4, 1.4); }
    x.lineWidth = 1;
    for (let i = 0; i < 4000; i++) { const px = Math.random() * n, py = Math.random() * n, a = Math.random() * Math.PI, l = 2 + Math.random() * 7; x.strokeStyle = 'rgba(70,42,16,0.18)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke(); }
  }
  const t = canvasTex(kraftC, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2);
  return t;
}

// ---------- vật liệu ruy băng ----------
interface Mats { base: THREE.Material; print: THREE.Material | null }
async function ribbonMats(o: Ribbon3DOpts, aniso: number): Promise<Mats> {
  const L = o.lMm, W = o.wMm;
  const col = new THREE.Color(o.baseHex);
  const side = THREE.DoubleSide;
  let base: THREE.Material;
  if (o.type === 'satin') {
    base = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.32, metalness: 0.05, anisotropy: 0.75, sheen: 0.6, sheenRoughness: 0.35, sheenColor: col.clone().lerp(new THREE.Color('#ffffff'), 0.55), clearcoat: 0.25, clearcoatRoughness: 0.3, side });
  } else if (o.type === 'grosgrain') {
    const b = ribTex(aniso, L, 0.65, false);
    base = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.72, bumpMap: b, bumpScale: 0.9, sheen: 0.4, sheenRoughness: 0.6, sheenColor: col.clone().lerp(new THREE.Color('#ffffff'), 0.4), side });
  } else if (o.type === 'organza') {
    base = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.35, transparent: true, opacity: 0.42, sheen: 1, sheenRoughness: 0.3, sheenColor: new THREE.Color('#ffffff'), depthWrite: false, side });
  } else {
    const b = ribTex(aniso, L, 1.1, true);
    base = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, bumpMap: b, bumpScale: 1.2, side });
  }
  let print: THREE.Material | null = null;
  const outW = Math.round(Math.min(4096, Math.max(1024, (L / W) * 256)));
  const prep = (t: THREE.Texture) => { t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = aniso; t.needsUpdate = true; return t; };
  const off = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side: THREE.FrontSide };
  if (o.foilHex && o.maskEl) {
    const m = prep(await svgTex(o.maskEl, o.fontCss, outW, aniso, '#000000'));
    m.colorSpace = THREE.NoColorSpace;
    print = new THREE.MeshStandardMaterial({ color: o.foilHex, metalness: 1, roughness: 0.24, alphaMap: m, transparent: true, alphaTest: 0.4, ...off });
  } else if (o.inkEl) {
    const t = prep(await svgTex(o.inkEl, o.fontCss, outW, aniso, ''));
    print = new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.35, roughness: o.type === 'satin' ? 0.4 : 0.8, ...off });
  }
  return { base, print };
}

function addStrip(g: THREE.Group, st: Strip, o: Ribbon3DOpts, mats: Mats, shadow = true) {
  const geo = stripGeo(st, o.wMm, o.lMm);
  const m = new THREE.Mesh(geo, mats.base); m.castShadow = shadow; m.receiveShadow = true; g.add(m);
  if (mats.print) { const p = new THREE.Mesh(geo, mats.print); p.renderOrder = 2; g.add(p); }
}

export function ribbonBuilder(o: Ribbon3DOpts): Builder {
  return async (aniso) => {
    if (!o.inkEl) throw new Error('Chưa dựng xong ruy băng');
    const W = o.wMm, L = o.lMm;
    const mats = await ribbonMats(o, aniso);
    const root = new THREE.Group(); // đơn vị mm
    root.scale.setScalar(S);

    // ---------- hộp quà nắp rời ----------
    const BW = 150, BD = 150, BH = 78, LID = 24, lidOver = 2.5;
    const light = lumOf(o.baseHex) > 0.62;
    const kraft = light || o.type === 'organza';
    const boxMat = kraft
      ? new THREE.MeshStandardMaterial({ map: kraftTex(aniso), roughness: 0.88 })
      : new THREE.MeshPhysicalMaterial({ color: '#F4F0E8', roughness: 0.62, clearcoat: 0.15 });
    const box = new THREE.Group();
    const base = new THREE.Mesh(new RoundedBoxGeometry(BW, BH - 2, BD, 3, 1.2), boxMat); base.position.y = (BH - 2) / 2;
    const lid = new THREE.Mesh(new RoundedBoxGeometry(BW + lidOver * 2, LID, BD + lidOver * 2, 3, 1.4), boxMat); lid.position.y = BH - LID / 2 + 1;
    for (const m of [base, lid]) { m.castShadow = true; m.receiveShadow = true; box.add(m); }
    // ruy băng chữ thập: dải dọc trục X rồi dải trục Z nằm đè lên
    const top = BH + 1, hw = BW / 2 + lidOver;
    const r = 2.2;
    const band = (along: 'x' | 'z', lift: number, u0: number) => {
      const P = wrapPath(hw + lift, 0.6, top + lift, r + lift);
      const pts = P.map((q) => (along === 'x' ? V(q.a, q.b, 0) : V(0, q.b, q.a)));
      const nrm = P.map((q) => (along === 'x' ? V(q.na, q.nb, 0) : V(0, q.nb, q.na)));
      addStrip(box, { pts, nrm, u0 }, o, mats);
    };
    band('x', 0.35, 0);
    band('z', 0.75, L * 0.37);
    // nơ: nút thắt + 2 vòng + 2 đuôi
    const yTop = top + 1.2;
    const loop = (dir: 1 | -1, u0: number) => {
      const rx = Math.max(30, W * 1.6), ry = rx * 0.42, al = 0.42;
      const pts: THREE.Vector3[] = [];
      const N = 44;
      for (let i = 0; i <= N; i++) {
        const th = (i / N) * Math.PI * 2;
        const u = rx * (1 - Math.cos(th)), w = ry * Math.sin(th);
        let y = u * Math.sin(al) + w * Math.cos(al);
        const x = dir * (u * Math.cos(al) - w * Math.sin(al));
        y = Math.max(y, 0.6);
        pts.push(V(x * 0.98, yTop + y, Math.sin(th) * W * 0.12 * dir));
      }
      const cx = dir * rx * 0.8, cy = yTop + rx * 0.45;
      const nrm = pts.map((p) => V(p.x - cx, p.y - cy, 0).normalize());
      addStrip(box, { pts, nrm, u0, twist: (i, n) => Math.sin((i / (n - 1)) * Math.PI) * 0.18 * dir }, o, mats);
    };
    loop(1, L * 0.1);
    loop(-1, L * 0.62);
    // đuôi nằm trên nắp, cắt chữ V
    const tail = (dir: 1 | -1, ang: number, u0: number) => {
      const len = Math.min(95, BW * 0.55);
      const pts: THREE.Vector3[] = [], nrm: THREE.Vector3[] = [];
      for (let i = 0; i <= 26; i++) {
        const t = i / 26, d = len * t;
        const a = ang + Math.sin(t * Math.PI) * 0.12 * dir;
        pts.push(V(dir * Math.cos(a) * d, yTop + 0.5 + Math.sin(t * Math.PI * 2) * 1.4 * (1 - t) + 0.4, Math.sin(a) * d));
        nrm.push(V(0, 1, 0));
      }
      addStrip(box, { pts, nrm, u0, notchEnd: true, twist: (i, n) => Math.sin((i / n) * Math.PI) * 0.25 * dir }, o, mats);
    };
    tail(1, 0.55, L * 0.21);
    tail(-1, 0.75, L * 0.79);
    // nút thắt giữa nơ
    {
      const kw = W * 0.95, kh = Math.max(9, W * 0.55);
      const P = wrapPath(kw / 2, yTop - 0.2, yTop + kh, Math.min(4, kh * 0.4));
      const pts = P.map((q) => V(q.a, q.b, 0)), nrm = P.map((q) => V(q.na, q.nb, 0));
      // dải nút thắt chạy theo Z (bề rộng nằm trên trục X) → xoay quanh Y
      const g = new THREE.Group(); g.rotation.y = Math.PI / 2;
      addStrip(g, { pts, nrm, u0: L * 0.5 }, o, mats);
      box.add(g);
    }
    box.position.set(-95, 0, -45);
    box.rotation.y = 0.32;
    root.add(box);

    // ---------- cuộn ruy băng đứng, trục X ----------
    const Ro = 40, Rc = 19, cy = Ro;
    const roll = new THREE.Group();
    // mặt ngoài cuộn: 1 vòng đầy đủ in lặp, kết thúc ở điểm rời (mặt trước, φ = π/2)
    const wound: THREE.Vector3[] = [], wn: THREE.Vector3[] = [];
    const NW = 140;
    for (let i = 0; i <= NW; i++) {
      const ph = Math.PI / 2 - 2 * Math.PI + (i / NW) * 2 * Math.PI;
      wound.push(V(0, cy + Math.cos(ph) * Ro, Math.sin(ph) * Ro));
      wn.push(V(0, Math.cos(ph), Math.sin(ph)));
    }
    addStrip(roll, { pts: wound, nrm: wn, u0: 0 }, o, mats);
    // 2 mặt cạnh: các vòng ruy băng quấn (ring) + lõi giấy
    const ringMat = new THREE.MeshStandardMaterial({ map: ringTex(Rc, Ro, o.baseHex, aniso), roughness: 0.6, side: THREE.DoubleSide, transparent: o.type === 'organza', opacity: o.type === 'organza' ? 0.9 : 1 });
    for (const sx of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(Rc, Ro - 0.2, 96, 1), ringMat);
      ring.rotation.y = (sx * Math.PI) / 2; ring.position.set((sx * W) / 2, cy, 0);
      ring.receiveShadow = true; roll.add(ring);
    }
    const core = new THREE.Mesh(
      new THREE.LatheGeometry([new THREE.Vector2(Rc - 2.4, -W / 2 - 0.6), new THREE.Vector2(Rc, -W / 2 - 0.6), new THREE.Vector2(Rc, W / 2 + 0.6), new THREE.Vector2(Rc - 2.4, W / 2 + 0.6), new THREE.Vector2(Rc - 2.4, -W / 2 - 0.6)], 64),
      new THREE.MeshStandardMaterial({ map: kraftTex(aniso), roughness: 0.9, side: THREE.DoubleSide }),
    );
    core.rotation.z = Math.PI / 2; core.position.y = cy; core.castShadow = true; roll.add(core);
    // đầu ruy băng: rơi thẳng phía trước cuộn → uốn 1/4 vòng xuống bàn → chạy uốn lượn trên bàn, xoắn nhẹ
    const tailPts: THREE.Vector3[] = [], tailN: THREE.Vector3[] = [];
    const rb = Math.min(22, Ro * 0.55);
    for (let i = 1; i <= 8; i++) { const y = Ro - (Ro - rb) * (i / 8); tailPts.push(V(0, cy - Ro + y + (Ro - y > 0 ? 0 : 0), Ro)); tailN.push(V(0, 0, 1)); }
    // điểm cuối đoạn thẳng đứng đang ở y = rb, z = Ro → cung 1/4 tâm (y=rb, z=Ro+rb)
    for (let i = 1; i <= 14; i++) {
      const q = (i / 14) * (Math.PI / 2);
      tailPts.push(V(0, rb - Math.sin(q) * rb + 0.35, Ro + rb - Math.cos(q) * rb));
      tailN.push(V(0, Math.sin(q), Math.cos(q)));
    }
    const run = 170;
    for (let i = 1; i <= 60; i++) {
      const t = i / 60, z = Ro + rb + run * t;
      tailPts.push(V(Math.sin(t * Math.PI * 1.6) * 26 * t, 0.35 + Math.max(0, Math.sin(t * Math.PI * 3)) * 1.6 * (1 - t), z));
      tailN.push(V(0, 1, 0));
    }
    addStrip(roll, {
      pts: [V(0, cy, Ro), ...tailPts], nrm: [V(0, 0, 1), ...tailN], u0: 2 * Math.PI * Ro, notchEnd: true,
      twist: (i, n) => (i > n * 0.4 ? Math.sin(((i - n * 0.4) / (n * 0.6)) * Math.PI) * 0.32 : 0),
    }, o, mats);
    roll.position.set(70, 0, 15);
    roll.rotation.y = -0.38;
    root.add(roll);

    const g = new THREE.Group(); g.add(root);
    return { group: g, view: { az: 0.5, el: 0.42 }, aim: 0.34, zoom: 1.28, blob: 0.45 };
  };
}

export const ribbonStripLength = stripLen;
