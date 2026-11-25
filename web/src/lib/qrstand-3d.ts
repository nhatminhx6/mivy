'use client';
// Kệ mica QR 3D: thẻ in thật (texture SVG 2048px → mã QR sắc, quét thử được trên ảnh) kẹp giữa 2 tấm mica trong 3mm
// bo góc, mép mài bóng bắt sáng. 3 kiểu: chữ L (tấm sau gấp thành đế), chữ T (đế mica dày, xem được 2 mặt),
// kệ nghiêng đế gỗ. Đặt trên mặt bàn gỗ quán cà phê + 1 tách cà phê cạnh bên cho có ngữ cảnh.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { StandKind } from './qrstand-engine';

const T = 3;      // mica dày 3mm
const GAP = 0.7;  // khe giữa 2 tấm (thẻ giấy nằm trong)
const MARGIN = 4; // mica rộng hơn thẻ mỗi bên

function roundedShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(-w / 2 + r, 0); s.lineTo(w / 2 - r, 0); s.quadraticCurveTo(w / 2, 0, w / 2, r);
  s.lineTo(w / 2, h - r); s.quadraticCurveTo(w / 2, h, w / 2 - r, h);
  s.lineTo(-w / 2 + r, h); s.quadraticCurveTo(-w / 2, h, -w / 2, h - r);
  s.lineTo(-w / 2, r); s.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
  return s;
}

// tấm mica: mặt phẳng trong suốt phản chiếu (fresnel) + mép mài bóng sáng hơn — giống ảnh chụp mica thật
function acrylicMats(): [THREE.Material, THREE.Material] {
  const cap = new THREE.MeshPhysicalMaterial({
    color: '#FFFFFF', transparent: true, opacity: 0.1, roughness: 0.02, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02,
    ior: 1.49, specularIntensity: 1, envMapIntensity: 1.6, depthWrite: false,
  });
  const edge = new THREE.MeshPhysicalMaterial({
    color: '#E4F4F1', transparent: true, opacity: 0.72, roughness: 0.05, clearcoat: 1, ior: 1.49, specularIntensity: 1,
    emissive: '#CFEDE8', emissiveIntensity: 0.18, envMapIntensity: 1.4,
  });
  return [cap, edge];
}
function plate(w: number, h: number, mats: [THREE.Material, THREE.Material]): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(roundedShape(w, h, 3.5), { depth: T - 0.8, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.4, bevelSegments: 3, curveSegments: 10 });
  geo.translate(0, 0, 0.4);
  const m = new THREE.Mesh(geo, mats);
  m.renderOrder = 3;
  return m;
}

// vân gỗ (canvas) cho mặt bàn / đế gỗ
function woodTex(aniso: number, base: string, dark: string, seed = 3): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 1024, 512);
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 170; i++) {
    const y0 = r() * 512, amp = 2 + r() * 10, ph = r() * 6, fr = 0.004 + r() * 0.006;
    x.strokeStyle = dark; x.globalAlpha = 0.05 + r() * 0.16; x.lineWidth = 0.6 + r() * 2.4;
    x.beginPath();
    for (let px = 0; px <= 1024; px += 16) { const y = y0 + Math.sin(px * fr + ph) * amp + Math.sin(px * fr * 3.1 + ph) * amp * 0.25; if (px) x.lineTo(px, y); else x.moveTo(px, y); }
    x.stroke();
  }
  // vài mắt gỗ
  for (let k = 0; k < 3; k++) {
    const kx = r() * 1024, ky = r() * 512;
    for (let j = 0; j < 7; j++) { x.globalAlpha = 0.08; x.strokeStyle = dark; x.lineWidth = 1.5; x.beginPath(); x.ellipse(kx, ky, 10 + j * 7, 4 + j * 3, 0, 0, Math.PI * 2); x.stroke(); }
  }
  x.globalAlpha = 1;
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// bóng mềm giả (decal) dưới vật trên mặt bàn — bóng thật của khung lớn bị nhoè, decal cho cảm giác "đặt xuống" rõ hơn
function softShadow(w: number, d: number, alpha: number, round = false): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  if (round) {
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, `rgba(40,22,8,${alpha})`); g.addColorStop(0.6, `rgba(40,22,8,${alpha * 0.45})`); g.addColorStop(1, 'rgba(40,22,8,0)');
    x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  } else {
    x.filter = 'blur(18px)'; x.fillStyle = `rgba(40,22,8,${alpha})`; x.fillRect(40, 40, 176, 176);
  }
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// tách sứ trắng + đĩa lót, cà phê sữa có lớp crema
function coffeeCup(): THREE.Group {
  const g = new THREE.Group();
  const ceramic = new THREE.MeshPhysicalMaterial({ color: '#FAF8F4', roughness: 0.18, clearcoat: 0.8, clearcoatRoughness: 0.1 });
  const saucerPts = [[0, 0], [52, 0], [66, 4], [72, 8], [71, 9.5], [62, 7], [40, 5], [0, 5]].map(([a, b]) => new THREE.Vector2(a, b));
  const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerPts, 64), ceramic);
  const cupPts = [[0, 6], [24, 6], [27, 8], [36, 20], [41, 40], [42.5, 58], [42, 60], [39.5, 60], [39.5, 58], [38, 40], [33, 21], [22, 10], [0, 10]].map(([a, b]) => new THREE.Vector2(a, b));
  const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 64), ceramic);
  const coffee = new THREE.Mesh(new THREE.CircleGeometry(39.2, 48), new THREE.MeshStandardMaterial({ color: '#7A4A2B', roughness: 0.35 }));
  coffee.rotation.x = -Math.PI / 2; coffee.position.y = 53;
  const crema = new THREE.Mesh(new THREE.RingGeometry(10, 24, 48), new THREE.MeshStandardMaterial({ color: '#C79A6A', roughness: 0.4, transparent: true, opacity: 0.85 }));
  crema.rotation.x = -Math.PI / 2; crema.position.y = 53.1;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(14, 3.6, 14, 36, Math.PI * 1.25), ceramic);
  handle.position.set(44, 36, 0); handle.rotation.z = -Math.PI * 0.62;
  for (const m of [saucer, cup, handle]) { m.castShadow = true; m.receiveShadow = true; }
  g.add(saucer, cup, coffee, crema, handle);
  g.scale.setScalar(S);
  return g;
}

export interface QS3DOpts { card: SVGSVGElement | null; wMm: number; hMm: number; stand: StandKind; fontCss: string; table?: boolean }

export function qrstandBuilder(o: QS3DOpts): Builder {
  return async (aniso) => {
    if (!o.card) throw new Error('Chưa dựng xong thẻ QR');
    const tex = await svgTex(o.card, o.fontCss, 2048, aniso);
    tex.anisotropy = aniso;
    const w = o.wMm, h = o.hMm;
    const PW = w + MARGIN * 2, PH = h + MARGIN * 2;
    const acr = acrylicMats();
    const paper = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5 });
    const paperBack = new THREE.MeshStandardMaterial({ color: '#F4F2EE', roughness: 0.8 });

    // cụm tấm đứng: gốc toạ độ = mép dưới, giữa; mặt trước hướng +z
    const panel = (twoSided: boolean): THREE.Group => {
      const g = new THREE.Group();
      const back = plate(PW, PH, acr); back.position.z = -T; g.add(back);
      const front = plate(PW, PH, acr); front.position.z = GAP; g.add(front);
      const card = new THREE.Mesh(new THREE.PlaneGeometry(w, h), paper);
      card.position.set(0, MARGIN + h / 2, GAP / 2 + 0.05); card.castShadow = true; card.renderOrder = 1;
      const cardB = new THREE.Mesh(new THREE.PlaneGeometry(w, h), twoSided ? paper : paperBack);
      cardB.rotation.y = Math.PI; cardB.position.set(0, MARGIN + h / 2, GAP / 2 - 0.05); cardB.renderOrder = 1;
      g.add(card, cardB);
      return g;
    };

    const stand = new THREE.Group();
    let depth = 0; // chiều sâu chiếm chỗ (để đặt tách cà phê)
    if (o.stand === 'L') {
      const tilt = THREE.MathUtils.degToRad(12);
      const D = Math.max(58, Math.round(h * 0.42));
      // đế: tấm sau gấp xuống thành đế nằm ngang kéo ra sau (ExtrudeGeometry đùn +z; xoay -90° quanh x → nằm y∈[0,T], z∈[-D,0])
      const base = plate(PW, D, acr); base.rotation.x = -Math.PI / 2; base.position.z = -T * 0.6;
      stand.add(base);
      const pn = panel(false);
      pn.rotation.x = -tilt; pn.position.set(0, T * 0.5, 0);
      stand.add(pn);
      depth = D;
    } else if (o.stand === 'T') {
      const BH = 16, BD = 44;
      const block = new THREE.Mesh(new RoundedBoxGeometry(PW + 14, BH, BD, 4, 2.2), [
        new THREE.MeshPhysicalMaterial({ color: '#EEF8F6', transparent: true, opacity: 0.42, roughness: 0.04, clearcoat: 1, ior: 1.49, envMapIntensity: 1.6, emissive: '#D6EFEA', emissiveIntensity: 0.12, depthWrite: false }),
      ][0]);
      block.position.y = BH / 2; block.renderOrder = 4;
      // rãnh cắm (vạch tối trên mặt đế)
      const slot = new THREE.Mesh(new THREE.BoxGeometry(PW + 1, 0.4, T * 2 + GAP + 0.6), new THREE.MeshStandardMaterial({ color: '#9FB7B2', roughness: 0.3, transparent: true, opacity: 0.55 }));
      slot.position.y = BH + 0.05;
      const pn = panel(true); pn.position.set(0, BH - 7, T / 2 - GAP / 2);
      stand.add(block, slot, pn);
      depth = BD;
    } else {
      const tilt = THREE.MathUtils.degToRad(15);
      const BW = PW + 20, BH = 24, BD = 62;
      const wood = woodTex(aniso, '#C79A63', '#6E4524', 11);
      wood.repeat.set(0.6, 0.35);
      const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.55, color: '#FFFFFF' });
      const block = new THREE.Mesh(new RoundedBoxGeometry(BW, BH, BD, 5, 3), woodMat);
      block.position.y = BH / 2; block.castShadow = true; block.receiveShadow = true;
      const slot = new THREE.Mesh(new THREE.BoxGeometry(PW + 2, 0.6, T * 2 + GAP + 1.2), new THREE.MeshStandardMaterial({ color: '#3B2414', roughness: 0.9 }));
      slot.position.set(0, BH + 0.05, 2); slot.rotation.x = -tilt * 0.4;
      const pn = panel(false); pn.rotation.x = -tilt; pn.position.set(0, BH - 9, 2 + T / 2);
      stand.add(block, slot, pn);
      depth = BD;
    }

    // mặt bàn gỗ rộng (tràn khỏi khung hình như chụp tại quán) + tách cà phê phía sau bên phải
    const standBox = new THREE.Box3().setFromObject(stand);
    const sh = standBox.max.y - standBox.min.y;
    const TW = Math.max(PW * 5.2, 620), TD = Math.max(depth * 6, 520), TH = 18;
    const top = woodTex(aniso, '#A06E45', '#3E2210', 5);
    top.repeat.set(TW / 520, TD / 300);
    const table = new THREE.Mesh(new RoundedBoxGeometry(TW, TH, TD, 4, 3), new THREE.MeshPhysicalMaterial({ map: top, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35, color: '#FFFFFF' }));
    table.position.y = TH / 2; table.receiveShadow = true;
    stand.position.set(0, TH, depth * 0.35);
    const cup = coffeeCup(); cup.scale.multiplyScalar(0.78);
    cup.position.set((PW * 0.5 + 70) * S, TH * S, (-depth * 0.55 - 30) * S); cup.rotation.y = -0.9;

    // bóng chạm bàn: dưới kệ (lệch ra sau-phải theo đèn chính) + dưới tách
    const sb = new THREE.Box3().setFromObject(stand);
    const shStand = softShadow((sb.max.x - sb.min.x) * 1.35, (sb.max.z - sb.min.z) * 1.5 + 16, 0.42);
    shStand.position.set((sb.min.x + sb.max.x) / 2 + 6, TH + 0.25, (sb.min.z + sb.max.z) / 2 - 8);
    const shCup = softShadow(150, 150, 0.4, true);
    shCup.position.set(cup.position.x / S + 6, TH + 0.25, cup.position.z / S - 6);
    const g = new THREE.Group();
    const mm = new THREE.Group(); mm.scale.setScalar(S); mm.add(table, shStand, shCup, stand);
    g.add(mm, cup);
    // khung hình bám KỆ (bàn tràn ra ngoài): zoom theo bán kính cả cụm / chiều cao kệ
    const bb = new THREE.Box3().setFromObject(g);
    const R = bb.getBoundingSphere(new THREE.Sphere()).radius / S;
    const zoom = (1.19 * R) / (sh * 1.05);
    const aim = (TH + sh * 0.46) / ((bb.max.y - bb.min.y) / S);
    const view = o.stand === 'T' ? { az: -0.55, el: 0.2 } : { az: -0.42, el: 0.19 };
    return { group: g, view, aim, zoom, blob: 0 };
  };
}
