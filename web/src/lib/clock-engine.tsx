'use client';
// Đồng hồ in logo: mặt số (dial) vẽ 100% bằng code, đơn vị mm, tâm (0,0).
// Bố cục × bảng màu × font → nhiều mẫu. Chữ đo thật bằng canvas, chữ chạy vòng = mỗi ký tự 1 <text> xoay (outline được).
// File in: mặt số đúng khổ + lề xén 3mm, lớp In + CutContour (đường cắt) + Khoan (lỗ trục kim Ø8 ở tâm).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { coverRect, type CVPhoto } from './canvas-engine';

// ---------- khổ ----------
export type ClockShape = 'round' | 'square';
export interface ClockSize { id: string; name: string; shape: ClockShape; d: number; rim: number; desk?: boolean; depth: number }
export const CLOCK_SIZES: ClockSize[] = [
  { id: 'r25', name: 'Treo tường tròn Ø25', shape: 'round', d: 250, rim: 13, depth: 38 },
  { id: 'r30', name: 'Treo tường tròn Ø30', shape: 'round', d: 300, rim: 15, depth: 42 },
  { id: 'r35', name: 'Treo tường tròn Ø35', shape: 'round', d: 350, rim: 16, depth: 45 },
  { id: 's30', name: 'Treo tường vuông 30×30', shape: 'square', d: 300, rim: 16, depth: 42 },
  { id: 'desk15', name: 'Để bàn 15×15', shape: 'square', d: 150, rim: 10, desk: true, depth: 38 },
];
export const clockSize = (id: string) => CLOCK_SIZES.find((s) => s.id === id) || CLOCK_SIZES[1];
export const BLEED = 3;
/** đường kính / cạnh mặt số in (phần nhìn thấy trong viền) */
export const dialOf = (s: ClockSize) => s.d - s.rim * 2;

export type ClockFrame = 'black' | 'white' | 'silver' | 'gold' | 'wood' | 'walnut';
export const CLOCK_FRAMES: { id: ClockFrame; name: string; color: string; kind: 'plastic' | 'metal' | 'wood' }[] = [
  { id: 'black', name: 'Nhựa đen', color: '#1C1D20', kind: 'plastic' },
  { id: 'white', name: 'Nhựa trắng', color: '#F2F1ED', kind: 'plastic' },
  { id: 'silver', name: 'Kim loại bạc', color: '#C9CDD3', kind: 'metal' },
  { id: 'gold', name: 'Kim loại vàng', color: '#C9A35C', kind: 'metal' },
  { id: 'wood', name: 'Gỗ sồi', color: '#B98A5A', kind: 'wood' },
  { id: 'walnut', name: 'Gỗ óc chó', color: '#5E3E2A', kind: 'wood' },
];
export const clockFrame = (id: string) => CLOCK_FRAMES.find((f) => f.id === id) || CLOCK_FRAMES[0];

export type ClockHands = 'classic' | 'modern' | 'sweep';
export const CLOCK_HANDS: { id: ClockHands; name: string }[] = [
  { id: 'classic', name: 'Cổ điển (lá)' },
  { id: 'modern', name: 'Hiện đại (thẳng)' },
  { id: 'sweep', name: 'Mảnh + kim giây đỏ' },
];

// ---------- font ----------
export interface ClockFont { id: string; name: string; family: string; weight: number }
export const CLOCK_FONTS: ClockFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const clockFont = (id: string) => CLOCK_FONTS.find((f) => f.id === id) || CLOCK_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
export const CLOCK_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Oswald:wght@700&family=Great+Vibes&display=swap');`;

export function useClockFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-clock-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-clock-fonts'; link.rel = 'stylesheet';
        link.href = CLOCK_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '800 40px "Playfair Display"', '700 40px "Cormorant Garamond"', '700 40px "Oswald"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '400 40px "Great Vibes"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 XIV')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface ClockPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; hand: string; second: string }
export const CLOCK_PALETTES: ClockPalette[] = [
  { id: 'navy', name: 'Navy vàng', bg: '#16243D', bg2: '#22375C', ink: '#F4EFE3', sub: '#C9D3E6', accent: '#C8A24A', hand: '#F4EFE3', second: '#E0533D' },
  { id: 'white', name: 'Trắng tối giản', bg: '#FAFAF7', bg2: '#ECEAE4', ink: '#1D2129', sub: '#5B6170', accent: '#1D2129', hand: '#1D2129', second: '#D7263D' },
  { id: 'ivory', name: 'Ngà cổ điển', bg: '#F4ECDC', bg2: '#E6D7B8', ink: '#2C2418', sub: '#6B5B43', accent: '#A8823A', hand: '#2C2418', second: '#A8823A' },
  { id: 'black', name: 'Đen vàng', bg: '#141518', bg2: '#25272D', ink: '#F2F2F0', sub: '#A9ADB5', accent: '#E8B04B', hand: '#F2F2F0', second: '#E8B04B' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0F5E5A', bg2: '#16807A', ink: '#FFFFFF', sub: '#CFEAE6', accent: '#F2C14E', hand: '#FFFFFF', second: '#F2C14E' },
  { id: 'red', name: 'Đỏ Tết', bg: '#B3161B', bg2: '#7E0D12', ink: '#F7D27A', sub: '#FCE7B0', accent: '#F7D27A', hand: '#F7D27A', second: '#FFFFFF' },
  { id: 'pastel', name: 'Hồng pastel', bg: '#FCE9E6', bg2: '#F4CFC9', ink: '#5A3E5D', sub: '#86698A', accent: '#E58FA0', hand: '#5A3E5D', second: '#E58FA0' },
  { id: 'cafe', name: 'Cà phê sữa', bg: '#F3E3CB', bg2: '#E3C59C', ink: '#3B2416', sub: '#7A5236', accent: '#C8612B', hand: '#3B2416', second: '#C8612B' },
  { id: 'walnut', name: 'Nâu gỗ', bg: '#3B2A20', bg2: '#5A4030', ink: '#F1E4CC', sub: '#CDB898', accent: '#D4A55A', hand: '#F1E4CC', second: '#D4A55A' },
  { id: 'forest', name: 'Xanh rêu', bg: '#E8EFE6', bg2: '#CFDDCA', ink: '#1F3A2B', sub: '#4F6B57', accent: '#2F6B47', hand: '#1F3A2B', second: '#C8612B' },
];
export const clockPalette = (id: string) => CLOCK_PALETTES.find((p) => p.id === id) || CLOCK_PALETTES[0];

// ---------- bố cục ----------
export type ClockLayoutId = 'classic' | 'roman' | 'ticks' | 'quarter' | 'photo' | 'tet' | 'zodiac' | 'brandbig';
export type ClockData = Record<string, string>;
export interface ClockField { key: string; label: string; ph?: string }
export interface ClockLayout { id: ClockLayoutId; name: string; fields: ClockField[]; photo?: boolean; logo?: boolean }
const F = {
  brand: { key: 'brand', label: 'Tên công ty / thương hiệu', ph: 'CÔNG TY TNHH AN KHANG' },
  slogan: { key: 'slogan', label: 'Slogan / lời chúc', ph: 'Tận tâm · Uy tín · Chất lượng' },
  contact: { key: 'contact', label: 'Hotline / website', ph: '1900 6868 · ankhang.vn' },
  names: { key: 'names', label: 'Tên (ảnh cưới / gia đình)', ph: 'Quốc Bảo & Thu Hà' },
  date: { key: 'date', label: 'Ngày kỷ niệm', ph: '12.12.2026' },
  year: { key: 'year', label: 'Dòng năm', ph: 'Xuân Đinh Mùi 2027' },
};
export const CLOCK_LAYOUTS: ClockLayout[] = [
  { id: 'classic', name: 'Số Ả Rập + logo', fields: [F.brand, F.slogan, F.contact], logo: true },
  { id: 'roman', name: 'Số La Mã + chữ vòng', fields: [F.brand, F.slogan], logo: true },
  { id: 'ticks', name: 'Chỉ vạch tối giản', fields: [F.brand, F.slogan], logo: true },
  { id: 'quarter', name: '12 · 3 · 6 · 9', fields: [F.brand, F.slogan, F.contact], logo: true },
  { id: 'photo', name: 'Ảnh kỷ niệm', fields: [F.names, F.date], photo: true },
  { id: 'tet', name: 'Quà Tết', fields: [F.brand, F.year, F.slogan], logo: true },
  { id: 'zodiac', name: 'Phong thuỷ 12 con giáp', fields: [F.brand, F.slogan], logo: true },
  { id: 'brandbig', name: 'Logo lớn giữa', fields: [F.brand, F.slogan], logo: true },
];
export const clockLayout = (id: string) => CLOCK_LAYOUTS.find((l) => l.id === id) || CLOCK_LAYOUTS[0];

export const CLOCK_SAMPLES: Record<ClockLayoutId, ClockData> = {
  classic: { brand: 'CÔNG TY TNHH AN KHANG', slogan: 'Tận tâm · Uy tín · Chất lượng', contact: '1900 6868 · ankhang.vn' },
  roman: { brand: 'KHÁCH SẠN THU HÀ', slogan: 'Trân trọng mỗi phút giây' },
  ticks: { brand: 'GIA KHÁNH STUDIO', slogan: 'Design · Print · Brand' },
  quarter: { brand: 'NHA KHOA QUỐC BẢO', slogan: 'Nụ cười khoẻ mỗi ngày', contact: 'Hotline 0909 123 456' },
  photo: { names: 'Quốc Bảo & Thu Hà', date: '12.12.2026' },
  tet: { brand: 'AN KHANG GROUP', year: 'Xuân Đinh Mùi 2027', slogan: 'An khang thịnh vượng' },
  zodiac: { brand: 'BẢO NGỌC JEWELRY', slogan: 'Vạn sự như ý' },
  brandbig: { brand: 'GIA KHÁNH COFFEE', slogan: 'Since 2020 · Rang xay mỗi ngày' },
};

export interface ClockSpec { layout: ClockLayoutId; palette: string; font: string; size: string; frame: ClockFrame; hands: ClockHands }
export interface ClockTemplate { id: string; name: string; spec: Pick<ClockSpec, 'layout' | 'palette' | 'font' | 'frame' | 'hands'> }
export const CLOCK_TEMPLATES: ClockTemplate[] = [
  { id: 'corp-navy', name: 'Doanh nghiệp navy', spec: { layout: 'classic', palette: 'navy', font: 'montserrat', frame: 'gold', hands: 'classic' } },
  { id: 'corp-white', name: 'Văn phòng tối giản', spec: { layout: 'classic', palette: 'white', font: 'bvp', frame: 'black', hands: 'modern' } },
  { id: 'roman-ivory', name: 'La Mã cổ điển', spec: { layout: 'roman', palette: 'ivory', font: 'cormorant', frame: 'gold', hands: 'classic' } },
  { id: 'roman-walnut', name: 'La Mã gỗ óc chó', spec: { layout: 'roman', palette: 'walnut', font: 'playfair', frame: 'walnut', hands: 'classic' } },
  { id: 'ticks-black', name: 'Vạch đen vàng', spec: { layout: 'ticks', palette: 'black', font: 'oswald', frame: 'silver', hands: 'sweep' } },
  { id: 'quarter-teal', name: '12·3·6·9 xanh ngọc', spec: { layout: 'quarter', palette: 'teal', font: 'montserrat', frame: 'white', hands: 'modern' } },
  { id: 'photo-wedding', name: 'Ảnh cưới', spec: { layout: 'photo', palette: 'white', font: 'playfair', frame: 'white', hands: 'sweep' } },
  { id: 'photo-family', name: 'Ảnh gia đình', spec: { layout: 'photo', palette: 'walnut', font: 'cormorant', frame: 'wood', hands: 'classic' } },
  { id: 'tet-red', name: 'Quà Tết đỏ vàng', spec: { layout: 'tet', palette: 'red', font: 'playfair', frame: 'gold', hands: 'classic' } },
  { id: 'zodiac-ivory', name: 'Phong thuỷ 12 con giáp', spec: { layout: 'zodiac', palette: 'ivory', font: 'cormorant', frame: 'wood', hands: 'classic' } },
  { id: 'brand-cafe', name: 'Quán cà phê', spec: { layout: 'brandbig', palette: 'cafe', font: 'oswald', frame: 'wood', hands: 'modern' } },
  { id: 'quarter-pastel', name: 'Mầm non pastel', spec: { layout: 'quarter', palette: 'pastel', font: 'bvp', frame: 'white', hands: 'modern' } },
];
export const defaultClockSpec: ClockSpec = { ...CLOCK_TEMPLATES[0].spec, size: 'r30' };

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number): number {
  if (typeof document === 'undefined') return text.length * 60;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 60;
  mctx.font = `${weight} 100px "${family}"`;
  return mctx.measureText(text).width;
}
const textW = (t: string, family: string, weight: number, size: number, ls = 0) => (measure(t, family, weight) * size) / 100 + ls * Math.max(0, Array.from(t).length - 1);
const f2 = (n: number) => Math.round(n * 100) / 100;

const GENERIC = new Set(['công', 'ty', 'tnhh', 'cổ', 'phần', 'cp', 'group', 'jsc', 'co', 'ltd', 'khách', 'sạn', 'nhà', 'khoa', 'the', 'studio', 'coffee', 'tập', 'đoàn', 'jewelry', '&']);
export function monogram(brand: string): string {
  const w = (brand || '').trim().split(/\s+/).filter(Boolean);
  const key = w.filter((x) => !GENERIC.has(x.toLowerCase()));
  const use = (key.length ? key : w).slice(0, 2);
  return use.map((x) => Array.from(x)[0] || '').join('').toUpperCase() || 'AK';
}

// ---------- dựng chữ ----------
interface TOpts { family: string; weight: number; size: number; fill: string; min?: number; maxW: number; ls?: number; italic?: boolean }
/** cỡ chữ 1 dòng vừa maxW (giới hạn dưới min) */
function fitSize(text: string, o: TOpts): number {
  let s = o.size;
  for (let k = 0; k < 60 && textW(text, o.family, o.weight, s, (o.ls || 0) * s) > o.maxW; k++) s *= 0.95;
  return Math.max(o.min ?? 1, s);
}
/** cắt "…" nếu ở cỡ min vẫn tràn */
function clip(text: string, o: TOpts, s: number): string {
  if (textW(text, o.family, o.weight, s, (o.ls || 0) * s) <= o.maxW) return text;
  const ch = Array.from(text);
  while (ch.length > 1 && textW(ch.join('') + '…', o.family, o.weight, s, (o.ls || 0) * s) > o.maxW) ch.pop();
  return ch.join('').trimEnd() + '…';
}
function Line({ text, x = 0, y, o, tag = 'txt' }: { text: string; x?: number; y: number; o: TOpts; tag?: string }) {
  if (!text) return null;
  const s = fitSize(text, o);
  const t = clip(text, o, s);
  return <text x={f2(x)} y={f2(y)} textAnchor="middle" fontFamily={`'${o.family}'`} fontWeight={o.weight} fontSize={f2(s)} letterSpacing={o.ls ? f2(o.ls * s) : undefined} fill={o.fill} data-ck={tag}>{t}</text>;
}
/** bề rộng dây cung đường tròn r ở dòng chữ cao h có chân tại y */
const chord = (r: number, y: number, h: number) => {
  const yy = Math.max(Math.abs(y), Math.abs(y - h));
  return yy >= r ? 0 : 2 * Math.sqrt(r * r - yy * yy);
};
/** chữ chạy vòng: top = cung trên (đọc trái→phải, chân hướng vào tâm); bottom = cung dưới (chân hướng ra ngoài) */
function Arc({ text, r, top, o, maxDeg = 150, group }: { text: string; r: number; top: boolean; o: TOpts; maxDeg?: number; group: string }) {
  const t = (text || '').trim();
  if (!t) return null;
  const maxLen = (maxDeg * Math.PI / 180) * r;
  let s = o.size;
  const lsK = o.ls ?? 0.08;
  for (let k = 0; k < 60 && textW(t, o.family, o.weight, s, lsK * s) > maxLen; k++) s *= 0.95;
  s = Math.max(o.min ?? 1, s);
  let chars = Array.from(t);
  const len = (cs: string[]) => cs.reduce((a, c) => a + textW(c, o.family, o.weight, s), 0) + lsK * s * Math.max(0, cs.length - 1);
  if (len(chars) > maxLen) { while (chars.length > 1 && len([...chars, '…']) > maxLen) chars.pop(); chars = [...chars, '…']; }
  const total = len(chars);
  const span = total / r; // rad
  let acc = 0;
  return (
    <g data-arc={group}>
      {chars.map((c, i) => {
        const w = textW(c, o.family, o.weight, s);
        const mid = acc + w / 2; acc += w + lsK * s;
        // góc tính từ 12 giờ theo chiều kim đồng hồ
        // a: lệch góc so với đỉnh (cung trên) / đáy (cung dưới); cả 2 đọc trái → phải
        const a = top ? -span / 2 + mid / r : span / 2 - mid / r;
        const rot = (a * 180) / Math.PI;
        const rr = top ? r : r + s * 0.72; // cung dưới: chân chữ ra ngoài → lùi bán kính để mặt chữ cùng dải với cung trên
        const px = (top ? 1 : -1) * Math.sin(a) * rr, py = (top ? -1 : 1) * Math.cos(a) * rr;
        return <text key={i} x={0} y={0} transform={`translate(${f2(px)} ${f2(py)}) rotate(${f2(rot)})`} textAnchor="middle" fontFamily={`'${o.family}'`} fontWeight={o.weight} fontSize={f2(s)} fill={o.fill} data-ck="arc">{c === ' ' ? ' ' : c}</text>;
      })}
    </g>
  );
}

// ---------- hoạ tiết ----------
function Blossom({ x, y, r, fill, core }: { x: number; y: number; r: number; fill: string; core: string }) {
  return (
    <g transform={`translate(${f2(x)} ${f2(y)})`}>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-r * 0.55} rx={r * 0.42} ry={r * 0.55} fill={fill} transform={`rotate(${a})`} />)}
      <circle r={r * 0.22} fill={core} />
    </g>
  );
}
function MaiBranch({ x, y, s, flip, pal }: { x: number; y: number; s: number; flip?: boolean; pal: ClockPalette }) {
  const k = flip ? -1 : 1;
  const br = `M0 0 C ${12 * s * k} ${-6 * s}, ${22 * s * k} ${-14 * s}, ${34 * s * k} ${-16 * s} M ${14 * s * k} ${-8 * s} C ${18 * s * k} ${-16 * s}, ${20 * s * k} ${-22 * s}, ${24 * s * k} ${-28 * s}`;
  const fl: [number, number, number][] = [[34, -16, 3.2], [24, -28, 2.8], [20, -10, 2.4], [28, -22, 2], [10, -4, 2]];
  return (
    <g transform={`translate(${f2(x)} ${f2(y)})`}>
      <path d={br} fill="none" stroke="#5B2A12" strokeWidth={1.3 * s} strokeLinecap="round" opacity={0.9} />
      {fl.map(([fx, fy, fr], i) => <Blossom key={i} x={fx * s * k} y={fy * s} r={fr * s} fill={pal.accent} core="#B3161B" />)}
    </g>
  );
}

const ROMAN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
const GIAP = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];

// ---------- kim (xem trước phẳng + dùng chung hình cho 3D) ----------
/** đa giác kim theo hệ (x ngang, y hướng lên 12 giờ), đơn vị = bán kính mặt số */
export function handShapes(style: ClockHands): { hour: [number, number][]; minute: [number, number][]; second: [number, number][]; counter?: number } {
  if (style === 'classic') {
    const leaf = (L: number, W: number): [number, number][] => [[0, -0.1], [W * 0.5, 0], [W * 0.35, L * 0.45], [W, L * 0.62], [0, L], [-W, L * 0.62], [-W * 0.35, L * 0.45], [-W * 0.5, 0]];
    return { hour: leaf(0.5, 0.05), minute: leaf(0.74, 0.04), second: [[0.006, -0.2], [0.006, 0.86], [-0.006, 0.86], [-0.006, -0.2]] };
  }
  if (style === 'modern') {
    const bar = (L: number, W: number, T: number): [number, number][] => [[W, -T], [W, L], [-W, L], [-W, -T]];
    return { hour: bar(0.5, 0.026, 0.1), minute: bar(0.76, 0.018, 0.1), second: bar(0.86, 0.005, 0.22) };
  }
  const taper = (L: number, W: number): [number, number][] => [[W, -0.08], [W * 0.25, L], [-W * 0.25, L], [-W, -0.08]];
  return { hour: taper(0.52, 0.03), minute: taper(0.8, 0.022), second: [[0.004, -0.24], [0.004, 0.9], [-0.004, 0.9], [-0.004, -0.24]], counter: 0.05 };
}
/** 10:10:47 — giờ đẹp kinh điển (kim giây chỉ sang trái, không cắt chữ phía dưới) cho ảnh sản phẩm (độ, tính từ 12 giờ theo chiều kim) */
export const HAND_ANGLES = { hour: (10 + 10 / 60) * 30, minute: 10 * 6 + 47 / 10, second: 47 * 6 };

function FlatHands({ R, style, pal }: { R: number; style: ClockHands; pal: ClockPalette }) {
  const h = handShapes(style);
  const poly = (pts: [number, number][], deg: number, fill: string) => (
    <polygon points={pts.map(([x, y]) => `${f2(x * R)},${f2(-y * R)}`).join(' ')} fill={fill} transform={`rotate(${f2(deg)})`} style={{ filter: 'drop-shadow(0.6px 1.2px 0.8px rgba(0,0,0,0.35))' }} />
  );
  return (
    <g data-hands="1">
      {poly(h.hour, HAND_ANGLES.hour, pal.hand)}
      {poly(h.minute, HAND_ANGLES.minute, pal.hand)}
      {poly(h.second, HAND_ANGLES.second, pal.second)}
      {h.counter && <circle cx={f2(Math.sin(HAND_ANGLES.second * Math.PI / 180) * -0.16 * R)} cy={f2(Math.cos(HAND_ANGLES.second * Math.PI / 180) * 0.16 * R)} r={f2(h.counter * R * 0.5)} fill={pal.second} />}
      <circle r={f2(R * 0.035)} fill={pal.hand} />
      <circle r={f2(R * 0.014)} fill={pal.second} />
    </g>
  );
}

// ---------- mặt số ----------
export type ClockMode = 'preview' | 'face' | 'tex' | 'print' | 'pdf';
export type ClockPhoto = CVPhoto;

export function ClockSvg({ spec, data, photo, logo, mode = 'preview', style }: {
  spec: ClockSpec; data: ClockData; photo?: ClockPhoto | null; logo?: string; mode?: ClockMode; style?: CSSProperties;
}) {
  const sz = clockSize(spec.size);
  const pal = clockPalette(spec.palette);
  const font = clockFont(spec.font);
  const L = clockLayout(spec.layout);
  const dial = dialOf(sz);
  const R = dial / 2;
  const round = sz.shape === 'round';
  const fr = clockFrame(spec.frame);
  const bleed = mode === 'print' || mode === 'pdf' ? BLEED : 0;
  const pad = mode === 'preview' ? sz.rim : 0;
  const ext = R + Math.max(bleed, pad);
  const vb = `${f2(-ext)} ${f2(-ext)} ${f2(ext * 2)} ${f2(ext * 2)}`;
  const uid = `ck-${spec.layout}-${spec.palette}-${sz.id}-${mode}`;
  const minT = Math.max(2.4, dial * 0.012);
  const head = (size: number, fill = pal.ink, maxW = R * 1.3): TOpts => ({ family: font.family, weight: font.weight, size, fill, maxW, min: minT });
  const body = (size: number, fill = pal.sub, maxW = R * 1.2): TOpts => ({ family: BODY, weight: 600, size, fill, maxW, min: minT });
  const lim = (y: number, h: number, k = 0.86) => (round ? chord(R * 0.62, y, h) * k : R * 1.15 * k);

  // nền + vùng cắt (tròn / vuông bo nhẹ)
  const shapeEl = (r: number, props: Record<string, unknown>) => (round ? <circle r={f2(r)} {...props} /> : <rect x={f2(-r)} y={f2(-r)} width={f2(r * 2)} height={f2(r * 2)} rx={f2(Math.min(4, r * 0.02))} {...props} />);
  const bgR = R + bleed;

  // vòng vạch phút/giờ
  const ticks = (rOut: number, color: string, accent: string, majorOnly = false) => {
    const out: ReactNode[] = [];
    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      if (majorOnly && !major) continue;
      const a = (i * 6 * Math.PI) / 180;
      const lenT = major ? R * (spec.layout === 'ticks' ? 0.12 : 0.06) : R * 0.025;
      const w = major ? R * (spec.layout === 'ticks' ? 0.022 : 0.014) : R * 0.006;
      // vuông: đẩy vạch ra theo cạnh vuông cho đẹp
      const k = round ? 1 : 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
      const r0 = rOut * Math.min(k, 1.32), r1 = r0 - lenT;
      out.push(<line key={i} x1={f2(Math.sin(a) * r0)} y1={f2(-Math.cos(a) * r0)} x2={f2(Math.sin(a) * r1)} y2={f2(-Math.cos(a) * r1)} stroke={major && i % 15 === 0 ? accent : color} strokeWidth={f2(w)} strokeLinecap="round" />);
    }
    return <g data-ticks="1">{out}</g>;
  };
  const numerals = (labels: (string | null)[], r: number, size: number, fill: string, fam = font.family, wt = font.weight) => (
    <g>
      {labels.map((t, i) => {
        if (!t) return null;
        const a = (i * 30 * Math.PI) / 180;
        const k = round ? 1 : Math.min(1.25, 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))));
        const s = Math.min(size, (R * 0.42) / Math.max(1, textW(t, fam, wt, 1)) );
        return <text key={i} x={f2(Math.sin(a) * r * k)} y={f2(-Math.cos(a) * r * k + s * 0.35)} textAnchor="middle" fontFamily={`'${fam}'`} fontWeight={wt} fontSize={f2(s)} fill={fill} data-ck="num">{t}</text>;
      })}
    </g>
  );
  const arabic = Array.from({ length: 12 }, (_, i) => String(i === 0 ? 12 : i));

  // logo / monogram (khối tròn)
  const Logo = ({ cx, cy, r }: { cx: number; cy: number; r: number }) => {
    if (logo) return (
      <g>
        <defs><clipPath id={`${uid}-lg`}><circle cx={f2(cx)} cy={f2(cy)} r={f2(r)} /></clipPath></defs>
        <image href={logo} x={f2(cx - r)} y={f2(cy - r)} width={f2(r * 2)} height={f2(r * 2)} preserveAspectRatio="xMidYMid meet" clipPath={`url(#${uid}-lg)`} data-ck="logo" />
      </g>
    );
    const m = monogram(data.brand || '');
    const s = Math.min(r * 0.95, (r * 1.45) / Math.max(0.6, textW(m, font.family, font.weight, 1)));
    return (
      <g data-ck="logo">
        <circle cx={f2(cx)} cy={f2(cy)} r={f2(r)} fill="none" stroke={pal.accent} strokeWidth={f2(r * 0.07)} />
        <circle cx={f2(cx)} cy={f2(cy)} r={f2(r * 0.84)} fill="none" stroke={pal.accent} strokeWidth={f2(r * 0.025)} />
        <text x={f2(cx)} y={f2(cy + s * 0.36)} textAnchor="middle" fontFamily={`'${font.family}'`} fontWeight={font.weight} fontSize={f2(s)} fill={pal.accent}>{m}</text>
      </g>
    );
  };

  let content: ReactNode = null;
  let bgFill: ReactNode = shapeEl(bgR, { fill: `url(#${uid}-bg)` });

  if (spec.layout === 'classic') {
    content = (
      <>
        {ticks(R * 0.95, pal.sub, pal.accent)}
        {numerals(arabic, R * 0.76, R * 0.15, pal.ink)}
        <Logo cx={0} cy={-R * 0.4} r={R * 0.12} />
        <Line text={data.brand} y={R * 0.24} o={head(R * 0.085, pal.ink, lim(R * 0.24, R * 0.08))} />
        <Line text={data.slogan} y={R * 0.36} o={body(R * 0.058, pal.sub, lim(R * 0.36, R * 0.06))} />
        <Line text={data.contact} y={R * 0.47} o={body(R * 0.05, pal.accent, lim(R * 0.47, R * 0.05, 0.84))} />
      </>
    );
  } else if (spec.layout === 'roman') {
    content = (
      <>
        {shapeEl(R * 0.97, { fill: 'none', stroke: pal.accent, strokeWidth: f2(R * 0.008) })}
        {ticks(R * 0.93, pal.sub, pal.accent)}
        {numerals(ROMAN, R * 0.74, R * 0.13, pal.ink, 'Cormorant Garamond', 700)}
        <circle r={f2(R * 0.6)} fill="none" stroke={pal.accent} strokeWidth={f2(R * 0.006)} />
        <Logo cx={0} cy={-R * 0.34} r={R * 0.11} />
        <Line text={(data.brand || '').toUpperCase()} y={R * 0.2} o={{ ...head(R * 0.075, pal.ink, chord(R * 0.56, R * 0.2, R * 0.075) * 0.9), ls: 0.06 }} />
        <Arc text={data.slogan} r={R * 0.47} top={false} o={{ family: BODY, weight: 600, size: R * 0.055, fill: pal.sub, maxW: 0, min: minT, ls: 0.04 }} maxDeg={110} group="bottom" />
      </>
    );
  } else if (spec.layout === 'ticks') {
    content = (
      <>
        {ticks(R * 0.94, pal.ink, pal.accent, true)}
        <Logo cx={0} cy={-R * 0.42} r={R * 0.1} />
        <Line text={data.brand} y={R * 0.26} o={{ ...head(R * 0.09, pal.ink, lim(R * 0.26, R * 0.09)), ls: 0.12 }} />
        <Line text={data.slogan} y={R * 0.4} o={{ ...body(R * 0.05, pal.accent, lim(R * 0.4, R * 0.05)), ls: 0.1 }} />
      </>
    );
  } else if (spec.layout === 'quarter') {
    const q = arabic.map((t, i) => (i % 3 === 0 ? t : null));
    content = (
      <>
        <g>{Array.from({ length: 12 }, (_, i) => {
          if (i % 3 === 0) return null;
          const a = (i * 30 * Math.PI) / 180;
          const k = round ? 1 : Math.min(1.25, 1 / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))));
          return <circle key={i} cx={f2(Math.sin(a) * R * 0.8 * k)} cy={f2(-Math.cos(a) * R * 0.8 * k)} r={f2(R * 0.035)} fill={pal.accent} />;
        })}</g>
        {ticks(R * 0.96, pal.sub, pal.sub)}
        {numerals(q, R * 0.76, R * 0.22, pal.ink)}
        <Logo cx={0} cy={-R * 0.36} r={R * 0.1} />
        <Line text={data.brand} y={R * 0.22} o={head(R * 0.08, pal.ink, lim(R * 0.22, R * 0.08, 0.8))} />
        <Line text={data.slogan} y={R * 0.34} o={body(R * 0.055, pal.sub, lim(R * 0.34, R * 0.055, 0.8))} />
        <Line text={data.contact} y={R * 0.45} o={body(R * 0.048, pal.accent, lim(R * 0.45, R * 0.048, 0.74))} />
      </>
    );
  } else if (spec.layout === 'photo') {
    const box = { x: -bgR, y: -bgR, w: bgR * 2, h: bgR * 2 };
    const pr = photo ? coverRect(box, photo) : null;
    bgFill = (
      <g>
        {shapeEl(bgR, { fill: pal.bg })}
        {photo && pr && <image href={photo.src} x={f2(pr.x)} y={f2(pr.y)} width={f2(pr.w)} height={f2(pr.h)} preserveAspectRatio="none" clipPath={`url(#${uid}-clip)`} data-ck="photo" />}
      </g>
    );
    content = (
      <>
        {/* vòng số nền mờ cho chữ số luôn đọc được trên ảnh */}
        <path d={round
          ? `M ${f2(-R)} 0 a ${f2(R)} ${f2(R)} 0 1 0 ${f2(R * 2)} 0 a ${f2(R)} ${f2(R)} 0 1 0 ${f2(-R * 2)} 0 M ${f2(-R * 0.64)} 0 a ${f2(R * 0.64)} ${f2(R * 0.64)} 0 1 1 ${f2(R * 1.28)} 0 a ${f2(R * 0.64)} ${f2(R * 0.64)} 0 1 1 ${f2(-R * 1.28)} 0 Z`
          : `M ${f2(-R)} ${f2(-R)} H ${f2(R)} V ${f2(R)} H ${f2(-R)} Z M ${f2(-R * 0.64)} 0 a ${f2(R * 0.64)} ${f2(R * 0.64)} 0 1 1 ${f2(R * 1.28)} 0 a ${f2(R * 0.64)} ${f2(R * 0.64)} 0 1 1 ${f2(-R * 1.28)} 0 Z`}
          fill="rgba(0,0,0,0.32)" fillRule="evenodd" />
        {ticks(R * 0.95, 'rgba(255,255,255,0.85)', '#FFFFFF')}
        {numerals(arabic, R * 0.78, R * 0.13, '#FFFFFF')}
        <rect x={f2(-R * 0.6)} y={f2(R * 0.2)} width={f2(R * 1.2)} height={f2(R * 0.36)} rx={f2(R * 0.05)} fill="rgba(255,255,255,0.82)" />
        <Line text={data.names} y={R * 0.37} o={{ family: SCRIPT, weight: 400, size: R * 0.13, fill: '#2A2230', maxW: R * 1.08, min: minT }} />
        <Line text={data.date} y={R * 0.49} o={{ family: font.family, weight: font.weight, size: R * 0.05, fill: '#5A4E60', maxW: R * 1.0, min: minT, ls: 0.12 }} />
      </>
    );
  } else if (spec.layout === 'tet') {
    content = (
      <>
        {shapeEl(R * 0.97, { fill: 'none', stroke: pal.accent, strokeWidth: f2(R * 0.012) })}
        {shapeEl(R * 0.94, { fill: 'none', stroke: pal.accent, strokeWidth: f2(R * 0.004) })}
        <MaiBranch x={-R * 0.62} y={-R * 0.08} s={R * 0.0095} pal={pal} />
        <MaiBranch x={R * 0.62} y={-R * 0.08} s={R * 0.0095} flip pal={pal} />
        {numerals(arabic, R * 0.8, R * 0.12, pal.ink, 'Playfair Display', 800)}
        <Arc text={(data.brand || '').toUpperCase()} r={R * 0.58} top o={{ family: font.family, weight: font.weight, size: R * 0.07, fill: pal.ink, maxW: 0, min: minT }} maxDeg={96} group="top" />
        <Logo cx={0} cy={-R * 0.34} r={R * 0.09} />
        <Line text={data.year} y={R * 0.3} o={head(R * 0.075, pal.ink, lim(R * 0.3, R * 0.075))} />
        <Line text={data.slogan} y={R * 0.42} o={{ family: SCRIPT, weight: 400, size: R * 0.085, fill: pal.sub, maxW: lim(R * 0.42, R * 0.085, 0.8), min: minT }} />
      </>
    );
  } else if (spec.layout === 'zodiac') {
    content = (
      <>
        {ticks(R * 0.96, pal.sub, pal.accent)}
        {numerals(arabic, R * 0.8, R * 0.11, pal.ink)}
        <circle r={f2(R * 0.67)} fill="none" stroke={pal.accent} strokeWidth={f2(R * 0.006)} />
        <circle r={f2(R * 0.5)} fill="none" stroke={pal.accent} strokeWidth={f2(R * 0.006)} />
        {GIAP.map((g, i) => {
          const a = (i * 30 * Math.PI) / 180;
          const s = Math.min(R * 0.055, (R * 0.2) / Math.max(1, textW(g, BODY, 600, 1)));
          return <text key={g} x={0} y={0} transform={`translate(${f2(Math.sin(a) * R * 0.585)} ${f2(-Math.cos(a) * R * 0.585 + s * 0.35)})`} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={600} fontSize={f2(s)} fill={pal.sub} data-ck="giap">{g}</text>;
        })}
        {Array.from({ length: 12 }, (_, i) => { const a = ((i * 30 + 15) * Math.PI) / 180; return <line key={i} x1={f2(Math.sin(a) * R * 0.5)} y1={f2(-Math.cos(a) * R * 0.5)} x2={f2(Math.sin(a) * R * 0.67)} y2={f2(-Math.cos(a) * R * 0.67)} stroke={pal.accent} strokeWidth={f2(R * 0.005)} />; })}
        <Logo cx={0} cy={-R * 0.27} r={R * 0.085} />
        <Line text={data.brand} y={R * 0.18} o={head(R * 0.058, pal.ink, chord(R * 0.48, R * 0.18, R * 0.06) * 0.92)} />
        <Line text={data.slogan} y={R * 0.33} o={{ family: SCRIPT, weight: 400, size: R * 0.085, fill: pal.accent, maxW: chord(R * 0.48, R * 0.33, R * 0.085) * 0.9, min: minT }} />
      </>
    );
  } else { // brandbig
    content = (
      <>
        {ticks(R * 0.95, pal.ink, pal.accent)}
        <circle r={f2(R * 0.66)} fill={pal.bg2} />
        <Logo cx={0} cy={-R * 0.12} r={R * 0.3} />
        <Line text={data.brand} y={R * 0.34} o={{ ...head(R * 0.09, pal.ink, chord(R * 0.62, R * 0.34, R * 0.09) * 0.86), ls: 0.06 }} />
        <Line text={data.slogan} y={R * 0.47} o={body(R * 0.05, pal.accent, chord(R * 0.62, R * 0.47, R * 0.05) * 0.84)} />
      </>
    );
  }

  const isPrint = mode === 'print';
  const showFrame = mode === 'preview';
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-clock={mode} data-r={f2(R)} data-shape={sz.shape}>
      <defs>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="38%" r="70%">
          <stop offset="0" stopColor={pal.bg2} /><stop offset="1" stopColor={pal.bg} />
        </radialGradient>
        <clipPath id={`${uid}-clip`}>{shapeEl(bgR, {})}</clipPath>
      </defs>
      {showFrame && (round
        ? <><circle r={f2(R + sz.rim)} fill={fr.color} /><circle r={f2(R + sz.rim * 0.35)} fill="rgba(0,0,0,0.18)" /></>
        : <><rect x={f2(-R - sz.rim)} y={f2(-R - sz.rim)} width={f2((R + sz.rim) * 2)} height={f2((R + sz.rim) * 2)} rx={f2(sz.rim * 0.5)} fill={fr.color} /></>)}
      <g id={isPrint ? 'In' : undefined} clipPath={`url(#${uid}-clip)`}>
        {bgFill}
        {content}
      </g>
      {(mode === 'preview' || mode === 'face') && <FlatHands R={R} style={spec.hands} pal={pal} />}
      {isPrint && (
        <>
          <g id="CutContour">{shapeEl(R, { fill: 'none', stroke: '#EC008C', strokeWidth: 0.25 })}</g>
          <g id="Khoan">
            <circle r={4} fill="none" stroke="#00A3E0" strokeWidth={0.25} />
            <line x1={-6} y1={0} x2={6} y2={0} stroke="#00A3E0" strokeWidth={0.2} />
            <line x1={0} y1={-6} x2={0} y2={6} stroke="#00A3E0" strokeWidth={0.2} />
          </g>
        </>
      )}
      {mode === 'pdf' && <circle r={4} fill="none" stroke="#9AA3AF" strokeWidth={0.2} />}
    </svg>
  );
}
