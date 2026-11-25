'use client';
// Voucher / thẻ tích điểm / coupon 3D (three.js, lõi mockup3d):
//  • Phiếu quà tặng: rút ra 1 nửa khỏi phong bì cùng tông (nắp mở nằm phẳng, khấc ngón tay), 1 phiếu lật mặt sau nằm dưới.
//  • Thẻ tích điểm: 3 thẻ nhựa PVC xoè quạt (bo góc, bóng clearcoat) + 1 thẻ lật mặt sau (ô đóng dấu).
//  • Coupon: chồng phiếu giấy + 1 tấm lật mặt sau.
// Ép kim: bản đồ kim loại dựng từ "khuôn ép kim" của chính thiết kế → vàng loáng khi xoay.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { VCKind } from './voucher-engine';

export interface VC3DOpts {
  kind: VCKind; wMm: number; hMm: number; radiusMm: number;
  front: SVGSVGElement | null; back: SVGSVGElement | null;
  frontFoil: SVGSVGElement | null; backFoil: SVGSVGElement | null;
  pal: { bg: string; bg2: string; gold: string; onBg: string };
  brand: string; tagline: string; font: { family: string; weight: number }; foil: boolean; fontCss: string;
}

async function raster(el: SVGSVGElement, css: string, w: number) {
  const vb = el.viewBox.baseVal;
  return svgToCanvas(await selfContainedSvg(el, css), w, Math.max(4, Math.round((w * vb.height) / vb.width)), '#FFFFFF');
}

// bản đồ vật liệu (three.js): R = clearcoat, G = độ nhám, B = kim loại. foil (trắng) → kim loại bóng
function matMapFrom(foil: HTMLCanvasElement | null, w: number, h: number, base: { cc: number; rough: number }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  let f: Uint8ClampedArray | null = null;
  if (foil) { const fc = document.createElement('canvas'); fc.width = w; fc.height = h; const fx = fc.getContext('2d')!; fx.drawImage(foil, 0, 0, w, h); f = fx.getImageData(0, 0, w, h).data; }
  for (let i = 0; i < d.length; i += 4) {
    const k = f ? f[i] / 255 : 0;
    d[i] = Math.round(255 * (base.cc * (1 - k) + 0.15 * k));
    d[i + 1] = Math.round(255 * (base.rough * (1 - k) + 0.34 * k));
    d[i + 2] = Math.round(255 * k);
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}

function rrShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  r = Math.max(0.05, Math.min(r, w / 2, h / 2));
  s.moveTo(r, 0); s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
  return s;
}
// UV theo toạ độ hình (0..w, 0..h); mirror = mặt sau (nhìn từ phía dưới)
function planarUV(geo: THREE.BufferGeometry, w: number, h: number, mirror = false) {
  const p = geo.getAttribute('position'); const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w; uv[i * 2] = mirror ? 1 - u : u; uv[i * 2 + 1] = p.getY(i) / h; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

/** tấm phẳng có độ dày (mm): mặt trước lên trên. flipped = lật úp (thấy mặt sau, đọc xuôi). Gốc = tâm, đáy chạm y=0 */
function slab(shape: THREE.Shape, w: number, h: number, t: number, front: THREE.Material, back: THREE.Material, edge: THREE.Material, flipped = false) {
  const inner = new THREE.Group();
  const fg = planarUV(new THREE.ShapeGeometry(shape, 12), w, h);
  const bgeo = planarUV(new THREE.ShapeGeometry(shape, 12), w, h, true);
  const top = new THREE.Mesh(fg, front); top.position.z = t;
  const bottom = new THREE.Mesh(bgeo, back);
  const side = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 12 }), [new THREE.MeshBasicMaterial({ visible: false }), edge]);
  for (const m of [top, bottom, side]) { m.castShadow = true; m.receiveShadow = true; }
  inner.add(top, bottom, side);
  inner.position.set(-w / 2, -h / 2, 0);
  const tilt = new THREE.Group(); tilt.add(inner);
  tilt.rotation.x = flipped ? Math.PI / 2 : -Math.PI / 2;
  if (flipped) tilt.position.y = t;
  const outer = new THREE.Group(); outer.add(tilt);
  if (flipped) outer.rotation.y = Math.PI; // úp xuống rồi xoay 180° → mặt sau đọc xuôi
  outer.scale.setScalar(S);
  const wrap = new THREE.Group(); wrap.add(outer);
  return wrap;
}

function noiseCanvas(w: number, h: number, base: string, amt = 0.06) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < (w * h) / 60; i++) {
    x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${amt * rnd()})` : `rgba(0,0,0,${amt * rnd()})`;
    x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  return c;
}

// mặt phong bì: nền màu thương hiệu + khung chỉ vàng + tên thương hiệu (mask = khuôn ép kim)
function envelopeFace(o: VC3DOpts, ew: number, eh: number, notchR: number, mask: boolean) {
  const k = 8; const W = Math.round(ew * k), H = Math.round(eh * k);
  const c = mask ? (() => { const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const x = cc.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); return cc; })() : noiseCanvas(W, H, o.pal.bg, 0.05);
  const x = c.getContext('2d')!;
  const gold = mask ? '#FFFFFF' : o.pal.gold;
  const ins = 7 * k;
  x.strokeStyle = gold; x.lineWidth = 0.55 * k;
  x.strokeRect(ins, ins, W - 2 * ins, H - 2 * ins);
  x.lineWidth = 0.2 * k; x.strokeRect(ins + 1.4 * k, ins + 1.4 * k, W - 2 * ins - 2.8 * k, H - 2 * ins - 2.8 * k);
  // chừa khấc ngón tay ở mép trên (ảnh: trên = mép mở)
  if (!mask) { x.fillStyle = o.pal.bg; x.beginPath(); x.arc(W / 2, 0, (notchR + 2.5) * k, 0, Math.PI); x.fill(); }
  else { x.fillStyle = '#000'; x.beginPath(); x.arc(W / 2, 0, (notchR + 2.5) * k, 0, Math.PI); x.fill(); }
  let fs = 13 * k;
  x.font = `${o.font.weight} ${fs}px "${o.font.family}"`;
  const tw = x.measureText(o.brand).width;
  if (tw > W * 0.62) { fs *= (W * 0.62) / tw; x.font = `${o.font.weight} ${fs}px "${o.font.family}"`; }
  x.fillStyle = gold; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  x.fillText(o.brand, W / 2, H * 0.56);
  x.fillRect(W / 2 - 9 * k, H * 0.56 + 5 * k, 18 * k, 0.5 * k);
  if (!mask && o.tagline) {
    x.font = `600 ${3.4 * k}px "Be Vietnam Pro"`; x.fillStyle = o.pal.onBg; x.globalAlpha = 0.8;
    x.fillText(o.tagline, W / 2, H * 0.56 + 12 * k); x.globalAlpha = 1;
  }
  return c;
}

export function voucherBuilder(o: VC3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong thẻ');
    const { wMm: w, hMm: h } = o;
    const px = Math.min(2048, Math.round(Math.max(w, h) * (o.kind === 'loyalty' ? 18 : 10)));
    const [fc, bc, ffc, bfc] = await Promise.all([
      raster(o.front, o.fontCss, px), raster(o.back, o.fontCss, px),
      o.foil && o.frontFoil ? raster(o.frontFoil, o.fontCss, px) : null,
      o.foil && o.backFoil ? raster(o.backFoil, o.fontCss, px) : null,
    ]);
    const pvc = o.kind === 'loyalty';
    const base = pvc ? { cc: 1, rough: 0.34 } : { cc: 0.18, rough: 0.6 };
    const face = (c: HTMLCanvasElement, foil: HTMLCanvasElement | null) => {
      const map = canvasTex(c, aniso);
      if (!foil) return new THREE.MeshPhysicalMaterial({ map, roughness: base.rough, clearcoat: base.cc, clearcoatRoughness: pvc ? 0.06 : 0.45 });
      const mm = matMapFrom(foil, c.width, c.height, base);
      return new THREE.MeshPhysicalMaterial({ map, roughness: 1, roughnessMap: mm, metalness: 1, metalnessMap: mm, clearcoat: 1, clearcoatMap: mm, clearcoatRoughness: pvc ? 0.06 : 0.4, envMapIntensity: 2 });
    };
    const fMat = face(fc, ffc), bMat = face(bc, bfc);
    bMat.side = THREE.BackSide;
    const edge = new THREE.MeshStandardMaterial({ color: pvc ? '#EEEEEA' : '#F3F1EA', roughness: pvc ? 0.4 : 0.9 });
    const shape = rrShape(w, h, o.radiusMm || 0.4);
    const g = new THREE.Group();
    let seed = 13; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };

    if (o.kind === 'loyalty') {
      const t = 0.76;
      // quạt 3 thẻ xoay quanh góc trước-trái
      const angles = [0.02, 0.3, 0.58];
      angles.forEach((a, i) => {
        const pivot = new THREE.Group();
        pivot.position.set(-w * 0.45 * S, 0, h * 0.2 * S);
        pivot.rotation.y = a;
        const card = slab(shape, w, h, t, fMat, bMat, edge);
        card.position.set((w / 2) * S, i * (t + 0.05) * S, (-h / 2) * S);
        pivot.add(card);
        g.add(pivot);
      });
      const back = slab(shape, w, h, t, fMat, bMat, edge, true);
      back.position.set(w * 0.78 * S, 0, h * 0.42 * S);
      back.rotation.y = -0.14;
      g.add(back);
      return { group: g, view: { az: 0.12, el: 0.86 }, aim: 0.2, zoom: 1.32, blob: 0 };
    }

    if (o.kind === 'coupon') {
      const t = 0.34;
      for (let i = 0; i < 8; i++) {
        const c = slab(shape, w, h, t, fMat, bMat, edge);
        c.position.set(-w * 0.52 * S + rnd() * 0.8 * S, i * t * S, rnd() * 0.8 * S);
        c.rotation.y = 0.06 + rnd() * 0.02;
        g.add(c);
      }
      const loose = slab(shape, w, h, t, fMat, bMat, edge, true);
      loose.position.set(w * 0.55 * S, 0, h * 0.14 * S);
      loose.rotation.y = -0.15;
      g.add(loose);
      return { group: g, view: { az: 0.18, el: 0.76 }, aim: 0.3, zoom: 1.45, blob: 0 };
    }

    // ---- phiếu quà tặng: phong bì + phiếu rút ra ----
    const t = 0.36;
    const ew = w + 10, eh = h + 11, notchR = 11, lift = 0.45;
    const envFace = envelopeFace(o, ew, eh, notchR, false);
    const envMask = o.foil ? envelopeFace(o, ew, eh, notchR, true) : null;
    const envMap = canvasTex(envFace, aniso);
    const envMat = envMask
      ? (() => { const mm = matMapFrom(envMask, envFace.width, envFace.height, { cc: 0.1, rough: 0.72 }); return new THREE.MeshPhysicalMaterial({ map: envMap, roughness: 1, roughnessMap: mm, metalness: 1, metalnessMap: mm, clearcoat: 1, clearcoatMap: mm, clearcoatRoughness: 0.35, envMapIntensity: 2.1 }); })()
      : new THREE.MeshPhysicalMaterial({ map: envMap, roughness: 0.72, clearcoat: 0.1 });
    const plain = new THREE.MeshStandardMaterial({ map: canvasTex(noiseCanvas(256, 256, o.pal.bg, 0.05), aniso), roughness: 0.75 });
    const plainDark = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.pal.bg).multiplyScalar(0.82), roughness: 0.8 });
    const env = new THREE.Group();
    // mặt sau phong bì (dưới cùng)
    const backPanel = new THREE.Mesh(new THREE.BoxGeometry(ew * S, 0.3 * S, eh * S), plain);
    backPanel.position.y = 0.15 * S; backPanel.castShadow = true; backPanel.receiveShadow = true;
    env.add(backPanel);
    // nắp mở nằm phẳng phía sau mép mở
    const fh = eh * 0.56;
    const flap = new THREE.Shape();
    flap.moveTo(0, 0); flap.lineTo(ew, 0); flap.lineTo(ew * 0.66, fh * 0.9); flap.quadraticCurveTo(ew / 2, fh * 1.08, ew * 0.34, fh * 0.9); flap.lineTo(0, 0);
    const flapMat = new THREE.MeshStandardMaterial({ map: plain.map, color: '#E6E2DC', roughness: 0.75 });
    const flapG = new THREE.Mesh(new THREE.ExtrudeGeometry(flap, { depth: 0.3, bevelEnabled: false }), flapMat);
    flapG.rotation.x = -Math.PI / 2; flapG.scale.setScalar(S);
    flapG.position.set((-ew / 2) * S, 0, (-eh / 2) * S);
    flapG.castShadow = true; flapG.receiveShadow = true;
    env.add(flapG);
    // phiếu nằm giữa 2 lớp, rút ra ~45% qua mép mở
    const out = h * 0.46;
    const vz = -eh / 2 - out + h / 2;
    const v = slab(shape, w, h, t, fMat, bMat, edge);
    v.position.set(6 * S, 0.34 * S, vz * S);
    v.rotation.y = 0.07;
    env.add(v);
    // mặt trước phong bì có khấc ngón tay
    const fs = new THREE.Shape();
    fs.moveTo(0, 0); fs.lineTo(ew, 0); fs.lineTo(ew, eh); fs.lineTo(ew / 2 + notchR, eh);
    fs.absarc(ew / 2, eh, notchR, 0, Math.PI, true);
    fs.lineTo(0, eh); fs.lineTo(0, 0);
    const front = slab(fs, ew, eh, 0.26, envMat, plain, plainDark);
    front.position.y = (0.34 + t + 0.04) * S;
    env.add(front);
    // mép hông dán (che khe giữa 2 lớp)
    const sideH = (0.34 + t + 0.3) * S;
    for (const sx of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5 * S, sideH, eh * S), plainDark);
      m.position.set(sx * (ew / 2 - 0.25) * S, sideH / 2, 0); env.add(m);
    }
    const bot = new THREE.Mesh(new THREE.BoxGeometry(ew * S, sideH, 0.5 * S), plainDark);
    bot.position.set(0, sideH / 2, (eh / 2 - 0.25) * S); env.add(bot);
    env.position.y = lift * S;
    g.add(env);
    // 1 phiếu lật mặt sau nằm dưới, ló ra góc trước-trái
    const loose = slab(shape, w, h, t, fMat, bMat, edge, true);
    loose.position.set(-w * 0.66 * S, 0, h * 0.1 * S);
    loose.rotation.y = 0.14;
    g.add(loose);
    return { group: g, view: { az: 0.26, el: 0.66 }, aim: 0.2, zoom: 1.5, blob: 0 };
  };
}
