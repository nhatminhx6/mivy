'use client';
// Mũ lưỡi trai in / thêu logo: 1 engine SVG (mm thật) = BỐ CỤC × MÀU MŨ × BỘ CHỈ × FONT → file từng vị trí
// (mặt trước 100×55, hông 50×30, sau gáy 60×25), mockup phẳng, phiếu chỉ thêu. Render code 100%, không AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- loại mũ ----------
export type CapKind = 'dad' | 'trucker' | 'snap';
export const CAP_KINDS: { id: CapKind; name: string; note: string }[] = [
  { id: 'dad', name: 'Kaki 6 múi (mềm)', note: 'Form mềm, vành cong — đồng phục, du lịch' },
  { id: 'trucker', name: 'Trucker lưới', note: 'Mặt trước mút, sau lưới thoáng — in decal đẹp' },
  { id: 'snap', name: 'Snapback vành phẳng', note: 'Form đứng cao, vành phẳng — CLB, đội nhóm' },
];

export type CapPos = 'front' | 'left' | 'right' | 'back';
export const CAP_POS: Record<CapPos, { name: string; w: number; h: number }> = {
  front: { name: 'Mặt trước', w: 100, h: 55 },
  left: { name: 'Hông trái', w: 50, h: 30 },
  right: { name: 'Hông phải', w: 50, h: 30 },
  back: { name: 'Sau gáy', w: 60, h: 25 },
};
export const CAP_POS_LIST: CapPos[] = ['front', 'left', 'right', 'back'];

// ---------- màu mũ ----------
export interface CapColor { id: string; name: string; hex: string }
export const CAP_COLORS: CapColor[] = [
  { id: 'black', name: 'Đen', hex: '#1E1F22' },
  { id: 'white', name: 'Trắng', hex: '#F1EFEA' },
  { id: 'navy', name: 'Xanh navy', hex: '#1E2B47' },
  { id: 'khaki', name: 'Be kaki', hex: '#CDB892' },
  { id: 'grey', name: 'Xám', hex: '#8C9096' },
  { id: 'red', name: 'Đỏ', hex: '#B3262B' },
  { id: 'olive', name: 'Xanh rêu', hex: '#56603F' },
  { id: 'pink', name: 'Hồng pastel', hex: '#E9B9C2' },
  { id: 'mustard', name: 'Vàng mù tạt', hex: '#C9962F' },
  { id: 'blue', name: 'Xanh dương', hex: '#2F5EA8' },
];
export const capColor = (id: string) => CAP_COLORS.find((c) => c.id === id) || CAP_COLORS[0];

// ---------- bộ chỉ thêu / mực in (3 màu) ----------
export interface CapThread { id: string; name: string; c: [string, string, string]; n: [string, string, string] }
export const CAP_THREADS: CapThread[] = [
  { id: 'white', name: 'Trắng · vàng · đỏ', c: ['#FFFFFF', '#E9B949', '#D63A3A'], n: ['Trắng', 'Vàng nghệ', 'Đỏ tươi'] },
  { id: 'gold', name: 'Vàng kim · trắng', c: ['#D8B158', '#FFFFFF', '#8E6B2C'], n: ['Vàng kim', 'Trắng', 'Nâu đồng'] },
  { id: 'navy', name: 'Navy · đỏ · xám', c: ['#1E2B47', '#C8323A', '#8C9096'], n: ['Xanh navy', 'Đỏ đô', 'Xám bạc'] },
  { id: 'black', name: 'Đen · trắng', c: ['#16171A', '#FFFFFF', '#9A9A9A'], n: ['Đen', 'Trắng', 'Xám'] },
  { id: 'cream', name: 'Kem · cam đất', c: ['#F2E6CC', '#D9783B', '#3E2A1C'], n: ['Kem', 'Cam đất', 'Nâu cà phê'] },
  { id: 'brown', name: 'Nâu cà phê · kem', c: ['#4A2E1F', '#F2E6CC', '#B5652E'], n: ['Nâu cà phê', 'Kem', 'Nâu cam'] },
  { id: 'orange', name: 'Cam · navy', c: ['#F06A28', '#1E2B47', '#FFFFFF'], n: ['Cam', 'Xanh navy', 'Trắng'] },
  { id: 'pinkw', name: 'Trắng · hồng đậm', c: ['#FFFFFF', '#C2456A', '#7A2A42'], n: ['Trắng', 'Hồng đậm', 'Mận'] },
];
export const capThread = (id: string) => CAP_THREADS.find((t) => t.id === id) || CAP_THREADS[0];

// ---------- font (đều có TTF → outline file thêu/in) ----------
export interface CapFont { id: string; name: string; family: string; weight: number }
export const CAP_FONTS: CapFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const capFont = (id: string) => CAP_FONTS.find((f) => f.id === id) || CAP_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';
export const CAP_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Bungee&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useCapFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cap-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-cap-fonts'; link.rel = 'stylesheet';
        link.href = CAP_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CAP_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `700 40px "${SCRIPT}"`, `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec / data ----------
export type CapMethod = 'embroider' | 'print';
export interface CapSpec {
  kind: CapKind; layout: string; crown: string; visor: string; threads: string; font: string; method: CapMethod;
  left: boolean; right: boolean; back: boolean;
}
export type CapData = Record<string, string>;
export interface CapField { key: string; label: string; ph?: string }

interface LayoutDef { id: string; name: string; fields: CapField[]; sample: CapData }
const F = {
  brand: { key: 'brand', label: 'Tên thương hiệu / chữ chính' },
  sub: { key: 'sub', label: 'Dòng phụ' },
  year: { key: 'year', label: 'Năm / con số' },
  side: { key: 'side', label: 'Chữ hông mũ' },
  back: { key: 'back', label: 'Chữ sau gáy (web, hashtag)' },
};
export const CAP_LAYOUTS: LayoutDef[] = [
  { id: 'wordmark', name: 'Chữ thương hiệu', fields: [F.brand, F.sub, F.side, F.back], sample: { brand: 'AN KHANG', sub: 'TEAM 2027', side: '2027', back: 'ankhang.vn' } },
  { id: 'logo', name: 'Logo + tên', fields: [F.brand, F.sub, F.side, F.back], sample: { brand: 'An Khang Group', sub: 'Since 2015', side: 'AK', back: 'ankhang.vn' } },
  { id: 'badge', name: 'Huy hiệu CLB', fields: [F.brand, F.sub, F.side, F.back], sample: { brand: 'AN KHANG FC', sub: 'EST. 2019', side: 'AK', back: '#ankhangfc' } },
  { id: 'arc', name: 'Chữ vòm (đội nhóm)', fields: [F.brand, F.year, F.side, F.back], sample: { brand: 'GIA KHÁNH', year: '2027', side: 'TEAM', back: 'TEAM BUILDING' } },
  { id: 'run', name: 'Chạy bộ / sự kiện', fields: [F.brand, F.sub, F.year, F.side, F.back], sample: { brand: 'SÀI GÒN NIGHT RUN', sub: '21K', year: '2027', side: 'FINISHER', back: '#saigonnightrun' } },
  { id: 'cafe', name: 'Quán cà phê', fields: [F.brand, F.sub, F.side, F.back], sample: { brand: 'Mộc Coffee', sub: 'COFFEE & TEA', side: 'MỘC', back: 'mockcoffee.vn' } },
  { id: 'travel', name: 'Du lịch', fields: [F.brand, F.sub, F.side, F.back], sample: { brand: 'ĐÀ LẠT', sub: '1500M · 2027', side: 'VIỆT NAM', back: 'Gia đình Thu Hà' } },
  { id: 'patch', name: 'Patch chữ nhật', fields: [F.brand, F.sub, F.side, F.back], sample: { brand: 'QUỐC BẢO', sub: 'GARAGE · EST 2020', side: 'QB', back: 'quocbao.vn' } },
];
export const capLayout = (id: string) => CAP_LAYOUTS.find((l) => l.id === id) || CAP_LAYOUTS[0];
export const defaultCapData = (layout = 'wordmark'): CapData => ({ ...capLayout(layout).sample });

export interface CapTemplate { id: string; name: string; spec: Omit<CapSpec, 'method'> & { method: CapMethod } }
const T = (id: string, name: string, s: Partial<CapSpec> & Pick<CapSpec, 'kind' | 'layout' | 'crown' | 'visor' | 'threads' | 'font'>): CapTemplate =>
  ({ id, name, spec: { method: 'embroider', left: false, right: false, back: false, ...s } });
export const CAP_TEMPLATES: CapTemplate[] = [
  T('wm-navy', 'Đồng phục navy', { kind: 'dad', layout: 'wordmark', crown: 'navy', visor: 'navy', threads: 'white', font: 'montserrat', left: true, back: true }),
  T('logo-white', 'Logo công ty trắng', { kind: 'dad', layout: 'logo', crown: 'white', visor: 'white', threads: 'navy', font: 'montserrat', back: true }),
  T('badge-black', 'Huy hiệu CLB đen', { kind: 'snap', layout: 'badge', crown: 'black', visor: 'black', threads: 'gold', font: 'oswald', left: true }),
  T('arc-red', 'Đội nhóm chữ vòm', { kind: 'snap', layout: 'arc', crown: 'red', visor: 'black', threads: 'white', font: 'bungee', right: true, back: true }),
  T('run-white', 'Chạy bộ 21K', { kind: 'dad', layout: 'run', crown: 'white', visor: 'white', threads: 'orange', font: 'oswald', left: true, back: true }),
  T('cafe-khaki', 'Quán cà phê', { kind: 'dad', layout: 'cafe', crown: 'khaki', visor: 'khaki', threads: 'brown', font: 'montserrat', back: true }),
  T('travel-olive', 'Du lịch Đà Lạt', { kind: 'dad', layout: 'travel', crown: 'olive', visor: 'olive', threads: 'cream', font: 'oswald', left: true }),
  T('patch-trucker', 'Trucker patch', { kind: 'trucker', layout: 'patch', crown: 'black', visor: 'black', threads: 'cream', font: 'oswald', method: 'print', back: true }),
  T('wm-trucker', 'Trucker in màu', { kind: 'trucker', layout: 'wordmark', crown: 'white', visor: 'navy', threads: 'navy', font: 'bungee', method: 'print', left: true }),
  T('logo-grey', 'Snapback tối giản', { kind: 'snap', layout: 'logo', crown: 'grey', visor: 'grey', threads: 'black', font: 'montserrat', back: true }),
  T('arc-blue', 'Team building', { kind: 'dad', layout: 'arc', crown: 'blue', visor: 'blue', threads: 'white', font: 'baloo', left: true, back: true }),
  T('wm-pink', 'Hồng pastel', { kind: 'dad', layout: 'cafe', crown: 'pink', visor: 'pink', threads: 'pinkw', font: 'playfair', right: true }),
];

export const capPositions = (spec: CapSpec): CapPos[] => ['front' as CapPos, ...(spec.left ? ['left' as CapPos] : []), ...(spec.right ? ['right' as CapPos] : []), ...(spec.back ? ['back' as CapPos] : [])];

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, ts: TS): number {
  if (typeof document === 'undefined') return t.length * size * 0.6;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return t.length * size * 0.6;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  const n = [...t].length;
  return (mctx.measureText(t).width / 100) * size + (ts.ls || 0) * size * Math.max(0, n - 1);
}
const charW = (ch: string, size: number, ts: TS) => textW(ch, size, { ...ts, ls: 0 });
/** cỡ chữ lớn nhất ≤ size để vừa maxW */
function fit(t: string, maxW: number, size: number, ts: TS): number {
  const w = textW(t, size, ts);
  return w > maxW ? (size * maxW) / w : size;
}
const fmCache = new Map<string, { asc: number; desc: number }>();
/** hộp chữ của font (khớp getBBox) — tỉ lệ theo cỡ chữ */
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
/** chân chữ sát đáy khung (chừa đường xuống) / sát đỉnh khung (chừa đường lên) */
const baseBottom = (H: number, s: number, ts: TS, pad = 0.4) => H - fm(ts).desc * s - pad;
const baseTop = (s: number, ts: TS, pad = 0.4) => fm(ts).asc * s + pad;
/** cỡ chữ tối đa để hộp chữ cao ≤ h */
const fitH = (size: number, h: number, ts: TS) => Math.min(size, h / (fm(ts).asc + fm(ts).desc));
const ascOf = (fam: string) => (fam === 'Bungee' ? 0.78 : fam === 'Oswald' ? 0.82 : fam === SCRIPT ? 0.7 : 0.74);

export interface CapItem { n: ReactNode; k: number; ts?: number } // k = số chỉ/mực (1..3, 0 = ảnh logo nhiều màu); ts = cỡ chữ (mm)
interface Ctx {
  W: number; H: number; data: CapData; d: TS; c: (k: number) => string; logo?: string; logoFilter?: string;
  items: CapItem[]; uid: string;
}

function txt(ctx: Ctx, t: string, x: number, y: number, size: number, ts: TS, k: number, anchor: 'start' | 'middle' | 'end' = 'middle', extra: Record<string, unknown> = {}) {
  if (!t) return;
  ctx.items.push({
    k, ts: size,
    n: <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size} fill={ctx.c(k)} textAnchor={anchor}
      letterSpacing={ts.ls ? ts.ls * size : undefined} {...extra}>{t}</text>,
  });
}
/** chữ chạy cung tròn: mỗi ký tự 1 <text> xoay → outline được */
function arcText(ctx: Ctx, t: string, cx: number, cy: number, r: number, size: number, ts: TS, k: number, top = true, maxDeg = 160) {
  const chars = [...t];
  if (!chars.length) return;
  const gap = size * 0.08;
  let widths = chars.map((ch) => charW(ch, size, ts) + gap);
  let total = widths.reduce((a, b) => a + b, 0);
  let s = size;
  const maxLen = (maxDeg / 180) * Math.PI * r;
  if (total > maxLen) { s = (size * maxLen) / total; widths = chars.map((ch) => charW(ch, s, ts) + gap * (s / size)); total = maxLen; }
  let acc = -total / 2;
  chars.forEach((ch, i) => {
    const mid = acc + widths[i] / 2; acc += widths[i];
    if (!ch.trim()) return;
    const a = mid / r; // rad, 0 = đỉnh (trên) / đáy (dưới)
    // đường chân chữ lệch nửa cỡ chữ để tâm chữ nằm đúng bán kính r
    const rb = top ? r - s * 0.34 : r + s * 0.34;
    const x = cx + Math.sin(a) * rb, y = top ? cy - Math.cos(a) * rb : cy + Math.cos(a) * rb;
    const rot = ((top ? a : -a) * 180) / Math.PI;
    ctx.items.push({
      k, ts: s,
      n: <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={s} fill={ctx.c(k)} textAnchor="middle"
        transform={`rotate(${rot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}>{ch}</text>,
    });
  });
}
const shape = (ctx: Ctx, n: ReactNode, k: number) => ctx.items.push({ n, k });
const initials = (s: string) => {
  const w = (s || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w[0][0] + w[1][0] : (w[0] || 'M').slice(0, 2)).toUpperCase();
};
function logoOrMono(ctx: Ctx, x: number, y: number, w: number, h: number, k = 1) {
  if (ctx.logo) {
    ctx.items.push({ k: ctx.logoFilter ? k : 0, n: <image href={ctx.logo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" filter={ctx.logoFilter} /> });
    return;
  }
  const r = Math.min(w, h) / 2, cx = x + w / 2, cy = y + h / 2;
  shape(ctx, <circle cx={cx} cy={cy} r={r - 0.8} fill="none" stroke={ctx.c(k)} strokeWidth={1.4} />, k);
  const mono = initials(ctx.data.brand || '');
  const s = fit(mono, r * 1.35, r * 1.05, ctx.d);
  txt(ctx, mono, cx, cy + s * ascOf(ctx.d.fam) / 2, s, ctx.d, k);
}

// biểu tượng vẽ code (đơn vị mm, toạ độ tâm)
const cupIcon = (x: number, y: number, s: number, col: string) => (
  <g transform={`translate(${x} ${y}) scale(${s / 20})`} fill="none" stroke={col} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M-7 -2 h12 v7 a6 6 0 0 1 -6 6 h0 a6 6 0 0 1 -6 -6 z" fill={col} stroke="none" />
    <path d="M5 0 h2 a3 3 0 0 1 0 6 h-2" />
    <path d="M-3 -10 q-2 2 0 4 t0 4 M1 -10 q-2 2 0 4 t0 4" />
    <path d="M-9 12 h16" />
  </g>
);
const mountain = (x: number, y: number, w: number, c1: string, c2: string) => (
  <g transform={`translate(${x} ${y})`}>
    <circle cx={w * 0.18} cy={-w * 0.34} r={w * 0.11} fill={c2} />
    <path d={`M${-w / 2} 0 L${-w * 0.16} ${-w * 0.42} L${w * 0.02} ${-w * 0.2} L${w * 0.2} ${-w * 0.36} L${w / 2} 0 Z`} fill={c1} />
    <path d={`M${-w * 0.16} ${-w * 0.42} L${-w * 0.08} ${-w * 0.31} L${-w * 0.2} ${-w * 0.36} Z`} fill={c2} />
  </g>
);
const star = (x: number, y: number, r: number, col: string) => {
  const p = Array.from({ length: 10 }, (_, i) => { const a = (i * Math.PI) / 5 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; return `${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`; }).join(' ');
  return <polygon points={p} fill={col} />;
};
const runner = (x: number, y: number, s: number, col: string) => (
  <g transform={`translate(${x} ${y}) scale(${s / 20})`} fill={col}>
    <circle cx={3} cy={-9} r={2.4} />
    <path d="M1 -6 L-3 1 L1 2 L-1 8 L1.5 8.5 L4 2 L1.5 0 L3.5 -3 L6 0 L8 -1 L4.5 -5.5 Z" />
    <path d="M-3 1 L-7 3 L-6 4.6 L-1.5 3 Z" />
    <path d="M1 -6 L-4 -4 L-5 -1 L-3.5 -0.5 L-2.5 -3 L0.5 -4 Z" />
  </g>
);

// ---------- vẽ từng bố cục ----------
type Draw = (ctx: Ctx) => void;
const FRONT: Record<string, Draw> = {
  wordmark: (ctx) => {
    const { W, H, data, d } = ctx;
    const s = fit(data.brand || '', W * 0.92, 21, d);
    txt(ctx, data.brand || '', W / 2, H * 0.5 + (s * ascOf(d.fam)) / 2 - 3, s, d, 1);
    const sub = (data.sub || '').toUpperCase();
    const bs: TS = { fam: BODY, wt: 800, ls: 0.22 };
    const ss = fit(sub, W * 0.7, 6.4, bs);
    const yb = H * 0.5 + (s * ascOf(d.fam)) / 2 - 3;
    if (sub) {
      txt(ctx, sub, W / 2, yb + ss * 1.75, ss, bs, 2);
      const tw = textW(sub, ss, bs);
      shape(ctx, <line x1={W / 2 - tw / 2 - 9} y1={yb + ss * 1.38} x2={W / 2 - tw / 2 - 2.5} y2={yb + ss * 1.38} stroke={ctx.c(2)} strokeWidth={1.1} />, 2);
      shape(ctx, <line x1={W / 2 + tw / 2 + 2.5} y1={yb + ss * 1.38} x2={W / 2 + tw / 2 + 9} y2={yb + ss * 1.38} stroke={ctx.c(2)} strokeWidth={1.1} />, 2);
    }
  },
  logo: (ctx) => {
    const { W, H, data } = ctx;
    logoOrMono(ctx, W / 2 - 17, 2, 34, 34, 1);
    const bs: TS = { fam: BODY, wt: 800, ls: 0.12 };
    const b = (data.brand || '').toUpperCase();
    const s = fit(b, W * 0.9, 7.5, bs);
    txt(ctx, b, W / 2, 36 + s * 0.78 + 3, s, bs, 1);
    const sub = data.sub || '';
    const ss = fit(sub, W * 0.6, 4.6, { fam: BODY, wt: 600 });
    if (sub) txt(ctx, sub, W / 2, baseBottom(H, ss, { fam: BODY, wt: 600 }, 0.2), ss, { fam: BODY, wt: 600 }, 2);
  },
  badge: (ctx) => {
    const { W, H, data, d } = ctx;
    const cx = W / 2, cy = H / 2, R = H / 2 - 1;
    shape(ctx, <circle cx={cx} cy={cy} r={R - 0.8} fill="none" stroke={ctx.c(1)} strokeWidth={1.6} />, 1);
    shape(ctx, <circle cx={cx} cy={cy} r={R - 9.6} fill="none" stroke={ctx.c(1)} strokeWidth={1.1} />, 1);
    const bs: TS = { fam: BODY, wt: 800, ls: 0 };
    arcText(ctx, (data.brand || '').toUpperCase(), cx, cy, R - 5.2, 5.6, bs, 2, true, 150);
    arcText(ctx, (data.sub || '').toUpperCase(), cx, cy, R - 5.2, 4.4, bs, 2, false, 90);
    shape(ctx, star(cx - R + 5.2, cy, 1.6, ctx.c(1)), 1);
    shape(ctx, star(cx + R - 5.2, cy, 1.6, ctx.c(1)), 1);
    const mono = initials(data.brand || '');
    const ms = fit(mono, (R - 10) * 1.5, 17, d);
    txt(ctx, mono, cx, cy + (ms * ascOf(d.fam)) / 2, ms, d, 1);
  },
  arc: (ctx) => {
    const { W, H, data, d } = ctx;
    const b = (data.brand || '').toUpperCase();
    // chữ vòm kiểu varsity: cung lớn, tâm dưới khung
    const r = 95;
    arcText(ctx, b, W / 2, 30 + r, r, 15, d, 1, true, 54);
    const y = (data.year || '').toUpperCase();
    const ys = fitH(fit(y, W * 0.4, 12, d), 16, d);
    const yb = baseBottom(H, ys, d);
    if (y) txt(ctx, y, W / 2, yb, ys, d, 2);
    if (y) {
      const tw = textW(y, ys, d);
      shape(ctx, star(W / 2 - tw / 2 - 6, yb - ys * 0.36, 2.2, ctx.c(2)), 2);
      shape(ctx, star(W / 2 + tw / 2 + 6, yb - ys * 0.36, 2.2, ctx.c(2)), 2);
    }
  },
  run: (ctx) => {
    const { W, H, data, d } = ctx;
    const bs: TS = { fam: BODY, wt: 800, ls: 0.14 };
    const b = (data.brand || '').toUpperCase();
    const s1 = fit(b, W * 0.94, 6, bs);
    txt(ctx, b, W / 2, baseTop(s1, bs), s1, bs, 2);
    const big = (data.sub || '').toUpperCase();
    const bigS = fitH(fit(big, W * 0.55, 30, d), 34, d);
    const yBig = 9.5 + fm(d).asc * bigS;
    txt(ctx, big, W / 2 + 7, yBig, bigS, d, 1);
    const tw = textW(big, bigS, d);
    shape(ctx, runner(W / 2 + 7 - tw / 2 - 10, yBig - bigS * 0.36, Math.min(18, bigS * 0.8), ctx.c(2)), 2);
    const yr = data.year || '';
    const ys = fit(yr, W * 0.5, 6, bs);
    const yy = baseBottom(H, ys, bs, 1);
    if (yr) {
      shape(ctx, <line x1={W * 0.18} y1={yy - ys * 0.36} x2={W / 2 - textW(yr, ys, bs) / 2 - 3} y2={yy - ys * 0.36} stroke={ctx.c(2)} strokeWidth={1} />, 2);
      shape(ctx, <line x1={W / 2 + textW(yr, ys, bs) / 2 + 3} y1={yy - ys * 0.36} x2={W * 0.82} y2={yy - ys * 0.36} stroke={ctx.c(2)} strokeWidth={1} />, 2);
      txt(ctx, yr, W / 2, yy, ys, bs, 2);
    }
  },
  cafe: (ctx) => {
    const { W, H, data } = ctx;
    const sc: TS = { fam: SCRIPT, wt: 700 };
    shape(ctx, cupIcon(W / 2, 11, 17, ctx.c(3)), 3);
    const b = data.brand || '';
    const s = fit(b, W * 0.92, 17, sc);
    txt(ctx, b, W / 2, 24 + s * 0.72, s, sc, 1);
    const bs: TS = { fam: BODY, wt: 800, ls: 0.3 };
    const sub = (data.sub || '').toUpperCase();
    const ss = fit(sub, W * 0.7, 4.4, bs);
    if (sub) txt(ctx, sub, W / 2, baseBottom(H, ss, bs, 0.3), ss, bs, 3);
  },
  travel: (ctx) => {
    const { W, H, data, d } = ctx;
    shape(ctx, mountain(W / 2, 20, 34, ctx.c(1), ctx.c(2)), 1);
    const b = (data.brand || '').toUpperCase();
    const s = fit(b, W * 0.9, 16, d);
    txt(ctx, b, W / 2, 21.5 + s * ascOf(d.fam) + 1.5, s, d, 1);
    const bs: TS = { fam: BODY, wt: 800, ls: 0.24 };
    const sub = (data.sub || '').toUpperCase();
    const ss = fit(sub, W * 0.8, 4.8, bs);
    if (sub) txt(ctx, sub, W / 2, baseBottom(H, ss, bs, 0.3), ss, bs, 2);
  },
  patch: (ctx) => {
    const { W, H, data, d } = ctx;
    const pw = W * 0.86, ph = H * 0.78, x = (W - pw) / 2, y = (H - ph) / 2;
    shape(ctx, <rect x={x} y={y} width={pw} height={ph} rx={4} fill={ctx.c(1)} />, 1);
    shape(ctx, <rect x={x + 2} y={y + 2} width={pw - 4} height={ph - 4} rx={2.6} fill="none" stroke={ctx.c(3)} strokeWidth={0.9} strokeDasharray="1.6 1.1" />, 3);
    const b = (data.brand || '').toUpperCase();
    const s = fit(b, pw - 12, 15, d);
    txt(ctx, b, W / 2, y + ph * 0.52 + (s * ascOf(d.fam)) / 2 - 2, s, d, 2);
    const bs: TS = { fam: BODY, wt: 800, ls: 0.2 };
    const sub = (data.sub || '').toUpperCase();
    const ss = fit(sub, pw - 14, 4.2, bs);
    if (sub) txt(ctx, sub, W / 2, y + ph - 5, ss, bs, 3);
  },
};
const SIDE: Draw = (ctx) => {
  const { W, H, data, d } = ctx;
  const t = data.side || '';
  const s = fitH(fit(t, W * 0.92, 13, d), H - 1, d);
  txt(ctx, t, W / 2, H / 2 + ((fm(d).asc - fm(d).desc) * s) / 2, s, d, 2);
};
const BACK: Draw = (ctx) => {
  const { W, H, data } = ctx;
  const bs: TS = { fam: BODY, wt: 800, ls: 0.06 };
  const t = data.back || '';
  const s = fitH(fit(t, W * 0.94, 7.5, bs), H - 1, bs);
  txt(ctx, t, W / 2, H / 2 + ((fm(bs).asc - fm(bs).desc) * s) / 2, s, bs, 1);
};

/** dựng danh sách phần tử của 1 vị trí (dùng chung: vẽ SVG + đếm màu chỉ + cảnh báo chữ nhỏ) */
export function capItems(spec: CapSpec, data: CapData, pos: CapPos, opt: { logo?: string; uid?: string; sep?: boolean } = {}): CapItem[] {
  const P = CAP_POS[pos];
  const th = capThread(spec.threads).c;
  const f = capFont(spec.font);
  const uid = (opt.uid || `${pos}-${spec.layout}`).replace(/[^\w-]/g, '');
  const ctx: Ctx = {
    W: P.w, H: P.h, data, d: { fam: f.family, wt: f.weight }, c: (k) => th[Math.max(1, k) - 1], items: [], uid,
    logo: opt.logo, logoFilter: opt.logo && spec.method === 'embroider' ? `url(#caplogo-${uid})` : undefined,
  };
  if (pos === 'front') (FRONT[spec.layout] || FRONT.wordmark)(ctx);
  else if (pos === 'back') BACK(ctx);
  else SIDE(ctx);
  return ctx.items;
}
/** số màu chỉ dùng (thêu ≤ 6) */
export function capThreadsUsed(spec: CapSpec, data: CapData, logo?: string): number[] {
  const ks = new Set<number>();
  for (const p of capPositions(spec)) for (const it of capItems(spec, data, p, { logo })) if (it.k > 0) ks.add(it.k);
  return [...ks].sort();
}
/** cảnh báo thêu: chữ cao dưới ~4mm sẽ nhoè/dính nét */
export function capWarnings(spec: CapSpec, data: CapData, logo?: string): string[] {
  if (spec.method !== 'embroider') return [];
  const out: string[] = [];
  for (const p of capPositions(spec)) {
    const sizes = capItems(spec, data, p, { logo }).map((it) => it.ts || 99);
    const min = Math.min(...sizes);
    if (min < 5.2) out.push(`${CAP_POS[p].name}: có chữ chỉ cao ~${(min * 0.72).toFixed(1)}mm — thêu dưới 4mm dễ nhoè, nên rút gọn chữ.`);
  }
  if (logo) out.push('Logo ảnh khi thêu được chuyển 1 màu chỉ; chi tiết nhỏ hơn 1mm sẽ bị lược bớt khi lên chương trình thêu.');
  return out;
}

/** 1 vị trí: viewBox mm thật, nền trong. stitch = xem trước vân chỉ thêu (mockup/3D), file in thì không. */
export function CapArtSvg({ spec, data, pos, logo, stitch, style, box, uid: uid0 }: {
  spec: CapSpec; data: CapData; pos: CapPos; logo?: string; stitch?: boolean; style?: CSSProperties;
  box?: { x: number; y: number; w: number; h: number }; uid?: string;
}) {
  const P = CAP_POS[pos];
  const uid = `${uid0 || 'p'}-${pos}-${spec.layout}-${spec.threads}-${stitch ? 's' : 'f'}`.replace(/[^\w-]/g, '');
  const items = capItems(spec, data, pos, { logo, uid });
  const art = items.map((it, i) => <g key={i} data-thread={it.k}>{it.n}</g>);
  const th = capThread(spec.threads).c;
  const sid = `capst-${uid}`;
  const placed = box ? { x: box.x, y: box.y, width: box.w, height: box.h } : {};
  const embroider = spec.method === 'embroider';
  return (
    <svg viewBox={`0 0 ${P.w} ${P.h}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-pos={pos} {...placed}>
      {logo && embroider && (
        <defs>
          <filter id={`caplogo-${uid}`} colorInterpolationFilters="sRGB" x="-2%" y="-2%" width="104%" height="104%">
            <feFlood floodColor="#ffffff" result="w" />
            <feComposite in="SourceGraphic" in2="w" operator="over" result="flat" />
            <feColorMatrix in="flat" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 1" result="a" />
            <feComponentTransfer in="a" result="b"><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
            <feFlood floodColor={th[0]} result="ink" />
            <feComposite in="ink" in2="b" operator="in" />
          </filter>
        </defs>
      )}
      {stitch && embroider ? (
        <g data-stitch="1">
          <defs>
            <pattern id={`${sid}-p`} width={0.9} height={0.9} patternUnits="userSpaceOnUse" patternTransform="rotate(40)">
              <rect width={0.9} height={0.42} fill="#000" opacity={0.26} />
              <rect y={0.42} width={0.9} height={0.1} fill="#fff" opacity={0.4} />
            </pattern>
            <filter id={`${sid}-w`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
            <mask id={`${sid}-m`} maskUnits="userSpaceOnUse" x={0} y={0} width={P.w} height={P.h}><g filter={`url(#${sid}-w)`}>{art}</g></mask>
            <filter id={`${sid}-d`} x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx={0.2} dy={0.3} stdDeviation={0.25} floodColor="#000" floodOpacity={0.45} /></filter>
          </defs>
          <g filter={`url(#${sid}-d)`}>{art}</g>
          <rect x={0} y={0} width={P.w} height={P.h} fill={`url(#${sid}-p)`} mask={`url(#${sid}-m)`} />
        </g>
      ) : art}
    </svg>
  );
}

// ---------- mockup phẳng (mặt trước / mặt sau) ----------
const shade = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  const o = v.map((x) => Math.max(0, Math.min(255, Math.round(k >= 0 ? x + (255 - x) * k : x * (1 + k)))));
  return `#${o.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};
export const capShade = shade;

export function CapMockSvg({ spec, data, side = 'front', logo, style, idp = 'm', box }: { spec: CapSpec; data: CapData; side?: 'front' | 'back'; logo?: string; style?: CSSProperties; idp?: string; box?: { x: number; y: number; w: number; h: number } }) {
  const crown = capColor(spec.crown).hex, visor = capColor(spec.visor).hex;
  const trucker = spec.kind === 'trucker', snap = spec.kind === 'snap';
  const backCol = trucker ? visor : crown;
  const Hc = snap ? 146 : trucker ? 140 : 132; // cao chóp
  const by = 190, cx = 160, hw = 104; // đáy mũ y, tâm, nửa rộng
  const crownPath = `M${cx - hw} ${by} C ${cx - hw} ${by - Hc * 0.75}, ${cx - hw * 0.62} ${by - Hc}, ${cx} ${by - Hc} C ${cx + hw * 0.62} ${by - Hc}, ${cx + hw} ${by - Hc * 0.75}, ${cx + hw} ${by} Z`;
  const uid = `mk${idp}-${side}-${spec.layout}-${spec.kind}-${spec.crown}-${spec.visor}-${spec.threads}-${spec.method}`.replace(/[^\w-]/g, '');
  const P = CAP_POS.front, B = CAP_POS.back, Sd = CAP_POS.left;
  return (
    <svg viewBox="0 0 320 260" xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" {...(box ? { x: box.x, y: box.y, width: box.w, height: box.h } : {})}>
      <defs>
        <clipPath id={`${uid}-c`}><path d={crownPath} /></clipPath>
        <radialGradient id={`${uid}-g`} cx="0.42" cy="0.28" r="0.85"><stop offset="0" stopColor="#fff" stopOpacity={0.18} /><stop offset="0.6" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.28} /></radialGradient>
        <linearGradient id={`${uid}-v`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff" stopOpacity={0.16} /><stop offset="1" stopColor="#000" stopOpacity={0.22} /></linearGradient>
        <pattern id={`${uid}-mesh`} width={4} height={4} patternUnits="userSpaceOnUse"><rect width={4} height={4} fill={backCol} /><circle cx={2} cy={2} r={1.15} fill="#000" opacity={0.45} /></pattern>
      </defs>
      <ellipse cx={cx} cy={by + 58} rx={120} ry={7} fill="#000" opacity={0.08} />
      {side === 'front' ? (
        <>
          <path d={crownPath} fill={crown} />
          <g clipPath={`url(#${uid}-c)`}>
            {!trucker && <line x1={cx} y1={by - Hc} x2={cx} y2={by} stroke={shade(crown, -0.25)} strokeWidth={1.2} />}
            {trucker && <>
              <path d={`M${cx - hw} ${by} C ${cx - hw} ${by - Hc * 0.75}, ${cx - hw * 0.8} ${by - Hc * 0.93}, ${cx - hw * 0.62} ${by - Hc * 0.97} L ${cx - hw * 0.72} ${by} Z`} fill={`url(#${uid}-mesh)`} />
              <path d={`M${cx + hw} ${by} C ${cx + hw} ${by - Hc * 0.75}, ${cx + hw * 0.8} ${by - Hc * 0.93}, ${cx + hw * 0.62} ${by - Hc * 0.97} L ${cx + hw * 0.72} ${by} Z`} fill={`url(#${uid}-mesh)`} />
            </>}
            <path d={`M${cx - hw * 0.62} ${by - Hc * 0.98} Q ${cx - hw * 0.78} ${by - Hc * 0.4} ${cx - hw * 0.72} ${by}`} stroke={shade(crown, -0.25)} strokeWidth={1} fill="none" />
            <path d={`M${cx + hw * 0.62} ${by - Hc * 0.98} Q ${cx + hw * 0.78} ${by - Hc * 0.4} ${cx + hw * 0.72} ${by}`} stroke={shade(crown, -0.25)} strokeWidth={1} fill="none" />
            <rect x={0} y={0} width={320} height={260} fill={`url(#${uid}-g)`} />
          </g>
          <ellipse cx={cx} cy={by - Hc + 1} rx={6} ry={2.6} fill={shade(crown, -0.12)} />
          <CapArtSvg spec={spec} data={data} pos="front" logo={logo} stitch uid={uid} box={{ x: cx - P.w / 2, y: by - 14 - P.h, w: P.w, h: P.h }} />
          {/* vành: nhìn chính diện thấy mặt trên cong xuống */}
          <path d={`M${cx - hw - 6} ${by + 4} Q ${cx} ${by - 10} ${cx + hw + 6} ${by + 4} Q ${cx + hw - 4} ${by + (snap ? 30 : 44)} ${cx} ${by + (snap ? 36 : 52)} Q ${cx - hw + 4} ${by + (snap ? 30 : 44)} ${cx - hw - 6} ${by + 4} Z`} fill={visor} />
          <path d={`M${cx - hw - 6} ${by + 4} Q ${cx} ${by - 10} ${cx + hw + 6} ${by + 4} Q ${cx + hw - 4} ${by + (snap ? 30 : 44)} ${cx} ${by + (snap ? 36 : 52)} Q ${cx - hw + 4} ${by + (snap ? 30 : 44)} ${cx - hw - 6} ${by + 4} Z`} fill={`url(#${uid}-v)`} />
          <path d={`M${cx - hw - 6} ${by + 4} Q ${cx - hw + 4} ${by + (snap ? 30 : 44)} ${cx} ${by + (snap ? 36 : 52)} Q ${cx + hw - 4} ${by + (snap ? 30 : 44)} ${cx + hw + 6} ${by + 4}`} fill="none" stroke={shade(visor, -0.45)} strokeWidth={3.2} />
          {[0.86, 0.72, 0.58].map((k, i) => (
            <path key={i} d={`M${cx - hw * k} ${by + 6 + (1 - k) * 26} Q ${cx} ${by + (snap ? 30 : 44) * k + 6} ${cx + hw * k} ${by + 6 + (1 - k) * 26}`} fill="none" stroke={shade(visor, -0.3)} strokeWidth={0.7} strokeDasharray="2 1.4" opacity={0.75} />
          ))}
          <path d={`M${cx - hw - 6} ${by + 4} Q ${cx} ${by - 10} ${cx + hw + 6} ${by + 4}`} fill="none" stroke={shade(crown, -0.35)} strokeWidth={1.6} />
          {spec.left && <CapArtSvg spec={spec} data={data} pos="left" logo={logo} stitch uid={uid} box={{ x: cx + hw * 0.7 - 2, y: by - 34, w: Sd.w * 0.36, h: Sd.h * 0.36 }} />}
          {spec.right && <CapArtSvg spec={spec} data={data} pos="right" logo={logo} stitch uid={uid} box={{ x: cx - hw * 0.7 - Sd.w * 0.36 + 2, y: by - 34, w: Sd.w * 0.36, h: Sd.h * 0.36 }} />}
        </>
      ) : (
        <>
          <path d={crownPath} fill={trucker ? `url(#${uid}-mesh)` : backCol} />
          <g clipPath={`url(#${uid}-c)`}>
            <line x1={cx} y1={by - Hc} x2={cx} y2={by - 48} stroke={shade(backCol, -0.3)} strokeWidth={1.2} />
            <path d={`M${cx - hw * 0.62} ${by - Hc * 0.98} Q ${cx - hw * 0.78} ${by - Hc * 0.4} ${cx - hw * 0.72} ${by}`} stroke={shade(backCol, -0.3)} strokeWidth={1} fill="none" />
            <path d={`M${cx + hw * 0.62} ${by - Hc * 0.98} Q ${cx + hw * 0.78} ${by - Hc * 0.4} ${cx + hw * 0.72} ${by}`} stroke={shade(backCol, -0.3)} strokeWidth={1} fill="none" />
            <rect x={0} y={0} width={320} height={260} fill={`url(#${uid}-g)`} />
          </g>
          <ellipse cx={cx} cy={by - Hc + 1} rx={6} ry={2.6} fill={shade(crown, -0.12)} />
          {/* lỗ sau + dây khoá */}
          <path d={`M${cx - 34} ${by} Q ${cx - 34} ${by - 44} ${cx} ${by - 46} Q ${cx + 34} ${by - 44} ${cx + 34} ${by} Z`} fill="#2a2724" />
          <path d={`M${cx - 34} ${by} Q ${cx - 34} ${by - 44} ${cx} ${by - 46} Q ${cx + 34} ${by - 44} ${cx + 34} ${by}`} fill="none" stroke={shade(backCol, -0.35)} strokeWidth={2.4} />
          <rect x={cx - 40} y={by - 16} width={80} height={10} rx={3} fill={spec.kind === 'dad' ? shade(crown, -0.08) : '#1c1c1e'} />
          {spec.kind === 'dad'
            ? <rect x={cx + 12} y={by - 18} width={12} height={14} rx={1.5} fill="#c9c3b6" stroke="#8a857a" strokeWidth={0.6} />
            : Array.from({ length: 7 }, (_, i) => <circle key={i} cx={cx - 30 + i * 8} cy={by - 11} r={1.7} fill="#555" />)}
          {spec.back && <CapArtSvg spec={spec} data={data} pos="back" logo={logo} stitch uid={uid} box={{ x: cx - B.w / 2, y: by - 50 - B.h - 2, w: B.w, h: B.h }} />}
        </>
      )}
    </svg>
  );
}

// ---------- phiếu đơn (A4, mm): loại mũ, màu, cách làm, vị trí, bảng chỉ ----------
export function CapSummarySvg({ spec, data, qty, logo }: { spec: CapSpec; data: CapData; qty: number; logo?: string }) {
  const W = 210, H = 297;
  const kind = CAP_KINDS.find((k) => k.id === spec.kind)!;
  const th = capThread(spec.threads);
  const used = capThreadsUsed(spec, data, logo);
  const pos = capPositions(spec);
  const t = (x: number, y: number, s: string, size = 4, wt = 600, fill = '#1C1C1C', anchor: 'start' | 'middle' | 'end' = 'start') =>
    <text x={x} y={y} fontFamily={`"${BODY}"`} fontWeight={wt} fontSize={size} fill={fill} textAnchor={anchor}>{s}</text>;
  let y = 54;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" data-role-summary="1">
      <rect width={W} height={H} fill="#ffffff" />
      {t(16, 24, 'PHIẾU ĐẶT MŨ LƯỠI TRAI', 7.5, 800)}
      {t(16, 32, `${data.brand || ''} · ${qty} mũ`, 4.4, 600, '#555')}
      <line x1={16} y1={38} x2={W - 16} y2={38} stroke="#ddd" strokeWidth={0.4} />
      {t(16, 48, `Loại mũ: ${kind.name}`, 4.2, 800)}
      {[[`Màu ${spec.kind === 'trucker' ? 'mặt trước' : 'chóp'}`, capColor(spec.crown)], [spec.kind === 'trucker' ? 'Màu lưới + vành' : 'Màu vành', capColor(spec.visor)]].map(([lab, c], i) => {
        const cc = c as CapColor;
        return (
          <g key={i}>
            <rect x={16 + i * 90} y={y - 4} width={6} height={6} rx={1} fill={cc.hex} stroke="#999" strokeWidth={0.3} />
            {t(25 + i * 90, y + 1, `${lab as string}: ${cc.name} (${cc.hex})`, 3.6)}
          </g>
        );
      })}
      {t(16, (y += 10), `Cách làm: ${spec.method === 'embroider' ? 'Thêu vi tính' : 'In chuyển nhiệt / decal'} · ${used.length} màu ${spec.method === 'embroider' ? 'chỉ' : 'chính'}`, 3.8, 600)}
      {t(16, (y += 12), 'VỊ TRÍ', 4.2, 800)}
      {pos.map((p) => {
        const P = CAP_POS[p];
        y += 7;
        return <g key={p}>{t(20, y, `• ${P.name}: khung tối đa ${P.w} × ${P.h} mm`, 3.6)}</g>;
      })}
      {t(16, (y += 12), spec.method === 'embroider' ? 'BẢNG MÀU CHỈ THÊU' : 'MÀU CHÍNH', 4.2, 800)}
      {used.map((k) => {
        y += 8;
        return (
          <g key={k}>
            <rect x={20} y={y - 4.6} width={10} height={6} rx={1} fill={th.c[k - 1]} stroke="#999" strokeWidth={0.3} />
            {t(34, y, `Chỉ ${k}: ${th.n[k - 1]} · ${th.c[k - 1]}`, 3.6)}
          </g>
        );
      })}
      {t(16, (y += 14), 'XEM TRƯỚC VỊ TRÍ (tỉ lệ thật)', 4.2, 800)}
      {(() => {
        let x = 16; y += 6; const y0 = y; let rowH = 0;
        return pos.map((p) => {
          const P = CAP_POS[p];
          if (x + P.w > W - 16) { x = 16; y += rowH + 12; rowH = 0; }
          const el = (
            <g key={p}>
              <rect x={x} y={y} width={P.w} height={P.h} fill={p === 'back' && spec.kind === 'trucker' ? capColor(spec.visor).hex : capColor(spec.crown).hex} />
              <CapArtSvg spec={spec} data={data} pos={p} logo={logo} uid="sum" box={{ x, y, w: P.w, h: P.h }} />
              {t(x, y + P.h + 5, `${P.name} ${P.w}×${P.h}mm`, 3, 600, '#666')}
            </g>
          );
          x += P.w + 10; rowH = Math.max(rowH, P.h); void y0;
          return el;
        });
      })()}
      {t(16, H - 16, 'File vector đúng kích thước thật kèm theo (chữ đã outline) — xưởng thêu lên chương trình từ file này.', 3, 600, '#777')}
    </svg>
  );
}
