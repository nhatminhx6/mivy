'use client';
// Đồng hồ 3D: viền (nhựa / kim loại / gỗ) có độ sâu, mặt số in (texture từ ClockSvg mode="tex") lùi vào trong viền,
// kính (transmission) phía trước, 3 kim đùn khối chỉ 10:10:35 + nắp trục. Treo tường (tường nhận bóng, swing để không
// lộ mặt sau) hoặc để bàn (nghiêng nhẹ trên chân chống, mặt bàn gỗ).

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { HAND_ANGLES, dialOf, handShapes, type ClockFrame, type ClockHands, type ClockPalette, type ClockSize } from './clock-engine';

export interface Clock3DOpts {
  dial: SVGSVGElement | null; size: ClockSize; frame: ClockFrame; hands: ClockHands; palette: ClockPalette; fontCss: string;
}

let rnd = 11;
const r = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };

function woodTex(base: string, dark: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 1024, 256);
  rnd = 5;
  for (let i = 0; i < 70; i++) {
    const y0 = r() * 256, amp = 2 + r() * 6, f = 0.004 + r() * 0.01, ph = r() * 6;
    x.strokeStyle = dark; x.globalAlpha = 0.08 + r() * 0.22; x.lineWidth = 0.6 + r() * 2.2;
    x.beginPath();
    for (let u = 0; u <= 1024; u += 8) { const y = y0 + Math.sin(u * f + ph) * amp; if (u === 0) x.moveTo(u, y); else x.lineTo(u, y); }
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function brushedTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 512, 64);
  rnd = 9;
  for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},${r() > 0.5 ? 255 : 0},0.07)`; x.fillRect(r() * 512, r() * 64, 20 + r() * 140, 0.7); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function frameMat(f: ClockFrame): THREE.Material {
  switch (f) {
    case 'black': return new THREE.MeshPhysicalMaterial({ color: '#1B1C1F', roughness: 0.36, clearcoat: 0.55, clearcoatRoughness: 0.25 });
    case 'white': return new THREE.MeshPhysicalMaterial({ color: '#F1F0EC', roughness: 0.42, clearcoat: 0.45, clearcoatRoughness: 0.3 });
    case 'silver': { const b = brushedTex(); b.repeat.set(3, 1); return new THREE.MeshStandardMaterial({ color: '#D6D9DE', metalness: 1, roughness: 0.3, roughnessMap: b }); }
    case 'gold': { const b = brushedTex(); b.repeat.set(3, 1); return new THREE.MeshStandardMaterial({ color: '#D8B36C', metalness: 1, roughness: 0.3, roughnessMap: b }); }
    case 'wood': { const t = woodTex('#B98A5A', '#6E4A2A'); t.repeat.set(3, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.62 }); }
    default: { const t = woodTex('#5E3E2A', '#2A1A10'); t.repeat.set(3, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.55 }); }
  }
}
function plasterTex(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#ECE7DF'; x.fillRect(0, 0, 512, 512);
  const id = x.getImageData(0, 0, 512, 512);
  rnd = 3;
  for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 8; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
  x.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** vật nền (tường, bàn) không tính vào khung nhìn → camera ôm sát đồng hồ */
function excludeBounds(m: THREE.Mesh) {
  m.geometry.boundingBox = new THREE.Box3();
  m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
  m.frustumCulled = false;
}
function softShadow(w: number, h: number, round: boolean, opacity: number): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d')!;
  x.filter = 'blur(14px)'; x.fillStyle = 'rgba(30,22,14,0.85)';
  if (round) { x.beginPath(); x.arc(128, 128, 86, 0, Math.PI * 2); x.fill(); } else x.fillRect(42, 42, 172, 172);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, depthWrite: false }));
  excludeBounds(m);
  return m;
}

export function clockBuilder(o: Clock3DOpts): Builder {
  return async (aniso) => {
    if (!o.dial) throw new Error('Chưa dựng xong mặt đồng hồ');
    const sz = o.size, round = sz.shape === 'round';
    const dial = dialOf(sz), R = dial / 2, Ro = sz.d / 2, D = sz.depth;
    const tex = await svgTex(o.dial, o.fontCss, 2048, aniso, o.palette.bg);
    tex.anisotropy = aniso;

    const clock = new THREE.Group(); // đơn vị mm, mặt hướng +Z, tâm (0,0), mặt sau z=0
    const fmat = frameMat(o.frame);
    const recess = Math.min(14, D * 0.34); // mặt số lùi vào so với mép trước
    const zDial = D - recess;

    if (round) {
      const lip = sz.rim;
      const pts = [
        [Ro * 0.9, 0], [Ro - 2, 0], [Ro, 2.5], [Ro, D - 7], [Ro - 1.2, D - 2.2], [Ro - 4, D], [R + lip * 0.45, D],
        [R + 0.6, D - 1.6], [R, D - 4], [R, zDial - 0.5], [R * 0.95, zDial - 0.5],
      ].map(([a, b]) => new THREE.Vector2(a, b));
      const ring = new THREE.Mesh(new THREE.LatheGeometry(pts, 160), fmat);
      ring.rotation.x = Math.PI / 2; // trục lathe (y) → z
      ring.castShadow = true; ring.receiveShadow = true;
      clock.add(ring);
      const back = new THREE.Mesh(new THREE.CircleGeometry(Ro * 0.92, 96), new THREE.MeshStandardMaterial({ color: '#2A2A2A', roughness: 0.9, side: THREE.DoubleSide }));
      back.position.z = 0.2; clock.add(back);
    } else {
      const half = Ro, rr = Math.max(3, sz.rim * 0.45);
      const shape = new THREE.Shape();
      shape.moveTo(-half + rr, -half); shape.lineTo(half - rr, -half); shape.quadraticCurveTo(half, -half, half, -half + rr);
      shape.lineTo(half, half - rr); shape.quadraticCurveTo(half, half, half - rr, half); shape.lineTo(-half + rr, half);
      shape.quadraticCurveTo(-half, half, -half, half - rr); shape.lineTo(-half, -half + rr); shape.quadraticCurveTo(-half, -half, -half + rr, -half);
      const hole = new THREE.Path(); const h2 = R, hr = 1.2;
      hole.moveTo(-h2 + hr, -h2); hole.lineTo(h2 - hr, -h2); hole.quadraticCurveTo(h2, -h2, h2, -h2 + hr); hole.lineTo(h2, h2 - hr);
      hole.quadraticCurveTo(h2, h2, h2 - hr, h2); hole.lineTo(-h2 + hr, h2); hole.quadraticCurveTo(-h2, h2, -h2, h2 - hr); hole.lineTo(-h2, -h2 + hr);
      hole.quadraticCurveTo(-h2, -h2, -h2 + hr, -h2);
      shape.holes.push(hole);
      // viền trước dày (từ zDial → D) + hộp thân phía sau
      // UV của ExtrudeGeometry tính theo mm → co texture (vân gỗ / xước) về đúng tỉ lệ
      const sq = (fmat as THREE.MeshStandardMaterial).clone();
      for (const k of ['map', 'roughnessMap'] as const) { const t = sq[k]; if (t) { const c = t.clone(); c.repeat.set(1 / 110, 1 / 28); c.needsUpdate = true; sq[k] = c; } }
      const front = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: recess - 1.4, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.2, bevelSegments: 3, curveSegments: 8 }), sq);
      front.position.z = zDial; front.castShadow = true; front.receiveShadow = true;
      clock.add(front);
      // thân hộp kết thúc trước mặt số 1mm (tránh trùng mặt phẳng → nhấp nháy)
      const body = new THREE.Mesh(new THREE.BoxGeometry(sz.d - 1, sz.d - 1, zDial - 1), fmat);
      body.position.z = (zDial - 1) / 2; body.castShadow = true;
      clock.add(body);
    }

    // mặt số
    const dialGeo = round ? new THREE.CircleGeometry(R, 160) : new THREE.PlaneGeometry(dial, dial);
    const dialMesh = new THREE.Mesh(dialGeo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.55, clearcoat: 0.15, clearcoatRoughness: 0.6 }));
    dialMesh.position.z = zDial; dialMesh.receiveShadow = true;
    clock.add(dialMesh);

    // kim: đùn từ cùng đa giác với bản phẳng
    const hs = handShapes(o.hands);
    const isLight = (hex: string) => { const c = new THREE.Color(hex); return c.r + c.g + c.b > 2.1; };
    const goldish = o.palette.hand.toUpperCase() === '#F7D27A' || o.palette.hand.toUpperCase() === '#F1E4CC';
    const handMat = new THREE.MeshStandardMaterial({ color: o.palette.hand, metalness: goldish ? 0.85 : isLight(o.palette.hand) ? 0.35 : 0.25, roughness: goldish ? 0.28 : 0.38 });
    const secMat = new THREE.MeshStandardMaterial({ color: o.palette.second, metalness: 0.3, roughness: 0.4 });
    const mkHand = (pts: [number, number][], deg: number, z: number, mat: THREE.Material, th: number) => {
      const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x * R, y * R)));
      const g = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.15, bevelSegments: 2 });
      const m = new THREE.Mesh(g, mat);
      m.rotation.z = -deg * Math.PI / 180; m.position.z = z;
      m.castShadow = true;
      clock.add(m);
      return m;
    };
    const th = Math.max(0.6, R * 0.006);
    mkHand(hs.hour, HAND_ANGLES.hour, zDial + 1.6, handMat, th);
    mkHand(hs.minute, HAND_ANGLES.minute, zDial + 1.6 + th + 0.9, handMat, th);
    const sec = mkHand(hs.second, HAND_ANGLES.second, zDial + 1.6 + (th + 0.9) * 2, secMat, th * 0.7);
    if (hs.counter) {
      const cw = new THREE.Mesh(new THREE.CylinderGeometry(hs.counter * R * 0.5, hs.counter * R * 0.5, th * 0.7, 32), secMat);
      cw.rotation.x = Math.PI / 2; cw.position.set(0, -0.16 * R, th * 0.35);
      sec.add(cw);
    }
    const capZ = zDial + 1.6 + (th + 0.9) * 3;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.035, R * 0.038, capZ - zDial, 40), handMat);
    cap.rotation.x = Math.PI / 2; cap.position.z = zDial + (capZ - zDial) / 2; cap.castShadow = true;
    clock.add(cap);
    const cap2 = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.014, R * 0.014, 0.8, 24), secMat);
    cap2.rotation.x = Math.PI / 2; cap2.position.z = capZ + 0.4;
    clock.add(cap2);

    // kính: hơi vòm với mặt tròn, phẳng với vuông
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transmission: 1, roughness: 0.03, metalness: 0, ior: 1.5, thickness: 0.4, specularIntensity: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.1, transparent: true, opacity: 1, depthWrite: false });
    if (round) {
      const Rs = R * 4.2, a = Math.asin(R / Rs);
      const g = new THREE.Mesh(new THREE.SphereGeometry(Rs, 96, 8, 0, Math.PI * 2, 0, a), glassMat);
      g.rotation.x = Math.PI / 2;
      g.position.z = D - 3.2 - Math.sqrt(Rs * Rs - R * R);
      g.renderOrder = 3;
      clock.add(g);
    } else {
      const g = new THREE.Mesh(new THREE.PlaneGeometry(dial, dial), glassMat);
      g.position.z = D - 2.4; g.renderOrder = 3;
      clock.add(g);
    }

    const root = new THREE.Group();
    const scale = new THREE.Group(); scale.scale.setScalar(S); root.add(scale);

    if (sz.desk) {
      // để bàn: nghiêng ra sau ~9°, chân chống phía sau, mặt bàn gỗ
      const tilt = 0.16;
      const holder = new THREE.Group(); holder.add(clock);
      clock.position.set(0, sz.d / 2, -D / 2);
      holder.rotation.x = -tilt;
      holder.position.set(0, Math.sin(tilt) * D * 0.5 + 0.4, 0);
      scale.add(holder);
      const legL = sz.d * 0.78;
      const leg = new THREE.Mesh(new THREE.BoxGeometry(sz.d * 0.32, legL, 4), fmat);
      leg.position.set(0, legL / 2 * Math.cos(0.42), -D - legL / 2 * Math.sin(0.42) + 2);
      leg.rotation.x = 0.42; leg.castShadow = true;
      scale.add(leg);
      const deskT = woodTex('#C9A27A', '#8A6440'); deskT.repeat.set(1.5, 3);
      const desk = new THREE.Mesh(new THREE.PlaneGeometry(sz.d * 8, sz.d * 8), new THREE.MeshStandardMaterial({ map: deskT, roughness: 0.7 }));
      desk.rotation.x = -Math.PI / 2; desk.position.y = 0.05; desk.receiveShadow = true;
      excludeBounds(desk);
      scale.add(desk);
      return { group: root, view: { az: 0.42, el: 0.2 }, aim: 0.55, zoom: 1.12, blob: 0.35, swing: 0.8 };
    }

    // treo tường: đồng hồ cao hơn sàn (sàn ngoài khung nhìn), cách tường 2mm
    const lift = sz.d * 0.9;
    clock.position.set(0, lift + Ro, 2);
    scale.add(clock);
    const wallT = plasterTex(); wallT.repeat.set(4, 4);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(sz.d * 7, sz.d * 6), new THREE.MeshStandardMaterial({ map: wallT, roughness: 0.95 }));
    wall.position.set(0, lift + Ro, 0); wall.receiveShadow = true;
    excludeBounds(wall);
    scale.add(wall);
    const drop = softShadow(sz.d * 1.35, sz.d * 1.35, round, 0.38);
    drop.position.set(D * 0.5, lift + Ro - D * 0.7, 0.3);
    scale.add(drop);
    return { group: root, view: { az: 0.36, el: 0.06 }, aim: 0.5, zoom: 1.08, blob: 0, swing: 0.55 };
  };
}
