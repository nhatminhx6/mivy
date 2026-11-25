'use client';
// Tranh dán tường 3D: góc quán/phòng — tranh phủ kín bức tường chính (vạch nối tấm mờ), tường bên sơn trơn,
// sàn gỗ, bàn tròn + 2 ghế bistro, đèn thả ánh ấm, chậu cây. Có cửa/cửa sổ (nếu khai báo) dựng nổi trên tường.
// swing: chỉ lắc trước mặt tường, không lộ mặt sau.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface WM3DOpts {
  tex: SVGSVGElement | null; W: number; H: number; fontCss: string;
  obs: { on: boolean; x: number; y: number; w: number; h: number } | null;
  dark: boolean;
  kind: 'cafe' | 'office'; side: 1 | -1; // kiểu cảnh + bên đặt đồ (bên ít nội dung của tranh)
}

function woodFloor(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d')!;
  let sd = 9; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  const rows = 8, ph = 1024 / rows;
  for (let j = 0; j < rows; j++) {
    let px = -r() * 400;
    while (px < 1024) {
      const pw = 320 + r() * 260;
      const l = 0.82 + r() * 0.22;
      x.fillStyle = `rgb(${Math.round(176 * l)},${Math.round(128 * l)},${Math.round(86 * l)})`;
      x.fillRect(px, j * ph, pw, ph);
      // vân gỗ dọc tấm
      x.strokeStyle = `rgba(90,55,30,${0.08 + r() * 0.08})`; x.lineWidth = 1.2;
      for (let k = 0; k < 7; k++) {
        const yy = j * ph + r() * ph; x.beginPath(); x.moveTo(px, yy);
        x.bezierCurveTo(px + pw * 0.3, yy + (r() - 0.5) * 10, px + pw * 0.7, yy + (r() - 0.5) * 10, px + pw, yy + (r() - 0.5) * 6); x.stroke();
      }
      x.fillStyle = 'rgba(40,24,12,0.55)'; x.fillRect(px, j * ph, 2, ph);
      px += pw;
    }
    x.fillStyle = 'rgba(40,24,12,0.5)'; x.fillRect(0, j * ph, 1024, 2);
  }
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
const cyl = (rt: number, rb: number, h: number, mat: THREE.Material, seg = 32) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = true; m.receiveShadow = true; return m; };
const box = (w: number, h: number, d: number, mat: THREE.Material) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.castShadow = true; m.receiveShadow = true; return m; };

function chair(wood: THREE.Material, metal: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const seat = cyl(215, 205, 38, wood); seat.position.y = 455; g.add(seat);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const top = new THREE.Vector3(Math.cos(a) * 140, 440, Math.sin(a) * 140), bot = new THREE.Vector3(Math.cos(a) * 190, 0, Math.sin(a) * 190);
    const leg = cyl(11, 9, top.distanceTo(bot), metal, 12);
    leg.position.copy(top).add(bot).multiplyScalar(0.5);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), top.clone().sub(bot).normalize());
    g.add(leg);
    if (k === 0) { const ring = new THREE.Mesh(new THREE.TorusGeometry(170, 7, 8, 48), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 170; g.add(ring); }
  }
  // tựa lưng cong (nửa vòng) + 2 thanh đứng — hướng -z (lưng ghế quay ra tường)
  const back = new THREE.Mesh(new THREE.TorusGeometry(190, 16, 10, 48, Math.PI), wood);
  back.rotation.x = Math.PI / 2; back.rotation.z = Math.PI; back.position.y = 760; back.castShadow = true; g.add(back);
  for (const sx of [-1, 1]) { const rod = cyl(10, 10, 300, metal, 10); rod.position.set(sx * 170, 615, -40); rod.rotation.x = -0.1; g.add(rod); }
  return g;
}

export function wallmuralBuilder(o: WM3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong tranh');
    const { W, H } = o;
    const outW = W >= H ? 2048 : Math.round((2048 * W) / H);
    const tex = await svgTex(o.tex, o.fontCss, Math.max(512, outW), aniso, '');
    tex.anisotropy = aniso;
    const D = Math.min(2600, Math.max(1900, W * 0.55)); // sâu sàn

    const sc = new THREE.Group(); // đơn vị mm
    // tường tranh: decal mờ (matte, hơi nhám)
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0 }));
    wall.position.set(0, H / 2, 0); wall.receiveShadow = true; sc.add(wall);
    // tường bên (trái) sơn trơn + phần trần mỏng
    const paint = new THREE.MeshStandardMaterial({ color: o.dark ? '#D9D2C6' : '#EDE6DA', roughness: 0.95 });
    const side = new THREE.Mesh(new THREE.PlaneGeometry(D, H), paint);
    side.rotation.y = Math.PI / 2; side.position.set(-W / 2, H / 2, D / 2); side.receiveShadow = true; sc.add(side);
    // sàn gỗ
    const ft = woodFloor(aniso); ft.repeat.set(W / 2400, D / 2400);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ft, roughness: 0.6, metalness: 0 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0.6, D / 2); floor.receiveShadow = true; sc.add(floor);
    // len chân tường
    const skirt = new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.6 });
    const sk1 = box(W, 80, 14, skirt); sk1.position.set(0, 40, 7); sc.add(sk1);
    const sk2 = box(14, 80, D, skirt); sk2.position.set(-W / 2 + 7, 40, D / 2); sc.add(sk2);

    // cửa / cửa sổ nằm trên tường (toạ độ tường y hướng xuống → 3D y hướng lên)
    let doorSide = 0; // -1 trái / 1 phải (né bàn ghế)
    if (o.obs?.on && o.obs.w > 0 && o.obs.h > 0) {
      const ob = o.obs;
      const cx = -W / 2 + ob.x + ob.w / 2, top = H - ob.y, bot = H - ob.y - ob.h;
      doorSide = cx > 0 ? 1 : -1;
      const isDoor = bot < 60;
      const frameM = new THREE.MeshStandardMaterial({ color: '#F2EEE6', roughness: 0.5 });
      const fw = 55;
      const fl = box(fw, top - bot, 40, frameM); fl.position.set(cx - ob.w / 2 + fw / 2, (top + bot) / 2, 20); sc.add(fl);
      const fr = box(fw, top - bot, 40, frameM); fr.position.set(cx + ob.w / 2 - fw / 2, (top + bot) / 2, 20); sc.add(fr);
      const ft2 = box(ob.w, fw, 40, frameM); ft2.position.set(cx, top - fw / 2, 20); sc.add(ft2);
      if (isDoor) {
        const leafM = new THREE.MeshStandardMaterial({ color: '#8A5A3B', roughness: 0.55 });
        const leaf = box(ob.w - fw * 2, top - bot - fw, 36, leafM); leaf.position.set(cx, bot + (top - bot - fw) / 2, 18); sc.add(leaf);
        for (const [py, ph] of [[0.62, 0.3], [0.2, 0.3]] as const) {
          const pn = box((ob.w - fw * 2) * 0.72, (top - bot) * ph, 10, new THREE.MeshStandardMaterial({ color: '#7A4E33', roughness: 0.6 }));
          pn.position.set(cx, bot + (top - bot) * (py + ph / 2 - 0.05), 38); sc.add(pn);
        }
        const handle = cyl(14, 14, 130, new THREE.MeshStandardMaterial({ color: '#C9B48A', metalness: 0.9, roughness: 0.25 }), 12);
        handle.rotation.z = Math.PI / 2; handle.position.set(cx + (ob.w / 2 - fw) * 0.72 * (cx > 0 ? -1 : 1), bot + 1000, 52); sc.add(handle);
      } else {
        const fb = box(ob.w, fw, 60, frameM); fb.position.set(cx, bot + fw / 2, 30); sc.add(fb);
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(ob.w - fw * 2, top - bot - fw * 2), new THREE.MeshStandardMaterial({ color: '#CFE3F2', emissive: '#BFD8EE', emissiveIntensity: 0.55, roughness: 0.1, metalness: 0.2 }));
        glass.position.set(cx, (top + bot) / 2, 8); sc.add(glass);
        const mullion = box(24, top - bot - fw * 2, 20, frameM); mullion.position.set(cx, (top + bot) / 2, 14); sc.add(mullion);
      }
    }

    // đồ nội thất thấp, dạt về 1 bên (né cửa, né phần chữ chính của tranh) để khách thấy rõ tranh
    const fside = doorSide !== 0 ? -doorSide : o.side;
    const wood = new THREE.MeshStandardMaterial({ color: '#9C6B43', roughness: 0.55 });
    const metal = new THREE.MeshStandardMaterial({ color: '#2A2A2C', metalness: 0.7, roughness: 0.38 });
    const plantX = fside * Math.max(0, W / 2 - 260);
    if (o.kind === 'cafe') {
      const tx = fside * Math.max(0, W / 2 - 1080), tz = Math.min(950, D * 0.38);
      const marble = new THREE.MeshPhysicalMaterial({ color: '#F3F1EC', roughness: 0.28, clearcoat: 0.5 });
      const table = new THREE.Group();
      const top = cyl(390, 390, 28, marble, 48); top.position.y = 742; table.add(top);
      const stem = cyl(32, 32, 700, metal, 16); stem.position.y = 370; table.add(stem);
      const base = cyl(240, 250, 18, metal, 40); base.position.y = 9; table.add(base);
      const cupM = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.2, clearcoat: 0.8 });
      const cup = cyl(48, 38, 90, cupM, 24); cup.position.set(90, 801, 40); table.add(cup);
      const saucer = cyl(85, 80, 8, cupM, 32); saucer.position.set(90, 760, 40); table.add(saucer);
      table.position.set(tx, 0, tz); sc.add(table);
      for (const sx of [-1, 1]) {
        const ch = chair(wood, metal);
        ch.position.set(tx + sx * 560, 0, tz + 60);
        ch.rotation.y = sx * -1.25;
        sc.add(ch);
      }
    } else {
      // ghế băng gỗ thấp + 2 gối tựa (sảnh văn phòng)
      const bw = Math.min(1300, W * 0.27), bx = fside * Math.max(0, W / 2 - 140 - bw / 2), bz = 330;
      const slab = box(bw, 55, 420, wood); slab.position.set(bx, 420, bz); sc.add(slab);
      for (const lx of [-1, 1]) { const leg = box(50, 395, 360, metal); leg.position.set(bx + lx * (bw / 2 - 90), 197, bz); sc.add(leg); }
      const cushM = [new THREE.MeshStandardMaterial({ color: '#CFC8BC', roughness: 0.92 }), new THREE.MeshStandardMaterial({ color: '#B8673F', roughness: 0.92 })];
      [-0.24, 0.16].forEach((cx, i) => {
        const c = new THREE.Mesh(new RoundedBoxGeometry(360, 340, 110, 4, 50), cushM[i]);
        c.position.set(bx + cx * bw, 610, bz - 110); c.rotation.set(-0.2, 0, (i ? -1 : 1) * 0.08); c.castShadow = true; sc.add(c);
      });
      // sách + ly trên ghế
      const book = box(240, 30, 170, new THREE.MeshStandardMaterial({ color: '#C2552F', roughness: 0.7 })); book.position.set(bx + bw * 0.36, 462, bz + 40); book.rotation.y = 0.3; sc.add(book);
    }
    // ánh đèn ấm (không vẽ chao đèn để không che tranh)
    const lamp = new THREE.PointLight('#FFC88A', 1.6, 0, 1.1); lamp.position.set(fside * W * 0.25, H * 0.85, 1400); sc.add(lamp);

    // chậu cây lưỡi hổ sát góc (cảnh quán)
    if (o.kind === 'cafe') {
    const px = plantX;
    const pot = cyl(160, 125, 340, new THREE.MeshStandardMaterial({ color: '#D8D2C8', roughness: 0.55 }), 32);
    pot.position.set(px, 170, 300); sc.add(pot);
    const soil = cyl(150, 150, 10, new THREE.MeshStandardMaterial({ color: '#4A3526', roughness: 1 }), 24); soil.position.set(px, 335, 300); sc.add(soil);
    const leafM = [new THREE.MeshStandardMaterial({ color: '#2E5E3E', roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: '#3F7A4E', roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: '#557F3F', roughness: 0.5 })];
    let sd = 4; const rr = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2 + rr() * 0.5, rad = 25 + rr() * 85, hgt = 480 + rr() * 460;
      const lf = new THREE.Mesh(new THREE.ConeGeometry(42, hgt, 4, 1), leafM[k % 3]);
      lf.scale.set(1, 1, 0.18);
      lf.position.set(px + Math.cos(a) * rad, 340 + hgt / 2, 300 + Math.sin(a) * rad);
      lf.rotation.set(Math.sin(a) * 0.18, a, -Math.cos(a) * 0.18);
      lf.castShadow = true; sc.add(lf);
    }
    }

    sc.scale.setScalar(S);
    const root = new THREE.Group(); root.add(sc);
    // khung nhìn bám bức tranh (cả cảnh lớn hơn): zoom = bán kính cảnh / bán kính tường
    root.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(root);
    const wb = new THREE.Box3().setFromObject(wall);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rWall = wb.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rWall) * 1.25;
    const aim = ((wb.min.y + wb.max.y) / 2 - all.min.y) / (all.max.y - all.min.y);
    return { group: root, view: { az: 0.34, el: 0.12 }, aim, zoom, blob: 0, swing: 0.5 };
  };
}
