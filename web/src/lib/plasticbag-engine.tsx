'use client';
// Túi xốp / túi nilon in logo: túi HD quai đục lỗ (die-cut) & túi xốp quai xách (áo thun / quai vest).
// In flexo 1–2 màu mực đặc trên màng màu (màng KHÔNG phải mực) → mỗi bố cục chỉ dùng đúng số màu khách chọn.
// Engine SVG đơn vị mm (gốc trái-trên), render code 100% (0 AI). Chữ đo thật bằng canvas, co cho vừa vùng in.
// Vùng in tránh: lỗ quai + miếng gia cố, đường hàn đáy, nếp hông (túi quai xách). Logo khách → bóng 1 màu.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { TP_INKS, measure, tpInk, logoToMask, useTPFonts, TP_FONT_CSS, type TPLogo } from './tape-engine';

export { logoToMask, useTPFonts as usePBFonts };
export const PB_FONT_CSS = TP_FONT_CSS;
export type PBLogo = TPLogo;
export const PB_INKS = TP_INKS;
export const pbInk = tpInk;

// ---------- loại túi & khổ ----------
export type PBKind = 'die' | 'tshirt';
export const PB_KINDS: { id: PBKind; name: string; sub: string }[] = [
  { id: 'die', name: 'Túi HD quai đục lỗ', sub: 'Quai bấm lỗ, có miếng gia cố — shop thời trang, mỹ phẩm' },
  { id: 'tshirt', name: 'Túi xốp quai xách', sub: 'Quai áo thun (quai vest), xếp hông — tạp hoá, nhà thuốc, ăn vặt' },
];
export interface PBSize { id: string; kind: PBKind; name: string; w: number; h: number; g: number } // mm; g = xếp hông (tổng)
export const PB_SIZES: PBSize[] = [
  { id: 'd25', kind: 'die', name: '25 × 35 cm', w: 250, h: 350, g: 0 },
  { id: 'd30', kind: 'die', name: '30 × 40 cm', w: 300, h: 400, g: 0 },
  { id: 'd35', kind: 'die', name: '35 × 45 cm', w: 350, h: 450, g: 0 },
  { id: 't24', kind: 'tshirt', name: '24 × 42 cm (xếp hông 7)', w: 240, h: 420, g: 70 },
  { id: 't30', kind: 'tshirt', name: '30 × 50 cm (xếp hông 8)', w: 300, h: 500, g: 80 },
  { id: 't38', kind: 'tshirt', name: '38 × 60 cm (xếp hông 10)', w: 380, h: 600, g: 100 },
];
export const pbSize = (id: string) => PB_SIZES.find((s) => s.id === id) || PB_SIZES[1];
export const sizesOf = (k: PBKind) => PB_SIZES.filter((s) => s.kind === k);

// ---------- màu màng ----------
export interface PBFilm { id: string; name: string; hex: string; opacity: number; dark: boolean }
export const PB_FILMS: PBFilm[] = [
  { id: 'milk', name: 'Trắng sữa', hex: '#F4F2EC', opacity: 0.9, dark: false },
  { id: 'clear', name: 'Trắng trong', hex: '#EEF3F2', opacity: 0.38, dark: false },
  { id: 'black', name: 'Đen', hex: '#1F1F22', opacity: 1, dark: true },
  { id: 'yellow', name: 'Vàng', hex: '#F3C531', opacity: 0.96, dark: false },
  { id: 'pink', name: 'Hồng', hex: '#F3A6C0', opacity: 0.95, dark: false },
  { id: 'green', name: 'Xanh lá', hex: '#2F9E5E', opacity: 0.96, dark: true },
];
export const pbFilm = (id: string) => PB_FILMS.find((f) => f.id === id) || PB_FILMS[0];

const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** mực gần màu màng → in ra khó đọc */
export const pbLowContrast = (inkId: string, filmId: string) => Math.abs(lum(tpInk(inkId).hex) - lum(pbFilm(filmId).hex)) < 0.22;

// ---------- font (đều có TTF → file in outline được) ----------
export interface PBFont { id: string; name: string; family: string; weight: number }
export const PB_FONTS: PBFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
export const pbFont = (id: string) => PB_FONTS.find((f) => f.id === id) || PB_FONTS[0];
const BODY = 'Be Vietnam Pro';

// ---------- bố cục & mẫu ----------
export interface PBLayout { id: string; name: string; inks: number }
export const PB_LAYOUTS: PBLayout[] = [
  { id: 'shop', name: 'Tên shop + logo', inks: 2 },
  { id: 'fashion', name: 'Thời trang', inks: 2 },
  { id: 'grocery', name: 'Tạp hoá · siêu thị mini', inks: 2 },
  { id: 'pharmacy', name: 'Nhà thuốc', inks: 2 },
  { id: 'snack', name: 'Bánh mì · ăn vặt', inks: 2 },
  { id: 'thanks', name: 'Cảm ơn quý khách', inks: 2 },
];
export const pbLayout = (id: string) => PB_LAYOUTS.find((l) => l.id === id) || PB_LAYOUTS[0];

export type PBBack = 'same' | 'thanks';
export interface PBSpec { kind: PBKind; size: string; film: string; inks: string[]; font: string; layout: string; faces: 1 | 2; back: PBBack; bio: boolean }
export interface PBTemplate { id: string; name: string; spec: Pick<PBSpec, 'kind' | 'film' | 'inks' | 'font' | 'layout'>; data?: PBData }
export const PB_TEMPLATES: PBTemplate[] = [
  { id: 'shop-milk', name: 'Shop · trắng sữa đỏ', spec: { kind: 'die', film: 'milk', inks: ['red', 'black'], font: 'montserrat', layout: 'shop' } },
  { id: 'fashion-black', name: 'Thời trang · đen trắng', spec: { kind: 'die', film: 'black', inks: ['white'], font: 'playfair', layout: 'fashion' }, data: { brand: 'AN KHANG BOUTIQUE', slogan: 'Thời trang thanh lịch mỗi ngày', tag: 'FASHION · STYLE' } },
  { id: 'fashion-pink', name: 'Thời trang · hồng', spec: { kind: 'die', film: 'pink', inks: ['brown', 'white'], font: 'dancing', layout: 'fashion' }, data: { brand: 'Thu Hà Shop', slogan: 'Xinh đẹp mỗi ngày', tag: 'ÁO · VÁY · PHỤ KIỆN' } },
  { id: 'shop-clear', name: 'Mỹ phẩm · trong hồng', spec: { kind: 'die', film: 'clear', inks: ['pink'], font: 'bvp', layout: 'shop' }, data: { brand: 'AN KHANG BEAUTY', slogan: 'Mỹ phẩm chính hãng', tag: 'MỸ PHẨM · CHĂM SÓC DA' } },
  { id: 'thanks-yellow', name: 'Cảm ơn · vàng đỏ', spec: { kind: 'die', film: 'yellow', inks: ['red'], font: 'baloo', layout: 'thanks' } },
  { id: 'grocery-milk', name: 'Tạp hoá · trắng xanh', spec: { kind: 'tshirt', film: 'milk', inks: ['blue', 'red'], font: 'bvp', layout: 'grocery' }, data: { brand: 'TẠP HOÁ QUỐC BẢO', slogan: 'Đủ món — giá tốt — giao tận nhà', tag: 'SIÊU THỊ MINI' } },
  { id: 'grocery-green', name: 'Siêu thị mini · xanh lá', spec: { kind: 'tshirt', film: 'green', inks: ['white', 'yellow'], font: 'montserrat', layout: 'grocery' }, data: { brand: 'MINI MART AN KHANG', slogan: 'Tươi ngon mỗi ngày', tag: 'SIÊU THỊ MINI' } },
  { id: 'pharmacy-milk', name: 'Nhà thuốc · trắng xanh ngọc', spec: { kind: 'tshirt', film: 'milk', inks: ['teal', 'red'], font: 'bvp', layout: 'pharmacy' }, data: { brand: 'NHÀ THUỐC AN KHANG', slogan: 'Tư vấn miễn phí — thuốc chính hãng', tag: 'NHÀ THUỐC' } },
  { id: 'snack-yellow', name: 'Ăn vặt · vàng đỏ', spec: { kind: 'tshirt', film: 'yellow', inks: ['red', 'black'], font: 'baloo', layout: 'snack' }, data: { brand: 'BÁNH MÌ GIA KHÁNH', slogan: 'Giòn rụm — nóng hổi — đậm vị', tag: 'GỌI LÀ CÓ' } },
  { id: 'snack-pink', name: 'Trà sữa · hồng', spec: { kind: 'tshirt', film: 'pink', inks: ['brown'], font: 'baloo', layout: 'snack' }, data: { brand: 'TRÀ SỮA THU HÀ', slogan: 'Ngọt ngào từng ngụm', tag: 'ĐẶT LÀ GIAO' } },
  { id: 'thanks-clear', name: 'Cảm ơn · trong đen', spec: { kind: 'tshirt', film: 'clear', inks: ['black'], font: 'oswald', layout: 'thanks' } },
  { id: 'shop-black', name: 'Shop · đen vàng', spec: { kind: 'die', film: 'black', inks: ['yellow', 'white'], font: 'oswald', layout: 'shop' }, data: { brand: 'AN KHANG SNEAKER', slogan: 'Giày chính hãng — đổi trả 7 ngày', tag: 'GIÀY · DÉP · PHỤ KIỆN' } },
];

export type PBData = Record<string, string>;
export interface PBField { key: string; label: string; ph?: string; half?: boolean }
export const PB_FIELDS: PBField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'AN KHANG STORE', half: true },
  { key: 'tag', label: 'Dòng nhỏ (ngành hàng)', ph: 'THỜI TRANG · PHỤ KIỆN', half: true },
  { key: 'slogan', label: 'Slogan', ph: 'Cảm ơn quý khách', half: true },
  { key: 'phone', label: 'Hotline / Zalo', ph: '0909 123 456', half: true },
  { key: 'social', label: 'Fanpage / website', ph: 'fb.com/ankhangstore', half: true },
  { key: 'address', label: 'Địa chỉ (tuỳ chọn)', ph: '12 Lê Lợi, Q.1, TP.HCM', half: true },
];
export const defaultPBData = (): PBData => ({
  brand: 'AN KHANG STORE', tag: 'THỜI TRANG · PHỤ KIỆN', slogan: 'Cảm ơn quý khách!', phone: '0909 123 456',
  social: 'fb.com/ankhangstore', address: '12 Lê Lợi, Q.1, TP.HCM',
});

// ---------- hình học túi (mm, gốc trái-trên, y xuống) ----------
export interface PBGeom {
  W: number; H: number;
  outline: string;            // đường bao túi (đường cắt/hàn ngoài)
  hole: string | null;        // lỗ quai (túi đục lỗ)
  patch: { x: number; y: number; w: number; h: number } | null; // miếng gia cố quai
  seals: number[];            // các đường hàn ngang (y)
  folds: number[];            // nếp xếp hông (x)
  area: { x: number; y: number; w: number; h: number }; // vùng in an toàn
  cut: { x: number; w: number; depth: number; r: number } | null; // khoét quai áo thun
}
export function pbGeom(sz: PBSize): PBGeom {
  const W = sz.w, H = sz.h;
  if (sz.kind === 'die') {
    const hw = Math.round(W * 0.3), hh = 26, hy = 30; // lỗ quai: rộng 30% túi, cao 26mm, mép trên cách miệng 30mm
    const hx = (W - hw) / 2, r = hh / 2;
    const hole = `M${hx + r} ${hy} H${hx + hw - r} A${r} ${r} 0 0 1 ${hx + hw - r} ${hy + hh} H${hx + r} A${r} ${r} 0 0 1 ${hx + r} ${hy} Z`;
    const patch = { x: W * 0.22, y: 0, w: W * 0.56, h: hy + hh + 22 };
    const top = patch.h + 16, bot = H - 22;
    return { W, H, outline: `M0 0 H${W} V${H} H0 Z`, hole, patch, seals: [H - 8], folds: [], area: { x: 16, y: top, w: W - 32, h: bot - top }, cut: null };
  }
  // túi áo thun: khoét chữ U giữa miệng, 2 quai 2 bên, xếp hông g/2 mỗi bên
  const cw = W * 0.48, cx = (W - cw) / 2, r = cw / 2, depth = Math.round(H * 0.28);
  const outline = `M0 0 H${cx} V${depth - r} A${r} ${r} 0 0 0 ${cx + cw} ${depth - r} V0 H${W} V${H} H0 Z`;
  const g2 = sz.g / 2;
  const top = depth + 20, bot = H - 24;
  return {
    W, H, outline, hole: null, patch: null, seals: [10, H - 8], folds: [g2, W - g2],
    area: { x: g2 + 10, y: top, w: W - sz.g - 20, h: bot - top }, cut: { x: cx, w: cw, depth, r },
  };
}

// ---------- tiện ích chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, f: number, ts: TS, maxW: number) => { const w = measure(t, f, ts); return w > maxW ? (f * maxW) / w : f; };
/** chia câu 2 dòng cân nhau */
function split2(t: string): [string, string] {
  const w = (t || '').trim().split(/\s+/);
  if (w.length < 2) return [t || '', ''];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}

// chiều cao dòng theo hộp chữ thật của font (ascent/descent của font — khớp getBBox) → không font nào bị chồng dòng
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

// phần tử dọc: cao h, vẽ tại (cx, top)
interface Item { h: number; gap?: number; draw: (cx: number, top: number, k: number) => ReactNode }
function textItem(t: string, f: number, ts: TS, fill: string, maxW: number, key: string): Item | null {
  if (!t.trim()) return null;
  const s = fitSize(t, f, ts, maxW);
  const m = vm(ts);
  return {
    h: s * (m.a + m.d) * 1.02,
    draw: (cx, top, k) => <text key={key} x={cx} y={top + s * k * m.a} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={s * k} letterSpacing={ts.ls ? ts.ls * s * k : undefined} fill={fill} data-pbt="1">{t}</text>,
  };
}
/** tên shop: 1 dòng nếu đủ to, không thì 2 dòng */
function brandItems(t: string, f: number, ts: TS, fill: string, maxW: number, minRatio = 0.62): Item[] {
  const one = fitSize(t, f, ts, maxW);
  if (one >= f * minRatio || !/\s/.test(t.trim())) return [textItem(t, f, ts, fill, maxW, 'b0')!].filter(Boolean);
  const [a, b] = split2(t);
  const s = Math.min(fitSize(a, f, ts, maxW), fitSize(b, f, ts, maxW));
  return [textItem(a, s, ts, fill, maxW, 'b1'), textItem(b, s, ts, fill, maxW, 'b2')].filter(Boolean) as Item[];
}
const spacer = (h: number): Item => ({ h, draw: () => null });
const shape = (h: number, fn: (cx: number, top: number, k: number) => ReactNode): Item => ({ h, draw: fn });

/** xếp các phần tử dọc, căn giữa vùng; quá cao thì co đều (k) */
function column(items: (Item | null)[], area: PBGeom['area'], align: 'center' | 'top' = 'center'): ReactNode {
  const its = items.filter(Boolean) as Item[];
  const total = its.reduce((a, it) => a + it.h + (it.gap ?? 0), 0);
  const k = total > area.h ? area.h / total : 1;
  let y = area.y + (align === 'center' ? (area.h - total * k) / 2 : 0);
  const cx = area.x + area.w / 2;
  return its.map((it, i) => { const n = <g key={i}>{it.draw(cx, y, k)}</g>; y += (it.h + (it.gap ?? 0)) * k; return n; });
}

// ---------- icon vẽ code (ô s×s, góc trái-trên x,y) ----------
type Icon = (x: number, y: number, s: number, fill: string) => ReactNode;
const icPhone: Icon = (x, y, s, fill) => (
  <path d={`M${x + s * 0.22} ${y + s * 0.08} L${x + s * 0.38} ${y + s * 0.08} L${x + s * 0.46} ${y + s * 0.3} L${x + s * 0.36} ${y + s * 0.4} C${x + s * 0.42} ${y + s * 0.54} ${x + s * 0.5} ${y + s * 0.62} ${x + s * 0.62} ${y + s * 0.66} L${x + s * 0.72} ${y + s * 0.56} L${x + s * 0.92} ${y + s * 0.64} L${x + s * 0.92} ${y + s * 0.8} C${x + s * 0.92} ${y + s * 0.9} ${x + s * 0.84} ${y + s * 0.94} ${x + s * 0.76} ${y + s * 0.92} C${x + s * 0.4} ${y + s * 0.84} ${x + s * 0.14} ${y + s * 0.58} ${x + s * 0.08} ${y + s * 0.22} C${x + s * 0.06} ${y + s * 0.14} ${x + s * 0.12} ${y + s * 0.08} ${x + s * 0.22} ${y + s * 0.08} Z`} fill={fill} />
);
const icGlobe: Icon = (x, y, s, fill) => (
  <g fill="none" stroke={fill} strokeWidth={s * 0.09}>
    <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.4} />
    <ellipse cx={x + s / 2} cy={y + s / 2} rx={s * 0.17} ry={s * 0.4} />
    <path d={`M${x + s * 0.1} ${y + s / 2} H${x + s * 0.9}`} />
  </g>
);
const icPin: Icon = (x, y, s, fill) => (
  <path fillRule="evenodd" d={`M${x + s / 2} ${y + s * 0.94} C${x + s * 0.2} ${y + s * 0.6} ${x + s * 0.16} ${y + s * 0.46} ${x + s * 0.16} ${y + s * 0.38} A${s * 0.34} ${s * 0.34} 0 0 1 ${x + s * 0.84} ${y + s * 0.38} C${x + s * 0.84} ${y + s * 0.46} ${x + s * 0.8} ${y + s * 0.6} ${x + s / 2} ${y + s * 0.94} Z M${x + s / 2} ${y + s * 0.25} A${s * 0.12} ${s * 0.12} 0 1 0 ${x + s / 2 + 0.01} ${y + s * 0.25} Z`} fill={fill} />
);
const icBag: Icon = (x, y, s, fill) => (
  <g>
    <path d={`M${x + s * 0.14} ${y + s * 0.32} H${x + s * 0.86} L${x + s * 0.8} ${y + s * 0.94} H${x + s * 0.2} Z`} fill={fill} />
    <path d={`M${x + s * 0.34} ${y + s * 0.4} V${y + s * 0.24} A${s * 0.16} ${s * 0.16} 0 0 1 ${x + s * 0.66} ${y + s * 0.24} V${y + s * 0.4}`} fill="none" stroke={fill} strokeWidth={s * 0.08} strokeLinecap="round" />
  </g>
);
const icBasket: Icon = (x, y, s, fill) => (
  <g>
    <path d={`M${x + s * 0.06} ${y + s * 0.42} H${x + s * 0.94} L${x + s * 0.82} ${y + s * 0.9} H${x + s * 0.18} Z`} fill={fill} />
    <path d={`M${x + s * 0.24} ${y + s * 0.42} L${x + s * 0.4} ${y + s * 0.1} M${x + s * 0.76} ${y + s * 0.42} L${x + s * 0.6} ${y + s * 0.1}`} stroke={fill} strokeWidth={s * 0.08} strokeLinecap="round" />
  </g>
);
const icCross: Icon = (x, y, s, fill) => (
  <path d={`M${x + s * 0.36} ${y + s * 0.04} H${x + s * 0.64} V${y + s * 0.36} H${x + s * 0.96} V${y + s * 0.64} H${x + s * 0.64} V${y + s * 0.96} H${x + s * 0.36} V${y + s * 0.64} H${x + s * 0.04} V${y + s * 0.36} H${x + s * 0.36} Z`} fill={fill} />
);
const icHeart: Icon = (x, y, s, fill) => (
  <path d={`M${x + s / 2} ${y + s * 0.88} C${x + s * 0.1} ${y + s * 0.6} ${x - s * 0.02} ${y + s * 0.32} ${x + s * 0.2} ${y + s * 0.16} C${x + s * 0.34} ${y + s * 0.05} ${x + s * 0.46} ${y + s * 0.14} ${x + s / 2} ${y + s * 0.26} C${x + s * 0.54} ${y + s * 0.14} ${x + s * 0.66} ${y + s * 0.05} ${x + s * 0.8} ${y + s * 0.16} C${x + s * 1.02} ${y + s * 0.32} ${x + s * 0.9} ${y + s * 0.6} ${x + s / 2} ${y + s * 0.88} Z`} fill={fill} />
);
const icHanger: Icon = (x, y, s, fill) => (
  <path d={`M${x + s * 0.5} ${y + s * 0.38} V${y + s * 0.3} A${s * 0.12} ${s * 0.12} 0 1 0 ${x + s * 0.38} ${y + s * 0.18} M${x + s * 0.5} ${y + s * 0.38} L${x + s * 0.06} ${y + s * 0.72} H${x + s * 0.94} Z`} fill="none" stroke={fill} strokeWidth={s * 0.07} strokeLinejoin="round" strokeLinecap="round" />
);
const icBread: Icon = (x, y, s, fill) => (
  <g>
    <path d={`M${x + s * 0.06} ${y + s * 0.62} C${x + s * 0.06} ${y + s * 0.3} ${x + s * 0.4} ${y + s * 0.16} ${x + s * 0.7} ${y + s * 0.2} C${x + s * 0.94} ${y + s * 0.24} ${x + s * 1.0} ${y + s * 0.44} ${x + s * 0.9} ${y + s * 0.58} C${x + s * 0.74} ${y + s * 0.8} ${x + s * 0.2} ${y + s * 0.86} ${x + s * 0.06} ${y + s * 0.62} Z`} fill={fill} />
  </g>
);
const icLeaf: Icon = (x, y, s, fill) => (
  <g>
    <path d={`M${x + s * 0.12} ${y + s * 0.88} C${x + s * 0.08} ${y + s * 0.4} ${x + s * 0.4} ${y + s * 0.1} ${x + s * 0.92} ${y + s * 0.08} C${x + s * 0.9} ${y + s * 0.6} ${x + s * 0.6} ${y + s * 0.9} ${x + s * 0.12} ${y + s * 0.88} Z`} fill={fill} />
  </g>
);
const icStar: Icon = (x, y, s, fill) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? s * 0.21 : s * 0.48; return `${(x + s / 2 + Math.cos(a) * r).toFixed(2)},${(y + s * 0.54 + Math.sin(a) * r).toFixed(2)}`; });
  return <polygon points={pts.join(' ')} fill={fill} />;
};

/** logo khách (mask 1 màu) hoặc icon dự phòng, cao h, căn giữa cx */
function logoItem(logo: PBLogo | null, h: number, fill: string, fb: Icon, uid: string, maxW: number): Item {
  return shape(h, (cx, top, k) => {
    const hh = h * k;
    if (!logo) return fb(cx - hh / 2, top, hh, fill);
    let lh = hh, lw = (logo.w / logo.h) * lh;
    if (lw > maxW) { lw = maxW; lh = (logo.h / logo.w) * lw; }
    const x = cx - lw / 2, y = top + (hh - lh) / 2, id = `${uid}-lg`;
    return (
      <g>
        <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={lw} height={lh}><image href={logo.href} x={x} y={y} width={lw} height={lh} preserveAspectRatio="none" /></mask>
        <rect x={x} y={y} width={lw} height={lh} fill={fill} mask={`url(#${id})`} />
      </g>
    );
  });
}
/** dòng liên hệ: icon + chữ (1–2 cụm trên 1 dòng, không đủ chỗ thì xuống dòng) */
function contactItems(parts: { icon: Icon; t: string }[], f: number, ts: TS, fill: string, maxW: number): Item[] {
  const ps = parts.filter((p) => p.t.trim());
  if (!ps.length) return [];
  const wOf = (p: { t: string }, s: number) => s * 1.25 + measure(p.t, s, ts);
  const gap = f * 1.3;
  const rowsOf = (s: number): typeof ps[] => {
    const one = ps.reduce((a, p) => a + wOf(p, s), 0) + gap * (ps.length - 1);
    return one <= maxW ? [ps] : ps.map((p) => [p]);
  };
  const rows = rowsOf(f);
  return rows.map((r, ri) => {
    const s = Math.min(f, ...r.map((p) => (wOf(p, f) > maxW ? (f * maxW) / wOf(p, f) : f)));
    const tw = r.reduce((a, p) => a + wOf(p, s), 0) + gap * (r.length - 1);
    const m = vm(ts);
    return {
      h: Math.max(s * 1.15, s * (m.a + m.d) * 1.04),
      draw: (cx, top, k) => {
        let x = cx - (tw * k) / 2;
        return r.map((p, i) => {
          const ss = s * k;
          const n = (
            <g key={i}>
              {p.icon(x, top + ss * 0.12, ss * 0.95, fill)}
              <text x={x + ss * 1.25} y={top + ss * Math.max(0.93, m.a)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={ss} fill={fill} data-pbt="1">{p.t}</text>
            </g>
          );
          x += wOf(p, s) * k + gap * k;
          return n;
        });
      },
      gap: ri < rows.length - 1 ? s * 0.1 : 0,
    } as Item;
  });
}

// ---------- vẽ 1 mặt ----------
interface Ctx { g: PBGeom; ink: (i: number) => string; disp: TS; body: TS; bodyB: TS; data: PBData; logo: PBLogo | null; uid: string; bio: boolean; filmDark: boolean }

function bioNote(c: Ctx, f: number, maxW: number): Item[] {
  if (!c.bio) return [];
  const t = 'Túi tự huỷ sinh học — thân thiện môi trường';
  const s = fitSize(t, f, c.body, maxW - f * 1.3);
  const w = s * 1.3 + measure(t, s, c.body);
  const m = vm(c.body);
  return [shape(s * (m.a + m.d) * 1.05, (cx, top, k) => (
    <g>
      {icLeaf(cx - (w * k) / 2, top + s * (m.a - 0.9) * k, s * k, c.ink(0))}
      <text x={cx - (w * k) / 2 + s * 1.3 * k} y={top + s * m.a * k} fontFamily={`"${c.body.fam}"`} fontWeight={c.body.wt} fontSize={s * k} fill={c.ink(0)} data-pbt="1">{t}</text>
    </g>
  ))];
}

function face(layout: string, c: Ctx, side: 'front' | 'thanks'): ReactNode {
  const { g, ink, disp, body, bodyB, data } = c;
  const A = g.area, W = A.w;
  const big = Math.min(W * 0.15, A.h * 0.12);
  const contact = (f: number, fill = ink(1)) => contactItems([{ icon: icPhone, t: data.phone || '' }, { icon: icGlobe, t: data.social || '' }], f, body, fill, W);
  const addr = (f: number, fill = ink(1)) => contactItems([{ icon: icPin, t: data.address || '' }], f, body, fill, W);

  if (side === 'thanks' || layout === 'thanks') {
    // CẢM ƠN QUÝ KHÁCH to + tên shop nhỏ + liên hệ
    const words = ['CẢM ƠN', 'QUÝ KHÁCH'];
    return column([
      logoItem(c.logo, big * 0.9, ink(1), icHeart, c.uid, W * 0.5), spacer(big * 0.3),
      textItem(words[0], big * 1.25, disp, ink(0), W, 't1'), textItem(words[1], big * 1.25, disp, ink(0), W, 't2'), spacer(big * 0.35),
      shape(big * 0.25, (cx, top, k) => <rect x={cx - W * 0.18} y={top + big * 0.08 * k} width={W * 0.36} height={Math.max(0.8, big * 0.07 * k)} fill={ink(1)} />),
      spacer(big * 0.25),
      ...brandItems(data.brand || '', big * 0.62, disp, ink(1), W),
      textItem(data.slogan || '', big * 0.32, body, ink(1), W, 'sl'), spacer(big * 0.3),
      ...contact(big * 0.27), ...bioNote(c, big * 0.2, W),
    ], A);
  }

  if (layout === 'shop') {
    return column([
      logoItem(c.logo, big * 1.7, ink(0), icBag, c.uid, W * 0.7), spacer(big * 0.4),
      ...brandItems(data.brand || '', big, disp, ink(0), W),
      textItem((data.tag || '').toUpperCase(), big * 0.3, { ...bodyB, ls: 0.18 }, ink(1), W, 'tg'),
      spacer(big * 0.55),
      shape(big * 0.12, (cx, top, k) => <rect x={cx - W * 0.12} y={top} width={W * 0.24} height={Math.max(0.8, big * 0.05 * k)} fill={ink(1)} />),
      spacer(big * 0.4),
      textItem(data.slogan || '', big * 0.4, body, ink(0), W, 'sl'), spacer(big * 0.5),
      ...contact(big * 0.3), ...addr(big * 0.27), ...bioNote(c, big * 0.2, W),
    ], A);
  }

  if (layout === 'fashion') {
    // khung viền mảnh + tên thương hiệu serif/script + dòng chữ giãn
    const fr = { x: A.x + W * 0.02, y: A.y, w: W * 0.96, h: A.h };
    const inner = { x: fr.x + W * 0.08, y: fr.y + A.h * 0.06, w: fr.w - W * 0.16, h: fr.h - A.h * 0.12 };
    return (
      <>
        <rect x={fr.x} y={fr.y} width={fr.w} height={fr.h} fill="none" stroke={ink(0)} strokeWidth={0.9} />
        <rect x={fr.x + 3} y={fr.y + 3} width={fr.w - 6} height={fr.h - 6} fill="none" stroke={ink(0)} strokeWidth={0.35} />
        {column([
          logoItem(c.logo, big * 1.1, ink(0), icHanger, c.uid, inner.w * 0.6), spacer(big * 0.5),
          ...brandItems(data.brand || '', big * 1.05, disp, ink(0), inner.w),
          spacer(big * 0.3),
          textItem((data.tag || '').toUpperCase(), big * 0.26, { ...body, ls: 0.32 }, ink(1), inner.w, 'tg'),
          spacer(big * 0.9),
          textItem(data.slogan || '', big * 0.36, { fam: disp.fam === 'Dancing Script' ? 'Dancing Script' : BODY, wt: disp.fam === 'Dancing Script' ? 700 : 600 }, ink(0), inner.w, 'sl'),
          spacer(big * 0.6),
          ...contactItems([{ icon: icPhone, t: data.phone || '' }], big * 0.26, body, ink(0), inner.w),
          ...contactItems([{ icon: icGlobe, t: data.social || '' }], big * 0.26, body, ink(0), inner.w),
          ...bioNote(c, big * 0.19, inner.w),
        ], inner)}
      </>
    );
  }

  if (layout === 'grocery') {
    // dải mực đặc phía trên, tên shop khoét chữ (màng lộ ra) — vẫn 1 màu mực
    const bandH = Math.min(A.h * 0.3, big * 2.6);
    const id = `${c.uid}-band`;
    const nm = brandItems(data.brand || '', big * 0.95, disp, '#000', W * 0.9);
    const tg = textItem((data.tag || '').toUpperCase(), big * 0.3, { ...bodyB, ls: 0.2 }, '#000', W * 0.9, 'tg');
    const inBand = [tg, ...nm].filter(Boolean) as Item[];
    const tot = inBand.reduce((a, it) => a + it.h, 0);
    const kb = tot > bandH * 0.84 ? (bandH * 0.84) / tot : 1;
    let yy = A.y + (bandH - tot * kb) / 2;
    const cx = A.x + W / 2;
    const textNodes = inBand.map((it, i) => { const n = <g key={i}>{it.draw(cx, yy, kb)}</g>; yy += it.h * kb; return n; });
    const rest = { x: A.x, y: A.y + bandH + big * 0.45, w: W, h: A.h - bandH - big * 0.45 };
    return (
      <>
        <mask id={id} maskUnits="userSpaceOnUse" x={A.x - 1} y={A.y - 1} width={W + 2} height={bandH + 2}>
          <rect x={A.x - 1} y={A.y - 1} width={W + 2} height={bandH + 2} fill="#fff" />
          <g fill="#000">{textNodes}</g>
        </mask>
        <rect x={A.x} y={A.y} width={W} height={bandH} rx={4} fill={ink(0)} mask={`url(#${id})`} />
        {column([
          logoItem(c.logo, big * 1.2, ink(1), icBasket, c.uid, W * 0.5), spacer(big * 0.3),
          textItem(data.slogan || '', big * 0.42, bodyB, ink(0), W, 'sl'), spacer(big * 0.4),
          shape(big * 0.5, (x0, top, k) => (
            <g>{[-1.5, -0.5, 0.5, 1.5].map((i) => <circle key={i} cx={x0 + i * big * 0.5} cy={top + big * 0.2 * k} r={big * 0.07 * k} fill={ink(1)} />)}</g>
          )),
          ...contactItems([{ icon: icPhone, t: data.phone || '' }], big * 0.5, bodyB, ink(0), W),
          ...contactItems([{ icon: icGlobe, t: data.social || '' }], big * 0.28, body, ink(1), W),
          ...addr(big * 0.27), ...bioNote(c, big * 0.2, W),
        ], rest)}
      </>
    );
  }

  if (layout === 'pharmacy') {
    return column([
      shape(big * 1.7, (cx, top, k) => {
        const s = big * 1.7 * k;
        return (
          <g>
            <circle cx={cx} cy={top + s / 2} r={s / 2} fill="none" stroke={ink(0)} strokeWidth={s * 0.06} />
            {c.logo ? logoItem(c.logo, big * 1.0, ink(1), icCross, c.uid, s * 0.7).draw(cx, top + s * 0.21, k) : icCross(cx - s * 0.29, top + s * 0.21, s * 0.58, ink(1))}
          </g>
        );
      }),
      spacer(big * 0.45),
      textItem((data.tag || 'NHÀ THUỐC').toUpperCase(), big * 0.34, { ...bodyB, ls: 0.22 }, ink(1), W, 'tg'),
      ...brandItems(data.brand || '', big * 0.95, disp, ink(0), W),
      spacer(big * 0.35),
      textItem(data.slogan || '', big * 0.36, body, ink(0), W, 'sl'), spacer(big * 0.5),
      ...contactItems([{ icon: icPhone, t: data.phone || '' }], big * 0.42, bodyB, ink(0), W),
      ...addr(big * 0.27, ink(0)), ...bioNote(c, big * 0.2, W),
    ], A);
  }

  // snack: sao nổ + tên to vui
  return column([
    shape(big * 1.9, (cx, top, k) => {
      const s = big * 1.9 * k, n = 14;
      const pts = Array.from({ length: n * 2 }, (_, i) => { const a = (i * Math.PI) / n; const r = i % 2 ? s * 0.4 : s * 0.5; return `${(cx + Math.cos(a) * r).toFixed(2)},${(top + s / 2 + Math.sin(a) * r).toFixed(2)}`; });
      // ổ bánh mì khoét trong sao (màng lộ ra) → vẫn chỉ 1 màu mực
      const id = `${c.uid}-star`;
      return (
        <g>
          <mask id={id} maskUnits="userSpaceOnUse" x={cx - s / 2 - 1} y={top - 1} width={s + 2} height={s + 2}>
            <polygon points={pts.join(' ')} fill="#fff" />
            {icBread(cx - s * 0.27, top + s * 0.24, s * 0.54, '#000')}
          </mask>
          <rect x={cx - s / 2 - 1} y={top - 1} width={s + 2} height={s + 2} fill={ink(0)} mask={`url(#${id})`} />
        </g>
      );
    }),
    ...(c.logo ? [spacer(big * 0.3), logoItem(c.logo, big * 0.9, ink(1), icBread, c.uid, W * 0.5)] : []),
    spacer(big * 0.3),
    ...brandItems(data.brand || '', big * 1.05, disp, ink(0), W),
    textItem((data.tag || '').toUpperCase(), big * 0.42, { ...disp, ls: 0.05 }, ink(1), W, 'tg'),
    spacer(big * 0.35),
    textItem(data.slogan || '', big * 0.36, body, ink(0), W, 'sl'), spacer(big * 0.5),
    ...contactItems([{ icon: icPhone, t: data.phone || '' }], big * 0.48, bodyB, ink(1), W),
    ...contactItems([{ icon: icGlobe, t: data.social || '' }], big * 0.27, body, ink(0), W),
    ...bioNote(c, big * 0.2, W),
  ], A);
}

// ---------- SVG ----------
/**
 * face: 1 mặt túi trên nền màng (xem trước, thumbnail).
 * ink: chỉ lớp mực, nền trong suốt (texture 3D).
 * print: file in 1 mặt đúng khổ thật — màng tham khảo (không in) + lớp In + CutContour (bao/lỗ quai) + Seal/Fold + ghi chú.
 */
export type PBMode = 'face' | 'ink' | 'print';
export const PB_MARGIN = 14; // mm lề quanh file in

export function PlasticBagSvg({ spec, data, logo = null, side = 'front', mode = 'face', style }: {
  spec: PBSpec; data: PBData; logo?: PBLogo | null; side?: 'front' | 'back'; mode?: PBMode; style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '') + side[0] + mode[0];
  const sz = pbSize(spec.size);
  const g = pbGeom(sz);
  const film = pbFilm(spec.film);
  const fnt = pbFont(spec.font);
  const lay = pbLayout(spec.layout);
  const inks = spec.inks.length ? spec.inks : ['black'];
  const ink = (i: number) => tpInk(inks[Math.min(i, inks.length - 1, lay.inks - 1)]).hex;
  const c: Ctx = {
    g, ink, uid, logo, bio: spec.bio, filmDark: film.dark,
    disp: { fam: fnt.family, wt: fnt.weight }, body: { fam: BODY, wt: 600 }, bodyB: { fam: BODY, wt: 800 },
    data,
  };
  const which = side === 'back' && spec.back === 'thanks' ? 'thanks' : 'front';
  const clip = `${uid}-area`;
  const art = (
    <g id="In">
      <clipPath id={clip}><rect x={g.area.x - 0.5} y={g.area.y - 0.5} width={g.area.w + 1} height={g.area.h + 1} /></clipPath>
      <g clipPath={`url(#${clip})`}>{face(spec.layout, c, which)}</g>
    </g>
  );
  const area = `${g.area.x} ${g.area.y} ${g.area.w} ${g.area.h}`;
  const holeCut = `${uid}-cut`;
  const outlineWithHole = g.hole ? `${g.outline} ${g.hole}` : g.outline;

  if (mode === 'ink') {
    return (
      <svg viewBox={`0 0 ${g.W} ${g.H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-area={area}>{art}</svg>
    );
  }
  if (mode === 'print') {
    const M = PB_MARGIN;
    const nInk = Math.min(inks.length, lay.inks);
    const note = `${PB_KINDS.find((k) => k.id === sz.kind)!.name} ${sz.name} · mặt ${side === 'front' ? 'trước' : 'sau'} · màng ${film.name.toLowerCase()} (không in) · ${nInk} màu mực: ${inks.slice(0, nInk).map((i) => tpInk(i).name).join(', ')}`;
    return (
      <svg viewBox={`${-M} ${-M} ${g.W + M * 2} ${g.H + M * 2}`} width={`${g.W + M * 2}mm`} height={`${g.H + M * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-area={area}>
        <g id="MangThamKhao" opacity={film.opacity < 0.6 ? 0.35 : 0.55}><path d={outlineWithHole} fill={film.hex} fillRule="evenodd" /></g>
        {g.patch && <g id="GiaCo" opacity={0.5}><rect x={g.patch.x} y={g.patch.y} width={g.patch.w} height={g.patch.h} fill="none" stroke="#7A7A7A" strokeWidth={0.4} strokeDasharray="3 2" /></g>}
        {art}
        <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.35}>
          <path d={g.outline} />
          {g.hole && <path d={g.hole} />}
        </g>
        <g id="Seal" stroke="#0091D5" strokeWidth={0.35} strokeDasharray="4 2" fill="none">
          {g.seals.map((y) => (g.cut && y < 20
            ? <g key={y}><line x1={0} y1={y} x2={g.cut.x} y2={y} /><line x1={g.cut.x + g.cut.w} y1={y} x2={g.W} y2={y} /></g>
            : <line key={y} x1={0} y1={y} x2={g.W} y2={y} />))}
        </g>
        {g.folds.length > 0 && (
          <g id="Fold" stroke="#00A651" strokeWidth={0.35} strokeDasharray="1.5 1.5" fill="none">
            {g.folds.map((x) => <line key={x} x1={x} y1={g.cut ? g.cut.depth * 0.4 : 0} x2={x} y2={g.H} />)}
          </g>
        )}
        <rect x={g.area.x} y={g.area.y} width={g.area.w} height={g.area.h} fill="none" stroke="#9AA3AD" strokeWidth={0.25} strokeDasharray="2 2" data-safe="1" />
        <text x={0} y={-M * 0.42} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={4.2} fill="#111">{note}</text>
        <text x={0} y={g.H + M * 0.62} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.4} fill="#111">Hồng = đường cắt / lỗ quai · Xanh dương đứt = đường hàn · Xanh lá chấm = nếp xếp hông · Xám = vùng in an toàn</text>
      </svg>
    );
  }
  // face: màng + mực, cắt theo hình túi (lỗ quai/khoét quai trong suốt)
  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-area={area}>
      <clipPath id={holeCut}><path d={outlineWithHole} fillRule="evenodd" clipRule="evenodd" /></clipPath>
      <g clipPath={`url(#${holeCut})`}>
        <rect data-film="1" x={0} y={0} width={g.W} height={g.H} fill={film.hex} />
        {g.patch && <rect x={g.patch.x} y={g.patch.y} width={g.patch.w} height={g.patch.h} fill={film.dark ? '#ffffff' : '#000000'} opacity={0.03} />}
        {g.folds.map((x) => <rect key={x} x={x - 0.6} y={g.cut ? g.cut.depth * 0.5 : 0} width={1.2} height={g.H} fill="#000" opacity={0.06} />)}
        {art}
      </g>
      {g.hole && <path d={g.hole} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={1.2} />}
    </svg>
  );
}

/** số màu mực thật sự dùng trong lớp In (bỏ mask/clip/defs) — QC */
export function pbInkColors(svg: SVGSVGElement): string[] {
  const set = new Set<string>();
  svg.querySelectorAll('#In *').forEach((el) => {
    if (el.closest('mask,clipPath,defs')) return;
    for (const a of ['fill', 'stroke']) {
      const v = el.getAttribute(a);
      if (v && v !== 'none' && !v.startsWith('url(')) set.add(v.toUpperCase());
    }
  });
  return [...set];
}
