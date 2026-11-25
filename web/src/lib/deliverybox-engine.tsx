'use client';
// Thùng giao hàng sau xe máy: decal dán 4 mặt (sau · trái · phải · nắp) — chữ TO đọc được giữa đường.
// 1 engine SVG (đơn vị mm) = BỐ CỤC × BẢNG MÀU × FONT × NGÀNH. Render code 100%: icon ngành, xe máy, vệt tốc độ đều vẽ bằng code
// (KHÔNG mô phỏng thương hiệu/ màu của hãng giao hàng nào). Chữ đo bằng canvas (font thật) → co / xuống 2 dòng cho vừa ô.
// 3 chế độ vẽ:
//  - 'preview': decal bo góc (xem phẳng)
//  - 'print'  : FILE IN đúng khổ decal + lề xén; cut=true thêm lớp CutContour (đường cắt bo góc)
//  - 'tex'    : nguồn texture 3D (đúng khổ, bo góc trong suốt, không lề)

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

export type DBFace = 'back' | 'left' | 'right' | 'top';
export type DBMode = 'preview' | 'print' | 'tex';
export const DB_FACES: { id: DBFace; name: string }[] = [
  { id: 'back', name: 'Mặt sau (chính)' }, { id: 'left', name: 'Hông trái' }, { id: 'right', name: 'Hông phải' }, { id: 'top', name: 'Nắp trên' },
];

export interface DBSize { id: string; name: string; W: number; D: number; H: number }
// W = ngang (trái–phải xe), D = sâu (trước–sau xe), H = cao
export const DB_SIZES: DBSize[] = [
  { id: '42', name: '42 × 42 × 42 cm', W: 420, D: 420, H: 420 },
  { id: '45', name: '45 × 45 × 45 cm', W: 450, D: 450, H: 450 },
  { id: '50', name: '50 × 40 × 40 cm (ngang)', W: 500, D: 400, H: 400 },
];
export const dbSize = (id: string) => DB_SIZES.find((s) => s.id === id) || DB_SIZES[0];
export const DB_LID = 70;       // nắp thùng cao 7cm (decal thân nằm dưới nắp)
export const DB_BLEED_MM = 3;
export const DB_RADIUS = 14;     // bo góc decal

/** khổ decal từng mặt (mm) — chừa mép 2.5cm (thùng bo cạnh) và dải phản quang dưới đáy */
export function decalDims(s: DBSize, face: DBFace): { w: number; h: number } {
  if (face === 'top') return { w: s.W - 60, h: s.D - 60 };
  return { w: (face === 'back' ? s.W : s.D) - 50, h: s.H - DB_LID - 50 };
}

export interface DBFont { id: string; name: string; family: string; weight: number; upper: boolean }
export const DB_FONTS: DBFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800, upper: true },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, upper: true },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800, upper: false },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, upper: false },
];
export const dbFont = (id: string) => DB_FONTS.find((f) => f.id === id) || DB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const NUM = 'Oswald';
// chỉ font có TTF ở /public/fonts → file in outline chữ được
export const DB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Lobster&display=swap');`;

export function useDBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-db-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-db-fonts'; link.rel = 'stylesheet';
        link.href = DB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...DB_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// bg nền decal · fg chữ chính · acc màu nhấn (dải, pill) · onAcc chữ trên nền nhấn · sub chữ phụ · box màu thùng gợi ý
// Bảng màu chọn TRÁNH xanh lá tươi / cam đỏ / vàng chanh kiểu các hãng giao hàng lớn.
export interface DBPalette { id: string; name: string; bg: string; fg: string; acc: string; onAcc: string; sub: string; box: string }
export const DB_PALETTES: DBPalette[] = [
  { id: 'burgundy', name: 'Đỏ đô · vàng', bg: '#7A1E2C', fg: '#FFF4E0', acc: '#F2B134', onAcc: '#3A0D14', sub: '#F7D9C4', box: '#5E1520' },
  { id: 'navy', name: 'Navy · mù tạt', bg: '#1B2A4A', fg: '#FFFFFF', acc: '#F2B134', onAcc: '#1B2A4A', sub: '#C9D3E6', box: '#141F38' },
  { id: 'forest', name: 'Rêu · kem', bg: '#1F4D3A', fg: '#F7F1DC', acc: '#F4C95D', onAcc: '#173A2B', sub: '#D6E6D0', box: '#173A2B' },
  { id: 'cream', name: 'Kem · đỏ', bg: '#FFF6E6', fg: '#7A1E2C', acc: '#B3261E', onAcc: '#FFFFFF', sub: '#6B4A33', box: '#7A1E2C' },
  { id: 'plum', name: 'Tím than · hồng', bg: '#3E2352', fg: '#FFFFFF', acc: '#F7A8C8', onAcc: '#3E2352', sub: '#E5D3EE', box: '#2E1A3D' },
  { id: 'cocoa', name: 'Nâu · cam đất', bg: '#4A2E1F', fg: '#FFF3E0', acc: '#E8A54B', onAcc: '#2B170C', sub: '#F2D3A8', box: '#3A2418' },
  { id: 'water', name: 'Trắng · xanh nước', bg: '#FFFFFF', fg: '#0E3B6B', acc: '#1565C0', onAcc: '#FFFFFF', sub: '#3D5A80', box: '#0E3B6B' },
  { id: 'pharma', name: 'Trắng · xanh dược', bg: '#FFFFFF', fg: '#0B5E45', acc: '#0B6E4F', onAcc: '#FFFFFF', sub: '#33544A', box: '#F2F2F2' },
  { id: 'ink', name: 'Đen · mù tạt', bg: '#151515', fg: '#FFFFFF', acc: '#E9B949', onAcc: '#151515', sub: '#D8D8D8', box: '#1C1C1C' },
];
export const dbPalette = (id: string) => DB_PALETTES.find((p) => p.id === id) || DB_PALETTES[0];

export const DB_BOX_COLORS: { id: string; name: string; color: string | null }[] = [
  { id: 'auto', name: 'Theo mẫu', color: null },
  { id: 'red', name: 'Đỏ', color: '#A3202B' },
  { id: 'black', name: 'Đen', color: '#1C1C1E' },
  { id: 'white', name: 'Trắng', color: '#EEEEEC' },
  { id: 'navy', name: 'Xanh navy', color: '#1B2A4A' },
  { id: 'gray', name: 'Xám', color: '#7B8088' },
];

export type DBIndustry = 'com' | 'pho' | 'taphoa' | 'thuoc' | 'hoa' | 'gas' | 'giatui';
export const DB_INDUSTRIES: { id: DBIndustry; name: string }[] = [
  { id: 'com', name: 'Quán cơm' }, { id: 'pho', name: 'Phở · bún' }, { id: 'taphoa', name: 'Tạp hoá · nước' }, { id: 'thuoc', name: 'Nhà thuốc' },
  { id: 'hoa', name: 'Hoa tươi' }, { id: 'gas', name: 'Gas · nước bình' }, { id: 'giatui', name: 'Giặt ủi' },
];

export type DBData = Record<string, string>;
const SAMPLES: Record<DBIndustry, DBData> = {
  com: { brand: 'Cơm nhà Bà Tư', service: 'Giao cơm tận nơi', items: 'Cơm tấm · Cơm gà · Canh chua', hotline: '0909 123 456', qr: 'https://zalo.me/0909123456', qrLabel: 'Quét Zalo đặt cơm' },
  pho: { brand: 'Phở Gia Khánh', service: 'Giao phở nóng', items: 'Phở tái · Phở chín · Bún bò', hotline: '0903 777 888', qr: 'https://zalo.me/0903777888', qrLabel: 'Quét Zalo đặt món' },
  taphoa: { brand: 'Tạp hoá An Khang', service: 'Giao hàng tận nhà', items: 'Gạo · Nước suối · Bia nước ngọt', hotline: '0938 222 333', qr: 'https://zalo.me/0938222333', qrLabel: 'Quét Zalo đặt hàng' },
  thuoc: { brand: 'Nhà thuốc Thu Hà', service: 'Giao thuốc tận nơi', items: 'Dược sĩ tư vấn miễn phí', hotline: '028 3822 1234', qr: 'https://nhathuocthuha.vn', qrLabel: 'Quét để đặt thuốc' },
  hoa: { brand: 'Hoa tươi Thu Hà', service: 'Giao hoa tận tay', items: 'Bó hoa · Lẵng khai trương · Hoa cưới', hotline: '0977 456 123', qr: 'https://zalo.me/0977456123', qrLabel: 'Quét Zalo đặt hoa' },
  gas: { brand: 'Gas Quốc Bảo', service: 'Giao gas · nước bình', items: 'Gas · Nước bình 20L · Lắp bếp', hotline: '0912 456 789', qr: 'https://zalo.me/0912456789', qrLabel: 'Quét Zalo gọi gas' },
  giatui: { brand: 'Giặt ủi Gia Khánh', service: 'Nhận & giao tận nhà', items: 'Giặt sấy · Ủi · Giặt chăn mền', hotline: '0905 321 654', qr: 'https://zalo.me/0905321654', qrLabel: 'Quét Zalo hẹn lấy đồ' },
};
export const sampleData = (ind: DBIndustry): DBData => ({ ...SAMPLES[ind] });

export interface DBField { key: string; label: string; ph?: string; half?: boolean }
export const DB_FIELDS: DBField[] = [
  { key: 'brand', label: 'Tên quán / cửa hàng (to nhất)', ph: 'Cơm nhà Bà Tư' },
  { key: 'service', label: 'Dòng dịch vụ', ph: 'Giao cơm tận nơi', half: true },
  { key: 'hotline', label: 'Hotline (chữ to nhất mặt sau)', ph: '0909 123 456', half: true },
  { key: 'items', label: 'Mặt hàng / món chính', ph: 'Cơm tấm · Cơm gà · Canh chua' },
  { key: 'qr', label: 'Link đặt hàng cho mã QR (Zalo, web… — để trống = không in QR)', ph: 'https://zalo.me/0909123456' },
  { key: 'qrLabel', label: 'Chữ dưới QR', ph: 'Quét Zalo đặt cơm', half: true },
];

export interface DBLayout { id: string; name: string }
export const DB_LAYOUTS: DBLayout[] = [
  { id: 'band', name: 'Dải giữa' },
  { id: 'split', name: 'Cột màu trái' },
  { id: 'speed', name: 'Vệt tốc độ' },
  { id: 'badge', name: 'Huy hiệu' },
];

export interface DBSpec { layout: string; palette: string; font: string; industry: DBIndustry; size: string; box: string; scooter: boolean }
export interface DBTemplate { id: string; name: string; spec: DBSpec }
const T = (id: string, name: string, layout: string, palette: string, font: string, industry: DBIndustry): DBTemplate => ({
  id, name, spec: { layout, palette, font, industry, size: '42', box: 'auto', scooter: true },
});
export const DB_TEMPLATES: DBTemplate[] = [
  T('com-band', 'Quán cơm · dải vàng', 'band', 'burgundy', 'bvp', 'com'),
  T('pho-badge', 'Phở · huy hiệu', 'badge', 'cream', 'baloo', 'pho'),
  T('com-speed', 'Cơm văn phòng · tốc độ', 'speed', 'navy', 'montserrat', 'com'),
  T('taphoa-split', 'Tạp hoá · cột màu', 'split', 'forest', 'bvp', 'taphoa'),
  T('taphoa-band', 'Nước uống · dải giữa', 'band', 'water', 'oswald', 'taphoa'),
  T('thuoc-band', 'Nhà thuốc · dải xanh', 'band', 'pharma', 'bvp', 'thuoc'),
  T('thuoc-split', 'Nhà thuốc · cột màu', 'split', 'pharma', 'montserrat', 'thuoc'),
  T('hoa-badge', 'Hoa tươi · huy hiệu', 'badge', 'plum', 'lobster', 'hoa'),
  T('hoa-speed', 'Hoa tươi · tốc độ', 'speed', 'cream', 'baloo', 'hoa'),
  T('gas-speed', 'Gas · nước bình', 'speed', 'water', 'oswald', 'gas'),
  T('gas-split', 'Gas · cột đen', 'split', 'ink', 'oswald', 'gas'),
  T('giatui-badge', 'Giặt ủi · huy hiệu', 'badge', 'cocoa', 'montserrat', 'giatui'),
];

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
/** bề rộng chữ (mm) ở cỡ size, ls = giãn chữ theo em */
export function measureW(text: string, fam: string, wt: number, size: number, ls = 0): number {
  const n = [...text].length;
  if (typeof document === 'undefined') return n * size * 0.6 + ls * size * Math.max(0, n - 1);
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return n * size * 0.6;
  mctx.font = `${wt} 100px "${fam}"`;
  return mctx.measureText(text).width * (size / 100) + ls * size * Math.max(0, n - 1);
}
const LH = 1.45; // dự phòng khi chưa đo được font
const metCache = new Map<string, { asc: number; desc: number }>();
/** ascent/descent thật của font (theo em) — để hộp chữ (kể cả dấu chồng) nằm gọn trong ô */
function fontMetrics(fam: string, wt: number): { asc: number; desc: number } {
  const k = `${wt} ${fam}`;
  const hit = metCache.get(k); if (hit) return hit;
  if (typeof document === 'undefined') return { asc: 1.05, desc: 0.4 };
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return { asc: 1.05, desc: 0.4 };
  mctx.font = `${wt} 100px "${fam}"`;
  const m = mctx.measureText('ẮÂỐ Ẹg');
  const v = { asc: (m.fontBoundingBoxAscent || 105) / 100, desc: (m.fontBoundingBoxDescent || 40) / 100 };
  if (document.fonts?.check?.(`${wt} 20px "${fam}"`)) metCache.set(k, v);
  return v;
}

interface Box { x: number; y: number; w: number; h: number }
interface TextOpts { fam: string; wt: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; max?: number; upper?: boolean; lines?: 1 | 2; testid?: string }

/** chia 2 dòng cân nhất */
function split2(text: string, fam: string, wt: number, ls: number): [string, string] | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return null;
  let best: [string, string] | null = null, bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measureW(a, fam, wt, 100, ls), measureW(b, fam, wt, 100, ls));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best;
}

/** chữ co vừa ô (1 hoặc 2 dòng) — trả node + cỡ chữ */
function fitText(text: string, b: Box, o: TextOpts): { node: ReactNode; size: number } {
  const t = o.upper ? text.toLocaleUpperCase('vi') : text;
  if (!t.trim() || b.w <= 0 || b.h <= 0) return { node: null, size: 0 };
  const ls = o.ls ?? 0;
  const fm = fontMetrics(o.fam, o.wt);
  const em = Math.max(fm.asc + fm.desc, 1.1) * 1.02;
  void LH;
  const one = Math.min(b.h / em, o.max ?? Infinity, b.w / Math.max(0.01, measureW(t, o.fam, o.wt, 1, ls)));
  let lines = [t], size = one;
  if ((o.lines ?? 1) === 2) {
    const sp = split2(t, o.fam, o.wt, ls);
    if (sp) {
      const two = Math.min(b.h / 2 / em, o.max ?? Infinity, ...sp.map((l) => b.w / Math.max(0.01, measureW(l, o.fam, o.wt, 1, ls))));
      if (two > one * 1.18) { lines = sp; size = two; }
    }
  }
  const anchor = o.anchor ?? 'middle';
  const x = anchor === 'middle' ? b.x + b.w / 2 : anchor === 'start' ? b.x : b.x + b.w;
  const rowH = b.h / lines.length;
  const node = (
    <g data-testid={o.testid}>
      {lines.map((ln, i) => (
        <text key={i} x={x} y={b.y + rowH * i + (rowH - (fm.asc + fm.desc) * size) / 2 + fm.asc * size} textAnchor={anchor} fontFamily={`"${o.fam}"`} fontWeight={o.wt}
          fontSize={size} fill={o.fill} letterSpacing={ls ? ls * size : undefined}>{ln}</text>
      ))}
    </g>
  );
  return { node, size };
}

// ---------- hình vẽ bằng code (hộp 100×100) ----------
function Icon({ ind, color, x, y, s }: { ind: DBIndustry; color: string; x: number; y: number; s: number }) {
  const k = s / 100;
  const sw = 6;
  let body: ReactNode;
  if (ind === 'com' || ind === 'pho') {
    body = (
      <g>
        {/* hơi nóng */}
        {[36, 50, 64].map((cx, i) => <path key={i} d={`M${cx} 34 c-6 -7 6 -11 0 -18 c-6 -7 6 -11 0 -16`} fill="none" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round" />)}
        {/* đôi đũa */}
        <path d="M58 40 L90 8 M66 44 L96 16" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round" />
        {/* tô */}
        <path d="M8 46 H92 C92 70 74 86 50 86 C26 86 8 70 8 46 Z" fill={color} />
        <rect x={34} y={88} width={32} height={7} rx={3} fill={color} />
      </g>
    );
  } else if (ind === 'taphoa') {
    body = (
      <g>
        <rect x={58} y={10} width={14} height={10} rx={2} fill={color} />
        <path d="M56 22 h18 v8 c6 4 8 10 8 16 v20 h-34 v-20 c0 -6 2 -12 8 -16 z" fill={color} />
        <path d="M14 40 L30 14 M86 40 L70 14" stroke={color} strokeWidth={sw} strokeLinecap="round" fill="none" />
        <path d="M6 42 H94 L84 92 H16 Z" fill={color} />
        {[30, 50, 70].map((cx) => <rect key={cx} x={cx - 3} y={52} width={6} height={30} rx={3} fill="#00000033" />)}
      </g>
    );
  } else if (ind === 'thuoc') {
    body = (
      <g>
        <path d="M36 6 h28 v30 h30 v28 h-30 v30 h-28 v-30 h-30 v-28 h30 z" fill={color} />
        <rect x={42} y={42} width={16} height={16} rx={3} fill="#00000022" />
      </g>
    );
  } else if (ind === 'hoa') {
    body = (
      <g>
        <path d="M50 58 C48 72 46 84 40 96" stroke={color} strokeWidth={sw} fill="none" strokeLinecap="round" />
        <path d="M46 78 C34 70 22 74 16 82 C28 88 40 86 46 78 Z" fill={color} />
        {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={50} cy={16} rx={13} ry={18} fill={color} transform={`rotate(${a} 50 36)`} />)}
        <circle cx={50} cy={36} r={9} fill="#00000033" />
      </g>
    );
  } else if (ind === 'gas') {
    body = (
      <g>
        {/* bình gas */}
        <rect x={12} y={16} width={22} height={8} rx={2} fill={color} />
        <path d="M8 34 C8 26 14 24 23 24 C32 24 38 26 38 34 V86 C38 92 34 94 23 94 C12 94 8 92 8 86 Z" fill={color} />
        <rect x={8} y={50} width={30} height={5} fill="#00000033" />
        {/* bình nước 20L */}
        <rect x={63} y={6} width={14} height={10} rx={2} fill={color} />
        <path d="M56 20 h28 c6 0 10 4 10 10 v56 c0 5 -4 8 -9 8 h-30 c-5 0 -9 -3 -9 -8 v-56 c0 -6 4 -10 10 -10 z" fill={color} />
        {[40, 58, 76].map((yy) => <rect key={yy} x={48} y={yy} width={44} height={4} fill="#00000026" />)}
      </g>
    );
  } else {
    // giặt ủi: móc + áo
    body = (
      <g>
        <path d="M50 22 c0 -6 4 -8 7 -8 c4 0 7 3 7 7 c0 5 -6 6 -14 12" fill="none" stroke={color} strokeWidth={sw * 0.8} strokeLinecap="round" />
        <path d="M50 30 L14 50 L22 64 L32 58 V94 H68 V58 L78 64 L86 50 Z" fill={color} />
        <path d="M42 34 C44 42 56 42 58 34" fill="#00000026" />
      </g>
    );
  }
  return <g transform={`translate(${x} ${y}) scale(${k})`}>{body}</g>;
}

/** bóng xe máy giao hàng (thùng sau) — dir 1: chạy sang phải, -1: sang trái. hộp 140×80 */
function Scooter({ color, x, y, s, dir = 1 }: { color: string; x: number; y: number; s: number; dir?: 1 | -1 }) {
  const k = s / 140;
  const tf = dir === 1 ? `translate(${x} ${y}) scale(${k})` : `translate(${x + s} ${y}) scale(${-k} ${k})`;
  return (
    <g transform={tf}>
      <circle cx={28} cy={64} r={15} fill="none" stroke={color} strokeWidth={7} />
      <circle cx={114} cy={64} r={15} fill="none" stroke={color} strokeWidth={7} />
      {/* thân + yên + thùng */}
      <path d="M14 56 C18 44 30 40 44 40 H70 L80 50 H96 L104 30 H112 L120 52 C126 56 128 60 128 64 H100 C98 54 90 50 84 56 H52 C48 50 40 46 34 48 C26 50 22 56 22 64 H14 Z" fill={color} />
      <rect x={8} y={12} width={38} height={30} rx={4} fill={color} />
      <path d="M100 30 L96 14 H108" fill="none" stroke={color} strokeWidth={6} strokeLinecap="round" />
    </g>
  );
}

/** vệt tốc độ (các vạch ngang bo đầu) — dir 1 vệt nằm phía TRÁI (xe chạy sang phải) */
function Speed({ color, x, y, w, h, n = 3, op = 1 }: { color: string; x: number; y: number; w: number; h: number; n?: number; op?: number }) {
  const gap = h / n;
  return (
    <g opacity={op}>
      {Array.from({ length: n }, (_, i) => {
        const lw = w * (1 - i * 0.22);
        const th = gap * 0.42;
        return <rect key={i} x={x + (w - lw)} y={y + i * gap + (gap - th) / 2} width={lw} height={th} rx={th / 2} fill={color} />;
      })}
    </g>
  );
}

function Phone({ color, x, y, s }: { color: string; x: number; y: number; s: number }) {
  const k = s / 100;
  return (
    <g transform={`translate(${x} ${y}) scale(${k})`}>
      <path d="M28 8 C22 8 14 12 12 20 C8 40 22 66 42 82 C54 92 70 96 82 90 C88 86 92 80 90 74 L86 64 C84 60 80 58 76 60 L64 66 C60 68 56 66 52 62 C44 56 38 48 34 40 C32 36 32 32 36 30 L46 22 C50 20 50 16 48 12 L42 4 C38 0 32 6 28 8 Z" fill={color} />
    </g>
  );
}

/** thẻ QR nền trắng + chữ dưới */
function QrCard({ text, label, x, y, w, ink }: { text: string; label: string; x: number; y: number; w: number; ink: string }) {
  const q = qrPath(text);
  const pad = w * 0.07;
  const qs = w - pad * 2;
  const capH = label.trim() ? w * (label.trim().length > 22 ? 0.3 : 0.2) : 0;
  const h = w + capH;
  const cap = capH ? fitText(label, { x: x + pad * 0.5, y: y + w - pad * 0.4, w: w - pad, h: capH }, { fam: BODY, wt: 800, fill: '#111111', lines: 2 }) : null;
  return (
    <g data-testid="db-qrcard">
      <rect x={x} y={y} width={w} height={h} rx={w * 0.08} fill="#FFFFFF" stroke={ink} strokeOpacity={0.15} strokeWidth={w * 0.01} />
      <path d={q.d} transform={`translate(${x + pad} ${y + pad}) scale(${qs / q.n})`} fill="#111111" />
      {cap?.node}
    </g>
  );
}
export const qrCardH = (w: number, label: string) => w + (label.trim() ? w * (label.trim().length > 22 ? 0.3 : 0.2) : 0);

function LogoImg({ src, x, y, s, round = true }: { src: string; x: number; y: number; s: number; round?: boolean }) {
  return (
    <g>
      {round && <circle cx={x + s / 2} cy={y + s / 2} r={s / 2} fill="#FFFFFF" />}
      <image href={src} x={x + s * 0.14} y={y + s * 0.14} width={s * 0.72} height={s * 0.72} preserveAspectRatio="xMidYMid meet" />
    </g>
  );
}

/** khối hotline: icon điện thoại + số (Oswald) — co vừa ô */
function Hotline({ num, b, fill, iconColor, anchor = 'start', label, labelFill }: { num: string; b: Box; fill: string; iconColor: string; anchor?: 'start' | 'middle'; label?: string; labelFill?: string }) {
  if (!num.trim()) return null;
  const labH = label ? b.h * 0.26 : 0;
  const body: Box = { x: b.x, y: b.y + labH, w: b.w, h: b.h - labH };
  const icon = Math.min(body.h * 0.62, body.w * 0.16);
  const gap = icon * 0.22;
  const numBox: Box = { x: body.x + icon + gap, y: body.y, w: body.w - icon - gap, h: body.h };
  const t = fitText(num, numBox, { fam: NUM, wt: 700, fill, anchor: 'start', ls: 0.01, testid: 'db-hotline' });
  const tw = measureW(num, NUM, 700, t.size, 0.01);
  const total = icon + gap + tw;
  const shift = anchor === 'middle' ? Math.max(0, (body.w - total) / 2) : 0;
  const lab = label ? fitText(label, { x: b.x + shift, y: b.y, w: Math.max(total, b.w * 0.4), h: labH }, { fam: BODY, wt: 800, fill: labelFill ?? fill, anchor: 'start', ls: 0.08, upper: true }) : null;
  return (
    <g>
      {lab?.node}
      <g transform={`translate(${shift} 0)`}>
        <Phone color={iconColor} x={body.x} y={body.y + (body.h - icon) / 2} s={icon} />
        {t.node}
      </g>
    </g>
  );
}

// ---------- vẽ 1 mặt decal ----------
interface FaceCtx { w: number; h: number; p: DBPalette; f: DBFont; d: DBData; spec: DBSpec; logo: string; face: DBFace }

function backFace(c: FaceCtx): ReactNode {
  const { w, h, p, f, d, spec, logo } = c;
  const pad = Math.min(w, h) * 0.065;
  const hasQr = !!(d.qr || '').trim();
  const qrW = hasQr ? (spec.layout === 'badge' ? Math.min(h * 0.26, w * 0.24) : Math.min(h * 0.28, w * 0.26)) : 0;
  const qrH = hasQr ? qrCardH(qrW, d.qrLabel || '') : 0;
  const brandOpts = { fam: f.family, wt: f.weight, fill: p.fg, upper: f.upper, lines: 2 as const, testid: 'db-brand' };
  const service = (b: Box, fill: string) => fitText(d.service || '', b, { fam: BODY, wt: 800, fill, upper: true, ls: 0.04, testid: 'db-service' }).node;
  const items = (b: Box, fill: string, anchor: 'start' | 'middle' = 'middle') => fitText(d.items || '', b, { fam: BODY, wt: 600, fill, anchor, testid: 'db-items' }).node;
  const icon = (x: number, y: number, s: number, color: string) => logo ? <LogoImg src={logo} x={x} y={y} s={s} /> : <Icon ind={spec.industry} color={color} x={x} y={y} s={s} />;

  if (spec.layout === 'split') {
    const cw = w * 0.34;
    const rx = cw + pad, rw = w - rx - pad;
    const ic = Math.min(cw * 0.56, h * (hasQr ? 0.24 : 0.3));
    return (
      <>
        <rect x={0} y={0} width={cw} height={h} fill={p.acc} />
        {icon((cw - ic) / 2, h * 0.1, ic, p.onAcc)}
        {fitText('Giao nhanh', { x: pad * 0.6, y: h * 0.1 + ic + h * 0.05, w: cw - pad * 1.2, h: h * 0.1 }, { fam: BODY, wt: 800, fill: p.onAcc, upper: true, ls: 0.06 }).node}
        {hasQr
          ? <QrCard text={d.qr} label={d.qrLabel || ''} x={(cw - Math.min(cw * 0.8, h * 0.32)) / 2} y={h - pad - qrCardH(Math.min(cw * 0.8, h * 0.32), d.qrLabel || '')} w={Math.min(cw * 0.8, h * 0.32)} ink={p.fg} />
          : <><Scooter color={p.onAcc} x={cw * 0.14} y={h * 0.66} s={cw * 0.72} /><Speed color={p.onAcc} x={cw * 0.04} y={h * 0.86} w={cw * 0.5} h={h * 0.08} n={2} op={0.55} /></>}
        {fitText(d.brand || '', { x: rx, y: pad, w: rw, h: h * 0.3 }, { ...brandOpts, anchor: 'start' }).node}
        {service({ x: rx, y: pad + h * 0.31, w: rw, h: h * 0.1 }, p.acc)}
        {items({ x: rx, y: pad + h * 0.42, w: rw, h: h * 0.08 }, p.sub, 'start')}
        <Hotline num={d.hotline || ''} label="Gọi đặt hàng" labelFill={p.sub} b={{ x: rx, y: h - pad - h * 0.3, w: rw, h: h * 0.3 }} fill={p.fg} iconColor={p.acc} />
      </>
    );
  }

  if (spec.layout === 'speed') {
    return (
      <>
        {/* vệt tốc độ chéo nền */}
        <g opacity={0.16}>
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={-w * 0.2 + i * w * 0.2} y={-h * 0.2} width={w * 0.07} height={h * 1.5} fill={p.acc} transform={`rotate(28 ${w / 2} ${h / 2})`} />)}
        </g>
        <Speed color={p.acc} x={pad * 0.6} y={pad + h * 0.04} w={w * 0.08} h={h * 0.12} n={3} />
        <Scooter color={p.acc} x={pad * 0.6 + w * 0.085} y={pad + h * 0.03} s={w * 0.15} />
        {fitText(d.brand || '', { x: pad + w * 0.25, y: pad * 0.7, w: w - pad * 2 - w * 0.25, h: h * 0.3 }, { ...brandOpts, anchor: 'start' }).node}
        <rect x={pad} y={h * 0.38} width={w - pad * 2} height={h * 0.13} rx={h * 0.065} fill={p.acc} />
        {service({ x: pad * 2, y: h * 0.38, w: w - pad * 4, h: h * 0.13 }, p.onAcc)}
        {items({ x: pad, y: h * 0.53, w: w - pad * 2 - (hasQr ? qrW + pad : 0), h: h * 0.08 }, p.sub, 'start')}
        <Hotline num={d.hotline || ''} label="Gọi đặt hàng" labelFill={p.sub} b={{ x: pad, y: h * 0.63, w: w - pad * 2 - (hasQr ? qrW + pad * 0.6 : 0), h: h * 0.3 }} fill={p.fg} iconColor={p.acc} />
        {hasQr && <QrCard text={d.qr} label={d.qrLabel || ''} x={w - pad - qrW} y={h - pad - qrH} w={qrW} ink={p.fg} />}
      </>
    );
  }

  if (spec.layout === 'badge') {
    const r = Math.min(h * 0.17, w * 0.2);
    const cx = hasQr ? (w - qrW - pad) / 2 + pad * 0.2 : w / 2;
    const bandY = h * 0.74;
    return (
      <>
        <circle cx={cx} cy={pad + r} r={r} fill={p.acc} />
        <circle cx={cx} cy={pad + r} r={r * 0.88} fill="none" stroke={p.onAcc} strokeWidth={r * 0.03} strokeDasharray={`${r * 0.08} ${r * 0.06}`} />
        {icon(cx - r * 0.58, pad + r * 0.42, r * 1.16, p.onAcc)}
        {hasQr && <QrCard text={d.qr} label={d.qrLabel || ''} x={w - pad - qrW} y={pad} w={qrW} ink={p.fg} />}
        {fitText(d.brand || '', { x: pad, y: pad + r * 2 + h * 0.015, w: w - pad * 2, h: h * 0.2 }, brandOpts).node}
        {service({ x: pad, y: pad + r * 2 + h * 0.225, w: w - pad * 2, h: h * 0.075 }, p.acc)}
        <rect x={0} y={bandY} width={w} height={h - bandY} fill={p.acc} />
        <Hotline num={d.hotline || ''} b={{ x: pad, y: bandY + (h - bandY) * 0.12, w: w - pad * 2, h: (h - bandY) * 0.76 }} fill={p.onAcc} iconColor={p.onAcc} anchor="middle" />
      </>
    );
  }

  // band (mặc định)
  const ic = h * 0.22;
  const bandY = h * 0.37, bandH = h * 0.14;
  return (
    <>
      {icon(pad, pad + (h * 0.3 - ic) / 2, ic, p.acc)}
      {fitText(d.brand || '', { x: pad + ic + pad * 0.6, y: pad * 0.7, w: w - pad * 2.6 - ic, h: h * 0.3 }, { ...brandOpts, anchor: 'start' }).node}
      <rect x={0} y={bandY} width={w} height={bandH} fill={p.acc} />
      <Speed color={p.onAcc} x={pad * 0.5} y={bandY + bandH * 0.2} w={w * 0.1} h={bandH * 0.6} n={3} op={0.5} />
      {service({ x: w * 0.13, y: bandY, w: w * 0.74, h: bandH }, p.onAcc)}
      {items({ x: pad, y: bandY + bandH + h * 0.03, w: w - pad * 2 - (hasQr ? qrW + pad : 0), h: h * 0.08 }, p.sub, hasQr ? 'start' : 'middle')}
      <Hotline num={d.hotline || ''} label="Hotline đặt hàng" labelFill={p.sub} b={{ x: pad, y: h - pad - h * 0.28, w: w - pad * 2 - (hasQr ? qrW + pad * 0.6 : 0), h: h * 0.28 }} fill={p.fg} iconColor={p.acc} anchor={hasQr ? 'start' : 'middle'} />
      {hasQr && <QrCard text={d.qr} label={d.qrLabel || ''} x={w - pad - qrW} y={h - pad - qrH} w={qrW} ink={p.fg} />}
    </>
  );
}

function sideFace(c: FaceCtx): ReactNode {
  const { w, h, p, f, d, spec, logo, face } = c;
  const pad = Math.min(w, h) * 0.07;
  const dir: 1 | -1 = face === 'right' ? 1 : -1; // hông phải: đầu xe ở bên phải người nhìn
  const ic = h * 0.24;
  const bandY = h * 0.42, bandH = h * 0.15;
  const sc = Math.min(w * 0.26, h * 0.24);
  return (
    <>
      {spec.layout === 'speed' && (
        <g opacity={0.14}>
          {[0, 1, 2, 3].map((i) => <rect key={i} x={-w * 0.1 + i * w * 0.28} y={-h * 0.2} width={w * 0.08} height={h * 1.5} fill={p.acc} transform={`rotate(${28 * dir} ${w / 2} ${h / 2})`} />)}
        </g>
      )}
      {spec.layout === 'split' && <rect x={dir === 1 ? 0 : w - w * 0.06} y={0} width={w * 0.06} height={h} fill={p.acc} />}
      {logo ? <LogoImg src={logo} x={pad} y={pad + (bandY - pad * 2 - ic) / 2} s={ic} /> : <Icon ind={spec.industry} color={p.acc} x={pad} y={pad + (bandY - pad * 2 - ic) / 2} s={ic} />}
      {fitText(d.brand || '', { x: pad * 1.6 + ic, y: pad * 0.8, w: w - pad * 2.6 - ic, h: bandY - pad * 0.8 - h * 0.03 }, { fam: f.family, wt: f.weight, fill: p.fg, upper: f.upper, lines: 2, testid: 'db-brand' }).node}
      <rect x={0} y={bandY} width={w} height={bandH} fill={p.acc} />
      <Scooter color={p.onAcc} x={dir === 1 ? w - pad * 0.4 - sc : pad * 0.4} y={bandY + (bandH - sc * 0.6) / 2} s={sc} dir={dir} />
      {fitText(d.service || '', dir === 1 ? { x: pad * 0.6, y: bandY, w: w - sc - pad * 1.6, h: bandH } : { x: pad + sc, y: bandY, w: w - sc - pad * 1.6, h: bandH }, { fam: BODY, wt: 800, fill: p.onAcc, upper: true, ls: 0.03, testid: 'db-service' }).node}
      <Hotline num={d.hotline || ''} label="Gọi đặt hàng" labelFill={p.sub} b={{ x: pad, y: bandY + bandH + h * 0.06, w: w - pad * 2, h: h - pad - (bandY + bandH + h * 0.06) }} fill={p.fg} iconColor={p.acc} anchor="middle" />
    </>
  );
}

function topFace(c: FaceCtx): ReactNode {
  const { w, h, p, f, d } = c;
  const pad = Math.min(w, h) * 0.08;
  return (
    <>
      <rect x={pad * 0.5} y={pad * 0.5} width={w - pad} height={h - pad} rx={pad * 0.6} fill="none" stroke={p.acc} strokeWidth={pad * 0.18} />
      {fitText(d.brand || '', { x: pad * 1.4, y: pad * 1.4, w: w - pad * 2.8, h: h * 0.4 }, { fam: f.family, wt: f.weight, fill: p.fg, upper: f.upper, lines: 2, testid: 'db-brand' }).node}
      {fitText(d.service || '', { x: pad * 1.4, y: pad * 1.4 + h * 0.42, w: w - pad * 2.8, h: h * 0.1 }, { fam: BODY, wt: 800, fill: p.acc, upper: true, ls: 0.04, testid: 'db-service' }).node}
      <Hotline num={d.hotline || ''} b={{ x: pad * 1.4, y: h * 0.62, w: w - pad * 2.8, h: h * 0.26 }} fill={p.fg} iconColor={p.acc} anchor="middle" />
    </>
  );
}

let uid = 0;
export function DeliveryDecalSvg({ spec, data, face, logo = '', mode = 'preview', cut = false, style }: {
  spec: DBSpec; data: DBData; face: DBFace; logo?: string; mode?: DBMode; cut?: boolean; style?: CSSProperties;
}) {
  const [id] = useState(() => `db${++uid}`);
  const sz = dbSize(spec.size);
  const { w, h } = decalDims(sz, face);
  const p = dbPalette(spec.palette), f = dbFont(spec.font);
  const b = mode === 'print' ? DB_BLEED_MM : 0;
  const ctx: FaceCtx = { w, h, p, f, d: data, spec, logo, face };
  const body = face === 'back' ? backFace(ctx) : face === 'top' ? topFace(ctx) : sideFace(ctx);
  const r = DB_RADIUS;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-b} ${-b} ${w + b * 2} ${h + b * 2}`} width={`${w + b * 2}mm`} height={`${h + b * 2}mm`}
      style={style} data-face={face} data-w={w} data-h={h}>
      <defs>
        <clipPath id={`${id}-c`}>{mode === 'print' ? <rect x={-b} y={-b} width={w + b * 2} height={h + b * 2} /> : <rect x={0} y={0} width={w} height={h} rx={r} />}</clipPath>
      </defs>
      <g id="In" clipPath={`url(#${id}-c)`}>
        <rect x={-b} y={-b} width={w + b * 2} height={h + b * 2} fill={p.bg} />
        {body}
      </g>
      {mode === 'preview' && <rect x={0} y={0} width={w} height={h} rx={r} fill="none" stroke="#000" strokeOpacity={0.12} strokeWidth={0.8} />}
      {mode === 'print' && cut && (
        <g id="CutContour"><rect x={0} y={0} width={w} height={h} rx={r} fill="none" stroke="#FF00FF" strokeWidth={0.25} /></g>
      )}
    </svg>
  );
}
