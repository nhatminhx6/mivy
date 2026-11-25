'use client';
// Ruy băng in logo: 1 ĐOẠN LẶP (logo + tên shop + lời nhắn + hoạ tiết ngăn cách) dàn ngang theo chiều dài ruy băng,
// in nhũ (ép kim vàng/bạc/hồng) hoặc 1–2 màu mực. Chữ đo bằng metric thật của font → luôn vừa bề rộng ruy băng trừ lề.
// Đơn vị: mm. Đoạn lặp dài L (tự tính theo nội dung), rộng W (khổ ruy băng).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { TPLogo } from './tape-engine';

export const RB_WIDTHS = [10, 15, 20, 25, 38] as const;
export type RBWidth = (typeof RB_WIDTHS)[number];

export type RBType = 'satin' | 'grosgrain' | 'organza' | 'canvas';
export const RB_TYPES: { id: RBType; name: string; note: string }[] = [
  { id: 'satin', name: 'Satin', note: 'bóng mượt, sang — phổ biến nhất' },
  { id: 'grosgrain', name: 'Grosgrain', note: 'gân ngang, đứng form, hợp tiệm bánh' },
  { id: 'organza', name: 'Organza', note: 'voan mỏng trong suốt, nhẹ nhàng' },
  { id: 'canvas', name: 'Vải bố', note: 'mộc, thô — hợp đồ handmade' },
];
export const rbType = (id: string) => RB_TYPES.find((t) => t.id === id) || RB_TYPES[0];

export interface RBColor { id: string; name: string; hex: string }
export const RB_COLORS: RBColor[] = [
  { id: 'pink', name: 'Hồng phấn', hex: '#F2C1C8' },
  { id: 'rose', name: 'Hồng đậm', hex: '#D4477A' },
  { id: 'red', name: 'Đỏ', hex: '#C8102E' },
  { id: 'wine', name: 'Đỏ đô', hex: '#74172A' },
  { id: 'peach', name: 'Cam đào', hex: '#F2A27E' },
  { id: 'cream', name: 'Vàng kem', hex: '#F2E2B3' },
  { id: 'ivory', name: 'Trắng ngà', hex: '#F8F5EC' },
  { id: 'champagne', name: 'Champagne', hex: '#E5CFAB' },
  { id: 'natural', name: 'Bố mộc', hex: '#D6C3A0' },
  { id: 'mint', name: 'Xanh mint', hex: '#9FD8C2' },
  { id: 'sky', name: 'Xanh baby', hex: '#A7C7E7' },
  { id: 'navy', name: 'Xanh navy', hex: '#1E2D57' },
  { id: 'lavender', name: 'Tím lavender', hex: '#C2B0DF' },
  { id: 'sage', name: 'Xanh rêu', hex: '#7E906A' },
  { id: 'mocha', name: 'Nâu mocha', hex: '#6B4A35' },
  { id: 'black', name: 'Đen', hex: '#161616' },
];
export const rbColor = (id: string) => RB_COLORS.find((c) => c.id === id) || RB_COLORS[0];

export interface RBFoil { id: string; name: string; hex: string }
export const RB_FOILS: RBFoil[] = [
  { id: 'gold', name: 'Nhũ vàng', hex: '#C9A24A' },
  { id: 'silver', name: 'Nhũ bạc', hex: '#B8BEC7' },
  { id: 'rosegold', name: 'Nhũ hồng', hex: '#D49A87' },
];
export const rbFoil = (id: string) => RB_FOILS.find((f) => f.id === id) || RB_FOILS[0];

export interface RBInk { id: string; name: string; hex: string }
export const RB_INKS: RBInk[] = [
  { id: 'white', name: 'Trắng', hex: '#FFFFFF' },
  { id: 'black', name: 'Đen', hex: '#1C1C1C' },
  { id: 'red', name: 'Đỏ', hex: '#C62828' },
  { id: 'navy', name: 'Navy', hex: '#1F2F5C' },
  { id: 'brown', name: 'Nâu', hex: '#6B4226' },
  { id: 'pink', name: 'Hồng', hex: '#E0628A' },
  { id: 'yellow', name: 'Vàng', hex: '#F2B705' },
  { id: 'green', name: 'Xanh lá', hex: '#2E7D4F' },
];
export const rbInk = (id: string) => RB_INKS.find((i) => i.id === id) || RB_INKS[0];

const lum = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** màu in quá gần màu ruy băng → khó đọc */
export const rbLowContrast = (printHex: string, baseHex: string) => Math.abs(lum(printHex) - lum(baseHex)) < 0.2;

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface RBFont { id: string; name: string; family: string; weight: number }
export const RB_FONTS: RBFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
export const rbFont = (id: string) => RB_FONTS.find((f) => f.id === id) || RB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT_VIBES = { fam: 'Great Vibes', wt: 400 };
const SCRIPT_DANCE = { fam: 'Dancing Script', wt: 700 };

export const RB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Lobster&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

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
    const probe = [...RB_FONTS.map((f) => `${f.weight} 40px '${f.family}'`), `600 40px '${BODY}'`, `400 40px 'Great Vibes'`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục & mẫu ----------
export interface RBLayout { id: string; name: string }
export const RB_LAYOUTS: RBLayout[] = [
  { id: 'thanks', name: 'Cảm ơn khách' },
  { id: 'handmade', name: 'Handmade' },
  { id: 'wedding', name: 'Cưới hỏi' },
  { id: 'brand', name: 'Tên thương hiệu' },
  { id: 'flower', name: 'Hoa lá' },
  { id: 'tet', name: 'Quà Tết' },
  { id: 'birthday', name: 'Sinh nhật' },
  { id: 'social', name: 'Shop online' },
];
export const rbLayout = (id: string) => RB_LAYOUTS.find((l) => l.id === id) || RB_LAYOUTS[0];

export type RBSpacing = 'tight' | 'normal' | 'loose';
export const RB_SPACINGS: { id: RBSpacing; name: string; k: number }[] = [
  { id: 'tight', name: 'Sát', k: 0.45 },
  { id: 'normal', name: 'Vừa', k: 0.85 },
  { id: 'loose', name: 'Thoáng', k: 1.5 },
];

export interface RBSpec {
  layout: string; type: RBType; color: string;
  print: 'foil' | 'ink'; foil: string; inks: string[];
  font: string; width: RBWidth; spacing: RBSpacing;
}
export type RBData = Record<string, string>;
export interface RBTemplate { id: string; name: string; spec: Omit<RBSpec, 'width' | 'spacing'>; data: Partial<RBData> }

export const RB_TEMPLATES: RBTemplate[] = [
  { id: 'hoa-satin-hong', name: 'Tiệm hoa · satin hồng nhũ vàng', spec: { layout: 'thanks', type: 'satin', color: 'pink', print: 'foil', foil: 'gold', inks: ['white'], font: 'playfair' }, data: { brand: 'AN KHANG FLOWER', message: 'Thank you' } },
  { id: 'banh-grosgrain-kem', name: 'Tiệm bánh · grosgrain kem', spec: { layout: 'handmade', type: 'grosgrain', color: 'cream', print: 'ink', foil: 'gold', inks: ['brown'], font: 'lobster' }, data: { brand: 'Tiệm Bánh Thu Hà', message: 'Handmade with love' } },
  { id: 'cuoi-satin-nga', name: 'Cưới · satin ngà nhũ vàng', spec: { layout: 'wedding', type: 'satin', color: 'ivory', print: 'foil', foil: 'gold', inks: ['white'], font: 'cormorant' }, data: { message: 'Happy Wedding', names: 'Quốc Bảo & Thu Hà', date: '20.12.2026' } },
  { id: 'cuoi-organza-trang', name: 'Cưới · organza trắng nhũ bạc', spec: { layout: 'wedding', type: 'organza', color: 'ivory', print: 'foil', foil: 'silver', inks: ['white'], font: 'playfair' }, data: { message: 'Save the date', names: 'Gia Khánh & Bảo Ngọc', date: '08.03.2027' } },
  { id: 'tet-satin-do', name: 'Quà Tết · satin đỏ nhũ vàng', spec: { layout: 'tet', type: 'satin', color: 'red', print: 'foil', foil: 'gold', inks: ['white'], font: 'playfair' }, data: { brand: 'AN KHANG GIFT', message: 'An Khang Thịnh Vượng' } },
  { id: 'thoitrang-satin-den', name: 'Thời trang · satin đen nhũ vàng', spec: { layout: 'brand', type: 'satin', color: 'black', print: 'foil', foil: 'gold', inks: ['white'], font: 'cormorant' }, data: { brand: 'AN KHANG BOUTIQUE' } },
  { id: 'mypham-satin-champagne', name: 'Mỹ phẩm · champagne nhũ hồng', spec: { layout: 'flower', type: 'satin', color: 'champagne', print: 'foil', foil: 'rosegold', inks: ['white'], font: 'playfair' }, data: { brand: 'Gia Khánh Beauty', message: 'Love your skin' } },
  { id: 'sinhnhat-grosgrain-xanh', name: 'Sinh nhật · grosgrain xanh baby', spec: { layout: 'birthday', type: 'grosgrain', color: 'sky', print: 'ink', foil: 'gold', inks: ['white', 'yellow'], font: 'bvp' }, data: { message: 'Happy Birthday', names: 'Bảo Ngọc' } },
  { id: 'shopqua-vaibo', name: 'Shop quà · vải bố mộc', spec: { layout: 'social', type: 'canvas', color: 'natural', print: 'ink', foil: 'gold', inks: ['black'], font: 'montserrat' }, data: { brand: 'AN KHANG GIFT SHOP', social: '@ankhang.gift', phone: '0909 123 456' } },
  { id: 'hoa-organza-hong', name: 'Tiệm hoa · organza hồng', spec: { layout: 'flower', type: 'organza', color: 'rose', print: 'ink', foil: 'gold', inks: ['white'], font: 'playfair' }, data: { brand: 'Thu Hà Florist', message: 'Gửi trao yêu thương' } },
  { id: 'banh-satin-mint', name: 'Tiệm bánh · satin mint 2 màu', spec: { layout: 'thanks', type: 'satin', color: 'mint', print: 'ink', foil: 'gold', inks: ['white', 'brown'], font: 'bvp' }, data: { brand: 'BÁNH NHÀ AN', message: 'Cảm ơn bạn' } },
  { id: 'minimal-grosgrain-navy', name: 'Tối giản · grosgrain navy nhũ bạc', spec: { layout: 'brand', type: 'grosgrain', color: 'navy', print: 'foil', foil: 'silver', inks: ['white'], font: 'montserrat' }, data: { brand: 'AN KHANG' } },
];

export interface RBField { key: string; label: string; ph?: string; half?: boolean }
export const RB_FIELDS: RBField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'AN KHANG FLOWER', half: true },
  { key: 'message', label: 'Lời nhắn', ph: 'Thank you · Handmade with love', half: true },
  { key: 'names', label: 'Tên (cưới / sinh nhật)', ph: 'Quốc Bảo & Thu Hà', half: true },
  { key: 'date', label: 'Ngày', ph: '20.12.2026', half: true },
  { key: 'social', label: 'Fanpage / Instagram', ph: '@ankhang.gift', half: true },
  { key: 'phone', label: 'Hotline', ph: '0909 123 456', half: true },
];
/** ô nào bố cục thật sự dùng (ẩn ô thừa cho gọn) */
export const RB_USES: Record<string, string[]> = {
  thanks: ['brand', 'message'], handmade: ['brand', 'message'], wedding: ['message', 'names', 'date'],
  brand: ['brand'], flower: ['brand', 'message'], tet: ['brand', 'message'], birthday: ['message', 'names'],
  social: ['brand', 'social', 'phone'],
};
export const defaultRBData = (): RBData => ({
  brand: 'AN KHANG FLOWER', message: 'Thank you', names: 'Quốc Bảo & Thu Hà', date: '20.12.2026', social: '@ankhang.gift', phone: '0909 123 456',
  ...RB_TEMPLATES[0].data,
});

// ---------- đo chữ bằng metric thật của font ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
const metricCache = new Map<string, { asc: number; desc: number }>();
/** ascent/descent (theo đơn vị cỡ chữ 1) — lấy max của hộp font và nét thật cao nhất (dấu chồng tiếng Việt) */
function vmetric(ts: TS): { asc: number; desc: number } {
  const key = `${ts.wt}|${ts.fam}`;
  const hit = metricCache.get(key); if (hit) return hit;
  if (typeof document === 'undefined') return { asc: 0.98, desc: 0.28 };
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return { asc: 0.98, desc: 0.28 };
  mctx.font = `${ts.wt} 100px '${ts.fam}'`;
  const a = mctx.measureText('ẪỚẾẰ'), d = mctx.measureText('gjpỵ');
  const asc = Math.max(a.fontBoundingBoxAscent || 0, a.actualBoundingBoxAscent || 0) / 100;
  const desc = Math.max(d.fontBoundingBoxDescent || 0, d.actualBoundingBoxDescent || 0) / 100;
  const r = { asc: asc || 0.98, desc: desc || 0.28 };
  metricCache.set(key, r);
  return r;
}
export function rbMeasure(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * size * Math.max(0, [...s].length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} 100px '${ts.fam}'`;
  return (mctx.measureText(s).width / 100) * size + ls;
}

// ---------- khối dàn ngang ----------
interface Block { w: number; draw: (x: number) => ReactNode }
interface Ctx { W: number; H: number; cy: number; c1: string; c2: string }

/** 1 dòng chữ: cỡ lớn nhất sao cho hộp chữ cao ≤ H·scale */
function textBlock(t: string, ts: TS, fill: string, c: Ctx, scale = 1, key = 't'): Block {
  if (!(t || '').trim()) return { w: 0, draw: () => null };
  const m = vmetric(ts);
  const f = (c.H * scale) / (m.asc + m.desc);
  const w = rbMeasure(t, f, ts);
  const base = c.cy - (m.asc + m.desc) * f / 2 + m.asc * f;
  return {
    w,
    draw: (x) => <text key={key} x={x + w / 2} y={base} textAnchor="middle" fontFamily={`'${ts.fam}'`} fontWeight={ts.wt} fontSize={f} letterSpacing={ts.ls ? ts.ls * f : undefined} fill={fill}>{t}</text>,
  };
}
/** 2 dòng chồng nhau (dòng 2 nhỏ hơn) — chỉ dùng khi ruy băng đủ rộng */
function stack2(t1: string, ts1: TS, t2: string, ts2: TS, k2: number, fill1: string, fill2: string, c: Ctx): Block {
  if (!(t2 || '').trim()) return textBlock(t1, ts1, fill1, c);
  if (!(t1 || '').trim()) return textBlock(t2, ts2, fill2, c, 0.7);
  const m1 = vmetric(ts1), m2 = vmetric(ts2);
  const gapK = 0.04;
  // f1·(h1) + gap + k2·f1·(h2) = H
  const f1 = c.H / ((m1.asc + m1.desc) + k2 * (m2.asc + m2.desc) + gapK);
  const f2 = f1 * k2;
  const w1 = rbMeasure(t1, f1, ts1), w2 = rbMeasure(t2, f2, ts2), w = Math.max(w1, w2);
  const top = c.cy - c.H / 2;
  const b1 = top + m1.asc * f1;
  const b2 = top + (m1.asc + m1.desc) * f1 + gapK * f1 + m2.asc * f2;
  return {
    w,
    draw: (x) => (
      <g key="s2">
        <text x={x + w / 2} y={b1} textAnchor="middle" fontFamily={`'${ts1.fam}'`} fontWeight={ts1.wt} fontSize={f1} fill={fill1}>{t1}</text>
        <text x={x + w / 2} y={b2} textAnchor="middle" fontFamily={`'${ts2.fam}'`} fontWeight={ts2.wt} fontSize={f2} letterSpacing={ts2.ls ? ts2.ls * f2 : undefined} fill={fill2}>{t2}</text>
      </g>
    ),
  };
}
const icon = (s: number, c: Ctx, fn: (x: number, y: number, s: number) => ReactNode): Block => ({ w: s, draw: (x) => fn(x, c.cy - s / 2, s) });

// ---------- hoạ tiết ngăn cách vẽ code (ô s×s, góc trái trên x,y) ----------
const heart = (fill: string) => (x: number, y: number, s: number) => (
  <path d={`M${x + s / 2} ${y + s * 0.88} C${x + s * 0.1} ${y + s * 0.6} ${x - s * 0.02} ${y + s * 0.32} ${x + s * 0.2} ${y + s * 0.16} C${x + s * 0.34} ${y + s * 0.05} ${x + s * 0.46} ${y + s * 0.14} ${x + s / 2} ${y + s * 0.26} C${x + s * 0.54} ${y + s * 0.14} ${x + s * 0.66} ${y + s * 0.05} ${x + s * 0.8} ${y + s * 0.16} C${x + s * 1.02} ${y + s * 0.32} ${x + s * 0.9} ${y + s * 0.6} ${x + s / 2} ${y + s * 0.88} Z`} fill={fill} />
);
const dot = (fill: string) => (x: number, y: number, s: number) => <circle cx={x + s / 2} cy={y + s / 2} r={s * 0.17} fill={fill} />;
const dots3 = (fill: string) => (x: number, y: number, s: number) => (
  <g fill={fill}>{[0.18, 0.5, 0.82].map((k, i) => <circle key={i} cx={x + s * k} cy={y + s / 2} r={s * (i === 1 ? 0.11 : 0.07)} />)}</g>
);
function starPath(cx: number, cy: number, R: number, r: number, n = 5, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(3)} ${(cy + Math.sin(a) * rr).toFixed(3)}`;
  }
  return d + 'Z';
}
const star = (fill: string) => (x: number, y: number, s: number) => <path d={starPath(x + s / 2, y + s / 2, s * 0.48, s * 0.2)} fill={fill} />;
const sparkle = (fill: string) => (x: number, y: number, s: number) => <path d={starPath(x + s / 2, y + s / 2, s * 0.5, s * 0.13, 4)} fill={fill} />;
const flower = (fill: string) => (x: number, y: number, s: number) => {
  const cx = x + s / 2, cy = y + s / 2, r = s * 0.17;
  return (
    <g>
      <path fill={fill} d={[0, 1, 2, 3, 4].map((i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5, px = cx + Math.cos(a) * s * 0.26, py = cy + Math.sin(a) * s * 0.26;
        return `M${(px + r).toFixed(3)} ${py.toFixed(3)}A${r} ${r} 0 1 0 ${(px - r).toFixed(3)} ${py.toFixed(3)}A${r} ${r} 0 1 0 ${(px + r).toFixed(3)} ${py.toFixed(3)}Z`;
      }).join('') + ''} />
    </g>
  );
};
// hoa mai: 5 cánh tròn đầu + nhuỵ
const mai = (fill: string) => (x: number, y: number, s: number) => {
  const cx = x + s / 2, cy = y + s / 2;
  const petals = [0, 1, 2, 3, 4].map((i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const tip = { x: cx + Math.cos(a) * s * 0.48, y: cy + Math.sin(a) * s * 0.48 };
    const l = { x: cx + Math.cos(a - 0.62) * s * 0.3, y: cy + Math.sin(a - 0.62) * s * 0.3 };
    const r = { x: cx + Math.cos(a + 0.62) * s * 0.3, y: cy + Math.sin(a + 0.62) * s * 0.3 };
    return `M${cx} ${cy}L${l.x.toFixed(3)} ${l.y.toFixed(3)}Q${tip.x.toFixed(3)} ${tip.y.toFixed(3)} ${r.x.toFixed(3)} ${r.y.toFixed(3)}Z`;
  }).join('');
  return <path d={petals + `M${(cx + s * 0.08).toFixed(3)} ${cy}A${s * 0.08} ${s * 0.08} 0 1 1 ${(cx - s * 0.08).toFixed(3)} ${cy}A${s * 0.08} ${s * 0.08} 0 1 1 ${(cx + s * 0.08).toFixed(3)} ${cy}Z`} fill={fill} />;
};
// 2 nhẫn cưới lồng nhau (nét = cùng màu in)
const rings = (fill: string) => (x: number, y: number, s: number) => (
  <g fill="none" stroke={fill} strokeWidth={s * 0.09}>
    <circle cx={x + s * 0.37} cy={y + s * 0.56} r={s * 0.25} />
    <circle cx={x + s * 0.63} cy={y + s * 0.56} r={s * 0.25} />
    <path d={`M${x + s * 0.55} ${y + s * 0.22} L${x + s * 0.63} ${y + s * 0.12} L${x + s * 0.71} ${y + s * 0.22} Z`} fill={fill} stroke="none" />
  </g>
);
const leaf = (fill: string) => (x: number, y: number, s: number) => (
  <path d={`M${x + s * 0.08} ${y + s * 0.5} Q${x + s * 0.5} ${y - s * 0.02} ${x + s * 0.92} ${y + s * 0.5} Q${x + s * 0.5} ${y + s * 1.02} ${x + s * 0.08} ${y + s * 0.5} Z M${x + s * 0.2} ${y + s * 0.5} L${x + s * 0.8} ${y + s * 0.5}`} fill={fill} stroke="none" />
);

// logo khách (mask 1 màu, trắng = có mực) → khối cao h
function logoBlock(logo: TPLogo | null, fill: string, c: Ctx, uid: string, monoWhite: boolean): Block {
  if (!logo) return { w: 0, draw: () => null };
  const h = c.H * 0.94, w = (h * logo.w) / logo.h;
  return {
    w,
    draw: (x) => {
      const y = c.cy - h / 2, mid = `${uid}-lg`;
      return (
        <g key="logo">
          <defs><mask id={mid} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}><image href={logo.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" /></mask></defs>
          <rect x={x} y={y} width={w} height={h} fill={monoWhite ? '#FFFFFF' : fill} mask={`url(#${mid})`} />
        </g>
      );
    },
  };
}

/** khối nội dung theo bố cục (chưa kể khoảng cách) */
function blocksFor(spec: RBSpec, data: RBData, logo: TPLogo | null, c: Ctx, uid: string, monoWhite: boolean): Block[] {
  const f = rbFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight, ls: f.family === 'Montserrat' || f.family === 'Be Vietnam Pro' ? 0.05 : 0.02 };
  const body: TS = { fam: BODY, wt: 600, ls: 0.04 };
  const wide = spec.width >= 25;
  const s = c.H * 0.62; // cỡ hoạ tiết
  const { c1, c2 } = c;
  const lg = logoBlock(logo, c1, c, uid, monoWhite);
  const brand = (scale = 0.9) => textBlock(data.brand || '', disp, c1, c, scale, 'brand');
  switch (spec.layout) {
    case 'thanks': return [lg, brand(0.86), icon(s * 0.7, c, heart(c2)), textBlock(data.message || '', SCRIPT_VIBES, c1, c, 1.08, 'msg'), icon(s * 0.7, c, heart(c2))];
    case 'handmade': return [textBlock(data.message || '', SCRIPT_DANCE, c1, c, 1, 'msg'), icon(s * 0.66, c, heart(c2)), lg, brand(0.82), icon(s * 0.66, c, heart(c2))];
    case 'wedding': {
      const names = wide
        ? stack2(data.names || '', { fam: f.family, wt: f.weight }, data.date || '', body, 0.42, c1, c2, c)
        : textBlock([data.names, data.date].filter(Boolean).join(' · '), { fam: f.family, wt: f.weight }, c1, c, 0.86, 'nd');
      return [textBlock(data.message || '', SCRIPT_VIBES, c1, c, 1.08, 'msg'), icon(s * 0.9, c, rings(c2)), names, icon(s * 0.9, c, rings(c2))];
    }
    case 'brand': return [lg, brand(0.84), icon(s, c, dots3(c2))];
    case 'flower': return [icon(s, c, flower(c2)), lg, brand(0.84), icon(s * 0.85, c, leaf(c2)), textBlock(data.message || '', SCRIPT_VIBES, c1, c, 1.05, 'msg'), icon(s * 0.85, c, leaf(c2))];
    case 'tet': return [icon(s, c, mai(c2)), textBlock(data.message || '', { fam: f.family, wt: f.weight }, c1, c, 0.84, 'msg'), icon(s, c, mai(c2)), lg, brand(0.8)];
    case 'birthday': return [icon(s * 0.8, c, star(c2)), textBlock(data.message || '', SCRIPT_DANCE, c1, c, 1, 'msg'), icon(s * 0.8, c, star(c2)), textBlock(data.names || '', disp, c1, c, 0.82, 'nm')];
    case 'social': {
      const info = wide
        ? stack2(data.social || '', body, data.phone || '', body, 0.8, c1, c1, c)
        : textBlock([data.social, data.phone].filter(Boolean).join(' · '), body, c1, c, 0.7, 'info');
      return [lg, brand(0.84), icon(s * 0.7, c, sparkle(c2)), info, icon(s * 0.7, c, sparkle(c2))];
    }
    default: return [lg, brand()];
  }
}

export const rbMargin = (W: number) => Math.max(1.4, W * 0.13);
export const RB_MARK_MM = 8;
const MIN_L = (W: number) => Math.max(60, W * 3.2);

export interface RBArranged { L: number; nodes: ReactNode[] }
/** dàn khối thành 1 đoạn lặp: mỗi khối + 1 khoảng cách (kể cả cuối) → nối liền khi lặp */
function arrange(spec: RBSpec, data: RBData, logo: TPLogo | null, uid: string, monoWhite: boolean, colors: { c1: string; c2: string }): RBArranged {
  const W = spec.width, m = rbMargin(W);
  const c: Ctx = { W, H: W - m * 2, cy: W / 2, ...colors };
  const bl = blocksFor(spec, data, logo, c, uid, monoWhite).filter((b) => b.w > 0);
  const k = RB_SPACINGS.find((s) => s.id === spec.spacing)?.k ?? 0.85;
  let g = c.H * k;
  const sum = bl.reduce((a, b) => a + b.w, 0);
  if (sum + g * bl.length < MIN_L(W)) g = (MIN_L(W) - sum) / Math.max(1, bl.length);
  const L = Math.round((sum + g * bl.length) * 10) / 10;
  let x = g / 2;
  const nodes = bl.map((b, i) => { const n = <g key={i}>{b.draw(x)}</g>; x += b.w + g; return n; });
  return { L, nodes };
}

/** màu in chính / phụ theo kiểu in */
export function rbPrintColors(spec: RBSpec): { c1: string; c2: string; list: string[] } {
  if (spec.print === 'foil') { const h = rbFoil(spec.foil).hex; return { c1: h, c2: h, list: [h] }; }
  const inks = (spec.inks.length ? spec.inks : ['white']).slice(0, 2).map((i) => rbInk(i).hex);
  return { c1: inks[0], c2: inks[1] || inks[0], list: inks };
}

/** độ dài 1 đoạn lặp (mm) — cùng thuật toán với RibbonSvg */
export function rbUnitLength(spec: RBSpec, data: RBData, logo: TPLogo | null): number {
  return arrange(spec, data, logo, 'x', false, rbPrintColors(spec)).L;
}

export type RBMode = 'unit' | 'ink' | 'mask' | 'print' | 'strip';
/**
 * unit: 1 đoạn lặp có màu ruy băng (ảnh xem trước).
 * ink: chỉ lớp in, nền trong suốt (texture phủ 3D).
 * mask: lớp in màu trắng trên nền đen (alpha nhũ 3D).
 * print: file in — đoạn lặp + vạch lặp + ghi chú (nền ruy băng chỉ để tham khảo).
 * strip: n đoạn nối nhau.
 */
export function RibbonSvg({ spec, data, logo = null, mode = 'unit', repeats = 3, style }: {
  spec: RBSpec; data: RBData; logo?: TPLogo | null; mode?: RBMode; repeats?: number; style?: CSSProperties;
}) {
  const uid = useId().replace(/[:]/g, '');
  const W = spec.width;
  const mono = mode === 'mask';
  const pc = rbPrintColors(spec);
  const colors = mono ? { c1: '#FFFFFF', c2: '#FFFFFF' } : pc;
  const { L, nodes } = arrange(spec, data, logo, uid, mono, colors);
  const col = rbColor(spec.color), type = rbType(spec.type);
  const clip = `${uid}-clip`;
  const ink = (
    <g id="In">
      <clipPath id={clip}><rect x={0} y={0} width={L} height={W} /></clipPath>
      <g clipPath={`url(#${clip})`}>{nodes}</g>
    </g>
  );
  // nền ruy băng (chỉ để xem, KHÔNG thuộc lớp In): màu + mép dệt + vân theo chất liệu
  const base = (
    <g data-base="1">
      <rect x={0} y={0} width={L} height={W} fill={col.hex} opacity={spec.type === 'organza' ? 0.62 : 1} />
      {spec.type === 'grosgrain' && (
        <g opacity={0.16} stroke={lum(col.hex) > 0.5 ? '#000' : '#fff'} strokeWidth={0.12}>
          {Array.from({ length: Math.ceil(L / 0.7) }, (_, i) => <line key={i} x1={i * 0.7} y1={0} x2={i * 0.7} y2={W} />)}
        </g>
      )}
      {spec.type === 'canvas' && (
        <g opacity={0.12} stroke="#3B2A16" strokeWidth={0.18}>
          {Array.from({ length: Math.ceil(L / 1.1) }, (_, i) => <line key={`v${i}`} x1={i * 1.1} y1={0} x2={i * 1.1} y2={W} />)}
          {Array.from({ length: Math.ceil(W / 1.1) }, (_, i) => <line key={`h${i}`} x1={0} y1={i * 1.1} x2={L} y2={i * 1.1} />)}
        </g>
      )}
      {spec.type === 'satin' && <rect x={0} y={0} width={L} height={W} fill={`url(#${uid}-sheen)`} />}
      <g stroke={lum(col.hex) > 0.5 ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.22)'} strokeWidth={0.25}>
        <line x1={0} y1={0.45} x2={L} y2={0.45} /><line x1={0} y1={W - 0.45} x2={L} y2={W - 0.45} />
      </g>
    </g>
  );
  const sheenDef = (
    <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity={0.1} /><stop offset="0.35" stopColor="#fff" stopOpacity={0.28} />
      <stop offset="0.6" stopColor="#fff" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.08} />
    </linearGradient>
  );

  if (mode === 'strip') {
    const n = Math.max(1, repeats);
    return (
      <svg viewBox={`0 0 ${L * n} ${W}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
        <defs>{sheenDef}<g id={`${uid}-u`}>{base}{ink}</g></defs>
        {Array.from({ length: n }, (_, i) => <use key={i} href={`#${uid}-u`} x={i * L} />)}
      </svg>
    );
  }
  if (mode === 'print') {
    const M = RB_MARK_MM;
    const right = Math.max(L + M, 150 - M);
    const printDesc = spec.print === 'foil' ? `ép ${rbFoil(spec.foil).name.toLowerCase()} (1 màu nhũ)` : `${pc.list.length} màu mực: ${(spec.inks.slice(0, 2)).map((i) => rbInk(i).name).join(', ')}`;
    const note1 = `Ruy băng ${type.name.toLowerCase()} rộng ${W}mm · màu ${col.name.toLowerCase()} · ${printDesc}`;
    const note2 = `Lặp lại mỗi ${L}mm (vạch đen = điểm lặp) · nền màu ruy băng chỉ để tham khảo, không in`;
    return (
      <svg viewBox={`${-M} ${-M} ${right + M} ${W + M * 2}`} width={`${right + M}mm`} height={`${W + M * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style}>
        <defs>{sheenDef}</defs>
        <g id="NenThamKhao" opacity={0.9}><rect x={0} y={0} width={L} height={W} fill={col.hex} opacity={spec.type === 'organza' ? 0.6 : 1} /></g>
        {ink}
        <g id="VachLap" stroke="#000" strokeWidth={0.2} fill="none">
          {[0, L].map((x) => <g key={x}><line x1={x} y1={-M} x2={x} y2={-1.2} /><line x1={x} y1={W + 1.2} x2={x} y2={W + M} /></g>)}
          <line x1={-M} y1={0} x2={-1.2} y2={0} /><line x1={-M} y1={W} x2={-1.2} y2={W} />
          <line x1={L + 1.2} y1={0} x2={L + M * 0.8} y2={0} /><line x1={L + 1.2} y1={W} x2={L + M * 0.8} y2={W} />
        </g>
        <text x={0} y={-M * 0.4} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.3} fill="#000">{note1}</text>
        <text x={0} y={W + M * 0.72} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.1} fill="#000">{note2}</text>
      </svg>
    );
  }
  if (mode === 'ink' || mode === 'mask') {
    return (
      <svg viewBox={`0 0 ${L} ${W}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="none">
        {mode === 'mask' && <rect x={0} y={0} width={L} height={W} fill="#000000" />}
        {ink}
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${L} ${W}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <defs>{sheenDef}</defs>{base}{ink}
    </svg>
  );
}

/** màu thật sự dùng trong lớp In (bỏ mask/clip/defs) — QC */
export function rbInkColorsUsed(svg: SVGSVGElement): string[] {
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
