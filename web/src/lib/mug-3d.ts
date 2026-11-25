'use client';
// Ly sứ 3D: thân tiện (LatheGeometry: đế lõm, thành dày, miệng bo tròn, lòng ly), quai chữ C (Tube dẹt),
// dải in quấn đúng chu vi ly (CylinderGeometry hở, UV chạy theo góc → chữ đứng thẳng, đọc xuôi).
// Quai ở +x; dải in bắt đầu ngay sau khe quai → ô A (3W/4) quay ra trước khi quai bên phải người nhìn.
// 2 ly: ly 1 khoe mặt chính, ly 2 khoe mặt còn lại (2 bên/tràn) hoặc nghiêng thấy quai (in 1 bên).
// Ly đổi màu: ly 1 đen (nguội), ly 2 đã hiện hình (nóng, có cà phê).

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import { mugSize, heroSide, type MugKind, type MugMode } from './mug-engine';

export interface Mug3DOpts {
  wrap: SVGSVGElement | null; fontCss: string; size: string; mode: MugMode; kind: MugKind; color: string;
}

const glaze = (color: string, rough = 0.16) => new THREE.MeshPhysicalMaterial({ color, roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 });

function arc(cx: number, cy: number, r: number, a0: number, a1: number, n: number): THREE.Vector2[] {
  return Array.from({ length: n + 1 }, (_, i) => { const a = a0 + ((a1 - a0) * i) / n; return new THREE.Vector2(cx + Math.cos(a) * r, cy + Math.sin(a) * r); });
}

// thân ly: tách 2 phần để tô màu riêng (ngoài thân | miệng + lòng ly)
function bodyProfiles(R: number, H: number, T: number) {
  const outer: THREE.Vector2[] = [
    new THREE.Vector2(0.01, 1.6), new THREE.Vector2(R - 9, 1.6),
    ...arc(R - 7.5, 1.6, 1.5, Math.PI, Math.PI * 1.5, 6),            // gờ đế lõm
    new THREE.Vector2(R - 4, 0.1),
    ...arc(R - 4, 4, 3.9, -Math.PI / 2, 0, 10),                       // bo đáy ngoài
    new THREE.Vector2(R - 0.1, 6), new THREE.Vector2(R, 12), new THREE.Vector2(R, H - T / 2),
  ];
  const inner: THREE.Vector2[] = [
    ...arc(R - T / 2, H - T / 2, T / 2, 0, Math.PI, 14),              // miệng ly bo tròn
    new THREE.Vector2(R - T, H - T / 2 - 2), new THREE.Vector2(R - T, T + 7),
    ...arc(R - T - 5, T + 7, 5, 0, -Math.PI / 2, 10),                  // bo lòng đáy
    new THREE.Vector2(0.01, T + 2),
  ];
  return { outer, inner };
}

function handleGeo(R: number, H: number): THREE.BufferGeometry {
  const y1 = H * 0.79, y2 = H * 0.25;
  const pts = [
    new THREE.Vector3(R - 3, y1, 0), new THREE.Vector3(R + 9, y1 + 1.2, 0), new THREE.Vector3(R + 22, y1 - 3, 0),
    new THREE.Vector3(R + 28, (y1 + y2) / 2 + 2, 0), new THREE.Vector3(R + 23, y2 + 5, 0), new THREE.Vector3(R + 10, y2 - 1.5, 0),
    new THREE.Vector3(R - 3, y2, 0),
  ];
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 96, 4.6, 28, false);
}

function crema(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(128, 128, 10, 128, 128, 128);
  g.addColorStop(0, '#6B4329'); g.addColorStop(0.55, '#5A361F'); g.addColorStop(0.92, '#8A5B37'); g.addColorStop(1, '#A87A4F');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  x.globalAlpha = 0.18;
  for (let i = 0; i < 260; i++) { x.fillStyle = i % 2 ? '#C9A27A' : '#3B2214'; x.beginPath(); x.arc(Math.random() * 256, Math.random() * 256, Math.random() * 3, 0, Math.PI * 2); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  return t;
}

interface OneMug { print: THREE.Texture | null; body: string; inner: string; handle: string; coffee: THREE.Texture | null }
function makeMug(o: OneMug, dia: number, H: number, wMm: number, hMm: number): THREE.Group {
  const R = dia / 2, T = 3.6;
  const g = new THREE.Group();
  const { outer, inner } = bodyProfiles(R, H, T);
  const seg = 160;
  const outerMesh = new THREE.Mesh(new THREE.LatheGeometry(outer, seg), glaze(o.body, o.body === '#141416' ? 0.3 : 0.16));
  const innerMesh = new THREE.Mesh(new THREE.LatheGeometry(inner, seg), glaze(o.inner));
  outerMesh.castShadow = true; innerMesh.castShadow = true;
  g.add(outerMesh, innerMesh);
  // quai (dẹt: rộng theo z, mỏng theo mặt phẳng uốn)
  const hd = new THREE.Mesh(handleGeo(R, H), glaze(o.handle));
  hd.scale.z = 1.5; hd.castShadow = true;
  g.add(hd);
  // dải in quấn quanh thân (chừa khe quai)
  if (o.print) {
    const circ = Math.PI * dia;
    const thetaLen = Math.min(Math.PI * 2 * 0.999, (wMm / circ) * Math.PI * 2);
    const handleTheta = Math.PI / 2;                     // +x
    const start = handleTheta + (Math.PI * 2 - thetaLen) / 2;
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(R + 0.12, R + 0.12, hMm, seg, 1, true, start, thetaLen),
      new THREE.MeshPhysicalMaterial({ map: o.print, roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.05, transparent: true, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
    );
    band.position.y = 6 + (H - 6 - T) / 2 - 0.5;           // giữa phần thân thẳng
    band.renderOrder = 2;
    g.add(band);
  }
  if (o.coffee) {
    const top = new THREE.Mesh(new THREE.CircleGeometry(R - T - 0.2, 64), new THREE.MeshPhysicalMaterial({ map: o.coffee, roughness: 0.25, clearcoat: 0.8 }));
    top.rotation.x = -Math.PI / 2; top.position.y = H - 13;
    g.add(top);
  }
  g.scale.setScalar(S);
  return g;
}

export function mugBuilder(o: Mug3DOpts): Builder {
  return async (aniso) => {
    if (!o.wrap) throw new Error('Chưa dựng xong thiết kế');
    const sz = mugSize(o.size);
    const tex = await svgTex(o.wrap, o.fontCss, 2600, aniso, '#FFFFFF');
    tex.anisotropy = aniso;
    const white = '#FBFBF8';
    const col = o.kind === 'color' ? o.color : white;
    const hero = heroSide(o.mode);
    const single = o.mode === 'rh' || o.mode === 'lh';
    const coffee = crema(aniso);

    const m1 = o.kind === 'magic'
      ? makeMug({ print: null, body: '#141416', inner: white, handle: '#141416', coffee: null }, sz.dia, sz.height, sz.wMm, sz.hMm)
      : makeMug({ print: tex, body: white, inner: col, handle: col, coffee: null }, sz.dia, sz.height, sz.wMm, sz.hMm);
    const m2 = makeMug({ print: tex, body: white, inner: o.kind === 'magic' ? white : col, handle: o.kind === 'magic' ? white : col, coffee }, sz.dia, sz.height, sz.wMm, sz.hMm);

    const R = sz.dia / 2;
    // góc (quanh trục ly) của tâm ô A / B trên dải in — xoay ly sao cho ô cần khoe quay thẳng về camera
    const thetaLen = Math.min(Math.PI * 2 * 0.999, (sz.wMm / (Math.PI * sz.dia)) * Math.PI * 2);
    const start = Math.PI / 2 + (Math.PI * 2 - thetaLen) / 2;
    const thA = start + 0.75 * thetaLen, thB = start + 0.25 * thetaLen;
    const az = hero === 'A' ? 0.1 : -0.1;
    const face = (th: number, off = 0) => az - th + off;
    const thHero = hero === 'A' ? thA : thB, thOther = hero === 'A' ? thB : thA;
    // ly trước: mặt chính; ly sau: mặt còn lại (2 bên/tràn) hoặc mặt chính nghiêng thấy quai (in 1 bên)
    const rFront = face(thHero, hero === 'A' ? 0.04 : -0.04);
    const rBack = single ? face(thHero, hero === 'A' ? -0.9 : 0.9) : face(thOther, hero === 'A' ? -0.04 : 0.04);
    const gapX = R + 20;
    // ly đổi màu: ly hiện hình (nóng, có cà phê) ở trước, ly đen (nguội) ở sau
    const front = o.kind === 'magic' ? m2 : m1, back = o.kind === 'magic' ? m1 : m2;
    front.rotation.y = rFront; back.rotation.y = o.kind === 'magic' ? face(thOther) : rBack;
    // quai 2 ly cùng chĩa ra ngoài (không chồng nhau ở giữa)
    front.position.set((hero === 'A' ? gapX * 0.82 : -gapX * 0.82) * S, 0, 14 * S);
    back.position.set((hero === 'A' ? -gapX - 4 : gapX + 4) * S, 0, -30 * S);

    const grp = new THREE.Group();
    grp.add(m1, m2);
    return { group: grp, view: { az, el: 0.24 }, aim: 0.44, zoom: 1.3, blob: 0.7 };
  };
}
