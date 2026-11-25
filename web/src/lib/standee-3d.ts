'use client';
// Standee 3D: chủ shop thấy standee ĐỨNG thật thế nào — bản cuốn (hộp nhôm + nắp 2 đầu + chân xoay + cột sau + thanh kẹp trên)
// hoặc bản chữ X (2 thanh chéo sau lưng, bạt móc 4 góc). Texture = SVG thiết kế của khách.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, aluminium, darkMetal, rod, svgTex, type Builder } from './mockup3d';

export function standeeBuilder(o: { el: SVGSVGElement | null; wMm: number; hMm: number; fontCss: string; xFrame: boolean }): Builder {
  return async (aniso) => {
    if (!o.el) throw new Error('Chưa dựng xong standee');
    const art = await svgTex(o.el, o.fontCss, Math.round((2600 * o.wMm) / o.hMm), aniso);
    const w = o.wMm * S, h = o.hMm * S;
    const g = new THREE.Group();
    const alu = aluminium(), dark = darkMetal();

    // tấm bạt in: mặt trước = thiết kế, mặt sau xám bạt
    const back = new THREE.MeshStandardMaterial({ color: '#D9D9D6', roughness: 0.9 });
    const front = new THREE.MeshStandardMaterial({ map: art, roughness: 0.62 });
    const banner = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.6 * S), [back, back, back, back, front, back]);
    banner.castShadow = true;

    if (!o.xFrame) {
      // ---- standee cuốn ----
      const feetH = 12 * S, baseH = 80 * S, baseD = 95 * S, baseW = w + 30 * S;
      for (const sx of [-1, 1]) {
        const foot = new THREE.Mesh(new RoundedBoxGeometry(40 * S, feetH, 330 * S, 2, 4 * S), dark);
        foot.position.set(sx * (baseW / 2 - 70 * S), feetH / 2, 0); foot.castShadow = true;
        g.add(foot);
      }
      const base = new THREE.Mesh(new RoundedBoxGeometry(baseW, baseH, baseD, 4, 14 * S), alu);
      base.position.set(0, feetH + baseH / 2, 0); base.castShadow = true;
      g.add(base);
      for (const sx of [-1, 1]) {
        const cap = new THREE.Mesh(new RoundedBoxGeometry(20 * S, baseH + 3 * S, baseD + 3 * S, 3, 8 * S), dark);
        cap.position.set(sx * (baseW / 2 - 6 * S), feetH + baseH / 2, 0);
        g.add(cap);
      }
      const y0 = feetH + baseH - 8 * S; // bạt chui ra từ khe trên hộp
      banner.position.set(0, y0 + h / 2, 6 * S);
      g.add(banner);
      const rail = new THREE.Mesh(new RoundedBoxGeometry(w + 8 * S, 24 * S, 16 * S, 2, 5 * S), alu);
      rail.position.set(0, y0 + h, 6 * S); rail.castShadow = true;
      g.add(rail);
      g.add(rod(new THREE.Vector3(0, feetH + baseH, -28 * S), new THREE.Vector3(0, y0 + h - 14 * S, -4 * S), 9 * S, alu));
    } else {
      // ---- standee chữ X ----
      const lift = 200 * S, top = lift + h, z0 = -15 * S, D = h * 0.42;
      banner.position.set(0, lift + h / 2, 0);
      g.add(banner);
      // 2 thanh dài chéo: góc trên → chân đất phía đối diện, ngả ra sau
      const tl = new THREE.Vector3(-w / 2, top, z0), tr = new THREE.Vector3(w / 2, top, z0);
      const SP = 0.6; // chân chạm đất nhô ra ngoài mép bạt một chút, ngả ra sau
      const fl = new THREE.Vector3(-w * SP, 0, -D), fr = new THREE.Vector3(w * SP, 0, -D);
      g.add(rod(tl, fr, 5 * S, dark), rod(tr, fl, 5 * S, dark));
      // điểm giao 2 thanh (đối xứng → x = 0)
      const t = (w / 2) / (w / 2 + w * SP);
      const hub = tl.clone().lerp(fr, t);
      const bl = new THREE.Vector3(-w / 2, lift, z0), br = new THREE.Vector3(w / 2, lift, z0);
      g.add(rod(bl, hub, 4 * S, dark), rod(br, hub, 4 * S, dark));
      const hubM = new THREE.Mesh(new THREE.SphereGeometry(14 * S, 16, 12), dark); hubM.position.copy(hub); g.add(hubM);
      for (const p of [tl, tr, bl, br]) { // khoen móc 4 góc
        const ring = new THREE.Mesh(new THREE.TorusGeometry(7 * S, 2 * S, 8, 16), alu);
        ring.position.set(p.x * 0.96, p.y + (p.y > lift + 1e-6 ? -10 * S : 10 * S), 0.6 * S);
        g.add(ring);
      }
      for (const f of [fl, fr]) {
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(9 * S, 11 * S, 14 * S, 14), dark);
        cap.position.set(f.x, 7 * S, f.z); g.add(cap);
      }
    }
    // bản chữ X: nhìn chếch hông nhiều hơn để thấy khung X + 2 chân phía sau (như ảnh chụp standee X ngoài thực tế)
    return { group: g, view: o.xFrame ? { az: 0.85, el: 0.1 } : { az: 0.5, el: 0.14 }, aim: 0.5, zoom: 1.05 };
  };
}
