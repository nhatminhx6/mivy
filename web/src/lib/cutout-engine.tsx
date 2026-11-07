'use client';
// Sticker + móc khoá mica: ghép HÌNH (ảnh tách nền / hình 3D) + CHỮ → dò đường cắt theo hình (die-cut) bằng code.
// Đường cắt = viền alpha nở ra `border` mm (khoảng cách Euclid chính xác) → lấp lỗ → dò biên → làm mượt.
// Xuất SVG đúng mm, 2 lớp: "In" (hình + nền) và "CutContour" (đường cắt, spot 100% Magenta chuẩn RIP) — máy cắt decal/laser đọc thẳng.
import { useId, type CSSProperties } from 'react';
import { nameFont } from './card-engine';

export type CutKind = 'sticker' | 'keychain';
export type CutShape = 'diecut' | 'circle' | 'rounded' | 'heart';
export type TextPos = 'below' | 'over' | 'only';
export type Material = 'clear' | 'white';

export const CUT_SHAPES: { id: CutShape; name: string }[] = [
  { id: 'diecut', name: 'Cắt theo hình' },
  { id: 'circle', name: 'Tròn' },
  { id: 'rounded', name: 'Vuông bo góc' },
  { id: 'heart', name: 'Trái tim' },
];
export const TEXT_POS: { id: TextPos; name: string }[] = [
  { id: 'below', name: 'Chữ dưới hình' },
  { id: 'over', name: 'Chữ đè lên hình' },
  { id: 'only', name: 'Chỉ chữ' },
];
export const STICKER_SIZES = [30, 40, 50, 60, 80, 100];
export const KEYCHAIN_SIZES = [40, 50, 60, 70];
export const EDGE_COLORS = ['#FFFFFF', '#FFE4EE', '#FFF1C2', '#DDEEFF', '#E9E1FF', '#111827', '#F43F5E', '#2C78DC'];
export const TEXT_COLORS = ['#111827', '#FFFFFF', '#E3437A', '#2C78DC', '#E58F00', '#7446D6', '#B08D57', '#DC2626', '#0F766E'];
export const STROKE_COLORS = ['', '#FFFFFF', '#111827'];

export interface CutSpec {
  kind: CutKind; shape: CutShape; sizeMm: number; borderMm: number; edge: string;
  text: string; font: string; textColor: string; textStroke: string; textPos: TextPos; material: Material;
}

export const ICONS_3D = [
  'red_heart', 'birthday_cake', 'party_popper', 'wrapped_gift', 'teddy_bear', 'ring', 'crown', 'gem_stone', 'glowing_star', 'sparkles',
  'bubble_tea', 'hot_beverage', 'pizza', 'hamburger', 'fire', 'rocket', 'airplane', 'video_game', 'camera', 'potted_plant',
  'house', 'trophy', 'thumbs_up', 'light_bulb', 'robot', 'dress', 'lipstick', 'high_heeled_shoe', 'handbag', 't_shirt',
  'running_shoe', 'shopping_bags', 'money_bag', 'delivery_truck', 'beach_with_umbrella', 'artist_palette', 'alarm_clock', 'laptop',
];
export const icon3d = (id: string) => `/illustrations/fluent3d/${id}.png`;

export interface CutPreset { id: string; kind: CutKind; name: string; icon: string | null; spec: Partial<CutSpec> }
export const CUT_PRESETS: CutPreset[] = [
  { id: 'thanks', kind: 'sticker', name: 'Tem cảm ơn', icon: 'red_heart', spec: { shape: 'circle', edge: '#FFE4EE', text: 'Cảm ơn bạn\nđã ủng hộ!', font: 'baloo', textColor: '#E3437A', textStroke: '', textPos: 'below' } },
  { id: 'bday', kind: 'sticker', name: 'Sinh nhật', icon: 'birthday_cake', spec: { shape: 'diecut', edge: '#FFFFFF', text: 'Happy Birthday', font: 'lobster', textColor: '#E3437A', textStroke: '#FFFFFF', textPos: 'below' } },
  { id: 'married', kind: 'sticker', name: 'Đám cưới', icon: 'ring', spec: { shape: 'diecut', edge: '#FFFFFF', text: 'Just Married', font: 'greatvibes', textColor: '#B08D57', textStroke: '', textPos: 'below' } },
  { id: 'boba', kind: 'sticker', name: 'Trà sữa', icon: 'bubble_tea', spec: { shape: 'diecut', edge: '#FFFFFF', text: 'Trà sữa nè!', font: 'baloo', textColor: '#7446D6', textStroke: '#FFFFFF', textPos: 'below' } },
  { id: 'coffee', kind: 'sticker', name: 'Cà phê', icon: 'hot_beverage', spec: { shape: 'rounded', edge: '#FFF1C2', text: 'Cà phê\nsữa đá', font: 'baloo', textColor: '#7C3F00', textStroke: '', textPos: 'below' } },
  { id: 'hot', kind: 'sticker', name: 'Hot', icon: 'fire', spec: { shape: 'diecut', edge: '#FFFFFF', text: 'HOT', font: 'bungee', textColor: '#DC2626', textStroke: '#FFFFFF', textPos: 'over' } },
  { id: 'handmade', kind: 'sticker', name: 'Handmade', icon: 'sparkles', spec: { shape: 'circle', edge: '#E9E1FF', text: 'Handmade\nwith love', font: 'dancing', textColor: '#7446D6', textStroke: '', textPos: 'below' } },
  { id: 'baby', kind: 'sticker', name: 'Chữ tròn', icon: null, spec: { shape: 'diecut', edge: '#FFFFFF', text: 'Bé yêu\ncủa mẹ', font: 'lobster', textColor: '#2C78DC', textStroke: '', textPos: 'only' } },
  { id: 'queen', kind: 'sticker', name: 'Queen', icon: 'crown', spec: { shape: 'heart', edge: '#FFE4EE', text: 'Queen', font: 'greatvibes', textColor: '#B08D57', textStroke: '', textPos: 'below' } },
  { id: 'ship', kind: 'sticker', name: 'Đã đóng gói', icon: 'delivery_truck', spec: { shape: 'rounded', edge: '#DDEEFF', text: 'Đóng gói\ncẩn thận', font: 'montserrat', textColor: '#2C78DC', textStroke: '', textPos: 'below' } },
  { id: 'k-bear', kind: 'keychain', name: 'Tên + gấu', icon: 'teddy_bear', spec: { shape: 'diecut', material: 'clear', edge: '#FFFFFF', text: 'Bảo Anh', font: 'lobster', textColor: '#E3437A', textStroke: '#FFFFFF', textPos: 'below' } },
  { id: 'k-couple', kind: 'keychain', name: 'Cặp đôi', icon: 'red_heart', spec: { shape: 'diecut', material: 'clear', edge: '#FFFFFF', text: 'Khang & Vy', font: 'greatvibes', textColor: '#B4234A', textStroke: '#FFFFFF', textPos: 'over' } },
  { id: 'k-boba', kind: 'keychain', name: 'Trà sữa', icon: 'bubble_tea', spec: { shape: 'diecut', material: 'white', edge: '#FFFFFF', text: 'Boba', font: 'baloo', textColor: '#7446D6', textStroke: '#FFFFFF', textPos: 'below' } },
  { id: 'k-star', kind: 'keychain', name: 'Lucky', icon: 'glowing_star', spec: { shape: 'diecut', material: 'clear', edge: '#FFFFFF', text: 'LUCKY', font: 'bungee', textColor: '#E58F00', textStroke: '#FFFFFF', textPos: 'below' } },
  { id: 'k-gem', kind: 'keychain', name: 'Tròn', icon: 'gem_stone', spec: { shape: 'circle', material: 'white', edge: '#DDEEFF', text: 'Ngọc', font: 'dancing', textColor: '#2C78DC', textStroke: '', textPos: 'below' } },
  { id: 'k-heart', kind: 'keychain', name: 'Trái tim', icon: 'teddy_bear', spec: { shape: 'heart', material: 'white', edge: '#FFE4EE', text: 'Bé Na', font: 'baloo', textColor: '#E3437A', textStroke: '', textPos: 'below' } },
  { id: 'k-rocket', kind: 'keychain', name: 'Tên lửa', icon: 'rocket', spec: { shape: 'diecut', material: 'clear', edge: '#FFFFFF', text: 'To the moon', font: 'montserrat', textColor: '#2C78DC', textStroke: '#FFFFFF', textPos: 'below' } },
  { id: 'k-game', kind: 'keychain', name: 'Gamer', icon: 'video_game', spec: { shape: 'rounded', material: 'white', edge: '#111827', text: 'GAMER', font: 'bungee', textColor: '#FFFFFF', textStroke: '', textPos: 'below' } },
];

export function defaultCutSpec(kind: CutKind): CutSpec {
  return {
    kind, shape: 'diecut', sizeMm: kind === 'keychain' ? 50 : 50, borderMm: kind === 'keychain' ? 2.5 : 2.5, edge: '#FFFFFF',
    text: '', font: 'baloo', textColor: '#111827', textStroke: '', textPos: 'below', material: 'clear',
  };
}

// ---------- hằng số in ----------
const PXMM = 12;          // độ phân giải ảnh in ≈ 305dpi
const HOLE_R = 2.2;       // lỗ xỏ khoen Ø4.4mm
const TAB_R = 5;          // tai móc khoá quanh lỗ
const MARGIN = 15;        // lề quanh đường cắt trong SVG (0.1mm)

export interface CutResult {
  w: number; h: number;        // khung SVG (đơn vị 0.1mm), đã gồm lề
  d: string;                   // đường cắt
  art: { href: string; x: number; y: number; w: number; h: number };
  hole?: { cx: number; cy: number; r: number };
  fill: string;
  trimW: number; trimH: number; // kích thước thành phẩm (mm)
}

// ---------- ghép hình + chữ ----------
function composeArt(spec: CutSpec, img: HTMLImageElement | null, boxW: number, boxH: number): HTMLCanvasElement {
  const f = nameFont(spec.font);
  const lines = (spec.text || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3);
  const useImg = !!img && spec.textPos !== 'only';
  const M = Math.round(Math.max(boxW, boxH) * 0.1); // chừa chỗ cho đuôi chữ viết tay, sau đó cắt gọn
  const c = document.createElement('canvas');
  c.width = Math.ceil(boxW + M * 2); c.height = Math.ceil(boxH + M * 2);
  const ctx = c.getContext('2d')!;
  ctx.translate(M, M);
  const fontStr = (size: number) => `${f.weight} ${size}px "${f.family}"`;
  const lineW = (l: string, size: number) => {
    ctx.font = fontStr(size);
    const m = ctx.measureText(l);
    return Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0));
  };
  const strokeW = (size: number) => (spec.textStroke ? size * 0.2 : 0);
  const fitSize = (maxW: number, maxSize: number) => {
    let s = maxSize;
    for (let g = 0; g < 50 && Math.max(...lines.map((l) => lineW(l, s))) + strokeW(s) > maxW; g++) s *= 0.95;
    return s;
  };
  const LH = 1.12;
  const drawLines = (cx: number, top: number, size: number) => {
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic'; ctx.font = fontStr(size);
    lines.forEach((l, i) => {
      const y = top + size * LH * i + size * 0.86;
      if (spec.textStroke) { ctx.lineJoin = 'round'; ctx.lineWidth = strokeW(size); ctx.strokeStyle = spec.textStroke; ctx.strokeText(l, cx, y); }
      ctx.fillStyle = spec.textColor; ctx.fillText(l, cx, y);
    });
  };
  if (useImg) {
    const below = lines.length > 0 && spec.textPos === 'below';
    const textH = below ? boxH * Math.min(0.42, 0.22 + 0.1 * (lines.length - 1)) : 0;
    const iw = img!.naturalWidth || 1, ih = img!.naturalHeight || 1;
    const sc = Math.min(boxW / iw, (boxH - textH) / ih);
    const dw = iw * sc, dh = ih * sc, ix = (boxW - dw) / 2, iy = below ? 0 : (boxH - dh) / 2;
    ctx.drawImage(img!, ix, iy, dw, dh);
    if (below) {
      const size = fitSize(boxW, textH / (lines.length * LH));
      drawLines(boxW / 2, iy + dh + size * 0.04, size);
    } else if (lines.length) {
      const size = fitSize(boxW * 0.98, Math.min(dh * 0.34, boxW * 0.3) / Math.max(1, lines.length * 0.8));
      drawLines(boxW / 2, iy + dh - size * LH * lines.length - size * 0.02, size);
    }
  } else if (lines.length) {
    const size = fitSize(boxW, Math.min(boxH / (lines.length * LH), boxW * 0.42));
    drawLines(boxW / 2, (boxH - size * LH * lines.length) / 2, size);
  }
  return c;
}

export function trimAlpha(c: HTMLCanvasElement): HTMLCanvasElement {
  const { width: w, height: h } = c;
  const a = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (a[(y * w + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  const out = document.createElement('canvas');
  if (x1 < 0) { out.width = out.height = 1; return out; }
  out.width = x1 - x0 + 1; out.height = y1 - y0 + 1;
  out.getContext('2d')!.drawImage(c, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

// ---------- hình học mặt nạ ----------
// Khoảng cách Euclid bình phương tới pixel === target (Felzenszwalb–Huttenlocher, O(n))
function edt(src: Uint8Array, w: number, h: number, target: number): Float64Array {
  const INF = 1e20, n = Math.max(w, h);
  const g = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = src[i] === target ? 0 : INF;
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const pass = (len: number) => {
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < len; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < len; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
  };
  for (let x = 0; x < w; x++) { for (let y = 0; y < h; y++) f[y] = g[y * w + x]; pass(h); for (let y = 0; y < h; y++) g[y * w + x] = d[y]; }
  for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) f[x] = g[y * w + x]; pass(w); for (let x = 0; x < w; x++) g[y * w + x] = d[x]; }
  return g;
}

// nở r rồi "đóng" khe hẹp hơn 2c (nở thêm c, co lại c) → hình liền một khối
function closeMask(m: Uint8Array, w: number, h: number, r: number, c: number): Uint8Array {
  const out = edt(m, w, h, 1);
  const R2 = (r + c) * (r + c);
  const dil = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) dil[i] = out[i] <= R2 ? 1 : 0;
  const inn = edt(dil, w, h, 0);
  const C2 = c * c;
  const res = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) res[i] = dil[i] && inn[i] > C2 ? 1 : 0;
  return res;
}

function fillHoles(m: Uint8Array, w: number, h: number) {
  const seen = new Uint8Array(w * h);
  const q: number[] = [];
  const push = (i: number) => { if (!m[i] && !seen[i]) { seen[i] = 1; q.push(i); } };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 0; y < h; y++) { push(y * w); push(y * w + w - 1); }
  while (q.length) {
    const i = q.pop()!, x = i % w;
    if (x > 0) push(i - 1); if (x < w - 1) push(i + 1); if (i >= w) push(i - w); if (i < w * (h - 1)) push(i + w);
  }
  for (let i = 0; i < w * h; i++) if (!m[i] && !seen[i]) m[i] = 1;
}

// các mảng rời: trả về nhãn mảng lớn nhất + diện tích các mảng
function components(m: Uint8Array, w: number, h: number) {
  const lab = new Int32Array(w * h);
  const sizes: number[] = [0];
  for (let s = 0; s < w * h; s++) {
    if (!m[s] || lab[s]) continue;
    const id = sizes.length; let n = 0;
    const q = [s]; lab[s] = id;
    while (q.length) {
      const i = q.pop()!, x = i % w; n++;
      for (const j of [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w]) {
        if (j >= 0 && j < w * h && m[j] && !lab[j]) { lab[j] = id; q.push(j); }
      }
    }
    sizes.push(n);
  }
  let best = 1;
  for (let i = 2; i < sizes.length; i++) if (sizes[i] > sizes[best]) best = i;
  return { lab, sizes, best };
}

function keepOnly(m: Uint8Array, lab: Int32Array, id: number) { for (let i = 0; i < m.length; i++) m[i] = lab[i] === id ? 1 : 0; }

// bao lồi (monotone chain) — phương án cuối khi hình rời quá xa nhau
function hullMask(m: Uint8Array, w: number, h: number): Uint8Array {
  const pts: [number, number][] = [];
  for (let y = 0; y < h; y++) { let l = -1, r = -1; for (let x = 0; x < w; x++) if (m[y * w + x]) { if (l < 0) l = x; r = x; } if (l >= 0) { pts.push([l, y]); if (r !== l) pts.push([r, y]); } }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: number[], a: number[], b: number[]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: number[][] = [], upper: number[][] = [];
  for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
  const hull = lower.slice(0, -1).concat(upper.slice(0, -1));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.beginPath(); hull.forEach(([x, y], i) => (i ? ctx.lineTo(x + 0.5, y + 0.5) : ctx.moveTo(x + 0.5, y + 0.5))); ctx.closePath(); ctx.fill();
  const a = ctx.getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = a[i * 4 + 3] > 100 || m[i] ? 1 : 0;
  return out;
}

// dò biên ngoài (Moore neighbour) → danh sách điểm [x0,y0,x1,y1,…]
const DX = [-1, -1, 0, 1, 1, 1, 0, -1], DY = [0, -1, -1, -1, 0, 1, 1, 1];
function traceOuter(m: Uint8Array, w: number, h: number): number[] {
  let start = -1;
  for (let i = 0; i < w * h; i++) if (m[i]) { start = i; break; }
  if (start < 0) return [];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && m[y * w + x] === 1;
  const sx = start % w, sy = (start / w) | 0;
  const pts = [sx, sy];
  let x = sx, y = sy, back = 0; // vào từ phía tây
  for (let guard = 0; guard < w * h * 2; guard++) {
    let moved = false;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8, nx = x + DX[d], ny = y + DY[d];
      if (on(nx, ny)) {
        const pd = (back + k + 7) % 8;
        const bx = x + DX[pd] - nx, by = y + DY[pd] - ny;
        x = nx; y = ny;
        back = DX.findIndex((v, i) => v === bx && DY[i] === by);
        if (back < 0) back = 0;
        moved = true; break;
      }
    }
    if (!moved || (x === sx && y === sy)) break;
    pts.push(x, y);
  }
  return pts;
}

function simplify(pts: number[], eps: number): number[] {
  const n = pts.length / 2;
  if (n < 4) return pts;
  const keep = new Uint8Array(n); keep[0] = keep[n - 1] = 1;
  const stack: [number, number][] = [[0, n - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const ax = pts[a * 2], ay = pts[a * 2 + 1], bx = pts[b * 2], by = pts[b * 2 + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    let far = -1, fd = 0;
    for (let i = a + 1; i < b; i++) {
      const dd = Math.abs((bx - ax) * (ay - pts[i * 2 + 1]) - (ax - pts[i * 2]) * (by - ay)) / len;
      if (dd > fd) { fd = dd; far = i; }
    }
    if (fd > eps && far > 0) { keep[far] = 1; stack.push([a, far], [far, b]); }
  }
  const out: number[] = [];
  for (let i = 0; i < n; i++) if (keep[i]) out.push(pts[i * 2], pts[i * 2 + 1]);
  return out;
}

function chaikin(pts: number[], iters: number): number[] {
  let p = pts;
  for (let it = 0; it < iters; it++) {
    const n = p.length / 2, out: number[] = [];
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const x0 = p[i * 2], y0 = p[i * 2 + 1], x1 = p[j * 2], y1 = p[j * 2 + 1];
      out.push(0.75 * x0 + 0.25 * x1, 0.75 * y0 + 0.25 * y1, 0.25 * x0 + 0.75 * x1, 0.25 * y0 + 0.75 * y1);
    }
    p = out;
  }
  return p;
}

// điểm cao nhất của hình quanh trục giữa (để gắn tai móc khoá)
function topNearCenter(c: HTMLCanvasElement): { x: number; y: number } {
  const { width: w, height: h } = c;
  const a = c.getContext('2d')!.getImageData(0, 0, w, h).data;
  const x0 = Math.floor(w * 0.32), x1 = Math.ceil(w * 0.68);
  for (let y = 0; y < h; y++) {
    let sum = 0, n = 0;
    for (let x = x0; x <= x1; x++) if (a[(y * w + x) * 4 + 3] > 40) { sum += x; n++; }
    if (n > 0) return { x: sum / n, y };
  }
  return { x: w / 2, y: 0 };
}

const f1 = (v: number) => Math.round(v * 10) / 10;

// ---------- dựng sticker / móc khoá ----------
// Bế viền theo hình: nở viền trắng quanh hình/chữ → gộp thành 1 khối → dò đường cắt mượt.
// P = số px ảnh trên 1mm; sizeMm = cạnh dài nhất của đường cắt; tab = chừa tai móc khoá (trả lỗ xỏ).
export function diecutFromArt(art: HTMLCanvasElement, o: { sizeMm: number; borderMm: number; edge: string; P: number; tab?: boolean }): CutResult {
  const P = o.P, b = Math.max(1, o.borderMm);
  const cmm = Math.max(2, b * 1.5);
  const pad = Math.ceil((b + cmm + 1.5) * P);
  const tab = o.tab ? Math.ceil(TAB_R * 2 * P) : 0;
  const W = art.width + pad * 2, H = art.height + pad * 2 + tab;
  const ax = pad, ay = pad + tab;
  const g = Math.min(1, 440 / Math.max(W, H));
  const gw = Math.ceil(W * g), gh = Math.ceil(H * g);
  const mc = document.createElement('canvas'); mc.width = gw; mc.height = gh;
  const mx = mc.getContext('2d', { willReadFrequently: true })!;
  mx.drawImage(art, ax * g, ay * g, art.width * g, art.height * g);
  let hole: { cx: number; cy: number; r: number } | undefined;
  if (o.tab) {
    const top = topNearCenter(art);
    const hx = ax + top.x, hy = ay + top.y - (TAB_R - 1.4) * P;
    hole = { cx: hx, cy: hy, r: HOLE_R * P };
    mx.fillStyle = '#000';
    mx.beginPath(); mx.arc(hx * g, hy * g, Math.max(2.6, TAB_R - b) * P * g, 0, Math.PI * 2); mx.fill();
    mx.fillRect((hx - 2 * P) * g, hy * g, 4 * P * g, (ay + top.y - hy + 1.5 * P) * g);
  }
  const px = mx.getImageData(0, 0, gw, gh).data;
  const base = new Uint8Array(gw * gh);
  for (let i = 0; i < gw * gh; i++) base[i] = px[i * 4 + 3] > 24 ? 1 : 0;
  const r = b * P * g;
  let c = cmm * P * g;
  let mask: Uint8Array = base;
  for (let attempt = 0; attempt < 3; attempt++) {
    mask = closeMask(base, gw, gh, r, c);
    fillHoles(mask, gw, gh);
    const { lab, sizes, best } = components(mask, gw, gh);
    const big = sizes.filter((s, i) => i > 0 && i !== best && s > sizes[best] * 0.02).length;
    if (!big) { keepOnly(mask, lab, best); break; }
    if (attempt < 2) { c *= 2; continue; }
    mask = hullMask(mask, gw, gh);
  }
  let pts = traceOuter(mask, gw, gh);
  pts = chaikin(simplify(pts, 0.6), 3).map((v) => v / g);
  let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) { bx0 = Math.min(bx0, pts[i]); bx1 = Math.max(bx1, pts[i]); by0 = Math.min(by0, pts[i + 1]); by1 = Math.max(by1, pts[i + 1]); }
  const s = (o.sizeMm * 10) / Math.max(bx1 - bx0, by1 - by0);
  const T = (v: number, off: number) => (v - off) * s + MARGIN;
  let d = '';
  for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${f1(T(pts[i], bx0))} ${f1(T(pts[i + 1], by0))}`;
  d += 'Z';
  return {
    w: (bx1 - bx0) * s + MARGIN * 2, h: (by1 - by0) * s + MARGIN * 2, d, fill: o.edge,
    art: { href: art.toDataURL('image/png'), x: T(ax, bx0), y: T(ay, by0), w: art.width * s, h: art.height * s },
    hole: hole && { cx: T(hole.cx, bx0), cy: T(hole.cy, by0), r: hole.r * s },
    trimW: Math.round(((bx1 - bx0) * s) / 10), trimH: Math.round(((by1 - by0) * s) / 10),
  };
}

export function buildCut(spec: CutSpec, img: HTMLImageElement | null): CutResult {
  const P = PXMM;
  const isKey = spec.kind === 'keychain';
  if (spec.shape === 'diecut') {
    const b = Math.max(1, spec.borderMm);
    const content = Math.max(12, spec.sizeMm - b * 2) * P;
    const art = trimAlpha(composeArt(spec, img, content, content));
    return diecutFromArt(art, { sizeMm: spec.sizeMm, borderMm: spec.borderMm, edge: spec.edge, P, tab: isKey });
  }

  // hình cố định: tròn / vuông bo / trái tim — vẽ theo đơn vị 0.1mm
  const S = spec.sizeMm * 10;
  const Hs = spec.shape === 'heart' ? S * 0.95 : S;
  let box = spec.shape === 'circle' ? { x: S * 0.17, y: S * 0.17, w: S * 0.66, h: S * 0.66 }
    : spec.shape === 'rounded' ? { x: S * 0.1, y: S * 0.1, w: S * 0.8, h: S * 0.8 }
      : { x: S * 0.2, y: S * 0.25, w: S * 0.6, h: S * 0.5 };
  let hole: CutResult['hole'];
  if (isKey) {
    // tim: lỗ ở đỉnh thùy trái (chỗ lõm giữa quá sâu, đặt lỗ ở đó sẽ đẩy nội dung xuống nhỏ xíu)
    const hy = (HOLE_R + 2.6) * 10;
    hole = { cx: spec.shape === 'heart' ? S * 0.25 : S / 2, cy: hy, r: HOLE_R * 10 };
    const top = hy + HOLE_R * 10 + 18;
    if (box.y < top) box = { ...box, y: top, h: box.h - (top - box.y) };
  }
  const art = trimAlpha(composeArt(spec, img, (box.w / 10) * P, (box.h / 10) * P));
  const k = Math.min(box.w / art.width, box.h / art.height);
  const aw = art.width * k, ah = art.height * k;
  const ox = MARGIN, oy = MARGIN;
  const R = S / 2;
  const d = spec.shape === 'circle'
    ? `M${ox} ${oy + R}A${R} ${R} 0 1 0 ${ox + S} ${oy + R}A${R} ${R} 0 1 0 ${ox} ${oy + R}Z`
    : spec.shape === 'rounded'
      ? (() => { const rr = S * 0.14; return `M${ox + rr} ${oy}H${ox + S - rr}Q${ox + S} ${oy} ${ox + S} ${oy + rr}V${oy + S - rr}Q${ox + S} ${oy + S} ${ox + S - rr} ${oy + S}H${ox + rr}Q${ox} ${oy + S} ${ox} ${oy + S - rr}V${oy + rr}Q${ox} ${oy} ${ox + rr} ${oy}Z`; })()
      : (() => {
        const X = (v: number) => f1(ox + v * S), Y = (v: number) => f1(oy + v * S);
        return `M${X(0.5)} ${Y(0.24)}C${X(0.5)} ${Y(0.1)} ${X(0.38)} ${Y(0)} ${X(0.25)} ${Y(0)}C${X(0.1)} ${Y(0)} ${X(0)} ${Y(0.12)} ${X(0)} ${Y(0.29)}C${X(0)} ${Y(0.56)} ${X(0.28)} ${Y(0.76)} ${X(0.5)} ${Y(0.95)}C${X(0.72)} ${Y(0.76)} ${X(1)} ${Y(0.56)} ${X(1)} ${Y(0.29)}C${X(1)} ${Y(0.12)} ${X(0.9)} ${Y(0)} ${X(0.75)} ${Y(0)}C${X(0.62)} ${Y(0)} ${X(0.5)} ${Y(0.1)} ${X(0.5)} ${Y(0.24)}Z`;
      })();
  return {
    w: S + MARGIN * 2, h: Hs + MARGIN * 2, d, fill: spec.edge,
    art: { href: art.toDataURL('image/png'), x: ox + box.x + (box.w - aw) / 2, y: oy + box.y + (box.h - ah) / 2, w: aw, h: ah },
    hole: hole && { cx: ox + hole.cx, cy: oy + hole.cy, r: hole.r },
    trimW: spec.sizeMm, trimH: Math.round(Hs / 10),
  };
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = rej; im.src = src; });
}

// ---------- SVG: mockup (xem) / file cắt (gửi xưởng) / tờ nhiều con ----------
const RING_R = 95;
// Màu spot "CutContour" chuẩn ngành in–cắt = 100% Magenta (hiển thị #EC008C). RIP nhận là đường cắt.
const CUTCONTOUR = '#EC008C';
// Bleed die-cut: nền in tràn RA NGOÀI đường cắt (lệch dao không lòi mép trắng). Đơn vị SVG = 0.1mm,
// stroke canh giữa path nên bề rộng = 2× lượng tràn. 1.5mm tràn → stroke 30 đơn vị.
const BLEED_MM = 1.5;
const BLEED_STROKE = BLEED_MM * 2 * 10;

export function CutoutSvg({ res, spec, mode, style }: { res: CutResult; spec: CutSpec; mode: 'mockup' | 'cut'; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const hm = `${uid}-hole`;
  const clear = spec.kind === 'keychain' && spec.material === 'clear';
  const holeMask = res.hole && (
    <mask id={hm} maskUnits="userSpaceOnUse" x={-2000} y={-2000} width={res.w + 4000} height={res.h + 4000}>
      <rect x={-2000} y={-2000} width={res.w + 4000} height={res.h + 4000} fill="#fff" />
      <circle cx={res.hole.cx} cy={res.hole.cy} r={res.hole.r} fill="#000" />
    </mask>
  );
  if (mode === 'cut') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${f1(res.w)} ${f1(res.h)}`} width={`${f1(res.w / 10)}mm`} height={`${f1(res.h / 10)}mm`} style={style}>
        <defs>{holeMask}</defs>
        <g id="In" mask={res.hole ? `url(#${hm})` : undefined}>
          {/* nền + bleed: stroke cùng màu nền để in tràn ra ngoài đường cắt ~1.5mm (die-cut không lòi mép) */}
          <path d={res.d} fill={clear ? 'none' : res.fill}
            stroke={clear ? undefined : res.fill} strokeWidth={clear ? undefined : BLEED_STROKE}
            strokeLinejoin="round" strokeLinecap="round" />
          <image href={res.art.href} x={f1(res.art.x)} y={f1(res.art.y)} width={f1(res.art.w)} height={f1(res.art.h)} />
        </g>
        {/* Lớp cắt theo chuẩn CutContour: tên lớp "CutContour" + màu spot 100%% Magenta (#EC008C) —
            RIP/máy bế (Roland VersaWorks, Caldera, Onyx…) nhận đây là đường cắt, không in ra. */}
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1}>
          <title>CutContour</title>
          <path d={res.d} />
          {res.hole && <circle cx={f1(res.hole.cx)} cy={f1(res.hole.cy)} r={f1(res.hole.r)} />}
        </g>
      </svg>
    );
  }
  const isKey = spec.kind === 'keychain' && !!res.hole;
  const top = isKey ? RING_R * 2 + 120 : 40;
  const vb = `${-60} ${-top} ${res.w + 120} ${res.h + top + 90}`;
  const ring = isKey && res.hole ? { cx: res.hole.cx, cy: res.hole.cy - RING_R * 0.82 } : null;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={vb} style={style} data-cut-mockup="1">
      <defs>
        {holeMask}
        <filter id={`${uid}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="14" stdDeviation="16" floodColor="#0f172a" floodOpacity="0.22" />
        </filter>
        <linearGradient id={`${uid}-acr`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.5" stopColor="#eef4fb" stopOpacity="0.45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`${uid}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b949e" /><stop offset="0.45" stopColor="#f1f5f9" /><stop offset="1" stopColor="#7c8590" />
        </linearGradient>
        <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" /><stop offset="0.5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ring && (
        <g fill="none" stroke={`url(#${uid}-metal)`} strokeLinecap="round">
          <ellipse cx={ring.cx} cy={ring.cy - RING_R - 34} rx={16} ry={26} strokeWidth={9} />
          <ellipse cx={ring.cx} cy={ring.cy - RING_R - 80} rx={16} ry={26} strokeWidth={9} transform={`rotate(90 ${ring.cx} ${ring.cy - RING_R - 80})`} />
          <circle cx={ring.cx} cy={ring.cy} r={RING_R} strokeWidth={14} />
        </g>
      )}
      <g mask={res.hole ? `url(#${hm})` : undefined}>
        <path d={res.d} fill={clear ? `url(#${uid}-acr)` : res.fill} filter={`url(#${uid}-sh)`} />
        <image href={res.art.href} x={res.art.x} y={res.art.y} width={res.art.w} height={res.art.h} />
        <path d={res.d} fill={`url(#${uid}-gloss)`} opacity={spec.kind === 'keychain' ? 1 : 0.6} />
        <path d={res.d} fill="none" stroke={clear ? '#ffffff' : '#0f172a'} strokeOpacity={clear ? 0.95 : 0.08} strokeWidth={clear ? 7 : 3} />
        {clear && <path d={res.d} fill="none" stroke="#0f172a" strokeOpacity={0.14} strokeWidth={2} />}
      </g>
      {res.hole && <circle cx={res.hole.cx} cy={res.hole.cy} r={res.hole.r} fill="none" stroke="#0f172a" strokeOpacity={0.18} strokeWidth={2} />}
      {ring && (
        <path d={`M${ring.cx + RING_R * Math.cos(1.1)} ${ring.cy + RING_R * Math.sin(1.1)} A${RING_R} ${RING_R} 0 0 1 ${ring.cx + RING_R * Math.cos(2.04)} ${ring.cy + RING_R * Math.sin(2.04)}`}
          fill="none" stroke={`url(#${uid}-metal)`} strokeWidth={14} strokeLinecap="round" />
      )}
    </svg>
  );
}

// Xếp nhiều con lên tờ (decal A4 / mica A4) — khoảng cách 4mm giữa các đường cắt, lề 8mm
export const SHEETS = [
  { id: 'a4', name: 'Tờ A4', wMm: 210, hMm: 297 },
  { id: 'a5', name: 'Tờ A5', wMm: 148, hMm: 210 },
];
export function sheetFit(res: CutResult, sheet: { wMm: number; hMm: number }, gapMm = 4, marginMm = 8) {
  const pw = res.w - MARGIN * 2, ph = res.h - MARGIN * 2;
  const cols = Math.max(0, Math.floor((sheet.wMm * 10 - marginMm * 20 + gapMm * 10) / (pw + gapMm * 10)));
  const rows = Math.max(0, Math.floor((sheet.hMm * 10 - marginMm * 20 + gapMm * 10) / (ph + gapMm * 10)));
  return { cols, rows, n: cols * rows, pw, ph, gap: gapMm * 10, margin: marginMm * 10 };
}

export function SheetSvg({ res, spec, sheet }: { res: CutResult; spec: CutSpec; sheet: { wMm: number; hMm: number } }) {
  const uid = useId().replace(/:/g, '');
  const fit = sheetFit(res, sheet);
  const clear = spec.kind === 'keychain' && spec.material === 'clear';
  const W = sheet.wMm * 10, H = sheet.hMm * 10;
  const offX = (W - (fit.cols * fit.pw + (fit.cols - 1) * fit.gap)) / 2 - MARGIN;
  const offY = (H - (fit.rows * fit.ph + (fit.rows - 1) * fit.gap)) / 2 - MARGIN;
  const cells = Array.from({ length: fit.n }, (_, i) => ({ x: offX + (i % fit.cols) * (fit.pw + fit.gap), y: offY + Math.floor(i / fit.cols) * (fit.ph + fit.gap) }));
  const hm = `${uid}-h`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox={`0 0 ${W} ${H}`} width={`${sheet.wMm}mm`} height={`${sheet.hMm}mm`}>
      <defs>
        {res.hole && (
          <mask id={hm} maskUnits="userSpaceOnUse" x={-2000} y={-2000} width={res.w + 4000} height={res.h + 4000}>
            <rect x={-2000} y={-2000} width={res.w + 4000} height={res.h + 4000} fill="#fff" />
            <circle cx={res.hole.cx} cy={res.hole.cy} r={res.hole.r} fill="#000" />
          </mask>
        )}
        <g id={`${uid}-p`} mask={res.hole ? `url(#${hm})` : undefined}>
          <path d={res.d} fill={clear ? 'none' : res.fill} />
          <image href={res.art.href} x={f1(res.art.x)} y={f1(res.art.y)} width={f1(res.art.w)} height={f1(res.art.h)} />
        </g>
        <g id={`${uid}-c`}>
          <path d={res.d} />
          {res.hole && <circle cx={f1(res.hole.cx)} cy={f1(res.hole.cy)} r={f1(res.hole.r)} />}
        </g>
      </defs>
      <g id="In">{cells.map((c, i) => <use key={i} href={`#${uid}-p`} x={f1(c.x)} y={f1(c.y)} />)}</g>
      <g id="CutContour" fill="none" stroke="#FF0000" strokeWidth={1}>{cells.map((c, i) => <use key={i} href={`#${uid}-c`} x={f1(c.x)} y={f1(c.y)} />)}</g>
    </svg>
  );
}
