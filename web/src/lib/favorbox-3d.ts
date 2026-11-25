'use client';
// Hộp quà cưới mini 3D: cụm hộp quà trên bàn — hộp chính (loại khách chọn) + 2 hộp đi kèm (gối, lục giác có nơ,
// vuông xỏ ruy băng) + 1 hộp vuông mở nắp thấy kẹo/socola bên trong. Mỗi mặt in = đúng Art của file in (favorbox-engine)
// vẽ lên canvas → texture; ép kim = kim loại thật (metalnessMap/roughnessMap từ khuôn nhũ).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import {
  FB_FOILS, bagHandle, bagHole, ctxOf, drawArt, faceArt, fbFaces, fbSize, fbSizesFor, gableRise, pillowSag, ribbonHoles,
  type Ctx, type Face, type FbData, type FbKind, type FbSpec,
} from './favorbox-engine';

interface Kit { c: Ctx; imgs: Map<string, HTMLImageElement>; aniso: number; edge: THREE.Material; inner: THREE.Material; satin: THREE.Material }

let fiber: HTMLCanvasElement | null = null;
function fiberTile(): HTMLCanvasElement {
  if (fiber) return fiber;
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d')!; const im = x.createImageData(256, 256);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (Math.random() - 0.5) * 70; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  x.putImageData(im, 0, 0);
  return (fiber = c);
}
function faceCanvas(f: Face, k: Kit, mode: 'view' | 'mask3d'): HTMLCanvasElement {
  const px = Math.min(11, 1600 / Math.max(f.w, f.h));
  const cv = document.createElement('canvas'); cv.width = Math.max(8, Math.round(f.w * px)); cv.height = Math.max(8, Math.round(f.h * px));
  const ctx = cv.getContext('2d')!;
  ctx.fillStyle = mode === 'mask3d' ? '#000' : k.c.pal.paper; ctx.fillRect(0, 0, cv.width, cv.height);
  if (mode === 'view' && k.c.pal.kraft) {
    ctx.lineWidth = Math.max(1, px * 0.08);
    for (let i = 0; i < Math.min(9000, f.w * f.h * 0.35); i++) {
      const x = Math.random() * cv.width, y = Math.random() * cv.height, len = (0.4 + Math.random() * 1.6) * px, a = Math.random() * Math.PI;
      ctx.strokeStyle = Math.random() < 0.6 ? 'rgba(70,42,16,0.2)' : 'rgba(255,244,222,0.22)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); ctx.stroke();
    }
  }
  drawArt(ctx, faceArt(f, k.c, f.id.length), px, k.imgs, mode);
  if (mode === 'view') {
    ctx.save(); ctx.globalAlpha = k.c.pal.kraft ? 0.14 : 0.04; ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = ctx.createPattern(fiberTile(), 'repeat')!; ctx.fillRect(0, 0, cv.width, cv.height); ctx.restore();
  }
  return cv;
}
function faceMat(f: Face, k: Kit, side: THREE.Side = THREE.FrontSide): THREE.Material {
  const map = canvasTex(faceCanvas(f, k, 'view'), k.aniso);
  if (k.c.pal.kraft) return new THREE.MeshStandardMaterial({ map, roughness: 0.9, side });
  if (k.c.foil === 'none') return new THREE.MeshPhysicalMaterial({ map, roughness: k.c.pal.dark ? 0.45 : 0.55, clearcoat: 0.25, clearcoatRoughness: 0.4, side });
  // ép kim: kênh B của metalnessMap = độ kim loại; kênh G của roughnessMap = độ nhám (nhũ bóng hơn giấy)
  const mask = faceCanvas(f, k, 'mask3d');
  // giấy: G = 255 → nhám 0.62 · nhũ: G ≈ 148 → nhám ≈ 0.36 (bắt sáng mềm, không soi môi trường tối)
  const rough = document.createElement('canvas'); rough.width = mask.width; rough.height = mask.height;
  const rc = rough.getContext('2d')!, md = mask.getContext('2d')!.getImageData(0, 0, mask.width, mask.height), rd = rc.createImageData(mask.width, mask.height);
  for (let i = 0; i < md.data.length; i += 4) { const v = 255 - md.data[i] * 0.42; rd.data[i] = rd.data[i + 1] = rd.data[i + 2] = v; rd.data[i + 3] = 255; }
  rc.putImageData(rd, 0, 0);
  const metalnessMap = canvasTex(mask, k.aniso), roughnessMap = canvasTex(rough, k.aniso);
  metalnessMap.colorSpace = THREE.NoColorSpace; roughnessMap.colorSpace = THREE.NoColorSpace;
  return new THREE.MeshPhysicalMaterial({ map, metalness: 1, metalnessMap, roughness: 0.62, roughnessMap, clearcoat: 0.2, clearcoatRoughness: 0.4, side });
}
const plainMat = (k: Kit) => new THREE.MeshStandardMaterial({ color: k.c.pal.kraft ? '#BF9466' : k.c.pal.paper, roughness: 0.75 });
const facesOf = (spec: FbSpec) => new Map(fbFaces(spec).map((f) => [f.id, f]));
const shadowAll = (g: THREE.Object3D) => g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true; } });

// đa giác mặt (toạ độ mặt in: x phải, y xuống, mm) → hình học phẳng nằm trong mặt phẳng XY (y lên), UV theo mặt in
function faceGeo(f: Face, pts: [number, number][], holes?: [number, number][][]): THREE.BufferGeometry {
  const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, f.h - y)));
  for (const h of holes || []) sh.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, f.h - y))));
  const g = new THREE.ShapeGeometry(sh, 24);
  const pos = g.attributes.position, uv = new Float32Array(pos.count * 2);
  for (let i = 0; i < pos.count; i++) { uv[i * 2] = pos.getX(i) / f.w; uv[i * 2 + 1] = pos.getY(i) / f.h; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
const rectPts = (f: Face): [number, number][] => [[0, 0], [f.w, 0], [f.w, f.h], [0, f.h]];

// ---------- ruy băng & nơ ----------
function bow(k: Kit, w: number): THREE.Group {
  const g = new THREE.Group();
  const loop = (dir: number) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(dir * w * 0.55, w * 0.42, 0), new THREE.Vector3(dir * w * 1.05, w * 0.35, 0),
      new THREE.Vector3(dir * w * 1.1, w * 0.05, 0), new THREE.Vector3(dir * w * 0.5, w * 0.02, 0), new THREE.Vector3(0, 0, 0),
    ], true);
    const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, w * 0.13, 8, true), k.satin);
    m.scale.set(1, 1, 2.2); return m;
  };
  g.add(loop(1), loop(-1));
  const knot = new THREE.Mesh(new THREE.SphereGeometry(w * 0.2, 16, 12), k.satin); knot.scale.set(1, 0.85, 1.4); knot.position.y = w * 0.06; g.add(knot);
  for (const dir of [-1, 1]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(w * 0.32, 0.35, w * 0.95), k.satin);
    tail.position.set(dir * w * 0.25, 0.1, w * 0.45); tail.rotation.y = dir * 0.45; g.add(tail);
  }
  return g;
}

// ---------- các loại hộp (mm, đáy ở y=0, tâm x/z = 0) ----------
function squareBox(spec: FbSpec, k: Kit, open = false): THREE.Group {
  const s = fbSize(spec.size), F = facesOf(spec), a = s.a, c = s.c, g = new THREE.Group();
  const mFront = faceMat(F.get('front')!, k), mBack = faceMat(F.get('back')!, k), mS1 = faceMat(F.get('side1')!, k), mS2 = faceMat(F.get('side2')!, k);
  const mLid = faceMat(F.get('lid')!, k), plain = plainMat(k);
  if (!open) {
    const body = new THREE.Mesh(new RoundedBoxGeometry(a, c, a, 2, 0.6), [mS1, mS2, mLid, plain, mFront, mBack]);
    body.position.y = c / 2; g.add(body);
    // ruy băng xỏ qua 2 lỗ trên nắp + nơ
    const hs = ribbonHoles(s), hx = hs[1].x - a / 2;
    for (const sx of [-hx, hx]) {
      const hole = new THREE.Mesh(new THREE.CircleGeometry(2.2, 20), new THREE.MeshBasicMaterial({ color: '#2B2420' }));
      hole.rotation.x = -Math.PI / 2; hole.position.set(sx, c + 0.05, 0); g.add(hole);
    }
    const band = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 0.4, 5.5), k.satin); band.position.set(0, c + 0.25, 0); g.add(band);
    const b = bow(k, a * 0.17); b.position.set(0, c + 0.4, 0); g.add(b);
    return g;
  }
  // mở nắp: 4 vách + đáy, nắp bản lề cạnh sau mở ngửa
  const t = 0.6;
  const wall = (mOut: THREE.Material, w: number) => new THREE.Mesh(new THREE.BoxGeometry(w, c, t), [k.edge, k.edge, k.edge, k.edge, mOut, k.inner]);
  const fw = wall(mFront, a); fw.position.set(0, c / 2, a / 2 - t / 2); g.add(fw);
  const bw = wall(mBack, a); bw.position.set(0, c / 2, -a / 2 + t / 2); bw.rotation.y = Math.PI; g.add(bw);
  const r1 = wall(mS1, a - 2 * t); r1.position.set(a / 2 - t / 2, c / 2, 0); r1.rotation.y = Math.PI / 2; g.add(r1);
  const r2 = wall(mS2, a - 2 * t); r2.position.set(-a / 2 + t / 2, c / 2, 0); r2.rotation.y = -Math.PI / 2; g.add(r2);
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(a, t, a), k.inner); bottom.position.y = t / 2; g.add(bottom);
  const hinge = new THREE.Group(); hinge.position.set(0, c, -a / 2);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(a, t, a), [k.edge, k.edge, mLid, k.inner, k.edge, k.edge]);
  lid.position.set(0, 0, a / 2); hinge.add(lid);
  const tg = new THREE.Mesh(new THREE.BoxGeometry(a - 6, t, 13), k.inner); tg.position.set(0, 0, a + 6.5); hinge.add(tg);
  hinge.rotation.x = -2.5; g.add(hinge);
  // kẹo bên trong
  const ins = candies(k, a - 4, c);
  g.add(ins);
  return g;
}

function candies(k: Kit, room: number, depth: number): THREE.Group {
  const g = new THREE.Group();
  const foilCol = k.c.foil === 'none' ? '#D7B25A' : FB_FOILS.find((f) => f.id === k.c.foil)!.color;
  const gold = new THREE.MeshStandardMaterial({ color: foilCol, metalness: 1, roughness: 0.28 });
  const red = new THREE.MeshStandardMaterial({ color: '#B8322B', metalness: 0.8, roughness: 0.3 });
  const choco = new THREE.MeshPhysicalMaterial({ color: '#4A2A1A', roughness: 0.35, clearcoat: 0.5 });
  const wrapA = new THREE.MeshPhysicalMaterial({ color: k.c.pal.accent, roughness: 0.3, clearcoat: 0.6 });
  const wrapB = new THREE.MeshPhysicalMaterial({ color: k.c.pal.dark ? '#F3E6C8' : k.c.pal.ink, roughness: 0.3, clearcoat: 0.6 });
  const r = Math.min(7, room * 0.13);
  const ball = (m: THREE.Material, x: number, z: number) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m); b.position.set(x, depth - r * 0.9, z); g.add(b); };
  const wrapped = (m: THREE.Material, x: number, z: number, ry: number) => {
    const w = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(r * 0.62, r * 1.1, 6, 16), m); body.rotation.z = Math.PI / 2; w.add(body);
    for (const sx of [-1, 1]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(r * 0.55, r * 0.9, 12), m); cone.rotation.z = sx * Math.PI / 2; cone.position.x = sx * r * 1.45; w.add(cone); }
    w.position.set(x, depth - r * 0.55, z); w.rotation.y = ry; g.add(w);
  };
  const choc = (x: number, z: number, ry: number) => {
    const m = new THREE.Mesh(new RoundedBoxGeometry(r * 1.9, r * 0.8, r * 1.9, 3, r * 0.25), choco);
    m.position.set(x, depth - r * 0.35, z); m.rotation.set(-0.25, ry, 0.12); g.add(m);
  };
  const q = room * 0.24;
  ball(gold, -q, -q); ball(red, q * 0.9, -q * 0.6); wrapped(wrapA, -q * 0.3, q * 0.7, 0.4); choc(q * 0.9, q * 0.8, 0.5); wrapped(wrapB, q * 0.1, -q * 0.05, -0.9);
  return g;
}
// vài viên kẹo rơi ngoài bàn
function looseCandies(k: Kit): THREE.Group {
  const g = new THREE.Group();
  const foilCol = k.c.foil === 'none' ? '#D7B25A' : FB_FOILS.find((f) => f.id === k.c.foil)!.color;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(6.5, 24, 16), new THREE.MeshStandardMaterial({ color: foilCol, metalness: 1, roughness: 0.28 }));
  ball.position.set(0, 6.5, 0); g.add(ball);
  const m = new THREE.MeshPhysicalMaterial({ color: k.c.pal.accent, roughness: 0.3, clearcoat: 0.6 });
  const w = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(4, 7, 6, 16), m); body.rotation.z = Math.PI / 2; w.add(body);
  for (const sx of [-1, 1]) { const cone = new THREE.Mesh(new THREE.ConeGeometry(3.6, 6, 12), m); cone.rotation.z = sx * Math.PI / 2; cone.position.x = sx * 9.2; w.add(cone); }
  w.position.set(16, 4, 6); w.rotation.y = 0.25; g.add(w);
  return g;
}

function hexBox(spec: FbSpec, k: Kit): THREE.Group {
  const s = fbSize(spec.size), F = facesOf(spec), a = s.a, c = s.c, g = new THREE.Group();
  const ap = a * Math.sqrt(3) / 2, H = a * Math.sqrt(3);
  for (let i = 0; i < 6; i++) {
    const f = F.get(`side${i}`)!;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(a, c), faceMat(f, k));
    const phi = (i * Math.PI) / 3;
    m.position.set(Math.sin(phi) * ap, c / 2, Math.cos(phi) * ap); m.rotation.y = phi; g.add(m);
  }
  const cf = F.get('cap')!;
  const cap = new THREE.Mesh(faceGeo(cf, cf.shape!), faceMat(cf, k));
  cap.rotation.x = -Math.PI / 2; cap.position.set(-a, c + 0.05, H / 2); g.add(cap);
  const bot = new THREE.Mesh(faceGeo(cf, cf.shape!), new THREE.MeshStandardMaterial({ color: k.c.pal.paper, roughness: 0.8, side: THREE.DoubleSide }));
  bot.rotation.x = -Math.PI / 2; bot.position.set(-a, 0.05, H / 2); g.add(bot);
  // nơ nhỏ ở góc sau nắp (không che hình chính)
  const b = bow(k, a * 0.32); b.position.set(0, c + 0.3, -ap * 0.9); b.rotation.y = Math.PI; b.scale.setScalar(0.8); g.add(b);
  return g;
}

function triBox(spec: FbSpec, k: Kit): THREE.Group {
  const s = fbSize(spec.size), F = facesOf(spec), a = s.a, c = s.c, g = new THREE.Group();
  const ap = a / (2 * Math.sqrt(3)), th = a * Math.sqrt(3) / 2;
  ['front', 'back', 'side'].forEach((id, i) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(a, c), faceMat(F.get(id)!, k));
    const phi = (i * 2 * Math.PI) / 3;
    m.position.set(Math.sin(phi) * ap, c / 2, Math.cos(phi) * ap); m.rotation.y = phi; g.add(m);
  });
  const cf = F.get('cap')!;
  const cap = new THREE.Mesh(faceGeo(cf, cf.shape!), faceMat(cf, k));
  cap.rotation.x = -Math.PI / 2; cap.position.set(-a / 2, c + 0.05, ap); g.add(cap);
  const bot = new THREE.Mesh(faceGeo(cf, cf.shape!), new THREE.MeshStandardMaterial({ color: k.c.pal.paper, roughness: 0.8, side: THREE.DoubleSide }));
  bot.rotation.x = -Math.PI / 2; bot.position.set(-a / 2, 0.05, ap); g.add(bot);
  return g;
}

function pillowBox(spec: FbSpec, k: Kit): THREE.Group {
  const s = fbSize(spec.size), F = facesOf(spec), a = s.a, b = s.b, D = s.c, g = new THREE.Group();
  const nu = 40, nv = 64, e = pillowSag(s);
  const surf = (sign: 1 | -1) => {
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const u = i / nu, v = j / nv;
      // đầu hộp gấp theo cung: mép đầu lõm vào giữa (theo độ võng e), thân phồng dạng thấu kính
      const inset = (e * 0.55) * Math.sin(Math.PI * u);
      const z = b / 2 - inset - v * (b - 2 * inset);
      const tEnd = Math.min(v, 1 - v) * (b - 2 * inset) / (e * 1.6);
      const fall = Math.min(1, tEnd) ** 0.55;
      const y = sign * (D / 2) * Math.sin(Math.PI * u) ** 0.7 * fall;
      pos.push((u - 0.5) * a, y, z);
      uv.push(sign === 1 ? u : 1 - u, v); // mặt sau: lật hộp quanh trục dọc → gương ngang
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const p = j * (nu + 1) + i;
      if (sign === 1) idx.push(p, p + 1, p + nu + 1, p + 1, p + nu + 2, p + nu + 1);
      else idx.push(p, p + nu + 1, p + 1, p + 1, p + nu + 1, p + nu + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  const top = new THREE.Mesh(surf(1), faceMat(F.get('front')!, k));
  const bottom = new THREE.Mesh(surf(-1), faceMat(F.get('back')!, k));
  const body = new THREE.Group(); body.add(top, bottom);
  body.position.y = D / 2;
  g.add(body);
  return g;
}

function gableBox(spec: FbSpec, k: Kit): THREE.Group {
  const s = fbSize(spec.size), F = facesOf(spec), a = s.a, b = s.b, c = s.c, r = gableRise(s), g = new THREE.Group();
  const front = F.get('front')!, back = F.get('back')!;
  const fm = new THREE.Mesh(faceGeo(front, front.shape!), faceMat(front, k)); fm.position.set(-a / 2, 0, b / 2); g.add(fm);
  const bm = new THREE.Mesh(faceGeo(back, back.shape!), faceMat(back, k)); bm.rotation.y = Math.PI; bm.position.set(a / 2, 0, -b / 2); g.add(bm);
  const s1 = new THREE.Mesh(new THREE.PlaneGeometry(b, c), faceMat(F.get('side1')!, k)); s1.rotation.y = Math.PI / 2; s1.position.set(a / 2, c / 2, 0); g.add(s1);
  const s2 = new THREE.Mesh(new THREE.PlaneGeometry(b, c), faceMat(F.get('side2')!, k)); s2.rotation.y = -Math.PI / 2; s2.position.set(-a / 2, c / 2, 0); g.add(s2);
  const L = Math.hypot(a / 2, r) + 3, ang = Math.atan2(r, a / 2);
  for (const side of [1, -1]) {
    const f = F.get(side === 1 ? 'roof1' : 'roof2')!;
    const m = new THREE.Mesh(new RoundedBoxGeometry(b + 3, 0.7, L, 2, 0.3), [k.edge, k.edge, faceMat(f, k), k.inner, k.edge, k.edge]);
    // mái: mép dưới ở mái hiên (x = ±a/2, y = c), mép trên chạm nóc (x = 0, y = c + r)
    m.rotation.y = side === 1 ? -Math.PI / 2 : Math.PI / 2;
    m.rotation.order = 'YXZ'; m.rotation.x = -ang;
    m.position.set(side * (a / 2 - (L / 2) * Math.cos(ang) + 1.4), c + (L / 2) * Math.sin(ang) - 0.2, 0);
    g.add(m);
  }
  const bot = new THREE.Mesh(new THREE.PlaneGeometry(a, b), plainMat(k)); bot.rotation.x = Math.PI / 2; bot.position.y = 0.05; g.add(bot);
  return g;
}

function bagBox(spec: FbSpec, k: Kit): THREE.Group {
  const s = fbSize(spec.size), F = facesOf(spec), a = s.a, b = s.b, c = s.c, hh = bagHandle(s), g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(a, c, b, 2, 0.5),
    [faceMat(F.get('side1')!, k), faceMat(F.get('side2')!, k), plainMat(k), plainMat(k), faceMat(F.get('front')!, k), faceMat(F.get('back')!, k)]);
  body.position.y = c / 2; g.add(body);
  const rise = Math.sqrt(Math.max(1, hh * hh - (b / 2) ** 2));
  const hole = bagHole(s), N = 24;
  const holePts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2, rr = hole.h / 2, half = hole.w / 2 - rr;
    const cx = Math.cos(t) >= 0 ? hole.cx + half : hole.cx - half;
    holePts.push([cx + Math.cos(t) * rr, hole.cy + Math.sin(t) * rr]);
  }
  const panel = (fid: string, front: boolean) => {
    const f = F.get(fid)!;
    const m = new THREE.Mesh(faceGeo(f, rectPts(f), [holePts]), faceMat(f, k, THREE.DoubleSide));
    // hệ toạ độ tấm: X dọc bề ngang, Y dọc dốc lên nóc
    const X = new THREE.Vector3(front ? 1 : -1, 0, 0), Y = new THREE.Vector3(0, rise, front ? -b / 2 : b / 2).divideScalar(hh), Z = new THREE.Vector3().crossVectors(X, Y);
    m.matrixAutoUpdate = false;
    m.matrix.makeBasis(X, Y, Z).setPosition(front ? -a / 2 : a / 2, c, front ? b / 2 : -b / 2);
    return m;
  };
  g.add(panel('handleF', true), panel('handleB', false));
  // tam giác 2 đầu (gấp kín)
  const tri = new THREE.Shape([new THREE.Vector2(-b / 2, 0), new THREE.Vector2(b / 2, 0), new THREE.Vector2(0, rise)]);
  for (const sx of [1, -1]) {
    const m = new THREE.Mesh(new THREE.ShapeGeometry(tri), plainMat(k));
    m.rotation.y = sx * Math.PI / 2; m.position.set(sx * a / 2 * 0.985, c, 0); g.add(m);
  }
  return g;
}

function boxOf(spec: FbSpec, k: Kit, open = false): THREE.Group {
  const g = spec.kind === 'pillow' ? pillowBox(spec, k) : spec.kind === 'hex' ? hexBox(spec, k) : spec.kind === 'tri' ? triBox(spec, k)
    : spec.kind === 'gable' ? gableBox(spec, k) : spec.kind === 'bag' ? bagBox(spec, k) : squareBox(spec, k, open);
  shadowAll(g);
  return g;
}
const radius = (g: THREE.Object3D) => { const bb = new THREE.Box3().setFromObject(g); return Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z) / 2; };

async function loadImgs(c: Ctx): Promise<Map<string, HTMLImageElement>> {
  const m = new Map<string, HTMLImageElement>();
  if (c.logo) { const im = new Image(); im.src = c.logo; try { await im.decode(); m.set(c.logo, im); } catch { /* bỏ logo hỏng */ } }
  return m;
}

export function favorboxBuilder(spec: FbSpec, data: FbData, logo?: string, solo = false): Builder {
  return async (aniso) => {
    const c = ctxOf(spec, data, logo);
    const k: Kit = {
      c, imgs: await loadImgs(c), aniso,
      edge: new THREE.MeshStandardMaterial({ color: c.pal.kraft ? '#B48858' : '#F1ECE2', roughness: 0.9 }),
      inner: new THREE.MeshStandardMaterial({ color: c.pal.kraft ? '#C9A176' : '#F6F2EA', roughness: 0.92 }),
      satin: new THREE.MeshPhysicalMaterial({ color: c.pal.ribbon, roughness: 0.38, sheen: 1, sheenColor: new THREE.Color('#FFFFFF'), sheenRoughness: 0.35, clearcoat: 0.15 }),
    };
    const root = new THREE.Group();
    const ground = (o: THREE.Object3D) => { o.updateMatrixWorld(true); const bb = new THREE.Box3().setFromObject(o); o.position.y -= bb.min.y; };
    const hero = boxOf(spec, k);
    root.add(hero);
    if (spec.kind === 'pillow') hero.rotation.x = solo ? 0.5 : 0.95;  // hộp gối dựng nghiêng khoe mặt chính
    ground(hero);
    let rh = radius(hero);
    if (!solo) {
      // 2 hộp đi kèm (cỡ nhỏ nhất của loại đó) + 1 hộp vuông mở nắp có kẹo + vài viên kẹo rơi
      const pool: FbKind[] = (['square', 'hex', 'pillow'] as FbKind[]).filter((x) => x !== spec.kind);
      const [m1, m2] = pool.slice(0, 2).map((kd) => boxOf({ ...spec, kind: kd, size: fbSizesFor(kd)[0].id }, k));
      const r1 = radius(m1), r2 = radius(m2);
      if (spec.kind === 'pillow') {
        // hộp gối tựa vào hộp vuông phía sau
        const hb = new THREE.Box3().setFromObject(hero);
        m1.position.set(0, 0, hb.min.z - r1 + 3); m1.rotation.y = 0.12; rh = Math.max(rh, 40);
      } else { m1.position.set(-rh * 0.25, 0, -(rh + r1 + 8)); m1.rotation.y = 0.25; }
      m2.position.set(rh + r2 + 8, 0, -rh * 0.25); m2.rotation.y = -0.42;
      root.add(m1, m2); ground(m1); ground(m2);
      const ob = boxOf({ ...spec, kind: 'square', size: fbSizesFor('square')[0].id }, k, true); const ro = radius(ob);
      ob.position.set(-(rh + ro + 8), 0, rh * 0.35); ob.rotation.y = 0.32; root.add(ob); ground(ob);
      const lc = looseCandies(k); lc.position.set(rh * 0.55, 0, rh + 14); root.add(lc); shadowAll(lc);
    }
    root.scale.setScalar(S);
    const el = spec.kind === 'hex' ? 0.72 : solo && spec.kind === 'pillow' ? 0.75 : 0.5;
    return { group: root, view: { az: 0.38, el }, aim: solo ? 0.42 : 0.38, zoom: solo ? 1.25 : 1.58, blob: 0.5 };
  };
}
