'use client';
// Túi vải canvas (tote): 1 engine SVG = BỐ CỤC × VẢI × BỘ MỰC × FONT → nhiều mẫu, render code 100% (không AI).
// Đơn vị: 1 = 1mm, khung = VÙNG IN thật trên túi (tối đa ~25×30cm).
// In lụa: mỗi phần tử thuộc 1 "màu mực" k=1..3 → giới hạn số màu, tách film từng màu (đen trên trắng, có dấu chồng màu).
// In chuyển nhiệt/DTF: đủ màu + lớp nền mờ (k=0) + logo màu gốc.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';

// ---------- khổ túi ----------
export interface TTSize { id: string; name: string; wMm: number; hMm: number; pw: number; ph: number }
export const TT_SIZES: TTSize[] = [
  { id: '33x38', name: '33 × 38 cm', wMm: 330, hMm: 380, pw: 220, ph: 250 },
  { id: '35x40', name: '35 × 40 cm', wMm: 350, hMm: 400, pw: 240, ph: 280 },
  { id: '38x42', name: '38 × 42 cm', wMm: 380, hMm: 420, pw: 250, ph: 300 },
];
export const ttSize = (id: string) => TT_SIZES.find((s) => s.id === id) || TT_SIZES[1];
export const TT_GUSSETS = [
  { id: 0, name: 'Không đáy' },
  { id: 80, name: 'Đáy 8cm' },
  { id: 100, name: 'Đáy 10cm' },
];
export const TT_PRINT_TOP = 70; // mm từ mép trên túi tới mép trên vùng in (viền gấp 30mm + 40mm)
export const TT_HEM = 30;

// ---------- vải ----------
export interface TTFabric { id: string; name: string; color: string; thread: string; dark?: boolean }
export const TT_FABRICS: TTFabric[] = [
  { id: 'moc', name: 'Canvas mộc', color: '#E4D6BA', thread: '#C9B790' },
  { id: 'kem', name: 'Kem', color: '#F2ECDF', thread: '#D9CFBA' },
  { id: 'trang', name: 'Trắng', color: '#F7F6F2', thread: '#DCD9D0' },
  { id: 'hong', name: 'Hồng phấn', color: '#E9C6BE', thread: '#D2A79C' },
  { id: 'den', name: 'Đen', color: '#1F1F21', thread: '#3B3B40', dark: true },
  { id: 'navy', name: 'Navy', color: '#25314B', thread: '#3A4869', dark: true },
  { id: 'reu', name: 'Xanh rêu', color: '#56653F', thread: '#6F8055', dark: true },
  { id: 'do', name: 'Đỏ đô', color: '#6A2330', thread: '#8A3644', dark: true },
];
export const ttFabric = (id: string) => TT_FABRICS.find((f) => f.id === id) || TT_FABRICS[0];

// ---------- bộ mực (tối đa 3 màu in lụa) ----------
export interface TTInks { id: string; name: string; c: [string, string, string] }
export const TT_INKS: TTInks[] = [
  { id: 'espresso', name: 'Nâu cà phê', c: ['#3B2A1E', '#C0603E', '#D9A441'] },
  { id: 'forest', name: 'Rừng', c: ['#2F5233', '#86A86F', '#C0603E'] },
  { id: 'navy', name: 'Navy san hô', c: ['#1F3A68', '#E2725B', '#E8B547'] },
  { id: 'black', name: 'Đen đỏ', c: ['#1C1C1C', '#D7263D', '#2E86AB'] },
  { id: 'indigo', name: 'Indigo cam', c: ['#3B3B98', '#F28C28', '#1A9E8F'] },
  { id: 'cream', name: 'Kem vàng (vải tối)', c: ['#F4ECDC', '#E3B448', '#E2725B'] },
  { id: 'white', name: 'Trắng hồng (vải tối)', c: ['#FFFFFF', '#F4A6B8', '#8FD3C1'] },
];
export const ttInks = (id: string) => TT_INKS.find((i) => i.id === id) || TT_INKS[0];

// ---------- font ----------
export interface TTFont { id: string; name: string; family: string; weight: number }
export const TT_FONTS: TTFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
];
export const ttFont = (id: string) => TT_FONTS.find((f) => f.id === id) || TT_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT: TS = { fam: 'Dancing Script', wt: 700 };
export const TT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Prata&family=Dancing+Script:wght@700&display=swap');`;

export function useTTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-tt-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-tt-fonts'; link.rel = 'stylesheet';
        link.href = TT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TT_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `700 40px "Dancing Script"`, `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục + mẫu ----------
export type TTMethod = 'screen' | 'dtf';
export interface TTLayout { id: string; name: string }
export const TT_LAYOUTS: TTLayout[] = [
  { id: 'logo', name: 'Logo shop' },
  { id: 'quote', name: 'Câu chữ' },
  { id: 'leaf', name: 'Cây lá' },
  { id: 'coffee', name: 'Cà phê' },
  { id: 'books', name: 'Sách' },
  { id: 'city', name: 'Thành phố' },
  { id: 'event', name: 'Sự kiện · hội thảo' },
];
export const ttLayout = (id: string) => TT_LAYOUTS.find((l) => l.id === id) || TT_LAYOUTS[0];

export interface TTSpec {
  layout: string; fabric: string; inks: string; font: string; size: string;
  gusset: number; method: TTMethod; nInk: 1 | 2 | 3; back: boolean;
}
export interface TTTemplate { id: string; name: string; spec: Pick<TTSpec, 'layout' | 'fabric' | 'inks' | 'font' | 'nInk'> }
export const TT_TEMPLATES: TTTemplate[] = [
  { id: 'logo-moc', name: 'Logo shop · mộc', spec: { layout: 'logo', fabric: 'moc', inks: 'espresso', font: 'playfair', nInk: 2 } },
  { id: 'logo-den', name: 'Logo shop · đen', spec: { layout: 'logo', fabric: 'den', inks: 'cream', font: 'playfair', nInk: 2 } },
  { id: 'quote-kem', name: 'Câu chữ · kem', spec: { layout: 'quote', fabric: 'kem', inks: 'navy', font: 'montserrat', nInk: 2 } },
  { id: 'quote-den', name: 'Câu chữ · đen', spec: { layout: 'quote', fabric: 'den', inks: 'white', font: 'oswald', nInk: 2 } },
  { id: 'leaf-moc', name: 'Cây lá · mộc', spec: { layout: 'leaf', fabric: 'moc', inks: 'forest', font: 'prata', nInk: 3 } },
  { id: 'leaf-reu', name: 'Cây lá · rêu', spec: { layout: 'leaf', fabric: 'reu', inks: 'cream', font: 'prata', nInk: 2 } },
  { id: 'coffee-moc', name: 'Cà phê · mộc', spec: { layout: 'coffee', fabric: 'moc', inks: 'espresso', font: 'oswald', nInk: 2 } },
  { id: 'books-kem', name: 'Tiệm sách · kem', spec: { layout: 'books', fabric: 'kem', inks: 'navy', font: 'playfair', nInk: 3 } },
  { id: 'city-navy', name: 'Sài Gòn · navy', spec: { layout: 'city', fabric: 'navy', inks: 'cream', font: 'oswald', nInk: 3 } },
  { id: 'city-trang', name: 'Sài Gòn · trắng', spec: { layout: 'city', fabric: 'trang', inks: 'black', font: 'oswald', nInk: 2 } },
  { id: 'event-kem', name: 'Hội thảo · kem', spec: { layout: 'event', fabric: 'kem', inks: 'indigo', font: 'montserrat', nInk: 3 } },
  { id: 'event-den', name: 'Sự kiện · đen', spec: { layout: 'event', fabric: 'den', inks: 'white', font: 'baloo', nInk: 2 } },
];

export type TTData = Record<string, string>;
export interface TTField { key: string; label: string; multiline?: boolean }
const LABELS: Record<string, Record<string, string>> = {
  logo: { brand: 'Tên shop (chữ quanh vòng)', title: 'Slogan dưới logo', subtitle: 'Dòng nhỏ dưới vòng', small: 'Website / hashtag' },
  quote: { brand: 'Tên shop', title: 'Câu chính (chữ viết tay)', subtitle: 'Câu phụ (chữ in)', small: 'Website / hashtag' },
  leaf: { brand: 'Tên shop', title: 'Câu chính', subtitle: 'Dòng phụ', small: 'Website / hashtag' },
  coffee: { brand: 'Tên quán', title: 'Câu chính (chữ viết tay)', subtitle: 'Dòng phụ', small: 'Dòng nhỏ (năm, web)' },
  books: { brand: 'Tên tiệm', title: 'Câu chính', subtitle: 'Câu phụ (chữ viết tay)', small: 'Website / hashtag' },
  city: { brand: 'Chữ lớn (tên thành phố)', title: 'Chữ viết tay', subtitle: 'Dòng phụ', small: 'Dòng nhỏ' },
  event: { brand: 'Nhãn sự kiện', title: 'Tên sự kiện', subtitle: 'Ngày · địa điểm', small: 'Ban tổ chức' },
};
export const ttFields = (layout: string): TTField[] => {
  const l = LABELS[layout] || LABELS.logo;
  return [{ key: 'brand', label: l.brand }, { key: 'title', label: l.title }, { key: 'subtitle', label: l.subtitle }, { key: 'small', label: l.small }];
};
export const TT_SAMPLES: Record<string, TTData> = {
  logo: { brand: 'An Khang Coffee', title: 'Cà phê rang mộc', subtitle: 'Est. 2024 · Sài Gòn', small: 'ankhang.coffee' },
  quote: { brand: 'Thu Hà Store', title: 'Sống chậm', subtitle: 'lại một chút', small: 'thuhastore.vn' },
  leaf: { brand: 'Xanh Garden', title: 'Sống xanh mỗi ngày', subtitle: 'Cây cảnh · Chậu · Đất sạch', small: 'xanhgarden.vn' },
  coffee: { brand: 'Gia Khánh Coffee', title: 'Một tách cà phê', subtitle: 'cho ngày dài thong thả', small: 'Since 2021 · Đà Lạt' },
  books: { brand: 'Tiệm sách Quốc Bảo', title: 'Đọc sách mỗi ngày', subtitle: 'mỗi trang một chân trời', small: '#docsachcungquocbao' },
  city: { brand: 'Sài Gòn', title: 'thương lắm', subtitle: 'Hòn ngọc Viễn Đông', small: 'Made in Saigon' },
  event: { brand: 'Startup Day', title: 'Khởi nghiệp số 2027', subtitle: '15.03.2027 · GEM Center, TP.HCM', small: 'Ban tổ chức: CLB Doanh nhân An Khang' },
};
export const defaultTTData = (layout = 'logo'): TTData => ({ ...(TT_SAMPLES[layout] || TT_SAMPLES.logo) });

// ---------- màu ----------
const lum = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** mực k (1..3) sau khi gộp theo số màu in lụa */
export const mapInk = (spec: Pick<TTSpec, 'method' | 'nInk'>, k: number) => (spec.method === 'screen' ? Math.min(k, spec.nInk) : k);
export function ttUsedInks(spec: TTSpec): { k: number; color: string }[] {
  const inks = ttInks(spec.inks).c;
  const n = spec.method === 'screen' ? spec.nInk : 3;
  return Array.from({ length: n }, (_, i) => ({ k: i + 1, color: inks[i] }));
}
/** mực chính gần màu vải → in chìm */
export const lowContrast = (spec: TTSpec) => Math.abs(lum(ttInks(spec.inks).c[0]) - lum(ttFabric(spec.fabric).color)) < 0.28;

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
/** co chữ tới khi vừa maxLines dòng + vừa chiều cao; dòng 1 từ quá dài thì co thêm → luôn trong bề rộng */
function fitLines(text: string, maxW: number, maxH: number, size: number, ts: TS, maxLines: number, lh: number) {
  let s = size, lines = wrap(text, maxW, s, ts);
  const tooBig = () => lines.length > maxLines || lines.length * s * lh > maxH || lines.some((l) => textW(l, s, ts) > maxW + 0.01);
  let guard = 0;
  while (tooBig() && guard++ < 80) { s *= 0.95; lines = wrap(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  // cân dòng: tránh 1 chữ mồ côi
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
/** khối chữ canh giữa theo chiều dọc trong vùng [top,bottom] */
function textBlock(text: string, ts: TS, r: Region, o: { size: number; maxLines?: number; lh?: number; fill: string; upper?: boolean; key?: string }): ReactNode {
  let t = (o.upper ? (text || '').toUpperCase() : text || '').trim();
  if (!t) return null;
  const lh = o.lh ?? 1.12;
  // "ngày · nơi · …" không vừa 1 dòng → ngắt đúng ở dấu chấm giữa thay vì giữa cụm
  const segs = t.split(' · ');
  if (segs.length > 1 && segs.length <= (o.maxLines ?? 1) && textW(t, o.size, ts) > r.maxW) t = segs.join('\n');
  // chiều cao khối theo số đo THẬT của font (ascent/descent): Oswald, Playfair cao hơn hẳn Montserrat
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

/** chữ chạy theo cung tròn, từng kí tự 1 <text> (outline được) */
function arcText(text: string, ts: TS, cx: number, cy: number, rr: number, size: number, maxDeg: number, fill: string, bottom = false): ReactNode {
  const t = (text || '').trim();
  if (!t) return null;
  const chars = [...t];
  const gap = size * 0.12;
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

const star4 = (cx: number, cy: number, r: number) => `M${cx} ${cy - r} Q${cx + r * 0.18} ${cy - r * 0.18} ${cx + r} ${cy} Q${cx + r * 0.18} ${cy + r * 0.18} ${cx} ${cy + r} Q${cx - r * 0.18} ${cy + r * 0.18} ${cx - r} ${cy} Q${cx - r * 0.18} ${cy - r * 0.18} ${cx} ${cy - r}Z`;
const star5 = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
};
const leafPath = (l: number, w: number) => `M0 0 C${w} ${-l * 0.25} ${w * 0.9} ${-l * 0.75} 0 ${-l} C${-w * 0.9} ${-l * 0.75} ${-w} ${-l * 0.25} 0 0Z`;

// ---------- vẽ 1 mặt ----------
interface Item { k: 0 | 1 | 2 | 3; n: ReactNode }
interface Ctx {
  W: number; H: number; u: number; data: TTData; c: (k: number) => string;
  disp: TS; logo: ReactNode | null; // logo khách (đã nhuộm mực 1 nếu in lụa) — hàm đặt vào hộp
  logoBox: (x: number, y: number, w: number, h: number) => ReactNode;
}

function initials(brand: string) {
  const ws = (brand || '').trim().split(/\s+/).filter(Boolean);
  return (ws.length > 1 ? ws[0][0] + ws[1][0] : (ws[0] || 'A').slice(0, 2)).toUpperCase();
}

function brandOrLogo(x: Ctx, r: Region, ts: TS, size: number, fill: string, k: 1 | 2 | 3, upper = true): Item {
  if (x.logo) {
    const h = r.bottom - r.top, w = Math.min(r.maxW, h * 2.4);
    const lx = r.anchor === 'start' ? r.x : r.anchor === 'end' ? r.x - w : r.x - w / 2;
    return { k: 1, n: x.logoBox(lx, r.top, w, h) };
  }
  return { k, n: textBlock(x.data.brand, ts, r, { size, fill, upper }) };
}

const LAYOUTS: Record<string, (x: Ctx) => { items: Item[]; tint?: { cx: number; cy: number; r: number } }> = {
  logo(x) {
    const { W, H, u, c, data, disp } = x;
    const cx = W / 2, R = Math.min(W * 0.4, H * 0.33), cy = R + H * 0.06 + u * 2;
    const r2 = R * 0.74, rr = (R + r2) / 2, band = R - r2;
    const items: Item[] = [
      { k: 1, n: <circle key="o" cx={cx} cy={cy} r={R} fill="none" stroke={c(1)} strokeWidth={u * 1.3} /> },
      { k: 1, n: <circle key="i" cx={cx} cy={cy} r={r2} fill="none" stroke={c(1)} strokeWidth={u * 0.55} /> },
      { k: 1, n: <g key="at">{arcText((data.brand || '').toUpperCase(), { fam: BODY, wt: 800 }, cx, cy, rr, band * 0.5, 150, c(1))}</g> },
      { k: 1, n: <g key="ab">{arcText(data.subtitle, { fam: BODY, wt: 600 }, cx, cy, rr, band * 0.36, 95, c(1), true)}</g> },
      { k: 2, n: <path key="s1" d={star5(cx - rr, cy, band * 0.22)} fill={c(2)} /> },
      { k: 2, n: <path key="s2" d={star5(cx + rr, cy, band * 0.22)} fill={c(2)} /> },
    ];
    if (x.logo) items.push({ k: 1, n: x.logoBox(cx - r2 * 0.7, cy - r2 * 0.7, r2 * 1.4, r2 * 1.4) });
    else {
      const ini = initials(data.brand);
      const ts = { fam: disp.fam, wt: disp.wt };
      let s = r2 * 1.0; const w = textW(ini, s, ts); if (w > r2 * 1.35) s = (s * r2 * 1.35) / w;
      items.push({ k: 2, n: <text key="ini" x={cx} y={cy + s * 0.34} textAnchor="middle" fontFamily={`"${disp.fam}"`} fontWeight={disp.wt} fontSize={s} fill={c(2)}>{ini}</text> });
      items.push({ k: 1, n: <line key="l1" x1={cx - r2 * 0.42} y1={cy + s * 0.34 + u * 4} x2={cx + r2 * 0.42} y2={cy + s * 0.34 + u * 4} stroke={c(1)} strokeWidth={u * 0.55} /> });
    }
    const top = cy + R + H * 0.045;
    items.push({ k: 1, n: textBlock(data.title, disp, { x: cx, top, bottom: H * 0.9, maxW: W * 0.92 }, { size: H * 0.085, maxLines: 2, fill: c(1), key: 'title' }) });
    items.push({ k: 2, n: textBlock(data.small, { fam: BODY, wt: 600, ls: u * 0.2 }, { x: cx, top: H * 0.9, bottom: H * 0.985, maxW: W * 0.8 }, { size: H * 0.038, fill: c(2), key: 'small' }) });
    return { items, tint: { cx, cy, r: r2 } };
  },

  quote(x) {
    const { W, H, u, c, data, disp } = x;
    const cx = W / 2;
    const items: Item[] = [];
    [-1, 0, 1].forEach((i) => items.push({ k: 2, n: <path key={`st${i}`} d={star4(cx + i * u * 9, H * 0.07, i === 0 ? u * 3.2 : u * 2)} fill={c(2)} /> }));
    items.push({ k: 2, n: textBlock(data.title, SCRIPT, { x: cx, top: H * 0.12, bottom: H * 0.5, maxW: W * 0.94 }, { size: H * 0.24, maxLines: 2, lh: 0.95, fill: c(2), key: 't' }) });
    items.push({ k: 1, n: textBlock(data.subtitle, disp, { x: cx, top: H * 0.5, bottom: H * 0.7, maxW: W * 0.9 }, { size: H * 0.1, maxLines: 2, upper: true, fill: c(1), key: 's' }) });
    const sy = H * 0.75;
    items.push({ k: 2, n: <path key="sw" d={`M${W * 0.22} ${sy} C${W * 0.36} ${sy - u * 4} ${W * 0.46} ${sy + u * 4} ${W * 0.6} ${sy} S${W * 0.74} ${sy - u * 3} ${W * 0.78} ${sy + u * 1}`} fill="none" stroke={c(2)} strokeWidth={u * 0.9} strokeLinecap="round" /> });
    items.push(brandOrLogo(x, { x: cx, top: H * 0.82, bottom: H * 0.9, maxW: W * 0.7 }, { fam: BODY, wt: 800, ls: u * 0.6 }, H * 0.045, c(1), 1));
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: cx, top: H * 0.91, bottom: H * 0.985, maxW: W * 0.7 }, { size: H * 0.032, fill: c(1), key: 'sm' }) });
    return { items, tint: { cx, cy: H * 0.38, r: W * 0.34 } };
  },

  leaf(x) {
    const { W, H, u, c, data, disp } = x;
    const D = Math.min(W * 0.8, H * 0.54), ox = W / 2 - D / 2, oy = H * 0.03, k = D / 100;
    const P = (px: number, py: number) => [ox + px * k, oy + py * k];
    // thân cong (bezier) từ dưới lên
    const p0 = [50, 99], p1 = [30, 70], p2 = [70, 30], p3 = [52, 3];
    const bz = (t: number) => {
      const m = 1 - t;
      return [0, 1].map((i) => m * m * m * p0[i] + 3 * m * m * t * p1[i] + 3 * m * t * t * p2[i] + t * t * t * p3[i]);
    };
    const tan = (t: number) => { const a = bz(Math.max(0, t - 0.01)), b = bz(Math.min(1, t + 0.01)); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
    const [s0x, s0y] = P(p0[0], p0[1]), [s1x, s1y] = P(p1[0], p1[1]), [s2x, s2y] = P(p2[0], p2[1]), [s3x, s3y] = P(p3[0], p3[1]);
    const items: Item[] = [{ k: 1, n: <path key="stem" d={`M${s0x} ${s0y} C${s1x} ${s1y} ${s2x} ${s2y} ${s3x} ${s3y}`} fill="none" stroke={c(1)} strokeWidth={u * 0.9} strokeLinecap="round" /> }];
    const leaves = [0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74, 0.84];
    leaves.forEach((t, i) => {
      const [bx, by] = bz(t);
      const side = i % 2 ? 1 : -1;
      const ang = (tan(t) * 180) / Math.PI + 90 + side * 52; // lá chĩa lên, lệch 2 bên
      const len = (26 - t * 12) * k, wd = len * 0.42;
      const [px, py] = P(bx, by);
      const tr = `translate(${px.toFixed(2)} ${py.toFixed(2)}) rotate(${ang.toFixed(1)})`;
      // màu lá in lệch nhẹ (phong cách riso, dễ chồng màu)
      items.push({ k: 2, n: <path key={`lf${i}`} d={leafPath(len, wd)} fill={c(2)} transform={`translate(${(px + u * 1.1).toFixed(2)} ${(py + u * 0.9).toFixed(2)}) rotate(${ang.toFixed(1)})`} /> });
      items.push({ k: 1, n: <g key={`lo${i}`} transform={tr}><path d={leafPath(len, wd)} fill="none" stroke={c(1)} strokeWidth={u * 0.55} strokeLinejoin="round" /><path d={`M0 0 L0 ${-len * 0.86}`} stroke={c(1)} strokeWidth={u * 0.4} strokeLinecap="round" /></g> });
    });
    [[60, 14], [66, 20], [57, 22]].forEach(([bx, by], i) => { const [px, py] = P(bx, by); items.push({ k: 3, n: <circle key={`b${i}`} cx={px} cy={py} r={u * 1.6} fill={c(3)} /> }); });
    items.push({ k: 1, n: textBlock(data.title, disp, { x: W / 2, top: H * 0.6, bottom: H * 0.79, maxW: W * 0.92 }, { size: H * 0.085, maxLines: 2, fill: c(1), key: 't' }) });
    items.push({ k: 1, n: textBlock(data.subtitle, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.79, bottom: H * 0.86, maxW: W * 0.88 }, { size: H * 0.04, fill: c(1), key: 's' }) });
    items.push(brandOrLogo(x, { x: W / 2, top: H * 0.875, bottom: H * 0.935, maxW: W * 0.7 }, { fam: BODY, wt: 800, ls: u * 0.7 }, H * 0.036, c(2), 2));
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.935, bottom: H * 0.99, maxW: W * 0.7 }, { size: H * 0.028, fill: c(1), key: 'sm' }) });
    return { items, tint: { cx: W / 2, cy: oy + D * 0.5, r: D * 0.44 } };
  },

  coffee(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    items.push(brandOrLogo(x, { x: W / 2, top: H * 0.02, bottom: H * 0.12, maxW: W * 0.9 }, { fam: disp.fam, wt: disp.wt, ls: u * 0.5 }, H * 0.07, c(1), 1));
    const D = Math.min(W * 0.72, H * 0.5), ox = W / 2 - D / 2, oy = H * 0.13, k = D / 100;
    const sw = 1.5; // nét (đơn vị bản vẽ)
    const g = (key: string, kk: 1 | 2 | 3, node: ReactNode) => items.push({ k: kk, n: <g key={key} transform={`translate(${ox} ${oy}) scale(${k})`}>{node}</g> });
    g('saucer', 1, <ellipse cx={50} cy={89} rx={42} ry={7} fill="none" stroke={c(1)} strokeWidth={sw} />);
    g('saucer2', 1, <ellipse cx={50} cy={88} rx={22} ry={3.2} fill="none" stroke={c(1)} strokeWidth={sw * 0.6} />);
    g('top', 2, <ellipse cx={50} cy={52} rx={27} ry={4.6} fill={c(2)} />);
    g('cup', 1, <><path d="M22 52 L78 52 C78 72 70 86 50 86 C30 86 22 72 22 52 Z" fill="none" stroke={c(1)} strokeWidth={sw} strokeLinejoin="round" /><ellipse cx={50} cy={52} rx={28} ry={5.2} fill="none" stroke={c(1)} strokeWidth={sw} /><path d="M77.5 58 C92 55 93 77 73 76" fill="none" stroke={c(1)} strokeWidth={sw} strokeLinecap="round" /></>);
    g('steam', 2, <>{[38, 50, 62].map((sx, i) => <path key={i} d={`M${sx} ${44 - i % 2 * 2} C${sx - 6} ${36} ${sx + 6} ${30} ${sx} ${22} C${sx - 4} ${16} ${sx + 2} ${12} ${sx} ${6 + i % 2 * 3}`} fill="none" stroke={c(2)} strokeWidth={sw * 0.9} strokeLinecap="round" />)}</>);
    const beans = [[14, 74, -30], [86, 70, 25], [78, 96, -10], [20, 97, 15]];
    beans.forEach(([bx, by, r], i) => {
      g(`bn${i}`, 2, <ellipse cx={bx} cy={by} rx={5} ry={3.3} fill={c(2)} transform={`rotate(${r} ${bx} ${by})`} />);
      g(`bl${i}`, 1, <path d={`M${bx - 4} ${by} C${bx - 1} ${by - 1.6} ${bx + 1} ${by + 1.6} ${bx + 4} ${by}`} fill="none" stroke={c(1)} strokeWidth={0.8} transform={`rotate(${r} ${bx} ${by})`} />);
    });
    items.push({ k: 2, n: textBlock(data.title, SCRIPT, { x: W / 2, top: H * 0.65, bottom: H * 0.8, maxW: W * 0.92 }, { size: H * 0.1, maxLines: 2, lh: 0.95, fill: c(2), key: 't' }) });
    items.push({ k: 1, n: textBlock(data.subtitle, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.8, bottom: H * 0.88, maxW: W * 0.88 }, { size: H * 0.042, fill: c(1), key: 's' }) });
    items.push({ k: 1, n: <line key="r1" x1={W * 0.3} y1={H * 0.9} x2={W * 0.7} y2={H * 0.9} stroke={c(1)} strokeWidth={u * 0.45} /> });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 800, ls: u * 0.4 }, { x: W / 2, top: H * 0.91, bottom: H * 0.985, maxW: W * 0.8 }, { size: H * 0.03, upper: true, fill: c(1), key: 'sm' }) });
    return { items, tint: { cx: W / 2, cy: oy + D * 0.55, r: D * 0.46 } };
  },

  books(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    items.push({ k: 1, n: textBlock(data.title, disp, { x: W / 2, top: H * 0.02, bottom: H * 0.27, maxW: W * 0.9 }, { size: H * 0.11, maxLines: 2, lh: 1.05, fill: c(1), key: 't' }) });
    const D = Math.min(W * 0.78, H * 0.44), ox = W / 2 - D / 2, oy = H * 0.28, k = D / 100;
    const sw = 1.4;
    const g = (key: string, kk: 1 | 2 | 3, node: ReactNode) => items.push({ k: kk, n: <g key={key} transform={`translate(${ox} ${oy}) scale(${k})`}>{node}</g> });
    const book = (key: string, bx: number, by: number, bw: number, bh: number, rot: number, kk: 2 | 3) => {
      const tr = `rotate(${rot} ${bx + bw / 2} ${by + bh / 2})`;
      g(`${key}f`, kk, <rect x={bx} y={by} width={bw} height={bh} rx={1.6} fill={c(kk)} transform={tr} />);
      g(`${key}o`, 1, <g transform={tr}><rect x={bx} y={by} width={bw} height={bh} rx={1.6} fill="none" stroke={c(1)} strokeWidth={sw} /><line x1={bx + 7} y1={by} x2={bx + 7} y2={by + bh} stroke={c(1)} strokeWidth={sw * 0.7} /><line x1={bx + bw - 7} y1={by} x2={bx + bw - 7} y2={by + bh} stroke={c(1)} strokeWidth={sw * 0.7} /><rect x={bx + bw * 0.32} y={by + bh * 0.36} width={bw * 0.36} height={bh * 0.28} fill="none" stroke={c(1)} strokeWidth={sw * 0.6} /></g>);
    };
    book('b1', 8, 80, 84, 17, 0, 2);
    book('b2', 15, 63, 72, 16, -3, 3);
    book('b3', 11, 47, 76, 15, 2.5, 2);
    // chậu cây nhỏ trên chồng sách
    g('pot', 3, <path d="M41 46 L59 46 L56 32 L44 32 Z" fill={c(3)} />);
    g('poto', 1, <path d="M41 46 L59 46 L56 32 L44 32 Z M42.5 32 L57.5 32" fill="none" stroke={c(1)} strokeWidth={sw} strokeLinejoin="round" />);
    [[-38, 22], [0, 25], [38, 22], [-14, 17], [16, 18]].forEach(([a, l], i) => {
      g(`pl${i}`, 2, <path d={leafPath(l, l * 0.4)} fill={c(2)} transform={`translate(51 33) rotate(${a})`} />);
      g(`plo${i}`, 1, <path d={leafPath(l, l * 0.4)} fill="none" stroke={c(1)} strokeWidth={sw * 0.7} transform={`translate(50 32) rotate(${a})`} />);
    });
    items.push({ k: 2, n: textBlock(data.subtitle, SCRIPT, { x: W / 2, top: H * 0.73, bottom: H * 0.85, maxW: W * 0.9 }, { size: H * 0.075, maxLines: 2, lh: 0.95, fill: c(2), key: 's' }) });
    items.push(brandOrLogo(x, { x: W / 2, top: H * 0.86, bottom: H * 0.925, maxW: W * 0.86 }, { fam: BODY, wt: 800, ls: u * 0.55 }, H * 0.04, c(1), 1));
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.93, bottom: H * 0.99, maxW: W * 0.8 }, { size: H * 0.03, fill: c(1), key: 'sm' }) });
    return { items, tint: { cx: W / 2, cy: oy + D * 0.6, r: D * 0.46 } };
  },

  city(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    items.push(brandOrLogo(x, { x: W / 2, top: H * 0.0, bottom: H * 0.2, maxW: W * 0.94 }, { fam: disp.fam, wt: disp.wt }, H * 0.2, c(1), 1));
    items.push({ k: 2, n: textBlock(data.title, SCRIPT, { x: W / 2, top: H * 0.19, bottom: H * 0.33, maxW: W * 0.8 }, { size: H * 0.11, fill: c(2), key: 't' }) });
    const s = Math.min((W * 0.96) / 200, (H * 0.46) / 120), ox = W / 2 - 100 * s, oy = H * 0.33;
    const g = (key: string, kk: 1 | 2 | 3, node: ReactNode) => items.push({ k: kk, n: <g key={key} transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${s.toFixed(4)})`}>{node}</g> });
    const sw = 1.3;
    const towers = [
      'M122 100 L125 22 L129 10 L131 0 L133 10 L137 22 L140 100 Z', // Landmark 81
      'M86 100 L88 40 Q95 27 105 30 L106 100 Z', // Bitexco
    ];
    const blocks: [number, number, number, number][] = [[6, 72, 18, 28], [26, 60, 16, 40], [44, 52, 14, 48], [60, 66, 22, 34], [108, 58, 12, 42], [144, 64, 16, 36], [162, 50, 15, 50], [179, 72, 16, 28]];
    // mặt trời bị toà nhà che: mask (khoét chữ, không in màu vải)
    const mid = `ttsun-${Math.round(W)}-${Math.round(H)}`;
    g('sun', 2, <><defs><mask id={mid} maskUnits="userSpaceOnUse" x={0} y={0} width={200} height={120}><rect x={0} y={0} width={200} height={120} fill="#fff" />{towers.map((d, i) => <path key={i} d={d} fill="#000" stroke="#000" strokeWidth={sw * 2.5} />)}{blocks.map(([bx, by, bw, bh], i) => <rect key={i} x={bx} y={by} width={bw} height={bh} fill="#000" stroke="#000" strokeWidth={sw * 2.5} />)}</mask></defs><circle cx={152} cy={40} r={18} fill={c(2)} mask={`url(#${mid})`} /></>);
    g('tw', 1, <>{towers.map((d, i) => <path key={i} d={d} fill="none" stroke={c(1)} strokeWidth={sw} strokeLinejoin="round" />)}
      <ellipse cx={100} cy={47} rx={8} ry={2} fill="none" stroke={c(1)} strokeWidth={sw * 0.8} />
      {[30, 45, 60, 75, 90].map((yy) => <line key={yy} x1={124.5 - (100 - yy) * 0.0} y1={yy} x2={137.5} y2={yy} stroke={c(1)} strokeWidth={sw * 0.5} />)}
      {blocks.map(([bx, by, bw, bh], i) => <g key={i}><rect x={bx} y={by} width={bw} height={bh} fill="none" stroke={c(1)} strokeWidth={sw} />
        {Array.from({ length: Math.floor((bh - 6) / 7) }, (_, r) => Array.from({ length: Math.max(1, Math.floor((bw - 4) / 5)) }, (_, cc) => <rect key={`${r}-${cc}`} x={bx + 3 + cc * 5} y={by + 4 + r * 7} width={2.2} height={3} fill={c(1)} />))}</g>)}
      <line x1={0} y1={100} x2={200} y2={100} stroke={c(1)} strokeWidth={sw} />
      {[[160, 14], [170, 20], [176, 12]].map(([bx, by], i) => <path key={i} d={`M${bx - 4} ${by} Q${bx - 2} ${by - 2.5} ${bx} ${by} Q${bx + 2} ${by - 2.5} ${bx + 4} ${by}`} fill="none" stroke={c(1)} strokeWidth={sw * 0.7} />)}</>);
    g('river', 3, <>{[106, 112, 118].map((yy, i) => <path key={yy} d={`M${10 + i * 14} ${yy} ${Array.from({ length: 8 - i * 2 }, (_, j) => `q5 -2.6 10 0 t10 0`).join(' ')}`} fill="none" stroke={c(3)} strokeWidth={sw} strokeLinecap="round" transform={`translate(${i * 18} 0)`} />)}</>);
    items.push({ k: 1, n: textBlock(data.subtitle, disp, { x: W / 2, top: oy + 120 * s + H * 0.02, bottom: H * 0.9, maxW: W * 0.86 }, { size: H * 0.06, upper: true, fill: c(1), key: 's' }) });
    items.push({ k: 2, n: textBlock(data.small, { fam: BODY, wt: 800, ls: u * 0.5 }, { x: W / 2, top: H * 0.91, bottom: H * 0.985, maxW: W * 0.8 }, { size: H * 0.032, upper: true, fill: c(2), key: 'sm' }) });
    return { items };
  },

  event(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    const cid = `ttclip-${Math.round(W)}-${Math.round(H)}`;
    items.push({ k: 2, n: <g key="arcs"><defs><clipPath id={cid}><rect x={0} y={0} width={W} height={H} /></clipPath></defs><g clipPath={`url(#${cid})`}>{[0.16, 0.25, 0.34, 0.43].map((r) => <circle key={r} cx={W} cy={0} r={W * r} fill="none" stroke={c(2)} strokeWidth={u * 1.5} />)}</g></g> });
    for (let r = 0; r < 3; r++) for (let cc = 0; cc < 5; cc++) items.push({ k: 3, n: <circle key={`d${r}-${cc}`} cx={W * 0.06 + cc * u * 4} cy={H * 0.05 + r * u * 4} r={u * 0.75} fill={c(3)} /> });
    const tagTs: TS = { fam: BODY, wt: 800, ls: u * 0.6 };
    const tag = (data.brand || '').toUpperCase().trim();
    if (tag) {
      let ts = H * 0.036; const tw = textW(tag, ts, tagTs); if (tw > W * 0.6) ts = (ts * W * 0.6) / tw;
      const bw = textW(tag, ts, tagTs) + u * 6, by = H * 0.2;
      items.push({ k: 1, n: <g key="tag"><rect x={W * 0.06} y={by} width={bw} height={ts * 1.9} rx={ts * 0.95} fill="none" stroke={c(1)} strokeWidth={u * 0.6} /><text x={W * 0.06 + u * 3} y={by + ts * 1.3} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ts} letterSpacing={tagTs.ls} fill={c(1)}>{tag}</text></g> });
    }
    items.push({ k: 1, n: textBlock(data.title, disp, { x: W * 0.06, top: H * 0.3, bottom: H * 0.63, maxW: W * 0.88, anchor: 'start' }, { size: H * 0.11, maxLines: 3, lh: 1.04, fill: c(1), key: 't' }) });
    items.push({ k: 2, n: <rect key="rule" x={W * 0.06} y={H * 0.66} width={W * 0.3} height={u * 1.2} fill={c(2)} /> });
    items.push({ k: 2, n: textBlock(data.subtitle, { fam: BODY, wt: 800 }, { x: W * 0.06, top: H * 0.69, bottom: H * 0.82, maxW: W * 0.88, anchor: 'start' }, { size: H * 0.045, maxLines: 2, lh: 1.2, fill: c(2), key: 's' }) });
    if (x.logo) items.push({ k: 1, n: x.logoBox(W * 0.72, H * 0.84, W * 0.24, H * 0.14) });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W * 0.06, top: H * 0.87, bottom: H * 0.97, maxW: x.logo ? W * 0.62 : W * 0.88, anchor: 'start' }, { size: H * 0.032, maxLines: 2, lh: 1.2, fill: c(1), key: 'sm' }) });
    return { items };
  },
};

function backMini(x: Ctx): { items: Item[] } {
  const { W, H, u, c, data, disp } = x;
  const items: Item[] = [brandOrLogo(x, { x: W / 2, top: H * 0.03, bottom: H * 0.14, maxW: W * 0.7 }, { fam: disp.fam, wt: disp.wt }, H * 0.08, c(1), 1)];
  items.push({ k: 2, n: <line key="r" x1={W * 0.42} y1={H * 0.16} x2={W * 0.58} y2={H * 0.16} stroke={c(2)} strokeWidth={u * 0.6} /> });
  items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600, ls: u * 0.3 }, { x: W / 2, top: H * 0.17, bottom: H * 0.22, maxW: W * 0.7 }, { size: H * 0.03, fill: c(1), key: 'sm' }) });
  return { items };
}

/** khung 1 mặt in. sep = 1..3 → film tách màu (đen, có lề + dấu chồng màu). */
export function ToteSvg({ spec, data, side = 'front', logo, sep, style }: {
  spec: TTSpec; data: TTData; side?: 'front' | 'back'; logo?: string; sep?: 1 | 2 | 3; style?: CSSProperties;
}) {
  const sz = ttSize(spec.size);
  const W = sz.pw, H = sz.ph, u = W / 100;
  const inks = ttInks(spec.inks).c;
  const f = ttFont(spec.font);
  const c = (k: number) => (sep ? '#000000' : inks[Math.max(1, mapInk(spec, k)) - 1]);
  const screen = spec.method === 'screen';
  const fid = `ttink-${W}-${sep || 0}-${side}-${c(1).slice(1)}`;
  const logoBox = (lx: number, ly: number, lw: number, lh: number) => logo
    ? <image key="logo" href={logo} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="xMidYMid meet" filter={screen || sep ? `url(#${fid})` : undefined} />
    : null;
  const ctx: Ctx = { W, H, u, data, c, disp: { fam: f.family, wt: f.weight }, logo: logo ? true : null, logoBox };
  const res: { items: Item[]; tint?: { cx: number; cy: number; r: number } } = side === 'back' ? backMini(ctx) : (LAYOUTS[spec.layout] || LAYOUTS.logo)(ctx);
  let items = res.items.filter((it) => it.n);
  if (sep) items = items.filter((it) => it.k > 0 && mapInk(spec, it.k) === sep);
  const tint = !screen && !sep && res.tint ? res.tint : null;
  const M = sep ? 15 : 0;
  const vb = `${-M} ${-M} ${W + M * 2} ${H + M * 2}`;
  const reg = (rx: number, ry: number) => (
    <g key={`${rx}-${ry}`} stroke="#000000" strokeWidth={0.25} fill="none"><circle cx={rx} cy={ry} r={3} /><line x1={rx - 5} y1={ry} x2={rx + 5} y2={ry} /><line x1={rx} y1={ry - 5} x2={rx} y2={ry + 5} /></g>
  );
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-side={side} data-sep={sep || undefined}>
      {logo && (screen || sep) && (
        <defs>
          {/* logo khách → 1 màu mực (in lụa không in được ảnh màu): tối = mực, sáng/trong = không in */}
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
      {tint && <circle cx={tint.cx} cy={tint.cy} r={tint.r} fill={inks[1]} opacity={0.16} data-tint="1" />}
      {items.map((it, i) => <g key={i} data-ink={it.k}>{it.n}</g>)}
      {sep && (
        <g data-marks="1">
          {reg(-M / 2, -M / 2)}{reg(W + M / 2, -M / 2)}{reg(-M / 2, H + M / 2)}{reg(W + M / 2, H + M / 2)}
          <text x={W / 2} y={-M / 2 + 1.5} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={4} fill="#000000">{`Film màu ${sep} · ${inks[sep - 1]} · ${side === 'back' ? 'mặt sau' : 'mặt trước'} · ${W}×${H}mm`}</text>
        </g>
      )}
    </svg>
  );
}
