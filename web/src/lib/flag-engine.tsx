'use client';
// Cờ phướn (giọt nước / lông vũ) · cờ dây tam giác / đuôi nheo · cờ cầm tay — SVG đúng khổ thật (đơn vị: mm).
// - Dáng cờ tính bằng bezier trong code (không vẽ tay) → cùng 1 đường dùng cho file in (nét cắt), xem phẳng và 3D.
// - Phướn: chữ chạy DỌC (xoay -90°, đọc từ dưới lên), ống luồn cột (sleeve) bên trái 60mm, lề xén 10mm.
// - Cờ dây: mỗi lá 1 chữ cái (đánh vần cả câu), màu xen kẽ, viền luồn dây 30mm phía trên.
// - In 1 mặt (mực thấm xuyên vải, mặt sau thấy ngược) hoặc 2 mặt (thêm tấm mặt sau, dáng lật gương, chữ vẫn xuôi).
// Chữ được đo bằng canvas (đã nạp font) → co/xuống dòng cho vừa vùng an toàn, không tràn mép.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export type FGKind = 'phuon' | 'bunting' | 'hand';
export type PhuonShape = 'teardrop' | 'feather';
export type PennantShape = 'triangle' | 'swallow';
export type FGBase = 'cross' | 'water';
export type FGLayout = 'solid' | 'band' | 'stripe';
export type FGMotif = 'confetti' | 'percent' | 'beans' | 'bubbles' | 'arrows' | 'stars' | 'hearts' | 'none';

export interface FGSpec {
  kind: FGKind;
  shape: PhuonShape;
  height: 25 | 35 | 45;
  pennant: PennantShape;
  pSize: 's' | 'm';
  hSize: 's' | 'm';
  layout: FGLayout;
  palette: string;
  font: string;
  motif: FGMotif;
  sides: 1 | 2;
  base: FGBase;
}
export type FGData = Record<string, string>;

export const FG_KINDS: { id: FGKind; name: string }[] = [
  { id: 'phuon', name: 'Cờ phướn' },
  { id: 'bunting', name: 'Cờ dây' },
  { id: 'hand', name: 'Cờ cầm tay' },
];

// ---- kích thước (mm) ----
export const PHUON_SIZES: Record<PhuonShape, Record<25 | 35 | 45, { w: number; h: number }>> = {
  teardrop: { 25: { w: 700, h: 1700 }, 35: { w: 850, h: 2500 }, 45: { w: 1000, h: 3300 } },
  feather: { 25: { w: 600, h: 1900 }, 35: { w: 700, h: 2800 }, 45: { w: 800, h: 3700 } },
};
export const PENNANT_SIZES = { s: { w: 200, h: 300, name: '20 × 30 cm' }, m: { w: 300, h: 450, name: '30 × 45 cm' } } as const;
export const HAND_SIZES = { s: { w: 300, h: 200, name: '30 × 20 cm' }, m: { w: 450, h: 300, name: '45 × 30 cm' } } as const;
export const SLEEVE_PHUON = 60;  // ống luồn cột phướn (gấp đôi may lại)
export const SLEEVE_HAND = 25;   // ống luồn que cờ cầm tay
export const SLEEVE_PENNANT = 30; // viền luồn dây cờ dây
export const FG_BLEED = 10;       // lề xén vải (mm)
export const PENNANT_GAP = 20;    // khoảng cách các lá trên tờ in (mỗi bên 5mm lề xén + đường dao)

export function pieceSize(spec: FGSpec): { w: number; h: number; sleeve: number } {
  if (spec.kind === 'phuon') { const s = PHUON_SIZES[spec.shape][spec.height]; return { w: s.w, h: s.h, sleeve: SLEEVE_PHUON }; }
  if (spec.kind === 'hand') { const s = HAND_SIZES[spec.hSize]; return { w: s.w, h: s.h, sleeve: SLEEVE_HAND }; }
  const s = PENNANT_SIZES[spec.pSize]; return { w: s.w, h: s.h, sleeve: SLEEVE_PENNANT };
}

// ---- font ----
export interface FGFont { id: string; name: string; family: string; weight: number }
export const FG_FONTS: FGFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const fgFont = (id: string) => FG_FONTS.find((f) => f.id === id) || FG_FONTS[0];
const BODY = { family: 'Be Vietnam Pro', weight: 800 };
const BODY_LIGHT = { family: 'Be Vietnam Pro', weight: 600 };

export const FG_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@800&family=Oswald:wght@700&family=Bungee&family=Baloo+2:wght@800&family=Be+Vietnam+Pro:wght@600;800&display=swap');`;

export function useFGFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-fg-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-fg-fonts'; link.rel = 'stylesheet';
        link.href = FG_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...FG_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY.family}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123%')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---- bảng màu ----
export interface FGPalette { id: string; name: string; bg: string; on: string; alt: string; paper: string; ink: string; sleeve: string; cycle: string[] }
export const FG_PALETTES: FGPalette[] = [
  { id: 'redgold', name: 'Đỏ vàng', bg: '#D7261E', on: '#FFFFFF', alt: '#FFC93C', paper: '#FFF6E5', ink: '#2A0F0A', sleeve: '#1C1C1C', cycle: ['#D7261E', '#FFC93C', '#FFFFFF'] },
  { id: 'blackyellow', name: 'Đen vàng', bg: '#151515', on: '#FFD400', alt: '#FFFFFF', paper: '#FFF8D6', ink: '#151515', sleeve: '#151515', cycle: ['#151515', '#FFD400', '#E2231A'] },
  { id: 'coffee', name: 'Nâu cà phê', bg: '#4A2C1D', on: '#F6E7CF', alt: '#D9A15B', paper: '#F6E7CF', ink: '#3A2216', sleeve: '#2B1A11', cycle: ['#4A2C1D', '#D9A15B', '#F6E7CF'] },
  { id: 'milktea', name: 'Hồng trà sữa', bg: '#F27D9B', on: '#FFFFFF', alt: '#5B2A1E', paper: '#FFF1F4', ink: '#5B2A1E', sleeve: '#5B2A1E', cycle: ['#F27D9B', '#FFF1F4', '#5B2A1E'] },
  { id: 'navy', name: 'Navy', bg: '#12305F', on: '#FFFFFF', alt: '#F2B705', paper: '#F4F7FC', ink: '#12305F', sleeve: '#0C1F3D', cycle: ['#12305F', '#F2B705', '#FFFFFF'] },
  { id: 'green', name: 'Xanh lá', bg: '#11834A', on: '#FFFFFF', alt: '#FFE14D', paper: '#F1FBF4', ink: '#0D3B23', sleeve: '#0D3B23', cycle: ['#11834A', '#FFE14D', '#FFFFFF'] },
  { id: 'orange', name: 'Cam', bg: '#FF6A13', on: '#FFFFFF', alt: '#1E1E1E', paper: '#FFF3EA', ink: '#1E1E1E', sleeve: '#1E1E1E', cycle: ['#FF6A13', '#1E1E1E', '#FFFFFF'] },
  { id: 'pastel', name: 'Pastel', bg: '#7C5CFF', on: '#FFFFFF', alt: '#FFD166', paper: '#FFFFFF', ink: '#2D2A4A', sleeve: '#2D2A4A', cycle: ['#FF8FAB', '#FFD166', '#7BDFF2', '#B2F7EF', '#CDB4DB'] },
  { id: 'tet', name: 'Tết', bg: '#B5121B', on: '#FFD66B', alt: '#FFD66B', paper: '#FFF4D6', ink: '#7A0B10', sleeve: '#7A0B10', cycle: ['#B5121B', '#FFD66B', '#E8473C'] },
];
export const fgPalette = (id: string) => FG_PALETTES.find((p) => p.id === id) || FG_PALETTES[0];

export const FG_MOTIFS: { id: FGMotif; name: string }[] = [
  { id: 'confetti', name: 'Hoa giấy' }, { id: 'stars', name: 'Ngôi sao' }, { id: 'percent', name: 'Dấu %' }, { id: 'beans', name: 'Hạt cà phê' },
  { id: 'bubbles', name: 'Trân châu' }, { id: 'arrows', name: 'Mũi tên' }, { id: 'hearts', name: 'Trái tim' }, { id: 'none', name: 'Trơn' },
];
export const FG_LAYOUTS: { id: FGLayout; name: string }[] = [
  { id: 'solid', name: 'Nền màu' }, { id: 'band', name: 'Dải màu' }, { id: 'stripe', name: 'Sọc chéo' },
];

// ---- mẫu ----
export interface FGTemplate { id: string; name: string; spec: Partial<FGSpec> & { kind: FGKind }; data: FGData }
export const FG_TEMPLATES: FGTemplate[] = [
  { id: 'khai-truong', name: 'Khai trương', spec: { kind: 'phuon', shape: 'teardrop', layout: 'solid', palette: 'redgold', font: 'montserrat', motif: 'confetti' },
    data: { title: 'KHAI TRƯƠNG', sub: 'Giảm 20% toàn bộ menu', brand: 'AN KHANG COFFEE', phone: '0909 123 456' } },
  { id: 'sale', name: 'Sale sốc', spec: { kind: 'phuon', shape: 'feather', layout: 'stripe', palette: 'blackyellow', font: 'bungee', motif: 'percent' },
    data: { title: 'SALE 50%', sub: 'Duy nhất cuối tuần này', brand: 'THU HÀ FASHION', phone: '' } },
  { id: 'ca-phe', name: 'Cà phê', spec: { kind: 'phuon', shape: 'feather', layout: 'band', palette: 'coffee', font: 'oswald', motif: 'beans' },
    data: { title: 'CÀ PHÊ', sub: 'Rang xay mỗi sáng', brand: 'GIA KHÁNH COFFEE', phone: '0909 123 456' } },
  { id: 'tra-sua', name: 'Trà sữa', spec: { kind: 'phuon', shape: 'teardrop', layout: 'solid', palette: 'milktea', font: 'baloo', motif: 'bubbles' },
    data: { title: 'TRÀ SỮA', sub: 'Mua 2 ly tặng 1', brand: 'BẢO NGỌC TEA', phone: '0911 222 333' } },
  { id: 'thuong-hieu', name: 'Thương hiệu', spec: { kind: 'phuon', shape: 'feather', layout: 'band', palette: 'navy', font: 'montserrat', motif: 'none' },
    data: { title: 'AN KHANG LAND', sub: 'Nhà phố · Căn hộ · Đất nền', brand: '', phone: '0909 123 456' } },
  { id: 'mo-cua', name: 'Đang mở cửa', spec: { kind: 'phuon', shape: 'feather', layout: 'solid', palette: 'green', font: 'oswald', motif: 'arrows' },
    data: { title: 'ĐANG MỞ CỬA', sub: 'Phục vụ 6:00 – 22:00', brand: 'QUỐC BẢO MART', phone: '0909 123 456' } },
  { id: 'day-khai-truong', name: 'Dây khai trương', spec: { kind: 'bunting', pennant: 'triangle', palette: 'redgold', font: 'bungee', motif: 'stars' },
    data: { word: 'KHAI TRƯƠNG' } },
  { id: 'day-sinh-nhat', name: 'Dây sinh nhật', spec: { kind: 'bunting', pennant: 'triangle', palette: 'pastel', font: 'baloo', motif: 'hearts' },
    data: { word: 'SINH NHẬT VUI VẺ' } },
  { id: 'day-sale', name: 'Dây sale', spec: { kind: 'bunting', pennant: 'swallow', palette: 'blackyellow', font: 'bungee', motif: 'stars' },
    data: { word: 'SALE SỐC' } },
  { id: 'day-tet', name: 'Dây Tết', spec: { kind: 'bunting', pennant: 'swallow', palette: 'tet', font: 'montserrat', motif: 'stars' },
    data: { word: 'CHÚC MỪNG NĂM MỚI' } },
  { id: 'co-vu', name: 'Cổ vũ', spec: { kind: 'hand', layout: 'stripe', palette: 'orange', font: 'bungee', motif: 'stars' },
    data: { title: 'CỐ LÊN!', sub: 'Lớp 12A1 · Hội thao 2026', brand: '' } },
  { id: 'chao-mung', name: 'Chào mừng', spec: { kind: 'hand', layout: 'band', palette: 'navy', font: 'montserrat', motif: 'none' },
    data: { title: 'CHÀO MỪNG', sub: 'Hội nghị khách hàng 2027', brand: 'AN KHANG GROUP' } },
];

export const FG_DEFAULT_SPEC: FGSpec = {
  kind: 'phuon', shape: 'teardrop', height: 35, pennant: 'triangle', pSize: 's', hSize: 's',
  layout: 'solid', palette: 'redgold', font: 'montserrat', motif: 'confetti', sides: 1, base: 'cross',
};

export interface FGField { key: string; label: string; ph?: string }
export const FG_FIELDS: Record<FGKind, FGField[]> = {
  phuon: [
    { key: 'title', label: 'Chữ lớn (chạy dọc cờ)', ph: 'KHAI TRƯƠNG' },
    { key: 'sub', label: 'Dòng phụ', ph: 'Giảm 20% toàn bộ menu' },
    { key: 'brand', label: 'Tên cửa hàng', ph: 'AN KHANG COFFEE' },
    { key: 'phone', label: 'Hotline', ph: '0909 123 456' },
  ],
  bunting: [
    { key: 'word', label: 'Chữ trên dây (mỗi lá 1 chữ cái, dấu cách = hoạ tiết)', ph: 'KHAI TRƯƠNG' },
  ],
  hand: [
    { key: 'title', label: 'Chữ lớn', ph: 'CHÀO MỪNG' },
    { key: 'sub', label: 'Dòng phụ', ph: 'Hội nghị khách hàng 2027' },
    { key: 'brand', label: 'Tên đơn vị (nhỏ, phía trên)', ph: 'AN KHANG GROUP' },
  ],
};

// ---- đo chữ ----
let _ctx: CanvasRenderingContext2D | null = null;
function mctx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!_ctx) _ctx = document.createElement('canvas').getContext('2d');
  return _ctx;
}
export interface Meas { w: number; asc: number; desc: number }
export function meas(text: string, family: string, weight: number, size: number): Meas {
  const c = mctx();
  if (!c) return { w: text.length * size * 0.6, asc: size * 0.95, desc: size * 0.22 };
  c.font = `${weight} 200px "${family}"`;
  const m = c.measureText(text);
  const k = size / 200;
  return { w: m.width * k, asc: (m.actualBoundingBoxAscent || 150) * k, desc: (m.actualBoundingBoxDescent || 40) * k };
}
const fitLen = (text: string, family: string, weight: number, maxLen: number, maxSize: number) => {
  const w1 = meas(text, family, weight, 1).w;
  return w1 > 0 ? Math.min(maxSize, maxLen / w1) : maxSize;
};
function splitBalanced(text: string): [string, string] | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return null;
  let best: [string, string] = [words[0], words.slice(1).join(' ')], diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const d = Math.abs(a.length - b.length);
    if (d < diff) { diff = d; best = [a, b]; }
  }
  return best;
}
const clean = (s: string | undefined) => (s || '').replace(/\s+/g, ' ').trim();

// ---- hình học ----
type Pt = [number, number];
const cub = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
};
const quad = (p0: Pt, p1: Pt, p2: Pt, t: number): Pt => {
  const u = 1 - t;
  return [u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]];
};
const sample = (f: (t: number) => Pt, n: number): Pt[] => Array.from({ length: n + 1 }, (_, i) => f(i / n));

export interface Rect { x0: number; y0: number; x1: number; y1: number }
export interface FlagShape {
  w: number; h: number;
  d: string;            // đường cắt (không kể ống luồn)
  poly: Pt[];           // đa giác lấy mẫu (để kiểm tra trong/ngoài, rải hoạ tiết)
  top: Pt[];            // mép trên gắn cột (phướn) — từ góc trên-trái sang phải
  y0: number;           // điểm cao nhất của mép trái (nơi bắt đầu ống luồn)
  safe: Rect;           // vùng chữ chính
  badge: { cx: number; cy: number; r: number } | null;
}

export function phuonShape(shape: PhuonShape, W: number, H: number): FlagShape {
  if (shape === 'teardrop') {
    const P0: Pt = [0, 0.075 * H], C1: Pt = [0, 0], C2: Pt = [W, 0.08 * H], P1: Pt = [W, 0.3 * H];
    const C3: Pt = [W, 0.58 * H], C4: Pt = [0.45 * W, 0.93 * H], P2: Pt = [0.16 * W, H];
    const top = sample((t) => cub(P0, C1, C2, P1, t), 60);
    const right = sample((t) => cub(P1, C3, C4, P2, t), 80);
    const left = sample((t) => [0, H - t * (H - P0[1])], 20);
    return {
      w: W, h: H, y0: P0[1],
      d: `M0 ${P0[1]} C0 0 ${W} ${C2[1]} ${W} ${P1[1]} C${W} ${C3[1]} ${C4[0]} ${C4[1]} ${P2[0]} ${H} L0 ${H} Z`,
      poly: [...top, ...right.slice(1), [0, H], ...left.slice(1)],
      top,
      safe: { x0: 0.08 * W, y0: 0.23 * H, x1: 0.62 * W, y1: 0.7 * H },
      badge: { cx: 0.37 * W, cy: 0.135 * H, r: Math.min(0.15 * W, 0.045 * H) },
    };
  }
  const P0: Pt = [0, 0.02 * H], C1: Pt = [0.02 * W, 0], C2: Pt = [W, 0.02 * H], P1: Pt = [W, 0.13 * H];
  const Q: Pt = [W, 0.5 * H], P2: Pt = [0.95 * W, 0.86 * H];
  const top = sample((t) => cub(P0, C1, C2, P1, t), 60);
  const right = sample((t) => quad(P1, Q, P2, t), 50);
  const left = sample((t) => [0, H - t * (H - P0[1])], 20);
  return {
    w: W, h: H, y0: P0[1],
    d: `M0 ${P0[1]} C${C1[0]} 0 ${W} ${C2[1]} ${W} ${P1[1]} Q${W} ${Q[1]} ${P2[0]} ${P2[1]} L0 ${H} Z`,
    poly: [...top, ...right.slice(1), [0, H], ...left.slice(1)],
    top,
    safe: { x0: 0.08 * W, y0: 0.17 * H, x1: 0.84 * W, y1: 0.79 * H },
    badge: { cx: 0.42 * W, cy: 0.105 * H, r: Math.min(0.2 * W, 0.035 * H) },
  };
}
export function handShape(W: number, H: number): FlagShape {
  return {
    w: W, h: H, y0: 0, d: `M0 0 L${W} 0 L${W} ${H} L0 ${H} Z`,
    poly: [[0, 0], [W, 0], [W, H], [0, H]], top: [[0, 0], [W, 0]],
    safe: { x0: 0.08 * W, y0: 0.1 * H, x1: 0.92 * W, y1: 0.9 * H }, badge: null,
  };
}
export function pennantShape(shape: PennantShape, W: number, H: number): FlagShape {
  const poly: Pt[] = shape === 'triangle' ? [[0, 0], [W, 0], [W / 2, H]] : [[0, 0], [W, 0], [W, H], [W / 2, 0.72 * H], [0, H]];
  return {
    w: W, h: H, y0: 0, d: `M${poly.map((p) => `${p[0]} ${p[1]}`).join(' L')} Z`, poly, top: [[0, 0], [W, 0]],
    safe: { x0: 0.1 * W, y0: 0.06 * H, x1: 0.9 * W, y1: 0.7 * H }, badge: null,
  };
}
export function shapeOf(spec: FGSpec): FlagShape {
  const { w, h } = pieceSize(spec);
  if (spec.kind === 'phuon') return phuonShape(spec.shape, w, h);
  if (spec.kind === 'hand') return handShape(w, h);
  return pennantShape(spec.pennant, w, h);
}
export function inPoly(p: Pt, poly: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// PRNG cố định (hoạ tiết không nhảy lung tung khi gõ chữ)
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---- hoạ tiết vẽ bằng code ----
export function motifEl(m: FGMotif, x: number, y: number, s: number, color: string, rot: number, key: string | number, alt = color): ReactNode {
  const tf = `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`;
  switch (m) {
    case 'confetti': return (Number(String(key).replace(/\D/g, '') || 0) % 2
      ? <rect key={key} transform={tf} x={-s * 0.5} y={-s * 0.18} width={s} height={s * 0.36} rx={s * 0.08} fill={color} />
      : <circle key={key} transform={tf} r={s * 0.28} fill={alt} />);
    case 'stars': {
      const pts = Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? s * 0.22 : s * 0.5; const a = -Math.PI / 2 + (i * Math.PI) / 5; return `${(Math.cos(a) * r).toFixed(1)} ${(Math.sin(a) * r).toFixed(1)}`; });
      return <path key={key} transform={tf} d={`M${pts.join(' L')} Z`} fill={color} />;
    }
    case 'hearts': return <path key={key} transform={`${tf} scale(${(s / 100).toFixed(3)})`} d="M0 35 C-60 -5 -45 -55 0 -25 C45 -55 60 -5 0 35 Z" fill={color} />;
    case 'percent': return (
      <g key={key} transform={tf} fill="none" stroke={color} strokeWidth={s * 0.13} strokeLinecap="round">
        <circle cx={-s * 0.28} cy={-s * 0.28} r={s * 0.17} /><circle cx={s * 0.28} cy={s * 0.28} r={s * 0.17} /><path d={`M${s * 0.38} ${-s * 0.42} L${-s * 0.38} ${s * 0.42}`} />
      </g>);
    case 'beans': return (
      <g key={key} transform={tf}>
        <ellipse rx={s * 0.3} ry={s * 0.44} fill={color} />
        <path d={`M0 ${-s * 0.38} C${s * 0.14} ${-s * 0.12} ${-s * 0.14} ${s * 0.12} 0 ${s * 0.38}`} fill="none" stroke={alt} strokeWidth={s * 0.06} strokeLinecap="round" />
      </g>);
    case 'bubbles': return (
      <g key={key} transform={tf}>
        <circle r={s * 0.32} fill={color} /><circle cx={-s * 0.1} cy={-s * 0.11} r={s * 0.08} fill={alt} opacity={0.8} />
      </g>);
    case 'arrows': return <path key={key} transform={tf} d={`M${-s * 0.3} ${-s * 0.4} L${s * 0.2} 0 L${-s * 0.3} ${s * 0.4}`} fill="none" stroke={color} strokeWidth={s * 0.16} strokeLinecap="round" strokeLinejoin="round" />;
    default: return null;
  }
}

const luminance = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrastOn = (bg: string, cands: string[]) => {
  const L = luminance(bg);
  return cands.reduce((best, c) => (Math.abs(luminance(c) - L) > Math.abs(luminance(best) - L) ? c : best), cands[0]);
};
const initials = (brand: string) => clean(brand).split(' ').filter((w) => /\p{L}/u.test(w)).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || 'M';
const uid = (raw: string) => raw.replace(/[^a-zA-Z0-9_-]/g, '');

// =====================================================================================
// PHƯỚN + CỜ CẦM TAY (1 tấm vải, ống luồn bên trái)
// =====================================================================================
interface PLine { text: string; family: string; weight: number; size: number; color: string; base: number; m: Meas; pill?: string; role: string }

// xếp các dòng chữ chạy dọc trong vùng R (phướn): độ dài dòng ≤ chiều cao R, các dòng chồng theo bề ngang R
function phuonLines(R: Rect, data: FGData, f: FGFont, pal: FGPalette, layout: FGLayout): { lines: PLine[]; titleX: [number, number] } {
  const len = (R.y1 - R.y0) * 0.97, thick = R.x1 - R.x0;
  const title = clean(data.title).toUpperCase() || ' ';
  const one = fitLen(title, f.family, f.weight, len, thick * 0.6);
  let tl: string[] = [title], ts = one;
  const sp = splitBalanced(title);
  if (sp) {
    const two = Math.min(thick * 0.33, fitLen(sp[0], f.family, f.weight, len, 1e9), fitLen(sp[1], f.family, f.weight, len, 1e9));
    if (two > one * 1.18) { tl = sp; ts = two; }
  }
  const onBg = layout === 'band' ? pal.ink : pal.on;
  const items: { text: string; fam: string; wt: number; size: number; color: string; role: string; pill?: string; gapBefore: number }[] = [];
  tl.forEach((t, i) => items.push({ text: t, fam: f.family, wt: f.weight, size: ts, color: pal.on, role: 'title', gapBefore: i ? 0.02 : 0 }));
  const sub = clean(data.sub), brand = clean(data.brand).toUpperCase(), phone = clean(data.phone);
  // dòng phụ / tên quán dài → tách 2 dòng nếu chữ to hơn rõ
  const pushMaybe2 = (text: string, fam: string, wt: number, L: number, cap: number, color: string, role: string, gap: number) => {
    let lines = [text], size = fitLen(text, fam, wt, L, cap);
    const sp2 = splitBalanced(text);
    if (sp2) { const s2 = Math.min(cap, fitLen(sp2[0], fam, wt, L, cap), fitLen(sp2[1], fam, wt, L, cap)); if (s2 > size * 1.35) { lines = sp2; size = s2; } }
    lines.forEach((t, i) => items.push({ text: t, fam, wt, size, color, role, gapBefore: i ? 0.015 : gap }));
  };
  if (sub) pushMaybe2(sub, BODY.family, BODY.weight, len * 0.95, thick * 0.12, layout === 'band' ? pal.ink : pal.alt, 'sub', 0.06);
  if (brand) pushMaybe2(brand, f.family, f.weight, len * 0.85, thick * 0.1, onBg, 'brand', 0.05);
  if (phone) {
    const t = phone;
    items.push({ text: t, fam: BODY.family, wt: BODY.weight, size: fitLen(t, BODY.family, BODY.weight, len * 0.7, thick * 0.1), color: pal.bg, role: 'phone', pill: pal.alt, gapBefore: 0.05 });
  }
  // co đều cho vừa bề ngang
  const pillPad = (s: number) => s * 0.32;
  const measureAll = (k: number) => items.map((it) => ({ ...it, size: it.size * k, m: meas(it.text, it.fam, it.wt, it.size * k) }));
  let k = 1, list = measureAll(1);
  for (let it = 0; it < 6; it++) {
    const total = list.reduce((s, l) => s + l.m.asc + l.m.desc + (l.pill ? pillPad(l.size) * 2 : 0) + l.gapBefore * thick, 0);
    if (total <= thick) break;
    k *= (thick / total) * 0.99; list = measureAll(k);
  }
  const total = list.reduce((s, l) => s + l.m.asc + l.m.desc + (l.pill ? pillPad(l.size) * 2 : 0) + l.gapBefore * thick, 0);
  let cur = R.x0 + (thick - total) / 2;
  const lines: PLine[] = [];
  let tx: [number, number] = [cur, cur];
  for (const l of list) {
    cur += l.gapBefore * thick;
    if (l.pill) cur += pillPad(l.size);
    const base = cur + l.m.asc;
    lines.push({ text: l.text, family: l.fam, weight: l.wt, size: l.size, color: l.color, base, m: l.m, pill: l.pill, role: l.role });
    cur = base + l.m.desc + (l.pill ? pillPad(l.size) : 0);
    if (l.role === 'title') tx = [lines[0].base - lines[0].m.asc, cur];
  }
  return { lines, titleX: tx };
}

// chữ ngang cho cờ cầm tay
function handLines(R: Rect, data: FGData, f: FGFont, pal: FGPalette, layout: FGLayout): PLine[] {
  const wMax = R.x1 - R.x0, hMax = R.y1 - R.y0;
  const title = clean(data.title).toUpperCase() || ' ';
  let tl = [title], ts = fitLen(title, f.family, f.weight, wMax, hMax * 0.42);
  const sp = splitBalanced(title);
  if (sp) {
    const two = Math.min(hMax * 0.26, fitLen(sp[0], f.family, f.weight, wMax, 1e9), fitLen(sp[1], f.family, f.weight, wMax, 1e9));
    if (two > ts * 1.2) { tl = sp; ts = two; }
  }
  const ink = layout === 'band' ? pal.ink : pal.on;
  const items: { text: string; fam: string; wt: number; size: number; color: string; role: string; gap: number }[] = [];
  const brand = clean(data.brand), sub = clean(data.sub);
  const push2 = (text: string, fam: string, wt: number, L: number, cap: number, color: string, role: string, gap: number) => {
    let lines = [text], size = fitLen(text, fam, wt, L, cap);
    const sp2 = splitBalanced(text);
    if (sp2) { const s2 = Math.min(cap, fitLen(sp2[0], fam, wt, L, cap), fitLen(sp2[1], fam, wt, L, cap)); if (s2 > size * 1.35) { lines = sp2; size = s2; } }
    lines.forEach((t, i) => items.push({ text: t, fam, wt, size, color, role, gap: i ? 0.01 : gap }));
  };
  if (brand) push2(brand.toUpperCase(), BODY.family, BODY.weight, wMax * 0.8, hMax * 0.08, layout === 'band' ? pal.bg : pal.alt, 'brand', 0);
  tl.forEach((t, i) => items.push({ text: t, fam: f.family, wt: f.weight, size: ts, color: layout === 'band' ? pal.bg : pal.on, role: 'title', gap: i ? 0.02 : brand ? 0.06 : 0 }));
  if (sub) push2(sub, BODY_LIGHT.family, BODY_LIGHT.weight, wMax * 0.92, hMax * 0.11, ink, 'sub', 0.07);
  const measureAll = (k: number) => items.map((it) => ({ ...it, size: it.size * k, m: meas(it.text, it.fam, it.wt, it.size * k) }));
  let k = 1, list = measureAll(1);
  for (let i = 0; i < 6; i++) {
    const total = list.reduce((s, l) => s + l.m.asc + l.m.desc + l.gap * hMax, 0);
    if (total <= hMax) break;
    k *= (hMax / total) * 0.99; list = measureAll(k);
  }
  const total = list.reduce((s, l) => s + l.m.asc + l.m.desc + l.gap * hMax, 0);
  let cur = R.y0 + (hMax - total) / 2;
  return list.map((l) => {
    cur += l.gap * hMax;
    const base = cur + l.m.asc;
    cur = base + l.m.desc;
    return { text: l.text, family: l.fam, weight: l.wt, size: l.size, color: l.color, base, m: l.m, role: l.role };
  });
}

export interface PieceProps {
  spec: FGSpec; data: FGData; logo?: string;
  bleed?: number;     // mm lề xén (file in)
  marks?: boolean;    // nét cắt + đường gấp ống luồn (file in)
  mirror?: boolean;   // tấm mặt sau (in 2 mặt): dáng lật gương, chữ vẫn xuôi
  sleeve?: boolean;   // hiện ống luồn (mặc định có)
  style?: CSSProperties;
  testid?: string;
}

/** 1 tấm cờ phướn / cờ cầm tay. Toạ độ: x ∈ [-ống luồn, W], y ∈ [0, H]. */
export function FlagPiece({ spec, data, logo, bleed = 0, marks = false, mirror = false, sleeve = true, style, testid }: PieceProps) {
  const id = uid(useId());
  const sh = shapeOf(spec);
  const { w: W, h: H } = sh;
  const SLV = sleeve ? pieceSize(spec).sleeve : 0;
  const pal = fgPalette(spec.palette), f = fgFont(spec.font);
  const phuon = spec.kind === 'phuon';
  const R = sh.safe;
  const b = bleed;
  const vb = `${-SLV - b} ${-b} ${W + SLV + b * 2} ${H + b * 2}`;
  const mx = (x: number) => (mirror ? W - SLV - x : x); // vị trí (không lật chữ)
  const flipT = mirror ? `translate(${W - SLV} 0) scale(-1 1)` : undefined;

  // dòng chữ
  let textEls: ReactNode = null, bandX: [number, number] | null = null, keep: Rect[] = [];
  if (phuon) {
    const { lines, titleX } = phuonLines(R, data, f, pal, spec.layout);
    bandX = titleX;
    const cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2;
    keep = [{ x0: R.x0 - W * 0.03, y0: R.y0 - H * 0.01, x1: R.x1 + W * 0.03, y1: R.y1 + H * 0.01 }];
    textEls = lines.map((l, i) => {
      const lx = mx(cx), ly = cy; // tâm nhóm (đã lật vị trí nếu mặt sau)
      const off = mirror ? cx - l.base : l.base - cx; // toạ độ ngang (sau xoay) của đường chân chữ
      // xoay -90: trục x cục bộ → hướng lên, trục y cục bộ → sang phải; mặt sau: chồng dòng theo chiều ngược lại để thứ tự vẫn từ cột ra
      const yLocal = mirror ? -off + (l.m.asc - l.m.desc) * 0 : off;
      return (
        <g key={i} transform={`translate(${lx.toFixed(1)} ${ly.toFixed(1)}) rotate(-90)`}>
          {l.pill && <rect x={-l.m.w / 2 - l.size * 0.45} y={(mirror ? -(l.base - cx) - l.m.asc + (l.m.asc - l.m.desc) : yLocal - l.m.asc) - l.size * 0.32} width={l.m.w + l.size * 0.9} height={l.m.asc + l.m.desc + l.size * 0.64} rx={(l.m.asc + l.m.desc + l.size * 0.64) / 2} fill={l.pill} />}
          <text x={0} y={(mirror ? -(l.base - cx) + (l.m.asc - l.m.desc) : yLocal).toFixed(2)} textAnchor="middle" fontFamily={`"${l.family}"`} fontWeight={l.weight} fontSize={l.size.toFixed(2)} fill={l.color} data-role={l.role}>{l.text}</text>
        </g>
      );
    });
  } else {
    let RH: Rect = spec.layout === 'stripe' ? { ...R, x0: W * 0.16, x1: W * 0.84 } : spec.layout === 'band' ? { ...R, y0: H * 0.21, y1: H * 0.79 } : R;
    if (logo) RH = { ...RH, x0: Math.max(RH.x0, W * 0.22), x1: Math.min(RH.x1, W * 0.78) }; // chừa chỗ logo góc trái
    const lines = handLines(RH, data, f, pal, spec.layout);
    keep = lines.map((l) => ({ x0: (W - l.m.w) / 2 - W * 0.03, y0: l.base - l.m.asc - H * 0.03, x1: (W + l.m.w) / 2 + W * 0.03, y1: l.base + l.m.desc + H * 0.03 }));
    const cx = mx(W / 2);
    textEls = lines.map((l, i) => (
      <text key={i} x={cx.toFixed(1)} y={l.base.toFixed(2)} textAnchor="middle" fontFamily={`"${l.family}"`} fontWeight={l.weight} fontSize={l.size.toFixed(2)} fill={l.color} data-role={l.role}>{l.text}</text>
    ));
  }

  // nền + hoạ tiết (vẽ trong hệ toạ độ chưa lật, rồi lật cả nhóm nếu là mặt sau)
  const bgCol = spec.layout === 'band' ? pal.paper : pal.bg;
  const bgEls: ReactNode[] = [<rect key="bg" x={-SLV - b - 5} y={-b - 5} width={W + SLV + b * 2 + 10} height={H + b * 2 + 10} fill={bgCol} />];
  if (spec.layout === 'band') {
    if (phuon && bandX) {
      bgEls.push(<rect key="band" x={bandX[0] - W * 0.05} y={-b - 5} width={bandX[1] - bandX[0] + W * 0.1} height={H + b * 2 + 10} fill={pal.bg} />);
      bgEls.push(<path key="tip" d={`M${-b - 5} ${H * 0.84} L${W + b} ${H * 0.74} L${W + b} ${H + b + 5} L${-b - 5} ${H + b + 5} Z`} fill={pal.bg} />);
      bgEls.push(<path key="tip2" d={`M${-b - 5} ${H * 0.88} L${W + b} ${H * 0.78} L${W + b} ${H * 0.8} L${-b - 5} ${H * 0.9} Z`} fill={pal.alt} />);
    } else {
      bgEls.push(<rect key="t" x={-b - 5} y={-b - 5} width={W + b * 2 + 10} height={H * 0.15 + b + 5} fill={pal.bg} />);
      bgEls.push(<rect key="b" x={-b - 5} y={H * 0.85} width={W + b * 2 + 10} height={H * 0.15 + b + 5} fill={pal.bg} />);
      bgEls.push(<rect key="t2" x={-b - 5} y={H * 0.15} width={W + b * 2 + 10} height={H * 0.025} fill={pal.alt} />);
      bgEls.push(<rect key="b2" x={-b - 5} y={H * 0.825} width={W + b * 2 + 10} height={H * 0.025} fill={pal.alt} />);
    }
  } else if (spec.layout === 'stripe') {
    const step = Math.max(W, H) * 0.06;
    const zones = phuon ? [[-b - 5, R.y0 - H * 0.02], [R.y1 + H * 0.02, H + b + 5]] : [];
    if (phuon) {
      zones.forEach(([ya, yb], zi) => {
        for (let k = -20; k < 40; k++) {
          const x = k * step * 2;
          bgEls.push(<path key={`s${zi}-${k}`} d={`M${x} ${ya} L${x + step} ${ya} L${x + step + (yb - ya) * 0.6} ${yb} L${x + (yb - ya) * 0.6} ${yb} Z`} fill={pal.alt} opacity={0.9} />);
        }
      });
    } else {
      for (let k = -6; k < 6; k++) {
        const x = k * step * 2;
        bgEls.push(<path key={`l${k}`} d={`M${x - W * 0.2} ${-b - 5} L${x - W * 0.2 + step} ${-b - 5} L${x - W * 0.2 + step - H} ${H + b + 5} L${x - W * 0.2 - H} ${H + b + 5} Z`} fill={pal.alt} />);
        bgEls.push(<path key={`r${k}`} d={`M${W * 0.88 + x} ${-b - 5} L${W * 0.88 + x + step} ${-b - 5} L${W * 0.88 + x + step + H} ${H + b + 5} L${W * 0.88 + x + H} ${H + b + 5} Z`} fill={pal.alt} />);
      }
      // giữ chỗ chữ sạch: dải nền giữa
      bgEls.push(<rect key="mid" x={W * 0.12} y={-b - 5} width={W * 0.76} height={H + b * 2 + 10} fill={pal.bg} />);
    }
  }
  // hoạ tiết rải ngoài vùng chữ
  if (spec.motif !== 'none') {
    const r = rng(spec.motif.length * 97 + W + H);
    const n = phuon ? 70 : 26;
    const sz = phuon ? W * 0.075 : H * 0.09;
    const col = spec.layout === 'band' ? pal.bg : pal.alt;
    const col2 = spec.layout === 'band' ? pal.alt : pal.on;
    let placed = 0;
    for (let i = 0; i < 600 && placed < n; i++) {
      const x = r() * W, y = r() * H, s = sz * (0.6 + r() * 0.7);
      if (!inPoly([x, y], sh.poly)) continue;
      const hit = keep.some((k) => x > k.x0 - s * 0.6 && x < k.x1 + s * 0.6 && y > k.y0 - s * 0.6 && y < k.y1 + s * 0.6);
      if (hit) continue;
      if (sh.badge && Math.hypot(x - sh.badge.cx, y - sh.badge.cy) < sh.badge.r + s) continue;
      if (spec.layout === 'band' && phuon && bandX && x > bandX[0] - W * 0.05 - s && x < bandX[1] + W * 0.05 + s) continue;
      if (spec.layout === 'stripe' && !phuon && x > W * 0.1 && x < W * 0.9) continue;
      bgEls.push(motifEl(spec.motif, x, y, s, col, r() * 360, `m${i}`, col2));
      placed++;
    }
  }

  // huy hiệu logo / chữ viết tắt (phướn)
  let badge: ReactNode = null;
  if (phuon && sh.badge) {
    const { cx, cy, r } = sh.badge;
    const bx = mx(cx);
    const ini = initials(data.brand || data.title || '');
    const isz = Math.min(r * 0.95, fitLen(ini, f.family, f.weight, r * 1.25, r));
    const im = meas(ini, f.family, f.weight, isz);
    badge = (
      <g>
        <circle cx={bx} cy={cy} r={r} fill={spec.layout === 'band' ? pal.bg : pal.paper} stroke={pal.alt} strokeWidth={r * 0.08} />
        {logo ? (
          <>
            <clipPath id={`${id}-lg`}><circle cx={bx} cy={cy} r={r * 0.86} /></clipPath>
            <image href={logo} x={bx - r * 0.86} y={cy - r * 0.86} width={r * 1.72} height={r * 1.72} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-lg)`} />
          </>
        ) : (
          <text x={bx} y={cy + (im.asc - im.desc) / 2} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={isz.toFixed(2)} fill={spec.layout === 'band' ? pal.on : pal.bg} data-role="badge">{ini}</text>
        )}
      </g>
    );
  } else if (!phuon && logo) {
    const r = H * 0.09;
    badge = (
      <g>
        <clipPath id={`${id}-lg`}><circle cx={mx(W * 0.09)} cy={H * 0.15} r={r} /></clipPath>
        <circle cx={mx(W * 0.09)} cy={H * 0.15} r={r * 1.08} fill="#fff" />
        <image href={logo} x={mx(W * 0.09) - r} y={H * 0.15 - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id}-lg)`} />
      </g>
    );
  }

  // ống luồn: vải màu tối chạy dọc mép trái
  const sleeveD = `M${-SLV} ${sh.y0} L0 ${sh.y0} L0 ${H} L${-SLV} ${H} Z`;
  const cutD = SLV ? `M${-SLV} ${sh.y0} L0 ${sh.y0} ${sh.d.replace(/^M0 [\d.]+ /, '').replace(/ L0 [\d.]+ Z$/, '')} L0 ${H} L${-SLV} ${H} Z` : sh.d;

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid} data-w={W + SLV} data-h={H}>
      <defs>
        <mask id={`${id}-m`} maskUnits="userSpaceOnUse" x={-SLV - b - 10} y={-b - 10} width={W + SLV + b * 2 + 20} height={H + b * 2 + 20}>
          <path d={sh.d} transform={flipT} fill="#fff" stroke="#fff" strokeWidth={b * 2} strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#${id}-m)`}>
        <g transform={flipT}>{bgEls}</g>
      </g>
      {SLV > 0 && <path d={sleeveD} transform={flipT} fill={pal.sleeve} stroke={b ? pal.sleeve : 'none'} strokeWidth={b * 2} strokeLinejoin="round" />}
      {badge}
      {textEls}
      {/* đường viền dáng cờ (để QC kiểm tra chữ nằm trong) */}
      <path d={sh.d} transform={flipT} fill="none" stroke="none" data-shape="1" />
      {marks && (
        <g transform={flipT} fill="none">
          <g id="CutContour"><path d={cutD} stroke="#E6007E" strokeWidth={1.2} /></g>
          {SLV > 0 && <g id="Fold"><path d={`M0 ${sh.y0} L0 ${H}`} stroke="#00A0E9" strokeWidth={1} strokeDasharray="8 6" /></g>}
        </g>
      )}
    </svg>
  );
}

// =====================================================================================
// CỜ DÂY
// =====================================================================================
export const buntingChars = (word: string) => Array.from(clean(word).normalize('NFC').toUpperCase()).slice(0, 30);

export interface PennantInfo { ch: string; bg: string; fg: string; logo: boolean }
export function pennantList(spec: FGSpec, data: FGData, logo?: string): PennantInfo[] {
  const pal = fgPalette(spec.palette);
  const chars = buntingChars(data.word || '') ;
  const list = chars.length ? chars : [' '];
  const out: PennantInfo[] = [];
  const withLogo = !!logo && data.logoEnds !== '0';
  const all = withLogo ? ['\u0001', ...list, '\u0001'] : list;
  all.forEach((ch, i) => {
    const bg = pal.cycle[i % pal.cycle.length];
    const fg = contrastOn(bg, [pal.on, pal.ink, '#FFFFFF', '#151515', pal.alt]);
    out.push({ ch, bg, fg, logo: ch === '\u0001' });
  });
  return out;
}

// 1 lá cờ (toạ độ: x ∈ [0, W], y ∈ [-viền luồn, H]) — dùng chung cho xem phẳng, tờ in và texture 3D
export function PennantArt({ spec, info, logo, W, H, idp, sleeve = 0, bleed = 0, marks = false }: {
  spec: FGSpec; info: PennantInfo; logo?: string; W: number; H: number; idp: string; sleeve?: number; bleed?: number; marks?: boolean;
}) {
  const sh = pennantShape(spec.pennant, W, H);
  const f = fgFont(spec.font);
  const cy = spec.pennant === 'triangle' ? H * 0.27 : H * 0.34;
  let content: ReactNode = null;
  if (info.logo && logo) {
    const r = W * 0.26;
    content = (
      <g>
        <clipPath id={`${idp}-lg`}><circle cx={W / 2} cy={cy} r={r} /></clipPath>
        <circle cx={W / 2} cy={cy} r={r * 1.1} fill="#fff" />
        <image href={logo} x={W / 2 - r} y={cy - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${idp}-lg)`} />
      </g>
    );
  } else if (info.ch.trim() === '') {
    content = motifEl(spec.motif === 'none' || spec.motif === 'percent' ? 'stars' : spec.motif, W / 2, cy, W * 0.42, info.fg, 0, 'd', info.bg);
  } else {
    // co chữ cho vừa lòng tam giác: đáy chữ phải còn đủ bề ngang
    let s = W * 0.95;
    let m = meas(info.ch, f.family, f.weight, s);
    for (let i = 0; i < 30; i++) {
      const yb = cy + (m.asc + m.desc) / 2, yt = cy - (m.asc + m.desc) / 2;
      const half = spec.pennant === 'triangle' ? (W / 2) * (1 - yb / H) : yb < H * 0.72 ? W / 2 : (W / 2) * (1 - (yb - H * 0.72) / (H * 0.28));
      if (m.w / 2 <= half * 0.86 && yt >= H * 0.05 && m.w <= W * 0.8) break;
      s *= 0.97; m = meas(info.ch, f.family, f.weight, s);
    }
    content = <text x={W / 2} y={(cy + (m.asc - m.desc) / 2).toFixed(2)} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={s.toFixed(2)} fill={info.fg} data-role="letter">{info.ch}</text>;
  }
  const cutD = sleeve
    ? (spec.pennant === 'triangle' ? `M0 ${-sleeve} L${W} ${-sleeve} L${W} 0 L${W / 2} ${H} L0 0 Z` : `M0 ${-sleeve} L${W} ${-sleeve} L${W} ${H} L${W / 2} ${H * 0.72} L0 ${H} Z`)
    : sh.d;
  return (
    <g>
      <mask id={`${idp}-m`} maskUnits="userSpaceOnUse" x={-bleed - 10} y={-sleeve - bleed - 10} width={W + bleed * 2 + 20} height={H + sleeve + bleed * 2 + 20}>
        <path d={cutD} fill="#fff" stroke="#fff" strokeWidth={bleed * 2} strokeLinejoin="round" />
      </mask>
      <g mask={`url(#${idp}-m)`}>
        <rect x={-bleed - 5} y={-sleeve - bleed - 5} width={W + bleed * 2 + 10} height={H + sleeve + bleed * 2 + 10} fill={info.bg} />
        {/* viền mép trong nhẹ cho lá cờ có chiều sâu */}
        <path d={sh.d} fill="none" stroke={info.fg} strokeOpacity={0.18} strokeWidth={W * 0.03} transform={`translate(${W * 0.06} ${H * 0.04}) scale(0.88)`} />
      </g>
      {content}
      <path d={sh.d} fill="none" stroke="none" data-shape="1" />
      {marks && (
        <g fill="none">
          <g data-layer="CutContour"><path d={cutD} stroke="#E6007E" strokeWidth={0.8} /></g>
          {sleeve > 0 && <g data-layer="Fold"><path d={`M0 0 L${W} 0`} stroke="#00A0E9" strokeWidth={0.6} strokeDasharray="5 4" /></g>}
        </g>
      )}
    </g>
  );
}

/** 1 lá cờ dây đứng riêng (texture 3D / PNG) */
export function PennantSvg({ spec, info, logo, style }: { spec: FGSpec; info: PennantInfo; logo?: string; style?: CSSProperties }) {
  const id = uid(useId());
  const { w: W, h: H } = PENNANT_SIZES[spec.pSize];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-pennant="1">
      <PennantArt spec={spec} info={info} logo={logo} W={W} H={H} idp={id} />
    </svg>
  );
}

/** xem phẳng: dây cờ võng nhẹ giữa 2 đầu */
export function BuntingRow({ spec, data, logo, style, testid }: { spec: FGSpec; data: FGData; logo?: string; style?: CSSProperties; testid?: string }) {
  const id = uid(useId());
  const list = pennantList(spec, data, logo);
  const { w: W, h: H } = PENNANT_SIZES[spec.pSize];
  const gap = W * 0.18, m = W * 0.5;
  const span = list.length * W + (list.length - 1) * gap;
  const VW = span + m * 2;
  const sag = Math.min(span * 0.05, H * 0.6);
  const yAt = (x: number) => m * 0.6 + sag * 4 * (x / VW) * (1 - x / VW);
  const VH = H + sag + m * 1.2;
  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid}>
      <path d={Array.from({ length: 41 }, (_, i) => { const x = (i / 40) * VW; return `${i ? 'L' : 'M'}${x.toFixed(1)} ${yAt(x).toFixed(1)}`; }).join(' ')} fill="none" stroke="#8a8a8a" strokeWidth={W * 0.02} />
      {list.map((info, i) => {
        const x = m + i * (W + gap), xc = x + W / 2;
        const ang = (Math.atan2(yAt(x + W) - yAt(x), W) * 180) / Math.PI;
        return (
          <g key={i} transform={`translate(${x.toFixed(1)} ${yAt(xc).toFixed(1)}) rotate(${ang.toFixed(2)} ${W / 2} 0)`} data-pennant-i={i}>
            <PennantArt spec={spec} info={info} logo={logo} W={W} H={H} idp={`${id}-${i}`} />
          </g>
        );
      })}
    </svg>
  );
}

/** tờ in cờ dây: mỗi lá có viền luồn dây phía trên, lề xén 5mm, nét cắt + đường gấp */
export function buntingSheetSize(spec: FGSpec, data: FGData, logo?: string) {
  const n = pennantList(spec, data, logo).length;
  const { w: W, h: H } = PENNANT_SIZES[spec.pSize];
  const cols = Math.min(n, spec.pSize === 's' ? 7 : 5);
  const rows = Math.ceil(n / cols);
  return { n, cols, rows, wMm: cols * W + (cols - 1) * PENNANT_GAP, hMm: rows * (H + SLEEVE_PENNANT) + (rows - 1) * PENNANT_GAP };
}
export function BuntingSheet({ spec, data, logo, bleed = 5, style }: { spec: FGSpec; data: FGData; logo?: string; bleed?: number; style?: CSSProperties }) {
  const id = uid(useId());
  const list = pennantList(spec, data, logo);
  const { w: W, h: H } = PENNANT_SIZES[spec.pSize];
  const { cols, wMm, hMm } = buntingSheetSize(spec, data, logo);
  return (
    <svg viewBox={`${-bleed} ${-bleed} ${wMm + bleed * 2} ${hMm + bleed * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet="1">
      <rect x={-bleed} y={-bleed} width={wMm + bleed * 2} height={hMm + bleed * 2} fill="#fff" />
      {list.map((info, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        const x = c * (W + PENNANT_GAP), y = r * (H + SLEEVE_PENNANT + PENNANT_GAP) + SLEEVE_PENNANT;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <PennantArt spec={spec} info={info} logo={logo} W={W} H={H} idp={`${id}-${i}`} sleeve={SLEEVE_PENNANT} bleed={bleed} marks />
          </g>
        );
      })}
    </svg>
  );
}

// tên đặt in / file
export function fgTitle(spec: FGSpec): string {
  if (spec.kind === 'phuon') return `Cờ phướn ${spec.shape === 'teardrop' ? 'giọt nước' : 'lông vũ'} ${spec.height / 10}m`;
  if (spec.kind === 'hand') return `Cờ cầm tay ${HAND_SIZES[spec.hSize].name}`;
  return `Cờ dây ${spec.pennant === 'triangle' ? 'tam giác' : 'đuôi nheo'} ${PENNANT_SIZES[spec.pSize].name}`;
}
export const fgMaterial = (spec: FGSpec) => (spec.kind === 'phuon' ? 'Cờ phướn (cờ giọt nước) + chân đế' : spec.kind === 'bunting' ? 'Cờ dây tam giác' : 'Cờ đuôi nheo cầm tay');
// dpi in: cạnh dài file ≤ ~10.000px (vải in nhìn xa, dpi thấp là chuẩn)
export function fgDpi(wMm: number, hMm: number): number {
  return Math.max(40, Math.min(150, Math.floor(10000 / (Math.max(wMm, hMm) / 25.4))));
}
