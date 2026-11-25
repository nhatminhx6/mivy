'use client';
// Bảng giá / Menu 3D — 2 cảnh:
//  • 'table': tờ menu ÉP PLASTIC bóng nằm trên mặt bàn gỗ quán (góc hơi cong lên) + 1 tờ dựng trong kệ mica chữ L
//    (2 lớp mica kẹp giấy, mép mica bắt sáng).
//  • 'wall' : bảng giá treo tường — tấm in bồi format trong khung (đen nhôm / gỗ sồi), cách tường, bóng mềm lên tường.
// Texture = canvas chụp đúng bản thiết kế khách đang xem (HTML → canvas ở trang).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';

export type PL3DScene = 'table' | 'wall';
export type PL3DFrame = 'black' | 'oak' | 'white';

export interface PL3DOpts {
  canvas: HTMLCanvasElement | null; // thiết kế (đúng tỉ lệ khổ)
  wMm: number; hMm: number;          // khổ tờ / tấm thật
  scene: PL3DScene;
  frame: PL3DFrame;
}

const rnd = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// loại vật khỏi khung camera (mặt bàn, tường): bbox rỗng → Box3.setFromObject bỏ qua
const noBounds = (m: THREE.Mesh) => { m.geometry.boundingBox = new THREE.Box3(); m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0); return m; };

// mặt bàn gỗ sồi sáng (quán cà phê / quầy lễ tân salon) — ván ghép, vân dọc
function oakTex(aniso: number): THREE.CanvasTexture {
  const W = 2048, H = 2048, c = mk(W, H), x = c.getContext('2d')!, r = rnd(7);
  const planks = 6;
  for (let p = 0; p < planks; p++) {
    const x0 = (p * W) / planks, pw = W / planks;
    x.fillStyle = ['#A9825E', '#A27A56', '#AE8762', '#A47D59', '#AB845F', '#9F7853'][p % 6];
    x.fillRect(x0, 0, pw, H);
    for (let i = 0; i < 70; i++) {
      const xx = x0 + r() * pw, amp = 1 + r() * 5, ph = r() * 6, fr = 0.002 + r() * 0.003;
      x.strokeStyle = r() > 0.45 ? '#6E4C2E' : '#C7A27A'; x.globalAlpha = 0.05 + r() * 0.14; x.lineWidth = 0.5 + r() * 1.6;
      x.beginPath();
      for (let py = 0; py <= H; py += 24) { const xv = xx + Math.sin(py * fr + ph) * amp; if (py) x.lineTo(xv, py); else x.moveTo(xv, py); }
      x.stroke();
    }
    x.globalAlpha = 1; x.fillStyle = 'rgba(60,38,18,0.45)'; x.fillRect(x0, 0, 2, H);
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// tường sơn nhám ấm, loang sáng nhẹ
function wallTex(aniso: number): THREE.CanvasTexture {
  const c = mk(512, 512), x = c.getContext('2d')!, r = rnd(5);
  const g = x.createRadialGradient(200, 150, 20, 256, 256, 520);
  g.addColorStop(0, '#F4F0E8'); g.addColorStop(1, '#E2DBCF');
  x.fillStyle = g; x.fillRect(0, 0, 512, 512);
  const id = x.getImageData(0, 0, 512, 512);
  for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 8; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
  x.putImageData(id, 0, 0);
  return canvasTex(c, aniso);
}

// tờ ép plastic: lưới phẳng nằm trên bàn, 1 góc cong vểnh lên nhẹ
function curled(w: number, h: number, pw: number, ph: number): THREE.PlaneGeometry {
  const geo = new THREE.PlaneGeometry(pw * S, ph * S, 40, 56);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i) / (w * S) + 0.5, v = p.getY(i) / (h * S) + 0.5; // theo khổ giấy (lớp ép rộng hơn vẫn cong cùng)
    const k = Math.max(0, u + (1 - v) - 1.45); // góc dưới-phải vểnh
    const k2 = Math.max(0, (1 - u) + v - 1.7); // góc trên-trái cong rất nhẹ
    p.setZ(i, (k * k * 46 + k2 * k2 * 18) * S);
  }
  geo.computeVertexNormals();
  return geo;
}

function laminatedSheet(tex: THREE.Texture, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const geo = curled(w, h, w, h);
  const paper = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.07, side: THREE.DoubleSide }));
  paper.castShadow = true; paper.receiveShadow = true;
  // viền ép plastic thừa ~3mm quanh giấy (trong suốt, bắt sáng)
  const lam = new THREE.Mesh(curled(w, h, w + 6, h + 6), new THREE.MeshPhysicalMaterial({ color: '#F6F8F8', transparent: true, opacity: 0.3, roughness: 0.08, clearcoat: 1, depthWrite: false, side: THREE.DoubleSide }));
  lam.position.z = -0.15 * S;
  g.add(lam, paper);
  g.rotation.x = -Math.PI / 2;
  return g;
}

// tấm mica trong: mặt lớn gần trong suốt, mép dày hơn (bắt sáng xanh nhạt như mica thật)
function acrylic(w: number, h: number, t: number): THREE.Mesh {
  const face = new THREE.MeshPhysicalMaterial({ color: '#F2FAF8', transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.49, specularIntensity: 1, depthWrite: false });
  const edge = new THREE.MeshPhysicalMaterial({ color: '#CFE9E3', transparent: true, opacity: 0.7, roughness: 0.06, clearcoat: 1 });
  const m = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, t * S, 2, Math.min(1.2, t / 2.2) * S), [edge, edge, edge, edge, face, face]);
  m.renderOrder = 3;
  return m;
}

// kệ mica chữ L: đế nằm + tấm dựng nghiêng ra sau; giấy kẹp giữa 2 lớp mica
function acrylicHolder(tex: THREE.Texture, w: number, h: number): THREE.Group {
  const g = new THREE.Group();
  const T = 2.5, pad = 6, tilt = THREE.MathUtils.degToRad(14), depth = Math.max(70, h * 0.3);
  const base = acrylic(w + pad * 2, depth, T);
  base.rotation.x = -Math.PI / 2; base.position.set(0, (T / 2) * S, (depth / 2) * S);
  g.add(base);
  const face = new THREE.Group();
  const back = acrylic(w + pad * 2, h + pad * 2, T);
  back.position.set(0, ((h + pad * 2) / 2) * S, 0);
  const paper = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.1 }));
  paper.position.set(0, (pad + h / 2) * S, (T / 2 + 0.25) * S); paper.castShadow = true;
  const front = acrylic(w + pad * 2, h + pad * 2 - 4, T * 0.8);
  front.position.set(0, ((h + pad * 2 - 4) / 2 + 2) * S, (T + 0.6) * S);
  face.add(back, paper, front);
  face.rotation.x = -tilt; // ngả ra sau
  face.position.set(0, T * S, (depth * 0.22) * S);
  g.add(face);
  // bóng giả mờ dưới đế (mica trong không đổ bóng đậm)
  const sc = mk(128, 128), sx = sc.getContext('2d')!;
  const rg = sx.createRadialGradient(64, 64, 4, 64, 64, 64); rg.addColorStop(0, 'rgba(0,0,0,0.28)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
  sx.fillStyle = rg; sx.fillRect(0, 0, 128, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry((w + 40) * S, (depth + 60) * S), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.05 * S, (depth / 2 - 10) * S);
  g.add(sh);
  return g;
}

function frameMat(f: PL3DFrame, aniso: number): THREE.Material {
  if (f === 'oak') {
    const t = oakTex(aniso); t.repeat.set(0.35, 0.35);
    return new THREE.MeshStandardMaterial({ map: t, color: '#E2CBB0', roughness: 0.55 });
  }
  if (f === 'white') return new THREE.MeshStandardMaterial({ color: '#F2F1EE', roughness: 0.5 });
  return new THREE.MeshStandardMaterial({ color: '#222428', metalness: 0.55, roughness: 0.38 }); // nhôm sơn đen
}

export function pricelistBuilder(o: PL3DOpts): Builder {
  return (aniso) => {
    if (!o.canvas) throw new Error('Chưa chụp xong bản thiết kế');
    const tex = canvasTex(o.canvas, aniso);
    const { wMm: w, hMm: h } = o;
    const root = new THREE.Group();

    if (o.scene === 'table') {
      // mặt bàn tràn khung (không tính vào khung camera)
      const R = Math.max(w, h) * 16;
      const wood = oakTex(aniso); wood.repeat.set(R / 1100, R / 1100);
      const table = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(R * S, R * S), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.5, color: '#EDE6DD' })));
      table.rotation.x = -Math.PI / 2; table.position.y = -0.2 * S; table.receiveShadow = true;
      root.add(table);

      // tờ nằm phía trước-phải, xoay nhẹ
      const lying = laminatedSheet(tex, w, h);
      lying.position.set((w * 0.42) * S, 0.3 * S, (h * 0.34) * S);
      lying.rotation.z = -0.2;
      const lyHolder = new THREE.Group(); lyHolder.add(lying); lyHolder.rotation.y = -0.16;
      root.add(lyHolder);

      // tờ dựng trong kệ mica phía sau-trái
      const holder = acrylicHolder(tex, w, h);
      holder.position.set((-w * 0.62) * S, 0, (-h * 0.42) * S);
      holder.rotation.y = 0.3;
      root.add(holder);

      return { group: root, view: { az: 0.3, el: 0.52 }, aim: 0.42, zoom: 1.32, blob: 0 };
    }

    // ---- treo tường ----
    const F = Math.max(18, Math.min(32, Math.max(w, h) * 0.035)); // bản khung
    const D = 22;                                                // độ dày khung
    const gap = 12;                                              // khung cách tường
    const lift = h * 0.55;
    const art = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, 5 * S), [
      ...Array(4).fill(new THREE.MeshStandardMaterial({ color: '#EDEAE4', roughness: 0.8 })),
      new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.48, clearcoat: 0.5, clearcoatRoughness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: '#DAD5CC', roughness: 0.9 }),
    ]);
    board.castShadow = true; board.receiveShadow = true;
    board.position.z = (gap + D - 6) * S;
    art.add(board);
    const fm = frameMat(o.frame, aniso);
    const bar = (bw: number, bh: number, x: number, y: number) => {
      const m = new THREE.Mesh(new RoundedBoxGeometry(bw * S, bh * S, D * S, 2, 1.6 * S), fm);
      m.position.set(x * S, y * S, (gap + D / 2) * S); m.castShadow = true; return m;
    };
    art.add(
      bar(w + F * 2, F, 0, h / 2 + F / 2), bar(w + F * 2, F, 0, -h / 2 - F / 2),
      bar(F, h, -w / 2 - F / 2, 0), bar(F, h, w / 2 + F / 2, 0),
    );
    // ánh kính/mica bảo vệ mặt bảng (rất nhẹ)
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.06, roughness: 0.03, clearcoat: 1, depthWrite: false }));
    glass.position.z = (gap + D - 1.5) * S; glass.renderOrder = 2;
    art.add(glass);
    art.position.y = (lift + h / 2 + F) * S;
    root.add(art);

    // tường (không tính khung camera)
    const wallW = Math.max(w, h) * 7, wallH = lift + h * 3;
    const wall = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(wallW * S, wallH * S), new THREE.MeshStandardMaterial({ map: wallTex(aniso), roughness: 0.96 })));
    wall.position.set(0, (wallH / 2) * S, 0); wall.receiveShadow = true;
    root.add(wall);
    // bóng mềm lệch phải-dưới lên tường
    const sc = mk(256, Math.max(64, Math.round(256 * (h + F * 2) / (w + F * 2)))), sx = sc.getContext('2d')!;
    sx.filter = 'blur(10px)'; sx.fillStyle = 'rgba(40,30,20,0.75)';
    sx.fillRect(sc.width * 0.08, sc.height * 0.08, sc.width * 0.84, sc.height * 0.84);
    const drop = noBounds(new THREE.Mesh(new THREE.PlaneGeometry((w + F * 2) * 1.18 * S, (h + F * 2) * 1.18 * S), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: 0.32, depthWrite: false })));
    drop.position.set((gap * 0.9) * S, (lift + h / 2 + F - gap * 1.1) * S, 0.3 * S);
    root.add(drop);

    return { group: root, view: { az: 0.36, el: 0.08 }, aim: 0.5, zoom: 1.12, blob: 0, swing: 0.5 };
  };
}
