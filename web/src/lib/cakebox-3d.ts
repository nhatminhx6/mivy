'use client';
// Hộp bánh 3D: hộp bánh kem nắp chụp có cửa sổ PET (thấy bánh kem trang trí bên trong), hộp cupcake có khay đỡ,
// hộp tráng miệng cửa sổ mặt trước (bánh mousse tráng gương). Tư thế: đóng nắp / mở nắp.
// Mỗi mặt in = đúng Art của file in (cakebox-engine) vẽ lên canvas → texture; tấm có cửa sổ khoét lỗ thật trong hình học.

import * as THREE from 'three';
import { S, canvasTex, type Builder, type View } from './mockup3d';
import {
  artFor, cbLook, cbSize, ctxOf, cupcakeGrid, drawArt, winFor, winPts, KRAFT, INSERT_LEG,
  type Art, type CbData, type CbPalette, type CbSpec, type Ctx, type Role, type Win,
} from './cakebox-engine';

export type CbPose = 'closed' | 'open';

// ---------------- texture giấy ----------------
let noiseTile: HTMLCanvasElement | null = null;
function noise(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!; const im = x.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 90; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  return (noiseTile = c);
}
function board(wMm: number, hMm: number, color: string, kraft: boolean) {
  const k = Math.min(8, 2048 / Math.max(wMm, hMm));
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(wMm * k)); c.height = Math.max(4, Math.round(hMm * k));
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
  if (kraft) {
    const n = Math.min(22000, Math.round(wMm * hMm * 0.28));
    ctx.lineWidth = Math.max(1, k * 0.09);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height, len = (0.4 + Math.random() * 2) * k, a = Math.random() * Math.PI;
      ctx.strokeStyle = Math.random() < 0.6 ? 'rgba(70,42,16,0.22)' : 'rgba(255,244,222,0.26)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  }
  return { c, ctx, k };
}
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, kraft: boolean) {
  ctx.save(); ctx.globalAlpha = kraft ? 0.15 : 0.045; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noise(), 'repeat')!; ctx.fillRect(0, 0, w, h); ctx.restore();
}

interface Kit { c: Ctx; imgs: Map<string, HTMLImageElement>; aniso: number; kraft: boolean; dark: boolean; inner: THREE.Material; edge: THREE.Material; win: CbSpec['win'] }

function faceMat(k: Kit, art: Art): THREE.Material {
  const b = board(art.w, art.h, k.kraft ? KRAFT : (art.bg || '#FFFFFF'), k.kraft);
  drawArt(b.ctx, art, b.k, k.imgs);
  grain(b.ctx, b.c.width, b.c.height, k.kraft);
  const map = canvasTex(b.c, k.aniso);
  if (k.kraft) return new THREE.MeshStandardMaterial({ map, roughness: 0.9 });
  return new THREE.MeshPhysicalMaterial({ map, roughness: k.dark ? 0.42 : 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35 });
}
function innerMat(kraft: boolean, aniso: number): THREE.Material {
  const b = board(220, 220, kraft ? '#BF9466' : '#F4F1EA', kraft);
  grain(b.ctx, b.c.width, b.c.height, kraft);
  const map = canvasTex(b.c, aniso); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
}
const PET = () => new THREE.MeshPhysicalMaterial({
  color: '#F6FBFF', transparent: true, opacity: 0.14, roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
  ior: 1.57, specularIntensity: 1, depthWrite: false, side: THREE.DoubleSide,
});

// tấm aw×ah dày t, tâm ở gốc: +z = mặt in phía ngoài, −z = mặt trong. Có cửa sổ → khoét lỗ thật + màng PET dán mặt trong.
function panel(k: Kit, role: Role, aw: number, ah: number, t: number): THREE.Group {
  const g = new THREE.Group();
  const win = winFor(role, aw, ah, k.win);
  const outer = faceMat(k, artFor(role, aw, ah, k.c, win));
  if (!win) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(aw * S, ah * S, t * S), [k.edge, k.edge, k.edge, k.edge, outer, k.inner]);
    m.castShadow = true; m.receiveShadow = true; g.add(m);
    return g;
  }
  // hình tấm (toạ độ mm, y lên) + lỗ cửa sổ
  const shape = new THREE.Shape();
  shape.moveTo(0, 0); shape.lineTo(aw, 0); shape.lineTo(aw, ah); shape.lineTo(0, ah); shape.closePath();
  const hole = new THREE.Path();
  winPts(win).forEach(([x, y], i) => (i ? hole.lineTo(x, ah - y) : hole.moveTo(x, ah - y)));
  hole.closePath();
  shape.holes.push(hole);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 4 });
  // UV mặt in theo mm → 0..1 ; tách 2 mặt nắp: mặt ngoài (z = t) → vật liệu 0, mặt trong (z = 0) → vật liệu 2, cạnh → 1
  const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / aw, pos.getY(i) / ah);
  const front: number[] = [], back: number[] = [], side: number[] = [];
  for (const gr of geo.groups) {
    for (let i = gr.start; i < gr.start + gr.count; i += 3) {
      const tri = [i, i + 1, i + 2];
      if (gr.materialIndex === 1) side.push(...tri);
      else (pos.getZ(i) > t / 2 ? front : back).push(...tri);
    }
  }
  geo.setIndex([...front, ...side, ...back]);
  geo.clearGroups();
  geo.addGroup(0, front.length, 0); geo.addGroup(front.length, side.length, 1); geo.addGroup(front.length + side.length, back.length, 2);
  geo.translate(-aw / 2, -ah / 2, -t / 2); geo.scale(S, S, S);
  const m = new THREE.Mesh(geo, [outer, k.edge, k.inner]);
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  // màng PET: dán từ mặt trong, rộng hơn lỗ 6mm
  const fs = new THREE.Shape();
  winPts(win, 6).forEach(([x, y], i) => (i ? fs.lineTo(x - aw / 2, ah / 2 - y) : fs.moveTo(x - aw / 2, ah / 2 - y)));
  fs.closePath();
  const film = new THREE.Mesh(new THREE.ShapeGeometry(fs, 4).scale(S, S, S), PET());
  film.position.z = (-t / 2 - 0.15) * S; film.renderOrder = 3;
  g.add(film);
  return g;
}
const place = (m: THREE.Object3D, x: number, y: number, z: number, rx = 0, ry = 0) => { m.position.set(x * S, y * S, z * S); m.rotation.set(rx, ry, 0); return m; };

// 4 thành + (tuỳ) đáy / nắp. W theo x, D theo z, H cao; đáy ở y = 0
function walls(k: Kit, W: number, D: number, H: number, t: number, roles: { front: Role; back: Role; side: Role }): THREE.Group {
  const g = new THREE.Group();
  g.add(place(panel(k, roles.front, W, H, t), 0, H / 2, D / 2 - t / 2));
  g.add(place(panel(k, roles.back, W, H, t), 0, H / 2, -D / 2 + t / 2, 0, Math.PI));
  g.add(place(panel(k, roles.side, D, H, t), -W / 2 + t / 2, H / 2, 0, 0, -Math.PI / 2));
  g.add(place(panel(k, roles.side, D, H, t), W / 2 - t / 2, H / 2, 0, 0, Math.PI / 2));
  return g;
}

// ---------------- đồ trang trí bánh ----------------
// đường xoắn ốc nón (kem bắt bông / kem cupcake)
class Swirl extends THREE.Curve<THREE.Vector3> {
  constructor(private r0: number, private r1: number, private h: number, private turns: number) { super(); }
  getPoint(t: number, target = new THREE.Vector3()) {
    const r = this.r0 + (this.r1 - this.r0) * t, a = t * this.turns * Math.PI * 2;
    return target.set(Math.cos(a) * r, t * this.h, Math.sin(a) * r);
  }
}
function swirlGeo(r0: number, h: number, turns: number, tube: number): THREE.BufferGeometry {
  const g = new THREE.TubeGeometry(new Swirl(r0, r0 * 0.12, h, turns), Math.round(turns * 40), tube, 10, false);
  return g;
}
const creamMat = (color: string) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#FFFFFF'), clearcoat: 0.12, clearcoatRoughness: 0.6 });

function canvasOf(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d')!); return c;
}
// kem phết thành bánh: vệt bay dao ngang nhẹ
function creamSideTex(color: string, aniso: number) {
  const c = canvasOf(1024, 256, (x) => {
    x.fillStyle = color; x.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 90; i++) {
      const y = Math.random() * 256, len = 120 + Math.random() * 380, x0 = Math.random() * 1024;
      x.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.035)';
      x.lineWidth = 2 + Math.random() * 5;
      x.beginPath(); x.moveTo(x0, y); x.bezierCurveTo(x0 + len * 0.3, y - 4, x0 + len * 0.7, y + 4, x0 + len, y); x.stroke();
    }
  });
  const t = canvasTex(c, aniso); t.wrapS = THREE.RepeatWrapping; return t;
}
function creamTopTex(color: string, aniso: number) {
  const c = canvasOf(512, 512, (x) => {
    x.fillStyle = color; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 60; i++) {
      const r = 30 + Math.random() * 220;
      x.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.16)' : 'rgba(0,0,0,0.03)'; x.lineWidth = 2 + Math.random() * 4;
      x.beginPath(); x.arc(256, 256, r, Math.random() * 6, Math.random() * 6 + 1.2); x.stroke();
    }
  });
  return canvasTex(c, aniso);
}

function strawberryGeo(): THREE.BufferGeometry {
  const prof = [[0, 0], [2.6, 0.7], [5.4, 3], [7.2, 6.8], [7.6, 10.6], [6.6, 14.2], [4, 16.6], [0, 17.4]].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(prof, 28);
}
let seedTex: THREE.CanvasTexture | null = null;
function strawberryMat(aniso: number) {
  if (!seedTex) {
    seedTex = canvasTex(canvasOf(256, 256, (x) => {
      const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#B5121F'); g.addColorStop(1, '#E2303A');
      x.fillStyle = g; x.fillRect(0, 0, 256, 256);
      x.fillStyle = '#F7D774';
      for (let j = 0; j < 9; j++) for (let i = 0; i < 12; i++) { x.beginPath(); x.ellipse(i * 21.3 + (j % 2) * 10, 18 + j * 26, 2.4, 3.6, 0, 0, Math.PI * 2); x.fill(); }
    }), aniso);
  }
  return new THREE.MeshPhysicalMaterial({ map: seedTex, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.15 });
}
function stripeTex(c1: string, c2: string, aniso: number) {
  const t = canvasTex(canvasOf(64, 256, (x) => {
    x.fillStyle = c1; x.fillRect(0, 0, 64, 256); x.fillStyle = c2;
    for (let y = -64; y < 320; y += 40) { x.beginPath(); x.moveTo(0, y); x.lineTo(64, y - 40); x.lineTo(64, y - 22); x.lineTo(0, y + 18); x.closePath(); x.fill(); }
  }), aniso);
  return t;
}

const M4 = new THREE.Matrix4(), QT = new THREE.Quaternion(), EU = new THREE.Euler(), SC = new THREE.Vector3(), PV = new THREE.Vector3();
function inst(geo: THREE.BufferGeometry, mat: THREE.Material, list: { p: [number, number, number]; r?: [number, number, number]; s?: number | [number, number, number] }[]) {
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach((it, i) => {
    EU.set(...(it.r || [0, 0, 0])); QT.setFromEuler(EU);
    const s = it.s ?? 1; if (typeof s === 'number') SC.set(s, s, s); else SC.set(...s);
    M4.compose(PV.set(it.p[0] * S, it.p[1] * S, it.p[2] * S), QT, SC.multiplyScalar(S)); m.setMatrixAt(i, M4);
  });
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// bánh kem tròn: đế giấy vàng, cốt bánh phủ kem, kem chảy (nếu có), viền bông kem trên + dưới, dâu/việt quất, nến
function cake(R: number, Hc: number, pal: CbPalette, candles: boolean, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const add = (m: THREE.Mesh, y: number) => { m.position.y = y * S; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const boardM = new THREE.MeshStandardMaterial({ color: '#D9B565', metalness: 0.75, roughness: 0.32 });
  add(new THREE.Mesh(new THREE.CylinderGeometry((R + 10) * S, (R + 10) * S, 2.2 * S, 72), boardM), 1.1);
  const y0 = 2.2;
  const prof = [[0, 0], [R - 1, 0], [R, 1.2], [R, Hc - 4], [R - 1.2, Hc - 1.2], [R - 4, Hc]].map(([x, y]) => new THREE.Vector2(x * S, y * S));
  const sideMat = new THREE.MeshPhysicalMaterial({ ...{ roughness: 0.6, sheen: 0.4, sheenRoughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.6 }, map: creamSideTex(pal.cream, aniso), color: '#FFFFFF' });
  const body = add(new THREE.Mesh(new THREE.LatheGeometry(prof, 96), sideMat), y0);
  void body;
  const top = add(new THREE.Mesh(new THREE.CircleGeometry((R - 3.8) * S, 72), new THREE.MeshPhysicalMaterial({ map: creamTopTex(pal.cream, aniso), roughness: 0.6, sheen: 0.4, clearcoat: 0.12 })), y0 + Hc - 0.02);
  top.rotation.x = -Math.PI / 2;
  // kem/socola chảy
  if (pal.drip) {
    const dm = new THREE.MeshPhysicalMaterial({ color: pal.drip, roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.12 });
    const cap = add(new THREE.Mesh(new THREE.CylinderGeometry((R + 0.6) * S, (R + 0.6) * S, 2.4 * S, 96), dm), y0 + Hc - 0.6);
    void cap;
    const n = Math.round((2 * Math.PI * R) / 13), list: Parameters<typeof inst>[2] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.12, len = 7 + Math.random() * Hc * 0.32;
      list.push({ p: [Math.cos(a) * (R + 0.3), y0 + Hc - len / 2 - 1, Math.sin(a) * (R + 0.3)], s: [1, len / 10, 1] });
    }
    g.add(inst(new THREE.CapsuleGeometry(2.4, 7.6, 6, 10), dm, list));
  }
  // bông kem viền trên + viền chân
  const deco = creamMat(pal.deco);
  const ros = swirlGeo(6.2, 9, 2.4, 2.6);
  const nTop = Math.round((2 * Math.PI * (R - 9)) / 15), topList: Parameters<typeof inst>[2] = [];
  for (let i = 0; i < nTop; i++) { const a = (i / nTop) * Math.PI * 2; topList.push({ p: [Math.cos(a) * (R - 9), y0 + Hc, Math.sin(a) * (R - 9)], r: [0, a, 0] }); }
  g.add(inst(ros, deco, topList));
  const shell = swirlGeo(4.6, 5, 1.8, 2.1);
  const nBot = Math.round((2 * Math.PI * (R + 2)) / 9.5), botList: Parameters<typeof inst>[2] = [];
  for (let i = 0; i < nBot; i++) { const a = (i / nBot) * Math.PI * 2; botList.push({ p: [Math.cos(a) * (R + 2.5), y0, Math.sin(a) * (R + 2.5)], r: [0, a, 0] }); }
  g.add(inst(shell, deco, botList));
  // trái cây giữa mặt bánh
  const ty = y0 + Hc;
  const sb: Parameters<typeof inst>[2] = [];
  const nS = R > 95 ? 5 : 4;
  for (let i = 0; i < nS; i++) { const a = (i / nS) * Math.PI * 2 + 0.4, d = R * 0.3; sb.push({ p: [Math.cos(a) * d, ty + 15.5, Math.sin(a) * d], r: [Math.PI + 0.35 * Math.cos(a), 0, 0.35 * Math.sin(a)] }); }
  g.add(inst(strawberryGeo(), strawberryMat(aniso), sb));
  const bb: Parameters<typeof inst>[2] = [];
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2 + 0.15, d = R * (i % 2 ? 0.16 : 0.48); bb.push({ p: [Math.cos(a) * d, ty + 3.6, Math.sin(a) * d] }); }
  g.add(inst(new THREE.SphereGeometry(4.1, 18, 12), new THREE.MeshPhysicalMaterial({ color: '#2A3466', roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color('#9AA8D6'), sheenRoughness: 0.5 }), bb));
  const leaves: Parameters<typeof inst>[2] = [];
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 1.1, d = R * 0.36; leaves.push({ p: [Math.cos(a) * d, ty + 4.5, Math.sin(a) * d], r: [0.3, a, 0.2], s: [6.5, 0.7, 3.4] }); }
  g.add(inst(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#3E8E47', roughness: 0.5 }), leaves));
  if (candles) {
    const ch = 24, cm = new THREE.MeshPhysicalMaterial({ map: stripeTex('#FFFFFF', pal.drip || '#FF7F9E', aniso), roughness: 0.4, clearcoat: 0.5 });
    const fo = new THREE.MeshBasicMaterial({ color: '#FFB238' }), fi = new THREE.MeshBasicMaterial({ color: '#FFF4C2' });
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 2.2, d = R * 0.13;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      const c = new THREE.Mesh(new THREE.CylinderGeometry(2.1 * S, 2.1 * S, ch * S, 16), cm); c.position.set(x * S, (ty + ch / 2) * S, z * S); c.castShadow = true; g.add(c);
      const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * S, 0.35 * S, 3 * S, 6), new THREE.MeshBasicMaterial({ color: '#2A2420' })); wick.position.set(x * S, (ty + ch + 1.4) * S, z * S); g.add(wick);
      const f1 = new THREE.Mesh(new THREE.SphereGeometry(2 * S, 14, 10), fo); f1.scale.set(1, 2.1, 1); f1.position.set(x * S, (ty + ch + 5) * S, z * S); g.add(f1);
      const f2 = new THREE.Mesh(new THREE.SphereGeometry(1.05 * S, 12, 8), fi); f2.scale.set(1, 1.9, 1); f2.position.set(x * S, (ty + ch + 4.3) * S, z * S); g.add(f2);
    }
  }
  return g;
}

// kem bắt đui sao: nón 3 tầng xoắn, có gân chạy xoắn quanh (v: 0 đáy → 1 đỉnh)
function frostR(R: number, v: number, u: number) {
  const turns = 2.6;
  const tier = 0.8 + 0.2 * Math.abs(Math.cos(Math.PI * turns * v + u * 0.5));
  return R * Math.pow(1 - v, 0.85) * tier * (1 + 0.07 * Math.cos(9 * u + v * 14));
}
function frostingGeo(R: number, Hf: number): THREE.BufferGeometry {
  const nu = 120, nv = 56, pos: number[] = [], idx: number[] = [];
  for (let j = 0; j <= nv; j++) {
    const v = j / nv;
    for (let i = 0; i <= nu; i++) {
      const u = (i / nu) * Math.PI * 2, r = frostR(R, v, u) + (j === 0 ? 0 : 0);
      pos.push(Math.cos(u) * r, v * Hf, Math.sin(u) * r);
    }
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// cupcake: cốc giấy xếp ly + vòm bánh + kem xoắn + cốm màu + dâu
function cupcake(r: number, linerA: string, linerB: string, cream: string, sponge: string, aniso: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const H = 32;
  const lg = new THREE.CylinderGeometry(r, r * 0.76, H, 120, 1, true);
  const lp = lg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) {
    const x = lp.getX(i), z = lp.getZ(i), a = Math.atan2(z, x), k = 1 + 0.045 * Math.abs(Math.sin(a * 14));
    lp.setX(i, x * k); lp.setZ(i, z * k);
  }
  lg.computeVertexNormals(); lg.translate(0, H / 2, 0); lg.scale(S, S, S);
  const linerMat = new THREE.MeshPhysicalMaterial({ map: stripeTex(linerA, linerB, aniso), roughness: 0.5, clearcoat: 0.3, side: THREE.DoubleSide });
  const liner = new THREE.Mesh(lg, linerMat); liner.castShadow = true; liner.receiveShadow = true; g.add(liner);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02 * S, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: sponge, roughness: 0.85 }));
  dome.scale.set(1, 0.42, 1); dome.position.y = (H - 1) * S; g.add(dome);
  const cm = creamMat(cream);
  const base = new THREE.Mesh(new THREE.SphereGeometry(r * 0.82 * S, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), cm);
  base.scale.set(1, 0.55, 1); base.position.y = (H + 2) * S; base.castShadow = true; g.add(base);
  const sw = new THREE.Mesh(frostingGeo(r * 1.02, r * 1.5).scale(S, S, S), cm);
  sw.position.y = (H + 1) * S; sw.rotation.y = seed; sw.castShadow = true; sw.receiveShadow = true; g.add(sw);
  // cốm màu rắc trên kem
  const R = (() => { let a = seed * 997 + 13; return () => { a = (a * 16807) % 2147483647; return a / 2147483647; }; })();
  const cols = ['#FF6F91', '#FFC94D', '#5CC8E8', '#8BD37A', '#FFFFFF', '#B58CF0'];
  for (const col of cols) {
    const list: Parameters<typeof inst>[2] = [];
    for (let i = 0; i < 6; i++) {
      const t = 0.08 + R() * 0.72, a = R() * Math.PI * 2, rr = frostR(r * 1.0, t, a) + 0.6;
      list.push({ p: [Math.cos(a) * rr, H + 1 + t * r * 1.5, Math.sin(a) * rr], r: [R() * 3, R() * 3, R() * 3] });
    }
    g.add(inst(new THREE.CapsuleGeometry(0.55, 2.4, 3, 6), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 }), list));
  }
  const sb = new THREE.Mesh(strawberryGeo().scale(S * 0.6, S * 0.6, S * 0.6), strawberryMat(aniso));
  sb.rotation.x = Math.PI; sb.position.y = (H + 1 + r * 1.5 + 8.5) * S; g.add(sb);
  return g;
}

// mousse tròn tráng gương: thân nhiều lớp + mặt bóng + quả mọng + lá vàng
function mousse(R: number, Hm: number, pal: CbPalette, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const boardM = new THREE.MeshStandardMaterial({ color: '#D9B565', metalness: 0.75, roughness: 0.32 });
  const b = new THREE.Mesh(new THREE.CylinderGeometry((R + 7) * S, (R + 7) * S, 1.6 * S, 64), boardM); b.position.y = 0.8 * S; b.receiveShadow = true; g.add(b);
  const glaze = pal.drip || pal.accent;
  const side = canvasTex(canvasOf(512, 256, (x) => {
    const bands: [number, string][] = [[0, glaze], [0.1, pal.cream], [0.42, '#8A5A3C'], [0.5, pal.cream], [0.8, pal.sponge]];
    bands.forEach(([y, c], i) => { x.fillStyle = c; x.fillRect(0, y * 256, 512, ((bands[i + 1]?.[0] ?? 1) - y) * 256 + 1); });
    x.fillStyle = 'rgba(0,0,0,0.05)'; for (let i = 0; i < 400; i++) x.fillRect(Math.random() * 512, 130 + Math.random() * 40, 2, 2);
  }), aniso);
  side.wrapS = THREE.RepeatWrapping;
  const body = new THREE.Mesh(new THREE.CylinderGeometry(R * S, R * S, Hm * S, 72, 1, true), new THREE.MeshPhysicalMaterial({ map: side, roughness: 0.4, clearcoat: 0.5, clearcoatRoughness: 0.2 }));
  body.position.y = (1.6 + Hm / 2) * S; body.castShadow = true; g.add(body);
  const topM = new THREE.MeshPhysicalMaterial({ color: glaze, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.04 });
  const top = new THREE.Mesh(new THREE.CylinderGeometry(R * S, R * S, 1.4 * S, 72), topM); top.position.y = (1.6 + Hm + 0.1) * S; g.add(top);
  const ty = 1.6 + Hm + 0.8;
  const dm = new THREE.MeshPhysicalMaterial({ color: glaze, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 });
  const nd = Math.round((2 * Math.PI * R) / 9), dl: Parameters<typeof inst>[2] = [];
  for (let i = 0; i < nd; i++) { const a = (i / nd) * Math.PI * 2 + Math.random() * 0.2, len = 4 + Math.random() * Hm * 0.28; dl.push({ p: [Math.cos(a) * (R + 0.2), 1.6 + Hm - len / 2, Math.sin(a) * (R + 0.2)], s: [1, len / 8, 1] }); }
  g.add(inst(new THREE.CapsuleGeometry(1.7, 6, 5, 8), dm, dl));
  const sb = new THREE.Mesh(strawberryGeo().scale(S * 0.75, S * 0.75, S * 0.75), strawberryMat(aniso)); sb.rotation.set(Math.PI + 0.5, 0, 0.2); sb.position.set(R * 0.25 * S, (ty + 12) * S, -R * 0.1 * S); sb.castShadow = true; g.add(sb);
  g.add(inst(new THREE.SphereGeometry(3.4, 16, 12), new THREE.MeshPhysicalMaterial({ color: '#2A3466', roughness: 0.45, sheen: 0.6, sheenColor: new THREE.Color('#9AA8D6') }), [{ p: [-R * 0.2, ty + 3, R * 0.15] }, { p: [-R * 0.05, ty + 3, R * 0.32] }]));
  g.add(inst(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshStandardMaterial({ color: '#3E8E47', roughness: 0.5 }), [{ p: [R * 0.02, ty + 1.5, -R * 0.3], r: [0, 0.7, 0], s: [6, 0.6, 3] }]));
  const gold = new THREE.Mesh(new THREE.CircleGeometry(4 * S, 7), new THREE.MeshStandardMaterial({ color: '#E2C36B', metalness: 1, roughness: 0.25, side: THREE.DoubleSide }));
  gold.rotation.x = -Math.PI / 2 + 0.2; gold.position.set(-R * 0.35 * S, (ty + 0.6) * S, -R * 0.2 * S); g.add(gold);
  return g;
}

// ---------------- hộp ----------------
function bottom(k: Kit, W: number, D: number, t: number) {
  return place(new THREE.Mesh(new THREE.BoxGeometry(W * S, D * S, t * S), [k.edge, k.edge, k.edge, k.edge, k.inner, k.inner]), 0, t / 2, 0, -Math.PI / 2);
}
// nắp chụp (bánh kem): mặt nắp có cửa sổ + 4 thành, gốc ở mép dưới thành
function cakeLid(k: Kit, W: number, H: number, t: number): THREE.Group {
  const g = walls(k, W, W, H, t, { front: 'front', back: 'back', side: 'side' });
  g.add(place(panel(k, 'top', W, W, t), 0, H + t / 2, 0, -Math.PI / 2));
  return g;
}
function cakeBox(k: Kit, spec: CbSpec, pose: CbPose): THREE.Group {
  const s = cbSize(spec.size), t = 1.1, root = new THREE.Group();
  const Wl = s.w + 3, Wb = s.w, hb = 30;
  const base = walls(k, Wb, Wb, hb, t, { front: 'plain', back: 'plain', side: 'plain' });
  base.add(bottom(k, Wb, Wb, t));
  root.add(base);
  const look = cbLook(spec.look);
  const cR = (s.cake || 200) / 2 - 2, Hc = s.h - 45;
  const ck = cake(cR, Hc, k.c.pal, look.candles, k.aniso); ck.position.y = t * S; root.add(ck);
  const lid = cakeLid(k, Wl, s.h, t);
  if (pose === 'open') {
    // mở nắp: nắp đặt trên bàn phía sau-bên phải, đế + bánh phía trước
    lid.position.set(Wl * 0.62 * S, 0, -Wl * 0.62 * S);
    lid.rotation.y = -0.32;
  }
  root.add(lid);
  return root;
}

function cupcakeBox(k: Kit, spec: CbSpec, pose: CbPose): THREE.Group {
  const s = cbSize(spec.size), t = 1.1, g = new THREE.Group();
  const W = s.w, D = s.d, H = s.h;
  g.add(walls(k, W, D, H, t, { front: 'front', back: 'back', side: 'side' }));
  g.add(bottom(k, W, D, t));
  // khay đỡ có lỗ
  const grid = cupcakeGrid(s);
  const ins = new THREE.Shape(); const Wi = W - 2 * t - 1, Di = D - 2 * t - 1;
  ins.moveTo(-Wi / 2, -Di / 2); ins.lineTo(Wi / 2, -Di / 2); ins.lineTo(Wi / 2, Di / 2); ins.lineTo(-Wi / 2, Di / 2); ins.closePath();
  for (const cl of grid.cells) { const p = new THREE.Path(); p.absarc(cl.x - W / 2, -(cl.y - D / 2), grid.holeR, 0, Math.PI * 2, true); ins.holes.push(p); }
  const insArt = artFor('insert', Wi, Di, k.c, null);
  const insMat = faceMat(k, insArt);
  const ig = new THREE.ExtrudeGeometry(ins, { depth: 0.9, bevelEnabled: false, curveSegments: 24 });
  const ip = ig.attributes.position as THREE.BufferAttribute, iu = ig.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < ip.count; i++) iu.setXY(i, (ip.getX(i) + Wi / 2) / Wi, (ip.getY(i) + Di / 2) / Di);
  ig.scale(S, S, S);
  const im = new THREE.Mesh(ig, [insMat, k.edge]); im.rotation.x = -Math.PI / 2; im.position.y = INSERT_LEG * S; im.receiveShadow = true; im.castShadow = true;
  g.add(im);
  // 2 chân khay (gập xuống từ mép trước / sau)
  for (const sz of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(Wi * S, INSERT_LEG * S, 0.9 * S), [k.edge, k.edge, k.edge, k.edge, insMat, insMat]);
    g.add(place(leg, 0, INSERT_LEG / 2, sz * (Di / 2 - 0.45)));
  }
  const pal = k.c.pal;
  grid.cells.forEach((cl, i) => {
    const cc = cupcake(grid.holeR * 0.96, '#FFFFFF', pal.accent, i % 2 ? pal.deco === '#FFFFFF' ? pal.cream : pal.deco : pal.cream, pal.sponge, k.aniso, i + 1);
    cc.position.set((cl.x - W / 2) * S, t * S, (cl.y - D / 2) * S);
    g.add(cc);
  });
  // nắp: bản lề ở mép trên thành sau
  const pivot = new THREE.Group(); pivot.position.set(0, H * S, (-D / 2 + t / 2) * S);
  pivot.add(place(panel(k, 'topWide', W, D, t), 0, t / 2, D / 2 - t / 2, -Math.PI / 2));
  const lip = new THREE.Mesh(new THREE.BoxGeometry((W - 4) * S, 20 * S, t * S), [k.edge, k.edge, k.edge, k.edge, k.inner, k.inner]);
  pivot.add(place(lip, 0, -10, D - 2.5 * t));
  pivot.rotation.x = pose === 'open' ? -1.95 : 0;
  g.add(pivot);
  return g;
}

function dessertBox(k: Kit, spec: CbSpec, pose: CbPose): THREE.Group {
  const s = cbSize(spec.size), t = 1, g = new THREE.Group();
  const W = s.w, D = s.d, H = s.h;
  g.add(walls(k, W, D, H, t, { front: 'frontWin', back: 'back', side: 'side' }));
  g.add(bottom(k, W, D, t));
  const ms = mousse(Math.min(W, D) * 0.3, Math.min(40, H * 0.42), k.c.pal, k.aniso); ms.position.y = t * S; g.add(ms);
  const pivot = new THREE.Group(); pivot.position.set(0, H * S, (-D / 2 + t / 2) * S);
  pivot.add(place(panel(k, 'lid', W, D, t), 0, t / 2, D / 2 - t / 2, -Math.PI / 2));
  const tuck = new THREE.Mesh(new THREE.BoxGeometry((W - 6) * S, 15 * S, t * S), [k.edge, k.edge, k.edge, k.edge, k.inner, k.inner]);
  pivot.add(place(tuck, 0, -7.5, D - 2 * t));
  pivot.rotation.x = pose === 'open' ? -1.9 : 0;
  g.add(pivot);
  return g;
}

async function loadImgs(c: Ctx): Promise<Map<string, HTMLImageElement>> {
  const m = new Map<string, HTMLImageElement>();
  if (c.logo) { const im = new Image(); im.src = c.logo; try { await im.decode(); m.set(c.logo, im); } catch { /* bỏ logo */ } }
  return m;
}

export function cakeboxBuilder(spec: CbSpec, data: CbData, logo?: string, pose: CbPose = 'closed'): Builder {
  return async (aniso) => {
    const c = ctxOf(spec, data, logo);
    const kraft = !!c.pal.kraft;
    const dark = !kraft && (() => { const h = c.pal.bg.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b < 110; })();
    const k: Kit = {
      c, imgs: await loadImgs(c), aniso, kraft, dark, win: spec.win,
      inner: innerMat(kraft, aniso),
      edge: new THREE.MeshStandardMaterial({ color: kraft ? '#B98B5A' : '#EEE9DE', roughness: 0.9 }),
    };
    const root = new THREE.Group();
    let view: View, zoom: number, aim: number;
    if (spec.kind === 'cake') {
      root.add(cakeBox(k, spec, pose));
      if (pose === 'open') { view = { az: 0.3, el: 0.5 }; zoom = 1.12; aim = 0.36; }
      else { view = { az: 0.5, el: 0.66 }; zoom = 1.16; aim = 0.42; }
    } else if (spec.kind === 'cupcake') {
      root.add(cupcakeBox(k, spec, pose));
      if (pose === 'open') { view = { az: 0.38, el: 0.62 }; zoom = 1.1; aim = 0.4; }
      else { view = { az: 0.36, el: 0.98 }; zoom = 1.18; aim = 0.45; }
    } else {
      root.add(dessertBox(k, spec, pose));
      if (pose === 'open') { view = { az: 0.45, el: 0.55 }; zoom = 1.1; aim = 0.45; }
      else { view = { az: 0.5, el: 0.44 }; zoom = 1.16; aim = 0.5; }
    }
    return { group: root, view, zoom, aim, blob: 0.55 };
  };
}
