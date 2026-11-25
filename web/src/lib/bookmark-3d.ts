'use client';
// Bookmark 3D: cuốn sách bìa cứng mở nằm trên mặt bàn (2 khối trang cong, gáy, bìa vải), bookmark đặt trên trang phải,
// đầu bookmark thò ra khỏi mép trên sách + dây tua buông xuống. Bên cạnh 2 bookmark rời xoè (1 lật mặt sau).
// Bookmark đùn khối đúng hình bế + lỗ (dày giấy thật), ép kim = lớp kim loại riêng theo mặt nạ.

import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { U, bmPalette, bmSize, bmTassel, holeOf, shapePath, type BMSpec } from './bookmark-engine';

export interface BM3DOpts {
  spec: BMSpec;
  front: SVGSVGElement | null; back: SVGSVGElement | null; // lớp in, khổ thành phẩm (không lề xén)
  foilFront?: SVGSVGElement | null; foilBack?: SVGSVGElement | null;
  fontCss: string;
}

const M = S / U; // 1 đơn vị engine (0.1mm) → đơn vị 3D

// ---------- texture mặt bookmark ----------
async function faceTex(el: SVGSVGElement, fontCss: string, outW: number, aniso: number, mirror: boolean, wU: number, hU: number, bg?: string): Promise<THREE.Texture> {
  const vb = el.viewBox.baseVal;
  const c = await svgToCanvas(await selfContainedSvg(el, fontCss), outW, Math.round((outW * vb.height) / vb.width), bg);
  const t = canvasTex(c, aniso);
  if (bg === '#000000') t.colorSpace = THREE.NoColorSpace;
  t.flipY = false;
  // UV nắp khối đùn = toạ độ hình (đơn vị engine) → co về 0..1; mặt sau nhìn từ dưới nên lật ngang
  t.repeat.set((mirror ? -1 : 1) / wU, 1 / hU);
  t.offset.set(mirror ? 1 : 0, 0);
  t.needsUpdate = true;
  return t;
}

interface Rig { g: THREE.Group; w: number; h: number; t: number; hole: THREE.Vector3 | null }
/** bookmark nằm phẳng, mặt `up` hướng lên; gốc = góc trên-trái (x ngang, z dọc xuống đáy bookmark), đáy ở y=0 */
async function bookmarkRig(o: BM3DOpts, aniso: number, up: 'front' | 'back', tex: { f: THREE.Texture; b: THREE.Texture; ff?: THREE.Texture; fb?: THREE.Texture }): Promise<Rig> {
  const sz = bmSize(o.spec.size);
  const depth = 0.36 * U; // couche 300 ~ 0.36mm
  const data = new SVGLoader().parse(`<svg xmlns="http://www.w3.org/2000/svg"><path d="${shapePath(o.spec)}"/></svg>`);
  const shapes = data.paths.flatMap((p) => SVGLoader.createShapes(p));
  const hole = holeOf(o.spec);
  if (hole) { const hp = new THREE.Path(); hp.absarc(hole.cx, hole.cy, hole.r, 0, Math.PI * 2, true); shapes[0].holes.push(hp); }
  const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 28 });
  const g0 = geo.groups[0];
  const half = g0.count / 2;
  geo.clearGroups();
  geo.addGroup(g0.start, half, 0);
  geo.addGroup(g0.start + half, half, 1);
  const rest = geo.index ? geo.index.count : geo.attributes.position.count;
  geo.addGroup(g0.start + g0.count, rest - g0.count, 2);
  const frontIsFirst = geo.attributes.position.getZ(g0.start) > depth / 2;

  const foil = o.spec.material === 'foil';
  const paper = (map: THREE.Texture) => new THREE.MeshPhysicalMaterial({ map, roughness: foil ? 0.55 : 0.62, clearcoat: 0.2, clearcoatRoughness: 0.6 });
  const fMat = paper(tex.f), bMat = paper(tex.b);
  const edge = new THREE.MeshStandardMaterial({ color: '#F1EEE7', roughness: 0.9 });
  const mesh = new THREE.Mesh(geo, frontIsFirst ? [fMat, bMat, edge] : [bMat, fMat, edge]);
  mesh.castShadow = true; mesh.receiveShadow = true;

  const inner = new THREE.Group();
  inner.scale.set(M, -M, M);
  inner.add(mesh);
  if (foil && tex.ff && tex.fb) {
    // lớp ép kim: mặt trên chỉ hiện khi nhìn từ trên (FrontSide), mặt dưới chỉ khi nhìn từ dưới (BackSide) → không lộ xuyên giấy
    const gold = (alphaMap: THREE.Texture, side: THREE.Side) => new THREE.MeshPhysicalMaterial({
      color: '#F3D27E', metalness: 1, roughness: 0.3, envMapIntensity: 1.5, clearcoat: 0.5, alphaMap, transparent: true, alphaTest: 0.35, side,
      polygonOffset: side === THREE.FrontSide, polygonOffsetFactor: -1, polygonOffsetUnits: -1,
    });
    const sg = new THREE.ShapeGeometry(shapes, 28);
    const top = new THREE.Mesh(sg, gold(tex.ff, THREE.FrontSide)); top.position.z = depth + 0.12; inner.add(top);
    const bot = new THREE.Mesh(sg, gold(tex.fb, THREE.BackSide)); bot.position.z = -0.12; inner.add(bot);
  }
  const flat = new THREE.Group();
  inner.rotation.x = -Math.PI / 2; // mặt trước (+z cục bộ) hướng lên, đầu bookmark ở z=0
  flat.add(inner);
  let holeV = hole ? new THREE.Vector3(hole.cx * M, depth * M, hole.cy * M) : null;
  if (up === 'back') {
    flat.rotation.z = Math.PI;
    flat.position.set(sz.wMm * S, depth * M, 0);
    if (holeV) holeV = new THREE.Vector3(sz.wMm * S - holeV.x, depth * M, holeV.z);
  }
  const g = new THREE.Group(); g.add(flat);
  return { g, w: sz.wMm * S, h: sz.hMm * S, t: depth * M, hole: holeV };
}

// ---------- dây tua ----------
function tube(pts: THREE.Vector3[], r: number, mat: THREE.Material, seg = 64): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5), seg, r, 8, false), mat);
  m.castShadow = true;
  return m;
}
let sd = 7;
const rnd = () => { sd = (sd * 16807) % 2147483647; return sd / 2147483647; };
/**
 * dây tua: sợi dây thắt qua lỗ (vòng ôm mép trên), rơi xuống `knot` (trên mặt bàn), chỏm buộc + bó sợi tua xoè theo `dir`.
 * Toạ độ thế giới (đơn vị 3D). `topEdge` = điểm mép trên bookmark ngay phía trên lỗ.
 */
function tassel(hole: THREE.Vector3, topEdge: THREE.Vector3, knot: THREE.Vector3, dir: THREE.Vector3, color: string, thick: number): THREE.Group {
  const g = new THREE.Group();
  const col = new THREE.Color(color);
  const cord = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.55, sheen: 1, sheenColor: col.clone().lerp(new THREE.Color('#FFFFFF'), 0.5), sheenRoughness: 0.4 });
  const r = 0.55 * S;
  const up = new THREE.Vector3(0, 1, 0);
  const out = topEdge.clone().sub(hole).setY(0).normalize();
  // vòng dây: từ lỗ (mặt trên) vòng qua mép trên xuống mặt dưới rồi về lỗ
  const loopTop = [hole.clone().addScaledVector(up, r * 1.2), topEdge.clone().addScaledVector(up, r * 1.6).addScaledVector(out, r * 1.2), topEdge.clone().addScaledVector(out, r * 2.6).addScaledVector(up, -thick * 0.5)];
  // dây chính buông xuống bàn
  const mid = loopTop[2].clone().lerp(knot, 0.5);
  mid.y = Math.max(knot.y + r, (loopTop[2].y + knot.y) * 0.45);
  g.add(tube([...loopTop, loopTop[2].clone().lerp(mid, 0.5).addScaledVector(up, -r), mid, knot.clone().addScaledVector(dir, -2 * S).setY(knot.y + r * 0.6), knot], r, cord, 90));
  // chỏm buộc: hạt tròn + nút quấn
  const d = dir.clone().normalize();
  const bead = new THREE.Mesh(new THREE.SphereGeometry(2.1 * S, 20, 14), cord); bead.position.copy(knot).setY(knot.y + 0.4 * S); bead.scale.set(1, 0.85, 1); bead.castShadow = true; g.add(bead);
  const capC = knot.clone().addScaledVector(d, 3.2 * S);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.7 * S, 2.1 * S, 4.2 * S, 18), cord);
  cap.position.copy(capC).setY(knot.y + 0.3 * S);
  cap.quaternion.setFromUnitVectors(up, d); cap.castShadow = true; g.add(cap);
  // bó sợi tua nằm xoè trên bàn
  const side = new THREE.Vector3().crossVectors(up, d).normalize();
  const strand = new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.5, sheen: 1, sheenColor: col.clone().lerp(new THREE.Color('#FFFFFF'), 0.45), sheenRoughness: 0.35 });
  const base = capC.clone().addScaledVector(d, 2 * S);
  for (let i = 0; i < 34; i++) {
    const a = (rnd() - 0.5) * 0.55, len = (34 + rnd() * 10) * S;
    const dd = d.clone().applyAxisAngle(up, a);
    const o0 = base.clone().addScaledVector(side, (rnd() - 0.5) * 2.6 * S).setY(knot.y + (0.2 + rnd() * 0.9) * S);
    const p1 = o0.clone().addScaledVector(dd, len * 0.45).addScaledVector(side, (rnd() - 0.5) * 2 * S); p1.y = (0.3 + rnd() * 0.5) * S;
    const p2 = o0.clone().addScaledVector(dd, len).addScaledVector(side, (rnd() - 0.5) * 4 * S); p2.y = 0.24 * S;
    const m = tube([o0, p1, p2], 0.22 * S, strand, 10);
    g.add(m);
  }
  return g;
}

// ---------- sách mở ----------
let pageCache: Record<string, HTMLCanvasElement> = {};
/** trang sách giả: dòng chữ xám, số trang, tiêu đề chương ở trang phải */
function pageCanvas(right: boolean): HTMLCanvasElement {
  const k = right ? 'r' : 'l';
  if (pageCache[k]) return pageCache[k];
  const W = 700, H = 1025, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const gr = x.createLinearGradient(right ? 0 : W, 0, right ? W : 0, 0);
  gr.addColorStop(0, '#E9E2D2'); gr.addColorStop(0.12, '#F6F1E6'); gr.addColorStop(1, '#F8F4EA');
  x.fillStyle = gr; x.fillRect(0, 0, W, H);
  let s = right ? 11 : 23; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const mIn = 95, mOut = 70, top = right ? 230 : 95, lh = 24;
  const x0 = right ? mIn : mOut, x1 = right ? W - mOut : W - mIn;
  if (right) {
    x.fillStyle = '#5B5349'; x.font = '600 26px Georgia, serif'; x.textAlign = 'center';
    x.fillText('CHƯƠNG MỘT', (x0 + x1) / 2, 150);
    x.fillRect((x0 + x1) / 2 - 30, 170, 60, 2);
  }
  x.fillStyle = 'rgba(70,62,52,0.38)';
  for (let y = top, line = 0; y < H - 110; y += lh, line++) {
    let cx = x0 + (line % 9 === 0 ? 30 : 0);
    const end = line % 9 === 8 ? x0 + (x1 - x0) * (0.35 + r() * 0.4) : x1;
    while (cx < end - 12) { const w = 10 + r() * 46; x.fillRect(cx, y, Math.min(w, end - cx), 6); cx += w + 7; }
  }
  x.fillStyle = '#6B6257'; x.font = '500 20px Georgia, serif'; x.textAlign = 'center';
  x.fillText(right ? '13' : '12', (x0 + x1) / 2, H - 55);
  return (pageCache[k] = c);
}
let edgeCache: HTMLCanvasElement | null = null;
function edgeCanvas(): HTMLCanvasElement {
  if (edgeCache) return edgeCache;
  const c = document.createElement('canvas'); c.width = 8; c.height = 256;
  const x = c.getContext('2d')!;
  for (let i = 0; i < 256; i++) { const v = 228 + ((i * 37) % 7) * 3 - (i % 3 === 0 ? 14 : 0); x.fillStyle = `rgb(${v},${v - 4},${v - 14})`; x.fillRect(0, i, 8, 1); }
  return (edgeCache = c);
}
const COVER: Record<string, string> = { cream: '#6E2B27', sage: '#2F4A3A', navy: '#1F2E4F', blush: '#7E4450', black: '#1D1D1D', tet: '#4E1A12', sky: '#2C4766', white: '#2B3A4A', forest: '#22382C' };

function openBook(paletteId: string, aniso: number) {
  const g = new THREE.Group();
  const Wp = 140, L = 205, T = 8.5, boardT = 2.6, gap = 3; // mm
  const prof = (u: number) => T * (0.22 + 0.78 * (1 - Math.pow(1 - u, 2.4))) * (1 - 0.05 * u);
  const cloth = new THREE.MeshStandardMaterial({ color: COVER[paletteId] || '#2B3A4A', roughness: 0.88 });
  // 2 tấm bìa + gáy cong
  for (const s of [-1, 1]) {
    const board = new THREE.Mesh(new RoundedBoxGeometry((Wp + 4) * S, boardT * S, (L + 7) * S, 3, 0.9 * S), cloth);
    board.position.set(s * ((Wp + 4) / 2 + gap / 2 - 1) * S, (boardT / 2) * S, 0);
    board.castShadow = true; board.receiveShadow = true; g.add(board);
  }
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(4 * S, 4 * S, (L + 7) * S, 24, 1, false, Math.PI / 2, Math.PI), cloth);
  spine.rotation.x = Math.PI / 2; spine.rotation.z = Math.PI; spine.position.set(0, boardT * 0.8 * S, 0); spine.scale.set(1, 1, 0.5); g.add(spine);

  const edgeTex = new THREE.CanvasTexture(edgeCanvas()); edgeTex.wrapS = edgeTex.wrapT = THREE.RepeatWrapping; edgeTex.colorSpace = THREE.SRGBColorSpace;
  const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.95 });
  const NU = 56;
  for (const s of [-1, 1]) {
    const right = s > 0;
    const tex = canvasTex(pageCanvas(right), aniso);
    // mặt trang cong: lưới u (gáy → mép ngoài) × v (đầu → chân)
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let j = 0; j <= 1; j++) for (let i = 0; i <= NU; i++) {
      const u = i / NU;
      pos.push(s * (gap / 2 + u * Wp) * S, (boardT + prof(u)) * S, (j ? L / 2 : -L / 2) * S);
      uv.push(right ? u : 1 - u, j ? 0 : 1);
    }
    for (let i = 0; i < NU; i++) { const a = i, b = i + 1, c = i + NU + 1, d = i + NU + 2; if (right) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals();
    const page = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 }));
    page.receiveShadow = true; page.castShadow = true; g.add(page);
    // mép ngoài (fore-edge)
    const hOut = prof(1);
    const fe = new THREE.Mesh(new THREE.PlaneGeometry(L * S, hOut * S), edgeMat.clone());
    (fe.material as THREE.MeshStandardMaterial).map = edgeTex.clone(); (fe.material as THREE.MeshStandardMaterial).map!.repeat.set(1, hOut / 40); (fe.material as THREE.MeshStandardMaterial).map!.needsUpdate = true;
    fe.rotation.y = s * Math.PI / 2; fe.position.set(s * (gap / 2 + Wp) * S, (boardT + hOut / 2) * S, 0); g.add(fe);
    // mép đầu/chân: hình cắt ngang khối trang
    const sh = new THREE.Shape();
    sh.moveTo(0, 0);
    for (let i = 0; i <= NU; i++) sh.lineTo(i / NU * Wp, prof(i / NU));
    sh.lineTo(Wp, 0); sh.lineTo(0, 0);
    const sg = new THREE.ShapeGeometry(sh, 4);
    for (const zEnd of [-1, 1]) {
      const em = new THREE.MeshStandardMaterial({ map: edgeTex.clone(), roughness: 0.95, side: THREE.DoubleSide });
      em.map!.repeat.set(1 / Wp, 1 / 40); em.map!.needsUpdate = true;
      const m = new THREE.Mesh(sg, em);
      m.scale.set(s * S, S, S); m.position.set(s * (gap / 2) * S, boardT * S, zEnd * (L / 2) * S);
      g.add(m);
    }
  }
  return { g, Wp, L, T, boardT, gap, prof };
}

export function bookmarkBuilder(o: BM3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong bookmark');
    const sz = bmSize(o.spec.size);
    const wU = sz.wMm * U, hU = sz.hMm * U;
    const outW = Math.min(1100, Math.round(sz.wMm * 20));
    const foil = o.spec.material === 'foil';
    const [f, b, ff, fb] = await Promise.all([
      faceTex(o.front, o.fontCss, outW, aniso, false, wU, hU),
      faceTex(o.back, o.fontCss, outW, aniso, true, wU, hU),
      foil && o.foilFront ? faceTex(o.foilFront, o.fontCss, outW, aniso, false, wU, hU, '#000000') : Promise.resolve(undefined),
      foil && o.foilBack ? faceTex(o.foilBack, o.fontCss, outW, aniso, true, wU, hU, '#000000') : Promise.resolve(undefined),
    ]);
    const tex = { f, b, ff, fb };
    const [main, l1, l2] = await Promise.all([bookmarkRig(o, aniso, 'front', tex), bookmarkRig(o, aniso, 'front', tex), bookmarkRig(o, aniso, 'back', tex)]);
    const tcol = bmTassel(o.spec.tassel).color;
    const g = new THREE.Group();

    // sách mở
    const book = openBook(bmPalette(o.spec.palette).id, aniso);
    g.add(book.g);
    // bookmark chính: nằm trên trang phải (vùng phẳng), đầu thò khỏi mép trên sách 38% chiều dài
    const uC = 0.64;
    const y0 = (book.boardT + Math.max(...[0.3, 0.45, 0.6, 0.75, 0.9].map(book.prof)) + 0.15) * S;
    const cxR = (book.gap / 2 + uC * book.Wp) * S;
    const over = sz.hMm * 0.38;
    const rotM = -0.07;
    const mp = new THREE.Group(); mp.add(main.g);
    main.g.position.set(-main.w / 2, 0, 0);
    const pivot = new THREE.Group(); pivot.add(mp);
    pivot.rotation.y = rotM;
    pivot.position.set(cxR, y0, (-book.L / 2 - over) * S);
    g.add(pivot);
    g.updateMatrixWorld(true);
    if (main.hole) {
      const hw = main.g.localToWorld(main.hole.clone());
      const top = main.g.localToWorld(new THREE.Vector3(main.hole.x, main.t, 0));
      const knot = new THREE.Vector3(hw.x - 22 * S, 2 * S, hw.z - 16 * S);
      g.add(tassel(hw, top, knot, new THREE.Vector3(-0.92, 0, -0.38).normalize(), tcol, main.t));
    }

    // 2 bookmark rời xoè bên phải sách: 1 mặt trước, 1 lật mặt sau
    const placeLoose = (r: Rig, x: number, z: number, rot: number, lift: number, tdir: THREE.Vector3) => {
      const inner = new THREE.Group(); inner.add(r.g); r.g.position.set(-r.w / 2, lift, -r.h / 2);
      const p = new THREE.Group(); p.add(inner); p.rotation.y = rot; p.position.set(x, 0, z);
      g.add(p); g.updateMatrixWorld(true);
      if (r.hole) {
        const hw = r.g.localToWorld(r.hole.clone());
        const top = r.g.localToWorld(new THREE.Vector3(r.hole.x, r.t, 0));
        const knot = top.clone().add(tdir.clone().multiplyScalar(22 * S)); knot.y = 2 * S;
        g.add(tassel(hw, top, knot, tdir, tcol, r.t));
      }
    };
    const rightX = (book.gap / 2 + book.Wp + 4) * S;
    const dirOf = (rot: number, bend: number) => new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot + bend);
    placeLoose(l2, rightX + (sz.wMm * 0.78 + 10) * S, 30 * S, -0.5, 0, dirOf(-0.5, -0.5));
    placeLoose(l1, rightX + (sz.wMm * 0.5 - 2) * S, 50 * S, -0.16, 0.4 * S, dirOf(-0.16, -0.85));

    // canh giữa cả cảnh
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    // đẩy cảnh lùi xa một chút: phối cảnh nhìn từ trên làm phần xa nhỏ lại → cân khung trên/dưới
    g.position.set(-c.x + 10 * S, 0, -c.z - 62 * S);
    const out = new THREE.Group(); out.add(g);
    return { group: out, view: { az: 0.1, el: 0.9 }, aim: 0.1, zoom: 1.48, blob: 0 };
  };
}
