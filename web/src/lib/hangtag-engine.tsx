'use client';
// Tag treo quần áo + thẻ cảm ơn: 1 engine SVG = HÌNH BẾ × BỐ CỤC × BẢNG MÀU × FONT → nhiều mẫu, render code 100%.
// Đơn vị: 10 = 1mm. Mặt trước (logo, thương hiệu) + mặt sau (size, giá, mã SP, mã vạch EAN-13, chất liệu, ký hiệu giặt).
// File in: bình nhiều con lên tờ A4/SRA3, nền tràn lề 2mm, lớp CutContour = đường bế (hình + lỗ xỏ dây).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';
import { ean13 } from './pouch-engine';
import { qrPath } from './flyer-qr';

export const U = 10; // đơn vị / mm
export const HT_BLEED_MM = 2;
export const CUTCONTOUR = '#EC008C';
const f1 = (n: number) => Math.round(n * 10) / 10;

// ---------- hình bế ----------
export type HTKind = 'tag' | 'thanks';
export type HTShape = 'rect' | 'round' | 'chamfer' | 'circle' | 'arch' | 'card' | 'a7';
export interface HTShapeInfo { id: HTShape; kind: HTKind; name: string; wMm: number; hMm: number; holeY: number | null; box: [number, number, number, number] }
// box = vùng chữ an toàn (mm): x, y, w, h — đã chừa lỗ xỏ dây + lề 4mm, riêng hình tròn/vòm chừa theo cung
export const HT_SHAPES: HTShapeInfo[] = [
  { id: 'rect', kind: 'tag', name: 'Chữ nhật 50×90', wMm: 50, hMm: 90, holeY: 7, box: [4.5, 13, 41, 73] },
  { id: 'round', kind: 'tag', name: 'Bo góc 45×85', wMm: 45, hMm: 85, holeY: 7, box: [4.5, 13, 36, 68] },
  { id: 'chamfer', kind: 'tag', name: 'Cắt góc 50×90', wMm: 50, hMm: 90, holeY: 7.5, box: [4.5, 14, 41, 72] },
  { id: 'circle', kind: 'tag', name: 'Tròn Ø60', wMm: 60, hMm: 60, holeY: 7.5, box: [10, 13.5, 40, 38] },
  { id: 'arch', kind: 'tag', name: 'Vòm 50×90', wMm: 50, hMm: 90, holeY: 8, box: [5, 17, 40, 69] },
  { id: 'card', kind: 'thanks', name: 'Thẻ 90×55', wMm: 90, hMm: 55, holeY: null, box: [6, 6, 78, 43] },
  { id: 'a7', kind: 'thanks', name: 'Thẻ A7 105×74', wMm: 105, hMm: 74, holeY: null, box: [7, 7, 91, 60] },
];
export const htShape = (id: string) => HT_SHAPES.find((s) => s.id === id) || HT_SHAPES[0];
export const HOLE_R_MM = 2.25; // lỗ Ø4.5mm
const CHAMFER = 10;

/** đường viền hình (đơn vị 0.1mm, gốc = góc trên trái khổ thành phẩm). inset > 0 thu vào, < 0 nở ra (lề xén). */
export function shapePath(shape: HTShape, inset = 0): string {
  const s = htShape(shape);
  const W = s.wMm * U, H = s.hMm * U, i = inset * U;
  const rr = (r: number) => {
    const R = Math.max(0, r * U - i);
    return `M${f1(i + R)} ${f1(i)}H${f1(W - i - R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(W - i)} ${f1(i + R)}V${f1(H - i - R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(W - i - R)} ${f1(H - i)}H${f1(i + R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(i)} ${f1(H - i - R)}V${f1(i + R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(i + R)} ${f1(i)}Z`;
  };
  switch (shape) {
    case 'round': return rr(5);
    case 'card': case 'a7': return rr(3);
    case 'circle': { const R = W / 2 - i, c = W / 2; return `M${f1(c - R)} ${f1(c)}A${f1(R)} ${f1(R)} 0 1 1 ${f1(c + R)} ${f1(c)}A${f1(R)} ${f1(R)} 0 1 1 ${f1(c - R)} ${f1(c)}Z`; }
    case 'chamfer': {
      const k = CHAMFER * U + i * (Math.SQRT2 - 1);
      return `M${f1(k)} ${f1(i)}H${f1(W - k)}L${f1(W - i)} ${f1(k)}V${f1(H - i)}H${f1(i)}V${f1(k)}Z`;
    }
    case 'arch': { const R = W / 2 - i; return `M${f1(i)} ${f1(H - i)}V${f1(W / 2)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(W - i)} ${f1(W / 2)}V${f1(H - i)}Z`; }
    default: return rr(0.6);
  }
}
export function holeOf(shape: HTShape): { cx: number; cy: number; r: number } | null {
  const s = htShape(shape);
  return s.holeY == null ? null : { cx: (s.wMm / 2) * U, cy: s.holeY * U, r: HOLE_R_MM * U };
}
const circlePath = (cx: number, cy: number, r: number) => `M${f1(cx - r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx + r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx - r)} ${f1(cy)}Z`;
/** đường bế đầy đủ: hình + lỗ (dùng cho CutContour, clip, 3D) */
export function cutPath(shape: HTShape): string {
  const h = holeOf(shape);
  return shapePath(shape) + (h ? circlePath(h.cx, h.cy, h.r) : '');
}

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface HTFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const HT_FONTS: HTFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const htFont = (id: string) => HT_FONTS.find((f) => f.id === id) || HT_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';

export const HT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@600;700&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

export function useHTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ht-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ht-fonts'; link.rel = 'stylesheet';
        link.href = HT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...HT_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `400 40px "${SCRIPT}"`, `600 40px "Cormorant Garamond"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface HTPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; on: string; acc2?: string; acc3?: string }
export const HT_PALETTES: HTPalette[] = [
  { id: 'blush', name: 'Hồng phấn', bg: '#F6E4DF', ink: '#5A2E33', sub: '#8A5D60', accent: '#B5646B', on: '#FFFFFF' },
  { id: 'cream', name: 'Kem', bg: '#F4EEE3', ink: '#2B2622', sub: '#7A6E61', accent: '#A0784C', on: '#FFFFFF' },
  { id: 'white', name: 'Trắng', bg: '#FFFFFF', ink: '#1C1C1C', sub: '#6B6B6B', accent: '#1C1C1C', on: '#FFFFFF' },
  { id: 'street', name: 'Đen neon', bg: '#121212', ink: '#F5F5F5', sub: '#A3A3A3', accent: '#D7FF3A', on: '#121212' },
  { id: 'yellow', name: 'Vàng đen', bg: '#FFD400', ink: '#111111', sub: '#3A3A3A', accent: '#111111', on: '#FFD400' },
  { id: 'sky', name: 'Xanh trời', bg: '#DDF0FF', ink: '#1E3A5F', sub: '#4C6A8A', accent: '#FF8A3D', on: '#FFFFFF', acc2: '#FFC83D', acc3: '#4FB8B4' },
  { id: 'mint', name: 'Bạc hà', bg: '#DCF4E8', ink: '#234B3A', sub: '#4F7A66', accent: '#FF6F91', on: '#FFFFFF', acc2: '#FFC94A', acc3: '#6BA8FF' },
  { id: 'kraft', name: 'Kraft', bg: '#C9A67E', ink: '#3A2A18', sub: '#5C4530', accent: '#3A2A18', on: '#C9A67E' },
  { id: 'luxblack', name: 'Đen ánh kim', bg: '#151515', ink: '#D6B25E', sub: '#9C9C9C', accent: '#D6B25E', on: '#151515' },
  { id: 'luxnavy', name: 'Navy ánh kim', bg: '#17243D', ink: '#D6B25E', sub: '#A9B4C8', accent: '#D6B25E', on: '#17243D' },
  { id: 'sage', name: 'Xanh xô thơm', bg: '#E4EBDF', ink: '#2F3E2C', sub: '#64735F', accent: '#7C8F6E', on: '#FFFFFF' },
];
export const htPalette = (id: string) => HT_PALETTES.find((p) => p.id === id) || HT_PALETTES[0];

export type HTMaterial = 'paper' | 'kraft' | 'foil';
export const KRAFT = '#C9A67E';
export const HT_MATERIALS: { id: HTMaterial; name: string; note: string }[] = [
  { id: 'paper', name: 'Giấy C300 cán mờ', note: 'in màu đều, phổ biến' },
  { id: 'kraft', name: 'Giấy kraft 350', note: 'nền là màu giấy, không in nền' },
  { id: 'foil', name: 'Giấy mỹ thuật ép kim', note: 'phần màu vàng = ép kim nhũ' },
];

// ---------- bố cục + mẫu ----------
export const HT_LAYOUTS: { id: string; kind: HTKind; name: string }[] = [
  { id: 'classic', kind: 'tag', name: 'Cổ điển' },
  { id: 'frame', kind: 'tag', name: 'Khung viền' },
  { id: 'band', kind: 'tag', name: 'Dải màu' },
  { id: 'vertical', kind: 'tag', name: 'Chữ dọc' },
  { id: 'kids', kind: 'tag', name: 'Vui nhộn' },
  { id: 'stamp', kind: 'tag', name: 'Con dấu handmade' },
  { id: 'script', kind: 'thanks', name: 'Chữ ký mềm' },
  { id: 'stampcard', kind: 'thanks', name: 'Con dấu' },
  { id: 'minimal', kind: 'thanks', name: 'Tối giản' },
];

export interface HTSpec { kind: HTKind; shape: HTShape; layout: string; palette: string; font: string; material: HTMaterial; eyelet: boolean }
export interface HTTemplate { id: string; name: string; group: string; spec: Omit<HTSpec, 'shape' | 'eyelet'> & { shape: HTShape } }
const T = (id: string, name: string, group: string, kind: HTKind, shape: HTShape, layout: string, palette: string, font: string, material: HTMaterial): HTTemplate =>
  ({ id, name, group, spec: { kind, shape, layout, palette, font, material } });
export const HT_TEMPLATES: HTTemplate[] = [
  T('nu-hong', 'Nữ tính · hồng phấn', 'Thời trang nữ', 'tag', 'round', 'classic', 'blush', 'playfair', 'paper'),
  T('nu-kem', 'Thanh lịch · kem', 'Thời trang nữ', 'tag', 'arch', 'frame', 'cream', 'cormorant', 'paper'),
  T('street-den', 'Streetwear · đen neon', 'Streetwear', 'tag', 'rect', 'vertical', 'street', 'oswald', 'paper'),
  T('street-vang', 'Streetwear · vàng', 'Streetwear', 'tag', 'chamfer', 'band', 'yellow', 'montserrat', 'paper'),
  T('kids-xanh', 'Trẻ em · xanh trời', 'Đồ trẻ em', 'tag', 'circle', 'kids', 'sky', 'baloo', 'paper'),
  T('kids-mint', 'Trẻ em · bạc hà', 'Đồ trẻ em', 'tag', 'round', 'kids', 'mint', 'baloo', 'paper'),
  T('handmade', 'Handmade · kraft', 'Handmade', 'tag', 'chamfer', 'stamp', 'kraft', 'dancing', 'kraft'),
  T('kraft-moc', 'Mộc · kraft tối giản', 'Handmade', 'tag', 'rect', 'classic', 'kraft', 'montserrat', 'kraft'),
  T('lux-den', 'Sang trọng · đen ánh kim', 'Sang trọng', 'tag', 'rect', 'frame', 'luxblack', 'cormorant', 'foil'),
  T('lux-navy', 'Sang trọng · navy ánh kim', 'Sang trọng', 'tag', 'arch', 'classic', 'luxnavy', 'playfair', 'foil'),
  T('camon-hong', 'Thẻ cảm ơn · hồng', 'Thẻ cảm ơn', 'thanks', 'card', 'script', 'blush', 'playfair', 'paper'),
  T('camon-kraft', 'Thẻ cảm ơn · kraft', 'Thẻ cảm ơn', 'thanks', 'card', 'stampcard', 'kraft', 'dancing', 'kraft'),
  T('camon-sage', 'Thẻ cảm ơn · xô thơm', 'Thẻ cảm ơn', 'thanks', 'a7', 'minimal', 'sage', 'cormorant', 'paper'),
  T('camon-den', 'Thẻ cảm ơn · đen ánh kim', 'Thẻ cảm ơn', 'thanks', 'card', 'minimal', 'luxblack', 'cormorant', 'foil'),
];

// ---------- nội dung ----------
export type HTData = Record<string, string>;
export interface HTField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; kinds: HTKind[]; side: 'front' | 'back' }
export const HT_FIELDS: HTField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', kinds: ['tag', 'thanks'], side: 'front', half: true },
  { key: 'slogan', label: 'Slogan / dòng nhỏ', kinds: ['tag', 'thanks'], side: 'front', half: true },
  { key: 'website', label: 'Website / fanpage', kinds: ['tag', 'thanks'], side: 'front', half: true },
  { key: 'est', label: 'Dòng phụ (năm, BST…)', kinds: ['tag'], side: 'front', half: true },
  { key: 'sizes', label: 'Các size (cách nhau dấu phẩy)', kinds: ['tag'], side: 'back', half: true },
  { key: 'size', label: 'Size đánh dấu sẵn (để trống = để khách tự tick)', kinds: ['tag'], side: 'back', half: true },
  { key: 'price', label: 'Giá', kinds: ['tag'], side: 'back', half: true },
  { key: 'sku', label: 'Mã sản phẩm', kinds: ['tag'], side: 'back', half: true },
  { key: 'fabric', label: 'Chất liệu', kinds: ['tag'], side: 'back', half: true },
  { key: 'barcode', label: 'Mã vạch (12 số, số thứ 13 tự tính)', kinds: ['tag'], side: 'back', half: true },
  { key: 'thanks', label: 'Lời cảm ơn mặt sau (để trống = tự ghép tên shop)', kinds: ['tag'], side: 'back' },
  { key: 'message', label: 'Lời nhắn', kinds: ['thanks'], side: 'back', multiline: true },
  { key: 'code', label: 'Mã ưu đãi lần sau', kinds: ['thanks'], side: 'back', half: true },
  { key: 'codeNote', label: 'Ghi chú ưu đãi', kinds: ['thanks'], side: 'back', half: true },
  { key: 'facebook', label: 'Facebook', kinds: ['thanks'], side: 'back', half: true },
  { key: 'instagram', label: 'Instagram', kinds: ['thanks'], side: 'back', half: true },
  { key: 'tiktok', label: 'TikTok', kinds: ['thanks'], side: 'back', half: true },
];
export const defaultHTData = (): HTData => ({
  brand: 'THU HÀ', slogan: 'Thời trang thiết kế', website: 'thuha.vn', est: 'SINCE 2024',
  sizes: 'S, M, L, XL', size: 'M', price: '359.000đ', sku: 'TH-2731', fabric: '100% Cotton', barcode: '893612345678', thanks: '',
  message: 'Cảm ơn bạn đã tin tưởng ủng hộ shop. Chúc bạn luôn xinh đẹp, vui vẻ và hẹn gặp lại bạn ở đơn sau nhé!',
  code: 'CAMON10', codeNote: 'Giảm 10% cho đơn tiếp theo', facebook: 'fb.com/thuha.boutique', instagram: '@thuha.boutique', tiktok: '@thuha.studio',
});

// ---------- đo + xếp chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW ? (size * maxW) / w : size; };
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
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.4) { s *= 0.93; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  // dòng nào vẫn quá rộng (1 từ dài) → co riêng cả khối cho vừa
  const widest = Math.max(1, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
type Anchor = 'start' | 'middle' | 'end';
interface TxtProps { x: number; y: number; size: number; ts: TS; fill: string; anchor?: Anchor; children: string; opacity?: number; italic?: boolean }
function Txt({ x, y, size, ts, fill, anchor = 'middle', children, opacity }: TxtProps) {
  return <text x={f1(x)} y={f1(y)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f1(size)} fill={fill} textAnchor={anchor} letterSpacing={ts.ls ? f1(ts.ls) : undefined} opacity={opacity}>{children}</text>;
}
/** khối chữ nhiều dòng, y = đỉnh khối; trả về [node, chiều cao] */
function block(text: string, o: { x: number; y: number; maxW: number; size: number; ts: TS; fill: string; maxLines?: number; lh?: number; anchor?: Anchor; upper?: boolean }): [ReactNode, number] {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return [null, 0];
  const { lines, size } = fitBlock(t, o.maxW, o.size, o.ts, o.maxLines ?? 2);
  const lh = size * (o.lh ?? 1.15);
  const node = <g>{lines.map((l, i) => <Txt key={i} x={o.x} y={o.y + size * 0.8 + i * lh} size={size} ts={o.ts} fill={o.fill} anchor={o.anchor}>{l}</Txt>)}</g>;
  return [node, size * 0.8 + (lines.length - 1) * lh + size * 0.28];
}
const initials = (brand: string) => {
  const w = (brand || 'M').trim().split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[1][0] : (w[0] || 'M').slice(0, 2)).toUpperCase();
};
let seedV = 1;
const rnd = () => { seedV = (seedV * 9301 + 49297) % 233280; return seedV / 233280; };

// ---------- logo: ảnh khách tải lên hoặc monogram vẽ code ----------
function Mark({ cx, cy, r, P, ts, brand, logo, style = 'ring' }: { cx: number; cy: number; r: number; P: HTPalette; ts: TS; brand: string; logo?: string; style?: 'ring' | 'solid' | 'double' | 'plain' }) {
  if (logo) return <image href={logo} x={f1(cx - r)} y={f1(cy - r)} width={f1(r * 2)} height={f1(r * 2)} preserveAspectRatio="xMidYMid meet" />;
  const ini = initials(brand);
  const s = fitSize(ini, r * 1.25, r * 0.95, ts);
  return (
    <g>
      {style === 'solid' && <circle cx={f1(cx)} cy={f1(cy)} r={f1(r)} fill={P.accent} />}
      {(style === 'ring' || style === 'double') && <circle cx={f1(cx)} cy={f1(cy)} r={f1(r - 1.5)} fill="none" stroke={P.accent} strokeWidth={3} />}
      {style === 'double' && <circle cx={f1(cx)} cy={f1(cy)} r={f1(r - 7)} fill="none" stroke={P.accent} strokeWidth={1.2} />}
      <Txt x={cx} y={cy + s * 0.36} size={s} ts={ts} fill={style === 'solid' ? P.on : P.accent}>{ini}</Txt>
    </g>
  );
}

// ---------- ký hiệu giặt (vẽ code) ----------
function CareIcons({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  const sw = s * 0.07, g = s * 1.35;
  const icon = (i: number, n: ReactNode) => <g key={i} transform={`translate(${f1(x + i * g)} ${f1(y)})`} fill="none" stroke={color} strokeWidth={f1(sw)} strokeLinejoin="round" strokeLinecap="round">{n}</g>;
  return (
    <g data-care="1">
      {icon(0, <>
        <path d={`M${f1(s * 0.05)} ${f1(s * 0.25)}L${f1(s * 0.17)} ${f1(s * 0.92)}H${f1(s * 0.83)}L${f1(s * 0.95)} ${f1(s * 0.25)}`} />
        <path d={`M${f1(s * 0.07)} ${f1(s * 0.33)}Q${f1(s * 0.2)} ${f1(s * 0.2)} ${f1(s * 0.33)} ${f1(s * 0.33)}T${f1(s * 0.6)} ${f1(s * 0.33)}T${f1(s * 0.93)} ${f1(s * 0.33)}`} />
        <text x={f1(s * 0.5)} y={f1(s * 0.8)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(s * 0.36)} fill={color} stroke="none" textAnchor="middle">30</text>
      </>)}
      {icon(1, <>
        <path d={`M${f1(s * 0.5)} ${f1(s * 0.1)}L${f1(s * 0.95)} ${f1(s * 0.9)}H${f1(s * 0.05)}Z`} />
        <path d={`M${f1(s * 0.2)} ${f1(s * 0.3)}L${f1(s * 0.8)} ${f1(s * 0.98)}M${f1(s * 0.8)} ${f1(s * 0.3)}L${f1(s * 0.2)} ${f1(s * 0.98)}`} />
      </>)}
      {icon(2, <>
        <path d={`M${f1(s * 0.05)} ${f1(s * 0.85)}H${f1(s * 0.95)}V${f1(s * 0.62)}Q${f1(s * 0.92)} ${f1(s * 0.3)} ${f1(s * 0.55)} ${f1(s * 0.3)}H${f1(s * 0.3)}Q${f1(s * 0.1)} ${f1(s * 0.42)} ${f1(s * 0.05)} ${f1(s * 0.85)}Z`} />
        <circle cx={f1(s * 0.55)} cy={f1(s * 0.6)} r={f1(s * 0.05)} fill={color} />
      </>)}
      {icon(3, <>
        <rect x={f1(s * 0.06)} y={f1(s * 0.1)} width={f1(s * 0.88)} height={f1(s * 0.82)} />
        <circle cx={f1(s * 0.5)} cy={f1(s * 0.51)} r={f1(s * 0.3)} />
        <path d={`M${f1(s * 0.06)} ${f1(s * 0.1)}L${f1(s * 0.94)} ${f1(s * 0.92)}M${f1(s * 0.94)} ${f1(s * 0.1)}L${f1(s * 0.06)} ${f1(s * 0.92)}`} />
      </>)}
      {icon(4, <>
        <circle cx={f1(s * 0.5)} cy={f1(s * 0.51)} r={f1(s * 0.42)} />
        <text x={f1(s * 0.5)} y={f1(s * 0.66)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(s * 0.42)} fill={color} stroke="none" textAnchor="middle">P</text>
      </>)}
    </g>
  );
}
const careW = (s: number) => s * 1.35 * 4 + s;

// ---------- mã vạch EAN-13 (dùng ean13 của bao bì: số 13 tự tính) ----------
function Barcode({ x, y, w, code, ink, paper = '#FFFFFF' }: { x: number; y: number; w: number; code: string; ink: string; paper?: string }) {
  const { digits, bits } = ean13(code);
  const m = w / 113, qz = m * 9, h = m * 42;
  const guard = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  const rects: ReactNode[] = [];
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') rects.push(<rect key={i} x={f1(x + qz + i * m)} y={f1(y + m * 3)} width={f1(m + 0.05)} height={f1(guard.has(i) ? h + m * 5 : h)} fill={ink} />);
  const fs = m * 8.5;
  return (
    <g data-ean={digits}>
      <rect x={f1(x)} y={f1(y)} width={f1(w)} height={f1(m * 62)} fill={paper} rx={f1(m * 2)} />
      {rects}
      <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(fs)} fill={ink} textAnchor="middle">
        <text x={f1(x + qz - m * 4)} y={f1(y + m * 3 + h + m * 9.5)}>{digits[0]}</text>
        <text x={f1(x + qz + m * 24)} y={f1(y + m * 3 + h + m * 9.5)} letterSpacing={f1(m * 2.2)}>{digits.slice(1, 7)}</text>
        <text x={f1(x + qz + m * 71)} y={f1(y + m * 3 + h + m * 9.5)} letterSpacing={f1(m * 2.2)}>{digits.slice(7)}</text>
      </g>
    </g>
  );
}
const barcodeH = (w: number) => (w / 113) * 62;

// ---------- vẽ 1 mặt ----------
export type HTLayer = 'screen' | 'print' | 'foil';
export interface HTFaceProps { spec: HTSpec; data: HTData; side: 'front' | 'back'; logo?: string; layer?: HTLayer; bleed?: boolean; style?: CSSProperties; uid?: string }

function palFor(spec: HTSpec, layer: HTLayer): HTPalette {
  const base = htPalette(spec.palette);
  // giấy kraft: nền chính là màu giấy (không in nền)
  const P = spec.material === 'kraft' ? { ...base, bg: KRAFT } : base;
  if (layer !== 'foil') return P;
  // lớp ép kim: chỉ phần màu nhấn (vàng) = trắng, còn lại đen → làm alpha cho kim loại trong 3D
  const k = '#000000', w = '#FFFFFF';
  const isFoil = (c: string) => c.toLowerCase() === P.accent.toLowerCase();
  return { ...P, bg: k, ink: isFoil(P.ink) ? w : k, sub: isFoil(P.sub) ? w : k, accent: w, on: k, acc2: k, acc3: k };
}

/** nội dung 1 mặt trong hệ toạ độ khổ thành phẩm (0..W, 0..H), chưa clip */
function faceArt(p: HTFaceProps, uid: string): ReactNode {
  const { spec, data, side, logo } = p;
  const layer = p.layer || 'screen';
  const P = palFor(spec, layer);
  const sh = htShape(spec.shape);
  const W = sh.wMm * U, H = sh.hMm * U;
  const [bx, by, bw, bh] = sh.box.map((v) => v * U);
  const cx = bx + bw / 2;
  const F = htFont(spec.font);
  const disp: TS = { fam: F.family, wt: F.weight };
  const body: TS = { fam: BODY, wt: 600 };
  const bodyB: TS = { fam: BODY, wt: 800 };
  const b = p.bleed ? HT_BLEED_MM * U : 0;
  const kraft = spec.material === 'kraft';
  const noBg = layer === 'foil' ? false : kraft && layer !== 'screen'; // kraft: in thẳng lên giấy, không in nền
  const bgNode = noBg ? null : <rect key="bg" x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={P.bg} />;
  const artClip = `url(#${uid}-art)`;
  const brand = data.brand || '';
  const out: ReactNode[] = [bgNode];

  if (side === 'back' && spec.kind === 'tag') {
    // ---- mặt sau tag: khối dọc, tự co cho vừa vùng an toàn ----
    const items: { h: number; node: (y: number) => ReactNode; pri?: number }[] = [];
    const gap = bw * 0.05;
    const bs = Math.min(bw * 0.13, 34);
    const [bn, bhh] = block(brand, { x: cx, y: 0, maxW: bw, size: bs, ts: disp, fill: P.ink, maxLines: 1 });
    if (bn) items.push({ h: bhh, node: (y) => <g transform={`translate(0 ${f1(y)})`}>{bn}</g> });
    items.push({ h: 6, pri: 1, node: (y) => <line x1={f1(cx - bw * 0.18)} x2={f1(cx + bw * 0.18)} y1={f1(y + 3)} y2={f1(y + 3)} stroke={P.accent} strokeWidth={2.4} /> });
    const sizes = (data.sizes || '').split(/[,;/]+/).map((s) => s.trim()).filter(Boolean).slice(0, 6);
    if (sizes.length) {
      const lab = bw * 0.075;
      const cell = Math.min(bw * 0.2, (bw - (sizes.length - 1) * 8) / sizes.length, 70);
      const rowW = sizes.length * cell + (sizes.length - 1) * 8;
      const pick = (data.size || '').trim().toUpperCase();
      items.push({
        h: lab * 1.3 + cell,
        node: (y) => (
          <g>
            <Txt x={cx} y={y + lab * 0.9} size={lab} ts={{ ...bodyB, ls: lab * 0.2 }} fill={P.sub}>SIZE</Txt>
            {sizes.map((s, i) => {
              const x0 = cx - rowW / 2 + i * (cell + 8), y0 = y + lab * 1.3;
              const on = s.toUpperCase() === pick;
              const fs = fitSize(s, cell * 0.78, cell * 0.5, bodyB);
              return (
                <g key={i}>
                  <rect x={f1(x0)} y={f1(y0)} width={f1(cell)} height={f1(cell)} rx={f1(cell * 0.16)} fill={on ? P.accent : 'none'} stroke={P.accent} strokeWidth={2} />
                  <Txt x={x0 + cell / 2} y={y0 + cell / 2 + fs * 0.36} size={fs} ts={bodyB} fill={on ? P.on : P.ink}>{s}</Txt>
                </g>
              );
            })}
          </g>
        ),
      });
    }
    const rowS = Math.min(bw * 0.075, 26);
    const rows = [['Mã SP', data.sku], ['Chất liệu', data.fabric]].filter(([, v]) => (v || '').trim()) as [string, string][];
    if (rows.length) {
      items.push({
        h: rows.length * rowS * 1.45, pri: 3,
        node: (y) => (
          <g>
            {rows.map(([k, v], i) => {
              const yy = y + rowS + i * rowS * 1.45;
              const vs = fitSize(v, bw * 0.6, rowS, bodyB);
              return (
                <g key={k}>
                  <Txt x={bx} y={yy} size={rowS} ts={body} fill={P.sub} anchor="start">{k}</Txt>
                  <Txt x={bx + bw} y={yy} size={vs} ts={bodyB} fill={P.ink} anchor="end">{v}</Txt>
                </g>
              );
            })}
          </g>
        ),
      });
    }
    if ((data.price || '').trim()) {
      const ps = fitSize(data.price, bw * 0.95, Math.min(bw * 0.17, 60), disp);
      items.push({ h: ps * 1.1, node: (y) => <Txt x={cx} y={y + ps * 0.85} size={ps} ts={disp} fill={P.ink}>{data.price}</Txt> });
    }
    {
      const bwid = Math.min(bw * 0.92, 340);
      items.push({ h: barcodeH(bwid), node: (y) => <Barcode x={cx - bwid / 2} y={y} w={bwid} code={data.barcode} ink={layer === 'foil' ? '#000000' : '#151515'} paper={layer === 'foil' ? '#000000' : '#FFFFFF'} /> });
    }
    const cs = Math.min(bw * 0.12, 46);
    items.push({ h: cs, pri: 2, node: (y) => <CareIcons x={cx - careW(cs) / 2} y={y} s={cs} color={P.ink} /> });
    const thanks = (data.thanks || '').trim() || `Cảm ơn bạn đã chọn ${brand || 'shop'}`;
    const [tn, th] = block(thanks, { x: cx, y: 0, maxW: bw, size: Math.min(bw * 0.07, 24), ts: body, fill: P.sub, maxLines: 2 });
    if (tn) items.push({ h: th, pri: 1, node: (y) => <g transform={`translate(0 ${f1(y)})`}>{tn}</g> });
    // vùng chữ thấp (tag tròn) → bỏ bớt mục phụ (lời cảm ơn, ký hiệu giặt…) để chữ còn lại không bị co quá nhỏ
    const tot = () => items.reduce((s, it) => s + it.h, 0) + gap * (items.length - 1);
    for (const lvl of [1, 2, 3]) { if (bh / tot() >= 0.66) break; for (let i = items.length - 1; i >= 0; i--) if (items[i].pri === lvl) items.splice(i, 1); }
    const total = items.reduce((s, it) => s + it.h, 0) + gap * (items.length - 1);
    const k = Math.min(1, bh / total);
    let y = 0;
    const nodes = items.map((it, i) => { const n = <g key={i}>{it.node(y)}</g>; y += it.h + gap; return n; });
    const oy = by + (bh - total * k) / 2;
    out.push(<g key="back" transform={`translate(${f1(cx * (1 - k))} ${f1(oy)}) scale(${k.toFixed(4)})`}>{nodes}</g>);
    return out;
  }

  if (side === 'back') {
    // ---- mặt sau thẻ cảm ơn: lời nhắn + mã ưu đãi + mạng xã hội + QR ----
    const qrS = Math.min(bh * 0.42, bw * 0.24);
    const textW_ = bw - qrS - bw * 0.06;
    const [mn, mh] = block(data.message || '', { x: bx, y: by, maxW: textW_, size: Math.min(bh * 0.1, 30), ts: body, fill: P.ink, maxLines: 4, lh: 1.3, anchor: 'start' });
    out.push(<g key="msg">{mn}</g>);
    let y = by + mh + bh * 0.06;
    if ((data.code || '').trim()) {
      const cs = Math.min(bh * 0.13, 40);
      const cw = Math.min(textW_, textW(data.code, cs, { ...bodyB, ls: cs * 0.12 }) + cs * 1.6);
      const ccs = fitSize(data.code, cw - cs, cs, { ...bodyB, ls: cs * 0.12 });
      out.push(
        <g key="code">
          <rect x={f1(bx)} y={f1(y)} width={f1(cw)} height={f1(cs * 1.6)} rx={f1(cs * 0.25)} fill="none" stroke={P.accent} strokeWidth={2.2} strokeDasharray="7 5" />
          <Txt x={bx + cw / 2} y={y + cs * 1.13} size={ccs} ts={{ ...bodyB, ls: ccs * 0.12 }} fill={P.accent}>{data.code}</Txt>
        </g>,
      );
      if ((data.codeNote || '').trim()) {
        const ns = fitSize(data.codeNote, textW_ - cw - 14, Math.min(bh * 0.075, 22), body);
        if (ns > 9) out.push(<Txt key="cn" x={bx + cw + 12} y={y + cs * 0.95} size={ns} ts={body} fill={P.sub} anchor="start">{data.codeNote}</Txt>);
      }
      y += cs * 1.6 + bh * 0.06;
    }
    const socials = [['f', data.facebook], ['ig', data.instagram], ['tt', data.tiktok]].filter(([, v]) => (v || '').trim()) as [string, string][];
    const ss = Math.min(bh * 0.075, 22);
    const room = by + bh - y;
    const n = Math.max(0, Math.min(socials.length, Math.floor(room / (ss * 1.55))));
    socials.slice(0, n).forEach(([k, v], i) => {
      const yy = y + ss * 0.95 + i * ss * 1.55;
      const fs = fitSize(v, textW_ - ss * 1.6, ss, body);
      out.push(
        <g key={k}>
          <circle cx={f1(bx + ss * 0.55)} cy={f1(yy - ss * 0.34)} r={f1(ss * 0.58)} fill={P.accent} />
          <Txt x={bx + ss * 0.55} y={yy - ss * 0.34 + ss * 0.22} size={ss * 0.58} ts={bodyB} fill={P.on}>{k}</Txt>
          <Txt x={bx + ss * 1.5} y={yy} size={fs} ts={body} fill={P.ink} anchor="start">{v}</Txt>
        </g>,
      );
    });
    if ((data.website || '').trim()) {
      const q = qrPath(data.website.trim());
      const qx = bx + bw - qrS, qy = by + (bh - qrS) / 2 - bh * 0.05;
      out.push(
        <g key="qr">
          <rect x={f1(qx - 8)} y={f1(qy - 8)} width={f1(qrS + 16)} height={f1(qrS + 16)} rx={8} fill={layer === 'foil' ? '#000000' : '#FFFFFF'} />
          <path d={q.d} transform={`translate(${f1(qx)} ${f1(qy)}) scale(${(qrS / q.n).toFixed(4)})`} fill={layer === 'foil' ? '#000000' : '#151515'} />
          <Txt x={qx + qrS / 2} y={qy + qrS + bh * 0.1} size={fitSize(data.website, qrS + 30, Math.min(bh * 0.065, 18), body)} ts={body} fill={P.sub}>{data.website}</Txt>
        </g>,
      );
    }
    return out;
  }

  // ---- MẶT TRƯỚC ----
  const L = spec.layout;
  if (spec.kind === 'thanks') {
    if (L === 'script') {
      const ts: TS = { fam: SCRIPT, wt: 400 };
      const s = fitSize('Cảm ơn bạn!', bw * 0.9, bh * 0.36, ts);
      seedV = 7;
      for (let i = 0; i < 9; i++) {
        const a = rnd() * Math.PI * 2, rr = 0.3 + rnd() * 0.25;
        const x = cx + Math.cos(a) * bw * 0.5 * (0.85 + rnd() * 0.15), y = by + bh * 0.5 + Math.sin(a) * bh * rr;
        out.push(<path key={`h${i}`} d={heart(x, y, 9 + rnd() * 9)} fill={P.accent} opacity={0.35 + rnd() * 0.4} clipPath={artClip} />);
      }
      out.push(<Txt key="t" x={cx} y={by + bh * 0.47} size={s} ts={ts} fill={P.accent}>Cảm ơn bạn!</Txt>);
      const [bn] = block(brand, { x: cx, y: by + bh * 0.6, maxW: bw * 0.8, size: bh * 0.12, ts: { ...disp, ls: bh * 0.012 }, fill: P.ink, maxLines: 1, upper: true });
      out.push(<g key="b">{bn}</g>);
      const [sn] = block(data.slogan || '', { x: cx, y: by + bh * 0.8, maxW: bw * 0.8, size: bh * 0.07, ts: body, fill: P.sub, maxLines: 1 });
      out.push(<g key="s">{sn}</g>);
    } else if (L === 'stampcard') {
      const r = bh * 0.42, mcx = bx + r + bw * 0.02, mcy = by + bh / 2;
      out.push(<RingStamp key="st" cx={mcx} cy={mcy} r={r} text={`${(brand || 'SHOP').toUpperCase()} • HANDMADE WITH LOVE • `} P={P} ts={bodyB} />);
      const fs = fitSize('Thank you', bw * 0.5, bh * 0.24, disp);
      const tx = bx + r * 2 + bw * 0.08, tw = bx + bw - tx;
      out.push(<Txt key="t" x={tx + tw / 2} y={by + bh * 0.42} size={Math.min(fs, fitSize('Thank you', tw, bh * 0.28, disp))} ts={disp} fill={P.ink}>Thank you</Txt>);
      const [mn] = block('Cảm ơn bạn đã ủng hộ shop', { x: tx + tw / 2, y: by + bh * 0.55, maxW: tw, size: bh * 0.085, ts: bodyB, fill: P.ink, maxLines: 2 });
      out.push(<g key="m">{mn}</g>);
      out.push(<path key="dash" d={shapePath(spec.shape, 2.5)} fill="none" stroke={P.ink} strokeWidth={2} strokeDasharray="10 7" opacity={0.6} />);
    } else {
      // minimal
      out.push(<rect key="bar" x={-b} y={-b} width={f1(W * 0.06 + b)} height={H + 2 * b} fill={P.accent} clipPath={artClip} />);
      const lx = bx + W * 0.06;
      const lw = bw - W * 0.06;
      const [en] = block('THANK YOU', { x: lx, y: by + bh * 0.08, maxW: lw, size: bh * 0.07, ts: { ...bodyB, ls: bh * 0.02 }, fill: P.accent, maxLines: 1, anchor: 'start' });
      out.push(<g key="e">{en}</g>);
      const [tn, th] = block('Cảm ơn bạn đã ủng hộ', { x: lx, y: by + bh * 0.24, maxW: lw * 0.92, size: bh * 0.2, ts: disp, fill: P.ink, maxLines: 2, lh: 1.05, anchor: 'start' });
      out.push(<g key="t">{tn}</g>);
      out.push(<line key="l" x1={f1(lx)} x2={f1(lx + lw * 0.2)} y1={f1(by + bh * 0.24 + th + bh * 0.06)} y2={f1(by + bh * 0.24 + th + bh * 0.06)} stroke={P.accent} strokeWidth={3} />);
      const [bn] = block(brand, { x: lx, y: by + bh * 0.24 + th + bh * 0.12, maxW: lw, size: bh * 0.1, ts: { ...disp, ls: bh * 0.01 }, fill: P.ink, maxLines: 1, anchor: 'start', upper: true });
      out.push(<g key="b">{bn}</g>);
      const [wn] = block(data.website || '', { x: lx, y: by + bh * 0.9, maxW: lw, size: bh * 0.065, ts: body, fill: P.sub, maxLines: 1, anchor: 'start' });
      out.push(<g key="w">{wn}</g>);
    }
    return out;
  }

  // tag mặt trước
  const est = data.est || '';
  if (L === 'classic') {
    const r = Math.min(bw * 0.27, bh * 0.17);
    out.push(<Mark key="m" cx={cx} cy={by + bh * 0.04 + r} r={r} P={P} ts={disp} brand={brand} logo={logo} style="ring" />);
    const [bn, bh1] = block(brand, { x: cx, y: by + bh * 0.08 + r * 2 + bh * 0.06, maxW: bw, size: Math.min(bw * 0.2, bh * 0.13), ts: disp, fill: P.ink, maxLines: 2, lh: 1.02 });
    out.push(<g key="b">{bn}</g>);
    let y = by + bh * 0.14 + r * 2 + bh * 0.06 + bh1;
    out.push(<line key="l" x1={f1(cx - bw * 0.12)} x2={f1(cx + bw * 0.12)} y1={f1(y)} y2={f1(y)} stroke={P.accent} strokeWidth={2.5} />);
    y += bh * 0.04;
    const [sn] = block(data.slogan || '', { x: cx, y, maxW: bw * 0.92, size: Math.min(bw * 0.085, 30), ts: body, fill: P.sub, maxLines: 2 });
    out.push(<g key="s">{sn}</g>);
    const [wn] = block(data.website || '', { x: cx, y: by + bh - Math.min(bw * 0.07, 24) * 1.1, maxW: bw, size: Math.min(bw * 0.07, 24), ts: { ...bodyB, ls: 2 }, fill: P.accent, maxLines: 1, upper: true });
    out.push(<g key="w">{wn}</g>);
  } else if (L === 'frame') {
    out.push(<path key="f1" d={shapePath(spec.shape, 2.6)} fill="none" stroke={P.accent} strokeWidth={3.5} />);
    out.push(<path key="f2" d={shapePath(spec.shape, 3.4)} fill="none" stroke={P.accent} strokeWidth={1.1} />);
    const [en, eh] = block(est, { x: cx, y: by + bh * 0.05, maxW: bw * 0.8, size: Math.min(bw * 0.06, 22), ts: { ...bodyB, ls: 3 }, fill: P.sub, maxLines: 1, upper: true });
    out.push(<g key="e">{en}</g>);
    const r = Math.min(bw * 0.22, bh * 0.13);
    const my = by + bh * 0.08 + eh + r;
    out.push(<Mark key="m" cx={cx} cy={my} r={r} P={P} ts={disp} brand={brand} logo={logo} style="double" />);
    const [bn, bh1] = block(brand, { x: cx, y: my + r + bh * 0.08, maxW: bw * 0.92, size: Math.min(bw * 0.19, bh * 0.12), ts: { ...disp, ls: bw * 0.008 }, fill: P.ink, maxLines: 2, lh: 1.02, upper: true });
    out.push(<g key="b">{bn}</g>);
    const yy = my + r + bh * 0.1 + bh1;
    out.push(<path key="orn" d={`M${f1(cx - bw * 0.2)} ${f1(yy)}H${f1(cx - 8)}M${f1(cx + 8)} ${f1(yy)}H${f1(cx + bw * 0.2)}M${f1(cx)} ${f1(yy - 6)}L${f1(cx + 6)} ${f1(yy)}L${f1(cx)} ${f1(yy + 6)}L${f1(cx - 6)} ${f1(yy)}Z`} stroke={P.accent} strokeWidth={1.6} fill={P.accent} />);
    const [sn] = block(data.slogan || '', { x: cx, y: yy + bh * 0.04, maxW: bw * 0.85, size: Math.min(bw * 0.085, 30), ts: { fam: 'Cormorant Garamond', wt: 600 }, fill: P.sub, maxLines: 2 });
    out.push(<g key="s">{sn}</g>);
    const [wn] = block(data.website || '', { x: cx, y: by + bh - Math.min(bw * 0.065, 22) * 1.15, maxW: bw * 0.8, size: Math.min(bw * 0.065, 22), ts: { ...bodyB, ls: 2.5 }, fill: P.accent, maxLines: 1, upper: true });
    out.push(<g key="w">{wn}</g>);
  } else if (L === 'band') {
    const bandY = by + bh * 0.66;
    out.push(<rect key="band" x={-b} y={f1(bandY)} width={W + 2 * b} height={f1(H + b - bandY)} fill={P.accent} clipPath={artClip} />);
    const r = Math.min(bw * 0.3, bh * 0.2);
    out.push(<Mark key="m" cx={cx} cy={by + bh * 0.06 + r} r={r} P={P} ts={disp} brand={brand} logo={logo} style="solid" />);
    const [sn] = block(data.slogan || '', { x: cx, y: by + bh * 0.1 + r * 2 + bh * 0.04, maxW: bw * 0.92, size: Math.min(bw * 0.09, 30), ts: bodyB, fill: P.ink, maxLines: 2, upper: true });
    out.push(<g key="s">{sn}</g>);
    const [bn] = block(brand, { x: cx, y: bandY + bh * 0.06, maxW: bw * 0.94, size: Math.min(bw * 0.2, bh * 0.12), ts: disp, fill: P.on, maxLines: 2, lh: 1, upper: true });
    out.push(<g key="b">{bn}</g>);
    const [wn] = block(data.website || '', { x: cx, y: by + bh - Math.min(bw * 0.07, 22) * 1.15, maxW: bw, size: Math.min(bw * 0.07, 22), ts: { ...bodyB, ls: 2 }, fill: P.on, maxLines: 1 });
    out.push(<g key="w">{wn}</g>);
  } else if (L === 'vertical') {
    // tên thương hiệu chạy dọc, to hết cỡ — kiểu streetwear
    const t = (brand || '').toUpperCase();
    const avail = bh * 0.78;
    const s = Math.min(fitSize(t, avail, bw * 0.62, disp), bw * 0.62);
    const vx = bx + bw * 0.08 + s * 0.78;
    out.push(<g key="v" transform={`translate(${f1(vx)} ${f1(by + bh * 0.02 + avail)}) rotate(-90)`}><Txt x={0} y={0} size={s} ts={disp} fill={P.ink} anchor="start">{t}</Txt></g>);
    const rx = vx + s * 0.25, rw = bx + bw - rx;
    out.push(<rect key="tick" x={f1(rx)} y={f1(by + bh * 0.02)} width={f1(Math.min(rw, 40))} height={8} fill={P.accent} />);
    const [en] = block(est, { x: rx, y: by + bh * 0.06, maxW: rw, size: Math.min(rw * 0.2, 22), ts: { ...bodyB, ls: 1.5 }, fill: P.accent, maxLines: 3, anchor: 'start', upper: true });
    out.push(<g key="e">{en}</g>);
    const [sn] = block(data.slogan || '', { x: rx, y: by + bh * 0.62, maxW: rw, size: Math.min(rw * 0.2, 22), ts: bodyB, fill: P.sub, maxLines: 4, anchor: 'start', upper: true, lh: 1.25 });
    out.push(<g key="s">{sn}</g>);
    const [wn] = block(data.website || '', { x: bx, y: by + bh - Math.min(bw * 0.065, 22) * 1.15, maxW: bw, size: Math.min(bw * 0.065, 22), ts: { ...bodyB, ls: 2 }, fill: P.ink, maxLines: 1, anchor: 'start', upper: true });
    out.push(<g key="w">{wn}</g>);
  } else if (L === 'kids') {
    // chấm, sao, sóng màu ở 2 mép — khu chữ để trống
    seedV = 3 + spec.shape.length;
    const cols = [P.accent, P.acc2 || P.accent, P.acc3 || P.sub];
    const deco: ReactNode[] = [];
    for (let i = 0; i < 26; i++) {
      const top = i % 2 === 0;
      const x = -b + rnd() * (W + 2 * b);
      const y = top ? by - 20 + rnd() * bh * 0.1 : by + bh * 0.88 + rnd() * (H - by - bh * 0.88 + b);
      const c = cols[i % 3];
      const k = rnd();
      deco.push(k < 0.45 ? <circle key={i} cx={f1(x)} cy={f1(y)} r={f1(6 + rnd() * 10)} fill={c} /> : k < 0.75 ? <path key={i} d={star(x, y, 9 + rnd() * 9)} fill={c} /> : <rect key={i} x={f1(x)} y={f1(y)} width={f1(18 + rnd() * 14)} height={7} rx={3.5} fill={c} transform={`rotate(${Math.round(rnd() * 180)} ${f1(x)} ${f1(y)})`} />);
    }
    out.push(<g key="deco" clipPath={artClip}>{deco}</g>);
    const r = Math.min(bw * 0.28, bh * 0.2);
    const my = by + bh * 0.1 + r;
    out.push(<path key="cloud" d={cloud(cx, my, r)} fill={P.acc2 || P.accent} />);
    out.push(<Mark key="m" cx={cx} cy={my + r * 0.08} r={r * 0.62} P={{ ...P, accent: P.ink }} ts={disp} brand={brand} logo={logo} style="plain" />);
    const [bn, bh1] = block(brand, { x: cx, y: my + r + bh * 0.06, maxW: bw, size: Math.min(bw * 0.22, bh * 0.15), ts: disp, fill: P.accent, maxLines: 2, lh: 0.98 });
    out.push(<g key="b">{bn}</g>);
    const [sn] = block(data.slogan || '', { x: cx, y: my + r + bh * 0.09 + bh1, maxW: bw * 0.9, size: Math.min(bw * 0.09, 28), ts: bodyB, fill: P.ink, maxLines: 2 });
    out.push(<g key="s">{sn}</g>);
  } else {
    // stamp — handmade: dấu tròn chữ chạy vòng + đường may viền
    out.push(<path key="dash" d={shapePath(spec.shape, 2.4)} fill="none" stroke={P.ink} strokeWidth={2.2} strokeDasharray="9 6" opacity={0.75} />);
    const r = Math.min(bw * 0.46, bh * 0.28);
    const my = by + r + bh * 0.01;
    out.push(<RingStamp key="st" cx={cx} cy={my} r={r} text={`HANDMADE • WITH LOVE • ${(est || '').toUpperCase()} • `} P={P} ts={bodyB} brand={brand} logo={logo} disp={disp} />);
    const [bn, bh1] = block(brand, { x: cx, y: my + r + bh * 0.06, maxW: bw, size: Math.min(bw * 0.24, bh * 0.14), ts: disp, fill: P.ink, maxLines: 2, lh: 1 });
    out.push(<g key="b">{bn}</g>);
    const [sn] = block(data.slogan || '', { x: cx, y: my + r + bh * 0.09 + bh1, maxW: bw * 0.92, size: Math.min(bw * 0.085, 28), ts: body, fill: P.ink, maxLines: 2 });
    out.push(<g key="s">{sn}</g>);
    const [wn] = block(data.website || '', { x: cx, y: by + bh - Math.min(bw * 0.07, 22) * 1.15, maxW: bw, size: Math.min(bw * 0.07, 22), ts: { ...bodyB, ls: 2 }, fill: P.ink, maxLines: 1, upper: true });
    out.push(<g key="w">{wn}</g>);
  }
  return out;
}

const heart = (x: number, y: number, s: number) => `M${f1(x)} ${f1(y + s * 0.35)}C${f1(x - s * 1.1)} ${f1(y - s * 0.35)} ${f1(x - s * 0.45)} ${f1(y - s * 0.95)} ${f1(x)} ${f1(y - s * 0.4)}C${f1(x + s * 0.45)} ${f1(y - s * 0.95)} ${f1(x + s * 1.1)} ${f1(y - s * 0.35)} ${f1(x)} ${f1(y + s * 0.35)}Z`;
const star = (x: number, y: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${f1(x + Math.cos(a) * rr)} ${f1(y + Math.sin(a) * rr)}`; }
  return d + 'Z';
};
const cloud = (x: number, y: number, r: number) => {
  const c = (cx: number, cy: number, rr: number) => `M${f1(cx - rr)} ${f1(cy)}a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(rr * 2)} 0a${f1(rr)} ${f1(rr)} 0 1 0 ${f1(-rr * 2)} 0Z`;
  return c(x, y, r * 0.72) + c(x - r * 0.62, y + r * 0.22, r * 0.45) + c(x + r * 0.62, y + r * 0.22, r * 0.45) + c(x - r * 0.3, y - r * 0.35, r * 0.42) + c(x + r * 0.35, y - r * 0.3, r * 0.4);
};

/** dấu tròn: chữ chạy vòng (mỗi ký tự 1 <text> → outline được) + tên/monogram giữa */
function RingStamp({ cx, cy, r, text, P, ts, brand, logo, disp }: { cx: number; cy: number; r: number; text: string; P: HTPalette; ts: TS; brand?: string; logo?: string; disp?: TS }) {
  const chars = [...text];
  const fs = Math.max(8, Math.min(r * 0.2, (Math.PI * 2 * r * 0.78) / Math.max(1, chars.length) / 0.62));
  const rr = r - fs * 0.95;
  return (
    <g>
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(r)} fill="none" stroke={P.ink} strokeWidth={2.4} />
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(rr - fs * 0.35)} fill="none" stroke={P.ink} strokeWidth={1.4} />
      {chars.map((ch, i) => {
        const a = (i / chars.length) * 360;
        return (
          <g key={i} transform={`rotate(${a.toFixed(2)} ${f1(cx)} ${f1(cy)})`}>
            <text x={f1(cx)} y={f1(cy - rr)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f1(fs * 0.78)} fill={P.ink} textAnchor="middle">{ch}</text>
          </g>
        );
      })}
      {logo
        ? <image href={logo} x={f1(cx - rr * 0.62)} y={f1(cy - rr * 0.62)} width={f1(rr * 1.24)} height={f1(rr * 1.24)} preserveAspectRatio="xMidYMid meet" />
        : brand !== undefined && disp
          ? <Txt x={cx} y={cy + Math.min(rr * 0.5, fitSize(initials(brand), rr * 1.1, rr * 0.8, disp)) * 0.36} size={Math.min(rr * 0.8, fitSize(initials(brand), rr * 1.1, rr * 0.8, disp))} ts={disp} fill={P.ink}>{initials(brand)}</Txt>
          : <path d={heart(cx, cy, rr * 0.45)} fill={P.ink} />}
    </g>
  );
}

let uidN = 0;
/** 1 mặt tag/thẻ. layer screen = xem trước (cắt theo hình, lộ lỗ); print = file in (tràn lề, không cắt); foil = mặt nạ ép kim */
export function HangtagSvg(p: HTFaceProps) {
  const [uid] = useState(() => p.uid || `ht${++uidN}`);
  const sh = htShape(p.spec.shape);
  const W = sh.wMm * U, H = sh.hMm * U;
  const layer = p.layer || 'screen';
  const b = p.bleed ? HT_BLEED_MM * U : 0;
  const hole = holeOf(p.spec.shape);
  const screen = layer === 'screen';
  const cut = cutPath(p.spec.shape);
  return (
    <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={p.style} data-ht-side={p.side} data-ht-shape={p.spec.shape} preserveAspectRatio="xMidYMid meet">
      <defs>
        <clipPath id={`${uid}-art`}><path d={shapePath(p.spec.shape, p.bleed ? -HT_BLEED_MM : 0)} /></clipPath>
        <clipPath id={`${uid}-cut`}><path d={cut} clipRule="evenodd" /></clipPath>
      </defs>
      <g clipPath={screen ? `url(#${uid}-cut)` : undefined}>{faceArt(p, uid)}</g>
      {screen && <path d={cut} fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={2} fillRule="evenodd" data-cut="1" />}
      {screen && hole && p.spec.eyelet && (
        <g data-eyelet="1">
          <circle cx={hole.cx} cy={hole.cy} r={hole.r + 7} fill="none" stroke="#B9BEC6" strokeWidth={13} />
          <circle cx={hole.cx} cy={hole.cy} r={hole.r + 7} fill="none" stroke="#E7EAEE" strokeWidth={4} />
        </g>
      )}
      {screen && hole && <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill="none" data-hole="1" />}
    </svg>
  );
}

// ---------- tờ in bình nhiều con ----------
export const HT_SHEETS = [
  { id: 'a4', name: 'A4 · 210×297', wMm: 210, hMm: 297 },
  { id: 'sra3', name: 'SRA3 · 320×450', wMm: 320, hMm: 450 },
];
const SHEET_MARGIN = 8, SHEET_GAP = 5;
export function htSheetFit(shape: HTShape, sheetId: string) {
  const sh = htShape(shape);
  const sheet = HT_SHEETS.find((s) => s.id === sheetId) || HT_SHEETS[0];
  const cols = Math.max(1, Math.floor((sheet.wMm - SHEET_MARGIN * 2 + SHEET_GAP) / (sh.wMm + SHEET_GAP)));
  const rows = Math.max(1, Math.floor((sheet.hMm - SHEET_MARGIN * 2 - 6 + SHEET_GAP) / (sh.hMm + SHEET_GAP)));
  const x0 = (sheet.wMm - (cols * sh.wMm + (cols - 1) * SHEET_GAP)) / 2;
  const y0 = (sheet.hMm - 6 - (rows * sh.hMm + (rows - 1) * SHEET_GAP)) / 2;
  return { cols, rows, per: cols * rows, x0, y0, sh, sheet };
}

/** tờ in: lớp In (mỗi con nền tràn 2mm) + lớp CutContour (hình + lỗ). Mặt sau: đảo cột để in 2 mặt khớp (lật theo chiều ngang). */
export function HangtagSheetSvg({ spec, data, logo, sheetId, side, withCut = true, style }: { spec: HTSpec; data: HTData; logo?: string; sheetId: string; side: 'front' | 'back'; withCut?: boolean; style?: CSSProperties }) {
  const [uid] = useState(() => `hts${++uidN}`);
  const fit = htSheetFit(spec.shape, sheetId);
  const { sh, sheet } = fit;
  const W = sheet.wMm * U, H = sheet.hMm * U, b = HT_BLEED_MM * U;
  const tw = sh.wMm * U, th = sh.hMm * U;
  const cells = Array.from({ length: fit.per }, (_, i) => {
    const c = i % fit.cols, r = Math.floor(i / fit.cols);
    const cc = side === 'back' ? fit.cols - 1 - c : c;
    return { x: (fit.x0 + cc * (sh.wMm + SHEET_GAP)) * U, y: (fit.y0 + r * (sh.hMm + SHEET_GAP)) * U };
  });
  const cut = cutPath(spec.shape);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${sheet.wMm}mm`} height={`${sheet.hMm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-ht-sheet={side} data-count={cells.length}>
      <defs>
        <clipPath id={`${uid}-cell`}><rect x={-b} y={-b} width={tw + 2 * b} height={th + 2 * b} /></clipPath>
        <clipPath id={`${uid}-art`}><path d={shapePath(spec.shape, -HT_BLEED_MM)} /></clipPath>
      </defs>
      <g id="In">
        {cells.map((c, i) => (
          <g key={i} transform={`translate(${f1(c.x)} ${f1(c.y)})`} clipPath={`url(#${uid}-cell)`}>
            {faceArt({ spec, data, side, logo, layer: 'print', bleed: true }, uid)}
          </g>
        ))}
      </g>
      {withCut && (
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1.5}>
          <title>CutContour</title>
          {cells.map((c, i) => <path key={i} d={cut} transform={`translate(${f1(c.x)} ${f1(c.y)})`} />)}
        </g>
      )}
      <text x={f1(SHEET_MARGIN * U)} y={f1(H - 30)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={26} fill="#9CA3AF">
        {`Mivy · ${spec.kind === 'tag' ? 'Tag treo' : 'Thẻ cảm ơn'} ${sh.name} · mặt ${side === 'front' ? 'trước' : 'sau (đã đảo cột để in 2 mặt)'} · ${cells.length} con/tờ · nền tràn ${HT_BLEED_MM}mm · CutContour = đường bế`}
      </text>
    </svg>
  );
}
