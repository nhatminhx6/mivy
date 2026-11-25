'use client';
// Hộp bánh kem · cupcake · tráng miệng (tiệm bánh): 1 engine = LOẠI HỘP × MẪU (bảng màu + font + hình vẽ + hoạ tiết)
// × HÌNH CỬA SỔ (bầu dục / chữ nhật / trái tim — khoét bế, dán màng PET từ mặt trong).
// Mỗi mặt in = 1 "Art" đơn vị mm → dùng CHUNG cho khuôn bế (SVG/PDF gửi xưởng) và texture 3D (vẽ thẳng lên canvas).
// Khuôn bế dựng từ các tấm (đa giác): đường CẮT = biên hợp các tấm (cạnh chỉ thuộc 1 tấm), đường GẤP = cạnh chung.
// Chữ trên mặt có cửa sổ được xếp TRÁNH vùng khoét. Render code 100%, không gọi AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ======================= LOẠI · KHỔ · CỬA SỔ =======================
export type CbKind = 'cake' | 'cupcake' | 'dessert';
export const CB_KINDS: { id: CbKind; name: string; material: string }[] = [
  { id: 'cake', name: 'Hộp bánh kem', material: 'Hộp bánh kem giấy Ivory + cửa sổ' },
  { id: 'cupcake', name: 'Hộp cupcake', material: 'Hộp cupcake có khay' },
  { id: 'dessert', name: 'Hộp tráng miệng · mousse', material: 'Hộp bánh tráng miệng nắp gài' },
];
export interface CbSize { id: string; kind: CbKind; name: string; w: number; d: number; h: number; n?: number; cake?: number }
export const CB_SIZES: CbSize[] = [
  { id: 'ck-16', kind: 'cake', name: 'Bánh 16cm · hộp 18×18×11', w: 180, d: 180, h: 110, cake: 160 },
  { id: 'ck-20', kind: 'cake', name: 'Bánh 20cm · hộp 22×22×12', w: 220, d: 220, h: 120, cake: 200 },
  { id: 'ck-24', kind: 'cake', name: 'Bánh 24cm · hộp 26×26×12', w: 260, d: 260, h: 120, cake: 240 },
  { id: 'cc-2', kind: 'cupcake', name: '2 bánh · 18×9.5×9', w: 180, d: 95, h: 90, n: 2 },
  { id: 'cc-4', kind: 'cupcake', name: '4 bánh · 18×18×9', w: 180, d: 180, h: 90, n: 4 },
  { id: 'cc-6', kind: 'cupcake', name: '6 bánh · 27×18×9', w: 270, d: 180, h: 90, n: 6 },
  { id: 'ds-s', kind: 'dessert', name: 'Hộp 9×9×9', w: 90, d: 90, h: 90 },
  { id: 'ds-m', kind: 'dessert', name: 'Hộp 10×10×8', w: 100, d: 100, h: 80 },
  { id: 'ds-l', kind: 'dessert', name: 'Hộp 12×12×10', w: 120, d: 120, h: 100 },
];
export const cbSize = (id: string) => CB_SIZES.find((s) => s.id === id) || CB_SIZES[1];
export const cbSizesFor = (k: CbKind) => CB_SIZES.filter((s) => s.kind === k);
export const CB_BLEED = 3;
export const INSERT_LEG = 34; // chân khay cupcake (mm)

export type WinShape = 'oval' | 'rect' | 'heart' | 'none';
export const CB_WINDOWS: { id: WinShape; name: string }[] = [
  { id: 'oval', name: 'Bầu dục' },
  { id: 'rect', name: 'Chữ nhật bo góc' },
  { id: 'heart', name: 'Trái tim' },
  { id: 'none', name: 'Không cửa sổ' },
];

// cupcake: lưới ô theo số bánh
export function cupcakeGrid(s: CbSize) {
  const n = s.n || 4;
  const cols = n === 6 ? 3 : 2, rows = n === 2 ? 1 : 2;
  const cells: { x: number; y: number }[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) cells.push({ x: (s.w * (i + 0.5)) / cols, y: (s.d * (j + 0.5)) / rows });
  const holeR = Math.min(s.w / cols, s.d / rows) * 0.3;
  return { cols, rows, cells, holeR };
}

// ======================= FONT =======================
export interface CbFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const CB_FONTS: CbFont[] = [
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
  { id: 'greatvibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400, script: true },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
];
export const cbFont = (id: string) => CB_FONTS.find((f) => f.id === id) || CB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';
export const CB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;800&family=Be+Vietnam+Pro:wght@600;800&family=Cormorant+Garamond:wght@700&family=Dancing+Script:wght@700&family=Great+Vibes&family=Lobster&family=Montserrat:wght@800&family=Playfair+Display:wght@800&display=swap');`;

export function useCbFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-cb-fonts'; link.rel = 'stylesheet'; link.href = CB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 32px "${BODY}"`, `800 32px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ ầốềộ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ======================= MÀU · MẪU =======================
// cream/deco/drip/sponge: màu bánh trong ảnh 3D cho hợp tông hộp
export interface CbPalette {
  id: string; name: string; bg: string; ink: string; accent: string; accent2: string; onAccent: string; kraft?: boolean;
  cream: string; deco: string; drip?: string; sponge: string;
}
export const KRAFT = '#C49A6C';
export const CB_PALETTES: CbPalette[] = [
  { id: 'pastel', name: 'Hồng pastel', bg: '#FFE6EE', ink: '#6B2D47', accent: '#E0598B', accent2: '#F4A6C0', onAccent: '#FFFFFF', cream: '#FBDDE7', deco: '#FFFFFF', drip: '#E86D9A', sponge: '#F2D3A0' },
  { id: 'mint', name: 'Bạc hà', bg: '#E2F5EE', ink: '#1F4D45', accent: '#2FA483', accent2: '#F49AB2', onAccent: '#FFFFFF', cream: '#E4F6EE', deco: '#F7B6C8', sponge: '#F2D3A0' },
  { id: 'vanilla', name: 'Kem vani', bg: '#F7EEDC', ink: '#4A2F1E', accent: '#9B5B3A', accent2: '#C9A86A', onAccent: '#FFF8EC', cream: '#F6EBD6', deco: '#FFFDF8', drip: '#C08A55', sponge: '#E9C893' },
  { id: 'kraft', name: 'Kraft mộc', bg: KRAFT, ink: '#3A2414', accent: '#3A2414', accent2: '#B0453A', onAccent: '#EBD7B8', kraft: true, cream: '#F7EFE3', deco: '#FFFFFF', sponge: '#E5C38E' },
  { id: 'white', name: 'Trắng vàng', bg: '#FFFFFF', ink: '#222222', accent: '#222222', accent2: '#C9A15B', onAccent: '#FFFFFF', cream: '#FBF8F2', deco: '#FFFFFF', sponge: '#EFD3A3' },
  { id: 'party', name: 'Sinh nhật', bg: '#FFF6D8', ink: '#2D2A5A', accent: '#FF5D73', accent2: '#2BB5C9', onAccent: '#FFFFFF', cream: '#FFFFFF', deco: '#FF8FA3', drip: '#FF6F86', sponge: '#F2D3A0' },
  { id: 'choco', name: 'Socola', bg: '#3B2418', ink: '#F6E6D0', accent: '#E4B266', accent2: '#F6E6D0', onAccent: '#3B2418', cream: '#5A3423', deco: '#F3E2C7', drip: '#2B160D', sponge: '#5B3420' },
  { id: 'tet', name: 'Đỏ Tết', bg: '#C8102E', ink: '#FFF2D6', accent: '#F2C14E', accent2: '#FFF2D6', onAccent: '#8E0B20', cream: '#FFF4E2', deco: '#E8344B', sponge: '#F2D3A0' },
  { id: 'lavender', name: 'Lavender', bg: '#EFE8FB', ink: '#3D2A66', accent: '#8C6BD1', accent2: '#F2B8CD', onAccent: '#FFFFFF', cream: '#E9DEF8', deco: '#FFFFFF', drip: '#9D7BDD', sponge: '#F2D3A0' },
  { id: 'berry', name: 'Dâu tây', bg: '#FFF4F4', ink: '#7A1F2B', accent: '#E23D4B', accent2: '#3E9B4F', onAccent: '#FFFFFF', cream: '#FFF6F4', deco: '#FFFFFF', sponge: '#F2D3A0' },
  { id: 'navy', name: 'Navy vàng', bg: '#1E2F55', ink: '#FDF4E3', accent: '#E3BF6A', accent2: '#FDF4E3', onAccent: '#1E2F55', cream: '#F7F1E6', deco: '#FFFFFF', sponge: '#EFD3A3' },
  { id: 'sky', name: 'Xanh bé yêu', bg: '#E4F2FD', ink: '#1D3557', accent: '#FF7F9E', accent2: '#FFC94D', onAccent: '#FFFFFF', cream: '#EAF4FE', deco: '#FF9FB5', drip: '#7CC3F2', sponge: '#F2D3A0' },
];
export const cbPalette = (id: string) => CB_PALETTES.find((p) => p.id === id) || CB_PALETTES[0];

export type Motif = 'cake' | 'cupcake' | 'whisk' | 'heart' | 'strawberry' | 'balloon' | 'macaron' | 'mai' | 'wheat';
export type Pattern = 'scallop' | 'dots' | 'confetti' | 'lace' | 'stripes' | 'gingham' | 'drip' | 'line' | 'mai' | 'stars' | 'none';
export type CbData = Record<string, string>;
export interface CbLook { id: string; name: string; palette: string; font: string; motif: Motif; pattern: Pattern; candles: boolean; data: CbData }

const CARE = 'Bảo quản ngăn mát 2–6°C · Ngon nhất trong 24 giờ';
const D = (brand: string, tagline: string, note: string, website: string, hotline = '0909 123 456'): CbData => ({ brand, tagline, note, hotline, website, care: CARE });
export const CB_LOOKS: CbLook[] = [
  { id: 'pastel', name: 'Tiệm bánh pastel', palette: 'pastel', font: 'dancing', motif: 'cake', pattern: 'scallop', candles: true, data: D('Tiệm Bánh Thu Hà', 'Bánh kem · bánh ngọt mỗi ngày', 'Handmade with love', 'fb.com/banhthuha') },
  { id: 'mint', name: 'Bạc hà chấm bi', palette: 'mint', font: 'baloo', motif: 'cupcake', pattern: 'dots', candles: true, data: D('Bảo Ngọc Bakery', 'Cupcake · bánh kem bắp', 'Ngọt ngào mỗi ngày', 'baongocbakery.vn') },
  { id: 'vintage', name: 'Vintage ren', palette: 'vanilla', font: 'playfair', motif: 'whisk', pattern: 'lace', candles: false, data: D('An Khang Pâtisserie', 'Bánh Âu · làm thủ công', 'Since 2016 · Handmade', 'ankhangpatisserie.vn') },
  { id: 'kraft', name: 'Kraft tối giản', palette: 'kraft', font: 'montserrat', motif: 'wheat', pattern: 'none', candles: false, data: D('GIA KHÁNH BAKERY', 'Bánh mộc · ít đường', 'Làm mới mỗi sáng', 'giakhanhbakery.vn') },
  { id: 'white', name: 'Trắng sang', palette: 'white', font: 'cormorant', motif: 'heart', pattern: 'line', candles: false, data: D('Maison Thu Hà', 'Gâteau · Entremet · Mousse', 'Ngọt vừa, đẹp tinh tế', 'maisonthuha.vn') },
  { id: 'party', name: 'Sinh nhật bóng bay', palette: 'party', font: 'baloo', motif: 'balloon', pattern: 'confetti', candles: true, data: D('Bánh Kem Quốc Bảo', 'Bánh sinh nhật · giao trong 2 giờ', 'Happy Birthday!', 'banhkemquocbao.vn') },
  { id: 'choco', name: 'Socola chảy', palette: 'choco', font: 'playfair', motif: 'cake', pattern: 'drip', candles: true, data: D('Choco An Khang', 'Bánh socola · tiramisu', 'Đậm vị — ngọt ngào', 'chocoankhang.vn') },
  { id: 'tet', name: 'Bánh Tết sum vầy', palette: 'tet', font: 'lobster', motif: 'mai', pattern: 'mai', candles: false, data: D('Tiệm Bánh Thu Hà', 'Bánh kem Tết · quà biếu', 'An khang thịnh vượng', 'fb.com/banhthuha') },
  { id: 'lavender', name: 'Lavender macaron', palette: 'lavender', font: 'greatvibes', motif: 'macaron', pattern: 'stripes', candles: false, data: D('Lavender Bảo Ngọc', 'Macaron · mousse · cupcake', 'Sweet little moments', 'lavenderbaongoc.vn') },
  { id: 'berry', name: 'Dâu tây ca rô', palette: 'berry', font: 'lobster', motif: 'strawberry', pattern: 'gingham', candles: true, data: D('Dâu Xinh Bakery', 'Bánh kem dâu tây Đà Lạt', 'Tươi ngon mỗi ngày', 'dauxinhbakery.vn') },
  { id: 'navy', name: 'Navy cổ điển', palette: 'navy', font: 'cormorant', motif: 'cake', pattern: 'line', candles: false, data: D('GIA KHÁNH CAKE', 'Bánh kem cao cấp · đặt theo yêu cầu', 'Trao yêu thương', 'giakhanhcake.vn') },
  { id: 'kids', name: 'Bé yêu ngọt ngào', palette: 'sky', font: 'baloo', motif: 'cupcake', pattern: 'stars', candles: true, data: D('Bánh Kem Bé Bi', 'Bánh sinh nhật cho bé', 'Chúc bé tuổi mới thật vui!', 'banhkembebi.vn') },
];
export const cbLook = (id: string) => CB_LOOKS.find((l) => l.id === id) || CB_LOOKS[0];

export interface CbSpec { kind: CbKind; look: string; palette: string; font: string; size: string; win: WinShape }
export const cbSpecFor = (kind: CbKind, look?: CbLook, win?: WinShape): CbSpec => {
  const l = look || CB_LOOKS[0];
  const size = kind === 'cake' ? 'ck-20' : kind === 'cupcake' ? 'cc-4' : 'ds-m';
  return { kind, look: l.id, palette: l.palette, font: l.font, size, win: win ?? (kind === 'cake' ? 'oval' : 'rect') };
};

export interface CbField { key: string; label: string; ph?: string; half?: boolean }
export const CB_FIELDS: CbField[] = [
  { key: 'brand', label: 'Tên tiệm bánh', ph: 'Tiệm Bánh Thu Hà' },
  { key: 'tagline', label: 'Câu giới thiệu', ph: 'Bánh kem · bánh ngọt mỗi ngày' },
  { key: 'note', label: 'Lời ngọt ngào (chữ viết tay)', ph: 'Handmade with love' },
  { key: 'hotline', label: 'Hotline đặt bánh', ph: '0909 123 456', half: true },
  { key: 'website', label: 'Fanpage / website', ph: 'fb.com/banhthuha', half: true },
  { key: 'care', label: 'Hướng dẫn bảo quản (mặt sau)', ph: CARE },
];

// ======================= HÌNH VẼ (đơn vị mm) =======================
export type Item =
  | { t: 'p'; d: string; fill?: string; stroke?: string; sw?: number; op?: number; eo?: boolean; dash?: string }
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
// số ngẫu nhiên có hạt giống → hoạ tiết rắc (confetti, sao) cố định giữa các lần vẽ
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

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
// dòng PHỤ (giới thiệu, lời ngọt, fanpage): co quá nhỏ thì bỏ hẳn, không in chữ li ti
function Topt(s: string | undefined, x: number, y: number, size: number, max: number, family: string, weight: number, color: string,
  o: { op?: number; anchor?: 'start' | 'middle' | 'end' } = {}, min = 1.8): Item[] {
  const it = T(s, x, y, size, max, family, weight, color, o);
  return it.length && (it[0] as { size: number }).size >= min ? it : [];
}
// tên tiệm: 1 dòng nếu vừa, bị co quá nhiều thì tách 2 dòng cân nhau
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
  return { lines: best, size: Math.min(size, (size * max) / bestW) * 0.94 };
}

// ---- hình vẽ, khung 100×100 → đặt ở tâm (cx,cy) cỡ s (mm). fg = màu hình, hole = màu khoét chi tiết ----
export function icon(m: Motif, cx: number, cy: number, s: number, fg: string, hole: string): Item[] {
  const k = s / 100, X = (v: number) => r2(cx + (v - 50) * k), Y = (v: number) => r2(cy + (v - 50) * k);
  // đổi toạ độ path (lệnh TUYỆT ĐỐI M L Q C H V Z) từ khung 100×100 sang mm
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
  const wave = (y: number, x0: number, x1: number) => {
    let d = `M${x0} ${y}`; const n = Math.round((x1 - x0) / 12);
    for (let i = 0; i < n; i++) { const a = x0 + ((x1 - x0) * i) / n, b = x0 + ((x1 - x0) * (i + 1)) / n; d += ` Q${(a + b) / 2} ${y + 7} ${b} ${y}`; }
    return d;
  };
  switch (m) {
    case 'cake':
      it.push({ t: 'p', d: P('M12 60 Q12 56 16 56 H84 Q88 56 88 60 V88 H12 Z'), fill: fg });
      it.push({ t: 'p', d: P('M24 38 Q24 34 28 34 H72 Q76 34 76 38 V56 H24 Z'), fill: fg });
      line(wave(62, 12, 88), 2.6, hole); line(wave(40, 24, 76), 2.4, hole);
      it.push({ t: 'p', d: P('M47.5 16 H52.5 V34 H47.5 Z'), fill: fg });
      it.push({ t: 'p', d: P('M50 2 Q57 9 50 14 Q43 9 50 2 Z'), fill: fg });
      line('M4 93 H96', 3.4);
      break;
    case 'cupcake':
      it.push({ t: 'p', d: P('M22 58 H78 L69 95 H31 Z'), fill: fg });
      line('M38 61 L41 92', 2.4, hole); line('M50 61 V92', 2.4, hole); line('M62 61 L59 92', 2.4, hole);
      it.push({ t: 'p', d: P('M18 56 Q12 44 24 40 Q22 26 38 27 Q42 13 57 19 Q72 15 72 31 Q87 33 81 47 Q86 56 78 56 Z'), fill: fg });
      line('M28 46 Q44 52 62 44', 2.4, hole); line('M36 34 Q50 39 64 32', 2.2, hole);
      it.push({ t: 'p', d: C(54, 11, 6), fill: fg });
      line('M56 6 Q60 0 66 1', 1.8);
      break;
    case 'whisk':
      line('M50 97 V64', 8);
      line('M50 64 C28 52 30 12 50 6 C70 12 72 52 50 64', 3);
      line('M50 64 C38 52 40 12 50 6 C60 12 62 52 50 64', 3);
      line('M50 64 V6', 3);
      it.push({ t: 'p', d: P('M44 60 H56 V68 H44 Z'), fill: fg });
      break;
    case 'heart':
      it.push({ t: 'p', d: P('M50 90 C20 68 6 50 10 31 C14 14 35 10 50 28 C65 10 86 14 90 31 C94 50 80 68 50 90 Z'), fill: fg });
      it.push({ t: 'p', d: C(30, 32, 5), fill: hole, op: 0.55 });
      break;
    case 'strawberry':
      it.push({ t: 'p', d: P('M50 96 C22 82 14 52 26 37 C34 29 66 29 74 37 C86 52 78 82 50 96 Z'), fill: fg });
      it.push({ t: 'p', d: P('M28 31 Q38 16 50 25 Q62 16 72 31 Q61 25 50 33 Q39 25 28 31 Z'), fill: fg });
      line('M27 33 Q50 39 73 33', 2.6, hole);
      line('M50 25 V10', 2.6);
      it.push({ t: 'p', d: C(38, 50, 2) + C(54, 46, 2) + C(66, 54, 2) + C(44, 64, 2) + C(60, 68, 2) + C(50, 80, 2) + C(34, 62, 1.8), fill: hole });
      break;
    case 'balloon':
      it.push({ t: 'p', d: P('M50 6 C74 6 85 26 85 43 C85 63 67 75 50 77 C33 75 15 63 15 43 C15 26 26 6 50 6 Z'), fill: fg });
      it.push({ t: 'p', d: P('M45 77 H55 L50 84 Z'), fill: fg });
      line('M50 84 Q41 90 50 98', 2.2);
      it.push({ t: 'p', d: P('M30 30 Q34 18 46 16 Q36 22 34 34 Z'), fill: hole, op: 0.6 });
      break;
    case 'macaron':
      it.push({ t: 'p', d: P('M12 44 Q12 22 50 22 Q88 22 88 44 Z'), fill: fg });
      it.push({ t: 'p', d: P('M16 48 H84 V57 H16 Z'), fill: fg, op: 0.7 });
      it.push({ t: 'p', d: P('M12 61 H88 Q88 82 50 82 Q12 82 12 61 Z'), fill: fg });
      line(wave(44, 12, 88), 2.2, hole); line(wave(61, 12, 88), 2.2, hole);
      break;
    case 'mai': {
      let d = '';
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; d += C(50 + Math.cos(a) * 21, 50 + Math.sin(a) * 21, 17); }
      it.push({ t: 'p', d, fill: fg });
      it.push({ t: 'p', d: C(50, 50, 9), fill: hole });
      let st = '';
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; st += C(50 + Math.cos(a) * 13, 50 + Math.sin(a) * 13, 1.8); }
      it.push({ t: 'p', d: st, fill: hole });
      it.push({ t: 'p', d: C(50, 50, 4), fill: fg });
      break;
    }
    default: { // wheat: bông lúa mì
      line('M50 98 V22', 3.2);
      let d = '';
      for (let i = 0; i < 5; i++) {
        const y = 30 + i * 13;
        d += P(`M50 ${y + 6} Q36 ${y + 2} 32 ${y - 8} Q46 ${y - 6} 50 ${y + 6} Z`) + P(`M50 ${y + 6} Q64 ${y + 2} 68 ${y - 8} Q54 ${y - 6} 50 ${y + 6} Z`);
      }
      d += P('M50 24 Q42 14 50 2 Q58 14 50 24 Z');
      it.push({ t: 'p', d, fill: fg });
      break;
    }
  }
  return it;
}

// điện thoại nhỏ (thay ký tự ☎ — không outline được)
function phoneIcon(cx: number, cy: number, s: number, color: string): Item {
  const k = s / 100, X = (v: number) => r2(cx + (v - 50) * k), Y = (v: number) => r2(cy + (v - 50) * k);
  const d = 'M30 10 Q20 10 17 22 Q14 50 42 78 Q70 100 82 87 L88 80 Q92 73 85 69 L73 61 Q67 57 63 63 L59 67 Q47 61 37 47 Q31 37 35 33 L39 29 Q43 25 39 19 L33 12 Q31 10 30 10 Z';
  return { t: 'p', d: d.replace(/(-?[\d.]+) (-?[\d.]+)/g, (_m, a, b) => `${X(+a)} ${Y(+b)}`), fill: color };
}
function star(cx: number, cy: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${r2(cx + Math.cos(a) * rr)} ${r2(cy + Math.sin(a) * rr)}`; }
  return d + 'Z';
}

// ---- hoạ tiết viền / nền. edges: viền nào được trang trí ----
export interface Edges { t: boolean; b: boolean; l: boolean; r: boolean }
const ALL: Edges = { t: true, b: true, l: true, r: true };
const TB: Edges = { t: true, b: true, l: false, r: false };
// phần lề mà hoạ tiết chiếm (để chữ tránh)
export function padOf(p: Pattern, b: number) {
  if (p === 'scallop' || p === 'gingham' || p === 'stripes') return b * 1.05;
  if (p === 'drip') return b * 1.25;
  if (p === 'lace' || p === 'line' || p === 'confetti' || p === 'stars' || p === 'mai') return b * 0.95;
  return b * 0.55;
}
function pattern(p: Pattern, w: number, h: number, pal: CbPalette, b: number, e: Edges, seed = 1): Item[] {
  const it: Item[] = [];
  const bgc = pal.kraft ? KRAFT : pal.bg;
  if (p === 'scallop') {
    // mái hiên sọc + mép vỏ sò (tiệm bánh)
    const r = b * 0.32, band = b * 0.45;
    const edge = (top: boolean) => {
      const y0 = top ? 0 : h, s = top ? 1 : -1;
      let stripes = '', sc = '';
      const q = b * 0.5;
      for (let i = 0; i * q < w; i += 2) stripes += rect(i * q, top ? 0 : h - band, q, band);
      for (let x = r; x < w + r; x += 2 * r) sc += circ(x, y0 + s * band, r);
      it.push({ t: 'p', d: rect(0, top ? 0 : h - band, w, band), fill: pal.accent2 === bgc ? pal.accent : pal.accent2 });
      it.push({ t: 'p', d: stripes + sc, fill: pal.accent });
    };
    if (e.t) edge(true);
    if (e.b) edge(false);
  } else if (p === 'dots') {
    const g = Math.max(7, Math.min(w, h) * 0.075), r = g * 0.17; let d = '';
    for (let y = g / 2, row = 0; y < h; y += g * 0.87, row++) for (let x = (row % 2 ? g / 2 : 0) + g / 4; x < w; x += g) d += circ(x, y, r);
    it.push({ t: 'p', d, fill: pal.accent, op: 0.2 });
  } else if (p === 'confetti' || p === 'stars') {
    const R = rng(seed * 7919 + Math.round(w * 13 + h));
    const cols = [pal.accent, pal.accent2, '#FFC94D', '#7BD389'];
    const n = Math.round(((w + h) * 2 * b) / (b * b * 0.9));
    const fills: string[] = cols.map(() => '');
    for (let i = 0; i < n; i++) {
      // chỉ rắc trong dải lề (giữa để chữ)
      const side = Math.floor(R() * 4);
      if ((side === 0 && !e.t) || (side === 1 && !e.b) || (side === 2 && !e.l) || (side === 3 && !e.r)) continue;
      const along = R(), depth = R() * b * 0.95 + b * 0.05;
      const x = side < 2 ? along * w : side === 2 ? depth : w - depth;
      const y = side === 0 ? depth : side === 1 ? h - depth : along * h;
      const s = b * (0.1 + R() * 0.1), ci = Math.floor(R() * cols.length);
      if (p === 'stars') fills[ci] += star(x, y, s * 1.3);
      else if (R() < 0.5) fills[ci] += circ(x, y, s * 0.6);
      else { const a = R() * Math.PI, dx = Math.cos(a) * s, dy = Math.sin(a) * s, nx = -Math.sin(a) * s * 0.35, ny = Math.cos(a) * s * 0.35; fills[ci] += `M${r2(x - dx + nx)} ${r2(y - dy + ny)}L${r2(x + dx + nx)} ${r2(y + dy + ny)}L${r2(x + dx - nx)} ${r2(y + dy - ny)}L${r2(x - dx - nx)} ${r2(y - dy - ny)}Z`; }
    }
    fills.forEach((d, i) => { if (d) it.push({ t: 'p', d, fill: cols[i], op: 0.9 }); });
  } else if (p === 'lace') {
    // viền ren (doily): vỏ sò viền nét + chấm
    const r = b * 0.3, inset = b * 0.25, sw = Math.max(0.35, b * 0.045);
    const color = pal.accent2;
    const run = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
      const L = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.round(L / (2 * r))), ux = (x1 - x0) / L, uy = (y1 - y0) / L;
      let arcs = '', dots = '';
      for (let i = 0; i < n; i++) {
        const ax = x0 + ux * (L * i) / n, ay = y0 + uy * (L * i) / n, bx = x0 + ux * (L * (i + 1)) / n, by = y0 + uy * (L * (i + 1)) / n;
        const rr = L / n / 2;
        arcs += `M${r2(ax)} ${r2(ay)}A${r2(rr)} ${r2(rr)} 0 0 ${nx + ny > 0 ? 0 : 1} ${r2(bx)} ${r2(by)}`;
        dots += circ((ax + bx) / 2 + nx * rr * 0.45, (ay + by) / 2 + ny * rr * 0.45, rr * 0.16);
      }
      it.push({ t: 'p', d: arcs, stroke: color, sw });
      it.push({ t: 'p', d: dots, fill: color });
      it.push({ t: 'p', d: `M${r2(x0)} ${r2(y0)}L${r2(x1)} ${r2(y1)}`, stroke: color, sw: sw * 0.8, op: 0.8 });
    };
    if (e.t) run(inset, inset, w - inset, inset, 0, 1);
    if (e.b) run(inset, h - inset, w - inset, h - inset, 0, -1);
    if (e.l) run(inset, inset, inset, h - inset, 1, 0);
    if (e.r) run(w - inset, inset, w - inset, h - inset, -1, 0);
  } else if (p === 'stripes') {
    // sọc kẹo xéo
    const band = b * 0.62, q = b * 0.34; let d = '';
    const strip = (y0: number) => { for (let x = -band; x < w + band; x += 2 * q) d += `M${r2(x)} ${r2(y0 + band)}L${r2(x + q)} ${r2(y0 + band)}L${r2(x + q + band)} ${r2(y0)}L${r2(x + band)} ${r2(y0)}Z`; };
    if (e.t) strip(0);
    if (e.b) strip(h - band);
    if (e.t) it.push({ t: 'p', d: rect(0, 0, w, band), fill: pal.accent2, op: 0.55 });
    if (e.b) it.push({ t: 'p', d: rect(0, h - band, w, band), fill: pal.accent2, op: 0.55 });
    it.push({ t: 'p', d, fill: pal.accent });
  } else if (p === 'gingham') {
    // ca rô gingham: sọc dọc + sọc ngang mờ chồng nhau
    const band = b * 0.85, q = band / 3; let v = '', hz = '';
    const rows = (y0: number) => {
      for (let x = 0; x < w; x += 2 * q) v += rect(x, y0, q, band);
      for (let j = 0; j < 3; j += 2) hz += rect(0, y0 + j * q, w, q);
    };
    if (e.t) rows(0);
    if (e.b) rows(h - band);
    it.push({ t: 'p', d: v, fill: pal.accent, op: 0.5 });
    it.push({ t: 'p', d: hz, fill: pal.accent, op: 0.5 });
  } else if (p === 'drip') {
    // kem/socola chảy từ mép trên
    if (e.t) {
      const R = rng(seed * 31 + Math.round(w));
      const base = b * 0.32, dw = b * 0.42;
      let d = `M0 0H${r2(w)}V${r2(base)}`;
      const n = Math.max(2, Math.round(w / (dw * 2.1)));
      for (let i = n - 1; i >= 0; i--) {
        const x = ((i + 0.5) * w) / n, depth = b * (0.3 + R() * 0.75), rr = dw / 2;
        d += `L${r2(x + rr)} ${r2(base)}L${r2(x + rr)} ${r2(base + depth - rr)}A${r2(rr)} ${r2(rr)} 0 0 1 ${r2(x - rr)} ${r2(base + depth - rr)}L${r2(x - rr)} ${r2(base)}`;
      }
      d += `L0 ${r2(base)}Z`;
      it.push({ t: 'p', d, fill: pal.accent });
    }
    if (e.b) it.push({ t: 'p', d: rect(0, h - b * 0.22, w, b * 0.22), fill: pal.accent });
  } else if (p === 'line') {
    const i1 = b * 0.38, i2 = b * 0.62;
    if (e.l || e.r) {
      it.push({ t: 'p', d: rect(i1, i1, w - 2 * i1, h - 2 * i1), stroke: pal.accent2 === pal.bg ? pal.accent : pal.accent2, sw: b * 0.07 });
      it.push({ t: 'p', d: rect(i2, i2, w - 2 * i2, h - 2 * i2), stroke: pal.accent2 === pal.bg ? pal.accent : pal.accent2, sw: b * 0.03 });
    } else {
      if (e.t) it.push({ t: 'p', d: `M0 ${r2(i1)}H${r2(w)}M0 ${r2(i2)}H${r2(w)}`, stroke: pal.accent2, sw: b * 0.05 });
      if (e.b) it.push({ t: 'p', d: `M0 ${r2(h - i1)}H${r2(w)}M0 ${r2(h - i2)}H${r2(w)}`, stroke: pal.accent2, sw: b * 0.05 });
    }
  } else if (p === 'mai') {
    // chùm hoa mai ở góc
    const s = b * 1.05;
    const corners: [number, number, boolean][] = [[s * 0.55, s * 0.55, e.t && (e.l || !e.r)], [w - s * 0.55, s * 0.55, e.t && (e.r || !e.l)], [s * 0.55, h - s * 0.55, e.b && e.l], [w - s * 0.55, h - s * 0.55, e.b && e.r]];
    for (const [x, y, on] of corners) {
      if (!on) continue;
      it.push(...icon('mai', x, y, s * 0.9, pal.accent, bgc));
      it.push(...icon('mai', x + (x < w / 2 ? s * 0.75 : -s * 0.75), y + (y < h / 2 ? s * 0.32 : -s * 0.32), s * 0.5, pal.accent, bgc));
    }
  }
  return it;
}

// ---- cửa sổ (vùng khoét, toạ độ của Art) ----
export interface Win { shape: Exclude<WinShape, 'none'>; cx: number; cy: number; w: number; h: number }
type Pt = [number, number];
export function winPts(win: Win, grow = 0): Pt[] {
  const { cx, cy } = win, hw = win.w / 2 + grow, hh = win.h / 2 + grow;
  const out: Pt[] = [];
  if (win.shape === 'oval') {
    for (let i = 0; i < 96; i++) { const a = (i / 96) * Math.PI * 2; out.push([cx + Math.cos(a) * hw, cy + Math.sin(a) * hh]); }
  } else if (win.shape === 'rect') {
    const r = Math.min(win.w, win.h) * 0.14 + grow;
    const cs: [number, number, number][] = [[cx + hw - r, cy - hh + r, -Math.PI / 2], [cx + hw - r, cy + hh - r, 0], [cx - hw + r, cy + hh - r, Math.PI / 2], [cx - hw + r, cy - hh + r, Math.PI]];
    for (const [x, y, a0] of cs) for (let i = 0; i <= 10; i++) { const a = a0 + (i / 10) * (Math.PI / 2); out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
  } else {
    const raw: Pt[] = [];
    for (let i = 0; i < 120; i++) {
      const t = (i / 120) * Math.PI * 2;
      raw.push([16 * Math.sin(t) ** 3, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t))]);
    }
    const xs = raw.map((p) => p[0]), ys = raw.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    for (const [x, y] of raw) out.push([cx - hw + ((x - x0) / (x1 - x0)) * 2 * hw, cy - hh + ((y - y0) / (y1 - y0)) * 2 * hh]);
  }
  return out;
}
export const winPath = (win: Win, grow = 0) => `M${winPts(win, grow).map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z`;

export type Role = 'top' | 'topWide' | 'lid' | 'front' | 'frontWin' | 'side' | 'back' | 'plain' | 'tuck' | 'insert';
// cửa sổ theo mặt: nắp hộp bánh kem / cupcake, mặt trước hộp tráng miệng
export function winFor(role: Role, aw: number, ah: number, shape: WinShape): Win | null {
  if (shape === 'none') return null;
  if (role === 'top') {
    if (aw / ah >= 1.55) return { shape, cx: aw * 0.35, cy: ah * 0.5, w: aw * 0.48, h: ah * 0.66 };
    return { shape, cx: aw / 2, cy: ah * 0.46, w: aw * (aw / ah > 1.3 ? 0.66 : 0.6), h: ah * 0.48 };
  }
  if (role === 'topWide') return aw / ah >= 1.55 ? { shape, cx: aw * 0.35, cy: ah * 0.5, w: aw * 0.5, h: ah * 0.7 } : { shape, cx: aw / 2, cy: ah * 0.555, w: aw * 0.76, h: ah * 0.63 };
  if (role === 'frontWin') return { shape, cx: aw / 2, cy: ah * 0.6, w: aw * 0.62, h: ah * 0.36 };
  return null;
}

export interface Ctx { look: CbLook; pal: CbPalette; font: CbFont; data: CbData; logo?: string }
const bgOf = (pal: CbPalette) => (pal.kraft ? null : pal.bg);
const bgc = (pal: CbPalette) => (pal.kraft ? KRAFT : pal.bg);
const noteColor = (pal: CbPalette) => (pal.accent2 === pal.ink || pal.accent2 === pal.bg ? pal.accent : pal.accent);

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
    ...icon(c.look.motif, cx, cy + r * 0.02, r * 1.05, pal.onAccent, pal.accent),
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

const NONE: Edges = { t: false, b: false, l: false, r: false };
// hoạ tiết dải (vỏ sò, ca rô, sọc, kem chảy) đã chạy quanh các THÀNH hộp → mặt nắp để trơn cho khỏi 2 dải chồng ở nếp gấp
const BAND: Pattern[] = ['scallop', 'gingham', 'stripes', 'drip'];
const edgesFor = (p: Pattern, top: boolean): Edges => {
  if (top) return BAND.includes(p) ? NONE : ALL;
  if (p === 'drip') return { t: true, b: true, l: false, r: false };
  return TB;
};
const padFor = (p: Pattern, b: number, top: boolean) => (top && BAND.includes(p) ? b * 0.5 : padOf(p, b));

// ---- bố cục có CỬA SỔ: dải trên (lời ngọt / logo) · cửa sổ · dải dưới (tên tiệm, giới thiệu, hotline) ----
function windowedArt(w: number, h: number, c: Ctx, win: Win, role: Role, seed: number): Art {
  const { pal, font, data, look } = c;
  const m = Math.min(w, h), it: Item[] = [];
  const isTop = role !== 'frontWin';
  const b = isTop ? m * 0.075 : m * 0.1;
  it.push(...pattern(look.pattern, w, h, pal, b, edgesFor(look.pattern, isTop), seed));
  const pad = padFor(look.pattern, b, isTop) + m * 0.025;
  // khung in quanh cửa sổ (che mép keo màng)
  const frame = pal.accent2 === pal.bg ? pal.accent : pal.accent2;
  it.push({ t: 'p', d: winPath(win, 4.5), stroke: frame, sw: Math.max(0.6, m * 0.007) });
  it.push({ t: 'p', d: winPath(win, 6.8), stroke: frame, sw: Math.max(0.35, m * 0.0035), op: 0.7, dash: `${r2(m * 0.012)} ${r2(m * 0.01)}` });
  const horizontal = win.cx < w * 0.45;
  if (horizontal) {
    // nắp dẹp: cửa sổ bên trái, cột chữ bên phải
    const x0 = win.cx + win.w / 2 + 10, x1 = w - pad, colW = x1 - x0, cx = (x0 + x1) / 2;
    const top = pad, avail = h - 2 * pad;
    const plan = (f: number) => {
      const bl = brandLines(data.brand || '', font.family, font.weight, avail * 0.2 * f, colW);
      const ns = avail * 0.11 * f, ts = avail * 0.075 * f, ps = avail * 0.07 * f;
      let y = 0;
      const noteY = data.note ? (y += ns * 1.05) : 0;
      if (data.note) y += ns * 0.5;
      const brandY = (y += bl.size * 0.9);
      y += (bl.lines.length - 1) * bl.size * 1.06;
      const tagY = data.tagline ? (y += bl.size * 0.3 + ts * 1.2) : y;
      const pillY = data.hotline ? (y += ts * 0.5 + ps * 1.5) : y;
      const total = data.hotline ? pillY + ps : y + ts * 0.3;
      return { f, bl, ns, ts, ps, noteY, brandY, tagY, pillY, total };
    };
    let L = plan(1);
    for (let f = 0.95; L.total > avail && f > 0.4; f -= 0.05) L = plan(f);
    const y0 = top + Math.max(0, (avail - L.total) / 2);
    if (data.note) it.push(...Topt(data.note, cx, y0 + L.noteY, L.ns, colW, SCRIPT, 700, noteColor(pal)));
    L.bl.lines.forEach((ln, i) => it.push({ t: 'x', s: ln, x: cx, y: y0 + L.brandY + i * L.bl.size * 1.06, size: L.bl.size, family: font.family, weight: font.weight, color: pal.ink }));
    it.push(...Topt(data.tagline, cx, y0 + L.tagY, L.ts, colW, BODY, 600, pal.ink, { op: 0.85 }));
    if (data.hotline) it.push(...pill(cx, y0 + L.pillY, data.hotline, L.ps, colW, c));
    if (c.logo) it.push(...badge(win.cx + win.w / 2 + 2, pad + avail * 0.08, Math.min(avail * 0.11, 14), c));
    return { w, h, bg: bgOf(pal), items: it };
  }
  const maxW = w - 2 * pad - m * 0.02;
  const wy0 = win.cy - win.h / 2, wy1 = win.cy + win.h / 2;
  const above = { top: pad, h: wy0 - 7.5 - pad }, below = { top: wy1 + 7.5, h: h - pad - (wy1 + 7.5) };
  // dải lớn hơn chứa tên tiệm + giới thiệu + hotline; dải còn lại chứa lời ngọt / logo
  const main = below.h >= above.h * 0.9 ? below : above, other = main === below ? above : below;
  if (other.h > 7) {
    const mid = other.top + other.h / 2;
    if (c.logo) it.push(...badge(w / 2, mid, Math.min(other.h * 0.48, w * 0.1), c));
    else if (data.note) {
      const s = Math.min(other.h * 0.62, m * 0.08);
      const tw = Math.min(textW(data.note, SCRIPT, 700, s), maxW * 0.74);
      const sz = Math.min(s, (s * maxW * 0.74) / Math.max(1, textW(data.note, SCRIPT, 700, s)));
      if (sz >= 1.8) it.push({ t: 'x', s: data.note, x: w / 2, y: mid + sz * 0.33, size: sz, family: SCRIPT, weight: 700, color: noteColor(pal) });
      const hs = Math.min(other.h * 0.5, sz * 1.1);
      if (tw / 2 + hs * 1.6 < maxW / 2) for (const sgn of [-1, 1]) it.push(...icon('heart', w / 2 + sgn * (tw / 2 + hs * 0.95), mid, hs, pal.accent2 === pal.bg ? pal.accent : pal.accent2, bgc(pal)));
    }
  }
  const bTop = main.top, bh = main.h;
  if (bh < 7) return { w, h, bg: bgOf(pal), items: it };
  const small = bh < 30; // dải thấp (hộp nhỏ): bỏ câu giới thiệu, chỉ tên + hotline
  const plan = (f: number) => {
    const bl = brandLines(data.brand || '', font.family, font.weight, bh * (small ? 0.42 : 0.34) * f, maxW);
    let y = bl.size * 0.82;
    const brandY = y;
    y += (bl.lines.length - 1) * bl.size * 1.06;
    const ts = bh * 0.12 * f;
    const tagY = data.tagline && !small ? (y += bl.size * 0.3 + ts * 1.15) : y;
    const ps = bh * (small ? 0.13 : 0.1) * f;
    const pillY = data.hotline ? (y += (small ? bl.size * 0.3 : ts * 0.45) + ps * 1.35) : y;
    const total = data.hotline ? pillY + ps : y + bl.size * 0.25;
    return { f, bl, brandY, ts, tagY, ps, pillY, total };
  };
  let L = plan(1);
  for (let f = 0.95; L.total > bh && f > 0.4; f -= 0.05) L = plan(f);
  const y0 = bTop + Math.max(0, (bh - L.total) / 2);
  L.bl.lines.forEach((ln, i) => it.push({ t: 'x', s: ln, x: w / 2, y: y0 + L.brandY + i * L.bl.size * 1.06, size: L.bl.size, family: font.family, weight: font.weight, color: pal.ink }));
  if (!small) it.push(...Topt(data.tagline, w / 2, y0 + L.tagY, L.ts, maxW, BODY, 600, pal.ink, { op: 0.85 }));
  if (data.hotline) it.push(...pill(w / 2, y0 + L.pillY, data.hotline, L.ps, maxW, c));
  return { w, h, bg: bgOf(pal), items: it };
}

// ---- bố cục KHÔNG cửa sổ (nắp đặc): huy hiệu → tên → giới thiệu → gạch → lời ngọt → hotline ----
function stackArt(w: number, h: number, c: Ctx, seed: number): Art {
  const { pal, font, data, look } = c;
  const m = Math.min(w, h), it: Item[] = [];
  const b = m * 0.075;
  it.push(...pattern(look.pattern, w, h, pal, b, edgesFor(look.pattern, true), seed));
  const pad = padFor(look.pattern, b, true) + m * 0.03;
  const maxW = w - 2 * pad - m * 0.04;
  const sizeB = font.script ? 0.125 : 0.115;
  const compact = m < 130;
  const plan = (f: number) => {
    const r = m * 0.16 * f;
    const bl = brandLines(data.brand || '', font.family, font.weight, m * sizeB * f, maxW);
    const sc = font.script ? 1.25 : 1;
    let y = 2 * r + m * 0.045 * f + bl.size * 0.85 * sc;
    const brandY = y;
    y += (bl.lines.length - 1) * bl.size * 1.06 * sc + bl.size * (font.script ? 0.85 : 0.35) + m * 0.05 * f;
    const tagY = y; y += m * 0.04 * f;
    const divY = y; if (!compact) y += m * 0.06 * f;
    const noteY = data.note && !compact ? y : y - m * 0.03 * f;
    const ps = m * 0.036 * f;
    const pillY = noteY + m * 0.05 * f + ps * 1.4;
    const total = data.hotline ? pillY + ps : noteY + m * 0.015;
    return { f, r, bl, brandY, tagY, divY, noteY, ps, pillY, total };
  };
  const avail = h - 2 * pad;
  let L = plan(1);
  for (let f = 0.95; L.total > avail && f > 0.4; f -= 0.05) L = plan(f);
  const y0 = pad + Math.max(0, (avail - L.total) / 2);
  it.push(...badge(w / 2, y0 + L.r, L.r, c));
  L.bl.lines.forEach((ln, i) => it.push({ t: 'x', s: ln, x: w / 2, y: y0 + L.brandY + i * L.bl.size * 1.06 * (font.script ? 1.25 : 1), size: L.bl.size, family: font.family, weight: font.weight, color: pal.ink }));
  it.push(...Topt(data.tagline, w / 2, y0 + L.tagY, m * 0.044 * L.f, maxW, BODY, 600, pal.ink, { op: 0.85 }));
  if (!compact) {
    it.push({ t: 'p', d: `M${r2(w / 2 - m * 0.06)} ${r2(y0 + L.divY)}H${r2(w / 2 + m * 0.06)}`, stroke: pal.accent2 === pal.bg ? pal.accent : pal.accent2, sw: m * 0.008 });
    it.push(...Topt(data.note, w / 2, y0 + L.noteY, m * 0.05 * L.f, maxW, SCRIPT, 700, noteColor(pal)));
  }
  if (data.hotline) it.push(...pill(w / 2, y0 + L.pillY, data.hotline, L.ps, maxW, c));
  return { w, h, bg: bgOf(pal), items: it };
}

// ---- MẶT TRƯỚC (thành hộp, không cửa sổ) ----
function frontArt(w: number, h: number, c: Ctx, seed: number): Art {
  const { pal, font, data, look } = c;
  const m = Math.min(w, h), it: Item[] = [];
  const b = m * 0.13;
  it.push(...pattern(look.pattern, w, h, pal, b, TB, seed));
  const pad = padOf(look.pattern, b) + m * 0.04;
  const avail = h - 2 * pad;
  if (w / h >= 1.45) {
    const r = Math.min(avail * 0.4, w * 0.13);
    const bx = pad + m * 0.06 + r;
    it.push(...badge(bx, h / 2, r, c));
    const x0 = bx + r + m * 0.1, colW = w - pad - m * 0.04 - x0, cx = x0 + colW / 2;
    const plan = (f: number) => {
      const bl = brandLines(data.brand || '', font.family, font.weight, avail * 0.34 * f, colW);
      const ns = avail * 0.17 * f, ps = avail * 0.11 * f;
      let y = bl.size * 0.82;
      const brandY = y;
      y += (bl.lines.length - 1) * bl.size * 1.06;
      const noteY = data.note ? (y += bl.size * 0.42 + ns * 1.12) : y;
      const pillY = data.hotline ? (y += ns * 0.45 + ps * 1.4) : y;
      const total = data.hotline ? pillY + ps : y + ns * 0.3;
      return { bl, ns, ps, brandY, noteY, pillY, total };
    };
    let L = plan(1);
    for (let f = 0.95; L.total > avail && f > 0.4; f -= 0.05) L = plan(f);
    const y0 = pad + Math.max(0, (avail - L.total) / 2);
    L.bl.lines.forEach((ln, i) => it.push({ t: 'x', s: ln, x: cx, y: y0 + L.brandY + i * L.bl.size * 1.06, size: L.bl.size, family: font.family, weight: font.weight, color: pal.ink }));
    it.push(...Topt(data.note, cx, y0 + L.noteY, L.ns, colW, SCRIPT, 700, noteColor(pal)));
    if (data.hotline) it.push(...pill(cx, y0 + L.pillY, data.hotline, L.ps, colW, c));
  } else {
    const maxW = w - 2 * pad - m * 0.04;
    const plan = (f: number) => {
      const r = avail * 0.16 * f;
      const bl = brandLines(data.brand || '', font.family, font.weight, avail * 0.15 * f, maxW);
      const ns = avail * 0.08 * f, ps = avail * 0.055 * f;
      let y = 2 * r + bl.size * 1.1;
      const brandY = y;
      y += (bl.lines.length - 1) * bl.size * 1.06;
      const noteY = data.note ? (y += bl.size * 0.3 + ns * 1.1) : y;
      const pillY = data.hotline ? (y += ns * 0.4 + ps * 1.4) : y;
      const total = data.hotline ? pillY + ps : y + ns * 0.3;
      return { r, bl, ns, ps, brandY, noteY, pillY, total };
    };
    let L = plan(1);
    for (let f = 0.95; L.total > avail && f > 0.4; f -= 0.05) L = plan(f);
    const y0 = pad + Math.max(0, (avail - L.total) / 2);
    it.push(...badge(w / 2, y0 + L.r, L.r, c));
    L.bl.lines.forEach((ln, i) => it.push({ t: 'x', s: ln, x: w / 2, y: y0 + L.brandY + i * L.bl.size * 1.06, size: L.bl.size, family: font.family, weight: font.weight, color: pal.ink }));
    it.push(...Topt(data.note, w / 2, y0 + L.noteY, L.ns, maxW, SCRIPT, 700, noteColor(pal)));
    if (data.hotline) it.push(...pill(w / 2, y0 + L.pillY, data.hotline, L.ps, maxW, c));
  }
  return { w, h, bg: bgOf(pal), items: it };
}

// ---- MẶT HÔNG: hình vẽ lớn + tên nhỏ + fanpage ----
function sideArt(w: number, h: number, c: Ctx, seed: number): Art {
  const { pal, font, data, look } = c;
  const m = Math.min(w, h), it: Item[] = [];
  const b = m * 0.13;
  it.push(...pattern(look.pattern, w, h, pal, b, TB, seed));
  const pad = padOf(look.pattern, b) + m * 0.04;
  const avail = h - 2 * pad, fg = pal.accent, hole = bgc(pal);
  if (w / h >= 1.45) {
    const s = avail * 0.78;
    const colW = w - 2 * pad - s - m * 0.12;
    const bl = brandLines(data.brand || '', font.family, font.weight, avail * 0.24, colW);
    const ws = Math.min(avail * 0.1, bl.size * 0.55);
    const tw = Math.min(colW, Math.max(...bl.lines.map((ln) => textW(ln, font.family, font.weight, bl.size))));
    const gx = (w - (s + m * 0.1 + tw)) / 2;
    it.push(...icon(look.motif, gx + s / 2, h / 2, s, fg, hole));
    const tx = gx + s + m * 0.1;
    const blockH = bl.lines.length * bl.size * 1.06 + (data.website ? ws * 1.8 : 0);
    let y = h / 2 - blockH / 2 + bl.size * 0.82;
    for (const ln of bl.lines) { it.push(...T(ln, tx, y, bl.size, colW, font.family, font.weight, pal.ink, { anchor: 'start' })); y += bl.size * 1.06; }
    it.push(...Topt(data.website, tx, y + ws * 0.6, ws, colW, BODY, 600, pal.ink, { anchor: 'start', op: 0.8 }));
  } else {
    const s = avail * 0.42;
    it.push(...icon(look.motif, w / 2, pad + s * 0.55, s, fg, hole));
    const maxW = w - 2 * pad - m * 0.04;
    const bl = brandLines(data.brand || '', font.family, font.weight, avail * 0.13, maxW);
    let y = pad + s * 1.1 + bl.size * 1.1;
    for (const ln of bl.lines) { it.push(...T(ln, w / 2, y, bl.size, maxW, font.family, font.weight, pal.ink)); y += bl.size * 1.06; }
    it.push(...Topt(data.website, w / 2, y + avail * 0.03, Math.min(avail * 0.065, bl.size * 0.6), maxW, BODY, 600, pal.ink, { op: 0.8 }));
  }
  return { w, h, bg: bgOf(pal), items: it };
}

// ---- MẶT SAU: lời cảm ơn + bảo quản + hotline · fanpage ----
function backArt(w: number, h: number, c: Ctx, seed: number): Art {
  const { pal, font, data, look } = c;
  const m = Math.min(w, h), it: Item[] = [];
  const b = m * 0.13;
  it.push(...pattern(look.pattern, w, h, pal, b, TB, seed));
  const pad = padOf(look.pattern, b) + m * 0.04;
  const avail = h - 2 * pad, maxW = w - 2 * pad - m * 0.04;
  const lines: { s: string; size: number; fam: string; wt: number; color: string; op?: number }[] = [];
  const thank = `Cảm ơn bạn đã chọn ${data.brand || 'tiệm'}`;
  lines.push({ s: thank, size: avail * 0.17, fam: SCRIPT, wt: 700, color: noteColor(pal) });
  if (data.care) lines.push({ s: data.care, size: avail * 0.085, fam: BODY, wt: 600, color: pal.ink, op: 0.85 });
  const contact = [data.hotline, data.website].filter(Boolean).join('  ·  ');
  if (contact) lines.push({ s: contact, size: avail * 0.095, fam: BODY, wt: 800, color: pal.ink });
  // co từng dòng theo bề ngang, rồi co cả khối theo chiều cao
  const sized = lines.map((l) => ({ ...l, size: Math.min(l.size, (l.size * maxW) / Math.max(1, textW(l.s, l.fam, l.wt, l.size))) }));
  const gap = (s: number) => s * 1.55;
  let total = sized.reduce((a, l) => a + gap(l.size), 0);
  const k = total > avail ? avail / total : 1;
  total *= k;
  let y = pad + (avail - total) / 2;
  for (const l of sized) { const s = l.size * k; y += gap(s) * 0.72; if (s >= 1.6) it.push({ t: 'x', s: l.s, x: w / 2, y, size: s, family: l.fam, weight: l.wt, color: l.color, op: l.op }); y += gap(s) * 0.28; }
  void font;
  return { w, h, bg: bgOf(pal), items: it };
}

// ---- ĐÁY / thành đế thấp / lưỡi gài: nền trơn + 1 dòng nhỏ ----
function plainArt(w: number, h: number, c: Ctx, text?: string): Art {
  const it: Item[] = [];
  const m = Math.min(w, h);
  if (text && m > 12) it.push(...T(text, w / 2, h / 2 + m * 0.12, Math.min(m * 0.3, 7), w * 0.7, BODY, 600, c.pal.ink, { op: 0.6 }));
  return { w, h, bg: bgOf(c.pal), items: it };
}
// ---- khay cupcake: nền nhạt + chấm mờ ----
function insertArt(w: number, h: number, c: Ctx): Art {
  const { pal } = c;
  const dark = isDarkHex(pal.bg);
  const bg = pal.kraft ? null : dark ? '#F7EFE6' : pal.bg;
  const g = Math.max(9, Math.min(w, h) * 0.09); let d = '';
  for (let y = g / 2, row = 0; y < h; y += g * 0.87, row++) for (let x = (row % 2 ? g / 2 : 0) + g / 4; x < w; x += g) d += circ(x, y, g * 0.12);
  return { w, h, bg, items: [{ t: 'p', d, fill: dark ? '#C9A27A' : pal.accent, op: 0.16 }] };
}
export const isDarkHex = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 110;
};

export function ctxOf(spec: CbSpec, data: CbData, logo?: string): Ctx {
  return { look: cbLook(spec.look), pal: cbPalette(spec.palette), font: cbFont(spec.font), data, logo };
}
export function artFor(role: Role, w: number, h: number, c: Ctx, win: Win | null, seed = 1): Art {
  if (role === 'top' || role === 'topWide') return win ? windowedArt(w, h, c, win, role, seed) : stackArt(w, h, c, seed);
  if (role === 'lid') return stackArt(w, h, c, seed);
  if (role === 'frontWin') return win ? windowedArt(w, h, c, win, role, seed) : frontArt(w, h, c, seed);
  if (role === 'front') return frontArt(w, h, c, seed);
  if (role === 'side') return sideArt(w, h, c, seed);
  if (role === 'back') return backArt(w, h, c, seed);
  if (role === 'insert') return insertArt(w, h, c);
  if (role === 'tuck') return plainArt(w, h, c);
  return plainArt(w, h, c, c.data.brand);
}

// ---- vẽ Art: SVG ----
let clipSeq = 0;
export function ArtG({ art }: { art: Art }) {
  const [pre] = useState(() => `cbc${++clipSeq}`);
  return (
    <>
      {art.bg && <rect x={0} y={0} width={art.w} height={art.h} fill={art.bg} />}
      {art.items.map((a, i) => {
        if (a.t === 'p') return <path key={i} d={a.d} fill={a.fill ?? 'none'} stroke={a.stroke} strokeWidth={a.sw} opacity={a.op} fillRule={a.eo ? 'evenodd' : undefined} strokeDasharray={a.dash} strokeLinecap="round" strokeLinejoin="round" />;
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
      if (a.stroke) {
        ctx.strokeStyle = a.stroke; ctx.lineWidth = a.sw ?? 0.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        if (a.dash) ctx.setLineDash(a.dash.split(/\s+/).map(Number));
        ctx.stroke(path);
      }
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
interface Poly { pts: Pt[] }
export interface Panel { x: number; y: number; w: number; h: number; rot: 0 | 90 | 180 | -90; role: Role; win?: Win; seed: number }
export const artSize = (pn: Panel): [number, number] => (pn.rot === 90 || pn.rot === -90 ? [pn.h, pn.w] : [pn.w, pn.h]);
// toạ độ trong Art của tấm → toạ độ tấm khuôn (chưa cộng lề ox/oy)
export function panelPt(pn: Panel, ax: number, ay: number): Pt {
  const [aw, ah] = artSize(pn);
  const dx = ax - aw / 2, dy = ay - ah / 2, a = (pn.rot * Math.PI) / 180, cs = Math.round(Math.cos(a)), sn = Math.round(Math.sin(a));
  return [pn.x + pn.w / 2 + dx * cs - dy * sn, pn.y + pn.h / 2 + dx * sn + dy * cs];
}

const R = (x: number, y: number, w: number, h: number): Poly => ({ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]] });
const Q = (...pts: Pt[]): Poly => ({ pts });

interface DieBase { polys: Poly[]; panels: Panel[]; folds: [Pt, Pt][]; holes: string; winHoles: string; pieces: number; insertHoles: number }
function buildDie(spec: CbSpec): DieBase {
  const s = cbSize(spec.size);
  const polys: Poly[] = [], panels: Panel[] = [], folds: [Pt, Pt][] = [];
  let holes = '', winHoles = '', pieces = 1, insertHoles = 0, seed = 1;
  const add = (x: number, y: number, w: number, h: number, rot: Panel['rot'], role: Role) => {
    polys.push(R(x, y, w, h));
    const pn: Panel = { x, y, w, h, rot, role, seed: seed++ };
    const [aw, ah] = artSize(pn);
    const win = winFor(role, aw, ah, spec.win);
    if (win) {
      pn.win = win;
      winHoles += `M${winPts(win).map(([px, py]) => panelPt(pn, px, py)).map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z`;
    }
    panels.push(pn);
    return pn;
  };
  const web = (cx: number, cy: number, sx: number, sy: number, H: number) => {
    polys.push(R(sx < 0 ? cx - H : cx, sy < 0 ? cy - H : cy, H, H));
    folds.push([[cx, cy], [cx + sx * H, cy + sy * H]]);
  };
  const corners = (W: number, Dd: number): [number, number, number, number][] => [[0, Dd, -1, 1], [W, Dd, 1, 1], [0, 0, -1, -1], [W, 0, 1, -1]];
  if (spec.kind === 'cake') {
    // NẮP CHỤP (cao hết hộp, cửa sổ trên nắp): nắp ở giữa, 4 thành gập XUỐNG, góc gấp vát (kín, không keo góc)
    const W = s.w + 3, H = s.h;
    add(0, 0, W, W, 0, 'top');
    add(0, W, W, H, 0, 'front');
    add(0, -H, W, H, 180, 'back');
    add(-H, 0, H, W, 90, 'side');
    add(W, 0, H, W, -90, 'side');
    for (const [cx, cy, sx, sy] of corners(W, W)) web(cx, cy, sx, sy, H);
    // ĐẾ (khay thấp 30mm) — tấm rời đặt bên phải
    const Wb = s.w, hb = 30, dx = W + H + 18 + hb, dy = (W - Wb) / 2;
    add(dx, dy, Wb, Wb, 0, 'plain');
    add(dx, dy + Wb, Wb, hb, 180, 'plain');
    add(dx, dy - hb, Wb, hb, 0, 'plain');
    add(dx - hb, dy, hb, Wb, -90, 'plain');
    add(dx + Wb, dy, hb, Wb, 90, 'plain');
    for (const [cx, cy, sx, sy] of corners(Wb, Wb)) web(dx + cx, dy + cy, sx, sy, hb);
    pieces = 2;
  } else if (spec.kind === 'cupcake') {
    // HỘP 1 MẢNH: đáy + 4 thành (góc vát) + nắp nối thành sau (cửa sổ) + vạt trước có lưỡi gài + tai chắn bụi
    const W = s.w, Dd = s.d, H = s.h;
    add(0, 0, W, Dd, 0, 'plain');
    add(0, Dd, W, H, 180, 'front');
    add(0, -H, W, H, 0, 'back');
    add(-H, 0, H, Dd, -90, 'side');
    add(W, 0, H, Dd, 90, 'side');
    for (const [cx, cy, sx, sy] of corners(W, Dd)) web(cx, cy, sx, sy, H);
    add(0, -H - Dd, W, Dd, 180, 'topWide');
    const lipH = 22;
    add(0, -H - Dd - lipH, W, lipH, 180, 'tuck');
    const ty = -H - Dd - lipH, tH = 14;
    polys.push(Q([6, ty], [11, ty - tH], [W - 11, ty - tH], [W - 6, ty]));
    for (const sgn of [-1, 1] as const) {
      const ex = sgn < 0 ? 0 : W, fw = sgn < 0 ? -(H - 14) : H - 14;
      polys.push(Q([ex, -H - 6], [ex + fw, -H - 14], [ex + fw, -H - Dd + 14], [ex, -H - Dd + 6]));
    }
    // KHAY ĐỠ (tấm rời): mặt khay có lỗ tròn + 2 chân gập xuống
    const g = cupcakeGrid(s), Wi = W - 4, Di = Dd - 4, L = INSERT_LEG, dx = W + H + 22;
    add(dx, L, Wi, Di, 0, 'insert');
    add(dx, 0, Wi, L, 0, 'insert');
    add(dx, L + Di, Wi, L, 0, 'insert');
    for (const cl of g.cells) holes += circ(dx + cl.x - 2, L + cl.y - 2, g.holeR);
    insertHoles = g.cells.length;
    pieces = 2;
  } else {
    // HỘP NẮP GÀI ĐẢO CHIỀU: 4 thành 1 hàng + tai dán; nắp trên từ thành sau, đáy từ thành trước; cửa sổ mặt trước
    const W = s.w, Dd = s.d, H = s.h;
    add(0, 0, W, H, 0, 'frontWin');
    add(W, 0, Dd, H, 0, 'side');
    add(W + Dd, 0, W, H, 0, 'back');
    add(2 * W + Dd, 0, Dd, H, 0, 'side');
    const X = 2 * W + 2 * Dd;
    polys.push(Q([X, 3], [X + 12, 9], [X + 12, H - 9], [X, H - 3]));
    add(W + Dd, -Dd, W, Dd, 180, 'lid');
    polys.push(Q([W + Dd + 2, -Dd], [W + Dd + 7, -Dd - 15], [2 * W + Dd - 7, -Dd - 15], [2 * W + Dd - 2, -Dd]));
    for (const x0 of [W, 2 * W + Dd]) {
      polys.push(Q([x0 + 1.5, 0], [x0 + 4, -Dd * 0.42], [x0 + Dd - 4, -Dd * 0.42], [x0 + Dd - 1.5, 0]));
      polys.push(Q([x0 + 1.5, H], [x0 + Dd - 1.5, H], [x0 + Dd - 4, H + Dd * 0.42], [x0 + 4, H + Dd * 0.42]));
    }
    add(0, H, W, Dd, 0, 'plain');
    polys.push(Q([2, H + Dd], [7, H + Dd + 15], [W - 7, H + Dd + 15], [W - 2, H + Dd]));
  }
  return { polys, panels, folds, holes, winHoles, pieces, insertHoles };
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

export interface DieOut extends DieBase { cut: string; cutLoops: number; foldD: string; W: number; H: number; ox: number; oy: number; kindName: string }
export function cbDieline(spec: CbSpec): DieOut {
  const base = buildDie(spec);
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
  return { ...base, W: maxX - minX + 2 * M, H: maxY - minY + 2 * M + 16, ox, oy, cut, cutLoops: ls.length, foldD, kindName: CB_KINDS.find((k) => k.id === spec.kind)!.name };
}

const CUT = '#E6007E', FOLD = '#009FE3', FILM = '#00A3C4';

// Dàn khuôn bế: preview = hiện kraft dưới nền + tô vùng cửa sổ (màng PET) cho dễ hình dung
export function CakeboxDieline({ spec, data, logo, preview = false, style }: { spec: CbSpec; data: CbData; logo?: string; preview?: boolean; style?: CSSProperties }) {
  const die = cbDieline(spec);
  const c = ctxOf(spec, data, logo);
  const [uid] = useState(() => `cbd${++clipSeq}`);
  const s = cbSize(spec.size);
  const sh = (p: Poly) => p.pts.map((q) => `${r2(q[0] + die.ox)},${r2(q[1] + die.oy)}`).join(' ');
  const shapes: ReactNode[] = die.polys.map((p, i) => <polygon key={i} points={sh(p)} />);
  const board = c.pal.kraft ? 'Giấy kraft 350gsm' : 'Giấy Ivory 350gsm (an toàn thực phẩm)';
  const winName = spec.win === 'none' ? 'không cửa sổ' : `cửa sổ ${CB_WINDOWS.find((x) => x.id === spec.win)!.name.toLowerCase()} — dán màng PET mặt trong`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${r2(die.W)} ${r2(die.H)}`} width={`${r2(die.W)}mm`} height={`${r2(die.H)}mm`} style={style}
      data-testid="cb-dieline" data-pieces={die.pieces} data-insert-holes={die.insertHoles} data-win={spec.win}>
      <defs>
        {die.panels.map((pn, i) => (
          <clipPath key={i} id={`${uid}-p${i}`}><rect x={pn.x + die.ox} y={pn.y + die.oy} width={pn.w} height={pn.h} /></clipPath>
        ))}
      </defs>
      <rect x={0} y={0} width={die.W} height={die.H} fill="#FFFFFF" />
      {preview && c.pal.kraft && <g fill={KRAFT} opacity={0.55}>{shapes}</g>}
      <g id="In">
        {!c.pal.kraft && <g fill={c.pal.bg} stroke={c.pal.bg} strokeWidth={CB_BLEED * 2} strokeLinejoin="miter">{shapes}</g>}
        {die.panels.map((pn, i) => {
          const [aw, ah] = artSize(pn);
          const art = artFor(pn.role, aw, ah, c, pn.win || null, pn.seed);
          const cx = pn.x + die.ox + pn.w / 2, cy = pn.y + die.oy + pn.h / 2;
          return (
            <g key={i} clipPath={`url(#${uid}-p${i})`} data-panel={pn.role}>
              <rect data-panel-rect="1" x={pn.x + die.ox} y={pn.y + die.oy} width={pn.w} height={pn.h} fill="none" />
              <g transform={`translate(${r2(cx)} ${r2(cy)}) rotate(${pn.rot}) translate(${r2(-aw / 2)} ${r2(-ah / 2)})`}>
                <ArtG art={art} />
                {pn.win && <rect data-win-rect="1" x={pn.win.cx - pn.win.w / 2} y={pn.win.cy - pn.win.h / 2} width={pn.win.w} height={pn.win.h} fill="none" />}
              </g>
            </g>
          );
        })}
      </g>
      {preview && die.winHoles && (
        <g data-legend="1">
          <path d={die.winHoles} transform={`translate(${r2(die.ox)} ${r2(die.oy)})`} fill="#E6F4F8" />
          <path d={die.winHoles} transform={`translate(${r2(die.ox)} ${r2(die.oy)})`} fill="none" stroke={FILM} strokeWidth={0.3} strokeDasharray="1.2 1.2" />
        </g>
      )}
      <g id="Fold" fill="none" stroke={FOLD} strokeWidth={0.35} strokeDasharray="3 2"><path d={die.foldD} /></g>
      <g id="CutContour" fill="none" stroke={CUT} strokeWidth={0.35}>
        <path d={die.cut} data-cut="outer" />
        {(die.holes || die.winHoles) && <path d={die.winHoles + die.holes} transform={`translate(${r2(die.ox)} ${r2(die.oy)})`} data-cut="holes" />}
      </g>
      <g data-legend="1" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.4} fill="#475569">
        <text x={12} y={die.H - 11}>{`${die.kindName} ${s.w}×${s.d}×${s.h}mm · ${board} · ${winName} · lề in ${CB_BLEED}mm`}</text>
        <path d={`M12 ${r2(die.H - 5.2)}h10`} stroke={CUT} strokeWidth={0.5} />
        <text x={25} y={die.H - 4}>đường cắt</text>
        <path d={`M52 ${r2(die.H - 5.2)}h10`} stroke={FOLD} strokeWidth={0.5} strokeDasharray="3 2" />
        <text x={65} y={die.H - 4}>đường gấp</text>
        {spec.kind === 'cupcake' && <text x={92} y={die.H - 4}>{`khay đỡ ${die.insertHoles} lỗ Ø${Math.round(cupcakeGrid(s).holeR * 2)}mm`}</text>}
        {c.pal.kraft && <text x={spec.kind === 'cupcake' ? 150 : 92} y={die.H - 4}>giấy kraft: không in nền</text>}
      </g>
    </svg>
  );
}

// thumbnail mẫu: mặt có cửa sổ (nắp hộp bánh kem / cupcake; mặt trước hộp tráng miệng). Vùng cửa sổ tô nhạt + hình bánh mờ.
export function HeroThumb({ spec, data, logo, style }: { spec: CbSpec; data: CbData; logo?: string; style?: CSSProperties }) {
  const dessert = spec.kind === 'dessert';
  const w = dessert ? 120 : 160, h = 120;
  const role: Role = dessert ? 'frontWin' : spec.kind === 'cupcake' ? 'topWide' : 'top';
  const win = winFor(role, w, h, spec.win);
  const c = ctxOf(spec, data, logo);
  const art = artFor(role, w, h, c, win);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={style} preserveAspectRatio="xMidYMid meet">
      {c.pal.kraft && <rect width={w} height={h} fill={KRAFT} />}
      <ArtG art={art} />
      {win && (
        <g>
          <path d={winPath(win)} fill="#EEF5F7" />
          <ArtG art={{ w, h, bg: null, items: icon(c.look.motif === 'balloon' || c.look.motif === 'mai' ? 'cake' : c.look.motif, win.cx, win.cy + win.h * 0.04, Math.min(win.w, win.h) * 0.62, '#D5E3E8', '#EEF5F7') }} />
        </g>
      )}
    </svg>
  );
}
