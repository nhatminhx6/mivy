'use client';
// Hộp đồ ăn F&B (pizza · hộp cơm · burger · khay thuyền): 1 engine = LOẠI HỘP × MẪU (bảng màu + font + hình món ăn).
// Mỗi mặt in là 1 "Art" đơn vị mm → dùng CHUNG cho dàn khuôn bế (SVG/PDF gửi xưởng) và texture 3D (vẽ thẳng lên canvas).
// Khuôn bế dựng từ các tấm (đa giác) — đường CẮT = biên hợp các tấm (cạnh chỉ thuộc 1 tấm), đường GẤP = cạnh chung.
// Render code 100%, không gọi AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ======================= LOẠI · KHỔ =======================
export type FbKind = 'pizza' | 'meal' | 'burger' | 'tray';
export const FB_KINDS: { id: FbKind; name: string }[] = [
  { id: 'pizza', name: 'Hộp pizza' },
  { id: 'meal', name: 'Hộp cơm · mang đi' },
  { id: 'burger', name: 'Hộp burger' },
  { id: 'tray', name: 'Khay thuyền · hộp chiên' },
];
export interface FbSize { id: string; kind: FbKind; name: string; w: number; d: number; h: number }
export const FB_SIZES: FbSize[] = [
  { id: 'pz-20', kind: 'pizza', name: 'Pizza 20cm (8")', w: 200, d: 200, h: 40 },
  { id: 'pz-25', kind: 'pizza', name: 'Pizza 25cm (10")', w: 250, d: 250, h: 40 },
  { id: 'pz-30', kind: 'pizza', name: 'Pizza 30cm (12")', w: 300, d: 300, h: 42 },
  { id: 'ml-s', kind: 'meal', name: 'Hộp 160×110×50', w: 160, d: 110, h: 50 },
  { id: 'ml-m', kind: 'meal', name: 'Hộp 180×125×55', w: 180, d: 125, h: 55 },
  { id: 'ml-l', kind: 'meal', name: 'Hộp 210×150×55', w: 210, d: 150, h: 55 },
  { id: 'bg-s', kind: 'burger', name: 'Burger 100×100×80', w: 100, d: 100, h: 80 },
  { id: 'bg-l', kind: 'burger', name: 'Burger 120×120×90', w: 120, d: 120, h: 90 },
  { id: 'tr-s', kind: 'tray', name: 'Khay 120×70×35', w: 120, d: 70, h: 35 },
  { id: 'tr-m', kind: 'tray', name: 'Khay 150×85×40', w: 150, d: 85, h: 40 },
  { id: 'tr-l', kind: 'tray', name: 'Khay 190×110×45', w: 190, d: 110, h: 45 },
];
export const fbSize = (id: string) => FB_SIZES.find((s) => s.id === id) || FB_SIZES[0];
export const fbSizesFor = (k: FbKind) => FB_SIZES.filter((s) => s.kind === k);
export const FB_BLEED = 3;

// ======================= FONT =======================
export interface FbFont { id: string; name: string; family: string; weight: number }
export const FB_FONTS: FbFont[] = [
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
];
export const fbFont = (id: string) => FB_FONTS.find((f) => f.id === id) || FB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';
export const FB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Be+Vietnam+Pro:wght@600;800&family=Lobster&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Montserrat:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useFbFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-fb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-fb-fonts'; link.rel = 'stylesheet'; link.href = FB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...FB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 32px "${BODY}"`, `800 32px "${BODY}"`, `700 32px "${SCRIPT}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ ầốềộ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ======================= MÀU · MẪU =======================
export interface FbPalette { id: string; name: string; bg: string; ink: string; accent: string; accent2: string; onAccent: string; kraft?: boolean }
export const KRAFT = '#C49A6C';
export const FB_PALETTES: FbPalette[] = [
  { id: 'tomato', name: 'Đỏ cà chua', bg: '#FFF8EC', ink: '#2B1A12', accent: '#D7262F', accent2: '#2E7D32', onAccent: '#FFFFFF' },
  { id: 'noir', name: 'Đen vàng', bg: '#18181B', ink: '#F6EEDB', accent: '#E3A72F', accent2: '#E3A72F', onAccent: '#18181B' },
  { id: 'kraft', name: 'Kraft nâu', bg: KRAFT, ink: '#3A2414', accent: '#3A2414', accent2: '#A3281F', onAccent: '#EBD7B8', kraft: true },
  { id: 'kraft-red', name: 'Kraft đỏ', bg: KRAFT, ink: '#2E1C10', accent: '#B3261E', accent2: '#2E1C10', onAccent: '#F6E7CF', kraft: true },
  { id: 'fresh', name: 'Xanh tươi', bg: '#FFFFFF', ink: '#173A26', accent: '#2F9E44', accent2: '#F08C00', onAccent: '#FFFFFF' },
  { id: 'sunny', name: 'Vàng nắng', bg: '#FFC93C', ink: '#3A1C0B', accent: '#D62828', accent2: '#3A1C0B', onAccent: '#FFF6E0' },
  { id: 'crimson', name: 'Đỏ trắng', bg: '#FFFFFF', ink: '#7F1414', accent: '#C8102E', accent2: '#1F1F1F', onAccent: '#FFFFFF' },
  { id: 'pastel', name: 'Hồng pastel', bg: '#FFE3EC', ink: '#5A2445', accent: '#C2559C', accent2: '#FF8FAB', onAccent: '#FFFFFF' },
  { id: 'olive', name: 'Ô liu', bg: '#F3F0E4', ink: '#28351A', accent: '#5E7F23', accent2: '#C0583A', onAccent: '#FFFFFF' },
  { id: 'navy', name: 'Navy kem', bg: '#FFF6E5', ink: '#13294B', accent: '#13294B', accent2: '#C8102E', onAccent: '#FFF6E5' },
];
export const fbPalette = (id: string) => FB_PALETTES.find((p) => p.id === id) || FB_PALETTES[0];

export type Motif = 'pizza' | 'bowl' | 'burger' | 'chicken' | 'banhmi' | 'salad' | 'boba' | 'cutlery';
export type Pattern = 'check' | 'stripes' | 'dots' | 'line' | 'none';
export type FbData = Record<string, string>;
export interface FbLook { id: string; name: string; kinds: FbKind[]; palette: string; font: string; motif: Motif; pattern: Pattern; data: FbData }

const D = (brand: string, tagline: string, note: string, website: string, hotline = '0909 123 456'): FbData => ({ brand, tagline, note, hotline, website });
export const FB_LOOKS: FbLook[] = [
  { id: 'pizza-y', name: 'Pizza Ý cổ điển', kinds: ['pizza', 'tray'], palette: 'tomato', font: 'lobster', motif: 'pizza', pattern: 'check', data: D('Pizza Gia Khánh', 'Đế mỏng · nướng lò củi', 'Ngon nóng hổi — giao tận nơi', 'pizzagiakhanh.vn') },
  { id: 'pizza-noir', name: 'Pizza đen vàng', kinds: ['pizza', 'burger', 'meal'], palette: 'noir', font: 'oswald', motif: 'pizza', pattern: 'line', data: D('BẢO PIZZA', 'Napoli style · Since 2019', 'Nóng giòn trong 30 phút', 'baopizza.vn') },
  { id: 'pizza-kraft', name: 'Pizza lò gạch kraft', kinds: ['pizza'], palette: 'kraft-red', font: 'playfair', motif: 'pizza', pattern: 'none', data: D('Pizza Lò Gạch', 'Thủ công · nướng lò gạch', 'Ngon nhất khi còn nóng', 'pizzalogach.vn') },
  { id: 'com-tam', name: 'Cơm tấm Sài Gòn', kinds: ['meal', 'tray'], palette: 'kraft', font: 'baloo', motif: 'bowl', pattern: 'none', data: D('Cơm Tấm Thu Hà', 'Sườn nướng than hoa', 'Ngon nóng hổi — giao tận nơi', 'fb.com/comtamthuha') },
  { id: 'com-vp', name: 'Cơm văn phòng', kinds: ['meal', 'pizza'], palette: 'fresh', font: 'bvp', motif: 'cutlery', pattern: 'dots', data: D('CƠM NHÀ AN KHANG', 'Cơm văn phòng · đủ chất mỗi ngày', 'Đặt trước 10h — giao trưa', 'comnhaankhang.vn') },
  { id: 'burger', name: 'Burger bò nướng', kinds: ['burger', 'tray', 'meal'], palette: 'sunny', font: 'oswald', motif: 'burger', pattern: 'check', data: D('QUỐC BẢO BURGER', 'Bò nướng lửa hồng', 'Cắn là mê — giao nóng tận nơi', 'quocbaoburger.vn') },
  { id: 'ga-ran', name: 'Gà rán giòn', kinds: ['tray', 'burger', 'meal'], palette: 'crimson', font: 'baloo', motif: 'chicken', pattern: 'stripes', data: D('GÀ GIÒN AN KHANG', 'Giòn rụm từng miếng', 'Gà nóng giòn — giao tận nơi', 'gagionankhang.vn') },
  { id: 'banh-mi', name: 'Bánh mì Sài Gòn', kinds: ['tray', 'burger', 'meal'], palette: 'navy', font: 'lobster', motif: 'banhmi', pattern: 'line', data: D('Bánh Mì Bảo Ngọc', 'Giòn rụm · pate nhà làm', 'Nóng giòn mỗi sáng', 'banhmibaongoc.vn') },
  { id: 'healthy', name: 'Healthy · salad', kinds: ['meal', 'pizza', 'tray'], palette: 'olive', font: 'playfair', motif: 'salad', pattern: 'none', data: D('Green Bowl', 'Salad & cơm gạo lứt', 'Ăn lành — sống khoẻ', 'greenbowl.vn') },
  { id: 'an-vat', name: 'Trà sữa · ăn vặt', kinds: ['tray', 'meal', 'burger'], palette: 'pastel', font: 'baloo', motif: 'boba', pattern: 'dots', data: D('Tiệm Ăn Vặt Thu Hà', 'Trà sữa · bánh tráng · xiên que', 'Ăn là ghiền — ship tận nơi', 'fb.com/anvatthuha') },
  { id: 'kraft-min', name: 'Kraft tối giản', kinds: ['meal', 'pizza', 'burger', 'tray'], palette: 'kraft', font: 'montserrat', motif: 'cutlery', pattern: 'none', data: D('BẾP NHÀ GIA KHÁNH', 'Món ngon mỗi ngày', 'Cảm ơn bạn đã ủng hộ quán', 'bepnhagiakhanh.vn') },
];
export const fbLook = (id: string) => FB_LOOKS.find((l) => l.id === id) || FB_LOOKS[0];
export const fbLooksFor = (k: FbKind) => FB_LOOKS.filter((l) => l.kinds.includes(k)).sort((a, b) => a.kinds.indexOf(k) - b.kinds.indexOf(k));

export interface FbSpec { kind: FbKind; look: string; palette: string; font: string; size: string }
export const fbSpecFor = (kind: FbKind, look?: FbLook): FbSpec => {
  const l = look && look.kinds.includes(kind) ? look : fbLooksFor(kind)[0];
  return { kind, look: l.id, palette: l.palette, font: l.font, size: fbSizesFor(kind)[kind === 'pizza' ? 1 : kind === 'tray' ? 1 : 0].id };
};

export interface FbField { key: string; label: string; ph?: string; half?: boolean }
export const FB_FIELDS: FbField[] = [
  { key: 'brand', label: 'Tên quán', ph: 'Pizza Gia Khánh' },
  { key: 'tagline', label: 'Câu giới thiệu', ph: 'Đế mỏng · nướng lò củi' },
  { key: 'note', label: 'Slogan in hông hộp', ph: 'Ngon nóng hổi — giao tận nơi' },
  { key: 'hotline', label: 'Hotline đặt hàng', ph: '0909 123 456', half: true },
  { key: 'website', label: 'Website / fanpage', ph: 'pizzagiakhanh.vn', half: true },
];

// ======================= HÌNH VẼ (đơn vị mm) =======================
export type Item =
  | { t: 'p'; d: string; fill?: string; stroke?: string; sw?: number; op?: number; eo?: boolean }
  | { t: 'x'; s: string; x: number; y: number; size: number; family: string; weight: number; color: string; op?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number }
  | { t: 'img'; href: string; x: number; y: number; w: number; h: number; circle?: boolean };
export interface Art { w: number; h: number; bg: string | null; items: Item[] }

const r2 = (n: number) => Math.round(n * 100) / 100;
const circ = (cx: number, cy: number, r: number) => `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`;
const rect = (x: number, y: number, w: number, h: number) => `M${r2(x)} ${r2(y)}h${r2(w)}v${r2(h)}h${r2(-w)}Z`;
const rrect = (x: number, y: number, w: number, h: number, r: number) => {
  r = Math.min(r, w / 2, h / 2);
  return `M${r2(x + r)} ${r2(y)}H${r2(x + w - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w)} ${r2(y + r)}V${r2(y + h - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + w - r)} ${r2(y + h)}H${r2(x + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x)} ${r2(y + h - r)}V${r2(y + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(x + r)} ${r2(y)}Z`;
};

let mctx: CanvasRenderingContext2D | null = null;
export function textW(s: string, family: string, weight: number, size: number) {
  if (typeof document === 'undefined') return s.length * size * 0.6;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6;
  mctx.font = `${weight} ${size * 10}px "${family}"`;
  return mctx.measureText(s).width / 10;
}
// chữ tự co cho vừa bề ngang max (mm)
function T(s: string | undefined, x: number, y: number, size: number, max: number, family: string, weight: number, color: string,
  o: { op?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number } = {}): Item[] {
  if (!s) return [];
  const w = textW(s, family, weight, size) + (o.ls || 0) * Math.max(0, s.length - 1);
  return [{ t: 'x', s, x, y, size: w > max ? (size * max) / w : size, family, weight, color, ...o }];
}
// tên quán: 1 dòng nếu vừa, chữ bị co quá nhiều thì tách 2 dòng cân nhau
function brandLines(s: string, family: string, weight: number, size: number, max: number): { lines: string[]; size: number } {
  const one = textW(s, family, weight, size);
  if (one <= max) return { lines: [s], size };
  const words = s.trim().split(/\s+/);
  if (words.length < 2 || one * 0.66 < max) return { lines: [s], size: (size * max) / one };
  let best = [s, ''], bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(textW(a, family, weight, size), textW(b, family, weight, size));
    if (w < bestW) { bestW = w; best = [a, b]; }
  }
  return { lines: best, size: Math.min(size, (size * max) / bestW) * 0.92 };
}

// ---- hình món ăn, vẽ trong hộp 100×100 → đặt ở tâm (cx,cy) cỡ s (mm). fg = màu hình, hole = màu khoét chi tiết ----
function icon(m: Motif, cx: number, cy: number, s: number, fg: string, hole: string): Item[] {
  const k = s / 100, X = (v: number) => r2(cx + (v - 50) * k), Y = (v: number) => r2(cy + (v - 50) * k);
  // đổi toạ độ path (lệnh TUYỆT ĐỐI M L Q C H V Z) từ hộp 100×100 sang mm
  const P = (pts: string) => {
    let cmd = 'M', i = 0;
    return (pts.match(/[A-Za-z]|-?[\d.]+/g) || []).map((tk) => {
      if (/[A-Za-z]/.test(tk)) { cmd = tk; i = 0; return tk; }
      const n = +tk, out = cmd === 'H' ? X(n) : cmd === 'V' ? Y(n) : i % 2 === 0 ? X(n) : Y(n);
      i++; return String(out);
    }).join(' ');
  };
  const C = (x: number, y: number, r: number) => circ(X(x), Y(y), r * k);
  const it: Item[] = [];
  const line = (pts: string, sw: number, color = fg) => it.push({ t: 'p', d: P(pts), stroke: color, sw: sw * k });
  switch (m) {
    case 'pizza':
      it.push({ t: 'p', d: P('M14 24 Q50 4 86 24 L50 96 Z'), fill: fg });
      line('M20 33 Q50 16 80 33', 3.2, hole);
      it.push({ t: 'p', d: C(42, 48, 6.5) + C(60, 56, 5.5) + C(49, 72, 5), fill: hole });
      it.push({ t: 'p', d: C(33, 42, 1.8) + C(56, 41, 1.8) + C(44, 60, 1.6) + C(63, 70, 1.4), fill: hole, op: 0.75 });
      break;
    case 'bowl':
      it.push({ t: 'p', d: P('M18 50 Q20 26 50 24 Q80 26 82 50 Z'), fill: fg });
      it.push({ t: 'p', d: P('M8 52 H92 Q90 84 50 90 Q10 84 8 52 Z'), fill: fg });
      it.push({ t: 'p', d: C(36, 40, 2) + C(48, 34, 2) + C(60, 40, 2) + C(42, 46, 1.6) + C(55, 46, 1.6) + C(68, 46, 1.6) + C(30, 47, 1.4), fill: hole });
      line('M8 57 H92', 2.4, hole);
      line('M62 22 L94 4', 3.6); line('M68 27 L97 13', 3.6);
      line('M30 18 Q26 12 30 6', 2.4); line('M42 16 Q38 10 42 4', 2.4);
      break;
    case 'burger':
      it.push({ t: 'p', d: P('M12 46 Q12 14 50 14 Q88 14 88 46 Z'), fill: fg });
      it.push({ t: 'p', d: C(36, 28, 1.6) + C(50, 23, 1.6) + C(63, 29, 1.6) + C(44, 36, 1.5) + C(58, 37, 1.5), fill: hole });
      line('M8 54' + Array.from({ length: 7 }, (_, i) => ` Q${14 + i * 12} 48 ${20 + i * 12} 54`).join(''), 4.6);
      it.push({ t: 'p', d: P('M10 60 H90 V72 H10 Z'), fill: fg });
      it.push({ t: 'p', d: P('M12 78 H88 Q88 92 74 92 H26 Q12 92 12 78 Z'), fill: fg });
      break;
    case 'chicken':
      it.push({ t: 'p', d: P('M34 70 C10 56 22 14 56 14 C90 16 92 56 64 70 C56 74 42 74 34 70 Z'), fill: fg });
      line('M42 72 L22 88', 9);
      it.push({ t: 'p', d: C(15, 86, 6.5) + C(21, 94, 6.5), fill: fg });
      it.push({ t: 'p', d: C(44, 30, 2.2) + C(60, 26, 2) + C(70, 42, 2.2) + C(52, 44, 2) + C(38, 50, 1.8) + C(60, 58, 1.8), fill: hole });
      break;
    case 'banhmi':
      it.push({ t: 'p', d: P('M6 62 Q6 42 30 37 L74 28 Q96 26 94 46 Q92 62 70 66 L24 72 Q6 74 6 62 Z'), fill: fg });
      line('M28 46 L36 62', 3.6, hole); line('M46 41 L54 58', 3.6, hole); line('M64 37 L72 53', 3.6, hole);
      line('M30 86 Q50 80 70 86', 2.6);
      break;
    case 'salad': {
      it.push({ t: 'p', d: P('M8 54 H92 Q90 86 50 92 Q10 86 8 54 Z'), fill: fg });
      const leaf = (x: number, y: number, a: number, l: number) => {
        const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
        const tx = x + ca * l, ty = y + sa * l, mx = x + ca * l * 0.5, my = y + sa * l * 0.5, wv = l * 0.34;
        it.push({ t: 'p', d: `M${X(x)} ${Y(y)}Q${X(mx + px * wv)} ${Y(my + py * wv)} ${X(tx)} ${Y(ty)}Q${X(mx - px * wv)} ${Y(my - py * wv)} ${X(x)} ${Y(y)}Z`, fill: fg });
        line(`M${x} ${y} L${mx + ca * l * 0.3} ${my + sa * l * 0.3}`, 1.6, hole);
      };
      leaf(30, 52, -2.2, 34); leaf(46, 52, -1.75, 40); leaf(60, 52, -1.25, 36); leaf(72, 52, -0.75, 26);
      it.push({ t: 'p', d: C(36, 62, 3) + C(64, 66, 3), fill: hole });
      line('M8 59 H92', 2.4, hole);
      break;
    }
    case 'boba':
      it.push({ t: 'p', d: P('M22 28 Q50 6 78 28 Z'), fill: fg });
      it.push({ t: 'p', d: P('M20 30 H80 V35 H20 Z'), fill: fg });
      it.push({ t: 'p', d: P('M24 38 H76 L68 94 H32 Z'), fill: fg });
      line('M56 18 L70 0', 5.4);
      line('M27 52 H73', 2.4, hole);
      it.push({ t: 'p', d: C(40, 84, 3.4) + C(50, 86, 3.4) + C(60, 84, 3.4) + C(45, 77, 3.2) + C(55, 77, 3.2), fill: hole });
      break;
    default: // cutlery: nĩa + dao
      it.push({ t: 'p', d: P('M24 8 V30 Q24 42 32 45 L31 94 H38 L37 45 Q45 42 45 30 V8 H41.5 V30 H37.5 V8 H33.5 V30 H29.5 V8 Z'), fill: fg });
      it.push({ t: 'p', d: P('M62 8 Q78 18 76 50 L70 52 L70 94 H63 Z'), fill: fg });
      break;
  }
  return it;
}

// điện thoại nhỏ (thay ký tự ☎ — không outline được)
function phoneIcon(cx: number, cy: number, s: number, color: string): Item {
  const k = s / 100, X = (v: number) => r2(cx + (v - 50) * k), Y = (v: number) => r2(cy + (v - 50) * k);
  const d = 'M30 10 Q20 10 17 22 Q14 50 42 78 Q70 100 82 87 L88 80 Q92 73 85 69 L73 61 Q67 57 63 63 L59 67 Q47 61 37 47 Q31 37 35 33 L39 29 Q43 25 39 19 L33 12 Q31 10 30 10 Z';
  return { t: 'p', d: d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_m, a, b) => `${X(+a)} ${Y(+b)}`), fill: color };
}

// ---- hoạ tiết viền / nền ----
function pattern(p: Pattern, w: number, h: number, pal: FbPalette, band: number, sides: 'all' | 'tb' | 'b'): Item[] {
  const it: Item[] = [];
  if (p === 'check') {
    const q = band / 2; let d = '';
    const rows = (y0: number) => { for (let i = 0; i * q < w; i++) for (let r = 0; r < 2; r++) if ((i + r) % 2 === 0) d += rect(i * q, y0 + r * q, q, q); };
    const cols = (x0: number) => { for (let j = 0; band + j * q < h - band; j++) for (let c = 0; c < 2; c++) if ((j + c) % 2 === 0) d += rect(x0 + c * q, band + j * q, q, Math.min(q, h - band - (band + j * q))); };
    if (sides !== 'b') rows(0);
    rows(h - band);
    if (sides === 'all') { cols(0); cols(w - band); }
    it.push({ t: 'p', d, fill: pal.accent });
  } else if (p === 'stripes') {
    const q = band * 0.55; let d = '';
    const strip = (y0: number) => { for (let i = 0; i * q < w; i += 2) d += rect(i * q, y0, q, band); };
    if (sides !== 'b') strip(0);
    strip(h - band);
    it.push({ t: 'p', d, fill: pal.accent });
  } else if (p === 'dots') {
    const g = Math.max(6, Math.min(w, h) * 0.07), r = g * 0.16; let d = '';
    for (let y = g / 2, row = 0; y < h; y += g * 0.87, row++) for (let x = (row % 2 ? g / 2 : 0) + g / 4; x < w; x += g) d += circ(x, y, r);
    it.push({ t: 'p', d, fill: pal.accent, op: 0.16 });
  } else if (p === 'line') {
    const i1 = band * 0.45, i2 = band * 0.75;
    if (sides === 'all') {
      it.push({ t: 'p', d: rect(i1, i1, w - 2 * i1, h - 2 * i1), stroke: pal.accent, sw: band * 0.12 });
      it.push({ t: 'p', d: rect(i2, i2, w - 2 * i2, h - 2 * i2), stroke: pal.accent, sw: band * 0.05 });
    } else {
      it.push({ t: 'p', d: `M0 ${r2(h - i1)}H${r2(w)}`, stroke: pal.accent, sw: band * 0.12 });
      if (sides === 'tb') it.push({ t: 'p', d: `M0 ${r2(i1)}H${r2(w)}`, stroke: pal.accent, sw: band * 0.12 });
    }
  }
  return it;
}

export interface Ctx { look: FbLook; pal: FbPalette; font: FbFont; data: FbData; logo?: string }

function badge(cx: number, cy: number, r: number, c: Ctx): Item[] {
  const { pal } = c;
  if (c.logo) {
    return [
      { t: 'p', d: circ(cx, cy, r), fill: '#FFFFFF' },
      { t: 'p', d: circ(cx, cy, r * 0.97), stroke: pal.accent, sw: r * 0.06 },
      { t: 'img', href: c.logo, x: cx - r * 0.84, y: cy - r * 0.84, w: r * 1.68, h: r * 1.68, circle: true },
    ];
  }
  return [
    { t: 'p', d: circ(cx, cy, r), fill: pal.accent },
    { t: 'p', d: circ(cx, cy, r * 0.86), stroke: pal.onAccent, sw: r * 0.035, op: 0.7 },
    ...icon(c.look.motif, cx, cy + r * 0.02, r * 1.08, pal.onAccent, pal.accent),
  ];
}

function pill(cx: number, cy: number, s: string, size: number, max: number, c: Ctx): Item[] {
  const { pal } = c;
  const tsize = Math.min(size, (size * (max - size * 2.6)) / Math.max(1, textW(s, BODY, 800, size)));
  const tw = textW(s, BODY, 800, tsize);
  const ph = tsize * 2, pw = tw + tsize * 2.6 + ph * 0.5;
  const x0 = cx - pw / 2;
  return [
    { t: 'p', d: rrect(x0, cy - ph / 2, pw, ph, ph / 2), fill: pal.accent },
    phoneIcon(x0 + ph * 0.62, cy, tsize * 1.15, pal.onAccent),
    { t: 'x', s, x: x0 + ph * 0.62 + tsize * 0.95, y: cy + tsize * 0.36, size: tsize, family: BODY, weight: 800, color: pal.onAccent, anchor: 'start' },
  ];
}

const bgOf = (pal: FbPalette) => (pal.kraft ? null : pal.bg);

// MẶT CHÍNH (nắp hộp)
export function heroArt(w: number, h: number, c: Ctx): Art {
  const { pal, font, data, look } = c;
  const m = Math.min(w, h), it: Item[] = [];
  const band = m * 0.075;
  it.push(...pattern(look.pattern, w, h, pal, band, 'all'));
  const inset = look.pattern === 'check' || look.pattern === 'stripes' ? band : look.pattern === 'line' ? band * 0.8 : m * 0.04;
  const wide = w / h > 1.3;
  const sizeB = font.family === 'Lobster' || font.family === 'Playfair Display' ? 0.13 : 0.115;
  if (!wide) {
    // xếp dọc: huy hiệu → tên → câu giới thiệu → gạch → slogan → hotline; quá cao thì co đều cả khối
    const noteColor = pal.accent2 === pal.ink ? pal.accent : pal.accent2;
    const maxW = w - 2 * inset - m * 0.1;
    const plan = (f: number) => {
      const r = m * 0.165 * f;
      const bl = brandLines(data.brand || '', font.family, font.weight, m * sizeB * f, maxW);
      let y = 2 * r + m * 0.04 * f + bl.size * 0.9;
      const brandY = y;
      y += (bl.lines.length - 1) * bl.size * 1.08 + bl.size * 0.38 + m * 0.05 * f;
      const tagY = y; y += m * 0.04 * f;
      const divY = y; y += m * 0.055 * f;
      const noteY = data.note ? y : y - m * 0.03 * f;
      const ps = m * 0.038 * f;
      const pillY = noteY + m * 0.04 * f + ps * 1.4;
      const total = data.hotline ? pillY + ps : noteY + m * 0.015;
      return { f, r, bl, brandY, tagY, divY, noteY, ps, pillY, total };
    };
    const avail = h - 2 * inset - m * 0.06;
    let L = plan(1);
    for (let f = 0.95; L.total > avail && f > 0.5; f -= 0.05) L = plan(f);
    const y0 = inset + m * 0.03 + Math.max(0, (avail - L.total) / 2);
    it.push(...badge(w / 2, y0 + L.r, L.r, c));
    L.bl.lines.forEach((ln, i) => it.push({ t: 'x', s: ln, x: w / 2, y: y0 + L.brandY + i * L.bl.size * 1.08, size: L.bl.size, family: font.family, weight: font.weight, color: pal.ink }));
    it.push(...T(data.tagline, w / 2, y0 + L.tagY, m * 0.045 * L.f, maxW - m * 0.02, BODY, 600, pal.ink, { op: 0.85 }));
    it.push({ t: 'p', d: `M${r2(w / 2 - m * 0.06)} ${r2(y0 + L.divY)}H${r2(w / 2 + m * 0.06)}`, stroke: pal.accent2, sw: m * 0.008 });
    it.push(...T(data.note, w / 2, y0 + L.noteY, m * 0.04 * L.f, maxW - m * 0.02, SCRIPT, 700, noteColor));
    if (data.hotline) it.push(...pill(w / 2, y0 + L.pillY, data.hotline, L.ps, w * 0.62, c));
  } else {
    const r = h * 0.25;
    const bx = inset + m * 0.06 + r;
    it.push(...badge(bx, h / 2, r, c));
    const x0 = bx + r + m * 0.08, maxW = w - inset - m * 0.06 - x0, cx = x0 + maxW / 2;
    const bl = brandLines(data.brand || '', font.family, font.weight, h * sizeB * 1.05, maxW);
    const blockH = bl.lines.length * bl.size * 1.08 + h * 0.36;
    let y = h / 2 - blockH / 2 + bl.size * 0.85;
    for (const ln of bl.lines) { it.push({ t: 'x', s: ln, x: cx, y, size: bl.size, family: font.family, weight: font.weight, color: pal.ink }); y += bl.size * 1.08; }
    it.push(...T(data.tagline, cx, y + h * 0.01, h * 0.055, maxW, BODY, 600, pal.ink, { op: 0.85 }));
    y += h * 0.1;
    it.push(...T(data.note, cx, y, h * 0.05, maxW, SCRIPT, 700, pal.accent2 === pal.ink ? pal.accent : pal.accent2));
    if (data.hotline) it.push(...pill(cx, Math.min(h - inset - h * 0.09, y + h * 0.13), data.hotline, h * 0.045, maxW, c));
  }
  return { w, h, bg: bgOf(pal), items: it };
}

// MẶT TRƯỚC (dải dài thấp)
export function bandArt(w: number, h: number, c: Ctx, top = 0): Art {
  const { pal, font, data, look } = c;
  const it: Item[] = [];
  const band = h * 0.16;
  const pat: Pattern = look.pattern === 'dots' ? 'none' : look.pattern;
  it.push(...pattern(pat, w, h, pal, band, 'b'));
  const usable = h - (pat === 'check' || pat === 'stripes' ? band : 0) - top;
  const cy = top + usable / 2;
  if (w / h >= 3.2) {
    const r = usable * 0.3;
    it.push(...badge(h * 0.18 + r, cy, r, c));
    const x0 = h * 0.18 + 2 * r + h * 0.14;
    const right = data.hotline ? Math.min(textW(data.hotline, BODY, 800, usable * 0.2), w * 0.3) + usable * 0.5 : 0;
    const avail = w - x0 - right - h * 0.3;
    const bs = usable * 0.34, bw = textW(data.brand || '', font.family, font.weight, bs);
    // tên dài → 2 dòng (giữ chữ to), không thì 1 dòng
    const bl = brandLines(data.brand || '', font.family, font.weight, bs, avail);
    const two = bl.lines.length > 1 ? { lines: bl.lines, size: Math.min(bl.size, usable * 0.27) } : bl;
    two.lines.forEach((ln, i) => it.push(...T(ln, x0, cy + two.size * 0.35 + (i - (two.lines.length - 1) / 2) * two.size * 1.05, two.size, avail, font.family, font.weight, pal.ink, { anchor: 'start' })));
    // slogan ở giữa: chỉ khi còn chỗ (thiếu thì bỏ, ưu tiên tên quán to rõ)
    if (data.note && bw < avail && two.lines.length === 1) {
      const nx0 = x0 + bw + h * 0.25, nmax = w - nx0 - right - h * 0.2, ns = usable * 0.2;
      if (nmax > textW(data.note, SCRIPT, 700, ns) * 0.6) it.push(...T(data.note, nx0 + nmax / 2, cy + usable * 0.08, ns, nmax, SCRIPT, 700, pal.accent2 === pal.ink ? pal.accent : pal.accent2));
    }
    if (data.hotline) {
      const s = usable * 0.2, tw = Math.min(textW(data.hotline, BODY, 800, s), w * 0.3);
      it.push(phoneIcon(w - h * 0.22 - tw - s * 0.9, cy, s * 1.1, pal.accent));
      it.push(...T(data.hotline, w - h * 0.22, cy + s * 0.36, s, w * 0.3, BODY, 800, pal.ink, { anchor: 'end' }));
    }
  } else {
    it.push(...T(data.brand, w / 2, cy + usable * 0.02, usable * 0.3, w * 0.84, font.family, font.weight, pal.ink));
    if (data.hotline) it.push(...T(`Đặt hàng: ${data.hotline}`, w / 2, cy + usable * 0.3, usable * 0.13, w * 0.8, BODY, 800, pal.accent2 === pal.ink ? pal.accent : pal.accent2));
  }
  return { w, h, bg: bgOf(pal), items: it };
}

// MẶT HÔNG
export function sideArt(w: number, h: number, c: Ctx): Art {
  const { pal, font, data, look } = c;
  const it: Item[] = [];
  const m = Math.min(w, h);
  const band = m * 0.16;
  const pat: Pattern = look.pattern === 'dots' ? 'dots' : look.pattern === 'line' ? 'line' : look.pattern;
  it.push(...pattern(pat, w, h, pal, band, 'b'));
  const usable = h - (pat === 'check' || pat === 'stripes' ? band : 0);
  const iconS = usable * 0.42;
  const tall = h > w * 0.75;
  if (tall) {
    it.push(...icon(look.motif, w / 2, usable * 0.32, iconS, pal.accent, pal.kraft ? KRAFT : pal.bg));
    const bl = brandLines(data.brand || '', font.family, font.weight, usable * 0.13, w * 0.84);
    bl.lines.forEach((ln, i) => it.push(...T(ln, w / 2, usable * 0.66 + i * bl.size * 1.05, bl.size, w * 0.84, font.family, font.weight, pal.ink)));
    it.push(...T(data.website, w / 2, usable * 0.66 + bl.lines.length * bl.size * 1.05 + usable * 0.06, usable * 0.07, w * 0.84, BODY, 600, pal.ink, { op: 0.8 }));
  } else {
    const bl = brandLines(data.brand || '', font.family, font.weight, usable * 0.28, w * 0.64);
    const bsz = bl.lines.length > 1 ? Math.min(bl.size, usable * 0.2) : bl.size;
    const tw = Math.min(w * 0.64, Math.max(...bl.lines.map((ln) => textW(ln, font.family, font.weight, bsz))));
    const gx = (w - (iconS + usable * 0.12 + tw)) / 2;
    it.push(...icon(look.motif, gx + iconS / 2, usable * 0.42, iconS, pal.accent, pal.kraft ? KRAFT : pal.bg));
    bl.lines.forEach((ln, i) => it.push(...T(ln, gx + iconS + usable * 0.12, usable * 0.42 + bsz * 0.35 + (i - (bl.lines.length - 1) / 2) * bsz * 1.05, bsz, w * 0.64, font.family, font.weight, pal.ink, { anchor: 'start' })));
    it.push(...T(data.website, w / 2, usable * 0.84, Math.min(usable * 0.12, bsz * 0.62), w * 0.8, BODY, 600, pal.ink, { op: 0.8 }));
  }
  return { w, h, bg: bgOf(pal), items: it };
}

// MẶT SAU
export function backArt(w: number, h: number, c: Ctx): Art {
  const { pal, data, look } = c;
  const it: Item[] = [];
  const band = h * 0.16;
  const pat: Pattern = look.pattern === 'dots' ? 'none' : look.pattern;
  it.push(...pattern(pat, w, h, pal, band, 'b'));
  const usable = h - (pat === 'check' || pat === 'stripes' ? band : 0);
  it.push(...T(data.note || data.tagline, w / 2, usable * 0.5, usable * 0.26, w * 0.82, SCRIPT, 700, pal.accent2 === pal.ink ? pal.accent : pal.accent2));
  it.push(...T([data.website, data.hotline].filter(Boolean).join('  ·  '), w / 2, usable * 0.8, usable * 0.13, w * 0.82, BODY, 600, pal.ink, { op: 0.8 }));
  return { w, h, bg: bgOf(pal), items: it };
}

// ĐÁY / nắp gài: nền trơn + 1 dòng nhỏ
export function plainArt(w: number, h: number, c: Ctx, text?: string): Art {
  const it: Item[] = [];
  if (text) it.push(...T(text, w / 2, h / 2 + Math.min(w, h) * 0.04, Math.min(w, h) * 0.11, w * 0.7, BODY, 600, c.pal.ink, { op: 0.65 }));
  return { w, h, bg: bgOf(c.pal), items: it };
}

// ---- vẽ Art: SVG ----
let clipSeq = 0;
export function ArtG({ art }: { art: Art }) {
  const [pre] = useState(() => `fbc${++clipSeq}`);
  return (
    <>
      {art.bg && <rect x={0} y={0} width={art.w} height={art.h} fill={art.bg} />}
      {art.items.map((a, i) => {
        if (a.t === 'p') return <path key={i} d={a.d} fill={a.fill ?? 'none'} stroke={a.stroke} strokeWidth={a.sw} opacity={a.op} fillRule={a.eo ? 'evenodd' : undefined} strokeLinecap="round" strokeLinejoin="round" />;
        if (a.t === 'img') {
          const id = `${pre}-${i}`;
          return (
            <g key={i}>
              {a.circle && <clipPath id={id}><circle cx={a.x + a.w / 2} cy={a.y + a.h / 2} r={Math.min(a.w, a.h) / 2} /></clipPath>}
              <image href={a.href} x={a.x} y={a.y} width={a.w} height={a.h} preserveAspectRatio={a.circle ? 'xMidYMid slice' : 'xMidYMid meet'} clipPath={a.circle ? `url(#${id})` : undefined} />
            </g>
          );
        }
        return <text key={i} x={a.x} y={a.y} fontFamily={`"${a.family}"`} fontWeight={a.weight} fontSize={a.size} fill={a.color} opacity={a.op} textAnchor={a.anchor ?? 'middle'} letterSpacing={a.ls}>{a.s}</text>;
      })}
    </>
  );
}

// ---- vẽ Art: Canvas (texture 3D). k = px/mm; ảnh logo phải nạp sẵn (imgs) ----
export function drawArt(ctx: CanvasRenderingContext2D, art: Art, k: number, imgs: Map<string, HTMLImageElement>) {
  ctx.save(); ctx.scale(k, k);
  if (art.bg) { ctx.fillStyle = art.bg; ctx.fillRect(0, 0, art.w, art.h); }
  for (const a of art.items) {
    ctx.save();
    if (a.t === 'p') {
      ctx.globalAlpha = a.op ?? 1;
      const path = new Path2D(a.d);
      if (a.fill) { ctx.fillStyle = a.fill; ctx.fill(path, a.eo ? 'evenodd' : 'nonzero'); }
      if (a.stroke) { ctx.strokeStyle = a.stroke; ctx.lineWidth = a.sw ?? 0.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); }
    } else if (a.t === 'img') {
      const im = imgs.get(a.href);
      if (im) {
        if (a.circle) { ctx.beginPath(); ctx.arc(a.x + a.w / 2, a.y + a.h / 2, Math.min(a.w, a.h) / 2, 0, Math.PI * 2); ctx.clip(); }
        const s = a.circle ? Math.max(a.w / im.width, a.h / im.height) : Math.min(a.w / im.width, a.h / im.height);
        const dw = im.width * s, dh = im.height * s;
        ctx.drawImage(im, a.x + (a.w - dw) / 2, a.y + (a.h - dh) / 2, dw, dh);
      }
    } else {
      ctx.globalAlpha = a.op ?? 1;
      ctx.font = `${a.weight} ${a.size}px "${a.family}"`;
      ctx.fillStyle = a.color; ctx.textAlign = a.anchor === 'start' ? 'left' : a.anchor === 'end' ? 'right' : 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(a.s, a.x, a.y);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ======================= KHUÔN BẾ =======================
type Pt = [number, number];
interface Poly { pts: Pt[] }
export type Role = 'hero' | 'band' | 'bandSlot' | 'side' | 'back' | 'plain' | 'tuck';
export interface Panel { x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | -90; role: Role; clip?: Pt[] }
export interface Dieline { polys: Poly[]; panels: Panel[]; folds: [Pt, Pt][]; holes: string; W: number; H: number; ox: number; oy: number }

const R = (x: number, y: number, w: number, h: number): Poly => ({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
const Q = (...pts: Pt[]): Poly => ({ pts });

function slot(x: number, y: number, w: number, h: number) { return rrect(x, y, w, h, Math.min(w, h) / 2); }

function buildDie(kind: FbKind, s: FbSize): Omit<Dieline, 'W' | 'H' | 'ox' | 'oy'> {
  const W = s.w, Dd = s.d;
  const polys: Poly[] = [], panels: Panel[] = [], folds: [Pt, Pt][] = [];
  let holes = '';
  if (kind === 'pizza') {
    const H = s.h, ear = H - 8;
    polys.push(R(0, 0, W, Dd)); panels.push({ x: 0, y: 0, w: W, h: Dd, rot: 0, role: 'plain' });
    // thành trước (2 lớp, có tai khoá cài xuống đáy)
    polys.push(R(0, Dd, W, H)); panels.push({ x: 0, y: Dd, w: W, h: H, rot: 180, role: 'band' });
    polys.push(R(2, Dd + H, W - 4, H - 2));
    for (const fx of [0.25, 0.75]) { polys.push(R(W * fx - 12, Dd + 2 * H - 2, 24, 6)); holes += slot(W * fx - 13, Dd - 7, 26, 3); }
    // thành sau + nắp + lưỡi gài
    polys.push(R(0, -H, W, H)); panels.push({ x: 0, y: -H, w: W, h: H, rot: 0, role: 'back' });
    polys.push(R(0, -H - Dd, W, Dd)); panels.push({ x: 0, y: -H - Dd, w: W, h: Dd, rot: 180, role: 'hero' });
    const tH = H - 6, ty = -H - Dd;
    polys.push(Q([5, ty], [5, ty - tH + 8], [13, ty - tH], [W - 13, ty - tH], [W - 5, ty - tH + 8], [W - 5, ty]));
    panels.push({ x: 5, y: ty - tH, w: W - 10, h: tH, rot: 180, role: 'tuck' });
    // 2 hông (2 lớp, có lỗ thoát hơi)
    for (const sgn of [-1, 1] as const) {
      const x0 = sgn < 0 ? -H : W, xi = sgn < 0 ? -2 * H + 2 : W + H;
      polys.push(R(x0, 0, H, Dd)); panels.push({ x: x0, y: 0, w: H, h: Dd, rot: sgn < 0 ? -90 : 90, role: 'side' });
      polys.push(R(xi, 3, H - 2, Dd - 6));
      for (const fy of [0.3, 0.7]) {
        polys.push(R(sgn < 0 ? xi - 6 : xi + H - 2, Dd * fy - 12, 6, 24));
        holes += slot(sgn < 0 ? 4 : W - 7, Dd * fy - 13, 3, 26);
        holes += circ(x0 + H / 2, Dd * fy, 4);
      }
      // tai gấp ở 2 đầu thành sau / thành trước (cách hông 1.5mm)
      const ex = sgn < 0 ? 0 : W, eo = sgn < 0 ? -ear : ear;
      polys.push(Q([ex, -H], [ex + eo, -H + 8], [ex + eo, -1.5], [ex, -1.5]));
      polys.push(Q([ex, Dd + 1.5], [ex + eo, Dd + 1.5], [ex + eo, Dd + H - 8], [ex, Dd + H]));
      // tai chắn bụi 2 bên nắp
      polys.push(Q([ex, -H - 6], [ex + (sgn < 0 ? -(H - 6) : H - 6), -H - 16], [ex + (sgn < 0 ? -(H - 6) : H - 6), -H - Dd + 16], [ex, -H - Dd + 6]));
    }
  } else if (kind === 'meal') {
    const H = s.h;
    polys.push(R(0, 0, W, Dd)); panels.push({ x: 0, y: 0, w: W, h: Dd, rot: 0, role: 'plain' });
    polys.push(R(0, Dd, W, H)); panels.push({ x: 0, y: Dd, w: W, h: H, rot: 180, role: 'bandSlot' });
    polys.push(R(0, -H, W, H)); panels.push({ x: 0, y: -H, w: W, h: H, rot: 0, role: 'back' });
    polys.push(R(-H, 0, H, Dd)); panels.push({ x: -H, y: 0, w: H, h: Dd, rot: -90, role: 'side' });
    polys.push(R(W, 0, H, Dd)); panels.push({ x: W, y: 0, w: H, h: Dd, rot: 90, role: 'side' });
    // góc gấp vát (web corner) → hộp kín dầu, không cần keo góc
    for (const [cx, cy, sx, sy] of [[0, Dd, -1, 1], [W, Dd, 1, 1], [0, 0, -1, -1], [W, 0, 1, -1]] as const) {
      polys.push(R(sx < 0 ? cx - H : cx, sy < 0 ? cy - H : cy, H, H));
      folds.push([[cx, cy], [cx + sx * H, cy + sy * H]]);
    }
    polys.push(R(0, -H - Dd, W, Dd)); panels.push({ x: 0, y: -H - Dd, w: W, h: Dd, rot: 180, role: 'hero' });
    // lưỡi gài giữa nắp → cài vào khe trên thành trước
    const tH = 16, ty = -H - Dd, tw = Math.min(40, W * 0.24);
    polys.push(Q([W / 2 - tw / 2, ty], [W / 2 - tw / 2 + 3, ty - tH], [W / 2 + tw / 2 - 3, ty - tH], [W / 2 + tw / 2, ty]));
    panels.push({ x: W / 2 - tw / 2, y: ty - tH, w: tw, h: tH, rot: 180, role: 'tuck', clip: [[W / 2 - tw / 2, ty], [W / 2 - tw / 2 + 3, ty - tH], [W / 2 + tw / 2 - 3, ty - tH], [W / 2 + tw / 2, ty]] });
    for (const sgn of [-1, 1] as const) {
      const ex = sgn < 0 ? 0 : W, fw = sgn < 0 ? -(H - 14) : H - 14;
      polys.push(Q([ex, -H - 6], [ex + fw, -H - 14], [ex + fw, -H - Dd + 14], [ex, -H - Dd + 6]));
    }
    holes += slot(W / 2 - tw / 2 - 1, Dd + H - 13, tw + 2, 2.5);
  } else if (kind === 'burger') {
    const h = s.h / 2, B = W;
    // khay dưới
    polys.push(R(0, 0, B, B)); panels.push({ x: 0, y: 0, w: B, h: B, rot: 0, role: 'plain' });
    polys.push(R(0, B, B, h)); panels.push({ x: 0, y: B, w: B, h, rot: 180, role: 'band' });
    polys.push(R(-h, 0, h, B)); panels.push({ x: -h, y: 0, w: h, h: B, rot: -90, role: 'side' });
    polys.push(R(B, 0, h, B)); panels.push({ x: B, y: 0, w: h, h: B, rot: 90, role: 'side' });
    for (const [cx, sx] of [[0, -1], [B, 1]] as const) { polys.push(R(sx < 0 ? cx - h : cx, B, h, h)); folds.push([[cx, B], [cx + sx * h, B + h]]); }
    polys.push(R(0, -h, B, h)); panels.push({ x: 0, y: -h, w: B, h, rot: 0, role: 'back' });
    // tai dán thành sau khay dưới (cắt rời thành sau 1.5mm)
    for (const sgn of [-1, 1] as const) {
      const x1 = sgn < 0 ? -h + 1.5 : B + 1.5, x2 = sgn < 0 ? -1.5 : B + h - 1.5;
      polys.push(Q([x1, 0], [x1 + (sgn < 0 ? 3 : 0), -(h - 8)], [x2 - (sgn < 0 ? 0 : 3), -(h - 8)], [x2, 0]));
    }
    // khay nắp (lật ngược, nối bản lề ở thành sau)
    const ly = -2 * h - B;
    polys.push(R(0, -2 * h, B, h)); panels.push({ x: 0, y: -2 * h, w: B, h, rot: 180, role: 'plain' });
    polys.push(R(0, ly, B, B)); panels.push({ x: 0, y: ly, w: B, h: B, rot: 180, role: 'hero' });
    polys.push(R(0, ly - h, B, h)); panels.push({ x: 0, y: ly - h, w: B, h, rot: 180, role: 'band' });
    polys.push(Q([B / 2 - 14, ly - h], [B / 2 - 11, ly - h - 9], [B / 2 + 11, ly - h - 9], [B / 2 + 14, ly - h]));
    polys.push(R(-h, ly, h, B)); panels.push({ x: -h, y: ly, w: h, h: B, rot: 90, role: 'side' });
    polys.push(R(B, ly, h, B)); panels.push({ x: B, y: ly, w: h, h: B, rot: -90, role: 'side' });
    for (const [cx, sx] of [[0, -1], [B, 1]] as const) { polys.push(R(sx < 0 ? cx - h : cx, ly - h, h, h)); folds.push([[cx, ly], [cx + sx * h, ly - h]]); }
    for (const sgn of [-1, 1] as const) {
      const x1 = sgn < 0 ? -h + 1.5 : B + 1.5, x2 = sgn < 0 ? -1.5 : B + h - 1.5;
      polys.push(Q([x1, -2 * h], [x2, -2 * h], [x2 - (sgn < 0 ? 0 : 3), -2 * h + (h - 8)], [x1 + (sgn < 0 ? 3 : 0), -2 * h + (h - 8)]));
    }
    holes += slot(B / 2 - 12.5, B + h - 8, 25, 2.5);
  } else {
    // khay thuyền: thành loe ra ngoài
    const H = s.h, f = H * 0.32;
    polys.push(R(0, 0, W, Dd)); panels.push({ x: 0, y: 0, w: W, h: Dd, rot: 0, role: 'plain' });
    const front: Pt[] = [[0, Dd], [W, Dd], [W + f, Dd + H], [-f, Dd + H]];
    const back: Pt[] = [[0, 0], [-f, -H], [W + f, -H], [W, 0]];
    const left: Pt[] = [[0, 0], [0, Dd], [-H, Dd + f], [-H, -f]];
    const right: Pt[] = [[W, 0], [W + H, -f], [W + H, Dd + f], [W, Dd]];
    polys.push(Q(...front), Q(...back), Q(...left), Q(...right));
    panels.push({ x: -f, y: Dd, w: W + 2 * f, h: H, rot: 180, role: 'band', clip: front });
    panels.push({ x: -f, y: -H, w: W + 2 * f, h: H, rot: 0, role: 'back', clip: back });
    panels.push({ x: -H, y: -f, w: H, h: Dd + 2 * f, rot: -90, role: 'side', clip: left });
    panels.push({ x: W, y: -f, w: H, h: Dd + 2 * f, rot: 90, role: 'side', clip: right });
    for (const [cx, cy, sx, sy] of [[0, Dd, -1, 1], [W, Dd, 1, 1], [0, 0, -1, -1], [W, 0, 1, -1]] as const) {
      polys.push(Q([cx, cy], [cx + sx * f, cy + sy * H], [cx + sx * H, cy + sy * H], [cx + sx * H, cy + sy * f]));
      folds.push([[cx, cy], [cx + sx * H, cy + sy * H]]);
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
        const t = ((v[0] - a[0]) * dx + (v[1] - a[1]) * dy) / L2;
        if (t <= 1e-6 || t >= 1 - 1e-6) continue;
        const px = a[0] + dx * t, py = a[1] + dy * t;
        if (Math.hypot(px - v[0], py - v[1]) < 0.01) ts.push(t);
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
    for (let guard = 0; guard < 5000 && key(cur) !== key(s0.a); guard++) {
      loop.push(cur);
      const nx = (adj.get(key(cur)) || []).find((e) => !used.has(e.s));
      if (!nx) break;
      used.add(nx.s); cur = nx.o;
    }
    out.push(loop);
  });
  return out;
}

export interface DieOut extends Dieline { cut: string; cutLoops: number; foldD: string; kindName: string }
export function fbDieline(spec: FbSpec): DieOut {
  const s = fbSize(spec.size);
  const base = buildDie(spec.kind, s);
  const all = base.polys.flatMap((p) => p.pts);
  const minX = Math.min(...all.map((p) => p[0])), minY = Math.min(...all.map((p) => p[1]));
  const maxX = Math.max(...all.map((p) => p[0])), maxY = Math.max(...all.map((p) => p[1]));
  const M = 12;
  const ox = M - minX, oy = M - minY;
  const segs = splitEdges(base.polys);
  const ls = loops(segs.filter((e) => e.n === 1));
  const cut = ls.map((l) => `M${l.map((p) => `${r2(p[0] + ox)} ${r2(p[1] + oy)}`).join('L')}Z`).join('');
  const foldD = [...segs.filter((e) => e.n > 1).map((e) => [e.a, e.b] as [Pt, Pt]), ...base.folds]
    .map(([a, b]) => `M${r2(a[0] + ox)} ${r2(a[1] + oy)}L${r2(b[0] + ox)} ${r2(b[1] + oy)}`).join('');
  return { ...base, W: maxX - minX + 2 * M, H: maxY - minY + 2 * M + 14, ox, oy, cut, cutLoops: ls.length, foldD, kindName: FB_KINDS.find((k) => k.id === spec.kind)!.name };
}

export function ctxOf(spec: FbSpec, data: FbData, logo?: string): Ctx {
  return { look: fbLook(spec.look), pal: fbPalette(spec.palette), font: fbFont(spec.font), data, logo };
}
export function artFor(role: Role, w: number, h: number, c: Ctx): Art {
  if (role === 'hero') return heroArt(w, h, c);
  if (role === 'band') return bandArt(w, h, c);
  if (role === 'bandSlot') return bandArt(w, h, c, 15); // hộp cơm: chừa 15mm trên cho lưỡi gài + khe
  if (role === 'side') return sideArt(w, h, c);
  if (role === 'back') return backArt(w, h, c);
  if (role === 'tuck') return plainArt(w, h, c);
  return plainArt(w, h, c);
}

const CUT = '#E6007E', FOLD = '#009FE3';

// Dàn khuôn bế: preview = hiện màu kraft dưới nền (bản in kraft KHÔNG in nền); labels = chú thích
export function FoodboxDieline({ spec, data, logo, preview = false, style }: { spec: FbSpec; data: FbData; logo?: string; preview?: boolean; style?: CSSProperties }) {
  const die = fbDieline(spec);
  const c = ctxOf(spec, data, logo);
  const [uid] = useState(() => `fbd${++clipSeq}`);
  const s = fbSize(spec.size);
  const sh = (p: Poly) => p.pts.map((q) => `${r2(q[0] + die.ox)},${r2(q[1] + die.oy)}`).join(' ');
  const shapes: ReactNode[] = die.polys.map((p, i) => <polygon key={i} points={sh(p)} />);
  const boardTxt = spec.kind === 'pizza' ? 'Carton sóng E' : c.pal.kraft ? 'Giấy kraft chống dầu' : 'Giấy Ivory tráng PE';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${r2(die.W)} ${r2(die.H)}`} width={`${r2(die.W)}mm`} height={`${r2(die.H)}mm`} style={style} data-testid="fb-dieline">
      <defs>
        {die.panels.map((pn, i) => (
          <clipPath key={i} id={`${uid}-p${i}`}>
            {pn.clip ? <polygon points={pn.clip.map((q) => `${r2(q[0] + die.ox)},${r2(q[1] + die.oy)}`).join(' ')} /> : <rect x={pn.x + die.ox} y={pn.y + die.oy} width={pn.w} height={pn.h} />}
          </clipPath>
        ))}
      </defs>
      <rect x={0} y={0} width={die.W} height={die.H} fill="#FFFFFF" />
      {preview && c.pal.kraft && <g fill={KRAFT} opacity={0.55}>{shapes}</g>}
      <g id="In">
        {!c.pal.kraft && <g fill={c.pal.bg} stroke={c.pal.bg} strokeWidth={FB_BLEED * 2} strokeLinejoin="miter">{shapes}</g>}
        {die.panels.map((pn, i) => {
          const aw = pn.rot === 90 || pn.rot === -90 ? pn.h : pn.w, ah = pn.rot === 90 || pn.rot === -90 ? pn.w : pn.h;
          const art = artFor(pn.role, aw, ah, c);
          const cx = pn.x + die.ox + pn.w / 2, cy = pn.y + die.oy + pn.h / 2;
          return (
            <g key={i} clipPath={`url(#${uid}-p${i})`} data-panel={pn.role}>
              <rect data-panel-rect="1" x={pn.x + die.ox} y={pn.y + die.oy} width={pn.w} height={pn.h} fill="none" />
              <g transform={`translate(${r2(cx)} ${r2(cy)}) rotate(${pn.rot}) translate(${r2(-aw / 2)} ${r2(-ah / 2)})`}>
                <ArtG art={art} />
              </g>
            </g>
          );
        })}
      </g>
      <g id="Fold" fill="none" stroke={FOLD} strokeWidth={0.35} strokeDasharray="3 2"><path d={die.foldD} /></g>
      <g id="CutContour" fill="none" stroke={CUT} strokeWidth={0.35}>
        <path d={die.cut} data-cut="outer" />
        {die.holes && <path d={die.holes} transform={`translate(${r2(die.ox)} ${r2(die.oy)})`} data-cut="holes" />}
      </g>
      <g data-legend="1" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.4} fill="#475569">
        <text x={12} y={die.H - 10}>{`${die.kindName} ${s.w}×${s.d}×${s.h}mm · ${boardTxt} · lề in ${FB_BLEED}mm`}</text>
        {c.pal.kraft && <text x={90} y={die.H - 4}>giấy kraft: không in nền</text>}
        <path d={`M12 ${r2(die.H - 5.2)}h10`} stroke={CUT} strokeWidth={0.5} />
        <text x={25} y={die.H - 4}>đường cắt</text>
        <path d={`M52 ${r2(die.H - 5.2)}h10`} stroke={FOLD} strokeWidth={0.5} strokeDasharray="3 2" />
        <text x={65} y={die.H - 4}>đường gấp</text>
      </g>
    </svg>
  );
}

// thumbnail mẫu: mặt nắp
export function HeroThumb({ spec, data, logo, style }: { spec: FbSpec; data: FbData; logo?: string; style?: CSSProperties }) {
  const w = 160, h = 120; // mọi loại hộp: thumbnail = mặt nắp chuẩn 4:3 (nhận diện mẫu)
  const art = heroArt(w, h, ctxOf(spec, data, logo));
  const pal = fbPalette(spec.palette);
  return (
    <svg viewBox={`0 0 ${r2(w)} ${r2(h)}`} style={style} preserveAspectRatio="xMidYMid meet">
      {pal.kraft && <rect width={w} height={h} fill={KRAFT} />}
      <ArtG art={art} />
    </svg>
  );
}
