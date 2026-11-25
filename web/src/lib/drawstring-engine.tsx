'use client';
// Túi rút (balo dây rút): 1 engine SVG = BỐ CỤC × VẢI × BỘ MỰC × FONT → nhiều mẫu thể thao/sự kiện, render code 100%.
// Đơn vị: 1 = 1mm, khung = VÙNG IN thật trên mặt túi.
// In lụa: mỗi phần tử thuộc 1 "màu mực" k=1..3 → giới hạn số màu, tách film từng màu (đen trên trắng, dấu chồng màu).
// In chuyển nhiệt (vải dù polyester): đủ màu + mảng nền mờ (k=0) + logo màu gốc.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';

// ---------- khổ túi ----------
export interface DSSize { id: string; name: string; wMm: number; hMm: number; pw: number; ph: number }
export const DS_SIZES: DSSize[] = [
  { id: '33x40', name: '33 × 40 cm', wMm: 330, hMm: 400, pw: 240, ph: 260 },
  { id: '35x45', name: '35 × 45 cm', wMm: 350, hMm: 450, pw: 260, ph: 300 },
  { id: '40x45', name: '40 × 45 cm', wMm: 400, hMm: 450, pw: 280, ph: 300 },
];
export const dsSize = (id: string) => DS_SIZES.find((s) => s.id === id) || DS_SIZES[1];
export const DS_CHANNEL = 40; // mm: ống luồn dây ở miệng túi
export const DS_PRINT_TOP = 80; // mm từ mép trên túi tới mép trên vùng in (ống luồn 40 + chừa nếp rút 40)

// ---------- chất liệu + màu vải ----------
export type DSMaterial = 'du' | 'canvas' | 'nonwoven';
export const DS_MATERIALS: { id: DSMaterial; name: string; note: string }[] = [
  { id: 'du', name: 'Vải dù (polyester)', note: 'Bóng nhẹ, chống nước nhẹ, in lụa hoặc chuyển nhiệt.' },
  { id: 'canvas', name: 'Vải canvas', note: 'Dày, mộc, bền — in lụa đẹp.' },
  { id: 'nonwoven', name: 'Vải không dệt', note: 'Rẻ, nhẹ — hợp quà sự kiện số lượng lớn.' },
];
export interface DSFabric { id: string; name: string; color: string; thread: string; dark?: boolean }
export const DS_FABRICS: DSFabric[] = [
  { id: 'den', name: 'Đen', color: '#1E1F22', thread: '#3A3B40', dark: true },
  { id: 'navy', name: 'Navy', color: '#1F2D4D', thread: '#33466F', dark: true },
  { id: 'do', name: 'Đỏ', color: '#C8232E', thread: '#9E1B24', dark: true },
  { id: 'xanh', name: 'Xanh dương', color: '#1E5BC6', thread: '#174A9F', dark: true },
  { id: 'la', name: 'Xanh lá', color: '#1F7A45', thread: '#186236', dark: true },
  { id: 'cam', name: 'Cam', color: '#F07A1E', thread: '#C9620F' },
  { id: 'vang', name: 'Vàng', color: '#F4C430', thread: '#CFA21B' },
  { id: 'trang', name: 'Trắng', color: '#F4F4F1', thread: '#D9D8D2' },
  { id: 'moc', name: 'Mộc (canvas)', color: '#E2D4B7', thread: '#C6B48E' },
];
export const dsFabric = (id: string) => DS_FABRICS.find((f) => f.id === id) || DS_FABRICS[0];

// ---------- bộ mực (tối đa 3 màu in lụa) ----------
export interface DSInks { id: string; name: string; c: [string, string, string] }
export const DS_INKS: DSInks[] = [
  { id: 'neon', name: 'Trắng · neon (vải tối)', c: ['#FFFFFF', '#C6FF3D', '#FF6B35'] },
  { id: 'gold', name: 'Trắng · vàng (vải tối)', c: ['#FFFFFF', '#FFC93C', '#FF5A5F'] },
  { id: 'ice', name: 'Trắng · xanh băng (vải tối)', c: ['#FFFFFF', '#8FD3FF', '#FFD166'] },
  { id: 'mono', name: 'Đen · trắng (vải màu)', c: ['#1C1C1C', '#FFFFFF', '#FFC93C'] },
  { id: 'black', name: 'Đen · đỏ (vải sáng)', c: ['#1C1C1C', '#E63946', '#1D7FD1'] },
  { id: 'navy', name: 'Navy · cam (vải sáng)', c: ['#1B2A4A', '#F28C28', '#2EC4B6'] },
  { id: 'royal', name: 'Xanh hoàng gia · đỏ', c: ['#0F3D91', '#E63946', '#1C1C1C'] },
  { id: 'forest', name: 'Xanh rừng · cam', c: ['#1E4D2B', '#F2A541', '#E4572E'] },
];
export const dsInks = (id: string) => DS_INKS.find((i) => i.id === id) || DS_INKS[0];

// ---------- font ----------
export interface DSFont { id: string; name: string; family: string; weight: number; italic?: boolean }
export const DS_FONTS: DSFont[] = [
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const dsFont = (id: string) => DS_FONTS.find((f) => f.id === id) || DS_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const DS_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&display=swap');`;

export function useDSFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ds-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ds-fonts'; link.rel = 'stylesheet';
        link.href = DS_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...DS_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục + mẫu ----------
export type DSMethod = 'screen' | 'sub';
export interface DSLayout { id: string; name: string }
export const DS_LAYOUTS: DSLayout[] = [
  { id: 'race', name: 'Giải chạy (số bib)' },
  { id: 'event', name: 'Sự kiện · hội thảo' },
  { id: 'club', name: 'CLB thể thao' },
  { id: 'school', name: 'Trường · lớp' },
  { id: 'brand', name: 'Quà thương hiệu' },
  { id: 'sport', name: 'Đội · số áo' },
];
export const dsLayout = (id: string) => DS_LAYOUTS.find((l) => l.id === id) || DS_LAYOUTS[0];

export interface DSSpec {
  layout: string; material: DSMaterial; fabric: string; inks: string; font: string; size: string;
  method: DSMethod; nInk: 1 | 2 | 3; back: boolean;
}
export interface DSTemplate { id: string; name: string; spec: Pick<DSSpec, 'layout' | 'fabric' | 'inks' | 'font' | 'nInk'> }
export const DS_TEMPLATES: DSTemplate[] = [
  { id: 'race-den', name: 'Giải chạy · đen neon', spec: { layout: 'race', fabric: 'den', inks: 'neon', font: 'oswald', nInk: 3 } },
  { id: 'race-trang', name: 'Giải chạy · trắng', spec: { layout: 'race', fabric: 'trang', inks: 'black', font: 'oswald', nInk: 2 } },
  { id: 'event-navy', name: 'Hội thảo · navy', spec: { layout: 'event', fabric: 'navy', inks: 'gold', font: 'montserrat', nInk: 3 } },
  { id: 'event-trang', name: 'Sự kiện · trắng', spec: { layout: 'event', fabric: 'trang', inks: 'navy', font: 'montserrat', nInk: 2 } },
  { id: 'club-do', name: 'CLB · đỏ', spec: { layout: 'club', fabric: 'do', inks: 'gold', font: 'oswald', nInk: 2 } },
  { id: 'club-xanh', name: 'CLB · xanh dương', spec: { layout: 'club', fabric: 'xanh', inks: 'ice', font: 'montserrat', nInk: 3 } },
  { id: 'school-navy', name: 'Lớp · navy', spec: { layout: 'school', fabric: 'navy', inks: 'gold', font: 'playfair', nInk: 2 } },
  { id: 'school-vang', name: 'Lớp · vàng', spec: { layout: 'school', fabric: 'vang', inks: 'royal', font: 'baloo', nInk: 2 } },
  { id: 'brand-la', name: 'Thương hiệu · xanh lá', spec: { layout: 'brand', fabric: 'la', inks: 'ice', font: 'baloo', nInk: 2 } },
  { id: 'brand-moc', name: 'Thương hiệu · mộc', spec: { layout: 'brand', fabric: 'moc', inks: 'forest', font: 'bvp', nInk: 2 } },
  { id: 'sport-cam', name: 'Đội · cam', spec: { layout: 'sport', fabric: 'cam', inks: 'mono', font: 'oswald', nInk: 2 } },
  { id: 'sport-den', name: 'Đội · đen', spec: { layout: 'sport', fabric: 'den', inks: 'gold', font: 'oswald', nInk: 3 } },
];

export type DSData = Record<string, string>;
export interface DSField { key: string; label: string }
const LABELS: Record<string, Record<string, string>> = {
  race: { brand: 'Tên giải chạy', big: 'Cự ly (chữ lớn)', title: 'Khẩu hiệu', subtitle: 'Ngày · địa điểm', small: 'Đồng hành / tài trợ' },
  event: { brand: 'Nhãn sự kiện', title: 'Tên sự kiện', subtitle: 'Ngày · địa điểm', small: 'Ban tổ chức', big: '' },
  club: { brand: 'Tên CLB (dưới huy hiệu)', big: 'Chữ trong huy hiệu (2–3 kí tự)', title: 'Tên đội', subtitle: 'Năm thành lập', small: 'Khẩu hiệu' },
  school: { brand: 'Tên trường (quanh huy hiệu)', title: 'Lớp', subtitle: 'Niên khoá', small: 'Khẩu hiệu lớp', big: '' },
  brand: { brand: 'Tên thương hiệu', title: 'Slogan', subtitle: 'Dòng phụ', small: 'Website / fanpage', big: '' },
  sport: { brand: 'Tên đội / CLB', big: 'Số (lớn)', title: 'Chữ lớn', subtitle: 'Giải đấu', small: 'Website / fanpage' },
};
export const dsFields = (layout: string): DSField[] => {
  const l = LABELS[layout] || LABELS.race;
  return ['brand', 'big', 'title', 'subtitle', 'small'].filter((k) => l[k]).map((k) => ({ key: k, label: l[k] }));
};
export const DS_SAMPLES: Record<string, DSData> = {
  race: { brand: 'An Khang Fun Run', big: '5K', title: 'Chạy vì cộng đồng', subtitle: '12.04.2027 · Phú Mỹ Hưng', small: 'Đồng hành: CLB Chạy bộ Quốc Bảo' },
  event: { brand: 'Tech Summit', big: '', title: 'Chuyển đổi số 2027', subtitle: '20.05.2027 · GEM Center, TP.HCM', small: 'BTC: Hội Doanh nhân trẻ An Khang' },
  club: { brand: 'Gia Khánh United', big: 'GK', title: 'FC Gia Khánh', subtitle: 'Est. 2019', small: 'Đoàn kết · Tốc độ · Bản lĩnh' },
  school: { brand: 'Trường THPT Thu Hà', big: '', title: 'Lớp 12A1', subtitle: 'Niên khoá 2024 – 2027', small: 'Tuổi trẻ · Tri thức · Khát vọng' },
  brand: { brand: 'An Khang Mart', big: '', title: 'Mua sắm xanh mỗi ngày', subtitle: 'Túi dùng lại · Bảo vệ môi trường', small: 'ankhangmart.vn' },
  sport: { brand: 'Quốc Bảo Badminton', big: '07', title: 'Team QB', subtitle: 'Giải cầu lông mở rộng 2027', small: 'qbbadminton.vn' },
};
export const defaultDSData = (layout = 'race'): DSData => ({ ...(DS_SAMPLES[layout] || DS_SAMPLES.race) });

// ---------- màu ----------
const lum = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** mực k (1..3) sau khi gộp theo số màu in lụa */
export const dsMapInk = (spec: Pick<DSSpec, 'method' | 'nInk'>, k: number) => (spec.method === 'screen' ? Math.min(k, spec.nInk) : k);
export function dsUsedInks(spec: DSSpec): { k: number; color: string }[] {
  const inks = dsInks(spec.inks).c;
  const n = spec.method === 'screen' ? spec.nInk : 3;
  return Array.from({ length: n }, (_, i) => ({ k: i + 1, color: inks[i] }));
}
/** mực chính gần màu vải → in chìm */
export const dsLowContrast = (spec: DSSpec) => Math.abs(lum(dsInks(spec.inks).c[0]) - lum(dsFabric(spec.fabric).color)) < 0.28;

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
function textBlock(text: string, ts: TS, r: Region, o: { size: number; maxLines?: number; lh?: number; fill: string; upper?: boolean; key?: string; skew?: number }): ReactNode {
  let t = (o.upper ? (text || '').toUpperCase() : text || '').trim();
  if (!t) return null;
  const lh = o.lh ?? 1.12;
  const segs = t.split(' · ');
  if (segs.length > 1 && segs.length <= (o.maxLines ?? 1) && textW(t, o.size, ts) > r.maxW) t = segs.join('\n');
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

const star5 = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    d += `${i ? 'L' : 'M'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
  }
  return d + 'Z';
};
const chevron = (x: number, y: number, w: number, h: number, t: number) => `M${x} ${y} L${x + t} ${y} L${x + t + w} ${y + h / 2} L${x + t} ${y + h} L${x} ${y + h} L${x + w} ${y + h / 2} Z`;
function initials(brand: string) {
  const ws = (brand || '').trim().split(/\s+/).filter(Boolean);
  return (ws.length > 1 ? ws[0][0] + ws[1][0] : (ws[0] || 'A').slice(0, 2)).toUpperCase();
}

// ---------- vẽ 1 mặt ----------
interface Item { k: 0 | 1 | 2 | 3; n: ReactNode }
interface Ctx {
  W: number; H: number; u: number; data: DSData; c: (k: number) => string; disp: TS;
  logo: boolean; logoBox: (x: number, y: number, w: number, h: number) => ReactNode; uid: string;
}
function brandOrLogo(x: Ctx, r: Region, ts: TS, size: number, fill: string, k: 1 | 2 | 3, upper = true): Item {
  if (x.logo) {
    const h = r.bottom - r.top, w = Math.min(r.maxW, h * 2.6);
    const lx = r.anchor === 'start' ? r.x : r.anchor === 'end' ? r.x - w : r.x - w / 2;
    return { k: 1, n: x.logoBox(lx, r.top, w, h) };
  }
  return { k, n: textBlock(x.data.brand, ts, r, { size, fill, upper, key: 'brand' }) };
}

const LAYOUTS: Record<string, (x: Ctx) => { items: Item[]; tint?: { x: number; y: number; w: number; h: number; r: number } }> = {
  // số bib giải chạy: khung bib bo góc, 4 lỗ ghim, tên giải, cự ly cực lớn, mũi tên tốc độ, vạch xé
  race(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    const bx = W * 0.04, by = H * 0.03, bw = W * 0.92, bh = H * 0.8, rr = u * 4;
    items.push({ k: 1, n: <rect key="bib" x={bx} y={by} width={bw} height={bh} rx={rr} fill="none" stroke={c(1)} strokeWidth={u * 1.1} /> });
    [[bx + u * 5, by + u * 5], [bx + bw - u * 5, by + u * 5], [bx + u * 5, by + bh - u * 5], [bx + bw - u * 5, by + bh - u * 5]].forEach(([px, py], i) =>
      items.push({ k: 1, n: <circle key={`pin${i}`} cx={px} cy={py} r={u * 1.6} fill="none" stroke={c(1)} strokeWidth={u * 0.55} /> }));
    // dải đầu bib (mực 2), tên giải KHOÉT khỏi dải (lộ màu vải) → không thêm màu, in 1 màu vẫn đọc được
    const hy = by + u * 10, hh = bh * 0.17, hx = bx + u * 10, hw = bw - u * 20;
    if (x.logo) {
      items.push({ k: 2, n: <rect key="band" x={hx} y={hy} width={hw} height={hh} rx={u * 2} fill="none" stroke={c(2)} strokeWidth={u * 0.8} /> });
      items.push({ k: 1, n: x.logoBox(hx + u * 3, hy + hh * 0.12, hw - u * 6, hh * 0.76) });
    } else {
      const mid = `dsbib-${x.uid}`;
      const label = textBlock(data.brand, { fam: disp.fam, wt: disp.wt, ls: u * 0.3 }, { x: W / 2, top: hy + hh * 0.14, bottom: hy + hh * 0.86, maxW: hw - u * 8 }, { size: hh * 0.62, fill: '#000000', upper: true, key: 'brand' });
      items.push({ k: 2, n: <g key="band"><defs><mask id={mid} maskUnits="userSpaceOnUse" x={hx} y={hy} width={hw} height={hh}><rect x={hx} y={hy} width={hw} height={hh} fill="#ffffff" />{label}</mask></defs><rect x={hx} y={hy} width={hw} height={hh} rx={u * 2} fill={c(2)} mask={`url(#${mid})`} /></g> });
    }
    // cự ly cực lớn
    items.push({ k: 1, n: textBlock(data.big || '5K', disp, { x: W / 2, top: hy + hh + u * 1, bottom: by + bh * 0.735, maxW: bw * 0.72 }, { size: bh * 0.56, lh: 1, fill: c(1), key: 'big', upper: true }) });
    // chevron tốc độ 2 bên
    const cy0 = by + bh * 0.47, ch = bh * 0.1;
    for (let i = 0; i < 3; i++) {
      items.push({ k: 3, n: <path key={`cl${i}`} d={chevron(bx + u * 4 + i * u * 4.2, cy0 - ch / 2, u * 3.4, ch, u * 1.8)} fill={c(3)} transform={`rotate(180 ${bx + u * 4 + i * u * 4.2 + u * 2.6} ${cy0})`} /> });
      items.push({ k: 3, n: <path key={`cr${i}`} d={chevron(bx + bw - u * 9.2 - i * u * 4.2, cy0 - ch / 2, u * 3.4, ch, u * 1.8)} fill={c(3)} /> });
    }
    items.push({ k: 2, n: textBlock(data.title, { fam: BODY, wt: 800, ls: u * 0.25 }, { x: W / 2, top: by + bh * 0.73, bottom: by + bh * 0.84, maxW: bw * 0.84 }, { size: bh * 0.07, fill: c(2), key: 'title', upper: true }) });
    // vạch xé (răng cưa) + ngày
    items.push({ k: 1, n: <line key="tear" x1={bx + u * 3} y1={by + bh * 0.87} x2={bx + bw - u * 3} y2={by + bh * 0.87} stroke={c(1)} strokeWidth={u * 0.5} strokeDasharray={`${u * 1.6} ${u * 1.2}`} /> });
    items.push({ k: 1, n: textBlock(data.subtitle, { fam: BODY, wt: 800 }, { x: W / 2, top: by + bh * 0.885, bottom: by + bh * 0.975, maxW: bw * 0.86 }, { size: bh * 0.05, fill: c(1), key: 'sub' }) });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.87, bottom: H * 0.975, maxW: W * 0.9 }, { size: H * 0.036, maxLines: 2, fill: c(1), key: 'small' }) });
    return { items, tint: { x: bx, y: by, w: bw, h: bh, r: rr } };
  },

  event(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    const cid = `dsclip-${x.uid}`;
    items.push({ k: 2, n: <g key="arcs"><defs><clipPath id={cid}><rect x={0} y={0} width={W} height={H} /></clipPath></defs><g clipPath={`url(#${cid})`}>{[0.18, 0.28, 0.38, 0.48].map((r) => <circle key={r} cx={W} cy={0} r={W * r} fill="none" stroke={c(2)} strokeWidth={u * 1.5} />)}</g></g> });
    for (let r = 0; r < 3; r++) for (let cc = 0; cc < 5; cc++) items.push({ k: 3, n: <circle key={`d${r}-${cc}`} cx={W * 0.06 + cc * u * 4} cy={H * 0.06 + r * u * 4} r={u * 0.8} fill={c(3)} /> });
    const tagTs: TS = { fam: BODY, wt: 800, ls: u * 0.6 };
    const tag = (data.brand || '').toUpperCase().trim();
    if (tag) {
      let ts = H * 0.04; const tw = textW(tag, ts, tagTs); if (tw > W * 0.62) ts = (ts * W * 0.62) / tw;
      const bw = textW(tag, ts, tagTs) + u * 6, by = H * 0.22;
      items.push({ k: 1, n: <g key="tag"><rect x={W * 0.06} y={by} width={bw} height={ts * 1.9} rx={ts * 0.95} fill="none" stroke={c(1)} strokeWidth={u * 0.6} /><text x={W * 0.06 + u * 3} y={by + ts * 1.3} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ts} letterSpacing={tagTs.ls} fill={c(1)}>{tag}</text></g> });
    }
    items.push({ k: 1, n: textBlock(data.title, disp, { x: W * 0.06, top: H * 0.32, bottom: H * 0.64, maxW: W * 0.88, anchor: 'start' }, { size: H * 0.12, maxLines: 3, lh: 1.04, fill: c(1), key: 't' }) });
    items.push({ k: 2, n: <rect key="rule" x={W * 0.06} y={H * 0.67} width={W * 0.3} height={u * 1.3} fill={c(2)} /> });
    items.push({ k: 2, n: textBlock(data.subtitle, { fam: BODY, wt: 800 }, { x: W * 0.06, top: H * 0.7, bottom: H * 0.83, maxW: W * 0.88, anchor: 'start' }, { size: H * 0.048, maxLines: 2, lh: 1.2, fill: c(2), key: 's' }) });
    if (x.logo) items.push({ k: 1, n: x.logoBox(W * 0.7, H * 0.85, W * 0.26, H * 0.13) });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W * 0.06, top: H * 0.87, bottom: H * 0.975, maxW: x.logo ? W * 0.6 : W * 0.88, anchor: 'start' }, { size: H * 0.034, maxLines: 2, lh: 1.2, fill: c(1), key: 'sm' }) });
    return { items };
  },

  // huy hiệu khiên CLB: khiên 2 viền, chữ tắt lớn, 3 sao, quả bóng nét mảnh, tên đội + năm thành lập
  club(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    const sw = Math.min(W * 0.62, H * 0.5), sh = sw * 1.16, sx = W / 2 - sw / 2, sy = H * 0.09;
    const shield = (inset: number) => {
      const l = sx + inset, r = sx + sw - inset, t = sy + inset, b = sy + sh - inset, m = W / 2;
      return `M${l} ${t + sw * 0.08} Q${m} ${t - sw * 0.04} ${r} ${t + sw * 0.08} L${r} ${t + (b - t) * 0.52} Q${r} ${b - (b - t) * 0.16} ${m} ${b} Q${l} ${b - (b - t) * 0.16} ${l} ${t + (b - t) * 0.52} Z`;
    };
    items.push({ k: 1, n: <path key="sh1" d={shield(0)} fill="none" stroke={c(1)} strokeWidth={u * 1.4} strokeLinejoin="round" /> });
    items.push({ k: 2, n: <path key="sh2" d={shield(u * 3.2)} fill="none" stroke={c(2)} strokeWidth={u * 0.7} strokeLinejoin="round" /> });
    [-1, 0, 1].forEach((i) => items.push({ k: 3, n: <path key={`st${i}`} d={star5(W / 2 + i * sw * 0.18, sy + sh * 0.2 - (i === 0 ? u * 1.5 : 0), i === 0 ? u * 3.4 : u * 2.6)} fill={c(3)} /> }));
    if (x.logo) items.push({ k: 1, n: x.logoBox(W / 2 - sw * 0.3, sy + sh * 0.3, sw * 0.6, sh * 0.42) });
    else {
      const ini = (data.big || initials(data.brand)).slice(0, 3).toUpperCase();
      items.push({ k: 1, n: textBlock(ini, disp, { x: W / 2, top: sy + sh * 0.3, bottom: sy + sh * 0.62, maxW: sw * 0.66 }, { size: sh * 0.34, fill: c(1), key: 'ini' }) });
      // quả bóng nét mảnh
      const bcx = W / 2, bcy = sy + sh * 0.74, br = sw * 0.09;
      items.push({ k: 2, n: <g key="ball" fill="none" stroke={c(2)} strokeWidth={u * 0.6}><circle cx={bcx} cy={bcy} r={br} /><path d={`M${bcx - br * 0.36} ${bcy - br * 0.2} L${bcx} ${bcy - br * 0.48} L${bcx + br * 0.36} ${bcy - br * 0.2} L${bcx + br * 0.22} ${bcy + br * 0.26} L${bcx - br * 0.22} ${bcy + br * 0.26} Z`} fill={c(2)} /></g> });
    }
    const top = sy + sh + H * 0.03;
    items.push({ k: 1, n: textBlock(data.title, disp, { x: W / 2, top, bottom: top + H * 0.13, maxW: W * 0.92 }, { size: H * 0.1, fill: c(1), upper: true, key: 'title' }) });
    items.push({ k: 2, n: textBlock(data.subtitle, { fam: BODY, wt: 800, ls: u * 0.8 }, { x: W / 2, top: top + H * 0.13, bottom: top + H * 0.19, maxW: W * 0.7 }, { size: H * 0.04, fill: c(2), upper: true, key: 'sub' }) });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: W / 2, top: H * 0.92, bottom: H * 0.985, maxW: W * 0.86 }, { size: H * 0.033, fill: c(1), key: 'sm' }) });
    return { items, tint: { x: sx, y: sy, w: sw, h: sh, r: sw * 0.12 } };
  },

  // huy hiệu trường tròn (tên trường chạy vòng), quyển sách + ngọn đuốc, tên lớp lớn, niên khoá
  school(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    const cx = W / 2, R = Math.min(W * 0.36, H * 0.26), cy = R + H * 0.05;
    const r2 = R * 0.72, rr = (R + r2) / 2, band = R - r2;
    items.push({ k: 1, n: <circle key="o" cx={cx} cy={cy} r={R} fill="none" stroke={c(1)} strokeWidth={u * 1.2} /> });
    items.push({ k: 1, n: <circle key="i" cx={cx} cy={cy} r={r2} fill="none" stroke={c(1)} strokeWidth={u * 0.55} /> });
    items.push({ k: 1, n: <g key="at">{arcText((data.brand || '').toUpperCase(), { fam: BODY, wt: 800 }, cx, cy, rr, band * 0.5, 230, c(1))}</g> });
    if (x.logo) items.push({ k: 1, n: x.logoBox(cx - r2 * 0.68, cy - r2 * 0.68, r2 * 1.36, r2 * 1.36) });
    else {
      const k = r2 / 50, ox = cx - 50 * k, oy = cy - 50 * k;
      const g = (key: string, kk: 1 | 2 | 3, node: ReactNode) => items.push({ k: kk, n: <g key={key} transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) scale(${k.toFixed(4)})`}>{node}</g> });
      g('book', 1, <path d="M18 66 Q34 58 50 66 Q66 58 82 66 L82 80 Q66 72 50 80 Q34 72 18 80 Z M50 66 L50 80" fill="none" stroke={c(1)} strokeWidth={2.4} strokeLinejoin="round" />);
      g('torch', 1, <path d="M44 62 L56 62 L53 38 L47 38 Z" fill="none" stroke={c(1)} strokeWidth={2.2} strokeLinejoin="round" />);
      g('flame', 2, <path d="M50 14 C58 22 60 28 56 34 C54 37 46 37 44 34 C40 28 44 22 50 14 Z" fill={c(2)} />);
      g('flame2', 3, <path d="M50 24 C54 28 54 31 52 33.5 C51 34.5 49 34.5 48 33.5 C46 31 46 28 50 24 Z" fill={c(3)} />);
    }
    const top = cy + R + H * 0.04;
    items.push({ k: 2, n: textBlock(data.title, disp, { x: cx, top, bottom: top + H * 0.2, maxW: W * 0.92 }, { size: H * 0.16, fill: c(2), key: 'title' }) });
    items.push({ k: 1, n: textBlock(data.subtitle, { fam: BODY, wt: 800, ls: u * 0.5 }, { x: cx, top: top + H * 0.2, bottom: top + H * 0.27, maxW: W * 0.86 }, { size: H * 0.045, fill: c(1), upper: true, key: 'sub' }) });
    items.push({ k: 1, n: <line key="r" x1={W * 0.3} y1={top + H * 0.285} x2={W * 0.7} y2={top + H * 0.285} stroke={c(1)} strokeWidth={u * 0.5} /> });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600 }, { x: cx, top: top + H * 0.3, bottom: H * 0.985, maxW: W * 0.86 }, { size: H * 0.036, maxLines: 2, fill: c(1), key: 'sm' }) });
    return { items, tint: { x: cx - R, y: cy - R, w: R * 2, h: R * 2, r: R } };
  },

  // quà thương hiệu: tên lớn + slogan, hoạ tiết lá/vòng tròn tái chế, website
  brand(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    // vòng mũi tên tái chế cách điệu
    const cx = W / 2, cy = H * 0.24, R = Math.min(W, H) * 0.16;
    for (let i = 0; i < 3; i++) {
      const a0 = (i * 120 - 80) * Math.PI / 180, a1 = a0 + 95 * Math.PI / 180;
      const p = (a: number, r: number) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
      items.push({ k: 2, n: <path key={`ar${i}`} d={`M${p(a0, R)} A${R} ${R} 0 0 1 ${p(a1, R)}`} fill="none" stroke={c(2)} strokeWidth={u * 2.2} strokeLinecap="round" /> });
      const tip = a1 + 0.02;
      items.push({ k: 2, n: <path key={`ah${i}`} d={`M${p(tip + 0.18, R)} L${p(tip, R - u * 4)} L${p(tip, R + u * 4)} Z`} fill={c(2)} /> });
    }
    if (x.logo) items.push({ k: 1, n: x.logoBox(cx - R * 0.7, cy - R * 0.7, R * 1.4, R * 1.4) });
    else items.push({ k: 1, n: textBlock(initials(data.brand), disp, { x: cx, top: cy - R * 0.55, bottom: cy + R * 0.55, maxW: R * 1.2 }, { size: R, fill: c(1), key: 'ini' }) });
    items.push({ k: 1, n: textBlock(data.brand, disp, { x: cx, top: H * 0.45, bottom: H * 0.64, maxW: W * 0.92 }, { size: H * 0.13, maxLines: 2, lh: 1.02, fill: c(1), key: 'brand' }) });
    items.push({ k: 2, n: textBlock(data.title, { fam: BODY, wt: 800 }, { x: cx, top: H * 0.66, bottom: H * 0.76, maxW: W * 0.9 }, { size: H * 0.06, fill: c(2), key: 'title' }) });
    items.push({ k: 1, n: textBlock(data.subtitle, { fam: BODY, wt: 600 }, { x: cx, top: H * 0.77, bottom: H * 0.85, maxW: W * 0.88 }, { size: H * 0.04, fill: c(1), key: 'sub' }) });
    items.push({ k: 1, n: <rect key="bar" x={W * 0.38} y={H * 0.875} width={W * 0.24} height={u * 0.9} fill={c(1)} /> });
    items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 800, ls: u * 0.4 }, { x: cx, top: H * 0.9, bottom: H * 0.985, maxW: W * 0.8 }, { size: H * 0.036, fill: c(1), key: 'sm' }) });
    return { items, tint: { x: cx - R * 1.4, y: cy - R * 1.4, w: R * 2.8, h: R * 2.8, r: R * 1.4 } };
  },

  // đội thể thao: sọc chéo động, chữ lớn nghiêng, số áo cực lớn viền
  sport(x) {
    const { W, H, u, c, data, disp } = x;
    const items: Item[] = [];
    const cid = `dssp-${x.uid}`;
    const st = (i: number, kk: 2 | 3) => {
      const o = i * u * 9, w = u * 6;
      return { k: kk, n: <path key={`sp${i}`} d={`M${-W * 0.1 + o} ${H * 0.42} L${-W * 0.1 + o + w} ${H * 0.42} L${W * 0.42 + o + w} 0 L${W * 0.42 + o} 0 Z`} fill={c(kk)} clipPath={`url(#${cid})`} /> } as Item;
    };
    items.push({ k: 0, n: <defs key="def"><clipPath id={cid}><rect x={0} y={0} width={W} height={H} /></clipPath></defs> });
    items.push(st(0, 2), st(1, 3), st(2, 2));
    const num = (data.big || '').trim();
    items.push({ k: 1, n: textBlock(data.title, { fam: disp.fam, wt: disp.wt }, { x: W / 2, top: H * 0.42, bottom: H * 0.6, maxW: W * 0.94 }, { size: H * 0.16, fill: c(1), upper: true, key: 'title' }) });
    if (num) {
      items.push({ k: 2, n: textBlock(num, disp, { x: W / 2, top: H * 0.58, bottom: H * 0.84, maxW: W * 0.6 }, { size: H * 0.26, fill: c(2), key: 'num' }) });
    }
    items.push(brandOrLogo(x, { x: W / 2, top: num ? H * 0.84 : H * 0.62, bottom: num ? H * 0.905 : H * 0.74, maxW: W * 0.86 }, { fam: BODY, wt: 800, ls: u * 0.5 }, H * 0.045, c(1), 1));
    items.push({ k: 1, n: textBlock(data.subtitle, { fam: BODY, wt: 600 }, { x: W / 2, top: num ? H * 0.905 : H * 0.76, bottom: num ? H * 0.95 : H * 0.84, maxW: W * 0.88 }, { size: H * 0.034, fill: c(1), key: 'sub' }) });
    items.push({ k: 3, n: textBlock(data.small, { fam: BODY, wt: 800, ls: u * 0.4 }, { x: W / 2, top: H * 0.95, bottom: H * 0.995, maxW: W * 0.8 }, { size: H * 0.028, fill: c(3), key: 'sm' }) });
    return { items };
  },
};

function backMini(x: Ctx): { items: Item[] } {
  const { W, H, u, c, data, disp } = x;
  const items: Item[] = [brandOrLogo(x, { x: W / 2, top: H * 0.04, bottom: H * 0.15, maxW: W * 0.72 }, { fam: disp.fam, wt: disp.wt }, H * 0.08, c(1), 1)];
  items.push({ k: 1, n: <line key="r" x1={W * 0.42} y1={H * 0.17} x2={W * 0.58} y2={H * 0.17} stroke={c(1)} strokeWidth={u * 0.6} /> });
  items.push({ k: 1, n: textBlock(data.small, { fam: BODY, wt: 600, ls: u * 0.3 }, { x: W / 2, top: H * 0.18, bottom: H * 0.24, maxW: W * 0.72 }, { size: H * 0.032, fill: c(1), key: 'sm' }) });
  return { items };
}

/** khung 1 mặt in. sep = 1..3 → film tách màu (đen, có lề + dấu chồng màu). */
export function DrawstringSvg({ spec, data, side = 'front', logo, sep, style }: {
  spec: DSSpec; data: DSData; side?: 'front' | 'back'; logo?: string; sep?: 1 | 2 | 3; style?: CSSProperties;
}) {
  const sz = dsSize(spec.size);
  const W = sz.pw, H = sz.ph, u = W / 100;
  const inks = dsInks(spec.inks).c;
  const f = dsFont(spec.font);
  const c = (k: number) => (sep ? '#000000' : inks[Math.max(1, dsMapInk(spec, k)) - 1]);
  const screen = spec.method === 'screen';
  const uid = `${W}-${sep || 0}-${side}-${spec.inks}-${spec.layout}`;
  const fid = `dsink-${uid}`;
  const logoBox = (lx: number, ly: number, lw: number, lh: number) => logo
    ? <image key="logo" href={logo} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="xMidYMid meet" filter={screen || sep ? `url(#${fid})` : undefined} />
    : null;
  const ctx: Ctx = { W, H, u, data, c, disp: { fam: f.family, wt: f.weight }, logo: !!logo, logoBox, uid };
  type Tint = { x: number; y: number; w: number; h: number; r: number };
  const res: { items: Item[]; tint?: Tint } = side === 'back' ? backMini(ctx) : (LAYOUTS[spec.layout] || LAYOUTS.race)(ctx);
  let items = res.items.filter((it) => it.n);
  if (sep) items = items.filter((it) => it.k === 0 || dsMapInk(spec, it.k) === sep);
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
          {/* logo khách → 1 màu mực (in lụa): tối = mực, sáng/trong = không in */}
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
      {tint && <rect x={tint.x} y={tint.y} width={tint.w} height={tint.h} rx={tint.r} fill={inks[1]} opacity={0.16} data-tint="1" />}
      {items.map((it, i) => <g key={i} data-ink={it.k || undefined}>{it.n}</g>)}
      {sep && (
        <g data-marks="1">
          {reg(-M / 2, -M / 2)}{reg(W + M / 2, -M / 2)}{reg(-M / 2, H + M / 2)}{reg(W + M / 2, H + M / 2)}
          <text x={W / 2} y={-M / 2 + 1.5} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={4} fill="#000000">{`Film màu ${sep} · ${inks[sep - 1]} · ${side === 'back' ? 'mặt sau' : 'mặt trước'} · ${W}×${H}mm`}</text>
        </g>
      )}
    </svg>
  );
}
