'use client';
// Tờ rơi / flyer: 1 engine SVG = BỐ CỤC (6 ngành) × BẢNG MÀU × FONT → nhiều mẫu, render code 100%, 0 AI realtime.
// Khổ A (A6/A5/A4 cùng tỉ lệ √2) → thiết kế trên lưới chuẩn rộng 1000 đơn vị, cao 1000·h/w; lề xén 2mm quy đổi theo khổ.
// Chữ ĐO THẬT bằng canvas (font đã tải) → co/xuống dòng cho vừa, không bao giờ tràn khổ. Ảnh khách (tuỳ chọn) cắt vừa ô;
// không có ảnh thì ô ảnh là hình vẽ code theo ngành. Mặt sau: bảng giá + bản đồ vẽ code + mã QR thật (quét được).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

// ---------- khổ ----------
export interface FLSize { id: string; name: string; wMm: number; hMm: number }
export const FL_SIZES: FLSize[] = [
  { id: 'a5', name: 'A5 · 148×210mm', wMm: 148, hMm: 210 },
  { id: 'a4', name: 'A4 · 210×297mm', wMm: 210, hMm: 297 },
  { id: 'a6', name: 'A6 · 105×148mm', wMm: 105, hMm: 148 },
];
export const flSize = (id: string) => FL_SIZES.find((s) => s.id === id) || FL_SIZES[0];
export const FL_BLEED_MM = 2;
const GW = 1000; // bề rộng lưới thiết kế

// ---------- font (chỉ dùng font có TTF ở /public/fonts → file in outline được) ----------
export interface FLFont { id: string; name: string; family: string; weight: number }
export const FL_FONTS: FLFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const flFont = (id: string) => FL_FONTS.find((f) => f.id === id) || FL_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const FL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&display=swap');`;

export function useFLFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-fl-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-fl-fonts'; link.rel = 'stylesheet';
        link.href = FL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...FL_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface FLPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string; deep: string; on2: string }
export const FL_PALETTES: FLPalette[] = [
  { id: 'red', name: 'Đỏ may mắn', paper: '#FFF8F2', ink: '#2B1210', sub: '#7A4B40', accent: '#C8102E', accent2: '#FFC43D', onAccent: '#FFFFFF', deep: '#8E0B21', on2: '#2B1210' },
  { id: 'navy', name: 'Navy', paper: '#F5F7FB', ink: '#14213D', sub: '#55627A', accent: '#1F3A68', accent2: '#E0B44C', onAccent: '#FFFFFF', deep: '#132849', on2: '#14213D' },
  { id: 'purple', name: 'Tím', paper: '#FBF7FF', ink: '#24113F', sub: '#6A5684', accent: '#6D28D9', accent2: '#FACC15', onAccent: '#FFFFFF', deep: '#4C1D95', on2: '#24113F' },
  { id: 'rose', name: 'Hồng nude', paper: '#FFF8F6', ink: '#3B1F22', sub: '#86625F', accent: '#B85C6E', accent2: '#EBCFBF', onAccent: '#FFFFFF', deep: '#8E3F50', on2: '#3B1F22' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#F2FAF8', ink: '#0C2F2B', sub: '#4C6F69', accent: '#0F766E', accent2: '#F2A541', onAccent: '#FFFFFF', deep: '#0B4F4A', on2: '#0C2F2B' },
  { id: 'forest', name: 'Rừng', paper: '#F7F4EC', ink: '#1B2A1F', sub: '#5B6B5E', accent: '#2F5D3A', accent2: '#E4A32B', onAccent: '#FFFFFF', deep: '#1F3F27', on2: '#1B2A1F' },
  { id: 'clay', name: 'Đất nung', paper: '#FFF7F0', ink: '#2E1A12', sub: '#7A584A', accent: '#C2562F', accent2: '#F2C94C', onAccent: '#FFFFFF', deep: '#8F3C1F', on2: '#2E1A12' },
  { id: 'orange', name: 'Cam năng động', paper: '#FFFAF3', ink: '#231A0F', sub: '#6E5B45', accent: '#E8590C', accent2: '#1D3557', onAccent: '#FFFFFF', deep: '#A8400A', on2: '#FFFFFF' },
  { id: 'indigo', name: 'Indigo', paper: '#F6F6FF', ink: '#1E1B38', sub: '#5A5781', accent: '#4F46E5', accent2: '#F59E0B', onAccent: '#FFFFFF', deep: '#3730A3', on2: '#1E1B38' },
  { id: 'dark', name: 'Đen vàng', paper: '#16181D', ink: '#F4F2EC', sub: '#AEB2BC', accent: '#C8A24A', accent2: '#E9D8A6', onAccent: '#16181D', deep: '#0C0D10', on2: '#16181D' },
];
export const flPalette = (id: string) => FL_PALETTES.find((p) => p.id === id) || FL_PALETTES[0];

// ---------- bố cục ----------
export interface FLLayout { id: string; name: string }
export const FL_LAYOUTS: FLLayout[] = [
  { id: 'grand', name: 'Khai trương' },
  { id: 'sale', name: 'Khuyến mãi' },
  { id: 'service', name: 'Dịch vụ' },
  { id: 'menu', name: 'Menu quán' },
  { id: 'hiring', name: 'Tuyển dụng' },
  { id: 'course', name: 'Lớp học' },
];

export interface FLSpec { layout: string; palette: string; font: string; size: string; sides: 1 | 2 }
export interface FLTemplate { id: string; name: string; spec: Pick<FLSpec, 'layout' | 'palette' | 'font'> }
const PICKS: Record<string, [string, string][]> = {
  grand: [['red', 'montserrat'], ['navy', 'montserrat']],
  sale: [['red', 'oswald'], ['purple', 'oswald']],
  service: [['rose', 'playfair'], ['dark', 'playfair'], ['teal', 'bvp']],
  menu: [['forest', 'baloo'], ['clay', 'baloo']],
  hiring: [['orange', 'montserrat'], ['navy', 'oswald']],
  course: [['indigo', 'bvp'], ['teal', 'montserrat']],
};
export const FL_TEMPLATES: FLTemplate[] = FL_LAYOUTS.flatMap((l) =>
  (PICKS[l.id] || []).map(([palette, font]) => ({ id: `${l.id}-${palette}`, name: `${l.name} · ${flPalette(palette).name}`, spec: { layout: l.id, palette, font } })),
);

// ---------- nội dung ----------
export type FLData = Record<string, string>;
export interface FLField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; back?: boolean }
export const FL_FIELDS: FLField[] = [
  { key: 'brand', label: 'Thương hiệu', ph: 'AN KHANG COFFEE', half: true },
  { key: 'eyebrow', label: 'Dòng nhỏ trên', ph: 'CHÍNH THỨC KHAI TRƯƠNG', half: true },
  { key: 'title', label: 'Tiêu đề lớn', ph: 'Khai trương chi nhánh mới' },
  { key: 'highlight', label: 'Điểm nhấn', ph: 'GIẢM 30%', half: true },
  { key: 'subtitle', label: 'Dòng phụ (ngày giờ…)', ph: 'Thứ Bảy 12.12 · 8:00 – 22:00', half: true },
  { key: 'bullets', label: 'Ưu đãi / điểm nổi bật (mỗi dòng 1 ý)', multiline: true },
  { key: 'phone', label: 'Điện thoại', ph: '0909 123 456', half: true },
  { key: 'website', label: 'Website / fanpage (tạo mã QR)', ph: 'ankhangcoffee.vn', half: true },
  { key: 'address', label: 'Địa chỉ', ph: '25 Lê Lợi, Q.1, TP.HCM' },
  { key: 'backTitle', label: 'Tiêu đề mặt sau', ph: 'BẢNG GIÁ', back: true },
  { key: 'prices', label: 'Bảng giá (mỗi dòng: Tên | Giá)', multiline: true, back: true },
];

const BASE = { phone: '0909 123 456' };
export const FL_SAMPLES: Record<string, FLData> = {
  grand: {
    ...BASE, brand: 'AN KHANG COFFEE', eyebrow: 'CHÍNH THỨC KHAI TRƯƠNG', title: 'Khai trương chi nhánh mới', highlight: 'GIẢM 30%',
    subtitle: 'Thứ Bảy 12.12 · 8:00 – 22:00', bullets: 'Giảm 30% toàn menu 3 ngày đầu\nTặng ly sứ cho 100 khách đầu tiên\nCheck-in nhận bánh miễn phí',
    address: '25 Lê Lợi, P. Bến Thành, Q.1, TP.HCM', website: 'ankhangcoffee.vn', backTitle: 'MENU NỔI BẬT',
    prices: 'Cà phê sữa đá | 29K\nBạc xỉu | 32K\nTrà đào cam sả | 39K\nMatcha latte | 45K\nCold brew cam vàng | 49K\nBánh croissant bơ | 35K',
  },
  sale: {
    ...BASE, brand: 'THU HÀ BOUTIQUE', eyebrow: 'BLACK FRIDAY', title: 'Siêu sale cuối năm', highlight: 'GIẢM ĐẾN 50%',
    subtitle: 'Từ 20/11 đến hết 30/11', bullets: 'Đồng giá 199K hàng trăm mẫu\nMua 2 tặng 1 phụ kiện\nFreeship đơn từ 300K',
    address: '88 Nguyễn Trãi, P.3, Q.5, TP.HCM', website: 'thuhaboutique.vn', backTitle: 'BẢNG GIÁ ƯU ĐÃI',
    prices: 'Đầm công sở | 299K\nÁo sơ mi lụa | 199K\nQuần tây ống suông | 249K\nChân váy midi | 219K\nÁo khoác blazer | 459K',
  },
  service: {
    ...BASE, brand: 'GIA KHÁNH SPA', eyebrow: 'CHĂM SÓC DA CHUẨN Y KHOA', title: 'Làn da khoẻ, rạng rỡ mỗi ngày', highlight: 'Chỉ từ 199K',
    subtitle: 'Mở cửa 9:00 – 21:00 mỗi ngày', bullets: 'Chăm sóc da chuyên sâu\nTrị mụn chuẩn y khoa\nMassage body thư giãn\nGội đầu dưỡng sinh',
    address: '146 Hai Bà Trưng, P. Đa Kao, Q.1, TP.HCM', website: 'giakhanhspa.vn', backTitle: 'BẢNG GIÁ DỊCH VỤ',
    prices: 'Chăm sóc da cơ bản | 199K\nTrị mụn chuyên sâu | 399K\nMassage body 60 phút | 350K\nGội đầu dưỡng sinh | 120K\nTriệt lông nách | 150K\nNâng cơ trẻ hoá | 690K',
  },
  menu: {
    ...BASE, brand: 'BẾP NHÀ QUỐC BẢO', eyebrow: 'CƠM NHÀ · GIAO TẬN NƠI', title: 'Thực đơn hôm nay', highlight: 'Freeship 3km',
    subtitle: 'Đặt trước 10:30 để kịp bữa trưa', bullets: 'Nấu mới mỗi ngày\nGiao nhanh 30 phút\nNhận đặt cơm văn phòng',
    address: '72 Võ Văn Tần, P.6, Q.3, TP.HCM', website: 'bepnhaquocbao.vn', backTitle: 'THỰC ĐƠN ĐẦY ĐỦ',
    prices: 'Cơm gà xối mỡ | 45K\nCơm sườn bì chả | 50K\nBún bò Huế | 55K\nCanh chua cá lóc | 60K\nGỏi cuốn tôm thịt | 35K\nTrà đá / trà tắc | 10K',
  },
  hiring: {
    ...BASE, brand: 'AN KHANG COFFEE', eyebrow: 'CƠ HỘI VIỆC LÀM', title: 'TUYỂN DỤNG', highlight: '8 – 12 triệu',
    subtitle: 'Nhân viên pha chế (Barista)', bullets: 'Lương cứng + thưởng doanh số\nĐào tạo pha chế từ đầu\nXoay ca linh hoạt, nghỉ 4 ngày/tháng\nMôi trường trẻ, thân thiện',
    address: '25 Lê Lợi, P. Bến Thành, Q.1, TP.HCM', website: 'ankhangcoffee.vn/tuyen-dung', backTitle: 'VỊ TRÍ ĐANG TUYỂN',
    prices: 'Pha chế (Barista) | 2 người\nPhục vụ bàn | 3 người\nThu ngân | 1 người\nQuản lý ca | 1 người',
  },
  course: {
    ...BASE, brand: 'ANH NGỮ THU HÀ', eyebrow: 'KHAI GIẢNG', title: 'Tiếng Anh giao tiếp cho người đi làm', highlight: '05.01.2027',
    subtitle: 'Lớp tối 19:00 – 20:30 · Thứ 2-4-6', bullets: 'Giáo viên bản ngữ 100%\nLớp nhỏ tối đa 12 học viên\nCam kết đầu ra, học lại miễn phí',
    address: '210 Cách Mạng Tháng 8, P.10, Q.3, TP.HCM', website: 'anhnguthuha.edu.vn', backTitle: 'HỌC PHÍ CÁC KHOÁ',
    prices: 'Giao tiếp cơ bản (3 tháng) | 3.600K\nGiao tiếp nâng cao | 4.200K\nLuyện thi IELTS 6.5+ | 8.900K\nTiếng Anh trẻ em | 2.800K',
  },
};
export const defaultFLData = (layout = 'grand'): FLData => ({ ...(FL_SAMPLES[layout] || FL_SAMPLES.grand) });

// ---------- đo chữ thật ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} ${size}px "${ts.fam}"`;
  return mctx.measureText(s).width + ls;
}
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
  return out;
}
/** co chữ tới khi ≤ maxLines dòng; dòng nào vẫn dài (1 từ quá dài) thì co riêng dòng đó → luôn vừa bề rộng */
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.36) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1 && !text.includes('\n')) {
    // cân dòng: tìm bề rộng nhỏ nhất vẫn giữ nguyên số dòng → tránh 1 chữ mồ côi ở dòng cuối
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  return { lines, size: s };
}

type Anchor = 'start' | 'middle' | 'end';
interface BlockOpts { text: string; x: number; y: number; maxW: number; size: number; maxLines?: number; lh?: number; anchor?: Anchor; ts: TS; fill: string; upper?: boolean; opacity?: number }
/** khối chữ đặt theo MÉP TRÊN (y), trả về chiều cao đã chiếm để xếp tiếp phần dưới */
function block(o: BlockOpts): { el: ReactNode; h: number } {
  const text = o.upper ? (o.text || '').toUpperCase() : o.text || '';
  if (!text.trim()) return { el: null, h: 0 };
  const { lines, size } = fitBlock(text, o.maxW, o.size, o.ts, o.maxLines ?? 2);
  const lh = (o.lh ?? 1.12) * size;
  const el = (
    <g fontFamily={`"${o.ts.fam}"`} fontWeight={o.ts.wt} fill={o.fill} textAnchor={o.anchor || 'start'} letterSpacing={o.ts.ls || undefined} opacity={o.opacity}>
      {lines.map((ln, i) => <text key={i} x={o.x} y={o.y + size * 0.9 + i * lh} fontSize={fitSize(ln, o.maxW, size, o.ts)}>{ln}</text>)}
    </g>
  );
  return { el, h: size * 0.9 + (lines.length - 1) * lh + size * 0.28 };
}

// ---------- icon nét (24×24) ----------
const ICON: Record<string, string> = {
  phone: 'M6.5 3h3l1.5 4.5-2 1.3a12 12 0 005.7 5.7L16 16.5l4.5 1.5v3a1.5 1.5 0 01-1.6 1.5C10 22 2 14 2 5.1A1.5 1.5 0 013.5 3.5z',
  pin: 'M12 22s7-6.7 7-12A7 7 0 005 10c0 5.3 7 12 7 12zM12 7.5A2.5 2.5 0 1012 12.5 2.5 2.5 0 0012 7.5z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  grand: 'M3 9l1.6-5h14.8L21 9M3 9h18M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0M5 12v8h14v-8M10 20v-5h4v5',
  sale: 'M3 12.5V4h8.5L21 13.5 13.5 21zM7.5 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3z',
  service: 'M12 3c4 3.5 6 7 6 10a6 6 0 01-12 0c0-3 2-6.5 6-10zM12 21v-9M12 15l-3-2.5M12 13l3-2.5',
  menu: 'M4 8h13v5a6 6 0 01-6 6h-1a6 6 0 01-6-6zM17 9.5h1.5a2.5 2.5 0 010 5H17M7.5 2.5v3M10.5 2.5v3M13.5 2.5v3',
  hiring: 'M3 8h18v12H3zM8.5 8V5h7v3M3 13.5h18M11 12.5h2v2h-2z',
  course: 'M2 9l10-5 10 5-10 5zM6 11v5.5c3.5 2.5 8.5 2.5 12 0V11M22 9v6',
};
function Ico({ k, x, y, s, color, w = 1.9 }: { k: string; x: number; y: number; s: number; color: string; w?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 24})`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON[k]} />
    </g>
  );
}

// ---------- hình phụ ----------
const star = (cx: number, cy: number, R: number, r: number, n = 22) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = (Math.PI * i) / n - Math.PI / 2, rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
  }
  return d + 'Z';
};
const rr = (x: number, y: number, w: number, h: number, r: number) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const circ = (cx: number, cy: number, r: number) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${r * 2} 0a${r} ${r} 0 1 0 ${-r * 2} 0Z`;
const qrUrl = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${w.trim()}`);
const splitLines = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const priceRows = (s: string) => splitLines(s).map((ln) => { const [n, ...rest] = ln.split('|'); return { name: n.trim(), price: rest.join('|').trim() }; });

// ---------- SVG tờ rơi ----------
export function FlyerSvg({ spec, data, side = 'front', bleed = false, photo, style }: {
  spec: FLSpec; data: FLData; side?: 'front' | 'back'; bleed?: boolean; photo?: string; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sz = flSize(spec.size);
  const W = GW, H = Math.round((GW * sz.hMm) / sz.wMm);
  const b = bleed ? (FL_BLEED_MM * GW) / sz.wMm : 0;
  const p = flPalette(spec.palette);
  const f = flFont(spec.font);
  const D: TS = { fam: f.family, wt: f.weight };
  const B6: TS = { fam: BODY, wt: 600 };
  const B8: TS = { fam: BODY, wt: 800 };
  const m = 70; // lề an toàn ~10mm (A5)
  const cx = W / 2;
  const bullets = splitLines(data.bullets).slice(0, 6);
  const prices = priceRows(data.prices).slice(0, 10);
  const defs: ReactNode[] = [];

  // ô ảnh: ảnh khách (cắt vừa) hoặc hình vẽ code theo ngành
  const photoSlot = (d: string, bx: { x: number; y: number; w: number; h: number }, art: { c1: string; c2: string; ink: string; icon: string }) => {
    const id = `${uid}ph${defs.length}`;
    defs.push(<clipPath key={id} id={id}><path d={d} /></clipPath>);
    if (photo) return <image href={photo} x={bx.x} y={bx.y} width={bx.w} height={bx.h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />;
    const gid = `${id}g`;
    defs.push(<linearGradient key={gid} id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={art.c1} /><stop offset="1" stopColor={art.c2} /></linearGradient>);
    const s = Math.min(bx.w, bx.h);
    const ccx = bx.x + bx.w / 2, ccy = bx.y + bx.h / 2;
    return (
      <g clipPath={`url(#${id})`}>
        <rect x={bx.x} y={bx.y} width={bx.w} height={bx.h} fill={`url(#${gid})`} />
        {[0.95, 0.75, 0.55].map((k, i) => <circle key={i} cx={bx.x + bx.w * 0.82} cy={bx.y + bx.h * 0.18} r={s * k * 0.6} fill="none" stroke={art.ink} strokeOpacity={0.12} strokeWidth={s * 0.035} />)}
        <circle cx={bx.x + bx.w * 0.12} cy={bx.y + bx.h * 0.9} r={s * 0.32} fill={art.ink} opacity={0.08} />
        {Array.from({ length: 18 }).map((_, i) => <circle key={`d${i}`} cx={bx.x + bx.w * (0.08 + (i % 6) * 0.05)} cy={bx.y + bx.h * (0.1 + Math.floor(i / 6) * 0.06)} r={s * 0.008} fill={art.ink} opacity={0.35} />)}
        <circle cx={ccx} cy={ccy} r={s * 0.24} fill={art.ink} opacity={0.12} />
        <Ico k={art.icon} x={ccx - s * 0.15} y={ccy - s * 0.15} s={s * 0.3} color={art.ink} w={1.5} />
      </g>
    );
  };

  // QR thật (ô trắng + vùng yên tĩnh)
  const QR = ({ x, y, s, fg }: { x: number; y: number; s: number; fg: string }) => {
    if (!data.website?.trim()) return null;
    const q = qrPath(qrUrl(data.website));
    const pad = s * 0.08, cell = (s - pad * 2) / q.n;
    return (
      <g data-qr="1">
        <path d={rr(x, y, s, s, s * 0.08)} fill="#FFFFFF" />
        <path d={q.d} transform={`translate(${x + pad} ${y + pad}) scale(${cell})`} fill={fg} />
      </g>
    );
  };

  // dải liên hệ cuối trang: SĐT to, địa chỉ, web + QR bên phải
  const FOOT = 250;
  const Footer = ({ bg, fg, fg2, ic, qrFg, round = false }: { bg: string; fg: string; fg2: string; ic: string; qrFg: string; round?: boolean }) => {
    const y0 = H - FOOT;
    const hasQr = !!data.website?.trim();
    const qs = 176;
    const tw = W - m * 2 - (hasQr ? qs + 40 : 0);
    let y = y0 + 44;
    const parts: ReactNode[] = [];
    if (data.phone) {
      const s = fitSize(data.phone, tw - 70, 54, B8);
      parts.push(<g key="ph"><Ico k="phone" x={m} y={y + 4} s={46} color={ic} w={2.1} /><text x={m + 66} y={y + s * 0.86} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={s} fill={fg}>{data.phone}</text></g>);
      y += 78;
    }
    if (data.address) {
      const bl = block({ text: data.address, x: m + 58, y: y - 2, maxW: tw - 58, size: 28, maxLines: 2, lh: 1.2, ts: B6, fill: fg2 });
      parts.push(<g key="ad"><Ico k="pin" x={m + 4} y={y} s={34} color={ic} />{bl.el}</g>);
      y += Math.max(44, bl.h + 8);
    }
    if (data.website && y < H - 40) {
      const s = fitSize(data.website, tw - 58, 28, B6);
      parts.push(<g key="web"><Ico k="globe" x={m + 4} y={y} s={34} color={ic} /><text x={m + 58} y={y + 27} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={s} fill={fg2}>{data.website}</text></g>);
    }
    return (
      <g>
        <path d={round ? `M${-b} ${y0 + 40}Q${W * 0.5} ${y0 - 40} ${W + b} ${y0 + 40}V${H + b}H${-b}Z` : `M${-b} ${y0}H${W + b}V${H + b}H${-b}Z`} fill={bg} />
        {parts}
        {hasQr && <QR x={W - m - qs} y={y0 + (FOOT - qs) / 2 + (round ? 14 : 0)} s={qs} fg={qrFg} />}
      </g>
    );
  };

  // gạch đầu dòng: tự co khoảng cách/cỡ chữ để vừa chiều cao cho phép (không bao giờ đè dải liên hệ)
  const Bullets = ({ x, y, w, maxH, size = 34, gap = 60, marker, ink, mk, mkInk, cols: cols0 = 1 }: {
    x: number; y: number; w: number; maxH: number; size?: number; gap?: number; marker: 'check' | 'num' | 'diamond' | 'dot'; ink: string; mk: string; mkInk: string; cols?: number;
  }) => {
    const items = bullets;
    let cols = cols0;
    if (!items.length || maxH < size * 0.8) return null;
    if (cols > 1 && items.some((t) => fitSize(t, w / cols - size * 1.25 - 14, size, B6) < size * 0.8)) cols = 1; // ý dài → 1 cột cho dễ đọc
    const rows = Math.ceil(items.length / cols);
    let g = gap, s = size;
    if (rows * g > maxH) { g = Math.max(gap * 0.8, maxH / rows); s = size * (g / gap); }
    const n = Math.min(items.length, Math.floor((maxH + g * 0.25) / g) * cols);
    const cw = w / cols;
    return (
      <g>
        {items.slice(0, n).map((t, i) => {
          const col = i % cols, row = Math.floor(i / cols);
          const bx = x + col * cw, by = y + row * g;
          const off = marker === 'num' ? s * 1.9 : s * 1.25;
          const fs = fitSize(t, cw - off - 14, s, B6);
          const cy = by + s * 0.55;
          let mark: ReactNode;
          if (marker === 'check') mark = <g><circle cx={bx + s * 0.42} cy={cy} r={s * 0.42} fill={mk} /><path d={`M${bx + s * 0.22} ${cy}l${s * 0.14} ${s * 0.15}l${s * 0.27} ${-s * 0.3}`} stroke={mkInk} strokeWidth={s * 0.1} fill="none" strokeLinecap="round" strokeLinejoin="round" /></g>;
          else if (marker === 'num') mark = <g><path d={rr(bx, cy - s * 0.66, s * 1.5, s * 1.32, s * 0.28)} fill={mk} /><text x={bx + s * 0.75} y={cy + s * 0.3} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={s * 0.78} fill={mkInk}>{String(i + 1).padStart(2, '0')}</text></g>;
          else if (marker === 'diamond') mark = <path d={`M${bx + s * 0.4} ${cy - s * 0.32}l${s * 0.32} ${s * 0.32}l${-s * 0.32} ${s * 0.32}l${-s * 0.32} ${-s * 0.32}z`} fill={mk} />;
          else mark = <circle cx={bx + s * 0.35} cy={cy} r={s * 0.18} fill={mk} />;
          return <g key={i}>{mark}<text x={bx + off} y={cy + fs * 0.36} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill={ink}>{t}</text></g>;
        })}
      </g>
    );
  };

  // bảng giá: tên … chấm dẫn … giá
  const Prices = ({ x, y, w, maxH, size = 36, gap = 70, ink, sub, pc, spread = false }: { x: number; y: number; w: number; maxH: number; size?: number; gap?: number; ink: string; sub: string; pc: string; spread?: boolean }) => {
    if (!prices.length) return null;
    let g = gap, s = size;
    if (prices.length * g > maxH) { g = Math.max(gap * 0.78, maxH / prices.length); s = size * (g / gap); }
    else if (spread) { g = Math.min(gap * 1.3, maxH / prices.length); s = size * Math.min(1.12, g / gap); }
    const n = Math.min(prices.length, Math.floor((maxH + g * 0.2) / g));
    return (
      <g>
        {prices.slice(0, n).map((r, i) => {
          const by = y + i * g + s;
          const ps = fitSize(r.price, w * 0.4, s, B8);
          const pw = textW(r.price, ps, B8);
          const ns = fitSize(r.name, w - pw - 60, s, B6);
          const nw = textW(r.name, ns, B6);
          return (
            <g key={i}>
              <text x={x} y={by} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={ns} fill={ink}>{r.name}</text>
              {r.price && <line x1={x + nw + 16} y1={by - s * 0.12} x2={x + w - pw - 16} y2={by - s * 0.12} stroke={sub} strokeWidth={4} strokeDasharray="2 10" strokeLinecap="round" opacity={0.7} />}
              <text x={x + w} y={by} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ps} fill={pc}>{r.price}</text>
            </g>
          );
        })}
      </g>
    );
  };

  const bg = (fill: string) => <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={fill} />;
  const LIMIT = H - FOOT - 26; // chữ thân không vượt quá đây
  let body: ReactNode;

  if (side === 'back') {
    // ===== MẶT SAU: tiêu đề + bảng giá + bản đồ vẽ code + QR =====
    const dark = p.id === 'dark';
    const head = 210;
    const t = block({ text: data.backTitle || 'BẢNG GIÁ', x: cx, y: 62, maxW: W - m * 2, size: 66, maxLines: 1, anchor: 'middle', ts: D, fill: p.onAccent, upper: true });
    const cardH = 330, cardY = H - m - cardH;
    const mapW = W - m * 2 - 280;
    const mapId = `${uid}map`;
    defs.push(<clipPath key={mapId} id={mapId}><path d={rr(m, cardY, mapW, cardH, 26)} /></clipPath>);
    const mx = m, my = cardY, mh = cardH * 0.56;
    const land = dark ? '#2A2D34' : '#ECEEF0', road = dark ? '#3B3F48' : '#FFFFFF';
    const listTop = head + 50;
    const hasList = prices.length > 0;
    body = (
      <>
        {bg(p.paper)}
        <rect x={-b} y={-b} width={W + b * 2} height={head + b} fill={p.accent} />
        <rect x={-b} y={head} width={W + b * 2} height={10} fill={p.accent2} />
        {t.el}
        {data.brand && block({ text: data.brand, x: cx, y: 62 + t.h + 6, maxW: W - m * 2, size: 30, maxLines: 1, anchor: 'middle', ts: { ...B8, ls: 4 }, fill: p.onAccent, upper: true, opacity: 0.85 }).el}
        {hasList
          ? <Prices x={m} y={listTop} w={W - m * 2} maxH={cardY - listTop - 40} size={38} gap={80} ink={p.ink} sub={p.sub} pc={p.accent} spread />
          : <Bullets x={m} y={listTop} w={W - m * 2} maxH={cardY - listTop - 40} size={38} gap={80} marker="check" ink={p.ink} mk={p.accent} mkInk={p.onAccent} />}
        {/* thẻ bản đồ + địa chỉ */}
        <path d={rr(m, cardY, mapW, cardH, 26)} fill={dark ? '#20232A' : '#FFFFFF'} stroke={p.ink} strokeOpacity={0.1} strokeWidth={2} />
        <g clipPath={`url(#${mapId})`}>
          <rect x={mx} y={my} width={mapW} height={mh} fill={land} />
          {Array.from({ length: 7 }).map((_, i) => <line key={`v${i}`} x1={mx + 40 + i * 82} y1={my} x2={mx + 10 + i * 82} y2={my + mh} stroke={road} strokeWidth={9} />)}
          {Array.from({ length: 3 }).map((_, i) => <line key={`h${i}`} x1={mx} y1={my + 40 + i * 62} x2={mx + mapW} y2={my + 52 + i * 62} stroke={road} strokeWidth={9} />)}
          <path d={`M${mx - 10} ${my + mh * 0.82}C${mx + mapW * 0.3} ${my + mh * 0.55} ${mx + mapW * 0.6} ${my + mh * 1.05} ${mx + mapW + 10} ${my + mh * 0.7}`} stroke={dark ? '#2F4E6B' : '#B9DDF2'} strokeWidth={26} fill="none" />
          <line x1={mx} y1={my + mh * 0.3} x2={mx + mapW} y2={my + mh * 0.18} stroke={dark ? '#6B5A2E' : '#F6D27A'} strokeWidth={16} />
          <circle cx={mx + mapW * 0.55} cy={my + mh * 0.5} r={46} fill={p.accent} opacity={0.18} />
          <path d={`M${mx + mapW * 0.55} ${my + mh * 0.5 + 8}c-26-30-34-44-34-58a34 34 0 0168 0c0 14-8 28-34 58z`} fill={p.accent} />
          <circle cx={mx + mapW * 0.55} cy={my + mh * 0.5 - 52} r={12} fill="#FFFFFF" />
          <rect x={mx} y={my + mh} width={mapW} height={cardH - mh} fill={dark ? '#20232A' : '#FFFFFF'} />
        </g>
        {block({ text: data.address || '', x: m + 28, y: my + mh + 18, maxW: mapW - 56, size: 28, maxLines: 2, lh: 1.18, ts: B6, fill: p.ink }).el}
        {data.phone && <text x={m + 28} y={cardY + cardH - 28} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fitSize(data.phone, mapW - 56, 38, B8)} fill={p.accent}>{data.phone}</text>}
        {/* QR */}
        {data.website?.trim() ? (
          <g>
            <path d={rr(W - m - 250, cardY, 250, cardH, 26)} fill={p.accent} />
            <QR x={W - m - 225} y={cardY + 25} s={200} fg={dark ? '#16181D' : p.deep} />
            {block({ text: 'QUÉT MÃ XEM THÊM', x: W - m - 125, y: cardY + 246, maxW: 210, size: 24, maxLines: 2, lh: 1.15, anchor: 'middle', ts: { ...B8, ls: 1 }, fill: p.onAccent }).el}
          </g>
        ) : (
          <g>
            <path d={rr(W - m - 250, cardY, 250, cardH, 26)} fill={p.accent} />
            <Ico k={spec.layout} x={W - m - 125 - 60} y={cardY + cardH / 2 - 60} s={120} color={p.onAccent} w={1.4} />
          </g>
        )}
      </>
    );
  } else if (spec.layout === 'grand') {
    // ===== KHAI TRƯƠNG: ảnh tràn trên + sóng, huy hiệu ưu đãi, ưu đãi tick =====
    const ph = H * 0.36;
    const wave = `M${-b} ${-b}H${W + b}V${ph - 30}C${W * 0.72} ${ph + 40} ${W * 0.32} ${ph - 70} ${-b} ${ph + 10}Z`;
    const bx = { x: -b, y: -b, w: W + b * 2, h: ph + 60 + b };
    const badgeR = 128, bcx = W - m - badgeR + 10, bcy = ph - 40;
    const hl = fitBlock(data.highlight || '', badgeR * 1.5, 70, D, 3);
    const brandW = Math.min(W * 0.6, textW(data.brand || '', 30, { ...B8, ls: 3 }) + 56);
    let y = ph + 100;
    const eb = block({ text: data.eyebrow, x: m, y, maxW: W - m * 2, size: 30, maxLines: 1, ts: { ...B8, ls: 4 }, fill: p.accent, upper: true }); y += eb.h + 10;
    const tt = block({ text: data.title, x: m, y, maxW: W - m * 2, size: 92, maxLines: 2, lh: 1.04, ts: D, fill: p.ink }); y += tt.h + 18;
    const subY = y; if (data.subtitle) y += 62;
    body = (
      <>
        {bg(p.paper)}
        {photoSlot(wave, bx, { c1: p.accent, c2: p.deep, ink: p.onAccent, icon: 'grand' })}
        {data.brand && (
          <g>
            <path d={rr(m, m, brandW, 64, 32)} fill={p.paper} />
            <text x={m + brandW / 2} y={m + 43} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fitSize(data.brand, brandW - 56, 30, { ...B8, ls: 3 })} letterSpacing={3} fill={p.accent}>{data.brand.toUpperCase()}</text>
          </g>
        )}
        {data.highlight && (
          <g>
            <path d={star(bcx, bcy, badgeR + 16, badgeR + 2, 24)} fill={p.accent2} />
            <circle cx={bcx} cy={bcy} r={badgeR - 12} fill="none" stroke={p.on2} strokeOpacity={0.35} strokeWidth={3} strokeDasharray="6 8" />
            <g textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fill={p.on2}>
              {hl.lines.map((ln, i) => <text key={i} x={bcx} y={bcy + hl.size * 0.36 + (i - (hl.lines.length - 1) / 2) * hl.size * 1.02} fontSize={fitSize(ln, badgeR * 1.5, hl.size, D)}>{ln}</text>)}
            </g>
          </g>
        )}
        {eb.el}{tt.el}
        {data.subtitle && <g><Ico k="cal" x={m} y={subY + 2} s={38} color={p.accent} /><text x={m + 54} y={subY + 33} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fitSize(data.subtitle, W - m * 2 - 54, 34, B6)} fill={p.sub}>{data.subtitle}</text></g>}
        <Bullets x={m} y={y + 6} w={W - m * 2} maxH={LIMIT - y - 6} size={34} gap={60} marker="check" ink={p.ink} mk={p.accent} mkInk={p.onAccent} />
        <Footer bg={p.accent} fg={p.onAccent} fg2={p.onAccent} ic={p.accent2} qrFg={p.deep} round />
      </>
    );
  } else if (spec.layout === 'sale') {
    // ===== KHUYẾN MÃI: nền màu rực, tiêu đề khổng lồ, nổ sao điểm nhấn + ảnh tròn =====
    const ebTxt = (data.eyebrow || '').toUpperCase();
    const ebS = fitSize(ebTxt, W * 0.36, 28, { ...B8, ls: 3 });
    const ebW = ebTxt ? textW(ebTxt, ebS, { ...B8, ls: 3 }) + 52 : 0;
    const brandH = block({ text: data.brand, x: m, y: m, maxW: W - m * 2 - ebW - 30, size: 34, maxLines: 2, lh: 1.15, ts: { ...B8, ls: 2 }, fill: p.onAccent, upper: true });
    let y = Math.max(m + 96, m + brandH.h + 26);
    const tt = block({ text: data.title, x: m, y, maxW: W - m * 2, size: 124, maxLines: 2, lh: 1.0, ts: D, fill: p.onAccent, upper: true }); y += tt.h + 12;
    const R = 212, scx = m + R + 6, scy = y + R + 10;
    const hl = fitBlock(data.highlight || '', R * 1.45, 92, D, 3);
    const pr = 186, pcx = W - m - pr, pcy = scy - 20;
    y = scy + R + 30;
    const st = block({ text: data.subtitle, x: m, y, maxW: W - m * 2, size: 40, maxLines: 1, ts: B8, fill: p.accent2 }); y += st.h + 16;
    body = (
      <>
        {bg(p.accent)}
        {Array.from({ length: 14 }).map((_, i) => <path key={i} d={`M${-b + i * 120 - 400} ${H + b}L${-b + i * 120 + 300} ${-b}`} stroke={p.deep} strokeWidth={34} opacity={0.22} />)}
        {brandH.el}
        {ebTxt && <g><path d={rr(W - m - ebW, m - 4, ebW, 58, 29)} fill={p.accent2} /><text x={W - m - ebW / 2} y={m + 35} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ebS} letterSpacing={3} fill={p.on2}>{ebTxt}</text></g>}
        {tt.el}
        <circle cx={pcx} cy={pcy} r={pr + 14} fill={p.onAccent} />
        {photoSlot(circ(pcx, pcy, pr), { x: pcx - pr, y: pcy - pr, w: pr * 2, h: pr * 2 }, { c1: p.accent2, c2: p.paper, ink: p.accent, icon: 'sale' })}
        {data.highlight && (
          <g>
            <path d={star(scx, scy, R + 22, R - 6, 26)} fill={p.accent2} />
            <circle cx={scx} cy={scy} r={R - 26} fill="none" stroke={p.on2} strokeOpacity={0.3} strokeWidth={4} />
            <g textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fill={p.on2}>
              {hl.lines.map((ln, i) => <text key={i} x={scx} y={scy + hl.size * 0.36 + (i - (hl.lines.length - 1) / 2) * hl.size * 1.0} fontSize={fitSize(ln, R * 1.45, hl.size, D)}>{ln.toUpperCase()}</text>)}
            </g>
          </g>
        )}
        {st.el}
        <Bullets x={m} y={y} w={W - m * 2} maxH={LIMIT - y} size={36} gap={62} marker="check" ink={p.onAccent} mk={p.accent2} mkInk={p.on2} />
        <Footer bg={p.paper} fg={p.ink} fg2={p.sub} ic={p.accent} qrFg={p.ink} />
      </>
    );
  } else if (spec.layout === 'service') {
    // ===== DỊCH VỤ: sang, căn giữa, ảnh vòm + viền lệch, giá nổi =====
    const dark = p.id === 'dark';
    const aw = 540, ah = 540, ax = cx - aw / 2, ay = m + 90;
    const arch = (x: number, y: number) => `M${x} ${y + ah}V${y + aw / 2}A${aw / 2} ${aw / 2} 0 0 1 ${x + aw} ${y + aw / 2}V${y + ah}Z`;
    const brand = block({ text: data.brand, x: cx, y: m - 4, maxW: W - m * 2, size: 40, maxLines: 1, anchor: 'middle', ts: { ...D, ls: 3 }, fill: p.accent, upper: true });
    const hlTxt = data.highlight || '';
    const hlS = fitSize(hlTxt, 380, 40, B8), hlW = textW(hlTxt, hlS, B8) + 64;
    let y = ay + ah + 54;
    const eb = block({ text: data.eyebrow, x: cx, y, maxW: W - m * 2, size: 28, maxLines: 1, anchor: 'middle', ts: { ...B8, ls: 4 }, fill: p.accent, upper: true }); y += eb.h + 12;
    const tt = block({ text: data.title, x: cx, y, maxW: W - m * 2, size: 74, maxLines: 2, lh: 1.1, anchor: 'middle', ts: D, fill: p.ink }); y += tt.h + 10;
    const st = block({ text: data.subtitle, x: cx, y, maxW: W - m * 2, size: 32, maxLines: 1, anchor: 'middle', ts: B6, fill: p.sub }); y += st.h + 26;
    body = (
      <>
        {bg(p.paper)}
        <rect x={m * 0.45} y={m * 0.45} width={W - m * 0.9} height={H - m * 0.9 - FOOT} fill="none" stroke={p.accent2} strokeWidth={3} />
        {brand.el}
        <path d={arch(ax + 26, ay + 26)} fill="none" stroke={p.accent2} strokeWidth={4} />
        {photoSlot(arch(ax, ay), { x: ax, y: ay, w: aw, h: ah }, { c1: dark ? '#2A2D34' : p.accent2, c2: p.accent, ink: dark ? p.accent2 : p.onAccent, icon: 'service' })}
        {hlTxt && <g><path d={rr(ax + aw - hlW + 60, ay + ah - 50, hlW, 84, 42)} fill={p.accent} /><text x={ax + aw + 60 - hlW / 2} y={ay + ah + 6} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={hlS} fill={p.onAccent}>{hlTxt}</text></g>}
        {eb.el}{tt.el}{st.el}
        <Bullets x={m + 20} y={y} w={W - m * 2 - 40} maxH={LIMIT - y} size={30} gap={54} marker="diamond" ink={p.ink} mk={p.accent} mkInk={p.onAccent} cols={2} />
        <Footer bg={dark ? p.deep : p.accent} fg={p.onAccent === '#16181D' ? p.ink : p.onAccent} fg2={dark ? p.sub : p.onAccent} ic={p.accent2} qrFg={dark ? '#16181D' : p.deep} />
      </>
    );
  } else if (spec.layout === 'menu') {
    // ===== MENU QUÁN: đầu trang màu, ảnh tròn, bảng giá chấm dẫn, ruy băng ưu đãi =====
    const band = H * 0.24;
    const pr = 150, pcx = W - m - pr + 6, pcy = band + 10;
    const brand = block({ text: data.brand, x: m, y: m - 10, maxW: W - m * 2 - pr * 2 - 20, size: 76, maxLines: 2, lh: 1.0, ts: D, fill: p.onAccent, upper: true });
    const eb = block({ text: data.eyebrow, x: m, y: m - 10 + brand.h + 6, maxW: W - m * 2 - pr * 2 - 20, size: 26, maxLines: 1, ts: { ...B8, ls: 3 }, fill: p.accent2, upper: true });
    let y = band + 40;
    const tt = block({ text: data.title, x: m, y, maxW: W - m * 2 - pr * 2 - 10, size: 66, maxLines: 2, ts: D, fill: p.accent }); y += tt.h + 4;
    const st = block({ text: data.subtitle, x: m, y, maxW: W - m * 2 - pr * 2 - 10, size: 28, maxLines: 2, lh: 1.2, ts: B6, fill: p.sub }); y += st.h;
    y = Math.max(y + 34, pcy + pr + 40);
    const hl = data.highlight || '';
    const ribH = hl ? 84 : 0;
    const listMax = LIMIT - y - (ribH ? ribH + 30 : 0);
    const nList = Math.max(0, Math.min(prices.length, Math.floor(listMax / 66)));
    const listH = nList ? Math.min(prices.length * 76, listMax) : 0;
    const ribY = y + listH + 16;
    const hlS = fitSize(hl, W - m * 2 - 120, 40, B8);
    body = (
      <>
        {bg(p.paper)}
        <path d={`M${-b} ${-b}H${W + b}V${band}C${W * 0.6} ${band + 34} ${W * 0.3} ${band - 30} ${-b} ${band + 14}Z`} fill={p.accent} />
        {brand.el}{eb.el}
        <circle cx={pcx} cy={pcy} r={pr + 12} fill={p.paper} />
        {photoSlot(circ(pcx, pcy, pr), { x: pcx - pr, y: pcy - pr, w: pr * 2, h: pr * 2 }, { c1: p.accent2, c2: p.accent, ink: p.onAccent, icon: 'menu' })}
        {tt.el}{st.el}
        {nList > 0
          ? <Prices x={m} y={y} w={W - m * 2} maxH={listH} size={38} gap={76} ink={p.ink} sub={p.sub} pc={p.accent} />
          : <Bullets x={m} y={y} w={W - m * 2} maxH={LIMIT - y - ribH} size={36} gap={64} marker="dot" ink={p.ink} mk={p.accent} mkInk={p.onAccent} />}
        {hl && ribY + ribH <= LIMIT + 10 && (
          <g>
            <path d={`M${m} ${ribY}H${W - m}l-30 ${ribH / 2}l30 ${ribH / 2}H${m}l30 ${-ribH / 2}z`} fill={p.accent2} />
            <text x={cx} y={ribY + ribH / 2 + hlS * 0.36} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={hlS} fill={p.on2}>{hl}</text>
          </g>
        )}
        <Footer bg={p.deep} fg={p.onAccent} fg2={p.onAccent} ic={p.accent2} qrFg={p.deep} />
      </>
    );
  } else if (spec.layout === 'hiring') {
    // ===== TUYỂN DỤNG: chữ khổng lồ bên trái, mảng chéo có ảnh bên phải, lương nổi bật =====
    const py = H * 0.5;
    const poly = `M${W * 0.56} ${-b}H${W + b}V${py}H${W * 0.44}Z`;
    let y = m + 10;
    const colW = W * 0.44 - m - 10;
    const eb = block({ text: data.eyebrow, x: m, y, maxW: colW + 60, size: 28, maxLines: 2, lh: 1.25, ts: { ...B8, ls: 3 }, fill: p.accent, upper: true }); y += eb.h + 12;
    const tt = block({ text: data.title, x: m, y, maxW: colW, size: 132, maxLines: 3, lh: 0.98, ts: D, fill: p.ink, upper: true }); y += tt.h + 22;
    const posTxt = data.subtitle || '';
    const edgeX = (yy: number) => W * 0.56 - W * 0.12 * Math.min(1, yy / py); // mép trái mảng chéo tại độ cao yy
    const posY = y;
    const posMax = Math.max(colW, edgeX(posY + 110) - m - 46);
    const pos = fitBlock(posTxt, posMax - 44, 32, B8, 2);
    const posW = Math.max(...pos.lines.map((l) => textW(l, pos.size, B8)), 0) + 44;
    const posH = pos.lines.length * pos.size * 1.25 + 26;
    if (posTxt) y += posH + 18;
    y = Math.max(y + 8, py + 72);
    const lab = block({ text: 'THU NHẬP', x: m, y, maxW: 400, size: 26, maxLines: 1, ts: { ...B8, ls: 4 }, fill: p.sub });
    const hlb = data.highlight ? block({ text: data.highlight, x: m, y: y + lab.h + 2, maxW: W - m * 2, size: 92, maxLines: 1, ts: D, fill: p.accent }) : { el: null, h: 0 };
    if (data.highlight) y += lab.h + hlb.h + 22;
    body = (
      <>
        {bg(p.paper)}
        <path d={`M${W * 0.56 - 28} ${-b}L${W * 0.44 - 28} ${py + 24}`} stroke={p.accent2} strokeWidth={16} />
        {photoSlot(poly, { x: W * 0.44, y: -b, w: W * 0.56 + b, h: py + b }, { c1: p.accent, c2: p.deep, ink: p.onAccent, icon: 'hiring' })}
        {eb.el}{tt.el}
        {posTxt && <g><path d={rr(m, posY, posW, posH, 12)} fill={p.ink} /><g textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fill={p.paper}>{pos.lines.map((ln, i) => <text key={i} x={m + posW / 2} y={posY + 13 + pos.size * (0.95 + i * 1.25)} fontSize={fitSize(ln, posMax - 44, pos.size, B8)}>{ln}</text>)}</g></g>}
        {data.highlight && <>{lab.el}{hlb.el}</>}
        <Bullets x={m} y={y} w={W - m * 2} maxH={LIMIT - y} size={33} gap={58} marker="check" ink={p.ink} mk={p.accent} mkInk={p.onAccent} />
        <Footer bg={p.ink === '#F4F2EC' ? p.deep : p.ink} fg={p.paper} fg2={p.paper} ic={p.accent} qrFg={p.ink} />
      </>
    );
  } else {
    // ===== LỚP HỌC: vòng tròn lớn góc phải chứa ảnh, ngày khai giảng, lộ trình đánh số =====
    const R = W * 0.4, ccx = W * 0.86, ccy = H * 0.15;
    const pr = R * 0.74;
    const colW = ccx - R - m - 24;
    let y = m + 20;
    const eb = block({ text: data.eyebrow, x: m, y, maxW: colW, size: 32, maxLines: 1, ts: { ...B8, ls: 5 }, fill: p.accent, upper: true }); y += eb.h + 6;
    const hlb = block({ text: data.highlight, x: m, y, maxW: colW, size: 84, maxLines: 2, lh: 1.0, ts: D, fill: p.ink }); y += hlb.h;
    y = Math.max(y + 30, ccy + R + 40);
    const tt = block({ text: data.title, x: m, y, maxW: W - m * 2, size: 80, maxLines: 3, lh: 1.06, ts: D, fill: p.ink }); y += tt.h + 12;
    const stY = y; if (data.subtitle) y += 64;
    body = (
      <>
        {bg(p.paper)}
        <circle cx={ccx} cy={ccy} r={R} fill={p.accent} />
        <circle cx={ccx - R * 0.98} cy={ccy + R * 0.7} r={46} fill={p.accent2} />
        {Array.from({ length: 20 }).map((_, i) => <circle key={i} cx={m + (i % 5) * 26} cy={ccy + R + 6 - Math.floor(i / 5) * 26} r={5} fill={p.accent} opacity={0.35} />)}
        {photoSlot(circ(ccx - R * 0.08, ccy + R * 0.1, pr), { x: ccx - R * 0.08 - pr, y: ccy + R * 0.1 - pr, w: pr * 2, h: pr * 2 }, { c1: p.deep, c2: p.accent, ink: p.onAccent, icon: 'course' })}
        <circle cx={ccx - R * 0.08} cy={ccy + R * 0.1} r={pr} fill="none" stroke={p.paper} strokeWidth={12} />
        {eb.el}{hlb.el}{tt.el}
        {data.subtitle && <g><Ico k="clock" x={m} y={stY} s={38} color={p.accent} /><text x={m + 54} y={stY + 31} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fitSize(data.subtitle, W - m * 2 - 54, 32, B6)} fill={p.sub}>{data.subtitle}</text></g>}
        <Bullets x={m} y={y + 4} w={W - m * 2} maxH={LIMIT - y - 4} size={32} gap={64} marker="num" ink={p.ink} mk={p.accent} mkInk={p.onAccent} />
        <Footer bg={p.accent} fg={p.onAccent} fg2={p.onAccent} ic={p.accent2} qrFg={p.deep} round />
      </>
    );
  }

  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-trim={`${W} ${H}`}>
      <defs>{defs}</defs>
      {body}
    </svg>
  );
}
