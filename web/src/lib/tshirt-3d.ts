'use client';
// Áo thun 3D kiểu "ghost mannequin" (ảnh áo đồng phục chụp trên ma-nơ-canh tàng hình):
// tấm thân trước/sau dựng từ ĐÚNG đường viền áo (cùng dáng với mockup phẳng) → phồng theo khoảng cách tới đường may
// (vai, sườn, nách, ống tay) → tiết diện tròn tự nhiên; lai áo / cổ / ống tay để HỞ (thấy lớp vải trong).
// Cổ áo bo gân (áo thun) hoặc cổ bẻ + nẹp 2 nút (polo). Vân vải thun / cá sấu (bump), hình in ăn vào vải, chỉ thêu có độ bóng.
// Hiện 2 áo: 1 áo mặt trước + 1 áo quay lưng (khi có in sau lưng). Treo móc inox.

import * as THREE from 'three';
import { S, canvasTex, type Builder } from './mockup3d';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { MOCK, shirtGeom, type ShirtGeom, type TSColor, type TSKind, type TSMethod, type V2 } from './tshirt-engine';

export interface TShirt3DOpts {
  kind: TSKind; color: TSColor; method: TSMethod; embroider: boolean; fontCss: string;
  front: SVGSVGElement | null; back: SVGSVGElement | null;           // mockup phẳng for3d (màu áo + hình in)
  frontMask: SVGSVGElement | null; backMask: SVGSVGElement | null;   // chỉ hình in (trắng) → bản đồ nhám
  showBack: boolean; label: string;
}

// ---------- tiện ích ----------
let seed = 7;
const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const smooth = (a: number, b: number, t: number) => { const k = Math.max(0, Math.min(1, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
const hexMul = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => Math.min(255, Math.round(parseInt(s.slice(i, i + 2), 16) * k)));
  return `rgb(${v.join(',')})`;
};
const lumHex = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; };

/** ô vân vải: thun (jersey: cột vòng chữ V) hoặc cá sấu (piqué: ô tổ ong), xám quanh 128 */
function knitTile(kind: TSKind): HTMLCanvasElement {
  seed = 13;
  const px = 128, c = document.createElement('canvas'); c.width = c.height = px;
  const x = c.getContext('2d')!;
  x.fillStyle = 'rgb(128,128,128)'; x.fillRect(0, 0, px, px);
  if (kind === 'tee') {
    const cw = 8, rh = 6;
    for (let j = 0; j < px / rh; j++) for (let i = 0; i < px / cw; i++) {
      const cx = i * cw + cw / 2, cy = j * rh + rh / 2, b = 0.85 + rnd() * 0.3;
      for (const s of [-1, 1]) {
        x.save(); x.translate(cx + s * cw * 0.22, cy); x.rotate(s * 0.42);
        const g = x.createLinearGradient(-cw * 0.25, 0, cw * 0.25, 0);
        const v = (k: number) => { const t = Math.round(Math.min(255, 128 * b * k)); return `rgb(${t},${t},${t})`; };
        g.addColorStop(0, v(0.7)); g.addColorStop(0.5, v(1.3)); g.addColorStop(1, v(0.7));
        x.fillStyle = g; x.beginPath(); x.ellipse(0, 0, cw * 0.24, rh * 0.62, 0, 0, Math.PI * 2); x.fill(); x.restore();
      }
    }
  } else {
    const cs = 8;
    for (let j = 0; j < px / cs; j++) for (let i = 0; i < px / cs; i++) {
      const cx = i * cs + (j % 2 ? cs / 2 : 0), cy = j * cs + cs / 2;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, cs * 0.6);
      g.addColorStop(0, 'rgb(190,190,190)'); g.addColorStop(0.7, 'rgb(128,128,128)'); g.addColorStop(1, 'rgb(70,70,70)');
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, cs * 0.6, 0, Math.PI * 2); x.fill();
    }
  }
  return c;
}

interface PanelTex { map: THREE.Texture; rough: THREE.Texture }
async function panelTex(o: TShirt3DOpts, el: SVGSVGElement, mask: SVGSVGElement | null, aniso: number): Promise<PanelTex> {
  const W = MOCK.MX * 2, H = MOCK.MY1 - MOCK.MY0;
  const TW = 2560, TH = Math.round((TW * H) / W), f = TW / W;
  const c = await svgToCanvas(await selfContainedSvg(el, o.fontCss), TW, TH);
  const x = c.getContext('2d')!;
  const col = o.color, dark = lumHex(col.color) < 0.35;
  // vải xám melange: lốm đốm sợi đậm/nhạt
  seed = 5;
  if (col.melange) {
    for (let i = 0; i < 90000; i++) {
      x.fillStyle = rnd() > 0.5 ? `rgba(255,255,255,${0.08 + rnd() * 0.12})` : `rgba(40,40,46,${0.06 + rnd() * 0.12})`;
      x.fillRect(rnd() * TW, rnd() * TH, 1 + rnd() * 3, 0.8);
    }
  }
  // loang màu rất nhẹ (vải nhuộm) + vân thun mịn
  for (let i = 0; i < 30; i++) {
    const r = 120 + rnd() * 300, cx = rnd() * TW, cy = rnd() * TH;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, rnd() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
  }
  x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = dark ? 0.25 : 0.4;
  const tile = knitTile(o.kind);
  const pat = x.createPattern(tile, 'repeat')!;
  pat.setTransform(new DOMMatrix().scale((6 * f) / 128));
  x.fillStyle = pat; x.fillRect(0, 0, TW, TH); x.restore();
  const map = canvasTex(c, aniso);
  // nhám: vải 0.92; mực in lụa hơi bóng (plastisol), DTF bóng hơn, chỉ thêu bóng mượt
  const R = 640, rf = R / W;
  const rc = document.createElement('canvas'); rc.width = R; rc.height = Math.round(H * rf);
  const rx = rc.getContext('2d')!;
  rx.fillStyle = 'rgb(236,236,236)'; rx.fillRect(0, 0, rc.width, rc.height);
  if (mask) {
    const m = await svgToCanvas(await selfContainedSvg(mask, o.fontCss), rc.width, rc.height);
    const mx = m.getContext('2d')!;
    mx.globalCompositeOperation = 'source-in';
    mx.fillStyle = o.embroider ? 'rgb(120,120,120)' : o.method === 'screen' ? 'rgb(170,170,170)' : 'rgb(150,150,150)';
    mx.fillRect(0, 0, m.width, m.height);
    rx.drawImage(m, 0, 0);
  }
  const rough = new THREE.CanvasTexture(rc); rough.anisotropy = aniso;
  return { map, rough };
}

function ribTex(color: string, aniso: number, dark: boolean): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const x = c.getContext('2d')!;
  x.fillStyle = color; x.fillRect(0, 0, 256, 32);
  for (let i = 0; i < 64; i++) {
    const g = x.createLinearGradient(i * 4, 0, i * 4 + 4, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.22)'); g.addColorStop(0.5, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0.22)');
    x.fillStyle = g; x.fillRect(i * 4, 0, 4, 32);
  }
  // đường may viền
  x.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)'; x.lineWidth = 1; x.setLineDash([5, 3]);
  x.beginPath(); x.moveTo(0, 28); x.lineTo(256, 28); x.stroke();
  const t = canvasTex(c, aniso); t.wrapS = THREE.RepeatWrapping;
  return t;
}

// ---------- hình học thân áo ----------
interface Seg { ax: number; ay: number; bx: number; by: number }
function segDist(px: number, py: number, s: Seg) {
  const vx = s.bx - s.ax, vy = s.by - s.ay;
  const t = Math.max(0, Math.min(1, ((px - s.ax) * vx + (py - s.ay) * vy) / (vx * vx + vy * vy || 1)));
  const dx = s.ax + vx * t - px, dy = s.ay + vy * t - py;
  return { d: Math.hypot(dx, dy), x: s.ax + vx * t, y: s.ay + vy * t };
}

function makeShape(g: ShirtGeom) {
  // cạnh đường may (khoảng cách tới đây quyết định độ phồng): sườn, nách, mép trên tay, vai — KHÔNG gồm lai, cổ, ống tay
  const seamSegs = (side: 'front' | 'back'): Seg[] => {
    const { p, tag } = g.poly(side), out: Seg[] = [];
    const ok = (t: string) => t === 'side' || t === 'under' || t === 'sleeve' || t === 'shoulder';
    for (let i = 0; i < p.length; i++) {
      const j = (i + 1) % p.length;
      if (ok(tag[i]) && ok(tag[j])) out.push({ ax: p[i][0], ay: p[i][1], bx: p[j][0], by: p[j][1] });
    }
    return out;
  };
  const segF = seamSegs('front'), segB = seamSegs('back');
  const { A, S0, hps, L } = g;
  const vx = S0[0] - A[0], vy = S0[1] - A[1], vl = Math.hypot(vx, vy);
  const nx = vy / vl, ny = -vx / vl; // pháp tuyến hướng ra tay áo
  const zOf = (x: number, y: number, side: 'front' | 'back') => {
    const segs = side === 'front' ? segF : segB;
    let d = 1e9;
    for (const s of segs) { const r = segDist(x, y, s).d; if (r < d) d = r; }
    const ax = Math.abs(x);
    const sf = smooth(-18, 30, (ax - A[0]) * nx + (y - A[1]) * ny);
    const R = (side === 'front' ? 106 : 98) * (1 - sf) + 74 * sf;
    const t = Math.min(d / R, 1);
    let z = R * Math.sqrt(1 - (1 - t) * (1 - t));
    // ngực đầy hơn chút (trước), lưng phẳng hơn
    if (side === 'front') z += 7 * Math.exp(-(((ax - 92) / 70) ** 2) - (((y - 520) / 90) ** 2)) * (1 - sf);
    // lai hơi loe, sườn dưới hơi bóp eo
    z *= 1 + 0.035 * smooth(90, 0, y) - 0.03 * Math.exp(-(((y - 260) / 120) ** 2)) * smooth(140, 200, ax) * (1 - sf);
    // nếp vải mềm: dọc thân dưới, chéo từ nách, nếp ống tay
    const lower = smooth(360, 40, y) * (1 - sf) * smooth(205, 150, ax);
    z += 2.4 * lower * Math.sin(ax / 31 + (side === 'front' ? 0.6 : 2.1) + y / 140);
    const diag = (ax - A[0] + 30) * 0.62 + (y - A[1] + 10) * 0.78;
    z -= 3.2 * Math.exp(-((diag / 16) ** 2)) * smooth(60, 150, ax) * smooth(330, 440, y) * (1 - sf);
    z += 1.8 * sf * Math.sin(((ax - A[0]) * 0.6 - (y - A[1]) * 0.8) / 14);
    // cổ: 2 tấm không chụm về 0 ở chân cổ (HPS) → lỗ cổ tròn có độ sâu
    const rn = Math.hypot(ax - hps, y - L);
    const zo = (side === 'front' ? 50 : 46) * Math.exp(-((rn / 78) ** 2));
    return Math.sqrt(z * z + zo * zo);
  };
  return { zOf, segF, segB };
}

function panelGeo(g: ShirtGeom, side: 'front' | 'back', zOf: (x: number, y: number, s: 'front' | 'back') => number): THREE.BufferGeometry {
  const { p } = g.poly(side);
  const step = 5;
  let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (const [x, y] of p) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  const x0 = minX - step, y0 = minY - step;
  const NX = Math.ceil((maxX - minX) / step) + 3, NY = Math.ceil((maxY - minY) / step) + 3;
  const ins = new Uint8Array(NX * NY);
  for (let j = 0; j < NY; j++) {
    const y = y0 + j * step, xs: number[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) xs.push(a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i < NX; i++) {
      const x = x0 + i * step;
      let k = 0; while (k < xs.length && xs[k] < x) k++;
      ins[j * NX + i] = k % 2;
    }
  }
  const allSegs: Seg[] = p.map((a, i) => { const b = p[(i + 1) % p.length]; return { ax: a[0], ay: a[1], bx: b[0], by: b[1] }; });
  const used = new Int32Array(NX * NY).fill(-1);
  const xy: number[] = [];
  const vid = (i: number, j: number) => {
    const k = j * NX + i;
    if (used[k] < 0) {
      let x = x0 + i * step, y = y0 + j * step;
      if (!ins[k]) { // đỉnh ngoài viền → kéo về điểm gần nhất trên viền (mép mượt, không răng cưa)
        let best = { d: 1e9, x, y };
        for (const s of allSegs) { const r = segDist(x, y, s); if (r.d < best.d) best = r; }
        x = best.x; y = best.y;
      }
      used[k] = xy.length / 2; xy.push(x, y);
    }
    return used[k];
  };
  const idx: number[] = [];
  for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
    const k = j * NX + i;
    const n = ins[k] + ins[k + 1] + ins[k + NX] + ins[k + NX + 1];
    if (!n) continue;
    const a = vid(i, j), b = vid(i + 1, j), c = vid(i, j + 1), d = vid(i + 1, j + 1);
    if (side === 'front') idx.push(a, b, d, a, d, c); else idx.push(a, d, b, a, c, d);
  }
  const n = xy.length / 2;
  const pos = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  const sx = side === 'front' ? 1 : -1;
  for (let v = 0; v < n; v++) {
    const x = xy[v * 2], y = xy[v * 2 + 1];
    const z = zOf(x, y, side);
    pos[v * 3] = x * S; pos[v * 3 + 1] = y * S; pos[v * 3 + 2] = sx * z * S;
    uv[v * 2] = (sx * x + MOCK.MX) / (MOCK.MX * 2);
    uv[v * 2 + 1] = (y - MOCK.MY0) / (MOCK.MY1 - MOCK.MY0);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

/** dải vai: nối mép tấm trước ↔ tấm sau dọc đường may vai (gần cổ 2 tấm cách nhau → khép bằng 1 vòm) */
function shoulderGeo(g: ShirtGeom, zOf: (x: number, y: number, s: 'front' | 'back') => number, sgn: 1 | -1): { geo: THREE.BufferGeometry; arc: THREE.Vector3[] } {
  const NS = 24, NA = 10;
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  let arc: THREE.Vector3[] = [];
  for (let i = 0; i <= NS; i++) {
    const t = i / NS;
    const x = sgn * (g.hps + (g.S0[0] - g.hps) * t), y = g.L + (g.S0[1] - g.L) * t;
    const zf = zOf(x, y, 'front'), zb = zOf(x, y, 'back');
    const bulge = Math.min(zf, zb) * 0.06; // vai gần cổ chỉ hơi vồng (cao quá → cổ áo nhô 2 "tai")
    const row: THREE.Vector3[] = [];
    for (let k = 0; k <= NA; k++) {
      const th = (k / NA) * Math.PI;
      const z = Math.cos(th) >= 0 ? zf * Math.cos(th) : zb * Math.cos(th);
      const v = new THREE.Vector3(x * S, (y + bulge * Math.sin(th)) * S, z * S);
      row.push(v);
      pos.push(v.x, v.y, v.z);
      uv.push((x + MOCK.MX) / (MOCK.MX * 2), (y - MOCK.MY0) / (MOCK.MY1 - MOCK.MY0));
    }
    if (i === 0) arc = row;
  }
  for (let i = 0; i < NS; i++) for (let k = 0; k < NA; k++) {
    const a = i * (NA + 1) + k, b = a + 1, c = a + NA + 1, d = c + 1;
    if (sgn > 0) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return { geo, arc };
}

/** dải băng theo 1 vòng khép kín: hàng điểm rows[r][i] → lưới (u chạy dọc vòng) */
function ribbon(rows: THREE.Vector3[][], uScale: number): THREE.BufferGeometry {
  const n = rows[0].length, pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const acc = [0];
  for (let i = 1; i < n; i++) acc.push(acc[i - 1] + rows[0][i].distanceTo(rows[0][i - 1]));
  rows.forEach((row, r) => row.forEach((v, i) => { pos.push(v.x, v.y, v.z); uv.push(acc[i] / uScale, r / (rows.length - 1)); }));
  for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < n - 1; i++) {
    const a = r * n + i, b = a + 1, c = a + n, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  return geo;
}

function labelTex(text: string, aniso: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const x = c.getContext('2d')!;
  x.fillStyle = '#F7F6F1'; x.fillRect(0, 0, 256, 160);
  x.fillStyle = '#1F2A44'; x.textAlign = 'center';
  x.font = '800 34px "Be Vietnam Pro", sans-serif'; x.fillText(text.slice(0, 14).toUpperCase(), 128, 64);
  x.font = '800 54px "Be Vietnam Pro", sans-serif'; x.fillText('L', 128, 130);
  return canvasTex(c, aniso);
}

export function tshirtBuilder(o: TShirt3DOpts): Builder {
  return async (aniso) => {
    if (!o.front || !o.back) throw new Error('Chưa dựng xong thiết kế');
    const g = shirtGeom(o.kind);
    const { zOf } = makeShape(g);
    const [ft, bt] = await Promise.all([panelTex(o, o.front, o.frontMask, aniso), panelTex(o, o.back, o.backMask, aniso)]);
    const col = o.color, dark = lumHex(col.color) < 0.35;
    const tile = knitTile(o.kind);
    const mkBump = (rep: number) => { const t = new THREE.CanvasTexture(tile); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = aniso; return t; };
    const sheenColor = new THREE.Color(dark ? hexMul(col.color, 2.4) : '#FFFFFF');
    const outer = (p: PanelTex) => new THREE.MeshPhysicalMaterial({
      map: p.map, roughnessMap: p.rough, roughness: 1, metalness: 0, bumpMap: mkBump((MOCK.MX * 2) / 6), bumpScale: 0.5,
      sheen: 0.45, sheenRoughness: 0.7, sheenColor, side: THREE.FrontSide,
    });
    const fMat = outer(ft), bMat = outer(bt);
    const inner = new THREE.MeshStandardMaterial({ color: hexMul(col.color, dark ? 0.75 : 0.82), roughness: 0.95, bumpMap: mkBump(120), bumpScale: 0.4, side: THREE.BackSide });
    const plain = new THREE.MeshPhysicalMaterial({ color: col.color, roughness: 0.92, bumpMap: mkBump(120), bumpScale: 0.5, sheen: 0.45, sheenRoughness: 0.7, sheenColor, side: THREE.DoubleSide });

    const geoF = panelGeo(g, 'front', zOf), geoB = panelGeo(g, 'back', zOf);
    const shR = shoulderGeo(g, zOf, 1), shL = shoulderGeo(g, zOf, -1);

    // vòng cổ: cổ trước (trái→phải) → vòm vai phải → cổ sau (phải→trái) → vòm vai trái
    const neckPts = (depth: number, sgnZ: 1 | -1, side: 'front' | 'back') => Array.from({ length: 33 }, (_, i) => {
      const x = -g.hps + (i / 32) * g.hps * 2;
      const y = g.L - depth * Math.pow(Math.max(0, Math.cos(((x / g.hps) * Math.PI) / 2)), 0.75);
      return new THREE.Vector3(x * S, y * S, sgnZ * zOf(x, y, side) * S);
    });
    const nf = neckPts(g.frontNeck, 1, 'front'), nb = neckPts(g.backNeck, -1, 'back').reverse();
    // vòm vai trái chạy trước→sau theo θ; vòng cổ đi sau→trước ở đó → đảo
    const ringOpen = [...nf.slice(0, -1), ...shR.arc.slice(0, -1), ...nb.slice(0, -1), ...[...shL.arc].reverse().slice(0, -1)];
    const ring = [...ringOpen, ringOpen[0]];
    const ctr = ringOpen.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / ringOpen.length);

    const shirt = new THREE.Group();
    const add = (geo: THREE.BufferGeometry, mat: THREE.Material, inn = true) => {
      const m = new THREE.Mesh(geo, mat); m.castShadow = true; m.receiveShadow = true; shirt.add(m);
      if (inn) shirt.add(new THREE.Mesh(geo, inner));
    };
    add(geoF, fMat); add(geoB, bMat);
    add(shR.geo, fMat); add(shL.geo, fMat);

    const up = new THREE.Vector3(0, 1, 0);
    const inward = (v: THREE.Vector3) => new THREE.Vector3(ctr.x - v.x, 0, ctr.z - v.z).normalize();
    const ribMat = new THREE.MeshPhysicalMaterial({ map: ribTex(hexMul(col.color, 0.97), aniso, dark), roughness: 0.9, sheen: 0.4, sheenColor, side: THREE.DoubleSide });
    if (o.kind === 'tee') {
      // cổ bo gân 16mm, đứng hơi nghiêng vào trong
      const rows = [0, 0.5, 1].map((t) => ring.map((v) => v.clone().addScaledVector(up, 16 * S * t).addScaledVector(inward(v), 3.5 * S * t)));
      const band = new THREE.Mesh(ribbon(rows, 60 * S), ribMat); band.castShadow = true; shirt.add(band);
      const lip = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rows[2], true), ring.length * 2, 1.6 * S, 8, true), plain);
      shirt.add(lip);
    } else {
      // polo: cổ đứng + cổ bẻ lật xuống, 2 đầu nhọn ở trước, hở nẹp giữa
      const isFront = (v: THREE.Vector3) => v.z > ctr.z;
      const pts = ringOpen.filter((v) => !(isFront(v) && Math.abs(v.x) < 15 * S));
      // tách 2 nửa: bắt đầu từ đầu nhọn trái → qua sau → đầu nhọn phải
      const startI = pts.findIndex((v, i) => i > 0 && isFront(v) && v.x > 0 && !(isFront(pts[i - 1]) && pts[i - 1].x > 0));
      const seq = startI > 0 ? [...pts.slice(startI), ...pts.slice(0, startI)] : pts;
      const n = seq.length;
      const rows: THREE.Vector3[][] = [[], [], [], [], []];
      const zMax = Math.max(...ringOpen.map((v) => Math.abs(v.z - ctr.z)));
      // đường vai (y theo |x|) để cổ bẻ nằm ĐÈ lên vai
      const shoulderY = (x: number) => { const ax = Math.abs(x); const t = Math.max(0, Math.min(1, (ax - g.hps) / (g.S0[0] - g.hps))); return g.L + (g.S0[1] - g.L) * t; };
      seq.forEach((v, i) => {
        const t = i / (n - 1), endW = Math.max(smooth(0.16, 0, t), smooth(0.84, 1, t)); // gần 2 đầu nhọn
        const wz = (v.z - ctr.z) / zMax; // +1 trước, -1 sau, 0 hai bên vai
        const stand = (22 - 10 * Math.max(0, wz)) * S;
        const out = inward(v).multiplyScalar(-1);
        const T = v.clone().addScaledVector(up, stand).addScaledVector(out, 1 * S);
        const Fp = T.clone().addScaledVector(up, 2.5 * S).addScaledVector(out, 5 * S);
        // mép ngoài cổ bẻ: nằm trên vai (2 bên) / trên ngực-lưng (trước-sau), luôn cách mặt vải 3.5mm
        const flap = 44 + 30 * endW;
        const ox = v.x / S + out.x * flap * 0.95;
        const side = { x: ox, y: shoulderY(ox) + 3.5 + Math.abs(ox) * 0, z: v.z / S * 0.9 };
        const k: 'front' | 'back' = wz >= 0 ? 'front' : 'back';
        const oyB = Math.min(v.y / S - (16 + 46 * endW), shoulderY(ox) - 2);
        const body = { x: ox, y: oyB, z: (wz >= 0 ? 1 : -1) * (zOf(ox, oyB, k) + 3.5) };
        const w = Math.pow(Math.min(1, Math.abs(wz) * 1.25), 0.8);
        const O = new THREE.Vector3((side.x + (body.x - side.x) * w) * S, (side.y + (body.y - side.y) * w) * S, (side.z + (body.z - side.z) * w) * S);
        // điểm giữa vạt: cong mềm từ mép gấp xuống mép ngoài
        const M = Fp.clone().lerp(O, 0.5).addScaledVector(out, 3 * S).addScaledVector(up, 3 * S);
        rows[0].push(v); rows[1].push(T); rows[2].push(Fp); rows[3].push(M); rows[4].push(O);
      });
      const collar = new THREE.Mesh(ribbon(rows, 80 * S), plain); collar.castShadow = true; shirt.add(collar);
      const edge = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rows[4]), n * 2, 1.4 * S, 6, false), plain); edge.castShadow = true; shirt.add(edge);
      // nẹp 2 nút
      const btnMat = new THREE.MeshPhysicalMaterial({ color: dark ? '#E9E7E0' : '#F5F4EF', roughness: 0.35, clearcoat: 0.8 });
      for (const dy of [40, 95]) {
        const y = g.L - g.frontNeck - dy, z = zOf(0, y, 'front');
        const b = new THREE.Mesh(new THREE.CylinderGeometry(5.5 * S, 5.5 * S, 2.2 * S, 24), btnMat);
        const nrm = new THREE.Vector3(0, -(zOf(0, y + 2, 'front') - zOf(0, y - 2, 'front')) / 4, 1).normalize();
        b.quaternion.setFromUnitVectors(up, nrm);
        b.position.set(0, y * S, (z + 1.2) * S); b.castShadow = true; shirt.add(b);
      }
    }

    // nhãn mác trong cổ sau
    const lab = new THREE.Mesh(new THREE.PlaneGeometry(40 * S, 25 * S), new THREE.MeshStandardMaterial({ map: labelTex(o.label || 'Mivy', aniso), roughness: 0.8 }));
    const ly = g.L - g.backNeck - 22;
    lab.position.set(0, ly * S, (-zOf(0, ly, 'back') + 1.5) * S);
    shirt.add(lab);

    // móc treo inox từ cổ sau
    const steel = new THREE.MeshStandardMaterial({ color: '#D9DDE2', metalness: 1, roughness: 0.18 });
    const hookBase = new THREE.Vector3(0, (g.L + 4) * S, ctr.z - 14 * S);
    const rodGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      hookBase, hookBase.clone().add(new THREE.Vector3(0, 40 * S, 0)), hookBase.clone().add(new THREE.Vector3(0, 70 * S, -4 * S)),
      hookBase.clone().add(new THREE.Vector3(0, 92 * S, -20 * S)), hookBase.clone().add(new THREE.Vector3(0, 84 * S, -42 * S)), hookBase.clone().add(new THREE.Vector3(0, 66 * S, -44 * S)),
    ]), 40, 2.4 * S, 10, false);
    const hook = new THREE.Mesh(rodGeo, steel); hook.castShadow = true; shirt.add(hook);

    const lift = 120 * S;
    shirt.position.y = lift;
    const out = new THREE.Group();
    if (o.showBack) {
      const a = shirt; a.position.x = -250 * S; a.rotation.y = 0.12;
      const b = shirt.clone(); b.position.set(270 * S, lift, -160 * S); b.rotation.y = Math.PI - 0.12;
      out.add(a, b);
    } else out.add(shirt);
    return { group: out, view: { az: 0.16, el: 0.06 }, aim: 0.55, zoom: o.showBack ? 1.08 : 1.12, blob: 0.22 };
  };
}

export type { V2 };
