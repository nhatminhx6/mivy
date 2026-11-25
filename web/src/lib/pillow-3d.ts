'use client';
// Gối 3D: 2 mặt vải phồng (bơm căng: giữa phồng, mép mỏng dần về đường may, cạnh hơi thắt vào, góc nhọn),
// viền ống (piping) chạy theo đường may, vải nhung có ánh sheen / canvas có vân dệt. Texture = thiết kế 2 mặt của khách.
// Cảnh: gối chính đứng hơi ngả, mặt trước hướng người xem; gối thứ 2 đỡ phía sau, quay MẶT SAU ra ngoài.

import * as THREE from 'three';
import { S, svgTex, canvasTex, type Builder } from './mockup3d';

export interface Pillow3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null;
  wMm: number; hMm: number; round: boolean; material: 'velvet' | 'canvas'; piping: string; fontCss: string;
}

// vân vải (bump): nhung = hạt mịn lăn tăn; canvas = sợi dệt ngang dọc
function fabricBump(kind: 'velvet' | 'canvas', aniso: number): THREE.CanvasTexture {
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  const img = x.createImageData(N, N);
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    let v: number;
    if (kind === 'canvas') {
      const wx = Math.sin((i / N) * Math.PI * 2 * 48), wy = Math.sin((j / N) * Math.PI * 2 * 48);
      v = 128 + 52 * ((i + j) % 2 ? wx : wy) + (rnd() - 0.5) * 40;
    } else v = 128 + (rnd() - 0.5) * 70;
    const k = (j * N + i) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.max(0, Math.min(255, v)); img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = canvasTex(c, aniso);
  t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

interface Cushion { front: THREE.BufferGeometry; back: THREE.BufferGeometry; seam: THREE.Vector3[] }
// lưới (u,v) ∈ [-1,1]² → vị trí mặt gối. Gối tròn: ánh xạ ô vuông → đĩa (elliptical grid mapping).
function cushion(W: number, H: number, round: boolean, thick: number): Cushion {
  const nu = round ? 96 : Math.max(64, Math.round(96 * Math.min(2.4, W / H))), nv = round ? 96 : Math.max(64, Math.round(96 * Math.min(2.4, H / W)));
  const R = W / 2;
  const pos = (u: number, v: number): [number, number, number] => {
    let x: number, y: number, b: number;
    if (round) {
      x = u * Math.sqrt(1 - (v * v) / 2) * R; y = v * Math.sqrt(1 - (u * u) / 2) * R;
      const r = Math.min(1, Math.hypot(x, y) / R);
      b = Math.pow(Math.max(0, 1 - r * r), 0.7) * (1 + 0.04 * Math.sin(x / R * 3 + 1) * Math.sin(y / R * 2.6));
      // mép tròn nhún nhẹ (vải dồn khi may cong)
      const th = Math.atan2(y, x);
      b += 0.035 * Math.sin(th * 22) * Math.max(0, (r - 0.78) / 0.22) * (1 - r) * 4;
    } else {
      // cạnh thắt vào giữa, góc nhọn ra như gối thật nhồi căng
      x = u * (W / 2) * (1 - 0.055 * (1 - v * v));
      y = v * (H / 2) * (1 - 0.055 * (1 - u * u) * (W / H > 1.6 ? 0.5 : 1));
      // mặt cắt hình thấu kính (mép mỏng dần về đường may) + gợn lớn nhẹ để ánh sáng loang tự nhiên
      const g = (t: number) => Math.pow(Math.max(0, 1 - t * t), 0.72);
      b = g(u) * g(v) * (1 + 0.05 * Math.sin(u * 3.1 + 1) * Math.sin(v * 2.7 + 0.5));
      // nếp nhăn toả ra từ 4 góc
      const du = 1 - Math.abs(u), dv = 1 - Math.abs(v), dc = Math.hypot(du, dv);
      if (dc < 0.6) b += 0.07 * Math.sin(Math.atan2(dv, du) * 9) * (1 - dc / 0.6) * Math.min(1, dc * 5);
    }
    // đáy gối tì xuống sàn: dẹt lại + phình ra (vải mềm bị đè)
    let z = (thick / 2) * b;
    if (!round && v < -0.72) { const t = (-0.72 - v) / 0.28; y += t * t * H * 0.035; z *= 1 + 0.22 * t; }
    return [x, y, z];
  };
  const make = (sign: 1 | -1) => {
    const P: number[] = [], UV: number[] = [], I: number[] = [], C: number[] = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = -1 + (2 * i) / nu, v = -1 + (2 * j) / nv;
      const [x, y, z] = pos(u, v);
      P.push(x * S, y * S, sign * z * S);
      // tối dần về đường may (giả bóng khuất) → mặt gối đọc ra độ phồng
      const ao = 0.74 + 0.26 * Math.min(1, (2 * z) / thick * 1.25);
      C.push(ao, ao, ao);
      // mặt sau nhìn từ phía sau → lật ngang để thiết kế đọc xuôi
      const tu = round ? x / W + 0.5 : (u + 1) / 2, tv = round ? y / H + 0.5 : (v + 1) / 2;
      UV.push(sign > 0 ? tu : 1 - tu, tv);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
      if (sign > 0) I.push(a, b, d, a, d, c); else I.push(a, d, b, a, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
    g.setIndex(I); g.computeVertexNormals();
    return g;
  };
  // đường may (biên lưới)
  const seam: THREE.Vector3[] = [];
  const n = 240;
  for (let k = 0; k < n; k++) {
    const t = k / n;
    let u: number, v: number;
    if (round) { const a = t * Math.PI * 2; seam.push(new THREE.Vector3(Math.cos(a) * R * S, Math.sin(a) * R * S, 0)); continue; }
    if (t < 0.25) { u = -1 + t * 8; v = -1; } else if (t < 0.5) { u = 1; v = -1 + (t - 0.25) * 8; } else if (t < 0.75) { u = 1 - (t - 0.5) * 8; v = 1; } else { u = -1; v = 1 - (t - 0.75) * 8; }
    const [x, y] = pos(u, v);
    seam.push(new THREE.Vector3(x * S, y * S, 0));
  }
  return { front: make(1), back: make(-1), seam };
}

export function pillowBuilder(o: Pillow3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong thiết kế gối');
    const px = Math.min(2400, Math.max(1400, Math.round(o.wMm * 3)));
    const [ft, bt] = await Promise.all([svgTex(o.front, o.fontCss, px, aniso), svgTex(o.back, o.fontCss, px, aniso)]);
    const velvet = o.material === 'velvet';
    const bump = fabricBump(o.material, aniso);
    const rep = velvet ? o.wMm / 60 : o.wMm / 40;
    bump.repeat.set(rep, rep * (o.hMm / o.wMm));
    const fabric = (map: THREE.Texture | null, color = '#FFFFFF', vc = true) => new THREE.MeshPhysicalMaterial({
      map, color, vertexColors: vc, roughness: velvet ? 0.86 : 0.95,
      sheen: velvet ? 1 : 0.15, sheenRoughness: velvet ? 0.38 : 0.8, sheenColor: new THREE.Color(velvet ? 0.42 : 0.2, velvet ? 0.42 : 0.2, velvet ? 0.42 : 0.2),
      bumpMap: bump, bumpScale: velvet ? 0.35 : 1.1,
    });
    const fMat = fabric(ft), bMat = fabric(bt);
    const pipeMat = fabric(null, o.piping, false);

    const thick = Math.min(o.wMm, o.hMm) * (o.round ? 0.34 : 0.38);
    const cu = cushion(o.wMm, o.hMm, o.round, thick);
    const one = (showBack: boolean) => {
      const g = new THREE.Group();
      const fm = new THREE.Mesh(cu.front, fMat), bm = new THREE.Mesh(cu.back, bMat);
      fm.castShadow = bm.castShadow = true; fm.receiveShadow = bm.receiveShadow = false;
      const pipe = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cu.seam, true), 480, 3.2 * S, 10, true), pipeMat);
      pipe.castShadow = true;
      g.add(fm, bm, pipe);
      if (showBack) g.rotation.y = Math.PI;
      const holder = new THREE.Group(); holder.add(g);
      return holder;
    };

    const out = new THREE.Group();
    const W = o.wMm * S, T = thick * S;
    const wide = o.wMm / o.hMm > 1.6;
    let back: THREE.Group;
    const main = one(false);
    if (wide) {
      // gối ôm: 1 chiếc đứng ngả, 1 chiếc nằm phía trước lật mặt sau lên
      const lying = one(true);
      lying.rotation.set(-Math.PI / 2, 0, 0);
      back = new THREE.Group(); back.add(lying);
      back.rotation.y = -0.08;
      back.position.set(W * 0.12, 0, T * 1.9);
      main.rotation.set(-0.14, 0.22, -0.01);
      main.position.set(-W * 0.05, 0, 0);
    } else {
      // gối đỡ phía sau (quay mặt sau ra), ngả nhiều hơn; gối chính mặt trước ra ngoài, ngả nhẹ dựa vào
      back = one(true);
      back.rotation.set(-0.28, 0.12, 0.03);
      back.position.set(W * 0.62, 0, -T * 0.9);
      main.rotation.set(-0.18, 0.36, -0.02);
      main.position.set(-W * 0.18, 0, T * 0.2);
    }
    for (const g of [back, main]) {
      out.add(g);
      g.updateMatrixWorld(true);
      const bb = new THREE.Box3().setFromObject(g);
      g.position.y += -bb.min.y - 5 * S; // lún nhẹ xuống mặt sàn (vải mềm)
    }
    const bb = new THREE.Box3().setFromObject(out);
    const c = bb.getCenter(new THREE.Vector3());
    out.position.x -= c.x; out.position.z -= c.z;
    const wrap = new THREE.Group(); wrap.add(out);
    return { group: wrap, view: { az: wide ? 0.42 : 0.5, el: wide ? 0.36 : 0.26 }, aim: wide ? 0.4 : 0.46, zoom: wide ? 1.08 : 1.12, blob: 0.6 };
  };
}
