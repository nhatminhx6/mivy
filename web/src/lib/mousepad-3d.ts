'use client';
// Lót chuột / desk mat 3D: đế cao su đen dày 3–4mm + mặt vải in (vân dệt mịn, hơi bóng), bo góc/tròn đúng đường cắt,
// viền khâu = ống chỉ quấn quanh mép (texture sợi chéo). Đặt trên mặt bàn gỗ (mờ dần ra rìa) + chuột không dây;
// desk mat có thêm bàn phím. Texture = bản "tex" của MousepadSvg (thiết kế của khách).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, svgTex, type Builder } from './mockup3d';

export interface MP3DOpts {
  tex: SVGSVGElement | null; fontCss: string;
  wMm: number; hMm: number; r: number; round: boolean; desk: boolean;
  thick: number; stitch: string | null; dark: boolean; props: boolean;
}

const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; };

// vân vải dệt mịn (bump) — lặp theo mm
let weaveC: HTMLCanvasElement | null = null;
function weaveTex(): THREE.CanvasTexture {
  if (!weaveC) {
    const N = 128, T = 4;
    const c = document.createElement('canvas'); c.width = c.height = N;
    const x = c.getContext('2d')!; const im = x.createImageData(N, N); const r = rng(11);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
      const over = (Math.floor(i / T) + Math.floor(j / T)) % 2 === 0;
      const u = (i % T) / T, v = (j % T) / T;
      const h = over ? Math.sin(Math.PI * v) : Math.sin(Math.PI * u);
      const val = 90 + h * 120 + (r() - 0.5) * 40;
      const k = (j * N + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = val; im.data[k + 3] = 255;
    }
    x.putImageData(im, 0, 0); weaveC = c;
  }
  const t = new THREE.CanvasTexture(weaveC); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// sợi chỉ khâu chéo (màu = color)
function stitchTex(color: string): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 32;
  const x = c.getContext('2d')!;
  const col = new THREE.Color(color);
  const dk = col.clone().multiplyScalar(0.55), lt = col.clone().lerp(new THREE.Color('#ffffff'), 0.25);
  x.fillStyle = `#${dk.getHexString()}`; x.fillRect(0, 0, 64, 32);
  for (let i = -2; i < 10; i++) {
    const g = x.createLinearGradient(i * 8, 0, i * 8 + 10, 32);
    g.addColorStop(0, `#${dk.getHexString()}`); g.addColorStop(0.5, `#${lt.getHexString()}`); g.addColorStop(1, `#${dk.getHexString()}`);
    x.fillStyle = g; x.beginPath(); x.moveTo(i * 8, 0); x.lineTo(i * 8 + 6, 0); x.lineTo(i * 8 + 14, 32); x.lineTo(i * 8 + 8, 32); x.closePath(); x.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// gỗ sồi sáng mặt bàn + mờ dần ra rìa (alpha) để không thành "cái thớt"
function woodTex(): { map: THREE.CanvasTexture; alpha: THREE.CanvasTexture } {
  const N = 1024;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!; const r = rng(5);
  x.fillStyle = '#D8C1A0'; x.fillRect(0, 0, N, N);
  for (let p = 0; p < 6; p++) { x.fillStyle = p % 2 ? 'rgba(255,240,215,0.07)' : 'rgba(120,80,40,0.05)'; x.fillRect(0, (p * N) / 6, N, N / 6 - 2); }
  for (let i = 0; i < 900; i++) {
    const y0 = r() * N, amp = 2 + r() * 6, ph = r() * 6;
    x.strokeStyle = `rgba(${r() < 0.5 ? '120,84,50' : '242,224,196'},${0.04 + r() * 0.08})`; x.lineWidth = 0.5 + r() * 1.2;
    x.beginPath(); for (let u = 0; u <= N; u += 16) { const yy = y0 + Math.sin(u * 0.006 + ph) * amp + Math.sin(u * 0.021 + ph) * amp * 0.3; if (u) x.lineTo(u, yy); else x.moveTo(u, yy); } x.stroke();
  }
  for (let p = 1; p < 6; p++) { x.fillStyle = 'rgba(90,60,34,0.18)'; x.fillRect(0, (p * N) / 6 - 1, N, 1.2); }
  const map = new THREE.CanvasTexture(c); map.colorSpace = THREE.SRGBColorSpace;
  const a = document.createElement('canvas'); a.width = a.height = 256;
  const ax = a.getContext('2d')!; const g = ax.createRadialGradient(128, 128, 40, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(0.7, '#fff'); g.addColorStop(1, '#000');
  ax.fillStyle = g; ax.fillRect(0, 0, 256, 256);
  return { map, alpha: new THREE.CanvasTexture(a) };
}

/** hình cắt (mm, gốc trái-dưới, y lên trên) */
function padShape(W: number, H: number, r: number, round: boolean, inset = 0): THREE.Shape {
  const sh = new THREE.Shape();
  if (round) { sh.absarc(W / 2, H / 2, W / 2 - inset, 0, Math.PI * 2, false); return sh; }
  const x0 = inset, y0 = inset, x1 = W - inset, y1 = H - inset, rr = Math.max(0.5, r - inset);
  sh.moveTo(x0 + rr, y0); sh.lineTo(x1 - rr, y0); sh.absarc(x1 - rr, y0 + rr, rr, -Math.PI / 2, 0, false);
  sh.lineTo(x1, y1 - rr); sh.absarc(x1 - rr, y1 - rr, rr, 0, Math.PI / 2, false);
  sh.lineTo(x0 + rr, y1); sh.absarc(x0 + rr, y1 - rr, rr, Math.PI / 2, Math.PI, false);
  sh.lineTo(x0, y0 + rr); sh.absarc(x0 + rr, y0 + rr, rr, Math.PI, Math.PI * 1.5, false);
  return sh;
}

// chuột không dây: thân thuôn (siêu elip, đầu hẹp), gù cao lệch về sau, mép bo tròn xuống đế; rãnh chia 2 nút + con lăn
function mouse(dark: boolean): THREE.Group {
  const g = new THREE.Group();
  const B = 58, A = 30, HH = 31, N = 2.15; // nửa dài, nửa rộng, cao (mm)
  const halfW = (z: number) => A * (1 - Math.max(0, z / B) * 0.24 + Math.min(0, z / B) * 0.04);
  const hump = (z: number) => HH * Math.max(0.3, 1 - 0.62 * ((z / B + 0.28) ** 2));
  const top = (x: number, z: number) => {
    const a = halfW(z);
    const r = Math.min(1, (Math.abs(x / a) ** N + Math.abs(z / B) ** N) ** (1 / N));
    return 1.6 + hump(z) * Math.pow(Math.max(0, 1 - r ** 2.1), 0.5);
  };
  const SEG = 96, RING = 28;
  const verts: number[] = [], idx: number[] = [];
  verts.push(0, top(0, 0), 0);
  for (let k = 1; k <= RING; k++) {
    const t = Math.min(1, (k / RING) ** 0.8);
    for (let i = 0; i < SEG; i++) {
      const th = (i / SEG) * Math.PI * 2, c = Math.cos(th), sn = Math.sin(th);
      const z = B * Math.sign(sn) * Math.abs(sn) ** (2 / N) * t;
      const x = halfW(z) * Math.sign(c) * Math.abs(c) ** (2 / N) * t;
      verts.push(x, k === RING ? 1.6 : top(x, z), z);
    }
  }
  for (let i = 0; i < SEG; i++) idx.push(0, 1 + ((i + 1) % SEG), 1 + i);
  for (let k = 1; k < RING; k++) for (let i = 0; i < SEG; i++) {
    const a0 = 1 + (k - 1) * SEG + i, a1 = 1 + (k - 1) * SEG + ((i + 1) % SEG), b0 = a0 + SEG, b1 = a1 + SEG;
    idx.push(a0, a1, b1, a0, b1, b0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const shell = new THREE.MeshPhysicalMaterial({ color: dark ? '#E9E9E6' : '#33363C', roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const body = new THREE.Mesh(geo, shell); body.castShadow = true; g.add(body);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.8, 64), new THREE.MeshStandardMaterial({ color: '#16171A', roughness: 0.8 }));
  base.scale.set(A * 0.99, 1, B * 0.99); base.position.y = 0.9; base.castShadow = true; g.add(base);
  const groove = new THREE.MeshStandardMaterial({ color: dark ? '#8E8F8C' : '#111215', roughness: 0.7 });
  const seg = (z0: number, z1: number) => {
    const pts: THREE.Vector3[] = []; for (let k = 0; k <= 20; k++) { const z = z0 + ((z1 - z0) * k) / 20; pts.push(new THREE.Vector3(0, top(0, z) + 0.05, z)); }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.35, 6, false), groove));
  };
  seg(B * 0.97, 33); seg(23, 2);
  const wheel = new THREE.Mesh(new THREE.CylinderGeometry(5, 5, 3.4, 32), new THREE.MeshStandardMaterial({ color: '#202124', roughness: 0.85 }));
  wheel.rotation.z = Math.PI / 2; wheel.position.set(0, top(0, 28) - 2.6, 28); g.add(wheel);
  return g;
}

// bàn phím mỏng: đế nhôm bo + phím rời (instanced)
function keyboard(dark: boolean): THREE.Group {
  const g = new THREE.Group();
  const KW = 352, KD = 122;
  const base = new THREE.Mesh(new RoundedBoxGeometry(KW, 11, KD, 3, 4), new THREE.MeshStandardMaterial({ color: dark ? '#2C2F35' : '#D7D9DD', metalness: 0.55, roughness: 0.38 }));
  base.position.y = 5.5; base.castShadow = true; base.receiveShadow = true; g.add(base);
  const capGeo = new RoundedBoxGeometry(16.4, 5, 16.4, 2, 2.2);
  const capMat = new THREE.MeshPhysicalMaterial({ color: dark ? '#1E2024' : '#F7F7F5', roughness: 0.5, clearcoat: 0.25 });
  const pitch = 19.2;
  const cap = (x: number, z: number, w = 16.4) => { const m = new THREE.Mesh(w === 16.4 ? capGeo : new RoundedBoxGeometry(w, 5, 16.4, 2, 2.2), capMat); m.position.set(x, 12.5, z); m.castShadow = true; g.add(m); };
  const rows = [14, 14, 13, 12];
  rows.forEach((cnt, r) => {
    const z = -KD / 2 + 16 + r * pitch;
    const off = [0, 4, 8, 14][r];
    for (let c = 0; c < cnt; c++) cap(-KW / 2 + 16 + off + c * pitch, z);
  });
  const zb = -KD / 2 + 16 + 4 * pitch;
  [-150, -130, -110, 110, 130, 150].forEach((x) => cap(x, zb));
  const space = new THREE.Mesh(new RoundedBoxGeometry(150, 5, 16.4, 2, 2.2), capMat);
  space.position.set(0, 12.5, -KD / 2 + 16 + 4 * pitch); space.castShadow = true; g.add(space);
  return g;
}

export function mousepadBuilder(o: MP3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong lót chuột');
    const W = o.wMm, H = o.hMm, T = o.thick;
    const px = o.desk ? 2048 : 1400;
    const tex = await svgTex(o.tex, o.fontCss, px, aniso);
    tex.anisotropy = aniso;
    tex.repeat.set(1 / W, 1 / H); // UV mặt extrude = toạ độ mm
    tex.needsUpdate = true;
    const weave = weaveTex(); weave.repeat.set(1 / 1.1, 1 / 1.1); weave.anisotropy = aniso;

    const pad = new THREE.Group();
    const shape = padShape(W, H, o.r, o.round);
    // đế cao su
    const rubberH = T - 0.7;
    const rubber = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: rubberH - 0.5, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.35, bevelSegments: 3, curveSegments: o.round ? 96 : 18 }),
      new THREE.MeshStandardMaterial({ color: '#17181A', roughness: 0.92 }));
    rubber.position.z = 0.25; rubber.castShadow = true; rubber.receiveShadow = true; pad.add(rubber);
    // lớp vải in
    const cap = new THREE.MeshPhysicalMaterial({ map: tex, bumpMap: weave, bumpScale: 0.6, roughness: 0.72, sheen: 0.45, sheenRoughness: 0.55, sheenColor: new THREE.Color('#ffffff') });
    const side = new THREE.MeshStandardMaterial({ color: o.dark ? '#3A3C40' : '#E7E3DC', roughness: 0.9 });
    const fabric = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.7, bevelEnabled: false, curveSegments: o.round ? 96 : 18 }), [cap, side]);
    fabric.position.z = rubberH; fabric.receiveShadow = true; fabric.castShadow = true; pad.add(fabric);
    // viền khâu: ống chỉ ôm mép
    if (o.stitch) {
      const ins = 0.9;
      const pts2 = padShape(W, H, o.r, o.round, ins).getSpacedPoints(o.round ? 360 : Math.round((2 * (W + H)) / 3));
      pts2.pop();
      const curve = new THREE.CatmullRomCurve3(pts2.map((p) => new THREE.Vector3(p.x, p.y, T / 2 + 0.05)), true, 'centripetal');
      const len = curve.getLength();
      const st = stitchTex(o.stitch); st.repeat.set(len / 2.4, 1); st.anisotropy = aniso;
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.min(4000, Math.round(len / 1.2)), T / 2 + 0.45, 10, true),
        new THREE.MeshStandardMaterial({ map: st, roughness: 0.75 }));
      tube.castShadow = true; pad.add(tube);
    }
    // nằm phẳng: z(độ dày) → y; đỉnh thiết kế (y = H) quay ra xa người xem (−z)
    pad.rotation.x = -Math.PI / 2;
    const padWrap = new THREE.Group(); padWrap.add(pad);
    pad.position.set(-W / 2, 0, H / 2);

    const focus = new THREE.Group(); focus.add(padWrap);
    // chuột + (desk mat) bàn phím
    const ms = mouse(o.dark);
    // đồ đặt cạnh (không che thiết kế): chuột bên phải lót; desk mat thêm bàn phím phía sau
    if (o.props && o.desk) {
      const kb = keyboard(o.dark);
      kb.position.set(-W * 0.08, 0, -H / 2 - 61 - 18); kb.rotation.y = 0.03;
      focus.add(kb);
    }
    ms.position.set(W / 2 + 44, 0, o.desk ? -H * 0.05 : H * 0.06); ms.rotation.y = Math.PI + 0.22;
    if (o.props) focus.add(ms);
    focus.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh) m.castShadow = true; });

    // mặt bàn gỗ mờ dần ra rìa
    const fb = new THREE.Box3().setFromObject(focus);
    const fc = fb.getCenter(new THREE.Vector3());
    const ext = Math.max(fb.max.x - fb.min.x, fb.max.z - fb.min.z);
    const deskSize = ext * 2.6;
    const wood = woodTex();
    wood.map.wrapS = wood.map.wrapT = THREE.RepeatWrapping;
    wood.map.repeat.set(deskSize / 700, deskSize / 700); wood.map.anisotropy = aniso;
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(deskSize, deskSize), new THREE.MeshStandardMaterial({ map: wood.map, alphaMap: wood.alpha, transparent: true, roughness: 0.62, depthWrite: false }));
    desk.rotation.x = -Math.PI / 2; desk.position.set(fc.x, 0.05, fc.z); desk.receiveShadow = true; desk.renderOrder = -1;

    const scene = new THREE.Group(); scene.scale.setScalar(S);
    scene.add(desk, focus);
    // khung nhìn bám lót chuột (không bám mặt bàn lớn)
    scene.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(scene), fbox = new THREE.Box3().setFromObject(focus);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rF = fbox.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rF) * (o.desk ? 1.36 : 1.4);
    const aim = Math.max(0, Math.min(1, ((fbox.min.y + fbox.max.y) / 2 - all.min.y) / Math.max(1e-6, all.max.y - all.min.y)));
    return { group: scene, view: o.desk ? { az: 0.16, el: 0.62 } : { az: 0.3, el: 0.66 }, aim, zoom, blob: 0 };
  };
}
