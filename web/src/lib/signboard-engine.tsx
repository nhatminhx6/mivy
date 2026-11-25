'use client';
// Biển báo · biển chỉ dẫn nội bộ: 1 engine SVG (đơn vị mm) = LOẠI BIỂN × PHONG CÁCH × KHỔ × VẬT LIỆU.
// Pictogram vẽ bằng code (hình người tối giản kiểu ISO, KHÔNG chép thương hiệu nào). Chữ đo bằng canvas (font thật)
// → tự co / xuống dòng cho vừa vùng an toàn (tránh ốc pát). Biển an toàn giữ màu quy ước: thoát hiểm xanh lá,
// PCCC đỏ, cấm = vòng đỏ gạch chéo.
// Chế độ vẽ:
//  - 'preview': xem trước (giả vật liệu: mica bóng, alu, decal dạ quang, nắp ốc pát)
//  - 'tex'    : nguồn texture 3D (không lề xén, không ốc)
//  - 'print'  : FILE IN–CẮT đúng khổ + lề xén: lớp In, CutContour (đường cắt), Khoan (lỗ ốc / lỗ treo)
//  - 'pdf'    : chỉ lớp In + lề xén (PDF in, vạch cắt do svgsToPrintPdf vẽ)

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

export const SB_BLEED_MM = 3;
export type SBMode = 'preview' | 'tex' | 'print' | 'pdf';
export type SBMaterial = 'mica' | 'alu' | 'glow' | 'flag';
export type SBArrow = 'trái' | 'phải' | 'lên' | 'xuống';

export interface SBSize { id: string; name: string; wMm: number; hMm: number }
export const SB_SIZES: SBSize[] = [
  { id: '20x20', name: '20 × 20 cm', wMm: 200, hMm: 200 },
  { id: '30x15', name: '30 × 15 cm', wMm: 300, hMm: 150 },
  { id: '30x20', name: '30 × 20 cm', wMm: 300, hMm: 200 },
  { id: '15x15', name: '15 × 15 cm', wMm: 150, hMm: 150 },
];
export const sbSize = (id: string) => SB_SIZES.find((s) => s.id === id) || SB_SIZES[0];

export const SB_MATERIALS: { id: SBMaterial; name: string; note: string }[] = [
  { id: 'mica', name: 'Mica in UV', note: 'Mica 3mm in UV, bóng — gắn 4 ốc pát inox' },
  { id: 'alu', name: 'Alu in UV', note: 'Tấm alu 3mm in UV, mờ — gắn ốc pát hoặc băng keo 2 mặt' },
  { id: 'glow', name: 'Decal dạ quang', note: 'Phát sáng xanh khi mất điện — hợp biển thoát hiểm, dán trực tiếp' },
  { id: 'flag', name: 'Treo cờ 2 mặt', note: 'Biển vuông góc tường, in 2 mặt, nhìn từ xa trong hành lang' },
];
export const sbMaterial = (id: string) => SB_MATERIALS.find((m) => m.id === id) || SB_MATERIALS[0];

// ---------- phong cách ----------
export interface SBStyle {
  id: string; name: string; group: string;
  bg: string; fg: string; sub: string; pic: string; accent: string;
  tile?: string; tileFg?: string; tileShape?: 'round' | 'circle';
  border: 'none' | 'line' | 'double' | 'dashed'; borderColor: string;
  title: { family: string; weight: number; upper: boolean; track: number };
  body: { family: string; weight: number };
  radius: number;
}
const BVP = 'Be Vietnam Pro';
export const SB_STYLES: SBStyle[] = [
  { id: 'office', name: 'Văn phòng tối giản', group: 'Văn phòng', bg: '#FFFFFF', fg: '#1B2B4B', sub: '#5B6B85', pic: '#1B2B4B', accent: '#2F6FED', border: 'line', borderColor: '#CFD6E2',
    title: { family: BVP, weight: 800, upper: false, track: 0 }, body: { family: BVP, weight: 600 }, radius: 4 },
  { id: 'office-dark', name: 'Văn phòng tối', group: 'Văn phòng', bg: '#23272E', fg: '#FFFFFF', sub: '#B9C0CB', pic: '#FFFFFF', accent: '#F2B33D', border: 'none', borderColor: '#3A404A',
    title: { family: 'Montserrat', weight: 800, upper: true, track: 0.04 }, body: { family: BVP, weight: 600 }, radius: 4 },
  { id: 'hotel', name: 'Khách sạn đen vàng', group: 'Khách sạn', bg: '#141414', fg: '#E3C98A', sub: '#B7A375', pic: '#DDBF73', accent: '#DDBF73', border: 'double', borderColor: '#B8975A',
    title: { family: 'Cormorant Garamond', weight: 700, upper: true, track: 0.08 }, body: { family: BVP, weight: 600 }, radius: 2 },
  { id: 'hotel-navy', name: 'Khách sạn navy vàng', group: 'Khách sạn', bg: '#16233F', fg: '#EBD49A', sub: '#B9AE8C', pic: '#E2C27A', accent: '#E2C27A', border: 'double', borderColor: '#B89A5E',
    title: { family: 'Cormorant Garamond', weight: 700, upper: true, track: 0.08 }, body: { family: BVP, weight: 600 }, radius: 2 },
  { id: 'cafe', name: 'Cà phê kraft', group: 'Cà phê', bg: '#C9A375', fg: '#3A2515', sub: '#5A3E28', pic: '#3A2515', accent: '#3A2515', tile: '#F1E3CC', tileFg: '#3A2515', tileShape: 'circle', border: 'dashed', borderColor: '#5A3E28',
    title: { family: 'Baloo 2', weight: 800, upper: false, track: 0 }, body: { family: BVP, weight: 600 }, radius: 9 },
  { id: 'cafe-green', name: 'Cà phê xanh rêu', group: 'Cà phê', bg: '#22402F', fg: '#F2E7CF', sub: '#C9BFA6', pic: '#F2E7CF', accent: '#E5B85C', tile: '#2F5640', tileFg: '#F2E7CF', tileShape: 'circle', border: 'dashed', borderColor: '#8FA28F',
    title: { family: 'Baloo 2', weight: 800, upper: false, track: 0 }, body: { family: BVP, weight: 600 }, radius: 9 },
  { id: 'clinic', name: 'Bệnh viện xanh ngọc', group: 'Y tế', bg: '#FFFFFF', fg: '#0F3D48', sub: '#4A6B73', pic: '#FFFFFF', accent: '#0E8C8C', tile: '#0E8C8C', tileFg: '#FFFFFF', tileShape: 'round', border: 'none', borderColor: '#D3E5E6',
    title: { family: 'Montserrat', weight: 800, upper: false, track: 0 }, body: { family: BVP, weight: 600 }, radius: 6 },
  { id: 'clinic-blue', name: 'Phòng khám xanh dương', group: 'Y tế', bg: '#F5F9FF', fg: '#0E2E5C', sub: '#4A5F80', pic: '#FFFFFF', accent: '#1E64C8', tile: '#1E64C8', tileFg: '#FFFFFF', tileShape: 'round', border: 'none', borderColor: '#D6E2F3',
    title: { family: 'Montserrat', weight: 800, upper: false, track: 0 }, body: { family: BVP, weight: 600 }, radius: 6 },
];
export const sbStyle = (id: string) => SB_STYLES.find((s) => s.id === id) || SB_STYLES[0];
// chỉ font có TTF ở /public/fonts → file in outline được
export const SB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Cormorant+Garamond:wght@700&family=Baloo+2:wght@800&display=swap');`;

export function useSBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-sb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-sb-fonts'; link.rel = 'stylesheet';
        link.href = SB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [`800 60px "${BVP}"`, `600 40px "${BVP}"`, '800 60px "Montserrat"', '700 60px "Cormorant Garamond"', '800 60px "Baloo 2"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- loại biển ----------
export type SBKind = 'info' | 'exit' | 'fire' | 'prohibit';
export type SBPic = 'man' | 'woman' | 'mw' | 'run' | 'nosmoke' | 'fire' | 'camera' | 'wifi' | 'arrow' | 'quiet' | 'wash' | 'staff' | 'shoes' | 'clock' | 'none';
export interface SBSign { id: string; name: string; pic: SBPic; kind: SBKind; title: string; en: string; sub?: string; number?: string; ssid?: string; pass?: string; arrow?: SBArrow }
export const SB_SIGNS: SBSign[] = [
  { id: 'wc', name: 'WC chung', pic: 'mw', kind: 'info', title: 'Nhà vệ sinh', en: 'Toilet' },
  { id: 'wc-nam', name: 'WC nam', pic: 'man', kind: 'info', title: 'Nhà vệ sinh nam', en: 'Men' },
  { id: 'wc-nu', name: 'WC nữ', pic: 'woman', kind: 'info', title: 'Nhà vệ sinh nữ', en: 'Women' },
  { id: 'exit', name: 'Lối thoát hiểm', pic: 'run', kind: 'exit', title: 'Lối thoát hiểm', en: 'EXIT', arrow: 'phải' },
  { id: 'nosmoke', name: 'Cấm hút thuốc', pic: 'nosmoke', kind: 'prohibit', title: 'Cấm hút thuốc', en: 'No smoking' },
  { id: 'fire', name: 'Bình chữa cháy', pic: 'fire', kind: 'fire', title: 'Bình chữa cháy', en: 'Fire extinguisher' },
  { id: 'camera', name: 'Khu vực camera', pic: 'camera', kind: 'info', title: 'Khu vực có camera giám sát', en: 'CCTV in operation' },
  { id: 'wifi', name: 'Wifi', pic: 'wifi', kind: 'info', title: 'Wifi miễn phí', en: 'Free Wi-Fi', ssid: 'AnKhang_Guest', pass: 'xinchao2027' },
  { id: 'direction', name: 'Chỉ hướng', pic: 'arrow', kind: 'info', title: 'Chỉ dẫn', en: 'Directions', sub: 'Phòng họp | trái | Meeting room\nLễ tân | phải | Reception\nThang máy | lên | Elevator' },
  { id: 'quiet', name: 'Giữ im lặng', pic: 'quiet', kind: 'info', title: 'Vui lòng giữ im lặng', en: 'Please keep quiet' },
  { id: 'wash', name: 'Rửa tay', pic: 'wash', kind: 'info', title: 'Vui lòng rửa tay', en: 'Please wash your hands' },
  { id: 'staff', name: 'Khu vực nhân viên', pic: 'staff', kind: 'info', title: 'Khu vực nhân viên', en: 'Staff only' },
  { id: 'shoes', name: 'Cởi giày', pic: 'shoes', kind: 'info', title: 'Vui lòng cởi giày', en: 'Please remove your shoes' },
  { id: 'hours', name: 'Giờ mở cửa', pic: 'clock', kind: 'info', title: 'Giờ mở cửa', en: 'Opening hours', sub: 'Thứ 2 – Thứ 6 | 8:00 – 21:00\nThứ 7 – Chủ nhật | 7:00 – 22:00' },
  { id: 'room', name: 'Số phòng · tầng', pic: 'none', kind: 'info', title: 'Phòng họp', en: 'Meeting room', number: '201' },
];
export const sbSign = (id: string) => SB_SIGNS.find((s) => s.id === id) || SB_SIGNS[0];

/** dữ liệu khách sửa cho từng biển (đè lên mặc định) */
export type SBEdit = Partial<Pick<SBSign, 'title' | 'en' | 'sub' | 'number' | 'ssid' | 'pass' | 'arrow'>>;
export type SBData = Record<string, SBEdit>;
export const signData = (id: string, data: SBData): SBSign => ({ ...sbSign(id), ...(data[id] || {}) });

export interface SBSpec { style: string; size: string; material: SBMaterial; sign: string; bilingual: boolean; set: string[] }
export interface SBTemplate { id: string; name: string; spec: Omit<SBSpec, 'set' | 'bilingual'> }
const T = (id: string, name: string, style: string, sign: string, size: string, material: SBMaterial): SBTemplate => ({ id, name, spec: { style, sign, size, material } });
export const SB_TEMPLATES: SBTemplate[] = [
  T('office-wc', 'Văn phòng · WC', 'office', 'wc', '20x20', 'mica'),
  T('office-dark-room', 'Văn phòng tối · Phòng họp', 'office-dark', 'room', '30x15', 'alu'),
  T('hotel-wc', 'Khách sạn đen vàng · WC', 'hotel', 'wc', '15x15', 'mica'),
  T('hotel-dir', 'Khách sạn navy · Chỉ hướng', 'hotel-navy', 'direction', '30x20', 'mica'),
  T('cafe-wifi', 'Cà phê kraft · Wifi', 'cafe', 'wifi', '20x20', 'mica'),
  T('cafe-hours', 'Cà phê xanh · Giờ mở cửa', 'cafe-green', 'hours', '30x20', 'alu'),
  T('clinic-wash', 'Bệnh viện · Rửa tay', 'clinic', 'wash', '20x20', 'alu'),
  T('clinic-quiet', 'Phòng khám · Giữ im lặng', 'clinic-blue', 'quiet', '30x15', 'mica'),
  T('exit-glow', 'Lối thoát hiểm dạ quang', 'office', 'exit', '30x15', 'glow'),
  T('nosmoke', 'Cấm hút thuốc', 'office', 'nosmoke', '20x20', 'mica'),
  T('flag-wc', 'Treo cờ 2 mặt · WC', 'office', 'wc', '15x15', 'flag'),
  T('homestay-shoes', 'Homestay · Cởi giày', 'cafe', 'shoes', '30x15', 'mica'),
];
export const defaultSBSpec = (): SBSpec => ({ ...SB_TEMPLATES[0].spec, bilingual: true, set: ['wc', 'exit', 'nosmoke', 'wifi'] });

// ---------- lỗ ốc / vùng an toàn ----------
export interface SBHole { x: number; y: number; d: number }
export interface SBGeom { W: number; H: number; r: number; holes: SBHole[]; capD: number; safe: { l: number; t: number; r: number; b: number } }
export function sbGeom(size: string, material: SBMaterial, style: string): SBGeom {
  const s = sbSize(size); const W = s.wMm, H = s.hMm;
  const r = sbStyle(style).radius;
  let holes: SBHole[] = []; let capD = 0; let safe = { l: 9, t: 9, r: 9, b: 9 };
  if (material === 'mica' || material === 'alu') {
    const ins = Math.min(W, H) <= 150 ? 10 : 12; capD = Math.min(W, H) <= 150 ? 10 : 12;
    holes = [[ins, ins], [W - ins, ins], [ins, H - ins], [W - ins, H - ins]].map(([x, y]) => ({ x, y, d: 5 }));
    const m = ins + capD / 2 + 3;
    // ốc chỉ chiếm 4 góc → 2 cạnh dài vẫn dùng được, nhưng giữ đều cho gọn
    safe = { l: m, t: Math.min(m, 13), r: m, b: Math.min(m, 13) };
  } else if (material === 'flag') {
    holes = [{ x: W * 0.22, y: 7, d: 4 }, { x: W * 0.78, y: 7, d: 4 }];
    safe = { l: 9, t: 15, r: 9, b: 9 };
  }
  return { W, H, r, holes, capD, safe };
}

// ---------- đo chữ ----------
let ctx: CanvasRenderingContext2D | null = null;
export function measure(text: string, family: string, weight: number, size: number, track = 0): number {
  if (typeof document === 'undefined') return text.length * size * 0.56;
  if (!ctx) ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return text.length * size * 0.56;
  ctx.font = `${weight} 100px "${family}"`;
  return (ctx.measureText(text).width / 100) * size + Math.max(0, text.length - 1) * track * size;
}
const up = (t: string, u: boolean) => (u ? t.toLocaleUpperCase('vi') : t);
/** bọc chữ ≤ maxLines dòng, cân dòng; trả cỡ chữ lớn nhất vừa maxW */
function fitText(text: string, f: { family: string; weight: number; upper?: boolean; track?: number }, maxW: number, maxSize: number, minSize: number, maxLines: number): { lines: string[]; size: number } {
  const t = up((text || '').trim().replace(/\s+/g, ' '), !!f.upper);
  if (!t) return { lines: [], size: maxSize };
  const words = t.split(' ');
  const W = (s: string, sz: number) => measure(s, f.family, f.weight, sz, f.track || 0);
  const wrap = (sz: number, n: number): string[] | null => {
    // thử chia cân bằng thành k dòng (k = 1..n), chọn cách có dòng dài nhất ngắn nhất
    let best: string[] | null = null, bestW = Infinity;
    const rec = (start: number, k: number, acc: string[]) => {
      if (k === 1) {
        const line = words.slice(start).join(' '); const lines = [...acc, line];
        // tránh dòng chỉ 1 chữ ngắn ("Vui / lòng giữ / im lặng") khi còn đủ chữ để chia đều
        if (lines.length > 1 && words.length >= lines.length * 2 && lines.some((l) => !l.includes(' '))) return;
        const mw = Math.max(...lines.map((l) => W(l, sz)));
        if (mw < bestW) { bestW = mw; best = lines; }
        return;
      }
      for (let e = start + 1; e <= words.length - k + 1; e++) rec(e, k - 1, [...acc, words.slice(start, e).join(' ')]);
    };
    for (let k = 1; k <= Math.min(n, words.length); k++) {
      if (words.length > 14 && k > 2) break; // tránh bùng tổ hợp
      bestW = Infinity; best = null; rec(0, k, []);
      if (best && bestW <= maxW) return best;
    }
    return null;
  };
  for (let sz = maxSize; sz >= minSize; sz *= 0.95) {
    const lines = wrap(sz, maxLines);
    if (lines) return { lines, size: sz };
  }
  // vẫn không vừa: cỡ nhỏ nhất, co ngang bằng cách cắt chữ
  const sz = minSize;
  const lines = wrap(sz, maxLines) || [t];
  return { lines: lines.map((l) => { let s = l; while (s.length > 3 && W(s, sz) > maxW) s = s.slice(0, -2).trimEnd() + '…'; return s; }), size: sz };
}

// ---------- pictogram (hộp 100×100) ----------
const ARROW_ROT: Record<SBArrow, number> = { phải: 0, xuống: 90, trái: 180, lên: -90 };
function Pictogram({ pic, x, y, s, color, accent, arrow = 'phải' }: { pic: SBPic; x: number; y: number; s: number; color: string; accent: string; arrow?: SBArrow }) {
  const k = s / 100;
  const man = (dx = 0, sc = 1) => (
    <g transform={`translate(${dx} 0) translate(50 50) scale(${sc}) translate(-50 -50)`}>
      <circle cx={50} cy={13} r={9.5} fill={color} />
      <path fill={color} d="M33 27 H67 Q73 27 73 33 V60 Q73 64 69 64 Q65 64 65 60 V38 H63 V93 Q63 98 58 98 Q53 98 53 93 V62 H47 V93 Q47 98 42 98 Q37 98 37 93 V38 H35 V60 Q35 64 31 64 Q27 64 27 60 V33 Q27 27 33 27 Z" />
    </g>
  );
  const woman = (dx = 0, sc = 1) => (
    <g transform={`translate(${dx} 0) translate(50 50) scale(${sc}) translate(-50 -50)`}>
      <circle cx={50} cy={13} r={9.5} fill={color} />
      <path fill={color} d="M39 27 H61 Q67 27 68.5 33 L75 58 Q76 63 71.5 63.5 Q68 64 67 60 L61.5 40 L72 72 H28 L38.5 40 L33 60 Q32 64 28.5 63.5 Q24 63 25 58 L31.5 33 Q33 27 39 27 Z" />
      <rect x={39} y={70} width={9} height={28} rx={4.5} fill={color} />
      <rect x={52} y={70} width={9} height={28} rx={4.5} fill={color} />
    </g>
  );
  let body: ReactNode = null;
  switch (pic) {
    case 'man': body = man(); break;
    case 'woman': body = woman(); break;
    case 'mw': body = (<>{man(-24, 0.86)}<rect x={48.6} y={6} width={2.8} height={88} rx={1.4} fill={color} />{woman(24, 0.86)}</>); break;
    case 'run': body = (
      <g>
        {/* cửa */}
        <path d="M66 4 H96 V96 H86 V14 H66 Z" fill={color} />
        {/* người chạy */}
        <circle cx={52} cy={14} r={9} fill={color} />
        <g stroke={color} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <path d="M46 29 L36 58" />
          <path d="M45 33 L58 42 L70 36" />
          <path d="M44 33 L30 40 L18 34" />
          <path d="M36 58 L52 70 L50 90" />
          <path d="M36 58 L24 74 L8 76" />
        </g>
      </g>
    ); break;
    case 'nosmoke': body = (
      <g>
        <circle cx={50} cy={50} r={46} fill="#FFFFFF" />
        <rect x={16} y={54} width={54} height={13} fill="#1A1A1A" />
        <rect x={70} y={54} width={12} height={13} fill="#C9C9C9" />
        <path d="M24 48 C18 40 30 36 24 26 C20 18 28 14 26 8" stroke="#1A1A1A" strokeWidth={4} fill="none" strokeLinecap="round" />
        <circle cx={50} cy={50} r={42} fill="none" stroke="#D52B1E" strokeWidth={9} />
        <path d="M21 21 L79 79" stroke="#D52B1E" strokeWidth={9} strokeLinecap="butt" />
      </g>
    ); break;
    case 'fire': body = (
      <g fill={color}>
        <rect x={34} y={34} width={30} height={60} rx={11} />
        <rect x={42} y={23} width={14} height={13} rx={2} />
        <path d="M43 24 L36 13 H66 V19 H50 Z" />
        <path d="M56 28 C72 28 80 40 78 62 L80 74" stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" />
        <path d="M74 72 L86 72 L84 82 L76 82 Z" />
      </g>
    ); break;
    case 'camera': body = (
      <g fill={color}>
        <g transform="rotate(-16 46 40)">
          <rect x={14} y={28} width={58} height={26} rx={5} />
          <rect x={6} y={32} width={10} height={18} rx={2} />
          <circle cx={11} cy={41} r={3.5} fill={accent} />
        </g>
        <path d="M60 52 L68 74" stroke={color} strokeWidth={8} strokeLinecap="round" />
        <rect x={56} y={72} width={30} height={9} rx={2} />
        <path d="M20 72 A30 30 0 0 0 40 86" stroke={color} strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6} />
      </g>
    ); break;
    case 'wifi': body = (
      <g stroke={color} strokeWidth={10} fill="none" strokeLinecap="round">
        <path d="M14 42 A52 52 0 0 1 86 42" />
        <path d="M27 57 A33 33 0 0 1 73 57" />
        <path d="M39 71 A16 16 0 0 1 61 71" />
        <circle cx={50} cy={84} r={6} fill={color} stroke="none" />
      </g>
    ); break;
    case 'arrow': body = <path transform={`rotate(${ARROW_ROT[arrow]} 50 50)`} d="M8 40 H56 V18 L94 50 L56 82 V60 H8 Z" fill={color} />; break;
    case 'quiet': body = (
      <g>
        <path d="M10 36 H28 L52 16 V84 L28 64 H10 Z" fill={color} />
        <g stroke={color} strokeWidth={8} strokeLinecap="round"><path d="M64 36 L88 64" /><path d="M88 36 L64 64" /></g>
      </g>
    ); break;
    case 'wash': body = (
      <g fill={color}>
        <rect x={34} y={6} width={14} height={8} rx={2} />
        <rect x={38} y={12} width={6} height={8} />
        <path d="M14 20 H60 Q74 20 74 34 V40 H62 V34 Q62 31 59 31 H14 Z" />
        <path d="M68 46 Q72 52 68 56 Q64 52 68 46 Z" />
        <path d="M60 54 Q64 60 60 64 Q56 60 60 54 Z" />
        <path d="M74 56 Q78 62 74 66 Q70 62 74 56 Z" />
        <path d="M22 66 H78 Q78 94 50 94 Q22 94 22 66 Z" />
        <path d="M30 66 V58 M40 66 V56 M50 66 V55 M60 66 V56 M70 66 V58" stroke={color} strokeWidth={6} strokeLinecap="round" />
      </g>
    ); break;
    case 'staff': body = (
      <g>
        {man(-14, 0.92)}
        <rect x={60} y={58} width={32} height={28} rx={4} fill={color} />
        <path d="M67 58 V49 A9 9 0 0 1 85 49 V58" stroke={color} strokeWidth={5.5} fill="none" />
        <circle cx={76} cy={70} r={4} fill={accent} />
      </g>
    ); break;
    case 'shoes': body = (
      <g>
        <path d="M14 66 L18 42 Q20 35 27 37 L41 43 Q47 47 54 48 L76 53 Q90 57 90 67 V74 H14 Z" fill={color} />
        <rect x={14} y={74} width={76} height={5} fill={color} opacity={0.75} />
        <circle cx={50} cy={50} r={43} fill="none" stroke="#D52B1E" strokeWidth={7} />
        <path d="M20 20 L80 80" stroke="#D52B1E" strokeWidth={7} />
      </g>
    ); break;
    case 'clock': body = (
      <g>
        <circle cx={50} cy={50} r={40} fill="none" stroke={color} strokeWidth={8} />
        <path d="M50 50 V26 M50 50 L66 60" stroke={color} strokeWidth={7} strokeLinecap="round" />
        <circle cx={50} cy={50} r={5} fill={color} />
      </g>
    ); break;
    default: body = null;
  }
  return <g data-pic="1"><g transform={`translate(${x} ${y}) scale(${k})`}>{body}</g></g>;
}

// ---------- biển ----------
const GLOW = '#E6F7C4';
const EXIT_GREEN = '#00843D', FIRE_RED = '#D52B1E';

interface TextRun { x: number; y: number; size: number; text: string; family: string; weight: number; fill: string; anchor: 'start' | 'middle' | 'end'; track?: number; role?: string }

export function SignboardSvg({ spec, data, signId, mode = 'preview', style: css, side = 'front' }: {
  spec: SBSpec; data: SBData; signId?: string; mode?: SBMode; style?: CSSProperties; side?: 'front' | 'back';
}) {
  const st = sbStyle(spec.style);
  const g = sbGeom(spec.size, spec.material, spec.style);
  const { W, H } = g;
  const sg = signData(signId || spec.sign, data);
  const glow = spec.material === 'glow';
  const paint = (c: string) => (glow && c.toUpperCase() === '#FFFFFF' ? GLOW : c);
  const bil = spec.bilingual;
  const b = mode === 'print' || mode === 'pdf' ? SB_BLEED_MM : 0;

  // màu theo loại biển (biển an toàn giữ màu quy ước)
  let bg = st.bg, fg = st.fg, sub = st.sub, pic = st.pic, tile = st.tile, tileFg = st.tileFg;
  let border = st.border;
  if (sg.kind === 'exit') { bg = EXIT_GREEN; fg = '#FFFFFF'; sub = '#FFFFFF'; pic = '#FFFFFF'; tile = undefined; border = 'none'; }
  if (sg.kind === 'fire') { bg = FIRE_RED; fg = '#FFFFFF'; sub = '#FFFFFF'; pic = '#FFFFFF'; tile = undefined; border = 'none'; }
  if (sg.kind === 'prohibit') { tile = undefined; }
  bg = paint(bg); fg = paint(fg); sub = paint(sub); pic = paint(pic); tile = tile && paint(tile); tileFg = tileFg && paint(tileFg);
  const picColor = tile ? (tileFg || '#FFFFFF') : pic;

  const L = g.safe.l, Tp = g.safe.t, R = W - g.safe.r, B = H - g.safe.b;
  const aw = R - L, ah = B - Tp;
  const wide = W / H >= 1.35;
  const safety = sg.kind === 'exit' || sg.kind === 'fire';
  // biển an toàn: chữ không chân đậm cho dễ đọc từ xa (không theo font trang trí của phong cách)
  const titleF = safety ? { family: BVP, weight: 800, upper: true, track: 0.02 } : { family: st.title.family, weight: st.title.weight, upper: st.title.upper, track: st.title.track };
  const bodyF = { family: st.body.family, weight: st.body.weight };
  const runs: TextRun[] = [];
  const extra: ReactNode[] = [];
  let kid = 0; const nk = (p: string) => `${p}${kid++}`; // key duy nhất (nhiều hàng chung toạ độ x)

  // khối chữ: tiêu đề + tiếng Anh (+ dòng phụ). Trả chiều cao, đặt tại (x, yTop) với neo
  const textBlock = (x0: number, x1: number, yTop: number, yBot: number, anchor: 'start' | 'middle', title: string, en: string, opts: { maxTitle?: number; lines?: number } = {}) => {
    const maxW = x1 - x0, maxH = yBot - yTop;
    let scale = 1;
    for (let it = 0; it < 14; it++) {
      const mt = Math.min(opts.maxTitle ?? 999, maxH * (opts.lines === 1 ? 0.58 : 0.42), maxW * 0.3) * scale;
      const tf = fitText(title, titleF, maxW, mt, Math.max(3.2, mt * 0.3), opts.lines ?? 3);
      const ef = bil && en ? fitText(en, { ...bodyF, upper: sg.kind === 'exit' }, maxW, Math.max(3, tf.size * 0.56), 3, 2) : { lines: [], size: 0 };
      const lh = 1.16, gap = tf.size * 0.3;
      const hT = tf.lines.length * tf.size * lh, hE = ef.lines.length ? gap + ef.lines.length * ef.size * 1.2 : 0;
      const total = hT + hE;
      if (total <= maxH || it === 13) {
        const y0 = yTop + (maxH - total) / 2;
        const ax = anchor === 'middle' ? (x0 + x1) / 2 : x0;
        tf.lines.forEach((l, i) => runs.push({ x: ax, y: y0 + tf.size * 0.86 + i * tf.size * lh, size: tf.size, text: l, family: titleF.family, weight: titleF.weight, fill: fg, anchor, track: titleF.track, role: 'title' }));
        ef.lines.forEach((l, j) => runs.push({ x: ax, y: y0 + hT + gap + ef.size * 0.86 + j * ef.size * 1.2, size: ef.size, text: l, family: bodyF.family, weight: bodyF.weight, fill: sub, anchor, role: 'en' }));
        return total;
      }
      scale *= 0.92;
    }
    return 0;
  };

  // pictogram có ô nền (bệnh viện / cà phê) hoặc trơn
  const picBox = (x: number, y: number, s: number, p: SBPic = sg.pic, arrow?: SBArrow) => {
    if (tile && p !== 'none') {
      extra.push(st.tileShape === 'circle'
        ? <circle key={nk('t')} cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={tile} data-pic="1" />
        : <rect key={nk('t')} x={x} y={y} width={s} height={s} rx={s * 0.16} fill={tile} data-pic="1" />);
      const ins = s * 0.18;
      extra.push(<Pictogram key={nk('p')} pic={p} x={x + ins} y={y + ins} s={s - ins * 2} color={picColor} accent={st.accent} arrow={arrow} />);
    } else extra.push(<Pictogram key={nk('p')} pic={p} x={x} y={y} s={s} color={picColor} accent={sg.kind === 'info' ? st.accent : '#FFFFFF'} arrow={arrow} />);
  };

  if (sg.id === 'room') {
    const num = (sg.number || '').trim();
    if (wide) {
      const nf = fitText(num, { family: titleF.family, weight: titleF.weight }, aw * 0.42, ah * 0.86, 8, 1);
      const nx = L + aw * 0.21;
      runs.push({ x: nx, y: Tp + ah / 2 + nf.size * 0.36, size: nf.size, text: nf.lines[0] || '', family: titleF.family, weight: titleF.weight, fill: tile || st.accent, anchor: 'middle', role: 'number' });
      extra.push(<rect key="div" x={L + aw * 0.44} y={Tp + ah * 0.12} width={0.8} height={ah * 0.76} fill={sub} opacity={0.6} />);
      textBlock(L + aw * 0.5, R, Tp, B, 'start', sg.title, sg.en, { lines: 2 });
    } else {
      const nf = fitText(num, { family: titleF.family, weight: titleF.weight }, aw * 0.86, ah * 0.46, 8, 1);
      runs.push({ x: (L + R) / 2, y: Tp + nf.size * 0.82, size: nf.size, text: nf.lines[0] || '', family: titleF.family, weight: titleF.weight, fill: tile || st.accent, anchor: 'middle', role: 'number' });
      extra.push(<rect key="div" x={L + aw * 0.3} y={Tp + nf.size * 0.98} width={aw * 0.4} height={0.8} fill={st.accent} />);
      textBlock(L, R, Tp + nf.size * 1.08, B, 'middle', sg.title, sg.en, { lines: 2 });
    }
  } else if (sg.id === 'direction') {
    const rows = (sg.sub || '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((r) => r[0]).slice(0, 4);
    const n = Math.max(1, rows.length);
    const rh = ah / n;
    // cỡ chữ đồng đều giữa các hàng: lấy cỡ nhỏ nhất vừa mọi hàng
    const asz = Math.min(rh * 0.62, aw * 0.2);
    const tMax = Math.min(...rows.map(([name]) => fitText(name, titleF, aw - asz - aw * 0.05, rh * 0.42, 3.2, 1).size));
    rows.forEach(([name, dir, en], i) => {
      const y0 = Tp + i * rh;
      const as = Math.min(rh * 0.62, aw * 0.2);
      const arrow = (['trái', 'phải', 'lên', 'xuống'].includes(dir) ? dir : 'phải') as SBArrow;
      const left = arrow !== 'phải';
      const ax = left ? L : R - as;
      picBox(ax, y0 + (rh - as) / 2, as, 'arrow', arrow);
      const tx0 = left ? L + as + aw * 0.05 : L, tx1 = left ? R : R - as - aw * 0.05;
      const tf = fitText(name, titleF, tx1 - tx0, tMax, 3.2, 1);
      const ef = bil && en ? fitText(en, bodyF, tx1 - tx0, tf.size * 0.55, 2.6, 1) : { lines: [], size: 0 };
      const hT = tf.size, hE = ef.lines.length ? ef.size * 1.3 : 0;
      const yb = y0 + (rh - hT - hE) / 2 + tf.size * 0.82;
      const anchor = left ? 'start' : 'end';
      const xx = left ? tx0 : tx1;
      runs.push({ x: xx, y: yb, size: tf.size, text: tf.lines[0] || '', family: titleF.family, weight: titleF.weight, fill: fg, anchor, track: titleF.track, role: 'title' });
      if (ef.lines.length) runs.push({ x: xx, y: yb + ef.size * 1.3, size: ef.size, text: ef.lines[0], family: bodyF.family, weight: bodyF.weight, fill: sub, anchor, role: 'en' });
      if (i < n - 1) extra.push(<rect key={`ln${i}`} x={L} y={y0 + rh - 0.3} width={aw} height={0.6} fill={sub} opacity={0.35} />);
    });
  } else if (sg.id === 'wifi') {
    const payload = `WIFI:T:WPA;S:${esc(sg.ssid || '')};P:${esc(sg.pass || '')};;`;
    const q = qrPath(payload);
    const infoLines = [`Wifi: ${sg.ssid || ''}`, `Mật khẩu: ${sg.pass || ''}`];
    const qrBox = (x: number, y: number, s: number) => {
      const pad = s * 0.06;
      extra.push(<rect key="qrbg" x={x} y={y} width={s} height={s} rx={s * 0.05} fill="#FFFFFF" data-pic="1" />);
      extra.push(<path key="qr" d={q.d} fill="#111111" transform={`translate(${x + pad} ${y + pad}) scale(${(s - pad * 2) / q.n})`} data-qr={payload} />);
    };
    if (wide) {
      const qs = Math.min(ah, aw * 0.36);
      qrBox(R - qs, Tp + (ah - qs) / 2, qs);
      const x1 = R - qs - aw * 0.05;
      const ps = Math.min(ah * 0.3, (x1 - L) * 0.22);
      picBox(L, Tp, ps);
      textBlock(L + ps + aw * 0.03, x1, Tp, Tp + ps, 'start', sg.title, bil ? sg.en : '', { lines: 2 });
      infoBlock(L, x1, Tp + ps + ah * 0.06, B, infoLines);
    } else {
      const qs = Math.min(aw * 0.5, ah * 0.42);
      const ps = Math.min(ah * 0.19, aw * 0.2);
      picBox(L, Tp, ps);
      textBlock(L + ps + aw * 0.04, R, Tp, Tp + ps, 'start', sg.title, bil ? sg.en : '', { lines: 1 });
      qrBox((L + R) / 2 - qs / 2, Tp + ps + ah * 0.05, qs);
      infoBlock(L, R, Tp + ps + ah * 0.05 + qs + ah * 0.04, B, infoLines, 'middle');
    }
  } else if (sg.id === 'hours') {
    const rows = (sg.sub || '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((r) => r[0]).slice(0, 4);
    const ps = Math.min(ah * 0.26, aw * 0.2);
    picBox(L, Tp, ps);
    textBlock(L + ps + aw * 0.04, R, Tp, Tp + ps, 'start', sg.title, bil ? sg.en : '', { lines: 1 });
    const y0 = Tp + ps + ah * 0.08, rh = (B - y0) / Math.max(1, rows.length);
    if (!wide) {
      // biển vuông: mỗi hàng 2 dòng (ngày nhỏ, giờ to) cho dễ đọc
      const lf = rows.map(([a]) => fitText(a, bodyF, aw, rh * 0.26, 2.8, 1));
      const tfz = rows.map(([, t]) => fitText(t || '', { family: titleF.family, weight: titleF.weight }, aw, rh * 0.4, 3, 1));
      const ls = Math.min(...lf.map((f) => f.size)), ts = Math.min(...tfz.map((f) => f.size));
      rows.forEach((_, i) => {
        const top = y0 + i * rh + (rh - ls * 1.15 - ts) / 2;
        runs.push({ x: L, y: top + ls * 0.86, size: ls, text: lf[i].lines[0] || '', family: bodyF.family, weight: bodyF.weight, fill: sub, anchor: 'start', role: 'row' });
        runs.push({ x: L, y: top + ls * 1.15 + ts * 0.86, size: ts, text: tfz[i].lines[0] || '', family: titleF.family, weight: titleF.weight, fill: fg, anchor: 'start', role: 'row' });
        if (i < rows.length - 1) extra.push(<rect key={`hr${i}`} x={L} y={y0 + (i + 1) * rh - 0.3} width={aw} height={0.6} fill={sub} opacity={0.3} />);
      });
    } else rows.forEach(([a, t], i) => {
      const size = Math.min(rh * 0.5, 999);
      const fa = fitText(a, bodyF, aw * 0.56, size, 3, 1), ft = fitText(t || '', { family: titleF.family, weight: titleF.weight }, aw * 0.42, size, 3, 1);
      const sz = Math.min(fa.size, ft.size);
      const yb = y0 + i * rh + rh / 2 + sz * 0.36;
      runs.push({ x: L, y: yb, size: sz, text: fa.lines[0] || '', family: bodyF.family, weight: bodyF.weight, fill: sub, anchor: 'start', role: 'row' });
      runs.push({ x: R, y: yb, size: sz, text: ft.lines[0] || '', family: titleF.family, weight: titleF.weight, fill: fg, anchor: 'end', role: 'row' });
      if (i < rows.length - 1) extra.push(<rect key={`hr${i}`} x={L} y={y0 + (i + 1) * rh - 0.3} width={aw} height={0.6} fill={sub} opacity={0.3} />);
    });
  } else if (sg.kind === 'exit') {
    const arrow = (sg.arrow || 'phải') as SBArrow;
    if (wide) {
      const s = Math.min(ah, aw * 0.3);
      const arrowLeft = arrow === 'trái';
      const ax = arrowLeft ? L : R - s * 0.8;
      extra.push(<Pictogram key="ar" pic="arrow" x={ax} y={Tp + (ah - s * 0.8) / 2} s={s * 0.8} color={picColor} accent="#fff" arrow={arrow} />);
      const px = arrowLeft ? L + s * 0.86 : L;
      picBox(px, Tp + (ah - s) / 2, s, 'run');
      const tx0 = px + s + aw * 0.04, tx1 = arrowLeft ? R : R - s * 0.8 - aw * 0.04;
      textBlock(tx0, tx1, Tp, B, 'start', sg.title, sg.en, { lines: 2 });
    } else {
      const s = Math.min(aw * 0.5, ah * 0.48);
      picBox(L + aw * 0.12, Tp, s, 'run');
      extra.push(<Pictogram key="ar" pic="arrow" x={R - s * 0.62} y={Tp + s * 0.2} s={s * 0.6} color={picColor} accent="#fff" arrow={arrow} />);
      textBlock(L, R, Tp + s + ah * 0.05, B, 'middle', sg.title, sg.en, { lines: 2 });
    }
  } else {
    // bố cục chung: pictogram + tiêu đề (+ tiếng Anh)
    if (wide) {
      const s = Math.min(ah * 0.94, aw * 0.36);
      picBox(L, Tp + (ah - s) / 2, s);
      textBlock(L + s + aw * 0.06, R, Tp, B, 'start', sg.title, sg.en, { lines: 3 });
    } else {
      const s = Math.min(aw * 0.56, ah * 0.5);
      picBox((L + R) / 2 - s / 2, Tp + ah * 0.02, s);
      textBlock(L, R, Tp + ah * 0.02 + s + ah * 0.05, B, 'middle', sg.title, sg.en, { lines: 2 });
    }
  }

  function infoBlock(x0: number, x1: number, y0: number, y1: number, lines: string[], anchor: 'start' | 'middle' = 'start') {
    const n = lines.length; const rh = (y1 - y0) / n;
    const fits = lines.map((l) => fitText(l, bodyF, x1 - x0, Math.min(rh * 0.62, 14), 2.6, 1));
    const sz = Math.min(...fits.map((f) => f.size));
    lines.forEach((_, i) => {
      runs.push({ x: anchor === 'middle' ? (x0 + x1) / 2 : x0, y: y0 + i * rh + rh / 2 + sz * 0.36, size: sz, text: fits[i].lines[0] || '', family: bodyF.family, weight: i === 0 ? 800 : bodyF.weight, fill: i === 0 ? fg : sub, anchor, role: 'info' });
    });
  }

  // viền trang trí
  const deco: ReactNode[] = [];
  const bi = Math.min(W, H) * 0.035;
  if (border === 'line') deco.push(<rect key="b1" x={bi} y={bi} width={W - bi * 2} height={H - bi * 2} rx={Math.max(0, st.radius - bi / 2)} fill="none" stroke={paint(st.borderColor)} strokeWidth={0.8} />);
  if (border === 'double') {
    deco.push(<rect key="b1" x={bi} y={bi} width={W - bi * 2} height={H - bi * 2} fill="none" stroke={paint(st.borderColor)} strokeWidth={0.9} />);
    deco.push(<rect key="b2" x={bi + 2} y={bi + 2} width={W - bi * 2 - 4} height={H - bi * 2 - 4} fill="none" stroke={paint(st.borderColor)} strokeWidth={0.4} />);
  }
  if (border === 'dashed') deco.push(<rect key="b1" x={bi} y={bi} width={W - bi * 2} height={H - bi * 2} rx={Math.max(0, st.radius - bi / 2)} fill="none" stroke={paint(st.borderColor)} strokeWidth={0.8} strokeDasharray="3 2.2" opacity={0.75} />);

  const textEls = runs.map((r, i) => (
    <text key={i} x={r.x} y={r.y} fontFamily={`"${r.family}"`} fontWeight={r.weight} fontSize={r.size} fill={r.fill} textAnchor={r.anchor}
      letterSpacing={r.track ? r.size * r.track : undefined} data-role={r.role}>{r.text}</text>
  ));

  const content = (
    <>
      {deco}
      {extra}
      {textEls}
    </>
  );

  // mặt sau biển treo cờ: in lại y hệt; mũi tên chỉ hướng giữ nguyên (2 phía người đi đều đọc được)
  const bgRect = <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} rx={b ? 0 : st.radius} fill={bg} data-bg="1" />;
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;

  if (mode === 'print' || mode === 'pdf') {
    const cut = `M${st.radius} 0 H${W - st.radius} A${st.radius} ${st.radius} 0 0 1 ${W} ${st.radius} V${H - st.radius} A${st.radius} ${st.radius} 0 0 1 ${W - st.radius} ${H} H${st.radius} A${st.radius} ${st.radius} 0 0 1 0 ${H - st.radius} V${st.radius} A${st.radius} ${st.radius} 0 0 1 ${st.radius} 0 Z`;
    return (
      <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" width={`${W + b * 2}mm`} height={`${H + b * 2}mm`} style={css} data-side={side}>
        <g id="In">{bgRect}{content}</g>
        {mode === 'print' && (
          <>
            <g id="CutContour"><path d={cut} fill="none" stroke="#FF00FF" strokeWidth={0.25} /></g>
            {g.holes.length > 0 && <g id="Khoan">{g.holes.map((h, i) => <circle key={i} cx={h.x} cy={h.y} r={h.d / 2} fill="none" stroke="#00A0FF" strokeWidth={0.25} />)}</g>}
          </>
        )}
      </svg>
    );
  }

  const gid = `sb-${spec.style}-${spec.material}-${sg.id}`;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={css} preserveAspectRatio="xMidYMid meet" data-sign={sg.id}>
      {bgRect}
      {content}
      {mode === 'preview' && (
        <>
          {spec.material === 'mica' && (
            <>
              <defs><linearGradient id={`${gid}-gl`} x1="0" y1="0" x2="1" y2="1"><stop offset="0.25" stopColor="#fff" stopOpacity="0" /><stop offset="0.36" stopColor="#fff" stopOpacity="0.22" /><stop offset="0.46" stopColor="#fff" stopOpacity="0" /></linearGradient></defs>
              <rect x={0} y={0} width={W} height={H} rx={st.radius} fill={`url(#${gid}-gl)`} pointerEvents="none" />
            </>
          )}
          {g.holes.map((h, i) => (
            spec.material === 'flag'
              ? <circle key={i} cx={h.x} cy={h.y} r={h.d / 2} fill="#9AA0A8" />
              : <g key={i}>
                <circle cx={h.x} cy={h.y} r={g.capD / 2} fill="#D9DDE2" stroke="#9AA0A8" strokeWidth={0.5} />
                <circle cx={h.x - g.capD * 0.12} cy={h.y - g.capD * 0.12} r={g.capD * 0.22} fill="#FFFFFF" opacity={0.75} />
              </g>
          ))}
        </>
      )}
    </svg>
  );
}

const esc = (s: string) => s.replace(/([\\;,:"])/g, '\\$1');
export const wifiPayload = (ssid: string, pass: string) => `WIFI:T:WPA;S:${esc(ssid)};P:${esc(pass)};;`;
