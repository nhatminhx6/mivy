'use client';
// Thẻ cào 3D (lõi mockup3d): trên mặt bàn gỗ —
//  • thẻ A: còn nguyên lớp mực cào (kim loại, hạt mịn, chữ "CÀO TẠI ĐÂY")
//  • thẻ B: đã cào dở — mép cào lởm chởm lộ giải thưởng bên dưới + vụn mực cào rơi quanh
//  • thẻ C: lật mặt sau (thể lệ, QR)
//  • 1 đồng xu nằm cạnh (dụng cụ cào)

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export interface SC3DOpts {
  wMm: number; hMm: number; rMm: number;
  frontA: SVGSVGElement | null; frontB: SVGSVGElement | null; back: SVGSVGElement | null;
  zone: { x: number; y: number; w: number; h: number }; // mm, toạ độ thẻ (y xuống)
  zonePath: string;   // path vùng cào, đơn vị px (10 px/mm)
  ink: 'silver' | 'gold';
  fontCss: string;
}

const PX = 10; // px/mm trong engine

async function raster(el: SVGSVGElement, css: string, w: number) {
  const vb = el.viewBox.baseVal;
  return svgToCanvas(await selfContainedSvg(el, css, { outline: true }), w, Math.max(4, Math.round((w * vb.height) / vb.width)), '#FFFFFF');
}
function rrShape(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  r = Math.max(0.05, Math.min(r, w / 2, h / 2));
  s.moveTo(r, 0); s.lineTo(w - r, 0); s.quadraticCurveTo(w, 0, w, r); s.lineTo(w, h - r); s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r); s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
  return s;
}
// UV phẳng theo toạ độ hình (y lên). mirror = mặt sau nhìn từ dưới
function planarUV(geo: THREE.BufferGeometry, w: number, h: number, mirror = false) {
  const p = geo.getAttribute('position'); const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) { const u = p.getX(i) / w; uv[i * 2] = mirror ? 1 - u : u; uv[i * 2 + 1] = p.getY(i) / h; }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}
function rng(seed: number) { return () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; }

// hạt mịn của mực cào (bump + biến thiên độ nhám)
function grainTex(): THREE.CanvasTexture {
  const n = 256; const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!; const img = x.createImageData(n, n); const r = rng(11);
  for (let i = 0; i < n * n; i++) { const v = 110 + r() * 120; img.data.set([v, v, v, 255], i * 4); }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.colorSpace = THREE.NoColorSpace;
  return t;
}
// gỗ mặt bàn (óc chó, vân mịn — không sọc thô)
function woodTex(): THREE.CanvasTexture {
  const W = 1024, H = 1024; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!; const r = rng(5);
  const planks = 5;
  for (let p = 0; p < planks; p++) {
    const y0 = (p * H) / planks, ph = H / planks; const tone = 0.92 + r() * 0.14;
    const gr = x.createLinearGradient(0, y0, 0, y0 + ph);
    gr.addColorStop(0, `rgb(${Math.round(118 * tone)},${Math.round(78 * tone)},${Math.round(50 * tone)})`);
    gr.addColorStop(1, `rgb(${Math.round(104 * tone)},${Math.round(68 * tone)},${Math.round(42 * tone)})`);
    x.fillStyle = gr; x.fillRect(0, y0, W, ph);
    x.save();
    for (let k = 0; k < 140; k++) {
      x.strokeStyle = r() > 0.5 ? `rgba(60,34,18,${0.04 + r() * 0.07})` : `rgba(170,120,80,${0.03 + r() * 0.05})`;
      x.lineWidth = 0.8 + r() * 1.8; x.beginPath();
      const yy = y0 + r() * ph; const ph2 = r() * 6; x.moveTo(0, yy);
      for (let xx = 0; xx <= W; xx += 24) x.lineTo(xx, yy + Math.sin(xx * 0.004 + ph2) * 6 + Math.sin(xx * 0.017 + k) * 1.2);
      x.stroke();
    }
    x.restore();
    x.fillStyle = 'rgba(30,16,8,0.45)'; x.fillRect(0, y0, W, 3);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** mặt nạ lớp mực: vùng cào (trắng). scratched = khoét một phần bằng các nét cào lởm chởm */
function inkMask(o: SC3DOpts, W: number, H: number, scratched: boolean): HTMLCanvasElement {
  const k = W / o.wMm;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  x.save(); x.scale(k / PX, k / PX); x.fillStyle = '#FFF'; x.fill(new Path2D(o.zonePath)); x.restore();
  if (scratched) {
    // cào từ trái sang ~70%: nhiều nét cọ chéo, mép phải lởm chởm
    const z = o.zone; const r = rng(42);
    x.globalCompositeOperation = 'destination-out';
    x.lineCap = 'round'; x.lineJoin = 'round';
    const reach = z.x + z.w * 0.8;
    for (let s = 0; s < 26; s++) {
      x.lineWidth = (2.2 + r() * 2.4) * k;
      x.beginPath();
      const yy = (z.y + (s / 25) * z.h + (r() - 0.5) * 1.2) * k;
      x.moveTo((z.x - 2) * k, yy);
      const end = reach + (r() - 0.5) * z.w * 0.16;
      for (let xx = z.x; xx < end; xx += 1.5) x.lineTo(xx * k, yy + Math.sin(xx * 0.9 + s) * 0.5 * k + (r() - 0.5) * 0.4 * k);
      x.stroke();
    }
    // vụn còn sót lại trong vùng đã cào
    x.globalCompositeOperation = 'source-over'; x.fillStyle = '#FFF';
    for (let i = 0; i < 40; i++) { const px = (z.x + r() * z.w * 0.66) * k, py = (z.y + r() * z.h) * k; x.beginPath(); x.arc(px, py, (0.15 + r() * 0.35) * k, 0, Math.PI * 2); x.fill(); }
  }
  return c;
}
/** màu lớp mực: kim loại + chữ "CÀO TẠI ĐÂY" mờ */
function inkColor(o: SC3DOpts, W: number, H: number): HTMLCanvasElement {
  const k = W / o.wMm; const z = o.zone;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(z.x * k, z.y * k, (z.x + z.w) * k, (z.y + z.h) * k);
  if (o.ink === 'gold') { g.addColorStop(0, '#E9CF86'); g.addColorStop(0.5, '#C99A3C'); g.addColorStop(1, '#E4C277'); }
  else { g.addColorStop(0, '#D9DDE2'); g.addColorStop(0.5, '#AEB4BC'); g.addColorStop(1, '#D2D6DC'); }
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  let fs = Math.min(z.h * 0.22, 3.4) * k;
  x.font = `800 ${fs}px "Be Vietnam Pro"`;
  const tw = x.measureText('CÀO TẠI ĐÂY').width; if (tw > z.w * 0.7 * k) { fs *= (z.w * 0.7 * k) / tw; x.font = `800 ${fs}px "Be Vietnam Pro"`; }
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = o.ink === 'gold' ? 'rgba(110,78,18,0.45)' : 'rgba(70,76,86,0.42)';
  x.fillText('CÀO TẠI ĐÂY', (z.x + z.w / 2) * k, (z.y + z.h / 2) * k);
  return c;
}

/** 1 tấm thẻ: dày t mm, mặt trước lên trên. Trả nhóm đã scale về đơn vị cảnh */
function cardMesh(o: SC3DOpts, front: THREE.Texture, back: THREE.Texture, ink: { map: THREE.Texture; alpha: THREE.Texture; grain: THREE.Texture } | null, flipped: boolean) {
  const w = o.wMm, h = o.hMm, t = 0.35;
  const shape = rrShape(w, h, o.rMm);
  const paper = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.35 });
  const inner = new THREE.Group();
  const top = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(shape, 12), w, h), paper(front)); top.position.z = t;
  const bottom = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(shape, 12), w, h), paper(back)); bottom.rotation.y = Math.PI; bottom.position.x = w; // nhìn từ dưới, đọc xuôi
  const side = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: t, bevelEnabled: false, curveSegments: 12 }), [new THREE.MeshBasicMaterial({ visible: false }), new THREE.MeshStandardMaterial({ color: '#F4F1EA', roughness: 0.85 })]);
  for (const m of [top, bottom, side]) { m.castShadow = true; m.receiveShadow = true; }
  inner.add(top, bottom, side);
  if (ink) {
    const mat = new THREE.MeshStandardMaterial({
      map: ink.map, alphaMap: ink.alpha, transparent: true, alphaTest: 0.5, metalness: 0.9, roughness: 0.36,
      bumpMap: ink.grain, bumpScale: 0.6, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const layer = new THREE.Mesh(planarUV(new THREE.ShapeGeometry(shape, 12), w, h), mat);
    layer.position.z = t + 0.03; layer.castShadow = false; layer.receiveShadow = true;
    inner.add(layer);
  }
  inner.position.set(-w / 2, -h / 2, 0);
  const tilt = new THREE.Group(); tilt.add(inner);
  tilt.rotation.x = flipped ? Math.PI / 2 : -Math.PI / 2;
  if (flipped) tilt.position.y = t;
  const outer = new THREE.Group(); outer.add(tilt);
  if (flipped) outer.rotation.y = Math.PI;
  outer.scale.setScalar(S);
  const wrap = new THREE.Group(); wrap.add(outer);
  return wrap;
}

export function scratchBuilder(o: SC3DOpts): Builder {
  return async (aniso) => {
    if (!o.frontA || !o.frontB || !o.back) throw new Error('Chưa dựng xong thẻ');
    const PXW = 1400;
    const [fa, fb, bk] = await Promise.all([raster(o.frontA, o.fontCss, PXW), raster(o.frontB, o.fontCss, PXW), raster(o.back, o.fontCss, PXW)]);
    const H = fa.height;
    const tex = (c: HTMLCanvasElement) => { const t = canvasTex(c, aniso); t.colorSpace = THREE.SRGBColorSpace; return t; };
    const grain = grainTex();
    const colorC = inkColor(o, PXW, H);
    const alphaTex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return t; };
    const inkFull = { map: tex(colorC), alpha: alphaTex(inkMask(o, PXW, H, false)), grain };
    const inkHalf = { map: tex(colorC), alpha: alphaTex(inkMask(o, PXW, H, true)), grain };

    const g = new THREE.Group();
    const portrait = o.hMm > o.wMm;
    const W = o.wMm * S, D = o.hMm * S;
    // B (cào dở) ở trước-giữa, A phía sau-trái, C lật mặt sau phía sau-phải
    const B = cardMesh(o, tex(fb), tex(bk), inkHalf, false);
    B.rotation.y = 0.07; B.position.set(-W * 0.08, 0.6 * S, D * 0.2);
    const A = cardMesh(o, tex(fa), tex(bk), inkFull, false);
    A.rotation.y = -0.16; A.position.set(-W * (portrait ? 0.9 : 0.74), 0, -D * (portrait ? 0.56 : 0.68));
    const C = cardMesh(o, tex(fa), tex(bk), null, true);
    C.rotation.y = 0.2; C.position.set(W * (portrait ? 0.9 : 0.76), 0, -D * (portrait ? 0.62 : 0.78));
    g.add(A, C, B);

    // vụn mực cào quanh mép đã cào (trên thẻ B và rơi xuống bàn)
    const z = o.zone; const r = rng(9);
    const flakeMat = new THREE.MeshStandardMaterial({ color: o.ink === 'gold' ? '#D4AE5A' : '#BFC4CB', metalness: 0.7, roughness: 0.5 });
    const flakeGeo = new THREE.BoxGeometry(1, 0.12, 0.7);
    const cardY = 0.6 * S + 0.42 * S;
    for (let i = 0; i < 34; i++) {
      const f = new THREE.Mesh(flakeGeo, flakeMat);
      const s = (0.35 + r() * 0.9) * S; f.scale.set(s, S, s * (0.6 + r() * 0.8));
      // toạ độ thẻ (mm) → cảnh: tâm thẻ ở (0, D*0.18), x phải, y-thẻ xuống = +z cảnh
      const onCard = i < 22;
      const mx = onCard ? z.x + z.w * (0.55 + r() * 0.4) : z.x + z.w * (0.7 + r() * 0.5);
      const my = onCard ? z.y + r() * z.h : z.y + z.h + 1 + r() * 9;
      const lx = (mx - o.wMm / 2) * S, lz = (my - o.hMm / 2) * S;
      const c = Math.cos(0.07), sn = Math.sin(0.07);
      f.position.set(lx * c + lz * sn - W * 0.08, onCard ? cardY : 0.06 * S, -lx * sn + lz * c + D * 0.2);
      f.rotation.set((r() - 0.5) * 0.5, r() * Math.PI, (r() - 0.5) * 0.5);
      f.castShadow = true; g.add(f);
    }

    // đồng xu (dụng cụ cào) cạnh thẻ B
    const coinR = 11 * S, coinT = 1.9 * S;
    const coinMat = new THREE.MeshStandardMaterial({ color: '#C8A55A', metalness: 1, roughness: 0.3 });
    const coin = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(coinR, coinR, coinT, 64), coinMat); body.position.y = coinT / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(coinR * 0.92, coinT * 0.18, 10, 64), coinMat); rim.rotation.x = Math.PI / 2; rim.position.y = coinT;
    const face = new THREE.Mesh(new THREE.CircleGeometry(coinR * 0.6, 48), new THREE.MeshStandardMaterial({ color: '#B8944A', metalness: 1, roughness: 0.45 })); face.rotation.x = -Math.PI / 2; face.position.y = coinT + 0.01 * S;
    coin.add(body, rim, face);
    for (const m of [body, rim]) { m.castShadow = true; m.receiveShadow = true; }
    coin.position.set(W * 0.42 + coinR * 1.15, 0, D * 0.2 + D * 0.36);
    g.add(coin);

    // mặt bàn gỗ (không tính vào khung hình)
    const wt = woodTex(); wt.repeat.set(1.4, 1.4); wt.anisotropy = aniso;
    const tableGeo = new THREE.PlaneGeometry(W * 7, W * 7);
    tableGeo.boundingBox = new THREE.Box3(); tableGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
    const table = new THREE.Mesh(tableGeo, new THREE.MeshStandardMaterial({ map: wt, roughness: 0.55, metalness: 0 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.02 * S; table.receiveShadow = true; table.frustumCulled = false;
    table.userData.noBounds = true;
    g.add(table);

    return { group: g, view: { az: 0.16, el: 0.92 }, aim: 0.1, zoom: portrait ? 1.42 : 1.52, blob: 0 };
  };
}
