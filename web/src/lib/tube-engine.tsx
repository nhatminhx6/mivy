'use client';
// Hộp ống tròn (ống giấy bồi): 1 engine SVG đơn vị mm = KÍCH THƯỚC × KIỂU NẮP × BỐ CỤC × BẢNG MÀU × FONT → nhiều mẫu.
// Thân ống quấn giấy in: dài = chu vi (π·Ø) + 10mm dán chồng, cao = thân + 2×15mm gấp mép vào trong.
// Nắp: giấy quấn nắp (chu vi nắp + 10mm) cao = nắp + 10mm gập lên mặt nắp + 15mm gấp vào trong; mặt nắp = tem tròn.
// Mặt trước (tên SP) ở 1/4 chu vi, mặt sau (thành phần, mã vạch) ở 3/4 chu vi → mối dán nằm ở cạnh bên.
// Ép kim: các chi tiết "kim" vẽ riêng ra khuôn (foil3d = trắng/đen cho 3D, foilPrint = đen/trắng cho xưởng).

import { useId, type CSSProperties, type ReactNode } from 'react';
import { LB_FONTS, LB_FONT_CSS, useLBFonts } from './label-engine';
import { ean13 } from './pouch-engine';

export const TB_FONT_CSS = LB_FONT_CSS;
export const useTBFonts = useLBFonts;
export const TB_FONTS = LB_FONTS;
export const tbFont = (id: string) => TB_FONTS.find((f) => f.id === id) || TB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';

export const TB_BLEED = 3;   // lề xén
export const TB_OVL = 10;    // dán chồng mối
export const TB_TURN = 15;   // gấp mép vào trong ống / nắp
export const TB_TOP = 10;    // phần giấy nắp gập lên mặt nắp
export const TB_WALL = 1.8;  // thành ống giấy bồi
export const KRAFT = '#C8A57B';

// ---------- kích thước ----------
export type TBIndustry = 'tea' | 'coffee' | 'wine' | 'shirt' | 'candle' | 'poster';
export interface TBSize { id: string; name: string; short: string; d: number; h: number; lidH: number }
export const TB_SIZES: TBSize[] = [
  { id: 't75', name: 'Trà / cà phê Ø7,5×12cm', short: 'Ø75×120', d: 75, h: 120, lidH: 40 },
  { id: 't90', name: 'Trà / quà Ø9×15cm', short: 'Ø90×150', d: 90, h: 150, lidH: 45 },
  { id: 'w90', name: 'Rượu vang Ø9×33cm', short: 'Ø90×330', d: 90, h: 330, lidH: 85 },
  { id: 's80', name: 'Áo / khăn Ø8×25cm', short: 'Ø80×250', d: 80, h: 250, lidH: 60 },
  { id: 'c60', name: 'Nến thơm / mỹ phẩm Ø6×8cm', short: 'Ø60×80', d: 60, h: 80, lidH: 28 },
  { id: 'p70', name: 'Ống poster Ø7×45cm', short: 'Ø70×450', d: 70, h: 450, lidH: 55 },
];
export const tbSize = (id: string) => TB_SIZES.find((s) => s.id === id) || TB_SIZES[0];

export type TBStyle = 'lid' | 'neck';
export const TB_STYLES: { id: TBStyle; name: string; note: string }[] = [
  { id: 'lid', name: 'Nắp rời (chụp ngoài)', note: 'Nắp to hơn thân, chụp phủ đầu ống' },
  { id: 'neck', name: 'Nắp liền vai (cổ trong)', note: 'Nắp bằng thân, cổ ống màu riêng bên trong' },
];
export type TBFinish = 'print' | 'kraft';
export const TB_FINISHES: { id: TBFinish; name: string; note: string }[] = [
  { id: 'print', name: 'Giấy bồi in màu', note: 'In offset 4 màu, cán màng' },
  { id: 'kraft', name: 'Giấy kraft', note: 'Không in nền, mực màu đậm' },
];

export const TB_INDUSTRIES: { id: TBIndustry; name: string; size: string }[] = [
  { id: 'tea', name: 'Trà', size: 't75' },
  { id: 'coffee', name: 'Cà phê', size: 't90' },
  { id: 'wine', name: 'Rượu vang', size: 'w90' },
  { id: 'shirt', name: 'Áo · khăn', size: 's80' },
  { id: 'candle', name: 'Nến · mỹ phẩm', size: 'c60' },
  { id: 'poster', name: 'Poster · quà', size: 'p70' },
];

export interface TBGeom { d: number; h: number; lidH: number; lidD: number; bodyH: number; C: number; Cl: number; hidden: number; topD: number }
export function tubeGeom(spec: Pick<TBSpec, 'size' | 'style'>): TBGeom {
  const s = tbSize(spec.size);
  const lid = spec.style === 'lid';
  const lidD = lid ? s.d + TB_WALL * 2 + 0.8 : s.d;
  const bodyH = lid ? s.h - 2 : s.h - s.lidH;
  return {
    d: s.d, h: s.h, lidH: s.lidH, lidD, bodyH,
    C: Math.PI * s.d, Cl: Math.PI * lidD,
    hidden: lid ? s.lidH - 2 : 0, // phần thân nằm dưới nắp chụp
    topD: lidD - 4,
  };
}

// ---------- bảng màu ----------
export interface TBPalette { id: string; name: string; bg: string; fg: string; sub: string; accent: string; onAccent: string; plate: string; foil: string; foilName: string }
export const TB_PALETTES: TBPalette[] = [
  { id: 'crimson', name: 'Đỏ Tết', bg: '#9E1B1B', fg: '#FFF3DC', sub: '#F6D49A', accent: '#E3B04B', onAccent: '#5A0E0E', plate: '#FFF6E6', foil: '#EBC872', foilName: 'vàng' },
  { id: 'navy', name: 'Navy kim', bg: '#142440', fg: '#F4E9CF', sub: '#CDB98A', accent: '#C9A24A', onAccent: '#142440', plate: '#FBF6EA', foil: '#D6B56A', foilName: 'vàng' },
  { id: 'noir', name: 'Đen nhũ', bg: '#1B1816', fg: '#F3EBDD', sub: '#C9AE84', accent: '#C9A15A', onAccent: '#1B1816', plate: '#F7F2EA', foil: '#D3B06A', foilName: 'vàng' },
  { id: 'sage', name: 'Xanh trà', bg: '#DCE8D6', fg: '#20372A', sub: '#4F6C59', accent: '#3F7A4C', onAccent: '#FFFFFF', plate: '#F8FBF5', foil: '#B89A52', foilName: 'vàng' },
  { id: 'jade', name: 'Ngọc bích', bg: '#0F5A4E', fg: '#F2F7EE', sub: '#BFE0CF', accent: '#E6C36A', onAccent: '#0F3A33', plate: '#F5FAF6', foil: '#D9BC6A', foilName: 'vàng' },
  { id: 'blush', name: 'Hồng phấn', bg: '#F4DEDA', fg: '#5A2D2B', sub: '#8E5C56', accent: '#B4685D', onAccent: '#FFFFFF', plate: '#FFF9F7', foil: '#C9937F', foilName: 'hồng' },
  { id: 'cream', name: 'Kem tối giản', bg: '#F6F1E7', fg: '#2A2420', sub: '#6E6052', accent: '#9C7845', onAccent: '#FFFFFF', plate: '#FFFFFF', foil: '#C2A060', foilName: 'vàng' },
  { id: 'sky', name: 'Xanh biển', bg: '#DDEBF3', fg: '#163A55', sub: '#45657D', accent: '#2C74A6', onAccent: '#FFFFFF', plate: '#FFFFFF', foil: '#B7C0CA', foilName: 'bạc' },
  { id: 'citrus', name: 'Cam tươi', bg: '#FFB347', fg: '#3A1F00', sub: '#5E3406', accent: '#B83C17', onAccent: '#FFFFFF', plate: '#FFF8EC', foil: '#C9A24A', foilName: 'vàng' },
  { id: 'plum', name: 'Tím mận', bg: '#3E1F3D', fg: '#F7E8F1', sub: '#D6B3C9', accent: '#D9A6C4', onAccent: '#3E1F3D', plate: '#FBF4F8', foil: '#D8B56E', foilName: 'vàng' },
];
export const tbPalette = (id: string) => TB_PALETTES.find((p) => p.id === id) || TB_PALETTES[0];
const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };
const dark = (hex: string) => lum(hex) < 140;

/** màu thực in theo chất liệu (kraft: nền giấy, mực đậm) */
interface Ink { bg: string; fg: string; sub: string; accent: string; onAccent: string; plate: string | null; lidBg: string; lidFg: string; foil: string }
export function inkOf(spec: TBSpec): Ink {
  const p = tbPalette(spec.palette);
  const solidLid = spec.layout === 'minimal' || spec.layout === 'stripe';
  if (spec.finish === 'kraft') {
    const fg = dark(p.fg) ? p.fg : dark(p.bg) ? p.bg : '#2E1D10';
    const sub = dark(p.sub) ? p.sub : '#4A3220';
    const acc = lum(p.accent) < 150 ? p.accent : dark(p.bg) ? p.bg : '#5A3E22';
    return { bg: KRAFT, fg, sub, accent: acc, onAccent: '#F4E8D4', plate: null, lidBg: solidLid ? acc : KRAFT, lidFg: solidLid ? '#F4E8D4' : acc, foil: p.foil };
  }
  return {
    bg: p.bg, fg: p.fg, sub: p.sub, accent: p.accent, onAccent: p.onAccent, plate: p.plate,
    lidBg: solidLid ? p.accent : p.bg, lidFg: solidLid ? p.onAccent : p.accent, foil: p.foil,
  };
}

// ---------- bố cục + mẫu ----------
export type TBLayout = 'tet' | 'botanical' | 'minimal' | 'vintage' | 'pattern' | 'stripe';
export const TB_LAYOUTS: { id: TBLayout; name: string }[] = [
  { id: 'tet', name: 'Tết · cành mai' },
  { id: 'botanical', name: 'Lá cây' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'vintage', name: 'Cổ điển khung' },
  { id: 'pattern', name: 'Hoạ tiết' },
  { id: 'stripe', name: 'Sọc ngang' },
];

export interface TBSpec { industry: TBIndustry; size: string; style: TBStyle; layout: TBLayout; palette: string; font: string; finish: TBFinish; foil: boolean }
export type TBData = Record<string, string>;
export interface TBTemplate { id: string; name: string; spec: TBSpec; data?: Partial<TBData> }

export const TB_TEMPLATES: TBTemplate[] = [
  { id: 'tea-tet', name: 'Trà sen Tết', spec: { industry: 'tea', size: 't75', style: 'lid', layout: 'tet', palette: 'crimson', font: 'playfair', finish: 'print', foil: true } },
  { id: 'tea-green', name: 'Trà xanh lá', spec: { industry: 'tea', size: 't75', style: 'neck', layout: 'botanical', palette: 'sage', font: 'cormorant', finish: 'print', foil: false }, data: { name: 'Trà Xanh Thái Nguyên', desc: 'Búp non hái tay · Sao suốt thủ công' } },
  { id: 'coffee-kraft', name: 'Cà phê kraft', spec: { industry: 'coffee', size: 't90', style: 'neck', layout: 'vintage', palette: 'noir', font: 'prata', finish: 'kraft', foil: false } },
  { id: 'coffee-noir', name: 'Cà phê đen nhũ', spec: { industry: 'coffee', size: 't90', style: 'lid', layout: 'minimal', palette: 'noir', font: 'montserrat', finish: 'print', foil: true } },
  { id: 'wine-navy', name: 'Vang navy kim', spec: { industry: 'wine', size: 'w90', style: 'lid', layout: 'vintage', palette: 'navy', font: 'playfair', finish: 'print', foil: true } },
  { id: 'wine-tet', name: 'Rượu quà Tết', spec: { industry: 'wine', size: 'w90', style: 'lid', layout: 'tet', palette: 'crimson', font: 'cormorant', finish: 'print', foil: true }, data: { name: 'Vang Đỏ Xuân 2027', greeting: 'Xuân Đinh Mùi' } },
  { id: 'shirt-pattern', name: 'Khăn lụa hoạ tiết', spec: { industry: 'shirt', size: 's80', style: 'lid', layout: 'pattern', palette: 'blush', font: 'cormorant', finish: 'print', foil: false } },
  { id: 'shirt-stripe', name: 'Áo thời trang sọc', spec: { industry: 'shirt', size: 's80', style: 'neck', layout: 'stripe', palette: 'navy', font: 'oswald', finish: 'print', foil: false }, data: { name: 'Áo Thun Cotton Organic', desc: 'Form rộng · 100% cotton hữu cơ', weight: 'Size M' } },
  { id: 'candle-kraft', name: 'Nến thơm kraft', spec: { industry: 'candle', size: 'c60', style: 'neck', layout: 'botanical', palette: 'sage', font: 'prata', finish: 'kraft', foil: false } },
  { id: 'candle-blush', name: 'Nến hồng tối giản', spec: { industry: 'candle', size: 'c60', style: 'lid', layout: 'minimal', palette: 'blush', font: 'playfair', finish: 'print', foil: true } },
  { id: 'poster-stripe', name: 'Ống poster sọc', spec: { industry: 'poster', size: 'p70', style: 'lid', layout: 'stripe', palette: 'citrus', font: 'baloo', finish: 'print', foil: false } },
  { id: 'gift-tet', name: 'Hộp quà Tết hoạ tiết', spec: { industry: 'tea', size: 't90', style: 'neck', layout: 'pattern', palette: 'jade', font: 'playfair', finish: 'print', foil: true }, data: { name: 'Trà Quà Tết An Khang', greeting: 'An khang thịnh vượng' } },
];

export interface TBField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; back?: boolean }
export const TB_FIELDS: TBField[] = [
  { key: 'brand', label: 'Thương hiệu', half: true },
  { key: 'weight', label: 'Khối lượng / quy cách', ph: 'NET 100g', half: true },
  { key: 'name', label: 'Tên sản phẩm' },
  { key: 'desc', label: 'Mô tả ngắn', multiline: true },
  { key: 'greeting', label: 'Lời chúc (mẫu Tết)', ph: 'Xuân an khang' },
  { key: 'ingredients', label: 'Thành phần', multiline: true, back: true },
  { key: 'usage', label: 'Hướng dẫn sử dụng', multiline: true, back: true },
  { key: 'storage', label: 'Bảo quản', back: true },
  { key: 'origin', label: 'Sản xuất / xuất xứ', multiline: true, back: true },
  { key: 'web', label: 'Website / fanpage', half: true, back: true },
  { key: 'hotline', label: 'Hotline', half: true, back: true },
  { key: 'barcode', label: 'Mã vạch (12 số, tự tính số kiểm tra)', ph: '893601234567', back: true },
];

const SAMPLES: Record<TBIndustry, TBData> = {
  tea: {
    brand: 'TRÀ AN KHANG', name: 'Trà Sen Tây Hồ', desc: 'Ướp sen thủ công · Búp chè Thái Nguyên', weight: 'NET 100g', greeting: 'Xuân an khang',
    ingredients: 'Chè xanh Thái Nguyên 95%, hương sen tự nhiên 5%.', usage: 'Tráng ấm, dùng 5g trà với 150ml nước 85°C, hãm 2 phút.',
    storage: 'Nơi khô ráo, thoáng mát, tránh ánh nắng.', origin: 'Sản xuất tại Việt Nam bởi Công ty TNHH An Khang, Thái Nguyên.',
    web: 'ankhangtea.vn', hotline: '0909 123 456', barcode: '893601234567',
  },
  coffee: {
    brand: 'MỘC SƠN COFFEE', name: 'Robusta Rang Mộc', desc: 'Cầu Đất · Rang vừa · Hậu vị socola', weight: 'NET 250g', greeting: 'Chúc mừng năm mới',
    ingredients: '100% hạt Robusta Cầu Đất, rang mộc không tẩm.', usage: 'Xay vừa, pha phin 20g với 60ml nước 92°C.',
    storage: 'Đậy kín nắp sau khi dùng, tránh ẩm.', origin: 'Rang xay tại Đà Lạt bởi Mộc Sơn Coffee.',
    web: 'mocson.coffee', hotline: '0938 222 111', barcode: '893605551234',
  },
  wine: {
    brand: 'VANG QUỐC BẢO', name: 'Vang Đỏ Đà Lạt', desc: 'Cabernet Sauvignon · 13% vol', weight: '750ml', greeting: 'Cung chúc tân xuân',
    ingredients: 'Nho Cabernet Sauvignon, men vang, chất bảo quản SO₂.', usage: 'Dùng ngon nhất ở 16–18°C, mở nắp trước 30 phút.',
    storage: 'Đặt nằm ngang, nơi mát, tránh ánh sáng.', origin: 'Sản xuất tại Lâm Đồng bởi Công ty CP Vang Quốc Bảo. Không dùng cho người dưới 18 tuổi.',
    web: 'vangquocbao.vn', hotline: '0912 345 678', barcode: '893608887771',
  },
  shirt: {
    brand: 'THU HÀ STUDIO', name: 'Khăn Lụa Tơ Tằm', desc: 'Dệt thủ công · Lụa Bảo Lộc', weight: '90×90cm', greeting: 'Gửi trao yêu thương',
    ingredients: '100% lụa tơ tằm tự nhiên, nhuộm màu thực vật.', usage: 'Giặt tay nhẹ bằng nước lạnh, không vắt mạnh.',
    storage: 'Phơi trong bóng râm, ủi nhiệt thấp.', origin: 'Thiết kế và sản xuất tại Việt Nam bởi Thu Hà Studio.',
    web: 'thuhastudio.vn', hotline: '0977 456 789', barcode: '893602224446',
  },
  candle: {
    brand: 'GIA KHÁNH HOME', name: 'Nến Thơm Sả Chanh', desc: 'Sáp đậu nành · Cháy 30 giờ', weight: 'NET 120g', greeting: 'Ấm áp mùa xuân',
    ingredients: 'Sáp đậu nành, tinh dầu sả chanh, bấc cotton.', usage: 'Cắt bấc 5mm, đốt lần đầu 2 giờ cho sáp tan đều.',
    storage: 'Không để gần vật dễ cháy, xa tầm tay trẻ em.', origin: 'Làm thủ công tại TP.HCM bởi Gia Khánh Home.',
    web: 'giakhanhhome.vn', hotline: '0903 678 901', barcode: '893603336665',
  },
  poster: {
    brand: 'AN KHANG ART', name: 'Tranh In Giới Hạn', desc: 'Giấy mỹ thuật · Ký tên tác giả', weight: 'A2 · 42×59cm', greeting: 'Quà tặng ý nghĩa',
    ingredients: 'Giấy mỹ thuật 250gsm, mực pigment bền màu 100 năm.', usage: 'Mở ống nhẹ nhàng, trải phẳng 24 giờ trước khi đóng khung.',
    storage: 'Tránh ẩm, tránh nắng trực tiếp.', origin: 'In và đóng gói tại Hà Nội bởi An Khang Art.',
    web: 'ankhang.art', hotline: '0988 765 432', barcode: '893604445553',
  },
};
export const TB_SAMPLES = SAMPLES;
export const defaultTBData = (ind: TBIndustry = 'tea'): TBData => ({ ...SAMPLES[ind] });
export const templateData = (t: TBTemplate): TBData => ({ ...SAMPLES[t.spec.industry], ...(t.data || {}) } as TBData);

// ---------- đo chữ thật (mm) ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
const ctx = () => {
  if (typeof document === 'undefined') return null;
  mctx ??= document.createElement('canvas').getContext('2d');
  return mctx;
};
function tw(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * size * Math.max(0, [...s].length - 1);
  const c = ctx();
  if (!c) return s.length * size * 0.6 + ls;
  c.font = `${ts.wt} 100px "${ts.fam}"`;
  return (c.measureText(s).width * size) / 100 + ls;
}
const fmCache = new Map<string, { a: number; d: number }>();
/** ascent/descent của font (theo em) — khớp hộp getBBox của SVG → dòng không chồng nhau */
function fm(ts: TS): { a: number; d: number } {
  const k = `${ts.fam}|${ts.wt}`;
  const hit = fmCache.get(k);
  if (hit) return hit;
  const c = ctx();
  let r = { a: 0.98, d: 0.3 };
  if (c) {
    c.font = `${ts.wt} 100px "${ts.fam}"`;
    const m = c.measureText('ÁẬgjÝ');
    // dấu chồng tiếng Việt (Ố, Ẫ…) vượt ascent của font → lấy max với mực thật, để hộp getBBox các dòng không chồng nhau
    const up = c.measureText('ẤỐỂẪỖỮ'), dn = c.measureText('gjpqỵỹ');
    if (m.fontBoundingBoxAscent) r = {
      a: Math.max(m.fontBoundingBoxAscent, up.actualBoundingBoxAscent || 0) / 100 + 0.02,
      d: Math.max(m.fontBoundingBoxDescent, dn.actualBoundingBoxDescent || 0) / 100,
    };
    if (document.fonts?.check?.(`${ts.wt} 20px "${ts.fam}"`)) fmCache.set(k, r);
  }
  return r;
}
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    // dấu "·" dính vào từ trước → xuống dòng ở chỗ ngăn cách, không để "·" đầu dòng
    const words = para.trim().split(/\s+/).filter(Boolean).reduce<string[]>((a, w) => {
      if ((w === '·' || w === '|' || w === '-') && a.length) a[a.length - 1] += ` ${w}`; else a.push(w);
      return a;
    }, []);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || tw(next, size, ts) <= maxW) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out.map((l) => l.replace(/\s[·|-]$/, ''));
}
function fitText(text: string, maxW: number, size: number, ts: TS, maxLines: number, minSize: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  const tooWide = () => lines.some((l) => tw(l, s, ts) > maxW + 0.01);
  while ((lines.length > maxLines || tooWide()) && s > minSize) { s = Math.max(minSize, s * 0.94); lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) {
    // vẫn dài: cắt bớt dòng cuối bằng "…"
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && tw(`${last}…`, s, ts) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  } else if (lines.length > 1 && !text.includes('\n')) {
    // cân dòng: tránh chữ mồ côi
    let lo = maxW * 0.4, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  const widest = Math.max(0, ...lines.map((l) => tw(l, s, ts)));
  if (widest > maxW) {
    const s2 = (s * maxW) / widest;
    if (s2 >= minSize) s = s2;
    else {
      // không co dưới cỡ tối thiểu → cắt "…" dòng quá dài
      s = Math.max(s2, minSize);
      lines = lines.map((l) => {
        if (tw(l, s, ts) <= maxW) return l;
        let t = l;
        while (t.length > 1 && tw(`${t}…`, s, ts) > maxW) t = t.slice(0, -1).trimEnd();
        return `${t}…`;
      });
    }
  }
  return { lines, size: s };
}

// ---------- chế độ vẽ (in màu / khuôn ép kim) ----------
export type TBMode = 'art' | 'foil3d' | 'foilPrint';
interface Ctx { spec: TBSpec; ink: Ink; mode: TBMode; foilOn: boolean }
/** màu 1 chi tiết: kim = true → ép kim (nếu bật). Trả null = không vẽ ở chế độ này */
function col(c: Ctx, color: string, foil = false): string | null {
  const isFoil = foil && c.foilOn;
  if (c.mode === 'foil3d') return isFoil ? '#FFFFFF' : null;
  if (c.mode === 'foilPrint') return isFoil ? '#000000' : null;
  return isFoil ? (c.mode === 'art' ? c.ink.foil : c.ink.foil) : color;
}
const bgOf = (c: Ctx, color: string) => (c.mode === 'foil3d' ? '#000000' : c.mode === 'foilPrint' ? '#FFFFFF' : color);

// ---------- STACK: xếp khối dọc giữa vùng, tự co cho vừa ----------
type SItem =
  | { k: 'text'; text: string; ts: TS; size: number; color: string | null; lines?: number; min?: number; opt?: number; label?: string; labelColor?: string | null }
  | { k: 'gap'; h: number }
  | { k: 'node'; h: number; min?: number; max?: number; opt?: number; render: (cx: number, top: number, h: number) => ReactNode };
type Placed =
  | { k: 'text'; lines: string[]; size: number; ts: TS; color: string | null; h: number; label?: { text: string; size: number; color: string | null } }
  | { k: 'gap'; h: number }
  | { k: 'node'; h: number; render: (cx: number, top: number, h: number) => ReactNode };
const LBL_TS: TS = { fam: BODY, wt: 800, ls: 0.08 };

function measureStack(items: SItem[], W: number, k: number): { list: Placed[]; total: number } {
  const list: Placed[] = [];
  let total = 0;
  for (const it of items) {
    if (it.k === 'gap') { const h = it.h * k; list.push({ k: 'gap', h }); total += h; continue; }
    if (it.k === 'node') { const h = Math.min(it.max ?? Infinity, Math.max(it.min ?? 0, it.h * k)); list.push({ k: 'node', h, render: it.render }); total += h; continue; }
    const min = it.min ?? 1.6;
    const f = fitText(it.text, W, Math.max(min, it.size * k), it.ts, it.lines ?? 2, Math.max(1.5, min * 0.9));
    const m = fm(it.ts);
    let h = f.lines.length * (m.a + m.d) * f.size;
    let label: { text: string; size: number; color: string | null } | undefined;
    if (it.label) {
      const ls = Math.max(1.6, f.size * 0.82);
      const lm = fm(LBL_TS);
      const lfit = fitText(it.label, W, ls, LBL_TS, 1, 1.55);
      label = { text: lfit.lines[0], size: lfit.size, color: it.labelColor ?? it.color };
      h += (lm.a + lm.d) * lfit.size;
    }
    list.push({ k: 'text', lines: f.lines, size: f.size, ts: it.ts, color: it.color, h, label });
    total += h;
  }
  return { list, total };
}
function renderStack(list: Placed[], cx: number, top: number, key: string): ReactNode {
  let y = top;
  return list.map((p, i) => {
    const t = y; y += p.h;
    if (p.k === 'gap') return null;
    if (p.k === 'node') return <g key={`${key}${i}`}>{p.render(cx, t, p.h)}</g>;
    const m = fm(p.ts);
    let yy = t;
    const out: ReactNode[] = [];
    if (p.label) {
      const lm = fm(LBL_TS);
      if (p.label.color) out.push(<text key="l" x={cx} y={yy + lm.a * p.label.size} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={p.label.size} letterSpacing={p.label.size * 0.08} fill={p.label.color}>{p.label.text}</text>);
      yy += (lm.a + lm.d) * p.label.size;
    }
    p.lines.forEach((ln, j) => {
      if (p.color) out.push(
        <text key={j} x={cx} y={yy + m.a * p.size + j * (m.a + m.d) * p.size} textAnchor="middle" fontFamily={`"${p.ts.fam}"`} fontWeight={p.ts.wt}
          fontSize={p.size} letterSpacing={p.ts.ls ? p.ts.ls * p.size : undefined} fill={p.color}>{ln}</text>,
      );
    });
    return <g key={`${key}${i}`}>{out}</g>;
  });
}
function stack(items: SItem[], cx: number, top: number, W: number, H: number, key: string, kMax = 1): ReactNode {
  let list = items.filter((it) => !(it.k === 'text' && !(it.text || '').trim()));
  for (let drop = 0; drop < 10; drop++) {
    // ống cao (vang, poster): thử phóng chữ lớn dần xuống để lấp đầy; ống thấp: co lại
    for (let k = kMax; k >= 0.4; k *= 0.93) {
      const r = measureStack(list, W, k);
      if (r.total <= H) return renderStack(r.list, cx, top + (H - r.total) / 2, key);
    }
    let idx = -1, best = 0;
    list.forEach((it, i) => { const o = it.k === 'gap' ? 0 : it.opt ?? 0; if (o > best) { best = o; idx = i; } });
    if (idx < 0) break;
    list = list.filter((_, i) => i !== idx);
  }
  const r = measureStack(list, W, 0.4);
  return renderStack(r.list, cx, top, key);
}

// ---------- hình vẽ code ----------
export interface TBImage { href: string; w: number; h: number }
const STOP = new Set(['TRÀ', 'CÀ', 'PHÊ', 'COFFEE', 'CÔNG', 'TY', 'TNHH', 'VANG', 'NẾN', 'HOME', 'STUDIO', 'ART', 'SHOP', 'CỬA', 'HÀNG']);
export function monogram(brand: string): string {
  const w = (brand || '').toUpperCase().split(/\s+/).filter(Boolean);
  const sig = w.filter((x) => !STOP.has(x));
  const use = (sig.length ? sig : w).slice(0, 2);
  return use.map((x) => [...x][0]).join('') || 'M';
}
function Monogram({ c, cx, cy, r, text, display, logo }: { c: Ctx; cx: number; cy: number; r: number; text: string; display: TS; logo?: TBImage | null }) {
  const ring = col(c, c.ink.accent, true);
  if (logo && c.mode === 'art') {
    const k = Math.min((r * 1.7) / logo.w, (r * 1.7) / logo.h);
    return <image href={logo.href} x={cx - (logo.w * k) / 2} y={cy - (logo.h * k) / 2} width={logo.w * k} height={logo.h * k} preserveAspectRatio="xMidYMid meet" />;
  }
  if (logo) return ring ? <circle cx={cx} cy={cy} r={r} fill="none" stroke={ring} strokeWidth={r * 0.05} /> : null;
  const fs = text.length > 1 ? r * 0.78 : r * 1.0;
  const m = fm(display);
  return (
    <g>
      {ring && <circle cx={cx} cy={cy} r={r} fill="none" stroke={ring} strokeWidth={Math.max(0.35, r * 0.06)} />}
      {ring && <circle cx={cx} cy={cy} r={r * 0.84} fill="none" stroke={ring} strokeWidth={Math.max(0.2, r * 0.025)} />}
      {ring && <text x={cx} y={cy + ((m.a - m.d) * fs) / 2} textAnchor="middle" fontFamily={`"${display.fam}"`} fontWeight={display.wt} fontSize={fs} fill={ring}>{text}</text>}
    </g>
  );
}
/** cành mai: thân cong + hoa 5 cánh (kim) */
function MaiBranch({ c, x, y, s, flip = false }: { c: Ctx; x: number; y: number; s: number; flip?: boolean }) {
  const stem = col(c, c.ink.sub);
  const flower = col(c, c.ink.accent, true);
  const f = flip ? -1 : 1;
  const pts: [number, number][] = [[0, 0], [8, -6], [15, -9], [22, -16], [28, -18]];
  const d = `M${x} ${y} C ${x + f * 8 * s} ${y - 2 * s}, ${x + f * 14 * s} ${y - 12 * s}, ${x + f * 28 * s} ${y - 18 * s}`;
  const d2 = `M${x + f * 14 * s} ${y - 9 * s} C ${x + f * 16 * s} ${y - 16 * s}, ${x + f * 12 * s} ${y - 22 * s}, ${x + f * 10 * s} ${y - 28 * s}`;
  const fl = (fx: number, fy: number, r: number, k: number) => (
    <g key={k} transform={`translate(${fx} ${fy})`}>
      {[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return <circle key={i} cx={Math.cos(a) * r * 0.62} cy={Math.sin(a) * r * 0.62} r={r * 0.5} fill={flower!} />; })}
      {c.mode === 'art' && <circle r={r * 0.28} fill={c.ink.bg} opacity={0.55} />}
    </g>
  );
  return (
    <g>
      {stem && <path d={d} fill="none" stroke={stem} strokeWidth={0.9 * s} strokeLinecap="round" />}
      {stem && <path d={d2} fill="none" stroke={stem} strokeWidth={0.6 * s} strokeLinecap="round" />}
      {flower && [...pts.slice(1).map(([px, py]) => [x + f * px * s, y + py * s] as [number, number]), [x + f * 10 * s, y - 28 * s] as [number, number], [x + f * 13 * s, y - 20 * s] as [number, number]]
        .map(([px, py], i) => fl(px, py, (i % 2 ? 2.3 : 3) * s, i))}
    </g>
  );
}
function Cloud({ c, x, y, s }: { c: Ctx; x: number; y: number; s: number }) {
  const st = col(c, c.ink.accent, true);
  if (!st) return null;
  return <path d={`M${x} ${y} q ${4 * s} ${-6 * s} ${9 * s} ${-2 * s} q ${3 * s} ${-6 * s} ${9 * s} ${-2 * s} q ${4 * s} ${-3 * s} ${7 * s} ${2 * s} q ${-2 * s} ${3 * s} ${-6 * s} ${2 * s}`} fill="none" stroke={st} strokeWidth={0.55 * s} strokeLinecap="round" />;
}
function LeafSprig({ c, x, y, s, flip = false }: { c: Ctx; x: number; y: number; s: number; flip?: boolean }) {
  const st = col(c, c.ink.accent);
  if (!st) return null;
  const f = flip ? -1 : 1;
  const leaves = [0.25, 0.45, 0.65, 0.85].flatMap((t, i) => {
    const px = x, py = y - t * 34 * s;
    return [-1, 1].map((sd) => {
      const a = (sd * (52 - i * 6) * Math.PI) / 180;
      return <ellipse key={`${i}${sd}`} cx={px + Math.sin(a) * 5 * s * f} cy={py - Math.cos(a) * 2.6 * s} rx={2.1 * s} ry={5 * s}
        transform={`rotate(${(sd * (52 - i * 6) * f)} ${px + Math.sin(a) * 5 * s * f} ${py - Math.cos(a) * 2.6 * s})`} fill="none" stroke={st} strokeWidth={0.45 * s} />;
    });
  });
  return (
    <g>
      <path d={`M${x} ${y} L ${x} ${y - 36 * s}`} stroke={st} strokeWidth={0.5 * s} />
      {leaves}
      <ellipse cx={x} cy={y - 38 * s} rx={2.1 * s} ry={4.6 * s} fill="none" stroke={st} strokeWidth={0.45 * s} />
    </g>
  );
}
function Coin({ c, x, y, r }: { c: Ctx; x: number; y: number; r: number }) {
  const k = col(c, c.ink.accent, true);
  if (!k) return null;
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="none" stroke={k} strokeWidth={r * 0.16} />
      <rect x={x - r * 0.32} y={y - r * 0.32} width={r * 0.64} height={r * 0.64} fill="none" stroke={k} strokeWidth={r * 0.14} />
    </g>
  );
}
function Barcode({ c, cx, top, h, maxW, code }: { c: Ctx; cx: number; top: number; h: number; maxW: number; code: string }) {
  if (c.mode !== 'art') return null;
  const { digits, bits } = ean13(code);
  const m = Math.min(0.33, maxW / 113);
  const W = m * 113, x0 = cx - W / 2;
  const fs = Math.min(m * 8.5, h * 0.2);
  const hb = h - fs * 1.25;
  const guard = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  const bars: ReactNode[] = [];
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') bars.push(<rect key={i} x={x0 + m * 9 + i * m} y={top} width={m} height={guard.has(i) ? hb + fs * 0.35 : hb} fill="#111111" />);
  return (
    <g>
      <rect x={x0} y={top - m * 2} width={W} height={h + m * 3} fill="#FFFFFF" rx={0.6} />
      {bars}
      <text x={cx} y={top + hb + fs * 1.02} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} letterSpacing={fs * 0.12} fill="#111111">{digits}</text>
    </g>
  );
}

// ---------- vẽ các phần ----------
export interface TBRender { spec: TBSpec; data: TBData; logo?: TBImage | null; bare?: boolean }
const ctxOf = (spec: TBSpec, mode: TBMode): Ctx => ({ spec, ink: inkOf(spec), mode, foilOn: spec.foil });
export const FRONT_U = 0.25, BACK_U = 0.75;

/** vùng chữ an toàn trên thân (mm, toạ độ art thân) — dùng chung cho QC */
export function bodyZones(spec: TBSpec) {
  const g = tubeGeom(spec);
  const W = g.C * 0.27;
  const stripeH = spec.layout === 'stripe' ? Math.max(9, (g.bodyH - g.hidden) * 0.12) : 0;
  const top = g.hidden + Math.max(5, g.d * 0.06) + (spec.layout === 'stripe' && spec.style === 'neck' ? stripeH * 0.55 : 0);
  const bottom = g.bodyH - Math.max(5, g.d * 0.06) - stripeH;
  return { W, top, bottom, front: g.C * FRONT_U, back: g.C * BACK_U, stripeH };
}

export function BodyArt({ spec, data, logo, bare, mode = 'art' }: TBRender & { mode?: TBMode }) {
  const c = ctxOf(spec, mode);
  const g = tubeGeom(spec);
  const z = bodyZones(spec);
  const f = tbFont(spec.font);
  const display: TS = { fam: f.family, wt: f.weight };
  const k = g.d / 75; // tỉ lệ chữ theo cỡ ống
  const H = z.bottom - z.top;
  const kMax = Math.max(1, Math.min(2.1, (H / z.W) * 0.95)); // vùng cao/hẹp → cho chữ to ra
  const plate = spec.layout === 'pattern' && c.ink.plate;
  const onPlate = plate && spec.finish === 'print';
  const pal = tbPalette(spec.palette);
  const fg = onPlate ? (dark(pal.fg) ? pal.fg : pal.bg) : c.ink.fg;
  const sub = onPlate ? (dark(pal.sub) ? pal.sub : dark(pal.bg) ? pal.bg : '#444444') : c.ink.sub;
  const acc = onPlate ? (lum(pal.accent) < 170 ? pal.accent : dark(pal.bg) ? pal.bg : '#7A5A2A') : c.ink.accent;
  const isTet = spec.layout === 'tet';

  // ---- mặt trước ----
  const monoR = Math.min(z.W * 0.2, H * 0.11, 13 * k);
  const front: SItem[] = [];
  if (isTet) front.push({ k: 'text', text: data.greeting || '', ts: { fam: SCRIPT, wt: 700 }, size: 7.2 * k, color: col(c, acc, true), lines: 1, min: 2.6, opt: 3 }, { k: 'gap', h: 2.5 * k });
  if (spec.layout !== 'minimal' && spec.layout !== 'stripe') {
    front.push({ k: 'node', h: monoR * 2, min: 7, max: z.W * 0.46, opt: 4, render: (cx, t, h) => <Monogram c={c} cx={cx} cy={t + h / 2} r={h / 2} text={monogram(data.brand)} display={display} logo={logo} /> }, { k: 'gap', h: 3 * k });
  }
  front.push(
    { k: 'text', text: (data.brand || '').toUpperCase(), ts: { fam: BODY, wt: 800, ls: 0.16 }, size: 3.6 * k, color: col(c, acc, true), lines: 2, min: 1.8 },
    { k: 'gap', h: 2.6 * k },
    { k: 'text', text: data.name || '', ts: display, size: 11 * k, color: col(c, fg), lines: (data.name || '').trim().split(/\s+/).length <= 4 ? 2 : 3, min: 3.2 },
    { k: 'gap', h: 2.4 * k },
    { k: 'node', h: 1.4 * k, opt: 1, render: (cx, t, h) => { const s = col(c, acc, true); return s ? <g><line x1={cx - z.W * 0.16} y1={t + h / 2} x2={cx + z.W * 0.16} y2={t + h / 2} stroke={s} strokeWidth={0.4} />{isTet && <circle cx={cx} cy={t + h / 2} r={h * 0.55} fill={s} />}</g> : null; } },
    { k: 'gap', h: 2.4 * k },
    { k: 'text', text: data.desc || '', ts: { fam: BODY, wt: 600 }, size: 3.4 * k, color: col(c, sub), lines: 3, min: 1.8, opt: 2 },
    { k: 'gap', h: 3.6 * k },
  );
  if (data.weight) {
    const ws = 3.3 * k;
    front.push({
      k: 'node', h: ws * 2.1, min: 4.6, max: 11, opt: 5, render: (cx, t, h) => {
        const s = h / 2.1, w = tw(data.weight, s, { fam: BODY, wt: 800, ls: 0.1 }) + s * 2.4;
        const st = col(c, acc, true), tc = col(c, fg);
        return (
          <g>
            {st && <rect x={cx - w / 2} y={t} width={w} height={h} rx={h / 2} fill="none" stroke={st} strokeWidth={0.4} />}
            {tc && <text x={cx} y={t + h / 2 + s * 0.36} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={s} letterSpacing={s * 0.1} fill={tc}>{data.weight}</text>}
          </g>
        );
      },
    });
  }

  // ---- mặt sau ----
  const bs = 2.55 * k;
  const back: SItem[] = [
    { k: 'text', text: (data.brand || '').toUpperCase(), ts: { fam: BODY, wt: 800, ls: 0.14 }, size: 3 * k, color: col(c, acc, true), lines: 1, min: 1.7, opt: 3 },
    { k: 'gap', h: 2.2 * k },
    { k: 'text', label: 'THÀNH PHẦN', text: data.ingredients || '', ts: { fam: BODY, wt: 600 }, size: bs, color: col(c, fg), labelColor: col(c, acc), lines: 4, min: 1.7 },
    { k: 'gap', h: 1.8 * k },
    { k: 'text', label: 'HƯỚNG DẪN', text: data.usage || '', ts: { fam: BODY, wt: 600 }, size: bs, color: col(c, fg), labelColor: col(c, acc), lines: 4, min: 1.7, opt: 6 },
    { k: 'gap', h: 1.8 * k },
    { k: 'text', label: 'BẢO QUẢN', text: data.storage || '', ts: { fam: BODY, wt: 600 }, size: bs, color: col(c, fg), labelColor: col(c, acc), lines: 3, min: 1.7, opt: 7 },
    { k: 'gap', h: 1.8 * k },
    { k: 'text', text: data.origin || '', ts: { fam: BODY, wt: 600 }, size: bs * 0.9, color: col(c, sub), lines: 4, min: 1.6, opt: 4 },
    { k: 'gap', h: 2.6 * k },
  ];
  if (data.barcode) back.push({ k: 'node', h: Math.min(20, z.W * 0.4), min: 13, max: Math.min(26, z.W * 0.42), opt: 2, render: (cx, t, h) => <Barcode c={c} cx={cx} top={t} h={h} maxW={z.W * 0.74} code={data.barcode} /> }, { k: 'gap', h: 2.2 * k });
  const contact = [data.web, data.hotline].filter(Boolean).join('  ·  ');
  back.push({ k: 'text', text: contact, ts: { fam: BODY, wt: 800 }, size: 2.7 * k, color: col(c, fg), lines: 2, min: 1.7, opt: 5 });

  // ---- trang trí ----
  const deco: ReactNode[] = [];
  const sideXs = [g.C * 0.5, 0, g.C];
  const midY = (z.top + z.bottom) / 2;
  if (isTet) {
    const s = Math.min(1.6 * k, (H / 34) * 0.9);
    sideXs.forEach((x, i) => {
      deco.push(<MaiBranch key={`m${i}`} c={c} x={x - 12 * s} y={z.bottom - 4} s={s} />);
      deco.push(<Cloud key={`c${i}`} c={c} x={x - 14 * s} y={z.top + 12 * s} s={s * 0.8} />);
      deco.push(<Coin key={`o${i}`} c={c} x={x + 8 * s} y={midY - 6 * s} r={3.2 * s} />);
    });
  } else if (spec.layout === 'botanical') {
    const s = Math.min(1.3 * k, H / 52);
    sideXs.forEach((x, i) => {
      deco.push(<LeafSprig key={`l${i}`} c={c} x={x - 5 * s} y={z.bottom - 2} s={s} />);
      deco.push(<LeafSprig key={`k${i}`} c={c} x={x + 7 * s} y={z.bottom - 10 * s} s={s * 0.7} flip />);
    });
  } else if (spec.layout === 'vintage') {
    const st = col(c, acc, true);
    if (st) {
      for (const cx of [z.front, z.back]) {
        const fw = z.W + 8 * k, fh = H + 2;
        deco.push(<rect key={`f${cx}`} x={cx - fw / 2} y={z.top - 1} width={fw} height={fh} rx={fw / 2 > 30 ? 6 : 3} fill="none" stroke={st} strokeWidth={0.55} />);
        deco.push(<rect key={`g${cx}`} x={cx - fw / 2 + 1.6} y={z.top + 0.6} width={fw - 3.2} height={fh - 3.2} rx={3} fill="none" stroke={st} strokeWidth={0.25} />);
      }
      sideXs.forEach((x, i) => {
        deco.push(<line key={`v${i}`} x1={x} y1={z.top + 6} x2={x} y2={z.bottom - 6} stroke={st} strokeWidth={0.35} />);
        for (let y = z.top + 14; y < z.bottom - 10; y += Math.max(18, H / 6)) deco.push(<rect key={`d${i}${y}`} x={x - 1.6} y={y - 1.6} width={3.2} height={3.2} transform={`rotate(45 ${x} ${y})`} fill={st} />);
      });
    }
  } else if (spec.layout === 'pattern') {
    const st = col(c, c.ink.accent, true);
    if (st) {
      const step = 9 * k;
      for (let y = g.hidden + step / 2, r = 0; y < g.bodyH; y += step, r++) {
        for (let x = (r % 2) * step / 2; x <= g.C; x += step) {
          deco.push(<path key={`p${r}-${x.toFixed(1)}`} d={`M${x} ${y - 1.4 * k} L ${x + 1.4 * k} ${y} L ${x} ${y + 1.4 * k} L ${x - 1.4 * k} ${y} Z`} fill={st} opacity={c.mode === 'art' ? 0.55 : 1} />);
        }
      }
    }
  } else if (spec.layout === 'minimal') {
    const st = col(c, acc, true);
    if (st) for (const cx of [z.front, z.back]) {
      deco.push(<line key={`t${cx}`} x1={cx - z.W * 0.3} y1={z.top - 1.5} x2={cx + z.W * 0.3} y2={z.top - 1.5} stroke={st} strokeWidth={0.35} />);
      deco.push(<line key={`b${cx}`} x1={cx - z.W * 0.3} y1={z.bottom + 1.5} x2={cx + z.W * 0.3} y2={z.bottom + 1.5} stroke={st} strokeWidth={0.35} />);
    }
  }
  if (spec.layout === 'stripe') {
    const a = col(c, c.ink.accent), b2 = col(c, c.ink.sub, true);
    const y0 = g.bodyH - z.stripeH;
    if (a) deco.push(<rect key="s1" x={0} y={y0 + z.stripeH * 0.25} width={g.C} height={z.stripeH * 0.45} fill={a} />);
    if (b2) deco.push(<rect key="s2" x={0} y={y0 + z.stripeH * 0.8} width={g.C} height={z.stripeH * 0.12} fill={b2} />);
    if (spec.style === 'neck') {
      if (a) deco.push(<rect key="s3" x={0} y={z.stripeH * 0.08} width={g.C} height={z.stripeH * 0.22} fill={a} />);
    }
  }

  const plates: ReactNode[] = [];
  if (onPlate) {
    // ô nền sáng che hoạ tiết (cả ở khuôn ép kim: hoạ tiết dưới ô không được ép)
    const fill = c.mode === 'art' ? c.ink.plate! : bgOf(c, '');
    for (const cx of [z.front, z.back]) plates.push(<rect key={`pl${cx}`} x={cx - z.W / 2 - 4} y={z.top - 3} width={z.W + 8} height={H + 6} rx={4} fill={fill} />);
  }

  return (
    <g>
      {!bare && <rect x={0} y={0} width={g.C} height={g.bodyH} fill={bgOf(c, c.ink.bg)} />}
      {deco}
      {plates}
      <g data-zone="front" data-x0={z.front - z.W / 2} data-x1={z.front + z.W / 2} data-y0={z.top} data-y1={z.bottom}>{stack(front, z.front, z.top, z.W, H, 'f', kMax)}</g>
      <g data-zone="back" data-x0={z.back - z.W / 2} data-x1={z.back + z.W / 2} data-y0={z.top} data-y1={z.bottom}>{stack(back, z.back, z.top, z.W, H, 'b', Math.min(1.5, kMax))}</g>
    </g>
  );
}

export function LidArt({ spec, data, bare, mode = 'art' }: TBRender & { mode?: TBMode }) {
  const c = ctxOf(spec, mode);
  const g = tubeGeom(spec);
  const W = g.Cl, H = g.lidH;
  const k = g.d / 75;
  const brandTs: TS = { fam: BODY, wt: 800, ls: 0.2 };
  const fgFoil = spec.layout !== 'minimal' && spec.layout !== 'stripe';
  const tcol = col(c, c.ink.lidFg, fgFoil);
  const fit = fitText((data.brand || '').toUpperCase(), W * 0.24, Math.min(H * 0.24, 4.2 * k), brandTs, 1, 1.8);
  const m = fm(brandTs);
  const deco: ReactNode[] = [];
  const avoid = (x: number) => [W * FRONT_U, W * BACK_U].some((cx) => Math.abs(x - cx) < W * 0.15);
  if (spec.layout === 'tet') {
    const r = Math.min(H * 0.16, 3.6 * k);
    for (let x = r * 2; x < W; x += r * 3.2) if (!avoid(x)) deco.push(<Coin key={x} c={c} x={x} y={H / 2} r={r} />);
  } else if (spec.layout === 'vintage') {
    const st = col(c, c.ink.accent, true);
    if (st) { deco.push(<line key="a" x1={0} y1={H * 0.14} x2={W} y2={H * 0.14} stroke={st} strokeWidth={0.5} />, <line key="b" x1={0} y1={H * 0.86} x2={W} y2={H * 0.86} stroke={st} strokeWidth={0.5} />); }
  } else if (spec.layout === 'pattern' || spec.layout === 'botanical') {
    const st = col(c, c.ink.accent, true);
    if (st) for (let x = 6; x < W; x += 8 * k) if (!avoid(x)) deco.push(<path key={x} d={`M${x} ${H / 2 - 1.6 * k} L ${x + 1.6 * k} ${H / 2} L ${x} ${H / 2 + 1.6 * k} L ${x - 1.6 * k} ${H / 2} Z`} fill={st} opacity={c.mode === 'art' ? 0.7 : 1} />);
  } else if (spec.layout === 'stripe') {
    const st = col(c, c.ink.bg);
    if (st) deco.push(<rect key="s" x={0} y={H * 0.78} width={W} height={H * 0.08} fill={st} />);
  }
  return (
    <g>
      {!(bare && c.ink.lidBg === KRAFT) && <rect x={0} y={0} width={W} height={H} fill={bgOf(c, c.ink.lidBg)} />}
      {deco}
      <g data-zone="lid" data-x0={0} data-x1={W} data-y0={0} data-y1={H}>
        {tcol && [W * FRONT_U, W * BACK_U].map((cx) => (
          <text key={cx} x={cx} y={H / 2 + ((m.a - m.d) * fit.size) / 2} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fit.size} letterSpacing={fit.size * 0.2} fill={tcol}>{fit.lines[0]}</text>
        ))}
      </g>
    </g>
  );
}

export function TopArt({ spec, data, logo, bare, mode = 'art' }: TBRender & { mode?: TBMode }) {
  const c = ctxOf(spec, mode);
  const g = tubeGeom(spec);
  const D = g.topD, R = D / 2;
  const f = tbFont(spec.font);
  const display: TS = { fam: f.family, wt: f.weight };
  const ring = col(c, c.ink.lidFg, true);
  const brandTs: TS = { fam: BODY, wt: 800, ls: 0.14 };
  const fit = fitText((data.brand || '').toUpperCase(), D * 0.56, D * 0.07, brandTs, 2, 1.6);
  const m = fm(brandTs);
  const lh = (m.a + m.d) * fit.size;
  const monoR = D * 0.17;
  const blockH = monoR * 2 + 2 + fit.lines.length * lh;
  const y0 = R - blockH / 2;
  return (
    <g>
      {!(bare && c.ink.lidBg === KRAFT) && <circle cx={R} cy={R} r={R} fill={bgOf(c, c.ink.lidBg)} />}
      {ring && <circle cx={R} cy={R} r={R - 2.6} fill="none" stroke={ring} strokeWidth={0.45} />}
      {ring && <circle cx={R} cy={R} r={R - 3.6} fill="none" stroke={ring} strokeWidth={0.2} />}
      <g data-zone="top" data-cx={R} data-cy={R} data-r={R - 2.6}>
        <Monogram c={{ ...c, ink: { ...c.ink, accent: c.ink.lidFg } }} cx={R} cy={y0 + monoR} r={monoR} text={monogram(data.brand)} display={display} logo={logo} />
        {ring && fit.lines.map((ln, i) => (
          <text key={i} x={R} y={y0 + monoR * 2 + 2 + m.a * fit.size + i * lh} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fit.size} letterSpacing={fit.size * 0.14} fill={ring}>{ln}</text>
        ))}
      </g>
    </g>
  );
}

// ---------- SVG cho texture 3D (đúng khổ, không lề) ----------
export type TBPart = 'body' | 'lid' | 'top';
export function TubePartSvg({ part, mode = 'art', style, ...o }: TBRender & { part: TBPart; mode?: TBMode; style?: CSSProperties }) {
  const g = tubeGeom(o.spec);
  const [w, h] = part === 'body' ? [g.C, g.bodyH] : part === 'lid' ? [g.Cl, g.lidH] : [g.topD, g.topD];
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} style={style} data-part={part}>
      {part === 'body' ? <BodyArt {...o} mode={mode} /> : part === 'lid' ? <LidArt {...o} mode={mode} /> : <TopArt {...o} mode={mode} />}
    </svg>
  );
}

// ---------- mockup phẳng (mặt trước / mặt sau nhìn thẳng) ----------
export function TubeMockSvg({ side = 'front', style, ...o }: TBRender & { side?: 'front' | 'back'; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const g = tubeGeom(o.spec);
  const lid = o.spec.style === 'lid';
  const PAD = 6;
  const W = g.lidD + PAD * 2, H = g.h + PAD * 2;
  const bx = (W - g.d) / 2, lx = (W - g.lidD) / 2;
  const u = side === 'front' ? FRONT_U : BACK_U;
  const bodyTop = PAD + (lid ? g.h - g.bodyH : g.lidH);
  const visTop = PAD + g.lidH; // mép dưới nắp
  const ink = inkOf(o.spec);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} style={style}>
      <defs>
        <linearGradient id={`sh${uid}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={0.32} /><stop offset="0.18" stopColor="#000" stopOpacity={0.06} />
          <stop offset="0.42" stopColor="#FFF" stopOpacity={0.14} /><stop offset="0.6" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.36} />
        </linearGradient>
        <clipPath id={`cb${uid}`}><rect x={bx} y={visTop} width={g.d} height={PAD + g.h - visTop} rx={1.2} /></clipPath>
        <clipPath id={`cl${uid}`}><rect x={lx} y={PAD} width={g.lidD} height={g.lidH} rx={1.6} /></clipPath>
      </defs>
      <ellipse cx={W / 2} cy={PAD + g.h + 1.2} rx={g.lidD * 0.55} ry={2.2} fill="#000" opacity={0.18} />
      <g clipPath={`url(#cb${uid})`}>
        <g transform={`translate(${bx + g.d / 2 - g.C * u} ${bodyTop})`}><BodyArt {...o} /></g>
        <rect x={bx} y={visTop} width={g.d} height={PAD + g.h - visTop} fill={`url(#sh${uid})`} />
      </g>
      <g clipPath={`url(#cl${uid})`}>
        <g transform={`translate(${lx + g.lidD / 2 - g.Cl * u} ${PAD})`}><LidArt {...o} /></g>
        <rect x={lx} y={PAD} width={g.lidD} height={g.lidH} fill={`url(#sh${uid})`} />
      </g>
      {!lid && <line x1={bx} y1={visTop} x2={bx + g.d} y2={visTop} stroke="#000" strokeOpacity={0.35} strokeWidth={0.5} />}
      {lid && <rect x={lx} y={PAD + g.lidH - 0.8} width={g.lidD} height={0.8} fill="#000" opacity={0.18} />}
      <rect x={lx} y={PAD - 0.4} width={g.lidD} height={1} rx={0.5} fill={ink.lidBg} opacity={0.9} />
    </svg>
  );
}

// ---------- FILE IN: tờ trải phẳng 3 chi tiết ----------
export function sheetLayout(spec: TBSpec) {
  const g = tubeGeom(spec);
  const M = 14, GAP = 16, LBL = 9, HEAD = 22;
  const body = { w: g.C + TB_OVL, h: g.bodyH + TB_TURN * 2 };
  const lid = { w: g.Cl + TB_OVL, h: g.lidH + TB_TOP + TB_TURN };
  const top = { w: g.topD, h: g.topD };
  const W = M * 2 + 18 + Math.max(body.w, lid.w + GAP + top.w + TB_BLEED * 2) + TB_BLEED * 2;
  const by = HEAD + LBL;
  const ly = by + body.h + TB_BLEED * 2 + GAP + LBL;
  const H = ly + Math.max(lid.h, top.h) + TB_BLEED * 2 + M + 8;
  return {
    W, H, M, LBL,
    body: { ...body, x: M + TB_BLEED, y: by + TB_BLEED },
    lid: { ...lid, x: M + TB_BLEED, y: ly + TB_BLEED },
    top: { ...top, x: M + TB_BLEED + lid.w + GAP + TB_BLEED * 2, y: ly + TB_BLEED },
  };
}

export function TubeSheetSvg({ mask = false, style, ...o }: TBRender & { mask?: boolean; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const spec = o.spec;
  const g = tubeGeom(spec);
  const L = sheetLayout(spec);
  const mode: TBMode = mask ? 'foilPrint' : 'art';
  const ink = inkOf(spec);
  const kraft = spec.finish === 'kraft';
  const B = TB_BLEED;
  const CUT = '#EC008C', FOLD = '#00A0E0', NOTE = '#6B7280';
  const noteTs = { fontFamily: `"${BODY}"`, fontWeight: 600, fill: NOTE } as const;
  const bgFill = mask ? '#FFFFFF' : kraft ? 'none' : null;
  const { body, lid, top } = L;
  const bodyBg = bgFill ?? ink.bg, lidBg = mask ? '#FFFFFF' : kraft && ink.lidBg === KRAFT ? 'none' : ink.lidBg;
  const art = { ...o, bare: kraft && !mask };
  const pal = tbPalette(spec.palette);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${L.W} ${L.H}`} width={`${L.W}mm`} height={`${L.H}mm`} style={style}>
      <defs>
        <clipPath id={`b${uid}`}><rect x={body.x - B} y={body.y - B} width={body.w + B * 2} height={body.h + B * 2} /></clipPath>
        <clipPath id={`l${uid}`}><rect x={lid.x - B} y={lid.y - B} width={lid.w + B * 2} height={lid.h + B * 2} /></clipPath>
        <clipPath id={`t${uid}`}><circle cx={top.x + top.w / 2} cy={top.y + top.h / 2} r={top.w / 2 + B} /></clipPath>
      </defs>
      <rect x={0} y={0} width={L.W} height={L.H} fill="#FFFFFF" />
      <g {...noteTs} fontSize={4.2}>
        <text x={L.M} y={9}>{mask ? 'KHUÔN ÉP KIM' : 'FILE IN'} · Hộp ống tròn Ø{g.d}×{g.h}mm · {spec.style === 'lid' ? 'nắp rời' : 'nắp liền vai'} · {kraft ? 'giấy kraft (không in nền)' : 'giấy bồi in màu'}{spec.foil ? ` · ép kim ${pal.foilName}` : ''}</text>
      </g>
      <g {...noteTs} fontSize={3}>
        <text x={L.M} y={15.5}>Lề xén {B}mm · dán chồng {TB_OVL}mm · gấp mép trong {TB_TURN}mm · đường cắt: hồng liền · đường gấp: xanh đứt{mask ? ' · vùng đen = ép kim' : ''}</text>
      </g>

      {/* THÂN */}
      <text {...noteTs} fontSize={3.2} x={body.x} y={body.y - B - 2.5}>1 · Giấy quấn thân · {body.w.toFixed(1)} × {body.h.toFixed(1)} mm (chu vi {g.C.toFixed(1)} + {TB_OVL} dán chồng)</text>
      <g id="In" clipPath={`url(#b${uid})`}>
        {bodyBg !== 'none' && <rect x={body.x - B} y={body.y - B} width={body.w + B * 2} height={body.h + B * 2} fill={bodyBg} />}
        {[-1, 0, 1].map((n) => (
          <g key={n} transform={`translate(${body.x + n * g.C} ${body.y + TB_TURN})`}><BodyArt {...art} mode={mode} /></g>
        ))}
      </g>
      {/* NẮP */}
      <text {...noteTs} fontSize={3.2} x={lid.x} y={lid.y - B - 2.5}>2 · Giấy quấn nắp · {lid.w.toFixed(1)} × {lid.h.toFixed(1)} mm (Ø nắp {g.lidD.toFixed(1)})</text>
      <g clipPath={`url(#l${uid})`}>
        {lidBg !== 'none' && <rect x={lid.x - B} y={lid.y - B} width={lid.w + B * 2} height={lid.h + B * 2} fill={lidBg} />}
        {[-1, 0, 1].map((n) => (
          <g key={n} transform={`translate(${lid.x + n * g.Cl} ${lid.y + TB_TOP})`}><LidArt {...art} mode={mode} /></g>
        ))}
      </g>
      {/* MẶT NẮP */}
      <text {...noteTs} fontSize={3.2} x={top.x} y={top.y - B - 2.5}>3 · Tem mặt nắp Ø{top.w.toFixed(1)} mm</text>
      <g clipPath={`url(#t${uid})`}>
        {lidBg !== 'none' && <circle cx={top.x + top.w / 2} cy={top.y + top.h / 2} r={top.w / 2 + B} fill={lidBg} />}
        <g transform={`translate(${top.x} ${top.y})`}><TopArt {...art} mode={mode} /></g>
      </g>

      <g id="CutContour" fill="none" stroke={CUT} strokeWidth={0.3}>
        <rect x={body.x} y={body.y} width={body.w} height={body.h} />
        <rect x={lid.x} y={lid.y} width={lid.w} height={lid.h} />
        <circle cx={top.x + top.w / 2} cy={top.y + top.h / 2} r={top.w / 2} />
      </g>
      <g id="Fold" fill="none" stroke={FOLD} strokeWidth={0.3} strokeDasharray="2 1.4">
        <line x1={body.x} y1={body.y + TB_TURN} x2={body.x + body.w} y2={body.y + TB_TURN} />
        <line x1={body.x} y1={body.y + TB_TURN + g.bodyH} x2={body.x + body.w} y2={body.y + TB_TURN + g.bodyH} />
        <line x1={body.x + g.C} y1={body.y} x2={body.x + g.C} y2={body.y + body.h} />
        {g.hidden > 0 && <line x1={body.x} y1={body.y + TB_TURN + g.hidden} x2={body.x + body.w} y2={body.y + TB_TURN + g.hidden} strokeDasharray="0.8 1.2" />}
        <line x1={lid.x} y1={lid.y + TB_TOP} x2={lid.x + lid.w} y2={lid.y + TB_TOP} />
        <line x1={lid.x} y1={lid.y + TB_TOP + g.lidH} x2={lid.x + lid.w} y2={lid.y + TB_TOP + g.lidH} />
        <line x1={lid.x + g.Cl} y1={lid.y} x2={lid.x + g.Cl} y2={lid.y + lid.h} />
      </g>
      <g {...noteTs} fontSize={2.6}>
        <text x={body.x + body.w + 1} y={body.y + TB_TURN / 2 + 1}>gấp</text>
        <text x={body.x + g.C + 1.2} y={body.y + body.h / 2}>dán</text>
        {g.hidden > 0 && <text x={body.x + body.w + 1} y={body.y + TB_TURN + g.hidden / 2}>dưới nắp</text>}
        <text x={lid.x + lid.w + 1} y={lid.y + TB_TOP / 2 + 1}>mặt nắp</text>
      </g>
    </svg>
  );
}
