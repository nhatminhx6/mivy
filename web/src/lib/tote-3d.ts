'use client';
// Túi vải canvas 3D: thân vải phồng nhẹ + nếp nhăn mềm, sợi vải dệt thật (bump + màu), đường may viền miệng,
// 2 quai vải dài có chỉ may 2 mép. Hình in = thiết kế của khách, "ăn" vào thớ vải (phủ lại vân sợi).
// Túi đứng, quai dựng nghiêng 2 phía; có đáy → hông gấp nếp, không đáy → dáng "gối" may kín 2 hông + đáy.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { TT_HEM, TT_PRINT_TOP, type TTFabric, type TTSize, type TTMethod } from './tote-engine';

export interface Tote3DOpts {
  front: SVGSVGElement | null; back: SVGSVGElement | null; size: TTSize; gusset: number;
  fabric: TTFabric; method: TTMethod; fontCss: string;
}

// ---------- texture vải ----------
let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

/** ô sợi dệt (vân điểm: sợi ngang/dọc đan xen), xám trung tính quanh 128 → dùng cho overlay màu + bump */
function weaveTile(px: number, thread: number): HTMLCanvasElement {
  seed = 11;
  const c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d')!;
  const n = px / thread;
  const row = Array.from({ length: n }, () => 0.82 + rnd() * 0.3);
  const col = Array.from({ length: n }, () => 0.82 + rnd() * 0.3);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const over = (i + j) % 2 === 0; // sợi ngang nằm trên
    const b = over ? row[j] : col[i];
    // mỗi ô: giữa sợi sáng, 2 mép tối (độ cong sợi)
    const g = over ? x.createLinearGradient(0, j * thread, 0, (j + 1) * thread) : x.createLinearGradient(i * thread, 0, (i + 1) * thread, 0);
    const v = (k: number) => { const t = Math.max(0, Math.min(255, Math.round(128 * b * k))); return `rgb(${t},${t},${t})`; };
    g.addColorStop(0, v(0.62)); g.addColorStop(0.5, v(1.12)); g.addColorStop(1, v(0.62));
    x.fillStyle = g; x.fillRect(i * thread, j * thread, thread, thread);
  }
  // xơ vải li ti
  for (let k = 0; k < px * 1.2; k++) {
    x.fillStyle = `rgba(${rnd() > 0.5 ? '255,255,255' : '0,0,0'},${0.05 + rnd() * 0.08})`;
    x.fillRect(rnd() * px, rnd() * px, 1 + rnd() * 2, 0.6);
  }
  return c;
}

const hexMul = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => Math.min(255, Math.round(parseInt(s.slice(i, i + 2), 16) * k)));
  return `rgb(${v.join(',')})`;
};
const isDarkHex = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b < 110; };

async function designCanvas(el: SVGSVGElement, fontCss: string, outW: number): Promise<HTMLCanvasElement> {
  const vb = el.viewBox.baseVal;
  return svgToCanvas(await selfContainedSvg(el, fontCss), outW, Math.round((outW * vb.height) / vb.width));
}

interface PanelTex { map: THREE.Texture; rough: THREE.Texture }
/** mặt túi: màu vải + vân sợi + đường may viền + hình in (ép vào thớ vải) */
async function panelTex(o: Tote3DOpts, el: SVGSVGElement | null, aniso: number): Promise<PanelTex> {
  const { wMm, hMm, pw } = o.size;
  const TW = 1600, f = TW / wMm, TH = Math.round(hMm * f);
  const c = document.createElement('canvas'); c.width = TW; c.height = TH;
  const x = c.getContext('2d')!;
  const fab = o.fabric, dark = isDarkHex(fab.color);
  x.fillStyle = fab.color; x.fillRect(0, 0, TW, TH);
  // loang màu rất nhẹ (vải nhuộm không đều tuyệt đối)
  seed = 3;
  for (let i = 0; i < 26; i++) {
    const r = 80 + rnd() * 260, cx = rnd() * TW, cy = rnd() * TH;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  const tile = weaveTile(96, 3);
  const weave = (alpha: number) => {
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = alpha;
    x.fillStyle = x.createPattern(tile, 'repeat')!; x.fillRect(0, 0, TW, TH); x.restore();
  };
  weave(dark ? 0.3 : 0.6);
  // canvas mộc/kem: hạt bông li ti (dấu hiệu vải thật)
  if (!dark) {
    seed = 5;
    const n = Math.round((wMm * hMm) / 90);
    for (let i = 0; i < n; i++) {
      const a = 0.18 + rnd() * 0.35, l = (0.4 + rnd() * 1.6) * f;
      x.fillStyle = rnd() > 0.25 ? `rgba(70,50,30,${a})` : `rgba(255,250,240,${a})`;
      x.save(); x.translate(rnd() * TW, rnd() * TH); x.rotate(rnd() > 0.5 ? 0 : Math.PI / 2); x.fillRect(-l / 2, -0.25 * f, l, 0.5 * f); x.restore();
    }
  }
  // viền miệng túi gấp 3cm: bóng nếp gấp + 2 đường chỉ
  const hemY = TT_HEM * f;
  const sh = x.createLinearGradient(0, hemY - 2 * f, 0, hemY + 3 * f);
  sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(0.45, 'rgba(0,0,0,0.16)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sh; x.fillRect(0, hemY - 2 * f, TW, 5 * f);
  const stitch = (y: number) => {
    x.save(); x.strokeStyle = dark ? hexMul(fab.thread, 1.35) : hexMul(fab.thread, 0.72); x.lineWidth = 0.5 * f;
    x.setLineDash([3 * f, 1.6 * f]); x.beginPath(); x.moveTo(0, y); x.lineTo(TW, y); x.stroke(); x.restore();
  };
  stitch(4 * f); stitch(hemY - 4 * f);
  // hình in
  let ink: HTMLCanvasElement | null = null;
  const px0 = ((wMm - pw) / 2) * f, py0 = TT_PRINT_TOP * f;
  if (el) {
    ink = await designCanvas(el, o.fontCss, Math.round(pw * f));
    x.drawImage(ink, px0, py0);
    // mực ăn vào sợi: phủ lại vân vải lên cả hình (in lụa thấy rõ hơn DTF)
    weave(o.method === 'screen' ? 0.2 : 0.1);
  }
  const map = canvasTex(c, aniso);
  // độ nhám: vải 0.95, mực in lụa (plastisol) hơi bóng hơn
  const R = 512, rf = R / wMm;
  const rc = document.createElement('canvas'); rc.width = R; rc.height = Math.round(hMm * rf);
  const rx = rc.getContext('2d')!;
  rx.fillStyle = 'rgb(242,242,242)'; rx.fillRect(0, 0, rc.width, rc.height);
  if (ink) {
    const tmp = document.createElement('canvas'); tmp.width = Math.round(pw * rf); tmp.height = Math.round((ink.height / ink.width) * tmp.width);
    const tx = tmp.getContext('2d')!; tx.drawImage(ink, 0, 0, tmp.width, tmp.height);
    tx.globalCompositeOperation = 'source-in'; tx.fillStyle = o.method === 'screen' ? 'rgb(180,180,180)' : 'rgb(160,160,160)'; tx.fillRect(0, 0, tmp.width, tmp.height);
    rx.drawImage(tmp, ((wMm - pw) / 2) * rf, TT_PRINT_TOP * rf);
  }
  const rough = new THREE.CanvasTexture(rc); rough.anisotropy = aniso;
  return { map, rough };
}

function strapTex(fab: TTFabric, aniso: number): THREE.Texture {
  // 25mm × 100mm, lặp theo chiều dài
  const W = 128, H = 512, f = W / 25;
  const c = document.createElement('canvas'); c.width = H; c.height = W; // u = dài (ngang canvas), v = rộng
  const x = c.getContext('2d')!;
  x.fillStyle = fab.color; x.fillRect(0, 0, H, W);
  x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.6; x.fillStyle = x.createPattern(weaveTile(96, 3), 'repeat')!; x.fillRect(0, 0, H, W); x.restore();
  const dark = isDarkHex(fab.color);
  x.strokeStyle = dark ? hexMul(fab.thread, 1.35) : hexMul(fab.thread, 0.72); x.lineWidth = 0.5 * f; x.setLineDash([3 * f, 1.6 * f]);
  for (const y of [3 * f, W - 3 * f]) { x.beginPath(); x.moveTo(0, y); x.lineTo(H, y); x.stroke(); }
  // mép gập hơi tối
  const g = x.createLinearGradient(0, 0, 0, W);
  g.addColorStop(0, 'rgba(0,0,0,0.18)'); g.addColorStop(0.08, 'rgba(0,0,0,0)'); g.addColorStop(0.92, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.18)');
  x.fillStyle = g; x.fillRect(0, 0, H, W);
  const t = canvasTex(c, aniso);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// ---------- hình học ----------
const smooth = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

/** quai vải: dải dẹt chạy theo đường cong (khung vận chuyển song song → không xoắn) */
function strapGeo(curve: THREE.Curve<THREE.Vector3>, width: number, thick: number, firstSide: THREE.Vector3, segs = 160): { geo: THREE.BufferGeometry; len: number } {
  const pts = curve.getSpacedPoints(segs);
  const tans = pts.map((_, i) => curve.getTangentAt(i / segs).normalize());
  let side = firstSide.clone().sub(tans[0].clone().multiplyScalar(firstSide.dot(tans[0]))).normalize();
  const sides: THREE.Vector3[] = [], norms: THREE.Vector3[] = [];
  for (let i = 0; i <= segs; i++) {
    if (i > 0) {
      const q = new THREE.Quaternion().setFromUnitVectors(tans[i - 1], tans[i]);
      side = side.clone().applyQuaternion(q);
      side.sub(tans[i].clone().multiplyScalar(side.dot(tans[i]))).normalize();
    }
    sides.push(side.clone());
    norms.push(new THREE.Vector3().crossVectors(tans[i], side).normalize());
  }
  let len = 0; const acc = [0];
  for (let i = 1; i <= segs; i++) { len += pts[i].distanceTo(pts[i - 1]); acc.push(len); }
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  // 4 mặt: trên, dưới, 2 mép — mỗi mặt 2 hàng đỉnh
  const corners = [[-1, 1], [1, 1], [1, -1], [-1, -1]]; // (side, normal)
  const faces: [number, number, number, number][] = [[0, 1, 0, 1], [1, 2, 1, 1], [2, 3, 1, 0], [3, 0, 0, 0]]; // a, b, vA, vB
  for (const [a, b, va, vb] of faces) {
    const base = pos.length / 3;
    for (let i = 0; i <= segs; i++) {
      for (const [ci, vv] of [[a, va], [b, vb]] as [number, number][]) {
        const [cs, cn] = corners[ci];
        const p = pts[i].clone().addScaledVector(sides[i], (cs * width) / 2).addScaledVector(norms[i], (cn * thick) / 2);
        pos.push(p.x, p.y, p.z);
        uv.push(acc[i] / (100 * S), vv);
      }
    }
    for (let i = 0; i < segs; i++) {
      const p0 = base + i * 2, p1 = p0 + 1, p2 = p0 + 2, p3 = p0 + 3;
      idx.push(p0, p2, p1, p1, p2, p3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return { geo, len };
}

export function toteBuilder(o: Tote3DOpts): Builder {
  return async (aniso) => {
    if (!o.front) throw new Error('Chưa dựng xong thiết kế');
    const { wMm, hMm } = o.size;
    const W = wMm * S, H = hMm * S;
    const gus = o.gusset > 0;
    const g0 = o.gusset;
    const [ft, bt] = await Promise.all([panelTex(o, o.front, aniso), panelTex(o, o.back, aniso)]);

    const bumpTile = weaveTile(128, 4);
    const mkBump = () => {
      const t = new THREE.CanvasTexture(bumpTile); t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(wMm / 21, hMm / 21); t.anisotropy = aniso; return t;
    };
    const fab = o.fabric, dark = isDarkHex(fab.color);
    const sheenColor = new THREE.Color(dark ? hexMul(fab.color, 2.2) : '#FFFFFF');
    const outer = (p: PanelTex) => new THREE.MeshPhysicalMaterial({
      map: p.map, color: dark ? '#FFFFFF' : '#EDE8E0', roughnessMap: p.rough, roughness: 1, metalness: 0, bumpMap: mkBump(), bumpScale: 1.2,
      sheen: 0.28, sheenRoughness: 0.8, sheenColor, side: THREE.FrontSide,
    });
    const innerMat = new THREE.MeshStandardMaterial({ color: hexMul(fab.color, 0.8), roughness: 0.96, bumpMap: mkBump(), bumpScale: 1.0, side: THREE.BackSide });
    const plain = new THREE.MeshPhysicalMaterial({ color: dark ? fab.color : hexMul(fab.color, 0.92), roughness: 0.95, bumpMap: mkBump(), bumpScale: 1.0, sheen: 0.5, sheenRoughness: 0.8, sheenColor, side: THREE.DoubleSide });

    // ----- hàm dáng thân túi (mm) -----
    const zb = g0 / 2, zt = g0 * 0.16;
    const edgeZ = (v: number) => (gus ? zb + (zt - zb) * Math.pow(v, 0.8) : 0.8);
    const surf = (u: number, v: number, back: boolean): [number, number, number] => {
      let x = (u - 0.5) * wMm, y = v * hMm;
      const sinU = Math.sin(Math.PI * u);
      x *= 1 - 0.05 * v * v;
      // độ phồng theo chiều cao: có đáy → phồng đều; không đáy → kiểu "gối" (đáy là đường may, khép lại)
      const bv = gus
        ? 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, v * 1.1))
        : (v < 0.5 ? Math.pow(Math.sin(Math.PI * v * 1.15), 0.55) : Math.max(0.22, Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, v * 1.15))), 0.55)));
      let z = edgeZ(v) + (gus ? g0 * 0.16 + 6 : 17) * Math.pow(sinU, 0.7) * bv;
      // miệng túi võng giữa 2 chân quai
      y -= 6 * sinU * sinU * smooth(0.85, 1, v);
      // vết kéo ở chân quai + nếp chéo 2 góc trên + sóng vải mềm
      const pull = Math.exp(-(((u - 0.3) / 0.05) ** 2)) + Math.exp(-(((u - 0.7) / 0.05) ** 2));
      z -= 3 * pull * smooth(0.72, 1, v);
      const env = smooth(0.5, 1, v) * Math.pow(Math.abs(u - 0.5) * 2, 1.4);
      z += 1.8 * env * Math.sin(((u * wMm * 0.86 + (back ? -1 : 1) * v * hMm * 0.5) / 22) * Math.PI * 2);
      z += 1.2 * Math.sin((u * 3.1 + v * 2.3) * Math.PI) * Math.sin(v * Math.PI) * sinU;
      z += 0.9 * Math.sin((u * 1.6 - v * 3.2) * Math.PI * 2 + 0.7) * sinU * Math.sin(v * Math.PI);
      // nếp gấp giữa thân (túi mới gấp đôi khi đóng gói) — mờ, rất hẹp
      z -= 1.1 * Math.exp(-(((u - 0.5) / 0.012) ** 2)) * smooth(0.05, 0.3, v) * smooth(1, 0.8, v);
      if (!gus) {
        // 2 góc đáy hơi vểnh, nhăn nhẹ dọc đường may đáy
        const corner = Math.max(smooth(0.8, 1, u), smooth(0.2, 0, u)) * smooth(0.25, 0, v);
        z += 2 * corner * Math.sin((u + v) * 24);
      }
      return [x, y, back ? -z : z];
    };

    const NX = 56, NY = 64;
    const panel = (back: boolean, tex: PanelTex) => {
      const geo = new THREE.PlaneGeometry(1, 1, NX, NY);
      const p = geo.attributes.position as THREE.BufferAttribute;
      const uvA = geo.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        let u = uvA.getX(i); const v = uvA.getY(i);
        // mặt sau: lật x + lật z = xoay 180° → mặt ngoài hướng ra sau, chữ đọc xuôi khi nhìn từ sau
        if (back) u = 1 - u;
        const [x, y, z] = surf(u, v, back);
        p.setXYZ(i, x * S, y * S, z * S);
      }
      geo.computeVertexNormals();
      const g = new THREE.Group();
      const m1 = new THREE.Mesh(geo, outer(tex)); m1.castShadow = true;
      const m2 = new THREE.Mesh(geo, innerMat);
      g.add(m1, m2);
      return g;
    };
    const bag = new THREE.Group();
    bag.add(panel(false, ft), panel(true, bt));

    // viền miệng + đường biên (độ dày vải)
    const rimMat = new THREE.MeshStandardMaterial({ color: hexMul(fab.color, 0.96), roughness: 0.95 });
    const tube = (pts: THREE.Vector3[], r: number) => {
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r * S, 8, false), rimMat);
      m.castShadow = true; return m;
    };
    const line = (fn: (t: number) => [number, number], back: boolean, n = 40) => Array.from({ length: n + 1 }, (_, i) => { const [u, v] = fn(i / n); const [x, y, z] = surf(u, v, back); return new THREE.Vector3(x * S, y * S, z * S); });
    bag.add(tube(line((t) => [t, 1], false), 1.3), tube(line((t) => [t, 1], true), 1.3));
    if (!gus) {
      // không đáy: 2 lớp vải may kín 2 hông + đáy → đường viền dày
      bag.add(tube(line((t) => [0, t], false), 1.6), tube(line((t) => [1, t], false), 1.6), tube(line((t) => [t, 0], false), 1.6));
    } else {
      // hông túi gấp nếp (gusset) nối mặt trước ↔ sau, đáy
      for (const sx of [0, 1]) {
        const rows = NY, cols = 10, pos: number[] = [], idx: number[] = [];
        for (let r = 0; r <= rows; r++) {
          const v = r / rows;
          const [fx, fy, fz] = surf(sx, v, false);
          for (let cI = 0; cI <= cols; cI++) {
            const t = cI / cols;
            const crease = edgeZ(v) * 0.85 * Math.sin(Math.PI * t);
            pos.push((fx - (sx ? 1 : -1) * crease) * S, fy * S, (fz * (1 - 2 * t)) * S);
          }
        }
        for (let r = 0; r < rows; r++) for (let cI = 0; cI < cols; cI++) {
          const a = r * (cols + 1) + cI, b = a + 1, cc = a + cols + 1, d = cc + 1;
          idx.push(a, b, cc, b, d, cc);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setIndex(idx); geo.computeVertexNormals();
        const m = new THREE.Mesh(geo, plain); m.castShadow = true; bag.add(m);
        bag.add(tube(Array.from({ length: cols + 1 }, (_, cI) => new THREE.Vector3(pos[(rows * (cols + 1) + cI) * 3], pos[(rows * (cols + 1) + cI) * 3 + 1], pos[(rows * (cols + 1) + cI) * 3 + 2])), 1.1));
      }
      const bottom = new THREE.Mesh(new THREE.PlaneGeometry(W, g0 * S), plain);
      bottom.rotation.x = -Math.PI / 2; bottom.position.y = 0.3 * S; bag.add(bottom);
    }

    // ----- quai -----
    const sMat = new THREE.MeshPhysicalMaterial({ map: strapTex(fab, aniso), color: dark ? '#FFFFFF' : '#EDE8E0', roughness: 0.95, bumpMap: mkBump(), bumpScale: 1.0, sheen: 0.5, sheenRoughness: 0.8, sheenColor });
    const hx = wMm * 0.2, V = (x: number, y: number, z: number) => new THREE.Vector3(x * S, y * S, z * S);
    const addStrap = (pts: THREE.Vector3[], side: THREE.Vector3) => {
      const { geo } = strapGeo(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 25 * S, 2.4 * S, side);
      const m = new THREE.Mesh(geo, sMat); m.castShadow = true; bag.add(m);
    };
    const X = new THREE.Vector3(1, 0, 0);
    {
      const ztF = surf(0.3, 1, false)[2], ztB = surf(0.3, 1, true)[2];
      const loop = (zIn: number, dir: number, lean: number, skew: number) => {
        const top = hMm;
        return [
          V(-hx, top - 28, zIn - dir * 2.4), V(-hx * 1.02, top - 2, zIn - dir * 1.4), V(-hx * 1.0, top + 70, zIn + dir * lean * 0.25),
          V(-hx * 0.78 + skew, top + 170, zIn + dir * lean * 0.65), V(skew, top + 232, zIn + dir * lean), V(hx * 0.78 + skew, top + 168, zIn + dir * lean * 0.62),
          V(hx * 1.0, top + 70, zIn + dir * lean * 0.25), V(hx * 1.02, top - 2, zIn - dir * 1.4), V(hx, top - 28, zIn - dir * 2.4),
        ];
      };
      addStrap(loop(ztF, 1, 70, 14), X);
      addStrap(loop(ztB, -1, 95, -10), X);
    }

    const g = new THREE.Group();
    g.add(bag);
    const bb = new THREE.Box3().setFromObject(g);
    const c = bb.getCenter(new THREE.Vector3());
    bag.position.set(-c.x, -bb.min.y, -c.z);
    return { group: g, view: { az: 0.38, el: 0.16 }, aim: 0.46, zoom: 1.1, blob: 0.7 };
  };
}
