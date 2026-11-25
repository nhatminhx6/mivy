'use client';
// Thẻ hành lý: 1 engine SVG = LOẠI THẺ × BỐ CỤC × BẢNG MÀU × FONT → nhiều mẫu, render code 100% (không AI).
// Đơn vị: 10 = 1mm. 3 loại: PVC in 2 mặt (có khe xỏ dây) · da simili (logo ép kim/ép chìm, mặt sau ô nhựa trong kẹp thẻ)
// · cao su đúc nổi 1 màu (mặt sau túi kẹp thẻ). Mặt sau = thẻ thông tin "Họ tên / SĐT / Địa chỉ / Chuyến bay / Tour" + QR.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';
import { qrPath } from './flyer-qr';

export const U = 10; // đơn vị / mm
export const LT_BLEED_MM = 2;
export const CUTCONTOUR = '#EC008C';
const f1 = (n: number) => Math.round(n * 10) / 10;

// ---------- loại thẻ ----------
export type LTKind = 'pvc' | 'leather' | 'rubber';
export interface LTRect { x: number; y: number; w: number; h: number; r: number } // mm
export interface LTKindInfo {
  id: LTKind; name: string; note: string; wMm: number; hMm: number; r: number;
  slot: { w: number; h: number; y: number };       // khe xỏ dây (tâm theo y, giữa theo x)
  window?: LTRect;                                  // ô nhựa trong mặt sau (da / cao su)
  card?: { wMm: number; hMm: number; x: number; y: number }; // thẻ thông tin kẹp trong (vị trí so với thân thẻ)
}
export const LT_KINDS: LTKindInfo[] = [
  { id: 'pvc', name: 'Thẻ PVC in 2 mặt', note: 'nhựa PVC 0.76mm, in màu 2 mặt, dây cáp thép / quai nhựa', wMm: 54, hMm: 86, r: 3.5, slot: { w: 14, h: 3.4, y: 6.2 } },
  {
    id: 'leather', name: 'Thẻ da simili', note: 'da PU khâu viền, logo ép kim / ép chìm, mặt sau ô nhựa trong', wMm: 66, hMm: 108, r: 7, slot: { w: 16, h: 4, y: 8.5 },
    window: { x: 8, y: 20, w: 50, h: 78, r: 4 }, card: { wMm: 54, hMm: 84, x: 6, y: 17 },
  },
  {
    id: 'rubber', name: 'Thẻ cao su / silicon', note: 'đúc dẻo nổi 1 màu, bền nước, mặt sau túi kẹp thẻ', wMm: 62, hMm: 100, r: 9, slot: { w: 16, h: 4, y: 8.5 },
    window: { x: 9, y: 21, w: 44, h: 68, r: 5 }, card: { wMm: 50, hMm: 76, x: 6, y: 17 },
  },
];
export const ltKind = (id: string) => LT_KINDS.find((k) => k.id === id) || LT_KINDS[0];

const rrPath = (x: number, y: number, w: number, h: number, r: number) => {
  const R = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${f1(x + R)} ${f1(y)}H${f1(x + w - R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(x + w)} ${f1(y + R)}V${f1(y + h - R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(x + w - R)} ${f1(y + h)}H${f1(x + R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(x)} ${f1(y + h - R)}V${f1(y + R)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(x + R)} ${f1(y)}Z`;
};
/** viền thân thẻ (đơn vị 0.1mm), inset > 0 thu vào, < 0 nở ra (lề xén) */
export function outlinePath(kind: LTKind, inset = 0): string {
  const k = ltKind(kind); const i = inset * U;
  return rrPath(i, i, k.wMm * U - 2 * i, k.hMm * U - 2 * i, k.r * U - i);
}
export function slotRect(kind: LTKind) {
  const k = ltKind(kind);
  return { x: (k.wMm / 2 - k.slot.w / 2) * U, y: (k.slot.y - k.slot.h / 2) * U, w: k.slot.w * U, h: k.slot.h * U, r: (k.slot.h / 2) * U };
}
export const slotPath = (kind: LTKind) => { const s = slotRect(kind); return rrPath(s.x, s.y, s.w, s.h, s.r); };
/** đường bế đầy đủ: thân + khe xỏ dây (CutContour, 3D) */
export const cutPath = (kind: LTKind) => outlinePath(kind) + slotPath(kind);

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface LTFont { id: string; name: string; family: string; weight: number }
export const LT_FONTS: LTFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
];
export const ltFont = (id: string) => LT_FONTS.find((f) => f.id === id) || LT_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const LT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Lobster&display=swap');`;

export function useLTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-lt-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-lt-fonts'; link.rel = 'stylesheet';
        link.href = LT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...LT_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface LTPalette { id: string; name: string; bg: string; bg2: string; soft: string; ink: string; sub: string; accent: string; on: string; deep: string; caseColor: string }
export const LT_PALETTES: LTPalette[] = [
  { id: 'navy', name: 'Navy vàng', bg: '#14284B', bg2: '#21406F', soft: '#2B4C80', ink: '#FFFFFF', sub: '#B9C7E0', accent: '#F2B544', on: '#14284B', deep: '#0B1A33', caseColor: '#C5CAD2' },
  { id: 'sky', name: 'Xanh trời', bg: '#E6F3FF', bg2: '#BFDDF7', soft: '#D2E8FB', ink: '#0F3057', sub: '#4D6E91', accent: '#FF7A3D', on: '#FFFFFF', deep: '#2771B4', caseColor: '#2F5F93' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0E6E6E', bg2: '#16898A', soft: '#2A9A97', ink: '#FFFFFF', sub: '#CDEDEA', accent: '#FFD27A', on: '#0B4747', deep: '#08494A', caseColor: '#E6DFD0' },
  { id: 'coral', name: 'Hoàng hôn', bg: '#FFF1E4', bg2: '#FFD3B5', soft: '#FFE3CE', ink: '#6E2A1B', sub: '#A35F49', accent: '#F25C3C', on: '#FFFFFF', deep: '#2E5E7E', caseColor: '#2D3A4A' },
  { id: 'black', name: 'Đen chanh', bg: '#151515', bg2: '#262626', soft: '#303030', ink: '#FFFFFF', sub: '#A3A3A3', accent: '#C6F432', on: '#151515', deep: '#000000', caseColor: '#B7BCC4' },
  { id: 'pink', name: 'Hồng phấn', bg: '#FCE8EF', bg2: '#F6C3D4', soft: '#FAD6E2', ink: '#6B2340', sub: '#9C5A72', accent: '#E0457B', on: '#FFFFFF', deep: '#B8396A', caseColor: '#F2EEE8' },
  { id: 'forest', name: 'Rêu cát', bg: '#EFE6D2', bg2: '#D8C79F', soft: '#E4D6B6', ink: '#24412F', sub: '#5F6F52', accent: '#2F6B45', on: '#FFFFFF', deep: '#24412F', caseColor: '#2B2E33' },
  { id: 'red', name: 'Đỏ son', bg: '#B3202A', bg2: '#CE3A3F', soft: '#C2302F', ink: '#FFFFFF', sub: '#F6D2CF', accent: '#FFD166', on: '#7A1218', deep: '#7A1218', caseColor: '#E5E0D6' },
];
export const ltPalette = (id: string) => LT_PALETTES.find((p) => p.id === id) || LT_PALETTES[0];

export const lum = (hex: string) => {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255);
};
export const darkHex = (hex: string) => lum(hex) < 140;

// da simili + kiểu ép
export const LT_LEATHERS = [
  { id: 'tan', name: 'Nâu bò', color: '#7A4A2A' },
  { id: 'black', name: 'Đen', color: '#1F1D1C' },
  { id: 'navy', name: 'Xanh navy', color: '#1F2A44' },
  { id: 'wine', name: 'Đỏ đô', color: '#6A1E29' },
  { id: 'beige', name: 'Be kem', color: '#C8AE87' },
] as const;
export type LTFoil = 'gold' | 'silver' | 'deboss';
export const LT_FOILS: { id: LTFoil; name: string }[] = [
  { id: 'gold', name: 'Ép kim vàng' }, { id: 'silver', name: 'Ép kim bạc' }, { id: 'deboss', name: 'Ép chìm (không màu)' },
];
// cao su: màu nền + màu nổi
export const LT_RUBBERS = [
  { id: 'navy', name: 'Navy · trắng', base: '#1F3B6B', ink: '#FFFFFF' },
  { id: 'red', name: 'Đỏ · trắng', base: '#D1293A', ink: '#FFFFFF' },
  { id: 'yellow', name: 'Vàng · đen', base: '#FFC93C', ink: '#1B1B1B' },
  { id: 'teal', name: 'Xanh ngọc · trắng', base: '#1B9E94', ink: '#FFFFFF' },
  { id: 'black', name: 'Đen · vàng', base: '#1D1D1D', ink: '#F2B544' },
  { id: 'pink', name: 'Hồng · trắng', base: '#EE8DB0', ink: '#FFFFFF' },
] as const;
export const ltLeather = (id: string) => LT_LEATHERS.find((l) => l.id === id) || LT_LEATHERS[0];
export const ltRubber = (id: string) => LT_RUBBERS.find((l) => l.id === id) || LT_RUBBERS[0];
export const foilColor = (f: LTFoil, leather: string) => (f === 'gold' ? '#D9B25A' : f === 'silver' ? '#C9CDD3' : leather);

// ---------- bố cục + mẫu ----------
export const LT_LAYOUTS: { id: string; name: string }[] = [
  { id: 'jet', name: 'Máy bay' },
  { id: 'map', name: 'Bản đồ chấm' },
  { id: 'wave', name: 'Biển & nắng' },
  { id: 'suitcase', name: 'Vali retro' },
  { id: 'stamp', name: 'Con dấu hộ chiếu' },
  { id: 'minimal', name: 'Tối giản' },
];
export type LTStrap = 'cable' | 'strap';
export interface LTSpec {
  kind: LTKind; layout: string; palette: string; font: string;
  strap: LTStrap; leather: string; foil: LTFoil; rubber: string;
}
export interface LTTemplate { id: string; name: string; spec: Pick<LTSpec, 'layout' | 'palette' | 'font'> }
const T = (id: string, name: string, layout: string, palette: string, font: string): LTTemplate => ({ id, name, spec: { layout, palette, font } });
export const LT_TEMPLATES: LTTemplate[] = [
  T('jet-navy', 'Máy bay · navy vàng', 'jet', 'navy', 'montserrat'),
  T('jet-sky', 'Máy bay · xanh trời', 'jet', 'sky', 'baloo'),
  T('map-teal', 'Bản đồ chấm · xanh ngọc', 'map', 'teal', 'montserrat'),
  T('map-black', 'Bản đồ chấm · đen chanh', 'map', 'black', 'oswald'),
  T('wave-sky', 'Biển xanh', 'wave', 'sky', 'baloo'),
  T('wave-coral', 'Hoàng hôn biển', 'wave', 'coral', 'playfair'),
  T('suit-red', 'Vali retro · đỏ son', 'suitcase', 'red', 'oswald'),
  T('suit-forest', 'Vali retro · rêu cát', 'suitcase', 'forest', 'oswald'),
  T('stamp-forest', 'Con dấu hộ chiếu', 'stamp', 'forest', 'playfair'),
  T('stamp-pink', 'Con dấu · hồng phấn', 'stamp', 'pink', 'lobster'),
  T('min-navy', 'Tối giản · navy', 'minimal', 'navy', 'playfair'),
  T('min-pink', 'Tối giản · hồng', 'minimal', 'pink', 'bvp'),
];

// ---------- nội dung ----------
export type LTData = Record<string, string>;
export interface LTField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; side: 'front' | 'back' }
export const LT_FIELDS: LTField[] = [
  { key: 'brand', label: 'Tên công ty / thương hiệu', side: 'front', half: true },
  { key: 'slogan', label: 'Slogan', side: 'front', half: true },
  { key: 'website', label: 'Website / fanpage', side: 'front', half: true },
  { key: 'stampTop', label: 'Chữ vòng con dấu (mẫu con dấu)', side: 'front', half: true },
  { key: 'hotline', label: 'Hotline', side: 'back', half: true },
  { key: 'qr', label: 'Link QR (liên hệ / lịch trình tour)', side: 'back', half: true },
  { key: 'tour', label: 'Điền sẵn dòng Tour / Đoàn', side: 'back', half: true },
  { key: 'flight', label: 'Điền sẵn dòng Chuyến bay', side: 'back', half: true },
  { key: 'names', label: 'Danh sách in sẵn tên (mỗi dòng: Họ tên | SĐT) — để trống = thẻ trống cho khách tự ghi', side: 'back', multiline: true },
];
export const defaultLTData = (): LTData => ({
  brand: 'AN KHANG TRAVEL', slogan: 'Vi vu khắp muôn nơi', website: 'ankhangtravel.vn', stampTop: 'BON VOYAGE',
  hotline: '1900 6868', qr: 'https://ankhangtravel.vn/tour', tour: 'Đà Nẵng – Hội An 4N3Đ', flight: '',
  names: 'Quốc Bảo | 0909 123 456\nThu Hà | 0912 345 678\nGia Khánh',
});
export interface LTPerson { name: string; phone: string }
export function ltPeople(data: LTData): LTPerson[] {
  const out = (data.names || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 300).map((l) => {
    const [name, phone] = l.split('|').map((s) => (s || '').trim());
    return { name: name || '', phone: phone || '' };
  });
  return out.length ? out : [{ name: '', phone: '' }];
}

// ---------- đo + xếp chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW ? (size * maxW) / w : size; };
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
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
  // cân dòng: tránh 1 từ mồ côi ở dòng cuối khi chỉ có 2 dòng
  if (out.length === 2) {
    const words = out.join(' ').split(' ');
    let best = out, bestD = Infinity;
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const wa = textW(a, size, ts), wb = textW(b, size, ts);
      if (wa > maxW || wb > maxW) continue;
      const d = Math.abs(wa - wb);
      if (d < bestD) { bestD = d; best = [a, b]; }
    }
    return best;
  }
  return out;
}
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.45) { s *= 0.93; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  const widest = Math.max(1, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
/** co chữ cho vừa; nhỏ hơn minSize thì giữ minSize và cắt bớt kèm "…" */
function clipFit(t: string, maxW: number, size: number, minSize: number, ts: TS): { text: string; size: number } {
  let s = fitSize(t, maxW, size, ts);
  if (s >= minSize) return { text: t, size: s };
  s = minSize;
  let out = t;
  while (out.length > 1 && textW(out + '…', s, ts) > maxW) out = out.slice(0, -1);
  return { text: out === t ? t : out.trimEnd() + '…', size: s };
}
type Anchor = 'start' | 'middle' | 'end';
function Txt({ x, y, size, ts, fill, anchor = 'middle', children, opacity }: { x: number; y: number; size: number; ts: TS; fill: string; anchor?: Anchor; children: string; opacity?: number }) {
  return <text x={f1(x)} y={f1(y)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f1(size)} fill={fill} textAnchor={anchor} letterSpacing={ts.ls ? f1(ts.ls) : undefined} opacity={opacity}>{children}</text>;
}
/** khối chữ nhiều dòng; y = đỉnh khối; trả về [node, chiều cao] */
function block(text: string, o: { x: number; y: number; maxW: number; size: number; ts: TS; fill: string; maxLines?: number; lh?: number; anchor?: Anchor; upper?: boolean; minSize?: number }): [ReactNode, number] {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return [null, 0];
  const { lines, size: s0 } = fitBlock(t, o.maxW, o.size, o.ts, o.maxLines ?? 2);
  const size = Math.max(s0, Math.min(o.minSize ?? 0, s0 * 1.0));
  const lh = size * (o.lh ?? 1.12);
  const node = <g>{lines.map((l, i) => <Txt key={i} x={o.x} y={o.y + size * 0.8 + i * lh} size={size} ts={o.ts} fill={o.fill} anchor={o.anchor}>{l}</Txt>)}</g>;
  return [node, size * 0.8 + (lines.length - 1) * lh + size * 0.26];
}
const initials = (brand: string) => {
  const w = (brand || 'A').trim().split(/\s+/).filter((x) => !/^(công|ty|tnhh|cổ|phần|du|lịch|travel|tour|tours)$/i.test(x));
  const ws = w.length ? w : (brand || 'A').trim().split(/\s+/);
  return (ws.length >= 2 ? ws[0][0] + ws[1][0] : (ws[0] || 'A').slice(0, 2)).toUpperCase();
};

// ---------- hình vẽ code ----------
const PLANE = 'M0 -100C9 -100 11 -80 11 -60L11 -14L100 28L100 42L11 22L11 56L36 80L36 93L5 85L0 99L-5 85L-36 93L-36 80L-11 56L-11 22L-100 42L-100 28L-11 -14L-11 -60C-11 -80 -9 -100 0 -100Z';
function Plane({ cx, cy, s, rot = 0, fill }: { cx: number; cy: number; s: number; rot?: number; fill: string }) {
  return <path d={PLANE} fill={fill} transform={`translate(${f1(cx)} ${f1(cy)}) rotate(${rot}) scale(${(s / 200).toFixed(4)})`} />;
}
function SuitcaseIcon({ cx, cy, s, body, line, st1, st2 }: { cx: number; cy: number; s: number; body: string; line: string; st1: string; st2: string }) {
  const k = s / 200;
  return (
    <g transform={`translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(4)})`}>
      <path d="M-26 -52V-70Q-26 -80 -16 -80H16Q26 -80 26 -70V-52" fill="none" stroke={body} strokeWidth={9} strokeLinecap="round" />
      <rect x={-80} y={-52} width={160} height={130} rx={18} fill={body} />
      <rect x={-44} y={-52} width={13} height={130} fill={line} opacity={0.85} />
      <rect x={31} y={-52} width={13} height={130} fill={line} opacity={0.85} />
      <circle cx={-2} cy={8} r={21} fill={st1} />
      <path d="M-2 -4L4 6L15 7L7 15L9 26L-2 20L-13 26L-11 15L-19 7L-8 6Z" fill={line} opacity={0.9} />
      <rect x={46} y={30} width={26} height={18} rx={3} fill={st2} transform="rotate(-12 59 39)" />
      <rect x={-72} y={-40} width={22} height={14} rx={3} fill={st2} transform="rotate(8 -61 -33)" />
      <circle cx={-56} cy={88} r={9} fill={body} />
      <circle cx={56} cy={88} r={9} fill={body} />
    </g>
  );
}
function Pin({ cx, cy, s, fill, hole }: { cx: number; cy: number; s: number; fill: string; hole: string }) {
  const k = s / 200;
  return (
    <g transform={`translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(4)})`}>
      <path d="M0 100C-10 70 -62 28 -62 -14A62 62 0 1 1 62 -14C62 28 10 70 0 100Z" fill={fill} />
      <circle cx={0} cy={-14} r={24} fill={hole} />
    </g>
  );
}
function WaveIcon({ cx, cy, s, sun, line }: { cx: number; cy: number; s: number; sun: string; line: string }) {
  const k = s / 200;
  const wave = (y: number) => `M-90 ${y}Q-67 ${y - 18} -45 ${y}T0 ${y}T45 ${y}T90 ${y}`;
  return (
    <g transform={`translate(${f1(cx)} ${f1(cy)}) scale(${k.toFixed(4)})`}>
      <path d="M-46 0A46 46 0 0 1 46 0Z" fill={sun} />
      <path d={wave(22)} fill="none" stroke={line} strokeWidth={11} strokeLinecap="round" />
      <path d={wave(52)} fill="none" stroke={line} strokeWidth={11} strokeLinecap="round" />
    </g>
  );
}
// bản đồ chấm: lục địa cách điệu bằng elip (không phải bản đồ thật)
const LAND: [number, number, number, number][] = [
  [0.17, 0.33, 0.13, 0.17], [0.23, 0.18, 0.08, 0.08], [0.29, 0.72, 0.065, 0.19], [0.49, 0.27, 0.075, 0.1],
  [0.52, 0.62, 0.085, 0.2], [0.69, 0.3, 0.17, 0.15], [0.76, 0.52, 0.045, 0.08], [0.83, 0.56, 0.04, 0.035], [0.87, 0.8, 0.07, 0.06],
];
const onLand = (u: number, v: number) => LAND.some(([cx, cy, rx, ry]) => ((u - cx) / rx) ** 2 + ((v - cy) / ry) ** 2 < 1);
function DotMap({ x, y, w, h, fill, step }: { x: number; y: number; w: number; h: number; fill: string; step: number }) {
  const dots: ReactNode[] = [];
  const nx = Math.floor(w / step), ny = Math.floor(h / step);
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const u = i / nx, v = j / ny;
    if (onLand(u, v)) dots.push(<circle key={`${i}-${j}`} cx={f1(x + i * step)} cy={f1(y + j * step)} r={f1(step * 0.3)} />);
  }
  return <g fill={fill}>{dots}</g>;
}
/** chữ chạy vòng (mỗi ký tự 1 <text> xoay — vẫn outline được). top = cung trên, ngược lại cung dưới */
function ArcText({ cx, cy, r, text, size, ts, fill, top, maxDeg = 160 }: { cx: number; cy: number; r: number; text: string; size: number; ts: TS; fill: string; top: boolean; maxDeg?: number }) {
  const chars = [...(text || '')];
  if (!chars.length) return null;
  let s = size;
  const total = (sz: number) => chars.reduce((a, c) => a + textW(c, sz, ts), 0) + (chars.length - 1) * sz * 0.08;
  const rr = top ? r : r + s * 0.72;
  while ((total(s) / rr) * (180 / Math.PI) > maxDeg && s > size * 0.5) s *= 0.95;
  const tot = total(s), ang = tot / rr;
  let acc = 0;
  return (
    <g data-arc="1">
      {chars.map((c, i) => {
        const w = textW(c, s, ts);
        const mid = acc + w / 2; acc += w + s * 0.08;
        const a = top ? -Math.PI / 2 - ang / 2 + mid / rr : Math.PI / 2 + ang / 2 - mid / rr;
        const px = cx + rr * Math.cos(a), py = cy + rr * Math.sin(a);
        const deg = (a * 180) / Math.PI + (top ? 90 : -90);
        return c.trim() ? <text key={i} data-arc="1" x={f1(px)} y={f1(py)} transform={`rotate(${deg.toFixed(2)} ${f1(px)} ${f1(py)})`} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f1(s)} fill={fill} textAnchor="middle">{c}</text> : null;
      })}
    </g>
  );
}
function Mono({ cx, cy, r, ts, brand, logo, ring, fill, bg }: { cx: number; cy: number; r: number; ts: TS; brand: string; logo?: string; ring: string; fill: string; bg?: string }) {
  if (logo) return <image href={logo} x={f1(cx - r)} y={f1(cy - r)} width={f1(r * 2)} height={f1(r * 2)} preserveAspectRatio="xMidYMid meet" />;
  const ini = initials(brand);
  const s = fitSize(ini, r * 1.2, r * 0.9, ts);
  return (
    <g>
      {bg && <circle cx={f1(cx)} cy={f1(cy)} r={f1(r)} fill={bg} />}
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(r - 4)} fill="none" stroke={ring} strokeWidth={5} />
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(r - 14)} fill="none" stroke={ring} strokeWidth={1.6} />
      <Txt x={cx} y={cy + s * 0.34} size={s} ts={ts} fill={fill}>{ini}</Txt>
    </g>
  );
}

// ---------- mặt trước PVC (đủ màu) ----------
interface FrontCtx { W: number; H: number; T: number; P: LTPalette; ts: TS; data: LTData; logo?: string; uid: string }
function FrontFull({ W, H, T, P, ts, data, logo, layout, uid }: FrontCtx & { layout: string }): ReactNode {
  const pad = W * 0.1, cw = W - pad * 2;
  const body: TS = { fam: BODY, wt: 600 };
  const bodyB: TS = { fam: BODY, wt: 800 };
  const brandSize = W * 0.13;
  const web = [data.website, data.hotline].filter(Boolean).join('  ·  ');
  const smallLogo = (x: number, y: number, r: number) => logo ? <image href={logo} x={f1(x - r)} y={f1(y - r)} width={f1(r * 2)} height={f1(r * 2)} preserveAspectRatio="xMidYMid meet" /> : null;

  if (layout === 'jet') {
    const py = T + (H - T) * 0.24, px = W * 0.7;
    const [bN, bH] = block(data.brand, { x: pad, y: H * 0.6, maxW: cw, size: brandSize, ts, fill: P.ink, anchor: 'start', maxLines: 2, upper: true });
    const [sN] = block(data.slogan, { x: pad, y: H * 0.6 + bH + W * 0.05, maxW: cw, size: W * 0.058, ts: body, fill: P.sub, anchor: 'start', maxLines: 2 });
    return (
      <g>
        <rect x={-50} y={-50} width={W + 100} height={H + 100} fill={P.bg} />
        <circle cx={f1(W * 0.86)} cy={f1(py)} r={f1(W * 0.5)} fill={P.bg2} />
        <circle cx={f1(W * 0.86)} cy={f1(py)} r={f1(W * 0.32)} fill={P.soft} opacity={0.7} />
        <path d={`M${f1(W * 0.08)} ${f1(H * 0.52)}Q${f1(W * 0.2)} ${f1(py - W * 0.05)} ${f1(px - W * 0.12)} ${f1(py + W * 0.12)}`} fill="none" stroke={P.accent} strokeWidth={8} strokeDasharray="1 22" strokeLinecap="round" />
        <circle cx={f1(W * 0.08)} cy={f1(H * 0.52)} r={11} fill={P.accent} />
        <Plane cx={px} cy={py} s={W * 0.34} rot={42} fill={P.ink} />
        {smallLogo(pad + W * 0.07, T + W * 0.12, W * 0.08)}
        <rect x={f1(pad)} y={f1(H * 0.6 - W * 0.045)} width={f1(W * 0.12)} height={8} rx={4} fill={P.accent} />
        {bN}{sN}
        {web && <Txt x={pad} y={H - H * 0.06} size={fitSize(web, cw, W * 0.045, body)} ts={body} fill={P.sub} anchor="start">{web}</Txt>}
      </g>
    );
  }
  if (layout === 'map') {
    const mapY = T + 10, mapH = (H - T) * 0.48, step = W / 22;
    const bandY = H * 0.66;
    const [bN, bH] = block(data.brand, { x: W / 2, y: bandY + H * 0.045, maxW: cw, size: brandSize, ts, fill: P.on, maxLines: 2, upper: true });
    const [sN] = block(data.slogan, { x: W / 2, y: bandY + H * 0.045 + bH + W * 0.02, maxW: cw, size: W * 0.055, ts: body, fill: P.on, maxLines: 2 });
    const pinU = 0.755, pinV = 0.48;
    const pinX = pad * 0.4 + pinU * (W - pad * 0.8), pinY = mapY + pinV * mapH;
    return (
      <g>
        <rect x={-50} y={-50} width={W + 100} height={H + 100} fill={P.bg} />
        <DotMap x={pad * 0.4} y={mapY} w={W - pad * 0.8} h={mapH} fill={P.soft} step={step} />
        <circle cx={f1(pinX)} cy={f1(pinY)} r={f1(W * 0.1)} fill={P.accent} opacity={0.18} />
        <circle cx={f1(pinX)} cy={f1(pinY)} r={f1(W * 0.06)} fill={P.accent} opacity={0.3} />
        <Pin cx={pinX} cy={pinY - W * 0.07} s={W * 0.15} fill={P.accent} hole={P.bg} />
        {smallLogo(pad + W * 0.06, T + W * 0.1, W * 0.07)}
        <rect x={-50} y={f1(bandY)} width={W + 100} height={f1(H - bandY + 50)} fill={P.accent} />
        {bN}{sN}
        {web && <Txt x={W / 2} y={H - H * 0.05} size={fitSize(web, cw, W * 0.045, body)} ts={body} fill={P.on} opacity={0.85}>{web}</Txt>}
      </g>
    );
  }
  if (layout === 'wave') {
    const seaY = H * 0.58;
    const wave = (y: number, amp: number, n: number) => {
      let d = `M-50 ${f1(y)}`; const seg = (W + 100) / n;
      for (let i = 0; i < n; i++) d += `Q${f1(-50 + seg * (i + 0.25))} ${f1(y - amp)} ${f1(-50 + seg * (i + 0.5))} ${f1(y)}T${f1(-50 + seg * (i + 1))} ${f1(y)}`;
      return `${d}V${f1(H + 50)}H-50Z`;
    };
    const ink = '#FFFFFF';
    const [bN, bH] = block(data.brand, { x: W / 2, y: seaY + H * 0.1, maxW: cw, size: brandSize, ts, fill: ink, maxLines: 2, upper: true });
    const [sN] = block(data.slogan, { x: W / 2, y: seaY + H * 0.1 + bH + W * 0.03, maxW: cw, size: W * 0.056, ts: body, fill: ink, maxLines: 2 });
    return (
      <g>
        <rect x={-50} y={-50} width={W + 100} height={H + 100} fill={P.bg} />
        <circle cx={f1(W * 0.66)} cy={f1(H * 0.4)} r={f1(W * 0.2)} fill={P.accent} />
        <circle cx={f1(W * 0.66)} cy={f1(H * 0.4)} r={f1(W * 0.28)} fill={P.accent} opacity={0.18} />
        <g fill="none" stroke={P.ink} strokeWidth={5} strokeLinecap="round" opacity={0.75}>
          <path d={`M${f1(W * 0.2)} ${f1(H * 0.3)}q${f1(W * 0.03)} -${f1(W * 0.03)} ${f1(W * 0.06)} 0q${f1(W * 0.03)} -${f1(W * 0.03)} ${f1(W * 0.06)} 0`} />
          <path d={`M${f1(W * 0.34)} ${f1(H * 0.23)}q${f1(W * 0.022)} -${f1(W * 0.022)} ${f1(W * 0.044)} 0q${f1(W * 0.022)} -${f1(W * 0.022)} ${f1(W * 0.044)} 0`} />
        </g>
        {smallLogo(pad + W * 0.06, T + W * 0.1, W * 0.07)}
        <path d={wave(seaY - H * 0.06, H * 0.025, 3)} fill={P.bg2} />
        <path d={wave(seaY - H * 0.025, H * 0.022, 4)} fill={P.soft} opacity={0.9} />
        <path d={wave(seaY, H * 0.02, 5)} fill={P.deep} />
        {bN}{sN}
        {web && <Txt x={W / 2} y={H - H * 0.05} size={fitSize(web, cw, W * 0.045, body)} ts={body} fill={ink} opacity={0.85}>{web}</Txt>}
      </g>
    );
  }
  if (layout === 'suitcase') {
    const cy = T + (H - T) * 0.32;
    const [bN, bH] = block(data.brand, { x: W / 2, y: H * 0.63, maxW: cw, size: brandSize * 1.08, ts, fill: P.ink, maxLines: 2, upper: true });
    const [sN] = block(data.slogan, { x: W / 2, y: H * 0.63 + bH + W * 0.03, maxW: cw, size: W * 0.056, ts: body, fill: P.sub, maxLines: 2 });
    return (
      <g>
        <rect x={-50} y={-50} width={W + 100} height={H + 100} fill={P.bg} />
        <g transform={`rotate(-24 ${f1(W / 2)} ${f1(cy)})`}>
          <rect x={-W} y={f1(cy - W * 0.2)} width={W * 3} height={f1(W * 0.11)} fill={P.accent} />
          <rect x={-W} y={f1(cy - W * 0.07)} width={W * 3} height={f1(W * 0.06)} fill={P.bg2} />
          <rect x={-W} y={f1(cy + W * 0.01)} width={W * 3} height={f1(W * 0.11)} fill={P.accent} />
        </g>
        <circle cx={f1(W / 2)} cy={f1(cy + W * 0.02)} r={f1(W * 0.3)} fill={P.bg} />
        <SuitcaseIcon cx={W / 2} cy={cy + W * 0.02} s={W * 0.44} body={P.ink} line={P.bg} st1={P.accent} st2={P.bg2} />
        {smallLogo(W - pad - W * 0.06, T + W * 0.1, W * 0.07)}
        {bN}{sN}
        {web && <Txt x={W / 2} y={H - H * 0.05} size={fitSize(web, cw, W * 0.045, body)} ts={body} fill={P.sub}>{web}</Txt>}
      </g>
    );
  }
  if (layout === 'stamp') {
    const cx = W / 2, cy = T + (H - T) * 0.32, r = W * 0.36;
    const arcTs: TS = { fam: BODY, wt: 800 };
    const [bN, bH] = block(data.brand, { x: W / 2, y: H * 0.68, maxW: cw, size: brandSize, ts, fill: P.ink, maxLines: 2 });
    const [sN] = block(data.slogan, { x: W / 2, y: H * 0.68 + bH + W * 0.025, maxW: cw, size: W * 0.055, ts: body, fill: P.sub, maxLines: 2 });
    return (
      <g>
        <rect x={-50} y={-50} width={W + 100} height={H + 100} fill={P.bg} />
        <g opacity={0.18} fill={P.accent}>
          {Array.from({ length: 9 }, (_, i) => <rect key={i} x={-50} y={f1(T + i * W * 0.11)} width={W + 100} height={2} />)}
        </g>
        <g transform={`rotate(-9 ${f1(cx)} ${f1(cy)})`}>
          <circle cx={f1(cx)} cy={f1(cy)} r={f1(r)} fill={P.bg} stroke={P.accent} strokeWidth={9} />
          <circle cx={f1(cx)} cy={f1(cy)} r={f1(r * 0.64)} fill="none" stroke={P.accent} strokeWidth={4} />
          <ArcText cx={cx} cy={cy} r={r * 0.71} text={(data.stampTop || 'BON VOYAGE').toUpperCase()} size={W * 0.058} ts={arcTs} fill={P.accent} top />
          <ArcText cx={cx} cy={cy} r={r * 0.71} text="KHỞI HÀNH" size={W * 0.05} ts={arcTs} fill={P.accent} top={false} maxDeg={120} />
          {logo ? <image href={logo} x={f1(cx - r * 0.42)} y={f1(cy - r * 0.42)} width={f1(r * 0.84)} height={f1(r * 0.84)} preserveAspectRatio="xMidYMid meet" />
            : <Plane cx={cx} cy={cy - r * 0.08} s={r * 0.62} rot={0} fill={P.accent} />}
          {!logo && <Txt x={cx} y={cy + r * 0.42} size={W * 0.05} ts={arcTs} fill={P.accent}>2027</Txt>}
        </g>
        <g transform={`rotate(7 ${f1(W * 0.78)} ${f1(T + (H - T) * 0.56)})`} opacity={0.9}>
          <rect x={f1(W * 0.6)} y={f1(T + (H - T) * 0.51)} width={f1(W * 0.34)} height={f1(W * 0.13)} rx={8} fill="none" stroke={P.sub} strokeWidth={3.5} strokeDasharray="10 6" />
          <Txt x={W * 0.77} y={T + (H - T) * 0.51 + W * 0.085} size={fitSize('ARRIVAL', W * 0.28, W * 0.045, arcTs)} ts={arcTs} fill={P.sub}>ARRIVAL</Txt>
        </g>
        {bN}{sN}
        {data.website && <Txt x={W / 2} y={H - H * 0.05} size={fitSize(data.website, cw, W * 0.045, body)} ts={body} fill={P.sub}>{data.website}</Txt>}
      </g>
    );
  }
  // minimal
  const cy = T + (H - T) * 0.26;
  const [bN, bH] = block(data.brand, { x: W / 2, y: H * 0.5, maxW: cw, size: brandSize, ts, fill: P.ink, maxLines: 2 });
  const lineY = H * 0.5 + bH + W * 0.04;
  const [sN] = block(data.slogan, { x: W / 2, y: lineY + W * 0.04, maxW: cw, size: W * 0.056, ts: body, fill: P.sub, maxLines: 2 });
  const dotY = H * 0.84;
  return (
    <g>
      <rect x={-50} y={-50} width={W + 100} height={H + 100} fill={P.bg} />
      <Mono cx={W / 2} cy={cy} r={W * 0.2} ts={ts} brand={data.brand} logo={logo} ring={P.accent} fill={P.ink} />
      {bN}
      <rect x={f1(W / 2 - W * 0.08)} y={f1(lineY)} width={f1(W * 0.16)} height={4} fill={P.accent} />
      {sN}
      <path d={`M${f1(pad)} ${f1(dotY)}H${f1(W / 2 - W * 0.09)}M${f1(W / 2 + W * 0.09)} ${f1(dotY)}H${f1(W - pad)}`} stroke={P.sub} strokeWidth={4} strokeDasharray="1 14" strokeLinecap="round" opacity={0.8} />
      <Plane cx={W / 2} cy={dotY} s={W * 0.13} rot={90} fill={P.accent} />
      {data.website && <Txt x={W / 2} y={H - H * 0.045} size={fitSize(data.website, cw, W * 0.042, bodyB)} ts={bodyB} fill={P.sub}>{data.website}</Txt>}
    </g>
  );
}

// ---------- mặt trước 1 màu (da ép / cao su đúc nổi): hình vẽ + tên + slogan ----------
function FrontMono({ W, H, T, ts, data, logo, layout, ink, uid, hole = 'none' }: { W: number; H: number; T: number; ts: TS; data: LTData; logo?: string; layout: string; ink: string; uid: string; hole?: string }): ReactNode {
  const pad = W * 0.12, cw = W - pad * 2;
  const body: TS = { fam: BODY, wt: 800 };
  const icy = T + (H - T) * 0.27, is = W * 0.36;
  const hexRgb = (h: string) => { const n = parseInt(h.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; };
  const [r, g, b] = hexRgb(ink);
  const fid = `${uid}-tint`;
  let icon: ReactNode;
  if (logo) {
    icon = (
      <g>
        <filter id={fid} x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
          {/* tối → in nổi / ép, sáng → bỏ: logo nền trắng vẫn ra đúng hình */}
          <feColorMatrix in="SourceGraphic" type="matrix" values={`0 0 0 0 ${r.toFixed(3)} 0 0 0 0 ${g.toFixed(3)} 0 0 0 0 ${b.toFixed(3)} -0.2125 -0.7154 -0.0721 0 1`} result="m" />
          <feComposite in="m" in2="SourceAlpha" operator="in" />
        </filter>
        <image href={logo} x={f1(W / 2 - is / 2)} y={f1(icy - is / 2)} width={f1(is)} height={f1(is)} preserveAspectRatio="xMidYMid meet" filter={`url(#${fid})`} />
      </g>
    );
  } else if (layout === 'jet') {
    icon = (
      <g>
        <circle cx={f1(W / 2)} cy={f1(icy)} r={f1(is * 0.56)} fill="none" stroke={ink} strokeWidth={7} />
        <Plane cx={W / 2} cy={icy} s={is * 0.78} rot={45} fill={ink} />
      </g>
    );
  } else if (layout === 'map') {
    icon = (
      <g>
        <circle cx={f1(W / 2)} cy={f1(icy)} r={f1(is * 0.56)} fill="none" stroke={ink} strokeWidth={7} />
        <Pin cx={W / 2} cy={icy - is * 0.02} s={is * 0.62} fill={ink} hole={hole} />
      </g>
    );
  } else if (layout === 'wave') {
    icon = (
      <g>
        <circle cx={f1(W / 2)} cy={f1(icy)} r={f1(is * 0.56)} fill="none" stroke={ink} strokeWidth={7} />
        <WaveIcon cx={W / 2} cy={icy} s={is * 0.78} sun={ink} line={ink} />
      </g>
    );
  } else if (layout === 'suitcase') {
    icon = <SuitcaseIcon cx={W / 2} cy={icy} s={is * 0.95} body={ink} line="none" st1="none" st2="none" />;
  } else if (layout === 'stamp') {
    const arcTs: TS = { fam: BODY, wt: 800 };
    icon = (
      <g>
        <circle cx={f1(W / 2)} cy={f1(icy)} r={f1(is * 0.6)} fill="none" stroke={ink} strokeWidth={7} />
        <circle cx={f1(W / 2)} cy={f1(icy)} r={f1(is * 0.38)} fill="none" stroke={ink} strokeWidth={3} />
        <ArcText cx={W / 2} cy={icy} r={is * 0.44} text={(data.stampTop || 'BON VOYAGE').toUpperCase()} size={W * 0.055} ts={arcTs} fill={ink} top maxDeg={150} />
        <Plane cx={W / 2} cy={icy + is * 0.04} s={is * 0.42} fill={ink} />
      </g>
    );
  } else {
    icon = <Mono cx={W / 2} cy={icy} r={is * 0.55} ts={ts} brand={data.brand} ring={ink} fill={ink} />;
  }
  const by = T + (H - T) * 0.54;
  const [bN, bH] = block(data.brand, { x: W / 2, y: by, maxW: cw, size: W * 0.12, ts, fill: ink, maxLines: 2, upper: layout !== 'stamp' && layout !== 'minimal' });
  const [sN] = block(data.slogan, { x: W / 2, y: by + bH + W * 0.035, maxW: cw, size: W * 0.056, ts: { fam: BODY, wt: 600 }, fill: ink, maxLines: 2 });
  return (
    <g>
      {icon}
      {bN}{sN}
      {data.website && <Txt x={W / 2} y={H - H * 0.07} size={fitSize(data.website, cw, W * 0.046, body)} ts={body} fill={ink}>{data.website}</Txt>}
    </g>
  );
}

// ---------- thẻ thông tin (mặt sau PVC / thẻ kẹp trong da & cao su) ----------
function InfoBlock({ x, y, w, h, P, ts, data, person, uid }: { x: number; y: number; w: number; h: number; P: LTPalette; ts: TS; data: LTData; person: LTPerson; uid: string }) {
  const dark = darkHex(P.bg);
  const head = dark ? P.bg : P.accent, headInk = dark ? P.ink : P.on;
  const ink = dark ? P.bg : P.ink, sub = '#6B7280';
  const hh = Math.min(78, h * 0.11);
  const bB: TS = { fam: BODY, wt: 800 }, bR: TS = { fam: BODY, wt: 600 };
  const title = 'THÔNG TIN HÀNH LÝ';
  const tS = fitSize(title, w - 30, Math.min(hh * 0.38, 26), bB);
  const foot = Math.min(168, h * 0.25);
  const rowsTop = y + hh + 14, rowsH = h - hh - 14 - foot - 10, rh = rowsH / 5;
  const rows: [string, string, string][] = [
    ['Họ tên', 'Name', person.name], ['Điện thoại', 'Phone', person.phone], ['Địa chỉ', 'Address', ''],
    ['Chuyến bay', 'Flight', data.flight || ''], ['Tour / Đoàn', 'Tour group', data.tour || ''],
  ];
  const ls = Math.max(16, Math.min(rh * 0.25, 21));
  const q = Math.min(foot - 8, 160);
  const qx = x, qy = y + h - foot + 6;
  const qrText = (data.qr || data.website || data.hotline || 'mivy').trim();
  const { d: qd, n } = qrPath(qrText);
  const qs = (q * 0.86) / n;
  const rx = x + q + 16, rw = w - q - 16;
  // tên công ty: tối đa 3 dòng, không nhỏ hơn 1.5mm (dài quá thì cắt "…")
  let bf = fitBlock(data.brand || '', rw, 28, ts, 3);
  if (bf.size < 15) {
    const ls = wrapLines(data.brand || '', rw, 15, ts);
    const keep = ls.slice(0, 3);
    if (ls.length > 3) keep[2] = clipFit(ls.slice(2).join(' '), rw, 15, 15, ts).text;
    bf = { lines: keep.map((l) => clipFit(l, rw, 15, 15, ts).text), size: 15 };
  }
  const brLh = bf.size * 1.1;
  const brN = <g>{bf.lines.map((l, i) => <Txt key={i} x={rx} y={qy - 2 + bf.size * 0.8 + i * brLh} size={bf.size} ts={ts} fill={ink} anchor="start">{l}</Txt>)}</g>;
  const brH = bf.lines.length ? bf.size * 0.8 + (bf.lines.length - 1) * brLh + bf.size * 0.26 : 0;
  const hot = data.hotline ? `Hotline ${data.hotline}` : '';
  const hotY = qy + brH + 24, webY = (hot ? hotY : qy + brH) + 26;
  const showNote = webY + 6 < qy + q - 4 - 16; // tên dài 3 dòng → bỏ dòng ghi chú cho khỏi chồng
  return (
    <g>
      <rect x={f1(x)} y={f1(y)} width={f1(w)} height={f1(hh)} rx={12} fill={head} />
      <Txt x={x + w / 2} y={y + hh * 0.52} size={tS} ts={bB} fill={headInk}>{title}</Txt>
      <Txt x={x + w / 2} y={y + hh * 0.84} size={Math.max(15, tS * 0.62)} ts={{ fam: BODY, wt: 600, ls: 3 }} fill={headInk} opacity={0.82}>BAGGAGE INFO</Txt>
      {rows.map(([vi, en, v], i) => {
        const ry = rowsTop + i * rh;
        const lw = textW(vi, ls, bB);
        const lineY = ry + rh * 0.88;
        const vv = v ? clipFit(v, w - 12, Math.min(rh * 0.42, 30), 16, bR) : { text: '', size: 0 };
        return (
          <g key={i}>
            <Txt x={x} y={ry + ls} size={ls} ts={bB} fill={ink} anchor="start">{vi}</Txt>
            <Txt x={x + lw + 8} y={ry + ls} size={ls * 0.86} ts={bR} fill={sub} anchor="start">{`/ ${en}`}</Txt>
            <path d={`M${f1(x)} ${f1(lineY)}H${f1(x + w)}`} stroke={sub} strokeWidth={2} strokeDasharray="2 7" strokeLinecap="round" opacity={0.75} />
            {v && <Txt x={x + 4} y={lineY - 7} size={vv.size} ts={bR} fill={ink} anchor="start">{vv.text}</Txt>}
          </g>
        );
      })}
      <rect x={f1(qx)} y={f1(qy)} width={f1(q)} height={f1(q)} rx={8} fill="#FFFFFF" stroke={dark ? '#E5E7EB' : 'none'} strokeWidth={2} />
      <path d={qd} fill="#111111" transform={`translate(${f1(qx + q * 0.07)} ${f1(qy + q * 0.07)}) scale(${qs.toFixed(4)})`} data-qr={qrText} />
      {brN}
      {hot && <Txt x={rx} y={hotY} size={fitSize(hot, rw, 22, bB)} ts={bB} fill={head === P.accent ? P.accent : ink} anchor="start">{hot}</Txt>}
      {data.website && <Txt x={rx} y={webY} size={fitSize(data.website, rw, 19, bR)} ts={bR} fill={sub} anchor="start">{data.website}</Txt>}
      {showNote && <Txt x={rx} y={qy + q - 4} size={fitSize('Quét mã để liên hệ · Scan me', rw, 16, bR)} ts={bR} fill={sub} anchor="start">Quét mã để liên hệ · Scan me</Txt>}
      <g id={`${uid}-i`} />
    </g>
  );
}

// ---------- vẽ 1 mặt ----------
/** screen = xem phẳng · tex = texture 3D (không lề) · print = file in (PVC đủ màu; da/cao su = bản khuôn đen) · mask = trắng là phần ép/nổi */
export type LTLayer = 'screen' | 'tex' | 'print' | 'mask';
export interface LTFaceProps {
  spec: LTSpec; data: LTData; side: 'front' | 'back'; person?: LTPerson; logo?: string;
  layer?: LTLayer; bleed?: boolean; cut?: boolean; style?: CSSProperties; uid?: string;
}
const stitch = (k: LTKindInfo, insetMm: number, color: string, sw = 4) => (
  <path d={rrPath(insetMm * U, insetMm * U, (k.wMm - insetMm * 2) * U, (k.hMm - insetMm * 2) * U, Math.max(0, k.r - insetMm + 1) * U)} fill="none" stroke={color} strokeWidth={sw} strokeDasharray="14 9" strokeLinecap="round" />
);

export function LuggageTagSvg({ spec, data, side, person, logo, layer = 'screen', bleed = false, cut = false, style, uid = 'lt' }: LTFaceProps) {
  const k = ltKind(spec.kind);
  const W = k.wMm * U, H = k.hMm * U;
  const b = bleed ? LT_BLEED_MM * U : 0;
  const P = ltPalette(spec.palette);
  const f = ltFont(spec.font);
  const ts: TS = { fam: f.family, wt: f.weight };
  const T = (k.slot.y + k.slot.h / 2 + 2.2) * U; // vùng khe xỏ dây: không đặt chữ
  const pers = person || ltPeople(data)[0];
  const clipId = `${uid}-clip`;
  const slot = slotRect(spec.kind);
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  const isPvc = spec.kind === 'pvc';
  const leather = ltLeather(spec.leather), rubber = ltRubber(spec.rubber);
  const base = spec.kind === 'leather' ? leather.color : rubber.base;
  const mono = spec.kind === 'leather' ? foilColor(spec.foil, leather.color) : rubber.ink;

  let content: ReactNode;
  if (side === 'front') {
    if (isPvc) {
      content = <FrontFull W={W} H={H} T={T} P={P} ts={ts} data={data} logo={logo} layout={spec.layout} uid={uid} />;
    } else if (layer === 'print' || layer === 'mask') {
      const fg = layer === 'print' ? '#000000' : '#FFFFFF', bgc = layer === 'print' ? '#FFFFFF' : '#000000';
      content = (
        <g>
          <rect x={-b - 5} y={-b - 5} width={W + b * 2 + 10} height={H + b * 2 + 10} fill={bgc} />
          <FrontMono W={W} H={H} T={T} ts={ts} data={data} logo={logo} layout={spec.layout} ink={fg} uid={uid} hole={bgc} />
        </g>
      );
    } else {
      // xem phẳng / texture: da (ép kim gradient / ép chìm tối) hoặc cao su (nền + chữ nổi có bóng)
      const gid = `${uid}-foil`;
      const foilFill = spec.kind === 'leather' && spec.foil !== 'deboss' && layer === 'screen' ? `url(#${gid})` : mono;
      const debossInk = spec.kind === 'leather' && spec.foil === 'deboss' ? 'rgba(0,0,0,0.42)' : foilFill;
      content = (
        <g>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={spec.foil === 'silver' ? '#EEF0F3' : '#F6DE96'} />
              <stop offset="0.45" stopColor={spec.foil === 'silver' ? '#A9AEB6' : '#C49A3F'} />
              <stop offset="1" stopColor={spec.foil === 'silver' ? '#E3E6EA' : '#EBCB78'} />
            </linearGradient>
          </defs>
          <rect x={-b - 5} y={-b - 5} width={W + b * 2 + 10} height={H + b * 2 + 10} fill={base} />
          {spec.kind === 'leather' && layer === 'screen' && <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-sheen)`} />}
          {spec.kind === 'leather' && (
            <defs>
              <radialGradient id={`${uid}-sheen`} cx="0.35" cy="0.25" r="0.9"><stop offset="0" stopColor="#FFFFFF" stopOpacity={0.12} /><stop offset="1" stopColor="#000000" stopOpacity={0.18} /></radialGradient>
            </defs>
          )}
          {spec.kind === 'rubber' && layer === 'screen' && (
            <g transform="translate(5 7)" opacity={0.35} data-dup="1"><FrontMono W={W} H={H} T={T} ts={ts} data={data} logo={logo} layout={spec.layout} ink="#000000" uid={`${uid}-sh`} /></g>
          )}
          {spec.kind === 'leather' && spec.foil === 'deboss' && (
            <g transform="translate(0 3)" opacity={0.25} data-dup="1"><FrontMono W={W} H={H} T={T} ts={ts} data={data} logo={logo} layout={spec.layout} ink="#FFFFFF" uid={`${uid}-hl`} /></g>
          )}
          <FrontMono W={W} H={H} T={T} ts={ts} data={data} logo={logo} layout={spec.layout} ink={spec.kind === 'leather' ? debossInk : mono} uid={`${uid}-m`} hole={base} />
          {spec.kind === 'leather' && stitch(k, 3.2, spec.leather === 'beige' ? '#6E5A3E' : '#E9DCC3', 4)}
        </g>
      );
    }
  } else {
    // mặt sau
    if (isPvc) {
      const dark = darkHex(P.bg);
      const paper = dark ? '#FFFFFF' : P.bg;
      const top = dark ? P.bg : P.accent;
      const inner = { x: 4.5 * U, y: T + 6, w: W - 9 * U, h: H - T - 6 - 4.5 * U };
      content = (
        <g>
          <rect x={-b - 5} y={-b - 5} width={W + b * 2 + 10} height={H + b * 2 + 10} fill={paper} />
          <rect x={-b - 5} y={-b - 5} width={W + b * 2 + 10} height={f1(T + b - 4)} fill={top} opacity={0.9} />
          <InfoBlock x={inner.x} y={inner.y} w={inner.w} h={inner.h} P={P} ts={ts} data={data} person={pers} uid={uid} />
        </g>
      );
    } else {
      const wdw = k.window!;
      const card = k.card!;
      // thẻ kẹp: vùng nhìn thấy = ô cửa sổ, chữ nằm gọn trong ô (chừa 2mm)
      const wx = wdw.x * U, wy = wdw.y * U, ww = wdw.w * U, wh = wdw.h * U;
      content = (
        <g>
          <rect x={-b - 5} y={-b - 5} width={W + b * 2 + 10} height={H + b * 2 + 10} fill={base} />
          {spec.kind === 'leather' && <rect x={0} y={0} width={W} height={H} fill="#000000" opacity={0.06} />}
          <rect x={f1(card.x * U)} y={f1(card.y * U)} width={f1(card.wMm * U)} height={f1(card.hMm * U)} fill={base} opacity={0.6} />
          <path d={rrPath(wx, wy, ww, wh, wdw.r * U)} fill="#FFFFFF" />
          <g clipPath={`url(#${clipId}-w)`}>
            <InfoBlock x={wx + 2.4 * U} y={wy + 2.4 * U} w={ww - 4.8 * U} h={wh - 4.8 * U} P={P} ts={ts} data={data} person={pers} uid={uid} />
          </g>
          <defs><clipPath id={`${clipId}-w`}><path d={rrPath(wx, wy, ww, wh, wdw.r * U)} /></clipPath></defs>
          {layer === 'screen' && <path d={rrPath(wx, wy, ww, wh, wdw.r * U)} fill={`url(#${uid}-film)`} />}
          <defs>
            <linearGradient id={`${uid}-film`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.35} /><stop offset="0.3" stopColor="#FFFFFF" stopOpacity={0} />
              <stop offset="0.62" stopColor="#FFFFFF" stopOpacity={0} /><stop offset="0.7" stopColor="#FFFFFF" stopOpacity={0.22} /><stop offset="0.78" stopColor="#FFFFFF" stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={rrPath(wx, wy, ww, wh, wdw.r * U)} fill="none" stroke={spec.kind === 'rubber' ? '#000000' : base} strokeOpacity={spec.kind === 'rubber' ? 0.25 : 1} strokeWidth={spec.kind === 'rubber' ? 10 : 6} />
          {spec.kind === 'leather' && stitch(k, 3.2, spec.leather === 'beige' ? '#6E5A3E' : '#E9DCC3', 4)}
          {spec.kind === 'leather' && <path d={rrPath(wx - 2.2 * U, wy - 2.2 * U, ww + 4.4 * U, wh + 4.4 * U, (wdw.r + 2) * U)} fill="none" stroke={spec.leather === 'beige' ? '#6E5A3E' : '#E9DCC3'} strokeWidth={4} strokeDasharray="14 9" strokeLinecap="round" />}
        </g>
      );
    }
  }

  const showSlot = layer === 'screen';
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-lt-face={side}>
      <defs><clipPath id={clipId}><path d={bleed ? outlinePath(spec.kind, -LT_BLEED_MM) : outlinePath(spec.kind)} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`} id="In">{content}</g>
      {showSlot && <path d={slotPath(spec.kind)} fill="#E8EBF0" stroke="#000000" strokeOpacity={0.18} strokeWidth={2} data-slot="1" />}
      <path d={outlinePath(spec.kind)} fill="none" stroke={layer === 'screen' ? '#000000' : 'none'} strokeOpacity={0.08} strokeWidth={2} data-cut="1" />
      <rect x={f1(slot.x)} y={f1(slot.y)} width={f1(slot.w)} height={f1(slot.h)} fill="none" data-slot-box="1" />
      {cut && (
        <g id="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={2.5}>
          <path d={outlinePath(spec.kind)} />
          <path d={slotPath(spec.kind)} />
        </g>
      )}
    </svg>
  );
}

/** thẻ thông tin kẹp trong (da / cao su): file in riêng, đúng khổ thẻ + lề xén */
export function LuggageInsertSvg({ spec, data, person, bleed = false, style, uid = 'lti' }: { spec: LTSpec; data: LTData; person?: LTPerson; bleed?: boolean; style?: CSSProperties; uid?: string }) {
  const k = ltKind(spec.kind);
  const card = k.card!, wdw = k.window!;
  const W = card.wMm * U, H = card.hMm * U, b = bleed ? LT_BLEED_MM * U : 0;
  const P = ltPalette(spec.palette);
  const f = ltFont(spec.font);
  const ts: TS = { fam: f.family, wt: f.weight };
  const pers = person || ltPeople(data)[0];
  // ô cửa sổ so với thẻ → vùng chữ (chừa 2.4mm)
  const ox = (wdw.x - card.x) * U, oy = (wdw.y - card.y) * U;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-lt-insert="1">
      <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill="#FFFFFF" />
      <InfoBlock x={ox + 2.4 * U} y={oy + 2.4 * U} w={wdw.w * U - 4.8 * U} h={wdw.h * U - 4.8 * U} P={P} ts={ts} data={data} person={pers} uid={uid} />
    </svg>
  );
}

export const ltSizeLabel = (kind: LTKind) => { const k = ltKind(kind); return `${k.wMm}×${k.hMm}mm`; };
