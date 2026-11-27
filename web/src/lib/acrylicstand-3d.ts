'use client';
// Standee mica mini 3D: thân mica trong 3mm đùn từ ĐÚNG đường cắt (có chân cắm) → hình in ở mặt sau nhìn xuyên qua mica,
// lớp lót trắng làm hình đục, mép mica vát bóng bắt sáng; cắm vào đế mica 5mm (khe đúng kích thước) có chữ in trên mặt đế.
// Thêm 1 bản thứ 2 xoay góc khác + vệt sáng khúc xạ nhẹ trên mặt bàn.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import { AS_BASE_T, AS_FIG_T, type AsSpec, type StandFig, type StandResult } from './acrylicstand-engine';

const U = 0.1 * S;           // đơn vị đường cắt = 0.1mm
const BEV = 2;               // vát 0.2mm
const NS = 'http://www.w3.org/2000/svg';

function loadImg(src: string): Promise<HTMLImageElement> { const im = new Image(); im.src = src; return im.decode().then(() => im); }

function shapesOf(d: string): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${d}"/></svg>`);
  return data.paths.flatMap((p) => SVGLoader.createShapes(p));
}

const acrylic = () => ({
  cap: new THREE.MeshPhysicalMaterial({ color: '#F2FAFB', transparent: true, opacity: 0.22, roughness: 0.03, clearcoat: 1, clearcoatRoughness: 0.03, ior: 1.49, specularIntensity: 1, depthWrite: false }),
  side: new THREE.MeshPhysicalMaterial({ color: '#D9F0F2', transparent: true, opacity: 0.65, roughness: 0.04, clearcoat: 1, ior: 1.49, specularIntensity: 1, emissive: '#BFE6EA', emissiveIntensity: 0.08 }),
});

// texture khớp toạ độ đường cắt: canvas = khung res (0.1mm), vẽ ảnh đúng chỗ
async function layerTex(fig: StandFig, href: string, aniso: number, recolor?: string): Promise<THREE.CanvasTexture> {
  const { res } = fig;
  const k = Math.min(1, 2048 / Math.max(res.w, res.h));
  const c = document.createElement('canvas'); c.width = Math.round(res.w * k); c.height = Math.round(res.h * k);
  const x = c.getContext('2d')!;
  const im = await loadImg(href);
  x.drawImage(im, res.art.x * k, res.art.y * k, res.art.w * k, res.art.h * k);
  if (recolor) { x.globalCompositeOperation = 'source-in'; x.fillStyle = recolor; x.fillRect(0, 0, c.width, c.height); }
  const t = canvasTex(c, aniso);
  t.flipY = false; t.repeat.set(1 / res.w, 1 / res.h); t.needsUpdate = true;
  return t;
}

async function figure(fig: StandFig, spec: AsSpec, aniso: number): Promise<THREE.Group> {
  const shapes = shapesOf(fig.res.d);
  const depth = AS_FIG_T * 10 - BEV * 2;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: BEV, bevelSize: BEV, bevelSegments: 3, curveSegments: 14 });
  const m = acrylic();
  const body = new THREE.Mesh(geo, [m.cap, m.side]);
  body.renderOrder = 3;
  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 22),
    new THREE.LineBasicMaterial({color:'#d9f5f8', transparent:true, opacity:.29, depthWrite:false}),
  );
  edge.renderOrder = 4;
  const inner = new THREE.Group();
  inner.scale.set(U, -U, U);
  inner.add(body, edge);
  const flat = new THREE.ShapeGeometry(shapes, 14);
  const art = await layerTex(fig, fig.res.art.href, aniso);
  // hình in ở mặt sau, nhìn xuyên mica từ phía trước
  const print = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ map: art, transparent: true, alphaTest: 0.08, roughness: 0.5 }));
  print.position.z = -BEV - 0.25; print.castShadow = true;
  inner.add(print);
  if (spec.white || spec.sides === 2) {
    const wt = await layerTex(fig, fig.res.art.href, aniso, '#F7F7F4');
    const wl = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ map: wt, transparent: true, alphaTest: 0.08, roughness: 0.7, side: THREE.DoubleSide }));
    wl.position.z = -BEV - 0.5;
    inner.add(wl);
  }
  if (spec.sides === 2) {
    const back = new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ map: art, transparent: true, alphaTest: 0.08, roughness: 0.5, side: THREE.BackSide }));
    back.position.z = -BEV - 0.75;
    inner.add(back);
  }
  const g = new THREE.Group(); g.add(inner);
  return g;
}

function causticTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const gr = x.createRadialGradient(128, 128, 4, 128, 128, 126);
  gr.addColorStop(0, 'rgba(235,252,255,0.95)'); gr.addColorStop(0.35, 'rgba(200,240,250,0.45)'); gr.addColorStop(1, 'rgba(200,240,250,0)');
  x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
  // vài vệt sáng gợn
  x.globalCompositeOperation = 'lighter'; x.strokeStyle = 'rgba(255,255,255,0.35)'; x.lineWidth = 3;
  for (let i = 0; i < 5; i++) { x.beginPath(); x.ellipse(128, 128, 30 + i * 18, 12 + i * 7, 0.2, 0.3, 2.6); x.stroke(); }
  return canvasTex(c, aniso);
}

async function stand(r: StandResult, spec: AsSpec, baseTop: SVGSVGElement | null, fontCss: string, aniso: number): Promise<THREE.Group> {
  const g = new THREE.Group();
  const B = r.base;
  // ---- đế ----
  const shapes = shapesOf(B.path);
  for (const sh of shapes) for (const sl of B.slots) {
    const h = new THREE.Path();
    h.moveTo(sl.cx - sl.w / 2, sl.cy - sl.h / 2); h.lineTo(sl.cx + sl.w / 2, sl.cy - sl.h / 2); h.lineTo(sl.cx + sl.w / 2, sl.cy + sl.h / 2); h.lineTo(sl.cx - sl.w / 2, sl.cy + sl.h / 2); h.closePath();
    sh.holes.push(h);
  }
  const bb = 0.35;
  const bgeo = new THREE.ExtrudeGeometry(shapes, { depth: AS_BASE_T - bb * 2, bevelEnabled: true, bevelThickness: bb, bevelSize: bb, bevelSegments: 3, curveSegments: 40 });
  const white = spec.baseTint === 'white';
  const bm = white
    ? [new THREE.MeshPhysicalMaterial({ color: '#FBFBF8', roughness: 0.25, clearcoat: 0.8 }), new THREE.MeshPhysicalMaterial({ color: '#F1F2EE', roughness: 0.3, clearcoat: 0.6 })]
    : (() => { const m = acrylic(); return [m.cap, m.side]; })();
  const base = new THREE.Mesh(bgeo, bm);
  base.rotation.x = Math.PI / 2;          // mặt cắt nằm ngang, y (svg) → +z (về phía trước)
  base.position.y = AS_BASE_T - bb;
  base.castShadow = white; base.receiveShadow = true; base.renderOrder = 2;
  const baseG = new THREE.Group(); baseG.scale.setScalar(S); baseG.add(base);
  if (baseTop) {
    const tex = await svgTex(baseTop, fontCss, Math.min(2048, Math.round(B.w * 22)), aniso, '');
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(B.w, B.d), new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.04, roughness: 0.45, polygonOffset: true, polygonOffsetFactor: -2 }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(B.w / 2, AS_BASE_T + 0.06, B.d / 2);
    baseG.add(plane);
  }
  g.add(baseG);
  // ---- thân mica cắm vào khe ----
  for (let i = 0; i < r.figs.length; i++) {
    const fig = r.figs[i], sl = B.slots[i];
    const fg = await figure(fig, spec, aniso);
    const inner = fg.children[0];
    inner.position.set(sl.cx * S - fig.tabCx * S, (fig.bottom + 0.3) * S, sl.cy * S - (AS_FIG_T * 10 / 2 - BEV) * U);
    g.add(fg);
  }
  // vệt sáng khúc xạ sau lưng mica
  const cm = new THREE.Mesh(new THREE.PlaneGeometry(B.w * 0.9 * S, B.d * 1.6 * S), new THREE.MeshBasicMaterial({ map: causticTex(aniso), transparent: true, opacity: white ? 0.16 : 0.34, blending: THREE.AdditiveBlending, depthWrite: false }));
  cm.rotation.x = -Math.PI / 2; cm.position.set(B.w * 0.58 * S, 0.12 * S, -B.d * 0.55 * S);
  g.add(cm);
  return g;
}

export function standBuilder(o: { r: StandResult | null; spec: AsSpec; baseTop: SVGSVGElement | null; fontCss: string }): Builder {
  return async (aniso) => {
    if (!o.r) throw new Error('Chưa dựng xong standee');
    const main = await stand(o.r, o.spec, o.baseTop, o.fontCss, aniso);
    const out = new THREE.Group();
    // canh giữa bản chính quanh gốc
    const B = o.r.base;
    main.position.set(-B.w / 2 * S, 0, -B.d / 2 * S);
    out.add(main);
    // bản thứ 2: xoay ~40°, lùi sau-phải, nhỏ hơn chút để bố cục có chiều sâu
    const twin = main.clone(true);
    const pivot = new THREE.Group(); pivot.add(twin);
    twin.position.copy(main.position);
    pivot.rotation.y = -0.75; pivot.scale.setScalar(0.86);
    pivot.position.set(B.w * 0.95 * S, 0, -B.d * 1.5 * S);
    out.add(pivot);
    return { group: out, view: { az: 0.38, el: 0.16 }, aim: 0.42, zoom: 1.12, blob: 0.3 };
  };
}
