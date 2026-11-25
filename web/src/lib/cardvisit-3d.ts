'use client';
// Card visit 3D: 1 chồng card (mặt trước lên trên, dày giấy thật ~0.38mm/tấm, xếp hơi lệch như thật)
// + 1 tấm để rời lật MẶT SAU → khách thấy cả 2 mặt, độ dày, cảm giác cầm trên tay. Texture = SVG thiết kế của khách.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';

export function cardVisitBuilder(o: { front: SVGSVGElement | null; back: SVGSVGElement | null; wMm: number; hMm: number; fontCss: string }): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong card');
    const [ft, bt] = await Promise.all([svgTex(o.front, o.fontCss, 1400, aniso), svgTex(o.back, o.fontCss, 1400, aniso)]);
    const w = o.wMm * S, h = o.hMm * S, t = 0.38 * S;

    const edge = new THREE.MeshStandardMaterial({ color: '#F2F0EB', roughness: 0.9 });
    // giấy C300 cán mờ: hơi có ánh khi nghiêng
    const face = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.55, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    const fMat = face(ft), bMat = face(bt);
    const geo = new THREE.BoxGeometry(w, t, h);
    // thứ tự vật liệu BoxGeometry: +x, -x, +y (mặt trên), -y (mặt dưới), +z, -z
    const card = (top: THREE.Material, bottom: THREE.Material) => {
      const m = new THREE.Mesh(geo, [edge, edge, top, bottom, edge, edge]);
      m.castShadow = true;
      return m;
    };

    const g = new THREE.Group();
    let seed = 11;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
    const n = 9;
    for (let i = 0; i < n; i++) {
      const c = card(fMat, bMat);
      c.position.set(-w * 0.55 + rnd() * 0.6 * S, t * (i + 0.5), rnd() * 0.6 * S);
      c.rotation.y = 0.05 + rnd() * 0.012;
      g.add(c);
    }
    const loose = card(bMat, fMat);
    loose.position.set(w * 0.56, t * 0.5, h * 0.12);
    loose.rotation.y = -0.16;
    g.add(loose);

    return { group: g, view: { az: 0.18, el: 0.74 }, aim: 0.3, zoom: 1.5, blob: 0 };
  };
}
