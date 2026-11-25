'use client';
// POSM siêu thị / tạp hoá: wobbler lắc lư (die-cut, gắn cần PVC trong), shelf strip (dải 100×3.9cm cài rãnh giá kệ),
// tem giá hàng loạt (dán danh sách "Tên | Giá cũ | Giá mới | Quy cách" → mỗi SP 1 tem, gạch giá cũ, tự tính % giảm),
// bảng treo trần 2 mặt. 100% vẽ bằng code (tia nắng, chấm halftone, sọc, hoa giấy) — không gọi AI. Đơn vị SVG = mm.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { FL_FONT_CSS, textW, useFLFonts } from './flyer-engine';

export const ST_FONT_CSS = FL_FONT_CSS;
export const useStFonts = useFLFonts;
const BODY = 'Be Vietnam Pro';

// ---------- loại / hình / khổ ----------
export type StKind = 'wobbler' | 'strip' | 'price' | 'dangler';
export const ST_KINDS: { id: StKind; name: string; note: string }[] = [
  { id: 'wobbler', name: 'Wobbler lắc lư', note: 'Bế hình, gắn cần PVC trong kẹp mép kệ' },
  { id: 'strip', name: 'Shelf strip', note: 'Dải 100 × 3,9cm cài rãnh giá kệ' },
  { id: 'price', name: 'Tem giá hàng loạt', note: 'Dán danh sách → mỗi sản phẩm 1 tem' },
  { id: 'dangler', name: 'Bảng treo trần', note: '2 mặt, đục lỗ treo dây' },
];

export type WobShape = 'circle80' | 'circle100' | 'burst' | 'arrow' | 'bubble';
export type DanShape = 'circle' | 'rect' | 'burst';
export type TagSize = 't60' | 't90';
export const WOB_SHAPES: { id: WobShape; name: string }[] = [
  { id: 'circle80', name: 'Tròn Ø8cm' }, { id: 'circle100', name: 'Tròn Ø10cm' }, { id: 'burst', name: 'Ngôi sao nổ 10cm' },
  { id: 'arrow', name: 'Mũi tên 12×7cm' }, { id: 'bubble', name: 'Bong bóng chat 10×8,4cm' },
];
export const DAN_SHAPES: { id: DanShape; name: string }[] = [
  { id: 'circle', name: 'Tròn Ø20cm' }, { id: 'rect', name: 'Chữ nhật 20×28cm' }, { id: 'burst', name: 'Ngôi sao nổ 22cm' },
];
export const TAG_SIZES: { id: TagSize; name: string; w: number; h: number }[] = [
  { id: 't60', name: '6 × 3,8cm (18 tem/A4)', w: 60, h: 38 },
  { id: 't90', name: '9 × 3,8cm (12 tem/A4)', w: 90, h: 38 },
];
export const STRIP_W = 1000, STRIP_H = 39;
export const ST_BLEED = 2;          // mm (wobbler, bảng treo, strip)
export const TAG_BLEED = 1.5;

// ---------- màu ----------
export interface StPalette { id: string; name: string; bg: string; bg2: string; accent: string; onBg: string; onAccent: string; ink: string; price: string }
export const ST_PALETTES: StPalette[] = [
  { id: 'red', name: 'Đỏ vàng sale', bg: '#E1251B', bg2: '#B8150E', accent: '#FFD400', onBg: '#FFFFFF', onAccent: '#B8150E', ink: '#1A1A1A', price: '#E1251B' },
  { id: 'yellow', name: 'Vàng đen giá sốc', bg: '#FFD200', bg2: '#F2B200', accent: '#E1251B', onBg: '#141414', onAccent: '#FFFFFF', ink: '#141414', price: '#E1251B' },
  { id: 'green', name: 'Xanh nhà thuốc', bg: '#0E8A4B', bg2: '#0A6A39', accent: '#FFFFFF', onBg: '#FFFFFF', onAccent: '#0E8A4B', ink: '#10261A', price: '#0E8A4B' },
  { id: 'pink', name: 'Hồng mẹ & bé', bg: '#EC5C8E', bg2: '#CF3F72', accent: '#FFF27A', onBg: '#FFFFFF', onAccent: '#C2185B', ink: '#3A1424', price: '#D63A72' },
  { id: 'purple', name: 'Tím mỹ phẩm', bg: '#6A1B9A', bg2: '#4C1170', accent: '#F9C9DD', onBg: '#FFFFFF', onAccent: '#5A1585', ink: '#2A0F3A', price: '#7B1FA2' },
  { id: 'blue', name: 'Xanh điện máy', bg: '#0D4FB3', bg2: '#083A86', accent: '#FFD400', onBg: '#FFFFFF', onAccent: '#0D3A80', ink: '#0B1C36', price: '#0D4FB3' },
  { id: 'orange', name: 'Cam năng động', bg: '#FF6A00', bg2: '#E05300', accent: '#FFFFFF', onBg: '#FFFFFF', onAccent: '#E05300', ink: '#2A1406', price: '#E85A00' },
  { id: 'black', name: 'Đen vàng cao cấp', bg: '#151515', bg2: '#000000', accent: '#F5C542', onBg: '#FFFFFF', onAccent: '#151515', ink: '#151515', price: '#151515' },
];
export const stPalette = (id: string) => ST_PALETTES.find((p) => p.id === id) || ST_PALETTES[0];

export interface StFont { id: string; name: string; family: string; weight: number; ls?: number }
export const ST_FONTS: StFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, ls: 0.01 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const stFont = (id: string) => ST_FONTS.find((f) => f.id === id) || ST_FONTS[0];

// ---------- ngành + chữ mẫu ----------
export type Industry = 'grocery' | 'pharmacy' | 'baby' | 'beauty' | 'electronics';
export const ST_INDUSTRIES: { id: Industry; name: string }[] = [
  { id: 'grocery', name: 'Tạp hoá / minimart' }, { id: 'pharmacy', name: 'Nhà thuốc' }, { id: 'baby', name: 'Mẹ & bé' },
  { id: 'beauty', name: 'Mỹ phẩm' }, { id: 'electronics', name: 'Điện máy' },
];
export type StData = Record<string, string>;
export interface StField { key: string; label: string; ph?: string; kinds: StKind[]; multiline?: boolean; half?: boolean }
export const ST_FIELDS: StField[] = [
  { key: 'brand', label: 'Tên cửa hàng', kinds: ['wobbler', 'strip', 'price', 'dangler'], half: true },
  { key: 'hotline', label: 'Hotline', kinds: ['strip', 'dangler'], half: true },
  { key: 'eyebrow', label: 'Dòng nhỏ trên', kinds: ['wobbler', 'dangler'], half: true },
  { key: 'headline', label: 'Chữ chính (to)', kinds: ['wobbler', 'strip', 'dangler'], half: true },
  { key: 'value', label: 'Con số nổi bật (vd -30%)', kinds: ['wobbler', 'strip', 'dangler'], half: true },
  { key: 'sub', label: 'Dòng phụ / điều kiện', kinds: ['wobbler', 'strip', 'dangler'], half: true },
  { key: 'cta', label: 'Ưu đãi kèm (mặt sau / dải)', kinds: ['strip', 'dangler'], half: true },
  { key: 'tagLabel', label: 'Nhãn trên tem giá', kinds: ['price'], half: true },
  { key: 'items', label: 'Danh sách sản phẩm — mỗi dòng: Tên SP | Giá cũ | Giá mới | Quy cách', kinds: ['price'], multiline: true },
];
export const ST_SAMPLES: Record<Industry, StData> = {
  grocery: {
    brand: 'Minimart An Khang', hotline: '0909 123 456', eyebrow: 'Khuyến mãi', headline: 'Giảm sốc', value: '-30%',
    sub: 'Áp dụng đến 31/12/2026', cta: 'Mua 2 tặng 1', tagLabel: 'GIÁ SỐC',
    items: 'Nước mắm cá cơm 500ml | 45.000 | 35.000 | Chai 500ml\nMì gói tôm chua cay | 4.500 | 3.900 | Gói 75g\nDầu ăn đậu nành | 52.000 | 46.000 | Chai 1 lít\nGạo thơm lài | 145.000 | 129.000 | Túi 5kg\nSữa tươi ít đường | 33.000 | 29.000 | Lốc 4 hộp 180ml\nBánh quy bơ | 65.000 | 55.000 | Hộp 300g',
  },
  pharmacy: {
    brand: 'Nhà thuốc Thu Hà', hotline: '0938 456 789', eyebrow: 'Chăm sóc sức khoẻ', headline: 'Ưu đãi', value: '-20%',
    sub: 'Vitamin & thực phẩm chức năng', cta: 'Tư vấn miễn phí', tagLabel: 'GIÁ TỐT',
    items: 'Vitamin C 1000mg | 120.000 | 99.000 | Hộp 30 viên\nKhẩu trang y tế 4 lớp | 45.000 | 38.000 | Hộp 50 cái\nNước muối sinh lý | 6.000 | 5.000 | Chai 500ml\nDầu gió xanh | 28.000 | 24.000 | Chai 12ml\nBăng cá nhân | 25.000 | 21.000 | Hộp 100 miếng\nKẹo ngậm thảo dược | 35.000 | 29.000 | Hộp 20 viên',
  },
  baby: {
    brand: 'Mẹ & Bé Gia Khánh', hotline: '0912 345 678', eyebrow: 'Tuần lễ vàng', headline: 'Siêu hot', value: '-25%',
    sub: 'Tã, sữa, đồ dùng cho bé', cta: 'Mua 2 tặng 1', tagLabel: 'GIÁ YÊU THƯƠNG',
    items: 'Tã quần size L | 359.000 | 299.000 | Gói 54 miếng\nSữa bột cho bé 1–3 tuổi | 520.000 | 465.000 | Lon 900g\nKhăn ướt không mùi | 45.000 | 36.000 | Gói 100 tờ\nBình sữa cổ rộng | 189.000 | 159.000 | 240ml\nNước giặt đồ em bé | 165.000 | 139.000 | Túi 2 lít\nBánh ăn dặm | 69.000 | 59.000 | Hộp 50g',
  },
  beauty: {
    brand: 'Thu Hà Beauty', hotline: '0977 222 333', eyebrow: 'Best seller', headline: 'Deal xinh', value: '-40%',
    sub: 'Mỹ phẩm chính hãng', cta: 'Tặng mẫu thử', tagLabel: 'GIÁ ƯU ĐÃI',
    items: 'Sữa rửa mặt dịu nhẹ | 185.000 | 139.000 | Tuýp 150ml\nKem chống nắng SPF50 | 320.000 | 259.000 | Tuýp 50ml\nSerum dưỡng ẩm | 450.000 | 359.000 | Chai 30ml\nSon kem lì | 210.000 | 169.000 | Thỏi 4g\nNước tẩy trang | 159.000 | 119.000 | Chai 400ml\nMặt nạ giấy | 25.000 | 19.000 | Miếng',
  },
  electronics: {
    brand: 'Điện máy Quốc Bảo', hotline: '1900 6868', eyebrow: 'Giá rẻ chưa từng có', headline: 'Trả góp 0%', value: '-15%',
    sub: 'Bảo hành chính hãng 24 tháng', cta: 'Giao lắp miễn phí', tagLabel: 'GIÁ ĐẶC BIỆT',
    items: 'Nồi cơm điện 1.8L | 1.290.000 | 990.000 | Bảo hành 12 tháng\nQuạt đứng 5 cánh | 790.000 | 650.000 | 55W\nẤm siêu tốc 1.7L | 350.000 | 279.000 | Inox 304\nMáy sấy tóc | 450.000 | 359.000 | 1800W\nBàn ủi hơi nước | 590.000 | 490.000 | 2000W\nNồi chiên không dầu 5L | 2.190.000 | 1.690.000 | Bảo hành 24 tháng',
  },
};

// ---------- spec + mẫu ----------
export type Deco = 'rays' | 'dots' | 'stripes' | 'confetti';
export interface StSpec {
  kind: StKind; wob: WobShape; dan: DanShape; tag: TagSize;
  palette: string; font: string; industry: Industry; deco: Deco; focus: 'value' | 'word';
}
export const defaultStSpec: StSpec = { kind: 'wobbler', wob: 'burst', dan: 'burst', tag: 't60', palette: 'red', font: 'montserrat', industry: 'grocery', deco: 'rays', focus: 'value' };
export interface StTemplate { id: string; name: string; spec: Partial<StSpec> & { kind: StKind; industry: Industry } }
export const ST_TEMPLATES: StTemplate[] = [
  { id: 'wob-sale', name: 'Wobbler SALE nổ', spec: { kind: 'wobbler', wob: 'burst', palette: 'red', industry: 'grocery', deco: 'rays', focus: 'value', font: 'montserrat' } },
  { id: 'wob-arrow', name: 'Wobbler mũi tên giá sốc', spec: { kind: 'wobbler', wob: 'arrow', palette: 'yellow', industry: 'grocery', deco: 'stripes', focus: 'value', font: 'oswald' } },
  { id: 'wob-pharma', name: 'Wobbler tròn nhà thuốc', spec: { kind: 'wobbler', wob: 'circle100', palette: 'green', industry: 'pharmacy', deco: 'dots', focus: 'value', font: 'bvp' } },
  { id: 'wob-baby', name: 'Wobbler bong bóng mẹ bé', spec: { kind: 'wobbler', wob: 'bubble', palette: 'pink', industry: 'baby', deco: 'confetti', focus: 'word', font: 'baloo' } },
  { id: 'wob-beauty', name: 'Wobbler tròn mỹ phẩm', spec: { kind: 'wobbler', wob: 'circle80', palette: 'purple', industry: 'beauty', deco: 'confetti', focus: 'word', font: 'montserrat' } },
  { id: 'strip-sale', name: 'Shelf strip khuyến mãi', spec: { kind: 'strip', palette: 'red', industry: 'grocery', deco: 'stripes', font: 'montserrat' } },
  { id: 'strip-elec', name: 'Shelf strip điện máy', spec: { kind: 'strip', palette: 'blue', industry: 'electronics', deco: 'dots', font: 'oswald' } },
  { id: 'strip-pharma', name: 'Shelf strip nhà thuốc', spec: { kind: 'strip', palette: 'green', industry: 'pharmacy', deco: 'dots', font: 'bvp' } },
  { id: 'tag-shock', name: 'Tem giá sốc vàng đen', spec: { kind: 'price', tag: 't60', palette: 'yellow', industry: 'grocery', font: 'oswald' } },
  { id: 'tag-pharma', name: 'Tem giá nhà thuốc', spec: { kind: 'price', tag: 't90', palette: 'green', industry: 'pharmacy', font: 'bvp' } },
  { id: 'dan-sale', name: 'Bảng treo siêu sale', spec: { kind: 'dangler', dan: 'burst', palette: 'red', industry: 'grocery', deco: 'rays', focus: 'value', font: 'montserrat' } },
  { id: 'dan-baby', name: 'Bảng treo tròn mẹ bé', spec: { kind: 'dangler', dan: 'circle', palette: 'pink', industry: 'baby', deco: 'confetti', focus: 'word', font: 'baloo' } },
  { id: 'dan-elec', name: 'Bảng treo điện máy', spec: { kind: 'dangler', dan: 'rect', palette: 'blue', industry: 'electronics', deco: 'stripes', focus: 'value', font: 'oswald' } },
];

// ---------- giá ----------
export function parsePrice(s: string): number {
  const t = (s || '').toLowerCase().replace(/\s/g, '');
  if (!t) return 0;
  const k = /k$/.test(t) || /nghìn|ngàn/.test(t);
  const n = Number(t.replace(/[^\d]/g, '')) || 0;
  return k && n < 100000 ? n * 1000 : n;
}
export const fmtPrice = (n: number) => (n ? `${n.toLocaleString('vi-VN').replace(/,/g, '.')}đ` : '');
export interface StItem { name: string; old: number; now: number; spec: string; pct: number }
export function parseItems(s: string): StItem[] {
  return (s || '').split('\n').map((ln) => ln.trim()).filter(Boolean).map((ln) => {
    const [name = '', a = '', b = '', spec = ''] = ln.split('|').map((x) => x.trim());
    let old = parsePrice(a), now = parsePrice(b);
    if (!now && old) { now = old; old = 0; }
    const pct = old > now && now > 0 ? Math.round(((old - now) / old) * 100) : 0;
    return { name, old: pct ? old : 0, now, spec, pct };
  }).slice(0, 400);
}

// ---------- hình học (mm) ----------
type Span = (y0: number, y1: number) => [number, number] | null;
export interface Shape { W: number; H: number; d: string; holes: { cx: number; cy: number; r: number }[]; span: Span; top: number; bottom: number }

const f1 = (n: number) => +n.toFixed(2);
const circlePath = (cx: number, cy: number, r: number) => `M${f1(cx - r)} ${f1(cy)}a${f1(r)} ${f1(r)} 0 1 0 ${f1(r * 2)} 0a${f1(r)} ${f1(r)} 0 1 0 ${f1(-r * 2)} 0Z`;
const rrPath = (x: number, y: number, w: number, h: number, r: number) => `M${f1(x + r)} ${f1(y)}H${f1(x + w - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(y + h - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w - r)} ${f1(y + h)}H${f1(x + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x)} ${f1(y + h - r)}V${f1(y + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(y)}Z`;
function burstPath(cx: number, cy: number, R: number, r: number, n: number): string {
  // ngôi sao nổ: đỉnh bo nhẹ bằng đường cong bậc 2 qua từng đỉnh
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2, rr = i % 2 ? r : R;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let d = '';
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], m0 = mid(pts[(i - 1 + pts.length) % pts.length], p), m1 = mid(p, pts[(i + 1) % pts.length]);
    d += `${i ? 'L' : 'M'}${f1(m0[0])} ${f1(m0[1])}Q${f1(p[0])} ${f1(p[1])} ${f1(m1[0])} ${f1(m1[1])}`;
  }
  return d + 'Z';
}
const circleSpan = (cx: number, cy: number, rho: number): Span => (y0, y1) => {
  const dy = Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy));
  if (dy >= rho) return null;
  const h = Math.sqrt(rho * rho - dy * dy);
  return [cx - h, cx + h];
};
const rectSpan = (x0: number, x1: number, yA: number, yB: number): Span => (y0, y1) => (y0 < yA - 0.01 || y1 > yB + 0.01 ? null : [x0, x1]);

export function wobShape(id: WobShape): Shape {
  if (id === 'circle80' || id === 'circle100') {
    const D = id === 'circle80' ? 80 : 100, R = D / 2, m = D * 0.07;
    return { W: D, H: D, d: circlePath(R, R, R), holes: [], span: circleSpan(R, R, R - m), top: R - (R - m) * 0.88, bottom: R + (R - m) * 0.88 };
  }
  if (id === 'burst') {
    const D = 100, R = D / 2;
    return { W: D, H: D, d: burstPath(R, R, R, R * 0.86, 18), holes: [], span: circleSpan(R, R, R * 0.8 - 2.5), top: R - (R * 0.8 - 2.5) * 0.88, bottom: R + (R * 0.8 - 2.5) * 0.88 };
  }
  if (id === 'arrow') {
    const W = 120, H = 70, bx = W * 0.66, b0 = H * 0.17, b1 = H * 0.83;
    const d = `M${f1(6)} ${f1(b0)}H${f1(bx)}V2L${W - 2} ${H / 2}L${f1(bx)} ${H - 2}V${f1(b1)}H6Q2 ${f1(b1)} 2 ${f1(b1 - 4)}V${f1(b0 + 4)}Q2 ${f1(b0)} 6 ${f1(b0)}Z`;
    return { W, H, d, holes: [], span: rectSpan(6, bx + 3, b0 + 3, b1 - 3), top: b0 + 3, bottom: b1 - 3 };
  }
  // bubble
  const W = 100, H = 84, bh = H * 0.8;
  const d = `${rrPath(1, 1, W - 2, bh, 16).replace(/Z$/, '')}Z M${f1(W * 0.2)} ${f1(bh - 1)}L${f1(W * 0.12)} ${H - 1}L${f1(W * 0.42)} ${f1(bh - 1)}Z`;
  // gộp đuôi vào thân: vẽ 1 nét liền để bế 1 đường
  const one = `M17 1H${W - 17}A16 16 0 0 1 ${W - 1} 17V${f1(bh - 15)}A16 16 0 0 1 ${W - 17} ${f1(bh + 1)}H${f1(W * 0.42)}L${f1(W * 0.12)} ${H - 1}L${f1(W * 0.2)} ${f1(bh + 1)}H17A16 16 0 0 1 1 ${f1(bh - 15)}V17A16 16 0 0 1 17 1Z`;
  void d;
  return { W, H, d: one, holes: [], span: rectSpan(8, W - 8, 7, bh - 6), top: 7, bottom: bh - 6 };
}
export function danShape(id: DanShape): Shape {
  const hole = (W: number) => [{ cx: W / 2, cy: 9, r: 2.5 }];
  if (id === 'circle') {
    const D = 200, R = 100, m = 13;
    return { W: D, H: D, d: circlePath(R, R, R), holes: hole(D), span: circleSpan(R, R, R - m), top: Math.max(22, R - (R - m) * 0.88), bottom: R + (R - m) * 0.88 };
  }
  if (id === 'rect') {
    const W = 200, H = 280;
    return { W, H, d: rrPath(0, 0, W, H, 12), holes: hole(W), span: rectSpan(13, W - 13, 22, H - 13), top: 22, bottom: H - 13 };
  }
  const D = 220, R = 110;
  return { W: D, H: D, d: burstPath(R, R, R, R * 0.86, 20), holes: [{ cx: R, cy: R * 0.14 + 11, r: 2.5 }], span: circleSpan(R, R, R * 0.8 - 4), top: Math.max(R * 0.14 + 20, R - (R * 0.8 - 4) * 0.88), bottom: R + (R * 0.8 - 4) * 0.88 };
}
export const tagSize = (id: TagSize) => TAG_SIZES.find((t) => t.id === id) || TAG_SIZES[0];

// ---------- chữ: xếp chồng & co vừa vùng an toàn ----------
interface SL { text: string; fam: string; wt: number; size: number; fill: string; ls?: number; role: string; shadow?: string; upper?: boolean }
interface Placed extends SL { x: number; y: number; base: number; h: number }
const LH = 1.22, BASE = 0.98;
function layoutStack(lines: SL[], top: number, bot: number, span: Span, gapK = 0.16): Placed[] {
  const ls = lines.filter((l) => (l.text || '').trim()).map((l) => ({ ...l, text: l.upper ? l.text.toUpperCase() : l.text.trim() }));
  if (!ls.length) return [];
  const avail = bot - top;
  let sizes = ls.map((l) => l.size);
  let out: Placed[] = [];
  for (let pass = 0; pass < 6; pass++) {
    const hs = sizes.map((s) => s * LH);
    const gaps = sizes.slice(0, -1).map((s, i) => Math.min(s, sizes[i + 1]) * gapK);
    const total = hs.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0);
    if (total > avail) { const k = avail / total; sizes = sizes.map((s) => s * k); continue; }
    let y = top + (avail - total) / 2;
    out = [];
    let shrunk = false;
    for (let i = 0; i < ls.length; i++) {
      const l = ls[i], s = sizes[i], h = s * LH;
      const sp = span(y, y + h);
      if (!sp) { sizes = sizes.map((v) => v * 0.9); shrunk = true; out = []; break; }
      const maxW = (sp[1] - sp[0]) * 0.96;
      const w = textW(l.text, s, { fam: l.fam, wt: l.wt, ls: (l.ls || 0) * s });
      if (w > maxW) { sizes[i] = (s * maxW) / w; shrunk = true; }
      out.push({ ...l, size: sizes[i], x: (sp[0] + sp[1]) / 2, y, base: y + sizes[i] * BASE + (s - sizes[i]) * LH * 0.5, h });
      y += h + (i < gaps.length ? gaps[i] : 0);
    }
    if (!shrunk) return out;
  }
  return out;
}
// dòng quá dài so với bề ngang hình → tách 2 dòng cân nhau (thay vì co chữ tới mức không đọc được)
function splitLong(lines: SL[], sh: Shape): SL[] {
  const mid = (sh.top + sh.bottom) / 2, sp = sh.span(mid - 1, mid + 1);
  const maxW = sp ? (sp[1] - sp[0]) * 0.86 : sh.W * 0.7;
  const out: SL[] = [];
  for (const l of lines) {
    const text = (l.upper ? l.text.toUpperCase() : l.text).trim();
    const words = text.split(/\s+/).filter(Boolean);
    const w = textW(text, l.size, { fam: l.fam, wt: l.wt, ls: (l.ls || 0) * l.size });
    // chỉ tách khi co 1 dòng sẽ quá nhỏ (dài hơn 1,3× bề ngang); dòng to (chữ chính, con số) ưu tiên co thay vì tách
    const lim = l.role === 'value' || l.role === 'headline' || l.role === 'cta' ? 1.6 : 1.25;
    if (words.length < 2 || w <= maxW * lim) { out.push(l); continue; }
    let best = 1, bestW = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const m = Math.max(textW(a, l.size, { fam: l.fam, wt: l.wt }), textW(b, l.size, { fam: l.fam, wt: l.wt }));
      const short = Math.min(a.length, b.length) < 5; // tránh 1 chữ cụt lẻ loi (vd "TRẢ / GÓP 0%")
      const score = m * (short ? 1.35 : 1);
      if (score < bestW) { bestW = score; best = i; }
    }
    const k = l.role === 'value' || l.role === 'headline' || l.role === 'cta' ? 0.82 : 1;
    out.push({ ...l, text: words.slice(0, best).join(' '), size: l.size * k, upper: false }, { ...l, text: words.slice(best).join(' '), size: l.size * k, upper: false, role: `${l.role}2`, shadow: l.shadow });
  }
  return out;
}

function renderPlaced(ps: Placed[]): ReactNode {
  return ps.map((p, i) => {
    const common = { x: f1(p.x), y: f1(p.base), fontSize: f1(p.size), fontFamily: `"${p.fam}"`, fontWeight: p.wt, textAnchor: 'middle' as const, letterSpacing: p.ls ? f1(p.ls * p.size) : undefined };
    return (
      <g key={i}>
        {p.shadow && <text {...common} x={f1(p.x + p.size * 0.045)} y={f1(p.base + p.size * 0.05)} fill={p.shadow} data-shadow="1">{p.text}</text>}
        <text {...common} fill={p.fill} data-role={p.role}>{p.text}</text>
      </g>
    );
  });
}
function fitOne(text: string, maxW: number, size: number, fam: string, wt: number, ls = 0) {
  const w = textW(text, size, { fam, wt, ls: ls * size });
  return w > maxW ? (size * maxW) / w : size;
}

// ---------- hoạ tiết nền ----------
function decoNode(deco: Deco, p: StPalette, W: number, H: number, b: number, seed = 3): ReactNode {
  const x0 = -b, y0 = -b, x1 = W + b, y1 = H + b;
  if (deco === 'rays') {
    const cx = W / 2, cy = H / 2, R = Math.hypot(W, H), n = 24;
    let d = '';
    for (let i = 0; i < n; i += 2) {
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
      d += `M${f1(cx)} ${f1(cy)}L${f1(cx + Math.cos(a0) * R)} ${f1(cy + Math.sin(a0) * R)}L${f1(cx + Math.cos(a1) * R)} ${f1(cy + Math.sin(a1) * R)}Z`;
    }
    return <path d={d} fill={p.bg2} opacity={0.55} />;
  }
  if (deco === 'dots') {
    const step = Math.max(3.2, Math.min(W, H) / 16), out: ReactNode[] = [];
    for (let y = y0; y <= y1; y += step) for (let x = x0 + ((Math.round((y - y0) / step) % 2) * step) / 2; x <= x1; x += step) {
      const t = Math.min(1, Math.hypot(x - W, y - H) / Math.hypot(W, H) * 1.3);
      const r = step * 0.42 * (1 - t);
      if (r > 0.25) out.push(<circle key={`${x}-${y}`} cx={f1(x)} cy={f1(y)} r={f1(r)} />);
    }
    return <g fill={p.bg2} opacity={0.7}>{out}</g>;
  }
  if (deco === 'stripes') {
    const s = Math.max(5, Math.min(W, H) / 7), out: string[] = [];
    for (let x = x0 - (y1 - y0); x < x1; x += s * 2) out.push(`M${f1(x)} ${f1(y1)}L${f1(x + (y1 - y0))} ${f1(y0)}l${f1(s)} 0L${f1(x + s)} ${f1(y1)}Z`);
    return <path d={out.join('')} fill={p.bg2} opacity={0.5} />;
  }
  // confetti
  let sd = seed * 9301 + 49297;
  const rnd = () => ((sd = (sd * 9301 + 49297) % 233280) / 233280);
  const n = Math.round((W * H) / 260) + 12, out: ReactNode[] = [];
  const cols = [p.accent, '#FFFFFF', p.bg2];
  for (let i = 0; i < n; i++) {
    const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0), s = Math.min(W, H) * (0.018 + rnd() * 0.022), c = cols[i % 3], k = i % 3;
    // chừa vùng chữ ở giữa: hoa giấy chỉ rắc quanh viền
    const ex = (x - W / 2) / (W / 2), ey = (y - H / 2) / (H / 2);
    if (ex * ex + ey * ey < 0.62) continue;
    out.push(k === 0
      ? <circle key={i} cx={f1(x)} cy={f1(y)} r={f1(s * 0.55)} fill={c} opacity={0.75} />
      : <rect key={i} x={f1(x)} y={f1(y)} width={f1(s * 1.5)} height={f1(s * 0.55)} fill={c} opacity={0.75} transform={`rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})`} />);
  }
  return <g>{out}</g>;
}
// lấp lánh 4 cánh
const sparkle = (cx: number, cy: number, r: number) => `M${f1(cx)} ${f1(cy - r)}Q${f1(cx + r * 0.16)} ${f1(cy - r * 0.16)} ${f1(cx + r)} ${f1(cy)}Q${f1(cx + r * 0.16)} ${f1(cy + r * 0.16)} ${f1(cx)} ${f1(cy + r)}Q${f1(cx - r * 0.16)} ${f1(cy + r * 0.16)} ${f1(cx - r)} ${f1(cy)}Q${f1(cx - r * 0.16)} ${f1(cy - r * 0.16)} ${f1(cx)} ${f1(cy - r)}Z`;

// ---------- vỏ chung: nền hình bế + hoạ tiết (mask theo hình, có lề xén), lớp bế ----------
export interface BodyOpts { bleed?: number; cut?: boolean; uid: string; transparentHoles?: boolean }
function shell(sh: Shape, p: StPalette, deco: Deco, o: BodyOpts, content: ReactNode, extra?: ReactNode): ReactNode {
  const b = o.bleed || 0, mid = `${o.uid}-m`;
  return (
    <>
      <defs>
        <mask id={mid} maskUnits="userSpaceOnUse" x={-b - 1} y={-b - 1} width={sh.W + b * 2 + 2} height={sh.H + b * 2 + 2}>
          <path d={sh.d} fill="#fff" stroke="#fff" strokeWidth={b * 2} strokeLinejoin="round" />
          {o.transparentHoles && sh.holes.map((h, i) => <circle key={i} cx={h.cx} cy={h.cy} r={h.r} fill="#000" />)}
        </mask>
      </defs>
      <g mask={`url(#${mid})`}>
        <rect x={-b - 1} y={-b - 1} width={sh.W + b * 2 + 2} height={sh.H + b * 2 + 2} fill={p.bg} />
        {decoNode(deco, p, sh.W, sh.H, b)}
        {extra}
      </g>
      {content}
      <path d={sh.d} fill="none" stroke={o.cut ? '#EC008C' : 'none'} strokeWidth={0.35} data-cut="1" />
      {sh.holes.map((h, i) => <circle key={i} cx={h.cx} cy={h.cy} r={h.r} fill={o.transparentHoles ? 'none' : '#FFFFFF'} stroke={o.cut ? '#EC008C' : '#00000033'} strokeWidth={0.3} data-hole="1" />)}
    </>
  );
}

// nội dung khuyến mãi xếp chồng (wobbler, mặt trước bảng treo)
function promoLines(spec: StSpec, data: StData, p: StPalette, base: number): SL[] {
  const f = stFont(spec.font);
  const disp = { fam: f.family, wt: f.weight, ls: f.ls };
  const word = spec.focus === 'word';
  return [
    { role: 'eyebrow', text: data.eyebrow || '', fam: BODY, wt: 800, size: base * 0.1, fill: p.onBg, ls: 0.06, upper: true },
    { role: 'headline', text: data.headline || '', ...disp, size: base * (word ? 0.3 : 0.17), fill: word ? p.accent : p.onBg, upper: true, shadow: word ? p.bg2 : undefined },
    { role: 'value', text: data.value || '', ...disp, size: base * (word ? 0.19 : 0.33), fill: word ? p.onBg : p.accent, shadow: word ? undefined : p.bg2 },
    { role: 'sub', text: data.sub || '', fam: BODY, wt: 600, size: base * 0.068, fill: p.onBg },
    { role: 'brand', text: data.brand || '', fam: BODY, wt: 800, size: base * 0.068, fill: p.onBg, upper: true, ls: 0.03 },
  ];
}

export function wobblerBody(spec: StSpec, data: StData, o: BodyOpts): { sh: Shape; node: ReactNode } {
  const sh = wobShape(spec.wob), p = stPalette(spec.palette);
  const base = Math.min(sh.W, sh.H) * (spec.wob === 'arrow' ? 1.25 : 1);
  let lines = promoLines(spec, data, p, base);
  if (spec.wob === 'arrow') lines = lines.filter((l) => l.role !== 'brand'); // thân mũi tên thấp: bỏ tên cửa hàng
  const placed = layoutStack(splitLong(lines, sh), sh.top, sh.bottom, sh.span);
  const extra = spec.wob === 'arrow'
    ? <path d={sparkle(sh.W * 0.83, sh.H / 2, 7)} fill={p.accent} opacity={0.9} />
    : spec.wob === 'bubble' ? <path d={sparkle(sh.W * 0.86, 13, 5)} fill={p.accent} /> : null;
  return { sh, node: shell(sh, p, spec.deco, o, renderPlaced(placed), extra) };
}

export function danglerBody(spec: StSpec, data: StData, side: 'front' | 'back', o: BodyOpts): { sh: Shape; node: ReactNode } {
  const sh = danShape(spec.dan), p = stPalette(spec.palette), f = stFont(spec.font);
  const base = Math.min(sh.W, sh.H) * 0.95;
  const lines: SL[] = side === 'front' ? promoLines(spec, data, p, base) : [
    { role: 'eyebrow', text: 'Ưu đãi tại', fam: BODY, wt: 800, size: base * 0.07, fill: p.onBg, ls: 0.06, upper: true },
    { role: 'brand', text: data.brand || '', fam: f.family, wt: f.weight, ls: f.ls, size: base * 0.14, fill: p.onBg, upper: true },
    { role: 'cta', text: data.cta || '', fam: f.family, wt: f.weight, ls: f.ls, size: base * 0.2, fill: p.accent, shadow: p.bg2, upper: true },
    { role: 'sub', text: data.sub || '', fam: BODY, wt: 600, size: base * 0.06, fill: p.onBg },
    { role: 'hotline', text: data.hotline ? `Hotline ${data.hotline}` : '', fam: BODY, wt: 800, size: base * 0.075, fill: p.onBg },
  ];
  const placed = layoutStack(splitLong(lines, sh), sh.top, sh.bottom, sh.span);
  return { sh, node: shell(sh, p, side === 'back' ? (spec.deco === 'rays' ? 'dots' : spec.deco) : spec.deco, o, renderPlaced(placed)) };
}

// shelf strip: các ô 250mm lặp lại (ô lẻ: chữ chính + phụ; ô chẵn: ưu đãi kèm + hotline) + huy hiệu con số
export function stripBody(spec: StSpec, data: StData, o: BodyOpts): { sh: Shape; node: ReactNode } {
  const W = STRIP_W, H = STRIP_H, p = stPalette(spec.palette), f = stFont(spec.font);
  const sh: Shape = { W, H, d: `M0 0H${W}V${H}H0Z`, holes: [], span: rectSpan(0, W, 0, H), top: 0, bottom: H };
  const U = 250, units: ReactNode[] = [];
  const brand = (data.brand || '').toUpperCase();
  for (let i = 0; i < W / U; i++) {
    const x0 = i * U;
    // huy hiệu tên cửa hàng (viên thuốc trắng)
    const bS = fitOne(brand, 74, 6, BODY, 800, 0.02);
    const bw = Math.max(30, Math.min(82, textW(brand, bS, { fam: BODY, wt: 800, ls: 0.02 * bS }) + 9));
    const alt = i % 2 === 1;
    const main = alt ? (data.cta || data.headline || '') : (data.headline || '');
    const second = alt ? (data.hotline ? `Hotline ${data.hotline}` : data.sub || '') : (data.sub || '');
    const tx0 = x0 + 6 + bw + 7, tx1 = x0 + U - 44;
    const mS = fitOne(main.toUpperCase(), tx1 - tx0, 15.5, f.family, f.weight, f.ls || 0);
    const sS = fitOne(second, tx1 - tx0, 6.2, BODY, 600);
    const vx = x0 + U - 21, vy = H / 2;
    const val = data.value || '';
    const vS = fitOne(val, 25, 12.5, f.family, f.weight, f.ls || 0);
    units.push(
      <g key={i}>
        <rect x={f1(x0 + 6)} y={8.5} width={f1(bw)} height={22} rx={11} fill={p.onBg} />
        <text x={f1(x0 + 6 + bw / 2)} y={f1(19.5 + bS * 0.36)} fontSize={f1(bS)} fontFamily={`"${BODY}"`} fontWeight={800} fill={p.id === 'yellow' ? '#FFD200' : p.bg} textAnchor="middle" letterSpacing={f1(0.02 * bS)} data-role="brand">{brand}</text>
        <text x={f1(tx0)} y={f1(4 + mS * 0.98)} fontSize={f1(mS)} fontFamily={`"${f.family}"`} fontWeight={f.weight} fill={alt ? p.accent : p.onBg} letterSpacing={f.ls ? f1(f.ls * mS) : undefined} data-role="headline">{main.toUpperCase()}</text>
        {second && <text x={f1(tx0)} y={f1(Math.min(H - 4.2, 4 + mS * 1.22 + sS * 1.05))} fontSize={f1(sS)} fontFamily={`"${BODY}"`} fontWeight={600} fill={p.onBg} data-role="sub">{second}</text>}
        <path d={burstPath(vx, vy, 17.5, 15.2, 14)} fill={p.accent} />
        <text x={f1(vx)} y={f1(vy + vS * 0.36)} fontSize={f1(vS)} fontFamily={`"${f.family}"`} fontWeight={f.weight} fill={p.onAccent} textAnchor="middle" data-role="value">{val}</text>
        {i < W / U - 1 && <path d={`M${x0 + U - 1.5} 6l3.5 13.5l-3.5 13.5`} fill="none" stroke={p.onBg} strokeOpacity={0.45} strokeWidth={1.1} strokeLinecap="round" />}
      </g>,
    );
  }
  return { sh, node: shell(sh, p, spec.deco, o, <g>{units}</g>) };
}

// tem giá: dải màu trên (tên cửa hàng + nhãn), tên SP, quy cách, giá cũ gạch, giá mới to, huy hiệu % giảm
export function priceBody(spec: StSpec, data: StData, item: StItem, o: BodyOpts): { sh: Shape; node: ReactNode } {
  const ts = tagSize(spec.tag), W = ts.w, H = ts.h, p = stPalette(spec.palette), f = stFont(spec.font);
  const b = o.bleed || 0, mid = `${o.uid}-m`;
  const sh: Shape = { W, H, d: rrPath(0, 0, W, H, 1.5), holes: [], span: rectSpan(0, W, 0, H), top: 0, bottom: H };
  const band = 8.5, m = 2.8;
  let brand = (data.brand || '').toUpperCase(), label = (data.tagLabel || '').toUpperCase();
  const lS = fitOne(label, W * 0.5, 3.4, BODY, 800, 0.04);
  let lw = label ? textW(label, lS, { fam: BODY, wt: 800, ls: 0.04 * lS }) : 0;
  let bS = fitOne(brand, W - m * 2 - lw - 3, 2.9, BODY, 800, 0.03);
  // tên cửa hàng quá dài: bỏ nhãn → vẫn dài thì cắt bớt chữ + "…" (giữ cỡ chữ ≥ 1,9mm đọc được)
  if (bS < 1.9 && label) { label = ''; lw = 0; bS = fitOne(brand, W - m * 2, 2.9, BODY, 800, 0.03); }
  if (bS < 1.9) {
    const words = brand.split(/\s+/);
    while (words.length > 1 && textW(`${words.join(' ')}…`, 1.9, { fam: BODY, wt: 800, ls: 0.057 }) > W - m * 2) words.pop();
    brand = `${words.join(' ')}…`; bS = fitOne(brand, W - m * 2, 1.9, BODY, 800, 0.03);
  }
  // tên SP: tối đa 2 dòng, co chữ cho vừa
  const name = item.name || '';
  let nS = 3.9, lines: string[] = [];
  const wrap = (s: number) => {
    const out: string[] = []; let cur = '';
    for (const w of name.split(/\s+/).filter(Boolean)) {
      const nx = cur ? `${cur} ${w}` : w;
      if (!cur || textW(nx, s, { fam: BODY, wt: 800 }) <= W - m * 2) cur = nx; else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
    return out;
  };
  for (; nS > 2.2; nS *= 0.93) { lines = wrap(nS); if (lines.length <= 2) break; }
  if (lines.length > 2) lines = [lines[0], lines.slice(1).join(' ')];
  const nameTop = band + 1.6;
  const disc = item.pct > 0;
  const badgeR = 6.2, bcx = m + badgeR, bcy = H - m - badgeR + 0.3;
  const priceTxt = fmtPrice(item.now);
  const pMaxW = W - m * 2 - (disc ? badgeR * 2 + 2.5 : 0);
  const pS = fitOne(priceTxt, pMaxW, 10.5, f.family, f.weight, f.ls || 0);
  const oldTxt = disc ? fmtPrice(item.old) : '';
  const oS = disc ? fitOne(oldTxt, W * 0.45, 3.1, BODY, 600) : 0;
  const oW = disc ? textW(oldTxt, oS, { fam: BODY, wt: 600 }) : 0;
  const specY = nameTop + nS * BASE + (lines.length - 1) * nS * 1.1 + 3.6;
  const specMaxW = W - m * 2 - (disc ? oW + 2.5 : 0);
  const spS = fitOne(item.spec || '', specMaxW, 2.6, BODY, 600);
  const pctTxt = `-${item.pct}%`;
  const pcS = fitOne(pctTxt, badgeR * 1.7, 4.6, f.family, f.weight);
  const priceFill = p.id === 'yellow' ? p.accent : p.price;
  const node = (
    <>
      <defs>
        <mask id={mid} maskUnits="userSpaceOnUse" x={-b - 1} y={-b - 1} width={W + b * 2 + 2} height={H + b * 2 + 2}>
          <path d={sh.d} fill="#fff" stroke="#fff" strokeWidth={b * 2} strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#${mid})`}>
        <rect x={-b - 1} y={-b - 1} width={W + b * 2 + 2} height={H + b * 2 + 2} fill="#FFFFFF" />
        <rect x={-b - 1} y={-b - 1} width={W + b * 2 + 2} height={band + b + 1} fill={p.bg} />
        <rect x={-b - 1} y={H - 1.2} width={W + b * 2 + 2} height={b + 2.2} fill={p.bg} />
      </g>
      <text x={m} y={f1(band / 2 + bS * 0.36)} fontSize={f1(bS)} fontFamily={`"${BODY}"`} fontWeight={800} fill={p.onBg} letterSpacing={f1(0.03 * bS)} data-role="brand">{brand}</text>
      {label && <text x={W - m} y={f1(band / 2 + lS * 0.36)} fontSize={f1(lS)} fontFamily={`"${BODY}"`} fontWeight={800} fill={p.id === 'yellow' ? p.accent : p.accent === '#FFFFFF' ? '#FFFFFF' : p.accent} textAnchor="end" letterSpacing={f1(0.04 * lS)} data-role="label">{label}</text>}
      {lines.map((ln, i) => <text key={i} x={m} y={f1(nameTop + nS * BASE + i * nS * 1.1)} fontSize={f1(fitOne(ln, W - m * 2, nS, BODY, 800))} fontFamily={`"${BODY}"`} fontWeight={800} fill={p.ink} data-role="name">{ln}</text>)}
      {item.spec && <text x={m} y={f1(specY)} fontSize={f1(spS)} fontFamily={`"${BODY}"`} fontWeight={600} fill="#5B6270" data-role="spec">{item.spec}</text>}
      {disc && (
        <g>
          <text x={W - m} y={f1(specY + 0.2)} fontSize={f1(oS)} fontFamily={`"${BODY}"`} fontWeight={600} fill="#7A808C" textAnchor="end" data-role="old">{oldTxt}</text>
          <line x1={f1(W - m - oW - 0.4)} x2={f1(W - m + 0.4)} y1={f1(specY + 0.2 - oS * 0.32)} y2={f1(specY + 0.2 - oS * 0.32)} stroke="#D0211B" strokeWidth={0.45} />
          <path d={burstPath(bcx, bcy, badgeR, badgeR * 0.88, 12)} fill={p.id === 'yellow' ? p.accent : p.bg} />
          <text x={f1(bcx)} y={f1(bcy + pcS * 0.36)} fontSize={f1(pcS)} fontFamily={`"${f.family}"`} fontWeight={f.weight} fill={p.id === 'yellow' ? '#FFFFFF' : p.onBg} textAnchor="middle" data-role="pct">{pctTxt}</text>
        </g>
      )}
      <text x={W - m} y={f1(H - 2.9)} fontSize={f1(pS)} fontFamily={`"${f.family}"`} fontWeight={f.weight} fill={priceFill} textAnchor="end" letterSpacing={f.ls ? f1(f.ls * pS) : undefined} data-role="price">{priceTxt}</text>
      <path d={sh.d} fill="none" stroke={o.cut ? '#EC008C' : 'none'} strokeWidth={0.3} data-cut="1" />
    </>
  );
  return { sh, node };
}

// ---------- component SVG đơn ----------
interface SvgProps { spec: StSpec; data: StData; bleed?: boolean; cut?: boolean; transparent?: boolean; style?: CSSProperties; side?: 'front' | 'back'; item?: StItem; viewBox?: string }
export function bodyOf(spec: StSpec, data: StData, o: BodyOpts & { side?: 'front' | 'back'; item?: StItem }) {
  if (spec.kind === 'strip') return stripBody(spec, data, o);
  if (spec.kind === 'dangler') return danglerBody(spec, data, o.side || 'front', o);
  if (spec.kind === 'price') return priceBody(spec, data, o.item || parseItems(data.items)[0] || { name: 'Sản phẩm', old: 0, now: 0, spec: '', pct: 0 }, o);
  return wobblerBody(spec, data, o);
}
export function StSvg({ spec, data, bleed, cut, transparent, style, side, item, viewBox }: SvgProps) {
  const uid = useId().replace(/:/g, '');
  const b = bleed ? (spec.kind === 'price' ? TAG_BLEED : ST_BLEED) : 0;
  const { sh, node } = bodyOf(spec, data, { uid, bleed: b, cut, transparentHoles: transparent, side, item });
  return (
    <svg viewBox={viewBox || `${-b} ${-b} ${sh.W + b * 2} ${sh.H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-kind={spec.kind}>
      {node}
    </svg>
  );
}

// ---------- tờ in xếp sẵn (lớp In + CutContour) ----------
export interface SheetInfo { sw: number; sh: number; per: number; pages: number; cols: number; rows: number; iw: number; ih: number; gap: number; margin: number; name: string; count: number }
export function sheetInfo(spec: StSpec, data: StData): SheetInfo {
  if (spec.kind === 'strip') return { sw: STRIP_W + 20, sh: STRIP_H + 24, per: 1, pages: 1, cols: 1, rows: 1, iw: STRIP_W, ih: STRIP_H, gap: 0, margin: 10, name: 'dải 1020×63mm', count: 1 };
  if (spec.kind === 'price') {
    const t = tagSize(spec.tag), sw = 210, shh = 297, margin = 8, gap = 3 + TAG_BLEED * 2;
    const cols = Math.max(1, Math.floor((sw - margin * 2 + gap) / (t.w + gap))), rows = Math.max(1, Math.floor((shh - margin * 2 - 8 + gap) / (t.h + gap)));
    const count = Math.max(1, parseItems(data.items).length), per = cols * rows;
    return { sw, sh: shh, per, pages: Math.ceil(count / per), cols, rows, iw: t.w, ih: t.h, gap, margin, name: 'A4', count };
  }
  const s = spec.kind === 'dangler' ? danShape(spec.dan) : wobShape(spec.wob);
  const sw = 320, shh = 450, margin = 10, gap = 6 + ST_BLEED * 2;
  const cols = Math.max(1, Math.floor((sw - margin * 2 + gap) / (s.W + gap))), rows = Math.max(1, Math.floor((shh - margin * 2 - 8 + gap) / (s.H + gap)));
  return { sw, sh: shh, per: cols * rows, pages: 1, cols, rows, iw: s.W, ih: s.H, gap, margin, name: 'SRA3 32×45cm', count: cols * rows };
}
export function StSheetSvg({ spec, data, page = 0, side = 'front', style }: { spec: StSpec; data: StData; page?: number; side?: 'front' | 'back'; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const si = sheetInfo(spec, data);
  const items = spec.kind === 'price' ? parseItems(data.items) : [];
  const b = spec.kind === 'price' ? TAG_BLEED : ST_BLEED;
  const gridW = si.cols * si.iw + (si.cols - 1) * si.gap, gridH = si.rows * si.ih + (si.rows - 1) * si.gap;
  const ox = (si.sw - gridW) / 2, oy = spec.kind === 'strip' ? 12 : si.margin + 8 + (si.sh - si.margin * 2 - 8 - gridH) / 2;
  const slots: { x: number; y: number; it?: StItem; k: number }[] = [];
  for (let r = 0; r < si.rows; r++) for (let c = 0; c < si.cols; c++) {
    const k = page * si.per + r * si.cols + c;
    if (spec.kind === 'price' && k >= items.length) continue;
    // mặt sau bảng treo: đảo cột để in 2 mặt khớp đường bế
    const cc = side === 'back' ? si.cols - 1 - c : c;
    slots.push({ x: ox + cc * (si.iw + si.gap), y: oy + r * (si.ih + si.gap), it: items[k], k });
  }
  const label = spec.kind === 'price'
    ? `Tem giá ${si.iw}×${si.ih}mm · tờ ${page + 1}/${si.pages} · ${si.per} tem/tờ · lề xén ${TAG_BLEED}mm · nét hồng = CutContour`
    : spec.kind === 'strip' ? `Shelf strip ${STRIP_W}×${STRIP_H}mm · lề xén ${ST_BLEED}mm · nét hồng = CutContour`
      : `${spec.kind === 'dangler' ? `Bảng treo trần · mặt ${side === 'front' ? 'trước' : 'sau (đảo cột)'}` : 'Wobbler (cần PVC trong gắn sau)'} · ${si.per} con/tờ ${si.name} · lề xén ${ST_BLEED}mm`;
  return (
    <svg viewBox={`0 0 ${si.sw} ${si.sh}`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet="1">
      <rect width={si.sw} height={si.sh} fill="#FFFFFF" />
      <text x={si.margin} y={spec.kind === 'strip' ? 7 : si.margin + 3} fontSize={spec.kind === 'strip' ? 3.2 : 3.4} fontFamily={`"${BODY}"`} fontWeight={600} fill="#6B7280" data-note="1">{label}</text>
      <g id="In">
        {slots.map((s) => {
          const one = bodyOf(spec, data, { uid: `${uid}-${s.k}`, bleed: b, side, item: s.it });
          return <svg key={s.k} x={f1(s.x - b)} y={f1(s.y - b)} width={f1(si.iw + b * 2)} height={f1(si.ih + b * 2)} viewBox={`${-b} ${-b} ${si.iw + b * 2} ${si.ih + b * 2}`} overflow="hidden">{one.node}</svg>;
        })}
      </g>
      <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.3}>
        {slots.map((s) => {
          const one = bodyOf(spec, data, { uid: `${uid}-c${s.k}`, side, item: s.it });
          return (
            <g key={s.k} transform={`translate(${f1(s.x)} ${f1(s.y)})`}>
              <path d={one.sh.d} />
              {one.sh.holes.map((h, i) => <circle key={i} cx={h.cx} cy={h.cy} r={h.r} />)}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
