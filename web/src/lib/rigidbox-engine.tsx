'use client';
// HỘP QUÀ CỨNG CAO CẤP (rigid box): bìa xám 2mm bồi giấy in. 3 kiểu: nắp rời · nam châm nắp gập · ngăn kéo.
// 1 thiết kế mặt (mm) dùng chung cho: khuôn giấy bồi (file in), khuôn ép kim (mask), texture 3D.
// Khuôn giấy bồi = mặt hộp + thành + phần gấp vào trong (turn-in 15mm) + tai góc, có lề xén 3mm, nét cắt/nét gấp.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- thông số ----------
export type RBKind = 'lid' | 'magnet' | 'drawer';
export const RB_KINDS: { id: RBKind; name: string; blurb: string }[] = [
  { id: 'lid', name: 'Hộp nắp rời', blurb: 'Nắp úp trùm đáy — quà Tết, trà, bánh' },
  { id: 'magnet', name: 'Hộp nam châm', blurb: 'Nắp gập liền, hít nam châm — mỹ phẩm, quà VIP' },
  { id: 'drawer', name: 'Hộp ngăn kéo', blurb: 'Áo ngoài + ngăn kéo có dây kéo' },
];

export type RBProduct = 'tet' | 'wine' | 'cosmetic' | 'jewelry' | 'tea';
export interface RBSize { id: string; name: string; w: number; d: number; h: number; product: RBProduct }
export const RB_SIZES: RBSize[] = [
  { id: 'tet', name: 'Quà Tết 30×25×10', w: 300, d: 250, h: 100, product: 'tet' },
  { id: 'wine', name: 'Rượu vang 35×12×12', w: 350, d: 120, h: 120, product: 'wine' },
  { id: 'cosmetic', name: 'Mỹ phẩm 20×15×6', w: 200, d: 150, h: 60, product: 'cosmetic' },
  { id: 'jewelry', name: 'Trang sức 10×10×4', w: 100, d: 100, h: 40, product: 'jewelry' },
  { id: 'tea', name: 'Bánh · trà 24×24×8', w: 240, d: 240, h: 80, product: 'tea' },
];
export const rbSize = (id: string) => RB_SIZES.find((s) => s.id === id) || RB_SIZES[0];

export const RB_T = 2;      // bìa xám 2mm
export const RB_TI = 15;    // giấy gấp vào trong
export const RB_BLEED = 3;  // lề xén
const EAR = 12;             // tai góc
const GAP = RB_T + 1;       // khe bản lề giữa 2 tấm bìa (hộp nam châm)
const M = RB_BLEED + 4;     // lề trang quanh khuôn

/** chiều cao nắp (hộp nắp rời) */
export const rbLidH = (s: RBSize) => Math.max(18, Math.min(50, Math.round(s.h * 0.42)));

// ---------- font ----------
export interface RBFont { id: string; name: string; family: string; weight: number }
export const RB_FONTS: RBFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const rbFont = (id: string) => RB_FONTS.find((f) => f.id === id) || RB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
export const RB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Montserrat:wght@800&family=Great+Vibes&display=swap');`;

export function useRBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-rb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-rb-fonts'; link.rel = 'stylesheet';
        link.href = RB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...RB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `400 40px "${SCRIPT}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu ----------
export interface RBPalette { id: string; name: string; paper: string; ink: string; sub: string; band: string; pattern: string; branch: string; tray: string; kraft?: boolean; shimmer?: boolean }
export const RB_PALETTES: RBPalette[] = [
  { id: 'red', name: 'Đỏ Tết', paper: '#B3141B', ink: '#FBE9C6', sub: '#F3C98B', band: '#7E0E12', pattern: '#C42A2F', branch: '#4A120C', tray: '#7E0E12' },
  { id: 'burgundy', name: 'Đỏ đô', paper: '#6E1423', ink: '#F5E6C8', sub: '#D9B98A', band: '#4A0D18', pattern: '#7E1D2E', branch: '#2E0810', tray: '#4A0D18' },
  { id: 'navy', name: 'Navy', paper: '#14284B', ink: '#F2EBDD', sub: '#B9C3D6', band: '#0B1A34', pattern: '#1D3561', branch: '#0A1428', tray: '#0C1A33' },
  { id: 'black', name: 'Đen nhũ', paper: '#171615', ink: '#EFE6D2', sub: '#A8A29A', band: '#2B2722', pattern: '#242220', branch: '#4A3A28', tray: '#1E1B18', shimmer: true },
  { id: 'kraft', name: 'Kraft mộc', paper: '#A27A50', ink: '#3B2716', sub: '#5C4128', band: '#8F6640', pattern: '#96704A', branch: '#3E2814', tray: '#F1E8D6', kraft: true },
  { id: 'pink', name: 'Pastel hồng', paper: '#F0D3CE', ink: '#5B2C2F', sub: '#8A5A5C', band: '#E2B5AE', pattern: '#E8C3BD', branch: '#7A4A44', tray: '#FFF5F1' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#0F5C57', ink: '#F3EAD3', sub: '#BFD8D2', band: '#0A403D', pattern: '#156B65', branch: '#062B29', tray: '#0A403D' },
  { id: 'cream', name: 'Trắng kem', paper: '#F3EDE1', ink: '#2B2A28', sub: '#6B655C', band: '#E2D6BF', pattern: '#EAE1CF', branch: '#5A4A38', tray: '#8E1B20' },
];
export const rbPalette = (id: string) => RB_PALETTES.find((p) => p.id === id) || RB_PALETTES[0];

export interface RBFoil { id: string; name: string; color: string; hi: string; lo: string }
export const RB_FOILS: RBFoil[] = [
  { id: 'gold', name: 'Ép kim vàng', color: '#D2AE5C', hi: '#F3DC9A', lo: '#A9802F' },
  { id: 'silver', name: 'Ép kim bạc', color: '#C9CED6', hi: '#F2F4F7', lo: '#959BA4' },
  { id: 'rose', name: 'Ép kim hồng', color: '#D8A28E', hi: '#F3CFC0', lo: '#AE7360' },
  { id: 'none', name: 'Không ép (in màu)', color: '', hi: '', lo: '' },
];
export const rbFoil = (id: string) => RB_FOILS.find((f) => f.id === id) || RB_FOILS[0];

export const RB_TRAYS: { id: string; name: string; color: string }[] = [
  { id: 'auto', name: 'Theo mẫu', color: '' },
  { id: 'red', name: 'Đỏ nhung', color: '#7E0E12' },
  { id: 'black', name: 'Đen nhung', color: '#1C1A18' },
  { id: 'navy', name: 'Navy nhung', color: '#13234A' },
  { id: 'cream', name: 'Kem', color: '#F1E8D6' },
  { id: 'champagne', name: 'Champagne', color: '#CDB58A' },
];

export type RBLayout = 'tet' | 'center' | 'frame' | 'band' | 'pattern' | 'minimal';
export const RB_LAYOUTS: { id: RBLayout; name: string }[] = [
  { id: 'tet', name: 'Cành mai Tết' },
  { id: 'center', name: 'Monogram giữa' },
  { id: 'frame', name: 'Khung góc' },
  { id: 'band', name: 'Dải ruy băng' },
  { id: 'pattern', name: 'Hoạ tiết lưới' },
  { id: 'minimal', name: 'Tối giản' },
];

export interface RBSpec { kind: RBKind; size: string; palette: string; layout: RBLayout; font: string; foil: string; tray: string; ribbon: boolean; logoFoil: boolean }
export interface RBTemplate { id: string; name: string; spec: Pick<RBSpec, 'palette' | 'layout' | 'font' | 'foil'> }
export const RB_TEMPLATES: RBTemplate[] = [
  { id: 'tet-red', name: 'Tết đỏ kim', spec: { layout: 'tet', palette: 'red', font: 'playfair', foil: 'gold' } },
  { id: 'tet-black', name: 'Tết đen vàng', spec: { layout: 'tet', palette: 'black', font: 'cormorant', foil: 'gold' } },
  { id: 'navy-frame', name: 'Navy khung góc', spec: { layout: 'frame', palette: 'navy', font: 'playfair', foil: 'gold' } },
  { id: 'black-mono', name: 'Đen nhũ monogram', spec: { layout: 'center', palette: 'black', font: 'cormorant', foil: 'gold' } },
  { id: 'burgundy-pattern', name: 'Đỏ đô hoạ tiết', spec: { layout: 'pattern', palette: 'burgundy', font: 'playfair', foil: 'gold' } },
  { id: 'kraft-minimal', name: 'Kraft tối giản', spec: { layout: 'minimal', palette: 'kraft', font: 'montserrat', foil: 'none' } },
  { id: 'pink-mono', name: 'Pastel hồng', spec: { layout: 'center', palette: 'pink', font: 'cormorant', foil: 'rose' } },
  { id: 'teal-band', name: 'Xanh ngọc dải', spec: { layout: 'band', palette: 'teal', font: 'montserrat', foil: 'gold' } },
  { id: 'cream-frame', name: 'Trắng kem khung', spec: { layout: 'frame', palette: 'cream', font: 'playfair', foil: 'gold' } },
  { id: 'navy-pattern', name: 'Navy lưới bạc', spec: { layout: 'pattern', palette: 'navy', font: 'bvp', foil: 'silver' } },
  { id: 'kraft-tet', name: 'Kraft Tết', spec: { layout: 'tet', palette: 'kraft', font: 'playfair', foil: 'gold' } },
  { id: 'black-band', name: 'Đen dải vàng', spec: { layout: 'band', palette: 'black', font: 'playfair', foil: 'gold' } },
];

export type RBData = Record<string, string>;
export const RB_FIELDS: { key: string; label: string; ph: string; half?: boolean }[] = [
  { key: 'brand', label: 'Thương hiệu', ph: 'AN KHANG', half: true },
  { key: 'tagline', label: 'Dòng phụ', ph: 'Trà & quà Tết thượng hạng', half: true },
  { key: 'greeting', label: 'Lời chúc / năm', ph: 'Xuân Đinh Mùi 2027' },
  { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn', half: true },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456', half: true },
];
export const defaultRBData = (): RBData => ({
  brand: 'AN KHANG', tagline: 'Trà & quà Tết thượng hạng', greeting: 'Xuân Đinh Mùi 2027', website: 'ankhang.vn', hotline: '0909 123 456',
});

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
/** bề rộng (mm) của chuỗi ở cỡ `size` mm */
export function textW(t: string, size: number, fam: string, wt: number, lsEm = 0): number {
  const n = [...(t || '')].length;
  if (typeof document === 'undefined') return n * size * 0.6;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return n * size * 0.6;
  mctx.font = `${wt} 40px "${fam}"`;
  return (mctx.measureText(t || '').width / 40) * size + lsEm * size * Math.max(0, n - 1);
}
const fitTo = (t: string, maxW: number, size: number, fam: string, wt: number, ls = 0) => {
  const w1 = textW(t, 1, fam, wt, ls);
  return w1 > 0 ? Math.min(size, maxW / w1) : size;
};

// ---------- chế độ vẽ ----------
/** color: in màu thật · mask: khuôn ép kim cho 3D (kim = trắng/nền đen) · print-mask: khuôn ép kim in (kim = đen/nền trắng) */
export type RBMode = 'color' | 'mask' | 'print-mask';
interface Ctx { mode: RBMode; p: RBPalette; f: RBFont; foil: RBFoil; spec: RBSpec; data: RBData; logo?: string; uid: string }
const isColor = (c: Ctx) => c.mode === 'color';
const hasFoil = (c: Ctx) => c.foil.id !== 'none';
/** màu chi tiết ép kim: in màu → nhũ (gradient) / không ép → màu mực; mask → trắng/đen */
const foilFill = (c: Ctx) => (c.mode === 'mask' ? '#FFFFFF' : c.mode === 'print-mask' ? '#000000' : hasFoil(c) ? `url(#${c.uid}-fg)` : c.p.ink);
const foilFlat = (c: Ctx) => (c.mode === 'mask' ? '#FFFFFF' : c.mode === 'print-mask' ? '#000000' : hasFoil(c) ? c.foil.color : c.p.ink);
/** chi tiết KHÔNG ép kim: chỉ vẽ ở chế độ màu (khuôn ép bỏ qua) */
const ink = (c: Ctx, col: string) => (isColor(c) ? col : 'none');
const maskBg = (c: Ctx) => (c.mode === 'mask' ? '#000000' : '#FFFFFF');

function FoilDefs({ c }: { c: Ctx }) {
  if (!isColor(c) || !hasFoil(c)) return null;
  return (
    <linearGradient id={`${c.uid}-fg`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={c.foil.lo} />
      <stop offset="0.35" stopColor={c.foil.hi} />
      <stop offset="0.6" stopColor={c.foil.color} />
      <stop offset="1" stopColor={c.foil.lo} />
    </linearGradient>
  );
}

const initials = (s: string) => (s || 'M').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => [...w][0]).join('').toUpperCase();

// mai: 5 cánh tròn + nhuỵ
function Mai({ cx, cy, r, c, rot = 0 }: { cx: number; cy: number; r: number; c: Ctx; rot?: number }) {
  const ps = Array.from({ length: 5 }, (_, i) => {
    const a = ((i * 72 + rot) * Math.PI) / 180;
    return <circle key={i} cx={cx + Math.cos(a) * r * 0.52} cy={cy + Math.sin(a) * r * 0.52} r={r * 0.5} />;
  });
  return (
    <g>
      <g fill={foilFill(c)}>{ps}</g>
      <circle cx={cx} cy={cy} r={r * 0.22} fill={isColor(c) ? c.p.branch : 'none'} opacity={0.75} />
    </g>
  );
}

// cành mai từ góc trên trái chéo xuống
function MaiBranch({ w, h, c }: { w: number; h: number; c: Ctx }) {
  const S = Math.min(w, h);
  const sw = S * 0.016;
  const p = (x: number, y: number) => `${(x * w).toFixed(1)} ${(y * h).toFixed(1)}`;
  const main = `M${p(-0.02, 0.06)} C${p(0.12, 0.1)} ${p(0.2, 0.22)} ${p(0.3, 0.26)} S${p(0.44, 0.3)} ${p(0.52, 0.42)}`;
  const twig1 = `M${p(0.17, 0.15)} C${p(0.2, 0.06)} ${p(0.26, 0.04)} ${p(0.32, 0.02)}`;
  const twig2 = `M${p(0.3, 0.26)} C${p(0.33, 0.36)} ${p(0.3, 0.44)} ${p(0.26, 0.5)}`;
  const twig3 = `M${p(0.42, 0.31)} C${p(0.5, 0.26)} ${p(0.56, 0.24)} ${p(0.62, 0.22)}`;
  const fl: [number, number, number][] = [[0.1, 0.09, 1], [0.32, 0.02, 0.8], [0.23, 0.2, 1.1], [0.27, 0.49, 0.9], [0.37, 0.27, 0.75], [0.52, 0.42, 1], [0.62, 0.22, 0.85], [0.45, 0.36, 0.6], [0.16, 0.14, 0.6]];
  return (
    <g>
      <g fill="none" stroke={ink(c, c.p.branch)} strokeLinecap="round">
        <path d={main} strokeWidth={sw} />
        <path d={twig1} strokeWidth={sw * 0.55} />
        <path d={twig2} strokeWidth={sw * 0.55} />
        <path d={twig3} strokeWidth={sw * 0.55} />
      </g>
      {fl.map(([x, y, k], i) => <Mai key={i} cx={x * w} cy={y * h} r={S * 0.034 * k} c={c} rot={i * 23} />)}
      {[[0.2, 0.12], [0.35, 0.33], [0.58, 0.25], [0.29, 0.4]].map(([x, y], i) => <circle key={i} cx={x * w} cy={y * h} r={S * 0.009} fill={foilFill(c)} />)}
    </g>
  );
}

// hoạ tiết nền: mây Tết (không ép, in chìm) / lưới thoi (ép kim)
function PatternDefs({ c, S }: { c: Ctx; S: number }) {
  const t = Math.max(10, S * 0.1);
  return (
    <>
      <pattern id={`${c.uid}-cloud`} width={t * 2} height={t * 1.4} patternUnits="userSpaceOnUse">
        <g fill="none" stroke={c.p.pattern} strokeWidth={t * 0.05} strokeLinecap="round">
          <path d={`M${t * 0.2} ${t * 0.7} a${t * 0.22} ${t * 0.22} 0 1 1 ${t * 0.4} 0 a${t * 0.16} ${t * 0.16} 0 1 1 ${t * 0.3} 0 a${t * 0.22} ${t * 0.22} 0 1 1 ${t * 0.4} 0`} />
          <path d={`M${t * 1.2} ${t * 1.35} a${t * 0.22} ${t * 0.22} 0 1 1 ${t * 0.4} 0 a${t * 0.16} ${t * 0.16} 0 1 1 ${t * 0.3} 0`} />
        </g>
      </pattern>
      <pattern id={`${c.uid}-lattice`} width={t * 0.8} height={t * 0.8} patternUnits="userSpaceOnUse">
        <path d={`M0 ${t * 0.4} L${t * 0.4} 0 L${t * 0.8} ${t * 0.4} L${t * 0.4} ${t * 0.8} Z`} fill="none" stroke={foilFlat(c)} strokeWidth={Math.max(0.25, t * 0.02)} />
        <circle cx={t * 0.4} cy={t * 0.4} r={t * 0.045} fill={foilFlat(c)} />
      </pattern>
    </>
  );
}

// góc trang trí (khung góc)
function Corner({ x, y, s, rot, c }: { x: number; y: number; s: number; rot: number; c: Ctx }) {
  const sw = Math.max(0.35, s * 0.035);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} fill="none" stroke={foilFill(c)} strokeWidth={sw}>
      <path d={`M0 ${s} L0 0 L${s} 0`} />
      <path d={`M${s * 0.18} ${s * 0.7} L${s * 0.18} ${s * 0.18} L${s * 0.7} ${s * 0.18}`} />
      <path d={`M${s * 0.3} ${s * 0.3} l${s * 0.09} ${s * 0.09} l-${s * 0.09} ${s * 0.09} l-${s * 0.09} -${s * 0.09} Z`} fill={foilFill(c)} stroke="none" />
    </g>
  );
}

// logo/monogram tròn
function Mono({ cx, cy, r, c }: { cx: number; cy: number; r: number; c: Ctx }) {
  const f = c.f;
  const ini = initials(c.data.brand);
  const fs = fitTo(ini, r * 1.25, r * 0.95, f.family, f.weight);
  const sw = Math.max(0.3, r * 0.045);
  const img = (filter?: string) => <image href={c.logo} x={cx - r * 0.66} y={cy - r * 0.66} width={r * 1.32} height={r * 1.32} preserveAspectRatio="xMidYMid meet" filter={filter} />;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={foilFill(c)} strokeWidth={sw} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={foilFill(c)} strokeWidth={sw * 0.45} />
      {c.logo ? (
        c.spec.logoFoil ? img(`url(#${c.uid}-lf)`) : isColor(c) ? img() : null
      ) : (
        <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fs} fill={foilFill(c)}>{ini}</text>
      )}
    </g>
  );
}

function LogoFilter({ c }: { c: Ctx }) {
  if (!c.logo || !c.spec.logoFoil) return null;
  const col = c.mode === 'mask' ? '#FFFFFF' : c.mode === 'print-mask' ? '#000000' : hasFoil(c) ? c.foil.color : c.p.ink;
  // vùng tối của logo → ép kim (nền trắng của file JPG bị bỏ)
  return (
    <filter id={`${c.uid}-lf`} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.6 -1.17 -0.23 2 -0.3" result="a" />
      <feFlood floodColor={col} />
      <feComposite in2="a" operator="in" />
    </filter>
  );
}

// ---------- xếp chữ theo cột giữa, tự co cho vừa khung ----------
type Item =
  | { t: 'text'; text: string; fam: string; wt: number; size: number; ls?: number; foil?: boolean; color?: string; gap?: number }
  | { t: 'rule'; w: number; gap?: number }
  | { t: 'mono'; r: number; gap?: number };

function Stack({ items, x, y, w, h, c }: { items: Item[]; x: number; y: number; w: number; h: number; c: Ctx }) {
  const list = items.filter((it) => it.t !== 'text' || (it.text || '').trim());
  // chữ dài → xuống 2–3 dòng cân đối thay vì co quá nhỏ
  const sized: Item[] = [];
  for (const it of list) {
    if (it.t !== 'text') { sized.push(it); continue; }
    const ls = it.ls || 0;
    let best = { lines: [it.text], size: fitTo(it.text, w, it.size, it.fam, it.wt, ls) };
    const words = it.text.trim().split(/\s+/);
    for (let n = 2; n <= 3 && best.size < Math.max(it.size * 0.62, 2.6) && words.length >= n; n++) {
      const target = it.text.length / n;
      const lines: string[] = []; let cur = '';
      for (const wd of words) {
        if (cur && (cur + ' ' + wd).length > target * 1.15 && lines.length < n - 1) { lines.push(cur); cur = wd; } else cur = cur ? cur + ' ' + wd : wd;
      }
      if (cur) lines.push(cur);
      const sz = Math.min(...lines.map((l) => fitTo(l, w, it.size, it.fam, it.wt, ls)));
      if (sz > best.size * 1.05) best = { lines, size: sz };
    }
    best.lines.forEach((l, j) => sized.push({ ...it, text: l, size: best.size, gap: j ? best.size * 0.12 : it.gap }));
  }
  const hOf = (it: Item) => (it.t === 'text' ? it.size * (it.fam === SCRIPT ? 1.25 : 1.12) : it.t === 'mono' ? it.r * 2 : Math.max(0.6, w * 0.004));
  // co cả cột cho vừa khung, nhưng chữ nhỏ không co dưới 2.6mm (chữ to co bù) — tìm hệ số k bằng chia đôi
  const FLOOR = 2.6;
  const szAt = (it: Item, kk: number) => (it.t === 'text' ? Math.max(it.size * kk, Math.min(it.size, FLOOR)) : 0);
  const totalAt = (kk: number) => sized.reduce((s, it, i) => s + (it.t === 'text' ? hOf({ ...it, size: szAt(it, kk) }) : hOf(it) * kk) + (i ? (it.gap ?? 0) * kk : 0), 0);
  let k = 1;
  if (totalAt(1) > h) { let lo = 0.05, hi = 1; for (let n = 0; n < 24; n++) { const mid = (lo + hi) / 2; if (totalAt(mid) > h) hi = mid; else lo = mid; } k = lo; }
  const total = totalAt(k) / k;
  let cy = y + (h - total * k) / 2;
  const cx = x + w / 2;
  const out: ReactNode[] = [];
  sized.forEach((it, i) => {
    if (i) cy += (it.gap ?? 0) * k;
    const hh = it.t === 'text' ? hOf({ ...it, size: szAt(it, k) }) : hOf(it) * k;
    if (it.t === 'text') {
      const fs = szAt(it, k);
      const fill = it.foil ? foilFill(c) : ink(c, it.color || c.p.ink);
      if (fill !== 'none') {
        const base = cy + fs * (it.fam === SCRIPT ? 0.95 : 0.86);
        out.push(<text key={i} x={cx} y={base} textAnchor="middle" fontFamily={`"${it.fam}"`} fontWeight={it.wt} fontSize={fs} letterSpacing={(it.ls || 0) * fs} fill={fill}>{it.text}</text>);
      }
    } else if (it.t === 'rule') {
      out.push(<rect key={i} x={cx - (it.w * k) / 2} y={cy} width={it.w * k} height={hh} fill={foilFill(c)} />);
    } else {
      out.push(<Mono key={i} cx={cx} cy={cy + hh / 2} r={it.r * k} c={c} />);
    }
    cy += hh;
  });
  return <g>{out}</g>;
}

// ---------- 1 MẶT HỘP ----------
/** rear = thành sau nhìn từ phía sau (giống front nhưng dải ruy băng đối xứng để liền mạch với mặt trên) */
export type RBRole = 'top' | 'front' | 'rear' | 'back' | 'end' | 'plain' | 'inner' | 'trayout' | 'drawerFront';

export const trayColor = (spec: RBSpec) => (RB_TRAYS.find((t) => t.id === spec.tray)?.color || rbPalette(spec.palette).tray);

function splitGreeting(g: string): [string, string] {
  const m = (g || '').trim().match(/^(.*?)[\s,–-]*((?:19|20)\d{2})$/);
  return m ? [m[1].trim(), m[2]] : [(g || '').trim(), ''];
}

/** vẽ nội dung 1 mặt rộng w × cao h (mm), toạ độ 0..w, 0..h */
function FaceBody({ role: role0, w, h, c }: { role: RBRole; w: number; h: number; c: Ctx }) {
  const { p, f, data, spec } = c;
  // mặt nhìn từ phía sau: dải ruy băng lật đối xứng
  const rearView = role0 === 'rear' || role0 === 'back';
  const role: RBRole = role0 === 'rear' ? 'front' : role0;
  const S = Math.min(w, h);
  const lay = spec.layout;
  const disp = f.family, dw = f.weight;
  const bgFill = isColor(c) ? p.paper : maskBg(c);
  const trayFill = isColor(c) ? trayColor(spec) : maskBg(c);
  const out: ReactNode[] = [];

  if (role === 'inner' || role === 'trayout') {
    out.push(<rect key="bg" x={-2} y={-2} width={w + 4} height={h + 4} fill={trayFill} />);
    return <>{out}</>;
  }
  if (role === 'drawerFront') {
    out.push(<rect key="bg" x={-2} y={-2} width={w + 4} height={h + 4} fill={trayFill} />);
    const fs = fitTo((data.brand || '').toUpperCase(), w * 0.6, h * 0.16, disp, dw, 0.25);
    if (h > 14) out.push(<text key="b" x={w / 2} y={h * 0.34 + fs * 0.35} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={fs} letterSpacing={fs * 0.25} fill={foilFill(c)}>{(data.brand || '').toUpperCase()}</text>);
    out.push(<rect key="r" x={w * 0.35} y={h * 0.34 + fs * 0.75} width={w * 0.3} height={Math.max(0.35, S * 0.008)} fill={foilFill(c)} />);
    return <>{out}</>;
  }

  out.push(<rect key="bg" x={-2} y={-2} width={w + 4} height={h + 4} fill={bgFill} />);
  // hoạ tiết nền
  if (lay === 'tet' && isColor(c)) out.push(<rect key="pt" x={-2} y={-2} width={w + 4} height={h + 4} fill={`url(#${c.uid}-cloud)`} opacity={0.9} />);
  if (lay === 'pattern' && (role === 'top' || role === 'front' || role === 'end' || role === 'plain' || role === 'back')) {
    out.push(<rect key="lt" x={-2} y={-2} width={w + 4} height={h + 4} fill={`url(#${c.uid}-lattice)`} opacity={isColor(c) ? 0.55 : 1} />);
  }
  // dải ruy băng (theo chiều sâu hộp: mặt trên dọc, mặt trước/sau cùng vị trí x)
  const bandX = w * (rearView ? 0.3 : 0.7), bandW = Math.min(w, h, 160) * 0.14;
  if (lay === 'band' && (role === 'top' || role === 'front' || role === 'back')) {
    out.push(<rect key="bd" x={bandX - bandW / 2} y={-2} width={bandW} height={h + 4} fill={ink(c, p.band)} />);
    out.push(<rect key="bl1" x={bandX - bandW / 2} y={-2} width={Math.max(0.4, bandW * 0.05)} height={h + 4} fill={foilFill(c)} />);
    out.push(<rect key="bl2" x={bandX + bandW / 2 - Math.max(0.4, bandW * 0.05)} y={-2} width={Math.max(0.4, bandW * 0.05)} height={h + 4} fill={foilFill(c)} />);
  }

  if (role === 'top') {
    const m = S * 0.07;
    const wide = w / h > 1.9;
    const [g1, g2] = splitGreeting(data.greeting);
    const brand = data.brand || '';
    const tag = data.tagline || '';
    if (lay === 'tet') {
      out.push(<g key="br" transform={`scale(${wide ? 0.62 : 0.72})`}><MaiBranch w={w} h={h} c={c} /></g>);
      out.push(<g key="br2" transform={`translate(${w} ${h}) rotate(180) scale(0.42)`}><MaiBranch w={w} h={h} c={c} /></g>);
      const bx = wide ? w * 0.4 : w * 0.22, bw = wide ? w * 0.5 : w * 0.64;
      const by = wide ? h * 0.1 : h * 0.37, bh = wide ? h * 0.66 : h * 0.43;
      out.push(<Stack key="st" x={bx} y={by} w={bw} h={bh} c={c} items={[
        { t: 'text', text: g1, fam: SCRIPT, wt: 400, size: S * 0.2, foil: true },
        { t: 'text', text: g2, fam: disp, wt: dw, size: S * 0.12, ls: 0.18, foil: true, gap: S * 0.005 },
        { t: 'rule', w: S * 0.22, gap: S * 0.04 },
        { t: 'text', text: brand.toUpperCase(), fam: disp, wt: dw, size: S * 0.085, ls: 0.12, foil: true, gap: S * 0.04 },
        { t: 'text', text: tag, fam: BODY, wt: 600, size: S * 0.04, color: p.ink, gap: S * 0.02 },
      ]} />);
    } else if (lay === 'center' || lay === 'minimal') {
      const min = lay === 'minimal';
      if (!min) {
        out.push(<rect key="f1" x={m} y={m} width={w - 2 * m} height={h - 2 * m} fill="none" stroke={foilFill(c)} strokeWidth={Math.max(0.4, S * 0.006)} />);
        out.push(<rect key="f2" x={m + S * 0.018} y={m + S * 0.018} width={w - 2 * m - S * 0.036} height={h - 2 * m - S * 0.036} fill="none" stroke={foilFill(c)} strokeWidth={Math.max(0.25, S * 0.0025)} />);
      }
      const items: Item[] = [
        { t: 'mono', r: S * (min ? 0.07 : 0.12) },
        { t: 'text', text: min ? brand.toUpperCase() : brand.toUpperCase(), fam: disp, wt: dw, size: S * (min ? 0.07 : 0.1), ls: min ? 0.3 : 0.1, foil: true, gap: S * 0.05 },
        { t: 'rule', w: S * (min ? 0.12 : 0.18), gap: S * 0.03 },
        { t: 'text', text: tag.toUpperCase(), fam: BODY, wt: 600, size: S * 0.034, ls: 0.22, color: min ? p.sub : p.ink, gap: S * 0.03 },
      ];
      if (!min) items.push({ t: 'text', text: data.greeting || '', fam: SCRIPT, wt: 400, size: S * 0.07, foil: true, gap: S * 0.04 });
      if (wide) {
        out.push(<Mono key="mo" cx={w * 0.18} cy={h / 2} r={S * 0.24} c={c} />);
        out.push(<Stack key="st" x={w * 0.34} y={m * 1.6} w={w * 0.56} h={h - m * 3.2} c={c} items={items.slice(1)} />);
      } else {
        out.push(<Stack key="st" x={m * 2} y={m * 2} w={w - m * 4} h={h - m * 4} c={c} items={items} />);
      }
    } else if (lay === 'frame') {
      const cs = S * 0.16;
      out.push(<g key="c"><Corner x={m} y={m} s={cs} rot={0} c={c} /><Corner x={w - m} y={m} s={cs} rot={90} c={c} /><Corner x={w - m} y={h - m} s={cs} rot={180} c={c} /><Corner x={m} y={h - m} s={cs} rot={270} c={c} /></g>);
      const items: Item[] = [];
      if (c.logo) items.push({ t: 'mono', r: S * 0.09 });
      items.push(
        { t: 'text', text: brand.toUpperCase(), fam: disp, wt: dw, size: S * 0.11, ls: 0.08, foil: true, gap: S * 0.04 },
        { t: 'rule', w: S * 0.2, gap: S * 0.035 },
        { t: 'text', text: tag, fam: BODY, wt: 600, size: S * 0.042, color: p.ink, gap: S * 0.035 },
        { t: 'text', text: (data.greeting || '').toUpperCase(), fam: BODY, wt: 600, size: S * 0.03, ls: 0.3, color: p.sub, gap: S * 0.05 },
      );
      out.push(<Stack key="st" x={m + cs * 0.9} y={m + cs * 0.5} w={w - 2 * m - cs * 1.8} h={h - 2 * m - cs} c={c} items={items} />);
    } else if (lay === 'band') {
      const lx = m * 1.5, lw = bandX - bandW / 2 - m * 2.5;
      out.push(<Stack key="st" x={lx} y={m * 1.5} w={lw} h={h - m * 3} c={c} items={[
        ...(c.logo ? [{ t: 'mono', r: S * 0.08 } as Item] : []),
        { t: 'text', text: brand.toUpperCase(), fam: disp, wt: dw, size: S * 0.11, ls: 0.06, foil: true, gap: S * 0.04 },
        { t: 'text', text: tag, fam: BODY, wt: 600, size: S * 0.042, color: p.ink, gap: S * 0.03 },
        { t: 'text', text: data.greeting || '', fam: SCRIPT, wt: 400, size: S * 0.075, foil: true, gap: S * 0.05 },
      ]} />);
    } else if (lay === 'pattern') {
      const pw = Math.min(w * 0.7, S * 0.95 * (wide ? 1.9 : 1)), ph = Math.min(h * 0.62, S * 0.62);
      const px = (w - pw) / 2, py = (h - ph) / 2;
      out.push(<rect key="pq" x={px} y={py} width={pw} height={ph} fill={isColor(c) ? p.paper : maskBg(c)} />);
      out.push(<rect key="pq1" x={px} y={py} width={pw} height={ph} fill="none" stroke={foilFill(c)} strokeWidth={Math.max(0.4, S * 0.007)} />);
      out.push(<rect key="pq2" x={px + S * 0.02} y={py + S * 0.02} width={pw - S * 0.04} height={ph - S * 0.04} fill="none" stroke={foilFill(c)} strokeWidth={Math.max(0.25, S * 0.0025)} />);
      out.push(<Stack key="st" x={px + pw * 0.1} y={py + ph * 0.12} w={pw * 0.8} h={ph * 0.76} c={c} items={[
        ...(c.logo ? [{ t: 'mono', r: S * 0.07 } as Item] : []),
        { t: 'text', text: brand.toUpperCase(), fam: disp, wt: dw, size: S * 0.1, ls: 0.08, foil: true, gap: S * 0.03 },
        { t: 'rule', w: S * 0.16, gap: S * 0.03 },
        { t: 'text', text: tag, fam: BODY, wt: 600, size: S * 0.04, color: p.ink, gap: S * 0.03 },
        { t: 'text', text: data.greeting || '', fam: SCRIPT, wt: 400, size: S * 0.065, foil: true, gap: S * 0.03 },
      ]} />);
    }
  } else if (role === 'front') {
    // thành hộp: tên thương hiệu nhỏ giãn chữ (ép kim) + vạch mảnh
    const brand = (data.brand || '').toUpperCase();
    if (h >= 14) {
      const avail = lay === 'band' ? (rearView ? w - (bandX + bandW / 2) - 6 : bandX - bandW / 2 - 6) : w - 12;
      const cx = lay === 'band' ? (rearView ? bandX + bandW / 2 + 3 + avail / 2 : avail / 2 + 3) : w / 2;
      const fs = fitTo(brand, avail * 0.8, Math.min(h * 0.2, 12), disp, dw, 0.35);
      out.push(<text key="b" x={cx} y={h / 2 + fs * 0.35} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={fs} letterSpacing={fs * 0.35} fill={foilFill(c)}>{brand}</text>);
      if (lay !== 'minimal' && lay !== 'pattern') {
        const lw = Math.min(avail * 0.3, 40);
        out.push(<rect key="l1" x={cx - lw / 2} y={h / 2 + fs * 0.85} width={lw} height={Math.max(0.3, fs * 0.05)} fill={foilFill(c)} />);
      }
    }
    if (lay === 'frame' || lay === 'center') {
      const sw = Math.max(0.35, S * 0.012);
      out.push(<rect key="ln" x={0} y={h - S * 0.12} width={w} height={sw} fill={foilFill(c)} />);
    }
  } else if (role === 'end') {
    if (lay === 'frame' || lay === 'center' || lay === 'tet') {
      const sw = Math.max(0.35, S * 0.012);
      out.push(<rect key="ln" x={0} y={h - S * 0.12} width={w} height={sw} fill={foilFill(c)} />);
    }
    if (lay === 'tet' && h >= 20) out.push(<Mai key="m" cx={w / 2} cy={h * 0.42} r={Math.min(h * 0.16, 10)} c={c} />);
  } else if (role === 'back') {
    const t = [data.website, data.hotline].filter(Boolean).join('  ·  ');
    if (t && h >= 10) {
      const fs = fitTo(t, w * 0.7, Math.min(h * 0.12, 5), BODY, 600, 0.08);
      out.push(<text key="w" x={w / 2} y={h * 0.78} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} letterSpacing={fs * 0.08} fill={ink(c, p.sub)}>{t}</text>);
    }
  }
  return <>{out}</>;
}

function useCtx(spec: RBSpec, data: RBData, mode: RBMode, logo?: string): Ctx {
  const uid = 'rb' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return { mode, p: rbPalette(spec.palette), f: rbFont(spec.font), foil: rbFoil(spec.foil), spec, data, logo, uid };
}

function Defs({ c, S }: { c: Ctx; S: number }) {
  return <defs><FoilDefs c={c} /><PatternDefs c={c} S={S} /><LogoFilter c={c} /></defs>;
}

/** 1 mặt hộp độc lập (xem trước / texture 3D) */
export function RBFaceSvg({ role, w, h, spec, data, logo, mode = 'color', style }: { role: RBRole; w: number; h: number; spec: RBSpec; data: RBData; logo?: string; mode?: RBMode; style?: CSSProperties }) {
  const c = useCtx(spec, data, mode, logo);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={`${w}mm`} height={`${h}mm`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-role={role}>
      <Defs c={c} S={Math.min(w, h)} />
      <rect x={0} y={0} width={w} height={h} fill={mode === 'color' ? (role === 'inner' || role === 'trayout' || role === 'drawerFront' ? trayColor(spec) : rbPalette(spec.palette).paper) : maskBg(c)} />
      <FaceBody role={role} w={w} h={h} c={c} />
    </svg>
  );
}

// ---------- KHUÔN GIẤY BỒI ----------
interface Panel { x: number; y: number; w: number; h: number; role: RBRole; rot: 0 | 90 | 180 | -90 }
export interface RBPart {
  id: string; name: string; note: string;
  W: number; H: number;           // kích thước trang (mm) gồm lề
  panels: Panel[]; cut: string; folds: string[]; foil: boolean; inner: boolean;
}
export interface RBBoard { part: string; name: string; w: number; h: number; n: number }

const f1 = (n: number) => Number(n.toFixed(1));

/** khuôn chữ thập: đáy/mặt (cw×cd) + 4 thành cao h + turn-in + tai góc trên 2 thành dài */
function crossPart(id: string, name: string, note: string, cw: number, cd: number, h: number,
  roles: { center: RBRole; far: RBRole; near: RBRole; left: RBRole; right: RBRole }, foil: boolean, inner = false): RBPart {
  const TI = RB_TI, e = Math.min(EAR, h * 0.8);
  const X0 = M + TI + h, X1 = X0 + cw, Y0 = M + TI + h, Y1 = Y0 + cd;
  const pts: [number, number][] = [
    [X0, Y0 - h - TI], [X1, Y0 - h - TI], [X1, Y0 - h], [X1 + e, Y0 - h + 2], [X1 + e, Y0 - 2], [X1 + 0.5, Y0],
    [X1 + h + TI, Y0], [X1 + h + TI, Y1], [X1 + 0.5, Y1], [X1 + e, Y1 + 2], [X1 + e, Y1 + h - 2], [X1, Y1 + h],
    [X1, Y1 + h + TI], [X0, Y1 + h + TI], [X0, Y1 + h], [X0 - e, Y1 + h - 2], [X0 - e, Y1 + 2], [X0 - 0.5, Y1],
    [X0 - h - TI, Y1], [X0 - h - TI, Y0], [X0 - 0.5, Y0], [X0 - e, Y0 - 2], [X0 - e, Y0 - h + 2], [X0, Y0 - h],
  ];
  const cut = 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L') + ' Z';
  const L = (a: number, b: number, c: number, d: number) => `M${f1(a)} ${f1(b)} L${f1(c)} ${f1(d)}`;
  const folds = [
    L(X0, Y0, X1, Y0), L(X0, Y1, X1, Y1), L(X0, Y0, X0, Y1), L(X1, Y0, X1, Y1),
    L(X0, Y0 - h, X1, Y0 - h), L(X0, Y1 + h, X1, Y1 + h), L(X0 - h, Y0, X0 - h, Y1), L(X1 + h, Y0, X1 + h, Y1),
    L(X0, Y0 - h, X0, Y0), L(X1, Y0 - h, X1, Y0), L(X0, Y1, X0, Y1 + h), L(X1, Y1, X1, Y1 + h),
  ];
  const panels: Panel[] = [
    { x: X0, y: Y0, w: cw, h: cd, role: roles.center, rot: 0 },
    { x: X0, y: Y0 - h, w: cw, h, role: roles.far, rot: 180 },
    { x: X0, y: Y1, w: cw, h, role: roles.near, rot: 0 },
    { x: X0 - h, y: Y0, w: h, h: cd, role: roles.left, rot: 90 },
    { x: X1, y: Y0, w: h, h: cd, role: roles.right, rot: -90 },
  ];
  return { id, name, note, W: X1 + h + TI + M, H: Y1 + h + TI + M, panels, cut, folds, foil, inner };
}

/** khuôn dải: các tấm nối dọc (áo hộp ngăn kéo / bìa hộp nam châm), turn-in 2 bên (+ 2 đầu) */
function stripPart(id: string, name: string, note: string, width: number, segs: { len: number; role: RBRole; rot: 0 | 180; gap?: number }[], tiEnds: boolean, foil: boolean): RBPart {
  const TI = RB_TI;
  const X0 = M + TI, X1 = X0 + width;
  let y = M + (tiEnds ? TI : 0);
  const Ystart = y;
  const panels: Panel[] = [];
  const bounds: number[] = [];
  segs.forEach((s, i) => {
    panels.push({ x: X0, y, w: width, h: s.len, role: s.role, rot: s.rot });
    if (i) bounds.push(y);
    y += s.len;
    if (i < segs.length - 1) { bounds.push(y); y += s.gap ?? 0; }
  });
  const Yend = y;
  const L = (a: number, b: number, c: number, d: number) => `M${f1(a)} ${f1(b)} L${f1(c)} ${f1(d)}`;
  const top = tiEnds ? Ystart - TI : Ystart, bot = tiEnds ? Yend + TI : Yend;
  const ch = TI * 0.85; // vát góc turn-in
  const pts: [number, number][] = tiEnds
    ? [[X0 + 1, top], [X1 - 1, top], [X1, Ystart - 1], [X1 + TI, Ystart + ch], [X1 + TI, Yend - ch], [X1, Yend + 1], [X1 - 1, bot], [X0 + 1, bot], [X0, Yend + 1], [X0 - TI, Yend - ch], [X0 - TI, Ystart + ch], [X0, Ystart - 1]]
    : [[X0, top], [X1, top], [X1 + TI, top + ch], [X1 + TI, bot - ch], [X1, bot], [X0, bot], [X0 - TI, bot - ch], [X0 - TI, top + ch]];
  const cut = 'M' + pts.map(([px, py]) => `${f1(px)} ${f1(py)}`).join(' L') + ' Z';
  const folds = [...new Set(bounds.map(f1))].map((by) => L(X0, by, X1, by));
  folds.push(L(X0, Ystart, X0, Yend), L(X1, Ystart, X1, Yend));
  if (tiEnds) folds.push(L(X0, Ystart, X1, Ystart), L(X0, Yend, X1, Yend));
  return { id, name, note, W: X1 + TI + M, H: bot + M, panels, cut, folds, foil, inner: false };
}

export interface RBGeom {
  kind: RBKind; W: number; D: number; H: number; T: number;
  lidH: number; base: { w: number; d: number; h: number };   // hộp nắp rời
  tray: { w: number; d: number; h: number };                   // khay trong (nam châm) / ngăn kéo
}
export function rbGeom(spec: RBSpec): RBGeom {
  const s = rbSize(spec.size), T = RB_T;
  const lidH = rbLidH(s);
  const base = { w: s.w - 2 * T - 1, d: s.d - 2 * T - 1, h: s.h - T };
  const tray = spec.kind === 'magnet'
    ? { w: s.w - 2, d: s.d - T - 1, h: s.h - 2 * T - 0.5 }
    : { w: s.w - 2, d: s.d - 2 * T - 1, h: s.h - 2 * T - 1 };
  return { kind: spec.kind, W: s.w, D: s.d, H: s.h, T, lidH, base, tray };
}

export function rbParts(spec: RBSpec): RBPart[] {
  const g = rbGeom(spec), T = RB_T;
  const foil = spec.foil !== 'none';
  if (spec.kind === 'lid') {
    return [
      crossPart('nap', 'Giấy bồi nắp', `Nắp ${g.W}×${g.D}×${g.lidH}mm`, g.W, g.D, g.lidH, { center: 'top', far: 'rear', near: 'front', left: 'end', right: 'end' }, foil),
      crossPart('day', 'Giấy bồi đáy', `Đáy ${f1(g.base.w)}×${f1(g.base.d)}×${f1(g.base.h)}mm`, g.base.w, g.base.d, g.base.h, { center: 'plain', far: 'back', near: 'plain', left: 'plain', right: 'plain' }, false),
      crossPart('lot', 'Giấy lót trong', 'Lót lòng đáy (màu khay)', g.base.w - 2 * T, g.base.d - 2 * T, g.base.h - T, { center: 'inner', far: 'inner', near: 'inner', left: 'inner', right: 'inner' }, false, true),
    ];
  }
  if (spec.kind === 'magnet') {
    return [
      stripPart('bia', 'Giấy bồi bìa (nắp gập)', `Nắp gập ${g.H} · mặt trên ${g.D} · lưng ${g.H} · đáy ${g.D}mm`, g.W,
        [{ len: g.H, role: 'front', rot: 180, gap: GAP }, { len: g.D, role: 'top', rot: 180, gap: GAP }, { len: g.H, role: 'back', rot: 0, gap: GAP }, { len: g.D, role: 'plain', rot: 0 }], true, foil),
      crossPart('khay', 'Giấy bồi khay', `Khay ${f1(g.tray.w)}×${f1(g.tray.d)}×${f1(g.tray.h)}mm`, g.tray.w, g.tray.d, g.tray.h, { center: 'plain', far: 'plain', near: 'plain', left: 'end', right: 'end' }, false),
      crossPart('lot', 'Giấy lót trong', 'Lót lòng khay + mặt trong nắp', g.tray.w - 2 * T, g.tray.d - 2 * T, g.tray.h - T, { center: 'inner', far: 'inner', near: 'inner', left: 'inner', right: 'inner' }, false, true),
    ];
  }
  return [
    stripPart('ao', 'Giấy bồi áo hộp', `Áo ${g.W}×${g.D}×${g.H}mm, hở 2 đầu`, g.W,
      [{ len: g.D, role: 'top', rot: 0 }, { len: g.H, role: 'front', rot: 0 }, { len: g.D, role: 'plain', rot: 0 }, { len: g.H, role: 'back', rot: 180 }, { len: 15, role: 'plain', rot: 0 }], false, foil),
    crossPart('ngan', 'Giấy bồi ngăn kéo', `Ngăn kéo ${f1(g.tray.w)}×${f1(g.tray.d)}×${f1(g.tray.h)}mm`, g.tray.w, g.tray.d, g.tray.h, { center: 'trayout', far: 'trayout', near: 'trayout', left: 'drawerFront', right: 'drawerFront' }, foil),
    crossPart('lot', 'Giấy lót trong', 'Lót lòng ngăn kéo', g.tray.w - 2 * T, g.tray.d - 2 * T, g.tray.h - T, { center: 'inner', far: 'inner', near: 'inner', left: 'inner', right: 'inner' }, false, true),
  ];
}

export function rbBoards(spec: RBSpec): RBBoard[] {
  const g = rbGeom(spec), T = RB_T;
  const tw = f1(g.tray.w), td = f1(g.tray.d), th = f1(g.tray.h);
  if (spec.kind === 'lid') {
    const bw = f1(g.base.w), bd = f1(g.base.d), bh = f1(g.base.h);
    return [
      { part: 'Nắp', name: 'Mặt nắp', w: g.W, h: g.D, n: 1 },
      { part: 'Nắp', name: 'Thành dài', w: g.W, h: g.lidH - T, n: 2 },
      { part: 'Nắp', name: 'Thành ngắn', w: g.D - 2 * T, h: g.lidH - T, n: 2 },
      { part: 'Đáy', name: 'Mặt đáy', w: bw, h: bd, n: 1 },
      { part: 'Đáy', name: 'Thành dài', w: bw, h: f1(bh - T), n: 2 },
      { part: 'Đáy', name: 'Thành ngắn', w: f1(bd - 2 * T), h: f1(bh - T), n: 2 },
    ];
  }
  if (spec.kind === 'magnet') {
    return [
      { part: 'Bìa', name: 'Nắp gập', w: g.W, h: g.H, n: 1 },
      { part: 'Bìa', name: 'Mặt trên', w: g.W, h: g.D, n: 1 },
      { part: 'Bìa', name: 'Lưng', w: g.W, h: g.H - T, n: 1 },
      { part: 'Bìa', name: 'Đáy', w: g.W, h: g.D, n: 1 },
      { part: 'Khay', name: 'Đáy khay', w: tw, h: td, n: 1 },
      { part: 'Khay', name: 'Thành dài', w: tw, h: f1(th - T), n: 2 },
      { part: 'Khay', name: 'Thành ngắn', w: f1(td - 2 * T), h: f1(th - T), n: 2 },
      { part: 'Phụ kiện', name: 'Nam châm Ø10×2 (cặp)', w: 10, h: 2, n: 2 },
    ];
  }
  return [
    { part: 'Áo', name: 'Mặt trên / đáy', w: g.W, h: g.D, n: 2 },
    { part: 'Áo', name: 'Thành trước / sau', w: g.W, h: g.H - 2 * T, n: 2 },
    { part: 'Ngăn kéo', name: 'Đáy', w: tw, h: td, n: 1 },
    { part: 'Ngăn kéo', name: 'Thành dài', w: tw, h: f1(th - T), n: 2 },
    { part: 'Ngăn kéo', name: 'Đầu kéo', w: f1(td - 2 * T), h: f1(th - T), n: 2 },
  ];
}

/** 1 khuôn giấy bồi: mode color = file in (có nét cắt CutContour + nét gấp Fold); print-mask = khuôn ép kim */
export function RBPartSvg({ part, spec, data, logo, mode = 'color', marks = true, style }: { part: RBPart; spec: RBSpec; data: RBData; logo?: string; mode?: RBMode; marks?: boolean; style?: CSSProperties }) {
  const c = useCtx(spec, data, mode, logo);
  const S = Math.min(rbGeom(spec).W, rbGeom(spec).D);
  const sheetBg = mode === 'color' ? (part.inner ? trayColor(spec) : rbPalette(spec.palette).paper) : maskBg(c);
  return (
    <svg viewBox={`0 0 ${f1(part.W)} ${f1(part.H)}`} width={`${f1(part.W)}mm`} height={`${f1(part.H)}mm`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-part={part.id}>
      <Defs c={c} S={S} />
      <mask id={`${c.uid}-bleed`}>
        <path d={part.cut} fill="#fff" stroke="#fff" strokeWidth={RB_BLEED * 2} strokeLinejoin="miter" />
      </mask>
      <rect x={0} y={0} width={part.W} height={part.H} fill={mode === 'color' ? '#FFFFFF' : maskBg(c)} />
      <g id="In" mask={`url(#${c.uid}-bleed)`}>
        <rect x={0} y={0} width={part.W} height={part.H} fill={sheetBg} />
        {part.panels.map((pn, i) => {
          const aw = pn.rot === 90 || pn.rot === -90 ? pn.h : pn.w;
          const ah = pn.rot === 90 || pn.rot === -90 ? pn.w : pn.h;
          const cid = `${c.uid}-p${i}`;
          return (
            <g key={i}>
              <clipPath id={cid}><rect x={pn.x - 0.6} y={pn.y - 0.6} width={pn.w + 1.2} height={pn.h + 1.2} /></clipPath>
              <g clipPath={`url(#${cid})`}>
                <g transform={`translate(${f1(pn.x + pn.w / 2)} ${f1(pn.y + pn.h / 2)}) rotate(${pn.rot}) translate(${f1(-aw / 2)} ${f1(-ah / 2)})`} data-panel={pn.role}>
                  <FaceBody role={pn.role} w={aw} h={ah} c={c} />
                </g>
              </g>
            </g>
          );
        })}
      </g>
      {marks && mode === 'color' && (
        <>
          <g id="Fold" fill="none" stroke="#00A3E0" strokeWidth={0.3} strokeDasharray="2 1.5">
            {part.folds.map((d, i) => <path key={i} d={d} />)}
          </g>
          <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.3}>
            <path d={part.cut} />
          </g>
        </>
      )}
    </svg>
  );
}

/** trang A4 bảng cắt bìa + ghi chú cho xưởng */
export function RBBoardSheet({ spec, data, style }: { spec: RBSpec; data: RBData; style?: CSSProperties }) {
  const rows = rbBoards(spec), parts = rbParts(spec);
  const s = rbSize(spec.size), kind = RB_KINDS.find((k) => k.id === spec.kind)!;
  const W = 210, H = 297, x0 = 18;
  let y = 28;
  const out: ReactNode[] = [];
  const T = (x: number, yy: number, t: string, size: number, wt = 600, anchor: 'start' | 'end' | 'middle' = 'start', fill = '#1C1C1C') =>
    <text key={`${x}-${yy}-${t}`} x={x} y={yy} fontFamily={`"${BODY}"`} fontWeight={wt} fontSize={size} textAnchor={anchor} fill={fill}>{t}</text>;
  out.push(T(x0, y, `${kind.name} — ${s.name}`, 7, 800)); y += 8;
  out.push(T(x0, y, `Thương hiệu: ${data.brand || '—'}   ·   Mẫu: ${rbPalette(spec.palette).name} · ${rbFoil(spec.foil).name}`, 3.6, 600, 'start', '#555')); y += 10;
  out.push(T(x0, y, 'BẢNG CẮT BÌA XÁM 2mm', 4.2, 800)); y += 6;
  const cols = [x0, x0 + 34, x0 + 110, x0 + 150];
  out.push(T(cols[0], y, 'Bộ phận', 3.4, 800), T(cols[1], y, 'Tấm', 3.4, 800), T(cols[2], y, 'Kích thước (mm)', 3.4, 800), T(cols[3], y, 'SL', 3.4, 800));
  y += 2; out.push(<rect key="hl" x={x0} y={y} width={W - 2 * x0} height={0.3} fill="#999" />); y += 5;
  rows.forEach((r) => {
    out.push(T(cols[0], y, r.part, 3.4), T(cols[1], y, r.name, 3.4), T(cols[2], y, `${r.w} × ${r.h}`, 3.4), T(cols[3], y, String(r.n), 3.4));
    y += 5.5;
  });
  y += 6;
  out.push(T(x0, y, 'GIẤY BỒI (các trang sau)', 4.2, 800)); y += 6;
  parts.forEach((p) => { out.push(T(x0, y, `• ${p.name}: khổ ${f1(p.W)} × ${f1(p.H)}mm — ${p.note}`, 3.4)); y += 5.5; });
  y += 6;
  const notes = [
    `Gấp vào trong ${RB_TI}mm qua mép bìa · lề xén ${RB_BLEED}mm · nét hồng = cắt (CutContour), nét xanh đứt = gấp.`,
    rbFoil(spec.foil).id !== 'none' ? `Ép kim ${rbFoil(spec.foil).name.replace('Ép kim ', '')}: trang khuôn ép (đen = vùng ép) khớp đúng khổ giấy bồi.` : 'Không ép kim — chi tiết in màu mực.',
    'Khay/lót: giấy màu khay (có thể thay bằng nhung / xốp định hình theo sản phẩm).',
  ];
  notes.forEach((n) => { out.push(T(x0, y, n, 3.2, 600, 'start', '#444')); y += 5.2; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid="rb-board-sheet">
      <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" />
      {out}
    </svg>
  );
}

/** danh sách mặt cần cho 3D theo kiểu hộp */
export interface RBFaceDef { key: string; role: RBRole; w: number; h: number }
export function rbFaces(spec: RBSpec): RBFaceDef[] {
  const g = rbGeom(spec);
  if (spec.kind === 'lid') {
    return [
      { key: 'top', role: 'top', w: g.W, h: g.D },
      { key: 'front', role: 'front', w: g.W, h: g.lidH },
      { key: 'rear', role: 'rear', w: g.W, h: g.lidH },
      { key: 'end', role: 'end', w: g.D, h: g.lidH },
      { key: 'baseFront', role: 'plain', w: g.base.w, h: g.base.h },
      { key: 'baseBack', role: 'back', w: g.base.w, h: g.base.h },
      { key: 'baseEnd', role: 'plain', w: g.base.d, h: g.base.h },
    ];
  }
  if (spec.kind === 'magnet') {
    return [
      { key: 'top', role: 'top', w: g.W, h: g.D },
      { key: 'front', role: 'front', w: g.W, h: g.H },
      { key: 'back', role: 'back', w: g.W, h: g.H },
      { key: 'end', role: 'end', w: g.tray.d, h: g.tray.h },
    ];
  }
  return [
    { key: 'top', role: 'top', w: g.W, h: g.D },
    { key: 'front', role: 'front', w: g.W, h: g.H },
    { key: 'back', role: 'back', w: g.W, h: g.H },
    { key: 'drawerFront', role: 'drawerFront', w: g.tray.d, h: g.tray.h },
  ];
}
