'use client';
// Bảng chữ A 3D: 2 tấm khung (gỗ / sắt sơn tĩnh điện) bản lề trên đỉnh, xoè chân như đặt thật trước cửa quán,
// mặt in 2 bên = thiết kế của khách (mặt trước + mặt sau), xích giữ chân, lỗ tay cầm khoét trên đầu khung,
// đứng trên mảng gạch lát vỉa hè mờ dần. Texture = SVG thiết kế (render code, không AI).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export type AFFrame = 'oak' | 'walnut' | 'black';

function rnd(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// vân gỗ chạy dọc (canvas) — dùng cho thanh khung
function woodTex(base: string, dark: string, aniso: number, seed: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 1024;
  const x = c.getContext('2d')!;
  x.fillStyle = base; x.fillRect(0, 0, 256, 1024);
  const r = rnd(seed);
  for (let i = 0; i < 70; i++) {
    const gx = r() * 256, amp = 2 + r() * 7, w = 0.6 + r() * 2.2;
    x.strokeStyle = dark; x.globalAlpha = 0.08 + r() * 0.22; x.lineWidth = w;
    x.beginPath();
    for (let y = 0; y <= 1024; y += 16) x.lineTo(gx + Math.sin(y / (60 + r() * 40) + i) * amp, y);
    x.stroke();
  }
  x.globalAlpha = 1;
  const t = canvasTex(c, aniso);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// gạch lát vỉa hè 30×30cm, mạch vữa + hạt bê tông, mờ dần ra mép (alpha tròn)
function paverMats(aniso: number): { mat: THREE.MeshStandardMaterial } {
  const N = 1024;
  const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  const r = rnd(9);
  const tiles = 8, tw = N / tiles;
  for (let i = 0; i < tiles; i++) for (let j = 0; j < tiles; j++) {
    const v = 196 + Math.round((r() - 0.5) * 16);
    x.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
    x.fillRect(i * tw, j * tw, tw, tw);
  }
  const img = x.getImageData(0, 0, N, N);
  for (let k = 0; k < img.data.length; k += 4) {
    const n = (r() - 0.5) * 22;
    img.data[k] += n; img.data[k + 1] += n; img.data[k + 2] += n;
  }
  x.putImageData(img, 0, 0);
  x.strokeStyle = 'rgba(90,84,76,0.55)'; x.lineWidth = 5;
  for (let i = 0; i <= tiles; i++) {
    x.beginPath(); x.moveTo(i * tw, 0); x.lineTo(i * tw, N); x.stroke();
    x.beginPath(); x.moveTo(0, i * tw); x.lineTo(N, i * tw); x.stroke();
  }
  const map = canvasTex(c, aniso);
  const a = document.createElement('canvas'); a.width = a.height = 256;
  const ax = a.getContext('2d')!;
  const g = ax.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, '#fff'); g.addColorStop(0.55, '#ddd'); g.addColorStop(1, '#000');
  ax.fillStyle = g; ax.fillRect(0, 0, 256, 256);
  const alpha = new THREE.CanvasTexture(a);
  return { mat: new THREE.MeshStandardMaterial({ map, alphaMap: alpha, transparent: true, roughness: 0.96, depthWrite: false }) };
}

function roundedRectShape(w: number, h: number, r: number, cx = 0, cy = 0, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  const x = cx - w / 2, y = cy - h / 2;
  path.moveTo(x + r, y);
  path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r);
  path.lineTo(x + w, y + h - r); path.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y);
  return path;
}

export interface AFrame3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; wMm: number; hMm: number; fontCss: string;
  frame: AFFrame; gloss: boolean;
}

export function aframeBuilder(o: AFrame3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong bảng');
    const px = Math.round(Math.min(1500, 2900 * (o.wMm / o.hMm)));
    const [tf, tb] = await Promise.all([svgTex(o.front, o.fontCss, px, aniso), svgTex(o.back, o.fontCss, px, aniso)]);

    // ---- kích thước (mm) ----
    const w = o.wMm, h = o.hMm;
    const fw = o.frame === 'black' ? 26 : 34;   // bề rộng thanh khung
    const ft = o.frame === 'black' ? 20 : 26;   // độ dày khung
    const hh = Math.max(110, h * 0.11);         // đầu khung (có lỗ tay cầm)
    const leg = 70;                              // chân dưới thanh ngang
    const PW = w + 2 * fw;
    const L = leg + fw + h + hh;                 // chiều dài 1 tấm
    const a = THREE.MathUtils.degToRad(12.5);    // nửa góc xoè

    // ---- vật liệu ----
    let frameMat: THREE.Material, frameMatV: THREE.Material;
    if (o.frame === 'black') {
      frameMat = frameMatV = new THREE.MeshPhysicalMaterial({ color: '#1E1F22', metalness: 0.35, roughness: 0.48, clearcoat: 0.25, clearcoatRoughness: 0.5 });
    } else {
      const [base, dark] = o.frame === 'oak' ? ['#C99A62', '#6E4521'] : ['#5A3A22', '#1F120A'];
      const tv = woodTex(base, dark, aniso, 5); tv.repeat.set(1, 1.6);
      const th = woodTex(base, dark, aniso, 8); th.rotation = Math.PI / 2; th.center.set(0.5, 0.5); th.repeat.set(1, 0.9);
      frameMatV = new THREE.MeshStandardMaterial({ map: tv, roughness: 0.62 });
      frameMat = new THREE.MeshStandardMaterial({ map: th, roughness: 0.62 });
    }
    const faceMat = (t: THREE.Texture) => o.gloss
      ? new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.38, clearcoat: 0.55, clearcoatRoughness: 0.25 })
      : new THREE.MeshStandardMaterial({ map: t, roughness: 0.86 });
    const ply = new THREE.MeshStandardMaterial({ color: '#B8A58A', roughness: 0.9 });
    const metal = new THREE.MeshStandardMaterial({ color: '#B8BCC2', metalness: 0.9, roughness: 0.3 });
    const rubber = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.8 });

    // 1 tấm: gốc ở chân giữa, mặt in hướng +z
    const panel = (tex: THREE.Texture): THREE.Group => {
      const g = new THREE.Group();
      const rr = Math.min(4, fw * 0.15);
      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(fw * S, L * S, ft * S, 3, rr * S), frameMatV);
        rail.position.set((sx * (PW / 2 - fw / 2)) * S, (L / 2) * S, 0);
        rail.castShadow = true; g.add(rail);
        const cap = new THREE.Mesh(new RoundedBoxGeometry((fw + 2) * S, 12 * S, (ft + 2) * S, 2, 3 * S), rubber);
        cap.position.set((sx * (PW / 2 - fw / 2)) * S, 5 * S, 0); g.add(cap);
      }
      const bottom = new THREE.Mesh(new RoundedBoxGeometry((PW - 2 * fw + 2) * S, fw * S, ft * S, 3, rr * S), frameMat);
      bottom.position.set(0, (leg + fw / 2) * S, 0); bottom.castShadow = true; g.add(bottom);
      // đầu khung có lỗ tay cầm (đùn từ hình có lỗ)
      const hw = PW - 2 * fw + 2;
      const sh = roundedRectShape(hw, hh, 2) as THREE.Shape;
      const slotW = Math.min(150, hw * 0.34), slotH = Math.min(38, hh * 0.34);
      sh.holes.push(roundedRectShape(slotW, slotH, slotH / 2, 0, hh * 0.08, new THREE.Path()) as THREE.Path);
      const hg = new THREE.ExtrudeGeometry(sh, { depth: ft - 2, bevelEnabled: true, bevelThickness: 1, bevelSize: 1, bevelSegments: 2, curveSegments: 16 });
      hg.translate(0, 0, -(ft - 2) / 2);
      hg.scale(S, S, S);
      // UV đùn mặc định theo mm → kéo về 0..1 cho vân gỗ
      const uv = hg.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) / hw, uv.getY(i) / hh);
      const head = new THREE.Mesh(hg, frameMat);
      head.position.set(0, (leg + fw + h + hh / 2) * S, 0);
      head.castShadow = true; g.add(head);
      // bảng in lọt lòng khung, lùi vào 5mm so với mặt khung
      const bt = 5;
      const board = new THREE.Mesh(new THREE.BoxGeometry((w + 4) * S, (h + 4) * S, bt * S), [ply, ply, ply, ply, faceMat(tex), ply]);
      board.position.set(0, (leg + fw + h / 2) * S, (ft / 2 - 5 - bt / 2) * S);
      board.castShadow = true; board.receiveShadow = true; g.add(board);
      // ốc móc xích bên trong 2 thanh đứng
      for (const sx of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.TorusGeometry(5 * S, 1.4 * S, 8, 16), metal);
        eye.rotation.y = Math.PI / 2;
        eye.position.set((sx * (PW / 2 - fw / 2)) * S, (L * 0.24) * S, (-ft / 2 - 5) * S);
        g.add(eye);
      }
      return g;
    };

    const out = new THREE.Group();
    const place = (tex: THREE.Texture, yaw: number) => {
      const yawG = new THREE.Group(); yawG.rotation.y = yaw;
      const pivot = new THREE.Group(); pivot.position.y = L * Math.cos(a) * S; pivot.rotation.x = -a;
      const p = panel(tex); p.position.set(0, -L * S, (ft / 2) * S);
      pivot.add(p); yawG.add(pivot); out.add(yawG);
    };
    place(tf, 0);
    place(tb, Math.PI);

    // bản lề đỉnh
    const topY = L * Math.cos(a) + (ft / 2) * Math.sin(a);
    for (const sx of [-1, 1]) {
      const hinge = new THREE.Mesh(new THREE.CylinderGeometry(7 * S, 7 * S, 70 * S, 16), metal);
      hinge.rotation.z = Math.PI / 2;
      hinge.position.set(sx * (PW / 2 - fw - 50) * S, (topY - 4) * S, 0);
      hinge.castShadow = true; out.add(hinge);
    }

    // xích giữ chân: nối 2 ốc móc, võng nhẹ
    const ys = L * 0.24;
    const zf = (L - ys) * Math.sin(a) - 5 * Math.cos(a), yy = ys * Math.cos(a);
    for (const sx of [-1, 1]) {
      const xx = sx * (PW / 2 - fw / 2);
      const p0 = new THREE.Vector3(xx, yy, zf), p1 = new THREE.Vector3(xx, yy, -zf);
      const mid = p0.clone().lerp(p1, 0.5); mid.y -= Math.max(18, zf * 0.12);
      const curve = new THREE.QuadraticBezierCurve3(p0, mid, p1);
      const n = Math.max(8, Math.round(curve.getLength() / 11));
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const pt = curve.getPoint(t), tg = curve.getTangent(t);
        const link = new THREE.Mesh(new THREE.TorusGeometry(5.2 * S, 1.2 * S, 6, 14), metal);
        link.scale.set(1, 0.62, 1);
        link.position.copy(pt.multiplyScalar(S));
        link.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tg.normalize());
        link.rotateX(i % 2 ? Math.PI / 2 : 0);
        link.castShadow = true; out.add(link);
      }
    }

    // mảng gạch vỉa hè dưới chân (mờ dần) — nhận bóng
    const R = Math.max(L * 0.78, PW * 1.1);
    const { mat } = paverMats(aniso);
    (mat.map as THREE.Texture).wrapS = (mat.map as THREE.Texture).wrapT = THREE.RepeatWrapping;
    (mat.map as THREE.Texture).repeat.set((R * 2) / 2400, (R * 2) / 2400);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(R * 2 * S, R * 2 * S), mat);
    ground.rotation.x = -Math.PI / 2; ground.position.y = 0.3 * S; ground.receiveShadow = true;
    out.add(ground);

    return { group: out, view: { az: 0.6, el: 0.14 }, aim: 0.47, zoom: 2.05, blob: 0.45 };
  };
}
