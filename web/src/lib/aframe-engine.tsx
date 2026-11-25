'use client';
// Bảng chữ A vỉa hè (A-frame): 2 mặt in, mỗi mặt 1 BỐ CỤC (menu / khuyến mãi / giờ mở cửa + QR / món chính / dịch vụ / khai trương)
// × PHONG CÁCH (bảng đen phấn · hiện đại sáng · gỗ) × FONT → nhiều mẫu, render code 100% (không AI).
// Đơn vị SVG = 1mm (khổ in thật). Chữ đo thật bằng canvas, tự co/xuống dòng; bố cục xếp KHỐI theo chiều dọc rồi tự
// co (k) cho vừa khổ → 50×70, 60×90, 60×120 đều gọn. Bleed 5mm, PDF ~100dpi (khổ lớn nhìn xa).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

// ---------- khổ ----------
export interface AFSize { id: string; name: string; wMm: number; hMm: number }
export const AF_SIZES: AFSize[] = [
  { id: '60x90', name: '60 × 90 cm (phổ biến)', wMm: 600, hMm: 900 },
  { id: '60x120', name: '60 × 120 cm (cao)', wMm: 600, hMm: 1200 },
  { id: '50x70', name: '50 × 70 cm (nhỏ gọn)', wMm: 500, hMm: 700 },
];
export const afSize = (id: string) => AF_SIZES.find((s) => s.id === id) || AF_SIZES[0];
export const AF_BLEED_MM = 5;
export const AF_DPI = 100;

// ---------- font ----------
export interface AFFont { id: string; name: string; family: string; weight: number }
export const AF_FONTS: AFFont[] = [
  { id: 'dancing', name: 'Viết tay', family: 'Dancing Script', weight: 700 },
  { id: 'baloo', name: 'Tròn vui', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Đứng gọn', family: 'Oswald', weight: 700 },
  { id: 'montserrat', name: 'Đậm hiện đại', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Sang trọng', family: 'Playfair Display', weight: 800 },
];
export const afFont = (id: string) => AF_FONTS.find((f) => f.id === id) || AF_FONTS[0];
export const AF_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Baloo+2:wght@600;800&family=Dancing+Script:wght@700&family=Oswald:wght@700&family=Montserrat:wght@800&family=Playfair+Display:wght@800&display=swap');`;

export function useAFFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-af-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-af-fonts'; link.rel = 'stylesheet';
        link.href = AF_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [
      ...AF_FONTS.map((f) => `${f.weight} 40px "${f.family}"`),
      '600 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"', '600 40px "Baloo 2"', '800 40px "Baloo 2"',
    ];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu (mỗi bảng thuộc 1 phong cách) ----------
export type AFStyle = 'chalk' | 'modern' | 'wood';
export interface AFPalette {
  id: string; name: string; style: AFStyle; dark: boolean;
  bg: string; bg2: string; ink: string; sub: string; accent: string; accent2: string; accent3: string; onAccent: string;
}
export const AF_PALETTES: AFPalette[] = [
  { id: 'chalk-slate', name: 'Bảng đen xám', style: 'chalk', dark: true, bg: '#2A302E', bg2: '#38413E', ink: '#F2EEE3', sub: '#C9C6BC', accent: '#F5C451', accent2: '#F29A9A', accent3: '#9AD8C6', onAccent: '#2A302E' },
  { id: 'chalk-green', name: 'Bảng đen xanh', style: 'chalk', dark: true, bg: '#21352D', bg2: '#2D463B', ink: '#EFF2E6', sub: '#C3CBBE', accent: '#F7D06B', accent2: '#F4A3B5', accent3: '#A9DCF0', onAccent: '#21352D' },
  { id: 'chalk-black', name: 'Bảng đen tuyền', style: 'chalk', dark: true, bg: '#1C1E21', bg2: '#2A2D32', ink: '#F1EEE8', sub: '#C2C0BA', accent: '#FF9F68', accent2: '#E9D27A', accent3: '#9CC9F0', onAccent: '#1C1E21' },
  { id: 'modern-red', name: 'Đỏ tươi', style: 'modern', dark: false, bg: '#FFF6EE', bg2: '#FFE8D9', ink: '#2A1512', sub: '#7A5148', accent: '#D7263D', accent2: '#FFB703', accent3: '#2A9D8F', onAccent: '#FFFFFF' },
  { id: 'modern-pink', name: 'Hồng trà sữa', style: 'modern', dark: false, bg: '#FFF1F3', bg2: '#FFDDE4', ink: '#3D1F2B', sub: '#8A5A6B', accent: '#E05780', accent2: '#8A5A3B', accent3: '#F4A261', onAccent: '#FFFFFF' },
  { id: 'modern-cream', name: 'Kem sang', style: 'modern', dark: false, bg: '#F8F3EA', bg2: '#EFE5D4', ink: '#2E2A24', sub: '#7B7062', accent: '#8C6A43', accent2: '#C9A86A', accent3: '#6B8F71', onAccent: '#FFFFFF' },
  { id: 'modern-navy', name: 'Navy vàng', style: 'modern', dark: true, bg: '#13233F', bg2: '#1C3157', ink: '#F4F1EA', sub: '#B9C2D3', accent: '#E7B34A', accent2: '#5FA8D3', accent3: '#F28482', onAccent: '#13233F' },
  { id: 'wood-walnut', name: 'Gỗ óc chó', style: 'wood', dark: true, bg: '#5B3A22', bg2: '#6E4729', ink: '#FFF3DE', sub: '#EBD5B5', accent: '#FFB55C', accent2: '#F3D27A', accent3: '#B7E4C7', onAccent: '#3A2414' },
  { id: 'wood-oak', name: 'Gỗ sồi', style: 'wood', dark: true, bg: '#93643A', bg2: '#A47244', ink: '#FFF8EC', sub: '#FBE8CC', accent: '#FFE08A', accent2: '#FFFFFF', accent3: '#CDEAC0', onAccent: '#4A2F17' },
];
export const afPalette = (id: string) => AF_PALETTES.find((p) => p.id === id) || AF_PALETTES[0];
export const AF_STYLE_NAME: Record<AFStyle, string> = { chalk: 'Bảng đen phấn', modern: 'Hiện đại sáng', wood: 'Gỗ mộc' };

// ---------- bố cục ----------
export type AFLayoutId = 'menu' | 'promo' | 'hours' | 'food' | 'service' | 'welcome';
export const AF_LAYOUTS: { id: AFLayoutId; name: string }[] = [
  { id: 'menu', name: 'Menu đồ uống' },
  { id: 'promo', name: 'Khuyến mãi · combo' },
  { id: 'hours', name: 'Giờ mở cửa + QR' },
  { id: 'food', name: 'Món chính quán ăn' },
  { id: 'service', name: 'Dịch vụ spa · salon' },
  { id: 'welcome', name: 'Chào mừng khai trương' },
];
export type AFArt = 'coffee' | 'boba' | 'bowl' | 'spa' | 'party';
export const AF_ARTS: { id: AFArt; name: string }[] = [
  { id: 'coffee', name: 'Ly cà phê' }, { id: 'boba', name: 'Trà sữa' }, { id: 'bowl', name: 'Tô phở' }, { id: 'spa', name: 'Hoa sen' }, { id: 'party', name: 'Bong bóng' },
];

export interface AFSpec { front: AFLayoutId; back: AFLayoutId | 'same'; palette: string; font: string; size: string; art: AFArt }
export type AFShop = 'cafe' | 'tea' | 'food' | 'spa';
export interface AFTemplate { id: string; name: string; shop: AFShop; spec: Omit<AFSpec, 'size'> }
export const AF_TEMPLATES: AFTemplate[] = [
  { id: 'cafe-chalk', name: 'Menu cà phê · bảng đen', shop: 'cafe', spec: { front: 'menu', back: 'hours', palette: 'chalk-slate', font: 'dancing', art: 'coffee' } },
  { id: 'tea-pink', name: 'Menu trà sữa · hồng', shop: 'tea', spec: { front: 'menu', back: 'promo', palette: 'modern-pink', font: 'baloo', art: 'boba' } },
  { id: 'promo-chalk', name: 'Combo sáng · bảng xanh', shop: 'cafe', spec: { front: 'promo', back: 'menu', palette: 'chalk-green', font: 'baloo', art: 'coffee' } },
  { id: 'promo-red', name: 'Khuyến mãi · đỏ tươi', shop: 'food', spec: { front: 'promo', back: 'food', palette: 'modern-red', font: 'montserrat', art: 'bowl' } },
  { id: 'hours-walnut', name: 'Giờ mở cửa · gỗ óc chó', shop: 'cafe', spec: { front: 'hours', back: 'menu', palette: 'wood-walnut', font: 'playfair', art: 'coffee' } },
  { id: 'food-oak', name: 'Món chính · gỗ sồi', shop: 'food', spec: { front: 'food', back: 'promo', palette: 'wood-oak', font: 'oswald', art: 'bowl' } },
  { id: 'food-chalk', name: 'Quán ăn · bảng đen tuyền', shop: 'food', spec: { front: 'food', back: 'hours', palette: 'chalk-black', font: 'baloo', art: 'bowl' } },
  { id: 'spa-cream', name: 'Bảng giá spa · kem sang', shop: 'spa', spec: { front: 'service', back: 'promo', palette: 'modern-cream', font: 'playfair', art: 'spa' } },
  { id: 'spa-chalk', name: 'Salon · bảng phấn', shop: 'spa', spec: { front: 'service', back: 'hours', palette: 'chalk-slate', font: 'dancing', art: 'spa' } },
  { id: 'welcome-red', name: 'Khai trương · đỏ tươi', shop: 'cafe', spec: { front: 'welcome', back: 'menu', palette: 'modern-red', font: 'montserrat', art: 'party' } },
  { id: 'welcome-walnut', name: 'Khai trương · gỗ', shop: 'food', spec: { front: 'welcome', back: 'food', palette: 'wood-walnut', font: 'oswald', art: 'party' } },
  { id: 'cafe-navy', name: 'Menu cà phê · navy', shop: 'cafe', spec: { front: 'menu', back: 'hours', palette: 'modern-navy', font: 'oswald', art: 'coffee' } },
];

// ---------- nội dung ----------
export type AFData = Record<string, string>;
export interface AFField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean }
export interface AFGroup { id: string; title: string; layouts: AFLayoutId[] | 'all'; fields: AFField[] }
export const AF_GROUPS: AFGroup[] = [
  { id: 'brand', title: 'Thương hiệu & liên hệ', layouts: 'all', fields: [
    { key: 'brand', label: 'Tên quán', half: true }, { key: 'tagline', label: 'Dòng nhỏ dưới tên', half: true },
    { key: 'hotline', label: 'Hotline / Zalo', half: true }, { key: 'address', label: 'Địa chỉ', half: true },
  ] },
  { id: 'menu', title: 'Menu / bảng giá', layouts: ['menu', 'food', 'service'], fields: [
    { key: 'menuTitle', label: 'Tiêu đề nhóm 1', half: true }, { key: 'menu2Title', label: 'Tiêu đề nhóm 2', half: true },
    { key: 'menu', label: 'Nhóm 1 (mỗi dòng: Tên | Giá)', multiline: true, half: true }, { key: 'menu2', label: 'Nhóm 2 (mỗi dòng: Tên | Giá)', multiline: true, half: true },
  ] },
  { id: 'promo', title: 'Khuyến mãi', layouts: ['promo', 'service', 'food'], fields: [
    { key: 'promoEyebrow', label: 'Dòng nhỏ trên', half: true }, { key: 'promoTitle', label: 'Tiêu đề ưu đãi', half: true },
    { key: 'promoHighlight', label: 'Điểm nhấn (to nhất)', half: true }, { key: 'promoNote', label: 'Chi tiết (mỗi dòng 1 ý)', multiline: true, half: true },
  ] },
  { id: 'hours', title: 'Giờ mở cửa · wifi · QR', layouts: ['hours'], fields: [
    { key: 'hoursTitle', label: 'Tiêu đề', half: true }, { key: 'wifi', label: 'Wifi (tên · mật khẩu)', half: true },
    { key: 'hours', label: 'Giờ mở cửa (mỗi dòng: Ngày | Giờ)', multiline: true, half: true }, { key: 'qr', label: 'Link QR (fanpage, menu online…)', half: true },
    { key: 'qrLabel', label: 'Chú thích QR' },
  ] },
  { id: 'welcome', title: 'Khai trương', layouts: ['welcome'], fields: [
    { key: 'welcomeTitle', label: 'Chữ lớn', half: true }, { key: 'welcomeSub', label: 'Ngày / dòng phụ', half: true },
    { key: 'welcomeOffers', label: 'Ưu đãi (mỗi dòng 1 ý)', multiline: true },
  ] },
];

const COMMON: AFData = {
  hoursTitle: 'Giờ mở cửa', hours: 'Thứ 2 – Thứ 6 | 6:30 – 22:00\nThứ 7 – Chủ nhật | 7:00 – 23:00',
  qrLabel: 'Quét mã xem menu & theo dõi fanpage', hotline: '0909 123 456', address: '12 Nguyễn Huệ, Q.1, TP.HCM',
  welcomeTitle: 'KHAI TRƯƠNG', welcomeSub: 'Từ 01/12 đến 07/12',
};
export const AF_SAMPLES: Record<AFShop, AFData> = {
  cafe: { ...COMMON,
    brand: 'AN KHANG COFFEE', tagline: 'CÀ PHÊ RANG XAY · TỪ 2019',
    menuTitle: 'Cà phê', menu: 'Đen đá | 25K\nNâu đá | 29K\nBạc xỉu | 32K\nCà phê muối | 35K\nCold brew cam sả | 45K',
    menu2Title: 'Trà & đá xay', menu2: 'Trà đào cam sả | 39K\nTrà vải hoa hồng | 42K\nMatcha đá xay | 49K\nCacao đá xay | 45K',
    promoEyebrow: 'HÔM NAY CÓ GÌ?', promoTitle: 'Combo sáng no nê', promoHighlight: 'CHỈ 39K', promoNote: 'Cà phê + bánh mì ốp la\nÁp dụng 6:30 – 10:00 mỗi ngày',
    wifi: 'AnKhang_Coffee · MK: cafengon123', qr: 'https://facebook.com/ankhangcoffee',
    welcomeOffers: 'Giảm 30% toàn menu\nTặng ly sứ cho 100 khách đầu tiên\nMua 2 tặng 1 cà phê muối',
  },
  tea: { ...COMMON,
    brand: 'TRÀ SỮA THU HÀ', tagline: 'TRÂN CHÂU NẤU MỚI MỖI NGÀY',
    menuTitle: 'Trà sữa', menu: 'Trà sữa trân châu | 30K\nTrà sữa khoai môn | 35K\nSữa tươi trân châu đường đen | 38K\nTrà sữa matcha | 35K\nOolong kem cheese | 40K',
    menu2Title: 'Trà trái cây', menu2: 'Trà dâu tây | 35K\nTrà xoài chanh dây | 35K\nTrà vải nhiệt đới | 38K',
    promoEyebrow: 'THỨ 3 VUI VẺ', promoTitle: 'Mua 1 tặng 1', promoHighlight: '1 + 1', promoNote: 'Áp dụng size L, mọi vị trà sữa\nTừ 14:00 – 17:00 thứ 3 hằng tuần',
    wifi: 'TraSuaThuHa · MK: trasua2024', qr: 'https://facebook.com/trasuathuha',
    welcomeOffers: 'Đồng giá 20K ngày đầu\nTặng topping cho mọi ly\nCheck-in tặng sticker',
  },
  food: { ...COMMON,
    brand: 'BẾP NHÀ QUỐC BẢO', tagline: 'CƠM NHÀ · NẤU MỚI MỖI NGÀY',
    menuTitle: 'Món chính hôm nay', menu: 'Cơm sườn nướng | 45K\nBún bò Huế | 50K\nCơm gà xối mỡ | 45K\nPhở bò tái | 55K\nMì xào hải sản | 60K',
    menu2Title: 'Món thêm', menu2: 'Canh chua | 15K\nTrứng ốp la | 10K\nTrà đá | 5K',
    promoEyebrow: 'COMBO TRƯA', promoTitle: 'Cơm + canh + trà đá', promoHighlight: 'CHỈ 49K', promoNote: 'Phục vụ 10:30 – 13:30\nGiao tận nơi bán kính 3km',
    wifi: 'BepNhaQuocBao · MK: comngon123', qr: 'https://facebook.com/bepnhaquocbao',
    welcomeOffers: 'Giảm 20% tuần đầu khai trương\nTặng trà đá miễn phí\nĐặt bàn nhóm từ 6 người tặng món tráng miệng',
  },
  spa: { ...COMMON,
    brand: 'THU HÀ BEAUTY', tagline: 'SPA · NAIL · GỘI ĐẦU DƯỠNG SINH',
    hours: 'Mỗi ngày | 9:00 – 21:00\nNhận khách cuối | 20:00',
    menuTitle: 'Dịch vụ', menu: 'Gội đầu dưỡng sinh | 80K\nChăm sóc da mặt | 250K\nMassage body 60 phút | 300K\nSơn gel tay | 120K\nNối mi tự nhiên | 200K',
    menu2Title: 'Gói liệu trình', menu2: '5 buổi chăm sóc da | 990K\n10 buổi gội dưỡng sinh | 650K',
    promoEyebrow: 'ƯU ĐÃI KHÁCH MỚI', promoTitle: 'Lần đầu ghé spa', promoHighlight: 'GIẢM 30%', promoNote: 'Áp dụng mọi dịch vụ lẻ\nĐặt lịch qua Zalo để giữ chỗ',
    wifi: 'ThuHaBeauty · MK: spa12345', qr: 'https://zalo.me/0909123456', qrLabel: 'Quét mã đặt lịch qua Zalo',
    welcomeOffers: 'Giảm 30% mọi dịch vụ\nTặng gội đầu cho khách đặt lịch\nThẻ thành viên giảm 10% trọn đời',
  },
};
export const defaultAFData = (shop: AFShop = 'cafe'): AFData => ({ ...AF_SAMPLES[shop] });
export const layoutsOf = (spec: Pick<AFSpec, 'front' | 'back'>): AFLayoutId[] => [spec.front, ...(spec.back === 'same' ? [] : [spec.back])];

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
interface TS { fam: string; wt: number; ls?: number }
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, [...s].length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.58 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.58 + ls;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  return (mctx.measureText(s).width * size) / 100 + ls;
}
function wrap(text: string, maxW: number, size: number, ts: TS): string[] {
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
// chia dòng cân: giữ số dòng nhưng thu bề ngang tối đa → tránh 1 chữ mồ côi ở dòng cuối ("BẾP NHÀ QUỐC / BẢO")
function balance(text: string, ls: string[], maxW: number, size: number, ts: TS): string[] {
  if (ls.length < 2 || text.includes('\n')) return ls;
  let lo = maxW * 0.4, hi = maxW, best = ls;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    const t = wrap(text, mid, size, ts);
    if (t.length === ls.length && t.every((l) => textW(l, size, ts) <= mid + 0.01)) { best = t; hi = mid; } else lo = mid;
  }
  return best;
}
// co chữ tới khi ≤ maxLines dòng và mọi dòng lọt maxW
function fitText(text: string, maxW: number, size: number, minSize: number, maxLines: number, ts: TS): { lines: string[]; size: number } {
  let s = size;
  for (let i = 0; i < 40; i++) {
    const t: TS = { ...ts, ls: ts.ls ? (ts.ls * s) / size : 0 };
    const lines = wrap(text, maxW, s, t);
    const fits = lines.length <= maxLines && lines.every((l) => textW(l, s, t) <= maxW + 0.01);
    if (fits || s <= minSize) {
      if (!fits) {
        // vẫn dài: cắt bớt dòng + ép nhỏ cho lọt bề ngang
        const keep = lines.slice(0, maxLines);
        const widest = Math.max(...keep.map((l) => textW(l, s, t)), 1);
        return { lines: keep, size: widest > maxW ? (s * maxW) / widest : s };
      }
      return { lines: balance(text, lines, maxW, s, t), size: s };
    }
    s = Math.max(minSize, s * 0.93);
  }
  return { lines: wrap(text, maxW, s, ts).slice(0, maxLines), size: s };
}
const rows = (t: string) => (t || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const i = l.lastIndexOf('|');
  return i < 0 ? { name: l, price: '' } : { name: l.slice(0, i).trim(), price: l.slice(i + 1).trim() };
});
const lines = (t: string) => (t || '').split('\n').map((l) => l.trim()).filter(Boolean);

// số ngẫu nhiên lặp lại được (doodle phấn run tay nhưng ổn định giữa các lần render)
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const f1 = (n: number) => Math.round(n * 10) / 10;

// đường run tay (bảng phấn)
function wobble(pts: [number, number][], amp: number, seed: number, closed = false): string {
  const r = rng(seed);
  const out: string[] = [];
  const all = closed ? [...pts, pts[0]] : pts;
  for (let i = 0; i < all.length - 1; i++) {
    const [x1, y1] = all[i], [x2, y2] = all[i + 1];
    const n = Math.max(2, Math.round(Math.hypot(x2 - x1, y2 - y1) / (amp * 18)));
    for (let j = i === 0 ? 0 : 1; j <= n; j++) {
      const t = j / n;
      const jx = j === 0 || j === n ? 0 : (r() - 0.5) * amp, jy = j === 0 || j === n ? 0 : (r() - 0.5) * amp;
      out.push(`${out.length ? 'L' : 'M'}${f1(x1 + (x2 - x1) * t + jx)} ${f1(y1 + (y2 - y1) * t + jy)}`);
    }
  }
  return out.join('') + (closed ? 'Z' : '');
}
const wavy = (x: number, y: number, w: number, a: number, waves: number) => {
  let d = `M${f1(x)} ${f1(y)}`;
  const step = w / (waves * 2);
  for (let i = 0; i < waves * 2; i++) d += `q${f1(step / 2)} ${f1(i % 2 ? a : -a)} ${f1(step)} 0`;
  return d;
};
const starPath = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)}`;
  }
  return d + 'Z';
};

// ---------- tranh minh hoạ nét (vẽ code, hộp 100×100) ----------
function Art({ art, x, y, w, h, p, sw }: { art: AFArt; x: number; y: number; w: number; h: number; p: AFPalette; sw: number }) {
  const s = Math.min(w, h) / 100;
  const tx = x + (w - 100 * s) / 2, ty = y + (h - 100 * s) / 2;
  const k = sw / s; // nét đúng mm sau khi scale
  const st = { fill: 'none', strokeWidth: k, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const soft = p.style === 'chalk' ? null : <circle cx={50} cy={54} r={44} fill={p.accent} opacity={p.dark ? 0.14 : 0.1} />;
  let body: ReactNode = null;
  if (art === 'coffee') {
    body = (
      <>
        <path d="M24 44 L76 44 L70 82 Q69 88 62 88 L38 88 Q31 88 30 82 Z" stroke={p.ink} {...st} />
        <path d="M76 52 Q90 52 88 64 Q86 74 72 72" stroke={p.ink} {...st} />
        <path d="M14 92 Q50 100 86 92" stroke={p.sub} {...st} />
        <path d="M38 36 Q32 28 38 20 Q44 12 38 4" stroke={p.accent} {...st} />
        <path d="M52 36 Q46 28 52 20 Q58 12 52 4" stroke={p.accent} {...st} />
        <path d="M66 36 Q60 28 66 20" stroke={p.accent} {...st} />
        <path d="M40 60 Q50 68 60 60" stroke={p.accent2} {...st} />
        <ellipse cx={14} cy={70} rx={5} ry={7} transform="rotate(-30 14 70)" stroke={p.accent2} {...st} />
        <path d="M11 66 Q15 70 13 75" stroke={p.accent2} {...st} />
      </>
    );
  } else if (art === 'boba') {
    body = (
      <>
        <path d="M30 34 L70 34 L64 92 Q63 96 58 96 L42 96 Q37 96 36 92 Z" stroke={p.ink} {...st} />
        <path d="M26 34 Q50 14 74 34 Z" stroke={p.ink} {...st} />
        <path d="M56 22 L66 2" stroke={p.accent} {...st} />
        <path d="M33 52 L67 52" stroke={p.sub} {...st} />
        {[[42, 84], [50, 86], [58, 84], [46, 78], [54, 78], [40, 76], [60, 76]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={3} fill={p.accent2} stroke="none" />)}
        <path d="M44 62 Q50 66 56 62" stroke={p.accent} {...st} />
        <circle cx={44} cy={58} r={1.4} fill={p.ink} />
        <circle cx={56} cy={58} r={1.4} fill={p.ink} />
      </>
    );
  } else if (art === 'bowl') {
    body = (
      <>
        <path d="M12 52 L88 52 Q86 86 50 90 Q14 86 12 52 Z" stroke={p.ink} {...st} />
        <path d="M38 90 L36 96 L64 96 L62 90" stroke={p.ink} {...st} />
        <path d="M22 52 Q30 44 38 52 Q46 44 54 52 Q62 44 70 52 Q76 46 80 52" stroke={p.accent2} {...st} />
        <path d="M58 46 L92 8 M66 50 L96 16" stroke={p.accent} {...st} />
        <path d="M30 40 Q24 32 30 24 Q36 16 30 8" stroke={p.sub} {...st} />
        <path d="M44 40 Q38 32 44 24" stroke={p.sub} {...st} />
        <path d="M30 66 Q50 74 70 66" stroke={p.accent3} {...st} />
      </>
    );
  } else if (art === 'spa') {
    body = (
      <>
        <path d="M50 30 Q64 50 50 74 Q36 50 50 30 Z" stroke={p.accent2} {...st} />
        <path d="M50 74 Q30 70 22 44 Q42 46 50 74" stroke={p.accent} {...st} />
        <path d="M50 74 Q70 70 78 44 Q58 46 50 74" stroke={p.accent} {...st} />
        <path d="M50 74 Q22 78 8 62 Q30 56 46 72" stroke={p.ink} {...st} />
        <path d="M50 74 Q78 78 92 62 Q70 56 54 72" stroke={p.ink} {...st} />
        <path d="M14 88 Q50 96 86 88" stroke={p.accent3} {...st} />
        <circle cx={78} cy={20} r={2} fill={p.accent} />
        <circle cx={24} cy={24} r={1.6} fill={p.accent2} />
      </>
    );
  } else {
    body = (
      <>
        <ellipse cx={36} cy={34} rx={16} ry={20} stroke={p.accent2} {...st} />
        <ellipse cx={64} cy={28} rx={16} ry={20} stroke={p.accent} {...st} />
        <path d="M36 54 Q40 70 46 92 M64 48 Q60 70 54 92" stroke={p.sub} {...st} />
        <path d="M32 54 L40 54 L36 58 Z M60 48 L68 48 L64 52 Z" fill={p.ink} stroke="none" />
        {[[14, 70, 0], [86, 64, 1], [20, 14, 2], [88, 90, 0], [10, 40, 1]].map(([cx, cy, c], i) => (
          <path key={i} d={starPath(cx, cy, 4.5)} fill={[p.accent, p.accent2, p.accent3][c]} stroke="none" />
        ))}
      </>
    );
  }
  return <g transform={`translate(${f1(tx)} ${f1(ty)}) scale(${s})`}>{soft}{body}</g>;
}

// ---------- khối bố cục ----------
interface Ctx {
  W: number; H: number; P: number; u: number; uid: string;
  p: AFPalette; f: AFFont; body: { fam: string; wt: number; wtB: number };
  d: AFData; art: AFArt; photo?: string; logo?: string; chalk: boolean;
  noHeader?: boolean; // header đã vẽ riêng trên dải màu (phong cách hiện đại)
}
interface Blk { h: number; gap: number; node: (y: number) => ReactNode; spring?: boolean; raw?: boolean } // raw: ảnh khách — KHÔNG phủ hạt phấn
const spring = (): Blk => ({ h: 0, gap: 0, spring: true, node: () => null });

function textBlk(c: Ctx, text: string, o: { size: number; min: number; lines: number; fam: string; wt: number; fill: string; ls?: number; lh?: number; maxW?: number; upper?: boolean; gap: number; asc?: number }): Blk | null {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return null;
  const maxW = o.maxW ?? c.W - 2 * c.P;
  const ts: TS = { fam: o.fam, wt: o.wt, ls: o.ls || 0 };
  const r = fitText(t, maxW, o.size, o.min, o.lines, ts);
  const lh = o.lh ?? 1.18, asc = o.asc ?? 0.86;
  const ls = o.ls ? (o.ls * r.size) / o.size : 0;
  return {
    h: r.size * (asc + 0.24) + (r.lines.length - 1) * r.size * lh, gap: o.gap,
    node: (y) => (
      <g fontFamily={`"${o.fam}"`} fontWeight={o.wt} fontSize={f1(r.size)} fill={o.fill} textAnchor="middle" letterSpacing={ls ? f1(ls) : undefined}>
        {r.lines.map((ln, i) => <text key={i} x={f1(c.W / 2)} y={f1(y + r.size * asc + i * r.size * lh)}>{ln}</text>)}
      </g>
    ),
  };
}

function underline(c: Ctx, cx: number, y: number, w: number, seed: number): ReactNode {
  const { p, u } = c;
  if (c.chalk) return <path d={wavy(cx - w / 2, y, w, u * 0.7, 4)} stroke={p.accent} strokeWidth={u * 0.45} fill="none" strokeLinecap="round" data-seed={seed} />;
  if (p.style === 'wood') return <line x1={cx - w / 2} y1={y} x2={cx + w / 2} y2={y} stroke={p.accent} strokeWidth={u * 0.4} strokeDasharray={`${f1(u * 0.2)} ${f1(u * 1.1)}`} strokeLinecap="round" />;
  return <rect x={cx - w / 2} y={y - u * 0.35} width={w} height={u * 0.7} rx={u * 0.35} fill={p.accent} />;
}

function sectionTitle(c: Ctx, text: string, k: number, seed: number): Blk | null {
  const b = textBlk(c, text, { size: 7.4 * c.u * k, min: 4 * c.u * k, lines: 1, fam: c.f.family, wt: c.f.weight, fill: c.p.accent, gap: 2.2 * c.u * k });
  if (!b) return null;
  const extra = 2.2 * c.u * k;
  return {
    ...b, h: b.h + extra,
    node: (y) => <g>{b.node(y)}{underline(c, c.W / 2, y + b.h + extra * 0.45, Math.min(c.W * 0.32, 26 * c.u * k), seed)}</g>,
  };
}

function listBlk(c: Ctx, text: string, k: number, leader = true): Blk | null {
  const rs = rows(text).slice(0, 12);
  if (!rs.length) return null;
  const maxW = c.W - 2 * c.P - (c.chalk ? 2 * c.u : 0);
  const x0 = (c.W - maxW) / 2;
  const tsN: TS = { fam: c.body.fam, wt: c.body.wt }, tsP: TS = { fam: c.body.fam, wt: c.body.wtB };
  let s = 4.7 * c.u * k;
  const min = 2.4 * c.u * k;
  const need = (sz: number) => Math.max(...rs.map((r) => textW(r.name, sz, tsN) + (r.price ? textW(r.price, sz, tsP) + sz * 1.6 : 0)));
  while (s > min && need(s) > maxW) s *= 0.95;
  const rowH = s * 1.62;
  return {
    h: rs.length * rowH - (rowH - s * 1.1), gap: 3 * c.u * k,
    node: (y) => (
      <g>
        {rs.map((r, i) => {
          const by = y + s * 0.88 + i * rowH;
          const nw = Math.min(textW(r.name, s, tsN), maxW);
          const pw = r.price ? textW(r.price, s, tsP) : 0;
          const lx1 = x0 + nw + s * 0.5, lx2 = x0 + maxW - pw - s * 0.5;
          return (
            <g key={i}>
              <text x={f1(x0)} y={f1(by)} fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wt} fontSize={f1(s)} fill={c.p.ink}>{r.name}</text>
              {r.price && <text x={f1(x0 + maxW)} y={f1(by)} textAnchor="end" fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wtB} fontSize={f1(s)} fill={c.p.accent}>{r.price}</text>}
              {leader && r.price && lx2 - lx1 > s && (
                <line x1={f1(lx1)} y1={f1(by - s * 0.12)} x2={f1(lx2)} y2={f1(by - s * 0.12)} stroke={c.p.sub} strokeOpacity={0.6} strokeWidth={f1(s * 0.1)} strokeDasharray={`0 ${f1(s * 0.42)}`} strokeLinecap="round" />
              )}
            </g>
          );
        })}
      </g>
    ),
  };
}

function headerBlk(c: Ctx, k: number, compact = false): Blk[] {
  if (c.noHeader) return [];
  const { p, u, W } = c;
  const out: Blk[] = [];
  const dia = (compact ? 10 : 14) * u * k;
  const initials = (c.d.brand || 'M').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]).join('').toUpperCase();
  const band = p.style === 'modern';
  out.push({
    h: dia, gap: 2.2 * u * k, raw: !!c.logo,
    node: (y) => {
      const cx = W / 2, cy = y + dia / 2;
      if (c.logo) {
        return (
          <g>
            <clipPath id={`${c.uid}-logo`}><circle cx={cx} cy={cy} r={dia / 2} /></clipPath>
            <circle cx={cx} cy={cy} r={dia / 2 + u * 0.35} fill={band ? p.onAccent : p.ink} />
            <image href={c.logo} x={cx - dia / 2} y={cy - dia / 2} width={dia} height={dia} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${c.uid}-logo)`} />
          </g>
        );
      }
      const ring = band ? p.onAccent : p.accent;
      return (
        <g>
          {c.chalk
            ? <path d={wobble(Array.from({ length: 18 }, (_, i) => [cx + Math.cos((i / 18) * Math.PI * 2) * dia / 2, cy + Math.sin((i / 18) * Math.PI * 2) * dia / 2] as [number, number]), u * 0.35, 7, true)} fill="none" stroke={ring} strokeWidth={u * 0.5} />
            : <circle cx={cx} cy={cy} r={dia / 2} fill="none" stroke={ring} strokeWidth={u * 0.5} />}
          <text x={cx} y={cy + dia * 0.14} textAnchor="middle" fontFamily={`"${c.f.family}"`} fontWeight={c.f.weight} fontSize={f1(dia * 0.38)} fill={ring}>{initials}</text>
        </g>
      );
    },
  });
  const brand = textBlk(c, c.d.brand, { size: (compact ? 7 : 9.4) * u * k, min: 4.2 * u * k, lines: 2, fam: c.f.family, wt: c.f.weight, fill: band ? p.onAccent : p.ink, gap: 1.2 * u * k, lh: 1.08 });
  if (brand) out.push(brand);
  const tag = textBlk(c, c.d.tagline, { size: 3 * u * k, min: 1.9 * u * k, lines: 2, fam: c.body.fam, wt: c.body.wtB, fill: band ? p.onAccent : p.sub, ls: 0.5 * u * k, upper: true, gap: 3.4 * u * k });
  if (tag) out.push(tag);
  return out;
}

function footerBlk(c: Ctx, k: number): Blk[] {
  const { p, u } = c;
  const out: Blk[] = [];
  const hot = (c.d.hotline || '').trim();
  if (hot) {
    const s0 = 6.2 * u * k;
    const ts: TS = { fam: c.body.fam, wt: c.body.wtB };
    const icon = s0 * 0.9;
    const maxW = c.W - 2 * c.P - icon * 1.5;
    const s = Math.max(3 * u * k, Math.min(s0, (s0 * maxW) / Math.max(1, textW(hot, s0, ts))));
    out.push({
      h: s * 1.08, gap: 1.6 * u * k,
      node: (y) => {
        const w = textW(hot, s, ts) + icon * 1.3;
        const x = c.W / 2 - w / 2;
        const iy = y + s * 0.14;
        return (
          <g>
            <g transform={`translate(${f1(x)} ${f1(iy)}) scale(${f1(icon / 24)})`}>
              <path d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z" fill={p.accent} />
            </g>
            <text x={f1(x + icon * 1.3)} y={f1(y + s * 0.86)} fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wtB} fontSize={f1(s)} fill={p.accent}>{hot}</text>
          </g>
        );
      },
    });
  }
  const addr = textBlk(c, c.d.address, { size: 3.1 * u * k, min: 2 * u * k, lines: 2, fam: c.body.fam, wt: c.body.wt, fill: p.sub, gap: 0 });
  if (addr) out.push(addr);
  return out;
}

function artBlk(c: Ctx, k: number, hRatio: number, gap: number): Blk {
  const w = c.W - 2 * c.P;
  const h = Math.min(w * hRatio, c.H * 0.3) * k;
  return {
    h, gap, raw: !!c.photo,
    node: (y) => {
      if (c.photo) {
        const pw = w, ph = h, x = c.P;
        const r = c.u * 2.2;
        return (
          <g>
            <clipPath id={`${c.uid}-photo`}><rect x={x} y={y} width={pw} height={ph} rx={r} /></clipPath>
            <image href={c.photo} x={x} y={y} width={pw} height={ph} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${c.uid}-photo)`} />
            <rect x={x} y={y} width={pw} height={ph} rx={r} fill="none" stroke={c.chalk ? c.p.ink : c.p.accent} strokeWidth={c.u * 0.45} />
          </g>
        );
      }
      return <Art art={c.art} x={c.P} y={y} w={w} h={h} p={c.p} sw={c.u * 0.62 * Math.max(0.7, k)} />;
    },
  };
}

function highlightBlk(c: Ctx, text: string, k: number): Blk | null {
  const t = (text || '').trim();
  if (!t) return null;
  const { p, u } = c;
  const ts: TS = { fam: c.f.family, wt: c.f.weight };
  const maxW = c.W - 2 * c.P - 8 * u;
  let s = 17 * u * k;
  while (s > 6 * u * k && textW(t, s, ts) > maxW * 0.86) s *= 0.95;
  const tw = textW(t, s, ts);
  const padX = s * 0.5, padY = s * 0.28;
  const bw = Math.min(maxW + 8 * u, tw + padX * 2), bh = s * 1.08 + padY * 2;
  return {
    h: bh, gap: 3.4 * u * k,
    node: (y) => {
      const cx = c.W / 2, x = cx - bw / 2;
      const ty = y + padY + s * 0.86;
      if (c.chalk) {
        const rx = bw / 2 + u * 1.5, ry = bh / 2 + u * 0.8;
        const ring = Array.from({ length: 26 }, (_, i) => {
          const a = (i / 26) * Math.PI * 2;
          return [cx + Math.cos(a) * rx, y + bh / 2 + Math.sin(a) * ry] as [number, number];
        });
        return (
          <g>
            <path d={wobble(ring, u * 0.7, 11, true)} fill="none" stroke={p.accent2} strokeWidth={u * 0.55} />
            {[-1, 1].map((sx) => <path key={sx} d={`M${f1(cx + sx * (rx + u * 1.6))} ${f1(y + bh * 0.2)} l${f1(sx * u * 2.4)} ${f1(-u * 1.6)} M${f1(cx + sx * (rx + u * 2))} ${f1(y + bh / 2)} l${f1(sx * u * 3)} 0 M${f1(cx + sx * (rx + u * 1.6))} ${f1(y + bh * 0.8)} l${f1(sx * u * 2.4)} ${f1(u * 1.6)}`} stroke={p.accent} strokeWidth={u * 0.45} strokeLinecap="round" fill="none" />)}
            <text x={cx} y={f1(ty)} textAnchor="middle" fontFamily={`"${c.f.family}"`} fontWeight={c.f.weight} fontSize={f1(s)} fill={p.accent}>{t}</text>
          </g>
        );
      }
      const fill = p.style === 'wood' ? p.ink : p.accent;
      const ink = p.style === 'wood' ? p.onAccent : p.onAccent;
      return (
        <g>
          <rect x={f1(x)} y={f1(y)} width={f1(bw)} height={f1(bh)} rx={f1(bh * 0.22)} fill={fill} transform={`rotate(-2.5 ${f1(cx)} ${f1(y + bh / 2)})`} />
          <text x={cx} y={f1(ty)} textAnchor="middle" fontFamily={`"${c.f.family}"`} fontWeight={c.f.weight} fontSize={f1(s)} fill={ink} transform={`rotate(-2.5 ${f1(cx)} ${f1(y + bh / 2)})`}>{t}</text>
        </g>
      );
    },
  };
}

function bulletsBlk(c: Ctx, text: string, k: number): Blk | null {
  const ls = lines(text).slice(0, 6);
  if (!ls.length) return null;
  const { p, u } = c;
  const ts: TS = { fam: c.body.fam, wt: c.body.wt };
  const maxW = c.W - 2 * c.P - 6 * u * k;
  let s = 4.6 * u * k;
  while (s > 2.2 * u * k && Math.max(...ls.map((l) => textW(l, s, ts))) > maxW) s *= 0.95;
  const rowH = s * 1.6;
  const widest = Math.max(...ls.map((l) => textW(l, s, ts)));
  return {
    h: ls.length * rowH - (rowH - s * 1.1), gap: 3 * u * k,
    node: (y) => {
      const x0 = c.W / 2 - (widest + s * 1.4) / 2;
      return (
        <g>
          {ls.map((l, i) => {
            const by = y + s * 0.88 + i * rowH;
            return (
              <g key={i}>
                <path d={starPath(x0 + s * 0.4, by - s * 0.32, s * 0.36)} fill={[p.accent, p.accent2, p.accent3][i % 3]} />
                <text x={f1(x0 + s * 1.4)} y={f1(by)} fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wt} fontSize={f1(s)} fill={p.ink}>{l}</text>
              </g>
            );
          })}
        </g>
      );
    },
  };
}

function qrBlk(c: Ctx, k: number): Blk | null {
  const link = (c.d.qr || '').trim();
  if (!link) return null;
  const { p, u } = c;
  const q = 24 * u * k;
  const pad = q * 0.07;
  const gapX = 4 * u * k;
  const maxW = c.W - 2 * c.P;
  const textMax = maxW - q - gapX;
  const lab = fitText(c.d.qrLabel || '', textMax, 4 * u * k, 2.2 * u * k, 3, { fam: c.body.fam, wt: c.body.wtB });
  const wifi = fitText(c.d.wifi ? `Wifi: ${c.d.wifi}` : '', textMax, 3.2 * u * k, 2 * u * k, 2, { fam: c.body.fam, wt: c.body.wt });
  const th = lab.lines.length * lab.size * 1.25 + (wifi.lines.length ? u * 1.6 * k + wifi.lines.length * wifi.size * 1.25 : 0);
  const h = Math.max(q, th);
  const m = qrPath(link);
  return {
    h, gap: 3.4 * u * k,
    node: (y) => {
      const x = c.P;
      const tx = x + q + gapX;
      const ty = y + (h - th) / 2;
      const ty2 = ty + lab.lines.length * lab.size * 1.25 + u * 1.6 * k;
      return (
        <g>
          <rect x={f1(x)} y={f1(y + (h - q) / 2)} width={f1(q)} height={f1(q)} rx={f1(u * 1.2)} fill="#FFFFFF" />
          <path d={m.d} fill="#111111" transform={`translate(${f1(x + pad)} ${f1(y + (h - q) / 2 + pad)}) scale(${(q - pad * 2) / m.n})`} />
          {lab.lines.map((ln, i) => { const yy = ty + lab.size * 0.95 + i * lab.size * 1.25; return <text key={`l${i}`} x={f1(tx)} y={f1(yy)} fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wtB} fontSize={f1(lab.size)} fill={p.ink}>{ln}</text>; })}
          {wifi.lines.map((ln, i) => <text key={`w${i}`} x={f1(tx)} y={f1(ty2 + wifi.size * 0.95 + i * wifi.size * 1.25)} fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wt} fontSize={f1(wifi.size)} fill={p.sub}>{ln}</text>)}
        </g>
      );
    },
  };
}

function doodleRow(c: Ctx, k: number): Blk {
  const { p, u } = c;
  const h = 4 * u * k;
  return {
    h, gap: 3 * u * k,
    node: (y) => {
      const cx = c.W / 2, cy = y + h / 2;
      if (c.chalk) return (
        <g>
          <path d={wobble([[cx - 22 * u * k, cy], [cx - 5 * u * k, cy]], u * 0.3, 3)} stroke={p.sub} strokeWidth={u * 0.35} fill="none" strokeLinecap="round" />
          <path d={starPath(cx, cy, h * 0.45)} fill={p.accent} />
          <path d={wobble([[cx + 5 * u * k, cy], [cx + 22 * u * k, cy]], u * 0.3, 5)} stroke={p.sub} strokeWidth={u * 0.35} fill="none" strokeLinecap="round" />
        </g>
      );
      return (
        <g>
          {[-2, -1, 0, 1, 2].map((i) => <circle key={i} cx={cx + i * 3.4 * u * k} cy={cy} r={(i === 0 ? 0.9 : 0.55) * u * k} fill={i === 0 ? p.accent : p.sub} />)}
        </g>
      );
    },
  };
}

type LayoutFn = (c: Ctx, k: number) => (Blk | null)[];
const LAYOUTS: Record<AFLayoutId, LayoutFn> = {
  menu: (c, k) => [
    ...headerBlk(c, k), doodleRow(c, k),
    sectionTitle(c, c.d.menuTitle, k, 1), listBlk(c, c.d.menu, k),
    sectionTitle(c, c.d.menu2Title, k, 2), listBlk(c, c.d.menu2, k),
    spring(), ...footerBlk(c, k),
  ],
  promo: (c, k) => [
    ...headerBlk(c, k, true),
    textBlk(c, c.d.promoEyebrow, { size: 4 * c.u * k, min: 2.4 * c.u * k, lines: 1, fam: c.body.fam, wt: c.body.wtB, fill: c.p.sub, ls: 0.7 * c.u * k, upper: true, gap: 1.6 * c.u * k }),
    textBlk(c, c.d.promoTitle, { size: 10.5 * c.u * k, min: 5 * c.u * k, lines: 2, fam: c.f.family, wt: c.f.weight, fill: c.p.ink, gap: 3.6 * c.u * k, lh: 1.08 }),
    highlightBlk(c, c.d.promoHighlight, k),
    artBlk(c, k, 0.56, 3.4 * c.u * k),
    textBlk(c, c.d.promoNote, { size: 4.3 * c.u * k, min: 2.4 * c.u * k, lines: 4, fam: c.body.fam, wt: c.body.wt, fill: c.p.ink, gap: 3 * c.u * k, lh: 1.3 }),
    spring(), ...footerBlk(c, k),
  ],
  hours: (c, k) => [
    ...headerBlk(c, k), doodleRow(c, k),
    sectionTitle(c, c.d.hoursTitle, k, 3), listBlk(c, c.d.hours, k, false),
    artBlk(c, k, 0.4, 3.4 * c.u * k),
    qrBlk(c, k),
    spring(), ...footerBlk(c, k),
  ],
  food: (c, k) => [
    ...headerBlk(c, k, true),
    artBlk(c, k, 0.52, 3.6 * c.u * k),
    sectionTitle(c, c.d.menuTitle, k, 4), listBlk(c, c.d.menu, k),
    sectionTitle(c, c.d.menu2Title, k, 5), listBlk(c, c.d.menu2, k),
    spring(), ...footerBlk(c, k),
  ],
  service: (c, k) => [
    ...headerBlk(c, k),
    artBlk(c, k, 0.28, 3 * c.u * k),
    sectionTitle(c, c.d.menuTitle, k, 6), listBlk(c, c.d.menu, k),
    sectionTitle(c, c.d.menu2Title, k, 7), listBlk(c, c.d.menu2, k),
    highlightBlk(c, c.d.promoHighlight ? `${c.d.promoHighlight}` : '', k * 0.62),
    textBlk(c, c.d.promoTitle, { size: 3.6 * c.u * k, min: 2.2 * c.u * k, lines: 2, fam: c.body.fam, wt: c.body.wt, fill: c.p.sub, gap: 3 * c.u * k }),
    spring(), ...footerBlk(c, k),
  ],
  welcome: (c, k) => [
    textBlk(c, 'CHÀO MỪNG', { size: 4.2 * c.u * k, min: 2.4 * c.u * k, lines: 1, fam: c.body.fam, wt: c.body.wtB, fill: c.p.sub, ls: 1 * c.u * k, gap: 1.2 * c.u * k }),
    textBlk(c, c.d.welcomeTitle, { size: 17 * c.u * k, min: 6 * c.u * k, lines: 2, fam: c.f.family, wt: c.f.weight, fill: c.p.accent, gap: 1.6 * c.u * k, lh: 1.02 }),
    textBlk(c, c.d.welcomeSub, { size: 4.6 * c.u * k, min: 2.4 * c.u * k, lines: 1, fam: c.body.fam, wt: c.body.wtB, fill: c.p.ink, gap: 3.4 * c.u * k }),
    artBlk(c, k, 0.42, 3.2 * c.u * k),
    textBlk(c, c.d.brand, { size: 9 * c.u * k, min: 4.2 * c.u * k, lines: 2, fam: c.f.family, wt: c.f.weight, fill: c.p.ink, gap: 1.2 * c.u * k, lh: 1.08 }),
    textBlk(c, c.d.tagline, { size: 3 * c.u * k, min: 1.9 * c.u * k, lines: 2, fam: c.body.fam, wt: c.body.wtB, fill: c.p.sub, ls: 0.5 * c.u * k, upper: true, gap: 3.6 * c.u * k }),
    doodleRow(c, k),
    bulletsBlk(c, c.d.welcomeOffers, k),
    spring(), ...footerBlk(c, k),
  ],
};

// xếp khối: co k tới khi vừa; dư chỗ → dồn vào lò xo (đẩy chân trang xuống đáy), không có lò xo thì nới đều khoảng cách
function arrange(c: Ctx, fn: LayoutFn, top: number, bottom: number): { fx: ReactNode[]; raw: ReactNode[] } {
  const avail = bottom - top;
  let k = 1, blocks: Blk[] = [];
  for (let i = 0; i < 30; i++) {
    blocks = fn(c, k).filter(Boolean) as Blk[];
    const total = blocks.reduce((s, b, j) => s + b.h + (j < blocks.length - 1 ? b.gap : 0), 0);
    if (total <= avail || k < 0.42) break;
    k *= 0.95;
  }
  const total = blocks.reduce((s, b, j) => s + b.h + (j < blocks.length - 1 ? b.gap : 0), 0);
  const extra = Math.max(0, avail - total);
  const springs = blocks.filter((b) => b.spring).length;
  // nới khoảng cách tối đa ~1.6 lần, phần dư còn lại cho lò xo
  const gaps = blocks.slice(0, -1).reduce((s, b) => s + (b.spring ? 0 : b.gap), 0);
  const stretch = springs ? Math.min(extra * 0.45, gaps * 0.6) : Math.min(extra, gaps * 0.9);
  const rest = extra - stretch;
  let y = top + (springs ? 0 : rest / 2);
  const out: ReactNode[] = [], raw: ReactNode[] = [];
  blocks.forEach((b, j) => {
    if (b.spring) { y += rest / springs; return; }
    (b.raw ? raw : out).push(<g key={j}>{b.node(y)}</g>);
    y += b.h + (j < blocks.length - 1 ? b.gap + (gaps ? (stretch * b.gap) / gaps : 0) : 0);
  });
  return { fx: out, raw };
}

// ---------- nền theo phong cách ----------
function Background({ c, B }: { c: Ctx; B: number }) {
  const { W, H, p, u, uid } = c;
  const full = { x: -B, y: -B, width: W + 2 * B, height: H + 2 * B };
  if (p.style === 'chalk') {
    const r = rng(17);
    return (
      <g>
        <defs>
          <radialGradient id={`${uid}-vig`} cx="50%" cy="45%" r="70%"><stop offset="0" stopColor={p.bg2} /><stop offset="1" stopColor={p.bg} /></radialGradient>
          <radialGradient id={`${uid}-smudge`}><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.07" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></radialGradient>
        </defs>
        <rect {...full} fill={`url(#${uid}-vig)`} />
        {/* vệt lau phấn mờ */}
        {Array.from({ length: 7 }, (_, i) => (
          <ellipse key={i} cx={f1(W * (0.1 + r() * 0.8))} cy={f1(H * (0.08 + r() * 0.84))} rx={f1(W * (0.18 + r() * 0.2))} ry={f1(H * (0.04 + r() * 0.05))} fill={`url(#${uid}-smudge)`} transform={`rotate(${f1(-12 + r() * 24)} ${f1(W / 2)} ${f1(H / 2)})`} />
        ))}
        {/* khung kẻ phấn 2 đường */}
        <path d={wobble([[3 * u, 3 * u], [W - 3 * u, 3 * u], [W - 3 * u, H - 3 * u], [3 * u, H - 3 * u]], u * 0.45, 21, true)} fill="none" stroke={p.ink} strokeOpacity={0.75} strokeWidth={u * 0.4} />
        <path d={wobble([[4.4 * u, 4.4 * u], [W - 4.4 * u, 4.4 * u], [W - 4.4 * u, H - 4.4 * u], [4.4 * u, H - 4.4 * u]], u * 0.35, 23, true)} fill="none" stroke={p.ink} strokeOpacity={0.4} strokeWidth={u * 0.22} />
        {/* ngôi sao góc */}
        {[[8 * u, 9 * u, p.accent], [W - 8 * u, 9 * u, p.accent2], [8 * u, H - 9 * u, p.accent3], [W - 8 * u, H - 9 * u, p.accent]].map(([x, y, col], i) => (
          <path key={i} d={starPath(x as number, y as number, u * 1.3)} fill={col as string} opacity={0.9} />
        ))}
      </g>
    );
  }
  if (p.style === 'wood') {
    const planks = 4;
    const pw = (W + 2 * B) / planks;
    const r = rng(41);
    return (
      <g>
        <defs>
          <radialGradient id={`${uid}-wv`} cx="50%" cy="48%" r="68%"><stop offset="0" stopColor="#000000" stopOpacity="0.38" /><stop offset="0.75" stopColor="#000000" stopOpacity="0.2" /><stop offset="1" stopColor="#000000" stopOpacity="0.06" /></radialGradient>
        </defs>
        {Array.from({ length: planks }, (_, i) => {
          const x = -B + i * pw;
          const tone = i % 2 ? p.bg2 : p.bg;
          return (
            <g key={i}>
              <rect x={f1(x)} y={-B} width={f1(pw + 0.5)} height={H + 2 * B} fill={tone} />
              {Array.from({ length: 16 }, (_, j) => {
                const gx = x + (j + 0.5) * (pw / 16) + (r() - 0.5) * pw * 0.04;
                const amp = pw * (0.006 + r() * 0.02);
                let d = `M${f1(gx)} ${-B}`;
                const seg = 9;
                for (let s = 1; s <= seg; s++) d += `Q${f1(gx + (s % 2 ? amp : -amp))} ${f1(-B + (s - 0.5) * (H + 2 * B) / seg)} ${f1(gx)} ${f1(-B + s * (H + 2 * B) / seg)}`;
                return <path key={j} d={d} fill="none" stroke="#2A170A" strokeOpacity={0.08 + r() * 0.14} strokeWidth={f1(u * (0.08 + r() * 0.22))} />;
              })}
              {r() > 0.4 && (() => {
                const kx = x + pw * (0.3 + r() * 0.4), ky = H * (0.15 + r() * 0.7);
                return [0, 1, 2].map((q) => <ellipse key={q} cx={f1(kx)} cy={f1(ky)} rx={f1(u * (1.2 + q * 1.1))} ry={f1(u * (2.6 + q * 2.2))} fill="none" stroke="#2A170A" strokeOpacity={0.2 - q * 0.05} strokeWidth={f1(u * 0.25)} />);
              })()}
              <line x1={f1(x)} y1={-B} x2={f1(x)} y2={H + B} stroke="#1E1006" strokeOpacity={0.45} strokeWidth={f1(u * 0.35)} />
            </g>
          );
        })}
        <rect {...full} fill={`url(#${uid}-wv)`} />
      </g>
    );
  }
  // modern
  return (
    <g>
      <rect {...full} fill={p.bg} />
      <circle cx={f1(W * 0.98)} cy={f1(H * 0.6)} r={f1(W * 0.32)} fill={p.bg2} />
      <circle cx={f1(W * 0.02)} cy={f1(H * 0.86)} r={f1(W * 0.2)} fill={p.bg2} />
      <rect x={-B} y={f1(H - 3 * u)} width={W + 2 * B} height={f1(3 * u + B)} fill={p.accent} />
    </g>
  );
}

export interface AFRenderOpts { spec: AFSpec; data: AFData; face: 'front' | 'back'; bleed?: boolean; photo?: string; logo?: string; style?: CSSProperties }
export const faceLayout = (spec: AFSpec, face: 'front' | 'back'): AFLayoutId => (face === 'back' && spec.back !== 'same' ? spec.back : spec.front);

export function AFrameSvg({ spec, data, face, bleed = false, photo, logo, style }: AFRenderOpts) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sz = afSize(spec.size);
  const W = sz.wMm, H = sz.hMm;
  const B = bleed ? AF_BLEED_MM : 0;
  const p = afPalette(spec.palette);
  const f = afFont(spec.font);
  const chalk = p.style === 'chalk';
  const u = W / 74; // đơn vị cỡ chữ: bảng vỉa hè nhìn từ 3–5m → chữ to
  const c: Ctx = {
    W, H, u, P: W * (chalk ? 0.1 : 0.085), uid: `af${rid}`, p, f, d: data, art: spec.art, photo, logo, chalk,
    body: chalk ? { fam: 'Baloo 2', wt: 600, wtB: 800 } : { fam: 'Be Vietnam Pro', wt: 600, wtB: 800 },
  };
  const layout = faceLayout(spec, face);
  const band = p.style === 'modern' && layout !== 'welcome';
  // dải màu đầu bảng (hiện đại): khối đầu nằm trên nền accent → tính chiều cao dải theo header thật
  let content: ReactNode[];
  let rawNodes: ReactNode[] = [];
  let bandH = 0;
  if (band) {
    const hb = headerBlk(c, 1, layout === 'promo' || layout === 'food');
    bandH = hb.reduce((s, b, j) => s + b.h + (j < hb.length - 1 ? b.gap : 0), 0) + c.P * 1.15;
    const k0 = Math.min(1, (H * 0.3) / bandH);
    const hb2 = headerBlk(c, k0, layout === 'promo' || layout === 'food');
    const hh = hb2.reduce((s, b, j) => s + b.h + (j < hb2.length - 1 ? b.gap : 0), 0);
    bandH = hh + c.P * 1.15;
    let y = c.P * 0.62;
    const head = hb2.map((b, j) => { const n = <g key={`h${j}`}>{b.node(y)}</g>; y += b.h + b.gap; return n; });
    const a = arrange({ ...c, noHeader: true }, LAYOUTS[layout], bandH + c.P * 0.7, H - c.P * 0.85);
    content = [...head, ...a.fx]; rawNodes = a.raw;
  } else {
    const a = arrange(c, LAYOUTS[layout], c.P, H - c.P * (chalk ? 1 : 0.85));
    content = a.fx; rawNodes = a.raw;
  }
  const vb = `${-B} ${-B} ${W + 2 * B} ${H + 2 * B}`;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-af-face={face} data-w={W} data-h={H}>
      <defs>
        {chalk && (
          <filter id={`${c.uid}-chalk`} filterUnits="userSpaceOnUse" x={-B} y={-B} width={W + 2 * B} height={H + 2 * B}>
            <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves={2} seed={3} result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.4 0 0 0 -0.32" result="m" />
            <feComposite in="SourceGraphic" in2="m" operator="in" />
          </filter>
        )}
      </defs>
      <Background c={c} B={B} />
      {band && <rect x={-B} y={-B} width={W + 2 * B} height={bandH + B} fill={p.accent} />}
      {band && <path d={`M${-B} ${f1(bandH)} Q${f1(W / 2)} ${f1(bandH + c.u * 5)} ${W + B} ${f1(bandH)} L${W + B} ${f1(bandH - 0.1)} L${-B} ${f1(bandH - 0.1)} Z`} fill={p.accent} />}
      <g filter={chalk ? `url(#${c.uid}-chalk)` : undefined}>{content}</g>
      {rawNodes}
    </svg>
  );
}
