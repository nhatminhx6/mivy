'use client';
// Bảng hiệu 3D: bảng gắn đúng chỗ trên MẶT TIỀN thật — biển nhà/biển CNC cạnh cửa, biển quán trên cửa cuốn + cửa kính.
// Mặt bảng = chính thiết kế (SignSvg face) → cắt CNC thì thủng thật, neon/hộp đèn/chữ LED thì phát sáng khi bật "buổi tối".
// Tường, cửa, vỉa hè KHÔNG tính vào khung hình (bbox rỗng) → lõi 3D ôm theo bảng, mặt tiền phủ kín phía sau.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export type SignKind3D = 'cnc' | 'neon' | 'lightbox' | 'channel' | 'engrave' | 'chalk' | 'print';
export interface Sign3DOpts {
  plateSvg: SVGSVGElement | null;   // mặt tấm cắt đúng W×H (nền trong suốt)
  decalSvg: SVGSVGElement | null;   // mặt có lề (quầng neon, bóng chữ rời) — dùng cho kiểu dán/gắn thẳng tường
  fontCss: string;
  w: number; h: number;             // mm
  platePath: string;                // đường viền tấm (mm, y xuống)
  kind: SignKind3D;
  style: string;                    // CNC: cut/raised/standoff/loose/paint
  variant: string;                  // loại khác
  wall: string;                     // id tường
  wallColor: string;
  edgeColor: string;                // màu cạnh tấm
  glow: string;                     // màu quầng sáng (neon/hộp đèn)
  night: boolean;                   // cảnh buổi tối, bảng phát sáng
}

const noBounds = <T extends THREE.Object3D>(o: T): T => {
  o.traverse((n) => { const m = n as THREE.Mesh; if (m.geometry) { m.geometry.boundingBox = new THREE.Box3(); m.frustumCulled = false; } });
  return o;
};

// ---------- texture tường / nền ----------
const rnd = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

function wallTex(kind: string, base: string, aniso: number): { map: THREE.Texture; bump: THREE.Texture; tile: number } {
  const N = 512; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
  const b = document.createElement('canvas'); b.width = b.height = N; const y = b.getContext('2d')!;
  const r = rnd(7); const col = new THREE.Color(base);
  const shade = (k: number) => `#${col.clone().multiplyScalar(k).getHexString()}`;
  x.fillStyle = base; x.fillRect(0, 0, N, N); y.fillStyle = '#808080'; y.fillRect(0, 0, N, N);
  let tile = 1200; // mm mỗi ô texture
  if (kind === 'brick') {
    tile = 900; const bh = N / 12, bw = N / 4;
    x.fillStyle = shade(0.72); x.fillRect(0, 0, N, N); y.fillStyle = '#5a5a5a'; y.fillRect(0, 0, N, N);
    for (let row = 0; row < 12; row++) for (let i = -1; i < 5; i++) {
      const ox = (row % 2) * bw / 2 + i * bw; const k = 0.88 + r() * 0.24;
      x.fillStyle = shade(k); x.fillRect(ox + 2, row * bh + 2, bw - 4, bh - 4);
      y.fillStyle = '#a8a8a8'; y.fillRect(ox + 2, row * bh + 2, bw - 4, bh - 4);
    }
  } else if (kind === 'slat') {
    tile = 1000; const n = 16, sw = N / n;
    for (let i = 0; i < n; i++) {
      x.fillStyle = shade(0.85 + r() * 0.3); x.fillRect(i * sw, 0, sw - 3, N);
      for (let k = 0; k < 18; k++) { x.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.07})`; x.lineWidth = 1; x.beginPath(); const xx = i * sw + r() * (sw - 3); x.moveTo(xx, 0); x.bezierCurveTo(xx + 3, N * 0.3, xx - 3, N * 0.6, xx + 1, N); x.stroke(); }
      x.fillStyle = 'rgba(0,0,0,0.55)'; x.fillRect(i * sw + sw - 3, 0, 3, N);
      y.fillStyle = '#b0b0b0'; y.fillRect(i * sw, 0, sw - 3, N); y.fillStyle = '#202020'; y.fillRect(i * sw + sw - 3, 0, 3, N);
    }
  } else {
    // xi măng / sơn: nhiễu mịn + vệt loang
    const img = x.getImageData(0, 0, N, N); const bi = y.getImageData(0, 0, N, N);
    const amp = kind === 'concrete' ? 26 : kind === 'dark' ? 10 : 12;
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (r() - 0.5) * amp;
      img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
      const v = 128 + (r() - 0.5) * (kind === 'concrete' ? 90 : 40); bi.data[i] = bi.data[i + 1] = bi.data[i + 2] = v;
    }
    x.putImageData(img, 0, 0); y.putImageData(bi, 0, 0);
    // làm mềm hạt (vẽ lại qua blur) → mặt vữa mịn, không lốm đốm
    x.filter = 'blur(1.2px)'; x.drawImage(c, 0, 0); x.filter = 'none';
    y.filter = 'blur(2px)'; y.drawImage(b, 0, 0); y.filter = 'none';
    for (let k = 0; k < 14; k++) {
      const px = r() * N, py = r() * N; // cùng tâm 2 vòng — khác tâm sẽ ra vệt hình nón/tam giác
      const g = x.createRadialGradient(px, py, 0, px, py, 60 + r() * 140);
      g.addColorStop(0, `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${(kind === 'dark' ? 0.012 : 0.03) + r() * (kind === 'dark' ? 0.015 : 0.04)})`); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.fillRect(0, 0, N, N);
    }
  }
  const map = canvasTex(c, aniso); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bump = new THREE.CanvasTexture(b); bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  return { map, bump, tile };
}

function paveTex(aniso: number): THREE.Texture {
  const N = 512; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
  const r = rnd(11); const n = 4, s = N / n;
  x.fillStyle = '#6d6a64'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const k = 150 + r() * 30; x.fillStyle = `rgb(${k},${k - 4},${k - 10})`; x.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    for (let d = 0; d < 260; d++) { x.fillStyle = `rgba(0,0,0,${r() * 0.08})`; x.fillRect(i * s + r() * s, j * s + r() * s, 2, 2); }
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}

function glowTex(color: string): THREE.CanvasTexture {
  const N = 256; const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d')!;
  const col = new THREE.Color(color); const rgb = `${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0}`;
  const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, `rgba(${rgb},0.7)`); g.addColorStop(0.4, `rgba(${rgb},0.25)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- mặt tiền ----------
const box = (w: number, h: number, d: number, mat: THREE.Material, r = 0) => {
  const g = r > 0 ? new RoundedBoxGeometry(w * S, h * S, d * S, 3, r * S) : new THREE.BoxGeometry(w * S, h * S, d * S);
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true; return m;
};
const put = (m: THREE.Object3D, x: number, y: number, z: number) => { m.position.set(x * S, y * S, z * S); return m; };

// cửa gỗ 1 cánh có khung + tay nắm (biển nhà)
function door(dim: number, mats: { frame: THREE.Material; wood: THREE.Material; metal: THREE.Material }): THREE.Group {
  const g = new THREE.Group(); const W = 1000, H = 2300;
  g.add(put(box(W + 160, 80, 120, mats.frame), 0, H + 40, 40));
  g.add(put(box(80, H, 120, mats.frame), -(W / 2 + 40), H / 2, 40));
  g.add(put(box(80, H, 120, mats.frame), W / 2 + 40, H / 2, 40));
  g.add(put(box(W, H, 50, mats.wood), 0, H / 2, -10));
  for (const yy of [H * 0.28, H * 0.72]) g.add(put(box(W * 0.78, H * 0.36, 14, mats.wood), 0, yy, 22));
  g.add(put(box(30, 260, 40, mats.metal, 10), W * 0.38, H * 0.48, 40));
  void dim; return g;
}

// cây trong chậu (khối cầu lá + chậu)
function plant(): THREE.Group {
  const g = new THREE.Group(); const r = rnd(5);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(200 * S, 160 * S, 420 * S, 32), new THREE.MeshStandardMaterial({ color: '#3b3d40', roughness: 0.6 }));
  pot.position.y = 210 * S; pot.castShadow = true; g.add(pot);
  const leaf = new THREE.MeshStandardMaterial({ color: '#3f6b35', roughness: 0.8 });
  // lá dài (ellipsoid dẹt) toả ra từ gốc như cây lưỡi hổ / cau cảnh
  for (let i = 0; i < 46; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), leaf.clone());
    (s.material as THREE.MeshStandardMaterial).color.offsetHSL(0, (r() - 0.5) * 0.1, (r() - 0.5) * 0.14);
    const len = 380 + r() * 420, a = r() * Math.PI * 2, tilt = 0.15 + r() * 0.55;
    s.scale.set(38 * S, len / 2 * S, 10 * S);
    s.position.set(Math.cos(a) * Math.sin(tilt) * len * 0.5 * S, (420 + Math.cos(tilt) * len * 0.5) * S, Math.sin(a) * Math.sin(tilt) * len * 0.5 * S);
    s.rotation.set(Math.sin(a) * tilt, a, -Math.cos(a) * tilt);
    s.castShadow = true; g.add(s);
  }
  return g;
}

// mặt tiền quán: lỗ cửa + cửa cuốn kéo lên + vách kính, bên trong ấm
function shopfront(openW: number, openH: number, night: boolean, mats: { frame: THREE.Material; metal: THREE.Material }): THREE.Group {
  const g = new THREE.Group();
  const inner = new THREE.MeshStandardMaterial({ color: night ? '#2a2018' : '#5b4a3a', roughness: 0.9, emissive: new THREE.Color('#ffb066'), emissiveIntensity: night ? 0.22 : 0.06 });
  g.add(put(box(openW, openH, 40, inner), 0, openH / 2, -1200)); // vách trong
  g.add(put(box(openW, 40, 1200, new THREE.MeshStandardMaterial({ color: '#4d3e30', roughness: 0.9 })), 0, openH, -600)); // trần
  g.add(put(box(openW, 20, 1200, new THREE.MeshStandardMaterial({ color: '#8a7a68', roughness: 0.7 })), 0, 10, -600));
  for (const sx of [-1, 1]) g.add(put(box(40, openH, 1200, inner), sx * (openW / 2 - 20), openH / 2, -600));
  // kệ hàng + đèn trong quán
  const shelf = new THREE.MeshStandardMaterial({ color: '#c9b396', roughness: 0.7 });
  const rr = rnd(3); const prodCols = ['#b9776a', '#7d9bb5', '#d8c48f', '#8fae8c', '#a08aa8', '#d39a6a', '#e9e4da', '#6f7d8c']; // màu hàng hoá dịu, không giành mắt với bảng
  for (let i = 0; i < 3; i++) {
    g.add(put(box(openW * 0.7, 30, 300, shelf), 0, 900 + i * 450, -1050));
    for (let x0 = -openW * 0.33; x0 < openW * 0.33; x0 += 120 + rr() * 80) {
      const hh = 140 + rr() * 150; const pm = new THREE.MeshStandardMaterial({ color: prodCols[(rr() * prodCols.length) | 0], roughness: 0.6 });
      g.add(put(box(90 + rr() * 50, hh, 120, pm), x0, 915 + i * 450 + hh / 2, -1050));
    }
  }
  for (const sx of [-0.25, 0.25]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(70 * S, 16, 12), new THREE.MeshStandardMaterial({ color: '#fff3dd', emissive: new THREE.Color('#ffd9a0'), emissiveIntensity: night ? 2.2 : 0.8 }));
    g.add(put(lamp, sx * openW, openH - 260, -700));
  }
  // cửa cuốn đã kéo lên: hộp cuốn + mép lá cuốn
  g.add(put(box(openW + 120, 300, 260, mats.metal, 20), 0, openH + 150, 60));
  const shutter = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.7, roughness: 0.4 });
  for (let i = 0; i < 4; i++) g.add(put(box(openW, 40, 12, shutter), 0, openH - 20 - i * 42, 70));
  // vách kính khung nhôm + cửa 2 cánh giữa
  const glass = new THREE.MeshPhysicalMaterial({ color: '#cfe3e8', transparent: true, opacity: night ? 0.12 : 0.22, roughness: 0.05, metalness: 0, clearcoat: 1, depthWrite: false });
  const gw = openW, gh = openH - 220;
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(gw * S, gh * S), glass); g.add(put(pane, 0, gh / 2, -30));
  for (const fx of [-0.5, -0.17, 0, 0.17, 0.5]) g.add(put(box(50, gh, 70, mats.frame), fx * (gw - 50), gh / 2, -30));
  g.add(put(box(gw, 50, 70, mats.frame), 0, gh, -30));
  g.add(put(box(gw, 60, 70, mats.frame), 0, 30, -30));
  for (const hx of [-60, 60]) g.add(put(box(24, 420, 50, mats.metal, 10), hx, 1050, 20));
  return g;
}

// ---------- bảng ----------
function plateShapes(d: string): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

function depthOf(o: Sign3DOpts): { depth: number; gap: number } {
  if (o.kind === 'lightbox') return { depth: o.variant === 'slim' ? 40 : 120, gap: 0 };
  if (o.kind === 'chalk') return { depth: 30, gap: o.variant === 'hang' ? 30 : 0 };
  if (o.kind === 'engrave') return { depth: 22, gap: 0 };
  if (o.kind === 'print') return { depth: 5, gap: 25 };
  // cnc
  if (o.style === 'standoff') return { depth: 4, gap: 40 };
  return { depth: 4, gap: o.style === 'cut' ? 25 : 8 };
}

const isDecal = (o: Sign3DOpts) => o.kind === 'neon' || o.kind === 'channel' || (o.kind === 'cnc' && (o.style === 'loose' || o.style === 'paint'));
const isLit = (o: Sign3DOpts) => o.kind === 'neon' || o.kind === 'lightbox' || o.kind === 'channel';

export function signageBuilder(o: Sign3DOpts): Builder {
  return async (aniso) => {
    if (!o.plateSvg || !o.decalSvg) throw new Error('Chưa dựng xong bảng');
    const W = o.w, H = o.h;
    const lit = isLit(o) && o.night;
    const night = o.night;
    // biển quán trên cửa cuốn chỉ khi bảng đủ lớn (≥1,5m); biển nhỏ (số nhà, tên villa…) gắn tường cạnh cửa
    const shop = W >= 1500 && (o.kind === 'neon' || o.kind === 'lightbox' || o.kind === 'channel' || o.kind === 'print' || o.kind === 'cnc');
    const g = new THREE.Group();

    // vị trí bảng (mm, tâm bảng) — biển nhà: ngang tầm mắt cạnh cửa; biển quán: trên cửa cuốn
    const openW = Math.max(2800, W * 1.25), openH = 2700;
    const cy = shop ? openH + 420 + 300 + H / 2 : Math.max(1650, H / 2 + 900);
    const cx = shop ? 0 : 0;

    // ---- mặt tiền (không tính khung hình) ----
    const dim = night ? 0.13 : 1;
    const wt = wallTex(o.wall, o.wallColor, aniso);
    const facadeW = Math.max(12000, W * 5), facadeH = Math.max(8000, cy + H / 2 + 4000);
    wt.map.repeat.set(facadeW / wt.tile, facadeH / wt.tile); wt.bump.repeat.copy(wt.map.repeat);
    const wallMat = new THREE.MeshStandardMaterial({ map: wt.map, bumpMap: wt.bump, bumpScale: o.wall === 'brick' || o.wall === 'slat' ? 3 : 0.35, roughness: 0.9, color: new THREE.Color(1, 1, 1).multiplyScalar(dim) });
    const frameMat = new THREE.MeshStandardMaterial({ color: '#2b2e33', metalness: 0.4, roughness: 0.5 });
    const metal = new THREE.MeshStandardMaterial({ color: '#b9bec4', metalness: 0.85, roughness: 0.3 });
    const fac = new THREE.Group();
    if (shop) {
      // tường quanh lỗ cửa: 3 mảng (trái, phải, trên)
      const side = (facadeW - openW) / 2;
      const mk = (w: number, h: number, x: number, y: number) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), wallMat.clone()); const mm = m.material as THREE.MeshStandardMaterial; mm.map = wt.map.clone(); mm.map.repeat.set(w / wt.tile, h / wt.tile); mm.map.needsUpdate = true; mm.bumpMap = wt.bump.clone(); mm.bumpMap.repeat.copy(mm.map.repeat); mm.bumpMap.needsUpdate = true; m.receiveShadow = true; return put(m, x, y, 0); };
      fac.add(mk(side, facadeH, -(openW / 2 + side / 2), facadeH / 2));
      fac.add(mk(side, facadeH, openW / 2 + side / 2, facadeH / 2));
      fac.add(mk(openW, facadeH - openH, 0, openH + (facadeH - openH) / 2));
      fac.add(shopfront(openW, openH, night, { frame: frameMat, metal }));
      for (const sx of [-1, 1]) fac.add(put(box(260, openH + 300, 160, new THREE.MeshStandardMaterial({ color: new THREE.Color(o.wallColor).multiplyScalar(0.82 * dim), roughness: 0.85 })), sx * (openW / 2 + 130), (openH + 300) / 2, 80));
    } else {
      const wall = new THREE.Mesh(new THREE.PlaneGeometry(facadeW * S, facadeH * S), wallMat); wall.receiveShadow = true;
      fac.add(put(wall, 0, facadeH / 2, 0));
      const dr = door(W, { frame: frameMat, wood: new THREE.MeshStandardMaterial({ color: new THREE.Color('#6b4a30').multiplyScalar(dim), roughness: 0.6 }), metal });
      fac.add(put(dr, W / 2 + 1100, 0, 0));
      const pl = plant(); fac.add(put(pl, -(W / 2 + 700), 0, 380));
      // đèn LED thanh rọi bảng (chỉ biển không tự sáng): 2 tay đỡ + thanh đèn, dải sáng ở mặt dưới
      if (!isLit(o)) {
        const lampMat = new THREE.MeshStandardMaterial({ color: '#25282d', metalness: 0.6, roughness: 0.35 });
        const by = cy + H / 2 + 110, bz = 230;
        for (const sx of [-0.28, 0.28]) {
          const arm = new THREE.Mesh(new THREE.CylinderGeometry(9 * S, 9 * S, bz * S, 10), lampMat); arm.rotation.x = Math.PI / 2;
          fac.add(put(arm, sx * W, by, bz / 2));
        }
        fac.add(put(box(W * 0.72, 32, 56, lampMat, 8), 0, by, bz));
        const strip = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.68 * S, 26 * S), new THREE.MeshStandardMaterial({ color: '#fff4dc', emissive: new THREE.Color('#ffe7bd'), emissiveIntensity: night ? 2.2 : 0.35 }));
        strip.rotation.x = Math.PI / 2; fac.add(put(strip, 0, by - 17, bz));
      }
    }
    // vỉa hè + bó vỉa
    const pv = paveTex(aniso); pv.repeat.set(facadeW / 1200, 3000 / 1200);
    const pave = new THREE.Mesh(new THREE.PlaneGeometry(facadeW * S, 3000 * S), new THREE.MeshStandardMaterial({ map: pv, roughness: 0.95, color: new THREE.Color(1, 1, 1).multiplyScalar(night ? 0.18 : 1) }));
    pave.rotation.x = -Math.PI / 2; pave.receiveShadow = true; fac.add(put(pave, 0, -1, 1500));
    fac.add(put(box(facadeW, 150, 180, new THREE.MeshStandardMaterial({ color: new THREE.Color('#9a968e').multiplyScalar(night ? 0.18 : 1), roughness: 0.9 })), 0, -75, 3000));
    const seenMat = new Set<THREE.Material>();
    fac.traverse((n) => {
      const m = n as THREE.Mesh; m.castShadow = false;
      if (night && m.material) for (const mt of (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]) {
        if (seenMat.has(mt)) continue; seenMat.add(mt);
        // buổi tối: tắt phản chiếu môi trường studio (đồ tối vẫn loá sáng) + hạ albedo đồ chưa dim (cây, cửa)
        mt.envMapIntensity = 0.12;
        if (mt.color && !mt.emissiveMap && (mt.emissiveIntensity ?? 0) < 0.3 && mt !== wallMat && !mt.map) mt.color.multiplyScalar(0.25);
      }
    });
    g.add(noBounds(fac));

    // ---- bảng ----
    const sign = new THREE.Group();
    if (isDecal(o)) {
      const vb = o.decalSvg.viewBox.baseVal; const pw = vb.width, ph = vb.height;
      const tex = await svgTex(o.decalSvg, o.fontCss, Math.min(4096, Math.round(Math.max(pw, ph) * 2.4)), aniso, '');
      const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.02, roughness: o.kind === 'cnc' ? 0.45 : 0.6, metalness: o.kind === 'cnc' && o.style === 'loose' ? 0.5 : 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
      if (lit) { mat.emissiveMap = tex; mat.emissive = new THREE.Color('#ffffff'); mat.emissiveIntensity = 1.15; mat.color.setScalar(0.55); mat.toneMapped = false; }
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(pw * S, ph * S), mat);
      sign.add(put(plane, 0, 0, o.kind === 'channel' ? 40 : 6));
      // khung hình ôm theo bảng thật, không theo lề quầng sáng
      const hit = new THREE.Mesh(new THREE.BoxGeometry(W * S, H * S, 10 * S), new THREE.MeshBasicMaterial({ visible: false }));
      sign.add(hit);
      // chữ LED khối: vài lớp lùi ra sau tạo độ dày chữ
      if (o.kind === 'channel' || (o.kind === 'cnc' && o.style === 'loose')) {
        const pTex = await svgTex(o.plateSvg, o.fontCss, Math.min(4096, Math.round(Math.max(W, H) * 2.4)), aniso, '');
        const steps = o.kind === 'channel' ? 10 : 5, deep = o.kind === 'channel' ? 60 : 18;
        for (let i = 1; i <= steps; i++) {
          const m = new THREE.MeshStandardMaterial({ map: pTex, transparent: true, alphaTest: 0.35, color: new THREE.Color(o.edgeColor).multiplyScalar(lit ? 0.5 : 0.75), roughness: 0.5, metalness: 0.4, depthWrite: true });
          const p = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), m);
          sign.add(put(p, 0, 0, (o.kind === 'channel' ? 40 : 6) + deep - (i * deep) / steps));
        }
        plane.position.z = ((o.kind === 'channel' ? 40 : 6) + deep + 1) * S;
      }
    } else {
      const { depth, gap } = depthOf(o);
      const tex = await svgTex(o.plateSvg, o.fontCss, Math.min(4096, Math.round(Math.max(W, H) * 2.6)), aniso, '');
      tex.flipY = false; tex.repeat.set(1 / W, 1 / H); tex.needsUpdate = true;
      const shapes = plateShapes(o.platePath);
      const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: Math.min(1.5, depth * 0.2), bevelSize: Math.min(1.5, depth * 0.2), bevelSegments: 2, curveSegments: 24 });
      const cut = o.kind === 'cnc' && o.style === 'cut';
      const face = new THREE.MeshPhysicalMaterial({
        map: tex, transparent: cut, alphaTest: cut ? 0.5 : 0, roughness: o.kind === 'print' || o.kind === 'lightbox' ? 0.35 : 0.6,
        clearcoat: o.kind === 'print' || o.kind === 'lightbox' ? 0.6 : 0.1, metalness: o.kind === 'cnc' ? 0.35 : 0,
      });
      if (lit) { face.emissiveMap = tex; face.emissive = new THREE.Color('#ffffff'); face.emissiveIntensity = 0.95; face.color.setScalar(0.5); }
      const side = new THREE.MeshStandardMaterial({ color: o.kind === 'lightbox' ? '#2c2f34' : o.edgeColor, roughness: 0.55, metalness: o.kind === 'lightbox' || o.kind === 'cnc' ? 0.5 : 0.1 });
      const mesh = new THREE.Mesh(geo, [face, side]);
      mesh.castShadow = !cut; mesh.receiveShadow = true;
      if (cut) { mesh.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: tex, alphaTest: 0.5 }); mesh.castShadow = true; }
      const inner = new THREE.Group(); inner.scale.set(S, -S, S); inner.add(mesh);
      inner.position.set((-W / 2) * S, (H / 2) * S, gap * S);
      sign.add(inner);
      // mặt trước là mặt z = depth (+ vát) → texture nằm ở cap trên; ốc/chân cách tường
      if (gap > 10) {
        const pin = new THREE.MeshStandardMaterial({ color: '#c7ccd2', metalness: 0.9, roughness: 0.25 });
        for (const [px, py] of [[0.08, 0.12], [0.92, 0.12], [0.08, 0.88], [0.92, 0.88]]) {
          const c = new THREE.Mesh(new THREE.CylinderGeometry(9 * S, 9 * S, gap * S, 12), pin); c.rotation.x = Math.PI / 2;
          sign.add(put(c, (px - 0.5) * W, (0.5 - py) * H, gap / 2));
        }
      }
      if (o.kind === 'chalk' && o.variant === 'hang') {
        const rope = new THREE.MeshStandardMaterial({ color: '#8a6a45', roughness: 0.9 });
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-W * 0.4 * S, H / 2 * S, (gap + 10) * S), new THREE.Vector3(0, (H / 2 + H * 0.35) * S, 6 * S), new THREE.Vector3(W * 0.4 * S, H / 2 * S, (gap + 10) * S)]);
        sign.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 5 * S, 8), rope));
      }
    }
    sign.position.set(cx * S, cy * S, 0);
    g.add(sign);
    // biển quán: khung hình ôm bảng + phần trên cửa cuốn (thấy rõ đây là mặt tiền quán)
    if (shop) {
      const fw = Math.max(W * 1.15, openW * 0.85), top = cy + H / 2 + 250, bot = openH - 900;
      const hb = new THREE.Mesh(new THREE.BoxGeometry(fw * S, (top - bot) * S, 10 * S), new THREE.MeshBasicMaterial({ visible: false }));
      g.add(put(hb, 0, (top + bot) / 2, 0));
    }

    // ánh sáng hắt: quầng trên tường + đèn điểm cho bảng sáng; đèn rọi ấm cho biển nhà buổi tối
    if (lit) {
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(W * 2.6 * S, H * 3.2 * S), new THREE.MeshBasicMaterial({ map: glowTex(o.glow), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: o.kind === 'lightbox' ? 0.55 : 0.8 }));
      g.add(noBounds(put(halo, cx, cy, 3)));
      const pl = new THREE.PointLight(new THREE.Color(o.glow), 2.4, Math.max(W, H) * 3 * S, 1.6);
      g.add(put(pl, cx, cy, 300));
    } else if (night) {
      const sp = new THREE.SpotLight('#ffd7a0', 30, Math.max(W, H) * 4 * S, 0.7, 0.6, 1.4);
      sp.position.set(cx * S, (cy + H / 2 + 200) * S, 300 * S); sp.target.position.set(cx * S, cy * S, 0); g.add(sp, sp.target);
    }

    const portrait = H > W * 1.05;
    return {
      group: g,
      view: { az: shop ? 0.32 : 0.36, el: shop ? 0.05 : 0.08 },
      aim: 0.5,
      zoom: shop ? 0.92 : (portrait ? 0.7 : 0.62),
      blob: 0,
      swing: 0.45,
    };
  };
}
