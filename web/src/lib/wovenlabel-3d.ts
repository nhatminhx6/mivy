'use client';
// Mác áo 3D: mặt trong lưng áo thun nằm phẳng — bo cổ gân, mác cổ dệt may kẹp dưới bo cổ (vân dệt + ánh satin),
// nhãn size cạnh bên, nhãn giặt satin may vào đường sườn; mác da/PU ép chìm trên lưng quần jean (vân chéo, chỉ cam).

import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { S, isDark, svgTex, type Builder } from './mockup3d';
import { PATCH_R, wlMaterial, wlPalette, wlSize, type WLKind, type WLSpec } from './wovenlabel-engine';

export interface WL3DOpts {
  focus: WLKind;
  main: { el: SVGSVGElement | null; spec: WLSpec };
  size: { el: SVGSVGElement | null; spec: WLSpec };
  care: { el: SVGSVGElement | null; spec: WLSpec };
  patch: { el: SVGSVGElement | null; mask: SVGSVGElement | null; spec: WLSpec };
  fontCss: string;
}

// ---------- texture phụ (vẽ canvas, cache) ----------
const cache = new Map<string, HTMLCanvasElement>();
function tile(key: string, n: number, draw: (x: CanvasRenderingContext2D, n: number) => void): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = document.createElement('canvas'); c.width = c.height = n;
    draw(c.getContext('2d')!, n);
    cache.set(key, c);
  }
  return c;
}
function rnd(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function bumpTex(c: HTMLCanvasElement, rx: number, ry: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4;
  return t;
}
// vân dệt (sợi ngang/dọc đan nhau)
const weave = () => tile('weave', 64, (x, n) => {
  x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
  const k = n / 8;
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    const over = (i + j) % 2 === 0;
    const g = x.createLinearGradient(i * k, j * k, over ? (i + 1) * k : i * k, over ? j * k : (j + 1) * k);
    g.addColorStop(0, '#6a6a6a'); g.addColorStop(0.5, over ? '#d8d8d8' : '#c4c4c4'); g.addColorStop(1, '#6a6a6a');
    x.fillStyle = g; x.fillRect(i * k + 0.4, j * k + 0.4, k - 0.8, k - 0.8);
  }
});
// satin: sợi ngang dài, bóng
const satinT = () => tile('satin', 64, (x, n) => {
  const r = rnd(7);
  for (let y = 0; y < n; y++) { const v = 120 + Math.round(r() * 30 + Math.sin(y * 0.9) * 22); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(0, y, n, 1); }
});
// thun jersey (chữ V)
const knit = () => tile('knit', 64, (x, n) => {
  x.fillStyle = '#7a7a7a'; x.fillRect(0, 0, n, n);
  const k = n / 8;
  x.strokeStyle = '#d0d0d0'; x.lineWidth = k * 0.42; x.lineCap = 'round';
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    x.beginPath(); x.moveTo(i * k + k * 0.15, j * k + k * 0.1); x.lineTo(i * k + k * 0.5, j * k + k * 0.9); x.lineTo(i * k + k * 0.85, j * k + k * 0.1); x.stroke();
  }
});
// thân áo: vân thun + nếp nhăn mềm (1 tile = 120mm)
const shirtBump = () => tile('shirt', 1024, (x, n) => {
  const k = knit(); const sc = (n * 3.2 / 120) / k.width; // 1 tile vân thun = 3.2mm
  const pat = x.createPattern(k, 'repeat')!;
  x.save(); x.scale(sc, sc); x.fillStyle = pat; x.fillRect(0, 0, n / sc, n / sc); x.restore();
  const r = rnd(3);
  x.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 9; i++) {
    const cx = r() * n, cy = r() * n, len = n * (0.3 + r() * 0.5), ang = r() * Math.PI, wid = n * (0.025 + r() * 0.04);
    x.save(); x.translate(cx, cy); x.rotate(ang);
    const g = x.createLinearGradient(0, -wid, 0, wid);
    g.addColorStop(0, 'rgba(128,128,128,0)'); g.addColorStop(0.5, r() > 0.5 ? 'rgba(235,235,235,0.55)' : 'rgba(30,30,30,0.5)'); g.addColorStop(1, 'rgba(128,128,128,0)');
    x.fillStyle = g; x.fillRect(-len / 2, -wid, len, wid * 2); x.restore();
  }
  x.globalCompositeOperation = 'source-over';
});
// gân bo cổ (sọc dọc)
const ribT = () => tile('rib', 32, (x, n) => {
  for (let i = 0; i < n; i++) { const v = 128 + Math.round(Math.sin((i / n) * Math.PI * 4) * 90); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i, 0, 1, n); }
});
// vải jean chéo (twill)
const twill = () => tile('twill', 64, (x, n) => {
  x.fillStyle = '#7d7d7d'; x.fillRect(0, 0, n, n);
  x.strokeStyle = '#cfcfcf'; x.lineWidth = 2.6;
  for (let i = -n; i < n * 2; i += 6) { x.beginPath(); x.moveTo(i, n); x.lineTo(i + n, 0); x.stroke(); }
});
const twillColor = () => tile('twill-c', 256, (x, n) => {
  const r = rnd(11);
  x.fillStyle = '#22385A'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) { x.fillStyle = r() > 0.5 ? 'rgba(220,226,236,0.10)' : 'rgba(12,20,36,0.18)'; x.fillRect(r() * n, r() * n, 1 + r() * 5, 1); }
  x.strokeStyle = 'rgba(210,220,235,0.12)'; x.lineWidth = 1.2;
  for (let i = -n; i < n * 2; i += 5) { x.beginPath(); x.moveTo(i, n); x.lineTo(i + n, 0); x.stroke(); }
});
// vân da (hạt sần)
function grainInto(x: CanvasRenderingContext2D, n: number, seed: number, alpha: number) {
  const r = rnd(seed);
  for (let i = 0; i < n * n * 0.02; i++) {
    const px = r() * n, py = r() * n, rr = 1.5 + r() * 3.5, v = Math.round(90 + r() * 90);
    x.fillStyle = `rgba(${v},${v},${v},${alpha})`; x.beginPath(); x.arc(px, py, rr, 0, Math.PI * 2); x.fill();
  }
}

// ---------- tiện ích ----------
function noBounds(m: THREE.Mesh) {
  m.geometry.boundingBox = new THREE.Box3();
  m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
  m.frustumCulled = false;
  return m;
}
/** đường chỉ may: các đoạn gạch nhỏ dọc theo polyline (toạ độ mặt phẳng, mm), nằm ở độ cao z */
function stitches(pts: [number, number][], z: number, color: string, dash = 1.6, gapMm = 1.1, w = 0.45): THREE.Mesh | null {
  const geos: THREE.BufferGeometry[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0); if (len < 0.01) continue;
    const ux = (x1 - x0) / len, uy = (y1 - y0) / len;
    for (let d = 0; d + dash <= len; d += dash + gapMm) {
      const g = new THREE.BoxGeometry(dash * S, w * S, 0.28 * S);
      g.rotateZ(Math.atan2(uy, ux));
      g.translate((x0 + ux * (d + dash / 2)) * S, (y0 + uy * (d + dash / 2)) * S, z * S);
      geos.push(g);
    }
  }
  if (!geos.length) return null;
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ color, roughness: 0.75 }));
  m.castShadow = true;
  return m;
}

/** vật liệu mác vải theo chất liệu */
function fabricLabelMat(map: THREE.Texture, spec: WLSpec, w: number, h: number): THREE.MeshPhysicalMaterial {
  const mat = wlMaterial(spec.material);
  if (spec.material === 'satin' || spec.material === 'satinprint') {
    return new THREE.MeshPhysicalMaterial({ map, bumpMap: bumpTex(satinT(), w / 2.5, h / 0.9), bumpScale: 0.35, roughness: 0.36, sheen: 0.9, sheenRoughness: 0.35, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.12, clearcoatRoughness: 0.4 });
  }
  if (mat.woven) {
    return new THREE.MeshPhysicalMaterial({ map, bumpMap: bumpTex(weave(), w / 1.4, h / 1.4), bumpScale: 1.7, roughness: 0.66, sheen: 0.55, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffffff') });
  }
  return new THREE.MeshPhysicalMaterial({ map, bumpMap: bumpTex(knit(), w / 2.2, h / 2.2), bumpScale: 0.5, roughness: 0.88, sheen: 0.25, sheenColor: new THREE.Color('#ffffff') });
}

/** 1 mác vải phẳng (gốc = mép trên giữa), cong nhẹ phần đuôi */
function labelMesh(tex: THREE.Texture, spec: WLSpec, curl = 0): THREE.Group {
  const sz = wlSize(spec.size);
  const w = sz.wMm, h = sz.hMm;
  const g = new THREE.Group();
  const geo = new THREE.PlaneGeometry(w * S, h * S, 24, 24);
  geo.translate(0, (-h / 2) * S, 0);
  if (curl) {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const t = -p.getY(i) / (h * S); p.setZ(i, curl * t * t * S); }
    geo.computeVertexNormals();
  }
  const m = new THREE.Mesh(geo, fabricLabelMat(tex, spec, w, h));
  m.castShadow = true; m.receiveShadow = true;
  g.add(m);
  const P = wlPalette(spec.palette);
  const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(P.bg).multiplyScalar(0.78), roughness: 0.8 });
  const stitch = isDark(P.bg) ? '#5a5a5a' : '#bdb6a8';
  if (spec.fold === 'endfold') {
    // 2 đầu gấp vào: mép dày hơn + đường may dọc 2 đầu
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.0 * S, h * S, 0.5 * S), edge);
      b.position.set(sx * (w / 2 - 0.5) * S, (-h / 2) * S, -0.1 * S); b.castShadow = true; g.add(b);
      const st = stitches([[sx * (w / 2 - 1.6), -0.8], [sx * (w / 2 - 1.6), -h + 0.8]], 0.2, stitch, 1.2, 0.8, 0.32);
      if (st) g.add(st);
    }
  } else if (spec.fold === 'centerfold') {
    // gấp đôi: mép dưới cuộn dày
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * S, 0.55 * S, w * S, 12), edge);
    b.rotation.z = Math.PI / 2; b.position.set(0, (-h + 0.1) * S, -0.45 * S + curl * S); b.castShadow = true; g.add(b);
  } else if (spec.fold === 'straight') {
    const i = 1.4;
    const st = stitches([[-w / 2 + i, -i], [w / 2 - i, -i], [w / 2 - i, -h + i], [-w / 2 + i, -h + i], [-w / 2 + i, -i]], 0.2, stitch, 1.2, 0.8, 0.32);
    if (st) g.add(st);
  }
  return g;
}

/** bo cổ gân: dải cung tròn (r1→r2) quanh tâm (cx,cy), góc a0→a1, cao z */
function ribArc(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number, z: number, color: THREE.Color): THREE.Mesh {
  const N = 96, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= N; i++) {
    const a = a0 + ((a1 - a0) * i) / N;
    const len = (Math.abs(a1 - a0) * (r1 + r2) / 2) * (i / N);
    for (const [k, r] of [[0, r1], [1, r2]] as const) {
      const bulge = Math.sin((k === 0 ? 0.15 : 0.85) * Math.PI) * 0.6;
      pos.push((cx + Math.cos(a) * r) * S, (cy + Math.sin(a) * r) * S, (z + bulge) * S);
      uv.push(len / 2.2, k);
    }
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const rt = bumpTex(ribT(), 1, 1);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.9, bumpMap: rt, bumpScale: 1.4, side: THREE.DoubleSide }));
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// ---------- cảnh lưng áo (mác cổ, size, nhãn giặt) ----------
const CARE_ROT = 1.32;
async function shirtScene(o: WL3DOpts, aniso: number) {
  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2;
  const mainP = wlPalette(o.main.spec.palette);
  const shirt = new THREE.Color(isDark(mainP.bg) ? '#C9C4BA' : '#33373F');
  // thân áo: mặt phẳng có khoét cổ (nửa hình tròn ở mép trên)
  const Rn = 75, cy = 60;
  const sh = new THREE.Shape();
  sh.moveTo(-170, -210); sh.lineTo(170, -210); sh.lineTo(170, cy); sh.lineTo(Rn, cy);
  sh.absarc(0, cy, Rn, 0, Math.PI, true); // vòng xuống dưới (cung lõm vào thân)
  sh.lineTo(-170, cy); sh.closePath();
  const fg = new THREE.ShapeGeometry(sh, 64); fg.scale(S, S, S);
  // UV của ShapeGeometry = toạ độ mm → lặp vân thun 3mm
  const kt = bumpTex(knit(), 1 / 3.2, 1 / 3.2);
  const fabric = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.95, bumpMap: bumpTex(shirtBump(), 1 / 120, 1 / 120), bumpScale: 1.1 }));
  fabric.receiveShadow = true;
  flat.add(noBounds(fabric));
  // thân trước nằm dưới: nhìn qua lỗ cổ thấy mặt trong vải (tối hơn)
  const under = new THREE.Mesh(new THREE.PlaneGeometry(360 * S, 300 * S), new THREE.MeshStandardMaterial({ color: shirt.clone().multiplyScalar(0.72), roughness: 0.96, bumpMap: bumpTex(shirtBump(), 360 / 120, 300 / 120), bumpScale: 1.1 }));
  under.position.set(0, -60 * S, -1.2 * S); under.receiveShadow = true;
  flat.add(noBounds(under));
  // bo cổ gân + đường may viền
  const rib = ribArc(0, cy, Rn, Rn + 15, Math.PI, Math.PI * 2, 0.4, shirt.clone().multiplyScalar(0.93));
  flat.add(rib);
  const arcPts = (r: number): [number, number][] => Array.from({ length: 49 }, (_, i) => { const a = Math.PI + (Math.PI * i) / 48; return [Math.cos(a) * r, cy + Math.sin(a) * r]; });
  const stc = isDark('#' + shirt.getHexString()) ? '#55595F' : '#A9A49A';
  for (const r of [Rn + 15.8, Rn + 17.6]) { const st = stitches(arcPts(r), 0.25, stc, 1.4, 1.0, 0.36); if (st) flat.add(noBounds(st)); }

  // texture các mác
  const tex = async (el: SVGSVGElement | null, w: number) => {
    if (!el) return null;
    const t = await svgTex(el, o.fontCss, Math.min(2048, Math.max(768, Math.round(w * 26))), aniso, '');
    t.anisotropy = aniso; return t;
  };
  const mz = wlSize(o.main.spec.size), sz = wlSize(o.size.spec.size), cz = wlSize(o.care.spec.size);
  const [tMain, tSize, tCare] = await Promise.all([tex(o.main.el, mz.wMm), tex(o.size.el, sz.wMm * 2), tex(o.care.el, cz.wMm * 1.4)]);
  const neckY = cy - (Rn + 15) + 2.5; // mép trên mác kẹp dưới bo cổ 2.5mm
  const parts: Record<'main' | 'size' | 'care', THREE.Group | null> = { main: null, size: null, care: null };
  if (tMain) {
    const g = labelMesh(tMain, o.main.spec, o.main.spec.fold === 'centerfold' ? 1.6 : 0.5);
    g.position.set(0, neckY * S, 0.25 * S);
    flat.add(g); parts.main = g;
  }
  if (tSize) {
    const g = labelMesh(tSize, o.size.spec, o.size.spec.fold === 'centerfold' ? 1.2 : 0.4);
    g.position.set((mz.wMm / 2 + sz.wMm / 2 + 3) * S, neckY * S, 0.22 * S);
    flat.add(g); parts.size = g;
  }
  // đường sườn bên trái + nhãn giặt may vào sườn, rủ xuống
  const seamX = -128;
  const seam = new THREE.Mesh(new THREE.BoxGeometry(9 * S, 150 * S, 0.7 * S), new THREE.MeshStandardMaterial({ color: shirt.clone().multiplyScalar(0.9), roughness: 0.95, bumpMap: kt, bumpScale: 0.8 }));
  seam.position.set(seamX * S, -125 * S, 0.3 * S); seam.receiveShadow = true; seam.castShadow = true;
  flat.add(noBounds(seam));
  const sst = stitches([[seamX + 3.4, -52], [seamX + 3.4, -198]], 0.75, stc, 1.4, 1.0, 0.36); if (sst) flat.add(noBounds(sst));
  if (tCare) {
    const g = labelMesh(tCare, o.care.spec, 1.8);
    g.position.set((seamX + 0.5) * S, -110 * S, 0.35 * S); // mép trên kẹp dưới đường sườn
    g.rotation.z = CARE_ROT; // chìa ngang ra khỏi sườn, hơi rủ xuống
    flat.add(g); parts.care = g;
  }
  // khung nhìn: chỉ tính phần đang chỉnh (+ bo cổ cho mác cổ/size)
  const keep = o.focus === 'care' ? ['care'] : ['main', 'size'];
  for (const [k, g] of Object.entries(parts)) {
    if (!g || keep.includes(k)) continue;
    g.traverse((n) => { if ((n as THREE.Mesh).isMesh) noBounds(n as THREE.Mesh); });
  }
  noBounds(rib);
  const out = new THREE.Group(); out.add(flat);
  out.position.y = 0.05 * S;
  const view = o.focus === 'care' ? { az: CARE_ROT + 0.08, el: 1.02 } : { az: 0.18, el: 1.0 };
  return { group: out, view, aim: 0.5, zoom: o.focus === 'care' ? 0.92 : o.focus === 'size' ? 0.8 : 0.84, blob: 0 };
}

// ---------- cảnh mác da trên lưng quần jean ----------
async function patchScene(o: WL3DOpts, aniso: number) {
  const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2;
  const spec = o.patch.spec, sz = wlSize(spec.size), P = wlPalette(spec.palette);
  const W = sz.wMm, H = sz.hMm;
  // vải jean + cạp quần
  const dTex = new THREE.CanvasTexture(twillColor()); dTex.wrapS = dTex.wrapT = THREE.RepeatWrapping; dTex.repeat.set(1 / 28, 1 / 28); dTex.colorSpace = THREE.SRGBColorSpace;
  const dBump = bumpTex(twill(), 1 / 3, 1 / 3);
  const denimMat = (k = 1) => new THREE.MeshStandardMaterial({ map: dTex, color: new THREE.Color(0.82 * k, 0.82 * k, 0.86 * k), roughness: 0.92, bumpMap: dBump, bumpScale: 1.2 });
  const pg = new THREE.PlaneGeometry(420 * S, 360 * S); pg.translate(0, -40 * S, 0);
  pg.attributes.uv.array.forEach((_, i, a) => { (a as Float32Array)[i] *= i % 2 === 0 ? 420 : 360; });
  const panel = new THREE.Mesh(pg, denimMat()); panel.receiveShadow = true; flat.add(noBounds(panel));
  const bandH = Math.max(H + 12, 46), bandY = 40; // cạp quần (dày hơn), chạy ngang
  const bg = new THREE.BoxGeometry(320 * S, bandH * S, 1.6 * S); bg.translate(0, (bandY - bandH / 2) * S, 0.8 * S);
  const uvb = bg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uvb.count; i++) uvb.setXY(i, uvb.getX(i) * 320, uvb.getY(i) * bandH);
  const band = new THREE.Mesh(bg, denimMat(1.08)); band.receiveShadow = true; band.castShadow = true; flat.add(noBounds(band));
  const orange = '#D9893A';
  for (const yy of [bandY - 3, bandY - 5.4, bandY - bandH + 3, bandY - bandH + 5.4]) {
    const st = stitches([[-160, yy], [160, yy]], 1.75, orange, 2.2, 1.2, 0.55); if (st) flat.add(noBounds(st));
  }
  // đỉa quần
  const loop = new THREE.Mesh(new THREE.BoxGeometry(11 * S, (bandH + 10) * S, 2.2 * S), denimMat(1.12));
  loop.position.set(-(W / 2 + 26) * S, (bandY - bandH / 2 - 3) * S, 2.0 * S); loop.castShadow = true; flat.add(noBounds(loop));
  const ls = stitches([[-(W / 2 + 26) - 3.6, bandY + 1], [-(W / 2 + 26) - 3.6, bandY - bandH - 6]], 3.15, orange, 1.8, 1.0, 0.5); if (ls) flat.add(noBounds(ls));

  // mác: khối đùn bo góc, mặt trên = thiết kế, bump = vân da + khuôn ép chìm
  if (o.patch.el) {
    const t = await svgTex(o.patch.el, o.fontCss, 1600, aniso, '');
    t.anisotropy = aniso;
    let bumpCanvas: HTMLCanvasElement | null = null;
    if (o.patch.mask) {
      const mt = await svgTex(o.patch.mask, o.fontCss, 1600, aniso, '#FFFFFF');
      const src = mt.image as HTMLCanvasElement;
      bumpCanvas = document.createElement('canvas'); bumpCanvas.width = src.width; bumpCanvas.height = src.height;
      const bx = bumpCanvas.getContext('2d')!;
      bx.filter = 'blur(1.2px)'; bx.drawImage(src, 0, 0); bx.filter = 'none';
      grainInto(bx, Math.max(src.width, src.height), 5, spec.material === 'leather' ? 0.3 : 0.2);
      mt.dispose();
    }
    const r = PATCH_R;
    const shape = new THREE.Shape();
    shape.moveTo(r, 0); shape.lineTo(W - r, 0); shape.quadraticCurveTo(W, 0, W, r); shape.lineTo(W, H - r); shape.quadraticCurveTo(W, H, W - r, H);
    shape.lineTo(r, H); shape.quadraticCurveTo(0, H, 0, H - r); shape.lineTo(0, r); shape.quadraticCurveTo(0, 0, r, 0);
    const depth = spec.material === 'leather' ? 1.8 : 1.3;
    const eg = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.35, bevelSegments: 3, curveSegments: 16 });
    t.repeat.set(1 / W, 1 / H); t.needsUpdate = true;
    const bt = bumpCanvas ? new THREE.CanvasTexture(bumpCanvas) : null;
    if (bt) bt.repeat.set(1 / W, 1 / H);
    const top = new THREE.MeshPhysicalMaterial({ map: t, bumpMap: bt ?? undefined, bumpScale: 2.2, roughness: spec.material === 'leather' ? 0.66 : 0.5, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'), clearcoat: spec.material === 'pu' ? 0.25 : 0, clearcoatRoughness: 0.5 });
    const side = new THREE.MeshStandardMaterial({ color: new THREE.Color(P.bg).multiplyScalar(0.62), roughness: 0.8 });
    const pm = new THREE.Mesh(eg, [top, side]);
    pm.scale.set(S, S, S); pm.position.set((-W / 2 + 6) * S, (bandY - bandH / 2 - H / 2) * S, 1.6 * S);
    pm.castShadow = true; pm.receiveShadow = true;
    flat.add(pm);
  }
  const out = new THREE.Group(); out.add(flat);
  return { group: out, view: { az: 0.22, el: 0.95 }, aim: 0.5, zoom: 0.86, blob: 0 };
}

export function wovenLabelBuilder(o: WL3DOpts): Builder {
  return async (aniso) => (o.focus === 'patch' ? patchScene(o, aniso) : shirtScene(o, aniso));
}
