'use client';
// Patch 3D: mảnh vải denim (áo khoác) có 1 patch may/ủi lên, 1 patch nằm lật bên cạnh khoe đế (keo ủi / gai velcro / may).
// Khối patch đùn từ ĐÚNG đường cắt (mm). Thêu: bump vân chỉ satin (chữ, viền) + fill (mảng lớn) + nền twill; viền vắt sổ =
// ống cuộn xoắn chạy theo viền. In chuyển nhiệt: mặt vải mịn. PVC: cao su bóng, lớp nổi theo mask.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { PtBacking, PtBorder, PtKind } from './patch-engine';

export interface Patch3DOpts {
  tex: SVGSVGElement | null; satin: SVGSVGElement | null; fill: SVGSVGElement | null; elem: SVGSVGElement | null;
  d: string; w: number; h: number; kind: PtKind; border: PtBorder; borderColor: string; bg: string;
  backing: PtBacking; twill: boolean; fontCss: string;
}

const NS = 'http://www.w3.org/2000/svg';
function shapesOf(d: string): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}
let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

async function maskCanvas(el: SVGSVGElement, fontCss: string, W: number, H: number): Promise<HTMLCanvasElement> {
  return svgToCanvas(await selfContainedSvg(el, fontCss), W, H, '#000');
}
/** mask trắng/đen → canvas alpha (để dùng destination-in) */
function toAlpha(m: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = m.width; c.height = m.height;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(m, 0, 0);
  const im = x.getImageData(0, 0, c.width, c.height), p = im.data;
  for (let i = 0; i < p.length; i += 4) { const v = p[i]; p[i] = p[i + 1] = p[i + 2] = 255; p[i + 3] = v; }
  x.putImageData(im, 0, 0);
  return c;
}
/** lớp đường kẻ song song (vân chỉ) cắt theo mask */
function linesLayer(W: number, H: number, ppm: number, angDeg: number, gapMm: number, light: string, dark: string, alphaMask: HTMLCanvasElement): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.save();
  x.translate(W / 2, H / 2); x.rotate((angDeg * Math.PI) / 180);
  const D = Math.hypot(W, H), g = Math.max(2, gapMm * ppm);
  for (let y = -D / 2; y < D / 2; y += g) {
    x.fillStyle = dark; x.fillRect(-D / 2, y, D, g * 0.32);
    x.fillStyle = light; x.fillRect(-D / 2, y + g * 0.42, D, g * 0.4);
  }
  x.restore();
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(alphaMask, 0, 0);
  return c;
}
/** dây vắt sổ: sọc xéo xoắn (lặp theo chiều dài ống) */
function ropeCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#E8E8E8'; x.fillRect(0, 0, 64, 64);
  for (let i = -64; i < 128; i += 16) {
    x.fillStyle = '#FFFFFF'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 10, 0); x.lineTo(i + 10 + 32, 64); x.lineTo(i + 32, 64); x.fill();
    x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 2; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 32, 64); x.stroke();
  }
  return c;
}
function denimCanvas(): HTMLCanvasElement {
  seed = 13;
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#3F5A86'; x.fillRect(0, 0, n, n);
  for (let i = -n; i < n * 2; i += 3) { x.strokeStyle = `rgba(${200 + rnd() * 40},${210 + rnd() * 30},235,${0.1 + rnd() * 0.14})`; x.lineWidth = 1.2; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + n, n); x.stroke(); }
  for (let i = 0; i < 2400; i++) { x.fillStyle = `rgba(20,30,60,${rnd() * 0.25})`; x.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 3, 1); }
  for (let i = 0; i < 40; i++) { x.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`; x.fillRect(0, rnd() * n, n, 1 + rnd() * 3); } // vệt bạc màu
  return c;
}
function noiseCanvas(n: number, k: number, s0 = 9): HTMLCanvasElement {
  seed = s0;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const im = x.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 128 + (rnd() - 0.5) * 255 * k; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  x.putImageData(im, 0, 0);
  return c;
}
/** gai velcro: móc nhỏ dày đặc */
function hookCanvas(): HTMLCanvasElement {
  seed = 31;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#202020'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 1800; i++) {
    const px = rnd() * n, py = rnd() * n, v = 120 + rnd() * 120;
    x.strokeStyle = `rgb(${v},${v},${v})`; x.lineWidth = 1.4;
    x.beginPath(); x.arc(px, py, 1.6 + rnd() * 1.4, rnd() * 6, rnd() * 6 + 3.6); x.stroke();
  }
  return c;
}

export function patchBuilder(o: Patch3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex || !o.satin || !o.fill || !o.elem) throw new Error('Chưa dựng xong patch');
    const W = o.w, H = o.h;
    const px = Math.min(2048, Math.max(1024, Math.round(Math.max(W, H) * 22)));
    const pxH = Math.round((px * H) / W);
    const ppm = px / W;
    const emb = o.kind === 'emb', pvc = o.kind === 'pvc';
    const merrow = o.border === 'merrow' && !pvc;

    const tex = await svgTex(o.tex, o.fontCss, px, aniso, '');
    tex.flipY = false; tex.repeat.set(1 / W, 1 / H); tex.needsUpdate = true;

    // ---------- bump: vân chỉ / lớp nổi ----------
    const [mSat, mFill, mElem] = await Promise.all([o.satin, o.fill, o.elem].map((el) => maskCanvas(el!, o.fontCss, px, pxH)));
    const bumpC = document.createElement('canvas'); bumpC.width = px; bumpC.height = pxH;
    const bx = bumpC.getContext('2d')!;
    bx.fillStyle = '#5A5A5A'; bx.fillRect(0, 0, px, pxH);
    if (emb) {
      if (o.twill) {
        // nền twill: kẻ chéo mịn
        const all = document.createElement('canvas'); all.width = px; all.height = pxH;
        const ax = all.getContext('2d')!; ax.fillStyle = '#fff'; ax.fillRect(0, 0, px, pxH);
        bx.drawImage(linesLayer(px, pxH, ppm, -45, 0.55, '#6E6E6E', '#4C4C4C', all), 0, 0);
      }
      // nâng phần thêu (mép mềm)
      bx.save(); bx.filter = `blur(${Math.max(1, ppm * 0.35)}px)`; bx.globalCompositeOperation = 'lighter';
      bx.globalAlpha = 0.32; bx.drawImage(mElem, 0, 0); bx.restore();
      bx.drawImage(linesLayer(px, pxH, ppm, 45, 0.5, '#B8B8B8', '#6C6C6C', toAlpha(mFill)), 0, 0);
      bx.drawImage(linesLayer(px, pxH, ppm, -62, 0.32, '#D2D2D2', '#7A7A7A', toAlpha(mSat)), 0, 0);
    } else if (pvc) {
      bx.save(); bx.filter = `blur(${Math.max(1.5, ppm * 0.6)}px)`; bx.globalCompositeOperation = 'lighter';
      bx.globalAlpha = 0.75; bx.drawImage(mElem, 0, 0); bx.restore();
    } else {
      const n = noiseCanvas(256, 0.35);
      bx.globalAlpha = 0.5; for (let yy = 0; yy < pxH; yy += 256) for (let xx = 0; xx < px; xx += 256) bx.drawImage(n, xx, yy); bx.globalAlpha = 1;
    }
    const bump = new THREE.CanvasTexture(bumpC);
    bump.flipY = false; bump.repeat.set(1 / W, 1 / H); bump.needsUpdate = true; bump.anisotropy = aniso;

    // ---------- vật liệu ----------
    const T = emb ? 1.7 : pvc ? 2.8 : 1.2;
    const BEV = pvc ? 0.7 : 0.25;
    let top: THREE.Material;
    if (emb) top = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: bump, bumpScale: 2.4, roughness: 0.72, sheen: 0.55, sheenRoughness: 0.45, sheenColor: new THREE.Color('#FFFFFF') });
    else if (pvc) top = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: bump, bumpScale: 6, roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.3 });
    else top = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: bump, bumpScale: 0.5, roughness: 0.62, sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#FFFFFF') });
    const sideCol = merrow ? o.borderColor : pvc ? o.borderColor : o.border === 'hotcut' && emb ? o.borderColor : o.bg;
    const side = new THREE.MeshStandardMaterial({ color: sideCol, roughness: pvc ? 0.4 : 0.85 });

    // đế
    let backMat: THREE.Material;
    if (o.backing === 'velcro') {
      const h = canvasTex(hookCanvas(), aniso); h.wrapS = h.wrapT = THREE.RepeatWrapping; h.repeat.set(1 / 22, 1 / 22);
      const hb = new THREE.CanvasTexture(hookCanvas()); hb.wrapS = hb.wrapT = THREE.RepeatWrapping; hb.repeat.set(1 / 22, 1 / 22);
      backMat = new THREE.MeshStandardMaterial({ map: h, bumpMap: hb, bumpScale: 3, roughness: 0.92, side: THREE.BackSide });
    } else if (o.backing === 'iron') {
      const n = new THREE.CanvasTexture(noiseCanvas(256, 0.6, 21)); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(1 / 18, 1 / 18);
      backMat = new THREE.MeshPhysicalMaterial({ color: '#E9DFC8', roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.25, bumpMap: n, bumpScale: 0.6, side: THREE.BackSide });
    } else {
      const n = new THREE.CanvasTexture(noiseCanvas(256, 0.8, 23)); n.wrapS = n.wrapT = THREE.RepeatWrapping; n.repeat.set(1 / 14, 1 / 14);
      backMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(o.bg).lerp(new THREE.Color('#FFFFFF'), 0.25), roughness: 0.95, bumpMap: n, bumpScale: 1.4, side: THREE.BackSide });
    }

    const shapes = shapesOf(o.d);
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: T - BEV * 2, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: pvc ? 4 : 2, curveSegments: 64 });
    const flat = new THREE.ShapeGeometry(shapes, 64);

    // ống vắt sổ dọc viền
    let ropeGeo: THREE.TubeGeometry | null = null, ropeMat: THREE.Material | null = null;
    if (merrow && shapes[0]) {
      const pts2 = shapes[0].getSpacedPoints(220);
      pts2.pop();
      const pts = pts2.map((p) => new THREE.Vector3(p.x, p.y, T / 2));
      const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
      const perim = curve.getLength();
      const r = Math.max(1.9, T / 2 + 0.55);
      ropeGeo = new THREE.TubeGeometry(curve, 440, r, 12, true);
      const rt = canvasTex(ropeCanvas(), aniso); rt.wrapS = rt.wrapT = THREE.RepeatWrapping; rt.repeat.set(perim / 1.1, 1);
      const rb = new THREE.CanvasTexture(ropeCanvas()); rb.wrapS = rb.wrapT = THREE.RepeatWrapping; rb.repeat.set(perim / 1.1, 1);
      ropeMat = new THREE.MeshPhysicalMaterial({ color: o.borderColor, map: rt, bumpMap: rb, bumpScale: 3, roughness: 0.6, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new THREE.Color('#FFFFFF') });
    }

    /** 1 patch nằm phẳng, gốc = tâm đáy; flip = úp xuống (lộ đế) */
    const patch = (flip = false): THREE.Group => {
      const inner = new THREE.Group(); inner.scale.set(S, -S, S);
      const off = new THREE.Group(); off.position.set(-W / 2, -H / 2, 0); inner.add(off);
      const body = new THREE.Mesh(geo, [top, side]); body.position.z = BEV; body.castShadow = true; body.receiveShadow = true; off.add(body);
      const bk = new THREE.Mesh(flat, backMat); bk.position.z = -0.03; off.add(bk);
      if (ropeGeo && ropeMat) { const rope = new THREE.Mesh(ropeGeo, ropeMat); rope.castShadow = true; off.add(rope); }
      const fg = new THREE.Group(); fg.add(inner);
      if (flip) { fg.rotation.y = Math.PI; fg.position.z = T * S; }
      const lay = new THREE.Group(); lay.add(fg); lay.rotation.x = -Math.PI / 2;
      const out = new THREE.Group(); out.add(lay);
      return out;
    };

    const g = new THREE.Group();
    // ---------- mảnh denim (không tính vào khung nhìn) ----------
    const FW = Math.max(220, W * 2.6), FD = Math.max(160, H * 2.1), FT = 1.6;
    const dTex = canvasTex(denimCanvas(), aniso); dTex.wrapS = dTex.wrapT = THREE.RepeatWrapping; dTex.repeat.set(FW / 60, FD / 60);
    const dBump = new THREE.CanvasTexture(noiseCanvas(256, 0.5, 41)); dBump.wrapS = dBump.wrapT = THREE.RepeatWrapping; dBump.repeat.set(FW / 18, FD / 18);
    const denim = new THREE.MeshStandardMaterial({ map: dTex, bumpMap: dBump, bumpScale: 1.2, roughness: 0.95 });
    const fabric = new THREE.Mesh(new RoundedBoxGeometry(FW * S, FT * S, FD * S, 2, 0.8 * S), denim);
    const fx = -W * 0.45;
    fabric.position.set(fx * S, (FT / 2) * S, 0); fabric.receiveShadow = true;
    fabric.geometry.boundingBox = new THREE.Box3(); fabric.frustumCulled = false;
    g.add(fabric);
    // đường may đôi màu cam chạy dọc mép vải
    const stitchMat = new THREE.MeshStandardMaterial({ color: '#D9892E', roughness: 0.7 });
    const sGeo = new THREE.BoxGeometry(3.2 * S, 0.5 * S, 0.7 * S);
    sGeo.boundingBox = new THREE.Box3();
    for (const zz of [FD / 2 - 9, FD / 2 - 13]) {
      for (let xx = -FW / 2 + 4; xx < FW / 2 - 4; xx += 5) {
        const m = new THREE.Mesh(sGeo, stitchMat); m.position.set((fx + xx) * S, (FT + 0.15) * S, zz * S); m.frustumCulled = false; g.add(m);
      }
    }
    // patch A trên áo (hơi phồng nhẹ: nâng giữa không cần — vân bump đã đủ)
    const A = patch(false); A.position.set((fx - W * 0.08) * S, FT * S, -H * 0.06 * S); A.rotation.y = 0.06; g.add(A);
    // patch B lật đế, nằm cạnh trên mảnh vải
    const B = patch(true); B.position.set((fx + W * 1.1) * S, FT * S, H * 0.3 * S); B.rotation.y = -0.42; g.add(B);

    return { group: g, view: { az: 0.24, el: 0.78 }, aim: 0.2, zoom: 1.18, blob: 0.25 };
  };
}
