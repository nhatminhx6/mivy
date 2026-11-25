'use client';
// Vé sự kiện · vé mời: 1 engine SVG = SỰ KIỆN (nội dung mẫu) × BỐ CỤC (hoạ tiết vẽ code) × BẢNG MÀU × FONT × HẠNG VÉ.
// Mỗi vé 1 SỐ riêng (tiền tố + số chạy) + 1 MÃ QR riêng (mã sự kiện + số vé) + ghế (hàng × số, tuỳ chọn) →
// tờ in hàng loạt có số/QR khác nhau từng vé, đường cắt + răng cưa (cuống xé). Gala: cuống = SỐ BỐC THĂM.
// Đơn vị: 10px = 1mm. Render 100% bằng code, không gọi AI.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';
import { qrPath } from './flyer-qr';

export const U = 10; // px / mm
export const TK_BLEED_MM = 2;
export const PERF = '#00A3E0';
export const CUTCONTOUR = '#EC008C';
const NOTCH = 2.4 * U; // khấc bán nguyệt 2 đầu đường răng cưa

// ---------- khổ ----------
export interface TKSize { id: string; name: string; wMm: number; hMm: number; stubMm: number; radiusMm: number; card?: boolean }
export const TK_SIZES: TKSize[] = [
  { id: 't200', name: '200 × 70 mm', wMm: 200, hMm: 70, stubMm: 52, radiusMm: 2 },
  { id: 't180', name: '180 × 60 mm', wMm: 180, hMm: 60, stubMm: 46, radiusMm: 2 },
  { id: 't150', name: '150 × 55 mm', wMm: 150, hMm: 55, stubMm: 40, radiusMm: 2 },
  { id: 'vip', name: 'Thẻ VIP 85,6 × 54 mm', wMm: 85.6, hMm: 54, stubMm: 0, radiusMm: 3, card: true },
];
export const tkSize = (id: string) => TK_SIZES.find((s) => s.id === id) || TK_SIZES[0];

// ---------- font ----------
export interface TKFont { id: string; name: string; family: string; weight: number }
export const TK_FONTS: TKFont[] = [
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
];
export const tkFont = (id: string) => TK_FONTS.find((f) => f.id === id) || TK_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
export const TK_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Oswald:wght@700&family=Bungee&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Great+Vibes&display=swap');`;

export function useTKFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-tk-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-tk-fonts'; link.rel = 'stylesheet';
        link.href = TK_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TK_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `400 40px "${SCRIPT}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
// bg/bg2 = nền vùng tranh, accent/accent2 = hoạ tiết, paper = cột thông tin (QR), stub = nền cuống
export interface TKPalette { id: string; name: string; bg: string; bg2: string; accent: string; accent2: string; paper: string; ink: string; sub: string; onBg: string; stub: string; onStub: string; dark: boolean }
export const TK_PALETTES: TKPalette[] = [
  { id: 'neon', name: 'Neon đêm', bg: '#1A0B2E', bg2: '#3B0F5C', accent: '#FF3D9A', accent2: '#22D3EE', paper: '#FFFFFF', ink: '#1A0B2E', sub: '#6B5B80', onBg: '#FFFFFF', stub: '#FF3D9A', onStub: '#FFFFFF', dark: true },
  { id: 'gold', name: 'Đen ánh vàng', bg: '#111013', bg2: '#25211B', accent: '#D4AF5F', accent2: '#F1D899', paper: '#FBF7EE', ink: '#1B1814', sub: '#7A6F5E', onBg: '#F6EBD2', stub: '#D4AF5F', onStub: '#1B1814', dark: true },
  { id: 'sunset', name: 'Hoàng hôn', bg: '#FF5A36', bg2: '#FFB703', accent: '#2B1B5A', accent2: '#FFFFFF', paper: '#FFFFFF', ink: '#2B1B5A', sub: '#6E6290', onBg: '#FFFFFF', stub: '#2B1B5A', onStub: '#FFFFFF', dark: true },
  { id: 'red', name: 'Đỏ Tết', bg: '#A50F1C', bg2: '#6E0811', accent: '#E9C36B', accent2: '#FFE7A8', paper: '#FFF8EC', ink: '#3A1210', sub: '#7A4B40', onBg: '#FFF4DA', stub: '#E9C36B', onStub: '#3A1210', dark: true },
  { id: 'teal', name: 'Xanh biển', bg: '#0F4C5C', bg2: '#0B3440', accent: '#FFC857', accent2: '#E9724C', paper: '#FFFFFF', ink: '#0B3440', sub: '#55707A', onBg: '#FFFFFF', stub: '#FFC857', onStub: '#0B3440', dark: true },
  { id: 'cream', name: 'Kem cổ điển', bg: '#F3E6C8', bg2: '#E8D5A9', accent: '#C8402B', accent2: '#2E6E73', paper: '#FFFBF1', ink: '#3B2414', sub: '#7A6450', onBg: '#3B2414', stub: '#C8402B', onStub: '#FFF7E8', dark: false },
  { id: 'blue', name: 'Xanh doanh nghiệp', bg: '#FFFFFF', bg2: '#EEF3FF', accent: '#1D3B8F', accent2: '#3EC1F3', paper: '#FFFFFF', ink: '#13234D', sub: '#5A6A8F', onBg: '#13234D', stub: '#1D3B8F', onStub: '#FFFFFF', dark: false },
  { id: 'forest', name: 'Xanh rừng', bg: '#1F4D3A', bg2: '#133426', accent: '#F2B84B', accent2: '#9BD18B', paper: '#FFFFFF', ink: '#16261D', sub: '#5D6E62', onBg: '#FFFFFF', stub: '#F2B84B', onStub: '#16261D', dark: true },
];
export const tkPalette = (id: string) => TK_PALETTES.find((p) => p.id === id) || TK_PALETTES[0];

// ---------- hạng vé (màu phân biệt) ----------
export const TK_TIERS: { id: string; name: string; color: string; on: string }[] = [
  { id: 'vip', name: 'VIP', color: '#C9A24E', on: '#1B1408' },
  { id: 'vvip', name: 'VVIP', color: '#7B2CBF', on: '#FFFFFF' },
  { id: 'a', name: 'KHU A', color: '#E63946', on: '#FFFFFF' },
  { id: 'b', name: 'KHU B', color: '#2A9D8F', on: '#FFFFFF' },
  { id: 'c', name: 'KHU C', color: '#3D5A80', on: '#FFFFFF' },
  { id: 'std', name: 'THƯỜNG', color: '#5C6670', on: '#FFFFFF' },
  { id: 'guest', name: 'KHÁCH MỜI', color: '#F08A24', on: '#FFFFFF' },
  { id: 'early', name: 'EARLY BIRD', color: '#0FA37F', on: '#FFFFFF' },
];
export const tkTier = (id: string) => TK_TIERS.find((t) => t.id === id) || TK_TIERS[0];

// ---------- sự kiện (nội dung mẫu) ----------
export type TKTheme = 'concert' | 'fair' | 'gala' | 'seminar' | 'cinema' | 'entry';
export const TK_THEMES: { id: TKTheme; name: string }[] = [
  { id: 'concert', name: 'Ca nhạc' }, { id: 'fair', name: 'Hội chợ · triển lãm' }, { id: 'gala', name: 'Gala · tất niên' },
  { id: 'seminar', name: 'Hội thảo' }, { id: 'cinema', name: 'Chiếu phim · kịch' }, { id: 'entry', name: 'Vé cổng · gửi xe' },
];
export type TKData = Record<string, string>;
const COMMON: TKData = { start: '1', count: '200', seat: '', rowFrom: 'A', rowTo: 'F', perRow: '20' };
const THEME_DATA: Record<TKTheme, TKData> = {
  concert: {
    eyebrow: 'LIVE CONCERT 2026', event: 'Đêm nhạc Mùa Đông', artist: 'Gia Khánh · Thu Hà & Ban nhạc Bầu Trời',
    date: '20.12.2026', time: '19:30', venue: 'Nhà hát Hoà Bình, 240 đường 3/2, Q.10, TP.HCM', price: '1.200.000đ',
    organizer: 'An Khang Entertainment', hotline: '0909 246 135', code: 'MD26', prefix: 'MD',
    terms: 'Vé chỉ có giá trị cho 1 người, 1 lần vào cổng\nVui lòng có mặt trước giờ diễn 30 phút\nKhông mang đồ ăn, thức uống từ bên ngoài\nVé đã mua không hoàn, không đổi',
  },
  fair: {
    eyebrow: 'HỘI CHỢ · TRIỂN LÃM', event: 'Hội chợ Hàng Việt 2027', artist: '120 gian hàng · Ẩm thực ba miền · Thủ công mỹ nghệ',
    date: '15 – 18.01.2027', time: '08:00 – 22:00', venue: 'Trung tâm Hội chợ SECC, 799 Nguyễn Văn Linh, Q.7', price: '50.000đ',
    organizer: 'Ban tổ chức Hội chợ An Khang', hotline: '1900 6868', code: 'HCV27', prefix: 'HC',
    terms: 'Vé vào cổng 1 lượt trong ngày ghi trên vé\nTrẻ em dưới 1m miễn vé\nGiữ vé để tham gia bốc thăm cuối ngày\nBTC có quyền từ chối khách vi phạm nội quy',
  },
  gala: {
    eyebrow: 'GALA · YEAR END PARTY', event: 'Tất niên An Khang 2026', artist: 'Tiệc tri ân & Bốc thăm may mắn',
    date: '23.01.2027', time: '18:00', venue: 'White Palace, 194 Hoàng Văn Thụ, Q. Phú Nhuận', price: 'Vé mời',
    organizer: 'Công ty TNHH An Khang', hotline: '0938 118 822', code: 'YEP26', prefix: 'AK',
    terms: 'Mời quý khách mang theo vé khi tham dự\nXé cuống bỏ vào thùng bốc thăm tại sảnh\nGiữ phần vé chính để đối chiếu khi trúng giải\nTrang phục: lịch sự, tông đỏ – vàng',
  },
  seminar: {
    eyebrow: 'HỘI THẢO CHUYÊN ĐỀ', event: 'Marketing số 2027', artist: 'Diễn giả: Quốc Bảo · Thu Hà · Bảo Ngọc',
    date: '08.03.2027', time: '08:30 – 12:00', venue: 'Khách sạn Rex, 141 Nguyễn Huệ, Q.1, TP.HCM', price: '450.000đ',
    organizer: 'Học viện An Khang', hotline: '0901 357 246', code: 'MKT27', prefix: 'HT',
    terms: 'Vé gồm tài liệu, tea-break và chứng nhận tham dự\nCheck-in bằng mã QR tại bàn lễ tân\nĐược chuyển nhượng vé trước 48 giờ\nKhông hoàn tiền sau ngày 01.03.2027',
  },
  cinema: {
    eyebrow: 'SUẤT CHIẾU ĐẶC BIỆT', event: 'Mùa Hoa Gạo', artist: 'Ra mắt phim điện ảnh · Gặp gỡ đoàn phim',
    date: '14.02.2027', time: '20:00', venue: 'Rạp An Khang Cinema, Phòng chiếu 3', price: '120.000đ',
    organizer: 'An Khang Cinema', hotline: '0912 468 579', code: 'MHG27', prefix: 'RP', seat: '1', rowFrom: 'A', rowTo: 'F', perRow: '20',
    terms: 'Vui lòng ngồi đúng số ghế ghi trên vé\nPhim dành cho khán giả từ 13 tuổi\nKhông quay phim, chụp ảnh trong phòng chiếu\nVé đã mua không đổi suất chiếu',
  },
  entry: {
    eyebrow: 'VÉ VÀO CỔNG', event: 'Khu du lịch Suối Mơ', artist: 'Tham quan · Tắm suối · Cắm trại',
    date: 'Năm 2027', time: '06:00 – 18:00', venue: 'Km 18, Quốc lộ 20, Đồng Nai', price: '80.000đ',
    organizer: 'Khu du lịch Suối Mơ', hotline: '0987 654 321', code: 'SM27', prefix: 'SM',
    terms: 'Vé có giá trị 1 lượt vào cổng trong ngày\nGiữ vé để kiểm soát khi ra vào\nKhông xả rác, không bẻ cành hái hoa\nTrẻ em dưới 1m miễn vé',
  },
};
export function sampleData(theme: TKTheme): TKData { return { ...COMMON, ...THEME_DATA[theme] }; }

export interface TKField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean }
export const TK_FIELDS: TKField[] = [
  { key: 'eyebrow', label: 'Dòng nhỏ trên tên', ph: 'LIVE CONCERT 2026', half: true },
  { key: 'event', label: 'Tên sự kiện (to nhất)', half: true },
  { key: 'artist', label: 'Nghệ sĩ / diễn giả / mô tả' },
  { key: 'date', label: 'Ngày', ph: '20.12.2026', half: true },
  { key: 'time', label: 'Giờ', ph: '19:30', half: true },
  { key: 'venue', label: 'Địa điểm' },
  { key: 'price', label: 'Giá vé', ph: '500.000đ · Vé mời', half: true },
  { key: 'organizer', label: 'Ban tổ chức', half: true },
  { key: 'hotline', label: 'Hotline', half: true },
  { key: 'terms', label: 'Điều khoản ngắn (mặt sau, mỗi dòng 1 ý)', multiline: true },
];

// ---------- mẫu ----------
export const TK_LAYOUTS: { id: string; name: string }[] = [
  { id: 'stage', name: 'Sân khấu · đèn' }, { id: 'confetti', name: 'Pháo giấy' }, { id: 'blocks', name: 'Khối hình học' },
  { id: 'deco', name: 'Art-deco sang' }, { id: 'retro', name: 'Vé cổ điển' }, { id: 'clean', name: 'Tối giản' },
];
export interface TKSpec { theme: TKTheme; layout: string; palette: string; font: string; size: string; tier: string; stubSide: 'left' | 'right'; foil: boolean }
export interface TKTemplate { id: string; name: string; spec: Omit<TKSpec, 'size' | 'stubSide'> }
const T = (id: string, name: string, theme: TKTheme, layout: string, palette: string, font: string, tier: string, foil = false): TKTemplate =>
  ({ id, name, spec: { theme, layout, palette, font, tier, foil } });
export const TK_TEMPLATES: TKTemplate[] = [
  T('concert-stage', 'Ca nhạc · sân khấu neon', 'concert', 'stage', 'neon', 'oswald', 'vip', true),
  T('concert-confetti', 'Ca nhạc · hoàng hôn', 'concert', 'confetti', 'sunset', 'bungee', 'a'),
  T('fair-blocks', 'Hội chợ · khối màu', 'fair', 'blocks', 'teal', 'montserrat', 'std'),
  T('fair-confetti', 'Hội chợ · đỏ', 'fair', 'confetti', 'red', 'baloo', 'early'),
  T('gala-deco', 'Gala · đen vàng', 'gala', 'deco', 'gold', 'playfair', 'guest', true),
  T('gala-red', 'Tất niên · đỏ kim', 'gala', 'deco', 'red', 'playfair', 'vip', true),
  T('seminar-clean', 'Hội thảo · xanh', 'seminar', 'clean', 'blue', 'montserrat', 'std'),
  T('seminar-blocks', 'Hội thảo · rừng', 'seminar', 'blocks', 'forest', 'oswald', 'vip'),
  T('cinema-retro', 'Chiếu phim · cổ điển', 'cinema', 'retro', 'cream', 'bungee', 'b'),
  T('cinema-stage', 'Chiếu phim · đêm', 'cinema', 'stage', 'gold', 'oswald', 'c'),
  T('entry-retro', 'Vé cổng · cổ điển', 'entry', 'retro', 'teal', 'baloo', 'std'),
  T('entry-clean', 'Vé cổng · tối giản', 'entry', 'clean', 'forest', 'oswald', 'std'),
];

// ---------- số vé · QR · ghế ----------
const cleanCode = (s: string, n: number) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, n);
export const seatOn = (d: TKData) => d.seat === '1';
const letter = (s: string, def: string) => { const c = (s || def).toUpperCase().replace(/[^A-Z]/g, '')[0] || def; return c.charCodeAt(0); };
export function seatRows(d: TKData): string[] {
  const a = letter(d.rowFrom, 'A'), b = letter(d.rowTo, 'F');
  const lo = Math.min(a, b), hi = Math.min(Math.max(a, b), lo + 25);
  return Array.from({ length: hi - lo + 1 }, (_, i) => String.fromCharCode(lo + i));
}
export const perRowOf = (d: TKData) => Math.min(60, Math.max(1, parseInt(d.perRow || '20', 10) || 20));
export function tkCount(d: TKData) {
  if (seatOn(d)) return seatRows(d).length * perRowOf(d);
  return Math.min(3000, Math.max(1, parseInt(d.count || '1', 10) || 1));
}
export const startOf = (d: TKData) => Math.max(0, parseInt(d.start || '1', 10) || 0);
export const serialOf = (d: TKData, i: number) => `${cleanCode(d.prefix, 4)}${String(startOf(d) + i).padStart(5, '0')}`;
/** số bốc thăm (gala) = phần số của số vé */
export const luckyOf = (d: TKData, i: number) => String(startOf(d) + i).padStart(3, '0');
export function seatOf(d: TKData, i: number): { row: string; no: number } | null {
  if (!seatOn(d)) return null;
  const rows = seatRows(d), per = perRowOf(d);
  return { row: rows[Math.floor(i / per) % rows.length], no: (i % per) + 1 };
}
/** nội dung QR: mã sự kiện + số vé (soát vé quét là biết vé nào) */
export const qrPayload = (d: TKData, i: number) => `${cleanCode(d.code, 8) || 'EVENT'}-${serialOf(d, i)}`;

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
/** chia đều 2 dòng cho đẹp (tránh 1 chữ mồ côi) */
function balance(lines: string[], maxW: number, size: number, ts: TS) {
  if (lines.length !== 2) return lines;
  const words = lines.join(' ').split(' ');
  let best = lines, bestD = Infinity;
  for (let k = 1; k < words.length; k++) {
    const a = words.slice(0, k).join(' '), b = words.slice(k).join(' ');
    const wa = textW(a, size, ts), wb = textW(b, size, ts);
    if (wa > maxW || wb > maxW) continue;
    const d = Math.abs(wa - wb); if (d < bestD) { bestD = d; best = [a, b]; }
  }
  return best;
}
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number, minK = 0.55) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * minK) { s *= 0.93; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) {
    // vẫn dư dòng → dồn phần thừa vào dòng cuối rồi co cho vừa
    lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  }
  lines = balance(lines, maxW, s, ts);
  const widest = Math.max(0, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
const f1 = (n: number) => Math.round(n * 10) / 10;
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
const splitLines = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);

// ---------- hình học vé ----------
export interface Geo {
  W: number; H: number; card: boolean; r: number; Sx: number; right: boolean; perfX: number;
  stub: [number, number]; info: [number, number]; art: [number, number]; foil: [number, number] | null; q: number;
}
export function tkGeo(spec: TKSpec, data: TKData, side: 'front' | 'back' = 'front'): Geo {
  const sz = tkSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U, r = sz.radiusMm * U;
  if (sz.card) return { W, H, card: true, r, Sx: 0, right: true, perfX: W, stub: [W, W], info: [W, W], art: [0, W], foil: spec.foil && side === 'front' ? [W - 9 * U, W - 3.5 * U] : null, q: 0 };
  const Sx = sz.stubMm * U;
  // mặt sau: cuống nằm phía đối diện (lật vé theo chiều ngang)
  const right = (spec.stubSide === 'right') === (side === 'front');
  const perfX = right ? W - Sx : Sx;
  const seat = seatOn(data);
  const q = Math.min(26 * U, H - (4 + 6.6 + 2.2 + (seat ? 6.2 : 0) + 6 + 3.4) * U);
  const iw = q + 7 * U;
  const info: [number, number] = right ? [perfX - iw, perfX] : [perfX, perfX + iw];
  const stub: [number, number] = right ? [W - Sx, W] : [0, Sx];
  const art: [number, number] = right ? [0, perfX - iw] : [perfX + iw, W];
  const foil: [number, number] | null = spec.foil && side === 'front' ? (right ? [4 * U, 10 * U] : [W - 10 * U, W - 4 * U]) : null;
  return { W, H, card: false, r, Sx, right, perfX, stub, info, art, foil, q };
}
/** đường cắt: chữ nhật bo góc + 2 khấc bán nguyệt ở 2 đầu răng cưa (vé giấy) */
export function cutPath(g: Geo): string {
  const { W, H, r } = g;
  if (g.card) return rr(0, 0, W, H, r);
  const x = g.perfX, n = NOTCH;
  return `M${r} 0H${x - n}A${n} ${n} 0 0 0 ${x + n} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V${H - r}A${r} ${r} 0 0 1 ${W - r} ${H}`
    + `H${x + n}A${n} ${n} 0 0 0 ${x - n} ${H}H${r}A${r} ${r} 0 0 1 0 ${H - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
}

// ---------- chữ ----------
function Txt({ x, y, s, fam, wt, fill, anchor = 'start', ls = 0, children, op }: { x: number; y: number; s: number; fam: string; wt: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; children: ReactNode; op?: number }) {
  return <text x={f1(x)} y={f1(y)} fontFamily={`"${fam}"`} fontWeight={wt} fontSize={f1(s)} fill={fill} textAnchor={anchor} letterSpacing={ls ? f1(ls) : undefined} opacity={op}>{children}</text>;
}

interface Line { t: string; s: number; fam: string; wt: number; fill: string; ls?: number; gap: number }
/** xếp dòng từ trên xuống trong hộp; quá cao → co cả khối. pushLast = khối cuối dồn xuống đáy */
function stackLines(groups: Line[][], x: number, y0: number, maxW: number, maxH: number, anchor: 'start' | 'middle', pushLastFrom?: number) {
  const height = (gs: Line[][]) => gs.flat().reduce((a, l) => a + l.s * 1.02 + l.gap, 0);
  let k = 1; const h0 = height(groups);
  if (h0 > maxH) k = maxH / h0;
  const out: ReactNode[] = [];
  let y = y0;
  const all = groups.map((g) => g.map((l) => ({ ...l, s: l.s * k, gap: l.gap * k })));
  const restH = pushLastFrom !== undefined ? height(all.slice(pushLastFrom)) : 0;
  all.forEach((g, gi) => {
    if (pushLastFrom !== undefined && gi === pushLastFrom) y = Math.max(y, y0 + maxH - restH);
    for (const l of g) {
      y += l.gap + l.s * 0.84;
      const s = fitSize(l.t, maxW, l.s, { fam: l.fam, wt: l.wt, ls: l.ls ? l.ls * k : 0 });
      out.push(<Txt key={out.length} x={x} y={y} s={s} fam={l.fam} wt={l.wt} fill={l.fill} anchor={anchor} ls={l.ls ? l.ls * k * (s / l.s) : 0}>{l.t}</Txt>);
      y += l.s * 0.18;
    }
  });
  return out;
}

// ---------- hoạ tiết theo bố cục (vẽ code, nằm sau chữ) ----------
interface Box { x: number; y: number; w: number; h: number }
let seedN = 1;
const rnd = () => { seedN = (seedN * 16807) % 2147483647; return seedN / 2147483647; };
function Art({ layout, b, fb, P, uid }: { layout: string; b: Box; fb?: Box; P: TKPalette; uid: string }) {
  const F = fb || b;
  seedN = 97;
  const s = Math.min(b.w, b.h);
  let art: ReactNode = null;
  if (layout === 'stage') {
    const beams = [0.18, 0.5, 0.82].map((fx, i) => {
      const cx = b.x + b.w * fx, top = b.y - s * 0.05, spread = b.w * (0.22 + i * 0.03);
      const tilt = (fx - 0.5) * b.w * 0.5;
      return <path key={i} d={`M${cx - s * 0.03} ${top}L${cx + s * 0.03} ${top}L${cx + tilt + spread / 2} ${b.y + b.h}L${cx + tilt - spread / 2} ${b.y + b.h}Z`} fill={`url(#${uid}-beam)`} />;
    });
    const bars = Array.from({ length: 42 }, (_, i) => {
      const bw = b.w / 42; const hh = b.h * (0.06 + 0.22 * Math.abs(Math.sin(i * 0.55) * Math.cos(i * 0.21)) + 0.05 * rnd());
      return <rect key={i} x={b.x + i * bw + bw * 0.18} y={b.y + b.h - hh} width={bw * 0.64} height={hh} rx={bw * 0.3} fill={i % 2 ? P.accent : P.accent2} opacity={0.5} />;
    });
    const stars = Array.from({ length: 18 }, (_, i) => <circle key={i} cx={b.x + rnd() * b.w} cy={b.y + rnd() * b.h * 0.6} r={s * (0.004 + rnd() * 0.008)} fill="#FFFFFF" opacity={0.6} />);
    art = <><rect x={F.x} y={F.y} width={F.w} height={F.h} fill={`url(#${uid}-bgv)`} />{beams}{stars}{bars}</>;
  } else if (layout === 'confetti') {
    const bits = Array.from({ length: 46 }, (_, i) => {
      const x = b.x + rnd() * b.w, y = b.y + rnd() * b.h, k = s * (0.02 + rnd() * 0.028), rot = rnd() * 180;
      const fill = [P.accent2, '#FFFFFF', P.accent, P.bg2][i % 4];
      const op = 0.35 + rnd() * 0.4;
      if (i % 3 === 0) return <circle key={i} cx={x} cy={y} r={k * 0.45} fill={fill} opacity={op} />;
      if (i % 3 === 1) return <rect key={i} x={x} y={y} width={k} height={k * 0.42} fill={fill} opacity={op} transform={`rotate(${rot} ${x} ${y})`} />;
      return <path key={i} d={`M${x} ${y}l${k * 0.6} ${k}l${-k * 1.2} 0z`} fill={fill} opacity={op} transform={`rotate(${rot} ${x} ${y})`} />;
    });
    art = <>
      <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={`url(#${uid}-bgd)`} />
      <path d={`M${b.x} ${b.y + b.h * 0.78}C${b.x + b.w * 0.3} ${b.y + b.h * 0.62} ${b.x + b.w * 0.6} ${b.y + b.h * 0.98} ${b.x + b.w} ${b.y + b.h * 0.74}V${b.y + b.h}H${b.x}Z`} fill={P.bg2} opacity={0.35} />
      {bits}
    </>;
  } else if (layout === 'blocks') {
    const R = Math.min(b.h * 0.58, b.w * 0.36);
    const L0 = b.x + b.w * 0.62; // hình khối chỉ nằm bên phải 38% → chữ (≤ 58%) không đè
    art = <>
      <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={P.bg} />
      <circle cx={Math.max(L0 + R, b.x + b.w - R * 0.15)} cy={b.y + R * 0.4} r={R} fill={P.accent} />
      <path d={`M${L0} ${b.y + b.h}L${b.x + b.w * 0.84} ${b.y + b.h * 0.44}L${b.x + b.w * 1.06} ${b.y + b.h}Z`} fill={P.accent2} />
      <circle cx={L0 + b.w * 0.1} cy={b.y + b.h * 0.5} r={b.h * 0.08} fill={P.bg2} />
      {Array.from({ length: 6 }, (_, i) => <rect key={i} x={L0 + s * 0.02 + i * s * 0.045} y={b.y + b.h * 0.1} width={s * 0.018} height={b.h * 0.2} fill={P.onBg} opacity={0.35} />)}
    </>;
  } else if (layout === 'deco') {
    const cx = b.x + b.w / 2, inset = s * 0.07;
    const rays = Array.from({ length: 15 }, (_, i) => {
      const a = Math.PI + (i / 14) * Math.PI;
      return <line key={i} x1={cx} y1={b.y + inset} x2={cx + Math.cos(a) * b.w * 0.4} y2={b.y + inset - Math.sin(a) * b.h * 0.42} stroke={P.accent} strokeWidth={s * 0.006} opacity={0.4} />;
    });
    const dots = Array.from({ length: 16 }, (_, i) => {
      const x = b.x + inset * 1.6 + rnd() * (b.w - inset * 3.2), y = b.y + inset * 1.6 + rnd() * (b.h - inset * 3.2), k = s * (0.008 + rnd() * 0.01);
      return <path key={i} d={`M${x} ${y - k}L${x + k * 0.6} ${y}L${x} ${y + k}L${x - k * 0.6} ${y}Z`} fill={P.accent2} opacity={0.55} />;
    });
    art = <>
      <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={`url(#${uid}-bgv)`} />
      {rays}
      <rect x={b.x + inset} y={b.y + inset} width={b.w - inset * 2} height={b.h - inset * 2} fill="none" stroke={P.accent} strokeWidth={s * 0.012} />
      <rect x={b.x + inset * 1.35} y={b.y + inset * 1.35} width={b.w - inset * 2.7} height={b.h - inset * 2.7} fill="none" stroke={P.accent} strokeWidth={s * 0.004} />
      {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([fx, fy], i) => {
        const x = b.x + inset + fx * (b.w - inset * 2), y = b.y + inset + fy * (b.h - inset * 2), k = s * 0.07;
        return <path key={`c${i}`} d={`M${x} ${y + (fy ? -k : k)}L${x} ${y}L${x + (fx ? -k : k)} ${y}`} fill="none" stroke={P.accent} strokeWidth={s * 0.02} />;
      })}
      {dots}
    </>;
  } else if (layout === 'retro') {
    const inset = s * 0.06, k = s * 0.035;
    const scallop = (x0: number, y0: number, x1: number, y1: number) => {
      const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / (k * 2)));
      let d = `M${x0} ${y0}`;
      for (let i = 1; i <= n; i++) d += `A${k} ${k} 0 0 1 ${x0 + ((x1 - x0) * i) / n} ${y0 + ((y1 - y0) * i) / n}`;
      return d;
    };
    const x0 = b.x + inset, y0 = b.y + inset, x1 = b.x + b.w - inset, y1 = b.y + b.h - inset;
    art = <>
      <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={P.bg} />
      {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={b.x + rnd() * b.w} cy={b.y + rnd() * b.h} r={s * 0.006} fill={P.ink} opacity={0.08} />)}
      <path d={`${scallop(x0, y0, x1, y0)}${scallop(x1, y0, x1, y1).replace(/^M[^A]*/, '')}${scallop(x1, y1, x0, y1).replace(/^M[^A]*/, '')}${scallop(x0, y1, x0, y0).replace(/^M[^A]*/, '')}Z`} fill="none" stroke={P.accent} strokeWidth={s * 0.012} />
      <rect x={x0 + k * 1.4} y={y0 + k * 1.4} width={x1 - x0 - k * 2.8} height={y1 - y0 - k * 2.8} fill="none" stroke={P.ink} strokeWidth={s * 0.004} strokeDasharray={`${s * 0.012} ${s * 0.012}`} />
    </>;
  } else { // clean
    art = <>
      <rect x={F.x} y={F.y} width={F.w} height={F.h} fill={P.bg} />
      <rect x={b.x} y={b.y} width={b.w} height={s * 0.03} fill={P.accent} />
      {Array.from({ length: 6 }, (_, j) => Array.from({ length: 9 }, (_, i) => (
        <circle key={`${i}-${j}`} cx={b.x + b.w - s * 0.06 - i * s * 0.055} cy={b.y + b.h - s * 0.06 - j * s * 0.055} r={s * 0.007} fill={P.accent2} opacity={0.18 + (0.5 * (8 - i)) / 8 * (1 - j / 6)} />
      )))}
      <path d={`M${b.x + b.w * 0.72} ${b.y}L${b.x + b.w} ${b.y}L${b.x + b.w} ${b.y + b.h * 0.42}Z`} fill={P.accent2} opacity={0.12} />
    </>;
  }
  return <g data-motif="1"><defs><clipPath id={`${uid}-ac`}><rect x={F.x} y={F.y} width={F.w} height={F.h} /></clipPath></defs><g clipPath={`url(#${uid}-ac)`}>{art}</g></g>;
}

// biểu tượng nhỏ theo loại sự kiện (góc trên vùng tranh)
function ThemeIcon({ theme, x, y, k, c }: { theme: TKTheme; x: number; y: number; k: number; c: string }) {
  const sw = k * 0.09;
  if (theme === 'concert') return <g fill={c}><ellipse cx={x + k * 0.28} cy={y + k * 0.82} rx={k * 0.2} ry={k * 0.15} /><ellipse cx={x + k * 0.78} cy={y + k * 0.72} rx={k * 0.2} ry={k * 0.15} /><path d={`M${x + k * 0.43} ${y + k * 0.82}V${y + k * 0.16}L${x + k * 0.93} ${y + k * 0.06}V${y + k * 0.72}`} fill="none" stroke={c} strokeWidth={sw} /></g>;
  if (theme === 'fair') return <g fill="none" stroke={c} strokeWidth={sw}><path d={`M${x} ${y + k * 0.4}L${x + k * 0.5} ${y + k * 0.05}L${x + k} ${y + k * 0.4}Z`} /><path d={`M${x + k * 0.1} ${y + k * 0.4}V${y + k * 0.95}H${x + k * 0.9}V${y + k * 0.4}M${x + k * 0.4} ${y + k * 0.95}V${y + k * 0.62}H${x + k * 0.6}V${y + k * 0.95}`} /></g>;
  if (theme === 'gala') return <g fill="none" stroke={c} strokeWidth={sw}><path d={`M${x + k * 0.12} ${y + k * 0.05}L${x + k * 0.42} ${y + k * 0.05}L${x + k * 0.36} ${y + k * 0.42}Q${x + k * 0.27} ${y + k * 0.52} ${x + k * 0.18} ${y + k * 0.42}Z M${x + k * 0.27} ${y + k * 0.5}V${y + k * 0.92}M${x + k * 0.14} ${y + k * 0.92}H${x + k * 0.4}`} /><path d={`M${x + k * 0.58} ${y + k * 0.05}L${x + k * 0.88} ${y + k * 0.05}L${x + k * 0.82} ${y + k * 0.42}Q${x + k * 0.73} ${y + k * 0.52} ${x + k * 0.64} ${y + k * 0.42}Z M${x + k * 0.73} ${y + k * 0.5}V${y + k * 0.92}M${x + k * 0.6} ${y + k * 0.92}H${x + k * 0.86}`} /></g>;
  if (theme === 'seminar') return <g fill="none" stroke={c} strokeWidth={sw}><rect x={x + k * 0.34} y={y + k * 0.02} width={k * 0.32} height={k * 0.52} rx={k * 0.16} /><path d={`M${x + k * 0.2} ${y + k * 0.4}Q${x + k * 0.2} ${y + k * 0.72} ${x + k * 0.5} ${y + k * 0.72}Q${x + k * 0.8} ${y + k * 0.72} ${x + k * 0.8} ${y + k * 0.4}M${x + k * 0.5} ${y + k * 0.72}V${y + k * 0.95}M${x + k * 0.3} ${y + k * 0.95}H${x + k * 0.7}`} /></g>;
  if (theme === 'cinema') return <g fill="none" stroke={c} strokeWidth={sw}><circle cx={x + k * 0.5} cy={y + k * 0.5} r={k * 0.44} />{[0, 1, 2, 3, 4].map((i) => { const a = (i / 5) * Math.PI * 2; return <circle key={i} cx={x + k * 0.5 + Math.cos(a) * k * 0.24} cy={y + k * 0.5 + Math.sin(a) * k * 0.24} r={k * 0.09} />; })}</g>;
  return <g fill="none" stroke={c} strokeWidth={sw}><path d={`M${x} ${y + k * 0.92}L${x + k * 0.34} ${y + k * 0.3}L${x + k * 0.55} ${y + k * 0.62}L${x + k * 0.72} ${y + k * 0.42}L${x + k} ${y + k * 0.92}Z`} /><circle cx={x + k * 0.78} cy={y + k * 0.14} r={k * 0.1} /></g>;
}

// ---------- 1 mặt vé ----------
interface Ctx { spec: TKSpec; data: TKData; g: Geo; P: TKPalette; f: TKFont; uid: string; print: boolean; bl: number }

function Badge({ x, y, w, h, tier, center }: { x: number; y: number; w: number; h: number; tier: { name: string; color: string; on: string }; center?: boolean }) {
  const s = fitSize(tier.name, w - h * 0.8, h * 0.56, { fam: BODY, wt: 800, ls: h * 0.06 });
  return <g data-tier="1">
    <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={tier.color} />
    <Txt x={center === false ? x + h * 0.4 : x + w / 2} y={y + h * 0.5 + s * 0.36} s={s} fam={BODY} wt={800} fill={tier.on} anchor={center === false ? 'start' : 'middle'} ls={s * 0.08}>{tier.name}</Txt>
  </g>;
}

function ArtArea(c: Ctx) {
  const { g, P, f, data, spec } = c;
  const [a0, a1] = g.art;
  const H = g.H;
  const bl = c.bl;
  const ex0 = a0 <= 0 ? -bl : a0, ex1 = a1 >= g.W ? g.W + bl : a1;
  const box: Box = { x: ex0, y: -bl, w: ex1 - ex0, h: H + 2 * bl };
  let x0 = a0, x1 = a1;
  if (g.foil) { if (g.foil[0] < (a0 + a1) / 2) x0 = g.foil[1]; else x1 = g.foil[0]; }
  const pad = 5 * U;
  const center = spec.layout === 'deco' || spec.layout === 'retro';
  const decoIn = spec.layout === 'deco' || spec.layout === 'retro' ? Math.min(a1 - a0, H) * 0.14 : 0;
  const tx0 = x0 + pad + decoIn * 0.6, tx1 = x1 - pad - decoIn * 0.6;
  const maxW = spec.layout === 'blocks' ? Math.max(10 * U, a0 + (a1 - a0) * 0.58 - tx0) : tx1 - tx0;
  const ax = center ? (tx0 + tx1) / 2 : tx0;
  const anchor = center ? 'middle' : 'start';
  const onArt = P.dark || spec.layout === 'stage' || spec.layout === 'deco' || spec.layout === 'confetti' ? P.onBg : P.ink;
  const titleC = spec.layout === 'deco' ? P.accent2 : spec.layout === 'retro' ? P.accent : spec.layout === 'clean' ? P.accent : onArt;
  const subC = spec.layout === 'retro' || spec.layout === 'clean' || (spec.layout === 'blocks' && !P.dark) ? P.sub : onArt;
  const hh = H / U; // mm
  const ts: TS = { fam: f.family, wt: f.weight };
  const title = fitBlock(data.event || '', maxW, hh * 0.19 * U, ts, 2);
  const artist = fitBlock(data.artist || '', maxW, hh * 0.058 * U, { fam: BODY, wt: 600 }, 2, 0.75);
  const venue = fitBlock(data.venue || '', maxW, hh * 0.048 * U, { fam: BODY, wt: 600 }, 2, 0.75);
  const dt = [data.date, data.time].filter(Boolean).join('  ·  ');
  const groups: Line[][] = [
    data.eyebrow ? [{ t: (data.eyebrow || '').toUpperCase(), s: hh * 0.05 * U, fam: BODY, wt: 800, fill: spec.layout === 'stage' || spec.layout === 'deco' ? P.accent2 : spec.layout === 'clean' ? P.accent2 : subC, ls: hh * 0.012 * U, gap: 0 }] : [],
    title.lines.map((t, i) => ({ t, s: title.size, fam: f.family, wt: f.weight, fill: titleC, gap: i ? title.size * 0.02 : hh * 0.025 * U })),
    artist.lines.map((t, i) => ({ t, s: artist.size, fam: BODY, wt: 600, fill: subC, gap: i ? 0 : hh * 0.025 * U })),
    [
      ...(dt ? [{ t: dt, s: hh * 0.068 * U, fam: BODY, wt: 800, fill: titleC === P.accent2 ? P.accent2 : onArt === P.ink ? P.ink : onArt, gap: hh * 0.04 * U }] : []),
      ...venue.lines.map((t, i) => ({ t, s: venue.size, fam: BODY, wt: 600, fill: subC, gap: i ? 0 : hh * 0.012 * U })),
    ],
    data.price ? [{ t: data.price, s: hh * 0.085 * U, fam: f.family, wt: f.weight, fill: spec.layout === 'retro' || spec.layout === 'clean' ? P.ink : spec.layout === 'deco' ? P.accent : onArt, gap: hh * 0.03 * U }] : [],
  ].filter((x) => x.length);
  const top = pad * 0.85 + decoIn * 0.7, bottom = pad * 0.8 + decoIn * 0.7 + (spec.layout === 'stage' ? hh * 0.02 * U : 0);
  const iconK = hh * 0.12 * U;
  const showIcon = !center && spec.layout !== 'blocks';
  return <g data-region="art">
    <Art layout={spec.layout} b={{ x: a0, y: 0, w: a1 - a0, h: H }} fb={box} P={P} uid={c.uid} />
    {showIcon && <g opacity={0.85}><ThemeIcon theme={spec.theme} x={tx1 - iconK} y={H - bottom - iconK} k={iconK} c={spec.layout === 'clean' ? P.accent : P.accent2} /></g>}
    <g data-copy="1">{stackLines(groups, ax, top, maxW, H - top - bottom, anchor, groups.length - 1)}</g>
  </g>;
}

/** cột thông tin cạnh răng cưa: hạng vé + (ghế) + khung QR + số vé (số & QR là phần động, vẽ riêng) */
function InfoColumn(c: Ctx) {
  const { g, P, spec, data } = c;
  const [i0, i1] = g.info; const w = i1 - i0;
  const tier = tkTier(spec.tier);
  const pad = 3.5 * U;
  const lay = infoLayout(g, data);
  return <g data-region="info">
    <rect x={i0} y={-c.bl} width={w} height={g.H + 2 * c.bl} fill={P.paper} />
    <rect x={g.right ? i1 - 0.6 * U : i0} y={-c.bl} width={0.6 * U} height={g.H + 2 * c.bl} fill={tier.color} opacity={0.9} />
    <Badge x={i0 + pad} y={lay.badgeY} w={w - pad * 2} h={6.6 * U} tier={tier} />
    {seatOn(data) && <Txt x={i0 + w / 2} y={lay.seatLabelY} s={2.3 * U} fam={BODY} wt={600} fill={P.sub} anchor="middle">GHẾ</Txt>}
    <rect x={lay.qx - 1.4 * U} y={lay.qy - 1.4 * U} width={g.q + 2.8 * U} height={g.q + 2.8 * U} rx={1.6 * U} fill="#FFFFFF" stroke={P.ink} strokeOpacity={0.15} strokeWidth={0.25 * U} />
  </g>;
}
function infoLayout(g: Geo, data: TKData) {
  const [i0, i1] = g.info; const w = i1 - i0;
  const badgeY = 4 * U;
  const seat = seatOn(data);
  const seatLabelY = badgeY + 6.6 * U + 3.6 * U;
  const qy = badgeY + 6.6 * U + 2.2 * U + (seat ? 6.2 * U : 0) + 1.2 * U;
  const qx = i0 + (w - g.q) / 2;
  return { badgeY, seatLabelY, seatY: seatLabelY + 0.2 * U, qx, qy, serialY: qy + g.q + 1.2 * U + 3.6 * U };
}

function Stub(c: Ctx) {
  const { g, P, spec, data, f } = c;
  const [s0, s1] = g.stub; const w = s1 - s0;
  const cx = s0 + w / 2, pad = 3.4 * U, maxW = w - pad * 2;
  const gala = spec.theme === 'gala';
  const tier = tkTier(spec.tier);
  const hh = g.H / U;
  const ev = fitBlock(data.event || '', maxW, hh * 0.085 * U, { fam: f.family, wt: f.weight }, 2);
  let y = 5 * U;
  const label = gala ? 'CUỐNG BỐC THĂM' : 'CUỐNG VÉ · BTC GIỮ';
  const ls = fitSize(label, maxW, 2.3 * U, { fam: BODY, wt: 800, ls: 0.25 * U });
  const nodes: ReactNode[] = [];
  nodes.push(<Txt key="l" x={cx} y={y + ls * 0.8} s={ls} fam={BODY} wt={800} fill={P.onStub} anchor="middle" ls={ls * 0.1} op={0.85}>{label}</Txt>);
  y += ls + 2.2 * U;
  ev.lines.forEach((t, i) => { y += ev.size * 0.86; nodes.push(<Txt key={`e${i}`} x={cx} y={y} s={ev.size} fam={f.family} wt={f.weight} fill={P.onStub} anchor="middle">{t}</Txt>); y += ev.size * 0.16; });
  const dt = data.date || '';
  if (dt) { const s = fitSize(dt, maxW, 2.8 * U, { fam: BODY, wt: 600 }); y += 1.4 * U + s * 0.8; nodes.push(<Txt key="d" x={cx} y={y} s={s} fam={BODY} wt={600} fill={P.onStub} anchor="middle" op={0.9}>{dt}</Txt>); }
  return <g data-region="stub">
    <rect x={s0 <= 0 ? -c.bl : s0} y={-c.bl} width={w + c.bl} height={g.H + 2 * c.bl} fill={P.stub} />
    {Array.from({ length: 5 }, (_, i) => <circle key={i} cx={s0 + w * (0.15 + i * 0.18)} cy={g.H - 1.6 * U} r={0.5 * U} fill={P.onStub} opacity={0.25} />)}
    {nodes}
    {(() => {
      const L = stubLayout(g, spec, data);
      const bottom = gala ? L.luckyLabelY - 3 * U : L.badgeY - 1.5 * U;
      const k = Math.min((g.stub[1] - g.stub[0]) * 0.34, g.H * 0.2, bottom - y - 2.5 * U);
      return k > 4 * U ? <g opacity={0.22}><ThemeIcon theme={spec.theme} x={cx - k / 2} y={y + (bottom - y - k) / 2 + 0.6 * U} k={k} c={P.onStub} /></g> : null;
    })()}
    {!gala && <Badge x={s0 + pad} y={stubLayout(g, spec, data).badgeY} w={maxW} h={5.2 * U} tier={{ ...tier, color: P.onStub === '#FFFFFF' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)', on: P.onStub }} />}
    {gala
      ? <Txt x={cx} y={stubLayout(g, spec, data).luckyLabelY} s={2.3 * U} fam={BODY} wt={800} fill={P.onStub} anchor="middle" ls={0.2 * U}>SỐ MAY MẮN</Txt>
      : <Txt x={cx} y={stubLayout(g, spec, data).serialLabelY} s={2.2 * U} fam={BODY} wt={600} fill={P.onStub} anchor="middle" op={0.8}>SỐ VÉ</Txt>}
  </g>;
}
function stubLayout(g: Geo, spec: TKSpec, data: TKData) {
  const H = g.H;
  const seat = seatOn(data);
  const serialY = H - 5.4 * U;
  const serialLabelY = serialY - 4.4 * U;
  const seatY = serialLabelY - (seat ? 3.6 * U : 0);
  const badgeY = (seat ? seatY - 4.4 * U : serialLabelY - 3.4 * U) - 5.2 * U;
  const luckySize = Math.min(H * 0.3, (g.stub[1] - g.stub[0]) * 0.36);
  const luckyY = H - 5 * U;
  return { serialY, serialLabelY, seatY, badgeY, luckySize, luckyY, luckyLabelY: luckyY - luckySize * 0.92 - 1.2 * U };
}

function FrontPaper(c: Ctx) {
  return <>{ArtArea(c)}{InfoColumn(c)}{Stub(c)}</>;
}

function BackPaper(c: Ctx) {
  const { g, P, data, spec, f } = c;
  const [s0, s1] = g.stub;
  const right = g.right;
  const main: [number, number] = right ? [0, g.perfX] : [g.perfX, g.W];
  const pad = 6 * U, mw = main[1] - main[0] - pad * 2;
  const x = main[0] + pad;
  const hh = g.H / U;
  const terms = splitLines(data.terms).slice(0, 6);
  const tS = Math.min(2.9 * U, hh * 0.048 * U);
  const tLines = terms.flatMap((t) => wrapLines(`•  ${t}`, mw, tS, { fam: BODY, wt: 600 }));
  const head = 'ĐIỀU KHOẢN SỬ DỤNG VÉ';
  const nodes: ReactNode[] = [];
  let y = pad + 2 * U;
  nodes.push(<Txt key="h" x={x} y={y + 2.6 * U} s={3.2 * U} fam={BODY} wt={800} fill={P.ink} ls={0.3 * U}>{head}</Txt>);
  y += 3.2 * U + 3 * U;
  const avail = g.H - y - 13 * U;
  const lh = tS * 1.42;
  const k = Math.min(1, avail / Math.max(1, tLines.length * lh));
  tLines.forEach((t, i) => nodes.push(<Txt key={`t${i}`} x={x} y={y + (i + 0.8) * lh * k} s={tS * k} fam={BODY} wt={600} fill={P.sub}>{t}</Txt>));
  const org = [data.organizer, data.hotline ? `Hotline ${data.hotline}` : ''].filter(Boolean).join('  ·  ');
  const oS = fitSize(org, mw, 2.9 * U, { fam: BODY, wt: 800 });
  // mặt sau cuống
  const sw = s1 - s0, scx = s0 + sw / 2, sp = 3.4 * U;
  const gala = spec.theme === 'gala';
  const lines = gala ? ['Họ tên', 'Điện thoại', 'Phòng ban'] : ['Ngày soát vé', 'Cổng', 'Ký nhận'];
  const stubHead = gala ? 'BỎ VÀO THÙNG BỐC THĂM' : 'PHẦN BTC LƯU';
  const shS = fitSize(stubHead, sw - sp * 2, 2.4 * U, { fam: BODY, wt: 800, ls: 0.15 * U });
  return <>
    <rect x={main[0] <= 0 ? -c.bl : main[0]} y={-c.bl} width={main[1] - main[0] + c.bl} height={g.H + 2 * c.bl} fill={P.paper} />
    <g data-region="main">
      <rect x={main[0] <= 0 ? -c.bl : main[0]} y={-c.bl} width={main[1] - main[0] + c.bl} height={1.4 * U + c.bl} fill={P.accent} />
      <rect x={main[0] <= 0 ? -c.bl : main[0]} y={g.H - 1.4 * U} width={main[1] - main[0] + c.bl} height={1.4 * U + c.bl} fill={P.accent} />
      {nodes}
      <g opacity={0.09}><ThemeIcon theme={spec.theme} x={main[1] - pad - g.H * 0.34} y={g.H * 0.3} k={g.H * 0.34} c={P.ink} /></g>
      <line x1={x} x2={x + mw} y1={g.H - 9.5 * U} y2={g.H - 9.5 * U} stroke={P.ink} strokeOpacity={0.15} strokeWidth={0.25 * U} />
      <Txt x={x} y={g.H - 5.2 * U} s={oS} fam={BODY} wt={800} fill={P.ink}>{org}</Txt>
    </g>
    <g data-region="stub">
      <rect x={s0 <= 0 ? -c.bl : s0} y={-c.bl} width={sw + c.bl} height={g.H + 2 * c.bl} fill={P.paper} />
      <rect x={s0 <= 0 ? -c.bl : s0} y={-c.bl} width={sw + c.bl} height={g.H + 2 * c.bl} fill={P.stub} opacity={0.1} />
      <Txt x={scx} y={6.4 * U} s={shS} fam={BODY} wt={800} fill={P.ink} anchor="middle" ls={shS * 0.06}>{stubHead}</Txt>
      {lines.map((l, i) => {
        const yy = 13 * U + i * ((g.H - 19 * U) / lines.length);
        return <g key={i}>
          <Txt x={s0 + sp} y={yy} s={2.4 * U} fam={BODY} wt={600} fill={P.sub}>{l}</Txt>
          <line x1={s0 + sp} x2={s1 - sp} y1={yy + 4.2 * U} y2={yy + 4.2 * U} stroke={P.ink} strokeOpacity={0.35} strokeWidth={0.2 * U} strokeDasharray={`${0.6 * U} ${0.5 * U}`} />
        </g>;
      })}
    </g>
  </>;
}

// ---------- thẻ VIP (85,6 × 54) ----------
function CardFront(c: Ctx) {
  const { g, P, f, data, spec } = c;
  const box: Box = { x: -c.bl, y: -c.bl, w: g.W + 2 * c.bl, h: g.H + 2 * c.bl };
  const pad = 5 * U;
  let x1 = g.W - pad;
  if (g.foil) x1 = g.foil[0] - 2 * U;
  const x0 = pad;
  const maxW = spec.layout === 'blocks' ? g.W * 0.58 - x0 : x1 - x0;
  const onArt = P.dark || spec.layout === 'stage' || spec.layout === 'deco' || spec.layout === 'confetti' ? P.onBg : P.ink;
  const titleC = spec.layout === 'deco' ? P.accent2 : spec.layout === 'retro' || spec.layout === 'clean' ? P.accent : onArt;
  const subC = spec.layout === 'retro' || spec.layout === 'clean' || (spec.layout === 'blocks' && !P.dark) ? P.sub : onArt;
  const tier = tkTier(spec.tier);
  const title = fitBlock(data.event || '', maxW, 7.6 * U, { fam: f.family, wt: f.weight }, 2);
  const dt = [data.date, data.time].filter(Boolean).join(' · ');
  const groups: Line[][] = [
    data.eyebrow ? [{ t: (data.eyebrow || '').toUpperCase(), s: 2.6 * U, fam: BODY, wt: 800, fill: spec.layout === 'stage' || spec.layout === 'deco' ? P.accent2 : subC, ls: 0.6 * U, gap: 0 }] : [],
    title.lines.map((t, i) => ({ t, s: title.size, fam: f.family, wt: f.weight, fill: titleC, gap: i ? 0 : 1.4 * U })),
    dt ? [{ t: dt, s: 3.2 * U, fam: BODY, wt: 800, fill: onArt === P.ink ? P.ink : onArt, gap: 1.6 * U }] : [],
  ].filter((x) => x.length);
  const deco = spec.layout === 'deco' || spec.layout === 'retro' ? 3 * U : 0;
  return <>
    <Art layout={spec.layout} b={{ x: 0, y: 0, w: g.W, h: g.H }} fb={box} P={P} uid={c.uid} />
    <g data-region="art">{stackLines(groups, x0 + deco, pad + deco * 0.6, maxW - deco * 1.5, g.H - pad * 2 - 9 * U - deco, 'start')}</g>
    <Badge x={x0 + deco} y={g.H - pad - 6.4 * U - deco * 0.5} w={Math.min(maxW * 0.62, 34 * U)} h={6.4 * U} tier={tier} />
  </>;
}
function CardBack(c: Ctx) {
  const { g, P, data, f } = c;
  const lay = cardBackLayout(g, data);
  const tx = lay.tx, mw = g.W - tx - 4.5 * U;
  const ev = fitBlock(data.event || '', mw, 4.4 * U, { fam: f.family, wt: f.weight }, 2);
  const nodes: ReactNode[] = [];
  let y = 6 * U;
  ev.lines.forEach((t, i) => { y += ev.size * 0.86; nodes.push(<Txt key={`e${i}`} x={tx} y={y} s={ev.size} fam={f.family} wt={f.weight} fill={P.ink}>{t}</Txt>); y += ev.size * 0.2; });
  const venue = fitBlock(data.venue || '', mw, 2.3 * U, { fam: BODY, wt: 600 }, 2, 0.8);
  venue.lines.forEach((t, i) => { y += (i ? 0 : 1.2 * U) + venue.size * 1.18; nodes.push(<Txt key={`v${i}`} x={tx} y={y} s={venue.size} fam={BODY} wt={600} fill={P.sub}>{t}</Txt>); });
  const org = data.hotline ? `Hotline ${data.hotline}` : data.organizer || '';
  return <>
    <rect x={-c.bl} y={-c.bl} width={g.W + 2 * c.bl} height={g.H + 2 * c.bl} fill={P.paper} />
    <rect x={-c.bl} y={g.H - 3 * U} width={g.W + 2 * c.bl} height={3 * U + c.bl} fill={P.accent} />
    <rect x={lay.qx - 1.2 * U} y={lay.qy - 1.2 * U} width={lay.q + 2.4 * U} height={lay.q + 2.4 * U} rx={1.4 * U} fill="#FFFFFF" stroke={P.ink} strokeOpacity={0.15} strokeWidth={0.25 * U} />
    <g data-region="main">
      {nodes}
      <Txt x={tx} y={lay.serialLabelY} s={2.2 * U} fam={BODY} wt={600} fill={P.sub}>SỐ THẺ</Txt>
      {seatOn(data) && <Txt x={tx + mw} y={lay.serialLabelY} s={2.2 * U} fam={BODY} wt={600} fill={P.sub} anchor="end">GHẾ</Txt>}
      {org && <Txt x={4.5 * U} y={g.H - 4.6 * U} s={fitSize(org, g.W - 9 * U, 2.3 * U, { fam: BODY, wt: 600 })} fam={BODY} wt={600} fill={P.sub}>{org}</Txt>}
    </g>
  </>;
}
function cardBackLayout(g: Geo, data: TKData) {
  const q = 26 * U, qx = 4.5 * U, qy = 5.5 * U;
  void data;
  return { q, qx, qy, tx: qx + q + 5 * U, serialLabelY: qy + q - 5.4 * U, serialY: qy + q };
}

// ---------- phần động (số vé · QR · ghế · số bốc thăm) — vẽ được trên vé lẻ & tờ in ----------
export function dynSide(spec: TKSpec): 'front' | 'back' { return tkSize(spec.size).card ? 'back' : 'front'; }
export function TicketDynamic({ spec, data, i, P0 }: { spec: TKSpec; data: TKData; i: number; P0?: TKPalette }) {
  const P = P0 || tkPalette(spec.palette);
  const g = tkGeo(spec, data, dynSide(spec));
  const sn = serialOf(data, i), payload = qrPayload(data, i), seat = seatOf(data, i);
  const qr = qrPath(payload);
  const nodes: ReactNode[] = [];
  const stubNodes: ReactNode[] = [];
  const serialTxt = (x: number, y: number, s: number, maxW: number, anchor: 'start' | 'middle' | 'end', fill: string, key: string) => {
    const sz = fitSize(sn, maxW, s, { fam: BODY, wt: 800, ls: s * 0.08 });
    return <text key={key} data-serial="1" x={f1(x)} y={f1(y)} textAnchor={anchor} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(sz)} letterSpacing={f1(sz * 0.08)} fill={fill}>{sn}</text>;
  };
  let qx: number, qy: number, q: number;
  if (g.card) {
    const L = cardBackLayout(g, data);
    q = L.q; qx = L.qx; qy = L.qy;
    const mw = g.W - L.tx - 4.5 * U;
    nodes.push(serialTxt(L.tx, L.serialY, 4.4 * U, seat ? mw * 0.6 : mw, 'start', P.ink, 's1'));
    if (seat) nodes.push(<text key="seat" data-seat="1" x={f1(L.tx + mw)} y={f1(L.serialY)} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(4.4 * U)} fill={P.accent}>{`${seat.row}${String(seat.no).padStart(2, '0')}`}</text>);
  } else {
    const L = infoLayout(g, data);
    q = g.q; qx = L.qx; qy = L.qy;
    const [i0, i1] = g.info; const iw = i1 - i0;
    nodes.push(serialTxt(i0 + iw / 2, L.serialY, 3.4 * U, iw - 5 * U, 'middle', P.ink, 's1'));
    if (seat) {
      const st = `HÀNG ${seat.row} · SỐ ${String(seat.no).padStart(2, '0')}`;
      const s = fitSize(st, iw - 5 * U, 3.4 * U, { fam: BODY, wt: 800 });
      nodes.push(<text key="seat1" data-seat="1" x={f1(i0 + iw / 2)} y={f1(L.seatLabelY + 3.5 * U)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(s)} fill={P.ink}>{st}</text>);
    }
    // cuống
    const S = stubLayout(g, spec, data);
    const [s0, s1] = g.stub; const sw = s1 - s0, scx = s0 + sw / 2;
    if (spec.theme === 'gala') {
      const lk = luckyOf(data, i);
      const s = fitSize(lk, sw - 6 * U, S.luckySize, { fam: tkFont(spec.font).family, wt: tkFont(spec.font).weight });
      stubNodes.push(<text key="lucky" data-lucky="1" x={f1(scx)} y={f1(S.luckyY)} textAnchor="middle" fontFamily={`"${tkFont(spec.font).family}"`} fontWeight={tkFont(spec.font).weight} fontSize={f1(s)} fill={P.onStub}>{lk}</text>);
    } else {
      stubNodes.push(serialTxt(scx, S.serialY, 3.6 * U, sw - 6 * U, 'middle', P.onStub, 's2'));
      if (seat) stubNodes.push(<text key="seat2" data-seat="1" x={f1(scx)} y={f1(S.seatY)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(Math.min(3.2 * U, fitSize(`${seat.row}${seat.no}`, sw - 6 * U, 3.2 * U, { fam: BODY, wt: 800 })))} fill={P.onStub}>{`Ghế ${seat.row}${String(seat.no).padStart(2, '0')}`}</text>);
    }
  }
  const m = q / qr.n;
  return <g data-dyn="1" data-payload={payload} data-sn={sn}>
    <path data-qr="1" d={qr.d} transform={`translate(${f1(qx)} ${f1(qy)}) scale(${m})`} fill="#111111" shapeRendering="crispEdges" />
    <g data-region={g.card ? 'main' : 'info'}>{nodes}</g>
    {stubNodes.length > 0 && <g data-region="stub">{stubNodes}</g>}
  </g>;
}

/** 1 mặt vé. print = file in (không vẽ răng cưa/khấc xem trước, không dải nhũ). foilMask: trắng = nhũ (3D) / 'print' đen = nhũ.
 *  idx = số thứ tự vé để vẽ số/QR (null = không vẽ phần động, dùng làm hình nền tờ in) */
export function TicketSvg({ spec, data, side, bleed = false, print = false, foilMask = false, idx = 0, nested, style }: {
  spec: TKSpec; data: TKData; side: 'front' | 'back'; bleed?: boolean; print?: boolean; foilMask?: boolean | 'print'; idx?: number | null; nested?: { x: number; y: number }; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const g = tkGeo(spec, data, side);
  const P = tkPalette(spec.palette);
  const f = tkFont(spec.font);
  const b = bleed ? TK_BLEED_MM * U : 0;
  const c: Ctx = { spec, data, g, P, f, uid, print, bl: b };
  const vb = `${-b} ${-b} ${g.W + 2 * b} ${g.H + 2 * b}`;
  const cut = cutPath(g);
  let body: ReactNode;
  if (foilMask) {
    const inv = foilMask === 'print';
    body = <>
      <rect x={-b} y={-b} width={g.W + 2 * b} height={g.H + 2 * b} fill={inv ? '#FFFFFF' : '#000000'} />
      {g.foil && side === 'front' && <rect x={g.foil[0]} y={0} width={g.foil[1] - g.foil[0]} height={g.H} fill={inv ? '#000000' : '#FFFFFF'} />}
    </>;
  } else {
    body = g.card ? (side === 'front' ? CardFront(c) : CardBack(c)) : (side === 'front' ? FrontPaper(c) : BackPaper(c));
  }
  const holo = g.foil && side === 'front' && !print && !foilMask
    ? <g data-foil="1">
      <rect x={g.foil[0]} y={0} width={g.foil[1] - g.foil[0]} height={g.H} fill={`url(#${uid}-holo)`} />
      {Array.from({ length: Math.ceil(g.H / (2.2 * U)) + 4 }, (_, i) => <line key={i} x1={g.foil![0]} x2={g.foil![1]} y1={i * 2.2 * U - 2 * U} y2={i * 2.2 * U + 2 * U} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.25 * U} />)}
    </g> : null;
  const perf = !print && !foilMask && !g.card
    ? <line data-perf="1" x1={g.perfX} x2={g.perfX} y1={NOTCH} y2={g.H - NOTCH} stroke={P.dark && side === 'front' ? '#FFFFFF' : P.ink} strokeOpacity={0.55} strokeWidth={0.35 * U} strokeDasharray={`${0.7 * U} ${0.7 * U}`} />
    : null;
  const dyn = !foilMask && idx !== null && side === dynSide(spec) ? <TicketDynamic spec={spec} data={data} i={idx} P0={P} /> : null;
  const content = <>
    <defs>
      <linearGradient id={`${uid}-bgv`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.bg2} /><stop offset="1" stopColor={P.bg} /></linearGradient>
      <linearGradient id={`${uid}-bgd`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.bg} /><stop offset="1" stopColor={P.bg2} /></linearGradient>
      <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity="0.42" /><stop offset="1" stopColor="#FFFFFF" stopOpacity="0" /></linearGradient>
      <linearGradient id={`${uid}-holo`} x1="0" y1="0" x2="0.4" y2="1">
        {['#E8E8F0', '#B7F0F4', '#F6C6EA', '#FFF2B3', '#C8F5C5', '#C6D4FF', '#F3C0D9', '#E8E8F0'].map((cc, i, a) => <stop key={i} offset={i / (a.length - 1)} stopColor={cc} />)}
      </linearGradient>
      {!bleed && <clipPath id={`${uid}-cut`}><path d={cut} /></clipPath>}
    </defs>
    {/* nền tràn lề xén */}
    {!foilMask && bleed && <rect x={-b} y={-b} width={g.W + 2 * b} height={g.H + 2 * b} fill={g.card ? (side === 'front' ? P.bg : P.paper) : P.paper} />}
    <g clipPath={bleed ? undefined : `url(#${uid}-cut)`}>
      {body}{holo}{perf}{dyn}
    </g>
  </>;
  if (nested) return <svg x={nested.x} y={nested.y} width={g.W + 2 * b} height={g.H + 2 * b} viewBox={vb} overflow="hidden">{content}</svg>;
  return <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-side={side}>{content}</svg>;
}

/** trang kỹ thuật: đường cắt + răng cưa + ghi chú — kèm PDF in */
export function TicketDieSvg({ spec, data }: { spec: TKSpec; data: TKData }) {
  const g = tkGeo(spec, data);
  const sz = tkSize(spec.size);
  const b = TK_BLEED_MM * U;
  const notes = [
    `Khổ thành phẩm ${sz.wMm} × ${sz.hMm} mm · tràn lề ${TK_BLEED_MM} mm · bo góc R${sz.radiusMm} mm`,
    g.card ? 'Thẻ cứng: số thẻ + QR in ở mặt sau' : `Răng cưa (bế xé) cách mép ${g.right ? 'phải' : 'trái'} ${sz.stubMm} mm · 2 khấc bán nguyệt R${NOTCH / U} mm`,
    `Số vé ${serialOf(data, 0)} → ${serialOf(data, tkCount(data) - 1)} · QR = mã sự kiện + số vé`,
    spec.foil ? 'Dải nhũ hologram: theo trang “khuôn ép nhũ” (vùng đen)' : '',
  ].filter(Boolean);
  const fs = 2.6 * U * Math.min(1, sz.hMm / 70);
  const tx = g.card ? 5 * U : (g.right ? 6 * U : g.perfX + 6 * U);
  return (
    <svg viewBox={`${-b} ${-b} ${g.W + 2 * b} ${g.H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" data-die="1">
      <rect x={-b} y={-b} width={g.W + 2 * b} height={g.H + 2 * b} fill="#FFFFFF" />
      <path d={cutPath(g)} fill="none" stroke={CUTCONTOUR} strokeWidth={U * 0.3} />
      {!g.card && <line x1={g.perfX} x2={g.perfX} y1={NOTCH} y2={g.H - NOTCH} stroke={PERF} strokeWidth={U * 0.3} strokeDasharray={`${U * 1.2} ${U * 0.8}`} />}
      {notes.map((t, i) => <text key={i} x={tx} y={10 * U + i * fs * 1.9} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill="#555">{t}</text>)}
      <text x={tx} y={g.H - 6 * U} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={CUTCONTOUR}>— Đường cắt</text>
      {!g.card && <text x={tx + 34 * U * Math.min(1, sz.hMm / 70)} y={g.H - 6 * U} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={PERF}>- - Răng cưa</text>}
    </svg>
  );
}

// ---------- tờ in hàng loạt (32,5 × 43 cm) — xoay vé 90° nếu xếp được nhiều hơn ----------
export const TK_SHEET = { wMm: 325, hMm: 430, marginMm: 8, gapMm: 2 * TK_BLEED_MM, footMm: 6 };
export function tkSheetFit(spec: TKSpec) {
  const sz = tkSize(spec.size);
  const gp = TK_SHEET.gapMm;
  const calc = (cw: number, ch: number) => {
    const cols = Math.max(1, Math.floor((TK_SHEET.wMm - TK_SHEET.marginMm * 2 + gp) / (cw + gp)));
    const rows = Math.max(1, Math.floor((TK_SHEET.hMm - TK_SHEET.marginMm * 2 - TK_SHEET.footMm + gp) / (ch + gp)));
    return { cols, rows, per: cols * rows, x0: (TK_SHEET.wMm - (cols * cw + (cols - 1) * gp)) / 2, y0: (TK_SHEET.hMm - TK_SHEET.footMm - (rows * ch + (rows - 1) * gp)) / 2, cw, ch };
  };
  const a = calc(sz.wMm, sz.hMm), r = calc(sz.hMm, sz.wMm);
  return r.per > a.per ? { ...r, rot: true, sz } : { ...a, rot: false, sz };
}
export const tkSheetPages = (spec: TKSpec, data: TKData) => Math.ceil(tkCount(data) / tkSheetFit(spec).per);

/** tờ in: hình vé (defs dùng chung) + số/QR/ghế RIÊNG từng vé · CutContour · Perf. Mặt sau lật gương cho in 2 mặt khớp. */
export function TicketSheetSvg({ spec, data, side, page = 0, style }: { spec: TKSpec; data: TKData; side: 'front' | 'back'; page?: number; style?: CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const fit = tkSheetFit(spec);
  const g = tkGeo(spec, data, side);
  const SW = TK_SHEET.wMm * U, SH = TK_SHEET.hMm * U;
  const w = g.W, h = g.H, b = TK_BLEED_MM * U, gp = TK_SHEET.gapMm * U;
  const cw = fit.cw * U, ch = fit.ch * U;
  const numbered = side === dynSide(spec);
  const count = tkCount(data);
  const first = page * fit.per;
  const n = Math.max(0, Math.min(fit.per, count - first));
  const P = tkPalette(spec.palette);
  const cells = Array.from({ length: n }, (_, i) => {
    const col = i % fit.cols, row = Math.floor(i / fit.cols);
    let x = fit.x0 * U + col * (cw + gp);
    const y = fit.y0 * U + row * (ch + gp);
    if (side === 'back') x = SW - x - cw; // lật gương ngang
    // ma trận đặt vé vào ô: thẳng, hoặc xoay 90° (mặt sau xoay -90° để lật khớp mặt trước)
    const tf = !fit.rot ? `translate(${f1(x)} ${f1(y)})` : side === 'front' ? `translate(${f1(x + h)} ${f1(y)}) rotate(90)` : `translate(${f1(x)} ${f1(y + w)}) rotate(-90)`;
    return { tf, idx: first + i };
  });
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} width={`${TK_SHEET.wMm}mm`} height={`${TK_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet-page={page} data-count={n} data-side={side}>
      <rect x={0} y={0} width={SW} height={SH} fill="#FFFFFF" />
      <defs>
        <g id={`${u}-tk`} data-card-def="1"><TicketSvg spec={spec} data={data} side={side} bleed print idx={null} nested={{ x: 0, y: 0 }} /></g>
        <path id={`${u}-cut`} d={cutPath(g)} />
      </defs>
      <g id="In">
        {cells.map((c, i) => <g key={i} transform={c.tf}><use href={`#${u}-tk`} x={-b} y={-b} /></g>)}
        {numbered && cells.map((c, i) => <g key={`d${i}`} transform={c.tf}><TicketDynamic spec={spec} data={data} i={c.idx} P0={P} /></g>)}
      </g>
      <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1}>
        <title>CutContour</title>
        {cells.map((c, i) => <g key={i} transform={c.tf}><use href={`#${u}-cut`} /></g>)}
      </g>
      {!g.card && <g id="Perf" data-name="Perf" stroke={PERF} strokeWidth={1} strokeDasharray="8 6">
        {cells.map((c, i) => <g key={i} transform={c.tf}><line x1={f1(g.perfX)} x2={f1(g.perfX)} y1={NOTCH} y2={f1(h - NOTCH)} /></g>)}
      </g>}
      <text x={TK_SHEET.marginMm * U} y={SH - 2.6 * U} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={26} fill="#9CA3AF">
        {`Mivy · ${side === 'front' ? 'mặt trước' : 'mặt sau (lật gương)'} · tờ ${page + 1}${numbered && cells.length ? ` · vé ${serialOf(data, cells[0].idx)} đến ${serialOf(data, cells[cells.length - 1].idx)}` : ''} · ${n} vé · ${fit.sz.name}${fit.rot ? ' · xoay 90°' : ''}`}
      </text>
    </svg>
  );
}
