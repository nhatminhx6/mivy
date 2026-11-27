'use client';
// Thùng carton in logo: 2 kiểu — thùng RSC (A1, 4 thành + 8 tai, gáy dán) và hộp nắp gài e-commerce (mailer, sóng E).
// Thùng carton in FLEXO 1–2 màu mực trên giấy kraft/trắng (giấy không phải mực, chữ "khoét" lộ giấy bằng mask);
// riêng mailer cho in đủ màu mặt ngoài + 1 màu mặt trong nắp ("Cảm ơn bạn đã mua hàng!").
// Mỗi mặt in = 1 Art (đơn vị mm) dùng chung cho file in (SVG) và texture 3D (canvas). Khuôn bế dựng từ các tấm:
// cạnh thuộc 1 tấm = CẮT, cạnh chung 2 tấm = GẤP → xuất SVG/PDF lớp In / CutContour / Fold. Render code 100%, 0 AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ======================= kiểu thùng, khổ, sóng =======================
export type CtStyle = 'rsc' | 'mailer';
export const CT_STYLES: { id: CtStyle; name: string; sub: string }[] = [
  { id: 'rsc', name: 'Thùng carton RSC', sub: 'thùng 4 thành, 8 tai — ship hàng, kho' },
  { id: 'mailer', name: 'Hộp nắp gài e-commerce', sub: 'hộp mailer sóng E — mở hộp đẹp' },
];
export interface CtSize { id: string; style: CtStyle; name: string; l: number; w: number; h: number }
export const CT_SIZES: CtSize[] = [
  { id: 'r302015', style: 'rsc', name: '30×20×15 cm', l: 300, w: 200, h: 150 },
  { id: 'r403030', style: 'rsc', name: '40×30×30 cm', l: 400, w: 300, h: 300 },
  { id: 'r604040', style: 'rsc', name: '60×40×40 cm', l: 600, w: 400, h: 400 },
  { id: 'm20157', style: 'mailer', name: '20×15×7 cm', l: 200, w: 150, h: 70 },
  { id: 'm252010', style: 'mailer', name: '25×20×10 cm', l: 250, w: 200, h: 100 },
  { id: 'm302510', style: 'mailer', name: '30×25×10 cm', l: 300, w: 250, h: 100 },
];
export const ctSize = (id: string) => CT_SIZES.find((s) => s.id === id) || CT_SIZES[0];
export const ctSizesFor = (st: CtStyle) => CT_SIZES.filter((s) => s.style === st);

export interface CtFlute { id: string; name: string; t: number; style: CtStyle }
export const CT_FLUTES: CtFlute[] = [
  { id: 'b3', name: '3 lớp sóng B', t: 3, style: 'rsc' },
  { id: 'c3', name: '3 lớp sóng C', t: 4, style: 'rsc' },
  { id: 'bc5', name: '5 lớp sóng BC', t: 7, style: 'rsc' },
  { id: 'e3', name: 'Sóng E (1,5mm)', t: 1.5, style: 'mailer' },
];
export const ctFlute = (id: string) => CT_FLUTES.find((f) => f.id === id) || CT_FLUTES[0];

export type CtBoard = 'kraft' | 'white';
export const CT_BOARDS: { id: CtBoard; name: string; hex: string }[] = [
  { id: 'kraft', name: 'Giấy kraft (nâu)', hex: '#B98D5E' },
  { id: 'white', name: 'Giấy trắng', hex: '#F4F2EC' },
];
export const KRAFT = '#B98D5E';
export const WHITE_BOARD = '#F4F2EC';
export const boardHex = (b: CtBoard) => (b === 'kraft' ? KRAFT : WHITE_BOARD);

// mực flexo (màu pha sẵn)
export interface CtInk { id: string; name: string; hex: string }
export const CT_INKS: CtInk[] = [
  { id: 'black', name: 'Đen', hex: '#1A1A1A' },
  { id: 'red', name: 'Đỏ', hex: '#C8262F' },
  { id: 'navy', name: 'Xanh navy', hex: '#1E3A66' },
  { id: 'blue', name: 'Xanh dương', hex: '#1D5FC6' },
  { id: 'green', name: 'Xanh lá', hex: '#1F7A3E' },
  { id: 'brown', name: 'Nâu đậm', hex: '#5A3519' },
  { id: 'orange', name: 'Cam', hex: '#E0661B' },
  { id: 'pink', name: 'Hồng', hex: '#D63A78' },
];
export const ctInk = (id: string) => CT_INKS.find((i) => i.id === id) || CT_INKS[0];

// in đủ màu (chỉ mailer)
export interface CtPalette { id: string; name: string; bg: string; ink: string; accent: string; onAccent: string; inside: string }
export const CT_PALETTES: CtPalette[] = [
  { id: 'pink', name: 'Hồng phấn', bg: '#F7D6DE', ink: '#5B2034', accent: '#D6457A', onAccent: '#FFFFFF', inside: '#D6457A' },
  { id: 'navy', name: 'Navy', bg: '#1E3A66', ink: '#FFFFFF', accent: '#E8B84A', onAccent: '#1E3A66', inside: '#1E3A66' },
  { id: 'black', name: 'Đen sang', bg: '#151515', ink: '#F2EDE2', accent: '#C9A45A', onAccent: '#151515', inside: '#151515' },
  { id: 'yellow', name: 'Vàng vui', bg: '#F7C833', ink: '#2B1A10', accent: '#E0462B', onAccent: '#FFFFFF', inside: '#E0462B' },
  { id: 'mint', name: 'Xanh bạc hà', bg: '#CFEBDD', ink: '#174A35', accent: '#1F7A55', onAccent: '#FFFFFF', inside: '#1F7A55' },
  { id: 'lilac', name: 'Tím lilac', bg: '#E2D8F2', ink: '#3A2560', accent: '#7A4CC2', onAccent: '#FFFFFF', inside: '#7A4CC2' },
];
export const ctPalette = (id: string) => CT_PALETTES.find((p) => p.id === id) || CT_PALETTES[0];

// ======================= font (đều có TTF /public/fonts → outline được) =======================
export interface CtFont { id: string; name: string; family: string; weight: number }
export const CT_FONTS: CtFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'stencil', name: 'Stencil', family: 'Saira Stencil One', weight: 400 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const ctFont = (id: string) => CT_FONTS.find((f) => f.id === id) || CT_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';
export const CT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Saira+Stencil+One&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useCtFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ct-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ct-fonts'; link.rel = 'stylesheet';
        link.href = CT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CT_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `700 40px "${SCRIPT}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ======================= bố cục, biểu tượng, mẫu =======================
export const CT_LAYOUTS: { id: string; name: string }[] = [
  { id: 'center', name: 'Logo giữa' },
  { id: 'band', name: 'Dải màu' },
  { id: 'corner', name: 'Góc trái' },
  { id: 'stencil', name: 'Stencil kho' },
  { id: 'stripe', name: 'Sọc chéo' },
  { id: 'pattern', name: 'Hoạ tiết' },
  { id: 'minimal', name: 'Tối giản' },
];
export type CtIcon = 'fragile' | 'up' | 'dry' | 'stack';
export const CT_ICONS: { id: CtIcon; name: string }[] = [
  { id: 'fragile', name: 'Hàng dễ vỡ' },
  { id: 'up', name: 'Hướng lên' },
  { id: 'dry', name: 'Tránh ẩm' },
  { id: 'stack', name: 'Xếp chồng tối đa' },
];
export type CtPrint = '1' | '2' | 'full';

export interface CtSpec {
  style: CtStyle; size: string; flute: string; board: CtBoard; print: CtPrint;
  inks: [string, string]; palette: string; layout: string; font: string; icons: CtIcon[];
  dimensions?: Pick<CtSize, 'l' | 'w' | 'h'>;
}
export function ctSpecSize(spec: CtSpec): CtSize {
  const preset = ctSize(spec.size);
  if (!spec.dimensions) return preset;
  const { l, w, h } = spec.dimensions;
  return { ...preset, l, w, h, name: `${l} × ${w} × ${h} mm` };
}
export interface CtTemplate { id: string; name: string; spec: Omit<CtSpec, 'size' | 'flute' | 'dimensions'> }
const IC_ALL: CtIcon[] = ['fragile', 'up', 'dry', 'stack'];
export const CT_TEMPLATES: CtTemplate[] = [
  { id: 'rsc-basic', name: 'Kho cơ bản · kraft đen', spec: { style: 'rsc', board: 'kraft', print: '1', inks: ['black', 'black'], palette: 'pink', layout: 'center', font: 'oswald', icons: ['up', 'dry'] } },
  { id: 'rsc-shop-red', name: 'Shop online · dải đỏ', spec: { style: 'rsc', board: 'kraft', print: '2', inks: ['black', 'red'], palette: 'pink', layout: 'band', font: 'montserrat', icons: ['fragile', 'up'] } },
  { id: 'rsc-white-navy', name: 'Trắng · navy', spec: { style: 'rsc', board: 'white', print: '1', inks: ['navy', 'navy'], palette: 'pink', layout: 'corner', font: 'bvp', icons: IC_ALL } },
  { id: 'rsc-stencil', name: 'Xưởng · stencil', spec: { style: 'rsc', board: 'kraft', print: '2', inks: ['black', 'orange'], palette: 'pink', layout: 'stencil', font: 'stencil', icons: ['fragile', 'up', 'stack'] } },
  { id: 'rsc-farm', name: 'Nông sản · xanh lá', spec: { style: 'rsc', board: 'white', print: '2', inks: ['brown', 'green'], palette: 'pink', layout: 'minimal', font: 'baloo', icons: ['up', 'dry'] } },
  { id: 'rsc-stripe', name: 'Điện máy · sọc xanh', spec: { style: 'rsc', board: 'kraft', print: '2', inks: ['black', 'blue'], palette: 'pink', layout: 'stripe', font: 'montserrat', icons: IC_ALL } },
  { id: 'm-kraft', name: 'Mailer kraft tối giản', spec: { style: 'mailer', board: 'kraft', print: '1', inks: ['black', 'black'], palette: 'pink', layout: 'center', font: 'playfair', icons: [] } },
  { id: 'm-pink', name: 'Mỹ phẩm · hồng', spec: { style: 'mailer', board: 'white', print: 'full', inks: ['pink', 'pink'], palette: 'pink', layout: 'pattern', font: 'baloo', icons: [] } },
  { id: 'm-navy', name: 'Thời trang · navy', spec: { style: 'mailer', board: 'white', print: 'full', inks: ['navy', 'navy'], palette: 'navy', layout: 'band', font: 'montserrat', icons: [] } },
  { id: 'm-handmade', name: 'Handmade · kraft xanh', spec: { style: 'mailer', board: 'kraft', print: '2', inks: ['brown', 'green'], palette: 'mint', layout: 'corner', font: 'playfair', icons: ['fragile'] } },
  { id: 'm-black', name: 'Sang trọng · đen vàng', spec: { style: 'mailer', board: 'white', print: 'full', inks: ['black', 'black'], palette: 'black', layout: 'minimal', font: 'playfair', icons: [] } },
  { id: 'm-snack', name: 'Ăn vặt · vàng vui', spec: { style: 'mailer', board: 'white', print: 'full', inks: ['red', 'red'], palette: 'yellow', layout: 'pattern', font: 'baloo', icons: ['up'] } },
];
export const ctTemplatesFor = (st: CtStyle) => CT_TEMPLATES.filter((t) => t.spec.style === st);
export const ctSpecFor = (t: CtTemplate, size?: string, flute?: string): CtSpec => ({
  ...t.spec, size: size && ctSize(size).style === t.spec.style ? size : ctSizesFor(t.spec.style)[0].id,
  flute: flute && ctFlute(flute).style === t.spec.style ? flute : CT_FLUTES.find((f) => f.style === t.spec.style)!.id,
});

export type CtData = Record<string, string>;
export interface CtField { key: string; label: string; ph?: string; half?: boolean; mailer?: boolean }
export const CT_FIELDS: CtField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'AN KHANG STORE', half: true },
  { key: 'slogan', label: 'Slogan', ph: 'Giao nhanh — đóng gói cẩn thận', half: true },
  { key: 'website', label: 'Website', ph: 'ankhangstore.vn', half: true },
  { key: 'hotline', label: 'Hotline / Zalo', ph: '0909 123 456', half: true },
  { key: 'social', label: 'Fanpage / TikTok', ph: 'fb.com/ankhangstore', half: true },
  { key: 'stack', label: 'Xếp chồng tối đa (thùng)', ph: '5', half: true },
  { key: 'inside', label: 'Lời nhắn mặt trong nắp', ph: 'Cảm ơn bạn đã mua hàng!', half: true, mailer: true },
  { key: 'insideSub', label: 'Dòng phụ mặt trong', ph: 'Chụp ảnh đập hộp & tag shop để nhận quà nhé', half: true, mailer: true },
];
export const defaultCtData = (): CtData => ({
  brand: 'AN KHANG STORE', slogan: 'Giao nhanh — đóng gói cẩn thận', website: 'ankhangstore.vn', hotline: '0909 123 456',
  social: 'fb.com/ankhangstore', stack: '5', inside: 'Cảm ơn bạn đã mua hàng!', insideSub: 'Chụp ảnh đập hộp & tag shop để nhận quà nhé',
});

// ======================= Art (đơn vị mm) =======================
export type TextItem = { t: 'x'; s: string; x: number; y: number; size: number; family: string; weight: number; color: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; op?: number };
export type Item =
  | { t: 'p'; d: string; fill?: string; stroke?: string; sw?: number; op?: number; eo?: boolean }
  | TextItem
  | { t: 'img'; href: string; x: number; y: number; w: number; h: number }
  | { t: 'k'; d: string; fill: string; texts: TextItem[] }; // mảng mực có chữ KHOÉT (lộ giấy) — flexo không có mực trắng
export interface Art { w: number; h: number; bg: string | null; items: Item[] }

const r2 = (n: number) => Math.round(n * 100) / 100;
const rect = (x: number, y: number, w: number, h: number) => `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) => {
  r = Math.min(r, w / 2, h / 2);
  return `M${r2(x + r)} ${r2(y)}H${r2(x + w - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}H${r2(x + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x)} ${r2(y + h - r)}V${r2(y + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + r)} ${r2(y)}Z`;
};
const circ = (cx: number, cy: number, r: number) => `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`;
const ring = (cx: number, cy: number, r: number, t: number) => circ(cx, cy, r) + circ(cx, cy, r - t);

let mctx: CanvasRenderingContext2D | null = null;
const wcache = new Map<string, number>();
export function textW(s: string, family: string, weight: number, size: number, ls = 0) {
  const k = `${family}|${weight}|${s}`;
  let w1 = wcache.get(k);
  if (w1 === undefined) {
    if (typeof document === 'undefined') w1 = s.length * 0.6;
    else {
      mctx ??= document.createElement('canvas').getContext('2d');
      if (!mctx) w1 = s.length * 0.6;
      else { mctx.font = `${weight} 100px "${family}"`; w1 = mctx.measureText(s).width / 100; }
    }
    if (wcache.size > 4000) wcache.clear();
    wcache.set(k, w1);
  }
  return w1 * size + ls * size * Math.max(0, s.length - 1);
}

// chữ 1 dòng co cho vừa max (mm); cao chữ ≤ maxH (≈ size × 1.1 gồm dấu)
function T(s: string | undefined, x: number, y: number, size: number, max: number, family: string, weight: number, color: string,
  o: { anchor?: 'start' | 'middle' | 'end'; ls?: number; op?: number } = {}): TextItem[] {
  if (!s || !s.trim()) return [];
  const w = textW(s, family, weight, size, o.ls || 0);
  return [{ t: 'x', s, x, y, size: w > max ? (size * max) / w : size, family, weight, color, ...o }];
}
// tên thương hiệu: 1 dòng nếu không co quá; quá dài → 2 dòng cân nhau
function brandLines(s: string, family: string, weight: number, size: number, max: number): { lines: string[]; size: number } {
  const one = textW(s, family, weight, size);
  if (one <= max) return { lines: [s], size };
  const words = s.trim().split(/\s+/);
  if (words.length < 2 || one * 0.62 < max) return { lines: [s], size: (size * max) / one };
  let best = [s, ''], bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(textW(a, family, weight, size), textW(b, family, weight, size));
    if (w < bestW) { bestW = w; best = [a, b]; }
  }
  return { lines: best, size: Math.min(size, (size * max) / bestW) * 0.94 };
}

// ----- biểu tượng ký hiệu vận chuyển (vẽ trong ô s×s, góc trái trên x,y) -----
function iconItems(kind: CtIcon, x: number, y: number, s: number, ink: string, stack: string): Item[] {
  const X = (v: number) => r2(x + v * s), Y = (v: number) => r2(y + v * s);
  const out: Item[] = [{ t: 'p', d: rrect(x, y, s, s, s * 0.08), stroke: ink, sw: r2(s * 0.045) }];
  if (kind === 'fragile') {
    out.push({ t: 'p', d: `M${X(0.27)} ${Y(0.14)}L${X(0.73)} ${Y(0.14)}Q${X(0.73)} ${Y(0.5)} ${X(0.54)} ${Y(0.55)}L${X(0.54)} ${Y(0.76)}L${X(0.66)} ${Y(0.8)}L${X(0.66)} ${Y(0.86)}L${X(0.34)} ${Y(0.86)}L${X(0.34)} ${Y(0.8)}L${X(0.46)} ${Y(0.76)}L${X(0.46)} ${Y(0.55)}Q${X(0.27)} ${Y(0.5)} ${X(0.27)} ${Y(0.14)}Z`, fill: ink });
  } else if (kind === 'up') {
    for (const cx of [0.33, 0.67]) {
      out.push({ t: 'p', d: `M${X(cx)} ${Y(0.14)}L${X(cx + 0.15)} ${Y(0.36)}L${X(cx + 0.055)} ${Y(0.36)}L${X(cx + 0.055)} ${Y(0.72)}L${X(cx - 0.055)} ${Y(0.72)}L${X(cx - 0.055)} ${Y(0.36)}L${X(cx - 0.15)} ${Y(0.36)}Z`, fill: ink });
    }
    out.push({ t: 'p', d: rect(x + 0.16 * s, y + 0.79 * s, 0.68 * s, 0.07 * s), fill: ink });
  } else if (kind === 'dry') {
    out.push({ t: 'p', d: `M${X(0.14)} ${Y(0.5)}A${r2(0.36 * s)} ${r2(0.32 * s)} 0 0 1 ${X(0.86)} ${Y(0.5)}Q${X(0.77)} ${Y(0.43)} ${X(0.68)} ${Y(0.5)}Q${X(0.59)} ${Y(0.43)} ${X(0.5)} ${Y(0.5)}Q${X(0.41)} ${Y(0.43)} ${X(0.32)} ${Y(0.5)}Q${X(0.23)} ${Y(0.43)} ${X(0.14)} ${Y(0.5)}Z`, fill: ink });
    out.push({ t: 'p', d: `M${X(0.5)} ${Y(0.48)}L${X(0.5)} ${Y(0.78)}Q${X(0.5)} ${Y(0.86)} ${X(0.42)} ${Y(0.86)}Q${X(0.35)} ${Y(0.86)} ${X(0.35)} ${Y(0.79)}`, stroke: ink, sw: r2(s * 0.05) });
    for (const [dx, dy] of [[0.24, 0.1], [0.5, 0.06], [0.76, 0.1]]) {
      out.push({ t: 'p', d: `M${X(dx)} ${Y(dy)}Q${X(dx + 0.04)} ${Y(dy + 0.07)} ${X(dx)} ${Y(dy + 0.09)}Q${X(dx - 0.04)} ${Y(dy + 0.07)} ${X(dx)} ${Y(dy)}Z`, fill: ink });
    }
  } else {
    for (let i = 0; i < 3; i++) out.push({ t: 'p', d: rect(x + 0.14 * s, y + (0.16 + i * 0.23) * s, 0.42 * s, 0.19 * s), stroke: ink, sw: r2(s * 0.04) });
    out.push(...T(stack || '5', x + 0.77 * s, y + 0.66 * s, s * 0.42, s * 0.3, 'Oswald', 700, ink));
  }
  return out;
}
const iconCaption = (k: CtIcon, stack: string) => (k === 'fragile' ? 'DỄ VỠ' : k === 'up' ? 'HƯỚNG LÊN' : k === 'dry' ? 'TRÁNH ẨM' : `XẾP TỐI ĐA ${stack || '5'}`);

// ----- ngữ cảnh màu -----
export interface Ctx {
  spec: CtSpec; data: CtData; logo?: string; font: CtFont;
  full: boolean; bg: string | null; ink: string; accent: string; onAccent: string; paper: string; insideInk: string;
}
export function ctxOf(spec: CtSpec, data: CtData, logo?: string): Ctx {
  const full = spec.style === 'mailer' && spec.print === 'full';
  const paper = boardHex(spec.board);
  if (full) {
    const p = ctPalette(spec.palette);
    return { spec, data, logo, font: ctFont(spec.font), full, bg: p.bg, ink: p.ink, accent: p.accent, onAccent: p.onAccent, paper, insideInk: p.inside };
  }
  const i1 = ctInk(spec.inks[0]).hex, i2 = spec.print === '2' ? ctInk(spec.inks[1]).hex : i1;
  return { spec, data, logo, font: ctFont(spec.font), full, bg: null, ink: i1, accent: i2, onAccent: paper, paper, insideInk: i1 };
}

// monogram/logo trong ô tròn (x,y tâm, r bán kính)
function badge(cx: number, cy: number, r: number, c: Ctx, color = c.ink): Item[] {
  if (c.logo) return [{ t: 'img', href: c.logo, x: cx - r, y: cy - r, w: 2 * r, h: 2 * r }];
  const words = (c.data.brand || 'Shop').trim().split(/\s+/).filter((w) => !/^(shop|store|cửa|hàng|công|ty)$/i.test(w));
  const mono = (words.length ? words : ['S']).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  return [{ t: 'p', d: ring(cx, cy, r, r * 0.09), fill: color, eo: true }, ...T(mono, cx, cy + r * 0.34, r * 0.95, r * 1.3, c.font.family, c.font.weight, color)];
}

// chữ khoét trong mảng mực (flexo) / chữ màu onAccent (đủ màu)
function knock(d: string, fill: string, texts: TextItem[], c: Ctx): Item[] {
  if (c.full) return [{ t: 'p', d, fill }, ...texts.map((x) => ({ ...x, color: c.onAccent }))];
  return [{ t: 'k', d, fill, texts }];
}

// ---------- mặt dài (logo + tên shop) — cũng dùng làm nắp mailer ----------
export function heroArt(w: number, h: number, c: Ctx): Art {
  const L = c.spec.layout, f = c.font, items: Item[] = [];
  const m = Math.min(w, h) * 0.09;
  const brand = c.data.brand || '';
  const base = Math.min(h * 0.2, w * 0.13);
  if (L === 'band') {
    const bh = h * 0.3, by = h * 0.4;
    const bl = brandLines(brand, f.family, f.weight, Math.min(bh * 0.5, w * 0.11), w * 0.84);
    const lh = bl.size * 1.08, y0 = by + bh / 2 - (bl.lines.length * lh) / 2 + bl.size * 0.82;
    const texts = bl.lines.flatMap((ln, i) => T(ln, w / 2, y0 + i * lh, bl.size, w * 0.84, f.family, f.weight, c.paper));
    items.push(...knock(rect(0, by, w, bh), c.accent, texts, c));
    const r = Math.min(by * 0.32, w * 0.07);
    items.push(...badge(w / 2, by * 0.5, r, c));
    items.push(...T(c.data.slogan, w / 2, by + bh + (h - by - bh) * 0.48, Math.min(h * 0.07, w * 0.04), w * 0.8, BODY, 600, c.ink));
    items.push(...T(c.data.website, w / 2, h - m * 0.9, Math.min(h * 0.05, w * 0.03), w * 0.7, BODY, 800, c.accent === c.paper ? c.ink : c.accent));
  } else if (L === 'corner') {
    const r = Math.min(h * 0.14, w * 0.08);
    items.push(...badge(m + r, m + r, r, c));
    const bl = brandLines(brand, f.family, f.weight, base * 1.15, w * 0.8);
    const lh = bl.size * 1.06;
    const yb = h - m - Math.min(h * 0.07, w * 0.045) * 1.9 - (bl.lines.length - 1) * lh;
    bl.lines.forEach((ln, i) => items.push(...T(ln, m, yb + i * lh, bl.size, w * 0.8, f.family, f.weight, c.ink, { anchor: 'start' })));
    items.push({ t: 'p', d: rect(m, yb + (bl.lines.length - 1) * lh + bl.size * 0.3, Math.min(w * 0.25, 80), Math.max(1.2, h * 0.012)), fill: c.accent });
    items.push(...T(c.data.slogan, m, h - m, Math.min(h * 0.065, w * 0.04), w * 0.62, BODY, 600, c.ink, { anchor: 'start' }));
    items.push(...T(c.data.website, w - m, m + r * 0.6, Math.min(h * 0.05, w * 0.03), w * 0.4, BODY, 800, c.accent, { anchor: 'end' }));
  } else if (L === 'stencil') {
    const sh = h * 0.12;
    const n = Math.ceil(w / (sh * 1.2)) + 2;
    let d = '';
    for (let i = -1; i < n; i++) { const x0 = i * sh * 1.2; d += `M${r2(x0)} ${r2(h - sh)}l${r2(sh * 0.6)} 0l${r2(-sh * 0.6 + sh * 0.6 - sh)} ${r2(sh)}l${r2(-sh * 0.6)} 0Z`; }
    // sọc cảnh báo: hình bình hành nghiêng, cắt trong dải đáy
    let stripes = '';
    for (let i = -2; i < n; i++) { const x0 = i * sh * 1.2; stripes += `M${r2(x0 + sh)} ${r2(h - sh)}L${r2(x0 + sh * 1.6)} ${r2(h - sh)}L${r2(x0 + sh * 0.6)} ${r2(h)}L${r2(x0)} ${r2(h)}Z`; }
    void d;
    items.push({ t: 'p', d: stripes, fill: c.accent });
    items.push({ t: 'p', d: rect(0, h - sh - Math.max(1.5, h * 0.012), w, Math.max(1.5, h * 0.012)), fill: c.accent });
    const bl = brandLines(brand, f.family, f.weight, Math.min(h * 0.26, w * 0.14), w * 0.86);
    const lh = bl.size * 1.02;
    const cy = (h - sh) * 0.5;
    const y0 = cy - (bl.lines.length * lh) / 2 + bl.size * 0.8;
    bl.lines.forEach((ln, i) => items.push(...T(ln, w / 2, y0 + i * lh, bl.size, w * 0.86, f.family, f.weight, c.ink)));
    items.push(...T((c.data.slogan || '').toUpperCase(), w / 2, Math.min(h - sh - m * 0.6, y0 + (bl.lines.length - 1) * lh + bl.size * 0.62), Math.min(h * 0.06, w * 0.035), w * 0.8, BODY, 800, c.ink, { ls: 0.08 }));
    items.push(...T(c.data.website, w - m * 0.8, m * 1.2, Math.min(h * 0.045, w * 0.028), w * 0.4, BODY, 800, c.ink, { anchor: 'end' }));
  } else if (L === 'stripe') {
    const tw = Math.min(w, h) * 0.42;
    const sw = tw * 0.22;
    for (let i = 0; i < 3; i++) {
      const o = i * sw * 1.55;
      items.push({ t: 'p', d: `M${r2(o)} 0L${r2(o + sw)} 0L0 ${r2(o + sw)}L0 ${r2(o)}Z`, fill: c.accent });
      items.push({ t: 'p', d: `M${r2(w - o)} ${r2(h)}L${r2(w - o - sw)} ${r2(h)}L${r2(w)} ${r2(h - o - sw)}L${r2(w)} ${r2(h - o)}Z`, fill: c.accent });
    }
    const r = Math.min(h * 0.11, w * 0.06);
    items.push(...badge(w / 2, h * 0.27, r, c));
    const bl = brandLines(brand, f.family, f.weight, base, w * 0.7);
    const lh = bl.size * 1.06;
    bl.lines.forEach((ln, i) => items.push(...T(ln, w / 2, h * 0.27 + r + bl.size * 1.05 + i * lh, bl.size, w * 0.7, f.family, f.weight, c.ink)));
    items.push(...T(c.data.slogan, w / 2, h * 0.27 + r + bl.size * 1.05 + (bl.lines.length - 1) * lh + Math.min(h * 0.11, w * 0.06), Math.min(h * 0.065, w * 0.04), w * 0.66, BODY, 600, c.ink));
  } else if (L === 'pattern') {
    // hoạ tiết lặp: chấm tròn + hộp nhỏ (đủ màu: mờ; flexo: nét mảnh 1 màu)
    const g = Math.min(w, h) * 0.16;
    for (let yy = g * 0.5, row = 0; yy < h; yy += g, row++) {
      for (let xx = (row % 2 ? g : g * 0.5); xx < w; xx += g) {
        if (row % 2) items.push({ t: 'p', d: circ(xx, yy, g * 0.08), fill: c.accent, op: c.full ? 0.35 : undefined });
        else items.push({ t: 'p', d: `M${r2(xx - g * 0.11)} ${r2(yy)}L${r2(xx)} ${r2(yy - g * 0.11)}L${r2(xx + g * 0.11)} ${r2(yy)}L${r2(xx)} ${r2(yy + g * 0.11)}Z`, fill: c.full ? c.ink : 'none', stroke: c.full ? undefined : c.accent, sw: r2(g * 0.025), op: c.full ? 0.12 : undefined });
      }
    }
    const pw = w * 0.74, ph = h * 0.46, px = (w - pw) / 2, py = (h - ph) / 2;
    const plate = rrect(px, py, pw, ph, Math.min(pw, ph) * 0.18);
    const bl = brandLines(brand, f.family, f.weight, Math.min(ph * 0.3, pw * 0.13), pw * 0.84);
    const lh = bl.size * 1.06;
    const hasSlogan = !!c.data.slogan;
    const sl = Math.min(ph * 0.11, pw * 0.05);
    const block = bl.lines.length * lh + (hasSlogan ? sl * 1.8 : 0);
    const y0 = py + ph / 2 - block / 2 + bl.size * 0.82;
    const texts: TextItem[] = [
      ...bl.lines.flatMap((ln, i) => T(ln, w / 2, y0 + i * lh, bl.size, pw * 0.84, f.family, f.weight, c.paper)),
      ...T(c.data.slogan, w / 2, y0 + (bl.lines.length - 1) * lh + sl * 1.9, sl, pw * 0.8, BODY, 600, c.paper),
    ];
    if (c.full) items.push({ t: 'p', d: plate, fill: c.accent }, ...texts.map((x) => ({ ...x, color: c.onAccent })));
    else items.push({ t: 'k', d: plate, fill: c.accent, texts });
  } else if (L === 'minimal') {
    const r = Math.min(h * 0.1, w * 0.06);
    items.push(...badge(w / 2, h * 0.34, r, c, c.accent));
    const bl = brandLines(brand, f.family, f.weight, base * 0.72, w * 0.6);
    const lh = bl.size * 1.06;
    bl.lines.forEach((ln, i) => items.push(...T(ln, w / 2, h * 0.34 + r + bl.size * 1.15 + i * lh, bl.size, w * 0.6, f.family, f.weight, c.ink, { ls: 0.06 })));
    items.push(...T(c.data.website, w / 2, h - m, Math.min(h * 0.045, w * 0.028), w * 0.5, BODY, 600, c.ink, { ls: 0.08 }));
  } else {
    // center
    const r = Math.min(h * 0.14, w * 0.08);
    const cy = h * 0.3;
    items.push(...badge(w / 2, cy, r, c));
    const bl = brandLines(brand, f.family, f.weight, base, w * 0.82);
    const lh = bl.size * 1.06;
    const yb = cy + r + bl.size * 1.1;
    bl.lines.forEach((ln, i) => items.push(...T(ln, w / 2, yb + i * lh, bl.size, w * 0.82, f.family, f.weight, c.ink)));
    const ly = yb + (bl.lines.length - 1) * lh + bl.size * 0.42;
    const rw = Math.min(w * 0.18, 70);
    items.push({ t: 'p', d: rect(w / 2 - rw / 2, ly, rw, Math.max(1, h * 0.01)), fill: c.accent });
    items.push(...T(c.data.slogan, w / 2, Math.min(h - m, ly + Math.min(h * 0.11, w * 0.065)), Math.min(h * 0.065, w * 0.04), w * 0.76, BODY, 600, c.ink));
  }
  return { w, h, bg: c.bg, items };
}

// ---------- mặt ngắn: liên hệ + ký hiệu vận chuyển ----------
export function infoArt(w: number, h: number, c: Ctx, withIcons = true): Art {
  const items: Item[] = [];
  const m = Math.min(w, h) * 0.09;
  const icons = withIcons ? c.spec.icons : [];
  const lines = [c.data.website, c.data.hotline ? `Hotline ${c.data.hotline}` : '', c.data.social].filter(Boolean) as string[];
  const iconZone = icons.length ? Math.min(h * 0.4, (w - 2 * m) / icons.length / 1.15 + h * 0.08) : 0;
  const textZone = h - 2 * m - iconZone - (icons.length ? h * 0.05 : 0);
  // tên shop nhỏ trên cùng
  const fs = Math.min(textZone / (lines.length + 1.6) * 0.82, w * 0.07);
  let y = m + fs * 1.15;
  items.push(...T(c.data.brand, w / 2, y, fs * 1.15, w * 0.84, c.font.family, c.font.weight, c.ink));
  y += fs * 0.55;
  items.push({ t: 'p', d: rect(w / 2 - Math.min(w * 0.12, 40), y, Math.min(w * 0.24, 80), Math.max(0.8, fs * 0.08)), fill: c.accent });
  y += fs * 0.35;
  for (const ln of lines) { y += fs * 1.18; items.push(...T(ln, w / 2, y, fs * 0.82, w * 0.84, BODY, 600, c.ink)); }
  if (icons.length) {
    const cap = iconZone * 0.17;
    const s = Math.min(iconZone - cap * 1.5, (w - 2 * m) / icons.length / 1.2);
    const gap = s * 0.2, tot = icons.length * s + (icons.length - 1) * gap;
    let x = (w - tot) / 2;
    const iy = h - m - cap * 1.4 - s;
    for (const k of icons) {
      items.push(...iconItems(k, x, iy, s, c.ink, c.data.stack));
      items.push(...T(iconCaption(k, c.data.stack), x + s / 2, iy + s + cap * 1.15, cap, s * 1.15, BODY, 800, c.ink));
      x += s + gap;
    }
  }
  return { w, h, bg: c.bg, items };
}

// ---------- mailer: thành trước (dải tên + slogan) ----------
export function stripArt(w: number, h: number, c: Ctx): Art {
  const items: Item[] = [];
  const f = c.font;
  const fs = Math.min(h * 0.32, w * 0.07);
  items.push(...T(c.data.brand, w / 2, h * 0.5 + fs * 0.1, fs, w * 0.8, f.family, f.weight, c.ink));
  items.push(...T(c.data.slogan, w / 2, h * 0.5 + fs * 0.1 + Math.min(h * 0.24, fs * 0.9), Math.min(h * 0.12, w * 0.035), w * 0.74, BODY, 600, c.ink));
  items.push({ t: 'p', d: rect(0, h - Math.max(1.5, h * 0.06), w, Math.max(1.5, h * 0.06)), fill: c.accent });
  return { w, h, bg: c.bg, items };
}
// ---------- mailer: thành sau/ hông (liên hệ 1 dòng) ----------
export function lineArt(w: number, h: number, c: Ctx, which: 'back' | 'side'): Art {
  const items: Item[] = [];
  const fs = Math.min(h * 0.16, w * 0.05);
  if (which === 'back') {
    items.push(...T([c.data.hotline && `Hotline ${c.data.hotline}`, c.data.social].filter(Boolean).join('  ·  '), w / 2, h * 0.55, fs, w * 0.86, BODY, 600, c.ink));
  } else {
    items.push(...T(c.data.website, w / 2, h * 0.42, fs, w * 0.84, BODY, 800, c.ink));
    const ic = c.spec.icons.slice(0, 2);
    if (ic.length) {
      const s = Math.min(h * 0.34, w * 0.18), gap = s * 0.25, tot = ic.length * s + (ic.length - 1) * gap;
      let x = (w - tot) / 2;
      for (const k of ic) { items.push(...iconItems(k, x, h * 0.52, s, c.ink, c.data.stack)); x += s + gap; }
    }
  }
  return { w, h, bg: c.bg, items };
}
// ---------- RSC: tai trên mặt trước (tên nhỏ + "mở tại đây") ----------
export function flapArt(w: number, h: number, c: Ctx): Art {
  const items: Item[] = [];
  const fs = Math.min(h * 0.18, w * 0.06);
  items.push(...T(c.data.brand, w / 2, h * 0.46, fs, w * 0.6, c.font.family, c.font.weight, c.ink));
  items.push(...T(c.data.slogan, w / 2, h * 0.46 + fs * 1.1, fs * 0.5, w * 0.6, BODY, 600, c.ink));
  return { w, h, bg: c.bg, items };
}
// ---------- mailer: mặt trong nắp (1 màu) ----------
export function insideArt(w: number, h: number, c: Ctx): Art {
  const items: Item[] = [];
  const ink = c.insideInk;
  const m = Math.min(w, h) * 0.1;
  const msg = c.data.inside || 'Cảm ơn bạn đã mua hàng!';
  const bl = brandLines(msg, SCRIPT, 700, Math.min(h * 0.17, w * 0.1), w * 0.8);
  const lh = bl.size * 1.12;
  const y0 = h * 0.42 - ((bl.lines.length - 1) * lh) / 2;
  bl.lines.forEach((ln, i) => items.push(...T(ln, w / 2, y0 + i * lh, bl.size, w * 0.8, SCRIPT, 700, ink)));
  const yl = y0 + (bl.lines.length - 1) * lh + bl.size * 0.5;
  items.push({ t: 'p', d: `M${r2(w / 2 - w * 0.12)} ${r2(yl)}L${r2(w / 2 - w * 0.02)} ${r2(yl)}M${r2(w / 2 + w * 0.02)} ${r2(yl)}L${r2(w / 2 + w * 0.12)} ${r2(yl)}`, stroke: ink, sw: Math.max(0.5, h * 0.006) });
  items.push({ t: 'p', d: `M${r2(w / 2)} ${r2(yl - h * 0.012)}l${r2(h * 0.012)} ${r2(h * 0.012)}l${r2(-h * 0.012)} ${r2(h * 0.012)}l${r2(-h * 0.012)} ${r2(-h * 0.012)}Z`, fill: ink });
  items.push(...T(c.data.insideSub, w / 2, yl + Math.min(h * 0.11, w * 0.06), Math.min(h * 0.055, w * 0.032), w * 0.78, BODY, 600, ink));
  items.push(...T([c.data.brand, c.data.social].filter(Boolean).join('  ·  '), w / 2, h - m, Math.min(h * 0.045, w * 0.028), w * 0.7, BODY, 800, ink, { ls: 0.04 }));
  return { w, h, bg: null, items };
}

// ======================= vẽ Art: SVG =======================
let artSeq = 0;
export function ArtG({ art }: { art: Art }) {
  const [pre] = useState(() => `ctk${++artSeq}`);
  const txt = (a: TextItem, k: number | string, color?: string) => (
    <text key={k} x={a.x} y={a.y} fontFamily={`'${a.family}'`} fontWeight={a.weight} fontSize={a.size} fill={color ?? a.color} opacity={a.op} textAnchor={a.anchor ?? 'middle'} letterSpacing={a.ls ? a.ls * a.size : undefined}>{a.s}</text>
  );
  return (
    <>
      {art.bg && <rect x={0} y={0} width={art.w} height={art.h} fill={art.bg} data-ink="bg" />}
      {art.items.map((a, i) => {
        if (a.t === 'p') return <path key={i} d={a.d} fill={a.fill ?? 'none'} stroke={a.stroke} strokeWidth={a.sw} opacity={a.op} fillRule={a.eo ? 'evenodd' : undefined} strokeLinejoin="round" strokeLinecap="round" />;
        if (a.t === 'img') return <image key={i} href={a.href} x={a.x} y={a.y} width={a.w} height={a.h} preserveAspectRatio="xMidYMid meet" />;
        if (a.t === 'k') {
          const id = `${pre}-${i}`;
          return (
            <g key={i}>
              <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={art.w} height={art.h}>
                <rect x={0} y={0} width={art.w} height={art.h} fill="#FFFFFF" />
                {a.texts.map((x, j) => txt(x, j, '#000000'))}
              </mask>
              <path d={a.d} fill={a.fill} mask={`url(#${id})`} />
              {/* chữ khoét: giữ <text> trong suốt để đo/QC vị trí chữ (không in) */}
              <g data-knock="1" opacity={0}>{a.texts.map((x, j) => txt(x, `g${j}`))}</g>
            </g>
          );
        }
        return txt(a, i);
      })}
    </>
  );
}

// ======================= vẽ Art: canvas (texture 3D) =======================
export function drawArt(ctx: CanvasRenderingContext2D, art: Art, k: number, imgs: Map<string, HTMLImageElement>, paper: string) {
  ctx.save(); ctx.scale(k, k);
  if (art.bg) { ctx.fillStyle = art.bg; ctx.fillRect(0, 0, art.w, art.h); }
  const text = (c2: CanvasRenderingContext2D, a: TextItem, color = a.color) => {
    c2.save();
    c2.globalAlpha = a.op ?? 1;
    c2.font = `${a.weight} ${a.size}px "${a.family}"`;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (a.ls) (c2 as any).letterSpacing = `${a.ls * a.size}px`;
    c2.fillStyle = color; c2.textAlign = a.anchor === 'start' ? 'left' : a.anchor === 'end' ? 'right' : 'center'; c2.textBaseline = 'alphabetic';
    c2.fillText(a.s, a.x, a.y);
    c2.restore();
  };
  for (const a of art.items) {
    ctx.save();
    if (a.t === 'p') {
      ctx.globalAlpha = a.op ?? 1;
      const p = new Path2D(a.d);
      if (a.fill && a.fill !== 'none') { ctx.fillStyle = a.fill; ctx.fill(p, a.eo ? 'evenodd' : 'nonzero'); }
      if (a.stroke) { ctx.strokeStyle = a.stroke; ctx.lineWidth = a.sw ?? 0.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(p); }
    } else if (a.t === 'img') {
      const im = imgs.get(a.href);
      if (im) { const s = Math.min(a.w / im.width, a.h / im.height); const dw = im.width * s, dh = im.height * s; ctx.drawImage(im, a.x + (a.w - dw) / 2, a.y + (a.h - dh) / 2, dw, dh); }
    } else if (a.t === 'k') {
      // mảng mực trên canvas riêng → khoét chữ → dán lên (giấy lộ ra đúng như flexo)
      const kc = document.createElement('canvas');
      kc.width = Math.max(1, Math.ceil(art.w * k)); kc.height = Math.max(1, Math.ceil(art.h * k));
      const kx = kc.getContext('2d')!; kx.scale(k, k);
      kx.fillStyle = a.fill; kx.fill(new Path2D(a.d));
      kx.globalCompositeOperation = 'destination-out';
      for (const t of a.texts) text(kx, t, '#000');
      ctx.restore(); ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(kc, 0, 0);
      void paper;
    } else {
      text(ctx, a);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ======================= KHUÔN BẾ =======================
type Pt = [number, number];
interface Poly { pts: Pt[] }
export type Role = 'hero' | 'info' | 'flap' | 'plain' | 'strip' | 'back' | 'side' | 'lid';
export interface Panel { x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | -90; role: Role }
interface DieBase { polys: Poly[]; panels: Panel[]; folds: [Pt, Pt][]; holes: string }

const R = (x: number, y: number, w: number, h: number): Poly => ({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
const Q = (...pts: Pt[]): Poly => ({ pts });
const slot = (x: number, y: number, w: number, h: number) => rrect(x, y, w, h, Math.min(w, h) / 2);

function buildDie(spec: CtSpec): DieBase {
  const s = ctSpecSize(spec), t = ctFlute(spec.flute).t;
  const L = s.l, W = s.w, H = s.h;
  const polys: Poly[] = [], panels: Panel[] = [], folds: [Pt, Pt][] = [];
  let holes = '';
  if (spec.style === 'rsc') {
    // 4 thành nằm ngang: [dài | ngắn | dài | ngắn], gáy dán bên trái, 8 tai cao W/2, khe tai rộng = 2×độ dày
    const fl = W / 2, sl = Math.max(5, t * 2);
    const xs = [0, L, L + W, 2 * L + W], ws = [L, W, L, W];
    xs.forEach((x, i) => {
      polys.push(R(x, 0, ws[i], H));
      panels.push({ x, y: 0, w: ws[i], h: H, rot: 0, role: i % 2 ? 'info' : 'hero' });
      polys.push(R(x + sl / 2, -fl, ws[i] - sl, fl));
      panels.push({ x: x + sl / 2, y: -fl, w: ws[i] - sl, h: fl, rot: 180, role: i === 0 ? 'flap' : 'plain' });
      polys.push(R(x + sl / 2, H, ws[i] - sl, fl));
      panels.push({ x: x + sl / 2, y: H, w: ws[i] - sl, h: fl, rot: 0, role: 'plain' });
    });
    const g = 35;
    polys.push(Q([0, 0], [-g, 14], [-g, H - 14], [0, H]));
  } else {
    // mailer nắp gài (RETF): đáy giữa, thành trước 2 lớp có tai khoá, 2 hông 2 lớp, thành sau + nắp + lưỡi gài
    const tw = Math.min(28, L * 0.12), th = 7;
    polys.push(R(0, 0, L, W)); panels.push({ x: 0, y: 0, w: L, h: W, rot: 0, role: 'plain' });
    polys.push(R(0, W, L, H)); panels.push({ x: 0, y: W, w: L, h: H, rot: 180, role: 'strip' });
    polys.push(R(t, W + H, L - 2 * t, H - t));
    for (const fx of [0.25, 0.75]) { polys.push(R(L * fx - tw / 2, W + 2 * H - t, tw, th)); holes += slot(L * fx - tw / 2 - 1, W - 5 - t, tw + 2, t + 1.5); }
    polys.push(R(0, -H, L, H)); panels.push({ x: 0, y: -H, w: L, h: H, rot: 0, role: 'back' });
    polys.push(R(0, -H - W, L, W)); panels.push({ x: 0, y: -H - W, w: L, h: W, rot: 180, role: 'lid' });
    const tH = H - 6, ty = -H - W;
    polys.push(Q([4, ty], [4, ty - tH + 8], [12, ty - tH], [L - 12, ty - tH], [L - 4, ty - tH + 8], [L - 4, ty]));
    panels.push({ x: 4, y: ty - tH, w: L - 8, h: tH, rot: 180, role: 'plain' });
    for (const sgn of [-1, 1] as const) {
      const x0 = sgn < 0 ? -H : L, xi = sgn < 0 ? -2 * H + t : L + H;
      polys.push(R(x0, 0, H, W)); panels.push({ x: x0, y: 0, w: H, h: W, rot: sgn < 0 ? -90 : 90, role: 'side' });
      polys.push(R(xi, 3, H - t, W - 6));
      for (const fy of [0.3, 0.7]) {
        polys.push(R(sgn < 0 ? xi - th : xi + H - t, W * fy - tw / 2, th, tw));
        holes += slot(sgn < 0 ? 4 : L - 4 - t - 1.5, W * fy - tw / 2 - 1, t + 1.5, tw + 2);
      }
      // tai chắn bụi ở 2 đầu thành sau (gập vào trong hông 2 lớp)
      const ex = sgn < 0 ? 0 : L, eo = sgn < 0 ? -(H - 4) : H - 4;
      polys.push(Q([ex, -H], [ex + eo, -H + 8], [ex + eo, -1.5], [ex, -1.5]));
      // tai chắn bụi 2 bên nắp
      polys.push(Q([ex, -H - 6], [ex + (sgn < 0 ? -(H - 8) : H - 8), -H - 16], [ex + (sgn < 0 ? -(H - 8) : H - 8), -H - W + 16], [ex, -H - W + 6]));
    }
  }
  return { polys, panels, folds, holes };
}

// biên hợp các tấm: tách cạnh tại mọi đỉnh nằm trên nó → cạnh xuất hiện 1 lần = CẮT, ≥2 lần = GẤP
const key = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
function splitEdges(polys: Poly[]) {
  const verts = polys.flatMap((p) => p.pts);
  const segs = new Map<string, { a: Pt; b: Pt; n: number }>();
  for (const pl of polys) {
    for (let i = 0; i < pl.pts.length; i++) {
      const a = pl.pts[i], b = pl.pts[(i + 1) % pl.pts.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
      if (L2 < 1e-6) continue;
      const ts = [0, 1];
      for (const v of verts) {
        const tt = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
        if (tt <= 1e-6 || tt >= 1 - 1e-6) continue;
        const px = a[0] + dx * tt, py = a[1] + dy * tt;
        if (Math.hypot(px - v[0], py - v[1]) < 0.01) ts.push(tt);
      }
      ts.sort((x, y) => x - y);
      for (let j = 0; j < ts.length - 1; j++) {
        if (ts[j + 1] - ts[j] < 1e-6) continue;
        const p: Pt = [a[0] + dx * ts[j], a[1] + dy * ts[j]], q: Pt = [a[0] + dx * ts[j + 1], a[1] + dy * ts[j + 1]];
        const k1 = key(p), k2 = key(q), kk = k1 < k2 ? `${k1}|${k2}` : `${k2}|${k1}`;
        const e = segs.get(kk);
        if (e) e.n++; else segs.set(kk, { a: p, b: q, n: 1 });
      }
    }
  }
  return [...segs.values()];
}
function loops(segs: { a: Pt; b: Pt }[]): Pt[][] {
  const adj = new Map<string, { s: number; o: Pt }[]>();
  segs.forEach((s, i) => {
    for (const [p, o] of [[s.a, s.b], [s.b, s.a]] as const) { const k = key(p); if (!adj.has(k)) adj.set(k, []); adj.get(k)!.push({ s: i, o }); }
  });
  const used = new Set<number>(), out: Pt[][] = [];
  segs.forEach((s0, i0) => {
    if (used.has(i0)) return;
    used.add(i0);
    const loop: Pt[] = [s0.a]; let cur = s0.b;
    for (let guard = 0; guard < 8000 && key(cur) !== key(s0.a); guard++) {
      loop.push(cur);
      const nx = (adj.get(key(cur)) || []).find((e) => !used.has(e.s));
      if (!nx) break;
      used.add(nx.s); cur = nx.o;
    }
    out.push(loop);
  });
  return out;
}

export const CT_BLEED = 3;
export interface CtDie extends DieBase { W: number; H: number; ox: number; oy: number; cut: string; cutLoops: number; foldD: string; foldN: number }
export function ctDieline(spec: CtSpec): CtDie {
  const base = buildDie(spec);
  const all = base.polys.flatMap((p) => p.pts);
  const minX = Math.min(...all.map((p) => p[0])), minY = Math.min(...all.map((p) => p[1]));
  const maxX = Math.max(...all.map((p) => p[0])), maxY = Math.max(...all.map((p) => p[1]));
  const M = 15;
  const ox = M - minX, oy = M - minY;
  const segs = splitEdges(base.polys);
  const ls = loops(segs.filter((e) => e.n === 1));
  const cut = ls.map((l) => `M${l.map((p) => `${r2(p[0] + ox)} ${r2(p[1] + oy)}`).join('L')}Z`).join('');
  const fsegs = [...segs.filter((e) => e.n > 1).map((e) => [e.a, e.b] as [Pt, Pt]), ...base.folds];
  const foldD = fsegs.map(([a, b]) => `M${r2(a[0] + ox)} ${r2(a[1] + oy)}L${r2(b[0] + ox)} ${r2(b[1] + oy)}`).join('');
  return { ...base, W: maxX - minX + 2 * M, H: maxY - minY + 2 * M + 16, ox, oy, cut, cutLoops: ls.length, foldD, foldN: fsegs.length };
}

export function artFor(role: Role, w: number, h: number, c: Ctx): Art {
  if (role === 'hero' || role === 'lid') return heroArt(w, h, c);
  if (role === 'info') return infoArt(w, h, c);
  if (role === 'flap') return flapArt(w, h, c);
  if (role === 'strip') return stripArt(w, h, c);
  if (role === 'back') return lineArt(w, h, c, 'back');
  if (role === 'side') return lineArt(w, h, c, 'side');
  return { w, h, bg: c.bg, items: [] };
}

const CUT = '#E6007E', FOLD = '#009FE3';

/** Khuôn bế: side 'out' = mặt ngoài (mặt in chính); 'in' = mặt trong (mailer: lời nhắn nắp, nhìn từ mặt sau tờ → lật gương khuôn) */
export function CartonDieline({ spec, data, logo, side = 'out', preview = false, style }: {
  spec: CtSpec; data: CtData; logo?: string; side?: 'out' | 'in'; preview?: boolean; style?: CSSProperties;
}) {
  const die = ctDieline(spec);
  const c = ctxOf(spec, data, logo);
  const [uid] = useState(() => `ctd${++artSeq}`);
  const s = ctSpecSize(spec), fl = ctFlute(spec.flute);
  const inside = side === 'in';
  // mặt trong: toạ độ x lật gương quanh tâm tờ (khuôn nhìn từ mặt sau), chữ vẫn xuôi
  const mx = (x: number) => (inside ? die.W - x : x);
  const sh = (p: Poly) => p.pts.map((q) => `${r2(mx(q[0] + die.ox))},${r2(q[1] + die.oy)}`).join(' ');
  const shapes: ReactNode[] = die.polys.map((p, i) => <polygon key={i} points={sh(p)} />);
  const inkTxt = c.full ? 'in đủ màu' : spec.print === '2' ? `flexo 2 màu (${ctInk(spec.inks[0]).name} + ${ctInk(spec.inks[1]).name})` : `flexo 1 màu (${ctInk(spec.inks[0]).name})`;
  const kind = spec.style === 'rsc' ? 'Thùng RSC' : 'Hộp mailer';
  const fullBg = c.full && !inside;
  const lidPanel = die.panels.find((p) => p.role === 'lid');
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${r2(die.W)} ${r2(die.H)}`} width={`${r2(die.W)}mm`} height={`${r2(die.H)}mm`} style={style} data-testid={inside ? 'ct-die-in' : 'ct-die'}>
      <defs>
        {die.panels.map((pn, i) => (
          <clipPath key={i} id={`${uid}-p${i}`}><rect x={mx(pn.x + die.ox) - (inside ? pn.w : 0)} y={pn.y + die.oy} width={pn.w} height={pn.h} /></clipPath>
        ))}
      </defs>
      <rect x={0} y={0} width={die.W} height={die.H} fill="#FFFFFF" />
      {preview && <g fill={boardHex(spec.board)} opacity={spec.board === 'kraft' ? 0.6 : 1}>{shapes}</g>}
      <g id="In">
        {fullBg && <g fill={c.bg!} stroke={c.bg!} strokeWidth={CT_BLEED * 2} strokeLinejoin="miter" data-ink="bg">{shapes}</g>}
        {!inside && die.panels.map((pn, i) => {
          const aw = pn.rot === 90 || pn.rot === -90 ? pn.h : pn.w, ah = pn.rot === 90 || pn.rot === -90 ? pn.w : pn.h;
          const art = artFor(pn.role, aw, ah, c);
          const cx = pn.x + die.ox + pn.w / 2, cy = pn.y + die.oy + pn.h / 2;
          return (
            <g key={i} clipPath={`url(#${uid}-p${i})`} data-panel={pn.role}>
              <rect data-panel-rect="1" x={pn.x + die.ox} y={pn.y + die.oy} width={pn.w} height={pn.h} fill="none" />
              <g transform={`translate(${r2(cx)} ${r2(cy)}) rotate(${pn.rot}) translate(${r2(-aw / 2)} ${r2(-ah / 2)})`}>
                <ArtG art={{ ...art, bg: null }} />
              </g>
            </g>
          );
        })}
        {inside && lidPanel && (() => {
          const art = insideArt(lidPanel.w, lidPanel.h, c);
          const x = mx(lidPanel.x + die.ox) - lidPanel.w, y = lidPanel.y + die.oy;
          const i = die.panels.indexOf(lidPanel);
          return (
            <g clipPath={`url(#${uid}-p${i})`} data-panel="inside">
              <rect data-panel-rect="1" x={x} y={y} width={lidPanel.w} height={lidPanel.h} fill="none" />
              <g transform={`translate(${r2(x)} ${r2(y)})`}><ArtG art={art} /></g>
            </g>
          );
        })()}
      </g>
      <g id="Fold" fill="none" stroke={FOLD} strokeWidth={0.5} strokeDasharray="4 3" transform={inside ? `translate(${r2(die.W)} 0) scale(-1 1)` : undefined}><path d={die.foldD} /></g>
      <g id="CutContour" fill="none" stroke={CUT} strokeWidth={0.5} transform={inside ? `translate(${r2(die.W)} 0) scale(-1 1)` : undefined}>
        <path d={die.cut} data-cut="outer" />
        {die.holes && <path d={die.holes} transform={`translate(${r2(die.ox)} ${r2(die.oy)})`} data-cut="holes" />}
      </g>
      <g data-legend="1" fontFamily={`'${BODY}'`} fontWeight={600} fontSize={Math.max(4, die.W / 260)} fill="#475569">
        <text x={15} y={die.H - 9}>{`${kind} ${s.l / 10}×${s.w / 10}×${s.h / 10} cm (lọt lòng) · ${fl.name} · ${spec.board === 'kraft' ? 'giấy kraft' : 'giấy trắng'} · ${inside ? `MẶT TRONG — 1 màu` : inkTxt} · lề in ${CT_BLEED}mm`}</text>
      </g>
    </svg>
  );
}

// thumbnail mẫu: mặt dài (RSC) / nắp (mailer) trên nền giấy
export function HeroThumb({ spec, data, logo, style }: { spec: CtSpec; data: CtData; logo?: string; style?: CSSProperties }) {
  const s = ctSpecSize(spec);
  const w = s.l, h = spec.style === 'rsc' ? s.h : s.w;
  const art = heroArt(w, h, ctxOf(spec, data, logo));
  return (
    <svg viewBox={`0 0 ${r2(w)} ${r2(h)}`} style={style} preserveAspectRatio="xMidYMid meet">
      <rect width={w} height={h} fill={boardHex(spec.board)} />
      <ArtG art={art} />
    </svg>
  );
}

// màu mực đã dùng trong lớp In (bỏ qua nền giấy, ảnh logo, mask, chữ khoét ẩn)
export function inkColorsUsed(svg: SVGSVGElement): string[] {
  const set = new Set<string>();
  const inLayer = svg.querySelector('#In'); if (!inLayer) return [];
  inLayer.querySelectorAll('path, rect, text, polygon, circle').forEach((el) => {
    if (el.closest('mask') || el.closest('[data-knock]') || el.hasAttribute('data-panel-rect')) return;
    for (const a of ['fill', 'stroke']) {
      const v = el.getAttribute(a) || (el.parentElement?.getAttribute(a) ?? '');
      if (v && v !== 'none' && !v.startsWith('url')) set.add(v.toUpperCase());
    }
  });
  return [...set];
}
