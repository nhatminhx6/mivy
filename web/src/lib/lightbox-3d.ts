'use client';
// Hộp đèn 3D — chủ quán thấy hộp đèn ĐANG SÁNG buổi tối: mặt đèn phát sáng (emissive = chính thiết kế),
// quầng sáng hắt lên tường gạch tối, khung kim loại có độ dày.
//  - tròn vẫy: đĩa 2 mặt, treo dưới tay đỡ chữ L nhô ra từ tường (+ dây điện), nhìn chéo thấy mặt trước
//  - chữ nhật: hộp gắn sát tường, mặt mica hút nổi
//  - đứng: hộp 2 mặt trên đế bánh xe, đặt vỉa hè trước tường quán
// Đồ gắn tường dùng swing → tự lắc qua lại, không bao giờ lộ mặt sau tường.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, rod, svgTex, type Builder } from './mockup3d';

export interface LB3DOpts {
  kind: 'round' | 'wall' | 'stand';
  front: SVGSVGElement | null; back: SVGSVGElement | null;
  wMm: number; hMm: number; dMm: number;
  frame: string; glow: string; light: string; gloss: boolean; relief: boolean; fontCss: string;
}

// ---------- texture phụ ----------
function brickTex(aniso: number): { map: THREE.CanvasTexture; bump: THREE.CanvasTexture } {
  const W = 1024, H = 1024, bw = 128, bh = 52, m = 7;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const bc = document.createElement('canvas'); bc.width = W; bc.height = H;
  const bx = bc.getContext('2d')!;
  x.fillStyle = '#2B2622'; x.fillRect(0, 0, W, H); // vữa
  bx.fillStyle = '#000'; bx.fillRect(0, 0, W, H);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let row = 0; row * bh < H; row++) {
    const off = row % 2 ? bw / 2 : 0;
    for (let col = -1; col * bw < W + bw; col++) {
      const X = col * bw + off + m / 2, Y = row * bh + m / 2;
      const t = rnd();
      const r = 70 + t * 34, g = 52 + t * 22, b = 44 + t * 16;
      x.fillStyle = `rgb(${r | 0},${g | 0},${b | 0})`;
      x.fillRect(X, Y, bw - m, bh - m);
      bx.fillStyle = '#9a9a9a'; bx.fillRect(X, Y, bw - m, bh - m);
    }
  }
  // lốm đốm + bẩn
  for (let i = 0; i < 9000; i++) {
    const px = rnd() * W, py = rnd() * H, a = rnd() * 0.18;
    x.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,230,200,${a * 0.4})`;
    x.fillRect(px, py, 2, 2);
    bx.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},0,0,${a})`; bx.fillRect(px, py, 2, 2);
  }
  const map = canvasTex(c, aniso), bump = new THREE.CanvasTexture(bc);
  for (const t of [map, bump]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return { map, bump };
}

function concreteTex(aniso: number): THREE.CanvasTexture {
  const N = 512; const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#3A3936'; x.fillRect(0, 0, N, N);
  let seed = 3; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 14000; i++) { const a = rnd() * 0.14; x.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.5})`; x.fillRect(rnd() * N, rnd() * N, 2, 2); }
  x.strokeStyle = 'rgba(0,0,0,0.35)'; x.lineWidth = 3; x.strokeRect(0, 0, N, N); // ron gạch lát
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function glowTex(color: string, aspect = 1): THREE.CanvasTexture {
  const N = 256; const c = document.createElement('canvas'); c.width = N; c.height = Math.round(N / aspect);
  const x = c.getContext('2d')!;
  const col = new THREE.Color(color);
  const rgb = `${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0}`;
  x.save(); x.scale(1, 1 / aspect);
  const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, `rgba(${rgb},0.85)`); g.addColorStop(0.35, `rgba(${rgb},0.4)`); g.addColorStop(0.7, `rgba(${rgb},0.12)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, N, N); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// nền/quầng sáng không tính vào khung hình (lõi 3D ôm theo bbox → chỉ ôm hộp đèn), không bị cull
function noBounds<T extends THREE.Mesh>(m: T): T {
  m.geometry.boundingBox = new THREE.Box3();
  m.frustumCulled = false;
  return m;
}

const glowMat = (color: string, opacity: number, aspect = 1) => new THREE.MeshBasicMaterial({
  map: glowTex(color, aspect), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
});

function faceMat(tex: THREE.Texture, o: LB3DOpts): THREE.MeshPhysicalMaterial {
  // ánh sáng đèn = chính thiết kế phát sáng; albedo tối bớt để đèn studio không cộng dồn làm cháy sáng chữ
  return new THREE.MeshPhysicalMaterial({
    map: tex, color: '#5E5E5E', emissiveMap: tex, emissive: new THREE.Color(o.light), emissiveIntensity: 0.92,
    roughness: o.gloss ? 0.22 : 0.75, clearcoat: o.gloss ? 0.7 : 0, clearcoatRoughness: 0.15,
    bumpMap: o.relief ? tex : null, bumpScale: o.relief ? 1.6 : 0,
  });
}

const frameMat = (hex: string) => {
  const light = new THREE.Color(hex).getHSL({ h: 0, s: 0, l: 0 }).l > 0.6;
  return new THREE.MeshStandardMaterial({ color: hex, metalness: light ? 0.75 : 0.55, roughness: light ? 0.3 : 0.38 });
};

// tường gạch + nền vỉa hè (đủ rộng để lấp khung hình)
function backdrop(o: { w: number; h: number; z: number; floor: boolean }, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const { map, bump } = brickTex(aniso);
  map.repeat.set(o.w / 1200, o.h / 1200); bump.repeat.copy(map.repeat);
  const wall = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(o.w * S, o.h * S), new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 2.2, roughness: 0.92, color: '#B8B0A8' })));
  wall.position.set(0, (o.h / 2) * S, o.z * S); wall.receiveShadow = true;
  g.add(wall);
  if (o.floor) {
    const fd = 9000;
    const ft = concreteTex(aniso); ft.repeat.set(o.w / 600, fd / 600);
    const floor = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(o.w * S, fd * S), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.9, color: '#9C9890' })));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.3 * S, (o.z + fd / 2) * S); floor.receiveShadow = true;
    g.add(floor);
  }
  return g;
}

export function lightboxBuilder(o: LB3DOpts): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong mặt đèn');
    const W = o.wMm, H = o.hMm, D = o.dMm;
    const px = Math.round(Math.min(2400, Math.max(1400, Math.max(W, H) * 2.6)));
    const ftex = await svgTex(o.front, o.fontCss, px, aniso, '');
    const btex = o.back ? await svgTex(o.back, o.fontCss, px, aniso, '') : ftex;
    const g = new THREE.Group();
    const fm = frameMat(o.frame), dark = new THREE.MeshStandardMaterial({ color: '#1E2024', metalness: 0.6, roughness: 0.42 });

    if (o.kind === 'round') {
      const R = W / 2, Yc = R + 900, zc = R + 200;
      g.add(backdrop({ w: 20000, h: Yc + R + 4000, z: 0, floor: false }, aniso));
      const sign = new THREE.Group(); sign.position.set(0, Yc * S, zc * S); g.add(sign);
      // vành (mặt bên đĩa) + gờ 2 mép
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(R * S, R * S, D * S, 120, 1, true), fm);
      rim.rotation.z = Math.PI / 2; rim.castShadow = true; sign.add(rim);
      for (const sx of [1, -1]) {
        const lip = new THREE.Mesh(new THREE.TorusGeometry(R * S, 7 * S, 12, 120), fm);
        lip.rotation.y = Math.PI / 2; lip.position.x = (sx * D) / 2 * S; lip.castShadow = true; sign.add(lip);
        const face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.985 * S, 120), faceMat(sx > 0 ? ftex : btex, o));
        face.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
        face.position.x = (sx * (D / 2 - 2)) * S;
        sign.add(face);
      }
      // ruột sáng (thấy qua khe) + quầng sáng quanh đĩa
      for (const sx of [1, -1]) { // quầng sáng tỏa quanh mép đĩa, nằm sau mặt đèn (mặt che phần giữa → chỉ thấy viền sáng)
        const halo = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(R * 3 * S, R * 3 * S), glowMat(o.glow, 0.5)));
        halo.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; halo.position.x = (sx * (D / 2 - 6)) * S; sign.add(halo);
      }
      // tay đỡ chữ L: bản đế bắt tường + thanh ngang + 2 thanh treo + thanh chống chéo + dây điện
      const armY = Yc + R + 90, armZ1 = zc + R * 0.55;
      const plate = new THREE.Mesh(new RoundedBoxGeometry(90 * S, 300 * S, 12 * S, 2, 3 * S), dark);
      plate.position.set(0, (armY - 90) * S, 6 * S); plate.castShadow = true; g.add(plate);
      const arm = new THREE.Mesh(new RoundedBoxGeometry(34 * S, 34 * S, armZ1 * S, 2, 4 * S), dark);
      arm.position.set(0, armY * S, (armZ1 / 2) * S); arm.castShadow = true; g.add(arm);
      g.add(rod(new THREE.Vector3(0, (armY - 230) * S, 10 * S), new THREE.Vector3(0, armY * S, Math.min(armZ1 * 0.55, zc) * S), 9 * S, dark));
      for (const dz of [-R * 0.45, R * 0.45]) {
        const zz = zc + dz;
        const yTop = Yc + Math.sqrt(R * R - dz * dz);
        g.add(rod(new THREE.Vector3(0, (armY - 17) * S, zz * S), new THREE.Vector3(0, (yTop - 4) * S, zz * S), 5 * S, dark));
        const eye = new THREE.Mesh(new THREE.TorusGeometry(11 * S, 3.5 * S, 8, 20), dark);
        eye.position.set(0, (yTop + 8) * S, zz * S); g.add(eye);
      }
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, (armY - 150) * S, 4 * S), new THREE.Vector3(14 * S, (armY - 60) * S, 120 * S), new THREE.Vector3(10 * S, (Yc + R + 30) * S, zc * S), new THREE.Vector3(0, (Yc + R) * S, zc * S),
      ]), 30, 4 * S, 6), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6 }));
      g.add(cable);
      // quầng sáng hắt lên tường
      const wg = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(R * 5.5 * S, R * 4.6 * S), glowMat(o.glow, 0.45)));
      wg.position.set(0, Yc * S, 1.5 * S); g.add(wg);
      return { group: g, view: { az: 0.88, el: 0.06 }, aim: 0.52, zoom: 1.12, blob: 0, swing: 0.36 };
    }

    if (o.kind === 'wall') {
      const Yc = H / 2 + 1500;
      g.add(backdrop({ w: 20000, h: Yc + H / 2 + 4000, z: 0, floor: false }, aniso));
      const box = new THREE.Mesh(new RoundedBoxGeometry((W + 40) * S, (H + 40) * S, D * S, 4, 10 * S), fm);
      box.position.set(0, Yc * S, (D / 2) * S); box.castShadow = true; g.add(box);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), faceMat(ftex, o));
      face.position.set(0, Yc * S, (D + 0.8) * S); g.add(face);
      // nẹp viền nổi quanh mặt mica
      const lipM = fm;
      for (const [w, h, x, y] of [[W + 40, 16, 0, H / 2 + 12], [W + 40, 16, 0, -H / 2 - 12], [16, H + 40, W / 2 + 12, 0], [16, H + 40, -W / 2 - 12, 0]] as const) {
        const l = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, 10 * S, 2, 3 * S), lipM);
        l.position.set(x * S, (Yc + y) * S, (D + 2) * S); g.add(l);
      }
      const wg = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(W * 2.6 * S, H * 3 * S), glowMat(o.glow, 0.62, (W * 2.6) / (H * 3))));
      wg.position.set(0, Yc * S, 1.5 * S); g.add(wg);
      return { group: g, view: { az: 0.42, el: 0.05 }, aim: 0.5, zoom: 0.9, blob: 0, swing: 0.5 };
    }

    // ---- hộp đèn đứng 2 mặt trên đế bánh xe ----
    const wheelH = 55, baseH = 70, y0 = wheelH + baseH;
    const wallZ = -(D / 2 + 700);
    g.add(backdrop({ w: 20000, h: H + y0 + 4000, z: wallZ, floor: true }, aniso));
    const cab = new THREE.Mesh(new RoundedBoxGeometry((W + 50) * S, (H + 50) * S, D * S, 4, 12 * S), fm);
    cab.position.set(0, (y0 + (H + 50) / 2) * S, 0); cab.castShadow = true; g.add(cab);
    const yc = y0 + (H + 50) / 2;
    const ff = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), faceMat(ftex, o));
    ff.position.set(0, yc * S, (D / 2 + 0.8) * S); g.add(ff);
    const bf = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), faceMat(btex, o));
    bf.rotation.y = Math.PI; bf.position.set(0, yc * S, -(D / 2 + 0.8) * S); g.add(bf);
    // tay nắm trên đỉnh
    g.add(rod(new THREE.Vector3(-W * 0.18 * S, (y0 + H + 50) * S, 0), new THREE.Vector3(-W * 0.18 * S, (y0 + H + 95) * S, 0), 7 * S, dark));
    g.add(rod(new THREE.Vector3(W * 0.18 * S, (y0 + H + 50) * S, 0), new THREE.Vector3(W * 0.18 * S, (y0 + H + 95) * S, 0), 7 * S, dark));
    g.add(rod(new THREE.Vector3(-W * 0.18 * S, (y0 + H + 95) * S, 0), new THREE.Vector3(W * 0.18 * S, (y0 + H + 95) * S, 0), 8 * S, dark));
    // đế + 4 bánh xe
    const base = new THREE.Mesh(new RoundedBoxGeometry((W + 140) * S, baseH * S, (D + 220) * S, 3, 10 * S), dark);
    base.position.set(0, (wheelH + baseH / 2) * S, 0); base.castShadow = true; g.add(base);
    const tire = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wv = new THREE.Mesh(new THREE.CylinderGeometry(26 * S, 26 * S, 20 * S, 20), tire);
      wv.rotation.z = Math.PI / 2; wv.position.set(sx * (W / 2 + 30) * S, 27 * S, sz * (D / 2 + 70) * S); wv.castShadow = true; g.add(wv);
      const fork = new THREE.Mesh(new THREE.BoxGeometry(30 * S, 26 * S, 30 * S), dark);
      fork.position.set(sx * (W / 2 + 30) * S, (wheelH - 4) * S, sz * (D / 2 + 70) * S); g.add(fork);
    }
    // dây điện chạy xuống đất
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3((W / 2 + 20) * S, (y0 + 30) * S, -(D / 2 - 10) * S), new THREE.Vector3((W / 2 + 120) * S, 30 * S, -(D / 2 + 60) * S), new THREE.Vector3((W / 2 + 360) * S, 4 * S, (wallZ + 120) * S),
    ]), 30, 4 * S, 6), new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.6 })));
    // quầng sáng: tường phía sau + vỉa hè quanh chân
    const wg = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(W * 3.4 * S, H * 2.4 * S), glowMat(o.glow, 0.4, (W * 3.4) / (H * 2.4))));
    wg.position.set(0, yc * S, (wallZ + 1.5) * S); g.add(wg);
    const fg = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(W * 3.4 * S, (D + 1100) * S), glowMat(o.glow, 0.3, (W * 3.4) / (D + 1100))));
    fg.rotation.x = -Math.PI / 2; fg.position.set(0, 1 * S, 160 * S); g.add(fg);
    for (const sz of [1, -1]) { // quầng sáng quanh mép mặt đèn
      const halo = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(W * 1.9 * S, H * 1.45 * S), glowMat(o.glow, 0.32, (W * 1.9) / (H * 1.45))));
      if (sz < 0) halo.rotation.y = Math.PI;
      halo.position.set(0, yc * S, sz * (D / 2 - 6) * S); g.add(halo);
    }
    return { group: g, view: { az: 0.55, el: 0.1 }, aim: 0.5, zoom: 1.45, blob: 0, swing: 0.5 };
  };
}
