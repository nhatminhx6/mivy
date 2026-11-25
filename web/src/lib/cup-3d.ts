'use client';
// Ly in logo 3D: thân ly hình nón cụt (đúng Ø miệng / Ø đáy / chiều cao), texture = thiết kế trải phẳng của khách
// map theo góc quanh trục (u) + đường sinh (v) — cùng phép biến đổi với khuôn quạt file in → thấy đúng như in thật.
// Ly giấy: miệng cuộn, nắp nhựa trắng có lỗ uống, ly thứ 2 mở nắp thấy cà phê. Ly nhựa PET: trong suốt,
// thấy nước + trân châu ép sát thành ly, nắp cầu / nắp bằng + ống hút.

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { cupGeom, type CupIndustry, type CupKind, type CupSize } from './cup-engine';

export interface Cup3DOpts {
  art: SVGSVGElement | null; kind: CupKind; size: CupSize; lid: 'dome' | 'flat'; bg: string | null;
  industry: CupIndustry; straw: string; fontCss: string;
  inks?: string[]; // màu in trên ly nhựa → chọn màu nước tương phản để chữ in không chìm
}

const VIEW_AZ = 0.32;

function gradTex(top: string, bottom: string, aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 4; c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, top); g.addColorStop(1, bottom);
  x.fillStyle = g; x.fillRect(0, 0, 4, 256);
  return canvasTex(c, aniso);
}
// mặt cà phê: lớp crema nâu vàng, viền sẫm, vân bọt nhỏ
function cremaTex(aniso: number, kind: 'coffee' | 'milk' | 'juice' = 'coffee'): THREE.CanvasTexture {
  const milk = kind === 'milk';
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  if (kind === 'juice') { g.addColorStop(0, '#FFB54A'); g.addColorStop(0.8, '#F69A2C'); g.addColorStop(1, '#D9761A'); }
  else if (milk) { g.addColorStop(0, '#E9D2B4'); g.addColorStop(0.75, '#D8B48B'); g.addColorStop(1, '#B98B5E'); }
  else { g.addColorStop(0, '#C89260'); g.addColorStop(0.55, '#B07A48'); g.addColorStop(0.88, '#7A4A26'); g.addColorStop(1, '#4A2A16'); }
  x.fillStyle = g; x.fillRect(0, 0, N, N);
  let s = 3; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 1400; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * N * 0.46;
    x.fillStyle = kind === 'juice' ? `rgba(255,230,160,${0.04 + rnd() * 0.08})` : `rgba(255,236,205,${0.05 + rnd() * 0.12})`;
    x.beginPath(); x.arc(N / 2 + Math.cos(a) * r, N / 2 + Math.sin(a) * r, 1 + rnd() * 3, 0, Math.PI * 2); x.fill();
  }
  return canvasTex(c, aniso);
}

const clearMat = (opacity: number) => new THREE.MeshPhysicalMaterial({
  color: '#FFFFFF', transparent: true, opacity, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03,
  ior: 1.5, specularIntensity: 1, depthWrite: false, side: THREE.DoubleSide,
});

function paperCup(o: Cup3DOpts, tex: THREE.Texture, lid: boolean, aniso: number): THREE.Group {
  const g = cupGeom(o.size), { rt, rb, h } = g;
  const grp = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rt * S, rb * S, h * S, 160, 1, true),
    new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 }));
  wall.position.y = (h / 2) * S; wall.castShadow = true;
  const inner = new THREE.Mesh(new THREE.CylinderGeometry((rt - 0.45) * S, (rb - 0.45) * S, (h - 1) * S, 96, 1, true),
    new THREE.MeshStandardMaterial({ color: '#F3F0E9', roughness: 0.82, side: THREE.BackSide }));
  inner.position.y = ((h - 1) / 2 + 0.5) * S;
  const rim = new THREE.Mesh(new THREE.TorusGeometry((rt + 0.15) * S, 1.55 * S, 16, 160),
    new THREE.MeshPhysicalMaterial({ color: o.bg || '#FFFFFF', roughness: 0.4, clearcoat: 0.35 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = (h - 0.35) * S; rim.castShadow = true;
  const floor = new THREE.Mesh(new THREE.CircleGeometry((rb - 0.45) * S, 64), new THREE.MeshStandardMaterial({ color: '#EDE9E1', roughness: 0.85, side: THREE.DoubleSide }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 9 * S;
  grp.add(wall, inner, rim, floor);
  if (lid) {
    const P = (r: number, y: number) => new THREE.Vector2(r * S, (h + y) * S);
    const pts = [P(0, 8.4), P(rt - 7.2, 8.4), P(rt - 6.4, 10.9), P(rt - 3.4, 10.9), P(rt - 2.5, 8.2), P(rt + 0.5, 6.7), P(rt + 2.2, 5), P(rt + 2.65, 2.2), P(rt + 2.45, -2.1), P(rt + 1.9, -3.1)];
    const lidMesh = new THREE.Mesh(new THREE.LatheGeometry(pts, 160),
      new THREE.MeshPhysicalMaterial({ color: '#F7F7F4', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.25, side: THREE.DoubleSide }));
    lidMesh.castShadow = true;
    grp.add(lidMesh);
    // lỗ uống: khe dài nằm trên gờ nổi, quay về phía mặt trước (+x local)
    const beta = Math.PI / 2 + 0.22, rho = rt - 4.9;
    const sip = new THREE.Mesh(new THREE.CapsuleGeometry(1.5 * S, 8 * S, 6, 18), new THREE.MeshStandardMaterial({ color: '#1A1A1A', roughness: 0.65 }));
    sip.rotation.z = Math.PI / 2;
    const sipG = new THREE.Group(); sipG.add(sip);
    sipG.scale.set(1, 0.22, 1);
    sipG.rotation.y = beta; sipG.position.set(rho * Math.sin(beta) * S, (h + 10.9) * S, rho * Math.cos(beta) * S);
    grp.add(sipG);
    // gân nổi trên mặt nắp + rãnh dưới gờ (nắp ép nhựa thật có các vòng này)
    const ridgeMat = new THREE.MeshPhysicalMaterial({ color: '#F2F2EF', roughness: 0.35, clearcoat: 0.5 });
    for (const [rr, yy, tt] of [[rt - 12, 8.4, 0.45], [rt - 18, 8.4, 0.35], [rt + 1.6, 5.6, 0.4]] as const) {
      if (rr <= 4) continue;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(rr * S, tt * S, 8, 128), ridgeMat);
      ring.rotation.x = Math.PI / 2; ring.position.y = (h + yy) * S;
      grp.add(ring);
    }
  } else {
    const fill = 0.9, y = 9 + (h - 9) * fill, rAt = rb + (rt - rb) * (y / h) - 0.5;
    const liq = o.industry === 'juice' ? 'juice' : o.industry === 'tea' || o.industry === 'bakery' ? 'milk' : 'coffee';
    const surf = new THREE.Mesh(new THREE.CircleGeometry(rAt * S, 96), new THREE.MeshPhysicalMaterial({ map: cremaTex(aniso, liq), roughness: 0.2, clearcoat: 0.8, clearcoatRoughness: 0.15 }));
    surf.rotation.x = -Math.PI / 2; surf.position.y = y * S;
    grp.add(surf);
  }
  return grp;
}

const DRINK: Record<CupIndustry, { top: string; bottom: string; pearls: boolean }> = {
  cafe: { top: '#C79B70', bottom: '#5A341C', pearls: false },
  tea: { top: '#D6B089', bottom: '#B98A5C', pearls: true },
  juice: { top: '#FFB347', bottom: '#F07A1A', pearls: false },
  bakery: { top: '#E3C29C', bottom: '#B98A5E', pearls: false },
  minimal: { top: '#CFA57A', bottom: '#6A4024', pearls: false },
};

type Drink = { top: string; bottom: string; pearls: boolean };
const ALT_DRINKS: Drink[] = [
  { top: '#D6B089', bottom: '#B98A5C', pearls: false }, // trà sữa
  { top: '#F6E7A6', bottom: '#E9CF62', pearls: false }, // chanh dây / trà chanh
  { top: '#CFE0A0', bottom: '#93B455', pearls: false }, // trà xanh / matcha đá
  { top: '#F9C1CC', bottom: '#EE8CA0', pearls: false }, // sữa dâu
  { top: '#FFB347', bottom: '#F07A1A', pearls: false }, // cam
  { top: '#8A5A3A', bottom: '#4A2C1C', pearls: false }, // cà phê đá
];
const rgb = (h: string) => { const x = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16)); };
const cdist = (a: string, b: string) => { const A = rgb(a), B = rgb(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); };
// nước trong ly nhựa phải khác màu mực in (in cam trên nước cam = chữ chìm)
function pickDrink(ind: CupIndustry, inks: string[]): Drink {
  const own = DRINK[ind];
  const score = (d: Drink) => Math.min(...inks.map((c) => Math.min(cdist(c, d.top), cdist(c, d.bottom))));
  if (!inks.length || score(own) > 110) return own;
  let best = own, bs = score(own);
  for (const d of ALT_DRINKS) { const v = score(d); if (v > bs + 1) { best = { ...d, pearls: own.pearls }; bs = v; } if (v > 140) return { ...d, pearls: own.pearls }; }
  return best;
}

function petCup(o: Cup3DOpts, tex: THREE.Texture, lid: 'dome' | 'flat', pearls: boolean, aniso: number): THREE.Group {
  const g = cupGeom(o.size), { rt, rb, h } = g;
  const rAt = (y: number) => rb + (rt - rb) * (y / h);
  const grp = new THREE.Group();
  // hình in (màu pha, nền trong) dán ngoài thành ly
  const art = new THREE.Mesh(new THREE.CylinderGeometry((rt + 0.08) * S, (rb + 0.08) * S, h * S, 160, 1, true),
    new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, roughness: 0.38, side: THREE.DoubleSide }));
  art.position.y = (h / 2) * S; art.castShadow = true;
  // nước
  const d = pickDrink(o.industry, o.inks || []);
  const base = 2.2, top = base + (h - base) * 0.8;
  const drink = new THREE.Mesh(new THREE.CylinderGeometry((rAt(top) - 1) * S, (rAt(base) - 1) * S, (top - base) * S, 96, 1, false),
    new THREE.MeshPhysicalMaterial({ map: gradTex(d.top, d.bottom, aniso), roughness: 0.3, clearcoat: 0.4, clearcoatRoughness: 0.3 }));
  drink.position.y = ((top + base) / 2) * S; drink.castShadow = true;
  grp.add(art, drink);
  if (pearls && d.pearls) {
    const pr = 4.3, mat = new THREE.MeshPhysicalMaterial({ color: '#1B0E08', roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.08 });
    const geo = new THREE.SphereGeometry(pr * S, 20, 14);
    const list: THREE.Matrix4[] = [];
    let s = 5; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    for (let k = 0; k < 3; k++) {
      const y = base + pr + k * 7.3;
      const rr = rAt(y) - 1 - pr + 0.9;
      const n = Math.floor((2 * Math.PI * rr) / (pr * 2.05));
      for (let i = 0; i < n; i++) {
        if (k === 2 && rnd() < 0.35) continue;
        const a = ((i + (k % 2) * 0.5 + (rnd() - 0.5) * 0.25) / n) * Math.PI * 2;
        const m = new THREE.Matrix4().makeTranslation(Math.sin(a) * rr * S, (y + (rnd() - 0.5) * 1.4) * S, Math.cos(a) * rr * S);
        list.push(m);
      }
    }
    const inst = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.castShadow = true;
    grp.add(inst);
  }
  // thành ly + gờ miệng + đáy (nhựa trong)
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(rt * S, rb * S, h * S, 160, 1, true), clearMat(0.14));
  wall.position.y = (h / 2) * S; wall.renderOrder = 3;
  const lip = new THREE.Mesh(new THREE.TorusGeometry((rt + 0.7) * S, 1.05 * S, 12, 160), clearMat(0.45));
  lip.rotation.x = Math.PI / 2; lip.position.y = h * S; lip.renderOrder = 3;
  const foot = new THREE.Mesh(new THREE.TorusGeometry((rb - 1.2) * S, 1.2 * S, 10, 96), clearMat(0.35));
  foot.rotation.x = Math.PI / 2; foot.position.y = 1.2 * S; foot.renderOrder = 3;
  grp.add(wall, lip, foot);
  // nắp
  const flange = new THREE.Mesh(new THREE.RingGeometry((rt - 1.5) * S, (rt + 2.6) * S, 160), clearMat(0.3));
  flange.rotation.x = -Math.PI / 2; flange.position.y = (h + 1.6) * S; flange.renderOrder = 4;
  const fl2 = new THREE.Mesh(new THREE.TorusGeometry((rt + 2.4) * S, 1.1 * S, 10, 160), clearMat(0.4));
  fl2.rotation.x = Math.PI / 2; fl2.position.y = (h + 0.9) * S; fl2.renderOrder = 4;
  grp.add(flange, fl2);
  const a = rt - 1.2;
  const hd = lid === 'dome' ? Math.min(rt * 0.62, 30) : 3.2;
  const Rs = (a * a + hd * hd) / (2 * hd);
  const hole = lid === 'dome' ? Math.asin(6.8 / Rs) : 0;
  const end = Math.asin(Math.min(1, a / Rs));
  const cap = new THREE.Mesh(new THREE.SphereGeometry(Rs * S, 128, 40, 0, Math.PI * 2, hole, end - hole), clearMat(0.16));
  // tâm cầu ở y sao cho chân chỏm nằm đúng mặt nắp: y_tâm = (h+1.6) − Rs·cos(end)
  cap.position.y = (h + 1.6 - Rs * Math.cos(end)) * S;
  cap.renderOrder = 4;
  grp.add(cap);
  if (lid === 'dome') {
    const hr = new THREE.Mesh(new THREE.TorusGeometry(6.9 * S, 0.7 * S, 10, 48), clearMat(0.5));
    hr.rotation.x = Math.PI / 2; hr.position.y = (h + 1.6 + hd - Rs * (1 - Math.cos(hole))) * S; hr.renderOrder = 4;
    grp.add(hr);
  }
  // ống hút
  const big = o.industry === 'tea';
  const sr = big ? 5.6 : 3.4;
  const yTopLid = h + 1.6 + hd;
  const len = yTopLid + 58 - 6;
  const straw = new THREE.Mesh(new THREE.CylinderGeometry(sr * S, sr * S, len * S, 32, 1, true),
    new THREE.MeshPhysicalMaterial({ color: o.straw, roughness: 0.28, clearcoat: 0.6, side: THREE.DoubleSide }));
  straw.position.set(rt * 0.12 * S, (6 + len / 2) * S, 0); straw.rotation.z = -0.1; straw.castShadow = true;
  grp.add(straw);
  return grp;
}

export function cupBuilder(o: Cup3DOpts): Builder {
  return async (aniso) => {
    if (!o.art) throw new Error('Chưa dựng xong thiết kế ly');
    const tex = await svgTex(o.art, o.fontCss, 2048, aniso, o.kind === 'paper' ? (o.bg || '#FFFFFF') : '');
    tex.wrapS = THREE.RepeatWrapping;
    const g = cupGeom(o.size);
    const root = new THREE.Group();
    const main = o.kind === 'paper' ? paperCup(o, tex, true, aniso) : petCup(o, tex, o.lid, true, aniso);
    const second = o.kind === 'paper' ? paperCup(o, tex, false, aniso) : petCup(o, tex, o.lid === 'dome' ? 'flat' : 'dome', false, aniso);
    // mặt 1 (u = 0.25, hướng +x) quay về phía máy ảnh; ly sau quay mặt 2 (u = 0.75)
    main.rotation.y = VIEW_AZ - Math.PI / 2 - 0.14;
    second.rotation.y = VIEW_AZ - (3 * Math.PI) / 2 + 0.12;
    second.position.set(-g.rt * 2.3 * S, 0, -g.rt * 1.05 * S);
    root.add(second, main);
    return { group: root, view: { az: VIEW_AZ, el: 0.27 }, aim: 0.46, zoom: 1.3, blob: 0.45 };
  };
}
