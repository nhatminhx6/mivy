'use client';
// Thẻ hành lý 3D: vali vỏ cứng (gân dọc, khoá kéo, tay kéo rút, bánh xe, quai hông) — thẻ treo vào QUAI HÔNG bằng
// cáp thép / quai nhựa / quai da / quai cao su vòng qua khe thẻ (kiểu "lark's head"), hơi lắc nhẹ;
// thẻ thứ 2 nằm dưới sàn lật mặt sau (thẻ thông tin). Thẻ đùn ĐÚNG viền + khe, mặt trước/sau dán đúng thiết kế.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { U, ltKind, ltLeather, ltPalette, ltRubber, outlinePath, slotPath, type LTSpec } from './luggagetag-engine';

export interface LT3DOpts {
  spec: LTSpec;
  front: SVGSVGElement | null; back: SVGSVGElement | null;       // texture 2 mặt (khổ thân thẻ, không lề)
  back2?: SVGSVGElement | null;                                   // mặt sau thẻ thứ 2 (người kế tiếp trong danh sách)
  mask?: SVGSVGElement | null;                                    // da / cao su: trắng = phần ép kim / nổi
  fontCss: string;
}

const M = S / U; // 1 đơn vị engine (0.1mm) → đơn vị 3D

// ---------- texture ----------
async function faceTex(el: SVGSVGElement, fontCss: string, outW: number, aniso: number, mirror: boolean, wU: number, hU: number, bg = '#FFFFFF'): Promise<THREE.Texture> {
  const vb = el.viewBox.baseVal;
  const c = await svgToCanvas(await selfContainedSvg(el, fontCss), outW, Math.round((outW * vb.height) / vb.width), bg);
  const t = canvasTex(c, aniso);
  t.flipY = false;
  // UV nắp khối đùn = toạ độ hình (đơn vị engine) → 0..1; mặt sau nhìn từ phía sau nên lật ngang
  t.repeat.set((mirror ? -1 : 1) / wU, 1 / hU);
  t.offset.set(mirror ? 1 : 0, 0);
  t.needsUpdate = true;
  return t;
}
function noiseCanvas(seed: number, n: number, fn: (x: CanvasRenderingContext2D, r: () => number, N: number) => void): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = n;
  const x = c.getContext('2d')!;
  let sd = seed; const r = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
  fn(x, r, n);
  return c;
}
let grainCache: HTMLCanvasElement | null = null;
const grainCanvas = () => (grainCache ??= noiseCanvas(11, 512, (x, r, N) => {
  // vân da: các ô hạt bất định + rãnh nhỏ
  x.fillStyle = '#808080'; x.fillRect(0, 0, N, N);
  for (let i = 0; i < 5200; i++) {
    const px = r() * N, py = r() * N, rr = 1.5 + r() * 4.5, v = 95 + r() * 90;
    x.fillStyle = `rgb(${v},${v},${v})`; x.beginPath(); x.ellipse(px, py, rr, rr * (0.6 + r() * 0.6), r() * 3, 0, Math.PI * 2); x.fill();
  }
  x.strokeStyle = 'rgba(40,40,40,0.35)'; x.lineWidth = 0.8;
  for (let i = 0; i < 260; i++) { const px = r() * N, py = r() * N; x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + (r() - 0.5) * 30, py + (r() - 0.5) * 30, px + (r() - 0.5) * 50, py + (r() - 0.5) * 50); x.stroke(); }
}));
let ribCache: HTMLCanvasElement | null = null;
/** gân dọc vỏ vali (bump): 9 gân / mặt */
const ribCanvas = () => (ribCache ??= noiseCanvas(3, 512, (x, _r, N) => {
  const g = x.createLinearGradient(0, 0, N, 0);
  const ribs = 9;
  for (let i = 0; i <= ribs * 4; i++) {
    const t = i / (ribs * 4), ph = (i % 4);
    const v = ph === 0 ? 70 : ph === 1 ? 175 : ph === 2 ? 200 : 150;
    g.addColorStop(t, `rgb(${v},${v},${v})`);
  }
  x.fillStyle = g; x.fillRect(0, 0, N, N);
}));

// ---------- thẻ đùn khối ----------
interface TagRig { g: THREE.Group; t: number; slotH: number; topY: number; hMm: number }
async function tagRig(o: LT3DOpts, aniso: number, back: SVGSVGElement | null): Promise<TagRig> {
  const k = ltKind(o.spec.kind);
  const wU = k.wMm * U, hU = k.hMm * U;
  const kind = o.spec.kind;
  const depth = (kind === 'pvc' ? 0.76 : kind === 'leather' ? 1.8 : 2.4) * U;
  const bevel = kind === 'pvc' ? 0 : kind === 'leather' ? 3.5 : 7;
  const outW = Math.min(1600, Math.round(k.wMm * 26));
  const leather = ltLeather(o.spec.leather), rubber = ltRubber(o.spec.rubber);
  const base = kind === 'leather' ? leather.color : rubber.base;
  const [ft, bt, mt] = await Promise.all([
    faceTex(o.front!, o.fontCss, outW, aniso, false, wU, hU),
    faceTex(back!, o.fontCss, outW, aniso, true, wU, hU),
    o.mask && kind !== 'pvc' ? faceTex(o.mask, o.fontCss, outW, aniso, false, wU, hU, '#000000') : Promise.resolve(null),
  ]);
  if (mt) mt.colorSpace = THREE.NoColorSpace;

  const shapes = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${outlinePath(kind)}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p));
  const slotShape = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${slotPath(kind)}"/></svg>`).paths.flatMap((p) => SVGLoader.createShapes(p))[0];
  shapes[0].holes.push(new THREE.Path(slotShape.getPoints(24)));
  const geo = new THREE.ExtrudeGeometry(shapes, {
    depth, curveSegments: 24,
    bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: kind === 'rubber' ? 5 : 3,
  });
  // nhóm 0 (nắp) = nửa nắp đáy + nửa nắp trên → tách để gán texture 2 mặt
  const g0 = geo.groups[0];
  const half = g0.count / 2;
  geo.clearGroups();
  geo.addGroup(g0.start, half, 0);
  geo.addGroup(g0.start + half, half, 1);
  const rest = geo.index ? geo.index.count : geo.attributes.position.count;
  geo.addGroup(g0.start + g0.count, rest - g0.count, 2);
  const pos = geo.attributes.position;
  const frontIsFirst = pos.getZ(geo.index ? geo.index.getX(g0.start) : g0.start) > depth / 2;

  let fMat: THREE.Material, bMat: THREE.Material, edge: THREE.Material;
  if (kind === 'pvc') {
    const pvc = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.18 });
    fMat = pvc(ft); bMat = pvc(bt);
    edge = new THREE.MeshStandardMaterial({ color: '#F2F2EE', roughness: 0.5 });
  } else if (kind === 'leather') {
    const grain = canvasTex(grainCanvas(), aniso); grain.colorSpace = THREE.NoColorSpace;
    grain.wrapS = grain.wrapT = THREE.RepeatWrapping; grain.repeat.set(1 / 260, 1 / 260);
    fMat = new THREE.MeshPhysicalMaterial({ map: ft, roughness: 0.62, bumpMap: grain, bumpScale: 0.9, sheen: 0.35, sheenRoughness: 0.6, clearcoat: 0.12 });
    bMat = new THREE.MeshPhysicalMaterial({ map: bt, roughness: 0.62, bumpMap: grain, bumpScale: 0.9, sheen: 0.35, sheenRoughness: 0.6 });
    edge = new THREE.MeshStandardMaterial({ color: new THREE.Color(base).multiplyScalar(0.62), roughness: 0.75 });
  } else {
    fMat = new THREE.MeshPhysicalMaterial({ map: ft, roughness: 0.78, bumpMap: mt ?? undefined, bumpScale: 6, sheen: 0.2 });
    bMat = new THREE.MeshPhysicalMaterial({ map: bt, roughness: 0.8 });
    edge = new THREE.MeshStandardMaterial({ color: base, roughness: 0.8 });
  }
  const mesh = new THREE.Mesh(geo, frontIsFirst ? [fMat, bMat, edge] : [bMat, fMat, edge]);
  mesh.castShadow = true;

  const inner = new THREE.Group();
  inner.scale.set(M, -M, M); // toạ độ hình (y xuống) → lật y
  inner.add(mesh);
  const zFront = depth + bevel, zBack = -bevel;
  // da: ép kim = lớp kim loại riêng (alpha từ mặt nạ), chỉ 1 mặt
  if (kind === 'leather' && o.spec.foil !== 'deboss' && mt) {
    const metal = new THREE.MeshPhysicalMaterial({
      color: o.spec.foil === 'gold' ? '#E2BE6A' : '#D5D9DF', metalness: 1, roughness: 0.24, clearcoat: 0.3,
      alphaMap: mt, transparent: true, alphaTest: 0.4, side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
    const fg = new THREE.Mesh(new THREE.ShapeGeometry(shapes, 24), metal);
    fg.position.z = zFront + 0.25;
    inner.add(fg);
  }
  // da / cao su: tấm nhựa trong phủ ô cửa sổ mặt sau (bóng, phản chiếu)
  if (k.window) {
    const wdw = k.window;
    const sh = new THREE.Shape();
    const x = wdw.x * U, y = wdw.y * U, w = wdw.w * U, h = wdw.h * U, r = wdw.r * U;
    sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r);
    sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h); sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    const film = new THREE.Mesh(new THREE.ShapeGeometry(sh, 8), new THREE.MeshPhysicalMaterial({
      color: '#FFFFFF', transparent: true, opacity: 0.16, roughness: 0.04, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide, depthWrite: false,
    }));
    film.position.z = zBack - 0.6;
    film.renderOrder = 2;
    inner.add(film);
  }

  // gốc toạ độ = tâm khe xỏ dây, thẻ treo xuống -y, mặt trước hướng +z
  const g = new THREE.Group();
  inner.position.set(-(k.wMm / 2) * S, k.slot.y * S, -((zFront + zBack) / 2) * M);
  g.add(inner);
  return { g, t: (zFront - zBack) * M, slotH: k.slot.h * S, topY: k.slot.y * S, hMm: k.hMm };
}

// ---------- dây treo ----------
function ribbon(curve: THREE.Curve<THREE.Vector3>, n: number, width: number, wdirAt: (t: number, p: THREE.Vector3) => THREE.Vector3, closed: boolean): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const N = closed ? n : n + 1;
  for (let i = 0; i < N; i++) {
    const t = i / n;
    const p = curve.getPointAt(t);
    const tan = curve.getTangentAt(t);
    const w = wdirAt(t, p).clone();
    w.sub(tan.clone().multiplyScalar(w.dot(tan))).normalize().multiplyScalar(width / 2);
    pos.push(p.x - w.x, p.y - w.y, p.z - w.z, p.x + w.x, p.y + w.y, p.z + w.z);
    uv.push(t * 8, 0, t * 8, 1);
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = ((i + 1) % N) * 2;
    idx.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

/** dây vòng qua khe thẻ + vòng qua quai (thanh ngang dọc theo trục barAxis, tâm cao hb trên tâm khe), toạ độ cục bộ thẻ */
function strapLoop(o: LT3DOpts, rig: TagRig, hb: number, barR: number, barAxis: THREE.Vector3): THREE.Group {
  const kind = o.spec.kind;
  const g = new THREE.Group();
  const tt = rig.t / 2 + 0.75 * S;
  const sTop = rig.slotH / 2, yTop = rig.topY;
  const d = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), barAxis).normalize(); // hướng ngang vuông góc quai
  const zN = new THREE.Vector3(0, 0, 1);
  const dirAt = (v: number) => {
    const k = THREE.MathUtils.smoothstep(v, yTop, hb - barR * 2);
    return zN.clone().lerp(d, k).normalize();
  };
  const P = (u: number, v: number) => dirAt(v).multiplyScalar(u).add(new THREE.Vector3(0, v, 0));
  const R = barR + 1.1 * S;
  const pts = [
    P(0, sTop - 0.9 * S), P(tt, sTop), P(tt, yTop + 1.2 * S), P(tt * 1.6 + 1.5 * S, (yTop + hb) / 2),
    P(R, hb - 2 * S), P(R * 0.72, hb + R * 0.72), P(0, hb + R), P(-R * 0.72, hb + R * 0.72), P(-R, hb - 2 * S),
    P(-tt * 1.6 - 1.5 * S, (yTop + hb) / 2), P(-tt, yTop + 1.2 * S), P(-tt, sTop),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const xA = new THREE.Vector3(1, 0, 0);
  const wAt = (_t: number, p: THREE.Vector3) => xA.clone().lerp(barAxis, THREE.MathUtils.smoothstep(p.y, yTop, hb - barR * 2)).normalize();
  if (kind === 'pvc' && o.spec.strap === 'cable') {
    const steel = new THREE.MeshStandardMaterial({ color: '#D3D7DC', metalness: 1, roughness: 0.26 });
    const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 260, 0.85 * S, 10, true), steel);
    tube.castShadow = true; g.add(tube);
    // ốc nối cáp ở sợi trước
    const t0 = 0.17;
    const p = curve.getPointAt(t0), tan = curve.getTangentAt(t0);
    const con = new THREE.Mesh(new THREE.CylinderGeometry(1.9 * S, 1.9 * S, 11 * S, 20), steel);
    con.position.copy(p); con.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    con.castShadow = true; g.add(con);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(2.05 * S, 2.05 * S, 1.4 * S, 20), new THREE.MeshStandardMaterial({ color: '#9EA4AC', metalness: 1, roughness: 0.4 }));
    ring.position.copy(p); ring.quaternion.copy(con.quaternion); g.add(ring);
    return g;
  }
  const P0 = ltPalette(o.spec.palette);
  const width = (kind === 'leather' ? 11 : kind === 'rubber' ? 8 : 6.5) * S;
  let mat: THREE.Material;
  if (kind === 'leather') mat = new THREE.MeshPhysicalMaterial({ color: ltLeather(o.spec.leather).color, roughness: 0.6, sheen: 0.3, side: THREE.DoubleSide });
  else if (kind === 'rubber') mat = new THREE.MeshStandardMaterial({ color: ltRubber(o.spec.rubber).base, roughness: 0.8, side: THREE.DoubleSide });
  else mat = new THREE.MeshPhysicalMaterial({ color: '#F4F8FA', transparent: true, opacity: 0.55, roughness: 0.12, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const band = new THREE.Mesh(ribbon(curve, 220, width, wAt, true), mat);
  band.castShadow = true; band.renderOrder = 3; g.add(band);
  // khoá: da = khoá kim loại chữ nhật; nhựa / cao su = nút bấm tròn
  const t0 = 0.2;
  const p = curve.getPointAt(t0), tan = curve.getTangentAt(t0);
  const wd = wAt(t0, p).clone().sub(tan.clone().multiplyScalar(wAt(t0, p).dot(tan))).normalize();
  const nrm = new THREE.Vector3().crossVectors(tan, wd).normalize();
  const basis = new THREE.Matrix4().makeBasis(wd, tan, nrm);
  if (kind === 'leather') {
    const metal = new THREE.MeshStandardMaterial({ color: '#C9A75E', metalness: 1, roughness: 0.3 });
    const bw = width / S + 4, bh = 9;
    const fr = new THREE.Group();
    const bar = (w: number, h: number, x: number, y: number) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w * S, h * S, 1.6 * S, 2, 0.7 * S), metal); m.position.set(x * S, y * S, 0); m.castShadow = true; fr.add(m); };
    bar(bw, 1.8, 0, bh / 2); bar(bw, 1.8, 0, -bh / 2); bar(1.8, bh, bw / 2, 0); bar(1.8, bh, -bw / 2, 0); bar(bw - 2, 1.4, 0, 0);
    fr.applyMatrix4(basis); fr.position.copy(p).add(nrm.clone().multiplyScalar(1.2 * S));
    g.add(fr);
  } else {
    const snap = new THREE.Mesh(new THREE.CylinderGeometry(3.2 * S, 3.4 * S, 1.6 * S, 24), new THREE.MeshStandardMaterial({ color: kind === 'rubber' ? '#E9E9E9' : P0.accent, metalness: kind === 'rubber' ? 0.6 : 0.1, roughness: 0.35 }));
    snap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nrm);
    snap.position.copy(p).add(nrm.clone().multiplyScalar(0.9 * S));
    g.add(snap);
  }
  return g;
}

/** dây nằm phẳng dưới sàn (thẻ lật mặt sau) — toạ độ cục bộ thẻ, vòng dẹt kéo dài phía trên đầu thẻ */
function floorStrap(o: LT3DOpts, rig: TagRig): THREE.Object3D {
  const kind = o.spec.kind;
  const z = -(rig.t / 2 + 0.7 * S), sTop = rig.slotH / 2, yTop = rig.topY;
  const L = (kind === 'pvc' ? 46 : 54) * S, Wd = (kind === 'pvc' ? 13 : 16) * S;
  const pts = [
    new THREE.Vector3(0, sTop - 0.8 * S, 0), new THREE.Vector3(Wd * 0.3, yTop + 3 * S, z), new THREE.Vector3(Wd * 0.62, yTop + L * 0.45, z),
    new THREE.Vector3(Wd * 0.42, yTop + L * 0.92, z), new THREE.Vector3(-Wd * 0.3, yTop + L, z), new THREE.Vector3(-Wd * 0.7, yTop + L * 0.55, z),
    new THREE.Vector3(-Wd * 0.3, yTop + 3 * S, z),
  ];
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  if (kind === 'pvc' && o.spec.strap === 'cable') {
    return new THREE.Mesh(new THREE.TubeGeometry(curve, 160, 0.85 * S, 8, true), new THREE.MeshStandardMaterial({ color: '#D3D7DC', metalness: 1, roughness: 0.26 }));
  }
  const width = (kind === 'leather' ? 11 : kind === 'rubber' ? 8 : 6.5) * S;
  const mat = kind === 'leather' ? new THREE.MeshPhysicalMaterial({ color: ltLeather(o.spec.leather).color, roughness: 0.6, sheen: 0.3, side: THREE.DoubleSide })
    : kind === 'rubber' ? new THREE.MeshStandardMaterial({ color: ltRubber(o.spec.rubber).base, roughness: 0.8, side: THREE.DoubleSide })
      : new THREE.MeshPhysicalMaterial({ color: '#F4F8FA', transparent: true, opacity: 0.55, roughness: 0.12, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  const zA = new THREE.Vector3(0, 0, 1);
  return new THREE.Mesh(ribbon(curve, 160, width, (_t, _p) => zA.clone().cross(curve.getTangentAt(_t)).normalize(), true), mat);
}

// ---------- vali vỏ cứng ----------
interface Case { g: THREE.Group; bar: THREE.Vector3; barR: number; focus: THREE.Box3 }
function suitcase(color: string, aniso: number): Case {
  const W = 380, H = 560, D = 230, y0 = 72, R = 30;
  const g = new THREE.Group();
  const ribs = canvasTex(ribCanvas(), aniso); ribs.colorSpace = THREE.NoColorSpace;
  const shell = new THREE.MeshPhysicalMaterial({ color, roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.22, bumpMap: ribs, bumpScale: 3.2 });
  const add = (m: THREE.Mesh) => { m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
  const body = add(new THREE.Mesh(new RoundedBoxGeometry(W * S, H * S, D * S, 6, R * S), shell));
  body.position.set(0, (y0 + H / 2) * S, 0);
  // đường khoá kéo quanh thân (giữa bề dày)
  const zip = add(new THREE.Mesh(new RoundedBoxGeometry((W + 3) * S, (H + 3) * S, 11 * S, 6, (R + 1.5) * S), new THREE.MeshStandardMaterial({ color: '#26282C', roughness: 0.7 })));
  zip.position.copy(body.position);
  const dark = new THREE.MeshStandardMaterial({ color: '#2A2C31', roughness: 0.55 });
  const alu = new THREE.MeshStandardMaterial({ color: '#C7CBD1', metalness: 0.9, roughness: 0.28 });
  const rubber = new THREE.MeshStandardMaterial({ color: '#1A1B1E', roughness: 0.85 });
  // quai hông (bên +x), chạy dọc trục z
  const yb = y0 + H / 2 + 6, xb = W / 2 + 25, barR = 7.5;
  const hc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(W / 2 - 3, yb, -62), new THREE.Vector3(W / 2 + 14, yb, -58), new THREE.Vector3(xb, yb, -40),
    new THREE.Vector3(xb, yb, 40), new THREE.Vector3(W / 2 + 14, yb, 58), new THREE.Vector3(W / 2 - 3, yb, 62),
  ].map((v) => v.multiplyScalar(S)));
  add(new THREE.Mesh(new THREE.TubeGeometry(hc, 80, barR * S, 14, false), dark));
  for (const z of [-62, 62]) {
    const mnt = add(new THREE.Mesh(new RoundedBoxGeometry(14 * S, 34 * S, 26 * S, 3, 5 * S), dark));
    mnt.position.set((W / 2 + 2) * S, yb * S, z * S);
  }
  // quai xách trên nóc (dọc trục x)
  const tc = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-62, y0 + H - 3, 30), new THREE.Vector3(-56, y0 + H + 16, 30), new THREE.Vector3(-36, y0 + H + 24, 30),
    new THREE.Vector3(36, y0 + H + 24, 30), new THREE.Vector3(56, y0 + H + 16, 30), new THREE.Vector3(62, y0 + H - 3, 30),
  ].map((v) => v.multiplyScalar(S)));
  add(new THREE.Mesh(new THREE.TubeGeometry(tc, 80, 7.5 * S, 14, false), dark));
  // tay kéo rút (phía sau)
  for (const x of [-92, 92]) {
    const rod = add(new THREE.Mesh(new THREE.CylinderGeometry(7 * S, 7 * S, 230 * S, 20), alu));
    rod.position.set(x * S, (y0 + H + 95) * S, (-D / 2 + 26) * S);
    const sleeve = add(new THREE.Mesh(new RoundedBoxGeometry(26 * S, 18 * S, 22 * S, 2, 4 * S), dark));
    sleeve.position.set(x * S, (y0 + H + 4) * S, (-D / 2 + 26) * S);
  }
  const grip = add(new THREE.Mesh(new RoundedBoxGeometry(222 * S, 30 * S, 30 * S, 4, 12 * S), dark));
  grip.position.set(0, (y0 + H + 214) * S, (-D / 2 + 26) * S);
  // bánh xe xoay 4 góc
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const hx = sx * (W / 2 - 38), hz = sz * (D / 2 - 38);
    const hous = add(new THREE.Mesh(new RoundedBoxGeometry(56 * S, 34 * S, 56 * S, 3, 9 * S), dark));
    hous.position.set(hx * S, (y0 - 12) * S, hz * S);
    for (const o of [-13, 13]) {
      const wh = add(new THREE.Mesh(new THREE.CylinderGeometry(25 * S, 25 * S, 13 * S, 28), rubber));
      wh.rotation.z = Math.PI / 2; wh.position.set((hx + o) * S, 25 * S, hz * S);
    }
  }
  // góc bảo vệ dưới
  const focus = new THREE.Box3(new THREE.Vector3((W / 2 - 10) * S, (yb - 40) * S, -70 * S), new THREE.Vector3((xb + 12) * S, (yb + 22) * S, 70 * S));
  return { g, bar: new THREE.Vector3(xb * S, yb * S, 0), barR: barR * S, focus };
}

/** khung hình chỉ ôm vùng quai + thẻ: đặt boundingBox các mesh vali = vùng focus (không ảnh hưởng cull vì dùng boundingSphere) */
function frameOnly(root: THREE.Object3D, focus: THREE.Box3) {
  root.updateMatrixWorld(true);
  const corners = [0, 1].flatMap((a) => [0, 1].flatMap((b) => [0, 1].map((c) => new THREE.Vector3(a ? focus.max.x : focus.min.x, b ? focus.max.y : focus.min.y, c ? focus.max.z : focus.min.z))));
  root.traverse((n) => {
    const m = n as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry = m.geometry.clone();
    m.geometry.computeBoundingSphere();
    const inv = m.matrixWorld.clone().invert();
    m.geometry.boundingBox = new THREE.Box3().setFromPoints(corners.map((p) => p.clone().applyMatrix4(inv)));
  });
}

export function luggageTagBuilder(o: LT3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong thẻ');
    const P = ltPalette(o.spec.palette);
    const out = new THREE.Group();
    const kase = suitcase(o.spec.kind === 'pvc' ? P.caseColor : o.spec.kind === 'leather' ? '#C9CDD4' : '#2E3238', aniso);
    out.add(kase.g);

    // thẻ treo ở quai hông
    const theta = 1.12;
    const barAxis = new THREE.Vector3(-Math.sin(theta), 0, Math.cos(theta));
    const [rig, rig2] = await Promise.all([tagRig(o, aniso, o.back), tagRig(o, aniso, o.back2 || o.back)]);
    const hb = (o.spec.kind === 'pvc' ? 50 : 56) * S;
    const hang = new THREE.Group();
    hang.add(rig.g);
    hang.add(strapLoop(o, rig, hb, kase.barR, barAxis));
    hang.position.copy(kase.bar).add(new THREE.Vector3(0, -hb, 0));
    hang.rotation.y = theta;
    // lắc nhẹ quanh trục quai (thẻ hơi chếch ra ngoài)
    const swing = new THREE.Group(); swing.add(hang);
    swing.position.copy(kase.bar); hang.position.set(0, -hb, 0);
    swing.rotateOnWorldAxis(new THREE.Vector3(0, 0, 1), 0.07);
    out.add(swing);

    // thẻ thứ 2 nằm sàn, lật mặt sau
    const lay = new THREE.Group();
    lay.add(rig2.g);
    lay.add(floorStrap(o, rig2));
    lay.rotation.order = 'YXZ';
    lay.rotation.x = Math.PI / 2;   // mặt trước úp xuống
    lay.rotation.y = 0.95 + Math.PI; // đầu thẻ quay ra xa camera → chữ mặt sau đọc xuôi
    lay.rotation.z = 0.1;
    const fx = (380 / 2 + 84) * S, fz = -6 * S;
    lay.position.set(fx, rig2.t / 2 + 0.2 * S, fz);
    out.add(lay);

    frameOnly(kase.g, kase.focus);
    return { group: out, view: { az: 0.95, el: 0.3 }, aim: 0.52, zoom: 1.12, blob: 0 };
  };
}
