'use client';
// Túi giấy đựng đồ ăn: túi kraft đáy vuông (SOS), túi bánh mì chống dầu, túi có cửa sổ, túi đáy vuông quai dẹt.
// In flexo 1–2 màu mực đặc trên giấy (giấy KHÔNG phải mực) → mỗi bố cục chỉ dùng đúng số màu khách chọn.
// Engine SVG đơn vị mm (gốc trái-trên), render code 100% (0 AI). Chữ đo thật bằng canvas, co cho vừa vùng in.
// Khuôn trải phẳng: hông | mặt trước | hông | mặt sau | hông | mép dán + vạt đáy, mép răng cưa / khoét ngón cái / cửa sổ.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { TP_INKS, measure, tpInk, logoToMask, useTPFonts, TP_FONT_CSS, type TPLogo } from './tape-engine';

export { logoToMask, useTPFonts as useFBGFonts };
export const FBG_FONT_CSS = TP_FONT_CSS;
export type FBGLogo = TPLogo;
export const FBG_INKS = TP_INKS;
export const fbgInk = tpInk;

// ---------- loại túi & khổ ----------
export type FBGKind = 'sos' | 'banhmi' | 'window' | 'handle';
export const FBG_KINDS: { id: FBGKind; name: string; sub: string }[] = [
  { id: 'sos', name: 'Túi kraft đáy vuông', sub: 'Túi SOS không quai, miệng răng cưa — đồ ăn mang đi' },
  { id: 'banhmi', name: 'Túi bánh mì chống dầu', sub: 'Túi dẹt xếp hông, miệng mở có khoét ngón cái' },
  { id: 'window', name: 'Túi có cửa sổ', sub: 'Cửa sổ màng PLA trong — bánh quy, hạt, trái cây sấy' },
  { id: 'handle', name: 'Túi đáy vuông quai dẹt', sub: 'Quai giấy dẹt dán trong, miệng gấp viền' },
];
export interface FBGSize { id: string; kind: FBGKind; name: string; w: number; g: number; h: number } // mm: ngang × hông × cao
export const FBG_SIZES: FBGSize[] = [
  { id: 's15', kind: 'sos', name: '15 × 9 × 28 cm', w: 150, g: 90, h: 280 },
  { id: 's18', kind: 'sos', name: '18 × 11 × 32 cm', w: 180, g: 110, h: 320 },
  { id: 's21', kind: 'sos', name: '21 × 12 × 38 cm', w: 210, g: 120, h: 380 },
  { id: 'b10', kind: 'banhmi', name: '10 × 3 × 22 cm', w: 100, g: 30, h: 220 },
  { id: 'b12', kind: 'banhmi', name: '12 × 4 × 25 cm', w: 120, g: 40, h: 250 },
  { id: 'b14', kind: 'banhmi', name: '14 × 4.5 × 28 cm', w: 140, g: 45, h: 280 },
  { id: 'w12', kind: 'window', name: '12 × 7 × 22 cm', w: 120, g: 70, h: 220 },
  { id: 'w15', kind: 'window', name: '15 × 8 × 26 cm', w: 150, g: 80, h: 260 },
  { id: 'w18', kind: 'window', name: '18 × 9 × 29 cm', w: 180, g: 90, h: 290 },
  { id: 'h18', kind: 'handle', name: '18 × 8 × 22 cm', w: 180, g: 80, h: 220 },
  { id: 'h22', kind: 'handle', name: '22 × 11 × 28 cm', w: 220, g: 110, h: 280 },
  { id: 'h26', kind: 'handle', name: '26 × 12 × 32 cm', w: 260, g: 120, h: 320 },
];
export const fbgSize = (id: string) => FBG_SIZES.find((s) => s.id === id) || FBG_SIZES[1];
export const fbgSizesOf = (k: FBGKind) => FBG_SIZES.filter((s) => s.kind === k);

// ---------- giấy ----------
export interface FBGPaper { id: string; name: string; hex: string; inner: string; dark: boolean; kraft: boolean; grease?: boolean }
export const FBG_PAPERS: FBGPaper[] = [
  { id: 'kraft', name: 'Kraft nâu', hex: '#C49B6C', inner: '#B88D5E', dark: false, kraft: true },
  { id: 'white', name: 'Kraft trắng', hex: '#F2EDE3', inner: '#E9E2D5', dark: false, kraft: true },
  { id: 'grease', name: 'Giấy chống dầu trắng', hex: '#F6F3EC', inner: '#EFEAE0', dark: false, kraft: false, grease: true },
  { id: 'black', name: 'Kraft đen', hex: '#2B2724', inner: '#221F1D', dark: true, kraft: true },
];
export const fbgPaper = (id: string) => FBG_PAPERS.find((p) => p.id === id) || FBG_PAPERS[0];

const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
/** mực gần màu giấy → in ra khó đọc */
export const fbgLowContrast = (inkId: string, paperId: string) => Math.abs(lum(tpInk(inkId).hex) - lum(fbgPaper(paperId).hex)) < 0.22;

// ---------- font (đều có TTF → file in outline được) ----------
export interface FBGFont { id: string; name: string; family: string; weight: number }
export const FBG_FONTS: FBGFont[] = [
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
export const fbgFont = (id: string) => FBG_FONTS.find((f) => f.id === id) || FBG_FONTS[0];
const BODY = 'Be Vietnam Pro';

// ---------- bố cục & mẫu ----------
export interface FBGLayout { id: string; name: string; inks: number }
export const FBG_LAYOUTS: FBGLayout[] = [
  { id: 'banhmi', name: 'Bánh mì', inks: 2 },
  { id: 'takeaway', name: 'Cơm tấm · mang đi', inks: 2 },
  { id: 'bakery', name: 'Tiệm bánh', inks: 2 },
  { id: 'coffee', name: 'Cà phê hạt', inks: 2 },
  { id: 'dried', name: 'Trái cây sấy · hạt', inks: 2 },
  { id: 'chicken', name: 'Gà rán', inks: 2 },
];
export const fbgLayout = (id: string) => FBG_LAYOUTS.find((l) => l.id === id) || FBG_LAYOUTS[0];

export type FBGData = Record<string, string>;
export interface FBGSpec { kind: FBGKind; size: string; paper: string; inks: string[]; font: string; layout: string; pattern: boolean }
export interface FBGTemplate { id: string; name: string; spec: Pick<FBGSpec, 'kind' | 'paper' | 'inks' | 'font' | 'layout' | 'pattern'>; data?: FBGData }
export const FBG_TEMPLATES: FBGTemplate[] = [
  { id: 'banhmi-grease', name: 'Bánh mì · trắng đỏ', spec: { kind: 'banhmi', paper: 'grease', inks: ['red', 'black'], font: 'baloo', layout: 'banhmi', pattern: false } },
  { id: 'banhmi-kraft', name: 'Bánh mì · kraft hoạ tiết', spec: { kind: 'banhmi', paper: 'kraft', inks: ['brown'], font: 'oswald', layout: 'banhmi', pattern: true }, data: { brand: 'BÁNH MÌ GIA KHÁNH', tag: 'NƯỚNG CỦI MỖI SÁNG', slogan: 'Giòn rụm — nóng hổi — đậm vị' } },
  { id: 'takeaway-kraft', name: 'Cơm tấm · kraft đỏ', spec: { kind: 'sos', paper: 'kraft', inks: ['red', 'black'], font: 'baloo', layout: 'takeaway', pattern: false } },
  { id: 'takeaway-white', name: 'Cơm văn phòng · trắng xanh', spec: { kind: 'sos', paper: 'white', inks: ['teal', 'red'], font: 'montserrat', layout: 'takeaway', pattern: true }, data: { brand: 'BẾP NHÀ THU HÀ', tag: 'CƠM VĂN PHÒNG · GIAO TẬN NƠI', slogan: 'Cơm nhà nấu — sạch & ấm bụng' } },
  { id: 'bakery-pink', name: 'Tiệm bánh · cửa sổ hồng', spec: { kind: 'window', paper: 'white', inks: ['pink', 'brown'], font: 'dancing', layout: 'bakery', pattern: false } },
  { id: 'bakery-kraft', name: 'Tiệm bánh · kraft nâu', spec: { kind: 'window', paper: 'kraft', inks: ['brown'], font: 'playfair', layout: 'bakery', pattern: true }, data: { brand: 'Quốc Bảo Bakery', tag: 'BÁNH NƯỚNG THỦ CÔNG', slogan: 'Bánh ngon mỗi ngày' } },
  { id: 'coffee-black', name: 'Cà phê · kraft đen', spec: { kind: 'window', paper: 'black', inks: ['white', 'yellow'], font: 'oswald', layout: 'coffee', pattern: false } },
  { id: 'coffee-kraft', name: 'Cà phê · kraft 1 màu', spec: { kind: 'sos', paper: 'kraft', inks: ['black'], font: 'playfair', layout: 'coffee', pattern: true }, data: { brand: 'AN KHANG COFFEE', tag: 'CÀ PHÊ RANG XAY NGUYÊN CHẤT', slogan: 'Đậm đà hương vị Tây Nguyên', net: 'NET 500g' } },
  { id: 'dried-white', name: 'Trái cây sấy · trắng xanh', spec: { kind: 'window', paper: 'white', inks: ['teal', 'red'], font: 'baloo', layout: 'dried', pattern: false } },
  { id: 'chicken-white', name: 'Gà rán · trắng đỏ', spec: { kind: 'sos', paper: 'white', inks: ['red', 'black'], font: 'baloo', layout: 'chicken', pattern: false } },
  { id: 'chicken-handle', name: 'Gà rán · quai dẹt kraft', spec: { kind: 'handle', paper: 'kraft', inks: ['red', 'black'], font: 'oswald', layout: 'chicken', pattern: true }, data: { brand: 'GÀ RÁN QUỐC BẢO', tag: 'GIÒN RỤM · ĐẬM VỊ', slogan: 'Combo gia đình — giao nhanh 30 phút' } },
  { id: 'takeaway-handle', name: 'Mang đi · quai dẹt trắng', spec: { kind: 'handle', paper: 'white', inks: ['navy', 'red'], font: 'montserrat', layout: 'takeaway', pattern: false }, data: { brand: 'AN KHANG KITCHEN', tag: 'ĐỒ ĂN MANG ĐI', slogan: 'Ngon như ăn tại quán' } },
];

/** chữ mẫu theo bố cục (khách chưa sửa chữ thì nạp theo mẫu) */
const SAMPLE: Record<string, FBGData> = {
  banhmi: { brand: 'BÁNH MÌ AN KHANG', tag: 'BÁNH MÌ · XÔI · NƯỚC ÉP', slogan: 'Giòn tan — đầy nhân — đúng vị Sài Gòn', net: '' },
  takeaway: { brand: 'CƠM TẤM AN KHANG', tag: 'MANG ĐI · TAKE AWAY', slogan: 'Sườn nướng than hồng — ngon nhức nách', net: '' },
  bakery: { brand: 'Thu Hà Bakery', tag: 'BÁNH NGỌT · BÁNH QUY', slogan: 'Làm bằng cả trái tim', net: '' },
  coffee: { brand: 'MỘC SƠN COFFEE', tag: 'CÀ PHÊ HẠT RANG MỘC', slogan: 'Rang mới mỗi tuần', net: 'NET 250g' },
  dried: { brand: 'NÔNG SẢN GIA KHÁNH', tag: 'TRÁI CÂY SẤY DẺO', slogan: 'Không đường — không chất bảo quản', net: 'NET 200g' },
  chicken: { brand: 'GÀ RÁN AN KHANG', tag: 'GIÒN RỤM · NÓNG HỔI', slogan: 'Ăn là ghiền — gọi là giao', net: '' },
};
export interface FBGField { key: string; label: string; ph?: string; half?: boolean }
export const FBG_FIELDS: FBGField[] = [
  { key: 'brand', label: 'Tên quán / thương hiệu', ph: 'BÁNH MÌ AN KHANG', half: true },
  { key: 'tag', label: 'Dòng nhỏ (món / ngành)', ph: 'BÁNH MÌ · XÔI', half: true },
  { key: 'slogan', label: 'Slogan', ph: 'Giòn rụm — nóng hổi', half: true },
  { key: 'net', label: 'Khối lượng (túi hạt, sấy)', ph: 'NET 250g', half: true },
  { key: 'phone', label: 'Hotline / đặt hàng', ph: '0909 123 456', half: true },
  { key: 'social', label: 'Fanpage / website', ph: 'fb.com/banhmiankhang', half: true },
  { key: 'address', label: 'Địa chỉ (tuỳ chọn)', ph: '12 Lê Lợi, Q.1, TP.HCM' },
];
const COMMON: FBGData = { phone: '0909 123 456', social: 'fb.com/ankhangfood', address: '12 Lê Lợi, Q.1, TP.HCM' };
export const sampleFBGData = (layout: string, extra?: FBGData): FBGData => ({ ...COMMON, ...(SAMPLE[layout] || SAMPLE.banhmi), ...(extra || {}) });
export const defaultFBGData = (): FBGData => sampleFBGData(FBG_TEMPLATES[0].spec.layout, FBG_TEMPLATES[0].data);

// ---------- hình học 1 mặt & khuôn ----------
export interface Rect { x: number; y: number; w: number; h: number }
export interface FBGFace {
  W: number; H: number;
  /** vùng in an toàn mặt trước (trên cửa sổ nếu có) */
  area: Rect;
  /** dải dưới cửa sổ (liên hệ) */
  band: Rect | null;
  /** cửa sổ PLA (mặt trước) */
  win: (Rect & { r: number }) | null;
  /** vùng in mặt sau */
  backArea: Rect;
  serr: number;        // biên độ răng cưa miệng túi (0 = thẳng)
  notch: number;       // bán kính khoét ngón cái (0 = không)
  turn: number;        // viền gấp miệng vào trong (túi quai dẹt)
}
export function fbgFace(sz: FBGSize): FBGFace {
  const W = sz.w, H = sz.h;
  const mx = Math.max(10, W * 0.08);
  if (sz.kind === 'banhmi') {
    const top = 26, bot = H - 14;
    return { W, H, area: { x: mx * 0.8, y: top, w: W - mx * 1.6, h: bot - top }, band: null, win: null, backArea: { x: mx * 0.8, y: top, w: W - mx * 1.6, h: bot - top }, serr: 0, notch: Math.min(13, W * 0.11), turn: 0 };
  }
  if (sz.kind === 'window') {
    const top = 24, bot = H - 12;
    const ww = W * 0.6, wh = H * 0.34, wy = H * 0.47;
    const win = { x: (W - ww) / 2, y: wy, w: ww, h: wh, r: Math.min(14, ww * 0.12) };
    return {
      W, H, area: { x: mx, y: top, w: W - mx * 2, h: wy - 8 - top }, band: { x: mx, y: wy + wh + 5, w: W - mx * 2, h: bot - (wy + wh + 5) }, win,
      backArea: { x: mx, y: top, w: W - mx * 2, h: bot - top }, serr: 3, notch: 0, turn: 0,
    };
  }
  if (sz.kind === 'handle') {
    const top = 34, bot = H - 14;
    return { W, H, area: { x: mx, y: top, w: W - mx * 2, h: bot - top }, band: null, win: null, backArea: { x: mx, y: top, w: W - mx * 2, h: bot - top }, serr: 0, notch: 0, turn: 40 };
  }
  const top = 30, bot = H - 14;
  return { W, H, area: { x: mx, y: top, w: W - mx * 2, h: bot - top }, band: null, win: null, backArea: { x: mx, y: top, w: W - mx * 2, h: bot - top }, serr: 3.2, notch: 0, turn: 0 };
}

/** đường răng cưa từ (x0,y) tới (x1,y): bước ~6mm, biên độ a (răng nhô lên trên) */
export function zigzag(x0: number, x1: number, y: number, a: number): string {
  const n = Math.max(2, Math.round((x1 - x0) / 6));
  const st = (x1 - x0) / n;
  let d = '';
  for (let i = 0; i < n; i++) d += ` L${(x0 + st * (i + 0.5)).toFixed(2)} ${(y - a).toFixed(2)} L${(x0 + st * (i + 1)).toFixed(2)} ${y.toFixed(2)}`;
  return d;
}

export interface FBGDie {
  SW: number; SH: number;      // kích thước tờ trải phẳng (không lề xén)
  top: number;                 // y mép trên thân (vùng gấp viền nằm trên, y < top)
  panels: { front: number; back: number; gussets: number[]; glue: number }; // x bắt đầu
  outline: string; window: string | null; folds: string[]; valley: string[]; handles: Rect[];
}
export const FBG_GLUE = 15;
export const FBG_BLEED = 3;
export function fbgDie(sz: FBGSize): FBGDie {
  const f = fbgFace(sz);
  const { w: W, g: G, h: H } = sz;
  const glue = sz.kind === 'banhmi' ? 12 : FBG_GLUE;
  const top = f.turn;                         // y thân bắt đầu
  const B = sz.kind === 'banhmi' ? 25 : Math.round(G * 0.5 + 18); // vạt đáy
  const xF = G / 2, xB = G / 2 + W + G, xEnd = G * 2 + W * 2;
  const SW = xEnd + glue, SH = top + H + B;
  // đường bao
  let d = `M0 0`;
  if (f.serr) d += zigzag(0, xEnd, 0, f.serr); // răng cưa nhô ra ngoài tờ (y < 0)
  else if (f.notch) d += ` L${xF + W / 2 - f.notch} 0 A${f.notch} ${f.notch} 0 0 0 ${xF + W / 2 + f.notch} 0 L${xEnd} 0`;
  else d += ` L${xEnd} 0`;
  d += ` L${SW} 6 L${SW} ${SH - 6} L${xEnd} ${SH} L0 ${SH} Z`;
  const window = f.win ? (() => { const w = f.win!; const x = xF + w.x, y = top + w.y, r = w.r; return `M${x + r} ${y} H${x + w.w - r} A${r} ${r} 0 0 1 ${x + w.w} ${y + r} V${y + w.h - r} A${r} ${r} 0 0 1 ${x + w.w - r} ${y + w.h} H${x + r} A${r} ${r} 0 0 1 ${x} ${y + w.h - r} V${y + r} A${r} ${r} 0 0 1 ${x + r} ${y} Z`; })() : null;
  const xs = [xF, xF + W, xB, xB + W, xEnd];
  const folds = xs.map((x) => `M${x} ${top} V${SH}`);
  if (top) folds.push(`M0 ${top} H${xEnd}`, ...xs.map((x) => `M${x} 0 V${top}`));
  folds.push(`M0 ${top + H} H${xEnd}`);
  const valley = [`M${xF + W + G / 2} ${top} V${top + H}`]; // nếp lõm giữa hông (hông còn lại: mép dán chia đôi)
  if (sz.kind !== 'banhmi') {
    folds.push(`M0 ${top + H + G / 2} H${xEnd}`);
    // tam giác gấp đáy ở hông
    for (const gx of [xF + W, 0 - G / 2, xB + W]) {
      const a = gx, b = gx + G, c = gx + G / 2, y0 = top + H, y1 = y0 + G / 2;
      if (a >= 0) valley.push(`M${a} ${y0} L${c} ${y1}`);
      if (b <= xEnd) valley.push(`M${b} ${y0} L${c} ${y1}`);
    }
  }
  const handles: Rect[] = sz.kind === 'handle' ? [xF, xB].flatMap((x0) => [{ x: x0 + W * 0.22, y: 6, w: W * 0.12, h: top - 12 }, { x: x0 + W * 0.66, y: 6, w: W * 0.12, h: top - 12 }]) : [];
  return { SW, SH, top, panels: { front: xF, back: xB, gussets: [-G / 2, xF + W, xB + W], glue: xEnd }, outline: d, window, folds, valley, handles };
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
  if (!t || !t.trim()) return null;
  const s = fitSize(t, f, ts, maxW);
  const m = vm(ts);
  return {
    h: s * (m.a + m.d) * 1.02,
    draw: (cx, top, k) => <text key={key} x={cx} y={top + s * k * m.a} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={s * k} letterSpacing={ts.ls ? ts.ls * s * k : undefined} fill={fill} data-fbt="1">{t}</text>,
  };
}
function brandItems(t: string, f: number, ts: TS, fill: string, maxW: number, minRatio = 0.66): Item[] {
  const one = fitSize(t, f, ts, maxW);
  if (one >= f * minRatio || !/\s/.test((t || '').trim())) return [textItem(t, f, ts, fill, maxW, 'b0')].filter(Boolean) as Item[];
  const [a, b] = split2(t);
  const s = Math.min(fitSize(a, f, ts, maxW), fitSize(b, f, ts, maxW));
  return [textItem(a, s, ts, fill, maxW, 'b1'), textItem(b, s, ts, fill, maxW, 'b2')].filter(Boolean) as Item[];
}
const spacer = (h: number): Item => ({ h, draw: () => null });
const shape = (h: number, fn: (cx: number, top: number, k: number) => ReactNode): Item => ({ h, draw: fn });
function column(items: (Item | null)[], area: Rect, align: 'center' | 'top' = 'center'): ReactNode {
  const its = items.filter(Boolean) as Item[];
  const total = its.reduce((a, it) => a + it.h + (it.gap ?? 0), 0);
  const k = total > area.h ? area.h / total : 1;
  let y = area.y + (align === 'center' ? (area.h - total * k) / 2 : 0);
  const cx = area.x + area.w / 2;
  return its.map((it, i) => { const n = <g key={i}>{it.draw(cx, y, k)}</g>; y += (it.h + (it.gap ?? 0)) * k; return n; });
}

// ---------- icon vẽ code (ô s×s, góc trái-trên x,y), tô 1 màu ----------
type Icon = (x: number, y: number, s: number, fill: string) => ReactNode;
const P = (x: number, y: number, s: number) => (u: number, v: number) => `${(x + s * u).toFixed(2)} ${(y + s * v).toFixed(2)}`;
export const icBaguette: Icon = (x, y, s, fill) => {
  const p = P(x, y, s);
  return (
    <g>
      <path d={`M${p(0.06, 0.72)} C${p(0.02, 0.6)} ${p(0.12, 0.46)} ${p(0.3, 0.38)} L${p(0.74, 0.2)} C${p(0.9, 0.13)} ${p(1.0, 0.22)} ${p(0.96, 0.34)} C${p(0.92, 0.44)} ${p(0.82, 0.5)} ${p(0.7, 0.55)} L${p(0.26, 0.76)} C${p(0.16, 0.8)} ${p(0.09, 0.79)} ${p(0.06, 0.72)} Z`} fill={fill} />
    </g>
  );
};
/** bánh mì có vết khía (khía = khoét trắng qua mask nên vẫn 1 màu) */
function baguetteMasked(x: number, y: number, s: number, fill: string, id: string): ReactNode {
  const p = P(x, y, s);
  return (
    <g>
      <mask id={id} maskUnits="userSpaceOnUse" x={x - 1} y={y - 1} width={s + 2} height={s + 2}>
        <rect x={x - 1} y={y - 1} width={s + 2} height={s + 2} fill="#000" />
        {icBaguette(x, y, s, '#fff')}
        {[0.3, 0.46, 0.62, 0.78].map((u, i) => {
          const cy = 0.6 - (u - 0.2) * 0.48;
          return <path key={i} d={`M${p(u - 0.06, cy + 0.03)} Q${p(u, cy - 0.05)} ${p(u + 0.07, cy - 0.09)}`} stroke="#000" strokeWidth={s * 0.035} fill="none" strokeLinecap="round" />;
        })}
      </mask>
      <rect x={x - 1} y={y - 1} width={s + 2} height={s + 2} fill={fill} mask={`url(#${id})`} />
    </g>
  );
}
const icBowl: Icon = (x, y, s, fill) => {
  const p = P(x, y, s);
  return (
    <g>
      <path d={`M${p(0.06, 0.5)} H${p(0.94, 0.5).split(' ')[0]} C${p(0.94, 0.76)} ${p(0.74, 0.9)} ${p(0.5, 0.9)} C${p(0.26, 0.9)} ${p(0.06, 0.76)} ${p(0.06, 0.5)} Z`} fill={fill} />
      <path d={`M${p(0.12, 0.46)} C${p(0.2, 0.2)} ${p(0.8, 0.2)} ${p(0.88, 0.46)} Z`} fill={fill} />
      <path d={`M${p(0.36, 0.94)} H${p(0.64, 0.94).split(' ')[0]}`} stroke={fill} strokeWidth={s * 0.06} strokeLinecap="round" />
      <path d={`M${p(0.62, 0.32)} L${p(0.98, 0.04)} M${p(0.7, 0.36)} L${p(1.04, 0.1)}`} stroke={fill} strokeWidth={s * 0.035} strokeLinecap="round" />
    </g>
  );
};
const icCroissant: Icon = (x, y, s, fill) => {
  const p = P(x, y, s);
  return (
    <g fill={fill}>
      <path d={`M${p(0.04, 0.66)} C${p(0.02, 0.5)} ${p(0.14, 0.42)} ${p(0.24, 0.46)} L${p(0.3, 0.7)} C${p(0.18, 0.76)} ${p(0.06, 0.74)} ${p(0.04, 0.66)} Z`} />
      <path d={`M${p(0.96, 0.66)} C${p(0.98, 0.5)} ${p(0.86, 0.42)} ${p(0.76, 0.46)} L${p(0.7, 0.7)} C${p(0.82, 0.76)} ${p(0.94, 0.74)} ${p(0.96, 0.66)} Z`} />
      <path d={`M${p(0.27, 0.43)} C${p(0.3, 0.32)} ${p(0.38, 0.28)} ${p(0.44, 0.3)} L${p(0.46, 0.74)} C${p(0.4, 0.76)} ${p(0.34, 0.74)} ${p(0.32, 0.72)} Z`} />
      <path d={`M${p(0.73, 0.43)} C${p(0.7, 0.32)} ${p(0.62, 0.28)} ${p(0.56, 0.3)} L${p(0.54, 0.74)} C${p(0.6, 0.76)} ${p(0.66, 0.74)} ${p(0.68, 0.72)} Z`} />
      <path d={`M${p(0.48, 0.26)} C${p(0.5, 0.24)} ${p(0.5, 0.24)} ${p(0.52, 0.26)} L${p(0.52, 0.76)} L${p(0.48, 0.76)} Z`} />
    </g>
  );
};
const icBean: Icon = (x, y, s, fill) => {
  const bean = (cx: number, cy: number, r: number, rot: number, key: number) => (
    <g key={key} transform={`rotate(${rot} ${x + s * cx} ${y + s * cy})`}>
      <ellipse cx={x + s * cx} cy={y + s * cy} rx={s * r * 0.72} ry={s * r} fill={fill} />
    </g>
  );
  return <g>{bean(0.36, 0.52, 0.34, -28, 0)}{bean(0.68, 0.46, 0.28, 24, 1)}</g>;
};
/** hạt cà phê có rãnh giữa khoét (mask) */
function beansMasked(x: number, y: number, s: number, fill: string, id: string): ReactNode {
  const beans: [number, number, number, number][] = [[0.36, 0.52, 0.34, -28], [0.7, 0.44, 0.27, 24]];
  return (
    <g>
      <mask id={id} maskUnits="userSpaceOnUse" x={x - 1} y={y - 1} width={s + 2} height={s + 2}>
        <rect x={x - 1} y={y - 1} width={s + 2} height={s + 2} fill="#000" />
        {beans.map(([cx, cy, r, rot], i) => (
          <g key={i} transform={`rotate(${rot} ${x + s * cx} ${y + s * cy})`}>
            <ellipse cx={x + s * cx} cy={y + s * cy} rx={s * r * 0.72} ry={s * r} fill="#fff" />
            <path d={`M${x + s * cx} ${y + s * (cy - r * 0.82)} C${x + s * (cx - r * 0.34)} ${y + s * (cy - r * 0.3)} ${x + s * (cx + r * 0.34)} ${y + s * (cy + r * 0.3)} ${x + s * cx} ${y + s * (cy + r * 0.82)}`} stroke="#000" strokeWidth={s * r * 0.14} fill="none" strokeLinecap="round" />
          </g>
        ))}
      </mask>
      <rect x={x - 1} y={y - 1} width={s + 2} height={s + 2} fill={fill} mask={`url(#${id})`} />
    </g>
  );
}
const icOrange: Icon = (x, y, s, fill) => {
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.44;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      {Array.from({ length: 8 }, (_, i) => {
        const a0 = (i * Math.PI) / 4 + 0.08, a1 = ((i + 1) * Math.PI) / 4 - 0.08, rr = r * 0.8;
        return <path key={i} d={`M${cx.toFixed(2)} ${cy.toFixed(2)} L${(cx + Math.cos(a0) * rr).toFixed(2)} ${(cy + Math.sin(a0) * rr).toFixed(2)} A${rr} ${rr} 0 0 1 ${(cx + Math.cos(a1) * rr).toFixed(2)} ${(cy + Math.sin(a1) * rr).toFixed(2)} Z`} fill="#000" />;
      })}
    </g>
  );
};
/** lát cam (múi khoét bằng mask) */
function orangeMasked(x: number, y: number, s: number, fill: string, id: string): ReactNode {
  return (
    <g>
      <mask id={id} maskUnits="userSpaceOnUse" x={x - 1} y={y - 1} width={s + 2} height={s + 2}>
        <rect x={x - 1} y={y - 1} width={s + 2} height={s + 2} fill="#000" />
        <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.44} fill="#fff" />
        <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.37} fill="#000" />
        {icOrange(x + s * 0.12, y + s * 0.12, s * 0.76, '#fff')}
      </mask>
      <rect x={x - 1} y={y - 1} width={s + 2} height={s + 2} fill={fill} mask={`url(#${id})`} />
    </g>
  );
}
const icLeaf: Icon = (x, y, s, fill) => {
  const p = P(x, y, s);
  return <path d={`M${p(0.12, 0.88)} C${p(0.08, 0.4)} ${p(0.4, 0.1)} ${p(0.92, 0.08)} C${p(0.9, 0.6)} ${p(0.6, 0.9)} ${p(0.12, 0.88)} Z`} fill={fill} />;
};
const icDrumstick: Icon = (x, y, s, fill) => {
  const p = P(x, y, s);
  return (
    <g fill={fill}>
      <path d={`M${p(0.5, 0.06)} C${p(0.82, 0.04)} ${p(0.98, 0.3)} ${p(0.9, 0.5)} C${p(0.84, 0.66)} ${p(0.66, 0.7)} ${p(0.54, 0.66)} L${p(0.36, 0.78)} L${p(0.26, 0.68)} L${p(0.36, 0.5)} C${p(0.28, 0.4)} ${p(0.26, 0.1)} ${p(0.5, 0.06)} Z`} />
      <circle cx={x + s * 0.2} cy={y + s * 0.82} r={s * 0.07} />
      <circle cx={x + s * 0.3} cy={y + s * 0.9} r={s * 0.07} />
    </g>
  );
};
const icCupcake: Icon = (x, y, s, fill) => {
  const p = P(x, y, s);
  return (
    <g fill={fill}>
      <path d={`M${p(0.2, 0.56)} H${p(0.8, 0.56).split(' ')[0]} L${p(0.7, 0.94)} H${p(0.3, 0.94).split(' ')[0]} Z`} />
      <path d={`M${p(0.16, 0.52)} C${p(0.1, 0.36)} ${p(0.26, 0.26)} ${p(0.38, 0.3)} C${p(0.4, 0.14)} ${p(0.6, 0.14)} ${p(0.62, 0.3)} C${p(0.74, 0.26)} ${p(0.9, 0.36)} ${p(0.84, 0.52)} Z`} />
      <circle cx={x + s * 0.5} cy={y + s * 0.1} r={s * 0.07} />
    </g>
  );
};
const icHeart: Icon = (x, y, s, fill) => (
  <path d={`M${x + s / 2} ${y + s * 0.88} C${x + s * 0.1} ${y + s * 0.6} ${x - s * 0.02} ${y + s * 0.32} ${x + s * 0.2} ${y + s * 0.16} C${x + s * 0.34} ${y + s * 0.05} ${x + s * 0.46} ${y + s * 0.14} ${x + s / 2} ${y + s * 0.26} C${x + s * 0.54} ${y + s * 0.14} ${x + s * 0.66} ${y + s * 0.05} ${x + s * 0.8} ${y + s * 0.16} C${x + s * 1.02} ${y + s * 0.32} ${x + s * 0.9} ${y + s * 0.6} ${x + s / 2} ${y + s * 0.88} Z`} fill={fill} />
);
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
const icStar: Icon = (x, y, s, fill) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? s * 0.21 : s * 0.48; return `${(x + s / 2 + Math.cos(a) * r).toFixed(2)},${(y + s * 0.54 + Math.sin(a) * r).toFixed(2)}`; });
  return <polygon points={pts.join(' ')} fill={fill} />;
};
/** icon hoạ tiết theo bố cục (dùng cho nền lặp mặt sau/hông) */
const PATTERN_ICONS: Record<string, Icon[]> = {
  banhmi: [icBaguette, icStar], takeaway: [icBowl, icLeaf], bakery: [icCroissant, icHeart, icCupcake],
  coffee: [icBean, icLeaf], dried: [icLeaf, icStar], chicken: [icDrumstick, icStar],
};

// ---------- logo khách (mask 1 màu) ----------
function logoItem(logo: FBGLogo | null, h: number, fill: string, fb: (x: number, y: number, s: number) => ReactNode, uid: string, maxW: number): Item {
  return shape(h, (cx, top, k) => {
    const hh = h * k;
    if (!logo) return fb(cx - hh / 2, top, hh);
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
function contactItems(parts: { icon: Icon; t: string }[], f: number, ts: TS, fill: string, maxW: number): Item[] {
  const ps = parts.filter((p) => (p.t || '').trim());
  if (!ps.length) return [];
  const wOf = (p: { t: string }, s: number) => s * 1.25 + measure(p.t, s, ts);
  const gap = f * 1.2;
  const one = ps.reduce((a, p) => a + wOf(p, f), 0) + gap * (ps.length - 1);
  const rows = one <= maxW ? [ps] : ps.map((p) => [p]);
  const m = vm(ts);
  return rows.map((r, ri) => {
    const s = Math.min(f, ...r.map((p) => (wOf(p, f) > maxW ? (f * maxW) / wOf(p, f) : f)));
    const tw = r.reduce((a, p) => a + wOf(p, s), 0) + gap * (r.length - 1);
    return {
      h: Math.max(s * 1.15, s * (m.a + m.d) * 1.04),
      gap: ri < rows.length - 1 ? s * 0.1 : 0,
      draw: (cx, top, k) => {
        let x = cx - (tw * k) / 2;
        return r.map((p, i) => {
          const ss = s * k;
          const n = (
            <g key={i}>
              {p.icon(x, top + ss * 0.12, ss * 0.95, fill)}
              <text x={x + ss * 1.25} y={top + ss * Math.max(0.93, m.a)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={ss} fill={fill} data-fbt="1">{p.t}</text>
            </g>
          );
          x += wOf(p, s) * k + gap * k;
          return n;
        });
      },
    } as Item;
  });
}

// ---------- vẽ các mặt ----------
interface Ctx { f: FBGFace; ink: (i: number) => string; disp: TS; body: TS; bodyB: TS; data: FBGData; logo: FBGLogo | null; uid: string; layout: string }

function hero(c: Ctx, s: number): Item {
  const { layout, ink, uid } = c;
  return logoItem(c.logo, s, ink(0), (x, y, ss) => {
    if (layout === 'banhmi') return baguetteMasked(x - ss * 0.3, y - ss * 0.2, ss * 1.6, ink(0), `${uid}-bg`);
    if (layout === 'takeaway') return (
      <g>
        <circle cx={x + ss / 2} cy={y + ss / 2} r={ss * 0.5} fill="none" stroke={ink(0)} strokeWidth={ss * 0.05} />
        {icBowl(x + ss * 0.2, y + ss * 0.18, ss * 0.6, ink(1))}
      </g>
    );
    if (layout === 'bakery') return icCroissant(x - ss * 0.2, y - ss * 0.3, ss * 1.4, ink(0));
    if (layout === 'coffee') return beansMasked(x - ss * 0.1, y, ss * 1.2, ink(1), `${uid}-bn`);
    if (layout === 'dried') return orangeMasked(x, y, ss, ink(1), `${uid}-or`);
    // gà rán: sao nổ khoét đùi gà
    const id = `${uid}-st`, n = 14;
    const cx = x + ss / 2, cy = y + ss / 2;
    const pts = Array.from({ length: n * 2 }, (_, i) => { const a = (i * Math.PI) / n; const r = i % 2 ? ss * 0.42 : ss * 0.52; return `${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`; });
    return (
      <g>
        <mask id={id} maskUnits="userSpaceOnUse" x={x - ss * 0.1} y={y - ss * 0.1} width={ss * 1.2} height={ss * 1.2}>
          <polygon points={pts.join(' ')} fill="#fff" />
          {icDrumstick(x + ss * 0.2, y + ss * 0.18, ss * 0.62, '#000')}
        </mask>
        <rect x={x - ss * 0.1} y={y - ss * 0.1} width={ss * 1.2} height={ss * 1.2} fill={ink(0)} mask={`url(#${id})`} />
      </g>
    );
  }, uid, c.f.area.w * 0.6);
}

function netBox(c: Ctx, s: number, maxW: number): Item[] {
  const t = (c.data.net || '').trim();
  if (!t) return [];
  const ts = { ...c.bodyB, ls: 0.12 };
  const fs = fitSize(t, s, ts, maxW * 0.7);
  const w = measure(t, fs, ts) + fs * 1.6, h = fs * 1.7;
  const m = vm(ts);
  return [shape(h, (cx, top, k) => (
    <g>
      <rect x={cx - (w * k) / 2} y={top} width={w * k} height={h * k} rx={h * k * 0.5} fill="none" stroke={c.ink(0)} strokeWidth={Math.max(0.5, fs * 0.1 * k)} />
      <text x={cx} y={top + (h * k) / 2 + fs * k * (m.a - (m.a + m.d) / 2)} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={fs * k} letterSpacing={0.12 * fs * k} fill={c.ink(0)} data-fbt="1">{t}</text>
    </g>
  ))];
}

function frontArt(c: Ctx): ReactNode {
  const { f, ink, disp, body, bodyB, data, layout } = c;
  const A = f.area, W = A.w;
  const big = Math.min(W * 0.16, A.h * 0.11);
  const phone = (sz: number, fill = ink(1)) => contactItems([{ icon: icPhone, t: data.phone || '' }], sz, bodyB, fill, W);
  const web = (sz: number, fill = ink(0)) => contactItems([{ icon: icGlobe, t: data.social || '' }], sz, body, fill, W);
  const addr = (sz: number, fill = ink(0)) => contactItems([{ icon: icPin, t: data.address || '' }], sz, body, fill, W);
  const rule = (w: number) => shape(big * 0.2, (cx, top, k) => <rect x={cx - w / 2} y={top + big * 0.06 * k} width={w} height={Math.max(0.6, big * 0.06 * k)} fill={ink(1)} />);
  const scriptTs: TS = disp.fam === 'Dancing Script' ? disp : { fam: 'Dancing Script', wt: 700 };
  const withBand = !!f.band;
  const tail = (items: Item[]) => (withBand ? [] : items);
  const bandNode = withBand ? column([...phone(Math.min(big * 0.4, f.band!.h * 0.32)), ...web(Math.min(big * 0.28, f.band!.h * 0.22))], f.band!) : null;

  let items: (Item | null)[] = [];
  if (layout === 'banhmi') {
    items = [
      hero(c, big * 1.5), spacer(big * 0.35),
      ...brandItems(data.brand || '', big, disp, ink(0), W),
      textItem((data.tag || '').toUpperCase(), big * 0.3, { ...bodyB, ls: 0.16 }, ink(1), W, 'tg'),
      spacer(big * 0.4), rule(W * 0.22), spacer(big * 0.3),
      textItem(data.slogan || '', big * 0.36, body, ink(0), W, 'sl'),
      ...tail([spacer(big * 0.5), ...phone(big * 0.46), ...web(big * 0.28), ...addr(big * 0.25)]),
    ];
  } else if (layout === 'takeaway') {
    items = [
      textItem((data.tag || '').toUpperCase(), big * 0.3, { ...bodyB, ls: 0.2 }, ink(1), W, 'tg'), spacer(big * 0.35),
      hero(c, big * 1.6), spacer(big * 0.4),
      ...brandItems(data.brand || '', big, disp, ink(0), W),
      spacer(big * 0.25),
      textItem(data.slogan || '', big * 0.34, body, ink(0), W, 'sl'),
      ...tail([spacer(big * 0.45), rule(W * 0.3), spacer(big * 0.3), ...phone(big * 0.48), ...web(big * 0.27), ...addr(big * 0.25)]),
    ];
  } else if (layout === 'bakery') {
    items = [
      hero(c, big * 1.3), spacer(big * 0.3),
      ...brandItems(data.brand || '', big * 1.1, disp, ink(0), W, 0.72),
      spacer(big * 0.15),
      textItem((data.tag || '').toUpperCase(), big * 0.26, { ...body, ls: 0.3 }, ink(1), W, 'tg'),
      spacer(big * 0.35),
      textItem(data.slogan || '', big * 0.5, scriptTs, ink(1), W, 'sl'),
      ...tail([spacer(big * 0.45), ...phone(big * 0.4, ink(0)), ...web(big * 0.27), ...addr(big * 0.25)]),
    ];
  } else if (layout === 'coffee') {
    items = [
      hero(c, big * 1.4), spacer(big * 0.35),
      ...brandItems(data.brand || '', big, disp, ink(0), W),
      textItem((data.tag || '').toUpperCase(), big * 0.28, { ...bodyB, ls: 0.18 }, ink(1), W, 'tg'),
      spacer(big * 0.35),
      ...netBox(c, big * 0.36, W), spacer(big * 0.3),
      textItem(data.slogan || '', big * 0.32, body, ink(0), W, 'sl'),
      ...tail([spacer(big * 0.4), ...phone(big * 0.4), ...web(big * 0.27)]),
    ];
  } else if (layout === 'dried') {
    items = [
      hero(c, big * 1.4), spacer(big * 0.35),
      ...brandItems(data.brand || '', big, disp, ink(0), W),
      textItem((data.tag || '').toUpperCase(), big * 0.3, { ...bodyB, ls: 0.14 }, ink(1), W, 'tg'),
      spacer(big * 0.3),
      ...netBox(c, big * 0.34, W), spacer(big * 0.25),
      textItem(data.slogan || '', big * 0.3, body, ink(0), W, 'sl'),
      ...tail([spacer(big * 0.4), ...phone(big * 0.4), ...web(big * 0.26)]),
    ];
  } else {
    items = [
      hero(c, big * 1.75), spacer(big * 0.3),
      ...brandItems(data.brand || '', big * 1.05, disp, ink(0), W),
      textItem((data.tag || '').toUpperCase(), big * 0.4, { ...disp, ls: 0.06 }, ink(1), W, 'tg'),
      spacer(big * 0.3),
      textItem(data.slogan || '', big * 0.32, body, ink(0), W, 'sl'),
      ...tail([spacer(big * 0.45), ...phone(big * 0.5, ink(0)), ...web(big * 0.27), ...addr(big * 0.25)]),
    ];
  }
  return <>{column(items, A)}{bandNode}</>;
}

/** hoạ tiết lặp (so le) trong khung, 1 màu */
function pattern(c: Ctx, box: Rect, step: number, fill: string, skip?: Rect): ReactNode {
  const icons = PATTERN_ICONS[c.layout] || [icStar];
  const out: ReactNode[] = [];
  const s = step * 0.42;
  let n = 0;
  for (let r = 0, y = box.y + step * 0.3; y < box.y + box.h - s * 0.6; r++, y += step * 0.8) {
    for (let x = box.x + (r % 2 ? step * 0.5 : 0) + step * 0.1; x < box.x + box.w - s * 0.6; x += step) {
      if (skip && x + s > skip.x && x < skip.x + skip.w && y + s > skip.y && y < skip.y + skip.h) continue;
      out.push(<g key={n} transform={`rotate(${(n * 37) % 2 ? -14 : 12} ${x + s / 2} ${y + s / 2})`}>{icons[n % icons.length](x, y, s, fill)}</g>);
      n++;
    }
  }
  return <g data-pattern="1">{out}</g>;
}

function backArt(c: Ctx, pat: boolean): ReactNode {
  const { f, ink, disp, body, bodyB, data } = c;
  const A = f.backArea, W = A.w;
  const big = Math.min(W * 0.13, A.h * 0.1);
  const label: Rect = { x: A.x + W * 0.08, y: A.y + A.h * 0.28, w: W * 0.84, h: A.h * 0.44 };
  const content = column([
    ...brandItems(data.brand || '', big, disp, ink(0), label.w * 0.86),
    spacer(big * 0.25),
    textItem('CẢM ƠN QUÝ KHÁCH', big * 0.36, { ...bodyB, ls: 0.16 }, ink(1), label.w * 0.86, 'cm'),
    spacer(big * 0.3),
    ...contactItems([{ icon: icPhone, t: data.phone || '' }], big * 0.42, bodyB, ink(0), label.w * 0.86),
    ...contactItems([{ icon: icGlobe, t: data.social || '' }], big * 0.27, body, ink(0), label.w * 0.86),
  ], { x: label.x + label.w * 0.07, y: label.y + label.h * 0.08, w: label.w * 0.86, h: label.h * 0.84 });
  if (!pat) return content;
  const id = `${c.uid}-bk`;
  return (
    <>
      <mask id={id} maskUnits="userSpaceOnUse" x={0} y={0} width={f.W} height={f.H}>
        <rect x={0} y={0} width={f.W} height={f.H} fill="#fff" />
        <rect x={label.x - 3} y={label.y - 3} width={label.w + 6} height={label.h + 6} rx={6} fill="#000" />
      </mask>
      <g mask={`url(#${id})`}>{pattern(c, { x: 0, y: A.y - 6, w: f.W, h: A.h + 6 }, Math.max(18, f.W / 5), ink(1))}</g>
      <rect x={label.x} y={label.y} width={label.w} height={label.h} rx={5} fill="none" stroke={ink(0)} strokeWidth={0.8} />
      {content}
    </>
  );
}

function gussetArt(c: Ctx, G: number, pat: boolean): ReactNode {
  const { f, ink, disp, data } = c;
  const A = f.area;
  const t = (data.brand || '').toUpperCase();
  const len = A.h * 0.72;
  const s = Math.min(G * 0.34, fitSize(t, G * 0.34, { ...disp, ls: 0.12 }, len));
  const m = vm(disp);
  const cy = A.y + A.h / 2;
  return (
    <>
      {pat && pattern(c, { x: 0, y: A.y - 4, w: G, h: A.h + 4 }, Math.max(14, G / 2.2), ink(1), { x: G / 2 - s * 0.75, y: cy - len / 2 - 4, w: s * 1.5, h: len + 8 })}
      {t && <text x={0} y={0} transform={`translate(${G / 2 + s * (m.a - (m.a + m.d) / 2)} ${cy}) rotate(-90)`} textAnchor="middle" fontFamily={`"${disp.fam}"`} fontWeight={disp.wt} fontSize={s} letterSpacing={0.12 * s} fill={ink(0)} data-fbt="1">{t}</text>}
    </>
  );
}

// ---------- SVG ----------
/**
 * face: mặt trước trên nền giấy, cắt theo miệng túi + cửa sổ (xem trước, thumbnail).
 * tex: texture 3D 1 mặt (part = front/back/gusset) — giấy + mực, hình chữ nhật đúng khổ.
 * print: khuôn trải phẳng đúng khổ — giấy tham khảo (không in) + lớp In + CutContour + Fold + ghi chú.
 */
export type FBGMode = 'face' | 'tex' | 'print';
export type FBGPart = 'front' | 'back' | 'gusset';
export const FBG_MARGIN = 16;

export function FoodBagSvg({ spec, data, logo = null, mode = 'face', part = 'front', style }: {
  spec: FBGSpec; data: FBGData; logo?: FBGLogo | null; mode?: FBGMode; part?: FBGPart; style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '') + mode[0] + part[0];
  const sz = fbgSize(spec.size);
  const f = fbgFace(sz);
  const paper = fbgPaper(spec.paper);
  const fnt = fbgFont(spec.font);
  const lay = fbgLayout(spec.layout);
  const inks = spec.inks.length ? spec.inks : ['black'];
  const ink = (i: number) => tpInk(inks[Math.min(i, inks.length - 1, lay.inks - 1)]).hex;
  const c: Ctx = { f, ink, uid, logo, data, layout: spec.layout, disp: { fam: fnt.family, wt: fnt.weight }, body: { fam: BODY, wt: 600 }, bodyB: { fam: BODY, wt: 800 } };
  const area = `${f.area.x} ${f.area.y} ${f.area.w} ${f.area.h}`;
  const G = sz.g;

  if (mode === 'tex') {
    const w = part === 'gusset' ? G : f.W;
    return (
      <svg viewBox={`0 0 ${w} ${f.H}`} xmlns="http://www.w3.org/2000/svg" style={style}>
        <rect x={0} y={0} width={w} height={f.H} fill={paper.hex} />
        <g id="In">{part === 'front' ? frontArt(c) : part === 'back' ? backArt(c, spec.pattern) : gussetArt(c, G, spec.pattern)}</g>
      </svg>
    );
  }

  if (mode === 'print') {
    const die = fbgDie(sz);
    const M = FBG_MARGIN, B = FBG_BLEED;
    const clip = `${uid}-sh`;
    const place = (x: number, node: ReactNode, w: number, key: string) => (
      <g key={key} transform={`translate(${x} ${die.top})`}><clipPath id={`${clip}-${key}`}><rect x={-B} y={-die.top - B} width={w + B * 2} height={die.SH + B * 2} /></clipPath><g clipPath={`url(#${clip}-${key})`}>{node}</g></g>
    );
    const nInk = Math.min(inks.length, lay.inks);
    const kindName = FBG_KINDS.find((k) => k.id === sz.kind)!.name;
    const note = `${kindName} ${sz.name} · giấy ${paper.name.toLowerCase()} (không in) · ${nInk} màu mực: ${inks.slice(0, nInk).map((i) => tpInk(i).name).join(', ')} · lề xén ${B}mm`;
    return (
      <svg viewBox={`${-M} ${-M} ${die.SW + M * 2} ${die.SH + M * 2}`} width={`${die.SW + M * 2}mm`} height={`${die.SH + M * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-area={area} data-sheet={`${die.SW} ${die.SH}`}>
        <g id="GiayThamKhao" opacity={0.5}><path d={die.window ? `${die.outline} ${die.window}` : die.outline} fill={paper.hex} fillRule="evenodd" /></g>
        <clipPath id={clip}><rect x={-B} y={-B - 4} width={die.SW + B * 2} height={die.SH + B * 2 + 4} /></clipPath>
        <g id="In" clipPath={`url(#${clip})`}>
          {place(die.panels.front, frontArt(c), f.W, 'f')}
          {place(die.panels.back, backArt({ ...c, uid: `${uid}b` }, spec.pattern), f.W, 'b')}
          {die.panels.gussets.map((gx, i) => place(gx, gussetArt({ ...c, uid: `${uid}g${i}` }, G, spec.pattern), G, `g${i}`))}
        </g>
        <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.35}>
          <path d={die.outline} />
          {die.window && <path d={die.window} />}
        </g>
        <g id="Fold" fill="none" stroke="#00A651" strokeWidth={0.3} strokeDasharray="3 2">
          {die.folds.map((d, i) => <path key={i} d={d} />)}
        </g>
        <g id="FoldValley" fill="none" stroke="#00A651" strokeWidth={0.3} strokeDasharray="1 1.5">
          {die.valley.map((d, i) => <path key={i} d={d} />)}
        </g>
        {die.handles.length > 0 && (
          <g id="Quai" fill="none" stroke="#7A7A7A" strokeWidth={0.3} strokeDasharray="2 1.5">
            {die.handles.map((r, i) => <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} />)}
          </g>
        )}
        <rect x={die.panels.glue} y={6} width={die.SW - die.panels.glue} height={die.SH - 12} fill="none" stroke="#9AA3AD" strokeWidth={0.25} strokeDasharray="1 1" data-glue="1" />
        <rect x={die.panels.front + f.area.x} y={die.top + f.area.y} width={f.area.w} height={f.area.h} fill="none" stroke="#9AA3AD" strokeWidth={0.25} strokeDasharray="2 2" data-safe="1" />
        <text x={0} y={-M * 0.5} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={4.6} fill="#111">{note}</text>
        <text x={0} y={die.SH + M * 0.68} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.6} fill="#111">Hồng = đường cắt{die.window ? ' + cửa sổ (dán màng PLA)' : ''} · Xanh lá gạch = gấp lồi · chấm = gấp lõm (hông, đáy) · Xám chấm = mép dán{die.handles.length ? ' · Xám gạch = vị trí dán quai' : ''}</text>
      </svg>
    );
  }

  // face: mặt trước trên giấy, cắt theo miệng túi (răng cưa/khoét ngón cái), cửa sổ trong suốt
  const cut = `${uid}-cut`;
  let mouth = `M0 ${f.serr}`;
  if (f.serr) mouth = `M0 ${f.serr}${zigzag(0, f.W, f.serr, f.serr)} L${f.W} ${f.H} L0 ${f.H} Z`;
  else if (f.notch) mouth = `M0 0 L${f.W / 2 - f.notch} 0 A${f.notch} ${f.notch} 0 0 0 ${f.W / 2 + f.notch} 0 L${f.W} 0 L${f.W} ${f.H} L0 ${f.H} Z`;
  else mouth = `M0 0 H${f.W} V${f.H} H0 Z`;
  const w = f.win;
  const winPath = w ? `M${w.x + w.r} ${w.y} H${w.x + w.w - w.r} A${w.r} ${w.r} 0 0 1 ${w.x + w.w} ${w.y + w.r} V${w.y + w.h - w.r} A${w.r} ${w.r} 0 0 1 ${w.x + w.w - w.r} ${w.y + w.h} H${w.x + w.r} A${w.r} ${w.r} 0 0 1 ${w.x} ${w.y + w.h - w.r} V${w.y + w.r} A${w.r} ${w.r} 0 0 1 ${w.x + w.r} ${w.y} Z` : '';
  const hh = sz.kind === 'handle' ? f.W * 0.34 : 0;
  const hc = paper.dark ? '#3A3430' : paper.id === 'white' ? '#E4DCCD' : '#B48A5B';
  return (
    <svg viewBox={`0 ${-hh} ${f.W} ${f.H + hh}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-area={area} data-band={f.band ? `${f.band.x} ${f.band.y} ${f.band.w} ${f.band.h}` : undefined}>
      {hh > 0 && (
        <path d={`M${f.W * 0.26} ${f.turn * 0.6} V${-hh * 0.45} Q${f.W * 0.26} ${-hh * 0.92} ${f.W * 0.4} ${-hh * 0.92} H${f.W * 0.6} Q${f.W * 0.74} ${-hh * 0.92} ${f.W * 0.74} ${-hh * 0.45} V${f.turn * 0.6}`}
          fill="none" stroke={hc} strokeWidth={Math.max(7, f.W * 0.05)} strokeLinejoin="round" data-handle="1" />
      )}
      <clipPath id={cut}><path d={`${mouth} ${winPath}`} fillRule="evenodd" clipRule="evenodd" /></clipPath>
      <g clipPath={`url(#${cut})`}>
        <rect data-paper="1" x={0} y={0} width={f.W} height={f.H} fill={paper.hex} />
        {f.turn > 0 && <rect x={0} y={f.turn - 1} width={f.W} height={1.2} fill="#000" opacity={0.08} />}
        <g id="In">{frontArt(c)}</g>
      </g>
      {w && (
        <g>
          <path d={winPath} fill="#fff" opacity={0.28} />
          <path d={winPath} fill="none" stroke="#000" strokeOpacity={0.15} strokeWidth={0.8} />
          <path d={`M${w.x + w.w * 0.18} ${w.y + w.h * 0.12} L${w.x + w.w * 0.42} ${w.y + w.h * 0.12} L${w.x + w.w * 0.18} ${w.y + w.h * 0.55} Z`} fill="#fff" opacity={0.35} />
        </g>
      )}
    </svg>
  );
}

/** số màu mực thật sự dùng trong lớp In (bỏ mask/clip/defs) — QC */
export function fbgInkColors(svg: SVGSVGElement): string[] {
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
