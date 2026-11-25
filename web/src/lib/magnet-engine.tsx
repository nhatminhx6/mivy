'use client';
// Nam châm tủ lạnh quảng cáo: 1 engine SVG = MỤC ĐÍCH (giao đồ ăn, điện nước, taxi, spa, mầm non, nhà đất) × HÌNH
// (chữ nhật, tròn, die-cut theo hình: ly trà sữa, miếng pizza, ngôi nhà, giọt nước, bong bóng chat) × BẢNG MÀU → render code 100%.
// Đơn vị vẽ: 10 = 1mm. Đường cắt (CutContour) viết bằng mm. Nền tràn ra ngoài đường cắt bằng MASK (path cắt + nét dày 2×lề)
// → mọi hình (kể cả lõm như ống hút, mái nhà) đều có lề xén đúng 1.5mm.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

const U = 10;
export const MG_BLEED_MM = 1.5;
export const CUTCONTOUR = '#EC008C';

// ---------- hình / khổ ----------
export type MgShapeId = 'card' | 'tall' | 'r60' | 'r80' | 'cup' | 'pizza' | 'house' | 'drop' | 'bubble';
export type MgShapeKind = 'rect' | 'round' | 'die';
export interface MgShape { id: MgShapeId; kind: MgShapeKind; name: string; wMm: number; hMm: number; d: string }

const rr = (w: number, h: number, r: number) =>
  `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
const circ = (d: number) => `M0 ${d / 2}A${d / 2} ${d / 2} 0 1 1 ${d} ${d / 2}A${d / 2} ${d / 2} 0 1 1 0 ${d / 2}Z`;

export const MG_SHAPES: MgShape[] = [
  { id: 'card', kind: 'rect', name: 'Chữ nhật 9×5.5cm', wMm: 90, hMm: 55, d: rr(90, 55, 3) },
  { id: 'tall', kind: 'rect', name: 'Đứng 7×10cm', wMm: 70, hMm: 100, d: rr(70, 100, 3) },
  { id: 'r60', kind: 'round', name: 'Tròn Ø6cm', wMm: 60, hMm: 60, d: circ(60) },
  { id: 'r80', kind: 'round', name: 'Tròn Ø8cm', wMm: 80, hMm: 80, d: circ(80) },
  // ly trà sữa: ống hút + nắp vòm + vành + thân côn
  { id: 'cup', kind: 'die', name: 'Ly trà sữa', wMm: 62, hMm: 90,
    d: 'M33 14.05L33 5.5A3.5 3.5 0 0 1 40 5.5L40 15.1A23 14 0 0 1 54 28L57 28Q58 28 58 29L58 32Q58 33 57 33L54 33L48.6 85.5Q48.1 89 44.6 89L17.4 89Q13.9 89 13.4 85.5L8 33L5 33Q4 33 4 32L4 29Q4 28 5 28L8 28A23 14 0 0 1 33 14.05Z' },
  // miếng pizza: viền bánh cong ở trên, mũi nhọn bo tròn ở dưới
  { id: 'pizza', kind: 'die', name: 'Miếng pizza', wMm: 80, hMm: 84,
    d: 'M6 17Q3 17 3.6 13Q8 2 40 2Q72 2 76.4 13Q77 17 74 17L43.2 79.5Q40 85 36.8 79.5Z' },
  // ngôi nhà có ống khói
  { id: 'house', kind: 'die', name: 'Ngôi nhà', wMm: 80, hMm: 76,
    d: 'M40 3L56 16.4L56 9Q56 8 57 8L62 8Q63 8 63 9L63 22.3L77.5 34.4Q79.4 36 76.9 36L70 36L70 72Q70 74 68 74L12 74Q10 74 10 72L10 36L3.1 36Q0.6 36 2.5 34.4Z' },
  // giọt nước (điện nước)
  { id: 'drop', kind: 'die', name: 'Giọt nước', wMm: 66, hMm: 88,
    d: 'M31.6 3.6Q33 1.9 34.4 3.6C40 10.5 60 36 60 56A27 27 0 0 1 6 56C6 36 26 10.5 31.6 3.6Z' },
  // bong bóng chat có đuôi
  { id: 'bubble', kind: 'die', name: 'Bong bóng chat', wMm: 86, hMm: 66,
    d: 'M14 2H72A12 12 0 0 1 84 14V40A12 12 0 0 1 72 52H33L14.6 63.6Q11 65.6 12.4 61.8L16.2 52H14A12 12 0 0 1 2 40V14A12 12 0 0 1 14 2Z' },
];
export const mgShape = (id: string) => MG_SHAPES.find((s) => s.id === id) || MG_SHAPES[0];
export const qrAllowed = (id: string) => id === 'card' || id === 'tall';

// ---------- mục đích + chữ mẫu ----------
export type MgPurpose = 'food' | 'repair' | 'taxi' | 'spa' | 'kinder' | 'realty';
export const MG_PURPOSES: { id: MgPurpose; name: string }[] = [
  { id: 'food', name: 'Giao đồ ăn' },
  { id: 'repair', name: 'Điện nước · điện lạnh' },
  { id: 'taxi', name: 'Taxi · xe ôm' },
  { id: 'spa', name: 'Spa · làm đẹp' },
  { id: 'kinder', name: 'Mầm non' },
  { id: 'realty', name: 'Nhà đất' },
];
export type MgData = Record<string, string>;
export const MG_SAMPLES: Record<MgPurpose, MgData> = {
  food: { brand: 'BẾP NHÀ THU HÀ', service: 'CƠM VĂN PHÒNG · GIAO TẬN NƠI', hotline: '0909 123 456', slogan: 'Gọi là có!', extra: 'Mở cửa 9h – 21h mỗi ngày', zalo: 'https://zalo.me/0909123456' },
  repair: { brand: 'ĐIỆN LẠNH QUỐC BẢO', service: 'SỬA MÁY LẠNH · TỦ LẠNH · ĐIỆN NƯỚC', hotline: '0918 456 789', slogan: 'Có mặt sau 30 phút', extra: 'Phục vụ 24/7 · Q.7 & lân cận', zalo: 'https://zalo.me/0918456789' },
  taxi: { brand: 'XE GIA KHÁNH', service: 'TAXI · XE ÔM · ĐƯA ĐÓN SÂN BAY', hotline: '0933 888 999', slogan: 'Đón tận nhà, giá rõ ràng', extra: 'Hoạt động 24/7', zalo: 'https://zalo.me/0933888999' },
  spa: { brand: 'AN NHIÊN SPA', service: 'GỘI ĐẦU DƯỠNG SINH · CHĂM SÓC DA', hotline: '0977 234 567', slogan: 'Thư giãn trọn vẹn', extra: '25 Lê Lợi, Q.1, TP.HCM', zalo: 'https://zalo.me/0977234567' },
  kinder: { brand: 'MẦM NON ÁNH DƯƠNG', service: 'NHẬN TRẺ 18 THÁNG – 6 TUỔI', hotline: '0988 112 233', slogan: 'Con vui mỗi ngày', extra: '12 Nguyễn Văn Linh, Q.7', zalo: 'https://zalo.me/0988112233' },
  realty: { brand: 'AN KHANG LAND', service: 'MUA BÁN · KÝ GỬI · CHO THUÊ NHÀ ĐẤT', hotline: '0903 456 789', slogan: 'Tìm nhà như ý', extra: 'Tư vấn pháp lý miễn phí', zalo: 'https://zalo.me/0903456789' },
};
export interface MgField { key: string; label: string; ph?: string; half?: boolean }
export const MG_FIELDS: MgField[] = [
  { key: 'brand', label: 'Tên cửa hàng / thương hiệu', ph: 'BẾP NHÀ THU HÀ' },
  { key: 'hotline', label: 'Hotline (in to nhất)', ph: '0909 123 456', half: true },
  { key: 'slogan', label: 'Câu chào (chữ viết tay)', ph: 'Gọi là có!', half: true },
  { key: 'service', label: 'Dịch vụ', ph: 'CƠM VĂN PHÒNG · GIAO TẬN NƠI' },
  { key: 'extra', label: 'Dòng nhỏ (giờ mở cửa / địa chỉ)', ph: 'Mở cửa 9h – 21h' },
  { key: 'zalo', label: 'Link Zalo / web (tạo mã QR)', ph: 'https://zalo.me/0909123456' },
];
/** ô nào khổ này in được */
export const fieldsShown = (shape: MgShapeId): string[] => {
  const k = mgShape(shape).kind;
  if (shape === 'card' || shape === 'tall') return ['brand', 'hotline', 'slogan', 'service', 'extra', 'zalo'];
  if (shape === 'house') return ['brand', 'hotline', 'slogan', 'service'];
  if (k === 'round' || k === 'die') return ['brand', 'hotline', 'slogan'];
  return ['brand', 'hotline', 'slogan'];
};

// ---------- màu ----------
export interface MgPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; onAccent: string; deco: string; soft: string }
export const MG_PALETTES: MgPalette[] = [
  { id: 'red', name: 'Đỏ nóng', bg: '#FFF6EE', ink: '#2B1210', sub: '#7A4A3A', accent: '#D62828', onAccent: '#FFFFFF', deco: '#F4A261', soft: '#FBDCCB' },
  { id: 'milktea', name: 'Trà sữa', bg: '#FBEEDC', ink: '#3B2416', sub: '#7A5236', accent: '#8B5A3C', onAccent: '#FFFFFF', deco: '#C99A6E', soft: '#F1DCC0' },
  { id: 'pizza', name: 'Pizza', bg: '#FFD45C', ink: '#5A1A06', sub: '#7A3510', accent: '#C8361A', onAccent: '#FFFFFF', deco: '#B8642B', soft: '#FFE7A3' },
  { id: 'green', name: 'Xanh lá tươi', bg: '#ECFBF1', ink: '#0D2E1C', sub: '#3F6B52', accent: '#00A651', onAccent: '#FFFFFF', deco: '#FFD23F', soft: '#CDEFD9' },
  { id: 'blue', name: 'Xanh dương', bg: '#EEF5FF', ink: '#0C2340', sub: '#3E5A80', accent: '#1565C0', onAccent: '#FFFFFF', deco: '#4FC3F7', soft: '#D3E5FB' },
  { id: 'taxi', name: 'Vàng taxi', bg: '#FFD400', ink: '#141414', sub: '#3A3A3A', accent: '#141414', onAccent: '#FFD400', deco: '#FFFFFF', soft: '#FFE873' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#F1FBF8', ink: '#0B2F2A', sub: '#456D66', accent: '#0F8A6C', onAccent: '#FFFFFF', deco: '#FFC857', soft: '#CDEDE4' },
  { id: 'pink', name: 'Hồng spa', bg: '#FFF3F5', ink: '#4A1F2B', sub: '#8A5562', accent: '#C2185B', onAccent: '#FFFFFF', deco: '#F8BBD0', soft: '#FADCE5' },
  { id: 'purple', name: 'Tím lavender', bg: '#F7F2FF', ink: '#2A1846', sub: '#6A5684', accent: '#7E57C2', onAccent: '#FFFFFF', deco: '#F5C26B', soft: '#E4DAF6' },
  { id: 'sky', name: 'Trời xanh – cam', bg: '#EAF7FF', ink: '#0D3355', sub: '#3D6A8F', accent: '#FF7A00', onAccent: '#FFFFFF', deco: '#FFD23F', soft: '#CFEAFB' },
  { id: 'navy', name: 'Navy ánh vàng', bg: '#0F2A4A', ink: '#FFFFFF', sub: '#C9D6E8', accent: '#C9A24A', onAccent: '#0F2A4A', deco: '#C9A24A', soft: '#1E3D63' },
];
export const mgPalette = (id: string) => MG_PALETTES.find((p) => p.id === id) || MG_PALETTES[0];

// ---------- font ----------
export interface MgFont { id: string; name: string; family: string; weight: number }
export const MG_FONTS: MgFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald (cao)', family: 'Oswald', weight: 700 },
];
export const mgFont = (id: string) => MG_FONTS.find((f) => f.id === id) || MG_FONTS[0];
const BODY = 'Be Vietnam Pro';
const NUM = 'Oswald';
const SCRIPT = 'Lobster';
export const MG_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Lobster&display=swap');`;

export function useMgFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-mg-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-mg-fonts'; link.rel = 'stylesheet';
        link.href = MG_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '700 40px "Oswald"', '800 40px "Baloo 2"', '400 40px "Lobster"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec + mẫu ----------
export type MgMaterial = 'flex' | 'acrylic';
export const MG_MATERIALS: { id: MgMaterial; name: string; note: string }[] = [
  { id: 'flex', name: 'Nam châm dẻo cán bóng', note: 'Dày 0.7mm, hít chắc, rẻ — phổ biến nhất' },
  { id: 'acrylic', name: 'Mica dày + nam châm', note: 'Mica 3mm in UV, dán nam châm sau — sang, bền' },
];
export type MgFridge = 'steel' | 'white';
export interface MgSpec { purpose: MgPurpose; shape: MgShapeId; palette: string; font: string; material: MgMaterial; qr: boolean; fridge: MgFridge }
export interface MgTemplate { id: string; name: string; spec: Omit<MgSpec, 'material' | 'fridge'> }
const T = (purpose: MgPurpose, shape: MgShapeId, palette: string, font: string, qr = false): MgTemplate => ({
  id: `${purpose}-${shape}-${palette}`,
  name: `${MG_PURPOSES.find((p) => p.id === purpose)!.name} · ${mgShape(shape).name}`,
  spec: { purpose, shape, palette, font, qr },
});
export const MG_TEMPLATES: MgTemplate[] = [
  T('food', 'card', 'red', 'montserrat', true),
  T('food', 'cup', 'milktea', 'baloo'),
  T('food', 'pizza', 'pizza', 'baloo'),
  T('food', 'bubble', 'green', 'montserrat'),
  T('repair', 'card', 'blue', 'montserrat'),
  T('repair', 'drop', 'blue', 'bvp'),
  T('taxi', 'card', 'taxi', 'oswald'),
  T('taxi', 'r80', 'teal', 'montserrat'),
  T('spa', 'r60', 'pink', 'bvp'),
  T('spa', 'tall', 'purple', 'bvp', true),
  T('kinder', 'house', 'sky', 'baloo'),
  T('realty', 'tall', 'navy', 'montserrat'),
];
export const defaultMgSpec = (): MgSpec => ({ ...MG_TEMPLATES[0].spec, material: 'flex', fridge: 'steel' });

// ---------- đo chữ thật (canvas, font đã nạp) ----------
let mctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number): number {
  if (typeof document === 'undefined') return text.length * 60;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 60;
  mctx.font = `${weight} 100px "${family}"`;
  return mctx.measureText(text).width;
}
const fitSize = (text: string, family: string, weight: number, maxW: number, size: number, ls = 0) => {
  if (!text) return size;
  const per = measure(text, family, weight) / 100, L = ls * text.length; // giãn chữ không co theo cỡ chữ
  return per * size + L > maxW ? Math.max(1, (maxW - L) / per) : size;
};
/** 1 dòng, chữ quá nhỏ thì bẻ 2 dòng cân nhau */
function fitLines(text: string, family: string, weight: number, maxW: number, size: number, minSize: number, ls = 0): { lines: string[]; size: number } {
  const t = (text || '').trim();
  const s1 = fitSize(t, family, weight, maxW, size, ls);
  const words = t.split(/\s+/).filter(Boolean);
  if (s1 >= minSize || words.length < 2) return { lines: t ? [t] : [], size: s1 };
  let best: [string, string] = [t, ''], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, family, weight), measure(b, family, weight));
    if (w < bw) { bw = w; best = [a.replace(/\s*·$/, ''), b.replace(/^·\s*/, '')]; }
  }
  const s2 = Math.min(size * 0.86, fitSize(best[0], family, weight, maxW, size, ls), fitSize(best[1], family, weight, maxW, size, ls));
  return s2 > s1 ? { lines: best, size: s2 } : { lines: [t], size: s1 };
}


/** hotline: 1 dòng; nhiều số (cách bằng – / - | ,) mà 1 dòng phải co quá nửa → bẻ mỗi số 1 dòng */
function hotFit(hot: string, maxW: number, size: number, ls: number): { lines: string[]; size: number } {
  const s1 = fitSize(hot, NUM, 700, maxW, size, ls);
  const parts = hot.split(/\s+[–—\-|\/]\s+|\s*[,;]\s*/).map((x) => x.trim()).filter(Boolean);
  if (s1 >= size * 0.6 || parts.length !== 2) return { lines: [hot], size: s1 };
  const s2 = Math.min(size * 0.56, ...parts.map((x) => fitSize(x, NUM, 700, maxW, size, ls)));
  return s2 > s1 ? { lines: parts, size: s2 } : { lines: [hot], size: s1 };
}

const f1 = (n: number) => Math.round(n * 10) / 10;

// chữ canh giữa / trái theo TÂM dòng (cy) — baseline ≈ cy + 0.36·size
function Txt({ x, cy, text, size, family, weight, fill, anchor = 'middle', ls = 0, role, lineGap = 1.12 }: {
  x: number; cy: number; text: string | string[]; size: number; family: string; weight: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; role: string; lineGap?: number;
}) {
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean);
  if (!lines.length) return null;
  const gap = size * lineGap;
  const y0 = cy - ((lines.length - 1) * gap) / 2 + size * 0.36;
  return (
    <>
      {lines.map((ln, i) => (
        <text key={i} x={f1(x)} y={f1(y0 + i * gap)} fontFamily={`"${family}"`} fontWeight={weight} fontSize={f1(size)} fill={fill} textAnchor={anchor}
          letterSpacing={ls || undefined} data-role={role}>{ln}</text>
      ))}
    </>
  );
}

// ---------- icon vẽ bằng code (khung 100×100) ----------
function Icon({ purpose, x, y, s, c1, c2 }: { purpose: MgPurpose; x: number; y: number; s: number; c1: string; c2: string }) {
  const st = { fill: 'none', stroke: c1, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: ReactNode;
  if (purpose === 'food') body = (
    <>
      <path d="M2 60H14M0 70H9" {...st} stroke={c2} strokeWidth={5} />
      <rect x={12} y={24} width={30} height={27} rx={4} fill={c2} stroke={c1} strokeWidth={6} />
      <path d="M20 37H34" {...st} strokeWidth={4} />
      <circle cx={27} cy={76} r={11} {...st} strokeWidth={7} />
      <circle cx={79} cy={76} r={11} {...st} strokeWidth={7} />
      <path d="M27 76H53Q57 60 67 58L79 76" {...st} strokeWidth={7} />
      <path d="M40 56H58" {...st} strokeWidth={8} />
      <path d="M67 58L61 31M55 31H67" {...st} strokeWidth={7} />
    </>
  );
  else if (purpose === 'repair') body = (
    <>
      <path d="M64 14C64 14 42 42 42 57A22 22 0 0 0 86 57C86 42 64 14 64 14Z" fill={c2} />
      <path d="M17 84L45 56" {...st} strokeWidth={13} />
      <circle cx={52} cy={48} r={13} {...st} strokeWidth={9} />
      <path d="M57 36L66 27" {...st} strokeWidth={9} stroke={c2} />
    </>
  );
  else if (purpose === 'taxi') body = (
    <>
      <rect x={38} y={8} width={24} height={11} rx={3} fill={c2} stroke={c1} strokeWidth={4} />
      <path d="M12 60Q12 46 25 44L32 27Q34 21 41 21H59Q66 21 68 27L75 44Q88 46 88 60V73Q88 77 84 77H16Q12 77 12 73Z" fill={c1} />
      <path d="M35 29H65L70 43H30Z" fill={c2} />
      <circle cx={24} cy={59} r={6} fill={c2} /><circle cx={76} cy={59} r={6} fill={c2} />
      <rect x={38} y={60} width={24} height={7} rx={2} fill={c2} />
      <rect x={17} y={74} width={15} height={13} rx={3} fill={c1} /><rect x={68} y={74} width={15} height={13} rx={3} fill={c1} />
    </>
  );
  else if (purpose === 'spa') body = (
    <>
      <path d="M50 74C34 74 18 68 8 55C25 52 40 59 50 74Z" fill={c2} />
      <path d="M50 74C66 74 82 68 92 55C75 52 60 59 50 74Z" fill={c2} />
      <path d="M50 73C36 66 24 52 22 34C37 39 47 52 50 73Z" fill={c1} opacity={0.8} />
      <path d="M50 73C64 66 76 52 78 34C63 39 53 52 50 73Z" fill={c1} opacity={0.8} />
      <path d="M50 16C63 33 63 56 50 73C37 56 37 33 50 16Z" fill={c1} />
      <path d="M24 85H76" {...st} strokeWidth={5} />
    </>
  );
  else if (purpose === 'kinder') body = (
    <>
      <circle cx={28} cy={26} r={13} fill={c2} />
      <path d="M28 4V8M28 44V48M6 26H10M46 26H50M12 10L15 13M41 39L44 42M12 42L15 39M41 13L44 10" {...st} stroke={c2} strokeWidth={4} />
      <rect x={18} y={58} width={27} height={27} rx={4} fill={c1} />
      <rect x={52} y={58} width={27} height={27} rx={4} fill={c2} />
      <path d="M35 56L48 34L61 56Z" fill={c1} />
      <circle cx={31.5} cy={71.5} r={5} fill={c2} /><path d="M58 66H73M58 76H73" {...st} strokeWidth={4} />
    </>
  );
  else body = (
    <>
      <path d="M14 50L50 20L86 50" {...st} strokeWidth={8} />
      <path d="M22 45V84H78V45" {...st} strokeWidth={7} />
      <rect x={42} y={58} width={16} height={26} rx={2} fill={c2} />
      <rect x={28} y={54} width={10} height={10} rx={1.5} fill={c2} /><rect x={62} y={54} width={10} height={10} rx={1.5} fill={c2} />
      <rect x={64} y={18} width={9} height={16} fill={c1} />
    </>
  );
  return <g transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s / 100 * 1000) / 1000})`} data-role="icon">{body}</g>;
}

function Phone({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${(s / 100).toFixed(4)})`}>
      <path d="M30 12Q37 10 41 17L49 32Q51 38 46 42L40 46Q45 58 55 66L59 61Q63 56 69 58L83 66Q89 70 87 76L83 84Q79 90 71 88Q41 80 21 50Q13 32 22 19Z" fill={fill} />
    </g>
  );
}

function Qr({ text, x, y, s, ink }: { text: string; x: number; y: number; s: number; ink: string }) {
  const { d, n } = qrPath(text || ' ');
  const pad = s * 0.07, inner = s - pad * 2;
  return (
    <g data-role="qr">
      <rect x={f1(x)} y={f1(y)} width={f1(s)} height={f1(s)} rx={f1(s * 0.07)} fill="#FFFFFF" />
      <path d={d} fill={ink} transform={`translate(${f1(x + pad)} ${f1(y + pad)}) scale(${(inner / n).toFixed(4)})`} />
    </g>
  );
}

// logo khách (ảnh) hoặc icon theo mục đích, gói trong ô vuông
function Mark({ logo, purpose, x, y, s, c1, c2 }: { logo?: string; purpose: MgPurpose; x: number; y: number; s: number; c1: string; c2: string }) {
  if (logo) return <image href={logo} x={f1(x)} y={f1(y)} width={f1(s)} height={f1(s)} preserveAspectRatio="xMidYMid meet" data-role="logo" />;
  return <Icon purpose={purpose} x={x} y={y} s={s} c1={c1} c2={c2} />;
}

// ---------- bố cục từng hình ----------
interface Art { zones: ReactNode; content: ReactNode }

function compose(spec: MgSpec, data: MgData, logo?: string): Art {
  const sh = mgShape(spec.shape);
  const p = mgPalette(spec.palette);
  const f = mgFont(spec.font);
  const W = sh.wMm * U, H = sh.hMm * U;
  const big = (n = 300) => ({ x: -n, y: -n, width: W + n * 2, height: H + n * 2 });
  const brand = (data.brand || '').trim(), hot = (data.hotline || '').trim(), slogan = (data.slogan || '').trim();
  const service = (data.service || '').trim(), extra = (data.extra || '').trim();
  const qr = spec.qr && qrAllowed(spec.shape) && !!(data.zalo || '').trim();
  const lsH = 4; // giãn chữ số hotline

  if (spec.shape === 'card') {
    const x0 = 330, x1 = qr ? 650 : 860, mw = x1 - x0;
    const b = fitLines(brand, f.family, f.weight, mw, 66, 40);
    const sv = fitLines(service, BODY, 800, mw, 30, 22);
    const sl = fitSize(slogan, SCRIPT, 400, mw, 52);
    const hf = hotFit(hot, 690, 132, lsH), hs = hf.lines.length > 1 ? Math.min(hf.size, 68) : hf.size;
    const bCy = b.lines.length > 1 ? 92 : 100;
    const svCy = b.lines.length > 1 ? 192 : 178 + (sv.lines.length > 1 ? 10 : 0);
    const slCy = svCy + (sv.lines.length > 1 ? 82 : 68);
    return {
      zones: (
        <>
          <rect {...big()} fill={p.bg} />
          <circle cx={W - 40} cy={-30} r={190} fill={p.soft} opacity={0.65} />
          <rect x={-300} y={380} width={W + 600} height={H} fill={p.accent} />
          {spec.palette === 'taxi' && Array.from({ length: 24 }, (_, i) => <rect key={i} x={-60 + i * 45} y={i % 2 ? 380 : 360} width={45} height={20} fill={p.accent} />)}
        </>
      ),
      content: (
        <>
          <circle cx={170} cy={190} r={128} fill={p.soft} />
          <circle cx={170} cy={190} r={128} fill="none" stroke={p.accent} strokeWidth={6} opacity={0.9} />
          <Mark logo={logo} purpose={spec.purpose} x={170 - 82} y={190 - 82} s={164} c1={p.accent} c2={p.deco} />
          <Txt x={x0} cy={bCy} text={b.lines} size={b.size} family={f.family} weight={f.weight} fill={p.ink} anchor="start" role="brand" lineGap={1.02} />
          <Txt x={x0} cy={svCy} text={sv.lines} size={sv.size} family={BODY} weight={800} fill={p.accent} anchor="start" role="service" lineGap={1.2} />
          <Txt x={x0} cy={slCy} text={slogan} size={sl} family={SCRIPT} weight={400} fill={p.ink} anchor="start" role="slogan" />
          {extra && slCy < 300 && (() => { const ex = fitLines(extra, BODY, 600, mw, 24, 18); return <Txt x={x0} cy={ex.lines.length > 1 ? 334 : 338} text={ex.lines} size={ex.size} family={BODY} weight={600} fill={p.sub} anchor="start" role="extra" lineGap={1.18} />; })()}
          {qr && <><Qr text={data.zalo} x={676} y={44} s={186} ink={p.ink} /><Txt x={769} cy={262} text="Quét Zalo" size={22} family={BODY} weight={800} fill={p.sub} role="qr-label" /></>}
          <circle cx={92} cy={466} r={54} fill={p.onAccent} />
          <Phone x={92 - 34} y={466 - 34} s={68} fill={p.accent} />
          <Txt x={172} cy={466} text={hf.lines} size={hs} family={NUM} weight={700} fill={p.onAccent} anchor="start" ls={lsH} role="hotline" />
        </>
      ),
    };
  }

  if (spec.shape === 'tall') {
    const b = fitLines(brand, f.family, f.weight, 600, 66, 44);
    const sv = fitLines(service, BODY, 800, 600, 32, 24);
    const sl = fitSize(slogan, SCRIPT, 400, 600, 60);
    const hf = hotFit(hot, 610, 122, lsH), hs = hf.size;
    return {
      zones: (
        <>
          <rect {...big()} fill={p.bg} />
          <rect x={-300} y={-300} width={W + 600} height={500} fill={p.accent} />
          <path d={`M-300 200 Q${W / 2} 270 ${W + 300} 200 Z`} fill={p.accent} />
          <rect x={-300} y={740} width={W + 600} height={180} fill={p.accent} />
        </>
      ),
      content: (
        <>
          <Txt x={W / 2} cy={b.lines.length > 1 ? 104 : 108} text={b.lines} size={b.size} family={f.family} weight={f.weight} fill={p.onAccent} role="brand" lineGap={1.02} />
          {qr ? (
            <>
              <circle cx={190} cy={390} r={128} fill={p.soft} />
              <Mark logo={logo} purpose={spec.purpose} x={190 - 88} y={390 - 88} s={176} c1={p.accent} c2={p.deco} />
              <Qr text={data.zalo} x={360} y={282} s={216} ink={spec.palette === 'navy' ? '#0F2A4A' : p.ink} />
              <Txt x={468} cy={528} text="Quét Zalo" size={24} family={BODY} weight={800} fill={p.sub} role="qr-label" />
            </>
          ) : (
            <>
              <circle cx={W / 2} cy={392} r={146} fill={p.soft} />
              <Mark logo={logo} purpose={spec.purpose} x={W / 2 - 104} y={392 - 104} s={208} c1={p.accent} c2={p.deco} />
            </>
          )}
          <Txt x={W / 2} cy={sv.lines.length > 1 ? 598 : 590} text={sv.lines} size={sv.size} family={BODY} weight={800} fill={p.accent === p.bg ? p.ink : (spec.palette === 'navy' ? p.deco : p.accent)} role="service" lineGap={1.2} />
          <Txt x={W / 2} cy={sv.lines.length > 1 ? 690 : 680} text={slogan} size={Math.min(sl, sv.lines.length > 1 ? 50 : 60)} family={SCRIPT} weight={400} fill={p.ink} role="slogan" />
          {hf.lines.length < 2 && <Txt x={W / 2} cy={782} text="GỌI NGAY" size={26} family={BODY} weight={800} fill={p.onAccent} ls={8} role="label" />}
          <Txt x={W / 2} cy={hf.lines.length > 1 ? 830 : 858} text={hf.lines} size={hs} family={NUM} weight={700} fill={p.onAccent} ls={lsH} role="hotline" />
          {extra && <Txt x={W / 2} cy={960} text={extra} size={fitSize(extra, BODY, 600, 610, 26)} family={BODY} weight={600} fill={p.sub} role="extra" />}
        </>
      ),
    };
  }

  if (sh.kind === 'round') {
    const D = W, R = D / 2, ring = D * 0.055;
    const b = fitLines(brand, f.family, f.weight, D * 0.72, D * 0.1, D * 0.065);
    const hf = hotFit(hot, D * 0.74, D * 0.135, lsH), hs = hf.size;
    const sl = fitSize(slogan, SCRIPT, 400, D * 0.5, D * 0.085);
    const bCy = b.lines.length > 1 ? D * 0.468 : D * 0.485;
    return {
      zones: (
        <>
          <rect {...big()} fill={p.accent} />
          <circle cx={R} cy={R} r={R - ring} fill={p.bg} />
          <rect x={-300} y={D * 0.585} width={D + 600} height={D * 0.185} fill={p.accent} />
        </>
      ),
      content: (
        <>
          <circle cx={R} cy={R} r={R - ring * 1.45} fill="none" stroke={p.accent} strokeWidth={D * 0.006} strokeDasharray={`${f1(D * 0.012)} ${f1(D * 0.012)}`} opacity={0.6} />
          <circle cx={R} cy={D * 0.255} r={D * 0.14} fill={p.soft} />
          <Mark logo={logo} purpose={spec.purpose} x={R - D * 0.1} y={D * 0.155} s={D * 0.2} c1={p.accent} c2={p.deco} />
          <Txt x={R} cy={bCy} text={b.lines} size={b.size} family={f.family} weight={f.weight} fill={p.ink} role="brand" lineGap={1.02} />
          <Txt x={R} cy={D * 0.678} text={hf.lines} size={hs} family={NUM} weight={700} fill={p.onAccent} ls={lsH} role="hotline" />
          <Txt x={R} cy={D * 0.845} text={slogan} size={sl} family={SCRIPT} weight={400} fill={p.ink} role="slogan" />
        </>
      ),
    };
  }

  // ---- die-cut ----
  const mm = (n: number) => n * U;
  if (spec.shape === 'cup') {
    const pearls: [number, number, number][] = [
      ...[17.5, 23.5, 29.5, 35.5, 41.5].map((x) => [x + 1.5, 75.2, 2.5] as [number, number, number]),
      ...[20, 26, 32, 38, 44].map((x) => [x, 80.4, 2.5] as [number, number, number]),
      ...[23, 29, 35, 41].map((x) => [x, 85.2, 2.4] as [number, number, number]),
    ];
    const bl = fitLines(brand, f.family, f.weight, mm(33), mm(5.4), mm(4.4));
    return {
      zones: (
        <>
          <rect {...big()} fill={p.bg} />
          <rect x={-300} y={-300} width={W + 600} height={mm(33) + 300} fill="#FFFFFF" />
          <ellipse cx={mm(24)} cy={mm(21)} rx={mm(9)} ry={mm(3.2)} fill="#EEF2F5" />
          <rect x={-300} y={mm(27.6)} width={W + 600} height={mm(5.6)} fill="#E4DED5" />
          <rect x={mm(32.6)} y={-300} width={mm(7.8)} height={mm(19) + 300} fill={p.accent} />
          <path d={`M${mm(32.6)} ${mm(4)}L${mm(40.4)} ${mm(8)}M${mm(32.6)} ${mm(10)}L${mm(40.4)} ${mm(14)}`} stroke={p.onAccent} strokeWidth={mm(1.1)} opacity={0.55} />
          <rect x={-300} y={mm(69)} width={W + 600} height={600} fill={p.deco} />
          <path d={`M-300 ${mm(69)} Q${mm(16)} ${mm(66.5)} ${mm(31)} ${mm(69)} T${W + 300} ${mm(69)}`} fill={p.deco} />
        </>
      ),
      content: (
        <>
          {pearls.map(([x, y, r], i) => <circle key={i} cx={f1(mm(x))} cy={f1(mm(y))} r={mm(r)} fill="#3B2416" />)}
          {pearls.map(([x, y, r], i) => <circle key={`h${i}`} cx={f1(mm(x - r * 0.35))} cy={f1(mm(y - r * 0.35))} r={mm(r * 0.28)} fill="#FFFFFF" opacity={0.35} />)}
          <Txt x={mm(31)} cy={mm(bl.lines.length > 1 ? 42.4 : 43)} text={bl.lines} size={bl.size} family={f.family} weight={f.weight} fill={p.ink} role="brand" lineGap={1.02} />
          <Txt x={mm(31)} cy={mm(54.5)} text={hotFit(hot, mm(34), mm(7.8), 2).lines} size={hotFit(hot, mm(34), mm(7.8), 2).size} family={NUM} weight={700} fill={p.accent} ls={2} role="hotline" />
          <Txt x={mm(31)} cy={mm(63.4)} text={slogan} size={fitSize(slogan, SCRIPT, 400, mm(29), mm(5))} family={SCRIPT} weight={400} fill={p.ink} role="slogan" />
        </>
      ),
    };
  }

  if (spec.shape === 'pizza') {
    const crust = p.deco;
    const bl = fitLines(brand, f.family, f.weight, mm(54), mm(6), mm(4));
    return {
      zones: (
        <>
          <rect {...big()} fill={p.bg} />
          <rect x={-300} y={-300} width={W + 600} height={mm(16.5) + 300} fill={crust} />
          <path d={`M-300 ${mm(15)}H${W + 300}V${mm(18)}` + Array.from({ length: 9 }, (_, i) => {
            const x = W + 300 - (i + 1) * ((W + 600) / 9);
            return `Q${f1(x + (W + 600) / 18)} ${mm(i % 2 ? 21 : 23.5)} ${f1(x)} ${mm(18)}`;
          }).join('') + 'Z'} fill={p.bg} />
          <path d={`M-300 ${mm(4.5)}Q${mm(40)} ${mm(-1)} ${W + 300} ${mm(4.5)}`} stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={mm(1.4)} fill="none" />
        </>
      ),
      content: (
        <>
          {([[40, 57, 5.2], [35.4, 67.5, 3.6], [44.6, 67.5, 3.6]] as const).map(([x, y, r], i) => (
            <g key={i}>
              <circle cx={mm(x)} cy={mm(y)} r={mm(r)} fill={p.accent} />
              <circle cx={mm(x - r * 0.3)} cy={mm(y - r * 0.25)} r={mm(r * 0.22)} fill="#000" opacity={0.18} />
              <circle cx={mm(x + r * 0.35)} cy={mm(y + r * 0.2)} r={mm(r * 0.16)} fill="#000" opacity={0.18} />
            </g>
          ))}
          <ellipse cx={mm(29)} cy={mm(52)} rx={mm(2.6)} ry={mm(1.3)} fill="#3E8E41" transform={`rotate(-30 ${mm(29)} ${mm(52)})`} />
          <ellipse cx={mm(51)} cy={mm(51)} rx={mm(2.6)} ry={mm(1.3)} fill="#3E8E41" transform={`rotate(25 ${mm(51)} ${mm(51)})`} />
          <Txt x={mm(40)} cy={mm(bl.lines.length > 1 ? 9.4 : 9.8)} text={bl.lines} size={bl.size} family={f.family} weight={f.weight} fill="#FFFFFF" role="brand" lineGap={1.0} />
          <Txt x={mm(40)} cy={mm(30.5)} text={hotFit(hot, mm(46), mm(9.5), 2).lines} size={hotFit(hot, mm(46), mm(9.5), 2).size} family={NUM} weight={700} fill={p.ink} ls={2} role="hotline" />
          <Txt x={mm(40)} cy={mm(41.6)} text={slogan} size={fitSize(slogan, SCRIPT, 400, mm(33), mm(5.6))} family={SCRIPT} weight={400} fill={p.accent} role="slogan" />
        </>
      ),
    };
  }

  if (spec.shape === 'house') {
    const bl = fitLines(brand, f.family, f.weight, mm(44), mm(5.6), mm(3.8));
    const sv = fitLines(service, BODY, 800, mm(52), mm(3), mm(2.2));
    return {
      zones: (
        <>
          <rect {...big()} fill={p.bg} />
          <rect x={-300} y={mm(69.5)} width={W + 600} height={600} fill="#7CC36B" />
          <rect x={mm(54)} y={-300} width={mm(11)} height={mm(26) + 300} fill={p.ink} opacity={0.85} />
          <path d={`M${mm(40)} ${mm(-14)}L${mm(98)} ${mm(36)}L${mm(-18)} ${mm(36)}Z`} fill={p.accent} />
          <rect x={-300} y={mm(36)} width={W + 600} height={mm(1.6)} fill="#000" opacity={0.14} />
        </>
      ),
      content: (
        <>
          <path d={`M${mm(10)} ${mm(70)}h${mm(4)}l${mm(2)} ${mm(-3)} ${mm(2)} ${mm(3)}h${mm(6)}l${mm(2)} ${mm(-2.4)} ${mm(2)} ${mm(2.4)}`} fill="none" stroke="#5DA34E" strokeWidth={mm(0.8)} />
          <Txt x={mm(40)} cy={mm(bl.lines.length > 1 ? 25.4 : 26.6)} text={bl.lines} size={bl.size} family={f.family} weight={f.weight} fill={p.onAccent} role="brand" lineGap={1.0} />
          <Txt x={mm(40)} cy={mm(sv.lines.length > 1 ? 42.6 : 42.2)} text={sv.lines} size={sv.size} family={BODY} weight={800} fill={p.sub} role="service" lineGap={1.15} />
          <Txt x={mm(40)} cy={mm(52.6)} text={hotFit(hot, mm(54), mm(10), 2).lines} size={hotFit(hot, mm(54), mm(10), 2).size} family={NUM} weight={700} fill={p.accent} ls={2} role="hotline" />
          <Txt x={mm(40)} cy={mm(63.2)} text={slogan} size={fitSize(slogan, SCRIPT, 400, mm(46), mm(5.4))} family={SCRIPT} weight={400} fill={p.ink} role="slogan" />
        </>
      ),
    };
  }

  if (spec.shape === 'drop') {
    const bl = fitLines(brand, f.family, f.weight, mm(44), mm(5.6), mm(4.6));
    return {
      zones: (
        <>
          <rect {...big()} fill={p.bg} />
          <rect x={-300} y={mm(66)} width={W + 600} height={600} fill={p.soft} />
          <path d={`M-300 ${mm(66)}Q${mm(16)} ${mm(63)} ${mm(33)} ${mm(66)}T${W + 300} ${mm(66)}`} fill={p.soft} />
        </>
      ),
      content: (
        <>
          <path d={`M${mm(13)} ${mm(54)}Q${mm(13)} ${mm(43)} ${mm(20)} ${mm(32)}`} stroke="#FFFFFF" strokeWidth={mm(2.4)} strokeLinecap="round" fill="none" opacity={0.85} />
          <Mark logo={logo} purpose={spec.purpose} x={mm(25.5)} y={mm(24)} s={mm(15)} c1={p.accent} c2={p.deco} />
          <Txt x={mm(33)} cy={mm(bl.lines.length > 1 ? 47.4 : 48.2)} text={bl.lines} size={bl.size} family={f.family} weight={f.weight} fill={p.ink} role="brand" lineGap={1.0} />
          <Txt x={mm(33)} cy={mm(60)} text={hotFit(hot, mm(46), mm(9), 2).lines} size={hotFit(hot, mm(46), mm(9), 2).size} family={NUM} weight={700} fill={p.accent} ls={2} role="hotline" />
          <Txt x={mm(33)} cy={mm(71.2)} text={slogan} size={fitSize(slogan, SCRIPT, 400, mm(34), mm(5.2))} family={SCRIPT} weight={400} fill={p.ink} role="slogan" />
        </>
      ),
    };
  }

  // bubble
  const bl = fitLines(brand, f.family, f.weight, mm(62), mm(4.6), mm(3.4));
  return {
    zones: <rect {...big()} fill={p.accent} />,
    content: (
      <>
        <Txt x={mm(43)} cy={mm(15.6)} text={slogan} size={fitSize(slogan, SCRIPT, 400, mm(68), mm(9.4))} family={SCRIPT} weight={400} fill={p.onAccent} role="slogan" />
        <Phone x={mm(8.4)} y={mm(26.6)} s={mm(8.6)} fill={p.deco} />
        <Txt x={mm(46)} cy={mm(31.2)} text={hotFit(hot, mm(62), mm(12), 2).lines} size={hotFit(hot, mm(62), mm(12), 2).size} family={NUM} weight={700} fill={p.deco} ls={2} role="hotline" />
        <Txt x={mm(43)} cy={mm(bl.lines.length > 1 ? 44 : 44.6)} text={bl.lines} size={bl.size} family={f.family} weight={f.weight} fill={p.onAccent} role="brand" lineGap={1.0} />
      </>
    ),
  };
}

/**
 * 1 nam châm. bleed = có lề xén (nền tràn 1.5mm ngoài đường cắt, cho file in).
 * Không bleed: đúng khung thành phẩm, ngoài đường cắt trong suốt (xem trước, texture 3D).
 */
export function MagnetSvg({ spec, data, logo, bleed = false, cut = false, style, nested }: {
  spec: MgSpec; data: MgData; logo?: string; bleed?: boolean; cut?: boolean; style?: CSSProperties; nested?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const sh = mgShape(spec.shape);
  const W = sh.wMm * U, H = sh.hMm * U, b = bleed ? MG_BLEED_MM * U : 0;
  const art = compose(spec, data, logo);
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
      width={nested ? W + b * 2 : undefined} height={nested ? H + b * 2 : undefined} style={style} data-shape={sh.id}>
      <defs>
        <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-b - 10} y={-b - 10} width={W + b * 2 + 20} height={H + b * 2 + 20}>
          <path d={sh.d} transform={`scale(${U})`} fill="#FFFFFF" stroke={bleed ? '#FFFFFF' : 'none'} strokeWidth={bleed ? MG_BLEED_MM * 2 : 0} strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#${uid}-m)`}>
        {art.zones}
        <g id="Content">{art.content}</g>
      </g>
      {cut && <path id="CutPreview" d={sh.d} transform={`scale(${U})`} fill="none" stroke={CUTCONTOUR} strokeWidth={0.25} strokeDasharray="1.2 0.8" />}
    </svg>
  );
}

// ---------- tờ in A4: xếp lưới, lớp In + CutContour ----------
export const MG_SHEET = { wMm: 210, hMm: 297, marginMm: 8, gapMm: 4 };
/** xếp lưới trên A4; thử cả xoay 90° (vd ly trà sữa đứng → nằm ngang xếp được gấp đôi) */
export function mgSheetFit(shape: MgShapeId) {
  const sz = mgShape(shape);
  const g = MG_SHEET.gapMm;
  const grid = (w: number, h: number) => {
    const cols = Math.max(1, Math.floor((MG_SHEET.wMm - MG_SHEET.marginMm * 2 + g) / (w + g)));
    const rows = Math.max(1, Math.floor((MG_SHEET.hMm - MG_SHEET.marginMm * 2 - 6 + g) / (h + g)));
    return { cols, rows, w, h };
  };
  const a = grid(sz.wMm, sz.hMm), b = grid(sz.hMm, sz.wMm);
  const rot = b.cols * b.rows > a.cols * a.rows;
  const { cols, rows, w, h } = rot ? b : a;
  const x0 = (MG_SHEET.wMm - (cols * w + (cols - 1) * g)) / 2;
  const y0 = (MG_SHEET.hMm - 6 - (rows * h + (rows - 1) * g)) / 2;
  return { cols, rows, per: cols * rows, x0, y0, sz, rot, cw: w, ch: h };
}

export function MagnetSheetSvg({ spec, data, logo, style }: { spec: MgSpec; data: MgData; logo?: string; style?: CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const fit = mgSheetFit(spec.shape);
  const { sz } = fit;
  const W = MG_SHEET.wMm * U, H = MG_SHEET.hMm * U, b = MG_BLEED_MM * U;
  const cells = Array.from({ length: fit.per }, (_, i) => {
    const x = (fit.x0 + (i % fit.cols) * (fit.cw + MG_SHEET.gapMm)) * U, y = (fit.y0 + Math.floor(i / fit.cols) * (fit.ch + MG_SHEET.gapMm)) * U;
    // xoay 90°: (u,v) → (x + H − v, y + u)
    return fit.rot ? `translate(${f1(x + sz.hMm * U)} ${f1(y)}) rotate(90)` : `translate(${f1(x)} ${f1(y)})`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${MG_SHEET.wMm}mm`} height={`${MG_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" style={style} data-count={fit.per}>
      <defs>
        <g id={`${u}-mg`} data-magnet-def="1"><MagnetSvg spec={spec} data={data} logo={logo} bleed nested /></g>
        <path id={`${u}-cut`} d={sz.d} />
      </defs>
      <g id="In">
        {cells.map((t, i) => <use key={i} href={`#${u}-mg`} x={-b} y={-b} transform={t} />)}
      </g>
      <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={0.1}>
        <title>CutContour</title>
        {cells.map((t, i) => <use key={i} href={`#${u}-cut`} transform={`${t} scale(${U})`} />)}
      </g>
      <text x={MG_SHEET.marginMm * U} y={H - 40} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={26} fill="#9CA3AF">
        {`Mivy · nam châm ${sz.name} · ${fit.per} con/tờ A4 · lề xén ${MG_BLEED_MM}mm · CutContour = đường bế`}
      </text>
    </svg>
  );
}
