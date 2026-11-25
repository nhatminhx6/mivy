'use client';
// Quạt nhựa PP cầm tay 3D: tấm PP mỏng 0.6mm cắt đúng đường bế (texture 2 mặt có alpha = hình quạt), hơi cong nhẹ như
// quạt thật, mép nhựa trắng mờ. Tay cầm liền (cùng tấm) hoặc que tre tán 2 đinh sau lưng.
// Cảnh: 1 quạt cắm trong ly sứ (mặt trước), 1 quạt nằm ngửa mặt sau (thông tin + QR), 1 quạt nằm nghiêng mặt trước.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface Fan3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; // mỗi mặt đúng khung thành phẩm, ngoài đường cắt trong suốt
  d: string; W: number; H: number; cx: number;             // đường cắt (mm, y xuống)
  handle: 'integrated' | 'stick';
  stickY0: number;                                           // que bắt đầu từ y này (mm, từ trên xuống)
  fontCss: string;
  cup: string;                                               // màu ly sứ
}

const T = 0.6;         // dày tấm PP (mm)
const STICK_BELOW = 100; // que lòi dưới mép quạt (mm)

function outlineLoops(d: string): THREE.Vector2[][] {
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${d}"/></svg>`);
  const loops: THREE.Vector2[][] = [];
  for (const p of data.paths) for (const sh of SVGLoader.createShapes(p)) {
    const e = sh.extractPoints(28);
    loops.push(e.shape, ...e.holes);
  }
  return loops;
}

// bóng tiếp xúc mềm theo đúng hình quạt (vẽ path lên canvas, làm mờ bằng shadowBlur)
function shadowTex(d: string, W: number, H: number, blurMm: number, padMm: number): THREE.CanvasTexture {
  const k = 3;
  const c = document.createElement('canvas');
  c.width = Math.ceil((W + padMm * 2) * k); c.height = Math.ceil((H + padMm * 2) * k);
  const x = c.getContext('2d')!;
  const off = c.width * 2;
  x.save();
  x.shadowColor = '#FFFFFF'; x.shadowBlur = blurMm * k; x.shadowOffsetX = off;
  x.translate(-off + padMm * k, padMm * k); x.scale(k, k);
  x.fillStyle = '#FFFFFF'; x.fill(new Path2D(d), 'evenodd');
  x.restore();
  return new THREE.CanvasTexture(c);
}

function woodTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512;
  const x = c.getContext('2d')!;
  x.fillStyle = '#D9B47A'; x.fillRect(0, 0, 64, 512);
  let s = 11; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 70; i++) {
    const px = r() * 64, v = Math.round(150 + r() * 60);
    x.strokeStyle = `rgba(${v - 40},${v - 70},${v - 120},${0.12 + r() * 0.2})`;
    x.lineWidth = 0.6 + r() * 1.6;
    x.beginPath(); x.moveTo(px, 0);
    for (let y = 0; y <= 512; y += 32) x.lineTo(px + Math.sin(y * 0.02 + i) * 1.5, y);
    x.stroke();
  }
  for (let i = 0; i < 6; i++) { // mắt tre
    const y = 40 + i * 86 + r() * 20;
    x.fillStyle = 'rgba(120,80,40,0.25)'; x.fillRect(0, y, 64, 3);
  }
  return canvasTex(c, aniso);
}

export function fanBuilder(o: Fan3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong quạt');
    const { W, H, cx } = o;
    const outW = Math.round(2048 * Math.min(1, W / H));
    const [tf, tb] = await Promise.all([svgTex(o.front, o.fontCss, outW, aniso, ''), svgTex(o.back, o.fontCss, outW, aniso, '')]);
    const loops = outlineLoops(o.d);
    const wood = o.handle === 'stick' ? woodTex(aniso) : null;
    const sTex = shadowTex(o.d, W, H, 3, 8);

    const faceMat = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, alphaTest: 0.5, roughness: 0.46, clearcoat: 0.35, clearcoatRoughness: 0.4, side: THREE.FrontSide });
    const matF = faceMat(tf), matB = faceMat(tb);
    const rimMat = new THREE.MeshPhysicalMaterial({ color: '#F1F2EF', roughness: 0.5, transmission: 0.2, thickness: 0.5, side: THREE.DoubleSide });
    const rivetMat = new THREE.MeshStandardMaterial({ color: '#D8DCE0', metalness: 1, roughness: 0.25 });

    // 1 cái quạt: gốc toạ độ = giữa đáy đường cắt, Y lên, mặt trước nhìn +Z. sag = độ cong 2 mép (mm, + là cong ra trước)
    const makeFan = (sag: number): THREE.Group => {
      const bend = (X: number) => sag * (X / (W / 2)) ** 2;
      const g = new THREE.Group();
      const sx = 56, sy = Math.max(8, Math.round((sx * H) / W));
      const mk = (back: boolean) => {
        const pos: number[] = [], uv: number[] = [], idx: number[] = [];
        for (let j = 0; j <= sy; j++) for (let i = 0; i <= sx; i++) {
          const xm = (i / sx) * W, ym = (j / sy) * H, X = xm - cx, Y = H - ym;
          pos.push(X * S, Y * S, (bend(X) - (back ? T : 0)) * S);
          uv.push(back ? 1 - xm / W : xm / W, 1 - ym / H);
        }
        for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
          const a = j * (sx + 1) + i, b = a + 1, c = a + sx + 1, d = c + 1;
          if (back) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        geo.setIndex(idx); geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, back ? matB : matF);
        m.castShadow = true; m.receiveShadow = true;
        return m;
      };
      g.add(mk(false), mk(true));
      // mép nhựa
      for (const loop of loops) {
        const pos: number[] = [], idx: number[] = [];
        loop.forEach((v) => { const X = v.x - cx, Y = H - v.y, z = bend(X); pos.push(X * S, Y * S, z * S, X * S, Y * S, (z - T) * S); });
        const n = loop.length;
        for (let k = 0; k < n; k++) { const a = k * 2, b = ((k + 1) % n) * 2; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx); geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, rimMat));
      }
      // que tre + 2 đinh tán
      if (o.handle === 'stick' && wood) {
        const top = H - o.stickY0, bot = -STICK_BELOW, len = top - bot;
        const st = new THREE.Mesh(new RoundedBoxGeometry(12 * S, len * S, 3.2 * S, 3, 1.4 * S), new THREE.MeshStandardMaterial({ map: wood, roughness: 0.62 }));
        st.position.set(0, ((top + bot) / 2) * S, (bend(0) - T - 1.6) * S);
        st.castShadow = true; st.receiveShadow = true;
        g.add(st);
        for (const ry of [top - 12, 18]) {
          for (const [z, dir] of [[bend(0) + 0.05, 1], [bend(0) - T - 3.2 - 0.05, -1]] as const) {
            const h = new THREE.Mesh(new THREE.SphereGeometry(3 * S, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), rivetMat);
            h.scale.set(1, 0.35, 1);
            h.rotation.x = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
            h.position.set(0, ry * S, z * S);
            g.add(h);
          }
        }
      }
      return g;
    };

    const scene = new THREE.Group();
    const bottomY = o.handle === 'stick' ? -STICK_BELOW : 0; // điểm thấp nhất của quạt (local Y)

    // ly sứ cắm quạt
    const prof = [[0, 0], [30, 0], [33.5, 1.5], [35, 6], [37.5, 50], [39.5, 92], [40, 94], [37.6, 94], [37.1, 92], [35.1, 50], [32.8, 9], [0, 9]].map(([r, y]) => new THREE.Vector2(r * S, y * S));
    const cupMesh = new THREE.Mesh(new THREE.LatheGeometry(prof, 72), new THREE.MeshPhysicalMaterial({ color: o.cup, roughness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.1, side: THREE.DoubleSide }));
    cupMesh.castShadow = true; cupMesh.receiveShadow = true;
    const cupX = 0, cupZ = -H * 0.42;
    cupMesh.position.set(cupX * S, 0, cupZ * S);
    scene.add(cupMesh);
    const stand = makeFan(3.5);
    stand.position.set(cupX * S, (10 - bottomY) * S, cupZ * S);
    stand.rotation.set(-0.07, 0.12, 0.05);
    scene.add(stand);
    const placed: THREE.Box3[] = [new THREE.Box3().setFromObject(cupMesh).expandByScalar(8 * S)];

    // quạt nằm: wrap xoay quanh trục đứng, inner lật nằm (ngửa mặt trước / mặt sau); đụng vật đã đặt thì đẩy dần ra
    const lay = (face: 'front' | 'back', x0: number, z0: number, yaw: number, push: [number, number]) => {
      const fan = makeFan(face === 'front' ? 1.6 : -1.6);
      fan.traverse((n) => { (n as THREE.Mesh).castShadow = false; }); // nằm sát đất: chỉ dùng bóng tiếp xúc mềm (tránh sọc bóng trên tấm mỏng)
      // nằm ngửa: đầu quạt hướng ra xa, cán quay về phía người xem (chữ đọc xuôi); mặt sau = lật 180° quanh trục dọc rồi nằm
      fan.rotation.set(-Math.PI / 2, face === 'front' ? 0 : Math.PI, 0);
      const wrap = new THREE.Group(); wrap.add(fan); wrap.rotation.y = yaw;
      wrap.updateMatrixWorld(true);
      const lift = -new THREE.Box3().setFromObject(wrap).min.y + 0.05 * S;
      let x = x0, z = z0;
      for (let it = 0; it < 80; it++) {
        wrap.position.set(x * S, lift, z * S); wrap.updateMatrixWorld(true);
        const bb = new THREE.Box3().setFromObject(wrap);
        if (!placed.some((p) => p.intersectsBox(bb))) { placed.push(bb.clone().expandByScalar(4 * S)); break; }
        x += push[0]; z += push[1];
      }
      // bóng tiếp xúc dưới quạt nằm
      const pad = 8;
      const sh = new THREE.Mesh(new THREE.PlaneGeometry((W + pad * 2) * S, (H + pad * 2) * S),
        new THREE.MeshBasicMaterial({ color: '#000000', alphaMap: sTex, transparent: true, opacity: 0.3, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2;
      // tâm khung đường cắt (local) = (0, H/2) trước khi lật → sau lật: mặt trước ngửa: Y→-Z; mặt sau ngửa: Y→+Z
      const off = new THREE.Vector3(0, 0, (-H / 2) * S).applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
      sh.position.set(x * S + off.x + 0.9 * S, 0.02 * S, z * S + off.z + 1.4 * S);
      sh.rotation.z = yaw;
      sh.renderOrder = 1;
      scene.add(sh, wrap);
    };
    lay('front', W * 0.52, H * 0.62, -0.26, [6, 4]);
    lay('back', -W * 0.56, H * 0.7, 0.3, [-6, 4]);

    return { group: scene, view: { az: 0.12, el: 0.6 }, aim: 0.3, zoom: 1.55, blob: 0 };
  };
}
