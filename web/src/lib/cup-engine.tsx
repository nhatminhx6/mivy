'use client';
// Ly giấy / ly nhựa in logo: thiết kế trên 1 HÌNH CHỮ NHẬT (rộng = chu vi miệng ly, cao = đường sinh thân ly)
// → file in là KHUÔN QUẠT (hình vành khăn cắt từ hình nón) tính đúng toán từ Ø miệng, Ø đáy, chiều cao:
//   R = l·rt/(rt−rb), r = R − l, góc quạt θ = 2π·rt/R  (cung ngoài = chu vi miệng, cung trong = chu vi đáy)
// Ảnh thiết kế được "uốn" theo toạ độ cực: cột u ↔ góc, hàng v ↔ bán kính → dán lên ly thì chữ đứng thẳng, ngang tròn đều.
// Ly nhựa PET in trực tiếp 1–2 màu pha (không nền) → chế độ giới hạn màu. Mọi thứ vẽ bằng code, không gọi AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';

// ---------- quy cách ly ----------
export type CupKind = 'paper' | 'pet';
export interface CupSize { id: string; kind: CupKind; name: string; short: string; dt: number; db: number; h: number }
export const CUP_SIZES: CupSize[] = [
  { id: 'p8', kind: 'paper', name: 'Ly giấy 8oz · 240ml', short: '8oz', dt: 80, db: 56, h: 92 },
  { id: 'p12', kind: 'paper', name: 'Ly giấy 12oz · 360ml', short: '12oz', dt: 90, db: 60, h: 110 },
  { id: 'p16', kind: 'paper', name: 'Ly giấy 16oz · 480ml', short: '16oz', dt: 90, db: 60, h: 136 },
  { id: 't360', kind: 'pet', name: 'Ly nhựa 360ml', short: '360ml', dt: 95, db: 56, h: 92 },
  { id: 't500', kind: 'pet', name: 'Ly nhựa 500ml', short: '500ml', dt: 95, db: 58, h: 118 },
  { id: 't700', kind: 'pet', name: 'Ly nhựa 700ml', short: '700ml', dt: 95, db: 60, h: 150 },
];
export const cupSize = (id: string) => CUP_SIZES.find((s) => s.id === id) || CUP_SIZES[1];
export const sizesOfKind = (k: CupKind) => CUP_SIZES.filter((s) => s.kind === k);
export const CUP_BLEED_MM = 2;
export const CUP_GLUE_MM = 7; // mép dán chồng (đo ở giữa thân)
// vùng an toàn: trên = mép cuộn miệng + nắp ôm; dưới = phần gấp đáy (giấy) / gờ đáy (nhựa)
export const cupSafe = (k: CupKind) => (k === 'paper' ? { top: 8, bottom: 10 } : { top: 11, bottom: 9 });

export interface CupGeom { rt: number; rb: number; h: number; l: number; R: number; r: number; theta: number; glue: number; W: number; H: number }
export function cupGeom(sz: Pick<CupSize, 'dt' | 'db' | 'h'>): CupGeom {
  const rt = sz.dt / 2, rb = sz.db / 2;
  const l = Math.hypot(sz.h, rt - rb);
  const R = (l * rt) / (rt - rb), r = R - l;
  const theta = (2 * Math.PI * rt) / R;
  return { rt, rb, h: sz.h, l, R, r, theta, glue: CUP_GLUE_MM / ((R + r) / 2), W: Math.PI * sz.dt, H: l };
}

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface CupFont { id: string; name: string; family: string; weight: number }
export const CUP_FONTS: CupFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
  { id: 'dancing', name: 'Dancing', family: 'Dancing Script', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const cupFont = (id: string) => CUP_FONTS.find((f) => f.id === id) || CUP_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const CUP_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Lobster&family=Dancing+Script:wght@700&display=swap');`;

export function useCupFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cup-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-cup-fonts'; link.rel = 'stylesheet';
        link.href = CUP_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CUP_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu (kèm 2 màu pha cho ly nhựa) ----------
export interface CupPalette { id: string; name: string; bg: string; ink: string; accent: string; accent2: string; onAccent: string; pet1: string; pet2: string }
export const CUP_PALETTES: CupPalette[] = [
  { id: 'espresso', name: 'Espresso', bg: '#3B2A20', ink: '#F4E9DC', accent: '#C89F6D', accent2: '#6B4A35', onAccent: '#2A1B12', pet1: '#3B2A20', pet2: '#B07F48' },
  { id: 'kraft', name: 'Kraft', bg: '#D7B98F', ink: '#3A2618', accent: '#5E3A1E', accent2: '#B8946A', onAccent: '#F6ECDD', pet1: '#3A2618', pet2: '#8A5A30' },
  { id: 'milktea', name: 'Trà sữa', bg: '#F3E6D3', ink: '#4A2E22', accent: '#8C5A3C', accent2: '#C9A27E', onAccent: '#FFF6EA', pet1: '#4A2E22', pet2: '#9A6340' },
  { id: 'matcha', name: 'Matcha', bg: '#EEF3E2', ink: '#2F4A23', accent: '#5E8B35', accent2: '#BFD69C', onAccent: '#FFFFFF', pet1: '#2F4A23', pet2: '#5E8B35' },
  { id: 'orange', name: 'Cam tươi', bg: '#FFF3E0', ink: '#7A2E0E', accent: '#F57C1F', accent2: '#FFC24B', onAccent: '#FFFFFF', pet1: '#7A2E0E', pet2: '#F57C1F' },
  { id: 'berry', name: 'Dâu', bg: '#FDE7EF', ink: '#6B1238', accent: '#D93A72', accent2: '#F7A8C3', onAccent: '#FFFFFF', pet1: '#6B1238', pet2: '#D93A72' },
  { id: 'pastel', name: 'Hồng bánh', bg: '#FFF4F1', ink: '#5A2E2A', accent: '#EFA9A0', accent2: '#C96F5F', onAccent: '#5A2E2A', pet1: '#5A2E2A', pet2: '#D4776A' },
  { id: 'cream', name: 'Kem bơ', bg: '#FBF3E4', ink: '#4B3423', accent: '#B8834F', accent2: '#E7D1AF', onAccent: '#FFFFFF', pet1: '#4B3423', pet2: '#B8834F' },
  { id: 'mono', name: 'Đen trắng', bg: '#FFFFFF', ink: '#141414', accent: '#141414', accent2: '#D9D9D9', onAccent: '#FFFFFF', pet1: '#141414', pet2: '#141414' },
  { id: 'navy', name: 'Navy vàng', bg: '#1E2A4A', ink: '#FFFFFF', accent: '#E0B04A', accent2: '#34446E', onAccent: '#1E2A4A', pet1: '#1E2A4A', pet2: '#C9962E' },
];
export const cupPalette = (id: string) => CUP_PALETTES.find((p) => p.id === id) || CUP_PALETTES[0];

// ---------- bố cục, hoạ tiết, mẫu ----------
export type CupMotif = 'bean' | 'pearl' | 'leaf' | 'citrus' | 'wheat' | 'dot';
export const CUP_LAYOUTS = [
  { id: 'badge', name: 'Huy hiệu' },
  { id: 'band', name: 'Dải giữa' },
  { id: 'pattern', name: 'Hoạ tiết lặp' },
  { id: 'stripe', name: 'Sọc kẹo' },
  { id: 'wave', name: 'Sóng trà sữa' },
  { id: 'minimal', name: 'Tối giản' },
] as const;
export type CupLayout = (typeof CUP_LAYOUTS)[number]['id'];
export type CupIndustry = 'cafe' | 'tea' | 'juice' | 'bakery' | 'minimal';

export interface CupSpec {
  layout: CupLayout; palette: string; font: string; motif: CupMotif; industry: CupIndustry;
  size: string; colors: 1 | 2; lid: 'dome' | 'flat';
}
export interface CupTemplate { id: string; name: string; spec: Pick<CupSpec, 'layout' | 'palette' | 'font' | 'motif' | 'industry'> }
export const CUP_TEMPLATES: CupTemplate[] = [
  { id: 'cafe-badge', name: 'Cà phê · huy hiệu', spec: { layout: 'badge', palette: 'espresso', font: 'montserrat', motif: 'bean', industry: 'cafe' } },
  { id: 'cafe-pattern', name: 'Cà phê · kraft hạt', spec: { layout: 'pattern', palette: 'kraft', font: 'oswald', motif: 'bean', industry: 'cafe' } },
  { id: 'tea-wave', name: 'Trà sữa · sóng', spec: { layout: 'wave', palette: 'milktea', font: 'baloo', motif: 'pearl', industry: 'tea' } },
  { id: 'tea-band', name: 'Matcha · dải lá', spec: { layout: 'band', palette: 'matcha', font: 'baloo', motif: 'leaf', industry: 'tea' } },
  { id: 'juice-pattern', name: 'Nước ép · lát cam', spec: { layout: 'pattern', palette: 'orange', font: 'baloo', motif: 'citrus', industry: 'juice' } },
  { id: 'juice-band', name: 'Nước ép · dâu', spec: { layout: 'band', palette: 'berry', font: 'montserrat', motif: 'citrus', industry: 'juice' } },
  { id: 'bakery-stripe', name: 'Tiệm bánh · sọc kẹo', spec: { layout: 'stripe', palette: 'pastel', font: 'lobster', motif: 'wheat', industry: 'bakery' } },
  { id: 'bakery-badge', name: 'Tiệm bánh · kem bơ', spec: { layout: 'badge', palette: 'cream', font: 'playfair', motif: 'wheat', industry: 'bakery' } },
  { id: 'minimal-mono', name: 'Tối giản · đen trắng', spec: { layout: 'minimal', palette: 'mono', font: 'montserrat', motif: 'dot', industry: 'minimal' } },
  { id: 'minimal-navy', name: 'Tối giản · navy', spec: { layout: 'minimal', palette: 'navy', font: 'playfair', motif: 'dot', industry: 'minimal' } },
  { id: 'pattern-dots', name: 'Hoạ tiết chấm', spec: { layout: 'pattern', palette: 'navy', font: 'bvp', motif: 'dot', industry: 'minimal' } },
  { id: 'tea-stripe', name: 'Trà trái cây · sọc', spec: { layout: 'stripe', palette: 'orange', font: 'dancing', motif: 'citrus', industry: 'juice' } },
];

// ---------- nội dung ----------
export type CupData = Record<string, string>;
export interface CupField { key: string; label: string; ph?: string }
export const CUP_FIELDS: CupField[] = [
  { key: 'brand', label: 'Tên quán / thương hiệu', ph: 'AN KHANG COFFEE' },
  { key: 'tagline', label: 'Dòng nhỏ (ngành / năm)', ph: 'SPECIALTY COFFEE · SINCE 2026' },
  { key: 'slogan', label: 'Slogan', ph: 'Một ly cà phê, một ngày an yên' },
  { key: 'contact', label: 'Hotline / fanpage', ph: '0909 123 456 · fb.com/ankhang' },
];
export const CUP_SAMPLES: Record<CupIndustry, CupData> = {
  cafe: { brand: 'AN KHANG COFFEE', tagline: 'SPECIALTY · RANG XAY MỖI NGÀY', slogan: 'Một ly cà phê, một ngày an yên', contact: '0909 123 456 · fb.com/ankhangcoffee' },
  tea: { brand: 'TRÀ SỮA THU HÀ', tagline: 'TRÂN CHÂU NẤU MỚI MỖI GIỜ', slogan: 'Ngọt vừa đủ, thương vừa đủ', contact: '0901 234 567 · thuhatea.vn' },
  juice: { brand: 'GIA KHÁNH JUICE', tagline: 'ÉP TƯƠI · KHÔNG ĐƯỜNG', slogan: 'Tươi mỗi sáng, khoẻ mỗi ngày', contact: '0938 456 789 · @giakhanhjuice' },
  bakery: { brand: 'Quốc Bảo Bakery', tagline: 'BÁNH NƯỚNG MỖI SÁNG', slogan: 'Thơm bơ, ấm lòng', contact: '0912 345 678 · quocbaobakery.vn' },
  minimal: { brand: 'SAO MAI', tagline: 'COFFEE & TEA', slogan: 'Good coffee, good day', contact: 'saomai.cafe · 0987 654 321' },
};
export const defaultCupData = (ind: CupIndustry = 'cafe'): CupData => ({ ...CUP_SAMPLES[ind] });

// ---------- màu thực in (giấy: in 4 màu có nền; nhựa: 1–2 màu pha, không nền) ----------
interface Ink { bg: string | null; ink: string; accent: string; accent2: string; onAccent: string; solid: boolean; spots: string[] }
export function cupInks(p: CupPalette, kind: CupKind, colors: 1 | 2): Ink {
  if (kind === 'paper') return { bg: p.bg, ink: p.ink, accent: p.accent, accent2: p.accent2, onAccent: p.onAccent, solid: true, spots: [] };
  const c1 = p.pet1, c2 = colors === 2 ? p.pet2 : p.pet1;
  return { bg: null, ink: c1, accent: c2, accent2: c2, onAccent: c1, solid: false, spots: colors === 2 && c1 !== c2 ? [c1, c2] : [c1] };
}

// ---------- tiện ích chữ (đơn vị mm) ----------
interface TS { fam: string; wt: number; ls?: number }
const fit = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW ? (size * maxW) / w : size; };
function wrap2(t: string, maxW: number, size: number, ts: TS): string[] {
  const words = (t || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  if (textW(words.join(' '), size, ts) <= maxW || words.length < 2) return [words.join(' ')];
  // chia 2 dòng cân nhất
  let best = 1, bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const w = Math.max(textW(words.slice(0, i).join(' '), size, ts), textW(words.slice(i).join(' '), size, ts));
    if (w < bw) { bw = w; best = i; }
  }
  return [words.slice(0, best).join(' '), words.slice(best).join(' ')];
}
const GENERIC = new Set(['COFFEE', 'CAFE', 'CAFÉ', 'TEA', 'TRÀ', 'SỮA', 'BAKERY', 'JUICE', 'CÀ', 'PHÊ', 'TIỆM', 'QUÁN', 'BÁNH', '&', 'THE']);
export function initials(brand: string): string {
  const ws = (brand || '').trim().split(/\s+/).filter(Boolean);
  const core = ws.filter((w) => !GENERIC.has(w.toUpperCase()));
  const use = (core.length ? core : ws).slice(0, 2);
  return use.map((w) => w[0]).join('').toUpperCase() || 'M';
}

// ---------- hoạ tiết (vẽ trong ô ±5) ----------
function Motif({ k, x, y, s, color, solid, rot = 0 }: { k: CupMotif; x: number; y: number; s: number; color: string; solid: boolean; rot?: number }) {
  const sw = 0.9;
  const fill = solid ? color : 'none', stroke = solid ? 'none' : color;
  const t = `translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${rot}) scale(${(s / 10).toFixed(3)})`;
  switch (k) {
    case 'bean':
      return (
        <g transform={t}>
          <ellipse cx={0} cy={0} rx={3.3} ry={4.7} fill={fill} stroke={stroke || color} strokeWidth={solid ? 0 : sw} />
          <path d="M0.2 -4.3C-1.6 -1.6 1.6 1.6 -0.2 4.3" fill="none" stroke={solid ? 'rgba(0,0,0,0.28)' : color} strokeWidth={0.9} strokeLinecap="round" />
        </g>
      );
    case 'pearl':
      return (
        <g transform={t}>
          <circle r={3.6} fill={fill} stroke={stroke} strokeWidth={sw} />
          {solid && <circle cx={-1.2} cy={-1.3} r={0.9} fill="#FFFFFF" opacity={0.45} />}
        </g>
      );
    case 'leaf':
      return (
        <g transform={t}>
          <path d="M0 -5C3.8 -3 3.8 3 0 5C-3.8 3 -3.8 -3 0 -5Z" fill={fill} stroke={stroke} strokeWidth={sw} />
          <path d="M0 -4.2V4.2" stroke={solid ? 'rgba(255,255,255,0.55)' : color} strokeWidth={0.6} />
        </g>
      );
    case 'citrus':
      return (
        <g transform={t}>
          <circle r={4.6} fill={fill} stroke={stroke} strokeWidth={sw} />
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2;
            return <line key={i} x1={0} y1={0} x2={Math.cos(a) * 3.6} y2={Math.sin(a) * 3.6} stroke={solid ? 'rgba(255,255,255,0.75)' : color} strokeWidth={0.55} />;
          })}
          <circle r={3.7} fill="none" stroke={solid ? 'rgba(255,255,255,0.75)' : color} strokeWidth={0.5} />
        </g>
      );
    case 'wheat':
      return (
        <g transform={t} stroke={solid ? color : color}>
          <path d="M0 5V-4.5" fill="none" strokeWidth={0.8} strokeLinecap="round" />
          {[-2.6, -0.6, 1.4].map((yy, i) => (
            <g key={i}>
              <ellipse cx={-1.35} cy={yy} rx={0.95} ry={1.7} transform={`rotate(-30 -1.35 ${yy})`} fill={fill} strokeWidth={solid ? 0 : 0.6} />
              <ellipse cx={1.35} cy={yy} rx={0.95} ry={1.7} transform={`rotate(30 1.35 ${yy})`} fill={fill} strokeWidth={solid ? 0 : 0.6} />
            </g>
          ))}
          <ellipse cx={0} cy={-4.4} rx={0.9} ry={1.5} fill={fill} strokeWidth={solid ? 0 : 0.6} />
        </g>
      );
    default:
      return <g transform={t}><circle r={1.6} fill={color} /></g>;
  }
}

// ---------- SVG thiết kế trải phẳng (W × H mm) ----------
export function CupArtSvg({ spec, data, logo, bleed = false, style, kind: kindOverride }: {
  spec: CupSpec; data: CupData; logo?: string; bleed?: boolean; style?: CSSProperties; kind?: CupKind;
}) {
  const sz = cupSize(spec.size);
  const kind = kindOverride || sz.kind;
  const g = cupGeom(sz);
  const W = g.W, H = g.H;
  const b = bleed ? CUP_BLEED_MM : 0;
  const p = cupPalette(spec.palette);
  const ik = cupInks(p, kind, spec.colors);
  const f = cupFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight };
  const body: TS = { fam: BODY, wt: 800 };
  const bodyLight: TS = { fam: BODY, wt: 600 };
  const safe = cupSafe(kind);
  const y0 = safe.top, y1 = H - safe.bottom, zh = y1 - y0;
  const cx = [W * 0.25, W * 0.75];
  const fw = Math.min(W * 0.36, zh * 1.7);
  const uid = `cup-${spec.layout}-${kind}-${bleed ? 'b' : 'n'}`;
  const brand = data.brand || '';
  const area = (color: string, sw = 0.8) => (ik.solid ? { fill: color } : { fill: 'none', stroke: color, strokeWidth: sw });

  const T = (t: string, x: number, y: number, size: number, ts: TS, fill: string, o: { maxW?: number; ls?: number; anchor?: 'start' | 'middle' | 'end' } = {}): ReactNode => {
    if (!t) return null;
    const s = o.maxW ? fit(t, o.maxW, size, { ...ts, ls: o.ls }) : size;
    return <text x={x} y={y} fontSize={s.toFixed(2)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fill={fill} textAnchor={o.anchor || 'middle'} letterSpacing={o.ls ? (o.ls * s) / size : undefined}>{t}</text>;
  };
  // huy hiệu tròn: logo khách (ảnh) hoặc chữ viết tắt
  const Badge = ({ x, y, r, key2 }: { x: number; y: number; r: number; key2: string }) => (
    <g key={key2}>
      <circle cx={x} cy={y} r={r} {...area(ik.accent, 1)} />
      <circle cx={x} cy={y} r={r * 0.84} fill="none" stroke={ik.solid ? ik.onAccent : ik.accent} strokeWidth={Math.max(0.35, r * 0.035)} />
      {logo ? (
        <>
          <clipPath id={`${uid}-clip-${key2}`}><circle cx={x} cy={y} r={r * 0.74} /></clipPath>
          {ik.solid && <circle cx={x} cy={y} r={r * 0.74} fill="#FFFFFF" />}
          <image href={logo} x={x - r * 0.74} y={y - r * 0.74} width={r * 1.48} height={r * 1.48} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-clip-${key2})`} />
        </>
      ) : T(initials(brand), x, y + r * 0.3, r * 0.82, disp, ik.solid ? ik.onAccent : ik.ink, { maxW: r * 1.3 })}
    </g>
  );
  const BrandBlock = ({ x, y, maxW, size, fill }: { x: number; y: number; maxW: number; size: number; fill: string }) => {
    const lines = wrap2(brand, maxW, size, disp);
    const s = Math.min(...lines.map((ln) => fit(ln, maxW, size, disp)), size);
    return <g>{lines.map((ln, i) => <g key={i}>{T(ln, x, y + i * s * 1.05, s, disp, fill)}</g>)}</g>;
  };
  const brandH = (maxW: number, size: number) => {
    const lines = wrap2(brand, maxW, size, disp);
    const s = Math.min(...lines.map((ln) => fit(ln, maxW, size, disp)), size);
    return { n: lines.length, s, h: s * (1 + (lines.length - 1) * 1.05) };
  };

  const els: ReactNode[] = [];
  if (ik.bg) els.push(<rect key="bg" x={-1} y={-b - 1} width={W + 2} height={H + b * 2 + 2} fill={ik.bg} />);
  const motifRow = (y: number, s: number, color: string, skip?: (x: number) => boolean, solid = ik.solid) => {
    const n = Math.max(6, Math.round(W / (s * 2.1)));
    const step = W / n;
    return Array.from({ length: n }, (_, i) => {
      const x = step * (i + 0.5);
      if (skip?.(x)) return null;
      return <Motif key={`m${y.toFixed(1)}-${i}`} k={spec.motif} x={x} y={y} s={s} color={color} solid={solid} rot={spec.motif === 'bean' ? (i % 2 ? 25 : -25) : spec.motif === 'leaf' ? (i % 2 ? 40 : -40) : 0} />;
    });
  };

  if (spec.layout === 'badge') {
    for (const yy of [y0 + 1.2, y1 - 1.2]) {
      els.push(<line key={`r1-${yy}`} x1={-1} x2={W + 1} y1={yy} y2={yy} stroke={ik.accent} strokeWidth={0.6} />);
      els.push(<line key={`r2-${yy}`} x1={-1} x2={W + 1} y1={yy + (yy < H / 2 ? 1.6 : -1.6)} y2={yy + (yy < H / 2 ? 1.6 : -1.6)} stroke={ik.accent} strokeWidth={0.25} />);
    }
    // mặt 1: huy hiệu + tên + dòng nhỏ
    const r = Math.min(zh * 0.2, fw * 0.24, 22);
    const bs = brandH(fw * 0.95, Math.min(zh * 0.14, 15));
    const tagS = Math.min(zh * 0.045, 3.6);
    const total = r * 2 + 3 + bs.h + 3 + tagS;
    const top = y0 + (zh - total) / 2;
    els.push(<Badge key="b0" key2="b0" x={cx[0]} y={top + r} r={r} />);
    els.push(<g key="br0"><BrandBlock x={cx[0]} y={top + r * 2 + 3 + bs.s * 0.92} maxW={fw * 0.95} size={Math.min(zh * 0.14, 15)} fill={ik.ink} /></g>);
    els.push(<g key="tg0">{T(data.tagline || '', cx[0], top + r * 2 + 3 + bs.h + 3 + tagS * 0.8, tagS, body, ik.accent, { maxW: fw * 0.95, ls: tagS * 0.18 })}</g>);
    // mặt 2: slogan + hoạ tiết + liên hệ
    const sl = wrap2(data.slogan || '', fw * 0.9, Math.min(zh * 0.11, 10), disp);
    const ss = Math.min(...sl.map((ln) => fit(ln, fw * 0.9, Math.min(zh * 0.11, 10), disp)), Math.min(zh * 0.11, 10));
    const mS = Math.min(zh * 0.09, 8);
    const cS = Math.min(zh * 0.04, 3.2);
    const t2 = ss * (1 + (sl.length - 1) * 1.15) + 4 + mS + 4 + cS;
    let yy = y0 + (zh - t2) / 2 + ss * 0.9;
    sl.forEach((ln, i) => els.push(<g key={`sl${i}`}>{T(ln, cx[1], yy + i * ss * 1.15, ss, disp, ik.ink)}</g>));
    yy += (sl.length - 1) * ss * 1.15 + ss * 0.3 + 4 + mS / 2;
    [-1, 0, 1].forEach((d) => els.push(<Motif key={`bm${d}`} k={spec.motif} x={cx[1] + d * mS * 1.6} y={yy} s={mS} color={ik.accent} solid={ik.solid} rot={d * 20} />));
    yy += mS / 2 + 4 + cS * 0.8;
    els.push(<g key="ct">{T(data.contact || '', cx[1], yy, cS, bodyLight, ik.ink, { maxW: fw * 0.95 })}</g>);
    // đường nối 2 mặt: cột hoạ tiết nhỏ
    for (const sx of [0, W / 2, W]) {
      [-1, 0, 1].forEach((d) => els.push(<Motif key={`sx${sx}-${d}`} k={spec.motif} x={sx} y={y0 + zh / 2 + d * zh * 0.2} s={Math.min(zh * 0.07, 6)} color={ik.accent} solid={ik.solid} rot={d * 30} />));
    }
  } else if (spec.layout === 'band') {
    const bm = y0 + zh * 0.5, bh = zh * 0.34;
    els.push(<rect key="band" x={-1} y={bm - bh / 2} width={W + 2} height={bh} {...area(ik.accent, 0.9)} />);
    if (!ik.solid) els.push(<rect key="band2" x={-1} y={bm - bh / 2 + 1.6} width={W + 2} height={bh - 3.2} fill="none" stroke={ik.accent} strokeWidth={0.35} />);
    const onBand = ik.solid ? ik.onAccent : ik.ink;
    const bw = fw * 1.05;
    const aTop = y0, aBot = bm - bh / 2, aMid = (aTop + aBot) / 2, aH = aBot - aTop;
    const below = y1 - (bm + bh / 2), bMid = bm + bh / 2 + below / 2;
    const mS = Math.min(below * 0.42, 9);
    cx.forEach((x, i) => {
      const bs = brandH(bw, Math.min(bh * 0.42, 14));
      els.push(<g key={`bb${i}`}><BrandBlock x={x} y={bm - bs.h / 2 + bs.s * 0.8} maxW={bw} size={Math.min(bh * 0.42, 14)} fill={onBand} /></g>);
      if (i === 0) {
        const tagS = Math.min(aH * 0.2, 4.4);
        const ms = Math.min(aH * 0.36, 7.5);
        const tot = ms + 2.5 + tagS;
        const t0 = aMid - tot / 2;
        [-1, 0, 1].forEach((d) => els.push(<Motif key={`ba${d}`} k={spec.motif} x={x + d * ms * 1.7} y={t0 + ms / 2} s={ms} color={ik.accent} solid={ik.solid} rot={d * 25} />));
        els.push(<g key="btg">{T(data.tagline || '', x, t0 + ms + 2.5 + tagS * 0.8, tagS, body, ik.ink, { maxW: bw, ls: tagS * 0.16 })}</g>);
      } else {
        const sl = wrap2(data.slogan || '', bw, Math.min(aH * 0.34, 7.5), disp);
        const ss = Math.min(...sl.map((ln) => fit(ln, bw, Math.min(aH * 0.34, 7.5), disp)), Math.min(aH * 0.34, 7.5));
        const tot = ss * (1 + (sl.length - 1) * 1.12);
        sl.forEach((ln, k) => els.push(<g key={`bs${k}`}>{T(ln, x, aMid - tot / 2 + ss * 0.85 + k * ss * 1.12, ss, disp, ik.ink)}</g>));
      }
    });
    els.push(...motifRow(bMid, mS, ik.accent, (x) => Math.abs(x - cx[1]) < bw * 0.55));
    els.push(<g key="ctb">{T(data.contact || '', cx[1], bMid + 1.2, Math.min(below * 0.2, 3.4), body, ik.ink, { maxW: bw })}</g>);
  } else if (spec.layout === 'pattern') {
    const step = 13;
    const n = Math.max(8, Math.round(W / step)), sx = W / n;
    const rows = Math.ceil((H + b * 2) / step) + 1;
    const pw = fw * 0.94, ph = Math.min(zh * 0.78, 64);
    const py = y0 + (zh - ph) / 2;
    const pat: ReactNode[] = [];
    for (let rI = 0; rI < rows; rI++) for (let c = 0; c < n; c++) {
      const x = sx * (c + (rI % 2 ? 0.5 : 0)), y = -b + rI * step + step * 0.3;
      pat.push(<Motif key={`p${rI}-${c}`} k={spec.motif} x={x} y={y} s={7} color={ik.solid ? ik.accent2 : ik.accent} solid={ik.solid} rot={(c * 37 + rI * 53) % 360} />);
      if (c === 0 && rI % 2) pat.push(<Motif key={`pw${rI}`} k={spec.motif} x={x - W} y={y} s={7} color={ik.solid ? ik.accent2 : ik.accent} solid={ik.solid} rot={(rI * 53) % 360} />);
    }
    els.push(
      <mask key="pm" id={`${uid}-mask`} maskUnits="userSpaceOnUse" x={-2} y={-b - 2} width={W + 4} height={H + b * 2 + 4}>
        <rect x={-2} y={-b - 2} width={W + 4} height={H + b * 2 + 4} fill="#FFFFFF" />
        {cx.map((x, i) => <rect key={i} x={x - pw / 2 - 2.5} y={py - 2.5} width={pw + 5} height={ph + 5} rx={7} fill="#000000" />)}
      </mask>,
    );
    els.push(<g key="pat" mask={`url(#${uid}-mask)`}>{pat}</g>);
    cx.forEach((x, i) => {
      els.push(<rect key={`pl${i}`} x={x - pw / 2} y={py} width={pw} height={ph} rx={5} fill={ik.solid ? ik.bg! : 'none'} stroke={ik.accent} strokeWidth={0.9} />);
      if (i === 0) {
        const r = Math.min(ph * 0.17, 11);
        const bs = brandH(pw * 0.86, Math.min(ph * 0.17, 12));
        const tagS = Math.min(ph * 0.06, 3.4);
        const total = r * 2 + 3 + bs.h + 2.5 + tagS;
        const top = py + (ph - total) / 2;
        els.push(<Badge key="pb" key2="pb" x={x} y={top + r} r={r} />);
        els.push(<g key="pbr"><BrandBlock x={x} y={top + r * 2 + 3 + bs.s * 0.92} maxW={pw * 0.86} size={Math.min(ph * 0.17, 12)} fill={ik.ink} /></g>);
        els.push(<g key="ptg">{T(data.tagline || '', x, top + r * 2 + 3 + bs.h + 2.5 + tagS * 0.8, tagS, body, ik.accent, { maxW: pw * 0.86, ls: tagS * 0.14 })}</g>);
      } else {
        const bs = brandH(pw * 0.86, Math.min(ph * 0.13, 9));
        const sl = wrap2(data.slogan || '', pw * 0.86, Math.min(ph * 0.1, 6.5), disp);
        const ss = Math.min(...sl.map((ln) => fit(ln, pw * 0.86, Math.min(ph * 0.1, 6.5), disp)), Math.min(ph * 0.1, 6.5));
        const cS = Math.min(ph * 0.055, 3);
        const total = bs.h + 4 + ss * (1 + (sl.length - 1) * 1.15) + 4 + cS;
        let yy = py + (ph - total) / 2;
        els.push(<g key="p2b"><BrandBlock x={x} y={yy + bs.s * 0.92} maxW={pw * 0.86} size={Math.min(ph * 0.13, 9)} fill={ik.accent} /></g>);
        yy += bs.h + 4;
        sl.forEach((ln, k) => els.push(<g key={`p2s${k}`}>{T(ln, x, yy + ss * 0.9 + k * ss * 1.15, ss, disp, ik.ink)}</g>));
        yy += ss * (1 + (sl.length - 1) * 1.15) + 4;
        els.push(<g key="p2c">{T(data.contact || '', x, yy + cS * 0.8, cS, bodyLight, ik.ink, { maxW: pw * 0.86 })}</g>);
      }
    });
  } else if (spec.layout === 'stripe') {
    const n = Math.max(10, Math.round(W / 11)), sw = W / n;
    for (let i = 0; i < n; i += 2) {
      els.push(ik.solid
        ? <rect key={`st${i}`} x={i * sw} y={-b - 1} width={sw} height={H + b * 2 + 2} fill={ik.accent} />
        : <line key={`st${i}`} x1={i * sw + sw / 2} x2={i * sw + sw / 2} y1={-b - 1} y2={H + b + 1} stroke={ik.accent} strokeWidth={0.7} />);
    }
    const rx = fw * 0.5, ry = Math.min(zh * 0.42, 34);
    const ey = y0 + zh / 2;
    cx.forEach((x, i) => {
      els.push(<ellipse key={`eo${i}`} cx={x} cy={ey} rx={rx + 2.2} ry={ry + 2.2} fill={ik.solid ? ik.bg! : 'none'} stroke={ik.accent2} strokeWidth={1.1} />);
      els.push(<ellipse key={`ei${i}`} cx={x} cy={ey} rx={rx} ry={ry} fill={ik.solid ? ik.bg! : 'none'} stroke={ik.accent2} strokeWidth={0.4} />);
      const inner = rx * 1.45;
      if (i === 0) {
        const bs = brandH(inner, Math.min(ry * 0.42, 14));
        const tagS = Math.min(ry * 0.13, 3.3);
        const mS = Math.min(ry * 0.22, 7);
        const total = mS + 2.5 + bs.h + 2.5 + tagS;
        const top = ey - total / 2;
        els.push(<Motif key="sm" k={spec.motif} x={x} y={top + mS / 2} s={mS} color={ik.accent2} solid={ik.solid} />);
        els.push(<g key="sb"><BrandBlock x={x} y={top + mS + 2.5 + bs.s * 0.85} maxW={inner} size={Math.min(ry * 0.42, 14)} fill={ik.ink} /></g>);
        els.push(<g key="stg">{T(data.tagline || '', x, top + mS + 2.5 + bs.h + 2.5 + tagS * 0.8, tagS, body, ik.accent2, { maxW: inner * 0.9, ls: tagS * 0.14 })}</g>);
      } else {
        const sl = wrap2(data.slogan || '', inner, Math.min(ry * 0.26, 8.5), disp);
        const ss = Math.min(...sl.map((ln) => fit(ln, inner, Math.min(ry * 0.26, 8.5), disp)), Math.min(ry * 0.26, 8.5));
        const cS = Math.min(ry * 0.11, 3);
        const total = ss * (1 + (sl.length - 1) * 1.15) + 4 + cS;
        const top = ey - total / 2;
        sl.forEach((ln, k) => els.push(<g key={`ss${k}`}>{T(ln, x, top + ss * 0.85 + k * ss * 1.15, ss, disp, ik.ink)}</g>));
        els.push(<g key="sct">{T(data.contact || '', x, top + total - cS * 0.2, cS, bodyLight, ik.ink, { maxW: inner * 0.92 })}</g>);
      }
    });
  } else if (spec.layout === 'wave') {
    const k = Math.max(4, Math.round(W / 46)), wl = W / k;
    const wy = y0 + zh * 0.6, amp = Math.min(zh * 0.05, 3.2);
    const wave = (y: number, a: number, phase: number) => {
      let d = `M-1 ${H + b + 1}V${y.toFixed(2)}`;
      for (let x = 0; x <= W + 0.01; x += wl / 16) d += `L${x.toFixed(2)} ${(y + Math.sin((x / wl) * Math.PI * 2 + phase) * a).toFixed(2)}`;
      return d + `L${W + 1} ${y.toFixed(2)}V${H + b + 1}Z`;
    };
    if (ik.solid) {
      els.push(<path key="w2" d={wave(wy - amp * 1.4, amp, 1.6)} fill={ik.accent2} />);
      els.push(<path key="w1" d={wave(wy, amp, 0)} fill={ik.accent} />);
    } else {
      els.push(<path key="w1" d={wave(wy, amp, 0)} fill="none" stroke={ik.accent} strokeWidth={0.9} />);
      els.push(<path key="w2" d={wave(wy - amp * 1.4, amp, 1.6)} fill="none" stroke={ik.accent} strokeWidth={0.4} />);
    }
    // trân châu rải trong sóng (lặp khít theo chu vi)
    let seed = 7; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const pn = Math.round(W / 9);
    for (let i = 0; i < pn; i++) {
      const x = (i + 0.2 + rnd() * 0.6) * (W / pn);
      const y = wy + amp + 3 + rnd() * Math.max(2, (H - (wy + amp + 3)) - 3);
      if (Math.abs(x - cx[1]) < fw * 0.45 && y > y1 - 8) continue;
      els.push(<Motif key={`pp${i}`} k={spec.motif === 'pearl' ? 'pearl' : spec.motif} x={x} y={y} s={3.2 + rnd() * 1.6} color={ik.solid ? ik.onAccent : ik.ink} solid={ik.solid} />);
    }
    const topZone = wy - amp * 2.6 - y0;
    cx.forEach((x, i) => {
      const bs = brandH(fw, Math.min(topZone * 0.36, 15));
      const tagS = Math.min(topZone * 0.1, 3.6);
      const subS = Math.min(topZone * 0.14, 6);
      const second = i === 0 ? (data.tagline || '') : (data.slogan || '');
      const sS = i === 0 ? tagS : subS;
      const total = bs.h + 3 + sS;
      const top = y0 + (topZone - total) / 2;
      els.push(<g key={`wb${i}`}><BrandBlock x={x} y={top + bs.s * 0.9} maxW={fw} size={Math.min(topZone * 0.36, 15)} fill={ik.ink} /></g>);
      els.push(<g key={`wt${i}`}>{T(second, x, top + bs.h + 3 + sS * 0.75, sS, i === 0 ? body : disp, ik.accent, { maxW: fw, ls: i === 0 ? tagS * 0.16 : 0 })}</g>);
    });
    els.push(<g key="wct">{T(data.contact || '', cx[1], y1 - 1.5, Math.min(zh * 0.042, 3.2), body, ik.solid ? ik.onAccent : ik.ink, { maxW: fw })}</g>);
  } else { // minimal
    const words = brand.trim().split(/\s+/).filter(Boolean);
    const lines = words.length > 2 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : words.length === 2 && textW(brand, 12, disp) > fw * 0.9 ? words : [brand];
    const s0 = Math.min(zh * 0.27, 22);
    const s = Math.min(s0, ...lines.map((ln) => fit(ln, fw * 0.9, s0, disp)));
    const tagS = Math.min(zh * 0.045, 3.4);
    const total = s * (1 + (lines.length - 1) * 1.02) + 5 + tagS;
    const top = y0 + (zh - total) / 2;
    lines.forEach((ln, i) => els.push(<g key={`mn${i}`}>{T(ln, cx[0], top + s * 0.86 + i * s * 1.02, s, disp, ik.ink)}</g>));
    const ly = top + s * (1 + (lines.length - 1) * 1.02) + 1.5;
    els.push(<line key="ml" x1={cx[0] - 7} x2={cx[0] + 7} y1={ly} y2={ly} stroke={ik.accent} strokeWidth={0.7} />);
    els.push(<g key="mt">{T(data.tagline || '', cx[0], ly + 3.5 + tagS * 0.8, tagS, body, ik.accent, { maxW: fw * 0.9, ls: tagS * 0.22 })}</g>);
    const r = Math.min(zh * 0.15, 11);
    const ss = Math.min(zh * 0.07, 5.5);
    const cS = Math.min(zh * 0.038, 3);
    const t2 = r * 2 + 4 + ss + 3 + cS;
    const top2 = y0 + (zh - t2) / 2;
    els.push(<Badge key="mb" key2="mb" x={cx[1]} y={top2 + r} r={r} />);
    els.push(<g key="ms">{T(data.slogan || '', cx[1], top2 + r * 2 + 4 + ss * 0.8, ss, disp, ik.ink, { maxW: fw * 0.9 })}</g>);
    els.push(<g key="mc">{T(data.contact || '', cx[1], top2 + r * 2 + 4 + ss + 3 + cS * 0.8, cS, bodyLight, ik.ink, { maxW: fw * 0.9 })}</g>);
    for (const yy of [y0 + 1, y1 - 1]) els.push(<line key={`mh${yy}`} x1={-1} x2={W + 1} y1={yy} y2={yy} stroke={ik.accent} strokeWidth={0.3} />);
  }

  return (
    <svg viewBox={`0 ${-b} ${W.toFixed(3)} ${(H + b * 2).toFixed(3)}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-w={W.toFixed(2)} data-h={H.toFixed(2)}>
      {els}
    </svg>
  );
}

// ---------- KHUÔN QUẠT (file in) ----------
// Toạ độ: đỉnh nón ở (0,0), điểm (ρ, φ) → (ρ·sinφ, −ρ·cosφ): miệng ly (cung lớn) ở TRÊN, chữ đứng thuận.
export interface DieLayout { wMm: number; hMm: number; tx: number; ty: number; box: { x: number; y: number; w: number; h: number }; phi0: number; phi1: number }
const DIE_MARGIN = 12;
export function dieLayout(g: CupGeom): DieLayout {
  const b = CUP_BLEED_MM;
  const phi0 = -g.theta / 2 - g.glue, phi1 = g.theta / 2;
  const eb = b / (g.r - b);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const rho of [g.R + b, g.r - b]) for (let i = 0; i <= 240; i++) {
    const ph = phi0 - eb + ((phi1 - phi0 + eb * 2) * i) / 240;
    const x = rho * Math.sin(ph), y = -rho * Math.cos(ph);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  const legend = 16;
  return {
    wMm: maxX - minX + DIE_MARGIN * 2, hMm: maxY - minY + DIE_MARGIN * 2 + legend,
    tx: DIE_MARGIN - minX, ty: DIE_MARGIN - minY, box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, phi0, phi1,
  };
}

/** Uốn ảnh thiết kế (W × (H+2·bleed) mm, có lề xén trên/dưới) thành hình quạt; ppm = điểm ảnh / mm của ảnh ra. */
export function warpArtToSector(art: HTMLCanvasElement, g: CupGeom, ppm: number, bg = '#FFFFFF'): HTMLCanvasElement {
  const b = CUP_BLEED_MM, L = dieLayout(g);
  const outW = Math.max(2, Math.round(L.box.w * ppm)), outH = Math.max(2, Math.round(L.box.h * ppm));
  const out = document.createElement('canvas'); out.width = outW; out.height = outH;
  const octx = out.getContext('2d')!;
  octx.fillStyle = bg; octx.fillRect(0, 0, outW, outH);
  const od = octx.getImageData(0, 0, outW, outH), o = od.data;
  const sw = art.width, sh = art.height;
  const sd = art.getContext('2d')!.getImageData(0, 0, sw, sh).data;
  const ax = sw / g.W, ay = sh / (g.H + b * 2);
  const eb = b / (g.r - b);
  const lo = L.phi0 - eb, hi = L.phi1 + eb;
  const rIn = g.r - b, rOut = g.R + b;
  for (let j = 0; j < outH; j++) {
    const y = L.box.y + (j + 0.5) / ppm;
    for (let i = 0; i < outW; i++) {
      const x = L.box.x + (i + 0.5) / ppm;
      const rho = Math.hypot(x, y);
      if (rho < rIn || rho > rOut) continue;
      const ph = Math.atan2(x, -y);
      if (ph < lo || ph > hi) continue;
      let u = (ph + g.theta / 2) / g.theta; u -= Math.floor(u);
      const v = (g.R - rho) + b; // mm từ mép trên ảnh (đã gồm lề xén)
      // lấy mẫu song tuyến
      const fx = u * sw - 0.5, fy = Math.min(sh - 1.001, Math.max(0, v * ay - 0.5));
      const x0 = Math.floor(fx), y0 = Math.floor(fy), dx = fx - x0, dy = fy - y0;
      const xa = ((x0 % sw) + sw) % sw, xb = (xa + 1) % sw, yb = Math.min(sh - 1, y0 + 1);
      const i00 = (y0 * sw + xa) * 4, i10 = (y0 * sw + xb) * 4, i01 = (yb * sw + xa) * 4, i11 = (yb * sw + xb) * 4;
      const k = (j * outW + i) * 4;
      for (let c = 0; c < 3; c++) {
        const v0 = sd[i00 + c] * (1 - dx) + sd[i10 + c] * dx, v1 = sd[i01 + c] * (1 - dx) + sd[i11 + c] * dx;
        const a0 = sd[i00 + 3] * (1 - dx) + sd[i10 + 3] * dx, a1 = sd[i01 + 3] * (1 - dx) + sd[i11 + 3] * dx;
        const val = v0 * (1 - dy) + v1 * dy, al = (a0 * (1 - dy) + a1 * dy) / 255;
        o[k + c] = val * al + o[k + c] * (1 - al);
      }
    }
  }
  void ax;
  octx.putImageData(od, 0, 0);
  return out;
}

export function CupDielineSvg({ spec, artHref, style, labels = true }: { spec: CupSpec; artHref: string; style?: CSSProperties; labels?: boolean }) {
  const sz = cupSize(spec.size);
  const g = cupGeom(sz);
  const L = dieLayout(g);
  const safe = cupSafe(sz.kind);
  const pt = (rho: number, ph: number) => `${(L.tx + rho * Math.sin(ph)).toFixed(3)} ${(L.ty - rho * Math.cos(ph)).toFixed(3)}`;
  const arc = (rho: number, a: number, c: number) => `M${pt(rho, a)}A${rho.toFixed(3)} ${rho.toFixed(3)} 0 0 1 ${pt(rho, c)}`;
  const cut = `M${pt(g.R, L.phi0)}A${g.R.toFixed(3)} ${g.R.toFixed(3)} 0 0 1 ${pt(g.R, L.phi1)}L${pt(g.r, L.phi1)}A${g.r.toFixed(3)} ${g.r.toFixed(3)} 0 0 0 ${pt(g.r, L.phi0)}Z`;
  const p = cupPalette(spec.palette);
  const ik = cupInks(p, sz.kind, spec.colors);
  const fs = 3;
  const ly = L.hMm - 13;
  const gm = (g.R + g.r) / 2;
  const glueMid = L.phi0 + g.glue / 2;
  return (
    <svg viewBox={`0 0 ${L.wMm.toFixed(3)} ${L.hMm.toFixed(3)}`} width={`${L.wMm.toFixed(2)}mm`} height={`${L.hMm.toFixed(2)}mm`} xmlns="http://www.w3.org/2000/svg" style={style}
      data-R={g.R.toFixed(3)} data-r={g.r.toFixed(3)} data-theta={g.theta.toFixed(5)} data-glue={g.glue.toFixed(5)} data-l={g.l.toFixed(3)}>
      <rect x={0} y={0} width={L.wMm} height={L.hMm} fill="#FFFFFF" />
      <g id="In">
        {artHref && <image href={artHref} x={L.tx + L.box.x} y={L.ty + L.box.y} width={L.box.w} height={L.box.h} preserveAspectRatio="none" />}
      </g>
      {labels && (
        <g id="Guides" fill="none">
          <path d={arc(g.R - safe.top, -g.theta / 2, g.theta / 2)} stroke="#00A0E9" strokeWidth={0.25} strokeDasharray="1.6 1.2" />
          <path d={arc(g.r + safe.bottom, -g.theta / 2, g.theta / 2)} stroke="#00A0E9" strokeWidth={0.25} strokeDasharray="1.6 1.2" />
          <path d={`M${pt(g.r, -g.theta / 2)}L${pt(g.R, -g.theta / 2)}`} stroke="#00A651" strokeWidth={0.35} strokeDasharray="2.4 1.4" />
          <text x={L.tx + gm * Math.sin(glueMid)} y={L.ty - gm * Math.cos(glueMid)} fontSize={2.2} fontFamily={`"${BODY}"`} fontWeight={600} fill="#00A651" textAnchor="middle"
            transform={`rotate(${((glueMid * 180) / Math.PI - 90).toFixed(2)} ${(L.tx + gm * Math.sin(glueMid)).toFixed(2)} ${(L.ty - gm * Math.cos(glueMid)).toFixed(2)})`}>DÁN KEO</text>
        </g>
      )}
      <g id="CutContour"><path d={cut} fill="none" stroke="#EC008C" strokeWidth={0.3} /></g>
      {labels && (() => {
        // chú thích: mẫu nét vẽ bằng hình (không dùng ký tự đặc biệt → file in outline được hết chữ)
        const lt: TS = { fam: BODY, wt: 600 };
        const items: { label: string; color: string; dash?: string; swatch?: boolean }[] = [
          { label: 'Đường cắt (CutContour)', color: '#EC008C' },
          { label: 'Mép dán keo', color: '#00A651', dash: '2 1.2' },
          { label: 'Vùng an toàn (cuộn miệng / gấp đáy)', color: '#00A0E9', dash: '1.6 1.2' },
          { label: `Lề xén ${CUP_BLEED_MM}mm`, color: '#999999', dash: '0.6 0.8' },
        ];
        let x = DIE_MARGIN;
        const row2: ReactNode[] = items.map((it, i) => {
          const x0 = x; x += 7 + textW(it.label, fs, lt) + 5;
          return (
            <g key={i}>
              <line x1={x0} x2={x0 + 5} y1={ly + 4.6 - fs * 0.35} y2={ly + 4.6 - fs * 0.35} stroke={it.color} strokeWidth={0.5} strokeDasharray={it.dash} />
              <text x={x0 + 7} y={ly + 4.6} fill={it.color === '#999999' ? '#555' : it.color}>{it.label}</text>
            </g>
          );
        });
        const head = ik.spots.length ? `In trực tiếp ${ik.spots.length} màu pha (không in nền):` : 'In offset 4 màu (CMYK) trên giấy tráng PE · nền tràn lề xén';
        let sx = DIE_MARGIN + textW(head, fs, lt) + 4;
        const row3: ReactNode[] = ik.spots.map((c, i) => {
          const x0 = sx, lab = `Màu ${i + 1}: ${c.toUpperCase()}`; sx += 5 + textW(lab, fs, lt) + 5;
          return (
            <g key={c}>
              <rect x={x0} y={ly + 9.2 - fs * 0.8} width={3.4} height={3.4 * 0.8} fill={c} />
              <text x={x0 + 4.4} y={ly + 9.2} fill={c}>{lab}</text>
            </g>
          );
        });
        return (
          <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill="#333">
            <text x={DIE_MARGIN} y={ly}>{`${sz.name} · Ø miệng ${sz.dt} / Ø đáy ${sz.db} · cao ${sz.h}mm · khuôn quạt R ${g.R.toFixed(1)} / r ${g.r.toFixed(1)}mm · góc ${((g.theta * 180) / Math.PI).toFixed(2)} độ (+ mép dán ${CUP_GLUE_MM}mm)`}</text>
            {row2}
            <text x={DIE_MARGIN} y={ly + 9.2}>{head}</text>
            {row3}
          </g>
        );
      })()}
    </svg>
  );
}
