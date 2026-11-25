'use client';
// Lót ly 3D: bàn gỗ quán cà phê, 1 lót ly đặt dưới ly nước (ly thuỷ tinh trong + nước + đá), 1 cái lật mặt sau
// có vệt ly nước loang, 1 chồng lót ly + 1 cái gác nghiêng lên chồng. Khối lót ly đùn từ ĐÚNG đường cắt (mm).
// Chất liệu: giấy bồi 1.5mm (mép xơ giấy), gỗ 3mm (vân gỗ lộ chỗ không in), cao su 3mm (bo mềm, mờ).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export type CoDrink = 'coffee' | 'beer' | 'milktea' | 'peach';
export interface Coaster3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; // bản in đúng khung thành phẩm (ngoài đường cắt trong suốt)
  d: string; wMm: number; hMm: number;
  material: 'pulp' | 'wood' | 'rubber';
  rubber: string;   // màu cao su (nền)
  fontCss: string;
  drink: CoDrink;
  straw: string;
  ring: boolean;    // vệt ly nước trên cái lật (chỉ hình tròn/vuông — không lòi ra mép)
}

const NS = 'http://www.w3.org/2000/svg';
function shapesOf(d: string): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

let seed = 3;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

// vân gỗ (thớ chạy ngang)
function woodCanvas(base: [number, number, number], n = 1024, plank = true, strong = 1): HTMLCanvasElement {
  seed = 11;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const [r, g, b] = base;
  x.fillStyle = `rgb(${r},${g},${b})`; x.fillRect(0, 0, n, n);
  if (plank) for (let i = 0; i < 4; i++) {
    const y = (i / 4) * n, k = 0.88 + rnd() * 0.2;
    x.fillStyle = `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},0.6)`; x.fillRect(0, y, n, n / 4);
    x.fillStyle = 'rgba(30,14,4,0.35)'; x.fillRect(0, y, n, 2);
  }
  for (let i = 0; i < 320; i++) {
    const y0 = rnd() * n, amp = 2 + rnd() * 8, fr = 0.003 + rnd() * 0.01, ph = rnd() * 6;
    x.strokeStyle = rnd() > 0.5 ? `rgba(60,30,10,${(0.05 + rnd() * 0.12) * strong})` : `rgba(255,228,190,${(0.04 + rnd() * 0.07) * strong})`;
    x.lineWidth = (0.6 + rnd() * 2) * (strong > 1 ? 1.6 : 1);
    x.beginPath();
    for (let px = 0; px <= n; px += 8) { const yy = y0 + Math.sin(px * fr + ph) * amp + Math.sin(px * fr * 3.3) * amp * 0.25; if (px) x.lineTo(px, yy); else x.moveTo(px, yy); }
    x.stroke();
  }
  for (let k = 0; k < 2; k++) {
    const cx = rnd() * n, cy = rnd() * n;
    for (let j = 7; j > 0; j--) { x.strokeStyle = `rgba(55,26,8,${0.07 + j * 0.02})`; x.lineWidth = 1.3; x.beginPath(); x.ellipse(cx, cy, j * 10, j * 3.4, 0, 0, Math.PI * 2); x.stroke(); }
  }
  return c;
}
// mép giấy bồi: xơ giấy lốm đốm
function pulpCanvas(): HTMLCanvasElement {
  seed = 5;
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#EDE6D8'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 2600; i++) {
    const v = 190 + Math.round(rnd() * 60);
    x.fillStyle = `rgba(${v},${v - 8},${v - 22},${0.25 + rnd() * 0.4})`;
    x.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 2.5, 0.6 + rnd());
  }
  for (let i = 0; i < 18; i++) { x.fillStyle = 'rgba(120,100,80,0.25)'; x.fillRect(0, rnd() * n, n, 0.7); } // lớp giấy ép
  return c;
}
function noiseCanvas(n = 256, k = 1): HTMLCanvasElement {
  seed = 9;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const im = x.createImageData(n, n);
  for (let i = 0; i < n * n; i++) { const v = 128 + (rnd() - 0.5) * 120 * k; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
  x.putImageData(im, 0, 0);
  return c;
}
// vệt nước (vòng tròn mờ) — alpha
function ringCanvas(): HTMLCanvasElement {
  // alphaMap đọc kênh G → vẽ xám trên nền ĐEN (không dùng alpha canvas)
  const n = 256, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 6; i++) { const v = Math.round(70 - i * 10); x.strokeStyle = `rgb(${v},${v},${v})`; x.lineWidth = 5 + i * 3; x.beginPath(); x.arc(n / 2 + i * 0.6, n / 2, 100 - i * 1.6, 0, Math.PI * 2); x.stroke(); }
  x.strokeStyle = 'rgb(150,150,150)'; x.lineWidth = 2.2; x.beginPath(); x.arc(n / 2, n / 2, 103, 0.3, Math.PI * 1.75); x.stroke();
  return c;
}

// nước: đậm dưới đáy, sáng dần lên mặt; bia có bọt khí li ti
function liquidCanvas(hex: string, bubbles: boolean): HTMLCanvasElement {
  seed = 21;
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d')!;
  const col = new THREE.Color(hex);
  const dk = col.clone().multiplyScalar(0.55), lt = col.clone().lerp(new THREE.Color('#FFFFFF'), 0.18);
  const gr = x.createLinearGradient(0, 512, 0, 0); // lathe: v=0 ở đáy
  gr.addColorStop(0, `#${dk.getHexString()}`); gr.addColorStop(0.55, `#${col.getHexString()}`); gr.addColorStop(1, `#${lt.getHexString()}`);
  x.fillStyle = gr; x.fillRect(0, 0, 256, 512);
  if (bubbles) for (let i = 0; i < 380; i++) {
    const r0 = 0.6 + rnd() * 1.6; x.fillStyle = `rgba(255,246,210,${0.25 + rnd() * 0.45})`;
    x.beginPath(); x.arc(rnd() * 256, rnd() * 512, r0, 0, Math.PI * 2); x.fill();
  }
  return c;
}

export function coasterBuilder(o: Coaster3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong lót ly');
    const W = o.wMm, H = o.hMm;
    const px = Math.min(2048, Math.max(1024, Math.round(Math.max(W, H) * 18)));
    const [fTex, bTex] = await Promise.all([svgTex(o.front, o.fontCss, px, aniso, ''), svgTex(o.back, o.fontCss, px, aniso, '')]);
    fTex.flipY = false; fTex.repeat.set(1 / W, 1 / H); fTex.needsUpdate = true;
    // mặt sau nhìn từ dưới lên: lật ngang UV để chữ đọc xuôi khi lật lót ly sang trái/phải
    bTex.flipY = false; bTex.repeat.set(-1 / W, 1 / H); bTex.offset.set(1, 0); bTex.needsUpdate = true;
    const shapes = shapesOf(o.d);
    const wood = o.material === 'wood', rubber = o.material === 'rubber';
    const T = wood || rubber ? 3 : 1.5, BEV = rubber ? 0.7 : wood ? 0.35 : 0.12;

    // ---------- vật liệu lót ly ----------
    const woodTex = wood ? canvasTex(woodCanvas([226, 192, 146], 1024, false, 2.6), aniso) : null;
    if (woodTex) { woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping; woodTex.repeat.set(1 / 110, 1 / 260); }
    const pulpTex = canvasTex(pulpCanvas(), aniso); pulpTex.wrapS = pulpTex.wrapT = THREE.RepeatWrapping; pulpTex.repeat.set(1 / 20, 1 / 2);
    const bump = new THREE.CanvasTexture(noiseCanvas(256, 1)); bump.wrapS = bump.wrapT = THREE.RepeatWrapping; bump.repeat.set(1 / 18, 1 / 18);
    let cap: THREE.Material, side: THREE.Material;
    if (wood) {
      cap = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.62 });
      side = new THREE.MeshStandardMaterial({ map: woodTex, color: '#C9A274', roughness: 0.75 });
    } else if (rubber) {
      cap = new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.78, bumpMap: bump, bumpScale: 0.25 });
      side = new THREE.MeshStandardMaterial({ color: o.rubber, roughness: 0.85 });
    } else {
      cap = new THREE.MeshStandardMaterial({ map: fTex, roughness: 0.86, bumpMap: bump, bumpScale: 0.35 });
      side = new THREE.MeshStandardMaterial({ map: pulpTex, roughness: 1 });
    }
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: T - BEV * 2, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: rubber ? 4 : 2, curveSegments: 40 });
    const flatGeo = new THREE.ShapeGeometry(shapes, 40);
    const printMat = new THREE.MeshStandardMaterial({ map: fTex, transparent: true, alphaTest: 0.02, roughness: wood ? 0.5 : 0.8, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const backMat = new THREE.MeshStandardMaterial({ map: bTex, transparent: true, alphaTest: 0.02, roughness: rubber ? 0.78 : 0.86, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, bumpMap: wood ? null : bump, bumpScale: 0.3 });
    // gỗ: mặt sau vẫn là gỗ, in lên trên
    const backBase = wood ? new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.65, side: THREE.BackSide }) : null;

    /** 1 lót ly nằm phẳng, gốc = tâm đáy; flip = úp mặt in xuống (lộ mặt sau) */
    const coaster = (flip = false, ring = false): THREE.Group => {
      const inner = new THREE.Group(); inner.scale.set(S, -S, S); // mm, y xuống → lật
      const body = new THREE.Mesh(geo, [cap, side]);
      body.position.set(-W / 2, -H / 2, BEV);
      body.castShadow = true; body.receiveShadow = true;
      inner.add(body);
      if (wood) { const pr = new THREE.Mesh(flatGeo, printMat); pr.position.set(-W / 2, -H / 2, T + 0.03); pr.renderOrder = 2; inner.add(pr); }
      if (backBase) { const bb = new THREE.Mesh(flatGeo, backBase); bb.position.set(-W / 2, -H / 2, -0.02); inner.add(bb); }
      const bk = new THREE.Mesh(flatGeo, backMat); bk.position.set(-W / 2, -H / 2, -0.06); bk.renderOrder = 2; inner.add(bk);
      if (ring) {
        // vệt ly nước để lại trên mặt đang ngửa (mặt sau khi lật)
        const rs = Math.min(W, H) * 0.7;
        const rm = new THREE.Mesh(new THREE.PlaneGeometry(rs, rs), new THREE.MeshBasicMaterial({ color: '#6A5238', alphaMap: new THREE.CanvasTexture(ringCanvas()), transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
        rm.position.set(-W * 0.1, H * 0.12, flip ? -0.12 : T + 0.08);
        rm.renderOrder = 3;
        inner.add(rm);
      }
      const flipG = new THREE.Group(); flipG.add(inner);
      if (flip) { flipG.rotation.y = Math.PI; flipG.position.z = T * S; }
      const lay = new THREE.Group(); lay.add(flipG);
      lay.rotation.x = -Math.PI / 2;
      const out = new THREE.Group(); out.add(lay);
      return out;
    };

    const g = new THREE.Group();
    // ---------- bàn gỗ ----------
    const TW = 900, TD = 640, TT = 22;
    const tTex = canvasTex(woodCanvas([120, 78, 46]), aniso); tTex.wrapS = tTex.wrapT = THREE.RepeatWrapping; tTex.repeat.set(1, 1);
    const topMat = new THREE.MeshPhysicalMaterial({ map: tTex, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.45 });
    const edgeMat = new THREE.MeshStandardMaterial({ map: tTex, color: '#8C6A4E', roughness: 0.6 });
    const table = new THREE.Mesh(new RoundedBoxGeometry(TW * S, TT * S, TD * S, 3, 4 * S), [edgeMat, edgeMat, topMat, edgeMat, edgeMat, edgeMat]);
    table.position.y = (TT / 2) * S; table.receiveShadow = true;
    g.add(table);
    const Y0 = TT * S;

    // ---------- bố cục ----------
    const span = Math.max(W, H);
    // A: lót ly dưới ly nước (mặt trước)
    const ax = -span * 0.62, az = -span * 0.28;
    const A = coaster(false); A.position.set(ax * S, Y0, az * S); A.rotation.y = 0.12; g.add(A);
    // B: lật mặt sau, có vệt nước
    const B = coaster(true, o.ring); B.position.set(span * 0.1 * S, Y0, span * 0.68 * S); B.rotation.y = -0.3; g.add(B);
    // C: chồng 5 cái + D gác nghiêng lên mép chồng (mép gần chạm bàn)
    const N = 5;
    const stackX = span * 0.72, stackZ = -span * 0.62;
    for (let i = 0; i < N; i++) {
      const c = coaster(false);
      c.position.set((stackX + (rnd() - 0.5) * 2.4) * S, Y0 + i * (T + 0.05) * S, (stackZ + (rnd() - 0.5) * 2.4) * S);
      c.rotation.y = (rnd() - 0.5) * 0.08;
      g.add(c);
    }
    const stackH = N * (T + 0.05);
    const L = H * 0.55; // khoảng ngang từ mép chạm bàn tới mép gần của chồng
    const lean = Math.atan2(stackH + 0.4, L);
    const D = coaster(false);
    D.position.set(0, 0, -(H / 2) * S);    // mép gần của D tại gốc dg
    const dg = new THREE.Group(); dg.add(D);
    dg.rotation.x = lean;                   // nhấc mép xa lên
    dg.position.set((stackX - W * 0.08) * S, Y0, (stackZ + H / 2 + L) * S);
    g.add(dg);

    // ---------- ly nước trên A ----------
    const gx = ax, gz = az;
    const rB = 30, rT = 39, GH = 112;
    const rAt = (y: number) => rB + (rT - rB) * (y / GH);
    const glassPts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) { const y = (i / 24) * GH; glassPts.push(new THREE.Vector2(rAt(y), y)); }
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transmission: 1, thickness: 2.2 * S, roughness: 0.03, ior: 1.5, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide, envMapIntensity: 1.2, specularIntensity: 1 });
    const glass = new THREE.Mesh(new THREE.LatheGeometry(glassPts.map((p) => p.clone().multiplyScalar(S)), 64), glassMat);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(rB * S, (rB - 0.4) * S, 7 * S, 64), glassMat);
    base.position.y = 3.5 * S;
    const rim = new THREE.Mesh(new THREE.TorusGeometry((rT - 0.6) * S, 1.1 * S, 10, 64), glassMat);
    rim.rotation.x = Math.PI / 2; rim.position.y = GH * S;
    const glassG = new THREE.Group(); glassG.add(glass, base, rim);
    // nước
    const fill = o.drink === 'beer' ? 88 : 78;
    const liqPts: THREE.Vector2[] = [new THREE.Vector2(0, 7.2)];
    for (let i = 0; i <= 14; i++) { const y = 7.2 + (i / 14) * (fill - 7.2); liqPts.push(new THREE.Vector2(rAt(y) - 2.2, y)); }
    liqPts.push(new THREE.Vector2(0, fill));
    const liqColor = { coffee: '#3E2416', beer: '#C27A12', milktea: '#B98A60', peach: '#E07A3C' }[o.drink];
    const liqTex = canvasTex(liquidCanvas(liqColor, o.drink === 'beer'), aniso);
    liqTex.flipY = true;
    const liqMat = new THREE.MeshPhysicalMaterial({ map: liqTex, roughness: 0.14, clearcoat: 1, clearcoatRoughness: 0.06, emissive: o.drink === 'beer' || o.drink === 'peach' ? liqColor : '#000000', emissiveIntensity: o.drink === 'beer' ? 0.1 : 0.06 });
    const liq = new THREE.Mesh(new THREE.LatheGeometry(liqPts.map((p) => p.clone().multiplyScalar(S)), 48), liqMat);
    glassG.add(liq);
    if (o.drink === 'coffee') {
      // lớp sữa phía trên (bạc xỉu)
      const mPts = [new THREE.Vector2(0, fill - 20)];
      for (let i = 0; i <= 6; i++) { const y = fill - 20 + (i / 6) * 20.4; mPts.push(new THREE.Vector2(rAt(y) - 2.1, y)); }
      mPts.push(new THREE.Vector2(0, fill + 0.4));
      glassG.add(new THREE.Mesh(new THREE.LatheGeometry(mPts.map((p) => p.clone().multiplyScalar(S)), 48), new THREE.MeshPhysicalMaterial({ color: '#C9A27A', roughness: 0.3, clearcoat: 0.6 })));
    }
    if (o.drink === 'beer') {
      const fPts = [new THREE.Vector2(0, fill - 1)];
      for (let i = 0; i <= 6; i++) { const y = fill - 1 + (i / 6) * 16; fPts.push(new THREE.Vector2(rAt(y) - 2 - (i === 6 ? 6 : 0), y)); }
      fPts.push(new THREE.Vector2(0, fill + 17));
      const foam = new THREE.Mesh(new THREE.LatheGeometry(fPts.map((p) => p.clone().multiplyScalar(S)), 48), new THREE.MeshStandardMaterial({ color: '#FFF8EC', roughness: 0.95, bumpMap: bump, bumpScale: 1.2 }));
      glassG.add(foam);
    }
    if (o.drink === 'milktea') {
      // trân châu ép sát thành ly
      const pearl = new THREE.MeshPhysicalMaterial({ color: '#2A1A12', roughness: 0.18, clearcoat: 1 });
      const pg = new THREE.SphereGeometry(4.6 * S, 16, 12);
      for (let i = 0; i < 26; i++) {
        const a = (i / 13) * Math.PI * 2 + (i >= 13 ? 0.24 : 0), y = i >= 13 ? 18 : 11.5;
        const r = rAt(y) - 5.2;
        const m = new THREE.Mesh(pg, pearl); m.position.set(Math.cos(a) * r * S, y * S, Math.sin(a) * r * S); glassG.add(m);
      }
    }
    // đá viên
    if (o.drink !== 'beer') {
      const iceMat = new THREE.MeshPhysicalMaterial({ color: '#BFD4DA', roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.72, depthWrite: false });
      const ice = [[-10, 4, 0.4], [11, -6, -0.6], [2, 13, 1.1]] as const;
      ice.forEach(([x, z, r], i) => {
        const m = new THREE.Mesh(new RoundedBoxGeometry(16 * S, 14 * S, 16 * S, 3, 3 * S), iceMat);
        m.position.set(x * 0.9 * S, (fill - 6 + i * 1.5) * S, z * 0.9 * S); m.rotation.set(r * 0.4, r, r * 0.3); glassG.add(m);
      });
    }
    // ống hút
    if (o.drink === 'coffee' || o.drink === 'milktea' || o.drink === 'peach') {
      const sr = o.drink === 'milktea' ? 5.5 : 3.2;
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(sr * S, sr * S, 170 * S, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: o.straw, roughness: 0.3, clearcoat: 0.8, side: THREE.DoubleSide }));
      straw.position.set(14 * S, 85 * S, -6 * S); straw.rotation.z = -0.24; straw.rotation.x = 0.08; straw.castShadow = true;
      glassG.add(straw);
    }
    glass.castShadow = true;
    glassG.position.set(gx * S, Y0 + T * S, gz * S);
    g.add(glassG);

    // khung nhìn: ôm cụm lót ly + ly (bàn tràn ra ngoài khung)
    const objR = span * 1.32 + 30;
    const tableR = 0.5 * Math.hypot(TW, TD, TT + GH + T);
    const zoom = tableR / objR;
    return { group: g, view: { az: 0.3, el: 0.5 }, aim: 0.27, zoom: zoom * 1.36, blob: 0 };
  };
}
