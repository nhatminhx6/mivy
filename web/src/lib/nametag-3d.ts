'use client';
// Bảng tên cài áo 3D — ảnh "flat-lay" sản phẩm:
//  - Tấm bảng tên đùn khối theo đúng hình (chữ nhật bo / bo tròn 2 đầu / oval), mép vát bắt sáng.
//  - Kim loại xước (vàng/bạc): chữ khắc laser lõm, tối, không phản kim loại · Đen khắc lộ vàng: sơn đen nhám, chữ là kim loại vàng
//    · Bạc in UV / mica: mực bóng · Gỗ: vân gỗ, chữ cháy nâu lõm.
//  - Cảnh: 1 bảng cài trên mảnh vải áo vest (vân chéo twill), 1 bảng lật mặt sau thấy kim cài / nam châm, 1 bảng nằm (người thứ 2).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { NTBack, NTMaterial, NTShape } from './nametag-engine';

export interface Nametag3DOpts {
  front: SVGSVGElement | null;   // chế độ 'tex' (chỉ mực, nền trong) — người đang xem
  front2: SVGSVGElement | null;  // người thứ 2 (bảng nằm)
  material: NTMaterial; shape: NTShape; back: NTBack; wMm: number; hMm: number; fontCss: string;
}

const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

function shapeOf(shape: NTShape, x: number, y: number, w: number, h: number): THREE.Shape {
  const s = new THREE.Shape();
  if (shape === 'oval') { s.absellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, Math.PI * 2, false, 0); return s; }
  const r = shape === 'pill' ? h / 2 : Math.min(2.5, h * 0.14);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h); s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r); s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  return s;
}

function texFrom(c: HTMLCanvasElement, W: number, H: number, aniso: number, color = true): THREE.CanvasTexture {
  const t = canvasTex(c, aniso);
  if (!color) t.colorSpace = THREE.NoColorSpace;
  t.flipY = false; t.repeat.set(1 / W, 1 / H); t.needsUpdate = true;
  return t;
}
function maskOf(ink: HTMLCanvasElement, fill: string, blur = 0): HTMLCanvasElement {
  const c = mk(ink.width, ink.height); const x = c.getContext('2d')!;
  if (blur) x.filter = `blur(${blur}px)`;
  x.drawImage(ink, 0, 0); x.filter = 'none';
  x.globalCompositeOperation = 'source-in'; x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function brushed(w: number, h: number, base: string[], strength: number, seed: number): HTMLCanvasElement {
  const c = mk(w, h); const x = c.getContext('2d')!; const r = rng(seed);
  const g = x.createLinearGradient(0, 0, w, h);
  base.forEach((col, i) => g.addColorStop(i / (base.length - 1), col));
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < h * 1.4; i++) {
    const y = r() * h, len = w * (0.25 + r() * 0.75), x0 = r() * w - len * 0.3;
    x.fillStyle = r() > 0.5 ? `rgba(255,255,255,${(r() * 0.18 * strength).toFixed(3)})` : `rgba(0,0,0,${(r() * 0.1 * strength).toFixed(3)})`;
    x.fillRect(x0, y, len, Math.max(1, r() * 1.3));
  }
  return c;
}
function woodGrain(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = mk(w, h); const x = c.getContext('2d')!; const r = rng(seed);
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#D6A66C'); g.addColorStop(0.5, '#C08D56'); g.addColorStop(1, '#CF9D63');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const n = Math.round(h / 9);
  for (let i = 0; i < n; i++) {
    const y0 = (i / n) * h + r() * 6, amp = 3 + r() * h * 0.02, fq = 1 + r() * 2, ph = r() * 6;
    x.beginPath();
    for (let px = 0; px <= w; px += 10) { const y = y0 + Math.sin((px / w) * Math.PI * fq + ph) * amp; if (px === 0) x.moveTo(px, y); else x.lineTo(px, y); }
    x.strokeStyle = `rgba(${95 + r() * 30},${55 + r() * 20},24,${(0.12 + r() * 0.2).toFixed(3)})`; x.lineWidth = 1 + r() * 3; x.stroke();
  }
  return c;
}
// vải áo vest: twill chéo + nhiễu, viền may
function fabricTex(seed: number): HTMLCanvasElement {
  const N = 512; const c = mk(N, N); const x = c.getContext('2d')!; const r = rng(seed);
  x.fillStyle = '#1F2A44'; x.fillRect(0, 0, N, N);
  for (let i = -N; i < N * 2; i += 4) {
    x.strokeStyle = `rgba(255,255,255,${(0.035 + r() * 0.03).toFixed(3)})`; x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(i, 0); x.lineTo(i + N, N); x.stroke();
  }
  const id = x.getImageData(0, 0, N, N);
  for (let i = 0; i < id.data.length; i += 4) { const k = (r() - 0.5) * 14; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
  x.putImageData(id, 0, 0);
  return c;
}

interface TagParts { group: THREE.Group; thick: number }

async function buildTag(o: Nametag3DOpts, el: SVGSVGElement, aniso: number, withHardware: boolean): Promise<TagParts> {
  const W = o.wMm, H = o.hMm, mat = o.material;
  const mica = mat === 'micaWhite' || mat === 'micaBlack';
  const thick = mica ? 2.4 : mat === 'wood' ? 3 : 1.2;
  const bev = mica ? 0.35 : mat === 'wood' ? 0.4 : 0.28;

  const outW = 2048, outH = Math.round((outW * H) / W);
  const ink = await svgToCanvas(await selfContainedSvg(el, o.fontCss), outW, outH);
  const px = outW / W;

  // màu nền + mực
  const base = mat === 'gold' ? brushed(outW, outH, ['#FBE9B4', '#E2BD66', '#FCEDC0', '#DBB45C'], 0.55, 11)
    : mat === 'silver' || mat === 'metalUV' ? brushed(outW, outH, ['#F0F2F4', '#C4C9CF', '#EDEFF1', '#BEC3C9'], 1, 13)
      : mat === 'blackGold' ? brushed(outW, outH, ['#202023', '#151517', '#1C1C1F', '#141416'], 0.35, 17)
        : mat === 'wood' ? woodGrain(outW, outH, 7)
          : (() => { const c = mk(outW, outH); const x = c.getContext('2d')!; x.fillStyle = mat === 'micaWhite' ? '#FBFBF9' : '#111113'; x.fillRect(0, 0, outW, outH); return c; })();
  const col = mk(outW, outH); const cx = col.getContext('2d')!;
  cx.drawImage(base, 0, 0);
  if (mat === 'wood') { cx.globalCompositeOperation = 'multiply'; cx.drawImage(maskOf(ink, 'rgb(80,42,16)', px * 0.08), 0, 0); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 0.6; cx.drawImage(ink, 0, 0); cx.globalAlpha = 1; }
  else if (mat === 'blackGold') cx.drawImage(maskOf(ink, '#F0D08A'), 0, 0);
  else cx.drawImage(ink, 0, 0);

  // G = nhám, B = kim loại
  const metalBase = mat === 'gold' || mat === 'silver' || mat === 'metalUV' ? 1 : mat === 'blackGold' ? 0.15 : 0;
  const roughBase = mat === 'gold' ? 0.3 : mat === 'silver' || mat === 'metalUV' ? 0.33 : mat === 'blackGold' ? 0.62 : mat === 'wood' ? 0.8 : 0.1;
  const inkMetal = mat === 'blackGold' ? 1 : 0;
  const inkRough = mat === 'blackGold' ? 0.3 : mat === 'gold' || mat === 'silver' ? 0.72 : mat === 'wood' ? 0.92 : 0.18;
  const mr = mk(outW, outH); const mx = mr.getContext('2d')!;
  mx.fillStyle = `rgb(0,${Math.round(roughBase * 255)},${Math.round(metalBase * 255)})`; mx.fillRect(0, 0, outW, outH);
  if (metalBase === 1) { const r = rng(5); for (let i = 0; i < outH; i += 2) { mx.fillStyle = `rgba(0,${Math.round((roughBase + (r() - 0.5) * 0.12) * 255)},255,0.5)`; mx.fillRect(0, i, outW, 1); } }
  mx.drawImage(maskOf(ink, `rgb(0,${Math.round(inkRough * 255)},${Math.round(inkMetal * 255)})`), 0, 0);
  // lõm khắc (tối) / mực UV nổi nhẹ (sáng)
  const engraved = mat === 'gold' || mat === 'silver' || mat === 'blackGold' || mat === 'wood';
  const bump = mk(outW, outH); const bx = bump.getContext('2d')!;
  bx.fillStyle = engraved ? '#FFFFFF' : '#BBBBBB'; bx.fillRect(0, 0, outW, outH);
  bx.drawImage(maskOf(ink, engraved ? '#2E2E2E' : '#FFFFFF', px * 0.05), 0, 0);

  const front = new THREE.MeshPhysicalMaterial({
    map: texFrom(col, W, H, aniso), metalness: 1, roughness: 1,
    metalnessMap: texFrom(mr, W, H, aniso, false), roughnessMap: texFrom(mr, W, H, aniso, false),
    bumpMap: texFrom(bump, W, H, aniso, false), bumpScale: engraved ? 1.6 : 0.5,
    clearcoat: mica ? 1 : mat === 'metalUV' ? 0.35 : mat === 'gold' ? 0.25 : 0, clearcoatRoughness: mica ? 0.04 : 0.12,
    envMapIntensity: mat === 'gold' ? 2.1 : metalBase ? 1.45 : 1,
  });
  const sideCol = mat === 'gold' || mat === 'blackGold' ? '#D9B566' : mat === 'silver' || mat === 'metalUV' ? '#D2D6DB' : mat === 'micaWhite' ? '#F3F4F1' : mat === 'micaBlack' ? '#0E0E10' : '#A9743E';
  const side = mat === 'wood' ? new THREE.MeshStandardMaterial({ color: sideCol, roughness: 0.85 })
    : mica ? new THREE.MeshPhysicalMaterial({ color: sideCol, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05 })
      : new THREE.MeshPhysicalMaterial({ color: sideCol, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 });

  const shp = shapeOf(o.shape, bev, bev, W - bev * 2, H - bev * 2);
  const geo = new THREE.ExtrudeGeometry(shp, { depth: thick - bev * 2, bevelEnabled: true, bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 40 });
  geo.translate(0, 0, bev);
  const plate = new THREE.Mesh(geo, [front, side]);
  plate.castShadow = true; plate.receiveShadow = true;
  // mặt sau: tấm trơn che texture mặt trước bị lặp ở nắp sau
  const backMat = mica ? new THREE.MeshStandardMaterial({ color: mat === 'micaWhite' ? '#ECEDEA' : '#141416', roughness: 0.5, side: THREE.DoubleSide })
    : mat === 'wood' ? new THREE.MeshStandardMaterial({ color: '#B88654', roughness: 0.9, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: mat === 'gold' ? '#C9A659' : mat === 'blackGold' ? '#1E1E21' : '#BFC4CA', metalness: mat === 'blackGold' ? 0.4 : 1, roughness: mat === 'blackGold' ? 0.6 : 0.4, side: THREE.DoubleSide });
  const backCover = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(o.shape, 0.2, 0.2, W - 0.4, H - 0.4), 40), backMat);
  backCover.position.z = -0.03;

  const inner = new THREE.Group(); // toạ độ mm, y xuống (như SVG)
  inner.scale.set(S, -S, S);
  inner.add(plate, backCover);

  if (withHardware) {
    const steel = new THREE.MeshPhysicalMaterial({ color: '#E3E6EA', metalness: 1, roughness: 0.22 });
    const blackP = new THREE.MeshStandardMaterial({ color: '#1A1B1E', roughness: 0.55 });
    const hw = new THREE.Group();
    if (o.back === 'pin') {
      const L = Math.min(W * 0.62, 44);
      const bar = new THREE.Mesh(new RoundedBoxGeometry(L * S, 4.2 * S, 0.5 * S, 2, 0.2 * S), steel);
      bar.position.z = -0.25 * S; hw.add(bar);
      // bản lề cuộn + kim + móc khoá
      const coil = new THREE.Mesh(new THREE.TorusGeometry(1.1 * S, 0.32 * S, 10, 24), steel);
      coil.position.set((-L / 2 + 2) * S, 0, -1.25 * S); coil.rotation.y = Math.PI / 2; hw.add(coil);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * S, 0.42 * S, (L - 4) * S, 12), steel);
      pin.rotation.z = Math.PI / 2; pin.position.set(0, 0.9 * S, -1.9 * S); hw.add(pin);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.32 * S, 1.6 * S, 10), steel);
      tip.rotation.z = -Math.PI / 2; tip.position.set((L / 2 - 1.2) * S, 0.9 * S, -1.9 * S); hw.add(tip);
      const catchM = new THREE.Mesh(new RoundedBoxGeometry(3.4 * S, 3.6 * S, 2.4 * S, 2, 0.6 * S), steel);
      catchM.position.set((L / 2 - 1.6) * S, -0.3 * S, -1.4 * S); hw.add(catchM);
    } else {
      const bw = Math.min(W * 0.56, 40), bh = Math.min(H * 0.62, 15);
      const plateB = new THREE.Mesh(new RoundedBoxGeometry(bw * S, bh * S, 1.1 * S, 3, 0.4 * S), blackP);
      plateB.position.z = -0.55 * S; hw.add(plateB);
      for (const dx of [-bw * 0.28, bw * 0.28]) {
        const mag = new THREE.Mesh(new THREE.CylinderGeometry(4 * S, 4 * S, 1.3 * S, 32), steel);
        mag.rotation.x = Math.PI / 2; mag.position.set(dx * S, 0, -1.6 * S); hw.add(mag);
      }
    }
    hw.position.set((W / 2) * S, (-H / 2) * S, 0); // tâm tấm (toạ độ world của nhóm ngoài)
    hw.traverse((n) => { (n as THREE.Mesh).castShadow = true; });
    const g = new THREE.Group(); g.add(inner, hw);
    return { group: g, thick };
  }
  const g = new THREE.Group(); g.add(inner);
  return { group: g, thick };
}

// tấm đặt nằm: mặt trước hướng lên (+y); tâm tấm ở gốc
function layFlat(tag: THREE.Group, W: number, H: number, faceUp: boolean): THREE.Group {
  const holder = new THREE.Group();
  tag.position.set((-W / 2) * S, (H / 2) * S, 0);
  const pivot = new THREE.Group(); pivot.add(tag);
  pivot.rotation.x = faceUp ? -Math.PI / 2 : Math.PI / 2;
  if (!faceUp) pivot.rotation.z = Math.PI; // lật mà vẫn để cạnh dài nằm ngang trước camera
  holder.add(pivot);
  holder.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(holder);
  pivot.position.y -= bb.min.y;
  return holder;
}

function shadowDecal(w: number, h: number, opacity: number): THREE.Mesh {
  // bóng mềm sát mép tấm: blob bo tròn, nhoè mạnh, không lộ khung chữ nhật
  const cw = 256, ch = Math.max(48, Math.round((256 * h * 1.5) / (w * 1.18)));
  const c = mk(cw, ch); const x = c.getContext('2d')!;
  x.filter = 'blur(9px)'; x.fillStyle = 'rgba(0,0,0,0.9)';
  const mx = cw * 0.09, my = ch * 0.2, rr = (ch - my * 2) / 2;
  x.beginPath(); x.roundRect(mx, my, cw - mx * 2, ch - my * 2, rr * 0.6); x.fill();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.18 * S, h * 1.5 * S), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, opacity, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  return m;
}

export function nametagBuilder(o: Nametag3DOpts): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong bảng tên');
    const W = o.wMm, H = o.hMm;
    const [t1, t2, t3] = await Promise.all([
      buildTag(o, o.front, aniso, false),
      buildTag(o, o.front, aniso, true),
      buildTag(o, o.front2 || o.front, aniso, false),
    ]);
    const root = new THREE.Group();

    // mảnh vải vest (nằm phẳng) — bảng tên 1 cài lên đó
    const FW = W * 1.5, FD = Math.max(H * 3.6, 66), FT = 2.2;
    const ft = canvasTex(fabricTex(3), aniso); ft.wrapS = ft.wrapT = THREE.RepeatWrapping; ft.repeat.set(FW / 40, FD / 40);
    const fb = canvasTex(fabricTex(9), aniso); fb.colorSpace = THREE.NoColorSpace; fb.wrapS = fb.wrapT = THREE.RepeatWrapping; fb.repeat.set(FW / 40, FD / 40);
    const fabric = new THREE.Mesh(new RoundedBoxGeometry(FW * S, FT * S, FD * S, 3, 1 * S),
      new THREE.MeshPhysicalMaterial({ map: ft, bumpMap: fb, bumpScale: 0.6, roughness: 0.92, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color('#5A6B92') }));
    const FX = -W * 0.64, FZ = -H * 0.25;
    fabric.position.set(FX * S, (FT / 2) * S, FZ * S); fabric.rotation.y = 0.04;
    fabric.receiveShadow = true; fabric.castShadow = true;
    root.add(fabric);
    // đường may viền vải (chỉ chạy dọc mép phải)
    const stitchMat = new THREE.MeshStandardMaterial({ color: '#2D3A5C', roughness: 0.9 });
    const stitchGeo = new THREE.BoxGeometry(0.45 * S, 0.3 * S, 2.6 * S);
    for (let i = 0; i < 20; i++) {
      const st = new THREE.Mesh(stitchGeo, stitchMat); // con của mảnh vải → theo vị trí/xoay của vải
      st.position.set((FW / 2 - 5) * S, (FT / 2 + 0.08) * S, (-FD / 2 + 4 + (i * (FD - 8)) / 19) * S);
      fabric.add(st);
    }

    // ve áo (lớp vải gập chéo ở góc trên-trái) cho ra dáng áo vest
    const lapel = new THREE.Mesh(new RoundedBoxGeometry(FW * 0.3 * S, 1.6 * S, FD * 1.2 * S, 3, 0.7 * S), fabric.material as THREE.Material);
    lapel.position.set((FX - FW * 0.5) * S, (FT + 0.8) * S, (FZ - FD * 0.02) * S); lapel.rotation.y = 0.36;
    lapel.castShadow = true; lapel.receiveShadow = true;
    for (let i = 0; i < 22; i++) {
      const st = new THREE.Mesh(stitchGeo, stitchMat);
      st.position.set((FW * 0.15 - 3.5) * S, (0.8 + 0.08) * S, (-FD * 0.6 + 4 + (i * (FD * 1.2 - 8)) / 21) * S);
      lapel.add(st);
    }
    root.add(lapel);

    // bảng 1: cài trên vải
    const a = layFlat(t1.group, W, H, true);
    a.position.set((FX + W * 0.2) * S, FT * S, (FZ - H * 0.35) * S); a.rotation.y = 0.04;
    const sa = shadowDecal(W, H, 0.45); sa.position.set((FX + W * 0.2 + 0.9) * S, (FT + 0.06) * S, (FZ - H * 0.35 + 1.3) * S); sa.rotation.z = 0.04;
    root.add(sa, a);

    // bảng 2: lật mặt sau (kim cài / nam châm) — cột phải, phía sau
    const b = layFlat(t2.group, W, H, false);
    b.position.set((W * 0.74) * S, 0, (-H * 0.95) * S); b.rotation.y = -0.16;
    root.add(b);

    // bảng 3: nằm ngửa (người thứ 2) — cột phải, phía trước
    const c = layFlat(t3.group, W, H, true);
    c.position.set((W * 0.7) * S, 0, (H * 0.95) * S); c.rotation.y = 0.1;
    const sc = shadowDecal(W, H, 0.22); sc.position.set((W * 0.7 + 0.6) * S, 0.05 * S, (H * 0.95 + 1) * S); sc.rotation.z = 0.1;
    root.add(sc, c);

    root.traverse((n) => { const m = n as THREE.Mesh; if (m.isMesh && !(m.material as THREE.Material).transparent) m.castShadow = true; });
    const wrap = new THREE.Group(); wrap.add(root);
    const bb = new THREE.Box3().setFromObject(root); const ctr = bb.getCenter(new THREE.Vector3());
    root.position.set(-ctr.x, 0, -ctr.z);
    return { group: wrap, view: { az: 0.1, el: 1.0 }, aim: 0.2, zoom: 1.62, blob: 0 };
  };
}
