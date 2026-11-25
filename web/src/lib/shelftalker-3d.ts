'use client';
// POSM 3D: 1 khoang kệ siêu thị (vách lỗ, 2 tầng tôn, rãnh giá phía trước), hàng hoá chung chung (hộp, chai, lọ — không
// thương hiệu thật), shelf strip cài rãnh tầng dưới, tem giá cài rãnh tầng trên, wobbler trên cần PVC trong chìa ra lắc nhẹ,
// bảng treo trần 2 mặt treo dây cước. Texture = SVG thiết kế của khách (đã nhúng font).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { S, canvasTex, svgTex, type Builder } from './mockup3d';
import type { Industry, StKind } from './shelftalker-engine';

export interface Cut { el: SVGSVGElement | null; d: string; W: number; H: number; holes: { cx: number; cy: number; r: number }[] }
export interface Shelf3DOpts {
  kind: StKind;
  wob: Cut; danFront: Cut; danBack: Cut;
  strip: SVGSVGElement | null; stripW: number; stripH: number;
  tags: SVGSVGElement[]; tagW: number; tagH: number;
  fontCss: string; industry: Industry; accent: string;
}

const NS = 'http://www.w3.org/2000/svg';
function shapesOf(d: string, holes: Cut['holes'] = []): THREE.Shape[] {
  const data = new SVGLoader().parse(`<svg xmlns="${NS}"><path d="${d}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  for (const h of holes) {
    const host = shapes.find((s) => new THREE.Box2().setFromPoints(s.getPoints(24)).containsPoint(new THREE.Vector2(h.cx, h.cy))) ?? shapes[0];
    const p = new THREE.Path(); p.absarc(h.cx, h.cy, h.r, 0, Math.PI * 2, true); host?.holes.push(p);
  }
  return shapes;
}

// vách lỗ (pegboard) xám nhạt
function pegTex(aniso: number): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const x = c.getContext('2d')!;
  x.fillStyle = '#D9DCE1'; x.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
    x.fillStyle = '#8C929B'; x.beginPath(); x.arc(16 + i * 32, 16 + j * 32, 4.2, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.arc(16 + i * 32 + 1, 16 + j * 32 + 1.4, 4.2, 0, Math.PI); x.fill();
  }
  const t = canvasTex(c, aniso); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// nhãn hàng chung chung (không thương hiệu): khối màu + dải trắng + chữ loại hàng
const WORDS: Record<Industry, string[]> = {
  grocery: ['BÁNH QUY', 'SỮA TƯƠI', 'NƯỚC SUỐI', 'MÌ LY', 'DẦU ĂN', 'SNACK', 'NƯỚC NGỌT', 'GẠO'],
  pharmacy: ['VITAMIN', 'SIRO', 'KHẨU TRANG', 'NƯỚC MUỐI', 'DẦU GIÓ', 'BĂNG GẠC', 'KẸO NGẬM', 'SỮA TẮM'],
  baby: ['TÃ BÉ', 'SỮA BỘT', 'KHĂN ƯỚT', 'BÌNH SỮA', 'NƯỚC GIẶT', 'ĂN DẶM', 'SỮA TẮM', 'BÁNH BÉ'],
  beauty: ['SERUM', 'KEM DƯỠNG', 'TẨY TRANG', 'SỮA RỬA MẶT', 'CHỐNG NẮNG', 'MẶT NẠ', 'TONER', 'DẦU GỘI'],
  electronics: ['NỒI CƠM', 'ẤM ĐUN', 'MÁY SẤY', 'QUẠT', 'BÀN ỦI', 'LÒ VI SÓNG', 'MÁY XAY', 'ĐÈN LED'],
};
const COLORS = ['#2F6FDE', '#F2A33A', '#2FA36B', '#D94B5B', '#7C5CC4', '#1FA4B8', '#E3743A', '#3D4A5C'];
function labelTex(word: string, color: string, aniso: number, tall = false, wide = false): THREE.CanvasTexture {
  const W = wide ? 768 : 256, H = wide ? 256 : tall ? 384 : 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, color); g.addColorStop(1, shade(color, -0.18));
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = 'rgba(255,255,255,0.16)'; x.beginPath(); x.arc(W * 0.85, H * 0.15, W * 0.4, 0, Math.PI * 2); x.fill();
  x.fillStyle = '#FFFFFF'; x.fillRect(0, H * 0.42, W, H * 0.24);
  const fs0 = wide ? H * 0.2 : W * 0.12;
  x.fillStyle = color; x.font = `800 ${Math.round(fs0)}px "Be Vietnam Pro", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  let fs = fs0; while (x.measureText(word).width > (wide ? W * 0.34 : W * 0.86) && fs > 12) { fs -= 2; x.font = `800 ${Math.round(fs)}px "Be Vietnam Pro", sans-serif`; }
  x.fillText(word, W / 2, H * 0.54);
  x.fillStyle = 'rgba(255,255,255,0.85)';
  if (wide) { x.fillRect(W * 0.36, H * 0.76, W * 0.2, 5); x.fillRect(W * 0.36, H * 0.82, W * 0.12, 5); }
  else { x.fillRect(W * 0.12, H * 0.76, W * 0.5, 5); x.fillRect(W * 0.12, H * 0.82, W * 0.32, 5); }
  return canvasTex(c, aniso);
}
function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16); const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + (k < 0 ? v * k : (255 - v) * k))));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}

// thẻ in bế hình (mm, y xuống): lõi giấy trắng dày + mặt trước (và mặt sau nếu có) dán texture
async function cardMesh(front: Cut, back: Cut | null, aniso: number, fontCss: string, thick = 0.9): Promise<THREE.Group> {
  const g = new THREE.Group(); // hệ mm, y xuống
  g.scale.set(S, -S, S);
  const shapes = shapesOf(front.d, front.holes);
  const core = new THREE.Mesh(new THREE.ExtrudeGeometry(shapes, { depth: thick, bevelEnabled: false, curveSegments: 28 }),
    new THREE.MeshStandardMaterial({ color: '#F4F2EE', roughness: 0.8 }));
  core.castShadow = true;
  g.add(core);
  const face = new THREE.ShapeGeometry(shapes, 28);
  const mk = async (c: Cut, mirror: boolean) => {
    if (!c.el) return null;
    const px = Math.min(2048, Math.max(900, Math.round(Math.max(c.W, c.H) * 9)));
    const t = await svgTex(c.el, fontCss, px, aniso, '');
    t.flipY = false;
    if (mirror) { t.wrapS = THREE.RepeatWrapping; t.repeat.set(-1 / c.W, 1 / c.H); t.offset.set(1, 0); } else t.repeat.set(1 / c.W, 1 / c.H);
    t.needsUpdate = true;
    return new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.25, side: mirror ? THREE.BackSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  };
  const fm = await mk(front, false);
  if (fm) { const m = new THREE.Mesh(face, fm); m.position.z = thick + 0.02; g.add(m); }
  const bm = back ? await mk(back, true) : new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.75, side: THREE.BackSide });
  if (bm) { const m = new THREE.Mesh(face, bm); m.position.z = -0.02; g.add(m); }
  return g;
}

export function shelfBuilder(o: Shelf3DOpts): Builder {
  return async (aniso) => {
    const g = new THREE.Group();
    const SW = 640, DEPTH = 360, Y1 = 44, Y2 = 412, TOP = 790, CH = 44;
    const metal = new THREE.MeshStandardMaterial({ color: '#E7E9EC', metalness: 0.35, roughness: 0.42 });
    const dark = new THREE.MeshStandardMaterial({ color: '#4A5059', metalness: 0.5, roughness: 0.45 });

    // vách lỗ + 2 trụ
    const peg = pegTex(aniso); peg.repeat.set(SW / 64, TOP / 64);
    const wall = new THREE.Mesh(new THREE.BoxGeometry((SW + 24) * S, TOP * S, 10 * S), new THREE.MeshStandardMaterial({ map: peg, roughness: 0.8 }));
    wall.position.set(0, (TOP / 2) * S, (-DEPTH - 5) * S); wall.receiveShadow = true; g.add(wall);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(26 * S, TOP * S, 30 * S), dark);
      post.position.set(sx * (SW / 2 + 13) * S, (TOP / 2) * S, (-DEPTH - 6) * S); post.castShadow = true; g.add(post);
      const side = new THREE.Mesh(new THREE.BoxGeometry(4 * S, 60 * S, DEPTH * S), dark); // chân đế
      side.position.set(sx * (SW / 2 + 10) * S, 30 * S, (-DEPTH / 2) * S); g.add(side);
    }

    // tầng kệ + rãnh giá (mặt trước sáng màu, nắp nhựa trong)
    const channelFace = 9; // z mặt trước rãnh
    const shelf = (y: number) => {
      const plate = new THREE.Mesh(new RoundedBoxGeometry(SW * S, 5 * S, DEPTH * S, 2, 1.5 * S), metal);
      plate.position.set(0, (y + 2.5) * S, (-DEPTH / 2) * S); plate.castShadow = true; plate.receiveShadow = true; g.add(plate);
      const ch = new THREE.Mesh(new RoundedBoxGeometry(SW * S, CH * S, 16 * S, 2, 2 * S), new THREE.MeshStandardMaterial({ color: '#EEF0F3', roughness: 0.55 }));
      ch.position.set(0, (y + 5 - CH / 2) * S, (channelFace - 8) * S); ch.castShadow = true; g.add(ch);
      const lip = new THREE.Mesh(new THREE.BoxGeometry(SW * S, 3 * S, 4 * S), metal);
      lip.position.set(0, (y + 5 - 1.5) * S, (channelFace + 1) * S); g.add(lip);
      const lip2 = lip.clone(); lip2.position.y = (y + 5 - CH + 1.5) * S; g.add(lip2);
      return y + 5 - CH / 2; // tâm rãnh
    };
    const ch1 = shelf(Y1), ch2 = shelf(Y2);
    // nắp nhựa trong phủ rãnh (bóng nhẹ)
    const cover = new THREE.MeshPhysicalMaterial({ color: '#FFFFFF', transparent: true, opacity: 0.1, roughness: 0.05, clearcoat: 1, depthWrite: false });
    for (const cy of [ch1, ch2]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(SW * S, (CH - 6) * S), cover);
      m.position.set(0, cy * S, (channelFace + 1.6) * S); m.renderOrder = 3; g.add(m);
    }

    // shelf strip ở rãnh tầng dưới
    if (o.strip) {
      const t = await svgTex(o.strip, o.fontCss, 4096, aniso);
      t.repeat.set(SW / o.stripW, 1); t.offset.set(0.04, 0);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(SW * S, o.stripH * S), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 }));
      m.position.set(0, ch1 * S, (channelFace + 0.5) * S); g.add(m);
    }
    // tem giá ở rãnh tầng trên
    const tagXs: number[] = [];
    const nTag = Math.min(o.tags.length, o.tagW > 70 ? 3 : 4);
    for (let i = 0; i < nTag; i++) tagXs.push(-SW / 2 + 40 + o.tagW / 2 + i * ((SW - 80 - o.tagW) / Math.max(1, nTag - 1)));
    for (let i = 0; i < nTag; i++) {
      const t = await svgTex(o.tags[i], o.fontCss, 900, aniso);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.tagW * S, o.tagH * S), new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.45, clearcoat: 0.4 }));
      m.position.set(tagXs[i] * S, ch2 * S, (channelFace + 0.5) * S); g.add(m);
    }

    // hàng hoá (hộp, chai, lọ) — nhãn chung chung
    const words = WORDS[o.industry] || WORDS.grocery;
    let wi = 0;
    const box = (x: number, y: number, z: number, w: number, h: number, d: number, col: string) => {
      const lt = labelTex(words[wi++ % words.length], col, aniso, h > w * 1.2);
      const side = new THREE.MeshStandardMaterial({ color: shade(col, -0.1), roughness: 0.5 });
      const top = new THREE.MeshStandardMaterial({ color: shade(col, 0.15), roughness: 0.5 });
      const m = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, d * S, 2, 2.5 * S), [side, side, top, top, new THREE.MeshStandardMaterial({ map: lt, roughness: 0.45 }), side]);
      m.position.set(x * S, (y + h / 2) * S, z * S); m.castShadow = true; m.receiveShadow = true; g.add(m);
    };
    const bottle = (x: number, y: number, z: number, r: number, h: number, col: string) => {
      const pts: THREE.Vector2[] = [];
      const neck = r * 0.38;
      for (const [px, py] of [[0, 0], [r * 0.92, 0], [r, r * 0.12], [r, h * 0.62], [r * 0.92, h * 0.7], [neck * 1.15, h * 0.84], [neck, h * 0.88], [neck, h]] as const) pts.push(new THREE.Vector2(px * S, py * S));
      const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.18, clearcoat: 0.8, transmission: 0, metalness: 0 }));
      body.position.set(x * S, y * S, z * S); body.castShadow = true; g.add(body);
      const lt = labelTex(words[wi++ % words.length], shade(col, -0.25), aniso, false, true);
      lt.wrapS = THREE.RepeatWrapping; lt.repeat.set(1, 1); lt.offset.set(0.5, 0); // tâm chữ (u=0.5) quay ra trước (+z)
      const lab = new THREE.Mesh(new THREE.CylinderGeometry((r + 0.6) * S, (r + 0.6) * S, h * 0.36 * S, 40, 1, true), new THREE.MeshStandardMaterial({ map: lt, roughness: 0.5 }));
      lab.position.set(x * S, (y + h * 0.36) * S, z * S); g.add(lab);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(neck * 1.1 * S, neck * 1.1 * S, 18 * S, 24), new THREE.MeshStandardMaterial({ color: '#F4F4F4', roughness: 0.4 }));
      cap.position.set(x * S, (y + h + 6) * S, z * S); g.add(cap);
    };
    const yA = Y1 + 5, yB = Y2 + 5;
    // tầng dưới
    box(-250, yA, -150, 92, 230, 120, COLORS[0]); box(-150, yA, -160, 92, 230, 120, COLORS[0]);
    bottle(-50, yA, -120, 36, 250, COLORS[2]); bottle(32, yA, -120, 36, 250, COLORS[2]);
    box(140, yA, -140, 120, 170, 110, COLORS[1]); box(258, yA, -150, 100, 210, 110, COLORS[3]);
    // tầng trên
    box(-262, yB, -140, 80, 150, 90, COLORS[4]); box(-175, yB, -150, 80, 150, 90, COLORS[4]);
    bottle(-80, yB, -110, 28, 190, COLORS[5]); bottle(-14, yB, -110, 28, 190, COLORS[5]);
    box(80, yB, -130, 96, 120, 96, COLORS[6]); box(190, yB, -140, 96, 160, 96, COLORS[7]); box(275, yB, -150, 64, 130, 80, COLORS[3]);

    // wobbler: cần PVC trong từ rãnh tầng trên chìa ra, thẻ ở đầu cần nghiêng nhẹ
    if (o.wob.el) {
      const armLen = 140, wx = 150;
      const pvc = new THREE.MeshPhysicalMaterial({ color: '#EAF4F7', transparent: true, opacity: 0.45, roughness: 0.08, clearcoat: 1, depthWrite: false });
      const armG = new THREE.Group();
      const arm = new THREE.Mesh(new THREE.BoxGeometry(16 * S, 0.7 * S, armLen * S), pvc);
      arm.position.set(0, 0, (armLen / 2) * S); arm.renderOrder = 2;
      armG.add(arm);
      const clip = new THREE.Mesh(new THREE.BoxGeometry(18 * S, 26 * S, 2 * S), pvc); // kẹp vào rãnh
      clip.position.set(0, -10 * S, 0); armG.add(clip);
      armG.position.set(wx * S, (ch2 + 6) * S, (channelFace + 2) * S);
      armG.rotation.x = 0.1; // cần võng xuống
      g.add(armG);
      const card = await cardMesh(o.wob, null, aniso, o.fontCss);
      const holder = new THREE.Group();
      card.position.set((-o.wob.W / 2) * S, (o.wob.H * 0.42) * S, 0); // tâm-dưới thẻ dán vào đầu cần
      holder.add(card);
      holder.position.set(wx * S, (ch2 + 6 - Math.sin(0.1) * armLen) * S, (channelFace + 2 + Math.cos(0.1) * armLen) * S);
      holder.rotation.set(-0.06, 0.18, -0.09);
      g.add(holder);
    }

    // bảng treo trần 2 mặt + dây cước
    if (o.danFront.el) {
      const d = o.danFront, hole = d.holes[0] || { cx: d.W / 2, cy: 9, r: 2.5 };
      const card = await cardMesh(d, o.danBack, aniso, o.fontCss, 1.6);
      const holder = new THREE.Group();
      const topY = TOP - 30; // đỉnh lỗ treo
      card.position.set((-hole.cx) * S, (hole.cy) * S, 0);
      holder.add(card);
      holder.position.set(-165 * S, topY * S, 170 * S);
      holder.rotation.y = 0.32;
      g.add(holder);
      const thread = new THREE.Mesh(new THREE.CylinderGeometry(0.35 * S, 0.35 * S, 90 * S, 6), new THREE.MeshStandardMaterial({ color: '#D8DCE2', roughness: 0.3 }));
      thread.position.set(-165 * S, (topY + 45) * S, 170 * S); g.add(thread);
    }

    const view = o.kind === 'dangler' ? { az: 0.42, el: 0.08 } : o.kind === 'strip' ? { az: 0.28, el: 0.16 } : { az: 0.36, el: 0.12 };
    const aim = o.kind === 'dangler' ? 0.5 : o.kind === 'strip' ? 0.4 : o.kind === 'price' ? 0.5 : 0.52;
    const zoom = o.kind === 'dangler' ? 1.3 : o.kind === 'strip' ? 1.4 : 1.42;
    return { group: g, view, aim, zoom, blob: 0.5 };
  };
}
