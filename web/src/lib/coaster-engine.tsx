'use client';
// Lót ly in logo: 1 engine SVG = NGÀNH (cà phê, bia, trà sữa, nhà hàng, đám cưới, khai trương) × BỐ CỤC × HÌNH
// (tròn Ø9/Ø10, vuông bo góc, die-cut hạt cà phê / chiếc lá / ly) × CHẤT LIỆU (giấy bồi, gỗ in UV, cao su 1 màu) → render code 100%.
// 2 mặt: mặt trước = thiết kế, mặt sau = wifi + QR + instagram (đám cưới: lời cảm ơn).
// Đơn vị vẽ: 10 = 1mm. Đường cắt (CutContour) bằng mm. Chữ đặt trong VÙNG AN TOÀN (elip/chữ nhật thụt vào 4.5mm),
// bề ngang mỗi dòng tính theo đúng độ rộng vùng an toàn tại cao độ dòng đó (tròn: hẹp dần lên trên/dưới).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

const U = 10;
export const CO_BLEED_MM = 2;
export const CUTCONTOUR = '#EC008C';

// ---------- hình ----------
export type CoShapeId = 'r90' | 'r100' | 'sq90' | 'sq100' | 'bean' | 'leaf' | 'cup';
export interface CoSafe { kind: 'ellipse' | 'rect'; cx: number; cy: number; rx: number; ry: number } // mm
export interface CoShape { id: CoShapeId; kind: 'round' | 'square' | 'die'; name: string; wMm: number; hMm: number; d: string; safe: CoSafe }

const rr = (w: number, h: number, r: number) =>
  `M${r} 0H${w - r}A${r} ${r} 0 0 1 ${w} ${r}V${h - r}A${r} ${r} 0 0 1 ${w - r} ${h}H${r}A${r} ${r} 0 0 1 0 ${h - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
const circ = (d: number) => `M0 ${d / 2}A${d / 2} ${d / 2} 0 1 1 ${d} ${d / 2}A${d / 2} ${d / 2} 0 1 1 0 ${d / 2}Z`;
const IN = 4.5; // thụt vào từ mép cắt (mm)

export const CO_SHAPES: CoShape[] = [
  { id: 'r90', kind: 'round', name: 'Tròn Ø9cm', wMm: 90, hMm: 90, d: circ(90), safe: { kind: 'ellipse', cx: 45, cy: 45, rx: 45 - IN, ry: 45 - IN } },
  { id: 'r100', kind: 'round', name: 'Tròn Ø10cm', wMm: 100, hMm: 100, d: circ(100), safe: { kind: 'ellipse', cx: 50, cy: 50, rx: 50 - IN, ry: 50 - IN } },
  { id: 'sq90', kind: 'square', name: 'Vuông 9×9cm', wMm: 90, hMm: 90, d: rr(90, 90, 7), safe: { kind: 'rect', cx: 45, cy: 45, rx: 45 - IN - 1, ry: 45 - IN - 1 } },
  { id: 'sq100', kind: 'square', name: 'Vuông 10×10cm', wMm: 100, hMm: 100, d: rr(100, 100, 8), safe: { kind: 'rect', cx: 50, cy: 50, rx: 50 - IN - 1, ry: 50 - IN - 1 } },
  // hạt cà phê (bầu dục hơi lệch)
  { id: 'bean', kind: 'die', name: 'Hạt cà phê', wMm: 84, hMm: 100,
    d: 'M42 2C68 2 82 27 82 50C82 75 66 98 42 98C18 98 2 75 2 50C2 27 16 2 42 2Z', safe: { kind: 'ellipse', cx: 42, cy: 50, rx: 35, ry: 43 } },
  // chiếc lá (mũi nhọn ở trên)
  { id: 'leaf', kind: 'die', name: 'Chiếc lá', wMm: 90, hMm: 100,
    d: 'M45 2C56 10 85 34 86 60C87 84 68 98 45 98C22 98 3 84 4 60C5 34 34 10 45 2Z', safe: { kind: 'ellipse', cx: 45, cy: 60, rx: 33, ry: 31 } },
  // ly cà phê nhìn ngang, quai liền khối bên phải
  { id: 'cup', kind: 'die', name: 'Ly cà phê', wMm: 100, hMm: 90,
    d: 'M10 8H72Q76 8 76 12V22Q97 21 97 41Q97 61 75 62L73 78Q72 88 62 88H20Q10 88 9 78L6 12Q6 8 10 8Z', safe: { kind: 'rect', cx: 40.5, cy: 47, rx: 27, ry: 33 } },
];
export const coShape = (id: string) => CO_SHAPES.find((s) => s.id === id) || CO_SHAPES[0];

// ---------- ngành + chữ mẫu ----------
export type CoPurpose = 'cafe' | 'beer' | 'milktea' | 'restaurant' | 'wedding' | 'opening';
export const CO_PURPOSES: { id: CoPurpose; name: string }[] = [
  { id: 'cafe', name: 'Quán cà phê' },
  { id: 'beer', name: 'Bar · bia' },
  { id: 'milktea', name: 'Trà sữa' },
  { id: 'restaurant', name: 'Nhà hàng' },
  { id: 'wedding', name: 'Đám cưới' },
  { id: 'opening', name: 'Khai trương' },
];
export type CoData = Record<string, string>;
export const CO_SAMPLES: Record<CoPurpose, CoData> = {
  cafe: { brand: 'THU HÀ COFFEE', tagline: 'RANG XAY MỖI NGÀY', est: 'SINCE 2019', slogan: 'Cà phê ngon – chuyện vui', wifi: 'ThuHa Coffee', pass: 'caphengon', link: 'https://instagram.com/thuha.coffee', handle: '@thuha.coffee', note: 'Cảm ơn bạn đã ghé!' },
  beer: { brand: 'QUỐC BẢO BREWING', tagline: 'CRAFT BEER · SÀI GÒN', est: 'EST. 2021', slogan: 'Uống có trách nhiệm', wifi: 'QB Taproom', pass: 'cheers2021', link: 'https://instagram.com/quocbao.brewing', handle: '@quocbao.brewing', note: 'Đã uống bia – không lái xe' },
  milktea: { brand: 'GIA KHÁNH TEA', tagline: 'TRÀ SỮA · TOPPING TƯƠI', est: 'SINCE 2022', slogan: 'Ngọt vừa – mát lành', wifi: 'GiaKhanh Tea', pass: 'trasua123', link: 'https://instagram.com/giakhanh.tea', handle: '@giakhanh.tea', note: 'Chụp hình tag tụi mình nha!' },
  restaurant: { brand: 'BẾP AN KHANG', tagline: 'MÓN VIỆT NHÀ LÀM', est: 'SINCE 2015', slogan: 'Ngon như cơm nhà', wifi: 'Bep An Khang', pass: 'ankhang88', link: 'https://ankhang.vn/menu', handle: '@bepankhang', note: 'Đặt bàn: 0909 123 456' },
  wedding: { brand: 'Thu Hà & Quốc Bảo', tagline: 'LỄ THÀNH HÔN', est: '12 · 01 · 2027', slogan: 'Trăm năm hạnh phúc', wifi: '', pass: '', link: 'https://thuha-quocbao.vn/album', handle: '#ThuHaQuocBao', note: 'Cảm ơn bạn đã đến chung vui' },
  opening: { brand: 'AN KHANG BAKERY', tagline: 'KHAI TRƯƠNG', est: '01 · 12 · 2026', slogan: 'Giảm 20% tuần đầu', wifi: 'AnKhang Bakery', pass: 'banhngon', link: 'https://ankhang.vn', handle: '@ankhang.bakery', note: 'Hẹn gặp lại bạn!' },
};
export interface CoField { key: string; label: string; ph?: string; half?: boolean; side: 'front' | 'back' }
export const CO_FIELDS: CoField[] = [
  { key: 'brand', label: 'Tên quán / tên cô dâu & chú rể', side: 'front' },
  { key: 'tagline', label: 'Dòng nhỏ', half: true, side: 'front' },
  { key: 'est', label: 'Năm / ngày', half: true, side: 'front' },
  { key: 'slogan', label: 'Khẩu hiệu / ưu đãi', side: 'front' },
  { key: 'wifi', label: 'Tên wifi', half: true, side: 'back' },
  { key: 'pass', label: 'Mật khẩu wifi', half: true, side: 'back' },
  { key: 'link', label: 'Link cho mã QR (menu, instagram, album…)', side: 'back' },
  { key: 'handle', label: 'Instagram / hashtag', half: true, side: 'back' },
  { key: 'note', label: 'Lời nhắn mặt sau', half: true, side: 'back' },
];

// ---------- màu ----------
export interface CoPalette { id: string; name: string; bg: string; ink: string; accent: string; accent2: string; soft: string }
export const CO_PALETTES: CoPalette[] = [
  { id: 'espresso', name: 'Espresso', bg: '#F4ECE0', ink: '#3B2416', accent: '#8A5A36', accent2: '#C99A5B', soft: '#E6D6C2' },
  { id: 'stout', name: 'Đen bia đen', bg: '#1E1B19', ink: '#F3E9D6', accent: '#D9A441', accent2: '#B5462E', soft: '#2E2925' },
  { id: 'amber', name: 'Vàng hổ phách', bg: '#F7E3B4', ink: '#2B2A3A', accent: '#C9761A', accent2: '#2B2A3A', soft: '#EFD293' },
  { id: 'boba', name: 'Hồng trà sữa', bg: '#FCEBEA', ink: '#5A2E2A', accent: '#E07A86', accent2: '#8B5A3C', soft: '#F7D7D7' },
  { id: 'matcha', name: 'Matcha', bg: '#EEF3E2', ink: '#24391E', accent: '#5E8B3A', accent2: '#B9CF8C', soft: '#DCE7C6' },
  { id: 'red', name: 'Đỏ nhà hàng', bg: '#FFF6EC', ink: '#3A1410', accent: '#B8322A', accent2: '#E0A43A', soft: '#F6E1CB' },
  { id: 'navy', name: 'Navy', bg: '#F3F5FA', ink: '#16233B', accent: '#1F3A68', accent2: '#C8A24A', soft: '#DFE5F0' },
  { id: 'wedding', name: 'Ngà & xanh xô thơm', bg: '#FBF7EF', ink: '#3E4A3C', accent: '#7E9A7A', accent2: '#C2A15A', soft: '#ECE6D6' },
  { id: 'opening', name: 'Đỏ vàng khai trương', bg: '#C62828', ink: '#FFF8E1', accent: '#FFC93C', accent2: '#FFFFFF', soft: '#B71C1C' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#E8F5F3', ink: '#10302C', accent: '#0F766E', accent2: '#F2A541', soft: '#CFE9E4' },
];
export const coPalette = (id: string) => CO_PALETTES.find((p) => p.id === id) || CO_PALETTES[0];

// ---------- font ----------
export interface CoFont { id: string; name: string; family: string; weight: number }
export const CO_FONTS: CoFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald (cao)', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair (cổ điển)', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const coFont = (id: string) => CO_FONTS.find((f) => f.id === id) || CO_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
const HAND = 'Lobster';
export const CO_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Great+Vibes&family=Lobster&display=swap');`;

export function useCoFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-co-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-co-fonts'; link.rel = 'stylesheet';
        link.href = CO_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '700 40px "Oswald"', '800 40px "Playfair Display"', '800 40px "Baloo 2"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '400 40px "Great Vibes"', '400 40px "Lobster"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- chất liệu + spec + mẫu ----------
export type CoMaterial = 'pulp' | 'wood' | 'rubber';
export const CO_MATERIALS: { id: CoMaterial; name: string; note: string; tMm: number }[] = [
  { id: 'pulp', name: 'Giấy bồi dày 1.5mm', note: 'Thấm nước tốt, in 2 mặt đủ màu — rẻ, phổ biến nhất', tMm: 1.5 },
  { id: 'wood', name: 'Gỗ in UV', note: 'Gỗ thông 3mm, vân gỗ lộ ở chỗ không in — mộc, sang', tMm: 3 },
  { id: 'rubber', name: 'Cao su / silicon 1 màu', note: 'Dày 3mm, chống trượt, đúc 1 màu mực trên nền màu', tMm: 3 },
];
export const coMaterial = (id: string) => CO_MATERIALS.find((m) => m.id === id) || CO_MATERIALS[0];
export type CoLayout = 'badge' | 'stamp' | 'minimal' | 'pattern' | 'wedding' | 'opening';
export const CO_LAYOUTS: { id: CoLayout; name: string }[] = [
  { id: 'badge', name: 'Huy hiệu' },
  { id: 'stamp', name: 'Tem bia cổ điển' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'pattern', name: 'Hoạ tiết lặp' },
  { id: 'wedding', name: 'Đám cưới' },
  { id: 'opening', name: 'Khai trương' },
];
export interface CoSpec { purpose: CoPurpose; layout: CoLayout; shape: CoShapeId; palette: string; font: string; material: CoMaterial }
export interface CoTemplate { id: string; name: string; spec: Omit<CoSpec, 'material'> }
const T = (name: string, purpose: CoPurpose, layout: CoLayout, shape: CoShapeId, palette: string, font: string): CoTemplate =>
  ({ id: `${purpose}-${layout}-${shape}-${palette}`, name, spec: { purpose, layout, shape, palette, font } });
export const CO_TEMPLATES: CoTemplate[] = [
  T('Cà phê · huy hiệu', 'cafe', 'badge', 'r90', 'espresso', 'playfair'),
  T('Cà phê · hạt cà phê', 'cafe', 'minimal', 'bean', 'espresso', 'montserrat'),
  T('Cà phê · ly', 'cafe', 'pattern', 'cup', 'teal', 'baloo'),
  T('Bia · tem cổ điển', 'beer', 'stamp', 'r100', 'stout', 'oswald'),
  T('Bia · vuông hổ phách', 'beer', 'stamp', 'sq100', 'amber', 'oswald'),
  T('Trà sữa · hoạ tiết', 'milktea', 'pattern', 'r90', 'boba', 'baloo'),
  T('Trà sữa · chiếc lá matcha', 'milktea', 'minimal', 'leaf', 'matcha', 'baloo'),
  T('Nhà hàng · huy hiệu đỏ', 'restaurant', 'badge', 'sq90', 'red', 'playfair'),
  T('Nhà hàng · navy tối giản', 'restaurant', 'minimal', 'r100', 'navy', 'montserrat'),
  T('Đám cưới · xô thơm', 'wedding', 'wedding', 'r100', 'wedding', 'playfair'),
  T('Đám cưới · vuông', 'wedding', 'wedding', 'sq90', 'wedding', 'playfair'),
  T('Khai trương · đỏ vàng', 'opening', 'opening', 'r90', 'opening', 'montserrat'),
];
export const defaultCoSpec = (): CoSpec => ({ ...CO_TEMPLATES[0].spec, material: 'pulp' });

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number): number {
  if (typeof document === 'undefined') return text.length * 60;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 60;
  mctx.font = `${weight} 100px "${family}"`;
  return mctx.measureText(text).width;
}
const f1 = (n: number) => Math.round(n * 10) / 10;

/** bề ngang vùng an toàn (đơn vị vẽ) cho dải cao độ [y0,y1] */
function widthAt(sf: CoSafe, y0: number, y1: number): number {
  const cy = sf.cy * U, rx = sf.rx * U, ry = sf.ry * U;
  if (y0 < cy - ry || y1 > cy + ry) return 0;
  if (sf.kind === 'rect') return rx * 2;
  const dy = Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy));
  return 2 * rx * Math.sqrt(Math.max(0, 1 - (dy / ry) ** 2));
}
// hộp chữ thực so với tâm dòng cy (baseline = cy + 0.36·s): dấu trên ~0.62·s, chân ~0.32·s
const TOP = 0.66, BOT = 0.34;
/** cỡ chữ lớn nhất ≤ sMax để dòng nằm gọn trong vùng an toàn tại cy */
function fitAt(sf: CoSafe, text: string, family: string, weight: number, cy: number, sMax: number, ls = 0): number {
  if (!text) return sMax;
  const per = measure(text, family, weight) / 100;
  let s = sMax;
  for (let k = 0; k < 6; k++) {
    const avail = widthAt(sf, cy - s * TOP, cy + s * BOT) * 0.98;
    const w = per * s + ls * s * text.length;
    if (w <= avail) return s;
    s = Math.max(1, s * Math.min(0.97, avail / Math.max(1, w)));
  }
  return s;
}
/** 1 dòng; nhỏ quá thì bẻ 2 dòng cân (2 dòng quanh cy) */
function fit2(sf: CoSafe, text: string, family: string, weight: number, cy: number, sMax: number, sMin: number, ls = 0, gap = 1.12): { lines: string[]; size: number } {
  const t = (text || '').trim();
  const s1 = fitAt(sf, t, family, weight, cy, sMax, ls);
  const words = t.split(/\s+/).filter(Boolean);
  if (s1 >= sMin || words.length < 2) return { lines: t ? [t] : [], size: s1 };
  let best: [string, string] = [t, ''], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, family, weight), measure(b, family, weight));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  let s = Math.min(sMax * 0.8, sMax);
  for (let k = 0; k < 6; k++) {
    const g = s * gap;
    const sA = fitAt(sf, best[0], family, weight, cy - g / 2, s, ls), sB = fitAt(sf, best[1], family, weight, cy + g / 2, s, ls);
    const ns = Math.min(sA, sB);
    if (ns >= s * 0.995) break;
    s = ns;
  }
  return s > s1 ? { lines: best, size: s } : { lines: [t], size: s1 };
}

const MIN_S = 14; // 1.4mm — chữ phụ không nhỏ hơn (xưởng in rõ)
/** chữ phụ 1 dòng quá nhỏ: bỏ giãn chữ, vẫn nhỏ thì rút gọn bằng "…" (không để chữ < 1.4mm) */
function rescue(sf: CoSafe, t: string, family: string, weight: number, cy: number, size: number, ls: number): { t: string; size: number; ls: number } {
  if (size >= MIN_S || !t) return { t, size, ls };
  if (ls) { const s2 = fitAt(sf, t, family, weight, cy, MIN_S * 1.25, 0); if (s2 >= MIN_S) return { t, size: s2, ls: 0 }; }
  const w = t.split(/\s+/);
  while (w.length > 1) {
    w.pop();
    const t2 = w.join(' ').replace(/[·,–-]$/, '').trim() + '…';
    const s3 = fitAt(sf, t2, family, weight, cy, MIN_S, 0);
    if (s3 >= MIN_S - 0.05) return { t: t2, size: MIN_S, ls: 0 };
  }
  return { t, size, ls };
}

function Txt({ x, cy, text, size, family, weight, fill, ls = 0, role, gap = 1.12, anchor = 'middle', sf }: {
  x: number; cy: number; text: string | string[]; size: number; family: string; weight: number; fill: string; ls?: number; role: string; gap?: number; anchor?: 'start' | 'middle' | 'end'; sf?: CoSafe;
}) {
  if (sf && typeof text === 'string') { const r = rescue(sf, text, family, weight, cy, size, ls); text = r.t; size = r.size; ls = r.ls; }
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean);
  if (!lines.length) return null;
  const g = size * gap;
  const y0 = cy - ((lines.length - 1) * g) / 2 + size * 0.36;
  return (
    <>
      {lines.map((ln, i) => (
        <text key={i} x={f1(x)} y={f1(y0 + i * g)} textAnchor={anchor} fontFamily={`"${family}"`} fontWeight={weight} fontSize={f1(size)}
          letterSpacing={ls ? f1(ls * size) : undefined} fill={fill} data-role={role}>{ln}</text>
      ))}
    </>
  );
}

// ---------- hình vẽ code ----------
type IconKind = 'bean' | 'mug' | 'boba' | 'bowl' | 'rings' | 'star' | 'hops' | 'leaf';
const ICON_OF: Record<CoPurpose, IconKind> = { cafe: 'bean', beer: 'mug', milktea: 'boba', restaurant: 'bowl', wedding: 'rings', opening: 'star' };

/** icon trong ô s×s tâm (x,y) */
function Icon({ kind, x, y, s, c, c2 }: { kind: IconKind; x: number; y: number; s: number; c: string; c2: string }) {
  const k = s / 100;
  const tr = `translate(${f1(x - s / 2)} ${f1(y - s / 2)}) scale(${f1(k * 1000) / 1000})`;
  switch (kind) {
    case 'bean':
      return (
        <g transform={tr}>
          <ellipse cx={50} cy={50} rx={30} ry={42} fill={c} transform="rotate(-28 50 50)" />
          <path d="M58 13C40 32 62 58 42 87" fill="none" stroke={c2} strokeWidth={7} strokeLinecap="round" transform="rotate(-28 50 50)" />
        </g>
      );
    case 'mug':
      return (
        <g transform={tr}>
          <path d="M18 30H70V86Q70 94 62 94H26Q18 94 18 86Z" fill={c} />
          <path d="M70 42H80Q92 42 92 56V64Q92 78 78 78H70" fill="none" stroke={c} strokeWidth={8} />
          <path d="M14 30Q14 14 30 16Q36 4 50 10Q62 2 72 16Q86 16 76 30Z" fill={c2} />
          <path d="M30 44V82M44 44V82M58 44V82" stroke={c2} strokeWidth={4} strokeLinecap="round" opacity={0.9} />
        </g>
      );
    case 'boba':
      return (
        <g transform={tr}>
          <path d="M57 2L50 30" stroke={c} strokeWidth={7} strokeLinecap="round" />
          <path d="M20 28H80L72 94H28Z" fill={c} />
          <path d="M16 24H84V32H16Z" fill={c} />
          {[[38, 80], [50, 84], [62, 80], [44, 70], [57, 70]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r={5.5} fill={c2} />)}
        </g>
      );
    case 'bowl':
      return (
        <g transform={tr}>
          <path d="M8 50H92Q90 86 50 90Q10 86 8 50Z" fill={c} />
          <path d="M30 94H70" stroke={c} strokeWidth={6} strokeLinecap="round" />
          <path d="M60 46L88 8M70 46L96 14" stroke={c2} strokeWidth={5} strokeLinecap="round" />
          <path d="M28 40Q32 30 28 22M44 40Q48 28 44 18" fill="none" stroke={c} strokeWidth={4} strokeLinecap="round" />
        </g>
      );
    case 'rings':
      return (
        <g transform={tr} fill="none" stroke={c} strokeWidth={7}>
          <circle cx={38} cy={58} r={24} />
          <circle cx={62} cy={58} r={24} stroke={c2} />
          <path d="M30 22L38 10L46 22L38 30Z" fill={c2} stroke="none" />
        </g>
      );
    case 'star':
      return (
        <g transform={tr}>
          <path d="M50 4L61 36H95L67 56L78 90L50 69L22 90L33 56L5 36H39Z" fill={c} />
        </g>
      );
    case 'hops':
      return (
        <g transform={tr}>
          {[[50, 30], [38, 44], [62, 44], [44, 60], [56, 60], [50, 76]].map(([cx, cy], i) => <ellipse key={i} cx={cx} cy={cy} rx={11} ry={9} fill={c} />)}
          <path d="M50 20V6" stroke={c2} strokeWidth={5} strokeLinecap="round" />
        </g>
      );
    case 'leaf':
      return (
        <g transform={tr}>
          <path d="M50 4C70 20 88 44 84 66C80 86 64 96 50 96C36 96 20 86 16 66C12 44 30 20 50 4Z" fill={c} />
          <path d="M50 16V92" stroke={c2} strokeWidth={4} />
        </g>
      );
  }
}

function initials(brand: string) {
  const skip = new Set(['CÔNG', 'TY', 'TNHH', 'QUÁN', 'TIỆM', 'NHÀ', 'HÀNG']);
  const w = (brand || '').toUpperCase().split(/[\s&]+/).filter((x) => x && !skip.has(x));
  return (w.length >= 2 ? w[0][0] + w[1][0] : (w[0] || 'M').slice(0, 2)) || 'M';
}

/** logo khách hoặc icon ngành trong vòng tròn */
function Emblem({ logo, kind, x, y, s, c, c2, ring }: { logo?: string; kind: IconKind; x: number; y: number; s: number; c: string; c2: string; ring?: string }) {
  if (logo) return <image href={logo} x={f1(x - s / 2)} y={f1(y - s / 2)} width={f1(s)} height={f1(s)} preserveAspectRatio="xMidYMid meet" data-role="logo" />;
  return (
    <g data-role="icon">
      {ring && <circle cx={f1(x)} cy={f1(y)} r={f1(s * 0.62)} fill="none" stroke={ring} strokeWidth={f1(s * 0.035)} />}
      <Icon kind={kind} x={x} y={y} s={s} c={c} c2={c2} />
    </g>
  );
}

// ---------- màu thực theo chất liệu ----------
interface Cols { bg: string; ink: string; accent: string; accent2: string; soft: string; disc: string }
function colsOf(spec: CoSpec): Cols {
  const p = coPalette(spec.palette);
  if (spec.material === 'rubber') {
    // cao su đúc: nền = màu cao su, MỌI nét = 1 màu mực
    const base = isLight(p.bg) ? p.accent : p.bg;
    const ink = isLight(base) ? p.ink : (isLight(p.ink) ? p.ink : '#FFFFFF');
    return { bg: base, ink, accent: '', accent2: '', soft: 'none', disc: base };
  }
  if (spec.material === 'wood') {
    // gỗ: không in nền (vân gỗ lộ ra), mực đậm; ô chữ giữa in lót trắng mờ
    const dark = isLight(p.ink) ? '#2A1A10' : p.ink;
    return { bg: 'none', ink: dark, accent: isLight(p.accent) ? '#6B3E1E' : p.accent, accent2: isLight(p.accent2) ? '#3B2416' : p.accent2, soft: 'none', disc: 'rgba(255,255,255,0.78)' };
  }
  return { bg: p.bg, ink: p.ink, accent: p.accent, accent2: p.accent2, soft: p.soft, disc: p.bg };
}
function isLight(hex: string) {
  const h = hex.replace('#', '');
  if (h.length < 6) return true;
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b > 150;
}
// cao su: accent/accent2 rỗng → dùng mực
const A = (c: Cols, k: 'accent' | 'accent2') => c[k] || c.ink;
/** màu chữ đặt TRÊN một mảng màu `fill` (dải băng, pill) */
function onFill(spec: CoSpec, c: Cols, fill: string) {
  if (spec.material === 'rubber') return c.bg;
  if (spec.material === 'wood') return '#FFFFFF';
  const dark = isLight(c.ink) ? (c.bg !== 'none' && !isLight(c.bg) ? c.bg : '#1E1B19') : c.ink;
  return isLight(fill) ? dark : '#FFFFFF';
}
/** QR luôn ô TỐI trên nền SÁNG (quét được) */
function qrCols(spec: CoSpec, c: Cols): { bg: string; fg: string } {
  if (spec.material === 'rubber') return isLight(c.bg) ? { bg: c.bg, fg: c.ink } : { bg: c.ink, fg: c.bg };
  const fg = isLight(c.ink) ? (c.bg !== 'none' && !isLight(c.bg) ? c.bg : '#141414') : c.ink;
  return { bg: '#FFFFFF', fg };
}

// ---------- mặt trước ----------
function front(spec: CoSpec, data: CoData, logo?: string): ReactNode {
  const sh = coShape(spec.shape), sf = sh.safe, f = coFont(spec.font), c = colsOf(spec);
  const W = sh.wMm * U, H = sh.hMm * U;
  const cx = sf.cx * U, cy = sf.cy * U, rx = sf.rx * U, ry = sf.ry * U;
  const R = Math.min(rx, ry);
  const disp = f.family, dw = f.weight;
  const icon = ICON_OF[spec.purpose];
  const out: ReactNode[] = [];
  const bgRect = c.bg !== 'none' ? <rect key="bg" x={-200} y={-200} width={W + 400} height={H + 400} fill={c.bg} /> : null;
  // viền trang trí theo đúng đường cắt + 1 vòng thu nhỏ bên trong
  const border = (w: number, color: string, k: number, key: string, dash?: string) => (
    <path key={key} d={sh.d} transform={`translate(${f1(sh.wMm / 2 * U)} ${f1(sh.hMm / 2 * U)}) scale(${f1(U * k * 1000) / 1000}) translate(${-sh.wMm / 2} ${-sh.hMm / 2})`}
      fill="none" stroke={color} strokeWidth={f1(w / (U * k))} strokeDasharray={dash} />
  );

  // vùng chữ nằm TRONG vòng viền trang trí thu nhỏ k (cách vòng 2mm)
  const inRing = (k: number): CoSafe => ({ ...sf, rx: Math.max(5, Math.min(sf.rx, sf.rx + IN - (1 - k) * sh.wMm / 2 - 2.5)), ry: Math.max(5, Math.min(sf.ry, sf.ry + IN - (1 - k) * sh.hMm / 2 - 2.5)) });
  if (spec.layout === 'badge') {
    const sf = inRing(0.86);
    out.push(border(16, A(c, 'accent'), 1, 'b1'));
    out.push(border(5, A(c, 'accent'), 0.86, 'b2'));
    const yEst = cy - ry * 0.66, yIc = cy - ry * 0.3, yBrand = cy + ry * 0.12, ySlo = cy + ry * 0.4, yTag = cy + ry * 0.62;
    const sEst = fitAt(sf, data.est || '', BODY, 800, yEst, R * 0.085, 0.18);
    out.push(<Txt key="est" x={cx} cy={yEst} text={data.est || ''} size={sEst} family={BODY} weight={800} fill={A(c, 'accent')} ls={0.18} sf={sf} role="est" />);
    out.push(<Emblem key="em" logo={logo} kind={icon} x={cx} y={yIc} s={R * 0.42} c={c.ink} c2={A(c, 'accent2')} />);
    const b = fit2(sf, (data.brand || '').toUpperCase(), disp, dw, yBrand, R * 0.2, R * 0.12, 0.02);
    out.push(<Txt key="brand" x={cx} cy={yBrand} text={b.lines} size={b.size} family={disp} weight={dw} fill={c.ink} ls={0.02} role="brand" />);
    const sSlo = fitAt(sf, data.slogan || '', HAND, 400, ySlo, R * 0.12);
    out.push(<Txt key="slo" x={cx} cy={ySlo} text={data.slogan || ''} size={sSlo} family={HAND} weight={400} fill={A(c, 'accent')} sf={sf} role="slogan" />);
    const sTag = fitAt(sf, data.tagline || '', BODY, 600, yTag, R * 0.075, 0.12);
    out.push(<Txt key="tag" x={cx} cy={yTag} text={data.tagline || ''} size={sTag} family={BODY} weight={600} fill={c.ink} ls={0.12} sf={sf} role="tagline" />);
    // 2 ngôi sao 2 bên năm
    const sw = measure(data.est || '', BODY, 800) / 100 * sEst + 0.18 * sEst * (data.est || '').length;
    for (const sgn of [-1, 1]) out.push(<Icon key={`st${sgn}`} kind="star" x={cx + sgn * (sw / 2 + sEst * 1.1)} y={yEst} s={sEst * 0.9} c={A(c, 'accent')} c2={A(c, 'accent')} />);
  } else if (spec.layout === 'stamp') {
    const sf = inRing(0.86);
    out.push(border(26, A(c, 'accent'), 1, 'b1'));
    out.push(border(6, c.ink, 0.9, 'b2'));
    out.push(border(4, c.ink, 0.86, 'b3', '10 8'));
    const yEst = cy - ry * 0.6, yBrand = cy - ry * 0.12, yRib = cy + ry * 0.3, yTag = cy + ry * 0.62;
    const sEst = fitAt(sf, data.est || '', disp, dw, yEst, R * 0.1, 0.25);
    out.push(<Txt key="est" x={cx} cy={yEst} text={(data.est || '').toUpperCase()} size={sEst} family={disp} weight={dw} fill={A(c, 'accent')} ls={0.25} sf={sf} role="est" />);
    out.push(<Icon key="hop" kind={spec.purpose === 'beer' ? 'hops' : icon} x={cx} y={yEst - R * 0.2} s={R * 0.16} c={A(c, 'accent')} c2={c.ink} />);
    const b = fit2(sf, (data.brand || '').toUpperCase(), disp, dw, yBrand, R * 0.26, R * 0.15, 0.01, 1.02);
    out.push(<Txt key="brand" x={cx} cy={yBrand} text={b.lines} size={b.size} family={disp} weight={dw} fill={c.ink} ls={0.01} role="brand" gap={1.02} />);
    // dải băng rôn
    const rw = widthAt(sf, yRib - R * 0.1, yRib + R * 0.1) * 0.96, rh = R * 0.2;
    const rb = A(c, 'accent');
    out.push(<path key="rib" d={`M${f1(cx - rw / 2)} ${f1(yRib - rh / 2)}H${f1(cx + rw / 2)}L${f1(cx + rw / 2 - rh * 0.35)} ${f1(yRib)}L${f1(cx + rw / 2)} ${f1(yRib + rh / 2)}H${f1(cx - rw / 2)}L${f1(cx - rw / 2 + rh * 0.35)} ${f1(yRib)}Z`} fill={rb} />);
    const ribTxt = onFill(spec, c, rb);
    const sSlo = Math.min(fitAt(sf, (data.slogan || '').toUpperCase(), BODY, 800, yRib, rh * 0.5, 0.06), (rw - rh * 1.2) / Math.max(1, measure((data.slogan || '').toUpperCase(), BODY, 800) / 100 + 0.06 * (data.slogan || '').length));
    out.push(<Txt key="slo" x={cx} cy={yRib} text={(data.slogan || '').toUpperCase()} size={sSlo} family={BODY} weight={800} fill={ribTxt} ls={0.06} role="slogan" />);
    const sTag = fitAt(sf, data.tagline || '', BODY, 800, yTag, R * 0.085, 0.16);
    out.push(<Txt key="tag" x={cx} cy={yTag} text={data.tagline || ''} size={sTag} family={BODY} weight={800} fill={c.ink} ls={0.16} sf={sf} role="tagline" />);
  } else if (spec.layout === 'minimal') {
    const sf = inRing(0.93);
    out.push(border(8, A(c, 'accent'), 0.93, 'b1'));
    const yIc = cy - ry * 0.3, yBrand = cy + ry * 0.2, yTag = cy + ry * 0.46, yEst = cy + ry * 0.66;
    const emS = R * 0.5;
    if (!logo) out.push(<circle key="disc" cx={f1(cx)} cy={f1(yIc)} r={f1(emS * 0.66)} fill={A(c, 'accent')} />);
    out.push(<Emblem key="em" logo={logo} kind={icon} x={cx} y={yIc} s={logo ? emS : emS * 0.7} c={spec.material === 'rubber' ? (c.bg) : (c.bg === 'none' ? '#FFFFFF' : c.bg)} c2={spec.material === 'rubber' ? c.ink : A(c, 'accent2')} />);
    const b = fit2(sf, data.brand || '', disp, dw, yBrand, R * 0.17, R * 0.11, 0.01);
    out.push(<Txt key="brand" x={cx} cy={yBrand} text={b.lines} size={b.size} family={disp} weight={dw} fill={c.ink} ls={0.01} role="brand" />);
    const sTag = fitAt(sf, data.tagline || '', BODY, 600, yTag, R * 0.075, 0.14);
    out.push(<Txt key="tag" x={cx} cy={yTag} text={data.tagline || ''} size={sTag} family={BODY} weight={600} fill={A(c, 'accent')} ls={0.14} sf={sf} role="tagline" />);
    const sEst = fitAt(sf, data.est || '', BODY, 600, yEst, R * 0.06, 0.2);
    out.push(<Txt key="est" x={cx} cy={yEst} text={data.est || ''} size={sEst} family={BODY} weight={600} fill={c.ink} ls={0.2} sf={sf} role="est" />);
  } else if (spec.layout === 'pattern') {
    // nền hoạ tiết lặp + đĩa giữa
    const pc = spec.material === 'pulp' ? A(c, 'accent') : c.ink;
    if (spec.material === 'pulp') out.push(<rect key="pbg" x={-200} y={-200} width={W + 400} height={H + 400} fill={c.soft} />);
    const step = Math.max(R * 0.34, 125);
    const tiles: ReactNode[] = [];
    for (let yy = -step, r = 0; yy < H + step; yy += step * 0.86, r++) {
      for (let xx = -step + (r % 2) * step / 2; xx < W + step; xx += step) {
        tiles.push(<g key={`${r}-${f1(xx)}`} transform={`rotate(${(r * 37 + Math.round(xx)) % 40 - 20} ${f1(xx)} ${f1(yy)})`}><Icon kind={icon} x={xx} y={yy} s={step * 0.42} c={pc} c2={pc} /></g>);
      }
    }
    out.push(<g key="tiles" opacity={spec.material === 'pulp' ? 0.55 : 1}>{tiles}</g>);
    const dfill = c.disc;
    const isRect = sf.kind === 'rect';
    const drx = rx * (isRect ? 0.9 : 0.9), dry = ry * (isRect ? 0.62 : 0.68);
    if (isRect) out.push(<rect key="disc" x={f1(cx - drx)} y={f1(cy - dry)} width={f1(drx * 2)} height={f1(dry * 2)} rx={f1(R * 0.18)} fill={dfill} />);
    else {
      out.push(<ellipse key="disc" cx={f1(cx)} cy={f1(cy)} rx={f1(drx)} ry={f1(dry)} fill={dfill} />);
      out.push(<ellipse key="ring" cx={f1(cx)} cy={f1(cy)} rx={f1(drx - R * 0.05)} ry={f1(dry - R * 0.05)} fill="none" stroke={A(c, 'accent')} strokeWidth={f1(R * 0.02)} />);
    }
    // vùng chữ = đĩa giữa
    const pad = R * 0.09;
    const inner: CoSafe = { kind: sf.kind, cx: sf.cx, cy: sf.cy, rx: (drx - pad) / U, ry: (dry - pad) / U };
    const iry = inner.ry * U;
    const yTag = cy - iry * 0.5, yBrand = cy + iry * 0.02, ySlo = cy + iry * 0.52;
    const sTag = fitAt(inner, data.tagline || '', BODY, 800, yTag, R * 0.07, 0.12);
    out.push(<Txt key="tag" x={cx} cy={yTag} text={data.tagline || ''} size={sTag} family={BODY} weight={800} fill={A(c, 'accent')} ls={0.12} sf={inner} role="tagline" />);
    const b = fit2(inner, data.brand || '', disp, dw, yBrand, R * 0.2, R * 0.12, 0.01);
    out.push(<Txt key="brand" x={cx} cy={yBrand} text={b.lines} size={b.size} family={disp} weight={dw} fill={c.ink} ls={0.01} role="brand" />);
    const sSlo = fitAt(inner, data.slogan || '', HAND, 400, ySlo, R * 0.11);
    out.push(<Txt key="slo" x={cx} cy={ySlo} text={data.slogan || ''} size={sSlo} family={HAND} weight={400} fill={c.ink} sf={inner} role="slogan" />);
  } else if (spec.layout === 'wedding') {
    const sf = inRing(0.9);
    out.push(border(5, A(c, 'accent2'), 0.94, 'b1'));
    out.push(border(2.5, A(c, 'accent2'), 0.9, 'b2'));
    const names = (data.brand || '').split('&').map((x) => x.trim()).filter(Boolean);
    const yTag = cy - ry * 0.62, yN1 = cy - ry * 0.27, yAmp = cy + ry * 0.0, yN2 = cy + ry * 0.25, yDate = cy + ry * 0.5;
    const sTag = fitAt(sf, data.tagline || '', BODY, 600, yTag, R * 0.07, 0.3);
    out.push(<Txt key="tag" x={cx} cy={yTag} text={data.tagline || ''} size={sTag} family={BODY} weight={600} fill={A(c, 'accent')} ls={0.3} sf={sf} role="tagline" />);
    if (names.length >= 2) {
      const s = Math.min(fitAt(sf, names[0], SCRIPT, 400, yN1, R * 0.27), fitAt(sf, names[1], SCRIPT, 400, yN2, R * 0.27));
      out.push(<Txt key="n1" x={cx} cy={yN1} text={names[0]} size={s} family={SCRIPT} weight={400} fill={c.ink} role="brand" />);
      out.push(<Txt key="amp" x={cx} cy={yAmp} text="&" size={R * 0.13} family={'Playfair Display'} weight={800} fill={A(c, 'accent2')} role="amp" />);
      out.push(<Txt key="n2" x={cx} cy={yN2} text={names[1]} size={s} family={SCRIPT} weight={400} fill={c.ink} role="brand" />);
    } else {
      const b = fit2(sf, data.brand || '', SCRIPT, 400, cy, R * 0.28, R * 0.16);
      out.push(<Txt key="brand" x={cx} cy={cy} text={b.lines} size={b.size} family={SCRIPT} weight={400} fill={c.ink} role="brand" />);
    }
    const sDate = fitAt(sf, data.est || '', disp, dw, yDate, R * 0.085, 0.2);
    out.push(<Txt key="date" x={cx} cy={yDate} text={data.est || ''} size={sDate} family={disp} weight={dw} fill={A(c, 'accent')} ls={0.2} sf={sf} role="est" />);
    // nhánh nguyệt quế dưới
    const yL = cy + ry * 0.72, lw = Math.min(widthAt(sf, yL - R * 0.08, yL + R * 0.08) * 0.42, R * 0.6);
    const leaves: ReactNode[] = [];
    for (const sgn of [-1, 1]) {
      leaves.push(<path key={`st${sgn}`} d={`M${f1(cx)} ${f1(yL)}Q${f1(cx + sgn * lw * 0.5)} ${f1(yL + R * 0.05)} ${f1(cx + sgn * lw)} ${f1(yL - R * 0.04)}`} fill="none" stroke={A(c, 'accent')} strokeWidth={f1(R * 0.012)} />);
      for (let i = 1; i <= 5; i++) {
        const t = i / 6, lx = cx + sgn * lw * t, ly = yL + R * 0.05 * 4 * t * (1 - t) * 0.9 - R * 0.04 * t * t;
        leaves.push(<ellipse key={`l${sgn}${i}`} cx={f1(lx)} cy={f1(ly - R * 0.025)} rx={f1(R * 0.028)} ry={f1(R * 0.012)} transform={`rotate(${sgn * -35} ${f1(lx)} ${f1(ly - R * 0.025)})`} fill={A(c, 'accent')} />);
        leaves.push(<ellipse key={`m${sgn}${i}`} cx={f1(lx)} cy={f1(ly + R * 0.022)} rx={f1(R * 0.028)} ry={f1(R * 0.012)} transform={`rotate(${sgn * 35} ${f1(lx)} ${f1(ly + R * 0.022)})`} fill={A(c, 'accent')} />);
      }
    }
    out.push(<g key="laurel">{leaves}</g>);
  } else { // opening
    out.push(border(14, A(c, 'accent'), 1, 'b1'));
    // pháo giấy
    const conf: ReactNode[] = [];
    let sd = 11; const rnd = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 46; i++) {
      const x = rnd() * W, y = rnd() * H, a = rnd() * 180, w = R * (0.02 + rnd() * 0.025);
      conf.push(<rect key={i} x={f1(x)} y={f1(y)} width={f1(w)} height={f1(w * 2.2)} transform={`rotate(${f1(a)} ${f1(x)} ${f1(y)})`} fill={i % 3 === 0 ? A(c, 'accent2') : A(c, 'accent')} opacity={0.85} />);
    }
    out.push(<g key="conf">{conf}</g>);
    const yTag = cy - ry * 0.42, yBrand = cy + ry * 0.04, ySlo = cy + ry * 0.38, yEst = cy + ry * 0.64;
    // đĩa nền giữa che pháo giấy cho chữ dễ đọc
    out.push(<ellipse key="pad" cx={f1(cx)} cy={f1(cy + ry * 0.1)} rx={f1(rx * 0.84)} ry={f1(ry * 0.74)} fill={c.disc} />);
    const sTag = fitAt(sf, (data.tagline || '').toUpperCase(), disp, dw, yTag, R * 0.2, 0.02);
    out.push(<Txt key="tag" x={cx} cy={yTag} text={(data.tagline || '').toUpperCase()} size={sTag} family={disp} weight={dw} fill={A(c, 'accent')} ls={0.02} sf={sf} role="tagline" />);
    const b = fit2(sf, (data.brand || '').toUpperCase(), BODY, 800, yBrand, R * 0.12, R * 0.08, 0.04);
    out.push(<Txt key="brand" x={cx} cy={yBrand} text={b.lines} size={b.size} family={BODY} weight={800} fill={c.ink} ls={0.04} role="brand" />);
    // pill ưu đãi
    const sSlo0 = fitAt(sf, data.slogan || '', BODY, 800, ySlo, R * 0.085);
    const pw = measure(data.slogan || '', BODY, 800) / 100 * sSlo0 + sSlo0 * 1.6, ph = sSlo0 * 1.7;
    const pwMax = widthAt(sf, ySlo - ph / 2, ySlo + ph / 2) * 0.96;
    const sSlo = pw > pwMax ? sSlo0 * (pwMax / pw) : sSlo0;
    const pw2 = Math.min(pw, pwMax);
    out.push(<rect key="pill" x={f1(cx - pw2 / 2)} y={f1(ySlo - ph / 2)} width={f1(pw2)} height={f1(ph)} rx={f1(ph / 2)} fill={A(c, 'accent')} />);
    out.push(<Txt key="slo" x={cx} cy={ySlo} text={data.slogan || ''} size={sSlo} family={BODY} weight={800} fill={onFill(spec, c, A(c, 'accent'))} role="slogan" />);
    const sEst = fitAt(sf, data.est || '', BODY, 600, yEst, R * 0.065, 0.2);
    out.push(<Txt key="est" x={cx} cy={yEst} text={data.est || ''} size={sEst} family={BODY} weight={600} fill={c.ink} ls={0.2} sf={sf} role="est" />);
  }
  return <>{bgRect}{out}</>;
}

// ---------- mặt sau ----------
function back(spec: CoSpec, data: CoData): ReactNode {
  const sh = coShape(spec.shape), sf = sh.safe, f = coFont(spec.font), c = colsOf(spec);
  const W = sh.wMm * U, H = sh.hMm * U;
  const cx = sf.cx * U, cy = sf.cy * U, rx = sf.rx * U, ry = sf.ry * U;
  const R = Math.min(rx, ry);
  const out: ReactNode[] = [];
  if (c.bg !== 'none') out.push(<rect key="bg" x={-200} y={-200} width={W + 400} height={H + 400} fill={c.bg} />);
  const wedding = spec.purpose === 'wedding';
  const hasWifi = !wedding && !!(data.wifi || '').trim();
  const qrText = (data.link || '').trim();
  // QR
  let qrSide = 0, yQr = 0;
  if (qrText) {
    yQr = cy + ry * (hasWifi ? 0.14 : 0.1);
    qrSide = R * (hasWifi ? 0.6 : 0.66);
    for (let k = 0; k < 10 && widthAt(sf, yQr - qrSide / 2 - R * 0.04, yQr + qrSide / 2 + R * 0.04) < qrSide + R * 0.08; k++) qrSide *= 0.92;
  }
  const yBrand = cy - ry * 0.74;
  const sb = fitAt(sf, (data.brand || '').toUpperCase(), f.family, f.weight, yBrand, R * 0.085, 0.06);
  if (!wedding) out.push(<Txt key="brand" x={cx} cy={yBrand} text={(data.brand || '').toUpperCase()} size={sb} family={f.family} weight={f.weight} fill={A(c, 'accent')} ls={0.06} sf={sf} role="brand-back" />);
  if (wedding) {
    const yThank = cy - ry * 0.6;
    const t = fit2(sf, data.note || 'Cảm ơn bạn đã đến chung vui', SCRIPT, 400, yThank, R * 0.16, R * 0.11);
    out.push(<Txt key="thank" x={cx} cy={yThank} text={t.lines} size={t.size} family={SCRIPT} weight={400} fill={c.ink} role="note" gap={1.0} />);
  } else if (hasWifi) {
    const yW = cy - ry * 0.5, yP = cy - ry * 0.33;
    const wl = `WIFI · ${data.wifi}`;
    const sw = fitAt(sf, wl, BODY, 800, yW, R * 0.085);
    out.push(<Txt key="wifi" x={cx} cy={yW} text={wl} size={sw} family={BODY} weight={800} fill={c.ink} sf={sf} role="wifi" />);
    const pl = `Mật khẩu: ${data.pass || ''}`;
    const sp = fitAt(sf, pl, BODY, 600, yP, R * 0.075);
    out.push(<Txt key="pass" x={cx} cy={yP} text={pl} size={sp} family={BODY} weight={600} fill={c.ink} sf={sf} role="pass" />);
  } else {
    const yN = cy - ry * 0.42;
    const n = fit2(sf, data.note || '', HAND, 400, yN, R * 0.12, R * 0.08);
    out.push(<Txt key="note" x={cx} cy={yN} text={n.lines} size={n.size} family={HAND} weight={400} fill={c.ink} role="note" />);
  }
  if (qrText) {
    const q = qrPath(qrText);
    const pad = qrSide * 0.06;
    const qc = qrCols(spec, c), qbg = qc.bg;
    out.push(
      <g key="qr" data-role="qr">
        <rect x={f1(cx - qrSide / 2 - pad)} y={f1(yQr - qrSide / 2 - pad)} width={f1(qrSide + pad * 2)} height={f1(qrSide + pad * 2)} rx={f1(pad)} fill={qbg} />
        <path d={q.d} transform={`translate(${f1(cx - qrSide / 2)} ${f1(yQr - qrSide / 2)}) scale(${f1((qrSide / q.n) * 1000) / 1000})`} fill={qc.fg} />
      </g>,
    );
    const yL = yQr + qrSide / 2 + pad + R * 0.1;
    const lab = wedding ? 'Quét xem album cưới' : spec.purpose === 'restaurant' ? 'Quét xem menu' : 'Quét để theo dõi tụi mình';
    const sl = fitAt(sf, lab, BODY, 600, yL, R * 0.06);
    out.push(<Txt key="qrl" x={cx} cy={yL} text={lab} size={sl} family={BODY} weight={600} fill={c.ink} sf={sf} role="qr-label" />);
  }
  const yH = cy + ry * 0.8;
  const hTxt = wedding ? `${data.handle || ''}${data.est ? ' · ' + data.est : ''}` : (data.handle || '');
  const sh2 = fitAt(sf, hTxt, BODY, 800, yH, R * 0.075, 0.04);
  out.push(<Txt key="handle" x={cx} cy={yH} text={hTxt} size={sh2} family={BODY} weight={800} fill={A(c, 'accent')} ls={0.04} sf={sf} role="handle" />);
  if (!wedding && hasWifi && (data.note || '').trim() && !qrText) {
    // không có QR: lời nhắn vào giữa
    const yN = cy + ry * 0.2;
    const n = fit2(sf, data.note || '', HAND, 400, yN, R * 0.12, R * 0.08);
    out.push(<Txt key="note" x={cx} cy={yN} text={n.lines} size={n.size} family={HAND} weight={400} fill={c.ink} role="note" />);
  }
  return <>{out}</>;
}

/**
 * 1 lót ly. side = front | back. bleed = nền tràn 2mm ngoài đường cắt (file in).
 * Không bleed: đúng khung thành phẩm, ngoài đường cắt trong suốt (xem trước, texture 3D).
 */
export function CoasterSvg({ spec, data, logo, side = 'front', bleed = false, cut = false, style, nested }: {
  spec: CoSpec; data: CoData; logo?: string; side?: 'front' | 'back'; bleed?: boolean; cut?: boolean; style?: CSSProperties; nested?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const sh = coShape(spec.shape);
  const W = sh.wMm * U, H = sh.hMm * U, b = bleed ? CO_BLEED_MM * U : 0;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
      width={nested ? W + b * 2 : undefined} height={nested ? H + b * 2 : undefined} style={style} data-shape={sh.id} data-side={side}>
      <defs>
        <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-b - 10} y={-b - 10} width={W + b * 2 + 20} height={H + b * 2 + 20}>
          <path d={sh.d} transform={`scale(${U})`} fill="#FFFFFF" stroke={bleed ? '#FFFFFF' : 'none'} strokeWidth={bleed ? CO_BLEED_MM * 2 : 0} strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#${uid}-m)`}>
        <g id="Content">{side === 'front' ? front(spec, data, logo) : back(spec, data)}</g>
      </g>
      {cut && <path id="CutPreview" d={sh.d} transform={`scale(${U})`} fill="none" stroke={CUTCONTOUR} strokeWidth={0.35} strokeDasharray="1.6 1" />}
    </svg>
  );
}

// ---------- tờ in: lưới, lớp In + CutContour; mặt sau xếp NGƯỢC cột để in 2 mặt khớp ----------
export const CO_SHEET = { wMm: 430, hMm: 610, marginMm: 10, gapMm: 4 };
export function coSheetFit(shape: CoShapeId) {
  const sz = coShape(shape);
  const g = CO_SHEET.gapMm;
  const cols = Math.max(1, Math.floor((CO_SHEET.wMm - CO_SHEET.marginMm * 2 + g) / (sz.wMm + g)));
  const rows = Math.max(1, Math.floor((CO_SHEET.hMm - CO_SHEET.marginMm * 2 - 8 + g) / (sz.hMm + g)));
  const x0 = (CO_SHEET.wMm - (cols * sz.wMm + (cols - 1) * g)) / 2;
  const y0 = (CO_SHEET.hMm - 8 - (rows * sz.hMm + (rows - 1) * g)) / 2;
  return { cols, rows, per: cols * rows, x0, y0, sz };
}

export function CoasterSheetSvg({ spec, data, logo, side = 'front', style }: { spec: CoSpec; data: CoData; logo?: string; side?: 'front' | 'back'; style?: CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const fit = coSheetFit(spec.shape);
  const { sz } = fit;
  const W = CO_SHEET.wMm * U, H = CO_SHEET.hMm * U, b = CO_BLEED_MM * U;
  const cells = Array.from({ length: fit.per }, (_, i) => {
    let col = i % fit.cols;
    if (side === 'back') col = fit.cols - 1 - col; // lật giấy theo chiều ngang → cột ngược
    const x = (fit.x0 + col * (sz.wMm + CO_SHEET.gapMm)) * U, y = (fit.y0 + Math.floor(i / fit.cols) * (sz.hMm + CO_SHEET.gapMm)) * U;
    return `translate(${f1(x)} ${f1(y)})`;
  });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${CO_SHEET.wMm}mm`} height={`${CO_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" style={style} data-count={fit.per} data-side={side}>
      <defs>
        <g id={`${u}-co`} data-coaster-def="1"><CoasterSvg spec={spec} data={data} logo={logo} side={side} bleed nested /></g>
        <path id={`${u}-cut`} d={sz.d} />
      </defs>
      <rect width={W} height={H} fill="#FFFFFF" />
      <g id="In">
        {cells.map((t, i) => <use key={i} href={`#${u}-co`} x={-b} y={-b} transform={t} />)}
      </g>
      {side === 'front' && (
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={0.1}>
          <title>CutContour</title>
          {cells.map((t, i) => <use key={i} href={`#${u}-cut`} transform={`${t} scale(${U})`} />)}
        </g>
      )}
      {/* dấu đăng ký 4 góc để canh 2 mặt */}
      <g id="Reg" stroke="#000" strokeWidth={3} fill="none">
        {[[60, 60], [W - 60, 60], [60, H - 120], [W - 60, H - 120]].map(([x, y], i) => (
          <g key={i}><circle cx={x} cy={y} r={22} /><path d={`M${x - 36} ${y}H${x + 36}M${x} ${y - 36}V${y + 36}`} /></g>
        ))}
      </g>
      <text x={CO_SHEET.marginMm * U + 80} y={H - 40} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={42} fill="#6B7280">
        {`Mivy · lót ly ${sz.name} · mặt ${side === 'front' ? 'TRƯỚC (có CutContour)' : 'SAU (lật ngang giấy, cột đảo ngược)'} · ${fit.per} cái/tờ ${CO_SHEET.wMm / 10}×${CO_SHEET.hMm / 10}cm · lề xén ${CO_BLEED_MM}mm`}
      </text>
    </svg>
  );
}

export { initials };

/** màu nền thật của lót ly (cao su: màu đúc) — dùng cho cạnh khối 3D */
export const coBaseColor = (spec: CoSpec) => { const c = colsOf(spec); return c.bg === 'none' ? '#D6AC7A' : c.bg; };
export const coAccent = (spec: CoSpec) => coPalette(spec.palette).accent;
