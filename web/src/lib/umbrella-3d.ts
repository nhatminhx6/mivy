'use client';
// Ô dù 3D: vòm ghép từ N MÚI — mỗi múi là mặt cong căng giữa 2 nan (lõm nhẹ so với mặt cầu → gân nan nổi),
// mép dưới võng lên giữa 2 nan như ô thật. Texture múi = đúng SVG múi của file in (UV theo toạ độ múi phẳng)
// → logo trên 3D nằm đúng chỗ in. Có nan kim loại, gọng chống, cán, tay cầm J (gỗ) / tay gấp, dù quán có trụ + đế + diềm.

import * as THREE from 'three';
import { S, svgTex, canvasTex, type Builder } from './mockup3d';
import { goreSB, goreW, goreWMax, printedPanels, umbGeo, umbPalette, valW, variantColors, VAL_SCALLOP, type UmbSpec } from './umbrella-engine';

export interface Umb3DOpts {
  spec: UmbSpec;
  gore: SVGSVGElement | null;      // múi màu chính có in
  goreAlt: SVGSVGElement | null;   // múi màu phụ có in (khi in cả 8 múi + xen kẽ)
  val: SVGSVGElement | null;       // diềm màu chính
  valAlt: SVGSVGElement | null;    // diềm màu phụ
  fontCss: string;
}

// vải dù polyester: gân dệt mịn (bump)
let weaveC: HTMLCanvasElement | null = null;
function weaveTex(aniso: number): THREE.Texture {
  if (!weaveC) {
    weaveC = document.createElement('canvas'); weaveC.width = weaveC.height = 256;
    const x = weaveC.getContext('2d')!;
    x.fillStyle = '#808080'; x.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 2) {
      x.fillStyle = 'rgba(255,255,255,0.10)'; x.fillRect(0, i, 256, 1);
      x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(i, 0, 1, 256);
    }
    for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},0.05)`; x.fillRect(Math.random() * 256, Math.random() * 256, 2, 1); }
  }
  const t = new THREE.CanvasTexture(weaveC);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  return t;
}
// gỗ tay cầm
function woodTex(aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 512;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, 64, 0);
  g.addColorStop(0, '#5E3518'); g.addColorStop(0.5, '#8A5530'); g.addColorStop(1, '#5E3518');
  x.fillStyle = g; x.fillRect(0, 0, 64, 512);
  for (let i = 0; i < 40; i++) {
    x.strokeStyle = `rgba(40,20,8,${0.12 + Math.random() * 0.18})`; x.lineWidth = 1 + Math.random() * 1.5;
    const ox = Math.random() * 64; x.beginPath(); x.moveTo(ox, 0);
    for (let y = 0; y <= 512; y += 32) x.lineTo(ox + Math.sin(y / 60 + i) * 3, y);
    x.stroke();
  }
  return canvasTex(c, aniso);
}

const sph = (Rs: number, phi: number, th: number) => new THREE.Vector3(Rs * Math.sin(phi) * Math.sin(th), Rs * Math.cos(phi), Rs * Math.sin(phi) * Math.cos(th));

export function umbrellaBuilder(o: Umb3DOpts): Builder {
  return async (aniso) => {
    const { spec } = o;
    const g = umbGeo(spec.kind), p = umbPalette(spec.palette);
    const N = g.N, dT = (2 * Math.PI) / N, Rs = g.Rs, L = g.L;
    const patio = spec.kind === 'patio';
    const AZ = patio ? 0.42 : 0.5;            // múi 0 quay về phía camera mặc định
    const W = goreWMax(g);
    const printed = new Set(printedPanels(spec.panels, N));
    const weave = weaveTex(aniso);
    weave.repeat.set(patio ? 30 : 14, patio ? 30 : 14);

    // texture múi in (màu chính / màu phụ)
    const texW = patio ? 2048 : 1400;
    const [tBase, tAlt] = await Promise.all([
      o.gore ? svgTex(o.gore, o.fontCss, texW, aniso, '') : Promise.resolve(null),
      o.goreAlt && spec.alternate ? svgTex(o.goreAlt, o.fontCss, texW, aniso, '') : Promise.resolve(null),
    ]);
    const fabric = (color: string, map: THREE.Texture | null) => new THREE.MeshPhysicalMaterial({
      color: map ? '#FFFFFF' : color, map, roughness: 0.5, sheen: 0.22, sheenRoughness: 0.5, sheenColor: new THREE.Color('#FFFFFF'),
      bumpMap: weave, bumpScale: 0.35, side: THREE.DoubleSide,
    });
    const mats = new Map<string, THREE.Material>();
    const matFor = (k: number) => {
      const alt = spec.alternate && k % 2 === 1;
      const pr = printed.has(k);
      const key = `${alt ? 'a' : 'b'}${pr ? 'p' : ''}`;
      if (!mats.has(key)) {
        const cols = variantColors(p, alt ? 'alt' : 'base', spec.inks);
        mats.set(key, fabric(cols.fabric, pr ? (alt ? (tAlt ?? tBase) : tBase) : null));
      }
      return mats.get(key)!;
    };

    const root = new THREE.Group(); // đơn vị mm, tâm vòm cầu ở gốc, đỉnh ô ở (0, Rs, 0)
    const BULGE = 0.22; // 0 = căng phẳng giữa 2 nan, 1 = tròn theo mặt cầu
    const SU = 18, SV = patio ? 48 : 40;
    for (let k = 0; k < N; k++) {
      const th0 = AZ + k * dT - dT / 2;
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      for (let j = 0; j <= SV; j++) {
        const v = j / SV;
        for (let i = 0; i <= SU; i++) {
          const u = i / SU;
          const s = v * goreSB(g, u);
          const phi = s / Rs;
          const A = sph(Rs, phi, th0), B = sph(Rs, phi, th0 + dT), P = sph(Rs, phi, th0 + u * dT);
          const C = A.clone().lerp(B, u);
          const q = C.lerp(P, BULGE);
          pos.push(q.x, q.y, q.z);
          const xf = (u - 0.5) * 2 * goreW(g, s);
          uv.push((xf + W) / (2 * W), 1 - s / L);
        }
      }
      for (let j = 0; j < SV; j++) for (let i = 0; i < SU; i++) {
        const a = j * (SU + 1) + i, b = a + 1, c = a + SU + 1, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, matFor(k));
      m.castShadow = true; m.receiveShadow = true;
      root.add(m);
    }

    // ---------- khung: nan, gọng, cán ----------
    const metal = new THREE.MeshStandardMaterial({ color: patio ? '#3A3D42' : '#26282C', metalness: 0.8, roughness: 0.38 });
    const ribR = patio ? 6 : 2.1;
    const ribTip = (th: number) => sph(Rs, g.Phi, th);
    for (let k = 0; k < N; k++) {
      const th = AZ + k * dT - dT / 2;
      const pts: THREE.Vector3[] = [];
      for (let i = 1; i <= 24; i++) { const phi = (g.Phi * i) / 24; pts.push(sph(Rs - ribR * 1.6, phi, th)); }
      const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, ribR, 6), metal);
      rib.castShadow = true; root.add(rib);
      // đầu nan (chụp nhựa/kim loại)
      const tip = ribTip(th), dir = tip.clone().sub(sph(Rs, g.Phi - 0.02, th)).normalize();
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(ribR * 1.6, ribR * 1.2, patio ? 40 : 16, 10), new THREE.MeshStandardMaterial({ color: patio ? '#2E3136' : '#1A1B1E', roughness: 0.45, metalness: 0.3 }));
      cap.position.copy(tip).addScaledVector(dir, patio ? 14 : 6);
      cap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      root.add(cap);
    }
    const apexY = Rs;
    const hemY = Rs * Math.cos(g.Phi);
    const shaftR = patio ? 19 : spec.kind === 'fold' ? 6 : 5;
    const runnerY = hemY - (patio ? 260 : 90);
    for (let k = 0; k < N; k++) {
      const th = AZ + k * dT - dT / 2;
      const a = new THREE.Vector3(0, runnerY, 0), b = sph(Rs - ribR * 2, g.Phi * 0.5, th);
      const len = a.distanceTo(b);
      const st = new THREE.Mesh(new THREE.CylinderGeometry(ribR * 0.8, ribR * 0.8, len, 6), metal);
      st.position.copy(a).add(b).multiplyScalar(0.5);
      st.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      root.add(st);
    }
    const runner = new THREE.Mesh(new THREE.CylinderGeometry(shaftR * 2.2, shaftR * 2.2, patio ? 90 : 40, 16), metal);
    runner.position.y = runnerY; root.add(runner);

    // mũ đỉnh + núm đỉnh
    const topCap = new THREE.Mesh(new THREE.SphereGeometry(patio ? 110 : 34, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), fabric(p.base, null));
    topCap.scale.y = 0.5; topCap.position.y = apexY - 2; root.add(topCap);
    if (patio) {
      // mái thông gió: chóp nhỏ phía trên
      const vent = new THREE.Mesh(new THREE.ConeGeometry(320, 120, N, 1, true), fabric(p.base, null));
      vent.position.y = apexY + 120; vent.rotation.y = AZ + dT / 2; vent.castShadow = true; root.add(vent);
      const ventPost = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR, 160, 12), metal);
      ventPost.position.y = apexY + 60; root.add(ventPost);
    }
    const finial = new THREE.Mesh(new THREE.CylinderGeometry(patio ? 10 : 3.5, patio ? 16 : 5, patio ? 90 : 55, 12), new THREE.MeshStandardMaterial({ color: '#1C1D20', roughness: 0.35, metalness: 0.5 }));
    finial.position.y = apexY + (patio ? 230 : 26); root.add(finial);

    // cán
    const shaftLen = patio ? 0 : spec.kind === 'fold' ? 560 : 820;
    let bottomY: number;
    if (!patio) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR, shaftLen, 12), metal);
      shaft.position.y = apexY - shaftLen / 2; shaft.castShadow = true; root.add(shaft);
      const y1 = apexY - shaftLen;
      if (spec.kind === 'hand') {
        // tay cầm J bằng gỗ
        const wood = new THREE.MeshPhysicalMaterial({ map: woodTex(aniso), roughness: 0.42, clearcoat: 0.7, clearcoatRoughness: 0.25 });
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 130, 20), wood);
        grip.position.y = y1 - 65; grip.castShadow = true; root.add(grip);
        const hookR = 46;
        const curve = new THREE.CatmullRomCurve3(Array.from({ length: 22 }, (_, i) => {
          const a = Math.PI * (i / 21) * 1.05;
          return new THREE.Vector3(hookR - hookR * Math.cos(a), y1 - 130 - hookR * Math.sin(a), 0);
        }));
        const hook = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 13, 16), wood);
        hook.rotation.y = AZ; hook.position.set(0, 0, 0); hook.castShadow = true;
        root.add(hook);
        const capEnd = new THREE.Mesh(new THREE.SphereGeometry(13, 16, 12), wood);
        const endP = curve.getPoint(1); capEnd.position.copy(endP).applyAxisAngle(new THREE.Vector3(0, 1, 0), AZ); root.add(capEnd);
        bottomY = y1 - 130 - hookR;
      } else {
        // ô gấp: tay cầm thẳng cao su + dây đeo
        const rubber = new THREE.MeshStandardMaterial({ color: '#16171A', roughness: 0.8 });
        const handle = new THREE.Mesh(new THREE.CylinderGeometry(14, 12, 115, 20), rubber);
        handle.position.y = y1 - 57; handle.castShadow = true; root.add(handle);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(15, 2.5, 8, 24), metal);
        ring.position.y = y1 - 118; ring.rotation.y = AZ; root.add(ring);
        const strapC = new THREE.CatmullRomCurve3([
          new THREE.Vector3(0, y1 - 125, 0), new THREE.Vector3(8, y1 - 170, 6), new THREE.Vector3(20, y1 - 215, 2), new THREE.Vector3(10, y1 - 255, -4), new THREE.Vector3(-4, y1 - 205, -3), new THREE.Vector3(-2, y1 - 140, 0),
        ]);
        const strap = new THREE.Mesh(new THREE.TubeGeometry(strapC, 40, 3.2, 6), new THREE.MeshStandardMaterial({ color: p.base, roughness: 0.7 }));
        strap.rotation.y = AZ; root.add(strap);
        bottomY = y1 - 258;
      }
    } else {
      // dù quán: trụ + đế tròn
      const groundY = hemY - 2000;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(shaftR, shaftR, apexY - groundY, 16), metal);
      pole.position.y = (apexY + groundY) / 2; pole.castShadow = true; root.add(pole);
      const baseMat = new THREE.MeshStandardMaterial({ color: '#2B2D31', roughness: 0.6, metalness: 0.2 });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(260, 280, 60, 40), baseMat);
      base.position.y = groundY + 30; base.castShadow = true; base.receiveShadow = true; root.add(base);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(40, 55, 120, 24), baseMat);
      collar.position.y = groundY + 120; root.add(collar);
      const crank = new THREE.Mesh(new THREE.BoxGeometry(14, 14, 90), metal);
      crank.position.set(0, groundY + 1250, 45); crank.rotation.y = AZ; root.add(crank);
      bottomY = groundY;

      // diềm: mỗi múi 1 tấm treo từ mép dưới
      const [vBase, vAlt] = await Promise.all([
        o.val ? svgTex(o.val, o.fontCss, 1024, aniso, '') : Promise.resolve(null),
        o.valAlt && spec.alternate ? svgTex(o.valAlt, o.fontCss, 1024, aniso, '') : Promise.resolve(null),
      ]);
      const vw = valW(g), vh = g.valH + VAL_SCALLOP;
      for (let k = 0; k < N; k++) {
        const th0 = AZ + k * dT - dT / 2;
        const A = sph(Rs, g.Phi, th0), B = sph(Rs, g.Phi, th0 + dT);
        const alt = spec.alternate && k % 2 === 1;
        const tex = alt ? (vAlt ?? vBase) : vBase;
        const cols = variantColors(p, alt ? 'alt' : 'base', spec.inks);
        const mat = new THREE.MeshPhysicalMaterial({ color: tex ? '#FFFFFF' : cols.fabric, map: tex, alphaTest: 0.5, transparent: false, roughness: 0.6, sheen: 0.5, sheenRoughness: 0.55, bumpMap: weave, bumpScale: 0.3, side: THREE.DoubleSide });
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(vw * 1.01, vh, 12, 4), mat);
        const mid = A.clone().add(B).multiplyScalar(0.5);
        const out = new THREE.Vector3(mid.x, 0, mid.z).normalize();
        plane.position.set(mid.x, mid.y - vh / 2 + 4, mid.z).addScaledVector(out, 3);
        plane.lookAt(plane.position.clone().add(out));
        plane.rotateX(-0.06); // diềm hơi xoè ra ngoài
        plane.castShadow = true;
        root.add(plane);
      }
    }

    const out = new THREE.Group();
    root.scale.setScalar(S);
    // ô cầm tay / ô gấp: nghiêng nhẹ về phía camera để thấy rõ mặt vòm, lơ lửng như ảnh sản phẩm
    if (!patio) {
      const tilt = new THREE.Group(); tilt.add(root);
      tilt.rotation.set(0, 0, 0);
      const axis = new THREE.Vector3(Math.cos(AZ), 0, -Math.sin(AZ)); // vuông góc hướng nhìn
      tilt.quaternion.setFromAxisAngle(axis, 0.12);
      out.add(tilt);
    } else out.add(root);
    out.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(out);
    const lift = patio ? 0 : 140 * S;
    out.position.y = -bb.min.y + lift;
    void bottomY;
    return {
      group: out,
      view: patio ? { az: AZ, el: 0.3 } : { az: AZ, el: 0.42 },
      aim: patio ? 0.6 : 0.56,
      zoom: patio ? 1.5 : 1.6,
      blob: patio ? 0.5 : 0.28,
    };
  };
}
