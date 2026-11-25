'use client';
// Mũ bảo hiểm in logo (quà tặng doanh nghiệp, đại lý, trường học): 1 engine SVG (mm thật) = BỐ CỤC × MÀU VỎ × BỘ MỰC × FONT
// → decal từng vị trí (trước 100×60, 2 hông 120×80, sau gáy 100×50), mockup phẳng, phiếu đơn. Render code 100%, không AI.
// Không dùng thương hiệu mũ có thật.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- loại mũ ----------
export type HmKind = 'half' | 'three4';
export const HM_KINDS: { id: HmKind; name: string; note: string }[] = [
  { id: 'half', name: 'Nửa đầu', note: 'Phổ biến nhất làm quà tặng — nhẹ, rẻ' },
  { id: 'three4', name: '3/4 đầu', note: 'Ôm tai & gáy, chắc chắn hơn' },
];

export type HmPos = 'front' | 'left' | 'right' | 'back';
export const HM_POS: Record<HmPos, { name: string; w: number; h: number }> = {
  front: { name: 'Mặt trước', w: 100, h: 60 },
  left: { name: 'Hông trái', w: 120, h: 80 },
  right: { name: 'Hông phải', w: 120, h: 80 },
  back: { name: 'Sau gáy', w: 100, h: 50 },
};

// ---------- màu vỏ ----------
export interface HmShell { id: string; name: string; hex: string; metal?: boolean }
export const HM_SHELLS: HmShell[] = [
  { id: 'white', name: 'Trắng', hex: '#F1F1EE' },
  { id: 'black', name: 'Đen', hex: '#1C1D20' },
  { id: 'red', name: 'Đỏ', hex: '#BE2A2E' },
  { id: 'blue', name: 'Xanh dương', hex: '#1F5DB5' },
  { id: 'navy', name: 'Xanh navy', hex: '#1F2C49' },
  { id: 'yellow', name: 'Vàng', hex: '#F1C232' },
  { id: 'silver', name: 'Bạc', hex: '#B8BCC2', metal: true },
  { id: 'pink', name: 'Hồng', hex: '#EEA5BD' },
  { id: 'green', name: 'Xanh lá', hex: '#2F7D4F' },
  { id: 'orange', name: 'Cam', hex: '#EC7A24' },
];
export const hmShell = (id: string) => HM_SHELLS.find((c) => c.id === id) || HM_SHELLS[0];

// ---------- bộ mực (2 màu: chính · phụ) ----------
export interface HmInk { id: string; name: string; c: [string, string]; n: [string, string] }
export const HM_INKS: HmInk[] = [
  { id: 'navyred', name: 'Navy · đỏ', c: ['#1E2B47', '#D0302F'], n: ['Xanh navy', 'Đỏ'] },
  { id: 'white', name: 'Trắng · vàng', c: ['#FFFFFF', '#F2C230'], n: ['Trắng', 'Vàng'] },
  { id: 'blackred', name: 'Đen · đỏ', c: ['#17181B', '#D0302F'], n: ['Đen', 'Đỏ'] },
  { id: 'whiteblue', name: 'Trắng · xanh nhạt', c: ['#FFFFFF', '#8CCBFF'], n: ['Trắng', 'Xanh nhạt'] },
  { id: 'greenyellow', name: 'Xanh lá · vàng', c: ['#1C7A45', '#E9B52A'], n: ['Xanh lá', 'Vàng'] },
  { id: 'blueorange', name: 'Xanh · cam', c: ['#1F5DB5', '#EC7A24'], n: ['Xanh dương', 'Cam'] },
  { id: 'redgold', name: 'Đỏ · vàng đồng', c: ['#B8262B', '#C9962F'], n: ['Đỏ', 'Vàng đồng'] },
  { id: 'black', name: 'Đen · xám', c: ['#17181B', '#62666D'], n: ['Đen', 'Xám'] },
];
export const hmInk = (id: string) => HM_INKS.find((t) => t.id === id) || HM_INKS[0];

// ---------- font (đều có TTF → outline) ----------
export interface HmFont { id: string; name: string; family: string; weight: number }
export const HM_FONTS: HmFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
];
export const hmFont = (id: string) => HM_FONTS.find((f) => f.id === id) || HM_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const HM_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Bungee&display=swap');`;

export function useHmFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-hm-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-hm-fonts'; link.rel = 'stylesheet';
        link.href = HM_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...HM_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec / data ----------
export type HmMethod = 'uv' | 'screen';
export interface HmSpec {
  kind: HmKind; visor: boolean; shell: string; finish: 'gloss' | 'matte'; layout: string; ink: string; inks: 1 | 2; font: string;
  method: HmMethod; left: boolean; right: boolean; back: boolean;
}
export type HmData = Record<string, string>;
export interface HmField { key: string; label: string; ph?: string }
export const HM_FIELDS: HmField[] = [
  { key: 'brand', label: 'Tên công ty / đại lý' },
  { key: 'slogan', label: 'Slogan (hông mũ)' },
  { key: 'hotline', label: 'Hotline (sau gáy)' },
  { key: 'web', label: 'Website / fanpage (sau gáy)' },
];

interface LayoutDef { id: string; name: string; icon: IconKind; sample: HmData }
type IconKind = 'swoosh' | 'shield' | 'wheel' | 'drop' | 'star' | 'helmet' | 'none';
export const HM_LAYOUTS: LayoutDef[] = [
  { id: 'bank', name: 'Ngân hàng', icon: 'swoosh', sample: { brand: 'AN KHANG BANK', slogan: 'Đồng hành an toàn mọi nẻo đường', hotline: '1900 6868', web: 'ankhangbank.vn' } },
  { id: 'insurance', name: 'Bảo hiểm', icon: 'shield', sample: { brand: 'BẢO HIỂM THU HÀ', slogan: 'Đội mũ bảo hiểm – Bảo vệ chính mình', hotline: '1800 1234', web: 'baohiemthuha.vn' } },
  { id: 'dealer', name: 'Đại lý xe', icon: 'wheel', sample: { brand: 'XE MÁY QUỐC BẢO', slogan: 'Bảo dưỡng miễn phí trọn đời', hotline: '0909 123 456', web: 'xemayquocbao.vn' } },
  { id: 'paint', name: 'Hãng sơn', icon: 'drop', sample: { brand: 'SƠN GIA KHÁNH', slogan: 'Sắc màu bền đẹp cho mọi nhà', hotline: '1900 9090', web: 'songiakhanh.vn' } },
  { id: 'school', name: 'Mũ học sinh', icon: 'star', sample: { brand: 'TRƯỜNG TH AN KHANG', slogan: 'An toàn đến trường', hotline: '028 3812 3456', web: 'thankhang.edu.vn' } },
  { id: 'safety', name: 'An toàn giao thông', icon: 'helmet', sample: { brand: 'AN KHANG GROUP', slogan: 'Đội mũ bảo hiểm – Bảo vệ chính mình', hotline: '1900 6868', web: 'ankhang.vn' } },
  { id: 'minimal', name: 'Tối giản', icon: 'none', sample: { brand: 'AN KHANG', slogan: 'Quà tặng khách hàng thân thiết', hotline: '0909 123 456', web: 'ankhang.vn' } },
];
export const hmLayout = (id: string) => HM_LAYOUTS.find((l) => l.id === id) || HM_LAYOUTS[0];
export const defaultHmData = (layout = 'bank'): HmData => ({ ...hmLayout(layout).sample });

export interface HmTemplate { id: string; name: string; spec: HmSpec }
const T = (id: string, name: string, s: Partial<HmSpec> & Pick<HmSpec, 'layout' | 'shell' | 'ink' | 'font'>): HmTemplate =>
  ({ id, name, spec: { kind: 'half', visor: false, finish: 'gloss', inks: 2, method: 'screen', left: true, right: true, back: true, ...s } });
export const HM_TEMPLATES: HmTemplate[] = [
  T('bank-white', 'Ngân hàng trắng', { layout: 'bank', shell: 'white', ink: 'navyred', font: 'montserrat' }),
  T('bank-navy', 'Ngân hàng navy', { layout: 'bank', shell: 'navy', ink: 'white', font: 'montserrat', finish: 'matte' }),
  T('ins-blue', 'Bảo hiểm xanh', { layout: 'insurance', shell: 'blue', ink: 'white', font: 'bvp', visor: true }),
  T('ins-white', 'Bảo hiểm trắng', { layout: 'insurance', shell: 'white', ink: 'blueorange', font: 'bvp' }),
  T('dealer-red', 'Đại lý xe đỏ', { layout: 'dealer', shell: 'red', ink: 'white', font: 'oswald', kind: 'three4', visor: true }),
  T('dealer-black', 'Đại lý xe đen nhám', { layout: 'dealer', shell: 'black', ink: 'blackred', font: 'oswald', finish: 'matte', method: 'uv' }),
  T('paint-yellow', 'Hãng sơn vàng', { layout: 'paint', shell: 'yellow', ink: 'blueorange', font: 'baloo', method: 'uv' }),
  T('school-pink', 'Học sinh hồng', { layout: 'school', shell: 'pink', ink: 'white', font: 'baloo', inks: 1 }),
  T('school-orange', 'Học sinh cam', { layout: 'school', shell: 'orange', ink: 'white', font: 'baloo', visor: true }),
  T('safety-silver', 'ATGT bạc', { layout: 'safety', shell: 'silver', ink: 'navyred', font: 'montserrat', kind: 'three4' }),
  T('safety-green', 'ATGT xanh lá', { layout: 'safety', shell: 'green', ink: 'white', font: 'bvp', finish: 'matte' }),
  T('minimal-black', 'Tối giản đen', { layout: 'minimal', shell: 'black', ink: 'white', font: 'bungee', inks: 1, back: false }),
];

export const hmPositions = (spec: HmSpec): HmPos[] => ['front' as HmPos, ...(spec.left ? ['left' as HmPos] : []), ...(spec.right ? ['right' as HmPos] : []), ...(spec.back ? ['back' as HmPos] : [])];

// ---------- màu mực thật dùng (1 màu lụa → chỉ màu chính) ----------
export function hmInkColors(spec: HmSpec): string[] {
  const k = hmInk(spec.ink);
  return spec.method === 'screen' && spec.inks === 1 ? [k.c[0]] : [k.c[0], k.c[1]];
}
const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };
export function hmWarnings(spec: HmSpec): string[] {
  const w: string[] = [];
  const shellL = lum(hmShell(spec.shell).hex);
  const main = hmInkColors(spec)[0];
  if (Math.abs(lum(main) - shellL) < 70) w.push('Màu mực chính gần màu vỏ mũ — chữ sẽ khó đọc, nên đổi bộ mực.');
  return w;
}

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, ts: TS): number {
  if (typeof document === 'undefined') return t.length * size * 0.6;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return t.length * size * 0.6;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  return (mctx.measureText(t).width / 100) * size + (ts.ls || 0) * size * Math.max(0, [...t].length - 1);
}
const fmCache = new Map<string, { asc: number; desc: number }>();
function fm(ts: TS): { asc: number; desc: number } {
  const key = `${ts.wt} ${ts.fam}`;
  let m = fmCache.get(key);
  if (!m) {
    m = { asc: 0.95, desc: 0.3 };
    if (typeof document !== 'undefined') {
      const cx = document.createElement('canvas').getContext('2d');
      if (cx) { cx.font = `${ts.wt} 100px "${ts.fam}"`; const mt = cx.measureText('ẮỖgy'); if (mt.fontBoundingBoxAscent) m = { asc: mt.fontBoundingBoxAscent / 100, desc: mt.fontBoundingBoxDescent / 100 }; }
    }
    if (typeof document !== 'undefined' && document.fonts?.check?.(`${ts.wt} 20px "${ts.fam}"`)) fmCache.set(key, m);
  }
  return m;
}
/** cỡ chữ lớn nhất ≤ size để 1 dòng vừa maxW và hộp chữ cao ≤ maxH */
function fit1(t: string, maxW: number, maxH: number, size: number, ts: TS): number {
  const w = textW(t, size, ts);
  let s = w > maxW ? (size * maxW) / w : size;
  const m = fm(ts); s = Math.min(s, maxH / (m.asc + m.desc));
  return s;
}
/** chia 2 dòng cân (ở khoảng trắng gần giữa nhất) */
function split2(t: string): [string, string] | null {
  const words = t.trim().split(/\s+/);
  if (words.length < 2) return null;
  let best: [string, string] | null = null, diff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const d = Math.abs(a.length - b.length);
    if (d < diff) { diff = d; best = [a, b]; }
  }
  return best;
}
/** khối chữ 1 hoặc 2 dòng vừa hộp (w×h) — chọn cách cho chữ to hơn */
function fitBlock(t: string, w: number, h: number, size: number, ts: TS, gap = 0.12): { lines: string[]; s: number } {
  const one = fit1(t, w, h, size, ts);
  const sp = split2(t);
  if (!sp) return { lines: [t], s: one };
  const m = fm(ts);
  let two = Math.min(fit1(sp[0], w, h, size, ts), fit1(sp[1], w, h, size, ts));
  two = Math.min(two, h / ((m.asc + m.desc) * (2 + gap)));
  return two > one * 1.18 ? { lines: sp, s: two } : { lines: [t], s: one };
}

// ---------- vẽ ----------
export interface HmItem { n: ReactNode; k: number } // k = mực (1 chính, 2 phụ, 0 = ảnh logo nhiều màu)
interface Ctx { W: number; H: number; c1: string; c2: string; ts: TS; items: HmItem[]; uid: string; logo?: string; mono: boolean; screen: boolean }

function txt(ctx: Ctx, t: string, x: number, y: number, size: number, ts: TS, k: 1 | 2, anchor: 'start' | 'middle' | 'end' = 'middle') {
  if (!t) return;
  ctx.items.push({ k, n: <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size} fill={k === 1 ? ctx.c1 : ctx.c2} textAnchor={anchor} letterSpacing={ts.ls ? ts.ls * size : undefined} data-ink={k}>{t}</text> });
}
/** khối chữ căn giữa theo dọc trong hộp [x0..x1]×[y0..y1] */
function block(ctx: Ctx, t: string, x0: number, y0: number, x1: number, y1: number, size: number, ts: TS, k: 1 | 2, anchor: 'start' | 'middle' = 'middle') {
  if (!t) return 0;
  const { lines, s } = fitBlock(t, x1 - x0, y1 - y0, size, ts);
  const m = fm(ts); const lh = s * (m.asc + m.desc) * 1.08;
  const total = lh * lines.length - s * (m.asc + m.desc) * 0.08;
  let y = (y0 + y1) / 2 - total / 2 + m.asc * s;
  const x = anchor === 'middle' ? (x0 + x1) / 2 : x0;
  for (const ln of lines) { txt(ctx, ln, x, y, s, ts, k, anchor); y += lh; }
  return s;
}

const shape = (ctx: Ctx, k: 1 | 2, n: ReactNode) => ctx.items.push({ k, n });

/** biểu tượng ngành, vẽ trong ô vuông cạnh d tại (cx, cy) */
function icon(ctx: Ctx, kind: IconKind, cx: number, cy: number, d: number) {
  const r = d / 2;
  const c1 = ctx.c1, c2 = ctx.mono ? ctx.c1 : ctx.c2, k2: 1 | 2 = ctx.mono ? 1 : 2;
  if (kind === 'swoosh') {
    shape(ctx, 1, <circle cx={cx} cy={cy} r={r} fill="none" stroke={c1} strokeWidth={d * 0.09} />);
    shape(ctx, k2, <path d={`M${cx - r * 0.72} ${cy + r * 0.28} Q${cx} ${cy - r * 0.6} ${cx + r * 0.72} ${cy - r * 0.18} Q${cx} ${cy - r * 0.18} ${cx - r * 0.72} ${cy + r * 0.28}Z`} fill={c2} />);
    shape(ctx, 1, <path d={`M${cx - r * 0.6} ${cy + r * 0.52} Q${cx} ${cy - r * 0.1} ${cx + r * 0.6} ${cy + r * 0.22} Q${cx} ${cy + r * 0.24} ${cx - r * 0.6} ${cy + r * 0.52}Z`} fill={c1} />);
  } else if (kind === 'shield') {
    const p = `M${cx} ${cy - r} L${cx + r * 0.82} ${cy - r * 0.62} L${cx + r * 0.74} ${cy + r * 0.2} Q${cx + r * 0.5} ${cy + r * 0.78} ${cx} ${cy + r} Q${cx - r * 0.5} ${cy + r * 0.78} ${cx - r * 0.74} ${cy + r * 0.2} L${cx - r * 0.82} ${cy - r * 0.62}Z`;
    const chk = `M${cx - r * 0.38} ${cy + r * 0.02} L${cx - r * 0.08} ${cy + r * 0.32} L${cx + r * 0.42} ${cy - r * 0.3}`;
    if (ctx.mono) {
      shape(ctx, 1, <path d={p} fill="none" stroke={c1} strokeWidth={d * 0.08} strokeLinejoin="round" />);
      shape(ctx, 1, <path d={chk} fill="none" stroke={c1} strokeWidth={d * 0.1} strokeLinecap="round" strokeLinejoin="round" />);
    } else {
      shape(ctx, 1, <path d={p} fill={c1} />);
      shape(ctx, 2, <path d={chk} fill="none" stroke={c2} strokeWidth={d * 0.1} strokeLinecap="round" strokeLinejoin="round" />);
    }
  } else if (kind === 'wheel') {
    shape(ctx, 1, <circle cx={cx} cy={cy} r={r * 0.92} fill="none" stroke={c1} strokeWidth={d * 0.12} />);
    shape(ctx, k2, <circle cx={cx} cy={cy} r={r * 0.2} fill={c2} />);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      shape(ctx, 1, <line x1={cx + Math.cos(a) * r * 0.26} y1={cy + Math.sin(a) * r * 0.26} x2={cx + Math.cos(a) * r * 0.82} y2={cy + Math.sin(a) * r * 0.82} stroke={c1} strokeWidth={d * 0.06} strokeLinecap="round" />);
    }
  } else if (kind === 'drop') {
    shape(ctx, 1, <path d={`M${cx} ${cy - r} C${cx + r * 0.2} ${cy - r * 0.5} ${cx + r * 0.78} ${cy - r * 0.05} ${cx + r * 0.78} ${cy + r * 0.34} A${r * 0.78} ${r * 0.66} 0 0 1 ${cx - r * 0.78} ${cy + r * 0.34} C${cx - r * 0.78} ${cy - r * 0.05} ${cx - r * 0.2} ${cy - r * 0.5} ${cx} ${cy - r}Z`} fill={c1} />);
    shape(ctx, k2, <circle cx={cx + r * 0.72} cy={cy - r * 0.62} r={r * 0.2} fill={c2} />);
    shape(ctx, k2, <circle cx={cx - r * 0.82} cy={cy - r * 0.3} r={r * 0.13} fill={c2} />);
  } else if (kind === 'star') {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r; pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`); }
    shape(ctx, 1, <polygon points={pts.join(' ')} fill={c1} />);
    shape(ctx, k2, <circle cx={cx} cy={cy + r * 0.05} r={r * 0.18} fill={c2} />);
  } else if (kind === 'helmet') {
    shape(ctx, 1, <path d={`M${cx - r} ${cy + r * 0.38} A${r} ${r * 0.95} 0 0 1 ${cx + r} ${cy + r * 0.38} L${cx + r * 1.0} ${cy + r * 0.52} L${cx - r * 1.0} ${cy + r * 0.52}Z`} fill={c1} />);
    shape(ctx, k2, <path d={`M${cx - r * 0.5} ${cy - r * 0.4} Q${cx - r * 0.1} ${cy - r * 0.72} ${cx + r * 0.42} ${cy - r * 0.46}`} fill="none" stroke={c2} strokeWidth={d * 0.08} strokeLinecap="round" />);
    shape(ctx, k2, <rect x={cx - r * 0.12} y={cy + r * 0.62} width={r * 0.24} height={r * 0.3} rx={r * 0.06} fill={c2} />);
  }
}

/** logo khách (UV giữ màu; lụa → luôn 1 màu mực chính qua mask) */
function logoImg(ctx: Ctx, x: number, y: number, w: number, h: number, maskHref?: string) {
  if (!ctx.logo) return;
  if (ctx.screen && maskHref) {
    const id = `${ctx.uid}-lm`;
    ctx.items.push({ k: 1, n: (
      <g>
        <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}><image href={maskHref} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" /></mask>
        <rect x={x} y={y} width={w} height={h} fill={ctx.c1} mask={`url(#${id})`} data-ink={1} />
      </g>
    ) });
  } else {
    ctx.items.push({ k: 0, n: <image href={ctx.logo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" /> });
  }
}

export interface HmArtOpts { spec: HmSpec; data: HmData; pos: HmPos; logo?: string; logoMask?: string; uid?: string }
/** nội dung 1 vị trí (toạ độ mm, gốc 0..W × 0..H, nền trong) */
export function hmArtItems({ spec, data, pos, logo, logoMask, uid = 'hm' }: HmArtOpts): { W: number; H: number; items: HmItem[] } {
  const P = HM_POS[pos], W = P.w, H = P.h;
  const L = hmLayout(spec.layout);
  const f = hmFont(spec.font);
  const ts: TS = { fam: f.family, wt: f.weight, ls: f.family === 'Oswald' ? 0.02 : 0.01 };
  const body: TS = { fam: BODY, wt: 600 };
  const cols = hmInkColors(spec);
  const mono = cols.length === 1;
  const ctx: Ctx = { W, H, c1: cols[0], c2: cols[1] || cols[0], ts, items: [], uid: `${uid}-${pos}`, logo, mono: spec.method === 'screen' ? mono : false, screen: spec.method === 'screen' };
  if (spec.method === 'screen' && !logoMask) ctx.logo = undefined; // lụa: logo chỉ dùng khi đã có mask 1 màu
  const k2: 1 | 2 = ctx.mono ? 1 : 2;
  const pad = Math.min(W, H) * 0.08;
  const brand = (data.brand || '').trim(), slogan = (data.slogan || '').trim(), hot = (data.hotline || '').trim(), web = (data.web || '').trim();
  const emb = (cx: number, cy: number, d: number) => {
    if (ctx.logo) logoImg(ctx, cx - d / 2, cy - d / 2, d, d, logoMask);
    else if (L.icon !== 'none') icon(ctx, L.icon, cx, cy, d);
  };
  const hasEmb = !!ctx.logo || L.icon !== 'none';

  if (pos === 'front') {
    if (hasEmb) {
      const d = H * 0.6;
      emb(pad + d / 2, H / 2, d);
      block(ctx, brand, pad * 1.5 + d, pad, W - pad, H - pad, H * 0.36, ts, 1, 'start');
    } else {
      block(ctx, brand, pad, pad, W - pad, H - pad, H * 0.42, ts, 1);
    }
  } else if (pos === 'left' || pos === 'right') {
    // dải trang trí theo ngành ở chân decal (màu phụ)
    const bandH = H * 0.13;
    if (L.id === 'bank' || L.id === 'safety') {
      shape(ctx, k2, <path d={`M${pad} ${H - pad - bandH * 0.2} Q${W * 0.5} ${H - pad - bandH * 1.5} ${W - pad} ${H - pad - bandH * 0.9} L${W - pad} ${H - pad - bandH * 0.45} Q${W * 0.5} ${H - pad - bandH * 0.9} ${pad} ${H - pad}Z`} fill={ctx.mono ? ctx.c1 : ctx.c2} />);
    } else if (L.id === 'dealer') {
      for (let i = 0; i < 3; i++) shape(ctx, k2, <rect x={pad + i * W * 0.05} y={H - pad - bandH * (0.95 - i * 0.3)} width={W * 0.34 - i * W * 0.08} height={bandH * 0.18} rx={bandH * 0.09} fill={ctx.mono ? ctx.c1 : ctx.c2} />);
    } else if (L.id === 'paint') {
      [[0.12, 0.86, 0.06], [0.2, 0.9, 0.035], [0.86, 0.84, 0.05], [0.93, 0.9, 0.03]].forEach(([x, y, r], i) => shape(ctx, i % 2 ? 1 : k2, <circle cx={W * x} cy={H * y} r={H * r} fill={i % 2 ? ctx.c1 : (ctx.mono ? ctx.c1 : ctx.c2)} />));
    } else if (L.id === 'school') {
      for (let i = 0; i < 5; i++) { const cx = W * (0.3 + i * 0.1); shape(ctx, k2, <circle cx={cx} cy={H - pad - bandH * 0.3} r={bandH * 0.22} fill={ctx.mono ? ctx.c1 : ctx.c2} />); }
    } else if (L.id === 'insurance') {
      shape(ctx, k2, <rect x={pad} y={H - pad - bandH * 0.55} width={W - pad * 2} height={bandH * 0.22} rx={bandH * 0.11} fill={ctx.mono ? ctx.c1 : ctx.c2} />);
    }
    const textBottom = L.id === 'minimal' ? H - pad : H - pad - bandH * 1.1;
    let x0 = pad;
    if (hasEmb) { const d = Math.min(H * 0.42, W * 0.3); emb(pad + d / 2, pad + d / 2 + H * 0.04, d); x0 = pad + d + pad * 0.8; }
    const brandBottom = slogan ? pad + (textBottom - pad) * 0.6 : textBottom;
    block(ctx, brand, x0, pad, W - pad, brandBottom, H * 0.24, ts, 1, hasEmb ? 'start' : 'middle');
    if (slogan) block(ctx, slogan, pad, brandBottom + H * 0.02, W - pad, textBottom, H * 0.12, body, k2);
  } else {
    // sau gáy: hotline to + web
    const topH = web ? H * 0.58 : H - pad * 2;
    const phoneIcon = H * 0.26;
    shape(ctx, k2, <path d={`M${pad} ${pad + topH * 0.5 - phoneIcon * 0.4} q${phoneIcon * 0.12} ${-phoneIcon * 0.12} ${phoneIcon * 0.24} 0 l${phoneIcon * 0.12} ${phoneIcon * 0.2} q${phoneIcon * 0.04} ${phoneIcon * 0.1} ${-phoneIcon * 0.06} ${phoneIcon * 0.16} q${phoneIcon * 0.08} ${phoneIcon * 0.24} ${phoneIcon * 0.32} ${phoneIcon * 0.32} q${phoneIcon * 0.06} ${-phoneIcon * 0.1} ${phoneIcon * 0.16} ${-phoneIcon * 0.06} l${phoneIcon * 0.2} ${phoneIcon * 0.12} q${phoneIcon * 0.12} ${phoneIcon * 0.12} 0 ${phoneIcon * 0.24} q${-phoneIcon * 0.6} ${phoneIcon * 0.28} ${-phoneIcon * 1.06} ${-phoneIcon * 0.6} q${-phoneIcon * 0.2} ${-phoneIcon * 0.3} ${-phoneIcon * 0.12} ${-phoneIcon * 0.6}Z`} fill={ctx.mono ? ctx.c1 : ctx.c2} />);
    block(ctx, hot, pad + phoneIcon * 1.3, pad, W - pad, pad + topH, H * 0.36, ts, 1, 'start');
    if (web) block(ctx, web, pad, pad + topH + H * 0.03, W - pad, H - pad, H * 0.2, body, k2);
  }
  return { W, H, items: ctx.items };
}

export function HmArtSvg(o: HmArtOpts & { style?: CSSProperties; guide?: boolean }) {
  const { W, H, items } = hmArtItems(o);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`} xmlns="http://www.w3.org/2000/svg" style={o.style} data-pos={o.pos}>
      {o.guide && <rect x={0.2} y={0.2} width={W - 0.4} height={H - 0.4} rx={3} fill="none" stroke="#FF00FF" strokeWidth={0.3} strokeDasharray="2 1.5" />}
      <g id="In">{items.map((it, i) => <g key={i} data-k={it.k}>{it.n}</g>)}</g>
    </svg>
  );
}

/** mực đang dùng trong 1 bộ decal (để kiểm số màu lụa) */
export function hmInksUsed(spec: HmSpec): number { return hmInkColors(spec).length; }

// ---------- mockup phẳng (hông + trước) ----------
export function HmMockSvg({ spec, data, logo, logoMask, idp = 'mk', style, view = 'side' }: { spec: HmSpec; data: HmData; logo?: string; logoMask?: string; idp?: string; style?: CSSProperties; view?: 'side' | 'front' }) {
  const sh = hmShell(spec.shell);
  const dark = lum(sh.hex) < 110;
  const g = `${idp}-g`;
  const three4 = spec.kind === 'three4';
  if (view === 'side') {
    const side = hmArtItems({ spec, data, pos: spec.right ? 'right' : 'left', logo, logoMask, uid: `${idp}s` });
    // nhìn hông: trán bên trái, gáy bên phải
    const rim = three4 ? 'L292 214 Q262 236 210 226 L150 222 Q90 214 64 186' : 'L290 190 Q250 208 180 206 Q100 202 64 186';
    return (
      <svg viewBox="0 0 340 260" xmlns="http://www.w3.org/2000/svg" style={style}>
        <defs>
          <radialGradient id={g} cx="40%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.22 : 0.5} /><stop offset="0.55" stopColor="#fff" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.28} /></radialGradient>
        </defs>
        <ellipse cx={176} cy={238} rx={128} ry={10} fill="#000" opacity={0.12} />
        <path d={`M64 186 Q44 104 120 62 Q190 28 258 70 Q314 110 300 ${three4 ? 214 : 190} ${rim}Z`} fill={sh.hex} />
        <path d={`M64 186 Q44 104 120 62 Q190 28 258 70 Q314 110 300 ${three4 ? 214 : 190} ${rim}Z`} fill={`url(#${g})`} />
        <path d={`M64 186 ${three4 ? 'Q90 214 150 222 L210 226 Q262 236 292 214' : 'Q100 202 180 206 Q250 208 290 190'}`} fill="none" stroke="#1A1A1C" strokeWidth={7} strokeLinecap="round" />
        {spec.visor && <path d="M66 180 Q40 182 22 196 Q46 198 70 192Z" fill="#2B2E33" opacity={0.92} />}
        <svg x={112} y={84} width={150} height={100} viewBox={`0 0 ${side.W} ${side.H}`}>{side.items.map((it, i) => <g key={i}>{it.n}</g>)}</svg>
        <path d="M120 212 Q132 236 150 246 M232 214 Q214 236 196 246" fill="none" stroke="#2A2A2C" strokeWidth={5} strokeLinecap="round" />
        <rect x={160} y={240} width={26} height={11} rx={3} fill="#2A2A2C" />
      </svg>
    );
  }
  const front = hmArtItems({ spec, data, pos: 'front', logo, logoMask, uid: `${idp}f` });
  return (
    <svg viewBox="0 0 300 240" xmlns="http://www.w3.org/2000/svg" style={style}>
      <defs><radialGradient id={g} cx="45%" cy="30%" r="75%"><stop offset="0" stopColor="#fff" stopOpacity={dark ? 0.22 : 0.5} /><stop offset="0.55" stopColor="#fff" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.28} /></radialGradient></defs>
      <ellipse cx={150} cy={222} rx={110} ry={9} fill="#000" opacity={0.12} />
      <path d={`M40 ${three4 ? 200 : 180} Q30 70 150 40 Q270 70 260 ${three4 ? 200 : 180} Q150 ${three4 ? 168 : 160} 40 ${three4 ? 200 : 180}Z`} fill={sh.hex} />
      <path d={`M40 ${three4 ? 200 : 180} Q30 70 150 40 Q270 70 260 ${three4 ? 200 : 180} Q150 ${three4 ? 168 : 160} 40 ${three4 ? 200 : 180}Z`} fill={`url(#${g})`} />
      <path d={`M40 ${three4 ? 200 : 180} Q150 ${three4 ? 168 : 160} 260 ${three4 ? 200 : 180}`} fill="none" stroke="#1A1A1C" strokeWidth={7} strokeLinecap="round" />
      {spec.visor && <path d="M70 172 Q150 150 230 172 Q150 196 70 172Z" fill="#2B2E33" opacity={0.9} />}
      <svg x={90} y={86} width={120} height={72} viewBox={`0 0 ${front.W} ${front.H}`}>{front.items.map((it, i) => <g key={i}>{it.n}</g>)}</svg>
    </svg>
  );
}

// ---------- phiếu đơn A4 ----------
export function HmSummarySvg({ spec, data, qty, logo, logoMask }: { spec: HmSpec; data: HmData; qty: number; logo?: string; logoMask?: string }) {
  const k = hmInk(spec.ink), sh = hmShell(spec.shell);
  const cols = hmInkColors(spec);
  const pos = hmPositions(spec);
  const rows: [string, string][] = [
    ['Loại mũ', `${HM_KINDS.find((x) => x.id === spec.kind)!.name}${spec.visor ? ' + lưỡi trai nhựa' : ''}`],
    ['Màu vỏ', `${sh.name} · ${spec.finish === 'gloss' ? 'bóng' : 'nhám'}`],
    ['Cách in', spec.method === 'uv' ? 'Decal in UV (đủ màu)' : `In lụa ${cols.length} màu`],
    ['Số lượng', `${qty} mũ`],
    ['Vị trí', pos.map((p) => `${HM_POS[p].name} ${HM_POS[p].w}×${HM_POS[p].h}mm`).join(' · ')],
  ];
  return (
    <svg viewBox="0 0 210 297" width="210mm" height="297mm" xmlns="http://www.w3.org/2000/svg">
      <rect width={210} height={297} fill="#fff" />
      <text x={15} y={22} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={8} fill="#16171A">PHIẾU ĐƠN — MŨ BẢO HIỂM IN LOGO</text>
      <text x={15} y={30} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={4} fill="#555">{(data.brand || '').slice(0, 60)}</text>
      {rows.map(([a, b], i) => (
        <g key={i}>
          <text x={15} y={46 + i * 9} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.6} fill="#777">{a}</text>
          <text x={55} y={46 + i * 9} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={3.6} fill="#16171A">{b}</text>
        </g>
      ))}
      <text x={15} y={96} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.6} fill="#777">Màu mực</text>
      {cols.map((c, i) => (
        <g key={i}>
          <rect x={55 + i * 48} y={92} width={6} height={6} rx={1} fill={c} stroke="#ccc" strokeWidth={0.3} />
          <text x={63 + i * 48} y={96.6} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={3.4} fill="#16171A">{k.n[i]} {c}</text>
        </g>
      ))}
      <svg x={12} y={108} width={110} height={84} viewBox="0 0 340 260"><HmMockSvg spec={spec} data={data} logo={logo} logoMask={logoMask} idp="sm1" view="side" /></svg>
      <svg x={116} y={110} width={84} height={68} viewBox="0 0 300 240"><HmMockSvg spec={spec} data={data} logo={logo} logoMask={logoMask} idp="sm2" view="front" /></svg>
      <text x={15} y={210} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={3.8} fill="#16171A">Lưu ý cho xưởng</text>
      {['Decal dán lên bề mặt CONG của vỏ mũ: xưởng xẻ rãnh/khía mép decal hông & sau gáy để không nhăn.',
        'Kích thước ghi trên là vùng in tối đa; file từng vị trí ở các trang sau, đúng kích thước thật, nền trong.',
        spec.method === 'screen' ? 'In lụa: mỗi màu mực 1 khuôn; màu mực theo bảng trên.' : 'In UV: in thẳng đủ màu lên decal trong, phủ bóng/nhám theo vỏ.',
        'Không in tên/logo thương hiệu mũ có thật khi chưa có giấy phép.'].map((t, i) => (
        <text key={i} x={15} y={218 + i * 7} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.1} fill="#444">• {t}</text>
      ))}
    </svg>
  );
}
