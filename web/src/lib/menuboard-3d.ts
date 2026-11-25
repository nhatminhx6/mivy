'use client';
// Bảng menu treo tường 3D — các tấm treo cạnh nhau trên tường quán, phía trên quầy pha chế.
//  - alu in UV: tấm mỏng bắt 4 ốc pát inox, cách tường 25mm
//  - hộp đèn mica: hộp nhôm sâu 60mm, mặt phát sáng (emissive = chính thiết kế) + quầng sáng hắt tường
//  - khung gỗ + decal: viền gỗ thông 30mm ôm mặt decal
// Tường/quầy không tính vào khung hình (bbox rỗng) → camera ôm theo bảng; swing để không lộ mặt sau tường.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { LatheGeometry } from 'three';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface MBD3DOpts {
  panels: (SVGSVGElement | null)[];
  wMm: number; hMm: number; gapMm: number;
  material: 'alu' | 'lightbox' | 'wood';
  dark: boolean;        // phong cách nền tối (phấn/neon) → tường quán tông ấm tối hơn
  glow: string;         // màu quầng sáng hộp đèn
  fontCss: string;
}

let seedV = 1;
const rnd = () => ((seedV = (seedV * 16807) % 2147483647) / 2147483647);

function plasterTex(aniso: number, base: string): THREE.CanvasTexture {
  seedV = 5;
  const N = 1024; const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 26000; i++) {
    const a = rnd() * 0.07;
    x.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`;
    x.fillRect(rnd() * N, rnd() * N, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function woodTex(aniso: number, base = '#C49A6C', dark = '#9C7146'): THREE.CanvasTexture {
  seedV = 9;
  const W = 512, H = 1024; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, W, H);
  for (let i = 0; i < 70; i++) {
    x.strokeStyle = dark; x.globalAlpha = 0.12 + rnd() * 0.25; x.lineWidth = 1 + rnd() * 3;
    const x0 = rnd() * W;
    x.beginPath(); x.moveTo(x0, 0);
    for (let y = 0; y <= H; y += 64) x.lineTo(x0 + Math.sin(y / 140 + i) * 6 + (rnd() - 0.5) * 3, y);
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function glowTex(color: string, aspect: number): THREE.CanvasTexture {
  const N = 256; const c = document.createElement('canvas'); c.width = N; c.height = Math.max(8, Math.round(N / aspect));
  const x = c.getContext('2d')!;
  const col = new THREE.Color(color);
  const rgb = `${(col.r * 255) | 0},${(col.g * 255) | 0},${(col.b * 255) | 0}`;
  x.save(); x.scale(1, 1 / aspect);
  const g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2);
  g.addColorStop(0, `rgba(${rgb},0.8)`); g.addColorStop(0.4, `rgba(${rgb},0.35)`); g.addColorStop(0.75, `rgba(${rgb},0.08)`); g.addColorStop(1, `rgba(${rgb},0)`);
  x.fillStyle = g; x.fillRect(0, 0, N, N); x.restore();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// nền (tường, quầy, đồ trên quầy) không tính vào khung hình, không bị cull
function noBounds<T extends THREE.Mesh>(m: T): T {
  m.geometry.boundingBox = new THREE.Box3();
  m.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 0);
  m.frustumCulled = false;
  return m;
}

const chrome = () => new THREE.MeshStandardMaterial({ color: '#D7DADF', metalness: 1, roughness: 0.18 });

export function menuboardBuilder(o: MBD3DOpts): Builder {
  return async (aniso) => {
    const els = o.panels.filter(Boolean) as SVGSVGElement[];
    if (!els.length) throw new Error('Chưa dựng xong bảng menu');
    const n = els.length, W = o.wMm, H = o.hMm;
    const px = n <= 2 ? 1800 : 1300;
    const texs = await Promise.all(els.map((el) => svgTex(el, o.fontCss, px, aniso, '')));
    const g = new THREE.Group();

    const lit = o.material === 'lightbox';
    const gap = lit ? 14 : o.material === 'wood' ? o.gapMm + 20 : o.gapMm;
    const fw = o.material === 'wood' ? 34 : lit ? 22 : 0; // viền khung
    const TW = n * (W + fw * 2) + (n - 1) * gap;
    const counterTop = 1000, boardBottom = counterTop + 720;
    const yc = boardBottom + fw + H / 2;
    const depth = lit ? 62 : o.material === 'wood' ? 26 : 4;
    const zOff = lit ? 0 : o.material === 'wood' ? 6 : 26; // cách tường

    // ---- tường ----
    const wallBase = lit ? '#6E665E' : o.dark ? '#CFC4B4' : '#E7DFD3';
    const wt = plasterTex(aniso, wallBase);
    const WW = TW + 9000, WH = yc + H + 4000;
    wt.repeat.set(WW / 2400, WH / 2400);
    const wall = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(WW * S, WH * S), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.95, color: '#FFFFFF' })));
    wall.position.set(0, (WH / 2) * S, 0); wall.receiveShadow = true;
    g.add(wall);

    // ---- các tấm ----
    const faceMat = (tex: THREE.Texture) => lit
      ? new THREE.MeshPhysicalMaterial({ map: tex, color: '#6A6A6A', emissiveMap: tex, emissive: new THREE.Color('#FFF6E6'), emissiveIntensity: 0.95, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.15 })
      : new THREE.MeshPhysicalMaterial({ map: tex, roughness: o.material === 'wood' ? 0.7 : 0.45, clearcoat: o.material === 'alu' ? 0.35 : 0, clearcoatRoughness: 0.3 });
    const frameAl = new THREE.MeshStandardMaterial({ color: '#2B2E33', metalness: 0.7, roughness: 0.35 });
    const wtex = o.material === 'wood' ? woodTex(aniso) : null;
    const woodMat = wtex ? new THREE.MeshStandardMaterial({ map: wtex, roughness: 0.75 }) : null;
    const st = chrome();
    for (let i = 0; i < n; i++) {
      const cx = -TW / 2 + fw + W / 2 + i * (W + fw * 2 + gap);
      const panel = new THREE.Group(); panel.position.set(cx * S, yc * S, 0); g.add(panel);
      if (o.material === 'alu') {
        const slab = new THREE.Mesh(new RoundedBoxGeometry(W * S, H * S, depth * S, 2, 1.5 * S), new THREE.MeshStandardMaterial({ color: '#E9E9EA', metalness: 0.6, roughness: 0.35 }));
        slab.position.z = (zOff + depth / 2) * S; slab.castShadow = true; panel.add(slab);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), faceMat(texs[i]));
        face.position.z = (zOff + depth + 0.3) * S; panel.add(face);
        for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
          const bx = sx * (W / 2 - 18), by = sy * (H / 2 - 18);
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(9 * S, 9 * S, zOff * S, 20), st);
          barrel.rotation.x = Math.PI / 2; barrel.position.set(bx * S, by * S, (zOff / 2) * S); panel.add(barrel);
          const cap = new THREE.Mesh(new LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(11 * S, 0), new THREE.Vector2(11 * S, 3 * S), new THREE.Vector2(9 * S, 7 * S), new THREE.Vector2(0, 8 * S)], 28), st);
          cap.rotation.x = Math.PI / 2; cap.position.set(bx * S, by * S, (zOff + depth + 0.4) * S); cap.castShadow = true; panel.add(cap);
        }
      } else if (lit) {
        const box = new THREE.Mesh(new RoundedBoxGeometry((W + fw * 2) * S, (H + fw * 2) * S, depth * S, 3, 5 * S), frameAl);
        box.position.z = (depth / 2) * S; box.castShadow = true; panel.add(box);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), faceMat(texs[i]));
        face.position.z = (depth + 0.6) * S; panel.add(face);
        for (const [w, h, x, y] of [[W + fw * 2, 10, 0, H / 2 + 5], [W + fw * 2, 10, 0, -H / 2 - 5], [10, H + fw * 2, W / 2 + 5, 0], [10, H + fw * 2, -W / 2 - 5, 0]] as const) {
          const lip = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, 8 * S, 2, 2 * S), frameAl);
          lip.position.set(x * S, y * S, (depth + 2) * S); panel.add(lip);
        }
      } else {
        const back = new THREE.Mesh(new THREE.BoxGeometry((W + fw * 2) * S, (H + fw * 2) * S, 12 * S), new THREE.MeshStandardMaterial({ color: '#4A3A2C', roughness: 0.9 }));
        back.position.z = (zOff + 6) * S; back.castShadow = true; panel.add(back);
        const face = new THREE.Mesh(new THREE.PlaneGeometry(W * S, H * S), faceMat(texs[i]));
        face.position.z = (zOff + 12.4) * S; panel.add(face);
        for (const [w, h, x, y, rot] of [[W + fw * 2, fw, 0, H / 2 + fw / 2, false], [W + fw * 2, fw, 0, -H / 2 - fw / 2, false], [fw, H, W / 2 + fw / 2, 0, true], [fw, H, -W / 2 - fw / 2, 0, true]] as const) {
          const m = woodMat!.clone(); m.map = wtex!.clone(); m.map.needsUpdate = true;
          m.map.repeat.set(rot ? 0.3 : 0.3, rot ? H / 900 : (W + fw * 2) / 900);
          if (!rot) { m.map.rotation = Math.PI / 2; m.map.center.set(0.5, 0.5); }
          const bar = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, depth * S, 2, 4 * S), m);
          bar.position.set(x * S, y * S, (zOff + depth / 2) * S); bar.castShadow = true; panel.add(bar);
        }
      }
    }
    if (lit) {
      const aspect = (TW * 1.5) / (H * 2.6);
      const halo = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(TW * 1.5 * S, H * 2.6 * S), new THREE.MeshBasicMaterial({
        map: glowTex(o.glow, aspect), transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      })));
      halo.position.set(0, yc * S, 1.5 * S); g.add(halo);
    }

    // ---- kệ gỗ gắn tường dưới bảng: lọ hạt cà phê + chồng ly (sát tường → không lấn khung hình) ----
    const shelfY = boardBottom - 300, SW = Math.min(TW * 0.82, 2600), SD = 200;
    const sw = woodTex(aniso, o.dark ? '#6A4E38' : '#B98F63', o.dark ? '#4A3626' : '#8C6640');
    sw.repeat.set(SW / 900, 1);
    const shelf = new THREE.Mesh(new RoundedBoxGeometry(SW * S, 34 * S, SD * S, 2, 4 * S), new THREE.MeshStandardMaterial({ map: sw, roughness: 0.7 }));
    shelf.position.set(0, shelfY * S, (SD / 2) * S); shelf.castShadow = true; shelf.receiveShadow = true; g.add(shelf);
    const bk = new THREE.MeshStandardMaterial({ color: '#2A2C30', metalness: 0.6, roughness: 0.4 });
    for (const sx of [-1, 1]) {
      const br = new THREE.Mesh(new THREE.BoxGeometry(16 * S, 140 * S, (SD - 30) * S), bk);
      br.position.set(sx * SW * 0.36 * S, (shelfY - 87) * S, ((SD - 30) / 2) * S); g.add(br);
    }
    const sTop = shelfY + 17;
    const jarGlass = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.28, roughness: 0.05, clearcoat: 1, depthWrite: false });
    const beans = new THREE.MeshStandardMaterial({ color: '#4A2B1A', roughness: 0.75 });
    const lidM = new THREE.MeshStandardMaterial({ color: '#C9A27A', roughness: 0.6 });
    for (let i = 0; i < 3; i++) {
      const jx = -SW * 0.38 + i * 150, jh = 230 - i * 30;
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(55 * S, 55 * S, jh * S, 32, 1, true), jarGlass);
      jar.position.set(jx * S, (sTop + jh / 2) * S, (SD / 2) * S); g.add(jar);
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(51 * S, 51 * S, jh * 0.68 * S, 28), beans);
      fill.position.set(jx * S, (sTop + jh * 0.34) * S, (SD / 2) * S); fill.castShadow = true; g.add(fill);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(58 * S, 58 * S, 26 * S, 32), lidM);
      lid.position.set(jx * S, (sTop + jh + 13) * S, (SD / 2) * S); lid.castShadow = true; g.add(lid);
    }
    const cupMat = new THREE.MeshPhysicalMaterial({ color: '#FAFAF8', roughness: 0.25, clearcoat: 0.6 });
    const cupPts = [new THREE.Vector2(0, 0), new THREE.Vector2(30 * S, 0), new THREE.Vector2(34 * S, 4 * S), new THREE.Vector2(42 * S, 86 * S), new THREE.Vector2(39 * S, 88 * S), new THREE.Vector2(31 * S, 8 * S), new THREE.Vector2(0, 8 * S)];
    for (let st2 = 0; st2 < 2; st2++) for (let i = 0; i < 3; i++) {
      const cup = new THREE.Mesh(new LatheGeometry(cupPts, 32), cupMat);
      cup.position.set((SW * 0.18 + st2 * 120) * S, (sTop + i * 26) * S, (SD / 2) * S); cup.castShadow = true; g.add(cup);
    }
    const plant = new THREE.Mesh(new THREE.SphereGeometry(80 * S, 20, 14), new THREE.MeshStandardMaterial({ color: '#4E7A46', roughness: 0.8 }));
    plant.scale.set(1, 0.85, 1); plant.position.set(SW * 0.38 * S, (sTop + 150) * S, (SD / 2) * S); plant.castShadow = true; g.add(plant);
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(62 * S, 48 * S, 110 * S, 28), new THREE.MeshStandardMaterial({ color: '#E9E3D8', roughness: 0.5 }));
    pot.position.set(SW * 0.38 * S, (sTop + 55) * S, (SD / 2) * S); pot.castShadow = true; g.add(pot);

    return { group: g, view: { az: 0.22, el: 0.06 }, aim: 0.52, zoom: 1.3, blob: 0, swing: 0.45 };
  };
}
