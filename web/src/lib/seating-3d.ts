'use client';
// Sơ đồ chỗ ngồi 3D: bảng formex 5mm đặt trên giá vẽ gỗ (nghiêng 10°, khay đỡ, kẹp đỉnh, chân sau) cạnh 1 bàn tiệc tròn
// phủ khăn trắng có nếp rủ: đĩa sứ, ly thuỷ tinh, thẻ tên gấp đôi đứng trên đĩa (đúng tên khách), thẻ số bàn trong chân
// kim loại, bình hoa nhỏ giữa bàn. Texture = đúng file in (SVG). Ép kim: lớp kim loại vàng theo khuôn nhũ (trắng = nhũ).

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface Seating3DOpts {
  board: SVGSVGElement | null; boardFoil?: SVGSVGElement | null; wMm: number; hMm: number;
  places: SVGSVGElement[]; number: SVGSVGElement | null; fontCss: string;
  accent: string; accent2: string; gold: boolean; cardColor: string;
}

const TILT = THREE.MathUtils.degToRad(10);
const BOARD_T = 5;   // formex 5mm
const PT = 0.45;     // giấy thẻ tên

function woodTex(aniso: number, base: string, dark: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 1024;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 512, 1024);
  let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 120; i++) {
    const x0 = r() * 512, amp = 2 + r() * 6, ph = r() * 6, fr = 0.004 + r() * 0.006;
    x.strokeStyle = dark; x.globalAlpha = 0.06 + r() * 0.16; x.lineWidth = 0.6 + r() * 2;
    x.beginPath();
    for (let py = 0; py <= 1024; py += 16) { const px = x0 + Math.sin(py * fr + ph) * amp; if (py) x.lineTo(px, py); else x.moveTo(px, py); }
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** thanh gỗ tiết diện a×b (mm) nối 2 điểm (đơn vị 3D) */
function bar(p0: THREE.Vector3, p1: THREE.Vector3, a: number, b: number, mat: THREE.Material): THREE.Mesh {
  const d = new THREE.Vector3().subVectors(p1, p0);
  const m = new THREE.Mesh(new THREE.BoxGeometry(a * S, d.length(), b * S), mat);
  m.position.copy(p0).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** không tính vào khung hình (khăn bàn, đồ trang trí lớn) */
const noFrame = (o: THREE.Object3D) => o.traverse((n) => {
  const m = n as THREE.Mesh;
  if (m.geometry) { m.geometry.boundingBox = new THREE.Box3(); m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0); m.frustumCulled = false; }
});

function lathe(profile: [number, number][], seg: number, mat: THREE.Material): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r * S, y * S)), seg), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function seatingBuilder(o: Seating3DOpts): Builder {
  return async (aniso) => {
    if (!o.board) throw new Error('Chưa dựng xong sơ đồ');
    const W = o.wMm, H = o.hMm;
    const g = new THREE.Group();

    // ---------- giá vẽ + bảng ----------
    const wood = new THREE.MeshStandardMaterial({ map: woodTex(aniso, '#B98A5A', '#6E4A2A'), roughness: 0.62 });
    const E = new THREE.Group();
    const ledgeY = H > 800 ? 640 : 760;
    const hTop = ledgeY + 22 + H + 26;
    const legX0 = W * 0.36, legX1 = 16;
    for (const sx of [-1, 1]) E.add(bar(new THREE.Vector3(sx * legX0 * S, 0, 0), new THREE.Vector3(sx * legX1 * S, hTop * S, 0), 30, 22, wood));
    const ledgeW = W * 0.82;
    const ledge = new THREE.Mesh(new THREE.BoxGeometry(ledgeW * S, 22 * S, 58 * S), wood);
    ledge.position.set(0, (ledgeY + 11) * S, 40 * S); ledge.castShadow = true; ledge.receiveShadow = true; E.add(ledge);
    const lip = new THREE.Mesh(new THREE.BoxGeometry(ledgeW * S, 34 * S, 9 * S), wood);
    lip.position.set(0, (ledgeY + 17) * S, 69 * S); lip.castShadow = true; E.add(lip);
    // bảng formex: mặt in +z, cạnh + lưng trắng
    const tex = await svgTex(o.board, o.fontCss, 2048, aniso);
    const edge = new THREE.MeshStandardMaterial({ color: '#F4F3EF', roughness: 0.9 });
    const face = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.15, clearcoatRoughness: 0.6 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(W * S, H * S, BOARD_T * S), [edge, edge, edge, edge, face, edge]);
    const bz = 11 + BOARD_T / 2 + 2;
    board.position.set(0, (ledgeY + 22 + H / 2) * S, bz * S); board.castShadow = true; board.receiveShadow = true; E.add(board);
    if (o.boardFoil) {
      const ft = await svgTex(o.boardFoil, o.fontCss, 2048, aniso, '#000000');
      const foil = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), new THREE.MeshPhysicalMaterial({
        color: '#E2C178', metalness: 1, roughness: 0.24, alphaMap: ft, transparent: true, alphaTest: 0.45, clearcoat: 0.4,
      }));
      foil.position.set(0, board.position.y, (bz + BOARD_T / 2 + 0.06) * S); E.add(foil);
    }
    // kẹp đỉnh
    const clamp = new THREE.Mesh(new THREE.BoxGeometry(84 * S, 46 * S, 44 * S), wood);
    clamp.position.set(0, (ledgeY + 22 + H + 6) * S, 22 * S); clamp.castShadow = true; E.add(clamp);
    E.rotation.x = -TILT;
    g.add(E);
    // chân sau (toạ độ thế giới)
    E.updateMatrixWorld(true);
    const apex = new THREE.Vector3(0, (hTop - 30) * S, -12 * S).applyMatrix4(E.matrixWorld);
    g.add(bar(apex, new THREE.Vector3(0, 0, -(hTop * 0.42) * S), 26, 20, wood));

    // ---------- bàn tiệc tròn ----------
    const R = 640, TH = 760;
    const tx = W * 0.5 + 420, tz = -(R + 430);
    const T = new THREE.Group(); T.position.set(tx * S, 0, tz * S); g.add(T);
    const cloth = new THREE.LatheGeometry([
      [0, TH], [R, TH], [R + 9, TH - 4], [R + 16, TH - 18], [R + 30, TH - 120], [R + 60, 260], [R + 92, 8], [R + 92, 0],
    ].map(([r, y]) => new THREE.Vector2(r * S, y * S)), 120);
    const pos = cloth.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / S;
      if (y > TH - 14) continue;
      const x = pos.getX(i), z = pos.getZ(i);
      const r0 = Math.hypot(x, z), phi = Math.atan2(x, z);
      const k = Math.min(1, (TH - 14 - y) / 300);
      const r1 = r0 + (Math.sin(phi * 21) * 9 + Math.sin(phi * 7 + 1.3) * 5) * k * S;
      pos.setX(i, Math.sin(phi) * r1); pos.setZ(i, Math.cos(phi) * r1);
    }
    cloth.computeVertexNormals();
    const clothMesh = new THREE.Mesh(cloth, new THREE.MeshPhysicalMaterial({ color: '#FBFAF6', roughness: 0.82, sheen: 0.6, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.6 }));
    clothMesh.castShadow = true; clothMesh.receiveShadow = true;
    T.add(clothMesh);

    const ceramic = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.22, clearcoat: 0.7, clearcoatRoughness: 0.15 });
    const goldMat = new THREE.MeshStandardMaterial({ color: o.gold ? '#CFAE63' : '#C9CCD1', metalness: 1, roughness: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', roughness: 0.03, transmission: 1, thickness: 0.02, ior: 1.5, transparent: true, opacity: 0.55, clearcoat: 1 });
    const napkin = new THREE.MeshStandardMaterial({ color: o.accent2, roughness: 0.9 });
    // hướng nhìn từ bàn về phía máy ảnh (máy ảnh ở trước, hơi phải)
    const toCam = Math.atan2(400 - tx, 3400 - tz);
    const N = 8;
    const placeTex = await Promise.all(o.places.slice(0, 3).map((el) => svgTex(el, o.fontCss, 768, aniso)));
    const paperEdge = new THREE.MeshStandardMaterial({ color: '#F3F0EA', roughness: 0.85 });
    const cardBack = new THREE.MeshStandardMaterial({ color: o.cardColor, roughness: 0.7 });
    // xếp 8 chỗ, chỗ giữa hướng máy ảnh
    const slots = Array.from({ length: N }, (_, i) => toCam + ((i - 0) / N) * Math.PI * 2);
    slots.forEach((a, i) => {
      const pr = R - 175;
      const px = Math.sin(a) * pr, pz = Math.cos(a) * pr;
      const charger = lathe([[0, 0], [150, 0], [152, 4], [148, 5], [0, 5]], 64, goldMat);
      charger.position.set(px * S, TH * S, pz * S); T.add(charger);
      const plate = lathe([[0, 5], [95, 5], [118, 10], [128, 17], [130, 19], [126, 19], [116, 12], [0, 8]], 64, ceramic);
      plate.position.set(px * S, TH * S, pz * S); T.add(plate);
      // khăn ăn gấp trên đĩa
      const nap = new THREE.Mesh(new THREE.BoxGeometry(95 * S, 10 * S, 55 * S), napkin);
      nap.position.set(px * S, (TH + 15) * S, pz * S); nap.rotation.y = a; nap.castShadow = true; T.add(nap);
      // ly
      const gx = Math.sin(a + 0.32) * (pr - 150), gz = Math.cos(a + 0.32) * (pr - 150);
      const cup = lathe([[0, 0], [34, 0], [34, 2], [4, 4], [3, 90], [30, 110], [40, 150], [42, 200], [40, 200], [38, 150], [28, 112], [0, 100]], 40, glass);
      cup.position.set(gx * S, TH * S, gz * S); cup.castShadow = false; T.add(cup);
      // thẻ tên gấp đôi đứng trên khăn ăn, mặt có tên hướng ra ngoài (về phía khách)
      const ti = i === 0 ? 0 : i === 1 ? 1 : i === N - 1 ? 2 : -1;
      if (ti >= 0 && placeTex[ti]) {
        const tent = new THREE.Group();
        const half = (front: THREE.Material, back: THREE.Material) => {
          const geo = new THREE.BoxGeometry(90 * S, 50 * S, PT * S); geo.translate(0, -25 * S, 0);
          const m = new THREE.Mesh(geo, [paperEdge, paperEdge, paperEdge, paperEdge, front, back]); m.castShadow = true; return m;
        };
        const ang = THREE.MathUtils.degToRad(28);
        const fr = half(new THREE.MeshPhysicalMaterial({ map: placeTex[ti], roughness: 0.45, clearcoat: 0.2 }), paperEdge);
        fr.rotation.x = -ang; tent.add(fr);
        const bk = half(paperEdge, cardBack); bk.rotation.x = ang; tent.add(bk);
        const hgt = 50 * Math.cos(ang);
        tent.position.set(Math.sin(a) * (pr + 40) * S, (TH + 20 + hgt) * S, Math.cos(a) * (pr + 40) * S);
        tent.rotation.y = a;
        T.add(tent);
      }
    });
    // bình hoa giữa bàn
    const vase = lathe([[0, 0], [55, 0], [60, 20], [52, 110], [44, 150], [40, 150], [48, 110], [55, 22], [0, 6]], 48, glass);
    vase.position.set(0, TH * S, 0); T.add(vase);
    const petals = [o.accent2, '#FFFFFF', '#FFFFFF', o.accent2, '#F6EFE6'];
    let seed = 5; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 16; i++) {
      const a = rnd() * Math.PI * 2, rr = rnd() * 90, hy = 190 + rnd() * 70 - rr * 0.35;
      const fl = new THREE.Mesh(new THREE.SphereGeometry((28 + rnd() * 16) * S, 20, 14), new THREE.MeshStandardMaterial({ color: petals[i % petals.length], roughness: 0.75 }));
      fl.position.set(Math.sin(a) * rr * S, (TH + hy) * S, Math.cos(a) * rr * S); fl.scale.y = 0.8; fl.castShadow = true; T.add(fl);
    }
    for (let i = 0; i < 10; i++) {
      const a = rnd() * Math.PI * 2, rr = 70 + rnd() * 60;
      const lf = new THREE.Mesh(new THREE.SphereGeometry(30 * S, 12, 8), new THREE.MeshStandardMaterial({ color: '#7E9A72', roughness: 0.8 }));
      lf.scale.set(1.4, 0.25, 0.55); lf.position.set(Math.sin(a) * rr * S, (TH + 165 + rnd() * 40) * S, Math.cos(a) * rr * S); lf.rotation.set(rnd() * 0.6, a, rnd() * 0.5); T.add(lf);
    }
    // thẻ số bàn trong chân kim loại
    if (o.number) {
      const nt = await svgTex(o.number, o.fontCss, 768, aniso);
      const holder = new THREE.Group();
      const base = lathe([[0, 0], [30, 0], [30, 5], [26, 7], [0, 7]], 40, goldMat); holder.add(base);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(2.4 * S, 2.4 * S, 90 * S, 12), goldMat); stem.position.y = 52 * S; holder.add(stem);
      const clip = new THREE.Mesh(new THREE.TorusGeometry(9 * S, 2 * S, 8, 24), goldMat); clip.position.y = 100 * S; clip.rotation.y = Math.PI / 2; holder.add(clip);
      const card = new THREE.Mesh(new THREE.BoxGeometry(100 * S, 150 * S, 0.6 * S), [paperEdge, paperEdge, paperEdge, paperEdge, new THREE.MeshPhysicalMaterial({ map: nt, roughness: 0.45, clearcoat: 0.2 }), cardBack]);
      card.position.y = (100 + 75 - 8) * S; card.castShadow = true; holder.add(card);
      const hx = Math.sin(toCam) * 230, hz = Math.cos(toCam) * 230;
      holder.position.set(hx * S, TH * S, hz * S); holder.rotation.y = toCam;
      T.add(holder);
    }
    // khung hình ôm giá vẽ + bảng (sản phẩm chính); bàn tiệc phía sau làm bối cảnh
    noFrame(T);
    // điểm neo vô hình ở mép bàn gần → khung hình lệch sang bàn 1 chút, đỡ trống bên trái
    const anchor = new THREE.Mesh(new THREE.BoxGeometry(1 * S, 1 * S, 1 * S), new THREE.MeshBasicMaterial());
    anchor.visible = false; anchor.position.set((tx - 120) * S, (TH + 120) * S, (tz + R * 0.75) * S); g.add(anchor);
    return { group: g, view: { az: 0.55, el: 0.13 }, aim: 0.6, zoom: 1.3, blob: 0.4 };
  };
}
