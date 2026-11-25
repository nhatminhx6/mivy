'use client';
// Tag treo 3D: tag bế ĐÚNG hình + lỗ (đùn khối dày giấy thật), mặt trước/sau dán đúng thiết kế, ép kim = lớp kim loại riêng,
// khoen kim loại (tuỳ chọn), dây xỏ qua lỗ thắt kiểu "lark's head" + kim băng gài lên áo gấp. Tag thứ 2 lật mặt sau nằm cạnh.
// Thẻ cảm ơn: 1 thẻ mặt trước trên áo + 1 thẻ mặt sau dưới đất.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { HOLE_R_MM, U, holeOf, htPalette, htShape, shapePath, type HTSpec } from './hangtag-engine';

export interface HT3DOpts {
  spec: HTSpec;
  front: SVGSVGElement | null; back: SVGSVGElement | null; // lớp in, khổ thành phẩm, không lề xén
  foilFront?: SVGSVGElement | null; foilBack?: SVGSVGElement | null;
  fontCss: string;
}

const M = S / U; // 1 đơn vị engine (0.1mm) → đơn vị 3D

// ---------- texture ----------
let kraftCache: HTMLCanvasElement | null = null;
function kraftCanvas(): HTMLCanvasElement {
  if (kraftCache) return kraftCache;
  const N = 512, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#C6A37A'; x.fillRect(0, 0, N, N);
  let sd = 5; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let i = 0; i < 9000; i++) { x.fillStyle = `rgba(${r() < 0.5 ? '90,62,30' : '235,210,170'},${0.05 + r() * 0.08})`; x.fillRect(r() * N, r() * N, 1 + r() * 2, 1 + r() * 2); }
  x.lineCap = 'round';
  for (let i = 0; i < 520; i++) {
    const px = r() * N, py = r() * N, a = r() * Math.PI, l = 4 + r() * 16;
    x.strokeStyle = `rgba(${r() < 0.6 ? '110,78,40' : '240,220,185'},${0.08 + r() * 0.12})`; x.lineWidth = 0.6 + r() * 0.8;
    x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); x.stroke();
  }
  return (kraftCache = c);
}

async function faceTex(el: SVGSVGElement, fontCss: string, outW: number, aniso: number, kraft: boolean, mirror: boolean, wU: number, hU: number): Promise<THREE.Texture> {
  const vb = el.viewBox.baseVal;
  const outH = Math.round((outW * vb.height) / vb.width);
  const art = await svgToCanvas(await selfContainedSvg(el, fontCss), outW, outH, kraft ? undefined : '#FFFFFF');
  let c = art;
  if (kraft) {
    c = document.createElement('canvas'); c.width = outW; c.height = outH;
    const x = c.getContext('2d')!;
    x.fillStyle = x.createPattern(kraftCanvas(), 'repeat')!; x.fillRect(0, 0, outW, outH);
    x.drawImage(art, 0, 0);
  }
  const t = canvasTex(c, aniso);
  t.flipY = false;
  // UV của nắp khối đùn = toạ độ hình (đơn vị engine) → co về 0..1; mặt sau nhìn từ dưới lên nên lật ngang
  t.repeat.set((mirror ? -1 : 1) / wU, 1 / hU);
  t.offset.set(mirror ? 1 : 0, 0);
  t.needsUpdate = true;
  return t;
}
async function maskTex(el: SVGSVGElement, fontCss: string, outW: number, aniso: number, mirror: boolean, wU: number, hU: number) {
  const vb = el.viewBox.baseVal;
  const c = await svgToCanvas(await selfContainedSvg(el, fontCss), outW, Math.round((outW * vb.height) / vb.width), '#000000');
  const t = canvasTex(c, aniso);
  t.colorSpace = THREE.NoColorSpace;
  t.flipY = false; t.repeat.set((mirror ? -1 : 1) / wU, 1 / hU); t.offset.set(mirror ? 1 : 0, 0); t.needsUpdate = true;
  return t;
}

let knitCache: HTMLCanvasElement | null = null;
/** vải thun: các mũi đan chữ V xếp cột (dùng làm bumpMap + làm sáng tối nhẹ) */
function knitCanvas(): HTMLCanvasElement {
  if (knitCache) return knitCache;
  const N = 256, c = document.createElement('canvas'); c.width = c.height = N;
  const x = c.getContext('2d')!;
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  const cw = 16, ch = 12;
  let sd = 9; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  for (let row = -1; row < N / ch + 1; row++) for (let col = 0; col < N / cw; col++) {
    const x0 = col * cw, y0 = row * ch, v = 150 + r() * 40;
    x.fillStyle = `rgb(${v},${v},${v})`;
    x.beginPath(); x.moveTo(x0 + 1, y0); x.quadraticCurveTo(x0 + cw * 0.3, y0 + ch, x0 + cw / 2, y0 + ch * 1.15); x.quadraticCurveTo(x0 + cw * 0.12, y0 + ch * 0.6, x0 + 1, y0); x.fill();
    x.beginPath(); x.moveTo(x0 + cw - 1, y0); x.quadraticCurveTo(x0 + cw * 0.7, y0 + ch, x0 + cw / 2, y0 + ch * 1.15); x.quadraticCurveTo(x0 + cw * 0.88, y0 + ch * 0.6, x0 + cw - 1, y0); x.fill();
  }
  return (knitCache = c);
}

// ---------- tag đùn khối ----------
interface TagRig { g: THREE.Group; w: number; h: number; t: number; hole: THREE.Vector3 | null }
async function tagRig(o: HT3DOpts, aniso: number, side: 'front' | 'back'): Promise<TagRig> {
  const sh = htShape(o.spec.shape);
  const wU = sh.wMm * U, hU = sh.hMm * U;
  const kraft = o.spec.material === 'kraft', foil = o.spec.material === 'foil';
  const tMm = kraft ? 0.5 : 0.42;
  const depth = tMm * U;
  const outW = Math.min(1400, Math.round(sh.wMm * 22));
  const [ft, bt] = await Promise.all([
    faceTex(o.front!, o.fontCss, outW, aniso, kraft, false, wU, hU),
    faceTex(o.back!, o.fontCss, outW, aniso, kraft, true, wU, hU),
  ]);

  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${shapePath(o.spec.shape)}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const hole = holeOf(o.spec.shape);
  if (hole) { const hp = new THREE.Path(); hp.absarc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2, true); shapes[0].holes.push(hp); }
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 28 });
  // nhóm 0 (nắp) = nửa đầu nắp đáy (z=0 → mặt sau) + nửa sau nắp trên (z=depth → mặt trước)
  const g0 = geo.groups[0];
  const half = g0.count / 2;
  geo.clearGroups();
  geo.addGroup(g0.start, half, 0);
  geo.addGroup(g0.start + half, half, 1);
  const rest = geo.index ? geo.index.count : geo.attributes.position.count;
  geo.addGroup(g0.start + g0.count, rest - g0.count, 2);
  // kiểm tra nửa nào thật sự là mặt trên (z lớn) → gán đúng texture
  const pos = geo.attributes.position;
  const zFirst = pos.getZ(g0.start);
  const frontIsFirst = zFirst > depth / 2;

  const P = htPalette(o.spec.palette);
  const paper = (map: THREE.Texture) => kraft
    ? new THREE.MeshStandardMaterial({ map, roughness: 0.92 })
    : new THREE.MeshPhysicalMaterial({ map, roughness: foil ? 0.5 : 0.6, clearcoat: foil ? 0.15 : 0.25, clearcoatRoughness: 0.55 });
  const fMat = paper(ft), bMat = paper(bt);
  const edge = new THREE.MeshStandardMaterial({ color: kraft ? '#B48F63' : foil ? P.bg : '#EFEDE8', roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, frontIsFirst ? [fMat, bMat, edge] : [bMat, fMat, edge]);
  mesh.castShadow = true;

  const inner = new THREE.Group();
  inner.scale.set(M, -M, M); // toạ độ hình (y xuống) → lật y
  inner.add(mesh);

  if (foil && o.foilFront && o.foilBack) {
    const [fm, bm] = await Promise.all([
      maskTex(o.foilFront, o.fontCss, outW, aniso, false, wU, hU),
      maskTex(o.foilBack, o.fontCss, outW, aniso, true, wU, hU),
    ]);
    // mỗi lớp nhũ chỉ 1 mặt (trên nhìn từ trước, dưới nhìn từ sau) → nhũ mặt sau không xuyên ra mặt trước
    const gold = (alphaMap: THREE.Texture, side: THREE.Side) => new THREE.MeshPhysicalMaterial({
      color: '#E2BE6A', metalness: 1, roughness: 0.22, clearcoat: 0.4, alphaMap, transparent: true, alphaTest: 0.35,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, side,
    });
    const sg = new THREE.ShapeGeometry(shapes, 28);
    const top = new THREE.Mesh(sg, gold(fm, THREE.FrontSide)); top.position.z = depth + 0.15; inner.add(top);
    const bot = new THREE.Mesh(sg, gold(bm, THREE.BackSide)); bot.position.z = -0.15; inner.add(bot);
  }

  let holeV: THREE.Vector3 | null = null;
  if (hole) {
    if (o.spec.eyelet) {
      const metal = new THREE.MeshStandardMaterial({ color: foil ? '#D9B868' : kraft ? '#A8874F' : '#C9CDD3', metalness: 1, roughness: 0.28 });
      const ring = (z: number) => { const m = new THREE.Mesh(new THREE.TorusGeometry(hole.r + 6, 4.6, 14, 48), metal); m.scale.z = 0.45; m.position.set(hole.cx, hole.cy, z); m.castShadow = true; return m; };
      inner.add(ring(depth + 1.6), ring(-1.6));
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(hole.r + 1, hole.r + 1, depth + 3, 32, 1, true), metal);
      barrel.rotation.x = Math.PI / 2; barrel.position.set(hole.cx, hole.cy, depth / 2); inner.add(barrel);
    }
    holeV = new THREE.Vector3(hole.cx * M, 0, hole.cy * M);
  }
  // đặt nằm phẳng: mặt trước (+z cục bộ) hướng lên; mép trên tag ở z=0, đáy tag về phía người xem
  const flat = new THREE.Group();
  inner.rotation.x = -Math.PI / 2;
  flat.add(inner);
  if (side === 'back') {
    // lật ngang (trái ↔ phải) để mặt sau hướng lên
    flat.rotation.z = Math.PI;
    flat.position.set(sh.wMm * S, depth * M, 0);
  }
  const g = new THREE.Group(); g.add(flat);
  if (holeV && side === 'back') holeV = new THREE.Vector3(sh.wMm * S - holeV.x, 0, holeV.z);
  return { g, w: sh.wMm * S, h: sh.hMm * S, t: depth * M, hole: holeV };
}

// ---------- dây + kim băng ----------
function tube(pts: THREE.Vector3[], r: number, mat: THREE.Material, seg = 160): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.4), seg, r, 10, false), mat);
  m.castShadow = true;
  return m;
}
function twineTex(color: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 64; c.height = 16;
  const x = c.getContext('2d')!;
  x.fillStyle = color; x.fillRect(0, 0, 64, 16);
  for (let i = -16; i < 80; i += 6) { x.strokeStyle = 'rgba(0,0,0,0.22)'; x.lineWidth = 2; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 10, 16); x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(60, 1); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
/**
 * dây thắt qua lỗ: vòng ôm mép trên tag (lark's head) + 2 sợi đuôi chạy tới `end` (toạ độ trong rig).
 * Rig: x ngang tag, z dọc tag (mép trên z=0), y lên; tag nằm y∈[lift, lift+t]; mặt nền (áo/sàn) ở y=0.
 */
function stringRig(r: TagRig, lift: number, end: THREE.Vector3, mat: THREE.Material, rad: number, sway = 1): THREE.Group {
  const g = new THREE.Group();
  if (!r.hole) return g;
  const h = r.hole, top = lift + r.t;
  for (const s of [-1, 1]) {
    const dx = s * rad * 1.15;
    const loop = [
      new THREE.Vector3(h.x + dx, top + rad * 0.9, h.z + rad * 0.2),
      new THREE.Vector3(h.x + dx, top + rad * 1.4, h.z * 0.45),
      new THREE.Vector3(h.x + dx * 1.4, lift + r.t * 0.5, -rad * 2.2),
    ];
    const ex = end.x + s * rad * 0.6;
    const tail = [
      new THREE.Vector3(h.x + dx * 2, rad, -rad * 6),
      new THREE.Vector3(h.x + (ex - h.x) * 0.3 + sway * 0.012, rad, -rad * 6 + (end.z + rad * 6) * 0.35),
      new THREE.Vector3(h.x + (ex - h.x) * 0.7 - sway * 0.01, rad, -rad * 6 + (end.z + rad * 6) * 0.72),
      new THREE.Vector3(ex, rad + 0.0004, end.z),
    ];
    g.add(tube([...loop, ...tail], rad, mat));
  }
  // nửa vòng chui dưới tag (lộ ra ở lỗ)
  g.add(tube([
    new THREE.Vector3(h.x, top + rad * 0.9, h.z + rad * 0.2),
    new THREE.Vector3(h.x, lift * 0.5, h.z + rad * 0.4),
    new THREE.Vector3(h.x, lift * 0.4, h.z * 0.4),
    new THREE.Vector3(h.x, lift * 0.5, -rad * 2),
  ], rad, mat, 40));
  return g;
}
function safetyPin(mat: THREE.Material, len = 24 * S): THREE.Group {
  const g = new THREE.Group();
  const r = 0.32 * S, w = 3.2 * S;
  g.add(tube([new THREE.Vector3(0, r, 0), new THREE.Vector3(len * 0.5, r, -w * 0.08), new THREE.Vector3(len, r, 0)], r, mat, 30));
  g.add(tube([new THREE.Vector3(0, r, w), new THREE.Vector3(len * 0.5, r, w * 1.04), new THREE.Vector3(len - 1.6 * S, r, w * 0.7)], r, mat, 30));
  const coil = new THREE.Mesh(new THREE.TorusGeometry(w / 2, r, 10, 28), mat);
  coil.rotation.x = Math.PI / 2; coil.position.set(-w * 0.32, r, w / 2); coil.scale.set(0.7, 1, 1); g.add(coil);
  const head = new THREE.Mesh(new RoundedBoxGeometry(4.2 * S, 1.6 * S, w + 1.4 * S, 2, 0.6 * S), mat);
  head.position.set(len - 0.6 * S, 0.8 * S, w / 2); head.castShadow = true; g.add(head);
  g.traverse((m) => { (m as THREE.Mesh).castShadow = true; });
  return g;
}

// ---------- áo thun gấp ----------
function foldedShirt(color: string, aniso: number, wMm: number, dMm: number): THREE.Group {
  const g = new THREE.Group();
  const knit = new THREE.CanvasTexture(knitCanvas());
  knit.wrapS = knit.wrapT = THREE.RepeatWrapping; knit.anisotropy = aniso; knit.repeat.set(wMm / 22, dMm / 16);
  const c = new THREE.Color(color);
  const lift = (k: number) => c.clone().lerp(new THREE.Color('#FFFFFF'), k);
  const mat = new THREE.MeshStandardMaterial({ color: lift(0.06), roughness: 0.96, bumpMap: knit, bumpScale: 2.2 });
  // thân áo gấp: lớp dưới + lớp gập phía trên, mép bo tròn mềm như vải dày
  const base = new THREE.Mesh(new RoundedBoxGeometry(wMm * S, 13 * S, dMm * S, 8, 6.4 * S), mat);
  base.position.y = 6.5 * S; base.castShadow = true; base.receiveShadow = true;
  g.add(base);
  const top = new THREE.Mesh(new RoundedBoxGeometry(wMm * 0.94 * S, 11 * S, dMm * 0.86 * S, 8, 5.4 * S), mat);
  top.position.set(0, 18.5 * S, dMm * 0.05 * S); top.castShadow = true; top.receiveShadow = true;
  g.add(top);
  const y = 24 * S;
  // cổ áo: viền bo gân hình bán elip ở mép sau + khoảng cổ khoét tối hơn
  const rx = Math.min(40, wMm * 0.22), rz = rx * 0.62, zc = (-dMm * 0.43 + 0.05 * dMm) ;
  const arc: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) { const a = Math.PI * (i / 40); arc.push(new THREE.Vector3(-Math.cos(a) * rx * S, y + 1.2 * S, (zc + Math.sin(a) * rz) * S)); }
  const rib = knit.clone(); rib.repeat.set(30, 1); rib.needsUpdate = true;
  const collar = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(arc), 80, 2.6 * S, 12, false),
    new THREE.MeshStandardMaterial({ color: lift(0.1), roughness: 0.95, bumpMap: rib, bumpScale: 3 }));
  collar.scale.y = 0.55; collar.position.y = y * 0.45; collar.castShadow = true; collar.receiveShadow = true;
  g.add(collar);
  const neck = new THREE.Shape();
  neck.moveTo(-rx + 2.4, 0);
  for (let i = 0; i <= 32; i++) { const a = Math.PI * (i / 32); neck.lineTo(-Math.cos(a) * (rx - 2.4), Math.sin(a) * (rz - 2.4)); }
  const nm = new THREE.Mesh(new THREE.ShapeGeometry(neck, 32), new THREE.MeshStandardMaterial({ color: c.clone().multiplyScalar(0.62), roughness: 1, side: THREE.DoubleSide }));
  nm.rotation.x = Math.PI / 2; nm.scale.set(S, S, S); nm.position.set(0, y + 0.05 * S, zc * S); nm.receiveShadow = true;
  g.add(nm);
  // nhãn mác dệt ở cổ sau (chi tiết nhỏ cho thật)
  const label = new THREE.Mesh(new THREE.BoxGeometry(16 * S, 0.4 * S, 7 * S), new THREE.MeshStandardMaterial({ color: '#F1EEE8', roughness: 0.8 }));
  label.position.set(0, y + 0.3 * S, (zc + 4.5) * S); g.add(label);
  return g;
}
const shirtColorFor = (spec: HTSpec) => {
  const P = htPalette(spec.palette);
  const lum = (h: string) => { const n = parseInt(h.slice(1), 16); return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); };
  if (spec.material === 'kraft') return '#3F5877'; // denim
  if (lum(P.bg) < 90) return '#ECEAE5';
  if (spec.palette === 'yellow') return '#262626';
  return '#30353D';
};

export function hangtagBuilder(o: HT3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong tag');
    const sh = htShape(o.spec.shape);
    const thanks = o.spec.kind === 'thanks';
    const [a, b] = await Promise.all([tagRig(o, aniso, 'front'), tagRig(o, aniso, 'back')]);
    const g = new THREE.Group();
    const kraft = o.spec.material === 'kraft', foil = o.spec.material === 'foil';
    const P = htPalette(o.spec.palette);

    // áo gấp làm nền
    const shW = thanks ? 180 : Math.max(150, sh.wMm * 2.3), shD = thanks ? 160 : Math.max(132, sh.hMm * 1.4);
    const shirt = foldedShirt(shirtColorFor(o.spec), aniso, shW, shD);
    g.add(shirt);
    const shirtTop = 24 * S;

    const strMat = kraft
      ? new THREE.MeshStandardMaterial({ map: twineTex('#B08A57'), roughness: 1 })
      : foil
        ? new THREE.MeshStandardMaterial({ color: P.bg === '#151515' ? '#1E1E1E' : '#E9DFC6', roughness: 0.55, metalness: 0.1 })
        : new THREE.MeshStandardMaterial({ map: twineTex(P.id === 'street' || P.id === 'yellow' ? '#1A1A1A' : '#F3F0EA'), roughness: 0.9 });
    const rad = (kraft ? 0.62 : 0.48) * S;
    const pinMat = new THREE.MeshStandardMaterial({ color: foil ? '#D9B868' : '#C8CCD2', metalness: 1, roughness: 0.25 });

    // tag 1: mặt trước, nằm chéo trên áo, đầu dây gài kim băng vào áo
    const lift = thanks ? 0.02 * S : rad * 2;
    const r1 = new THREE.Group();
    a.g.position.y = lift;
    r1.add(a.g);
    if (!thanks && a.hole) {
      const end = new THREE.Vector3(a.w * 0.5 - 30 * S, 0, -sh.hMm * 0.42 * S);
      r1.add(stringRig(a, lift, end, strMat, rad, 1));
      const pin = safetyPin(pinMat);
      pin.position.set(end.x - 22 * S, 0, end.z - 1.6 * S);
      pin.rotation.y = 0.15;
      r1.add(pin);
    }
    // canh tâm tag theo tâm của nó rồi đặt lên áo
    r1.position.set(-a.w / 2, 0, -a.h / 2);
    const p1 = new THREE.Group(); p1.add(r1);
    p1.rotation.y = thanks ? 0.12 : 0.32;
    p1.position.set(thanks ? -shW * 0.05 * S : shW * 0.08 * S, shirtTop, thanks ? -shD * 0.02 * S : shD * 0.06 * S);
    g.add(p1);

    // tag 2: lật mặt sau, nằm trên sàn trước–phải áo, dây buông lỏng
    const r2 = new THREE.Group();
    b.g.position.y = lift;
    r2.add(b.g);
    if (!thanks && b.hole) {
      const end = new THREE.Vector3(b.w * 0.5 + 26 * S, 0, -sh.hMm * 0.3 * S);
      r2.add(stringRig(b, lift, end, strMat, rad, -1.4));
    }
    r2.position.set(-b.w / 2, 0, -b.h / 2);
    const p2 = new THREE.Group(); p2.add(r2);
    const rot2 = -0.42;
    p2.rotation.y = rot2;
    const halfX = 0.5 * sh.wMm * Math.cos(rot2) + 0.5 * sh.hMm * Math.sin(-rot2);
    p2.position.set((shW * 0.5 + halfX + (thanks ? 4 : -sh.wMm * 0.15)) * S, 0, (shD * 0.5 + sh.hMm * (thanks ? -0.1 : 0.12)) * S);
    g.add(p2);

    // canh giữa cả cảnh
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    g.position.set(-c.x, 0, -c.z);
    const out = new THREE.Group(); out.add(g);
    return { group: out, view: { az: 0.18, el: 0.86 }, aim: 0.2, zoom: thanks ? 1.3 : 1.42, blob: 0 };
  };
}

export { HOLE_R_MM };
