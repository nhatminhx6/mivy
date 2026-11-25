'use client';
// Catalogue đóng ghim · 3D: 1 cuốn MỞ nằm trên bàn khoe cặp trang đang chọn (2 trang cong nhẹ, trũng vào gáy, ghim kẽm
// ở gáy, mép xấp giấy dày theo số trang) + 1 cuốn GẬP KÍN nằm chéo bên cạnh khoe bìa trước. Texture = SVG của khách.

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';

const LEAF = 0.16; // couche 150gsm ≈ 0.13mm, cộng độ phồng xếp → 0.16mm/tờ

/** nửa cuốn đang mở (dir = +1 phải, -1 trái): mặt trên cong + 3 mép xấp giấy */
function half(dir: 1 | -1, pw: number, ph: number, stack: number, tex: THREE.Texture, edgeMat: THREE.Material): THREE.Group {
  const cols = 56, rows = 18;
  const bow = Math.min(7, pw * 0.03); // độ phồng giữa trang (mm)
  // chiều cao mặt trên theo khoảng cách tới gáy d (mm): trũng ở gáy, vồng lên rồi thoải ra mép
  const yAt = (d: number) => 0.35 + stack * (1 - Math.exp(-d / 7)) + bow * Math.sin(Math.PI * Math.min(1, d / pw)) ** 0.9 * (1 - 0.25 * (d / pw)) * (1 - Math.exp(-d / 10));
  const xAt = (d: number) => dir * d;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  for (let j = 0; j <= rows; j++) {
    const vv = j / rows, z = -ph / 2 + vv * ph;
    // mép trên/dưới trang hơi cong vồng hơn giữa (giấy không phẳng tuyệt đối)
    const edgeLift = 0.5 * Math.abs(vv - 0.5) ** 2 * 4 * 0.6;
    for (let i = 0; i <= cols; i++) {
      const t = i / cols, d = pw * (t ** 1.35); // dày lưới gần gáy
      pos.push(xAt(d) * S, (yAt(d) + edgeLift * Math.min(1, d / 20)) * S, z * S);
      uv.push(0.5 + dir * (d / pw) * 0.5, 1 - vv);
    }
  }
  const C = cols + 1;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * C + i, b = a + 1, c = a + C, d = c + 1;
    if (dir === 1) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const top = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.5, clearcoat: 0.22, clearcoatRoughness: 0.4 }));
  top.castShadow = true; top.receiveShadow = true;
  const grp = new THREE.Group(); grp.add(top);

  // mép xấp giấy: tường từ mặt bàn (y=0) lên mặt trên, ở mép ngoài + mép trên + mép dưới
  const wall = (pts: [number, number, number][]) => { // pts: (x, ytop, z) dọc theo mép
    const p: number[] = [], id: number[] = [];
    pts.forEach(([x, yt, z]) => { p.push(x * S, 0, z * S, x * S, yt * S, z * S); });
    for (let i = 0; i < pts.length - 1; i++) { const a = i * 2; id.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); geo.setIndex(id); geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, edgeMat); m.castShadow = true;
    return m;
  };
  const N = 40;
  const along = (z: number) => Array.from({ length: N + 1 }, (_, i) => { const d = pw * (i / N); return [xAt(d), yAt(d), z] as [number, number, number]; });
  grp.add(wall(along(-ph / 2)), wall(along(ph / 2)));
  grp.add(wall(Array.from({ length: 9 }, (_, i) => [xAt(pw), yAt(pw), -ph / 2 + (ph * i) / 8] as [number, number, number])));
  return grp;
}

export function bookletBuilder(o: { spread: SVGSVGElement | null; cover: SVGSVGElement | null; wMm: number; hMm: number; pages: number; fontCss: string }): Builder {
  return async (aniso) => {
    if (!o.spread || !o.cover) throw new Error('Chưa dựng xong catalogue');
    const [spT, cvT] = await Promise.all([svgTex(o.spread, o.fontCss, 3600, aniso), svgTex(o.cover, o.fontCss, 1800, aniso)]);
    const pw = o.wMm, ph = o.hMm;
    const leaves = o.pages / 2;
    const stack = (leaves / 2) * LEAF + 0.25;
    const edgeMat = new THREE.MeshStandardMaterial({ color: '#F1EEE7', roughness: 0.92, side: THREE.DoubleSide });
    const g = new THREE.Group();

    // 1) cuốn mở
    const open = new THREE.Group();
    open.add(half(1, pw, ph, stack, spT, edgeMat), half(-1, pw, ph, stack, spT, edgeMat));
    // ghim kẽm ở gáy (2 ghim, chân ghim nằm dọc gáy)
    const wire = new THREE.MeshStandardMaterial({ color: '#C9CDD3', metalness: 1, roughness: 0.28 });
    const len = Math.min(16, ph * 0.07);
    for (const zz of [-ph * 0.27, ph * 0.27]) {
      const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.32 * S, len * S, 4, 8), wire);
      st.rotation.x = Math.PI / 2; st.position.set(0, 0.62 * S, zz * S); st.castShadow = true;
      open.add(st);
    }
    // bóng tối trũng gáy (dải mờ) cho cảm giác sâu
    const shade = new THREE.Mesh(new THREE.PlaneGeometry(9 * S, ph * S), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.1, depthWrite: false }));
    shade.rotation.x = -Math.PI / 2; shade.position.y = 0.5 * S;
    open.add(shade);
    g.add(open);

    // 2) cuốn gập kín khoe bìa (gáy bên trái)
    const T2 = leaves * LEAF + 0.3;
    const closed = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(pw * S, T2 * S, ph * S), edgeMat);
    body.position.y = (T2 / 2) * S; body.castShadow = true; body.receiveShadow = true;
    const topG = new THREE.PlaneGeometry(pw * S, ph * S); topG.rotateX(-Math.PI / 2);
    const cover = new THREE.Mesh(topG, new THREE.MeshPhysicalMaterial({ map: cvT, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }));
    cover.position.y = (T2 + 0.02) * S;
    const spine = new THREE.Mesh(new THREE.CylinderGeometry((T2 / 2) * S, (T2 / 2) * S, ph * S, 14, 1, false, Math.PI, Math.PI), edgeMat);
    spine.rotation.x = Math.PI / 2; spine.position.set((-pw / 2) * S, (T2 / 2) * S, 0);
    closed.add(body, cover, spine);
    const land = pw > ph;
    // đặt cạnh phải, KHÔNG chồng lên cuốn mở (tính theo bao của hình chữ nhật đã xoay)
    const rot = -0.22;
    const halfX = (pw / 2) * Math.cos(-rot) + (ph / 2) * Math.sin(-rot);
    if (land) {
      // khổ ngang: cuốn gập nằm phía trước-phải (khung hình gọn hơn đặt cạnh)
      const halfZ = (ph / 2) * Math.cos(-rot) + (pw / 2) * Math.sin(-rot);
      closed.position.set(pw * 0.5 * S, 0, (ph / 2 + halfZ + 12) * S);
    } else closed.position.set((pw + halfX + 14) * S, 0, ph * 0.12 * S);
    closed.rotation.y = rot;
    g.add(closed);

    return { group: g, view: { az: 0.16, el: 0.86 }, aim: 0.3, zoom: land ? 1.35 : 1.5, blob: 0 };
  };
}
