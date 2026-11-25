'use client';
// Tem bảo hành / niêm phong 3D:
// - Niêm phong: hộp carton nắp gài, tem dán VẮT QUA mép nắp (uốn cong theo cạnh bo) + đế giấy còn 2 con, 1 con đang bóc.
// - Bảo hành: thiết bị vỏ 2 mảnh (khe ghép giữa), tem dán ĐÈ LÊN khe + tờ đế còn tem, 1 ô đã bóc.
// Chất liệu: decal vỡ (trắng mờ, vân rạch li ti), giấy (bán bóng), bạc 7 màu (kim loại + iridescence → óng ánh đổi màu khi xoay).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { SealKind, SealMaterial, SealShape } from './seal-engine';

export interface Seal3DOpts {
  ink: SVGSVGElement | null; // bản in 1 con (đúng khổ, không lề xén, có seri)
  shape: SealShape; wMm: number; hMm: number; kind: SealKind; material: SealMaterial; fontCss: string;
  serials?: string[]; // seri liên tiếp: con thứ i trong cảnh hiện serials[i] (giống tờ tem thật)
}

type Deform = (x: number, y: number) => [THREE.Vector3, THREE.Vector3?];

// ---------- texture phụ ----------
function maskTex(shape: SealShape, wMm: number, hMm: number): THREE.CanvasTexture {
  const W = 512, H = Math.max(8, Math.round((512 * hMm) / wMm));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H); x.fillStyle = '#fff';
  x.beginPath();
  if (shape === 'round') x.arc(W / 2, H / 2, Math.min(W, H) / 2 - 1, 0, Math.PI * 2);
  else x.roundRect(1, 1, W - 2, H - 2, Math.min(1.2 / wMm, 0.12 * hMm / wMm) * W);
  x.fill();
  const t = new THREE.CanvasTexture(c);
  return t;
}
// vân rạch li ti của decal vỡ (bump)
let slitCanvas: HTMLCanvasElement | null = null;
function slitTex(wMm: number, hMm: number): THREE.CanvasTexture {
  if (!slitCanvas) {
    slitCanvas = document.createElement('canvas'); slitCanvas.width = slitCanvas.height = 256;
    const x = slitCanvas.getContext('2d')!;
    x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
    x.strokeStyle = 'rgba(0,0,0,0.55)'; x.lineWidth = 1.2;
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 90; i++) {
      const px = rnd() * 256, py = rnd() * 256, a = (rnd() < 0.5 ? 0.78 : 2.36) + (rnd() - 0.5) * 0.3, l = 5 + rnd() * 6;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
    }
  }
  const t = new THREE.CanvasTexture(slitCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(wMm / 9, hMm / 9);
  return t;
}
// bản đồ độ dày màng → hologram: vân nhiễu xạ (vòng + tia) cho màu đổi theo góc nhìn
let diffCanvas: HTMLCanvasElement | null = null;
function diffractTex(): THREE.CanvasTexture {
  if (!diffCanvas) {
    const N = 512; diffCanvas = document.createElement('canvas'); diffCanvas.width = diffCanvas.height = N;
    const x = diffCanvas.getContext('2d')!;
    const img = x.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / N - 0.5, v = j / N - 0.5, r = Math.hypot(u, v), a = Math.atan2(v, u);
      const val = 0.5 + 0.25 * Math.sin(r * 26) + 0.15 * Math.sin(a * 8 + r * 6);
      const g = Math.max(0, Math.min(255, val * 255));
      const k = (j * N + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = g; img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  const t = new THREE.CanvasTexture(diffCanvas);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
// màu nền lá bạc 7 màu: dải cầu vồng nhạt chéo + tia nhiễu xạ (kim loại nhuộm màu → óng như tem hologram thật)
let foilCanvas: HTMLCanvasElement | null = null;
function rainbowTex(aniso: number): THREE.CanvasTexture {
  if (!foilCanvas) {
    const N = 512; foilCanvas = document.createElement('canvas'); foilCanvas.width = foilCanvas.height = N;
    const x = foilCanvas.getContext('2d')!;
    const img = x.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const u = i / N, v = j / N, r = Math.hypot(u - 0.5, v - 0.5), a = Math.atan2(v - 0.5, u - 0.5);
      const h = ((u + v) * 0.9 + 0.08 * Math.sin(a * 6) + r * 0.6) % 1;
      const [R, G, B] = [0, 1 / 3, 2 / 3].map((o) => 0.5 + 0.5 * Math.cos(2 * Math.PI * (h + o)));
      const k = (j * N + i) * 4, mix = 0.2; // pha trắng bạc (chủ yếu bạc, ánh cầu vồng nhẹ)
      img.data[k] = 255 * (1 - mix + mix * R); img.data[k + 1] = 255 * (1 - mix + mix * G); img.data[k + 2] = 255 * (1 - mix + mix * B); img.data[k + 3] = 255;
    }
    x.putImageData(img, 0, 0);
  }
  const t = canvasTex(foilCanvas, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// carton kraft
function kraftTex(aniso: number): THREE.CanvasTexture {
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#C6A27A'; x.fillRect(0, 0, N, N);
  let seed = 3; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = rnd() < 0.5 ? 'rgba(90,60,30,0.10)' : 'rgba(255,240,210,0.10)';
    x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  x.lineWidth = 0.8;
  for (let i = 0; i < 260; i++) {
    x.strokeStyle = rnd() < 0.6 ? 'rgba(110,75,40,0.16)' : 'rgba(250,230,200,0.14)';
    const px = rnd() * N, py = rnd() * N, a = rnd() * Math.PI, l = 6 + rnd() * 14;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + 2, py + Math.sin(a) * l * 0.5, px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.2, 2.2);
  return t;
}

// ---------- con tem (mặt phẳng nhiều đoạn, uốn theo hàm deform) ----------
interface StampMats { list: THREE.Material[] }
function stampMats(o: Seal3DOpts, tex: THREE.Texture, aniso: number): StampMats {
  const mask = maskTex(o.shape, o.wMm, o.hMm);
  const off = { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
  if (o.material === 'holo') {
    const th = diffractTex();
    th.repeat.set(o.wMm / 30, o.hMm / 30);
    const foil = rainbowTex(aniso);
    foil.repeat.set(o.wMm / 26, o.hMm / 26);
    const base = new THREE.MeshPhysicalMaterial({
      color: '#F2F3F6', map: foil, metalness: 1, roughness: 0.2, iridescence: 0.55, iridescenceIOR: 1.5,
      iridescenceThicknessRange: [260, 520], iridescenceThicknessMap: th, alphaMap: mask, alphaTest: 0.5, ...off,
    });
    tex.anisotropy = aniso;
    const ink = new THREE.MeshPhysicalMaterial({ map: tex, transparent: true, alphaTest: 0.03, roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.2, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    return { list: [base, ink] };
  }
  if (o.material === 'void') {
    return { list: [new THREE.MeshPhysicalMaterial({ map: tex, alphaTest: 0.5, roughness: 0.68, bumpMap: slitTex(o.wMm, o.hMm), bumpScale: 0.55, sheen: 0.2, ...off })] };
  }
  return { list: [new THREE.MeshPhysicalMaterial({ map: tex, alphaTest: 0.5, roughness: 0.38, clearcoat: 0.45, clearcoatRoughness: 0.25, ...off })] };
}

// mặt phẳng tem w×h (mm), deform(x,y) (mm, tâm tem) → điểm thế giới + pháp tuyến ngoài (để đặt lớp mực nổi lên 1 chút)
function stampMesh(mats: StampMats, wMm: number, hMm: number, deform: Deform, seg = 1): THREE.Group {
  const g = new THREE.Group();
  const sx = Math.max(2, Math.round((wMm / 1.2) * seg)), sy = Math.max(2, Math.round((hMm / 1.2) * seg));
  mats.list.forEach((m, li) => {
    const geo = new THREE.PlaneGeometry(wMm, hMm, sx, sy);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const [p, n] = deform(pos.getX(i), pos.getY(i));
      if (li > 0 && n) p.addScaledVector(n, 0.03 * S * li);
      pos.setXYZ(i, p.x, p.y, p.z);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, m);
    mesh.castShadow = li === 0;
    mesh.renderOrder = 2 + li;
    g.add(mesh);
  });
  return g;
}

// tem nằm phẳng trên mặt phẳng ngang y = y0, tâm (cx, cz), xoay rot; lift: bóc 1 cạnh lên (0..1)
function flatDeform(cx: number, y0: number, cz: number, rot: number, wMm: number, lift = 0): Deform {
  const c = Math.cos(rot), s = Math.sin(rot);
  return (x, y) => {
    // trục tem: x → hướng (c, -s) trên mặt đất, y (lên của ảnh) → hướng -z xoay
    let up = 0;
    const t = (x + wMm / 2) / wMm; // 0 trái → 1 phải
    if (lift > 0 && t > 0.6) { const k = (t - 0.6) / 0.4; up = k * k * lift * Math.min(wMm, 36) * 0.5; }
    const lx = x * S, lz = -y * S;
    const p = new THREE.Vector3(cx + lx * c + lz * s, y0 + up * S, cz - lx * s + lz * c);
    return [p, new THREE.Vector3(0, 1, 0)];
  };
}

// tem dán vắt qua cạnh trên–trước của hộp: phần đầu nằm trên nắp, uốn quanh cạnh bo rb, phần sau dán xuống mặt trước
function edgeWrapDeform(xc: number, topY: number, frontZ: number, rb: number, lenMm: number, onTopMm: number): Deform {
  const e = 0.05 * S, R = rb + e, arc = (R * Math.PI) / 2;
  return (x, y) => {
    const s = (x + lenMm / 2 - onTopMm) * S; // <0: trên nắp
    const px = xc + y * S;
    if (s < 0) return [new THREE.Vector3(px, topY + e, frontZ - rb + s), new THREE.Vector3(0, 1, 0)];
    if (s < arc) {
      const th = s / R;
      return [new THREE.Vector3(px, topY - rb + R * Math.cos(th), frontZ - rb + R * Math.sin(th)), new THREE.Vector3(0, Math.cos(th), Math.sin(th))];
    }
    return [new THREE.Vector3(px, topY - rb - (s - arc), frontZ + e), new THREE.Vector3(0, 0, 1)];
  };
}

// tem dán phẳng trên mặt đứng phía trước (z = frontZ), tâm (cx, cy)
function frontDeform(cx: number, cy: number, frontZ: number): Deform {
  return (x, y) => [new THREE.Vector3(cx + x * S, cy + y * S, frontZ + 0.05 * S), new THREE.Vector3(0, 0, 1)];
}

function rrPath<T extends THREE.Path>(p: T, w: number, h: number, r: number): T {
  const x = -w / 2, y = -h / 2;
  p.moveTo(x + r, y); p.lineTo(x + w - r, y); p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r); p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h); p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r); p.quadraticCurveTo(x, y, x + r, y);
  return p;
}

// tờ đế (giấy lót bóng) nằm dưới đất, các con tem xếp lưới, 1 ô trống (đã bóc), 1 con đang bóc
function liner(o: Seal3DOpts, matsAt: (i: number) => StampMats, cols: number, rows: number, at: THREE.Vector3, rot: number, missing: number, peeling: number): THREE.Group {
  const g = new THREE.Group();
  const gap = 4, m = 5;
  const LW = cols * o.wMm + (cols - 1) * gap + m * 2, LH = rows * o.hMm + (rows - 1) * gap + m * 2;
  const lt = 0.18;
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(LW * S, lt * S, LH * S), [
    ...Array(2).fill(new THREE.MeshStandardMaterial({ color: '#E9E6DF', roughness: 0.7 })),
    new THREE.MeshPhysicalMaterial({ color: '#EFE5C8', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25 }), // giấy đế glassine vàng nhạt
    new THREE.MeshStandardMaterial({ color: '#EEE9DD', roughness: 0.8 }),
    ...Array(2).fill(new THREE.MeshStandardMaterial({ color: '#E9E6DF', roughness: 0.7 })),
  ]);
  sheet.position.y = (lt / 2) * S; sheet.castShadow = true; sheet.receiveShadow = true;
  g.add(sheet);
  const top = lt * S;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c;
    const cx = (-LW / 2 + m + o.wMm / 2 + c * (o.wMm + gap)) * S, cz = (-LH / 2 + m + o.hMm / 2 + r * (o.hMm + gap)) * S;
    if (i === missing) {
      // vết bế còn lại trên đế (đường cắt hôn)
      const ring = o.shape === 'round'
        ? new THREE.RingGeometry((o.wMm / 2 - 0.25) * S, (o.wMm / 2) * S, 64)
        : (() => {
          const w = o.wMm * S, h = o.hMm * S, rr = Math.min(1.2, o.hMm * 0.12) * S;
          const sh = rrPath(new THREE.Shape(), w, h, rr);
          sh.holes.push(rrPath(new THREE.Path(), w - 0.5 * S, h - 0.5 * S, Math.max(0, rr - 0.25 * S)));
          return new THREE.ShapeGeometry(sh, 16);
        })();
      const mk = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ color: '#CFCAC0' }));
      mk.rotation.x = -Math.PI / 2; mk.position.set(cx, top + 0.02 * S, cz);
      g.add(mk);
      continue;
    }
    g.add(stampMesh(matsAt(i), o.wMm, o.hMm, flatDeform(cx, top + 0.04 * S, cz, 0, o.wMm, i === peeling ? 0.5 : 0), i === peeling ? 2 : 1));
  }
  g.position.copy(at); g.rotation.y = rot;
  return g;
}

export function sealBuilder(o: Seal3DOpts): Builder {
  return async (aniso) => {
    if (!o.ink) throw new Error('Chưa dựng xong tem');
    const px = Math.max(512, Math.min(2048, Math.round(Math.max(o.wMm, o.hMm) * 24)));
    const tex = await svgTex(o.ink, o.fontCss, px, aniso, '');
    tex.anisotropy = aniso;
    const mats = stampMats(o, tex, aniso);
    // mỗi con tem 1 seri riêng: đổi chữ [data-serial] trên bản sao SVG → texture riêng (nhỏ hơn cho tem trên đế)
    const sn = o.ink.querySelector('[data-serial]');
    const cache = new Map<number, Promise<StampMats>>();
    const matsFor = (k: number, size = px): Promise<StampMats> => {
      if (k === 0 || !sn || !o.serials?.[k]) return Promise.resolve(mats);
      if (!cache.has(k)) {
        const el = o.ink!.cloneNode(true) as SVGSVGElement;
        el.querySelector('[data-serial]')!.textContent = o.serials[k];
        cache.set(k, svgTex(el, o.fontCss, size, aniso, '').then((t) => { t.anisotropy = aniso; return stampMats(o, t, aniso); }));
      }
      return cache.get(k)!;
    };
    const linerMats = async (first: number, n: number) => {
      const list = await Promise.all(Array.from({ length: n }, (_, i) => matsFor(first + i, Math.max(384, Math.round(px * 0.6)))));
      return (i: number) => list[i];
    };
    const g = new THREE.Group();

    if (o.kind === 'seal') {
      // hộp carton nắp gài
      const W = 150, D = 104, H = 62, rb = 2;
      const kraft = kraftTex(aniso);
      const boxMat = new THREE.MeshStandardMaterial({ map: kraft, roughness: 0.86, color: '#FFFFFF' });
      const box = new THREE.Mesh(new RoundedBoxGeometry(W * S, H * S, D * S, 4, rb * S), boxMat);
      box.position.set(0, (H / 2) * S, 0); box.castShadow = true; box.receiveShadow = true;
      g.add(box);
      // mép nắp gài (vạch tối ngay dưới cạnh trước) + đường gấp nắp phía sau
      const lip = new THREE.Mesh(new THREE.BoxGeometry((W - 6) * S, 0.5 * S, 0.3 * S), new THREE.MeshStandardMaterial({ color: '#5E4528', roughness: 0.9 }));
      lip.position.set(0, (H - 13) * S, (D / 2 + 0.05) * S); g.add(lip);
      const hinge = new THREE.Mesh(new THREE.BoxGeometry((W - 6) * S, 0.25 * S, 0.5 * S), new THREE.MeshStandardMaterial({ color: '#8B6B45', roughness: 0.9 }));
      hinge.position.set(0, (H + 0.05) * S, (-D / 2 + 9) * S); g.add(hinge);
      const round = o.shape === 'round';
      const L = round ? o.wMm : o.wMm;
      const onTop = round ? o.wMm * 0.5 : Math.min(o.wMm * 0.42, D * 0.38);
      // tem chính vắt qua mép nắp; trục dài của tem chạy trước–sau
      g.add(stampMesh(mats, o.wMm, o.hMm, edgeWrapDeform(round ? 0 : -W * 0.16 * S, H * S, (D / 2) * S, rb * S, L, onTop), 2));
      if (!round) g.add(stampMesh(await matsFor(1), o.wMm, o.hMm, edgeWrapDeform(W * 0.22 * S, H * S, (D / 2) * S, rb * S, L, onTop), 2));
      // đế còn tem bên cạnh
      const cols = round ? 2 : 1, rows = round ? 2 : 3;
      g.add(liner(o, await linerMats(round ? 1 : 2, cols * rows), cols, rows, new THREE.Vector3((W / 2 + 14 + (cols * o.wMm) / 2) * S, 0, (D * 0.18) * S), -0.32, rows * cols - 2, 0));
      return { group: g, view: { az: 0.4, el: 0.52 }, aim: 0.3, zoom: 1.42, blob: 0.55 };
    }

    // thiết bị vỏ 2 mảnh
    const round = o.shape === 'round';
    const W = 96, D = 64, half = Math.max(16, o.hMm * 0.5 + 6), H = half * 2, rb = 3.2;
    const shellA = new THREE.MeshPhysicalMaterial({ color: '#2A2D33', roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const shellB = new THREE.MeshPhysicalMaterial({ color: '#33373E', roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.4 });
    const groove = 0.7;
    const lower = new THREE.Mesh(new RoundedBoxGeometry(W * S, (half - groove / 2) * S, D * S, 4, rb * S), shellA);
    lower.position.y = ((half - groove / 2) / 2) * S;
    const upper = new THREE.Mesh(new RoundedBoxGeometry(W * S, (half - groove / 2) * S, D * S, 4, rb * S), shellB);
    upper.position.y = (half + groove / 2 + (half - groove / 2) / 2) * S;
    const core = new THREE.Mesh(new THREE.BoxGeometry((W - 2) * S, groove * S, (D - 2) * S), new THREE.MeshStandardMaterial({ color: '#0E0F12', roughness: 0.8 }));
    core.position.y = half * S;
    for (const m of [lower, upper]) { m.castShadow = true; m.receiveShadow = true; }
    g.add(lower, upper, core);
    // chi tiết: khe tản nhiệt trên nắp, cổng USB-C + đèn ở mặt trước
    const slotMat = new THREE.MeshStandardMaterial({ color: '#121418', roughness: 0.85 });
    for (let k = 0; k < 7; k++) {
      const sl = new THREE.Mesh(new RoundedBoxGeometry(26 * S, 0.6 * S, 2 * S, 2, 0.5 * S), slotMat);
      sl.position.set((W / 2 - 20) * S, (H + 0.05) * S, (-D / 2 + 12 + k * 4.2) * S); g.add(sl);
    }
    const port = new THREE.Mesh(new RoundedBoxGeometry(9 * S, 3.2 * S, 1 * S, 3, 1.5 * S), new THREE.MeshStandardMaterial({ color: '#08090B', roughness: 0.6 }));
    port.position.set((-W / 2 + 12) * S, (half * 0.5) * S, (D / 2 - 0.3) * S); g.add(port);
    const led = new THREE.Mesh(new THREE.CircleGeometry(0.9 * S, 20), new THREE.MeshStandardMaterial({ color: '#7DB8FF', emissive: '#5AA2FF', emissiveIntensity: 1.6 }));
    led.position.set((-W / 2 + 22) * S, (half * 0.5) * S, (D / 2 + 0.02) * S); g.add(led);
    // tem đè lên khe ghép vỏ (mặt trước)
    g.add(stampMesh(mats, o.wMm, o.hMm, frontDeform(W * 0.14 * S, half * S, (D / 2) * S)));
    // tờ đế còn tem
    const cols = round ? 3 : 2, rows = round ? 2 : 3;
    const lw = cols * o.wMm + (cols - 1) * 4 + 10;
    g.add(liner(o, await linerMats(1, cols * rows), cols, rows, new THREE.Vector3((W * 0.5 + lw * 0.25) * S, 0, (D / 2 + 14 + (rows * o.hMm) / 2) * S), -0.22, 0, cols * rows - 1));
    return { group: g, view: { az: 0.36, el: 0.5 }, aim: 0.34, zoom: 1.4, blob: 0.6 };
  };
}
