'use client';
// Voucher / phiếu quà tặng · Thẻ tích điểm · Coupon giảm giá — 1 engine SVG = LOẠI × BỐ CỤC × CHỦ ĐỀ (hoạ tiết vẽ code)
// × BẢNG MÀU × FONT. Mỗi tấm 1 MÃ SỐ riêng (tiền tố + số chạy) → tờ in hàng loạt 32,5×43 có số khác nhau từng tấm.
// Ép kim: vùng màu vàng = lớp nhũ (xem trước có ánh kim, file in có thêm trang "khuôn ép kim" đen/trắng).
// Đơn vị: 10px = 1mm. Render 100% bằng code, không gọi AI.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';
import { qrPath } from './flyer-qr';

export const U = 10; // px / mm
export const VC_BLEED_MM = 2;
export const PERF = '#00A3E0';      // màu nét răng cưa (bế xé) trong file kỹ thuật
export const CUTCONTOUR = '#EC008C';

export type VCKind = 'voucher' | 'loyalty' | 'coupon';
export const VC_KINDS: { id: VCKind; name: string; note: string }[] = [
  { id: 'voucher', name: 'Phiếu quà tặng', note: 'Voucher có cuống lưu (xé theo đường răng cưa)' },
  { id: 'loyalty', name: 'Thẻ tích điểm', note: 'Thẻ nhựa khổ ATM, mặt sau ô đóng dấu' },
  { id: 'coupon', name: 'Coupon giảm giá', note: 'Phiếu giảm giá phát tay / kèm đơn hàng' },
];

export interface VCSize { id: string; kind: VCKind; name: string; wMm: number; hMm: number; stubMm?: number; radiusMm?: number }
export const VC_SIZES: VCSize[] = [
  { id: 'dl', kind: 'voucher', name: '210 × 99 mm (DL)', wMm: 210, hMm: 99, stubMm: 55 },
  { id: 'v180', kind: 'voucher', name: '180 × 80 mm', wMm: 180, hMm: 80, stubMm: 48 },
  { id: 'card', kind: 'loyalty', name: '85,6 × 54 mm (thẻ ATM)', wMm: 85.6, hMm: 54, radiusMm: 3 },
  { id: 'c90', kind: 'coupon', name: '90 × 55 mm', wMm: 90, hMm: 55 },
  { id: 'a6', kind: 'coupon', name: 'A6 148 × 105 mm', wMm: 148, hMm: 105 },
];
export const vcSize = (id: string) => VC_SIZES.find((s) => s.id === id) || VC_SIZES[0];
export const sizesOf = (k: VCKind) => VC_SIZES.filter((s) => s.kind === k);

// ---------- font ----------
export interface VCFont { id: string; name: string; family: string; weight: number }
export const VC_FONTS: VCFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const vcFont = (id: string) => VC_FONTS.find((f) => f.id === id) || VC_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';

export const VC_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Great+Vibes&display=swap');`;

export function useVCFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-vc-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-vc-fonts'; link.rel = 'stylesheet';
        link.href = VC_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...VC_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `400 40px "${SCRIPT}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
// bg = màu chủ đạo, paper = vùng sáng, ink/sub = chữ trên nền sáng, onBg = chữ trên nền màu, gold = nhũ / điểm nhấn
export interface VCPalette { id: string; name: string; bg: string; bg2: string; paper: string; ink: string; sub: string; gold: string; onBg: string }
export const VC_PALETTES: VCPalette[] = [
  { id: 'rose', name: 'Hồng nude', bg: '#B65A6C', bg2: '#8E3F50', paper: '#FFF7F4', ink: '#3B1F22', sub: '#8A6662', gold: '#C9A063', onBg: '#FFFFFF' },
  { id: 'wine', name: 'Đỏ rượu', bg: '#4A1419', bg2: '#2C0A0E', paper: '#FBF5EC', ink: '#2A1A14', sub: '#7A6555', gold: '#D9B468', onBg: '#F8EEDC' },
  { id: 'ivory', name: 'Ngà cưới', bg: '#EDE3D2', bg2: '#DCCDB3', paper: '#FFFDF8', ink: '#3E3428', sub: '#8A7B66', gold: '#B38E52', onBg: '#3E3428' },
  { id: 'red', name: 'Đỏ Tết', bg: '#B3121F', bg2: '#7E0A14', paper: '#FFF7EC', ink: '#3A1210', sub: '#7A4B40', gold: '#E9C36B', onBg: '#FFF4DA' },
  { id: 'noir', name: 'Đen sang', bg: '#151515', bg2: '#000000', paper: '#F5F3EF', ink: '#151515', sub: '#6B6B6B', gold: '#CFAE6B', onBg: '#FFFFFF' },
  { id: 'coffee', name: 'Nâu cà phê', bg: '#4A3326', bg2: '#2F1F16', paper: '#F7F0E6', ink: '#2F1F16', sub: '#7D6655', gold: '#DDA85E', onBg: '#F7F0E6' },
  { id: 'forest', name: 'Xanh rừng', bg: '#1F4D3A', bg2: '#133426', paper: '#F3F6EF', ink: '#16261D', sub: '#5D6E62', gold: '#E4B95B', onBg: '#FFFFFF' },
  { id: 'navy', name: 'Navy', bg: '#1C2E55', bg2: '#111D3A', paper: '#F5F7FB', ink: '#14213D', sub: '#5A6680', gold: '#D6B25E', onBg: '#FFFFFF' },
];
export const vcPalette = (id: string) => VC_PALETTES.find((p) => p.id === id) || VC_PALETTES[0];

// ---------- chủ đề (hoạ tiết + nội dung mẫu theo ngành) ----------
export type VCTheme = 'spa' | 'nhahang' | 'cafe' | 'cuoi' | 'tet' | 'thoitrang';
export const VC_THEMES: { id: VCTheme; name: string }[] = [
  { id: 'spa', name: 'Spa · làm đẹp' }, { id: 'nhahang', name: 'Nhà hàng' }, { id: 'cafe', name: 'Cà phê · trà' },
  { id: 'cuoi', name: 'Tiệc cưới' }, { id: 'tet', name: 'Tết' }, { id: 'thoitrang', name: 'Thời trang' },
];

export type VCData = Record<string, string>;
const COMMON = { expiry: '31/03/2027', prefix: 'VC', start: '1', count: '200' };
const THEME_DATA: Record<VCTheme, VCData> = {
  spa: {
    brand: 'THU HÀ SPA', tagline: 'CHĂM SÓC DA · THƯ GIÃN', vValue: '500.000đ', vNote: 'Áp dụng cho mọi liệu trình chăm sóc da',
    cValue: 'GIẢM 30%', cNote: 'Cho liệu trình đầu tiên tại spa', reward: 'Tặng 1 buổi chăm sóc da 60 phút',
    cond: 'Không quy đổi thành tiền mặt\nKhông áp dụng cùng ưu đãi khác\nVui lòng đặt lịch trước 1 ngày',
    hotline: '0909 246 135', address: '25 Lê Thánh Tôn, Q.1, TP.HCM', website: 'thuhaspa.vn', prefix: 'TH',
  },
  nhahang: {
    brand: 'BẾP QUỐC BẢO', tagline: 'ẨM THỰC VIỆT TINH TẾ', vValue: '1.000.000đ', vNote: 'Dùng cho bữa tối dành cho 2 người',
    cValue: 'GIẢM 15%', cNote: 'Cho hoá đơn từ 500.000đ', reward: 'Tặng 1 phần tráng miệng',
    cond: 'Áp dụng tất cả các ngày trong tuần\nVui lòng đặt bàn trước qua hotline\nKhông quy đổi thành tiền mặt',
    hotline: '0938 118 822', address: '88 Pasteur, Q.3, TP.HCM', website: 'bepquocbao.vn', prefix: 'QB',
  },
  cafe: {
    brand: 'MỘC AN COFFEE', tagline: 'CÀ PHÊ RANG MỘC', vValue: '200.000đ', vNote: 'Dùng cho mọi đồ uống & bánh tại quán',
    cValue: 'MUA 1 TẶNG 1', cNote: 'Áp dụng cho đồ uống size M', reward: 'Tặng 1 ly bất kỳ',
    cond: 'Mỗi ly được đóng 1 dấu\nĐủ ô nhận quà tại quầy\nThẻ không quy đổi thành tiền mặt',
    hotline: '0901 357 246', address: '14 Trần Quang Khải, Q.1, TP.HCM', website: 'mocancoffee.vn', prefix: 'MA',
  },
  cuoi: {
    brand: 'GIA KHÁNH WEDDING', tagline: 'STUDIO · VÁY CƯỚI · TIỆC', vValue: '2.000.000đ', vNote: 'Trừ trực tiếp vào gói chụp ảnh cưới',
    cValue: 'GIẢM 10%', cNote: 'Cho gói váy cưới & trang điểm', reward: 'Tặng 1 album ảnh 30×30',
    cond: 'Áp dụng khi ký hợp đồng trước 30/06/2027\nMỗi cặp đôi dùng 1 phiếu\nKhông quy đổi thành tiền mặt',
    hotline: '0912 468 579', address: '120 Hai Bà Trưng, Q.1, TP.HCM', website: 'giakhanhwedding.vn', prefix: 'GK',
  },
  tet: {
    brand: 'AN KHANG MART', tagline: 'QUÀ TẾT ĐINH MÙI 2027', vValue: '500.000đ', vNote: 'Mua sắm quà Tết tại hệ thống cửa hàng',
    cValue: 'GIẢM 20%', cNote: 'Cho đơn hàng từ 300.000đ', reward: 'Tặng 1 hộp mứt Tết',
    cond: 'Áp dụng đến hết mùng 10 Tết\nMỗi hoá đơn dùng 1 phiếu\nKhông quy đổi thành tiền mặt',
    hotline: '1900 6868', address: '45 Nguyễn Trãi, Q.5, TP.HCM', website: 'ankhangmart.vn', prefix: 'AK', expiry: '17/02/2027',
  },
  thoitrang: {
    brand: 'LUNA STORE', tagline: 'THỜI TRANG NỮ', vValue: '300.000đ', vNote: 'Cho hoá đơn từ 1.000.000đ',
    cValue: 'SALE 25%', cNote: 'Toàn bộ bộ sưu tập Xuân Hè', reward: 'Tặng 1 voucher 200.000đ',
    cond: 'Áp dụng tại cửa hàng & online\nKhông áp dụng hàng đang giảm giá\nCòn hạn sử dụng ghi trên phiếu',
    hotline: '0987 654 321', address: '210 Nguyễn Thị Minh Khai, Q.3, TP.HCM', website: 'lunastore.vn', prefix: 'LN',
  },
};
const KIND_TITLE: Record<VCKind, string> = { voucher: 'PHIẾU QUÀ TẶNG', loyalty: 'THẺ TÍCH ĐIỂM', coupon: 'COUPON' };

/** nội dung mẫu đúng loại + ngành (giá trị voucher ≠ giá trị coupon) */
export function sampleData(kind: VCKind, theme: VCTheme): VCData {
  const t = THEME_DATA[theme];
  return {
    ...COMMON, ...t, title: KIND_TITLE[kind],
    value: kind === 'coupon' ? t.cValue : t.vValue,
    valueNote: kind === 'coupon' ? t.cNote : t.vNote,
  };
}

export interface VCField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; kinds: VCKind[] }
export const VC_FIELDS: VCField[] = [
  { key: 'brand', label: 'Tên thương hiệu', kinds: ['voucher', 'loyalty', 'coupon'], half: true },
  { key: 'tagline', label: 'Dòng nhỏ dưới tên', kinds: ['voucher', 'loyalty', 'coupon'], half: true },
  { key: 'title', label: 'Tiêu đề', kinds: ['voucher', 'loyalty', 'coupon'], half: true },
  { key: 'value', label: 'Giá trị / ưu đãi (to nhất)', ph: '500.000đ · GIẢM 20%', kinds: ['voucher', 'coupon'], half: true },
  { key: 'valueNote', label: 'Áp dụng cho', kinds: ['voucher', 'coupon'] },
  { key: 'reward', label: 'Quà khi đủ dấu', ph: 'Tặng 1 ly bất kỳ', kinds: ['loyalty'] },
  { key: 'cond', label: 'Điều kiện (mỗi dòng 1 ý)', multiline: true, kinds: ['voucher', 'loyalty', 'coupon'] },
  { key: 'expiry', label: 'Hạn sử dụng', ph: '31/03/2027', kinds: ['voucher', 'loyalty', 'coupon'], half: true },
  { key: 'hotline', label: 'Hotline', kinds: ['voucher', 'loyalty', 'coupon'], half: true },
  { key: 'address', label: 'Địa chỉ', kinds: ['voucher', 'loyalty', 'coupon'] },
  { key: 'website', label: 'Website / fanpage (tạo mã QR)', kinds: ['voucher', 'loyalty', 'coupon'] },
];

// ---------- mẫu ----------
export interface VCSpec { kind: VCKind; layout: string; theme: VCTheme; palette: string; font: string; size: string; foil: boolean; goal: number }
export interface VCTemplate { id: string; name: string; spec: Omit<VCSpec, 'size' | 'goal'> }
export const VC_LAYOUTS: Record<VCKind, { id: string; name: string }[]> = {
  voucher: [{ id: 'bold', name: 'Nền màu đậm' }, { id: 'frame', name: 'Khung viền thanh lịch' }],
  loyalty: [{ id: 'band', name: 'Lệch trái' }, { id: 'center', name: 'Canh giữa' }],
  coupon: [{ id: 'ticket', name: 'Vé xé' }],
};
const T = (id: string, name: string, kind: VCKind, layout: string, theme: VCTheme, palette: string, font: string, foil: boolean): VCTemplate =>
  ({ id, name, spec: { kind, layout, theme, palette, font, foil } });
export const VC_TEMPLATES: VCTemplate[] = [
  T('v-spa', 'Spa · hồng nude', 'voucher', 'frame', 'spa', 'rose', 'playfair', true),
  T('v-nhahang', 'Nhà hàng · đỏ rượu', 'voucher', 'bold', 'nhahang', 'wine', 'playfair', true),
  T('v-cuoi', 'Tiệc cưới · ngà', 'voucher', 'frame', 'cuoi', 'ivory', 'cormorant', true),
  T('v-tet', 'Tết · đỏ kim', 'voucher', 'bold', 'tet', 'red', 'montserrat', true),
  T('v-thoitrang', 'Thời trang · đen', 'voucher', 'bold', 'thoitrang', 'noir', 'oswald', false),
  T('l-cafe', 'Cà phê · nâu', 'loyalty', 'band', 'cafe', 'coffee', 'montserrat', false),
  T('l-spa', 'Spa · hồng', 'loyalty', 'center', 'spa', 'rose', 'playfair', true),
  T('l-thoitrang', 'Thời trang · đen vàng', 'loyalty', 'band', 'thoitrang', 'noir', 'oswald', true),
  T('l-tra', 'Cà phê · xanh rừng', 'loyalty', 'center', 'cafe', 'forest', 'baloo', false),
  T('c-cafe', 'Cà phê · nâu', 'coupon', 'ticket', 'cafe', 'coffee', 'baloo', false),
  T('c-thoitrang', 'Thời trang · đen', 'coupon', 'ticket', 'thoitrang', 'noir', 'oswald', false),
  T('c-tet', 'Tết · đỏ', 'coupon', 'ticket', 'tet', 'red', 'montserrat', true),
  T('c-nhahang', 'Nhà hàng · navy', 'coupon', 'ticket', 'nhahang', 'navy', 'playfair', true),
];
export const GOALS = [8, 10, 12];

// ---------- mã số ----------
export const vcCount = (d: VCData) => Math.min(2000, Math.max(1, parseInt(d.count || '1', 10) || 1));
export const serialOf = (d: VCData, i: number) => {
  const start = Math.max(0, parseInt(d.start || '1', 10) || 0);
  return `${(d.prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}${String(start + i).padStart(5, '0')}`;
};
/** mặt mang mã số: thẻ tích điểm in số ở mặt sau, voucher/coupon ở mặt trước */
export const serialSide = (k: VCKind): 'front' | 'back' => (k === 'loyalty' ? 'back' : 'front');

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW ? (size * maxW) / w : size; };
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || textW(next, size, ts) <= maxW) cur = next; else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.5) { s *= 0.93; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = lines.slice(0, maxLines);
  // dòng nào vẫn quá dài (1 từ rất dài) → co cả khối cho vừa
  const widest = Math.max(0, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
const splitLines = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const qrUrl = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${w.trim()}`);
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
const f1 = (n: number) => Math.round(n * 10) / 10;

// ---------- hoạ tiết theo ngành (vẽ code) ----------
interface Box { x: number; y: number; w: number; h: number }
function Motif({ theme, b, c, c2, id }: { theme: VCTheme; b: Box; c: string; c2: string; id: string }) {
  const s = Math.min(b.w, b.h);
  const P = (fx: number, fy: number) => [b.x + b.w * fx, b.y + b.h * fy] as const;
  let art: ReactNode = null;
  if (theme === 'spa') {
    // cành lá cong
    const [x0, y0] = P(0.15, 0.98), [x1, y1] = P(0.55, 0.45), [x2, y2] = P(0.98, 0.05);
    const leaves = Array.from({ length: 9 }, (_, i) => {
      const t = 0.12 + i * 0.1;
      const x = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * x1 + t * t * x2;
      const y = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * y1 + t * t * y2;
      const side = i % 2 ? 1 : -1;
      const ang = -50 + side * 42;
      const L = s * (0.15 - i * 0.006);
      return <ellipse key={i} cx={x + side * L * 0.45} cy={y - L * 0.15} rx={L * 0.55} ry={L * 0.2} transform={`rotate(${ang} ${x + side * L * 0.45} ${y - L * 0.15})`} fill={i % 3 === 0 ? c2 : c} />;
    });
    art = <><path d={`M${x0} ${y0}Q${x1} ${y1} ${x2} ${y2}`} stroke={c} strokeWidth={s * 0.012} fill="none" />{leaves}
      {[0.3, 0.5, 0.72].map((t, i) => <circle key={i} cx={b.x + b.w * (t + 0.08)} cy={b.y + b.h * (0.9 - t * 0.7)} r={s * 0.018} fill={c2} />)}</>;
  } else if (theme === 'nhahang') {
    // quạt art-deco từ góc dưới phải
    const [cx, cy] = P(1, 1);
    art = <g fill="none" stroke={c} strokeWidth={s * 0.012}>
      {[0.35, 0.55, 0.75, 0.95].map((k, i) => <path key={i} d={`M${cx - s * k} ${cy}A${s * k} ${s * k} 0 0 1 ${cx} ${cy - s * k}`} />)}
      {Array.from({ length: 9 }, (_, i) => { const a = Math.PI + (i / 8) * (Math.PI / 2); return <line key={`r${i}`} x1={cx + Math.cos(a) * s * 0.35} y1={cy + Math.sin(a) * s * 0.35} x2={cx + Math.cos(a) * s * 0.95} y2={cy + Math.sin(a) * s * 0.95} strokeWidth={s * 0.006} />; })}
      <circle cx={cx} cy={cy} r={s * 0.22} fill="none" strokeWidth={s * 0.03} /><circle cx={cx} cy={cy} r={s * 0.12} fill={c} stroke="none" />
    </g>;
  } else if (theme === 'cafe') {
    const pts: [number, number, number, number][] = [[0.22, 0.25, 30, 1], [0.6, 0.15, -20, 0.9], [0.85, 0.42, 60, 1.1], [0.45, 0.5, -60, 0.8], [0.75, 0.78, 15, 1], [0.25, 0.75, 80, 0.9], [0.95, 0.1, 40, 0.7]];
    art = <>{pts.map(([fx, fy, rot, k], i) => {
      const [x, y] = P(fx, fy); const rx = s * 0.12 * k, ry = s * 0.085 * k;
      return <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={i % 2 ? c : c2} />
        <path d={`M${x - rx * 0.8} ${y}C${x - rx * 0.3} ${y - ry * 0.6} ${x + rx * 0.3} ${y + ry * 0.6} ${x + rx * 0.8} ${y}`} stroke={i % 2 ? c2 : c} strokeWidth={s * 0.012} fill="none" />
      </g>;
    })}</>;
  } else if (theme === 'cuoi') {
    const [x, y] = P(0.55, 0.45); const r = s * 0.2;
    const star = (sx: number, sy: number, k: number, key: number) => <path key={key} d={`M${sx} ${sy - k}Q${sx} ${sy} ${sx + k} ${sy}Q${sx} ${sy} ${sx} ${sy + k}Q${sx} ${sy} ${sx - k} ${sy}Q${sx} ${sy} ${sx} ${sy - k}z`} fill={c} />;
    art = <>
      <circle cx={x - r * 0.45} cy={y} r={r} fill="none" stroke={c} strokeWidth={s * 0.022} />
      <circle cx={x + r * 0.45} cy={y} r={r} fill="none" stroke={c} strokeWidth={s * 0.022} />
      <path d={`M${x + r * 0.45 - r * 0.2} ${y - r * 1.02}l${r * 0.2} ${-r * 0.22}l${r * 0.2} ${r * 0.22}l${-r * 0.2} ${r * 0.16}z`} fill={c} />
      {star(b.x + b.w * 0.18, b.y + b.h * 0.2, s * 0.06, 1)}{star(b.x + b.w * 0.88, b.y + b.h * 0.78, s * 0.05, 2)}{star(b.x + b.w * 0.9, b.y + b.h * 0.15, s * 0.03, 3)}
      {[0, 1, 2, 3].map((i) => <ellipse key={`l${i}`} cx={x - r * 1.5 + i * r * 0.18} cy={y + r * 1.15 + i * r * 0.05} rx={r * 0.18} ry={r * 0.07} transform={`rotate(${-25 + i * 12} ${x - r * 1.5 + i * r * 0.18} ${y + r * 1.15})`} fill={c2} />)}
    </>;
  } else if (theme === 'tet') {
    const flower = (fx: number, fy: number, k: number, key: number) => {
      const [x, y] = P(fx, fy); const r = s * 0.065 * k;
      return <g key={key}>{Array.from({ length: 5 }, (_, i) => { const a = (i / 5) * Math.PI * 2 - Math.PI / 2; return <circle key={i} cx={x + Math.cos(a) * r} cy={y + Math.sin(a) * r} r={r * 0.78} fill={c} />; })}<circle cx={x} cy={y} r={r * 0.45} fill={c2} /></g>;
    };
    const coin = (fx: number, fy: number, k: number, key: number) => { const [x, y] = P(fx, fy); const r = s * 0.09 * k; return <g key={key}><circle cx={x} cy={y} r={r} fill="none" stroke={c} strokeWidth={s * 0.014} /><rect x={x - r * 0.3} y={y - r * 0.3} width={r * 0.6} height={r * 0.6} fill="none" stroke={c} strokeWidth={s * 0.012} /></g>; };
    const [ax, ay] = P(0.05, 0.95), [bx, by] = P(0.5, 0.5), [cx, cy] = P(0.98, 0.08);
    art = <>
      <path d={`M${ax} ${ay}Q${bx - s * 0.1} ${by + s * 0.2} ${bx} ${by}T${cx} ${cy}`} stroke={c2} strokeWidth={s * 0.02} fill="none" strokeLinecap="round" />
      <path d={`M${bx} ${by}Q${bx + s * 0.1} ${by + s * 0.25} ${bx + s * 0.35} ${by + s * 0.3}`} stroke={c2} strokeWidth={s * 0.014} fill="none" strokeLinecap="round" />
      {flower(0.5, 0.5, 1.2, 1)}{flower(0.78, 0.25, 1, 2)}{flower(0.3, 0.72, 0.9, 3)}{flower(0.9, 0.62, 0.8, 4)}{flower(0.62, 0.1, 0.6, 5)}
      {coin(0.15, 0.25, 1, 6)}{coin(0.3, 0.12, 0.7, 7)}
    </>;
  } else {
    // thời trang: sọc chéo + vòng tròn lớn
    art = <>
      {[0, 1, 2, 3].map((i) => <path key={i} d={`M${b.x + b.w * (0.2 + i * 0.2)} ${b.y + b.h}l${b.h * 0.6} ${-b.h}h${s * (i % 2 ? 0.05 : 0.12)}l${-b.h * 0.6} ${b.h}z`} fill={i % 2 ? c2 : c} />)}
      <circle cx={b.x + b.w * 0.72} cy={b.y + b.h * 0.42} r={s * 0.36} fill="none" stroke={c} strokeWidth={s * 0.016} />
    </>;
  }
  return (
    <g data-motif="1">
      <defs><clipPath id={id}><rect x={b.x} y={b.y} width={b.w} height={b.h} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>{art}</g>
    </g>
  );
}

// ---------- vị trí mã số (dùng chung cho thẻ lẻ + tờ in hàng loạt) ----------
export interface SerialSlot { x: number; y: number; size: number; anchor: 'start' | 'middle' | 'end'; fill: string; maxW: number }
const SERIAL_TS: TS = { fam: BODY, wt: 800, ls: 0 };
function SerialText({ slot, text }: { slot: SerialSlot; text: string }) {
  const ls = slot.size * 0.08;
  const s = fitSize(text, slot.maxW, slot.size, { ...SERIAL_TS, ls });
  return <text data-serial="1" x={f1(slot.x)} y={f1(slot.y)} textAnchor={slot.anchor} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(s)} letterSpacing={f1(s * 0.08)} fill={slot.fill}>{text}</text>;
}

interface Ctx { spec: VCSpec; data: VCData; W: number; H: number; P: VCPalette; G: string; disp: string; dw: number; uid: string; print: boolean; mask: boolean }
const labelTS: TS = { fam: BODY, wt: 600 };
const boldTS: TS = { fam: BODY, wt: 800 };

/** toạ độ chữ "Mã:" + ô số trên 1 mặt (theo bố cục). Trả mảng (voucher có 2 chỗ: thân + cuống) */
export function serialSlots(spec: VCSpec, data: VCData, side: 'front' | 'back', P0?: VCPalette): { label: { x: number; y: number; size: number; text: string; fill: string; anchor?: 'start' | 'end' }; slot: SerialSlot }[] {
  if (side !== serialSide(spec.kind)) return [];
  const sz = vcSize(spec.size); const P = P0 || vcPalette(spec.palette);
  const W = sz.wMm * U, H = sz.hMm * U;
  const out: ReturnType<typeof serialSlots> = [];
  const mk = (x: number, y: number, size: number, fill: string, label: string, maxW: number, lfill: string) => {
    const lw = textW(label, size * 0.85, labelTS);
    out.push({ label: { x, y, size: size * 0.85, text: label, fill: lfill }, slot: { x: x + lw + size * 0.35, y, size, anchor: 'start', fill, maxW: maxW - lw - size * 0.35 } });
  };
  if (spec.kind === 'voucher') {
    const Sx = (sz.stubMm || 50) * U, k = sz.hMm / 99;
    const rowY = H * 0.2 + 13 * U * k;
    mk(5 * U, rowY, 3.4 * U * k, P.ink, 'Số', Sx - 10 * U, P.sub);
    if (spec.layout === 'bold') {
      const x0 = Sx + 10 * U, y = H - 8 * U * k;
      const hsd = `HSD: ${data.expiry || ''}`;
      const xs = x0 + Math.max(textW(hsd, 2.8 * U * k, labelTS) + 7 * U, 32 * U);
      const qr = data.website?.trim() ? Math.min(24 * U, H * 0.26) + 10 * U : 8 * U;
      mk(xs, y, 3 * U * k, P.gold, 'Mã', W - qr - xs, P.onBg);
    } else {
      mk(Sx + 10 * U, H - 9 * U * k, 3 * U * k, P.ink, 'Mã', (W - Sx) * 0.5, P.sub);
    }
  } else if (spec.kind === 'loyalty') {
    mk(5 * U, H - 4.6 * U, 2.6 * U, P.ink, 'No.', W * 0.46, P.sub);
  } else {
    const L = W * 0.42, k = sz.hMm / 55;
    mk(L + 6 * U * k, H - 6.5 * U * k, 2.7 * U * k, P.ink, 'Mã', W - L - 12 * U * k, P.sub);
  }
  return out;
}

// ---------- các bố cục ----------
const Txt = ({ x, y, s, fam, wt, fill, anchor = 'start', ls = 0, children, op }: { x: number; y: number; s: number; fam: string; wt: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; children: ReactNode; op?: number }) => (
  <text x={f1(x)} y={f1(y)} fontFamily={`"${fam}"`} fontWeight={wt} fontSize={f1(s)} fill={fill} textAnchor={anchor} letterSpacing={ls ? f1(ls) : undefined} opacity={op}>{children}</text>
);

function QR({ data, x, y, s, fg }: { data: VCData; x: number; y: number; s: number; fg: string }) {
  if (!data.website?.trim()) return null;
  const q = qrPath(qrUrl(data.website));
  const pad = s * 0.08, cell = (s - pad * 2) / q.n;
  return <g data-qr="1"><path d={rr(x, y, s, s, s * 0.08)} fill="#FFFFFF" /><path d={q.d} transform={`translate(${f1(x + pad)} ${f1(y + pad)}) scale(${cell})`} fill={fg} /></g>;
}

/** khối chữ nhiều dòng, trả về [node, y cuối] */
function Block(c: { text: string; x: number; y: number; maxW: number; size: number; ts: TS; fill: string; maxLines: number; lh?: number; anchor?: 'start' | 'middle' | 'end'; ls?: number }): [ReactNode, number] {
  const fb = fitBlock(c.text, c.maxW, c.size, { ...c.ts, ls: c.ls }, c.maxLines);
  const lh = fb.size * (c.lh || 1.25);
  return [<g key={`${c.x}-${c.y}`}>{fb.lines.map((ln, i) => <Txt key={i} x={c.x} y={c.y + i * lh} s={fb.size} fam={c.ts.fam} wt={c.ts.wt} fill={c.fill} anchor={c.anchor} ls={c.ls ? (c.ls * fb.size) / c.size : 0}>{ln}</Txt>)}</g>, c.y + (fb.lines.length - 1) * lh];
}

function Perforation({ x, H, color }: { x: number; H: number; color: string }) {
  const n = Math.floor(H / (1.6 * U));
  return <g data-perf="1">{Array.from({ length: n }, (_, i) => <circle key={i} cx={x} cy={(i + 0.5) * (H / n)} r={0.32 * U} fill={color} opacity={0.55} />)}</g>;
}

function VoucherStub({ c, x0, back }: { c: Ctx; x0: number; back: boolean }) {
  const { P, H, data, spec } = c; const sz = vcSize(spec.size); const Sx = (sz.stubMm || 50) * U; const k = sz.hMm / 99;
  const band = spec.layout === 'frame' ? P.bg2 : P.bg;
  const bandInk = spec.layout === 'frame' ? P.ink : P.onBg;
  if (back) {
    return <g data-region="stub">
      <rect x={x0} y={0} width={Sx} height={H} fill={band} />
      <g transform={`translate(${f1(x0 + Sx / 2)} ${f1(H / 2)}) rotate(-90)`}>
        <Txt x={0} y={fitSize(data.brand || '', H * 0.7, 5 * U * k, { fam: c.disp, wt: c.dw }) * 0.35} s={fitSize(data.brand || '', H * 0.7, 5 * U * k, { fam: c.disp, wt: c.dw })} fam={c.disp} wt={c.dw} fill={c.G} anchor="middle">{data.brand}</Txt>
      </g>
    </g>;
  }
  const rows = [
    { l: 'Giá trị', v: data.value || '' },
    { l: 'Khách hàng', v: '' }, { l: 'Điện thoại', v: '' }, { l: 'Ngày phát hành', v: '' },
  ];
  const top = H * 0.2, rowH = (H - top - 13 * U * k - 6 * U * k) / rows.length;
  const pad = 5 * U;
  return <g data-region="stub">
    <rect x={x0} y={0} width={Sx} height={H} fill={P.paper} />
    <rect x={x0} y={0} width={Sx} height={top} fill={band} />
    <Txt x={x0 + Sx / 2} y={top * 0.62} s={fitSize('CUỐNG LƯU', Sx - 2 * pad, 2.8 * U * k, { ...boldTS, ls: 0.6 * U })} fam={BODY} wt={800} fill={bandInk} anchor="middle" ls={0.6 * U * k}>CUỐNG LƯU</Txt>
    {rows.map((r, i) => {
      const y = top + 13 * U * k + 6 * U * k + i * rowH;
      return <g key={i}>
        <Txt x={x0 + pad} y={y} s={2.3 * U * k} fam={BODY} wt={600} fill={P.sub}>{r.l}</Txt>
        {r.v ? <Txt x={x0 + pad} y={y + 4.4 * U * k} s={fitSize(r.v, Sx - 2 * pad, 3.4 * U * k, boldTS)} fam={BODY} wt={800} fill={P.ink}>{r.v}</Txt>
          : <line x1={x0 + pad} x2={x0 + Sx - pad} y1={y + 4.4 * U * k} y2={y + 4.4 * U * k} stroke={P.sub} strokeWidth={1.2} strokeDasharray="3 4" opacity={0.7} />}
      </g>;
    })}
  </g>;
}

function VoucherFront(c: Ctx): ReactNode {
  const { P, W, H, data, spec, G } = c; const sz = vcSize(spec.size); const Sx = (sz.stubMm || 50) * U; const M = W - Sx; const k = sz.hMm / 99;
  const D: TS = { fam: c.disp, wt: c.dw };
  const qs = Math.min(24 * U, H * 0.26);
  let main: ReactNode;
  if (spec.layout === 'bold') {
    const x0 = Sx + 10 * U, tw = M * 0.52;
    const bs = fitSize(data.brand || '', tw, 7 * U * k, D);
    const vs = fitSize(data.value || '', tw, 17 * U * k, D);
    const yv = H * 0.5 + vs * 0.78;
    const [note] = Block({ text: data.valueNote || '', x: x0, y: yv + 6.5 * U * k, maxW: tw, size: 3 * U * k, ts: labelTS, fill: P.onBg, maxLines: 2 });
    main = <g data-region="main">
      <rect x={Sx} y={0} width={M} height={H} fill={P.bg} />
      <Motif theme={spec.theme} b={{ x: Sx + M * 0.6, y: 0, w: M * 0.4, h: H * 0.62 }} c={G} c2={P.bg2 === P.bg ? P.onBg : P.bg2} id={`${c.uid}-m1`} />
      <rect x={Sx + 4 * U} y={4 * U} width={M - 8 * U} height={H - 8 * U} fill="none" stroke={G} strokeWidth={U * 0.35} opacity={0.9} />
      <Txt x={x0} y={H * 0.2 + bs * 0.4} s={bs} fam={c.disp} wt={c.dw} fill={P.onBg}>{data.brand}</Txt>
      {data.tagline && <Txt x={x0} y={H * 0.2 + bs * 0.4 + 5 * U * k} s={fitSize(data.tagline, tw, 2.5 * U * k, { ...labelTS, ls: 0.4 * U })} fam={BODY} wt={600} fill={P.onBg} ls={0.4 * U * k} op={0.8}>{data.tagline}</Txt>}
      <Txt x={x0} y={H * 0.5 - 3 * U * k} s={fitSize(data.title || '', tw, 3.3 * U * k, { ...boldTS, ls: 0.9 * U })} fam={BODY} wt={800} fill={G} ls={0.9 * U * k}>{data.title}</Txt>
      <Txt x={x0} y={yv} s={vs} fam={c.disp} wt={c.dw} fill={G}>{data.value}</Txt>
      {note}
      <Txt x={x0} y={H - 8 * U * k} s={2.8 * U * k} fam={BODY} wt={600} fill={P.onBg} op={0.9}>{`HSD: ${data.expiry || ''}`}</Txt>
      <QR data={data} x={W - 8 * U - qs} y={H - 8 * U - qs} s={qs} fg={P.bg2} />
    </g>;
  } else {
    const cx = Sx + M / 2, tw = M * 0.74;
    const bs = fitSize(data.brand || '', tw, 5.2 * U * k, D);
    const ts = fitSize(data.title || 'Gift Voucher', tw, 10.5 * U * k, { fam: SCRIPT, wt: 400 });
    const vs = fitSize(data.value || '', tw, 11 * U * k, D);
    const [note] = Block({ text: data.valueNote || '', x: cx, y: H * 0.7, maxW: M * 0.56, size: 2.8 * U * k, ts: labelTS, fill: P.sub, maxLines: 1, anchor: 'middle' });
    const qsm = Math.min(16 * U * k, H * 0.17);
    main = <g data-region="main">
      <rect x={Sx} y={0} width={M} height={H} fill={P.paper} />
      <Motif theme={spec.theme} b={{ x: W - 37 * U * k, y: 7 * U, w: 30 * U * k, h: 30 * U * k }} c={G} c2={P.bg2} id={`${c.uid}-m1`} />
      <Motif theme={spec.theme} b={{ x: Sx + 7 * U, y: 7 * U, w: 24 * U * k, h: 24 * U * k }} c={G} c2={P.bg} id={`${c.uid}-m2`} />
      <rect x={Sx + 4 * U} y={4 * U} width={M - 8 * U} height={H - 8 * U} fill="none" stroke={G} strokeWidth={U * 0.45} />
      <rect x={Sx + 5.4 * U} y={5.4 * U} width={M - 10.8 * U} height={H - 10.8 * U} fill="none" stroke={G} strokeWidth={U * 0.15} />
      <Txt x={cx} y={H * 0.2} s={bs} fam={c.disp} wt={c.dw} fill={P.ink} anchor="middle">{data.brand}</Txt>
      {data.tagline && <Txt x={cx} y={H * 0.2 + 5 * U * k} s={fitSize(data.tagline, tw, 2.3 * U * k, { ...labelTS, ls: 0.5 * U })} fam={BODY} wt={600} fill={P.sub} anchor="middle" ls={0.5 * U * k}>{data.tagline}</Txt>}
      <Txt x={cx} y={H * 0.46} s={ts} fam={SCRIPT} wt={400} fill={G} anchor="middle">{titleScript(data.title)}</Txt>
      <Txt x={cx} y={H * 0.61} s={vs} fam={c.disp} wt={c.dw} fill={P.ink} anchor="middle">{data.value}</Txt>
      {note}
      <Txt x={Sx + 10 * U} y={H - 14 * U * k} s={2.7 * U * k} fam={BODY} wt={600} fill={P.sub}>{`HSD: ${data.expiry || ''}`}</Txt>
      <QR data={data} x={W - 10 * U - qsm} y={H - 9.5 * U * k - qsm + 2.4 * U * k} s={qsm} fg={P.ink} />
    </g>;
  }
  return <>
    {main}
    <VoucherStub c={c} x0={0} back={false} />
    {!c.print && <Perforation x={Sx} H={H} color={P.sub} />}
  </>;
}
const thanks = (b?: string) => `Cảm ơn quý khách đã tin chọn ${(b || '').toLowerCase().replace(/(^|\s)(\S)/g, (_m, sp: string, ch: string) => sp + ch.toUpperCase())}!`;
// "PHIẾU QUÀ TẶNG" → chữ viết tay "Phiếu quà tặng" (Great Vibes không đẹp khi viết hoa)
const titleScript = (t?: string) => { const s = (t || 'Gift Voucher').toLowerCase(); return s.charAt(0).toUpperCase() + s.slice(1); };

function CondContact({ c, x, y, w, h, k }: { c: Ctx; x: number; y: number; w: number; h: number; k: number }) {
  const { P, data } = c;
  const conds = splitLines(data.cond).slice(0, 4);
  const qs = data.website?.trim() ? Math.min(20 * U * k + 2 * U, h * 0.36) : 0;
  const cw = w * 0.58, rx = x + cw + 6 * U * k, rw = w - cw - 6 * U * k;
  let yy = y + 4 * U * k;
  const head = <Txt x={x} y={yy} s={fitSize(c.spec.kind === 'coupon' ? 'ĐIỀU KIỆN ÁP DỤNG' : 'ĐIỀU KIỆN SỬ DỤNG', cw, 3.4 * U * k, { ...boldTS, ls: 0.4 * U })} fam={BODY} wt={800} fill={P.ink} ls={0.4 * U * k}>{c.spec.kind === 'coupon' ? 'ĐIỀU KIỆN ÁP DỤNG' : 'ĐIỀU KIỆN SỬ DỤNG'}</Txt>;
  yy += 3 * U * k;
  const line = <line x1={x} x2={x + 14 * U * k} y1={yy} y2={yy} stroke={c.G} strokeWidth={U * 0.5 * k} />;
  yy += 6.5 * U * k;
  const lim = y + h - 2 * U * k;
  const items: ReactNode[] = [];
  const csize = Math.min(3.1 * U * k, (lim - yy) / Math.max(1, conds.length * 1.9));
  for (let i = 0; i < conds.length; i++) {
    const [node, ye] = Block({ text: conds[i], x: x + 4 * U * k, y: yy, maxW: cw - 4 * U * k, size: csize, ts: labelTS, fill: P.ink, maxLines: 2, lh: 1.25 });
    items.push(<g key={i}><circle cx={x + 1.2 * U * k} cy={yy - csize * 0.33} r={csize * 0.22} fill={c.G} />{node}</g>);
    yy = ye + csize * 1.6;
  }
  // cột liên hệ
  const B: TS = { fam: c.disp, wt: c.dw };
  let ry = y + 4 * U * k;
  const right: ReactNode[] = [];
  const bs = fitSize(c.data.brand || '', rw, 3.8 * U * k, B);
  right.push(<Txt key="b" x={rx} y={ry} s={bs} fam={c.disp} wt={c.dw} fill={P.ink}>{c.data.brand}</Txt>);
  ry += 5.5 * U * k;
  if (data.hotline) { right.push(<Txt key="h" x={rx} y={ry} s={fitSize(`Hotline ${data.hotline}`, rw, 2.8 * U * k, boldTS)} fam={BODY} wt={800} fill={P.ink}>{`Hotline ${data.hotline}`}</Txt>); ry += 4.6 * U * k; }
  if (data.address) { const [n, ye] = Block({ text: data.address, x: rx, y: ry, maxW: rw, size: 2.4 * U * k, ts: labelTS, fill: P.sub, maxLines: 2, lh: 1.25 }); right.push(<g key="a">{n}</g>); ry = ye + 4.2 * U * k; }
  if (data.website) { right.push(<Txt key="w" x={rx} y={ry} s={fitSize(data.website, rw, 2.4 * U * k, labelTS)} fam={BODY} wt={600} fill={P.sub}>{data.website}</Txt>); ry += 2 * U * k; }
  // QR ngay dưới khối liên hệ (không dạt xuống đáy)
  const qy = ry + 2.5 * U * k;
  const qsz = Math.min(qs, y + h - qy, rw);
  return <g>{head}{line}{items}{right}{qs > 0 && qsz > 9 * U * k && <QR data={data} x={rx} y={qy} s={qsz} fg={P.ink} />}</g>;
}

function VoucherBack(c: Ctx): ReactNode {
  const { P, W, H, spec } = c; const sz = vcSize(spec.size); const Sx = (sz.stubMm || 50) * U; const M = W - Sx; const k = sz.hMm / 99;
  return <>
    <g data-region="main">
      <rect x={0} y={0} width={M} height={H} fill={P.paper} />
      <rect x={0} y={0} width={3 * U} height={H} fill={P.bg} />
      <CondContact c={c} x={10 * U} y={8 * U * k} w={M - 18 * U} h={H - 26 * U * k} k={k} />
      {!c.mask && <g opacity={0.35}><Motif theme={spec.theme} b={{ x: M - 46 * U * k, y: H - 34 * U * k, w: 42 * U * k, h: 30 * U * k }} c={c.G} c2={P.bg} id={`${c.uid}-mb`} /></g>}
      <Txt x={10 * U} y={H - 9 * U * k} s={fitSize(thanks(c.data.brand), M * 0.62, 6 * U * k, { fam: SCRIPT, wt: 400 })} fam={SCRIPT} wt={400} fill={c.G}>{thanks(c.data.brand)}</Txt>
    </g>
    <VoucherStub c={c} x0={M} back />
    {!c.print && <Perforation x={M} H={H} color={P.sub} />}
  </>;
}

function LoyaltyFront(c: Ctx): ReactNode {
  const { P, W, H, data, spec, G } = c;
  const D: TS = { fam: c.disp, wt: c.dw };
  if (spec.layout === 'band') {
    const tw = W * 0.62;
    const bs = fitSize(data.brand || '', tw, 7.5 * U, D);
    return <g data-region="main">
      <rect x={0} y={0} width={W} height={H} fill={P.bg} />
      <Motif theme={spec.theme} b={{ x: W * 0.55, y: 0, w: W * 0.45, h: H }} c={G} c2={P.bg2 === P.bg ? P.onBg : P.bg2} id={`${c.uid}-m1`} />
      <Txt x={6 * U} y={10 * U} s={fitSize(data.title || '', tw, 2.4 * U, { ...boldTS, ls: 0.6 * U })} fam={BODY} wt={800} fill={G} ls={0.6 * U}>{data.title}</Txt>
      <line x1={6 * U} x2={16 * U} y1={13 * U} y2={13 * U} stroke={G} strokeWidth={0.5 * U} />
      <Txt x={6 * U} y={H * 0.56} s={bs} fam={c.disp} wt={c.dw} fill={P.onBg}>{data.brand}</Txt>
      {data.tagline && <Txt x={6 * U} y={H * 0.56 + 5.2 * U} s={fitSize(data.tagline, tw, 2.2 * U, { ...labelTS, ls: 0.3 * U })} fam={BODY} wt={600} fill={P.onBg} ls={0.3 * U} op={0.8}>{data.tagline}</Txt>}
      {data.hotline && <Txt x={6 * U} y={H - 5.5 * U} s={fitSize(data.hotline, tw, 2.4 * U, boldTS)} fam={BODY} wt={800} fill={P.onBg} op={0.9}>{data.hotline}</Txt>}
    </g>;
  }
  const tw = W * 0.8;
  const bs = fitSize(data.brand || '', tw, 7 * U, D);
  return <g data-region="main">
    <rect x={0} y={0} width={W} height={H} fill={P.bg} />
    <Motif theme={spec.theme} b={{ x: W * 0.62, y: H * 0.5, w: W * 0.38 - 3 * U, h: H * 0.5 - 3 * U }} c={G} c2={P.bg2 === P.bg ? P.onBg : P.bg2} id={`${c.uid}-m1`} />
    <Motif theme={spec.theme} b={{ x: 3 * U, y: 3 * U, w: W * 0.3, h: H * 0.42 }} c={G} c2={P.bg2 === P.bg ? P.onBg : P.bg2} id={`${c.uid}-m2`} />
    <rect x={3 * U} y={3 * U} width={W - 6 * U} height={H - 6 * U} rx={1.5 * U} fill="none" stroke={G} strokeWidth={0.3 * U} />
    <Txt x={W / 2} y={H * 0.33} s={fitSize(data.title || '', tw, 2.4 * U, { ...boldTS, ls: 0.6 * U })} fam={BODY} wt={800} fill={G} anchor="middle" ls={0.6 * U}>{data.title}</Txt>
    <Txt x={W / 2} y={H * 0.33 + 5 * U + bs * 0.72} s={bs} fam={c.disp} wt={c.dw} fill={P.onBg} anchor="middle">{data.brand}</Txt>
    {data.tagline && <Txt x={W / 2} y={H * 0.33 + 10.5 * U + bs * 0.72} s={fitSize(data.tagline, tw, 2.2 * U, { ...labelTS, ls: 0.3 * U })} fam={BODY} wt={600} fill={P.onBg} anchor="middle" ls={0.3 * U} op={0.85}>{data.tagline}</Txt>}
    {data.hotline && <Txt x={W / 2} y={H - 7 * U} s={fitSize(data.hotline, tw, 2.3 * U, boldTS)} fam={BODY} wt={800} fill={G} anchor="middle">{data.hotline}</Txt>}
  </g>;
}

function LoyaltyBack(c: Ctx): ReactNode {
  const { P, W, H, data, spec, G } = c;
  const n = GOALS.includes(spec.goal) ? spec.goal : 10;
  const cols = n / 2;
  const band = 11 * U;
  const head = `MUA ${n - 1} TẶNG 1`;
  const gx0 = 5 * U, gx1 = W - 5 * U, gy0 = band + 3.5 * U, gy1 = H - 16 * U;
  const cw = (gx1 - gx0) / cols, ch = (gy1 - gy0) / 2;
  const r = Math.min(cw, ch) * 0.38;
  const reward = data.reward ? `★ ${data.reward}` : '';
  return <g data-region="main">
    <rect x={0} y={0} width={W} height={H} fill={P.paper} />
    <rect x={0} y={0} width={W} height={band} fill={P.bg} />
    <Txt x={5 * U} y={7.3 * U} s={fitSize(head, W * 0.5, 3.1 * U, boldTS)} fam={BODY} wt={800} fill={G}>{head}</Txt>
    <Txt x={W - 5 * U} y={7.1 * U} s={fitSize(data.brand || '', W * 0.4, 2.6 * U, { fam: c.disp, wt: c.dw })} fam={c.disp} wt={c.dw} fill={P.onBg} anchor="end">{data.brand}</Txt>
    {Array.from({ length: n }, (_, i) => {
      const cx = gx0 + cw * ((i % cols) + 0.5), cy = gy0 + ch * (Math.floor(i / cols) + 0.5);
      const last = i === n - 1;
      return <g key={i}>
        <circle cx={cx} cy={cy} r={r} fill={last ? G : 'none'} stroke={last ? 'none' : P.sub} strokeWidth={0.22 * U} strokeDasharray={last ? undefined : `${0.7 * U} ${0.5 * U}`} />
        <Txt x={cx} y={cy + r * (last ? 0.18 : 0.32)} s={last ? r * 0.52 : r * 0.82} fam={BODY} wt={800} fill={last ? P.paper : P.sub} anchor="middle" op={last ? 1 : 0.55}>{last ? 'QUÀ' : String(i + 1)}</Txt>
      </g>;
    })}
    {reward && <Txt x={5 * U} y={H - 10.2 * U} s={fitSize(reward, W - 10 * U, 2.5 * U, boldTS)} fam={BODY} wt={800} fill={P.ink}>{reward}</Txt>}
    <Txt x={W - 5 * U} y={H - 4.6 * U} s={fitSize(`HSD ${data.expiry || ''}`, W * 0.4, 2.2 * U, labelTS)} fam={BODY} wt={600} fill={P.sub} anchor="end">{`HSD ${data.expiry || ''}`}</Txt>
  </g>;
}

function CouponFront(c: Ctx): ReactNode {
  const { P, W, H, data, spec, G } = c; const sz = vcSize(spec.size); const k = sz.hMm / 55;
  const L = W * 0.42;
  const D: TS = { fam: c.disp, wt: c.dw };
  const vfb = fitBlock(data.value || '', L - 10 * U * k, Math.min(H * 0.26, 15 * U * k), D, 2);
  const vlh = vfb.size * 1.02;
  const vy = H * 0.5 - ((vfb.lines.length - 1) * vlh) / 2 + vfb.size * 0.36;
  const rx = L + 6 * U * k, rw = W - L - 12 * U * k;
  const bs = fitSize(data.brand || '', rw, 5 * U * k, D);
  const [note, ny] = Block({ text: data.valueNote || '', x: rx, y: 8.5 * U * k + bs * 0.75 + 11 * U * k, maxW: rw, size: 2.7 * U * k, ts: labelTS, fill: P.ink, maxLines: 3, lh: 1.3 });
  return <g data-region="main">
    <rect x={0} y={0} width={W} height={H} fill={P.paper} />
    <rect x={0} y={0} width={L} height={H} fill={P.bg} />
    <Motif theme={spec.theme} b={{ x: 0, y: 0, w: L, h: H }} c={G} c2={P.bg2 === P.bg ? P.onBg : P.bg2} id={`${c.uid}-m1`} />
    <rect x={0} y={0} width={L} height={H} fill={P.bg} opacity={0.55} />
    {/* răng cưa trang trí kiểu vé xé giữa 2 khối */}
    {Array.from({ length: Math.floor(H / (2.4 * U * k)) }, (_, i) => <circle key={i} cx={L} cy={(i + 0.5) * (H / Math.floor(H / (2.4 * U * k)))} r={0.55 * U * k} fill={P.paper} />)}
    <rect x={2.5 * U * k} y={2.5 * U * k} width={W - 5 * U * k} height={H - 5 * U * k} fill="none" stroke={G} strokeWidth={0.25 * U * k} strokeDasharray={`${1.4 * U * k} ${0.9 * U * k}`} />
    <Txt x={L / 2} y={10.5 * U * k} s={fitSize(data.title || '', L - 10 * U * k, 2.8 * U * k, { ...boldTS, ls: 0.8 * U })} fam={BODY} wt={800} fill={G} anchor="middle" ls={0.8 * U * k}>{data.title}</Txt>
    {vfb.lines.map((ln, i) => <Txt key={i} x={L / 2} y={vy + i * vlh} s={vfb.size} fam={c.disp} wt={c.dw} fill={G} anchor="middle">{ln}</Txt>)}
    <Txt x={rx} y={8.5 * U * k + bs * 0.75} s={bs} fam={c.disp} wt={c.dw} fill={P.ink}>{data.brand}</Txt>
    {data.tagline && <Txt x={rx} y={8.5 * U * k + bs * 0.75 + 4.6 * U * k} s={fitSize(data.tagline, rw, 2.2 * U * k, { ...labelTS, ls: 0.3 * U })} fam={BODY} wt={600} fill={P.sub} ls={0.3 * U * k}>{data.tagline}</Txt>}
    {note}
    <Txt x={rx} y={Math.max(ny + 5.5 * U * k, H - 11.5 * U * k)} s={2.5 * U * k} fam={BODY} wt={600} fill={P.sub}>{`HSD: ${data.expiry || ''}`}</Txt>
  </g>;
}

function CouponBack(c: Ctx): ReactNode {
  const { P, W, H } = c; const sz = vcSize(c.spec.size); const k = sz.hMm / 55;
  return <g data-region="main">
    <rect x={0} y={0} width={W} height={H} fill={P.paper} />
    <rect x={0} y={H - 3 * U * k} width={W} height={3 * U * k} fill={P.bg} />
    <CondContact c={c} x={6 * U * k} y={5 * U * k} w={W - 12 * U * k} h={H - 12 * U * k} k={0.74 * k} />
    <Txt x={6 * U * k} y={H - 7 * U * k} s={fitSize(thanks(c.data.brand), W * 0.52, 4.4 * U * k, { fam: SCRIPT, wt: 400 })} fam={SCRIPT} wt={400} fill={c.G}>{thanks(c.data.brand)}</Txt>
  </g>;
}

/** 1 mặt thẻ. print = bản in (không vẽ răng cưa xem trước, vàng = màu phẳng). foilMask = khuôn ép kim (trắng = nhũ). serial = null → không vẽ số */
export function VoucherSvg({ spec, data, side, bleed = false, print = false, foilMask = false, serial, nested, style }: {
  spec: VCSpec; data: VCData; side: 'front' | 'back'; bleed?: boolean; print?: boolean; foilMask?: boolean | 'print'; serial?: string | null; nested?: { x: number; y: number }; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const sz = vcSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U, b = bleed ? VC_BLEED_MM * U : 0;
  const P0 = vcPalette(spec.palette);
  // khuôn ép kim: xem 3D = trắng là nhũ trên nền đen; bản in ("print") = ĐEN là nhũ trên nền trắng (chuẩn xưởng)
  const inv = foilMask === 'print', on = inv ? '#000000' : '#FFFFFF', off = inv ? '#FFFFFF' : '#000000';
  const P: VCPalette = foilMask ? { ...P0, bg: off, bg2: off, paper: off, ink: off, sub: off, onBg: off, gold: on } : P0;
  const G = foilMask ? on : spec.foil && !print ? `url(#${uid}-gold)` : P.gold;
  const f = vcFont(spec.font);
  const c: Ctx = { spec, data, W, H, P, G, disp: f.family, dw: f.weight, uid, print, mask: !!foilMask };
  let body: ReactNode;
  if (spec.kind === 'voucher') body = side === 'front' ? VoucherFront(c) : VoucherBack(c);
  else if (spec.kind === 'loyalty') body = side === 'front' ? LoyaltyFront(c) : LoyaltyBack(c);
  else body = side === 'front' ? CouponFront(c) : CouponBack(c);
  const sn = serial === undefined ? serialOf(data, 0) : serial;
  const slots = serialSlots(spec, data, side, P);
  const bgFill = side === 'front'
    ? (spec.kind === 'coupon' || (spec.kind === 'voucher' && spec.layout === 'frame') ? P.paper : P.bg)
    : P.paper;
  const vb = `${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`;
  const g0 = P0.gold;
  const content = <>
    <defs>
      <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor={shade(g0, 0.82)} /><stop offset="0.35" stopColor={shade(g0, 1.22)} /><stop offset="0.55" stopColor={g0} /><stop offset="0.8" stopColor={shade(g0, 1.15)} /><stop offset="1" stopColor={shade(g0, 0.78)} />
      </linearGradient>
    </defs>
    {/* nền tràn lề xén */}
    <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={bgFill} />
    {body}
    {slots.map((s, i) => <g key={i}>
      <text x={f1(s.label.x)} y={f1(s.label.y)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(s.label.size)} fill={s.label.fill}>{s.label.text}</text>
      {sn !== null && <SerialText slot={s.slot} text={sn} />}
    </g>)}
  </>;
  if (nested) return <svg x={nested.x} y={nested.y} width={W + 2 * b} height={H + 2 * b} viewBox={vb} overflow="hidden">{content}</svg>;
  return <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-side={side}>{content}</svg>;
}
function shade(hex: string, k: number) {
  const s = hex.replace('#', ''); const v = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  const o = v.map((x) => Math.max(0, Math.min(255, Math.round(k > 1 ? x + (255 - x) * (k - 1) : x * k))));
  return `#${o.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

/** trang kỹ thuật: đường cắt + đường răng cưa (bế xé) + ghi chú — kèm trong PDF in */
export function VoucherDieSvg({ spec }: { spec: VCSpec }) {
  const sz = vcSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U, b = VC_BLEED_MM * U;
  const r = (sz.radiusMm || 0) * U;
  const Sx = (sz.stubMm || 0) * U;
  const notes = [
    `Khổ thành phẩm ${sz.wMm} × ${sz.hMm} mm · tràn lề ${VC_BLEED_MM} mm`,
    r ? `Bo góc R${sz.radiusMm} mm` : 'Cắt vuông góc',
    Sx ? `Răng cưa (bế xé) cách mép trái ${sz.stubMm} mm — mặt sau ở mép phải` : '',
    spec.foil ? 'Ép kim: theo trang “khuôn ép kim” (vùng đen)' : '',
  ].filter(Boolean);
  return (
    <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" data-die="1">
      <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill="#FFFFFF" />
      <path d={r ? rr(0, 0, W, H, r) : `M0 0H${W}V${H}H0z`} fill="none" stroke={CUTCONTOUR} strokeWidth={U * 0.3} />
      {Sx > 0 && <line x1={Sx} x2={Sx} y1={0} y2={H} stroke={PERF} strokeWidth={U * 0.3} strokeDasharray={`${U * 1.2} ${U * 0.8}`} />}
      {notes.map((t, i) => <text key={i} x={(Sx || 0) + 6 * U} y={10 * U + i * 5 * U} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={2.6 * U * Math.min(1, sz.hMm / 80)} fill="#555">{t}</text>)}
      <text x={(Sx || 0) + 6 * U} y={H - 6 * U} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={2.4 * U * Math.min(1, sz.hMm / 80)} fill={CUTCONTOUR}>— Đường cắt</text>
      {Sx > 0 && <text x={(Sx || 0) + 34 * U} y={H - 6 * U} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={2.4 * U * Math.min(1, sz.hMm / 80)} fill={PERF}>- - Răng cưa</text>}
    </svg>
  );
}

// ---------- tờ in hàng loạt (khổ 32,5 × 43 cm) ----------
export const VC_SHEET = { wMm: 325, hMm: 430, marginMm: 8, gapMm: 2 * VC_BLEED_MM };
export function vcSheetFit(spec: VCSpec) {
  const sz = vcSize(spec.size);
  const g = VC_SHEET.gapMm;
  const cols = Math.max(1, Math.floor((VC_SHEET.wMm - VC_SHEET.marginMm * 2 + g) / (sz.wMm + g)));
  const rows = Math.max(1, Math.floor((VC_SHEET.hMm - VC_SHEET.marginMm * 2 - 6 + g) / (sz.hMm + g)));
  const x0 = (VC_SHEET.wMm - (cols * sz.wMm + (cols - 1) * g)) / 2;
  const y0 = (VC_SHEET.hMm - 6 - (rows * sz.hMm + (rows - 1) * g)) / 2;
  return { cols, rows, per: cols * rows, x0, y0, sz };
}
export const vcSheetPages = (spec: VCSpec, data: VCData) => Math.ceil(vcCount(data) / vcSheetFit(spec).per);

/** tờ in: hình thẻ (defs, dùng chung) + mã số RIÊNG từng tấm (mặt mang số) · CutContour · răng cưa. Mặt sau lật gương để in 2 mặt khớp. */
export function VoucherSheetSvg({ spec, data, side, page = 0, style }: { spec: VCSpec; data: VCData; side: 'front' | 'back'; page?: number; style?: CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const fit = vcSheetFit(spec); const { sz } = fit;
  const SW = VC_SHEET.wMm * U, SH = VC_SHEET.hMm * U;
  const w = sz.wMm * U, h = sz.hMm * U, b = VC_BLEED_MM * U, g = VC_SHEET.gapMm * U;
  const numbered = side === serialSide(spec.kind);
  const count = vcCount(data);
  const first = page * fit.per;
  const n = Math.max(0, Math.min(fit.per, count - first));
  const slots = serialSlots(spec, data, side);
  const r = (sz.radiusMm || 0) * U;
  const Sx = (sz.stubMm || 0) * U;
  const perfX = side === 'front' ? Sx : w - Sx;
  const cells = Array.from({ length: n }, (_, i) => {
    const col = i % fit.cols, row = Math.floor(i / fit.cols);
    let x = fit.x0 * U + col * (w + g);
    if (side === 'back') x = SW - x - w; // lật gương theo chiều ngang
    return { x, y: fit.y0 * U + row * (h + g), sn: serialOf(data, first + i) };
  });
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} width={`${VC_SHEET.wMm}mm`} height={`${VC_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet-page={page} data-count={n} data-side={side}>
      <rect x={0} y={0} width={SW} height={SH} fill="#FFFFFF" />
      <defs>
        <g id={`${u}-card`} data-card-def="1"><VoucherSvg spec={spec} data={data} side={side} bleed print serial={null} nested={{ x: 0, y: 0 }} /></g>
        <g id={`${u}-cut`}>{r ? <path d={rr(0, 0, w, h, r)} /> : <rect x={0} y={0} width={w} height={h} />}</g>
      </defs>
      <g id="In">
        {cells.map((c, i) => <use key={i} href={`#${u}-card`} x={f1(c.x - b)} y={f1(c.y - b)} />)}
        {numbered && cells.map((c, i) => <g key={`s${i}`} transform={`translate(${f1(c.x)} ${f1(c.y)})`}>{slots.map((s, j) => <SerialText key={j} slot={s.slot} text={c.sn} />)}</g>)}
      </g>
      <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1}>
        <title>CutContour</title>
        {cells.map((c, i) => <use key={i} href={`#${u}-cut`} x={f1(c.x)} y={f1(c.y)} />)}
      </g>
      {Sx > 0 && <g id="Perf" data-name="Perf" stroke={PERF} strokeWidth={1} strokeDasharray="8 6">
        {cells.map((c, i) => <line key={i} x1={f1(c.x + perfX)} x2={f1(c.x + perfX)} y1={f1(c.y)} y2={f1(c.y + h)} />)}
      </g>}
      <text x={VC_SHEET.marginMm * U} y={SH - 3 * U} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={26} fill="#9CA3AF">
        {`Mivy · ${side === 'front' ? 'mặt trước' : 'mặt sau (lật gương)'} · tờ ${page + 1}${numbered && cells.length ? ` · mã ${cells[0].sn} đến ${cells[cells.length - 1].sn}` : ''} · ${n} tấm · ${sz.name}`}
      </text>
    </svg>
  );
}

export const hasFoil = (spec: VCSpec) => spec.foil;
