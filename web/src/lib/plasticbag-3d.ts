'use client';
// Túi xốp / túi nilon 3D: 2 tấm màng mỏng (trước + sau) dựng từ lưới mặt phẳng, phồng nhẹ như túi đang đựng đồ,
// nếp nhăn toả ra từ quai + nếp lăn tăn (bump) — màng trong/sữa cho ánh sáng xuyên qua (transmission),
// lỗ quai / khoét quai áo thun = alphaMap từ đúng đường bao file in. Mực in = lớp riêng nổi trên màng.
// Cảnh: 1 túi đứng (đáy phồng) + 1 túi nằm phẳng phía trước (lật mặt sau nếu in 2 mặt khác nhau).

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { pbFilm, pbGeom, pbSize, type PBSpec } from './plasticbag-engine';

export interface PB3DOpts {
  spec: PBSpec;
  front: SVGSVGElement | null; // lớp mực mặt trước (mode 'ink')
  back: SVGSVGElement | null;  // lớp mực mặt sau (null = mặt sau trơn)
  fontCss: string;
}

// ---------- ngẫu nhiên có hạt giống (nếp nhăn ổn định giữa các lần dựng) ----------
function rng(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const sm = (t: number) => { const x = Math.min(1, Math.max(0, t)); return x * x * (3 - 2 * x); };

// ---------- texture phụ ----------
/** màu màng + miếng gia cố quai + nếp xếp hông + vân hàn đáy (canvas, gốc trái-trên = miệng túi) */
function filmCanvas(spec: PBSpec, pxPerMm: number): HTMLCanvasElement {
  const g = pbGeom(pbSize(spec.size)), film = pbFilm(spec.film);
  const c = document.createElement('canvas'); c.width = Math.round(g.W * pxPerMm); c.height = Math.round(g.H * pxPerMm);
  const x = c.getContext('2d')!; x.scale(pxPerMm, pxPerMm);
  x.fillStyle = film.hex; x.fillRect(0, 0, g.W, g.H);
  const shade = film.dark ? 'rgba(255,255,255,' : 'rgba(0,0,0,';
  if (g.patch) { // miếng màng gia cố dán trong: dày hơn → đậm/đục hơn chút, mép rõ
    x.fillStyle = `${shade}0.03)`; x.fillRect(g.patch.x, g.patch.y, g.patch.w, g.patch.h);
    x.strokeStyle = `${shade}0.05)`; x.lineWidth = 0.5; x.strokeRect(g.patch.x, g.patch.y, g.patch.w, g.patch.h);
  }
  if (g.hole) { x.strokeStyle = `${shade}0.22)`; x.lineWidth = 2.4; x.stroke(new Path2D(g.hole)); }
  for (const fx of g.folds) { x.fillStyle = `${shade}0.09)`; x.fillRect(fx - 0.7, g.cut ? g.cut.depth * 0.5 : 0, 1.4, g.H); }
  for (const sy of g.seals) { // vân hàn nhiệt: sọc dọc mảnh
    x.fillStyle = `${shade}0.10)`; x.fillRect(0, sy - 3, g.W, 6);
    x.fillStyle = `${shade}0.10)`;
    for (let i = 0; i < g.W; i += 1.6) x.fillRect(i, sy - 3, 0.6, 6);
  }
  return c;
}
/** alpha: trắng = có màng (đường bao túi trừ lỗ quai / khoét quai) */
function alphaCanvas(spec: PBSpec, pxPerMm: number): HTMLCanvasElement {
  const g = pbGeom(pbSize(spec.size));
  const c = document.createElement('canvas'); c.width = Math.round(g.W * pxPerMm); c.height = Math.round(g.H * pxPerMm);
  const x = c.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.scale(pxPerMm, pxPerMm); x.fillStyle = '#fff';
  x.fill(new Path2D(g.hole ? `${g.outline} ${g.hole}` : g.outline), 'evenodd');
  return c;
}
let crinkleC: HTMLCanvasElement | null = null;
/** nếp lăn tăn của màng mỏng (bump, lặp liền mạch) */
function crinkleTex(aniso: number, rep: number): THREE.Texture {
  if (!crinkleC) {
    const n = 512; crinkleC = document.createElement('canvas'); crinkleC.width = crinkleC.height = n;
    const x = crinkleC.getContext('2d')!; x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
    const r = rng(7);
    for (let i = 0; i < 520; i++) {
      const px = r() * n, py = r() * n, len = 10 + r() * 60, a = r() * Math.PI, light = r() < 0.5;
      for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
        x.strokeStyle = light ? `rgba(255,255,255,${0.10 + r() * 0.16})` : `rgba(0,0,0,${0.10 + r() * 0.16})`;
        x.lineWidth = 0.8 + r() * 1.8;
        x.beginPath(); x.moveTo(px + ox, py + oy);
        const mx = px + ox + Math.cos(a) * len * 0.5 + (r() - 0.5) * 8, my = py + oy + Math.sin(a) * len * 0.5 + (r() - 0.5) * 8;
        x.quadraticCurveTo(mx, my, px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len); x.stroke();
      }
    }
  }
  const t = new THREE.CanvasTexture(crinkleC); t.anisotropy = aniso;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep * 1.3);
  return t;
}

// ---------- nếp nhăn: nếp toả ra từ quai + vài nếp ngang thân + gợn nền ----------
interface Crease { px: number; py: number; ang: number; len: number; amp: number; wid: number }
function makeCreases(seed: number, handleV: number, n: number): Crease[] {
  const r = rng(seed), out: Crease[] = [];
  for (let i = 0; i < n; i++) { // toả từ quai xuống
    const side = i % 2 ? 1 : -1;
    out.push({ px: 0.5 + side * (0.05 + r() * 0.12), py: handleV - 0.02 - r() * 0.05, ang: -Math.PI / 2 + side * (0.25 + r() * 0.75), len: 0.32 + r() * 0.35, amp: (r() < 0.5 ? 1 : -1) * (0.4 + r() * 0.45), wid: 0.006 + r() * 0.01 });
  }
  for (let i = 0; i < Math.round(n * 0.7); i++) { // nếp lẻ trên thân, góc dưới
    out.push({ px: 0.12 + r() * 0.76, py: 0.08 + r() * 0.55, ang: (r() - 0.5) * 1.6 + (r() < 0.5 ? 0 : Math.PI / 2), len: 0.08 + r() * 0.2, amp: (r() < 0.5 ? 1 : -1) * (0.3 + r() * 0.45), wid: 0.008 + r() * 0.012 });
  }
  return out;
}
function wrinkle(u: number, v: number, cs: Crease[], aspect: number): number {
  let w = 0;
  for (const c of cs) {
    const dx = (u - c.px) * aspect, dy = v - c.py;
    const ca = Math.cos(c.ang), sa = Math.sin(c.ang);
    const along = dx * ca + dy * sa, across = -dx * sa + dy * ca;
    if (along < -0.02 || along > c.len) continue;
    const fade = sm(along / 0.09) * (1 - sm((along - c.len * 0.55) / (c.len * 0.45)));
    w += c.amp * Math.exp(-(across * across) / (c.wid * c.wid)) * fade;
  }
  // nếp dài rủ từ quai xuống (túi mềm bị kéo căng khi xách)
  const dv = Math.max(0, 0.95 - v);
  w += 0.55 * Math.sin((u - 0.5) * 21 + Math.sin(v * 5) * 0.8) * sm(dv / 0.35) * (1 - sm((0.35 - v) / 0.3)) * Math.exp(-((u - 0.5) ** 2) / 0.06);
  // gợn mềm nền
  w += 0.18 * Math.sin(u * 9.1 + v * 3.7) * Math.sin(v * 7.3 - u * 2.1) + 0.12 * Math.sin(u * 17.3 - v * 11.1);
  return w;
}

// ---------- 1 tấm màng (lưới) ----------
interface SheetOpt { W: number; H: number; side: 1 | -1; lean?: (u: number, v: number) => number; bulge: (u: number, v: number) => number; wr: (u: number, v: number) => number; wrAmp: number; nu: number; nv: number }
function sheetGeom(o: SheetOpt): THREE.BufferGeometry {
  const { nu, nv } = o;
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), uv = new Float32Array((nu + 1) * (nv + 1) * 2);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv, k = j * (nu + 1) + i;
    const b = o.bulge(u, v);
    const pin = Math.pow(Math.sin(Math.PI * u), 0.35) * (v < 0.02 ? v / 0.02 : 1); // mép hông/đáy giữ chặt
    const z = o.side * (b + o.wr(u, v) * o.wrAmp * pin);
    // màng dồn vào chỗ phồng → bề ngang co lại chút ở giữa thân
    const shrink = 1 - 0.07 * (b / (o.W * 0.14 + 1e-6)) * Math.sin(Math.PI * u) ** 0.5;
    pos[k * 3] = (u - 0.5) * o.W * shrink * S;
    pos[k * 3 + 1] = v * o.H * S;
    pos[k * 3 + 2] = (z + (o.lean ? o.lean(u, v) : 0)) * S;
    uv[k * 2] = o.side === 1 ? u : 1 - u; uv[k * 2 + 1] = v;
  }
  const idx: number[] = [];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (o.side === 1) idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}
/** bản sao đẩy ra ngoài theo pháp tuyến (lớp mực nằm trên màng) */
function offsetGeom(src: THREE.BufferGeometry, d: number): THREE.BufferGeometry {
  const g = src.clone();
  const p = g.attributes.position as THREE.BufferAttribute, n = g.attributes.normal as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) p.setXYZ(i, p.getX(i) + n.getX(i) * d, p.getY(i) + n.getY(i) * d, p.getZ(i) + n.getZ(i) * d);
  p.needsUpdate = true;
  return g;
}

export function plasticBagBuilder(o: PB3DOpts): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong mẫu túi');
    const spec = o.spec, sz = pbSize(spec.size), g = pbGeom(sz), film = pbFilm(spec.film);
    const W = g.W, H = g.H;
    const px = Math.min(5, 2400 / Math.max(W, H));
    const fmap = canvasTex(filmCanvas(spec, px), aniso);
    const amap = new THREE.CanvasTexture(alphaCanvas(spec, px)); amap.anisotropy = aniso;
    const outW = Math.round(Math.min(2400, W * 7));
    const inkF = await svgTex(o.front, o.fontCss, outW, aniso, '');
    const inkB = o.back ? await svgTex(o.back, o.fontCss, outW, aniso, '') : null;
    const bump = crinkleTex(aniso, W / 110);

    const clear = film.opacity < 0.6, milky = !clear && film.opacity < 0.93;
    const filmMat = () => new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF', map: fmap, alphaMap: amap, alphaTest: 0.5, side: THREE.DoubleSide,
      roughness: clear ? 0.07 : film.dark ? 0.4 : 0.5, metalness: 0,
      clearcoat: clear ? 0.8 : 0.55, clearcoatRoughness: clear ? 0.08 : 0.2,
      transmission: clear ? 0.86 : milky ? 0.32 : 0, thickness: clear ? 0.2 * S : 0.6 * S, ior: 1.5,
      bumpMap: bump, bumpScale: clear ? 0.4 : 0.7,
      sheen: film.dark ? 0 : 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color('#ffffff'),
    });
    const inkMat = (t: THREE.Texture) => new THREE.MeshPhysicalMaterial({
      map: t, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.5, clearcoat: 0.2, clearcoatRoughness: 0.4,
      bumpMap: bump, bumpScale: 0.4,
    });

    const handleV = g.cut ? 1 - g.cut.depth / H : 1 - (g.patch ? g.patch.h : 60) / H * 0.55;
    const aspect = W / H;

    // ---- túi đứng: phồng ở thân dưới, khép dần lên quai ----
    const B = W * 0.19;
    const prof = (v: number) => (v < 0.28 ? 0.8 + 0.2 * sm(v / 0.28) : 1 - 0.95 * sm((v - 0.28) / Math.max(0.2, handleV - 0.33)));
    const bulgeUp = (u: number, v: number) => B * Math.pow(Math.sin(Math.PI * u), 0.75) * Math.max(0.03, prof(v));
    const cs = makeCreases(11 + sz.w, handleV, 14);
    const wrA = Math.min(4.6, W * 0.015);
    // phần miệng/quai ngả nhẹ ra sau như túi mềm đang đựng đồ
    const lean = (u: number, v: number) => -W * 0.09 * sm((v - 0.5) / 0.5) ** 1.6 + W * 0.012 * Math.sin(u * 3.1 + v * 2) * sm((v - 0.6) / 0.4);
    const nu = 80, nv = Math.round(80 * H / W);
    const standing = new THREE.Group();
    const fg = sheetGeom({ W, H, side: 1, lean, bulge: bulgeUp, wr: (u, v) => wrinkle(u, v, cs, aspect), wrAmp: wrA, nu, nv });
    const bg = sheetGeom({ W, H, side: -1, lean, bulge: bulgeUp, wr: (u, v) => wrinkle(1 - u, v, cs, aspect) * 0.8, wrAmp: wrA, nu, nv });
    const fMesh = new THREE.Mesh(fg, filmMat()), bMesh = new THREE.Mesh(bg, filmMat());
    for (const m of [fMesh, bMesh]) { m.castShadow = !clear; m.receiveShadow = true; standing.add(m); }
    const fInk = new THREE.Mesh(offsetGeom(fg, 0.12 * S), inkMat(inkF)); standing.add(fInk);
    if (inkB) standing.add(new THREE.Mesh(offsetGeom(bg, 0.12 * S), inkMat(inkB)));
    // đáy: nối mép đáy 2 tấm bằng 1 dải cong (túi đựng đồ phồng đáy)
    {
      const nt = 10, b0 = (u: number) => bulgeUp(u, 0);
      const pos: number[] = [], uvs: number[] = [], idx: number[] = [];
      for (let j = 0; j <= nt; j++) for (let i = 0; i <= nu; i++) {
        const u = i / nu, t = j / nt, b = b0(u);
        const shrink = 1 - 0.07 * (b / (W * 0.14)) * Math.sin(Math.PI * u) ** 0.5;
        pos.push((u - 0.5) * W * shrink * S, -b * 0.42 * Math.sin(Math.PI * t) * S, b * Math.cos(Math.PI * t) * S);
        uvs.push(u, 0.004);
      }
      for (let j = 0; j < nt; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; idx.push(a, c, b, b, c, d); }
      const cg = new THREE.BufferGeometry();
      cg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); cg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      cg.setIndex(idx); cg.computeVertexNormals();
      const cap = new THREE.Mesh(cg, filmMat()); cap.castShadow = !clear; cap.receiveShadow = true;
      standing.add(cap);
    }
    // đáy chạm đất
    const minY = -bulgeUp(0.5, 0) * 0.42 * S;
    standing.position.y = -minY;
    standing.rotation.y = -0.22;

    // ---- túi nằm phẳng phía trước: gần như dẹt, nhăn nhiều hơn ----
    const lying = new THREE.Group();
    const cs2 = makeCreases(97 + sz.h, handleV, 18);
    const flat = (u: number, v: number) => W * 0.012 * Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, v * 1.05));
    const lf = sheetGeom({ W, H, side: 1, bulge: flat, wr: (u, v) => wrinkle(u, v, cs2, aspect), wrAmp: wrA * 1.25, nu, nv });
    const lb = sheetGeom({ W, H, side: -1, bulge: (u, v) => flat(u, v) * 0.3, wr: () => 0, wrAmp: 0, nu: 24, nv: Math.round(24 * H / W) });
    const showBack = !!(inkB && spec.back === 'thanks');
    const lfm = new THREE.Mesh(lf, filmMat()), lbm = new THREE.Mesh(lb, filmMat());
    for (const m of [lfm, lbm]) { m.castShadow = !clear; m.receiveShadow = true; lying.add(m); }
    lying.add(new THREE.Mesh(offsetGeom(lf, 0.12 * S), inkMat(showBack ? inkB! : inkF)));
    lying.rotation.set(-Math.PI / 2, 0, 0);
    const lyWrap = new THREE.Group(); lyWrap.add(lying);
    lying.position.set(0, (W * 0.012 + wrA) * S, 0);
    lyWrap.rotation.y = 0.18;
    lyWrap.position.set(W * 1.02 * S, 0, H * 0.5 * S);

    const out = new THREE.Group();
    out.add(standing, lyWrap);
    // căn giữa cụm
    const bb = new THREE.Box3().setFromObject(out), cc = bb.getCenter(new THREE.Vector3());
    for (const ch of out.children) { ch.position.x -= cc.x; ch.position.z -= cc.z; }
    return { group: out, view: { az: 0.38, el: 0.3 }, aim: 0.4, zoom: 1.28, blob: 0.35 };
  };
}
