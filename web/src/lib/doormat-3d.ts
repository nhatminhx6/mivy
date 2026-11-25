'use client';
// Thảm chùi chân 3D: thảm nằm trên sàn gạch trước ngưỡng cửa kính (nẹp nhôm + chân khung cửa + kính), nhìn từ trên
// xuống như người đứng trước cửa. Nỉ: mặt lông nylon (bump sợi + sheen như nỉ) lõm nhẹ trong viền cao su vát.
// Cao su đúc: cả tấm cao su, chữ/logo nổi (bump từ mask). Xơ dừa: sợi thô (map + bump), mực tối nhân lên sợi.
// Sàn / cửa KHÔNG tính vào khung ngắm (boundingBox rỗng) → camera ôm sát tấm thảm.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';

export interface Doormat3DOpts {
  tex: SVGSVGElement | null;   // vùng in (mode 'tex')
  mask: SVGSVGElement | null;  // vùng in (mode 'mask': trắng = mực) — cao su / xơ dừa
  material: 'felt' | 'rubber' | 'coir';
  W: number; H: number; B: number; pW: number; pH: number; // mm
  border: string;              // màu viền / thân cao su
  fontCss: string;
}

let seed = 7;
const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

/** sợi lông nỉ (bump nhỏ li ti) */
function pileCanvas(n = 512): HTMLCanvasElement {
  seed = 13;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
  for (let i = 0; i < 26000; i++) {
    const px = rnd() * n, py = rnd() * n, l = 1 + rnd() * 2.5, a = rnd() * Math.PI;
    x.strokeStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.12 + rnd() * 0.25})` : `rgba(0,0,0,${0.12 + rnd() * 0.25})`;
    x.lineWidth = 0.8 + rnd() * 0.8;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return c;
}
/** sợi xơ dừa thô (màu + bump): búi sợi dài, dày, nâu đậm–vàng rơm đan chéo */
function coirCanvas(n = 1024): HTMLCanvasElement {
  seed = 29;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  x.fillStyle = '#8C6038'; x.fillRect(0, 0, n, n);
  const strand = (k: number, alpha: number, wMin: number, wMax: number, lMin: number, lMax: number, count: number) => {
    for (let i = 0; i < count; i++) {
      const px = rnd() * n, py = rnd() * n, l = lMin + rnd() * (lMax - lMin);
      const a = (rnd() > 0.5 ? 0.75 : -0.75) + (rnd() - 0.5) * 0.9;
      const t = 0.55 + rnd() * k;
      x.strokeStyle = `rgba(${Math.round(205 * t)},${Math.round(150 * t)},${Math.round(92 * t)},${alpha})`;
      x.lineWidth = wMin + rnd() * (wMax - wMin); x.lineCap = 'round';
      x.beginPath(); x.moveTo(px, py);
      x.quadraticCurveTo(px + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 10, py + Math.sin(a) * l * 0.5 + (rnd() - 0.5) * 10, px + Math.cos(a) * l, py + Math.sin(a) * l);
      x.stroke();
    }
  };
  strand(0.38, 0.85, 3, 7, 30, 90, 3200);   // búi sợi dày
  strand(0.42, 0.7, 1.4, 3, 20, 70, 7000);  // sợi mảnh sáng
  for (let i = 0; i < 2200; i++) { x.fillStyle = `rgba(30,16,6,${0.25 + rnd() * 0.35})`; x.beginPath(); x.arc(rnd() * n, rnd() * n, 1 + rnd() * 3, 0, Math.PI * 2); x.fill(); }
  return c;
}
/** gạch lát sàn (porcelain 600mm, ron mảnh) — 1 canvas = 4×4 viên */
function tileCanvas(n = 1024): HTMLCanvasElement {
  seed = 41;
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  const t = n / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
    const k = 0.965 + rnd() * 0.05;
    x.fillStyle = `rgb(${Math.round(226 * k)},${Math.round(222 * k)},${Math.round(215 * k)})`; x.fillRect(i * t, j * t, t, t);
    for (let q = 0; q < 60; q++) { x.fillStyle = `rgba(150,140,128,${0.04 + rnd() * 0.05})`; x.beginPath(); x.ellipse(i * t + rnd() * t, j * t + rnd() * t, 6 + rnd() * 30, 2 + rnd() * 8, rnd() * 3, 0, Math.PI * 2); x.fill(); }
  }
  x.strokeStyle = 'rgba(120,112,102,0.75)'; x.lineWidth = 3;
  for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * t, 0); x.lineTo(i * t, n); x.stroke(); x.beginPath(); x.moveTo(0, i * t); x.lineTo(n, i * t); x.stroke(); }
  return c;
}
/** mask chữ nổi: làm mềm mép để bump ra gờ nổi tròn */
function softMask(src: HTMLCanvasElement, px: number): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d')!;
  x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
  x.filter = `blur(${px}px)`; x.drawImage(src, 0, 0); x.filter = 'none';
  return c;
}
function roundedRect(w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  const x0 = -w / 2, y0 = -h / 2;
  s.moveTo(x0 + r, y0); s.lineTo(x0 + w - r, y0); s.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r);
  s.lineTo(x0 + w, y0 + h - r); s.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h);
  s.lineTo(x0 + r, y0 + h); s.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r);
  s.lineTo(x0, y0 + r); s.quadraticCurveTo(x0, y0, x0 + r, y0);
  return s;
}
/** loại khỏi khung ngắm (sàn, cửa) */
function noBounds(m: THREE.Mesh) { m.geometry.boundingBox = new THREE.Box3(); m.frustumCulled = false; return m; }

export function doormatBuilder(o: Doormat3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong thảm');
    const { W, H, B, pW, pH } = o;
    const g = new THREE.Group();
    const outW = Math.min(2400, Math.max(1200, Math.round(pW * 2.2)));
    const design = await svgTex(o.tex, o.fontCss, outW, aniso, '#FFFFFF');
    const r = Math.min(30, B * 1.2);

    const rubberMat = (color: string) => {
      const st = canvasTex(pileCanvas(256), aniso); st.wrapS = st.wrapT = THREE.RepeatWrapping; st.repeat.set(W / 60, H / 60);
      return new THREE.MeshStandardMaterial({ color, roughness: 0.82, bumpMap: st, bumpScale: 0.35 });
    };

    if (o.material === 'felt') {
      // viền cao su vát (khoét lỗ vùng in), dày 10mm
      const outer = roundedRect(W, H, r);
      const hole = roundedRect(pW + 2, pH + 2, Math.max(3, r - B));
      outer.holes.push(hole);
      const bev = 2.2;
      const bg = new THREE.ExtrudeGeometry(outer, { depth: 10 - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 16 });
      bg.rotateX(-Math.PI / 2); bg.translate(0, bev, 0);
      const border = new THREE.Mesh(bg, rubberMat(o.border));
      border.castShadow = true; border.receiveShadow = true;
      g.add(border);
      // mặt nỉ: lõm 1.5mm dưới mép viền
      const pile = canvasTex(pileCanvas(512), aniso); pile.wrapS = pile.wrapT = THREE.RepeatWrapping; pile.colorSpace = THREE.NoColorSpace;
      pile.repeat.set(pW / 110, pH / 110);
      const feltMat = new THREE.MeshPhysicalMaterial({ map: design, roughness: 0.93, sheen: 0.5, sheenRoughness: 0.6, sheenColor: new THREE.Color('#FFFFFF'), bumpMap: pile, bumpScale: 1.1 });
      const side = new THREE.MeshStandardMaterial({ color: '#2A2A2C', roughness: 0.95 });
      const felt = new THREE.Mesh(new THREE.BoxGeometry(pW + 2, 8.5, pH + 2), [side, side, feltMat, side, side, side]);
      felt.position.y = 8.5 / 2; felt.receiveShadow = true;
      g.add(felt);
    } else if (o.material === 'rubber') {
      const bev = 2.4;
      const sg = new THREE.ExtrudeGeometry(roundedRect(W, H, r), { depth: 9 - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 4, curveSegments: 16 });
      sg.rotateX(-Math.PI / 2); sg.translate(0, bev, 0);
      const slab = new THREE.Mesh(sg, rubberMat(o.border));
      slab.castShadow = true; slab.receiveShadow = true;
      g.add(slab);
      // mặt in nổi: map = nền cao su + mực, bump = mask mềm (chữ/logo nổi)
      let bump: THREE.Texture | null = null;
      if (o.mask) {
        const mt = await svgTex(o.mask, o.fontCss, Math.round(outW * 0.6), aniso, '#000000');
        bump = canvasTex(softMask(mt.image as HTMLCanvasElement, 2.2), aniso); bump.colorSpace = THREE.NoColorSpace;
        mt.dispose();
      }
      const topMat = new THREE.MeshStandardMaterial({ map: design, roughness: 0.68, bumpMap: bump, bumpScale: bump ? 6 : 0 });
      const top = new THREE.Mesh(new THREE.PlaneGeometry(pW, pH), topMat);
      top.rotation.x = -Math.PI / 2; top.position.y = 9.05; top.receiveShadow = true;
      g.add(top);
      // gờ nổi quanh vùng in (khuôn đúc)
      const lip = roundedRect(pW + 14, pH + 14, Math.max(4, r - B + 7));
      lip.holes.push(roundedRect(pW + 2, pH + 2, Math.max(3, r - B)));
      const lg = new THREE.ExtrudeGeometry(lip, { depth: 1.2, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 2 });
      lg.rotateX(-Math.PI / 2); lg.translate(0, 9, 0);
      const lipM = new THREE.Mesh(lg, rubberMat(o.border)); lipM.castShadow = true; g.add(lipM);
    } else {
      // xơ dừa: khối sợi dày 16mm + đế PVC đen 3mm
      const coir = coirCanvas(1024);
      // mặt trên = sợi xơ dừa trên CẢ tấm, mực tối nhân lên trong vùng in
      const k = 1024 / Math.max(W, H);
      const cw = Math.round(W * k * 1.6), chh = Math.round(H * k * 1.6);
      const top = document.createElement('canvas'); top.width = cw; top.height = chh;
      const tx = top.getContext('2d')!;
      const pat = tx.createPattern(coir, 'repeat')!;
      const ps = Math.max(0.9, cw / W * 0.9); // ~1 ô vân = 1024px ≈ 1.1m thật
      tx.save(); tx.scale(ps, ps); tx.fillStyle = pat; tx.fillRect(0, 0, cw / ps, chh / ps); tx.restore();
      tx.globalCompositeOperation = 'multiply';
      tx.drawImage(design.image as HTMLCanvasElement, (B / W) * cw, (B / H) * chh, (pW / W) * cw, (pH / H) * chh);
      tx.globalCompositeOperation = 'source-over';
      const map = canvasTex(top, aniso);
      const bumpC = document.createElement('canvas'); bumpC.width = cw; bumpC.height = chh;
      const bx = bumpC.getContext('2d')!; bx.drawImage(top, 0, 0); bx.globalCompositeOperation = 'saturation'; bx.fillStyle = '#808080'; bx.fillRect(0, 0, cw, chh);
      const bump = canvasTex(bumpC, aniso); bump.colorSpace = THREE.NoColorSpace;
      const topMat = new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: 4, roughness: 1 });
      const sideTex = canvasTex(coir, aniso); sideTex.wrapS = sideTex.wrapT = THREE.RepeatWrapping; sideTex.repeat.set(W / 220, 0.12);
      const sideMat = new THREE.MeshStandardMaterial({ map: sideTex, bumpMap: sideTex, bumpScale: 2, roughness: 1 });
      const T = 16;
      const block = new THREE.Mesh(new RoundedBoxGeometry(W, T, H, 3, 2.5), sideMat);
      block.position.y = 3 + T / 2; block.castShadow = true; block.receiveShadow = true;
      g.add(block);
      const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 3, H - 3), topMat);
      face.rotation.x = -Math.PI / 2; face.position.y = 3 + T + 0.05; face.receiveShadow = true;
      g.add(face);
      const base = new THREE.Mesh(new RoundedBoxGeometry(W + 2, 3, H + 2, 2, 1), new THREE.MeshStandardMaterial({ color: '#1C1B1A', roughness: 0.7 }));
      base.position.y = 1.5; base.castShadow = true; g.add(base);
    }

    // ---- sàn gạch + ngưỡng cửa kính (không tính khung ngắm) ----
    const tile = canvasTex(tileCanvas(1024), aniso); tile.wrapS = tile.wrapT = THREE.RepeatWrapping;
    const FL = 9000; tile.repeat.set(FL / 2400, FL / 2400); tile.offset.set(0.13, 0.31);
    const floor = noBounds(new THREE.Mesh(new THREE.PlaneGeometry(FL, FL), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.32, metalness: 0 })));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.4; floor.receiveShadow = true;
    g.add(floor);
    const doorZ = -H / 2 - 260, DW = Math.max(W + 900, 1900);
    const alu = new THREE.MeshStandardMaterial({ color: '#C9CDD2', metalness: 0.85, roughness: 0.32 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2B2E33', metalness: 0.6, roughness: 0.45 });
    const sill = noBounds(new THREE.Mesh(new RoundedBoxGeometry(DW, 14, 90, 2, 3), alu)); sill.position.set(0, 7, doorZ); sill.receiveShadow = true; g.add(sill);
    const rail = noBounds(new THREE.Mesh(new THREE.BoxGeometry(DW, 110, 46), dark)); rail.position.set(0, 14 + 55, doorZ - 12); rail.castShadow = true; g.add(rail);
    const glassMat = new THREE.MeshPhysicalMaterial({ color: '#BFD3DA', transparent: true, opacity: 0.28, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, depthWrite: false });
    const glass = noBounds(new THREE.Mesh(new THREE.BoxGeometry(DW, 1600, 10), glassMat)); glass.position.set(0, 124 + 800, doorZ - 12); g.add(glass);
    for (const sx of [-1, 0, 1]) {
      const post = noBounds(new THREE.Mesh(new THREE.BoxGeometry(sx === 0 ? 60 : 90, 1800, 50), dark)); post.position.set(sx * DW / 2, 900, doorZ - 12); post.castShadow = true; g.add(post);
    }
    for (const sx of [-1, 1]) {
      const h = noBounds(new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 520, 20), alu)); h.position.set(sx * 90, 760, doorZ + 40); g.add(h);
      for (const yy of [560, 960]) { const st = noBounds(new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 52, 12), alu)); st.rotation.x = Math.PI / 2; st.position.set(sx * 90, yy, doorZ + 14); g.add(st); }
    }

    g.scale.setScalar(S);
    return { group: g, view: { az: 0.16, el: 0.98 }, aim: 0.5, zoom: 1.3, blob: 0.45 };
  };
}
