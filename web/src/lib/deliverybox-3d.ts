'use client';
// Thùng giao hàng 3D: thùng composite bo cạnh (thân + nắp, khe nắp, khoá cài, dải phản quang) gắn trên baga sau
// của 1 đuôi xe máy cách điệu (yên, ốp đuôi, đèn hậu, bánh sau, pô) — decal 4 mặt dán đúng vị trí, bóng vinyl.
// Phần đầu xe (yên, ốp phía trước) loại khỏi khung ngắm → camera ôm sát thùng.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, rod, svgTex, type Builder } from './mockup3d';

export interface DB3DOpts {
  W: number; D: number; H: number; lid: number;
  faces: { back: SVGSVGElement | null; left: SVGSVGElement | null; right: SVGSVGElement | null; top: SVGSVGElement | null };
  dims: { back: { w: number; h: number }; side: { w: number; h: number }; top: { w: number; h: number } };
  boxColor: string; scooter: boolean; fontCss: string;
}

// loại khỏi khung ngắm (Box3 rỗng) nhưng vẫn vẽ (tắt frustum culling)
const noBounds = (m: THREE.Mesh) => { m.geometry.computeBoundingSphere(); m.geometry.boundingBox = new THREE.Box3(); m.frustumCulled = false; return m; };

function lum(hex: string) {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// vân composite nhám rất nhẹ (bump) cho thân thùng
function grainTex(): THREE.CanvasTexture {
  const N = 256; const c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9000; i++) { const a = rnd() * 0.25; x.fillStyle = rnd() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`; x.fillRect(rnd() * N, rnd() * N, 1.5, 1.5); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3);
  return t;
}

// dải phản quang: vạch chéo bạc
function reflectTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 512; c.height = 32;
  const x = c.getContext('2d')!;
  x.fillStyle = '#D9DDE2'; x.fillRect(0, 0, 512, 32);
  x.fillStyle = '#B6BCC4';
  for (let i = -2; i < 40; i++) { x.beginPath(); x.moveTo(i * 16, 32); x.lineTo(i * 16 + 8, 0); x.lineTo(i * 16 + 14, 0); x.lineTo(i * 16 + 6, 32); x.fill(); }
  const t = canvasTex(c, aniso); t.wrapS = THREE.RepeatWrapping;
  return t;
}

export function deliveryBoxBuilder(o: DB3DOpts): Builder {
  return async (aniso) => {
    const { W, D, H, lid } = o;
    const g = new THREE.Group();
    const base = o.scooter ? 800 : 0; // đáy thùng (mm) — trên baga xe hoặc dưới đất
    const bodyH = H - lid;
    const light = lum(o.boxColor) > 150;

    // ---------- thùng ----------
    const shell = new THREE.MeshPhysicalMaterial({
      color: o.boxColor, roughness: 0.5, clearcoat: 0.35, clearcoatRoughness: 0.35, bumpMap: grainTex(), bumpScale: 0.25,
    });
    const body = new THREE.Mesh(new RoundedBoxGeometry(W * S, bodyH * S, D * S, 4, 18 * S), shell);
    body.position.y = (base + bodyH / 2) * S; body.castShadow = true; body.receiveShadow = true;
    g.add(body);
    const lidM = new THREE.Mesh(new RoundedBoxGeometry((W + 8) * S, lid * S, (D + 8) * S, 4, 16 * S), shell);
    lidM.position.y = (base + bodyH + 2 + lid / 2) * S; lidM.castShadow = true; lidM.receiveShadow = true;
    g.add(lidM);
    // khe nắp tối
    const gap = new THREE.Mesh(new THREE.BoxGeometry((W - 6) * S, 4 * S, (D - 6) * S), new THREE.MeshStandardMaterial({ color: '#0D0D0E', roughness: 0.9 }));
    gap.position.y = (base + bodyH + 1) * S; g.add(gap);
    // gân viền nắp (gờ nhô nhẹ ở mép dưới nắp)
    const lip = new THREE.Mesh(new RoundedBoxGeometry((W + 12) * S, 10 * S, (D + 12) * S, 3, 5 * S),
      new THREE.MeshPhysicalMaterial({ color: new THREE.Color(o.boxColor).multiplyScalar(light ? 0.85 : 0.75), roughness: 0.5, clearcoat: 0.3 }));
    lip.position.y = (base + bodyH + 7) * S; g.add(lip);

    // ---------- decal ----------
    const decal = async (el: SVGSVGElement | null, w: number, h: number) => {
      if (!el) return null;
      const tex = await svgTex(el, o.fontCss, Math.min(2048, Math.round(w * 4)), aniso, '');
      const m = new THREE.MeshPhysicalMaterial({
        map: tex, transparent: true, alphaTest: 0.5, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.12,
        polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3,
      });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w * S, h * S), m);
      mesh.receiveShadow = true;
      return mesh;
    };
    const midY = (base + bodyH / 2 + 5) * S; // decal thân hơi cao hơn tâm (chừa dải phản quang dưới)
    const [dBack, dL, dR, dTop] = await Promise.all([
      decal(o.faces.back, o.dims.back.w, o.dims.back.h),
      decal(o.faces.left, o.dims.side.w, o.dims.side.h),
      decal(o.faces.right, o.dims.side.w, o.dims.side.h),
      decal(o.faces.top, o.dims.top.w, o.dims.top.h),
    ]);
    const eps = 0.6 * S;
    if (dBack) { dBack.position.set(0, midY, D / 2 * S + eps); g.add(dBack); }
    if (dR) { dR.rotation.y = Math.PI / 2; dR.position.set(W / 2 * S + eps, midY, 0); g.add(dR); }
    if (dL) { dL.rotation.y = -Math.PI / 2; dL.position.set(-W / 2 * S - eps, midY, 0); g.add(dL); }
    if (dTop) { dTop.rotation.x = -Math.PI / 2; dTop.position.set(0, (base + bodyH + 2 + lid) * S + eps, 0); g.add(dTop); }

    // dải phản quang: mặt sau + 2 hông, sát đáy
    const refl = new THREE.MeshPhysicalMaterial({ map: reflectTex(aniso), metalness: 0.55, roughness: 0.22, clearcoat: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const stripY = (base + 14) * S;
    const sb = new THREE.Mesh(new THREE.PlaneGeometry((W - 60) * S, 14 * S), refl); sb.position.set(0, stripY, D / 2 * S + eps); g.add(sb);
    for (const sx of [1, -1]) {
      const st = new THREE.Mesh(new THREE.PlaneGeometry((D - 60) * S, 14 * S), refl);
      st.rotation.y = sx * Math.PI / 2; st.position.set(sx * (W / 2 * S + eps), stripY, 0); g.add(st);
    }

    // khoá cài 2 hông (ngay dưới nắp, phía trước) + bản lề sau
    const metal = new THREE.MeshStandardMaterial({ color: '#C3C8CF', metalness: 0.9, roughness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1A1B1E', roughness: 0.55 });
    for (const sx of [1, -1]) {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(6 * S, 46 * S, 34 * S, 2, 2 * S), dark);
      plate.position.set(sx * (W / 2 + 4) * S, (base + bodyH - 6) * S, (-D / 2 + 60) * S); g.add(plate);
      const clasp = new THREE.Mesh(new RoundedBoxGeometry(5 * S, 30 * S, 22 * S, 2, 2 * S), metal);
      clasp.position.set(sx * (W / 2 + 8) * S, (base + bodyH + 4) * S, (-D / 2 + 60) * S); g.add(clasp);
    }

    // ---------- đuôi xe máy cách điệu ----------
    if (o.scooter) {
      const paint = new THREE.MeshPhysicalMaterial({ color: '#2B2F36', roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08 });
      const rubber = new THREE.MeshStandardMaterial({ color: '#161618', roughness: 0.92 });
      const chrome = new THREE.MeshStandardMaterial({ color: '#D6DAE0', metalness: 1, roughness: 0.18 });
      const seatM = new THREE.MeshPhysicalMaterial({ color: '#1C1B1D', roughness: 0.62, sheen: 0.4, sheenRoughness: 0.6 });

      // baga: 2 thanh ray dưới đáy thùng + chân ngắn bắt xuống ốp đuôi
      for (const sx of [1, -1]) {
        const rail = new THREE.Mesh(new RoundedBoxGeometry(26 * S, 18 * S, (D - 30) * S, 2, 6 * S), dark);
        rail.position.set(sx * (W / 2 - 50) * S, (base - 9) * S, 0); rail.castShadow = true; g.add(rail);
        for (const z of [-120, 110]) g.add(rod(new THREE.Vector3(sx * (W / 2 - 50) * S, (base - 12) * S, z * S), new THREE.Vector3(sx * 95 * S, 712 * S, (z - 40) * S), 11 * S, dark));
      }
      const cross = new THREE.Mesh(new RoundedBoxGeometry((W - 100) * S, 14 * S, 22 * S, 2, 5 * S), dark);
      cross.position.set(0, (base - 9) * S, (D / 2 - 40) * S); g.add(cross);

      // bánh sau: vỏ (torus) + mâm + đùm
      const wheelY = 225, wheelZ = -140;
      const tire = new THREE.Mesh(new THREE.TorusGeometry(170 * S, 56 * S, 24, 64), rubber);
      tire.rotation.y = Math.PI / 2; tire.position.set(0, wheelY * S, wheelZ * S); tire.castShadow = true; g.add(tire);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(128 * S, 128 * S, 66 * S, 48), new THREE.MeshStandardMaterial({ color: '#4A4F57', metalness: 0.8, roughness: 0.35 }));
      rim.rotation.z = Math.PI / 2; rim.position.copy(tire.position); g.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(40 * S, 40 * S, 90 * S, 32), chrome);
      hub.rotation.z = Math.PI / 2; hub.position.copy(tire.position); g.add(hub);

      // ốp đuôi: biên dạng hông (z, y) đùn theo chiều ngang, bo cạnh — dáng đuôi xe tay ga
      const sh = new THREE.Shape();
      const P = (z: number, y: number) => new THREE.Vector2(-z, y); // shape X = -z (xoay y +90° → +z)
      const m0 = P(70, 610); sh.moveTo(m0.x, m0.y);
      const q = (cz: number, cy: number, z: number, y: number) => { const c = P(cz, cy), e = P(z, y); sh.quadraticCurveTo(c.x, c.y, e.x, e.y); };
      const l = (z: number, y: number) => { const e = P(z, y); sh.lineTo(e.x, e.y); };
      q(60, 700, -40, 712); l(-660, 722); q(-760, 724, -770, 640); l(-770, 520); q(-760, 470, -640, 468);
      l(-420, 478); q(-180, 500, -60, 520); q(40, 540, 70, 610);
      const cw = 230;
      const cg = new THREE.ExtrudeGeometry(sh, { depth: cw, bevelEnabled: true, bevelSize: 28, bevelThickness: 34, bevelSegments: 8, curveSegments: 28 });
      cg.translate(0, 0, -cw / 2); cg.scale(S, S, S);
      const cowl = new THREE.Mesh(cg, paint);
      cowl.rotation.y = Math.PI / 2; cowl.castShadow = true; cowl.receiveShadow = true;
      g.add(noBounds(cowl));
      // đèn hậu (đỏ phát sáng nhẹ) ôm đuôi + xi nhan 2 bên
      const tail = new THREE.Mesh(new RoundedBoxGeometry(200 * S, 44 * S, 30 * S, 3, 12 * S),
        new THREE.MeshPhysicalMaterial({ color: '#B0141C', emissive: '#E01822', emissiveIntensity: 0.6, roughness: 0.12, clearcoat: 1 }));
      tail.position.set(0, 640 * S, 92 * S); tail.rotation.x = -0.35; g.add(tail);
      for (const sx of [1, -1]) {
        const blink = new THREE.Mesh(new RoundedBoxGeometry(40 * S, 24 * S, 34 * S, 2, 9 * S),
          new THREE.MeshPhysicalMaterial({ color: '#E88A1A', emissive: '#F29020', emissiveIntensity: 0.3, roughness: 0.2, clearcoat: 1 }));
        blink.position.set(sx * 150 * S, 600 * S, 60 * S); g.add(blink);
      }
      // biển số trống (không ghi số) bắt dưới đuôi
      const plateM = new THREE.Mesh(new RoundedBoxGeometry(170 * S, 110 * S, 5 * S, 2, 6 * S), new THREE.MeshStandardMaterial({ color: '#EDEDEA', roughness: 0.6 }));
      plateM.position.set(0, 500 * S, 70 * S); plateM.rotation.x = -0.25; g.add(plateM);
      const plateFrame = new THREE.Mesh(new RoundedBoxGeometry(184 * S, 124 * S, 3 * S, 2, 7 * S), dark);
      plateFrame.position.set(0, 500 * S, 67 * S); plateFrame.rotation.x = -0.25; g.add(plateFrame);
      // yên (phía trước thùng)
      const seat = new THREE.Mesh(new RoundedBoxGeometry(290 * S, 105 * S, 600 * S, 6, 48 * S), seatM);
      seat.position.set(0, 770 * S, (-D / 2 - 320) * S); seat.castShadow = true; g.add(noBounds(seat));
      // pô (ống xả) bên phải, nằm dọc thân, đầu pô ra sau
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(38 * S, 44 * S, 380 * S, 32), new THREE.MeshStandardMaterial({ color: '#2A2C30', metalness: 0.6, roughness: 0.45 }));
      pipe.rotation.x = Math.PI / 2; pipe.position.set(165 * S, 290 * S, -250 * S); pipe.castShadow = true; g.add(pipe);
      const shield = new THREE.Mesh(new THREE.CylinderGeometry(48 * S, 48 * S, 220 * S, 32, 1, true, -0.3, 1.6), dark);
      shield.rotation.x = Math.PI / 2; shield.position.set(168 * S, 292 * S, -280 * S); g.add(shield);
      const pipeEnd = new THREE.Mesh(new THREE.CylinderGeometry(30 * S, 34 * S, 30 * S, 24), chrome);
      pipeEnd.rotation.x = Math.PI / 2; pipeEnd.position.set(165 * S, 290 * S, -58 * S); g.add(pipeEnd);
      // gắp sau
      g.add(rod(new THREE.Vector3(-105 * S, wheelY * S, wheelZ * S), new THREE.Vector3(-105 * S, 360 * S, -600 * S), 22 * S, paint));
    }

    return { group: g, view: { az: 0.62, el: 0.14 }, aim: o.scooter ? 0.56 : 0.5, zoom: o.scooter ? 1.2 : 1.15, blob: 0.45 };
  };
}
