'use client';
// Túi đựng ly trà sữa / cà phê mang đi: túi PE 1–2 ly (quai áo thun hoặc quai bấm lỗ, đáy xếp hông vừa đế ly Ø9–10cm),
// túi giấy kraft đựng 2–4 ly (có khay giấy cài ly), túi vải không dệt 2 ly (dùng lại).
// In flexo / lụa 1–2 màu mực đặc trên nền vật liệu (màng / giấy / vải KHÔNG phải mực) → mỗi bố cục chỉ dùng đúng số màu khách chọn.
// Engine SVG đơn vị mm (gốc trái-trên), render code 100% (0 AI). Chữ đo thật bằng canvas, co cho vừa vùng in.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { TP_INKS, measure, tpInk, logoToMask, useTPFonts, TP_FONT_CSS, type TPLogo } from './tape-engine';
import { qrPath } from './flyer-qr';

export { logoToMask, useTPFonts as useCCFonts };
export const CC_FONT_CSS = TP_FONT_CSS;
export type CCLogo = TPLogo;
export const CC_INKS = TP_INKS;
export const ccInk = tpInk;

// ---------- loại túi & khổ ----------
export type CCKind = 'pe' | 'kraft' | 'fabric';
export const CC_KINDS: { id: CCKind; name: string; sub: string }[] = [
  { id: 'pe', name: 'Túi PE 1–2 ly', sub: 'Màng PE quai xách, đáy xếp hông vừa đế ly — rẻ, phổ biến nhất' },
  { id: 'kraft', name: 'Túi giấy kraft 2–4 ly', sub: 'Túi giấy đáy vuông quai dẹt + khay giấy cài ly — sang, thân thiện' },
  { id: 'fabric', name: 'Túi vải không dệt 2 ly', sub: 'Túi vải dùng lại nhiều lần, quai may — quà khách quen' },
];
/** w/h: mặt túi (mm); g: xếp hông đáy (tổng, PE/vải); d: chiều sâu đáy (kraft); cups: số ly */
export interface CCSize { id: string; kind: CCKind; name: string; w: number; h: number; g: number; d: number; cups: number }
export const CC_SIZES: CCSize[] = [
  { id: 'pe1', kind: 'pe', name: '1 ly · 15 × 30 cm (đáy 10)', w: 150, h: 300, g: 100, d: 0, cups: 1 },
  { id: 'pe2', kind: 'pe', name: '2 ly · 26 × 30 cm (đáy 10)', w: 260, h: 300, g: 100, d: 0, cups: 2 },
  { id: 'kraft2', kind: 'kraft', name: '2 ly · 21 × 11,5 × 12,5 cm', w: 210, h: 125, g: 0, d: 115, cups: 2 },
  { id: 'kraft4', kind: 'kraft', name: '4 ly · 22 × 22 × 12,5 cm', w: 220, h: 125, g: 0, d: 220, cups: 4 },
  { id: 'fab2', kind: 'fabric', name: '2 ly · 25 × 22 cm (đáy 10)', w: 250, h: 220, g: 100, d: 0, cups: 2 },
];
export const ccSize = (id: string) => CC_SIZES.find((s) => s.id === id) || CC_SIZES[0];
export const ccSizesOf = (k: CCKind) => CC_SIZES.filter((s) => s.kind === k);

export type CCHandle = 'tshirt' | 'slot';
export const CC_HANDLES: { id: CCHandle; name: string }[] = [
  { id: 'tshirt', name: 'Quai xách (miệng mở, ống hút ló ra)' },
  { id: 'slot', name: 'Quai bấm lỗ (miệng hàn kín)' },
];

// ---------- vật liệu nền (không phải mực) ----------
export interface CCMedia { id: string; kind: CCKind; name: string; hex: string; opacity: number; dark: boolean }
export const CC_MEDIA: CCMedia[] = [
  { id: 'clear', kind: 'pe', name: 'Màng trong', hex: '#EEF3F2', opacity: 0.3, dark: false },
  { id: 'milk', kind: 'pe', name: 'Trắng sữa', hex: '#F5F3EE', opacity: 0.86, dark: false },
  { id: 'pink', kind: 'pe', name: 'Hồng', hex: '#F4AFC6', opacity: 0.9, dark: false },
  { id: 'yellow', kind: 'pe', name: 'Vàng', hex: '#F6CD3C', opacity: 0.92, dark: false },
  { id: 'black', kind: 'pe', name: 'Đen', hex: '#1F1F22', opacity: 0.97, dark: true },
  { id: 'green', kind: 'pe', name: 'Xanh lá', hex: '#2F9E5E', opacity: 0.94, dark: true },
  { id: 'kraft', kind: 'kraft', name: 'Kraft nâu', hex: '#B68A5C', opacity: 1, dark: false },
  { id: 'kwhite', kind: 'kraft', name: 'Kraft trắng', hex: '#F2EDE3', opacity: 1, dark: false },
  { id: 'kblack', kind: 'kraft', name: 'Kraft đen', hex: '#2A2622', opacity: 1, dark: true },
  { id: 'cream', kind: 'fabric', name: 'Vải kem', hex: '#EFE6D2', opacity: 1, dark: false },
  { id: 'fnavy', kind: 'fabric', name: 'Vải navy', hex: '#22355C', opacity: 1, dark: true },
  { id: 'fred', kind: 'fabric', name: 'Vải đỏ', hex: '#C02A35', opacity: 1, dark: true },
  { id: 'fpink', kind: 'fabric', name: 'Vải hồng', hex: '#EBA9BD', opacity: 1, dark: false },
  { id: 'fgreen', kind: 'fabric', name: 'Vải xanh lá', hex: '#2E7D57', opacity: 1, dark: true },
  { id: 'fblack', kind: 'fabric', name: 'Vải đen', hex: '#222225', opacity: 1, dark: true },
];
export const ccMedia = (id: string) => CC_MEDIA.find((m) => m.id === id) || CC_MEDIA[1];
export const ccMediaOf = (k: CCKind) => CC_MEDIA.filter((m) => m.kind === k);

const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** mực gần màu nền → in ra khó đọc */
export const ccLowContrast = (inkId: string, mediaId: string) => Math.abs(lum(tpInk(inkId).hex) - lum(ccMedia(mediaId).hex)) < 0.22;

// ---------- font (đều có TTF → file in outline được) ----------
export interface CCFont { id: string; name: string; family: string; weight: number }
export const CC_FONTS: CCFont[] = [
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
export const ccFont = (id: string) => CC_FONTS.find((f) => f.id === id) || CC_FONTS[0];
const BODY = 'Be Vietnam Pro';

// ---------- đồ uống (icon vẽ code + màu nước 3D) ----------
export type CCDrink = 'tea' | 'coffee' | 'juice' | 'smoothie' | 'che';
export const CC_DRINKS: { id: CCDrink; name: string }[] = [
  { id: 'tea', name: 'Trà sữa' }, { id: 'coffee', name: 'Cà phê' }, { id: 'juice', name: 'Nước ép' },
  { id: 'smoothie', name: 'Sinh tố' }, { id: 'che', name: 'Chè' },
];

// ---------- bố cục & mẫu ----------
export interface CCLayout { id: string; name: string }
export const CC_LAYOUTS: CCLayout[] = [
  { id: 'classic', name: 'Logo + tên quán' },
  { id: 'cute', name: 'Icon to dễ thương' },
  { id: 'band', name: 'Dải màu khoét chữ' },
  { id: 'qr', name: 'QR đặt món' },
  { id: 'pattern', name: 'Hoạ tiết ly lặp' },
  { id: 'minimal', name: 'Tối giản' },
];
export const ccLayout = (id: string) => CC_LAYOUTS.find((l) => l.id === id) || CC_LAYOUTS[0];

export interface CCSpec { kind: CCKind; size: string; media: string; inks: string[]; font: string; layout: string; drink: CCDrink; handle: CCHandle; faces: 1 | 2 }
export type CCData = Record<string, string>;
export interface CCTemplate { id: string; name: string; spec: Pick<CCSpec, 'kind' | 'media' | 'inks' | 'font' | 'layout' | 'drink'>; data?: CCData }
export const CC_TEMPLATES: CCTemplate[] = [
  { id: 'tea-milk', name: 'Trà sữa · PE trắng sữa', spec: { kind: 'pe', media: 'milk', inks: ['brown', 'pink'], font: 'baloo', layout: 'classic', drink: 'tea' } },
  { id: 'tea-clear', name: 'Trà sữa · PE trong hồng', spec: { kind: 'pe', media: 'clear', inks: ['pink'], font: 'baloo', layout: 'cute', drink: 'tea' } },
  { id: 'tea-pink', name: 'Trà sữa · PE hồng', spec: { kind: 'pe', media: 'pink', inks: ['brown', 'white'], font: 'montserrat', layout: 'band', drink: 'tea' }, data: { brand: 'BẢO NGỌC TEA', tag: 'TRÀ SỮA · TOPPING' } },
  { id: 'coffee-black', name: 'Cà phê · PE đen', spec: { kind: 'pe', media: 'black', inks: ['white', 'yellow'], font: 'oswald', layout: 'classic', drink: 'coffee' }, data: { brand: 'QUỐC BẢO COFFEE', tag: 'CÀ PHÊ RANG XAY', slogan: 'Đậm vị — tỉnh cả ngày' } },
  { id: 'juice-yellow', name: 'Nước ép · PE vàng', spec: { kind: 'pe', media: 'yellow', inks: ['red', 'teal'], font: 'baloo', layout: 'cute', drink: 'juice' }, data: { brand: 'ÉP TƯƠI GIA KHÁNH', tag: 'NƯỚC ÉP · TRÁI CÂY', slogan: 'Tươi mỗi ngày — không đường' } },
  { id: 'coffee-qr', name: 'Cà phê · PE QR đặt món', spec: { kind: 'pe', media: 'milk', inks: ['navy'], font: 'bvp', layout: 'qr', drink: 'coffee' }, data: { brand: 'AN KHANG COFFEE', tag: 'CÀ PHÊ · TRÀ', slogan: 'Quét mã — đặt món, giao tận nơi' } },
  { id: 'smoothie-green', name: 'Sinh tố · PE xanh lá', spec: { kind: 'pe', media: 'green', inks: ['white'], font: 'dancing', layout: 'minimal', drink: 'smoothie' }, data: { brand: 'Thu Hà Smoothie', tag: 'SINH TỐ · SỮA CHUA', slogan: 'Mát lành từ trái cây' } },
  { id: 'kraft-coffee', name: 'Cà phê · kraft nâu', spec: { kind: 'kraft', media: 'kraft', inks: ['black'], font: 'oswald', layout: 'classic', drink: 'coffee' }, data: { brand: 'QUỐC BẢO COFFEE', tag: 'CÀ PHÊ MANG ĐI', slogan: 'Một ly — đủ năng lượng' } },
  { id: 'kraft-tea-pattern', name: 'Trà sữa · kraft trắng', spec: { kind: 'kraft', media: 'kwhite', inks: ['brown', 'pink'], font: 'baloo', layout: 'pattern', drink: 'tea' } },
  { id: 'kraft-qr', name: 'Sinh tố · kraft QR', spec: { kind: 'kraft', media: 'kraft', inks: ['brown'], font: 'montserrat', layout: 'qr', drink: 'smoothie' }, data: { brand: 'THU HÀ SMOOTHIE', tag: 'SINH TỐ · NƯỚC ÉP', slogan: 'Quét mã — đặt món nhanh' } },
  { id: 'fabric-che', name: 'Chè · vải kem', spec: { kind: 'fabric', media: 'cream', inks: ['red'], font: 'playfair', layout: 'classic', drink: 'che' }, data: { brand: 'CHÈ AN KHANG', tag: 'CHÈ · TÀU HŨ · SỮA CHUA', slogan: 'Ngọt thanh như vị nhà' } },
  { id: 'fabric-coffee', name: 'Cà phê · vải navy', spec: { kind: 'fabric', media: 'fnavy', inks: ['white'], font: 'baloo', layout: 'cute', drink: 'coffee' }, data: { brand: 'GIA KHÁNH COFFEE', tag: 'CÀ PHÊ · TRÀ', slogan: 'Mang theo — dùng lại nhiều lần' } },
];

export interface CCField { key: string; label: string; ph?: string; half?: boolean }
export const CC_FIELDS: CCField[] = [
  { key: 'brand', label: 'Tên quán', ph: 'TRÀ SỮA AN KHANG', half: true },
  { key: 'tag', label: 'Dòng nhỏ (món chính)', ph: 'TRÀ SỮA · TOPPING', half: true },
  { key: 'slogan', label: 'Slogan', ph: 'Ngon từng ngụm', half: true },
  { key: 'phone', label: 'Hotline / Zalo', ph: '0909 123 456', half: true },
  { key: 'social', label: 'Fanpage / website', ph: 'fb.com/trasuaankhang', half: true },
  { key: 'qr', label: 'Link đặt món (tạo mã QR)', ph: 'https://ankhang.vn/dat-mon', half: true },
];
export const defaultCCData = (): CCData => ({
  brand: 'TRÀ SỮA AN KHANG', tag: 'TRÀ SỮA · TOPPING', slogan: 'Ngon từng ngụm', phone: '0909 123 456',
  social: 'fb.com/trasuaankhang', qr: 'https://ankhang.vn/dat-mon',
});

// ---------- hình học 1 mặt túi (mm, gốc trái-trên, y xuống) ----------
export interface CCGeom {
  W: number; H: number;       // khổ 1 mặt trải phẳng (kể cả nửa xếp hông đáy / viền gấp miệng)
  body: number;               // chiều cao thân (đến nếp gấp đáy)
  top: number;                // y miệng túi trên file (kraft: dưới viền gấp)
  outline: string;            // đường cắt ngoài
  hole: string | null;        // lỗ quai bấm / miệng khoét
  folds: number[];            // nếp gấp ngang (y)
  seals: number[];            // đường hàn / may dọc (x)
  handles: { x: number; y: number; w: number; h: number }[]; // vị trí dán/may quai (kraft, vải)
  area: { x: number; y: number; w: number; h: number };      // vùng in an toàn
  mouth: { x: number; w: number; depth: number; r: number } | null; // khoét miệng quai áo thun
}
export function ccGeom(sz: CCSize, handle: CCHandle): CCGeom {
  const W = sz.w;
  if (sz.kind === 'pe') {
    const body = sz.h, H = body + sz.g / 2;
    if (handle === 'slot') {
      const hw = Math.min(W * 0.46, 96), hh = 24, hy = 26, hx = (W - hw) / 2, r = hh / 2;
      const hole = `M${hx + r} ${hy} H${hx + hw - r} A${r} ${r} 0 0 1 ${hx + hw - r} ${hy + hh} H${hx + r} A${r} ${r} 0 0 1 ${hx + r} ${hy} Z`;
      const top = hy + hh + 22;
      return { W, H, body, top: 0, outline: `M0 0 H${W} V${H} H0 Z`, hole, folds: [body], seals: [6, W - 6], handles: [], area: { x: 12, y: top, w: W - 24, h: body - 14 - top }, mouth: null };
    }
    const cw = W * 0.52, cx = (W - cw) / 2, r = cw / 2, depth = Math.round(body * 0.3);
    const outline = `M0 0 H${cx} V${depth - r} A${r} ${r} 0 0 0 ${cx + cw} ${depth - r} V0 H${W} V${H} H0 Z`;
    const top = depth + 16;
    return { W, H, body, top: 0, outline, hole: null, folds: [body], seals: [6, W - 6], handles: [], area: { x: 12, y: top, w: W - 24, h: body - 14 - top }, mouth: { x: cx, w: cw, depth, r } };
  }
  if (sz.kind === 'kraft') {
    const hem = 30, body = sz.h, H = hem + body + sz.d / 2;
    const hw = 22, hy = 0;
    return {
      W, H, body, top: hem, outline: `M0 0 H${W} V${H} H0 Z`, hole: null, folds: [hem, hem + body], seals: [],
      handles: [{ x: W * 0.3 - hw / 2, y: hy + 4, w: hw, h: hem - 8 }, { x: W * 0.7 - hw / 2, y: hy + 4, w: hw, h: hem - 8 }],
      area: { x: 12, y: hem + 12, w: W - 24, h: body - 24 }, mouth: null,
    };
  }
  // vải không dệt: thân + nửa đáy, quai may 2 bên miệng
  const body = sz.h, H = body + sz.g / 2, sw = 28;
  return {
    W, H, body, top: 0, outline: `M0 0 H${W} V${H} H0 Z`, hole: null, folds: [16, body], seals: [8, W - 8],
    handles: [{ x: W * 0.22 - sw / 2, y: 0, w: sw, h: 34 }, { x: W * 0.78 - sw / 2, y: 0, w: sw, h: 34 }],
    area: { x: 16, y: 40, w: W - 32, h: body - 40 - 16 }, mouth: null,
  };
}

// ---------- tiện ích chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, f: number, ts: TS, maxW: number) => { const w = measure(t, f, ts); return w > maxW ? (f * maxW) / w : f; };
function split2(t: string): [string, string] {
  const w = (t || '').trim().split(/\s+/);
  if (w.length < 2) return [t || '', ''];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}
// chiều cao dòng theo hộp chữ thật của font (ascent/descent — khớp getBBox) → không font nào chồng dòng
const vmCache = new Map<string, { a: number; d: number }>();
let vctx: CanvasRenderingContext2D | null = null;
function vm(ts: TS): { a: number; d: number } {
  const key = `${ts.wt} ${ts.fam}`;
  if (vmCache.has(key)) return vmCache.get(key)!;
  let res = { a: 0.95, d: 0.27 };
  if (typeof document !== 'undefined') {
    vctx ??= document.createElement('canvas').getContext('2d');
    if (vctx) {
      vctx.font = `${ts.wt} 100px "${ts.fam}"`;
      const m = vctx.measureText('ẮẤỆg');
      if (m.fontBoundingBoxAscent) res = { a: m.fontBoundingBoxAscent / 100, d: m.fontBoundingBoxDescent / 100 };
      if (document.fonts?.check?.(`${ts.wt} 20px "${ts.fam}"`)) vmCache.set(key, res);
    }
  }
  return res;
}

interface Item { h: number; gap?: number; draw: (cx: number, top: number, k: number) => ReactNode }
function textItem(t: string, f: number, ts: TS, fill: string, maxW: number, key: string): Item | null {
  if (!t.trim()) return null;
  const s = fitSize(t, f, ts, maxW);
  const m = vm(ts);
  return {
    h: s * (m.a + m.d) * 1.02,
    draw: (cx, top, k) => <text key={key} x={cx} y={top + s * k * m.a} textAnchor="middle" fontFamily={`'${ts.fam}'`} fontWeight={ts.wt} fontSize={s * k} letterSpacing={ts.ls ? ts.ls * s * k : undefined} fill={fill} data-cct="1">{t}</text>,
  };
}
/** tên quán: 1 dòng nếu đủ to, không thì 2 dòng cân nhau */
function brandItems(t: string, f: number, ts: TS, fill: string, maxW: number, minRatio = 0.62): Item[] {
  const one = fitSize(t, f, ts, maxW);
  if (one >= f * minRatio || !/\s/.test(t.trim())) return [textItem(t, f, ts, fill, maxW, 'b0')].filter(Boolean) as Item[];
  const [a, b] = split2(t);
  const s = Math.min(fitSize(a, f, ts, maxW), fitSize(b, f, ts, maxW));
  return [textItem(a, s, ts, fill, maxW, 'b1'), textItem(b, s, ts, fill, maxW, 'b2')].filter(Boolean) as Item[];
}
const spacer = (h: number): Item => ({ h, draw: () => null });
const shape = (h: number, fn: (cx: number, top: number, k: number) => ReactNode): Item => ({ h, draw: fn });
type Area = CCGeom['area'];
function column(items: (Item | null)[], area: Area, align: 'center' | 'top' = 'center'): ReactNode {
  const its = items.filter(Boolean) as Item[];
  const total = its.reduce((a, it) => a + it.h + (it.gap ?? 0), 0);
  const k = total > area.h ? area.h / total : 1;
  let y = area.y + (align === 'center' ? (area.h - total * k) / 2 : 0);
  const cx = area.x + area.w / 2;
  return its.map((it, i) => { const n = <g key={i}>{it.draw(cx, y, k)}</g>; y += (it.h + (it.gap ?? 0)) * k; return n; });
}

// ---------- icon đồ uống (vẽ code, ô s×s góc trái-trên) — 1 màu mực, chi tiết khoét = lộ nền ----------
type Icon = (x: number, y: number, s: number, fill: string, hole: string) => ReactNode;
const P = (x: number, y: number, s: number) => (fx: number, fy: number) => `${(x + s * fx).toFixed(2)} ${(y + s * fy).toFixed(2)}`;
const icTea: Icon = (x, y, s, fill, hole) => {
  const p = P(x, y, s);
  return (
    <g>
      <path d={`M${p(0.62, 0.02)} L${p(0.7, 0.02)} L${p(0.56, 0.3)} L${p(0.5, 0.3)} Z`} fill={fill} />
      <path d={`M${p(0.22, 0.32)} C${p(0.24, 0.16)} ${p(0.76, 0.16)} ${p(0.78, 0.32)} Z`} fill={fill} />
      <rect x={x + s * 0.18} y={y + s * 0.31} width={s * 0.64} height={s * 0.06} rx={s * 0.02} fill={fill} />
      <path d={`M${p(0.22, 0.4)} L${p(0.78, 0.4)} L${p(0.7, 0.96)} L${p(0.3, 0.96)} Z`} fill={fill} />
      {[[0.38, 0.86], [0.5, 0.88], [0.62, 0.86], [0.44, 0.78], [0.56, 0.78]].map(([a, b], i) => <circle key={i} cx={x + s * a} cy={y + s * b} r={s * 0.045} fill={hole} />)}
      <rect x={x + s * 0.28} y={y + s * 0.5} width={s * 0.44} height={s * 0.035} fill={hole} />
    </g>
  );
};
const icCoffee: Icon = (x, y, s, fill, hole) => {
  const p = P(x, y, s);
  return (
    <g>
      {[0.38, 0.5, 0.62].map((cx, i) => <path key={i} d={`M${p(cx, 0.28)} C${p(cx - 0.06, 0.2)} ${p(cx + 0.06, 0.14)} ${p(cx, 0.04)}`} fill="none" stroke={fill} strokeWidth={s * 0.04} strokeLinecap="round" />)}
      <path d={`M${p(0.2, 0.42)} L${p(0.8, 0.42)} L${p(0.74, 0.34)} L${p(0.26, 0.34)} Z`} fill={fill} />
      <path d={`M${p(0.23, 0.46)} L${p(0.77, 0.46)} L${p(0.69, 0.96)} L${p(0.31, 0.96)} Z`} fill={fill} />
      <path d={`M${p(0.26, 0.6)} L${p(0.74, 0.6)} L${p(0.72, 0.76)} L${p(0.28, 0.76)} Z`} fill={hole} />
    </g>
  );
};
const icJuice: Icon = (x, y, s, fill, hole) => {
  const p = P(x, y, s);
  return (
    <g>
      <path d={`M${p(0.56, 0.04)} L${p(0.62, 0.06)} L${p(0.5, 0.36)} L${p(0.45, 0.34)} Z`} fill={fill} />
      <path d={`M${p(0.22, 0.32)} L${p(0.72, 0.32)} L${p(0.64, 0.96)} L${p(0.3, 0.96)} Z`} fill={fill} />
      <circle cx={x + s * 0.74} cy={y + s * 0.3} r={s * 0.16} fill={fill} />
      <circle cx={x + s * 0.74} cy={y + s * 0.3} r={s * 0.11} fill={hole} />
      {[0, 1, 2, 3, 4, 5].map((i) => { const a = (i / 6) * Math.PI * 2; return <line key={i} x1={x + s * 0.74} y1={y + s * 0.3} x2={x + s * (0.74 + Math.cos(a) * 0.11)} y2={y + s * (0.3 + Math.sin(a) * 0.11)} stroke={fill} strokeWidth={s * 0.02} />; })}
      <path d={`M${p(0.3, 0.5)} L${p(0.62, 0.5)}`} stroke={hole} strokeWidth={s * 0.04} />
    </g>
  );
};
const icSmoothie: Icon = (x, y, s, fill, hole) => {
  const p = P(x, y, s);
  return (
    <g>
      <path d={`M${p(0.46, 0.02)} L${p(0.52, 0.02)} L${p(0.52, 0.3)} L${p(0.46, 0.3)} Z`} fill={fill} />
      <path d={`M${p(0.22, 0.34)} C${p(0.2, 0.18)} ${p(0.8, 0.18)} ${p(0.78, 0.34)} Z`} fill={fill} />
      <path d={`M${p(0.24, 0.38)} L${p(0.76, 0.38)} L${p(0.68, 0.96)} L${p(0.32, 0.96)} Z`} fill={fill} />
      <path d={`M${p(0.5, 0.56)} C${p(0.38, 0.56)} ${p(0.36, 0.76)} ${p(0.5, 0.86)} C${p(0.64, 0.76)} ${p(0.62, 0.56)} ${p(0.5, 0.56)} Z`} fill={hole} />
      <path d={`M${p(0.44, 0.55)} L${p(0.5, 0.5)} L${p(0.56, 0.55)}`} fill="none" stroke={hole} strokeWidth={s * 0.03} />
    </g>
  );
};
const icChe: Icon = (x, y, s, fill, hole) => {
  const p = P(x, y, s);
  return (
    <g>
      <path d={`M${p(0.6, 0.06)} L${p(0.66, 0.08)} L${p(0.52, 0.46)} L${p(0.46, 0.44)} Z`} fill={fill} />
      <path d={`M${p(0.08, 0.46)} L${p(0.92, 0.46)} C${p(0.9, 0.78)} ${p(0.7, 0.9)} ${p(0.5, 0.9)} C${p(0.3, 0.9)} ${p(0.1, 0.78)} ${p(0.08, 0.46)} Z`} fill={fill} />
      <rect x={x + s * 0.36} y={y + s * 0.9} width={s * 0.28} height={s * 0.07} rx={s * 0.02} fill={fill} />
      {[[0.3, 0.56], [0.44, 0.6], [0.58, 0.56], [0.7, 0.6], [0.37, 0.68], [0.52, 0.7], [0.64, 0.68]].map(([a, b], i) => <circle key={i} cx={x + s * a} cy={y + s * b} r={s * 0.035} fill={hole} />)}
    </g>
  );
};
const icPhone = (x: number, y: number, s: number, fill: string) => (
  <path d={`M${x + s * 0.22} ${y + s * 0.08} L${x + s * 0.38} ${y + s * 0.08} L${x + s * 0.46} ${y + s * 0.3} L${x + s * 0.36} ${y + s * 0.4} C${x + s * 0.42} ${y + s * 0.54} ${x + s * 0.5} ${y + s * 0.62} ${x + s * 0.62} ${y + s * 0.66} L${x + s * 0.72} ${y + s * 0.56} L${x + s * 0.92} ${y + s * 0.64} L${x + s * 0.92} ${y + s * 0.8} C${x + s * 0.92} ${y + s * 0.9} ${x + s * 0.84} ${y + s * 0.94} ${x + s * 0.76} ${y + s * 0.92} C${x + s * 0.4} ${y + s * 0.84} ${x + s * 0.14} ${y + s * 0.58} ${x + s * 0.08} ${y + s * 0.22} C${x + s * 0.06} ${y + s * 0.14} ${x + s * 0.12} ${y + s * 0.08} ${x + s * 0.22} ${y + s * 0.08} Z`} fill={fill} />
);
const icGlobe = (x: number, y: number, s: number, fill: string) => (
  <g fill="none" stroke={fill} strokeWidth={s * 0.09}>
    <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.4} />
    <ellipse cx={x + s / 2} cy={y + s / 2} rx={s * 0.17} ry={s * 0.4} />
    <path d={`M${x + s * 0.1} ${y + s / 2} H${x + s * 0.9}`} />
  </g>
);
export const CC_ICONS: Record<CCDrink, Icon> = { tea: icTea, coffee: icCoffee, juice: icJuice, smoothie: icSmoothie, che: icChe };

// ---------- vẽ 1 mặt ----------
interface Ctx { g: CCGeom; ink: (i: number) => string; bg: string; disp: TS; body: TS; bodyB: TS; data: CCData; logo: CCLogo | null; uid: string; drink: CCDrink; mediaDark: boolean }

function iconItem(c: Ctx, h: number, fill: string): Item {
  const fn = CC_ICONS[c.drink];
  return shape(h, (cx, top, k) => {
    const hh = h * k;
    if (!c.logo) return fn(cx - hh / 2, top, hh, fill, c.bg);
    let lh = hh, lw = (c.logo.w / c.logo.h) * lh;
    const maxW = c.g.area.w * 0.7;
    if (lw > maxW) { lw = maxW; lh = (c.logo.h / c.logo.w) * lw; }
    const x = cx - lw / 2, y = top + (hh - lh) / 2, id = `${c.uid}-lg`;
    return (
      <g>
        <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={lw} height={lh}><image href={c.logo.href} x={x} y={y} width={lw} height={lh} preserveAspectRatio="none" /></mask>
        <rect x={x} y={y} width={lw} height={lh} fill={fill} mask={`url(#${id})`} />
      </g>
    );
  });
}
function contactItems(parts: { icon: (x: number, y: number, s: number, f: string) => ReactNode; t: string }[], f: number, ts: TS, fill: string, maxW: number): Item[] {
  const ps = parts.filter((p) => p.t.trim());
  if (!ps.length) return [];
  const wOf = (p: { t: string }, s: number) => s * 1.25 + measure(p.t, s, ts);
  const gap = f * 1.3;
  const one = ps.reduce((a, p) => a + wOf(p, f), 0) + gap * (ps.length - 1);
  const rows = one <= maxW ? [ps] : ps.map((p) => [p]);
  const m = vm(ts);
  return rows.map((r, ri) => {
    const s = Math.min(f, ...r.map((p) => (wOf(p, f) > maxW ? (f * maxW) / wOf(p, f) : f)));
    const tw = r.reduce((a, p) => a + wOf(p, s), 0) + gap * (r.length - 1);
    return {
      h: Math.max(s * 1.15, s * (m.a + m.d) * 1.04),
      gap: ri < rows.length - 1 ? s * 0.12 : 0,
      draw: (cx, top, k) => {
        let x = cx - (tw * k) / 2;
        return r.map((p, i) => {
          const ss = s * k;
          const n = (
            <g key={i}>
              {p.icon(x, top + ss * 0.12, ss * 0.95, fill)}
              <text x={x + ss * 1.25} y={top + ss * Math.max(0.93, m.a)} fontFamily={`'${ts.fam}'`} fontWeight={ts.wt} fontSize={ss} fill={fill} data-cct="1">{p.t}</text>
            </g>
          );
          x += wOf(p, s) * k + gap * k;
          return n;
        });
      },
    } as Item;
  });
}
/** QR luôn "ô tối trên nền sáng": nền sáng + mực tối → vẽ ô bằng mực; nền tối + mực sáng → ô vuông mực, khoét ô QR lộ nền tối */
function qrItem(c: Ctx, side: number, text: string, fillIdx = 0): Item | null {
  if (!text.trim()) return null;
  const q = qrPath(text);
  const inkHex = c.ink(fillIdx);
  const inkLight = lum(inkHex) > lum(c.bg);
  return shape(side, (cx, top, k) => {
    const S = side * k, x = cx - S / 2, y = top, pad = S * 0.08, cell = (S - pad * 2) / q.n, id = `${c.uid}-qr${fillIdx}`;
    if (!inkLight) {
      return <g data-qr="1"><path d={q.d} transform={`translate(${x + pad} ${y + pad}) scale(${cell})`} fill={inkHex} /></g>;
    }
    return (
      <g data-qr="1">
        <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={S} height={S}>
          <rect x={x} y={y} width={S} height={S} fill="#fff" />
          <path d={q.d} transform={`translate(${x + pad} ${y + pad}) scale(${cell})`} fill="#000" />
        </mask>
        <rect x={x} y={y} width={S} height={S} rx={S * 0.04} fill={inkHex} mask={`url(#${id})`} />
      </g>
    );
  });
}

function face(c: Ctx, layout: string, back: boolean): ReactNode {
  const { g, ink, disp, body, bodyB, data } = c;
  const A = g.area, W = A.w;
  const big = Math.min(W * 0.16, A.h * 0.13);
  const contact = (f: number, fill = ink(1)) => contactItems([{ icon: icPhone, t: data.phone || '' }, { icon: icGlobe, t: data.social || '' }], f, body, fill, W);
  const tag = (f: number, fill = ink(1)) => textItem((data.tag || '').toUpperCase(), f, { ...bodyB, ls: 0.16 }, fill, W, 'tg');
  const divider = (w: number, fill = ink(1)) => shape(big * 0.16, (cx, top, k) => <rect x={cx - w / 2} y={top + big * 0.04 * k} width={w} height={Math.max(0.8, big * 0.05 * k)} rx={0.4} fill={fill} />);

  if (back) {
    // mặt sau: lời cảm ơn + QR đặt món + liên hệ
    return column([
      textItem('CẢM ƠN BẠN', big * 0.9, disp, ink(0), W, 'th1'),
      textItem('đã ghé quán!', big * 0.5, body, ink(1), W, 'th2'), spacer(big * 0.4),
      qrItem(c, Math.min(W * 0.42, A.h * 0.34), data.qr || '', 0),
      textItem(data.qr ? 'Quét mã — đặt món lần sau' : '', big * 0.26, body, ink(0), W, 'qrt'), spacer(big * 0.35),
      ...brandItems(data.brand || '', big * 0.48, disp, ink(0), W), ...contact(big * 0.26),
    ], A);
  }
  if (layout === 'cute') {
    return column([
      iconItem(c, big * 2.3, ink(0)), spacer(big * 0.35),
      ...brandItems(data.brand || '', big * 1.05, disp, ink(0), W),
      tag(big * 0.3), spacer(big * 0.35),
      textItem(data.slogan || '', big * 0.42, { fam: disp.fam === 'Dancing Script' ? disp.fam : BODY, wt: disp.fam === 'Dancing Script' ? 700 : 700 }, ink(1), W, 'sl'),
      spacer(big * 0.45), ...contact(big * 0.3, ink(0)),
    ], A);
  }
  if (layout === 'band') {
    const bandH = Math.min(A.h * 0.34, big * 2.6);
    const id = `${c.uid}-band`;
    const nm = brandItems(data.brand || '', big * 0.95, disp, '#000', W * 0.88);
    const tg = textItem((data.tag || '').toUpperCase(), big * 0.28, { ...bodyB, ls: 0.18 }, '#000', W * 0.88, 'tgb');
    const inBand = [...nm, tg].filter(Boolean) as Item[];
    const tot = inBand.reduce((a, it) => a + it.h, 0);
    const kb = tot > bandH * 0.84 ? (bandH * 0.84) / tot : 1;
    let yy = A.y + (bandH - tot * kb) / 2;
    const cx = A.x + W / 2;
    const textNodes = inBand.map((it, i) => { const n = <g key={i}>{it.draw(cx, yy, kb)}</g>; yy += it.h * kb; return n; });
    const rest = { x: A.x, y: A.y + bandH + big * 0.35, w: W, h: A.h - bandH - big * 0.35 };
    return (
      <>
        <mask id={id} maskUnits="userSpaceOnUse" x={A.x - 1} y={A.y - 1} width={W + 2} height={bandH + 2}>
          <rect x={A.x - 1} y={A.y - 1} width={W + 2} height={bandH + 2} fill="#fff" />
          <g fill="#000">{textNodes}</g>
        </mask>
        <rect x={A.x} y={A.y} width={W} height={bandH} rx={5} fill={ink(0)} mask={`url(#${id})`} />
        {column([
          iconItem(c, big * 1.5, ink(0)), spacer(big * 0.3),
          textItem(data.slogan || '', big * 0.42, bodyB, ink(0), W, 'sl'), spacer(big * 0.4),
          ...contact(big * 0.3, ink(1)),
        ], rest)}
      </>
    );
  }
  if (layout === 'qr') {
    return column([
      iconItem(c, big * 0.95, ink(0)), spacer(big * 0.25),
      ...brandItems(data.brand || '', big * 0.85, disp, ink(0), W), tag(big * 0.26, ink(0)), spacer(big * 0.35),
      qrItem(c, Math.min(W * 0.46, A.h * 0.3), data.qr || '', 0), spacer(big * 0.2),
      textItem(data.slogan || '', big * 0.32, bodyB, ink(0), W, 'sl'), spacer(big * 0.3),
      ...contact(big * 0.26, ink(0)),
    ], A);
  }
  if (layout === 'pattern') {
    // 2 hàng icon ly lặp trên/dưới (khoét chi tiết lộ nền) + tên giữa
    const n = Math.max(3, Math.min(7, Math.floor(W / (big * 1.1))));
    const row = (fill: string) => shape(big * 0.9, (cx, top, k) => {
      const s = big * 0.8 * k, step = W / n;
      return <g>{Array.from({ length: n }, (_, i) => <g key={i}>{CC_ICONS[c.drink](A.x + step * (i + 0.5) - s / 2, top, s, fill, c.bg)}</g>)}</g>;
    });
    return column([
      row(ink(1)), spacer(big * 0.5),
      ...brandItems(data.brand || '', big * 1.0, disp, ink(0), W), tag(big * 0.28, ink(0)), spacer(big * 0.3),
      textItem(data.slogan || '', big * 0.38, body, ink(0), W, 'sl'), spacer(big * 0.25),
      ...contact(big * 0.26, ink(0)), spacer(big * 0.5), row(ink(1)),
    ], A);
  }
  if (layout === 'minimal') {
    const fr = { x: A.x + 2, y: A.y, w: W - 4, h: A.h };
    const inner = { x: fr.x + W * 0.08, y: fr.y + A.h * 0.08, w: fr.w - W * 0.16, h: fr.h - A.h * 0.16 };
    return (
      <>
        <rect x={fr.x} y={fr.y} width={fr.w} height={fr.h} rx={3} fill="none" stroke={ink(0)} strokeWidth={0.9} />
        {column([
          iconItem(c, big * 1.0, ink(0)), spacer(big * 0.45),
          ...brandItems(data.brand || '', big * 1.0, disp, ink(0), inner.w), spacer(big * 0.2),
          tag(big * 0.24, ink(0)), spacer(big * 0.5),
          textItem(data.slogan || '', big * 0.34, body, ink(0), inner.w, 'sl'), spacer(big * 0.4),
          ...contactItems([{ icon: icPhone, t: data.phone || '' }], big * 0.26, body, ink(0), inner.w),
        ], inner)}
      </>
    );
  }
  // classic
  return column([
    iconItem(c, big * 1.6, ink(0)), spacer(big * 0.35),
    ...brandItems(data.brand || '', big, disp, ink(0), W), tag(big * 0.3), spacer(big * 0.35),
    divider(W * 0.22), spacer(big * 0.3),
    textItem(data.slogan || '', big * 0.4, body, ink(0), W, 'sl'), spacer(big * 0.45),
    ...contact(big * 0.28),
  ], A);
}

// ---------- SVG ----------
/**
 * face: 1 mặt túi trên nền vật liệu (xem trước, thumbnail).
 * ink: chỉ lớp mực, nền trong suốt (texture 3D).
 * print: file in 1 mặt đúng khổ — nền tham khảo (không in) + In + CutContour (bao/lỗ quai/miệng) + Fold/Seal + vị trí quai + ghi chú.
 */
export type CCMode = 'face' | 'ink' | 'print' | 'tex';
export const CC_MARGIN = 14;

export function CupCarrierSvg({ spec, data, logo = null, side = 'front', mode = 'face', blank = false, style }: {
  spec: CCSpec; data: CCData; logo?: CCLogo | null; side?: 'front' | 'back'; mode?: CCMode; blank?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '') + side[0] + mode[0];
  const sz = ccSize(spec.size);
  const g = ccGeom(sz, spec.handle);
  const med = ccMedia(spec.media);
  const fnt = ccFont(spec.font);
  const inks = spec.inks.length ? spec.inks : ['black'];
  const ink = (i: number) => tpInk(inks[Math.min(i, inks.length - 1, 1)]).hex;
  const c: Ctx = {
    g, ink, bg: med.hex, uid, logo, drink: spec.drink, mediaDark: med.dark, data,
    disp: { fam: fnt.family, wt: fnt.weight }, body: { fam: BODY, wt: 600 }, bodyB: { fam: BODY, wt: 800 },
  };
  const back = side === 'back';
  const clip = `${uid}-area`;
  const art = (
    <g id="In">
      <clipPath id={clip}><rect x={g.area.x - 0.5} y={g.area.y - 0.5} width={g.area.w + 1} height={g.area.h + 1} /></clipPath>
      <g clipPath={`url(#${clip})`}>{face(c, spec.layout, back)}</g>
    </g>
  );
  const area = `${g.area.x} ${g.area.y} ${g.area.w} ${g.area.h}`;
  const holeCut = `${uid}-cut`;
  const outlineWithHole = g.hole ? `${g.outline} ${g.hole}` : g.outline;

  if (mode === 'ink') {
    return <svg viewBox={`0 0 ${g.W} ${g.H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-area={area}>{art}</svg>;
  }
  if (mode === 'print') {
    const M = CC_MARGIN;
    const nInk = Math.min(inks.length, 2);
    const kindName = CC_KINDS.find((k) => k.id === sz.kind)!.name;
    const note = `${kindName} ${sz.name} · mặt ${back ? 'sau' : 'trước'} · nền ${med.name.toLowerCase()} (không in) · ${nInk} màu mực: ${inks.slice(0, nInk).map((i) => tpInk(i).name).join(', ')}`;
    return (
      <svg viewBox={`${-M} ${-M} ${g.W + M * 2} ${g.H + M * 2}`} width={`${g.W + M * 2}mm`} height={`${g.H + M * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-area={area}>
        <g id="NenThamKhao" opacity={med.opacity < 0.6 ? 0.35 : 0.5}><path d={outlineWithHole} fill={med.hex} fillRule="evenodd" /></g>
        {art}
        <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.35}>
          <path d={g.outline} />
          {g.hole && <path d={g.hole} />}
        </g>
        {g.folds.length > 0 && (
          <g id="Fold" stroke="#00A651" strokeWidth={0.35} strokeDasharray="1.5 1.5" fill="none">
            {g.folds.map((y) => <line key={y} x1={0} y1={y} x2={g.W} y2={y} />)}
          </g>
        )}
        {g.seals.length > 0 && (
          <g id="Seal" stroke="#0091D5" strokeWidth={0.35} strokeDasharray="4 2" fill="none">
            {g.seals.map((x) => <line key={x} x1={x} y1={g.mouth ? 0 : 0} x2={x} y2={g.H} />)}
          </g>
        )}
        {g.handles.length > 0 && (
          <g id="Quai" fill="none" stroke="#F7941D" strokeWidth={0.35} strokeDasharray="3 1.5">
            {g.handles.map((h, i) => <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} />)}
          </g>
        )}
        <rect x={g.area.x} y={g.area.y} width={g.area.w} height={g.area.h} fill="none" stroke="#9AA3AD" strokeWidth={0.25} strokeDasharray="2 2" data-safe="1" />
        <text x={0} y={-M * 0.42} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={4} fill="#111">{note}</text>
        <text x={0} y={g.H + M * 0.62} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={3.2} fill="#111">Hồng = đường cắt · Xanh lá chấm = nếp gấp (đáy{sz.kind === 'kraft' ? ', viền miệng' : ''}) · Xanh dương = hàn/may · Cam = vị trí quai · Xám = vùng in an toàn</text>
      </svg>
    );
  }
  // face: nền + mực, cắt theo hình túi (lỗ quai / miệng khoét trong suốt)
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-area={area}>
      <clipPath id={holeCut}><path d={outlineWithHole} fillRule="evenodd" clipRule="evenodd" /></clipPath>
      <g clipPath={`url(#${holeCut})`}>
        <rect data-media="1" x={0} y={0} width={g.W} height={g.H} fill={med.hex} opacity={mode === 'tex' ? med.opacity : 1} />
        {g.folds.map((y) => <rect key={y} x={0} y={y - 0.6} width={g.W} height={1.2} fill={med.dark ? '#fff' : '#000'} opacity={0.08} />)}
        {g.handles.map((h, i) => <rect key={i} x={h.x} y={h.y} width={h.w} height={h.h} fill={med.dark ? '#fff' : '#000'} opacity={0.05} />)}
        {!blank && art}
      </g>
      {g.hole && <path d={g.hole} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={1.2} />}
    </svg>
  );
}

/** số màu mực thật sự dùng trong lớp In (bỏ mask/clip/defs; màu nền dùng khoét chi tiết không tính) — QC */
export function ccInkColors(svg: SVGSVGElement, bg: string): string[] {
  const set = new Set<string>();
  svg.querySelectorAll('#In *').forEach((el) => {
    if (el.closest('mask,clipPath,defs')) return;
    for (const a of ['fill', 'stroke']) {
      const v = el.getAttribute(a);
      if (v && v !== 'none' && !v.startsWith('url(') && v.toUpperCase() !== bg.toUpperCase()) set.add(v.toUpperCase());
    }
  });
  return [...set];
}
