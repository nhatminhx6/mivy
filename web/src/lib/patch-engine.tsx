'use client';
// Patch thêu · huy hiệu vải: 1 engine SVG (đơn vị mm) = HÌNH × BỐ CỤC × BẢNG MÀU CHỈ × FONT.
// 3 loại: thêu (≤8 màu chỉ, vân satin/fill), in chuyển nhiệt (đủ màu), PVC dẻo (≤6 màu, nổi lớp).
// Viền: vắt sổ (merrow, chỉ hình đơn giản) / cắt nóng (hot-cut, hình phức tạp). Đế: ủi / dán gai / may.
// Chế độ vẽ: art (xem trước có vân chỉ + viền), tex (texture 3D, không viền vắt sổ), satin/fill/elem (mask 3D),
// print (đúng khổ + lề xén, lớp In + CutContour).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export const PT_BLEED = 2; // mm
export const CUTCONTOUR = '#EC008C';

// ---------- hình ----------
export type PtShapeId = 'r50' | 'r70' | 'r90' | 'shield' | 'rect' | 'oval' | 'mountain' | 'star' | 'cloud';
export interface PtShape {
  id: PtShapeId; name: string; kind: 'round' | 'simple' | 'die'; w: number; h: number; d: string;
  /** nửa bề ngang bên trong tại cao độ y (mm, chưa trừ viền) */
  half: (y: number) => number;
  /** vùng dọc dùng được cho nội dung */
  y0: number; y1: number;
}
const f2 = (n: number) => Math.round(n * 100) / 100;
const circ = (r: number) => `M0 ${r}A${r} ${r} 0 1 0 ${2 * r} ${r}A${r} ${r} 0 1 0 0 ${r}Z`;
const roundHalf = (r: number) => (y: number) => Math.sqrt(Math.max(0, r * r - (y - r) ** 2));
function star(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f2(cx + rr * Math.cos(a))} ${f2(cy + rr * Math.sin(a))}`;
  }
  return d + 'Z';
}
export const PT_SHAPES: PtShape[] = [
  { id: 'r50', name: 'Tròn Ø50', kind: 'round', w: 50, h: 50, d: circ(25), half: roundHalf(25), y0: 0, y1: 50 },
  { id: 'r70', name: 'Tròn Ø70', kind: 'round', w: 70, h: 70, d: circ(35), half: roundHalf(35), y0: 0, y1: 70 },
  { id: 'r90', name: 'Tròn Ø90', kind: 'round', w: 90, h: 90, d: circ(45), half: roundHalf(45), y0: 0, y1: 90 },
  {
    id: 'shield', name: 'Khiên 70×80', kind: 'simple', w: 70, h: 80,
    d: 'M5 0H65Q70 0 70 5V44A35 36 0 0 1 35 80A35 36 0 0 1 0 44V5Q0 0 5 0Z',
    half: (y) => (y < 44 ? 35 : 35 * Math.sqrt(Math.max(0, 1 - ((y - 44) / 36) ** 2))), y0: 0, y1: 80,
  },
  {
    id: 'rect', name: 'Chữ nhật 90×55', kind: 'simple', w: 90, h: 55,
    d: 'M8 0H82Q90 0 90 8V47Q90 55 82 55H8Q0 55 0 47V8Q0 0 8 0Z', half: () => 45, y0: 0, y1: 55,
  },
  {
    id: 'oval', name: 'Ô van 90×60', kind: 'simple', w: 90, h: 60, d: 'M0 30A45 30 0 1 0 90 30A45 30 0 1 0 0 30Z',
    half: (y) => 45 * Math.sqrt(Math.max(0, 1 - ((y - 30) / 30) ** 2)), y0: 0, y1: 60,
  },
  {
    id: 'mountain', name: 'Cắt theo hình núi 84×66', kind: 'die', w: 84, h: 66,
    d: 'M0 56V38L20 12Q22 9.5 24 12L34 24L48 3Q50 0 52 3L68 26L74 18Q76 15.5 78 18L84 30V56Q84 66 74 66H10Q0 66 0 56Z',
    half: (y) => (y >= 38 ? 42 : y >= 28 ? 30 : y >= 16 ? 12 : 0), y0: 30, y1: 66,
  },
  {
    id: 'star', name: 'Cắt hình ngôi sao 76×72', kind: 'die', w: 76, h: 72, d: star(38, 40, 38, 19.5),
    half: (y) => Math.sqrt(Math.max(0, 17 * 17 - (y - 41) ** 2)), y0: 24, y1: 58,
  },
  {
    id: 'cloud', name: 'Cắt hình đám mây 88×60', kind: 'die', w: 88, h: 60,
    d: 'M16 58A14 14 0 0 1 9 32A17 17 0 0 1 30 15A21 21 0 0 1 66 13A15 15 0 0 1 81 31A14 14 0 0 1 72 58Z',
    half: (y) => (y >= 30 && y <= 54 ? 36 : y >= 22 && y < 30 ? 26 : y > 54 && y <= 57 ? 26 : 8), y0: 18, y1: 58,
  },
];
export const ptShape = (id: string) => PT_SHAPES.find((s) => s.id === id) || PT_SHAPES[2];

// ---------- loại / viền / đế ----------
export type PtKind = 'emb' | 'print' | 'pvc';
export const PT_KINDS: { id: PtKind; name: string; note: string; maxColors: number; minCap: number }[] = [
  { id: 'emb', name: 'Patch thêu', note: 'Nổi vân chỉ, ≤8 màu chỉ — bền, sang', maxColors: 8, minCap: 4 },
  { id: 'print', name: 'Patch in chuyển nhiệt', note: 'In đủ màu, chuyển màu, ảnh — chữ nhỏ vẫn nét', maxColors: 99, minCap: 1.6 },
  { id: 'pvc', name: 'PVC dẻo', note: 'Cao su nổi 2 lớp, chống nước, ≤6 màu', maxColors: 6, minCap: 3 },
];
export const ptKind = (id: string) => PT_KINDS.find((k) => k.id === id) || PT_KINDS[0];
export type PtBorder = 'merrow' | 'hotcut';
export const PT_BORDERS: { id: PtBorder; name: string; note: string }[] = [
  { id: 'merrow', name: 'Viền vắt sổ', note: 'Viền cuộn dày ~4mm — chỉ cho hình tròn/khiên/chữ nhật/ô van' },
  { id: 'hotcut', name: 'Viền cắt nóng', note: 'Cắt laser sát hình, viền thêu mảnh — mọi hình' },
];
export type PtBacking = 'iron' | 'velcro' | 'sew';
export const PT_BACKINGS: { id: PtBacking; name: string; note: string }[] = [
  { id: 'iron', name: 'Đế ủi (keo nhiệt)', note: 'Ủi 150°C ~15s là dính — áo, túi vải' },
  { id: 'velcro', name: 'Đế dán gai (velcro)', note: 'Gỡ ra gắn lại — balo, áo đồng phục chiến thuật' },
  { id: 'sew', name: 'Đế may', note: 'Không keo, may viền — bền nhất' },
];
export const borderAllowed = (sh: PtShape, b: PtBorder) => b === 'hotcut' || sh.kind !== 'die';
/** bề dày viền chiếm chỗ bên trong (mm) */
export function borderInset(kind: PtKind, border: PtBorder): number {
  if (kind === 'pvc') return 3;
  return border === 'merrow' ? 4 : 2.6;
}

// ---------- bảng màu chỉ ----------
export const THREAD_NAMES: Record<string, string> = {
  '#1E2A4A': 'Xanh navy', '#E8B84A': 'Vàng nghệ', '#FFFFFF': 'Trắng', '#9FB3D9': 'Xanh nhạt', '#B3202A': 'Đỏ cờ',
  '#1C1C1C': 'Đen', '#F2C14E': 'Vàng chanh', '#2F4A34': 'Xanh rêu', '#F3E6C8': 'Kem', '#D9822B': 'Cam đất',
  '#8FB09A': 'Xanh xám', '#161616': 'Đen tuyền', '#D4AF37': 'Vàng kim', '#7A7A7A': 'Xám', '#2B6CB0': 'Xanh dương',
  '#FFC93C': 'Vàng nắng', '#0F2E57': 'Xanh đậm', '#F6C1CF': 'Hồng phấn', '#5B3A4A': 'Nâu tím', '#E8738F': 'Hồng đào',
  '#F2E8D5': 'Kem sữa', '#2B2B2B': 'Đen than', '#B5543C': 'Đỏ gạch', '#6E8B74': 'Xanh lá xám', '#E8762B': 'Cam',
  '#2A2A2A': 'Đen xám', '#FFD166': 'Vàng mơ', '#6B1E2E': 'Đỏ đô', '#F2D27A': 'Vàng nhạt', '#C9A0A8': 'Hồng tro',
  '#4A3326': 'Nâu cà phê', '#F1DFC4': 'Be sữa', '#C8884A': 'Caramel',
};
export const threadName = (hex: string) => THREAD_NAMES[hex.toUpperCase()] || hex.toUpperCase();
export interface PtPalette { id: string; name: string; bg: string; c1: string; c2: string; c3: string; border: string }
export const PT_PALETTES: PtPalette[] = [
  { id: 'navy', name: 'Navy vàng', bg: '#1E2A4A', c1: '#E8B84A', c2: '#FFFFFF', c3: '#9FB3D9', border: '#E8B84A' },
  { id: 'red', name: 'Đỏ trắng', bg: '#B3202A', c1: '#FFFFFF', c2: '#1C1C1C', c3: '#F2C14E', border: '#FFFFFF' },
  { id: 'forest', name: 'Xanh rêu', bg: '#2F4A34', c1: '#F3E6C8', c2: '#D9822B', c3: '#8FB09A', border: '#F3E6C8' },
  { id: 'black', name: 'Đen vàng kim', bg: '#161616', c1: '#D4AF37', c2: '#FFFFFF', c3: '#7A7A7A', border: '#D4AF37' },
  { id: 'sky', name: 'Xanh dương', bg: '#2B6CB0', c1: '#FFFFFF', c2: '#FFC93C', c3: '#0F2E57', border: '#FFFFFF' },
  { id: 'pink', name: 'Hồng phấn', bg: '#F6C1CF', c1: '#5B3A4A', c2: '#FFFFFF', c3: '#E8738F', border: '#E8738F' },
  { id: 'cream', name: 'Kem cổ điển', bg: '#F2E8D5', c1: '#2B2B2B', c2: '#B5543C', c3: '#6E8B74', border: '#2B2B2B' },
  { id: 'orange', name: 'Cam năng động', bg: '#E8762B', c1: '#FFFFFF', c2: '#2A2A2A', c3: '#FFD166', border: '#2A2A2A' },
  { id: 'maroon', name: 'Đỏ đô', bg: '#6B1E2E', c1: '#F2D27A', c2: '#FFFFFF', c3: '#C9A0A8', border: '#F2D27A' },
  { id: 'mocha', name: 'Nâu cà phê', bg: '#4A3326', c1: '#F1DFC4', c2: '#C8884A', c3: '#FFFFFF', border: '#F1DFC4' },
];
export const ptPalette = (id: string) => PT_PALETTES.find((p) => p.id === id) || PT_PALETTES[0];

// ---------- font ----------
export interface PtFont { id: string; name: string; family: string; weight: number }
export const PT_FONTS: PtFont[] = [
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
];
export const ptFont = (id: string) => PT_FONTS.find((f) => f.id === id) || PT_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Lobster';
export const PT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Bungee&family=Lobster&display=swap');`;

export function usePtFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pt-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pt-fonts'; link.rel = 'stylesheet';
        link.href = PT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['700 40px "Oswald"', '800 40px "Montserrat"', '800 40px "Baloo 2"', '800 40px "Playfair Display"', '400 40px "Bungee"', '400 40px "Lobster"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục + dữ liệu + mẫu ----------
export type PtLayout = 'club' | 'company' | 'school' | 'outdoor' | 'cute' | 'script';
export const PT_LAYOUTS: { id: PtLayout; name: string }[] = [
  { id: 'club', name: 'CLB · đội nhóm' },
  { id: 'company', name: 'Đồng phục công ty' },
  { id: 'school', name: 'Trường · lớp' },
  { id: 'outdoor', name: 'Du lịch · leo núi' },
  { id: 'cute', name: 'Icon dễ thương' },
  { id: 'script', name: 'Chữ ký thương hiệu' },
];
export type PtIcon = 'ball' | 'star' | 'book' | 'peaks' | 'cup' | 'cat' | 'heart' | 'bolt';
export const PT_ICONS: { id: PtIcon; name: string }[] = [
  { id: 'ball', name: 'Bóng đá' }, { id: 'star', name: 'Ngôi sao' }, { id: 'book', name: 'Sách' }, { id: 'peaks', name: 'Núi' },
  { id: 'cup', name: 'Ly cà phê' }, { id: 'cat', name: 'Mèo' }, { id: 'heart', name: 'Trái tim' }, { id: 'bolt', name: 'Tia sét' },
];
export type PtData = Record<string, string>;
export interface PtField { key: string; label: string; ph?: string; half?: boolean }
export const PT_FIELDS: PtField[] = [
  { key: 'title', label: 'Tên chính (CLB / công ty / trường / địa danh)', ph: 'AN KHANG FC' },
  { key: 'center', label: 'Chữ giữa (viết tắt, lớp, số)', ph: 'AK', half: true },
  { key: 'year', label: 'Năm / dòng dưới', ph: 'EST. 2026', half: true },
  { key: 'sub', label: 'Dòng phụ / slogan', ph: 'Đoàn kết · Bản lĩnh' },
];
export const PT_SAMPLES: Record<PtLayout, PtData> = {
  club: { title: 'AN KHANG FC', center: 'AK', year: 'EST. 2026', sub: 'ĐOÀN KẾT · BẢN LĨNH' },
  company: { title: 'CÔNG TY AN KHANG', center: 'AK', year: 'Since 2012', sub: 'Tận tâm · Chuyên nghiệp' },
  school: { title: 'THPT AN KHANG', center: '12A1', year: '2024 – 2027', sub: 'Tuổi trẻ · Khát vọng' },
  outdoor: { title: 'ĐÀ LẠT', center: '1.500M', year: '2026', sub: 'ADVENTURE CLUB' },
  cute: { title: 'Thu Hà', center: '', year: '', sub: 'Meow meow' },
  script: { title: 'Gia Khánh', center: '', year: 'HANDMADE · SÀI GÒN', sub: 'Since 2020' },
};
export type PtCoverage = 'twill' | 'full';
export interface PtSpec {
  layout: PtLayout; shape: PtShapeId; palette: string; font: string; icon: PtIcon;
  kind: PtKind; border: PtBorder; backing: PtBacking; coverage: PtCoverage;
}
export interface PtTemplate { id: string; name: string; spec: Pick<PtSpec, 'layout' | 'shape' | 'palette' | 'font' | 'icon'> & Partial<PtSpec>; data?: Partial<PtData> }
const T = (name: string, layout: PtLayout, shape: PtShapeId, palette: string, font: string, icon: PtIcon, extra?: Partial<PtSpec>, data?: Partial<PtData>): PtTemplate =>
  ({ id: `${layout}-${shape}-${palette}-${icon}`, name, spec: { layout, shape, palette, font, icon, ...extra }, data });
export const PT_TEMPLATES: PtTemplate[] = [
  T('CLB bóng đá · tròn', 'club', 'r90', 'navy', 'oswald', 'ball'),
  T('CLB chạy bộ · tròn đỏ', 'club', 'r70', 'red', 'montserrat', 'bolt', undefined, { title: 'THU HÀ RUNNERS', center: '21K', year: 'SINCE 2025', sub: 'CHẠY LÀ VUI' }),
  T('Đội nhóm · khiên', 'club', 'shield', 'forest', 'oswald', 'star', undefined, { title: 'QUỐC BẢO TEAM', center: 'QB', year: '2026', sub: 'CÙNG NHAU TIẾN LÊN' }),
  T('Đồng phục · chữ nhật', 'company', 'rect', 'navy', 'montserrat', 'star'),
  T('Công ty · ô van đen vàng', 'company', 'oval', 'black', 'playfair', 'star'),
  T('Trường lớp · khiên đỏ đô', 'school', 'shield', 'maroon', 'playfair', 'book'),
  T('Lớp · tròn xanh', 'school', 'r90', 'sky', 'oswald', 'book', undefined, { title: 'THCS AN KHANG', center: 'K24', year: '2023 – 2027' }),
  T('Du lịch Đà Lạt · núi', 'outdoor', 'mountain', 'forest', 'oswald', 'peaks'),
  T('Leo núi · ô van cam', 'outdoor', 'oval', 'orange', 'bungee', 'peaks', undefined, { title: 'FANSIPAN', center: '3.143M', year: '2026', sub: 'NÓC NHÀ ĐÔNG DƯƠNG' }),
  T('Mèo cute · đám mây', 'cute', 'cloud', 'pink', 'baloo', 'cat', { border: 'hotcut' }),
  T('Cà phê · tròn nâu', 'cute', 'r70', 'mocha', 'baloo', 'cup', undefined, { title: 'Cà Phê An Khang', sub: 'Rang xay mỗi ngày' }),
  T('Chữ ký thương hiệu · chữ nhật', 'script', 'rect', 'cream', 'montserrat', 'heart'),
];
export const defaultPtSpec = (): PtSpec => ({ ...(PT_TEMPLATES[0].spec as PtSpec), kind: 'emb', border: 'merrow', backing: 'iron', coverage: 'twill' });
export const sampleOf = (t: PtTemplate): PtData => ({ ...PT_SAMPLES[t.spec.layout], ...(t.data || {}) } as PtData);

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, family: string, weight: number, size: number, ls = 0): number {
  const s = t || '';
  const extra = ls * size * Math.max(0, Array.from(s).length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + extra;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + extra;
  mctx.font = `${weight} 100px "${family}"`;
  return (mctx.measureText(s).width / 100) * size + extra;
}
const TOP = 0.7, BOT = 0.28; // hộp chữ so với tâm dòng

/** ghi nhận để cảnh báo + đếm màu chỉ */
export interface PtCollector { texts: { role: string; size: number; text: string }[]; colors: Set<string> }
const newCol = (): PtCollector => ({ texts: [], colors: new Set() });

interface Ctx {
  spec: PtSpec; sh: PtShape; p: PtPalette; f: PtFont; inset: number; col: PtCollector; mode: PtMode; uid: string;
}
const ink = (c: Ctx, hex: string) => { c.col.colors.add(hex.toUpperCase()); return hex; };
const stitchAttr = (c: Ctx, kind: 'satin' | 'fill') => (c.spec.kind === 'emb' ? kind : 'elem');

function availAt(c: Ctx, y0: number, y1: number): number {
  const ym = (y0 + y1) / 2;
  const h = Math.min(c.sh.half(y0), c.sh.half(y1), c.sh.half(ym));
  return Math.max(0, 2 * (h - c.inset - 1.2));
}
function fitAt(c: Ctx, text: string, family: string, weight: number, cy: number, sMax: number, ls = 0): number {
  if (!text) return sMax;
  let s = sMax;
  for (let k = 0; k < 8; k++) {
    const avail = availAt(c, cy - s * TOP, cy + s * BOT);
    const w = textW(text, family, weight, s, ls);
    if (w <= avail) return s;
    s = Math.max(0.6, s * Math.min(0.97, avail / Math.max(0.1, w)));
  }
  return s;
}
/** 1 dòng; nhỏ hơn sMin thì thử bẻ 2 dòng cân */
function fitLines(c: Ctx, text: string, family: string, weight: number, cy: number, sMax: number, sMin: number, ls = 0): { lines: string[]; size: number } {
  const t = (text || '').trim();
  const s1 = fitAt(c, t, family, weight, cy, sMax, ls);
  const words = t.split(/\s+/).filter(Boolean);
  if (s1 >= sMin || words.length < 2) return { lines: t ? [t] : [], size: s1 };
  let best: [string, string] = [t, ''], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(textW(a, family, weight, 10), textW(b, family, weight, 10));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  let s = sMax * 0.72;
  for (let k = 0; k < 6; k++) {
    const g = s * 1.1;
    const ns = Math.min(fitAt(c, best[0], family, weight, cy - g / 2, s, ls), fitAt(c, best[1], family, weight, cy + g / 2, s, ls));
    if (ns >= s * 0.995) break;
    s = ns;
  }
  return s > s1 ? { lines: best, size: s } : { lines: [t], size: s1 };
}
const HARD_MIN = 2.2;
/** chữ phụ quá nhỏ → rút gọn "…" (không để < 2.2mm) */
function rescue(c: Ctx, t: string, family: string, weight: number, cy: number, size: number, ls: number) {
  if (size >= HARD_MIN || !t) return { t, size };
  const w = t.split(/\s+/);
  while (w.length > 1) {
    w.pop();
    const t2 = w.join(' ').replace(/[·,–-]$/, '').trim() + '…';
    const s3 = fitAt(c, t2, family, weight, cy, HARD_MIN * 1.2, ls);
    if (s3 >= HARD_MIN - 0.05) return { t: t2, size: s3 };
  }
  return { t, size };
}

function Line({ c, role, text, cy, sMax, sMin, family, weight, fill, ls = 0, stitch = 'satin' }: {
  c: Ctx; role: string; text: string; cy: number; sMax: number; sMin?: number; family: string; weight: number; fill: string; ls?: number; stitch?: 'satin' | 'fill';
}) {
  if (!(text || '').trim()) return null;
  let { lines, size } = fitLines(c, text, family, weight, cy, sMax, sMin ?? sMax * 0.6, ls);
  if (lines.length === 1) { const r = rescue(c, lines[0], family, weight, cy, size, ls); lines = [r.t]; size = r.size; }
  lines.forEach((ln) => c.col.texts.push({ role, size, text: ln }));
  ink(c, fill);
  const g = size * 1.1;
  const y0 = cy - ((lines.length - 1) * g) / 2 + size * 0.34;
  const x = c.sh.w / 2;
  return (
    <>
      {lines.map((ln, i) => (
        <text key={i} x={f2(x)} y={f2(y0 + i * g)} textAnchor="middle" fontFamily={`'${family}'`} fontWeight={weight} fontSize={f2(size)}
          letterSpacing={ls ? f2(ls * size) : undefined} fill={fill} data-role={role} data-stitch={stitchAttr(c, stitch)}>{ln}</text>
      ))}
    </>
  );
}

/** chữ chạy cung tròn (mỗi ký tự 1 <text> xoay → outline được). top: đọc trái→phải phía trên; bottom: phía dưới */
function Arc({ c, role, text, side, rb, sMax, family, weight, fill, ls = 0.08, maxDeg = 150 }: {
  c: Ctx; role: string; text: string; side: 'top' | 'bottom'; rb: number; sMax: number; family: string; weight: number; fill: string; ls?: number; maxDeg?: number;
}) {
  const chars = Array.from((text || '').trim());
  if (!chars.length) return null;
  const tot = (s: number) => chars.reduce((a, ch) => a + textW(ch, family, weight, s), 0) + ls * s * (chars.length - 1);
  let s = sMax;
  const arcLen = (rb * maxDeg * Math.PI) / 180;
  for (let k = 0; k < 60 && tot(s) > arcLen; k++) s *= 0.96;
  s = Math.max(1.2, s);
  c.col.texts.push({ role, size: s, text: chars.join('') });
  ink(c, fill);
  const cx = c.sh.w / 2, cy = c.sh.h / 2;
  // bán kính chân chữ: top → chữ dựng ra ngoài (rb là mép trong), bottom → chân chữ ở ngoài
  const r = side === 'top' ? rb - s * 0.72 : rb - s * 0.02;
  const T0 = tot(s);
  let pos = -T0 / 2;
  const out: ReactNode[] = [];
  chars.forEach((ch, i) => {
    const w = textW(ch, family, weight, s);
    const mid = pos + w / 2;
    pos += w + ls * s;
    if (!ch.trim()) return;
    const phi = mid / r;
    const deg = (phi * 180) / Math.PI;
    const x = cx + r * Math.sin(phi);
    const y = side === 'top' ? cy - r * Math.cos(phi) : cy + r * Math.cos(phi);
    out.push(
      <text key={i} x={f2(x)} y={f2(y)} textAnchor="middle" transform={`rotate(${f2(side === 'top' ? deg : -deg)} ${f2(x)} ${f2(y)})`}
        fontFamily={`'${family}'`} fontWeight={weight} fontSize={f2(s)} fill={fill} data-role={role} data-arc="1" data-stitch={stitchAttr(c, 'satin')}>{ch}</text>,
    );
  });
  return <g>{out}</g>;
}

// ---------- hình vẽ code ----------
function Icon({ c, kind, x, y, s, c1, c2, role = 'icon' }: { c: Ctx; kind: PtIcon; x: number; y: number; s: number; c1: string; c2: string; role?: string }) {
  ink(c, c1); ink(c, c2);
  const k = s / 100;
  const P = (px: number, py: number) => `${f2(x + (px - 50) * k)} ${f2(y + (py - 50) * k)}`;
  const st = { 'data-stitch': stitchAttr(c, 'fill'), 'data-role': role } as const;
  const sat = { 'data-stitch': stitchAttr(c, 'satin'), 'data-role': role } as const;
  switch (kind) {
    case 'ball': {
      const pent = (cx: number, cy: number, r: number, rot = 0) => {
        let d = '';
        for (let i = 0; i < 5; i++) { const a = rot - Math.PI / 2 + (i * 2 * Math.PI) / 5; d += `${i ? 'L' : 'M'}${P(cx + r * Math.cos(a), cy + r * Math.sin(a))}`; }
        return d + 'Z';
      };
      return (
        <g>
          <circle cx={f2(x)} cy={f2(y)} r={f2(46 * k)} fill={c2} {...st} />
          <circle cx={f2(x)} cy={f2(y)} r={f2(46 * k)} fill="none" stroke={c1} strokeWidth={f2(5 * k)} {...sat} />
          <path d={pent(50, 50, 16)} fill={c1} {...st} />
          {[0, 1, 2, 3, 4].map((i) => { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; return <path key={i} d={pent(50 + 36 * Math.cos(a), 50 + 36 * Math.sin(a), 11, Math.PI)} fill={c1} {...st} />; })}
        </g>
      );
    }
    case 'star': return <path d={star(x, y, 46 * k, 20 * k)} fill={c1} stroke={c2} strokeWidth={f2(3 * k)} strokeLinejoin="round" {...st} />;
    case 'book': return (
      <g>
        <path d={`M${P(8, 26)}Q${P(30, 16)} ${P(50, 28)}Q${P(70, 16)} ${P(92, 26)}V${f2(y + 30 * k)}Q${P(70, 70)} ${P(50, 82)}Q${P(30, 70)} ${P(8, 80)}Z`} fill={c2} {...st} />
        <path d={`M${P(50, 28)}V${f2(y + 32 * k)}`} stroke={c1} strokeWidth={f2(4 * k)} {...sat} />
        {[38, 50, 62].map((yy) => <path key={yy} d={`M${P(16, yy)}Q${P(30, yy - 6)} ${P(43, yy + 2)}M${P(57, yy + 2)}Q${P(70, yy - 6)} ${P(84, yy)}`} stroke={c1} strokeWidth={f2(2.6 * k)} fill="none" {...sat} />)}
        <path d={`M${P(8, 26)}Q${P(30, 16)} ${P(50, 28)}Q${P(70, 16)} ${P(92, 26)}V${f2(y + 30 * k)}Q${P(70, 70)} ${P(50, 82)}Q${P(30, 70)} ${P(8, 80)}Z`} fill="none" stroke={c1} strokeWidth={f2(4 * k)} strokeLinejoin="round" {...sat} />
      </g>
    );
    case 'peaks': return (
      <g>
        <circle cx={f2(x + 22 * k)} cy={f2(y - 24 * k)} r={f2(13 * k)} fill={c2} {...st} />
        <path d={`M${P(2, 86)}L${P(36, 30)}L${P(52, 52)}L${P(66, 34)}L${P(98, 86)}Z`} fill={c1} {...st} />
        <path d={`M${P(28, 43)}L${P(36, 30)}L${P(44, 41)}L${P(39, 39)}L${P(34, 45)}Z M${P(60, 42)}L${P(66, 34)}L${P(73, 44)}L${P(68, 42)}Z`} fill={c2} {...st} />
      </g>
    );
    case 'cup': return (
      <g>
        <path d={`M${P(18, 40)}H${P(74, 40).split(' ')[0]}V${f2(y + 8 * k)}Q${P(74, 88)} ${P(46, 88)}Q${P(18, 88)} ${P(18, 58)}Z`} fill={c1} {...st} />
        <path d={`M${P(74, 48)}Q${P(92, 48)} ${P(90, 62)}Q${P(88, 74)} ${P(72, 72)}`} fill="none" stroke={c1} strokeWidth={f2(6 * k)} {...sat} />
        {[32, 46, 60].map((xx) => <path key={xx} d={`M${P(xx, 32)}Q${P(xx - 6, 22)} ${P(xx, 14)}Q${P(xx + 6, 6)} ${P(xx, 2)}`} fill="none" stroke={c2} strokeWidth={f2(4 * k)} strokeLinecap="round" {...sat} />)}
      </g>
    );
    case 'cat': return (
      <g>
        <path d={`M${P(14, 36)}L${P(20, 6)}L${P(40, 24)}Q${P(50, 21)} ${P(60, 24)}L${P(80, 6)}L${P(86, 36)}Q${P(96, 58)} ${P(80, 78)}Q${P(50, 98)} ${P(20, 78)}Q${P(4, 58)} ${P(14, 36)}Z`} fill={c1} {...st} />
        <ellipse cx={f2(x - 15 * k)} cy={f2(y + 5 * k)} rx={f2(6 * k)} ry={f2(8 * k)} fill={c2} {...st} />
        <ellipse cx={f2(x + 15 * k)} cy={f2(y + 5 * k)} rx={f2(6 * k)} ry={f2(8 * k)} fill={c2} {...st} />
        <path d={`M${P(46, 66)}L${P(54, 66)}L${P(50, 71)}Z`} fill={c2} {...st} />
        <path d={`M${P(36, 70)}L${P(8, 66)}M${P(36, 75)}L${P(10, 80)}M${P(64, 70)}L${P(92, 66)}M${P(64, 75)}L${P(90, 80)}`} stroke={c2} strokeWidth={f2(2.4 * k)} strokeLinecap="round" {...sat} />
      </g>
    );
    case 'heart': return <path d={`M${P(50, 88)}C${P(4, 58)} ${P(6, 18)} ${P(30, 16)}C${P(42, 15)} ${P(50, 24)} ${P(50, 30)}C${P(50, 24)} ${P(58, 15)} ${P(70, 16)}C${P(94, 18)} ${P(96, 58)} ${P(50, 88)}Z`} fill={c1} stroke={c2} strokeWidth={f2(3 * k)} {...st} />;
    case 'bolt': return <path d={`M${P(58, 2)}L${P(18, 56)}L${P(46, 56)}L${P(38, 98)}L${P(82, 40)}L${P(54, 40)}Z`} fill={c1} stroke={c2} strokeWidth={f2(3 * k)} strokeLinejoin="round" {...st} />;
  }
}

function initials(t: string): string {
  const w = (t || '').trim().split(/\s+/).filter((s) => !/^(công|ty|tnhh|cty|clb|trường|thpt|thcs|the|team)$/i.test(s));
  return (w.slice(0, 2).map((s) => s[0]).join('') || 'A').toUpperCase();
}

// ---------- 1 patch ----------
export type PtMode = 'art' | 'tex' | 'satin' | 'fill' | 'elem' | 'print';
interface Rendered { body: ReactNode; col: PtCollector }

function compose(spec: PtSpec, data: PtData, logo: string | undefined, mode: PtMode, uid: string): Rendered {
  const sh = ptShape(spec.shape), p = ptPalette(spec.palette), f = ptFont(spec.font);
  const border: PtBorder = borderAllowed(sh, spec.border) ? spec.border : 'hotcut';
  const inset = borderInset(spec.kind, border);
  const col = newCol();
  const c: Ctx = { spec: { ...spec, border }, sh, p, f, inset, col, mode, uid };
  const W = sh.w, H = sh.h, cx = W / 2;
  const disp = f.family, dw = f.weight;
  const y0 = sh.y0 + inset, y1 = sh.y1 - inset, AH = y1 - y0;
  const at = (t: number) => y0 + AH * t;
  const round = sh.kind === 'round';
  const R = W / 2 - inset; // vòng trong cho tròn
  const logoEl = (x: number, y: number, s: number) => logo
    ? <image href={logo} x={f2(x - s / 2)} y={f2(y - s / 2)} width={f2(s)} height={f2(s)} preserveAspectRatio="xMidYMid meet" data-role="logo" data-stitch={stitchAttr(c, 'fill')} />
    : null;
  const els: ReactNode[] = [];
  const L = spec.layout;

  if (L === 'club' || L === 'school') {
    const hi = L === 'club' ? p.c1 : p.c2, lo = L === 'club' ? p.c2 : p.c1;
    if (round) {
      // vòng trong + 2 sao
      const ring = R - Math.max(5.5, W * 0.11);
      ink(c, p.c3);
      els.push(<circle key="ring" cx={cx} cy={H / 2} r={f2(ring)} fill="none" stroke={p.c3} strokeWidth={f2(Math.max(0.9, W * 0.012))} data-stitch={stitchAttr(c, 'satin')} data-role="deco" />);
      const band = R - ring;
      els.push(<Arc key="t" c={c} role="title" text={data.title} side="top" rb={R - 0.6} sMax={band * 0.78} family={disp} weight={dw} fill={hi} />);
      els.push(<Arc key="y" c={c} role="year" text={data.year} side="bottom" rb={R - 0.6} sMax={band * 0.62} family={disp} weight={dw} fill={hi} ls={0.12} maxDeg={90} />);
      [-1, 1].forEach((sgn) => els.push(<path key={`s${sgn}`} d={star(cx + sgn * (R - band / 2), H / 2, band * 0.26, band * 0.11)} fill={hi} data-stitch={stitchAttr(c, 'fill')} data-role="deco" />));
      const ic = ring * 0.95;
      if (logo) els.push(<g key="lg">{logoEl(cx, H / 2 - ic * 0.18, ic * 0.95)}</g>);
      else els.push(<Icon key="ic" c={c} kind={spec.icon} x={cx} y={H / 2 - ic * 0.22} s={ic * 0.86} c1={hi} c2={lo} />);
      els.push(<Line key="c" c={c} role="center" text={data.center} cy={H / 2 + ring * 0.52} sMax={ring * 0.42} family={disp} weight={dw} fill={lo} />);
    } else {
      els.push(<Line key="t" c={c} role="title" text={data.title} cy={at(0.13)} sMax={AH * 0.14} sMin={AH * 0.09} family={disp} weight={dw} fill={hi} />);
      ink(c, p.c3);
      els.push(<path key="rule" d={`M${f2(cx - W * 0.28)} ${f2(at(0.26))}H${f2(cx + W * 0.28)}`} stroke={p.c3} strokeWidth={f2(Math.max(0.9, H * 0.012))} data-stitch={stitchAttr(c, 'satin')} data-role="deco" />);
      const ic = AH * 0.34;
      if (logo) els.push(<g key="lg">{logoEl(cx, at(0.47), ic)}</g>);
      else els.push(<Icon key="ic" c={c} kind={spec.icon} x={cx} y={at(0.46)} s={ic} c1={hi} c2={lo} />);
      els.push(<Line key="c" c={c} role="center" text={data.center} cy={at(0.73)} sMax={AH * 0.16} family={disp} weight={dw} fill={lo} />);
      els.push(<Line key="y" c={c} role="year" text={data.year} cy={at(0.9)} sMax={AH * 0.08} sMin={3} family={disp} weight={dw} fill={hi} ls={0.1} />);
    }
  } else if (L === 'company') {
    const ic = AH * 0.36;
    if (logo) els.push(<g key="lg">{logoEl(cx, at(round ? 0.27 : 0.25), ic)}</g>);
    else {
      ink(c, p.c1);
      els.push(<circle key="mo" cx={cx} cy={f2(at(round ? 0.27 : 0.25))} r={f2(ic * 0.46)} fill="none" stroke={p.c1} strokeWidth={f2(Math.max(0.9, ic * 0.06))} data-stitch={stitchAttr(c, 'satin')} data-role="logo" />);
      els.push(<Line key="mt" c={c} role="monogram" text={data.center || initials(data.title)} cy={at(round ? 0.27 : 0.25)} sMax={ic * 0.42} family={disp} weight={dw} fill={p.c1} />);
    }
    els.push(<Line key="t" c={c} role="title" text={data.title} cy={at(round ? 0.6 : 0.6)} sMax={AH * 0.17} sMin={AH * 0.1} family={disp} weight={dw} fill={p.c2} />);
    els.push(<Line key="s" c={c} role="sub" text={data.sub} cy={at(round ? 0.8 : 0.85)} sMax={AH * 0.08} sMin={2.6} family={BODY} weight={600} fill={p.c3} />);
  } else if (L === 'outdoor') {
    if (sh.id === 'mountain') {
      // hình núi chính là patch: tuyết đỉnh + mặt trời, dải tên dưới
      ink(c, p.c2); ink(c, p.c3); ink(c, p.c1);
      els.push(<circle key="sun" cx={f2(W * 0.8)} cy={f2(H * 0.4)} r={f2(H * 0.07)} fill={p.c2} data-stitch={stitchAttr(c, 'fill')} data-role="deco" />);
      els.push(<path key="snow" d="M44.6 8.2L48 3Q50 0 52 3L55.4 8.1L53 7L50.5 9.5L48 7.2Z M17.2 16.2L20 12Q22 9.5 24 12L26.8 15.6L24.4 15L22 17L19.8 15.2Z" fill={p.c1} data-stitch={stitchAttr(c, 'fill')} data-role="deco" />);
      els.push(<path key="ridge" d="M0 46L14 36L26 42L40 30L56 40L70 33L84 42V50H0Z" fill={p.c3} data-stitch={stitchAttr(c, 'fill')} data-role="deco" />);
      els.push(<Line key="t" c={c} role="title" text={data.title} cy={56.5} sMax={10} sMin={5.5} family={disp} weight={dw} fill={p.c1} />);
      els.push(<Line key="s" c={c} role="sub" text={[data.sub, data.year].filter(Boolean).join(' · ')} cy={45.5} sMax={3.6} sMin={2.4} family={BODY} weight={800} fill={p.c1} ls={0.06} />);
    } else {
      const ic = AH * 0.42;
      els.push(<Icon key="ic" c={c} kind={spec.icon} x={cx} y={at(round ? 0.32 : 0.3)} s={ic} c1={p.c1} c2={p.c2} />);
      if (round) {
        els.push(<Arc key="s" c={c} role="sub" text={data.sub} side="top" rb={R - 0.6} sMax={W * 0.085} family={disp} weight={dw} fill={p.c2} />);
        els.push(<Line key="t" c={c} role="title" text={data.title} cy={at(0.66)} sMax={AH * 0.17} sMin={AH * 0.1} family={disp} weight={dw} fill={p.c1} />);
        els.push(<Line key="y" c={c} role="year" text={[data.center, data.year].filter(Boolean).join(' · ')} cy={at(0.84)} sMax={AH * 0.07} sMin={2.6} family={BODY} weight={800} fill={p.c3} />);
      } else {
        els.push(<Line key="t" c={c} role="title" text={data.title} cy={at(0.66)} sMax={AH * 0.2} sMin={AH * 0.12} family={disp} weight={dw} fill={p.c1} />);
        els.push(<Line key="s" c={c} role="sub" text={data.sub} cy={at(0.83)} sMax={AH * 0.085} sMin={2.6} family={BODY} weight={800} fill={p.c2} ls={0.06} />);
        els.push(<Line key="y" c={c} role="year" text={[data.center, data.year].filter(Boolean).join(' · ')} cy={at(0.95)} sMax={AH * 0.06} sMin={2.4} family={BODY} weight={600} fill={p.c3} />);
      }
    }
  } else if (L === 'cute') {
    const ic = AH * (data.title ? 0.56 : 0.78);
    if (logo) els.push(<g key="lg">{logoEl(cx, at(data.title ? 0.36 : 0.5), ic)}</g>);
    else els.push(<Icon key="ic" c={c} kind={spec.icon} x={cx} y={at(data.title ? 0.36 : 0.5)} s={ic} c1={p.c1} c2={p.c3} />);
    els.push(<Line key="t" c={c} role="title" text={data.title} cy={at(0.77)} sMax={AH * 0.17} sMin={AH * 0.1} family={SCRIPT} weight={400} fill={p.c1} />);
    els.push(<Line key="s" c={c} role="sub" text={data.sub} cy={at(0.93)} sMax={AH * 0.07} sMin={2.4} family={BODY} weight={600} fill={p.c3} />);
  } else { // script
    els.push(<Line key="t" c={c} role="title" text={data.title} cy={at(0.42)} sMax={AH * 0.34} sMin={AH * 0.2} family={SCRIPT} weight={400} fill={p.c1} />);
    ink(c, p.c2);
    els.push(<path key="sw" d={`M${f2(cx - W * 0.26)} ${f2(at(0.66))}Q${f2(cx)} ${f2(at(0.6))} ${f2(cx + W * 0.26)} ${f2(at(0.66))}`} fill="none" stroke={p.c2} strokeWidth={f2(Math.max(0.9, H * 0.018))} strokeLinecap="round" data-stitch={stitchAttr(c, 'satin')} data-role="deco" />);
    els.push(<Line key="y" c={c} role="year" text={data.year} cy={at(0.8)} sMax={AH * 0.09} sMin={2.6} family={disp} weight={dw} fill={p.c1} ls={0.12} />);
    if (spec.icon === 'heart') els.push(<Icon key="ic" c={c} kind="heart" x={f2(cx + W * 0.36)} y={at(0.2)} s={AH * 0.16} c1={p.c2} c2={p.c2} />);
  }

  // ---------- nền + viền ----------
  const twill = spec.kind === 'emb' && spec.coverage === 'twill';
  if (spec.kind !== 'emb' || !twill) ink(c, p.bg);
  const showBorderStroke = border === 'hotcut' || spec.kind === 'pvc';
  if (showBorderStroke || mode === 'art') ink(c, p.border);
  const clipId = `ptc-${uid}`;
  const bgStitch = spec.kind === 'emb' ? (twill ? 'twill' : 'fill') : 'bg';
  const isMask = mode === 'satin' || mode === 'fill' || mode === 'elem';
  const bgFill = spec.kind === 'print' && !isMask ? `url(#ptg-${uid})` : p.bg;
  const body = (
    <>
      <defs>
        <clipPath id={clipId}><path d={sh.d} /></clipPath>
        {spec.kind === 'print' && (
          <radialGradient id={`ptg-${uid}`} cx="50%" cy="38%" r="70%">
            <stop offset="0" stopColor={shade(p.bg, 0.22)} /><stop offset="1" stopColor={shade(p.bg, -0.12)} />
          </radialGradient>
        )}
      </defs>
      <path d={sh.d} fill={bgFill} data-role="bg" data-stitch={bgStitch} />
      <g clipPath={`url(#${clipId})`}>{els}</g>
      {showBorderStroke && (
        <path d={sh.d} fill="none" stroke={p.border} strokeWidth={f2(spec.kind === 'pvc' ? 4.4 : 3)} clipPath={`url(#${clipId})`} data-role="border" data-stitch={spec.kind === 'emb' ? 'satin' : 'elem'} />
      )}
    </>
  );
  return { body, col };
}

export const shade = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  const o = v.map((x) => Math.max(0, Math.min(255, Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k)))));
  return `#${o.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};

/** màu chỉ / mực thực dùng + cỡ chữ để cảnh báo */
export function ptAnalyze(spec: PtSpec, data: PtData, logo?: string) {
  const { col } = compose(spec, data, logo, 'art', 'an');
  const sh = ptShape(spec.shape);
  const border: PtBorder = borderAllowed(sh, spec.border) ? spec.border : 'hotcut';
  if (border === 'merrow' && spec.kind !== 'pvc') col.colors.add(ptPalette(spec.palette).border.toUpperCase());
  const k = ptKind(spec.kind);
  const warns: string[] = [];
  const minCap = Math.min(...col.texts.map((t) => t.size * 0.7), 99);
  const small = col.texts.filter((t) => t.size * 0.7 < k.minCap);
  if (small.length && spec.kind !== 'print') {
    warns.push(`Chữ "${small[0].text.slice(0, 18)}${small[0].text.length > 18 ? '…' : ''}" chỉ cao ~${(small[0].size * 0.7).toFixed(1)}mm — ${spec.kind === 'emb' ? 'thêu' : 'đúc PVC'} nên ≥ ${k.minCap}mm (rút gọn chữ hoặc chọn khổ lớn hơn).`);
  }
  const colors = [...col.colors];
  if (colors.length > k.maxColors) warns.push(`Thiết kế dùng ${colors.length} màu — ${k.name.toLowerCase()} tối đa ${k.maxColors} màu.`);
  if (logo && spec.kind !== 'print') warns.push(`Logo đã quy về màu chỉ của bảng màu (${spec.kind === 'emb' ? 'thêu' : 'PVC'} không in được chuyển màu).`);
  if (spec.border === 'merrow' && sh.kind === 'die') warns.push('Hình cắt theo dáng không vắt sổ được — đã chuyển sang viền cắt nóng.');
  return { colors, warns, minCap, texts: col.texts, border };
}

export function PatchSvg({ spec, data, logo, mode = 'art', style, uid = 'pt' }: {
  spec: PtSpec; data: PtData; logo?: string; mode?: PtMode; style?: CSSProperties; uid?: string;
}) {
  const sh = ptShape(spec.shape), p = ptPalette(spec.palette);
  const u = `${uid}-${mode}-${spec.shape}-${spec.palette}`.replace(/[^\w-]/g, '');
  const { body } = compose(spec, data, logo, mode, u);
  const border: PtBorder = borderAllowed(sh, spec.border) ? spec.border : 'hotcut';
  const isMask = mode === 'satin' || mode === 'fill' || mode === 'elem';
  const b = mode === 'print' && spec.kind === 'print' ? PT_BLEED : 0;
  const mpad = mode === 'art' && border === 'merrow' && spec.kind !== 'pvc' ? 1 : 0;
  const vb = `${-b - mpad} ${-b - mpad} ${sh.w + (b + mpad) * 2} ${sh.h + (b + mpad) * 2}`;
  const wh = mode === 'print' ? { width: `${sh.w + b * 2}mm`, height: `${sh.h + b * 2}mm` } : {};

  if (isMask) {
    // mask cho bump 3D: trắng = vùng chọn trên nền đen
    const keep = mode === 'elem' ? '[data-stitch="satin"],[data-stitch="fill"],[data-stitch="elem"]' : `[data-stitch="${mode}"]`;
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={vb} style={style} data-mask={mode} data-keep={keep}>
        <defs>
          <filter id={`ptw-${u}`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
          <style>{`.pt-mask-src [data-stitch]{visibility:hidden}${keep.split(',').map((s) => `.pt-mask-src ${s}`).join(',')}{visibility:visible}`}</style>
        </defs>
        <rect x={-50} y={-50} width={sh.w + 100} height={sh.h + 100} fill="#000" />
        <g filter={`url(#ptw-${u})`} className="pt-mask-src">{body}</g>
      </svg>
    );
  }

  const stitch = mode === 'art' && spec.kind === 'emb';
  const merrowArt = mode === 'art' && border === 'merrow' && spec.kind !== 'pvc';
  const sid = `pts-${u}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={vb} {...wh} style={style} data-patch="1" data-shape={sh.id} data-border={border}>
      {stitch && (
        <defs>
          <pattern id={`${sid}-p`} width={0.8} height={0.8} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
            <rect width={0.8} height={0.36} fill="#000" opacity={0.22} /><rect y={0.36} width={0.8} height={0.09} fill="#fff" opacity={0.35} />
          </pattern>
          <pattern id={`${sid}-tw`} width={1.2} height={1.2} patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width={1.2} height={0.5} fill="#000" opacity={0.12} />
          </pattern>
          <filter id={`${sid}-d`} x="-5%" y="-5%" width="110%" height="110%"><feDropShadow dx={0.18} dy={0.28} stdDeviation={0.22} floodColor="#000" floodOpacity={0.4} /></filter>
        </defs>
      )}
      {mode === 'print' ? (
        <>
          <g id="In">
            {b > 0 && <path d={ptShape(spec.shape).d} fill={p.bg} stroke={p.bg} strokeWidth={b * 2} data-role="bleed" />}
            {body}
          </g>
          <g id="CutContour"><path d={sh.d} fill="none" stroke={CUTCONTOUR} strokeWidth={0.25} data-role="cut" /></g>
        </>
      ) : (
        <>
          <g filter={stitch ? `url(#${sid}-d)` : undefined}>{body}</g>
          {stitch && <path d={sh.d} fill={`url(#${sid}-p)`} opacity={0.9} style={{ mixBlendMode: 'multiply' }} pointerEvents="none" />}
          {stitch && spec.coverage === 'twill' && <path d={sh.d} fill={`url(#${sid}-tw)`} pointerEvents="none" />}
          {merrowArt && (
            <g pointerEvents="none" data-role="merrow">
              <path d={sh.d} fill="none" stroke={shade(p.border, -0.18)} strokeWidth={4.4} />
              <path d={sh.d} fill="none" stroke={p.border} strokeWidth={3.6} strokeDasharray="0.55 0.45" />
            </g>
          )}
          {mode === 'art' && <path d={sh.d} fill="none" stroke="transparent" data-role="cut" />}
        </>
      )}
    </svg>
  );
}

// ---------- phiếu sản xuất A4 (đúng tỉ lệ 1:1) ----------
export function PatchSpecSheet({ spec, data, logo, qty, style }: { spec: PtSpec; data: PtData; logo?: string; qty: number; style?: CSSProperties }) {
  const sh = ptShape(spec.shape), k = ptKind(spec.kind), p = ptPalette(spec.palette);
  const a = ptAnalyze(spec, data, logo);
  const bd = PT_BORDERS.find((x) => x.id === a.border)!, bk = PT_BACKINGS.find((x) => x.id === spec.backing)!;
  const W = 210, H = 297, ax = (W - sh.w) / 2, ay = 64;
  const rows: [string, string][] = [
    ['Loại', k.name],
    ['Hình · khổ', `${sh.name} (${sh.w}×${sh.h} mm, tỉ lệ 1:1)`],
    ['Viền', `${bd.name}${a.border === 'merrow' ? ' · rộng 4mm, màu ' + threadName(p.border) : ' · cắt sát đường CutContour'}`],
    ['Đế', bk.name],
    ...(spec.kind === 'emb' ? [['Phủ nền', spec.coverage === 'twill' ? 'Nền vải twill (thêu ~75%)' : 'Thêu kín 100%'] as [string, string]] : []),
    ['Số lượng', `${qty} cái`],
  ];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`} style={style} data-sheet="1">
      <rect width={W} height={H} fill="#fff" />
      <text x={14} y={20} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={6.4} fill="#111">PHIẾU SẢN XUẤT PATCH</text>
      <text x={14} y={27} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={3.4} fill="#555">{(data.title || '').slice(0, 60)} · Mivy</text>
      {rows.map(([kk, v], i) => (
        <g key={kk}>
          <text x={14} y={37 + i * 4.6} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={3} fill="#333">{kk}</text>
          <text x={46} y={37 + i * 4.6} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={3} fill="#333">{v}</text>
        </g>
      ))}
      <g transform={`translate(${ax} ${ay})`}>
        <PatchSvg spec={spec} data={data} logo={logo} mode="print" uid="sheet" />
      </g>
      {/* kích thước */}
      <path d={`M${ax} ${ay + sh.h + 5}H${ax + sh.w}M${ax} ${ay + sh.h + 3}V${ay + sh.h + 7}M${ax + sh.w} ${ay + sh.h + 3}V${ay + sh.h + 7}`} stroke="#888" strokeWidth={0.25} />
      <text x={W / 2} y={ay + sh.h + 10} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={600} fontSize={3} fill="#666">{sh.w} mm</text>
      <text x={14} y={ay + sh.h + 22} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={3.6} fill="#111">{spec.kind === 'emb' ? `Màu chỉ (${a.colors.length})` : spec.kind === 'pvc' ? `Màu PVC (${a.colors.length})` : 'In đủ màu (CMYK chuyển nhiệt)'}</text>
      {spec.kind !== 'print' && a.colors.map((hex, i) => (
        <g key={hex} transform={`translate(${14 + (i % 4) * 46} ${ay + sh.h + 27 + Math.floor(i / 4) * 9})`}>
          <rect width={7} height={7} rx={1} fill={hex} stroke="#999" strokeWidth={0.2} data-swatch={hex} />
          <text x={9} y={3.2} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={2.8} fill="#222">{threadName(hex)}</text>
          <text x={9} y={6.4} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.4} fill="#777">{hex.toUpperCase()}</text>
        </g>
      ))}
      {a.warns.map((w, i) => (
        <text key={i} x={14} y={H - 28 + i * 4.2} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.7} fill="#B42318">⚠ {w.length > 110 ? w.slice(0, 108) + '…' : w}</text>
      ))}
      <text x={14} y={H - 10} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.6} fill="#888">Lớp In = hình thêu/in · CutContour (hồng) = đường cắt{a.border === 'merrow' ? ' · viền vắt sổ phủ ra ngoài đường cắt' : ''}. Chữ đã outline.</text>
    </svg>
  );
}
