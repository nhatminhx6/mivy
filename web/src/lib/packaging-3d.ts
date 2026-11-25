'use client';
// Thành phẩm 3D hộp / túi giấy bằng three.js — chủ shop không rành in vẫn hình dung được món đồ in ra trông thế nào.
// Render 100% trên máy khách (WebGL), không gọi AI. Texture mỗi mặt vẽ bằng Canvas 2D: màu giấy + vân/sợi giấy kraft,
// thương hiệu, mã vạch, lỗ xỏ quai, nếp gấp hông túi. Ánh sáng studio + bóng đổ mềm + tone-map Neutral (giữ đúng màu).
// Chỉ import động (await import) từ component client → không vào bundle SSR / bundle đầu trang.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, isDark, type Builder, type View } from './mockup3d';
import { carryArt, carryDims, drawArt, pkgFont, pkgPalette, pkgSize, type Art, type CarryPanel, type PkgData, type PkgFont, type PkgPalette, type PkgSpec } from './packaging-engine';

const BODY = 'Be Vietnam Pro';


// ======================= TEXTURE GIẤY =======================
let noiseTile: HTMLCanvasElement | null = null;
function noise(): HTMLCanvasElement {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const ctx = c.getContext('2d')!; const im = ctx.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 100; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  ctx.putImageData(im, 0, 0);
  return (noiseTile = c);
}


interface Face { c: HTMLCanvasElement; ctx: CanvasRenderingContext2D; k: number; W: number; H: number }

// tấm giấy wMm×hMm: màu nền + (kraft: loang màu + sợi giấy) + hạt giấy
function paper(wMm: number, hMm: number, color: string, kraft: boolean): Face {
  const k = Math.min(8, 2048 / Math.max(wMm, hMm));
  const c = document.createElement('canvas');
  c.width = Math.max(4, Math.round(wMm * k)); c.height = Math.max(4, Math.round(hMm * k));
  const ctx = c.getContext('2d')!;
  const W = c.width, H = c.height;
  ctx.fillStyle = color; ctx.fillRect(0, 0, W, H);
  if (kraft) {
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = (0.2 + Math.random() * 0.5) * Math.max(W, H);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); const dark = Math.random() < 0.5;
      g.addColorStop(0, dark ? 'rgba(80,50,20,0.07)' : 'rgba(255,240,210,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    const n = Math.min(26000, Math.round(wMm * hMm * 0.3));
    ctx.lineWidth = Math.max(1, k * 0.09);
    for (let i = 0; i < n; i++) {
      const x = Math.random() * W, y = Math.random() * H, len = (0.4 + Math.random() * 2.2) * k, a = Math.random() * Math.PI;
      ctx.strokeStyle = Math.random() < 0.62 ? 'rgba(70,42,16,0.26)' : 'rgba(255,244,222,0.3)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  }
  ctx.save();
  ctx.globalAlpha = kraft ? 0.18 : 0.06; ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(noise(), 'repeat')!; ctx.fillRect(0, 0, W, H);
  ctx.restore();
  return { c, ctx, k, W, H };
}

function txt(ctx: CanvasRenderingContext2D, s: string | undefined, x: number, y: number,
  o: { size: number; max: number; family: string; weight: number; color: string; alpha?: number; align?: CanvasTextAlign }) {
  if (!s) return;
  let size = o.size;
  ctx.font = `${o.weight} ${size}px "${o.family}"`;
  const w = ctx.measureText(s).width;
  if (w > o.max) { size *= o.max / w; ctx.font = `${o.weight} ${size}px "${o.family}"`; }
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1; ctx.fillStyle = o.color; ctx.textAlign = o.align ?? 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
  ctx.restore();
}

const initials = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'M';

// mảng thương hiệu chính (logo vòng + tên + mô tả + web) trong khung (rx,ry,rw,rh)
function hero(f: Face, rx: number, ry: number, rw: number, rh: number, p: PkgPalette, font: PkgFont, d: PkgData) {
  const { ctx, k } = f;
  const cx = rx + rw / 2;
  if (rw / rh > 1.8) { // dải ngang thấp (mặt trước hộp dẹp): 1 dòng tên + mô tả
    txt(ctx, d.brand, cx, ry + rh * 0.58, { size: rh * 0.34, max: rw * 0.86, family: font.family, weight: font.weight, color: p.faceInk });
    txt(ctx, d.tagline, cx, ry + rh * 0.84, { size: rh * 0.12, max: rw * 0.8, family: BODY, weight: 600, color: p.faceInk, alpha: 0.8 });
    return;
  }
  const m = Math.min(rw, rh);
  const r = m * 0.13, cy = ry + rh * 0.3;
  ctx.save(); ctx.strokeStyle = p.accent; ctx.lineWidth = Math.max(1, r * 0.075);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  txt(ctx, initials(d.brand), cx, cy + r * 0.36, { size: r * 0.98, max: r * 1.55, family: font.family, weight: font.weight, color: p.accent });
  txt(ctx, d.brand, cx, ry + rh * 0.56, { size: Math.min(rw * 0.14, rh * 0.09), max: rw * 0.84, family: font.family, weight: font.weight, color: p.faceInk });
  ctx.fillStyle = p.accent; ctx.fillRect(cx - rw * 0.07, ry + rh * 0.597, rw * 0.14, Math.max(1, k * 0.35));
  txt(ctx, d.tagline, cx, ry + rh * 0.67, { size: Math.min(rw * 0.06, rh * 0.04), max: rw * 0.8, family: BODY, weight: 600, color: p.faceInk, alpha: 0.82 });
  txt(ctx, d.website, cx, ry + rh * 0.88, { size: Math.min(rw * 0.052, rh * 0.035), max: rw * 0.7, family: BODY, weight: 600, color: p.accent });
}

// mã vạch EAN giả (mặt sau) — chi tiết nhỏ nhưng làm hộp trông "thật" hẳn
function barcode(f: Face, x: number, y: number, w: number, h: number) {
  const { ctx } = f;
  ctx.fillStyle = '#FFFFFF'; ctx.fillRect(x, y, w, h);
  const pad = w * 0.08, bw = w - pad * 2, bh = h * 0.68, unit = bw / 95;
  ctx.fillStyle = '#111111';
  let cx = x + pad; let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  while (cx < x + pad + bw - unit * 2) {
    const bar = 1 + Math.floor(rnd() * 3), gap = 1 + Math.floor(rnd() * 2);
    ctx.fillRect(cx, y + h * 0.1, bar * unit, bh);
    cx += (bar + gap) * unit;
  }
  txt(ctx, '8 935000 123456', x + w / 2, y + h * 0.94, { size: h * 0.16, max: w * 0.9, family: BODY, weight: 600, color: '#111111' });
}

function tex(f: Face, aniso: number): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(f.c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}

function paperMat(map: THREE.Texture, kraft: boolean, dark: boolean): THREE.Material {
  if (kraft) return new THREE.MeshStandardMaterial({ map, roughness: 0.93, metalness: 0 });
  // giấy in cán màng mờ: hơi có ánh, không bóng loáng
  return new THREE.MeshPhysicalMaterial({ map, roughness: dark ? 0.5 : 0.58, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.42 });
}

// ======================= HỘP =======================
function buildBox(spec: PkgSpec, data: PkgData, aniso: number): THREE.Group {
  const s = pkgSize(spec.size), p = pkgPalette(spec.palette), font = pkgFont(spec.font);
  const kraft = spec.palette === 'kraft', dark = isDark(p.face);
  const flat = s.h < s.d * 0.6; // hộp dẹp: mặt nắp là mặt chính

  // mặt trước
  const front = paper(s.w, s.h, p.face, kraft);
  {
    const ins = 4 * front.k;
    if (Math.min(s.w, s.h) > 45) {
      front.ctx.save(); front.ctx.globalAlpha = 0.45; front.ctx.strokeStyle = p.accent; front.ctx.lineWidth = Math.max(1, 0.3 * front.k);
      front.ctx.strokeRect(ins, ins, front.W - ins * 2, front.H - ins * 2); front.ctx.restore();
    }
    hero(front, 0, 0, front.W, front.H, p, font, flat ? { ...data, website: '' } : data);
    // khấc ngón tay ở mép trên (nắp gài)
    front.ctx.fillStyle = 'rgba(0,0,0,0.16)';
    front.ctx.beginPath(); front.ctx.arc(front.W / 2, 0, Math.min(6 * front.k, front.W * 0.08), 0, Math.PI); front.ctx.fill();
  }
  // mặt sau: ghi chú + web + mã vạch
  const back = paper(s.w, s.h, p.face, kraft);
  {
    const k = back.k;
    const bw = Math.min(back.W * 0.46, 38 * k), bh = Math.min(back.H * 0.2, 20 * k);
    const by = back.H - bh - Math.min(6 * k, back.H * 0.08);
    barcode(back, (back.W - bw) / 2, by, bw, bh);
    const room = by;
    txt(back.ctx, data.note, back.W / 2, room * 0.42, { size: Math.min(back.W * 0.07, room * 0.16), max: back.W * 0.8, family: BODY, weight: 600, color: p.faceInk, alpha: 0.85 });
    txt(back.ctx, data.website, back.W / 2, room * 0.62, { size: Math.min(back.W * 0.055, room * 0.12), max: back.W * 0.7, family: BODY, weight: 600, color: p.accent });
  }
  // 2 mặt hông: tên chạy dọc
  const sideFace = () => {
    const f = paper(s.d, s.h, p.face, kraft);
    if (s.h > s.d * 1.3) {
      f.ctx.save(); f.ctx.translate(f.W / 2, f.H / 2); f.ctx.rotate(-Math.PI / 2);
      txt(f.ctx, data.brand, 0, f.W * 0.14, { size: f.W * 0.36, max: f.H * 0.7, family: font.family, weight: font.weight, color: p.accent, alpha: 0.95 });
      f.ctx.restore();
    } else {
      txt(f.ctx, data.brand, f.W / 2, f.H * 0.6, { size: f.H * 0.26, max: f.W * 0.8, family: font.family, weight: font.weight, color: p.accent });
    }
    return f;
  };
  const right = sideFace(), left = sideFace();
  // nắp trên
  const top = paper(s.w, s.d, p.face, kraft);
  if (flat) hero(top, 0, 0, top.W, top.H, p, font, data);
  else {
    const r = Math.min(top.W, top.H) * 0.26;
    top.ctx.save(); top.ctx.strokeStyle = p.accent; top.ctx.lineWidth = Math.max(1, r * 0.07);
    top.ctx.beginPath(); top.ctx.arc(top.W / 2, top.H / 2, r, 0, Math.PI * 2); top.ctx.stroke(); top.ctx.restore();
    txt(top.ctx, initials(data.brand), top.W / 2, top.H / 2 + r * 0.36, { size: r * 0.98, max: r * 1.55, family: font.family, weight: font.weight, color: p.accent });
  }
  // đường nắp gài (mép trước của nắp)
  top.ctx.fillStyle = 'rgba(0,0,0,0.22)'; top.ctx.fillRect(0, top.H - Math.max(1, 0.4 * top.k), top.W, Math.max(1, 0.4 * top.k));
  const bottom = paper(s.w, s.d, p.face, kraft);

  // thứ tự vật liệu BoxGeometry: +x, -x, +y, -y, +z, -z
  const mats = [
    paperMat(tex(right, aniso), kraft, dark),
    paperMat(tex(left, aniso), kraft, dark),
    paperMat(tex(top, aniso), kraft, dark),
    paperMat(tex(bottom, aniso), kraft, dark),
    paperMat(tex(front, aniso), kraft, dark),
    paperMat(tex(back, aniso), kraft, dark),
  ];
  const w = s.w * S, h = s.h * S, d = s.d * S;
  const geo = new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.01);
  const mesh = new THREE.Mesh(geo, mats);
  mesh.position.y = h / 2;
  mesh.castShadow = true;
  const g = new THREE.Group(); g.add(mesh);
  g.userData.flat = flat;
  return g;
}

// ======================= TÚI =======================
const HOLE_DX = 0.18;   // lỗ quai cách tâm ±18% bề ngang
const HOLE_Y_MM = 25;   // lỗ quai cách miệng túi 25mm

function ropeTexture(color: string, aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = 'rgba(0,0,0,0.32)'; ctx.lineWidth = 7;
  for (let i = -64; i < 128; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2;
  for (let i = -60; i < 128; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 64, 64); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
  return t;
}

function buildBag(spec: PkgSpec, data: PkgData, aniso: number): THREE.Group {
  const s = pkgSize(spec.size), p = pkgPalette(spec.palette), font = pkgFont(spec.font);
  const kraft = spec.palette === 'kraft', dark = isDark(p.face);
  const w = s.w * S, h = s.h * S, d = s.d * S;

  const holes = (f: Face) => {
    const { ctx, k, W } = f;
    for (const sx of [-1, 1]) {
      const x = W / 2 + sx * HOLE_DX * W, y = HOLE_Y_MM * k, r = 3.2 * k;
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = Math.max(1, k * 0.5);
      ctx.beginPath(); ctx.arc(x, y, r * 1.35, 0, Math.PI * 2); ctx.stroke();
    }
  };
  // mặt trước: chừa phần trên cho quai, thương hiệu ở giữa-dưới
  const front = paper(s.w, s.h, p.face, kraft);
  holes(front);
  hero(front, 0, front.H * 0.16, front.W, front.H * 0.8, p, font, data);
  const back = paper(s.w, s.h, p.face, kraft);
  holes(back);
  txt(back.ctx, data.brand, back.W / 2, back.H * 0.55, { size: back.W * 0.09, max: back.W * 0.7, family: font.family, weight: font.weight, color: p.faceInk, alpha: 0.9 });
  txt(back.ctx, data.website, back.W / 2, back.H * 0.62, { size: back.W * 0.045, max: back.W * 0.6, family: BODY, weight: 600, color: p.accent });

  // hông (gusset): nếp gấp giữa + 2 nếp chéo ở đáy — dấu hiệu nhận ra túi giấy
  const side = () => {
    const f = paper(s.d, s.h, p.face, kraft);
    const { ctx, W, H } = f;
    const foldY = H - W / 2;
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.5, 'rgba(0,0,0,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.02)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, foldY);
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(W / 2, foldY); ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = Math.max(1, f.k * 0.35);
    ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, foldY); ctx.lineTo(0, H); ctx.moveTo(W / 2, foldY); ctx.lineTo(W, H); ctx.stroke();
    return f;
  };
  const bottom = paper(s.w, s.d, p.face, kraft);

  const hidden = new THREE.MeshBasicMaterial({ visible: false });
  const outer = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [
    paperMat(tex(side(), aniso), kraft, dark), paperMat(tex(side(), aniso), kraft, dark), hidden,
    paperMat(tex(bottom, aniso), kraft, dark), paperMat(tex(front, aniso), kraft, dark), paperMat(tex(back, aniso), kraft, dark),
  ]);
  outer.position.y = h / 2; outer.castShadow = true;

  // lòng túi: miệng gấp (cùng màu ngoài) + giấy mặt trong
  const innerColor = kraft ? '#A9895F' : dark ? p.side : '#ECE6DA';
  const innerFace = (wMm: number) => {
    const f = paper(wMm, s.h, innerColor, kraft);
    f.ctx.fillStyle = p.face; f.ctx.fillRect(0, 0, f.W, 28 * f.k);
    f.ctx.fillStyle = 'rgba(0,0,0,0.18)'; f.ctx.fillRect(0, 28 * f.k, f.W, Math.max(1, f.k * 0.5));
    const g = f.ctx.createLinearGradient(0, 0, 0, f.H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.35)');
    f.ctx.fillStyle = g; f.ctx.fillRect(0, 0, f.W, f.H);
    return f;
  };
  const inMat = (f: Face) => new THREE.MeshStandardMaterial({ map: tex(f, aniso), roughness: 0.95, side: THREE.BackSide });
  const inner = new THREE.Mesh(new THREE.BoxGeometry(w * 0.994, h * 0.999, d * 0.988), [
    inMat(innerFace(s.d)), inMat(innerFace(s.d)), hidden,
    new THREE.MeshStandardMaterial({ color: innerColor, roughness: 0.95, side: THREE.BackSide }),
    inMat(innerFace(s.w)), inMat(innerFace(s.w)),
  ]);
  inner.position.y = h / 2 + 0.0005;

  // quai dây giấy xoắn
  const ropeMat = new THREE.MeshStandardMaterial({ map: ropeTexture(p.accent, aniso), roughness: 0.85 });
  const r = 2.6 * S;
  const hh = THREE.MathUtils.clamp(w * 0.4, 65 * S, 115 * S);
  const x1 = -w * HOLE_DX, x2 = w * HOLE_DX, yHole = h - HOLE_Y_MM * S;
  const rope = (z: number, sgn: number) => {
    // quai tròn trịa, hơi ngả ra ngoài (quai trước ngả về trước, quai sau ngả ra sau) → 2 quai tách nhau như túi thật
    const lean = hh * 0.32;
    const pts = [
      new THREE.Vector3(x1, yHole, z + sgn * r * 0.7),
      new THREE.Vector3(x1, h + 3 * S, z + sgn * r * 1.4),
      new THREE.Vector3(x1 * 1.04, h + hh * 0.55, z + sgn * lean * 0.55),
      new THREE.Vector3(x1 * 0.62, h + hh * 0.92, z + sgn * lean * 0.9),
      new THREE.Vector3(0, h + hh, z + sgn * lean),
      new THREE.Vector3(x2 * 0.62, h + hh * 0.92, z + sgn * lean * 0.9),
      new THREE.Vector3(x2 * 1.04, h + hh * 0.55, z + sgn * lean * 0.55),
      new THREE.Vector3(x2, h + 3 * S, z + sgn * r * 1.4),
      new THREE.Vector3(x2, yHole, z + sgn * r * 0.7),
    ];
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 160, r, 12, false);
    const m = ropeMat.clone(); m.map = ropeMat.map!.clone(); m.map.needsUpdate = true;
    m.map.repeat.set(curve.getLength() / (7 * S), 1);
    const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true;
    return mesh;
  };

  const g = new THREE.Group();
  g.add(outer, inner, rope(d / 2, 1), rope(-d / 2, -1));
  return g;
}


// ======================= HỘP QUAI XÁCH =======================
// Thân hộp + 2 mái dốc + 2 đầu hồi tam giác + 2 tấm quai dán áp nhau có lỗ xỏ tay khoét thủng (ExtrudeGeometry có lỗ).
// Hoạ tiết mỗi mặt lấy đúng Art của khuôn bế (carryArt) → 3D và file in khớp nhau. Dựng theo mm rồi scale S.
function artFace(art: Art, kraft: boolean): Face {
  const f = paper(art.w, art.h, art.bg, kraft);
  drawArt(f.ctx, art, f.k);
  return f;
}

function buildCarry(spec: PkgSpec, data: PkgData, aniso: number): THREE.Group {
  const s = pkgSize(spec.size), p = pkgPalette(spec.palette);
  const c = carryDims(s);
  const kraft = spec.palette === 'kraft', dark = isDark(p.face);
  const T = 0.8; // độ dày bìa (mm)
  const { w, d, h, rH, L, hH } = c;
  const mat = (panel: CarryPanel, uv?: { rx: number; ry: number; ox?: number }) => {
    const t = tex(artFace(carryArt(panel, spec, data), kraft), aniso);
    if (uv) { t.repeat.set(uv.rx, uv.ry); t.offset.set(uv.ox ?? 0, 0); }
    return paperMat(t, kraft, dark);
  };
  // mép bìa: kraft nâu; bìa in (C300/ivory) lõi trắng ngà
  const edge = new THREE.MeshStandardMaterial({ color: kraft ? '#A27E54' : '#ECE7DD', roughness: 0.9 });
  const inside = new THREE.MeshStandardMaterial({ color: kraft ? '#B08C60' : '#F1EDE5', roughness: 0.95 });

  const root = new THREE.Group();
  const shade = (o: THREE.Object3D) => { o.traverse((n) => { if ((n as THREE.Mesh).isMesh) n.castShadow = true; }); return o; };

  // thân: +x, -x, +y, -y, +z (trước), -z (sau)
  const sideM = mat('side');
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideM, sideM, inside, mat('bottom'), mat('front'), mat('back')]);
  body.position.y = h / 2;
  root.add(body);

  // 1 nửa mái + quai (nửa trước); nửa sau = xoay 180° quanh trục đứng
  const roofM = mat('roof');
  const handleM = mat('handle', { rx: 1 / w, ry: 1 / hH });
  const hs = new THREE.Shape();
  const rc = c.rc;
  hs.moveTo(0, 0); hs.lineTo(w, 0); hs.lineTo(w, hH - rc); hs.absarc(w - rc, hH - rc, rc, 0, Math.PI / 2, false);
  hs.lineTo(rc, hH); hs.absarc(rc, hH - rc, rc, Math.PI / 2, Math.PI, false); hs.lineTo(0, 0);
  {
    const r = c.holeH / 2, cx = w / 2, cy = hH - c.holeTop - r, hw = c.holeW / 2 - r;
    const hp = new THREE.Path();
    hp.moveTo(cx - hw, cy - r); hp.lineTo(cx + hw, cy - r); hp.absarc(cx + hw, cy, r, -Math.PI / 2, Math.PI / 2, false);
    hp.lineTo(cx - hw, cy + r); hp.absarc(cx - hw, cy, r, Math.PI / 2, Math.PI * 1.5, false);
    hs.holes.push(hp);
  }
  const handleGeo = new THREE.ExtrudeGeometry(hs, { depth: T, bevelEnabled: false, curveSegments: 28 });
  const roofGeo = new THREE.BoxGeometry(w, L, T);
  const half = () => {
    const g = new THREE.Group();
    const roof = new THREE.Mesh(roofGeo, [edge, edge, edge, edge, roofM, inside]);
    roof.rotation.x = -Math.atan2(d / 2, rH);
    const n = new THREE.Vector3(0, d / 2 / L, rH / L);
    roof.position.set(0, h + rH / 2, d / 4).addScaledVector(n, T / 2);
    const handle = new THREE.Mesh(handleGeo, [handleM, edge]);
    handle.position.set(-w / 2, h + rH - 0.2, 0);
    g.add(roof, handle);
    return g;
  };
  const back = half(); back.rotation.y = Math.PI;
  root.add(half(), back);

  // 2 đầu hồi tam giác (hông vươn lên dưới mái)
  const gs = new THREE.Shape();
  gs.moveTo(-d / 2, 0); gs.lineTo(d / 2, 0); gs.lineTo(0, rH); gs.lineTo(-d / 2, 0);
  const gableGeo = new THREE.ExtrudeGeometry(gs, { depth: T, bevelEnabled: false });
  const gableM = mat('gable', { rx: 1 / d, ry: 1 / rH, ox: 0.5 });
  for (const sg of [1, -1]) {
    const m = new THREE.Mesh(gableGeo, [gableM, edge]);
    m.rotation.y = (sg * Math.PI) / 2;
    m.position.set(sg * (w / 2 - T), h, 0);
    root.add(m);
  }

  shade(root);
  root.scale.setScalar(S);
  const g = new THREE.Group(); g.add(root);
  return g;
}


// ======================= BUILDER =======================
const defaultView = (spec: PkgSpec): View => {
  const s = pkgSize(spec.size);
  if (spec.kind === 'carry') return { az: 0.6, el: s.h < s.d * 0.6 ? 0.42 : 0.3 };
  return { az: 0.62, el: spec.kind === 'box' && s.h < s.d * 0.6 ? 0.62 : spec.kind === 'bag' ? 0.3 : 0.34 };
};

export function packagingBuilder(spec: PkgSpec, data: PkgData): Builder {
  return (aniso) => ({
    group: spec.kind === 'box' ? buildBox(spec, data, aniso) : spec.kind === 'carry' ? buildCarry(spec, data, aniso) : buildBag(spec, data, aniso),
    view: defaultView(spec),
  });
}
