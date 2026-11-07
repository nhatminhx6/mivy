'use client';
// Thiệp in (cưới, sinh nhật…): 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT → hàng trăm mẫu, 0 AI realtime.
// Đơn vị thiết kế: 10 = 1mm (thiệp 12×17cm → 1200×1700) → xuất PDF in 300dpi + bleed bằng print-export.
// Chữ tự co/xuống dòng theo khổ (đo bằng canvas) → đổi khổ, tên dài vẫn không tràn.
import { Fragment, useEffect, useId, useState, type ReactNode } from 'react';
import { lunarLine } from './lunar';

// ---------- loại thiệp, khổ ----------
export type CardKind = 'wedding' | 'birthday';
export const CARD_KINDS: { id: CardKind; name: string }[] = [
  { id: 'wedding', name: 'Thiệp cưới' },
  { id: 'birthday', name: 'Sinh nhật' },
];

export interface CardSize { id: string; name: string; wMm: number; hMm: number }
export const CARD_SIZES: CardSize[] = [
  { id: '12x17', name: '12 × 17 cm', wMm: 120, hMm: 170 },
  { id: '10x15', name: '10 × 15 cm', wMm: 100, hMm: 150 },
  { id: '13x18', name: '13 × 18 cm', wMm: 130, hMm: 180 },
  { id: '15x15', name: '15 × 15 cm (vuông)', wMm: 150, hMm: 150 },
];
export const cardSize = (id: string) => CARD_SIZES.find((s) => s.id === id) || CARD_SIZES[0];

// ---------- font (đều có subset tiếng Việt) ----------
export interface CardFont { id: string; family: string; weight: number; script?: boolean; italic?: boolean }
export const NAME_FONTS: CardFont[] = [
  { id: 'greatvibes', family: 'Great Vibes', weight: 400, script: true },
  { id: 'alexbrush', family: 'Alex Brush', weight: 400, script: true },
  { id: 'allura', family: 'Allura', weight: 400, script: true },
  { id: 'dancing', family: 'Dancing Script', weight: 700, script: true },
  { id: 'lobster', family: 'Lobster', weight: 400, script: true },
  { id: 'cormorant', family: 'Cormorant Garamond', weight: 600 },
  { id: 'playfair', family: 'Playfair Display', weight: 800 },
  { id: 'montserrat', family: 'Montserrat', weight: 800 },
  { id: 'baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bungee', family: 'Bungee', weight: 400 },
];
export const nameFont = (id: string) => NAME_FONTS.find((f) => f.id === id) || NAME_FONTS[0];
const SERIF: CardFont = { id: 's', family: 'Cormorant Garamond', weight: 600 };
const SERIF_B: CardFont = { id: 'sb', family: 'Cormorant Garamond', weight: 700 };
const SERIF_I: CardFont = { id: 'si', family: 'Cormorant Garamond', weight: 500, italic: true };
const PLAYFAIR: CardFont = { id: 'pf', family: 'Playfair Display', weight: 800 };
const SANS: CardFont = { id: 'n', family: 'Be Vietnam Pro', weight: 600 };
const SANS_B: CardFont = { id: 'nb', family: 'Be Vietnam Pro', weight: 800 };
const ROUND: CardFont = { id: 'r', family: 'Baloo 2', weight: 800 };
const ROUND_M: CardFont = { id: 'rm', family: 'Baloo 2', weight: 600 };

export const CARD_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Alex+Brush&family=Allura&family=Dancing+Script:wght@700&family=Lobster&family=Bungee&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Playfair+Display:wght@800&family=Montserrat:wght@800&family=Baloo+2:wght@600;800&family=Be+Vietnam+Pro:wght@600;800&display=swap');`;

export function useCardFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-card-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-card-fonts'; link.rel = 'stylesheet';
        link.href = CARD_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true }); link.addEventListener('error', () => res(), { once: true });
    });
    const all = [...NAME_FONTS, SERIF, SERIF_B, SERIF_I, SANS, SANS_B, ROUND, ROUND_M];
    sheet
      .then(() => Promise.all(all.map((f) => document.fonts.load(`${f.italic ? 'italic ' : ''}${f.weight} 60px "${f.family}"`, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface CardPalette {
  id: string; name: string;
  bg: string; panel: string; ink: string; accent: string; soft: string;
  band: string; bandInk: string; dark?: boolean;
  extra: string[]; // màu phụ: hoa, bóng bay, pháo giấy
}
export const WEDDING_PALETTES: CardPalette[] = [
  { id: 'ivory', name: 'Ngà vàng', bg: '#FBF7EF', panel: '#F1E6D2', ink: '#3B2F25', accent: '#B08D57', soft: '#7A6A58', band: '#B08D57', bandInk: '#FFFDF8', extra: ['#E9D3B0', '#D6B482', '#F6EBDA'] },
  { id: 'blush', name: 'Hồng phấn', bg: '#FDF5F3', panel: '#F5DDD7', ink: '#5A3638', accent: '#BC7C7D', soft: '#8E6B6B', band: '#C98F8E', bandInk: '#FFFFFF', extra: ['#F3C6C1', '#E7A7A3', '#FBE3DF'] },
  { id: 'red', name: 'Đỏ son', bg: '#9C1C24', panel: '#7C1219', ink: '#FCEBCB', accent: '#E6C07A', soft: '#F2D6A8', band: '#7C1219', bandInk: '#F4D594', dark: true, extra: ['#C8393F', '#E6C07A', '#F7D9A0'] },
  { id: 'navy', name: 'Navy ánh kim', bg: '#1D2942', panel: '#151F36', ink: '#F4EBDD', accent: '#C9A45C', soft: '#C9C1B3', band: '#151F36', bandInk: '#E2C27E', dark: true, extra: ['#33456B', '#C9A45C', '#E8D6B0'] },
  { id: 'dusty', name: 'Xanh khói', bg: '#F0F3F6', panel: '#DCE4EC', ink: '#2B3D50', accent: '#6F8CA6', soft: '#5E6E7C', band: '#6F8CA6', bandInk: '#FFFFFF', extra: ['#B8C8D6', '#97AEC3', '#E4EBF1'] },
  { id: 'burgundy', name: 'Đỏ rượu', bg: '#F8F1E9', panel: '#EADBC9', ink: '#4A1620', accent: '#8C2A3C', soft: '#7A5A5F', band: '#6E1F2E', bandInk: '#F8E9D6', extra: ['#B4495A', '#D9A6A0', '#E9CDB4'] },
  { id: 'lavender', name: 'Oải hương', bg: '#F7F4FB', panel: '#E6DEF1', ink: '#3D3252', accent: '#8F7BB0', soft: '#6E6480', band: '#8F7BB0', bandInk: '#FFFFFF', extra: ['#CFC2E3', '#B3A1D1', '#EDE6F6'] },
  { id: 'noir', name: 'Đen ánh kim', bg: '#161513', panel: '#211F1B', ink: '#F2E6D0', accent: '#CBA868', soft: '#B9AE9A', band: '#211F1B', bandInk: '#D9B977', dark: true, extra: ['#3C352A', '#CBA868', '#E8D3A6'] },
];
export const BIRTHDAY_PALETTES: CardPalette[] = [
  { id: 'pink', name: 'Hồng kẹo', bg: '#FFF0F5', panel: '#FFD3E2', ink: '#4A1D33', accent: '#E3437A', soft: '#86566B', band: '#E3437A', bandInk: '#FFFFFF', extra: ['#FF7EA8', '#FFC24B', '#6CC3F5', '#A783F2'] },
  { id: 'sky', name: 'Xanh trời', bg: '#EDF6FF', panel: '#CDE6FF', ink: '#13305A', accent: '#2C78DC', soft: '#4D6889', band: '#2C78DC', bandInk: '#FFFFFF', extra: ['#5DB6F5', '#FFC24B', '#FF7EA8', '#2C78DC'] },
  { id: 'sun', name: 'Vàng nắng', bg: '#FFF8E2', panel: '#FFE59C', ink: '#432C00', accent: '#E58F00', soft: '#76602E', band: '#F2A000', bandInk: '#FFFFFF', extra: ['#FFB703', '#FB7D00', '#FF6F91', '#5DB6F5'] },
  { id: 'grape', name: 'Tím mộng', bg: '#F6F0FF', panel: '#E2D4FF', ink: '#2C185A', accent: '#7446D6', soft: '#5C5080', band: '#7446D6', bandInk: '#FFFFFF', extra: ['#A783F2', '#FF7EA8', '#FFC24B', '#5DB6F5'] },
  { id: 'coral', name: 'Cam san hô', bg: '#FFF2EC', panel: '#FFD2C0', ink: '#4B1D10', accent: '#EC5A35', soft: '#865749', band: '#EC5A35', bandInk: '#FFFFFF', extra: ['#FF8A65', '#FFC24B', '#4FB8EE', '#F0609A'] },
  { id: 'peach', name: 'Đào sữa', bg: '#FFF6EF', panel: '#FFE0CB', ink: '#4A2B1F', accent: '#D96F55', soft: '#8A6656', band: '#D96F55', bandInk: '#FFFFFF', extra: ['#F2C88F', '#E58A74', '#9EBDF0', '#F3A3BF'] },
  { id: 'navy', name: 'Navy ánh kim', bg: '#142039', panel: '#0E182D', ink: '#F5ECDD', accent: '#E3B55A', soft: '#C4BDB0', band: '#0E182D', bandInk: '#E3B55A', dark: true, extra: ['#E3B55A', '#F5ECDD', '#6F9BD6', '#C98B9A'] },
  { id: 'noir', name: 'Đen vàng', bg: '#121212', panel: '#1C1C1C', ink: '#F3E8D2', accent: '#D4AF37', soft: '#B8AD96', band: '#1C1C1C', bandInk: '#D4AF37', dark: true, extra: ['#D4AF37', '#F3E8D2', '#8F7B4A', '#C2A15A'] },
];
export const palettesFor = (k: CardKind) => (k === 'wedding' ? WEDDING_PALETTES : BIRTHDAY_PALETTES);
export const paletteFor = (k: CardKind, id: string) => palettesFor(k).find((p) => p.id === id) || palettesFor(k)[0];

// ---------- bố cục + mẫu ----------
export interface CardLayout { id: string; kind: CardKind; name: string }
export const CARD_LAYOUTS: CardLayout[] = [
  { id: 'frame', kind: 'wedding', name: 'Khung cổ điển' },
  { id: 'floral', kind: 'wedding', name: 'Hoa góc' },
  { id: 'arch', kind: 'wedding', name: 'Vòm cửa' },
  { id: 'band', kind: 'wedding', name: 'Dải màu' },
  { id: 'wreath', kind: 'wedding', name: 'Vòng lá' },
  { id: 'hy', kind: 'wedding', name: 'Song hỷ' },
  { id: 'minimal', kind: 'wedding', name: 'Tối giản' },
  { id: 'balloons', kind: 'birthday', name: 'Bóng bay' },
  { id: 'confetti', kind: 'birthday', name: 'Pháo giấy' },
  { id: 'cake', kind: 'birthday', name: 'Bánh kem 3D' },
  { id: 'party', kind: 'birthday', name: 'Tiệc tùng' },
  { id: 'gold', kind: 'birthday', name: 'Sang trọng' },
  { id: 'kid', kind: 'birthday', name: 'Bé yêu' },
];

export interface CardSpec { kind: CardKind; layout: string; palette: string; font: string; size: string }
export interface CardTemplate { id: string; name: string; spec: Omit<CardSpec, 'size'> }

// Mẫu gợi ý = bố cục × phối màu/font đẹp nhất. User đổi tiếp màu, font, khổ → hàng trăm biến thể.
const PICKS: Record<string, [string, string][]> = {
  frame: [['ivory', 'greatvibes'], ['navy', 'alexbrush'], ['noir', 'greatvibes'], ['dusty', 'allura']],
  floral: [['blush', 'greatvibes'], ['ivory', 'alexbrush'], ['lavender', 'allura'], ['burgundy', 'greatvibes']],
  arch: [['blush', 'alexbrush'], ['dusty', 'greatvibes'], ['ivory', 'allura'], ['navy', 'greatvibes']],
  band: [['burgundy', 'greatvibes'], ['ivory', 'alexbrush'], ['dusty', 'allura'], ['navy', 'greatvibes']],
  wreath: [['ivory', 'greatvibes'], ['blush', 'allura'], ['dusty', 'alexbrush'], ['noir', 'greatvibes']],
  hy: [['red', 'greatvibes'], ['red', 'cormorant'], ['navy', 'alexbrush'], ['burgundy', 'greatvibes']],
  minimal: [['ivory', 'cormorant'], ['noir', 'cormorant'], ['dusty', 'playfair'], ['blush', 'cormorant']],
  balloons: [['pink', 'lobster'], ['sky', 'baloo'], ['sun', 'lobster'], ['grape', 'dancing']],
  confetti: [['sun', 'montserrat'], ['coral', 'lobster'], ['sky', 'montserrat'], ['pink', 'dancing']],
  cake: [['peach', 'dancing'], ['pink', 'greatvibes'], ['grape', 'lobster'], ['sky', 'dancing']],
  party: [['grape', 'bungee'], ['coral', 'bungee'], ['sky', 'baloo'], ['sun', 'bungee']],
  gold: [['noir', 'greatvibes'], ['navy', 'alexbrush'], ['noir', 'playfair'], ['navy', 'greatvibes']],
  kid: [['sky', 'baloo'], ['pink', 'baloo'], ['sun', 'baloo'], ['peach', 'lobster']],
};
export const CARD_TEMPLATES: CardTemplate[] = CARD_LAYOUTS.flatMap((l) => (PICKS[l.id] || []).map(([palette, font]) => ({
  id: `${l.id}-${palette}-${font}`,
  name: `${l.name} · ${paletteFor(l.kind, palette).name}`,
  spec: { kind: l.kind, layout: l.id, palette, font },
})));

// ---------- nội dung ----------
export type CardData = Record<string, string>;
export interface CardField { key: string; label: string; ph?: string; type?: 'text' | 'date' | 'time' | 'multiline'; hint?: string; half?: boolean }
export const CARD_FIELDS: Record<CardKind, CardField[]> = {
  wedding: [
    { key: 'groom', label: 'Chú rể', ph: 'Quốc Bảo', half: true },
    { key: 'bride', label: 'Cô dâu', ph: 'Thu Hà', half: true },
    { key: 'invite', label: 'Dòng báo tin', ph: 'Trân trọng báo tin lễ thành hôn' },
    { key: 'date', label: 'Ngày cưới', type: 'date', half: true },
    { key: 'time', label: 'Giờ', type: 'time', half: true },
    { key: 'lunar', label: 'Ngày âm lịch', hint: 'Tự tính theo ngày cưới — sửa được' },
    { key: 'venue', label: 'Nơi tổ chức', ph: 'Tư gia nhà trai' },
    { key: 'address', label: 'Địa chỉ', ph: '123 Lũy Bán Bích, Q. Tân Phú' },
    { key: 'groomFamily', label: 'Nhà trai', type: 'multiline', ph: 'Ông …\nBà …', half: true },
    { key: 'brideFamily', label: 'Nhà gái', type: 'multiline', ph: 'Ông …\nBà …', half: true },
  ],
  birthday: [
    { key: 'title', label: 'Lời chào lớn', ph: 'Happy Birthday' },
    { key: 'name', label: 'Tên', ph: 'Bảo Anh', half: true },
    { key: 'age', label: 'Tuổi', ph: '6', half: true },
    { key: 'message', label: 'Lời mời / lời chúc', type: 'multiline', ph: 'Mời bạn đến chung vui…' },
    { key: 'date', label: 'Ngày', type: 'date', half: true },
    { key: 'time', label: 'Giờ', type: 'time', half: true },
    { key: 'venue', label: 'Địa điểm', ph: 'Nhà hàng Hoa Sen' },
    { key: 'address', label: 'Địa chỉ', ph: '45 Tân Kỳ Tân Quý, Q. Tân Phú' },
    { key: 'contact', label: 'Liên hệ / xác nhận', ph: 'Xác nhận: 0909 123 456' },
  ],
};
export function defaultCardData(kind: CardKind): CardData {
  if (kind === 'wedding') return {
    groom: 'Quốc Bảo', bride: 'Thu Hà', invite: 'Trân trọng báo tin lễ thành hôn của con chúng tôi',
    date: '2026-12-20', time: '10:00', lunar: lunarLine('2026-12-20'), venue: 'Tư gia nhà trai',
    address: '123 Lũy Bán Bích, P. Tân Thới Hòa, Q. Tân Phú, TP.HCM',
    groomFamily: 'Ông Nguyễn Văn An\nBà Trần Thị Bình', brideFamily: 'Ông Lê Văn Cường\nBà Phạm Thị Dung',
  };
  return {
    title: 'Happy Birthday', name: 'Bảo Anh', age: '6', message: 'Mời bạn đến chung vui tiệc sinh nhật của bé',
    date: '2026-12-12', time: '17:30', venue: 'Nhà hàng Hoa Sen', address: '45 Tân Kỳ Tân Quý, Q. Tân Phú, TP.HCM',
    contact: 'Xác nhận tham dự: 0909 123 456',
  };
}

const WEEKDAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
function parseDate(iso?: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  return { d: m[3], m: m[2], y: m[1], mo, wd: WEEKDAYS[new Date(y, mo - 1, d).getDay()] };
}
const timeText = (t?: string) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t || '');
  return m ? `${m[1].padStart(2, '0')} giờ ${m[2]}` : '';
};
const initial = (name?: string) => {
  const w = (name || '').trim().split(/\s+/).filter(Boolean);
  return (w[w.length - 1] || '').charAt(0).toUpperCase();
};

// ---------- đo chữ + xếp chồng tự co ----------
let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, f: CardFont, size: number, ls = 0): number {
  if (typeof document === 'undefined') return text.length * size * 0.55;
  measureCtx ||= document.createElement('canvas').getContext('2d');
  measureCtx!.font = `${f.italic ? 'italic ' : ''}${f.weight} ${size}px "${f.family}"`;
  return measureCtx!.measureText(text).width + ls * size * Math.max(0, Array.from(text).length - 1);
}
function wrapWords(text: string, f: CardFont, size: number, ls: number, maxW: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const w of text.split(/\s+/).filter(Boolean)) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || measure(t, f, size, ls) <= maxW) cur = t; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}

interface TextItem {
  t: 'text'; text: string; font: CardFont; size: number; color: string;
  ls?: number; lines?: number; lh?: number; gap?: number; upper?: boolean; stroke?: string; strokeW?: number; maxW?: number;
}
interface NodeItem { t: 'node'; h: number; gap?: number; draw: (cx: number, top: number, w: number, s: number) => ReactNode }
type Item = TextItem | NodeItem;
interface Area { x: number; y: number; w: number; h: number }
// role="card-text" + data-* để QC soi chữ tràn khung
function Stack({ items, area, spread = 0.5 }: { items: Item[]; area: Area; spread?: number }) {
  const cx = area.x + area.w / 2;
  type Placed = { it: Item; h: number; gap: number; lines?: string[]; size?: number; lh?: number; s: number };
  let placed: Placed[] = [];
  let total = 0;
  let s = 1;
  for (let iter = 0; iter < 5; iter++) {
    placed = []; total = 0;
    for (const it of items) {
      if (it.t === 'node') { placed.push({ it, h: it.h * s, gap: (it.gap ?? 0) * s, s }); continue; }
      const raw = it.upper ? it.text.toLocaleUpperCase('vi') : it.text;
      if (!raw.trim()) continue;
      const ls = it.ls ?? 0;
      const maxW = (it.maxW ?? area.w) * (it.font.script ? 0.9 : 1);
      const paras = raw.split('\n').map((p) => p.trim()).filter(Boolean);
      const maxLines = Math.max(it.lines ?? 1, paras.length);
      let size = it.size * s;
      let lines: string[] = paras;
      for (let g = 0; g < 30; g++) {
        lines = (it.lines ?? 1) > 1 ? paras.flatMap((p) => wrapWords(p, it.font, size, ls, maxW)) : paras;
        const widest = Math.max(...lines.map((l) => measure(l, it.font, size, ls)));
        if (lines.length <= maxLines && widest <= maxW) break;
        size *= 0.94;
      }
      const lh = (it.lh ?? 1.25) * size;
      placed.push({ it, h: lines.length * lh, gap: (it.gap ?? 0) * s, lines, size, lh, s });
    }
    total = placed.reduce((a, p, i) => a + p.h + (i < placed.length - 1 ? p.gap : 0), 0);
    if (total <= area.h || s < 0.35) break;
    s *= Math.max(0.55, (area.h / total) * 0.98);
  }
  // dư chỗ: chia 1 phần vào khoảng cách giữa các khối cho thoáng, còn lại canh giữa
  const extra = Math.max(0, area.h - total);
  const gapSum = placed.slice(0, -1).reduce((a, p) => a + p.gap, 0) || 1;
  const k = (extra * spread) / gapSum;
  let y = area.y + (extra * (1 - spread)) / 2;
  const out: ReactNode[] = [];
  placed.forEach((p, i) => {
    if (p.it.t === 'node') out.push(<Fragment key={i}>{p.it.draw(cx, y, area.w, p.s)}</Fragment>);
    else {
      const it = p.it;
      const ls = (it.ls ?? 0) * p.size!;
      p.lines!.forEach((line, j) => out.push(
        <text key={`${i}-${j}`} x={cx + ls / 2} y={y + p.lh! * j + p.lh! / 2 + p.size! * 0.34} textAnchor="middle"
          fontFamily={`"${it.font.family}"`} fontWeight={it.font.weight} fontStyle={it.font.italic ? 'italic' : undefined}
          fontSize={p.size} letterSpacing={ls || undefined} fill={it.color}
          stroke={it.stroke} strokeWidth={it.strokeW ? it.strokeW * p.size! : undefined} paintOrder={it.stroke ? 'stroke' : undefined} strokeLinejoin="round"
          data-card-text="1" data-maxw={(it.maxW ?? area.w).toFixed(1)} data-cx={cx.toFixed(1)}>{line}</text>,
      ));
    }
    y += p.h + (i < placed.length - 1 ? p.gap * (1 + k) : 0);
  });
  return <g data-area={`${area.x.toFixed(1)},${area.y.toFixed(1)},${area.w.toFixed(1)},${area.h.toFixed(1)}`}>{out}</g>;
}

// ---------- hoạ tiết vẽ bằng code ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

function Divider({ cx, y, w, color, sw }: { cx: number; y: number; w: number; color: string; sw: number }) {
  const d = w * 0.035;
  return (
    <g stroke={color} strokeWidth={sw} fill="none">
      <line x1={cx - w / 2} y1={y} x2={cx - d * 2.2} y2={y} />
      <line x1={cx + d * 2.2} y1={y} x2={cx + w / 2} y2={y} />
      <path d={`M${cx - d} ${y} L${cx} ${y - d} L${cx + d} ${y} L${cx} ${y + d} Z`} fill={color} stroke="none" />
      <circle cx={cx - d * 1.7} cy={y} r={sw * 1.3} fill={color} stroke="none" />
      <circle cx={cx + d * 1.7} cy={y} r={sw * 1.3} fill={color} stroke="none" />
    </g>
  );
}

function Flower({ x, y, r, petals = 6, color, inner, center, rot = 0 }: { x: number; y: number; r: number; petals?: number; color: string; inner: string; center: string; rot?: number }) {
  const ps = Array.from({ length: petals }, (_, i) => (360 / petals) * i + rot);
  return (
    <g transform={`translate(${x} ${y})`}>
      {ps.map((a) => <ellipse key={a} cx={0} cy={-r * 0.52} rx={r * 0.36} ry={r * 0.56} fill={color} transform={`rotate(${a})`} />)}
      {ps.map((a) => <ellipse key={`i${a}`} cx={0} cy={-r * 0.36} rx={r * 0.2} ry={r * 0.34} fill={inner} opacity={0.8} transform={`rotate(${a + 180 / petals})`} />)}
      <circle r={r * 0.2} fill={center} />
    </g>
  );
}

function Leaf({ x, y, len, angle, color }: { x: number; y: number; len: number; angle: number; color: string }) {
  const w = len * 0.3;
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M0 0 Q${len * 0.45} ${-w} ${len} 0 Q${len * 0.45} ${w} 0 0 Z`} fill={color} />
      <path d={`M0 0 L${len * 0.85} 0`} stroke="#000" strokeOpacity={0.12} strokeWidth={len * 0.025} />
    </g>
  );
}

// cành cong với lá 2 bên — dùng cho hoa góc, vòng lá
function Branch({ x, y, len, angle, bend = 0.25, color, leaves = 6, leafLen }: { x: number; y: number; len: number; angle: number; bend?: number; color: string; leaves?: number; leafLen?: number }) {
  const ll = leafLen ?? len * 0.2;
  const pts = Array.from({ length: leaves }, (_, i) => (i + 1) / (leaves + 1));
  const qx = len / 2, qy = -len * bend;
  const at = (t: number) => ({ x: 2 * (1 - t) * t * qx + t * t * len, y: 2 * (1 - t) * t * qy });
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`}>
      <path d={`M0 0 Q${qx} ${qy} ${len} 0`} stroke={color} strokeWidth={len * 0.012} fill="none" strokeLinecap="round" />
      {pts.map((t, i) => {
        const p = at(t);
        const tan = Math.atan2(2 * (1 - t) * qy + 2 * t * (0 - qy), 2 * (1 - t) * qx + 2 * t * (len - qx)) * 180 / Math.PI;
        return <Leaf key={i} x={p.x} y={p.y} len={ll * (1 - t * 0.35)} angle={tan + (i % 2 ? 42 : -42)} color={color} />;
      })}
      <Leaf x={len} y={0} len={ll * 0.8} angle={0} color={color} />
    </g>
  );
}

function FloralCorner({ x, y, s, pal, rot }: { x: number; y: number; s: number; pal: CardPalette; rot: number }) {
  const [c1, c2, c3] = pal.extra;
  const leaf = pal.dark ? pal.accent : pal.soft;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={0.95}>
      <Branch x={s * 0.12} y={s * 0.1} len={s * 0.95} angle={8} bend={0.18} color={leaf} leaves={7} />
      <Branch x={s * 0.1} y={s * 0.12} len={s * 0.85} angle={78} bend={-0.18} color={leaf} leaves={6} />
      <Branch x={s * 0.2} y={s * 0.2} len={s * 0.55} angle={42} bend={0.1} color={leaf} leaves={4} />
      <Flower x={s * 0.2} y={s * 0.2} r={s * 0.17} color={c1} inner={c3} center={pal.accent} rot={10} />
      <Flower x={s * 0.47} y={s * 0.11} r={s * 0.1} petals={5} color={c2} inner={c3} center={pal.accent} />
      <Flower x={s * 0.1} y={s * 0.47} r={s * 0.1} petals={5} color={c2} inner={c3} center={pal.accent} rot={20} />
      <Flower x={s * 0.4} y={s * 0.36} r={s * 0.065} petals={5} color={c1} inner={c3} center={pal.accent} />
    </g>
  );
}

function Wreath({ cx, cy, r, color, accent }: { cx: number; cy: number; r: number; color: string; accent: string }) {
  // 2 cành vòng cung ôm monogram, chừa khe trên
  const arc = (side: 1 | -1) => Array.from({ length: 9 }, (_, i) => {
    const a = (Math.PI / 2) + side * (0.35 + i * 0.27); // từ dưới vòng lên
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    const tang = (a * 180) / Math.PI + (side > 0 ? 90 : -90);
    return (
      <g key={`${side}${i}`}>
        <Leaf x={x} y={y} len={r * 0.3 * (1 - i * 0.05)} angle={tang - side * 35} color={color} />
        <Leaf x={x} y={y} len={r * 0.26 * (1 - i * 0.05)} angle={tang + side * 35 + 180} color={color} />
      </g>
    );
  });
  return (
    <g>
      {arc(1)}{arc(-1)}
      <circle cx={cx} cy={cy + r} r={r * 0.04} fill={accent} />
    </g>
  );
}

function Spark({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  const k = r * 0.2;
  return <path d={`M${x} ${y - r} L${x + k} ${y - k} L${x + r} ${y} L${x + k} ${y + k} L${x} ${y + r} L${x - k} ${y + k} L${x - r} ${y} L${x - k} ${y - k} Z`} fill={color} />;
}

function Balloon({ x, y, r, color, uid, strLen }: { x: number; y: number; r: number; color: string; uid: string; strLen: number }) {
  const gid = `${uid}-b-${color.slice(1)}`;
  const by = y + r * 1.15;
  return (
    <g>
      <defs>
        <radialGradient id={gid} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity={0.55} />
          <stop offset="0.35" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity={1} />
        </radialGradient>
      </defs>
      <path d={`M${x} ${by + r * 0.08} q${r * 0.25} ${strLen * 0.25} 0 ${strLen * 0.5} t0 ${strLen * 0.5}`} stroke="#000" strokeOpacity={0.25} strokeWidth={r * 0.035} fill="none" />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={`url(#${gid})`} />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill="none" stroke="#000" strokeOpacity={0.08} strokeWidth={r * 0.03} />
      <path d={`M${x - r * 0.12} ${by + r * 0.1} L${x + r * 0.12} ${by + r * 0.1} L${x} ${by - r * 0.04} Z`} fill={color} />
      <ellipse cx={x - r * 0.38} cy={y - r * 0.45} rx={r * 0.16} ry={r * 0.28} fill="#fff" opacity={0.45} transform={`rotate(-25 ${x - r * 0.38} ${y - r * 0.45})`} />
    </g>
  );
}

// pháo giấy rải viền, tránh vùng chữ
function Confetti({ W, H, avoid, colors, seed, n, u }: { W: number; H: number; avoid: Area; colors: string[]; seed: number; n: number; u: number }) {
  const r = rng(seed);
  const out: ReactNode[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 8) {
    const x = r() * W, y = r() * H;
    if (x > avoid.x - u * 2 && x < avoid.x + avoid.w + u * 2 && y > avoid.y - u * 2 && y < avoid.y + avoid.h + u * 2) continue;
    const c = colors[Math.floor(r() * colors.length)];
    const t = r(), rot = r() * 360, s = u * (0.9 + r() * 1.2);
    if (t < 0.45) out.push(<rect key={out.length} x={x - s / 2} y={y - s * 0.22} width={s} height={s * 0.44} rx={s * 0.08} fill={c} transform={`rotate(${rot} ${x} ${y})`} />);
    else if (t < 0.75) out.push(<circle key={out.length} cx={x} cy={y} r={s * 0.32} fill={c} />);
    else out.push(<path key={out.length} d={`M${x - s * 0.7} ${y} q${s * 0.35} ${-s * 0.5} ${s * 0.7} 0 t${s * 0.7} 0`} stroke={c} strokeWidth={s * 0.22} fill="none" strokeLinecap="round" transform={`rotate(${rot} ${x} ${y})`} />);
  }
  return <g>{out}</g>;
}

const IMG = (n: string) => `/illustrations/fluent3d/${n}.png`;
// nền vẽ tràn quá mép (đơn vị thiết kế) để file in có lề xén thật — xem CardSvg bleed
const BLEED_PAD = 60;
export const CARD_BLEED_MM = 3;

// ---------- khối nội dung dùng chung ----------
interface Ctx { W: number; H: number; u: number; pal: CardPalette; nf: CardFont; d: CardData; uid: string }

function parentsNode(c: Ctx, color: string, labelColor: string, body: CardFont): NodeItem | null {
  const gf = (c.d.groomFamily || '').split('\n').map((x) => x.trim()).filter(Boolean);
  const bf = (c.d.brideFamily || '').split('\n').map((x) => x.trim()).filter(Boolean);
  if (!gf.length && !bf.length) return null;
  const rows = Math.max(gf.length, bf.length);
  const fs = c.u * 3.6, lab = c.u * 2.7;
  return {
    t: 'node', h: lab * 1.7 + rows * fs * 1.3, gap: c.u * 5,
    draw: (cx, top, w, s) => {
      const colW = (w - c.u * 4 * s) / 2;
      const col = (lines: string[], label: string, x: number) => (
        <g>
          <text x={x} y={top + lab * s} textAnchor="middle" fontFamily={`"${SANS_B.family}"`} fontWeight={SANS_B.weight} fontSize={lab * s} letterSpacing={lab * s * 0.25} fill={labelColor} data-card-text="1" data-maxw={colW.toFixed(1)} data-cx={x.toFixed(1)}>{label}</text>
          {lines.map((l, i) => {
            let size = fs * s;
            while (measure(l, body, size) > colW && size > fs * s * 0.5) size *= 0.94;
            return <text key={i} x={x} y={top + lab * s * 1.7 + fs * s * 1.3 * i + fs * s * 0.95} textAnchor="middle" fontFamily={`"${body.family}"`} fontWeight={body.weight} fontSize={size} fill={color} data-card-text="1" data-maxw={colW.toFixed(1)} data-cx={x.toFixed(1)}>{l}</text>;
          })}
        </g>
      );
      return <g>{col(gf, 'NHÀ TRAI', cx - colW / 2 - c.u * 2 * s)}{col(bf, 'NHÀ GÁI', cx + colW / 2 + c.u * 2 * s)}</g>;
    },
  };
}

// CHỦ NHẬT | 20 | THÁNG 12  (+ năm bên dưới)
function dateTrio(c: Ctx, ink: string, accent: string, num: CardFont): NodeItem | null {
  const p = parseDate(c.d.date);
  if (!p) return null;
  const big = c.u * 15, side = c.u * 3.2, yr = c.u * 3;
  return {
    t: 'node', h: big * 1.05 + yr * 1.6, gap: c.u * 3.5,
    draw: (cx, top, w, s) => {
      const cellW = Math.min(w * 0.3, c.u * 26 * s);
      const midY = top + big * s * 0.5;
      const sideText = (t: string, x: number) => {
        let size = side * s;
        while (measure(t, SANS_B, size, 0.18) > cellW && size > side * s * 0.5) size *= 0.94;
        return (
          <g>
            <line x1={x - cellW / 2} y1={midY - side * s * 1.05} x2={x + cellW / 2} y2={midY - side * s * 1.05} stroke={accent} strokeWidth={c.u * 0.18 * s} />
            <text x={x + size * 0.09} y={midY + size * 0.35} textAnchor="middle" fontFamily={`"${SANS_B.family}"`} fontWeight={SANS_B.weight} fontSize={size} letterSpacing={size * 0.18} fill={ink} data-card-text="1" data-maxw={cellW.toFixed(1)} data-cx={x.toFixed(1)}>{t}</text>
            <line x1={x - cellW / 2} y1={midY + side * s * 1.05} x2={x + cellW / 2} y2={midY + side * s * 1.05} stroke={accent} strokeWidth={c.u * 0.18 * s} />
          </g>
        );
      };
      const off = cellW / 2 + big * s * 0.62;
      return (
        <g>
          {sideText(p.wd.toLocaleUpperCase('vi'), cx - off)}
          <text x={cx} y={midY + big * s * 0.36} textAnchor="middle" fontFamily={`"${num.family}"`} fontWeight={num.weight} fontSize={big * s} fill={accent}>{p.d}</text>
          {sideText(`THÁNG ${p.m}`, cx + off)}
          <text x={cx + yr * s * 0.2} y={top + big * s * 1.05 + yr * s * 1.1} textAnchor="middle" fontFamily={`"${SANS_B.family}"`} fontWeight={SANS_B.weight} fontSize={yr * s} letterSpacing={yr * s * 0.4} fill={ink}>{p.y}</text>
        </g>
      );
    },
  };
}

function divider(c: Ctx, color: string, gap = 4): NodeItem {
  return { t: 'node', h: c.u * 3, gap: c.u * gap, draw: (cx, top, w, s) => <Divider cx={cx} y={top + c.u * 1.5 * s} w={Math.min(w * 0.55, c.u * 44)} color={color} sw={c.u * 0.16 * s} /> };
}

interface WOpts { ink?: string; accent?: string; soft?: string; parents?: boolean; names?: 'stack' | 'upper'; date?: 'trio' | 'line'; body?: CardFont; heading?: boolean; dividerTop?: boolean }
function weddingItems(c: Ctx, o: WOpts = {}): Item[] {
  const ink = o.ink ?? c.pal.ink, accent = o.accent ?? c.pal.accent, soft = o.soft ?? c.pal.soft;
  const body = o.body ?? SERIF_B;
  const nf = c.nf, u = c.u;
  const items: Item[] = [];
  if (o.parents !== false) { const pn = parentsNode(c, ink, accent, body); if (pn) items.push(pn); }
  if (o.heading !== false) items.push({ t: 'text', text: c.d.invite || '', font: SANS, size: u * 2.9, color: soft, ls: 0.16, upper: true, lines: 2, lh: 1.6, gap: u * 3.5, maxW: c.W * 0.62 });
  const upperNames = o.names === 'upper' || !nf.script;
  const nameSize = upperNames ? u * 7.4 : u * 13;
  // chữ viết tay có nét móc dưới dài → chừa khoảng quanh dấu & để không chạm
  items.push({ t: 'text', text: c.d.groom || '', font: nf, size: nameSize, color: ink, upper: upperNames, ls: upperNames ? 0.08 : 0, lh: upperNames ? 1.15 : 1.1, gap: upperNames ? u * 0.5 : u * 1.2 });
  items.push({ t: 'text', text: '&', font: upperNames ? SERIF_I : nf, size: upperNames ? u * 6 : u * 7.5, color: accent, lh: upperNames ? 1.1 : 1, gap: upperNames ? u * 0.5 : u * 1 });
  items.push({ t: 'text', text: c.d.bride || '', font: nf, size: nameSize, color: ink, upper: upperNames, ls: upperNames ? 0.08 : 0, lh: upperNames ? 1.15 : 1.05, gap: u * 4 });
  items.push(divider(c, accent));
  const tt = timeText(c.d.time);
  if (o.date === 'line') {
    const p = parseDate(c.d.date);
    if (tt) items.push({ t: 'text', text: `Vào lúc ${tt}`, font: SANS, size: u * 2.9, color: soft, ls: 0.12, upper: true, gap: u * 1.5 });
    if (p) items.push({ t: 'text', text: `${p.d} · ${p.m} · ${p.y}`, font: PLAYFAIR, size: u * 8, color: accent, ls: 0.06, gap: u * 1.2 });
    if (p) items.push({ t: 'text', text: p.wd, font: SANS_B, size: u * 2.8, color: ink, ls: 0.3, upper: true, gap: u * 2.5 });
  } else {
    if (tt) items.push({ t: 'text', text: `Vào lúc ${tt}`, font: SANS, size: u * 2.9, color: soft, ls: 0.14, upper: true, gap: u * 2.2 });
    const dt = dateTrio(c, ink, accent, PLAYFAIR);
    if (dt) items.push(dt);
  }
  if (c.d.lunar) items.push({ t: 'text', text: `(${c.d.lunar})`, font: SERIF_I, size: u * 3.5, color: soft, gap: u * 4, lines: 2 });
  if (c.d.venue) items.push({ t: 'text', text: `Tại ${c.d.venue}`, font: SANS_B, size: u * 3.1, color: ink, ls: 0.1, upper: true, gap: u * 1.6, lines: 2 });
  if (c.d.address) items.push({ t: 'text', text: c.d.address, font: SERIF_B, size: u * 3.4, color: soft, lines: 2, lh: 1.3 });
  return items;
}

interface BOpts { ink?: string; accent?: string; soft?: string; titleFont?: CardFont; body?: CardFont; bodyB?: CardFont; age?: 'solid' | 'outline' | 'badge'; titleStroke?: string }
function birthdayItems(c: Ctx, o: BOpts = {}): Item[] {
  const ink = o.ink ?? c.pal.ink, accent = o.accent ?? c.pal.accent, soft = o.soft ?? c.pal.soft;
  const tf = o.titleFont ?? c.nf, body = o.body ?? ROUND_M, bodyB = o.bodyB ?? ROUND;
  const u = c.u;
  const items: Item[] = [];
  items.push({ t: 'text', text: c.d.title || '', font: tf, size: tf.script ? u * 13 : u * 10, color: accent, upper: !tf.script, lines: 2, lh: tf.script ? 1.05 : 1.1, gap: u * 2, stroke: o.titleStroke, strokeW: o.titleStroke ? 0.12 : undefined });
  const age = (c.d.age || '').trim();
  if (age) {
    const big = u * 26;
    items.push({
      t: 'node', h: big * 0.92, gap: u * 1.5,
      draw: (cx, top, w, s) => {
        let size = big * s;
        const f = o.age === 'outline' ? PLAYFAIR : SANS_B;
        while (measure(age, f, size) > w * 0.6 && size > big * s * 0.3) size *= 0.94;
        const y = top + big * s * 0.8;
        const lab = u * 3 * s;
        const tw = measure(age, f, size);
        if (o.age === 'badge') return (
          <g>
            <circle cx={cx} cy={top + big * s * 0.46} r={big * s * 0.46} fill={accent} />
            <circle cx={cx} cy={top + big * s * 0.46} r={big * s * 0.41} fill="none" stroke="#fff" strokeWidth={u * 0.5 * s} strokeDasharray={`${u * 1.2 * s} ${u * 1 * s}`} />
            <text x={cx} y={top + big * s * 0.46 + size * 0.3} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={size * 0.8} fill="#fff">{age}</text>
          </g>
        );
        return (
          <g>
            <text x={cx} y={y} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={size}
              fill={o.age === 'outline' ? 'none' : accent} stroke={o.age === 'outline' ? accent : c.pal.dark ? 'none' : '#fff'} strokeWidth={o.age === 'outline' ? u * 0.35 * s : u * 0.9 * s} paintOrder="stroke">{age}</text>
            <text x={cx + tw / 2 + lab * 0.4} y={y - size * 0.06} fontFamily={`"${SANS_B.family}"`} fontWeight={SANS_B.weight} fontSize={lab} letterSpacing={lab * 0.2} fill={ink}>TUỔI</text>
          </g>
        );
      },
    });
  }
  if (c.d.name) items.push({ t: 'text', text: c.d.name, font: bodyB, size: u * 8, color: ink, gap: u * 2.5, lh: 1.15 });
  if (c.d.message) items.push({ t: 'text', text: c.d.message, font: body, size: u * 3.8, color: soft, lines: 3, lh: 1.35, gap: u * 3.5, maxW: c.W * 0.7 });
  const p = parseDate(c.d.date);
  const when = [p ? `${p.wd} · ${p.d}.${p.m}.${p.y}` : '', c.d.time || ''].filter(Boolean).join(' · ');
  if (when) items.push({ t: 'text', text: when, font: SANS_B, size: u * 3.6, color: accent, ls: 0.06, upper: true, gap: u * 1.6 });
  if (c.d.venue) items.push({ t: 'text', text: c.d.venue, font: bodyB, size: u * 4.4, color: ink, gap: u * 0.8, lines: 2 });
  if (c.d.address) items.push({ t: 'text', text: c.d.address, font: body, size: u * 3.3, color: soft, lines: 2, lh: 1.3, gap: u * 2.5 });
  if (c.d.contact) items.push({ t: 'text', text: c.d.contact, font: SANS, size: u * 2.9, color: soft, ls: 0.04 });
  return items;
}

// ---------- vẽ từng bố cục ----------
type LayoutOut = { deco: ReactNode; stacks: { area: Area; items: Item[]; spread?: number }[]; front?: ReactNode };

function renderLayout(layout: string, c: Ctx): LayoutOut {
  const { W, H, u, pal } = c;
  const B = BLEED_PAD;
  switch (layout) {
    case 'frame': {
      const i1 = u * 4.5, i2 = u * 6.2, ex = u * 9;
      const corner = (x: number, y: number, sx: number, sy: number) => (
        <g key={`${sx}${sy}`} stroke={pal.accent} strokeWidth={u * 0.14} fill="none">
          <path d={`M${x + sx * ex} ${y + sy * u * 1.4} H${x + sx * u * 1.4} V${y + sy * ex}`} />
          <path d={`M${x + sx * u * 1.4} ${y + sy * u * 3} A${u * 1.6} ${u * 1.6} 0 0 ${sx * sy > 0 ? 0 : 1} ${x + sx * u * 3} ${y + sy * u * 1.4}`} />
          <path d={`M${x} ${y - sy * u * 1.1} L${x + sx * u * 1.1} ${y} L${x} ${y + sy * u * 1.1} L${x - sx * u * 1.1} ${y} Z`} fill={pal.accent} stroke="none" />
        </g>
      );
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <rect x={i1} y={i1} width={W - i1 * 2} height={H - i1 * 2} fill="none" stroke={pal.accent} strokeWidth={u * 0.4} />
            <rect x={i2} y={i2} width={W - i2 * 2} height={H - i2 * 2} fill="none" stroke={pal.accent} strokeWidth={u * 0.14} />
            {corner(i2, i2, 1, 1)}{corner(W - i2, i2, -1, 1)}{corner(i2, H - i2, 1, -1)}{corner(W - i2, H - i2, -1, -1)}
          </g>
        ),
        stacks: [{ area: { x: i2 + u * 6, y: i2 + u * 7, w: W - (i2 + u * 6) * 2, h: H - (i2 + u * 7) * 2 }, items: weddingItems(c) }],
      };
    }
    case 'floral': {
      const s = Math.min(W, H) * 0.36;
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <FloralCorner x={-u * 2} y={-u * 2} s={s} pal={pal} rot={0} />
            <FloralCorner x={W + u * 2} y={H + u * 2} s={s} pal={pal} rot={180} />
          </g>
        ),
        stacks: [{ area: { x: u * 11, y: u * 20, w: W - u * 22, h: H - u * 40 }, items: weddingItems(c) }],
      };
    }
    case 'arch': {
      const m = u * 8, R = (W - m * 2) / 2, top = m + R;
      const arch = (inset: number) => `M${m + inset} ${H - m - inset} V${top} A${R - inset} ${R - inset} 0 0 1 ${W - m - inset} ${top} V${H - m - inset} Z`;
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.panel} />
            <path d={arch(0)} fill={pal.bg} />
            <path d={arch(u * 2.2)} fill="none" stroke={pal.accent} strokeWidth={u * 0.18} />
            <Spark x={W / 2} y={m + u * 7} r={u * 2.2} color={pal.accent} />
            <Spark x={W / 2 - u * 6} y={m + u * 9.5} r={u * 1.1} color={pal.accent} />
            <Spark x={W / 2 + u * 6} y={m + u * 9.5} r={u * 1.1} color={pal.accent} />
          </g>
        ),
        stacks: [{ area: { x: m + u * 6, y: m + u * 20, w: W - (m + u * 6) * 2, h: H - m * 2 - u * 26 }, items: weddingItems(c) }],
      };
    }
    case 'band': {
      const bh = H * 0.36;
      const bandItems: Item[] = [
        { t: 'text', text: c.d.invite || '', font: SANS, size: u * 2.6, color: pal.bandInk, ls: 0.16, upper: true, lines: 2, lh: 1.6, gap: u * 3, maxW: W * 0.62 },
        { t: 'text', text: c.d.groom || '', font: c.nf, size: c.nf.script ? u * 12 : u * 7, color: pal.bandInk, upper: !c.nf.script, ls: c.nf.script ? 0 : 0.08, lh: 1.05, gap: u * 0.3 },
        { t: 'text', text: '&', font: c.nf.script ? c.nf : SERIF_I, size: u * 6.5, color: pal.bandInk, lh: 0.95, gap: u * 0.3 },
        { t: 'text', text: c.d.bride || '', font: c.nf, size: c.nf.script ? u * 12 : u * 7, color: pal.bandInk, upper: !c.nf.script, ls: c.nf.script ? 0 : 0.08, lh: 1.05 },
      ];
      const rest = weddingItems(c, { heading: false }).filter((it) => !(it.t === 'text' && (it.text === c.d.groom || it.text === c.d.bride || it.text === '&')));
      // nhà trai/nhà gái xuống cuối cho thoáng
      const parents = rest[0]?.t === 'node' && (c.d.groomFamily || c.d.brideFamily) ? rest.shift() : undefined;
      if (parents) { (parents as NodeItem).gap = 0; rest.push(divider(c, pal.accent, 3), parents); }
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <path d={`M${-B} ${-B} H${W + B} V${bh - u * 3} Q${W / 2} ${bh + u * 6} ${-B} ${bh - u * 3} Z`} fill={pal.band} />
            <path d={`M0 ${bh + u * 0.6} Q${W / 2} ${bh + u * 9.6} ${W} ${bh + u * 0.6}`} fill="none" stroke={pal.accent} strokeWidth={u * 0.16} />
          </g>
        ),
        stacks: [
          { area: { x: u * 9, y: u * 7, w: W - u * 18, h: bh - u * 12 }, items: bandItems, spread: 0.3 },
          { area: { x: u * 10, y: bh + u * 10, w: W - u * 20, h: H - bh - u * 16 }, items: rest },
        ],
      };
    }
    case 'wreath': {
      const r = Math.min(W, H) * 0.13, cy = u * 9 + r;
      const mono = `${initial(c.d.groom)}${initial(c.d.bride)}`;
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <Wreath cx={W / 2} cy={cy} r={r} color={pal.dark ? pal.accent : pal.soft} accent={pal.accent} />
            <text x={W / 2} y={cy + r * 0.28} textAnchor="middle" fontFamily={`"${c.nf.script ? c.nf.family : SERIF_B.family}"`} fontWeight={c.nf.weight} fontSize={r * 0.8} fill={pal.accent}>{mono.charAt(0)}<tspan fontFamily={`"${SERIF_I.family}"`} fontStyle="italic" fontSize={r * 0.42} dx={r * 0.03} dy={-r * 0.05}>&amp;</tspan><tspan dy={r * 0.05}>{mono.charAt(1)}</tspan></text>
            <Branch x={W / 2 - u * 1} y={H - u * 7} len={W * 0.2} angle={190} bend={0.12} color={pal.dark ? pal.accent : pal.soft} leaves={6} />
            <Branch x={W / 2 + u * 1} y={H - u * 7} len={W * 0.2} angle={-10} bend={-0.12} color={pal.dark ? pal.accent : pal.soft} leaves={6} />
          </g>
        ),
        stacks: [{ area: { x: u * 10, y: cy + r + u * 6, w: W - u * 20, h: H - (cy + r + u * 6) - u * 13 }, items: weddingItems(c) }],
      };
    }
    case 'hy': {
      const i1 = u * 4, r = Math.min(W, H) * 0.12, cy = u * 9 + r;
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <rect x={i1} y={i1} width={W - i1 * 2} height={H - i1 * 2} fill="none" stroke={pal.accent} strokeWidth={u * 0.35} />
            <rect x={i1 + u * 1.3} y={i1 + u * 1.3} width={W - (i1 + u * 1.3) * 2} height={H - (i1 + u * 1.3) * 2} fill="none" stroke={pal.accent} strokeWidth={u * 0.12} strokeDasharray={`${u * 1.2} ${u * 0.8}`} />
            <circle cx={W / 2} cy={cy} r={r} fill={pal.accent} />
            <circle cx={W / 2} cy={cy} r={r * 0.88} fill="none" stroke={pal.bg} strokeWidth={u * 0.2} />
            <text x={W / 2} y={cy + r * 0.38} textAnchor="middle" fontFamily="'Noto Serif TC','Songti TC','PingFang TC','Microsoft JhengHei',serif" fontWeight={700} fontSize={r * 1.1} fill={pal.bg}>囍</text>
            {[-1, 1].map((sd) => <Spark key={sd} x={W / 2 + sd * r * 1.9} y={cy} r={u * 1.6} color={pal.accent} />)}
          </g>
        ),
        stacks: [{ area: { x: u * 11, y: cy + r + u * 5, w: W - u * 22, h: H - (cy + r + u * 5) - u * 10 }, items: weddingItems(c) }],
      };
    }
    case 'minimal': {
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <line x1={W / 2} y1={0} x2={W / 2} y2={u * 9} stroke={pal.accent} strokeWidth={u * 0.15} />
            <line x1={W / 2} y1={H - u * 9} x2={W / 2} y2={H} stroke={pal.accent} strokeWidth={u * 0.15} />
          </g>
        ),
        stacks: [{ area: { x: u * 12, y: u * 15, w: W - u * 24, h: H - u * 30 }, items: weddingItems(c, { names: 'upper', date: 'line', body: SERIF_B }) }],
      };
    }
    // ---------- sinh nhật ----------
    case 'balloons': {
      const cols = pal.extra;
      const cluster = (x: number, dir: 1 | -1) => (
        <g>
          <Balloon x={x + dir * u * 2} y={u * 30} r={u * 7} color={cols[2]} uid={c.uid} strLen={u * 26} />
          <Balloon x={x + dir * u * 14} y={u * 20} r={u * 8.5} color={cols[0]} uid={c.uid} strLen={u * 30} />
          <Balloon x={x - dir * u * 2} y={u * 12} r={u * 7.5} color={cols[1]} uid={c.uid} strLen={u * 34} />
        </g>
      );
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            {cluster(u * 6, 1)}{cluster(W - u * 6, -1)}
            <Confetti W={W} H={H} avoid={{ x: u * 10, y: u * 42, w: W - u * 20, h: H - u * 50 }} colors={cols} seed={7} n={26} u={u} />
          </g>
        ),
        stacks: [{ area: { x: u * 9, y: u * 44, w: W - u * 18, h: H - u * 51 }, items: birthdayItems(c) }],
      };
    }
    case 'confetti': {
      const area = { x: u * 12, y: u * 14, w: W - u * 24, h: H - u * 28 };
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <Confetti W={W} H={H} avoid={area} colors={[...pal.extra, pal.accent]} seed={11} n={110} u={u} />
            <rect x={area.x - u * 3} y={area.y - u * 3} width={area.w + u * 6} height={area.h + u * 6} rx={u * 4} fill={pal.dark ? pal.panel : '#fff'} opacity={0.92} />
          </g>
        ),
        stacks: [{ area, items: birthdayItems(c, { body: SANS, bodyB: SANS_B, age: 'solid' }) }],
      };
    }
    case 'cake': {
      const img = Math.min(W, H) * 0.36;
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <path d={`M${-B} ${H * 0.8} Q${W * 0.25} ${H * 0.75} ${W * 0.5} ${H * 0.8} T${W + B} ${H * 0.79} V${H + B} H${-B} Z`} fill={pal.panel} />
            <circle cx={W / 2} cy={u * 6 + img * 0.5} r={img * 0.52} fill={pal.panel} />
            <image href={IMG('birthday_cake')} x={W / 2 - img / 2} y={u * 6} width={img} height={img} />
            {[[-0.62, 0.25, 2.2], [0.6, 0.15, 1.8], [-0.5, 0.8, 1.4], [0.66, 0.75, 2.4]].map(([dx, dy, rr], i) => <Spark key={i} x={W / 2 + dx * img} y={u * 6 + dy * img} r={u * rr} color={pal.accent} />)}
          </g>
        ),
        stacks: [{ area: { x: u * 10, y: u * 9 + img, w: W - u * 20, h: H - img - u * 16 }, items: birthdayItems(c, { age: 'badge' }) }],
      };
    }
    case 'party': {
      const img = Math.min(W, H) * 0.24;
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <rect x={-B} y={H - u * 10} width={W + B * 2} height={u * 10 + B} fill={pal.band} />
            <Confetti W={W} H={u * 30} avoid={{ x: W * 0.3, y: 0, w: W * 0.4, h: u * 8 }} colors={pal.extra} seed={23} n={34} u={u} />
            <image href={IMG('party_popper')} x={u * 3} y={u * 4} width={img} height={img} />
            <image href={IMG('party_popper')} x={-W + u * 3} y={u * 4} width={img} height={img} transform="scale(-1 1)" />
          </g>
        ),
        stacks: [{ area: { x: u * 9, y: u * 6 + img * 0.75, w: W - u * 18, h: H - img * 0.75 - u * 20 }, items: birthdayItems(c, { body: SANS, bodyB: SANS_B, titleStroke: pal.dark ? undefined : '#fff' }) }],
      };
    }
    case 'gold': {
      const i1 = u * 4.5;
      const r = rng(5);
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />
            <rect x={i1} y={i1} width={W - i1 * 2} height={H - i1 * 2} fill="none" stroke={pal.accent} strokeWidth={u * 0.3} />
            <rect x={i1 + u * 1.4} y={i1 + u * 1.4} width={W - (i1 + u * 1.4) * 2} height={H - (i1 + u * 1.4) * 2} fill="none" stroke={pal.accent} strokeWidth={u * 0.1} />
            {Array.from({ length: 14 }, (_, i) => {
              const x = i1 + u * 4 + r() * (W - i1 * 2 - u * 8);
              const y = i1 + u * 4 + r() * (u * 14);
              return <Spark key={i} x={x} y={y} r={u * (0.6 + r() * 1.4)} color={pal.accent} />;
            })}
          </g>
        ),
        stacks: [{ area: { x: u * 12, y: u * 18, w: W - u * 24, h: H - u * 30 }, items: birthdayItems(c, { body: SERIF_B, bodyB: SERIF_B, age: 'outline' }) }],
      };
    }
    case 'kid': {
      const m = u * 6, img = Math.min(W, H) * 0.26;
      const r = rng(3);
      return {
        deco: (
          <g>
            <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.panel} />
            {Array.from({ length: 40 }, (_, i) => <circle key={i} cx={r() * W} cy={r() * H} r={u * (0.5 + r() * 0.9)} fill="#fff" opacity={0.6} />)}
            <rect x={m} y={m} width={W - m * 2} height={H - m * 2} rx={u * 6} fill={pal.bg} />
            <rect x={m + u * 1.8} y={m + u * 1.8} width={W - (m + u * 1.8) * 2} height={H - (m + u * 1.8) * 2} rx={u * 4.5} fill="none" stroke={pal.accent} strokeWidth={u * 0.4} strokeDasharray={`${u * 0.1} ${u * 1.6}`} strokeLinecap="round" />
            {[[0.18, 0.08, 2.4], [0.82, 0.1, 2], [0.12, 0.6, 1.6]].map(([x, y, rr], i) => <Spark key={i} x={W * x} y={H * y} r={u * rr} color={pal.extra[i % pal.extra.length]} />)}
          </g>
        ),
        front: <image href={IMG('teddy_bear')} x={W - m - img * 0.85} y={H - m - img * 0.85} width={img} height={img} />,
        stacks: [{ area: { x: m + u * 7, y: m + u * 7, w: W - (m + u * 7) * 2, h: H - (m + u * 7) * 2 - img * 0.45 }, items: birthdayItems(c, { age: 'badge' }) }],
      };
    }
  }
  return { deco: <rect x={-B} y={-B} width={W + B * 2} height={H + B * 2} fill={pal.bg} />, stacks: [] };
}

// ---------- component ----------
// bleed: khung nhìn nới thêm 3mm mỗi cạnh (file in PDF), mặc định chỉ vùng thành phẩm
export function CardSvg({ spec, data, style, className, bleed }: { spec: CardSpec; data: CardData; style?: React.CSSProperties; className?: string; bleed?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const sz = cardSize(spec.size);
  const W = sz.wMm * 10, H = sz.hMm * 10;
  const c: Ctx = { W, H, u: W / 100, pal: paletteFor(spec.kind, spec.palette), nf: nameFont(spec.font), d: data, uid };
  const out = renderLayout(spec.layout, c);
  const b = bleed ? CARD_BLEED_MM * 10 : 0;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} className={className} data-card-svg="1" data-w={W} data-h={H}>
      {out.deco}
      {out.stacks.map((st, i) => <Stack key={i} items={st.items} area={st.area} spread={st.spread} />)}
      {out.front}
    </svg>
  );
}
