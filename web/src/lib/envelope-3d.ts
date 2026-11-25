'use client';
// Lì xì / phong bì 3D: thân giấy hơi phồng (có tiền/thư bên trong), mép giấy dày thật, NẮP là tấm riêng gập theo
// bản lề (hé nhẹ → thấy lòng giấy + mép tai đáy). Lì xì ép kim: phần vàng là kim loại thật (bản đồ metal/roughness
// dựng từ "khuôn ép kim" của chính thiết kế). Phong bì cửa sổ: ô cửa bóng như màng kính. Texture = SVG thiết kế.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { envEdgeColor, envGeom, envHasFoil, envInsideColor, topFlapSegs, windowRectMm, type EnvGeom, type EnvSpec } from './envelope-engine';

export interface EnvEls {
  front: SVGSVGElement | null; frontFoil: SVGSVGElement | null;
  backBody: SVGSVGElement | null; backBodyFoil: SVGSVGElement | null;
  backArt: SVGSVGElement | null; backArtFoil: SVGSVGElement | null;
}

const prof = (u: number) => 1 - Math.pow(Math.abs(2 * u - 1), 6);
const puff = (u: number, v: number) => prof(u) * prof(v);

async function raster(el: SVGSVGElement, css: string, w: number, h: number, bg: string) {
  return svgToCanvas(await selfContainedSvg(el, css), w, h, bg);
}

// bản đồ vật liệu: R = clearcoat, G = độ nhám, B = kim loại (chuẩn three.js)
async function matMap(foil: SVGSVGElement | null, css: string, w: number, h: number, base: number, win: { x: number; y: number; w: number; h: number } | null) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  let f: Uint8ClampedArray | null = null;
  if (foil) f = (await raster(foil, css, w, h, '#000000')).getContext('2d')!.getImageData(0, 0, w, h).data;
  const img = ctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = f ? f[i] / 255 : 0;
    d[i] = base; d[i + 1] = Math.round(255 * (1 - 0.3 * k)); d[i + 2] = Math.round(255 * k); d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  if (win) { ctx.fillStyle = 'rgb(255,30,0)'; ctx.fillRect(win.x * w, win.y * h, win.w * w, win.h * h); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// thân phong bì: mặt trên (trước) + mặt dưới (sau) phồng nhẹ + dải mép dày giấy. Nhóm vật liệu: 0 trước, 1 sau, 2 mép
function pillow(w: number, h: number, t: number, bulge: number, nx: number, ny: number): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const geo = new THREE.BufferGeometry();
  const grid = (sign: 1 | -1) => {
    const base = pos.length / 3;
    for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
      const u = i / nx, v = j / ny;
      pos.push((u - 0.5) * w, sign * (t / 2 + bulge * puff(u, v)), (v - 0.5) * h);
      uv.push(sign > 0 ? u : 1 - u, 1 - v);
    }
    const start = idx.length;
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const a = base + j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      if (sign > 0) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    return [start, idx.length - start] as const;
  };
  const top = grid(1), bot = grid(-1);
  // mép
  const ring: [number, number][] = [];
  for (let i = 0; i <= nx; i++) ring.push([i / nx, 0]);
  for (let j = 1; j <= ny; j++) ring.push([1, j / ny]);
  for (let i = nx - 1; i >= 0; i--) ring.push([i / nx, 1]);
  for (let j = ny - 1; j >= 1; j--) ring.push([0, j / ny]);
  const base = pos.length / 3;
  for (const [u, v] of ring) {
    pos.push((u - 0.5) * w, t / 2, (v - 0.5) * h); uv.push(0, 0);
    pos.push((u - 0.5) * w, -t / 2, (v - 0.5) * h); uv.push(0, 1);
  }
  const sStart = idx.length, n = ring.length;
  for (let k = 0; k < n; k++) {
    const a = base + k * 2, b = base + ((k + 1) % n) * 2;
    idx.push(a, a + 1, b, b, a + 1, b + 1);
  }
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.addGroup(top[0], top[1], 0);
  geo.addGroup(bot[0], bot[1], 1);
  geo.addGroup(sStart, idx.length - sStart, 2);
  geo.computeVertexNormals();
  return geo;
}

// nắp: lưới theo (x, độ sâu nắp tại x) → bám đúng độ phồng thân, uv = toạ độ mặt sau
function flapGeometry(g: EnvGeom, t: number, bulge: number): THREE.BufferGeometry {
  const path = new THREE.Path();
  for (const s of topFlapSegs(g)) {
    if (s[0] === 'M') path.moveTo(s[1], s[2]);
    else if (s[0] === 'L') path.lineTo(s[1], s[2]);
    else if (s[0] === 'Q') path.quadraticCurveTo(s[1], s[2], s[3], s[4]);
    else if (s[0] === 'C') path.bezierCurveTo(s[1], s[2], s[3], s[4], s[5], s[6]);
  }
  const pts = path.getPoints(80).sort((a, b) => a.x - b.x);
  const depth = (x: number) => {
    for (let i = 1; i < pts.length; i++) if (pts[i].x >= x) {
      const a = pts[i - 1], b = pts[i]; const k = b.x - a.x < 1e-6 ? 0 : (x - a.x) / (b.x - a.x);
      return a.y + (b.y - a.y) * k;
    }
    return 0;
  };
  const nx = 72, ns = 16, W = g.w, H = g.h;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= ns; j++) for (let i = 0; i <= nx; i++) {
    const xb = (i / nx) * W, yb = (j / ns) * Math.max(0, depth(xb));
    const u = 1 - xb / W, v = yb / H;
    pos.push((W / 2 - xb) * S, -(bulge * puff(u, v) + 0.06) * S, yb * S);
    uv.push(xb / W, 1 - yb / H);
  }
  for (let j = 0; j < ns; j++) for (let i = 0; i < nx; i++) {
    const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
    idx.push(a, b, c, b, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

export function envelopeBuilder(o: { spec: EnvSpec; els: EnvEls; fontCss: string }): Builder {
  return async (aniso) => {
    const { els, spec, fontCss: css } = o;
    if (!els.front || !els.backBody || !els.backArt) throw new Error('Chưa dựng xong phong bì');
    const g = envGeom(spec);
    const lixi = g.kind === 'lixi';
    const foil = envHasFoil(spec);
    const outW = lixi ? 1100 : 2000, outH = Math.round((outW * g.h) / g.w);
    const win = spec.window && !lixi ? windowRectMm(g) : null;
    const winUv = win ? { x: win.x / g.w, y: win.y / g.h, w: win.w / g.w, h: win.h / g.h } : null;
    const base = lixi ? 90 : 14;
    const tex = async (el: SVGSVGElement) => canvasTex(await raster(el, css, outW, outH, '#FFFFFF'), aniso);
    const [fT, bT, aT, fM, bM, aM] = await Promise.all([
      tex(els.front), tex(els.backBody), tex(els.backArt),
      foil || win ? matMap(foil ? els.frontFoil : null, css, outW, outH, base, winUv) : null,
      foil ? matMap(els.backBodyFoil, css, outW, outH, base, null) : null,
      foil ? matMap(els.backArtFoil, css, outW, outH, base, null) : null,
    ]);
    const face = (map: THREE.Texture, mm: THREE.Texture | null) => new THREE.MeshPhysicalMaterial({
      map, color: lixi ? '#FFFFFF' : '#D4D4D4', // phong bì nằm phẳng hứng đèn thẳng → hạ sáng cho khỏi cháy trắng
      roughness: lixi ? 0.42 : 0.72, metalness: mm ? 1 : 0, metalnessMap: mm, roughnessMap: mm,
      clearcoat: mm ? 1 : lixi ? 0.3 : 0.04, clearcoatMap: mm, clearcoatRoughness: 0.28,
      envMapIntensity: foil ? 1.7 : 1,
    });
    const fMat = face(fT, fM), bMat = face(bT, bM), aMat = face(aT, aM);
    const edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(envEdgeColor(spec)).multiplyScalar(lixi ? 1 : 0.8), roughness: 0.85, side: THREE.DoubleSide });
    const inner = new THREE.MeshStandardMaterial({ color: new THREE.Color(envInsideColor(spec)).multiplyScalar(lixi ? 1 : 0.85), roughness: 0.9 });

    const t = (lixi ? 0.45 : 0.6), bulge = (lixi ? 0.55 : 0.9);
    const w = g.w * S, h = g.h * S;
    const bodyGeo = pillow(w, h, t * S, bulge * S, 56, 56);
    const flapGeo = flapGeometry(g, t, bulge);
    // mặt in của nắp quay xuống (ra ngoài) khi phong bì ngửa mặt trước
    const ny = flapGeo.getAttribute('normal').getY(Math.floor(flapGeo.getAttribute('normal').count / 2));
    const outSide = ny < 0 ? THREE.FrontSide : THREE.BackSide;
    aMat.side = outSide;
    inner.side = outSide === THREE.FrontSide ? THREE.BackSide : THREE.FrontSide;

    const envelope = (lift: number) => {
      const e = new THREE.Group();
      const body = new THREE.Mesh(bodyGeo, [fMat, bMat, edge]);
      body.castShadow = true; body.receiveShadow = true;
      const pivot = new THREE.Group();
      pivot.position.set(0, -t / 2 * S, -h / 2);
      pivot.rotation.x = lift;
      const fo = new THREE.Mesh(flapGeo, aMat), fi = new THREE.Mesh(flapGeo, inner);
      fo.castShadow = true; fo.receiveShadow = true;
      pivot.add(fo, fi);
      e.add(body, pivot);
      return e;
    };
    const lie = (e: THREE.Group, x: number, z: number, ry: number, back = false) => {
      const holder = new THREE.Group();
      if (back) e.rotation.z = Math.PI;
      e.position.y = (t / 2 + bulge) * S;
      holder.add(e); holder.position.set(x * S, 0, z * S); holder.rotation.y = ry;
      return holder;
    };

    const grp = new THREE.Group();
    if (lixi) {
      const lean = 0.11;
      const stand = envelope(0);
      stand.rotation.x = Math.PI / 2 - lean;
      stand.position.y = (g.h / 2) * Math.sin(Math.PI / 2 - lean) * S + (t / 2 + bulge) * Math.cos(Math.PI / 2 - lean) * S;
      const sh = new THREE.Group(); sh.add(stand); sh.position.set(-g.w * 0.05 * S, 0, -g.h * 0.42 * S); sh.rotation.y = 0.12;
      grp.add(sh);
      grp.add(lie(envelope(0), -g.w * 0.62, g.h * 0.2, 0.2));
      grp.add(lie(envelope(0.1), g.w * 0.62, g.h * 0.24, -0.16, true));
      return { group: grp, view: { az: 0.08, el: 0.4 }, aim: 0.36, zoom: 1.12, blob: 0 };
    }
    grp.add(lie(envelope(0.09), -g.w * 0.2, -g.h * 0.64, 0.06, true));
    grp.add(lie(envelope(0), g.w * 0.16, g.h * 0.66, -0.05));
    return { group: grp, view: { az: 0.1, el: 0.82 }, aim: 0.2, zoom: 1.1, blob: 0 };
  };
}
