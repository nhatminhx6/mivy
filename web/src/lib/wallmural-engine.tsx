'use client';
// Tranh dán tường (decal dán tường khổ lớn): 1 engine SVG đơn vị mm = BỐ CỤC × BẢNG MÀU × FONT → render code 100%.
// Khách nhập khổ tường (m) → bố cục tự co giãn theo tỉ lệ tường, né vùng cửa/cửa sổ (nếu khai báo).
// File in: chia tấm (khổ cuộn tối đa 1,06 / 1,2 / 1,37 m), chồng mí 2–3 cm, chừa dư mép 3 cm quanh tường,
// đánh số tấm + 1 trang sơ đồ dán. Toàn bộ hình vẽ bằng code (không AI theo yêu cầu).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { coverRect, type CVPhoto } from './canvas-engine';

export const WM_EXTRA = 30; // dư mép quanh tường (mm) — tường không vuông, thợ xén tại chỗ

// ---------- font ----------
export interface WMFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const WM_FONTS: WMFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const wmFont = (id: string) => WM_FONTS.find((f) => f.id === id) || WM_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';
export const WM_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useWMFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-wm-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-wm-fonts'; link.rel = 'stylesheet';
        link.href = WM_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...WM_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `700 40px "${SCRIPT}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 ·'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- đo chữ (canvas) ----------
let mctx: CanvasRenderingContext2D | null = null;
export function textW(s: string, family: string, weight: number, size: number, ls = 0): number {
  if (typeof document === 'undefined') return s.length * size * 0.6;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx!.font = `${weight} 100px "${family}"`;
  return (mctx!.measureText(s).width / 100) * size + ls * size * Math.max(0, [...s].length - 1);
}
function wrap(text: string, family: string, weight: number, size: number, maxW: number, ls = 0): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (!cur || textW(t, family, weight, size, ls) <= maxW) cur = t;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** chữ to nhất vừa khung (≤ maxLines dòng, ≤ maxH cao), xuống dòng cân đối */
export function fitBlock(text: string, family: string, weight: number, maxW: number, maxH: number, maxSize: number, maxLines = 3, lh = 1.15, ls = 0, minSize = 0): { size: number; lines: string[] } {
  let size = maxSize;
  for (let k = 0; k < 60; k++) {
    let lines = wrap(text, family, weight, size, maxW, ls);
    // cân dòng: thu hẹp bề rộng tới khi sắp thêm dòng → tránh 1 chữ mồ côi ở dòng cuối
    if (lines.length > 1 && lines.length <= maxLines && !text.includes('\n')) {
      let w = maxW;
      for (let j = 0; j < 12; j++) {
        const t = wrap(text, family, weight, size, w * 0.95, ls);
        if (t.length > lines.length) break;
        lines = t; w *= 0.95;
      }
    }
    const widest = Math.max(0, ...lines.map((l) => textW(l, family, weight, size, ls)));
    if (lines.length <= maxLines && lines.length * size * lh <= maxH && widest <= maxW + 0.01) return { size, lines };
    if (size <= minSize) return { size, lines };
    size = Math.max(minSize, size * 0.93);
  }
  return { size, lines: wrap(text, family, weight, size, maxW, ls) };
}

// ---------- khổ tường + chia tấm ----------
export const WM_WALLS: { id: string; name: string; w: number; h: number }[] = [
  { id: '300x240', name: '3 × 2,4 m', w: 3000, h: 2400 },
  { id: '400x270', name: '4 × 2,7 m', w: 4000, h: 2700 },
  { id: '500x300', name: '5 × 3 m', w: 5000, h: 3000 },
  { id: '240x260', name: '2,4 × 2,6 m', w: 2400, h: 2600 },
];
export const WM_ROLLS = [1060, 1200, 1370] as const;
export const WM_OVERLAPS = [20, 30] as const;

export interface WMPanel { i: number; n: number; x: number; y: number; w: number; h: number }
/** chia tường (kèm dư mép) thành n tấm dọc bằng nhau ≤ khổ cuộn, chồng mí ov */
export function wmPanels(W: number, H: number, maxW: number, ov: number, E = WM_EXTRA): WMPanel[] {
  const TW = W + 2 * E;
  const n = Math.max(1, Math.ceil((TW - ov) / (maxW - ov)));
  const pw = (TW + (n - 1) * ov) / n;
  return Array.from({ length: n }, (_, i) => ({ i, n, x: -E + i * (pw - ov), y: -E, w: pw, h: H + 2 * E }));
}

// ---------- bảng màu ----------
export interface WMPalette {
  id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; accent2: string; accent3: string;
  leaf: [string, string, string]; sky: [string, string]; ridge: [string, string, string, string]; dark?: boolean;
}
export const WM_PALETTES: WMPalette[] = [
  { id: 'cream', name: 'Kem ấm', bg: '#F3ECE0', bg2: '#E8DCC8', ink: '#2F3A2E', sub: '#6B6A55', accent: '#C9783E', accent2: '#3F6B4E', accent3: '#E2B04A', leaf: ['#2F5D44', '#4E8360', '#7FA67A'], sky: ['#F7E6CF', '#F3ECE0'], ridge: ['#D9B99A', '#C08D6A', '#94664B', '#5E4334'] },
  { id: 'charcoal', name: 'Than tối', bg: '#1F2422', bg2: '#2A312E', ink: '#F2EDE3', sub: '#B9B4A6', accent: '#D9A35B', accent2: '#5F9C78', accent3: '#E8C27A', leaf: ['#244A38', '#356B50', '#5E9A71'], sky: ['#2B3438', '#1F2422'], ridge: ['#3A4A4C', '#2E3B3D', '#232E30', '#182023'], dark: true },
  { id: 'terracotta', name: 'Đất nung', bg: '#F6E7D8', bg2: '#EBD2BB', ink: '#4A2A1C', sub: '#8A5A42', accent: '#C2552F', accent2: '#2E6E6A', accent3: '#E9A23B', leaf: ['#3D6B4F', '#5B8A5E', '#9CB07A'], sky: ['#F8D9B8', '#F6E7D8'], ridge: ['#E3A47C', '#C9734F', '#9B4F35', '#6A3424'] },
  { id: 'navy', name: 'Navy vàng', bg: '#14233D', bg2: '#1C3052', ink: '#F4F1E8', sub: '#A9B6CC', accent: '#D7B25A', accent2: '#4F8FD8', accent3: '#E9D9A6', leaf: ['#1F4A49', '#2F6A60', '#4E8C78'], sky: ['#22375A', '#14233D'], ridge: ['#2E4A73', '#253D60', '#1C304D', '#13233A'], dark: true },
  { id: 'sage', name: 'Xanh xô thơm', bg: '#E9EEE6', bg2: '#D7E1D2', ink: '#24372C', sub: '#5D7262', accent: '#B5703F', accent2: '#3E6B52', accent3: '#D9B45F', leaf: ['#2C5A43', '#4B7F5D', '#86AE85'], sky: ['#EEF2E8', '#E9EEE6'], ridge: ['#B8CBB4', '#8FAE8F', '#5F8669', '#3A5A46'] },
  { id: 'sunset', name: 'Hoàng hôn', bg: '#FCE8D5', bg2: '#F7D3B6', ink: '#3B2440', sub: '#7D5470', accent: '#E8693F', accent2: '#7A4A8C', accent3: '#F6B44A', leaf: ['#3F6E58', '#5E8E6B', '#A1B880'], sky: ['#F9B98A', '#FCE8D5'], ridge: ['#E79A86', '#C46C78', '#8D4E75', '#4E3258'] },
  { id: 'pastel', name: 'Pastel bé', bg: '#FFF6EC', bg2: '#FDE7D4', ink: '#3E4A6B', sub: '#7C86A3', accent: '#F28B82', accent2: '#7CC6B5', accent3: '#FFCF6B', leaf: ['#7CC6B5', '#A6D99A', '#C9E7A1'], sky: ['#DDF0FB', '#FFF6EC'], ridge: ['#BFE3D6', '#9FD3C4', '#7CC6B5', '#5BAA9A'] },
  { id: 'mono', name: 'Trắng đen', bg: '#F5F4F0', bg2: '#E6E4DE', ink: '#1C1C1C', sub: '#5C5C5C', accent: '#1C1C1C', accent2: '#8A8A8A', accent3: '#C8C8C8', leaf: ['#2A2A2A', '#555555', '#8A8A8A'], sky: ['#ECEBE6', '#F5F4F0'], ridge: ['#C9C8C3', '#9E9D98', '#6E6D69', '#3D3C39'] },
];
export const wmPalette = (id: string) => WM_PALETTES.find((p) => p.id === id) || WM_PALETTES[0];

// ---------- bố cục + mẫu ----------
export type WMLayout = 'tropical' | 'streetsg' | 'streethn' | 'coffee' | 'values' | 'worldmap' | 'mountain' | 'kids' | 'brand' | 'photo';
export const WM_LAYOUTS: { id: WMLayout; name: string; use: string }[] = [
  { id: 'tropical', name: 'Lá nhiệt đới', use: 'Quán cà phê, homestay' },
  { id: 'streetsg', name: 'Phố Sài Gòn nét vẽ', use: 'Quán cà phê, quán ăn' },
  { id: 'streethn', name: 'Phố cổ Hà Nội nét vẽ', use: 'Quán trà, homestay' },
  { id: 'coffee', name: 'Chữ cà phê', use: 'Quán cà phê' },
  { id: 'values', name: 'Giá trị cốt lõi', use: 'Văn phòng công ty' },
  { id: 'worldmap', name: 'Bản đồ chấm', use: 'Văn phòng, công ty du lịch' },
  { id: 'mountain', name: 'Núi & mặt trời', use: 'Homestay, phòng ngủ' },
  { id: 'kids', name: 'Phòng bé', use: 'Phòng trẻ em, mầm non' },
  { id: 'brand', name: 'Logo lặp thương hiệu', use: 'Cửa hàng, quầy lễ tân' },
  { id: 'photo', name: 'Ảnh của anh chị', use: 'Ảnh gia đình, phong cảnh' },
];
export const wmLayout = (id: string) => WM_LAYOUTS.find((l) => l.id === id) || WM_LAYOUTS[0];
/** cảnh 3D: quán (bàn ghế bistro) hay văn phòng (ghế băng thấp); đồ nội thất đặt bên ít nội dung (1 = phải, -1 = trái) */
export const wmScene = (id: WMLayout): { kind: 'cafe' | 'office'; side: 1 | -1 } => ({
  kind: id === 'values' || id === 'worldmap' || id === 'brand' ? 'office' : 'cafe',
  side: id === 'kids' ? -1 : 1,
});

export interface WMObstacle { on: boolean; x: number; y: number; w: number; h: number; label: string } // mm, gốc trên-trái tường
export interface WMSpec { layout: WMLayout; palette: string; font: string; W: number; H: number; roll: number; overlap: number; obs: WMObstacle }
export interface WMTemplate { id: string; name: string; spec: Pick<WMSpec, 'layout' | 'palette' | 'font'> }
export const WM_TEMPLATES: WMTemplate[] = [
  { id: 'tropical-cream', name: 'Lá nhiệt đới · kem', spec: { layout: 'tropical', palette: 'cream', font: 'playfair' } },
  { id: 'tropical-charcoal', name: 'Lá nhiệt đới · tối', spec: { layout: 'tropical', palette: 'charcoal', font: 'montserrat' } },
  { id: 'streetsg-cream', name: 'Phố Sài Gòn · nét vẽ', spec: { layout: 'streetsg', palette: 'cream', font: 'oswald' } },
  { id: 'streethn-terracotta', name: 'Phố cổ Hà Nội', spec: { layout: 'streethn', palette: 'terracotta', font: 'playfair' } },
  { id: 'coffee-charcoal', name: 'Cà phê sáng · bảng đen', spec: { layout: 'coffee', palette: 'charcoal', font: 'oswald' } },
  { id: 'coffee-cream', name: 'Cà phê sáng · kem', spec: { layout: 'coffee', palette: 'cream', font: 'montserrat' } },
  { id: 'values-navy', name: 'Giá trị cốt lõi · navy', spec: { layout: 'values', palette: 'navy', font: 'montserrat' } },
  { id: 'values-mono', name: 'Giá trị cốt lõi · tối giản', spec: { layout: 'values', palette: 'mono', font: 'bvp' } },
  { id: 'worldmap-navy', name: 'Bản đồ chấm · navy', spec: { layout: 'worldmap', palette: 'navy', font: 'montserrat' } },
  { id: 'mountain-sunset', name: 'Núi & mặt trời', spec: { layout: 'mountain', palette: 'sunset', font: 'playfair' } },
  { id: 'kids-pastel', name: 'Phòng bé · chữ cái & thú', spec: { layout: 'kids', palette: 'pastel', font: 'bvp' } },
  { id: 'brand-terracotta', name: 'Logo lặp · đất nung', spec: { layout: 'brand', palette: 'terracotta', font: 'oswald' } },
  { id: 'photo-mono', name: 'Ảnh của anh chị', spec: { layout: 'photo', palette: 'mono', font: 'playfair' } },
];

export type WMData = Record<string, string>;
export interface WMField { key: string; label: string; ph?: string; multiline?: boolean; layouts: WMLayout[] }
const ALL: WMLayout[] = WM_LAYOUTS.map((l) => l.id);
export const WM_FIELDS: WMField[] = [
  { key: 'eyebrow', label: 'Dòng nhỏ phía trên', layouts: ['coffee'] },
  { key: 'title', label: 'Tiêu đề lớn (xuống dòng = Enter)', multiline: true, layouts: ALL.filter((l) => l !== 'photo') },
  { key: 'title', label: 'Chú thích ảnh (để trống = chỉ ảnh)', layouts: ['photo'] },
  { key: 'sub', label: 'Dòng phụ', layouts: ALL },
  { key: 'values', label: 'Giá trị (mỗi dòng: Tên | Mô tả ngắn)', multiline: true, layouts: ['values'] },
  { key: 'small', label: 'Tên quán / công ty / liên hệ', layouts: ALL.filter((l) => l !== 'kids') },
];
export const WM_SAMPLES: Record<WMLayout, WMData> = {
  tropical: { title: 'Chill giữa phố', sub: 'Uống chậm · Thở sâu · Sống xanh', small: 'AN KHANG COFFEE' },
  streetsg: { title: 'SÀI GÒN', sub: 'thương lắm những con hẻm nhỏ', small: 'Hẻm Coffee · 12 Nguyễn Huệ' },
  streethn: { title: 'HÀ NỘI', sub: 'phố cổ · mùa thu · tách trà nóng', small: 'Gác Phố Homestay' },
  coffee: { eyebrow: 'MỜI BẠN MỘT TÁCH', title: 'CÀ PHÊ SÁNG\nCHUYỆN TRÒ', sub: 'chậm lại một chút', small: 'EST. 2026' },
  values: { title: 'GIÁ TRỊ CỐT LÕI', sub: 'Mang giải pháp tốt nhất đến từng khách hàng', values: 'Tận tâm | Lắng nghe và đặt khách hàng ở trung tâm\nSáng tạo | Luôn tìm cách làm tốt hơn mỗi ngày\nChính trực | Minh bạch trong từng việc nhỏ\nĐồng đội | Cùng nhau đi xa hơn', small: 'CÔNG TY TNHH AN KHANG' },
  worldmap: { title: 'KẾT NỐI · VƯƠN XA', sub: 'Từ Việt Nam đến 20 quốc gia', small: 'AN KHANG LOGISTICS' },
  mountain: { title: 'Đi để trở về', sub: 'Đà Lạt · Sa Pa · Hà Giang', small: 'Mây Homestay' },
  kids: { title: 'Thế giới của bé', sub: 'Gia Khánh' },
  brand: { title: 'AN KHANG', sub: 'Cà phê rang xay mỗi ngày', small: 'Hotline 0909 123 456 · @ankhang.coffee' },
  photo: { title: 'Gia đình nhỏ', sub: 'Quốc Bảo & Thu Hà · 2026', small: '' },
};
export const defaultWMData = (layout: WMLayout = 'tropical'): WMData => ({ eyebrow: '', title: '', sub: '', small: '', values: WM_SAMPLES.values.values, ...WM_SAMPLES[layout] });

// ---------- tiện ích hình ----------
interface Rect { x: number; y: number; w: number; h: number }
function rng(seed: number) { let s = seed % 2147483647 || 7; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }
const f1 = (n: number) => Math.round(n * 10) / 10;

/** vùng trống lớn nhất để đặt nội dung chính (né cửa/cửa sổ) */
export function freeRect(W: number, H: number, obs: WMObstacle): Rect {
  if (!obs.on || obs.w <= 0 || obs.h <= 0) return { x: 0, y: 0, w: W, h: H };
  const pad = Math.min(W, H) * 0.03;
  const c: Rect[] = [
    { x: 0, y: 0, w: Math.max(0, obs.x - pad), h: H },
    { x: obs.x + obs.w + pad, y: 0, w: Math.max(0, W - obs.x - obs.w - pad), h: H },
    { x: 0, y: 0, w: W, h: Math.max(0, obs.y - pad) },
    { x: 0, y: obs.y + obs.h + pad, w: W, h: Math.max(0, H - obs.y - obs.h - pad) },
  ];
  // ưu tiên vùng rộng & đủ cao (nhân hệ số dáng để tránh dải quá mỏng)
  const score = (r: Rect) => r.w * r.h * Math.min(1, r.w / (r.h * 0.9)) * Math.min(1, r.h / (H * 0.6)) ** 2;
  return c.sort((a, b) => score(b) - score(a))[0];
}

function T({ x, y, s, text, family, weight, fill, anchor = 'middle', ls = 0, italic, op }: { x: number; y: number; s: number; text: string; family: string; weight: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; italic?: boolean; op?: number }) {
  return <text x={f1(x)} y={f1(y)} fontSize={f1(s)} fontFamily={`"${family}"`} fontWeight={weight} fill={fill} textAnchor={anchor} letterSpacing={ls ? f1(ls * s) : undefined} fontStyle={italic ? 'italic' : undefined} opacity={op}>{text}</text>;
}

/** khối chữ chính: tiêu đề + dòng phụ + nhỏ, canh giữa trong box. Trả về node + chiều cao thật. */
function TextStack({ box, p, f, data, align = 'middle', titleMax, ink, subInk, scriptSub = true, upper = false }: { box: Rect; p: WMPalette; f: WMFont; data: WMData; align?: 'start' | 'middle'; titleMax: number; ink?: string; subInk?: string; scriptSub?: boolean; upper?: boolean }): ReactNode {
  const title = upper ? (data.title || '').toUpperCase() : data.title || '';
  const tb = title.trim() ? fitBlock(title, f.family, f.weight, box.w, box.h * 0.62, titleMax, 3, 1.08, upper ? 0.04 : 0) : { size: 0, lines: [] };
  const subFam = scriptSub ? SCRIPT : BODY, subW = scriptSub ? 700 : 600;
  const sb = data.sub?.trim() ? fitBlock(data.sub, subFam, subW, box.w * 0.95, box.h * 0.22, Math.max(tb.size * 0.42, titleMax * 0.28), 2, 1.2) : { size: 0, lines: [] };
  const smb = data.small?.trim() ? fitBlock(data.small.toUpperCase(), BODY, 800, box.w * 0.9, box.h * 0.1, Math.max(sb.size * 0.55, titleMax * 0.12), 1, 1.2, 0.18) : { size: 0, lines: [] };
  const gap1 = tb.size * 0.35, gap2 = sb.size * 0.6;
  const hT = tb.lines.length * tb.size * 1.08, hS = sb.lines.length * sb.size * 1.2, hM = smb.lines.length * smb.size * 1.2;
  const total = hT + (hS ? gap1 + hS : 0) + (hM ? gap2 + hM : 0);
  let y = box.y + (box.h - total) / 2;
  const x = align === 'middle' ? box.x + box.w / 2 : box.x;
  const out: ReactNode[] = [];
  tb.lines.forEach((l, i) => out.push(<T key={`t${i}`} x={x} y={y + tb.size * (0.86 + i * 1.08)} s={tb.size} text={l} family={f.family} weight={f.weight} fill={ink || p.ink} anchor={align} ls={upper ? 0.04 : 0} />));
  y += hT + (hS ? gap1 : 0);
  sb.lines.forEach((l, i) => out.push(<T key={`s${i}`} x={x} y={y + sb.size * (0.9 + i * 1.2)} s={sb.size} text={l} family={subFam} weight={subW} fill={subInk || p.accent} anchor={align} />));
  y += hS + (hM ? gap2 : 0);
  smb.lines.forEach((l, i) => out.push(<T key={`m${i}`} x={x} y={y + smb.size * (0.9 + i * 1.2)} s={smb.size} text={l} family={BODY} weight={800} fill={subInk || p.sub} anchor={align} ls={0.18} />));
  return <g>{out}</g>;
}

// ---------- lá nhiệt đới ----------
function leaf(kind: number, x: number, y: number, L: number, ang: number, col: string, vein: string, bg: string, key: string, r: () => number): ReactNode {
  const tr = `translate(${f1(x)} ${f1(y)}) rotate(${f1(ang)})`;
  if (kind === 0) { // monstera: lá tim, khía hình nêm từ mép vào + lỗ nhỏ cạnh gân
    const w = L * 0.46;
    const half = (t: number) => w * 1.12 * Math.pow(Math.max(0, Math.sin(Math.PI * Math.min(1, t))), 0.75);
    const cuts: ReactNode[] = [];
    for (let k = 0; k < 6; k++) {
      const t = 0.2 + k * 0.115;
      for (const sg of [-1, 1]) {
        const te = t + 0.08, ye = sg * half(te) * 1.08, xe = L * te, dw = L * 0.016;
        const xi = L * t, yi = sg * half(t) * (0.38 + (k % 2) * 0.08);
        cuts.push(<path key={`c${k}${sg}`} d={`M${f1(xe - dw)} ${f1(ye)} L${f1(xe + dw)} ${f1(ye)} L${f1(xi)} ${f1(yi)}Z`} fill={bg} />);
        cuts.push(<path key={`v${k}${sg}`} d={`M${f1(L * (t - 0.06))} 0 L${f1(xi)} ${f1(yi)}`} stroke={vein} strokeWidth={f1(L * 0.006)} />);
        if (k > 0 && k < 5) cuts.push(<ellipse key={`h${k}${sg}`} cx={f1(L * (t - 0.05))} cy={f1(sg * half(t) * 0.24)} rx={f1(L * 0.022)} ry={f1(w * 0.05)} fill={bg} transform={`rotate(${sg * 35} ${f1(L * (t - 0.05))} ${f1(sg * half(t) * 0.24)})`} />);
      }
    }
    return (
      <g key={key} transform={tr}>
        <path d={`M0 0 C${f1(L * 0.05)} ${f1(-w * 1.3)} ${f1(L * 0.85)} ${f1(-w * 1.15)} ${f1(L)} 0 C${f1(L * 0.85)} ${f1(w * 1.15)} ${f1(L * 0.05)} ${f1(w * 1.3)} 0 0Z`} fill={col} />
        {cuts}
        <path d={`M0 0 Q${f1(L * 0.5)} ${f1(w * 0.04)} ${f1(L * 0.96)} 0`} stroke={vein} strokeWidth={f1(L * 0.012)} fill="none" />
      </g>
    );
  }
  if (kind === 1) { // lá cọ: gân cong + lá chét
    const pts: ReactNode[] = [];
    const bend = L * 0.12;
    const rib = (t: number) => ({ x: L * t, y: bend * t * t });
    for (let t = 0.1; t <= 0.98; t += 0.055) {
      const p0 = rib(t), len = L * 0.5 * Math.sin(Math.PI * Math.min(1, t * 1.05)) * (0.85 + r() * 0.25);
      for (const sg of [-1, 1]) {
        const a = (sg * 58 - 8 + r() * 10) * (Math.PI / 180);
        const ex = p0.x + Math.cos(a) * len * 0.75 + len * 0.3, ey = p0.y + Math.sin(a) * len;
        pts.push(<path key={`${t}${sg}`} d={`M${f1(p0.x)} ${f1(p0.y)} Q${f1(p0.x + (ex - p0.x) * 0.35)} ${f1(p0.y + (ey - p0.y) * 0.75)} ${f1(ex)} ${f1(ey)}`} stroke={col} strokeWidth={f1(L * 0.019)} strokeLinecap="round" fill="none" />);
      }
    }
    return <g key={key} transform={tr}>{pts}<path d={`M0 0 Q${f1(L * 0.5)} ${f1(bend * 0.25)} ${f1(L)} ${f1(bend)}`} stroke={vein} strokeWidth={f1(L * 0.014)} fill="none" /></g>;
  }
  // lá chuối dài + sọc gân xiên + rách mép
  const w = L * 0.17;
  const tears: ReactNode[] = [];
  for (let k = 0; k < 4; k++) { const t = 0.3 + r() * 0.6, sg = r() > 0.5 ? 1 : -1; tears.push(<path key={k} d={`M${f1(L * t)} ${f1(sg * w * 0.25)} L${f1(L * (t + 0.05))} ${f1(sg * w * 1.2)}`} stroke={bg} strokeWidth={f1(L * 0.012)} />); }
  const veins: ReactNode[] = [];
  for (let t = 0.12; t < 0.95; t += 0.07) for (const sg of [-1, 1]) veins.push(<path key={`${t}${sg}`} d={`M${f1(L * t)} 0 L${f1(L * (t + 0.08))} ${f1(sg * w * 0.9)}`} stroke={vein} strokeWidth={f1(L * 0.004)} opacity={0.6} />);
  return (
    <g key={key} transform={tr}>
      <path d={`M0 0 C${f1(L * 0.2)} ${f1(-w * 1.3)} ${f1(L * 0.85)} ${f1(-w * 1.1)} ${f1(L)} 0 C${f1(L * 0.85)} ${f1(w * 1.1)} ${f1(L * 0.2)} ${f1(w * 1.3)} 0 0Z`} fill={col} />
      {veins}{tears}
      <path d={`M0 0 L${f1(L * 0.97)} 0`} stroke={vein} strokeWidth={f1(L * 0.01)} />
    </g>
  );
}
function Tropical({ W, H, p, f, data, free }: Ctx) {
  const r = rng(11);
  const s = Math.min(W, H);
  const nodes: ReactNode[] = [];
  // các chùm lá mọc từ mép trái/phải/góc, hướng vào trong; lá sau đậm, lá trước sáng
  const anchors: [number, number, number][] = [];
  const nSide = Math.max(2, Math.round(H / (s * 0.42)));
  for (let k = 0; k < nSide; k++) {
    const y = H * (0.05 + (0.9 * k) / Math.max(1, nSide - 1));
    anchors.push([-s * 0.04, y, -25 + (k / Math.max(1, nSide - 1)) * 50]);
    anchors.push([W + s * 0.04, y, 180 + 25 - (k / Math.max(1, nSide - 1)) * 50]);
  }
  const nTop = Math.max(1, Math.round(W / (s * 0.9)));
  for (let k = 0; k < nTop; k++) {
    const x = W * ((k + 0.5) / nTop);
    anchors.push([x, -s * 0.05, 90 + (r() - 0.5) * 50]);
    anchors.push([x + s * 0.2, H + s * 0.05, -90 + (r() - 0.5) * 50]);
  }
  const layers = [0, 1, 2];
  for (const layer of layers) {
    anchors.forEach(([x, y, a], k) => {
      const kind = (k + layer) % 3;
      const L = s * (0.34 + r() * 0.22) * (layer === 2 ? 0.85 : 1);
      const ang = a + (r() - 0.5) * 40 + (layer - 1) * 14;
      nodes.push(leaf(kind, x + (r() - 0.5) * s * 0.08, y + (r() - 0.5) * s * 0.08, L, ang, p.leaf[layer], p.dark ? '#00000055' : '#FFFFFF66', p.bg, `l${layer}-${k}`, r));
    });
  }
  // khung chữ (nền đặc bo góc) ở vùng trống
  const bw = Math.min(free.w * 0.62, s * 1.15), bh = Math.min(free.h * 0.5, bw * 0.62);
  const box = { x: free.x + (free.w - bw) / 2, y: free.y + Math.max(free.h * 0.06, free.h * 0.42 - bh / 2), w: bw, h: bh };
  return (
    <g>
      {nodes}
      <rect x={f1(box.x)} y={f1(box.y)} width={f1(box.w)} height={f1(box.h)} rx={f1(bh * 0.08)} fill={p.bg} opacity={0.94} />
      <rect x={f1(box.x + bh * 0.04)} y={f1(box.y + bh * 0.04)} width={f1(box.w - bh * 0.08)} height={f1(box.h - bh * 0.08)} rx={f1(bh * 0.06)} fill="none" stroke={p.accent} strokeWidth={f1(s * 0.003)} />
      <TextStack box={{ x: box.x + bw * 0.08, y: box.y + bh * 0.1, w: bw * 0.84, h: bh * 0.8 }} p={p} f={f} data={data} titleMax={bh * 0.3} />
    </g>
  );
}

// ---------- phố nét vẽ (Sài Gòn / Hà Nội) ----------
function Street({ W, H, p, f, data, free, hn }: Ctx & { hn: boolean }) {
  const r = rng(hn ? 23 : 31);
  const ground = H * 0.9, sw = Math.max(5, H * 0.0045), ink = p.ink;
  const nodes: ReactNode[] = [];
  const titleBottom = H * 0.34;
  let x = -H * 0.05;
  let k = 0;
  const poles: number[] = [];
  while (x < W + H * 0.05) {
    const w = H * (hn ? 0.2 : 0.18) * (0.85 + r() * 0.5);
    const floors = hn ? 1 + Math.round(r()) : 2 + Math.floor(r() * 3);
    const fh = H * (hn ? 0.15 : 0.12);
    const top = Math.max(titleBottom + H * 0.04, ground - floors * fh - H * 0.06);
    const fill = [p.bg2, p.bg, p.bg2][k % 3];
    const g: ReactNode[] = [];
    g.push(<rect key="f" x={f1(x)} y={f1(top)} width={f1(w)} height={f1(ground - top)} fill={fill} stroke={ink} strokeWidth={f1(sw)} />);
    if (hn) { // mái ngói 2 tầng + nét ngói
      const rh = H * 0.07;
      g.push(<path key="roof" d={`M${f1(x - w * 0.08)} ${f1(top)} L${f1(x + w * 0.12)} ${f1(top - rh)} L${f1(x + w * 0.88)} ${f1(top - rh)} L${f1(x + w * 1.08)} ${f1(top)}Z`} fill={p.accent} fillOpacity={0.55} stroke={ink} strokeWidth={f1(sw)} />);
      for (let t = 0.18; t < 0.9; t += 0.09) g.push(<line key={`tile${t}`} x1={f1(x + w * t)} y1={f1(top - rh * 0.95)} x2={f1(x + w * (t - 0.06))} y2={f1(top - rh * 0.05)} stroke={ink} strokeWidth={f1(sw * 0.5)} />);
    } else { // tường chắn mái + bồn nước
      g.push(<rect key="par" x={f1(x - w * 0.02)} y={f1(top - H * 0.018)} width={f1(w * 1.04)} height={f1(H * 0.018)} fill={fill} stroke={ink} strokeWidth={f1(sw)} />);
      if (r() > 0.45) g.push(<g key="tank"><rect x={f1(x + w * 0.62)} y={f1(top - H * 0.07)} width={f1(w * 0.22)} height={f1(H * 0.05)} rx={f1(H * 0.01)} fill={p.bg} stroke={ink} strokeWidth={f1(sw)} /><line x1={f1(x + w * 0.66)} y1={f1(top - H * 0.02)} x2={f1(x + w * 0.66)} y2={f1(top - H * 0.018)} stroke={ink} strokeWidth={f1(sw)} /></g>);
    }
    // từng tầng: cửa sổ + lan can
    for (let fl = 0; fl < floors; fl++) {
      const fy = ground - (fl + 1) * fh;
      if (fy < top) break;
      if (fl === 0) { // tầng trệt: cửa cuốn / cửa gỗ + mái hiên
        const dw = w * 0.62;
        g.push(<rect key={`d${fl}`} x={f1(x + (w - dw) / 2)} y={f1(fy + fh * 0.28)} width={f1(dw)} height={f1(fh * 0.72)} fill="none" stroke={ink} strokeWidth={f1(sw)} />);
        for (let t = 0.36; t < 1; t += 0.12) g.push(<line key={`dl${t}`} x1={f1(x + (w - dw) / 2)} y1={f1(fy + fh * t)} x2={f1(x + (w + dw) / 2)} y2={f1(fy + fh * t)} stroke={ink} strokeWidth={f1(sw * 0.4)} />);
        const aw = r() > 0.4;
        if (aw) { // mái hiên sọc
          const ay = fy + fh * 0.12;
          g.push(<path key="awn" d={`M${f1(x + w * 0.04)} ${f1(ay)} L${f1(x + w * 0.96)} ${f1(ay)} L${f1(x + w * 1.02)} ${f1(ay + fh * 0.16)} L${f1(x - w * 0.02)} ${f1(ay + fh * 0.16)}Z`} fill={k % 2 ? p.accent : p.accent2} fillOpacity={0.8} stroke={ink} strokeWidth={f1(sw)} />);
        } else { // biển hiệu trống chữ (chỉ khối)
          g.push(<rect key="sign" x={f1(x + w * 0.18)} y={f1(fy + fh * 0.06)} width={f1(w * 0.64)} height={f1(fh * 0.16)} fill={p.accent3} fillOpacity={0.75} stroke={ink} strokeWidth={f1(sw)} />);
        }
      } else {
        const nwin = w > H * 0.2 ? 3 : 2;
        const ww = (w * 0.7) / nwin;
        for (let j = 0; j < nwin; j++) {
          const wx = x + w * 0.15 + j * ww + ww * 0.12, wy = fy + fh * 0.18;
          if (hn) g.push(<g key={`w${fl}${j}`}><rect x={f1(wx)} y={f1(wy)} width={f1(ww * 0.76)} height={f1(fh * 0.5)} fill={p.accent2} fillOpacity={0.35} stroke={ink} strokeWidth={f1(sw)} /><line x1={f1(wx + ww * 0.38)} y1={f1(wy)} x2={f1(wx + ww * 0.38)} y2={f1(wy + fh * 0.5)} stroke={ink} strokeWidth={f1(sw * 0.6)} /></g>);
          else g.push(<g key={`w${fl}${j}`}><path d={`M${f1(wx)} ${f1(wy + fh * 0.5)} L${f1(wx)} ${f1(wy + ww * 0.38)} A${f1(ww * 0.38)} ${f1(ww * 0.38)} 0 0 1 ${f1(wx + ww * 0.76)} ${f1(wy + ww * 0.38)} L${f1(wx + ww * 0.76)} ${f1(wy + fh * 0.5)}Z`} fill="none" stroke={ink} strokeWidth={f1(sw)} /></g>);
        }
        // ban công lan can
        const by = fy + fh * 0.72;
        g.push(<line key={`b${fl}`} x1={f1(x + w * 0.06)} y1={f1(by)} x2={f1(x + w * 0.94)} y2={f1(by)} stroke={ink} strokeWidth={f1(sw)} />);
        for (let t = 0.1; t < 0.94; t += 0.06) g.push(<line key={`bb${fl}${t}`} x1={f1(x + w * t)} y1={f1(by)} x2={f1(x + w * t)} y2={f1(fy + fh)} stroke={ink} strokeWidth={f1(sw * 0.45)} />);
        if (!hn && r() > 0.5) { // chậu cây ban công
          const px = x + w * (0.2 + r() * 0.5);
          g.push(<g key={`pl${fl}`}><circle cx={f1(px)} cy={f1(by - fh * 0.08)} r={f1(fh * 0.09)} fill={p.leaf[1]} stroke={ink} strokeWidth={f1(sw * 0.6)} /><circle cx={f1(px + fh * 0.1)} cy={f1(by - fh * 0.05)} r={f1(fh * 0.07)} fill={p.leaf[2]} stroke={ink} strokeWidth={f1(sw * 0.6)} /></g>);
        }
      }
    }
    if (hn) { // đèn lồng treo dưới mái
      const ly = top + H * 0.012;
      for (const t of [0.22, 0.78]) {
        const lx = x + w * t;
        g.push(<g key={`lan${t}`}><line x1={f1(lx)} y1={f1(top)} x2={f1(lx)} y2={f1(ly + H * 0.012)} stroke={ink} strokeWidth={f1(sw * 0.5)} /><ellipse cx={f1(lx)} cy={f1(ly + H * 0.03)} rx={f1(H * 0.016)} ry={f1(H * 0.022)} fill={k % 2 ? p.accent : p.accent3} stroke={ink} strokeWidth={f1(sw * 0.6)} /></g>);
      }
    }
    nodes.push(<g key={`h${k}`}>{g}</g>);
    if (!hn && k % 3 === 1) poles.push(x + w);
    x += w; k++;
  }
  // cột điện + dây điện võng (Sài Gòn)
  if (!hn) {
    const ptop = H * 0.4;
    poles.forEach((px, i) => {
      nodes.push(<g key={`pole${i}`}><line x1={f1(px)} y1={f1(ground)} x2={f1(px)} y2={f1(ptop)} stroke={ink} strokeWidth={f1(sw * 1.6)} /><line x1={f1(px - H * 0.03)} y1={f1(ptop + H * 0.02)} x2={f1(px + H * 0.03)} y2={f1(ptop + H * 0.02)} stroke={ink} strokeWidth={f1(sw)} /></g>);
    });
    const pts = [-H * 0.05, ...poles, W + H * 0.05];
    for (let i = 0; i + 1 < pts.length; i++) for (let j = 0; j < 4; j++) {
      const a = pts[i], b = pts[i + 1], y0 = ptop + H * 0.02 + j * H * 0.012;
      nodes.push(<path key={`wire${i}-${j}`} d={`M${f1(a)} ${f1(y0)} Q${f1((a + b) / 2)} ${f1(y0 + H * (0.035 + j * 0.008))} ${f1(b)} ${f1(y0)}`} fill="none" stroke={ink} strokeWidth={f1(sw * 0.45)} />);
    }
  } else { // dây đèn lồng băng ngang phố
    for (let i = 0; i < 2; i++) {
      const y0 = titleBottom + H * (0.06 + i * 0.05);
      nodes.push(<path key={`str${i}`} d={`M0 ${f1(y0)} Q${f1(W / 2)} ${f1(y0 + H * 0.06)} ${f1(W)} ${f1(y0)}`} fill="none" stroke={ink} strokeWidth={f1(sw * 0.5)} />);
      const n = Math.round(W / (H * 0.12));
      for (let j = 1; j < n; j++) {
        const t = j / n, lx = W * t, ly = y0 + H * 0.06 * 4 * t * (1 - t) * 0.5 * 2;
        nodes.push(<ellipse key={`sl${i}-${j}`} cx={f1(lx)} cy={f1(ly + H * 0.018)} rx={f1(H * 0.011)} ry={f1(H * 0.015)} fill={[p.accent, p.accent3, p.accent2][(i + j) % 3]} stroke={ink} strokeWidth={f1(sw * 0.4)} />);
      }
    }
  }
  // mặt đất + vỉa hè
  nodes.push(<line key="gr" x1={-WM_EXTRA} y1={f1(ground)} x2={W + WM_EXTRA} y2={f1(ground)} stroke={ink} strokeWidth={f1(sw * 1.6)} />);
  for (let t = 0; t < W; t += H * 0.08) nodes.push(<line key={`pv${t}`} x1={f1(t)} y1={f1(ground + H * 0.03)} x2={f1(t + H * 0.04)} y2={f1(ground + H * 0.03)} stroke={ink} strokeWidth={f1(sw * 0.5)} />);
  // mặt trời + chim trên trời
  const sunR = H * 0.07, sunY = H * 0.17;
  const tx0 = free.x + Math.min(free.w * 0.08, H * 0.12);
  const sunX = Math.max(W - H * 0.22, tx0 + free.w * 0.6 + sunR * 1.5);
  const titleBox = { x: tx0, y: H * 0.05, w: Math.max(free.w * 0.5, Math.min(free.w * 0.84, W * 0.62, sunX - sunR * 4.2 - tx0)), h: titleBottom - H * 0.07 };
  return (
    <g>
      <circle cx={f1(sunX)} cy={f1(sunY)} r={f1(sunR)} fill={p.accent3} opacity={0.8} />
      {[0, 1, 2].map((i) => { const bx = sunX - sunR * (2.2 + i * 0.9), by = sunY + sunR * (0.2 - i * 0.35); return <path key={`bird${i}`} d={`M${f1(bx - H * 0.018)} ${f1(by - H * 0.01)} Q${f1(bx - H * 0.008)} ${f1(by - H * 0.016)} ${f1(bx)} ${f1(by)} Q${f1(bx + H * 0.008)} ${f1(by - H * 0.016)} ${f1(bx + H * 0.018)} ${f1(by - H * 0.01)}`} fill="none" stroke={ink} strokeWidth={f1(sw)} />; })}
      {nodes}
      <TextStack box={titleBox} p={p} f={f} data={data} align="start" titleMax={titleBox.h * 0.55} upper={!hn} />
    </g>
  );
}

// ---------- chữ cà phê ----------
function bean(x: number, y: number, s: number, a: number, col: string, line: string, key: string) {
  return (
    <g key={key} transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(a)})`}>
      <ellipse rx={f1(s)} ry={f1(s * 0.68)} fill={col} />
      <path d={`M${f1(-s * 0.85)} 0 C${f1(-s * 0.3)} ${f1(-s * 0.35)} ${f1(s * 0.3)} ${f1(s * 0.35)} ${f1(s * 0.85)} 0`} fill="none" stroke={line} strokeWidth={f1(s * 0.12)} strokeLinecap="round" />
    </g>
  );
}
function cup(x: number, y: number, s: number, ink: string, sw: number, key: string) {
  return (
    <g key={key} transform={`translate(${f1(x)} ${f1(y)})`} fill="none" stroke={ink} strokeWidth={f1(sw)} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${f1(-s * 0.5)} ${f1(-s * 0.2)} L${f1(-s * 0.42)} ${f1(s * 0.45)} Q${f1(0)} ${f1(s * 0.62)} ${f1(s * 0.42)} ${f1(s * 0.45)} L${f1(s * 0.5)} ${f1(-s * 0.2)}Z`} />
      <path d={`M${f1(s * 0.48)} ${f1(-s * 0.05)} Q${f1(s * 0.85)} ${f1(-s * 0.05)} ${f1(s * 0.75)} ${f1(s * 0.22)} Q${f1(s * 0.65)} ${f1(s * 0.38)} ${f1(s * 0.43)} ${f1(s * 0.33)}`} />
      <path d={`M${f1(-s * 0.75)} ${f1(s * 0.62)} L${f1(s * 0.85)} ${f1(s * 0.62)}`} />
      {[-0.2, 0.05, 0.3].map((t, i) => <path key={i} d={`M${f1(s * t)} ${f1(-s * 0.35)} q${f1(s * 0.12)} ${f1(-s * 0.15)} 0 ${f1(-s * 0.3)} q${f1(-s * 0.12)} ${f1(-s * 0.15)} 0 ${f1(-s * 0.3)}`} />)}
    </g>
  );
}
function Coffee({ W, H, p, f, data, free }: Ctx) {
  const r = rng(5);
  const s = Math.min(W, H);
  const sw = s * 0.004;
  const bw = free.w * 0.74, bh = free.h * 0.56;
  const box = { x: free.x + (free.w - bw) / 2, y: free.y + free.h * 0.07, w: bw, h: bh };
  const titleLines = (data.title || '').toUpperCase().split('\n').map((l) => l.trim()).filter(Boolean);
  // mỗi dòng tiêu đề co riêng cho vừa bề rộng (kiểu chữ tường "typography wall")
  const eb = data.eyebrow?.trim() ? fitBlock(data.eyebrow.toUpperCase(), BODY, 800, bw * 0.7, bh * 0.08, bh * 0.06, 1, 1.2, 0.3) : { size: 0, lines: [] };
  const per = titleLines.map((l) => Math.min(bh * 0.34, (bw * 0.96) / textW(l, f.family, f.weight, 1, 0.02)));
  const sb = data.sub?.trim() ? fitBlock(data.sub, SCRIPT, 700, bw * 0.8, bh * 0.2, bh * 0.16, 1) : { size: 0, lines: [] };
  const sm = data.small?.trim() ? data.small.toUpperCase() : '';
  const hTitle = per.reduce((a, b) => a + b * 1.02, 0);
  const total = (eb.size ? eb.size * 2 : 0) + hTitle + (sb.size ? sb.size * 1.5 : 0);
  const k = total > bh ? bh / total : 1;
  let y = box.y + (bh - total * k) / 2;
  const cx = box.x + bw / 2;
  const out: ReactNode[] = [];
  if (eb.size) {
    const es = eb.size * k, ew = textW(eb.lines[0], BODY, 800, es, 0.3);
    out.push(<T key="eb" x={cx} y={y + es} s={es} text={eb.lines[0]} family={BODY} weight={800} fill={p.accent} ls={0.3} />);
    out.push(<line key="ebl" x1={f1(cx - ew / 2 - es * 3)} y1={f1(y + es * 0.62)} x2={f1(cx - ew / 2 - es * 0.8)} y2={f1(y + es * 0.62)} stroke={p.accent} strokeWidth={f1(sw)} />);
    out.push(<line key="ebr" x1={f1(cx + ew / 2 + es * 0.8)} y1={f1(y + es * 0.62)} x2={f1(cx + ew / 2 + es * 3)} y2={f1(y + es * 0.62)} stroke={p.accent} strokeWidth={f1(sw)} />);
    y += es * 2;
  }
  titleLines.forEach((l, i) => { const ts = per[i] * k; out.push(<T key={`tl${i}`} x={cx} y={y + ts * 0.88} s={ts} text={l} family={f.family} weight={f.weight} fill={i % 2 ? p.accent : p.ink} ls={0.02} />); y += ts * 1.02; });
  if (sb.size) { const ss = sb.size * k; out.push(<T key="sb" x={cx} y={y + ss * 1.05} s={ss} text={sb.lines[0]} family={SCRIPT} weight={700} fill={p.sub} />); }
  // hạt cà phê rải quanh, né khung chữ
  // huy hiệu EST góc + ly cà phê nét vẽ
  const bR = s * 0.09;
  const bX = free.x + free.w - bR * 1.6, bY = free.y + bR * 1.6;
  const cupX = free.x + s * 0.16, cupY = free.y + free.h - s * 0.2;
  const beans: ReactNode[] = [];
  const pad = s * 0.08;
  for (let i = 0; i < 160 && beans.length < Math.round((W * H) / (s * s) * 14); i++) {
    const bx = r() * W, by = r() * H;
    if (bx > box.x - pad && bx < box.x + bw + pad && by > box.y - pad && by < box.y + bh + pad) continue;
    if (Math.hypot(bx - bX, by - bY) < bR * 1.5 || Math.hypot(bx - cupX, by - cupY) < s * 0.2) continue;
        beans.push(bean(bx, by, s * (0.018 + r() * 0.012), r() * 180, p.accent, p.bg, `bn${i}`));
  }
  const smS = sm ? Math.min(bR * 0.34, (bR * 1.5) / textW(sm, BODY, 800, 1, 0.1)) : 0;
  return (
    <g>
      {beans}
      {cup(cupX, cupY, s * 0.16, p.ink, sw * 1.4, 'cup')}
      <g>
        <circle cx={f1(bX)} cy={f1(bY)} r={f1(bR)} fill="none" stroke={p.accent} strokeWidth={f1(sw * 1.2)} />
        <circle cx={f1(bX)} cy={f1(bY)} r={f1(bR * 0.86)} fill="none" stroke={p.accent} strokeWidth={f1(sw * 0.6)} strokeDasharray={`${f1(sw * 2)} ${f1(sw * 2)}`} />
        {sm && <T x={bX} y={bY + smS * 0.35} s={smS} text={sm} family={BODY} weight={800} fill={p.accent} ls={0.1} />}
      </g>
      {out}
    </g>
  );
}

// ---------- giá trị cốt lõi ----------
const ICONS = [
  (s: number, c: string, sw: number) => <path d={`M0 ${f1(-s * 0.5)} L${f1(s * 0.15)} ${f1(-s * 0.15)} L${f1(s * 0.5)} ${f1(-s * 0.12)} L${f1(s * 0.22)} ${f1(s * 0.12)} L${f1(s * 0.3)} ${f1(s * 0.5)} L0 ${f1(s * 0.3)} L${f1(-s * 0.3)} ${f1(s * 0.5)} L${f1(-s * 0.22)} ${f1(s * 0.12)} L${f1(-s * 0.5)} ${f1(-s * 0.12)} L${f1(-s * 0.15)} ${f1(-s * 0.15)}Z`} fill="none" stroke={c} strokeWidth={f1(sw)} strokeLinejoin="round" />,
  (s: number, c: string, sw: number) => <g fill="none" stroke={c} strokeWidth={f1(sw)} strokeLinecap="round"><path d={`M${f1(-s * 0.25)} ${f1(s * 0.2)} A${f1(s * 0.32)} ${f1(s * 0.32)} 0 1 1 ${f1(s * 0.25)} ${f1(s * 0.2)} L${f1(s * 0.18)} ${f1(s * 0.38)} L${f1(-s * 0.18)} ${f1(s * 0.38)}Z`} /><path d={`M${f1(-s * 0.14)} ${f1(s * 0.5)} L${f1(s * 0.14)} ${f1(s * 0.5)}`} /></g>,
  (s: number, c: string, sw: number) => <path d={`M0 ${f1(-s * 0.5)} L${f1(s * 0.42)} ${f1(-s * 0.32)} L${f1(s * 0.38)} ${f1(s * 0.1)} Q${f1(s * 0.3)} ${f1(s * 0.38)} 0 ${f1(s * 0.52)} Q${f1(-s * 0.3)} ${f1(s * 0.38)} ${f1(-s * 0.38)} ${f1(s * 0.1)} L${f1(-s * 0.42)} ${f1(-s * 0.32)}Z M${f1(-s * 0.16)} 0 L${f1(-s * 0.03)} ${f1(s * 0.14)} L${f1(s * 0.2)} ${f1(-s * 0.12)}`} fill="none" stroke={c} strokeWidth={f1(sw)} strokeLinejoin="round" strokeLinecap="round" />,
  (s: number, c: string, sw: number) => <g fill="none" stroke={c} strokeWidth={f1(sw)}><circle cx={f1(-s * 0.18)} cy={f1(-s * 0.18)} r={f1(s * 0.14)} /><circle cx={f1(s * 0.18)} cy={f1(-s * 0.18)} r={f1(s * 0.14)} /><path d={`M${f1(-s * 0.46)} ${f1(s * 0.42)} Q${f1(-s * 0.42)} ${f1(s * 0.02)} ${f1(-s * 0.18)} ${f1(s * 0.02)} Q${f1(0)} ${f1(s * 0.02)} ${f1(s * 0.05)} ${f1(s * 0.2)}`} /><path d={`M${f1(s * 0.46)} ${f1(s * 0.42)} Q${f1(s * 0.42)} ${f1(s * 0.02)} ${f1(s * 0.18)} ${f1(s * 0.02)} Q${f1(0)} ${f1(s * 0.02)} ${f1(-s * 0.05)} ${f1(s * 0.2)}`} /></g>,
  (s: number, c: string, sw: number) => <path d={`M0 ${f1(s * 0.45)} C${f1(-s * 0.6)} ${f1(s * 0.05)} ${f1(-s * 0.45)} ${f1(-s * 0.5)} 0 ${f1(-s * 0.2)} C${f1(s * 0.45)} ${f1(-s * 0.5)} ${f1(s * 0.6)} ${f1(s * 0.05)} 0 ${f1(s * 0.45)}Z`} fill="none" stroke={c} strokeWidth={f1(sw)} strokeLinejoin="round" />,
  (s: number, c: string, sw: number) => <g fill="none" stroke={c} strokeWidth={f1(sw)} strokeLinejoin="round"><path d={`M0 ${f1(-s * 0.52)} Q${f1(s * 0.3)} ${f1(-s * 0.25)} ${f1(s * 0.16)} ${f1(s * 0.28)} L${f1(-s * 0.16)} ${f1(s * 0.28)} Q${f1(-s * 0.3)} ${f1(-s * 0.25)} 0 ${f1(-s * 0.52)}Z`} /><circle cy={f1(-s * 0.12)} r={f1(s * 0.08)} /><path d={`M${f1(-s * 0.16)} ${f1(s * 0.1)} L${f1(-s * 0.32)} ${f1(s * 0.38)} L${f1(-s * 0.12)} ${f1(s * 0.3)} M${f1(s * 0.16)} ${f1(s * 0.1)} L${f1(s * 0.32)} ${f1(s * 0.38)} L${f1(s * 0.12)} ${f1(s * 0.3)}`} /></g>,
];
export const parseValues = (v: string) => (v || '').split('\n').map((l) => l.split('|').map((x) => x.trim())).filter((a) => a[0]).slice(0, 6).map(([name, desc]) => ({ name, desc: desc || '' }));
function Values({ W, H, p, f, data, free, logo }: Ctx) {
  const s = Math.min(W, H);
  const vals = parseValues(data.values);
  const m = s * 0.07;
  const area = { x: free.x + m, y: free.y + m, w: free.w - m * 2, h: free.h - m * 2 };
  const head = { x: area.x, y: area.y, w: area.w, h: area.h * 0.3 };
  const n = Math.max(1, vals.length);
  const ar = area.w / area.h;
  const cols = ar < 0.6 ? 1 : n <= 4 && ar > 1.15 ? n : n <= 3 ? n : Math.ceil(n / 2);
  const rows = Math.ceil(n / cols);
  const gap = s * 0.035;
  const brandH = (data.small || '').trim() ? s * 0.09 : 0;
  const gy = area.y + area.h * 0.34;
  const cw = (area.w - gap * (cols - 1)) / cols, ch = Math.min((area.y + area.h - brandH - gy - gap * (rows - 1)) / rows, cw * 1.05);
  const cards: ReactNode[] = [];
  vals.forEach((v, i) => {
    const c = i % cols, rr = Math.floor(i / cols);
    const rowN = Math.min(cols, n - rr * cols);
    const x0 = area.x + (area.w - (rowN * cw + (rowN - 1) * gap)) / 2 + c * (cw + gap);
    const y0 = gy + rr * (ch + gap);
    const ir = Math.min(cw, ch) * 0.17;
    const nb = fitBlock(v.name.toUpperCase(), f.family, f.weight, cw * 0.84, ch * 0.16, ch * 0.12, 1, 1.1, 0.04);
    const db = fitBlock(v.desc, BODY, 600, cw * 0.82, ch * 0.28, Math.min(ch * 0.085, nb.size * 0.7), 3, 1.3);
    cards.push(
      <g key={i}>
        <rect x={f1(x0)} y={f1(y0)} width={f1(cw)} height={f1(ch)} rx={f1(s * 0.012)} fill={p.bg2} />
        <rect x={f1(x0)} y={f1(y0)} width={f1(cw)} height={f1(s * 0.008)} fill={p.accent} />
        <circle cx={f1(x0 + cw / 2)} cy={f1(y0 + ch * 0.28)} r={f1(ir)} fill={p.accent} />
        <g transform={`translate(${f1(x0 + cw / 2)} ${f1(y0 + ch * 0.28)})`}>{ICONS[i % ICONS.length](ir * 1.05, p.dark ? p.bg : '#FFFFFF', ir * 0.1)}</g>
        <T x={x0 + cw / 2} y={y0 + ch * 0.56} s={nb.size} text={nb.lines[0] || ''} family={f.family} weight={f.weight} fill={p.ink} ls={0.04} />
        {db.lines.map((l, j) => <T key={j} x={x0 + cw / 2} y={y0 + ch * 0.68 + j * db.size * 1.3} s={db.size} text={l} family={BODY} weight={600} fill={p.sub} />)}
      </g>,
    );
  });
  const tb = fitBlock((data.title || '').toUpperCase(), f.family, f.weight, head.w * 0.9, head.h * 0.5, head.h * 0.42, 1, 1.1, 0.06);
  const sb = data.sub?.trim() ? fitBlock(data.sub, BODY, 600, head.w * 0.8, head.h * 0.25, tb.size * 0.36, 2, 1.25) : { size: 0, lines: [] };
  const brand = (data.small || '').toUpperCase();
  const bs = brand ? Math.min(s * 0.03, (area.w * 0.6) / textW(brand, BODY, 800, 1, 0.2)) : 0;
  const lr = s * 0.045;
  return (
    <g>
      {/* hoạ tiết hình học góc */}
      <circle cx={f1(W + s * 0.05)} cy={f1(-s * 0.05)} r={f1(s * 0.32)} fill={p.accent} opacity={0.12} />
      <circle cx={f1(-s * 0.08)} cy={f1(H + s * 0.06)} r={f1(s * 0.36)} fill={p.accent2} opacity={0.12} />
      <T x={head.x + head.w / 2} y={head.y + tb.size * 0.95} s={tb.size} text={tb.lines[0] || ''} family={f.family} weight={f.weight} fill={p.ink} ls={0.06} />
      <rect x={f1(head.x + head.w / 2 - s * 0.06)} y={f1(head.y + tb.size * 1.32)} width={f1(s * 0.12)} height={f1(s * 0.008)} fill={p.accent} />
      {sb.lines.map((l, j) => <T key={j} x={head.x + head.w / 2} y={head.y + tb.size * 1.32 + s * 0.025 + sb.size * (1 + j * 1.25)} s={sb.size} text={l} family={BODY} weight={600} fill={p.sub} />)}
      {cards}
      {brand && (
        <g>
          {logo ? <image href={logo} x={f1(area.x)} y={f1(area.y + area.h - lr * 1.6)} width={f1(lr * 2)} height={f1(lr * 2)} preserveAspectRatio="xMidYMid meet" />
            : <circle cx={f1(area.x + lr * 0.55)} cy={f1(area.y + area.h - lr * 0.6)} r={f1(lr * 0.55)} fill={p.accent} />}
          <T x={area.x + (logo ? lr * 2.4 : lr * 1.5)} y={area.y + area.h - lr * 0.6 + bs * 0.35} s={bs} text={brand} family={BODY} weight={800} fill={p.ink} anchor="start" ls={0.2} />
        </g>
      )}
    </g>
  );
}

// ---------- bản đồ chấm ----------
const LAND: [number, number][][] = [
  [[-168, 65], [-140, 70], [-95, 72], [-80, 62], [-62, 58], [-55, 50], [-66, 44], [-76, 35], [-81, 25], [-90, 30], [-97, 26], [-105, 20], [-95, 16], [-83, 9], [-78, 8], [-88, 14], [-105, 22], [-112, 30], [-118, 34], [-124, 40], [-125, 49], [-135, 57], [-150, 60], [-165, 60]],
  [[-50, 60], [-42, 60], [-20, 70], [-20, 80], [-60, 82], [-70, 77], [-55, 70]],
  [[-78, 8], [-60, 10], [-50, 0], [-35, -6], [-40, -22], [-48, -28], [-58, -38], [-65, -55], [-72, -50], [-75, -40], [-72, -20], [-81, -5], [-80, 2]],
  [[-10, 36], [-9, 43], [-2, 44], [-5, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [45, 55], [40, 45], [28, 41], [23, 36], [15, 38], [12, 44], [5, 43], [-2, 37]],
  [[-6, 50], [2, 51], [-2, 57], [-5, 58], [-6, 55]],
  [[-17, 21], [-10, 30], [-5, 35], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [40, -5], [40, -15], [33, -27], [20, -35], [15, -28], [12, -15], [9, -1], [8, 4], [-8, 4], [-15, 10]],
  [[28, 41], [40, 45], [45, 55], [40, 67], [60, 70], [80, 73], [105, 78], [140, 72], [170, 68], [180, 65], [160, 58], [140, 50], [130, 42], [122, 40], [122, 30], [110, 20], [108, 12], [104, 8], [100, 14], [98, 8], [95, 16], [90, 22], [80, 15], [77, 8], [72, 20], [66, 25], [57, 25], [52, 30], [48, 30], [43, 13], [35, 28], [36, 36]],
  [[130, 31], [141, 36], [142, 44], [140, 41], [135, 34]],
  [[95, 5], [105, -6], [102, -6], [95, 2]],
  [[109, 1], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[131, -1], [141, -3], [150, -10], [141, -9], [132, -4]],
  [[113, -22], [122, -17], [131, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [140, -38], [131, -31], [115, -34], [114, -26]],
  [[44, -25], [50, -15], [49, -12], [44, -17]],
  [[120, 18], [122, 18], [126, 7], [122, 7]],
];
function inPoly(x: number, y: number, poly: [number, number][]) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
function WorldMap({ W, H, p, f, data, free }: Ctx) {
  const s = Math.min(W, H);
  const head = free.h * 0.26;
  const mapBox = { x: free.x + free.w * 0.05, y: free.y + head, w: free.w * 0.9, h: free.h - head - s * 0.05 };
  // khung bản đồ tỉ lệ 2:1 (kinh độ -170..190 × vĩ độ 80..-58)
  let mw = mapBox.w, mh = mw / 2.4;
  if (mh > mapBox.h) { mh = mapBox.h; mw = mh * 2.4; }
  const mx = mapBox.x + (mapBox.w - mw) / 2, my = mapBox.y + (mapBox.h - mh) / 2;
  const cols = Math.max(60, Math.min(140, Math.round(mw / (s * 0.018))));
  const pitch = mw / cols;
  const rows = Math.round(mh / pitch);
  const toXY = (lon: number, lat: number) => ({ x: mx + ((lon + 170) / 360) * mw, y: my + ((80 - lat) / 138) * mh });
  const dots: ReactNode[] = [];
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const lon = -170 + ((i + 0.5) / cols) * 360, lat = 80 - ((j + 0.5) / rows) * 138;
    if (LAND.some((pl) => inPoly(lon, lat, pl))) dots.push(<circle key={`${i}-${j}`} cx={f1(mx + (i + 0.5) * pitch)} cy={f1(my + (j + 0.5) * pitch)} r={f1(pitch * 0.3)} fill={p.sub} opacity={0.75} />);
  }
  const vn = toXY(106, 16);
  const cities = [[139.7, 35.7], [2.35, 48.8], [-74, 40.7], [151, -33.9], [55.3, 25.2], [-0.1, 51.5]];
  const arcs = cities.map(([lon, lat], i) => {
    const c = toXY(lon, lat);
    const mxp = (vn.x + c.x) / 2, myp = Math.min(vn.y, c.y) - Math.abs(vn.x - c.x) * 0.22;
    return (
      <g key={`arc${i}`}>
        <path d={`M${f1(vn.x)} ${f1(vn.y)} Q${f1(mxp)} ${f1(myp)} ${f1(c.x)} ${f1(c.y)}`} fill="none" stroke={p.accent} strokeWidth={f1(pitch * 0.18)} strokeDasharray={`${f1(pitch * 0.6)} ${f1(pitch * 0.4)}`} />
        <circle cx={f1(c.x)} cy={f1(c.y)} r={f1(pitch * 0.45)} fill={p.accent} />
      </g>
    );
  });
  const tb = fitBlock((data.title || '').toUpperCase(), f.family, f.weight, free.w * 0.8, head * 0.45, head * 0.4, 1, 1.1, 0.06);
  const sb = data.sub?.trim() ? fitBlock(data.sub, BODY, 600, free.w * 0.7, head * 0.2, tb.size * 0.36, 1) : { size: 0, lines: [] };
  const brand = (data.small || '').toUpperCase();
  const bs = brand ? Math.min(s * 0.026, (free.w * 0.5) / textW(brand, BODY, 800, 1, 0.22)) : 0;
  const cx = free.x + free.w / 2, ty = free.y + head * 0.2;
  return (
    <g>
      {dots}{arcs}
      <circle cx={f1(vn.x)} cy={f1(vn.y)} r={f1(pitch * 2.2)} fill={p.accent} opacity={0.2} />
      <circle cx={f1(vn.x)} cy={f1(vn.y)} r={f1(pitch * 1.3)} fill={p.accent} opacity={0.35} />
      <circle cx={f1(vn.x)} cy={f1(vn.y)} r={f1(pitch * 0.7)} fill={p.accent} />
      <T x={cx} y={ty + tb.size * 0.9} s={tb.size} text={tb.lines[0] || ''} family={f.family} weight={f.weight} fill={p.ink} ls={0.06} />
      {sb.lines[0] && <T x={cx} y={ty + tb.size * 1.1 + sb.size * 1.3} s={sb.size} text={sb.lines[0]} family={BODY} weight={600} fill={p.accent} />}
      {brand && <T x={cx} y={free.y + free.h - s * 0.035} s={bs} text={brand} family={BODY} weight={800} fill={p.sub} ls={0.22} />}
    </g>
  );
}

// ---------- núi & mặt trời ----------
function Mountain({ W, H, p, f, data, free, uid }: Ctx) {
  const r = rng(17);
  const s = Math.min(W, H);
  const ridges: ReactNode[] = [];
  const N = 4;
  for (let k = 0; k < N; k++) {
    const base = H * (0.5 + k * 0.12);
    const amp = H * (0.16 - k * 0.025);
    const segs = 9 + k * 3;
    let d = `M${-WM_EXTRA} ${f1(H + WM_EXTRA)} L${-WM_EXTRA} ${f1(base)}`;
    const ph = r() * 6;
    for (let i = 0; i <= segs; i++) {
      const x = -WM_EXTRA + ((W + WM_EXTRA * 2) * i) / segs;
      const y = base - amp * (0.5 + 0.5 * Math.sin(i * 1.3 + ph)) * (0.6 + r() * 0.5);
      d += ` L${f1(x)} ${f1(y)}`;
    }
    d += ` L${f1(W + WM_EXTRA)} ${f1(H + WM_EXTRA)}Z`;
    ridges.push(<path key={k} d={d} fill={p.ridge[k]} strokeLinejoin="round" />);
  }
  const sunR = s * 0.16;
  const tx0 = free.x + free.w * 0.06;
  const sunX = Math.min(W - sunR * 0.8, Math.max(W * 0.7, tx0 + Math.min(free.w * 0.5, s * 1.1) + sunR * 1.4)), sunY = H * 0.38;
  const birds = Array.from({ length: 5 }, (_, i) => {
    const bx = sunX - sunR * (1.6 + i * 0.5 + r() * 0.3), by = sunY - sunR * (0.9 + r() * 0.8), bs = s * (0.018 + r() * 0.01);
    return <path key={`b${i}`} d={`M${f1(bx - bs)} ${f1(by - bs * 0.4)} Q${f1(bx - bs * 0.4)} ${f1(by - bs * 0.8)} ${f1(bx)} ${f1(by)} Q${f1(bx + bs * 0.4)} ${f1(by - bs * 0.8)} ${f1(bx + bs)} ${f1(by - bs * 0.4)}`} fill="none" stroke={p.ink} strokeWidth={f1(s * 0.003)} />;
  });
  const box = { x: tx0, y: H * 0.07, w: Math.max(free.w * 0.4, Math.min(free.w * 0.88, sunX - sunR * 1.3 - tx0, s * 1.1)), h: H * 0.32 };
  return (
    <g>
      <defs><linearGradient id={`${uid}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.sky[0]} /><stop offset="1" stopColor={p.sky[1]} /></linearGradient></defs>
      <rect x={-WM_EXTRA} y={-WM_EXTRA} width={f1(W + WM_EXTRA * 2)} height={f1(H + WM_EXTRA * 2)} fill={`url(#${uid}-sky)`} />
      <circle cx={f1(sunX)} cy={f1(sunY)} r={f1(sunR * 1.5)} fill={p.accent3} opacity={0.18} />
      <circle cx={f1(sunX)} cy={f1(sunY)} r={f1(sunR)} fill={p.accent3} />
      {birds}
      {ridges}
      <TextStack box={box} p={p} f={f} data={data} align="start" titleMax={box.h * 0.42} ink={p.ink} subInk={p.accent2} />
    </g>
  );
}

// ---------- phòng bé ----------
function Kids({ W, H, p, f, data, free }: Ctx) {
  const r = rng(29);
  const s = Math.min(W, H);
  const sw = s * 0.006;
  const cols = [p.accent, p.accent2, p.accent3, '#9FB7F2', '#C9A7F0'];
  const nodes: ReactNode[] = [];
  // cầu vồng góc dưới trái
  const rx = free.x + s * 0.05, ry = H, rr = s * 0.36;
  cols.forEach((c, i) => nodes.push(<path key={`rb${i}`} d={`M${f1(rx - (rr - i * s * 0.045))} ${f1(ry)} A${f1(rr - i * s * 0.045)} ${f1(rr - i * s * 0.045)} 0 0 1 ${f1(rx + (rr - i * s * 0.045))} ${f1(ry)}`} fill="none" stroke={c} strokeWidth={f1(s * 0.04)} />));
  // mây
  const cloud = (x: number, y: number, w: number, key: string) => (
    <g key={key} fill="#FFFFFF" stroke={p.ink} strokeWidth={f1(sw * 0.6)} strokeOpacity={0.2}>
      <ellipse cx={f1(x)} cy={f1(y)} rx={f1(w * 0.5)} ry={f1(w * 0.22)} />
      <circle cx={f1(x - w * 0.15)} cy={f1(y - w * 0.12)} r={f1(w * 0.2)} />
      <circle cx={f1(x + w * 0.12)} cy={f1(y - w * 0.16)} r={f1(w * 0.24)} />
    </g>
  );
  const nCloud = Math.max(2, Math.round(W / (s * 0.7)));
  for (let i = 0; i < nCloud; i++) nodes.push(cloud(W * ((i + 0.5) / nCloud) + (r() - 0.5) * s * 0.2, H * (0.12 + r() * 0.12), s * (0.2 + r() * 0.08), `cl${i}`));
  // bóng bay
  for (let i = 0; i < 4; i++) {
    const bx = free.x + free.w * (0.72 + i * 0.07), by = H * (0.42 + (i % 2) * 0.08), br = s * 0.045;
    nodes.push(<g key={`bl${i}`}><path d={`M${f1(bx)} ${f1(by + br * 1.2)} q${f1(br * 0.4)} ${f1(br * 1.2)} ${f1(-br * 0.2)} ${f1(br * 3)}`} fill="none" stroke={p.ink} strokeWidth={f1(sw * 0.4)} /><ellipse cx={f1(bx)} cy={f1(by)} rx={f1(br)} ry={f1(br * 1.2)} fill={cols[i % cols.length]} /></g>);
  }
  // chữ cái trong vòng tròn dọc đường lượn
  const letters = 'ABCDEGHIKLMNOPQRSTUVXY';
  const nL = Math.max(5, Math.min(letters.length, Math.floor((free.w * 0.9) / (s * 0.13))));
  const lr = Math.min(s * 0.055, (free.w * 0.9) / nL / 2.3);
  for (let i = 0; i < nL; i++) {
    const lx = free.x + free.w * 0.05 + (free.w * 0.9 * (i + 0.5)) / nL, ly = H * 0.6 + Math.sin(i * 0.9) * s * 0.04;
    nodes.push(<g key={`L${i}`}><circle cx={f1(lx)} cy={f1(ly)} r={f1(lr)} fill={cols[i % cols.length]} /><T x={lx} y={ly + lr * 0.36} s={lr * 1.05} text={letters[i]} family={BODY} weight={800} fill="#FFFFFF" /></g>);
  }
  // thú: mèo, gấu, gà con dưới chân
  const ay = H * 0.86, ar = s * 0.085;
  const animals = [
    (x: number) => <g key="cat"><circle cx={f1(x)} cy={f1(ay)} r={f1(ar)} fill="#F6B26B" /><path d={`M${f1(x - ar * 0.85)} ${f1(ay - ar * 0.4)} L${f1(x - ar * 0.7)} ${f1(ay - ar * 1.25)} L${f1(x - ar * 0.2)} ${f1(ay - ar * 0.85)}Z M${f1(x + ar * 0.85)} ${f1(ay - ar * 0.4)} L${f1(x + ar * 0.7)} ${f1(ay - ar * 1.25)} L${f1(x + ar * 0.2)} ${f1(ay - ar * 0.85)}Z`} fill="#F6B26B" /><circle cx={f1(x - ar * 0.35)} cy={f1(ay - ar * 0.1)} r={f1(ar * 0.09)} fill={p.ink} /><circle cx={f1(x + ar * 0.35)} cy={f1(ay - ar * 0.1)} r={f1(ar * 0.09)} fill={p.ink} /><path d={`M${f1(x - ar * 0.12)} ${f1(ay + ar * 0.18)} q${f1(ar * 0.12)} ${f1(ar * 0.12)} ${f1(ar * 0.24)} 0`} fill="none" stroke={p.ink} strokeWidth={f1(sw * 0.6)} />{[-1, 1].map((sg) => <path key={sg} d={`M${f1(x + sg * ar * 0.3)} ${f1(ay + ar * 0.1)} l${f1(sg * ar * 0.55)} ${f1(-ar * 0.08)} M${f1(x + sg * ar * 0.3)} ${f1(ay + ar * 0.2)} l${f1(sg * ar * 0.55)} ${f1(ar * 0.06)}`} stroke={p.ink} strokeWidth={f1(sw * 0.4)} />)}</g>,
    (x: number) => <g key="bear"><circle cx={f1(x - ar * 0.7)} cy={f1(ay - ar * 0.75)} r={f1(ar * 0.35)} fill="#B9805A" /><circle cx={f1(x + ar * 0.7)} cy={f1(ay - ar * 0.75)} r={f1(ar * 0.35)} fill="#B9805A" /><circle cx={f1(x)} cy={f1(ay)} r={f1(ar)} fill="#C9946B" /><ellipse cx={f1(x)} cy={f1(ay + ar * 0.3)} rx={f1(ar * 0.42)} ry={f1(ar * 0.32)} fill="#F1D7BE" /><circle cx={f1(x)} cy={f1(ay + ar * 0.2)} r={f1(ar * 0.12)} fill={p.ink} /><circle cx={f1(x - ar * 0.38)} cy={f1(ay - ar * 0.2)} r={f1(ar * 0.09)} fill={p.ink} /><circle cx={f1(x + ar * 0.38)} cy={f1(ay - ar * 0.2)} r={f1(ar * 0.09)} fill={p.ink} /></g>,
    (x: number) => <g key="chick"><circle cx={f1(x)} cy={f1(ay + ar * 0.15)} r={f1(ar * 0.85)} fill="#FFD966" /><path d={`M${f1(x + ar * 0.8)} ${f1(ay)} l${f1(ar * 0.35)} ${f1(ar * 0.1)} l${f1(-ar * 0.35)} ${f1(ar * 0.12)}Z`} fill="#F28B30" /><circle cx={f1(x + ar * 0.35)} cy={f1(ay - ar * 0.1)} r={f1(ar * 0.09)} fill={p.ink} /><path d={`M${f1(x - ar * 0.3)} ${f1(ay - ar * 0.7)} q${f1(ar * 0.1)} ${f1(-ar * 0.35)} ${f1(ar * 0.25)} 0`} fill="none" stroke="#F2A93B" strokeWidth={f1(sw)} /></g>,
  ];
  const ax0 = free.x + free.w * 0.45;
  animals.forEach((a, i) => nodes.push(a(ax0 + i * ar * 2.8)));
  const tb = fitBlock(data.title || '', SCRIPT, 700, free.w * 0.6, H * 0.12, H * 0.1, 1);
  const sb = data.sub?.trim() ? fitBlock(data.sub.toUpperCase(), BODY, 800, free.w * 0.5, H * 0.08, tb.size * 0.75, 1, 1.1, 0.12) : { size: 0, lines: [] };
  const tx = free.x + free.w / 2, ty = H * 0.3;
  return (
    <g>
      {nodes}
      <T x={tx} y={ty} s={tb.size} text={tb.lines[0] || ''} family={SCRIPT} weight={700} fill={p.ink} />
      {sb.lines[0] && <T x={tx} y={ty + sb.size * 1.4} s={sb.size} text={sb.lines[0]} family={BODY} weight={800} fill={p.accent} ls={0.12} />}
    </g>
  );
}

// ---------- logo lặp thương hiệu ----------
function Brand({ W, H, p, f, data, free, logo }: Ctx) {
  const s = Math.min(W, H);
  const name = (data.title || 'BRAND').toUpperCase();
  const ps = s * 0.06;
  const rowGap = ps * 2.6;
  const pw = textW(name, f.family, f.weight, ps, 0.1) + ps * 2.2;
  const rows: ReactNode[] = [];
  const diag = Math.hypot(W, H);
  let k = 0;
  for (let y = -diag * 0.35; y < diag * 0.95 && rows.length < 26; y += rowGap, k++) {
    const n = Math.min(8, Math.ceil((diag * 1.2) / pw));
    const line = Array.from({ length: n }, () => name).join('  ·  ');
    rows.push(<T key={`r${k}`} x={-diag * 0.15 - (k % 2) * pw * 0.5} y={y} s={ps} text={line} family={f.family} weight={f.weight} fill={p.bg} anchor="start" ls={0.1} op={0.16} />);
  }
  const cr = Math.min(free.w, free.h) * 0.2;
  const cx = free.x + free.w / 2, cy = free.y + free.h * 0.4;
  const mono = name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2);
  const tb = fitBlock(name, f.family, f.weight, free.w * 0.7, free.h * 0.16, cr * 0.9, 1, 1.1, 0.08);
  const sb = data.sub?.trim() ? fitBlock(data.sub, SCRIPT, 700, free.w * 0.6, free.h * 0.1, tb.size * 0.5, 1) : { size: 0, lines: [] };
  const smb = data.small?.trim() ? fitBlock(data.small, BODY, 600, free.w * 0.7, free.h * 0.06, tb.size * 0.25, 1) : { size: 0, lines: [] };
  const y1 = cy + cr * 1.25 + tb.size * 0.85;
  return (
    <g>
      <g transform={`rotate(-18 ${f1(W / 2)} ${f1(H / 2)})`}>{rows}</g>
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(cr * 1.06)} fill="none" stroke={p.bg} strokeWidth={f1(s * 0.004)} />
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(cr)} fill={p.bg} />
      {logo ? <image href={logo} x={f1(cx - cr * 0.7)} y={f1(cy - cr * 0.7)} width={f1(cr * 1.4)} height={f1(cr * 1.4)} preserveAspectRatio="xMidYMid meet" />
        : <T x={cx} y={cy + cr * 0.3} s={cr * 0.85} text={mono} family={f.family} weight={f.weight} fill={p.accent} />}
      <T x={cx} y={y1} s={tb.size} text={tb.lines[0] || ''} family={f.family} weight={f.weight} fill={p.bg} ls={0.08} />
      {sb.lines[0] && <T x={cx} y={y1 + sb.size * 1.4} s={sb.size} text={sb.lines[0]} family={SCRIPT} weight={700} fill={p.accent3} />}
      {smb.lines[0] && <T x={cx} y={y1 + sb.size * 1.4 + smb.size * 2.2} s={smb.size} text={smb.lines[0]} family={BODY} weight={600} fill={p.bg} op={0.85} />}
    </g>
  );
}

// ---------- ảnh khách ----------
export interface WMPhoto extends CVPhoto {}
function Photo({ W, H, p, f, data, photo, uid }: Ctx) {
  const slot = { x: -WM_EXTRA, y: -WM_EXTRA, w: W + WM_EXTRA * 2, h: H + WM_EXTRA * 2 };
  const s = Math.min(W, H);
  const cap = data.title?.trim();
  const bandH = s * 0.2;
  const box = { x: W * 0.05, y: H - bandH - s * 0.06, w: Math.min(W * 0.4, s * 1.2), h: bandH };
  return (
    <g>
      {photo && (() => { const c = coverRect(slot, photo); return (
        <>
          <defs><clipPath id={`${uid}-ph`}><rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} /></clipPath></defs>
          <image href={photo.src} x={f1(c.x)} y={f1(c.y)} width={f1(c.w)} height={f1(c.h)} preserveAspectRatio="none" clipPath={`url(#${uid}-ph)`} />
        </>
      ); })()}
      {cap && (
        <g>
          <rect x={f1(box.x)} y={f1(box.y)} width={f1(box.w)} height={f1(box.h)} fill={p.bg} opacity={0.9} />
          <TextStack box={{ x: box.x + box.w * 0.06, y: box.y + box.h * 0.08, w: box.w * 0.88, h: box.h * 0.84 }} p={p} f={f} data={{ ...data, small: '' }} titleMax={box.h * 0.48} subInk={p.sub} />
        </g>
      )}
    </g>
  );
}

// ---------- tranh tổng ----------
interface Ctx { W: number; H: number; p: WMPalette; f: WMFont; data: WMData; free: Rect; photo?: WMPhoto | null; logo?: string; uid: string }

export type WMMode = 'view' | 'tex' | 'thumb';
/** nội dung tranh (toạ độ tường mm; nền phủ cả dư mép) */
export function MuralArt({ spec, data, photo, logo, uid }: { spec: WMSpec; data: WMData; photo?: WMPhoto | null; logo?: string; uid: string }) {
  const { W, H } = spec;
  const p = wmPalette(spec.palette), f = wmFont(spec.font);
  const free = freeRect(W, H, spec.obs);
  const ctx: Ctx = { W, H, p, f, data, free, photo, logo, uid };
  const bg = spec.layout === 'brand' ? p.accent : p.bg;
  let body: ReactNode;
  switch (spec.layout) {
    case 'tropical': body = <Tropical {...ctx} />; break;
    case 'streetsg': body = <Street {...ctx} hn={false} />; break;
    case 'streethn': body = <Street {...ctx} hn />; break;
    case 'coffee': body = <Coffee {...ctx} />; break;
    case 'values': body = <Values {...ctx} />; break;
    case 'worldmap': body = <WorldMap {...ctx} />; break;
    case 'mountain': body = <Mountain {...ctx} />; break;
    case 'kids': body = <Kids {...ctx} />; break;
    case 'brand': body = <Brand {...ctx} />; break;
    default: body = <Photo {...ctx} />;
  }
  return (
    <g>
      <rect x={-WM_EXTRA} y={-WM_EXTRA} width={W + WM_EXTRA * 2} height={H + WM_EXTRA * 2} fill={bg} />
      {body}
    </g>
  );
}

/** vùng cửa/cửa sổ: xem trước = gạch chéo + nhãn; texture 3D = màu tường (3D dựng cánh cửa riêng) */
function ObstacleMark({ spec, mode, uid }: { spec: WMSpec; mode: 'view' | 'tex' | 'print'; uid: string }) {
  const o = spec.obs;
  if (!o.on || o.w <= 0 || o.h <= 0) return null;
  const s = Math.min(spec.W, spec.H);
  if (mode === 'tex') return <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#ECE6DC" />;
  const fs = Math.min(o.w * 0.12, s * 0.035);
  return (
    <g>
      <defs><pattern id={`${uid}-hatch`} width={s * 0.03} height={s * 0.03} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width={s * 0.03} height={s * 0.03} fill="#FFFFFF" fillOpacity={mode === 'print' ? 0.55 : 0.7} /><line x1="0" y1="0" x2="0" y2={s * 0.03} stroke="#888" strokeWidth={s * 0.004} /></pattern></defs>
      <rect x={o.x} y={o.y} width={o.w} height={o.h} fill={`url(#${uid}-hatch)`} stroke="#E0007A" strokeWidth={s * 0.003} strokeDasharray={`${s * 0.015} ${s * 0.01}`} />
      <text x={f1(o.x + o.w / 2)} y={f1(o.y + o.h / 2)} fontSize={f1(fs)} fontFamily={`"${BODY}"`} fontWeight={800} fill="#B0005F" textAnchor="middle">{(o.label || 'CỬA').toUpperCase()}</text>
      <text x={f1(o.x + o.w / 2)} y={f1(o.y + o.h / 2 + fs * 1.4)} fontSize={f1(fs * 0.6)} fontFamily={`"${BODY}"`} fontWeight={600} fill="#B0005F" textAnchor="middle">cắt bỏ khi dán</text>
    </g>
  );
}

/** cả bức tường (xem trước / texture 3D / thumbnail). seams = vạch nối tấm mờ */
export function MuralSvg({ spec, data, photo, logo, mode = 'view', seams = false, style }: { spec: WMSpec; data: WMData; photo?: WMPhoto | null; logo?: string; mode?: WMMode; seams?: boolean; style?: CSSProperties }) {
  const { W, H } = spec;
  const uid = `wm-${mode}`;
  const ps = seams ? wmPanels(W, H, spec.roll, spec.overlap) : [];
  const s = Math.min(W, H);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-wm-mode={mode}>
      <MuralArt spec={spec} data={data} photo={photo} logo={logo} uid={uid} />
      {mode !== 'thumb' && <ObstacleMark spec={spec} mode={mode === 'tex' ? 'tex' : 'view'} uid={uid} />}
      {ps.slice(1).map((pn) => (
        mode === 'tex'
          ? <line key={pn.i} x1={f1(pn.x + spec.overlap / 2)} y1={0} x2={f1(pn.x + spec.overlap / 2)} y2={H} stroke="#000" strokeOpacity={0.07} strokeWidth={f1(s * 0.0012)} />
          : <g key={pn.i}><line x1={f1(pn.x + spec.overlap / 2)} y1={0} x2={f1(pn.x + spec.overlap / 2)} y2={H} stroke="#E0007A" strokeWidth={f1(s * 0.0025)} strokeDasharray={`${f1(s * 0.02)} ${f1(s * 0.012)}`} /></g>
      ))}
    </svg>
  );
}

/** 1 tấm in (đúng khổ thật, gồm dư mép): nhãn số tấm + mũi tên "TRÊN" ở dư mép trên, vạch mép tường, vạch chồng mí */
export function PanelSvg({ spec, data, photo, logo, panel, style }: { spec: WMSpec; data: WMData; photo?: WMPhoto | null; logo?: string; panel: WMPanel; style?: CSSProperties }) {
  const { W, H } = spec;
  const { x, y, w, h, i, n } = panel;
  const uid = `wm-p${i}`;
  const E = WM_EXTRA;
  const fs = E * 0.5;
  const label = `TẤM ${i + 1}/${n} · ${(w / 1000).toFixed(3).replace('.', ',')} × ${(h / 1000).toFixed(3).replace('.', ',')} m`;
  return (
    <svg viewBox={`${f1(x)} ${f1(y)} ${f1(w)} ${f1(h)}`} width={`${f1(w)}mm`} height={`${f1(h)}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-panel={i + 1}>
      <MuralArt spec={spec} data={data} photo={photo} logo={logo} uid={uid} />
      <ObstacleMark spec={spec} mode="print" uid={uid} />
      {/* nhãn trên dư mép (bị xén khi thi công) */}
      <rect x={f1(x)} y={-E} width={f1(w)} height={E * 0.8} fill="#FFFFFF" opacity={0.85} />
      <path d={`M${f1(x + E * 0.6)} ${f1(-E * 0.3)} l${f1(E * 0.25)} ${f1(-E * 0.32)} l${f1(E * 0.25)} ${f1(E * 0.32)}Z`} fill="#E0007A" />
      <text x={f1(x + E * 1.3)} y={f1(-E * 0.32)} fontSize={f1(fs)} fontFamily={`"${BODY}"`} fontWeight={800} fill="#E0007A">{`TRÊN · ${label}`}</text>
      <rect x={f1(x)} y={H + E * 0.2} width={f1(w)} height={E * 0.8} fill="#FFFFFF" opacity={0.85} />
      <text x={f1(x + w / 2)} y={f1(H + E * 0.78)} fontSize={f1(fs)} fontFamily={`"${BODY}"`} fontWeight={800} fill="#E0007A" textAnchor="middle">{`${i + 1}/${n}`}</text>
      {/* vạch mép tường trên/dưới (tick 2 bên) */}
      {[0, H].map((yy) => <g key={yy}><line x1={f1(x)} y1={yy} x2={f1(x + E * 0.7)} y2={yy} stroke="#E0007A" strokeWidth={1.2} /><line x1={f1(x + w - E * 0.7)} y1={yy} x2={f1(x + w)} y2={yy} stroke="#E0007A" strokeWidth={1.2} /></g>)}
      {/* vạch chồng mí: tấm sau dán đè lên tấm trước từ vạch này */}
      {i > 0 && <line x1={f1(x + spec.overlap)} y1={-E} x2={f1(x + spec.overlap)} y2={H + E} stroke="#E0007A" strokeWidth={1.2} strokeDasharray="12 8" />}
      {i < n - 1 && <line x1={f1(x + w - spec.overlap)} y1={-E} x2={f1(x + w - spec.overlap)} y2={H + E} stroke="#2A7DE1" strokeWidth={1} strokeDasharray="6 8" />}
    </svg>
  );
}

/** trang sơ đồ dán (A3 ngang, đơn vị mm) */
export function MapSvg({ spec, data, photo, logo, style }: { spec: WMSpec; data: WMData; photo?: WMPhoto | null; logo?: string; style?: CSSProperties }) {
  const PW = 420, PH = 297, m = 18;
  const { W, H } = spec;
  const panels = wmPanels(W, H, spec.roll, spec.overlap);
  const E = WM_EXTRA;
  const k = Math.min((PW - m * 2) / (W + E * 2), (PH - m * 2 - 52) / (H + E * 2));
  const ox = (PW - (W + E * 2) * k) / 2 + E * k, oy = m + 34 + E * k;
  const lyt = wmLayout(spec.layout).name;
  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} width={`${PW}mm`} height={`${PH}mm`} xmlns="http://www.w3.org/2000/svg" style={style}>
      <rect width={PW} height={PH} fill="#FFFFFF" />
      <text x={m} y={m + 6} fontSize={9} fontFamily={`"${BODY}"`} fontWeight={800} fill="#1C1C1C">SƠ ĐỒ DÁN TRANH TƯỜNG · {lyt.toUpperCase()}</text>
      <text x={m} y={m + 15} fontSize={5} fontFamily={`"${BODY}"`} fontWeight={600} fill="#555">{`Tường ${(W / 1000).toFixed(2).replace('.', ',')} × ${(H / 1000).toFixed(2).replace('.', ',')} m · ${panels.length} tấm khổ ${(panels[0].w / 1000).toFixed(3).replace('.', ',')} m (cuộn ${spec.roll / 1000} m) · chồng mí ${spec.overlap / 10} cm · dư mép ${E / 10} cm mỗi cạnh`}</text>
      <text x={m} y={m + 22} fontSize={4.4} fontFamily={`"${BODY}"`} fontWeight={600} fill="#555">Dán từ tấm 1 (trái) sang phải · mỗi tấm sau đè lên tấm trước tới vạch hồng · xén dư mép theo trần, sàn, cạnh tường{spec.obs.on ? ' · cắt bỏ vùng gạch chéo (cửa)' : ''}</text>
      <g transform={`translate(${f1(ox)} ${f1(oy)}) scale(${k})`}>
        <MuralArt spec={spec} data={data} photo={photo} logo={logo} uid="wm-map" />
        <ObstacleMark spec={spec} mode="print" uid="wm-map" />
        <rect x={0} y={0} width={W} height={H} fill="none" stroke="#1C1C1C" strokeWidth={2.5 / k} />
        {panels.map((pn) => (
          <g key={pn.i}>
            <rect x={pn.x} y={pn.y} width={pn.w} height={pn.h} fill="none" stroke="#E0007A" strokeWidth={1.4 / k} strokeDasharray={`${6 / k} ${4 / k}`} />
            <circle cx={pn.x + pn.w / 2} cy={H / 2} r={9 / k} fill="#E0007A" />
            <text x={pn.x + pn.w / 2} y={H / 2 + 3.6 / k} fontSize={10 / k} fontFamily={`"${BODY}"`} fontWeight={800} fill="#FFFFFF" textAnchor="middle">{pn.i + 1}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

// ---------- DPI ảnh ----------
export const photoDpiWall = (W: number, H: number, p: WMPhoto) => 25.4 / (Math.max((W + WM_EXTRA * 2) / p.w, (H + WM_EXTRA * 2) / p.h) * Math.max(1, p.zoom || 1));
