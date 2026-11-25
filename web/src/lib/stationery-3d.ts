'use client';
// Bộ văn phòng 3D (kiểu mockup nhận diện): kẹp file MỞ nằm phẳng (mặt trong + túi có thư cài + card cắm khe),
// 1 kẹp file ĐÓNG đè lên nửa trái (thấy bìa trước), 1 cây bút. Texture = SVG thiết kế của khách.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { FD, FD_CARD, pocketShapePts } from './stationery-engine';

export interface StationeryEls {
  front: SVGSVGElement | null; back: SVGSVGElement | null; spine: SVGSVGElement | null; pocket: SVGSVGElement | null;
  inside: SVGSVGElement | null; letter: SVGSVGElement | null; cardF: SVGSVGElement | null; cardB: SVGSVGElement | null;
  accent: string; fontCss: string;
}

const MM = S;             // 1mm

// bóng tiếp xúc mềm (hình chữ nhật bo mờ) — vật mỏng nằm chồng nhau cần bóng này mới thấy "nằm lên" nhau
let shadowCanvas: HTMLCanvasElement | null = null;
function softShadow(w: number, d: number, opacity: number): THREE.Mesh {
  if (!shadowCanvas) {
    shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 256;
    const ctx = shadowCanvas.getContext('2d')!;
    ctx.filter = 'blur(18px)'; ctx.fillStyle = '#000'; ctx.fillRect(40, 40, 176, 176);
  }
  const tex = new THREE.CanvasTexture(shadowCanvas); // mỗi lần dựng 1 texture riêng (cảnh cũ bị dispose)
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * (256 / 176), d * (256 / 176)), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, color: '#1a140c' }));
  m.rotation.x = -Math.PI / 2; m.renderOrder = 1;
  return m;
}
const T = 0.1 * S;        // 0.1mm (đơn vị thiết kế)

export function stationeryBuilder(o: StationeryEls): Builder {
  return async (aniso) => {
    const need = [o.front, o.back, o.spine, o.pocket, o.inside, o.letter, o.cardF, o.cardB];
    if (need.some((e) => !e)) throw new Error('Chưa dựng xong bộ văn phòng');
    const [tFront, tBack, tSpine, tPocket, tInside, tLetter, tCardF, tCardB] = await Promise.all([
      svgTex(o.front!, o.fontCss, 1400, aniso), svgTex(o.back!, o.fontCss, 1200, aniso), svgTex(o.spine!, o.fontCss, 48, aniso),
      svgTex(o.pocket!, o.fontCss, 1400, aniso), svgTex(o.inside!, o.fontCss, 1400, aniso), svgTex(o.letter!, o.fontCss, 1500, aniso),
      svgTex(o.cardF!, o.fontCss, 900, aniso), svgTex(o.cardB!, o.fontCss, 900, aniso),
    ]);
    const { PW, PH, SP, PK } = FD;
    const pw = PW * T, ph = PH * T, sp = SP * T, pk = PK * T;
    const board = 0.45 * MM;  // bìa C300
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.92 });
    // cán màng mờ: lì nhưng có ánh nhẹ khi nghiêng
    // ánh sáng từ trên xuống dễ làm màu in nhạt đi → nhân nhẹ (#E4) cho khớp màu file in
    const TONE = '#E4E4E4';
    const matte = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, color: TONE, roughness: 0.6, clearcoat: 0.3, clearcoatRoughness: 0.55 });
    const paper = (map: THREE.Texture) => new THREE.MeshStandardMaterial({ map, color: TONE, roughness: 0.85 });
    const box = (w: number, t: number, d: number, top: THREE.Material, bottom: THREE.Material = edgeMat, side: THREE.Material = edgeMat, left: THREE.Material = side) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, t, d), [side, left, top, bottom, side, side]);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    const g = new THREE.Group();

    // 1) kẹp file mở: mặt trong lên trên
    const spreadW = pw * 2 + sp;
    const open = box(spreadW, board, ph, matte(tInside), new THREE.MeshStandardMaterial({ color: o.accent, roughness: 0.6 }));
    open.position.set(0, board / 2, 0);
    g.add(open);
    // nếp gấp gáy: 2 đường hằn mảnh
    const crease = new THREE.MeshStandardMaterial({ color: '#000000', transparent: true, opacity: 0.07, roughness: 1 });
    for (const x of [-sp / 2, sp / 2]) {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(0.5 * MM, ph), crease);
      c.rotation.x = -Math.PI / 2; c.position.set(x, board + 0.02 * MM, 0); g.add(c);
    }
    const rightX0 = sp / 2; // mép trái nửa phải

    // 2) thư cài trong túi (2 tờ, tờ trên lộ tiêu đề) — đáy thư lọt trong túi
    const sheetT = 0.1 * MM;
    const lw = 210 * MM, lh = 297 * MM;
    const letterMat = paper(tLetter);
    const blank = new THREE.MeshStandardMaterial({ color: '#FBFBF9', roughness: 0.9 });
    const sheetZ = ph / 2 - 8 * MM - lh / 2;
    const s2 = box(lw, sheetT, lh, blank); s2.position.set(rightX0 + pw / 2 + 2 * MM, board + sheetT * 0.5, sheetZ - 3 * MM); s2.rotation.y = -0.035; g.add(s2);
    const s1 = box(lw, sheetT, lh, letterMat); s1.position.set(rightX0 + pw / 2 - 1 * MM, board + sheetT * 1.6, sheetZ); s1.rotation.y = 0.012; g.add(s1);

    // 3) túi: đùn từ đúng đường cắt (mép trên cong), texture theo toạ độ thiết kế
    const shape = new THREE.Shape(pocketShapePts(48).map(([u, v]) => new THREE.Vector2(u, v)));
    const pg = new THREE.ExtrudeGeometry(shape, { depth: 4.5, bevelEnabled: false, curveSegments: 24 });
    tPocket.flipY = false; tPocket.repeat.set(1 / PW, 1 / PK); tPocket.needsUpdate = true;
    const pocketCap = new THREE.MeshPhysicalMaterial({ map: tPocket, color: TONE, roughness: 0.58, clearcoat: 0.3, clearcoatRoughness: 0.55 });
    const pocket = new THREE.Mesh(pg, [pocketCap, edgeMat]);
    pocket.castShadow = true; pocket.receiveShadow = true;
    const pocketG = new THREE.Group();
    pocketG.scale.set(T, -T, T);           // toạ độ thiết kế (y xuống) → lật y
    pocketG.add(pocket);
    pocketG.rotation.x = -Math.PI / 2;     // nằm phẳng: mặt in hướng lên, mép trên (v=0) ở phía xa
    pocketG.position.set(rightX0, board + sheetT * 3, ph / 2 - pk);
    g.add(pocketG);

    // 4) card cắm vào 2 khe trên túi
    const cw = FD_CARD.w * T, chh = FD_CARD.h * T, ct = 0.38 * MM;
    const card = box(cw, ct, chh, matte(tCardF), matte(tCardB));
    card.position.set(rightX0 + FD_CARD.cx * T, board + sheetT * 3 + 0.45 * MM + ct / 2 + 0.05 * MM, ph / 2 - pk + FD_CARD.cy * T);
    g.add(card);

    // 5) kẹp file đóng đè nửa trái (bìa trước lên trên), dày ~3mm vì có giấy bên trong
    const ft = 3 * MM;
    const spineMat = new THREE.MeshStandardMaterial({ map: tSpine, roughness: 0.6 });
    tSpine.center.set(0.5, 0.5); tSpine.rotation = Math.PI / 2;
    const closed = box(pw, ft, ph, matte(tFront), matte(tBack), edgeMat, spineMat);
    closed.position.set(-pw * 0.66, board + ft / 2 + 0.05 * MM, -ph * 0.06);
    closed.rotation.y = 0.11;
    g.add(closed);
    const csh = softShadow(pw * 1.02, ph * 1.02, 0.38); // bóng kẹp đóng đổ lên kẹp mở (lệch theo hướng đèn)
    csh.position.set(closed.position.x + 2.2 * MM, board + 0.03 * MM, closed.position.z - 1.6 * MM); csh.rotation.z = 0.11;
    g.add(csh);
    const ksh = softShadow(cw * 1.04, chh * 1.04, 0.3);
    ksh.position.set(card.position.x + 0.8 * MM, card.position.y - ct / 2 - 0.01 * MM, card.position.z - 0.6 * MM);
    g.add(ksh);
    const osh = softShadow(spreadW * 1.01, ph * 1.01, 0.16);
    osh.position.set(1 * MM, 0.02 * MM, -0.6 * MM); g.add(osh);

    // 6) bút ký: thân sơn bóng màu thương hiệu + ngòi/kẹp kim loại
    const pen = new THREE.Group();
    const r = 4.6 * MM, len = 138 * MM;
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: o.accent, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.12 });
    const metal = new THREE.MeshStandardMaterial({ color: '#D9DCE1', metalness: 1, roughness: 0.2 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len * 0.62, 40), bodyMat); body.position.y = len * 0.19;
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 1.02, len * 0.3, 40), bodyMat); cap.position.y = -len * 0.27;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, 2.2 * MM, 40), metal); ring.position.y = -len * 0.115;
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.98, r * 0.22, 16 * MM, 40), metal); cone.position.y = len * 0.5 + 8 * MM; cone.rotation.z = Math.PI;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 16, 12), metal); tip.position.y = len * 0.5 + 16 * MM;
    const endCap = new THREE.Mesh(new THREE.SphereGeometry(r * 1.02, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), bodyMat); endCap.position.y = -len * 0.42; endCap.rotation.x = Math.PI;
    const clip = new THREE.Mesh(new THREE.BoxGeometry(2.4 * MM, len * 0.26, 1.2 * MM), metal); clip.position.set(0, -len * 0.27, r + 1.4 * MM);
    for (const m of [body, cap, ring, cone, tip, endCap, clip]) { m.castShadow = true; pen.add(m); }
    pen.rotation.z = Math.PI / 2;          // nằm ngang
    const penG = new THREE.Group(); penG.add(pen);
    penG.rotation.y = -0.22;
    penG.position.set(spreadW * 0.24, r + 0.2 * MM, ph / 2 + 30 * MM);
    const psh = softShadow(len * 1.05, r * 2.6, 0.42);
    psh.rotation.z = -0.22; psh.position.set(penG.position.x + 1.5 * MM, 0.03 * MM, penG.position.z - 1.2 * MM);
    g.add(psh);
    // kẹp bút nằm trên cùng (xoay quanh trục bút để kẹp hướng lên)
    pen.rotation.x = -Math.PI / 2;
    g.add(penG);

    return { group: g, view: { az: 0.08, el: 1.0 }, aim: 0.1, zoom: 1.45, blob: 0 };
  };
}
