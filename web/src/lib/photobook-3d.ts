'use client';
// Photobook 3D: 1 cuốn MỞ lay-flat nằm trên bàn (trang đôi đang chọn, ruột dày, khe gáy hơi trũng, bìa cứng dư mép)
// + 1 cuốn GẤP đứng phía sau (bìa cứng bồi: mặt bìa + gáy bo tròn + lưng, mép ruột có vân giấy).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, svgTex, type Builder } from './mockup3d';

export interface Photobook3DOpts {
  spreadEl: SVGSVGElement | null; coverEl: SVGSVGElement | null;
  W: number; H: number; bw: number; bh: number; spine: number; pages: number;
  coverColor: string; pageColor: string; fontCss: string;
}

const BT = 2.5; // bìa cứng dày

// vân mép giấy (nhiều tờ xếp chồng)
let edgeCanvas: HTMLCanvasElement | null = null;
function edgeTex(rows: number): THREE.CanvasTexture {
  if (!edgeCanvas) {
    const c = document.createElement('canvas'); c.width = 16; c.height = 256;
    const x = c.getContext('2d')!;
    x.fillStyle = '#F4F1EA'; x.fillRect(0, 0, 16, 256);
    let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let y = 0; y < 256; y += 8) { x.fillStyle = `rgba(120,105,85,${0.18 + r() * 0.16})`; x.fillRect(0, y + 6, 16, 1.4); x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(0, y + 1, 16, 1); }
    edgeCanvas = c;
  }
  const t = new THREE.CanvasTexture(edgeCanvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, Math.max(1, rows / 32));
  return t;
}

// lưới mặt (u: 0..1 theo x, v: 0..1 theo z) với hàm vị trí + uv tuỳ ý
function grid(nu: number, nv: number, pos: (u: number, v: number) => [number, number, number], uv: (u: number, v: number) => [number, number]): THREE.BufferGeometry {
  const P: number[] = [], U: number[] = [], I: number[] = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv;
    P.push(...pos(u, v)); U.push(...uv(u, v));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    I.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  g.setIndex(I);
  g.computeVertexNormals();
  return g;
}
const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => { const x = new THREE.Mesh(g, m); x.castShadow = shadow; x.receiveShadow = true; return x; };

// ---------- cuốn mở ----------
function openBook(o: Photobook3DOpts, spreadTex: THREE.Texture, boardMat: THREE.Material, edgeMat: (rows: number) => THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const { W, H } = o;
  const half = (o.pages / 2) * 0.9 / 2;  // mỗi bên nửa ruột
  const over = 3;
  // bìa cứng 2 bên (mặt trong lộ viền giấy bồi gấp vào)
  for (const sg of [-1, 1]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(W + over, BT, H + over * 2, 3, 0.7), boardMat);
    b.position.set(sg * ((W + over) / 2 + 0.3), BT / 2, 0);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
  }
  // mặt ruột: phẳng (lay-flat), trũng nhẹ sát gáy, phồng rất nhẹ giữa trang
  const top = (u: number) => BT + half + 1.6 * Math.sin(Math.PI * Math.min(1, u * 1.04)) * (1 - u * 0.5) - half * 0.7 * Math.exp(-u * W / 9);
  const NU = 90, NV = 6;
  const pageMat = new THREE.MeshStandardMaterial({ map: spreadTex, color: '#EDEDED', roughness: 0.8, metalness: 0, side: THREE.DoubleSide });
  for (const sg of [-1, 1]) {
    // u: 0 = gáy, 1 = mép ngoài
    const X = (u: number) => sg * u * W;
    const uvx = (u: number) => (sg < 0 ? 0.5 - u * 0.5 : 0.5 + u * 0.5);
    const surf = grid(NU, NV, (u, v) => [X(u), top(u), -H / 2 + v * H], (u, v) => [uvx(u), 1 - v]);
    g.add(mesh(surf, pageMat, false));
    // mép đầu/chân trang (dải theo profile)
    for (const zs of [-1, 1]) {
      const z = zs * H / 2;
      const side = grid(NU, 1, (u, v) => [X(u), BT + v * (top(u) - BT), z], (u, v) => [u * 4, v]);
      g.add(mesh(side, edgeMat(Math.round(half / 0.45)), false));
    }
    // mép ngoài
    const fore = grid(1, 8, (u, v) => [X(1), BT + u * (top(1) - BT), -H / 2 + v * H], (u, v) => [v * 6, u]);
    g.add(mesh(fore, edgeMat(Math.round(half / 0.45)), false));
  }
  return g;
}

// ---------- cuốn gấp (đứng) ----------
function closedBook(o: Photobook3DOpts, coverTex: THREE.Texture, boardMat: THREE.Material, edgeMat: (rows: number) => THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const { W, H, bw, bh } = o;
  const T = (o.pages / 2) * 0.9;            // ruột
  const TT = T + BT * 2;                     // tổng dày
  const VW = bw * 2 + o.spine;
  const uF = (bw + o.spine) / VW, uS = bw / VW;
  const coverMat = new THREE.MeshPhysicalMaterial({ map: coverTex, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, side: THREE.DoubleSide });
  // trục: x = bề rộng (gáy x=0, mép ngoài x=bw), y = cao, z = dày (lưng z=0 → mặt z=TT)
  const yb = (bh - H) / 2;
  // ruột
  const blk = new THREE.Group();
  const em = edgeMat(Math.round(T / 0.45));
  const fe = grid(1, 1, (u, v) => [W, yb + v * H, BT + u * T], (u, v) => [u * 1, v * 5]); fe.computeVertexNormals(); blk.add(mesh(fe, em, false));
  const tp = grid(1, 1, (u, v) => [u * W, yb + H, BT + v * T], (u, v) => [u * 5, v]); blk.add(mesh(tp, em, false));
  const bt = grid(1, 1, (u, v) => [u * W, yb, BT + (1 - v) * T], (u, v) => [u * 5, v]); blk.add(mesh(bt, em, false));
  g.add(blk);
  // bìa trước + bìa sau (khối màu bìa) + mặt in
  for (const front of [true, false]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, BT, 3, 0.7), boardMat);
    b.position.set(bw / 2, bh / 2, front ? TT - BT / 2 : BT / 2);
    b.castShadow = true; b.receiveShadow = true;
    g.add(b);
    const zf = front ? TT + 0.02 : -0.02;
    const face = grid(1, 1,
      (u, v) => [front ? u * bw : (1 - u) * bw, v * bh, zf],
      (u, v) => [front ? uF + u * (1 - uF) : uS - (1 - u) * uS * 1, v]);
    if (!front) {
      // lưng: nhìn từ phía -z, gáy (x=0) nằm bên phải → u ảnh = (bw - x)/VW
      const P = face.getAttribute('position') as THREE.BufferAttribute, UV = face.getAttribute('uv') as THREE.BufferAttribute;
      for (let i = 0; i < P.count; i++) UV.setX(i, (bw - P.getX(i)) / VW);
    }
    face.computeVertexNormals();
    const fm = mesh(face, coverMat, false);
    g.add(fm);
  }
  // gáy bo tròn: nửa trụ phía -x
  const R = TT / 2;
  const sp = grid(24, 1, (u, v) => {
    const a = Math.PI / 2 - u * Math.PI; // u=0: mặt trước (z=TT), u=1: lưng (z=0)
    return [-Math.cos(a) * R * 0.55, v * bh, R + Math.sin(a) * R];
  }, (u, v) => [uF - u * (uF - uS), v]);
  sp.computeVertexNormals();
  g.add(mesh(sp, coverMat));
  // nắp đầu/chân gáy (che khe)
  for (const y of [0, bh]) {
    const cap = new THREE.Mesh(new THREE.CircleGeometry(R, 20, Math.PI / 2, Math.PI), boardMat);
    cap.scale.set(0.55, 1, 1);
    cap.rotation.x = y ? -Math.PI / 2 : Math.PI / 2;
    cap.position.set(0, y, R);
    g.add(cap);
  }
  return g;
}

export function photobookBuilder(o: Photobook3DOpts): Builder {
  return async (aniso) => {
    if (!o.spreadEl || !o.coverEl) throw new Error('Chưa dựng xong sách ảnh');
    const [spreadTex, coverTex] = await Promise.all([svgTex(o.spreadEl, o.fontCss, 2048, aniso), svgTex(o.coverEl, o.fontCss, 2048, aniso)]);
    const boardMat = new THREE.MeshStandardMaterial({ color: o.coverColor, roughness: 0.7, side: THREE.DoubleSide });
    const edgeMat = (rows: number) => new THREE.MeshStandardMaterial({ map: edgeTex(rows), roughness: 0.85, side: THREE.DoubleSide });

    const root = new THREE.Group();
    const open = openBook(o, spreadTex, boardMat, edgeMat);
    open.scale.setScalar(S);
    root.add(open);

    const closed = closedBook(o, coverTex, boardMat, edgeMat);
    const wrap = new THREE.Group();
    wrap.add(closed);
    closed.position.set(-o.bw / 2, 0, -((o.pages / 2) * 0.9 + BT * 2) / 2); // tâm đáy cuốn gấp ở gốc
    wrap.scale.setScalar(S);
    wrap.rotation.y = -0.32;
    wrap.position.set(o.W * 0.62 * S, 0, -(o.H * 0.5 + o.bw * 0.12) * S);
    root.add(wrap);

    return { group: root, view: { az: 0.18, el: 0.62 }, aim: 0.22, zoom: 1.28, blob: 0.35 };
  };
}
