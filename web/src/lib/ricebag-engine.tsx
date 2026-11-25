'use client';
// Bao gạo · bao bì nông sản: 3 loại bao — bao PP dệt (in flexo 1–3 màu, nền bao không in, may miệng),
// túi gạo hút chân không PA/PE (in đủ màu, lỗ xách, cửa sổ trong), túi giấy kraft nhiều lớp (in 1–2 màu).
// Mặt trước: thương hiệu, tên sản phẩm, khối lượng tịnh thật to, vùng trồng, minh hoạ vẽ code (bông lúa, cánh đồng,
// nón lá, cò trắng, hạt). Mặt sau: thông tin bắt buộc + ô NSX/HSD/lô + mã vạch EAN-13 + QR truy xuất.
// Đơn vị mm. Render code 100% — không AI theo request.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { ean13 } from './pouch-engine';
import { qrPath } from './flyer-qr';

// ---------- loại bao + khổ ----------
export type RBKind = 'pp' | 'vacuum' | 'kraft';
export const RB_KINDS: { id: RBKind; name: string; note: string }[] = [
  { id: 'pp', name: 'Bao PP dệt', note: 'In flexo 1–3 màu · may miệng' },
  { id: 'vacuum', name: 'Túi hút chân không', note: 'PA/PE in đủ màu · lỗ xách' },
  { id: 'kraft', name: 'Túi giấy kraft', note: 'Nhiều lớp · in 1–2 màu' },
];
export interface RBSize { id: string; kind: RBKind; name: string; W: number; H: number; G: number; net: string; top: number; bottom: number }
export const RB_SIZES: RBSize[] = [
  { id: 'p5', kind: 'pp', name: '5kg · 35×55cm', W: 350, H: 550, G: 0, net: '5 KG', top: 40, bottom: 25 },
  { id: 'p10', kind: 'pp', name: '10kg · 40×65cm', W: 400, H: 650, G: 0, net: '10 KG', top: 40, bottom: 25 },
  { id: 'p25', kind: 'pp', name: '25kg · 55×90cm', W: 550, H: 900, G: 0, net: '25 KG', top: 45, bottom: 30 },
  { id: 'v1', kind: 'vacuum', name: '1kg · 11×19cm', W: 110, H: 190, G: 55, net: '1 KG', top: 26, bottom: 12 },
  { id: 'v2', kind: 'vacuum', name: '2kg · 14×23cm', W: 140, H: 230, G: 65, net: '2 KG', top: 30, bottom: 12 },
  { id: 'v5', kind: 'vacuum', name: '5kg · 20×32cm', W: 200, H: 320, G: 90, net: '5 KG', top: 34, bottom: 14 },
  { id: 'k5', kind: 'kraft', name: '5kg · 30×48cm', W: 300, H: 480, G: 100, net: '5 KG', top: 50, bottom: 40 },
  { id: 'k10', kind: 'kraft', name: '10kg · 35×60cm', W: 350, H: 600, G: 120, net: '10 KG', top: 55, bottom: 45 },
];
export const rbSize = (id: string) => RB_SIZES.find((s) => s.id === id) || RB_SIZES[0];
export const sizesOf = (k: RBKind) => RB_SIZES.filter((s) => s.kind === k);
export const RB_BLEED = 3;
export const PP_WHITE = '#F3F1EA';
export const KRAFT = '#C49A6C';
export const substrateOf = (k: RBKind) => (k === 'kraft' ? KRAFT : PP_WHITE);
export const isFlexo = (k: RBKind) => k !== 'vacuum';
export const maxInks = (k: RBKind) => (k === 'kraft' ? 2 : 3);

// ---------- sản phẩm ----------
export type RBProduct = 'rice' | 'coffee' | 'cashew' | 'bean' | 'flour';
export const RB_PRODUCTS: { id: RBProduct; name: string }[] = [
  { id: 'rice', name: 'Gạo' }, { id: 'coffee', name: 'Cà phê nhân' }, { id: 'cashew', name: 'Hạt điều' },
  { id: 'bean', name: 'Đậu · đỗ' }, { id: 'flour', name: 'Bột mì · bột' },
];

// ---------- font (chỉ font có TTF → outline được) ----------
export interface RBFont { id: string; name: string; family: string; weight: number }
export const RB_FONTS: RBFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
];
export const rbFont = (id: string) => RB_FONTS.find((f) => f.id === id) || RB_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const RB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Oswald:wght@700&family=Lobster&display=swap');`;

export function useRBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-rb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-rb-fonts'; link.rel = 'stylesheet';
        link.href = RB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...RB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
// ink = chữ chính (đậm), accent = điểm nhấn, fill = mảng lớn (cánh đồng, dải đầu), bg = nền (chỉ túi in đủ màu), light = chữ trên mảng
export interface RBPalette { id: string; name: string; bg: string; fill: string; ink: string; accent: string; light: string }
export const RB_PALETTES: RBPalette[] = [
  { id: 'lua', name: 'Lúa xanh', bg: '#F6F3E4', fill: '#2F7D3A', ink: '#1E3F1F', accent: '#E3A81B', light: '#FFFFFF' },
  { id: 'do', name: 'Đỏ truyền thống', bg: '#FFF5E6', fill: '#C8202A', ink: '#7A0F14', accent: '#E8A517', light: '#FFFFFF' },
  { id: 'rom', name: 'Vàng rơm', bg: '#FFF1C2', fill: '#E0A21A', ink: '#5A3A08', accent: '#2F7D3A', light: '#FFFFFF' },
  { id: 'navy', name: 'Navy', bg: '#F2F5FA', fill: '#1D3A6B', ink: '#14274A', accent: '#D9A43C', light: '#FFFFFF' },
  { id: 'nau', name: 'Nâu cà phê', bg: '#F5EBDD', fill: '#5A3420', ink: '#3A2014', accent: '#C8913E', light: '#FFF6E8' },
  { id: 'rung', name: 'Xanh rừng', bg: '#EEF4EA', fill: '#1F4D3A', ink: '#163527', accent: '#D97B29', light: '#FFFFFF' },
  { id: 'trang', name: 'Trắng tối giản', bg: '#FFFFFF', fill: '#2B2B2B', ink: '#1C1C1C', accent: '#C2392E', light: '#FFFFFF' },
  { id: 'cam', name: 'Cam đất', bg: '#FFF2E6', fill: '#C45A1C', ink: '#5A260A', accent: '#2C6E49', light: '#FFFFFF' },
];
export const rbPalette = (id: string) => RB_PALETTES.find((p) => p.id === id) || RB_PALETTES[0];

/** màu thực in theo loại bao: flexo (PP/kraft) nền = màu bao, không in; chỉ dùng đúng số màu mực chọn */
export interface Cols { bg: string; fill: string; ink: string; accent: string; light: string; sub: string; printedBg: boolean }
export function colsOf(spec: RBSpec): Cols {
  const p = rbPalette(spec.palette);
  if (!isFlexo(spec.kind)) return { bg: p.bg, fill: p.fill, ink: p.ink, accent: p.accent, light: p.light, sub: p.ink, printedBg: true };
  const S = substrateOf(spec.kind);
  const n = Math.min(spec.inks, maxInks(spec.kind));
  const c1 = p.ink, c2 = n >= 2 ? p.accent : c1, c3 = n >= 3 ? p.fill : n === 2 ? c1 : c1;
  // kraft: mực sáng chìm trên giấy nâu → ép mực tối
  return { bg: S, fill: c3, ink: c1, accent: c2, light: S, sub: c1, printedBg: false };
}

// ---------- bố cục + mẫu ----------
export type RBLayout = 'field' | 'badge' | 'classic' | 'farmer' | 'minimal';
export const RB_LAYOUTS: { id: RBLayout; name: string }[] = [
  { id: 'field', name: 'Cánh đồng' }, { id: 'badge', name: 'Huy hiệu bông lúa' }, { id: 'classic', name: 'Khung cổ điển' },
  { id: 'farmer', name: 'Nón lá nhà nông' }, { id: 'minimal', name: 'Tối giản chữ lớn' },
];
export interface RBSpec {
  kind: RBKind; size: string; layout: RBLayout; palette: string; font: string; product: RBProduct;
  inks: 1 | 2 | 3; window: boolean; handle: boolean;
}
export interface RBTemplate { id: string; name: string; spec: Omit<RBSpec, 'handle' | 'window'> & { window?: boolean } }
export const RB_TEMPLATES: RBTemplate[] = [
  { id: 'pp-field-lua', name: 'Bao PP · cánh đồng lúa', spec: { kind: 'pp', size: 'p10', layout: 'field', palette: 'lua', font: 'playfair', product: 'rice', inks: 3 } },
  { id: 'pp-badge-do', name: 'Bao PP · huy hiệu đỏ', spec: { kind: 'pp', size: 'p10', layout: 'badge', palette: 'do', font: 'oswald', product: 'rice', inks: 2 } },
  { id: 'pp-farmer-rom', name: 'Bao PP · nón lá vàng rơm', spec: { kind: 'pp', size: 'p25', layout: 'farmer', palette: 'rom', font: 'baloo', product: 'rice', inks: 3 } },
  { id: 'pp-classic-navy', name: 'Bao PP · khung navy', spec: { kind: 'pp', size: 'p5', layout: 'classic', palette: 'navy', font: 'playfair', product: 'rice', inks: 2 } },
  { id: 'vc-field-lua', name: 'Hút chân không · cánh đồng', spec: { kind: 'vacuum', size: 'v2', layout: 'field', palette: 'lua', font: 'lobster', product: 'rice', inks: 3, window: true } },
  { id: 'vc-badge-do', name: 'Hút chân không · đỏ lộc', spec: { kind: 'vacuum', size: 'v2', layout: 'badge', palette: 'do', font: 'playfair', product: 'rice', inks: 3 } },
  { id: 'vc-minimal-trang', name: 'Hút chân không · tối giản', spec: { kind: 'vacuum', size: 'v1', layout: 'minimal', palette: 'trang', font: 'montserrat', product: 'rice', inks: 3, window: true } },
  { id: 'pp-classic-nau', name: 'Cà phê nhân · bao PP', spec: { kind: 'pp', size: 'p25', layout: 'classic', palette: 'nau', font: 'oswald', product: 'coffee', inks: 2 } },
  { id: 'vc-badge-cam', name: 'Hạt điều · hút chân không', spec: { kind: 'vacuum', size: 'v1', layout: 'badge', palette: 'cam', font: 'baloo', product: 'cashew', inks: 3, window: true } },
  { id: 'kr-minimal', name: 'Bột mì · giấy kraft', spec: { kind: 'kraft', size: 'k10', layout: 'minimal', palette: 'trang', font: 'montserrat', product: 'flour', inks: 2 } },
  { id: 'kr-farmer-navy', name: 'Gạo · giấy kraft nón lá', spec: { kind: 'kraft', size: 'k5', layout: 'farmer', palette: 'navy', font: 'playfair', product: 'rice', inks: 2 } },
  { id: 'pp-field-rung', name: 'Đậu xanh · bao PP', spec: { kind: 'pp', size: 'p5', layout: 'field', palette: 'rung', font: 'baloo', product: 'bean', inks: 3 } },
];

// ---------- nội dung ----------
export type RBData = Record<string, string>;
export interface RBField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; back?: boolean }
export const RB_FIELDS: RBField[] = [
  { key: 'brand', label: 'Thương hiệu', ph: 'Hạt Ngọc Đồng Tháp', half: true },
  { key: 'product', label: 'Tên sản phẩm (to)', ph: 'GẠO ST25', half: true },
  { key: 'desc', label: 'Mô tả ngắn', ph: 'Gạo thơm đặc sản — hạt dài, dẻo, thơm' },
  { key: 'net', label: 'Khối lượng tịnh', ph: '5 KG', half: true },
  { key: 'origin', label: 'Vùng trồng / xuất xứ', ph: 'Đồng Tháp, Việt Nam', half: true },
  { key: 'badges', label: 'Điểm nổi bật (cách nhau bằng ·)', ph: 'Vụ mới · Không chất bảo quản · Hạt dài' },
  { key: 'ingredients', label: 'Thành phần', ph: '100% gạo ST25', back: true },
  { key: 'usage', label: 'Hướng dẫn sử dụng', ph: 'Vo nhẹ 1–2 lần, nấu tỉ lệ 1 gạo : 1,1 nước', multiline: true, back: true },
  { key: 'storage', label: 'Bảo quản', ph: 'Nơi khô ráo, thoáng mát, tránh ánh nắng', back: true },
  { key: 'standard', label: 'Tiêu chuẩn / số công bố', ph: 'TCCS 01:2026/HNDT', half: true, back: true },
  { key: 'phone', label: 'Hotline', ph: '0909 123 456', half: true, back: true },
  { key: 'maker', label: 'Cơ sở sản xuất & địa chỉ', ph: 'Cơ sở xay xát Hạt Ngọc — xã Mỹ An, Tháp Mười, Đồng Tháp', multiline: true, back: true },
  { key: 'qr', label: 'Link truy xuất (QR)', ph: 'hatngocdongthap.vn/truy-xuat', half: true, back: true },
  { key: 'barcode', label: 'Mã vạch (12 số đầu)', ph: '893601234567', half: true, back: true },
];
const BASE: RBData = {
  phone: '0909 123 456', barcode: '893601234567', standard: 'TCCS 01:2026/HNDT',
  storage: 'Nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp. Dùng tốt nhất trong 12 tháng.',
};
export const RB_SAMPLES: Record<RBProduct, RBData> = {
  rice: {
    ...BASE, brand: 'Hạt Ngọc Đồng Tháp', product: 'GẠO ST25', desc: 'Gạo thơm đặc sản — hạt dài, dẻo, thơm lá dứa', net: '10 KG',
    origin: 'Đồng Tháp, Việt Nam', badges: 'Vụ mới · Không chất bảo quản · Hạt dài', ingredients: '100% gạo ST25 vụ Đông Xuân',
    usage: 'Vo nhẹ 1–2 lần, nấu tỉ lệ 1 gạo : 1,1 nước. Ủ thêm 10 phút sau khi chín để cơm dẻo thơm.',
    maker: 'Cơ sở xay xát Hạt Ngọc — ấp 3, xã Mỹ An, huyện Tháp Mười, Đồng Tháp', qr: 'hatngocdongthap.vn/truy-xuat',
  },
  coffee: {
    ...BASE, brand: 'Nông Trại Cầu Đất', product: 'CÀ PHÊ NHÂN', desc: 'Robusta sàng 18 — chế biến ướt, phơi giàn', net: '25 KG',
    origin: 'Lâm Đồng, Việt Nam', badges: 'Sàng 18 · Độ ẩm ≤ 12,5% · Lô mới', ingredients: '100% cà phê nhân Robusta',
    usage: 'Rang ở 200–220°C trong 12–15 phút tuỳ độ rang mong muốn.', standard: 'TCVN 4193:2014',
    maker: 'HTX Nông Trại Cầu Đất — xã Xuân Trường, TP. Đà Lạt, Lâm Đồng', qr: 'caudatfarm.vn/lo-hang', barcode: '893601234574',
  },
  cashew: {
    ...BASE, brand: 'Điều Vàng Bình Phước', product: 'HẠT ĐIỀU', desc: 'Rang muối nguyên lụa — giòn, béo, thơm', net: '1 KG',
    origin: 'Bình Phước, Việt Nam', badges: 'Hạt W320 · Rang củi · Không phẩm màu', ingredients: 'Hạt điều, muối tinh',
    usage: 'Dùng ngay. Sau khi mở túi, gấp kín miệng túi và dùng trong 30 ngày.', storage: 'Nơi khô mát, tránh ẩm.',
    maker: 'Cơ sở Điều Vàng — phường Tân Phú, TP. Đồng Xoài, Bình Phước', qr: 'dieuvang.vn', barcode: '893601234581',
  },
  bean: {
    ...BASE, brand: 'Nhà Nông Quốc Bảo', product: 'ĐẬU XANH', desc: 'Đậu xanh cà vỏ — nấu chè, xôi, làm bánh', net: '5 KG',
    origin: 'Đắk Lắk, Việt Nam', badges: 'Hạt đều · Sạch sạn · Vụ mới', ingredients: '100% đậu xanh cà vỏ',
    usage: 'Ngâm 2–3 giờ trước khi nấu. Vo sạch, nấu chín mềm.', maker: 'Cơ sở Nhà Nông Quốc Bảo — xã Ea Kao, TP. Buôn Ma Thuột, Đắk Lắk',
    qr: 'nhanongquocbao.vn', barcode: '893601234598',
  },
  flour: {
    ...BASE, brand: 'Thu Hà Bakery Supply', product: 'BỘT MÌ ĐA DỤNG', desc: 'Số 11 — làm bánh mì, bánh bao, mì sợi', net: '10 KG',
    origin: 'Sản xuất tại Việt Nam', badges: 'Protein 11,5% · Mịn đều · Không tẩy trắng', ingredients: 'Bột lúa mì, vitamin nhóm B',
    usage: 'Rây trước khi dùng. Bảo quản kín sau khi mở bao.', standard: 'TCVN 4359:2008',
    maker: 'Công ty TNHH Thu Hà Bakery Supply — KCN Tân Tạo, TP. Hồ Chí Minh', qr: 'thuhabakery.vn', barcode: '893601234604',
  },
};
export const defaultRBData = (p: RBProduct = 'rice', size?: RBSize): RBData => ({ ...RB_SAMPLES[p], ...(size ? { net: size.net } : {}) });

// ---------- hình học 1 mặt ----------
export interface RBGeom { W: number; H: number; G: number; top: number; bottom: number; mx: number; safe: { x: number; y: number; w: number; h: number }; hole: null | { cx: number; cy: number; rx: number; ry: number } }
export function rbGeom(spec: RBSpec): RBGeom {
  const s = rbSize(spec.size);
  const mx = spec.kind === 'pp' ? 22 : spec.kind === 'kraft' ? 16 : 8;
  const my = spec.kind === 'vacuum' ? 6 : 12;
  const safe = { x: mx, y: s.top + my, w: s.W - mx * 2, h: s.H - s.top - s.bottom - my * 2 };
  const hole = spec.kind === 'vacuum' && spec.handle && s.W >= 130 ? { cx: s.W / 2, cy: s.top * 0.5, rx: Math.min(34, s.W * 0.2), ry: 7.5 } : null;
  return { W: s.W, H: s.H, G: s.G, top: s.top, bottom: s.bottom, mx, safe, hole };
}

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  return (mctx.measureText(s).width * size) / 100 + ls;
}
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || textW(next, size, ts) <= maxW) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** co chữ tới khi ≤ maxLines dòng và vừa bề rộng; cân dòng (không để 1 chữ mồ côi) */
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number, minSize = 0) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  const tooWide = () => lines.some((l) => textW(l, s, ts) > maxW + 0.01);
  while ((lines.length > maxLines || tooWide()) && s > Math.max(minSize, size * 0.25)) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && textW(last + '…', s, ts) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = last + '…';
  } else if (lines.length > 1) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  const widest = Math.max(0, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
const ASC = 0.98, DESC = 0.32;
const blockH = (n: number, size: number, lh: number) => (n ? size * (ASC + DESC) + (n - 1) * size * lh : 0);
type Anchor = 'start' | 'middle' | 'end';
function Lines({ lines, x, y, size, lh = 1.12, ts, fill, anchor = 'middle', role }: { lines: string[]; x: number; y: number; size: number; lh?: number; ts: TS; fill: string; anchor?: Anchor; role?: string }) {
  return (
    <g fontFamily={`'${ts.fam}'`} fontWeight={ts.wt} fontSize={size} fill={fill} textAnchor={anchor} letterSpacing={ts.ls ? ts.ls * size : undefined} data-rb-role={role}>
      {lines.map((l, i) => <text key={i} x={x} y={y + size * ASC + i * size * lh}>{l}</text>)}
    </g>
  );
}

// ---------- minh hoạ vẽ code ----------
/** bông lúa: thân cong + hạt so le dọc thân */
function Stalk({ x, y, len, bend, dir = 1, color, g = 1, grains = 9 }: { x: number; y: number; len: number; bend: number; dir?: number; color: string; g?: number; grains?: number }) {
  // đường cong bậc 2 từ gốc (x,y) lên ngọn
  const cx = x + bend * dir * len * 0.5, cy = y - len * 0.55;
  const ex = x + bend * dir * len, ey = y - len * 0.92;
  const pt = (t: number) => ({ x: (1 - t) ** 2 * x + 2 * (1 - t) * t * cx + t * t * ex, y: (1 - t) ** 2 * y + 2 * (1 - t) * t * cy + t * t * ey });
  const tan = (t: number) => ({ x: 2 * (1 - t) * (cx - x) + 2 * t * (ex - cx), y: 2 * (1 - t) * (cy - y) + 2 * t * (ey - cy) });
  const out: ReactNode[] = [];
  out.push(<path key="s" d={`M${x},${y} Q${cx},${cy} ${ex},${ey}`} stroke={color} strokeWidth={len * 0.022 * g} fill="none" strokeLinecap="round" />);
  for (let i = 0; i < grains; i++) {
    const t = 0.42 + (i / grains) * 0.56;
    const p = pt(t), d = tan(t);
    const a = (Math.atan2(d.y, d.x) * 180) / Math.PI;
    const side = i % 2 ? 1 : -1;
    const gl = len * 0.085 * g * (1 - (i / grains) * 0.35);
    out.push(<ellipse key={i} cx={0} cy={0} rx={gl} ry={gl * 0.38} fill={color} transform={`translate(${p.x} ${p.y}) rotate(${a + side * 32}) translate(${gl * 0.75} 0)`} />);
  }
  // lá
  out.push(<path key="l" d={`M${x},${y - len * 0.08} Q${x - dir * len * 0.3},${y - len * 0.35} ${x - dir * len * 0.42},${y - len * 0.62} Q${x - dir * len * 0.18},${y - len * 0.36} ${x},${y - len * 0.2}Z`} fill={color} opacity={0.92} />);
  return <g>{out}</g>;
}
/** cò trắng đang bay */
function Stork({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill={color}>
      <path d="M-1.1,0.05 C-0.6,-0.12 0.3,-0.12 0.85,0.02 C0.6,0.12 -0.4,0.14 -1.1,0.05Z" />
      <path d="M-0.2,-0.02 C-0.35,-0.55 -0.1,-0.9 0.45,-1.05 C0.15,-0.7 0.12,-0.35 0.2,-0.04Z" />
      <path d="M-0.15,0.06 C-0.4,0.5 -0.1,0.75 0.35,0.9 C0.1,0.55 0.15,0.3 0.22,0.06Z" opacity={0.85} />
      <path d="M0.85,0.02 L1.35,-0.06 L0.88,0.08Z" />
      <path d="M-1.05,0.06 L-1.6,0.22" stroke={color} strokeWidth={0.05} />
    </g>
  );
}
/** nón lá + người nông dân cúi cấy */
function Farmer({ x, y, s, color, hat }: { x: number; y: number; s: number; color: string; hat: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-0.05,-0.62 C0.25,-0.55 0.45,-0.3 0.5,0.05 L0.38,0.62 L0.22,0.62 L0.3,0.1 C0.2,-0.05 0.05,-0.1 -0.1,-0.05 L-0.25,0.62 L-0.42,0.62 L-0.3,0.0 C-0.42,-0.2 -0.35,-0.5 -0.05,-0.62Z" fill={color} />
      <path d="M-0.15,-0.4 L-0.55,-0.05 L-0.5,0.02 L-0.08,-0.28Z" fill={color} />
      <circle cx={-0.18} cy={-0.72} r={0.13} fill={color} />
      <path d="M-0.62,-0.62 L-0.12,-1.12 L0.38,-0.62 Q-0.12,-0.52 -0.62,-0.62Z" fill={hat} />
      <path d="M-0.62,-0.62 Q-0.12,-0.52 0.38,-0.62" stroke={color} strokeWidth={0.04} fill="none" />
      {[-0.7, -0.52].map((sx, i) => <path key={i} d={`M${sx},0.62 L${sx},0.38 M${sx},0.48 L${sx - 0.07},0.36 M${sx},0.48 L${sx + 0.07},0.36`} stroke={color} strokeWidth={0.035} />)}
    </g>
  );
}
/** hạt / biểu tượng sản phẩm */
export function Grain({ product, x, y, r, rot = 0, color, detail }: { product: RBProduct; x: number; y: number; r: number; rot?: number; color: string; detail: string }) {
  let b: ReactNode;
  switch (product) {
    case 'coffee': b = <><ellipse rx={0.66} ry={1} fill={color} /><path d="M0,-0.85 C0.32,-0.38 -0.32,0.38 0,0.85" stroke={detail} strokeWidth={0.13} fill="none" strokeLinecap="round" /></>; break;
    case 'cashew': b = <path d="M-0.8,-0.5 C-0.95,0.55 0.1,1.08 0.82,0.55 C0.98,0.4 0.82,0.18 0.6,0.28 C0.1,0.52 -0.36,0.12 -0.3,-0.48 C-0.27,-0.78 -0.74,-0.84 -0.8,-0.5Z" fill={color} />; break;
    case 'bean': b = <><path d="M-0.9,0 C-0.9,-0.6 -0.2,-0.75 0.2,-0.5 C0.5,-0.3 0.95,-0.4 0.95,0.05 C0.95,0.6 -0.9,0.7 -0.9,0Z" fill={color} /><ellipse cx={0.02} cy={-0.32} rx={0.16} ry={0.07} fill={detail} /></>; break;
    case 'flour': b = <>{[0, 1, 2, 3].map((i) => <g key={i}><ellipse cx={-0.18} cy={-0.7 + i * 0.36} rx={0.2} ry={0.11} fill={color} transform={`rotate(-35 -0.18 ${-0.7 + i * 0.36})`} /><ellipse cx={0.18} cy={-0.7 + i * 0.36} rx={0.2} ry={0.11} fill={color} transform={`rotate(35 0.18 ${-0.7 + i * 0.36})`} /></g>)}<path d="M0,-0.95 L0,1" stroke={color} strokeWidth={0.08} /></>; break;
    default: b = <ellipse rx={0.42} ry={1} fill={color} />;
  }
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${r})`}>{b}</g>;
}
/** cánh đồng: mặt trời + đồi nhiều lớp + luống + bông lúa 2 bên + cò bay */
function Field({ x, y, w, h, c, product, flexo }: { x: number; y: number; w: number; h: number; c: Cols; product: RBProduct; flexo: boolean }) {
  const sunR = Math.min(w, h) * 0.2;
  const sunC = flexo ? c.accent : c.accent;
  const hill = (top: number, amp: number, ph: number) => {
    let d = `M${x},${y + h} L${x},${y + top}`;
    for (let i = 0; i <= 20; i++) { const t = i / 20; d += ` L${x + t * w},${y + top + Math.sin(t * Math.PI * 1.3 + ph) * amp}`; }
    return d + ` L${x + w},${y + h} Z`;
  };
  const rows: ReactNode[] = [];
  const vx = x + w * 0.55, vy = y + h * 0.5;
  for (let i = -6; i <= 6; i++) rows.push(<path key={i} d={`M${vx + i * w * 0.012},${vy + h * 0.06} L${vx + i * w * 0.16},${y + h}`} stroke={c.light} strokeWidth={w * 0.004} opacity={0.6} />);
  const stalkC = flexo ? c.ink : c.accent;
  return (
    <g>
      <circle cx={x + w * 0.72} cy={y + h * 0.36} r={sunR} fill={sunC} />
      <path d={hill(h * 0.42, h * 0.05, 0.4)} fill={c.fill} opacity={flexo ? 1 : 0.55} />
      <path d={hill(h * 0.55, h * 0.06, 2.1)} fill={c.fill} />
      <clipPath id={`rbf-${Math.round(w)}-${Math.round(h)}`}><path d={hill(h * 0.55, h * 0.06, 2.1)} /></clipPath>
      <g clipPath={`url(#rbf-${Math.round(w)}-${Math.round(h)})`}>{rows}</g>
      <Stork x={x + w * 0.3} y={y + h * 0.2} s={w * 0.055} color={flexo ? c.ink : c.light === '#FFFFFF' ? '#FFFFFF' : c.light} />
      <Stork x={x + w * 0.44} y={y + h * 0.3} s={w * 0.035} color={flexo ? c.ink : c.light === '#FFFFFF' ? '#FFFFFF' : c.light} />
      {product === 'rice' || product === 'flour'
        ? <><Stalk x={x + w * 0.06} y={y + h} len={h * 0.75} bend={0.35} dir={1} color={stalkC} /><Stalk x={x + w * 0.94} y={y + h} len={h * 0.7} bend={0.35} dir={-1} color={stalkC} /></>
        : [0.08, 0.2, 0.86].map((t, i) => <Grain key={i} product={product} x={x + w * t} y={y + h * (0.8 - i * 0.04)} r={h * 0.09} rot={i * 50 - 20} color={stalkC} detail={c.light} />)}
    </g>
  );
}

// ---------- mã vạch + QR ----------
function Barcode({ x, y, w, code, color, bg }: { x: number; y: number; w: number; code: string; color: string; bg: string }) {
  const { digits, bits } = ean13(code);
  const m = w / 113, h = m * 50, guard = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  const qz = m * 9;
  const rects: ReactNode[] = [];
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') rects.push(<rect key={i} x={x + qz + i * m} y={y} width={m} height={guard.has(i) ? h + m * 5 : h} fill={color} />);
  const fs = m * 8;
  return (
    <g data-rb-barcode={digits}>
      <rect x={x} y={y - m * 3} width={w} height={h + m * 15} fill={bg} />
      {rects}
      <g fontFamily={`'${BODY}'`} fontWeight={600} fontSize={fs} fill={color} textAnchor="middle">
        <text x={x + qz - m * 4} y={y + h + m * 9}>{digits[0]}</text>
        <text x={x + qz + m * 24} y={y + h + m * 9}>{digits.slice(1, 7)}</text>
        <text x={x + qz + m * 70} y={y + h + m * 9}>{digits.slice(7)}</text>
      </g>
    </g>
  );
}
export const barcodeH = (w: number) => (w / 113) * 65;
function QR({ x, y, s, text, color, bg }: { x: number; y: number; s: number; text: string; color: string; bg: string }) {
  const { d, n } = qrPath(text || 'mivy.vn');
  const q = s / (n + 4);
  return (
    <g data-rb-qr="1">
      <rect x={x} y={y} width={s} height={s} fill={bg} />
      <path d={d} transform={`translate(${x + q * 2} ${y + q * 2}) scale(${q})`} fill={color} />
    </g>
  );
}

// ---------- mặt trước ----------
function Front({ spec, data, g, c, logo }: { spec: RBSpec; data: RBData; g: RBGeom; c: Cols; logo?: string }) {
  const f = rbFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight };
  const bodyB: TS = { fam: BODY, wt: 800, ls: 0.06 };
  const bodyR: TS = { fam: BODY, wt: 600 };
  const { x: sx, y: sy, w: sw, h: sh } = g.safe;
  const cx = sx + sw / 2;
  const flexo = isFlexo(spec.kind);
  const U = sw; // thang chữ theo bề rộng vùng an toàn
  const out: ReactNode[] = [];
  const brand = (data.brand || '').trim(), product = (data.product || '').trim(), desc = (data.desc || '').trim();
  const net = (data.net || rbSize(spec.size).net).trim(), origin = (data.origin || '').trim();
  const badges = (data.badges || '').split('·').map((s) => s.trim()).filter(Boolean).slice(0, 3);

  // khối chữ chính: brand (nhỏ hoa) + product (to) + desc
  const titleBlock = (top: number, maxH: number, color: string, subColor: string, brandColor: string, maxW = sw) => {
    const b = fitBlock(brand.toUpperCase(), maxW, U * 0.055, bodyB, 2, U * 0.03);
    const p = fitBlock(product, maxW, U * 0.17, disp, 2, U * 0.06);
    const d = desc ? fitBlock(desc, maxW * 0.92, U * 0.045, bodyR, 2, U * 0.028) : { lines: [], size: 0 };
    let k = 1;
    const tot = () => blockH(b.lines.length, b.size * k, 1.15) + U * 0.02 + blockH(p.lines.length, p.size * k, 1.0) + (d.lines.length ? U * 0.02 + blockH(d.lines.length, d.size * k, 1.18) : 0);
    while (tot() > maxH && k > 0.4) k *= 0.95;
    let yy = top;
    out.push(<Lines key="brand" role="brand" lines={b.lines} x={cx} y={yy} size={b.size * k} lh={1.15} ts={bodyB} fill={brandColor} />);
    yy += blockH(b.lines.length, b.size * k, 1.15) + U * 0.02;
    out.push(<Lines key="product" role="product" lines={p.lines} x={cx} y={yy} size={p.size * k} lh={1.0} ts={disp} fill={color} />);
    yy += blockH(p.lines.length, p.size * k, 1.0);
    if (d.lines.length) { yy += U * 0.02; out.push(<Lines key="desc" role="desc" lines={d.lines} x={cx} y={yy} size={d.size * k} lh={1.18} ts={bodyR} fill={subColor} />); yy += blockH(d.lines.length, d.size * k, 1.18); }
    return yy;
  };
  // khối lượng tịnh (to) trong khung
  const netBadge = (bx: number, by: number, r: number, fill: string, ink: string, ring: string) => {
    const nt = fitBlock(net, r * 1.55, r * 0.72, { fam: 'Oswald', wt: 700 }, 1, r * 0.25);
    const lab = 'KHỐI LƯỢNG TỊNH';
    const ls = Math.min(r * 0.14, (r * 1.5) / Math.max(1, textW(lab, 1, bodyB)));
    out.push(
      <g key="net" data-rb-role="net">
        <circle cx={bx} cy={by} r={r} fill={fill} />
        <circle cx={bx} cy={by} r={r * 0.88} fill="none" stroke={ring} strokeWidth={r * 0.03} />
        <Lines lines={[lab]} x={bx} y={by - r * 0.52} size={ls} ts={bodyB} fill={ink} />
        <Lines lines={nt.lines} x={bx} y={by - nt.size * 0.55} size={nt.size} ts={{ fam: 'Oswald', wt: 700 }} fill={ink} />
      </g>,
    );
  };
  const badgeRow = (y: number, color: string) => {
    if (!badges.length) return 0;
    const text = badges.join('  •  ');
    const r = fitBlock(text, sw, U * 0.04, bodyB, 1, U * 0.022);
    out.push(<Lines key="badges" role="badges" lines={r.lines} x={cx} y={y} size={r.size} ts={bodyB} fill={color} />);
    return blockH(1, r.size, 1);
  };
  const originLine = (y: number, color: string) => {
    if (!origin) return 0;
    const r = fitBlock(`Xuất xứ: ${origin}`, sw * 0.9, U * 0.04, bodyR, 1, U * 0.022);
    out.push(<Lines key="origin" role="origin" lines={r.lines} x={cx} y={y} size={r.size} ts={bodyR} fill={color} />);
    return blockH(1, r.size, 1);
  };
  const logoMark = (x: number, y: number, s: number, color: string) => {
    if (!logo) return;
    out.push(<g key="logo" data-rb-role="logo"><mask id={`rblm-${spec.kind}`}><image href={logo} x={x - s / 2} y={y - s / 2} width={s} height={s} preserveAspectRatio="xMidYMid meet" /></mask><rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={color} mask={`url(#rblm-${spec.kind})`} /></g>);
  };

  switch (spec.layout) {
    case 'field': {
      const art = { x: 0, y: sy + sh * 0.5, w: g.W, h: g.H - g.bottom - (sy + sh * 0.5) };
      if (spec.window && spec.kind === 'vacuum') art.h *= 0.55;
      logoMark(cx, sy + U * 0.05, U * 0.12, c.accent);
      const top = sy + (logo ? U * 0.12 : 0);
      titleBlock(top, sh * 0.44 - (logo ? U * 0.12 : 0), c.ink, c.sub, c.accent);
      out.unshift(<Field key="field" x={art.x} y={art.y} w={art.w} h={art.h} c={c} product={spec.product} flexo={isFlexo(spec.kind)} />);
      const r = Math.min(sw * 0.17, sh * 0.13);
      netBadge(sx + r * 1.02, sy + sh * 0.5 + r * 0.2, r, c.ink, c.light, c.accent);
      const bh = badges.length ? fitBlock(badges.join('  •  '), sw, U * 0.04, bodyB, 1, U * 0.022).size * 1.3 : 0;
      badgeRow(sy + sh - bh - U * 0.045, c.light);
      originLine(sy + sh - U * 0.04, c.light);
      break;
    }
    case 'badge': {
      const R = Math.min(sw * 0.44, sh * 0.28);
      const ey = sy + sh * 0.42;
      if (!flexo) out.push(<rect key="bgband" x={0} y={ey - R * 0.15} width={g.W} height={R * 0.3} fill={c.fill} opacity={0.18} />);
      out.push(<circle key="em" cx={cx} cy={ey} r={R} fill={c.fill} />);
      out.push(<circle key="em2" cx={cx} cy={ey} r={R * 0.9} fill="none" stroke={c.light} strokeWidth={R * 0.02} />);
      out.push(<g key="wreath"><Stalk x={cx - R * 0.15} y={ey + R * 0.82} len={R * 1.3} bend={-0.75} dir={1} color={c.accent} g={0.8} /><Stalk x={cx + R * 0.15} y={ey + R * 0.82} len={R * 1.3} bend={-0.75} dir={-1} color={c.accent} g={0.8} /></g>);
      const p = fitBlock(product, R * 1.35, R * 0.38, disp, 2, R * 0.12);
      const ph = blockH(p.lines.length, p.size, 1.0);
      out.push(<Lines key="product" role="product" lines={p.lines} x={cx} y={ey - ph / 2} size={p.size} lh={1.0} ts={disp} fill={c.light} />);
      const b = fitBlock(brand.toUpperCase(), sw, U * 0.06, bodyB, 2, U * 0.03);
      const bTop = Math.max(sy, ey - R - U * 0.03 - blockH(b.lines.length, b.size, 1.15));
      out.push(<Lines key="brand" role="brand" lines={b.lines} x={cx} y={bTop} size={b.size} lh={1.15} ts={bodyB} fill={c.ink} />);
      let yy = ey + R + U * 0.04;
      if (desc) { const d = fitBlock(desc, sw, U * 0.045, bodyR, 2, U * 0.026); out.push(<Lines key="desc" role="desc" lines={d.lines} x={cx} y={yy} size={d.size} lh={1.18} ts={bodyR} fill={c.sub} />); yy += blockH(d.lines.length, d.size, 1.18) + U * 0.03; }
      const remain = sy + sh - yy;
      const nh = Math.min(remain * 0.55, U * 0.2);
      if (nh > U * 0.05) {
        const nt = fitBlock(net, sw * 0.6, nh * 0.8, { fam: 'Oswald', wt: 700 }, 1, U * 0.05);
        const bw = Math.min(sw * 0.7, textW(nt.lines[0] || '', nt.size, { fam: 'Oswald', wt: 700 }) + nt.size * 1.2);
        out.push(<g key="net" data-rb-role="net"><rect x={cx - bw / 2} y={yy} width={bw} height={nt.size * 1.35} rx={nt.size * 0.2} fill={c.accent} /><Lines lines={nt.lines} x={cx} y={yy + nt.size * 0.05} size={nt.size} ts={{ fam: 'Oswald', wt: 700 }} fill={flexo ? c.light : c.light} /></g>);
        yy += nt.size * 1.35 + U * 0.03;
      }
      const used = badgeRow(Math.min(yy, sy + sh - U * 0.12), c.ink);
      originLine(Math.min(yy + used + U * 0.015, sy + sh - U * 0.05), c.sub);
      logoMark(sx + U * 0.07, sy + U * 0.07, U * 0.12, c.accent);
      break;
    }
    case 'classic': {
      const inset = U * 0.03;
      out.push(<rect key="f1" x={sx - inset} y={sy - inset} width={sw + inset * 2} height={sh + inset * 2} fill="none" stroke={c.ink} strokeWidth={U * 0.008} />);
      out.push(<rect key="f2" x={sx} y={sy} width={sw} height={sh} fill="none" stroke={c.accent} strokeWidth={U * 0.004} />);
      // dải ruy băng thương hiệu
      const b = fitBlock(brand.toUpperCase(), sw * 0.76, U * 0.06, bodyB, 1, U * 0.028);
      const rh = b.size * 1.9, ry = sy + U * 0.04;
      out.push(<path key="rib" d={`M${sx + sw * 0.06},${ry} H${sx + sw * 0.94} L${sx + sw * 0.9},${ry + rh / 2} L${sx + sw * 0.94},${ry + rh} H${sx + sw * 0.06} L${sx + sw * 0.1},${ry + rh / 2}Z`} fill={c.fill} />);
      out.push(<Lines key="brand" role="brand" lines={b.lines} x={cx} y={ry + (rh - b.size * 1.3) / 2} size={b.size} ts={bodyB} fill={c.light} />);
      const yy = titleBlockNoBrand(ry + rh + U * 0.05);
      // minh hoạ giữa: mặt trời + bông lúa/hạt
      const ay = yy + U * 0.04, ah = Math.max(U * 0.2, sy + sh - ay - U * 0.36);
      out.push(<g key="art"><circle cx={cx} cy={ay + ah * 0.45} r={Math.min(ah, sw) * 0.3} fill={c.accent} opacity={flexo ? 1 : 0.85} />
        {spec.product === 'rice' || spec.product === 'flour'
          ? <><Stalk x={cx - ah * 0.08} y={ay + ah} len={ah * 0.95} bend={-0.4} dir={1} color={c.ink} /><Stalk x={cx + ah * 0.08} y={ay + ah} len={ah * 0.9} bend={-0.4} dir={-1} color={c.ink} /><Stalk x={cx} y={ay + ah} len={ah} bend={0.05} dir={1} color={c.ink} /></>
          : [[-0.22, 0.6, -30], [0, 0.5, 10], [0.22, 0.62, 40], [-0.1, 0.8, 70], [0.12, 0.82, -50]].map(([dx, dy, r], i) => <Grain key={i} product={spec.product} x={cx + dx * sw} y={ay + ah * dy} r={ah * 0.14} rot={r} color={c.ink} detail={c.light} />)}
      </g>);
      const nh = U * 0.16;
      const nt = fitBlock(net, sw * 0.5, nh, { fam: 'Oswald', wt: 700 }, 1, U * 0.05);
      const ny = sy + sh - U * 0.2;
      out.push(<g key="net" data-rb-role="net"><rect x={cx - sw * 0.3} y={ny} width={sw * 0.6} height={nt.size * 1.35} fill="none" stroke={c.ink} strokeWidth={U * 0.006} /><Lines lines={nt.lines} x={cx} y={ny + nt.size * 0.05} size={nt.size} ts={{ fam: 'Oswald', wt: 700 }} fill={c.ink} /></g>);
      originLine(sy + sh - U * 0.045, c.sub);
      logoMark(sx + sw - U * 0.08, sy + U * 0.06 + rh + U * 0.06, U * 0.1, c.accent);
      break;
    }
    case 'farmer': {
      // mặt trời lớn + người nông dân đội nón lá trên ruộng
      const ay = sy + sh * 0.38, ah = sh * 0.42;
      out.push(<circle key="sun" cx={cx} cy={ay + ah * 0.35} r={Math.min(sw * 0.36, ah * 0.48)} fill={c.accent} />);
      out.push(<rect key="paddy" x={0} y={ay + ah * 0.7} width={g.W} height={ah * 0.3} fill={c.fill} />);
      for (let i = 0; i < 4; i++) out.push(<path key={`w${i}`} d={`M0,${ay + ah * (0.76 + i * 0.06)} Q${g.W * 0.25},${ay + ah * (0.73 + i * 0.06)} ${g.W * 0.5},${ay + ah * (0.76 + i * 0.06)} T${g.W},${ay + ah * (0.76 + i * 0.06)}`} stroke={c.light} strokeWidth={U * 0.004} fill="none" opacity={0.7} />);
      out.push(<Farmer key="farmer" x={cx - sw * 0.04} y={ay + ah * 0.48} s={ah * 0.36} color={c.ink} hat={flexo ? c.ink : '#E9C77B'} />);
      out.push(<Stork key="st" x={cx + sw * 0.3} y={ay + ah * 0.12} s={sw * 0.05} color={c.ink} />);
      titleBlock(sy, sh * 0.36, c.ink, c.sub, c.fill === c.ink ? c.accent : c.fill);
      const r = Math.min(sw * 0.15, sh * 0.1);
      const by = ay + ah + r * 1.05;
      netBadge(cx, Math.min(by, sy + sh - r - U * 0.1), r, c.ink, c.light, c.accent);
      const bh = U * 0.045;
      badgeRow(sy + sh - bh * 2.2, c.ink);
      originLine(sy + sh - bh, c.sub);
      logoMark(sx + U * 0.06, ay + U * 0.02, U * 0.1, c.accent);
      break;
    }
    default: { // minimal
      const sideX = sx;
      const b = fitBlock(brand.toUpperCase(), sw, U * 0.055, bodyB, 2, U * 0.03);
      out.push(<Lines key="brand" role="brand" lines={b.lines} x={sideX} y={sy} size={b.size} lh={1.15} ts={bodyB} fill={c.accent} anchor="start" />);
      let yy = sy + blockH(b.lines.length, b.size, 1.15) + U * 0.03;
      out.push(<rect key="rule" x={sideX} y={yy} width={sw * 0.3} height={U * 0.012} fill={c.ink} />);
      yy += U * 0.05;
      const p = fitBlock(product, sw, U * 0.22, disp, 3, U * 0.07);
      out.push(<Lines key="product" role="product" lines={p.lines} x={sideX} y={yy} size={p.size} lh={1.0} ts={disp} fill={c.ink} anchor="start" />);
      yy += blockH(p.lines.length, p.size, 1.0) + U * 0.03;
      if (desc) { const d = fitBlock(desc, sw * 0.85, U * 0.048, bodyR, 3, U * 0.028); out.push(<Lines key="desc" role="desc" lines={d.lines} x={sideX} y={yy} size={d.size} lh={1.2} ts={bodyR} fill={c.sub} anchor="start" />); yy += blockH(d.lines.length, d.size, 1.2); }
      const iconY = yy + U * 0.1;
      const room = sy + sh - U * 0.38 - iconY;
      if (room > U * 0.12) {
        const ir = Math.min(room * 0.42, sw * 0.12);
        [0, 1, 2].forEach((i) => out.push(<Grain key={`gi${i}`} product={spec.product} x={sideX + ir + i * ir * 2.4} y={iconY + ir + (i % 2) * ir * 0.3} r={ir} rot={i * 35 - 25} color={i === 1 ? c.accent : c.ink} detail={c.light} />));
      }
      const nt = fitBlock(net, sw * 0.7, U * 0.24, { fam: 'Oswald', wt: 700 }, 1, U * 0.08);
      const ny = sy + sh - U * 0.07 - nt.size * 1.3;
      out.push(<g key="net" data-rb-role="net"><Lines lines={['KHỐI LƯỢNG TỊNH']} x={sideX} y={ny - U * 0.045} size={U * 0.032} ts={bodyB} fill={c.sub} anchor="start" /><Lines lines={nt.lines} x={sideX} y={ny} size={nt.size} ts={{ fam: 'Oswald', wt: 700 }} fill={c.ink} anchor="start" /></g>);
      const o = origin ? fitBlock(origin, sw * 0.9, U * 0.038, bodyR, 1, U * 0.022) : null;
      if (o) out.push(<Lines key="origin" role="origin" lines={o.lines} x={sideX} y={sy + sh - U * 0.05} size={o.size} ts={bodyR} fill={c.sub} anchor="start" />);
      logoMark(sx + sw - U * 0.08, sy + U * 0.08, U * 0.14, c.accent);
      break;
    }
  }
  return <>{out}</>;

  function titleBlockNoBrand(top: number) {
    const p = fitBlock(product, sw * 0.9, U * 0.16, disp, 2, U * 0.06);
    out.push(<Lines key="product" role="product" lines={p.lines} x={cx} y={top} size={p.size} lh={1.0} ts={disp} fill={c.ink} />);
    let yy = top + blockH(p.lines.length, p.size, 1.0);
    if (desc) { const d = fitBlock(desc, sw * 0.86, U * 0.045, bodyR, 2, U * 0.026); yy += U * 0.02; out.push(<Lines key="desc" role="desc" lines={d.lines} x={cx} y={yy} size={d.size} lh={1.18} ts={bodyR} fill={c.sub} />); yy += blockH(d.lines.length, d.size, 1.18); }
    return yy;
  }
}

// ---------- mặt sau: thông tin bắt buộc ----------
function Back({ spec, data, g, c }: { spec: RBSpec; data: RBData; g: RBGeom; c: Cols }) {
  const { x: sx, y: sy, w: sw, h: sh } = g.safe;
  const U = sw;
  const bodyB: TS = { fam: BODY, wt: 800 };
  const bodyR: TS = { fam: BODY, wt: 600 };
  const out: ReactNode[] = [];
  // đầu: dải thương hiệu
  const f = rbFont(spec.font);
  const headH = Math.min(sh * 0.14, U * 0.2);
  out.push(<rect key="head" x={0} y={sy} width={g.W} height={headH} fill={c.fill} />);
  const p = fitBlock(`${data.product || ''}`.trim(), sw * 0.9, headH * 0.42, { fam: f.family, wt: f.weight }, 1, headH * 0.15);
  const b = fitBlock((data.brand || '').toUpperCase(), sw * 0.9, headH * 0.2, bodyB, 1, headH * 0.08);
  const th = blockH(1, p.size, 1) + headH * 0.06 + blockH(1, b.size, 1);
  out.push(<Lines key="hp" role="product" lines={p.lines} x={sx + sw / 2} y={sy + (headH - th) / 2} size={p.size} ts={{ fam: f.family, wt: f.weight }} fill={c.light} />);
  out.push(<Lines key="hb" role="brand" lines={b.lines} x={sx + sw / 2} y={sy + (headH - th) / 2 + blockH(1, p.size, 1) + headH * 0.06} size={b.size} ts={bodyB} fill={c.light} />);

  // đáy: NSX/HSD/Lô + mã vạch + QR + KL tịnh
  const footH = Math.min(sh * 0.3, U * 0.42);
  const fy = sy + sh - footH;
  const qs = Math.min(footH * 0.62, sw * 0.24);
  const bw = Math.min(sw * 0.42, footH * 1.2);
  const bh = barcodeH(bw);
  out.push(<Barcode key="bar" x={sx} y={sy + sh - bh + (bw / 113) * 3} w={bw} code={data.barcode || ''} color={c.ink} bg={c.printedBg ? '#FFFFFF' : c.bg} />);
  out.push(<QR key="qr" x={sx + sw - qs} y={sy + sh - qs - U * 0.035} s={qs} text={data.qr || ''} color={c.ink} bg={c.printedBg ? '#FFFFFF' : c.bg} />);
  const qcap = fitBlock('Quét để truy xuất', qs * 1.2, U * 0.026, bodyR, 1, U * 0.014);
  out.push(<Lines key="qrc" role="qr-cap" lines={qcap.lines} x={sx + sw - qs / 2} y={sy + sh - U * 0.03} size={qcap.size} ts={bodyR} fill={c.ink} />);
  // ô date (in phun sau)
  const boxY = fy, boxH = Math.max(U * 0.05, footH - bh - U * 0.06 - Math.max(0, qs - bh));
  const labels = ['NSX', 'HSD', 'SỐ LÔ'];
  const bxW = (sw - qs - U * 0.04) / 3;
  const ls = Math.min(U * 0.03, boxH * 0.32);
  labels.forEach((l, i) => {
    const x = sx + i * bxW;
    out.push(<g key={`box${i}`} data-rb-role="datebox"><rect x={x + U * 0.005} y={boxY} width={bxW - U * 0.015} height={boxH} fill="none" stroke={c.ink} strokeWidth={U * 0.003} rx={U * 0.006} /><Lines lines={[l]} x={x + bxW / 2} y={boxY + U * 0.01} size={ls} ts={bodyB} fill={c.ink} /></g>);
  });
  // KL tịnh nhỏ cạnh mã vạch
  const nt = fitBlock(`KL tịnh: ${data.net || rbSize(spec.size).net}`, sw - bw - qs - U * 0.06, U * 0.05, bodyB, 1, U * 0.022);
  out.push(<Lines key="netb" role="net" lines={nt.lines} x={sx + bw + U * 0.03} y={sy + sh - bh * 0.7} size={nt.size} ts={bodyB} fill={c.ink} anchor="start" />);

  // giữa: các mục thông tin
  const items: [string, string][] = [
    ['Thành phần', data.ingredients], ['Hướng dẫn sử dụng', data.usage], ['Bảo quản', data.storage],
    ['Xuất xứ', data.origin], ['Tiêu chuẩn / số công bố', data.standard], ['Cơ sở sản xuất', data.maker], ['Hotline', data.phone],
  ].filter(([, v]) => (v || '').trim()) as [string, string][];
  const top = sy + headH + U * 0.04, avail = fy - U * 0.04 - top;
  let size = U * 0.042;
  const lay = (s: number) => {
    let h = 0;
    const blocks = items.map(([lab, val]) => {
      const lines = wrapLines(val, sw, s, bodyR);
      const bh2 = blockH(1, s * 0.82, 1) + s * 0.25 + blockH(lines.length, s, 1.22) + s * 0.55;
      h += bh2;
      return { lab, lines, bh: bh2 };
    });
    return { h, blocks };
  };
  let L = lay(size);
  while (L.h > avail && size > U * 0.012) { size *= 0.94; L = lay(size); }
  let yy = top;
  L.blocks.forEach((bl, i) => {
    out.push(<Lines key={`l${i}`} role="info-label" lines={[bl.lab.toUpperCase()]} x={sx} y={yy} size={size * 0.82} ts={{ ...bodyB, ls: 0.04 }} fill={c.accent === c.ink ? c.ink : c.accent} anchor="start" />);
    const ly = yy + blockH(1, size * 0.82, 1) + size * 0.25;
    out.push(<Lines key={`v${i}`} role="info" lines={bl.lines} x={sx} y={ly} size={size} lh={1.22} ts={bodyR} fill={c.ink} anchor="start" />);
    yy += bl.bh;
  });
  return <>{out}</>;
}

// ---------- hông (túi có hông) ----------
function Side({ spec, data, g, c, mirror }: { spec: RBSpec; data: RBData; g: RBGeom; c: Cols; mirror?: boolean }) {
  const G = g.G; if (!G) return null;
  const f = rbFont(spec.font);
  const len = g.H - g.top - g.bottom - G * 0.3;
  const t = fitBlock(`${(data.brand || '').trim()}`, len * 0.62, G * 0.34, { fam: f.family, wt: f.weight }, 1, G * 0.1);
  const n = fitBlock(data.net || rbSize(spec.size).net, len * 0.3, G * 0.3, { fam: 'Oswald', wt: 700 }, 1, G * 0.1);
  const midY = g.top + (g.H - g.top - g.bottom) / 2;
  return (
    <g transform={`rotate(${mirror ? 90 : -90} ${G / 2} ${midY})`}>
      <Lines lines={t.lines} x={G / 2 - len * 0.16} y={midY - t.size * 0.62} size={t.size} ts={{ fam: f.family, wt: f.weight }} fill={c.ink} role="side" />
      <Lines lines={n.lines} x={G / 2 + len * 0.34} y={midY - n.size * 0.62} size={n.size} ts={{ fam: 'Oswald', wt: 700 }} fill={c.accent} role="side" />
    </g>
  );
}

// ---------- vẽ 1 mặt ----------
export type RBMode = 'screen' | 'tex' | 'print';
/** cửa sổ trong (túi hút chân không): ô bầu dục giữa nửa dưới, nhìn thấy hạt */
export function windowRect(spec: RBSpec, g: RBGeom) {
  if (spec.kind !== 'vacuum' || !spec.window) return null;
  const w = g.safe.w * 0.62, h = Math.min(g.safe.h * 0.2, w * 0.62);
  return { x: g.W / 2 - w / 2, y: g.H - g.bottom - g.safe.h * 0.06 - h - g.safe.h * 0.13, w, h };
}
function RiceFill({ x, y, w, h, product, id }: { x: number; y: number; w: number; h: number; product: RBProduct; id: string }) {
  // hạt thật bên trong (tex/screen): hoa văn hạt dày đặc
  const s = Math.max(2, w / 24);
  const col = product === 'coffee' ? ['#6B4A2E', '#5A3B22', '#7A5634'] : product === 'cashew' ? ['#E7C98F', '#D9B877', '#EFD39F'] : product === 'bean' ? ['#7FA34A', '#6E9440', '#8FB356'] : product === 'flour' ? ['#F4EEDF', '#EDE5D2', '#F8F3E7'] : ['#F7F3E8', '#EFE9DA', '#FBF8EF'];
  const out: ReactNode[] = [];
  let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let yy = 0; yy < h + s; yy += s * 0.55) for (let xx = 0; xx < w + s; xx += s * 0.75) {
    out.push(<ellipse key={`${xx}-${yy}`} cx={x + xx + rnd() * s * 0.4} cy={y + yy + rnd() * s * 0.3} rx={product === 'rice' ? s * 0.42 : s * 0.4} ry={product === 'rice' ? s * 0.15 : s * 0.3} transform={`rotate(${rnd() * 180} ${x + xx} ${y + yy})`} fill={col[Math.floor(rnd() * 3)]} stroke="#00000014" strokeWidth={s * 0.03} />);
  }
  return <g clipPath={`url(#${id})`}><rect x={x} y={y} width={w} height={h} fill={col[1]} />{out}</g>;
}

export function RBFaceSvg({ spec, data, side = 'front', mode = 'screen', logo, bleed = false, guides = false, style }: {
  spec: RBSpec; data: RBData; side?: 'front' | 'back'; mode?: RBMode; logo?: string; bleed?: boolean; guides?: boolean; style?: CSSProperties;
}) {
  const g = rbGeom(spec), c = colsOf(spec);
  const b = bleed ? RB_BLEED : 0;
  const win = side === 'front' ? windowRect(spec, g) : null;
  const wid = `rbw-${side}-${spec.kind}`;
  const sub = substrateOf(spec.kind);
  // nền: túi in đủ màu → nền in; PP/kraft → màu bao (không in; trong bản in là lớp tham khảo)
  const bgFill = c.printedBg ? c.bg : sub;
  return (
    <svg viewBox={`${-b} ${-b} ${g.W + b * 2} ${g.H + b * 2}`} width={`${g.W + b * 2}mm`} height={`${g.H + b * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-rb-face={side} data-w={g.W} data-h={g.H}>
      <defs>{win && <clipPath id={wid}><ellipse cx={win.x + win.w / 2} cy={win.y + win.h / 2} rx={win.w / 2} ry={win.h / 2} /></clipPath>}</defs>
      {mode === 'print' && !c.printedBg
        ? <rect id="MauBaoThamKhao" x={-b} y={-b} width={g.W + b * 2} height={g.H + b * 2} fill={sub} opacity={0.35} data-ref="1" />
        : <rect x={-b} y={-b} width={g.W + b * 2} height={g.H + b * 2} fill={bgFill} data-ref={c.printedBg ? undefined : '1'} />}
      <g id="In">
        {side === 'front' ? <Front spec={spec} data={data} g={g} c={c} logo={logo} /> : <Back spec={spec} data={data} g={g} c={c} />}
        {win && mode !== 'print' && <RiceFill x={win.x} y={win.y} w={win.w} h={win.h} product={spec.product} id={wid} />}
        {win && <ellipse cx={win.x + win.w / 2} cy={win.y + win.h / 2} rx={win.w / 2} ry={win.h / 2} fill={mode === 'print' ? '#FFFFFF' : 'none'} stroke={c.light === '#FFFFFF' ? c.ink : c.light} strokeWidth={g.safe.w * 0.006} data-rb-window="1" />}
      </g>
      {(guides || mode === 'print') && <RBGuides spec={spec} g={g} side={side} win={win} mode={mode} />}
    </svg>
  );
}
function RBGuides({ spec, g, side, win, mode }: { spec: RBSpec; g: RBGeom; side: 'front' | 'back'; win: ReturnType<typeof windowRect>; mode: RBMode }) {
  const sw = Math.max(0.35, g.W * 0.0016);
  const dash = `${g.W * 0.012} ${g.W * 0.008}`;
  const topLabel = spec.kind === 'pp' ? 'đường may miệng bao' : spec.kind === 'kraft' ? 'gấp dán miệng (pinch)' : 'mép hàn trên';
  const botLabel = spec.kind === 'pp' ? 'đường may đáy' : spec.kind === 'kraft' ? 'gấp dán đáy' : 'mép hàn đáy';
  const fs = Math.max(2.4, g.W * 0.018);
  return (
    <g id="Guides" data-guides="1">
      <rect x={0} y={0} width={g.W} height={g.top} fill="#E11D48" opacity={mode === 'print' ? 0.06 : 0.1} />
      <rect x={0} y={g.H - g.bottom} width={g.W} height={g.bottom} fill="#E11D48" opacity={mode === 'print' ? 0.06 : 0.1} />
      <line x1={0} y1={g.top} x2={g.W} y2={g.top} stroke="#E11D48" strokeWidth={sw} strokeDasharray={dash} />
      <line x1={0} y1={g.H - g.bottom} x2={g.W} y2={g.H - g.bottom} stroke="#E11D48" strokeWidth={sw} strokeDasharray={dash} />
      <rect x={g.safe.x} y={g.safe.y} width={g.safe.w} height={g.safe.h} fill="none" stroke="#2563EB" strokeWidth={sw * 0.7} strokeDasharray={dash} opacity={0.55} />
      {g.hole && <ellipse id={side === 'front' ? 'CutContourHole' : undefined} cx={g.hole.cx} cy={g.hole.cy} rx={g.hole.rx} ry={g.hole.ry} fill="none" stroke="#FF00FF" strokeWidth={sw} />}
      {win && <ellipse cx={win.x + win.w / 2} cy={win.y + win.h / 2} rx={win.w / 2 + 1} ry={win.h / 2 + 1} fill="none" stroke="#0EA5E9" strokeWidth={sw} strokeDasharray={dash} />}
      <g fontFamily={`'${BODY}'`} fontWeight={600} fontSize={fs} fill="#E11D48">
        <text x={g.W / 2} y={g.top - fs * 0.5} textAnchor="middle">{topLabel}</text>
        <text x={g.W / 2} y={g.H - g.bottom + fs * 1.3} textAnchor="middle">{botLabel}</text>
      </g>
    </g>
  );
}

// ---------- tờ file in trải phẳng ----------
/** bao PP: mặt trước | mặt sau (2 tấm). Túi có hông: [sau | hông | trước | hông] liền 1 dải + mép dán */
export function rbSheetDims(spec: RBSpec) {
  const g = rbGeom(spec);
  const gap = spec.kind === 'pp' ? 30 : 0;
  const glue = spec.kind === 'pp' ? 0 : 15;
  const panels = spec.kind === 'pp' ? [g.W, g.W] : [g.W, g.G, g.W, g.G];
  const W = panels.reduce((a, b) => a + b, 0) + gap * (panels.length - 1) + glue + RB_BLEED * 2;
  const H = g.H + RB_BLEED * 2 + 26;
  return { W, H, g, gap, glue, panels };
}
export function RBSheetSvg({ spec, data, logo, style }: { spec: RBSpec; data: RBData; logo?: string; style?: CSSProperties }) {
  const { W, H, g, gap, glue, panels } = rbSheetDims(spec);
  const c = colsOf(spec);
  const B = RB_BLEED, top = 18;
  const flexo = isFlexo(spec.kind);
  const sub = substrateOf(spec.kind);
  const kinds: ('back' | 'side' | 'front' | 'side2')[] = spec.kind === 'pp' ? ['front', 'back'] : ['back', 'side', 'front', 'side2'];
  let x = B;
  const items: ReactNode[] = [];
  const folds: ReactNode[] = [];
  const cuts: string[] = [];
  const sw = Math.max(0.35, g.W * 0.0016);
  kinds.forEach((k, i) => {
    const pw = panels[i];
    const isFace = k === 'front' || k === 'back';
    items.push(
      <g key={k} transform={`translate(${x} ${top + B})`}>
        {isFace
          ? <svg x={-B} y={-B} width={pw + B * 2} height={g.H + B * 2} viewBox={`${-B} ${-B} ${pw + B * 2} ${g.H + B * 2}`} overflow="hidden"><RBFaceInner spec={spec} data={data} side={k} logo={logo} /></svg>
          : <svg x={0} y={-B} width={pw} height={g.H + B * 2} viewBox={`0 ${-B} ${pw} ${g.H + B * 2}`} overflow="hidden"><rect x={0} y={-B} width={pw} height={g.H + B * 2} fill={c.printedBg ? c.bg : sub} opacity={c.printedBg ? 1 : 0.35} /><g id={i === 1 ? 'In-hong' : undefined}><Side spec={spec} data={data} g={g} c={c} mirror={k === 'side2'} /></g></svg>}
      </g>,
    );
    if (spec.kind === 'pp') cuts.push(`M${x},${top + B} h${pw} v${g.H} h${-pw} Z`);
    else if (i > 0) folds.push(<line key={`f${i}`} x1={x} y1={top + B} x2={x} y2={top + B + g.H} stroke="#0EA5E9" strokeWidth={sw} strokeDasharray={`${g.W * 0.015} ${g.W * 0.01}`} />);
    if (g.hole && k === 'front') cuts.push(`M${x + g.hole.cx - g.hole.rx},${top + B + g.hole.cy} a${g.hole.rx},${g.hole.ry} 0 1 0 ${g.hole.rx * 2},0 a${g.hole.rx},${g.hole.ry} 0 1 0 ${-g.hole.rx * 2},0Z`);
    if (g.hole && k === 'back') cuts.push(`M${x + g.hole.cx - g.hole.rx},${top + B + g.hole.cy} a${g.hole.rx},${g.hole.ry} 0 1 0 ${g.hole.rx * 2},0 a${g.hole.rx},${g.hole.ry} 0 1 0 ${-g.hole.rx * 2},0Z`);
    x += pw + (spec.kind === 'pp' ? gap : 0);
  });
  if (spec.kind !== 'pp') {
    // mép dán
    items.push(<rect key="glue" x={x} y={top + B} width={glue} height={g.H} fill={flexo ? 'none' : c.fill} opacity={0.25} stroke="#94A3B8" strokeWidth={sw} />);
    folds.push(<line key="fg" x1={x} y1={top + B} x2={x} y2={top + B + g.H} stroke="#0EA5E9" strokeWidth={sw} strokeDasharray={`${g.W * 0.015} ${g.W * 0.01}`} />);
    cuts.push(`M${B},${top + B} H${x + glue} V${top + B + g.H} H${B} Z`);
  }
  const fs = Math.max(3, g.W * 0.02);
  const s = rbSize(spec.size);
  const inkNote = flexo ? `${Math.min(spec.inks, maxInks(spec.kind))} màu flexo · nền ${spec.kind === 'kraft' ? 'giấy kraft' : 'bao trắng'} không in` : 'in đủ màu (ống đồng) · lề xén 3mm';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-rb-sheet={spec.kind} data-panels={kinds.length}>
      <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" />
      <g fontFamily={`'${BODY}'`} fontWeight={600} fontSize={fs} fill="#334155">
        <text x={B} y={fs * 1.4}>{`${RB_KINDS.find((k) => k.id === spec.kind)!.name} ${s.name} — ${inkNote}`}</text>
      </g>
      {items}
      <g id="Fold">{folds}</g>
      <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth={sw}>{cuts.map((d, i) => <path key={i} d={d} />)}</g>
    </svg>
  );
}
function RBFaceInner({ spec, data, side, logo }: { spec: RBSpec; data: RBData; side: 'front' | 'back'; logo?: string }) {
  const g = rbGeom(spec), c = colsOf(spec), B = RB_BLEED;
  const win = side === 'front' ? windowRect(spec, g) : null;
  const sub = substrateOf(spec.kind);
  return (
    <g>
      <rect x={-B} y={-B} width={g.W + B * 2} height={g.H + B * 2} fill={c.printedBg ? c.bg : sub} opacity={c.printedBg ? 1 : 0.35} data-ref={c.printedBg ? undefined : '1'} />
      <g data-rb-print={side}>
        {side === 'front' ? <Front spec={spec} data={data} g={g} c={c} logo={logo} /> : <Back spec={spec} data={data} g={g} c={c} />}
        {win && <ellipse cx={win.x + win.w / 2} cy={win.y + win.h / 2} rx={win.w / 2} ry={win.h / 2} fill="#FFFFFF" stroke="#0EA5E9" strokeWidth={0.5} data-rb-window="1" />}
      </g>
      <line x1={0} y1={g.top} x2={g.W} y2={g.top} stroke="#E11D48" strokeWidth={0.4} strokeDasharray="4 3" />
      <line x1={0} y1={g.H - g.bottom} x2={g.W} y2={g.H - g.bottom} stroke="#E11D48" strokeWidth={0.4} strokeDasharray="4 3" />
    </g>
  );
}
