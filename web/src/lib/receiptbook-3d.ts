'use client';
// Cuốn hoá đơn / phiếu liên 3D: bìa sau carton xám + xấp bộ liên (mép thấy sọc trắng–hồng–xanh xen kẽ) + băng keo vải
// gáy cạnh trên + tờ trên cùng (thiết kế của khách, có đường răng cưa) quăn góc lộ liên dưới + 1 liên đã xé đưa khách
// (có chữ viết tay mẫu, mép trên răng cưa) + cây bút. Texture = SVG phiếu thật đang hiện trên trang.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { RB_PAPER } from './receiptbook-engine';

export interface RB3DOpts {
  top: SVGSVGElement | null;    // liên 1 bộ kế tiếp (trống) — tờ trên cùng cuốn
  under: SVGSVGElement | null;  // liên 2 bộ kế tiếp (trống) — lộ ra dưới góc quăn
  torn: SVGSVGElement | null;   // liên đã xé (có chữ viết tay) — đặt cạnh cuốn
  wMm: number; hMm: number; parts: number; perBook: number; fontCss: string;
}

const STUB = 15;   // mm phần gáy phía trên phiếu (băng keo + răng cưa)
const TAPE = 9.5;   // mm băng keo phủ trên mặt

function noiseCanvas(w: number, h: number, base: string, amp: number, seed = 7): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  const img = x.getImageData(0, 0, w, h);
  let s = seed;
  for (let i = 0; i < img.data.length; i += 4) {
    s = (s * 16807) % 2147483647;
    const n = ((s / 2147483647) - 0.5) * amp;
    img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n;
  }
  x.putImageData(img, 0, 0);
  return c;
}

// tờ phiếu = phần gáy (STUB) + phiếu; răng cưa ở ranh giới gáy
async function sheetCanvas(el: SVGSVGElement, fontCss: string, wMm: number, hMm: number, stubMm: number, paper: string, perf: boolean): Promise<HTMLCanvasElement> {
  const ppm = Math.min(11, 2048 / Math.max(wMm, hMm + stubMm));
  const W = Math.round(wMm * ppm), Hs = Math.round(stubMm * ppm), Hf = Math.round(hMm * ppm);
  const form = await svgToCanvas(await selfContainedSvg(el, fontCss), W, Hf, paper);
  const c = document.createElement('canvas'); c.width = W; c.height = Hs + Hf;
  const x = c.getContext('2d')!;
  x.fillStyle = paper; x.fillRect(0, 0, W, Hs + Hf);
  x.drawImage(form, 0, Hs);
  if (perf) {
    // đường răng cưa: lỗ chấm nhỏ + bóng nhẹ
    const py = Hs * 0.86;
    x.fillStyle = 'rgba(60,60,60,0.38)';
    for (let px = ppm * 1.2; px < W - ppm; px += ppm * 1.9) { x.beginPath(); x.arc(px, py, Math.max(1, ppm * 0.28), 0, Math.PI * 2); x.fill(); }
  }
  return c;
}

// sọc mép xấp giấy: mỗi tờ 1 vạch màu giấy liên, xen tờ lót mỏng tối hơn
function edgeCanvas(sheets: number, parts: number): HTMLCanvasElement {
  const H = 1024, c = document.createElement('canvas'); c.width = 16; c.height = H;
  const x = c.getContext('2d')!;
  const n = Math.max(6, sheets);
  const sh = H / n;
  let s = 13;
  for (let i = 0; i < n; i++) {
    s = (s * 16807) % 2147483647;
    const j = (s / 2147483647 - 0.5) * 10;
    const col = new THREE.Color(RB_PAPER[parts > 1 ? i % parts : 0]);
    col.offsetHSL(0, 0, j / 255 - 0.015);
    x.fillStyle = `#${col.getHexString()}`;
    x.fillRect(0, i * sh, 16, sh);
    x.fillStyle = 'rgba(0,0,0,0.10)';
    x.fillRect(0, i * sh + sh - Math.max(0.6, sh * 0.18), 16, Math.max(0.6, sh * 0.18));
  }
  return c;
}

// mặt phẳng nằm ngang (y lên), trục dài theo z: z = -L/2 là cạnh gáy; góc dưới-phải quăn lên kiểu lật trang
function curledSheet(w: number, l: number, curl: number, mats: THREE.Material[]): THREE.Group {
  const geo = new THREE.PlaneGeometry(w, l, 48, 64);
  geo.rotateX(-Math.PI / 2);
  if (curl > 0) {
    const pos = geo.attributes.position;
    const n = new THREE.Vector2(1, 1).normalize();
    const c = curl * Math.min(w, l);
    const corner = new THREE.Vector2(w / 2, l / 2);
    const lineP = corner.clone().addScaledVector(n, -c);
    const R = c * 0.62;
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector2(pos.getX(i), pos.getZ(i));
      const d = p.clone().sub(lineP).dot(n);
      if (d <= 0) continue;
      const th = d / R;
      const base = p.clone().addScaledVector(n, -d);
      const q = base.addScaledVector(n, R * Math.sin(th));
      pos.setXYZ(i, q.x, R * (1 - Math.cos(th)), q.y);
    }
    geo.computeVertexNormals();
  }
  const g = new THREE.Group();
  for (const m of mats) { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); }
  return g;
}

function pen(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color: '#1B2A4A', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const metal = new THREE.MeshStandardMaterial({ color: '#D9DDE2', metalness: 1, roughness: 0.22 });
  const L = 138 * S, r = 4.6 * S;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, L * 0.62, 32), body);
  barrel.position.y = L * 0.31;
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, L * 0.36, 32), body);
  cap.position.y = L * 0.62 + L * 0.18;
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 2.2 * S, 32), metal);
  ring.position.y = L * 0.62;
  const top = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), body);
  top.position.y = L * 0.98;
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.25, 13 * S, 32), metal);
  cone.position.y = -6.5 * S;
  const tip = new THREE.Mesh(new THREE.SphereGeometry(r * 0.26, 12, 8), metal);
  tip.position.y = -13 * S;
  const clip = new THREE.Mesh(new THREE.BoxGeometry(2.4 * S, L * 0.3, 1.2 * S), metal);
  clip.position.set(0, L * 0.8, r * 1.3);
  for (const m of [barrel, cap, ring, top, cone, tip, clip]) { m.castShadow = true; g.add(m); }
  return g;
}

export function receiptBookBuilder(o: RB3DOpts): Builder {
  return async (aniso) => {
    if (!o.top || !o.torn) throw new Error('Chưa dựng xong phiếu');
    const parts = Math.max(1, Math.min(3, o.parts));
    const w = o.wMm, l = o.hMm + STUB;
    const paper1 = RB_PAPER[0], paper2 = RB_PAPER[parts > 1 ? 1 : 0];
    const [cTop, cUnder, cTorn] = await Promise.all([
      sheetCanvas(o.top, o.fontCss, w, o.hMm, STUB, paper1, true),
      sheetCanvas(o.under || o.top, o.fontCss, w, o.hMm, STUB, paper2, true),
      sheetCanvas(o.torn, o.fontCss, w, o.hMm, 3, RB_PAPER[parts > 1 ? 1 : 0], false),
    ]);
    const tTop = canvasTex(cTop, aniso), tUnder = canvasTex(cUnder, aniso), tTorn = canvasTex(cTorn, aniso);

    const g = new THREE.Group();
    const book = new THREE.Group();
    g.add(book);

    // bìa carton xám
    const boardT = 1.8;
    const board = new THREE.Mesh(new THREE.BoxGeometry((w + 1.5) * S, boardT * S, (l + 1.5) * S),
      new THREE.MeshStandardMaterial({ map: canvasTex(noiseCanvas(256, 256, '#8D8880', 26, 5), aniso), roughness: 0.92 }));
    board.position.y = (boardT / 2) * S;
    board.castShadow = true; board.receiveShadow = true;
    book.add(board);

    // xấp bộ liên
    const sheets = Math.min(160, o.perBook * parts);
    const T = Math.min(9, Math.max(3.2, sheets * 0.072));
    const edge = canvasTex(edgeCanvas(Math.min(90, sheets), parts), aniso);
    const edgeMat = new THREE.MeshStandardMaterial({ map: edge, roughness: 0.85 });
    const topFaceMat = new THREE.MeshStandardMaterial({ map: tUnder, roughness: 0.8 });
    const plain = new THREE.MeshStandardMaterial({ color: '#EDEBE6', roughness: 0.9 });
    const stack = new THREE.Mesh(new THREE.BoxGeometry(w * S, T * S, l * S), [edgeMat, edgeMat, topFaceMat, plain, edgeMat, plain]);
    stack.position.y = (boardT + T / 2) * S;
    stack.castShadow = true; stack.receiveShadow = true;
    book.add(stack);
    const topY = (boardT + T) * S;

    // tờ trên cùng (liên 1) — quăn góc dưới phải, mặt lưng giấy trơn
    const front = new THREE.MeshStandardMaterial({ map: tTop, roughness: 0.78, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -1 });
    const back = new THREE.MeshStandardMaterial({ color: '#F2F0EB', roughness: 0.85, side: THREE.BackSide });
    const top = curledSheet(w * S, l * S, 0.3, [front, back]);
    top.position.y = topY + 0.06 * S;
    book.add(top);

    // băng keo vải gáy: bọc mép trên (mặt trên + mép + mặt dưới)
    const clothC = noiseCanvas(256, 256, '#1F1F24', 34, 9);
    const cloth = new THREE.MeshStandardMaterial({ map: canvasTex(clothC, aniso), roughness: 0.75, bumpMap: canvasTex(noiseCanvas(256, 256, '#808080', 90, 11), aniso), bumpScale: 0.6 });
    const tapeT = 0.4;
    const tTopM = new THREE.Mesh(new THREE.BoxGeometry((w + 2) * S, tapeT * S, TAPE * S), cloth);
    tTopM.position.set(0, topY + (tapeT / 2 + 0.08) * S, (-l / 2 + TAPE / 2 - 0.6) * S);
    const hEdge = boardT + T + tapeT + 0.2;
    const tEdge = new THREE.Mesh(new THREE.BoxGeometry((w + 2) * S, hEdge * S, tapeT * S), cloth);
    tEdge.position.set(0, (hEdge / 2) * S, (-l / 2 - 0.75 - tapeT / 2) * S);
    for (const m of [tTopM, tEdge]) { m.castShadow = true; m.receiveShadow = true; book.add(m); }

    // liên đã xé đưa khách: mép trên răng cưa (alpha), hơi cong
    const tl = o.hMm + 3;
    const ac = document.createElement('canvas'); ac.width = 512; ac.height = 512;
    const ax = ac.getContext('2d')!;
    ax.fillStyle = '#fff'; ax.fillRect(0, 0, 512, 512);
    ax.fillStyle = '#000';
    const tooth = 512 / Math.max(8, Math.round(w / 1.9));
    const edgePx = (2.2 / tl) * 512;
    ax.beginPath(); ax.moveTo(0, 0);
    for (let xx = 0; xx <= 512; xx += tooth) { ax.lineTo(xx, edgePx * (0.35 + ((xx / tooth) % 2) * 0.5)); }
    ax.lineTo(512, 0); ax.closePath(); ax.fill();
    const alpha = canvasTex(ac, aniso);
    alpha.colorSpace = THREE.NoColorSpace;
    const tornFront = new THREE.MeshStandardMaterial({ map: tTorn, alphaMap: alpha, alphaTest: 0.5, roughness: 0.8, side: THREE.FrontSide });
    const tornBack = new THREE.MeshStandardMaterial({ color: new THREE.Color(RB_PAPER[parts > 1 ? 1 : 0]).multiplyScalar(0.96), alphaMap: alpha, alphaTest: 0.5, roughness: 0.85, side: THREE.BackSide });
    const torn = curledSheet(w * S, tl * S, 0.12, [tornFront, tornBack]);
    // đặt bên phải cuốn, xoay nhẹ
    const gap = 18;
    const wide = w > o.hMm * 1.15; // phiếu ngang (A5 ngang, 1/3 A4): liên xé đặt PHÍA TRƯỚC cuốn → cụm gọn, khung nhìn đầy
    if (wide) {
      torn.position.set(w * 0.2 * S, 0.05 * S, (l / 2 + tl / 2 - 8) * S);
      torn.rotation.y = -0.1;
    } else {
      torn.position.set((w + gap) * S, 0.05 * S, (l - tl) * 0.5 * S + 6 * S);
      torn.rotation.y = -0.14;
    }
    g.add(torn);

    // bút nằm chéo trên liên đã xé
    const p = pen();
    p.rotation.z = Math.PI / 2;
    p.rotation.y = 0.55;
    if (wide) p.position.set((w * 0.45) * S, 4.8 * S, (l / 2 + tl * 0.75) * S);
    else p.position.set((w * 1.02 + gap) * S, 4.8 * S, (o.hMm * 0.12) * S);
    g.add(p);

    // canh giữa cụm
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    g.position.set(-c.x, 0, -c.z);
    const wrap = new THREE.Group(); wrap.add(g);
    return { group: wrap, view: { az: 0.12, el: 0.86 }, aim: 0.2, zoom: wide ? 1.3 : 1.4, blob: 0 };
  };
}
