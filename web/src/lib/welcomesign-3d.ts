'use client';
// Bảng chào mừng 3D: tấm bảng (formex 5mm / mica trong 5mm / canvas căng khung 20mm) dựng nghiêng trên GIÁ VẼ gỗ
// 3 chân có gờ đỡ; cụm hoa lá tươi ở góc trên trái tấm bảng + cụm nhỏ trên gờ — gợi không khí tiệc mà không rối.
// Mica trong: tấm acrylic trong suốt (transmission) — chỉ vùng in (lót trắng + chữ) đục, phần còn lại nhìn xuyên.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, svgTex, type Builder } from './mockup3d';

export interface Ws3DOpts {
  tex: SVGSVGElement | null; // bản 'tex' đúng khổ (mica: nền trong suốt)
  wMm: number; hMm: number;
  material: 'formex' | 'acrylic' | 'canvas';
  flowers: string[]; leaf: string; edge: string; // màu cụm hoa + màu cạnh canvas
  fontCss: string;
}

function woodTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, '#A97C4F'); g.addColorStop(0.5, '#C89A69'); g.addColorStop(1, '#A47548');
  x.fillStyle = g; x.fillRect(0, 0, 64, 512);
  x.strokeStyle = 'rgba(95,60,30,0.32)';
  for (let i = 0; i < 18; i++) { x.lineWidth = 0.6 + (i % 3) * 0.4; x.beginPath(); x.moveTo(4 + i * 3.4, 0); x.bezierCurveTo(10 + i * 3, 160, i * 3.6, 340, 6 + i * 3.3, 512); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function weaveBump(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 4) { x.fillStyle = 'rgba(255,255,255,0.22)'; x.fillRect(i, 0, 2, 128); x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, i, 128, 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(40, 40);
  return t;
}

/** thanh gỗ từ a → b (mm), tiết diện chữ nhật w×d */
function beam(a: THREE.Vector3, b: THREE.Vector3, w: number, d: number, mat: THREE.Material): THREE.Mesh {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new RoundedBoxGeometry(w * S, len * S, d * S, 2, Math.min(w, d) * 0.18 * S), mat);
  m.position.copy(a.clone().add(b).multiplyScalar(0.5 * S));
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// texture hoa hồng nhìn từ trên (toạ độ cực: u = góc, v = từ tâm ra mép) → vòng cánh lượn sóng xếp lớp
const roseCache = new Map<string, THREE.CanvasTexture>();
function roseTex(hex: string): THREE.CanvasTexture {
  const hit = roseCache.get(hex); if (hit) return hit;
  const W = 512, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const base = new THREE.Color(hex);
  const css = (col: THREE.Color) => `#${col.getHexString()}`;
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, css(base.clone().multiplyScalar(0.62)));
  g.addColorStop(0.35, css(base.clone().multiplyScalar(0.85)));
  g.addColorStop(1, css(base.clone().lerp(new THREE.Color('#ffffff'), 0.25)));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rings = [0.1, 0.2, 0.32, 0.46, 0.62, 0.8];
  rings.forEach((v, i) => {
    const n = 3 + i, ph = i * 0.7, amp = 0.05 + i * 0.012;
    const yAt = (u: number) => (v + amp * Math.abs(Math.sin(n * u * Math.PI + ph))) * H;
    // vùng sáng dưới mép cánh
    x.beginPath(); x.moveTo(0, yAt(0));
    for (let px = 0; px <= W; px += 4) x.lineTo(px, yAt(px / W));
    x.lineTo(W, yAt(1) + 14); x.lineTo(0, yAt(0) + 14); x.closePath();
    x.fillStyle = css(base.clone().lerp(new THREE.Color('#ffffff'), 0.18 + i * 0.03)); x.globalAlpha = 0.55; x.fill(); x.globalAlpha = 1;
    // mép cánh tối
    x.beginPath(); x.moveTo(0, yAt(0));
    for (let px = 0; px <= W; px += 4) x.lineTo(px, yAt(px / W));
    x.strokeStyle = css(base.clone().multiplyScalar(0.62)); x.lineWidth = 2.2; x.stroke();
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping;
  roseCache.set(hex, t);
  return t;
}
// lá luôn xanh tự nhiên (bảng màu đỏ/hỷ có "leaf" vàng kim — không hợp lá thật)
function naturalLeaf(hex: string): string {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return hsl.h > 0.2 && hsl.h < 0.5 && hsl.s > 0.12 ? hex : '#6F8F6A';
}

/** cụm hoa: hồng (chỏm cầu dán texture cánh) + cánh ngoài, lá bạch đàn tròn toả ra — toạ độ mm, gốc tại tâm cụm */
function bouquet(colors: string[], leafHex: string, scale: number, seed: number): THREE.Group {
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const g = new THREE.Group();
  const leaf = naturalLeaf(leafHex);
  const leafMats = [leaf, new THREE.Color(leaf).multiplyScalar(0.82).getStyle(), new THREE.Color(leaf).lerp(new THREE.Color('#C9D6C2'), 0.35).getStyle()]
    .map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, side: THREE.DoubleSide }));
  const leafGeo = new THREE.SphereGeometry(1, 14, 10); leafGeo.scale(1, 0.16, 0.8);
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI * 2, d = (50 + r() * 80) * scale;
    const l = new THREE.Mesh(leafGeo, leafMats[i % 3]);
    l.scale.setScalar((12 + r() * 8) * scale * S);
    l.position.set(Math.cos(a) * d * S, Math.sin(a) * d * 0.75 * S, (r() * 12 - 4) * scale * S);
    l.rotation.set(Math.PI / 2 + (r() - 0.5) * 0.8, r() * Math.PI, a);
    l.castShadow = true;
    g.add(l);
  }
  // màu hoa: bỏ màu quá giống vàng kim/nhũ → hoa trắng, hồng, kem
  const pal = colors.filter((c) => { const h = { h: 0, s: 0, l: 0 }; new THREE.Color(c).getHSL(h); return !(h.h > 0.1 && h.h < 0.17 && h.s > 0.6); });
  const fl = pal.length >= 2 ? pal : ['#FFFFFF', '#F3D2C8', '#F7E7D6'];
  const cap = new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2.05);
  cap.rotateX(Math.PI / 2); // cực hướng +z
  const outer = new THREE.SphereGeometry(1, 16, 10); outer.scale(1, 0.62, 0.22);
  const heads = [[0, 0, 40], [-54, 26, 30], [52, -18, 28], [14, 52, 22], [-36, -44, 22], [64, 38, 17]];
  heads.forEach(([hx, hy, hr], i) => {
    const col = fl[i % fl.length];
    const R = hr * scale;
    const head = new THREE.Group();
    const top = new THREE.Mesh(cap, new THREE.MeshPhysicalMaterial({ map: roseTex(col), roughness: 0.62, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') }));
    top.scale.set(R * S, R * S, R * 0.62 * S);
    head.add(top);
    const pm = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.12), roughness: 0.6, sheen: 0.5, sheenColor: new THREE.Color('#ffffff') });
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + r() * 0.4;
      const pt = new THREE.Mesh(outer, pm);
      pt.scale.setScalar(R * 0.62 * S);
      pt.position.set(Math.cos(a) * R * 0.78 * S, Math.sin(a) * R * 0.78 * S, -R * 0.05 * S);
      pt.rotation.z = a;
      head.add(pt);
    }
    head.position.set(hx * scale * S, hy * scale * S, (18 + r() * 8) * scale * S);
    head.rotation.set((r() - 0.5) * 0.35, (r() - 0.5) * 0.35, r() * Math.PI);
    head.traverse((o) => { (o as THREE.Mesh).castShadow = true; });
    g.add(head);
  });
  return g;
}

export function welcomeBuilder(o: Ws3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong bảng');
    const W = o.wMm, H = o.hMm;
    const px = Math.min(2048, Math.max(1400, Math.round(Math.max(W, H) * 2.4)));
    const clear = o.material === 'acrylic', canvas = o.material === 'canvas';
    const tex = await svgTex(o.tex, o.fontCss, px, aniso, clear ? '' : '#FFFFFF');
    tex.anisotropy = aniso;

    const out = new THREE.Group();
    const T = canvas ? 20 : 5;               // độ dày tấm
    const LEDGE = 820;                       // độ cao gờ đỡ (mm)
    const tilt = 0.2;                        // ngả ra sau ~11.5°

    // ---------- tấm bảng (gốc: giữa mép dưới, mặt in +z) ----------
    const board = new THREE.Group();
    const r = Math.min(W, H) * 0.012;
    if (clear) {
      const glass = new THREE.MeshPhysicalMaterial({ color: '#F4FBFF', transmission: 0.92, thickness: T * S, ior: 1.49, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, transparent: true, opacity: 0.32, specularIntensity: 1 });
      const slab = new THREE.Mesh(new RoundedBoxGeometry(W * S, H * S, T * S, 3, r * S), glass);
      slab.position.set(0, (H / 2) * S, 0);
      slab.castShadow = false;
      board.add(slab);
      // cạnh mica bắt sáng
      const edgeMat = new THREE.MeshPhysicalMaterial({ color: '#CFE8EE', roughness: 0.08, transmission: 0.4, transparent: true, opacity: 0.85 });
      for (const [w, h, x, y] of [[W, 3, 0, H], [W, 3, 0, 0], [3, H, -W / 2, H / 2], [3, H, W / 2, H / 2]] as const) {
        const e = new THREE.Mesh(new THREE.BoxGeometry(Math.max(w, 2) * S, Math.max(h, 2) * S, T * S), edgeMat);
        e.position.set(x * S, (y === H ? H - 1 : y === 0 ? 1 : y) * S, 0);
        board.add(e);
      }
      const ink = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.04, roughness: 0.42 }));
      ink.position.set(0, (H / 2) * S, (T / 2 + 0.3) * S);
      ink.renderOrder = 2; ink.castShadow = true;
      board.add(ink);
    } else {
      const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: canvas ? 0.82 : 0.5, clearcoat: canvas ? 0 : 0.25, clearcoatRoughness: 0.5, bumpMap: canvas ? weaveBump() : null, bumpScale: canvas ? 0.4 : 0 });
      const side = new THREE.MeshStandardMaterial({ color: canvas ? o.edge : '#F4F4EF', roughness: 0.9 });
      const back = new THREE.MeshStandardMaterial({ color: canvas ? '#D8C7A8' : '#EDEDE8', roughness: 0.95 });
      const slab = new THREE.Mesh(new RoundedBoxGeometry(W * S, H * S, T * S, 2, Math.min(1.2, T * 0.2) * S), [side, side, side, side, face, back]);
      slab.position.set(0, (H / 2) * S, 0);
      slab.castShadow = true; slab.receiveShadow = true;
      board.add(slab);
    }
    // dựng nghiêng trên gờ
    const ledgeDepth = 34;
    board.position.set(0, (LEDGE + 18) * S, (ledgeDepth / 2 - T / 2) * S);
    board.rotation.x = -tilt;
    out.add(board);

    // ---------- giá vẽ gỗ 3 chân ----------
    const wood = new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.62 });
    const topY = LEDGE + Math.cos(tilt) * H + 120;
    const topZ = -Math.sin(tilt) * H - 40;
    const spread = Math.max(W * 0.42, 220);
    const legW = 26, legD = 20;
    const fL0 = new THREE.Vector3(-spread, 0, 170), fR0 = new THREE.Vector3(spread, 0, 170);
    const fTop = new THREE.Vector3(0, topY, topZ - 8);
    out.add(beam(fL0, new THREE.Vector3(-34, topY - 10, topZ), legW, legD, wood));
    out.add(beam(fR0, new THREE.Vector3(34, topY - 10, topZ), legW, legD, wood));
    // chân sau
    out.add(beam(new THREE.Vector3(0, 0, -560), new THREE.Vector3(0, topY - 60, topZ - 26), legW, legD, wood));
    // đầu giá + kẹp trên
    const cap = new THREE.Mesh(new RoundedBoxGeometry(110 * S, 34 * S, 30 * S, 2, 5 * S), wood);
    cap.position.set(0, (topY - 6) * S, (topZ - 4) * S); cap.castShadow = true;
    out.add(cap);
    // gờ đỡ: thanh ngang qua 2 chân trước ở độ cao LEDGE (nội suy x theo chiều cao)
    const kL = LEDGE / topY;
    const xAt = (k: number) => spread * (1 - k) + 34 * k;
    const zAt = (k: number) => 170 * (1 - k) + topZ * k;
    const lw = Math.max(W + 120, 2 * xAt(kL) + 90);
    const ledge = new THREE.Mesh(new RoundedBoxGeometry(lw * S, 18 * S, ledgeDepth * 1.6 * S, 2, 4 * S), wood);
    ledge.position.set(0, (LEDGE + 9) * S, (zAt(kL) + ledgeDepth * 0.55) * S);
    ledge.castShadow = true; ledge.receiveShadow = true;
    out.add(ledge);
    const lip = new THREE.Mesh(new RoundedBoxGeometry(lw * S, 30 * S, 10 * S, 2, 3 * S), wood);
    lip.position.set(0, (LEDGE + 22) * S, (zAt(kL) + ledgeDepth * 1.3) * S);
    out.add(lip);
    board.position.z = (zAt(kL) + ledgeDepth * 0.5) * S;
    // thanh giằng dưới
    const kB = 420 / topY;
    out.add(beam(new THREE.Vector3(-xAt(kB), 420, zAt(kB) - 6), new THREE.Vector3(xAt(kB), 420, zAt(kB) - 6), 18, 16, wood));
    void fTop;

    // ---------- hoa ----------
    const sc = Math.min(W, H) / 470;
    const b1 = bouquet(o.flowers, o.leaf, sc, 17);
    // góc trên trái tấm bảng (trên mặt bảng, đi theo độ nghiêng)
    const tl = new THREE.Vector3((-W / 2 + 55 * sc) * S, (H - 60 * sc) * S, (T / 2 + 4) * S);
    b1.position.copy(tl); b1.rotation.z = 0.35;
    board.add(b1);
    const b2 = bouquet(o.flowers.slice().reverse(), o.leaf, sc * 0.72, 53);
    b2.position.set((W / 2 - 6) * S, -14 * S, (T / 2 + 22) * S); b2.rotation.z = -0.4; // ngồi trên gờ ở góc phải, không che chữ
    board.add(b2);

    return { group: out, view: { az: 0.42, el: 0.1 }, aim: 0.56, zoom: 1.22, blob: 0.35 };
  };
}
