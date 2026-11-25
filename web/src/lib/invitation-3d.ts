'use client';
// Thiệp mời 3D:
//  · thiệp phẳng — ĐỨNG trên đế kim loại vàng (hơi ngả sau), mặt trước là thư mời; phong bì cùng tông nằm sau (nắp mở, lót ánh kim);
//    thẻ xác nhận RSVP (có QR) nằm phía trước.
//  · thiệp gấp đôi — đứng hé ~105° thấy trang kính mời bên trong + chương trình; phong bì + thẻ RSVP nằm cạnh.
// Giấy dày thật, ép kim = kim loại thật (bản đồ metal/roughness dựng từ khuôn ép kim của chính thiết kế).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';

export interface IVEls {
  front: SVGSVGElement | null; back: SVGSVGElement | null;
  cover: SVGSVGElement | null; backOut: SVGSVGElement | null; inLeft: SVGSVGElement | null; inRight: SVGSVGElement | null;
  rsvp: SVGSVGElement | null;
  foil: Partial<Record<'front' | 'back' | 'cover' | 'backOut' | 'inLeft' | 'inRight' | 'rsvp', SVGSVGElement | null>>;
}

async function raster(el: SVGSVGElement, css: string, w: number, h: number, bg: string) {
  return svgToCanvas(await selfContainedSvg(el, css), w, h, bg);
}
// R = clearcoat, G = độ nhám, B = kim loại (khuôn trắng = ép kim)
async function matMap(foil: SVGSVGElement, css: string, w: number, h: number) {
  const f = (await raster(foil, css, w, h, '#000000')).getContext('2d')!.getImageData(0, 0, w, h).data;
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(w, h); const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const k = f[i] / 255;
    d[i] = Math.round(40 + 215 * k); d[i + 1] = Math.round(255 * (1 - 0.78 * k)); d[i + 2] = Math.round(255 * k); d[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace;
  return t;
}

function paperTex(color: string, aniso: number, W: number, H: number, seams: boolean) {
  const px = 6;
  const c = document.createElement('canvas'); c.width = Math.round(W * px); c.height = Math.round(H * px);
  const x = c.getContext('2d')!;
  x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 3200; i++) {
    x.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    x.fillRect(Math.random() * c.width, Math.random() * c.height, 1 + Math.random() * 3, 1);
  }
  if (seams) {
    x.strokeStyle = 'rgba(0,0,0,0.2)'; x.lineWidth = px * 0.35;
    x.beginPath();
    x.moveTo(0, c.height); x.lineTo(c.width * 0.5, c.height * 0.45); x.lineTo(c.width, c.height);
    x.moveTo(0, 0); x.lineTo(c.width * 0.42, c.height * 0.5);
    x.moveTo(c.width, 0); x.lineTo(c.width * 0.58, c.height * 0.5);
    x.stroke();
  }
  return canvasTex(c, aniso);
}
function linerTex(gold: string, aniso: number) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = gold; x.fillRect(0, 0, 512, 512);
  x.strokeStyle = 'rgba(255,255,255,0.28)'; x.lineWidth = 2;
  for (let i = -512; i < 1024; i += 26) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 512, 512); x.stroke(); x.beginPath(); x.moveTo(i, 512); x.lineTo(i + 512, 0); x.stroke(); }
  return canvasTex(c, aniso);
}

export interface IV3DOpts {
  els: IVEls; fontCss: string; wMm: number; hMm: number; fold: boolean; foil: boolean;
  envColor: string; liner: string; edge: string; rsvpCard: boolean; standColor: string;
}

export function invitationBuilder(o: IV3DOpts): Builder {
  return async (aniso) => {
    const { els, fontCss: css } = o;
    const W = o.wMm, H = o.hMm;
    const need = o.fold ? [els.cover, els.backOut, els.inLeft, els.inRight] : [els.front, els.back];
    if (need.some((e) => !e)) throw new Error('Chưa dựng xong thiệp');
    const outW = Math.round(Math.min(1700, Math.max(1100, W * 12))), outH = Math.round((outW * H) / W);
    const tex = async (el: SVGSVGElement, w = outW, h = outH) => canvasTex(await raster(el, css, w, h, '#FFFFFF'), aniso);
    const mm = async (k: keyof IVEls['foil'], w = outW, h = outH) => (o.foil && els.foil[k] ? matMap(els.foil[k]!, css, w, h) : null);
    const face = (map: THREE.Texture, m: THREE.Texture | null) => new THREE.MeshPhysicalMaterial({
      map, roughness: m ? 1 : 0.6, metalness: m ? 1 : 0, metalnessMap: m, roughnessMap: m,
      clearcoat: m ? 1 : 0.05, clearcoatMap: m, clearcoatRoughness: 0.16, envMapIntensity: m ? 3.2 : 1, color: '#F3F3F3',
    });
    const edge = new THREE.MeshStandardMaterial({ color: o.edge, roughness: 0.85 });
    const t = 0.45 * S; // giấy mỹ thuật 350gsm
    const sheet = (front: THREE.Material, back: THREE.Material, w = W, h = H) => {
      const g = new THREE.BoxGeometry(w * S, h * S, t);
      g.translate((w * S) / 2, (h * S) / 2, 0);
      const m = new THREE.Mesh(g, [edge, edge, edge, edge, front, back]);
      m.castShadow = true; m.receiveShadow = true;
      return m;
    };
    const grp = new THREE.Group();

    if (!o.fold) {
      // ---- thiệp phẳng đứng trên đế vàng ----
      const [fT, bT, fM, bM] = await Promise.all([tex(els.front!), tex(els.back!), mm('front'), mm('back')]);
      const card = sheet(face(fT, fM), face(bT, bM));
      card.position.x = (-W / 2) * S;
      const lean = new THREE.Group();
      lean.add(card);
      lean.rotation.x = -0.09;
      lean.position.y = 3.2 * S;
      const standMat = new THREE.MeshPhysicalMaterial({ color: o.standColor, metalness: 1, roughness: 0.24, clearcoat: 0.6 });
      const baseW = Math.max(40, W * 0.55);
      const base = new THREE.Mesh(new RoundedBoxGeometry(baseW * S, 7 * S, 16 * S, 3, 1.6 * S), standMat);
      base.position.set(0, 3.5 * S, 1.2 * S); base.castShadow = true; base.receiveShadow = true;
      // khe kẹp: 2 gờ mỏng ôm thiệp
      const lipG = new RoundedBoxGeometry(baseW * 0.92 * S, 4 * S, 1.6 * S, 2, 0.6 * S);
      const lipF = new THREE.Mesh(lipG, standMat); lipF.position.set(0, 8.2 * S, 2.2 * S); lipF.castShadow = true;
      const lipB = new THREE.Mesh(lipG, standMat); lipB.position.set(0, 8.2 * S, -1.6 * S); lipB.castShadow = true;
      grp.add(lean, base, lipF, lipB);

      // phong bì nằm phía sau bên trái
      grp.add(envelope(o, aniso, W, H, (-H * 0.42) * S, (-W * 0.55) * S, 0.38));
      // thẻ RSVP nằm phía trước bên phải
      if (o.rsvpCard && els.rsvp) {
        const [rT, rM] = await Promise.all([tex(els.rsvp, 1200, 800), mm('rsvp', 1200, 800)]);
        const r = new THREE.Mesh(new THREE.BoxGeometry(90 * S, t, 60 * S), [edge, edge, face(rT, rM), edge, edge, edge]);
        r.position.set(W * 0.48 * S, t / 2, H * 0.36 * S); r.rotation.y = -0.22;
        r.castShadow = true; r.receiveShadow = true;
        grp.add(r);
      } else {
        // không có thẻ RSVP → 1 thiệp nằm khoe mặt sau (chương trình)
        const lay = new THREE.Mesh(new THREE.BoxGeometry(W * S, t, H * S), [edge, edge, face(bT, bM), face(fT, fM), edge, edge]);
        lay.position.set(W * 0.62 * S, t / 2, H * 0.22 * S); lay.rotation.y = -0.2;
        lay.castShadow = true; lay.receiveShadow = true;
        grp.add(lay);
      }
      return { group: grp, view: { az: 0.2, el: 0.42 }, aim: 0.4, zoom: 1.3, blob: 0.25 };
    }

    // ---- thiệp gấp đôi đứng hé ----
    const [cT, boT, lT, rT, cM, boM, lM, rM] = await Promise.all([
      tex(els.cover!), tex(els.backOut!), tex(els.inLeft!), tex(els.inRight!),
      mm('cover'), mm('backOut'), mm('inLeft'), mm('inRight'),
    ]);
    const open = (105 * Math.PI) / 180;
    const stand = new THREE.Group();
    const panelB = sheet(face(rT, rM), face(boT, boM)); // +z: trang kính mời (trong phải) / −z: mặt sau ngoài
    const pivotA = new THREE.Group();
    pivotA.rotation.y = -open;
    pivotA.add(sheet(face(cT, cM), face(lT, lM)));      // +z: bìa (ngoài) / −z: trang chương trình (trong trái)
    const crease = new THREE.Mesh(new THREE.CylinderGeometry(t * 0.9, t * 0.9, H * S, 12), edge);
    crease.position.set(0, (H * S) / 2, 0); crease.castShadow = true;
    stand.add(panelB, pivotA, crease);
    const goodDir = (62 * Math.PI) / 180;
    const camDir = Math.atan2(Math.cos(0.3), Math.sin(0.3));
    stand.rotation.y = goodDir - camDir;
    grp.add(stand);
    grp.add(envelope(o, aniso, W, H, W * 1.25 * S, H * 0.62 * S, -0.42));
    if (o.rsvpCard && els.rsvp) {
      const [rsT, rsM] = await Promise.all([tex(els.rsvp, 1200, 800), mm('rsvp', 1200, 800)]);
      const r = new THREE.Mesh(new THREE.BoxGeometry(90 * S, t, 60 * S), [edge, edge, face(rsT, rsM), edge, edge, edge]);
      r.position.set(-W * 0.25 * S, t / 2, H * 0.72 * S); r.rotation.y = 0.18;
      r.castShadow = true; r.receiveShadow = true;
      grp.add(r);
    }
    return { group: grp, view: { az: 0.3, el: 0.34 }, aim: 0.34, zoom: 1.28, blob: 0.3 };
  };
}

function envelope(o: IV3DOpts, aniso: number, W: number, H: number, x: number, z: number, rot: number): THREE.Group {
  // phong bì kiểu DL: cạnh DÀI nằm ngang (x), nắp tam giác mở ra từ cạnh dài phía sau
  const EL = H + 10, ES = W + 10;
  const env = new THREE.Group();
  const plain = new THREE.MeshStandardMaterial({ color: o.envColor, roughness: 0.8 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(EL * S, 1.1 * S, ES * S), [
    plain, plain, new THREE.MeshStandardMaterial({ map: paperTex(o.envColor, aniso, EL, ES, true), roughness: 0.72 }), plain, plain, plain,
  ]);
  body.position.y = 0.55 * S; body.castShadow = true; body.receiveShadow = true;
  const fh = ES * 0.5;
  const fs = new THREE.Shape();
  fs.moveTo(-EL / 2, 0); fs.lineTo(EL / 2, 0); fs.quadraticCurveTo(EL * 0.08, fh * 0.94, 0, fh); fs.quadraticCurveTo(-EL * 0.08, fh * 0.94, -EL / 2, 0);
  const fg = new THREE.ShapeGeometry(fs, 24);
  fg.scale(S, S, S);
  const uv = fg.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / EL + 0.5, uv.getY(i) / fh);
  const flap = new THREE.Mesh(fg, new THREE.MeshPhysicalMaterial({ map: linerTex(o.liner, aniso), metalness: o.foil ? 0.85 : 0, roughness: o.foil ? 0.32 : 0.7, side: THREE.DoubleSide }));
  flap.rotation.x = -Math.PI / 2; flap.position.set(0, 0.14 * S, (-ES / 2) * S); flap.receiveShadow = true;
  env.add(body, flap);
  env.rotation.y = rot;
  env.position.set(x, 0, z);
  return env;
}
