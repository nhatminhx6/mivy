'use client';
// Tạp dề in logo: 1 engine SVG = BỐ CỤC × NGÀNH (icon vẽ bằng code) × VẢI × BỘ MỰC × FONT → nhiều mẫu, render code 100%.
// Đơn vị: 1 = 1mm. Khung thiết kế = VÙNG IN thật trên tạp dề (ngực yếm / thân tạp dề ngang hông).
// In lụa: mỗi phần tử thuộc 1 "màu mực" k=1..3 → giới hạn số màu, tách film từng màu (đen trên trắng, có dấu chồng màu).
// Thêu: cùng hệ màu → mỗi màu mực = 1 màu chỉ (≤3, trong giới hạn 6 màu chỉ), xem trước có vân mũi thêu.
// Chuyển nhiệt (vải dù polyester): đủ màu + mảng nền mờ + logo màu gốc.
// Tên nhân viên (tuỳ chọn): danh sách tên → mỗi chiếc 1 tên nhỏ dưới logo.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';

// ---------- kiểu tạp dề + hình dáng (mm, gốc = góc trên-trái khung bao, y hướng XUỐNG) ----------
export type APStyle = 'bib' | 'waist' | 'bistro';
export type APPocket = 'none' | 'center' | 'split';
export interface APStyleDef { id: APStyle; name: string; note: string; wMm: number; hMm: number }
export const AP_STYLES: APStyleDef[] = [
  { id: 'bib', name: 'Yếm cổ 70×85', note: 'Dây đeo cổ + dây buộc eo — quán cà phê, tiệm bánh, nhà hàng.', wMm: 700, hMm: 850 },
  { id: 'waist', name: 'Ngang hông 70×40', note: 'Tạp dề ngắn buộc eo — phục vụ, thu ngân.', wMm: 700, hMm: 400 },
  { id: 'bistro', name: 'Bistro dài 90×80', note: 'Tạp dề dài kiểu Âu — bếp, barista, BBQ.', wMm: 900, hMm: 800 },
];
export const apStyle = (id: string) => AP_STYLES.find((s) => s.id === id) || AP_STYLES[0];
export const AP_POCKETS: { id: APPocket; name: string }[] = [
  { id: 'none', name: 'Không túi' },
  { id: 'center', name: '1 túi giữa' },
  { id: 'split', name: 'Túi 3 ngăn' },
];

export interface Rect { x: number; y: number; w: number; h: number }
export interface APGeom {
  W: number; H: number;
  outline: string;            // viền tạp dề (đóng)
  print: Rect;                 // vùng in / thêu
  pocket: Rect | null; pocketDiv: number[]; // túi + vạch chia ngăn (x)
  band: number;                // dây lưng may liền (0 với yếm)
  neck: [number, number][] | null; // 2 điểm gắn dây cổ (yếm)
  waist: [[number, number], [number, number]]; // 2 điểm gắn dây buộc eo
}
export function apronGeom(style: APStyle, pocket: APPocket): APGeom {
  if (style === 'bib') {
    const W = 700, H = 850;
    const outline = `M220 0 L480 0 L480 100 C480 230 560 292 700 300 L700 826 Q700 850 676 850 L24 850 Q0 850 0 826 L0 300 C140 292 220 230 220 100 Z`;
    const pk: Rect | null = pocket === 'none' ? null : pocket === 'center' ? { x: 210, y: 470, w: 280, h: 180 } : { x: 140, y: 480, w: 420, h: 180 };
    const div = pocket === 'split' && pk ? [pk.x + pk.w / 3, pk.x + (pk.w * 2) / 3] : [];
    return { W, H, outline, print: { x: 250, y: 36, w: 200, h: 170 }, pocket: pk, pocketDiv: div, band: 0, neck: [[232, 6], [468, 6]], waist: [[4, 304], [696, 304]] };
  }
  if (style === 'waist') {
    const W = 700, H = 400;
    const outline = `M0 0 L700 0 L700 376 Q700 400 676 400 L24 400 Q0 400 0 376 Z`;
    const pk: Rect | null = pocket === 'none' ? null : pocket === 'center' ? { x: 180, y: 224, w: 340, h: 150 } : { x: 90, y: 224, w: 520, h: 150 };
    const div = pocket === 'split' && pk ? [pk.x + pk.w / 3, pk.x + (pk.w * 2) / 3] : [];
    const print = pk ? { x: 215, y: 64, w: 270, h: 140 } : { x: 190, y: 92, w: 320, h: 220 };
    return { W, H, outline, print, pocket: pk, pocketDiv: div, band: 40, neck: null, waist: [[0, 20], [700, 20]] };
  }
  const W = 900, H = 800;
  const outline = `M0 0 L900 0 L900 772 Q900 800 872 800 L28 800 Q0 800 0 772 Z`;
  const pk: Rect | null = pocket === 'none' ? null : pocket === 'center' ? { x: 280, y: 470, w: 340, h: 210 } : { x: 150, y: 470, w: 600, h: 210 };
  const div = pocket === 'split' && pk ? [pk.x + pk.w / 3, pk.x + (pk.w * 2) / 3] : [];
  const print = pk ? { x: 270, y: 92, w: 360, h: 300 } : { x: 250, y: 140, w: 400, h: 340 };
  return { W, H, outline, print, pocket: pk, pocketDiv: div, band: 40, neck: null, waist: [[0, 20], [900, 20]] };
}

// ---------- chất liệu + màu vải ----------
export type APMaterial = 'kaki' | 'canvas' | 'du';
export const AP_MATERIALS: { id: APMaterial; name: string; note: string }[] = [
  { id: 'kaki', name: 'Vải kaki', note: 'Dày vừa, đứng dáng, dễ giặt — phổ biến nhất.' },
  { id: 'canvas', name: 'Vải bố (canvas)', note: 'Dày, mộc, sang — hợp quán cà phê, BBQ.' },
  { id: 'du', name: 'Vải dù', note: 'Nhẹ, chống bám bẩn, rẻ — hợp in chuyển nhiệt.' },
];
export interface APFabric { id: string; name: string; color: string; thread: string; dark?: boolean; denim?: boolean }
export const AP_FABRICS: APFabric[] = [
  { id: 'den', name: 'Đen', color: '#1F2023', thread: '#3B3C41', dark: true },
  { id: 'nau', name: 'Nâu cà phê', color: '#5A3B2A', thread: '#7A5440', dark: true },
  { id: 'reu', name: 'Xanh rêu', color: '#4A5A3B', thread: '#62754F', dark: true },
  { id: 'dodo', name: 'Đỏ đô', color: '#6D1F26', thread: '#8E2E37', dark: true },
  { id: 'navy', name: 'Navy', color: '#1F2D4D', thread: '#34466F', dark: true },
  { id: 'denim', name: 'Denim (jean)', color: '#3E5C82', thread: '#D9A441', dark: true, denim: true },
  { id: 'be', name: 'Be', color: '#D9C4A0', thread: '#B9A27A' },
  { id: 'trang', name: 'Trắng kem', color: '#F1ECE0', thread: '#D6CFBE' },
];
export const apFabric = (id: string) => AP_FABRICS.find((f) => f.id === id) || AP_FABRICS[0];

// ---------- bộ mực / màu chỉ (tối đa 3) ----------
export interface APInks { id: string; name: string; c: [string, string, string] }
export const AP_INKS: APInks[] = [
  { id: 'cream', name: 'Kem · vàng đồng (vải tối)', c: ['#F3E9D2', '#D9A441', '#C8553D'] },
  { id: 'white', name: 'Trắng · cam (vải tối)', c: ['#FFFFFF', '#F2A541', '#8BC28C'] },
  { id: 'gold', name: 'Vàng · trắng (vải tối)', c: ['#E8C872', '#FFFFFF', '#E07A5F'] },
  { id: 'fire', name: 'Trắng · lửa (BBQ)', c: ['#FFFFFF', '#F28C28', '#E63946'] },
  { id: 'brown', name: 'Nâu cà phê (vải sáng)', c: ['#4A2C1D', '#C8553D', '#7A8B5A'] },
  { id: 'black', name: 'Đen · đỏ (vải sáng)', c: ['#1C1C1C', '#B23A48', '#2E5E4E'] },
  { id: 'sage', name: 'Xanh rêu · vàng (vải sáng)', c: ['#3F5E4B', '#C9A227', '#B5654A'] },
  { id: 'navy', name: 'Navy · cam (vải sáng)', c: ['#1B2A4A', '#C8553D', '#D9A441'] },
];
export const apInks = (id: string) => AP_INKS.find((i) => i.id === id) || AP_INKS[0];

// ---------- font (đều có TTF → outline được) ----------
export interface APFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const AP_FONTS: APFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, script: true },
];
export const apFont = (id: string) => AP_FONTS.find((f) => f.id === id) || AP_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const AP_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Dancing+Script:wght@700&family=Lobster&display=swap');`;

export function useAPFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ap-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ap-fonts'; link.rel = 'stylesheet';
        link.href = AP_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...AP_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- ngành (icon + chữ mẫu) + bố cục + mẫu ----------
export type APMethod = 'screen' | 'embroider' | 'sub';
export interface APIndustry { id: string; name: string }
export const AP_INDUSTRIES: APIndustry[] = [
  { id: 'cafe', name: 'Quán cà phê' },
  { id: 'bakery', name: 'Tiệm bánh' },
  { id: 'restaurant', name: 'Nhà hàng' },
  { id: 'pho', name: 'Quán phở · bún' },
  { id: 'spa', name: 'Spa · nail' },
  { id: 'flower', name: 'Tiệm hoa' },
  { id: 'bbq', name: 'BBQ · nướng' },
];
export const AP_LAYOUTS: { id: string; name: string }[] = [
  { id: 'badge', name: 'Huy hiệu tròn' },
  { id: 'stack', name: 'Icon + tên xếp dọc' },
  { id: 'side', name: 'Icon trái · chữ phải' },
  { id: 'script', name: 'Chữ viết tay' },
];

export interface APSpec {
  style: APStyle; pocket: APPocket; industry: string; layout: string; material: APMaterial; fabric: string;
  inks: string; font: string; method: APMethod; nInk: 1 | 2 | 3;
}
export interface APTemplate { id: string; name: string; spec: Pick<APSpec, 'industry' | 'layout' | 'fabric' | 'inks' | 'font' | 'nInk'> & { method?: APMethod } }
const T = (id: string, name: string, industry: string, layout: string, fabric: string, inks: string, font: string, nInk: 1 | 2 | 3, method?: APMethod): APTemplate =>
  ({ id, name, spec: { industry, layout, fabric, inks, font, nInk, ...(method ? { method } : {}) } });
export const AP_TEMPLATES: APTemplate[] = [
  T('cafe-badge', 'Cà phê · huy hiệu đen', 'cafe', 'badge', 'den', 'cream', 'montserrat', 2),
  T('cafe-script', 'Cà phê · chữ viết nâu', 'cafe', 'script', 'nau', 'cream', 'dancing', 2),
  T('bakery-stack', 'Tiệm bánh · be', 'bakery', 'stack', 'be', 'brown', 'playfair', 2),
  T('bakery-badge', 'Tiệm bánh · đỏ đô thêu', 'bakery', 'badge', 'dodo', 'cream', 'playfair', 2, 'embroider'),
  T('rest-side', 'Nhà hàng · navy', 'restaurant', 'side', 'navy', 'gold', 'oswald', 2),
  T('rest-script', 'Nhà hàng · đen thêu', 'restaurant', 'script', 'den', 'gold', 'lobster', 2, 'embroider'),
  T('pho-stack', 'Quán phở · xanh rêu', 'pho', 'stack', 'reu', 'cream', 'baloo', 3),
  T('pho-badge', 'Quán bún · trắng kem', 'pho', 'badge', 'trang', 'black', 'baloo', 2),
  T('spa-script', 'Spa · be', 'spa', 'script', 'be', 'sage', 'dancing', 2),
  T('flower-stack', 'Tiệm hoa · trắng kem', 'flower', 'stack', 'trang', 'sage', 'playfair', 3),
  T('bbq-badge', 'BBQ · đen lửa', 'bbq', 'badge', 'den', 'fire', 'oswald', 3),
  T('bbq-side', 'BBQ · denim', 'bbq', 'side', 'denim', 'white', 'oswald', 2),
];

export type APData = Record<string, string>;
export const AP_FIELDS: { key: string; label: string }[] = [
  { key: 'brand', label: 'Tên quán / thương hiệu' },
  { key: 'tagline', label: 'Slogan / dòng phụ' },
  { key: 'since', label: 'Năm thành lập / địa chỉ ngắn' },
];
export const AP_SAMPLES: Record<string, APData> = {
  cafe: { brand: 'An Khang Coffee', tagline: 'Rang xay mỗi sáng', since: 'Since 2019' },
  bakery: { brand: 'Tiệm bánh Thu Hà', tagline: 'Bánh tươi mỗi ngày', since: 'Est. 2021' },
  restaurant: { brand: 'Quốc Bảo Kitchen', tagline: 'Bếp Việt · Hương vị nhà', since: 'Since 2018' },
  pho: { brand: 'Phở Gia Khánh', tagline: 'Nước dùng hầm 12 tiếng', since: 'Từ 1998' },
  spa: { brand: 'Thu Hà Spa', tagline: 'Thư giãn · Chăm sóc · Tươi trẻ', since: 'Since 2020' },
  flower: { brand: 'Hoa Bảo Ngọc', tagline: 'Hoa tươi giao tận nơi', since: 'Est. 2022' },
  bbq: { brand: 'Quốc Bảo BBQ', tagline: 'Nướng than hoa · Bia lạnh', since: 'Since 2017' },
};
export const defaultAPData = (industry = 'cafe'): APData => ({ ...(AP_SAMPLES[industry] || AP_SAMPLES.cafe), names: '' });
/** danh sách tên nhân viên (mỗi dòng 1 tên) */
export const apNames = (data: APData) => (data.names || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 200);

// ---------- màu ----------
const lum = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** mực k (1..3) sau khi gộp theo số màu (in lụa / thêu) */
export const apMapInk = (spec: Pick<APSpec, 'method' | 'nInk'>, k: number) => (spec.method === 'sub' ? k : Math.min(k, spec.nInk));
export function apUsedInks(spec: APSpec): { k: number; color: string }[] {
  const inks = apInks(spec.inks).c;
  const n = spec.method === 'sub' ? 3 : spec.nInk;
  return Array.from({ length: n }, (_, i) => ({ k: i + 1, color: inks[i] }));
}
export const apLowContrast = (spec: APSpec) => Math.abs(lum(apInks(spec.inks).c[0]) - lum(apFabric(spec.fabric).color)) < 0.28;

// ---------- đo + dàn chữ ----------
interface TS { fam: string; wt: number; ls?: number }
function wrap(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || textW(next, size, ts) <= maxW) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
function fitLines(text: string, maxW: number, maxH: number, size: number, ts: TS, maxLines: number, lh: number) {
  let s = size, lines = wrap(text, maxW, s, ts);
  const tooBig = () => lines.length > maxLines || lines.length * s * lh > maxH || lines.some((l) => textW(l, s, ts) > maxW + 0.01);
  let guard = 0;
  while (tooBig() && guard++ < 90) { s *= 0.95; lines = wrap(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrap(text, hi, s, ts);
  }
  return { lines, size: s };
}
const metricCache = new Map<string, { asc: number; desc: number }>();
function metrics(ts: TS) {
  const key = `${ts.wt} ${ts.fam}`;
  let m = metricCache.get(key);
  if (!m) {
    m = { asc: 1.0, desc: 0.3 };
    if (typeof document !== 'undefined') {
      const cx = document.createElement('canvas').getContext('2d');
      if (cx) {
        cx.font = `${ts.wt} 100px "${ts.fam}"`;
        const mt = cx.measureText('ẮỖg');
        if (mt.fontBoundingBoxAscent) m = { asc: mt.fontBoundingBoxAscent / 100, desc: mt.fontBoundingBoxDescent / 100 };
      }
    }
    metricCache.set(key, m);
  }
  return m;
}
type Anchor = 'start' | 'middle' | 'end';
interface Region { x: number; top: number; bottom: number; maxW: number; anchor?: Anchor }
/** khối chữ canh giữa theo chiều dọc trong [top,bottom], co cho vừa (đo ascent/descent thật của font) */
function textBlock(text: string, ts: TS, r: Region, o: { size: number; maxLines?: number; lh?: number; fill: string; upper?: boolean; key?: string }): ReactNode {
  const t = (o.upper ? (text || '').toUpperCase() : text || '').trim();
  if (!t) return null;
  const lh = o.lh ?? 1.12;
  const { asc, desc } = metrics(ts);
  const avail = r.bottom - r.top;
  let s0 = o.size, fit = fitLines(t, r.maxW, avail, s0, ts, o.maxLines ?? 1, lh);
  const hOf = (n: number, sz: number) => sz * asc + (n - 1) * sz * lh + sz * desc;
  for (let i = 0; i < 40 && hOf(fit.lines.length, fit.size) > avail; i++) { s0 = fit.size * 0.95; fit = fitLines(t, r.maxW, avail, s0, ts, o.maxLines ?? 1, lh); }
  const { lines, size } = fit;
  const blockH = hOf(lines.length, size);
  const y0 = r.top + Math.max(0, (avail - blockH) / 2) + size * asc;
  return (
    <text key={o.key} textAnchor={r.anchor || 'middle'} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size} fill={o.fill} letterSpacing={ts.ls || undefined}>
      {lines.map((l, i) => <tspan key={i} x={r.x} y={y0 + i * size * lh}>{l}</tspan>)}
    </text>
  );
}
/** chữ theo cung tròn — mỗi kí tự 1 <text> (outline được) */
function arcText(text: string, ts: TS, cx: number, cy: number, rr: number, size: number, maxDeg: number, fill: string, bottom = false): ReactNode {
  const t = (text || '').trim();
  if (!t) return null;
  const chars = [...t];
  const gap = size * 0.14;
  let s = size;
  const total = (sz: number) => chars.reduce((a, ch) => a + textW(ch, sz, ts), 0) + gap * (sz / size) * (chars.length - 1);
  const maxLen = rr * (maxDeg * Math.PI / 180);
  if (total(s) > maxLen) s = (s * maxLen) / total(s);
  const g = gap * (s / size);
  const L = total(s);
  let cum = 0;
  return (
    <g>
      {chars.map((ch, i) => {
        const w = textW(ch, s, ts);
        const mid = cum + w / 2; cum += w + g;
        if (ch === ' ') return null;
        const off = (mid - L / 2) / rr;
        const a = bottom ? Math.PI / 2 - off : -Math.PI / 2 + off;
        const rb = bottom ? rr + s * 0.33 : rr - s * 0.33;
        const x = cx + rb * Math.cos(a), y = cy + rb * Math.sin(a);
        const rot = (a * 180) / Math.PI + (bottom ? -90 : 90);
        return <text key={i} x={x.toFixed(2)} y={y.toFixed(2)} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={s.toFixed(2)} fill={fill} transform={`rotate(${rot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}>{ch}</text>;
      })}
    </g>
  );
}

// ---------- icon ngành (khung 100×100, nét = mực 1, điểm nhấn = mực 2) ----------
interface Item { k: 0 | 1 | 2 | 3; n: ReactNode }
function icon(id: string, ox: number, oy: number, size: number, c: (k: number) => string, key: string): Item[] {
  const k = size / 100;
  const g = (kk: 1 | 2 | 3, node: ReactNode, sub: string): Item => ({ k: kk, n: <g key={`${key}-${sub}`} transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${k.toFixed(4)})`}>{node}</g> });
  const L = (d: string, w = 5) => <path d={d} fill="none" stroke={c(1)} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />;
  switch (id) {
    case 'cafe': return [
      g(1, L('M22 44 L74 44 L70 82 Q69 90 61 90 L35 90 Q27 90 26 82 Z M74 52 Q90 52 88 64 Q86 74 72 72'), 'cup'),
      g(2, <path d="M36 34 Q30 26 36 18 Q42 10 36 4 M50 34 Q44 26 50 18 Q56 10 50 4 M64 34 Q58 26 64 18 Q70 10 64 4" fill="none" stroke={c(2)} strokeWidth={4} strokeLinecap="round" />, 'steam'),
      g(1, L('M14 96 L86 96', 4), 'saucer'),
    ];
    case 'bakery': return [
      g(1, L('M28 58 Q12 52 16 36 Q20 22 36 26 Q40 10 56 12 Q72 14 72 28 Q88 26 88 42 Q88 58 72 58 Z M30 58 L30 88 L70 88 L70 58'), 'hat'),
      g(2, <path d="M30 74 L70 74" stroke={c(2)} strokeWidth={5} strokeLinecap="round" />, 'band'),
    ];
    case 'restaurant': return [
      g(1, L('M20 8 L20 30 Q20 42 31 42 Q42 42 42 30 L42 8 M31 8 L31 30 M31 42 L31 92'), 'fork'),
      g(1, L('M66 92 L66 50 Q78 46 78 24 Q78 8 66 8 Z'), 'knife'),
      g(2, <circle cx={52} cy={60} r={3.5} fill={c(2)} />, 'dot'),
    ];
    case 'pho': return [
      g(1, L('M12 50 L88 50 Q86 80 62 86 L38 86 Q14 80 12 50 Z M34 92 L66 92'), 'bowl'),
      g(1, L('M60 8 L40 46 M74 10 L50 46', 4.5), 'sticks'),
      g(2, <path d="M24 40 Q20 32 24 24 M38 40 Q34 32 38 24" fill="none" stroke={c(2)} strokeWidth={4} strokeLinecap="round" />, 'steam'),
      g(2, <path d="M22 62 Q36 70 50 62 Q64 54 78 62" fill="none" stroke={c(2)} strokeWidth={3.5} strokeLinecap="round" />, 'wave'),
    ];
    case 'spa': return [
      g(1, L('M50 22 Q66 44 50 74 Q34 44 50 22 Z M50 74 Q26 70 16 46 Q36 46 50 74 M50 74 Q74 70 84 46 Q64 46 50 74'), 'lotus'),
      g(2, <path d="M14 84 Q32 76 50 84 Q68 92 86 84" fill="none" stroke={c(2)} strokeWidth={4} strokeLinecap="round" />, 'water'),
      g(2, <circle cx={50} cy={12} r={4} fill={c(2)} />, 'sun'),
    ];
    case 'flower': return [
      g(1, L('M50 52 L50 94 M50 76 Q34 74 28 62 Q42 60 50 72 M50 84 Q66 82 72 70 Q58 68 50 80'), 'stem'),
      g(2, <g fill={c(2)}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={50} cy={20} rx={9} ry={14} transform={`rotate(${a} 50 34)`} />)}</g>, 'petals'),
      g(1, <circle cx={50} cy={34} r={7} fill={c(1)} />, 'core'),
    ];
    default: return [ // bbq
      g(2, <path d="M50 8 Q70 28 62 46 Q74 40 72 28 Q86 46 74 62 Q64 74 50 74 Q36 74 26 62 Q14 46 28 28 Q26 40 38 46 Q30 28 50 8 Z" fill={c(2)} />, 'flame'),
      g(3, <path d="M50 38 Q60 50 54 62 Q50 66 46 62 Q40 50 50 38 Z" fill={c(3)} />, 'core'),
      g(1, L('M14 80 L86 80 M20 90 L80 90 M30 80 L24 96 M70 80 L76 96', 5), 'grill'),
    ];
  }
}
function initials(brand: string) {
  const ws = (brand || '').trim().split(/\s+/).filter(Boolean);
  return (ws.length > 1 ? ws[0][0] + ws[ws.length - 1][0] : (ws[0] || 'A').slice(0, 2)).toUpperCase();
}

// ---------- bố cục trong vùng in ----------
interface Ctx {
  W: number; H: number; u: number; data: APData; c: (k: number) => string; disp: TS; script: boolean;
  industry: string; logo: boolean; logoBox: (x: number, y: number, w: number, h: number) => ReactNode; uid: string;
}
function mark(x: Ctx, cx: number, cy: number, size: number, key: string): Item[] {
  if (x.logo) return [{ k: 1, n: x.logoBox(cx - size / 2, cy - size / 2, size, size) }];
  return icon(x.industry, cx - size / 2, cy - size / 2, size, x.c, key);
}
const LAYOUTS: Record<string, (x: Ctx, H: number) => Item[]> = {
  // huy hiệu tròn: 2 vòng, tên quán chạy cung trên, năm/địa chỉ cung dưới, icon giữa, 2 ngôi sao 2 bên
  badge(x, H) {
    const { W, u, c, data } = x;
    const D = Math.min(W, H) * 0.97, R = D / 2, cx = W / 2, cy = H / 2;
    const items: Item[] = [];
    items.push({ k: 1, n: <circle key="o" cx={cx} cy={cy} r={R - u * 0.8} fill="none" stroke={c(1)} strokeWidth={u * 1.4} /> });
    const r2 = R * 0.66;
    items.push({ k: 2, n: <circle key="i" cx={cx} cy={cy} r={r2} fill="none" stroke={c(2)} strokeWidth={u * 0.7} /> });
    const band = R - u * 1.6 - r2, rr = r2 + band / 2;
    const ts: TS = { fam: x.script ? BODY : x.disp.fam, wt: x.script ? 800 : x.disp.wt };
    items.push({ k: 1, n: <g key="at">{arcText((data.brand || '').toUpperCase(), ts, cx, cy, rr, band * 0.56, 150, c(1))}</g> });
    items.push({ k: 1, n: <g key="ab">{arcText((data.since || '').toUpperCase(), { fam: BODY, wt: 800 }, cx, cy, rr, band * 0.42, 110, c(1), true)}</g> });
    for (const s of [-1, 1]) {
      const sx = cx + s * rr, sy = cy;
      items.push({ k: 2, n: <circle key={`dot${s}`} cx={sx} cy={sy} r={band * 0.12} fill={c(2)} /> });
    }
    items.push(...mark(x, cx, cy - r2 * 0.16, r2 * 1.02, 'bi'));
    items.push({ k: 2, n: textBlock(data.tagline, { fam: BODY, wt: 800 }, { x: cx, top: cy + r2 * 0.42, bottom: cy + r2 * 0.74, maxW: r2 * 1.35 }, { size: r2 * 0.2, fill: c(2), key: 'tg' }) });
    return items;
  },
  // icon trên, tên lớn, gạch, slogan
  stack(x, H) {
    const { W, u, c, data, disp } = x;
    const items: Item[] = [];
    const isz = Math.min(H * 0.36, W * 0.4);
    items.push(...mark(x, W / 2, isz / 2 + H * 0.02, isz, 'si'));
    const t0 = isz + H * 0.06;
    items.push({ k: 1, n: textBlock(data.brand, disp, { x: W / 2, top: t0, bottom: t0 + H * 0.3, maxW: W * 0.96 }, { size: H * 0.2, maxLines: 2, lh: 1.04, fill: c(1), upper: !x.script, key: 'b' }) });
    const ry = t0 + H * 0.33;
    items.push({ k: 2, n: <g key="rule"><line x1={W * 0.22} y1={ry} x2={W * 0.42} y2={ry} stroke={c(2)} strokeWidth={u * 0.7} /><line x1={W * 0.58} y1={ry} x2={W * 0.78} y2={ry} stroke={c(2)} strokeWidth={u * 0.7} /><circle cx={W / 2} cy={ry} r={u * 1.1} fill={c(2)} /></g> });
    items.push({ k: 2, n: textBlock(data.tagline, { fam: BODY, wt: 800, ls: u * 0.25 }, { x: W / 2, top: ry + H * 0.03, bottom: ry + H * 0.13, maxW: W * 0.92 }, { size: H * 0.065, fill: c(2), upper: true, key: 't' }) });
    items.push({ k: 1, n: textBlock(data.since, { fam: BODY, wt: 600 }, { x: W / 2, top: ry + H * 0.135, bottom: H * 0.995, maxW: W * 0.8 }, { size: H * 0.05, fill: c(1), key: 's' }) });
    return items;
  },
  // icon trong khung tròn bên trái, tên + slogan bên phải (canh trái)
  side(x, H) {
    const { W, u, c, data, disp } = x;
    const items: Item[] = [];
    const D = Math.min(H * 0.86, W * 0.36), cx = D / 2 + u * 1, cy = H / 2;
    items.push({ k: 1, n: <circle key="ring" cx={cx} cy={cy} r={D / 2 - u * 0.8} fill="none" stroke={c(1)} strokeWidth={u * 1.2} /> });
    items.push(...mark(x, cx, cy, D * 0.62, 'sd'));
    const tx = D + u * 5, tw = W - tx - u * 1;
    items.push({ k: 1, n: textBlock(data.brand, disp, { x: tx, top: H * 0.1, bottom: H * 0.58, maxW: tw, anchor: 'start' }, { size: H * 0.3, maxLines: 2, lh: 1.02, fill: c(1), upper: !x.script, key: 'b' }) });
    items.push({ k: 2, n: <rect key="bar" x={tx} y={H * 0.61} width={Math.min(tw * 0.35, u * 22)} height={u * 1} fill={c(2)} /> });
    items.push({ k: 2, n: textBlock(data.tagline, { fam: BODY, wt: 800 }, { x: tx, top: H * 0.65, bottom: H * 0.8, maxW: tw, anchor: 'start' }, { size: H * 0.1, fill: c(2), key: 't' }) });
    items.push({ k: 1, n: textBlock(data.since, { fam: BODY, wt: 600 }, { x: tx, top: H * 0.8, bottom: H * 0.93, maxW: tw, anchor: 'start' }, { size: H * 0.075, fill: c(1), key: 's' }) });
    return items;
  },
  // chữ viết tay lớn + nét lượn dưới, icon nhỏ trên, slogan in hoa nhỏ
  script(x, H) {
    const { W, u, c, data } = x;
    const items: Item[] = [];
    const ts: TS = x.script ? x.disp : { fam: 'Dancing Script', wt: 700 };
    const isz = H * 0.24;
    items.push(...mark(x, W / 2, isz / 2 + H * 0.01, isz, 'ci'));
    const t0 = isz + H * 0.05;
    items.push({ k: 1, n: textBlock(data.brand, ts, { x: W / 2, top: t0, bottom: t0 + H * 0.4, maxW: W * 0.96 }, { size: H * 0.3, maxLines: 2, lh: 1.0, fill: c(1), key: 'b' }) });
    const sy = t0 + H * 0.43;
    items.push({ k: 2, n: <path key="sw" d={`M${W * 0.2} ${sy} Q${W * 0.5} ${sy + H * 0.06} ${W * 0.8} ${sy - H * 0.01} Q${W * 0.86} ${sy - H * 0.02} ${W * 0.84} ${sy + H * 0.01}`} fill="none" stroke={c(2)} strokeWidth={u * 0.9} strokeLinecap="round" /> });
    items.push({ k: 2, n: textBlock(data.tagline, { fam: BODY, wt: 800, ls: u * 0.35 }, { x: W / 2, top: sy + H * 0.07, bottom: sy + H * 0.17, maxW: W * 0.9 }, { size: H * 0.06, fill: c(2), upper: true, key: 't' }) });
    items.push({ k: 1, n: textBlock(data.since, { fam: BODY, wt: 600 }, { x: W / 2, top: sy + H * 0.17, bottom: H * 0.995, maxW: W * 0.7 }, { size: H * 0.05, fill: c(1), key: 's' }) });
    return items;
  },
};

/** 1 vùng in. sep = 1..3 → film tách màu (in lụa, không gồm tên riêng). stitch → xem trước vân thêu. */
export function ApronSvg({ spec, data, logo, person, sep, stitch, style }: {
  spec: APSpec; data: APData; logo?: string; person?: string; sep?: 1 | 2 | 3; stitch?: boolean; style?: CSSProperties;
}) {
  const geo = apronGeom(spec.style, spec.pocket);
  const W = geo.print.w, H = geo.print.h, u = W / 100;
  const inks = apInks(spec.inks).c;
  const f = apFont(spec.font);
  const c = (k: number) => (sep ? '#000000' : inks[Math.max(1, apMapInk(spec, k)) - 1]);
  const flatLogo = spec.method !== 'sub';
  const rid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const uid = `${rid}-${sep || 0}`; // id duy nhất mỗi lần vẽ → mask/filter không lẫn giữa các thumbnail
  const fid = `apink-${uid}`;
  const logoBox = (lx: number, ly: number, lw: number, lh: number) => logo
    ? <image key="logo" href={logo} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="xMidYMid meet" filter={flatLogo || sep ? `url(#${fid})` : undefined} />
    : null;
  const ctx: Ctx = { W, H, u, data, c, disp: { fam: f.family, wt: f.weight }, script: !!f.script, industry: spec.industry, logo: !!logo, logoBox, uid };
  // có tên nhân viên → chừa dải dưới 18% cho tên
  const name = (person || '').trim();
  const nameH = name && !sep ? H * 0.18 : 0;
  const reserve = name ? H * 0.18 : 0; // film vẫn chừa chỗ để khớp vị trí
  let items = (LAYOUTS[spec.layout] || LAYOUTS.badge)(ctx, H - reserve).filter((it) => it.n);
  if (nameH) items.push({ k: 1, n: textBlock(name, { fam: BODY, wt: 800, ls: u * 0.4 }, { x: W / 2, top: H - nameH + H * 0.03, bottom: H, maxW: W * 0.9 }, { size: nameH * 0.62, fill: c(1), upper: true, key: 'name' }) });
  if (sep) items = items.filter((it) => it.k === 0 || apMapInk(spec, it.k) === sep);
  const art = <g data-art="1">{items.map((it, i) => <g key={i} data-ink={it.k || undefined}>{it.n}</g>)}</g>;
  const tint = spec.method === 'sub' && !sep;
  const M = sep ? 15 : 0;
  const vb = `${-M} ${-M} ${W + M * 2} ${H + M * 2}`;
  const sid = `apst-${uid}`;
  const reg = (rx: number, ry: number) => (
    <g key={`${rx}-${ry}`} stroke="#000000" strokeWidth={0.25} fill="none"><circle cx={rx} cy={ry} r={3} /><line x1={rx - 5} y1={ry} x2={rx + 5} y2={ry} /><line x1={rx} y1={ry - 5} x2={rx} y2={ry + 5} /></g>
  );
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-sep={sep || undefined}>
      {logo && (flatLogo || sep) && (
        <defs>
          {/* logo khách → 1 màu mực/chỉ: tối = in/thêu, sáng/trong = bỏ */}
          <filter id={fid} colorInterpolationFilters="sRGB" x="-2%" y="-2%" width="104%" height="104%">
            <feFlood floodColor="#ffffff" result="w" />
            <feComposite in="SourceGraphic" in2="w" operator="over" result="flat" />
            <feColorMatrix in="flat" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 0 1" result="a" />
            <feComponentTransfer in="a" result="b"><feFuncA type="discrete" tableValues="0 1" /></feComponentTransfer>
            <feFlood floodColor={c(1)} result="ink" />
            <feComposite in="ink" in2="b" operator="in" />
          </filter>
        </defs>
      )}
      {tint && <rect data-tint="1" x={0} y={0} width={W} height={H} rx={u * 4} fill={inks[1]} opacity={0.14} />}
      {stitch && !sep ? (
        <g data-stitch="1">
          <defs>
            <pattern id={`${sid}-p`} width={1.1} height={1.1} patternUnits="userSpaceOnUse" patternTransform="rotate(38)">
              <rect width={1.1} height={0.5} fill="#000" opacity={0.28} />
              <rect y={0.5} width={1.1} height={0.12} fill="#fff" opacity={0.35} />
            </pattern>
            <mask id={`${sid}-m`} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
              <g filter={`url(#${sid}-w)`}>{art}</g>
            </mask>
            <filter id={`${sid}-w`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter>
            <filter id={`${sid}-d`} x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx={0.25} dy={0.35} stdDeviation={0.3} floodColor="#000" floodOpacity={0.45} /></filter>
          </defs>
          <g filter={`url(#${sid}-d)`}>{art}</g>
          <rect x={0} y={0} width={W} height={H} fill={`url(#${sid}-p)`} mask={`url(#${sid}-m)`} />
        </g>
      ) : art}
      {sep && (
        <g data-marks="1">
          {reg(-M / 2, -M / 2)}{reg(W + M / 2, -M / 2)}{reg(-M / 2, H + M / 2)}{reg(W + M / 2, H + M / 2)}
          <text x={W / 2} y={-M / 2 + 1.5} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={Math.min(4, W / 30)} fill="#000000">{`Film màu ${sep} · ${inks[sep - 1]} · vùng in ${W}×${H}mm`}</text>
        </g>
      )}
    </svg>
  );
}

/** mockup phẳng cả chiếc tạp dề (màu vải, đường may, túi, dây) + vùng in đặt đúng chỗ */
export function ApronMockup({ spec, data, logo, person, style }: { spec: APSpec; data: APData; logo?: string; person?: string; style?: CSSProperties }) {
  const geo = apronGeom(spec.style, spec.pocket);
  const fab = apFabric(spec.fabric);
  const PAD = 110;
  const stitchC = fab.dark ? 'rgba(255,255,255,0.32)' : 'rgba(0,0,0,0.25)';
  const strap = fab.dark ? fab.thread : '#9C8A6A';
  const ties = (
    <g stroke={fab.color} strokeWidth={26} strokeLinecap="round" fill="none">
      {geo.neck && <path d={`M${geo.neck[0][0]} ${geo.neck[0][1]} Q${geo.W / 2} ${-PAD * 1.7} ${geo.neck[1][0]} ${geo.neck[1][1]}`} />}
      <path d={`M${geo.waist[0][0]} ${geo.waist[0][1]} Q${-PAD * 0.7} ${geo.waist[0][1] + 120} ${-PAD * 0.55} ${geo.waist[0][1] + 360}`} />
      <path d={`M${geo.waist[1][0]} ${geo.waist[1][1]} Q${geo.W + PAD * 0.7} ${geo.waist[1][1] + 120} ${geo.W + PAD * 0.55} ${geo.waist[1][1] + 360}`} />
    </g>
  );
  const pid = `apm-${spec.style}-${spec.pocket}`;
  return (
    <svg viewBox={`${-PAD} ${-PAD * 1.9} ${geo.W + PAD * 2} ${geo.H + PAD * 2.4}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <defs><clipPath id={pid}><path d={geo.outline} /></clipPath></defs>
      {ties}
      <g stroke={strap} strokeWidth={2} strokeDasharray="7 5" fill="none" opacity={0.6}>
        {geo.neck && <path d={`M${geo.neck[0][0]} ${geo.neck[0][1]} Q${geo.W / 2} ${-PAD * 1.7} ${geo.neck[1][0]} ${geo.neck[1][1]}`} />}
      </g>
      <path d={geo.outline} fill={fab.color} />
      {fab.denim && <g clipPath={`url(#${pid})`} opacity={0.18}>{Array.from({ length: 140 }, (_, i) => <line key={i} x1={i * 14 - 600} y1={0} x2={i * 14} y2={geo.H} stroke="#fff" strokeWidth={2} />)}</g>}
      <path d={geo.outline} fill="none" stroke={stitchC} strokeWidth={2.4} strokeDasharray="8 6" transform={`translate(${geo.W * 0.012} ${geo.H * 0.012}) scale(0.976)`} />
      {geo.band > 0 && <g><rect x={0} y={0} width={geo.W} height={geo.band} fill="rgba(0,0,0,0.14)" /><line x1={6} y1={geo.band} x2={geo.W - 6} y2={geo.band} stroke={stitchC} strokeWidth={2.4} strokeDasharray="8 6" /></g>}
      {geo.pocket && (
        <g>
          <rect x={geo.pocket.x} y={geo.pocket.y} width={geo.pocket.w} height={geo.pocket.h} rx={10} fill="rgba(0,0,0,0.1)" />
          <rect x={geo.pocket.x + 7} y={geo.pocket.y + 7} width={geo.pocket.w - 14} height={geo.pocket.h - 14} rx={6} fill="none" stroke={stitchC} strokeWidth={2.4} strokeDasharray="8 6" />
          <line x1={geo.pocket.x} y1={geo.pocket.y + 3} x2={geo.pocket.x + geo.pocket.w} y2={geo.pocket.y + 3} stroke="rgba(0,0,0,0.25)" strokeWidth={4} />
          {geo.pocketDiv.map((dx) => <line key={dx} x1={dx} y1={geo.pocket!.y + 8} x2={dx} y2={geo.pocket!.y + geo.pocket!.h - 8} stroke={stitchC} strokeWidth={2.4} strokeDasharray="8 6" />)}
        </g>
      )}
      {(geo.neck || [geo.waist[0], geo.waist[1]]).concat(geo.neck ? [geo.waist[0], geo.waist[1]] : []).map(([gx, gy], i) => <circle key={i} cx={gx} cy={gy + 10} r={9} fill="none" stroke="#C9CDD3" strokeWidth={4} />)}
      <svg x={geo.print.x} y={geo.print.y} width={geo.print.w} height={geo.print.h} viewBox={`0 0 ${geo.print.w} ${geo.print.h}`} overflow="visible">
        <ApronSvg spec={spec} data={data} logo={logo} person={person} stitch={spec.method === 'embroider'} />
      </svg>
    </svg>
  );
}
