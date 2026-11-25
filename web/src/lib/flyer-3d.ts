'use client';
// Tờ rơi 3D: 1 xấp tờ rơi thật (giấy couche ~0.14mm/tờ, xếp hơi lệch) + 1 tờ để rời nằm trên mặt bàn, góc hơi cong lên
// như giấy thật (lưới nhiều đỉnh, uốn mềm). In 2 mặt → thêm 1 tờ lật MẶT SAU nằm dưới. Texture = SVG thiết kế của khách.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';

// tờ giấy mềm: mặt phẳng nhiều đỉnh, nâng 1 góc theo đường cong bậc 2 (mép cong đều, không gãy)
function curledSheet(w: number, h: number, top: THREE.Material, under: THREE.Material, curl: { cx: number; cz: number; amp: number; from: number }) {
  const geo = new THREE.PlaneGeometry(w, h, 56, 72);
  geo.rotateX(-Math.PI / 2); // nằm ngang, mặt in hướng lên; đầu trang (v=1) quay vào trong (-z)
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const t = ((x / (w / 2)) * curl.cx + (z / (h / 2)) * curl.cz) / (Math.abs(curl.cx) + Math.abs(curl.cz)); // -1..1 theo hướng góc cong
    const k = Math.max(0, t - curl.from) / (1 - curl.from);
    const sag = 0.2 * S * (1 - Math.cos((x / w) * Math.PI * 2)) * 0.5; // gợn rất nhẹ, giấy không phẳng tuyệt đối
    pos.setY(i, curl.amp * k * k + sag);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const a = new THREE.Mesh(geo, top); a.castShadow = true;
  const bm = new THREE.Mesh(geo, under); // mặt dưới (thấy khi góc cong lên)
  g.add(a, bm);
  return g;
}

export function flyerBuilder(o: { front: SVGSVGElement | null; back: SVGSVGElement | null; wMm: number; hMm: number; fontCss: string }): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong tờ rơi');
    const res = 1800;
    const [ft, bt] = await Promise.all([svgTex(o.front, o.fontCss, res, aniso), o.back ? svgTex(o.back, o.fontCss, res, aniso) : Promise.resolve(null)]);
    const w = o.wMm * S, h = o.hMm * S, t = 0.14 * S;

    // couche 150gsm: hơi bóng, bắt sáng nhẹ khi nghiêng
    const face = (map: THREE.Texture, side: THREE.Side = THREE.FrontSide) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3, side });
    const fMat = face(ft);
    const bMat = bt ? face(bt) : null;
    const blank = new THREE.MeshStandardMaterial({ color: '#F6F5F1', roughness: 0.8 });
    const blankUnder = new THREE.MeshStandardMaterial({ color: '#F1EFEA', roughness: 0.8, side: THREE.BackSide });
    const edge = new THREE.MeshStandardMaterial({ color: '#F3F1EC', roughness: 0.95 });

    const g = new THREE.Group();
    let seed = 7;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };

    // xấp tờ rơi (mặt trước lên trên)
    const stack = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, t, h);
    const n = 48;
    for (let i = 0; i < n; i++) {
      const top = i === n - 1 ? fMat : blank;
      const m = new THREE.Mesh(geo, [edge, edge, top, blank, edge, edge]); // +x −x +y −y +z −z
      m.position.set(rnd() * 0.9 * S, t * (i + 0.5), rnd() * 0.9 * S);
      m.rotation.y = rnd() * 0.012;
      m.castShadow = true;
      stack.add(m);
    }
    const two = !!bMat;
    stack.position.set(-w * 0.56, 0, -h * 0.02);
    stack.rotation.y = 0.07;
    g.add(stack);

    // tờ lật mặt sau (in 2 mặt) — nằm dưới tờ rời mặt trước
    if (two && bMat) {
      const bs = curledSheet(w, h, bMat, blankUnder, { cx: -1, cz: -1, amp: 0, from: 0.6 });
      bs.position.set(w * 0.78, 0.05 * S, -h * 0.14);
      bs.rotation.y = 0.16;
      g.add(bs);
    }
    // tờ rời mặt trước, góc gần người xem cong lên
    const fs = curledSheet(w, h, fMat, blankUnder, { cx: 1, cz: 1, amp: h * 0.11, from: 0.38 });
    fs.position.set(w * (two ? 0.5 : 0.6), (two ? 0.6 : 0.05) * S, h * (two ? 0.1 : 0.06));
    fs.rotation.y = -0.13;
    g.add(fs);

    return { group: g, view: { az: 0.1, el: 0.84 }, aim: 0.3, zoom: 1.55, blob: 0 };
  };
}
