'use client';
// Mũ bảo hiểm 3D: vỏ elip (tham số φ quanh đầu, θ từ đỉnh xuống mép — mép trước cao, hông/gáy thấp; 3/4 ôm tai-gáy),
// lớp xốp lót tối thấy ở mép, viền cao su, lưỡi trai nhựa khói (tuỳ chọn) + 3 nút bấm, quai vải + khoá nhựa nằm trên bàn.
// Decal dán THẬT lên mặt cong bằng DecalGeometry (chiếu hộp theo pháp tuyến) → không méo, đúng kích thước mm.
// 2 mũ: mũ trước khoe mặt trước + hông phải, mũ sau quay khoe hông trái + gáy.

import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { HM_POS, type HmKind, type HmPos } from './helmet-engine';

export interface Helmet3DOpts {
  kind: HmKind; visor: boolean; shellHex: string; metal: boolean; finish: 'gloss' | 'matte'; fontCss: string;
  arts: Partial<Record<HmPos, SVGSVGElement | null>>;
}

const A = 104, B = 128, C = 132; // bán trục (mm): ngang, dọc, cao
const deg = (d: number) => (d * Math.PI) / 180;
function thetaMax(kind: HmKind, phi: number): number {
  const t = Math.cos(phi);
  const [front, side, back] = kind === 'three4' ? [74, 114, 120] : [70, 96, 101];
  const f = Math.max(t, 0) ** 1.4, b = Math.max(-t, 0) ** 1.4;
  return deg(side + (front - side) * f + (back - side) * b);
}
// Dưới ~84° vỏ không khum vào trong nữa mà thành vách gần thẳng, hơi loe ra (như mũ thật) → không có mặt úp xuống đất
// (mặt úp xuống tối hẳn → thành vạch ngang khó coi).
const TH0 = deg(84);
function surf(phi: number, th: number, k = 1): THREE.Vector3 {
  let r: number, yy: number;
  if (th <= TH0) { r = Math.sin(th); yy = Math.cos(th); }
  else { const d = th - TH0; r = Math.sin(TH0) + 0.07 * d; yy = Math.cos(TH0) - 0.98 * d; }
  const x = A * k * r * Math.sin(phi);
  const y = C * k * yy;
  let z = B * k * r * Math.cos(phi);
  if (z < 0) z *= 1.05; // gáy hơi đầy hơn trán
  return new THREE.Vector3(x, y, z);
}
/** pháp tuyến hướng ra ngoài (sai phân hữu hạn theo φ, θ) */
function normalAt(phi: number, th: number, k = 1): THREE.Vector3 {
  if (th < 1e-3) return new THREE.Vector3(0, 1, 0);
  const e = 1e-4;
  const dTh = surf(phi, th + e, k).sub(surf(phi, th - e, k));
  const dPh = surf(phi + e, th, k).sub(surf(phi - e, th, k));
  const n = new THREE.Vector3().crossVectors(dTh, dPh).normalize();
  const p = surf(phi, th, k);
  if (n.dot(new THREE.Vector3(p.x, p.y + C * 0.3, p.z)) < 0) n.negate();
  return n;
}

/** vỏ (hoặc lớp lót) dạng lưới tham số, có pháp tuyến giải tích */
function domeGeo(kind: HmKind, k: number, thScale: number): THREE.BufferGeometry {
  const NU = 160, NV = 72;
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= NV; j++) {
    const v = j / NV;
    for (let i = 0; i <= NU; i++) {
      const phi = Math.PI + (i / NU) * Math.PI * 2; // đường nối ở gáy
      const th = Math.max(1e-4, v * thetaMax(kind, phi) * thScale);
      const p = surf(phi, th, k);
      const n = normalAt(phi, th, k);
      pos.push(p.x * S, p.y * S, p.z * S); nor.push(n.x, n.y, n.z); uv.push(i / NU, 1 - v);
    }
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) {
    const a = j * (NU + 1) + i, b = a + NU + 1;
    idx.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}
const rimPt = (kind: HmKind, phi: number, k = 1, thScale = 1) => surf(phi, thetaMax(kind, phi) * thScale, k);

// ---------- texture vẽ code ----------
let foamC: HTMLCanvasElement | null = null;
function foam(): HTMLCanvasElement {
  if (foamC) return foamC;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 2600; i++) { const v = Math.random() < 0.5 ? 40 : 210; x.fillStyle = `rgba(${v},${v},${v},0.35)`; x.beginPath(); x.arc(Math.random() * N, Math.random() * N, 0.6 + Math.random() * 1.6, 0, 7); x.fill(); }
  return (foamC = c);
}
let webC: HTMLCanvasElement | null = null;
function webbing(): HTMLCanvasElement {
  if (webC) return webC;
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, 64, 256);
  for (let y = 0; y < 256; y += 4) { x.fillStyle = 'rgba(255,255,255,0.28)'; x.fillRect(0, y, 64, 1.5); }
  for (let xx = 0; xx < 64; xx += 6) { x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(xx, 0, 1, 256); }
  x.fillStyle = 'rgba(0,0,0,0.35)'; x.fillRect(0, 0, 3, 256); x.fillRect(61, 0, 3, 256);
  return (webC = c);
}
const dataTex = (c: HTMLCanvasElement, aniso: number, rx = 1, ry = 1) => {
  const t = canvasTex(c, aniso); t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
};

/** dải vải phẳng chạy theo đường cong (quai) */
function ribbon(pts: THREE.Vector3[], width: number, mat: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const N = 60, up = new THREE.Vector3(0, 1, 0);
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let wPrev = new THREE.Vector3(1, 0, 0);
  for (let i = 0; i <= N; i++) {
    const u = i / N, p = curve.getPointAt(u), t = curve.getTangentAt(u);
    const th = new THREE.Vector3(t.x, 0, t.z);
    let w = th.lengthSq() > 0.05 ? new THREE.Vector3().crossVectors(up, th.normalize()).normalize() : wPrev.clone();
    if (w.dot(wPrev) < 0) w = w.negate();
    wPrev = w;
    const a = p.clone().addScaledVector(w, width / 2), b = p.clone().addScaledVector(w, -width / 2);
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z);
    uv.push(0, u * 6, 1, u * 6);
  }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.castShadow = true; m.receiveShadow = true;
  return m;
}

/** vị trí decal trên vỏ: (φ, θ từ đỉnh) */
const DECAL_AT: Record<HmPos, { phi: number; th: number }> = {
  front: { phi: 0, th: 44 },
  right: { phi: 90, th: 60 },
  left: { phi: -90, th: 60 },
  back: { phi: 180, th: 66 },
};

async function oneHelmet(o: Helmet3DOpts, tex: Partial<Record<HmPos, THREE.Texture>>, aniso: number): Promise<THREE.Group> {
  const g = new THREE.Group();
  const gloss = o.finish === 'gloss';
  const shellMat = new THREE.MeshPhysicalMaterial({
    color: o.shellHex, metalness: o.metal ? 0.32 : 0.02, roughness: gloss ? (o.metal ? 0.42 : 0.46) : 0.72,
    // clearcoat hơi nhám: phản chiếu chân trời của môi trường nhoè đi, không thành vạch cứng ngang thân mũ
    clearcoat: gloss ? 0.75 : 0.06, clearcoatRoughness: gloss ? 0.34 : 0.6, envMapIntensity: gloss ? 0.9 : 0.7,
  });
  const shell = new THREE.Mesh(domeGeo(o.kind, 1, 1), shellMat);
  shell.castShadow = true; // không tự nhận bóng → khỏi vạch tối cứng ở đường xích đạo
  g.add(shell);

  // lớp xốp lót bên trong (nhìn thấy qua miệng mũ)
  const foamMat = new THREE.MeshStandardMaterial({ color: '#2B2C30', roughness: 0.96, bumpMap: dataTex(foam(), aniso, 6, 4), bumpScale: 0.9, side: THREE.BackSide });
  const lining = new THREE.Mesh(domeGeo(o.kind, 0.93, 0.985), foamMat);
  lining.receiveShadow = true;
  g.add(lining);

  // viền cao su ôm mép (ống chạy theo mép, che khe vỏ-lót)
  const rimPts: THREE.Vector3[] = [];
  for (let i = 0; i < 128; i++) { const phi = (i / 128) * Math.PI * 2; rimPts.push(rimPt(o.kind, phi, 0.965).multiplyScalar(S)); }
  const rubber = new THREE.MeshPhysicalMaterial({ color: '#1A1B1E', roughness: 0.55, clearcoat: 0.2 });
  const trim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 256, 5.2 * S, 12, true), rubber);
  trim.castShadow = true;
  g.add(trim);

  // decal dán lên vỏ cong
  shell.updateMatrixWorld(true);
  for (const p of Object.keys(tex) as HmPos[]) {
    const t = tex[p]; if (!t) continue;
    const at = DECAL_AT[p];
    const phi = deg(at.phi);
    const th = Math.min(deg(at.th), thetaMax(o.kind, phi) - deg(o.kind === 'three4' ? 30 : 24));
    const ps = surf(phi, th);
    const n = normalAt(phi, th);
    const P = ps.clone().multiplyScalar(S);
    const m4 = new THREE.Matrix4().lookAt(P.clone().add(n), P, new THREE.Vector3(0, 1, 0));
    const e = new THREE.Euler().setFromRotationMatrix(m4);
    const sz = HM_POS[p];
    const geo = new DecalGeometry(shell, P, e, new THREE.Vector3(sz.w * S, sz.h * S, 70 * S));
    const dm = new THREE.MeshPhysicalMaterial({
      map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
      roughness: gloss ? 0.4 : 0.64, clearcoat: gloss ? 0.85 : 0, clearcoatRoughness: 0.24, metalness: 0,
    });
    const dmesh = new THREE.Mesh(geo, dm);
    dmesh.renderOrder = 2;
    g.add(dmesh);
  }

  // lưỡi trai nhựa khói phía trước + 3 nút bấm
  if (o.visor) {
    const NU = 40, NV = 6;
    const pos: number[] = [], idx: number[] = [];
    const span = deg(52);
    for (let i = 0; i <= NU; i++) {
      const phi = -span + (i / NU) * span * 2;
      const r0 = rimPt(o.kind, phi, 1.0);
      const out = new THREE.Vector3(r0.x, 0, r0.z).normalize();
      const L = 52 * Math.cos((phi / span) * Math.PI / 2) ** 0.7 + 6;
      for (let j = 0; j <= NV; j++) {
        const v = j / NV;
        const q = r0.clone().addScaledVector(out, L * v + 2).add(new THREE.Vector3(0, -L * 0.3 * v * v - 2, 0));
        pos.push(q.x * S, q.y * S, q.z * S);
      }
    }
    for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) {
      const a = i * (NV + 1) + j, b = a + NV + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const vg = new THREE.BufferGeometry();
    vg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); vg.setIndex(idx); vg.computeVertexNormals();
    const vmat = new THREE.MeshPhysicalMaterial({ color: '#2C2F35', roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, opacity: 0.86, side: THREE.DoubleSide });
    const visor = new THREE.Mesh(vg, vmat); visor.castShadow = true;
    g.add(visor);
    const chrome = new THREE.MeshStandardMaterial({ color: '#D9DCE0', metalness: 1, roughness: 0.2 });
    for (const a of [-36, 0, 36]) {
      const phi = deg(a);
      const th = thetaMax(o.kind, phi) - deg(5);
      const pp = surf(phi, th); const nn = normalAt(phi, th);
      const btn = new THREE.Mesh(new THREE.CylinderGeometry(4.2 * S, 4.6 * S, 2.2 * S, 24), chrome);
      btn.position.copy(pp.clone().addScaledVector(nn, 1).multiplyScalar(S));
      btn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nn);
      g.add(btn);
    }
  }

  // quai + khoá: từ mép hông (gần tai) buông xuống, nằm trên bàn trước mũ
  let yG = Infinity;
  for (let i = 0; i < 64; i++) yG = Math.min(yG, rimPt(o.kind, (i / 64) * Math.PI * 2).y);
  const webMat = new THREE.MeshStandardMaterial({ color: '#232428', roughness: 0.88, bumpMap: dataTex(webbing(), aniso, 1, 1), bumpScale: 0.6, side: THREE.DoubleSide });
  const zFront = rimPt(o.kind, 0).z;
  const buckle = new THREE.Vector3(4, yG + 3.5, zFront + 14);
  for (const sgn of [1, -1]) {
    const phi = deg(sgn * 74);
    const r0 = rimPt(o.kind, phi, 0.97);
    const out = new THREE.Vector3(r0.x, 0, r0.z).normalize();
    const pts = [
      r0.clone().add(new THREE.Vector3(0, 6, 0)),
      r0.clone().addScaledVector(out, 6).add(new THREE.Vector3(0, -(r0.y - yG) * 0.45, 8)),
      new THREE.Vector3(r0.x * 0.92, yG + 2.4, r0.z + 22),
      new THREE.Vector3(buckle.x + sgn * 40, yG + 2.2, buckle.z + 4),
      new THREE.Vector3(buckle.x + sgn * 13, yG + 2.2, buckle.z),
    ].map((v) => v.multiplyScalar(S));
    g.add(ribbon(pts, 19 * S, webMat));
    // đinh tán chỗ quai bắt vào vỏ
    const rv = new THREE.Mesh(new THREE.CylinderGeometry(3.6 * S, 3.6 * S, 1.6 * S, 18), new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 1, roughness: 0.25 }));
    const rth = thetaMax(o.kind, phi) - deg(9); const rp = surf(phi, rth); const rn = normalAt(phi, rth);
    rv.position.copy(rp.clone().addScaledVector(rn, 0.8).multiplyScalar(S)); rv.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), rn);
    g.add(rv);
  }
  const plastic = new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.45, clearcoat: 0.3 });
  const fem = new THREE.Mesh(new RoundedBoxGeometry(30 * S, 7 * S, 22 * S, 3, 2.4 * S), plastic);
  fem.position.set((buckle.x + 10) * S, (yG + 3.6) * S, buckle.z * S); fem.castShadow = true;
  const male = new THREE.Mesh(new RoundedBoxGeometry(22 * S, 5 * S, 17 * S, 3, 2 * S), plastic);
  male.position.set((buckle.x - 12) * S, (yG + 2.6) * S, buckle.z * S); male.castShadow = true;
  g.add(fem, male);

  // đặt đáy (mép thấp nhất) chạm y = 0
  g.position.y = -yG * S;
  return g;
}

export function helmetBuilder(o: Helmet3DOpts): Builder {
  return async (aniso) => {
    const tex: Partial<Record<HmPos, THREE.Texture>> = {};
    for (const p of Object.keys(o.arts) as HmPos[]) {
      const el = o.arts[p]; if (!el) continue;
      const t = await svgTex(el, o.fontCss, p === 'front' || p === 'back' ? 1200 : 1400, aniso, '');
      t.anisotropy = aniso;
      tex[p] = t;
    }
    const out = new THREE.Group();
    const a = await oneHelmet(o, tex, aniso);
    a.rotation.y = 0.62; // khoe trán + hông phải
    a.position.set(-70 * S, 0, 60 * S);
    const b = await oneHelmet(o, tex, aniso);
    b.rotation.y = Math.PI + 0.55; // khoe hông trái + gáy
    b.position.set(185 * S, 0, -140 * S);
    out.add(a, b);
    const bb = new THREE.Box3().setFromObject(out);
    const c = bb.getCenter(new THREE.Vector3());
    out.position.x -= c.x; out.position.z -= c.z;
    return { group: out, view: { az: 0.18, el: 0.26 }, aim: 0.45, zoom: 1.75, blob: 0.55 };
  };
}
