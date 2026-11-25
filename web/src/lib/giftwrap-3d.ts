'use client';
// Giấy gói quà 3D. Texture = 1 ô lặp SVG của khách, lặp đúng kích thước thật (ô T mm) trên mọi mặt.
// Couche / kraft: hộp quà gói giấy (đầu hộp gấp nếp tam giác, mép giấy chồng trên nắp, dải ruy băng + nơ)
// + cuộn giấy nằm cạnh, kéo ra 1 đoạn trải trên bàn.
// Pelure: hộp mở, giấy lụa mỏng nhàu bọc chiếc áo gấp bên trong, 2 vạt chồng giữa + tem tròn dán.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { GWKind } from './giftwrap-engine';

export interface GW3DOpts {
  tile: SVGSVGElement | null; // ô lặp (mode 'tile', có màu giấy)
  tileMm: number; kind: GWKind; paperHex: string; ribbonHex: string; inkHex: string; initials: string; fontCss: string;
}

const isDarkHex = (h: string) => { const n = parseInt(h.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 110; };
function rnd(seed: number) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// nhiễu xơ giấy (bump) — lặp liền mạch
let fiberC: HTMLCanvasElement | null = null;
function fiberTex(aniso: number, rep: number): THREE.Texture {
  if (!fiberC) {
    const n = 512; fiberC = document.createElement('canvas'); fiberC.width = fiberC.height = n;
    const x = fiberC.getContext('2d')!; x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
    const R = rnd(11);
    for (let i = 0; i < 5000; i++) {
      const px = R() * n, py = R() * n, len = 2 + R() * 10, a = R() * Math.PI;
      x.strokeStyle = R() < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.25)'; x.lineWidth = 0.8;
      for (const ox of [-n, 0, n]) for (const oy of [-n, 0, n]) {
        x.beginPath(); x.moveTo(px + ox, py + oy); x.lineTo(px + ox + Math.cos(a) * len, py + oy + Math.sin(a) * len); x.stroke();
      }
    }
  }
  const t = canvasTex(fiberC, aniso); t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep);
  return t;
}

// nếp nhàu giấy lụa (bump) — nhiều vệt gãy
function crinkleTex(aniso: number): THREE.Texture {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!; x.fillStyle = '#808080'; x.fillRect(0, 0, n, n);
  const R = rnd(5);
  for (let i = 0; i < 260; i++) {
    const px = R() * n, py = R() * n, a = R() * Math.PI, len = 20 + R() * 90;
    x.strokeStyle = R() < 0.5 ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.35)'; x.lineWidth = 1 + R() * 1.5;
    x.beginPath(); x.moveTo(px, py);
    let qx = px, qy = py, aa = a;
    for (let k = 0; k < 4; k++) { aa += (R() - 0.5) * 0.9; qx += Math.cos(aa) * len / 4; qy += Math.sin(aa) * len / 4; x.lineTo(qx, qy); }
    x.stroke();
  }
  const t = canvasTex(c, aniso); t.colorSpace = THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** bản sao texture ô lặp, repeat theo mm (UV hình học tính bằng mm → repeat = 1/T) hoặc theo số ô */
function rep(base: THREE.Texture, rx: number, ry: number, ox = 0, oy = 0): THREE.Texture {
  const t = base.clone(); t.needsUpdate = true;
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.offset.set(ox, oy);
  return t;
}

function paperMat(map: THREE.Texture, kind: GWKind, bump: THREE.Texture | null): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    map, roughness: kind === 'kraft' ? 0.88 : 0.42, clearcoat: kind === 'couche' ? 0.35 : 0, clearcoatRoughness: 0.35,
    bumpMap: bump ?? undefined, bumpScale: kind === 'kraft' ? 0.6 : 0.15,
  });
}

// dải mỏng (ruy băng) chạy theo đường cong: pts = tâm dải, side = hướng bề ngang
function stripAlong(pts: THREE.Vector3[], side: THREE.Vector3[], w: number, thick: number): THREE.BufferGeometry {
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], s = side[i].clone().multiplyScalar(w / 2);
    pos.push(p.x - s.x, p.y - s.y, p.z - s.z, p.x + s.x, p.y + s.y, p.z + s.z);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  void thick;
  return g;
}

// ---------- hộp quà gói giấy ----------
function giftBox(base: THREE.Texture, o: GW3DOpts, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const T = o.tileMm, W = 200, H = 80, D = 140; // mm
  const bump = fiberTex(aniso, 6);
  const m = (rx: number, ry: number, ox = 0, oy = 0) => paperMat(rep(base, rx, ry, ox, oy), o.kind, bump);
  // BoxGeometry: +x, −x, +y, −y, +z, −z
  const body = new THREE.Mesh(new THREE.BoxGeometry(W * S, H * S, D * S), [
    m(D / T, H / T), m(D / T, H / T), m(W / T, D / T, 0.13, 0.31), m(W / T, D / T), m(W / T, H / T, 0.21, 0), m(W / T, H / T),
  ]);
  body.position.y = (H / 2) * S; body.castShadow = true; body.receiveShadow = true;
  g.add(body);

  const shade = new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.2, depthWrite: false });
  // bóng mềm dưới mép vạt: gradient đậm → trong
  const sc = document.createElement('canvas'); sc.width = 4; sc.height = 64;
  const sx2 = sc.getContext('2d')!; const gr = sx2.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.42)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sx2.fillStyle = gr; sx2.fillRect(0, 0, 4, 64);
  const softShade = new THREE.MeshBasicMaterial({ map: canvasTex(sc, aniso), transparent: true, depthWrite: false });
  // mép giấy chồng trên nắp (vạt trên cùng phủ từ z0 tới mép sau) + bóng mảnh dưới mép
  const z0 = D * 0.18;
  const over = new THREE.Mesh(new THREE.PlaneGeometry(W * S, (D / 2 - z0) * S), m(W / T, (D / 2 - z0) / T, 0.47, 0.12));
  over.rotation.x = -Math.PI / 2; over.position.set(0, (H + 0.35) * S, ((z0 + D / 2) / 2) * S);
  g.add(over);
  const lip = new THREE.Mesh(new THREE.PlaneGeometry(W * S, 1.6 * S), shade);
  lip.rotation.x = -Math.PI / 2; lip.position.set(0, (H + 0.2) * S, (z0 - 0.8) * S);
  g.add(lip);
  // đường gập mép (mép giấy gấp vào → vạch sáng mảnh)
  const fold = new THREE.Mesh(new THREE.PlaneGeometry(W * S, 0.7 * S), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.35, depthWrite: false }));
  fold.rotation.x = -Math.PI / 2; fold.position.set(0, (H + 0.4) * S, (z0 + 0.4) * S);
  g.add(fold);

  // 2 đầu hộp: vạt trên gập xuống, vạt dưới gập lên (hình thang cạnh 45°), bóng dưới mép vạt + miếng băng keo
  const h1 = Math.min(H * 0.58, D * 0.45), h2 = Math.min(H - h1 + 9, D * 0.45);
  for (const sx of [1, -1]) {
    const end = new THREE.Group();
    end.position.set((sx * W / 2) * S, (H / 2) * S, 0);
    end.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2;
    const flap = (pts: [number, number][], z: number, ox: number, oy: number, tint: string) => {
      const sh = new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)));
      const geo = new THREE.ShapeGeometry(sh);
      const mat = paperMat(rep(base, 1 / T, 1 / T, ox, oy), o.kind, bump); mat.color.set(tint);
      const mesh = new THREE.Mesh(geo, mat);
      mesh.scale.set(S, S, S); mesh.position.z = z * S;
      end.add(mesh);
      return mesh;
    };
    const shadowStrip = (a: [number, number], b: [number, number], z: number) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const st = new THREE.Mesh(new THREE.PlaneGeometry(len * S, 4 * S), softShade);
      st.position.set(((a[0] + b[0]) / 2) * S, ((a[1] + b[1]) / 2) * S, z * S);
      st.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
      st.translateY(-1.4 * S);
      end.add(st);
    };
    const hd = D / 2, hh = H / 2;
    // vạt trên
    const top: [number, number][] = [[-hd, hh], [hd, hh], [hd - h1, hh - h1], [-hd + h1, hh - h1]];
    shadowStrip([-hd + h1, hh - h1], [hd - h1, hh - h1], 0.25);
    shadowStrip([hd, hh], [hd - h1, hh - h1], 0.25);
    shadowStrip([-hd + h1, hh - h1], [-hd, hh], 0.25);
    flap(top, 0.4, 0.37, 0.61, '#F3F1EE');
    // vạt dưới (nằm trên cùng, mép trên gấp gọn)
    const bot: [number, number][] = [[-hd, -hh], [hd, -hh], [hd - h2, -hh + h2], [-hd + h2, -hh + h2]];
    shadowStrip([hd - h2, -hh + h2], [-hd + h2, -hh + h2], 0.7);
    flap(bot, 0.9, 0.11, 0.27, '#FFFFFF');
    // nền đầu hộp (2 tai gấp 2 bên) tối hơn chút → 2 vạt nổi lên
    const earShade = new THREE.Mesh(new THREE.PlaneGeometry(D * S, H * S), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.07, depthWrite: false }));
    earShade.position.z = 0.15 * S; end.add(earShade);
    g.add(end);
  }

  // ruy băng quấn quanh hộp theo chiều sâu (x = xr) + nơ trên nắp
  const ribbon = new THREE.MeshPhysicalMaterial({ color: o.ribbonHex, roughness: 0.34, sheen: 0.55, sheenRoughness: 0.4, sheenColor: new THREE.Color('#ffffff'), clearcoat: 0.25, clearcoatRoughness: 0.3, side: THREE.DoubleSide });
  const xr = W * 0.18, rw = 20, t = 0.9;
  const band = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d * S), ribbon);
    b.position.set(x * S, y * S, z * S); b.castShadow = true; g.add(b);
  };
  band(rw, t, D + 2 * t + 0.8, xr, H + t / 2 + 0.5, 0);
  band(rw, H + 2 * t, t, xr, H / 2, D / 2 + t / 2 + 0.2);
  band(rw, H + 2 * t, t, xr, H / 2, -D / 2 - t / 2 - 0.2);
  // nơ: 2 vòng + nút + 2 đuôi
  const topY = H + t + 0.6;
  for (const sgn of [1, -1]) {
    const pts: THREE.Vector3[] = [], side: THREE.Vector3[] = [];
    const L = 44, Hh = 30, N = 48;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const u = (L * (1 - Math.cos(a))) / 2, v = Hh * Math.sin(a) * (0.55 + 0.45 * (1 - Math.cos(a)) / 2);
      pts.push(new THREE.Vector3((xr + sgn * u * 0.92) * S, (topY + 3 + Math.max(0, v) * 0.9 + Math.min(0, v) * 0.12 + u * 0.18) * S, (sgn * u * 0.22) * S));
      side.push(new THREE.Vector3(-0.22 * sgn, 0, 0.97).normalize());
    }
    const loop = new THREE.Mesh(stripAlong(pts, side, rw * S * 0.95, 0), ribbon);
    loop.castShadow = true; g.add(loop);
    // đuôi nằm trên nắp, cắt chữ V
    const tl = 70, sh = new THREE.Shape([new THREE.Vector2(0, -rw * 0.45), new THREE.Vector2(tl, -rw * 0.45), new THREE.Vector2(tl - 9, 0), new THREE.Vector2(tl, rw * 0.45), new THREE.Vector2(0, rw * 0.45)]);
    const tail = new THREE.Mesh(new THREE.ShapeGeometry(sh), ribbon);
    tail.scale.set(S, S, S); tail.rotation.x = -Math.PI / 2;
    tail.rotation.z = sgn > 0 ? -0.55 : Math.PI + 0.75;
    tail.position.set(xr * S, (topY + 0.15) * S, (sgn * 4) * S);
    tail.castShadow = true; g.add(tail);
  }
  const knot = new THREE.Mesh(new RoundedBoxGeometry(14 * S, 10 * S, rw * 0.95 * S, 3, 3 * S), ribbon);
  knot.position.set(xr * S, (topY + 5) * S, 0); knot.castShadow = true; g.add(knot);
  return g;
}

// ---------- cuộn giấy + 1 đoạn kéo ra trên bàn ----------
function roll(base: THREE.Texture, o: GW3DOpts, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const T = o.tileMm, L = 260, r = 22, rc = 13, sheetLen = 170;
  const bump = fiberTex(aniso, 6);
  const circ = 2 * Math.PI * r;
  const cg = new THREE.CylinderGeometry(r * S, r * S, L * S, 72, 1, true);
  { // UV: u dọc chiều dài cuộn, v quanh chu vi (mm / T) → chữ chạy dọc cuộn như giấy thật
    const uv = cg.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) { const a = uv.getX(i), b = uv.getY(i); uv.setXY(i, ((1 - b) * L) / T, (a * circ) / T); }
  }
  const cyl = new THREE.Mesh(cg, paperMat(rep(base, 1, 1), o.kind, bump));
  cyl.rotation.z = Math.PI / 2; cyl.position.y = r * S; cyl.castShadow = true; cyl.receiveShadow = true;
  g.add(cyl);
  // mặt cắt 2 đầu: vòng giấy cuộn + lõi giấy
  const ringC = document.createElement('canvas'); ringC.width = ringC.height = 256;
  const rx = ringC.getContext('2d')!; rx.fillStyle = o.paperHex; rx.fillRect(0, 0, 256, 256);
  for (let rr = (rc / r) * 128; rr < 128; rr += 2.2) { rx.strokeStyle = 'rgba(0,0,0,0.13)'; rx.lineWidth = 0.8; rx.beginPath(); rx.arc(128, 128, rr, 0, Math.PI * 2); rx.stroke(); }
  const ringMat = new THREE.MeshStandardMaterial({ map: canvasTex(ringC, aniso), roughness: 0.8, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshStandardMaterial({ color: '#B08A5E', roughness: 0.9, side: THREE.DoubleSide });
  for (const sx of [1, -1]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(rc * S, r * S, 72), ringMat);
    ring.rotation.y = sx * Math.PI / 2; ring.position.set((sx * L / 2) * S, r * S, 0);
    g.add(ring);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(rc * S, rc * S, 6 * S, 40, 1, true), coreMat);
    core.rotation.z = Math.PI / 2; core.position.set((sx * (L / 2 + 0.5)) * S, r * S, 0); g.add(core);
  }
  // đoạn giấy kéo ra: chui dưới cuộn, trải phẳng, cuối hơi cong lên
  const seg = 60;
  const geo = new THREE.PlaneGeometry(L * S, sheetLen * S, 1, seg);
  const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const vx = pos.getX(i) / S, vy = pos.getY(i) / S; // vy: −len/2 (sát cuộn) → +len/2 (đầu tự do)
    const d = vy + sheetLen / 2; // khoảng cách từ cuộn
    const curl = d > sheetLen - 40 ? Math.pow((d - (sheetLen - 40)) / 40, 2) * 9 : 0;
    pos.setXYZ(i, vx * S, (0.35 + curl) * S, d * S);
    uv.setXY(i, (vx + L / 2) / T, (circ * 0.6 - d) / T); // đỉnh chữ hướng về phía cuộn
  }
  geo.computeVertexNormals();
  const sheetMap = base.clone(); sheetMap.needsUpdate = true; sheetMap.wrapS = sheetMap.wrapT = THREE.RepeatWrapping;
  const sheet = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: sheetMap, roughness: o.kind === 'kraft' ? 0.88 : 0.45, clearcoat: o.kind === 'couche' ? 0.3 : 0, side: THREE.DoubleSide, bumpMap: bump, bumpScale: 0.15 }));
  sheet.receiveShadow = true; sheet.castShadow = true;
  g.add(sheet);
  return g;
}

// ---------- pelure: hộp mở + giấy lụa bọc áo ----------
function pelureScene(base: THREE.Texture, o: GW3DOpts, aniso: number): THREE.Group {
  const g = new THREE.Group();
  const T = o.tileMm, W = 270, D = 200, H = 72, wt = 2.6;
  const darkPaper = isDarkHex(o.paperHex);
  const boxMat = new THREE.MeshStandardMaterial({ color: darkPaper ? '#EEE9E1' : '#A88563', roughness: 0.78, bumpMap: fiberTex(aniso, 5), bumpScale: 0.4 });
  const inner = new THREE.MeshStandardMaterial({ color: darkPaper ? '#E2DCD2' : '#957252', roughness: 0.85 });
  const slab = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * S, h * S, d * S), mat);
    b.position.set(x * S, y * S, z * S); b.castShadow = true; b.receiveShadow = true; g.add(b); return b;
  };
  slab(W, wt, D, 0, wt / 2, 0, inner);
  slab(W, H, wt, 0, H / 2, D / 2 - wt / 2, boxMat);
  slab(W, H, wt, 0, H / 2, -D / 2 + wt / 2, boxMat);
  slab(wt, H, D, W / 2 - wt / 2, H / 2, 0, boxMat);
  slab(wt, H, D, -W / 2 + wt / 2, H / 2, 0, boxMat);
  // áo gấp bên trong (thấy mờ qua giấy lụa + ở khe giữa 2 vạt)
  const shirt = new THREE.Mesh(new RoundedBoxGeometry((W - 40) * S, 34 * S, (D - 34) * S, 4, 8 * S), new THREE.MeshStandardMaterial({ color: '#9FB3C8', roughness: 0.95 }));
  shirt.position.set(0, (wt + 17) * S, 0); shirt.receiveShadow = true; g.add(shirt);
  const topY = wt + 34;

  // 2 vạt giấy lụa: từ ngoài thành hộp (thả xuống) → vắt qua mép → phủ lên áo → chồng ở giữa; nhàu nhẹ
  const crk = crinkleTex(aniso);
  const tissue = (sgn: number, lift: number, seed: number, uvo: number) => {
    const span = W - 8, len = D / 2 + 70, sx = 50, sz = 60;
    const geo = new THREE.PlaneGeometry(span * S, len * S, sx, sz);
    const pos = geo.attributes.position as THREE.BufferAttribute, uv = geo.attributes.uv as THREE.BufferAttribute;
    const R = rnd(seed); const bumps = Array.from({ length: 18 }, () => [R() * span - span / 2, R() * len, 6 + R() * 22, (R() - 0.3) * 5] as const);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i) / S, v = pos.getY(i) / S + len / 2; // v: 0 = mép ngoài, len = mép tự do (giữa hộp)
      // mặt cắt dọc z: thả ngoài thành → mép hộp → vào trong phủ áo
      let y: number, zz: number;
      const over = 28; // phần thả bên ngoài thành
      if (v < over) { zz = D / 2 + 2 + (over - v) * 0.12; y = H + 1 - (over - v) * 0.95; }
      else { const t = v - over; zz = D / 2 - t; y = H + 1.5 - Math.min(1, t / 26) * (H + 1.5 - topY - 1.5) + Math.sin(Math.min(1, t / 26) * Math.PI) * 4; }
      let n = 0;
      for (const [bx, bv, br, ba] of bumps) { const d = Math.hypot(x - bx, v - bv) / br; if (d < 1) n += ba * (1 - d * d); }
      n += Math.sin(x * 0.09 + seed) * 0.8 + Math.sin(v * 0.13 + x * 0.05) * 0.6;
      const edgeX = Math.abs(x) > W / 2 - 22 ? Math.pow((Math.abs(x) - (W / 2 - 22)) / 18, 2) * 14 : 0; // mép 2 bên rủ xuống trong thành hộp
      const free = v > len - 14 ? (v - (len - 14)) * 0.18 : 0; // mép tự do hơi vểnh
      pos.setXYZ(i, x * S, (y + n * (v > over ? 1 : 0.4) + lift - edgeX + free) * S, (sgn * zz) * S);
      uv.setXY(i, (sgn > 0 ? x + span / 2 : span / 2 - x) / T, (v + uvo) / T); // vạt đối diện lật gương → đảo u cho chữ không ngược
    }
    geo.computeVertexNormals();
    const map = base.clone(); map.needsUpdate = true; map.wrapS = map.wrapT = THREE.RepeatWrapping;
    const mesh = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({
      map, transparent: true, opacity: 0.86, roughness: 0.82, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color('#ffffff'),
      bumpMap: crk, bumpScale: 0.9, side: THREE.DoubleSide, depthWrite: true,
    }));
    mesh.castShadow = true; mesh.receiveShadow = true;
    g.add(mesh);
  };
  tissue(1, 0, 3, 0);
  tissue(-1, 1.6, 9, 17);
  // tem tròn dán giữa 2 vạt
  const sc = document.createElement('canvas'); sc.width = sc.height = 256;
  const sx = sc.getContext('2d')!;
  sx.fillStyle = o.inkHex; sx.beginPath(); sx.arc(128, 128, 126, 0, Math.PI * 2); sx.fill();
  sx.strokeStyle = 'rgba(255,255,255,0.85)'; sx.lineWidth = 5; sx.beginPath(); sx.arc(128, 128, 104, 0, Math.PI * 2); sx.stroke();
  sx.fillStyle = '#FFFFFF'; sx.textAlign = 'center'; sx.textBaseline = 'middle';
  sx.font = `800 ${o.initials.length > 2 ? 70 : 92}px "Playfair Display", serif`; sx.fillText(o.initials, 128, 136);
  const seal = new THREE.Mesh(new THREE.CircleGeometry(19 * S, 48), new THREE.MeshPhysicalMaterial({ map: canvasTex(sc, aniso), roughness: 0.35, clearcoat: 0.6, transparent: true }));
  seal.rotation.x = -Math.PI / 2; seal.position.set(0, (topY + 6.5) * S, 6 * S);
  g.add(seal);
  // nắp hộp dựng nghiêng phía sau
  const lid = new THREE.Mesh(new RoundedBoxGeometry((W + 8) * S, 20 * S, (D + 8) * S, 3, 2 * S), boxMat);
  lid.rotation.x = -1.15; lid.position.set(0, ((D + 8) / 2 * 0.91 + 4) * S, (-D / 2 - 34) * S);
  lid.castShadow = true; g.add(lid);
  return g;
}

export function giftwrapBuilder(o: GW3DOpts): Builder {
  return async (aniso) => {
    if (!o.tile) throw new Error('Chưa dựng xong ô lặp');
    const base = await svgTex(o.tile, o.fontCss, 1024, aniso, o.paperHex);
    base.wrapS = base.wrapT = THREE.RepeatWrapping;
    const out = new THREE.Group();
    if (o.kind === 'pelure') {
      out.add(pelureScene(base, o, aniso));
      return { group: out, view: { az: 0.2, el: 0.62 }, aim: 0.3, zoom: 1.3, blob: 0.5 };
    }
    const box = giftBox(base, o, aniso);
    box.rotation.y = -0.42;
    box.position.set(-50 * S, 0, 50 * S);
    out.add(box);
    const r = roll(base, o, aniso);
    r.rotation.y = 0.3;
    r.position.set(140 * S, 0, -120 * S);
    out.add(r);
    return { group: out, view: { az: 0.42, el: 0.4 }, aim: 0.3, zoom: 1.55, blob: 0.45 };
  };
}
