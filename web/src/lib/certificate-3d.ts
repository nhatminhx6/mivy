'use client';
// Giấy khen / chứng nhận 3D (lõi mockup3d):
//  • Khung trưng bày: phào vàng / gỗ óc chó / đen bóng, kính phản chiếu, tấm giấy khen lùi sau kính, chân chống sau lưng.
//  • Bìa giấy khen mở phẳng phía trước: ngoài bọc da, trong lót nhung; nửa trái ép kim tiêu đề, nửa phải kẹp 1 tấm rời.
// Ép kim: bản đồ kim loại dựng từ khuôn ép kim của chính thiết kế → vàng loáng khi xoay.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { Frame3D } from './certificate-engine';

export interface CT3DOpts {
  front: SVGSVGElement | null; foil: SVGSVGElement | null;
  wMm: number; hMm: number; frame: Frame3D;
  pal: { frame: string; frame2: string; gold: string; paper: string };
  title: string; org: string; titleFont: { family: string; weight: number }; fontCss: string;
}

async function raster(el: SVGSVGElement, css: string, w: number) {
  const vb = el.viewBox.baseVal;
  return svgToCanvas(await selfContainedSvg(el, css), w, Math.max(4, Math.round((w * vb.height) / vb.width)), '#FFFFFF');
}

// R = clearcoat, G = độ nhám, B = kim loại. foil (trắng) → kim loại bóng
function matMap(foil: HTMLCanvasElement | null, w: number, h: number, base: { cc: number; rough: number }) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  let f: Uint8ClampedArray | null = null;
  if (foil) { const fc = document.createElement('canvas'); fc.width = w; fc.height = h; const fx = fc.getContext('2d')!; fx.drawImage(foil, 0, 0, w, h); f = fx.getImageData(0, 0, w, h).data; }
  for (let i = 0; i < d.length; i += 4) {
    const k = f ? f[i] / 255 : 0;
    d[i] = Math.round(255 * (base.cc * (1 - k) + 0.2 * k));
    d[i + 1] = Math.round(255 * (base.rough * (1 - k) + 0.3 * k));
    d[i + 2] = Math.round(255 * k);
    d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}

let seed = 11;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
function noise(w: number, h: number, base: string, amt: number, dots = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  for (let i = 0; i < (w * h) / 40 * dots; i++) {
    x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${amt * rnd()})` : `rgba(0,0,0,${amt * rnd()})`;
    x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 1.5, 1 + rnd() * 1.5);
  }
  return c;
}
function woodCanvas(w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = '#4A2C18'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    const y = rnd() * h, a = 0.05 + rnd() * 0.12;
    x.strokeStyle = rnd() > 0.5 ? `rgba(120,76,44,${a})` : `rgba(20,10,4,${a})`;
    x.lineWidth = 1 + rnd() * 3;
    x.beginPath(); x.moveTo(0, y);
    for (let px = 0; px <= w; px += 16) x.lineTo(px, y + Math.sin(px / (60 + rnd() * 40) + i) * 3);
    x.stroke();
  }
  return c;
}
const lighten = (hex: string, t: number) => {
  const c = new THREE.Color(hex); return c.lerp(new THREE.Color('#ffffff'), t);
};

// mặt trong nửa trái bìa: nhung + khung chỉ vàng + tiêu đề ép kim
function folderInside(o: CT3DOpts, pw: number, ph: number, mask: boolean) {
  const k = 5; const W = Math.round(pw * k), H = Math.round(ph * k);
  const c = mask ? (() => { const cc = document.createElement('canvas'); cc.width = W; cc.height = H; const x = cc.getContext('2d')!; x.fillStyle = '#000'; x.fillRect(0, 0, W, H); return cc; })() : noise(W, H, o.pal.frame2, 0.05, 0.6);
  const x = c.getContext('2d')!;
  const gold = mask ? '#FFFFFF' : '#D7B45A';
  x.strokeStyle = gold;
  x.lineWidth = 1.4 * k; x.strokeRect(12 * k, 12 * k, W - 24 * k, H - 24 * k);
  x.lineWidth = 0.5 * k; x.strokeRect(15 * k, 15 * k, W - 30 * k, H - 30 * k);
  x.fillStyle = gold; x.textAlign = 'center'; x.textBaseline = 'alphabetic';
  let fs = Math.min(W, H) * 0.14;
  x.font = `${o.titleFont.weight} ${fs}px "${o.titleFont.family}"`;
  const tw = x.measureText(o.title).width;
  if (tw > W * 0.72) { fs *= (W * 0.72) / tw; x.font = `${o.titleFont.weight} ${fs}px "${o.titleFont.family}"`; }
  x.fillText(o.title, W / 2, H * 0.5);
  // ngôi sao + đường kẻ
  const star = (cx: number, cy: number, R: number) => {
    x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? R * 0.42 : R; x.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    x.closePath(); x.fill();
  };
  star(W / 2, H * 0.28, 9 * k);
  x.fillRect(W / 2 - 30 * k, H * 0.5 + 7 * k, 60 * k, 0.6 * k);
  if (o.org) {
    let os = 5.2 * k;
    x.font = `800 ${os}px "Be Vietnam Pro"`;
    const ow = x.measureText(o.org).width;
    if (ow > W * 0.7) { os *= (W * 0.7) / ow; x.font = `800 ${os}px "Be Vietnam Pro"`; }
    x.fillText(o.org, W / 2, H * 0.5 + 20 * k);
  }
  return c;
}

function bar(len: number, thick: number, depth: number, mat: THREE.Material) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(len * S, thick * S, depth * S, 3, Math.min(3, thick / 3, depth / 3) * S), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function certificateBuilder(o: CT3DOpts): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong giấy khen');
    seed = 11;
    const { wMm: w, hMm: h } = o;
    const px = 2048;
    const [fc, foilC] = await Promise.all([raster(o.front, o.fontCss, px), o.foil ? raster(o.foil, o.fontCss, px) : Promise.resolve(null)]);
    const certMap = canvasTex(fc, aniso);
    const certMat = foilC
      ? (() => { const mm = matMap(foilC, fc.width, fc.height, { cc: 0.15, rough: 0.78 }); return new THREE.MeshPhysicalMaterial({ map: certMap, roughness: 1, roughnessMap: mm, metalness: 1, metalnessMap: mm, clearcoat: 1, clearcoatMap: mm, clearcoatRoughness: 0.35, envMapIntensity: 2 }); })()
      : new THREE.MeshPhysicalMaterial({ map: certMap, roughness: 0.78, clearcoat: 0.12, clearcoatRoughness: 0.5 });
    const paperEdge = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.9 });
    const g = new THREE.Group();

    // ---------------- khung trưng bày ----------------
    const sc = Math.sqrt(w * h / (297 * 210));
    const mw = 26 * Math.sqrt(sc), D = 24, lip = 5;
    const fw = w + 2 * mw, fh = h + 2 * mw;
    let frameMat: THREE.Material, lipMat: THREE.Material;
    if (o.frame === 'gold') {
      frameMat = new THREE.MeshPhysicalMaterial({ color: '#E2BC62', metalness: 1, roughness: 0.2, envMapIntensity: 1.35, bumpMap: canvasTex(noise(256, 256, '#808080', 0.35), aniso), bumpScale: 0.25, clearcoat: 0.5, clearcoatRoughness: 0.15 });
      lipMat = new THREE.MeshPhysicalMaterial({ color: '#E2C774', metalness: 1, roughness: 0.22 });
    } else if (o.frame === 'wood') {
      const wt = canvasTex(woodCanvas(512, 128), aniso); wt.wrapS = wt.wrapT = THREE.RepeatWrapping;
      frameMat = new THREE.MeshPhysicalMaterial({ map: wt, roughness: 0.5, clearcoat: 0.45, clearcoatRoughness: 0.3 });
      lipMat = new THREE.MeshPhysicalMaterial({ color: '#C9A14A', metalness: 1, roughness: 0.28 });
    } else {
      frameMat = new THREE.MeshPhysicalMaterial({ color: '#151515', roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.15 });
      lipMat = new THREE.MeshPhysicalMaterial({ color: '#C9A14A', metalness: 1, roughness: 0.28 });
    }
    const fr = new THREE.Group();
    const top = bar(fw, mw, D, frameMat); top.position.set(0, (h / 2 + mw / 2) * S, 0);
    const bot = bar(fw, mw, D, frameMat); bot.position.set(0, -(h / 2 + mw / 2) * S, 0);
    const lef = bar(mw, h + 2, D, frameMat); lef.position.set(-(w / 2 + mw / 2) * S, 0, 0);
    const rig = bar(mw, h + 2, D, frameMat); rig.position.set((w / 2 + mw / 2) * S, 0, 0);
    fr.add(top, bot, lef, rig);
    // chỉ viền trong (fillet) vàng, thụt sau mặt phào
    const lz = D / 2 - 6;
    const lt = bar(w + 2, lip, 6, lipMat); lt.position.set(0, (h / 2 - lip / 2 + 1) * S, lz * S);
    const lb = bar(w + 2, lip, 6, lipMat); lb.position.set(0, -(h / 2 - lip / 2 + 1) * S, lz * S);
    const ll = bar(lip, h - 2 * lip + 4, 6, lipMat); ll.position.set(-(w / 2 - lip / 2 + 1) * S, 0, lz * S);
    const lr = bar(lip, h - 2 * lip + 4, 6, lipMat); lr.position.set((w / 2 - lip / 2 + 1) * S, 0, lz * S);
    fr.add(lt, lb, ll, lr);
    // giấy khen + nền sau + kính
    const cert = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), certMat);
    cert.position.z = (lz - 3.5) * S; cert.receiveShadow = true;
    fr.add(cert);
    const back = new THREE.Mesh(new THREE.BoxGeometry((w + 4) * S, (h + 4) * S, 4 * S), new THREE.MeshStandardMaterial({ color: '#3B2E22', roughness: 0.9 }));
    back.position.z = (lz - 6) * S; back.castShadow = true;
    fr.add(back);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF', metalness: 0, roughness: 0.03, transparent: true, opacity: 0.1, clearcoat: 1, clearcoatRoughness: 0.02,
      specularIntensity: 1, envMapIntensity: 2.2, depthWrite: false,
    }));
    glass.position.z = (lz - 1.2) * S; glass.renderOrder = 3;
    fr.add(glass);
    // chân chống (thanh gỗ sau lưng)
    const tilt = THREE.MathUtils.degToRad(13);
    const strutLen = fh * 0.62;
    const strut = new THREE.Mesh(new THREE.BoxGeometry(34 * S, strutLen * S, 5 * S), new THREE.MeshStandardMaterial({ color: '#3B2E22', roughness: 0.85 }));
    strut.geometry.translate(0, (-strutLen / 2) * S, 0);
    strut.position.set(0, (fh * 0.12) * S, (lz - 9) * S);
    strut.rotation.x = 0.5; // chân xoè ra SAU lưng khung
    strut.castShadow = true;
    fr.add(strut);
    const stand = new THREE.Group(); stand.add(fr);
    stand.rotation.x = -tilt;
    // đặt đáy chạm đất
    const bbF = new THREE.Box3().setFromObject(stand);
    stand.position.y = -bbF.min.y;
    const framed = new THREE.Group(); framed.add(stand);

    // ---------------- bìa giấy khen mở phẳng ----------------
    const pw = w + 18, ph = h + 18, T = 3.2, gap = 9;
    const leather = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.pal.frame).multiplyScalar(0.85), roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.4, bumpMap: canvasTex(noise(256, 256, '#808080', 0.6, 1.4), aniso), bumpScale: 0.8 });
    const velvetC = new THREE.Color(o.pal.frame2);
    const velvet = new THREE.MeshPhysicalMaterial({ color: velvetC, roughness: 0.92, sheen: 1, sheenRoughness: 0.42, sheenColor: lighten(o.pal.frame2, 0.45) });
    const inC = folderInside(o, pw, ph, false), inM = folderInside(o, pw, ph, true);
    const inMap = canvasTex(inC, aniso);
    const mmL = matMap(inM, inC.width, inC.height, { cc: 0, rough: 0.92 });
    const leftInner = new THREE.MeshPhysicalMaterial({ map: inMap, roughness: 1, roughnessMap: mmL, metalness: 1, metalnessMap: mmL, sheen: 0.8, sheenRoughness: 0.45, sheenColor: lighten(o.pal.frame2, 0.35), envMapIntensity: 1.8 });
    // Box faces: +x, -x, +y(trên), -y, +z, -z
    const panel = (inner: THREE.Material) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(pw * S, T * S, ph * S, 2, 1.2 * S), [leather, leather, inner, leather, leather, leather]);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    // RoundedBoxGeometry gộp nhóm vật liệu theo mặt giống BoxGeometry
    const folder = new THREE.Group();
    const L = panel(leftInner); L.position.set(-(pw / 2 + gap / 2) * S, (T / 2) * S, 0);
    // nửa trái hơi nâng lên quanh gáy cho có chiều sâu
    const hinge = new THREE.Group(); hinge.position.set((-gap / 2) * S, 0, 0); hinge.rotation.z = -0.09;
    L.position.x = -(pw / 2) * S; hinge.add(L);
    const R = panel(velvet); R.position.set((pw / 2 + gap / 2) * S, (T / 2) * S, 0);
    const spine = new THREE.Mesh(new THREE.CylinderGeometry((gap / 2 + 0.6) * S, (gap / 2 + 0.6) * S, ph * S, 16, 1, false, Math.PI, Math.PI), leather);
    spine.rotation.x = Math.PI / 2; spine.position.set(0, (T * 0.6) * S, 0);
    folder.add(hinge, R, spine);
    // tấm giấy khen rời kẹp trong nửa phải + 4 tai góc nhung
    const loose = new THREE.Group();
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(w * S, 0.35 * S, h * S), [paperEdge, paperEdge, certMat, paperEdge, paperEdge, paperEdge]);
    sheet.castShadow = true; sheet.receiveShadow = true;
    // BoxGeometry mặt +y: UV (0..1) theo x→u, z→v ngược → xoay map cho đúng chiều đọc
    loose.add(sheet);
    const tab = 22;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(tab, 0); sh.lineTo(0, tab); sh.closePath();
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }), velvet);
      m.rotation.x = -Math.PI / 2; m.scale.setScalar(S);
      // đặt tam giác ôm đúng góc
      const g2 = new THREE.Group(); g2.add(m);
      g2.position.set((sx * w / 2 - sx * 0) * S, 0.4 * S, (sz * h / 2) * S);
      g2.scale.set(-sx, 1, sz);
      m.castShadow = true;
      loose.add(g2);
    }
    loose.position.set((pw / 2 + gap / 2) * S, (T + 0.2) * S, 0);
    folder.add(loose);

    // ---------------- bố trí ----------------
    const land = w >= h;
    framed.position.set(-(land ? 0.42 : 0.5) * fw * S, 0, -(land ? 0.62 : 0.55) * ph * S);
    framed.rotation.y = 0.18;
    folder.position.set((land ? 0.28 : 0.42) * pw * S, 0, (land ? 0.5 : 0.42) * ph * S);
    folder.rotation.y = -0.12;
    g.add(framed, folder);
    return { group: g, view: { az: 0.1, el: 0.4 }, aim: 0.32, zoom: 1.55, blob: 0 };
  };
}
