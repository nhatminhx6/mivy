'use client';
// Biển công ty 3D: tấm biển gắn tường bằng 4 (hoặc 2) ốc pát inox bóng.
//  - Mica: lớp nền in (mặt sau) + tấm mica trong dày (cạnh bắt sáng) + CHỮ NỔI đùn khối thật từ đường outline chữ
//          (vàng/bạc gương hoặc màu), bóng chữ rơi xuyên mica xuống lớp in.
//  - Alu xước / inox trắng / inox vàng gương: kim loại thật (env), vân xước, mực in UV/sơn ăn mòn không phản kim loại,
//          chữ ăn mòn lõm nhẹ (bump).  - Gỗ: vân gỗ vẽ code, chữ khắc laser cháy nâu lõm.
// Tường thật nhận bóng; swing ±0.6 rad để không bao giờ lộ mặt sau tường.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import type { PLGeom, PLKind, PLLetter, PLMaterial } from './plaque-engine';

export interface Plaque3DOpts {
  tex: SVGSVGElement | null; // SVG chế độ 'tex' đang nằm trong DOM (để outline chữ nổi)
  kind: PLKind; material: PLMaterial; letter: PLLetter; inkColor: string; geom: PLGeom; fontCss: string;
}

const rng = (seed: number) => { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };

function roundRect(x: number, y: number, w: number, h: number, r: number): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// tấm phẳng đùn theo toạ độ SVG (mm, y xuống); mặt trước ở z = depth + bevel
function plate(W: number, H: number, r: number, depth: number, bevel: number, mats: THREE.Material[]): THREE.Mesh {
  const geo = new THREE.ExtrudeGeometry(roundRect(bevel, bevel, W - bevel * 2, H - bevel * 2, Math.max(0.5, r - bevel)), {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12,
  });
  geo.translate(0, 0, bevel);
  const m = new THREE.Mesh(geo, mats);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function texFrom(c: HTMLCanvasElement, W: number, H: number, aniso: number, color = true): THREE.CanvasTexture {
  const t = canvasTex(c, aniso);
  if (!color) t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  t.repeat.set(1 / W, 1 / H);
  t.needsUpdate = true;
  return t;
}

const mk = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// mặt nạ mực (alpha của lớp in) tô 1 màu
function maskOf(ink: HTMLCanvasElement, fill: string, blur = 0): HTMLCanvasElement {
  const c = mk(ink.width, ink.height); const x = c.getContext('2d')!;
  if (blur) x.filter = `blur(${blur}px)`;
  x.drawImage(ink, 0, 0);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-in'; x.fillStyle = fill; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// vân xước ngang (alu / inox): sáng tối theo hàng + vệt dài ngẫu nhiên
function brushed(w: number, h: number, base: string[], strength: number, seed: number): HTMLCanvasElement {
  const c = mk(w, h); const x = c.getContext('2d')!; const r = rng(seed);
  const g = x.createLinearGradient(0, 0, w, h);
  base.forEach((col, i) => g.addColorStop(i / (base.length - 1), col));
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  for (let i = 0; i < h * 1.6; i++) {
    const y = r() * h, len = w * (0.2 + r() * 0.8), x0 = r() * w - len * 0.3;
    x.fillStyle = r() > 0.5 ? `rgba(255,255,255,${(r() * 0.16 * strength).toFixed(3)})` : `rgba(0,0,0,${(r() * 0.09 * strength).toFixed(3)})`;
    x.fillRect(x0, y, len, Math.max(1, r() * 1.4));
  }
  return c;
}

function woodGrain(w: number, h: number, seed: number): HTMLCanvasElement {
  const c = mk(w, h); const x = c.getContext('2d')!; const r = rng(seed);
  const g = x.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, '#CFA06A'); g.addColorStop(0.5, '#BE8C55'); g.addColorStop(1, '#C99862');
  x.fillStyle = g; x.fillRect(0, 0, w, h);
  const n = Math.round(h / 5);
  for (let i = 0; i < n; i++) {
    const y0 = (i / n) * h + r() * 4, amp = 2 + r() * h * 0.012, fq = 1 + r() * 2.2, ph = r() * 6;
    x.beginPath();
    for (let px = 0; px <= w; px += 8) {
      const y = y0 + Math.sin((px / w) * Math.PI * fq + ph) * amp + Math.sin(px * 0.031 + ph) * 1.2;
      if (px === 0) x.moveTo(px, y); else x.lineTo(px, y);
    }
    x.strokeStyle = `rgba(${90 + r() * 30},${52 + r() * 20},${24},${(0.12 + r() * 0.22).toFixed(3)})`;
    x.lineWidth = 0.6 + r() * 2.2; x.stroke();
  }
  // vài mắt gỗ nhẹ
  for (let k = 0; k < 2; k++) {
    const cx = r() * w, cy = r() * h, rr = 6 + r() * 14;
    for (let j = 4; j > 0; j--) { x.beginPath(); x.ellipse(cx, cy, rr * j * 0.9, rr * j * 0.35, 0, 0, Math.PI * 2); x.strokeStyle = 'rgba(95,55,25,0.10)'; x.lineWidth = 1.2; x.stroke(); }
  }
  return c;
}

// nắp ốc pát: tròn, mép bo (lathe quanh trục z)
function standoff(capD: number, gap: number, capH: number, chrome: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  const R = capD / 2;
  const pts = [[0, 0], [R * 0.97, 0], [R, capH * 0.18], [R, capH * 0.62], [R * 0.95, capH * 0.86], [R * 0.78, capH * 0.98], [R * 0.4, capH], [0, capH]]
    .map(([a, b]) => new THREE.Vector2(a * S, b * S));
  const cap = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), chrome);
  cap.rotation.x = Math.PI / 2; // trục lathe (y) → z
  cap.castShadow = true;
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.68 * S, R * 0.68 * S, gap * S, 32), chrome);
  barrel.rotation.x = Math.PI / 2; barrel.position.z = (-gap / 2) * S; barrel.castShadow = true;
  g.add(cap, barrel);
  return g;
}

export function plaqueBuilder(o: Plaque3DOpts): Builder {
  return async (aniso) => {
    if (!o.tex) throw new Error('Chưa dựng xong biển');
    const { W, H, radius, capD, gap, holes } = o.geom;
    const mica = o.material === 'mica';
    const small = o.kind !== 'company';

    // 1) outline (mica: cần đường chữ nổi để đùn khối) + tách lớp chữ nổi khỏi texture
    const clone = await selfContainedSvg(o.tex, o.fontCss, { outline: mica });
    const rg = clone.querySelector('[data-raise]');
    let raised: { d: string; fill: string }[] = [];
    if (rg && mica) {
      const leftText = rg.querySelectorAll('text').length;
      raised = Array.from(rg.querySelectorAll('path')).map((p) => ({ d: p.getAttribute('d') || '', fill: p.getAttribute('fill') || o.inkColor })).filter((p) => p.d);
      if (!leftText && raised.length) rg.remove(); else raised = []; // outline lỗi → giữ chữ phẳng trong texture
    }
    const outW = Math.max(1024, Math.min(2048, Math.round(Math.max(W, H) * (small ? 5 : 2.4))));
    const outH = Math.max(8, Math.round((outW * H) / W));
    const ink = await svgToCanvas(clone, outW, outH); // mica: có nền; kim loại/gỗ: chỉ mực, nền trong suốt
    const px = outW / W; // px / mm

    const inner = new THREE.Group(); // toạ độ SVG (mm, y xuống)
    inner.scale.set(S, -S, S);
    const chrome = new THREE.MeshPhysicalMaterial({ color: '#EEF0F2', metalness: 1, roughness: 0.1, clearcoat: 0.6, clearcoatRoughness: 0.05 });

    let front = gap; // z mặt trước (mm) — ốc nắp đặt ở đây
    if (mica) {
      const back = 3, tAc = small ? 5 : 8, bevB = 0.4, bevA = small ? 0.8 : 1.2;
      const printTex = texFrom(ink, W, H, aniso);
      const backing = plate(W, H, radius, back - bevB * 2, bevB, [
        new THREE.MeshStandardMaterial({ map: printTex, roughness: 0.55 }),
        new THREE.MeshStandardMaterial({ color: '#F4F4F2', roughness: 0.6 }),
      ]);
      backing.position.z = gap; inner.add(backing);
      const zPrint = gap + back;
      // bóng chữ nổi rơi xuyên mica xuống lớp in (lệch phải-dưới theo độ dày mica)
      if (raised.length) {
        const sc = mk(outW, outH); const sx = sc.getContext('2d')!;
        sx.filter = `blur(${Math.max(2, px * (small ? 0.9 : 1.6))}px)`;
        sx.setTransform(px, 0, 0, px, px * (small ? 1.1 : 2.2), px * (small ? 1.5 : 3.0));
        sx.fillStyle = 'rgba(0,0,0,0.55)';
        for (const r of raised) sx.fill(new Path2D(r.d));
        const sh = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(0, 0, W, H, radius)), new THREE.MeshBasicMaterial({ map: texFrom(sc, W, H, aniso), transparent: true, opacity: 0.5, depthWrite: false }));
        sh.position.z = zPrint + 0.08; inner.add(sh);
      }
      // mica trong: mặt gần trong suốt + phản chiếu, cạnh dày ngả xanh ngọc như acrylic thật
      const acCap = new THREE.MeshPhysicalMaterial({ color: '#F6FBFA', transparent: true, opacity: 0.1, roughness: 0.02, clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, depthWrite: false });
      const acSide = new THREE.MeshPhysicalMaterial({ color: '#DDF3EE', emissive: '#7FBFB2', emissiveIntensity: 0.18, transparent: true, opacity: 0.9, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1 });
      const ac = plate(W, H, radius, tAc - bevA * 2, bevA, [acCap, acSide]);
      ac.position.z = zPrint + 0.15; ac.castShadow = false; ac.renderOrder = 2; inner.add(ac);
      front = zPrint + 0.15 + tAc;
      // vệt loá chéo trên mặt mica (như kính) — dải sáng mờ, không che chữ
      {
        const hc = mk(512, 512); const hx = hc.getContext('2d')!;
        const lg = hx.createLinearGradient(0, 0, 512, 512);
        lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.3, 'rgba(255,255,255,0)'); lg.addColorStop(0.36, 'rgba(255,255,255,0.55)');
        lg.addColorStop(0.44, 'rgba(255,255,255,0.12)'); lg.addColorStop(0.5, 'rgba(255,255,255,0)'); lg.addColorStop(0.6, 'rgba(255,255,255,0.22)'); lg.addColorStop(0.64, 'rgba(255,255,255,0)');
        hx.fillStyle = lg; hx.fillRect(0, 0, 512, 512);
        const ht = new THREE.CanvasTexture(hc); ht.flipY = false; ht.repeat.set(1 / W, 1 / H);
        const sheen = new THREE.Mesh(new THREE.ShapeGeometry(roundRect(0, 0, W, H, radius)), new THREE.MeshBasicMaterial({ map: ht, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending }));
        sheen.position.z = front + 0.05; sheen.renderOrder = 3; inner.add(sheen);
      }
      // chữ nổi: đùn khối từ outline chữ, dán trên mặt mica
      if (raised.length) {
        const letterMat = o.letter === 'gold'
          ? new THREE.MeshPhysicalMaterial({ color: '#FFD57A', metalness: 1, roughness: 0.3, envMapIntensity: 2.8, clearcoat: 0.35, clearcoatRoughness: 0.1 })
          : o.letter === 'silver'
            ? new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', metalness: 1, roughness: 0.24, envMapIntensity: 2.7, clearcoat: 0.35, clearcoatRoughness: 0.1 })
            : null;
        const byFill = new Map<string, string[]>();
        for (const r of raised) { const k = letterMat ? 'm' : r.fill; byFill.set(k, [...(byFill.get(k) || []), r.d]); }
        const depth = small ? 2 : 3;
        for (const [fill, ds] of byFill) {
          const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg">${ds.map((d) => `<path d="${d}"/>`).join('')}</svg>`);
          const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
          if (!shapes.length) continue;
          const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 0.25, bevelSize: 0.12, bevelSegments: 2, curveSegments: 5 });
          const mat = letterMat || new THREE.MeshPhysicalMaterial({ color: fill, roughness: 0.28, clearcoat: 0.7, clearcoatRoughness: 0.15 });
          const m = new THREE.Mesh(geo, mat);
          m.position.z = front + 0.25; m.castShadow = true;
          inner.add(m);
        }
      }
    } else {
      const wood = o.material === 'wood';
      const gold = o.material === 'inoxGold';
      const thick = wood ? 15 : o.material === 'alu' ? 3 : 1.6;
      const bev = wood ? 1.2 : 0.35;
      // màu nền + mực
      const base = wood ? woodGrain(outW, outH, 7)
        : gold ? brushed(outW, outH, ['#FFEDB2', '#F0CB72', '#FFF0BE', '#E8C062'], 0.35, 11)
          : o.material === 'inox' ? brushed(outW, outH, ['#E9EBEE', '#CDD1D6', '#ECEEF0', '#D3D6DA'], 1, 13)
            : brushed(outW, outH, ['#DADDE1', '#BCC1C7', '#DFE2E5', '#C3C8CE'], 1.3, 17);
      const col = mk(outW, outH); const cx = col.getContext('2d')!;
      cx.drawImage(base, 0, 0);
      if (wood) { cx.globalCompositeOperation = 'multiply'; cx.drawImage(maskOf(ink, 'rgba(70,38,16,1)', px * 0.25), 0, 0); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 0.55; cx.drawImage(ink, 0, 0); cx.globalAlpha = 1; }
      else cx.drawImage(ink, 0, 0);
      // G = độ nhám, B = độ kim loại (mực/sơn: không kim loại, nhám hơn)
      const mr = mk(outW, outH); const mx = mr.getContext('2d')!;
      const rough = wood ? 0.78 : gold ? 0.22 : o.material === 'inox' ? 0.3 : 0.38;
      mx.fillStyle = `rgb(0,${Math.round(rough * 255)},${wood ? 0 : 255})`; mx.fillRect(0, 0, outW, outH);
      if (!wood) {
        // vệt xước làm nhám dao động theo hàng
        const r = rng(5); for (let i = 0; i < outH; i += 2) { mx.fillStyle = `rgba(0,${Math.round((rough + (r() - 0.5) * 0.12) * 255)},255,0.5)`; mx.fillRect(0, i, outW, 1); }
      }
      mx.drawImage(maskOf(ink, `rgb(0,${Math.round((wood ? 0.9 : 0.55) * 255)},0)`), 0, 0);
      // lõm: nền trắng, chữ ăn mòn/khắc tối
      const bump = mk(outW, outH); const bx = bump.getContext('2d')!;
      bx.fillStyle = '#FFFFFF'; bx.fillRect(0, 0, outW, outH);
      if (wood) { bx.globalAlpha = 0.25; bx.drawImage(base, 0, 0); bx.globalAlpha = 1; }
      if (o.material !== 'alu') bx.drawImage(maskOf(ink, '#3A3A3A', px * 0.12), 0, 0);
      const capMat = new THREE.MeshPhysicalMaterial({
        map: texFrom(col, W, H, aniso), metalness: wood ? 0 : gold ? 0.82 : 1, roughness: 1, // vàng: bớt kim loại cho màu vàng tươi như ảnh thật
        metalnessMap: texFrom(mr, W, H, aniso, false), roughnessMap: texFrom(mr, W, H, aniso, false),
        bumpMap: texFrom(bump, W, H, aniso, false), bumpScale: wood ? 2.2 : 1.2, envMapIntensity: gold ? 1.9 : wood ? 1 : 1.3,
        clearcoat: gold ? 0.4 : 0, clearcoatRoughness: 0.08,
      });
      const sideMat = wood
        ? new THREE.MeshStandardMaterial({ color: '#A8733D', roughness: 0.85 })
        : new THREE.MeshPhysicalMaterial({ color: gold ? '#D2A548' : '#C9CDD2', metalness: 1, roughness: 0.25 });
      const p = plate(W, H, radius, thick - bev * 2, bev, [capMat, sideMat]);
      p.position.z = gap; inner.add(p);
      front = gap + thick;
    }

    // ốc pát
    const capH = small ? 6 : 10;
    for (const h of holes) {
      const so = standoff(capD, front, capH, chrome);
      so.position.set(h.x, h.y, front); so.scale.set(1 / S, -1 / S, 1 / S); // standoff dựng theo đơn vị world → bù scale inner
      inner.add(so);
    }

    const plaque = new THREE.Group();
    inner.position.set((-W / 2) * S, (H / 2) * S, 0);
    plaque.add(inner);

    // tường: sơn nhám, loang sáng; nhận bóng
    const lift = Math.max(W, H) * 0.8;
    const wallW = Math.max(W * 4.6, H * 4), wallH = lift + H * 2.4;
    const wc = mk(512, 512); const wx = wc.getContext('2d')!;
    const gr = wx.createRadialGradient(170, 120, 20, 230, 220, 520);
    gr.addColorStop(0, '#F5F2EC'); gr.addColorStop(1, '#DFD9CF');
    wx.fillStyle = gr; wx.fillRect(0, 0, 512, 512);
    const id = wx.getImageData(0, 0, 512, 512); const rr = rng(3);
    for (let i = 0; i < id.data.length; i += 4) { const k = (rr() - 0.5) * 7; id.data[i] += k; id.data[i + 1] += k; id.data[i + 2] += k; }
    wx.putImageData(id, 0, 0);
    const wt = new THREE.CanvasTexture(wc); wt.colorSpace = THREE.SRGBColorSpace;
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(wallW * S, wallH * S), new THREE.MeshStandardMaterial({ map: wt, roughness: 0.96 }));
    wall.position.set(0, (wallH / 2 - lift) * S, 0); wall.receiveShadow = true;

    // bóng đổ mềm của tấm biển lên tường (lệch phải-dưới, đậm theo khoảng hở ốc pát)
    const PW = 1.16, PH = 1.2;
    const sc = mk(256, Math.max(48, Math.round((256 * H * PH) / (W * PW)))); const sx = sc.getContext('2d')!;
    sx.filter = 'blur(8px)'; sx.fillStyle = 'rgba(35,28,20,0.8)';
    const mxp = (sc.width - sc.width / PW) / 2, myp = (sc.height - sc.height / PH) / 2;
    sx.fillRect(mxp, myp, sc.width - mxp * 2, sc.height - myp * 2);
    const drop = new THREE.Mesh(new THREE.PlaneGeometry(W * PW * S, H * PH * S), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, opacity: mica ? 0.3 : 0.36, depthWrite: false }));
    drop.position.set((gap * 0.55 + W * 0.008) * S, (-gap * 0.7) * S, 0.3 * S);
    // bóng nhỏ của từng ốc pát trên tường
    const dc = mk(64, 64); const dx = dc.getContext('2d')!;
    const rg2 = dx.createRadialGradient(32, 32, 2, 32, 32, 32); rg2.addColorStop(0, 'rgba(0,0,0,0.5)'); rg2.addColorStop(1, 'rgba(0,0,0,0)');
    dx.fillStyle = rg2; dx.fillRect(0, 0, 64, 64);
    const dotTex = new THREE.CanvasTexture(dc);
    const dots = holes.map((h) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(capD * 1.6 * S, capD * 1.6 * S), new THREE.MeshBasicMaterial({ map: dotTex, transparent: true, opacity: 0.55, depthWrite: false }));
      m.position.set((h.x - W / 2 + gap * 0.4) * S, (H / 2 - h.y - gap * 0.5) * S, 0.35 * S);
      return m;
    });

    const hang = new THREE.Group();
    hang.add(plaque, wall, drop, ...dots);
    hang.position.y = lift * S;
    const root = new THREE.Group(); root.add(hang);
    root.updateMatrixWorld(true);
    const all = new THREE.Box3().setFromObject(root);
    const art = new THREE.Box3().setFromObject(plaque);
    const rAll = all.getBoundingSphere(new THREE.Sphere()).radius, rArt = art.getBoundingSphere(new THREE.Sphere()).radius;
    const zoom = (rAll / rArt) * (W / H > 2.2 ? 1.12 : 1.18);
    const aim = ((art.min.y + art.max.y) / 2 - all.min.y) / (all.max.y - all.min.y);
    return { group: root, view: { az: 0.42, el: 0.1 }, aim, zoom, blob: 0, swing: 0.6 };
  };
}
