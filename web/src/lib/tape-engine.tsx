'use client';
// Băng keo in logo: thiết kế = 1 ĐOẠN LẶP (repeat unit) dài L mm × rộng = khổ băng keo, xưởng in flexo lặp liên tục.
// Flexo in 1–3 màu mực đặc → bảng mực giới hạn, mỗi bố cục chỉ dùng đúng số màu khách chọn (nền băng keo không phải mực).
// Engine SVG đơn vị mm, render code 100% (0 AI). Chữ đo thật bằng canvas → co cho vừa khổ & vừa đoạn lặp.
// Logo khách: ảnh → bóng 1 màu (ngưỡng sáng) làm mask → in bằng 1 màu mực.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ, nền, mực ----------
export const TP_WIDTHS = [48, 60, 72] as const;
export type TPWidth = (typeof TP_WIDTHS)[number];
export const TP_REPEATS = [200, 250, 300] as const;

export interface TPBase { id: string; name: string; hex: string | null; dark: boolean }
export const TP_BASES: TPBase[] = [
  { id: 'clear', name: 'Trong suốt', hex: null, dark: false },
  { id: 'white', name: 'Trắng đục', hex: '#F4F3EF', dark: false },
  { id: 'kraft', name: 'Kraft giấy', hex: '#B68A5C', dark: false },
  { id: 'yellow', name: 'Vàng', hex: '#EDBB3A', dark: false },
  { id: 'black', name: 'Đen', hex: '#1C1C1F', dark: true },
];
export const tpBase = (id: string) => TP_BASES.find((b) => b.id === id) || TP_BASES[0];

export interface TPInk { id: string; name: string; hex: string }
export const TP_INKS: TPInk[] = [
  { id: 'red', name: 'Đỏ', hex: '#D7263D' },
  { id: 'black', name: 'Đen', hex: '#161616' },
  { id: 'navy', name: 'Xanh navy', hex: '#1F3A68' },
  { id: 'blue', name: 'Xanh dương', hex: '#1F5FD1' },
  { id: 'white', name: 'Trắng', hex: '#FFFFFF' },
  { id: 'yellow', name: 'Vàng', hex: '#F5B800' },
  { id: 'pink', name: 'Hồng', hex: '#E0457B' },
  { id: 'brown', name: 'Nâu', hex: '#6B4423' },
  { id: 'teal', name: 'Xanh ngọc', hex: '#0F766E' },
];
export const tpInk = (id: string) => TP_INKS.find((i) => i.id === id) || TP_INKS[0];

// độ tương phản mực / nền (cảnh báo khách: trắng trên trắng…)
const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export function lowContrast(inkId: string, baseId: string): boolean {
  const b = tpBase(baseId); const bg = b.hex ?? '#B68A5C'; // băng trong: dán lên thùng kraft
  return Math.abs(lum(tpInk(inkId).hex) - lum(bg)) < 0.22;
}

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface TPFont { id: string; name: string; family: string; weight: number }
export const TP_FONTS: TPFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
export const tpFont = (id: string) => TP_FONTS.find((f) => f.id === id) || TP_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const TP_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useTPFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-tp-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-tp-fonts'; link.rel = 'stylesheet';
        link.href = TP_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TP_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục & mẫu ----------
export interface TPLayout { id: string; name: string; inks: number } // inks = số màu mực bố cục dùng tối đa
export const TP_LAYOUTS: TPLayout[] = [
  { id: 'thanks', name: 'Cảm ơn khách', inks: 2 },
  { id: 'fragile', name: 'Hàng dễ vỡ', inks: 2 },
  { id: 'fashion', name: 'Thời trang', inks: 1 },
  { id: 'beauty', name: 'Mỹ phẩm', inks: 2 },
  { id: 'minimal', name: 'Tối giản', inks: 1 },
  { id: 'pattern', name: 'Hoạ tiết', inks: 3 },
  { id: 'seal', name: 'Kiểm hàng', inks: 2 },
];
export const tpLayout = (id: string) => TP_LAYOUTS.find((l) => l.id === id) || TP_LAYOUTS[0];

export interface TPSpec { layout: string; base: string; inks: string[]; font: string; width: TPWidth; rep: number }
export interface TPTemplate { id: string; name: string; spec: Pick<TPSpec, 'layout' | 'base' | 'inks' | 'font'> }
export const TP_TEMPLATES: TPTemplate[] = [
  { id: 'thanks-clear', name: 'Cảm ơn · trong đỏ', spec: { layout: 'thanks', base: 'clear', inks: ['red'], font: 'bvp' } },
  { id: 'thanks-white', name: 'Cảm ơn · trắng navy', spec: { layout: 'thanks', base: 'white', inks: ['navy', 'red'], font: 'montserrat' } },
  { id: 'thanks-black', name: 'Shop online · đen vàng', spec: { layout: 'thanks', base: 'black', inks: ['yellow', 'white'], font: 'baloo' } },
  { id: 'fragile-yellow', name: 'Dễ vỡ · vàng', spec: { layout: 'fragile', base: 'yellow', inks: ['black', 'red'], font: 'oswald' } },
  { id: 'fragile-white', name: 'Dễ vỡ · trắng đỏ', spec: { layout: 'fragile', base: 'white', inks: ['red'], font: 'oswald' } },
  { id: 'fashion-black', name: 'Thời trang · đen', spec: { layout: 'fashion', base: 'black', inks: ['white'], font: 'playfair' } },
  { id: 'fashion-kraft', name: 'Thời trang · kraft', spec: { layout: 'fashion', base: 'kraft', inks: ['black'], font: 'playfair' } },
  { id: 'beauty-white', name: 'Mỹ phẩm · hồng', spec: { layout: 'beauty', base: 'white', inks: ['pink', 'brown'], font: 'dancing' } },
  { id: 'minimal-kraft', name: 'Tối giản · kraft', spec: { layout: 'minimal', base: 'kraft', inks: ['black'], font: 'montserrat' } },
  { id: 'minimal-clear', name: 'Tối giản · trong', spec: { layout: 'minimal', base: 'clear', inks: ['black'], font: 'oswald' } },
  { id: 'pattern-white', name: 'Hoạ tiết · 3 màu', spec: { layout: 'pattern', base: 'white', inks: ['navy', 'yellow', 'red'], font: 'baloo' } },
  { id: 'seal-white', name: 'Kiểm hàng · sọc đỏ', spec: { layout: 'seal', base: 'white', inks: ['red', 'black'], font: 'bvp' } },
];

export type TPData = Record<string, string>;
export interface TPField { key: string; label: string; ph?: string; half?: boolean }
export const TP_FIELDS: TPField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'AN KHANG STORE', half: true },
  { key: 'slogan', label: 'Lời cảm ơn / slogan', ph: 'Cảm ơn bạn đã ủng hộ shop!', half: true },
  { key: 'phone', label: 'Hotline / Zalo', ph: '0909 123 456', half: true },
  { key: 'social', label: 'Fanpage / website', ph: 'fb.com/ankhangstore', half: true },
  { key: 'fragile', label: 'Dòng cảnh báo', ph: 'Hàng dễ vỡ — nhẹ tay' },
];
export const defaultTPData = (): TPData => ({
  brand: 'AN KHANG STORE', slogan: 'Cảm ơn bạn đã ủng hộ shop!', phone: '0909 123 456',
  social: 'fb.com/ankhangstore', fragile: 'Hàng dễ vỡ — nhẹ tay',
});

// ---------- logo khách → bóng 1 màu (mask) ----------
export interface TPLogo { href: string; w: number; h: number }
/** ảnh → mask PNG (trắng = có mực), cắt sát vùng có mực. threshold 0–255: điểm tối hơn ngưỡng = mực; invert cho logo sáng trên nền tối */
export async function logoToMask(src: string, threshold = 150, invert = false): Promise<TPLogo | null> {
  const im = new Image(); im.src = src; await im.decode();
  const k = Math.min(1, 700 / Math.max(im.naturalWidth, im.naturalHeight));
  const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(im, 0, 0, w, h);
  const d = ctx.getImageData(0, 0, w, h); const p = d.data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    const l = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2];
    const on = p[i + 3] > 110 && (invert ? l > threshold : l < threshold);
    const v = on ? 255 : 0;
    p[i] = p[i + 1] = p[i + 2] = v; p[i + 3] = 255;
    if (on) { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; }
  }
  if (x1 < 0) return null;
  ctx.putImageData(d, 0, 0);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;
  const o = document.createElement('canvas'); o.width = cw + 4; o.height = ch + 4;
  const octx = o.getContext('2d')!; octx.fillStyle = '#000'; octx.fillRect(0, 0, o.width, o.height);
  octx.drawImage(c, x0, y0, cw, ch, 2, 2, cw, ch);
  return { href: o.toDataURL('image/png'), w: o.width, h: o.height };
}

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function measure(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} ${size * 10}px "${ts.fam}"`;
  return mctx.measureText(s).width / 10 + ls;
}

// chia câu thành 2 dòng ở chỗ cách giữa gần nhất
function split2(t: string): [string, string] {
  const w = (t || '').trim().split(/\s+/);
  if (w.length < 3) return [t || '', ''];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}

// ---------- khối dàn ngang ----------
interface Block { w: number; draw: (x: number) => ReactNode }
interface Ctx { W: number; L: number; m: number; cy: number; H: number; ink: (i: number) => string; base: TPBase; disp: TS; body: TS; bodyB: TS; data: TPData; logo: TPLogo | null; uid: string }

// dòng chữ cao f (mm): đỉnh dấu ≈ baseline − 0.95f, đáy ≈ baseline + 0.27f
interface Line { t: string; f: number; ts: TS; fill: string }
const LH = 1.22;
function stack(lines: Line[], maxW: number, maxH: number, cy: number): Block {
  let ls = lines.filter((l) => l.t.trim());
  if (!ls.length) return { w: 0, draw: () => null };
  // co từng dòng cho vừa bề ngang tối đa
  ls = ls.map((l) => { const w = measure(l.t, l.f, l.ts); return w > maxW ? { ...l, f: (l.f * maxW) / w } : l; });
  const gap = (i: number) => (i ? ls[i].f * 0.08 : 0);
  let h = ls.reduce((a, l, i) => a + l.f * LH + gap(i), 0);
  if (h > maxH) { const k = maxH / h; ls = ls.map((l) => ({ ...l, f: l.f * k })); h = maxH; }
  const w = Math.max(...ls.map((l) => measure(l.t, l.f, l.ts)));
  return {
    w,
    draw: (x) => {
      let y = cy - h / 2;
      return ls.map((l, i) => {
        y += gap(i) + l.f * 0.95;
        const el = <text key={i} x={x + w / 2} y={y} textAnchor="middle" fontFamily={`"${l.ts.fam}"`} fontWeight={l.ts.wt} fontSize={l.f} letterSpacing={(l.ts.ls || 0) * l.f || undefined} fill={l.fill}>{l.t}</text>;
        y += l.f * (LH - 0.95);
        return el;
      });
    },
  };
}
const row = (parts: Block[], gap: number): Block => {
  const ps = parts.filter((p) => p.w > 0);
  return { w: ps.reduce((a, p) => a + p.w, 0) + gap * Math.max(0, ps.length - 1), draw: (x) => { let cx = x; return ps.map((p, i) => { const n = <g key={i}>{p.draw(cx)}</g>; cx += p.w + gap; return n; }); } };
};
const icon = (s: number, cy: number, fn: (x: number, y: number, s: number) => ReactNode): Block => ({ w: s, draw: (x) => fn(x, cy - s / 2, s) });

// ---------- icon vẽ code (ô s×s, góc trái trên x,y) ----------
const heart = (fill: string) => (x: number, y: number, s: number) => (
  <path d={`M${x + s / 2} ${y + s * 0.88} C${x + s * 0.1} ${y + s * 0.6} ${x - s * 0.02} ${y + s * 0.32} ${x + s * 0.2} ${y + s * 0.16} C${x + s * 0.34} ${y + s * 0.05} ${x + s * 0.46} ${y + s * 0.14} ${x + s / 2} ${y + s * 0.26} C${x + s * 0.54} ${y + s * 0.14} ${x + s * 0.66} ${y + s * 0.05} ${x + s * 0.8} ${y + s * 0.16} C${x + s * 1.02} ${y + s * 0.32} ${x + s * 0.9} ${y + s * 0.6} ${x + s / 2} ${y + s * 0.88} Z`} fill={fill} />
);
const box = (fill: string) => (x: number, y: number, s: number) => {
  const sw = s * 0.07;
  return (
    <g fill="none" stroke={fill} strokeWidth={sw} strokeLinejoin="round">
      <path d={`M${x + s * 0.5} ${y + s * 0.1} L${x + s * 0.9} ${y + s * 0.28} L${x + s * 0.9} ${y + s * 0.74} L${x + s * 0.5} ${y + s * 0.92} L${x + s * 0.1} ${y + s * 0.74} L${x + s * 0.1} ${y + s * 0.28} Z`} />
      <path d={`M${x + s * 0.1} ${y + s * 0.28} L${x + s * 0.5} ${y + s * 0.46} L${x + s * 0.9} ${y + s * 0.28} M${x + s * 0.5} ${y + s * 0.46} L${x + s * 0.5} ${y + s * 0.92}`} />
      <path d={`M${x + s * 0.3} ${y + s * 0.19} L${x + s * 0.7} ${y + s * 0.37}`} />
    </g>
  );
};
const glass = (fill: string) => (x: number, y: number, s: number) => {
  const sw = s * 0.07;
  return (
    <g fill="none" stroke={fill} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${x + s * 0.26} ${y + s * 0.06} L${x + s * 0.74} ${y + s * 0.06} L${x + s * 0.72} ${y + s * 0.34} C${x + s * 0.7} ${y + s * 0.5} ${x + s * 0.3} ${y + s * 0.5} ${x + s * 0.28} ${y + s * 0.34} Z`} />
      <path d={`M${x + s * 0.5} ${y + s * 0.47} L${x + s * 0.5} ${y + s * 0.84} M${x + s * 0.32} ${y + s * 0.92} L${x + s * 0.68} ${y + s * 0.92}`} />
      <path d={`M${x + s * 0.56} ${y + s * 0.06} L${x + s * 0.48} ${y + s * 0.18} L${x + s * 0.58} ${y + s * 0.24} L${x + s * 0.5} ${y + s * 0.36}`} strokeWidth={sw * 0.8} />
    </g>
  );
};
const arrows = (fill: string) => (x: number, y: number, s: number) => (
  <g fill={fill}>
    {[0.08, 0.54].map((dx) => (
      <path key={dx} d={`M${x + s * (dx + 0.19)} ${y + s * 0.06} L${x + s * (dx + 0.38)} ${y + s * 0.36} L${x + s * (dx + 0.25)} ${y + s * 0.36} L${x + s * (dx + 0.25)} ${y + s * 0.8} L${x + s * (dx + 0.13)} ${y + s * 0.8} L${x + s * (dx + 0.13)} ${y + s * 0.36} L${x + s * dx} ${y + s * 0.36} Z`} />
    ))}
    <rect x={x + s * 0.04} y={y + s * 0.86} width={s * 0.92} height={s * 0.08} />
  </g>
);
const umbrella = (fill: string) => (x: number, y: number, s: number) => (
  <g>
    <path d={`M${x + s * 0.06} ${y + s * 0.5} C${x + s * 0.1} ${y + s * 0.14} ${x + s * 0.9} ${y + s * 0.14} ${x + s * 0.94} ${y + s * 0.5} C${x + s * 0.8} ${y + s * 0.42} ${x + s * 0.64} ${y + s * 0.42} ${x + s * 0.5} ${y + s * 0.5} C${x + s * 0.36} ${y + s * 0.42} ${x + s * 0.2} ${y + s * 0.42} ${x + s * 0.06} ${y + s * 0.5} Z`} fill={fill} />
    <path d={`M${x + s * 0.5} ${y + s * 0.5} L${x + s * 0.5} ${y + s * 0.82} C${x + s * 0.5} ${y + s * 0.94} ${x + s * 0.34} ${y + s * 0.94} ${x + s * 0.34} ${y + s * 0.84}`} fill="none" stroke={fill} strokeWidth={s * 0.07} strokeLinecap="round" />
    {[0.22, 0.5, 0.78].map((dx) => <path key={dx} d={`M${x + s * dx} ${y + s * 0.02} l${-s * 0.05} ${s * 0.1}`} stroke={fill} strokeWidth={s * 0.05} strokeLinecap="round" />)}
  </g>
);
const phone = (fill: string) => (x: number, y: number, s: number) => (
  <path d={`M${x + s * 0.22} ${y + s * 0.08} L${x + s * 0.38} ${y + s * 0.08} L${x + s * 0.46} ${y + s * 0.3} L${x + s * 0.36} ${y + s * 0.4} C${x + s * 0.42} ${y + s * 0.54} ${x + s * 0.5} ${y + s * 0.62} ${x + s * 0.62} ${y + s * 0.66} L${x + s * 0.72} ${y + s * 0.56} L${x + s * 0.92} ${y + s * 0.64} L${x + s * 0.92} ${y + s * 0.8} C${x + s * 0.92} ${y + s * 0.9} ${x + s * 0.84} ${y + s * 0.94} ${x + s * 0.76} ${y + s * 0.92} C${x + s * 0.4} ${y + s * 0.84} ${x + s * 0.14} ${y + s * 0.58} ${x + s * 0.08} ${y + s * 0.22} C${x + s * 0.06} ${y + s * 0.14} ${x + s * 0.12} ${y + s * 0.08} ${x + s * 0.22} ${y + s * 0.08} Z`} fill={fill} />
);
const chat = (fill: string) => (x: number, y: number, s: number) => (
  <path d={`M${x + s * 0.5} ${y + s * 0.1} C${x + s * 0.82} ${y + s * 0.1} ${x + s * 0.96} ${y + s * 0.3} ${x + s * 0.96} ${y + s * 0.48} C${x + s * 0.96} ${y + s * 0.68} ${x + s * 0.78} ${y + s * 0.84} ${x + s * 0.5} ${y + s * 0.84} C${x + s * 0.42} ${y + s * 0.84} ${x + s * 0.36} ${y + s * 0.83} ${x + s * 0.3} ${y + s * 0.81} L${x + s * 0.1} ${y + s * 0.92} L${x + s * 0.16} ${y + s * 0.72} C${x + s * 0.08} ${y + s * 0.64} ${x + s * 0.04} ${y + s * 0.56} ${x + s * 0.04} ${y + s * 0.48} C${x + s * 0.04} ${y + s * 0.3} ${x + s * 0.18} ${y + s * 0.1} ${x + s * 0.5} ${y + s * 0.1} Z`} fill={fill} />
);
const star = (fill: string) => (x: number, y: number, s: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5; const r = i % 2 ? s * 0.21 : s * 0.48; return `${(x + s / 2 + Math.cos(a) * r).toFixed(2)},${(y + s * 0.54 + Math.sin(a) * r).toFixed(2)}`; });
  return <polygon points={pts.join(' ')} fill={fill} />;
};
const hanger = (fill: string) => (x: number, y: number, s: number) => (
  <path d={`M${x + s * 0.42} ${y + s * 0.26} C${x + s * 0.42} ${y + s * 0.12} ${x + s * 0.58} ${y + s * 0.12} ${x + s * 0.58} ${y + s * 0.24} C${x + s * 0.58} ${y + s * 0.34} ${x + s * 0.5} ${y + s * 0.34} ${x + s * 0.5} ${y + s * 0.44} L${x + s * 0.94} ${y + s * 0.74} C${x + s * 0.98} ${y + s * 0.78} ${x + s * 0.96} ${y + s * 0.82} ${x + s * 0.9} ${y + s * 0.82} L${x + s * 0.1} ${y + s * 0.82} C${x + s * 0.04} ${y + s * 0.82} ${x + s * 0.02} ${y + s * 0.78} ${x + s * 0.06} ${y + s * 0.74} L${x + s * 0.5} ${y + s * 0.44}`} fill="none" stroke={fill} strokeWidth={s * 0.065} strokeLinecap="round" strokeLinejoin="round" />
);
const leaf = (fill: string) => (x: number, y: number, s: number) => (
  <g fill={fill}>
    <path d={`M${x + s * 0.5} ${y + s * 0.95} C${x + s * 0.5} ${y + s * 0.7} ${x + s * 0.48} ${y + s * 0.4} ${x + s * 0.3} ${y + s * 0.12}`} fill="none" stroke={fill} strokeWidth={s * 0.05} strokeLinecap="round" />
    <path d={`M${x + s * 0.47} ${y + s * 0.58} C${x + s * 0.1} ${y + s * 0.6} ${x + s * 0.06} ${y + s * 0.34} ${x + s * 0.08} ${y + s * 0.24} C${x + s * 0.3} ${y + s * 0.24} ${x + s * 0.46} ${y + s * 0.36} ${x + s * 0.47} ${y + s * 0.58} Z`} />
    <path d={`M${x + s * 0.5} ${y + s * 0.7} C${x + s * 0.9} ${y + s * 0.7} ${x + s * 0.96} ${y + s * 0.42} ${x + s * 0.92} ${y + s * 0.3} C${x + s * 0.68} ${y + s * 0.3} ${x + s * 0.5} ${y + s * 0.44} ${x + s * 0.5} ${y + s * 0.7} Z`} />
    <circle cx={x + s * 0.3} cy={y + s * 0.12} r={s * 0.08} />
  </g>
);
const flower = (fill: string) => (x: number, y: number, s: number) => (
  <g fill={fill}>
    {Array.from({ length: 5 }, (_, i) => { const a = (i * 2 * Math.PI) / 5 - Math.PI / 2; return <ellipse key={i} cx={x + s / 2 + Math.cos(a) * s * 0.22} cy={y + s / 2 + Math.sin(a) * s * 0.22} rx={s * 0.17} ry={s * 0.24} transform={`rotate(${(a * 180) / Math.PI + 90} ${x + s / 2 + Math.cos(a) * s * 0.22} ${y + s / 2 + Math.sin(a) * s * 0.22})`} />; })}
    <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.1} fill="none" />
  </g>
);

// logo khách (mask 1 màu) hoặc icon dự phòng
function logoOr(c: Ctx, size: number, fill: string, fallback: (f: string) => (x: number, y: number, s: number) => ReactNode, maxW = size * 2.6): Block {
  if (!c.logo) return icon(size, c.cy, fallback(fill));
  let h = size, w = (c.logo.w / c.logo.h) * h;
  if (w > maxW) { w = maxW; h = (c.logo.h / c.logo.w) * w; }
  const id = `${c.uid}-logo`;
  return {
    w,
    draw: (x) => (
      <g>
        <mask id={`${id}-${x.toFixed(1)}`} maskUnits="userSpaceOnUse" x={x} y={c.cy - h / 2} width={w} height={h}>
          <image href={c.logo!.href} x={x} y={c.cy - h / 2} width={w} height={h} preserveAspectRatio="none" />
        </mask>
        <rect x={x} y={c.cy - h / 2} width={w} height={h} fill={fill} mask={`url(#${id}-${x.toFixed(1)})`} />
      </g>
    ),
  };
}

interface Plan { blocks: Block[]; sep?: (x: number) => ReactNode; bg?: ReactNode; minGap: number }

function plan(layout: string, c: Ctx, k: number): Plan {
  const { H, cy, ink, data, disp, body, bodyB, W } = c;
  const big = H * 0.46 * k, mid = H * 0.26 * k, small = H * 0.19 * k;
  const maxW = c.L * 0.62;
  const contact = (fill: string, iconFill: string, f = small) => {
    const lines: Block[] = [];
    if (data.phone?.trim()) lines.push(row([icon(f * 1.05, 0, phone(iconFill)), stack([{ t: data.phone, f, ts: bodyB, fill }], maxW, f * 1.4, 0)], f * 0.3));
    if (data.social?.trim()) lines.push(row([icon(f * 1.05, 0, chat(iconFill)), stack([{ t: data.social, f, ts: body, fill }], maxW, f * 1.4, 0)], f * 0.3));
    if (!lines.length) return { w: 0, draw: () => null } as Block;
    const lh = f * 1.55, tot = lh * lines.length;
    const w = Math.max(...lines.map((l) => l.w));
    return { w, draw: (x: number) => lines.map((l, i) => <g key={i} transform={`translate(0 ${cy - tot / 2 + lh * (i + 0.5)})`}>{l.draw(x + (w - l.w) / 2)}</g>) } as Block;
  };

  switch (layout) {
    case 'thanks': {
      const brand = row([logoOr(c, big * 1.05, ink(0), heart), stack([{ t: data.brand, f: big * 0.78, ts: disp, fill: ink(0) }], maxW, H, cy)], big * 0.3);
      const [s1, s2] = split2(data.slogan);
      const thanks = row([icon(mid * 0.9, cy, heart(ink(1))), stack([{ t: s1, f: mid, ts: bodyB, fill: ink(1) }, { t: s2, f: mid, ts: bodyB, fill: ink(1) }], maxW, H, cy)], mid * 0.4);
      return { blocks: [brand, thanks, contact(ink(0), ink(1), small * 1.08)], minGap: W * 0.3, sep: (x) => <circle cx={x} cy={cy} r={H * 0.045} fill={ink(1)} /> };
    }
    case 'fragile': {
      const warn = (data.fragile || '').split(/\s+[—–-]\s+/);
      const head = stack([
        { t: (warn[0] || '').toUpperCase(), f: big * 0.86, ts: disp, fill: ink(0) },
        ...(warn[1] ? [{ t: warn[1].toUpperCase(), f: mid * 0.8, ts: { ...bodyB, ls: 0.12 }, fill: ink(1) }] : []),
      ], maxW, H * 0.86, cy);
      const icons = row([icon(big, cy, glass(ink(1))), icon(big, cy, arrows(ink(0))), icon(big, cy, umbrella(ink(1)))], big * 0.25);
      const who = stack([{ t: data.brand, f: mid * 0.9, ts: disp, fill: ink(0) }, { t: data.phone, f: small * 0.9, ts: body, fill: ink(0) }], maxW, H * 0.8, cy);
      const lw = Math.max(0.6, W * 0.025);
      const bg = <g>{[c.m * 0.45, W - c.m * 0.45].map((y) => <rect key={y} x={0} y={y - lw / 2} width={c.L} height={lw} fill={ink(0)} />)}</g>;
      return { blocks: [icons, head, who], minGap: W * 0.3, bg };
    }
    case 'fashion': {
      const brand = stack([{ t: data.brand, f: big * 0.82, ts: { ...disp, ls: 0.14 }, fill: ink(0) }], maxW, H * 0.7, cy);
      const sub = stack([{ t: data.slogan, f: small, ts: body, fill: ink(0) }, { t: data.social, f: small * 0.85, ts: { ...bodyB, ls: 0.1 }, fill: ink(0) }], maxW, H * 0.7, cy);
      const lw = Math.max(0.35, W * 0.008);
      const bg = <g>{[c.m * 0.55, c.m * 0.55 + lw * 3, W - c.m * 0.55, W - c.m * 0.55 - lw * 3].map((y, i) => <rect key={i} x={0} y={y - lw / 2} width={c.L} height={lw} fill={ink(0)} />)}</g>;
      return { blocks: [row([logoOr(c, big * 0.7, ink(0), hanger), brand], big * 0.35), sub], minGap: W * 0.45, bg, sep: (x) => <rect x={x - H * 0.06} y={cy - H * 0.06} width={H * 0.12} height={H * 0.12} transform={`rotate(45 ${x} ${cy})`} fill={ink(0)} /> };
    }
    case 'beauty': {
      const brand = stack([{ t: data.brand, f: big * 0.95, ts: disp, fill: ink(0) }], maxW, H * 0.8, cy);
      const sub = stack([{ t: data.slogan, f: small * 1.05, ts: body, fill: ink(1) }, { t: data.social, f: small * 0.85, ts: { ...bodyB, ls: 0.08 }, fill: ink(1) }], maxW, H * 0.8, cy);
      return {
        blocks: [row([logoOr(c, big * 0.95, ink(0), flower), brand], big * 0.3), row([icon(mid * 1.2, cy, leaf(ink(1))), sub], mid * 0.4)],
        minGap: W * 0.4,
        sep: (x) => icon(H * 0.22, cy, flower(ink(0))).draw(x - H * 0.11),
      };
    }
    case 'minimal': {
      const brand = stack([{ t: data.brand.toUpperCase(), f: big * 0.78, ts: { ...disp, ls: 0.06 }, fill: ink(0) }], maxW, H, cy);
      const soc = stack([{ t: data.social, f: small, ts: { ...bodyB, ls: 0.08 }, fill: ink(0) }], maxW, H, cy);
      return { blocks: c.logo ? [logoOr(c, big, ink(0), box), brand, soc] : [brand, soc], minGap: W * 0.6, sep: (x) => <rect x={x - H * 0.18} y={cy - H * 0.012} width={H * 0.36} height={H * 0.024 + 0.25} fill={ink(0)} /> };
    }
    case 'pattern': {
      // nền hoạ tiết nhỏ (mực 2, 3) + nhãn bo tròn mực 1 chữ khoét rỗng (thấy nền băng keo)
      const s = H * 0.2, step = H * 0.5;
      const nx = Math.max(1, Math.round(c.L / step)), sx = c.L / nx;
      const motifs = [heart, star, box];
      const bgItems: ReactNode[] = [];
      for (let i = 0; i < nx; i++) for (let j = 0; j < 2; j++) {
        const x = i * sx + (j ? sx / 2 : 0), y = j ? W - c.m * 0.2 - s * 1.05 : c.m * 0.2 + s * 0.05;
        bgItems.push(<g key={`${i}-${j}`}>{motifs[(i + j) % 3](i % 2 ? ink(2) : ink(1))(x, y, s)}</g>);
      }
      const f = mid * 1.25;
      const tw = Math.min(measure(data.brand, f, disp), maxW);
      const ff = tw < measure(data.brand, f, disp) ? (f * tw) / measure(data.brand, f, disp) : f;
      const ph = H * 0.5, pw = tw + ph * 0.9;
      const pill: Block = {
        w: pw,
        draw: (x) => {
          const id = `${c.uid}-ko-${x.toFixed(1)}`;
          return (
            <g>
              <mask id={id} maskUnits="userSpaceOnUse" x={x - 1} y={cy - ph / 2 - 1} width={pw + 2} height={ph + 2}>
                <rect x={x - 1} y={cy - ph / 2 - 1} width={pw + 2} height={ph + 2} fill="#fff" />
                <text x={x + pw / 2} y={cy + ff * 0.36} textAnchor="middle" fontFamily={`"${disp.fam}"`} fontWeight={disp.wt} fontSize={ff} fill="#000">{data.brand}</text>
              </mask>
              <rect x={x} y={cy - ph / 2} width={pw} height={ph} rx={ph / 2} fill={ink(0)} mask={`url(#${id})`} />
            </g>
          );
        },
      };
      const thanks = stack([{ t: data.slogan, f: small * 1.1, ts: bodyB, fill: ink(0) }, { t: data.phone, f: small, ts: body, fill: ink(0) }], maxW, H * 0.5, cy);
      return { blocks: [c.logo ? row([logoOr(c, ph, ink(0), heart), pill], ph * 0.25) : pill, thanks], minGap: W * 0.5, bg: <g>{bgItems}</g> };
    }
    default: { // seal: sọc cảnh báo trên + dưới, chữ kiểm hàng ở giữa
      const band = Math.max(2.5, W * 0.13);
      const per = band * 1.6, n = Math.max(2, Math.round(c.L / per)), p = c.L / n;
      const stripes = (y: number) => <g>{Array.from({ length: n + 1 }, (_, i) => <path key={i} d={`M${i * p - band} ${y + band} L${i * p - band + p / 2} ${y + band} L${i * p + p / 2} ${y} L${i * p} ${y} Z`} fill={ink(1)} />)}</g>;
      const clip = `${c.uid}-band`;
      const bg = (
        <g>
          <clipPath id={clip}><rect x={0} y={0} width={c.L} height={band} /><rect x={0} y={W - band} width={c.L} height={band} /></clipPath>
          <g clipPath={`url(#${clip})`}>{stripes(0)}{stripes(W - band)}</g>
        </g>
      );
      const inner = W - band * 2, ccy = cy;
      const head = stack([{ t: 'ĐÃ KIỂM TRA HÀNG', f: inner * 0.34 * k, ts: disp, fill: ink(0) }, { t: 'Không nhận nếu băng keo bị rách', f: inner * 0.2 * k, ts: bodyB, fill: ink(0) }], maxW, inner * 0.92, ccy);
      const who = stack([{ t: data.brand, f: inner * 0.3 * k, ts: disp, fill: ink(0) }, { t: data.phone, f: inner * 0.2 * k, ts: body, fill: ink(0) }], maxW, inner * 0.92, ccy);
      return { blocks: [row([icon(inner * 0.66 * k, ccy, box(ink(0))), head], inner * 0.18), who], minGap: W * 0.3, bg };
    }
  }
}

// dàn khối đều theo đoạn lặp; tràn thì co tỉ lệ
function arrange(layout: string, c: Ctx): { nodes: ReactNode; bg: ReactNode } {
  let k = 1, p = plan(layout, c, k);
  for (let it = 0; it < 4; it++) {
    const tot = p.blocks.reduce((a, b) => a + b.w, 0);
    const room = c.L - p.minGap * p.blocks.length;
    if (tot <= room || tot === 0) break;
    k *= Math.max(0.3, room / tot) * 0.98;
    p = plan(layout, c, k);
  }
  const bl = p.blocks.filter((b) => b.w > 0);
  const tot = bl.reduce((a, b) => a + b.w, 0);
  const gap = Math.max(0, (c.L - tot) / Math.max(1, bl.length));
  let x = gap / 2;
  const nodes: ReactNode[] = [];
  bl.forEach((b, i) => {
    nodes.push(<g key={`b${i}`}>{b.draw(x)}</g>);
    x += b.w;
    if (p.sep) nodes.push(<g key={`s${i}`}>{p.sep(x + gap / 2)}</g>);
    if (p.sep && i === bl.length - 1) nodes.push(<g key="wrap">{p.sep(x + gap / 2 - c.L)}</g>); // nửa dấu ngăn ở mép trái (nối liền khi lặp)
    x += gap;
  });
  return { nodes, bg: p.bg };
}

export const tpMargin = (W: number) => Math.max(3, W * 0.09);
export const TP_MARK_MM = 9;

export type TPMode = 'unit' | 'print' | 'strip';
/**
 * unit: 1 đoạn lặp (nền băng keo nếu đục; băng trong → trong suốt) — làm ảnh/texture 3D.
 * print: file in: đoạn lặp + vạch lặp + ghi chú (nền chỉ để tham khảo, không in).
 * strip: n đoạn nối nhau để xem trước.
 */
export function TapeSvg({ spec, data, logo = null, mode = 'unit', repeats = 3, style }: {
  spec: TPSpec; data: TPData; logo?: TPLogo | null; mode?: TPMode; repeats?: number; style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '');
  const W = spec.width, L = spec.rep;
  const base = tpBase(spec.base);
  const f = tpFont(spec.font);
  const inks = spec.inks.length ? spec.inks : ['black'];
  const lay = tpLayout(spec.layout);
  const ink = (i: number) => tpInk(inks[Math.min(i, inks.length - 1, lay.inks - 1)]).hex;
  const m = tpMargin(W);
  const c: Ctx = {
    W, L, m, cy: W / 2, H: W - m * 2, ink, base, uid, logo,
    disp: { fam: f.family, wt: f.weight }, body: { fam: BODY, wt: 600 }, bodyB: { fam: BODY, wt: 800 },
    data: { ...data, brand: data.brand || ' ' },
  };
  const { nodes, bg } = arrange(spec.layout, c);
  const clip = `${uid}-unit`;
  const unit = (
    <g id="In">
      <clipPath id={clip}><rect x={0} y={0} width={L} height={W} /></clipPath>
      <g clipPath={`url(#${clip})`}>{bg}{nodes}</g>
    </g>
  );
  const baseRect = base.hex ? <rect data-base="1" x={0} y={0} width={L} height={W} fill={base.hex} /> : null;

  if (mode === 'strip') {
    const n = Math.max(1, repeats);
    return (
      <svg viewBox={`0 0 ${L * n} ${W}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
        <defs><g id={`${uid}-u`}>{baseRect}{unit}</g></defs>
        {Array.from({ length: n }, (_, i) => <use key={i} href={`#${uid}-u`} x={i * L} />)}
      </svg>
    );
  }
  if (mode === 'print') {
    const M = TP_MARK_MM;
    const note = `Rộng ${W}mm · lặp lại mỗi ${L}mm · nền: băng keo ${base.name.toLowerCase()} · ${inks.slice(0, lay.inks).length} màu mực: ${inks.slice(0, lay.inks).map((i) => tpInk(i).name).join(', ')}`;
    return (
      <svg viewBox={`${-M} ${-M} ${L + M * 2} ${W + M * 2}`} width={`${L + M * 2}mm`} height={`${W + M * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style}>
        <g id="NenThamKhao" opacity={base.hex ? 1 : 0.35}><rect x={0} y={0} width={L} height={W} fill={base.hex ?? '#C9A57B'} /></g>
        {unit}
        <g id="VachLap" stroke="#000" strokeWidth={0.2} fill="none">
          {[0, L].map((x) => <g key={x}><line x1={x} y1={-M} x2={x} y2={-1.5} /><line x1={x} y1={W + 1.5} x2={x} y2={W + M} /></g>)}
          <line x1={-M} y1={0} x2={-1.5} y2={0} /><line x1={-M} y1={W} x2={-1.5} y2={W} />
          <line x1={L + 1.5} y1={0} x2={L + M} y2={0} /><line x1={L + 1.5} y1={W} x2={L + M} y2={W} />
        </g>
        <text x={0} y={-M * 0.45} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={2.6} fill="#000">{note}</text>
        <text x={L} y={W + M * 0.75} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={2.4} fill="#000">Vạch đen = điểm lặp · đoạn {L}mm</text>
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${L} ${W}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      {baseRect}{unit}
    </svg>
  );
}

/** số màu mực thật sự dùng trong lớp In (bỏ mask/clip/defs) — QC + hiển thị */
export function inkColorsUsed(svg: SVGSVGElement): string[] {
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
