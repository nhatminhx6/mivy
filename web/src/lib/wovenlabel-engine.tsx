'use client';
// Mác áo dệt · nhãn may: mác cổ (dệt damask/satin, in), nhãn size (bộ S–XL), nhãn hướng dẫn giặt (in satin/cotton,
// ký hiệu giặt vẽ code, song ngữ VI/EN), mác da/PU (ép chìm / in / khắc laser).
// 1 engine SVG đơn vị mm = KIỂU MÁC × KHỔ × KIỂU GẤP × CHẤT LIỆU × BẢNG MÀU CHỈ × FONT → render code 100%.
// Mác dệt giới hạn ≤6 màu chỉ, cảnh báo chữ nhỏ hơn mức máy dệt ra nét; file sản xuất 1:1 có đường gấp, đường may, CutContour.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- kiểu mác, khổ, kiểu gấp, chất liệu ----------
export type WLKind = 'main' | 'size' | 'care' | 'patch';
export const WL_KINDS: { id: WLKind; name: string; note: string }[] = [
  { id: 'main', name: 'Mác cổ dệt', note: 'May sau cổ áo' },
  { id: 'size', name: 'Nhãn size', note: 'Bộ S · M · L · XL' },
  { id: 'care', name: 'Nhãn giặt', note: 'Thành phần + ký hiệu giặt' },
  { id: 'patch', name: 'Mác da / PU', note: 'Quần jean, túi, ví' },
];

export interface WLSize { id: string; kind: WLKind; name: string; wMm: number; hMm: number }
export const WL_SIZES: WLSize[] = [
  { id: 'm50', kind: 'main', name: '50 × 15 mm', wMm: 50, hMm: 15 },
  { id: 'm60', kind: 'main', name: '60 × 20 mm', wMm: 60, hMm: 20 },
  { id: 'm70', kind: 'main', name: '70 × 25 mm', wMm: 70, hMm: 25 },
  { id: 's15', kind: 'size', name: '15 × 15 mm', wMm: 15, hMm: 15 },
  { id: 's20', kind: 'size', name: '20 × 12 mm', wMm: 20, hMm: 12 },
  { id: 'c30', kind: 'care', name: '30 × 70 mm', wMm: 30, hMm: 70 },
  { id: 'c35', kind: 'care', name: '35 × 80 mm', wMm: 35, hMm: 80 },
  { id: 'c25', kind: 'care', name: '25 × 60 mm', wMm: 25, hMm: 60 },
  { id: 'p70', kind: 'patch', name: '70 × 45 mm', wMm: 70, hMm: 45 },
  { id: 'p60', kind: 'patch', name: '60 × 40 mm', wMm: 60, hMm: 40 },
  { id: 'p80', kind: 'patch', name: '80 × 50 mm', wMm: 80, hMm: 50 },
  { id: 'p50', kind: 'patch', name: '50 × 30 mm', wMm: 50, hMm: 30 },
];
export const wlSize = (id: string) => WL_SIZES.find((s) => s.id === id) || WL_SIZES[0];

export type WLFold = 'endfold' | 'centerfold' | 'straight' | 'diecut';
export const WL_FOLDS: { id: WLFold; name: string; note: string; kinds: WLKind[] }[] = [
  { id: 'endfold', name: 'Gấp 2 đầu', note: 'Mỗi đầu gấp vào 5mm, may 2 cạnh', kinds: ['main', 'size'] },
  { id: 'centerfold', name: 'Gấp đôi (vòng)', note: 'Gấp giữa, 2 đầu may kẹp vào đường may', kinds: ['main', 'size', 'care'] },
  { id: 'straight', name: 'Cắt thẳng · may 4 cạnh', note: 'Chừa 3mm quanh để may', kinds: ['main', 'care'] },
  { id: 'diecut', name: 'Bế theo khuôn', note: 'Bế bo góc, may viền', kinds: ['patch'] },
];
export const FOLD_MM = 5; // phần gấp / kẹp vào đường may
export const SEW_MM = 3; // mép may của mác cắt thẳng

export type WLMaterial = 'damask' | 'satin' | 'printed' | 'satinprint' | 'cottonprint' | 'pu' | 'leather';
export interface WLMaterialInfo { id: WLMaterial; name: string; note: string; kinds: WLKind[]; woven: boolean; minText: number; maxColors: number; order: string }
export const WL_MATERIALS: WLMaterialInfo[] = [
  { id: 'damask', name: 'Dệt damask', note: 'Sợi mảnh, nét nhất — chữ ≥ 1.2mm', kinds: ['main', 'size'], woven: true, minText: 1.2, maxColors: 6, order: 'Mác dệt damask (nét)' },
  { id: 'satin', name: 'Dệt satin', note: 'Mặt bóng mềm — chữ ≥ 1.6mm', kinds: ['main', 'size'], woven: true, minText: 1.6, maxColors: 6, order: 'Mác dệt satin' },
  { id: 'printed', name: 'In trên vải cotton', note: 'In nhiều màu, mềm — chữ ≥ 1.0mm', kinds: ['main', 'size'], woven: false, minText: 1.0, maxColors: 99, order: 'Mác in vải cotton' },
  { id: 'satinprint', name: 'In trên satin trắng', note: 'Nhãn giặt bóng, mềm', kinds: ['care'], woven: false, minText: 1.0, maxColors: 2, order: 'Mác in vải cotton' },
  { id: 'cottonprint', name: 'In trên ruy băng cotton', note: 'Mộc, không ngứa', kinds: ['care'], woven: false, minText: 1.0, maxColors: 2, order: 'Mác in vải cotton' },
  { id: 'pu', name: 'Da PU', note: 'Bền, giá tốt', kinds: ['patch'], woven: false, minText: 2.2, maxColors: 2, order: '' },
  { id: 'leather', name: 'Da bò thật', note: 'Vân da tự nhiên, sang', kinds: ['patch'], woven: false, minText: 2.5, maxColors: 2, order: '' },
];
export const wlMaterial = (id: string) => WL_MATERIALS.find((m) => m.id === id) || WL_MATERIALS[0];

export type WLFinish = 'deboss' | 'ink' | 'laser';
export const WL_FINISHES: { id: WLFinish; name: string; note: string }[] = [
  { id: 'deboss', name: 'Ép chìm', note: 'Nhấn khuôn nhiệt, không mực' },
  { id: 'ink', name: 'Ép + in màu', note: 'Chữ màu kem/vàng nổi bật' },
  { id: 'laser', name: 'Khắc laser', note: 'Cháy sẫm, nét mảnh' },
];

// ---------- font (đều có TTF trong /public/fonts → outline được) ----------
export interface WLFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const WL_FONTS: WLFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'dancing', name: 'Dancing', family: 'Dancing Script', weight: 700, script: true },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, script: true },
];
export const wlFont = (id: string) => WL_FONTS.find((f) => f.id === id) || WL_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const WL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Baloo+2:wght@800&family=Bungee&family=Prata&family=Dancing+Script:wght@700&family=Lobster&display=swap');`;

export function useWLFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-wl-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-wl-fonts'; link.rel = 'stylesheet';
        link.href = WL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...WL_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { metricCache.clear(); if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu chỉ (mỗi màu có tên để ghi vào bảng màu chỉ cho xưởng) ----------
export interface WLPalette { id: string; name: string; kinds: WLKind[]; bg: string; bgName: string; ink: string; inkName: string; accent: string; accentName: string }
export const WL_PALETTES: WLPalette[] = [
  { id: 'ivory-black', name: 'Ngà · đen', kinds: ['main', 'size'], bg: '#F1ECE1', bgName: 'Trắng ngà', ink: '#1C1C1C', inkName: 'Đen', accent: '#8A6D3B', accentName: 'Nâu vàng' },
  { id: 'black-white', name: 'Đen · trắng', kinds: ['main', 'size'], bg: '#161616', bgName: 'Đen', ink: '#F2F0EA', inkName: 'Trắng', accent: '#B9B4A8', accentName: 'Xám bạc' },
  { id: 'black-red', name: 'Đen · đỏ', kinds: ['main', 'size'], bg: '#141414', bgName: 'Đen', ink: '#F2F2F0', inkName: 'Trắng', accent: '#D23A2F', accentName: 'Đỏ cờ' },
  { id: 'black-gold', name: 'Đen · vàng kim', kinds: ['main', 'size'], bg: '#121212', bgName: 'Đen', ink: '#C9A54A', inkName: 'Vàng kim', accent: '#E8D9A8', accentName: 'Vàng nhạt' },
  { id: 'navy-ivory', name: 'Navy · ngà', kinds: ['main', 'size'], bg: '#1E2A44', bgName: 'Xanh navy', ink: '#F1EDE3', inkName: 'Trắng ngà', accent: '#C9A54A', accentName: 'Vàng kim' },
  { id: 'white-navy', name: 'Trắng · navy', kinds: ['main', 'size'], bg: '#FAF9F5', bgName: 'Trắng', ink: '#1E2A44', inkName: 'Xanh navy', accent: '#7A8AA6', accentName: 'Xanh xám' },
  { id: 'pastel-pink', name: 'Hồng phấn', kinds: ['main', 'size'], bg: '#F6DCE2', bgName: 'Hồng phấn', ink: '#5B3A4A', inkName: 'Mận', accent: '#5E9E8E', accentName: 'Xanh bạc hà' },
  { id: 'beige-brown', name: 'Be · nâu', kinds: ['main', 'size'], bg: '#E8DCC4', bgName: 'Be', ink: '#5A3E2B', inkName: 'Nâu cà phê', accent: '#A0522D', accentName: 'Nâu đỏ' },
  { id: 'olive-cream', name: 'Rêu · kem', kinds: ['main', 'size'], bg: '#4B5233', bgName: 'Xanh rêu', ink: '#EDE6D3', inkName: 'Kem', accent: '#C9A54A', accentName: 'Vàng kim' },
  { id: 'care-white', name: 'Satin trắng · đen', kinds: ['care'], bg: '#FFFFFF', bgName: 'Nền trắng', ink: '#1A1A1A', inkName: 'Mực đen', accent: '#1A1A1A', accentName: 'Mực đen' },
  { id: 'care-ivory', name: 'Kem · xám than', kinds: ['care'], bg: '#F4EFE3', bgName: 'Nền kem', ink: '#3A3A3A', inkName: 'Mực xám than', accent: '#3A3A3A', accentName: 'Mực xám than' },
  { id: 'care-black', name: 'Đen · trắng', kinds: ['care'], bg: '#1A1A1A', bgName: 'Nền đen', ink: '#EDEDED', inkName: 'Mực trắng', accent: '#EDEDED', accentName: 'Mực trắng' },
  { id: 'pu-brown', name: 'Nâu bò', kinds: ['patch'], bg: '#7B4A2A', bgName: 'Da nâu', ink: '#F1E6CF', inkName: 'In kem', accent: '#F1E6CF', accentName: 'In kem' },
  { id: 'pu-tan', name: 'Da bò sáng', kinds: ['patch'], bg: '#B07A45', bgName: 'Da bò sáng', ink: '#3A2416', inkName: 'In nâu đậm', accent: '#3A2416', accentName: 'In nâu đậm' },
  { id: 'pu-camel', name: 'Camel', kinds: ['patch'], bg: '#C49A6C', bgName: 'Da camel', ink: '#2E1E14', inkName: 'In nâu đen', accent: '#2E1E14', accentName: 'In nâu đen' },
  { id: 'pu-black', name: 'PU đen', kinds: ['patch'], bg: '#1F1B19', bgName: 'Da đen', ink: '#E6D3A3', inkName: 'In vàng kem', accent: '#E6D3A3', accentName: 'In vàng kem' },
];
export const wlPalette = (id: string) => WL_PALETTES.find((p) => p.id === id) || WL_PALETTES[0];

export const WL_LAYOUTS: { id: string; name: string }[] = [
  { id: 'center', name: 'Chữ giữa' },
  { id: 'logo', name: 'Logo + chữ' },
  { id: 'frame', name: 'Khung viền' },
  { id: 'script', name: 'Chữ viết tay' },
  { id: 'stack', name: 'Xếp 3 dòng' },
];
export const WL_PATCH_LAYOUTS: { id: string; name: string }[] = [
  { id: 'classic', name: 'Cổ điển (EST.)' },
  { id: 'badge', name: 'Huy hiệu' },
];
export const WL_ICONS: { id: string; name: string }[] = [
  { id: 'none', name: 'Không' }, { id: 'star', name: 'Ngôi sao' }, { id: 'heart', name: 'Trái tim' },
  { id: 'crown', name: 'Vương miện' }, { id: 'bolt', name: 'Tia chớp' }, { id: 'leaf', name: 'Chiếc lá' }, { id: 'needle', name: 'Kim chỉ' },
];

export interface WLSpec { kind: WLKind; size: string; fold: WLFold; material: WLMaterial; palette: string; font: string; layout: string; icon: string; finish: WLFinish }
export interface WLTemplate { id: string; name: string; spec: WLSpec }
export const WL_TEMPLATES: WLTemplate[] = [
  { id: 'min', name: 'Tối giản', spec: { kind: 'main', size: 'm60', fold: 'endfold', material: 'damask', palette: 'ivory-black', font: 'montserrat', layout: 'center', icon: 'none', finish: 'deboss' } },
  { id: 'street', name: 'Streetwear', spec: { kind: 'main', size: 'm60', fold: 'straight', material: 'damask', palette: 'black-red', font: 'bungee', layout: 'stack', icon: 'bolt', finish: 'deboss' } },
  { id: 'kids', name: 'Đồ trẻ em', spec: { kind: 'main', size: 'm50', fold: 'centerfold', material: 'satin', palette: 'pastel-pink', font: 'baloo', layout: 'logo', icon: 'star', finish: 'deboss' } },
  { id: 'luxe', name: 'Sang trọng đen · vàng', spec: { kind: 'main', size: 'm70', fold: 'endfold', material: 'damask', palette: 'black-gold', font: 'playfair', layout: 'frame', icon: 'crown', finish: 'deboss' } },
  { id: 'handmade', name: 'Handmade', spec: { kind: 'main', size: 'm60', fold: 'endfold', material: 'satin', palette: 'beige-brown', font: 'dancing', layout: 'script', icon: 'needle', finish: 'deboss' } },
  { id: 'navy', name: 'Navy cổ điển', spec: { kind: 'main', size: 'm50', fold: 'centerfold', material: 'damask', palette: 'navy-ivory', font: 'cormorant', layout: 'center', icon: 'none', finish: 'deboss' } },
  { id: 'size-black', name: 'Size đen', spec: { kind: 'size', size: 's15', fold: 'endfold', material: 'damask', palette: 'black-white', font: 'oswald', layout: 'center', icon: 'none', finish: 'deboss' } },
  { id: 'size-white', name: 'Size trắng', spec: { kind: 'size', size: 's20', fold: 'centerfold', material: 'damask', palette: 'white-navy', font: 'montserrat', layout: 'center', icon: 'none', finish: 'deboss' } },
  { id: 'care-satin', name: 'Nhãn giặt satin trắng', spec: { kind: 'care', size: 'c30', fold: 'centerfold', material: 'satinprint', palette: 'care-white', font: 'bvp', layout: 'center', icon: 'none', finish: 'deboss' } },
  { id: 'care-cotton', name: 'Nhãn giặt cotton kem', spec: { kind: 'care', size: 'c35', fold: 'straight', material: 'cottonprint', palette: 'care-ivory', font: 'bvp', layout: 'center', icon: 'none', finish: 'deboss' } },
  { id: 'patch-brown', name: 'Mác da nâu ép chìm', spec: { kind: 'patch', size: 'p70', fold: 'diecut', material: 'pu', palette: 'pu-brown', font: 'oswald', layout: 'classic', icon: 'none', finish: 'deboss' } },
  { id: 'patch-black', name: 'Mác PU đen in kem', spec: { kind: 'patch', size: 'p60', fold: 'diecut', material: 'pu', palette: 'pu-black', font: 'playfair', layout: 'badge', icon: 'leaf', finish: 'ink' } },
];

// ---------- nội dung ----------
export type WLData = Record<string, string>;
export interface WLField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; kinds: WLKind[] }
export const WL_FIELDS: WLField[] = [
  { key: 'brand', label: 'Tên thương hiệu', ph: 'AN KHANG', kinds: ['main', 'size', 'care', 'patch'], half: true },
  { key: 'tagline', label: 'Dòng phụ', ph: 'Made in Vietnam', kinds: ['main', 'patch'], half: true },
  { key: 'website', label: 'Website / dòng nhỏ', ph: 'ankhang.vn', kinds: ['main'], half: true },
  { key: 'est', label: 'Năm thành lập', ph: 'EST. 2020', kinds: ['patch'], half: true },
  { key: 'sizes', label: 'Bộ size (cách nhau dấu phẩy)', ph: 'S, M, L, XL', kinds: ['size'] },
  { key: 'composition', label: 'Thành phần', ph: '100% Cotton', kinds: ['care'], half: true },
  { key: 'code', label: 'Mã sản phẩm', ph: 'AK-2701', kinds: ['care'], half: true },
  { key: 'origin', label: 'Xuất xứ (VI)', ph: 'Sản xuất tại Việt Nam', kinds: ['care'], half: true },
  { key: 'originEn', label: 'Xuất xứ (EN)', ph: 'Made in Vietnam', kinds: ['care'], half: true },
  { key: 'careVi', label: 'Hướng dẫn giặt (mỗi dòng 1 ý)', multiline: true, kinds: ['care'], half: true },
  { key: 'careEn', label: 'Care instructions (EN)', multiline: true, kinds: ['care'], half: true },
];
export const defaultWLData = (): WLData => ({
  brand: 'AN KHANG', tagline: 'Made in Vietnam', website: 'ankhang.vn', est: 'EST. 2020',
  sizes: 'S, M, L, XL', composition: '100% Cotton', code: 'AK-2701',
  origin: 'Sản xuất tại Việt Nam', originEn: 'Made in Vietnam',
  careVi: 'Giặt máy 30°C\nKhông dùng chất tẩy\nKhông sấy máy\nỦi nhiệt độ thấp\nKhông giặt khô',
  careEn: 'Machine wash 30°C\nDo not bleach\nDo not tumble dry\nIron on low heat\nDo not dry clean',
  bilingual: '1',
});
export const sizeList = (d: WLData) => (d.sizes || '').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 12);

// ---------- đo chữ (canvas, đúng font) ----------
const metricCache = new Map<string, { asc: number; desc: number }>();
let mctx: CanvasRenderingContext2D | null = null;
function ctx(): CanvasRenderingContext2D | null {
  if (typeof document === 'undefined') return null;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  return mctx;
}
export function textW(text: string, family: string, weight: number, size: number, lsEm = 0): number {
  const c = ctx();
  const n = [...text].length;
  if (!c) return n * size * 0.6;
  c.font = `${weight} 100px '${family}'`;
  return (c.measureText(text).width / 100) * size + Math.max(0, n - 1) * lsEm * size;
}
function metrics(family: string, weight: number): { asc: number; desc: number } {
  const k = `${family}|${weight}`;
  let m = metricCache.get(k);
  if (!m) {
    const c = ctx();
    if (c) {
      c.font = `${weight} 100px '${family}'`;
      const mt = c.measureText('ẮĐgy');
      const asc = (mt.fontBoundingBoxAscent ?? 95) / 100, desc = (mt.fontBoundingBoxDescent ?? 25) / 100;
      m = { asc: asc > 0.3 ? asc : 0.95, desc: desc > 0.05 ? desc : 0.25 };
    } else m = { asc: 0.95, desc: 0.25 };
    metricCache.set(k, m);
  }
  return m;
}
const f2 = (n: number) => Math.round(n * 100) / 100;

// ---------- màu ----------
function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return `#${[ch((n >> 16) & 255), ch((n >> 8) & 255), ch(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

// ---------- icon vẽ code (ô vuông s×s) ----------
function Icon({ name, x, y, s, fill }: { name: string; x: number; y: number; s: number; fill: string }) {
  const t = `translate(${f2(x)} ${f2(y)}) scale(${f2(s / 100)})`;
  const p: Record<string, ReactNode> = {
    star: <path d="M50 4L62 37L97 38L69 59L79 94L50 74L21 94L31 59L3 38L38 37Z" fill={fill} />,
    heart: <path d="M50 92C20 70 4 52 4 32C4 16 16 6 30 6C40 6 47 12 50 19C53 12 60 6 70 6C84 6 96 16 96 32C96 52 80 70 50 92Z" fill={fill} />,
    crown: <path d="M8 78L4 26L28 48L50 12L72 48L96 26L92 78ZM8 86H92V96H8Z" fill={fill} />,
    bolt: <path d="M60 2L14 56H44L36 98L86 40H56L60 2Z" fill={fill} />,
    leaf: <path d="M88 8C40 6 10 34 12 72C12 80 14 86 18 92L28 80C26 60 40 40 64 30C46 44 34 60 30 82C60 86 92 62 88 8Z" fill={fill} />,
    needle: <g fill={fill}><path d="M80 6L94 20L36 78L22 82L26 68Z" /><circle cx="86" cy="14" r="4" fill="none" stroke={fill} strokeWidth="3" /><path d="M14 92C24 74 40 92 52 74C60 62 70 70 76 60" fill="none" stroke={fill} strokeWidth="5" strokeLinecap="round" /></g>,
  };
  if (!p[name]) return null;
  return <g transform={t} data-deco="1">{p[name]}</g>;
}

// ---------- ký hiệu giặt (5 ô): giặt 30°, không tẩy, không sấy, ủi thấp, không giặt khô ----------
const CARE_GAP = 1.3;
export const careRowW = (s: number) => s * (1 + CARE_GAP * 4);
function CareIcons({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  const sw = Math.max(0.16, s * 0.07);
  const g = (i: number, n: ReactNode) => <g key={i} transform={`translate(${f2(x + i * s * CARE_GAP)} ${f2(y)})`} fill="none" stroke={color} strokeWidth={f2(sw)} strokeLinejoin="round" strokeLinecap="round">{n}</g>;
  const k = (v: number) => f2(v * s);
  return (
    <g data-care="1" data-deco="1">
      {g(0, <>
        <path d={`M${k(0.05)} ${k(0.25)}L${k(0.17)} ${k(0.92)}H${k(0.83)}L${k(0.95)} ${k(0.25)}`} />
        <path d={`M${k(0.07)} ${k(0.33)}Q${k(0.2)} ${k(0.2)} ${k(0.33)} ${k(0.33)}T${k(0.6)} ${k(0.33)}T${k(0.93)} ${k(0.33)}`} />
        <circle cx={k(0.5)} cy={k(0.64)} r={k(0.07)} fill={color} stroke="none" />
      </>)}
      {g(1, <>
        <path d={`M${k(0.5)} ${k(0.1)}L${k(0.95)} ${k(0.9)}H${k(0.05)}Z`} />
        <path d={`M${k(0.2)} ${k(0.3)}L${k(0.8)} ${k(0.98)}M${k(0.8)} ${k(0.3)}L${k(0.2)} ${k(0.98)}`} />
      </>)}
      {g(2, <>
        <rect x={k(0.06)} y={k(0.1)} width={k(0.88)} height={k(0.82)} />
        <circle cx={k(0.5)} cy={k(0.51)} r={k(0.3)} />
        <path d={`M${k(0.06)} ${k(0.1)}L${k(0.94)} ${k(0.92)}M${k(0.94)} ${k(0.1)}L${k(0.06)} ${k(0.92)}`} />
      </>)}
      {g(3, <>
        <path d={`M${k(0.05)} ${k(0.85)}H${k(0.95)}V${k(0.62)}Q${k(0.92)} ${k(0.3)} ${k(0.55)} ${k(0.3)}H${k(0.3)}Q${k(0.1)} ${k(0.42)} ${k(0.05)} ${k(0.85)}Z`} />
        <circle cx={k(0.55)} cy={k(0.6)} r={k(0.06)} fill={color} stroke="none" />
      </>)}
      {g(4, <>
        <circle cx={k(0.5)} cy={k(0.51)} r={k(0.42)} />
        <path d={`M${k(0.2)} ${k(0.2)}L${k(0.8)} ${k(0.82)}M${k(0.8)} ${k(0.2)}L${k(0.2)} ${k(0.82)}`} />
      </>)}
    </g>
  );
}

// ---------- logo khách (mask 1 màu → tô màu chỉ) ----------
export interface WLLogo { href: string; w: number; h: number }
function LogoTint({ logo, x, y, s, fill, uid }: { logo: WLLogo; x: number; y: number; s: number; fill: string; uid: string }) {
  const k = Math.min(s / logo.w, s / logo.h);
  const w = logo.w * k, h = logo.h * k, lx = x + (s - w) / 2, ly = y + (s - h) / 2;
  const id = `${uid}-lg`;
  return (
    <g data-logo="1" data-deco="1">
      <mask id={id} maskUnits="userSpaceOnUse" x={f2(lx)} y={f2(ly)} width={f2(w)} height={f2(h)}>
        <image href={logo.href} x={f2(lx)} y={f2(ly)} width={f2(w)} height={f2(h)} preserveAspectRatio="xMidYMid meet" />
      </mask>
      <rect x={f2(lx)} y={f2(ly)} width={f2(w)} height={f2(h)} fill={fill} mask={`url(#${id})`} />
    </g>
  );
}

const LEAD = 1.08; // khoảng thở giữa các dòng (hộp chữ SVG ≠ canvas vài %)
// ---------- xếp chồng dòng: tự co theo bề rộng + chiều cao, căn giữa dọc ----------
type Item =
  | { t: 'text'; text: string; family: string; weight: number; max: number; ls?: number; fill: string; role?: string; upper?: boolean }
  | { t: 'gap'; h: number }
  | { t: 'rule'; w: number; th: number; fill: string }
  | { t: 'care'; s: number; fill: string }
  | { t: 'icon'; name: string; s: number; fill: string }
  | { t: 'logo'; s: number; fill: string };
interface Ctx { minFont: number; colors: Set<string>; uid: string; logo?: WLLogo }

function stack(items: Item[], area: { x: number; y: number; w: number; h: number }, c: Ctx, align: 'center' | 'left' = 'center'): ReactNode[] {
  const its = items.filter((it) => it.t !== 'text' || it.text.trim());
  const nat = its.map((it) => {
    if (it.t === 'text') {
      const txt = it.upper ? it.text.toUpperCase() : it.text;
      const w1 = textW(txt, it.family, it.weight, 1, it.ls || 0);
      const m = metrics(it.family, it.weight);
      const size = Math.min(it.max, w1 > 0 ? area.w / w1 : it.max);
      return { size, h: size * (m.asc + m.desc) * LEAD, txt, m };
    }
    if (it.t === 'gap') return { size: 0, h: it.h };
    if (it.t === 'rule') return { size: 0, h: it.th };
    if (it.t === 'care') { const s = Math.min(it.s, area.w / careRowW(1)); return { size: s, h: s * 0.95 }; }
    return { size: Math.min(it.s, area.h), h: Math.min(it.s, area.h) };
  });
  const total = nat.reduce((a, n) => a + n.h, 0);
  const k = total > area.h ? area.h / total : 1;
  let y = area.y + (area.h - total * k) / 2;
  const cx = align === 'center' ? area.x + area.w / 2 : area.x;
  const anchor = align === 'center' ? 'middle' : 'start';
  const out: ReactNode[] = [];
  its.forEach((it, i) => {
    const n = nat[i];
    const h = n.h * k;
    if (it.t === 'text') {
      const size = n.size * k;
      const m = (n as { m: { asc: number; desc: number } }).m;
      c.minFont = Math.min(c.minFont, size);
      c.colors.add(it.fill);
      out.push(
        <text key={i} x={f2(cx)} y={f2(y + size * m.asc + size * (m.asc + m.desc) * (LEAD - 1) / 2)} fontFamily={`'${it.family}'`} fontWeight={it.weight} fontSize={f2(size)}
          letterSpacing={it.ls ? f2(it.ls * size) : undefined} textAnchor={anchor} fill={it.fill} data-role={it.role || 'text'}>
          {(n as { txt: string }).txt}
        </text>,
      );
    } else if (it.t === 'rule') {
      c.colors.add(it.fill);
      const w = Math.min(it.w, area.w);
      out.push(<rect key={i} x={f2(align === 'center' ? cx - w / 2 : cx)} y={f2(y)} width={f2(w)} height={f2(Math.max(0.3, it.th * k))} fill={it.fill} data-deco="1" />);
    } else if (it.t === 'care') {
      const s = n.size * k; c.colors.add(it.fill);
      out.push(<CareIcons key={i} x={align === 'center' ? cx - careRowW(s) / 2 : cx} y={y} s={s} color={it.fill} />);
    } else if (it.t === 'icon') {
      const s = n.h * k; c.colors.add(it.fill);
      out.push(<Icon key={i} name={it.name} x={align === 'center' ? cx - s / 2 : cx} y={y} s={s} fill={it.fill} />);
    } else if (it.t === 'logo' && c.logo) {
      const s = n.h * k; c.colors.add(it.fill);
      out.push(<LogoTint key={i} logo={c.logo} x={align === 'center' ? cx - s / 2 : cx} y={y} s={s} fill={it.fill} uid={c.uid} />);
    }
    y += h;
  });
  return out;
}

// ---------- 1 mặt mác (toạ độ mm, gốc 0,0 = góc trên trái mặt nhìn thấy) ----------
export type WLMode = 'view' | 'mask';
export interface WLFaceOpts { spec: WLSpec; data: WLData; logo?: WLLogo; sizeLabel?: string; mode?: WLMode; uid?: string }
export interface WLFaceResult { node: ReactNode; minFont: number; colors: string[]; w: number; h: number }

export const PATCH_R = 3;
export function patchPath(w: number, h: number, r = PATCH_R, x = 0, y = 0): string {
  return `M${f2(x + r)} ${f2(y)}H${f2(x + w - r)}Q${f2(x + w)} ${f2(y)} ${f2(x + w)} ${f2(y + r)}V${f2(y + h - r)}Q${f2(x + w)} ${f2(y + h)} ${f2(x + w - r)} ${f2(y + h)}H${f2(x + r)}Q${f2(x)} ${f2(y + h)} ${f2(x)} ${f2(y + h - r)}V${f2(y + r)}Q${f2(x)} ${f2(y)} ${f2(x + r)} ${f2(y)}Z`;
}

/** màu thiết kế mác da theo kiểu gia công (ép chìm = da sẫm; khắc laser = cháy đậm; in = màu mực) */
export function patchInk(spec: WLSpec): string {
  const P = wlPalette(spec.palette);
  return spec.finish === 'deboss' ? shade(P.bg, -0.42) : spec.finish === 'laser' ? shade(P.bg, -0.62) : P.ink;
}

export function buildFace(o: WLFaceOpts): WLFaceResult {
  const { spec, data } = o;
  const sz = wlSize(spec.size);
  const W = sz.wMm, H = sz.hMm;
  const P = wlPalette(spec.palette);
  const f = wlFont(spec.font);
  const mask = o.mode === 'mask';
  const c: Ctx = { minFont: Infinity, colors: new Set(), uid: o.uid || 'wl', logo: o.logo };
  const brand = (data.brand || '').trim();
  let bg = P.bg, ink = P.ink, accent = P.accent;
  if (spec.kind === 'patch') { ink = patchInk(spec); accent = ink; }
  if (mask) { bg = '#FFFFFF'; ink = '#000000'; accent = '#000000'; }
  const nodes: ReactNode[] = [];
  c.colors.add(bg);
  const bgShape = spec.kind === 'patch'
    ? <path key="bg" d={patchPath(W, H)} fill={bg} data-bg="1" />
    : <rect key="bg" x={0} y={0} width={W} height={H} fill={bg} data-bg="1" />;
  nodes.push(bgShape);

  if (spec.kind === 'main') {
    const pad = Math.max(1.4, H * 0.12);
    const tag = (data.tagline || '').trim(), web = (data.website || '').trim();
    const area = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };
    const iconOrLogo = (s: number): Item | null => (o.logo ? { t: 'logo', s, fill: accent } : spec.icon !== 'none' ? { t: 'icon', name: spec.icon, s, fill: accent } : null);
    if (spec.layout === 'logo') {
      const s = H - pad * 2;
      const il = iconOrLogo(s) || { t: 'icon', name: 'star', s, fill: accent } as Item;
      nodes.push(...stack([il], { x: pad, y: pad, w: s, h: s }, c));
      const tx = pad + s + Math.max(1.2, H * 0.1);
      nodes.push(...stack([
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * 0.46, ls: 0.04, fill: ink, role: 'brand' },
        { t: 'gap', h: H * 0.05 },
        { t: 'text', text: tag, family: BODY, weight: 600, max: H * 0.16, ls: 0.1, fill: ink, upper: true },
      ], { x: tx, y: pad, w: W - tx - pad, h: H - pad * 2 }, c));
    } else if (spec.layout === 'frame') {
      const fi = Math.max(0.9, H * 0.07), th = 0.45;
      c.colors.add(accent);
      nodes.push(<rect key="fr" x={f2(fi)} y={f2(fi)} width={f2(W - fi * 2)} height={f2(H - fi * 2)} fill="none" stroke={accent} strokeWidth={th} data-deco="1" />);
      const inner = fi + th + Math.max(1.1, H * 0.09);
      const il = iconOrLogo(H * 0.2);
      nodes.push(...stack([
        ...(il ? [il, { t: 'gap', h: H * 0.03 } as Item] : []),
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * 0.36, ls: 0.12, fill: ink, role: 'brand', upper: true },
        { t: 'gap', h: H * 0.04 },
        { t: 'text', text: tag, family: BODY, weight: 600, max: H * 0.13, ls: 0.22, fill: accent, upper: true },
      ], { x: inner, y: inner, w: W - inner * 2, h: H - inner * 2 }, c));
    } else if (spec.layout === 'script') {
      const il = iconOrLogo(H * 0.18);
      nodes.push(...stack([
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * 0.5, fill: ink, role: 'brand' },
        { t: 'gap', h: H * 0.04 },
        ...(il ? [il, { t: 'gap', h: H * 0.03 } as Item] : []),
        { t: 'text', text: tag, family: BODY, weight: 600, max: H * 0.13, ls: 0.24, fill: accent, upper: true },
      ], area, c));
    } else if (spec.layout === 'stack') {
      const il = iconOrLogo(H * 0.22);
      nodes.push(...stack([
        { t: 'text', text: tag, family: BODY, weight: 800, max: H * 0.13, ls: 0.26, fill: accent, upper: true },
        { t: 'gap', h: H * 0.05 },
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * 0.38, ls: 0.04, fill: ink, role: 'brand', upper: true },
        { t: 'gap', h: H * 0.05 },
        ...(il ? [il] : [{ t: 'text', text: web, family: BODY, weight: 600, max: H * 0.12, ls: 0.12, fill: ink } as Item]),
      ], area, c));
    } else { // center
      const il = iconOrLogo(H * 0.2);
      nodes.push(...stack([
        ...(il ? [il, { t: 'gap', h: H * 0.04 } as Item] : []),
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * (tag && H >= 14 ? 0.42 : 0.55), ls: 0.1, fill: ink, role: 'brand', upper: !f.script },
        ...(tag && H >= 14 ? [{ t: 'gap', h: H * 0.06 } as Item, { t: 'text', text: tag, family: BODY, weight: 600, max: H * 0.15, ls: 0.18, fill: accent, upper: true } as Item] : []),
      ], area, c));
    }
  } else if (spec.kind === 'size') {
    const pad = Math.max(1.0, H * 0.1);
    const label = (o.sizeLabel ?? sizeList(data)[0] ?? 'M').toUpperCase();
    const showBrand = brand && H >= 12;
    nodes.push(...stack([
      { t: 'text', text: label, family: f.family, weight: f.weight, max: H * (showBrand ? 0.5 : 0.62), fill: ink, role: 'size' },
      ...(showBrand ? [{ t: 'gap', h: H * 0.05 } as Item, { t: 'text', text: brand, family: BODY, weight: 800, max: H * 0.13, ls: 0.12, fill: accent, upper: true } as Item] : []),
    ], { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 }, c));
  } else if (spec.kind === 'care') {
    const pad = Math.max(2, W * 0.08);
    const bi = data.bilingual !== '0';
    const lines = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 8);
    const vi = lines(data.careVi), en = bi ? lines(data.careEn) : [];
    const items: Item[] = [
      { t: 'text', text: brand, family: f.family, weight: f.weight, max: 2.8, ls: 0.12, fill: ink, upper: true, role: 'brand' },
      { t: 'gap', h: 1.2 },
      { t: 'rule', w: W * 0.36, th: 0.3, fill: ink },
      { t: 'gap', h: 1.4 },
      { t: 'text', text: data.composition || '', family: BODY, weight: 800, max: 3.2, fill: ink, upper: true },
      { t: 'gap', h: 1.2 },
      { t: 'text', text: data.origin || '', family: BODY, weight: 600, max: 1.9, fill: ink },
      ...(bi ? [{ t: 'text', text: data.originEn || '', family: BODY, weight: 600, max: 1.8, fill: ink } as Item] : []),
      { t: 'gap', h: 2 },
      { t: 'care', s: 4.6, fill: ink },
      { t: 'gap', h: 2 },
      ...vi.map((l) => ({ t: 'text', text: l, family: BODY, weight: 600, max: 1.75, fill: ink } as Item)),
      ...(en.length ? [{ t: 'gap', h: 1.3 } as Item, ...en.map((l) => ({ t: 'text', text: l, family: BODY, weight: 600, max: 1.65, fill: ink } as Item))] : []),
      { t: 'gap', h: 1.6 },
      { t: 'text', text: data.code ? `${bi ? 'Mã / Style' : 'Mã SP'}: ${data.code}` : '', family: BODY, weight: 800, max: 1.8, fill: ink },
    ];
    nodes.push(...stack(items, { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 }, c));
  } else { // patch
    const st = 2.6; // đường chỉ may viền
    const holes = mask ? null : (
      <path key="st" d={patchPath(W - st * 2, H - st * 2, Math.max(0.6, PATCH_R - st * 0.6), st, st)} fill="none" stroke={shade(P.bg, P.id === 'pu-black' ? 0.55 : 0.5)}
        strokeWidth={0.45} strokeDasharray="1.6 1.1" strokeLinecap="round" data-deco="1" data-stitch="1" />
    );
    if (holes) nodes.push(holes);
    const inn = st + 2.4;
    const area = { x: inn, y: inn, w: W - inn * 2, h: H - inn * 2 };
    const tag = (data.tagline || '').trim(), est = (data.est || '').trim();
    if (spec.layout === 'badge') {
      const il: Item | null = o.logo ? { t: 'logo', s: H * 0.2, fill: ink } : spec.icon !== 'none' ? { t: 'icon', name: spec.icon, s: H * 0.18, fill: ink } : null;
      nodes.push(...stack([
        ...(il ? [il, { t: 'gap', h: H * 0.04 } as Item] : []),
        { t: 'rule', w: area.w * 0.7, th: 0.5, fill: ink },
        { t: 'gap', h: H * 0.04 },
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * 0.26, ls: 0.06, fill: ink, upper: !f.script, role: 'brand' },
        { t: 'gap', h: H * 0.04 },
        { t: 'rule', w: area.w * 0.7, th: 0.5, fill: ink },
        { t: 'gap', h: H * 0.04 },
        { t: 'text', text: [tag, est].filter(Boolean).join(' · '), family: BODY, weight: 800, max: H * 0.1, ls: 0.16, fill: ink, upper: true },
      ], area, c));
    } else {
      nodes.push(...stack([
        { t: 'text', text: est, family: BODY, weight: 800, max: H * 0.1, ls: 0.3, fill: ink, upper: true },
        { t: 'gap', h: H * 0.05 },
        { t: 'text', text: brand, family: f.family, weight: f.weight, max: H * 0.34, ls: 0.05, fill: ink, upper: !f.script, role: 'brand' },
        { t: 'gap', h: H * 0.05 },
        { t: 'text', text: tag, family: BODY, weight: 800, max: H * 0.11, ls: 0.2, fill: ink, upper: true },
      ], area, c));
    }
  }
  const colors = mask ? [] : [...c.colors];
  return { node: <>{nodes}</>, minFont: c.minFont === Infinity ? 0 : c.minFont, colors, w: W, h: H };
}

// ---------- tên màu (bảng màu chỉ cho xưởng) ----------
export function colorList(spec: WLSpec, colors: string[]): { hex: string; name: string }[] {
  const P = wlPalette(spec.palette);
  const names: Record<string, string> = { [P.bg.toLowerCase()]: P.bgName, [P.ink.toLowerCase()]: P.inkName, [P.accent.toLowerCase()]: P.accentName };
  if (spec.kind === 'patch') {
    const pk = patchInk(spec).toLowerCase();
    names[pk] = spec.finish === 'deboss' ? 'Ép chìm (không mực)' : spec.finish === 'laser' ? 'Khắc laser (cháy sẫm)' : P.inkName;
  }
  const seen = new Set<string>();
  return colors.map((h) => h.toLowerCase()).filter((h) => !seen.has(h) && seen.add(h)).map((h) => ({ hex: h.toUpperCase(), name: names[h] || 'Màu chỉ' }));
}

/** thống kê + cảnh báo của thiết kế hiện tại (min chữ, số màu chỉ) */
export function wlCheck(spec: WLSpec, data: WLData, logo?: WLLogo): { minFont: number; colors: { hex: string; name: string }[]; warnings: string[] } {
  const mat = wlMaterial(spec.material);
  const labels = spec.kind === 'size' ? (sizeList(data).length ? sizeList(data) : ['M']) : [undefined];
  let minFont = Infinity; const all = new Set<string>();
  for (const sl of labels) {
    const r = buildFace({ spec, data, logo, sizeLabel: sl });
    if (r.minFont > 0) minFont = Math.min(minFont, r.minFont);
    r.colors.forEach((x) => all.add(x.toLowerCase()));
  }
  const colors = colorList(spec, [...all]);
  const warnings: string[] = [];
  if (minFont !== Infinity && minFont < mat.minText - 1e-6) {
    warnings.push(`Chữ nhỏ nhất ${minFont.toFixed(2)}mm < ${mat.minText}mm — ${mat.woven ? 'máy dệt khó ra nét, chữ có thể bị nhoè' : 'khó đọc khi in'}. Rút gọn chữ hoặc chọn khổ lớn hơn.`);
  }
  if (colors.length > mat.maxColors) warnings.push(`Dùng ${colors.length} màu — ${mat.name} tối đa ${mat.maxColors} màu chỉ.`);
  if (spec.kind === 'patch' && spec.finish === 'laser' && spec.material === 'pu') warnings.push('Khắc laser trên da PU dễ chảy mép — nên dùng da bò thật.');
  return { minFont: minFont === Infinity ? 0 : minFont, colors, warnings };
}

// ---------- hình học trải phẳng (để sản xuất) ----------
export interface WLFlat { W: number; H: number; face: { x: number; y: number }; back?: { x: number; y: number }; folds: [number, number, number, number][]; zones: { x: number; y: number; w: number; h: number; label: string }[]; sew?: { x: number; y: number; w: number; h: number }; cut: string }
export function flatGeom(spec: WLSpec): WLFlat {
  const sz = wlSize(spec.size);
  const w = sz.wMm, h = sz.hMm, A = FOLD_MM, M = SEW_MM;
  if (spec.kind === 'patch' || spec.fold === 'diecut') return { W: w, H: h, face: { x: 0, y: 0 }, folds: [], zones: [], cut: patchPath(w, h) };
  if (spec.fold === 'endfold') {
    const W = w + A * 2;
    return { W, H: h, face: { x: A, y: 0 }, folds: [[A, 0, A, h], [A + w, 0, A + w, h]], zones: [{ x: 0, y: 0, w: A, h, label: 'gấp' }, { x: A + w, y: 0, w: A, h, label: 'gấp' }], cut: `M0 0H${f2(W)}V${f2(h)}H0Z` };
  }
  if (spec.fold === 'centerfold') {
    const H = h * 2 + A * 2;
    return { W: w, H, face: { x: 0, y: A }, back: { x: 0, y: A + h }, folds: [[0, A + h, w, A + h]], zones: [{ x: 0, y: 0, w, h: A, label: 'kẹp may' }, { x: 0, y: A + h * 2, w, h: A, label: 'kẹp may' }], cut: `M0 0H${f2(w)}V${f2(H)}H0Z` };
  }
  const W = w + M * 2, H = h + M * 2;
  return { W, H, face: { x: M, y: M }, folds: [], zones: [], sew: { x: M, y: M, w, h }, cut: `M0 0H${f2(W)}V${f2(H)}H0Z` };
}

// ---------- SVG components ----------
const sv = (W: number, H: number, pad = 0) => `${-pad} ${-pad} ${f2(W + pad * 2)} ${f2(H + pad * 2)}`;

/** mặt mác nhìn thấy (đúng khổ thành phẩm) — dùng xem trước, texture 3D, PNG */
export function WovenFaceSvg({ spec, data, logo, sizeLabel, mode = 'view', uid = 'wlf', style }: WLFaceOpts & { style?: CSSProperties }) {
  const r = buildFace({ spec, data, logo, sizeLabel, mode, uid });
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={sv(r.w, r.h)} width={`${r.w}mm`} height={`${r.h}mm`} style={style} data-wl-face="1" data-w={r.w} data-h={r.h}>
      {r.node}
    </svg>
  );
}

const CUT = '#EC008C', FOLD = '#1E88E5', SEW = '#8A8F98';

/** 1 mác trải phẳng (đặt tại x,y): mặt in + phần gấp/kẹp may + đường gấp + đường may + CutContour */
function FlatItem({ spec, data, logo, sizeLabel, x, y, uid, faceUid, mask }: { spec: WLSpec; data: WLData; logo?: WLLogo; sizeLabel?: string; x: number; y: number; uid: string; faceUid: string; mask?: boolean }) {
  const g = flatGeom(spec);
  const P = wlPalette(spec.palette);
  const face = buildFace({ spec, data, logo, sizeLabel, uid: faceUid, mode: mask ? 'mask' : 'view' });
  const bgFill = mask ? '#FFFFFF' : P.bg;
  return (
    <g transform={`translate(${f2(x)} ${f2(y)})`} data-wl-item="1" data-size={sizeLabel || ''}>
      <g data-layer="In">
        {spec.kind !== 'patch' && <rect x={0} y={0} width={f2(g.W)} height={f2(g.H)} fill={bgFill} />}
        <g transform={`translate(${f2(g.face.x)} ${f2(g.face.y)})`}>{face.node}</g>
        {g.back && <rect x={f2(g.back.x)} y={f2(g.back.y)} width={f2(face.w)} height={f2(face.h)} fill={bgFill} data-back="1" />}
      </g>
      <g data-layer="Zones">
        {g.zones.map((z, i) => <rect key={i} x={f2(z.x)} y={f2(z.y)} width={f2(z.w)} height={f2(z.h)} fill={`url(#${uid}-hatch)`} opacity={0.55} />)}
      </g>
      <g data-layer="Fold">
        {g.folds.map((l, i) => <line key={i} x1={f2(l[0])} y1={f2(l[1])} x2={f2(l[2])} y2={f2(l[3])} stroke={FOLD} strokeWidth={0.25} strokeDasharray="1.2 0.8" />)}
      </g>
      {g.sew && <rect data-layer="DuongMay" x={f2(g.sew.x)} y={f2(g.sew.y)} width={f2(g.sew.w)} height={f2(g.sew.h)} fill="none" stroke={SEW} strokeWidth={0.2} strokeDasharray="0.8 0.6" />}
      <path data-layer="CutContour" d={g.cut} fill="none" stroke={CUT} strokeWidth={0.2} />
    </g>
  );
}

/** khung xem 1 mác trải phẳng (tab "Bản thiết kế") */
export function WovenFlatSvg({ spec, data, logo, sizeLabel, uid = 'wlfl', style }: WLFaceOpts & { style?: CSSProperties }) {
  const g = flatGeom(spec);
  const pad = 2;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={sv(g.W, g.H, pad)} style={style} data-wl-flat="1">
      <defs>
        <pattern id={`${uid}-hatch`} width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="1.2" height="1.2" fill="#FFFFFF" opacity="0.15" /><line x1="0" y1="0" x2="0" y2="1.2" stroke="#8A8F98" strokeWidth="0.35" />
        </pattern>
      </defs>
      <FlatItem spec={spec} data={data} logo={logo} sizeLabel={sizeLabel} x={0} y={0} uid={uid} faceUid={`${uid}-f`} />
    </svg>
  );
}

// ---------- tờ sản xuất A4 (1:1) ----------
export const SHEET_W = 210, SHEET_H = 297;
export function sheetItems(spec: WLSpec, data: WLData): (string | undefined)[] {
  if (spec.kind === 'size') return sizeList(data).length ? sizeList(data) : ['M'];
  return [undefined];
}

export function WovenSheetSvg({ spec, data, logo, uid = 'wls', style }: { spec: WLSpec; data: WLData; logo?: WLLogo; uid?: string; style?: CSSProperties }) {
  const g = flatGeom(spec);
  const sz = wlSize(spec.size);
  const mat = wlMaterial(spec.material);
  const kind = WL_KINDS.find((k) => k.id === spec.kind)!;
  const fold = WL_FOLDS.find((x) => x.id === spec.fold)!;
  const chk = wlCheck(spec, data, logo);
  const items = sheetItems(spec, data);
  const patchMask = spec.kind === 'patch' && spec.finish !== 'ink';
  const margin = 14, gap = 10, capH = 6;
  // xếp mác 1:1 thành hàng
  const placed: { x: number; y: number; sl?: string }[] = [];
  let x = margin, y = 52, rowH = 0;
  for (const sl of items) {
    if (x + g.W > SHEET_W - margin && x > margin) { x = margin; y += rowH + capH + gap; rowH = 0; }
    placed.push({ x, y, sl });
    x += g.W + gap; rowH = Math.max(rowH, g.H);
  }
  const zoomY = y + rowH + capH + 14;
  const zoomK = Math.min(3, (SHEET_W - margin * 2) / sz.wMm, (SHEET_H - zoomY - 16) / sz.hMm);
  const T = ({ x: tx, y: ty, s, w = 600, children, fill = '#1F2430', anchor }: { x: number; y: number; s: number; w?: number; children: ReactNode; fill?: string; anchor?: 'start' | 'middle' }) => (
    <text x={f2(tx)} y={f2(ty)} fontFamily={`'${BODY}'`} fontWeight={w} fontSize={s} fill={fill} textAnchor={anchor}>{children}</text>
  );
  const typeLabel = mat.woven ? 'Bảng màu chỉ' : spec.kind === 'patch' ? 'Gia công' : 'Màu in';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${SHEET_W} ${SHEET_H}`} width={`${SHEET_W}mm`} height={`${SHEET_H}mm`} style={style} data-wl-sheet="1">
      <defs>
        <pattern id={`${uid}-hatch`} width="1.2" height="1.2" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="1.2" stroke="#8A8F98" strokeWidth="0.35" />
        </pattern>
      </defs>
      <rect x={0} y={0} width={SHEET_W} height={SHEET_H} fill="#FFFFFF" />
      <g id="ThongTin">
        <T x={margin} y={16} s={5.2} w={800}>{`FILE SẢN XUẤT · ${kind.name.toUpperCase()}`}</T>
        <T x={margin} y={22.5} s={2.7}>{`${(data.brand || '').toUpperCase()} · ${mat.name} · ${fold.name} · thành phẩm ${sz.wMm}×${sz.hMm}mm · trải phẳng ${f2(g.W)}×${f2(g.H)}mm${items.length > 1 ? ` · ${items.length} mác` : ''}`}</T>
        <T x={margin} y={29} s={2.6} w={800}>{`${typeLabel} (${chk.colors.length}${mat.woven ? `/${mat.maxColors}` : ''}):`}</T>
        {chk.colors.map((cl, i) => (
          <g key={cl.hex} transform={`translate(${f2(margin + 34 + (i % 3) * 52)} ${f2(26 + Math.floor(i / 3) * 5)})`}>
            <rect x={0} y={0} width={4} height={4} fill={cl.hex} stroke="#9AA0AA" strokeWidth={0.15} />
            <T x={5.5} y={3.2} s={2.4}>{`${cl.name} ${cl.hex}`}</T>
          </g>
        ))}
        <g transform={`translate(${margin} 40)`}>
          <line x1={0} y1={-0.8} x2={8} y2={-0.8} stroke={CUT} strokeWidth={0.3} /><T x={10} y={0} s={2.2}>Đường cắt (CutContour)</T>
          <line x1={52} y1={-0.8} x2={60} y2={-0.8} stroke={FOLD} strokeWidth={0.3} strokeDasharray="1.2 0.8" /><T x={62} y={0} s={2.2}>Đường gấp (Fold)</T>
          <rect x={100} y={-2.4} width={8} height={3} fill={`url(#${uid}-hatch)`} /><T x={110} y={0} s={2.2}>Phần gấp / kẹp vào đường may</T>
        </g>
        <T x={margin} y={46} s={2.2} fill="#6B7280">{patchMask ? 'Tỉ lệ 1:1 · vùng ĐEN là khuôn ép/khắc (không mực).' : `Tỉ lệ 1:1 · chữ nhỏ nhất ${chk.minFont.toFixed(2)}mm (yêu cầu ≥ ${mat.minText}mm).`}</T>
      </g>
      <g id="Labels">
        {placed.map((p, i) => (
          <g key={i}>
            <FlatItem spec={spec} data={data} logo={logo} sizeLabel={p.sl} x={p.x} y={p.y} uid={uid} faceUid={`${uid}-i${i}`} mask={patchMask} />
            <T x={p.x} y={p.y + g.H + 4} s={2.2} fill="#4B5563">{p.sl ? `Size ${p.sl}` : `${sz.wMm}×${sz.hMm}mm`}</T>
          </g>
        ))}
      </g>
      <g id="ThamKhao">
        <T x={margin} y={zoomY - 3} s={2.4} w={800}>{`Phóng to ${zoomK.toFixed(1)}× để xem (không in):`}</T>
        <g transform={`translate(${margin} ${f2(zoomY)}) scale(${f2(zoomK)})`}>
          {buildFace({ spec, data, logo, sizeLabel: items[0], uid: `${uid}-z` }).node}
        </g>
      </g>
    </svg>
  );
}
