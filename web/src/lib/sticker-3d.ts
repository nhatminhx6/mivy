'use client';
// Sticker 3D: decal cắt theo ĐÚNG đường cắt (CutContour) của file in — mỏng 0.1mm, phủ bóng.
// Cảnh: 1 con dán nắp laptop, 1 con quấn cong theo bình nước, 1 tờ đế kiss-cut có 1 con đang bóc dở góc.
// Mỗi con là lưới phẳng nhiều ô → uốn đỉnh theo bề mặt (trụ, cuộn góc); cắt hình bằng alpha của texture.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, svgTex, type Builder } from './mockup3d';
import type { CutResult } from './cutout-engine';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag: string, at: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(at)) e.setAttribute(k, String(v));
  return e;
};

// lớp In (nền/viền + hình) hoặc mặt nạ trắng đúng hình cắt
function layerSvg(res: CutResult, mask: boolean): SVGSVGElement {
  const svg = el('svg', { viewBox: `0 0 ${res.w} ${res.h}` }) as SVGSVGElement;
  svg.appendChild(el('path', { d: res.d, fill: mask ? '#FFFFFF' : res.fill }));
  if (!mask) {
    const im = el('image', { x: res.art.x, y: res.art.y, width: res.art.w, height: res.art.h });
    im.setAttribute('href', res.art.href);
    svg.appendChild(im);
  }
  return svg;
}

// tờ đế (giấy lót silicon) có vết bế kiss-cut quanh từng con
function linerSvg(res: CutResult, lw: number, lh: number, centers: [number, number][]): SVGSVGElement {
  const svg = el('svg', { viewBox: `0 0 ${lw * 10} ${lh * 10}` }) as SVGSVGElement;
  svg.appendChild(el('rect', { x: 0, y: 0, width: lw * 10, height: lh * 10, fill: '#F5F3EE' }));
  for (const [cx, cy] of centers) {
    const g = el('g', { transform: `translate(${cx * 10 - res.w / 2} ${cy * 10 - res.h / 2})` });
    g.appendChild(el('path', { d: res.d, fill: 'none', stroke: 'rgba(60,52,40,0.22)', 'stroke-width': 4 }));
    svg.appendChild(g);
  }
  return svg;
}

type Place = (u: number, v: number) => THREE.Vector3; // (u phải, v lên) mm quanh tâm → toạ độ mm

interface Tex { front: THREE.Texture; back: THREE.Texture }

// 1 con sticker: lưới seg×seg uốn theo place(); mặt trước in phủ bóng, mặt sau giấy keo trắng
function sticker(W: number, H: number, t: Tex, place: Place, seg = 72): THREE.Group {
  const g = new THREE.PlaneGeometry(1, 1, seg, seg);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const p = place(pos.getX(i) * W, pos.getY(i) * H);
    pos.setXYZ(i, p.x * S, p.y * S, p.z * S);
  }
  g.computeVertexNormals();
  g.computeBoundingBox(); g.computeBoundingSphere();
  const front = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({
    map: t.front, alphaTest: 0.5, roughness: 0.38, clearcoat: 0.75, clearcoatRoughness: 0.16, side: THREE.FrontSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  const back = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    map: t.back, color: '#E9E6DF', alphaTest: 0.5, roughness: 0.85, side: THREE.BackSide,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
  }));
  front.castShadow = true; back.castShadow = true;
  const out = new THREE.Group(); out.add(front, back);
  return out;
}

export function stickerBuilder(o: { res: CutResult | null }): Builder {
  return async (aniso) => {
    const res = o.res;
    if (!res) throw new Error('Chưa dựng xong hình cắt');
    const W = res.w / 10, H = res.h / 10;                 // khung texture (mm, gồm lề)
    const tw = res.trimW, th = res.trimH;                  // thành phẩm (mm)
    const L = Math.max(tw, th);
    const k = THREE.MathUtils.clamp(L / 60, 0.75, 1.45);  // đạo cụ co theo cỡ sticker cho bố cục ổn định

    const px = Math.min(2048, Math.max(1024, Math.round(res.w * 2)));
    const [front, back] = await Promise.all([
      svgTex(layerSvg(res, false), undefined, px, aniso, ''),
      svgTex(layerSvg(res, true), undefined, 256, aniso, ''),
    ]);
    const tex: Tex = { front, back };
    const root = new THREE.Group();

    // ---------- laptop mở hé, mặt lưng nắp quay ra trước ----------
    {
      const lap = new THREE.Group();
      const LW = 300 * k, D = 210 * k, tb = 9 * k, Hl = 205 * k, tl = 5 * k, a = 0.3;
      const alu = new THREE.MeshPhysicalMaterial({ color: '#D3D6DA', metalness: 0.82, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.45 });
      const base = new THREE.Mesh(new RoundedBoxGeometry(LW * S, tb * S, D * S, 4, Math.min(tb * 0.45, 4) * S), alu);
      base.position.set(0, (tb / 2) * S, (-D / 2) * S);
      const U = new THREE.Vector3(0, Math.cos(a), -Math.sin(a));
      const N = new THREE.Vector3(0, Math.sin(a), Math.cos(a));
      const pivot = new THREE.Vector3(0, tb, 0);
      const lidMat = new THREE.MeshPhysicalMaterial({ color: '#CDD1D6', metalness: 0.55, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.4 }); // lưng nắp sáng hơn để sticker nổi
      const lid = new THREE.Mesh(new RoundedBoxGeometry(LW * S, Hl * S, tl * S, 4, 2.2 * k * S), lidMat);
      lid.rotation.x = -a;
      lid.position.copy(pivot.clone().addScaledVector(U, Hl / 2).addScaledVector(N, tl / 2).multiplyScalar(S));
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(3.2 * k * S, 3.2 * k * S, LW * 0.86 * S, 24),
        new THREE.MeshStandardMaterial({ color: '#8E939B', metalness: 0.8, roughness: 0.4 }));
      hinge.rotation.z = Math.PI / 2; hinge.position.set(0, (tb + 1) * S, -1.5 * k * S);
      // mặt bàn phím + touchpad trên thân máy (thấy khi nhìn chéo)
      const kc = document.createElement('canvas'); kc.width = 1024; kc.height = 720;
      const kx = kc.getContext('2d')!;
      kx.fillStyle = '#C9CCD1'; kx.fillRect(0, 0, 1024, 720);
      kx.fillStyle = '#1F2226'; kx.fillRect(70, 40, 884, 380);
      kx.fillStyle = '#2C3036';
      for (let row = 0; row < 6; row++) for (let col = 0; col < 14; col++) kx.fillRect(82 + col * 62.5, 52 + row * 61, 54, 52);
      kx.fillStyle = '#BEC2C8'; kx.fillRect(330, 470, 364, 220);
      const deckTex = new THREE.CanvasTexture(kc); deckTex.colorSpace = THREE.SRGBColorSpace;
      const deck = new THREE.Mesh(new THREE.PlaneGeometry(LW * 0.96 * S, D * 0.92 * S), new THREE.MeshStandardMaterial({ map: deckTex, roughness: 0.6, metalness: 0.3 }));
      deck.rotation.x = -Math.PI / 2; deck.rotation.z = Math.PI; deck.position.set(0, (tb + 0.05) * S, (-D / 2 - 4 * k) * S);
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(LW * 0.94 * S, Hl * 0.9 * S), new THREE.MeshPhysicalMaterial({ color: '#0E1013', roughness: 0.15, clearcoat: 1 }));
      screen.rotation.set(-a, Math.PI, 0);
      screen.position.copy(pivot.clone().addScaledVector(U, Hl / 2).addScaledVector(N, -0.05).multiplyScalar(S));
      for (const m of [base, lid, hinge]) { m.castShadow = true; m.receiveShadow = true; }
      lap.add(base, lid, hinge, deck, screen);
      // thân laptop không tính vào khung hình → máy ảnh ôm sát các sticker, laptop làm phông sau
      for (const m of [base, lid, hinge, deck, screen]) m.geometry.boundingBox = new THREE.Box3();
      // sticker trên lưng nắp (hơi xoay như dán tay)
      const rot = -0.14, cs = Math.cos(rot), sn = Math.sin(rot);
      const P0 = pivot.clone().addScaledVector(U, Hl * 0.56).addScaledVector(N, tl + 0.12);
      P0.x = -LW * 0.16;
      lap.add(sticker(W, H, tex, (u, v) => {
        const uu = u * cs - v * sn, vv = u * sn + v * cs;
        return P0.clone().add(new THREE.Vector3(uu, 0, 0)).addScaledVector(U, vv);
      }, 24));
      lap.position.set(-95 * k * S, 0, -125 * k * S);
      lap.rotation.y = 0.62;
      root.add(lap);
    }

    // ---------- bình nước sơn tĩnh điện, sticker quấn cong theo thân ----------
    {
      const bot = new THREE.Group();
      const r = 36 * k, Hb = 228 * k;
      const prof: THREE.Vector2[] = [];
      prof.push(new THREE.Vector2(0, 0));
      for (let i = 0; i <= 8; i++) { const t = (i / 8) * Math.PI / 2; prof.push(new THREE.Vector2(r - 5 * k + Math.sin(t) * 5 * k, 5 * k - Math.cos(t) * 5 * k)); }
      prof.push(new THREE.Vector2(r, Hb - 34 * k));
      for (let i = 1; i <= 10; i++) { const t = i / 10; prof.push(new THREE.Vector2(r - (r - 25 * k) * (t * t * (3 - 2 * t)), Hb - 34 * k + t * 22 * k)); }
      prof.push(new THREE.Vector2(25 * k, Hb - 6 * k), new THREE.Vector2(0, Hb - 6 * k));
      const body = new THREE.Mesh(new THREE.LatheGeometry(prof.map((p) => p.clone().multiplyScalar(S)), 96),
        new THREE.MeshPhysicalMaterial({ color: '#2D4256', roughness: 0.58, metalness: 0.1, clearcoat: 0.35, clearcoatRoughness: 0.55 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(26.5 * k * S, 27 * k * S, 30 * k * S, 64),
        new THREE.MeshPhysicalMaterial({ color: '#C8CCD1', metalness: 0.9, roughness: 0.3 }));
      cap.position.y = (Hb + 9 * k) * S;
      const loop = new THREE.Mesh(new THREE.TorusGeometry(11 * k * S, 2.6 * k * S, 14, 40),
        new THREE.MeshPhysicalMaterial({ color: '#1E1F22', roughness: 0.6 }));
      loop.position.y = (Hb + 25 * k) * S; loop.rotation.y = -0.32;
      for (const m of [body, cap, loop]) { m.castShadow = true; m.receiveShadow = true; }
      bot.add(body, cap, loop);
      const rr = r + 0.15, yc = Hb * 0.47, face = -0.32; // hướng sticker về phía máy ảnh
      bot.add(sticker(W, H, tex, (u, v) => {
        const t = u / rr + face;
        return new THREE.Vector3(Math.sin(t) * rr, yc + v, Math.cos(t) * rr);
      }));
      bot.position.set(118 * k * S, 0, -30 * k * S);
      root.add(bot);
    }

    // ---------- tờ đế kiss-cut: 1 con phẳng + 1 con đang bóc cong góc ----------
    {
      const sh = new THREE.Group();
      const pad = 9;
      const lw = tw * 2 + pad * 3, lh = th + pad * 2, lt = 0.45;
      const cA: [number, number] = [pad + tw / 2, lh / 2], cB: [number, number] = [pad * 2 + tw * 1.5, lh / 2];
      const linerTex = await svgTex(linerSvg(res, lw, lh, [cA, cB]), undefined, Math.min(2048, Math.round(lw * 9)), aniso);
      const white = new THREE.MeshStandardMaterial({ color: '#F3F1EC', roughness: 0.7 });
      const liner = new THREE.Mesh(new THREE.BoxGeometry(lw * S, lt * S, lh * S), [
        white, white, new THREE.MeshPhysicalMaterial({ map: linerTex, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.4 }), white, white, white,
      ]);
      liner.position.y = (lt / 2) * S; liner.castShadow = true; liner.receiveShadow = true;
      sh.add(liner);
      const y0 = lt + 0.1;
      const at = (c: [number, number], u: number, v: number, h: number) =>
        new THREE.Vector3(c[0] - lw / 2 + u, y0 + h, c[1] - lh / 2 - v);
      sh.add(sticker(W, H, tex, (u, v) => at(cA, u, v, 0), 8));
      // con B: bóc từ góc dưới-phải lên, cuộn theo cung tròn
      const d = new THREE.Vector2(0.78, -0.62).normalize();
      const reach = Math.abs(d.x) * tw / 2 + Math.abs(d.y) * th / 2; // điểm xa nhất theo hướng bóc
      const s0 = reach * 0.02, Rc = (reach - s0) / 2.35;
      sh.add(sticker(W, H, tex, (u, v) => {
        const s = u * d.x + v * d.y - s0;
        if (s <= 0) return at(cB, u, v, 0);
        const t = s / Rc;
        const along = s0 + Rc * Math.sin(t), lift = Rc * (1 - Math.cos(t));
        const pu = u - d.x * (s + s0), pv = v - d.y * (s + s0);
        return at(cB, pu + d.x * along, pv + d.y * along, lift);
      }));
      sh.position.set(-5 * k * S, 0, 70 * k * S);
      sh.rotation.y = -0.1;
      root.add(sh);
    }

    return { group: root, view: { az: 0.12, el: 0.46 }, aim: 0.36, zoom: 1.24, blob: 0 };
  };
}
