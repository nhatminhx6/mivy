'use client';
// Giấy gói quà in logo: 1 Ô LẶP (tile) liền mạch → lát kín khổ giấy. Engine SVG 100% code, đơn vị mm.
// Liền mạch: mỗi hoạ tiết đặt trên lưới trong ô [0,T]², hoạ tiết chạm mép được vẽ lặp thêm ở ±T (dịch ô)
// rồi cắt theo ô → ghép ô cạnh nhau không lộ đường nối. Hoạ tiết = hình vẽ code (lá, hoa mai, tuyết, bóng bay…)
// + tên shop / logo. Couche in màu (1–3 màu + nền), kraft & pelure in 1 màu (nền giấy không in).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- loại giấy ----------
export type GWKind = 'couche' | 'kraft' | 'pelure';
export interface GWKindDef { id: GWKind; name: string; sheet: [number, number]; note: string; maxColors: number }
export const GW_KINDS: GWKindDef[] = [
  { id: 'couche', name: 'Giấy couche in màu', sheet: [500, 700], note: 'Couche 80gsm · in màu, nền in kín', maxColors: 3 },
  { id: 'kraft', name: 'Giấy kraft in 1 màu', sheet: [500, 700], note: 'Kraft 70gsm · nền giấy nâu, in 1 màu mực', maxColors: 1 },
  { id: 'pelure', name: 'Giấy pelure (lụa mỏng)', sheet: [500, 750], note: 'Pelure 17gsm · gói quần áo, in 1 màu', maxColors: 1 },
];
export const gwKind = (id: string) => GW_KINDS.find((k) => k.id === id) || GW_KINDS[0];

export interface GWPalette { id: string; name: string; bg: string; c: [string, string, string] }
export const GW_PALETTES: GWPalette[] = [
  { id: 'blush', name: 'Hồng pastel', bg: '#F9E1E4', c: ['#C2456A', '#F29AB0', '#8C2F4B'] },
  { id: 'navy', name: 'Navy vàng', bg: '#14284B', c: ['#D9B45A', '#F3E6C4', '#6E86B5'] },
  { id: 'mint', name: 'Bạc hà', bg: '#DDF3EA', c: ['#2E8B72', '#F2A97F', '#1F5C4C'] },
  { id: 'candy', name: 'Kẹo đỏ trắng', bg: '#FFFFFF', c: ['#D7263D', '#F6B7C1', '#2B2D42'] },
  { id: 'sage', name: 'Xanh rêu kem', bg: '#F3EFE3', c: ['#6B8F71', '#C9A66B', '#3E5641'] },
  { id: 'tet', name: 'Đỏ Tết', bg: '#B3121F', c: ['#F2C14E', '#FFE7A3', '#FFFFFF'] },
  { id: 'noel', name: 'Noel', bg: '#1F4D3A', c: ['#E9473F', '#F6F1E7', '#E4B84D'] },
  { id: 'party', name: 'Tiệc vui', bg: '#FFF6DF', c: ['#FF6B6B', '#4D96FF', '#FFC93C'] },
  { id: 'luxe', name: 'Đen ánh vàng', bg: '#141414', c: ['#C9A45C', '#8C7444', '#E8D9B0'] },
  { id: 'lilac', name: 'Tím oải hương', bg: '#EEE6FA', c: ['#7B5EA7', '#F4B6C2', '#3D2E5C'] },
];
export const gwPalette = (id: string) => GW_PALETTES.find((p) => p.id === id) || GW_PALETTES[0];

// giấy không in nền (kraft / pelure) — màu giấy chỉ để xem trước
export interface GWPaper { id: string; name: string; hex: string; kinds: GWKind[] }
export const GW_PAPERS: GWPaper[] = [
  { id: 'kraft', name: 'Kraft nâu', hex: '#BE9C76', kinds: ['kraft'] },
  { id: 'kraft-white', name: 'Kraft trắng', hex: '#EFE8DA', kinds: ['kraft'] },
  { id: 'white', name: 'Trắng', hex: '#F6F5F1', kinds: ['pelure'] },
  { id: 'pink', name: 'Hồng phấn', hex: '#F6D6DB', kinds: ['pelure'] },
  { id: 'cream', name: 'Kem', hex: '#F2E6CF', kinds: ['pelure'] },
  { id: 'black', name: 'Đen', hex: '#1C1C1C', kinds: ['pelure'] },
];
export const gwPaper = (id: string) => GW_PAPERS.find((p) => p.id === id) || GW_PAPERS[0];
export const papersFor = (k: GWKind) => GW_PAPERS.filter((p) => p.kinds.includes(k));

export interface GWInk { id: string; name: string; hex: string }
export const GW_INKS: GWInk[] = [
  { id: 'black', name: 'Đen', hex: '#1E1E1E' },
  { id: 'brown', name: 'Nâu đậm', hex: '#4A2E1A' },
  { id: 'red', name: 'Đỏ', hex: '#B3202A' },
  { id: 'navy', name: 'Xanh navy', hex: '#1F3A68' },
  { id: 'forest', name: 'Xanh rêu', hex: '#2F5D46' },
  { id: 'rose', name: 'Hồng đậm', hex: '#C24D72' },
  { id: 'gold', name: 'Vàng đồng', hex: '#B8914A' },
  { id: 'white', name: 'Trắng', hex: '#FFFFFF' },
];
export const gwInk = (id: string) => GW_INKS.find((i) => i.id === id) || GW_INKS[0];
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
/** mực gần màu giấy quá → in ra khó thấy */
export const inkTooClose = (ink: string, paper: string) => Math.abs(lum(gwInk(ink).hex) - lum(gwPaper(paper).hex)) < 0.22;

// ---------- font (đều có TTF trong /public/fonts → outline được) ----------
export interface GWFont { id: string; name: string; family: string; weight: number }
export const GW_FONTS: GWFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
  { id: 'vibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400 },
];
export const gwFont = (id: string) => GW_FONTS.find((f) => f.id === id) || GW_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const GW_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Baloo+2:wght@800&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

export function useGWFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-gw-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-gw-fonts'; link.rel = 'stylesheet';
        link.href = GW_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...GW_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- kiểu hoạ tiết ----------
export interface GWStyle { id: string; name: string; rot: boolean }
export const GW_STYLES: GWStyle[] = [
  { id: 'logo', name: 'Logo so le', rot: true },
  { id: 'diag', name: 'Chữ chéo', rot: true },
  { id: 'dots', name: 'Chấm bi', rot: false },
  { id: 'stripes', name: 'Kẻ sọc', rot: false },
  { id: 'floral', name: 'Hoa lá', rot: true },
  { id: 'tet', name: 'Tết', rot: true },
  { id: 'noel', name: 'Noel', rot: true },
  { id: 'birthday', name: 'Sinh nhật', rot: true },
  { id: 'monogram', name: 'Monogram', rot: false },
];
export const gwStyle = (id: string) => GW_STYLES.find((s) => s.id === id) || GW_STYLES[0];

export const GW_DENSITY = [{ n: 2, name: 'Thưa' }, { n: 4, name: 'Vừa' }, { n: 6, name: 'Dày' }] as const;

export interface GWSpec {
  style: string; kind: GWKind; palette: string; paper: string; ink: string; font: string;
  tileMm: number; n: number; rot: number; colors: number;
}
export interface GWTemplate { id: string; name: string; spec: GWSpec }
const T = (id: string, name: string, s: Partial<GWSpec> & Pick<GWSpec, 'style'>): GWTemplate => ({
  id, name, spec: { kind: 'couche', palette: 'blush', paper: 'kraft', ink: 'black', font: 'montserrat', tileMm: 80, n: 4, rot: 0, colors: 2, ...s },
});
export const GW_TEMPLATES: GWTemplate[] = [
  T('logo-blush', 'Logo so le · hồng', { style: 'logo', palette: 'blush', font: 'playfair', colors: 2 }),
  T('diag-navy', 'Chữ chéo · navy vàng', { style: 'diag', palette: 'navy', font: 'montserrat', rot: -30, colors: 2, tileMm: 90 }),
  T('dots-mint', 'Chấm bi · bạc hà', { style: 'dots', palette: 'mint', font: 'baloo', colors: 2, tileMm: 70 }),
  T('stripes-candy', 'Kẻ sọc · kẹo', { style: 'stripes', palette: 'candy', font: 'montserrat', colors: 2, tileMm: 80 }),
  T('floral-sage', 'Hoa lá · xanh rêu', { style: 'floral', palette: 'sage', font: 'cormorant', colors: 3, tileMm: 100 }),
  T('tet-red', 'Tết · đỏ vàng', { style: 'tet', palette: 'tet', font: 'playfair', colors: 2, tileMm: 100 }),
  T('noel-green', 'Noel · xanh đỏ', { style: 'noel', palette: 'noel', font: 'dancing', colors: 3, tileMm: 90 }),
  T('bday-party', 'Sinh nhật · tiệc vui', { style: 'birthday', palette: 'party', font: 'baloo', colors: 3, tileMm: 90 }),
  T('mono-luxe', 'Monogram · đen vàng', { style: 'monogram', palette: 'luxe', font: 'playfair', colors: 2, tileMm: 70 }),
  T('logo-lilac', 'Logo so le · tím', { style: 'logo', palette: 'lilac', font: 'vibes', colors: 1, tileMm: 70, n: 4 }),
  T('kraft-logo', 'Kraft · logo đen', { style: 'logo', kind: 'kraft', paper: 'kraft', ink: 'black', font: 'montserrat', colors: 1, tileMm: 80 }),
  T('kraft-floral', 'Kraft · hoa lá xanh rêu', { style: 'floral', kind: 'kraft', paper: 'kraft', ink: 'forest', font: 'cormorant', colors: 1, tileMm: 100 }),
  T('pelure-diag', 'Pelure · chữ chéo đen', { style: 'diag', kind: 'pelure', paper: 'white', ink: 'black', font: 'montserrat', rot: -30, colors: 1, tileMm: 80 }),
  T('pelure-mono', 'Pelure · monogram hồng', { style: 'monogram', kind: 'pelure', paper: 'pink', ink: 'rose', font: 'playfair', colors: 1, tileMm: 60 }),
];

export type GWData = Record<string, string>;
export interface GWField { key: string; label: string; ph?: string; half?: boolean }
export const GW_FIELDS: GWField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'THU HÀ BOUTIQUE' },
  { key: 'slogan', label: 'Dòng nhỏ (lời cảm ơn, slogan)', ph: 'Cảm ơn bạn đã ủng hộ', half: true },
  { key: 'initials', label: 'Chữ viết tắt (monogram)', ph: 'Tự lấy từ tên shop', half: true },
];
export const defaultGWData = (): GWData => ({ brand: 'THU HÀ BOUTIQUE', slogan: 'Cảm ơn bạn đã ủng hộ', initials: '' });

const STOP = new Set(['shop', 'store', 'the', 'nhà', 'tiệm', 'cửa', 'hàng', 'công', 'ty']);
export function initialsOf(d: GWData): string {
  const own = (d.initials || '').trim();
  if (own) return own.slice(0, 3).toUpperCase();
  const w = (d.brand || '').trim().split(/\s+/).filter((x) => x && !STOP.has(x.toLowerCase()));
  return (w.slice(0, 2).map((x) => x[0]).join('') || 'M').toUpperCase();
}

/** logo khách (đã tô màu): href là PNG nền trong */
export interface GWLogo { href: string; w: number; h: number }
/** mask (trắng = mực, từ logoToMask) → PNG nền trong 1 màu mực */
export async function tintMask(maskHref: string, hex: string): Promise<GWLogo> {
  const im = new Image(); im.src = maskHref; await im.decode();
  const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  x.drawImage(im, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height); const p = d.data;
  const n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  for (let i = 0; i < p.length; i += 4) { const a = p[i]; p[i] = r; p[i + 1] = g; p[i + 2] = b; p[i + 3] = a; }
  x.putImageData(d, 0, 0);
  return { href: c.toDataURL('image/png'), w: c.width, h: c.height };
}
/** logo màu (couche): thu nhỏ, giữ màu, nền trong */
export async function colorLogo(src: string): Promise<GWLogo> {
  const im = new Image(); im.src = src; await im.decode();
  const k = Math.min(1, 600 / Math.max(im.naturalWidth, im.naturalHeight));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
  c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
  return { href: c.toDataURL('image/png'), w: c.width, h: c.height };
}

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function measure(t: string, size: number, fam: string, wt: number): number {
  if (typeof document === 'undefined') return t.length * size * 0.6;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return t.length * size * 0.6;
  mctx.font = `${wt} ${size * 10}px "${fam}"`;
  return mctx.measureText(t).width / 10;
}
/** cỡ chữ lớn nhất ≤ size sao cho chữ (xoay rot°) lọt khung w×h */
function fitSize(t: string, size: number, fam: string, wt: number, w: number, h: number, rotDeg = 0): number {
  const a = Math.abs((rotDeg * Math.PI) / 180), cs = Math.cos(a), sn = Math.sin(a);
  const tw = measure(t, 1, fam, wt), th = 0.9; // chiều cao chữ ≈ 0.9 × cỡ
  const kw = w / (tw * cs + th * sn), kh = h / (tw * sn + th * cs);
  return Math.max(0.6, Math.min(size, kw, kh));
}

// ---------- RNG cố định (ô lặp ổn định giữa các lần render) ----------
function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---------- hoạ tiết ----------
interface Motif { x: number; y: number; r: number; node: (key: string) => ReactNode }

const star = (r: number, k = 5, inner = 0.45) => {
  let d = '';
  for (let i = 0; i < k * 2; i++) {
    const a = (Math.PI * i) / k - Math.PI / 2, rr = i % 2 ? r * inner : r;
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`;
  }
  return d + 'Z';
};
const heart = (s: number) => `M0 ${0.3 * s} C ${-0.9 * s} ${-0.35 * s} ${-0.45 * s} ${-0.95 * s} 0 ${-0.45 * s} C ${0.45 * s} ${-0.95 * s} ${0.9 * s} ${-0.35 * s} 0 ${0.3 * s}Z`;
const leaf = (l: number, w: number) => `M0 0 C ${w} ${-l * 0.3} ${w * 0.8} ${-l * 0.8} 0 ${-l} C ${-w * 0.8} ${-l * 0.8} ${-w} ${-l * 0.3} 0 0Z`;

function Flower({ r, petal, center }: { r: number; petal: string; center: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={0} cy={-r * 0.55} rx={r * 0.36} ry={r * 0.5} fill={petal} transform={`rotate(${i * 72})`} />)}
      <circle r={r * 0.28} fill={center} />
    </g>
  );
}
function Snow({ r, c }: { r: number; c: string }) {
  const sw = r * 0.11;
  return (
    <g stroke={c} strokeWidth={sw} strokeLinecap="round" fill="none">
      {[0, 60, 120].map((a) => <line key={a} x1={0} y1={-r} x2={0} y2={r} transform={`rotate(${a})`} />)}
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <g key={a} transform={`rotate(${a})`}><path d={`M${-r * 0.28} ${-r * 0.78} L0 ${-r * 0.55} L${r * 0.28} ${-r * 0.78}`} /></g>
      ))}
    </g>
  );
}
function Tree({ s, c, c2 }: { s: number; c: string; c2: string }) {
  return (
    <g>
      <path d={`M0 ${-s} L${s * 0.42} ${-s * 0.35} L${s * 0.2} ${-s * 0.35} L${s * 0.55} ${s * 0.3} L${-s * 0.55} ${s * 0.3} L${-s * 0.2} ${-s * 0.35} L${-s * 0.42} ${-s * 0.35}Z`} fill={c} />
      <rect x={-s * 0.09} y={s * 0.3} width={s * 0.18} height={s * 0.22} fill={c2} />
      <path d={star(s * 0.16)} transform={`translate(0 ${-s})`} fill={c2} />
    </g>
  );
}
function Balloon({ s, c, string }: { s: number; c: string; string: string }) {
  return (
    <g>
      <path d={`M0 ${s * 0.42} q ${s * 0.12} ${s * 0.25} ${-s * 0.06} ${s * 0.5} q ${-s * 0.15} ${s * 0.2} ${s * 0.04} ${s * 0.42}`} stroke={string} strokeWidth={s * 0.04} fill="none" />
      <ellipse cx={0} cy={-s * 0.05} rx={s * 0.36} ry={s * 0.46} fill={c} />
      <path d={`M${-s * 0.07} ${s * 0.44} L${s * 0.07} ${s * 0.44} L0 ${s * 0.36}Z`} fill={c} />
    </g>
  );
}
function GiftMini({ s, c, r }: { s: number; c: string; r: string }) {
  return (
    <g>
      <rect x={-s * 0.4} y={-s * 0.2} width={s * 0.8} height={s * 0.6} fill={c} />
      <rect x={-s * 0.46} y={-s * 0.34} width={s * 0.92} height={s * 0.18} fill={c} />
      <rect x={-s * 0.07} y={-s * 0.34} width={s * 0.14} height={s * 0.74} fill={r} />
      <path d={`M0 ${-s * 0.34} C ${-s * 0.3} ${-s * 0.65} ${-s * 0.42} ${-s * 0.3} 0 ${-s * 0.34} C ${s * 0.42} ${-s * 0.3} ${s * 0.3} ${-s * 0.65} 0 ${-s * 0.34}Z`} fill={r} />
    </g>
  );
}
function Coin({ r, c }: { r: number; c: string }) {
  return (
    <g>
      <circle r={r} fill={c} />
      <circle r={r * 0.78} fill="none" stroke="#00000022" strokeWidth={r * 0.06} />
      <rect x={-r * 0.24} y={-r * 0.24} width={r * 0.48} height={r * 0.48} fill="#00000038" />
    </g>
  );
}
function Mai({ r, petal, center }: { r: number; petal: string; center: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M0 0 C ${r * 0.5} ${-r * 0.3} ${r * 0.45} ${-r} 0 ${-r} C ${-r * 0.45} ${-r} ${-r * 0.5} ${-r * 0.3} 0 0Z`} fill={petal} transform={`rotate(${i * 72})`} />)}
      <circle r={r * 0.22} fill={center} />
      {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={0} cy={-r * 0.38} r={r * 0.06} fill={center} transform={`rotate(${i * 72 + 36})`} />)}
    </g>
  );
}

// ---------- dựng danh sách hoạ tiết trong ô [0,T]² ----------
interface Ctx { T: number; n: number; rot: number; cols: string[]; bg: string; font: GWFont; data: GWData; logo: GWLogo | null; ini: string }

function textMotif(x: number, y: number, t: string, size: number, fam: string, wt: number, fill: string, rot: number, ls = 0): Motif {
  const w = measure(t, size, fam, wt) + ls * size * Math.max(0, t.length - 1);
  return {
    x, y, r: Math.hypot(w / 2, size * 0.6),
    node: (k) => (
      <text key={k} x={0} y={size * 0.34} textAnchor="middle" fontFamily={`"${fam}"`} fontWeight={wt} fontSize={size} fill={fill}
        letterSpacing={ls ? ls * size : undefined} transform={rot ? `rotate(${rot})` : undefined}>{t}</text>
    ),
  };
}

/** tên shop vừa khung; tên quá dài (chữ < 1.6mm) → dùng chữ viết tắt cho đọc được */
function brandFit(c: Ctx, brand: string, size: number, w: number, h: number, rot = 0): [string, number] {
  const f = c.font;
  const s = fitSize(brand, size, f.family, f.weight, w, h, rot);
  if (s >= 1.6 || brand === c.ini) return [brand, s];
  return [c.ini, fitSize(c.ini, size, f.family, f.weight, w, h, rot)];
}

/** dấu thương hiệu: logo khách hoặc huy hiệu tròn chữ viết tắt */
function brandMark(c: Ctx, x: number, y: number, s: number, fill: string, ring: string, rot: number): Motif {
  if (c.logo) {
    const k = s / Math.max(c.logo.w, c.logo.h), w = c.logo.w * k, h = c.logo.h * k;
    return { x, y, r: Math.hypot(w, h) / 2, node: (key) => <g key={key} transform={rot ? `rotate(${rot})` : undefined}><image href={c.logo!.href} x={-w / 2} y={-h / 2} width={w} height={h} /></g> };
  }
  const f = c.font, ini = c.ini;
  const fs = fitSize(ini, s * 0.42, f.family, f.weight, s * 0.62, s * 0.5);
  return {
    x, y, r: s * 0.52,
    node: (key) => (
      <g key={key} transform={rot ? `rotate(${rot})` : undefined}>
        <circle r={s * 0.48} fill="none" stroke={ring} strokeWidth={s * 0.045} />
        <circle r={s * 0.39} fill="none" stroke={ring} strokeWidth={s * 0.018} />
        <text x={0} y={fs * 0.34} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fs} fill={fill}>{ini}</text>
      </g>
    ),
  };
}

function motifs(style: string, c: Ctx): Motif[] {
  const { T, rot, cols, font, data } = c;
  const n = Math.max(2, c.n % 2 ? c.n + 1 : c.n); // số ô lưới chẵn → lưới so le khép kín
  const cell = T / n;
  const C = (i: number) => cols[i % cols.length];
  const brand = (data.brand || '').trim() || 'MIVY';
  const out: Motif[] = [];
  const R = rng(7 + style.length * 31 + n * 3);

  if (style === 'logo') {
    // so le (half-drop): cột lẻ dịch nửa ô; xen kẽ dấu logo và tên shop
    for (let ci = 0; ci < n; ci++) for (let ri = 0; ri < n / 2; ri++) {
      const x = (ci + 0.5) * cell, y = (ri * 2 + 0.5 + (ci % 2)) * cell;
      const alt = (ci + ri) % 2;
      if (!alt) out.push(brandMark(c, x, y, cell * 0.95, C(0), C(cols.length > 1 ? 1 : 0), rot));
      else {
        const [bt, s] = brandFit(c, brand, cell * 0.3, cell * 1.7, cell * 0.8, rot);
        out.push(textMotif(x, y, bt, s, font.family, font.weight, C(cols.length > 2 ? 2 : 0), rot));
      }
    }
  } else if (style === 'diag') {
    // chữ chéo: hàng chữ so le, mỗi chữ xoay rot°
    const rows = n, perRow = Math.max(1, n / 2), cw = T / perRow, rh = T / rows;
    const [bt, s] = brandFit(c, brand, rh * 0.62, cw * 0.92, rh * 1.6, rot);
    for (let ri = 0; ri < rows; ri++) for (let k = 0; k < perRow; k++) {
      const x = (k + 0.5 + (ri % 2) * 0.5) * cw, y = (ri + 0.5) * rh;
      out.push(textMotif(x, y, bt, s, font.family, font.weight, C(ri % 2 && cols.length > 1 ? 1 : 0), rot));
    }
  } else if (style === 'dots') {
    for (let ci = 0; ci < n; ci++) for (let ri = 0; ri < n; ri++) {
      const x = (ci + 0.5) * cell, y = (ri + 0.5 + (ci % 2) * 0.5) * cell;
      const big = (ci + ri) % 2 === 0;
      const dr = big ? cell * 0.2 : cell * 0.1;
      const fill = big ? C(0) : C(cols.length > 1 ? 1 : 0);
      out.push({ x, y, r: dr, node: (k) => <circle key={k} r={dr} fill={fill} /> });
    }
    // tên shop nhỏ rải 1 lần / 2 hàng
    const [bt, s] = brandFit(c, brand, cell * 0.16, cell * 1.6, cell * 0.4);
    for (let ci = 0; ci < n; ci += 2) out.push(textMotif((ci + 1) * cell, (ci % 4 ? 0.5 : 1.5) * cell + cell * 0.02, bt, s, font.family, font.weight, C(cols.length > 2 ? 2 : 0), 0));
  } else if (style === 'stripes') {
    // sọc chéo 45°: đường x − y = k·p, p = T/n → khép kín theo cả 2 chiều
    const p = cell, sw = p * 0.42;
    for (let k = -n; k <= n; k++) {
      const x0 = k * p;
      const pts = `${x0 - sw / 2} 0 ${x0 + sw / 2} 0 ${x0 + sw / 2 + T} ${T} ${x0 - sw / 2 + T} ${T}`;
      const fill = cols.length > 1 && ((k % 2) + 2) % 2 ? C(1) : C(0);
      out.push({ x: T / 2, y: T / 2, r: 0, node: (key) => <polygon key={`${key}s${k}`} points={pts} transform={`translate(${-T / 2} ${-T / 2})`} fill={fill} /> });
    }
    // tên shop chạy giữa dải nền, xoay theo hướng sọc
    const [bt, s] = brandFit(c, brand, p * 0.22, p * 2.2, p * 0.34);
    for (let k = 0; k < n; k += 1) {
      const t = (k + 0.5) * p; // tâm dải nền giữa 2 sọc: x − y = (k+0.5)p
      const cx = (t + T) / 2 % T, cy = (T - t) / 2 % T;
      out.push(textMotif(cx, cy, bt, s, font.family, font.weight, C(cols.length > 2 ? 2 : 0), 45));
    }
  } else if (style === 'monogram') {
    // lưới thoi: chữ viết tắt trong khung tròn đôi xen hoa 4 cánh
    const ini = c.ini;
    for (let ci = 0; ci < n; ci++) for (let ri = 0; ri < n / 2; ri++) {
      const x = (ci + 0.5) * cell, y = (ri * 2 + 0.5 + (ci % 2)) * cell;
      if ((ci + ri) % 2 === 0) {
        const fs = fitSize(ini, cell * 0.42, font.family, font.weight, cell * 0.62, cell * 0.5);
        const ring = C(cols.length > 1 ? 1 : 0);
        out.push({
          x, y, r: cell * 0.5,
          node: (k) => (
            <g key={k}>
              <path d={`M0 ${-cell * 0.46} L${cell * 0.46} 0 L0 ${cell * 0.46} L${-cell * 0.46} 0Z`} fill="none" stroke={ring} strokeWidth={cell * 0.025} />
              <text x={0} y={fs * 0.34} textAnchor="middle" fontFamily={`"${font.family}"`} fontWeight={font.weight} fontSize={fs} fill={C(0)}>{ini}</text>
            </g>
          ),
        });
      } else {
        const q = cell * 0.17;
        out.push({
          x, y, r: q * 2,
          node: (k) => (
            <g key={k} fill={C(0)}>
              {[0, 90, 180, 270].map((a) => <circle key={a} cx={0} cy={-q} r={q * 0.8} transform={`rotate(${a})`} />)}
              {cols.length > 1 && <circle r={q * 0.45} fill={C(1)} />}{/* 1 màu: không in màu giấy (pelure/kraft không có mực trắng nền) */}
            </g>
          ),
        });
      }
    }
  } else {
    // rải ngẫu nhiên có trật tự (lưới rung) — hoa lá / Tết / Noel / sinh nhật + tên shop nhỏ
    for (let ci = 0; ci < n; ci++) for (let ri = 0; ri < n; ri++) {
      const x = (ci + 0.5 + (R() - 0.5) * 0.4) * cell, y = (ri + 0.5 + (ci % 2) * 0.5 + (R() - 0.5) * 0.35) * cell;
      const a = rot + (R() - 0.5) * 50, s = cell * (0.55 + R() * 0.25);
      const pick = (ci * 3 + ri * 5 + Math.floor(R() * 3)) % 4;
      const tx = `rotate(${a.toFixed(1)})`;
      if ((ci + ri) % 4 === 1) { // ô dành cho tên shop
        const [bt, fs] = brandFit(c, brand, cell * 0.2, cell * 1.5, cell * 0.5, rot);
        out.push(textMotif(x, y, bt, fs, font.family, font.weight, C(0), rot));
        continue;
      }
      let node: (k: string) => ReactNode;
      if (style === 'floral') {
        node = pick === 0 ? (k) => <g key={k} transform={tx}><Flower r={s * 0.42} petal={C(0)} center={C(cols.length > 1 ? 1 : 0)} /></g>
          : pick === 1 ? (k) => <g key={k} transform={tx}><path d={leaf(s * 0.75, s * 0.24)} fill={C(cols.length > 2 ? 2 : 0)} /><path d={leaf(s * 0.55, s * 0.18)} fill={C(cols.length > 2 ? 2 : 0)} transform="rotate(60)" /></g>
          : pick === 2 ? (k) => <g key={k} transform={tx}><path d={leaf(s * 0.7, s * 0.22)} fill={C(cols.length > 1 ? 1 : 0)} transform="rotate(-40)" /><circle r={s * 0.08} fill={C(0)} /></g>
          : (k) => <g key={k} transform={tx}>{[0, 1, 2].map((i) => <circle key={i} cx={(i - 1) * s * 0.18} cy={(i % 2) * s * 0.14} r={s * 0.07} fill={C(i % cols.length)} />)}</g>;
      } else if (style === 'tet') {
        node = pick === 0 ? (k) => <g key={k} transform={tx}><Mai r={s * 0.4} petal={C(0)} center={C(cols.length > 1 ? 1 : 0)} /></g>
          : pick === 1 ? (k) => <g key={k} transform={tx}><Coin r={s * 0.28} c={C(0)} /></g>
          : pick === 2 ? (k) => <g key={k} transform={tx}><Mai r={s * 0.26} petal={C(cols.length > 1 ? 1 : 0)} center={C(0)} /></g>
          : (k) => <g key={k} transform={tx}><path d={star(s * 0.16, 4, 0.35)} fill={C(cols.length > 2 ? 2 : 0)} /></g>;
      } else if (style === 'noel') {
        node = pick === 0 ? (k) => <g key={k} transform={tx}><Snow r={s * 0.38} c={C(cols.length > 1 ? 1 : 0)} /></g>
          : pick === 1 ? (k) => <g key={k} transform={`rotate(${(rot + (a - rot) * 0.2).toFixed(1)})`}><Tree s={s * 0.42} c={C(0)} c2={C(cols.length > 2 ? 2 : 0)} /></g>
          : pick === 2 ? (k) => <g key={k} transform={tx}><path d={star(s * 0.24)} fill={C(cols.length > 2 ? 2 : 0)} /></g>
          : (k) => <g key={k}><circle r={s * 0.09} fill={C(cols.length > 1 ? 1 : 0)} /></g>;
      } else { // birthday
        node = pick === 0 ? (k) => <g key={k} transform={`rotate(${((a - rot) * 0.3 + rot).toFixed(1)})`}><Balloon s={s * 0.62} c={C(0)} string={C(cols.length > 2 ? 2 : 0)} /></g>
          : pick === 1 ? (k) => <g key={k} transform={tx}><GiftMini s={s * 0.5} c={C(cols.length > 1 ? 1 : 0)} r={C(cols.length > 2 ? 2 : 0)} /></g>
          : pick === 2 ? (k) => <g key={k} transform={tx}><path d={star(s * 0.2)} fill={C(cols.length > 2 ? 2 : 0)} /><rect x={s * 0.24} y={-s * 0.2} width={s * 0.1} height={s * 0.04} fill={C(0)} /></g>
          : (k) => <g key={k} transform={tx}><path d={heart(s * 0.32)} fill={C(0)} /></g>;
      }
      out.push({ x, y, r: s * 0.62, node });
    }
  }
  return out;
}

/** nội dung 1 ô lặp: hoạ tiết + bản sao ở ±T với hoạ tiết chạm mép (rồi cắt theo ô ở ngoài) */
function tileBody(style: string, c: Ctx): ReactNode[] {
  const T = c.T, nodes: ReactNode[] = [];
  motifs(style, c).forEach((m, i) => {
    for (const dx of [-T, 0, T]) for (const dy of [-T, 0, T]) {
      const x = m.x + dx, y = m.y + dy;
      // r = 0 (dải sọc dài) → luôn vẽ đủ 9 bản sao
      if (m.r && (x + m.r < 0 || x - m.r > T || y + m.r < 0 || y - m.r > T)) continue;
      nodes.push(<g key={`${i}_${dx}_${dy}`} transform={`translate(${(x).toFixed(3)} ${(y).toFixed(3)})`}>{m.node(`m${i}`)}</g>);
    }
  });
  return nodes;
}

export interface GWLook { paper: string; colors: string[]; printBg: boolean }
/** màu dùng thực tế (giới hạn theo số màu + loại giấy) */
export function gwLook(spec: GWSpec): GWLook {
  if (spec.kind === 'couche') {
    const p = gwPalette(spec.palette);
    return { paper: p.bg, colors: p.c.slice(0, Math.max(1, Math.min(3, spec.colors))), printBg: true };
  }
  return { paper: gwPaper(spec.paper).hex, colors: [gwInk(spec.ink).hex], printBg: false };
}

export type GWMode = 'tile' | 'print-tile' | 'swatch' | 'sheet';

/**
 * tile       = 1 ô lặp có màu giấy (xem trước, texture 3D)
 * print-tile = 1 ô lặp đúng file in (kraft/pelure: không in nền)
 * swatch     = khung xem w×h mm lát nhiều ô (thumbnail, xem trước phẳng)
 * sheet      = cả tờ giấy đúng khổ + lề xén 3mm (file PDF)
 */
export function GiftwrapSvg({ spec, data, logo = null, mode = 'tile', box, style }: {
  spec: GWSpec; data: GWData; logo?: GWLogo | null; mode?: GWMode; box?: [number, number]; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const look = gwLook(spec);
  const Tm = Math.max(20, spec.tileMm);
  const c: Ctx = { T: Tm, n: spec.n, rot: gwStyle(spec.style).rot ? spec.rot : 0, cols: look.colors, bg: look.paper, font: gwFont(spec.font), data, logo, ini: initialsOf(data) };
  const body = tileBody(spec.style, c);
  const showBg = mode === 'tile' || mode === 'swatch' || look.printBg; // kraft/pelure: file in không in nền
  const clip = `gwc${uid}`, pat = `gwp${uid}`;
  const tile = (
    <>
      {showBg && <rect x={0} y={0} width={Tm} height={Tm} fill={look.paper} />}
      <g clipPath={`url(#${clip})`}>{body}</g>
    </>
  );
  const defsClip = <clipPath id={clip}><rect x={0} y={0} width={Tm} height={Tm} /></clipPath>;

  if (mode === 'tile' || mode === 'print-tile') {
    return (
      <svg viewBox={`0 0 ${Tm} ${Tm}`} width={`${Tm}mm`} height={`${Tm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-tile-mm={Tm}>
        <defs>{defsClip}</defs>
        {tile}
      </svg>
    );
  }
  const k = gwKind(spec.kind);
  const B = mode === 'sheet' ? 3 : 0;
  const [W, H] = mode === 'sheet' ? k.sheet : (box || [Tm * 2.5, Tm * 2.5]);
  // sheet: viewBox gồm lề xén; ô lặp neo tại góc thành phẩm
  return (
    <svg viewBox={`${-B} ${-B} ${W + B * 2} ${H + B * 2}`} width={mode === 'sheet' ? `${W + B * 2}mm` : undefined} height={mode === 'sheet' ? `${H + B * 2}mm` : undefined}
      xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid slice">
      <defs>
        {defsClip}
        <pattern id={pat} patternUnits="userSpaceOnUse" width={Tm} height={Tm}>{tile}</pattern>
      </defs>
      {mode === 'sheet' && !look.printBg ? null : <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={look.paper} />}
      <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={`url(#${pat})`} />
    </svg>
  );
}

/** màu mực xuất hiện trong ô (không kể nền giấy) — QC kiểm số màu */
export function inkColors(svg: SVGSVGElement, paper: string): string[] {
  const set = new Set<string>();
  svg.querySelectorAll('[fill],[stroke]').forEach((el) => {
    for (const a of ['fill', 'stroke']) {
      const v = (el.getAttribute(a) || '').toUpperCase();
      if (/^#[0-9A-F]{6}$/.test(v) && v !== paper.toUpperCase()) set.add(v);
    }
  });
  return [...set];
}
