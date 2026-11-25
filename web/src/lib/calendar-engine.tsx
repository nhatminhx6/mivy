'use client';
// Lịch Tết để bàn 2027: 13 tờ (bìa + 12 tháng), lưới dương lịch + ÂM LỊCH chuẩn (thuật toán Hồ Ngọc Đức),
// tô đỏ CN + ngày lễ, ghi chú mùng 1/rằm/ngày lễ. Mẫu = BỐ CỤC × BẢNG MÀU × FONT × HOA (mai/đào) — hoạ tiết vẽ bằng code.
// Đơn vị: 4px = 1mm. Lề xén 3mm.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { LUNAR_MONTH_NAMES, canChiYear, jdFromDate, monthDays, solarToLunar, type DayInfo } from './lunar-vn';

const U = 4;
export const CAL_YEAR = 2027;
export const CAL_BLEED_MM = 3;
export const CAL_PAGES = 13; // 0 = bìa, 1..12 = tháng

export interface CalSize { id: string; name: string; wMm: number; hMm: number }
export const CAL_SIZES: CalSize[] = [
  { id: '210x150', name: '21 × 15 cm (phổ biến)', wMm: 210, hMm: 150 },
  { id: '180x120', name: '18 × 12 cm (nhỏ gọn)', wMm: 180, hMm: 120 },
];
// Lịch treo tường: khổ đứng lớn, gáy nẹp thiếc trên đầu
export const WALL_SIZES: CalSize[] = [
  { id: '330x480', name: '33 × 48 cm (phổ biến)', wMm: 330, hMm: 480 },
  { id: '400x600', name: '40 × 60 cm (lớn)', wMm: 400, hMm: 600 },
];
// Lịch bloc: BẢNG TREO (in 1 tờ) + tập BLOC 365 tờ xé ngày gắn trên bảng
export interface BlocSize extends CalSize { blocW: number; blocH: number; blocName: string }
export const BLOC_SIZES: BlocSize[] = [
  { id: '300x400', name: 'Bảng 30 × 40 cm · bloc trung 13 × 19', wMm: 300, hMm: 400, blocW: 130, blocH: 190, blocName: 'Bloc trung 13 × 19 cm' },
  { id: '350x500', name: 'Bảng 35 × 50 cm · bloc đại 15 × 22', wMm: 350, hMm: 500, blocW: 150, blocH: 220, blocName: 'Bloc đại 15 × 22 cm' },
];
export const blocSize = (id: string) => BLOC_SIZES.find((s) => s.id === id) || BLOC_SIZES[0];
export const calSize = (id: string): CalSize => [...CAL_SIZES, ...WALL_SIZES, ...BLOC_SIZES].find((s) => s.id === id) || CAL_SIZES[0];
export type CalKind = 'desk' | 'wall' | 'bloc';
export const WALL_SHEETS = [7, 13] as const;

export interface CalFont { id: string; name: string; family: string; weight: number }
export const CAL_FONTS: CalFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
];
export const calFont = (id: string) => CAL_FONTS.find((f) => f.id === id) || CAL_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';

export const CAL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Montserrat:wght@700;800&family=Playfair+Display:wght@700;800&family=Dancing+Script:wght@700&display=swap');`;

export function useCalFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cal-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-cal-fonts'; link.rel = 'stylesheet';
        link.href = CAL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CAL_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `700 40px "${SCRIPT}"`, `500 30px "${BODY}"`, `700 30px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

export interface CalPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string; sun: string; flower: Flower }
export type Flower = 'mai' | 'dao';
export const CAL_PALETTES: CalPalette[] = [
  { id: 'tet', name: 'Đỏ Tết', paper: '#FFF9F0', ink: '#2B1A12', sub: '#80604E', accent: '#B3121B', accent2: '#E9B949', onAccent: '#FFF3D6', sun: '#C8102E', flower: 'mai' },
  { id: 'navy', name: 'Navy ánh kim', paper: '#FBF8F2', ink: '#1B2438', sub: '#5E6779', accent: '#1B2C4F', accent2: '#D4AF5A', onAccent: '#FBF1DA', sun: '#C8102E', flower: 'mai' },
  { id: 'plum', name: 'Đỏ mận', paper: '#FFF8F3', ink: '#2E1420', sub: '#7C5A66', accent: '#6E1C38', accent2: '#E2B657', onAccent: '#FFF1DA', sun: '#C8102E', flower: 'mai' },
  { id: 'peach', name: 'Hồng đào', paper: '#FFF6F3', ink: '#4A2B30', sub: '#8E6A70', accent: '#D9677F', accent2: '#F2B33D', onAccent: '#FFFFFF', sun: '#D6334F', flower: 'dao' },
  { id: 'white', name: 'Trắng tối giản', paper: '#FFFFFF', ink: '#1F1F1F', sub: '#7C7C7C', accent: '#C8102E', accent2: '#C9A24A', onAccent: '#FFFFFF', sun: '#C8102E', flower: 'dao' },
  { id: 'kraft', name: 'Giấy kraft', paper: '#F3E9D6', ink: '#3B2A1A', sub: '#7A6450', accent: '#9B3D22', accent2: '#C99335', onAccent: '#FFF4E2', sun: '#B3261E', flower: 'mai' },
];
export const calPalette = (id: string) => CAL_PALETTES.find((p) => p.id === id) || CAL_PALETTES[0];

export interface CalLayout { id: string; name: string }
export const CAL_LAYOUTS: CalLayout[] = [
  { id: 'split', name: 'Cột tranh trái' },
  { id: 'top', name: 'Dải tranh trên' },
  { id: 'classic', name: 'Cổ điển' },
];

export interface CalSpec { layout: string; palette: string; font: string; size: string; flower: Flower; kind?: CalKind; sheets?: number }
export interface CalTemplate { id: string; name: string; spec: Omit<CalSpec, 'size'> }
const T = (layout: string, palette: string, font: string): CalTemplate => ({
  id: `${layout}-${palette}`,
  name: `${CAL_LAYOUTS.find((l) => l.id === layout)!.name} · ${calPalette(palette).name}`,
  spec: { layout, palette, font, flower: calPalette(palette).flower, kind: 'desk' },
});
export const CAL_TEMPLATES: CalTemplate[] = [
  T('split', 'tet', 'playfair'), T('top', 'peach', 'bvp'), T('classic', 'white', 'playfair'), T('split', 'navy', 'playfair'),
  T('top', 'tet', 'montserrat'), T('classic', 'kraft', 'bvp'), T('split', 'plum', 'montserrat'), T('top', 'navy', 'bvp'),
];

export const WALL_LAYOUTS: CalLayout[] = [
  { id: 'w-hero', name: 'Tranh tràn viền' },
  { id: 'w-frame', name: 'Khung viền vàng' },
  { id: 'w-arch', name: 'Vòm cửa' },
  { id: 'w-mini', name: 'Tối giản' },
];
const TW = (layout: string, palette: string, font: string): CalTemplate => ({
  id: `${layout}-${palette}`,
  name: `${WALL_LAYOUTS.find((l) => l.id === layout)!.name} · ${calPalette(palette).name}`,
  spec: { layout, palette, font, flower: calPalette(palette).flower, kind: 'wall' },
});
export const WALL_TEMPLATES: CalTemplate[] = [
  TW('w-hero', 'tet', 'playfair'), TW('w-frame', 'navy', 'playfair'), TW('w-arch', 'peach', 'bvp'), TW('w-mini', 'white', 'montserrat'),
  TW('w-hero', 'plum', 'montserrat'), TW('w-frame', 'kraft', 'playfair'), TW('w-arch', 'tet', 'playfair'), TW('w-mini', 'navy', 'bvp'),
];
export const calKind = (spec: Pick<CalSpec, 'kind'>): CalKind => (spec.kind === 'wall' ? 'wall' : spec.kind === 'bloc' ? 'bloc' : 'desk');
export const wallSheets = (spec: Pick<CalSpec, 'sheets'>) => (spec.sheets === 7 ? 7 : 13);
/** số tờ in của mẫu hiện tại: để bàn 13; treo tường 7 (bìa + 6 tờ × 2 tháng) hoặc 13 */
export const calPageCount = (spec: Pick<CalSpec, 'kind' | 'sheets'>) => (calKind(spec) === 'wall' ? wallSheets(spec) : calKind(spec) === 'bloc' ? 1 : CAL_PAGES);
/** tháng in trên tờ i (0 = bìa → []) */
export const monthsOfPage = (spec: Pick<CalSpec, 'kind' | 'sheets'>, i: number): number[] =>
  i === 0 || calKind(spec) === 'bloc' ? [] : calKind(spec) === 'wall' && wallSheets(spec) === 7 ? [i * 2 - 1, i * 2] : [i];
export const calPageLabel = (spec: Pick<CalSpec, 'kind' | 'sheets'>, i: number, short = false) => {
  const ms = monthsOfPage(spec, i);
  if (!ms.length) return 'Bìa';
  return short ? `T${ms.join('–')}` : `Tháng ${ms.join(' – ')}`;
};

export type CalData = Record<string, string>;
export interface CalField { key: string; label: string; ph?: string; half?: boolean }
export const CAL_FIELDS: CalField[] = [
  { key: 'brand', label: 'Thương hiệu', ph: 'AN KHANG', half: true },
  { key: 'slogan', label: 'Dòng giới thiệu', ph: 'Mỹ phẩm thiên nhiên', half: true },
  { key: 'greeting', label: 'Lời chúc (trên bìa)', ph: 'An Khang Thịnh Vượng' },
  { key: 'phone', label: 'Điện thoại', ph: '0909 123 456', half: true },
  { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn', half: true },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM' },
];
export const defaultCalData = (): CalData => ({
  brand: 'AN KHANG', slogan: 'Mỹ phẩm thiên nhiên', greeting: 'An Khang Thịnh Vượng',
  phone: '0909 123 456', website: 'ankhang.vn', address: '12 Nguyễn Huệ, Q.1, TP.HCM',
});

export const pageLabel = (i: number) => (i === 0 ? 'Bìa' : `Tháng ${i}`);

// ---------- tiện ích ----------
const fit = (text: string, maxPx: number, size: number, factor = 0.56) => {
  const w = (text || '').length * size * factor;
  return w > maxPx ? Math.max(size * 0.4, maxPx / ((text || '').length * factor)) : size;
};
function rng(seed: number) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

const FLOWER = {
  mai: { petal: '#F7C42F', petal2: '#FBDB6A', center: '#D9761A', stamen: '#B4561A', bud: '#E9A81F' },
  dao: { petal: '#F49AB2', petal2: '#FBC9D6', center: '#C2185B', stamen: '#9C1450', bud: '#E46D8F' },
};

function Blossom({ x, y, r, flower, rot = 0 }: { x: number; y: number; r: number; flower: Flower; rot?: number }) {
  const c = FLOWER[flower];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((i) => (
        <ellipse key={i} cx={0} cy={-r * 0.52} rx={r * 0.46} ry={r * 0.56} fill={i % 2 ? c.petal2 : c.petal} transform={`rotate(${i * 72})`} />
      ))}
      <circle r={r * 0.3} fill={c.center} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        return <circle key={i} cx={Math.cos(a) * r * 0.42} cy={Math.sin(a) * r * 0.42} r={r * 0.07} fill={c.stamen} />;
      })}
    </g>
  );
}

// cành hoa mai/đào: thân cong thuôn nhỏ dần + nhánh phụ + hoa + nụ (ngẫu nhiên có hạt giống → cố định theo tháng)
function Branch({ x, y, len, angle, seed, flower, scale = 1, wood = '#4A2A1A' }: { x: number; y: number; len: number; angle: number; seed: number; flower: Flower; scale?: number; wood?: string }) {
  const r = rng(seed * 97 + 13);
  const out: ReactNode[] = [];
  const blooms: ReactNode[] = [];
  let k = 0;
  const grow = (x0: number, y0: number, L: number, a: number, w0: number, depth: number) => {
    const n = 7;
    const pts: [number, number][] = [[x0, y0]];
    let cx = x0, cy = y0, ca = a;
    for (let i = 1; i <= n; i++) {
      ca += (r() - 0.5) * 0.5;
      cx += Math.cos(ca) * (L / n); cy += Math.sin(ca) * (L / n);
      pts.push([cx, cy]);
    }
    // thân thuôn: 2 mép
    const left: string[] = [], right: string[] = [];
    pts.forEach(([px, py], i) => {
      const [qx, qy] = pts[Math.min(i + 1, n)], [ox, oy] = pts[Math.max(i - 1, 0)];
      const dx = qx - ox, dy = qy - oy, dl = Math.hypot(dx, dy) || 1;
      const w = (w0 * (1 - (i / n) * 0.8)) / 2;
      left.push(`${(px - (dy / dl) * w).toFixed(1)},${(py + (dx / dl) * w).toFixed(1)}`);
      right.unshift(`${(px + (dy / dl) * w).toFixed(1)},${(py - (dx / dl) * w).toFixed(1)}`);
    });
    out.push(<polygon key={`b${k++}`} points={[...left, ...right].join(' ')} fill={wood} />);
    pts.forEach(([px, py], i) => {
      if (i === 0) return;
      if (depth < 2 && i % 2 === 1 && i < n - 1) grow(px, py, L * (0.42 + r() * 0.15), ca + (r() > 0.5 ? 0.75 : -0.75) + (r() - 0.5) * 0.3, w0 * 0.45, depth + 1);
      if (i >= 2 && r() > 0.3) {
        const off = (r() - 0.5) * w0 * 2.2;
        const bx = px + off, by = py + (r() - 0.5) * w0 * 2;
        if (r() > 0.32) blooms.push(<Blossom key={`f${k++}`} x={bx} y={by} r={(9 + r() * 6) * scale} flower={flower} rot={r() * 72} />);
        else blooms.push(<circle key={`u${k++}`} cx={bx} cy={by} r={(3.2 + r() * 2.2) * scale} fill={FLOWER[flower].bud} />);
      }
    });
    const [tx, ty] = pts[n];
    blooms.push(<circle key={`t${k++}`} cx={tx} cy={ty} r={3 * scale} fill={FLOWER[flower].bud} />);
  };
  grow(x, y, len, angle, 9 * scale, 0);
  return <g>{out}{blooms}</g>;
}

function Lantern({ x, y, s, body, rib, string }: { x: number; y: number; s: number; body: string; rib: string; string: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1={0} y1={-string} x2={0} y2={-s * 0.62} stroke={rib} strokeWidth={s * 0.03} />
      <rect x={-s * 0.2} y={-s * 0.66} width={s * 0.4} height={s * 0.12} rx={s * 0.03} fill={rib} />
      <ellipse cx={0} cy={0} rx={s * 0.5} ry={s * 0.58} fill={body} />
      {[-0.3, 0, 0.3].map((f) => <ellipse key={f} cx={0} cy={0} rx={Math.abs(f) * s * 0.9 + s * 0.04} ry={s * 0.57} fill="none" stroke={rib} strokeWidth={s * 0.025} opacity={0.8} />)}
      <rect x={-s * 0.2} y={s * 0.54} width={s * 0.4} height={s * 0.12} rx={s * 0.03} fill={rib} />
      {[-0.1, -0.03, 0.04, 0.11].map((f) => <line key={f} x1={f * s} y1={s * 0.66} x2={f * s * 1.4} y2={s * 1.05} stroke={rib} strokeWidth={s * 0.025} />)}
    </g>
  );
}

// mây lành (tường vân) — chuỗi cung tròn + xoáy
function Cloud({ x, y, s, color, opacity = 1 }: { x: number; y: number; s: number; color: string; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 100})`} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" opacity={opacity}>
      <path d="M-90 20 C-90 -10 -55 -18 -42 0 C-40 -38 10 -44 18 -8 C30 -30 72 -22 70 8 C92 8 98 28 84 36 L-84 36 C-96 34 -98 24 -90 20 Z" />
      <path d="M-42 0 C-30 12 -12 8 -14 -6 C-16 -16 -30 -14 -28 -4" />
      <path d="M18 -8 C26 6 46 4 44 -10" />
    </g>
  );
}

// hoạ tiết nền: vảy sóng/đồng tiền mờ
function PatternRect({ id, x, y, w, h, color, opacity, cell = 36 }: { id: string; x: number; y: number; w: number; h: number; color: string; opacity: number; cell?: number }) {
  return (
    <>
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
          <circle cx={cell / 2} cy={cell / 2} r={cell * 0.36} fill="none" stroke={color} strokeWidth={1.2} />
          <circle cx={0} cy={0} r={cell * 0.36} fill="none" stroke={color} strokeWidth={1.2} />
          <circle cx={cell} cy={0} r={cell * 0.36} fill="none" stroke={color} strokeWidth={1.2} />
          <circle cx={0} cy={cell} r={cell * 0.36} fill="none" stroke={color} strokeWidth={1.2} />
          <circle cx={cell} cy={cell} r={cell * 0.36} fill="none" stroke={color} strokeWidth={1.2} />
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} opacity={opacity} />
    </>
  );
}

const lunarRange = (month: number, year: number) => {
  const a = solarToLunar(1, month, year);
  const last = new Date(year, month, 0).getDate();
  const z = solarToLunar(last, month, year);
  const nm = (l: { month: number; leap: boolean }) => `${l.leap ? 'nhuận ' : ''}${LUNAR_MONTH_NAMES[l.month - 1]}`;
  if (a.year === z.year) return a.month === z.month ? `Tháng ${nm(a)} năm ${canChiYear(a.year)}` : `Tháng ${nm(a)} – ${nm(z)} năm ${canChiYear(a.year)}`;
  return `Tháng ${nm(a)} ${canChiYear(a.year)} – ${nm(z)} ${canChiYear(z.year)}`;
};

function eventsText(days: DayInfo[], month: number): string {
  const ev = days.filter((d) => d.holiday || d.event);
  ev.sort((a, b) => Number(!!b.holiday) - Number(!!a.holiday) || a.d - b.d);
  return ev.slice(0, 4).sort((a, b) => a.d - b.d).map((d) => `${d.d}/${month} ${d.holiday || d.event}`).join('   ·   ');
}

const WD = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function Grid({ x, y, w, h, month, p, disp, k, dark = false }: { x: number; y: number; w: number; h: number; month: number; p: CalPalette; disp: string; k: number; dark?: boolean }) {
  const days = monthDays(month, CAL_YEAR);
  const first = days[0].dow;
  const rows = Math.ceil((first + days.length) / 7);
  const hh = Math.min(h * 0.11, 30 * k);
  const cw = w / 7, ch = (h - hh) / rows;
  const ds = Math.min(ch * 0.5, cw * 0.44);
  const ls = Math.max(ds * 0.36, 8.5 * k);
  const ink = dark ? p.onAccent : p.ink;
  const sub = dark ? p.onAccent : p.sub;
  return (
    <g>
      {WD.map((d, i) => (
        <text key={d} x={x + cw * (i + 0.5)} y={y + hh * 0.66} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={Math.min(hh * 0.5, 13 * k)} fill={i === 6 ? p.sun : sub} letterSpacing={1}>{d}</text>
      ))}
      <line x1={x} y1={y + hh} x2={x + w} y2={y + hh} stroke={p.accent2} strokeWidth={1.6 * k} />
      {days.map((di) => {
        const idx = first + di.d - 1;
        const col = idx % 7, row = Math.floor(idx / 7);
        const cx = x + cw * (col + 0.5), cy = y + hh + ch * row;
        const red = col === 6 || !!di.holiday;
        const l = di.lunar;
        const lunarTxt = l.day === 1 ? `${l.day}/${l.month}${l.leap ? 'N' : ''}` : String(l.day);
        const lunarHi = l.day === 1 || l.day === 15;
        return (
          <g key={di.d}>
            {di.holiday && <rect x={cx - cw * 0.44} y={cy + ch * 0.06} width={cw * 0.88} height={ch * 0.88} rx={6 * k} fill={p.sun} opacity={dark ? 0.25 : 0.09} />}
            <text x={cx} y={cy + ch * 0.06 + ds * 1.02} textAnchor="middle" fontFamily={disp} fontWeight={700} fontSize={ds} fill={red ? p.sun : ink}>{di.d}</text>
            <text x={cx} y={cy + ch * 0.06 + ds * 1.02 + ls * 1.25} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={lunarHi ? 700 : 500} fontSize={ls} fill={lunarHi ? (dark ? p.accent2 : p.accent) : sub} opacity={lunarHi ? 1 : 0.85}>{lunarTxt}</text>
          </g>
        );
      })}
    </g>
  );
}

export function CalendarSvg({ spec, data, page, photo, logo, bleed = false, style }: {
  spec: CalSpec; data: CalData; page: number; photo?: string; logo?: string; bleed?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  if (calKind(spec) === 'bloc') return page === 0
    ? <BlocBoardSvg spec={spec} data={data} photo={photo} logo={logo} bleed={bleed} style={style} uid={uid} />
    : <BlocSheetSvg spec={spec} data={data} doy={page} bleed={bleed} style={style} uid={uid} />;
  if (calKind(spec) === 'wall') return <WallSvg spec={spec} data={data} page={page} photo={photo} logo={logo} bleed={bleed} style={style} uid={uid} />;
  const sz = calSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const b = bleed ? CAL_BLEED_MM * U : 0;
  const k = H / 600;
  const p = calPalette(spec.palette);
  const f = calFont(spec.font);
  const disp = `"${f.family}"`;
  const fl = spec.flower;
  const pad = 22 * k;
  const contact = [data.phone, data.website, data.address].filter(Boolean).join('   •   ');
  const whiteBase = p.id === 'white';
  const panelFill = p.accent;

  const PhotoFill = ({ x, y, w, h, id }: { x: number; y: number; w: number; h: number; id: string }) => (
    <>
      <defs><clipPath id={id}><rect x={x} y={y} width={w} height={h} /></clipPath></defs>
      <image href={photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
    </>
  );

  // giới hạn hoạ tiết trong 1 vùng (cành hoa không lấn lưới/dải thương hiệu)
  const Clip = ({ id, x, y, w, h, children }: { id: string; x: number; y: number; w: number; h: number; children: ReactNode }) => (
    <>
      <defs><clipPath id={id}><rect x={x} y={y} width={w} height={h} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>{children}</g>
    </>
  );

  // dải thương hiệu dưới cùng
  const Strip = ({ y, x0 = -b, filled = true }: { y: number; x0?: number; filled?: boolean }) => {
    const hS = H + b - y;
    const ink = filled ? p.onAccent : p.ink;
    const bx = Math.max(x0, 0) + pad;
    const brandSize = fit(data.brand || '', W * 0.3, 21 * k, 0.62);
    return (
      <g>
        {filled ? <rect x={x0} y={y} width={W + b - x0} height={hS} fill={whiteBase ? p.ink : p.accent} /> : <line x1={bx} y1={y} x2={W - pad} y2={y} stroke={p.accent2} strokeWidth={1.4 * k} />}
        <text x={bx} y={y + (H - y) * 0.62} fontFamily={disp} fontWeight={f.weight} fontSize={brandSize} fill={filled ? (whiteBase ? '#FFFFFF' : p.accent2) : p.accent} letterSpacing={1}>{data.brand}</text>
        <text x={W - pad} y={y + (H - y) * 0.6} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(contact, W - bx - pad - (data.brand || '').length * brandSize * 0.62 - 30 * k, 11.5 * k)} fill={ink} opacity={0.92}>{contact}</text>
      </g>
    );
  };

  let body: ReactNode;

  if (page === 0) {
    // ---------- BÌA ----------
    const bg = whiteBase ? p.paper : p.accent;
    const ink = whiteBase ? p.accent : p.onAccent;
    const gold = p.accent2;
    const left = spec.layout === 'split';
    const tx = left ? W * 0.07 : W / 2;
    const anchor = left ? 'start' : 'middle';
    const colW = left ? W * 0.5 : W * 0.8;
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={bg} />
        <PatternRect id={`pt${uid}`} x={-b} y={-b} w={W + b * 2} h={H + b * 2} color={whiteBase ? p.accent2 : gold} opacity={whiteBase ? 0.22 : 0.13} cell={40 * k} />
        {photo && left && <PhotoFill x={W * 0.56} y={-b} w={W * 0.44 + b} h={H + b * 2} id={`cp${uid}`} />}
        {!(photo && left) && (
          <>
            <Branch x={W + 10 * k} y={left ? H * 0.06 : -6 * k} len={W * (left ? 0.5 : 0.42)} angle={left ? Math.PI * 0.84 : Math.PI * 0.78} seed={7} flower={fl} scale={1.5 * k} wood={whiteBase ? '#5A3522' : '#3A1E12'} />
            {left
              ? <Branch x={W + 8 * k} y={H + 6 * k} len={W * 0.34} angle={-Math.PI * 0.78} seed={3} flower={fl} scale={1.35 * k} wood={whiteBase ? '#5A3522' : '#3A1E12'} />
              : <>
                  <Branch x={-10 * k} y={H + 4 * k} len={W * 0.3} angle={-Math.PI * 0.2} seed={3} flower={fl} scale={1.3 * k} wood={whiteBase ? '#5A3522' : '#3A1E12'} />
                  <Branch x={-8 * k} y={H * 0.04} len={W * 0.2} angle={Math.PI * 0.12} seed={21} flower={fl} scale={1.1 * k} wood={whiteBase ? '#5A3522' : '#3A1E12'} />
                </>}
            <Lantern x={left ? W * 0.58 : W * 0.86} y={H * 0.42} s={54 * k} body={whiteBase ? p.accent : gold} rib={whiteBase ? gold : p.accent} string={H * 0.36 + b} />
            <Lantern x={left ? W * 0.68 : W * 0.14} y={H * 0.26} s={40 * k} body={whiteBase ? p.accent : gold} rib={whiteBase ? gold : p.accent} string={H * 0.22 + b} />
          </>
        )}
        {photo && !left && <PhotoFill x={W * 0.3} y={H * 0.46} w={W * 0.4} h={H * 0.26} id={`cp${uid}`} />}
        <Cloud x={left ? W * 0.47 : W * 0.24} y={H * 0.93} s={90 * k} color={gold} opacity={0.55} />
        <g textAnchor={anchor}>
          <text x={tx} y={H * 0.17} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={14 * k} fill={gold} letterSpacing={6 * k}>CHÚC MỪNG NĂM MỚI</text>
          <text x={tx} y={H * 0.33} fontFamily={disp} fontWeight={f.weight} fontSize={fit(`XUÂN ${canChiYear(CAL_YEAR).toUpperCase()}`, colW, 46 * k, 0.66)} fill={ink} letterSpacing={2 * k}>{`XUÂN ${canChiYear(CAL_YEAR).toUpperCase()}`}</text>
          <text x={tx} y={photo && !left ? H * 0.44 : H * 0.6} fontFamily={disp} fontWeight={f.weight} fontSize={(photo && !left ? 80 : 150) * k} fill={gold}>{CAL_YEAR}</text>
          {data.greeting && <text x={tx} y={H * 0.76} fontFamily={`"${SCRIPT}"`} fontWeight={700} fontSize={fit(data.greeting, colW, 36 * k, 0.5)} fill={ink}>{data.greeting}</text>}
          <text x={tx} y={H * 0.88} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand || '', colW, 22 * k, 0.66)} fill={gold} letterSpacing={3 * k}>{data.brand}</text>
          {data.slogan && <text x={tx} y={H * 0.93} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={11 * k} fill={ink} opacity={0.85}>{data.slogan}</text>}
        </g>
      </>
    );
  } else {
    const m = page;
    const days = monthDays(m, CAL_YEAR);
    const ev = eventsText(days, m);
    const lr = lunarRange(m, CAL_YEAR);
    const mm = String(m).padStart(2, '0');
    const wood = '#3A1E12';
    const stripY = H * 0.9;

    if (spec.layout === 'split') {
      const PW = W * 0.36;
      body = (
        <>
          <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
          <rect x={-b} y={-b} width={PW + b} height={stripY + b} fill={panelFill} />
          {photo ? (
            <>
              <PhotoFill x={-b} y={-b} w={PW + b} h={stripY + b} id={`mp${uid}`} />
              <defs><linearGradient id={`gr${uid}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity={0.55} /><stop offset="0.5" stopColor="#000" stopOpacity={0} /></linearGradient></defs>
              <rect x={-b} y={-b} width={PW + b} height={stripY + b} fill={`url(#gr${uid})`} />
            </>
          ) : (
            <>
              <PatternRect id={`pt${uid}`} x={-b} y={-b} w={PW + b} h={stripY + b} color={p.accent2} opacity={0.14} cell={34 * k} />
              <Clip id={`dc${uid}`} x={-b} y={-b} w={PW + b} h={stripY + b}><Branch x={-8 * k} y={stripY - 4 * k} len={PW * 0.82} angle={-Math.PI * (0.28 + (m % 3) * 0.04)} seed={m * 11} flower={fl} scale={1.15 * k} wood={wood} /></Clip>
              {m % 2 === 1
                ? <Lantern x={PW * 0.78} y={H * 0.46} s={30 * k} body={p.accent2} rib={p.accent} string={H * 0.46 + b} />
                : <Cloud x={PW * 0.62} y={H * 0.52} s={70 * k} color={p.accent2} opacity={0.7} />}
            </>
          )}
          <text x={pad} y={pad + 18 * k} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={14 * k} fill={p.accent2} letterSpacing={5 * k}>THÁNG</text>
          <text x={pad - 4 * k} y={pad + 128 * k} fontFamily={disp} fontWeight={f.weight} fontSize={120 * k} fill={photo ? '#FFFFFF' : p.onAccent}>{mm}</text>
          <text x={pad} y={pad + 156 * k} fontFamily={disp} fontWeight={f.weight} fontSize={22 * k} fill={p.accent2} letterSpacing={4 * k}>{CAL_YEAR}</text>
          {wrapLines(lr, 26).map((ln, i) => <text key={i} x={pad} y={pad + 182 * k + i * 15 * k} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={11 * k} fill={photo ? '#FFFFFF' : p.onAccent} opacity={0.9}>{ln}</text>)}
          <Grid x={PW + pad} y={pad} w={W - PW - pad * 2} h={stripY - pad * 2 - 20 * k} month={m} p={p} disp={disp} k={k} />
          <text x={PW + pad} y={stripY - pad * 0.6} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(ev, W - PW - pad * 2, 10.5 * k, 0.5)} fill={p.sub}>{ev}</text>
          <Strip y={stripY} />
        </>
      );
    } else if (spec.layout === 'top') {
      const BH = H * 0.33;
      body = (
        <>
          <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
          <rect x={-b} y={-b} width={W + b * 2} height={BH + b} fill={panelFill} />
          {photo ? (
            <>
              <PhotoFill x={W * 0.42} y={-b} w={W * 0.58 + b} h={BH + b} id={`mp${uid}`} />
              <defs><linearGradient id={`gr${uid}`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor={panelFill} stopOpacity={1} /><stop offset="1" stopColor={panelFill} stopOpacity={0} /></linearGradient></defs>
              <rect x={W * 0.42 - 1} y={-b} width={W * 0.16} height={BH + b} fill={`url(#gr${uid})`} />
            </>
          ) : (
            <>
              <PatternRect id={`pt${uid}`} x={-b} y={-b} w={W + b * 2} h={BH + b} color={p.accent2} opacity={0.14} cell={34 * k} />
              <Clip id={`dc${uid}`} x={-b} y={-b} w={W + b * 2} h={BH + b}><Branch x={W + 8 * k} y={BH * (0.25 + (m % 3) * 0.12)} len={W * 0.5} angle={Math.PI * (0.93 + (m % 2) * 0.04)} seed={m * 13} flower={fl} scale={1.15 * k} wood={wood} /></Clip>
              {m % 2 === 0
                ? <Lantern x={W * 0.58} y={BH * 0.52} s={30 * k} body={p.accent2} rib={p.accent} string={BH * 0.52 + b} />
                : <Cloud x={W * 0.6} y={BH * 0.72} s={64 * k} color={p.accent2} opacity={0.7} />}
            </>
          )}
          <text x={pad} y={BH * 0.27} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={14 * k} fill={p.accent2} letterSpacing={5 * k}>{`XUÂN ${canChiYear(CAL_YEAR).toUpperCase()} · ${CAL_YEAR}`}</text>
          <text x={pad - 2 * k} y={BH * 0.68} fontFamily={disp} fontWeight={f.weight} fontSize={70 * k} fill={p.onAccent}>{`Tháng ${m}`}</text>
          <text x={pad} y={BH * 0.86} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(lr, W * 0.48, 12 * k, 0.5)} fill={p.onAccent} opacity={0.92}>{lr}</text>
          <Grid x={pad} y={BH + pad * 0.6} w={W - pad * 2} h={stripY - BH - pad * 0.6 - 24 * k} month={m} p={p} disp={disp} k={k} />
          <text x={W / 2} y={stripY - 8 * k} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(ev, W - pad * 2, 10.5 * k, 0.5)} fill={p.sub}>{ev}</text>
          <Strip y={stripY} />
        </>
      );
    } else {
      // classic: lưới trái, cột thông tin + cành hoa phải, nền giấy có hoạ tiết mờ
      const GW = W * 0.64;
      const RX = GW + pad * 1.6;
      body = (
        <>
          <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
          <PatternRect id={`pt${uid}`} x={GW + pad * 0.6} y={-b} w={W - GW - pad * 0.6 + b} h={H + b * 2} color={p.accent2} opacity={0.2} cell={30 * k} />
          <line x1={GW + pad * 0.6} y1={pad} x2={GW + pad * 0.6} y2={stripY - pad * 0.5} stroke={p.accent2} strokeWidth={1.2 * k} />
          {photo ? <PhotoFill x={GW + pad * 0.6} y={H * 0.5} w={W - GW - pad * 0.6 + b} h={stripY - H * 0.5} id={`mp${uid}`} /> : (
            <Clip id={`dc${uid}`} x={GW + pad * 0.6 + 1} y={H * 0.4} w={W - GW + b} h={stripY - H * 0.4 - 1}><Branch x={W - 4 * k} y={stripY + 4 * k} len={(W - GW) * 0.95} angle={-Math.PI * (0.64 + (m % 3) * 0.03)} seed={m * 17} flower={fl} scale={1.1 * k} wood={whiteBase ? '#5A3522' : wood} /></Clip>
          )}
          <text x={RX} y={pad + 16 * k} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={13 * k} fill={p.accent} letterSpacing={5 * k}>THÁNG</text>
          <text x={RX - 4 * k} y={pad + 118 * k} fontFamily={disp} fontWeight={f.weight} fontSize={112 * k} fill={p.accent}>{mm}</text>
          <text x={RX} y={pad + 144 * k} fontFamily={disp} fontWeight={f.weight} fontSize={20 * k} fill={p.ink} letterSpacing={4 * k}>{CAL_YEAR}</text>
          {wrapLines(lr, 24).map((ln, i) => <text key={i} x={RX} y={pad + 168 * k + i * 14 * k} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={10.5 * k} fill={p.sub}>{ln}</text>)}
          {!photo && days.filter((d) => d.holiday || d.event).slice(0, 4).map((d, i) => (
            <text key={d.d} x={RX} y={pad + 212 * k + i * 15 * k} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(`${d.d}/${m}  ${d.holiday || d.event}`, W - RX - pad, 10.5 * k, 0.52)} fill={d.holiday ? p.sun : p.ink}>{`${d.d}/${m}  ${d.holiday || d.event}`}</text>
          ))}
          <Grid x={pad} y={pad} w={GW - pad} h={stripY - pad * 1.6} month={m} p={p} disp={disp} k={k} />
          <Strip y={stripY} filled={false} />
        </>
      );
    }
  }

  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">{body}</svg>
  );
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = (text || '').split(/\s+/).filter(Boolean);
  const lines: string[] = []; let cur = '';
  for (const w of words) {
    if (!cur) cur = w; else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

// ======================= LỊCH TREO TƯỜNG =======================
// Khổ đứng (33×48 / 40×60cm). Trên cùng ~16mm để trống cho nẹp thiếc. Vùng tranh lớn (hoạ tiết Tết vẽ code
// hoặc ảnh khách) + lưới tháng có âm lịch + dải thương hiệu dưới cùng (logo, hotline, địa chỉ) — doanh nghiệp tặng khách.

// tranh Tết vẽ code: nền màu chủ đạo + hoạ tiết vảy + mặt trời/trăng vàng + cành mai/đào + mây + đèn lồng (đổi theo tờ)
function WallArt({ x, y, w, h, seed, p, fl, k, uid, rich = false }: { x: number; y: number; w: number; h: number; seed: number; p: CalPalette; fl: Flower; k: number; uid: string; rich?: boolean }) {
  const right = seed % 2 === 0;               // mặt trời bên phải → cành mọc từ trái
  const sunR = Math.min(w, h) * (rich ? 0.3 : 0.27);
  const sunX = x + w * (right ? 0.66 : 0.34), sunY = y + h * (rich ? 0.44 : 0.42);
  const wood = '#3A1E12';
  const lanterns = rich || seed % 3 === 0;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={p.accent} />
      <PatternRect id={`wp${uid}${seed}`} x={x} y={y} w={w} h={h} color={p.accent2} opacity={0.12} cell={40 * k} />
      <circle cx={sunX} cy={sunY} r={sunR * 1.18} fill={p.accent2} opacity={0.16} />
      <circle cx={sunX} cy={sunY} r={sunR} fill={p.accent2} opacity={0.92} />
      <Cloud x={x + w * (right ? 0.3 : 0.7)} y={y + h * 0.86} s={95 * k} color={p.onAccent} opacity={0.5} />
      <Cloud x={sunX + (right ? 1 : -1) * sunR * 0.55} y={sunY + sunR * 0.75} s={70 * k} color={p.accent} opacity={0.85} />
      <Branch x={right ? x - 10 * k : x + w + 10 * k} y={y + h * 0.97} len={w * 0.78} angle={right ? -Math.PI * 0.24 : -Math.PI * 0.76} seed={seed * 11 + 3} flower={fl} scale={1.6 * k} wood={wood} />
      <Branch x={right ? x + w + 8 * k : x - 8 * k} y={y + h * 0.04} len={w * 0.36} angle={right ? Math.PI * 0.86 : Math.PI * 0.14} seed={seed * 7 + 5} flower={fl} scale={1.25 * k} wood={wood} />
      {lanterns && (
        <>
          <Lantern x={x + w * (right ? 0.14 : 0.86)} y={y + h * 0.3} s={58 * k} body={p.accent2} rib={p.accent} string={h * 0.3 + 4 * k} />
          <Lantern x={x + w * (right ? 0.27 : 0.73)} y={y + h * 0.18} s={42 * k} body={p.accent2} rib={p.accent} string={h * 0.18 + 4 * k} />
        </>
      )}
    </g>
  );
}

function WallSvg({ spec, data, page, photo, logo, bleed, style, uid }: {
  spec: CalSpec; data: CalData; page: number; photo?: string; logo?: string; bleed: boolean; style?: CSSProperties; uid: string;
}) {
  const sz = calSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const b = bleed ? CAL_BLEED_MM * U : 0;
  const k = W / 600;
  const p = calPalette(spec.palette);
  const f = calFont(spec.font);
  const disp = `"${f.family}"`;
  const fl = spec.flower;
  const L = spec.layout;
  const pad = 20 * k;
  const topM = 16 * U;                         // vùng nẹp thiếc: không đặt chữ
  const months = monthsOfPage(spec, page);
  const two = months.length === 2;
  const cover = page === 0;
  const whiteBase = p.id === 'white';
  const stripH = H * 0.085, stripY = H - stripH;
  const canChi = canChiYear(CAL_YEAR);

  // ---- vùng tranh theo bố cục ----
  const mini = L === 'w-mini';
  const miniR = W * (cover ? 0.34 : 0.2);
  const vBot = mini ? topM + miniR * 2 + pad * (cover ? 1 : 1.2) : H * (cover ? 0.6 : two ? 0.44 : 0.52);
  const clipId = `wc${uid}`;
  let shape: ReactNode, border: ReactNode = null, vx = 0, vy = 0, vw = 0, vh = 0;
  if (L === 'w-hero') {
    vx = -b; vy = -b; vw = W + b * 2; vh = vBot + b;
    shape = <rect x={vx} y={vy} width={vw} height={vh} />;
  } else if (L === 'w-frame') {
    vx = pad; vy = topM; vw = W - pad * 2; vh = vBot - topM;
    shape = <rect x={vx} y={vy} width={vw} height={vh} rx={10 * k} />;
    border = (
      <g fill="none" stroke={p.accent2}>
        <rect x={vx} y={vy} width={vw} height={vh} rx={10 * k} strokeWidth={3 * k} />
        <rect x={vx - 6 * k} y={vy - 6 * k} width={vw + 12 * k} height={vh + 12 * k} rx={14 * k} strokeWidth={1 * k} />
      </g>
    );
  } else if (L === 'w-arch') {
    const x0 = pad * 1.6, x1 = W - pad * 1.6, rr = (x1 - x0) / 2;
    vx = x0; vy = topM; vw = x1 - x0; vh = vBot - topM;
    const d = `M${x0} ${vBot} L${x0} ${topM + rr} A${rr} ${rr} 0 0 1 ${x1} ${topM + rr} L${x1} ${vBot} Z`;
    shape = <path d={d} />;
    border = <path d={d} fill="none" stroke={p.accent2} strokeWidth={3 * k} />;
  } else {
    const cx = cover ? W / 2 : W - pad - miniR, cy = topM + miniR;
    vx = cx - miniR; vy = cy - miniR; vw = vh = miniR * 2;
    shape = <circle cx={cx} cy={cy} r={miniR} />;
    border = <circle cx={cx} cy={cy} r={miniR + 7 * k} fill="none" stroke={p.accent2} strokeWidth={1.4 * k} />;
  }
  const visual = (
    <>
      <defs><clipPath id={clipId}>{shape}</clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        {photo
          ? <image href={photo} x={vx} y={vy} width={vw} height={vh} preserveAspectRatio="xMidYMid slice" />
          : <WallArt x={vx} y={vy} w={vw} h={vh} seed={page} p={p} fl={fl} k={k} uid={uid} rich={cover} />}
      </g>
      {border}
    </>
  );

  // ---- dải thương hiệu (logo, tên, slogan | hotline, web, địa chỉ) ----
  const sBg = whiteBase || mini ? p.ink : p.accent;
  const lg = stripH * 0.62;
  const bx = pad + (logo ? lg + 12 * k : 0);
  const contactLines = [data.phone && `Hotline ${data.phone}`, data.website, data.address].filter(Boolean) as string[];
  const strip = (
    <g>
      <rect x={-b} y={stripY} width={W + b * 2} height={stripH + b} fill={sBg} />
      <rect x={-b} y={stripY} width={W + b * 2} height={2.4 * k} fill={p.accent2} />
      {logo && <image href={logo} x={pad} y={stripY + (stripH - lg) / 2} width={lg} height={lg} preserveAspectRatio="xMidYMid meet" />}
      <text x={bx} y={stripY + stripH * (data.slogan ? 0.5 : 0.62)} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand || '', W * 0.44 - (bx - pad), 21 * k, 0.64)} fill={p.accent2} letterSpacing={1.5 * k}>{data.brand}</text>
      {data.slogan && <text x={bx} y={stripY + stripH * 0.78} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(data.slogan, W * 0.44 - (bx - pad), 9 * k, 0.5)} fill={p.onAccent} opacity={0.9}>{data.slogan}</text>}
      <g textAnchor="end" fontFamily={`"${BODY}"`} fill={p.onAccent}>
        {contactLines.map((c, i) => (
          <text key={i} x={W - pad} y={stripY + stripH * (contactLines.length === 3 ? 0.34 + i * 0.24 : 0.44 + i * 0.28)} fontWeight={i === 0 ? 700 : 500} fontSize={fit(c, W * 0.46, (i === 0 ? 10.5 : 8.6) * k, 0.52)} opacity={i === 0 ? 1 : 0.9}>{c}</text>
        ))}
      </g>
    </g>
  );

  let body: ReactNode;
  if (cover) {
    const heroBg = L === 'w-hero';
    const bg = heroBg ? p.accent : p.paper;
    const ink = heroBg ? p.onAccent : p.ink;
    const hi = heroBg ? p.accent2 : p.accent;
    const rest = stripY - vBot;
    const yearSize = Math.min(rest * 0.4, W * 0.3);
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={bg} />
        {!heroBg && <PatternRect id={`cvp${uid}`} x={-b} y={-b} w={W + b * 2} h={H + b * 2} color={p.accent2} opacity={0.12} cell={44 * k} />}
        {visual}
        <g textAnchor="middle">
          <text x={W / 2} y={vBot + rest * 0.14} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={11 * k} fill={hi} letterSpacing={5 * k}>CHÚC MỪNG NĂM MỚI</text>
          <text x={W / 2} y={vBot + rest * 0.31} fontFamily={disp} fontWeight={f.weight} fontSize={fit(`XUÂN ${canChi.toUpperCase()}`, W * 0.8, 30 * k, 0.66)} fill={ink} letterSpacing={2 * k}>{`XUÂN ${canChi.toUpperCase()}`}</text>
          <text x={W / 2} y={vBot + rest * 0.71} fontFamily={disp} fontWeight={f.weight} fontSize={yearSize} fill={hi}>{CAL_YEAR}</text>
          {data.greeting && <text x={W / 2} y={vBot + rest * 0.91} fontFamily={`"${SCRIPT}"`} fontWeight={700} fontSize={fit(data.greeting, W * 0.8, 25 * k, 0.5)} fill={ink}>{data.greeting}</text>}
        </g>
        {strip}
      </>
    );
  } else {
    const blockTop = vBot + pad * (mini ? 0.2 : 0.9);
    const blockBot = stripY - pad * 0.6;
    const headH = (two ? 54 : 62) * k;
    const evH = 15 * k;
    const MonthBlock = ({ m, x, w, head }: { m: number; x: number; w: number; head: boolean }) => {
      const days = monthDays(m, CAL_YEAR);
      const ev = eventsText(days, m);
      const lr = lunarRange(m, CAL_YEAR);
      const gy = blockTop + (head ? headH : 0);
      const gk = two ? k * 0.78 : k;
      return (
        <g>
          {head && (two ? (
            <>
              <text x={x} y={blockTop + 28 * k} fontFamily={disp} fontWeight={f.weight} fontSize={27 * k} fill={p.accent}>{`Tháng ${m}`}</text>
              <text x={x + w} y={blockTop + 28 * k} textAnchor="end" fontFamily={disp} fontWeight={f.weight} fontSize={13 * k} fill={p.ink} letterSpacing={2 * k}>{CAL_YEAR}</text>
              <text x={x} y={blockTop + 45 * k} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(lr, w, 7.6 * k, 0.5)} fill={p.sub}>{lr}</text>
            </>
          ) : (
            <>
              <text x={x} y={blockTop + 40 * k} fontFamily={disp} fontWeight={f.weight} fontSize={42 * k} fill={p.accent}>{`Tháng ${m}`}</text>
              <text x={x + w} y={blockTop + 20 * k} textAnchor="end" fontFamily={disp} fontWeight={f.weight} fontSize={17 * k} fill={p.ink} letterSpacing={3 * k}>{`${canChi.toUpperCase()} · ${CAL_YEAR}`}</text>
              <text x={x + w} y={blockTop + 40 * k} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(lr, w * 0.5, 9.5 * k, 0.5)} fill={p.sub}>{lr}</text>
            </>
          ))}
          <Grid x={x} y={gy} w={w} h={blockBot - evH - gy} month={m} p={p} disp={disp} k={gk} />
          <text x={two ? x : x + w / 2} y={blockBot - 2 * k} textAnchor={two ? 'start' : 'middle'} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(ev, w, (two ? 7.4 : 9.4) * k, 0.5)} fill={p.sub}>{ev}</text>
        </g>
      );
    };
    // tối giản: số tháng lớn bên trái vòng tranh
    const miniHead = mini && (
      <g>
        <text x={pad} y={topM + 20 * k} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={12 * k} fill={p.accent} letterSpacing={5 * k}>THÁNG</text>
        <text x={pad - 4 * k} y={topM + 20 * k + (two ? 86 : 118) * k} fontFamily={disp} fontWeight={f.weight} fontSize={fit(months.map((m) => String(m).padStart(2, '0')).join('·'), W - miniR * 2 - pad * 3, (two ? 96 : 130) * k, 0.62)} fill={p.accent}>{months.map((m) => String(m).padStart(2, '0')).join('·')}</text>
        <text x={pad} y={topM + 20 * k + (two ? 116 : 152) * k} fontFamily={disp} fontWeight={f.weight} fontSize={18 * k} fill={p.ink} letterSpacing={4 * k}>{`${canChi.toUpperCase()} · ${CAL_YEAR}`}</text>
        {(two ? [lunarRange(months[0], CAL_YEAR), lunarRange(months[1], CAL_YEAR)] : [lunarRange(months[0], CAL_YEAR)]).map((ln, i) => (
          <text key={i} x={pad} y={topM + 20 * k + (two ? 140 : 178) * k + i * 14 * k} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(ln, W - miniR * 2 - pad * 3.2, 9.5 * k, 0.5)} fill={p.sub}>{ln}</text>
        ))}
      </g>
    );
    const colW = (W - pad * 3) / 2;
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
        {L === 'w-frame' && <PatternRect id={`pp${uid}`} x={-b} y={-b} w={W + b * 2} h={vBot + pad * 0.5 + b} color={p.accent2} opacity={0.1} cell={36 * k} />}
        {visual}
        {L === 'w-hero' && <rect x={-b} y={vBot} width={W + b * 2} height={3 * k} fill={p.accent2} />}
        {miniHead}
        {two ? (
          <>
            <MonthBlock m={months[0]} x={pad} w={colW} head={true} />
            <line x1={W / 2} y1={blockTop + 6 * k} x2={W / 2} y2={blockBot - evH} stroke={p.accent2} strokeWidth={1.2 * k} />
            <MonthBlock m={months[1]} x={pad * 2 + colW} w={colW} head={true} />
          </>
        ) : (
          <MonthBlock m={months[0]} x={pad} w={W - pad * 2} head={!mini} />
        )}
        {strip}
      </>
    );
  }

  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">{body}</svg>
  );
}

// ======================= LỊCH BLOC TẾT =======================
// Bảng treo (in 1 tờ: tranh Tết/phong cảnh/doanh nghiệp + thương hiệu) + tập bloc 365 tờ xé ngày gắn giữa bảng.
// Tờ ngày: số dương lịch cực lớn, thứ, âm lịch + can chi ngày/tháng/năm, ngày hoàng đạo/hắc đạo, giờ hoàng đạo,
// ngày lễ tô đỏ, 1 câu tục ngữ/ca dao xoay vòng, dòng thương hiệu cuối tờ.

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
const CHI_HOURS = ['23–1h', '1–3h', '3–5h', '5–7h', '7–9h', '9–11h', '11–13h', '13–15h', '15–17h', '17–19h', '19–21h', '21–23h'];
const WEEKDAY_FULL = ['THỨ HAI', 'THỨ BA', 'THỨ TƯ', 'THỨ NĂM', 'THỨ SÁU', 'THỨ BẢY', 'CHỦ NHẬT'];
// thập nhị trực tinh: sao bắt đầu theo tháng âm (Thanh Long), 6 sao hoàng đạo ở vị trí 0,1,4,5,7,10
const STARS = ['Thanh Long', 'Minh Đường', 'Thiên Hình', 'Chu Tước', 'Kim Quỹ', 'Kim Đường', 'Bạch Hổ', 'Ngọc Đường', 'Thiên Lao', 'Huyền Vũ', 'Tư Mệnh', 'Câu Trận'];
const GOOD_STAR = new Set([0, 1, 4, 5, 7, 10]);
// giờ hoàng đạo theo chi của ngày (bảng phổ biến trong lịch vạn niên)
const GIO_HD: Record<number, number[]> = {
  0: [0, 1, 3, 6, 8, 9], 6: [0, 1, 3, 6, 8, 9],     // Tý, Ngọ
  1: [2, 3, 5, 8, 10, 11], 7: [2, 3, 5, 8, 10, 11], // Sửu, Mùi
  2: [0, 1, 4, 5, 7, 10], 8: [0, 1, 4, 5, 7, 10],   // Dần, Thân
  3: [0, 2, 3, 6, 7, 9], 9: [0, 2, 3, 6, 7, 9],     // Mão, Dậu
  4: [2, 4, 5, 8, 9, 11], 10: [2, 4, 5, 8, 9, 11],  // Thìn, Tuất
  5: [1, 4, 6, 7, 10, 11], 11: [1, 4, 6, 7, 10, 11], // Tỵ, Hợi
};

/** can chi của NGÀY dương lịch (theo số ngày Julius) */
export const canChiDay = (d: number, m: number, y: number) => { const jd = jdFromDate(d, m, y); return `${CAN[(jd + 9) % 10]} ${CHI[(jd + 1) % 12]}`; };
/** can chi của THÁNG âm (năm âm y, tháng m; tháng nhuận dùng can chi tháng chính) */
export const canChiMonth = (m: number, y: number) => `${CAN[(y * 12 + m + 3) % 10]} ${CHI[(m + 1) % 12]}`;

// tục ngữ, ca dao (dân gian — không bản quyền)
export const PROVERBS = [
  'Có công mài sắt, có ngày nên kim.',
  'Uống nước nhớ nguồn.',
  'Một cây làm chẳng nên non, ba cây chụm lại nên hòn núi cao.',
  'Tốt gỗ hơn tốt nước sơn.',
  'Đi một ngày đàng, học một sàng khôn.',
  'Ăn quả nhớ kẻ trồng cây.',
  'Lá lành đùm lá rách.',
  'Gần mực thì đen, gần đèn thì sáng.',
  'Có chí thì nên.',
  'Chớ thấy sóng cả mà ngã tay chèo.',
  'Thất bại là mẹ thành công.',
  'Một con ngựa đau, cả tàu bỏ cỏ.',
  'Bầu ơi thương lấy bí cùng, tuy rằng khác giống nhưng chung một giàn.',
  'Công cha như núi Thái Sơn, nghĩa mẹ như nước trong nguồn chảy ra.',
  'Học thầy không tày học bạn.',
  'Không thầy đố mày làm nên.',
  'Ăn vóc học hay.',
  'Cẩn tắc vô áy náy.',
  'Chậm mà chắc.',
  'Mưa dầm thấm lâu.',
  'Nước chảy đá mòn.',
  'Kiến tha lâu cũng đầy tổ.',
  'Tích tiểu thành đại.',
  'Một miếng khi đói bằng một gói khi no.',
  'Lời nói chẳng mất tiền mua, lựa lời mà nói cho vừa lòng nhau.',
  'Thương người như thể thương thân.',
  'Ở hiền gặp lành.',
  'Gieo gió gặt bão.',
  'Ăn cây nào rào cây ấy.',
  'Cái nết đánh chết cái đẹp.',
  'Đói cho sạch, rách cho thơm.',
  'Giấy rách phải giữ lấy lề.',
  'Một điều nhịn, chín điều lành.',
  'Muốn ăn thì lăn vào bếp.',
  'Tay làm hàm nhai, tay quai miệng trễ.',
  'Có làm thì mới có ăn.',
  'Buôn có bạn, bán có phường.',
  'Thuận mua vừa bán.',
  'Phi thương bất phú.',
  'Năng nhặt chặt bị.',
  'Đoàn kết là sức mạnh.',
  'Biết người biết ta, trăm trận trăm thắng.',
  'Hay học thì sang, hay làm thì có.',
  'Muốn sang thì bắc cầu kiều, muốn con hay chữ thì yêu lấy thầy.',
  'Người ta là hoa đất.',
  'Một người làm quan, cả họ được nhờ.',
  'Tre già măng mọc.',
  'Ăn có nhai, nói có nghĩ.',
  'Uốn cây từ thuở còn non, dạy con từ thuở con còn bi bô.',
  'Nhiễu điều phủ lấy giá gương, người trong một nước phải thương nhau cùng.',
  'Ai ơi bưng bát cơm đầy, dẻo thơm một hạt đắng cay muôn phần.',
  'Thời gian là vàng bạc.',
  'Ngày Tết thịt mỡ dưa hành, câu đối đỏ, cây nêu, tràng pháo, bánh chưng xanh.',
  'Tháng Giêng là tháng ăn chơi.',
  'Đầu năm mua muối, cuối năm mua vôi.',
  'Sai một li, đi một dặm.',
  'Có thực mới vực được đạo.',
  'Nhập gia tùy tục.',
  'Trăm hay không bằng tay quen.',
  'Bán anh em xa, mua láng giềng gần.',
  'Một nụ cười bằng mười thang thuốc bổ.',
  'Vạn sự khởi đầu nan.',
];

export interface BlocDay {
  d: number; m: number; y: number; doy: number; dow: number;
  lunar: DayInfo['lunar']; holiday?: string; event?: string;
  ccDay: string; ccMonth: string; ccYear: string;
  star: string; good: boolean; hours: string[]; proverb: string;
}
const monthCache = new Map<number, DayInfo[]>();
export const blocDaysInYear = (y = CAL_YEAR) => ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365);
/** ngày thứ doy (1..365) của năm lịch → toàn bộ thông tin in trên tờ bloc */
export function blocDay(doy: number, y = CAL_YEAR): BlocDay {
  const dt = new Date(y, 0, Math.max(1, Math.min(blocDaysInYear(y), doy)));
  const d = dt.getDate(), m = dt.getMonth() + 1;
  if (!monthCache.has(m)) monthCache.set(m, monthDays(m, y));
  const info = monthCache.get(m)![d - 1];
  const jd = jdFromDate(d, m, y);
  const dayChi = (jd + 1) % 12;
  const l = info.lunar;
  const start = ((l.month - 1) % 6) * 2;                    // tháng Giêng/Bảy → Thanh Long ở ngày Tý; mỗi cặp tháng lùi 2 chi
  const si = (dayChi - start + 12) % 12;
  return {
    d, m, y, doy, dow: info.dow, lunar: l, holiday: info.holiday, event: info.event,
    ccDay: canChiDay(d, m, y), ccMonth: canChiMonth(l.month, l.year), ccYear: canChiYear(l.year),
    star: STARS[si], good: GOOD_STAR.has(si),
    hours: GIO_HD[dayChi].map((h) => `${CHI[h]} (${CHI_HOURS[h]})`),
    proverb: PROVERBS[(doy - 1) % PROVERBS.length],
  };
}
export const doyOf = (d: number, m: number, y = CAL_YEAR) => Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86400000) + 1;

export const BLOC_LAYOUTS: CalLayout[] = [
  { id: 'b-classic', name: 'Tranh Tết cổ điển' },
  { id: 'b-frame', name: 'Khung vàng nền đỏ' },
  { id: 'b-scene', name: 'Phong cảnh quê nhà' },
  { id: 'b-corp', name: 'Doanh nghiệp' },
];
const TB = (layout: string, palette: string, font: string): CalTemplate => ({
  id: `${layout}-${palette}`,
  name: `${BLOC_LAYOUTS.find((l) => l.id === layout)!.name} · ${calPalette(palette).name}`,
  spec: { layout, palette, font, flower: calPalette(palette).flower, kind: 'bloc' },
});
export const BLOC_TEMPLATES: CalTemplate[] = [
  TB('b-classic', 'tet', 'playfair'), TB('b-frame', 'tet', 'playfair'), TB('b-scene', 'peach', 'playfair'), TB('b-corp', 'navy', 'montserrat'),
  TB('b-classic', 'plum', 'bvp'), TB('b-frame', 'navy', 'playfair'), TB('b-scene', 'kraft', 'bvp'), TB('b-corp', 'white', 'bvp'),
];
export const BLOC_FIELDS: CalField[] = [
  ...CAL_FIELDS,
  { key: 'services', label: 'Sản phẩm / dịch vụ (cách nhau dấu ·) — mẫu Doanh nghiệp', ph: 'Chăm sóc da · Liệu trình thảo dược · Quà tặng' },
];
const BLOC_SERVICES_DEFAULT = 'Chăm sóc da · Liệu trình thảo dược · Mỹ phẩm hữu cơ · Quà tặng doanh nghiệp';

/** vị trí tập bloc trên bảng (đơn vị px của bảng, 4px = 1mm) */
export function blocSlot(sizeId: string) {
  const bs = blocSize(sizeId);
  const W = bs.wMm * U, H = bs.hMm * U;
  const bw = bs.blocW * U, bh = bs.blocH * U;
  const stripH = H * 0.115;
  const y = H - stripH - H * 0.03 - bh;
  return { W, H, x: (W - bw) / 2, y, w: bw, h: bh, stripH };
}

// phong cảnh vẽ code: trời bình minh, mặt trời, núi xa-gần (sin nhiễu), sông, thuyền, đàn chim
function Scene({ x, y, w, h, p, k, seed }: { x: number; y: number; w: number; h: number; p: CalPalette; k: number; seed: number }) {
  const r = rng(seed * 31 + 7);
  const ridge = (base: number, amp: number, n: number) => {
    let d = `M${x} ${y + h}`;
    const ph1 = r() * 6, ph2 = r() * 6;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const yy = y + h * base - amp * h * (0.55 * Math.sin(t * 5.2 + ph1) + 0.35 * Math.sin(t * 13 + ph2) + 0.25);
      d += ` L${(x + t * w).toFixed(1)} ${yy.toFixed(1)}`;
    }
    return d + ` L${x + w} ${y + h} Z`;
  };
  const gid = `sky${seed}`;
  return (
    <g>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={p.id === 'kraft' ? '#E9D3AE' : '#FBD9C9'} />
          <stop offset="0.65" stopColor={p.id === 'kraft' ? '#F6E7CB' : '#FFF1E2'} />
          <stop offset="1" stopColor={p.paper} />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${gid})`} />
      <circle cx={x + w * 0.8} cy={y + h * 0.53} r={h * 0.11} fill={p.sun} opacity={0.85} />
      <circle cx={x + w * 0.8} cy={y + h * 0.53} r={h * 0.15} fill={p.sun} opacity={0.12} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${x + w * (0.06 + i * 0.05)} ${y + h * (0.42 + (i % 2) * 0.03)} q${6 * k} ${-5 * k} ${12 * k} 0 q${6 * k} ${-5 * k} ${12 * k} 0`} fill="none" stroke={p.ink} strokeWidth={2.2 * k} strokeLinecap="round" opacity={0.6} />
      ))}
      <path d={ridge(0.6, 0.16, 60)} fill={p.accent} opacity={0.28} />
      <path d={ridge(0.72, 0.13, 60)} fill={p.accent} opacity={0.5} />
      <path d={ridge(0.84, 0.1, 60)} fill={p.accent} opacity={0.85} />
      <rect x={x} y={y + h * 0.86} width={w} height={h * 0.14} fill={p.accent2} opacity={0.35} />
      {[0, 1, 2].map((i) => <line key={i} x1={x + w * (0.1 + i * 0.25)} y1={y + h * (0.9 + i * 0.03)} x2={x + w * (0.25 + i * 0.25)} y2={y + h * (0.9 + i * 0.03)} stroke={p.paper} strokeWidth={2 * k} opacity={0.7} />)}
      {/* thuyền nan */}
      <g transform={`translate(${x + w * 0.32} ${y + h * 0.9})`} fill={p.ink}>
        <path d={`M${-26 * k} 0 Q0 ${10 * k} ${26 * k} 0 L${20 * k} ${-4 * k} L${-20 * k} ${-4 * k} Z`} />
        <line x1={0} y1={-4 * k} x2={0} y2={-30 * k} stroke={p.ink} strokeWidth={2 * k} />
        <path d={`M${2 * k} ${-30 * k} L${18 * k} ${-8 * k} L${2 * k} ${-8 * k} Z`} opacity={0.85} />
      </g>
    </g>
  );
}

function BlocBoardSvg({ spec, data, photo, logo, bleed, style, uid, withBloc = false, blocPage }: {
  spec: CalSpec; data: CalData; photo?: string; logo?: string; bleed: boolean; style?: CSSProperties; uid: string; withBloc?: boolean; blocPage?: ReactNode;
}) {
  const sl = blocSlot(spec.size);
  const { W, H } = sl;
  const b = bleed ? CAL_BLEED_MM * U : 0;
  const k = W / 1200;
  const p = calPalette(spec.palette);
  const f = calFont(spec.font);
  const disp = `"${f.family}"`;
  const fl = spec.flower;
  const L = spec.layout;
  const pad = 40 * k;
  const canChi = canChiYear(CAL_YEAR);
  const stripY = H - sl.stripH;
  const corp = L === 'b-corp', frame = L === 'b-frame';
  const darkBg = frame;
  const whiteBase = p.id === 'white';

  // ---- dải thương hiệu dưới cùng ----
  const sBg = whiteBase || corp ? p.ink : p.accent;
  const lg = sl.stripH * 0.62;
  const bx = pad + (logo ? lg + 18 * k : 0);
  const contactLines = [data.phone && `Hotline ${data.phone}`, data.website, data.address].filter(Boolean) as string[];
  const strip = (
    <g>
      <rect x={-b} y={stripY} width={W + b * 2} height={sl.stripH + b} fill={sBg} />
      <rect x={-b} y={stripY} width={W + b * 2} height={5 * k} fill={p.accent2} />
      {logo && <image href={logo} x={pad} y={stripY + (sl.stripH - lg) / 2} width={lg} height={lg} preserveAspectRatio="xMidYMid meet" />}
      <text x={bx} y={stripY + sl.stripH * (data.slogan ? 0.5 : 0.62)} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand || '', W * 0.44 - (bx - pad), 46 * k, 0.66)} fill={p.accent2} letterSpacing={3 * k}>{data.brand}</text>
      {data.slogan && <text x={bx} y={stripY + sl.stripH * 0.78} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(data.slogan, W * 0.44 - (bx - pad), 20 * k, 0.52)} fill={p.onAccent} opacity={0.9}>{data.slogan}</text>}
      <g textAnchor="end" fontFamily={`"${BODY}"`} fill={p.onAccent}>
        {contactLines.map((c, i) => (
          <text key={i} x={W - pad} y={stripY + sl.stripH * (contactLines.length === 3 ? 0.36 + i * 0.23 : 0.45 + i * 0.27)} fontWeight={i === 0 ? 700 : 500} fontSize={fit(c, W * 0.45, (i === 0 ? 24 : 19) * k, 0.54)} opacity={i === 0 ? 1 : 0.9}>{c}</text>
        ))}
      </g>
    </g>
  );

  // ---- khung đặt bloc (bản in: vùng nền phẳng có viền mảnh; xem trước: dán tờ bloc lên) ----
  const slotFrame = (
    <g>
      <rect x={sl.x - 10 * k} y={sl.y - 10 * k} width={sl.w + 20 * k} height={sl.h + 20 * k} rx={6 * k} fill={darkBg ? p.onAccent : '#FFFFFF'} opacity={darkBg ? 0.16 : 0.75} />
      <rect x={sl.x - 10 * k} y={sl.y - 10 * k} width={sl.w + 20 * k} height={sl.h + 20 * k} rx={6 * k} fill="none" stroke={p.accent2} strokeWidth={2.4 * k} />
      {withBloc && blocPage && <svg x={sl.x} y={sl.y} width={sl.w} height={sl.h} viewBox={`0 0 ${sl.w} ${sl.h}`} overflow="hidden">{blocPage}</svg>}
    </g>
  );

  // ---- tiêu đề năm (dùng chung) ----
  const Title = ({ y0, h0, ink, hi }: { y0: number; h0: number; ink: string; hi: string }) => (
    <g textAnchor="middle">
      <text x={W / 2} y={y0 + h0 * 0.2} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={24 * k} fill={hi} letterSpacing={10 * k}>CHÚC MỪNG NĂM MỚI</text>
      <text x={W / 2} y={y0 + h0 * 0.62} fontFamily={disp} fontWeight={f.weight} fontSize={fit(`XUÂN ${canChi.toUpperCase()} ${CAL_YEAR}`, W * 0.84, 92 * k, 0.64)} fill={ink} letterSpacing={3 * k}>{`XUÂN ${canChi.toUpperCase()} ${CAL_YEAR}`}</text>
      {data.greeting && <text x={W / 2} y={y0 + h0 * 0.93} fontFamily={`"${SCRIPT}"`} fontWeight={700} fontSize={fit(data.greeting, W * 0.7, 58 * k, 0.5)} fill={hi}>{data.greeting}</text>}
    </g>
  );

  const art = (x: number, y: number, w: number, h: number) => photo
    ? (<><defs><clipPath id={`bp${uid}`}><rect x={x} y={y} width={w} height={h} /></clipPath></defs><image href={photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#bp${uid})`} /></>)
    : null;

  let body: ReactNode;
  const topH = sl.y - 24 * k;                        // vùng trên bloc
  if (L === 'b-classic') {
    const artH = topH * 0.56;
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
        <PatternRect id={`bcp${uid}`} x={-b} y={artH} w={W + b * 2} h={stripY - artH} color={p.accent2} opacity={0.13} cell={60 * k} />
        <defs><clipPath id={`bca${uid}`}><rect x={-b} y={-b} width={W + b * 2} height={artH + b} /></clipPath></defs>
        <g clipPath={`url(#bca${uid})`}>{art(-b, -b, W + b * 2, artH + b) || <WallArt x={-b} y={-b} w={W + b * 2} h={artH + b} seed={2} p={p} fl={fl} k={k * 2} uid={uid} rich />}</g>
        <rect x={-b} y={artH} width={W + b * 2} height={6 * k} fill={p.accent2} />
        <Title y0={artH + 10 * k} h0={topH - artH} ink={p.ink} hi={p.accent} />
        {/* cành hoa + đèn lồng hai bên tập bloc */}
        <defs><clipPath id={`bcs${uid}`}><rect x={-b} y={topH} width={W + b * 2} height={stripY - topH} /></clipPath></defs>
        <g clipPath={`url(#bcs${uid})`}>
          <Branch x={-20 * k} y={stripY - 40 * k} len={sl.x * 0.95} angle={-Math.PI * 0.36} seed={41} flower={fl} scale={2.4 * k} />
          <Branch x={W + 20 * k} y={stripY - 60 * k} len={sl.x * 0.9} angle={-Math.PI * 0.64} seed={43} flower={fl} scale={2.2 * k} />
          <Lantern x={sl.x * 0.42} y={sl.y + 120 * k} s={110 * k} body={p.accent} rib={p.accent2} string={140 * k} />
          <Lantern x={W - sl.x * 0.45} y={sl.y + 70 * k} s={90 * k} body={p.accent} rib={p.accent2} string={100 * k} />
        </g>
        {slotFrame}
        {strip}
      </>
    );
  } else if (frame) {
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.accent} />
        <PatternRect id={`bfp${uid}`} x={-b} y={-b} w={W + b * 2} h={H + b * 2} color={p.accent2} opacity={0.14} cell={56 * k} />
        {photo && <g opacity={0.9}>{art(pad, pad, W - pad * 2, topH - pad * 1.5)}</g>}
        <g fill="none" stroke={p.accent2}>
          <rect x={pad * 0.6} y={pad * 0.6} width={W - pad * 1.2} height={stripY - pad * 1.2} rx={12 * k} strokeWidth={5 * k} />
          <rect x={pad * 0.95} y={pad * 0.95} width={W - pad * 1.9} height={stripY - pad * 1.9} rx={8 * k} strokeWidth={1.6 * k} />
        </g>
        <circle cx={W / 2} cy={topH * 0.27} r={topH * 0.21} fill={p.accent2} opacity={photo ? 0 : 0.9} />
        <Cloud x={W * 0.22} y={topH * 0.36} s={130 * k} color={p.onAccent} opacity={0.4} />
        <Cloud x={W * 0.8} y={topH * 0.16} s={110 * k} color={p.onAccent} opacity={0.35} />
        <Title y0={topH * 0.5} h0={topH * 0.48} ink={p.onAccent} hi={p.accent2} />
        <defs><clipPath id={`bfc${uid}`}><rect x={pad} y={pad} width={W - pad * 2} height={stripY - pad * 2} /></clipPath></defs>
        <g clipPath={`url(#bfc${uid})`}>
          <Branch x={pad} y={pad + 30 * k} len={W * 0.32} angle={Math.PI * 0.1} seed={17} flower={fl} scale={2.1 * k} wood="#3A1E12" />
          <Branch x={W - pad} y={stripY - pad} len={sl.x * 0.95} angle={-Math.PI * 0.7} seed={19} flower={fl} scale={2.2 * k} wood="#3A1E12" />
          <Lantern x={sl.x * 0.45} y={sl.y + 100 * k} s={100 * k} body={p.accent2} rib={p.accent} string={120 * k} />
        </g>
        {slotFrame}
        {strip}
      </>
    );
  } else if (L === 'b-scene') {
    const sceneH = sl.y + sl.h * 0.55;
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
        {art(-b, -b, W + b * 2, sceneH + b) || <Scene x={-b} y={-b} w={W + b * 2} h={sceneH + b} p={p} k={k * 2} seed={5} />}
        <Title y0={pad * 0.6} h0={topH * 0.62} ink={p.ink} hi={p.accent} />
        <defs><clipPath id={`bsc${uid}`}><rect x={-b} y={-b} width={W + b * 2} height={stripY + b} /></clipPath></defs>
        <g clipPath={`url(#bsc${uid})`}>
          <Branch x={-10 * k} y={topH * 0.9} len={sl.x * 1.1} angle={-Math.PI * 0.12} seed={29} flower={fl} scale={2 * k} />
        </g>
        {slotFrame}
        {strip}
      </>
    );
  } else {
    // doanh nghiệp: đầu bảng màu chủ đạo + logo/tên lớn, cột dịch vụ 2 bên bloc
    const headH = topH * 0.62;
    const services = (data.services ?? BLOC_SERVICES_DEFAULT).split(/[·\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
    const half = Math.ceil(services.length / 2);
    const colW = sl.x - pad * 1.6;
    const Col = ({ items, x, anchor }: { items: string[]; x: number; anchor: 'start' | 'end' }) => (
      <g textAnchor={anchor} fontFamily={`"${BODY}"`}>
        {items.map((it, i) => {
          const yy = sl.y + sl.h * (0.18 + i * 0.27);
          const lines = wrapLines(it, Math.max(8, Math.floor(colW / (22 * k * 0.55))));
          return (
            <g key={i}>
              <circle cx={anchor === 'start' ? x + 8 * k : x - 8 * k} cy={yy - 8 * k} r={7 * k} fill={p.accent2} />
              {lines.slice(0, 2).map((ln, j) => (
                <text key={j} x={anchor === 'start' ? x + 26 * k : x - 26 * k} y={yy + j * 28 * k} fontWeight={j === 0 ? 700 : 500} fontSize={fit(ln, colW - 26 * k, 22 * k, 0.55)} fill={p.ink}>{ln}</text>
              ))}
            </g>
          );
        })}
      </g>
    );
    const lgH = headH * 0.5;
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
        <rect x={-b} y={-b} width={W + b * 2} height={headH + b} fill={whiteBase ? p.ink : p.accent} />
        <PatternRect id={`bkp${uid}`} x={-b} y={-b} w={W + b * 2} h={headH + b} color={p.accent2} opacity={0.12} cell={60 * k} />
        <rect x={-b} y={headH} width={W + b * 2} height={6 * k} fill={p.accent2} />
        {logo
          ? <image href={logo} x={W / 2 - lgH / 2} y={headH * 0.1} width={lgH} height={lgH} preserveAspectRatio="xMidYMid meet" />
          : <g><circle cx={W / 2} cy={headH * 0.1 + lgH / 2} r={lgH / 2} fill="none" stroke={p.accent2} strokeWidth={4 * k} /><text x={W / 2} y={headH * 0.1 + lgH * 0.64} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={lgH * 0.42} fill={p.accent2}>{(data.brand || 'AK').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</text></g>}
        <text x={W / 2} y={headH * 0.82} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand || '', W * 0.84, 84 * k, 0.66)} fill={p.onAccent} letterSpacing={4 * k}>{data.brand}</text>
        {data.slogan && <text x={W / 2} y={headH * 0.95} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fit(data.slogan, W * 0.8, 26 * k, 0.52)} fill={p.accent2}>{data.slogan}</text>}
        <g textAnchor="middle">
          <text x={W / 2} y={headH + (topH - headH) * 0.48} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={22 * k} fill={p.accent} letterSpacing={8 * k}>CHÚC MỪNG NĂM MỚI</text>
          <text x={W / 2} y={headH + (topH - headH) * 0.9} fontFamily={disp} fontWeight={f.weight} fontSize={fit(`XUÂN ${canChi.toUpperCase()} ${CAL_YEAR}`, W * 0.8, 58 * k, 0.64)} fill={p.ink} letterSpacing={3 * k}>{`XUÂN ${canChi.toUpperCase()} ${CAL_YEAR}`}</text>
        </g>
        <Col items={services.slice(0, half)} x={pad} anchor="start" />
        <Col items={services.slice(half)} x={W - pad} anchor="end" />
        {slotFrame}
        {strip}
      </>
    );
  }
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">{body}</svg>
  );
}

/** tờ bloc 1 ngày — nội dung (không gồm thẻ svg ngoài) để vừa in riêng vừa dán lên bảng xem trước */
function BlocSheetBody({ spec, data, doy, W, H, b }: { spec: CalSpec; data: CalData; doy: number; W: number; H: number; b: number }) {
  const p = calPalette(spec.palette);
  const f = calFont(spec.font);
  const disp = `"${f.family}"`;
  const k = H / 760;
  const D = blocDay(doy);
  const red = D.dow === 6 || !!D.holiday;
  const RED = p.sun;
  const numColor = red ? RED : (p.id === 'white' || p.id === 'kraft' ? p.ink : '#1C2E5A');
  const head = p.id === 'white' ? p.ink : p.accent;
  const pad = 26 * k;
  const l = D.lunar;
  const lunarMonthName = `THÁNG ${l.leap ? 'NHUẬN ' : ''}${LUNAR_MONTH_NAMES[l.month - 1].toUpperCase()}`;
  const tag = D.holiday || D.event;
  const prov = wrapLines(D.proverb, Math.floor((W - pad * 2) / (15 * k * 0.5)));
  const brandLine = [data.brand, data.phone && `Hotline ${data.phone}`, data.website].filter(Boolean).join('  ·  ');
  const colW = (W - pad * 2) / 3;
  const c1 = pad, c2 = pad + colW, c3 = pad + colW * 2;
  return (
    <g>
      <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill="#FFFFFF" />
      {/* vùng dán gáy (keo + đinh ghim) */}
      <rect x={-b} y={-b} width={W + b * 2} height={40 * k + b} fill={p.paper} />
      <line x1={-b} y1={40 * k} x2={W + b} y2={40 * k} stroke={p.accent2} strokeWidth={1.2 * k} strokeDasharray={`${4 * k} ${3 * k}`} />
      {/* dải tháng */}
      <rect x={-b} y={44 * k} width={W + b * 2} height={70 * k} fill={head} />
      <text x={pad} y={92 * k} fontFamily={disp} fontWeight={f.weight} fontSize={36 * k} fill={p.onAccent} letterSpacing={2 * k}>{`THÁNG ${D.m}`}</text>
      <text x={W - pad} y={92 * k} textAnchor="end" fontFamily={disp} fontWeight={f.weight} fontSize={36 * k} fill={p.accent2} letterSpacing={2 * k}>{CAL_YEAR}</text>
      {/* số ngày cực lớn */}
      <text x={W / 2} y={392 * k} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={300 * k} fill={numColor}>{D.d}</text>
      <text x={W / 2} y={446 * k} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={34 * k} fill={red ? RED : p.ink} letterSpacing={8 * k}>{WEEKDAY_FULL[D.dow]}</text>
      {tag && (D.holiday ? (
        <g>
          <rect x={W / 2 - fit(tag.toUpperCase(), W * 0.78, 20 * k, 0.62) * tag.length * 0.31 - 20 * k} y={462 * k} width={fit(tag.toUpperCase(), W * 0.78, 20 * k, 0.62) * tag.length * 0.62 + 40 * k} height={34 * k} rx={17 * k} fill={RED} />
          <text x={W / 2} y={486 * k} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fit(tag.toUpperCase(), W * 0.78, 20 * k, 0.62)} fill="#FFFFFF" letterSpacing={1 * k}>{tag.toUpperCase()}</text>
        </g>
      ) : (
        <text x={W / 2} y={486 * k} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={fit(tag, W * 0.8, 20 * k, 0.55)} fill={p.accent}>{tag}</text>
      ))}
      {/* vạch ngăn + hoa nhỏ */}
      <line x1={pad} y1={516 * k} x2={W / 2 - 22 * k} y2={516 * k} stroke={p.accent2} strokeWidth={1.6 * k} />
      <line x1={W / 2 + 22 * k} y1={516 * k} x2={W - pad} y2={516 * k} stroke={p.accent2} strokeWidth={1.6 * k} />
      <Blossom x={W / 2} y={516 * k} r={13 * k} flower={spec.flower} />
      {/* cột trái: giờ hoàng đạo */}
      <g fontFamily={`"${BODY}"`}>
        <text x={c1} y={550 * k} fontWeight={800} fontSize={12.5 * k} fill={p.accent} letterSpacing={1.5 * k}>GIỜ HOÀNG ĐẠO</text>
        {D.hours.map((h, i) => (
          <text key={i} x={c1} y={(572 + i * 19) * k} fontWeight={500} fontSize={fit(h, colW - 8 * k, 13.5 * k, 0.5)} fill={p.ink}>{h}</text>
        ))}
      </g>
      {/* cột giữa: âm lịch */}
      <rect x={c2 + 6 * k} y={532 * k} width={colW - 12 * k} height={160 * k} rx={10 * k} fill={p.paper} stroke={p.accent2} strokeWidth={1.4 * k} />
      <g textAnchor="middle">
        <text x={c2 + colW / 2} y={556 * k} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={12.5 * k} fill={p.accent} letterSpacing={2 * k}>ÂM LỊCH</text>
        <text x={c2 + colW / 2} y={578 * k} fontFamily={`"${BODY}"`} fontWeight={700} fontSize={fit(lunarMonthName, colW - 22 * k, 14 * k, 0.6)} fill={p.ink}>{lunarMonthName}</text>
        <text x={c2 + colW / 2} y={666 * k} fontFamily={disp} fontWeight={f.weight} fontSize={84 * k} fill={l.day === 1 || l.day === 15 ? RED : p.accent}>{l.day}</text>
      </g>
      {/* cột phải: can chi + sao */}
      <g fontFamily={`"${BODY}"`} textAnchor="end">
        <text x={W - pad} y={550 * k} fontWeight={800} fontSize={12.5 * k} fill={p.accent} letterSpacing={1.5 * k}>CAN CHI</text>
        {[`Ngày ${D.ccDay}`, `Tháng ${D.ccMonth}`, `Năm ${D.ccYear}`].map((t, i) => (
          <text key={i} x={W - pad} y={(576 + i * 24) * k} fontWeight={i === 0 ? 700 : 500} fontSize={fit(t, colW - 8 * k, 15.5 * k, 0.52)} fill={p.ink}>{t}</text>
        ))}
        <text x={W - pad} y={662 * k} fontWeight={800} fontSize={fit(D.good ? 'NGÀY HOÀNG ĐẠO' : 'NGÀY HẮC ĐẠO', colW - 8 * k, 12.5 * k, 0.62)} fill={D.good ? '#B8860B' : p.sub}>{D.good ? 'NGÀY HOÀNG ĐẠO' : 'NGÀY HẮC ĐẠO'}</text>
        <text x={W - pad} y={682 * k} fontWeight={500} fontSize={13 * k} fill={p.sub}>{`Sao ${D.star}`}</text>
      </g>
      {/* tục ngữ */}
      <g textAnchor="middle" fontFamily={`"${BODY}"`} fontStyle="italic" fill={p.sub}>
        {prov.slice(0, 2).map((ln, i) => (
          <text key={i} x={W / 2} y={(prov.length > 1 ? 712 : 722) * k + i * 18 * k} fontWeight={500} fontSize={fit(ln, W - pad * 2, 14.5 * k, 0.5)}>{ln}</text>
        ))}
      </g>
      {/* dòng thương hiệu */}
      <rect x={-b} y={738 * k} width={W + b * 2} height={22 * k + b} fill={head} />
      <text x={W / 2} y={753 * k} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={fit(brandLine, W - pad * 2, 12 * k, 0.55)} fill={p.onAccent} letterSpacing={0.6 * k}>{brandLine}</text>
    </g>
  );
}

function BlocSheetSvg({ spec, data, doy, bleed, style }: { spec: CalSpec; data: CalData; doy: number; bleed: boolean; style?: CSSProperties; uid?: string }) {
  const bs = blocSize(spec.size);
  const W = bs.blocW * U, H = bs.blocH * U;
  const b = bleed ? CAL_BLEED_MM * U : 0;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-doy={doy}>
      <BlocSheetBody spec={spec} data={data} doy={doy} W={W} H={H} b={b} />
    </svg>
  );
}

/** bảng treo có dán sẵn tờ bloc ngày doy — cho ô xem trước / mẫu */
export function BlocPreviewSvg({ spec, data, doy, photo, logo, style }: { spec: CalSpec; data: CalData; doy: number; photo?: string; logo?: string; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const bs = blocSize(spec.size);
  return (
    <BlocBoardSvg spec={spec} data={data} photo={photo} logo={logo} bleed={false} style={style} uid={uid} withBloc
      blocPage={<BlocSheetBody spec={spec} data={data} doy={doy} W={bs.blocW * U} H={bs.blocH * U} b={0} />} />
  );
}
export { BlocSheetSvg };
