'use client';
// Puzzle 3D: bảng đã ghép gần xong nằm trên bàn gỗ (1 khối đùn theo viền chữ nhật/tim, khoét đúng lỗ các mảnh còn
// thiếu; rãnh jigsaw = texture + bump), vài mảnh rời đùn từ ĐÚNG đường cắt (1 mảnh lật thấy lưng giấy bồi/gỗ),
// đế hộp mở + nắp hộp dựng nghiêng phía sau khoe ảnh bìa. Toạ độ thiết kế: mm, y hướng xuống → thế giới (xS, zS, yS).

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, svgTex, type Builder } from './mockup3d';

export interface PZ3DOpts {
  texEl: SVGSVGElement | null; grooveEl: SVGSVGElement | null; lidTopEl: SVGSVGElement | null; lidSideEl: SVGSVGElement | null;
  W: number; H: number; thick: number; material: 'paper' | 'wood';
  outline: string; loose: { d: string; cx: number; cy: number }[];
  box: [number, number, number]; lidColor: string; fontCss: string;
}

const BEV = 0.18;
function shapesFrom(d: string, evenodd = false): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"${evenodd ? ' fill-rule="evenodd"' : ''}/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

let woodCanvas: HTMLCanvasElement | null = null;
function woodTex(aniso: number): THREE.CanvasTexture {
  if (!woodCanvas) {
    const W = 1024, H = 1024;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d')!;
    let s = 11; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    x.fillStyle = '#D8BC95'; x.fillRect(0, 0, W, H);
    // ván ghép theo chiều ngang + vân gỗ
    const plank = H / 4;
    for (let k = 0; k < 4; k++) {
      const tone = 0.95 + r() * 0.08;
      x.fillStyle = `rgba(${Math.round(218 * tone)},${Math.round(188 * tone)},${Math.round(148 * tone)},1)`;
      x.fillRect(0, k * plank, W, plank);
      for (let i = 0; i < 70; i++) {
        const y0 = k * plank + r() * plank, amp = 2 + r() * 6, ph = r() * 6;
        x.strokeStyle = `rgba(${120 + r() * 40},${85 + r() * 25},${50 + r() * 15},${0.05 + r() * 0.1})`;
        x.lineWidth = 0.5 + r() * 1.2;
        x.beginPath();
        for (let xx = 0; xx <= W; xx += 16) { const yy = y0 + Math.sin(xx * 0.006 + ph) * amp + Math.sin(xx * 0.021 + ph * 2) * amp * 0.3; if (xx === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy); }
        x.stroke();
      }
      x.fillStyle = 'rgba(90,60,35,0.22)'; x.fillRect(0, k * plank, W, 2);
    }
    woodCanvas = c;
  }
  const t = new THREE.CanvasTexture(woodCanvas);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  return t;
}
let boardCanvas: HTMLCanvasElement | null = null;
/** lưng giấy bồi xám lấm tấm */
function chipTex(): THREE.CanvasTexture {
  if (!boardCanvas) {
    const N = 256; const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d')!;
    x.fillStyle = '#B9B3A8'; x.fillRect(0, 0, N, N);
    let s = 3; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 2600; i++) { x.fillStyle = r() < 0.5 ? `rgba(90,84,76,${0.15 + r() * 0.25})` : `rgba(240,236,228,${0.2 + r() * 0.3})`; x.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
    boardCanvas = c;
  }
  const t = new THREE.CanvasTexture(boardCanvas);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 40, 1 / 40);
  return t;
}

/** mesh không tính vào khung hình (bàn): bounding box rỗng, không bị cắt khỏi khung nhìn */
function noBounds(m: THREE.Mesh) {
  m.geometry.computeBoundingSphere();
  m.geometry.boundingBox = new THREE.Box3();
  m.frustumCulled = false;
}

export function puzzleBuilder(o: PZ3DOpts): Builder {
  return async (aniso) => {
    if (!o.texEl || !o.grooveEl || !o.lidTopEl || !o.lidSideEl) throw new Error('Chưa dựng xong puzzle');
    const { W, H, thick } = o;
    const outW = Math.round(Math.min(3600, Math.max(1800, W * 8)));
    const [tex, groove, lidTop, lidSide] = await Promise.all([
      svgTex(o.texEl, o.fontCss, outW, aniso),
      svgTex(o.grooveEl, undefined, Math.round(outW * 0.75), aniso),
      svgTex(o.lidTopEl, o.fontCss, 1600, aniso),
      svgTex(o.lidSideEl, o.fontCss, 1400, aniso),
    ]);
    for (const t of [tex, groove]) { t.flipY = false; t.repeat.set(1 / W, 1 / H); t.needsUpdate = true; }
    groove.colorSpace = THREE.NoColorSpace;

    const wood = o.material === 'wood';
    const capMat = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: groove, bumpScale: 2.2, roughness: 0.6, clearcoat: 0.12, clearcoatRoughness: 0.55 });
    const sideMat = new THREE.MeshStandardMaterial({ color: wood ? '#C9A274' : '#8F877B', roughness: 0.92 });
    const backMat = wood
      ? new THREE.MeshStandardMaterial({ color: '#D2AE80', roughness: 0.85 })
      : new THREE.MeshStandardMaterial({ map: chipTex(), roughness: 0.95 });

    const root = new THREE.Group();
    // không gian thiết kế (mm, y xuống) → nằm phẳng trên bàn
    const inner = new THREE.Group();
    inner.scale.set(S, -S, S);
    const flat = new THREE.Group(); flat.rotation.x = -Math.PI / 2; flat.add(inner);
    root.add(flat);
    const ext = (shapes: THREE.Shape[]) => {
      const g = new THREE.ExtrudeGeometry(shapes, { depth: thick, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 2, curveSegments: 10 });
      return g;
    };

    // bảng đã ghép: viền + lỗ các mảnh rời
    const slabD = [o.outline, ...o.loose.map((p) => p.d)].join(' ');
    const slabG = ext(shapesFrom(slabD, true)); slabG.translate(0, 0, BEV);
    const slab = new THREE.Mesh(slabG, [capMat, sideMat]);
    slab.castShadow = true; slab.receiveShadow = true;
    inner.add(slab);

    // mảnh rời: đặt quanh bảng, xoay lệch; mảnh cuối lật lưng
    const spots: [number, number, number, boolean][] = [
      [W + W * 0.07, H * 0.62, 0.5, false],
      [W * 0.66, H + H * 0.12, -0.35, false],
      [W + W * 0.06, H + H * 0.06, 1.9, true],
      [W * 0.86, H * 0.66, 0.08, false], // mảnh sắp ráp: lơ lửng gần lỗ của nó
    ];
    o.loose.forEach((p, i) => {
      const [x, y, rot, flip] = spots[i % spots.length];
      const g = ext(shapesFrom(p.d)); g.translate(-p.cx, -p.cy, BEV);
      const m = new THREE.Mesh(g, flip ? [backMat, sideMat] : [capMat, sideMat]);
      const near = i === 3;
      m.position.set(near ? p.cx + W * 0.012 : x, near ? p.cy - H * 0.02 : y, near ? thick + 2.4 : 0);
      m.rotation.z = rot;
      if (flip) { m.rotation.x = Math.PI; m.position.z = thick + BEV * 2; }
      if (near) { m.rotation.x = 0.06; m.rotation.y = -0.05; }
      m.castShadow = true; m.receiveShadow = true;
      inner.add(m);
    });

    // hộp: đế mở phía sau-phải + nắp dựng nghiêng phía sau khoe bìa
    const [bw, bh, bd] = o.box;
    const wall = 2;
    const boxCol = new THREE.Color(o.lidColor);
    const outerMat = new THREE.MeshStandardMaterial({ color: boxCol, roughness: 0.72 });
    const innerMat = new THREE.MeshStandardMaterial({ color: '#EDE8DF', roughness: 0.9 });
    const w = (v: number) => v * S;
    const base = new THREE.Group();
    const part = (sx: number, sy: number, sz: number, x: number, y: number, z: number, mats: THREE.Material | THREE.Material[]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w(sx), w(sy), w(sz)), mats); m.position.set(w(x), w(y), w(z)); m.castShadow = true; m.receiveShadow = true; base.add(m); return m;
    };
    const bh0 = bd * 0.82; // đế thấp hơn nắp
    part(bw, wall, bh, 0, wall / 2, 0, innerMat);
    part(wall, bh0, bh, -bw / 2 + wall / 2, bh0 / 2, 0, [outerMat, innerMat, outerMat, outerMat, outerMat, outerMat]);
    part(wall, bh0, bh, bw / 2 - wall / 2, bh0 / 2, 0, [innerMat, outerMat, outerMat, outerMat, outerMat, outerMat]);
    part(bw - wall * 2, bh0, wall, 0, bh0 / 2, -bh / 2 + wall / 2, [outerMat, outerMat, outerMat, outerMat, innerMat, outerMat]);
    part(bw - wall * 2, bh0, wall, 0, bh0 / 2, bh / 2 - wall / 2, [outerMat, outerMat, outerMat, outerMat, outerMat, innerMat]);
    // vài mảnh lót đáy hộp cho có "đồ bên trong" — dùng lại 2 mảnh rời đầu (nếu có) dạng lưng xám, nằm trong đế
    base.position.set(w(W * 0.8), 0, w(-bh / 2 - 34));
    base.rotation.y = -0.1;
    root.add(base);

    // nắp: mặt trên (ảnh bìa) + 4 thành (texture thành) — dựng tựa nghiêng sau đế
    const lw = bw + wall * 2 + 1, lh = bh + wall * 2 + 1, ld = bd;
    const lid = new THREE.Group();
    const lidTopMat = new THREE.MeshPhysicalMaterial({ map: lidTop, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
    const lidSideMat = new THREE.MeshStandardMaterial({ map: lidSide, roughness: 0.6 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(w(lw), w(wall), w(lh)), [outerMat, outerMat, lidTopMat, innerMat, outerMat, outerMat]);
    top.position.y = w(ld - wall / 2);
    lid.add(top);
    const lsMat = (face: number) => { const arr: THREE.Material[] = Array(6).fill(outerMat); arr[face] = lidSideMat; return arr; };
    const sFront = new THREE.Mesh(new THREE.BoxGeometry(w(lw), w(ld - wall), w(wall)), lsMat(4)); sFront.position.set(0, w((ld - wall) / 2), w(lh / 2 - wall / 2));
    const sBack = new THREE.Mesh(new THREE.BoxGeometry(w(lw), w(ld - wall), w(wall)), outerMat); sBack.position.set(0, w((ld - wall) / 2), w(-lh / 2 + wall / 2));
    const sL = new THREE.Mesh(new THREE.BoxGeometry(w(wall), w(ld - wall), w(lh)), outerMat); sL.position.set(w(-lw / 2 + wall / 2), w((ld - wall) / 2), 0);
    const sR = new THREE.Mesh(new THREE.BoxGeometry(w(wall), w(ld - wall), w(lh)), outerMat); sR.position.set(w(lw / 2 - wall / 2), w((ld - wall) / 2), 0);
    for (const m of [top, sFront, sBack, sL, sR]) { m.castShadow = true; m.receiveShadow = true; if (m !== top) lid.add(m); }
    // xoay: mặt nắp hướng về camera (+z), ngả ra sau ~14°; đứng trên cạnh dài
    const lidPivot = new THREE.Group(); lidPivot.add(lid);
    lid.position.set(0, w(-ld), w(lh / 2)); // đưa cạnh trước-dưới về gốc
    lidPivot.rotation.x = Math.PI / 2 - 0.25;
    const lidHolder = new THREE.Group(); lidHolder.add(lidPivot);
    root.add(lidHolder);
    lidHolder.updateMatrixWorld(true);
    const lb = new THREE.Box3().setFromObject(lidPivot);
    lidHolder.position.set(w(W * 0.24) - (lb.min.x + lb.max.x) / 2, -lb.min.y, w(-16) - lb.max.z);
    lidHolder.rotation.y = 0.12;

    // bàn gỗ (không tính khung hình)
    const span = Math.max(W, H) * 6;
    const wt = woodTex(aniso); wt.repeat.set(span / 900, span / 900);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(w(span), w(span)), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.7 }));
    table.rotation.x = -Math.PI / 2; table.position.set(w(W / 2), -0.0004, w(H / 2 - span * 0.1));
    table.receiveShadow = true;
    noBounds(table);
    root.add(table);

    // canh giữa theo bảng
    root.position.set(-w(W / 2), 0, -w(H / 2));
    const g = new THREE.Group(); g.add(root);
    return { group: g, view: { az: 0.3, el: 0.64 }, aim: 0.18, zoom: 1.42, blob: 0 };
  };
}
