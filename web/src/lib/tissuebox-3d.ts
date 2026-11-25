'use client';
// Hộp khăn giấy 3D: hộp giấy cạnh sắc, in đủ 5 mặt + nắp có lỗ rút (thủng thật), nhìn thấy lớp khăn bên trong,
// 1 tờ khăn mềm bung lên xoè ra (nếp gấp + vân nhăn). Hộp thứ 2 (vuông cao / chữ nhật) đặt cạnh, trên mặt bàn gỗ.
// Texture mỗi mặt = đúng SVG mặt hộp của file in (tissuebox-engine).

import * as THREE from 'three';
import { S, svgTex, type Builder } from './mockup3d';
import {
  TB_FONT_CSS, ctxOf, faceSvgString, openingOf, tbSize, tbSizesFor,
  type Ctx, type Face, type TbData, type TbKind, type TbSpec,
} from './tissuebox-engine';

const parseSvg = (s: string) => new DOMParser().parseFromString(s, 'image/svg+xml').documentElement as unknown as SVGSVGElement;

async function faceTex(face: Face, w: number, h: number, c: Ctx, kind: TbKind, aniso: number) {
  const px = Math.max(256, Math.min(2048, Math.round(Math.max(w, h) * 8)));
  const t = await svgTex(parseSvg(faceSvgString(face, w, h, c, kind)), TB_FONT_CSS, px, aniso, c.pal.bg);
  return t;
}

// ---- vân nhăn khăn giấy + vân gỗ (canvas, dùng lại) ----
let crinkle: THREE.CanvasTexture | null = null;
function crinkleTex(): THREE.CanvasTexture {
  if (crinkle) return crinkle;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d')!;
  const im = x.createImageData(512, 512);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 36; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  x.lineCap = 'round';
  for (let i = 0; i < 900; i++) {
    const px = Math.random() * 512, py = Math.random() * 512, a = Math.random() * Math.PI, l = 6 + Math.random() * 26;
    x.strokeStyle = Math.random() < 0.5 ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)';
    x.lineWidth = 0.6 + Math.random() * 1.4;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  crinkle = new THREE.CanvasTexture(c);
  crinkle.wrapS = crinkle.wrapT = THREE.RepeatWrapping;
  return crinkle;
}
let wood: THREE.CanvasTexture | null = null;
function woodTex(): THREE.CanvasTexture {
  if (wood) return wood;
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1024;
  const x = c.getContext('2d')!;
  const planks = 5, pw = 1024 / planks;
  for (let p = 0; p < planks; p++) {
    const base = [180, 162, 136].map((v) => v + (Math.random() - 0.5) * 10); // gỗ sồi sáng, trung tính
    x.fillStyle = `rgb(${base.join(',')})`; x.fillRect(p * pw, 0, pw, 1024);
    for (let i = 0; i < 70; i++) {
      const gx = p * pw + Math.random() * pw, amp = 2 + Math.random() * 6, ph = Math.random() * 6;
      x.strokeStyle = `rgba(${Math.random() < 0.5 ? '96,66,42' : '214,184,148'},${0.05 + Math.random() * 0.08})`;
      x.lineWidth = 0.6 + Math.random() * 1.8;
      x.beginPath();
      for (let y = 0; y <= 1024; y += 16) { const xx = gx + Math.sin(y * 0.012 + ph) * amp; if (y === 0) x.moveTo(xx, y); else x.lineTo(xx, y); }
      x.stroke();
    }
    x.fillStyle = 'rgba(60,40,24,0.35)'; x.fillRect(p * pw, 0, 2, 1024);
  }
  wood = new THREE.CanvasTexture(c);
  wood.colorSpace = THREE.SRGBColorSpace;
  wood.wrapS = wood.wrapT = THREE.RepeatWrapping; wood.repeat.set(7, 7); wood.anisotropy = 8;
  return wood;
}

// ---- tờ khăn bung lên khỏi lỗ: xoè dần, nếp gấp xếp quạt, góc rủ xuống ----
function tissueSheet(kind: TbKind, rx: number, ry: number): THREE.Mesh {
  const pocket = kind === 'pocket', cube = kind === 'cube';
  const sheetW = cube ? rx * 2.7 : Math.min(rx * 2 * 0.92, 175);
  const sheetH = pocket ? 34 : cube ? 78 : 70;
  const baseW = cube ? rx * 0.9 : Math.min(rx * 2 * 0.45, sheetW * 0.4);
  const ampMax = Math.min(cube ? 13 : 9, ry * 0.75 + (pocket ? 1 : 4));
  const folds = cube ? 3.5 : 5;
  const g = new THREE.PlaneGeometry(1, 1, 56, 40);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getY(i);
    const t = v + 0.5;
    const ease = 1 - Math.pow(1 - t, 2.2);
    const wt = baseW + (sheetW - baseW) * ease;
    const x = u * wt;
    const amp = 1.2 + (ampMax - 1.2) * Math.min(1, t * 1.3);
    let z = Math.sin(u * Math.PI * folds + 0.4) * amp * (0.35 + 0.65 * t);
    z += t * t * (pocket ? 5 : 12);
    if (t > 0.72) z += Math.pow(t - 0.72, 2) * (pocket ? 30 : 70);
    let y = t * sheetH - Math.pow(Math.abs(u) * 2, 2.2) * t * sheetH * 0.3;
    y += Math.sin(u * 9 + t * 4) * 0.8 * t;
    pos.setXYZ(i, x, y, z);
  }
  g.computeVertexNormals();
  const bump = crinkleTex();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 0.96, side: THREE.DoubleSide, bumpMap: bump, bumpScale: 1.2 }));
  m.castShadow = true;
  return m;
}

async function tissueBox(spec: TbSpec, sizeId: string, data: TbData, logo: string | undefined, aniso: number, uid: string): Promise<THREE.Group> {
  const s = tbSize(sizeId);
  const kind = s.kind;
  const L = s.L, Dp = s.D, H = s.H;
  const c = ctxOf({ ...spec, kind, size: sizeId }, data, logo, uid);
  const [tTop, tFront, tBack, tL, tR, tBot] = await Promise.all([
    faceTex('top', L, Dp, c, kind, aniso), faceTex('front', L, H, c, kind, aniso), faceTex('back', L, H, c, kind, aniso),
    faceTex('endL', Dp, H, c, kind, aniso), faceTex('endR', Dp, H, c, kind, aniso), faceTex('bottom', L, Dp, c, kind, aniso),
  ]);
  const paper = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.48, clearcoat: 0.3, clearcoatRoughness: 0.42 });
  const g = new THREE.Group();
  // thân hộp (5 mặt; mặt trên dựng riêng để khoét lỗ)
  const body = new THREE.Mesh(new THREE.BoxGeometry(L * S, H * S, Dp * S),
    [paper(tR), paper(tL), new THREE.MeshBasicMaterial({ visible: false }), paper(tBot), paper(tFront), paper(tBack)]);
  body.position.y = (H / 2) * S; body.castShadow = true;
  g.add(body);
  // lòng hộp (nhìn qua lỗ thấy vách giấy + xấp khăn)
  const t = 0.6;
  const liner = new THREE.Mesh(new THREE.BoxGeometry((L - t) * S, (H - t) * S, (Dp - t) * S), new THREE.MeshStandardMaterial({ color: '#E7E1D6', roughness: 0.95, side: THREE.BackSide }));
  liner.position.y = (H / 2) * S;
  g.add(liner);
  const stackH = Math.max(4, H - (kind === 'pocket' ? 6 : 11));
  const stack = new THREE.Mesh(new THREE.PlaneGeometry((L - 3) * S, (Dp - 3) * S), new THREE.MeshStandardMaterial({ color: '#FBFBF8', roughness: 0.95, bumpMap: crinkleTex(), bumpScale: 0.4 }));
  stack.rotation.x = -Math.PI / 2; stack.position.y = stackH * S;
  g.add(stack);
  // nắp: hình chữ nhật trừ lỗ rút khăn; UV = toạ độ mặt in (v=1 là mép sau)
  const op = openingOf(kind, L, Dp);
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.lineTo(L, 0); sh.lineTo(L, Dp); sh.lineTo(0, Dp); sh.closePath();
  const hole = new THREE.Path();
  // toạ độ shape: y=0 là mép TRƯỚC → lỗ đối xứng nên cy giữ nguyên
  if (op.kind === 'slot') {
    const r = op.ry;
    hole.moveTo(op.cx - op.rx + r, op.cy - r); hole.lineTo(op.cx + op.rx - r, op.cy - r);
    hole.absarc(op.cx + op.rx - r, op.cy, r, -Math.PI / 2, Math.PI / 2, false);
    hole.lineTo(op.cx - op.rx + r, op.cy + r);
    hole.absarc(op.cx - op.rx + r, op.cy, r, Math.PI / 2, Math.PI * 1.5, false);
  } else hole.absellipse(op.cx, op.cy, op.rx, op.ry, 0, Math.PI * 2, true, 0);
  sh.holes.push(hole);
  const tg = new THREE.ShapeGeometry(sh, 48);
  const p = tg.attributes.position as THREE.BufferAttribute, uv = tg.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / L, p.getY(i) / Dp);
  tg.scale(S, S, S);
  const top = new THREE.Mesh(tg, paper(tTop));
  top.rotation.x = -Math.PI / 2; top.position.set((-L / 2) * S, H * S + 0.00005, (Dp / 2) * S);
  top.castShadow = true;
  g.add(top);
  // mép giấy quanh lỗ (độ dày bìa)
  const ring: THREE.Vector3[] = [];
  const pts = hole.getPoints(72);
  for (const q of pts) ring.push(new THREE.Vector3((q.x - L / 2) * S, H * S - 0.0002, (Dp / 2 - q.y) * S));
  const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ring, true), 120, 0.45 * S, 6, true), new THREE.MeshStandardMaterial({ color: '#F3EFE7', roughness: 0.9 }));
  g.add(rim);
  // tờ khăn bung lên
  const sheet = tissueSheet(kind, op.rx, op.ry);
  sheet.scale.setScalar(S);
  sheet.position.set(0, (H - (kind === 'pocket' ? 7 : 13)) * S, 0);
  if (kind === 'cube') sheet.rotation.y = Math.PI / 4;
  g.add(sheet);
  return g;
}

export function tissueboxBuilder(spec: TbSpec, data: TbData, logo?: string): Builder {
  return async (aniso) => {
    const main = tbSize(spec.size);
    const otherKind: TbKind = spec.kind === 'cube' ? 'rect' : 'cube';
    const other = tbSizesFor(otherKind)[0];
    const [a, b] = await Promise.all([
      tissueBox(spec, spec.size, data, logo, aniso, 'tb3a'),
      tissueBox({ ...spec, kind: otherKind }, other.id, data, logo, aniso, 'tb3b'),
    ]);
    const out = new THREE.Group();
    out.add(a);
    // hộp phụ đặt chéo phía sau bên trái (không chạm hộp chính)
    b.position.set(-(main.L * 0.5 + other.L * 0.32 + 14) * S, 0, -(main.D * 0.5 + other.D * 0.5 + 18) * S);
    b.rotation.y = 0.35;
    out.add(b);
    // mặt bàn gỗ tràn khung — loại khỏi bounds để camera ôm sát 2 hộp
    const tblGeo = new THREE.PlaneGeometry(6000 * S, 6000 * S);
    tblGeo.boundingBox = new THREE.Box3();
    const table = new THREE.Mesh(tblGeo, new THREE.MeshStandardMaterial({ map: woodTex(), roughness: 0.62 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.0015;
    out.add(table);
    return { group: out, view: { az: 0.5, el: 0.34 }, aim: 0.42, zoom: spec.kind === 'pocket' ? 1.3 : 1.32, blob: 0.5 };
  };
}
