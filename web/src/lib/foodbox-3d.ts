'use client';
// Hộp đồ ăn 3D: hộp pizza (1 hộp đóng + 1 hộp mở có pizza), hộp cơm nắp gài lưỡi, hộp burger hé nắp, khay thuyền có khoai.
// Mỗi mặt in = đúng Art của file in (foodbox-engine) vẽ lên canvas → texture. Cạnh carton sóng E có hoạ tiết sóng.

import * as THREE from 'three';
import { S, canvasTex, type Builder, type View } from './mockup3d';
import { artFor, ctxOf, drawArt, fbSize, KRAFT, type Art, type Ctx, type FbData, type FbSpec, type Role } from './foodbox-engine';

// ---------------- texture ----------------
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
    for (let i = 0; i < 10; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height, r = (0.25 + Math.random() * 0.5) * Math.max(c.width, c.height);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); const dark = Math.random() < 0.5;
      g.addColorStop(0, dark ? 'rgba(80,50,20,0.08)' : 'rgba(255,240,210,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, c.width, c.height);
    }
    const n = Math.min(22000, Math.round(wMm * hMm * 0.28));
    ctx.lineWidth = Math.max(1, k * 0.09);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * c.width, y = Math.random() * c.height, len = (0.4 + Math.random() * 2) * k, a = Math.random() * Math.PI;
      ctx.strokeStyle = Math.random() < 0.6 ? 'rgba(70,42,16,0.24)' : 'rgba(255,244,222,0.28)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  }
  return { c, ctx, k };
}
function grain(ctx: CanvasRenderingContext2D, w: number, h: number, kraft: boolean) {
  ctx.save(); ctx.globalAlpha = kraft ? 0.16 : 0.05; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noise(), 'repeat')!; ctx.fillRect(0, 0, w, h); ctx.restore();
}

interface Kit { c: Ctx; imgs: Map<string, HTMLImageElement>; aniso: number; kraft: boolean; dark: boolean; inner: THREE.Material; edgeColor: string; flute: boolean }

function faceMat(k: Kit, art: Art): THREE.Material {
  const b = board(art.w, art.h, k.kraft ? KRAFT : (art.bg || '#FFFFFF'), k.kraft);
  drawArt(b.ctx, art, b.k, k.imgs);
  grain(b.ctx, b.c.width, b.c.height, k.kraft);
  const map = canvasTex(b.c, k.aniso);
  if (k.kraft) return new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 });
  return new THREE.MeshPhysicalMaterial({ map, roughness: k.dark ? 0.45 : 0.55, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.4 });
}
const art = (k: Kit, role: Role, w: number, h: number) => faceMat(k, artFor(role, w, h, k.c));

function innerMat(kraft: boolean, aniso: number): THREE.Material {
  const b = board(220, 220, kraft ? '#BF9466' : '#F3EFE6', kraft);
  grain(b.ctx, b.c.width, b.c.height, kraft);
  const map = canvasTex(b.c, aniso); map.wrapS = map.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.92 });
}

// cạnh cắt carton sóng E: 2 lớp giấy mặt + lớp sóng ở giữa
let fluteCanvas: HTMLCanvasElement | null = null;
function fluteMat(lenMm: number, vertical: boolean, aniso: number): THREE.Material {
  if (!fluteCanvas) {
    const c = document.createElement('canvas'); c.width = 128; c.height = 32;
    const x = c.getContext('2d')!;
    x.fillStyle = '#B98D5C'; x.fillRect(0, 0, 128, 32);
    x.fillStyle = '#D6B587'; x.fillRect(0, 0, 128, 6); x.fillRect(0, 26, 128, 6);
    x.strokeStyle = '#7A552E'; x.lineWidth = 3; x.beginPath();
    for (let i = 0; i <= 128; i += 2) { const y = 16 + Math.sin((i / 128) * Math.PI * 8) * 9; if (i) x.lineTo(i, y); else x.moveTo(i, y); }
    x.stroke();
    x.fillStyle = 'rgba(60,38,16,0.35)';
    for (let i = 0; i < 8; i++) { x.beginPath(); x.ellipse(8 + i * 16, i % 2 ? 22 : 10, 5, 3, 0, 0, Math.PI * 2); x.fill(); }
    fluteCanvas = c;
  }
  const t = canvasTex(fluteCanvas, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (vertical) { t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; }
  t.repeat.set(Math.max(1, lenMm / 4.2), 1);
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
}

// tấm phẳng w×h dày t: mặt +z = mặt in phía ngoài, −z = mặt trong
function slab(k: Kit, w: number, h: number, t: number, outer: THREE.Material): THREE.Mesh {
  const edgeX = k.flute ? fluteMat(h, true, k.aniso) : new THREE.MeshStandardMaterial({ color: k.edgeColor, roughness: 0.9 });
  const edgeY = k.flute ? fluteMat(w, false, k.aniso) : edgeX;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, t * S), [edgeX, edgeX, edgeY, edgeY, outer, k.inner]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const place = (m: THREE.Object3D, x: number, y: number, z: number, rx = 0, ry = 0) => { m.position.set(x * S, y * S, z * S); m.rotation.set(rx, ry, 0); return m; };

// khay hở: đáy + 4 thành đứng (W theo x, D theo z, H cao). Trả về group, đáy ở y = 0
function trayBody(k: Kit, W: number, D: number, H: number, t: number, roles: { front: Role; back: Role; side: Role }, bottom = true): THREE.Group {
  const g = new THREE.Group();
  if (bottom) g.add(place(slab(k, W, D, t, k.inner), 0, t / 2, 0, Math.PI / 2));
  g.add(place(slab(k, W, H, t, art(k, roles.front, W, H)), 0, H / 2, D / 2 - t / 2));
  g.add(place(slab(k, W, H, t, art(k, roles.back, W, H)), 0, H / 2, -D / 2 + t / 2, 0, Math.PI));
  g.add(place(slab(k, D - 2 * t, H, t, art(k, roles.side, D, H)), -W / 2 + t / 2, H / 2, 0, 0, -Math.PI / 2));
  g.add(place(slab(k, D - 2 * t, H, t, art(k, roles.side, D, H)), W / 2 - t / 2, H / 2, 0, 0, Math.PI / 2));
  return g;
}

// ---------------- món ăn ----------------
function pizza(R: number, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = c.height = 1024;
  const x = c.getContext('2d')!;
  const rg = x.createRadialGradient(512, 512, 0, 512, 512, 512);
  rg.addColorStop(0, '#C23A22'); rg.addColorStop(0.9, '#A82E1C'); rg.addColorStop(1, '#8E2616');
  x.fillStyle = rg; x.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 260; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 470, px = 512 + Math.cos(a) * d, py = 512 + Math.sin(a) * d, r = 26 + Math.random() * 60;
    const cg = x.createRadialGradient(px, py, 0, px, py, r);
    cg.addColorStop(0, 'rgba(250,226,150,0.95)'); cg.addColorStop(0.6, 'rgba(244,206,120,0.7)'); cg.addColorStop(1, 'rgba(244,206,120,0)');
    x.fillStyle = cg; x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill();
  }
  for (let i = 0; i < 160; i++) {
    const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * 480;
    x.fillStyle = `rgba(${150 + Math.random() * 40},${80 + Math.random() * 30},30,${0.25 + Math.random() * 0.3})`;
    x.beginPath(); x.ellipse(512 + Math.cos(a) * d, 512 + Math.sin(a) * d, 4 + Math.random() * 12, 3 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2); x.fill();
  }
  x.strokeStyle = 'rgba(70,20,10,0.4)'; x.lineWidth = 5;
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI + 0.3; x.beginPath(); x.moveTo(512 - Math.cos(a) * 512, 512 - Math.sin(a) * 512); x.lineTo(512 + Math.cos(a) * 512, 512 + Math.sin(a) * 512); x.stroke(); }
  const top = new THREE.MeshPhysicalMaterial({ map: canvasTex(c, aniso), roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const dough = new THREE.MeshStandardMaterial({ color: '#E3B46E', roughness: 0.85 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * S, R * S, 5 * S, 72), [dough, top, dough]);
  disc.position.y = 2.5 * S; disc.castShadow = true; disc.receiveShadow = true;
  g.add(disc);
  const crustMap = (() => {
    const cc = document.createElement('canvas'); cc.width = 512; cc.height = 64; const y = cc.getContext('2d')!;
    y.fillStyle = '#D9984A'; y.fillRect(0, 0, 512, 64);
    for (let i = 0; i < 220; i++) { y.fillStyle = `rgba(${120 + Math.random() * 60},${60 + Math.random() * 30},20,${0.2 + Math.random() * 0.35})`; y.beginPath(); y.ellipse(Math.random() * 512, Math.random() * 64, 3 + Math.random() * 10, 2 + Math.random() * 5, 0, 0, Math.PI * 2); y.fill(); }
    const t = canvasTex(cc, aniso); t.wrapS = THREE.RepeatWrapping; t.repeat.set(3, 1); return t;
  })();
  const crust = new THREE.Mesh(new THREE.TorusGeometry((R - 5) * S, 7.5 * S, 18, 96), new THREE.MeshStandardMaterial({ map: crustMap, roughness: 0.8 }));
  crust.rotation.x = -Math.PI / 2; crust.scale.set(1, 1, 0.8); crust.position.y = 5 * S; crust.castShadow = true;
  g.add(crust);
  // topping
  const rnd = (n: number, rMax: number, minD: number) => {
    const out: [number, number][] = [];
    for (let tries = 0; out.length < n && tries < 400; tries++) {
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(Math.random()) * rMax, p: [number, number] = [Math.cos(a) * d, Math.sin(a) * d];
      if (out.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > minD)) out.push(p);
    }
    return out;
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const pr = Math.max(8, R * 0.1);
  const pep = rnd(Math.round(R / 9), R - pr - 14, pr * 2.1);
  const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(pr * S, pr * S, 1.8 * S, 28), new THREE.MeshPhysicalMaterial({ color: '#9C2A20', roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 }), pep.length);
  pep.forEach(([px, pz], i) => { e.set((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12); q.setFromEuler(e); m4.compose(pos.set(px * S, 5.9 * S, pz * S), q, sc.set(1, 1, 1)); pm.setMatrixAt(i, m4); });
  pm.castShadow = true; g.add(pm);
  const ol = rnd(10, R - 20, 12);
  const om = new THREE.InstancedMesh(new THREE.TorusGeometry(3.6 * S, 1.7 * S, 10, 20), new THREE.MeshPhysicalMaterial({ color: '#1E1B18', roughness: 0.3, clearcoat: 0.6 }), ol.length);
  ol.forEach(([px, pz], i) => { e.set(-Math.PI / 2, 0, 0); q.setFromEuler(e); m4.compose(pos.set(px * S, 6 * S, pz * S), q, sc.set(1, 1, 1)); om.setMatrixAt(i, m4); });
  g.add(om);
  const lv = rnd(7, R - 22, 18);
  const bm = new THREE.InstancedMesh(new THREE.SphereGeometry(1 * S, 12, 8), new THREE.MeshStandardMaterial({ color: '#2F6B2A', roughness: 0.6 }), lv.length);
  lv.forEach(([px, pz], i) => { e.set(0, Math.random() * Math.PI, 0); q.setFromEuler(e); m4.compose(pos.set(px * S, 6.4 * S, pz * S), q, sc.set(9, 1.2, 4.8)); bm.setMatrixAt(i, m4); });
  g.add(bm);
  return g;
}

function burger(R: number): THREE.Group {
  const g = new THREE.Group();
  const add = (m: THREE.Mesh, y: number) => { m.position.y = y * S; m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const bunMat = new THREE.MeshPhysicalMaterial({ color: '#D4893C', roughness: 0.45, clearcoat: 0.5, clearcoatRoughness: 0.3 });
  const bot = new THREE.LatheGeometry([[0, 0], [R * 0.9, 0], [R, 3], [R, 10], [R * 0.95, 14], [0, 14]].map(([a, b]) => new THREE.Vector2(a * S, b * S)), 64);
  add(new THREE.Mesh(bot, new THREE.MeshStandardMaterial({ color: '#E0AA62', roughness: 0.7 })), 0);
  add(new THREE.Mesh(new THREE.CylinderGeometry(R * 1.04 * S, R * 1.02 * S, 11 * S, 56), new THREE.MeshStandardMaterial({ color: '#4E2C1C', roughness: 0.92 })), 19.5);
  const cheese = add(new THREE.Mesh(new THREE.BoxGeometry(R * 1.75 * S, 1.6 * S, R * 1.75 * S), new THREE.MeshPhysicalMaterial({ color: '#F2B01E', roughness: 0.35, clearcoat: 0.4 })), 26);
  cheese.rotation.y = 0.35;
  const lg = new THREE.CylinderGeometry(R * 1.1 * S, R * 1.12 * S, 3 * S, 96, 1);
  const lp = lg.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < lp.count; i++) { const x = lp.getX(i), z = lp.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r > R * 0.9 * S) lp.setY(i, lp.getY(i) + Math.sin(a * 14) * 2.2 * S); }
  lg.computeVertexNormals();
  add(new THREE.Mesh(lg, new THREE.MeshStandardMaterial({ color: '#6DBE45', roughness: 0.55 })), 29);
  add(new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86 * S, R * 0.86 * S, 4 * S, 40), new THREE.MeshStandardMaterial({ color: '#D7372B', roughness: 0.4 })), 32.5);
  const topG = new THREE.SphereGeometry(R * S, 56, 24, 0, Math.PI * 2, 0, Math.PI / 2);
  const top = add(new THREE.Mesh(topG, bunMat), 34.5);
  top.scale.set(1, 0.6, 1);
  const seeds = new THREE.InstancedMesh(new THREE.SphereGeometry(1 * S, 8, 6), new THREE.MeshStandardMaterial({ color: '#F4E3BE', roughness: 0.6 }), 46);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(1.8, 0.8, 1.1), p = new THREE.Vector3();
  for (let i = 0; i < 46; i++) {
    const th = Math.acos(1 - Math.random() * 0.75), ph = Math.random() * Math.PI * 2;
    const nx = Math.sin(th) * Math.cos(ph), ny = Math.cos(th), nz = Math.sin(th) * Math.sin(ph);
    p.set(nx * R * S, (34.5 + ny * R * 0.6 + 0.4) * S, nz * R * S);
    e.set(0, Math.random() * Math.PI, 0); q.setFromEuler(e);
    m4.compose(p, q, sc); seeds.setMatrixAt(i, m4);
  }
  g.add(seeds);
  return g;
}

function fries(W: number, D: number, H: number, t: number): THREE.InstancedMesh {
  // khoai chất đống: phần lớn nằm nghiêng xếp lớp, vài que dựng chéo lên thành khay
  const n = Math.round((W * D) / 110);
  const im = new THREE.InstancedMesh(new THREE.BoxGeometry(6.5 * S, 1 * S, 6.5 * S), new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.6 }), n);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  for (let i = 0; i < n; i++) {
    const lean = Math.random() < 0.28;
    const tilt = lean ? 0.45 + Math.random() * 0.45 : 1.25 + Math.random() * 0.3;
    const yaw = (Math.random() - 0.5) * 1.4; // nằm dọc theo chiều dài khay là chính
    // que không được xuyên thành khay: tầm vươn ngang theo x/z phải nằm gọn trong lòng khay
    const rx = Math.sin(tilt) * Math.abs(Math.cos(yaw)), rz = Math.sin(tilt) * Math.abs(Math.sin(yaw));
    const len = Math.min(42 + Math.random() * 34, (W - 16) / Math.max(0.01, rx), (D - 14) / Math.max(0.01, rz));
    e.set(0, yaw, tilt, 'YXZ'); q.setFromEuler(e);
    const mx = Math.max(0, W / 2 - 7 - (len / 2) * rx), mz = Math.max(0, D / 2 - 7 - (len / 2) * rz);
    const x = (Math.random() * 2 - 1) * mx, z = (Math.random() * 2 - 1) * mz;
    const mound = 1 - Math.min(1, Math.hypot(x / (W / 2), z / (D / 2)));
    const y = lean ? t + Math.cos(tilt) * len * 0.5 + 2 : t + 3.5 + Math.random() * H * 0.75 * (0.35 + mound);
    p.set(x * S, y * S, z * S);
    m4.compose(p, q, sc.set(1, len, 1)); im.setMatrixAt(i, m4);
    im.setColorAt(i, col.set('#F0BE4A').offsetHSL((Math.random() - 0.5) * 0.03, 0, (Math.random() - 0.5) * 0.12));
  }
  im.castShadow = true; im.receiveShadow = true;
  return im;
}

function chopsticks(len: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#DDBE8E', roughness: 0.7 });
  for (const dx of [-4.5, 4.5]) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * S, 2.6 * S, len * S, 12), mat);
    m.rotation.z = Math.PI / 2; m.rotation.y = dx * 0.006; m.position.set(0, 2.6 * S, dx * S); m.castShadow = true;
    g.add(m);
  }
  return g;
}

// ---------------- hộp ----------------
function pizzaBox(k: Kit, W: number, D: number, H: number, open: number, withPizza: boolean): THREE.Group {
  const t = 2.6, g = new THREE.Group();
  g.add(trayBody(k, W, D, H, t, { front: 'band', back: 'back', side: 'side' }));
  const pivot = new THREE.Group(); pivot.position.set(0, H * S, -D / 2 * S);
  pivot.add(place(slab(k, W, D, t, art(k, 'hero', W, D)), 0, t / 2, D / 2, -Math.PI / 2));
  const tH = H - 6;
  pivot.add(place(slab(k, W - 10, tH, t, art(k, 'tuck', W - 10, tH)), 0, -tH / 2, D - t * 1.5));
  for (const sx of [-1, 1]) pivot.add(place(slab(k, D - 26, H - 8, t, k.inner), sx * (W / 2 - t * 1.5), -(H - 8) / 2, D / 2, 0, sx * Math.PI / 2));
  pivot.rotation.x = -open;
  g.add(pivot);
  if (withPizza) { const pz = pizza(W * 0.43, k.aniso); pz.position.y = t * S; g.add(pz); }
  return g;
}

function mealBox(k: Kit, W: number, D: number, H: number): THREE.Group {
  const t = 1.2, g = new THREE.Group();
  g.add(trayBody(k, W, D, H, t, { front: 'bandSlot', back: 'back', side: 'side' }));
  g.add(place(slab(k, W, D, t, art(k, 'hero', W, D)), 0, H + t / 2, 0, -Math.PI / 2));
  // lưỡi gài: gập xuống ngoài thành trước, cài vào khe (mặt ngoài = màu nền nắp)
  const tw = Math.min(40, W * 0.24);
  const tongue = new THREE.Mesh(new THREE.BoxGeometry(tw * S, 12 * S, t * S), [k.inner, k.inner, k.inner, k.inner, art(k, 'tuck', tw, 12), k.inner]);
  tongue.castShadow = true;
  g.add(place(tongue, 0, H - 5, D / 2 + t * 0.6));
  const slit = new THREE.Mesh(new THREE.BoxGeometry((tw + 2) * S, 0.9 * S, 0.4 * S), new THREE.MeshBasicMaterial({ color: '#1E1712' }));
  g.add(place(slit, 0, H - 11.5, D / 2 + 0.05));
  return g;
}

function burgerBox(k: Kit, B: number, Ht: number, open: number): THREE.Group {
  const t = 1.3, h = Ht / 2, g = new THREE.Group();
  g.add(trayBody(k, B, B, h, t, { front: 'band', back: 'back', side: 'side' }));
  const pivot = new THREE.Group(); pivot.position.set(0, h * S, -B / 2 * S);
  pivot.add(place(slab(k, B, h, t, art(k, 'plain', B, h)), 0, h / 2, t / 2, 0, Math.PI));
  pivot.add(place(slab(k, B, B, t, art(k, 'hero', B, B)), 0, h + t / 2, B / 2, -Math.PI / 2));
  pivot.add(place(slab(k, B, h, t, art(k, 'band', B, h)), 0, h / 2, B - t / 2));
  for (const sx of [-1, 1]) pivot.add(place(slab(k, B - 2 * t, h, t, art(k, 'side', B, h)), sx * (B / 2 - t / 2), h / 2, B / 2, 0, sx * Math.PI / 2));
  pivot.rotation.x = -open;
  g.add(pivot);
  const bg = burger(B * 0.36); bg.position.y = t * S; g.add(bg);
  return g;
}

function quad(p: THREE.Vector3[], uv: number[], mat: THREE.Material): THREE.Mesh {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(p.flatMap((v) => [v.x, v.y, v.z]), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

function boatTray(k: Kit, W: number, D: number, H: number): THREE.Group {
  const g = new THREE.Group(), t = 1.2;
  const f = H * 0.32, Hv = Math.sqrt(H * H - f * f);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x * S, y * S, z * S);
  g.add(place(slab(k, W, D, t, k.inner), 0, t / 2, 0, Math.PI / 2));
  const y0 = t, y1 = t + Hv;
  // 4 thành: điểm theo thứ tự (dưới-trái, dưới-phải, trên-phải, trên-trái) nhìn từ NGOÀI
  const walls: { pts: THREE.Vector3[]; role: Role; aw: number }[] = [
    { pts: [V(-W / 2, y0, D / 2), V(W / 2, y0, D / 2), V(W / 2 + f, y1, D / 2 + f), V(-W / 2 - f, y1, D / 2 + f)], role: 'band', aw: W + 2 * f },
    { pts: [V(W / 2, y0, -D / 2), V(-W / 2, y0, -D / 2), V(-W / 2 - f, y1, -D / 2 - f), V(W / 2 + f, y1, -D / 2 - f)], role: 'back', aw: W + 2 * f },
    { pts: [V(-W / 2, y0, -D / 2), V(-W / 2, y0, D / 2), V(-W / 2 - f, y1, D / 2 + f), V(-W / 2 - f, y1, -D / 2 - f)], role: 'side', aw: D + 2 * f },
    { pts: [V(W / 2, y0, D / 2), V(W / 2, y0, -D / 2), V(W / 2 + f, y1, -D / 2 - f), V(W / 2 + f, y1, D / 2 + f)], role: 'side', aw: D + 2 * f },
  ];
  for (const w of walls) {
    const u0 = f / w.aw;
    g.add(quad(w.pts, [u0, 0, 1 - u0, 0, 1, 1, 0, 1], art(k, w.role, w.aw, H)));
    // mặt trong: lùi vào trong t, đảo chiều
    const c = new THREE.Vector3(0, w.pts[0].y, 0);
    const inner = w.pts.map((p) => p.clone().add(c.clone().sub(p).setY(0).normalize().multiplyScalar(t * S * 0.9)));
    g.add(quad([inner[1], inner[0], inner[3], inner[2]], [1, 0, 0, 0, 0, 1, 1, 1], k.inner));
    // mép trên
    g.add(quad([w.pts[3], w.pts[2], inner[2], inner[3]], [0, 0, 1, 0, 1, 1, 0, 1], new THREE.MeshStandardMaterial({ color: k.edgeColor, roughness: 0.9 })));
  }
  g.add(fries(W, D, H, t));
  return g;
}

async function loadImgs(c: Ctx): Promise<Map<string, HTMLImageElement>> {
  const m = new Map<string, HTMLImageElement>();
  if (c.logo) { const im = new Image(); im.src = c.logo; try { await im.decode(); m.set(c.logo, im); } catch { /* bỏ logo */ } }
  return m;
}

export function foodboxBuilder(spec: FbSpec, data: FbData, logo?: string): Builder {
  return async (aniso) => {
    const c = ctxOf(spec, data, logo);
    const s = fbSize(spec.size);
    const kraft = !!c.pal.kraft;
    const dark = !kraft && (() => { const h = c.pal.bg.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b < 110; })();
    const k: Kit = {
      c, imgs: await loadImgs(c), aniso, kraft, dark,
      inner: innerMat(kraft, aniso),
      edgeColor: kraft ? '#B98B5A' : '#EDE7DA', flute: spec.kind === 'pizza',
    };
    const root = new THREE.Group();
    let view: View = { az: 0.45, el: 0.45 }, zoom = 1.1, aim = 0.4, blob = 0.5;
    if (spec.kind === 'pizza') {
      const closed = pizzaBox(k, s.w, s.d, s.h, 0, false);
      closed.position.set(-s.w * 0.56 * S, 0, s.d * 0.12 * S); closed.rotation.y = 0.16;
      const open = pizzaBox(k, s.w, s.d, s.h, 1.2, true);
      open.position.set(s.w * 0.6 * S, 0, -s.d * 0.12 * S); open.rotation.y = -0.12;
      root.add(closed, open);
      view = { az: 0.12, el: 0.62 }; zoom = 1.36; aim = 0.32; blob = 0.35;
    } else if (spec.kind === 'meal') {
      const b = mealBox(k, s.w, s.d, s.h); b.rotation.y = -0.1; root.add(b);
      const cs = chopsticks(Math.min(210, s.w * 0.95)); cs.position.set(s.w * 0.05 * S, 0, (s.d / 2 + 22) * S); cs.rotation.y = 0.1; root.add(cs);
      view = { az: 0.5, el: 0.5 }; zoom = 1.18; aim = 0.35; blob = 0.55;
    } else if (spec.kind === 'burger') {
      root.add(burgerBox(k, s.w, s.h, 0.5));
      view = { az: 0.42, el: 0.86 }; zoom = 1.15; aim = 0.45; blob = 0.6;
    } else {
      const tr = boatTray(k, s.w, s.d, s.h); tr.rotation.y = -0.08; root.add(tr);
      view = { az: 0.42, el: 0.55 }; zoom = 1.12; aim = 0.45; blob = 0.55;
    }
    return { group: root, view, zoom, aim, blob };
  };
}
