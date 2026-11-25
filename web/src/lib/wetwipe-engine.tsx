'use client';
// Khăn lạnh / khăn ướt in logo: gói "gối" (flow-wrap) — màng giấy bạc/giấy trắng cuộn thành ống, hàn LƯNG (fin seal)
// ở giữa mặt sau, 2 đầu hàn RĂNG CƯA (crimp). Engine SVG đơn vị mm, render code 100% (0 AI).
// In flexo 1–2 màu (nền giấy không phải mực) hoặc in đủ màu. Chữ đo thật bằng canvas → co cho vừa.
// File in = 1 khổ màng trải phẳng: [lưng] [nửa dưới mặt sau] [MẶT TRƯỚC] [nửa trên mặt sau] [lưng] × dài gói.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { measure } from './tape-engine';

// ---------- khổ gói ----------
export interface WWSize { id: string; name: string; L: number; W: number; E: number; kind: 'cold' | 'wet' }
export const WW_SIZES: WWSize[] = [
  { id: 'c70', name: 'Khăn lạnh 7×20 cm', L: 200, W: 70, E: 10, kind: 'cold' },
  { id: 'c60', name: 'Khăn lạnh 6×18 cm', L: 180, W: 60, E: 9, kind: 'cold' },
  { id: 'w80', name: 'Khăn ướt gói nhỏ 8×12 cm', L: 120, W: 80, E: 8, kind: 'wet' },
];
export const wwSize = (id: string) => WW_SIZES.find((s) => s.id === id) || WW_SIZES[0];
export const WW_FIN = 8;     // mép hàn lưng mỗi bên (mm)
export const WW_BLEED = 2;   // lề xén
export const WW_LEGEND = 18; // dải chú thích dưới file in

// ---------- giấy & mực ----------
export interface WWPaper { id: 'silver' | 'white'; name: string; hex: string }
export const WW_PAPERS: WWPaper[] = [
  { id: 'silver', name: 'Giấy bạc', hex: '#C9CDD2' },
  { id: 'white', name: 'Giấy trắng', hex: '#FAFAF7' },
];
export const wwPaper = (id: string) => WW_PAPERS.find((p) => p.id === id) || WW_PAPERS[0];

export interface WWPalette { id: string; name: string; c1: string; c2: string; bg: string }
export const WW_PALETTES: WWPalette[] = [
  { id: 'red', name: 'Đỏ vàng', c1: '#C8102E', c2: '#D9921A', bg: '#FFF3DE' },
  { id: 'navy', name: 'Navy ánh kim', c1: '#1F3A68', c2: '#B8913A', bg: '#F2F5FA' },
  { id: 'green', name: 'Xanh lá', c1: '#1E6B3A', c2: '#7FAE2E', bg: '#EFF7E9' },
  { id: 'orange', name: 'Đen cam', c1: '#1C1C1C', c2: '#EE6A1B', bg: '#FFF0E3' },
  { id: 'sea', name: 'Xanh biển', c1: '#0E5E8C', c2: '#1FA6B5', bg: '#E8F6FA' },
  { id: 'rose', name: 'Hồng cưới', c1: '#A8325E', c2: '#C9A0AE', bg: '#FFF1F4' },
  { id: 'coffee', name: 'Nâu cà phê', c1: '#4A2C1A', c2: '#A8733F', bg: '#F7EEE3' },
  { id: 'purple', name: 'Tím', c1: '#4B2A7B', c2: '#A77CC4', bg: '#F5EFFB' },
];
export const wwPalette = (id: string) => WW_PALETTES.find((p) => p.id === id) || WW_PALETTES[0];

/** 1 = in 1 màu, 2 = in 2 màu (flexo, nền là giấy), 0 = in đủ màu (có nền màu) */
export type WWMode = 0 | 1 | 2;
export const WW_MODES: { id: WWMode; name: string }[] = [
  { id: 1, name: '1 màu' }, { id: 2, name: '2 màu' }, { id: 0, name: 'In đủ màu' },
];

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface WWFont { id: string; name: string; family: string; weight: number }
export const WW_FONTS: WWFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
];
export const wwFont = (id: string) => WW_FONTS.find((f) => f.id === id) || WW_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = { fam: 'Dancing Script', wt: 700 };

export const WW_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Lobster&family=Dancing+Script:wght@700&display=swap');`;

export function useWWFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ww-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ww-fonts'; link.rel = 'stylesheet';
        link.href = WW_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...WW_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `700 40px "${SCRIPT.fam}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục, icon, hương ----------
export type WWLayout = 'center' | 'band' | 'badge' | 'pattern' | 'frame' | 'bold';
export const WW_LAYOUTS: { id: WWLayout; name: string }[] = [
  { id: 'center', name: 'Giữa cân đối' }, { id: 'band', name: 'Dải màu' }, { id: 'badge', name: 'Huy hiệu trái' },
  { id: 'pattern', name: 'Hoạ tiết lặp' }, { id: 'frame', name: 'Khung cổ điển' }, { id: 'bold', name: 'Chữ to' },
];
export type WWIcon = 'beer' | 'flame' | 'fish' | 'rings' | 'coffee' | 'bell';
export const WW_ICONS: { id: WWIcon; name: string }[] = [
  { id: 'beer', name: 'Ly bia' }, { id: 'flame', name: 'Ngọn lửa' }, { id: 'fish', name: 'Con cá' },
  { id: 'rings', name: 'Nhẫn cưới' }, { id: 'coffee', name: 'Tách cà phê' }, { id: 'bell', name: 'Chuông lễ tân' },
];
export type WWScent = 'lemon' | 'tea' | 'none';
export const WW_SCENTS: { id: WWScent; name: string }[] = [
  { id: 'lemon', name: 'Hương chanh' }, { id: 'tea', name: 'Hương trà xanh' }, { id: 'none', name: 'Không mùi' },
];

export interface WWSpec {
  layout: WWLayout; palette: string; font: string; icon: WWIcon; paper: 'silver' | 'white'; mode: WWMode;
  size: string; scent: WWScent; repeat: boolean;
}
export interface WWTemplate { id: string; name: string; use: string; spec: Omit<WWSpec, 'size' | 'scent'> }
export const WW_TEMPLATES: WWTemplate[] = [
  { id: 'nhau-band', name: 'Quán nhậu · bạc', use: 'nhau', spec: { layout: 'band', palette: 'orange', font: 'oswald', icon: 'beer', paper: 'silver', mode: 2, repeat: false } },
  { id: 'nhau-bold', name: 'Quán nhậu · đủ màu', use: 'nhau', spec: { layout: 'bold', palette: 'red', font: 'baloo', icon: 'beer', paper: 'white', mode: 0, repeat: true } },
  { id: 'lau-center', name: 'Lẩu nướng · bạc', use: 'lau', spec: { layout: 'center', palette: 'red', font: 'bvp', icon: 'flame', paper: 'silver', mode: 2, repeat: false } },
  { id: 'lau-pattern', name: 'Lẩu nướng · hoạ tiết', use: 'lau', spec: { layout: 'pattern', palette: 'orange', font: 'montserrat', icon: 'flame', paper: 'white', mode: 2, repeat: true } },
  { id: 'cuoi-frame', name: 'Tiệc cưới · hồng', use: 'cuoi', spec: { layout: 'frame', palette: 'rose', font: 'playfair', icon: 'rings', paper: 'white', mode: 2, repeat: false } },
  { id: 'cuoi-gold', name: 'Tiệc cưới · bạc kim', use: 'cuoi', spec: { layout: 'frame', palette: 'navy', font: 'playfair', icon: 'rings', paper: 'silver', mode: 2, repeat: false } },
  { id: 'haisan-badge', name: 'Hải sản · đủ màu', use: 'haisan', spec: { layout: 'badge', palette: 'sea', font: 'baloo', icon: 'fish', paper: 'white', mode: 0, repeat: false } },
  { id: 'haisan-band', name: 'Hải sản · 1 màu', use: 'haisan', spec: { layout: 'band', palette: 'sea', font: 'oswald', icon: 'fish', paper: 'silver', mode: 1, repeat: false } },
  { id: 'cafe-center', name: 'Cà phê · 1 màu', use: 'cafe', spec: { layout: 'center', palette: 'coffee', font: 'playfair', icon: 'coffee', paper: 'white', mode: 1, repeat: false } },
  { id: 'cafe-pattern', name: 'Cà phê · hoạ tiết', use: 'cafe', spec: { layout: 'pattern', palette: 'coffee', font: 'lobster', icon: 'coffee', paper: 'white', mode: 2, repeat: true } },
  { id: 'ks-frame', name: 'Khách sạn · navy', use: 'ks', spec: { layout: 'frame', palette: 'navy', font: 'playfair', icon: 'bell', paper: 'white', mode: 2, repeat: false } },
  { id: 'ks-badge', name: 'Khách sạn · xanh', use: 'ks', spec: { layout: 'badge', palette: 'green', font: 'montserrat', icon: 'bell', paper: 'silver', mode: 2, repeat: false } },
];

// ---------- nội dung ----------
export type WWData = Record<string, string>;
export interface WWField { key: string; label: string; ph?: string; half?: boolean }
export const WW_FIELDS: WWField[] = [
  { key: 'brand', label: 'Tên quán / nhà hàng', ph: 'LẨU NƯỚNG AN KHANG', half: true },
  { key: 'slogan', label: 'Slogan', ph: 'Ăn ngon – Nhớ mãi', half: true },
  { key: 'phone', label: 'Hotline / đặt bàn', ph: '0909 123 456', half: true },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM', half: true },
  { key: 'label', label: 'Dòng ghi chú gói', ph: 'KHĂN LẠNH – DÙNG 1 LẦN', half: true },
  { key: 'tear', label: 'Chữ ở vết xé', ph: 'Xé tại đây', half: true },
];
const SAMPLE: Record<string, Partial<WWData>> = {
  nhau: { brand: 'NHẬU QUỐC BẢO', slogan: 'Vui là chính – Say là phụ' },
  lau: { brand: 'LẨU NƯỚNG AN KHANG', slogan: 'Ăn ngon – Nhớ mãi' },
  cuoi: { brand: 'Nhà hàng Tiệc cưới Thu Hà', slogan: 'Trăm năm hạnh phúc' },
  haisan: { brand: 'HẢI SẢN GIA KHÁNH', slogan: 'Tươi ngon mỗi ngày' },
  cafe: { brand: 'Cà phê An Nhiên', slogan: 'Thơm ngon từng giọt' },
  ks: { brand: 'KHÁCH SẠN BẢO NGỌC', slogan: 'Cảm ơn quý khách' },
};
export function sampleWWData(use = 'lau', kind: 'cold' | 'wet' = 'cold'): WWData {
  return {
    brand: 'LẨU NƯỚNG AN KHANG', slogan: 'Ăn ngon – Nhớ mãi', phone: '0909 123 456', address: '12 Nguyễn Huệ, Q.1, TP.HCM',
    label: kind === 'wet' ? 'KHĂN ƯỚT – DÙNG 1 LẦN' : 'KHĂN LẠNH – DÙNG 1 LẦN', tear: 'Xé tại đây',
    ...(SAMPLE[use] || {}),
  } as WWData;
}

export interface WWLogo { href: string; w: number; h: number; mask: boolean }

// ---------- tiện ích chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const disp = (f: WWFont): TS => ({ fam: f.family, wt: f.weight });
const body6: TS = { fam: BODY, wt: 600 };
const body8: TS = { fam: BODY, wt: 800 };
/** co cỡ chữ cho vừa bề ngang */
const fitF = (t: string, f: number, maxW: number, ts: TS) => { const w = measure(t, f, ts); return w > maxW ? (f * maxW) / w : f; };
// chia 2 dòng cân đối ở khoảng trắng
function split2(t: string): [string, string] {
  const w = (t || '').trim().split(/\s+/);
  if (w.length < 2) return [t || '', ''];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}
const T = ({ x, y, f, ts, fill, anchor = 'middle', children, zone, op }: { x: number; y: number; f: number; ts: TS; fill: string; anchor?: 'start' | 'middle' | 'end'; children: string; zone?: string; op?: number }) =>
  children ? <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f} textAnchor={anchor} letterSpacing={ts.ls ? ts.ls * f : undefined} fill={fill} opacity={op} data-zone={zone}>{children}</text> : null;

/** dòng liên hệ: gộp 1 dòng nếu đủ rộng, không thì tách hotline / địa chỉ thành 2 dòng */
function contactLns(data: WWData, f: number, maxW: number, fill: string, gap = 0.5): Ln[] {
  const ph = data.phone ? `Hotline ${data.phone}` : '', ad = data.address || '';
  const one = [ph, ad].filter(Boolean).join('  ·  ');
  if (!one) return [];
  if (fitF(one, f, maxW, body6) >= f * 0.78 || !ph || !ad) return [{ t: one, f, ts: body6, fill, gap }];
  return [{ t: ph, f, ts: body8, fill, gap }, { t: ad, f, ts: body6, fill, gap: 0.12 }];
}

/** chồng các dòng chữ trong hộp (cx tâm ngang, y0..y1), co đều cho vừa; trả phần tử */
interface Ln { t: string; f: number; ts: TS; fill: string; gap?: number }
function stackLines(lines: Ln[], cx: number, y0: number, y1: number, maxW: number): ReactNode {
  let ls = lines.filter((l) => (l.t || '').trim()).map((l) => ({ ...l, f: fitF(l.t, l.f, maxW, l.ts) }));
  if (!ls.length) return null;
  const hOf = (arr: Ln[]) => arr.reduce((a, l, i) => a + l.f * 1.18 + (i ? (l.gap ?? 0.18) * l.f : 0), 0);
  let h = hOf(ls);
  const H = y1 - y0;
  if (h > H) { const k = H / h; ls = ls.map((l) => ({ ...l, f: l.f * k })); h = H; }
  let y = y0 + (H - h) / 2;
  return ls.map((l, i) => {
    y += (i ? (l.gap ?? 0.18) * l.f : 0) + l.f * 0.95;
    const el = <T key={i} x={cx} y={y} f={l.f} ts={l.ts} fill={l.fill}>{l.t}</T>;
    y += l.f * 0.23;
    return el;
  });
}

// ---------- icon vẽ code (hộp 0..100, màu fill) ----------
export function IconArt({ icon, fill, bg }: { icon: WWIcon; fill: string; bg: string }) {
  switch (icon) {
    case 'beer':
      return (
        <g>
          <path d="M22 26 h44 v58 a6 6 0 0 1 -6 6 h-32 a6 6 0 0 1 -6 -6 z" fill={fill} />
          <path d="M66 36 h10 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-10 v-8 h9 a3 3 0 0 0 3 -3 v-16 a3 3 0 0 0 -3 -3 h-9 z" fill={fill} />
          <path d="M18 28 c0 -10 8 -16 16 -14 c4 -8 18 -8 22 0 c8 -3 16 3 14 14 z" fill={fill} />
          <rect x="32" y="40" width="5" height="38" rx="2.5" fill={bg} opacity="0.75" />
          <rect x="47" y="40" width="5" height="38" rx="2.5" fill={bg} opacity="0.75" />
        </g>
      );
    case 'flame':
      return (
        <g>
          <path d="M50 8 c6 18 26 26 26 50 a26 26 0 0 1 -52 0 c0 -14 8 -20 12 -30 c4 10 8 12 10 12 c0 -12 -2 -22 4 -32 z" fill={fill} />
          <path d="M50 52 c4 8 12 12 12 22 a12 12 0 0 1 -24 0 c0 -8 6 -12 8 -18 c2 4 4 6 4 6 z" fill={bg} />
          <rect x="18" y="88" width="64" height="6" rx="3" fill={fill} />
        </g>
      );
    case 'fish':
      return (
        <g>
          <path d="M10 50 c14 -22 46 -28 66 -8 l14 -14 v44 l-14 -14 c-20 20 -52 14 -66 -8 z" fill={fill} />
          <circle cx="28" cy="46" r="4.5" fill={bg} />
          <path d="M44 34 c6 6 6 26 0 32" stroke={bg} strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M56 36 c4 5 4 23 0 28" stroke={bg} strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      );
    case 'rings':
      return (
        <g fill="none" stroke={fill} strokeWidth="7">
          <circle cx="38" cy="58" r="22" />
          <circle cx="62" cy="58" r="22" />
          <path d="M30 26 l8 -12 l8 12 l-8 8 z" fill={fill} stroke="none" />
        </g>
      );
    case 'coffee':
      return (
        <g>
          <path d="M18 42 h52 v22 a24 24 0 0 1 -24 24 h-4 a24 24 0 0 1 -24 -24 z" fill={fill} />
          <path d="M70 48 h6 a10 10 0 0 1 0 20 h-8 v-6 h8 a4 4 0 0 0 0 -8 h-6 z" fill={fill} />
          <rect x="10" y="90" width="68" height="5" rx="2.5" fill={fill} />
          {[30, 44, 58].map((x) => <path key={x} d={`M${x} 34 c-5 -6 5 -10 0 -18`} stroke={fill} strokeWidth="3.5" fill="none" strokeLinecap="round" />)}
        </g>
      );
    case 'bell':
    default:
      return (
        <g>
          <circle cx="50" cy="22" r="6" fill={fill} />
          <path d="M14 76 a36 36 0 0 1 72 0 z" fill={fill} />
          <rect x="8" y="78" width="84" height="8" rx="4" fill={fill} />
          <path d="M30 60 a22 22 0 0 1 14 -18" stroke={bg} strokeWidth="4" fill="none" strokeLinecap="round" opacity="0.8" />
        </g>
      );
  }
}
function ScentArt({ scent, fill, bg }: { scent: WWScent; fill: string; bg: string }) {
  if (scent === 'lemon') return (
    <g>
      <circle cx="50" cy="50" r="44" fill={fill} />
      <circle cx="50" cy="50" r="34" fill={bg} />
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <line key={i} x1="50" y1="50" x2={50 + Math.cos(a) * 32} y2={50 + Math.sin(a) * 32} stroke={fill} strokeWidth="4" />; })}
      <circle cx="50" cy="50" r="5" fill={fill} />
    </g>
  );
  if (scent === 'tea') return (
    <g>
      <path d="M12 86 C12 40 44 10 90 10 C90 56 60 88 12 86 z" fill={fill} />
      <path d="M18 80 C40 60 58 40 80 18" stroke={bg} strokeWidth="5" fill="none" strokeLinecap="round" />
    </g>
  );
  return <path d="M50 8 C62 30 80 46 80 64 a30 30 0 0 1 -60 0 C20 46 38 30 50 8 z" fill={fill} />;
}

// ---------- 1 MẶT (trước / sau) — phần tử <g> trong hệ toạ độ mm của mặt (0..L × 0..W) ----------
interface FaceCtx { spec: WWSpec; data: WWData; logo: WWLogo | null; uid: string; print: boolean }
function inks(spec: WWSpec) {
  const p = wwPalette(spec.palette);
  const c1 = p.c1, c2 = spec.mode === 1 ? p.c1 : p.c2;
  return { c1, c2, bg: spec.mode === 0 ? p.bg : null };
}
// màu "giấy" để chữ đục lỗ (knock-out) trên mảng mực
// (file in: trắng = không mực / đục lỗ — xưởng hiểu là chừa giấy; bản xem & 3D: xám bạc cho giống giấy bạc lộ ra)
const paperOf = (spec: WWSpec, bg: string | null, print = false) => bg ?? (print || spec.paper !== 'silver' ? '#FFFFFF' : '#D8DBDF');

function LogoOrIcon({ c, x, y, s, fill, bg }: { c: FaceCtx; x: number; y: number; s: number; fill: string; bg: string }) {
  const lg = c.logo;
  if (lg) {
    const k = Math.min(s / lg.w, s / lg.h), w = lg.w * k, h = lg.h * k;
    const ox = x + (s - w) / 2, oy = y + (s - h) / 2;
    if (lg.mask) {
      const id = `${c.uid}-lm`;
      return (
        <g>
          <defs><mask id={id} maskUnits="userSpaceOnUse" x={ox} y={oy} width={w} height={h}><image href={lg.href} x={ox} y={oy} width={w} height={h} /></mask></defs>
          <rect x={ox} y={oy} width={w} height={h} fill={fill} mask={`url(#${id})`} />
        </g>
      );
    }
    return <image href={lg.href} x={ox} y={oy} width={w} height={h} preserveAspectRatio="xMidYMid meet" />;
  }
  return <g transform={`translate(${x} ${y}) scale(${s / 100})`}><IconArt icon={c.spec.icon} fill={fill} bg={bg} /></g>;
}

/** hoạ tiết lặp nền: tên quán + icon nhỏ so le, mực nhạt (tram) */
function RepeatBg({ c, L, W, fill, op }: { c: FaceCtx; L: number; W: number; fill: string; op: number }) {
  const s = Math.min(9, W * 0.13);
  const brand = (c.data.brand || '').toUpperCase().slice(0, 22);
  const f = s * 0.62, ts = body8;
  const tw = measure(brand, f, ts);
  const step = tw + s * 2.4, rowH = s * 1.9;
  const items: ReactNode[] = [];
  let k = 0;
  for (let r = 0, y = rowH * 0.55; y < W + rowH; r++, y += rowH) {
    for (let x = -step + (r % 2 ? step / 2 : 0); x < L + step; x += step, k++) {
      items.push(<g key={`i${k}`} transform={`translate(${x} ${y - s * 0.78}) scale(${s / 100})`}><IconArt icon={c.spec.icon} fill={fill} bg="none" /></g>);
      if (brand) items.push(<text key={`t${k}`} x={x + s * 1.3} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f} fill={fill}>{brand}</text>);
    }
  }
  return <g opacity={op} data-zone="pattern">{items}</g>;
}

function FrontFace({ c, L, W, E }: { c: FaceCtx; L: number; W: number; E: number }): ReactNode {
  const { spec, data } = c;
  const { c1, c2, bg } = inks(spec);
  const paper = paperOf(spec, bg, c.print);
  const df = disp(wwFont(spec.font));
  const m = 3;
  const x0 = E + m, x1 = L - E - m, y0 = m, y1 = W - m;
  const CW = x1 - x0, CH = y1 - y0, cx = (x0 + x1) / 2;
  const brand = data.brand || '';
  const out: ReactNode[] = [];
  const labelF = Math.min(2.7, CH * 0.075);
  const labelTs: TS = { ...body8, ls: 0.12 };

  // nhãn "KHĂN LẠNH – DÙNG 1 LẦN" + icon hương (dùng chung)
  const label = (y: number, fill: string, w = CW) => {
    const t = (data.label || '').toUpperCase();
    if (!t) return null;
    const f = fitF(t, labelF, w - labelF * 2.2, labelTs);
    const tw = measure(t, f, labelTs);
    const ix = cx - tw / 2 - f * 1.5;
    return (
      <g key="label">
        {spec.scent !== 'none' && <g transform={`translate(${ix} ${y - f * 0.95}) scale(${(f * 1.15) / 100})`}><ScentArt scent={spec.scent} fill={fill} bg={paper} /></g>}
        <T x={cx + (spec.scent !== 'none' ? f * 0.7 : 0)} y={y} f={f} ts={labelTs} fill={fill}>{t}</T>
      </g>
    );
  };
  const contact = [data.phone && `Hotline ${data.phone}`, data.address].filter(Boolean).join('  ·  ');

  if (spec.layout === 'band') {
    const bh = CH * 0.46, by = (W - bh) / 2;
    out.push(<rect key="band" x={-10} y={by} width={L + 20} height={bh} fill={c1} />);
    out.push(<rect key="b1" x={-10} y={by - 1.1} width={L + 20} height={0.5} fill={c2} />);
    out.push(<rect key="b2" x={-10} y={by + bh + 0.6} width={L + 20} height={0.5} fill={c2} />);
    const isz = bh * 0.7;
    out.push(<g key="ic"><LogoOrIcon c={c} x={x0} y={by + (bh - isz) / 2} s={isz} fill={paper} bg={c1} /></g>);
    const tx0 = x0 + isz + 3, tw = x1 - tx0;
    out.push(<g key="bt">{stackLines([{ t: brand.toUpperCase(), f: bh * 0.52, ts: df, fill: paper }], tx0 + tw / 2, by + 1.2, by + bh - 1.2, tw)}</g>);
    out.push(label(by - 2.4, c2));
    out.push(<g key="bot">{stackLines([
      { t: data.slogan || '', f: Math.min(4.2, (y1 - by - bh) * 0.48), ts: { fam: SCRIPT.fam, wt: SCRIPT.wt }, fill: c1 },
    ], cx, by + bh + 2.4, y1 - 0.2, CW)}</g>);
    if (contact) {
      const f = fitF(contact, Math.min(2.3, CH * 0.06), CW, body6);
      // liên hệ ở mép trên (trên nhãn) nếu còn chỗ
      if (by - 2.4 - labelF * 1.2 - f > y0) out.push(<T key="ct" x={cx} y={by - 2.4 - labelF * 1.35} f={f} ts={body6} fill={c1}>{contact}</T>);
    }
  } else if (spec.layout === 'badge') {
    const d = Math.min(CH * 0.86, CW * 0.36), bx = x0, byy = (W - d) / 2;
    out.push(<circle key="bc" cx={bx + d / 2} cy={W / 2} r={d / 2} fill={c1} />);
    out.push(<circle key="bc2" cx={bx + d / 2} cy={W / 2} r={d / 2 - 1.3} fill="none" stroke={paper} strokeWidth={0.45} />);
    const isz = d * 0.56;
    out.push(<g key="ic"><LogoOrIcon c={c} x={bx + (d - isz) / 2} y={byy + (d - isz) / 2} s={isz} fill={paper} bg={c1} /></g>);
    const tx0 = bx + d + 4, tw = x1 - tx0, tcx = tx0 + tw / 2;
    const [b1, b2] = measure(brand.toUpperCase(), CH * 0.3, df) > tw * 1.15 ? split2(brand.toUpperCase()) : [brand.toUpperCase(), ''];
    out.push(<g key="tx">{stackLines([
      { t: (data.label || '').toUpperCase(), f: labelF, ts: labelTs, fill: c2 },
      { t: b1, f: CH * 0.26, ts: df, fill: c1, gap: 0.35 },
      { t: b2, f: CH * 0.26, ts: df, fill: c1, gap: 0.08 },
      { t: data.slogan || '', f: CH * 0.13, ts: { fam: SCRIPT.fam, wt: SCRIPT.wt }, fill: c2, gap: 0.3 },
      ...contactLns(data, Math.min(2.3, CH * 0.07), tw, c1),
    ], tcx, y0 + 0.5, y1 - 0.5, tw)}</g>);
  } else if (spec.layout === 'frame') {
    out.push(<rect key="f1" x={x0} y={y0} width={CW} height={CH} fill="none" stroke={c2} strokeWidth={0.6} />);
    out.push(<rect key="f2" x={x0 + 1.4} y={y0 + 1.4} width={CW - 2.8} height={CH - 2.8} fill="none" stroke={c2} strokeWidth={0.25} />);
    for (const [sx, sy] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]]) {
      out.push(<path key={`o${sx}${sy}`} d={`M${sx - 1.6} ${sy} L${sx} ${sy - 1.6} L${sx + 1.6} ${sy} L${sx} ${sy + 1.6} Z`} fill={c2} />);
    }
    const isz = CH * 0.22;
    out.push(<g key="ic"><LogoOrIcon c={c} x={cx - isz / 2} y={y0 + 2.6} s={isz} fill={c2} bg={paper} /></g>);
    out.push(<g key="tx">{stackLines([
      { t: brand, f: CH * 0.22, ts: df, fill: c1 },
      { t: data.slogan || '', f: CH * 0.15, ts: { fam: SCRIPT.fam, wt: SCRIPT.wt }, fill: c2, gap: 0.12 },
      ...contactLns(data, Math.min(2.2, CH * 0.065), CW - 8, c1, 0.45),
    ], cx, y0 + 2.6 + isz + 0.8, y1 - 4.2, CW - 8)}</g>);
    out.push(label(y1 - 2.2, c2, CW - 6));
  } else if (spec.layout === 'bold') {
    out.push(label(y0 + labelF * 1.05, c2));
    const [b1, b2] = brand.length > 16 ? split2(brand.toUpperCase()) : [brand.toUpperCase(), ''];
    const pillH = Math.min(6.4, CH * 0.2);
    out.push(<g key="tx">{stackLines([
      { t: b1, f: CH * (b2 ? 0.3 : 0.44), ts: df, fill: c1 },
      { t: b2, f: CH * 0.3, ts: df, fill: c1, gap: 0.04 },
      { t: data.slogan || '', f: CH * 0.12, ts: body8, fill: c2, gap: 0.2 },
    ], cx, y0 + labelF * 1.7, y1 - pillH - 1.6, CW)}</g>);
    if (data.phone) {
      const t = `HOTLINE ${data.phone}`;
      const f = fitF(t, pillH * 0.6, CW * 0.7, body8);
      const pw = measure(t, f, body8) + pillH * 1.2;
      out.push(<rect key="pill" x={cx - pw / 2} y={y1 - pillH} width={pw} height={pillH} rx={pillH / 2} fill={c2} />);
      out.push(<T key="pt" x={cx} y={y1 - pillH / 2 + f * 0.36} f={f} ts={body8} fill={paper}>{t}</T>);
    }
    const isz = Math.min(CH * 0.42, (CW - measure(b1, CH * 0.44, df)) / 2 - 2);
    if (isz > 6) {
      out.push(<g key="i1"><LogoOrIcon c={c} x={x0} y={(W - isz) / 2} s={isz} fill={c2} bg={paper} /></g>);
      out.push(<g key="i2"><LogoOrIcon c={c} x={x1 - isz} y={(W - isz) / 2} s={isz} fill={c2} bg={paper} /></g>);
    }
  } else if (spec.layout === 'pattern') {
    // hoạ tiết nền luôn bật + nhãn bo tròn giữa
    const ph = CH * 0.5, pw = Math.min(CW, CW * 0.86);
    out.push(<rect key="pill" x={cx - pw / 2} y={(W - ph) / 2} width={pw} height={ph} rx={ph * 0.22} fill={c1} />);
    out.push(<rect key="pill2" x={cx - pw / 2 + 1.1} y={(W - ph) / 2 + 1.1} width={pw - 2.2} height={ph - 2.2} rx={ph * 0.2} fill="none" stroke={c2} strokeWidth={0.4} />);
    out.push(<g key="tx">{stackLines([
      { t: brand, f: ph * 0.42, ts: df, fill: paper },
      { t: data.slogan || '', f: ph * 0.2, ts: { fam: SCRIPT.fam, wt: SCRIPT.wt }, fill: paper, gap: 0.1 },
    ], cx, (W - ph) / 2 + 1.6, (W + ph) / 2 - 1.6, pw - 6)}</g>);
    out.push(label((W - ph) / 2 - 2.2, c1));
    if (contact) {
      const f = fitF(contact, Math.min(2.3, CH * 0.065), CW, body8);
      out.push(<T key="ct" x={cx} y={(W + ph) / 2 + 2.2 + f * 0.95} f={f} ts={body8} fill={c1}>{contact}</T>);
    }
  } else {
    // center: icon 2 đầu, chữ giữa
    const isz = Math.min(CH * 0.62, CW * 0.18);
    out.push(<g key="i1"><LogoOrIcon c={c} x={x0} y={(W - isz) / 2} s={isz} fill={c1} bg={paper} /></g>);
    if (!c.logo) out.push(<g key="i2"><LogoOrIcon c={c} x={x1 - isz} y={(W - isz) / 2} s={isz} fill={c1} bg={paper} /></g>);
    const tx0 = x0 + isz + 3, tx1 = c.logo ? x1 : x1 - isz - 3, tw = tx1 - tx0, tcx = (tx0 + tx1) / 2;
    const [b1, b2] = measure(brand.toUpperCase(), CH * 0.3, df) > tw * 1.25 ? split2(brand.toUpperCase()) : [brand.toUpperCase(), ''];
    out.push(<g key="tx">{stackLines([
      { t: (data.label || '').toUpperCase(), f: labelF, ts: labelTs, fill: c2 },
      { t: b1, f: CH * 0.3, ts: df, fill: c1, gap: 0.4 },
      { t: b2, f: CH * 0.3, ts: df, fill: c1, gap: 0.06 },
      { t: data.slogan || '', f: CH * 0.14, ts: { fam: SCRIPT.fam, wt: SCRIPT.wt }, fill: c2, gap: 0.25 },
      ...contactLns(data, Math.min(2.3, CH * 0.07), tw, c1),
    ], tcx, y0 + 0.4, y1 - 0.4, tw)}</g>);
    out.push(<line key="d1" x1={tx0} y1={y0 + 0.4} x2={tx1} y2={y0 + 0.4} stroke={c2} strokeWidth={0.3} />);
    out.push(<line key="d2" x1={tx0} y1={y1 - 0.4} x2={tx1} y2={y1 - 0.4} stroke={c2} strokeWidth={0.3} />);
  }

  // vết xé: chữ dọc nhỏ trong mép hàn phải + mũi tên
  const tear = data.tear || '';
  const tf = Math.min(2.1, E * 0.24);
  const tearEl = tear ? (
    <g key="tear">
      <text x={L - E / 2 + tf * 0.35} y={W / 2} transform={`rotate(-90 ${L - E / 2 + tf * 0.35} ${W / 2})`} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fitF(tear, tf, W * 0.6, body8)} fill={c1} data-zone="seal">{tear}</text>
      <path d={`M${L - E / 2 - 1.1} ${2.4} l1.1 1.8 l1.1 -1.8 z`} fill={c1} />
    </g>
  ) : null;

  const pattern = spec.layout === 'pattern' || spec.repeat;
  return (
    <g>
      {bg && <rect x={-10} y={-10} width={L + 20} height={W + 20} fill={bg} />}
      {pattern && <RepeatBg c={c} L={L} W={W} fill={spec.layout === 'pattern' ? c2 : c1} op={0.16} />}
      {/* mép hàn răng cưa 2 đầu: sọc mảnh cùng mực (in liền, đỡ lộ giấy khi răng cưa) */}
      {[0, L - E].map((sx) => (
        <g key={`s${sx}`} opacity={0.55}>
          {Array.from({ length: Math.floor(E / 1.6) }, (_, i) => <rect key={i} x={sx + 0.4 + i * 1.6} y={-10} width={0.5} height={W + 20} fill={c1} />)}
        </g>
      ))}
      {out}
      {tearEl}
    </g>
  );
}

function BackFace({ c, L, W, E }: { c: FaceCtx; L: number; W: number; E: number }): ReactNode {
  const { spec, data } = c;
  const { c1, c2, bg } = inks(spec);
  const paper = paperOf(spec, bg, c.print);
  const m = 3, x0 = E + m, x1 = L - E - m, CW = x1 - x0, cx = (x0 + x1) / 2;
  const half = W / 2, seam = 4; // giữ chữ cách đường hàn lưng ≥ 4mm
  const df = disp(wwFont(spec.font));
  // nửa trên: tên quán + hương; nửa dưới: liên hệ + "Xé tại đây →"
  const scentName = WW_SCENTS.find((s) => s.id === spec.scent)?.name || '';
  const comp = spec.scent === 'none' ? 'Thành phần: giấy không dệt, nước tinh khiết' : `Thành phần: giấy không dệt, nước tinh khiết, ${scentName.toLowerCase()}`;
  const hTop = half - seam - m, hBot = half - seam - m;
  const isz = Math.min(hTop * 0.9, 14);
  const contact = [data.phone && `Hotline: ${data.phone}`, data.address].filter(Boolean).join('  ·  ');
  const pattern = spec.layout === 'pattern' || spec.repeat;
  return (
    <g>
      {bg && <rect x={-10} y={-10} width={L + 20} height={W + 20} fill={bg} />}
      {pattern && <RepeatBg c={c} L={L} W={W} fill={c1} op={0.1} />}
      {[0, L - E].map((sx) => (
        <g key={`s${sx}`} opacity={0.55}>
          {Array.from({ length: Math.floor(E / 1.6) }, (_, i) => <rect key={i} x={sx + 0.4 + i * 1.6} y={-10} width={0.5} height={W + 20} fill={c1} />)}
        </g>
      ))}
      {/* nửa trên */}
      <g><LogoOrIcon c={c} x={x0} y={m + (hTop - isz) / 2} s={isz} fill={c1} bg={paper} /></g>
      <g>{stackLines([
        { t: (data.brand || '').toUpperCase(), f: Math.min(hTop * 0.42, 6), ts: df, fill: c1 },
        { t: comp, f: Math.min(hTop * 0.18, 2.1), ts: body6, fill: c1, gap: 0.35 },
      ], x0 + isz + 3 + (CW - isz - 3) / 2, m, half - seam, CW - isz - 3)}</g>
      {/* nửa dưới */}
      <g>{stackLines([
        { t: contact, f: Math.min(hBot * 0.2, 2.4), ts: body8, fill: c1 },
        { t: 'Dùng 1 lần · Không dùng lau mắt · Tránh xa tầm tay trẻ em', f: Math.min(hBot * 0.16, 1.9), ts: body6, fill: c2, gap: 0.45 },
      ], cx - 8, half + seam, W - m, CW - 18)}</g>
      {data.tear && (() => {
        // "Xé tại đây" + mũi tên vẽ bằng path (font không có glyph →) chỉ về đầu có vết xé
        const f = Math.min(2.3, hBot * 0.22), ax = x1 - f * 1.6, y = W - m - 1;
        return (
          <g>
            <T x={ax - f * 0.4} y={y} f={f} ts={body8} fill={c1} anchor="end">{data.tear}</T>
            <path d={`M${ax} ${y - f * 0.34} h${f * 0.9} M${ax + f * 0.55} ${y - f * 0.68} l${f * 0.4} ${f * 0.34} l${-f * 0.4} ${f * 0.34}`} stroke={c1} strokeWidth={f * 0.14} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );
      })()}
      {/* vạch hàn lưng giữa mặt sau (chỉ là chỉ dẫn mờ) */}
      <line x1={0} y1={half} x2={L} y2={half} stroke={c1} strokeWidth={0.25} strokeDasharray="1.2 1.2" opacity={0.35} data-zone="seam" />
    </g>
  );
}

// ---------- SVG xuất ra ----------
const silverGrad = (id: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor="#E9ECEF" /><stop offset="0.35" stopColor="#BFC4CA" /><stop offset="0.6" stopColor="#E2E5E8" /><stop offset="1" stopColor="#AEB3BA" />
  </linearGradient>
);

/** mặt trước hoặc mặt sau (xem trước & texture 3D). bleed → nới viewBox */
export function WWFaceSvg({ spec, data, logo, side, bleed = 0, flatPaper = false, style }: {
  spec: WWSpec; data: WWData; logo: WWLogo | null; side: 'front' | 'back'; bleed?: number; flatPaper?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '');
  const sz = wwSize(spec.size);
  const { L, W, E } = sz;
  const b = bleed;
  const c: FaceCtx = { spec, data, logo, uid, print: false };
  const paper = wwPaper(spec.paper);
  return (
    <svg viewBox={`${-b} ${-b} ${L + b * 2} ${W + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-safe={`${E + 3} 3 ${L - 2 * E - 6} ${W - 6}`} data-side={side}>
      <defs>{silverGrad(`${uid}-sg`)}<clipPath id={`${uid}-c`}><rect x={-b} y={-b} width={L + b * 2} height={W + b * 2} /></clipPath></defs>
      <rect x={-b} y={-b} width={L + b * 2} height={W + b * 2} fill={spec.paper === 'silver' && !flatPaper ? `url(#${uid}-sg)` : paper.hex} />
      <g clipPath={`url(#${uid}-c)`}>{side === 'front' ? <FrontFace c={c} L={L} W={W} E={E} /> : <BackFace c={c} L={L} W={W} E={E} />}</g>
    </svg>
  );
}

/** FILE IN: khổ màng trải phẳng + vạch hàn lưng, hàn đầu (răng cưa), vết xé, đường cắt rời gói, chú thích */
export function WWPrintSvg({ spec, data, logo, style }: { spec: WWSpec; data: WWData; logo: WWLogo | null; style?: CSSProperties }) {
  const uid = useId().replace(/[:]/g, '');
  const { L, W, E } = wwSize(spec.size);
  const b = WW_BLEED, F = WW_FIN;
  const webH = F * 2 + W * 2;
  const H = webH + b * 2 + WW_LEGEND;
  const c: FaceCtx = { spec, data, logo, uid, print: true };
  const { c1, bg } = inks(spec);
  const paper = wwPaper(spec.paper);
  // vị trí các dải (trục y của khổ màng, gốc = mép trên lề xén)
  const yFinT = b, yBackLo = b + F, yFront = yBackLo + W / 2, yBackHi = yFront + W, yFinB = yBackHi + W / 2, yEnd = yFinB + F;
  const legendY = yEnd + b + 5;
  const zig = (x: number) => { let d = `M${x} ${0}`; const n = Math.round((webH + b * 2) / 2); for (let i = 1; i <= n; i++) d += ` L${x + (i % 2 ? 0.9 : -0.9)} ${(i * (webH + b * 2)) / n}`; return d; };
  const lgF = 2.6;
  const legend = [
    { col: '#E5007E', t: 'Hồng: đường cắt rời gói (răng cưa)' },
    { col: '#00A0E9', t: 'Xanh: nếp gấp mép gói' },
    { col: '#2E9E44', t: `Xanh lá: hàn lưng ${F}mm · hàn đầu ${E}mm` },
  ];
  return (
    <svg viewBox={`0 0 ${L + b * 2} ${H}`} width={`${L + b * 2}mm`} height={`${H}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-web={`${L}x${webH}`}>
      <defs>
        {/* các mảnh: mặt sau nửa dưới (y W/2..W), mặt trước, mặt sau nửa trên (y 0..W/2) */}
        <clipPath id={`${uid}-web`}><rect x={0} y={0} width={L + b * 2} height={webH + b * 2} /></clipPath>
        <clipPath id={`${uid}-lo`}><rect x={-b} y={W / 2 - F - b} width={L + b * 2} height={W / 2 + F + b} /></clipPath>
        <clipPath id={`${uid}-fr`}><rect x={-b} y={0} width={L + b * 2} height={W} /></clipPath>
        <clipPath id={`${uid}-hi`}><rect x={-b} y={0} width={L + b * 2} height={W / 2 + F + b} /></clipPath>
      </defs>
      <rect x={0} y={0} width={L + b * 2} height={H} fill="#FFFFFF" />
      <g id="In" clipPath={`url(#${uid}-web)`}>
        {/* giấy bạc/trắng là vật liệu — không in; chỉ in đủ màu mới có nền */}
        {bg && <rect x={0} y={0} width={L + b * 2} height={webH + b * 2} fill={bg} />}
        <g transform={`translate(${b} ${yBackLo - W / 2})`} clipPath={`url(#${uid}-lo)`}><BackFace c={c} L={L} W={W} E={E} /></g>
        <g transform={`translate(${b} ${yFront})`} clipPath={`url(#${uid}-fr)`}><FrontFace c={c} L={L} W={W} E={E} /></g>
        <g transform={`translate(${b} ${yBackHi})`} clipPath={`url(#${uid}-hi)`}><BackFace c={c} L={L} W={W} E={E} /></g>
      </g>
      {/* chỉ dẫn kỹ thuật (không in) */}
      <g id="Seal" fill="none" stroke="#2E9E44" strokeWidth={0.3} strokeDasharray="1.5 1">
        <rect x={b} y={yFinT} width={L} height={F} />
        <rect x={b} y={yFinB} width={L} height={F} />
        <line x1={b + E} y1={0} x2={b + E} y2={webH + b * 2} />
        <line x1={b + L - E} y1={0} x2={b + L - E} y2={webH + b * 2} />
      </g>
      <g id="Fold" stroke="#00A0E9" strokeWidth={0.3} strokeDasharray="3 1.5">
        <line x1={0} y1={yFront} x2={L + b * 2} y2={yFront} />
        <line x1={0} y1={yBackHi} x2={L + b * 2} y2={yBackHi} />
      </g>
      <g id="CutContour" fill="none" stroke="#E5007E" strokeWidth={0.3}>
        <path d={zig(b)} />
        <path d={zig(b + L)} />
        {/* vết xé chữ V ở mép hàn phải, trên 2 nếp gấp */}
        {[yFront, yBackHi].map((y) => <path key={y} d={`M${b + L - E / 2 - 1.2} ${y - 0.01} L${b + L - E / 2} ${y + 2} L${b + L - E / 2 + 1.2} ${y - 0.01}`} />)}
      </g>
      <g id="Legend" data-zone="legend">
        <text x={b} y={legendY} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={lgF} fill="#222">{`File in khăn ${(L / 10).toString().replace('.', ',')}×${(W / 10).toString().replace('.', ',')} cm · khổ màng ${L}×${webH} mm · ${spec.mode === 0 ? 'in đủ màu' : `${spec.mode} màu mực`} trên ${paper.name.toLowerCase()}${spec.mode !== 0 ? ` · mực chính ${c1}` : ''}`}</text>
        {legend.map((l, i) => (
          <g key={i}>
            <rect x={b + i * ((L + b) / 3)} y={legendY + 3} width={3} height={2.2} fill={l.col} />
            <text x={b + i * ((L + b) / 3) + 4} y={legendY + 5} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={lgF * 0.78} fill="#444">{l.t}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}

/** tổng số màu mực đã dùng trong lớp In (bỏ nền giấy) — dùng cho QC & thông báo */
export const wwInkCount = (spec: WWSpec) => (spec.mode === 0 ? 4 : spec.mode);
export const wwMatName = (spec: WWSpec) => (wwSize(spec.size).kind === 'wet' ? 'Khăn ướt gói nhỏ in đủ màu' : 'Khăn lạnh giấy bạc in 2 màu');
