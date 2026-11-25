'use client';
// Puzzle ghép hình in ảnh: 1 ảnh khách (chỉ xử lý trên máy) + chữ/khung theo mẫu → file in (ảnh tràn lề 3mm)
// + file cắt CutContour = đường jigsaw sinh bằng code (mỗi cạnh trong 1 núm lồi/lõm bezier, chiều ngẫu nhiên, lệch
// nhẹ — cố định theo seed để in lại vẫn y hệt) + nắp hộp quà. Khổ: 30 (trẻ em), 120 (A4), 300 (40×30), 500 (50×38).
// Dáng trái tim: lưới jigsaw phủ khung bao, đường cắt bị cắt theo viền tim (mảnh mép tim là mảnh "viền").

import type { CSSProperties, ReactNode } from 'react';
import { coverRect, photoDpi, CV_FONTS, CV_FONT_CSS, type CVPhoto } from './canvas-engine';

export const PZ_FONT_CSS = CV_FONT_CSS;
export const PZ_FONTS = CV_FONTS;
export const pzFont = (id: string) => PZ_FONTS.find((f) => f.id === id) || PZ_FONTS[0];
export const PZ_BLEED = 3;

// ---------- khổ ----------
export interface PZSize { id: string; n: number; name: string; hint: string; w: number; h: number; cols: number; rows: number; hw: number; hh: number; hc: number; hr: number; box: [number, number, number] }
export const PZ_SIZES: PZSize[] = [
  { id: '30', n: 30, name: '30 mảnh', hint: 'Trẻ em · 26×19 cm', w: 260, h: 190, cols: 6, rows: 5, hw: 260, hh: 240, hc: 7, hr: 6, box: [200, 150, 40] },
  { id: '120', n: 120, name: '120 mảnh', hint: 'Khổ A4 · 29,7×21 cm', w: 297, h: 210, cols: 12, rows: 10, hw: 300, hh: 280, hc: 14, hr: 12, box: [230, 170, 50] },
  { id: '300', n: 300, name: '300 mảnh', hint: '40×30 cm', w: 400, h: 300, cols: 20, rows: 15, hw: 420, hh: 390, hc: 22, hr: 20, box: [280, 220, 60] },
  { id: '500', n: 500, name: '500 mảnh', hint: '50×38 cm', w: 500, h: 380, cols: 25, rows: 20, hw: 500, hh: 460, hc: 28, hr: 26, box: [320, 240, 60] },
];
export const pzSize = (id: string) => PZ_SIZES.find((s) => s.id === id) || PZ_SIZES[1];

export type PZShape = 'rect' | 'heart';
export type PZMaterial = 'paper' | 'wood';
export const PZ_MATERIALS: { id: PZMaterial; name: string; thick: number; hint: string }[] = [
  { id: 'paper', name: 'Giấy bồi 1,8mm', thick: 1.8, hint: 'Phổ biến, nhẹ, có hộp' },
  { id: 'wood', name: 'Gỗ 3mm', thick: 3, hint: 'Cứng, sang, bền' },
];

/** kích thước bảng + lưới theo khổ & dáng */
export function pzDims(sizeId: string, shape: PZShape) {
  const s = pzSize(sizeId);
  return shape === 'heart' ? { W: s.hw, H: s.hh, cols: s.hc, rows: s.hr } : { W: s.w, H: s.h, cols: s.cols, rows: s.rows };
}

// ---------- màu / bố cục / mẫu ----------
export interface PZPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; band: string }
export const PZ_PALETTES: PZPalette[] = [
  { id: 'cream', name: 'Kem', bg: '#F6EFE4', ink: '#3B2E25', sub: '#7A6656', accent: '#C08B5C', band: '#FFFFFF' },
  { id: 'blush', name: 'Hồng phấn', bg: '#F9E3E6', ink: '#6B2F3A', sub: '#9C5B66', accent: '#E0748A', band: '#FFF6F7' },
  { id: 'navy', name: 'Xanh navy', bg: '#1F2A44', ink: '#FFFFFF', sub: '#C9D2E6', accent: '#E3B55B', band: '#16203A' },
  { id: 'sage', name: 'Xanh lá nhạt', bg: '#E3EBDD', ink: '#2F4A33', sub: '#5E7A60', accent: '#7FA36F', band: '#F7FAF4' },
  { id: 'sunny', name: 'Vàng tươi', bg: '#FFE48A', ink: '#3A2A00', sub: '#7A5A00', accent: '#FF7A59', band: '#FFF8DC' },
  { id: 'dark', name: 'Đen sang', bg: '#141414', ink: '#F5EBDD', sub: '#BFB2A0', accent: '#D4AF6A', band: '#0E0E0E' },
];
export const pzPalette = (id: string) => PZ_PALETTES.find((p) => p.id === id) || PZ_PALETTES[0];

export type PZLayout = 'full' | 'caption' | 'polaroid' | 'title' | 'birthday' | 'kids' | 'love' | 'travel';
export const PZ_LAYOUTS: { id: PZLayout; name: string }[] = [
  { id: 'full', name: 'Ảnh tràn' },
  { id: 'caption', name: 'Ảnh + dòng chữ' },
  { id: 'polaroid', name: 'Khung polaroid' },
  { id: 'title', name: 'Chữ lớn trên ảnh' },
  { id: 'birthday', name: 'Sinh nhật' },
  { id: 'kids', name: 'Bé yêu' },
  { id: 'love', name: 'Cặp đôi' },
  { id: 'travel', name: 'Du lịch' },
];

export interface PZSpec { layout: PZLayout; palette: string; font: string; size: string; shape: PZShape; material: PZMaterial; lines: boolean }
export interface PZTemplate { id: string; name: string; sample: number; spec: Pick<PZSpec, 'layout' | 'palette' | 'font'> & { size?: string; shape?: PZShape } }
export const PZ_TEMPLATES: PZTemplate[] = [
  { id: 'full-sea', name: 'Ảnh tràn · biển', sample: 1, spec: { layout: 'full', palette: 'cream', font: 'bvp' } },
  { id: 'cap-family', name: 'Gia đình · dòng chữ', sample: 2, spec: { layout: 'caption', palette: 'cream', font: 'greatvibes' } },
  { id: 'pol-cream', name: 'Polaroid kem', sample: 0, spec: { layout: 'polaroid', palette: 'cream', font: 'dancing' } },
  { id: 'title-family', name: 'Gia đình là số 1', sample: 1, spec: { layout: 'title', palette: 'navy', font: 'montserrat' } },
  { id: 'bday-pink', name: 'Sinh nhật hồng', sample: 3, spec: { layout: 'birthday', palette: 'blush', font: 'montserrat' } },
  { id: 'kids-sunny', name: 'Bé yêu 30 mảnh', sample: 2, spec: { layout: 'kids', palette: 'sunny', font: 'montserrat', size: '30' } },
  { id: 'love-heart', name: 'Trái tim cặp đôi', sample: 0, spec: { layout: 'love', palette: 'blush', font: 'greatvibes', shape: 'heart' } },
  { id: 'travel-stamp', name: 'Du lịch · tem', sample: 1, spec: { layout: 'travel', palette: 'navy', font: 'playfair' } },
  { id: 'cap-wedding', name: 'Ảnh cưới · đen vàng', sample: 0, spec: { layout: 'caption', palette: 'dark', font: 'greatvibes' } },
  { id: 'pol-sage', name: 'Polaroid xanh lá', sample: 2, spec: { layout: 'polaroid', palette: 'sage', font: 'cormorant' } },
];

export type PZData = Record<string, string>;
export interface PZField { key: string; label: string; ph?: string; layouts: PZLayout[] }
export const PZ_FIELDS: PZField[] = [
  { key: 'title', label: 'Dòng chính (tên / lời chúc)', layouts: ['caption', 'polaroid', 'title', 'birthday', 'kids', 'love', 'travel'] },
  { key: 'sub', label: 'Dòng phụ (ngày / câu ngắn)', layouts: ['caption', 'polaroid', 'title', 'birthday', 'kids', 'love', 'travel'] },
  { key: 'badge', label: 'Chữ trong huy hiệu (tuổi / năm / địa điểm)', layouts: ['birthday', 'kids', 'travel'] },
  { key: 'box', label: 'Tên trên nắp hộp', layouts: ['full', 'caption', 'polaroid', 'title', 'birthday', 'kids', 'love', 'travel'] },
];
export const PZ_SAMPLES: Record<PZLayout, PZData> = {
  full: { title: '', sub: '', badge: '', box: 'Kỷ niệm mùa hè' },
  caption: { title: 'Gia đình nhỏ của mình', sub: 'Đà Lạt · 12.06.2026', badge: '', box: 'Gia đình nhỏ' },
  polaroid: { title: 'Thu Hà & Quốc Bảo', sub: 'Ngày đầu tiên · 14.02.2024', badge: '', box: 'Ngày đầu tiên' },
  title: { title: 'GIA ĐÌNH LÀ SỐ 1', sub: 'Nhà mình · Tết 2027', badge: '', box: 'Gia đình là số 1' },
  birthday: { title: 'Happy Birthday', sub: 'Chúc Gia Khánh tuổi mới thật vui', badge: '7', box: 'Sinh nhật Gia Khánh' },
  kids: { title: 'Bé Bảo Ngọc', sub: 'Ghép hình cùng bé nhé!', badge: '5 tuổi', box: 'Bé Bảo Ngọc' },
  love: { title: 'Quốc Bảo & Thu Hà', sub: '14 · 02 · 2027', badge: '', box: 'Quốc Bảo & Thu Hà' },
  travel: { title: 'Phú Quốc', sub: 'Mùa hè rực rỡ nhất', badge: '2026', box: 'Chuyến đi Phú Quốc' },
};
export const defaultPZData = (layout: PZLayout = 'caption'): PZData => ({ ...PZ_SAMPLES[layout] });

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, fam: string, wt: number | string, italic = false): number {
  const s = t || '';
  if (typeof document === 'undefined') return s.length * size * 0.55;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.55;
  mctx.font = `${italic ? 'italic ' : ''}${wt} ${size}px "${fam}"`;
  return mctx.measureText(s).width;
}
const fit = (t: string, maxW: number, size: number, fam: string, wt: number | string, italic = false) => {
  const w = textW(t, size, fam, wt, italic);
  return w > maxW ? (size * maxW) / w : size;
};
/** 1–2 dòng cân đều, tự thu nhỏ cho vừa (rộng maxW, cao maxH) */
function fitLines(text: string, maxW: number, maxH: number, size: number, fam: string, wt: number | string, italic = false, lh = 1.15, maxLines = 2) {
  const t = (text || '').trim();
  if (!t) return { lines: [] as string[], size: 0 };
  const words = t.split(/\s+/);
  const opts: string[][] = [[t]];
  if (maxLines >= 2 && words.length > 1) {
    let best: string[] | null = null, bd = Infinity;
    for (let k = 1; k < words.length; k++) {
      const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
      const d = Math.abs(textW(a, 10, fam, wt, italic) - textW(b, 10, fam, wt, italic));
      if (d < bd) { bd = d; best = [a, b]; }
    }
    if (best) opts.push(best);
  }
  let pick = { lines: opts[0], size: 0 };
  for (const ls of opts) {
    let s = Math.min(size, maxH / (ls.length * lh));
    for (const l of ls) s = Math.min(s, fit(l, maxW, s, fam, wt, italic));
    if (s > pick.size * 1.12) pick = { lines: ls, size: s };
  }
  return pick;
}

// ---------- jigsaw ----------
type P = [number, number];
/** 1 cạnh = chuỗi đoạn bezier bậc 3 [đầu, c1, c2, cuối] */
type Seg = [P, P, P, P];
function mulberry(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** cạnh có núm: dạng núm cổ điển (cổ thắt + đầu tròn), lệch ngẫu nhiên nhẹ; f = ±1 chiều núm */
function knobEdge(A: P, B: P, f: number, r: () => number): Seg[] {
  const dx = B[0] - A[0], dy = B[1] - A[1];
  const L = Math.hypot(dx, dy);
  const nx = -dy / L, ny = dx / L;
  const j = 0.035, t = 0.1 * (0.92 + r() * 0.16);
  const a = (r() - 0.5) * 2 * j, b = (r() - 0.5) * 2 * j, c = (r() - 0.5) * 2 * j, d = (r() - 0.5) * 2 * j, e = (r() - 0.5) * 2 * j;
  const pt = (u: number, v: number): P => [A[0] + u * dx + v * f * L * nx, A[1] + u * dy + v * f * L * ny];
  const p0 = pt(0, 0), p1 = pt(0.2, a), p2 = pt(0.5 + b + d, -t + c), p3 = pt(0.5 - t + b, t + c),
    p4 = pt(0.5 - 2 * t + b - d, 3 * t + c), p5 = pt(0.5 + 2 * t + b - d, 3 * t + c), p6 = pt(0.5 + t + b, t + c),
    p7 = pt(0.5 + b + d, -t + c), p8 = pt(0.8, e), p9 = pt(1, 0);
  return [[p0, p1, p2, p3], [p3, p4, p5, p6], [p6, p7, p8, p9]];
}
const lineEdge = (A: P, B: P): Seg[] => [[A, [A[0] + (B[0] - A[0]) / 3, A[1] + (B[1] - A[1]) / 3], [A[0] + (B[0] - A[0]) * 2 / 3, A[1] + (B[1] - A[1]) * 2 / 3], B]];
const revEdge = (e: Seg[]): Seg[] => e.slice().reverse().map(([a, b, c, d]) => [d, c, b, a] as Seg);
const f1 = (n: number) => Math.round(n * 100) / 100;
const segsD = (segs: Seg[], move = true) => (move ? `M${f1(segs[0][0][0])} ${f1(segs[0][0][1])}` : '') + segs.map(([, b, c, d]) => `C${f1(b[0])} ${f1(b[1])} ${f1(c[0])} ${f1(c[1])} ${f1(d[0])} ${f1(d[1])}`).join('');

export interface PZPiece { c: number; r: number; segs: Seg[]; cx: number; cy: number; border: boolean; inside: boolean }
export interface PZGrid { W: number; H: number; cols: number; rows: number; hEdges: Seg[][]; vEdges: Seg[][]; pieces: PZPiece[]; count: number; inner: string; outline: string }

// ---------- trái tim ----------
/** viền tim trong khung W×H (toạ độ y xuống) */
export function heartD(W: number, H: number): string {
  const cx = W / 2;
  return `M${f1(cx)} ${f1(H * 0.255)}`
    + `C${f1(cx - W * 0.03)} ${f1(H * 0.12)} ${f1(W * 0.2)} ${f1(-H * 0.005)} ${f1(W * 0.09)} ${f1(H * 0.1)}`
    + `C${f1(-W * 0.03)} ${f1(H * 0.21)} ${f1(-W * 0.005)} ${f1(H * 0.45)} ${f1(W * 0.16)} ${f1(H * 0.62)}`
    + `C${f1(W * 0.28)} ${f1(H * 0.75)} ${f1(W * 0.42)} ${f1(H * 0.86)} ${f1(cx)} ${f1(H * 0.995)}`
    + `C${f1(W * 0.58)} ${f1(H * 0.86)} ${f1(W * 0.72)} ${f1(H * 0.75)} ${f1(W * 0.84)} ${f1(H * 0.62)}`
    + `C${f1(W * 1.005)} ${f1(H * 0.45)} ${f1(W * 1.03)} ${f1(H * 0.21)} ${f1(W * 0.91)} ${f1(H * 0.1)}`
    + `C${f1(W * 0.8)} ${f1(-H * 0.005)} ${f1(cx + W * 0.03)} ${f1(H * 0.12)} ${f1(cx)} ${f1(H * 0.255)}Z`;
}
/** đa giác xấp xỉ viền tim (để thử điểm trong/ngoài & cắt đường) */
const polyCache = new Map<string, P[]>();
export function heartPoly(W: number, H: number): P[] {
  const k = `${W}x${H}`;
  if (polyCache.has(k)) return polyCache.get(k)!;
  const d = heartD(W, H);
  const nums = (d.match(/-?\d+(\.\d+)?/g) || []).map(Number);
  const out: P[] = [];
  let x = nums[0], y = nums[1], i = 2;
  out.push([x, y]);
  while (i + 5 < nums.length) {
    const [x1, y1, x2, y2, x3, y3] = nums.slice(i, i + 6); i += 6;
    for (let s = 1; s <= 24; s++) {
      const t = s / 24, mt = 1 - t;
      out.push([mt * mt * mt * x + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3, mt * mt * mt * y + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3]);
    }
    x = x3; y = y3;
  }
  polyCache.set(k, out);
  return out;
}
export function inPoly(p: P, poly: P[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
/** bề ngang trong tim tại độ cao y (mm) */
export function heartSpan(W: number, H: number, y: number): number {
  const poly = heartPoly(W, H);
  const xs: number[] = [];
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y)) xs.push(xi + ((y - yi) * (xj - xi)) / (yj - yi));
  }
  if (xs.length < 2) return 0;
  xs.sort((a, b) => a - b);
  // lấy đoạn chứa tâm (ở trên đỉnh có 2 thuỳ → lấy đoạn gần tâm nhất)
  let best = 0;
  for (let k = 0; k + 1 < xs.length; k += 2) { const a = xs[k], b = xs[k + 1]; if (a <= W / 2 && b >= W / 2) return b - a; best = Math.max(best, b - a); }
  return best;
}
function flatten(segs: Seg[], n = 10): P[] {
  const out: P[] = [segs[0][0]];
  for (const [a, b, c, d] of segs) for (let s = 1; s <= n; s++) {
    const t = s / n, mt = 1 - t;
    out.push([mt * mt * mt * a[0] + 3 * mt * mt * t * b[0] + 3 * mt * t * t * c[0] + t * t * t * d[0], mt * mt * mt * a[1] + 3 * mt * mt * t * b[1] + 3 * mt * t * t * c[1] + t * t * t * d[1]]);
  }
  return out;
}
function segX(a: P, b: P, c: P, d: P): P | null {
  const r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]];
  const den = r[0] * s[1] - r[1] * s[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? [a[0] + t * r[0], a[1] + t * r[1]] : null;
}
/** cắt 1 đường gấp khúc theo đa giác: giữ các đoạn nằm trong */
function clipPolyline(pts: P[], poly: P[]): P[][] {
  const out: P[][] = [];
  let cur: P[] | null = inPoly(pts[0], poly) ? [pts[0]] : null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const inB = inPoly(b, poly);
    const xs: P[] = [];
    for (let k = 0, j = poly.length - 1; k < poly.length; j = k++) { const p = segX(a, b, poly[j], poly[k]); if (p) xs.push(p); }
    xs.sort((p, q) => Math.hypot(p[0] - a[0], p[1] - a[1]) - Math.hypot(q[0] - a[0], q[1] - a[1]));
    for (const x of xs) {
      if (cur) { cur.push(x); if (cur.length > 1) out.push(cur); cur = null; } else cur = [x];
    }
    if (inB) { if (!cur) cur = [b]; else cur.push(b); } else if (cur) { if (cur.length > 1) out.push(cur); cur = null; }
  }
  if (cur && cur.length > 1) out.push(cur);
  return out;
}

const gridCache = new Map<string, PZGrid>();
/** lưới jigsaw cố định theo khổ + dáng + seed */
export function pzGrid(sizeId: string, shape: PZShape, seed = 2027): PZGrid {
  const key = `${sizeId}|${shape}|${seed}`;
  if (gridCache.has(key)) return gridCache.get(key)!;
  const { W, H, cols, rows } = pzDims(sizeId, shape);
  const r = mulberry(seed * 31 + cols * 7 + rows);
  const cw = W / cols, ch = H / rows;
  // đỉnh lưới lệch nhẹ (mép ngoài giữ thẳng)
  const V: P[][] = [];
  for (let c = 0; c <= cols; c++) {
    V[c] = [];
    for (let rr = 0; rr <= rows; rr++) {
      const jx = c === 0 || c === cols ? 0 : (r() - 0.5) * cw * 0.09;
      const jy = rr === 0 || rr === rows ? 0 : (r() - 0.5) * ch * 0.09;
      V[c][rr] = [c * cw + jx, rr * ch + jy];
    }
  }
  const sign = () => (r() < 0.5 ? -1 : 1);
  const hEdges: Seg[][] = []; // hàng rr (0..rows), cột c — trái → phải
  const vEdges: Seg[][] = []; // cột c (0..cols), hàng rr — trên → dưới
  const hAt = (rr: number, c: number) => hEdges[rr * cols + c];
  const vAt = (c: number, rr: number) => vEdges[c * rows + rr];
  for (let rr = 0; rr <= rows; rr++) for (let c = 0; c < cols; c++) {
    const A = V[c][rr], B = V[c + 1][rr];
    hEdges[rr * cols + c] = rr === 0 || rr === rows ? lineEdge(A, B) : knobEdge(A, B, sign(), r);
  }
  for (let c = 0; c <= cols; c++) for (let rr = 0; rr < rows; rr++) {
    const A = V[c][rr], B = V[c][rr + 1];
    vEdges[c * rows + rr] = c === 0 || c === cols ? lineEdge(A, B) : knobEdge(A, B, sign(), r);
  }
  const poly = shape === 'heart' ? heartPoly(W, H) : null;
  const pieces: PZPiece[] = [];
  for (let rr = 0; rr < rows; rr++) for (let c = 0; c < cols; c++) {
    const segs = [...hAt(rr, c), ...vAt(c + 1, rr), ...revEdge(hAt(rr + 1, c)), ...revEdge(vAt(c, rr))];
    const cx = (V[c][rr][0] + V[c + 1][rr][0] + V[c][rr + 1][0] + V[c + 1][rr + 1][0]) / 4;
    const cy = (V[c][rr][1] + V[c + 1][rr][1] + V[c][rr + 1][1] + V[c + 1][rr + 1][1]) / 4;
    const border = c === 0 || rr === 0 || c === cols - 1 || rr === rows - 1;
    let inside = true;
    if (poly) inside = flatten(segs, 6).every((p) => inPoly(p, poly));
    pieces.push({ c, r: rr, segs, cx, cy, border: poly ? !inside : border, inside: poly ? inPoly([cx, cy], poly) : true });
  }
  // đường cắt bên trong (mỗi cạnh trong 1 lần) + viền ngoài
  let inner = '';
  if (!poly) {
    for (let rr = 1; rr < rows; rr++) for (let c = 0; c < cols; c++) inner += segsD(hAt(rr, c));
    for (let c = 1; c < cols; c++) for (let rr = 0; rr < rows; rr++) inner += segsD(vAt(c, rr));
  } else {
    const add = (segs: Seg[]) => { for (const pl of clipPolyline(flatten(segs, 12), poly)) inner += `M${pl.map((p) => `${f1(p[0])} ${f1(p[1])}`).join('L')}`; };
    for (let rr = 1; rr < rows; rr++) for (let c = 0; c < cols; c++) add(hAt(rr, c));
    for (let c = 1; c < cols; c++) for (let rr = 0; rr < rows; rr++) add(vAt(c, rr));
  }
  const outline = poly ? heartD(W, H) : `M0 0H${W}V${H}H0Z`;
  const count = poly ? pieces.filter((p) => p.inside).length : cols * rows;
  const g: PZGrid = { W, H, cols, rows, hEdges, vEdges, pieces, count, inner, outline };
  gridCache.set(key, g);
  return g;
}
export const pieceD = (p: PZPiece) => segsD(p.segs) + 'Z';
/** số đoạn cắt trong (để kiểm tra lưới): (rows−1)·cols + (cols−1)·rows */
export const innerEdgeCount = (g: PZGrid) => (g.rows - 1) * g.cols + (g.cols - 1) * g.rows;

/** chọn vài mảnh trong (không sát nhau, không chạm mép) để "rời ra" trong cảnh 3D */
/** vùng hàng (tỉ lệ) để khoét mảnh rời theo bố cục — tránh chỗ có chữ */
export const looseRows = (layout: PZLayout): [number, number] =>
  layout === 'title' || layout === 'birthday' ? [0.4, 0.66] : layout === 'kids' ? [0.15, 0.55] : layout === 'love' ? [0.18, 0.45] : [0.2, 0.5];
export function loosePieces(g: PZGrid, n = 4, rows: [number, number] = [0.2, 0.5]): PZPiece[] {
  if (g.cols * g.rows <= 48) n = Math.min(n, 3);
  // vùng phải-giữa bảng, trong khoảng hàng cho phép (không đè chữ)
  const inRows = (p: PZPiece) => (p.cy / g.H) >= rows[0] && (p.cy / g.H) <= rows[1];
  const cand = g.pieces.filter((p) => !p.border && p.inside && p.c >= Math.floor(g.cols * 0.5) && p.c <= Math.ceil(g.cols * 0.88) && inRows(p));
  const out: PZPiece[] = [];
  const order = [...cand].sort((a, b) => ((a.c * 7 + a.r * 13) % 11) - ((b.c * 7 + b.r * 13) % 11));
  for (const p of order) {
    if (out.every((q) => Math.abs(q.c - p.c) > 1 || Math.abs(q.r - p.r) > 1)) out.push(p);
    if (out.length >= n) break;
  }
  return out;
}

// ---------- ảnh ----------
interface Rect { x: number; y: number; w: number; h: number }
/** ô ảnh theo bố cục (toạ độ bảng, mm) */
export function photoSlot(layout: PZLayout, W: number, H: number): Rect {
  const m = Math.min(W, H);
  switch (layout) {
    case 'polaroid': { const g = m * 0.06; return { x: g, y: g, w: W - g * 2, h: H * 0.76 - g }; }
    case 'birthday': { const g = m * 0.07; return { x: g, y: H * 0.27, w: W - g * 2, h: H * 0.73 - g }; }
    case 'kids': { const g = m * 0.09; return { x: g * 1.2, y: g, w: W - g * 2.4, h: H * 0.7 - g }; }
    default: return { x: 0, y: 0, w: W, h: H };
  }
}
/** ô chạm mép bảng → nới ra e mm (phần tràn lề) */
export function extSlot(r: Rect, W: number, H: number, e: number): Rect {
  if (!e) return r;
  const eps = 0.01;
  let { x, y, w, h } = r;
  if (x <= eps) { x -= e; w += e; }
  if (y <= eps) { y -= e; h += e; }
  if (r.x + r.w >= W - eps) w += e;
  if (r.y + r.h >= H - eps) h += e;
  return { x, y, w, h };
}
export const pzDpi = (spec: PZSpec, p: CVPhoto | undefined) => {
  if (!p) return 0;
  const { W, H } = pzDims(spec.size, spec.shape);
  return photoDpi(extSlot(photoSlot(spec.shape === 'heart' ? 'love' : spec.layout, W, H), W, H, PZ_BLEED), p);
};

// ---------- vẽ ----------
export type PZMode = 'face' | 'print' | 'tex' | 'groove';
let uidN = 0;
const heartIcon = (x: number, y: number, s: number, fill: string) => (
  <path d={`M${x} ${y + s * 0.3}C${x} ${y} ${x - s * 0.5} ${y - s * 0.1} ${x - s * 0.5} ${y + s * 0.25}C${x - s * 0.5} ${y + s * 0.55} ${x} ${y + s * 0.75} ${x} ${y + s * 0.9}C${x} ${y + s * 0.75} ${x + s * 0.5} ${y + s * 0.55} ${x + s * 0.5} ${y + s * 0.25}C${x + s * 0.5} ${y - s * 0.1} ${x} ${y} ${x} ${y + s * 0.3}Z`} fill={fill} />
);
const star = (x: number, y: number, R: number, fill: string, rot = 0) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? R * 0.45 : R; pts.push(`${f1(x + Math.cos(a) * rr)},${f1(y + Math.sin(a) * rr)}`); }
  return <polygon points={pts.join(' ')} fill={fill} />;
};

/** nội dung thiết kế (ảnh + chữ + trang trí) trong khung W×H, toạ độ mm */
function Design({ spec, data, photo, W, H, uid, bl = 0 }: { spec: PZSpec; data: PZData; photo?: CVPhoto; W: number; H: number; uid: string; bl?: number }) {
  const p = pzPalette(spec.palette);
  const f = pzFont(spec.font);
  const fam = `'${f.family}'`;
  const body = 'Be Vietnam Pro';
  const m = Math.min(W, H);
  const slot = photoSlot(spec.shape === 'heart' ? 'love' : spec.layout, W, H);
  // ảnh luôn phủ ô đã nới phần tràn lề → bản xem & file in khớp tuyệt đối; file in chỉ mở rộng vùng cắt ảnh
  const img = photo ? coverRect(extSlot(slot, W, H, PZ_BLEED), photo) : null;
  const photoEl = (r0: Rect, rx = 0) => {
    const r = extSlot(r0, W, H, bl);
    return (
    <g>
      <clipPath id={`${uid}-ph`}><rect x={r.x} y={r.y} width={r.w} height={r.h} rx={rx} /></clipPath>
      <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={rx} fill="#C9C2B6" />
      {img && photo && <image href={photo.src} x={img.x} y={img.y} width={img.w} height={img.h} preserveAspectRatio="none" clipPath={`url(#${uid}-ph)`} />}
    </g>
    );
  };
  const title = data.title || '', sub = data.sub || '', badge = data.badge || '';
  const T = (x: number, y: number, t: string, size: number, fill: string, ff = fam, wt: number | string = f.weight, extra: Record<string, unknown> = {}) =>
    t ? <text x={f1(x)} y={f1(y)} fontFamily={ff} fontWeight={wt} fontSize={f1(size)} fill={fill} textAnchor="middle" fontStyle={f.italic && ff === fam ? 'italic' : undefined} {...extra}>{t}</text> : null;
  const BG = (fill: string) => <rect x={-bl} y={-bl} width={W + bl * 2} height={H + bl * 2} fill={fill} />;
  const multi = (cx: number, top: number, maxW: number, maxH: number, text: string, size: number, fill: string, ff: string, fFam: string, wt: number | string, italic = false, lines = 2) => {
    const r = fitLines(text, maxW, maxH, size, fFam, wt, italic, 1.15, lines);
    if (!r.lines.length) return { el: null as ReactNode, h: 0 };
    const lh = r.size * 1.15;
    const el = (<g>{r.lines.map((l, i) => <text key={i} x={f1(cx)} y={f1(top + r.size * 0.86 + i * lh)} fontFamily={ff} fontWeight={wt} fontSize={f1(r.size)} fill={fill} textAnchor="middle" fontStyle={italic ? 'italic' : undefined}>{l}</text>)}</g>);
    return { el, h: r.lines.length * lh };
  };
  let content: ReactNode;
  // dáng tim: mọi bố cục dùng chung bố cục "ảnh tràn + tên + ngày" đặt trong vùng rộng của tim
  const layout: PZLayout = spec.shape === 'heart' ? 'love' : spec.layout;
  switch (layout) {
    case 'full':
      content = photoEl(slot);
      break;
    case 'caption': {
      const bandH = H * 0.24;
      const tt = multi(W / 2, H - bandH * 0.86, W * 0.84, bandH * 0.5, title, m * 0.1, '#FFFFFF', fam, f.family, f.weight, !!f.italic, 1);
      const ss = fitLines(sub, W * 0.7, bandH * 0.2, m * 0.042, body, 600, false, 1.2, 1);
      content = (
        <g>
          {photoEl(slot)}
          <defs><linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.62" /></linearGradient></defs>
          <rect x={-bl} y={H - bandH * 1.4} width={W + bl * 2} height={bandH * 1.4 + bl} fill={`url(#${uid}-g)`} />
          {tt.el}
          {ss.lines[0] && T(W / 2, H - bandH * 0.86 + tt.h + ss.size * 1.15, ss.lines[0], ss.size, '#FFFFFF', `'${body}'`, 600, { letterSpacing: f1(ss.size * 0.06) })}
        </g>
      );
      break;
    }
    case 'polaroid': {
      const top = slot.y + slot.h, bandH = H - top;
      const tt = multi(W / 2, top + bandH * 0.14, W * 0.84, bandH * 0.5, title, m * 0.09, p.ink, fam, f.family, f.weight, !!f.italic, 1);
      const ss = fitLines(sub, W * 0.7, bandH * 0.2, m * 0.038, body, 600, false, 1.2, 1);
      content = (
        <g>
          {BG(p.band)}
          {photoEl(slot)}
          {tt.el}
          {ss.lines[0] && T(W / 2, top + bandH * 0.14 + tt.h + ss.size * 1.25, ss.lines[0], ss.size, p.sub, `'${body}'`, 600, { letterSpacing: f1(ss.size * 0.05) })}
        </g>
      );
      break;
    }
    case 'title': {
      const bandH = H * 0.3;
      const tt = multi(W / 2, H * 0.06, W * 0.86, bandH * 0.62, title, m * 0.13, '#FFFFFF', fam, f.family, f.weight, false, 2);
      const ss = fitLines(sub, W * 0.7, bandH * 0.18, m * 0.045, body, 600, false, 1.2, 1);
      content = (
        <g>
          {photoEl(slot)}
          <defs><linearGradient id={`${uid}-g`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.bg} stopOpacity="0.82" /><stop offset="1" stopColor={p.bg} stopOpacity="0" /></linearGradient></defs>
          <rect x={-bl} y={-bl} width={W + bl * 2} height={bandH * 1.5 + bl} fill={`url(#${uid}-g)`} />
          {tt.el}
          {ss.lines[0] && T(W / 2, H * 0.06 + tt.h + ss.size * 1.4, ss.lines[0], ss.size, p.accent, `'${body}'`, 600, { letterSpacing: f1(ss.size * 0.12) })}
        </g>
      );
      break;
    }
    case 'birthday': {
      const r = mulberry(17);
      const conf: ReactNode[] = [];
      for (let i = 0; i < 60; i++) {
        const x = r() * W, y = r() * H * 0.27, s = m * (0.008 + r() * 0.012);
        const col = [p.accent, p.sub, '#FFC857', '#7FC8F8', '#FFFFFF'][i % 5];
        conf.push(i % 3 ? <rect key={i} x={f1(x)} y={f1(y)} width={f1(s * 2)} height={f1(s)} fill={col} transform={`rotate(${Math.round(r() * 180)} ${f1(x)} ${f1(y)})`} /> : <circle key={i} cx={f1(x)} cy={f1(y)} r={f1(s * 0.8)} fill={col} />);
      }
      const bR = m * 0.1;
      const tt = multi(W / 2 - bR * 0.6, H * 0.03, W * 0.62, H * 0.13, title, m * 0.1, p.ink, fam, f.family, f.weight, false, 1);
      const ss = fitLines(sub, W * 0.66, H * 0.07, m * 0.04, body, 600, false, 1.2, 1);
      const bs = fit(badge, bR * 1.4, bR * 0.9, f.family, f.weight);
      content = (
        <g>
          {BG(p.bg)}
          {conf}
          {photoEl(slot, m * 0.025)}
          {tt.el}
          {ss.lines[0] && T(W / 2 - bR * 0.6, H * 0.03 + tt.h + ss.size * 1.3, ss.lines[0], ss.size, p.sub, `'${body}'`, 600)}
          {badge && (<g><circle cx={f1(W - bR * 1.5)} cy={f1(H * 0.135)} r={f1(bR)} fill={p.accent} /><circle cx={f1(W - bR * 1.5)} cy={f1(H * 0.135)} r={f1(bR * 0.86)} fill="none" stroke="#FFFFFF" strokeWidth={f1(m * 0.004)} strokeDasharray={`${f1(m * 0.01)} ${f1(m * 0.008)}`} />
            {T(W - bR * 1.5, H * 0.135 + bs * 0.34, badge, bs, '#FFFFFF', fam, f.weight)}</g>)}
        </g>
      );
      break;
    }
    case 'kids': {
      const deco: ReactNode[] = [];
      const r = mulberry(5);
      for (let i = 0; i < 14; i++) {
        const side = i % 2, x = side ? W - m * (0.04 + r() * 0.05) : m * (0.04 + r() * 0.05), y = m * 0.08 + r() * (H * 0.62);
        deco.push(<g key={i}>{star(x, y, m * (0.02 + r() * 0.018), ['#FF7A59', '#4FB3E8', '#7BC96F', '#FFFFFF'][i % 4], r() * 2)}</g>);
      }
      const top = slot.y + slot.h;
      const tt = multi(W / 2, top + H * 0.035, W * 0.8, H * 0.15, title, m * 0.13, p.ink, fam, f.family, f.weight, false, 1);
      const ss = fitLines(sub, W * 0.7, H * 0.06, m * 0.045, body, 600, false, 1.2, 1);
      const bR = m * 0.085, bs = fit(badge, bR * 1.5, bR * 0.62, f.family, f.weight);
      content = (
        <g>
          {BG(p.bg)}
          {deco}
          <rect x={f1(slot.x - m * 0.015)} y={f1(slot.y - m * 0.015)} width={f1(slot.w + m * 0.03)} height={f1(slot.h + m * 0.03)} rx={f1(m * 0.05)} fill="#FFFFFF" />
          {photoEl(slot, m * 0.04)}
          {tt.el}
          {ss.lines[0] && T(W / 2, top + H * 0.035 + tt.h + ss.size * 1.25, ss.lines[0], ss.size, p.sub, `'${body}'`, 600)}
          {badge && (<g><circle cx={f1(slot.x + slot.w - bR * 0.6)} cy={f1(slot.y + bR * 0.7)} r={f1(bR)} fill={p.accent} />{T(slot.x + slot.w - bR * 0.6, slot.y + bR * 0.7 + bs * 0.34, badge, bs, '#FFFFFF', fam, f.weight)}</g>)}
        </g>
      );
      break;
    }
    case 'love': {
      const heart = spec.shape === 'heart';
      const cy = heart ? H * 0.56 : H * 0.8;
      // tim: bề rộng chữ = bề ngang tim tại dòng đó (chừa lề)
      const span = (y0: number, y1: number) => (heart ? Math.min(heartSpan(W, H, y0), heartSpan(W, H, y1)) * 0.84 : W * 0.8);
      // tên: 1–2 dòng, dòng cuối nằm ở cy
      const tt = fitLines(title, span(cy - m * 0.17, cy), H * 0.17, m * 0.085, f.family, f.weight, !!f.italic, 1.12, 2);
      const sy = cy + tt.size * 0.3 + m * 0.035;
      const ss = fitLines(sub, Math.min(W * 0.5, span(sy, sy + m * 0.1)), H * 0.08, m * 0.038, body, 600, false, 1.2, 2);
      content = (
        <g>
          {photoEl(slot)}
          <defs><radialGradient id={`${uid}-g`} cx="0.5" cy={heart ? '0.58' : '0.82'} r="0.45"><stop offset="0" stopColor="#000" stopOpacity="0.5" /><stop offset="1" stopColor="#000" stopOpacity="0" /></radialGradient></defs>
          <rect x={-bl} y={-bl} width={W + bl * 2} height={H + bl * 2} fill={`url(#${uid}-g)`} />
          {tt.lines.map((l, i) => <g key={i}>{T(W / 2, cy - (tt.lines.length - 1 - i) * tt.size * 1.12, l, tt.size, '#FFFFFF')}</g>)}
          {heartIcon(W / 2, cy + tt.size * 0.3, m * 0.035, p.accent)}
          {ss.lines.map((l, i) => <g key={`s${i}`}>{T(W / 2, sy + ss.size * 1.35 + i * ss.size * 1.25, l, ss.size, '#FFFFFF', `'${body}'`, 600, { letterSpacing: f1(ss.size * 0.06) })}</g>)}
        </g>
      );
      break;
    }
    case 'travel': {
      const R = m * 0.15, cx = W - R * 1.35, cy = H - R * 1.35;
      const tt = fitLines(title, R * 1.5, R * 0.5, R * 0.42, f.family, f.weight, false, 1.1, 1);
      const bs = fit(badge, R * 1.0, R * 0.3, body, 800);
      const ss = fitLines(sub, W * 0.55, H * 0.06, m * 0.045, f.family, f.weight, !!f.italic, 1.2, 1);
      content = (
        <g>
          {photoEl(slot)}
          <circle cx={f1(cx)} cy={f1(cy)} r={f1(R)} fill={p.bg} fillOpacity="0.88" />
          <circle cx={f1(cx)} cy={f1(cy)} r={f1(R * 0.9)} fill="none" stroke={p.accent} strokeWidth={f1(m * 0.005)} />
          <circle cx={f1(cx)} cy={f1(cy)} r={f1(R * 0.82)} fill="none" stroke={p.accent} strokeWidth={f1(m * 0.002)} strokeDasharray={`${f1(m * 0.006)} ${f1(m * 0.005)}`} />
          {tt.lines[0] && T(cx, cy + tt.size * 0.2, tt.lines[0], tt.size, p.ink, fam, f.weight)}
          {badge && T(cx, cy + tt.size * 0.2 + bs * 1.3, badge, bs, p.accent, `'${body}'`, 800, { letterSpacing: f1(bs * 0.18) })}
          {star(cx, cy - R * 0.5, R * 0.1, p.accent)}
          {ss.lines[0] && (
            <g>
              <rect x={f1(m * 0.05)} y={f1(H - m * 0.05 - ss.size * 1.9)} width={f1(textW(ss.lines[0], ss.size, f.family, f.weight, !!f.italic) + ss.size * 1.6)} height={f1(ss.size * 1.9)} rx={f1(ss.size * 0.3)} fill={p.bg} fillOpacity="0.85" />
              <text x={f1(m * 0.05 + ss.size * 0.8)} y={f1(H - m * 0.05 - ss.size * 0.6)} fontFamily={fam} fontWeight={f.weight} fontStyle={f.italic ? 'italic' : undefined} fontSize={f1(ss.size)} fill={p.ink}>{ss.lines[0]}</text>
            </g>
          )}
        </g>
      );
      break;
    }
  }
  return <g>{content}</g>;
}

/** bảng puzzle: face = xem trước (cắt dáng tim, có thể hiện đường cắt) · print = file in (tràn lề 3mm, không đường cắt)
 *  · tex = texture 3D (ảnh + rãnh cắt mờ) · groove = bản đồ rãnh (bump) */
export function PuzzleSvg({ spec, data, photo, mode = 'face', style }: { spec: PZSpec; data: PZData; photo?: CVPhoto; mode?: PZMode; style?: CSSProperties }) {
  const { W, H } = pzDims(spec.size, spec.shape);
  const g = pzGrid(spec.size, spec.shape);
  const uid = `pz${++uidN}`;
  const b = mode === 'print' ? PZ_BLEED : 0;
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  const heart = spec.shape === 'heart';
  const lw = Math.max(0.25, Math.min(W, H) * 0.0012);
  if (mode === 'groove') {
    return (
      <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-pz="groove">
        <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" />
        <path d={g.inner} fill="none" stroke="#000" strokeWidth={f1(lw * 2.2)} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-pz={mode} data-pieces={g.count} data-cols={g.cols} data-rows={g.rows}>
      {mode === 'face' && heart && <clipPath id={`${uid}-heart`}><path d={g.outline} /></clipPath>}
      <g clipPath={mode === 'face' && heart ? `url(#${uid}-heart)` : undefined}>
        {/* print: kéo dài nền/ảnh ra phần tràn lề */}
        {mode === 'print' && <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={pzPalette(spec.palette).bg} />}
        <Design spec={spec} data={data} photo={photo} W={W} H={H} uid={uid} bl={b} />
        {mode === 'tex' && <path d={g.inner} fill="none" stroke="#000" strokeOpacity="0.32" strokeWidth={f1(lw)} strokeLinecap="round" strokeLinejoin="round" />}
        {mode === 'face' && spec.lines && <path d={g.inner} fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth={f1(lw * 1.3)} data-pz-cut="1" />}
      </g>
      {mode === 'face' && heart && <path d={g.outline} fill="none" stroke="#00000033" strokeWidth={f1(lw)} />}
      {mode === 'face' && !heart && spec.lines && <rect x={0} y={0} width={W} height={H} fill="none" stroke="#FFFFFF" strokeOpacity="0.75" strokeWidth={f1(lw * 1.3)} />}
    </svg>
  );
}

/** file cắt: khổ thật mm, lớp CutContour (viền + toàn bộ đường jigsaw), nét mảnh màu magenta */
export function PuzzleCutSvg({ spec }: { spec: PZSpec }) {
  const g = pzGrid(spec.size, spec.shape);
  const { W, H } = g;
  const M = 8;
  const mat = PZ_MATERIALS.find((m) => m.id === spec.material)!;
  return (
    <svg viewBox={`${-M} ${-M} ${W + M * 2} ${H + M * 2 + 10}`} width={`${W + M * 2}mm`} height={`${H + M * 2 + 10}mm`} xmlns="http://www.w3.org/2000/svg" data-pieces={g.count} data-inner={innerEdgeCount(g)}>
      <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth="0.1">
        <path d={g.outline} data-cut="outline" />
        <path d={g.inner} data-cut="inner" />
      </g>
      <g id="GhiChu" fill="#777" fontFamily="'Be Vietnam Pro'" fontSize="3.2">
        <text x={0} y={H + M + 6}>{`Puzzle ${spec.shape === 'heart' ? 'trái tim' : 'chữ nhật'} ${W / 10}×${H / 10} cm · ${g.count} mảnh (lưới ${g.cols}×${g.rows}) · ${mat.name} · CutContour = khuôn bế jigsaw, đặt khớp file in (tràn lề ${PZ_BLEED}mm)`}</text>
      </g>
    </svg>
  );
}

// ---------- nắp hộp ----------
export const PZ_TURN = 15; // mép gập vào trong
export function lidDims(sizeId: string) {
  const [bw, bh, bd] = pzSize(sizeId).box;
  return { bw, bh, bd, W: bw + (bd + PZ_TURN) * 2, H: bh + (bd + PZ_TURN) * 2 };
}
/** mặt nắp (W×H hộp): ảnh + tên + số mảnh */
function LidTop({ spec, data, photo, w, h, uid }: { spec: PZSpec; data: PZData; photo?: CVPhoto; w: number; h: number; uid: string }) {
  const p = pzPalette(spec.palette);
  const f = pzFont(spec.font);
  const g = pzGrid(spec.size, spec.shape);
  const m = Math.min(w, h);
  const ph = { x: m * 0.06, y: m * 0.06, w: w - m * 0.12, h: h * 0.66 };
  const img = photo ? coverRect(ph, photo) : null;
  const title = data.box || data.title || 'Puzzle của mình';
  const tt = fitLines(title, w * 0.62, h * 0.16, m * 0.11, f.family, f.weight, !!f.italic, 1.1, 2);
  const bandTop = ph.y + ph.h;
  const n = `${g.count}`;
  const bR = m * 0.1;
  const ns = fit(n, bR * 1.45, bR * 0.8, 'Montserrat', 800);
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill={p.bg} />
      <clipPath id={`${uid}-lp`}>{spec.shape === 'heart'
        ? <path d={heartD(ph.h * 1.05, ph.h)} transform={`translate(${f1(w / 2 - ph.h * 0.525)} ${f1(ph.y)})`} />
        : <rect x={ph.x} y={ph.y} width={ph.w} height={ph.h} rx={m * 0.02} />}</clipPath>
      {img && photo && <image href={photo.src} x={img.x} y={img.y} width={img.w} height={img.h} preserveAspectRatio="none" clipPath={`url(#${uid}-lp)`} />}
      {!img && <rect x={ph.x} y={ph.y} width={ph.w} height={ph.h} fill="#C9C2B6" clipPath={`url(#${uid}-lp)`} />}
      {tt.lines.map((l, i) => (
        <text key={i} x={f1(m * 0.07)} y={f1(bandTop + h * 0.04 + tt.size * 0.9 + i * tt.size * 1.1)} fontFamily={`'${f.family}'`} fontWeight={f.weight} fontStyle={f.italic ? 'italic' : undefined} fontSize={f1(tt.size)} fill={p.ink}>{l}</text>
      ))}
      <text x={f1(m * 0.07)} y={f1(h - m * 0.05)} fontFamily="'Be Vietnam Pro'" fontWeight={600} fontSize={f1(m * 0.035)} fill={p.sub} letterSpacing={f1(m * 0.004)}>{`PUZZLE IN ẢNH · ${spec.shape === 'heart' ? 'TRÁI TIM · ' : spec.size === '30' ? 'TRẺ EM · ' : ''}${pzDims(spec.size, spec.shape).W / 10}×${pzDims(spec.size, spec.shape).H / 10} CM`.replace(/\./g, ',')}</text>
      <circle cx={f1(w - bR * 1.35)} cy={f1(bandTop + (h - bandTop) / 2)} r={f1(bR)} fill={p.accent} />
      <text x={f1(w - bR * 1.35)} y={f1(bandTop + (h - bandTop) / 2 + ns * 0.12)} fontFamily="'Montserrat'" fontWeight={800} fontSize={f1(ns)} fill="#FFFFFF" textAnchor="middle">{n}</text>
      <text x={f1(w - bR * 1.35)} y={f1(bandTop + (h - bandTop) / 2 + ns * 0.12 + bR * 0.42)} fontFamily="'Be Vietnam Pro'" fontWeight={800} fontSize={f1(bR * 0.24)} fill="#FFFFFF" textAnchor="middle">MẢNH</text>
    </g>
  );
}
/** mode 'top' = chỉ mặt nắp (texture 3D / xem trước) · 'print' = giấy bồi nắp trải phẳng: mặt + 4 thành + mép gập */
export function LidSvg({ spec, data, photo, mode = 'top', style }: { spec: PZSpec; data: PZData; photo?: CVPhoto; mode?: 'top' | 'side' | 'print'; style?: CSSProperties }) {
  const { bw, bh, bd, W, H } = lidDims(spec.size);
  const p = pzPalette(spec.palette);
  const uid = `lid${++uidN}`;
  if (mode === 'top') {
    return <svg viewBox={`0 0 ${bw} ${bh}`} xmlns="http://www.w3.org/2000/svg" style={style} data-lid="top"><LidTop spec={spec} data={data} photo={photo} w={bw} h={bh} uid={uid} /></svg>;
  }
  if (mode === 'side') {
    const f = pzFont(spec.font);
    const t = data.box || data.title || 'Puzzle';
    const s = fit(t, bw * 0.6, bd * 0.42, f.family, f.weight, !!f.italic);
    return (
      <svg viewBox={`0 0 ${bw} ${bd}`} xmlns="http://www.w3.org/2000/svg" style={style} data-lid="side">
        <rect x={0} y={0} width={bw} height={bd} fill={p.bg} />
        <text x={bw * 0.05} y={bd / 2 + s * 0.33} fontFamily={`'${f.family}'`} fontWeight={f.weight} fontStyle={f.italic ? 'italic' : undefined} fontSize={f1(s)} fill={p.ink}>{t}</text>
        <text x={bw * 0.95} y={bd / 2 + bd * 0.12} fontFamily="'Montserrat'" fontWeight={800} fontSize={f1(bd * 0.32)} fill={p.accent} textAnchor="end">{pzGrid(spec.size, spec.shape).count} MẢNH</text>
      </svg>
    );
  }
  const x0 = bd + PZ_TURN, y0 = bd + PZ_TURN, b = PZ_BLEED;
  // khung chữ thập: mặt giữa + 4 thành (cao bd) + mép gập (PZ_TURN)
  const cross = `M${x0} 0H${x0 + bw}V${y0}H${W}V${y0 + bh}H${x0 + bw}V${H}H${x0}V${y0 + bh}H0V${y0}H${x0}Z`;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2 + 10}`} width={`${W + b * 2}mm`} height={`${H + b * 2 + 10}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-lid="print">
      <g id="In">
        <path d={cross} fill={p.bg} stroke={p.bg} strokeWidth={b * 2} strokeLinejoin="miter" />
        <g transform={`translate(${x0} ${y0})`}><LidTop spec={spec} data={data} photo={photo} w={bw} h={bh} uid={uid} /></g>
      </g>
      <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth="0.15"><path d={cross} /></g>
      <g id="Fold" fill="none" stroke="#00A0E0" strokeWidth="0.15" strokeDasharray="2 1.5">
        <path d={`M${x0} ${y0}H${x0 + bw}V${y0 + bh}H${x0}Z`} />
        <path d={`M${x0} ${PZ_TURN}H${x0 + bw}M${x0} ${H - PZ_TURN}H${x0 + bw}M${PZ_TURN} ${y0}V${y0 + bh}M${W - PZ_TURN} ${y0}V${y0 + bh}`} />
      </g>
      <text x={0} y={H + b + 6} fontFamily="'Be Vietnam Pro'" fontSize="3" fill="#777">{`Giấy bồi nắp hộp ${bw / 10}×${bh / 10}×${bd / 10} cm · nét liền hồng = cắt · nét đứt xanh = gấp (thành ${bd}mm + mép gập ${PZ_TURN}mm) · tràn lề ${b}mm`}</text>
    </svg>
  );
}
