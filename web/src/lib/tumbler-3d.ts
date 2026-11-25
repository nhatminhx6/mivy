'use client';
// Bình / ly giữ nhiệt 3D: thân tiện (LatheGeometry), nắp vặn khít (bình 500ml), nắp nhựa + quai (bình thể thao),
// ly côn + nắp trong + ống hút (ly giữ nhiệt). Hoàn thiện: inox xước (vân xước ngang chạy quanh thân) hoặc sơn tĩnh điện
// (nhám, vỏ cam li ti). Khắc laser = lộ inox sáng (trên sơn) / vết sẫm (inox trần), lõm nhẹ; in UV = lớp mực bóng.
// 2 bình: bình trước khoe MẶT TRƯỚC (logo), bình sau quay MẶT SAU (tên người nhận — người thứ 2 trong danh sách).

import * as THREE from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { tbProduct, type TBProduct } from './tumbler-engine';

export interface Tumbler3DOpts {
  product: string; finishHex: string | null; method: 'laser' | 'uv'; fontCss: string;
  front: SVGSVGElement | null; backA: SVGSVGElement | null; backB: SVGSVGElement | null;
}

// ---------- texture vẽ code ----------
let brushedC: HTMLCanvasElement | null = null;
function brushed(): HTMLCanvasElement {
  if (brushedC) return brushedC;
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
  const x = c.getContext('2d')!;
  x.fillStyle = '#B4B4B4'; x.fillRect(0, 0, 256, 1024);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * 1024, v = 150 + Math.random() * 90 | 0;
    x.fillStyle = `rgba(${v},${v},${v},${0.25 + Math.random() * 0.4})`;
    x.fillRect(0, y, 256, Math.random() < 0.85 ? 0.6 : 1.4); // vân xước chạy QUANH thân (ngang theo u)
  }
  return (brushedC = c);
}
let peelC: HTMLCanvasElement | null = null;
function orangePeel(): HTMLCanvasElement {
  if (peelC) return peelC;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 2200; i++) {
    const px = Math.random() * N, py = Math.random() * N, r = 1.5 + Math.random() * 4;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    const v = Math.random() < 0.5 ? 255 : 0;
    g.addColorStop(0, `rgba(${v},${v},${v},0.16)`); g.addColorStop(1, `rgba(${v},${v},${v},0)`);
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  return (peelC = c);
}
const tex = (c: HTMLCanvasElement, aniso: number, rx = 1, ry = 1, srgb = false) => {
  const t = canvasTex(c, aniso);
  if (!srgb) t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
};

function bodyMat(finishHex: string | null, aniso: number): THREE.Material {
  if (!finishHex) {
    return new THREE.MeshPhysicalMaterial({
      color: '#EEF0F2', metalness: 1, roughness: 0.27, envMapIntensity: 1.35, roughnessMap: tex(brushed(), aniso, 1, 1),
      bumpMap: tex(brushed(), aniso, 1, 1), bumpScale: 0.25, clearcoat: 0.15, clearcoatRoughness: 0.4,
    });
  }
  return new THREE.MeshPhysicalMaterial({
    color: finishHex, metalness: 0.12, roughness: 0.6, bumpMap: tex(orangePeel(), aniso, 5, 12), bumpScale: 0.45,
    clearcoat: 0.25, clearcoatRoughness: 0.55, sheen: 0.15, sheenRoughness: 0.8,
  });
}
const steelPart = (aniso: number, rough = 0.3) => new THREE.MeshPhysicalMaterial({ color: '#D3D6DA', metalness: 1, roughness: rough, roughnessMap: tex(brushed(), aniso), clearcoat: 0.2 });

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): THREE.Vector2[] {
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r); });
}
const V = (x: number, y: number) => new THREE.Vector2(x, y);
/** bán kính thân tại cao độ y (ly côn nội suy, bình thẳng) */
export function radiusAt(p: TBProduct, y: number) {
  const rb = p.diaBot / 2, rt = p.diaTop / 2;
  return rb + (rt - rb) * Math.min(1, Math.max(0, y / p.body));
}

// ---------- các phần của 1 bình ----------
interface Decals { front: THREE.Material | null; back: THREE.Material | null }
function makeItem(p: TBProduct, finishHex: string | null, dec: Decals, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const seg = 180;
  const body = bodyMat(finishHex, aniso);
  const add = (m: THREE.Mesh) => { m.castShadow = true; g.add(m); return m; };
  const H = p.body;

  if (p.kind === 'tumbler') {
    const rb = p.diaBot / 2, rt = p.diaTop / 2;
    // thân côn: đáy bo, miệng có gờ inox (lớp sơn dừng dưới miệng)
    const outer = [V(0.01, 0.8), V(rb - 5, 0.8), ...arc(rb - 5, 5, 4.2, -Math.PI / 2, 0, 10), V(rb + 0.15, 9), V(radiusAt(p, H - 9), H - 9)];
    add(new THREE.Mesh(new THREE.LatheGeometry(outer, seg), body));
    const rim = [V(radiusAt(p, H - 9) - 0.05, H - 9), V(rt + 0.1, H - 1.4), ...arc(rt - 1.2, H - 1.4, 1.3, 0, Math.PI, 8), V(rt - 2.5, H - 6)];
    add(new THREE.Mesh(new THREE.LatheGeometry(rim, seg), steelPart(aniso, 0.22)));
    // lòng ly (thấy qua nắp trong)
    const inner = new THREE.Mesh(new THREE.LatheGeometry([V(rt - 2.5, H - 6), V(rb - 2, 14), V(0.01, 14)], 96), new THREE.MeshStandardMaterial({ color: '#5E6368', metalness: 0.9, roughness: 0.45, side: THREE.BackSide }));
    g.add(inner);
    // đáy chống trượt
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(rb - 3, rb - 3, 0.9, 64), new THREE.MeshStandardMaterial({ color: '#2A2C2F', roughness: 0.9 }));
    foot.position.y = 0.45; g.add(foot);
    // nắp nhựa trong: viền nhựa + mặt vòm
    const lidY = H - 3.2, capH = p.cap;
    const gasket = new THREE.Mesh(new THREE.TorusGeometry(rt + 0.6, 1.1, 12, 96), new THREE.MeshStandardMaterial({ color: '#2B2D31', roughness: 0.6 }));
    gasket.rotation.x = Math.PI / 2; gasket.position.y = lidY; g.add(gasket);
    const lidPts = [V(rt + 1.6, lidY - 2.2), V(rt + 1.9, lidY + 3), ...arc(rt - 4, lidY + 3, 5.9, 0, Math.PI / 2, 10), V(rt * 0.55, lidY + capH - 2), V(0.01, lidY + capH - 1.6)];
    const lid = new THREE.Mesh(new THREE.LatheGeometry(lidPts, seg), new THREE.MeshPhysicalMaterial({
      color: '#F2F6F8', transparent: true, opacity: 0.32, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.5, specularIntensity: 1, side: THREE.DoubleSide, depthWrite: false,
    }));
    lid.renderOrder = 3; g.add(lid);
    // ống hút inox xuyên nắp, nghiêng nhẹ + đầu silicone
    const sx = rt * 0.28, len = H + 44;
    const straw = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, len, 32, 1, false), new THREE.MeshPhysicalMaterial({ color: '#E4E7EA', metalness: 1, roughness: 0.16, clearcoat: 0.4 }));
    straw.position.set(sx, 18 + len / 2, -rt * 0.12); straw.rotation.z = -0.07; add(straw);
    const tip = new THREE.Mesh(new THREE.CapsuleGeometry(3.6, 10, 6, 24), new THREE.MeshPhysicalMaterial({ color: finishHex || '#2E3238', roughness: 0.5, transmission: 0 }));
    tip.position.set(sx + Math.sin(0.07) * (len / 2), 18 + len - 2, -rt * 0.12); tip.rotation.z = -0.07; add(tip);
  } else {
    const R = p.diaTop / 2;
    if (p.kind === 'flask') {
      // bình đạn: thân thẳng, vai vát nhẹ, nắp khít cùng bán kính (khe nắp tối)
      const outer = [V(0.01, 0.6), V(R - 6, 0.6), ...arc(R - 6, 6.6, 6, -Math.PI / 2, 0, 12), V(R, H - 3), V(R - 1.4, H)];
      add(new THREE.Mesh(new THREE.LatheGeometry(outer, seg), body));
      const gap = new THREE.Mesh(new THREE.CylinderGeometry(R - 1.6, R - 1.6, 1.6, 96), new THREE.MeshStandardMaterial({ color: '#141518', roughness: 0.7 }));
      gap.position.y = H + 0.6; g.add(gap);
      const capPts = [V(R - 1.4, H + 1.4), V(R - 0.05, H + 2.8), V(R - 0.05, H + p.cap - 9), ...arc(R - 9, H + p.cap - 9, 8.95, 0, Math.PI / 2, 14), V(0.01, H + p.cap - 0.05)];
      add(new THREE.Mesh(new THREE.LatheGeometry(capPts, seg), body));
      // vạch vân tay nắp (rãnh chống trượt)
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.02, 0.35, 8, 96), new THREE.MeshStandardMaterial({ color: '#0F1012', roughness: 0.8 }));
      ring.rotation.x = Math.PI / 2; ring.position.y = H + 6; g.add(ring);
    } else {
      // bình thể thao: vai bo thu về cổ, nắp nhựa đen có quai xách
      const rn = R * 0.6;
      const outer = [V(0.01, 0.6), V(R - 6, 0.6), ...arc(R - 6, 6.6, 6, -Math.PI / 2, 0, 12), V(R, H - 40),
        ...Array.from({ length: 18 }, (_, i) => { const t = (i + 1) / 18; const s = t * t * (3 - 2 * t); return V(R + (rn - R) * s, H - 40 + 34 * t); }), V(rn, H)];
      add(new THREE.Mesh(new THREE.LatheGeometry(outer, seg), body));
      const plastic = new THREE.MeshPhysicalMaterial({ color: '#1C1D20', roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.5 });
      const capR = rn + 2.2, capY = H - 1;
      const capPts = [V(capR - 0.6, capY), V(capR, capY + 1), V(capR, capY + p.cap - 4), ...arc(capR - 4, capY + p.cap - 4, 4, 0, Math.PI / 2, 8), V(0.01, capY + p.cap)];
      add(new THREE.Mesh(new THREE.LatheGeometry(capPts, 96), plastic));
      for (let k = 0; k < 18; k++) { // gân nắp
        const a = (k / 18) * Math.PI * 2;
        const rib = new THREE.Mesh(new THREE.BoxGeometry(1.4, p.cap - 10, 1.2), plastic);
        rib.position.set(Math.sin(a) * capR, capY + 3 + (p.cap - 10) / 2, Math.cos(a) * capR); rib.rotation.y = a; g.add(rib);
      }
      const loop = new THREE.Mesh(new THREE.TorusGeometry(capR * 0.72, 3.2, 16, 48, Math.PI), plastic);
      loop.position.set(0, capY + p.cap - 1, 0); loop.scale.set(1, 1.15, 0.65); add(loop);
      for (const sx of [-1, 1]) {
        const lug = new THREE.Mesh(new THREE.BoxGeometry(8, 6, 7), plastic);
        lug.position.set(sx * capR * 0.72, capY + p.cap - 1, 0); add(lug);
      }
    }
  }

  // decal (vùng khắc/in) mặt trước (θ quanh 0 = +z) và mặt sau (θ quanh π)
  const a = p.area;
  const r0 = radiusAt(p, a.y0) + 0.14, r1 = radiusAt(p, a.y0 + a.h) + 0.14;
  const rMid = (r0 + r1) / 2, len = a.w / rMid;
  for (const [mat, c] of [[dec.front, 0], [dec.back, Math.PI]] as const) {
    if (!mat) continue;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r0, a.h, 96, 1, true, c - len / 2, len), mat);
    m.position.y = a.y0 + a.h / 2; m.renderOrder = 2;
    g.add(m);
  }
  g.scale.setScalar(S);
  return g;
}

function decalMat(t: THREE.Texture, method: 'laser' | 'uv', finishHex: string | null, aniso: number): THREE.Material {
  t.anisotropy = aniso;
  const off = { polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 };
  if (method === 'uv') {
    return new THREE.MeshPhysicalMaterial({ map: t, transparent: true, alphaTest: 0.04, roughness: 0.38, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.15, ...off });
  }
  t.colorSpace = THREE.NoColorSpace;
  if (finishHex) {
    // khắc trên sơn → lộ inox sáng, lõm nhẹ
    return new THREE.MeshPhysicalMaterial({ color: '#E1E4E8', metalness: 1, roughness: 0.3, roughnessMap: tex(brushed(), aniso), alphaMap: t, alphaTest: 0.5, bumpMap: t, bumpScale: -0.5, ...off });
  }
  // khắc trên inox trần → vết sẫm, mờ
  return new THREE.MeshPhysicalMaterial({ color: '#3F4348', metalness: 0.65, roughness: 0.62, alphaMap: t, alphaTest: 0.5, bumpMap: t, bumpScale: -0.4, ...off });
}

export function tumblerBuilder(o: Tumbler3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.backA) throw new Error('Chưa dựng xong thiết kế');
    const p = tbProduct(o.product);
    const px = Math.round(Math.max(900, Math.min(2048, p.area.w * 34)));
    const bg = o.method === 'laser' ? '#000000' : '';
    const [tf, ta, tb] = await Promise.all([
      svgTex(o.front, o.fontCss, px, aniso, bg),
      svgTex(o.backA, o.fontCss, px, aniso, bg),
      o.backB ? svgTex(o.backB, o.fontCss, px, aniso, bg) : Promise.resolve(null),
    ]);
    const mk = (t: THREE.Texture | null) => (t ? decalMat(t, o.method, o.finishHex, aniso) : null);
    const fm = mk(tf);
    const itemA = makeItem(p, o.finishHex, { front: fm, back: mk(ta) }, aniso);
    const itemB = makeItem(p, o.finishHex, { front: fm, back: mk(tb || ta) }, aniso);

    // đặt trong hệ quy chiếu camera: bình A trước-trái khoe mặt trước, bình B sau-phải quay mặt sau (tên)
    const az = 0.32;
    const right = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az)), toward = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
    const R = Math.max(p.diaTop, p.diaBot) / 2;
    const dx = (R + 12) * S;
    itemA.position.copy(right.clone().multiplyScalar(-dx * 0.95).add(toward.clone().multiplyScalar(14 * S)));
    itemB.position.copy(right.clone().multiplyScalar(dx * 1.05).add(toward.clone().multiplyScalar(-26 * S)));
    itemA.rotation.y = az + 0.12;
    itemB.rotation.y = az + Math.PI - 0.16;
    const grp = new THREE.Group(); grp.add(itemA, itemB);
    return { group: grp, view: { az, el: 0.1 }, aim: 0.5, zoom: p.kind === 'tumbler' ? 1.18 : 1.12, blob: 0.75 };
  };
}
