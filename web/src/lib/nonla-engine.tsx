'use client';
// Nón lá in logo: 1 engine SVG = BỐ CỤC × BẢNG MỰC × FONT → nhiều mẫu, render code 100%.
// Hình học: nón Ø D, cao h → đường sinh L = √(r²+h²). Trải phẳng mặt nón = HÌNH QUẠT bán kính L, góc θ = 2π·r/L.
// Vùng in = 1 "quạt khuyên" (annular sector) ở MẶT TRƯỚC nón: bán kính [a, b] tính từ chóp, phủ Ψ = 140° vòng nón.
// Toạ độ vẽ = mm, CHÓP NÓN ở (0,0), quạt mở xuống dưới (góc α đo theo SVG, y hướng xuống; giữa mặt trước ở α = 90°).
// Trên nón: "lên trên" = hướng về chóp → chữ chạy theo cung tròn (mỗi ký tự 1 <text> xoay, outline được), hình đặt
// thẳng đứng bằng phép xoay (α − 90°). Đọc trái→phải trên nón = α GIẢM dần trên bản trải phẳng.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ nón ----------
export interface NLSize { id: string; name: string; d: number; h: number }
export const NL_SIZES: NLSize[] = [
  { id: '40', name: 'Ø40cm · cao 16cm', d: 400, h: 160 },
  { id: '45', name: 'Ø45cm · cao 17cm', d: 450, h: 170 },
  { id: '50', name: 'Ø50cm · cao 18cm', d: 500, h: 180 },
];
export const nlSize = (id: string) => NL_SIZES.find((s) => s.id === id) || NL_SIZES[0];
export const PANEL_DEG = 140; // vùng in phủ 140° vòng nón (mặt trước)
export const SAFE_MM = 8;     // chữ/hình lùi khỏi mép vùng in

export interface NLGeo { r: number; h: number; L: number; k: number; theta: number; a: number; b: number; half: number; H: number }
/** hình học trải phẳng: k = r/L (1 rad trên nón = k rad trên bản phẳng); half = nửa góc vùng in trên bản phẳng */
export function nlGeo(sizeId: string): NLGeo {
  const s = nlSize(sizeId);
  const r = s.d / 2, h = s.h, L = Math.sqrt(r * r + h * h), k = r / L;
  const a = L * 0.3, b = L * 0.92;
  return { r, h, L, k, theta: 2 * Math.PI * k, a, b, half: ((PANEL_DEG / 2) * Math.PI / 180) * k, H: b - a };
}

// ---------- font ----------
export interface NLFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const NL_FONTS: NLFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, script: true },
  { id: 'dancing', name: 'Dancing (viết tay)', family: 'Dancing Script', weight: 700, script: true },
  { id: 'vibes', name: 'Great Vibes (thư pháp)', family: 'Great Vibes', weight: 400, script: true },
];
export const nlFont = (id: string) => NL_FONTS.find((f) => f.id === id) || NL_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const NL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Lobster&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

export function useNLFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-nl-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-nl-fonts'; link.rel = 'stylesheet';
        link.href = NL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Playfair Display"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '700 40px "Cormorant Garamond"', '400 40px "Lobster"', '700 40px "Dancing Script"', '400 40px "Great Vibes"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng mực (in trên lá nón → không in nền, chỉ mực) ----------
export interface NLPalette { id: string; name: string; ink1: string; ink2: string; ink3: string }
export const NL_PALETTES: NLPalette[] = [
  { id: 'red', name: 'Đỏ son · vàng', ink1: '#A8121E', ink2: '#B98424', ink3: '#2E6B3A' },
  { id: 'lotus', name: 'Hồng sen · lá', ink1: '#B8325E', ink2: '#2F6B3B', ink3: '#D99A2B' },
  { id: 'navy', name: 'Xanh chàm · vàng', ink1: '#1B3768', ink2: '#B0802A', ink3: '#A8121E' },
  { id: 'ink', name: 'Mực tàu', ink1: '#1B1B1B', ink2: '#A8121E', ink3: '#5B5B5B' },
  { id: 'hue', name: 'Tím Huế', ink1: '#55267E', ink2: '#B0802A', ink3: '#2F6B3B' },
  { id: 'jade', name: 'Xanh ngọc', ink1: '#0E6A62', ink2: '#B8325E', ink3: '#D99A2B' },
  { id: 'brown', name: 'Nâu cà phê', ink1: '#5A361E', ink2: '#2E5E4E', ink3: '#B07040' },
];
export const nlPalette = (id: string) => NL_PALETTES.find((p) => p.id === id) || NL_PALETTES[0];

export type NLMethod = 'decal' | 'lua2' | 'lua1';
export const NL_METHODS: { id: NLMethod; name: string; note: string }[] = [
  { id: 'decal', name: 'In decal', note: 'Đủ màu, dán lên mặt nón' },
  { id: 'lua2', name: 'In lụa 2 màu', note: 'In thẳng lên lá, bền' },
  { id: 'lua1', name: 'In lụa 1 màu', note: 'Rẻ nhất, kiểu vẽ tay' },
];
/** mực thật dùng: lụa 1 màu → mọi thứ ink1; lụa 2 màu → ink3 gộp vào ink2 */
export function nlInks(p: NLPalette, m: NLMethod) {
  if (m === 'lua1') return { i1: p.ink1, i2: p.ink1, i3: p.ink1, mono: true };
  if (m === 'lua2') return { i1: p.ink1, i2: p.ink2, i3: p.ink2, mono: false };
  return { i1: p.ink1, i2: p.ink2, i3: p.ink3, mono: false };
}

export const NL_STRAPS: { id: string; name: string; color: string }[] = [
  { id: 'red', name: 'Đỏ', color: '#C8203A' },
  { id: 'pink', name: 'Hồng', color: '#E9799C' },
  { id: 'blue', name: 'Xanh dương', color: '#2E6FB8' },
  { id: 'green', name: 'Xanh lá', color: '#3B8A4E' },
  { id: 'purple', name: 'Tím', color: '#7A4AA8' },
  { id: 'yellow', name: 'Vàng', color: '#E8B630' },
  { id: 'white', name: 'Trắng', color: '#F4F1EA' },
  { id: 'black', name: 'Đen', color: '#202020' },
];
export const nlStrap = (id: string) => NL_STRAPS.find((s) => s.id === id) || NL_STRAPS[0];

// ---------- bố cục + chữ mẫu ----------
export type NLLayoutId = 'gift' | 'hello' | 'hoian' | 'hue' | 'festival' | 'lotus' | 'poem' | 'teacher' | 'tet' | 'trip' | 'bamboo';
export type NLData = Record<string, string>;
export interface NLField { key: string; label: string; multiline?: boolean }
export interface NLLayout { id: NLLayoutId; name: string; fields: NLField[]; logo?: boolean }
export const NL_LAYOUTS: NLLayout[] = [
  { id: 'gift', name: 'Quà tặng đối tác', logo: true, fields: [{ key: 'top', label: 'Dòng nhỏ trên (lời tặng)' }, { key: 'title', label: 'Tên công ty (to)' }, { key: 'sub', label: 'Dòng dưới' }] },
  { id: 'hello', name: 'Xin chào Việt Nam', fields: [{ key: 'title', label: 'Chữ lớn' }, { key: 'sub', label: 'Dòng dưới' }] },
  { id: 'hoian', name: 'Hội An · đèn lồng', fields: [{ key: 'title', label: 'Chữ lớn' }, { key: 'sub', label: 'Dòng dưới' }] },
  { id: 'hue', name: 'Huế · sông Hương', fields: [{ key: 'title', label: 'Chữ lớn' }, { key: 'sub', label: 'Dòng dưới' }] },
  { id: 'festival', name: 'Lễ hội áo dài', fields: [{ key: 'title', label: 'Tên lễ hội' }, { key: 'sub', label: 'Nơi · năm' }] },
  { id: 'lotus', name: 'Hoa sen tối giản', fields: [{ key: 'sub', label: 'Dòng chữ dưới hoa' }] },
  { id: 'poem', name: 'Nón bài thơ', fields: [{ key: 'poem', label: 'Câu thơ (mỗi dòng 1 câu, tối đa 4)', multiline: true }] },
  { id: 'teacher', name: 'Tri ân thầy cô 20/11', fields: [{ key: 'title', label: 'Chữ lớn' }, { key: 'sub', label: 'Ngày · lớp' }] },
  { id: 'tet', name: 'Xuân · Tết', fields: [{ key: 'title', label: 'Chữ lớn' }, { key: 'sub', label: 'Lời chúc' }] },
  { id: 'trip', name: 'Du lịch công ty', fields: [{ key: 'title', label: 'Tên đoàn / công ty' }, { key: 'sub', label: 'Chuyến đi · năm' }] },
  { id: 'bamboo', name: 'Lũy tre · logo', logo: true, fields: [{ key: 'title', label: 'Tên thương hiệu' }, { key: 'sub', label: 'Slogan' }] },
];
export const nlLayout = (id: string) => NL_LAYOUTS.find((l) => l.id === id) || NL_LAYOUTS[0];

export const NL_SAMPLES: Record<NLLayoutId, NLData> = {
  gift: { top: 'Thân tặng quý đối tác', title: 'AN KHANG GROUP', sub: 'Việt Nam · 2027' },
  hello: { title: 'Xin chào Việt Nam', sub: 'Hello Vietnam' },
  hoian: { title: 'Hội An', sub: 'Phố cổ · Di sản thế giới' },
  hue: { title: 'Huế', sub: 'Cố đô · Sông Hương' },
  festival: { title: 'Lễ hội Áo dài', sub: 'TP. Hồ Chí Minh · 2027' },
  lotus: { sub: 'Hương sen Việt' },
  poem: { poem: 'Nón này che nắng che mưa\nNón này để đội cho vừa người thương\nĐi đâu nhớ mãi quê hương\nNhớ hàng tre rợp, nhớ đường làng xưa' },
  teacher: { title: 'Tri ân thầy cô', sub: '20.11.2026 · Lớp 12A1' },
  tet: { title: 'Xuân Đinh Mùi 2027', sub: 'An khang thịnh vượng' },
  trip: { title: 'Team An Khang', sub: 'Du lịch Hè 2027 · Đà Nẵng' },
  bamboo: { title: 'GIA KHÁNH TEA', sub: 'Trà xanh Thái Nguyên' },
};

export interface NLSpec { layout: NLLayoutId; palette: string; font: string; size: string; method: NLMethod; strap: string }
export const defaultNLSpec: NLSpec = { layout: 'hello', palette: 'red', font: 'vibes', size: '45', method: 'decal', strap: 'red' };
export interface NLTemplate { id: string; name: string; spec: Pick<NLSpec, 'layout' | 'palette' | 'font'> }
export const NL_TEMPLATES: NLTemplate[] = [
  { id: 'hello-red', name: 'Xin chào Việt Nam', spec: { layout: 'hello', palette: 'red', font: 'vibes' } },
  { id: 'gift-navy', name: 'Quà tặng đối tác', spec: { layout: 'gift', palette: 'navy', font: 'playfair' } },
  { id: 'hoian-red', name: 'Hội An đèn lồng', spec: { layout: 'hoian', palette: 'red', font: 'lobster' } },
  { id: 'hue-purple', name: 'Huế mộng mơ', spec: { layout: 'hue', palette: 'hue', font: 'cormorant' } },
  { id: 'festival-lotus', name: 'Lễ hội áo dài', spec: { layout: 'festival', palette: 'lotus', font: 'dancing' } },
  { id: 'lotus-lotus', name: 'Hoa sen tối giản', spec: { layout: 'lotus', palette: 'lotus', font: 'dancing' } },
  { id: 'poem-ink', name: 'Nón bài thơ', spec: { layout: 'poem', palette: 'ink', font: 'dancing' } },
  { id: 'teacher-jade', name: 'Tri ân thầy cô', spec: { layout: 'teacher', palette: 'jade', font: 'lobster' } },
  { id: 'tet-red', name: 'Xuân Tết', spec: { layout: 'tet', palette: 'red', font: 'playfair' } },
  { id: 'trip-jade', name: 'Du lịch công ty', spec: { layout: 'trip', palette: 'jade', font: 'bvp' } },
  { id: 'bamboo-brown', name: 'Lũy tre · thương hiệu', spec: { layout: 'bamboo', palette: 'brown', font: 'cormorant' } },
  { id: 'gift-ink', name: 'Logo tối giản', spec: { layout: 'gift', palette: 'ink', font: 'bvp' } },
];

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
const wcache = new Map<string, number>();
function measure(text: string, family: string, weight: number): number {
  const key = `${weight}|${family}|${text}`;
  const hit = wcache.get(key); if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return text.length * 60;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 60;
  mctx.font = `${weight} 100px "${family}"`;
  const w = mctx.measureText(text).width; // ở cỡ 100
  if (wcache.size > 4000) wcache.clear();
  wcache.set(key, w);
  return w;
}
const f2 = (n: number) => Math.round(n * 100) / 100;
const deg = (rad: number) => (rad * 180) / Math.PI;
const pol = (rho: number, al: number) => [rho * Math.cos(al), rho * Math.sin(al)] as const;
const MID = Math.PI / 2;

// ---------- chữ chạy theo cung (chân chữ ở bán kính rho, đỉnh chữ hướng về chóp) ----------
interface ArcOpts { family: string; weight: number; size: number; fill: string; ls?: number; testid?: string }
/** cỡ chữ lớn nhất ≤ size để cả dòng vừa cung rộng avail (mm) */
function fitArc(text: string, avail: number, o: ArcOpts): number {
  const chars = Array.from(text);
  const tot = (s: number) => chars.reduce((acc, ch) => acc + (measure(ch, o.family, o.weight) * s) / 100, 0) + (o.ls || 0) * s * Math.max(0, chars.length - 1);
  let s = o.size;
  for (let i = 0; i < 80 && tot(s) > avail; i++) s *= 0.96;
  return s;
}
function ArcText({ text, rho, avail, o, cx = MID }: { text: string; rho: number; avail: number; o: ArcOpts; cx?: number }) {
  const t = (text || '').trim();
  if (!t) return null;
  const s = fitArc(t, avail, o);
  const chars = Array.from(t);
  const ws = chars.map((ch) => (measure(ch, o.family, o.weight) * s) / 100);
  const gap = (o.ls || 0) * s;
  const total = ws.reduce((x, y) => x + y, 0) + gap * Math.max(0, chars.length - 1);
  let cum = 0;
  return (
    <g data-nl-text={o.testid || 'arc'} data-size={f2(s)}>
      {chars.map((ch, i) => {
        const al = cx + (total / 2 - cum - ws[i] / 2) / rho;
        cum += ws[i] + gap;
        if (ch === ' ') return null;
        const [x, y] = pol(rho, al);
        return (
          <text key={i} x={f2(x)} y={f2(y)} transform={`rotate(${f2(deg(al) - 90)} ${f2(x)} ${f2(y)})`} textAnchor="middle"
            fontFamily={`'${o.family}'`} fontWeight={o.weight} fontSize={f2(s)} fill={o.fill} data-nl-ch="1">{ch}</text>
        );
      })}
    </g>
  );
}

/** đặt 1 hình (vẽ quanh gốc, "lên trên" = −y) tại bán kính rho, góc al, thẳng đứng trên nón */
const Place = ({ rho, al = MID, s = 1, children }: { rho: number; al?: number; s?: number; children: ReactNode }) => {
  const [x, y] = pol(rho, al);
  return <g transform={`translate(${f2(x)} ${f2(y)}) rotate(${f2(deg(al) - 90)}) scale(${f2(s)})`}>{children}</g>;
};

// ---------- hoạ tiết vẽ bằng code (kích thước gốc ~ 100 đơn vị, tâm ở gốc) ----------
interface Ink { i1: string; i2: string; i3: string; mono: boolean }
function Lotus({ ink }: { ink: Ink }) {
  const petal = (rot: number, len: number, wid: number, fill: string) => (
    <path d={`M0 0 C ${-wid} ${-len * 0.35} ${-wid * 0.7} ${-len * 0.85} 0 ${-len} C ${wid * 0.7} ${-len * 0.85} ${wid} ${-len * 0.35} 0 0 Z`}
      transform={`rotate(${rot})`} fill={ink.mono ? 'none' : fill} stroke={ink.mono ? ink.i1 : ink.i2} strokeWidth={ink.mono ? 3 : 1.6} strokeLinejoin="round" />
  );
  return (
    <g transform="translate(0 22)">
      {petal(-62, 46, 16, ink.i1)}{petal(62, 46, 16, ink.i1)}
      {petal(-34, 58, 18, ink.i1)}{petal(34, 58, 18, ink.i1)}
      {petal(-12, 66, 19, ink.i1)}{petal(12, 66, 19, ink.i1)}
      {petal(0, 70, 17, ink.i1)}
      {/* đài + lá sen ôm dưới */}
      <path d="M-46 4 C -30 16 30 16 46 4 C 36 24 -36 24 -46 4 Z" fill={ink.mono ? 'none' : ink.i2} stroke={ink.mono ? ink.i1 : 'none'} strokeWidth={3} />
      <path d="M0 18 L0 34" stroke={ink.mono ? ink.i1 : ink.i2} strokeWidth={4} strokeLinecap="round" />
    </g>
  );
}
function Lantern({ ink, fill }: { ink: Ink; fill: string }) {
  const body = ink.mono ? 'none' : fill;
  return (
    <g>
      <rect x={-9} y={-44} width={18} height={7} rx={2} fill={ink.i2} />
      <path d="M0 -37 C 30 -34 34 -10 34 0 C 34 10 30 34 0 37 C -30 34 -34 10 -34 0 C -34 -10 -30 -34 0 -37 Z" fill={body} stroke={ink.mono ? ink.i1 : ink.i2} strokeWidth={ink.mono ? 3 : 1.4} />
      {[-18, 0, 18].map((x) => <path key={x} d={`M${x * 0.4} -36 C ${x * 1.3} -14 ${x * 1.3} 14 ${x * 0.4} 36`} fill="none" stroke={ink.mono ? ink.i1 : ink.i2} strokeWidth={1.4} />)}
      <rect x={-9} y={37} width={18} height={7} rx={2} fill={ink.i2} />
      <path d="M0 44 L0 66" stroke={ink.i1} strokeWidth={2.4} />
      <path d="M-5 58 L0 70 L5 58 Z" fill={ink.i1} />
    </g>
  );
}
function Bamboo({ ink, h }: { ink: Ink; h: number }) {
  const segs = Math.max(3, Math.round(h / 34));
  const sl = h / segs;
  return (
    <g>
      {Array.from({ length: segs }).map((_, i) => (
        <g key={i}>
          <rect x={-5} y={-h / 2 + i * sl + 1.5} width={10} height={sl - 3} rx={3} fill={ink.mono ? 'none' : ink.i3} stroke={ink.mono ? ink.i1 : 'none'} strokeWidth={2} />
          <rect x={-7} y={-h / 2 + i * sl - 1.5} width={14} height={3} rx={1.5} fill={ink.i1} />
        </g>
      ))}
      {[0.2, 0.55].map((f, j) => (
        <g key={j} transform={`translate(0 ${-h / 2 + f * h}) rotate(${j ? 28 : -32})`}>
          {[0, 18, -18].map((r) => <path key={r} d="M0 0 C 10 -4 30 -4 44 0 C 30 4 10 4 0 0 Z" transform={`rotate(${r}) scale(${j ? -1 : 1} 1)`} fill={ink.mono ? 'none' : ink.i3} stroke={ink.i1} strokeWidth={1.3} />)}
        </g>
      ))}
    </g>
  );
}
function Mai({ ink, r = 9 }: { ink: Ink; r?: number }) {
  return (
    <g>
      {Array.from({ length: 5 }).map((_, i) => (
        <circle key={i} cx={f2(Math.cos((i * 72 - 90) * Math.PI / 180) * r * 0.62)} cy={f2(Math.sin((i * 72 - 90) * Math.PI / 180) * r * 0.62)} r={r * 0.52}
          fill={ink.mono ? 'none' : ink.i2} stroke={ink.mono ? ink.i1 : 'none'} strokeWidth={1.4} />
      ))}
      <circle r={r * 0.28} fill={ink.i1} />
    </g>
  );
}
function Book({ ink }: { ink: Ink }) {
  const page = ink.mono ? 'none' : '#FFFFFF00';
  return (
    <g>
      <path d="M0 -6 C -18 -16 -42 -14 -54 -8 L -54 30 C -42 24 -18 22 0 32 Z" fill={page} stroke={ink.i1} strokeWidth={3.2} strokeLinejoin="round" />
      <path d="M0 -6 C 18 -16 42 -14 54 -8 L 54 30 C 42 24 18 22 0 32 Z" fill={page} stroke={ink.i1} strokeWidth={3.2} strokeLinejoin="round" />
      {[-4, 4, 12].map((y) => <path key={y} d={`M-46 ${y} C -32 ${y - 5} -16 ${y - 4} -6 ${y + 2}`} fill="none" stroke={ink.i2} strokeWidth={1.6} />)}
      {[-4, 4, 12].map((y) => <path key={`r${y}`} d={`M46 ${y} C 32 ${y - 5} 16 ${y - 4} 6 ${y + 2}`} fill="none" stroke={ink.i2} strokeWidth={1.6} />)}
      <g transform="translate(30 -30) rotate(38)">
        <rect x={-4} y={-26} width={8} height={40} rx={2} fill={ink.mono ? 'none' : ink.i3} stroke={ink.i1} strokeWidth={2} />
        <path d="M-4 14 L0 24 L4 14 Z" fill={ink.i1} />
      </g>
    </g>
  );
}
function Sun({ ink, r }: { ink: Ink; r: number }) {
  return (
    <g>
      <circle r={r} fill={ink.mono ? 'none' : ink.i2} stroke={ink.mono ? ink.i1 : 'none'} strokeWidth={2.4} />
      {Array.from({ length: 12 }).map((_, i) => {
        const a = (i * 30) * Math.PI / 180;
        return <path key={i} d={`M${f2(Math.cos(a) * r * 1.3)} ${f2(Math.sin(a) * r * 1.3)} L${f2(Math.cos(a) * r * 1.7)} ${f2(Math.sin(a) * r * 1.7)}`} stroke={ink.i2 === ink.i1 ? ink.i1 : ink.i2} strokeWidth={r * 0.14} strokeLinecap="round" />;
      })}
    </g>
  );
}
function AoDai({ ink, flip }: { ink: Ink; flip?: boolean }) {
  // tà áo dài bay (2 vạt lụa uốn lượn) — hình cách điệu
  return (
    <g transform={flip ? 'scale(-1 1)' : undefined}>
      <path d="M0 -60 C 18 -40 -10 -12 8 12 C 22 32 6 52 -4 64 C 14 50 30 30 18 8 C 4 -16 30 -40 12 -62 Z" fill={ink.mono ? 'none' : ink.i1} stroke={ink.mono ? ink.i1 : 'none'} strokeWidth={2.4} />
      <path d="M-14 -50 C 0 -30 -24 -6 -10 18 C 0 34 -12 50 -20 58 C -6 48 6 32 -2 14 C -12 -8 8 -30 -6 -52 Z" fill={ink.mono ? 'none' : ink.i3} stroke={ink.mono ? ink.i1 : 'none'} strokeWidth={2} />
    </g>
  );
}

/** dải sóng chạy theo cung (sông Hương / biển) */
function WaveArc({ rho, half, amp, n, stroke, w }: { rho: number; half: number; amp: number; n: number; stroke: string; w: number }) {
  const pts: string[] = [];
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const t = i / N, al = MID + half - 2 * half * t;
    const rr = rho + amp * Math.sin(t * n * Math.PI * 2);
    const [x, y] = pol(rr, al);
    pts.push(`${i ? 'L' : 'M'}${f2(x)} ${f2(y)}`);
  }
  return <path d={pts.join(' ')} fill="none" stroke={stroke} strokeWidth={w} strokeLinecap="round" />;
}
/** cành mai chạy theo cung + hoa */
function MaiBranch({ rho, from, to, ink, r }: { rho: number; from: number; to: number; ink: Ink; r: number }) {
  const N = 40, pts: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, al = from + (to - from) * t, rr = rho + Math.sin(t * Math.PI * 2.2) * r * 0.7;
    const [x, y] = pol(rr, al); pts.push(`${i ? 'L' : 'M'}${f2(x)} ${f2(y)}`);
  }
  const flowers = [0.1, 0.3, 0.5, 0.72, 0.92].map((t) => ({ al: from + (to - from) * t, rr: rho + Math.sin(t * Math.PI * 2.2) * r * 0.7 - r * 0.2 }));
  return (
    <g>
      <path d={pts.join(' ')} fill="none" stroke={ink.i1 === ink.i2 ? ink.i1 : '#4A2C1A'} strokeWidth={r * 0.25} strokeLinecap="round" />
      {flowers.map((f, i) => <Place key={i} rho={f.rr} al={f.al}><Mai ink={ink} r={r * (i % 2 ? 0.75 : 1)} /></Place>)}
    </g>
  );
}

const STOP = new Set(['CÔNG', 'TY', 'TNHH', 'CP', 'CỔ', 'PHẦN', 'TẬP', 'ĐOÀN', 'GROUP', 'NHÀ', 'HÀNG', 'QUÁN', 'TIỆM', 'CỬA']);
export function monogram(s: string): string {
  const w = (s || '').toUpperCase().split(/\s+/).filter(Boolean);
  const k = w.filter((x) => !STOP.has(x));
  const use = (k.length ? k : w).slice(0, 2);
  return use.map((x) => Array.from(x)[0]).join('') || 'M';
}

export interface NLLogo { href: string; w: number; h: number; mask?: boolean }

/** vòng huy hiệu: logo khách (ảnh / mask 1 màu) hoặc chữ viết tắt */
function Badge({ R, ink, logo, text, uid, font }: { R: number; ink: Ink; logo?: NLLogo | null; text: string; uid: string; font: NLFont }) {
  const clip = `${uid}-bclip`, mk = `${uid}-bmask`;
  const inner = R * 0.78;
  let content: ReactNode;
  if (logo) {
    const k = Math.min((inner * 1.5) / logo.w, (inner * 1.5) / logo.h);
    const w = logo.w * k, h = logo.h * k;
    content = logo.mask ? (
      <g>
        <mask id={mk} maskUnits="userSpaceOnUse" x={-w / 2} y={-h / 2} width={w} height={h}>
          <image href={logo.href} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="none" />
        </mask>
        <rect x={-w / 2} y={-h / 2} width={w} height={h} fill={ink.i1} mask={`url(#${mk})`} />
      </g>
    ) : (
      <g clipPath={`url(#${clip})`}><image href={logo.href} x={-w / 2} y={-h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" /></g>
    );
  } else {
    const mono = monogram(text);
    const s = Math.min(inner * 1.05, (inner * 1.7 * 100) / Math.max(1, measure(mono, font.family, font.weight)));
    content = <text x={0} y={f2(s * 0.36)} textAnchor="middle" fontFamily={`'${font.family}'`} fontWeight={font.weight} fontSize={f2(s)} fill={ink.i1} data-nl-text="mono">{mono}</text>;
  }
  return (
    <g>
      <defs><clipPath id={clip}><circle r={inner} /></clipPath></defs>
      <circle r={R} fill="none" stroke={ink.i2} strokeWidth={R * 0.07} />
      <circle r={R * 0.88} fill="none" stroke={ink.i1} strokeWidth={R * 0.025} />
      {content}
    </g>
  );
}

// ---------- mặt in (chỉ mực, không nền) ----------
export interface NLFaceProps { spec: NLSpec; data: NLData; logo?: NLLogo | null; uid: string }
function NLFace({ spec, data, logo, uid }: NLFaceProps) {
  const g = nlGeo(spec.size);
  const { a, H } = g;
  const p = nlPalette(spec.palette);
  const ink = nlInks(p, spec.method);
  const f = nlFont(spec.font);
  const body = { family: BODY, weight: 600 };
  const at = (u: number) => a + u * H;
  /** cung còn dùng được ở bán kính rho: góc vùng in trừ lề an toàn hai bên */
  const avail = (rho: number, pad = SAFE_MM) => Math.max(10, (2 * g.half * rho) - 2 * pad);
  // chữ chạy cung: đỉnh chữ (≈ 0.95·size) phải nằm dưới rho đỉnh → cỡ cũng bị chặn theo chiều cao dải
  const title = (rho: number, size: number, testid = 'title', fill = ink.i1) => (
    <ArcText text={data.title || ''} rho={rho} avail={avail(rho)} o={{ family: f.family, weight: f.weight, size, fill, testid }} />
  );
  const sub = (rho: number, size: number, fill = ink.i2 === ink.i1 ? ink.i1 : ink.i2) => (
    <ArcText text={data.sub || ''} rho={rho} avail={avail(rho)} o={{ ...body, size, fill, ls: 0.06, testid: 'sub' }} />
  );
  const side = (frac: number) => g.half * frac; // góc lệch khỏi giữa
  let out: ReactNode;
  switch (spec.layout) {
    case 'gift':
      out = (
        <>
          <ArcText text={data.top || ''} rho={at(0.12)} avail={avail(at(0.12))} o={{ family: f.script ? f.family : BODY, weight: f.script ? f.weight : 600, size: H * 0.06, fill: ink.i2, testid: 'top' }} />
          <Place rho={at(0.36)}><Badge R={H * 0.14} ink={ink} logo={logo} text={data.title || ''} uid={uid} font={f} /></Place>
          {title(at(0.74), H * 0.15)}
          {sub(at(0.92), H * 0.07)}
        </>
      );
      break;
    case 'hello':
      out = (
        <>
          <Place rho={at(0.3)} s={(H * 0.36) / 100}><Lotus ink={ink} /></Place>
          {[-1, 1].map((sg) => <Place key={sg} rho={at(0.38)} al={MID + sg * side(0.55)} s={(H * 0.16) / 100}><Lotus ink={ink} /></Place>)}
          {title(at(0.74), H * 0.2)}
          {sub(at(0.93), H * 0.07)}
        </>
      );
      break;
    case 'hoian': {
      const lan = [{ al: MID, rr: 0.3, s: 0.3, c: ink.i1 }, { al: MID + side(0.42), rr: 0.22, s: 0.24, c: ink.i2 }, { al: MID - side(0.42), rr: 0.22, s: 0.24, c: ink.i2 }, { al: MID + side(0.75), rr: 0.16, s: 0.18, c: ink.i1 }, { al: MID - side(0.75), rr: 0.16, s: 0.18, c: ink.i1 }];
      out = (
        <>
          {lan.map((l, i) => {
            const [x1, y1] = pol(at(0.02), l.al), [x2, y2] = pol(at(l.rr) - (H * l.s * 0.44), l.al);
            return (
              <g key={i}>
                <path d={`M${f2(x1)} ${f2(y1)} L${f2(x2)} ${f2(y2)}`} stroke={ink.i1} strokeWidth={1.2} />
                <Place rho={at(l.rr)} al={l.al} s={(H * l.s) / 100}><Lantern ink={ink} fill={l.c} /></Place>
              </g>
            );
          })}
          {title(at(0.76), H * 0.2)}
          {sub(at(0.93), H * 0.07)}
        </>
      );
      break;
    }
    case 'hue':
      out = (
        <>
          <Place rho={at(0.2)} s={1}><Sun ink={ink} r={H * 0.07} /></Place>
          <WaveArc rho={at(0.42)} half={g.half - SAFE_MM / at(0.42)} amp={H * 0.018} n={9} stroke={ink.i2 === ink.i1 ? ink.i1 : ink.i2} w={H * 0.012} />
          <WaveArc rho={at(0.48)} half={g.half - SAFE_MM / at(0.48)} amp={H * 0.018} n={10} stroke={ink.i1} w={H * 0.012} />
          {title(at(0.76), H * 0.22)}
          {sub(at(0.93), H * 0.07)}
        </>
      );
      break;
    case 'festival':
      out = (
        <>
          {[-1, 1].map((sg) => <Place key={sg} rho={at(0.42)} al={MID + sg * side(0.72)} s={(H * 0.5) / 130}><AoDai ink={ink} flip={sg < 0} /></Place>)}
          <Place rho={at(0.28)} s={(H * 0.28) / 100}><Lotus ink={ink} /></Place>
          {title(at(0.7), H * 0.16)}
          {sub(at(0.89), H * 0.07)}
        </>
      );
      break;
    case 'lotus':
      out = (
        <>
          <Place rho={at(0.42)} s={(H * 0.62) / 100}><Lotus ink={ink} /></Place>
          <ArcText text={data.sub || ''} rho={at(0.92)} avail={avail(at(0.92))} o={{ family: f.family, weight: f.weight, size: H * 0.1, fill: ink.i1, testid: 'sub' }} />
        </>
      );
      break;
    case 'poem': {
      const lines = (data.poem || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 4);
      const n = Math.max(1, lines.length);
      const us = n === 1 ? [0.6] : Array.from({ length: n }, (_, i) => 0.3 + (0.6 * i) / (n - 1));
      out = (
        <>
          {lines.map((ln, i) => (
            <ArcText key={i} text={ln} rho={at(us[i])} avail={avail(at(us[i]))} o={{ family: f.family, weight: f.weight, size: H * (n > 3 ? 0.1 : 0.12), fill: ink.i1, testid: 'poem' }} />
          ))}
          <Place rho={at(0.1)} s={1}><Mai ink={ink} r={H * 0.035} /></Place>
        </>
      );
      break;
    }
    case 'teacher':
      out = (
        <>
          <Place rho={at(0.3)} s={(H * 0.3) / 100}><Book ink={ink} /></Place>
          {[-1, 1].map((sg) => [0.25, 0.45].map((u, j) => <Place key={`${sg}${j}`} rho={at(u)} al={MID + sg * side(0.5 + j * 0.2)}><Mai ink={ink} r={H * (j ? 0.03 : 0.04)} /></Place>))}
          {title(at(0.72), H * 0.17)}
          {sub(at(0.9), H * 0.07)}
        </>
      );
      break;
    case 'tet':
      out = (
        <>
          <MaiBranch rho={at(0.2)} from={MID + g.half - SAFE_MM / at(0.2)} to={MID + side(0.12)} ink={ink} r={H * 0.05} />
          <MaiBranch rho={at(0.2)} from={MID - g.half + SAFE_MM / at(0.2)} to={MID - side(0.12)} ink={ink} r={H * 0.05} />
          {title(at(0.62), H * 0.15)}
          {sub(at(0.84), H * 0.09)}
        </>
      );
      break;
    case 'trip':
      out = (
        <>
          <Place rho={at(0.2)} al={MID + side(0.4)}><Sun ink={ink} r={H * 0.06} /></Place>
          <WaveArc rho={at(0.38)} half={g.half - SAFE_MM / at(0.38)} amp={H * 0.02} n={8} stroke={ink.i1} w={H * 0.014} />
          <WaveArc rho={at(0.45)} half={g.half - SAFE_MM / at(0.45)} amp={H * 0.02} n={9} stroke={ink.i2 === ink.i1 ? ink.i1 : ink.i3} w={H * 0.014} />
          {title(at(0.74), H * 0.15)}
          {sub(at(0.92), H * 0.07)}
        </>
      );
      break;
    case 'bamboo':
      out = (
        <>
          {[-1, 1].map((sg) => [0.62, 0.82].map((fr, j) => (
            <Place key={`${sg}${j}`} rho={at(j ? 0.36 : 0.42)} al={MID + sg * side(fr)}><Bamboo ink={ink} h={H * (j ? 0.5 : 0.66)} /></Place>
          )))}
          <Place rho={at(0.34)}><Badge R={H * 0.13} ink={ink} logo={logo} text={data.title || ''} uid={uid} font={f} /></Place>
          {title(at(0.74), H * 0.14)}
          {sub(at(0.92), H * 0.07)}
        </>
      );
      break;
  }
  return <g id="In">{out}</g>;
}

/** đường viền quạt khuyên vùng in (bán kính a..b, ±half quanh α=90°) */
export function panelPath(g: NLGeo, pad = 0): string {
  const a = g.a - pad, b = g.b + pad, h1 = MID + g.half + pad / g.b, h0 = MID - g.half - pad / g.b;
  const P = (r: number, al: number) => pol(r, al).map(f2).join(' ');
  const large = h1 - h0 > Math.PI ? 1 : 0;
  return `M${P(b, h1)} A${f2(b)} ${f2(b)} 0 ${large} 0 ${P(b, h0)} L${P(a, h0)} A${f2(a)} ${f2(a)} 0 ${large} 1 ${P(a, h1)} Z`;
}
/** toàn bộ mặt nón trải phẳng (hình quạt góc θ, mép may ở phía sau) */
export function sectorPath(g: NLGeo): string {
  const h = g.theta / 2, h1 = MID + h, h0 = MID - h;
  const P = (r: number, al: number) => pol(r, al).map(f2).join(' ');
  return `M0 0 L${P(g.L, h1)} A${f2(g.L)} ${f2(g.L)} 0 ${g.theta > Math.PI ? 1 : 0} 0 ${P(g.L, h0)} Z`;
}

// lá nón (xem trước phẳng): nền rơm + gân lá xuyên tâm + vòng nan
function LeafBg({ g, path }: { g: NLGeo; path: string }) {
  const rays: ReactNode[] = [];
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const al = MID - g.theta / 2 + (g.theta * i) / n;
    const [x, y] = pol(g.L, al);
    rays.push(<path key={`r${i}`} d={`M0 0 L${f2(x)} ${f2(y)}`} stroke={i % 3 ? '#D9CBA4' : '#CDBB8E'} strokeWidth={0.6} />);
  }
  const rings: ReactNode[] = [];
  for (let k = 1; k <= 16; k++) {
    const rr = (g.L * k) / 16;
    rings.push(<circle key={`c${k}`} r={f2(rr)} fill="none" stroke="#C7B486" strokeWidth={0.9} />);
  }
  return (
    <g>
      <path d={path} fill="#EFE5C9" />
      <g clipPath="url(#nl-leaf-clip)">{rays}{rings}</g>
    </g>
  );
}

export type NLMode = 'tex' | 'mock' | 'panel' | 'print';
/**
 * tex   = khung [-L,L]² chỉ có mực (nền trong suốt) — texture 3D phủ lên lá
 * mock  = cả mặt nón trải phẳng trên nền lá + vùng in (xem trước phẳng)
 * panel = phóng vùng in (ô mẫu)
 * print = file in đúng khổ mm: In + CutContour (mép decal) + ThamKhao (mặt nón, đường may, chóp)
 */
export function NonlaSvg({ spec, data, logo, mode = 'mock', style }: { spec: NLSpec; data: NLData; logo?: NLLogo | null; mode?: NLMode; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = nlGeo(spec.size);
  const face = <NLFace spec={spec} data={data} logo={logo} uid={uid} />;
  const sect = sectorPath(g);
  const panel = panelPath(g);
  const meta = { 'data-a': f2(g.a), 'data-b': f2(g.b), 'data-half': g.half.toFixed(5), 'data-l': f2(g.L), 'data-nl-svg': mode } as Record<string, string | number>;
  if (mode === 'tex') {
    return <svg viewBox={`${-g.L} ${-g.L} ${2 * g.L} ${2 * g.L}`} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>{face}</svg>;
  }
  const top = -g.L * Math.max(0.05, -Math.sin(MID + g.theta / 2)) - 4;
  if (mode === 'panel') {
    const x0 = -g.b * Math.sin(g.half) - 6, w = 2 * g.b * Math.sin(g.half) + 12, y0 = g.a * Math.cos(g.half) - 6, h = g.b - y0 + 6;
    return (
      <svg viewBox={`${f2(x0)} ${f2(y0)} ${f2(w)} ${f2(h)}`} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>
        <defs><clipPath id="nl-leaf-clip"><path d={sect} /></clipPath></defs>
        <LeafBg g={g} path={sect} />
        <path d={panel} fill="none" stroke="#9C8B62" strokeWidth={0.8} strokeDasharray="3 3" />
        {face}
      </svg>
    );
  }
  const m = 14;
  const vb = `${f2(-g.L - m)} ${f2(top - m)} ${f2(2 * (g.L + m))} ${f2(g.L - top + 2 * m + (mode === 'print' ? 14 : 0))}`;
  const [sx1, sy1] = pol(g.L, MID + g.theta / 2);
  const [sx0, sy0] = pol(g.L, MID - g.theta / 2);
  if (mode === 'mock') {
    return (
      <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>
        <defs><clipPath id="nl-leaf-clip"><path d={sect} /></clipPath></defs>
        <LeafBg g={g} path={sect} />
        <path d={sect} fill="none" stroke="#9C8B62" strokeWidth={1.2} />
        <path d={panel} fill="none" stroke="#EC008C" strokeWidth={1} strokeDasharray="5 4" />
        {face}
        <circle r={3} fill="none" stroke="#7A6A45" strokeWidth={0.8} />
      </svg>
    );
  }
  // print
  const wMm = 2 * (g.L + m), hMm = g.L - top + 2 * m + 14;
  const note = `Nón ${nlSize(spec.size).name} · đường sinh ${Math.round(g.L)}mm · quạt ${Math.round((g.theta * 180) / Math.PI)}° · vùng in ${PANEL_DEG}° mặt trước, cách chóp ${Math.round(g.a)}–${Math.round(g.b)}mm`;
  return (
    <svg viewBox={vb} width={`${f2(wMm)}mm`} height={`${f2(hMm)}mm`} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>
      <g id="ThamKhao" fill="none" stroke="#9AA3AF" strokeWidth={0.5}>
        <path d={sect} strokeDasharray="4 3" />
        <path d={`M0 0 L${f2(sx1)} ${f2(sy1)} M0 0 L${f2(sx0)} ${f2(sy0)}`} stroke="#00A3E0" strokeWidth={0.7} />
        <circle r={3} stroke="#00A3E0" />
        {Array.from({ length: 16 }).map((_, i) => <circle key={i} r={f2((g.L * (i + 1)) / 16)} strokeWidth={0.25} strokeDasharray="1 3" />)}
      </g>
      {face}
      <g id="CutContour"><path d={panel} fill="none" stroke="#EC008C" strokeWidth={0.3} /></g>
      <g id="GhiChu" fill="#6B7280" fontFamily={`'${BODY}'`} fontWeight={600} fontSize={5}>
        <text x={6} y={-4}>Chóp nón (tâm) — không in</text>
        <text x={f2(sx1 + 4)} y={f2(sy1 + 2)}>Mép may (phía sau nón)</text>
        <text x={f2(-g.L)} y={f2(g.L + m + 6)}>{note}</text>
      </g>
    </svg>
  );
}
export const nlPrintMm = (sizeId: string) => {
  const g = nlGeo(sizeId), m = 14;
  const top = -g.L * Math.max(0.05, -Math.sin(MID + g.theta / 2)) - 4;
  return { w: 2 * (g.L + m), h: g.L - top + 2 * m + 14 };
};
