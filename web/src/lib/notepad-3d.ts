'use client';
// Giấy note 3D: xấp sticky (đùn từ đúng dáng bế, mép lớp giấy, tờ trên quăn góc) + tờ rời có chữ viết tay; sổ note xé
// (bìa sau kraft, gáy keo, 1 cuốn đóng bìa + 1 cuốn mở); hộp note vuông in 4 mặt hông (mặt hông = hình in × vân lớp giấy);
// bộ sticky bìa cứng mở phẳng (sticky nhiều cỡ + flag) + 1 bộ gập. Texture = SVG thiết kế thật trên trang.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { CUBE_MM, FLAG, FLAG_COLORS, SET, SET_PADS, type NPKind, type NPShape } from './notepad-engine';

export interface NP3DOpts {
  kind: NPKind; fontCss: string;
  sheet: SVGSVGElement | null;   // tờ trên cùng (trống)
  hand: SVGSVGElement | null;    // tờ rời có chữ viết tay
  cover?: SVGSVGElement | null;  // bìa sổ / mặt trước bộ sticky
  sides?: (SVGSVGElement | null)[]; // 4 mặt hông hộp
  small?: SVGSVGElement | null;  // sticky nhỏ trong bộ
  inside?: SVGSVGElement | null; // mặt trong bìa bộ sticky (nền)
  wMm: number; hMm: number; shape: NPShape; paperHex: string; sheets: number;
}

const U3 = 0.1 * S; // 0.1mm (đơn vị SVG engine) → 3D

async function svgCanvas(el: SVGSVGElement, fontCss: string, outW: number, bg = ''): Promise<HTMLCanvasElement> {
  const vb = el.viewBox.baseVal;
  const outH = Math.max(4, Math.round((outW * vb.height) / vb.width));
  return svgToCanvas(await selfContainedSvg(el, fontCss), outW, outH, bg);
}

function rng(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

// mép xấp giấy: vạch lớp mảnh, hơi lệch sáng tối
function edgeCanvas(base: string, layers: number, seed = 3): HTMLCanvasElement {
  const H = 512, c = document.createElement('canvas'); c.width = 64; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 64, H);
  const r = rng(seed);
  const n = Math.max(8, layers), sh = H / n;
  for (let i = 0; i < n; i++) {
    x.fillStyle = `rgba(0,0,0,${0.05 + r() * 0.07})`;
    x.fillRect(0, i * sh + sh * (0.7 + r() * 0.2), 64, Math.max(0.7, sh * 0.18));
    if (r() < 0.25) { x.fillStyle = 'rgba(255,255,255,0.25)'; x.fillRect(0, i * sh, 64, Math.max(0.5, sh * 0.15)); }
  }
  return c;
}

// mặt hông hộp: hình in × vạch lớp giấy ngang dày đặc
function sideCanvas(art: HTMLCanvasElement, seed: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = art.width; c.height = art.height;
  const x = c.getContext('2d')!;
  x.drawImage(art, 0, 0);
  const r = rng(seed);
  const n = 260, sh = c.height / n;
  for (let i = 0; i < n; i++) {
    x.fillStyle = `rgba(0,0,0,${0.035 + r() * 0.06})`;
    x.fillRect(0, i * sh + sh * 0.75, c.width, Math.max(0.6, sh * 0.22));
    if (r() < 0.12) { x.fillStyle = 'rgba(255,255,255,0.18)'; x.fillRect(0, i * sh, c.width, Math.max(0.5, sh * 0.2)); }
  }
  return c;
}

function noiseCanvas(base: string, amp: number, seed = 7, size = 256): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = size; c.height = size;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, size, size);
  const img = x.getImageData(0, 0, size, size);
  const r = rng(seed);
  for (let i = 0; i < img.data.length; i += 4) { const n = (r() - 0.5) * amp; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
  x.putImageData(img, 0, 0);
  return c;
}

// tờ phẳng nằm ngang (y lên), mép trên ảnh ở -z; quăn góc dưới-phải (curl = tỉ lệ cạnh)
function curledSheet(w: number, l: number, curl: number, mats: THREE.Material[], corner: 1 | -1 = 1): THREE.Group {
  const geo = new THREE.PlaneGeometry(w, l, 40, 40);
  geo.rotateX(-Math.PI / 2);
  if (curl > 0) {
    const pos = geo.attributes.position;
    const n = new THREE.Vector2(corner, 1).normalize();
    const c = curl * Math.min(w, l);
    const cp = new THREE.Vector2(corner * w / 2, l / 2);
    const lineP = cp.clone().addScaledVector(n, -c);
    const R = c * 0.7;
    for (let i = 0; i < pos.count; i++) {
      const p = new THREE.Vector2(pos.getX(i), pos.getZ(i));
      const d = p.clone().sub(lineP).dot(n);
      if (d <= 0) continue;
      const th = Math.min(Math.PI * 0.62, d / R);
      const base = p.clone().addScaledVector(n, -d);
      const qv = base.addScaledVector(n, R * Math.sin(th));
      pos.setXYZ(i, qv.x, R * (1 - Math.cos(th)), qv.y);
    }
    geo.computeVertexNormals();
  }
  const g = new THREE.Group();
  for (const m of mats) { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; mesh.receiveShadow = true; g.add(mesh); }
  return g;
}

function pen(color = '#1B2A4A'): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.MeshPhysicalMaterial({ color, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
  const metal = new THREE.MeshStandardMaterial({ color: '#D9DDE2', metalness: 1, roughness: 0.22 });
  const L = 138 * S, r = 4.4 * S;
  const parts: THREE.Mesh[] = [];
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, L * 0.62, 32), body); barrel.position.y = L * 0.31; parts.push(barrel);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.06, r * 1.06, L * 0.36, 32), body); cap.position.y = L * 0.8; parts.push(cap);
  const ring = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.08, r * 1.08, 2.2 * S, 32), metal); ring.position.y = L * 0.62; parts.push(ring);
  const top = new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), body); top.position.y = L * 0.98; parts.push(top);
  const cone = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.25, 13 * S, 32), metal); cone.position.y = -6.5 * S; parts.push(cone);
  const clipM = new THREE.Mesh(new THREE.BoxGeometry(2.4 * S, L * 0.3, 1.2 * S), metal); clipM.position.set(0, L * 0.8, r * 1.3); parts.push(clipM);
  for (const m of parts) { m.castShadow = true; g.add(m); }
  return g;
}

// xấp giấy đùn theo dáng bế (đơn vị SVG 0.1mm, y xuống) → nằm phẳng trên mặt bàn, mặt trên = texture thiết kế
function shapeStack(d: string, W: number, H: number, depth: number, capTex: THREE.Texture, edgeTex: THREE.Texture): THREE.Group {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 24 });
  capTex.flipY = false;
  capTex.repeat.set(1 / W, 1 / H);
  capTex.needsUpdate = true;
  edgeTex.wrapS = edgeTex.wrapT = THREE.RepeatWrapping;
  const cap = new THREE.MeshStandardMaterial({ map: capTex, roughness: 0.82, transparent: true, alphaTest: 0.3 });
  const side = new THREE.MeshStandardMaterial({ map: edgeTex, color: '#FFFFFF', roughness: 0.9 });
  edgeTex.repeat.set(1 / 80, 1 / depth); // UV hông = (x|y, z) theo đơn vị 0.1mm → 1 lần vạch lớp theo chiều dày
  const mesh = new THREE.Mesh(geo, [cap, side]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  const inner = new THREE.Group(); inner.scale.set(U3, -U3, U3); inner.add(mesh);
  const g = new THREE.Group();
  const rot = new THREE.Group(); rot.rotation.x = -Math.PI / 2; rot.add(inner);
  // sau xoay: x→x, svg-y→z (y xuống = về phía người xem), đùn z→ lên trên
  inner.position.set(-W * U3 / 2, H * U3 / 2, 0);
  g.add(rot);
  return g;
}

export function notepadBuilder(o: NP3DOpts): Builder {
  return async (aniso) => {
    if (!o.sheet || !o.hand) throw new Error('Chưa dựng xong giấy note');
    const g = new THREE.Group();
    const paper = o.paperHex;
    const ppm = Math.min(14, 2048 / Math.max(o.wMm, o.hMm));
    const [cSheet, cHand] = await Promise.all([svgCanvas(o.sheet, o.fontCss, Math.round(o.wMm * ppm)), svgCanvas(o.hand, o.fontCss, Math.round(o.wMm * ppm))]);
    const W = o.wMm * 10, H = o.hMm * 10;
    const backPaper = new THREE.MeshStandardMaterial({ color: new THREE.Color(paper).multiplyScalar(0.97), roughness: 0.88, side: THREE.BackSide });
    const sheetMat = (c: HTMLCanvasElement) => new THREE.MeshStandardMaterial({ map: canvasTex(c, aniso), roughness: 0.8, side: THREE.FrontSide, transparent: true, alphaTest: 0.3, polygonOffset: true, polygonOffsetFactor: -1 });
    const rectish = o.shape === 'sq' || o.shape === 'rect';
    let view = { az: 0.3, el: 0.78 }, zoom = 1.3, aim = 0.2, blob = 0;

    if (o.kind === 'sticky') {
      const T = Math.max(4, o.sheets * 0.08);
      const { shapePath } = await import('./notepad-engine');
      const d = shapePath(o.shape, W, H);
      const stack = shapeStack(d, W, H, T * 10, canvasTex(cSheet, aniso), canvasTex(edgeCanvas(paper, 60), aniso));
      stack.rotation.y = 0.1;
      g.add(stack);
      if (rectish) {
        const top = curledSheet(o.wMm * S, o.hMm * S, 0.28, [sheetMat(cSheet), backPaper]);
        top.position.y = (T + 0.06) * S; top.rotation.y = 0.1;
        g.add(top);
      }
      // tờ rời có chữ viết tay, bóc ra dán cạnh bên
      const loose = rectish
        ? curledSheet(o.wMm * S, o.hMm * S, 0.14, [sheetMat(cHand), backPaper], -1)
        : shapeStack(d, W, H, 1, canvasTex(cHand, aniso), canvasTex(edgeCanvas(paper, 2), aniso));
      loose.position.set((o.wMm * 1.02) * S, 0.1 * S, (o.hMm * 0.42) * S);
      loose.rotation.y = -0.22;
      g.add(loose);
      view = { az: 0.18, el: 0.86 }; zoom = 1.6; aim = 0.15;
    } else if (o.kind === 'pad') {
      const T = Math.max(4, o.sheets * 0.1);
      const boardT = 1.6, gum = 3.5;
      const kraft = new THREE.MeshStandardMaterial({ map: canvasTex(noiseCanvas('#A88459', 30, 4), aniso), roughness: 0.92 });
      const edge = new THREE.MeshStandardMaterial({ map: canvasTex(edgeCanvas('#FBFAF6', 70), aniso), roughness: 0.88 });
      const plain = new THREE.MeshStandardMaterial({ color: '#F4F2EC', roughness: 0.9 });
      const cCover = o.cover ? await svgCanvas(o.cover, o.fontCss, Math.round(o.wMm * ppm), '#FFFFFF') : null;
      const makePad = (withCover: boolean) => {
        const pg = new THREE.Group();
        const board = new THREE.Mesh(new THREE.BoxGeometry(o.wMm * S, boardT * S, o.hMm * S), kraft);
        board.position.y = (boardT / 2) * S; board.castShadow = true; board.receiveShadow = true; pg.add(board);
        const stack = new THREE.Mesh(new THREE.BoxGeometry(o.wMm * S, T * S, o.hMm * S), [edge, edge, plain, plain, edge, edge]);
        stack.position.y = (boardT + T / 2) * S; stack.castShadow = true; stack.receiveShadow = true; pg.add(stack);
        const topY = (boardT + T) * S;
        if (withCover && cCover) {
          const cov = new THREE.Mesh(new THREE.BoxGeometry(o.wMm * S, 0.5 * S, o.hMm * S), [kraft, kraft, new THREE.MeshPhysicalMaterial({ map: canvasTex(cCover, aniso), roughness: 0.45, clearcoat: 0.4 }), kraft, kraft, kraft]);
          cov.position.y = topY + 0.25 * S; cov.castShadow = true; pg.add(cov);
        } else {
          const top = curledSheet(o.wMm * S, o.hMm * S, 0.22, [sheetMat(cSheet), backPaper]);
          top.position.y = topY + 0.05 * S; pg.add(top);
          const under = new THREE.Mesh(new THREE.PlaneGeometry(o.wMm * S, o.hMm * S), new THREE.MeshStandardMaterial({ map: canvasTex(cSheet, aniso), roughness: 0.82 }));
          under.rotation.x = -Math.PI / 2; under.position.y = topY + 0.01 * S; pg.add(under);
        }
        // gáy keo đỏ sẫm phủ mép trên (mặt trên + mép)
        const gumMat = new THREE.MeshPhysicalMaterial({ color: '#7A1F1F', roughness: 0.35, clearcoat: 0.6 });
        const hEdge = boardT + T + (withCover ? 0.6 : 0.2);
        const gTop = new THREE.Mesh(new THREE.BoxGeometry((o.wMm + 0.4) * S, 0.35 * S, gum * S), gumMat);
        gTop.position.set(0, hEdge * S, (-o.hMm / 2 + gum / 2 - 0.3) * S);
        const gEdge = new THREE.Mesh(new THREE.BoxGeometry((o.wMm + 0.4) * S, hEdge * S, 0.5 * S), gumMat);
        gEdge.position.set(0, (hEdge / 2) * S, (-o.hMm / 2 - 0.25) * S);
        for (const m of [gTop, gEdge]) { m.castShadow = true; pg.add(m); }
        return pg;
      };
      const closed = makePad(true);
      closed.position.set((-o.wMm * 0.62) * S, 0, (-o.hMm * 0.08) * S); closed.rotation.y = 0.16;
      const open = makePad(false);
      open.position.set((o.wMm * 0.56) * S, 0, (o.hMm * 0.06) * S); open.rotation.y = -0.08;
      g.add(closed, open);
      const p = pen(); p.rotation.z = Math.PI / 2; p.rotation.y = 1.45;
      p.position.set((o.wMm * 1.22) * S, 4.4 * S, (o.hMm * 0.05) * S);
      g.add(p);
      view = { az: 0.1, el: 0.92 }; zoom = 1.42; aim = 0.1;
    } else if (o.kind === 'cube') {
      const F = CUBE_MM;
      const sideCs = await Promise.all((o.sides || []).map((el, i) => (el ? svgCanvas(el, o.fontCss, 1024, '#FFFFFF').then((c) => sideCanvas(c, 11 + i)) : Promise.resolve(null))));
      const sm = (i: number) => {
        const c = sideCs[i];
        return c ? new THREE.MeshStandardMaterial({ map: canvasTex(c, aniso), roughness: 0.86 }) : new THREE.MeshStandardMaterial({ map: canvasTex(edgeCanvas('#FBFAF6', 200), aniso), roughness: 0.86 });
      };
      const topM = new THREE.MeshStandardMaterial({ map: canvasTex(cSheet, aniso), roughness: 0.8 });
      const bot = new THREE.MeshStandardMaterial({ color: '#EFEDE7', roughness: 0.9 });
      // BoxGeometry: +x, -x, +y, -y, +z, -z → mặt 1 (trước) +z, mặt 2 +x, mặt 3 -z, mặt 4 -x
      const cube = new THREE.Mesh(new THREE.BoxGeometry(F * S, (F - 0.4) * S, F * S), [sm(1), sm(3), topM, bot, sm(0), sm(2)]);
      cube.position.y = ((F - 0.4) / 2) * S; cube.castShadow = true; cube.receiveShadow = true;
      g.add(cube);
      const top = curledSheet(F * S, F * S, 0.24, [sheetMat(cSheet), backPaper]);
      top.position.y = (F - 0.4 + 0.05) * S; g.add(top);
      const loose = curledSheet(F * S, F * S, 0.12, [sheetMat(cHand), backPaper], -1);
      loose.position.set((F * 0.95) * S, 0.1 * S, (F * 0.62) * S); loose.rotation.y = -0.35;
      g.add(loose);
      view = { az: 0.62, el: 0.42 }; zoom = 1.25; aim = 0.38; blob = 0.45;
    } else {
      // bộ sticky bìa cứng: mở phẳng + 1 bộ gập
      const BW = SET.wMm, BH = SET.hMm, sp = SET.spineMm, bt = 1.8;
      const cIn = o.inside ? await svgCanvas(o.inside, o.fontCss, 2048, '#FFFFFF') : null;
      const cCov = o.cover ? await svgCanvas(o.cover, o.fontCss, 2048, '#FFFFFF') : null;
      const cSmall = o.small ? await svgCanvas(o.small, o.fontCss, 900) : cSheet;
      const half = (src: HTMLCanvasElement | null, left: boolean) => {
        if (!src) return new THREE.MeshStandardMaterial({ color: '#FBFAF7', roughness: 0.85 });
        const tw = src.width * (BW / (BW * 2 + sp));
        const c = document.createElement('canvas'); c.width = Math.round(tw); c.height = src.height;
        c.getContext('2d')!.drawImage(src, left ? 0 : src.width - tw, 0, tw, src.height, 0, 0, c.width, c.height);
        return new THREE.MeshPhysicalMaterial({ map: canvasTex(c, aniso), roughness: 0.6, clearcoat: 0.2 });
      };
      const edgeM = new THREE.MeshStandardMaterial({ color: '#2B2B2B', roughness: 0.7 });
      const board = (mat: THREE.Material, under: THREE.Material) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(BW * S, bt * S, BH * S), [edgeM, edgeM, mat, under, edgeM, edgeM]);
        m.castShadow = true; m.receiveShadow = true; return m;
      };
      const coverBack = cCov ? half(cCov, true) : edgeM;
      const open = new THREE.Group();
      const L = board(half(cIn, true), coverBack); L.position.set(-(BW / 2 + sp / 2) * S, (bt / 2) * S, 0);
      const R = board(half(cIn, false), coverBack); R.position.set((BW / 2 + sp / 2) * S, (bt / 2) * S, 0);
      open.add(L, R);
      // sticky lớn + nhỏ trên bìa phải
      const [big, small] = SET_PADS;
      const padStack = (wMm: number, hMm: number, c: HTMLCanvasElement, base: string) => {
        const T = 3;
        const e = new THREE.MeshStandardMaterial({ map: canvasTex(edgeCanvas(base, 30), aniso), roughness: 0.88 });
        const top = new THREE.MeshStandardMaterial({ map: canvasTex(c, aniso), roughness: 0.8 });
        const m = new THREE.Mesh(new THREE.BoxGeometry(wMm * S, T * S, hMm * S), [e, e, top, e, e, e]);
        m.castShadow = true; m.receiveShadow = true; m.position.y = (bt + T / 2) * S; return m;
      };
      const pb = padStack(big.wMm, big.hMm, cSheet, o.paperHex);
      pb.position.x = R.position.x; pb.position.z = (-BH / 2 + 12 + big.hMm / 2) * S;
      const ps = padStack(small.wMm, small.hMm, cSmall, '#FFD6DF');
      ps.position.x = R.position.x; ps.position.z = (-BH / 2 + 12 + big.hMm + 8 + small.hMm / 2) * S;
      open.add(pb, ps);
      // flag: 5 dải xếp lệch
      for (let i = 0; i < FLAG.n; i++) {
        const fm = new THREE.MeshStandardMaterial({ color: FLAG_COLORS[i], roughness: 0.45, transparent: true, opacity: 0.92 });
        const f = new THREE.Mesh(new THREE.BoxGeometry(FLAG.hMm * S, 0.18 * S, FLAG.wMm * S), fm);
        f.position.set(L.position.x - (BW * 0.1) * S + i * 1.5 * S, (bt + 0.3 + i * 0.12) * S, (-BH * 0.22 + i * (FLAG.wMm + 2.5)) * S);
        f.castShadow = true; open.add(f);
      }
      g.add(open);
      // bộ gập: bìa trước lên trên
      if (cCov) {
        const front = half(cCov, false);
        const closed = new THREE.Group();
        const body = new THREE.Mesh(new THREE.BoxGeometry(BW * S, (bt * 2 + 4) * S, BH * S), [edgeM, edgeM, front, edgeM, edgeM, edgeM]);
        body.position.y = ((bt * 2 + 4) / 2) * S; body.castShadow = true; body.receiveShadow = true;
        closed.add(body);
        closed.position.set((BW * 1.62) * S, 0, (BH * 0.38) * S); closed.rotation.y = -0.22;
        g.add(closed);
      }
      view = { az: 0.08, el: 0.95 }; zoom = 1.3; aim = 0.1;
    }

    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    g.position.set(-c.x, 0, -c.z);
    const wrap = new THREE.Group(); wrap.add(g);
    return { group: wrap, view, aim, zoom, blob };
  };
}
