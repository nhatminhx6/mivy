'use client';
// Bộ bàn ăn F&B: 1 thương hiệu quán → 3 món in: GIẤY LÓT KHAY · BAO ĐŨA · KHĂN GIẤY.
// Mẫu = PHONG CÁCH QUÁN (phở, cơm tấm, lẩu nướng, cà phê, Á đông, fast food) × BẢNG MÀU × FONT → render code 100%,
// hoạ tiết (mây, sóng, triện, hạt cà phê…) + icon món ăn vẽ code. Đơn vị SVG = mm (khổ thật), chữ đo thật bằng canvas.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

// ---------- khổ ----------
export interface TWLinerSize { id: string; name: string; wMm: number; hMm: number }
export const TW_LINER_SIZES: TWLinerSize[] = [
  { id: 'a3', name: 'A3 ngang · 42×29,7cm', wMm: 420, hMm: 297 },
  { id: 'k35', name: '35×27cm (khay fast food)', wMm: 350, hMm: 270 },
  { id: 'k30', name: '30×42cm dọc', wMm: 300, hMm: 420 },
];
export const twLinerSize = (id: string) => TW_LINER_SIZES.find((s) => s.id === id) || TW_LINER_SIZES[0];
export const TW_BLEED_MM = 3;
// bao đũa thành phẩm 25×4cm (miệng mở 1 đầu); trải phẳng: dán 8 | mặt sau 40 | mặt trước 40, gập đáy 18mm
export const SLEEVE = { L: 250, W: 40, glue: 8, tuck: 18, notch: 7 };
export const SLEEVE_FLAT = { w: SLEEVE.L + SLEEVE.tuck, h: SLEEVE.glue + SLEEVE.W * 2 };
// khăn giấy 33×33cm gấp 4 → mặt lộ ra 16,5×16,5cm, vùng in tối đa 10×10cm giữa mặt gấp
export const NAPKIN = { full: 330, face: 165, zone: 100 };

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface TWFont { id: string; name: string; family: string; weight: number }
export const TW_FONTS: TWFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
];
export const twFont = (id: string) => TW_FONTS.find((f) => f.id === id) || TW_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Dancing Script';

export const TW_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Prata&family=Baloo+2:wght@800&family=Oswald:wght@700&family=Montserrat:wght@800&family=Lobster&family=Dancing+Script:wght@700&display=swap');`;

export function useTWFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-tw-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-tw-fonts'; link.rel = 'stylesheet';
        link.href = TW_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TW_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `700 40px "${SCRIPT}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface TWPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string }
export const TW_PALETTES: TWPalette[] = [
  { id: 'pho-red', name: 'Đỏ son', paper: '#FBF5EA', ink: '#2B1A12', sub: '#6B5444', accent: '#A8231C', accent2: '#D99A28', onAccent: '#FFF7E8' },
  { id: 'pho-green', name: 'Xanh lá hẹ', paper: '#F5F6EC', ink: '#1E2A1C', sub: '#56614F', accent: '#2F5D3A', accent2: '#C9922E', onAccent: '#F8F4E4' },
  { id: 'tam-orange', name: 'Cam nắng', paper: '#FFF6EA', ink: '#2E1C0E', sub: '#73563D', accent: '#D45A23', accent2: '#2E6B4A', onAccent: '#FFF8EE' },
  { id: 'tam-kraft', name: 'Giấy kraft', paper: '#EAD8B8', ink: '#3A2614', sub: '#6E5232', accent: '#7A4A22', accent2: '#B8371F', onAccent: '#FBF1DE' },
  { id: 'lau-dark', name: 'Than hồng', paper: '#1E1B1A', ink: '#F5EBDD', sub: '#BCAE9B', accent: '#C9301D', accent2: '#F0AE38', onAccent: '#FFF3E6' },
  { id: 'lau-chili', name: 'Ớt đỏ', paper: '#FFF4EE', ink: '#2A120D', sub: '#74463A', accent: '#C3241A', accent2: '#EE9A1C', onAccent: '#FFF6EE' },
  { id: 'cafe-brown', name: 'Nâu cà phê', paper: '#F3EBDD', ink: '#2C1E16', sub: '#6E5949', accent: '#4E3222', accent2: '#C2924F', onAccent: '#F7EEDF' },
  { id: 'cafe-mint', name: 'Xanh bạc hà', paper: '#F0F5F1', ink: '#17302A', sub: '#4E6A61', accent: '#2C6A59', accent2: '#DF9C55', onAccent: '#F3FAF6' },
  { id: 'asia-navy', name: 'Chàm Nhật Bản', paper: '#F6F3EC', ink: '#141B2D', sub: '#545C6E', accent: '#1D2D50', accent2: '#BF3A2B', onAccent: '#F6F1E6' },
  { id: 'asia-red', name: 'Đỏ tửu lầu', paper: '#FFF5E3', ink: '#2A0F0C', sub: '#6F443A', accent: '#9E1219', accent2: '#E2AE34', onAccent: '#FFF3D9' },
  { id: 'ff-red', name: 'Đỏ cà chua', paper: '#FFF8EC', ink: '#231815', sub: '#6B5A50', accent: '#DE2F1E', accent2: '#FFC21A', onAccent: '#FFFFFF' },
  { id: 'ff-yellow', name: 'Vàng mù tạt', paper: '#FFFAE6', ink: '#1F1A14', sub: '#5F5444', accent: '#F5A90F', accent2: '#D62E1F', onAccent: '#1F1A14' },
];
export const twPalette = (id: string) => TW_PALETTES.find((p) => p.id === id) || TW_PALETTES[0];

// ---------- phong cách quán ----------
export type TWPattern = 'cloud' | 'diamond' | 'flame' | 'beans' | 'seigaiha' | 'meander' | 'checker';
export type TWIcon = 'bowl' | 'plate' | 'hotpot' | 'cup' | 'lantern' | 'burger';
export interface TWStyle { id: string; name: string; pattern: TWPattern; icon: TWIcon; palettes: [string, string]; fonts: [string, string] }
export const TW_STYLES: TWStyle[] = [
  { id: 'pho', name: 'Phở · bún', pattern: 'cloud', icon: 'bowl', palettes: ['pho-red', 'pho-green'], fonts: ['prata', 'playfair'] },
  { id: 'comtam', name: 'Cơm tấm · cơm nhà', pattern: 'diamond', icon: 'plate', palettes: ['tam-orange', 'tam-kraft'], fonts: ['baloo', 'playfair'] },
  { id: 'lau', name: 'Lẩu · nướng', pattern: 'flame', icon: 'hotpot', palettes: ['lau-dark', 'lau-chili'], fonts: ['oswald', 'montserrat'] },
  { id: 'cafe', name: 'Cà phê · trà', pattern: 'beans', icon: 'cup', palettes: ['cafe-brown', 'cafe-mint'], fonts: ['playfair', 'lobster'] },
  { id: 'asia', name: 'Nhà hàng Á (Hoa · Hàn · Nhật)', pattern: 'seigaiha', icon: 'lantern', palettes: ['asia-navy', 'asia-red'], fonts: ['prata', 'oswald'] },
  { id: 'fastfood', name: 'Fast food', pattern: 'checker', icon: 'burger', palettes: ['ff-red', 'ff-yellow'], fonts: ['lobster', 'baloo'] },
];
export const twStyle = (id: string) => TW_STYLES.find((s) => s.id === id) || TW_STYLES[0];

export type TWLayout = 'band' | 'frame';
export interface TWSpec { style: string; palette: string; font: string; layout: TWLayout; liner: string; napkinInks: 1 | 2 }
export interface TWTemplate { id: string; name: string; spec: Pick<TWSpec, 'style' | 'palette' | 'font' | 'layout'> }
export const TW_TEMPLATES: TWTemplate[] = TW_STYLES.flatMap((s) => s.palettes.map((pal, i) => ({
  id: `${s.id}-${pal}`,
  name: `${s.name.split(' (')[0]} · ${twPalette(pal).name}`,
  // mẫu Á đỏ dùng hoạ tiết triện (Hoa), mẫu Á chàm giữ sóng seigaiha (Nhật)
  spec: { style: s.id, palette: pal, font: s.fonts[i], layout: (i === 0 ? 'band' : 'frame') as TWLayout },
})));
export const patternOf = (spec: Pick<TWSpec, 'style' | 'palette'>): TWPattern => (spec.palette === 'asia-red' ? 'meander' : twStyle(spec.style).pattern);

// ---------- nội dung ----------
export type TWData = Record<string, string>;
export interface TWField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean }
export const TW_FIELDS: TWField[] = [
  { key: 'brand', label: 'Tên quán', half: true },
  { key: 'slogan', label: 'Slogan', half: true },
  { key: 'tagline', label: 'Lời chúc (bao đũa)', half: true },
  { key: 'hotline', label: 'Hotline / đặt bàn', half: true },
  { key: 'storyTitle', label: 'Tiêu đề câu chuyện', half: true },
  { key: 'menuTitle', label: 'Tiêu đề thực đơn', half: true },
  { key: 'story', label: 'Câu chuyện quán', multiline: true },
  { key: 'menu', label: 'Món nổi bật (mỗi dòng: Tên món | Giá)', multiline: true },
  { key: 'qr', label: 'Link gọi món / menu (tạo mã QR)', half: true },
  { key: 'qrLabel', label: 'Chữ dưới mã QR', half: true },
  { key: 'wifi', label: 'Tên wifi', half: true },
  { key: 'wifiPass', label: 'Mật khẩu wifi', half: true },
  { key: 'social', label: 'Fanpage / Zalo / TikTok', half: true },
  { key: 'hours', label: 'Giờ mở cửa', half: true },
  { key: 'address', label: 'Địa chỉ' },
];
const BASE = { qrLabel: 'Quét để xem menu & gọi món', hours: '6:00 – 22:00 mỗi ngày' };
export const TW_SAMPLES: Record<string, TWData> = {
  pho: {
    ...BASE, brand: 'Phở Gia Khánh', slogan: 'Nước dùng ninh 12 giờ', tagline: 'Chúc quý khách ngon miệng', hotline: '0909 123 456',
    storyTitle: 'Câu chuyện nồi phở', menuTitle: 'Món ngon nên thử',
    story: 'Ba thế hệ giữ nguyên công thức của bà: xương ống ninh suốt đêm, quế hồi rang thơm, bánh phở tráng mỗi sáng. Mỗi tô phở là một buổi sáng ấm áp của người Sài Gòn.',
    menu: 'Phở tái nạm gầu | 65.000\nPhở đặc biệt | 85.000\nPhở gà ta xé | 60.000\nBún bò Huế | 65.000\nQuẩy giòn | 5.000\nTrà đá | 3.000',
    qr: 'phogiakhanh.vn/menu', wifi: 'Pho Gia Khanh', wifiPass: 'phongon123', social: 'fb.com/phogiakhanh · Zalo 0909 123 456',
    address: '128 Nguyễn Trãi, Phường Bến Thành, TP.HCM',
  },
  comtam: {
    ...BASE, brand: 'Cơm Tấm Thu Hà', slogan: 'Sườn nướng than hoa', tagline: 'Ăn ngon nhớ ghé lại nha!', hotline: '0938 456 789',
    storyTitle: 'Cơm nhà, vị Sài Gòn', menuTitle: 'Thực đơn',
    story: 'Sườn ướp mật ong, nướng trên than hoa đỏ lửa; nước mắm pha chua ngọt chuẩn vị; mỡ hành thơm lừng. Ăn một lần là nhớ cả tuần.',
    menu: 'Cơm sườn bì chả | 55.000\nCơm sườn ốp la | 50.000\nCơm gà nướng | 50.000\nCơm tấm đặc biệt | 75.000\nCanh khổ qua | 15.000\nTrà tắc | 10.000',
    qr: 'comtamthuha.vn', wifi: 'ComTam ThuHa', wifiPass: 'suonnuong88', social: 'TikTok @comtamthuha · Zalo 0938 456 789',
    address: '45 Lê Văn Sỹ, Phường Nhiêu Lộc, TP.HCM', hours: '10:00 – 21:30',
  },
  lau: {
    ...BASE, brand: 'Lẩu Nướng Quốc Bảo', slogan: 'Nóng hổi · đậm đà · no say', tagline: 'Cạn ly nào anh em ơi!', hotline: '0912 345 678',
    storyTitle: 'Lửa đỏ, bàn vui', menuTitle: 'Món đinh của quán',
    story: 'Nước lẩu Thái chua cay hầm từ xương gà và sả tươi, thịt bò Mỹ thái lát mỏng nướng than, rau sạch Đà Lạt mỗi ngày. Bàn nào cũng rộn tiếng cười.',
    menu: 'Lẩu Thái hải sản | 299.000\nLẩu nấm gà ta | 259.000\nBa chỉ bò Mỹ nướng | 129.000\nSườn non nướng mật ong | 119.000\nRau nấm thập cẩm | 49.000\nBia tươi (ly) | 25.000',
    qr: 'launuongquocbao.vn/datban', qrLabel: 'Quét để đặt bàn & gọi thêm món', wifi: 'LauNuong QuocBao', wifiPass: 'nongnongnong', social: 'fb.com/launuongquocbao',
    address: '22 Phan Xích Long, Phường Cầu Kiệu, TP.HCM', hours: '16:00 – 23:30',
  },
  cafe: {
    ...BASE, brand: 'An Khang Coffee', slogan: 'Rang mộc · pha chậm', tagline: 'Một ngày thật chill nhé!', hotline: '0907 888 222',
    storyTitle: 'Từ nông trại đến ly', menuTitle: 'Signature',
    story: 'Hạt Robusta Cầu Đất và Arabica Sơn La rang mộc mỗi tuần ngay tại quán. Mỗi ly được pha phin chậm rãi để giữ trọn hương vị.',
    menu: 'Cà phê sữa đá | 29.000\nBạc xỉu | 32.000\nCold brew cam sả | 45.000\nTrà đào cam sả | 42.000\nCroissant bơ | 35.000\nBánh flan | 20.000',
    qr: 'ankhangcoffee.vn/order', qrLabel: 'Quét gọi món tại bàn', wifi: 'AnKhang Coffee', wifiPass: 'caphengon', social: 'IG @ankhang.coffee · fb.com/ankhangcoffee',
    address: '9 Tôn Thất Thiệp, Phường Sài Gòn, TP.HCM', hours: '7:00 – 22:30',
  },
  asia: {
    ...BASE, brand: 'Sakura Ramen', slogan: 'Mì ramen chuẩn vị Tokyo', tagline: 'Itadakimasu! Ngon miệng nhé', hotline: '0966 555 777',
    storyTitle: 'Bát mì của sự tận tâm', menuTitle: 'Thực đơn chính',
    story: 'Nước súp tonkotsu hầm 18 giờ, sợi mì kéo tay mỗi sáng, trứng lòng đào ngâm tương 2 ngày. Chúng tôi nấu từng bát như mời người thân.',
    menu: 'Tonkotsu ramen | 129.000\nShoyu ramen gà | 115.000\nRamen cay Tantan | 135.000\nGyoza áp chảo (6 cái) | 69.000\nCơm cà ri Nhật | 99.000\nTrà xanh lạnh | 25.000',
    qr: 'sakuraramen.vn/menu', wifi: 'Sakura Ramen', wifiPass: 'ramen2027', social: 'fb.com/sakuraramen.vn',
    address: '17 Lê Thánh Tôn, Phường Sài Gòn, TP.HCM', hours: '10:30 – 22:00',
  },
  fastfood: {
    ...BASE, brand: 'Burger Bảo Ngọc', slogan: 'Giòn rụm · nóng hổi · siêu nhanh', tagline: 'Ăn no, cười tươi!', hotline: '1900 6868',
    storyTitle: 'Nhanh mà vẫn tươi', menuTitle: 'Combo hot',
    story: 'Bò Úc xay tươi mỗi ngày, bánh mì nướng bơ giòn, khoai tây chiên ngay khi gọi món. Giao tận nơi trong 30 phút.',
    menu: 'Burger bò phô mai | 59.000\nBurger gà giòn | 49.000\nCombo 2 người | 149.000\nGà rán (3 miếng) | 79.000\nKhoai tây chiên | 25.000\nPepsi tươi | 15.000',
    qr: 'burgerbaongoc.vn', qrLabel: 'Quét đặt giao tận nơi', wifi: 'BurgerBaoNgoc_Free', wifiPass: 'burger123', social: 'TikTok @burgerbaongoc · ShopeeFood',
    address: '301 Cách Mạng Tháng Tám, Phường Hoà Hưng, TP.HCM', hours: '9:00 – 23:00',
  },
};
export const defaultTWData = (style = 'pho'): TWData => ({ ...(TW_SAMPLES[style] || TW_SAMPLES.pho) });

// ---------- đo chữ thật (đơn vị mm: đo ở 100px rồi quy đổi) ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  return (mctx.measureText(s).width * size) / 100 + ls;
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
/** co chữ tới khi ≤ maxLines dòng; vẫn dư thì gộp phần còn lại vào dòng cuối (dòng đó tự co theo bề rộng) */
function fitLines(text: string, maxW: number, size: number, ts: TS, maxLines: number, minK = 0.45) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * minK) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  return { lines, size: s };
}
/** đoạn văn vừa khung W×H: co cỡ chữ tới khi tổng cao ≤ H */
function fitPara(text: string, maxW: number, maxH: number, size: number, ts: TS, lh: number, minSize: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length * s * lh > maxH && s > minSize) { s *= 0.95; lines = wrapLines(text, maxW, s, ts); }
  const maxN = Math.max(1, Math.floor(maxH / (s * lh)));
  if (lines.length > maxN) { lines = lines.slice(0, maxN); lines[maxN - 1] = lines[maxN - 1].replace(/[\s,.;:]*$/, '…'); }
  return { lines, size: s };
}
type Anchor = 'start' | 'middle' | 'end';
/** chữ 1 dòng có baseline y, tự co theo maxW */
function Line({ t, x, y, size, maxW, ts, fill, anchor = 'start', opacity, upper }: { t: string; x: number; y: number; size: number; maxW: number; ts: TS; fill: string; anchor?: Anchor; opacity?: number; upper?: boolean }) {
  // gộp khoảng trắng: SVG tự gộp → số ký tự lệch làm outline bỏ qua dòng này
  const s = (upper ? (t || '').toUpperCase() : t || '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  return <text x={x} y={y} fontSize={fitSize(s, maxW, size, ts)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fill={fill} textAnchor={anchor} letterSpacing={ts.ls || undefined} opacity={opacity}>{s}</text>;
}
const splitLines = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const priceRows = (s: string) => splitLines(s).map((ln) => { const [n, ...rest] = ln.split('|'); return { name: (n || '').replace(/\s+/g, ' ').trim(), price: rest.join('|').replace(/\s+/g, ' ').trim() }; });
const qrUrl = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${(w || 'mivy.vn').trim()}`);
const rr = (x: number, y: number, w: number, h: number, r: number) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const initials = (b: string) => (b || 'M').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const useUid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

// ---------- icon nét (24×24) ----------
const ICON: Record<TWIcon | 'pin' | 'phone' | 'clock' | 'wifi' | 'chat', string> = {
  bowl: 'M2.5 11h19a9.5 7.5 0 0 1-19 0zM9 18.2v1.8h6v-1.8M14.5 3.5l6 6.2M11.5 3.8l7 6.2M6.5 8.5c0-1.6 1.2-1.6 1.2-3.2M9.8 8.5c0-1.6 1.2-1.6 1.2-3.2',
  plate: 'M2 14.5h20a10 5.2 0 0 1-20 0zM5.5 14c.8-4.8 12.2-4.8 13 0M13.6 9.6a2.6 1.6 0 1 0 .01 0M8 11.2l3.8-1.6',
  hotpot: 'M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM1.8 11.5H4M20 11.5h2.2M3 10h18M8 7c0-1.5 1.2-1.5 1.2-3M12 7c0-1.5 1.2-1.5 1.2-3M16 7c0-1.5 1.2-1.5 1.2-3M7 20l-1 2M17 20l1 2',
  cup: 'M4.5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5zM16.5 10.2h1.4a2.4 2.4 0 0 1 0 4.8h-1.6M8 6.5c0-1.2 1-1.2 1-2.6M12 6.5c0-1.2 1-1.2 1-2.6M3 21.5h15',
  lantern: 'M12 1.5v2.2M8.5 3.7h7M6.8 6h10.4a5.2 6.6 0 0 1 0 12H6.8a5.2 6.6 0 0 1 0-12zM12 6v12M8.4 6.5c-1.6 3.3-1.6 7.7 0 11M15.6 6.5c1.6 3.3 1.6 7.7 0 11M8.5 18h7M12 18v3M10.6 21h2.8',
  burger: 'M4 10.5a8 6.2 0 0 1 16 0zM2.8 13.4h18.4M3.5 16.2l2.6-1.2 2.6 1.2 2.6-1.2 2.6 1.2 2.6-1.2 2.6 1.2M4.5 17.5v.5a3 3 0 0 0 3 3h9a3 3 0 0 0 3-3v-.5M9 7.4h.01M12.5 6.6h.01M15 8h.01',
  pin: 'M12 22s7-6.7 7-12A7 7 0 005 10c0 5.3 7 12 7 12zM12 7.5A2.5 2.5 0 1012 12.5 2.5 2.5 0 0012 7.5z',
  phone: 'M6.5 3h3l1.5 4.5-2 1.3a12 12 0 005.7 5.7L16 16.5l4.5 1.5v3a1.5 1.5 0 01-1.6 1.5C10 22 2 14 2 5.1A1.5 1.5 0 013.5 3.5z',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  wifi: 'M2 8.8a15 15 0 0 1 20 0M5.2 12.2a10.5 10.5 0 0 1 13.6 0M8.4 15.6a6 6 0 0 1 7.2 0M12 19.2h.01',
  chat: 'M4 5h16v11H9l-5 4zM8 9.5h8M8 12.5h5',
};
function Ico({ k, x, y, s, color, w = 1.8, opacity }: { k: keyof typeof ICON; x: number; y: number; s: number; color: string; w?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 24})`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={opacity}>
      <path d={ICON[k]} />
    </g>
  );
}

// ---------- hoạ tiết (pattern lặp, kích thước p mm) ----------
function PatternDef({ id, kind, p, color }: { id: string; kind: TWPattern; p: number; color: string }) {
  const sw = p * 0.045;
  let body: ReactNode;
  switch (kind) {
    case 'cloud': { // mây tường vân
      const c = (x: number, y: number, k: number) => (
        <path key={`${x}-${y}`} transform={`translate(${x} ${y}) scale(${k})`} fill="none" stroke={color} strokeWidth={sw / k} strokeLinecap="round"
          d="M-10 3 C-14 3 -14 -3 -10 -3 C-10 -8 -2 -9 0 -4 C2 -9 10 -8 10 -3 C14 -3 14 3 10 3 Z M-4 3 C-4 -1 2 -1 2 2 C2 4 -1 4 -1 2" />
      );
      body = <>{c(p * 0.27, p * 0.28, p / 44)}{c(p * 0.77, p * 0.78, p / 44)}</>;
      break;
    }
    case 'diamond':
      body = <path d={`M${p / 2} 0L${p} ${p / 2}L${p / 2} ${p}L0 ${p / 2}Z M${p / 2} ${p * 0.3}L${p * 0.7} ${p / 2}L${p / 2} ${p * 0.7}L${p * 0.3} ${p / 2}Z`} fill="none" stroke={color} strokeWidth={sw} />;
      break;
    case 'flame': {
      const f = (x: number, y: number) => <path key={`${x}`} transform={`translate(${x} ${y}) scale(${p / 40})`} fill={color} d="M0 -9 C5 -3 7 1 4 6 C2 9 -3 9 -5 5 C-7 1 -4 -1 -3 -4 C-2 -1 0 0 1 -1 C2 -4 1 -6 0 -9Z" />;
      body = <>{f(p * 0.25, p * 0.3)}{f(p * 0.75, p * 0.8)}</>;
      break;
    }
    case 'beans': {
      const b = (x: number, y: number, a: number) => (
        <g key={`${x}`} transform={`translate(${x} ${y}) rotate(${a})`}>
          <ellipse rx={p * 0.13} ry={p * 0.09} fill={color} />
          <path d={`M${-p * 0.1} ${p * 0.01} C${-p * 0.03} ${-p * 0.03} ${p * 0.03} ${p * 0.04} ${p * 0.1} ${-p * 0.005}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={sw * 0.7} fill="none" />
        </g>
      );
      body = <>{b(p * 0.26, p * 0.28, -30)}{b(p * 0.76, p * 0.76, 25)}</>;
      break;
    }
    case 'seigaiha': {
      const arcs = (cx: number, cy: number) => [0.5, 0.36, 0.22].map((k) => <path key={`${cx}-${cy}-${k}`} d={`M${cx - p * k} ${cy} A${p * k} ${p * k} 0 0 1 ${cx + p * k} ${cy}`} fill="none" stroke={color} strokeWidth={sw} />);
      body = <>{arcs(0, p / 2)}{arcs(p, p / 2)}{arcs(p / 2, p)}{arcs(p / 2, 0)}{arcs(0, p * 1.5)}{arcs(p, p * 1.5)}</>;
      break;
    }
    case 'meander': // hoa văn chữ triện (chữ Hồi)
      body = <path d={`M${p * 0.1} ${p * 0.9}V${p * 0.1}H${p * 0.9}V${p * 0.7}H${p * 0.3}V${p * 0.3}H${p * 0.7}V${p * 0.5}H${p * 0.5}`} fill="none" stroke={color} strokeWidth={sw * 1.3} strokeLinecap="square" />;
      break;
    case 'checker':
      body = <><rect width={p / 2} height={p / 2} fill={color} /><rect x={p / 2} y={p / 2} width={p / 2} height={p / 2} fill={color} /></>;
      break;
  }
  return <pattern id={id} patternUnits="userSpaceOnUse" width={p} height={p}>{body}</pattern>;
}

// ---------- logo (ảnh khách hoặc chữ lồng) ----------
function Logo({ cx, cy, r, logo, p, f, brand, ring = true }: { cx: number; cy: number; r: number; logo?: string; p: TWPalette; f: TWFont; brand: string; ring?: boolean }) {
  const uid = useUid();
  if (logo) {
    return (
      <g>
        <defs><clipPath id={`lg${uid}`}><circle cx={cx} cy={cy} r={r * 0.9} /></clipPath></defs>
        <circle cx={cx} cy={cy} r={r} fill="#FFFFFF" />
        <image href={logo} x={cx - r * 0.86} y={cy - r * 0.86} width={r * 1.72} height={r * 1.72} preserveAspectRatio="xMidYMid meet" clipPath={`url(#lg${uid})`} />
        {ring && <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.accent2} strokeWidth={r * 0.06} />}
      </g>
    );
  }
  const ini = initials(brand);
  const ts = { fam: f.family, wt: f.weight };
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={p.paper} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={p.accent} strokeWidth={r * 0.05} />
      {ring && <circle cx={cx} cy={cy} r={r} fill="none" stroke={p.accent2} strokeWidth={r * 0.07} />}
      <Line t={ini} x={cx} y={cy + r * 0.3} size={r * 0.85} maxW={r * 1.3} ts={ts} fill={p.accent} anchor="middle" />
    </g>
  );
}

// ---------- module giấy lót khay ----------
interface Box { x: number; y: number; w: number; h: number }
interface Ctx { p: TWPalette; f: TWFont; st: TWStyle; data: TWData; dark: boolean }

function StoryMod({ b, c }: { b: Box; c: Ctx }) {
  const { p, f, data, st } = c;
  const disp = { fam: f.family, wt: f.weight };
  const body = { fam: BODY, wt: 600 };
  const t = fitLines(data.storyTitle || '', b.w, Math.min(b.w * 0.085, 11), disp, 2);
  const lhT = t.size * 1.12;
  const titleH = t.lines.length ? t.size * 0.95 + (t.lines.length - 1) * lhT : 0;
  const y0 = b.y + (t.lines.length ? t.size * 0.95 : 0);
  const divY = b.y + titleH + 4.5;
  const pTop = divY + 6;
  const iconMin = b.h * 0.3; // chừa chỗ cho icon minh hoạ nếu đoạn văn ngắn
  const para = fitPara(data.story || '', b.w, b.y + b.h - pTop, Math.min(4.6, b.w * 0.042), body, 1.5, 2.6);
  const pH = para.lines.length * para.size * 1.5;
  const left = b.y + b.h - (pTop + pH);
  return (
    <g data-mod="story">
      <g fontFamily={`"${disp.fam}"`} fontWeight={disp.wt} fill={p.accent}>
        {t.lines.map((ln, i) => <text key={i} x={b.x} y={y0 + i * lhT} fontSize={fitSize(ln, b.w, t.size, disp)}>{ln}</text>)}
      </g>
      <path d={`M${b.x} ${divY}h${Math.min(26, b.w * 0.3)}`} stroke={p.accent2} strokeWidth={1.1} strokeLinecap="round" />
      <circle cx={b.x + Math.min(26, b.w * 0.3) + 3.2} cy={divY} r={1} fill={p.accent2} />
      <g fontFamily={`"${BODY}"`} fontWeight={600} fill={p.ink} opacity={0.92}>
        {para.lines.map((ln, i) => <text key={i} x={b.x} y={pTop + para.size * 0.95 + i * para.size * 1.5} fontSize={para.size}>{ln}</text>)}
      </g>
      {left > iconMin * 0.75 && (() => {
        const s = Math.min(left * 0.72, b.w * 0.5);
        return <Ico k={st.icon} x={b.x + (b.w - s) / 2} y={b.y + b.h - left / 2 - s / 2 + 2} s={s} color={p.accent} w={1.3} opacity={0.85} />;
      })()}
    </g>
  );
}

function MenuMod({ b, c }: { b: Box; c: Ctx }) {
  const { p, f, data } = c;
  const disp = { fam: f.family, wt: f.weight };
  const rows = priceRows(data.menu).slice(0, 10);
  const tSize = Math.min(b.w * 0.075, 10);
  const titleH = data.menuTitle ? tSize * 1.25 : 0;
  const top = b.y + titleH + 5;
  const rowH = rows.length ? Math.min((b.y + b.h - top) / rows.length, 21) : 0;
  const nSize = Math.min(rowH * 0.38, 6.2);
  const nameTs = { fam: BODY, wt: 800 };
  return (
    <g data-mod="menu">
      {data.menuTitle && <Line t={data.menuTitle} x={b.x + b.w / 2} y={b.y + tSize * 0.95} size={tSize} maxW={b.w} ts={disp} fill={p.accent} anchor="middle" />}
      {data.menuTitle && (
        <g stroke={p.accent2} strokeWidth={0.9} strokeLinecap="round">
          <path d={`M${b.x + b.w / 2 - 22} ${b.y + titleH + 1.2}h16M${b.x + b.w / 2 + 6} ${b.y + titleH + 1.2}h16`} />
          <path d={`M${b.x + b.w / 2} ${b.y + titleH - 1}l2.2 2.2-2.2 2.2-2.2-2.2z`} fill={p.accent2} stroke="none" />
        </g>
      )}
      {rows.map((r, i) => {
        const y = top + rowH * i + rowH * 0.62;
        const pw = textW(r.price, nSize * 1.04, disp);
        const priceW = Math.min(pw, b.w * 0.34);
        const nameMax = b.w - priceW - 6;
        const ns = fitSize(r.name, nameMax, nSize, nameTs);
        const nw = textW(r.name, ns, nameTs);
        return (
          <g key={i}>
            <text x={b.x} y={y} fontSize={ns} fontFamily={`"${BODY}"`} fontWeight={800} fill={p.ink}>{r.name}</text>
            {nw + 3 < b.w - priceW - 3 && <path d={`M${b.x + nw + 2} ${y - 0.6}H${b.x + b.w - priceW - 2}`} stroke={p.sub} strokeWidth={0.55} strokeDasharray="0.1 1.6" strokeLinecap="round" opacity={0.8} />}
            <Line t={r.price} x={b.x + b.w} y={y} size={nSize * 1.04} maxW={b.w * 0.34} ts={disp} fill={p.accent} anchor="end" />
          </g>
        );
      })}
    </g>
  );
}

/** thẻ QR + wifi + mạng xã hội: dựng theo đơn vị rồi co đều cho vừa khung */
function QrMod({ b, c }: { b: Box; c: Ctx }) {
  const { p, data } = c;
  const W = b.w, pad = W * 0.09;
  const inner = W - pad * 2;
  const body = { fam: BODY, wt: 800 }, body6 = { fam: BODY, wt: 600 };
  const q = qrPath(qrUrl(data.qr));
  const qs = Math.min(inner * 0.78, 70);
  const els: ReactNode[] = [];
  let y = pad;
  const lab = fitLines(data.qrLabel || '', inner, Math.min(W * 0.068, 5.2), body, 2);
  lab.lines.forEach((ln, i) => { els.push(<text key={`l${i}`} x={W / 2} y={y + lab.size * 0.95} fontSize={fitSize(ln, inner, lab.size, body)} fontFamily={`"${BODY}"`} fontWeight={800} fill={p.onAccent} textAnchor="middle">{ln}</text>); y += lab.size * 1.2; });
  y += 2.5;
  const qx = (W - qs) / 2, qpad = qs * 0.07, cell = (qs - qpad * 2) / q.n;
  els.push(
    <g key="qr" data-qr="1">
      <path d={rr(qx, y, qs, qs, qs * 0.07)} fill="#FFFFFF" />
      <path d={q.d} transform={`translate(${qx + qpad} ${y + qpad}) scale(${cell})`} fill="#141414" />
    </g>,
  );
  y += qs + 5;
  const small = Math.min(W * 0.058, 4.2);
  if (data.wifi || data.wifiPass) {
    els.push(<path key="d1" d={`M${pad} ${y}H${W - pad}`} stroke={p.onAccent} strokeOpacity={0.35} strokeWidth={0.5} />);
    y += 4;
    const ic = small * 1.5;
    els.push(<Ico key="wi" k="wifi" x={pad} y={y} s={ic} color={p.accent2} w={2.2} />);
    els.push(<Line key="w1" t={data.wifi ? `Wifi: ${data.wifi}` : ''} x={pad + ic + 2} y={y + small * 0.95} size={small} maxW={inner - ic - 2} ts={body} fill={p.onAccent} />);
    els.push(<Line key="w2" t={data.wifiPass ? `Mật khẩu: ${data.wifiPass}` : ''} x={pad + ic + 2} y={y + small * 2.2} size={small * 0.92} maxW={inner - ic - 2} ts={body6} fill={p.onAccent} opacity={0.9} />);
    y += small * 2.8 + 2;
  }
  if (data.social) {
    const so = fitLines(data.social.replace(/\s*·\s*/g, '\n'), inner - small * 1.6, small * 0.92, body6, 3);
    els.push(<Ico key="ch" k="chat" x={pad} y={y + 0.2} s={small * 1.4} color={p.accent2} w={2.2} />);
    so.lines.forEach((ln, i) => els.push(<Line key={`s${i}`} t={ln} x={pad + small * 1.4 + 2} y={y + so.size * 0.95 + i * so.size * 1.3} size={so.size} maxW={inner - small * 1.4 - 2} ts={body6} fill={p.onAccent} />));
    y += so.lines.length * so.size * 1.3 + 1;
  }
  y += pad * 0.7;
  const k = Math.min(1, b.h / y);
  const H = y * k;
  return (
    <g data-mod="qr">
      <path d={rr(b.x + (b.w - W * k) / 2, b.y, W * k, H, 5 * k)} fill={p.accent} />
      <g transform={`translate(${b.x + (b.w - W * k) / 2} ${b.y}) scale(${k})`}>{els}</g>
    </g>
  );
}

function ContactLine({ x, y, w, size, c, color }: { x: number; y: number; w: number; size: number; c: Ctx; color: string }) {
  const { data } = c;
  const items = ([['pin', data.address], ['phone', data.hotline], ['clock', data.hours]] as const).filter(([, v]) => (v || '').trim());
  const ts = { fam: BODY, wt: 600 };
  const gap = size * 2.2, ic = size * 1.25;
  const total = (s: number) => items.reduce((a, [, v]) => a + ic + s * 0.4 + textW(v, s, ts), 0) + gap * Math.max(0, items.length - 1);
  let s = size;
  while (total(s) > w && s > size * 0.5) s *= 0.95;
  let cx = x + (w - total(s)) / 2;
  return (
    <g data-mod="contact">
      {items.map(([k, v]) => {
        const icS = s * 1.25;
        const el = (
          <g key={k}>
            <Ico k={k} x={cx} y={y - icS * 0.82} s={icS} color={color} w={2} />
            <text x={cx + icS + s * 0.4} y={y} fontSize={s} fontFamily={`"${BODY}"`} fontWeight={600} fill={color}>{v}</text>
          </g>
        );
        cx += icS + s * 0.4 + textW(v, s, ts) + gap;
        return el;
      })}
    </g>
  );
}

// ---------- GIẤY LÓT KHAY ----------
export function LinerSvg({ spec, data, logo, bleed = false, style }: { spec: TWSpec; data: TWData; logo?: string; bleed?: boolean; style?: CSSProperties }) {
  const uid = useUid();
  const sz = twLinerSize(spec.liner);
  const W = sz.wMm, H = sz.hMm, bl = bleed ? TW_BLEED_MM : 0;
  const p = twPalette(spec.palette), f = twFont(spec.font), st = twStyle(spec.style);
  const dark = p.id === 'lau-dark';
  const c: Ctx = { p, f, st, data, dark };
  const disp = { fam: f.family, wt: f.weight };
  const land = W >= H;
  const m = Math.min(W, H) * 0.06;
  const pat = patternOf(spec);
  const pid = `tp${uid}`, pid2 = `tq${uid}`;
  const frame = spec.layout === 'frame';

  let header: ReactNode, footer: ReactNode, top: number, bottom: number;
  if (!frame) {
    const hh = (land ? H : W) * 0.2;
    const r = hh * 0.33;
    const lx = m + r, ly = hh / 2;
    const tx = lx + r + 7;
    const tagW = land ? W * 0.27 : 0;
    const bw = W - tx - m - (tagW ? tagW + 8 : 0);
    const bs = fitSize(data.brand || '', bw, hh * 0.36, disp);
    header = (
      <g data-mod="header">
        <rect x={-bl} y={-bl} width={W + bl * 2} height={hh + bl} fill={p.accent} />
        <rect x={-bl} y={-bl} width={W + bl * 2} height={hh + bl} fill={`url(#${pid})`} opacity={0.16} />
        <rect x={-bl} y={hh} width={W + bl * 2} height={1.6} fill={p.accent2} />
        <Logo cx={lx} cy={ly} r={r} logo={logo} p={p} f={f} brand={data.brand} />
        <Line t={data.brand} x={tx} y={ly + (data.slogan ? -hh * 0.02 : bs * 0.35)} size={bs} maxW={bw} ts={disp} fill={p.onAccent} />
        <Line t={data.slogan} x={tx} y={ly + hh * 0.22} size={Math.min(hh * 0.12, 7)} maxW={bw} ts={{ fam: BODY, wt: 600, ls: 0.4 }} fill={p.onAccent} opacity={0.88} upper />
        {tagW > 0 && <Line t={data.tagline} x={W - m} y={ly + hh * 0.08} size={hh * 0.2} maxW={tagW} ts={{ fam: SCRIPT, wt: 700 }} fill={p.accent2} anchor="end" />}
      </g>
    );
    top = hh + m * 0.9;
    const fh = H * 0.075;
    bottom = H - fh - m * 0.5;
    footer = (
      <g>
        <rect x={-bl} y={H - fh} width={W + bl * 2} height={fh + bl} fill={dark ? '#2A2624' : p.accent2} opacity={dark ? 1 : 0.16} />
        <ContactLine x={m} y={H - fh / 2 + 1.4} w={W - m * 2} size={Math.min(fh * 0.3, 5)} c={c} color={p.ink} />
      </g>
    );
  } else {
    const F = Math.min(W, H) * 0.055; // viền hoạ tiết
    const ins = F + 4;
    const r = Math.min(W, H) * 0.06;
    const ly = ins + 4 + r;
    const bs = fitSize(data.brand || '', W - ins * 2 - 20, Math.min(W, H) * 0.075, disp);
    header = (
      <g data-mod="header">
        <path fillRule="evenodd" d={`M${-bl} ${-bl}H${W + bl}V${H + bl}H${-bl}Z M${F} ${F}V${H - F}H${W - F}V${F}Z`} fill={p.accent} />
        <path fillRule="evenodd" d={`M${-bl} ${-bl}H${W + bl}V${H + bl}H${-bl}Z M${F} ${F}V${H - F}H${W - F}V${F}Z`} fill={`url(#${pid})`} opacity={0.22} />
        <rect x={F + 2.2} y={F + 2.2} width={W - F * 2 - 4.4} height={H - F * 2 - 4.4} fill="none" stroke={p.accent2} strokeWidth={0.7} />
        <Logo cx={W / 2} cy={ly} r={r} logo={logo} p={p} f={f} brand={data.brand} />
        <Line t={data.brand} x={W / 2} y={ly + r + bs * 1.02} size={bs} maxW={W - ins * 2 - 20} ts={disp} fill={p.accent} anchor="middle" />
        <Line t={[data.slogan, data.tagline].filter(Boolean).join(' · ')} x={W / 2} y={ly + r + bs * 1.02 + 8.5} size={Math.min(5.2, W * 0.014)} maxW={W - ins * 2 - 30} ts={{ fam: BODY, wt: 600, ls: 0.3 }} fill={p.sub} anchor="middle" />
      </g>
    );
    top = ly + r + bs * 1.02 + 17;
    const fy = H - F - 7;
    bottom = fy - 9;
    footer = (
      <g>
        <path d={`M${ins + 8} ${fy - 6.5}H${W - ins - 8}`} stroke={p.accent2} strokeWidth={0.5} strokeOpacity={0.8} />
        <ContactLine x={ins + 4} y={fy} w={W - ins * 2 - 8} size={Math.min(4.4, W * 0.012)} c={c} color={p.ink} />
      </g>
    );
  }

  const inX = frame ? Math.min(W, H) * 0.055 + 12 : m;
  const inW = W - inX * 2;
  const gap = Math.min(W, H) * 0.05;
  let mods: ReactNode;
  if (land) {
    const qw = Math.min(inW * 0.25, 90);
    const rest = inW - qw - gap * 2;
    const sw = rest * 0.44, mw = rest - sw;
    mods = (
      <>
        <StoryMod b={{ x: inX, y: top, w: sw, h: bottom - top }} c={c} />
        <path d={`M${inX + sw + gap / 2} ${top + 2}V${bottom - 2}`} stroke={p.accent2} strokeWidth={0.5} strokeOpacity={0.7} strokeDasharray="1.2 1.6" />
        <MenuMod b={{ x: inX + sw + gap, y: top, w: mw, h: bottom - top }} c={c} />
        <QrMod b={{ x: inX + inW - qw, y: top, w: qw, h: bottom - top }} c={c} />
      </>
    );
  } else {
    const menuH = (bottom - top) * 0.5;
    const rowY = top + menuH + gap;
    const qw = Math.min(inW * 0.42, 92);
    mods = (
      <>
        <MenuMod b={{ x: inX, y: top, w: inW, h: menuH }} c={c} />
        <StoryMod b={{ x: inX, y: rowY, w: inW - qw - gap, h: bottom - rowY }} c={c} />
        <QrMod b={{ x: inX + inW - qw, y: rowY, w: qw, h: bottom - rowY }} c={c} />
      </>
    );
  }

  return (
    <svg viewBox={`${-bl} ${-bl} ${W + bl * 2} ${H + bl * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-tw="liner">
      <defs>
        <PatternDef id={pid} kind={pat} p={Math.min(W, H) * 0.075} color={frame ? p.onAccent : p.onAccent} />
        <PatternDef id={pid2} kind={pat} p={Math.min(W, H) * 0.09} color={p.accent} />
      </defs>
      <rect x={-bl} y={-bl} width={W + bl * 2} height={H + bl * 2} fill={p.paper} />
      {/* hoạ tiết chìm rất nhạt trên nền giấy */}
      <rect x={-bl} y={-bl} width={W + bl * 2} height={H + bl * 2} fill={`url(#${pid2})`} opacity={dark ? 0.07 : 0.045} />
      {header}
      {mods}
      {footer}
    </svg>
  );
}

// ---------- BAO ĐŨA: mặt trước / mặt sau (25×4cm) ----------
export function SleeveFace({ spec, data, logo, side, bleed = 0, style }: { spec: TWSpec; data: TWData; logo?: string; side: 'front' | 'back'; bleed?: number; style?: CSSProperties }) {
  const uid = useUid();
  const L = SLEEVE.L, Wd = SLEEVE.W, bl = bleed;
  return (
    <svg viewBox={`${-bl} ${-bl} ${L + bl * 2} ${Wd + bl * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-tw={`sleeve-${side}`}>
      <SleeveArt spec={spec} data={data} logo={logo} side={side} bl={bl} uid={uid} />
    </svg>
  );
}
function SleeveArt({ spec, data, logo, side, bl, uid }: { spec: TWSpec; data: TWData; logo?: string; side: 'front' | 'back'; bl: number; uid: string }) {
  const L = SLEEVE.L, Wd = SLEEVE.W;
  const p = twPalette(spec.palette), f = twFont(spec.font);
  const disp = { fam: f.family, wt: f.weight };
  const pid = `sp${uid}${side}`;
  const pat = patternOf(spec);
  if (side === 'front') {
    const r = 10.5, lx = 34, ly = Wd / 2;
    const tx = lx + r + 6, tagX = L - 8, tagW = 50;
    const bw = tagX - tagW - 8 - tx;
    const bs = fitSize(data.brand || '', bw, 12.5, disp);
    const tag = fitLines(data.tagline || '', tagW, 6.2, { fam: SCRIPT, wt: 700 }, 2);
    return (
      <g>
        <defs><PatternDef id={pid} kind={pat} p={11} color={p.onAccent} /></defs>
        <rect x={-bl} y={-bl} width={L + bl * 2} height={Wd + bl * 2} fill={p.accent} />
        <rect x={-bl} y={-bl} width={L + bl * 2} height={Wd + bl * 2} fill={`url(#${pid})`} opacity={0.15} />
        <rect x={-bl} y={2.2} width={L + bl * 2} height={0.7} fill={p.accent2} />
        <rect x={-bl} y={Wd - 2.9} width={L + bl * 2} height={0.7} fill={p.accent2} />
        <Logo cx={lx} cy={ly} r={r} logo={logo} p={p} f={f} brand={data.brand} />
        <Line t={data.brand} x={tx} y={ly + (data.slogan ? 1.2 : bs * 0.35)} size={bs} maxW={bw} ts={disp} fill={p.onAccent} />
        <Line t={data.slogan} x={tx} y={ly + 8.6} size={3.6} maxW={bw} ts={{ fam: BODY, wt: 600, ls: 0.2 }} fill={p.onAccent} opacity={0.88} upper />
        <g fontFamily={`"${SCRIPT}"`} fontWeight={700} fill={p.accent2} textAnchor="end">
          {tag.lines.map((ln, i) => <text key={i} x={tagX} y={ly + (i - (tag.lines.length - 1) / 2) * tag.size * 1.05 + tag.size * 0.33} fontSize={fitSize(ln, tagW, tag.size, { fam: SCRIPT, wt: 700 })}>{ln}</text>)}
        </g>
      </g>
    );
  }
  // mặt sau: nền giấy, liên hệ
  const body = { fam: BODY, wt: 600 };
  const items = ([['phone', data.hotline], ['pin', data.address], ['chat', data.social]] as const).filter(([, v]) => (v || '').trim());
  return (
    <g>
      <defs><PatternDef id={pid} kind={pat} p={9} color={p.accent} /></defs>
      <rect x={-bl} y={-bl} width={L + bl * 2} height={Wd + bl * 2} fill={p.paper} />
      <rect x={-bl} y={-bl} width={30 + bl} height={Wd + bl * 2} fill={p.accent} />
      <Ico k={twStyle(spec.style).icon} x={5} y={Wd / 2 - 10} s={20} color={p.onAccent} w={1.5} />
      <rect x={L - 26} y={-bl} width={26 + bl} height={Wd + bl * 2} fill={`url(#${pid})`} opacity={0.35} />
      <Line t={data.brand} x={38} y={11} size={6} maxW={L - 26 - 46} ts={disp} fill={p.accent} />
      {items.map(([k, v], i) => (
        <g key={k}>
          <Ico k={k} x={38} y={15.3 + i * 7.6} s={4.4} color={p.accent} w={2} />
          <Line t={v} x={44} y={18.9 + i * 7.6} size={3.5} maxW={L - 26 - 52} ts={body} fill={p.ink} />
        </g>
      ))}
    </g>
  );
}

/** khuôn bế bao đũa trải phẳng: lớp In + CutContour + Fold. labels = chú thích trên màn hình (không in) */
export function SleeveDielineSvg({ spec, data, logo, labels = false, style }: { spec: TWSpec; data: TWData; logo?: string; labels?: boolean; style?: CSSProperties }) {
  const uid = useUid();
  const { L, W: Wd, glue: G, tuck: T, notch: N } = SLEEVE;
  const bl = TW_BLEED_MM;
  const fw = SLEEVE_FLAT.w, fh = SLEEVE_FLAT.h;
  const backY = G, frontY = G + Wd;
  // đường cắt: tai dán vát 2 đầu, đầu gập đáy (vát), khe ngón tay ở miệng mặt trước
  const ny = frontY + Wd / 2;
  const cut = `M3 0H${L - 3}L${L} ${G}V${frontY}L${L + T - 2} ${frontY + 3}V${fh - 3}L${L} ${fh}H0V${ny + N}A${N} ${N} 0 0 0 0 ${ny - N}V${G}Z`;
  const p = twPalette(spec.palette);
  const marks = (
    <>
      <g id="CutContour"><path d={cut} fill="none" stroke="#EC008C" strokeWidth={0.3} /></g>
      <g id="Fold" stroke="#00A3E0" strokeWidth={0.3} strokeDasharray="2 1.4" fill="none">
        <path d={`M0 ${G}H${L}`} /><path d={`M0 ${frontY}H${L}`} /><path d={`M${L} ${frontY}V${fh}`} />
      </g>
    </>
  );
  const clip = `cl${uid}`;
  return (
    <svg viewBox={`${-bl} ${-bl} ${fw + bl * 2} ${fh + bl * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-tw="sleeve-dieline">
      <defs><clipPath id={clip}><path d={`M${-bl} ${G - bl}H${L + T + bl}V${fh + bl}H${-bl}Z`} /></clipPath></defs>
      <g id="In">
        <rect x={-bl} y={-bl} width={fw + bl * 2} height={fh + bl * 2} fill="#FFFFFF" />
        {/* tai dán để trắng (không in) */}
        <g transform={`translate(0 ${backY})`}><SleeveArt spec={spec} data={data} logo={logo} side="back" bl={0} uid={`${uid}b`} /></g>
        <g transform={`translate(0 ${frontY})`}><SleeveArt spec={spec} data={data} logo={logo} side="front" bl={0} uid={`${uid}f`} /></g>
        {/* nền tràn lề quanh mặt trước + đầu gập (cùng màu mặt trước) */}
        <rect x={-bl} y={frontY} width={bl} height={Wd + bl} fill={p.accent} clipPath={`url(#${clip})`} />
        <rect x={-bl} y={fh} width={L + bl} height={bl} fill={p.accent} />
        <rect x={-bl} y={backY} width={bl} height={Wd} fill={p.accent} />
        <rect x={L} y={frontY} width={T + bl} height={Wd + bl} fill={p.accent} />
      </g>
      {marks}
      {labels && (
        <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.2} fill="#475569">
          <text x={L / 2} y={G / 2 + 1.1} textAnchor="middle">Tai dán (không in)</text>
          <text x={L + T / 2} y={frontY + Wd / 2} textAnchor="middle" transform={`rotate(90 ${L + T / 2} ${frontY + Wd / 2})`} fill="#FFFFFF">gập đáy</text>
        </g>
      )}
    </svg>
  );
}

// ---------- KHĂN GIẤY (in 1–2 màu) ----------
function NapkinArt({ spec, data, logo, cx, cy, uid }: { spec: TWSpec; data: TWData; logo?: string; cx: number; cy: number; uid: string }) {
  const p = twPalette(spec.palette), f = twFont(spec.font), st = twStyle(spec.style);
  // mực khăn giấy: 1 màu = accent; 2 màu = accent + accent2. Nền tối (than hồng) thì mực đỏ/vàng trên khăn trắng.
  const ink1 = p.id === 'ff-yellow' ? p.accent2 : p.accent;
  const ink2 = spec.napkinInks === 2 ? (p.id === 'ff-yellow' ? '#1F1A14' : p.accent2) : ink1;
  const Z = NAPKIN.zone;
  const disp = { fam: f.family, wt: f.weight };
  const fid = `nf${uid}`;
  const R = Z * 0.27;
  const brandY = cy + R * 0.2 + 15;
  return (
    <g data-napkin-art="1">
      <defs>
        {/* logo khách → 1 màu mực (phần tối in, phần sáng/trong suốt bỏ) */}
        <filter id={fid} colorInterpolationFilters="sRGB">
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -0.2126 -0.7152 -0.0722 1 0" result="a" />
          <feFlood floodColor={ink1} />
          <feComposite in2="a" operator="in" />
        </filter>
      </defs>
      <circle cx={cx} cy={cy - 12} r={R} fill="none" stroke={ink2} strokeWidth={0.9} />
      <circle cx={cx} cy={cy - 12} r={R - 2.2} fill="none" stroke={ink2} strokeWidth={0.4} />
      {logo
        ? <image href={logo} x={cx - R * 0.72} y={cy - 12 - R * 0.72} width={R * 1.44} height={R * 1.44} preserveAspectRatio="xMidYMid meet" filter={`url(#${fid})`} />
        : <Ico k={st.icon} x={cx - R * 0.62} y={cy - 12 - R * 0.62} s={R * 1.24} color={ink1} w={1.6} />}
      <Line t={data.brand} x={cx} y={brandY + 5} size={11.5} maxW={Z * 0.98} ts={disp} fill={ink1} anchor="middle" />
      <Line t={data.slogan} x={cx} y={brandY + 14} size={3.9} maxW={Z * 0.9} ts={{ fam: BODY, wt: 600, ls: 0.3 }} fill={ink2} anchor="middle" upper />
    </g>
  );
}
/** mặt khăn đã gấp 4 (16,5×16,5cm) — dùng cho xem trước + 3D */
export function NapkinFaceSvg({ spec, data, logo, style }: { spec: TWSpec; data: TWData; logo?: string; style?: CSSProperties }) {
  const uid = useUid();
  const F = NAPKIN.face;
  return (
    <svg viewBox={`0 0 ${F} ${F}`} xmlns="http://www.w3.org/2000/svg" style={style} data-tw="napkin-face">
      <rect width={F} height={F} fill="#FFFFFF" />
      <NapkinArt spec={spec} data={data} logo={logo} cx={F / 2} cy={F / 2} uid={uid} />
    </svg>
  );
}
/** file in khăn 33×33cm: hình in ở 1/4 lộ ra khi gấp + đường gấp (lớp Fold) + khung vùng in */
export function NapkinPrintSvg({ spec, data, logo, labels = false, style }: { spec: TWSpec; data: TWData; logo?: string; labels?: boolean; style?: CSSProperties }) {
  const uid = useUid();
  const { full: S2, face: F, zone: Z } = NAPKIN;
  const cx = F + F / 2, cy = F + F / 2;
  return (
    <svg viewBox={`0 0 ${S2} ${S2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-tw="napkin-print">
      <g id="In">
        <rect width={S2} height={S2} fill="#FFFFFF" />
        <NapkinArt spec={spec} data={data} logo={logo} cx={cx} cy={cy} uid={uid} />
      </g>
      <g id="Fold" stroke="#00A3E0" strokeWidth={0.5} strokeDasharray="4 3" fill="none">
        <path d={`M${F} 0V${S2}M0 ${F}H${S2}`} />
      </g>
      <rect x={cx - Z / 2} y={cy - Z / 2} width={Z} height={Z} fill="none" stroke="#94A3B8" strokeWidth={0.4} strokeDasharray="1.5 1.5" />
      <rect x={0.25} y={0.25} width={S2 - 0.5} height={S2 - 0.5} fill="none" stroke="#CBD5E1" strokeWidth={0.5} />
      {labels && (
        <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={7} fill="#64748B" textAnchor="middle">
          <text x={F / 2} y={F / 2}>khăn 33×33cm</text>
          <text x={F / 2} y={F / 2 + 10} fontSize={5.5}>gấp 4 — hình in nằm ở ô lộ ra</text>
          <text x={cx} y={cy + Z / 2 + 8} fontSize={5}>vùng in 10×10cm</text>
        </g>
      )}
    </svg>
  );
}
export const napkinInkCount = (spec: TWSpec) => spec.napkinInks;
