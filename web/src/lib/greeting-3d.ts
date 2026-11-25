'use client';
// Thiệp gấp đôi 3D: 1 thiệp ĐỨNG hé ~100° (thấy bìa ngoài + trang lời chúc bên trong), giấy dày thật, nếp gấp bo;
// 1 thiệp GẬP nằm trên phong bì cùng tông (nắp mở, lót ánh kim). Ép kim: phần vàng là kim loại thật
// (bản đồ metal/roughness dựng từ "khuôn ép kim" của chính thiết kế). Texture = SVG thiết kế.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export interface GTEls {
  cover: SVGSVGElement | null; back: SVGSVGElement | null; inLeft: SVGSVGElement | null; inRight: SVGSVGElement | null;
  coverFoil: SVGSVGElement | null; backFoil: SVGSVGElement | null; inLeftFoil: SVGSVGElement | null; inRightFoil: SVGSVGElement | null;
}

async function raster(el: SVGSVGElement, css: string, w: number, h: number, bg: string) {
  return svgToCanvas(await selfContainedSvg(el, css), w, h, bg);
}
// R = clearcoat, G = độ nhám, B = kim loại
async function matMap(foil: SVGSVGElement, css: string, w: number, h: number) {
  const f = (await raster(foil, css, w, h, '#000000')).getContext('2d')!.getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = f[i] / 255;
    d[i] = Math.round(40 + 215 * k); d[i + 1] = Math.round(255 * (1 - 0.8 * k)); d[i + 2] = Math.round(255 * k); d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}

function envelopeTex(color: string, aniso: number, W: number, H: number) {
  const px = 6;
  const c = document.createElement('canvas'); c.width = Math.round(W * px); c.height = Math.round(H * px);
  const x = c.getContext('2d')!;
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  // sợi giấy mỹ thuật
  for (let i = 0; i < 2600; i++) {
    x.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    x.fillRect(Math.random() * c.width, Math.random() * c.height, 1 + Math.random() * 3, 1);
  }
  // đường dán tai hai bên + mép tai đáy (mặt sau phong bì)
  x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = px * 0.35;
  x.beginPath();
  x.moveTo(0, 0); x.lineTo(c.width * 0.5, c.height * 0.58); x.lineTo(c.width, 0);
  x.moveTo(0, c.height); x.lineTo(c.width * 0.36, c.height * 0.5);
  x.moveTo(c.width, c.height); x.lineTo(c.width * 0.64, c.height * 0.5);
  x.stroke();
  return canvasTex(c, aniso);
}
function linerTex(gold: string, aniso: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = gold; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(255,255,255,0.22)'; x.lineWidth = 2;
  for (let i = -512; i < 1024; i += 22) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 512, 512); x.stroke(); }
  return canvasTex(c, aniso);
}

export function greetingBuilder(o: { els: GTEls; fontCss: string; wMm: number; hMm: number; foil: boolean; envColor: string; liner: string; edge: string; flat?: boolean }): Builder {
  return async (aniso) => {
    const { els, fontCss: css } = o;
    if (!els.cover || !els.back || !els.inLeft || !els.inRight) throw new Error('Chưa dựng xong thiệp');
    const W = o.wMm, H = o.hMm;
    const outW = Math.round(Math.min(1800, Math.max(1200, W * 13))), outH = Math.round((outW * H) / W);
    const tex = async (el: SVGSVGElement) => canvasTex(await raster(el, css, outW, outH, '#FFFFFF'), aniso);
    const [cT, bT, lT, rT, cM, bM, lM, rM] = await Promise.all([
      tex(els.cover), tex(els.back), tex(els.inLeft), tex(els.inRight),
      o.foil && els.coverFoil ? matMap(els.coverFoil, css, outW, outH) : null,
      o.foil && els.backFoil ? matMap(els.backFoil, css, outW, outH) : null,
      o.foil && els.inLeftFoil ? matMap(els.inLeftFoil, css, outW, outH) : null,
      o.foil && els.inRightFoil ? matMap(els.inRightFoil, css, outW, outH) : null,
    ]);
    const face = (map: THREE.Texture, mm: THREE.Texture | null) => new THREE.MeshPhysicalMaterial({
      map, roughness: mm ? 1 : 0.62, metalness: mm ? 1 : 0, metalnessMap: mm, roughnessMap: mm,
      clearcoat: mm ? 1 : 0.06, clearcoatMap: mm, clearcoatRoughness: 0.18, envMapIntensity: mm ? 2.3 : 1,
      color: '#F2F2F2',
    });
    const mCover = face(cT, cM), mBack = face(bT, bM), mInL = face(lT, lM), mInR = face(rT, rM);
    const edge = new THREE.MeshStandardMaterial({ color: o.edge, roughness: 0.85 });
    const t = 0.42 * S; // giấy 350gsm ≈ 0.42mm

    // tấm giấy: x 0 → W (0 = nếp gấp), đáy y = 0; +z = mặt A, −z = mặt B
    const sheet = (front: THREE.Material, backM: THREE.Material) => {
      const g = new THREE.BoxGeometry(W * S, H * S, t);
      g.translate((W * S) / 2, (H * S) / 2, 0);
      const m = new THREE.Mesh(g, [edge, edge, edge, edge, front, backM]);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };

    const grp = new THREE.Group();

    if (!o.flat) {
    // ---- thiệp đứng, mở ~100° ----
    const open = (100 * Math.PI) / 180;
    const BIAS = 0;
    const stand = new THREE.Group();
    const panelB = sheet(mInR, mBack);          // trang phải trong (+z, quay vào lòng thiệp) / mặt sau ngoài
    const pivotA = new THREE.Group();
    pivotA.rotation.y = -open;
    pivotA.add(sheet(mCover, mInL));           // bìa ngoài (+z hướng ra) / trang trái trong
    // nếp gấp bo tròn
    const crease = new THREE.Mesh(new THREE.CylinderGeometry(t * 0.9, t * 0.9, H * S, 12, 1, false), edge);
    crease.position.set(0, (H * S) / 2, 0); crease.castShadow = true;
    stand.add(panelB, pivotA, crease);
    // xoay để từ camera thấy cả bìa (ngoài tấm A) lẫn lời chúc (trong tấm B)
    const goodDir = (65 * Math.PI) / 180 + BIAS; // nhìn từ trong lòng thiệp: thấy rõ trang lời chúc (B) + trang trái (A) — bìa thì xem ở thiệp nằm
    const camDir = Math.atan2(Math.cos(0.32), Math.sin(0.32));
    stand.rotation.y = goodDir - camDir;
    grp.add(stand);
    }

    // ---- phong bì nằm (nắp mở) + thiệp gập nằm trên ----
    const EW = W + 12, EH = H + 12;
    const env = new THREE.Group();
    const envBody = new THREE.Mesh(new THREE.BoxGeometry(EW * S, 0.9 * S, EH * S), [
      new THREE.MeshStandardMaterial({ color: o.envColor, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: o.envColor, roughness: 0.8 }),
      new THREE.MeshStandardMaterial({ map: envelopeTex(o.envColor, aniso, EW, EH), roughness: 0.72 }), new THREE.MeshStandardMaterial({ color: o.envColor }),
      new THREE.MeshStandardMaterial({ color: o.envColor, roughness: 0.8 }), new THREE.MeshStandardMaterial({ color: o.envColor, roughness: 0.8 }),
    ]);
    envBody.position.y = 0.45 * S; envBody.castShadow = true; envBody.receiveShadow = true;
    // nắp mở nằm phẳng phía sau, lòng nắp lót ánh kim
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-EW / 2, 0); flapShape.lineTo(EW / 2, 0); flapShape.quadraticCurveTo(EW * 0.08, EH * 0.5, 0, EH * 0.52); flapShape.quadraticCurveTo(-EW * 0.08, EH * 0.5, -EW / 2, 0);
    const flapGeo = new THREE.ShapeGeometry(flapShape, 24);
    flapGeo.scale(S, S, S);
    const uv = flapGeo.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / EW + 0.5, uv.getY(i) / EH);
    const flap = new THREE.Mesh(flapGeo, new THREE.MeshPhysicalMaterial({
      map: linerTex(o.liner, aniso), metalness: o.foil ? 0.9 : 0, roughness: o.foil ? 0.32 : 0.7, side: THREE.DoubleSide,
    }));
    flap.rotation.x = -Math.PI / 2; flap.position.set(0, 0.12 * S, (-EH / 2) * S);
    flap.receiveShadow = true;
    env.add(envBody, flap);
    // thiệp gập: hộp dày 2 lớp giấy, mặt trên = bìa, mặt dưới = mặt sau (thiệp phẳng: 1 lớp, mặt dưới = lời chúc)
    const closedGeo = new THREE.BoxGeometry(W * S, o.flat ? t : t * 2.2, H * S);
    const closed = new THREE.Mesh(closedGeo, [edge, edge, mCover, mBack, edge, edge]);
    closed.position.set(-6 * S, 0.9 * S + t * 1.1, H * 0.34 * S);
    closed.rotation.y = 0.16;
    closed.castShadow = true; closed.receiveShadow = true;
    env.add(closed);
    if (o.flat) {
      // thiệp phẳng: 1 tấm nằm trên phong bì (mặt trước) + 1 tấm lật mặt sau (lời chúc) bên trái
      closed.material = [edge, edge, mCover, mInR, edge, edge];
      env.position.set(W * 0.42 * S, 0, 0);
      env.rotation.y = -0.18;
      grp.add(env);
      const second = new THREE.Mesh(new THREE.BoxGeometry(W * S, t, H * S), [edge, edge, mInR, mCover, edge, edge]);
      second.position.set(-W * 0.62 * S, t / 2, H * 0.08 * S);
      second.rotation.y = 0.14; second.castShadow = true; second.receiveShadow = true;
      grp.add(second);
      return { group: grp, view: { az: 0.06, el: 0.95 }, aim: 0.2, zoom: 1.12, blob: 0 };
    }
    env.position.set(W * 0.82 * S, 0, H * 0.62 * S);
    env.rotation.y = -0.32;
    grp.add(env);

    return { group: grp, view: { az: 0.32, el: 0.36 }, aim: 0.34, zoom: 1.3, blob: 0.35 };
  };
}
