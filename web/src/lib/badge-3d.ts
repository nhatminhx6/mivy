'use client';
// Thẻ đeo 3D (ảnh sản phẩm nằm phẳng kiểu flat-lay): thẻ PVC bo góc + lỗ bấm (có/không bao nhựa trong),
// móc kim loại xỏ qua lỗ, dây đeo in lặp logo cuộn vòng quanh thẻ; 1 thẻ thứ 2 lật MẶT SAU nằm cạnh.
// Texture = SVG thiết kế của khách (mặt trước/sau + 1 chu kỳ dây đeo).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export interface Badge3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; lanyard: SVGSVGElement | null;
  wMm: number; hMm: number; event: boolean; holder: boolean; lanyardW: number; periodMm: number; fontCss: string;
  slot: { x: number; y: number; w: number; h: number }; // mm, gốc trên-trái của thẻ
  ribbon: string; // màu nền dây (mép + mặt dưới)
}

// texture từ SVG đã OUTLINE chữ: vẽ SVG-qua-ảnh hay vỡ dấu kép tiếng Việt (ầ, ố, ề…) → đổi chữ thành nét trước
async function svgTexOutlined(el: SVGSVGElement, css: string, outW: number, aniso: number): Promise<THREE.CanvasTexture> {
  const vb = el.viewBox.baseVal;
  const outH = Math.max(4, Math.round((outW * vb.height) / vb.width));
  return canvasTex(await svgToCanvas(await selfContainedSvg(el, css, { outline: true }), outW, outH, '#FFFFFF'), aniso);
}

const metal = () => new THREE.MeshStandardMaterial({ color: '#D3D7DC', metalness: 1, roughness: 0.24 });

// hình chữ nhật bo góc (mm, gốc dưới-trái, y lên) + lỗ bấm oval
function cardShape(w: number, h: number, r: number, slot?: { x: number; y: number; w: number; h: number }): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(r, 0); s.lineTo(w - r, 0); s.absarc(w - r, r, r, -Math.PI / 2, 0, false);
  s.lineTo(w, h - r); s.absarc(w - r, h - r, r, 0, Math.PI / 2, false);
  s.lineTo(r, h); s.absarc(r, h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(0, r); s.absarc(r, r, r, Math.PI, Math.PI * 1.5, false);
  if (slot) {
    const rr = slot.h / 2, yc = h - (slot.y + slot.h / 2), x0 = slot.x + rr, x1 = slot.x + slot.w - rr;
    const p = new THREE.Path();
    p.moveTo(x0, yc - rr); p.lineTo(x1, yc - rr); p.absarc(x1, yc, rr, -Math.PI / 2, Math.PI / 2, false);
    p.lineTo(x0, yc + rr); p.absarc(x0, yc, rr, Math.PI / 2, Math.PI * 1.5, false);
    s.holes.push(p);
  }
  return s;
}

/** 1 tấm thẻ nằm phẳng: thân đùn + 2 lớp in (trước/sau). Gốc = tâm thẻ, mặt dưới chạm y=0. Đơn vị mm. */
function card(o: Badge3DOpts, ft: THREE.Texture, bt: THREE.Texture, faceUp: boolean): THREE.Group {
  const { wMm: w, hMm: h } = o;
  const t = o.event ? 0.4 : 0.76, bev = o.event ? 0.03 : 0.1;
  const shape = cardShape(w, h, o.event ? 2.5 : 3.2, o.slot);
  const body = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: t - 2 * bev, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 2, curveSegments: 28 }),
    [new THREE.MeshStandardMaterial({ color: '#FBFBFA', roughness: 0.5 }), new THREE.MeshStandardMaterial({ color: o.event ? '#F1EFEA' : '#F7F7F5', roughness: o.event ? 0.85 : 0.35 })],
  );
  body.position.z = bev;
  body.castShadow = true; body.receiveShadow = true;
  const flat = new THREE.ShapeGeometry(shape, 28);
  const face = (map: THREE.Texture) => o.event
    ? new THREE.MeshPhysicalMaterial({ map, roughness: 0.62, clearcoat: 0.15, clearcoatRoughness: 0.6, polygonOffset: true, polygonOffsetFactor: -2 })
    : new THREE.MeshPhysicalMaterial({ map, roughness: 0.3, clearcoat: 0.85, clearcoatRoughness: 0.12, polygonOffset: true, polygonOffsetFactor: -2 });
  const f = new THREE.Mesh(flat, face(ft)); f.position.z = t + 0.015;
  const b = new THREE.Mesh(flat, face(bt)); b.rotation.y = Math.PI; b.position.set(w, 0, -0.015);
  const inner = new THREE.Group(); inner.add(body, f, b);
  inner.position.set(-w / 2, -h / 2, 0);
  const g = new THREE.Group(); g.add(inner);
  // nằm phẳng: trục z cục bộ → y thế giới (mặt trước ngửa lên), đỉnh thẻ quay về phía xa (−z)
  g.rotation.x = faceUp ? -Math.PI / 2 : Math.PI / 2;
  if (!faceUp) g.rotation.z = Math.PI; // lật mặt sau lên nhưng đầu thẻ vẫn quay ra xa
  g.position.y = faceUp ? 0 : t;
  return g;
}

/** bao đựng thẻ nhựa cứng trong suốt (to hơn thẻ, lỗ bấm riêng ở mép trên) */
function holder(o: Badge3DOpts, hw: number, hh: number, slotTop: number): THREE.Group {
  const sw = 14, sh = 3.4;
  const shape = cardShape(hw, hh, 3.6, { x: hw / 2 - sw / 2, y: slotTop - sh / 2, w: sw, h: sh });
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.5, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 0.3, bevelSegments: 2, curveSegments: 28 });
  const cap = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, specularIntensity: 1, depthWrite: false });
  const side = new THREE.MeshPhysicalMaterial({ color: '#E8EEF2', transparent: true, opacity: 0.62, roughness: 0.08, clearcoat: 1, depthWrite: false });
  const m = new THREE.Mesh(geo, [cap, side]);
  m.renderOrder = 3;
  m.position.set(-hw / 2, -hh / 2, 0.2);
  const g = new THREE.Group(); g.add(m);
  g.rotation.x = -Math.PI / 2;
  return g;
}

/** dải dây đeo phẳng chạy theo đường cong (mm): mặt trên in lặp, mép + mặt dưới màu nền */
function ribbon(pts: THREE.Vector3[], wMm: number, periodMm: number, tex: THREE.Texture, edgeColor: string): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const N = 900;
  const P = curve.getSpacedPoints(N);
  const len = curve.getLength();
  const th = 0.9, hw = wMm / 2;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const quads: [number, number, number, number][] = []; // chỉ số 4 đỉnh / đoạn cho từng bề mặt
  const L: THREE.Vector3[] = [], R: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(N, i + 1)];
    const t = new THREE.Vector3(b.x - a.x, 0, b.z - a.z).normalize();
    const side = new THREE.Vector3(t.z, 0, -t.x);
    L.push(P[i].clone().addScaledVector(side, hw));
    R.push(P[i].clone().addScaledVector(side, -hw));
  }
  // 4 bề mặt: trên (in), dưới, mép trái, mép phải
  const surf = (fn: (i: number) => [THREE.Vector3, THREE.Vector3], v: [number, number]) => {
    const base = pos.length / 3;
    for (let i = 0; i <= N; i++) {
      const [p, q] = fn(i);
      pos.push(p.x, p.y, p.z, q.x, q.y, q.z);
      const u = ((i / N) * len) / periodMm;
      uv.push(u, v[0], u, v[1]);
    }
    for (let i = 0; i < N; i++) quads.push([base + i * 2, base + i * 2 + 1, base + i * 2 + 2, base + i * 2 + 3]);
    return quads.length;
  };
  const up = (p: THREE.Vector3) => p.clone().setY(p.y + th);
  const nTop = surf((i) => [up(L[i]), up(R[i])], [1, 0]);
  surf((i) => [R[i], L[i]], [0, 1]);
  surf((i) => [L[i], up(L[i])], [0.5, 0.5]);
  surf((i) => [up(R[i]), R[i]], [0.5, 0.5]);
  quads.forEach(([a, b, c, d]) => idx.push(a, c, b, b, c, d));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.addGroup(0, nTop * 6, 0);
  geo.addGroup(nTop * 6, idx.length - nTop * 6, 1);
  geo.computeVertexNormals();
  const top = new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.74, sheen: 0.25, sheenRoughness: 0.6, sheenColor: new THREE.Color('#FFFFFF'), side: THREE.DoubleSide });
  const edge = new THREE.MeshStandardMaterial({ color: edgeColor, roughness: 0.75, side: THREE.DoubleSide });
  const m = new THREE.Mesh(geo, [top, edge]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function badgeBuilder(o: Badge3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back || !o.lanyard) throw new Error('Chưa dựng xong thẻ');
    const [ft, bt, lt] = await Promise.all([
      svgTexOutlined(o.front, o.fontCss, 1600, aniso), svgTexOutlined(o.back, o.fontCss, 1600, aniso), svgTexOutlined(o.lanyard, o.fontCss, 3072, aniso),
    ]);
    for (const t of [ft, bt]) { t.repeat.set(1 / o.wMm, 1 / o.hMm); t.needsUpdate = true; }
    lt.wrapS = THREE.RepeatWrapping; lt.repeat.set(0.5, 1); lt.needsUpdate = true; // texture = 2 chu kỳ

    const G = new THREE.Group(); // đơn vị mm, scale S ở cuối
    const w = o.wMm, h = o.hMm;
    // ---- thẻ chính (ngửa mặt trước) + bao đựng ----
    let attachZ: number; // tâm lỗ bấm nơi móc xỏ (z thế giới, mm)
    let topZ: number;     // mép trên vật chứa
    const main = new THREE.Group();
    if (o.holder) {
      const hw = w + 4, hh = h + 10, slotTop = 4.8;
      const c = card(o, ft, bt, true);
      c.position.set(0, 0.35, -hh / 2 + 8 + h / 2);
      main.add(c, holder(o, hw, hh, slotTop));
      attachZ = -hh / 2 + slotTop; topZ = -hh / 2;
    } else {
      main.add(card(o, ft, bt, true));
      attachZ = -h / 2 + o.slot.y + o.slot.h / 2; topZ = -h / 2;
    }
    G.add(main);
    const ch = o.holder ? h + 10 : h, cw = o.holder ? w + 4 : w;

    // ---- móc: khoen tròn xỏ lỗ → khớp xoay → kẹp bấm giữ 2 đầu dây ----
    const mt = metal();
    const ringR = o.event ? 6.5 : 5.5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.85, 14, 48), mt);
    ring.rotation.x = -Math.PI / 2 + 0.32; // nghiêng: phần gần chui xuống lỗ, phần xa nhô lên
    ring.position.set(0, 1.6, attachZ - ringR + 1.2);
    ring.castShadow = true;
    const swZ = attachZ - ringR * 2 - 1.2;
    const swivel = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 4.2, 24), mt);
    swivel.rotation.x = Math.PI / 2; swivel.position.set(0, 2.1, swZ - 1); swivel.castShadow = true;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 4, 12), mt);
    neck.rotation.x = Math.PI / 2; neck.position.set(0, 2.1, swZ + 1.6);
    const crW = o.lanyardW + 1.4, crL = 11;
    const crZ = swZ - 3 - crL / 2;
    const crimp = new THREE.Mesh(new RoundedBoxGeometry(crW, 3.4, crL, 3, 0.9), mt);
    crimp.position.set(0, 1.9, crZ); crimp.castShadow = true;
    const crimpLip = new THREE.Mesh(new THREE.BoxGeometry(crW + 0.2, 0.5, 1.2), new THREE.MeshStandardMaterial({ color: '#AEB4BB', metalness: 1, roughness: 0.35 }));
    crimpLip.position.set(0, 3.65, crZ + crL / 2 - 1.4);
    G.add(ring, swivel, neck, crimp, crimpLip);

    // ---- thẻ thứ 2 lật mặt sau, nằm chéo bên phải ----
    const second = new THREE.Group();
    second.add(card(o, ft, bt, false));
    second.position.set(cw * 0.5 + w * 0.62 + 6, 0, h * 0.1);
    second.rotation.y = -0.24;
    G.add(second);

    // ---- dây đeo cuộn vòng quanh 2 thẻ, 2 đầu dồn vào kẹp ----
    const C = new THREE.Vector3(0, 1.2, crZ + crL * 0.3);
    const bb = new THREE.Box3().setFromObject(G);
    const lw = o.lanyardW;
    // vòng dây (elip) ôm quanh cụm thẻ; đỉnh vòng cách kẹp ≥ 30mm để dây rẽ mềm, không gập mép
    const top = Math.min(bb.min.z - 8 - lw / 2, C.z - 30), bottom = bb.max.z + 10 + lw / 2;
    const left = bb.min.x - 13 - lw / 2, right = bb.max.x + 13 + lw / 2;
    const ox = (left + right) / 2, oz = (top + bottom) / 2, R = (right - left) / 2, Rz = (bottom - top) / 2;
    // siêu elip (vuông bo tròn) → ôm cả 4 góc cụm thẻ, dây không đè lên thẻ
    const se = (v: number) => Math.sign(v) * Math.pow(Math.abs(v), 2 / 4);
    const at = (a: number, y: number) => new THREE.Vector3(ox + se(Math.cos(a)) * R, y, oz + se(Math.sin(a)) * Rz);
    const pts: THREE.Vector3[] = [];
    // đầu 1 (nằm dưới): từ kẹp đi thẳng lên, rẽ phải vào đỉnh vòng, đi THUẬN chiều kim đồng hồ quanh cụm thẻ…
    pts.push(C.clone(), new THREE.Vector3(C.x + 1, 0.4, C.z - 14));
    const a0 = -Math.PI / 2 + 0.16, a1 = Math.PI + 0.22, steps = 30;
    for (let i = 0; i <= steps; i++) {
      const a = a0 + ((a1 - a0) * i) / steps;
      const wob = 1 + 0.025 * Math.sin(a * 3 + 0.7);
      const p = at(a, 0.15 + 0.45 * Math.max(0, Math.sin(a * 2.3 + 0.4)));
      p.x = ox + (p.x - ox) * wob; p.z = oz + (p.z - oz) * wob;
      pts.push(p);
    }
    // …lên tới bên trái rồi vòng chéo xuống kẹp (đầu 2 nằm đè lên đầu 1)
    pts.push(at(Math.PI + 0.62, 0.5), new THREE.Vector3(C.x - 18, 1.6, C.z - 20), new THREE.Vector3(C.x - 3, 2, C.z - 6), C.clone().setY(2.2));
    G.add(ribbon(pts, o.lanyardW, o.periodMm * 2, lt, o.ribbon));

    G.scale.setScalar(S);
    const out = new THREE.Group(); out.add(G);
    void topZ;
    return { group: out, view: { az: 0.06, el: 1.02 }, aim: 0.2, zoom: 1.18, blob: 0 };
  };
}
