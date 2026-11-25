'use client';
// Vé sự kiện 3D (three.js, lõi mockup3d): vé đặt trên tấm lót tối (như mặt bàn da đen):
//  • Vé giấy: 1 vé nguyên (mặt trước), 1 vé đã XÉ cuống theo răng cưa (mép xé lởm chởm, cuống nằm lệch ra),
//    1 vé lật mặt sau nằm dưới. Khấc bán nguyệt 2 đầu răng cưa đúng như khuôn bế.
//  • Thẻ VIP: 3 thẻ nhựa xoè quạt (bóng clearcoat) + 1 thẻ lật mặt sau (QR + số thẻ).
// Dải nhũ hologram: bản đồ kim loại + óng ánh (iridescence) dựng từ "khuôn ép nhũ" của chính thiết kế.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export interface TK3DOpts {
  wMm: number; hMm: number; stubMm: number; radiusMm: number; card: boolean; stubRight: boolean; foil: boolean;
  front0: SVGSVGElement | null; front1: SVGSVGElement | null; back: SVGSVGElement | null; foilMask: SVGSVGElement | null;
  fontCss: string;
}

async function raster(el: SVGSVGElement, css: string, w: number) {
  const vb = el.viewBox.baseVal;
  return svgToCanvas(await selfContainedSvg(el, css), w, Math.max(4, Math.round((w * vb.height) / vb.width)), '#FFFFFF');
}

// R = clearcoat, G = nhám, B = kim loại. vùng nhũ (trắng) → kim loại bóng
function matMap(foil: HTMLCanvasElement | null, w: number, h: number, base: { cc: number; rough: number }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  let f: Uint8ClampedArray | null = null;
  if (foil) { const fc = document.createElement('canvas'); fc.width = w; fc.height = h; const fx = fc.getContext('2d')!; fx.drawImage(foil, 0, 0, w, h); f = fx.getImageData(0, 0, w, h).data; }
  for (let i = 0; i < d.length; i += 4) {
    const k = f ? f[i] / 255 : 0;
    d[i] = Math.round(255 * (base.cc * (1 - k) + 1 * k));
    d[i + 1] = Math.round(255 * (base.rough * (1 - k) + 0.2 * k));
    d[i + 2] = Math.round(255 * k);
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}

function planarUV(geo: THREE.BufferGeometry, w: number, h: number, mirror = false) {
  const p = geo.getAttribute('position'); const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w; uv[i * 2] = mirror ? 1 - u : u; uv[i * 2 + 1] = p.getY(i) / h; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

// ---------- hình vé (mm, gốc góc dưới trái, y lên) ----------
type Pt = [number, number];
/** đường viền đa giác: góc bo r, khấc bán nguyệt n tại x = px (vé giấy). part: 'all' | 'main' | 'stub'; jag = điểm mép xé */
function outline(w: number, h: number, r: number, px: number, n: number, part: 'all' | 'main' | 'stub', jag: Pt[]): Pt[] {
  const pts: Pt[] = [];
  const arc = (cx: number, cy: number, rad: number, a0: number, a1: number, seg = 10) => {
    for (let i = 0; i <= seg; i++) { const a = a0 + ((a1 - a0) * i) / seg; pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
  };
  const corner = (cx: number, cy: number, a0: number) => arc(cx, cy, r, a0, a0 + Math.PI / 2, 6);
  if (part === 'all' || px <= 0) {
    // ngược chiều kim đồng hồ: dưới (trái→phải) · phải · trên (phải→trái) · trái
    corner(r, r, Math.PI); // góc dưới trái: 180°→270°
    if (px > 0) arc(px, 0, n, Math.PI, 0, 12); // khấc dưới (cong vào trong vé)
    corner(w - r, r, -Math.PI / 2);
    corner(w - r, h - r, 0);
    if (px > 0) arc(px, h, n, 0, -Math.PI, 12); // khấc trên
    corner(r, h - r, Math.PI / 2);
    return pts;
  }
  if (part === 'main') { // phần thân bên trái (cuống bên phải): mép phải = mép xé
    corner(r, r, Math.PI);
    arc(px, 0, n, Math.PI, Math.PI / 2, 6);
    for (const p of jag) pts.push(p);
    arc(px, h, n, -Math.PI / 2, -Math.PI, 6);
    corner(r, h - r, Math.PI / 2);
    return pts;
  }
  // cuống: mép trái = mép xé (đi ngược xuống)
  arc(px, 0, n, Math.PI / 2, 0, 6);
  corner(w - r, r, -Math.PI / 2);
  corner(w - r, h - r, 0);
  arc(px, h, n, 0, -Math.PI / 2, 6);
  for (const p of [...jag].reverse()) pts.push(p);
  return pts;
}
function jagged(px: number, h: number, n: number): Pt[] {
  let seed = 31; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const out: Pt[] = [];
  const steps = Math.max(8, Math.round((h - 2 * n) / 0.9));
  for (let i = 0; i <= steps; i++) {
    const y = n + ((h - 2 * n) * i) / steps;
    const dx = i === 0 || i === steps ? 0 : (i % 2 ? 0.42 : -0.42) + (rnd() - 0.5) * 0.5;
    out.push([px + dx, y]);
  }
  return out;
}
function shapeOf(pts: Pt[], w: number, mirror: boolean): THREE.Shape {
  const p = mirror ? pts.map(([x, y]) => [w - x, y] as Pt).reverse() : pts;
  const s = new THREE.Shape();
  s.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length; i++) s.lineTo(p[i][0], p[i][1]);
  s.closePath();
  return s;
}

/** tấm có độ dày t (mm): mặt trước lên trên. flipped = lật úp (thấy mặt sau đọc xuôi). Gốc xoay = tâm vé (w/2, h/2) */
function slab(shape: THREE.Shape, w: number, h: number, t: number, front: THREE.Material, back: THREE.Material, edge: THREE.Material, flipped = false) {
  const inner = new THREE.Group();
  const top = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(shape, 8), w, h), front); top.position.z = t;
  const bottom = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(shape, 8), w, h, true), back);
  const side = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 8 }), [new THREE.MeshBasicMaterial({ visible: false }), edge]);
  for (const m of [top, bottom, side]) { m.castShadow = true; m.receiveShadow = true; }
  inner.add(top, bottom, side);
  inner.position.set(-w / 2, -h / 2, 0);
  const tilt = new THREE.Group(); tilt.add(inner);
  tilt.rotation.x = flipped ? Math.PI / 2 : -Math.PI / 2;
  if (flipped) tilt.position.y = t;
  const outer = new THREE.Group(); outer.add(tilt);
  if (flipped) outer.rotation.y = Math.PI;
  outer.scale.setScalar(S);
  const wrap = new THREE.Group(); wrap.add(outer);
  return wrap;
}

function noise(w: number, h: number, base: string, amt: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < (w * h) / 18; i++) {
    x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${amt * rnd()})` : `rgba(0,0,0,${amt * rnd()})`;
    x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  return c;
}

export function ticketBuilder(o: TK3DOpts): Builder {
  return async (aniso) => {
    if (!o.front0 || !o.back) throw new Error('Chưa dựng xong vé');
    const { wMm: w, hMm: h } = o;
    const px0 = Math.min(2048, Math.round(Math.max(w, h) * (o.card ? 20 : 10)));
    const [f0, f1c, bk, fm] = await Promise.all([
      raster(o.front0, o.fontCss, px0), o.front1 ? raster(o.front1, o.fontCss, px0) : null, raster(o.back, o.fontCss, px0),
      o.foil && o.foilMask ? raster(o.foilMask, o.fontCss, px0) : null,
    ]);
    const base = o.card ? { cc: 1, rough: 0.3 } : { cc: 0.22, rough: 0.58 };
    const face = (c: HTMLCanvasElement, foil: HTMLCanvasElement | null) => {
      const map = canvasTex(c, aniso);
      if (!foil) return new THREE.MeshPhysicalMaterial({ map, roughness: base.rough, clearcoat: base.cc, clearcoatRoughness: o.card ? 0.05 : 0.45 });
      const mm = matMap(foil, c.width, c.height, base);
      const irid = new THREE.CanvasTexture(foil); irid.colorSpace = THREE.NoColorSpace;
      return new THREE.MeshPhysicalMaterial({
        map, roughness: 1, roughnessMap: mm, metalness: 1, metalnessMap: mm, clearcoat: 1, clearcoatMap: mm, clearcoatRoughness: o.card ? 0.05 : 0.35,
        iridescence: 1, iridescenceMap: irid, iridescenceIOR: 1.6, iridescenceThicknessRange: [180, 620], envMapIntensity: 1.8,
      });
    };
    const fr0 = face(f0, fm), fr1 = f1c ? face(f1c, fm) : fr0;
    const bMat = new THREE.MeshPhysicalMaterial({ map: canvasTex(bk, aniso), roughness: base.rough, clearcoat: base.cc * 0.8, clearcoatRoughness: 0.4, side: THREE.BackSide });
    const edge = new THREE.MeshStandardMaterial({ color: o.card ? '#EDEDEA' : '#F4F2EC', roughness: o.card ? 0.4 : 0.9 });
    const g = new THREE.Group();
    const tickets = new THREE.Group();
    const lift = 8; // tấm lót dày 8mm

    if (o.card) {
      const t = 0.76, r = o.radiusMm;
      const shape = shapeOf(outline(w, h, r, 0, 0, 'all', []), w, false);
      [0.04, 0.32, 0.6].forEach((a, i) => {
        const pivot = new THREE.Group();
        pivot.position.set(-w * 0.42 * S, 0, h * 0.24 * S);
        pivot.rotation.y = a;
        const c = slab(shape, w, h, t, i === 1 ? fr1 : fr0, bMat, edge);
        c.position.set((w / 2) * S, i * (t + 0.04) * S, (-h / 2) * S);
        pivot.add(c); tickets.add(pivot);
      });
      const back = slab(shape, w, h, t, fr0, bMat, edge, true);
      back.position.set(w * 1.06 * S, 0, h * 0.74 * S);
      back.rotation.y = -0.12;
      tickets.add(back);
    } else {
      const t = 0.32, r = o.radiusMm, n = 2.4;
      // dựng như cuống bên phải; cuống trái thì lật gương toạ độ (UV vẫn theo x thật)
      const px = w - o.stubMm, mir = !o.stubRight;
      const full = shapeOf(outline(w, h, r, px, n, 'all', []), w, mir);
      const jag = jagged(px, h, n);
      const mainS = shapeOf(outline(w, h, r, px, n, 'main', jag), w, mir);
      const stubS = shapeOf(outline(w, h, r, px, n, 'stub', jag), w, mir);
      // vé lật mặt sau (nằm dưới cùng, phía sau)
      const C = slab(full, w, h, t, fr0, bMat, edge, true);
      C.position.set(w * 0.16 * S, 0, -h * 0.98 * S); C.rotation.y = 0.1;
      // vé nguyên mặt trước, đè 1 phần lên vé lật
      const A = slab(full, w, h, t, fr0, bMat, edge);
      A.position.set(-w * 0.04 * S, (t + 0.03) * S, -h * 0.36 * S); A.rotation.y = -0.05;
      // vé đã xé cuống: thân + cuống tách ra, cuống xoay lệch
      const B = new THREE.Group();
      const Bm = slab(mainS, w, h, t, fr1, bMat, edge);
      const Bs = slab(stubS, w, h, t, fr1, bMat, edge);
      const dir = o.stubRight ? 1 : -1;
      // xoay cuống quanh tâm cuống (không phải tâm vé)
      const sc = (o.stubRight ? w - o.stubMm / 2 : o.stubMm / 2) - w / 2;
      const stubPivot = new THREE.Group(); stubPivot.position.set((sc + dir * 9) * S, 0, 4 * S); stubPivot.rotation.y = -dir * 0.2;
      Bs.position.set(-sc * S, 0, 0); stubPivot.add(Bs);
      B.add(Bm, stubPivot);
      B.position.set(-w * 0.06 * S, 0, h * 0.74 * S); B.rotation.y = 0.035;
      tickets.add(C, A, B);
    }
    // tấm lót tối (mặt bàn da đen) ôm sát cụm vé
    tickets.position.y = lift * S;
    const bb = new THREE.Box3().setFromObject(tickets);
    const pad = (o.card ? 10 : 14) * S;
    const mw = bb.max.x - bb.min.x + pad * 2, md = bb.max.z - bb.min.z + pad * 2;
    const matTex = canvasTex(noise(512, 512, '#1E2025', 0.05), aniso);
    matTex.wrapS = matTex.wrapT = THREE.RepeatWrapping; matTex.repeat.set(3, 3);
    const mat = new THREE.Mesh(new RoundedBoxGeometry(mw, lift * S, md, 4, 3 * S), new THREE.MeshPhysicalMaterial({ map: matTex, color: '#FFFFFF', roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.3, sheenColor: new THREE.Color('#3A3D44') }));
    mat.position.set((bb.min.x + bb.max.x) / 2, (lift / 2) * S, (bb.min.z + bb.max.z) / 2);
    mat.castShadow = true; mat.receiveShadow = true;
    g.add(mat, tickets);
    return o.card
      ? { group: g, view: { az: 0.14, el: 0.9 }, aim: 0.2, zoom: 1.3, blob: 0.35 }
      : { group: g, view: { az: 0.12, el: 0.92 }, aim: 0.2, zoom: 1.36, blob: 0.35 };
  };
}
