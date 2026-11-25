'use client';
// Brochure gấp 3 · 3D: 1 tờ A4 thật (gấp cuộn 100|100|97mm) dựng ĐỨNG, mở hé hình chữ U — mặt trong hướng người xem,
// nếp gấp bo tròn mềm (không gãy góc), 2 mặt in đúng chỗ (mặt trong = texture trong, mặt ngoài = texture ngoài, lật gương
// đúng như gấp giấy thật). Kèm 1 cuốn gập kín nằm trên mặt bàn khoe bìa. Texture = SVG thiết kế của khách.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { BR_H_MM, BR_W_MM } from './brochure-engine';

const T = 0.13; // couche 150gsm ≈ 0.13mm

/** dải giấy đứng theo đường cong mặt bằng (x,z) tham số theo chiều dài cung s (mm) */
function foldedSheet(inner: THREE.Texture, outer: THREE.Texture, angles: [number, number], r = 1.8) {
  const folds = [100, 200];
  const turns = [angles[0], angles[1]]; // góc rẽ tại 2 nếp (rad)
  // hướng đi φ(s): đoạn 1 = -θ1, đoạn 2 = 0, đoạn 3 = +θ2; đổi hướng đều trên cung dài r·|Δφ| quanh nếp → nếp bo tròn
  const phiAt = (s: number) => {
    let phi = -turns[0];
    folds.forEach((f, i) => {
      const half = (r * turns[i]) / 2;
      const t = Math.min(1, Math.max(0, (s - (f - half)) / (half * 2)));
      phi += turns[i] * t;
    });
    return phi;
  };
  const ds = 0.5;
  const n = Math.round(BR_W_MM / ds);
  const pts: { x: number; z: number; s: number }[] = [];
  let x = 0, z = 0;
  for (let i = 0; i <= n; i++) {
    const s = i * ds;
    pts.push({ x, z, s });
    const phi = phiAt(s + ds / 2);
    x += Math.cos(phi) * ds; z += Math.sin(phi) * ds;
  }
  // canh giữa theo ô giữa
  const mid = pts[Math.round(150 / ds)];
  const rows = 12;
  const make = (outerSide: boolean) => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      for (const p of pts) {
        // giấy đứng hơi phồng nhẹ giữa ô (không phẳng tuyệt đối) — phồng theo pháp tuyến
        const local = p.s < 100 ? p.s / 100 : p.s < 200 ? (p.s - 100) / 100 : (p.s - 200) / 97;
        const bulge = Math.sin(local * Math.PI) * 0.7 * Math.sin(v * Math.PI * 0.9 + 0.15);
        const phi = phiAt(p.s);
        const nx = -Math.sin(phi), nz = Math.cos(phi); // pháp tuyến phía mặt trong (người xem)
        const off = (outerSide ? -T / 2 : T / 2) - bulge;
        pos.push((p.x - mid.x + nx * off) * S, v * BR_H_MM * S, (p.z - mid.z + nz * off) * S);
        const u = p.s / BR_W_MM;
        uv.push(outerSide ? 1 - u : u, v);
      }
    }
    const cols = pts.length;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols - 1; i++) {
      const a = j * cols + i, b = a + 1, c = a + cols, d = c + 1;
      if (outerSide) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };
  const paper = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.35 });
  const grp = new THREE.Group();
  const a = new THREE.Mesh(make(false), paper(inner));
  const b = new THREE.Mesh(make(true), paper(outer));
  a.castShadow = b.castShadow = true;
  grp.add(a, b);
  // mép giấy trên (dải mỏng màu giấy) để nhìn từ trên thấy độ dày
  const edgePts = pts.map((p) => new THREE.Vector3((p.x - mid.x) * S, BR_H_MM * S, (p.z - mid.z) * S));
  const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edgePts), 300, (T / 2) * S, 4, false), new THREE.MeshStandardMaterial({ color: '#F4F2ED', roughness: 0.9 }));
  grp.add(edge);
  return grp;
}

export function brochureBuilder(o: { outside: SVGSVGElement | null; inside: SVGSVGElement | null; fontCss: string }): Builder {
  return async (aniso) => {
    if (!o.outside || !o.inside) throw new Error('Chưa dựng xong brochure');
    const [outT, inT] = await Promise.all([svgTex(o.outside, o.fontCss, 3200, aniso), svgTex(o.inside, o.fontCss, 3200, aniso)]);
    const g = new THREE.Group();

    // 1) brochure đứng mở hé chữ U (mặt trong hướng người xem)
    const stand = foldedSheet(inT, outT, [0.72, 0.86]);
    stand.position.set(-30 * S, 0, -20 * S);
    stand.rotation.y = 0.05;
    g.add(stand);

    // 2) cuốn gập kín nằm khoe bìa (ô bìa = 1/3 phải của mặt ngoài)
    const cw = 100, ch = BR_H_MM, th = 0.9;
    const coverT = outT.clone();
    coverT.repeat.set(1000 / 2970, 1);
    coverT.offset.set(1970 / 2970, 0);
    coverT.needsUpdate = true;
    const closed = new THREE.Group();
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#F3F1EC', roughness: 0.92 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(cw * S, th * S, ch * S), edgeMat);
    box.position.y = (th / 2) * S;
    box.castShadow = true;
    const top = new THREE.PlaneGeometry(cw * S, ch * S);
    top.rotateX(-Math.PI / 2);
    const cover = new THREE.Mesh(top, new THREE.MeshPhysicalMaterial({ map: coverT, roughness: 0.46, clearcoat: 0.28, clearcoatRoughness: 0.35 }));
    cover.position.y = th * S + 0.02 * S;
    // nếp gấp bên phải bo tròn (cuốn gập kín: mép phải là nếp)
    const spine = new THREE.Mesh(new THREE.CylinderGeometry((th / 2) * S, (th / 2) * S, ch * S, 12, 1, false, 0, Math.PI), edgeMat);
    spine.rotation.x = Math.PI / 2;
    spine.position.set((cw / 2) * S, (th / 2) * S, 0);
    closed.add(box, cover, spine);
    closed.position.set(95 * S, 0, 185 * S);
    closed.rotation.y = -0.38;
    g.add(closed);

    return { group: g, view: { az: 0.1, el: 0.34 }, aim: 0.36, zoom: 1.38, blob: 0.25 };
  };
}
