'use client';
// Lì xì Tết & phong bì công ty: 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT × KHỔ × KIỂU NẮP → nhiều mẫu, render code 100%.
// Mỗi mẫu có MẶT TRƯỚC + MẶT SAU (phần nắp). Khuôn bế trải phẳng: mặt trước ở giữa, 4 tai (nắp trên, đáy, 2 hông)
// — tai nào gấp ra sau thì in đúng phần "mặt sau" tương ứng (ánh xạ gấp: hông = tịnh tiến, nắp/đáy = xoay 180°).
// Đơn vị vẽ: 2px = 1mm. Hoạ tiết Tết (mai, đồng tiền, sóng, mây) vẽ bằng code, không ảnh ngoài.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export const U = 2; // px / mm
const CUT = '#1F2937';
const FOLD = '#2563EB';
export const ENV_BLEED_MM = 3;

export type EnvKind = 'lixi' | 'letter';
export const ENV_KINDS: { id: EnvKind; name: string }[] = [
  { id: 'lixi', name: 'Lì xì Tết' },
  { id: 'letter', name: 'Phong bì công ty' },
];

export interface EnvSize { id: string; kind: EnvKind; name: string; w: number; h: number }
export const ENV_SIZES: EnvSize[] = [
  { id: 'lx-85', kind: 'lixi', name: '85 × 165 mm', w: 85, h: 165 },
  { id: 'lx-90', kind: 'lixi', name: '90 × 175 mm', w: 90, h: 175 },
  { id: 'dl', kind: 'letter', name: 'DL 220 × 110 mm', w: 220, h: 110 },
  { id: 'c5', kind: 'letter', name: 'C5 229 × 162 mm', w: 229, h: 162 },
];
export const envSize = (id: string) => ENV_SIZES.find((s) => s.id === id) || ENV_SIZES[0];
export const envSizesFor = (k: EnvKind) => ENV_SIZES.filter((s) => s.kind === k);

export type FlapShape = 'arc' | 'straight' | 'v';
export const FLAP_SHAPES: { id: FlapShape; name: string }[] = [
  { id: 'arc', name: 'Nắp cong' },
  { id: 'straight', name: 'Nắp thẳng' },
  { id: 'v', name: 'Nắp nhọn' },
];

export interface EnvFont { id: string; name: string; family: string; weight: number }
export const ENV_FONTS: EnvFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 700 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const envFont = (id: string) => ENV_FONTS.find((f) => f.id === id) || ENV_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';
export const ENV_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@500;600;700;800&family=Montserrat:wght@700;800&family=Playfair+Display:wght@700&family=Cormorant+Garamond:wght@700&family=Dancing+Script:wght@700&display=swap');`;

export function useEnvFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-env-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-env-fonts'; link.rel = 'stylesheet'; link.href = ENV_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...ENV_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 32px "${BODY}"`, `700 32px "${BODY}"`, `700 40px "${SCRIPT}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Phúc Lộc 2027')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface LxPalette { id: string; name: string; bg: string; bg2: string; gold: string; ink: string; flower: string; branch: string; foil: boolean }
export const LX_PALETTES: LxPalette[] = [
  { id: 'do', name: 'Đỏ kim', bg: '#C8102E', bg2: '#9F0C24', gold: '#E9C46A', ink: '#E9C46A', flower: '#FFD447', branch: '#4A1610', foil: true },
  { id: 'tham', name: 'Đỏ đô', bg: '#8B1A1A', bg2: '#661010', gold: '#D8B36A', ink: '#D8B36A', flower: '#FFC94A', branch: '#2E0B08', foil: true },
  { id: 'hong', name: 'Hồng đào', bg: '#F8D7DA', bg2: '#F0BCC3', gold: '#B8893B', ink: '#A4243B', flower: '#E35D7A', branch: '#6B3A2E', foil: true },
  { id: 'navy', name: 'Navy ánh kim', bg: '#13244A', bg2: '#0B1733', gold: '#D6B25E', ink: '#D6B25E', flower: '#F4C542', branch: '#A07B45', foil: true },
  { id: 'trang', name: 'Trắng đỏ', bg: '#FBF7F0', bg2: '#F1E6D3', gold: '#B8913A', ink: '#B3122B', flower: '#D7263D', branch: '#5B3A29', foil: true },
  { id: 'ngoc', name: 'Xanh ngọc', bg: '#0F5A46', bg2: '#0A4336', gold: '#E2BE67', ink: '#E2BE67', flower: '#F7D46A', branch: '#3B2416', foil: true },
  { id: 'cam', name: 'Cam san hô', bg: '#E8572F', bg2: '#C9431E', gold: '#FFE1A1', ink: '#FFF4DA', flower: '#FFE07A', branch: '#6B2410', foil: false },
  { id: 'den', name: 'Đen hoàng kim', bg: '#17171A', bg2: '#0B0B0D', gold: '#D4AF37', ink: '#D4AF37', flower: '#F2C94C', branch: '#8C6B3A', foil: true },
];
export interface LtPalette { id: string; name: string; paper: string; accent: string; accent2: string; ink: string; sub: string; onAccent: string; inside: string }
export const LT_PALETTES: LtPalette[] = [
  { id: 'navy', name: 'Navy', paper: '#FFFFFF', accent: '#1F3A68', accent2: '#C8A24A', ink: '#16233B', sub: '#5B6B85', onAccent: '#FFFFFF', inside: '#CCD5E3' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#FFFFFF', accent: '#0F766E', accent2: '#F2A541', ink: '#0C2F2B', sub: '#4B6F6A', onAccent: '#FFFFFF', inside: '#C9DAD6' },
  { id: 'black', name: 'Đen sang', paper: '#FFFFFF', accent: '#111827', accent2: '#C8A24A', ink: '#111827', sub: '#6B7280', onAccent: '#FFFFFF', inside: '#CFD1D5' },
  { id: 'red', name: 'Đỏ', paper: '#FFFFFF', accent: '#B3122B', accent2: '#E9B949', ink: '#1F2937', sub: '#6B7280', onAccent: '#FFFFFF', inside: '#DCCFCF' },
  { id: 'kraft', name: 'Kraft', paper: '#D3B48A', accent: '#3A2A18', accent2: '#8B5E34', ink: '#2B1D10', sub: '#5C4430', onAccent: '#F5E9D6', inside: '#B39064' },
];
const LX_INSIDE = '#DCCDB6';
export const envPalettes = (k: EnvKind) => (k === 'lixi' ? LX_PALETTES : LT_PALETTES);
const lxPal = (id: string) => LX_PALETTES.find((p) => p.id === id) || LX_PALETTES[0];
const ltPal = (id: string) => LT_PALETTES.find((p) => p.id === id) || LT_PALETTES[0];
// bản "khuôn ép kim": chỉ phần vàng = trắng, còn lại đen → làm bản đồ kim loại cho ảnh 3D
const foilLx = (p: LxPalette): LxPalette => {
  const on = (c: string) => (c === p.gold ? '#FFFFFF' : '#000000');
  return { ...p, bg: '#000000', bg2: '#000000', gold: '#FFFFFF', ink: on(p.ink), flower: on(p.flower), branch: '#000000' };
};
export const swatchOf = (k: EnvKind, id: string) => (k === 'lixi' ? lxPal(id).bg : ltPal(id).accent);
export const swatch2Of = (k: EnvKind, id: string) => (k === 'lixi' ? lxPal(id).gold : ltPal(id).accent2);
export const envHasFoil = (spec: EnvSpec) => envSize(spec.size).kind === 'lixi' && lxPal(spec.palette).foil;
export const envEdgeColor = (spec: EnvSpec) => (envSize(spec.size).kind === 'lixi' ? lxPal(spec.palette).bg : ltPal(spec.palette).paper);
export const envInsideColor = (spec: EnvSpec) => (envSize(spec.size).kind === 'lixi' ? LX_INSIDE : ltPal(spec.palette).inside);

// ---------- mẫu ----------
export interface EnvSpec { layout: string; palette: string; font: string; size: string; flap: FlapShape; window: boolean }
export interface EnvTemplate { id: string; name: string; kind: EnvKind; spec: Pick<EnvSpec, 'layout' | 'palette' | 'font'> }
const LX_LAYOUT_NAME: Record<string, string> = { phuc: 'Ấn Phúc', mai: 'Cành mai', wave: 'Sóng mây', frame: 'Khung thanh lịch' };
const LT_LAYOUT_NAME: Record<string, string> = { bar: 'Sọc lề', band: 'Dải đầu', minimal: 'Tối giản', pattern: 'Hoạ tiết' };
const T = (kind: EnvKind, layout: string, palette: string, font: string): EnvTemplate => ({
  id: `${kind}-${layout}-${palette}`, kind,
  name: `${(kind === 'lixi' ? LX_LAYOUT_NAME : LT_LAYOUT_NAME)[layout]} · ${(kind === 'lixi' ? lxPal(palette) : ltPal(palette)).name}`,
  spec: { layout, palette, font },
});
export const ENV_TEMPLATES: EnvTemplate[] = [
  T('lixi', 'phuc', 'do', 'playfair'), T('lixi', 'mai', 'do', 'playfair'), T('lixi', 'wave', 'do', 'montserrat'),
  T('lixi', 'frame', 'trang', 'cormorant'), T('lixi', 'mai', 'hong', 'playfair'), T('lixi', 'phuc', 'navy', 'playfair'),
  T('lixi', 'wave', 'den', 'montserrat'), T('lixi', 'frame', 'hong', 'cormorant'), T('lixi', 'mai', 'ngoc', 'playfair'),
  T('lixi', 'phuc', 'tham', 'cormorant'), T('lixi', 'wave', 'cam', 'bvp'),
  T('letter', 'bar', 'navy', 'montserrat'), T('letter', 'band', 'teal', 'bvp'), T('letter', 'minimal', 'black', 'playfair'),
  T('letter', 'pattern', 'red', 'montserrat'), T('letter', 'minimal', 'kraft', 'cormorant'),
];
export const envTemplates = (k: EnvKind) => ENV_TEMPLATES.filter((t) => t.kind === k);
export const defaultEnvSpec = (k: EnvKind): EnvSpec => (k === 'lixi'
  ? { layout: 'phuc', palette: 'do', font: 'playfair', size: 'lx-85', flap: 'arc', window: false }
  : { layout: 'bar', palette: 'navy', font: 'montserrat', size: 'dl', flap: 'v', window: false });

export type EnvData = Record<string, string>;
export interface EnvField { key: string; label: string; ph?: string; half?: boolean }
export const ENV_FIELDS: Record<EnvKind, EnvField[]> = {
  lixi: [
    { key: 'brand', label: 'Thương hiệu', ph: 'AN KHANG' },
    { key: 'big', label: 'Chữ lớn', ph: 'Phúc', half: true },
    { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn', half: true },
    { key: 'wish', label: 'Lời chúc', ph: 'An khang thịnh vượng' },
    { key: 'yearName', label: 'Năm âm lịch', ph: 'Xuân Đinh Mùi', half: true },
    { key: 'year', label: 'Năm', ph: '2027', half: true },
    { key: 'greet', label: 'Lời chúc mặt sau', ph: 'Chúc mừng năm mới' },
  ],
  letter: [
    { key: 'company', label: 'Tên công ty', ph: 'CÔNG TY TNHH AN KHANG' },
    { key: 'brand', label: 'Tên ngắn (làm logo chữ)', ph: 'AN KHANG', half: true },
    { key: 'website', label: 'Website', ph: 'ankhang.vn', half: true },
    { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM' },
    { key: 'phone', label: 'Điện thoại', ph: '028 3812 3456', half: true },
  ],
};
export const defaultEnvData = (): EnvData => ({
  brand: 'AN KHANG', big: 'Phúc', wish: 'An khang thịnh vượng', yearName: 'Xuân Đinh Mùi', year: '2027',
  greet: 'Chúc mừng năm mới', website: 'ankhang.vn',
  company: 'CÔNG TY TNHH AN KHANG', address: '12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM', phone: '028 3812 3456',
});
const initials = (s: string) => {
  const w = (s || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return 'AK';
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
};

// ---------- hình học khuôn (mm) ----------
export interface EnvGeom { kind: EnvKind; w: number; h: number; s: number; td: number; tdMax: number; yS: number; yC: number; flap: FlapShape }
export function envGeom(spec: EnvSpec): EnvGeom {
  const sz = envSize(spec.size);
  const lixi = sz.kind === 'lixi';
  const s = lixi ? 12 : 22;
  const td = spec.flap === 'v' ? sz.h * (lixi ? 0.36 : 0.52) : spec.flap === 'straight' ? sz.h * (lixi ? 0.26 : 0.36) : sz.h * (lixi ? 0.3 : 0.42);
  const tdMax = spec.flap === 'arc' ? td * 0.9375 : td;
  return { kind: sz.kind, w: sz.w, h: sz.h, s, td, tdMax, yS: tdMax * 0.08, yC: tdMax * 0.78, flap: spec.flap };
}
/** khổ tấm khuôn trải phẳng (mm, chưa tính lề xén) */
export const envNetMm = (g: EnvGeom) => ({ wMm: g.w + g.s * 2, hMm: g.tdMax + g.h * 2 - g.yS });

export type Seg = ['M' | 'L', number, number] | ['Q', number, number, number, number] | ['C', number, number, number, number, number, number];
type Map2 = (x: number, y: number) => [number, number];
const ident: Map2 = (x, y) => [x, y];
export function segsToD(segs: Seg[], scale: number, map: Map2 = ident, close = false): string {
  const p = (x: number, y: number) => { const [a, b] = map(x, y); return `${+(a * scale).toFixed(2)} ${+(b * scale).toFixed(2)}`; };
  return segs.map((s) => (s[0] === 'Q' ? `Q${p(s[1], s[2])} ${p(s[3], s[4])}` : s[0] === 'C' ? `C${p(s[1], s[2])} ${p(s[3], s[4])} ${p(s[5], s[6])}` : `${s[0]}${p(s[1], s[2])}`)).join(' ') + (close ? ' Z' : '');
}
// các tai trong hệ toạ độ MẶT SAU (nhìn từ sau, lật theo trục dọc), mm. Nắp trên đi từ (0,0) → (W,0).
export function topFlapSegs(g: EnvGeom): Seg[] {
  const { w: W, td } = g;
  if (g.flap === 'v') {
    const k = Math.min(9, W * 0.05), dy = (td * k) / (W / 2);
    return [['M', 0, 0], ['L', W / 2 - k, td - dy], ['Q', W / 2, td, W / 2 + k, td - dy], ['L', W, 0]];
  }
  if (g.flap === 'straight') {
    const c = W * 0.05, r = Math.min(6, td * 0.3);
    return [['M', 0, 0], ['L', c, td - r], ['Q', c, td, c + r, td], ['L', W - c - r, td], ['Q', W - c, td, W - c, td - r], ['L', W, 0]];
  }
  return [['M', 0, 0], ['C', W * 0.04, td * 1.25, W * 0.96, td * 1.25, W, 0]];
}
function bottomFlapSegs(g: EnvGeom): Seg[] {
  const { w: W, h: H, s, yS, yC } = g;
  const k = W * 0.06, sl = (yC - yS) / (W / 2 - 0.6 * s);
  return [['M', 0, H], ['L', 0.6 * s, yS], ['L', W / 2 - k, yC - sl * k], ['Q', W / 2, yC, W / 2 + k, yC - sl * k], ['L', W - 0.6 * s, yS], ['L', W, H]];
}
// sideR: mép trái khi nhìn mặt sau (= tai PHẢI trên khuôn); sideL ngược lại
const sideRSegs = (g: EnvGeom): Seg[] => [['M', 0, 0], ['L', g.s, g.s * 0.8], ['L', g.s, g.h - g.s * 0.8], ['L', 0, g.h]];
const sideLSegs = (g: EnvGeom): Seg[] => [['M', g.w, 0], ['L', g.w - g.s, g.s * 0.8], ['L', g.w - g.s, g.h - g.s * 0.8], ['L', g.w, g.h]];
export const windowRectMm = (g: EnvGeom) => ({ x: 20, y: g.h - 15 - 45, w: 90, h: 45 });

// ---------- tiện ích chữ (đo thật bằng canvas khi có font) ----------
let mctx: CanvasRenderingContext2D | null | undefined;
function measure(text: string, family: string, weight: number, size: number): number {
  if (mctx === undefined) mctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
  if (!mctx) return text.length * size * 0.56;
  mctx.font = `${weight} ${size}px "${family}"`;
  return mctx.measureText(text).width;
}
const fitSz = (text: string, family: string, weight: number, maxW: number, size: number, ls = 0) => {
  const w = measure(text, family, weight, size) + ls * text.length;
  return w > maxW ? (size * maxW) / w : size;
};
// tách tối đa 2 dòng cân nhau khi quá rộng
function split2(text: string, family: string, weight: number, size: number, maxW: number): string[] {
  const t = (text || '').trim();
  if (!t) return [];
  if (measure(t, family, weight, size) <= maxW) return [t];
  const w = t.split(/\s+/);
  if (w.length < 2) return [t];
  let best = [t], bw = Infinity;
  for (let i = 1; i < w.length; i++) {
    const a = w.slice(0, i).join(' '), b = w.slice(i).join(' ');
    const m = Math.max(measure(a, family, weight, size), measure(b, family, weight, size));
    if (m < bw) { bw = m; best = [a, b]; }
  }
  return best;
}
function Txt({ x, y, t, fam, wt, size, max, fill, anchor = 'middle', ls = 0, op }: {
  x: number; y: number; t: string; fam: string; wt: number; size: number; max?: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; op?: number;
}) {
  if (!t) return null;
  const sz = max ? fitSz(t, fam, wt, max, size, ls) : size;
  return <text x={x} y={y} textAnchor={anchor} fontFamily={`"${fam}"`} fontWeight={wt} fontSize={+sz.toFixed(2)} fill={fill} letterSpacing={ls ? +((ls * sz) / size).toFixed(2) : undefined} opacity={op}>{t}</text>;
}

// ---------- hoạ tiết Tết ----------
function Mai({ x, y, r, petal, core, rot = 0 }: { x: number; y: number; r: number; petal: string; core: string; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={0} cy={-r * 0.55} rx={r * 0.43} ry={r * 0.56} fill={petal} transform={`rotate(${i * 72})`} />)}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return <g key={i}><line x1={0} y1={0} x2={Math.cos(a) * r * 0.48} y2={Math.sin(a) * r * 0.48} stroke={core} strokeWidth={r * 0.05} /><circle cx={Math.cos(a) * r * 0.5} cy={Math.sin(a) * r * 0.5} r={r * 0.07} fill={core} /></g>;
      })}
      <circle r={r * 0.2} fill={core} />
    </g>
  );
}
const Bud = ({ x, y, r, fill, stem }: { x: number; y: number; r: number; fill: string; stem: string }) => (
  <g><circle cx={x} cy={y} r={r} fill={fill} /><path d={`M${x - r * 0.7} ${y + r * 0.5} Q${x} ${y + r * 1.4} ${x + r * 0.7} ${y + r * 0.5}`} fill={stem} /></g>
);
function Coin({ x, y, r, color, sw }: { x: number; y: number; r: number; color: string; sw: number }) {
  return (
    <g fill="none" stroke={color} strokeWidth={sw}>
      <circle cx={x} cy={y} r={r} /><circle cx={x} cy={y} r={r * 0.78} />
      <rect x={x - r * 0.27} y={y - r * 0.27} width={r * 0.54} height={r * 0.54} />
    </g>
  );
}
// vùng cắt bằng <svg> lồng (không cần id)
const Clip = ({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children: ReactNode }) => (
  <svg x={x} y={y} width={w} height={h} viewBox={`${x} ${y} ${w} ${h}`} overflow="hidden">{children}</svg>
);
function CoinPattern({ x, y, w, h, r, gap, color, op }: { x: number; y: number; w: number; h: number; r: number; gap: number; color: string; op: number }) {
  const out: ReactNode[] = [];
  for (let j = 0, yy = y; yy < y + h + gap; j++, yy += gap * 0.86) {
    for (let xx = x + (j % 2 ? gap / 2 : 0); xx < x + w + gap; xx += gap) out.push(<Coin key={`${j}-${xx}`} x={xx} y={yy} r={r} color={color} sw={r * 0.12} />);
  }
  return <Clip x={x} y={y} w={w} h={h}><g opacity={op}>{out}</g></Clip>;
}
// sóng (seigaiha): hàng dưới vẽ đè nửa dưới hàng trên
function Waves({ x, y, w, h, r, fill, stroke, sw }: { x: number; y: number; w: number; h: number; r: number; fill: string; stroke: string; sw: number }) {
  const out: ReactNode[] = [];
  for (let j = 0, yy = y + r * 0.2; yy < y + h + r * 1.2; j++, yy += r * 0.5) {
    for (let xx = x - (j % 2 ? r : 0); xx < x + w + r; xx += r * 2) {
      out.push(<g key={`${j}-${xx}`}><circle cx={xx} cy={yy} r={r} fill={fill} stroke={stroke} strokeWidth={sw} /><circle cx={xx} cy={yy} r={r * 0.68} fill="none" stroke={stroke} strokeWidth={sw} /><circle cx={xx} cy={yy} r={r * 0.36} fill="none" stroke={stroke} strokeWidth={sw} /></g>);
    }
  }
  return <Clip x={x} y={y} w={w} h={h}>{out}</Clip>;
}
// mây tường vân
function Cloud({ x, y, s, fill, stroke, sw, flip = false }: { x: number; y: number; s: number; fill: string; stroke: string; sw: number; flip?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`} fill={fill} stroke={stroke} strokeWidth={sw / s} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-34 0 H34 A12 12 0 0 0 26 -20 A15 15 0 0 0 0 -28 A13 13 0 0 0 -22 -18 A10 10 0 0 0 -34 0 Z" />
      <path d="M-6 -12 a6 6 0 1 1 6 6 a3 3 0 1 1 -3 -3" fill="none" />
      <path d="M14 -8 a4.5 4.5 0 1 0 -4.5 -4.5" fill="none" />
    </g>
  );
}
function Branch({ W, H, k, p }: { W: number; H: number; k: number; p: LxPalette }) {
  const fl: [number, number, number, number][] = [
    [0.88 * W, 0.07 * H, 11, 10], [0.63 * W, 0.135 * H, 13, -12], [0.47 * W, 0.06 * H, 9, 25], [0.43 * W, 0.245 * H, 12, 8],
    [0.6 * W, 0.33 * H, 10, -20], [0.21 * W, 0.335 * H, 11, 30], [0.08 * W, 0.395 * H, 8, 0],
  ];
  const buds: [number, number, number][] = [[0.74 * W, 0.1 * H, 3.4], [0.36 * W, 0.05 * H, 3], [0.33 * W, 0.3 * H, 3.2], [0.69 * W, 0.355 * H, 3]];
  return (
    <g>
      <g fill="none" stroke={p.branch} strokeLinecap="round">
        <path d={`M${W + 10 * k} ${0.03 * H} C${0.76 * W} ${0.09 * H} ${0.6 * W} ${0.12 * H} ${0.44 * W} ${0.24 * H} S${0.18 * W} ${0.35 * H} ${0.04 * W} ${0.41 * H}`} strokeWidth={3.4 * k} />
        <path d={`M${0.67 * W} ${0.125 * H} Q${0.55 * W} ${0.05 * H} ${0.34 * W} ${0.045 * H}`} strokeWidth={1.8 * k} />
        <path d={`M${0.45 * W} ${0.235 * H} Q${0.52 * W} ${0.31 * H} ${0.71 * W} ${0.355 * H}`} strokeWidth={1.6 * k} />
        <path d={`M${0.27 * W} ${0.3 * H} Q${0.31 * W} ${0.27 * H} ${0.34 * W} ${0.295 * H}`} strokeWidth={1.2 * k} />
      </g>
      {buds.map(([x, y, r], i) => <Bud key={i} x={x} y={y} r={r * k} fill={p.flower} stem={p.branch} />)}
      {fl.map(([x, y, r, rot], i) => <Mai key={i} x={x} y={y} r={r * k} petal={p.flower} core={p.branch} rot={rot} />)}
    </g>
  );
}
function Corner({ x, y, sx, sy, s, c }: { x: number; y: number; sx: number; sy: number; s: number; c: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${sx} ${sy})`} fill="none" stroke={c} strokeWidth={0.9}>
      <path d={`M0 ${s * 2.2} V${s * 0.6} A${s * 0.6} ${s * 0.6} 0 0 1 ${s * 0.6} 0 H${s * 2.2}`} />
      <rect x={s * 0.55} y={s * 0.55} width={s * 0.7} height={s * 0.7} fill={c} stroke="none" transform={`rotate(45 ${s * 0.9} ${s * 0.9})`} />
    </g>
  );
}

// ---------- LÌ XÌ: mặt trước / mặt sau ----------
interface ArtCtx { spec: EnvSpec; data: EnvData; g: EnvGeom; W: number; H: number; b: number; fid: string }

function LxFront({ spec, data, W, H, b, fid, p }: ArtCtx & { p: LxPalette }) {
  const k = W / 170;
  const f = envFont(spec.font), disp = f.family, dw = f.weight;
  const bg = <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={p.bg} />;
  const brand = (data.brand || '').toUpperCase();
  const yr = [data.yearName, data.year].filter(Boolean).join(' ').toUpperCase();
  const wishLines = (sz: number, maxW: number) => split2(data.wish || '', disp, dw, sz, maxW);
  if (spec.layout === 'mai') {
    const wl = wishLines(13 * k, W * 0.78);
    return (
      <>
        <defs><radialGradient id={`${fid}-rg`} cx="0.5" cy="0.55" r="0.75"><stop offset="0" stopColor={p.bg} /><stop offset="1" stopColor={p.bg2} /></radialGradient></defs>
        <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={`url(#${fid}-rg)`} />
        <Branch W={W} H={H} k={k} p={p} />
        <Txt x={W / 2} y={H * 0.555} t={data.year || ''} fam={disp} wt={dw} size={58 * k} max={W * 0.74} fill={p.gold} />
        <Txt x={W / 2} y={H * 0.66} t={data.yearName || ''} fam={SCRIPT} wt={700} size={21 * k} max={W * 0.8} fill={p.gold} />
        <rect x={W / 2 - 2.6 * k} y={H * 0.695 - 2.6 * k} width={5.2 * k} height={5.2 * k} fill={p.gold} transform={`rotate(45 ${W / 2} ${H * 0.695})`} />
        <line x1={W / 2 - 26 * k} y1={H * 0.695} x2={W / 2 - 6 * k} y2={H * 0.695} stroke={p.gold} strokeWidth={0.7 * k} />
        <line x1={W / 2 + 6 * k} y1={H * 0.695} x2={W / 2 + 26 * k} y2={H * 0.695} stroke={p.gold} strokeWidth={0.7 * k} />
        {wl.map((l, i) => <Txt key={i} x={W / 2} y={H * 0.755 + i * 17 * k} t={l} fam={disp} wt={dw} size={13 * k} max={W * 0.8} fill={p.ink} />)}
        <line x1={W / 2 - 12 * k} y1={H * 0.88} x2={W / 2 + 12 * k} y2={H * 0.88} stroke={p.gold} strokeWidth={0.8 * k} />
        <Txt x={W / 2} y={H * 0.925} t={brand} fam={disp} wt={dw} size={10 * k} max={W * 0.7} fill={p.ink} ls={2.2 * k} />
      </>
    );
  }
  if (spec.layout === 'wave') {
    const cy = H * 0.36, R = W * 0.32;
    const wl = wishLines(14 * k, W * 0.84);
    return (
      <>
        {bg}
        <Txt x={W / 2} y={26 * k} t={brand} fam={disp} wt={dw} size={10.5 * k} max={W * 0.7} fill={p.ink} ls={2.5 * k} />
        <Txt x={W / 2} y={40 * k} t={yr} fam={BODY} wt={600} size={7 * k} max={W * 0.7} fill={p.gold} ls={1.6 * k} />
        <circle cx={W / 2} cy={cy} r={R + 5 * k} fill="none" stroke={p.gold} strokeWidth={0.7 * k} strokeDasharray={`${1.2 * k} ${2.6 * k}`} />
        <circle cx={W / 2} cy={cy} r={R} fill={p.gold} />
        <Txt x={W / 2} y={cy + 15 * k} t={data.big || ''} fam={SCRIPT} wt={700} size={46 * k} max={R * 1.55} fill={p.bg} />
        <Cloud x={W * 0.17} y={cy + R * 0.82} s={0.62 * k} fill={p.bg} stroke={p.gold} sw={1.1 * k} />
        <Cloud x={W * 0.84} y={cy + R * 0.5} s={0.5 * k} fill={p.bg} stroke={p.gold} sw={1.1 * k} flip />
        {wl.map((l, i) => <Txt key={i} x={W / 2} y={H * 0.585 + i * 18 * k} t={l} fam={disp} wt={dw} size={14 * k} max={W * 0.84} fill={p.ink} />)}
        <Waves x={-b} y={H * 0.68} w={W + 2 * b} h={H * 0.32 + b} r={13 * k} fill={p.bg} stroke={p.gold} sw={0.9 * k} />
      </>
    );
  }
  if (spec.layout === 'frame') {
    const wl = wishLines(13 * k, W * 0.74);
    const i1 = 8 * k, i2 = 11 * k;
    return (
      <>
        {bg}
        <rect x={i1} y={i1} width={W - 2 * i1} height={H - 2 * i1} fill="none" stroke={p.gold} strokeWidth={1 * k} />
        <rect x={i2} y={i2} width={W - 2 * i2} height={H - 2 * i2} fill="none" stroke={p.gold} strokeWidth={0.45 * k} />
        {([[i2 + 2 * k, i2 + 2 * k, 1, 1], [W - i2 - 2 * k, i2 + 2 * k, -1, 1], [i2 + 2 * k, H - i2 - 2 * k, 1, -1], [W - i2 - 2 * k, H - i2 - 2 * k, -1, -1]] as const).map(([x, y, sx, sy], i) => <Corner key={i} x={x} y={y} sx={sx} sy={sy} s={6 * k} c={p.gold} />)}
        <g>
          <path d={`M${W / 2 - 22 * k} ${46 * k} Q${W / 2} ${36 * k} ${W / 2 + 24 * k} ${44 * k}`} fill="none" stroke={p.branch} strokeWidth={1.3 * k} strokeLinecap="round" />
          <Mai x={W / 2 - 15 * k} y={42 * k} r={6.5 * k} petal={p.flower} core={p.branch} rot={12} />
          <Mai x={W / 2 + 3 * k} y={38 * k} r={8.5 * k} petal={p.flower} core={p.branch} rot={-8} />
          <Mai x={W / 2 + 19 * k} y={44 * k} r={5.5 * k} petal={p.flower} core={p.branch} rot={30} />
        </g>
        <Txt x={W / 2} y={H * 0.45} t={data.big || ''} fam={SCRIPT} wt={700} size={66 * k} max={W * 0.7} fill={p.ink} />
        <line x1={W / 2 - 15 * k} y1={H * 0.5} x2={W / 2 + 15 * k} y2={H * 0.5} stroke={p.gold} strokeWidth={0.8 * k} />
        {wl.map((l, i) => <Txt key={i} x={W / 2} y={H * 0.575 + i * 17 * k} t={l} fam={disp} wt={dw} size={13 * k} max={W * 0.74} fill={p.ink} />)}
        <Txt x={W / 2} y={H * 0.77} t={yr} fam={BODY} wt={600} size={7.5 * k} max={W * 0.7} fill={p.gold} ls={1.8 * k} />
        <Txt x={W / 2} y={H * 0.885} t={brand} fam={disp} wt={dw} size={10 * k} max={W * 0.66} fill={p.ink} ls={2.4 * k} />
      </>
    );
  }
  // phuc: ấn tròn giữa + sóng đáy + đồng tiền chìm
  const cy = H * 0.4, R = W * 0.33;
  const wl = wishLines(16 * k, W * 0.8);
  return (
    <>
      {bg}
      <CoinPattern x={-b} y={-b} w={W + 2 * b} h={H * 0.8 + b} r={6 * k} gap={22 * k} color={p.gold} op={0.14} />
      <rect x={7 * k} y={7 * k} width={W - 14 * k} height={H - 14 * k} rx={3 * k} fill="none" stroke={p.gold} strokeWidth={1.1 * k} />
      <rect x={10 * k} y={10 * k} width={W - 20 * k} height={H - 20 * k} rx={2 * k} fill="none" stroke={p.gold} strokeWidth={0.45 * k} />
      <Txt x={W / 2} y={31 * k} t={brand} fam={disp} wt={dw} size={11 * k} max={W * 0.62} fill={p.ink} ls={2.5 * k} />
      <line x1={W / 2 - 14 * k} y1={37 * k} x2={W / 2 + 14 * k} y2={37 * k} stroke={p.gold} strokeWidth={0.7 * k} />
      {Array.from({ length: 28 }).map((_, i) => { const a = (i / 28) * Math.PI * 2; return <circle key={i} cx={W / 2 + Math.cos(a) * (R + 8 * k)} cy={cy + Math.sin(a) * (R + 8 * k)} r={0.9 * k} fill={p.gold} />; })}
      <circle cx={W / 2} cy={cy} r={R} fill={p.bg2} stroke={p.gold} strokeWidth={1.6 * k} />
      <circle cx={W / 2} cy={cy} r={R - 4.5 * k} fill="none" stroke={p.gold} strokeWidth={0.55 * k} />
      <Txt x={W / 2} y={cy + 16 * k} t={data.big || ''} fam={SCRIPT} wt={700} size={50 * k} max={R * 1.6} fill={p.gold} />
      {wl.map((l, i) => <Txt key={i} x={W / 2} y={cy + R + 26 * k + i * 20 * k} t={l} fam={disp} wt={dw} size={16 * k} max={W * 0.8} fill={p.ink} />)}
      <Txt x={W / 2} y={H * 0.795} t={yr} fam={BODY} wt={600} size={8 * k} max={W * 0.72} fill={p.ink} ls={1.8 * k} />
      <Waves x={-b} y={H * 0.82} w={W + 2 * b} h={H * 0.18 + b} r={12 * k} fill={p.bg} stroke={p.gold} sw={0.9 * k} />
    </>
  );
}

function LxBack({ spec, data, g, W, H, b, p }: ArtCtx & { p: LxPalette }) {
  const k = W / 170;
  const f = envFont(spec.font);
  const sealY = g.tdMax * U * 0.48;
  return (
    <>
      <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={p.bg} />
      {spec.layout === 'phuc' && <CoinPattern x={-b} y={-b} w={W + 2 * b} h={H + 2 * b} r={6 * k} gap={22 * k} color={p.gold} op={0.12} />}
      {spec.layout === 'wave' && <Waves x={-b} y={H * 0.8} w={W + 2 * b} h={H * 0.2 + b} r={13 * k} fill={p.bg} stroke={p.gold} sw={0.9 * k} />}
      {spec.layout === 'frame' && <rect x={8 * k} y={8 * k} width={W - 16 * k} height={H - 16 * k} fill="none" stroke={p.gold} strokeWidth={0.8 * k} />}
      {spec.layout === 'mai' && (
        <g>
          <path d={`M${-10 * k} ${H * 0.95} Q${W * 0.25} ${H * 0.86} ${W * 0.44} ${H * 0.88}`} fill="none" stroke={p.branch} strokeWidth={2.2 * k} strokeLinecap="round" />
          <Mai x={W * 0.12} y={H * 0.905} r={9 * k} petal={p.flower} core={p.branch} />
          <Mai x={W * 0.32} y={H * 0.865} r={7 * k} petal={p.flower} core={p.branch} rot={20} />
          <Bud x={W * 0.45} y={H * 0.875} r={2.8 * k} fill={p.flower} stem={p.branch} />
        </g>
      )}
      {/* ấn thương hiệu nằm giữa nắp */}
      <circle cx={W / 2} cy={sealY} r={12 * k} fill="none" stroke={p.gold} strokeWidth={1 * k} />
      <circle cx={W / 2} cy={sealY} r={9.6 * k} fill="none" stroke={p.gold} strokeWidth={0.4 * k} />
      <Txt x={W / 2} y={sealY + 3.6 * k} t={initials(data.brand || '')} fam={f.family} wt={f.weight} size={10 * k} max={15 * k} fill={p.gold} />
      <Txt x={W / 2} y={H * 0.57} t={data.greet || ''} fam={SCRIPT} wt={700} size={20 * k} max={W * 0.82} fill={p.ink} />
      <Txt x={W / 2} y={H * 0.62} t={(data.brand || '').toUpperCase()} fam={f.family} wt={f.weight} size={7.5 * k} max={W * 0.6} fill={p.gold} ls={2 * k} />
      <Txt x={W / 2} y={H * (spec.layout === 'wave' || spec.layout === 'mai' ? 0.77 : 0.9)} t={data.website || ''} fam={BODY} wt={600} size={7 * k} max={W * 0.7} fill={p.ink} op={0.85} />
    </>
  );
}

// ---------- PHONG BÌ: mặt trước / mặt sau ----------
function Stripes({ x, y, w, h, c, gap, sw, op }: { x: number; y: number; w: number; h: number; c: string; gap: number; sw: number; op: number }) {
  const ls: ReactNode[] = [];
  for (let t = -h; t < w + h; t += gap) ls.push(<line key={t} x1={x + t} y1={y + h} x2={x + t + h} y2={y} />);
  return <Clip x={x} y={y} w={w} h={h}><g stroke={c} strokeWidth={sw} opacity={op}>{ls}</g></Clip>;
}
function Recipient({ W, H, g, p }: { W: number; H: number; g: EnvGeom; p: LtPalette }) {
  const m = (v: number) => v * U;
  const x0 = W * 0.47, y0 = H * 0.5;
  const n = g.h > 140 ? 4 : 3;
  return (
    <g>
      <text x={x0} y={y0} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={m(4)} fill={p.ink}>Kính gửi:</text>
      {Array.from({ length: n }).map((_, i) => <line key={i} x1={x0} y1={y0 + m(10) * (i + 1)} x2={W - m(14)} y2={y0 + m(10) * (i + 1)} stroke={p.sub} strokeOpacity={0.45} strokeWidth={0.8} strokeDasharray="1.5 3" />)}
    </g>
  );
}
function WindowArt({ g, fid }: { g: EnvGeom; fid: string }) {
  const r = windowRectMm(g), m = (v: number) => v * U;
  const x = m(r.x), y = m(r.y), w = m(r.w), h = m(r.h), rx = m(2.5);
  return (
    <g>
      <defs>
        <linearGradient id={`${fid}-wg`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><stop offset="0.42" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0.55" /><stop offset="0.6" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* thư bên trong (lùi xuống dưới màng) */}
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="#EEF0F3" />
      <text x={x + m(9)} y={y + m(13)} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={m(3.4)} fill="#374151">Kính gửi: Bà Thu Hà</text>
      <text x={x + m(9)} y={y + m(19.5)} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={m(3)} fill="#4B5563">Phòng Kế toán — Công ty Quốc Bảo</text>
      <text x={x + m(9)} y={y + m(25.5)} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={m(3)} fill="#4B5563">45 Lê Lợi, P. Bến Thành, Q.1, TP.HCM</text>
      {/* mép cửa sổ đổ bóng lên thư + màng kính có vệt sáng */}
      <rect x={x + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} rx={rx} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={3} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill={`url(#${fid}-wg)`} />
      <rect x={x} y={y} width={w} height={h} rx={rx} fill="none" stroke="rgba(15,23,42,0.28)" strokeWidth={1} />
    </g>
  );
}
function LtFront({ spec, data, g, W, H, b, fid, p }: ArtCtx & { p: LtPalette }) {
  const m = (v: number) => v * U;
  const f = envFont(spec.font), disp = f.family, dw = f.weight;
  const ini = initials(data.brand || data.company || '');
  const contact = [data.phone, data.website].filter(Boolean).join('   ·   ');
  const maxW = W * 0.52;
  const bg = <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={p.paper} />;
  const bottom = spec.window ? <WindowArt g={g} fid={fid} /> : <Recipient W={W} H={H} g={g} p={p} />;
  if (spec.layout === 'band') {
    return (
      <>
        {bg}
        <rect x={-b} y={-b} width={W + 2 * b} height={m(22) + b} fill={p.accent} />
        <circle cx={m(17)} cy={m(11)} r={m(6.5)} fill="none" stroke={p.onAccent} strokeWidth={m(0.6)} />
        <Txt x={m(17)} y={m(13.2)} t={ini} fam={disp} wt={dw} size={m(5.4)} max={m(9.5)} fill={p.onAccent} />
        <Txt x={m(28)} y={m(13)} t={data.company || ''} fam={disp} wt={dw} size={m(5)} max={W * 0.56} fill={p.onAccent} anchor="start" />
        <Txt x={W - m(12)} y={m(13)} t={data.website || ''} fam={BODY} wt={600} size={m(3.4)} max={W * 0.22} fill={p.onAccent} anchor="end" op={0.85} />
        <Txt x={m(12)} y={m(30)} t={data.address || ''} fam={BODY} wt={500} size={m(3.3)} max={maxW} fill={p.sub} anchor="start" />
        <Txt x={m(12)} y={m(35.5)} t={data.phone ? `ĐT: ${data.phone}` : ''} fam={BODY} wt={500} size={m(3.3)} max={maxW} fill={p.sub} anchor="start" />
        {bottom}
        <rect x={-b} y={H - m(4)} width={W + 2 * b} height={m(4) + b} fill={p.accent2} />
      </>
    );
  }
  if (spec.layout === 'minimal' || spec.layout === 'pattern') {
    return (
      <>
        {bg}
        {spec.layout === 'pattern' && (
          <g>
            <rect x={W - m(16)} y={-b} width={m(16) + b} height={H + 2 * b} fill={p.accent} />
            <Stripes x={W - m(16)} y={-b} w={m(16) + b} h={H + 2 * b} c={p.accent2} gap={m(4)} sw={m(0.9)} op={0.55} />
          </g>
        )}
        <circle cx={m(18)} cy={m(17)} r={m(5.5)} fill={p.accent} />
        <Txt x={m(18)} y={m(18.9)} t={ini} fam={disp} wt={dw} size={m(4.6)} max={m(8)} fill={p.onAccent} />
        <Txt x={m(27)} y={m(16)} t={data.company || ''} fam={disp} wt={dw} size={m(4.6)} max={maxW} fill={p.ink} anchor="start" />
        <Txt x={m(27)} y={m(21.5)} t={data.address || ''} fam={BODY} wt={500} size={m(3.1)} max={maxW} fill={p.sub} anchor="start" />
        <rect x={m(27)} y={m(25)} width={m(22)} height={m(0.7)} fill={p.accent2} />
        <Txt x={m(27)} y={m(30.5)} t={contact} fam={BODY} wt={500} size={m(3.1)} max={maxW} fill={p.sub} anchor="start" />
        {bottom}
      </>
    );
  }
  // bar
  return (
    <>
      {bg}
      <rect x={-b} y={-b} width={b + m(7)} height={H + 2 * b} fill={p.accent} />
      <rect x={m(7)} y={-b} width={m(1.3)} height={H + 2 * b} fill={p.accent2} />
      <circle cx={m(22)} cy={m(20)} r={m(8)} fill={p.accent} />
      <Txt x={m(22)} y={m(22.6)} t={ini} fam={disp} wt={dw} size={m(6.6)} max={m(11.5)} fill={p.onAccent} />
      <Txt x={m(34)} y={m(17.5)} t={data.company || ''} fam={disp} wt={dw} size={m(5.2)} max={W * 0.56} fill={p.ink} anchor="start" />
      <Txt x={m(34)} y={m(23.8)} t={data.address || ''} fam={BODY} wt={500} size={m(3.3)} max={W * 0.56} fill={p.sub} anchor="start" />
      <Txt x={m(34)} y={m(29.2)} t={contact} fam={BODY} wt={500} size={m(3.3)} max={W * 0.56} fill={p.sub} anchor="start" />
      {bottom}
    </>
  );
}
function LtBack({ spec, data, g, W, H, b, p }: ArtCtx & { p: LtPalette }) {
  const m = (v: number) => v * U;
  const f = envFont(spec.font);
  const ini = initials(data.brand || data.company || '');
  const flapD = segsToD(topFlapSegs(g), U, ident, true);
  const openD = segsToD(topFlapSegs(g), U);
  const sealY = g.tdMax * U * 0.5;
  const bg = <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={p.paper} />;
  const seal = (fill: string, ink: string, y = sealY, r = m(7)) => (
    <g><circle cx={W / 2} cy={y} r={r} fill={fill} stroke={ink} strokeWidth={m(0.5)} /><Txt x={W / 2} y={y + r * 0.33} t={ini} fam={f.family} wt={f.weight} size={r * 0.9} max={r * 1.5} fill={ink} /></g>
  );
  if (spec.layout === 'band') {
    return (
      <>
        {bg}
        <path d={openD} fill="none" stroke={p.accent} strokeWidth={m(1.4)} transform={`translate(0 ${-m(1.6)})`} />
        {seal(p.accent, p.onAccent, g.tdMax * U * 0.62, m(6))}
        <Txt x={W / 2} y={H * 0.82} t={data.website || ''} fam={BODY} wt={600} size={m(3.4)} max={W * 0.5} fill={p.sub} />
        <rect x={-b} y={H - m(4)} width={W + 2 * b} height={m(4) + b} fill={p.accent2} />
      </>
    );
  }
  if (spec.layout === 'minimal') {
    return (
      <>
        {bg}
        {seal(p.paper, p.accent, sealY, m(6))}
        <Txt x={W / 2} y={H * 0.72} t={(data.company || '').toUpperCase()} fam={f.family} wt={f.weight} size={m(3.2)} max={W * 0.6} fill={p.sub} ls={m(0.5)} />
        <Txt x={W / 2} y={H * 0.72 + m(6)} t={data.website || ''} fam={BODY} wt={500} size={m(3)} max={W * 0.5} fill={p.sub} op={0.8} />
      </>
    );
  }
  if (spec.layout === 'pattern') {
    return (
      <>
        {bg}
        <Stripes x={-b} y={-b} w={W + 2 * b} h={H + 2 * b} c={p.accent} gap={m(5)} sw={m(0.7)} op={0.1} />
        <path d={flapD} fill={p.accent} />
        <path d={flapD} fill="none" stroke={p.accent2} strokeWidth={m(0.8)} transform={`translate(${W / 2} 0) scale(0.9) translate(${-W / 2} 0)`} />
        {seal(p.accent2, p.onAccent)}
        <Txt x={W / 2} y={H * 0.85} t={data.website || ''} fam={BODY} wt={600} size={m(3.4)} max={W * 0.5} fill={p.accent} />
      </>
    );
  }
  return (
    <>
      {bg}
      <path d={flapD} fill={p.accent} />
      <path d={openD} fill="none" stroke={p.accent2} strokeWidth={m(1)} transform={`translate(0 ${-m(2.2)})`} />
      {seal(p.accent, p.onAccent)}
      <Txt x={W / 2} y={H * 0.84} t={data.website || ''} fam={BODY} wt={600} size={m(3.4)} max={W * 0.5} fill={p.sub} />
    </>
  );
}

function FrontArt(c: ArtCtx & { foil?: boolean }) {
  if (c.g.kind === 'lixi') { const p = lxPal(c.spec.palette); return <LxFront {...c} p={c.foil ? foilLx(p) : p} />; }
  return <LtFront {...c} p={ltPal(c.spec.palette)} />;
}
function BackArt(c: ArtCtx & { foil?: boolean }) {
  if (c.g.kind === 'lixi') { const p = lxPal(c.spec.palette); return <LxBack {...c} p={c.foil ? foilLx(p) : p} />; }
  return <LtBack {...c} p={ltPal(c.spec.palette)} />;
}
// đường mép 2 tai hông dán đè lên tai đáy (thấy nhẹ ở mặt sau)
const Seams = ({ g }: { g: EnvGeom }) => (
  <g fill="none" strokeLinejoin="round">
    <path d={segsToD(sideRSegs(g), U)} stroke="rgba(0,0,0,0.13)" strokeWidth={1.6} transform="translate(1.2 0)" />
    <path d={segsToD(sideLSegs(g), U)} stroke="rgba(0,0,0,0.13)" strokeWidth={1.6} transform="translate(-1.2 0)" />
    <path d={segsToD(sideRSegs(g), U)} stroke="rgba(255,255,255,0.35)" strokeWidth={0.6} />
    <path d={segsToD(sideLSegs(g), U)} stroke="rgba(255,255,255,0.35)" strokeWidth={0.6} />
  </g>
);
const useFid = () => 'e' + useId().replace(/[^a-zA-Z0-9]/g, '');

/**
 * Các mặt của phong bì:
 * - front: mặt trước · back: mặt sau đã dán (xem phẳng, có viền nắp)
 * - back-body: mặt sau phần THÂN (không có nắp trên; chỗ hở thấy lòng giấy) — texture 3D
 * - back-art: hình in mặt sau trọn khổ — texture nắp 3D
 * foil: bản khuôn ép kim (trắng = vàng kim) cho ánh kim 3D
 */
export function EnvelopeFace({ spec, data, side, bleed = false, foil = false, style }: {
  spec: EnvSpec; data: EnvData; side: 'front' | 'back' | 'back-body' | 'back-art'; bleed?: boolean; foil?: boolean; style?: CSSProperties;
}) {
  const fid = useFid();
  const g = envGeom(spec);
  const W = g.w * U, H = g.h * U, b = bleed ? ENV_BLEED_MM * U : 0;
  const c: ArtCtx = { spec, data, g, W, H, b, fid };
  let body: ReactNode;
  if (side === 'front') body = <FrontArt {...c} foil={foil} />;
  else if (side === 'back-art') body = <BackArt {...c} foil={foil} />;
  else if (side === 'back') {
    const flapD = segsToD(topFlapSegs(g), U, ident, true);
    body = (
      <>
        <BackArt {...c} />
        <Seams g={g} />
        <path d={flapD} fill="none" stroke="rgba(0,0,0,0.20)" strokeWidth={2} transform="translate(0 1.6)" />
        <path d={flapD} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={4} transform="translate(0 2.4)" />
        <path d={flapD} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth={0.6} />
      </>
    );
  } else {
    // thân sau: tai hông + tai đáy phủ hình in, phần còn lại (miệng phong bì) = lòng giấy
    const mk = `${fid}-body`;
    const bd = segsToD(bottomFlapSegs(g), U, ident, true);
    body = (
      <>
        <defs>
          <mask id={mk} maskUnits="userSpaceOnUse" x={-W} y={-H} width={W * 3} height={H * 3}>
            <path d={segsToD(sideRSegs(g), U, ident, true)} fill="#fff" />
            <path d={segsToD(sideLSegs(g), U, ident, true)} fill="#fff" />
            <path d={bd} fill="#fff" />
          </mask>
        </defs>
        <rect x={0} y={0} width={W} height={H} fill={foil ? '#000000' : envInsideColor(spec)} />
        <g mask={`url(#${mk})`}><BackArt {...c} foil={foil} /></g>
        {!foil && <path d={segsToD(bottomFlapSegs(g), U)} fill="none" stroke="rgba(0,0,0,0.22)" strokeWidth={1.4} transform="translate(0 1)" />}
        {!foil && <Seams g={g} />}
      </>
    );
  }
  return <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">{body}</svg>;
}

/** khuôn bế trải phẳng: mặt trước giữa + 4 tai in phần mặt sau tương ứng, nét cắt liền + nét gấp đứt, lề xén 3mm */
export function EnvelopeDieline({ spec, data, legend = false, style }: { spec: EnvSpec; data: EnvData; legend?: boolean; style?: CSSProperties }) {
  const fid = useFid();
  const g = envGeom(spec);
  const W = g.w * U, H = g.h * U, B = ENV_BLEED_MM * U;
  const net = envNetMm(g);
  const x0 = -g.s * U - B, y0 = -g.tdMax * U - B;
  const vw = net.wMm * U + 2 * B, vh = net.hMm * U + 2 * B + (legend ? 14 * U : 0);
  const c: ArtCtx = { spec, data, g, W, H, b: 0, fid };
  // ánh xạ gấp: hệ mặt sau → khuôn
  const tai = [
    { k: 'l', segs: sideLSegs(g), tr: `translate(${-W} 0)`, map: ((x, y) => [x - g.w, y]) as Map2 },
    { k: 'r', segs: sideRSegs(g), tr: `translate(${W} 0)`, map: ((x, y) => [x + g.w, y]) as Map2 },
    { k: 'b', segs: bottomFlapSegs(g), tr: `translate(${W} ${2 * H}) scale(-1 -1)`, map: ((x, y) => [g.w - x, 2 * g.h - y]) as Map2 },
    { k: 't', segs: topFlapSegs(g), tr: `translate(${W} 0) scale(-1 -1)`, map: ((x, y) => [g.w - x, -y]) as Map2 },
  ];
  const win = spec.window && g.kind === 'letter' ? windowRectMm(g) : null;
  const lbl = (x: number, y: number, t: string) => <text x={x} y={y} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={4 * U} fill="#64748B" opacity={0.85}>{t}</text>;
  return (
    <svg viewBox={`${x0} ${y0} ${vw} ${vh}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <rect x={x0} y={y0} width={vw} height={vh} fill="#FFFFFF" />
      <defs>
        {tai.map((t) => (
          <mask key={t.k} id={`${fid}-m${t.k}`} maskUnits="userSpaceOnUse" x={-W * 2} y={-H * 2} width={W * 5} height={H * 5}>
            <path d={segsToD(t.segs, U, ident, true)} fill="#fff" stroke="#fff" strokeWidth={B * 2} strokeLinejoin="round" />
          </mask>
        ))}
      </defs>
      {tai.map((t) => <g key={t.k} transform={t.tr}><g mask={`url(#${fid}-m${t.k})`}><BackArt {...c} /></g></g>)}
      <svg x={0} y={0} width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="hidden"><FrontArt {...c} /></svg>
      {win && <rect x={win.x * U} y={win.y * U} width={win.w * U} height={win.h * U} rx={2.5 * U} fill="#FFFFFF" stroke={CUT} strokeWidth={1.6} />}
      <g fill="none" stroke={CUT} strokeWidth={1.6} strokeLinejoin="round">
        {tai.map((t) => <path key={t.k} d={segsToD(t.segs, U, t.map)} />)}
      </g>
      <rect x={0} y={0} width={W} height={H} fill="none" stroke={FOLD} strokeWidth={1.4} strokeDasharray="7 6" />
      {legend && (
        <g>
          {lbl(W / 2, -g.tdMax * U * 0.35, 'NẮP')}
          {lbl(W / 2, H + (g.h - g.yS) * U * 0.55, 'TAI ĐÁY (dán)')}
          <g transform={`translate(${x0 + B} ${y0 + vh - 5 * U})`} fontFamily={`"${BODY}"`} fontSize={4.4 * U} fill="#64748B">
            <line x1={0} y1={-1.4 * U} x2={10 * U} y2={-1.4 * U} stroke={CUT} strokeWidth={1.6} /><text x={12 * U} y={0}>Nét cắt</text>
            <line x1={40 * U} y1={-1.4 * U} x2={50 * U} y2={-1.4 * U} stroke={FOLD} strokeWidth={1.4} strokeDasharray="7 6" /><text x={52 * U} y={0}>Nét gấp</text>
          </g>
        </g>
      )}
    </svg>
  );
}
