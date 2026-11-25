'use client';
// Tạp dề 3D: treo trên thanh gỗ có chốt (peg rail) gắn tường — ảnh sản phẩm kiểu shop đồng phục.
// Thân vải = lưới phẳng uốn nếp mềm (xếp ly dọc tăng dần xuống lai), mép may chỉ, túi phồng nhẹ có đường may;
// yếm: dây cổ vắt qua chốt giữa, xỏ khoen kim loại ở 2 góc yếm, có khoá chỉnh dây; dây buộc eo buông 2 bên.
// Tạp dề ngang hông / bistro: 2 dây buộc vắt qua 2 chốt, dây lưng may liền. Hình in/thêu ăn vào vân vải.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { apFabric, apronGeom, type APMaterial, type APSpec } from './apron-engine';

export interface Apron3DOpts { tex: SVGSVGElement | null; spec: APSpec; fontCss: string }

let seed = 11;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const smooth = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const hexMul = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => Math.min(255, Math.round(parseInt(s.slice(i, i + 2), 16) * k)));
  return `rgb(${v.join(',')})`;
};

/** ô vân vải xám quanh 128 (overlay màu + bump) */
function weaveTile(mat: APMaterial, denim: boolean): HTMLCanvasElement {
  const px = 128;
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, px, px);
  seed = 5;
  if (mat === 'canvas') {
    const t = 8, n = px / t;
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const over = (i + j) % 2 === 0, b = 0.85 + rnd() * 0.25;
      const g = over ? x.createLinearGradient(0, j * t, 0, (j + 1) * t) : x.createLinearGradient(i * t, 0, (i + 1) * t, 0);
      const v = (k: number) => { const q = Math.max(0, Math.min(255, Math.round(128 * b * k))); return `rgb(${q},${q},${q})`; };
      g.addColorStop(0, v(0.6)); g.addColorStop(0.5, v(1.15)); g.addColorStop(1, v(0.6));
      x.fillStyle = g; x.fillRect(i * t, j * t, t, t);
    }
  } else if (mat === 'du') {
    for (let i = 0; i < px; i += 2) { x.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.04})`; x.fillRect(0, i, px, 1); }
    x.strokeStyle = 'rgba(255,255,255,0.2)'; x.lineWidth = 1.4;
    for (let i = 0; i <= px; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, px); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(px, i); x.stroke(); }
  } else {
    // kaki / denim: vân chéo (twill)
    for (let i = -px; i < px * 2; i += 6) {
      x.strokeStyle = `rgba(255,255,255,${(denim ? 0.2 : 0.13) + rnd() * 0.06})`; x.lineWidth = 2.4;
      x.beginPath(); x.moveTo(i, 0); x.lineTo(i + px, px); x.stroke();
      x.strokeStyle = 'rgba(0,0,0,0.16)'; x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(i + 3, 0); x.lineTo(i + 3 + px, px); x.stroke();
    }
  }
  return c;
}
const TILE_MM: Record<APMaterial, number> = { kaki: 9, canvas: 12, du: 18 };

/** vẽ đường may nét đứt dọc 1 path (toạ độ px) */
function stitch(x: CanvasRenderingContext2D, f: number, color: string, draw: () => void) {
  x.save(); x.strokeStyle = color; x.lineWidth = 0.9 * f; x.setLineDash([3.2 * f, 1.8 * f]); x.lineCap = 'round';
  x.beginPath(); draw(); x.stroke(); x.restore();
}

interface Tex { map: THREE.Texture; alpha: THREE.Texture; bump: THREE.Texture; rough: THREE.Texture }
async function apronTex(o: Apron3DOpts, aniso: number): Promise<Tex> {
  const geo = apronGeom(o.spec.style, o.spec.pocket);
  const fab = apFabric(o.spec.fabric);
  const TW = 2048, f = TW / geo.W, TH = Math.round(geo.H * f);
  const outline = new Path2D(geo.outline);
  const mk = () => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; const x = c.getContext('2d')!; x.scale(f, f); return { c, x }; };

  // ---- màu ----
  const { c, x } = mk();
  x.save(); x.clip(outline);
  x.fillStyle = fab.color; x.fillRect(0, 0, geo.W, geo.H);
  seed = 3;
  for (let i = 0; i < 26; i++) { // loang màu vải nhẹ
    const r = 60 + rnd() * 200, cx = rnd() * geo.W, cy = rnd() * geo.H;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const tile = weaveTile(o.spec.material, !!fab.denim);
  const weave = (alpha: number) => {
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = alpha;
    const pat = x.createPattern(tile, 'repeat')!;
    pat.setTransform(new DOMMatrix().scale(TILE_MM[o.spec.material] / 128));
    x.fillStyle = pat; x.fillRect(0, 0, geo.W, geo.H); x.restore();
  };
  weave(o.spec.material === 'kaki' ? (fab.dark ? 0.36 : 0.5) : fab.dark ? 0.5 : 0.65);
  if (fab.denim) { // sợi ngang trắng lấm tấm của vải jean
    for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(255,255,255,${0.05 + rnd() * 0.08})`; x.fillRect(rnd() * geo.W, rnd() * geo.H, 2 + rnd() * 6, 0.6); }
  }
  const thread = fab.denim ? '#D9A441' : fab.dark ? hexMul(fab.color, 1.9) : hexMul(fab.color, 0.62);
  // dây lưng may liền (tạp dề ngang hông/bistro)
  if (geo.band) {
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 0, geo.W, geo.band);
    const sh = x.createLinearGradient(0, geo.band - 2, 0, geo.band + 8); sh.addColorStop(0, 'rgba(0,0,0,0.25)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.fillRect(0, geo.band - 2, geo.W, 10);
    stitch(x, 1, thread, () => { x.moveTo(6, geo.band - 5); x.lineTo(geo.W - 6, geo.band - 5); });
    stitch(x, 1, thread, () => { x.moveTo(6, 6); x.lineTo(geo.W - 6, 6); });
  }
  // túi: bóng mép trên, đường may viền + vạch chia ngăn
  if (geo.pocket) {
    const p = geo.pocket;
    x.fillStyle = 'rgba(0,0,0,0.07)'; x.fillRect(p.x, p.y, p.w, p.h);
    const sh = x.createLinearGradient(0, p.y, 0, p.y + 14); sh.addColorStop(0, 'rgba(0,0,0,0.32)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = sh; x.fillRect(p.x, p.y, p.w, 14);
    x.fillStyle = 'rgba(255,255,255,0.08)'; x.fillRect(p.x, p.y, p.w, 3);
    stitch(x, 1, thread, () => { x.moveTo(p.x + 5, p.y + 9); x.lineTo(p.x + p.w - 5, p.y + 9); });
    stitch(x, 1, thread, () => { x.moveTo(p.x + 5, p.y); x.lineTo(p.x + 5, p.y + p.h - 5); x.lineTo(p.x + p.w - 5, p.y + p.h - 5); x.lineTo(p.x + p.w - 5, p.y); });
    x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 1.6; x.strokeRect(p.x, p.y, p.w, p.h);
    for (const dx of geo.pocketDiv) { stitch(x, 1, thread, () => { x.moveTo(dx, p.y + 10); x.lineTo(dx, p.y + p.h - 6); }); }
  }
  // hình in / thêu
  let ink: HTMLCanvasElement | null = null;
  if (o.tex) {
    const vb = o.tex.viewBox.baseVal;
    ink = await svgToCanvas(await selfContainedSvg(o.tex, o.fontCss), Math.round(geo.print.w * f), Math.round((geo.print.w * f * vb.height) / vb.width));
    x.save(); x.setTransform(1, 0, 0, 1, 0, 0);
    x.drawImage(ink, geo.print.x * f, geo.print.y * f);
    x.restore();
    weave(o.spec.method === 'embroider' ? 0.06 : 0.2);
  }
  x.restore();
  // đường may viền (gập mép) — chỉ lộ ở mép trong viền
  x.save(); x.clip(outline);
  x.strokeStyle = 'rgba(0,0,0,0.3)'; x.lineWidth = 3; x.stroke(outline);
  x.lineWidth = 1.2; x.strokeStyle = thread; x.setLineDash([3.2, 1.8]);
  x.save(); x.translate(geo.W / 2, geo.H / 2); x.scale((geo.W - 16) / geo.W, (geo.H - 16) / geo.H); x.translate(-geo.W / 2, -geo.H / 2); x.stroke(outline); x.restore();
  x.restore();
  const map = canvasTex(c, aniso);

  // ---- alpha (dáng tạp dề) ----
  const a = mk(); a.x.fillStyle = '#000'; a.x.fillRect(0, 0, geo.W, geo.H); a.x.fillStyle = '#fff'; a.x.fill(outline);
  const alpha = new THREE.CanvasTexture(a.c); alpha.anisotropy = aniso;

  // ---- bump: vân vải + nổi chỉ thêu / mực in hơi dày ----
  const b = mk();
  b.x.fillStyle = 'rgb(128,128,128)'; b.x.fillRect(0, 0, geo.W, geo.H);
  const bp = b.x.createPattern(tile, 'repeat')!; bp.setTransform(new DOMMatrix().scale(TILE_MM[o.spec.material] / 128));
  b.x.fillStyle = bp; b.x.fillRect(0, 0, geo.W, geo.H);
  if (ink) {
    const tmp = document.createElement('canvas'); tmp.width = ink.width; tmp.height = ink.height;
    const tx = tmp.getContext('2d')!; tx.drawImage(ink, 0, 0);
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = o.spec.method === 'embroider' ? 'rgb(235,235,235)' : 'rgb(160,160,160)'; tx.fillRect(0, 0, tmp.width, tmp.height);
    b.x.save(); b.x.setTransform(1, 0, 0, 1, 0, 0); b.x.drawImage(tmp, geo.print.x * f, geo.print.y * f); b.x.restore();
  }
  const bump = new THREE.CanvasTexture(b.c); bump.anisotropy = aniso;

  // ---- độ nhám: chỉ thêu/vải dù bóng hơn ----
  const R = 512, rf = R / geo.W;
  const rc = document.createElement('canvas'); rc.width = R; rc.height = Math.round(geo.H * rf);
  const rx = rc.getContext('2d')!;
  const base = o.spec.material === 'du' ? 160 : o.spec.material === 'canvas' ? 245 : 225;
  rx.fillStyle = `rgb(${base},${base},${base})`; rx.fillRect(0, 0, rc.width, rc.height);
  if (ink) {
    const tmp = document.createElement('canvas'); tmp.width = Math.round(geo.print.w * rf); tmp.height = Math.round((ink.height / ink.width) * tmp.width);
    const tx = tmp.getContext('2d')!; tx.drawImage(ink, 0, 0, tmp.width, tmp.height);
    tx.globalCompositeOperation = 'source-in'; const v = o.spec.method === 'embroider' ? 115 : 175; tx.fillStyle = `rgb(${v},${v},${v})`; tx.fillRect(0, 0, tmp.width, tmp.height);
    rx.drawImage(tmp, geo.print.x * rf, geo.print.y * rf);
  }
  const rough = new THREE.CanvasTexture(rc); rough.anisotropy = aniso;
  return { map, alpha, bump, rough };
}

function woodTex(aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#9A6B43'; x.fillRect(0, 0, 1024, 128);
  seed = 21;
  for (let i = 0; i < 70; i++) {
    const y = rnd() * 128, a = 0.05 + rnd() * 0.12;
    x.strokeStyle = rnd() > 0.5 ? `rgba(60,35,18,${a})` : `rgba(210,170,120,${a * 0.8})`; x.lineWidth = 0.6 + rnd() * 2;
    x.beginPath(); x.moveTo(0, y);
    for (let s = 0; s <= 1024; s += 64) x.lineTo(s, y + Math.sin(s / 140 + i) * 3 + (rnd() - 0.5) * 1.5);
    x.stroke();
  }
  return canvasTex(c, aniso);
}
function plasterTex(aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ECE6DC'; x.fillRect(0, 0, 512, 512);
  seed = 9;
  for (let i = 0; i < 5000; i++) { x.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '120,100,80'},${0.03 + rnd() * 0.05})`; x.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 1 + rnd() * 3); }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); return t;
}
/** tường không tính vào khung hình (lõi 3D ôm theo bbox), không bị cull */
function noBounds<T extends THREE.Mesh>(m: T): T { m.geometry.boundingBox = new THREE.Box3(); m.frustumCulled = false; return m; }

/** dải vải dẹt chạy theo đường cong (dây cổ / dây buộc): mặt dải luôn nghiêng về phía trước (+z) */
function ribbon(pts: THREE.Vector3[], width: number, mat: THREE.Material, seg = 80): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts);
  const P = curve.getSpacedPoints(seg);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const fwd = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i <= seg; i++) {
    const t = curve.getTangentAt(i / seg);
    let side = new THREE.Vector3().crossVectors(t, fwd);
    if (side.lengthSq() < 1e-4) side = new THREE.Vector3(1, 0, 0);
    side.normalize().multiplyScalar(width / 2);
    const a = P[i].clone().add(side), b = P[i].clone().sub(side);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uv.push(i / seg * (curve.getLength() / width / 4), 0, i / seg * (curve.getLength() / width / 4), 1);
    if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos.map((v) => v * S), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function apronBuilder(o: Apron3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong thiết kế');
    const spec = o.spec;
    const geo = apronGeom(spec.style, spec.pocket);
    const fab = apFabric(spec.fabric);
    const t = await apronTex(o, aniso);
    const W = geo.W, H = geo.H, du = spec.material === 'du';
    const isBib = spec.style === 'bib';
    const g = new THREE.Group();

    // ---- thân vải: lưới phẳng uốn nếp (toạ độ: X giữa, Y=0 mép trên, xuống là âm; Z ra trước tường) ----
    const NX = 96, NY = 120;
    const pk = geo.pocket;
    const z0 = isBib ? 46 : 30, z1 = 6;
    const surf = (X: number, yd: number): [number, number, number] => {
      const tt = yd / H; // 0 mép trên → 1 lai
      let z = z0 + (z1 - z0) * smooth(0, 0.85, tt);
      // nếp xếp dọc: biên độ tăng dần xuống lai (vải rủ), 2 tần số lệch pha cho tự nhiên
      const amp = (isBib ? smooth(0.32, 1, tt) : smooth(0.08, 1, tt)) * (spec.style === 'waist' ? 12 : 21);
      // nếp chỉ phồng RA trước (vải tựa tường không xuyên ra sau tường)
      const fold = 0.62 * Math.sin((X / 175) * Math.PI * 2 + 0.8 + tt * 1.4) + 0.38 * Math.sin((X / 71) * Math.PI * 2 + 2.1 - tt * 0.8);
      z += amp * (0.5 + 0.5 * fold);
      // yếm: phần ngực phẳng, hơi khum ra ở eo (chỗ dây buộc)
      if (isBib) z += 5 * Math.exp(-(((yd - 300) / 90) ** 2)) * Math.cos((X / W) * Math.PI);
      // túi phồng nhẹ
      if (pk) {
        const px = X + W / 2;
        const inX = smooth(pk.x, pk.x + 30, px) * (1 - smooth(pk.x + pk.w - 30, pk.x + pk.w, px));
        const inY = smooth(pk.y, pk.y + 40, yd) * (1 - smooth(pk.y + pk.h - 20, pk.y + pk.h, yd));
        z += 5 * inX * inY;
      }
      // lai hơi cuộn ra
      z += 3.5 * smooth(0.95, 1, tt);
      // co ngang chút ở nếp sâu (vải gom lại)
      const xs = X * (1 - 0.02 * amp / 21);
      return [xs, -yd, z];
    };
    const plane = new THREE.PlaneGeometry(1, 1, NX, NY);
    const pa = plane.attributes.position as THREE.BufferAttribute, ua = plane.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      const u = ua.getX(i), v = ua.getY(i);
      const [px, py, pz] = surf((u - 0.5) * W, (1 - v) * H);
      pa.setXYZ(i, px * S, py * S, pz * S);
    }
    plane.computeVertexNormals();
    const sheenColor = new THREE.Color(fab.dark ? hexMul(fab.color, 2.2) : '#FFFFFF');
    const front = new THREE.MeshPhysicalMaterial({
      map: t.map, alphaMap: t.alpha, alphaTest: 0.5, bumpMap: t.bump, bumpScale: du ? 0.6 : 1.4, roughnessMap: t.rough, roughness: 1,
      sheen: du ? 0.55 : 0.35, sheenRoughness: du ? 0.45 : 0.85, sheenColor, side: THREE.FrontSide,
    });
    const backMat = new THREE.MeshStandardMaterial({ color: hexMul(fab.color, 0.7), alphaMap: t.alpha, alphaTest: 0.5, roughness: 0.95, side: THREE.BackSide });
    const body = new THREE.Mesh(plane, front); body.castShadow = true; body.receiveShadow = true;
    const bodyBack = new THREE.Mesh(plane, backMat); bodyBack.castShadow = true;
    g.add(body, bodyBack);
    // độ dày mép (gập 2 lớp): ống mảnh dọc viền
    const edgeMat = new THREE.MeshStandardMaterial({ color: hexMul(fab.color, 0.88), roughness: 0.9 });

    // ---- dây (vải dẹt cùng màu) ----
    const strapTile = weaveTile(spec.material, !!fab.denim);
    // dải dây: chiều ngang canvas = dọc theo dây (u), chiều cao = bề ngang dây (v) → 2 đường may chạy dọc 2 mép
    const sc = document.createElement('canvas'); sc.width = 256; sc.height = 64;
    const sx = sc.getContext('2d')!; sx.fillStyle = fab.color; sx.fillRect(0, 0, 256, 64);
    sx.globalCompositeOperation = 'overlay'; sx.globalAlpha = 0.45;
    for (let i = 0; i < 4; i++) sx.drawImage(strapTile, i * 64, 0, 64, 64);
    sx.globalCompositeOperation = 'source-over'; sx.globalAlpha = 1;
    const thread = fab.denim ? '#D9A441' : fab.dark ? hexMul(fab.color, 1.9) : hexMul(fab.color, 0.62);
    sx.strokeStyle = thread; sx.lineWidth = 2; sx.setLineDash([9, 6]);
    sx.beginPath(); sx.moveTo(0, 7); sx.lineTo(256, 7); sx.moveTo(0, 57); sx.lineTo(256, 57); sx.stroke();
    const strapMap = canvasTex(sc, aniso); strapMap.wrapS = strapMap.wrapT = THREE.RepeatWrapping;
    const strapMat = new THREE.MeshPhysicalMaterial({ map: strapMap, roughness: du ? 0.6 : 0.92, sheen: 0.3, sheenColor, side: THREE.DoubleSide });
    const metal = new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 1, roughness: 0.25 });
    const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

    // ---- thanh gỗ + chốt treo ----
    const wood = new THREE.MeshStandardMaterial({ map: woodTex(aniso), roughness: 0.55 });
    const pegY = isBib ? 285 : 118;
    const railW = W + 420;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(railW * S, 92 * S, 22 * S), wood);
    rail.position.set(0, pegY * S, 11 * S); rail.castShadow = true; rail.receiveShadow = true; g.add(rail);
    const pegXs = isBib ? [0, -(W / 2 + 110), W / 2 + 110] : [-(W / 2 - 70), W / 2 - 70, 0];
    for (const px of pegXs) {
      const peg = new THREE.Mesh(new THREE.CylinderGeometry(12 * S, 13 * S, 66 * S, 24), wood);
      peg.rotation.x = Math.PI / 2; peg.position.set(px * S, pegY * S, (22 + 33) * S); peg.castShadow = true; g.add(peg);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(17 * S, 24, 16), wood);
      knob.scale.z = 0.7; knob.position.set(px * S, pegY * S, 90 * S); knob.castShadow = true; g.add(knob);
    }
    // vít bắt thanh gỗ
    for (const vx of [-railW / 2 + 40, railW / 2 - 40]) {
      const screw = new THREE.Mesh(new THREE.CylinderGeometry(5 * S, 5 * S, 2 * S, 16), metal);
      screw.rotation.x = Math.PI / 2; screw.position.set(vx * S, pegY * S, 23 * S); g.add(screw);
    }

    const wy = (p: [number, number]) => -p[1];
    if (isBib && geo.neck) {
      // dây cổ: từ 2 góc yếm (qua khoen) lên vắt qua chốt giữa
      const [l, r] = geo.neck;
      const lx = l[0] - W / 2, rx = r[0] - W / 2, ty = pegY + 15;
      const neckPts = [
        V(lx, wy(l) - 4, z0 + 1), V(lx + 10, 60, z0 + 8), V(lx * 0.62, 170, z0 + 18), V(lx * 0.22, ty - 10, 84), V(0, ty, 92),
        V(rx * 0.22, ty - 10, 84), V(rx * 0.62, 170, z0 + 18), V(rx - 10, 60, z0 + 8), V(rx, wy(r) - 4, z0 + 1),
      ];
      g.add(ribbon(neckPts, 24, strapMat));
      // khoen 2 góc yếm + khoá chỉnh dây bên trái
      for (const [gx, gy] of [l, r]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(9 * S, 2.6 * S, 12, 32), metal);
        ring.position.set((gx - W / 2) * S, wy([gx, gy]) * S - 8 * S, (z0 + 2) * S); ring.castShadow = true; g.add(ring);
      }
      const adj = new THREE.Mesh(new THREE.BoxGeometry(34 * S, 16 * S, 5 * S), metal);
      const ap = new THREE.CatmullRomCurve3(neckPts).getPointAt(0.18);
      adj.position.set(ap.x * S, ap.y * S, (ap.z + 3) * S); adj.rotation.z = -0.55; adj.castShadow = true; g.add(adj);
      const slot = new THREE.Mesh(new THREE.BoxGeometry(26 * S, 3 * S, 6 * S), new THREE.MeshStandardMaterial({ color: '#30333A', roughness: 0.6 }));
      slot.position.copy(adj.position); slot.rotation.z = adj.rotation.z; g.add(slot);
      // dây buộc eo buông 2 bên
      for (const s of [-1, 1]) {
        const [ax, ay] = s < 0 ? geo.waist[0] : geo.waist[1];
        const x0 = ax - W / 2, y0 = wy([ax, ay]);
        g.add(ribbon([V(x0, y0, 30), V(x0 + s * 16, y0 - 70, 32), V(x0 + s * 20, y0 - 300, 26), V(x0 + s * 6, y0 - 520, 22), V(x0 + s * 14, y0 - 700, 20)], 24, strapMat));
        const ring = new THREE.Mesh(new THREE.TorusGeometry(8 * S, 2.4 * S, 12, 32), metal);
        ring.position.set((x0 - s * 4) * S, (y0 - 8) * S, 31 * S); g.add(ring);
      }
    } else {
      // tạp dề ngang hông / bistro: 2 dây buộc từ 2 đầu dây lưng vắt qua 2 chốt rồi buông xuống ngoài
      for (const s of [-1, 1]) {
        const x0 = s * W / 2, px = pegXs[s < 0 ? 0 : 1], ty = pegY + 15;
        const pts = [V(x0, -18, z0), V(x0 - s * 8, 40, z0 + 14), V(px + s * 18, ty - 18, 80), V(px, ty, 90), V(px - s * 6, ty - 22, 96),
          V(px + s * 40, 30, 70), V(x0 + s * 40, -200, 40), V(x0 + s * 52, -460, 26), V(x0 + s * 44, -640, 22)];
        g.add(ribbon(pts, 24, strapMat));
      }
    }
    // bóng mềm của tạp dề hắt lên tường (vải sát tường → bóng đổ thật quá mảnh, thêm lớp bóng mờ lệch phải-dưới)
    {
      const SW = 512, sf = SW / (W + 240), SH = Math.round((H + 240) * sf);
      const c = document.createElement('canvas'); c.width = SW; c.height = SH;
      const x = c.getContext('2d')!;
      x.filter = `blur(${Math.round(22 * sf)}px)`; x.fillStyle = 'rgba(40,30,20,0.55)';
      x.translate(120 * sf, 120 * sf); x.scale(sf, sf); x.fill(new Path2D(geo.outline));
      const st = new THREE.CanvasTexture(c); st.colorSpace = THREE.SRGBColorSpace;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry((W + 240) * S, (H + 240) * S), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false, toneMapped: false }));
      sh.position.set(18 * S, (-H / 2 - 26) * S, 1.2 * S); sh.renderOrder = -1;
      g.add(noBounds(sh));
    }
    // ---- tường thạch cao ----
    const wall = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(9000 * S, 9000 * S), new THREE.MeshStandardMaterial({ map: plasterTex(aniso), roughness: 0.95 })));
    wall.position.set(0, -1500 * S, -0.5 * S); wall.receiveShadow = true; g.add(wall);

    // đặt: đáy thấp nhất (dây buộc) chạm y=0
    const bb = new THREE.Box3().setFromObject(g);
    const wrap = new THREE.Group(); wrap.add(g);
    g.position.set(-((bb.min.x + bb.max.x) / 2), -bb.min.y + 900 * S, 0); // nhấc cao: đường sàn (mặt đất bóng) ra khỏi khung
    return { group: wrap, view: { az: 0.3, el: 0.1 }, aim: 0.52, zoom: isBib ? 1.18 : 1.28, blob: 0, swing: 0.5 };
  };
}
