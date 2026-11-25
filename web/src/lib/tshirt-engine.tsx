'use client';
// Áo thun đồng phục: 1 engine SVG = BỐ CỤC × MÀU ÁO × BỘ MỰC × FONT → nhiều mẫu, render code 100% (không AI).
// Mỗi VỊ TRÍ IN (ngực trái / giữa ngực / sau lưng / tay áo) là 1 khung SVG đúng kích thước thật (1 = 1mm).
// In lụa: mỗi phần tử thuộc 1 "màu mực" k=1..4 → giới hạn số màu, tách film từng màu (+ film lót trắng khi áo tối).
// DTF: đủ màu. Thêu: chỉ logo ngực/tay (≤4 màu chỉ), xem trước có vân mũi thêu.
// Áo lớp / áo đội / gia đình: danh sách "Tên | Số | Size" → mặt sau riêng từng người + bảng size.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';

// ---------- loại áo, vị trí in ----------
export type TSKind = 'tee' | 'polo';
export const TS_KINDS: { id: TSKind; name: string }[] = [
  { id: 'tee', name: 'Áo thun cổ tròn' },
  { id: 'polo', name: 'Áo polo (cá sấu)' },
];
export type TSPos = 'chest' | 'front' | 'back' | 'sleeve';
export const TS_POS: Record<TSPos, { name: string; w: number; h: number }> = {
  chest: { name: 'Ngực trái (logo)', w: 90, h: 90 },
  front: { name: 'Giữa ngực', w: 280, h: 330 },
  back: { name: 'Sau lưng', w: 300, h: 400 },
  sleeve: { name: 'Tay áo trái', w: 80, h: 80 },
};
export const TS_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL'] as const;
export type TSSize = (typeof TS_SIZES)[number];

// ---------- màu áo ----------
export interface TSColor { id: string; name: string; color: string; dark?: boolean; melange?: boolean }
export const TS_COLORS: TSColor[] = [
  { id: 'trang', name: 'Trắng', color: '#F4F4F1' },
  { id: 'den', name: 'Đen', color: '#1D1E21', dark: true },
  { id: 'navy', name: 'Xanh navy', color: '#1F2A44', dark: true },
  { id: 'do', name: 'Đỏ', color: '#B3252F', dark: true },
  { id: 'vang', name: 'Vàng', color: '#F2C434' },
  { id: 'ngoc', name: 'Xanh ngọc', color: '#0F7B73', dark: true },
  { id: 'xam', name: 'Xám melange', color: '#B3B6BA', melange: true },
  { id: 'duong', name: 'Xanh dương', color: '#2B5BA8', dark: true },
  { id: 'kem', name: 'Kem', color: '#EFE6D2' },
];
export const tsColor = (id: string) => TS_COLORS.find((c) => c.id === id) || TS_COLORS[0];

// ---------- bộ mực (tối đa 4 màu in lụa / 4 màu chỉ thêu) ----------
export interface TSInks { id: string; name: string; c: [string, string, string, string]; forDark?: boolean }
export const TS_INKS: TSInks[] = [
  { id: 'navygold', name: 'Navy vàng', c: ['#1F2A44', '#C8A24A', '#D7263D', '#7A8FB5'] },
  { id: 'black', name: 'Đen đỏ', c: ['#1C1C1C', '#D7263D', '#F2B62E', '#2E86AB'] },
  { id: 'white', name: 'Trắng vàng (áo tối)', c: ['#FFFFFF', '#F2C434', '#F07B5A', '#8FD3C1'], forDark: true },
  { id: 'cream', name: 'Kem cam (áo tối)', c: ['#F4ECDC', '#E9A23B', '#E2725B', '#9CC5E0'], forDark: true },
  { id: 'red', name: 'Đỏ đen', c: ['#B3252F', '#1C1C1C', '#E9A23B', '#2B5BA8'] },
  { id: 'teal', name: 'Ngọc cam', c: ['#0F7B73', '#F28C28', '#1C1C1C', '#F2C434'] },
  { id: 'royal', name: 'Xanh dương vàng', c: ['#2B5BA8', '#F2B62E', '#D7263D', '#1C1C1C'] },
  { id: 'berry', name: 'Nâu hồng', c: ['#5A2E28', '#E07A8F', '#5F9E8F', '#E9A23B'] },
];
export const tsInks = (id: string) => TS_INKS.find((i) => i.id === id) || TS_INKS[0];

// ---------- font (đều có TTF → outline file in) ----------
export interface TSFont { id: string; name: string; family: string; weight: number }
export const TS_FONTS: TSFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const tsFont = (id: string) => TS_FONTS.find((f) => f.id === id) || TS_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT: TS = { fam: 'Dancing Script', wt: 700 };
export const TS_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Bungee&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useTSFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ts-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ts-fonts'; link.rel = 'stylesheet';
        link.href = TS_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TS_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `700 40px "Dancing Script"`, `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- người (áo lớp / đội / gia đình) ----------
export interface TSPerson { name: string; num: string; size: string }
export function parsePeople(s: string): TSPerson[] {
  return (s || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 80).map((l) => {
    const [name = '', num = '', size = ''] = l.split('|').map((x) => x.trim());
    const sz = size.toUpperCase().replace(/\s+/g, '');
    return { name, num: num.replace(/[^\d]/g, '').slice(0, 3), size: (TS_SIZES as readonly string[]).includes(sz) ? sz : '' };
  });
}

// ---------- bố cục ----------
export type TSMethod = 'screen' | 'dtf';
export interface TSSpec {
  kind: TSKind; layout: string; color: string; inks: string; font: string;
  method: TSMethod; nInk: 1 | 2 | 3 | 4; embroider: boolean; sleeve: boolean;
}
export type TSData = Record<string, string>;
export interface TSField { key: string; label: string; multiline?: boolean; ph?: string }

interface LayoutDef {
  id: string; name: string; positions: TSPos[]; perPerson?: boolean; people?: 'names' | 'full';
  fields: TSField[]; sample: TSData;
}
const F = (key: string, label: string, ph?: string): TSField => ({ key, label, ph });
export const TS_LAYOUTS: LayoutDef[] = [
  {
    id: 'company', name: 'Đồng phục công ty', positions: ['chest', 'back'],
    fields: [F('brand', 'Tên công ty / thương hiệu'), F('slogan', 'Slogan (sau lưng)'), F('small', 'Website / hotline')],
    sample: { brand: 'An Khang Group', slogan: 'Tận tâm từ những điều nhỏ nhất', small: 'ankhang.vn · 1900 6868' },
  },
  {
    id: 'class', name: 'Áo lớp', positions: ['front', 'back'], people: 'names',
    fields: [F('cls', 'Tên lớp', '12A1'), F('year', 'Niên khoá', '2024 – 2027'), F('slogan', 'Câu khẩu hiệu'), F('small', 'Tên trường'), F('teacher', 'Dòng sau lưng (GVCN…)')],
    sample: {
      cls: '12A1', year: '2024 – 2027', slogan: 'Thanh xuân rực rỡ', small: 'THPT Nguyễn Thị Minh Khai', teacher: 'GVCN: cô Thu Hà',
      people: 'Quốc Bảo\nThu Hà\nGia Khánh\nBảo Ngọc\nAnh Thư\nĐức Huy\nKhánh Linh\nHoàng Nam\nPhương Vy\nTuấn Kiệt\nMai Chi\nĐăng Khoa\nHà My\nTrung Hiếu\nNgọc Trâm\nThanh Tùng\nYến Nhi\nMinh Châu\nQuang Vinh\nBảo Trâm',
    },
  },
  {
    id: 'jersey', name: 'Áo đội (tên + số)', positions: ['chest', 'back'], perPerson: true, people: 'full',
    fields: [F('brand', 'Tên đội'), F('small', 'Dòng dưới số (năm, giải…)')],
    sample: { brand: 'An Khang FC', small: 'Season 2027', people: 'Quốc Bảo | 10 | L\nThu Hà | 7 | S\nGia Khánh | 9 | M\nBảo Ngọc | 21 | M\nĐức Huy | 4 | XL\nTuấn Kiệt | 99 | L' },
  },
  {
    id: 'team', name: 'Team building', positions: ['front', 'back'], perPerson: true, people: 'full',
    fields: [F('slogan', 'Khẩu hiệu lớn (mặt trước)'), F('event', 'Tên chương trình / năm'), F('brand', 'Công ty')],
    sample: { slogan: 'One team one dream', event: 'Team Building Vũng Tàu 2027', brand: 'An Khang Group', people: 'Quốc Bảo | 01 | L\nThu Hà | 02 | S\nGia Khánh | 03 | M\nBảo Ngọc | 04 | M\nĐức Huy | 05 | XL' },
  },
  {
    id: 'run', name: 'Sự kiện · chạy bộ', positions: ['front', 'back'],
    fields: [F('brand', 'Tên giải / sự kiện'), F('dist', 'Cự ly', '21KM'), F('date', 'Ngày · địa điểm'), F('small', 'Đồng hành (sau lưng)')],
    sample: { brand: 'Sài Gòn Night Run', dist: '21KM', date: '15.03.2027 · Thủ Thiêm', small: 'Đồng hành: An Khang Group · Thu Hà Spa' },
  },
  {
    id: 'family', name: 'Gia đình · du lịch', positions: ['front', 'back'], perPerson: true, people: 'full',
    fields: [F('dest', 'Điểm đến', 'Đà Lạt'), F('year', 'Dòng viết tay', 'Hè 2027'), F('brand', 'Tên gia đình')],
    sample: { dest: 'Đà Lạt', year: 'Hè 2027', brand: 'Gia đình Quốc Bảo', people: 'BỐ | | XL\nMẸ | | M\nCON GÁI | | S\nCON TRAI | | S' },
  },
  {
    id: 'minimal', name: 'Tối giản (chữ ngực)', positions: ['chest'],
    fields: [F('brand', 'Tên shop / quán'), F('small', 'Dòng nhỏ', 'STAFF')],
    sample: { brand: 'An Khang Coffee', small: 'STAFF · SINCE 2021' },
  },
  {
    id: 'crest', name: 'Logo huy hiệu (polo thêu)', positions: ['chest'],
    fields: [F('brand', 'Tên công ty'), F('small', 'Dòng nhỏ dưới logo', 'EST. 2015')],
    sample: { brand: 'Thu Hà Clinic', small: 'EST. 2015' },
  },
];
export const tsLayout = (id: string) => TS_LAYOUTS.find((l) => l.id === id) || TS_LAYOUTS[0];
export const defaultTSData = (layout = 'company'): TSData => ({ name: 'Quốc Bảo', num: '10', ...(tsLayout(layout).sample) });
/** vị trí in đang dùng (tay áo tuỳ chọn) */
export const tsPositions = (spec: TSSpec): TSPos[] => [...tsLayout(spec.layout).positions, ...(spec.sleeve ? ['sleeve' as TSPos] : [])];

export interface TSTemplate { id: string; name: string; spec: Pick<TSSpec, 'kind' | 'layout' | 'color' | 'inks' | 'font' | 'nInk' | 'method' | 'embroider'> }
const T = (id: string, name: string, kind: TSKind, layout: string, color: string, inks: string, font: string, nInk: 1 | 2 | 3 | 4, method: TSMethod = 'screen', embroider = false): TSTemplate =>
  ({ id, name, spec: { kind, layout, color, inks, font, nInk, method, embroider } });
export const TS_TEMPLATES: TSTemplate[] = [
  T('company-navy', 'Công ty · navy', 'tee', 'company', 'navy', 'white', 'montserrat', 2),
  T('company-white', 'Công ty · trắng', 'tee', 'company', 'trang', 'navygold', 'montserrat', 2),
  T('crest-polo-navy', 'Polo thêu · navy', 'polo', 'crest', 'navy', 'cream', 'playfair', 3, 'screen', true),
  T('crest-polo-white', 'Polo thêu · trắng', 'polo', 'crest', 'trang', 'royal', 'playfair', 3, 'screen', true),
  T('class-white', 'Áo lớp · trắng', 'tee', 'class', 'trang', 'black', 'bungee', 3),
  T('class-black', 'Áo lớp · đen', 'tee', 'class', 'den', 'white', 'bungee', 3, 'dtf'),
  T('jersey-red', 'Áo đội · đỏ', 'tee', 'jersey', 'do', 'white', 'oswald', 2),
  T('jersey-navy', 'Áo đội · navy', 'tee', 'jersey', 'navy', 'cream', 'oswald', 2),
  T('team-teal', 'Team building · ngọc', 'tee', 'team', 'ngoc', 'white', 'montserrat', 2),
  T('team-yellow', 'Team building · vàng', 'tee', 'team', 'vang', 'black', 'baloo', 2),
  T('run-white', 'Chạy bộ · trắng', 'tee', 'run', 'trang', 'royal', 'oswald', 3),
  T('run-black', 'Chạy bộ · đen', 'tee', 'run', 'den', 'white', 'oswald', 3),
  T('family-white', 'Gia đình · trắng', 'tee', 'family', 'trang', 'berry', 'baloo', 4, 'dtf'),
  T('minimal-grey', 'Tối giản · xám', 'tee', 'minimal', 'xam', 'black', 'oswald', 1),
];

// ---------- màu ----------
const lum = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** mực k (1..4) sau khi gộp theo số màu in lụa */
export const mapInk = (spec: Pick<TSSpec, 'method' | 'nInk'>, k: number) => (spec.method === 'screen' ? Math.min(k, spec.nInk) : k);
export function tsUsedInks(spec: TSSpec): { k: number; color: string }[] {
  const inks = tsInks(spec.inks).c;
  const n = spec.method === 'screen' ? spec.nInk : 4;
  return Array.from({ length: n }, (_, i) => ({ k: i + 1, color: inks[i] }));
}
/** mực chính gần màu áo → in chìm */
export const lowContrast = (spec: TSSpec) => Math.abs(lum(tsInks(spec.inks).c[0]) - lum(tsColor(spec.color).color)) < 0.28;
/** in lụa trên áo tối cần thêm 1 film lót trắng dưới các màu */
export const needUnderbase = (spec: TSSpec) => spec.method === 'screen' && !!tsColor(spec.color).dark;
/** vị trí thêu (logo ngực / tay) */
export const isStitched = (spec: TSSpec, pos: TSPos) => spec.embroider && (pos === 'chest' || pos === 'sleeve');

// ---------- đo chữ ----------
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
  const tsAt = (s: number): TS => ({ ...ts, ls: ts.ls ? (ts.ls * s) / size : 0 });
  let s = size, lines = wrap(text, maxW, s, tsAt(s));
  const tooBig = () => lines.length > maxLines || lines.length * s * lh > maxH || lines.some((l) => textW(l, s, tsAt(s)) > maxW + 0.01);
  let guard = 0;
  while (tooBig() && guard++ < 90) { s *= 0.95; lines = wrap(text, maxW, s, tsAt(s)); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(text, mid, s, tsAt(s)).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrap(text, hi, s, tsAt(s));
  }
  return { lines, size: s, ls: tsAt(s).ls || 0 };
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
const digitCache = new Map<string, { asc: number; desc: number }>();
function digitMetrics(ts: TS) {
  const key = `${ts.wt} ${ts.fam}`;
  let m = digitCache.get(key);
  if (!m) {
    m = { asc: 0.75, desc: 0.02 };
    if (typeof document !== 'undefined') {
      const cx = document.createElement('canvas').getContext('2d');
      if (cx) {
        cx.font = `${ts.wt} 100px "${ts.fam}"`;
        const mt = cx.measureText('0123456789');
        if (mt.actualBoundingBoxAscent) m = { asc: mt.actualBoundingBoxAscent / 100 + 0.02, desc: Math.max(0.02, mt.actualBoundingBoxDescent / 100 + 0.02) };
      }
    }
    digitCache.set(key, m);
  }
  return m;
}
type Anchor = 'start' | 'middle' | 'end';
interface Region { x: number; top: number; bottom: number; maxW: number; anchor?: Anchor }
function textBlock(text: string, ts: TS, r: Region, o: { size: number; maxLines?: number; lh?: number; fill: string; upper?: boolean; key?: string; stroke?: string; sw?: number }): ReactNode {
  // sw: chừa chỗ viền chữ (cả bản có viền lẫn bản không viền dùng chung để 2 lớp khớp nhau)
  let t = (o.upper ? (text || '').toUpperCase() : text || '').trim();
  if (!t) return null;
  const lh = o.lh ?? 1.12;
  const segs = t.split(' · ');
  if (segs.length > 1 && segs.length <= (o.maxLines ?? 1) && textW(t, o.size, ts) > r.maxW) t = segs.join('\n');
  // chỉ số (số áo đấu): canh theo chiều cao chữ số thật, không chừa chỗ dấu tiếng Việt → số to đúng khung
  const { asc, desc } = /^[\d\s]+$/.test(t) ? digitMetrics(ts) : metrics(ts);
  const avail = r.bottom - r.top;
  const pad = o.sw ? o.sw : 0; // viền chữ ăn ra ngoài
  const mw = r.maxW - pad * 2;
  let s0 = o.size, fit = fitLines(t, mw, avail, s0, ts, o.maxLines ?? 1, lh);
  const hOf = (n: number, sz: number) => sz * asc + (n - 1) * sz * lh + sz * desc + pad * 2;
  for (let i = 0; i < 40 && hOf(fit.lines.length, fit.size) > avail; i++) { s0 = fit.size * 0.95; fit = fitLines(t, mw, avail, s0, ts, o.maxLines ?? 1, lh); }
  const { lines, size, ls } = fit;
  const blockH = hOf(lines.length, size);
  const y0 = r.top + Math.max(0, (avail - blockH) / 2) + pad + size * asc;
  return (
    <text key={o.key} textAnchor={r.anchor || 'middle'} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size.toFixed(2)} fill={o.fill}
      letterSpacing={ls ? ls.toFixed(2) : undefined} stroke={o.stroke} strokeWidth={o.stroke && o.sw ? o.sw * 2 : undefined} strokeLinejoin={o.stroke ? 'round' : undefined}>
      {lines.map((l, i) => <tspan key={i} x={r.x} y={(y0 + i * size * lh).toFixed(2)}>{l}</tspan>)}
    </text>
  );
}
/** chữ 2 màu: lớp viền (mực kS) nằm dưới, lớp ruột (mực kF) nằm trên — mỗi lớp 1 màu → tách film đúng */
function twoTone(text: string, ts: TS, r: Region, o: { size: number; maxLines?: number; lh?: number; upper?: boolean; key: string; sw: number }, c: (k: number) => string, kF: 1 | 2 | 3 | 4, kS: 1 | 2 | 3 | 4): Item[] {
  return [
    { k: kS, n: textBlock(text, ts, r, { ...o, fill: c(kS), stroke: c(kS), key: `${o.key}-s` }) },
    { k: kF, n: textBlock(text, ts, r, { ...o, fill: c(kF), key: `${o.key}-f` }) },
  ];
}
/** chữ chạy theo cung tròn, mỗi kí tự 1 <text> (outline được) */
function arcText(text: string, ts: TS, cx: number, cy: number, rr: number, size: number, maxDeg: number, fill: string, bottom = false): ReactNode {
  const t = (text || '').trim();
  if (!t) return null;
  const chars = [...t];
  const gap = size * 0.1;
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
        const rb = bottom ? rr + s * 0.35 : rr - s * 0.35;
        const x = cx + rb * Math.cos(a), y = cy + rb * Math.sin(a);
        const rot = (a * 180) / Math.PI + (bottom ? -90 : 90);
        return <text key={i} x={x.toFixed(2)} y={y.toFixed(2)} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={s.toFixed(2)} fill={fill} transform={`rotate(${rot.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)})`}>{ch}</text>;
      })}
    </g>
  );
}
function initials(brand: string) {
  const ws = (brand || '').replace(/^(công ty|cty|tnhh|gia đình)\s+/i, '').trim().split(/\s+/).filter(Boolean);
  return (ws.length > 1 ? ws[0][0] + ws[1][0] : (ws[0] || 'A').slice(0, 2)).toUpperCase();
}
const star5 = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
};
const leafPath = (l: number, w: number) => `M0 0 C${w} ${-l * 0.25} ${w * 0.9} ${-l * 0.75} 0 ${-l} C${-w * 0.9} ${-l * 0.75} ${-w} ${-l * 0.25} 0 0Z`;
const heart = (cx: number, cy: number, s: number) => `M${cx} ${cy + s * 0.9} C${cx - s * 1.6} ${cy - s * 0.1} ${cx - s * 0.9} ${cy - s * 1.25} ${cx} ${cy - s * 0.45} C${cx + s * 0.9} ${cy - s * 1.25} ${cx + s * 1.6} ${cy - s * 0.1} ${cx} ${cy + s * 0.9}Z`;

// ---------- vẽ 1 vị trí ----------
interface Item { k: 0 | 1 | 2 | 3 | 4; n: ReactNode }
interface Ctx {
  W: number; H: number; u: number; data: TSData; c: (k: number) => string; disp: TS;
  logo: boolean; logoBox: (x: number, y: number, w: number, h: number) => ReactNode;
  person: TSPerson; people: TSPerson[]; uid: string;
}
type Draw = (x: Ctx) => Item[];

/** logo khách hoặc chữ cái đầu trong vòng tròn */
function mark(x: Ctx, cx: number, cy: number, r: number, k1: 1 | 2 | 3 | 4, k2: 1 | 2 | 3 | 4, brand: string, key: string): Item[] {
  if (x.logo) return [{ k: 1, n: <g key={key}>{x.logoBox(cx - r, cy - r, r * 2, r * 2)}</g> }];
  const ini = initials(brand);
  let s = r * 0.95; const w = textW(ini, s, x.disp); if (w > r * 1.35) s = (s * r * 1.35) / w;
  return [
    { k: k1, n: <circle key={`${key}o`} cx={cx} cy={cy} r={r - r * 0.06} fill="none" stroke={x.c(k1)} strokeWidth={r * 0.1} /> },
    { k: k2, n: <text key={`${key}t`} x={cx} y={cy + s * 0.35} textAnchor="middle" fontFamily={`"${x.disp.fam}"`} fontWeight={x.disp.wt} fontSize={s.toFixed(2)} fill={x.c(k2)}>{ini}</text> },
  ];
}

const sleeveDefault: Draw = (x) => {
  const { W, H, c, data } = x;
  const brand = data.brand || data.cls || data.dest || data.slogan || '';
  return [
    ...mark(x, W / 2, H * 0.36, H * 0.3, 1, 2, brand, 'sm'),
    { k: 1, n: textBlock(brand, { fam: BODY, wt: 800, ls: 0.6 }, { x: W / 2, top: H * 0.72, bottom: H * 0.94, maxW: W * 0.92 }, { size: H * 0.14, upper: true, fill: c(1), key: 'sb' }) },
  ];
};

const DRAW: Record<string, Partial<Record<TSPos, Draw>>> = {
  company: {
    chest: (x) => {
      const { W, H, c, data } = x;
      return [
        ...mark(x, W / 2, H * 0.33, H * 0.3, 1, 2, data.brand, 'm'),
        { k: 1, n: textBlock(data.brand, { fam: BODY, wt: 800, ls: 0.5 }, { x: W / 2, top: H * 0.67, bottom: H * 0.86, maxW: W * 0.96 }, { size: H * 0.13, upper: true, fill: c(1), key: 'b' }) },
        { k: 2, n: <line key="l" x1={W * 0.3} y1={H * 0.9} x2={W * 0.7} y2={H * 0.9} stroke={c(2)} strokeWidth={0.9} /> },
      ];
    },
    back: (x) => {
      const { W, H, c, data, disp } = x;
      return [
        { k: 1, n: textBlock(data.brand, disp, { x: W / 2, top: H * 0.04, bottom: H * 0.27, maxW: W * 0.94 }, { size: H * 0.13, maxLines: 2, lh: 1.02, upper: true, fill: c(1), key: 'b' }) },
        { k: 2, n: <path key="st" d={`${star5(W / 2 - 34, H * 0.305, 4.5)} ${star5(W / 2, H * 0.305, 6)} ${star5(W / 2 + 34, H * 0.305, 4.5)}`} fill={c(2)} /> },
        { k: 2, n: textBlock(data.slogan, SCRIPT, { x: W / 2, top: H * 0.33, bottom: H * 0.45, maxW: W * 0.92 }, { size: H * 0.07, maxLines: 2, lh: 1, fill: c(2), key: 's' }) },
        { k: 1, n: textBlock(data.small, { fam: BODY, wt: 800, ls: 1 }, { x: W / 2, top: H * 0.47, bottom: H * 0.53, maxW: W * 0.9 }, { size: H * 0.035, fill: c(1), key: 'w' }) },
      ];
    },
  },

  class: {
    front: (x) => {
      const { W, H, c, data, disp, u } = x;
      const items: Item[] = [
        { k: 2, n: textBlock('CLASS OF', { fam: BODY, wt: 800, ls: 4 }, { x: W / 2, top: H * 0.02, bottom: H * 0.1, maxW: W * 0.6 }, { size: H * 0.05, fill: c(2), key: 'co' }) },
        ...twoTone(data.cls, disp, { x: W / 2, top: H * 0.1, bottom: H * 0.5, maxW: W * 0.96 }, { size: H * 0.36, lh: 1, sw: u * 0.9, key: 'cl' }, c, 1, 2),
      ];
      const yy = H * 0.565;
      items.push({ k: 2, n: <g key="rule"><line x1={W * 0.04} y1={yy} x2={W * 0.22} y2={yy} stroke={c(2)} strokeWidth={u * 0.8} /><line x1={W * 0.78} y1={yy} x2={W * 0.96} y2={yy} stroke={c(2)} strokeWidth={u * 0.8} /></g> });
      items.push({ k: 2, n: textBlock(data.year, { fam: 'Oswald', wt: 700, ls: 1.5 }, { x: W / 2, top: H * 0.52, bottom: H * 0.61, maxW: W * 0.52 }, { size: H * 0.07, fill: c(2), key: 'y' }) });
      items.push({ k: 3, n: textBlock(data.slogan, SCRIPT, { x: W / 2, top: H * 0.63, bottom: H * 0.86, maxW: W * 0.94 }, { size: H * 0.13, maxLines: 2, lh: 0.95, fill: c(3), key: 's' }) });
      items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 800, ls: 1.2 }, { x: W / 2, top: H * 0.88, bottom: H * 0.98, maxW: W * 0.9 }, { size: H * 0.04, upper: true, fill: c(1), key: 'sc' }) });
      return items;
    },
    back: (x) => {
      const { W, H, c, data, disp, people } = x;
      const items: Item[] = [
        { k: 1, n: textBlock(data.cls, disp, { x: W / 2, top: H * 0.0, bottom: H * 0.12, maxW: W * 0.7 }, { size: H * 0.1, fill: c(1), key: 'cl' }) },
        { k: 2, n: textBlock(data.teacher, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.125, bottom: H * 0.17, maxW: W * 0.9 }, { size: H * 0.03, fill: c(2), key: 't' }) },
      ];
      const names = people.map((p) => p.name).filter(Boolean);
      if (names.length) {
        const cols = names.length > 24 ? 4 : names.length > 8 ? 3 : 2;
        const rows = Math.ceil(names.length / cols);
        const top = H * 0.2, bottom = H * 0.9, cw = W / cols, rh = Math.min(H * 0.07, (bottom - top) / rows);
        const y0 = top + ((bottom - top) - rh * rows) / 2;
        const ts: TS = { fam: BODY, wt: 800 };
        // cỡ chung theo đa số tên (phân vị 80%); tên quá dài tự co riêng → tên ngắn không bị kéo nhỏ theo
        const base = rh * 0.52;
        const fitOf = (n: string) => { const w = textW(n, base, ts); return w > cw * 0.74 ? (base * cw * 0.74) / w : base; };
        const fits = names.map(fitOf).sort((a, b) => a - b);
        const size = Math.min(base, fits[Math.floor(fits.length * 0.2)]);
        names.forEach((n, i) => {
          const r = Math.floor(i / cols), col = i % cols;
          const nInRow = Math.min(cols, names.length - r * cols);
          const ox = (W - nInRow * cw) / 2;
          const cx = ox + col * cw + cw / 2, cy = y0 + r * rh + rh * 0.5;
          const sz = Math.min(size, fitOf(n));
          items.push({ k: 1, n: <text key={`n${i}`} x={cx.toFixed(2)} y={(cy + sz * 0.36).toFixed(2)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={sz.toFixed(2)} fill={c(1)}>{n}</text> });
          if (col < nInRow - 1) items.push({ k: 2, n: <path key={`h${i}`} d={heart(ox + (col + 1) * cw, cy, Math.min(rh * 0.1, 3.2))} fill={c(2)} /> });
        });
      }
      items.push({ k: 3, n: textBlock(data.slogan, SCRIPT, { x: W / 2, top: H * 0.91, bottom: H * 0.99, maxW: W * 0.8 }, { size: H * 0.06, fill: c(3), key: 's' }) });
      return items;
    },
  },

  jersey: {
    chest: (x) => {
      const { W, H, c, data, disp } = x;
      const shield = `M${W * 0.18} ${H * 0.06} L${W * 0.82} ${H * 0.06} L${W * 0.82} ${H * 0.5} C${W * 0.82} ${H * 0.74} ${W * 0.62} ${H * 0.86} ${W * 0.5} ${H * 0.95} C${W * 0.38} ${H * 0.86} ${W * 0.18} ${H * 0.74} ${W * 0.18} ${H * 0.5} Z`;
      const items: Item[] = [{ k: 1, n: <path key="sh" d={shield} fill="none" stroke={c(1)} strokeWidth={2.6} strokeLinejoin="round" /> }];
      if (x.logo) items.push({ k: 1, n: <g key="lg">{x.logoBox(W * 0.27, H * 0.16, W * 0.46, H * 0.46)}</g> });
      else {
        items.push({ k: 2, n: <path key="s1" d={star5(W / 2, H * 0.19, 5)} fill={c(2)} /> });
        items.push({ k: 1, n: textBlock(initials(data.brand), disp, { x: W / 2, top: H * 0.27, bottom: H * 0.6, maxW: W * 0.5 }, { size: H * 0.3, fill: c(1), key: 'i' }) });
      }
      items.push({ k: 2, n: textBlock(data.brand, { fam: BODY, wt: 800, ls: 0.4 }, { x: W / 2, top: H * 0.62, bottom: H * 0.75, maxW: W * 0.48 }, { size: H * 0.08, upper: true, fill: c(2), key: 'b' }) });
      return items;
    },
    back: (x) => {
      const { W, H, c, data, disp, person, u } = x;
      const num = person.num || data.num || '10';
      return [
        { k: 1, n: textBlock(person.name || data.name, { fam: disp.fam, wt: disp.wt, ls: 2 }, { x: W / 2, top: H * 0.03, bottom: H * 0.16, maxW: W * 0.9 }, { size: H * 0.1, upper: true, fill: c(1), key: 'n' }) },
        ...twoTone(num, disp, { x: W / 2, top: H * 0.19, bottom: H * 0.8, maxW: W * 0.9 }, { size: H * 0.6, lh: 1, sw: u * 1.6, key: 'num' }, c, 1, 2),
        { k: 2, n: textBlock(data.small, { fam: BODY, wt: 800, ls: 2 }, { x: W / 2, top: H * 0.83, bottom: H * 0.9, maxW: W * 0.8 }, { size: H * 0.04, upper: true, fill: c(2), key: 's' }) },
      ];
    },
  },

  team: {
    front: (x) => {
      const { W, H, c, data, disp, uid } = x;
      const items: Item[] = [];
      // tia sáng sau chữ (cắt trong khung)
      const cid = `tsray-${uid}`;
      const rays = Array.from({ length: 16 }, (_, i) => {
        const a0 = (i / 16) * Math.PI * 2, a1 = a0 + Math.PI / 30, r0 = W * 0.35, R = W * 0.46, cx = W / 2, cy = H * 0.4;
        return `M${(cx + r0 * Math.cos(a0)).toFixed(1)} ${(cy + r0 * Math.sin(a0)).toFixed(1)} L${(cx + R * Math.cos(a0)).toFixed(1)} ${(cy + R * Math.sin(a0)).toFixed(1)} L${(cx + R * Math.cos(a1)).toFixed(1)} ${(cy + R * Math.sin(a1)).toFixed(1)} L${(cx + r0 * Math.cos(a1)).toFixed(1)} ${(cy + r0 * Math.sin(a1)).toFixed(1)}Z`;
      }).join(' ');
      items.push({ k: 2, n: <g key="rays"><defs><clipPath id={cid}><rect x={0} y={0} width={W} height={H} /></clipPath></defs><path d={rays} fill={c(2)} opacity={1} clipPath={`url(#${cid})`} /></g> });
      items.push({ k: 1, n: textBlock(data.slogan, disp, { x: W / 2, top: H * 0.4 - W * 0.25, bottom: H * 0.4 + W * 0.25, maxW: W * 0.6 }, { size: H * 0.13, maxLines: 4, lh: 0.98, upper: true, fill: c(1), key: 's' }) });
      items.push({ k: 2, n: textBlock(data.event, { fam: BODY, wt: 800, ls: 1 }, { x: W / 2, top: H * 0.8, bottom: H * 0.9, maxW: W * 0.94 }, { size: H * 0.05, maxLines: 2, upper: true, fill: c(2), key: 'e' }) });
      items.push({ k: 1, n: textBlock(data.brand, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.91, bottom: H * 0.99, maxW: W * 0.8 }, { size: H * 0.04, fill: c(1), key: 'b' }) });
      return items;
    },
    back: (x) => {
      const { W, H, c, data, disp, person } = x;
      const num = person.num || data.num || '';
      const items: Item[] = [
        { k: 1, n: textBlock(person.name || data.name, disp, { x: W / 2, top: H * 0.04, bottom: H * 0.2, maxW: W * 0.92 }, { size: H * 0.11, upper: true, fill: c(1), key: 'n' }) },
      ];
      if (num) items.push({ k: 2, n: textBlock(num, disp, { x: W / 2, top: H * 0.21, bottom: H * 0.5, maxW: W * 0.6 }, { size: H * 0.26, fill: c(2), key: 'num' }) });
      items.push({ k: 1, n: textBlock(data.event, { fam: BODY, wt: 800, ls: 1 }, { x: W / 2, top: num ? H * 0.52 : H * 0.23, bottom: num ? H * 0.6 : H * 0.31, maxW: W * 0.86 }, { size: H * 0.035, maxLines: 2, upper: true, fill: c(1), key: 'e' }) });
      return items;
    },
  },

  run: {
    front: (x) => {
      const { W, H, c, data, disp, uid, u } = x;
      const cx = W / 2, cy = H * 0.33, R = Math.min(W * 0.4, H * 0.3);
      const cid = `tsrun-${uid}`;
      const items: Item[] = [
        { k: 1, n: <circle key="ring" cx={cx} cy={cy} r={R} fill="none" stroke={c(1)} strokeWidth={u * 1.3} /> },
        { k: 1, n: <circle key="ring2" cx={cx} cy={cy} r={R * 0.74} fill="none" stroke={c(1)} strokeWidth={u * 0.5} /> },
      ];
      const r2 = R * 0.74;
      // phố đêm: dãy nhà + cầu (cắt trong vòng trong)
      const city = `M${cx - r2} ${cy + r2 * 0.4} ` + [[-0.9, 0.15], [-0.75, 0.15], [-0.75, -0.1], [-0.6, -0.1], [-0.6, 0.05], [-0.45, 0.05], [-0.45, -0.45], [-0.35, -0.55], [-0.25, -0.45], [-0.25, 0.0], [-0.1, 0.0], [-0.1, -0.25], [0.05, -0.25], [0.05, 0.1], [0.2, 0.1], [0.2, -0.7], [0.24, -0.85], [0.28, -0.7], [0.28, 0.05], [0.45, 0.05], [0.45, -0.2], [0.6, -0.2], [0.6, 0.12], [0.95, 0.12]]
        .map(([px, py]) => `L${(cx + px * r2).toFixed(1)} ${(cy + py * r2).toFixed(1)}`).join(' ') + ` L${cx + r2} ${cy + r2} L${cx - r2} ${cy + r2}Z`;
      items.push({ k: 2, n: <g key="city"><defs><clipPath id={cid}><circle cx={cx} cy={cy} r={r2 - u * 0.6} /></clipPath></defs><path d={city} fill={c(2)} clipPath={`url(#${cid})`} /></g> });
      items.push({ k: 3, n: <path key="route" d={`M${cx - r2 * 0.85} ${cy + r2 * 0.62} C${cx - r2 * 0.3} ${cy + r2 * 0.3} ${cx + r2 * 0.1} ${cy + r2 * 0.85} ${cx + r2 * 0.8} ${cy + r2 * 0.5}`} fill="none" stroke={c(3)} strokeWidth={u * 0.9} strokeDasharray={`${u * 2.2} ${u * 1.4}`} strokeLinecap="round" clipPath={`url(#${cid})`} /> });
      items.push({ k: 3, n: <circle key="moon" cx={cx + r2 * 0.5} cy={cy - r2 * 0.5} r={r2 * 0.13} fill={c(3)} /> });
      items.push({ k: 1, n: <g key="arc">{arcText((data.brand || '').toUpperCase(), { fam: BODY, wt: 800 }, cx, cy, (R + r2) / 2, (R - r2) * 0.55, 160, c(1))}</g> });
      items.push({ k: 1, n: textBlock(data.dist, disp, { x: cx, top: H * 0.66, bottom: H * 0.86, maxW: W * 0.9 }, { size: H * 0.18, fill: c(1), key: 'd' }) });
      items.push({ k: 2, n: textBlock(data.date, { fam: BODY, wt: 800, ls: 0.8 }, { x: cx, top: H * 0.87, bottom: H * 0.97, maxW: W * 0.9 }, { size: H * 0.04, maxLines: 2, fill: c(2), key: 'dt' }) });
      return items;
    },
    back: (x) => {
      const { W, H, c, data, disp, u } = x;
      const pts = Array.from({ length: 41 }, (_, i) => {
        const t = i / 40;
        const y = 0.55 - 0.3 * Math.sin(t * Math.PI * 2.3) * Math.sin(t * Math.PI) - 0.12 * Math.sin(t * 17);
        return `${i ? 'L' : 'M'}${(W * 0.06 + t * W * 0.88).toFixed(1)} ${(H * 0.36 + y * H * 0.1).toFixed(1)}`;
      }).join(' ');
      return [
        { k: 1, n: textBlock('FINISHER', disp, { x: W / 2, top: H * 0.04, bottom: H * 0.22, maxW: W * 0.94 }, { size: H * 0.16, fill: c(1), key: 'f' }) },
        { k: 2, n: textBlock(data.brand, { fam: BODY, wt: 800, ls: 1.5 }, { x: W / 2, top: H * 0.23, bottom: H * 0.3, maxW: W * 0.9 }, { size: H * 0.04, upper: true, fill: c(2), key: 'b' }) },
        { k: 3, n: <path key="elev" d={pts} fill="none" stroke={c(3)} strokeWidth={u * 0.8} strokeLinejoin="round" /> },
        { k: 2, n: textBlock(data.dist, disp, { x: W / 2, top: H * 0.43, bottom: H * 0.52, maxW: W * 0.5 }, { size: H * 0.07, fill: c(2), key: 'd' }) },
        { k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.56, bottom: H * 0.64, maxW: W * 0.9 }, { size: H * 0.03, maxLines: 2, fill: c(1), key: 's' }) },
      ];
    },
  },

  family: {
    front: (x) => {
      const { W, H, c, data, disp, u } = x;
      const gy = H * 0.5; // chân núi
      const items: Item[] = [
        { k: 3, n: <circle key="sun" cx={W * 0.66} cy={H * 0.2} r={W * 0.13} fill={c(3)} /> },
        { k: 2, n: <path key="mt" d={`M${W * 0.04} ${gy} L${W * 0.3} ${H * 0.16} L${W * 0.45} ${H * 0.32} L${W * 0.6} ${H * 0.2} L${W * 0.96} ${gy} Z`} fill={c(2)} /> },
        { k: 4, n: <path key="snow" d={`M${W * 0.3} ${H * 0.16} L${W * 0.36} ${H * 0.24} L${W * 0.32} ${H * 0.23} L${W * 0.29} ${H * 0.26} L${W * 0.26} ${H * 0.21}Z`} fill={c(4)} /> },
      ];
      // rừng thông
      [[0.12, 0.42, 1], [0.2, 0.46, 0.8], [0.78, 0.43, 1.05], [0.88, 0.47, 0.75], [0.7, 0.48, 0.7]].forEach(([px, py, s], i) => {
        const h = H * 0.17 * s, w = h * 0.42, tx = W * px, ty = H * py;
        items.push({ k: 1, n: <path key={`t${i}`} d={`M${tx} ${ty - h} L${tx + w * 0.55} ${ty - h * 0.45} L${tx + w * 0.3} ${ty - h * 0.45} L${tx + w * 0.75} ${ty} L${tx - w * 0.75} ${ty} L${tx - w * 0.3} ${ty - h * 0.45} L${tx - w * 0.55} ${ty - h * 0.45}Z M${tx - u * 0.9} ${ty} L${tx + u * 0.9} ${ty} L${tx + u * 0.9} ${ty + u * 3} L${tx - u * 0.9} ${ty + u * 3}Z`} fill={c(1)} /> });
      });
      items.push({ k: 1, n: <line key="g" x1={W * 0.02} y1={gy + u * 3} x2={W * 0.98} y2={gy + u * 3} stroke={c(1)} strokeWidth={u * 0.7} strokeLinecap="round" /> });
      items.push({ k: 1, n: textBlock(data.dest, disp, { x: W / 2, top: H * 0.54, bottom: H * 0.76, maxW: W * 0.94 }, { size: H * 0.22, upper: true, fill: c(1), key: 'd' }) });
      items.push({ k: 2, n: textBlock(data.year, SCRIPT, { x: W / 2, top: H * 0.74, bottom: H * 0.87, maxW: W * 0.8 }, { size: H * 0.1, fill: c(2), key: 'y' }) });
      items.push({ k: 1, n: textBlock(data.brand, { fam: BODY, wt: 800, ls: 1 }, { x: W / 2, top: H * 0.89, bottom: H * 0.97, maxW: W * 0.9 }, { size: H * 0.04, upper: true, fill: c(1), key: 'b' }) });
      return items;
    },
    back: (x) => {
      const { W, H, c, data, disp, person } = x;
      return [
        { k: 1, n: textBlock(person.name || data.name, disp, { x: W / 2, top: H * 0.03, bottom: H * 0.3, maxW: W * 0.9 }, { size: H * 0.22, maxLines: 2, lh: 1, upper: true, fill: c(1), key: 'n' }) },
        { k: 2, n: <path key="h" d={heart(W / 2, H * 0.345, 12)} fill={c(2)} /> },
        { k: 1, n: textBlock(data.brand, { fam: BODY, wt: 800, ls: 1 }, { x: W / 2, top: H * 0.39, bottom: H * 0.45, maxW: W * 0.9 }, { size: H * 0.035, upper: true, fill: c(1), key: 'b' }) },
      ];
    },
  },

  minimal: {
    chest: (x) => {
      const { W, H, c, data, disp } = x;
      return [
        { k: 1, n: textBlock(data.brand, { fam: disp.fam, wt: disp.wt, ls: 0.6 }, { x: W / 2, top: H * 0.18, bottom: H * 0.58, maxW: W * 0.96 }, { size: H * 0.22, maxLines: 2, lh: 1, upper: true, fill: c(1), key: 'b' }) },
        { k: 1, n: <line key="l" x1={W * 0.36} y1={H * 0.64} x2={W * 0.64} y2={H * 0.64} stroke={c(1)} strokeWidth={0.8} /> },
        { k: 1, n: textBlock(data.small, { fam: BODY, wt: 800, ls: 1 }, { x: W / 2, top: H * 0.68, bottom: H * 0.8, maxW: W * 0.92 }, { size: H * 0.08, upper: true, fill: c(1), key: 's' }) },
      ];
    },
  },

  crest: {
    chest: (x) => {
      const { W, H, c, data } = x;
      const cx = W / 2, cy = H * 0.36, r = H * 0.22;
      const items: Item[] = [...mark(x, cx, cy, r, 1, 2, data.brand, 'm')];
      // 2 cành nguyệt quế ôm 2 bên vòng tròn (từ đáy vòng lên)
      const R2 = r + 6;
      for (const side of [-1, 1]) {
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 2 + side * (0.42 + i * 0.34); // góc trên vòng (y xuống): đáy = π/2
          const px = cx + R2 * Math.cos(a), py = cy + R2 * Math.sin(a);
          const tang = (a * 180) / Math.PI + (side > 0 ? 180 : 0); // lá chĩa theo chiều đi lên của cành
          items.push({ k: 3, n: <path key={`lf${side}${i}`} d={leafPath(7.5, 3)} fill={c(3)} transform={`translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${(tang + side * 35).toFixed(1)})`} /> });
        }
      }
      items.push({ k: 1, n: textBlock(data.brand, { fam: BODY, wt: 800, ls: 0.4 }, { x: cx, top: H * 0.68, bottom: H * 0.84, maxW: W * 0.96 }, { size: H * 0.12, upper: true, fill: c(1), key: 'b' }) });
      items.push({ k: 2, n: textBlock(data.small, { fam: BODY, wt: 800, ls: 1.2 }, { x: cx, top: H * 0.85, bottom: H * 0.95, maxW: W * 0.7 }, { size: H * 0.07, upper: true, fill: c(2), key: 's' }) });
      return items;
    },
  },
};

/** các màu mực (đã gộp theo số màu in lụa) thật sự có mặt ở 1 vị trí — để chỉ ra film cần thiết */
export function inkSet(spec: TSSpec, data: TSData, pos: TSPos, hasLogo: boolean, person?: TSPerson): number[] {
  const P = TS_POS[pos];
  const people = parsePeople(data.people || '');
  const ps: TSPerson = person || people[0] || { name: data.name || '', num: data.num || '', size: '' };
  const f = tsFont(spec.font);
  const ctx: Ctx = {
    W: P.w, H: P.h, u: P.w / 100, data, c: () => '#000000', disp: { fam: f.family, wt: f.weight },
    logo: hasLogo, logoBox: () => (hasLogo ? <g /> : null), person: ps, people, uid: 'probe',
  };
  const draw = DRAW[spec.layout]?.[pos] || (pos === 'sleeve' ? sleeveDefault : null);
  const ks = new Set<number>();
  for (const it of draw ? draw(ctx) : []) if (it.n && it.k > 0) ks.add(mapInk(spec, it.k));
  return [...ks].sort();
}

/** 1 vị trí in. sep = 1..4 → film tách màu; 'u' → film lót trắng. stitch → xem trước vân thêu.
 *  box → lồng vào SVG khác (mockup áo) đúng chỗ. */
export function TShirtSvg({ spec, data, pos, logo, person, sep, stitch, style, box, personIdx }: {
  spec: TSSpec; data: TSData; pos: TSPos; logo?: string; person?: TSPerson; sep?: 1 | 2 | 3 | 4 | 'u'; stitch?: boolean; style?: CSSProperties; personIdx?: number;
  box?: { x: number; y: number; w: number; h: number };
}) {
  const P = TS_POS[pos];
  const W = P.w, H = P.h, u = W / 100;
  const inks = tsInks(spec.inks).c;
  const f = tsFont(spec.font);
  const c = (k: number) => (sep ? '#000000' : inks[Math.max(1, mapInk(spec, k)) - 1]);
  const screen = spec.method === 'screen' || isStitched(spec, pos);
  const uid = `${pos}-${sep || 0}-${box ? 'm' : 'p'}-${spec.layout}-${spec.inks}-${(person?.name || '').length}${person?.num || ''}`.replace(/[^\w-]/g, '');
  const fid = `tslogo-${uid}`;
  const logoBox = (lx: number, ly: number, lw: number, lh: number) => logo
    ? <image key="logo" href={logo} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="xMidYMid meet" filter={screen || sep ? `url(#${fid})` : undefined} />
    : null;
  const people = parsePeople(data.people || '');
  const ps: TSPerson = person || people[0] || { name: data.name || '', num: data.num || '', size: '' };
  const ctx: Ctx = { W, H, u, data, c, disp: { fam: f.family, wt: f.weight }, logo: !!logo, logoBox, person: ps, people, uid };
  const draw = DRAW[spec.layout]?.[pos] || (pos === 'sleeve' ? sleeveDefault : null);
  let items = draw ? draw(ctx).filter((it) => it.n) : [];
  if (sep === 'u') items = items.filter((it) => it.k > 0);
  else if (sep) items = items.filter((it) => it.k > 0 && mapInk(spec, it.k) === sep);
  const M = sep ? 15 : 0;
  const vb = `${-M} ${-M} ${W + M * 2} ${H + M * 2}`;
  const reg = (rx: number, ry: number) => (
    <g key={`${rx}-${ry}`} stroke="#000000" strokeWidth={0.25} fill="none"><circle cx={rx} cy={ry} r={3} /><line x1={rx - 5} y1={ry} x2={rx + 5} y2={ry} /><line x1={rx} y1={ry - 5} x2={rx} y2={ry + 5} /></g>
  );
  const sid = `tsst-${uid}`;
  const art = items.map((it, i) => <g key={i} data-ink={it.k}>{it.n}</g>);
  const sepLabel = sep === 'u' ? 'Film lót trắng (in trước, dưới mọi màu)' : sep ? `Film màu ${sep} · ${inks[sep - 1]}` : '';
  const placed = box ? { x: box.x, y: box.y, width: box.w, height: box.h } : {};
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-pos={pos} data-sep={sep || undefined} data-person={personIdx} {...placed}>
      {logo && (screen || sep) && (
        <defs>
          {/* logo khách → 1 màu mực/chỉ: tối = in, sáng/trong = bỏ */}
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
          <text x={W / 2} y={-M / 2 + 1.5} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={Math.min(4, W / 30)} fill="#000000">{`${sepLabel} · ${P.name} ${W}×${H}mm`}</text>
        </g>
      )}
    </svg>
  );
}

// ---------- dáng áo (dùng chung mockup phẳng + 3D) ----------
// Toạ độ "tấm thân" (mm, gốc giữa lai áo, y hướng LÊN). Áo cỡ L, dáng ghost-mannequin (tay hơi dang).
export type V2 = [number, number];
export interface ShirtGeom {
  L: number; hps: number; S0: V2; A: V2; C1: V2; C2: V2; dir: V2;
  frontNeck: number; backNeck: number;
  /** đa giác viền (CCW), kèm nhãn từng đỉnh: side/under/sleeve/cuff/shoulder/neck/hem */
  poly(side: 'front' | 'back'): { p: V2[]; tag: string[] };
  /** tâm + góc + khung mỗi vị trí in trên tấm thân (góc rad, CCW) */
  place(pos: TSPos): { cx: number; top: number; ang: number; cy?: number };
}
const lerp2 = (a: V2, b: V2, t: number): V2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function catmull(pts: V2[], n: number): V2[] {
  const out: V2[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)) as V2);
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
export function shirtGeom(kind: TSKind): ShirtGeom {
  const L = 700, hps = kind === 'polo' ? 78 : 80;
  const S0: V2 = [224, 662], A: V2 = [210, 474];
  const ang = (-36 * Math.PI) / 180;
  const dir: V2 = [Math.cos(ang), Math.sin(ang)];
  const C1: V2 = [S0[0] + dir[0] * 188, S0[1] + dir[1] * 188];
  const nrm: V2 = [dir[1], -dir[0]];
  const C2: V2 = [C1[0] + nrm[0] * 158, C1[1] + nrm[1] * 158];
  const frontNeck = kind === 'polo' ? 52 : 76, backNeck = 18;
  const neck = (depth: number): V2[] => Array.from({ length: 25 }, (_, i) => {
    const x = hps - (i / 24) * hps * 2;
    return [x, L - depth * Math.pow(Math.max(0, Math.cos(((x / hps) * Math.PI) / 2)), 0.75)] as V2;
  });
  const half = (depth: number) => {
    const p: V2[] = [], tag: string[] = [];
    const push = (pts: V2[], t: string) => { for (const q of pts) { p.push(q); tag.push(t); } };
    // hông phải: lai → nách (cong mềm)
    push(catmull([[206, 0], [203, 130], [199, 270], [203, 390], [208, 448]], 8), 'side');
    // bo nách → mép dưới tay
    push(catmull([[208, 448], [212, 466], [226, 470]], 4).slice(1), 'under');
    push(Array.from({ length: 12 }, (_, i) => lerp2([226, 470], C2, (i + 1) / 12)), 'under');
    push(Array.from({ length: 10 }, (_, i) => lerp2(C2, C1, (i + 1) / 10)), 'cuff');
    push(Array.from({ length: 16 }, (_, i) => lerp2(C1, S0, (i + 1) / 16)), 'sleeve');
    push(Array.from({ length: 10 }, (_, i) => lerp2(S0, [hps, L], (i + 1) / 10)), 'shoulder');
    const nk = neck(depth);
    push(nk.slice(1, -1), 'neck');
    // nửa trái = gương
    const n0 = p.length;
    for (let i = n0 - 1; i >= 0; i--) {
      if (tag[i] === 'neck') continue;
      p.push([-p[i][0], p[i][1]]); tag.push(tag[i]);
    }
    // lai áo (đóng đa giác về điểm đầu)
    push(Array.from({ length: 30 }, (_, i) => [-206 + (i + 1) * (412 / 31), 0] as V2), 'hem');
    // nhãn neck cho 2 điểm HPS trái/phải đã nằm trong shoulder
    return { p, tag };
  };
  const sleeveC: V2 = [(S0[0] + C1[0] + C2[0] + A[0]) / 4 + 8, (S0[1] + C1[1] + C2[1] + A[1]) / 4 + 6];
  return {
    L, hps, S0, A, C1, C2, dir, frontNeck, backNeck,
    poly: (side) => half(side === 'front' ? frontNeck : backNeck),
    place: (pos) => {
      if (pos === 'chest') return { cx: 98, top: L - 140, ang: 0 };
      if (pos === 'front') return { cx: 0, top: L - frontNeck - 62, ang: 0 };
      if (pos === 'back') return { cx: 0, top: L - backNeck - 78, ang: 0 };
      return { cx: sleeveC[0], top: 0, cy: sleeveC[1], ang: Math.atan2(dir[0], -dir[1]) }; // tay: "lên" = về phía vai
    },
  };
}
/** khung mockup (mm): x ∈ [-MX, MX], y ∈ [MY0, MY1] (y lên) */
export const MOCK = { MX: 400, MY0: -20, MY1: 760 };

/** Mockup phẳng 1 mặt áo (nhìn từ trước / từ sau) + các vị trí in đặt đúng chỗ, đúng tỉ lệ thật.
 *  for3d: bỏ cổ áo vẽ phẳng (3D có cổ thật), giữ đường may. mask: nền trong, chỉ hình in màu trắng (bản đồ nhám 3D). */
export function TShirtMock({ spec, data, side, logo, person, for3d, mask, style }: {
  spec: TSSpec; data: TSData; side: 'front' | 'back'; logo?: string; person?: TSPerson; for3d?: boolean; mask?: boolean; style?: CSSProperties;
}) {
  const g = shirtGeom(spec.kind);
  const col = tsColor(spec.color);
  const { MX, MY0, MY1 } = MOCK;
  const W = MX * 2, H = MY1 - MY0;
  const sx = side === 'back' ? -1 : 1;
  const X = (x: number) => MX + sx * x, Y = (y: number) => MY1 - y;
  const { p } = g.poly(side);
  const d = p.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ') + 'Z';
  const dark = !!col.dark;
  const line = dark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.2)';
  const shade = dark ? 'rgba(0,0,0,0.35)' : 'rgba(0,0,0,0.12)';
  const positions = tsPositions(spec).filter((ps) => (side === 'front' ? ps !== 'back' : ps === 'back'));
  const prints = positions.map((ps) => {
    const P = TS_POS[ps], pl = g.place(ps);
    const cy = pl.cy ?? pl.top - P.h / 2;
    const cxS = X(pl.cx), cyS = Y(cy);
    const rot = -sx * (pl.ang * 180) / Math.PI;
    return (
      <g key={ps} transform={`rotate(${rot.toFixed(2)} ${cxS.toFixed(1)} ${cyS.toFixed(1)})`} data-print={ps}>
        <TShirtSvg spec={spec} data={data} pos={ps} logo={logo} person={person} stitch={isStitched(spec, ps)} box={{ x: cxS - P.w / 2, y: cyS - P.h / 2, w: P.w, h: P.h }} />
      </g>
    );
  });
  const mid = `tsmk-${side}-${spec.kind}-${for3d ? 3 : 0}${mask ? 'm' : ''}`;
  if (mask) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style}>
        <defs><filter id={`${mid}-w`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" /></filter></defs>
        <g filter={`url(#${mid}-w)`}>{prints}</g>
      </svg>
    );
  }
  // đường may: lai áo (2 kim), cổ tay, vai, nách
  const hemY = Y(16), hemY2 = Y(24);
  const cuff = (o: number) => {
    const a: V2 = [g.C2[0] - g.dir[0] * o, g.C2[1] - g.dir[1] * o], b: V2 = [g.C1[0] - g.dir[0] * o, g.C1[1] - g.dir[1] * o];
    return `M${X(a[0])} ${Y(a[1])} L${X(b[0])} ${Y(b[1])} M${X(-a[0])} ${Y(a[1])} L${X(-b[0])} ${Y(b[1])}`;
  };
  const arm = `M${X(g.S0[0])} ${Y(g.S0[1])} Q${X(g.S0[0] - 18)} ${Y(560)} ${X(g.A[0])} ${Y(g.A[1])} M${X(-g.S0[0])} ${Y(g.S0[1])} Q${X(-g.S0[0] + 18)} ${Y(560)} ${X(-g.A[0])} ${Y(g.A[1])}`;
  const neckDepth = side === 'front' ? g.frontNeck : g.backNeck;
  const nk = Array.from({ length: 25 }, (_, i) => { const x = g.hps - (i / 24) * g.hps * 2; return [x, g.L - neckDepth * Math.pow(Math.max(0, Math.cos(((x / g.hps) * Math.PI) / 2)), 0.75)] as V2; });
  const nkD = nk.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ');
  const backNk = Array.from({ length: 25 }, (_, i) => { const x = g.hps - (i / 24) * g.hps * 2; return [x, g.L - g.backNeck * Math.pow(Math.max(0, Math.cos(((x / g.hps) * Math.PI) / 2)), 0.75)] as V2; });
  const insideD = `${nkD} ${[...backNk].map(([x, y]) => `L${X(x).toFixed(1)} ${Y(y).toFixed(1)}`).join(' ')}Z`;
  const polo = spec.kind === 'polo';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-mock={side}>
      <defs>
        <clipPath id={`${mid}-c`}><path d={d} /></clipPath>
        <linearGradient id={`${mid}-g`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity={for3d ? 0 : 0.16} /><stop offset="0.18" stopColor="#000" stopOpacity="0" />
          <stop offset="0.82" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity={for3d ? 0 : 0.16} />
        </linearGradient>
      </defs>
      {for3d && <rect x={0} y={0} width={W} height={H} fill={col.color} />}
      <path d={d} fill={col.color} />
      {!for3d && side === 'front' && <><path d={insideD} fill={col.color} /><path d={insideD} fill={shade} /></>}
      <g clipPath={`url(#${mid}-c)`}>
        {!for3d && <rect x={0} y={0} width={W} height={H} fill={`url(#${mid}-g)`} />}
        {prints}
        <path d={`M0 ${hemY} L${W} ${hemY} M0 ${hemY2} L${W} ${hemY2}`} stroke={line} strokeWidth={0.9} strokeDasharray="3 1.6" fill="none" />
        <path d={cuff(16)} stroke={line} strokeWidth={0.9} strokeDasharray="3 1.6" fill="none" />
        <path d={arm} stroke={line} strokeWidth={0.9} fill="none" />
        {polo && side === 'front' && (
          <g>
            <rect x={X(0) - 17} y={Y(g.L - g.frontNeck)} width={34} height={150} fill="none" stroke={line} strokeWidth={1} />
            <path d={`M${X(0) - 11} ${Y(g.L - g.frontNeck)} L${X(0) - 11} ${Y(g.L - g.frontNeck) + 146} M${X(0) + 11} ${Y(g.L - g.frontNeck)} L${X(0) + 11} ${Y(g.L - g.frontNeck) + 146}`} stroke={line} strokeWidth={0.7} strokeDasharray="2.4 1.4" />
            {!for3d && [40, 95].map((dy) => <circle key={dy} cx={X(0)} cy={Y(g.L - g.frontNeck) + dy} r={5.5} fill={dark ? '#E9E9E6' : '#F7F7F3'} stroke={line} strokeWidth={0.8} />)}
          </g>
        )}
      </g>
      {!for3d && (
        polo
          ? <path d={`M${X(-g.hps)} ${Y(g.L)} Q${X(-g.hps - 40)} ${Y(g.L - 40)} ${X(-30)} ${Y(g.L - g.frontNeck - 50)} L${X(-4)} ${Y(g.L - g.frontNeck - 4)} ${nkD.replace(/^M/, 'L')} L${X(4)} ${Y(g.L - g.frontNeck - 4)} L${X(30)} ${Y(g.L - g.frontNeck - 50)} Q${X(g.hps + 40)} ${Y(g.L - 40)} ${X(g.hps)} ${Y(g.L)}Z`} fill={col.color} stroke={line} strokeWidth={1.2} />
          : <path d={nkD} fill="none" stroke={dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)'} strokeWidth={14} strokeLinecap="round" />
      )}
      <path d={d} fill="none" stroke={line} strokeWidth={1.2} />
    </svg>
  );
}

// ---------- tờ tổng hợp đơn (trang 1 PDF) ----------
export function OrderSummarySvg({ spec, data, qty, people, positions }: {
  spec: TSSpec; data: TSData; qty: Record<string, number>; people: TSPerson[]; positions: TSPos[];
}) {
  const W = 210, H = 297;
  const col = tsColor(spec.color);
  const inks = tsUsedInks(spec);
  const total = TS_SIZES.reduce((a, s) => a + (qty[s] || 0), 0);
  const rows: [string, string][] = [
    ['Loại áo', TS_KINDS.find((k) => k.id === spec.kind)!.name],
    ['Màu áo', col.name],
    ['Mẫu', tsLayout(spec.layout).name],
    ['Cách in', `${spec.method === 'screen' ? `In lụa ${spec.nInk} màu${needUnderbase(spec) ? ' + lót trắng' : ''}` : 'In DTF đủ màu'}${spec.embroider ? ' · thêu logo ngực/tay' : ''}`],
    ['Vị trí in', positions.map((p) => `${TS_POS[p].name} ${TS_POS[p].w / 10}×${TS_POS[p].h / 10}cm`).join(' · ')],
  ];
  const t: TS = { fam: BODY, wt: 600 };
  const fit = (s: string, max: number, size: number) => { const w = textW(s, size, t); return w > max ? (size * max) / w : size; };
  const list = people.slice(0, 40);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" data-summary="1">
      <rect width={W} height={H} fill="#ffffff" />
      <text x={14} y={22} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={9} fill="#16233B">PHIẾU ĐẶT IN ÁO THUN</text>
      <text x={14} y={30} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={4} fill="#5a6475">Mivy · file kèm theo: mockup, file in từng vị trí đúng kích thước thật{spec.method === 'screen' ? ', film tách màu' : ''}</text>
      {rows.map(([k, v], i) => (
        <g key={k}>
          <text x={14} y={44 + i * 9} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={4} fill="#16233B">{k}</text>
          <text x={50} y={44 + i * 9} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(v, 146, 4)} fill="#333">{v}</text>
        </g>
      ))}
      <text x={14} y={96} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={4} fill="#16233B">Màu mực / chỉ</text>
      {inks.map((ik, i) => (
        <g key={ik.k}><rect x={50 + i * 30} y={92.5} width={5} height={5} rx={1} fill={ik.color} stroke="#999" strokeWidth={0.2} /><text x={57 + i * 30} y={96.5} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.4} fill="#333">{ik.color}</text></g>
      ))}
      <text x={14} y={112} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={5} fill="#16233B">Bảng size</text>
      {TS_SIZES.map((s, i) => (
        <g key={s}>
          <rect x={14 + i * 26} y={116} width={26} height={9} fill="#EEF1F6" stroke="#C9D0DB" strokeWidth={0.3} />
          <rect x={14 + i * 26} y={125} width={26} height={11} fill="#fff" stroke="#C9D0DB" strokeWidth={0.3} />
          <text x={27 + i * 26} y={122} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={4} fill="#16233B">{s}</text>
          <text x={27 + i * 26} y={132.5} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={5} fill="#333">{qty[s] || 0}</text>
        </g>
      ))}
      <text x={14 + 6 * 26 + 4} y={132.5} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={5} fill="#16233B">= {total} áo</text>
      {list.length > 0 && (
        <g>
          <text x={14} y={150} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={5} fill="#16233B">Danh sách ({people.length} người{people.length > list.length ? `, hiện ${list.length}` : ''})</text>
          {list.map((pp, i) => {
            const colI = Math.floor(i / 20), r = i % 20;
            const s = `${String(i + 1).padStart(2, '0')}. ${pp.name}${pp.num ? ` · số ${pp.num}` : ''}${pp.size ? ` · ${pp.size}` : ''}`;
            return <text key={i} x={14 + colI * 92} y={158 + r * 6.2} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(s, 88, 3.6)} fill="#333">{s}</text>;
          })}
        </g>
      )}
      {data.brand && <text x={14} y={288} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.4} fill="#8a93a3">{`Thiết kế: ${data.brand}`}</text>}
    </svg>
  );
}
