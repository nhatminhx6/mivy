'use client';
// Túi giấy đựng đồ ăn 3D: túi SOS mở miệng răng cưa (hông gấp lõm vào ở miệng), túi bánh mì nằm có ổ bánh mì ló ra,
// túi cửa sổ thấy bánh quy/hạt qua màng PLA, túi quai dẹt, túi gấp miệng dán tem. Thớ giấy kraft vẽ bằng canvas.
// Mặt túi = lưới nhiều đoạn (uốn phồng/gấp được), miệng răng cưa / khoét ngón cái / cửa sổ cắt bằng alphaMap.

import * as THREE from 'three';
import { S, svgTex, canvasTex, type Builder, type Built } from './mockup3d';
import { fbgFace, fbgPaper, fbgSize, fbgLayout, fbgInk, type FBGPaper, type FBGSpec, type FBGData } from './foodbag-engine';

export interface FBG3DOpts {
  spec: FBGSpec; data: FBGData; fontCss: string;
  front: SVGSVGElement | null; back: SVGSVGElement | null; gusset: SVGSVGElement | null;
}

// ---------- texture giấy ----------
let rnd = 7;
const rand = () => { rnd = (rnd * 16807) % 2147483647; return (rnd - 1) / 2147483646; };

/** phủ thớ giấy (đốm + sợi) lên texture in (multiply, không đổi màu mực nhiều) */
function addFibre(cv: HTMLCanvasElement, p: FBGPaper) {
  const ctx = cv.getContext('2d'); if (!ctx) return;
  const w = cv.width, h = cv.height;
  rnd = 11;
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  const n = Math.round((w * h) / (p.kraft ? 520 : 1400));
  for (let i = 0; i < n; i++) {
    const a = (p.kraft ? 0.05 : 0.025) + rand() * (p.kraft ? 0.09 : 0.04);
    const v = p.dark ? 40 : p.kraft && p.id === 'kraft' ? 120 : 175;
    ctx.fillStyle = `rgba(${v},${v - 18},${v - 40},${a})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 2.2, 1 + rand() * 2.2);
  }
  if (p.kraft) {
    ctx.lineCap = 'round';
    for (let i = 0; i < n / 6; i++) {
      const x = rand() * w, y = rand() * h, l = 4 + rand() * 16, a = rand() * Math.PI;
      ctx.strokeStyle = `rgba(${p.dark ? 30 : 110},${p.dark ? 26 : 80},${p.dark ? 22 : 45},${0.06 + rand() * 0.08})`;
      ctx.lineWidth = 0.7 + rand() * 0.8;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + rand() * 3, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
    }
  }
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < n / 5; i++) {
    ctx.fillStyle = `rgba(255,248,235,${0.03 + rand() * 0.05})`;
    ctx.fillRect(rand() * w, rand() * h, 1 + rand() * 1.5, 1 + rand() * 1.5);
  }
  ctx.restore();
}

let bumpCv: HTMLCanvasElement | null = null;
function bumpCanvas(): HTMLCanvasElement {
  if (bumpCv) return bumpCv;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080'; ctx.fillRect(0, 0, 256, 256);
  rnd = 3;
  for (let i = 0; i < 2600; i++) { const v = 90 + Math.round(rand() * 80); ctx.fillStyle = `rgb(${v},${v},${v})`; ctx.fillRect(rand() * 256, rand() * 256, 1 + rand() * 2, 1 + rand() * 2); }
  ctx.lineCap = 'round';
  for (let i = 0; i < 220; i++) {
    const x = rand() * 256, y = rand() * 256, l = 6 + rand() * 18, a = rand() * Math.PI;
    const v = rand() > 0.5 ? 175 : 85; ctx.strokeStyle = `rgba(${v},${v},${v},0.7)`; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke();
  }
  bumpCv = c;
  return c;
}
function bumpTex(wMm: number, hMm: number): THREE.Texture {
  const t = new THREE.CanvasTexture(bumpCanvas());
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(wMm / 70, hMm / 70);
  return t;
}
/** mặt trong túi: màu giấy, tối dần xuống đáy (bóng trong lòng túi) */
function innerTex(p: FBGPaper, aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 256);
  g.addColorStop(0, p.inner); g.addColorStop(0.55, shade(p.inner, 0.78)); g.addColorStop(1, shade(p.inner, 0.5));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 256);
  return canvasTex(c, aniso);
}
function shade(hex: string, k: number): string {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => Math.round(parseInt(s.slice(i, i + 2), 16) * k));
  return `rgb(${v[0]},${v[1]},${v[2]})`;
}

/** alphaMap 1 mặt (trắng = giấy, đen = cắt): miệng răng cưa / khoét ngón cái / cửa sổ */
function alphaFor(wMm: number, hMm: number, o: { serr?: number; notch?: number; win?: { x: number; y: number; w: number; h: number; r: number } | null }): THREE.Texture {
  const k = 6; // px / mm
  const c = document.createElement('canvas'); c.width = Math.round(wMm * k); c.height = Math.round(hMm * k);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  if (o.serr) {
    const n = Math.max(2, Math.round(wMm / 6)), st = wMm / n;
    ctx.moveTo(0, o.serr * k);
    for (let i = 0; i < n; i++) { ctx.lineTo((st * (i + 0.5)) * k, 0); ctx.lineTo(st * (i + 1) * k, o.serr * k); }
    ctx.lineTo(wMm * k, hMm * k); ctx.lineTo(0, hMm * k);
  } else ctx.rect(0, 0, c.width, c.height);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#000';
  if (o.notch) { ctx.beginPath(); ctx.arc((wMm / 2) * k, 0, o.notch * k, 0, Math.PI); ctx.fill(); }
  if (o.win) {
    const w = o.win; ctx.beginPath();
    (ctx as CanvasRenderingContext2D & { roundRect: (x: number, y: number, w: number, h: number, r: number) => void }).roundRect(w.x * k, w.y * k, w.w * k, w.h * k, w.r * k);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  return t;
}

// ---------- lưới mặt cong ----------
type Fn = (u: number, v: number) => THREE.Vector3;
function surf(fn: Fn, sx: number, sy: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) {
    const u = i / sx, v = j / sy, p = fn(u, v);
    pos.push(p.x, p.y, p.z); uv.push(u, v);
  }
  for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
    const a = j * (sx + 1) + i, b = a + 1, c = a + sx + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const V = (x: number, y: number, z: number) => new THREE.Vector3(x * S, y * S, z * S);
const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

interface Mats { outer: THREE.Material; inner: THREE.Material }
function sheetMats(map: THREE.Texture, alpha: THREE.Texture, p: FBGPaper, inner: THREE.Texture, wMm: number, hMm: number): Mats {
  const bump = bumpTex(wMm, hMm);
  const outer = new THREE.MeshStandardMaterial({ map, alphaMap: alpha, alphaTest: 0.5, roughness: p.grease ? 0.62 : 0.9, bumpMap: bump, bumpScale: p.kraft ? 0.5 : 0.25, side: THREE.FrontSide });
  const inn = new THREE.MeshStandardMaterial({ map: inner, alphaMap: alpha, alphaTest: 0.5, roughness: 0.95, bumpMap: bump, bumpScale: 0.3, side: THREE.BackSide });
  return { outer, inner: inn };
}
function twoSided(geo: THREE.BufferGeometry, m: Mats): THREE.Group {
  const g = new THREE.Group();
  const a = new THREE.Mesh(geo, m.outer); a.castShadow = true;
  const b = new THREE.Mesh(geo, m.inner); b.castShadow = true;
  g.add(a, b);
  return g;
}

interface Tex { front: THREE.Texture; back: THREE.Texture; gusset: THREE.Texture }

/** túi đáy vuông đứng mở miệng (SOS / cửa sổ / quai dẹt). gốc: tâm đáy */
function standingBag(o: FBG3DOpts, tex: Tex, aniso: number, opt: { handle: boolean }): THREE.Group {
  const sz = fbgSize(o.spec.size), f = fbgFace(sz), p = fbgPaper(o.spec.paper);
  const W = sz.w, G = sz.g, H = sz.h;
  const inner = innerTex(p, aniso);
  const fa = alphaFor(W, H, { serr: f.serr, win: f.win });
  const ba = alphaFor(W, H, { serr: f.serr });
  const ga = alphaFor(G, H, { serr: f.serr });
  const g = new THREE.Group();
  const bulge = G * 0.045;
  // mặt trước (+z), mặt sau (−z): phồng nhẹ giữa, sát góc = 0
  const front = surf((u, v) => V(-W / 2 + u * W, v * H, G / 2 + bulge * Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, v * 1.1)))), 28, 40);
  const back = surf((u, v) => V(W / 2 - u * W, v * H, -G / 2 - bulge * Math.sin(Math.PI * u) * (0.55 + 0.45 * Math.sin(Math.PI * Math.min(1, v * 1.1)))), 28, 40);
  g.add(twoSided(front, sheetMats(tex.front, fa, p, inner, W, H)), twoSided(back, sheetMats(tex.back, ba, p, inner, W, H)));
  // hông: nếp gấp lõm chữ V ở phần miệng (giấy nhớ nếp xếp hông)
  const crease = G * 0.2;
  const fold = (u: number, v: number) => crease * (1 - Math.abs(2 * u - 1)) * (0.25 + 0.75 * smooth(0.55, 1, v));
  const gR = surf((u, v) => V(W / 2 - fold(u, v), v * H, G / 2 - u * G), 16, 40);
  const gL = surf((u, v) => V(-W / 2 + fold(u, v), v * H, -G / 2 + u * G), 16, 40);
  const gm = sheetMats(tex.gusset, ga, p, inner, G, H);
  g.add(twoSided(gR, gm), twoSided(gL, gm));
  // đáy trong lòng túi
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W * S * 0.98, G * S * 0.98), new THREE.MeshStandardMaterial({ color: shade(p.inner, 0.45), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.6 * S;
  g.add(floor);
  // đường gấp dọc 4 góc (sống giấy) – vệt mảnh tối giúp đọc khối
  const edgeMat = new THREE.MeshBasicMaterial({ color: shade(p.hex, 0.72) });
  for (const [x, z] of [[W / 2, G / 2], [-W / 2, G / 2], [W / 2, -G / 2], [-W / 2, -G / 2]]) {
    const e = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * S, 0.35 * S, (H - (f.serr || 0) - 0.5) * S, 6), edgeMat);
    e.position.set(x * S, ((H - (f.serr || 0)) / 2) * S, z * S);
    g.add(e);
  }
  if (opt.handle) {
    // viền gấp miệng vào trong + 2 quai giấy dẹt (dán trong, 2 mặt)
    const band = new THREE.MeshStandardMaterial({ color: shade(p.inner, 0.92), roughness: 0.95, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(W * S * 0.995, f.turn * S), band);
      b.position.set(0, (H - f.turn / 2) * S, (s * (G / 2 - 0.6)) * S);
      g.add(b);
    }
    const hm = new THREE.MeshStandardMaterial({ color: p.id === 'white' ? '#E8E0D1' : p.dark ? '#3A3430' : '#B8895A', roughness: 0.9, side: THREE.DoubleSide, bumpMap: bumpTex(20, 200), bumpScale: 0.4 });
    for (const s of [1, -1]) g.add(flatHandle(W, H, (G / 2 - 1.4) * s, hm, s));
  }
  return g;
}

/** quai giấy dẹt: dải 12mm theo đường cong chữ U */
function flatHandle(W: number, H: number, z: number, mat: THREE.Material, lean: number): THREE.Mesh {
  const a = W * 0.25, top = H + W * 0.3;
  const pts = [
    V(-a, H - 34, z), V(-a, H + W * 0.1, z + lean * 3), V(-a * 0.55, top, z + lean * 7), V(a * 0.55, top, z + lean * 7), V(a, H + W * 0.1, z + lean * 3), V(a, H - 34, z),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const n = 80, wd = 12 * S;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = curve.getPoint(t), tg = curve.getTangent(t);
    const side = new THREE.Vector3().crossVectors(tg, new THREE.Vector3(0, 0, 1)).normalize().multiplyScalar(wd / 2);
    pos.push(p.x + side.x, p.y + side.y, p.z, p.x - side.x, p.y - side.y, p.z);
    uv.push(0, t * 6, 1, t * 6);
    if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 3, k, k + 3, k + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true;
  return m;
}

// ---------- bánh mì ----------
function breadTex(aniso: number): { map: THREE.Texture; bump: THREE.Texture } {
  const w = 1024, h = 256;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const b = document.createElement('canvas'); b.width = w; b.height = h;
  const x = c.getContext('2d')!, y = b.getContext('2d')!;
  // u = vòng quanh (0.5 = đỉnh), v = dọc ổ bánh
  const g = x.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, '#E2B373'); g.addColorStop(0.28, '#D39550'); g.addColorStop(0.5, '#B9773A'); g.addColorStop(0.72, '#D39550'); g.addColorStop(1, '#E2B373');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  y.fillStyle = '#808080'; y.fillRect(0, 0, w, h);
  rnd = 5;
  for (let i = 0; i < 2400; i++) { x.fillStyle = `rgba(${rand() > 0.5 ? '255,230,180' : '110,55,15'},${0.05 + rand() * 0.08})`; x.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3); }
  // vết khía chéo trên lưng ổ bánh (vỏ nứt lộ ruột vàng nhạt)
  for (let i = 0; i < 5; i++) {
    const cy = h * (0.18 + i * 0.16), cx = w * 0.5;
    x.save(); x.translate(cx, cy); x.rotate(-0.55);
    const gg = x.createLinearGradient(0, -14, 0, 14); gg.addColorStop(0, 'rgba(240,205,140,0)'); gg.addColorStop(0.5, 'rgba(246,214,150,0.95)'); gg.addColorStop(1, 'rgba(240,205,140,0)');
    x.fillStyle = gg; x.beginPath(); x.ellipse(0, 0, 120, 13, 0, 0, Math.PI * 2); x.fill(); x.restore();
    y.save(); y.translate(cx, cy); y.rotate(-0.55); y.fillStyle = '#3A3A3A'; y.beginPath(); y.ellipse(0, 0, 112, 7, 0, 0, Math.PI * 2); y.fill(); y.restore();
  }
  return { map: canvasTex(c, aniso), bump: new THREE.CanvasTexture(b) };
}
/** ổ bánh mì: tiện quanh trục, 2 đầu nhọn, nằm dọc trục z (đỉnh lưng hướng +y). dài L, bán kính r */
function baguette(L: number, r: number, aniso: number): THREE.Mesh {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 40; i++) { const t = i / 40; const rr = r * Math.pow(Math.sin(Math.PI * t), 0.6) * (0.96 - 0.04 * Math.cos(2 * Math.PI * t)); pts.push(new THREE.Vector2(Math.max(0.6, rr) * S, (t - 0.5) * L * S)); }
  const geo = new THREE.LatheGeometry(pts, 48);
  geo.rotateY(Math.PI); geo.rotateX(-Math.PI / 2);
  geo.scale(1, 0.84, 1);
  const { map, bump } = breadTex(aniso);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 1.6, roughness: 0.86 }));
  m.castShadow = true;
  return m;
}

/** túi bánh mì nằm (mặt trước hướng lên, miệng túi về −z), phồng theo ổ bánh bên trong */
function lyingBreadBag(o: FBG3DOpts, tex: Tex, aniso: number, withBread: boolean, showBack: boolean): THREE.Group {
  const sz = fbgSize(o.spec.size), f = fbgFace(sz), p = fbgPaper(o.spec.paper);
  const W = sz.w, H = sz.h;
  const r = Math.min(W * 0.27, 34);
  const amp = withBread ? r * 2.15 : 3.5;
  const inner = innerTex(p, aniso);
  const a = alphaFor(W, H, { notch: showBack ? 0 : f.notch });
  const env = (v: number) => (withBread ? 0.18 + 0.82 * smooth(0.0, 0.16, v) : 1);
  const top = surf((u, v) => V(-W / 2 + u * W, 0.4 + amp * Math.pow(Math.sin(Math.PI * u), 0.7) * env(v), H / 2 - v * H), 26, 44);
  const g = new THREE.Group();
  const tm = sheetMats(showBack ? tex.back : tex.front, a, p, inner, W, H);
  (tm.outer as THREE.MeshStandardMaterial).color.set(p.dark ? '#FFFFFF' : '#DDD7CF'); // nằm ngửa hứng đèn → bớt cháy
  g.add(twoSided(top, tm));
  // mặt dưới (nằm trên bàn) + mép hông mảnh
  const under = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), new THREE.MeshStandardMaterial({ color: shade(p.inner, 0.6), roughness: 1, side: THREE.DoubleSide }));
  under.rotation.x = -Math.PI / 2; under.position.y = 0.25 * S;
  g.add(under);
  if (withBread) {
    const L = H * 1.22;
    const b = baguette(L, r, aniso);
    b.position.set(0, r * 0.84 * S + 0.6 * S, (H / 2 - L / 2 - H * 0.2) * S);
    g.add(b);
  }
  return g;
}

/** túi gấp miệng nằm phẳng + tem dán niêm phong */
function foldedBag(o: FBG3DOpts, tex: Tex, aniso: number): THREE.Group {
  const sz = fbgSize(o.spec.size), p = fbgPaper(o.spec.paper);
  const W = sz.w, H = sz.h;
  const keep = 0.9, Hb = H * keep, F = H * 0.075;
  const inner = innerTex(p, aniso);
  const t = tex.front.clone(); t.needsUpdate = true;
  t.repeat.set(1, keep); t.offset.set(0, 0); // chỉ phần dưới mặt trước (phần trên gấp vào)
  const g = new THREE.Group();
  const body = surf((u, v) => V(-W / 2 + u * W, 0.5 + 2.2 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v), Hb / 2 - v * Hb), 20, 30);
  const ma = alphaFor(W, Hb, {});
  const bm = sheetMats(t, ma, p, inner, W, Hb);
  (bm.outer as THREE.MeshStandardMaterial).color.set('#E4E0DA'); // mặt nằm ngửa hứng đèn → bớt cháy sáng
  g.add(twoSided(body, bm));
  // vạt gấp miệng (mặt sau giấy, lật xuống đè lên mặt trước)
  const flap = surf((u, v) => V(-W / 2 + u * W, 1.4 + 1.6 * Math.sin(Math.PI * u) * (1 - v), -Hb / 2 + v * F), 16, 6);
  const fm = new THREE.MeshStandardMaterial({ color: shade(p.hex, 0.8), roughness: 0.9, bumpMap: bumpTex(W, F), bumpScale: 0.5, side: THREE.DoubleSide });
  const fl = new THREE.Mesh(flap, fm); fl.castShadow = true;
  g.add(fl);
  // nếp gấp sáng
  const crease = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * S, 0.9 * S, W * S, 8), new THREE.MeshStandardMaterial({ color: shade(p.hex, 1.05), roughness: 0.9 }));
  crease.rotation.z = Math.PI / 2; crease.position.set(0, 1.0 * S, (-Hb / 2) * S);
  g.add(crease);
  // tem tròn dán đè mép vạt
  g.add(sealSticker(o, W, -Hb / 2 + F, aniso));
  return g;
}
function sealSticker(o: FBG3DOpts, W: number, z: number, aniso: number): THREE.Mesh {
  const ink0 = fbgInk(o.spec.inks[0] || 'red').hex;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = ink0; x.beginPath(); x.arc(128, 128, 126, 0, Math.PI * 2); x.fill();
  x.strokeStyle = '#fff'; x.lineWidth = 5; x.beginPath(); x.arc(128, 128, 104, 0, Math.PI * 2); x.stroke();
  const ini = (o.data.brand || 'M').trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase() || '').join('') || 'M';
  x.fillStyle = '#fff'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `800 ${ini.length > 1 ? 92 : 120}px "Be Vietnam Pro"`; x.fillText(ini, 128, 122);
  x.font = '700 22px "Be Vietnam Pro"'; x.fillText('CẢM ƠN', 128, 196);
  const r = Math.min(24, W * 0.16);
  const m = new THREE.Mesh(new THREE.CircleGeometry(r * S, 48), new THREE.MeshStandardMaterial({ map: canvasTex(c, aniso), roughness: 0.35, polygonOffset: true, polygonOffsetFactor: -3 }));
  m.rotation.x = -Math.PI / 2; m.position.set(0, 2.6 * S, z * S);
  return m;
}

// ---------- đồ trong túi cửa sổ ----------
function cookieTex(aniso: number, kind: 'cookie' | 'orange'): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  rnd = kind === 'cookie' ? 9 : 13;
  if (kind === 'cookie') {
    x.fillStyle = '#D29A55'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 600; i++) { x.fillStyle = `rgba(${rand() > 0.5 ? '240,200,140' : '150,90,40'},${0.15 + rand() * 0.2})`; x.fillRect(rand() * 256, rand() * 256, 2 + rand() * 4, 2 + rand() * 4); }
    for (let i = 0; i < 16; i++) { x.fillStyle = '#4A2714'; x.beginPath(); x.ellipse(30 + rand() * 196, 30 + rand() * 196, 7 + rand() * 6, 5 + rand() * 5, rand() * 3, 0, Math.PI * 2); x.fill(); }
  } else {
    x.fillStyle = '#F2A33A'; x.fillRect(0, 0, 256, 256);
    x.fillStyle = '#F8D07A'; x.beginPath(); x.arc(128, 128, 112, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 10; i++) {
      const a0 = (i / 10) * Math.PI * 2 + 0.06, a1 = ((i + 1) / 10) * Math.PI * 2 - 0.06;
      x.fillStyle = '#F39A2E'; x.beginPath(); x.moveTo(128, 128); x.arc(128, 128, 102, a0, a1); x.closePath(); x.fill();
    }
  }
  return canvasTex(c, aniso);
}
function contents(o: FBG3DOpts, aniso: number): THREE.Object3D | null {
  const sz = fbgSize(o.spec.size);
  const W = sz.w, G = sz.g, H = sz.h;
  const lay = fbgLayout(o.spec.layout).id;
  const fillH = H * 0.6;
  rnd = 17;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), ps = new THREE.Vector3();
  if (lay === 'coffee') {
    const geo = new THREE.SphereGeometry(1, 12, 8);
    const mat = new THREE.MeshStandardMaterial({ color: '#3B2214', roughness: 0.45, metalness: 0.05 });
    const items: THREE.Matrix4[] = [];
    for (let y = 5; y < fillH; y += 6.5) for (let x = -W / 2 + 10; x < W / 2 - 10; x += 8.5) for (let z = G / 2 - 9; z > G / 2 - 30 && z > -G / 2 + 9; z -= 9) {
      ps.set((x + rand() * 2) * S, (y + rand() * 2) * S, (z - rand() * 2) * S);
      e.set(rand() * 3, rand() * 3, rand() * 3); q.setFromEuler(e); sc.set(4.2 * S, 3.2 * S, 5.6 * S);
      items.push(m4.compose(ps, q, sc).clone());
    }
    const im = new THREE.InstancedMesh(geo, mat, items.length);
    items.forEach((m, i) => im.setMatrixAt(i, m));
    return im;
  }
  const kind = lay === 'dried' ? 'orange' : 'cookie';
  const r = kind === 'orange' ? Math.min(19, W * 0.15) : Math.min(21, W * 0.16), t = kind === 'orange' ? 4 : 7;
  const geo = new THREE.CylinderGeometry(r * S, r * S * 0.97, t * S, 28);
  const side = new THREE.MeshStandardMaterial({ color: kind === 'orange' ? '#E5892A' : '#B8793A', roughness: 0.8 });
  const top = new THREE.MeshStandardMaterial({ map: cookieTex(aniso, kind), roughness: 0.75 });
  const items: THREE.Matrix4[] = [];
  // xếp đứng nghiêng sát cửa sổ (nhìn thấy mặt bánh) + lớp nằm phía trong
  const x0 = -W / 2 + r + 6, x1 = W / 2 - r - 6;
  const cols = Math.max(1, Math.floor((x1 - x0) / (r * 1.8)) + 1), dx = cols > 1 ? (x1 - x0) / (cols - 1) : 0;
  sc.set(1, 1, 1);
  // 2 lớp bánh đứng mặt hướng ra cửa sổ (lớp sau lệch nửa bước) — xoay quanh trục bánh rồi mới nghiêng
  for (let layer = 0; layer < 2; layer++) {
    const zc = G / 2 - t / 2 - 9 - layer * (t + 5);
    if (zc < -G / 2 + t + 4) break;
    for (let row = 0, y = r + 4; y < fillH; row++, y += r * 1.62) for (let i = 0; i < cols + layer; i++) {
      const x = (cols > 1 ? x0 + dx * i : 0) + (layer ? -dx * 0.5 : 0) + (row % 2 ? dx * 0.18 : -dx * 0.1);
      if (x < x0 - 0.5 || x > x1 + 0.5) continue;
      ps.set(x * S, (y + (rand() - 0.5) * 3) * S, zc * S);
      e.set(Math.PI / 2 - 0.1 + (rand() - 0.5) * 0.08, rand() * 6, 0); q.setFromEuler(e);
      items.push(m4.compose(ps, q, sc).clone());
    }
  }
  const im = new THREE.InstancedMesh(geo, [side, top, top], items.length);
  items.forEach((m, i) => im.setMatrixAt(i, m));
  return im;
}
/** vài cái bánh/hạt rơi ra bàn cạnh túi */
function loose(o: FBG3DOpts, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const lay = fbgLayout(o.spec.layout).id;
  if (lay === 'coffee') {
    const geo = new THREE.SphereGeometry(1, 12, 8), mat = new THREE.MeshStandardMaterial({ color: '#3B2214', roughness: 0.45 });
    rnd = 23;
    for (let i = 0; i < 18; i++) { const m = new THREE.Mesh(geo, mat); m.scale.set(4.2 * S, 3 * S, 5.6 * S); m.position.set((rand() - 0.5) * 70 * S, 3 * S, (rand() - 0.5) * 40 * S); m.rotation.y = rand() * 6; m.castShadow = true; g.add(m); }
    return g;
  }
  const kind = lay === 'dried' ? 'orange' : 'cookie';
  const r = kind === 'orange' ? 19 : 21, t = kind === 'orange' ? 4 : 7;
  const geo = new THREE.CylinderGeometry(r * S, r * S * 0.97, t * S, 28);
  const mats = [new THREE.MeshStandardMaterial({ color: kind === 'orange' ? '#E5892A' : '#B8793A', roughness: 0.8 }), new THREE.MeshStandardMaterial({ map: cookieTex(aniso, kind), roughness: 0.75 })];
  const spots: [number, number, number, number][] = [[0, 0, 0, 0.0], [r * 1.9, -r * 0.6, 0, 0.0], [r * 0.9, r * 0.5, t * 0.9, 0.18]];
  for (const [x, z, y, tilt] of spots) {
    const m = new THREE.Mesh(geo, [mats[0], mats[1], mats[1]]);
    m.position.set(x * S, (t / 2 + y) * S, z * S); m.rotation.set(tilt, x * 0.03, tilt * 0.6); m.castShadow = true;
    g.add(m);
  }
  return g;
}

/** PLA màng trong che cửa sổ (bên trong mặt trước) */
function windowFilm(o: FBG3DOpts): THREE.Mesh | null {
  const sz = fbgSize(o.spec.size), f = fbgFace(sz);
  if (!f.win) return null;
  const w = f.win, W = sz.w, G = sz.g, H = sz.h;
  const m = new THREE.Mesh(new THREE.PlaneGeometry((w.w + 8) * S, (w.h + 8) * S), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false }));
  const bulge = G * 0.045;
  m.position.set((-W / 2 + w.x + w.w / 2) * S, (H - w.y - w.h / 2) * S, (G / 2 + bulge * 0.7 - 0.8) * S);
  m.renderOrder = 3;
  return m;
}

// ---------- builder ----------
async function texFor(el: SVGSVGElement | null, p: FBGPaper, fontCss: string, outW: number, aniso: number): Promise<THREE.Texture> {
  if (!el) { const c = document.createElement('canvas'); c.width = c.height = 8; const x = c.getContext('2d')!; x.fillStyle = p.hex; x.fillRect(0, 0, 8, 8); return canvasTex(c, aniso); }
  const t = await svgTex(el, fontCss, outW, aniso, p.hex);
  addFibre(t.image as HTMLCanvasElement, p);
  t.needsUpdate = true;
  return t;
}

export function foodBagBuilder(o: FBG3DOpts): Builder {
  return async (aniso): Promise<Built> => {
    const sz = fbgSize(o.spec.size), p = fbgPaper(o.spec.paper);
    const tex: Tex = {
      front: await texFor(o.front, p, o.fontCss, 1400, aniso),
      back: await texFor(o.back, p, o.fontCss, 1200, aniso),
      gusset: await texFor(o.gusset, p, o.fontCss, 600, aniso),
    };
    const g = new THREE.Group();
    const W = sz.w, G = sz.g, H = sz.h;

    if (sz.kind === 'banhmi') {
      const a = lyingBreadBag(o, tex, aniso, true, false);
      a.rotation.y = 0.42;
      const b = lyingBreadBag(o, tex, aniso, false, true);
      b.rotation.y = -0.38; b.position.set(-W * 1.05 * S, 0, -H * 0.28 * S);
      g.add(b, a);
      return { group: g, view: { az: 0.1, el: 0.72 }, aim: 0.3, zoom: 1.42, blob: 0.25 };
    }

    const main = standingBag(o, tex, aniso, { handle: sz.kind === 'handle' });
    if (sz.kind === 'window') {
      const c = contents(o, aniso); if (c) main.add(c);
      const film = windowFilm(o); if (film) main.add(film);
      main.rotation.y = -0.18;
      g.add(main);
      const l = loose(o, aniso); l.position.set((W * 0.55 + 26) * S, 0, (G / 2 + 34) * S);
      g.add(l);
      return { group: g, view: { az: 0.32, el: 0.2 }, aim: 0.46, zoom: 1.32, blob: 0.55 };
    }
    if (sz.kind === 'handle') {
      main.rotation.y = -0.22;
      const second = standingBag(o, tex, aniso, { handle: true });
      second.rotation.y = Math.PI - 0.55;
      second.position.set((W * 0.95) * S, 0, (-G * 1.1) * S);
      g.add(second, main);
      return { group: g, view: { az: 0.28, el: 0.16 }, aim: 0.5, zoom: 1.22, blob: 0.55 };
    }
    // SOS: túi mở đứng + túi gấp miệng dán tem nằm cạnh
    main.rotation.y = -0.25;
    const fold = foldedBag(o, tex, aniso);
    fold.rotation.y = 0.35;
    fold.position.set((W * 0.95 + 20) * S, 0, (G * 0.35 + 30) * S);
    g.add(main, fold);
    return { group: g, view: { az: 0.36, el: 0.26 }, aim: 0.42, zoom: 1.38, blob: 0.5 };
  };
}
