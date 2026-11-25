'use client';
// Nhãn chai · hũ · lọ: 1 engine SVG (đơn vị mm) = VẬT CHỨA × KIỂU NHÃN × BỐ CỤC × BẢNG MÀU × CHẤT LIỆU.
// Mỗi vật chứa có kích thước thật → nhãn quấn = chu vi − khe hở; nhãn trước/sau; nhãn nắp tròn; nhãn cổ chai.
// Mặt trước = thiết kế bán hàng; vùng thông tin = THÔNG TIN BẮT BUỘC (NĐ 43/2017 & 111/2021): thành phần, HDSD,
// bảo quản, cảnh báo, xuất xứ, cơ sở sản xuất, số công bố, NSX/HSD/số lô (ô trống in phun sau), mã vạch EAN-13, QR.
// Render code 100% — không gọi AI theo request.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { ean13 } from './pouch-engine';
import { qrPath } from './flyer-qr';

export const LB_BLEED_MM = 2;
export const LB_SAFE_MM = 1.6;
export const LB_RADIUS_MM = 2;

// ---------- vật chứa (kích thước thật, mm) ----------
export type LBContainerId = 'pet500' | 'glass250' | 'glass500' | 'wine750' | 'jar500' | 'jarpl' | 'dropper30' | 'can330';
export interface LBContainer {
  id: LBContainerId; name: string; short: string;
  r: number;          // bán kính thân (đoạn thẳng dán nhãn)
  bandY: number;      // mép dưới vùng dán nhãn (từ đáy)
  bandH: number;      // chiều cao vùng dán nhãn tối đa
  gap: number;        // nhãn quấn: chu vi − dài nhãn (âm = chồng mí)
  neck?: { r: number; y: number; h: number };
  cap?: number;       // Ø nhãn nắp
  glass: 'clear' | 'amber' | 'green' | 'pet' | 'metal';
}
export const LB_CONTAINERS: LBContainer[] = [
  { id: 'pet500', name: 'Chai nhựa PET 500ml', short: 'PET 500ml', r: 32.5, bandY: 90, bandH: 58, gap: -8, glass: 'pet' },
  { id: 'glass250', name: 'Chai thuỷ tinh 250ml', short: 'Chai 250ml', r: 29, bandY: 20, bandH: 68, gap: 8, neck: { r: 12.5, y: 139, h: 11 }, glass: 'clear' },
  { id: 'glass500', name: 'Chai thuỷ tinh 500ml', short: 'Chai 500ml', r: 35, bandY: 28, bandH: 88, gap: 10, neck: { r: 14, y: 184, h: 15 }, glass: 'clear' },
  { id: 'wine750', name: 'Chai rượu 750ml', short: 'Chai rượu', r: 38, bandY: 42, bandH: 96, gap: 30, neck: { r: 14.7, y: 246, h: 14 }, glass: 'green' },
  { id: 'jar500', name: 'Hũ thuỷ tinh 500g (mật ong, mứt, yến)', short: 'Hũ 500g', r: 39, bandY: 14, bandH: 56, gap: 10, cap: 56, glass: 'clear' },
  { id: 'jarpl', name: 'Hũ nhựa nắp vặn 200g', short: 'Hũ nhựa', r: 34, bandY: 8, bandH: 40, gap: 8, cap: 56, glass: 'pet' },
  { id: 'dropper30', name: 'Lọ serum / tinh dầu 30ml', short: 'Lọ 30ml', r: 16, bandY: 9, bandH: 40, gap: 6, glass: 'amber' },
  { id: 'can330', name: 'Lon nhôm 330ml', short: 'Lon 330ml', r: 33, bandY: 12, bandH: 98, gap: -6, glass: 'metal' },
];
export const lbContainer = (id: string) => LB_CONTAINERS.find((c) => c.id === id) || LB_CONTAINERS[0];

export type LBStyle = 'wrap' | 'frontback';
export const LB_STYLES: { id: LBStyle; name: string }[] = [
  { id: 'wrap', name: 'Quấn quanh (1 nhãn)' }, { id: 'frontback', name: 'Nhãn trước + nhãn sau' },
];

export type LBPart = 'wrap' | 'front' | 'back' | 'cap' | 'neck';
export interface LBDims { w: number; h: number; round?: boolean }
/** kích thước thật từng nhãn theo vật chứa + kiểu */
export function partDims(spec: Pick<LBSpec, 'container' | 'style'>, part: LBPart): LBDims {
  const c = lbContainer(spec.container), circ = 2 * Math.PI * c.r;
  const r1 = (v: number) => Math.round(v * 2) / 2;
  if (part === 'wrap') return { w: r1(circ - c.gap), h: c.bandH };
  if (part === 'front') return { w: r1(circ * (c.r < 20 ? 0.44 : 0.34)), h: c.bandH };
  if (part === 'back') return { w: r1(circ * (c.r < 20 ? 0.4 : 0.32)), h: r1(c.bandH * 0.88) };
  if (part === 'cap') return { w: c.cap || 50, h: c.cap || 50, round: true };
  const n = c.neck || { r: 14, h: 14 };
  return { w: r1(2 * Math.PI * n.r - 2), h: n.h };
}
export function partsOf(spec: Pick<LBSpec, 'container' | 'style' | 'cap' | 'neck'>): LBPart[] {
  const c = lbContainer(spec.container);
  const out: LBPart[] = spec.style === 'wrap' ? ['wrap'] : ['front', 'back'];
  if (spec.cap && c.cap) out.push('cap');
  if (spec.neck && c.neck) out.push('neck');
  return out;
}
export const PART_NAME: Record<LBPart, string> = { wrap: 'Nhãn quấn', front: 'Nhãn trước', back: 'Nhãn sau', cap: 'Nhãn nắp', neck: 'Nhãn cổ chai' };

// ---------- chất liệu ----------
export type LBMaterial = 'paper' | 'milky' | 'clear' | 'kraft';
export const LB_MATERIALS: { id: LBMaterial; name: string; note: string }[] = [
  { id: 'paper', name: 'Decal giấy cán màng', note: 'Phổ biến, in màu đẹp' },
  { id: 'milky', name: 'Decal nhựa sữa', note: 'Chống nước, chai để lạnh' },
  { id: 'clear', name: 'Decal trong', note: 'Không nền, thấy sản phẩm' },
  { id: 'kraft', name: 'Decal kraft', note: 'Mộc, thủ công' },
];
export const KRAFT = '#C7A47A';

// ---------- ngành ----------
export type LBIndustry = 'honey' | 'fishsauce' | 'coldbrew' | 'nutmilk' | 'spice' | 'cosmetic' | 'liquor' | 'juice';
export const LB_INDUSTRIES: { id: LBIndustry; name: string; container: LBContainerId }[] = [
  { id: 'honey', name: 'Mật ong', container: 'jar500' },
  { id: 'fishsauce', name: 'Nước mắm', container: 'glass500' },
  { id: 'coldbrew', name: 'Cà phê cold brew', container: 'glass250' },
  { id: 'nutmilk', name: 'Sữa hạt', container: 'glass250' },
  { id: 'spice', name: 'Gia vị', container: 'jarpl' },
  { id: 'cosmetic', name: 'Mỹ phẩm handmade', container: 'dropper30' },
  { id: 'liquor', name: 'Rượu', container: 'wine750' },
  { id: 'juice', name: 'Nước ép', container: 'pet500' },
];
/** màu chất bên trong (3D) */
export const LIQUID: Record<LBIndustry, { color: string; opacity: number; grain?: boolean }> = {
  honey: { color: '#D98A16', opacity: 0.9 },
  fishsauce: { color: '#7A3410', opacity: 0.8 },
  coldbrew: { color: '#1C0E06', opacity: 0.97 },
  nutmilk: { color: '#EFE4CC', opacity: 0.98 },
  spice: { color: '#B5261B', opacity: 1, grain: true },
  cosmetic: { color: '#E7A93B', opacity: 0.75 },
  liquor: { color: '#F2E2A8', opacity: 0.4 },
  juice: { color: '#F59A1F', opacity: 0.93 },
};

// ---------- font (chỉ font có TTF ở /public/fonts → file in outline được) ----------
export interface LBFont { id: string; name: string; family: string; weight: number }
export const LB_FONTS: LBFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
];
export const lbFont = (id: string) => LB_FONTS.find((f) => f.id === id) || LB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';

export const LB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Prata&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useLBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-lb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-lb-fonts'; link.rel = 'stylesheet';
        link.href = LB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...LB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `700 40px "${SCRIPT}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface LBPalette { id: string; name: string; bg: string; fg: string; sub: string; paper: string; ink: string; accent: string; onAccent: string }
export const LB_PALETTES: LBPalette[] = [
  { id: 'honey', name: 'Mật vàng', bg: '#FFF4DA', fg: '#4A2A0A', sub: '#8A5A1E', paper: '#FFFBF0', ink: '#3A2208', accent: '#E0A01E', onAccent: '#3A2208' },
  { id: 'amber', name: 'Hổ phách', bg: '#3B2410', fg: '#FBE7BE', sub: '#E4B86A', paper: '#FFF7E8', ink: '#3B2410', accent: '#E7A93B', onAccent: '#3B2410' },
  { id: 'crimson', name: 'Đỏ truyền thống', bg: '#8E1B1B', fg: '#FFF2DC', sub: '#F2C88A', paper: '#FFF6E9', ink: '#4A0E0E', accent: '#E3B04B', onAccent: '#4A0E0E' },
  { id: 'noir', name: 'Đen cà phê', bg: '#1C1714', fg: '#F3E9DA', sub: '#C9A97C', paper: '#F7F1E8', ink: '#1C1714', accent: '#C9A15A', onAccent: '#1C1714' },
  { id: 'sage', name: 'Xanh xô thơm', bg: '#E5EDE0', fg: '#22382A', sub: '#56715E', paper: '#FAFCF7', ink: '#22382A', accent: '#6B9A70', onAccent: '#FFFFFF' },
  { id: 'chili', name: 'Ớt đỏ', bg: '#FFF1E6', fg: '#5A1208', sub: '#A8402A', paper: '#FFFFFF', ink: '#4A0F07', accent: '#D7381F', onAccent: '#FFFFFF' },
  { id: 'blush', name: 'Hồng phấn', bg: '#F7E3DE', fg: '#5A2E2B', sub: '#9A6660', paper: '#FFFAF8', ink: '#4A2522', accent: '#C27B6E', onAccent: '#FFFFFF' },
  { id: 'navy', name: 'Navy ánh kim', bg: '#14233F', fg: '#F2E6C8', sub: '#C9B47E', paper: '#FBF7EC', ink: '#14233F', accent: '#C9A24A', onAccent: '#14233F' },
  { id: 'citrus', name: 'Cam tươi', bg: '#FF9A2E', fg: '#FFFFFF', sub: '#FFF0D9', paper: '#FFFFFF', ink: '#3E2200', accent: '#2E8B3E', onAccent: '#FFFFFF' },
  { id: 'leaf', name: 'Lá non', bg: '#2F7A3E', fg: '#FFFFFF', sub: '#D8F0C9', paper: '#FFFFFF', ink: '#173D1F', accent: '#FFC93C', onAccent: '#173D1F' },
];
export const lbPalette = (id: string) => LB_PALETTES.find((p) => p.id === id) || LB_PALETTES[0];

const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };
export const isDarkHex = (hex: string) => lum(hex) < 128;

/** màu thực in theo chất liệu. bg = null → không in nền (decal trong). plate = nền ô thông tin (null = không in) */
export interface LBInk { bg: string | null; fg: string; sub: string; plate: string | null; ink: string; accent: string; onAccent: string; plateLine: string }
export function effInk(p: LBPalette, m: LBMaterial, white: boolean): LBInk {
  if (m === 'kraft') {
    const fg = isDarkHex(p.fg) ? p.fg : isDarkHex(p.bg) ? p.bg : '#2E1D10';
    const acc = isDarkHex(p.accent) || lum(p.accent) < 170 ? p.accent : '#5A3E22';
    return { bg: KRAFT, fg, sub: isDarkHex(p.sub) ? p.sub : '#5A3E22', plate: null, ink: fg, accent: acc, onAccent: isDarkHex(acc) ? '#F7EBD6' : '#2E1D10', plateLine: fg };
  }
  if (m === 'clear') {
    const fg = isDarkHex(p.fg) ? p.fg : isDarkHex(p.ink) ? p.ink : '#1F1A17';
    const acc = lum(p.accent) < 190 ? p.accent : fg;
    return { bg: null, fg, sub: isDarkHex(p.sub) ? p.sub : fg, plate: white ? '#FFFFFF' : null, ink: isDarkHex(p.ink) ? p.ink : fg, accent: acc, onAccent: isDarkHex(acc) ? '#FFFFFF' : '#1F1A17', plateLine: fg };
  }
  return { bg: p.bg, fg: p.fg, sub: p.sub, plate: p.paper, ink: p.ink, accent: p.accent, onAccent: p.onAccent, plateLine: p.accent };
}

// ---------- bố cục + mẫu ----------
export type LBLayout = 'medallion' | 'band' | 'minimal' | 'vintage' | 'pattern';
export const LB_LAYOUTS: { id: LBLayout; name: string }[] = [
  { id: 'medallion', name: 'Huy hiệu tròn' }, { id: 'band', name: 'Dải màu' }, { id: 'minimal', name: 'Tối giản' },
  { id: 'vintage', name: 'Cổ điển' }, { id: 'pattern', name: 'Hoạ tiết' },
];

export interface LBSpec {
  container: LBContainerId; style: LBStyle; layout: LBLayout; palette: string; font: string; industry: LBIndustry;
  material: LBMaterial; white: boolean; cap: boolean; neck: boolean;
}
export interface LBTemplate { id: string; name: string; spec: LBSpec; data?: Partial<LBData> }
const T = (id: string, name: string, industry: LBIndustry, layout: LBLayout, palette: string, font: string, container: LBContainerId,
  material: LBMaterial = 'paper', style: LBStyle = 'wrap', extra: Partial<LBSpec> = {}): LBTemplate => ({
  id, name, spec: { container, style, layout, palette, font, industry, material, white: false, cap: false, neck: false, ...extra },
});
export const LB_TEMPLATES: LBTemplate[] = [
  T('honey-medal', 'Mật ong · huy hiệu', 'honey', 'medallion', 'honey', 'playfair', 'jar500', 'paper', 'wrap', { cap: true }),
  T('honey-kraft', 'Mật ong · kraft mộc', 'honey', 'vintage', 'amber', 'cormorant', 'jar500', 'kraft', 'wrap', { cap: true }),
  T('fish-vintage', 'Nước mắm · cổ điển', 'fishsauce', 'vintage', 'crimson', 'prata', 'glass500', 'paper', 'frontback', { neck: true }),
  T('fish-band', 'Nước mắm · dải màu', 'fishsauce', 'band', 'crimson', 'oswald', 'glass500'),
  T('brew-minimal', 'Cold brew · tối giản', 'coldbrew', 'minimal', 'noir', 'montserrat', 'glass250'),
  { ...T('brew-can', 'Cold brew · lon', 'coldbrew', 'band', 'noir', 'oswald', 'can330'), data: { net: '330ml' } },
  T('nut-clear', 'Sữa hạt · decal trong', 'nutmilk', 'minimal', 'sage', 'montserrat', 'glass250', 'clear', 'frontback', { white: true }),
  { ...T('nut-medal', 'Sữa hạt · huy hiệu', 'nutmilk', 'medallion', 'sage', 'baloo', 'glass250'), data: { name: 'Sữa hạt óc chó', ingredients: 'Nước, hạt óc chó (10%), yến mạch, chà là.', warning: 'Sản phẩm có chứa hạt óc chó — người dị ứng hạt cần lưu ý.' } },
  T('spice-band', 'Gia vị · dải màu', 'spice', 'band', 'chili', 'baloo', 'jarpl', 'paper', 'wrap', { cap: true }),
  T('spice-kraft', 'Gia vị · hoạ tiết kraft', 'spice', 'pattern', 'chili', 'oswald', 'jarpl', 'kraft'),
  T('serum-minimal', 'Serum · tối giản', 'cosmetic', 'minimal', 'blush', 'cormorant', 'dropper30'),
  T('serum-pattern', 'Tinh dầu · hoạ tiết', 'cosmetic', 'pattern', 'sage', 'playfair', 'dropper30', 'milky'),
  T('liquor-vintage', 'Rượu · cổ điển ánh kim', 'liquor', 'vintage', 'navy', 'playfair', 'wine750', 'paper', 'frontback', { neck: true }),
  T('juice-pattern', 'Nước ép · hoạ tiết', 'juice', 'pattern', 'citrus', 'baloo', 'pet500', 'milky'),
  { ...T('juice-can', 'Nước ép · lon', 'juice', 'band', 'leaf', 'baloo', 'can330'), data: { net: '330ml', name: 'Nước ép táo xanh', tagline: 'Ép lạnh · 100% trái cây', ingredients: '100% nước ép táo xanh.' } },
];

// ---------- nội dung ----------
export type LBData = Record<string, string>;
export interface LBField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; info?: boolean }
export const LB_FIELDS: LBField[] = [
  { key: 'brand', label: 'Thương hiệu', half: true },
  { key: 'name', label: 'Tên sản phẩm', half: true },
  { key: 'tagline', label: 'Dòng mô tả ngắn', half: true },
  { key: 'net', label: 'Dung tích / khối lượng tịnh', half: true, ph: 'NET 500g' },
  { key: 'badge', label: 'Nhãn nổi bật', half: true, ph: '100% NGUYÊN CHẤT' },
  { key: 'since', label: 'Dòng nhỏ (năm, vùng…)', half: true, ph: 'Từ 2018' },
  { key: 'ingredients', label: 'Thành phần', multiline: true, info: true },
  { key: 'usage', label: 'Hướng dẫn sử dụng', multiline: true, info: true },
  { key: 'storage', label: 'Bảo quản', multiline: true, info: true },
  { key: 'warning', label: 'Cảnh báo (nếu có)', multiline: true, info: true },
  { key: 'origin', label: 'Xuất xứ', half: true, info: true },
  { key: 'regno', label: 'Số tự công bố', half: true, info: true },
  { key: 'maker', label: 'Cơ sở sản xuất (tên + địa chỉ)', multiline: true, info: true },
  { key: 'phone', label: 'Hotline', half: true, info: true },
  { key: 'website', label: 'Website / fanpage (tạo mã QR)', half: true, info: true },
  { key: 'barcode', label: 'Mã vạch (12 số đầu, tự tính số cuối)', half: true, info: true, ph: '893612345678' },
];

const COMMON = { origin: 'Việt Nam', phone: '0909 123 456' };
export const LB_SAMPLES: Record<LBIndustry, LBData> = {
  honey: {
    ...COMMON, brand: 'AN KHANG', name: 'Mật ong hoa cà phê', tagline: 'Nguyên chất từ cao nguyên Đắk Lắk', net: 'NET 500g', badge: '100% NGUYÊN CHẤT', since: 'Từ 2018',
    ingredients: '100% mật ong hoa cà phê.', usage: 'Dùng trực tiếp 1–2 thìa mỗi ngày hoặc pha nước ấm với chanh. Không dùng cho trẻ dưới 1 tuổi.',
    storage: 'Nơi khô ráo, thoáng mát, tránh ánh nắng. Mật kết tinh là hiện tượng tự nhiên.', warning: '',
    maker: 'Hộ kinh doanh An Khang — 12 Lê Duẩn, TP. Buôn Ma Thuột, Đắk Lắk', regno: '01/AK/2026', website: 'ankhang.vn', barcode: '893612345678',
  },
  fishsauce: {
    ...COMMON, brand: 'THU HÀ', name: 'Nước mắm cá cơm', tagline: 'Ủ chượp truyền thống 12 tháng', net: '500ml', badge: '40° ĐẠM', since: 'Phú Quốc',
    ingredients: 'Cá cơm (70%), muối biển (30%).', usage: 'Dùng chấm trực tiếp hoặc nêm nếm món ăn. Lắc nhẹ trước khi dùng.',
    storage: 'Đậy kín nắp sau khi dùng, để nơi thoáng mát. Có thể có kết tinh muối ở đáy chai.', warning: '',
    maker: 'Cơ sở nước mắm Thu Hà — Khu phố 3, Dương Đông, Phú Quốc, Kiên Giang', regno: '02/TH/2026', website: 'nuocmamthuha.vn', barcode: '893612340012',
  },
  coldbrew: {
    ...COMMON, brand: 'QUỐC BẢO COFFEE', name: 'Cold Brew Robusta', tagline: 'Ủ lạnh 18 giờ · vị êm, hậu ngọt', net: '250ml', badge: 'KHÔNG ĐƯỜNG', since: 'Rang mộc',
    ingredients: 'Nước tinh khiết, cà phê Robusta Lâm Đồng rang mộc.', usage: 'Lắc đều, dùng lạnh hoặc thêm sữa. Dùng hết trong 5 ngày sau khi mở nắp.',
    storage: 'Bảo quản lạnh 2–6°C.', warning: '',
    maker: 'Quốc Bảo Coffee — 45 Pasteur, Q.1, TP.HCM', regno: '03/QB/2026', website: 'quocbaocoffee.vn', barcode: '893612340029',
  },
  nutmilk: {
    ...COMMON, brand: 'GIA KHÁNH', name: 'Sữa hạt điều', tagline: 'Nấu mới mỗi ngày · không chất bảo quản', net: '250ml', badge: 'THUẦN CHAY', since: 'Handmade',
    ingredients: 'Nước, hạt điều Bình Phước (12%), chà là, muối hồng.', usage: 'Lắc đều trước khi uống. Ngon hơn khi uống lạnh.',
    storage: 'Bảo quản lạnh 2–6°C, dùng trong 3 ngày.', warning: 'Sản phẩm có chứa hạt điều — người dị ứng hạt cần lưu ý.',
    maker: 'Bếp Gia Khánh — 8 Nguyễn Trãi, Q.5, TP.HCM', regno: '04/GK/2026', website: 'suahatgiakhanh.vn', barcode: '893612340036',
  },
  spice: {
    ...COMMON, brand: 'BẾP THU HÀ', name: 'Muối ớt Tây Ninh', tagline: 'Cay nồng · đậm vị · chấm trái cây', net: 'NET 200g', badge: 'ĐẶC SẢN', since: 'Tây Ninh',
    ingredients: 'Muối, ớt, tỏi, đường, bột ngọt.', usage: 'Chấm trái cây, đồ nướng hoặc ướp thực phẩm.',
    storage: 'Đậy kín nắp, để nơi khô ráo.', warning: '',
    maker: 'Cơ sở Bếp Thu Hà — 21 Trưng Nữ Vương, TP. Tây Ninh', regno: '05/TH/2026', website: 'bepthuha.vn', barcode: '893612340043',
  },
  cosmetic: {
    ...COMMON, brand: 'AN KHANG', name: 'Serum bưởi dưỡng tóc', tagline: 'Tinh dầu vỏ bưởi nguyên chất', net: '30ml', badge: 'HANDMADE', since: 'Thuần chay',
    ingredients: 'Tinh dầu vỏ bưởi, dầu dừa, vitamin E.', usage: 'Thoa 3–5 giọt lên da đầu, massage nhẹ 3 phút.',
    storage: 'Nơi thoáng mát, tránh ánh nắng.', warning: 'Chỉ dùng ngoài da. Tránh tiếp xúc với mắt.',
    maker: 'An Khang Handmade — 3 Hai Bà Trưng, TP. Đà Lạt', regno: '06/AK/2026', website: 'ankhang.vn', barcode: '893612340050',
  },
  liquor: {
    ...COMMON, brand: 'QUỐC BẢO', name: 'Rượu nếp cái hoa vàng', tagline: 'Nấu thủ công · ủ chum sành', net: '750ml · 29% vol', badge: '29% VOL', since: 'Từ 1998',
    ingredients: 'Gạo nếp cái hoa vàng, men lá, nước.', usage: 'Uống trực tiếp, ngon hơn khi để mát.',
    storage: 'Để nơi thoáng mát, tránh ánh nắng.', warning: 'Không dành cho người dưới 18 tuổi và phụ nữ mang thai. Đã uống rượu bia không lái xe.',
    maker: 'Hộ sản xuất Quốc Bảo — Thôn Đông, Kinh Môn, Hải Dương', regno: '07/QB/2026', website: 'ruouquocbao.vn', barcode: '893612340067',
  },
  juice: {
    ...COMMON, brand: 'TIỆM THU HÀ', name: 'Nước ép cam tươi', tagline: 'Ép lạnh mỗi sáng · 100% trái cây', net: '500ml', badge: 'KHÔNG ĐƯỜNG', since: 'Ép lạnh',
    ingredients: '100% nước ép cam sành.', usage: 'Lắc đều, dùng ngay sau khi mở nắp.',
    storage: 'Bảo quản lạnh 2–6°C, dùng trong 48 giờ.', warning: '',
    maker: 'Tiệm Thu Hà — 90 Võ Văn Tần, Q.3, TP.HCM', regno: '08/TH/2026', website: 'tiemthuha.vn', barcode: '893612340074',
  },
};
export const defaultLBData = (ind: LBIndustry = 'honey'): LBData => ({ ...LB_SAMPLES[ind] });
export const templateData = (t: LBTemplate): LBData => ({ ...LB_SAMPLES[t.spec.industry], ...(t.data || {}) } as LBData);

// ---------- đo chữ thật (mm) ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
function tw(t: string, size: number, ts: TS): number {
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
      if (!cur || tw(next, size, ts) <= maxW) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** co chữ tới khi ≤ maxLines dòng và vừa bề rộng; cân dòng tránh chữ mồ côi */
function fitText(text: string, maxW: number, size: number, ts: TS, maxLines: number, minSize = 0.5) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  const tooWide = () => lines.some((l) => tw(l, s, ts) > maxW + 0.01);
  while ((lines.length > maxLines || tooWide()) && s > minSize) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.4, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  const widest = Math.max(0, ...lines.map((l) => tw(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
const ASC = 0.98, DESC = 0.32;

// ---------- STACK: xếp khối dọc, tự co cho vừa ô ----------
type Item =
  | { k: 'text'; text: string; ts: TS; size: number; color: string; maxLines?: number; lh?: number; min?: number; wFrac?: number }
  | { k: 'art'; h: number; render: (cx: number, cy: number, h: number) => ReactNode }
  | { k: 'gap'; h: number; flex?: boolean }
  | { k: 'rule'; w: number; color: string; diamond?: boolean }
  | { k: 'pill'; text: string; size: number; bg: string; fg: string };
interface Box { x: number; y: number; w: number; h: number }
function Stack({ box, items, anchor = 'middle' }: { box: Box; items: Item[]; anchor?: 'middle' | 'start' }) {
  const list = items.filter((it) => !(it.k === 'text' || it.k === 'pill') || (it.text || '').trim());
  type Laid = { it: Item; h: number; lines?: string[]; size?: number };
  const lay = (s: number): { laid: Laid[]; total: number; flex: number } => {
    const laid: Laid[] = []; let total = 0, flex = 0;
    for (const it of list) {
      if (it.k === 'text') {
        const maxW = box.w * (it.wFrac ?? 1);
        const f = fitText(it.text, maxW, it.size * s, it.ts, it.maxLines ?? 2, (it.min ?? 0.9));
        const h = f.size * (ASC + DESC) + (f.lines.length - 1) * f.size * (it.lh ?? 1.12);
        laid.push({ it, h, lines: f.lines, size: f.size }); total += h;
      } else if (it.k === 'art') { const h = it.h * s; laid.push({ it, h }); total += h; }
      else if (it.k === 'gap') { const h = it.h * s; laid.push({ it, h }); total += h; if (it.flex) flex++; }
      else if (it.k === 'rule') { const h = 1.2 * s; laid.push({ it, h }); total += h; }
      else { const size = it.size * s; const f = fitText(it.text, box.w * 0.9 - size * 1.6, size, { fam: BODY, wt: 800, ls: 0.08 }, 1, 0.9); const h = f.size * 2.1; laid.push({ it, h, size: f.size, lines: f.lines }); total += h; }
    }
    return { laid, total, flex };
  };
  let s = 1, res = lay(1);
  while (res.total > box.h && s > 0.3) { s *= 0.95; res = lay(s); }
  const extra = Math.max(0, box.h - res.total);
  const flexAdd = res.flex ? extra / res.flex : 0;
  let y = box.y + (res.flex ? 0 : extra / 2);
  const ax = anchor === 'middle' ? box.x + box.w / 2 : box.x;
  const out: ReactNode[] = [];
  res.laid.forEach((L, i) => {
    const it = L.it;
    if (it.k === 'text') {
      out.push(
        <g key={i} fontFamily={`"${it.ts.fam}"`} fontWeight={it.ts.wt} fontSize={L.size} fill={it.color} textAnchor={anchor} letterSpacing={it.ts.ls ? it.ts.ls * L.size! : undefined}>
          {L.lines!.map((l, j) => <text key={j} x={ax} y={y + L.size! * ASC + j * L.size! * (it.lh ?? 1.12)}>{l}</text>)}
        </g>,
      );
    } else if (it.k === 'art') out.push(<g key={i}>{it.render(box.x + box.w / 2, y + L.h / 2, L.h)}</g>);
    else if (it.k === 'rule') {
      const w = Math.min(it.w * s, box.w), x0 = anchor === 'middle' ? ax - w / 2 : ax, cy = y + L.h / 2;
      out.push(
        <g key={i}>
          <line x1={x0} y1={cy} x2={x0 + w} y2={cy} stroke={it.color} strokeWidth={0.28} />
          {it.diamond && <path d={`M${x0 + w / 2 - 1.1},${cy} L${x0 + w / 2},${cy - 1.1} L${x0 + w / 2 + 1.1},${cy} L${x0 + w / 2},${cy + 1.1} Z`} fill={it.color} />}
        </g>,
      );
    } else if (it.k === 'pill') {
      const size = L.size!, tx = L.lines![0] || '', w = tw(tx, size, { fam: BODY, wt: 800, ls: 0.08 }) + size * 1.6, ph = size * 1.7;
      const x0 = anchor === 'middle' ? ax - w / 2 : ax;
      out.push(
        <g key={i}>
          <rect x={x0} y={y + (L.h - ph) / 2} width={w} height={ph} rx={ph / 2} fill={it.bg} />
          <text x={x0 + w / 2} y={y + L.h / 2 + size * 0.35} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={size} letterSpacing={0.08 * size} fill={it.fg}>{tx}</text>
        </g>,
      );
    }
    y += L.h + (it.k === 'gap' && it.flex ? flexAdd : 0);
  });
  return <g>{out}</g>;
}

// ---------- hình minh hoạ theo ngành (vẽ code, hộp [-1,1]) ----------
function Motif({ ind, color, detail }: { ind: LBIndustry; color: string; detail: string }) {
  const sw = 0.07;
  switch (ind) {
    case 'honey': return (
      <g>
        {[[-0.48, 0.42], [0, 0.42], [0.48, 0.42], [-0.24, 0.0], [0.24, 0.0]].map(([x, y], i) => (
          <path key={i} d={`M${x - 0.24},${y} L${x - 0.12},${y - 0.21} L${x + 0.12},${y - 0.21} L${x + 0.24},${y} L${x + 0.12},${y + 0.21} L${x - 0.12},${y + 0.21} Z`} fill={i === 1 ? color : 'none'} stroke={color} strokeWidth={sw} opacity={i === 1 ? 0.85 : 1} />
        ))}
        <g transform="translate(0.1 -0.5) rotate(-18)">
          <ellipse cx={-0.28} cy={-0.22} rx={0.2} ry={0.12} fill="none" stroke={detail} strokeWidth={sw * 0.8} transform="rotate(-30 -0.28 -0.22)" />
          <ellipse cx={0.02} cy={-0.24} rx={0.2} ry={0.12} fill="none" stroke={detail} strokeWidth={sw * 0.8} transform="rotate(30 0.02 -0.24)" />
          <ellipse cx={-0.12} cy={0} rx={0.3} ry={0.2} fill={color} />
          <path d="M-0.24,-0.18 L-0.24,0.18 M-0.08,-0.2 L-0.08,0.2 M0.06,-0.17 L0.06,0.17" stroke={detail} strokeWidth={sw} />
          <circle cx={0.2} cy={0} r={0.1} fill={detail} />
        </g>
      </g>
    );
    case 'fishsauce': return (
      <g>
        <path d="M-0.9,0 C-0.5,-0.42 0.25,-0.42 0.55,0 C0.25,0.42 -0.5,0.42 -0.9,0 Z" fill={color} />
        <path d="M0.5,0 L0.92,-0.32 L0.86,0 L0.92,0.32 Z" fill={color} />
        <circle cx={-0.6} cy={-0.06} r={0.06} fill={detail} />
        <path d="M-0.35,-0.18 C-0.25,-0.05 -0.25,0.05 -0.35,0.18" stroke={detail} strokeWidth={sw * 0.8} fill="none" />
        <path d="M-0.95,0.62 C-0.7,0.5 -0.5,0.74 -0.25,0.62 C0,0.5 0.2,0.74 0.45,0.62 C0.7,0.5 0.85,0.7 0.95,0.62" stroke={color} strokeWidth={sw} fill="none" />
        <path d="M-0.8,0.84 C-0.55,0.72 -0.35,0.94 -0.1,0.84 C0.15,0.72 0.35,0.94 0.6,0.84" stroke={color} strokeWidth={sw} fill="none" opacity={0.7} />
      </g>
    );
    case 'coldbrew': return (
      <g>
        {[[-0.34, 0.1, -25], [0.34, -0.05, 20]].map(([x, y, r], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
            <ellipse rx={0.32} ry={0.48} fill={color} />
            <path d="M0,-0.42 C0.18,-0.15 -0.18,0.15 0,0.42" stroke={detail} strokeWidth={sw} fill="none" strokeLinecap="round" />
          </g>
        ))}
        <path d="M0,-0.95 C0.16,-0.72 0.22,-0.6 0.22,-0.52 A0.22,0.22 0 0 1 -0.22,-0.52 C-0.22,-0.6 -0.16,-0.72 0,-0.95 Z" fill={color} opacity={0.8} />
      </g>
    );
    case 'nutmilk': return (
      <g>
        <path d="M-0.55,-0.1 C-0.75,-0.65 -0.15,-0.95 0.1,-0.6 C0.3,-0.3 0.05,0.05 -0.2,0.12 C-0.35,0.16 -0.5,0.05 -0.55,-0.1 Z" fill={color} />
        <path d="M-0.4,-0.2 C-0.42,-0.5 -0.15,-0.7 0,-0.55" stroke={detail} strokeWidth={sw * 0.8} fill="none" opacity={0.6} />
        <path d="M0.1,0.95 C-0.35,0.95 -0.5,0.6 -0.25,0.35 C-0.05,0.15 0.05,0.0 0.25,-0.2 C0.45,0.05 0.75,0.35 0.55,0.7 C0.45,0.88 0.3,0.95 0.1,0.95 Z" fill="none" stroke={color} strokeWidth={sw} />
        <circle cx={0.62} cy={-0.42} r={0.08} fill={color} /><circle cx={0.8} cy={-0.18} r={0.05} fill={color} />
      </g>
    );
    case 'spice': return (
      <g>
        <path d="M-0.75,0.7 C-0.35,0.75 0.25,0.35 0.5,-0.25 C0.58,-0.45 0.45,-0.55 0.32,-0.4 C0.05,0.05 -0.4,0.35 -0.75,0.4 C-0.92,0.45 -0.92,0.68 -0.75,0.7 Z" fill={color} />
        <path d="M0.4,-0.36 C0.45,-0.6 0.62,-0.72 0.8,-0.7" stroke={detail} strokeWidth={sw * 1.3} fill="none" strokeLinecap="round" />
        <g transform="translate(0.45 0.45) scale(0.42)">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M0,0 L0.25,-0.9 L-0.25,-0.9 Z" fill={detail} transform={`rotate(${a})`} />)}
          <circle r={0.22} fill={color} />
        </g>
      </g>
    );
    case 'cosmetic': return (
      <g>
        <path d="M0,0.95 C0,0.3 0,-0.3 0.05,-0.95" stroke={color} strokeWidth={sw} fill="none" />
        {[[-1, -0.55], [1, -0.3], [-1, -0.02], [1, 0.25], [-1, 0.5]].map(([side, y], i) => (
          <path key={i} d={`M0.02,${y} C${side * 0.25},${y - 0.25} ${side * 0.6},${y - 0.18} ${side * 0.62},${y - 0.05} C${side * 0.45},${y + 0.08} ${side * 0.2},${y + 0.08} 0.02,${y} Z`} fill={color} opacity={0.9} />
        ))}
        <path d="M0.6,0.35 C0.68,0.5 0.72,0.58 0.72,0.65 A0.12,0.12 0 0 1 0.48,0.65 C0.48,0.58 0.52,0.5 0.6,0.35 Z" fill={detail} />
      </g>
    );
    case 'liquor': return (
      <g>
        <path d="M0,0.95 C0.05,0.4 0.1,-0.2 0.3,-0.8" stroke={color} strokeWidth={sw} fill="none" />
        {Array.from({ length: 7 }, (_, i) => {
          const t = i / 6, x = 0.02 + t * 0.26, y = 0.35 - t * 1.1;
          return <g key={i}>
            <ellipse cx={x - 0.12} cy={y} rx={0.08} ry={0.15} fill={color} transform={`rotate(-30 ${x - 0.12} ${y})`} />
            <ellipse cx={x + 0.13} cy={y - 0.05} rx={0.08} ry={0.15} fill={color} transform={`rotate(30 ${x + 0.13} ${y - 0.05})`} />
          </g>;
        })}
        <path d="M0.02,0.55 C-0.3,0.5 -0.6,0.62 -0.75,0.85" stroke={color} strokeWidth={sw * 0.9} fill="none" />
      </g>
    );
    default: return (
      <g>
        <circle r={0.78} fill={color} />
        <circle r={0.66} fill={detail} opacity={0.9} />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d="M0,0 L0.2,-0.6 A0.63,0.63 0 0 1 -0.2,-0.6 Z" fill={color} opacity={0.55} transform={`rotate(${i * 45 + 22.5}) scale(0.95)`} />)}
        <circle r={0.08} fill={detail} />
        <path d="M0.4,-0.72 C0.6,-1 0.9,-0.95 0.95,-0.8 C0.75,-0.7 0.55,-0.7 0.4,-0.72 Z" fill="#3E8E41" />
      </g>
    );
  }
}

// ---------- mã vạch EAN-13 ----------
/** khối mã vạch rộng w (mm); trả về chiều cao */
export const barcodeH = (w: number) => w * 0.62;
function Barcode({ x, y, w, code }: { x: number; y: number; w: number; code: string }) {
  const { digits, bits } = ean13(code);
  const m = w / 113, qz = m * 9;
  const bh = m * 55, guard = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  const rects: ReactNode[] = [];
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') rects.push(<rect key={i} x={x + qz + i * m} y={y + m * 3} width={m} height={guard.has(i) ? bh + m * 5 : bh} fill="#111111" />);
  const fs = m * 8.5;
  return (
    <g data-barcode={digits}>
      <rect x={x} y={y} width={w} height={barcodeH(w)} fill="#FFFFFF" rx={m * 2} />
      {rects}
      <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill="#111111" textAnchor="middle">
        <text x={x + qz - m * 4} y={y + m * 3 + bh + m * 9.5}>{digits[0]}</text>
        <text x={x + qz + m * 24} y={y + m * 3 + bh + m * 9.5} letterSpacing={m * 2.2}>{digits.slice(1, 7)}</text>
        <text x={x + qz + m * 71} y={y + m * 3 + bh + m * 9.5} letterSpacing={m * 2.2}>{digits.slice(7)}</text>
      </g>
    </g>
  );
}
function QR({ x, y, s, text, color }: { x: number; y: number; s: number; text: string; color: string }) {
  const { d, n } = qrPath(text || 'mivy.vn');
  const q = s / (n + 2);
  return (
    <g data-qr="1">
      <rect x={x} y={y} width={s} height={s} fill="#FFFFFF" />
      <path d={d} transform={`translate(${x + q} ${y + q}) scale(${q})`} fill={color} />
    </g>
  );
}

// ---------- vùng thông tin bắt buộc ----------
type Tok = { t: string; b: boolean };
function infoSections(data: LBData): Tok[][] {
  const S: [string, string][] = [
    ['Thành phần', data.ingredients], ['HDSD', data.usage], ['Bảo quản', data.storage], ['Cảnh báo', data.warning],
    ['Xuất xứ', data.origin], ['Sản xuất tại', data.maker], ['Số công bố', data.regno], ['Hotline', data.phone],
  ];
  return S.filter(([, v]) => (v || '').trim()).map(([h, v]) => [
    ...`${h}:`.split(' ').map((t) => ({ t, b: true })),
    ...v.replace(/\s+/g, ' ').trim().split(' ').map((t) => ({ t, b: false })),
  ]);
}
function layInfo(secs: Tok[][], maxW: number, size: number) {
  const B: TS = { fam: BODY, wt: 800 }, N: TS = { fam: BODY, wt: 600 };
  const sp = tw(' ', size, N);
  const lines: Tok[][] = [];
  for (const sec of secs) {
    let cur: Tok[] = [], w = 0;
    for (const tok of sec) {
      const tw0 = tw(tok.t, size, tok.b ? B : N);
      if (cur.length && w + sp + tw0 > maxW) { lines.push(cur); cur = []; w = 0; }
      w += (cur.length ? sp : 0) + tw0; cur.push(tok);
    }
    if (cur.length) lines.push(cur);
  }
  return lines;
}
function InfoText({ box, data, color, accent }: { box: Box; data: LBData; color: string; accent: string }) {
  const secs = infoSections(data);
  if (!secs.length || box.w < 6 || box.h < 4) return null;
  const LH = 1.24;
  // cỡ lớn nhất mà toàn bộ vừa ô (1.0–2.4mm)
  let lo = 0.85, hi = Math.min(2.4, box.h / 3);
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2, n = layInfo(secs, box.w, mid).length;
    if (n * mid * LH + mid * 0.3 <= box.h) lo = mid; else hi = mid;
  }
  const size = lo, lines = layInfo(secs, box.w, size);
  const maxN = Math.max(1, Math.floor((box.h - size * 0.3) / (size * LH)));
  return (
    <g fontFamily={`"${BODY}"`} fontSize={size} fill={color} data-info="1">
      {lines.slice(0, maxN).map((ln, i) => (
        <text key={i} x={box.x} y={box.y + size * ASC + i * size * LH} fontWeight={600}>
          {ln.map((tok, j) => (
            <tspan key={j} fontWeight={tok.b ? 800 : 600} fill={tok.b ? accent : color}>{(j ? ' ' : '') + tok.t}</tspan>
          ))}
        </text>
      ))}
    </g>
  );
}
/** NSX / HSD / Số lô (ô trống) + mã vạch + QR — tự xếp ngang/dọc theo ô */
function InfoCodes({ box, data, color }: { box: Box; data: LBData; color: string }) {
  if (box.w < 8 || box.h < 6) return null;
  const qrText = data.website ? (/^https?:/.test(data.website) ? data.website : `https://${data.website}`) : data.phone ? `tel:${data.phone.replace(/\s/g, '')}` : '';
  const wide = box.w > box.h * 1.6;
  const rowH = Math.min(4.2, Math.max(2.6, box.h * (wide ? 0.26 : 0.09)));
  const fs = rowH * 0.5;
  const Dates = ({ x, y, w }: { x: number; y: number; w: number }) => (
    <g fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={color}>
      {['NSX:', 'HSD:', 'Số lô:'].map((l, i) => {
        const ly = y + i * rowH, lw = tw('Số lô:', fs, { fam: BODY, wt: 800 }) + fs * 0.5;
        return (
          <g key={l}>
            <text x={x} y={ly + rowH * 0.68}>{l}</text>
            <rect x={x + lw} y={ly + rowH * 0.12} width={Math.max(2, w - lw)} height={rowH * 0.74} fill="none" stroke={color} strokeWidth={0.18} rx={0.4} />
          </g>
        );
      })}
    </g>
  );
  const datesH = rowH * 3;
  if (wide) {
    // [ngày] [mã vạch] [QR]
    let bw = Math.min(37.3, box.w * 0.42, box.h / 0.62);
    let q = qrText ? Math.min(box.h, box.w * 0.2, 18) : 0;
    let dw = box.w - bw - q - 4;
    if (dw < 16) { q = 0; dw = box.w - bw - 2; }
    if (dw < 16) { bw = Math.max(0, box.w - 18); dw = 16; }
    const by = box.y + (box.h - barcodeH(bw)) / 2;
    return (
      <g>
        <Dates x={box.x} y={box.y + (box.h - datesH) / 2} w={dw} />
        {bw >= 18 && <Barcode x={box.x + dw + 2} y={by} w={bw} code={data.barcode} />}
        {q > 6 && <QR x={box.x + box.w - q} y={box.y + (box.h - q) / 2} s={q} text={qrText} color={color} />}
      </g>
    );
  }
  // dọc: ngày → mã vạch → QR
  let bw = Math.min(37.3, box.w);
  let q = qrText ? Math.min(box.w * 0.62, 16) : 0;
  const need = () => datesH + 1.5 + (bw >= 18 ? barcodeH(bw) : 0) + (q > 6 ? q + 1.5 : 0);
  while (need() > box.h && q > 6) q = q - 1 < 7 ? 0 : q - 1;
  while (need() > box.h && bw > 18) bw -= 1;
  if (need() > box.h) bw = 0;
  const top = box.y + Math.max(0, (box.h - need()) / 2);
  const cx = box.x + box.w / 2;
  return (
    <g>
      <Dates x={box.x} y={top} w={box.w} />
      {bw >= 18 && <Barcode x={cx - bw / 2} y={top + datesH + 1.5} w={bw} code={data.barcode} />}
      {q > 6 && <QR x={cx - q / 2} y={top + datesH + 1.5 + (bw >= 18 ? barcodeH(bw) + 1.5 : 0)} s={q} text={qrText} color={color} />}
    </g>
  );
}
/** ô thông tin có nền (plate) — nền giấy/trắng lót; decal trong không lót thì chỉ có viền mảnh */
function Plate({ box, ink, children }: { box: Box; ink: LBInk; children: ReactNode }) {
  return (
    <g>
      {ink.plate
        ? <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={1.2} fill={ink.plate} data-plate="1" />
        : <rect x={box.x} y={box.y} width={box.w} height={box.h} rx={1.2} fill="none" stroke={ink.plateLine} strokeWidth={0.2} opacity={0.6} />}
      {children}
    </g>
  );
}

// ---------- hình ảnh / logo khách ----------
export interface LBImage { href: string; w: number; h: number }
function ArtDisc({ cx, cy, d, ind, ink, photo, ring = true }: { cx: number; cy: number; d: number; ind: LBIndustry; ink: LBInk; photo?: LBImage | null; ring?: boolean }) {
  const id = `lbclip-${Math.round(cx * 10)}-${Math.round(cy * 10)}-${Math.round(d * 10)}`;
  const r = d / 2;
  const disc = ink.bg && isDarkHex(ink.bg) ? ink.accent : ink.accent;
  return (
    <g>
      {photo ? (
        <>
          <clipPath id={id}><circle cx={cx} cy={cy} r={r * 0.92} /></clipPath>
          <image href={photo.href} x={cx - r} y={cy - r} width={d} height={d} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
        </>
      ) : (
        <>
          <circle cx={cx} cy={cy} r={r * 0.92} fill={disc} opacity={0.16} />
          <g transform={`translate(${cx} ${cy}) scale(${r * 0.62})`}><Motif ind={ind} color={disc} detail={ink.fg} /></g>
        </>
      )}
      {ring && <circle cx={cx} cy={cy} r={r * 0.97} fill="none" stroke={ink.accent} strokeWidth={Math.max(0.25, d * 0.02)} />}
    </g>
  );
}
function Logo({ cx, cy, h, logo }: { cx: number; cy: number; h: number; logo: LBImage }) {
  const w = (h * logo.w) / Math.max(1, logo.h);
  return <image href={logo.href} x={cx - w / 2} y={cy - h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" data-logo="1" />;
}

// ---------- MẶT TRƯỚC (vùng box) ----------
interface Ctx { spec: LBSpec; data: LBData; ink: LBInk; logo?: LBImage | null; photo?: LBImage | null }
function FrontPanel({ box, c }: { box: Box; c: Ctx }) {
  const { spec, data, ink } = c;
  const f = lbFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight };
  const bodyB: TS = { fam: BODY, wt: 800, ls: 0.14 };
  const body: TS = { fam: BODY, wt: 600 };
  const script: TS = { fam: SCRIPT, wt: 700 };
  const H = box.h, W = box.w;
  const pad = Math.max(LB_SAFE_MM + 0.6, Math.min(W, H) * 0.07, spec.layout === 'minimal' ? W * 0.1 : 0);
  const inner: Box = { x: box.x + pad, y: box.y + pad, w: W - pad * 2, h: H - pad * 2 };
  const unit = Math.min(H, W * 1.15);
  const artD = Math.min(inner.w * 0.5, H * 0.3);
  const art = (d: number): Item => ({
    k: 'art', h: d,
    render: (cx, cy, h) => c.logo && !c.photo ? <Logo cx={cx} cy={cy} h={h * 0.86} logo={c.logo} /> : <ArtDisc cx={cx} cy={cy} d={h} ind={spec.industry} ink={ink} photo={c.photo} />,
  });
  const brandItem = (color: string, scale = 1): Item => ({ k: 'text', text: (data.brand || '').toUpperCase(), ts: bodyB, size: unit * 0.065 * scale, color, maxLines: 1 });
  const nameItem = (color: string, scale = 1, maxLines = 3): Item => ({ k: 'text', text: data.name || '', ts: disp, size: unit * 0.15 * scale, color, maxLines, lh: 1.05 });

  if (spec.layout === 'medallion') {
    return (
      <Stack box={inner} items={[
        { k: 'text', text: (data.since || '').toUpperCase(), ts: { fam: BODY, wt: 800, ls: 0.25 }, size: unit * 0.045, color: ink.sub, maxLines: 1 },
        { k: 'gap', h: unit * 0.02 },
        brandItem(ink.fg),
        { k: 'gap', h: unit * 0.035 },
        art(artD),
        { k: 'gap', h: unit * 0.04 },
        nameItem(ink.fg),
        { k: 'text', text: data.tagline || '', ts: script, size: unit * 0.075, color: ink.sub, maxLines: 2 },
        { k: 'gap', h: unit * 0.03 },
        { k: 'rule', w: inner.w * 0.5, color: ink.accent, diamond: true },
        { k: 'gap', h: unit * 0.03 },
        { k: 'text', text: data.net || '', ts: { fam: BODY, wt: 800, ls: 0.06 }, size: unit * 0.06, color: ink.fg, maxLines: 1 },
        { k: 'gap', h: unit * 0.025 },
        { k: 'pill', text: (data.badge || '').toUpperCase(), size: unit * 0.042, bg: ink.accent, fg: ink.onAccent },
      ]} />
    );
  }
  if (spec.layout === 'band') {
    const topH = H * 0.22, botH = H * 0.17;
    const topB: Box = { x: box.x + pad, y: box.y + LB_SAFE_MM + 0.4, w: W - pad * 2, h: topH - LB_SAFE_MM - 1 };
    const botB: Box = { x: box.x + pad, y: box.y + H - botH + 0.8, w: W - pad * 2, h: botH - LB_SAFE_MM - 1.2 };
    const mid: Box = { x: box.x + pad, y: box.y + topH + H * 0.04, w: W - pad * 2, h: H - topH - botH - H * 0.08 };
    return (
      <g>
        <Stack box={topB} items={[brandItem(ink.onAccent, 1.15)]} />
        <Stack box={mid} items={[
          art(Math.min(mid.w * 0.42, mid.h * 0.36)),
          { k: 'gap', h: unit * 0.03 },
          nameItem(ink.fg, 1.05),
          { k: 'gap', h: unit * 0.015 },
          { k: 'text', text: data.tagline || '', ts: body, size: unit * 0.05, color: ink.sub, maxLines: 2 },
        ]} />
        <Stack box={botB} items={[
          { k: 'text', text: [data.net, (data.badge || '').toUpperCase()].filter(Boolean).join('  ·  '), ts: { fam: BODY, wt: 800, ls: 0.08 }, size: unit * 0.058, color: ink.onAccent, maxLines: 1 },
        ]} />
      </g>
    );
  }
  if (spec.layout === 'minimal') {
    const d = Math.min(inner.w * 0.3, H * 0.22);
    const stackB: Box = { x: inner.x, y: inner.y, w: inner.w, h: inner.h };
    return (
      <g>
        <g>{c.logo && !c.photo
          ? <Logo cx={inner.x + inner.w - d / 2} cy={inner.y + d / 2} h={d * 0.9} logo={c.logo} />
          : <ArtDisc cx={inner.x + inner.w - d / 2} cy={inner.y + d / 2} d={d} ind={spec.industry} ink={ink} photo={c.photo} ring={false} />}</g>
        <Stack anchor="start" box={stackB} items={[
          { k: 'text', text: (data.brand || '').toUpperCase(), ts: bodyB, size: unit * 0.055, color: ink.accent, maxLines: 1, wFrac: 0.66 },
          { k: 'gap', h: d * 0.55 },
          { k: 'gap', h: 0, flex: true },
          { k: 'text', text: data.name || '', ts: disp, size: unit * 0.15, color: ink.fg, maxLines: 3, lh: 1.04 },
          { k: 'gap', h: unit * 0.025 },
          { k: 'rule', w: inner.w * 0.28, color: ink.accent },
          { k: 'gap', h: unit * 0.025 },
          { k: 'text', text: data.tagline || '', ts: body, size: unit * 0.05, color: ink.sub, maxLines: 3 },
          { k: 'gap', h: 0, flex: true },
          { k: 'text', text: [data.net, (data.badge || '').toUpperCase()].filter(Boolean).join('  ·  '), ts: { fam: BODY, wt: 800, ls: 0.06 }, size: unit * 0.05, color: ink.fg, maxLines: 1 },
        ]} />
      </g>
    );
  }
  if (spec.layout === 'vintage') {
    const i1 = Math.max(1.6, Math.min(W, H) * 0.045), i2 = i1 + Math.max(0.8, Math.min(W, H) * 0.02);
    const fr = (k: number) => ({ x: box.x + k, y: box.y + k, w: W - k * 2, h: H - k * 2 });
    const o = fr(i1), n2 = fr(i2);
    const corner = Math.min(W, H) * 0.05;
    const ib: Box = { x: n2.x + corner * 0.9, y: n2.y + corner * 0.9, w: n2.w - corner * 1.8, h: n2.h - corner * 1.8 };
    return (
      <g>
        <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="none" stroke={ink.accent} strokeWidth={Math.max(0.3, unit * 0.008)} />
        <rect x={n2.x} y={n2.y} width={n2.w} height={n2.h} fill="none" stroke={ink.accent} strokeWidth={0.2} />
        {[[n2.x, n2.y], [n2.x + n2.w, n2.y], [n2.x, n2.y + n2.h], [n2.x + n2.w, n2.y + n2.h]].map(([x, y], i) => (
          <path key={i} d={`M${x - corner * 0.5},${y} L${x},${y - corner * 0.5} L${x + corner * 0.5},${y} L${x},${y + corner * 0.5} Z`} fill={ink.accent} />
        ))}
        <Stack box={ib} items={[
          { k: 'text', text: `— ${(data.since || '').toUpperCase()} —`, ts: { fam: BODY, wt: 800, ls: 0.22 }, size: unit * 0.042, color: ink.sub, maxLines: 1 },
          { k: 'gap', h: unit * 0.02 },
          brandItem(ink.fg, 1.05),
          { k: 'gap', h: unit * 0.02 },
          art(Math.min(ib.w * 0.36, H * 0.2)),
          { k: 'gap', h: unit * 0.025 },
          nameItem(ink.fg, 0.95),
          { k: 'rule', w: ib.w * 0.55, color: ink.accent, diamond: true },
          { k: 'gap', h: unit * 0.015 },
          { k: 'text', text: data.tagline || '', ts: script, size: unit * 0.07, color: ink.sub, maxLines: 2 },
          { k: 'gap', h: unit * 0.02 },
          { k: 'text', text: data.net || '', ts: { fam: BODY, wt: 800, ls: 0.1 }, size: unit * 0.055, color: ink.fg, maxLines: 1 },
        ]} />
      </g>
    );
  }
  // pattern: tấm nhãn giữa trên nền hoạ tiết
  const plW = Math.min(inner.w * 1.02, W - pad * 1.4), plH = H * 0.74;
  const pl: Box = { x: box.x + (W - plW) / 2, y: box.y + (H - plH) / 2, w: plW, h: plH };
  const ppad = Math.min(plW, plH) * 0.08;
  const plateFill = ink.plate ?? null;
  const tc = plateFill ? ink.ink : ink.fg;
  return (
    <g>
      {plateFill
        ? <rect x={pl.x} y={pl.y} width={pl.w} height={pl.h} rx={Math.min(pl.w, pl.h) * 0.12} fill={plateFill} />
        : <rect x={pl.x} y={pl.y} width={pl.w} height={pl.h} rx={Math.min(pl.w, pl.h) * 0.12} fill="none" stroke={ink.fg} strokeWidth={0.3} />}
      <rect x={pl.x + 0.9} y={pl.y + 0.9} width={pl.w - 1.8} height={pl.h - 1.8} rx={Math.min(pl.w, pl.h) * 0.1} fill="none" stroke={ink.accent} strokeWidth={0.22} />
      <Stack box={{ x: pl.x + ppad, y: pl.y + ppad, w: pl.w - ppad * 2, h: pl.h - ppad * 2 }} items={[
        brandItem(ink.accent, 0.95),
        { k: 'gap', h: unit * 0.02 },
        nameItem(tc, 0.95),
        { k: 'gap', h: unit * 0.015 },
        { k: 'text', text: data.tagline || '', ts: body, size: unit * 0.048, color: tc, maxLines: 2 },
        { k: 'gap', h: unit * 0.025 },
        { k: 'pill', text: [data.net, (data.badge || '').toUpperCase()].filter(Boolean).join(' · '), size: unit * 0.045, bg: ink.accent, fg: ink.onAccent },
      ]} />
    </g>
  );
}

// nền theo bố cục (phủ cả nhãn, kể cả lề xén b)
function Background({ W, H, b, c, front }: { W: number; H: number; b: number; c: Ctx; front: Box | null }) {
  const { spec, ink } = c;
  const all = { x: -b, y: -b, w: W + b * 2, h: H + b * 2 };
  const out: ReactNode[] = [];
  if (ink.bg) out.push(<rect key="bg" x={all.x} y={all.y} width={all.w} height={all.h} fill={ink.bg} />);
  if (spec.layout === 'band') {
    const topH = (front?.h ?? H) * 0.22, botH = (front?.h ?? H) * 0.17;
    out.push(<rect key="t" x={all.x} y={-b} width={all.w} height={topH + b} fill={ink.accent} />);
    out.push(<rect key="b" x={all.x} y={H - botH} width={all.w} height={botH + b} fill={ink.accent} />);
    out.push(<rect key="t2" x={all.x} y={topH} width={all.w} height={Math.max(0.35, H * 0.008)} fill={ink.fg} opacity={0.5} />);
  }
  if (spec.layout === 'pattern') {
    const s = Math.max(7, Math.min(H * 0.2, 16));
    const cols = Math.ceil((W + 2 * b) / s) + 1, rows = Math.ceil((H + 2 * b) / s) + 1;
    const ms: ReactNode[] = [];
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const x = -b + q * s + (r % 2 ? s / 2 : 0), y = -b + r * s + s / 2;
      ms.push(<g key={`${r}-${q}`} transform={`translate(${x} ${y}) rotate(${((r * 7 + q * 13) % 5) * 18 - 36}) scale(${s * 0.3})`}><Motif ind={spec.industry} color={ink.accent} detail={ink.accent} /></g>);
    }
    out.push(<g key="pat" opacity={ink.bg ? 0.22 : 0.35}>{ms}</g>);
  }
  if (spec.layout === 'medallion' && front && ink.bg) {
    // vòng sáng nhẹ sau huy hiệu
    out.push(<ellipse key="glow" cx={front.x + front.w / 2} cy={front.y + front.h / 2} rx={front.w * 0.48} ry={front.h * 0.48} fill={ink.accent} opacity={0.08} />);
  }
  return <g data-bg="1">{out}</g>;
}

// ---------- 1 NHÃN (toạ độ mm 0..W × 0..H; b = lề xén vẽ thêm nền) ----------
export interface LBRenderOpts { spec: LBSpec; data: LBData; logo?: LBImage | null; photo?: LBImage | null }
function wrapZones(W: number) {
  const F = W * (W < 140 ? 0.36 : 0.4);
  const side = (W - F) / 2;
  return { A: { x: 0, w: side }, F: { x: side, w: F }, B: { x: side + F, w: side } };
}
/** vùng (theo u 0..1 dọc nhãn) để 3D quay đúng mặt: tâm mặt trước, tâm vùng thông tin chữ */
export function wrapCenters(spec: LBSpec) {
  const { w } = partDims(spec, 'wrap'); const z = wrapZones(w);
  return { front: (z.F.x + z.F.w / 2) / w, info: (z.B.x + z.B.w / 2) / w };
}
function LabelContent({ part, W, H, b, o }: { part: LBPart; W: number; H: number; b: number; o: LBRenderOpts }) {
  const ink = effInk(lbPalette(o.spec.palette), o.spec.material, o.spec.white);
  const c: Ctx = { spec: o.spec, data: o.data, ink, logo: o.logo, photo: o.photo };
  const S = LB_SAFE_MM;
  if (part === 'wrap') {
    const z = wrapZones(W);
    const fb: Box = { x: z.F.x, y: 0, w: z.F.w, h: H };
    const gutter = Math.max(1.2, W * 0.008);
    const aB: Box = { x: S + 0.4, y: S + 0.6, w: z.A.w - S - gutter - 0.4, h: H - 2 * S - 1.2 };
    const bB: Box = { x: z.B.x + gutter, y: S + 0.6, w: z.B.w - S - gutter - 0.4, h: H - 2 * S - 1.2 };
    const band = o.spec.layout === 'band';
    const tb = band ? H * 0.22 : 0, bb = band ? H * 0.17 : 0;
    const shrink = (bx: Box): Box => band ? { ...bx, y: tb + 1.2, h: H - tb - bb - 2.4 } : bx;
    const A = shrink(aB), Bx = shrink(bB);
    const pp = Math.min(1.4, Math.min(A.w, A.h) * 0.05);
    return (
      <g>
        <Background W={W} H={H} b={b} c={c} front={fb} />
        <FrontPanel box={fb} c={c} />
        <Plate box={A} ink={ink}><InfoCodes box={{ x: A.x + pp, y: A.y + pp, w: A.w - pp * 2, h: A.h - pp * 2 }} data={o.data} color={ink.plate ? ink.ink : ink.fg} /></Plate>
        <Plate box={Bx} ink={ink}><InfoText box={{ x: Bx.x + pp, y: Bx.y + pp, w: Bx.w - pp * 2, h: Bx.h - pp * 2 }} data={o.data} color={ink.plate ? ink.ink : ink.fg} accent={ink.plate ? (isDarkHex(ink.accent) || lum(ink.accent) < 150 ? ink.accent : ink.ink) : ink.fg} /></Plate>
      </g>
    );
  }
  if (part === 'front') {
    return (
      <g>
        <Background W={W} H={H} b={b} c={c} front={{ x: 0, y: 0, w: W, h: H }} />
        <FrontPanel box={{ x: 0, y: 0, w: W, h: H }} c={c} />
      </g>
    );
  }
  if (part === 'back') {
    const band = o.spec.layout === 'band';
    const tb = band ? H * 0.12 : 0;
    const plate: Box = { x: S + 0.4, y: S + 0.4 + tb, w: W - 2 * S - 0.8, h: H - 2 * S - 0.8 - tb - (band ? H * 0.08 : 0) };
    const pp = 1.3;
    const codesH = Math.min(plate.h * 0.36, Math.max(13, plate.h * 0.3));
    const textB: Box = { x: plate.x + pp, y: plate.y + pp, w: plate.w - pp * 2, h: plate.h - codesH - pp * 2.5 };
    const codeB: Box = { x: plate.x + pp, y: plate.y + plate.h - codesH - pp * 0.5, w: plate.w - pp * 2, h: codesH };
    const ac = ink.plate ? (isDarkHex(ink.accent) || lum(ink.accent) < 150 ? ink.accent : ink.ink) : ink.fg;
    return (
      <g>
        {ink.bg && <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={ink.bg} />}
        {band && <rect x={-b} y={-b} width={W + 2 * b} height={tb + b} fill={ink.accent} />}
        {band && <rect x={-b} y={H - H * 0.08} width={W + 2 * b} height={H * 0.08 + b} fill={ink.accent} />}
        {band && <Stack box={{ x: S + 1, y: 0.6, w: W - 2 * S - 2, h: tb - 1 }} items={[{ k: 'text', text: (o.data.brand || '').toUpperCase(), ts: { fam: BODY, wt: 800, ls: 0.14 }, size: tb * 0.5, color: ink.onAccent, maxLines: 1 }]} />}
        <Plate box={plate} ink={ink}>
          <InfoText box={textB} data={o.data} color={ink.plate ? ink.ink : ink.fg} accent={ac} />
          <InfoCodes box={codeB} data={o.data} color={ink.plate ? ink.ink : ink.fg} />
        </Plate>
      </g>
    );
  }
  if (part === 'cap') {
    const R = W / 2;
    const sq = R * 1.32;
    return (
      <g>
        {ink.bg && <circle cx={R} cy={R} r={R + b} fill={ink.bg} />}
        {o.spec.layout === 'pattern' && <Background W={W} H={H} b={b} c={c} front={null} />}
        <circle cx={R} cy={R} r={R - Math.max(1.6, R * 0.07)} fill="none" stroke={ink.accent} strokeWidth={Math.max(0.3, R * 0.025)} />
        <circle cx={R} cy={R} r={R - Math.max(2.4, R * 0.11)} fill="none" stroke={ink.accent} strokeWidth={0.2} />
        <Stack box={{ x: R - sq / 2, y: R - sq / 2, w: sq, h: sq }} items={[
          { k: 'text', text: (o.data.brand || '').toUpperCase(), ts: { fam: BODY, wt: 800, ls: 0.16 }, size: R * 0.14, color: ink.fg, maxLines: 1 },
          { k: 'gap', h: R * 0.05 },
          { k: 'art', h: R * 0.55, render: (cx, cy, h) => o.logo ? <Logo cx={cx} cy={cy} h={h * 0.9} logo={o.logo} /> : <ArtDisc cx={cx} cy={cy} d={h} ind={o.spec.industry} ink={ink} photo={o.photo} /> },
          { k: 'gap', h: R * 0.05 },
          { k: 'text', text: o.data.name || '', ts: { fam: lbFont(o.spec.font).family, wt: lbFont(o.spec.font).weight }, size: R * 0.17, color: ink.fg, maxLines: 2, lh: 1.04 },
        ]} />
      </g>
    );
  }
  // neck
  return (
    <g>
      {ink.bg && <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={ink.bg} />}
      <rect x={-b} y={H * 0.12} width={W + 2 * b} height={0.3} fill={ink.accent} />
      <rect x={-b} y={H * 0.88 - 0.3} width={W + 2 * b} height={0.3} fill={ink.accent} />
      <Stack box={{ x: W * 0.2, y: H * 0.2, w: W * 0.6, h: H * 0.6 }} items={[
        { k: 'text', text: (o.data.brand || '').toUpperCase(), ts: { fam: BODY, wt: 800, ls: 0.2 }, size: H * 0.36, color: ink.fg, maxLines: 1 },
      ]} />
      {[W * 0.1, W * 0.9].map((x, i) => <path key={i} d={`M${x - H * 0.12},${H / 2} L${x},${H / 2 - H * 0.12} L${x + H * 0.12},${H / 2} L${x},${H / 2 + H * 0.12} Z`} fill={ink.accent} />)}
    </g>
  );
}

const rr = (W: number, H: number, r: number, dx = 0, dy = 0) =>
  `M${dx + r},${dy} H${dx + W - r} A${r},${r} 0 0 1 ${dx + W},${dy + r} V${dy + H - r} A${r},${r} 0 0 1 ${dx + W - r},${dy + H} H${dx + r} A${r},${r} 0 0 1 ${dx},${dy + H - r} V${dy + r} A${r},${r} 0 0 1 ${dx + r},${dy} Z`;
const circ = (R: number, dx = 0, dy = 0) => `M${dx},${dy + R} A${R},${R} 0 1 0 ${dx + 2 * R},${dy + R} A${R},${R} 0 1 0 ${dx},${dy + R} Z`;
export const cutPath = (d: LBDims, dx = 0, dy = 0) => d.round ? circ(d.w / 2, dx, dy) : rr(d.w, d.h, LB_RADIUS_MM, dx, dy);

/** 1 nhãn đúng khổ (xem trước / texture 3D): cắt theo đường bế, guides = vùng an toàn */
export function LabelSvg({ part, guides = false, style, ...o }: LBRenderOpts & { part: LBPart; guides?: boolean; style?: CSSProperties }) {
  const d = partDims(o.spec, part);
  const id = `lbcut-${part}-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const S = LB_SAFE_MM;
  return (
    <svg viewBox={`0 0 ${d.w} ${d.h}`} width={`${d.w}mm`} height={`${d.h}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-part={part} data-w={d.w} data-h={d.h}>
      <defs><clipPath id={id}><path d={cutPath(d)} /></clipPath></defs>
      <g clipPath={`url(#${id})`}><LabelContent part={part} W={d.w} H={d.h} b={0} o={o} /></g>
      {guides && (
        <g pointerEvents="none">
          <path d={cutPath(d)} fill="none" stroke="#EC008C" strokeWidth={0.3} />
          {d.round
            ? <circle cx={d.w / 2} cy={d.h / 2} r={d.w / 2 - S} fill="none" stroke="#0EA5E9" strokeWidth={0.2} strokeDasharray="1 0.8" />
            : <rect x={S} y={S} width={d.w - 2 * S} height={d.h - 2 * S} fill="none" stroke="#0EA5E9" strokeWidth={0.2} strokeDasharray="1 0.8" />}
          {part === 'wrap' && (() => { const z = wrapZones(d.w); return [z.F.x, z.F.x + z.F.w].map((x, i) => <line key={i} x1={x} y1={0} x2={x} y2={d.h} stroke="#0EA5E9" strokeWidth={0.15} strokeDasharray="0.6 0.9" />); })()}
        </g>
      )}
    </svg>
  );
}

// ---------- FILE IN: mọi nhãn trên 1 tờ, đúng kích thước, lề xén + CutContour + ghi chú ----------
export function sheetLayout(spec: LBSpec) {
  const parts = partsOf(spec);
  const M = 10, GAP = 8, b = LB_BLEED_MM, labelH = 5;
  const main = parts.filter((p) => p === 'wrap' || p === 'front' || p === 'back');
  const small = parts.filter((p) => p === 'cap' || p === 'neck');
  const pos: { part: LBPart; x: number; y: number; d: LBDims }[] = [];
  let y = M + labelH, rowW = 0, x = M;
  let rowH = 0;
  for (const p of main) { const d = partDims(spec, p); pos.push({ part: p, x: x + b, y: y + b, d }); x += d.w + 2 * b + GAP; rowH = Math.max(rowH, d.h + 2 * b); }
  rowW = x - GAP - M;
  if (small.length) {
    y += rowH + GAP + labelH; x = M; let r2 = 0;
    for (const p of small) { const d = partDims(spec, p); pos.push({ part: p, x: x + b, y: y + b, d }); x += d.w + 2 * b + GAP; r2 = Math.max(r2, d.h + 2 * b); }
    rowW = Math.max(rowW, x - GAP - M); rowH = r2;
  }
  const notesY = y + rowH + 8;
  const W = Math.max(rowW + 2 * M, 160), H = notesY + 34;
  return { pos, W: Math.ceil(W), H: Math.ceil(H), notesY };
}
export function LabelSheetSvg({ style, ...o }: LBRenderOpts & { style?: CSSProperties }) {
  const L = sheetLayout(o.spec);
  const c = lbContainer(o.spec.container);
  const mat = LB_MATERIALS.find((m) => m.id === o.spec.material)!;
  const b = LB_BLEED_MM;
  const note = [
    `${c.name} · ${LB_STYLES.find((s) => s.id === o.spec.style)!.name} · ${mat.name}${o.spec.material === 'clear' ? (o.spec.white ? ' · CÓ lót trắng dưới mực' : ' · không lót trắng') : ''}`,
    `Kích thước thật (mm), lề xén ${b}mm, đường bế CutContour bo góc ${LB_RADIUS_MM}mm. Vùng an toàn cách mép ${LB_SAFE_MM}mm.`,
    'In cuộn: nhãn ra ngoài, khoảng cách 3mm, lõi 76mm (hoặc in tờ A4/A3 cắt bế). Ô NSX/HSD/Số lô để trống — in phun date sau.',
  ];
  return (
    <svg viewBox={`0 0 ${L.W} ${L.H}`} width={`${L.W}mm`} height={`${L.H}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet="1">
      <rect width={L.W} height={L.H} fill="#FFFFFF" />
      <g id="In">
        {L.pos.map((p) => {
          const id = `lbsh-${p.part}`;
          const clip = p.d.round ? circ(p.d.w / 2 + b, -b, -b) : rr(p.d.w + 2 * b, p.d.h + 2 * b, LB_RADIUS_MM + b, -b, -b);
          return (
            <g key={p.part} transform={`translate(${p.x} ${p.y})`} data-label={p.part}>
              <defs><clipPath id={id}><path d={clip} /></clipPath></defs>
              {o.spec.material === 'clear' && <path d={clip} fill="none" stroke="#9CA3AF" strokeWidth={0.15} strokeDasharray="0.8 0.8" />}
              <g clipPath={`url(#${id})`}><LabelContent part={p.part} W={p.d.w} H={p.d.h} b={b} o={o} /></g>
            </g>
          );
        })}
      </g>
      <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.25}>
        {L.pos.map((p) => <path key={p.part} d={cutPath(p.d, p.x, p.y)} />)}
      </g>
      <g id="Notes" fontFamily={`"${BODY}"`} fontWeight={600} fill="#374151">
        {L.pos.map((p) => <text key={p.part} x={p.x - b} y={p.y - b - 1.6} fontSize={3}>{PART_NAME[p.part]} · {p.d.round ? `Ø${p.d.w}` : `${p.d.w} × ${p.d.h}`} mm</text>)}
        <text x={10} y={L.notesY + 4} fontSize={3.6} fontWeight={800} fill="#111827">FILE IN NHÃN — gửi xưởng</text>
        {note.map((t, i) => <text key={i} x={10} y={L.notesY + 10 + i * 5.4} fontSize={3}>{t}</text>)}
        <rect x={10} y={L.notesY + 26} width={4} height={2.4} fill="none" stroke="#EC008C" strokeWidth={0.3} />
        <text x={16} y={L.notesY + 28} fontSize={2.6}>Đường bế (CutContour, không in)</text>
      </g>
    </svg>
  );
}

/** ảnh thu nhỏ mặt trước (nhãn quấn: chỉ vùng mặt trước) — lưới chọn mẫu */
export function LabelFrontSvg({ style, ...o }: LBRenderOpts & { style?: CSSProperties }) {
  const part: LBPart = o.spec.style === 'wrap' ? 'wrap' : 'front';
  const d = partDims(o.spec, part);
  const z = part === 'wrap' ? wrapZones(d.w).F : { x: 0, w: d.w };
  return (
    <svg viewBox={`${z.x} 0 ${z.w} ${d.h}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <LabelContent part={part} W={d.w} H={d.h} b={0} o={o} />
    </svg>
  );
}
