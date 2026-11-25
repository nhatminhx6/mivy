'use client';
// Postcard 3D: bưu thiếp giấy dày (~0.4mm, hơi cong như giấy thật) nằm trên bàn — 1 xấp mặt trước + 1 tấm lật MẶT SAU
// (chữ viết tay mẫu + tem + dấu bưu điện) đè lên 1 phong bì kraft. Bộ bưu thiếp: 4 tấm khác cảnh xoè quạt + 1 tấm lật sau.

import * as THREE from 'three';
import { S, svgTex, canvasTex, type Builder } from './mockup3d';

export interface Postcard3DOpts {
  fronts: (SVGSVGElement | null)[];
  back: SVGSVGElement | null;
  wMm: number; hMm: number; fontCss: string;
  /** giấy mỹ thuật (kraft/sần) → nhám hơn */
  matte?: boolean;
}

// giấy kraft cho phong bì: nền nâu + xơ giấy
function kraftCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#C49A6C'; x.fillRect(0, 0, 512, 512);
  let s = 7; const r = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  for (let i = 0; i < 2600; i++) {
    x.strokeStyle = r() > 0.5 ? 'rgba(120,80,40,0.18)' : 'rgba(240,210,170,0.18)';
    x.lineWidth = 0.6 + r();
    const px = r() * 512, py = r() * 512, a = r() * Math.PI, l = 4 + r() * 14;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return c;
}

export function postcardBuilder(o: Postcard3DOpts): Builder {
  return async (aniso) => {
    const fronts = o.fronts.filter(Boolean) as SVGSVGElement[];
    if (!fronts.length || !o.back) throw new Error('Chưa dựng xong bưu thiếp');
    const set = fronts.length > 1;
    const px = 1500;
    const [bt, ...fts] = await Promise.all([svgTex(o.back, o.fontCss, px, aniso), ...fronts.map((f) => svgTex(f, o.fontCss, px, aniso))]);
    const w = o.wMm * S, h = o.hMm * S, t = 0.42 * S;

    const edge = new THREE.MeshStandardMaterial({ color: '#F3F0EA', roughness: 0.92 });
    const face = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: o.matte ? 0.82 : 0.5, clearcoat: o.matte ? 0 : 0.3, clearcoatRoughness: 0.45 });
    const fMats = fts.map(face), bMat = face(bt);

    // tấm giấy hơi cong (2 mép dài vểnh nhẹ) — BoxGeometry chia đoạn theo bề rộng rồi uốn
    const geo = new THREE.BoxGeometry(w, t, h, 24, 1, 6);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const lift = 0.55 * S;
    for (let i = 0; i < pos.count; i++) {
      const nx = pos.getX(i) / (w / 2), nz = pos.getZ(i) / (h / 2);
      pos.setY(i, pos.getY(i) + lift * (nx * nx * 0.8 + nz * nz * 0.2));
    }
    geo.computeVertexNormals();
    // thứ tự vật liệu BoxGeometry: +x, -x, +y (mặt trên), -y (mặt dưới), +z, -z
    const card = (top: THREE.Material, bottom: THREE.Material) => {
      const m = new THREE.Mesh(geo, [edge, edge, top, bottom, edge, edge]);
      m.castShadow = true;
      return m;
    };

    const g = new THREE.Group();
    let seed = 17;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 - 0.5; };
    const layer = 1.05 * S; // mỗi lớp cách nhau ~1mm (giấy cong không xuyên nhau)
    const span = Math.max(w, h);

    // phong bì kraft nằm dưới cùng
    const kraft = canvasTex(kraftCanvas(), aniso);
    kraft.wrapS = kraft.wrapT = THREE.RepeatWrapping;
    const envW = w * 1.12, envH = h * 1.14;
    const envMat = new THREE.MeshStandardMaterial({ map: kraft, roughness: 0.9 });
    const env = new THREE.Mesh(new THREE.BoxGeometry(envW, 0.8 * S, envH), envMat);
    env.receiveShadow = true; env.castShadow = true;
    const flapShape = new THREE.Shape();
    flapShape.moveTo(-envW / 2, 0); flapShape.lineTo(envW / 2, 0); flapShape.lineTo(0, envH * 0.46); flapShape.closePath();
    const flap = new THREE.Mesh(new THREE.ShapeGeometry(flapShape), new THREE.MeshStandardMaterial({ map: kraft, color: '#D9B48A', roughness: 0.88, side: THREE.DoubleSide }));
    flap.rotation.x = -Math.PI / 2;
    flap.position.set(0, 0.42 * S, -envH / 2 + 0.2 * S);
    flap.scale.set(1, -1, 1);
    flap.receiveShadow = true;
    const envG = new THREE.Group(); envG.add(env, flap);
    // đường viền mép dán phong bì (vạch mảnh tối)
    const seamMat = new THREE.MeshBasicMaterial({ color: '#9A7448' });
    for (const sx of [-1, 1]) {
      const seam = new THREE.Mesh(new THREE.PlaneGeometry(envW * 0.62, 0.35 * S), seamMat);
      seam.rotation.x = -Math.PI / 2;
      seam.rotation.z = sx * 0.62;
      seam.position.set(sx * envW * 0.24, 0.41 * S, envH * 0.18);
      envG.add(seam);
    }

    if (!set) {
      envG.position.set(-w * 0.4, 0.4 * S, -h * 0.24);
      envG.rotation.y = 0.32;
      g.add(envG);
      const base = 0.9 * S;
      // xấp 4 tấm mặt trước, lệch nhẹ
      for (let i = 0; i < 4; i++) {
        const c = card(fMats[0], bMat);
        c.position.set(-w * 0.32 + rnd() * 1.2 * S, base + layer * i + t / 2, -h * 0.06 + rnd() * 1.2 * S);
        c.rotation.y = 0.12 + rnd() * 0.04;
        g.add(c);
      }
      // 1 tấm lật mặt sau, đè chéo góc phải
      const loose = card(bMat, fMats[0]);
      loose.position.set(w * 0.6, base + layer * 4.6 + t / 2, h * 0.36);
      loose.rotation.y = -0.16;
      g.add(loose);
      return { group: g, view: { az: 0.12, el: 0.98 }, aim: 0.3, zoom: 1.55, blob: 0 };
    }

    // bộ bưu thiếp: xoè quạt quanh góc dưới-trái + 1 tấm lật mặt sau + phong bì
    envG.position.set(span * 0.42, 0.4 * S, -span * 0.18);
    envG.rotation.y = -0.28;
    g.add(envG);
    const n = Math.min(4, fMats.length);
    const pivot = new THREE.Vector3(-w * 0.55, 0, h * 0.38);
    for (let i = 0; i < n; i++) {
      const a = 0.62 - (i / Math.max(1, n - 1)) * 0.9;
      const c = card(fMats[i], bMat);
      // xoay quanh pivot: tâm card cách pivot (w/2, -h/2) theo hệ card
      const off = new THREE.Vector3(w / 2, 0, -h / 2).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      c.position.set(pivot.x + off.x, 0.9 * S + layer * (i + 1) + t / 2, pivot.z + off.z);
      c.rotation.y = a;
      g.add(c);
    }
    const loose = card(bMat, fMats[0]);
    loose.position.set(span * 0.66, 0.9 * S + layer * (n + 1.6) + t / 2, span * 0.2);
    loose.rotation.y = -0.14;
    g.add(loose);
    return { group: g, view: { az: 0.1, el: 1.0 }, aim: 0.3, zoom: 1.4, blob: 0 };
  };
}
