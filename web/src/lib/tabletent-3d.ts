'use client';
// Tent card 3D trên mặt bàn gỗ quán: chữ A gấp (2 mặt nghiêng 16°, giấy dày 0.4mm, nếp gấp tròn ở đỉnh, đế nằm sát bàn),
// lăng trụ tam giác 3 mặt đứng (nắp tam giác 2 đầu), hoặc kệ mica chữ V cài 2 thẻ. Texture = đúng file mặt in (SVG).
// Chữ A có thêm 1 thẻ thứ 2 phía sau xoay ngược → thấy luôn mặt sau.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { TTKind } from './tabletent-engine';

const PT = 0.42;          // giấy C300 ~ 0.4mm
const TILT = THREE.MathUtils.degToRad(16);

function woodTex(aniso: number, base: string, dark: string, seed = 3): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 1024, 512);
  let s = seed; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 180; i++) {
    const y0 = r() * 512, amp = 2 + r() * 9, ph = r() * 6, fr = 0.004 + r() * 0.006;
    x.strokeStyle = dark; x.globalAlpha = 0.05 + r() * 0.15; x.lineWidth = 0.6 + r() * 2.2;
    x.beginPath();
    for (let px = 0; px <= 1024; px += 16) { const y = y0 + Math.sin(px * fr + ph) * amp + Math.sin(px * fr * 3.1 + ph) * amp * 0.25; if (px) x.lineTo(px, y); else x.moveTo(px, y); }
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

function softShadow(w: number, d: number, alpha: number): THREE.Mesh {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  x.filter = 'blur(16px)'; x.fillStyle = `rgba(40,22,8,${alpha})`; x.fillRect(40, 40, 176, 176);
  const t = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

// giấy in: mặt có hình hơi bóng (cán mờ), mép + mặt trong là giấy trắng ngà
const paperEdge = () => new THREE.MeshStandardMaterial({ color: '#F1EEE7', roughness: 0.85 });
const printMat = (t: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.5 });

/** tấm giấy W×H dày PT, gốc = mép dưới giữa; tex+z = mặt +z, tex-z = mặt -z */
function sheet(w: number, h: number, front: THREE.Material, back: THREE.Material): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, PT);
  geo.translate(0, h / 2, 0);
  const e = paperEdge();
  const m = new THREE.Mesh(geo, [e, e, e, e, front, back]);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// chữ A: 2 mặt nghiêng, nếp tròn ở đỉnh, đế nằm sát bàn nối 2 chân
function tentA(w: number, h: number, tf: THREE.Material, tb: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const inside = paperEdge();
  const zb = h * Math.sin(TILT), yt = h * Math.cos(TILT);
  const f = sheet(w, h, tf, inside); f.position.z = zb; f.rotation.x = -TILT; g.add(f);
  const b = sheet(w, h, inside, tb); b.position.z = -zb; b.rotation.x = TILT; g.add(b);
  const crease = new THREE.Mesh(new THREE.CylinderGeometry(PT * 0.9, PT * 0.9, w, 12), paperEdge());
  crease.rotation.z = Math.PI / 2; crease.position.y = yt - PT * 0.2; g.add(crease);
  const base = new THREE.Mesh(new THREE.BoxGeometry(w, PT, zb * 2), paperEdge());
  base.position.y = PT / 2; base.receiveShadow = true; g.add(base);
  const sh = softShadow(w * 1.35 + 14, zb * 2 * 1.5 + 18, 0.5); sh.position.set(3, 0.05, -2); g.add(sh);
  return g;
}

// lăng trụ 3 mặt đứng: mặt i quay theo góc 120°·i, nắp tam giác trên
function prism(w: number, h: number, mats: THREE.Material[], capColor: string): THREE.Group {
  const g = new THREE.Group();
  const r = w / (2 * Math.sqrt(3));
  const inside = paperEdge();
  mats.forEach((m, i) => {
    const a = -Math.PI / 3 + (i * Math.PI * 2) / 3; // mặt 1 trước-trái, mặt 2 trước-phải, mặt 3 phía sau
    const s = sheet(w, h, m, inside);
    s.position.set(Math.sin(a) * r, 0, Math.cos(a) * r); s.rotation.y = a;
    g.add(s);
  });
  const R = w / Math.sqrt(3);
  const tri = new THREE.Shape();
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI * 2) / 3; const x = Math.sin(a) * R, z = Math.cos(a) * R; if (i) tri.lineTo(x, z); else tri.moveTo(x, z); }
  tri.closePath();
  const capGeo = new THREE.ShapeGeometry(tri);
  const cap = new THREE.Mesh(capGeo, new THREE.MeshStandardMaterial({ color: capColor, roughness: 0.6, side: THREE.DoubleSide }));
  cap.rotation.x = Math.PI / 2; cap.position.y = h - 0.3; cap.castShadow = true;
  g.add(cap);
  const sh = softShadow(w * 1.5 + 16, w * 1.4 + 16, 0.5); sh.position.set(4, 0.05, -3); g.add(sh);
  return g;
}

// kệ mica chữ V: 2 tấm mica 3mm nghiêng, uốn cong ở đỉnh; thẻ in nằm sát trong mỗi tấm
function acrylicMats(): THREE.Material[] {
  const face = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.16, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, ior: 1.49, specularIntensity: 1, envMapIntensity: 1.6, depthWrite: false });
  const edge = new THREE.MeshPhysicalMaterial({ color: '#E2F3F0', transparent: true, opacity: 0.88, roughness: 0.05, clearcoat: 1, emissive: '#CFEDE8', emissiveIntensity: 0.35, envMapIntensity: 1.4 });
  return [edge, edge, edge, edge, face, face];
}
function vHolder(w: number, h: number, tf: THREE.Material, tb: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const T = 3, M = 5, PW = w + M * 2, PH = h + M * 2;
  const ang = THREE.MathUtils.degToRad(19);
  const acr = acrylicMats();
  const zb = PH * Math.sin(ang), yt = PH * Math.cos(ang);
  const plate = (sign: 1 | -1) => {
    const geo = new RoundedBoxGeometry(PW, PH, T, 3, 1.2); geo.translate(0, PH / 2, 0);
    const m = new THREE.Mesh(geo, acr[4]); m.renderOrder = 3;
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(PW - 1, PH - 1, T)), new THREE.LineBasicMaterial({ color: '#BFE3DC', transparent: true, opacity: 0.55 }));
    edges.position.y = PH / 2; m.add(edges);
    m.position.z = sign * zb; m.rotation.x = -sign * ang;
    return m;
  };
  g.add(plate(1), plate(-1));
  // nếp uốn mica ở đỉnh (nửa ống)
  const bend = new THREE.Mesh(new THREE.CylinderGeometry(T * 0.9, T * 0.9, PW, 20, 1, true, 0, Math.PI), acr[0]);
  bend.rotation.z = Math.PI / 2; bend.rotation.y = 0; bend.position.y = yt - T * 0.3; bend.renderOrder = 3;
  g.add(bend);
  // thẻ in sát mặt trong mỗi tấm
  const card = (mat: THREE.Material, sign: 1 | -1) => {
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(0, h / 2 + M, 0);
    const m = new THREE.Mesh(geo, mat); m.renderOrder = 1; m.castShadow = true;
    m.position.z = sign * (zb - T * 0.55 / Math.cos(ang)); m.rotation.x = -sign * ang;
    if (sign < 0) m.rotation.y = Math.PI;
    return m;
  };
  g.add(card(tf, 1), card(tb, -1));
  const sh = softShadow(PW * 1.3 + 14, zb * 2 * 1.5 + 20, 0.42); sh.position.set(3, 0.05, -2); g.add(sh);
  // gờ đế 2 chân (mép mica chạm bàn) cho cảm giác đứng
  return g;
}

export interface TT3DOpts { faces2?: (SVGSVGElement | null)[]; faces: (SVGSVGElement | null)[]; wMm: number; hMm: number; kind: TTKind; fontCss: string; capColor: string }

export function tabletentBuilder(o: TT3DOpts): Builder {
  return async (aniso) => {
    const els = o.faces.filter(Boolean) as SVGSVGElement[];
    if (els.length < 2) throw new Error('Chưa dựng xong mặt thẻ');
    const w = o.wMm, h = o.hMm;
    const px = Math.min(2048, Math.max(1100, Math.round(Math.max(w, h) * 9)));
    const texs = await Promise.all(els.map((e) => svgTex(e, o.fontCss, px, aniso)));
    texs.forEach((t) => { t.anisotropy = aniso; });
    const mats = texs.map(printMat);
    const els2 = (o.faces2 || []).filter(Boolean) as SVGSVGElement[];
    const mats2 = els2.length >= 2 ? (await Promise.all(els2.map((e) => svgTex(e, o.fontCss, px, aniso)))).map(printMat) : mats;

    const stand = new THREE.Group();
    let depth: number;
    if (o.kind === 'tri') {
      stand.add(prism(w, h, [mats[0], mats[1], mats[2] || mats[0]], o.capColor));
      depth = w;
    } else if (o.kind === 'v') {
      stand.add(vHolder(w, h, mats[0], mats[1]));
      depth = h * 0.75;
    } else {
      const main = tentA(w, h, mats[0], mats[1]);
      stand.add(main);
      // thẻ thứ 2 phía sau-trái, xoay ngược → thấy mặt sau
      const second = tentA(w, h, mats2[0], mats2[1]);
      second.rotation.y = Math.PI + 0.55;
      second.position.set(-(w * 0.95 + 38), 0, -(h * 0.62 + 30));
      stand.add(second);
      depth = h * 0.6;
    }

    const sb0 = new THREE.Box3().setFromObject(stand);
    const sh = sb0.max.y - sb0.min.y;
    const sw = sb0.max.x - sb0.min.x;
    const TW = Math.max(sw * 6, 1500), TD = Math.max(sw * 3.2, depth * 8, 1200), TH = 18;
    const top = woodTex(aniso, '#A06E45', '#3E2210', 7);
    top.repeat.set(TW / 520, TD / 300);
    const table = new THREE.Mesh(new RoundedBoxGeometry(TW, TH, TD, 4, 3), new THREE.MeshPhysicalMaterial({ map: top, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35, color: '#FFFFFF' }));
    table.position.y = TH / 2; table.receiveShadow = true;
    stand.position.set(o.kind === 'a' ? (w * 0.95 + 38) * 0.35 : 0, TH, depth * 0.2);

    const sb = new THREE.Box3().setFromObject(stand);
    const shadow = softShadow((sb.max.x - sb.min.x) * 1.25 + 20, (sb.max.z - sb.min.z) * 1.3 + 20, 0.22);
    shadow.position.set((sb.min.x + sb.max.x) / 2 + 5, TH + 0.2, (sb.min.z + sb.max.z) / 2 - 6);

    const g = new THREE.Group();
    const mm = new THREE.Group(); mm.scale.setScalar(S); mm.add(table, shadow, stand);
    g.add(mm);
    const bb = new THREE.Box3().setFromObject(g);
    const R = bb.getBoundingSphere(new THREE.Sphere()).radius / S;
    // khung hình bám cụm thẻ (bàn tràn ra ngoài): chiều cao nhìn thấy ≈ 1.7× thẻ (chữ A 2 thẻ: theo bề ngang cụm)
    const sx = sb.max.x - sb.min.x;
    const wide = o.kind === 'a' ? Math.max(sh * 1.2, sx * 0.52) : Math.max(sh * 1.14, sx * 0.8);
    const zoom = (2.26 * R) / (wide * 1.75);
    const aim = (TH + sh * 0.45) / ((bb.max.y - bb.min.y) / S);
    const view = o.kind === 'tri' ? { az: 0.12, el: 0.2 } : o.kind === 'v' ? { az: -0.5, el: 0.2 } : { az: -0.38, el: 0.2 };
    return { group: g, view, aim, zoom, blob: 0 };
  };
}
