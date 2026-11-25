'use client';
// Tranh canvas in ảnh: ảnh khách (chỉ xử lý trên máy) + bố cục (1 ảnh, ghép 2/3/4/6, ảnh + chữ, bộ 3 tấm)
// → căng khung gỗ. Đơn vị: mm. File in = mặt tranh + phần gấp mép (dày khung + chừa gấp ra sau) + vạch gấp.
// Mép tranh: tràn ảnh (ảnh chạy qua cạnh) · lật gương (soi gương dải mép) · màu trơn. Render code 100%, không AI.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ, khung, mép ----------
export interface CVSize { id: string; name: string; wMm: number; hMm: number }
export const CV_SIZES: CVSize[] = [
  { id: '20x30', name: '20×30', wMm: 200, hMm: 300 },
  { id: '30x40', name: '30×40', wMm: 300, hMm: 400 },
  { id: '40x60', name: '40×60', wMm: 400, hMm: 600 },
  { id: '50x70', name: '50×70', wMm: 500, hMm: 700 },
  { id: '60x90', name: '60×90', wMm: 600, hMm: 900 },
  { id: '30x30', name: '30×30 vuông', wMm: 300, hMm: 300 },
  { id: '50x50', name: '50×50 vuông', wMm: 500, hMm: 500 },
];
export const cvSize = (id: string) => CV_SIZES.find((s) => s.id === id) || CV_SIZES[2];
export const CV_DEPTHS = [20, 30] as const;
export const CV_FOLD_MM = 30;        // chừa gấp ra sau khung để bấm ghim
export const CV_MARK_MM = 12;        // lề trắng ngoài cùng của file in (đặt vạch gấp + ghi chú)
export const CV_TRIP_GAP = 40;       // khoảng cách treo giữa 3 tấm (mm) — ảnh coi như liền mạch qua khe
export type CVEdge = 'wrap' | 'mirror' | 'solid';
export const CV_EDGES: { id: CVEdge; name: string; hint: string }[] = [
  { id: 'mirror', name: 'Lật gương mép', hint: 'Giữ trọn ảnh ở mặt tranh, cạnh là ảnh soi gương' },
  { id: 'wrap', name: 'Ảnh tràn mép', hint: 'Ảnh chạy liền qua cạnh — mặt tranh mất 1 phần viền ảnh' },
  { id: 'solid', name: 'Màu trơn mép', hint: 'Cạnh sơn 1 màu, gọn gàng' },
];
export type CVEdgeTone = 'bg' | 'white' | 'black';

/** kích thước thật (đã xoay ngang nếu chọn) */
export function cvDims(spec: CVSpec) {
  const s = cvSize(spec.size);
  const land = spec.land && s.wMm !== s.hMm;
  return { W: land ? s.hMm : s.wMm, H: land ? s.wMm : s.hMm, D: spec.depth, wrap: spec.depth + CV_FOLD_MM, name: land ? s.name.split(' ')[0].split('×').reverse().join('×') : s.name.split(' ')[0] };
}

// ---------- font ----------
export interface CVFont { id: string; name: string; family: string; weight: number; italic?: boolean; script?: boolean }
export const CV_FONTS: CVFont[] = [
  { id: 'greatvibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400, script: true },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 600 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const cvFont = (id: string) => CV_FONTS.find((f) => f.id === id) || CV_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const CV_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:ital,wght@0,600;1,500&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

export function useCVFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cv-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-cv-fonts'; link.rel = 'stylesheet';
        link.href = CV_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CV_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `italic 500 40px "Cormorant Garamond"`, `600 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu (nền bố cục / dải chữ / khe ghép ảnh) ----------
export interface CVPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string }
export const CV_PALETTES: CVPalette[] = [
  { id: 'white', name: 'Trắng', bg: '#FFFFFF', ink: '#1F1D1A', sub: '#6B655C', accent: '#B08D57' },
  { id: 'cream', name: 'Kem', bg: '#F6F0E4', ink: '#3A2E22', sub: '#7D6B57', accent: '#B08D57' },
  { id: 'black', name: 'Đen', bg: '#141414', ink: '#F5F2EA', sub: '#B9B3A6', accent: '#C8A24A' },
  { id: 'blush', name: 'Hồng phấn', bg: '#F7E7E4', ink: '#5A2E33', sub: '#8C5E62', accent: '#C06C78' },
  { id: 'sage', name: 'Xanh rêu', bg: '#E8EEE4', ink: '#24372B', sub: '#56705C', accent: '#4C6B4F' },
  { id: 'navy', name: 'Navy', bg: '#1F2A44', ink: '#F3EFE6', sub: '#B8C0D4', accent: '#C8A24A' },
];
export const cvPalette = (id: string) => CV_PALETTES.find((p) => p.id === id) || CV_PALETTES[0];

// ---------- bố cục ----------
export type CVLayout = 'single' | 'grid2' | 'grid3' | 'grid4' | 'grid6' | 'couple' | 'quote' | 'family' | 'center' | 'triptych';
export const CV_LAYOUTS: { id: CVLayout; name: string; photos: number }[] = [
  { id: 'single', name: '1 ảnh', photos: 1 },
  { id: 'couple', name: 'Ảnh cưới + tên', photos: 1 },
  { id: 'family', name: 'Gia đình', photos: 1 },
  { id: 'quote', name: 'Ảnh + câu nói', photos: 1 },
  { id: 'center', name: 'Ảnh + tiêu đề', photos: 1 },
  { id: 'grid2', name: 'Ghép 2 ảnh', photos: 2 },
  { id: 'grid3', name: 'Ghép 3 ảnh', photos: 3 },
  { id: 'grid4', name: 'Ghép 4 ảnh', photos: 4 },
  { id: 'grid6', name: 'Ghép 6 ảnh', photos: 6 },
  { id: 'triptych', name: 'Bộ 3 tấm', photos: 1 },
];
export const cvLayout = (id: string) => CV_LAYOUTS.find((l) => l.id === id) || CV_LAYOUTS[0];
export const cvPanels = (layout: string) => (layout === 'triptych' ? 3 : 1);

export interface CVSpec { layout: CVLayout; palette: string; font: string; size: string; land: boolean; depth: 20 | 30; edge: CVEdge; edgeTone: CVEdgeTone }
export interface CVTemplate { id: string; name: string; sample: number; spec: Pick<CVSpec, 'layout' | 'palette' | 'font' | 'edge'> & { land?: boolean } }
export const CV_TEMPLATES: CVTemplate[] = [
  { id: 'single', name: 'Ảnh tràn khung', sample: 0, spec: { layout: 'single', palette: 'white', font: 'playfair', edge: 'mirror' } },
  { id: 'couple-cream', name: 'Ảnh cưới · kem', sample: 2, spec: { layout: 'couple', palette: 'cream', font: 'greatvibes', edge: 'solid' } },
  { id: 'couple-navy', name: 'Ảnh cưới · navy ngang', sample: 1, spec: { layout: 'couple', palette: 'navy', font: 'playfair', edge: 'solid', land: true } },
  { id: 'family-white', name: 'Gia đình là số 1', sample: 1, spec: { layout: 'family', palette: 'white', font: 'dancing', edge: 'solid' } },
  { id: 'family-blush', name: 'Gia đình · hồng', sample: 2, spec: { layout: 'family', palette: 'blush', font: 'greatvibes', edge: 'solid' } },
  { id: 'quote-black', name: 'Câu nói · đen', sample: 0, spec: { layout: 'quote', palette: 'black', font: 'cormorant', edge: 'mirror' } },
  { id: 'quote-sage', name: 'Câu nói · xanh rêu', sample: 2, spec: { layout: 'quote', palette: 'sage', font: 'playfair', edge: 'mirror' } },
  { id: 'center', name: 'Kỷ niệm chuyến đi', sample: 2, spec: { layout: 'center', palette: 'black', font: 'montserrat', edge: 'wrap', land: true } },
  { id: 'grid2', name: 'Ghép 2 ảnh', sample: 1, spec: { layout: 'grid2', palette: 'white', font: 'playfair', edge: 'solid', land: true } },
  { id: 'grid3', name: 'Ghép 3 ảnh · kem', sample: 0, spec: { layout: 'grid3', palette: 'cream', font: 'playfair', edge: 'solid' } },
  { id: 'grid4', name: 'Ghép 4 ảnh', sample: 0, spec: { layout: 'grid4', palette: 'white', font: 'playfair', edge: 'solid' } },
  { id: 'grid6', name: 'Ghép 6 ảnh · đen', sample: 0, spec: { layout: 'grid6', palette: 'black', font: 'playfair', edge: 'solid', land: true } },
  { id: 'triptych', name: 'Bộ 3 tấm liền ảnh', sample: 3, spec: { layout: 'triptych', palette: 'white', font: 'playfair', edge: 'wrap' } },
];

// ---------- chữ ----------
export type CVData = Record<string, string>;
export interface CVField { key: string; label: string; ph?: string; multiline?: boolean; layouts: CVLayout[] }
export const CV_FIELDS: CVField[] = [
  { key: 'title', label: 'Dòng chính', ph: 'Quốc Bảo & Thu Hà', layouts: ['couple', 'family', 'center'] },
  { key: 'sub', label: 'Dòng phụ / ngày', ph: '12 · 12 · 2026', layouts: ['couple', 'family', 'center'] },
  { key: 'quote', label: 'Câu nói', ph: 'Hạnh phúc là được đi cùng nhau…', multiline: true, layouts: ['quote'] },
  { key: 'small', label: 'Dòng nhỏ', ph: '— Gia đình nhỏ', layouts: ['couple', 'quote'] },
];
export const CV_SAMPLES: Record<string, CVData> = {
  couple: { title: 'Quốc Bảo & Thu Hà', sub: '12 · 12 · 2026', small: 'Mãi bên nhau' },
  family: { title: 'Gia đình là số 1', sub: 'Nhà Quốc Bảo · 2026' },
  quote: { quote: 'Hạnh phúc là được đi cùng nhau trên mọi con đường', small: '— Gia đình nhỏ' },
  center: { title: 'Đà Lạt mùa hoa', sub: 'Kỷ niệm 2026' },
};
export const defaultCVData = (): CVData => ({ ...CV_SAMPLES.couple, ...CV_SAMPLES.family, ...CV_SAMPLES.quote, title: CV_SAMPLES.couple.title, sub: CV_SAMPLES.couple.sub, small: CV_SAMPLES.couple.small });

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
/** cỡ chữ vừa khung có tính giãn chữ (letterSpacing = k × cỡ chữ) */
const fitLS = (t: string, maxW: number, size: number, fam: string, wt: number | string, k: number) => {
  const n = Math.max(0, [...(t || '')].length - 1);
  const w = textW(t, size, fam, wt) + size * k * n;
  return w > maxW ? (size * maxW) / w : size;
};
function wrapLines(text: string, maxW: number, size: number, fam: string, wt: number | string, italic = false): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const out: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && textW(t, size, fam, wt, italic) > maxW) { out.push(cur); cur = w; } else cur = t;
  }
  if (cur) out.push(cur);
  return out;
}
/** chữ nhiều dòng tự thu nhỏ cho vừa khung (rộng maxW, tối đa maxLines dòng, cao ≤ maxH) */
function fitBlock(text: string, maxW: number, maxH: number, size: number, maxLines: number, fam: string, wt: number | string, italic = false, lh = 1.25) {
  let s = size;
  for (let k = 0; k < 40; k++) {
    const lines = wrapLines(text, maxW, s, fam, wt, italic);
    const wide = Math.max(0, ...lines.map((l) => textW(l, s, fam, wt, italic)));
    if (lines.length <= maxLines && lines.length * s * lh <= maxH && wide <= maxW + 0.01) return { lines, size: s };
    s *= 0.93;
  }
  return { lines: wrapLines(text, maxW, s, fam, wt, italic), size: s };
}

// ---------- ảnh ----------
export interface CVPhoto { src: string; w: number; h: number; zoom: number; px: number; py: number; sample?: boolean; name?: string }
interface Rect { x: number; y: number; w: number; h: number }

/** đặt ảnh phủ kín ô (cover) + zoom + kéo (px,py ∈ [-1,1]) */
export function coverRect(slot: Rect, p: Pick<CVPhoto, 'w' | 'h' | 'zoom' | 'px' | 'py'>): Rect {
  const base = Math.max(slot.w / p.w, slot.h / p.h) * Math.max(1, p.zoom || 1);
  const iw = p.w * base, ih = p.h * base;
  const ox = iw - slot.w, oy = ih - slot.h;
  return { x: slot.x - ox * ((p.px || 0) + 1) / 2, y: slot.y - oy * ((p.py || 0) + 1) / 2, w: iw, h: ih };
}
/** độ phân giải in thực tế của ảnh trong ô (dpi) */
export const photoDpi = (slot: Rect, p: CVPhoto) => 25.4 / (Math.max(slot.w / p.w, slot.h / p.h) * Math.max(1, p.zoom || 1));

// ô ảnh theo bố cục (toạ độ mặt tranh). Bộ 3 tấm: 1 ô ảo trải qua 3 tấm + 2 khe.
export function photoSlots(layout: CVLayout, W: number, H: number): Rect[] {
  const g = Math.round(Math.min(W, H) * 0.022 * 10) / 10;
  const land = W > H;
  switch (layout) {
    case 'single': case 'quote': case 'center': return [{ x: 0, y: 0, w: W, h: H }];
    case 'triptych': return [{ x: 0, y: 0, w: W * 3 + CV_TRIP_GAP * 2, h: H }];
    case 'couple': return land ? [{ x: 0, y: 0, w: W * 0.62, h: H }] : [{ x: 0, y: 0, w: W, h: H * 0.74 }];
    case 'family': {
      const m = Math.min(W, H) * 0.07;
      return [{ x: m, y: m, w: W - m * 2, h: H * 0.79 - m }];
    }
    case 'grid2': return land
      ? [{ x: 0, y: 0, w: (W - g) / 2, h: H }, { x: (W + g) / 2, y: 0, w: (W - g) / 2, h: H }]
      : [{ x: 0, y: 0, w: W, h: (H - g) / 2 }, { x: 0, y: (H + g) / 2, w: W, h: (H - g) / 2 }];
    case 'grid3': return land
      ? [{ x: 0, y: 0, w: (W - g) * 0.62, h: H }, { x: (W - g) * 0.62 + g, y: 0, w: (W - g) * 0.38, h: (H - g) / 2 }, { x: (W - g) * 0.62 + g, y: (H + g) / 2, w: (W - g) * 0.38, h: (H - g) / 2 }]
      : [{ x: 0, y: 0, w: W, h: (H - g) * 0.62 }, { x: 0, y: (H - g) * 0.62 + g, w: (W - g) / 2, h: (H - g) * 0.38 }, { x: (W + g) / 2, y: (H - g) * 0.62 + g, w: (W - g) / 2, h: (H - g) * 0.38 }];
    case 'grid4': {
      const cw = (W - g) / 2, ch = (H - g) / 2;
      return [0, 1, 2, 3].map((i) => ({ x: (i % 2) * (cw + g), y: Math.floor(i / 2) * (ch + g), w: cw, h: ch }));
    }
    case 'grid6': {
      const cols = land ? 3 : 2, rows = land ? 2 : 3;
      const cw = (W - g * (cols - 1)) / cols, ch = (H - g * (rows - 1)) / rows;
      return Array.from({ length: 6 }, (_, i) => ({ x: (i % cols) * (cw + g), y: Math.floor(i / cols) * (ch + g), w: cw, h: ch }));
    }
  }
}

// ô chạm mép mặt tranh → nới ra phần mép (khi "ảnh tràn mép") để ảnh chạy liền qua cạnh
function extend(r: Rect, W: number, H: number, e: number): Rect {
  if (!e) return r;
  const eps = 0.01;
  let { x, y, w, h } = r;
  if (x <= eps) { x -= e; w += e; }
  if (y <= eps) { y -= e; h += e; }
  if (r.x + r.w >= W - eps) w += e;
  if (r.y + r.h >= H - eps) h += e;
  return { x, y, w, h };
}

/** dpi thấp nhất của từng ảnh (theo khổ đang chọn) — cảnh báo ảnh mờ */
export function photoDpis(spec: CVSpec, photos: CVPhoto[]): number[] {
  const { W, H, wrap } = cvDims(spec);
  const e = spec.edge === 'wrap' ? wrap : 0;
  return photoSlots(spec.layout, W, H).map((s, i) => {
    const p = photos[i]; if (!p) return 0;
    const slot = spec.layout === 'triptych' ? { x: -e, y: -e, w: s.w + e * 2, h: s.h + e * 2 } : extend(s, W, H, e);
    return photoDpi(slot, p);
  });
}

// ---------- ảnh minh hoạ vẽ bằng code (để mẫu đẹp trước khi khách tải ảnh) ----------
let samplesCache: CVPhoto[] | null = null;
function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
function drawSample(kind: number): string {
  const W = 1600, H = 1200;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const r = rnd(97 + kind * 31);
  const ridge = (base: number, amp: number, col: string, f: number, ph: number) => {
    x.beginPath(); x.moveTo(0, H);
    for (let i = 0; i <= W; i += 8) x.lineTo(i, base + Math.sin(i * f + ph) * amp + Math.sin(i * f * 2.7 + ph * 1.7) * amp * 0.35 + Math.sin(i * f * 7.3 + ph) * amp * 0.08);
    x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill();
  };
  if (kind === 0) { // hoàng hôn núi + hồ
    const sky = x.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, '#5E5A9C'); sky.addColorStop(0.45, '#D98B8B'); sky.addColorStop(1, '#F6C58C');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    const sun = x.createRadialGradient(W * 0.62, H * 0.5, 0, W * 0.62, H * 0.5, 260);
    sun.addColorStop(0, 'rgba(255,244,214,1)'); sun.addColorStop(0.25, 'rgba(255,226,170,0.9)'); sun.addColorStop(1, 'rgba(255,200,140,0)');
    x.fillStyle = sun; x.fillRect(0, 0, W, H);
    ridge(H * 0.47, 55, '#9C6F8E', 0.004, 1.2);
    ridge(H * 0.53, 45, '#6F4E78', 0.006, 3.1);
    ridge(H * 0.59, 30, '#43345A', 0.009, 0.4);
    const lake = x.createLinearGradient(0, H * 0.62, 0, H);
    lake.addColorStop(0, '#E7B08C'); lake.addColorStop(1, '#4C3E66');
    x.fillStyle = lake; x.fillRect(0, H * 0.62, W, H * 0.38);
    for (let i = 0; i < 70; i++) { x.fillStyle = `rgba(255,236,200,${0.15 + r() * 0.35})`; x.fillRect(W * 0.62 - 120 + r() * 240 - i, H * 0.64 + i * 5, 40 + r() * 140, 2); }
  } else if (kind === 1) { // biển
    const sky = x.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, '#5FA8D3'); sky.addColorStop(1, '#D9EEF5');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) { const cx = r() * W, cy = 80 + r() * 300; const cl = x.createRadialGradient(cx, cy, 0, cx, cy, 160 + r() * 120); cl.addColorStop(0, 'rgba(255,255,255,0.75)'); cl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = cl; x.fillRect(0, 0, W, H); }
    ridge(H * 0.53, 14, '#6E9AAE', 0.01, 2);
    const sea = x.createLinearGradient(0, H * 0.55, 0, H * 0.8);
    sea.addColorStop(0, '#1F7AA0'); sea.addColorStop(1, '#3FB6C2');
    x.fillStyle = sea; x.fillRect(0, H * 0.55, W, H * 0.3);
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(255,255,255,${0.12 + r() * 0.3})`; x.fillRect(r() * W, H * 0.56 + r() * H * 0.26, 20 + r() * 80, 2); }
    const sand = x.createLinearGradient(0, H * 0.78, 0, H);
    sand.addColorStop(0, '#F1DDB8'); sand.addColorStop(1, '#E2C08F');
    x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 10) x.lineTo(i, H * 0.8 + Math.sin(i * 0.004 + 1) * 30); x.lineTo(W, H); x.closePath(); x.fillStyle = sand; x.fill();
    x.strokeStyle = 'rgba(255,255,255,0.85)'; x.lineWidth = 6;
    x.beginPath(); for (let i = 0; i <= W; i += 10) { const yy = H * 0.8 + Math.sin(i * 0.004 + 1) * 30 - 6 + Math.sin(i * 0.03) * 4; if (i === 0) x.moveTo(i, yy); else x.lineTo(i, yy); } x.stroke();
  } else if (kind === 2) { // đồi hoa
    const sky = x.createLinearGradient(0, 0, 0, H * 0.5);
    sky.addColorStop(0, '#F3D9E4'); sky.addColorStop(1, '#FBF1E8');
    x.fillStyle = sky; x.fillRect(0, 0, W, H);
    ridge(H * 0.42, 50, '#B9C9A7', 0.004, 0.5);
    ridge(H * 0.52, 40, '#8FAE7C', 0.006, 2.4);
    ridge(H * 0.62, 34, '#6E9A62', 0.005, 4.1);
    for (let i = 0; i < 2600; i++) {
      const yy = H * 0.5 + Math.pow(r(), 0.7) * H * 0.5, s = 2 + ((yy - H * 0.5) / (H * 0.5)) * 9;
      x.fillStyle = ['#F2A7C3', '#F7C6D7', '#E77FA6', '#FFFFFF', '#F9D7A8'][Math.floor(r() * 5)];
      x.globalAlpha = 0.85; x.beginPath(); x.arc(r() * W, yy, s, 0, Math.PI * 2); x.fill();
    }
    x.globalAlpha = 1;
  } else { // trừu tượng loang màu
    x.fillStyle = '#F3EDE3'; x.fillRect(0, 0, W, H);
    const cols = ['#C8A24A', '#2F6F73', '#D98B7E', '#1F2A44', '#E8C9A0', '#7FA5A1'];
    x.filter = 'blur(60px)';
    for (let i = 0; i < 14; i++) { x.fillStyle = cols[i % cols.length]; x.globalAlpha = 0.55 + r() * 0.35; x.beginPath(); x.ellipse(r() * W, r() * H, 120 + r() * 260, 90 + r() * 200, r() * 3, 0, Math.PI * 2); x.fill(); }
    x.filter = 'none'; x.globalAlpha = 1;
    x.strokeStyle = 'rgba(200,162,74,0.8)'; x.lineWidth = 5;
    for (let k = 0; k < 3; k++) { x.beginPath(); for (let i = 0; i <= W; i += 10) { const yy = H * (0.35 + k * 0.17) + Math.sin(i * 0.005 + k) * 70; if (i === 0) x.moveTo(i, yy); else x.lineTo(i, yy); } x.stroke(); }
  }
  // hạt + tối góc nhẹ cho giống ảnh chụp
  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.1)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
  return c.toDataURL('image/jpeg', 0.86);
}
export const SAMPLE_NAMES = ['Hoàng hôn', 'Biển', 'Đồi hoa', 'Loang màu'];
/** ảnh mẫu cho từng mẫu (ô nào còn là ảnh mẫu thì đổi theo mẫu; ảnh khách tải lên giữ nguyên) */
export function withSamples(photos: CVPhoto[], k: number): CVPhoto[] {
  const sp = samplePhotos();
  return photos.map((p, i) => (p.sample ? { ...sp[(i + k) % sp.length] } : p));
}
export function samplePhotos(): CVPhoto[] {
  if (!samplesCache) {
    const base = [0, 1, 2, 3].map((k) => ({ src: drawSample(k), w: 1600, h: 1200, zoom: 1, px: 0, py: 0, sample: true, name: SAMPLE_NAMES[k] }));
    // 6 ô ghép: lặp lại nhưng khác vùng cắt cho đỡ trùng
    samplesCache = [base[0], base[1], base[2], base[3], { ...base[0], zoom: 1.6, px: 0.7, py: 0.2 }, { ...base[2], zoom: 1.5, px: -0.6, py: 0.5 }];
  }
  return samplesCache;
}

// ---------- vẽ ----------
export type CVMode = 'face' | 'tex' | 'print';
const f1 = (n: number) => Math.round(n * 100) / 100;

/**
 * face  = mặt tranh (xem trước, thumbnail)
 * tex   = mặt + 4 cạnh dày khung (trải phẳng) — texture 3D
 * print = file in: mặt + phần gấp mép (dày khung + chừa gấp) + lề trắng có vạch gấp
 */
export function CanvasSvg({ spec, data, photos, mode = 'face', panel = 0, style }: {
  spec: CVSpec; data: CVData; photos: CVPhoto[]; mode?: CVMode; panel?: number; style?: CSSProperties;
}) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = `cv${rid}`;
  const { W, H, D, wrap } = cvDims(spec);
  const pal = cvPalette(spec.palette);
  const font = cvFont(spec.font);
  const disp = `"${font.family}"`;
  const outer = mode === 'face' ? 0 : mode === 'tex' ? D : wrap;    // phần mép hiện trong file
  // nới ô ảnh khi tràn mép; lật gương / màu trơn vẫn nới 1mm để mép mặt tranh không lộ vệt khử răng cưa (nền tối lẫn vào)
  const E = spec.edge === 'wrap' ? outer : mode === 'face' ? 0 : 1;
  const tri = spec.layout === 'triptych';
  const offX = tri ? panel * (W + CV_TRIP_GAP) : 0;
  const slots = photoSlots(spec.layout, W, H);
  const edgeFill = spec.edgeTone === 'white' ? '#FFFFFF' : spec.edgeTone === 'black' ? '#141414' : pal.bg;

  // ---- nội dung mặt tranh ----
  const defs: ReactNode[] = [];
  const photoEls = slots.map((s0, i) => {
    const p = photos[i] || photos[0];
    const s = tri
      ? { x: s0.x - offX - (panel === 0 ? E : 0), y: -E, w: s0.w + (panel === 0 ? E : 0) + (panel === 2 ? E : 0), h: s0.h + E * 2 }
      : extend(s0, W, H, E);
    if (!p) return null;
    const ir = coverRect(s, p);
    defs.push(<clipPath key={`c${i}`} id={`${u}-c${i}`}><rect x={f1(s.x)} y={f1(s.y)} width={f1(s.w)} height={f1(s.h)} /></clipPath>);
    return (
      <g key={i} clipPath={`url(#${u}-c${i})`}>
        <image href={p.src} x={f1(ir.x)} y={f1(ir.y)} width={f1(ir.w)} height={f1(ir.h)} preserveAspectRatio="none" />
      </g>
    );
  });

  const t = (k: string) => (data[k] ?? '').trim();
  const min = Math.min(W, H);
  let texts: ReactNode = null;
  // nền: chỉ tràn ra ngoài khi 'tràn mép' (lật gương/màu trơn mà tràn sẽ in 1 vệt nền lên mép soi gương)
  const ov = spec.edge === 'wrap' && E ? 0.5 : 0;
  const bgRect = <rect x={-E - ov} y={-E - ov} width={W + (E + ov) * 2} height={H + (E + ov) * 2} fill={pal.bg} />;

  if (spec.layout === 'couple') {
    const land = W > H;
    const box = land ? { x: W * 0.62, y: 0, w: W * 0.38, h: H } : { x: 0, y: H * 0.74, w: W, h: H * 0.26 };
    const cx = box.x + box.w / 2;
    const tw = box.w * 0.84;
    const names = t('title');
    const nameSize = font.script ? fitBlock(names, tw, box.h * (land ? 0.42 : 0.44), min * (land ? 0.11 : 0.1), land ? 3 : 2, font.family, font.weight, false, 1.2) : fitBlock(names, tw, box.h * 0.42, min * 0.075, land ? 3 : 2, font.family, font.weight, false, 1.15);
    const lh = nameSize.size * (font.script ? 1.2 : 1.15);
    const subS = fitLS(t('sub'), tw, min * 0.032, BODY, 600, 0.12);
    const smallS = fitLS(t('small').toUpperCase(), tw, min * 0.024, BODY, 600, 0.2);
    // xếp dọc tính trước (chữ viết tay có nét lên/xuống dài): tên → vạch → ngày → dòng nhỏ, canh giữa dải chữ
    const nl = nameSize.lines.length, ns = nameSize.size;
    const namesH = ns * 0.92 + (nl - 1) * lh + ns * 0.34;
    const subH = t('sub') ? subS * 0.7 + subS * 1.45 + subS * 0.3 : 0;
    const smallH = t('small') ? smallS * 2.1 : 0;
    const start = box.y + (box.h - (namesH + subH + smallH)) / 2;
    const base0 = start + ns * 0.92;
    const namesBot = start + namesH;
    const divY = namesBot + subS * 0.7;
    const subY = divY + subS * 1.45;
    const smallY = (t('sub') ? subY + subS * 0.3 : namesBot) + smallS * 1.75;
    texts = (
      <g textAnchor="middle">
        {nameSize.lines.map((ln, i) => <text key={i} x={f1(cx)} y={f1(base0 + i * lh)} fontFamily={disp} fontWeight={font.weight} fontSize={f1(ns)} fill={pal.ink}>{ln}</text>)}
        {t('sub') && <>
          <line x1={f1(cx - tw * 0.18)} x2={f1(cx + tw * 0.18)} y1={f1(divY)} y2={f1(divY)} stroke={pal.accent} strokeWidth={f1(min * 0.0018)} />
          <text x={f1(cx)} y={f1(subY)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(subS)} fill={pal.sub} letterSpacing={f1(subS * 0.12)}>{t('sub')}</text>
        </>}
        {t('small') && <text x={f1(cx)} y={f1(smallY)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(smallS)} fill={pal.accent} letterSpacing={f1(smallS * 0.2)}>{t('small').toUpperCase()}</text>}
      </g>
    );
  } else if (spec.layout === 'family') {
    const m = min * 0.07;
    const top = H * 0.79, cx = W / 2, tw = W - m * 2.4;
    const ts = fitBlock(t('title'), tw, (H - top) * 0.55, min * (font.script ? 0.1 : 0.07), 1, font.family, font.weight);
    const ss = fitLS(t('sub').toUpperCase(), tw, min * 0.028, BODY, 600, 0.14);
    const blockH = ts.size + (t('sub') ? ss * 1.9 : 0);
    const y0 = top + (H - top - blockH) / 2 + ts.size * 0.8;
    texts = (
      <g textAnchor="middle">
        <text x={f1(cx)} y={f1(y0)} fontFamily={disp} fontWeight={font.weight} fontSize={f1(ts.size)} fill={pal.ink}>{ts.lines[0] || ''}</text>
        {t('sub') && <text x={f1(cx)} y={f1(y0 + ss * 1.9)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(ss)} fill={pal.sub} letterSpacing={f1(ss * 0.14)}>{t('sub').toUpperCase()}</text>}
      </g>
    );
  } else if (spec.layout === 'quote') {
    const pad = min * 0.09, tw = W - pad * 2;
    const it = spec.font === 'cormorant';
    const qs = fitBlock(t('quote'), tw, H * 0.3, min * 0.075, 4, font.family, it ? 500 : font.weight, it, 1.22);
    const lh = qs.size * 1.22;
    const sm = fitLS(t('small'), tw, min * 0.026, BODY, 600, 0.15);
    const blockH = qs.lines.length * lh + (t('small') ? sm * 2.4 : 0);
    const yb = H - pad * 0.9;
    const y0 = yb - blockH + qs.size * 0.85;
    defs.push(
      <linearGradient key="qg" id={`${u}-qg`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={pal.bg} stopOpacity={0} />
        <stop offset="0.55" stopColor={pal.bg} stopOpacity={0.62} />
        <stop offset="1" stopColor={pal.bg} stopOpacity={0.9} />
      </linearGradient>,
    );
    const gTop = Math.max(0, y0 - qs.size * 2.2);
    texts = (
      <>
        <rect x={-E - ov} y={f1(gTop)} width={W + (E + ov) * 2} height={f1(H - gTop + E + ov)} fill={`url(#${u}-qg)`} />
        <g textAnchor="middle">
          {qs.lines.map((ln, i) => <text key={i} x={f1(W / 2)} y={f1(y0 + i * lh)} fontFamily={disp} fontWeight={it ? 500 : font.weight} fontStyle={it ? 'italic' : undefined} fontSize={f1(qs.size)} fill={pal.ink}>{ln}</text>)}
          {t('small') && <text x={f1(W / 2)} y={f1(y0 + (qs.lines.length - 1) * lh + sm * 2.4)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(sm)} fill={pal.accent} letterSpacing={f1(sm * 0.15)}>{t('small')}</text>}
        </g>
      </>
    );
  } else if (spec.layout === 'center') {
    const tw = W * 0.78;
    const ts = fitBlock(t('title').toUpperCase(), tw * 0.95, H * 0.22, min * 0.1, 2, font.family, font.weight, false, 1.1);
    const lh = ts.size * 1.1;
    const ss = fitLS(t('sub').toUpperCase(), tw, min * 0.03, BODY, 600, 0.25);
    const bandH = ts.lines.length * lh + (t('sub') ? ss * 2.6 : 0) + min * 0.08;
    const by = (H - bandH) / 2;
    texts = (
      <>
        <rect x={-E - ov} y={f1(by)} width={W + (E + ov) * 2} height={f1(bandH)} fill={pal.bg} opacity={0.55} />
        <g textAnchor="middle">
          {ts.lines.map((ln, i) => <text key={i} x={f1(W / 2)} y={f1(by + min * 0.04 + ts.size * 0.82 + i * lh)} fontFamily={disp} fontWeight={font.weight} fontSize={f1(ts.size)} fill={pal.ink} letterSpacing={f1(ts.size * 0.04)}>{ln}</text>)}
          {t('sub') && <text x={f1(W / 2)} y={f1(by + min * 0.04 + ts.size * 0.82 + (ts.lines.length - 1) * lh + ss * 2.2)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(ss)} fill={pal.accent} letterSpacing={f1(ss * 0.25)}>{t('sub').toUpperCase()}</text>}
        </g>
      </>
    );
  }

  const face = (
    <g data-face="1">
      {bgRect}
      {photoEls}
      {texts}
    </g>
  );

  // ---- dựng theo chế độ ----
  const vb = mode === 'face'
    ? `0 0 ${W} ${H}`
    : mode === 'tex'
      ? `${-D} ${-D} ${W + D * 2} ${H + D * 2}`
      : `${-wrap - CV_MARK_MM} ${-wrap - CV_MARK_MM} ${W + (wrap + CV_MARK_MM) * 2} ${H + (wrap + CV_MARK_MM) * 2}`;

  let body: ReactNode;
  if (mode === 'face' || spec.edge === 'wrap') body = face;
  else if (spec.edge === 'solid') {
    body = <><rect x={-outer} y={-outer} width={W + outer * 2} height={H + outer * 2} fill={edgeFill} />{face}</>;
  } else {
    // lật gương: dải mép = mặt tranh soi gương qua từng cạnh (góc soi 2 chiều)
    const strips: { k: string; clip: Rect; tf: string }[] = [
      { k: 'l', clip: { x: -outer, y: 0, w: outer, h: H }, tf: 'scale(-1 1)' },
      { k: 'r', clip: { x: W, y: 0, w: outer, h: H }, tf: `translate(${2 * W} 0) scale(-1 1)` },
      { k: 't', clip: { x: 0, y: -outer, w: W, h: outer }, tf: 'scale(1 -1)' },
      { k: 'b', clip: { x: 0, y: H, w: W, h: outer }, tf: `translate(0 ${2 * H}) scale(1 -1)` },
      { k: 'tl', clip: { x: -outer, y: -outer, w: outer, h: outer }, tf: 'scale(-1 -1)' },
      { k: 'tr', clip: { x: W, y: -outer, w: outer, h: outer }, tf: `translate(${2 * W} 0) scale(-1 -1)` },
      { k: 'bl', clip: { x: -outer, y: H, w: outer, h: outer }, tf: `translate(0 ${2 * H}) scale(-1 -1)` },
      { k: 'br', clip: { x: W, y: H, w: outer, h: outer }, tf: `translate(${2 * W} ${2 * H}) scale(-1 -1)` },
    ];
    for (const s of strips) defs.push(<clipPath key={`m${s.k}`} id={`${u}-m${s.k}`}><rect x={f1(s.clip.x - 0.2)} y={f1(s.clip.y - 0.2)} width={f1(s.clip.w + 0.4)} height={f1(s.clip.h + 0.4)} /></clipPath>);
    // dải soi gương vẽ trước (lấn 0.2mm vào trong cho khỏi hở), mặt tranh vẽ đè lên sau
    body = (
      <>
        <defs><g id={`${u}-face`}>{face}</g></defs>
        {strips.map((s) => <g key={s.k} clipPath={`url(#${u}-m${s.k})`}><use href={`#${u}-face`} transform={s.tf} /></g>)}
        <use href={`#${u}-face`} />
      </>
    );
  }

  // vạch gấp + ghi chú ở lề trắng file in
  let marks: ReactNode = null;
  if (mode === 'print') {
    const o = wrap + CV_MARK_MM, L = CV_MARK_MM * 0.8, sw = 0.35;
    const ticks: ReactNode[] = [];
    const vx = [0, W, -D, W + D], hy = [0, H, -D, H + D];
    vx.forEach((x, i) => {
      const dash = i >= 2 ? '1.2 0.8' : undefined;
      ticks.push(<line key={`vt${i}`} x1={x} x2={x} y1={-o} y2={-o + L} stroke="#000" strokeWidth={sw} strokeDasharray={dash} />);
      ticks.push(<line key={`vb${i}`} x1={x} x2={x} y1={H + o} y2={H + o - L} stroke="#000" strokeWidth={sw} strokeDasharray={dash} />);
    });
    hy.forEach((y, i) => {
      const dash = i >= 2 ? '1.2 0.8' : undefined;
      ticks.push(<line key={`hl${i}`} y1={y} y2={y} x1={-o} x2={-o + L} stroke="#000" strokeWidth={sw} strokeDasharray={dash} />);
      ticks.push(<line key={`hr${i}`} y1={y} y2={y} x1={W + o} x2={W + o - L} stroke="#000" strokeWidth={sw} strokeDasharray={dash} />);
    });
    // góc: vạch chéo gợi ý gấp góc kiểu "bệnh viện" (hospital fold)
    const cn = [[0, 0, -1, -1], [W, 0, 1, -1], [0, H, -1, 1], [W, H, 1, 1]] as const;
    cn.forEach(([x, y, sx, sy], i) => ticks.push(<line key={`cd${i}`} x1={x} y1={y} x2={x + sx * D} y2={y + sy * D} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={sw} strokeDasharray="1.5 1" />));
    const fs = Math.max(3.2, Math.min(6, W * 0.012));
    const sz = cvDims(spec);
    marks = (
      <g>
        <rect x={-wrap - 0.15} y={-wrap - 0.15} width={W + wrap * 2 + 0.3} height={H + wrap * 2 + 0.3} fill="none" stroke="#000" strokeWidth={0.25} strokeOpacity={0.5} />
        {ticks}
        <text x={-wrap} y={H + wrap + CV_MARK_MM * 0.72} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill="#333">
          {`Mivy · Tranh canvas ${sz.name} cm${tri ? ` · tấm ${panel + 1}/3` : ''} · khung dày ${D / 10} cm · chừa gấp ${CV_FOLD_MM / 10} cm · vạch liền = mép mặt tranh, vạch đứt = mép sau khung`}
        </text>
      </g>
    );
  }

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-cv-mode={mode}>
      <defs>{defs}</defs>
      {mode === 'print' && <rect x={-wrap - CV_MARK_MM} y={-wrap - CV_MARK_MM} width={W + (wrap + CV_MARK_MM) * 2} height={H + (wrap + CV_MARK_MM) * 2} fill="#FFFFFF" />}
      {mode === 'print'
        ? <><clipPath id={`${u}-pc`}><rect x={-wrap} y={-wrap} width={W + wrap * 2} height={H + wrap * 2} /></clipPath><g clipPath={`url(#${u}-pc)`}>{body}</g></>
        : body}
      {marks}
    </svg>
  );
}

/** kích thước file in 1 tấm (mm) */
export function cvPrintDims(spec: CVSpec) {
  const { W, H, wrap } = cvDims(spec);
  return { wMm: W + (wrap + CV_MARK_MM) * 2, hMm: H + (wrap + CV_MARK_MM) * 2 };
}
