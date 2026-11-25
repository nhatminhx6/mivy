'use client';
// Giấy note in logo: giấy note dán (sticky, cả dáng bế), sổ note xé (có bìa), hộp giấy note vuông (in 4 mặt hông), bộ sticky
// bìa cứng (nhiều cỡ + flag). 1 engine SVG = LOẠI × BỐ CỤC × MÀU × FONT × KẺ DÒNG → render code 100%, chữ đo thật + tự co.
// Đơn vị: 10 = 1mm. Màu giấy note là GIẤY (không in nền) — bản in chỉ có mực.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { printPageDims, drawPrintPage } from './print-export';
import { selfContainedSvg, svgToCanvas } from './svg-export';

const U = 10; // đơn vị / mm
export const NP_BLEED_MM = 2;

// ---------- loại ----------
export type NPKind = 'sticky' | 'pad' | 'cube' | 'set';
export const NP_KINDS: { id: NPKind; name: string; sub: string }[] = [
  { id: 'sticky', name: 'Giấy note dán', sub: 'Sticky 76×76, 76×51, bế hình' },
  { id: 'pad', name: 'Sổ note xé', sub: 'A6 / A5 · gáy keo · có bìa' },
  { id: 'cube', name: 'Hộp note vuông', sub: '9×9×9 cm · in 4 mặt hông' },
  { id: 'set', name: 'Bộ sticky bìa cứng', sub: 'Nhiều cỡ + flag đánh dấu' },
];

// ---------- dáng giấy note dán ----------
export type NPShape = 'sq' | 'rect' | 'circle' | 'bubble' | 'shirt' | 'house';
export const NP_SHAPES: { id: NPShape; name: string; wMm: number; hMm: number }[] = [
  { id: 'sq', name: 'Vuông 76×76', wMm: 76, hMm: 76 },
  { id: 'rect', name: 'Chữ nhật 76×51', wMm: 76, hMm: 51 },
  { id: 'circle', name: 'Tròn Ø76', wMm: 76, hMm: 76 },
  { id: 'bubble', name: 'Bong bóng chat', wMm: 76, hMm: 68 },
  { id: 'shirt', name: 'Hình áo', wMm: 76, hMm: 72 },
  { id: 'house', name: 'Hình ngôi nhà', wMm: 76, hMm: 76 },
];
export const npShape = (id: NPShape) => NP_SHAPES.find((s) => s.id === id) || NP_SHAPES[0];

export const NP_PAD_SIZES: { id: 'a6' | 'a5'; name: string; wMm: number; hMm: number }[] = [
  { id: 'a6', name: 'A6 105×148', wMm: 105, hMm: 148 },
  { id: 'a5', name: 'A5 148×210', wMm: 148, hMm: 210 },
];
export const CUBE_MM = 90;
export const SET = { wMm: 90, hMm: 120, spineMm: 4 }; // bìa bộ sticky (gập đôi)
export const SET_PADS = [{ id: 'big', wMm: 76, hMm: 51 }, { id: 'small', wMm: 51, hMm: 38 }] as const;
export const FLAG = { wMm: 12, hMm: 44, gapMm: 3, n: 5 };

// ---------- màu giấy (giấy note = giấy màu, không in) ----------
export const NP_PAPERS: { id: string; name: string; hex: string }[] = [
  { id: 'yellow', name: 'Vàng cổ điển', hex: '#FFF0A3' },
  { id: 'pink', name: 'Hồng', hex: '#FFD6DF' },
  { id: 'mint', name: 'Xanh mint', hex: '#D2F2E3' },
  { id: 'blue', name: 'Xanh dương', hex: '#D3E7FF' },
  { id: 'orange', name: 'Cam đào', hex: '#FFDDB8' },
  { id: 'white', name: 'Trắng', hex: '#FFFFFF' },
];
export const npPaper = (id: string) => NP_PAPERS.find((p) => p.id === id) || NP_PAPERS[0];
export const FLAG_COLORS = ['#FF8A80', '#FFD54F', '#81C784', '#64B5F6', '#BA68C8'];

// ---------- màu mực ----------
export interface NPPalette { id: string; name: string; ink: string; accent: string; soft: string }
export const NP_PALETTES: NPPalette[] = [
  { id: 'navy', name: 'Navy', ink: '#1F3A68', accent: '#3B6FD8', soft: '#E7EEF9' },
  { id: 'bank', name: 'Đỏ đô', ink: '#9E1B32', accent: '#D4A23A', soft: '#F8E7EA' },
  { id: 'green', name: 'Xanh lá', ink: '#1E6B47', accent: '#5FB36A', soft: '#E4F2E8' },
  { id: 'orange', name: 'Cam', ink: '#C2410C', accent: '#F59E0B', soft: '#FDEEDD' },
  { id: 'purple', name: 'Tím', ink: '#5B2C83', accent: '#B07CE8', soft: '#F1E8F8' },
  { id: 'black', name: 'Đen vàng', ink: '#1C1C1C', accent: '#C8A24A', soft: '#F1EEE6' },
  { id: 'teal', name: 'Xanh ngọc', ink: '#0F6E6E', accent: '#2BB3A3', soft: '#E0F2F0' },
];
export const npPalette = (id: string) => NP_PALETTES.find((p) => p.id === id) || NP_PALETTES[0];

// ---------- font (đều có TTF trong /public/fonts → outline được) ----------
export interface NPFont { id: string; name: string; family: string; weight: number }
export const NP_FONTS: NPFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const npFont = (id: string) => NP_FONTS.find((f) => f.id === id) || NP_FONTS[0];
const BODY = 'Be Vietnam Pro';
const BW = 600;
const HAND = 'Dancing Script';
const q = (f: string) => `'${f}'`; // luôn bọc tên font trong nháy (tên có số/khoảng trắng)

export const NP_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useNPFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-np-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-np-fonts'; link.rel = 'stylesheet';
        link.href = NP_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...NP_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `${BW} 40px "${BODY}"`, `700 40px "${HAND}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục, kẻ dòng, mẫu ----------
export type NPLayout = 'band' | 'corner' | 'todo' | 'minimal' | 'pattern' | 'bold';
export const NP_LAYOUTS: { id: NPLayout; name: string }[] = [
  { id: 'band', name: 'Dải màu đầu' },
  { id: 'corner', name: 'Logo góc' },
  { id: 'todo', name: 'To-do' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'pattern', name: 'Viền chấm' },
  { id: 'bold', name: 'Logo chìm' },
];
export type NPRuling = 'lines' | 'dots' | 'check' | 'grid' | 'blank';
export const NP_RULINGS: { id: NPRuling; name: string }[] = [
  { id: 'lines', name: 'Kẻ ngang' }, { id: 'dots', name: 'Chấm' }, { id: 'check', name: 'Checklist' }, { id: 'grid', name: 'Ô ly' }, { id: 'blank', name: 'Trơn' },
];

export interface NPSpec {
  kind: NPKind; layout: NPLayout; palette: string; font: string;
  paper: string; shape: NPShape; padSize: 'a6' | 'a5'; ruling: NPRuling; sheets: 50 | 100;
}
export type NPData = Record<string, string>;

const SAMPLES: Record<string, NPData> = {
  office: { brand: 'CÔNG TY AN KHANG', slogan: 'Giải pháp văn phòng trọn gói', website: 'ankhang.vn', hotline: '1900 6868', header: 'Ghi chú', event: '' },
  bank: { brand: 'AN KHANG BANK', slogan: 'Đồng hành cùng mọi kế hoạch', website: 'ankhangbank.vn', hotline: '1800 9999', header: 'Memo', event: '' },
  land: { brand: 'GIA KHÁNH LAND', slogan: 'Kiến tạo không gian sống', website: 'giakhanhland.vn', hotline: '0909 868 868', header: 'Ghi chú', event: '' },
  school: { brand: 'TRƯỜNG THCS AN KHANG', slogan: 'Học tốt – Chăm ngoan', website: 'thcsankhang.edu.vn', hotline: '028 3822 1234', header: 'Ghi nhớ', event: '' },
  event: { brand: 'HỘI NGHỊ KHÁCH HÀNG 2027', slogan: 'Cùng nhau vươn xa', website: 'ankhang.vn', hotline: '1900 6868', header: 'Ghi chú', event: 'TP.HCM · 15.01.2027' },
  shop: { brand: 'THU HÀ STORE', slogan: 'Cảm ơn bạn đã ủng hộ!', website: 'thuhastore.vn', hotline: '0938 456 789', header: 'To-do', event: '' },
  spa: { brand: 'THU HÀ SPA', slogan: 'Thư giãn mỗi ngày', website: 'thuhaspa.vn', hotline: '0912 345 678', header: 'Lịch hẹn', event: '' },
  tech: { brand: 'QUỐC BẢO TECH', slogan: 'Công nghệ cho mọi nhà', website: 'quocbaotech.vn', hotline: '1900 1234', header: 'To-do', event: '' },
};

export interface NPTemplate { id: string; name: string; sample: string; spec: Pick<NPSpec, 'layout' | 'palette' | 'font' | 'paper' | 'ruling'> }
export const NP_TEMPLATES: NPTemplate[] = [
  { id: 'office-band', name: 'Văn phòng · Navy', sample: 'office', spec: { layout: 'band', palette: 'navy', font: 'bvp', paper: 'yellow', ruling: 'lines' } },
  { id: 'bank-corner', name: 'Ngân hàng · Đỏ đô', sample: 'bank', spec: { layout: 'corner', palette: 'bank', font: 'montserrat', paper: 'white', ruling: 'lines' } },
  { id: 'shop-todo', name: 'To-do · Cam', sample: 'shop', spec: { layout: 'todo', palette: 'orange', font: 'montserrat', paper: 'orange', ruling: 'check' } },
  { id: 'land-bold', name: 'Bất động sản · Đen vàng', sample: 'land', spec: { layout: 'bold', palette: 'black', font: 'playfair', paper: 'white', ruling: 'lines' } },
  { id: 'school-pattern', name: 'Trường học · Xanh lá', sample: 'school', spec: { layout: 'pattern', palette: 'green', font: 'bvp', paper: 'mint', ruling: 'grid' } },
  { id: 'event-band', name: 'Hội nghị · Xanh ngọc', sample: 'event', spec: { layout: 'band', palette: 'teal', font: 'oswald', paper: 'white', ruling: 'dots' } },
  { id: 'office-minimal', name: 'Tối giản · Navy', sample: 'office', spec: { layout: 'minimal', palette: 'navy', font: 'montserrat', paper: 'blue', ruling: 'dots' } },
  { id: 'spa-pattern', name: 'Spa · Tím', sample: 'spa', spec: { layout: 'pattern', palette: 'purple', font: 'playfair', paper: 'pink', ruling: 'lines' } },
  { id: 'tech-todo', name: 'To-do · Xanh ngọc', sample: 'tech', spec: { layout: 'todo', palette: 'teal', font: 'oswald', paper: 'mint', ruling: 'check' } },
  { id: 'bank-bold', name: 'Logo chìm · Navy', sample: 'bank', spec: { layout: 'bold', palette: 'navy', font: 'bvp', paper: 'white', ruling: 'grid' } },
  { id: 'land-corner', name: 'Logo góc · Xanh lá', sample: 'land', spec: { layout: 'corner', palette: 'green', font: 'montserrat', paper: 'yellow', ruling: 'lines' } },
  { id: 'shop-minimal', name: 'Tối giản · Đen', sample: 'shop', spec: { layout: 'minimal', palette: 'black', font: 'oswald', paper: 'white', ruling: 'blank' } },
];
export const npSample = (id: string): NPData => ({ ...(SAMPLES[id] || SAMPLES.office), logo: '' });
export const defaultNPData = (): NPData => npSample('office');

export interface NPField { key: string; label: string; ph?: string; half?: boolean }
export const NP_FIELDS: NPField[] = [
  { key: 'brand', label: 'Tên thương hiệu / đơn vị', ph: 'CÔNG TY AN KHANG' },
  { key: 'slogan', label: 'Slogan', ph: 'Giải pháp văn phòng trọn gói' },
  { key: 'header', label: 'Tiêu đề trang', ph: 'Ghi chú / To-do / Memo', half: true },
  { key: 'event', label: 'Dòng sự kiện (tuỳ chọn)', ph: 'TP.HCM · 15.01.2027', half: true },
  { key: 'website', label: 'Website', ph: 'ankhang.vn', half: true },
  { key: 'hotline', label: 'Hotline', ph: '1900 6868', half: true },
];

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, family: string, weight: number, size: number): number {
  if (typeof document === 'undefined') return (t || '').length * size * 0.55;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return (t || '').length * size * 0.55;
  mctx.font = `${weight} ${size}px "${family}"`;
  return mctx.measureText(t || '').width;
}
const fitSize = (t: string, fam: string, wt: number, size: number, maxW: number, min = size * 0.5) => {
  const w = textW(t, fam, wt, size);
  return w <= maxW ? size : Math.max(min, (size * maxW) / w);
};
const clip = (t: string, fam: string, wt: number, size: number, maxW: number) => {
  if (textW(t, fam, wt, size) <= maxW) return t;
  let s = t;
  while (s.length > 1 && textW(s + '…', fam, wt, size) > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
};
// tách 2 dòng cân đối
const split2 = (t: string, fam: string, wt: number): string[] => {
  const ws = t.split(/\s+/).filter(Boolean);
  if (ws.length < 2) return [t];
  let best: string[] = [t], bw = Infinity;
  for (let i = 1; i < ws.length; i++) {
    const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' ');
    const m = Math.max(textW(a, fam, wt, 100), textW(b, fam, wt, 100));
    if (m < bw) { bw = m; best = [a, b]; }
  }
  return best;
};
// tên thương hiệu: 1 dòng nếu đủ to, không thì 2 dòng cân
function brandLines(t: string, fam: string, wt: number, size: number, maxW: number, min: number): { lines: string[]; size: number } {
  const s1 = fitSize(t, fam, wt, size, maxW, 0) * 0.985; // chừa sai số đo → không bị cắt '…' oan
  if (s1 >= size * 0.78 || !t.includes(' ')) return { lines: [clip(t, fam, wt, Math.max(min, s1), maxW)], size: Math.max(min, s1) };
  const ls = split2(t, fam, wt);
  const s2 = Math.min(size * 0.9, ...ls.map((l) => fitSize(l, fam, wt, size, maxW, 0))) * 0.985;
  if (s2 >= s1 * 1.05 || s1 < min) return { lines: ls.map((l) => clip(l, fam, wt, Math.max(min, s2), maxW)), size: Math.max(min, s2) };
  return { lines: [clip(t, fam, wt, Math.max(min, s1), maxW)], size: Math.max(min, s1) };
}
export const initials = (name: string) => {
  const skip = new Set(['CÔNG', 'TY', 'TNHH', 'CTY', 'CỔ', 'PHẦN', 'TRƯỜNG', 'THCS', 'THPT', 'TIỂU', 'HỌC', 'HỘI', 'NGHỊ', 'KHÁCH', 'HÀNG', 'SHOP', 'STORE', 'NHÀ']);
  const ws = (name || '').toUpperCase().split(/\s+/).filter((w) => w && !skip.has(w) && !/^\d+$/.test(w));
  const pick = (ws.length ? ws : (name || 'M').toUpperCase().split(/\s+/)).slice(0, 2);
  return pick.map((w) => w[0]).join('') || 'M';
};

// ---------- khung dáng (đơn vị = U) ----------
interface Box { x: number; y: number; w: number; h: number }
export function shapePath(shape: NPShape, W: number, H: number): string {
  const f = (x: number, y: number) => `${(x * W).toFixed(1)} ${(y * H).toFixed(1)}`;
  switch (shape) {
    case 'circle': return `M ${W / 2} 0 A ${W / 2} ${H / 2} 0 1 1 ${W / 2} ${H} A ${W / 2} ${H / 2} 0 1 1 ${W / 2} 0 Z`;
    case 'bubble': {
      const bh = H * 0.82, r = 8 * U;
      return `M ${r} 0 H ${W - r} Q ${W} 0 ${W} ${r} V ${bh - r} Q ${W} ${bh} ${W - r} ${bh} H ${W * 0.36} L ${W * 0.13} ${H} L ${W * 0.2} ${bh} H ${r} Q 0 ${bh} 0 ${bh - r} V ${r} Q 0 0 ${r} 0 Z`;
    }
    case 'shirt':
      return `M ${f(0.32, 0)} Q ${f(0.5, 0.16)} ${f(0.68, 0)} L ${f(1, 0.17)} L ${f(0.89, 0.38)} L ${f(0.8, 0.32)} L ${f(0.8, 1)} L ${f(0.2, 1)} L ${f(0.2, 0.32)} L ${f(0.11, 0.38)} L ${f(0, 0.17)} Z`;
    case 'house':
      return `M ${f(0.5, 0)} L ${f(1, 0.4)} L ${f(0.9, 0.4)} L ${f(0.9, 1)} L ${f(0.1, 1)} L ${f(0.1, 0.4)} L ${f(0, 0.4)} Z`;
    default: {
      const r = 0.8 * U;
      return `M ${r} 0 H ${W - r} Q ${W} 0 ${W} ${r} V ${H - r} Q ${W} ${H} ${W - r} ${H} H ${r} Q 0 ${H} 0 ${H - r} V ${r} Q 0 0 ${r} 0 Z`;
    }
  }
}
function safeBox(shape: NPShape, W: number, H: number, pad: number): Box {
  const fr = (x0: number, y0: number, x1: number, y1: number): Box => ({ x: x0 * W, y: y0 * H, w: (x1 - x0) * W, h: (y1 - y0) * H });
  switch (shape) {
    case 'circle': return fr(0.17, 0.15, 0.83, 0.86);
    case 'bubble': return { x: pad, y: pad, w: W - pad * 2, h: H * 0.82 - pad * 2 };
    case 'shirt': return fr(0.25, 0.2, 0.75, 0.95);
    case 'house': return fr(0.16, 0.36, 0.84, 0.95);
    default: return { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };
  }
}

// ---------- phần tử dùng chung ----------
function Badge({ cx, cy, r, data, pal, font, invert = false }: { cx: number; cy: number; r: number; data: NPData; pal: NPPalette; font: NPFont; invert?: boolean }) {
  const id = useId().replace(/:/g, '');
  const fill = invert ? '#FFFFFF' : pal.ink;
  const tc = invert ? pal.ink : '#FFFFFF';
  if (data.logo) {
    return (
      <g>
        <clipPath id={`lg${id}`}><circle cx={cx} cy={cy} r={r} /></clipPath>
        <circle cx={cx} cy={cy} r={r} fill="#FFFFFF" />
        <image href={data.logo} x={cx - r * 0.86} y={cy - r * 0.86} width={r * 1.72} height={r * 1.72} preserveAspectRatio="xMidYMid meet" clipPath={`url(#lg${id})`} />
      </g>
    );
  }
  const ini = initials(data.brand || '');
  const fs = fitSize(ini, font.family, font.weight, r * 0.95, r * 1.45);
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={fill} />
      <circle cx={cx} cy={cy} r={r * 0.82} fill="none" stroke={invert ? pal.accent : pal.accent} strokeWidth={r * 0.06} />
      <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={fs} fill={tc} data-deco="1">{ini}</text>
    </g>
  );
}

function Ruling({ box, ruling, sp, color }: { box: Box; ruling: NPRuling; sp: number; color: string }) {
  const out: ReactNode[] = [];
  if (ruling === 'blank' || box.h < sp * 1.2) return null;
  if (ruling === 'lines') {
    for (let y = box.y + sp; y <= box.y + box.h + 0.5; y += sp) out.push(<line key={y} x1={box.x} x2={box.x + box.w} y1={y} y2={y} stroke={color} strokeWidth={0.22 * U} strokeOpacity={0.55} />);
  } else if (ruling === 'check') {
    const bs = sp * 0.5;
    for (let y = box.y + sp; y <= box.y + box.h + 0.5; y += sp) {
      out.push(<rect key={`b${y}`} x={box.x} y={y - bs - sp * 0.12} width={bs} height={bs} rx={bs * 0.18} fill="none" stroke={color} strokeWidth={0.26 * U} strokeOpacity={0.75} />);
      out.push(<line key={`l${y}`} x1={box.x + bs * 1.6} x2={box.x + box.w} y1={y} y2={y} stroke={color} strokeWidth={0.2 * U} strokeOpacity={0.45} />);
    }
  } else if (ruling === 'dots') {
    const s = sp * 0.72;
    for (let y = box.y + s * 0.5; y <= box.y + box.h; y += s) for (let x = box.x + s * 0.5; x <= box.x + box.w; x += s) out.push(<circle key={`${x}-${y}`} cx={x} cy={y} r={0.28 * U} fill={color} fillOpacity={0.5} />);
  } else if (ruling === 'grid') {
    const s = sp * 0.72;
    for (let y = box.y; y <= box.y + box.h + 0.5; y += s) out.push(<line key={`h${y}`} x1={box.x} x2={box.x + box.w} y1={y} y2={y} stroke={color} strokeWidth={0.14 * U} strokeOpacity={0.4} />);
    for (let x = box.x; x <= box.x + box.w + 0.5; x += s) out.push(<line key={`v${x}`} x1={x} x2={x} y1={box.y} y2={box.y + box.h} stroke={color} strokeWidth={0.14 * U} strokeOpacity={0.4} />);
  }
  return <g data-ruling="1">{out}</g>;
}

// ---------- TỜ GIẤY NOTE (sticky / trang sổ / tờ hộp) ----------
export interface NoteSheetProps {
  spec: NPSpec; data: NPData; wMm: number; hMm: number; shape?: NPShape;
  paperHex?: string;      // màu giấy (chỉ để xem; in = không in nền)
  bleed?: boolean; print?: boolean; // print: không vẽ giấy, thêm CutContour (sticky bế)
  hand?: string[];        // chữ viết tay mẫu (chỉ cho texture 3D)
  compact?: boolean;      // bỏ slogan (tờ nhỏ trong bộ sticky)
  style?: CSSProperties;
  width?: number; height?: number; // khi lồng trong SVG khác
}
export function NoteSheetSvg({ spec, data, wMm, hMm, shape = 'sq', paperHex = '#FFFFFF', bleed = false, print = false, hand, compact, style, width, height }: NoteSheetProps) {
  const id = useId().replace(/:/g, '');
  const W = wMm * U, H = hMm * U;
  const b = bleed ? NP_BLEED_MM * U : 0;
  const pal = npPalette(spec.palette), font = npFont(spec.font);
  const d = shapePath(shape, W, H);
  const k = Math.max(0.55, Math.min(2.2, Math.min(wMm, hMm * 1.25) / 70));
  const pad = 4.2 * U * Math.min(1.4, Math.max(0.7, k));
  const S = safeBox(shape, W, H, pad);
  const L = spec.layout;
  const els: ReactNode[] = [];
  const bg: ReactNode[] = [];
  const txt = (x: number, y: number, t: string, o: { size: number; fam?: string; wt?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; deco?: boolean; key?: string; op?: number }) => (
    <text key={o.key || `${x}-${y}-${t}`} x={x} y={y} textAnchor={o.anchor || 'start'} fontFamily={q(o.fam || BODY)} fontWeight={o.wt || BW} fontSize={o.size}
      fill={o.fill || pal.ink} letterSpacing={o.ls || 0} opacity={o.op} data-deco={o.deco ? '1' : undefined}>{t}</text>
  );

  const brand = (data.brand || '').trim();
  const slogan = compact ? '' : (data.slogan || '').trim();
  const foot = [data.website, data.hotline].map((s) => (s || '').trim()).filter(Boolean).join('  ·  ');
  const headerLbl = (data.header || '').trim();
  const minTxt = 1.7 * U;

  // ---- vùng đầu (header) ----
  let top = S.y; // con trỏ y
  const headH = Math.min(S.h * (L === 'todo' ? 0.3 : 0.26), 22 * U * k);
  const brandSize0 = Math.min(5.2 * U * k, headH * 0.42);
  const footSize = Math.max(minTxt, Math.min(2.3 * U * k, S.h * 0.06));
  const footH = foot ? footSize * 1.9 : 0;

  if (L === 'band' || L === 'corner' || L === 'pattern' || L === 'bold' || L === 'todo') {
    const onBand = L === 'band';
    if (onBand) bg.push(<rect key="band" x={-b} y={-b} width={W + b * 2} height={S.y + headH + b} fill={pal.ink} />);
    if (L === 'pattern') {
      const n = Math.max(10, Math.round((W + H) / (5.5 * U)));
      for (let i = 0; i < n * 2; i++) {
        const t = i / (n * 2);
        const per = 2 * (W + H), p = t * per;
        const [x, y] = p < W ? [p, 0] : p < W + H ? [W, p - W] : p < 2 * W + H ? [W - (p - W - H), H] : [0, H - (p - 2 * W - H)];
        bg.push(<circle key={`pd${i}`} cx={x} cy={y} r={1.4 * U * Math.min(1.3, k)} fill={i % 2 ? pal.accent : pal.ink} fillOpacity={0.85} />);
      }
    }
    const fg = onBand ? '#FFFFFF' : pal.ink;
    const useBadge = L !== 'todo' && headH > 9 * U;
    const r = useBadge ? Math.min(headH * 0.36, 7.5 * U * k) : 0;
    const tx = useBadge ? S.x + r * 2 + 2.2 * U * k : S.x;
    const tw = S.x + S.w - tx;
    if (L === 'todo') {
      const lbl = headerLbl || 'To-do';
      const ls = fitSize(lbl, font.family, font.weight, Math.min(7 * U * k, headH * 0.55), S.w * 0.95, minTxt);
      els.push(txt(S.x, top + ls * 0.95, clip(lbl, font.family, font.weight, ls, S.w), { size: ls, fam: font.family, wt: font.weight, key: 'todo' }));
      const bs = Math.max(minTxt, Math.min(2.4 * U * k, headH * 0.22));
      if (brand) els.push(txt(S.x, top + ls * 0.95 + bs * 1.55, clip(brand, BODY, 800, bs, S.w), { size: bs, wt: 800, fill: pal.accent, ls: 0.3 * U, key: 'tb' }));
      bg.push(<line key="tl" x1={S.x} x2={S.x + S.w} y1={top + headH - 1.2 * U} y2={top + headH - 1.2 * U} stroke={pal.accent} strokeWidth={0.5 * U} />);
    } else {
      if (useBadge) els.push(<g key="badge"><Badge cx={S.x + r} cy={top + headH * 0.48} r={r} data={data} pal={pal} font={font} invert={onBand} /></g>);
      const bl0 = brandLines(brand || ' ', font.family, font.weight, brandSize0, tw, minTxt);
      const sl = slogan ? Math.max(minTxt, Math.min(2.4 * U * k, bl0.size * 0.55)) : 0;
      // 2 dòng phải lọt chiều cao dải đầu
      const room = headH * 0.92 - (slogan ? sl * 1.5 : 0);
      const fitH = Math.max(minTxt, Math.min(bl0.size, room / (bl0.lines.length * 1.08)));
      const bl = fitH < bl0.size ? brandLines(brand || ' ', font.family, font.weight, fitH, tw, minTxt) : bl0;
      const blockH = bl.lines.length * bl.size * 1.08 + (slogan ? sl * 1.5 : 0);
      let y = top + headH * 0.48 - blockH / 2 + bl.size * 0.86;
      bl.lines.forEach((ln, i) => { els.push(txt(tx, y + i * bl.size * 1.08, ln, { size: bl.size, fam: font.family, wt: font.weight, fill: fg, key: `br${i}` })); });
      y += (bl.lines.length - 1) * bl.size * 1.08;
      if (slogan) els.push(txt(tx, y + sl * 1.45, clip(slogan, BODY, BW, sl, tw), { size: sl, fill: onBand ? '#FFFFFF' : pal.accent, key: 'sl', op: onBand ? 0.9 : 1 }));
      if (!onBand) bg.push(<line key="hl" x1={S.x} x2={S.x + S.w} y1={top + headH - 0.6 * U} y2={top + headH - 0.6 * U} stroke={pal.accent} strokeWidth={0.4 * U} />);
    }
    top += headH + 1.4 * U * k;
  } else {
    // tối giản: tiêu đề trang nhỏ trên cùng
    if (headerLbl) {
      const hs = Math.max(minTxt, Math.min(3 * U * k, S.h * 0.08));
      els.push(txt(S.x, top + hs, clip(headerLbl.toUpperCase(), BODY, 800, hs, S.w * 0.7), { size: hs, wt: 800, ls: 0.6 * U, key: 'mh' }));
      top += hs * 2;
    }
  }

  // ---- logo chìm (bold) ----
  const midH = S.y + S.h - footH - top;
  if (L === 'bold' && midH > 10 * U) {
    const r = Math.min(S.w, midH) * 0.36;
    const cx = S.x + S.w / 2, cy = top + midH / 2;
    if (data.logo) bg.push(<image key="wm" href={data.logo} x={cx - r} y={cy - r} width={r * 2} height={r * 2} opacity={0.08} preserveAspectRatio="xMidYMid meet" />);
    else {
      const ini = initials(brand);
      const fs = fitSize(ini, font.family, font.weight, r * 1.2, r * 1.8);
      bg.push(<circle key="wmc" cx={cx} cy={cy} r={r} fill={pal.accent} fillOpacity={0.1} />);
      els.push(txt(cx, cy + fs * 0.36, ini, { size: fs, fam: font.family, wt: font.weight, fill: pal.ink, anchor: 'middle', deco: true, key: 'wmt', op: 0.08 }));
    }
  }

  // ---- kẻ dòng ----
  const sp = Math.max(4.6 * U, Math.min(7.5 * U, 6.4 * U * Math.min(1.25, k)));
  const rBox: Box = { x: S.x, y: top, w: S.w, h: Math.max(0, midH - 1 * U) };
  bg.push(<Ruling key="rul" box={rBox} ruling={spec.ruling} sp={sp} color={pal.ink} />);

  // ---- chữ viết tay mẫu (3D) ----
  if (hand?.length && spec.ruling !== 'blank') {
    const hs = sp * 0.62;
    hand.forEach((h, i) => {
      const y = top + sp * (i + 1) - sp * 0.16;
      if (y > top + rBox.h) return;
      const x0 = S.x + (spec.ruling === 'check' ? sp * 0.95 : sp * 0.2);
      els.push(<text key={`hd${i}`} x={x0} y={y} fontFamily={q(HAND)} fontWeight={700} fontSize={hs} fill="#24408E" data-deco="1">{clip(h, HAND, 700, hs, S.x + S.w - x0)}</text>);
    });
    if (spec.ruling === 'check') bg.push(<path key="tick" d={`M ${S.x + sp * 0.08} ${top + sp * 0.74} l ${sp * 0.14} ${sp * 0.16} l ${sp * 0.3} ${-sp * 0.42}`} stroke="#24408E" strokeWidth={0.5 * U} fill="none" strokeLinecap="round" />);
  }

  // ---- chân trang ----
  if (foot) {
    let ft = foot;
    if (data.event && L !== 'minimal' && !compact) ft = `${data.event.trim()}  ·  ${foot}`;
    const fs = fitSize(ft, BODY, BW, footSize, S.w, minTxt);
    const fy = S.y + S.h - footSize * 0.35;
    if (L === 'minimal') {
      const r = Math.min(footSize * 1.3, 4.2 * U * k);
      const tw = S.w - r * 2 - 1.6 * U;
      const fs2 = fitSize(foot, BODY, BW, footSize, tw, minTxt);
      els.push(<g key="mb"><Badge cx={S.x + S.w - r} cy={fy - r * 0.55} r={r} data={data} pal={pal} font={font} /></g>);
      els.push(txt(S.x, fy, clip(foot, BODY, BW, fs2, tw), { size: fs2, key: 'ft' }));
      if (brand) {
        const bs = Math.max(minTxt, Math.min(fs2 * 1.25, 3 * U * k));
        if (fy - fs2 * 1.5 - bs > top) els.push(txt(S.x, fy - fs2 * 1.5, clip(brand, font.family, font.weight, bs, tw), { size: bs, fam: font.family, wt: font.weight, key: 'mbn' }));
      }
    } else {
      els.push(txt(S.x + S.w / 2, fy, clip(ft, BODY, BW, fs, S.w), { size: fs, anchor: 'middle', fill: pal.ink, key: 'ft', op: 0.85 }));
    }
  }

  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} width={width} height={height} data-safe={`${S.x} ${S.y} ${S.w} ${S.h}`} data-shape={shape} data-w={wMm} data-h={hMm}>
      <defs>
        <mask id={`m${id}`}><path d={d} fill="#fff" stroke="#fff" strokeWidth={b * 2} /></mask>
      </defs>
      {!print && <path d={d} fill={paperHex} />}
      <g mask={`url(#m${id})`}>{bg}</g>
      <path data-np-shape="1" d={d} fill="none" stroke="none" />
      <g data-content="1">{els}</g>
      {print && (
        <g id="CutContour"><path d={d} fill="none" stroke="#FF00FF" strokeWidth={0.25 * U} /></g>
      )}
    </svg>
  );
}

// ---------- BÌA (sổ note xé / mặt trước bộ sticky) ----------
function CoverArt({ spec, data, W, H, b }: { spec: NPSpec; data: NPData; W: number; H: number; b: number }) {
  const pal = npPalette(spec.palette), font = npFont(spec.font);
  const k = Math.min(W, H * 0.75) / (100 * U);
  const dark = spec.layout !== 'minimal' && spec.layout !== 'pattern';
  const bgc = dark ? pal.ink : pal.soft;
  const fg = dark ? '#FFFFFF' : pal.ink;
  const brand = (data.brand || '').trim();
  const pad = 9 * U * Math.max(0.7, k);
  const tw = W - pad * 2;
  const r = Math.min(W, H) * 0.17;
  const cy = H * 0.36;
  const bl = brandLines(brand || ' ', font.family, font.weight, 9 * U * k, tw, 2 * U);
  const sl = (data.slogan || '').trim();
  const ss = Math.max(2 * U, Math.min(3.6 * U * k, bl.size * 0.5));
  const lbl = (data.header || 'Ghi chú').toUpperCase();
  const foot = [data.website, data.hotline].filter((s) => (s || '').trim()).join('  ·  ');
  const fs = fitSize(foot, BODY, BW, 2.8 * U * k, tw, 1.8 * U);
  let y = cy + r + bl.size * 1.5;
  const els: ReactNode[] = [];
  bl.lines.forEach((ln, i) => { els.push(<text key={`cb${i}`} x={W / 2} y={y + i * bl.size * 1.1} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={bl.size} fill={fg}>{ln}</text>); });
  y += (bl.lines.length - 1) * bl.size * 1.1;
  const ly = Math.max(H * 0.72, y + (sl ? ss * 1.8 : 0) + Math.max(2 * U, 2.6 * U * k) * 2.2);
  if (sl) els.push(<text key="cs" x={W / 2} y={y + ss * 1.8} textAnchor="middle" fontFamily={q(BODY)} fontWeight={BW} fontSize={ss} fill={dark ? pal.accent : pal.accent}>{clip(sl, BODY, BW, ss, tw)}</text>);
  return (
    <g>
      <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={bgc} />
      {spec.layout === 'pattern' && Array.from({ length: 14 }, (_, i) => <circle key={i} cx={(i % 7) * W / 6} cy={i < 7 ? -U : H + U} r={4 * U * k} fill={pal.accent} fillOpacity={0.35} />)}
      {spec.layout === 'band' && <rect x={-b} y={H * 0.78} width={W + b * 2} height={H * 0.22 + b} fill={pal.accent} />}
      {spec.layout === 'bold' && <circle cx={W / 2} cy={cy} r={r * 2.2} fill="#FFFFFF" fillOpacity={0.06} />}
      <rect x={pad * 0.5} y={pad * 0.5} width={W - pad} height={H - pad} rx={2 * U} fill="none" stroke={pal.accent} strokeWidth={0.5 * U} strokeOpacity={0.7} />
      <Badge cx={W / 2} cy={cy} r={r} data={data} pal={pal} font={font} invert={dark} />
      {els}
      <text x={W / 2} y={ly} textAnchor="middle" fontFamily={q(BODY)} fontWeight={800} fontSize={Math.max(2 * U, 2.6 * U * k)} letterSpacing={1.2 * U * k} fill={fg} opacity={0.8}>{clip(lbl, BODY, 800, Math.max(2 * U, 2.6 * U * k), tw)}</text>
      {foot && <text x={W / 2} y={H - pad * 0.95} textAnchor="middle" fontFamily={q(BODY)} fontWeight={BW} fontSize={fs} fill={spec.layout === 'band' ? '#FFFFFF' : fg}>{clip(foot, BODY, BW, fs, tw)}</text>}
    </g>
  );
}

export function PadCoverSvg({ spec, data, wMm, hMm, bleed = false, style }: { spec: NPSpec; data: NPData; wMm: number; hMm: number; bleed?: boolean; style?: CSSProperties }) {
  const W = wMm * U, H = hMm * U, b = bleed ? NP_BLEED_MM * U : 0;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-safe={`${0} ${0} ${W} ${H}`}>
      <CoverArt spec={spec} data={data} W={W} H={H} b={b} />
    </svg>
  );
}

// ---------- HỘP NOTE VUÔNG: dải in 4 mặt hông (360×90mm) ----------
function CubeWrapArt({ spec, data, b }: { spec: NPSpec; data: NPData; b: number }) {
  const pal = npPalette(spec.palette), font = npFont(spec.font);
  const F = CUBE_MM * U, Wt = F * 4;
  const dark = spec.layout === 'band' || spec.layout === 'bold' || spec.layout === 'todo';
  const bgc = dark ? pal.ink : pal.soft, fg = dark ? '#FFFFFF' : pal.ink;
  const pad = 9 * U, tw = F - pad * 2;
  const brand = (data.brand || '').trim();
  const els: ReactNode[] = [];
  // mặt 1: logo + tên
  const r = 15 * U;
  els.push(<g key="b0"><Badge cx={F / 2} cy={F * 0.36} r={r} data={data} pal={pal} font={font} invert={dark} /></g>);
  const bl = brandLines(brand || ' ', font.family, font.weight, 8.5 * U, tw, 2.4 * U);
  bl.lines.forEach((ln, i) => els.push(<text key={`c0${i}`} x={F / 2} y={F * 0.36 + r + bl.size * 1.35 + i * bl.size * 1.1} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={bl.size} fill={fg}>{ln}</text>));
  // mặt 2: slogan lớn
  const sl = (data.slogan || brand).trim();
  const sls = split2(sl, font.family, font.weight);
  const ss = Math.min(9 * U, ...sls.map((l) => fitSize(l, font.family, font.weight, 9 * U, tw, 2.4 * U)));
  sls.forEach((ln, i) => els.push(<text key={`c1${i}`} x={F * 1.5} y={F / 2 - (sls.length - 1) * ss * 0.6 + ss * 0.35 + i * ss * 1.2} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={ss} fill={fg}>{ln}</text>));
  // mặt 3: chữ viết tắt lớn + website
  const ini = initials(brand);
  const is = fitSize(ini, font.family, font.weight, 34 * U, tw);
  els.push(<text key="c2" x={F * 2.5} y={F * 0.56} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={is} fill={pal.accent}>{ini}</text>);
  const web = (data.website || '').trim();
  if (web) { const ws = fitSize(web, BODY, 800, 5 * U, tw, 2 * U); els.push(<text key="c2w" x={F * 2.5} y={F * 0.8} textAnchor="middle" fontFamily={q(BODY)} fontWeight={800} fontSize={ws} fill={fg}>{web}</text>); }
  // mặt 4: hotline + sự kiện
  const hl = (data.hotline || '').trim();
  const ev = (data.event || data.header || '').trim();
  if (ev) { const es = fitSize(ev, BODY, 800, 6 * U, tw, 2 * U); els.push(<text key="c3e" x={F * 3.5} y={F * 0.38} textAnchor="middle" fontFamily={q(BODY)} fontWeight={800} fontSize={es} fill={pal.accent} letterSpacing={0.6 * U}>{clip(ev.toUpperCase(), BODY, 800, es, tw)}</text>); }
  if (hl) { const hs = fitSize(hl, font.family, font.weight, 10 * U, tw, 2.4 * U); els.push(<text key="c3h" x={F * 3.5} y={F * 0.6} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={hs} fill={fg}>{hl}</text>); }
  return (
    <g>
      <rect x={-b} y={-b} width={Wt + b * 2} height={F + b * 2} fill={bgc} />
      {/* sọc chéo liền mạch qua 4 mặt */}
      {Array.from({ length: 28 }, (_, i) => (
        <path key={`s${i}`} d={`M ${i * 15 * U - 40 * U} ${F + b} L ${i * 15 * U + 10 * U} ${F * 0.8}`} stroke={pal.accent} strokeWidth={2.2 * U} strokeOpacity={dark ? 0.35 : 0.5} />
      ))}
      <rect x={-b} y={F * 0.9} width={Wt + b * 2} height={F * 0.1 + b} fill={pal.accent} />
      {els}
    </g>
  );
}
export function CubeSideSvg({ spec, data, side, bleed = false, style }: { spec: NPSpec; data: NPData; side: number; bleed?: boolean; style?: CSSProperties }) {
  const F = CUBE_MM * U, b = bleed ? NP_BLEED_MM * U : 0;
  const pad = 9 * U;
  return (
    <svg viewBox={`${side * F - b} ${-b} ${F + b * 2} ${F + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-safe={`${side * F + pad * 0.5} ${pad * 0.5} ${F - pad} ${F - pad}`} data-side={side}>
      <CubeWrapArt spec={spec} data={data} b={b} />
    </svg>
  );
}
export function CubeWrapSvg({ spec, data, style }: { spec: NPSpec; data: NPData; style?: CSSProperties }) {
  const F = CUBE_MM * U;
  return (
    <svg viewBox={`0 0 ${F * 4} ${F}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      <CubeWrapArt spec={spec} data={data} b={0} />
      {[1, 2, 3].map((i) => <line key={i} x1={i * F} x2={i * F} y1={0} y2={F} stroke="#FF00FF" strokeWidth={0.4 * U} strokeDasharray={`${2 * U} ${1.5 * U}`} />)}
    </svg>
  );
}

// ---------- BỘ STICKY BÌA CỨNG ----------
export function SetCoverSvg({ spec, data, bleed = false, style }: { spec: NPSpec; data: NPData; bleed?: boolean; style?: CSSProperties }) {
  const W = SET.wMm * U, H = SET.hMm * U, sp = SET.spineMm * U, b = bleed ? NP_BLEED_MM * U : 0;
  const pal = npPalette(spec.palette);
  const Wt = W * 2 + sp;
  const foot = [data.brand, data.website, data.hotline].filter((s) => (s || '').trim()).join('  ·  ');
  const fs = fitSize(foot, BODY, BW, 2.4 * U, W - 16 * U, 1.7 * U);
  const dark = spec.layout !== 'minimal' && spec.layout !== 'pattern';
  return (
    <svg viewBox={`${-b} ${-b} ${Wt + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-safe={`0 0 ${Wt} ${H}`}>
      <rect x={-b} y={-b} width={Wt + b * 2} height={H + b * 2} fill={dark ? pal.ink : pal.soft} />
      <rect x={W} y={-b} width={sp} height={H + b * 2} fill={pal.accent} />
      <g transform={`translate(${W + sp} 0)`}><CoverArt spec={spec} data={data} W={W} H={H} b={0} /></g>
      <text x={W / 2} y={H - 10 * U} textAnchor="middle" fontFamily={q(BODY)} fontWeight={BW} fontSize={fs} fill={dark ? '#FFFFFF' : pal.ink} opacity={0.85}>{clip(foot, BODY, BW, fs, W - 16 * U)}</text>
      {bleed && <line x1={W} x2={W} y1={-b} y2={H + b} stroke="#FF00FF" strokeWidth={0.3 * U} strokeDasharray={`${2 * U} ${1.5 * U}`} data-fold="1" />}
      {bleed && <line x1={W + sp} x2={W + sp} y1={-b} y2={H + b} stroke="#FF00FF" strokeWidth={0.3 * U} strokeDasharray={`${2 * U} ${1.5 * U}`} data-fold="1" />}
    </svg>
  );
}
// mặt trong bìa (mở phẳng): nền + chỗ dán sticky (xem trước) — withPads=false cho texture 3D
export function SetInsideSvg({ spec, data, withPads = true, style }: { spec: NPSpec; data: NPData; withPads?: boolean; style?: CSSProperties }) {
  const W = SET.wMm * U, H = SET.hMm * U, sp = SET.spineMm * U;
  const pal = npPalette(spec.palette), font = npFont(spec.font);
  const Wt = W * 2 + sp;
  const brand = (data.brand || '').trim();
  const bs = fitSize(brand, font.family, font.weight, 4.4 * U, W - 20 * U, 2 * U);
  const paper = npPaper(spec.paper).hex;
  const [big, small] = SET_PADS;
  return (
    <svg viewBox={`0 0 ${Wt} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      <rect x={0} y={0} width={Wt} height={H} fill="#FBFAF7" />
      {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={W * 0.1 + i * W * 0.1} cy={H * 0.94} r={1.1 * U} fill={pal.accent} fillOpacity={0.45} />)}
      <rect x={W} y={0} width={sp} height={H} fill={pal.soft} />
      <text x={W / 2} y={H * 0.1} textAnchor="middle" fontFamily={q(font.family)} fontWeight={font.weight} fontSize={bs} fill={pal.ink}>{clip(brand, font.family, font.weight, bs, W - 20 * U)}</text>
      {withPads && (
        <>
          {Array.from({ length: FLAG.n }, (_, i) => (
            <g key={`f${i}`} transform={`translate(${W * 0.14} ${H * 0.2 + i * (FLAG.wMm + FLAG.gapMm) * U * 0.82})`}>
              <rect width={FLAG.hMm * U * 1.4} height={FLAG.wMm * U * 0.8} rx={0.6 * U} fill="#FFFFFF" stroke="#DDD" strokeWidth={0.2 * U} />
              <rect width={FLAG.hMm * U * 0.34} height={FLAG.wMm * U * 0.8} rx={0.6 * U} fill={FLAG_COLORS[i]} />
            </g>
          ))}
          <g transform={`translate(${W + sp + (W - big.wMm * U) / 2} ${H * 0.16})`}>
            <NoteSheetSvg spec={spec} data={data} wMm={big.wMm} hMm={big.hMm} shape="rect" paperHex={paper} compact width={big.wMm * U} height={big.hMm * U} />
          </g>
          <g transform={`translate(${W + sp + (W - small.wMm * U) / 2} ${H * 0.16 + big.hMm * U + 8 * U})`}>
            <NoteSheetSvg spec={spec} data={data} wMm={small.wMm} hMm={small.hMm} shape="rect" paperHex={npPaper('pink').hex} compact width={small.wMm * U} height={small.hMm * U} />
          </g>
        </>
      )}
    </svg>
  );
}
// tờ flag đánh dấu (5 dải màu, đầu dải in màu, thân trong/ trắng có tên nhỏ)
export function FlagsSvg({ spec, data, bleed = false, style }: { spec: NPSpec; data: NPData; bleed?: boolean; style?: CSSProperties }) {
  const fw = FLAG.wMm * U, fh = FLAG.hMm * U, g = FLAG.gapMm * U, b = bleed ? NP_BLEED_MM * U : 0;
  const Wt = FLAG.n * fw + (FLAG.n - 1) * g;
  const pal = npPalette(spec.palette);
  const t = (data.brand || '').trim();
  const fs = Math.max(1.7 * U, fitSize(t, BODY, 800, 2.6 * U, fh * 0.62, 1.7 * U));
  return (
    <svg viewBox={`${-b} ${-b} ${Wt + b * 2} ${fh + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-safe={`0 0 ${Wt} ${fh}`}>
      {Array.from({ length: FLAG.n }, (_, i) => (
        <g key={i} transform={`translate(${i * (fw + g)} 0)`}>
          <rect width={fw} height={fh} fill="#FFFFFF" stroke="#E2E2E2" strokeWidth={0.15 * U} />
          <rect width={fw} height={fh * 0.24} fill={FLAG_COLORS[i]} />
          <text transform={`translate(${fw * 0.62} ${fh * 0.94}) rotate(-90)`} fontFamily={q(BODY)} fontWeight={800} fontSize={fs} fill={pal.ink} opacity={0.55}>{clip(t, BODY, 800, fs, fh * 0.64)}</text>
        </g>
      ))}
    </svg>
  );
}

// ---------- PDF nhiều trang, mỗi trang khổ riêng (lề xén + vạch cắt) ----------
export interface NPPdfPage { el: SVGSVGElement; trim: { wMm: number; hMm: number }; bleed: number; dpi?: number }
export async function npPdf(pages: NPPdfPage[], fontCss: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const pg of pages) {
    const { pageW, pageH } = printPageDims(pg.trim, pg.bleed);
    const orientation = pageW >= pageH ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
    else pdf.addPage([pageW, pageH], orientation);
    const dpi = pg.dpi || 300;
    const wMm = pg.trim.wMm + pg.bleed * 2, hMm = pg.trim.hMm + pg.bleed * 2;
    const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
    const c = await svgToCanvas(await selfContainedSvg(pg.el, fontCss, { outline: true }), outW, outH, '#ffffff');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawPrintPage(pdf as any, c.toDataURL('image/jpeg', 0.92), outW, outH, pg.trim, pg.bleed);
  }
  return pdf!.output('blob');
}

// kích thước tờ chính theo loại
export function mainSheetDims(spec: NPSpec): { wMm: number; hMm: number; shape: NPShape } {
  if (spec.kind === 'sticky') { const s = npShape(spec.shape); return { wMm: s.wMm, hMm: s.hMm, shape: s.id }; }
  if (spec.kind === 'pad') { const s = NP_PAD_SIZES.find((p) => p.id === spec.padSize) || NP_PAD_SIZES[0]; return { wMm: s.wMm, hMm: s.hMm, shape: 'rect' }; }
  if (spec.kind === 'cube') return { wMm: CUBE_MM, hMm: CUBE_MM, shape: 'rect' };
  return { wMm: SET_PADS[0].wMm, hMm: SET_PADS[0].hMm, shape: 'rect' };
}
// màu giấy tờ chính (pad/cube: trắng; sticky/set: theo chọn)
export const mainPaper = (spec: NPSpec) => (spec.kind === 'pad' || spec.kind === 'cube' ? '#FFFFFF' : npPaper(spec.paper).hex);
export const HAND_SAMPLE = ['Gọi lại khách 3h chiều', 'Gửi báo giá cho chị Thu Hà', 'Họp nhóm thứ Sáu', 'Mua mực in'];
