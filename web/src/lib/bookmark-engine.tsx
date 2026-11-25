'use client';
// Bookmark kẹp sách: 1 engine SVG = KHỔ × ĐẦU (bo góc / vòm / đuôi én) × BỐ CỤC × BẢNG MÀU × FONT → nhiều mẫu, render code 100%.
// Đơn vị: 10 = 1mm. 2 mặt (trước/sau). Ép kim: phần "vàng" tách thành lớp ép kim riêng (file in không in phần đó).
// File in: bình nhiều con lên tờ A4/A3/SRA3 (tự xoay ngang nếu được nhiều con hơn), nền tràn 2mm, lớp CutContour = hình + lỗ dây tua.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

export const U = 10;
export const BM_BLEED_MM = 2;
export const CUTCONTOUR = '#EC008C';
const f1 = (n: number) => Math.round(n * 10) / 10;

// ---------- khổ + đầu ----------
export interface BMSize { id: string; name: string; wMm: number; hMm: number }
export const BM_SIZES: BMSize[] = [
  { id: 's50', name: '5 × 15 cm', wMm: 50, hMm: 150 },
  { id: 's55', name: '5,5 × 18 cm', wMm: 55, hMm: 180 },
  { id: 's40', name: '4 × 14 cm', wMm: 40, hMm: 140 },
];
export const bmSize = (id: string) => BM_SIZES.find((s) => s.id === id) || BM_SIZES[0];
export type BMTop = 'round' | 'arch' | 'tail';
export const BM_TOPS: { id: BMTop; name: string }[] = [
  { id: 'round', name: 'Bo góc' },
  { id: 'arch', name: 'Đầu vòm' },
  { id: 'tail', name: 'Đuôi én' },
];
export const HOLE_R_MM = 2.5; // lỗ Ø5mm xỏ dây tua
export const HOLE_Y_MM = 10;
const CORNER = 3;
export const tailDepth = (wMm: number) => wMm * 0.3;

export type BMMaterial = 'matte' | 'foil';
export const BM_MATERIALS: { id: BMMaterial; name: string; note: string }[] = [
  { id: 'matte', name: 'Couche 300 cán mờ', note: 'in màu đều, phổ biến' },
  { id: 'foil', name: 'Giấy mỹ thuật ép kim', note: 'phần màu vàng = ép kim nhũ' },
];
export const BM_TASSELS: { id: string; name: string; color: string }[] = [
  { id: 'red', name: 'Đỏ', color: '#B3202A' },
  { id: 'gold', name: 'Vàng kim', color: '#C9A04A' },
  { id: 'cream', name: 'Kem', color: '#EFE6D2' },
  { id: 'navy', name: 'Navy', color: '#1F2D4D' },
  { id: 'green', name: 'Xanh rêu', color: '#3F5A3A' },
  { id: 'black', name: 'Đen', color: '#1B1B1B' },
  { id: 'pink', name: 'Hồng', color: '#D98A98' },
];
export const bmTassel = (id: string) => BM_TASSELS.find((t) => t.id === id) || BM_TASSELS[0];

export interface BMSpec { size: string; top: BMTop; layout: string; palette: string; font: string; material: BMMaterial; hole: boolean; tassel: string }

/** đường viền hình (0.1mm, gốc = góc trên trái thành phẩm). inset > 0 thu vào, < 0 nở ra. */
export function shapePath(spec: Pick<BMSpec, 'size' | 'top'>, inset = 0): string {
  const s = bmSize(spec.size);
  const W = s.wMm * U, H = s.hMm * U, i = inset * U;
  const r = Math.max(0.2, CORNER * U - i);
  if (spec.top === 'arch') {
    const R = W / 2 - i;
    return `M${f1(i)} ${f1(W / 2)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(W - i)} ${f1(W / 2)}V${f1(H - i - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(W - i - r)} ${f1(H - i)}H${f1(i + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(i)} ${f1(H - i - r)}Z`;
  }
  if (spec.top === 'tail') {
    const N = tailDepth(s.wMm) * U;
    return `M${f1(i + r)} ${f1(i)}H${f1(W - i - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(W - i)} ${f1(i + r)}V${f1(H - i)}L${f1(W / 2)} ${f1(H - N - i * 1.6)}L${f1(i)} ${f1(H - i)}V${f1(i + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(i + r)} ${f1(i)}Z`;
  }
  return `M${f1(i + r)} ${f1(i)}H${f1(W - i - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(W - i)} ${f1(i + r)}V${f1(H - i - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(W - i - r)} ${f1(H - i)}H${f1(i + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(i)} ${f1(H - i - r)}V${f1(i + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(i + r)} ${f1(i)}Z`;
}
export function holeOf(spec: Pick<BMSpec, 'size' | 'hole'>): { cx: number; cy: number; r: number } | null {
  if (!spec.hole) return null;
  const s = bmSize(spec.size);
  return { cx: (s.wMm / 2) * U, cy: HOLE_Y_MM * U, r: HOLE_R_MM * U };
}
const circlePath = (cx: number, cy: number, r: number) => `M${f1(cx - r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx + r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx - r)} ${f1(cy)}Z`;
/** đường bế đầy đủ: hình + lỗ */
export function cutPath(spec: Pick<BMSpec, 'size' | 'top' | 'hole'>): string {
  const h = holeOf(spec);
  return shapePath(spec) + (h ? circlePath(h.cx, h.cy, h.r) : '');
}
/** vùng chữ an toàn (đơn vị engine): chừa lề 4–5mm, lỗ dây tua, vòm, đuôi én */
export function safeBox(spec: Pick<BMSpec, 'size' | 'top' | 'hole'>) {
  const s = bmSize(spec.size);
  const side = s.wMm <= 42 ? 4 : 5;
  let top = spec.top === 'arch' ? 13 : 7;
  if (spec.hole) top = Math.max(top, HOLE_Y_MM + HOLE_R_MM + 5);
  const bottom = spec.top === 'tail' ? tailDepth(s.wMm) + 6 : 7;
  return { x: side * U, y: top * U, w: (s.wMm - side * 2) * U, h: (s.hMm - top - bottom) * U };
}

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface BMFont { id: string; name: string; family: string; weight: number }
export const BM_FONTS: BMFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
export const bmFont = (id: string) => BM_FONTS.find((f) => f.id === id) || BM_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
const QUOTE = 'Cormorant Garamond';
export const BM_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Prata&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

export function useBMFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-bm-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-bm-fonts'; link.rel = 'stylesheet';
        link.href = BM_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...BM_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `400 40px "${SCRIPT}"`, `italic 500 40px "${QUOTE}"`, `600 40px "${QUOTE}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 “”')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface BMPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; panel: string }
export const BM_PALETTES: BMPalette[] = [
  { id: 'cream', name: 'Kem cổ điển', bg: '#F5EFE4', ink: '#2D2620', sub: '#7B6E60', accent: '#A9773E', panel: '#E8DCC7' },
  { id: 'sage', name: 'Xanh xô thơm', bg: '#E6ECE1', ink: '#2E3D2C', sub: '#5F6F5A', accent: '#6F8A5E', panel: '#D3DDCB' },
  { id: 'navy', name: 'Navy ánh kim', bg: '#17243D', ink: '#F2EBDD', sub: '#A9B4C8', accent: '#D6B25E', panel: '#22335A' },
  { id: 'blush', name: 'Hồng phấn', bg: '#F7E6E1', ink: '#5A2E33', sub: '#8A5D60', accent: '#C0717A', panel: '#EED1CB' },
  { id: 'black', name: 'Đen ánh kim', bg: '#151515', ink: '#EFE7D4', sub: '#A3A09A', accent: '#D6B25E', panel: '#232323' },
  { id: 'tet', name: 'Đỏ Tết', bg: '#B3181E', ink: '#FFF4DC', sub: '#F7D9A8', accent: '#F2C14E', panel: '#8E1016' },
  { id: 'sky', name: 'Xanh trời', bg: '#E3F0FA', ink: '#1E3A5F', sub: '#4C6A8A', accent: '#E2763A', panel: '#C7DFF2' },
  { id: 'white', name: 'Trắng tối giản', bg: '#FFFFFF', ink: '#1C1C1C', sub: '#6B6B6B', accent: '#9C7A3C', panel: '#F1EEE8' },
  { id: 'forest', name: 'Xanh rừng', bg: '#20382C', ink: '#F1EBDD', sub: '#B7C4B4', accent: '#D9B46A', panel: '#2C4A3B' },
];
export const bmPalette = (id: string) => BM_PALETTES.find((p) => p.id === id) || BM_PALETTES[0];

// ---------- bố cục + mẫu ----------
export const BM_LAYOUTS: { id: string; name: string }[] = [
  { id: 'quote', name: 'Nhà sách · cà phê sách' },
  { id: 'book', name: 'Ra mắt sách' },
  { id: 'school', name: 'Trường học · thư viện' },
  { id: 'wedding', name: 'Quà cưới' },
  { id: 'tet', name: 'Tết' },
  { id: 'botanical', name: 'Lá cây tối giản' },
  { id: 'literary', name: 'Thơ văn Việt' },
];
export interface BMTemplate { id: string; name: string; spec: Omit<BMSpec, 'size' | 'hole' | 'tassel'> & { tassel: string }; sample?: Record<string, string> }
const T = (id: string, name: string, layout: string, palette: string, font: string, top: BMTop, material: BMMaterial, tassel: string, sample?: Record<string, string>): BMTemplate =>
  ({ id, name, spec: { layout, palette, font, top, material, tassel }, sample });
export const BM_TEMPLATES: BMTemplate[] = [
  T('sach-kem', 'Nhà sách · kem', 'quote', 'cream', 'playfair', 'round', 'matte', 'red'),
  T('cafe-sach-den', 'Cà phê sách · đen ánh kim', 'quote', 'black', 'cormorant', 'arch', 'foil', 'gold', { brand: 'THU HÀ BOOK CAFÉ', slogan: 'Cà phê ngon · sách hay', quote: 'Có công mài sắt, có ngày nên kim.', author: 'Tục ngữ Việt Nam', website: 'thuhabookcafe.vn' }),
  T('ra-mat-navy', 'Ra mắt sách · navy', 'book', 'navy', 'playfair', 'round', 'foil', 'gold'),
  T('ra-mat-xanh', 'Ra mắt sách · xanh trời', 'book', 'sky', 'montserrat', 'tail', 'matte', 'navy', { title: 'Chuyến Tàu Mùa Hạ', subtitle: 'Truyện dài thiếu nhi', author: 'Gia Khánh' }),
  T('thu-vien', 'Thư viện · xô thơm', 'school', 'sage', 'prata', 'round', 'matte', 'green'),
  T('hoc-sinh', 'Học sinh · xanh trời', 'school', 'sky', 'montserrat', 'arch', 'matte', 'navy', { brand: 'TRƯỜNG TIỂU HỌC GIA KHÁNH', quote: 'Đi một ngày đàng, học một sàng khôn.' }),
  T('cuoi-hong', 'Quà cưới · hồng ép kim', 'wedding', 'blush', 'cormorant', 'arch', 'foil', 'pink'),
  T('cuoi-trang', 'Quà cưới · trắng', 'wedding', 'white', 'playfair', 'tail', 'matte', 'cream'),
  T('tet-do', 'Tết · đỏ ép kim', 'tet', 'tet', 'playfair', 'round', 'foil', 'gold'),
  T('la-xanh', 'Lá cây · xô thơm', 'botanical', 'sage', 'cormorant', 'tail', 'matte', 'cream'),
  T('kieu-kem', 'Truyện Kiều · kem ép kim', 'literary', 'cream', 'prata', 'arch', 'foil', 'red'),
  T('van-hoc-rung', 'Thơ văn · xanh rừng', 'literary', 'forest', 'cormorant', 'round', 'foil', 'gold', { quote: 'Ngày xuân con én đưa thoi,\nThiều quang chín chục đã ngoài sáu mươi.', author: 'Nguyễn Du', work: 'Truyện Kiều' }),
];

// ---------- nội dung ----------
export type BMData = Record<string, string>;
export interface BMField { key: string; label: string; layouts: string[]; side: 'front' | 'back'; multiline?: boolean; half?: boolean }
const ALL = BM_LAYOUTS.map((l) => l.id);
export const BM_FIELDS: BMField[] = [
  { key: 'quote', label: 'Câu trích dẫn (xuống dòng = ngắt câu thơ)', layouts: ['quote', 'school', 'botanical', 'literary'], side: 'front', multiline: true },
  { key: 'author', label: 'Tác giả câu trích / tác giả sách', layouts: ['quote', 'school', 'botanical', 'literary', 'book'], side: 'front', half: true },
  { key: 'work', label: 'Tác phẩm', layouts: ['literary', 'botanical'], side: 'front', half: true },
  { key: 'title', label: 'Tên sách / dòng tiêu đề', layouts: ['book', 'tet'], side: 'front', half: true },
  { key: 'subtitle', label: 'Thể loại / dòng phụ', layouts: ['book', 'tet'], side: 'front', half: true },
  { key: 'date', label: 'Ngày (ra mắt / cưới / năm)', layouts: ['book', 'wedding', 'tet'], side: 'front', half: true },
  { key: 'name1', label: 'Tên chú rể', layouts: ['wedding'], side: 'front', half: true },
  { key: 'name2', label: 'Tên cô dâu', layouts: ['wedding'], side: 'front', half: true },
  { key: 'brand', label: 'Tên nhà sách / quán / trường / NXB / người tặng', layouts: ALL, side: 'back' },
  { key: 'slogan', label: 'Slogan / lời chúc ngắn', layouts: ['quote', 'botanical', 'literary', 'tet'], side: 'back', half: true },
  { key: 'message', label: 'Lời nhắn / giới thiệu sách', layouts: ['book', 'wedding', 'tet'], side: 'back', multiline: true },
  { key: 'address', label: 'Địa chỉ', layouts: ['quote'], side: 'back' },
  { key: 'hours', label: 'Giờ mở cửa', layouts: ['quote'], side: 'back', half: true },
  { key: 'phone', label: 'Điện thoại', layouts: ['quote', 'book'], side: 'back', half: true },
  { key: 'price', label: 'Giá bìa', layouts: ['book'], side: 'back', half: true },
  { key: 'website', label: 'Website / fanpage (tạo mã QR)', layouts: ['quote', 'book', 'botanical', 'literary', 'tet'], side: 'back', half: true },
];
const BASE: BMData = {
  brand: 'NHÀ SÁCH AN KHANG', slogan: 'Mỗi ngày một trang sách hay', address: '45 Lê Lợi, Q.1, TP.HCM', hours: '8:00 – 21:30 mỗi ngày',
  phone: '0909 246 135', website: 'ankhangbooks.vn', quote: 'Đi một ngày đàng, học một sàng khôn.', author: 'Tục ngữ Việt Nam', work: '',
  title: '', subtitle: '', date: '', name1: '', name2: '', message: '', price: '',
};
export const BM_SAMPLES: Record<string, BMData> = {
  quote: { ...BASE },
  book: {
    ...BASE, brand: 'NXB AN KHANG', title: 'Mùa Gió Chướng', subtitle: 'Tiểu thuyết', author: 'Quốc Bảo', date: 'Ra mắt 12.2026', price: '128.000đ',
    message: 'Một câu chuyện về miền Tây sông nước, nơi những con người bình dị vẫn giữ lửa yêu thương qua bao mùa gió chướng.',
    website: 'ankhangbooks.vn/mua-gio-chuong',
  },
  school: { ...BASE, brand: 'THƯ VIỆN TRƯỜNG THCS AN KHANG', quote: 'Học thầy không tày học bạn.', author: 'Tục ngữ Việt Nam' },
  wedding: {
    ...BASE, brand: 'Quốc Bảo & Thu Hà', name1: 'Quốc Bảo', name2: 'Thu Hà', date: '20 · 12 · 2026',
    message: 'Cảm ơn bạn đã đến chung vui trong ngày trọng đại của chúng mình. Mong bạn giữ chiếc bookmark nhỏ này làm kỷ niệm.',
  },
  tet: {
    ...BASE, title: 'Xuân Đinh Mùi', date: '2027', subtitle: 'An khang · Thịnh vượng', slogan: 'Vạn sự như ý',
    message: 'Kính chúc Quý khách năm mới an khang, vạn sự như ý và thêm thật nhiều trang sách hay.',
  },
  botanical: {
    ...BASE, brand: 'THU HÀ BOOK CAFÉ', slogan: 'Đọc chậm · sống xanh', website: 'instagram.com/thuha.bookcafe',
    quote: 'Cỏ non xanh tận chân trời,\nCành lê trắng điểm một vài bông hoa.', author: 'Nguyễn Du', work: 'Truyện Kiều',
  },
  literary: {
    ...BASE, quote: 'Trăm năm trong cõi người ta,\nChữ tài chữ mệnh khéo là ghét nhau.', author: 'Nguyễn Du', work: 'Truyện Kiều',
    slogan: 'Giữ trang sách, giữ hồn thơ',
  },
};
export const sampleFor = (t: BMTemplate): BMData => ({ ...(BM_SAMPLES[t.spec.layout] || BM_SAMPLES.quote), ...(t.sample || {}) } as BMData);

// ---------- đo + xếp chữ ----------
interface TS { fam: string; wt: number; ls?: number; it?: boolean }
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, [...s].length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.58 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.58 + ls;
  mctx.font = `${ts.it ? 'italic ' : ''}${ts.wt} ${size}px "${ts.fam}"`;
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
/** cân dòng: tránh 1 chữ mồ côi ở dòng cuối (co bề rộng tới khi số dòng sắp đổi) */
function balanced(text: string, maxW: number, size: number, ts: TS): string[] {
  // cân từng đoạn (câu thơ xuống dòng = 1 đoạn) → câu lục bát gãy 2 nửa đều nhau
  return (text || '').split('\n').flatMap((para) => {
    const base = wrapLines(para, maxW, size, ts);
    if (base.length < 2) return base;
    let best = base;
    for (let k = 0.98; k >= 0.5; k -= 0.03) {
      const l = wrapLines(para, maxW * k, size, ts);
      if (l.length !== base.length) break;
      best = l;
    }
    return best;
  });
}
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number, minSize: number) {
  let s = size, lines = balanced(text, maxW, s, ts);
  while (lines.length > maxLines && s > minSize) { s = Math.max(minSize, s * 0.94); lines = balanced(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  const widest = Math.max(1, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
const initials = (brand: string) => {
  const skip = new Set(['nhà', 'sách', 'trường', 'thư', 'viện', 'nxb', 'quán', 'cà', 'phê', 'thcs', 'thpt', 'tiểu', 'học', 'công', 'ty', 'tnhh', 'book', 'café', 'cafe']);
  const w = (brand || 'AK').replace(/[&·]/g, ' ').trim().split(/\s+/).filter(Boolean);
  const main = w.filter((x) => !skip.has(x.toLowerCase()));
  const pick = main.length ? main : w;
  return (pick.length >= 2 ? pick[0][0] + pick[1][0] : (pick[0] || 'AK').slice(0, 2)).toUpperCase();
};

// ---------- vẽ 1 mặt ----------
export type BMLayer = 'screen' | 'print' | 'foil';
export interface BMFaceProps { spec: BMSpec; data: BMData; side: 'front' | 'back'; logo?: string; photo?: string; layer?: BMLayer; bleed?: boolean; style?: CSSProperties; uid?: string }

interface Ctx {
  P: BMPalette; W: number; H: number; box: { x: number; y: number; w: number; h: number }; cx: number;
  disp: TS; body: TS; bodyB: TS; quote: TS; script: TS;
  ink: (c: string) => string;      // màu in thường (lớp ép kim → bỏ)
  ko: (c: string) => string;       // chữ/nét nằm TRÊN mảng ép kim: lớp ép kim → đen (đục khỏi khuôn)
  gold: string;                    // màu phần ép kim / nhấn
  goldOn: boolean;                 // có vẽ phần ép kim không
  uid: string; layer: BMLayer; foilMat: boolean; logo?: string; photo?: string;
}

function makeCtx(p: BMFaceProps, uid: string): Ctx {
  const sz = bmSize(p.spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const P = bmPalette(p.spec.palette);
  const f = bmFont(p.spec.font);
  const layer = p.layer || 'screen';
  const foilMat = p.spec.material === 'foil';
  const box = safeBox(p.spec);
  const ink = (c: string) => (layer === 'foil' ? 'none' : c);
  const gold = !foilMat ? (layer === 'foil' ? 'none' : P.accent) : layer === 'foil' ? '#FFFFFF' : layer === 'print' ? 'none' : `url(#${uid}-gold)`;
  return {
    P, W, H, box, cx: W / 2, uid, layer, foilMat, logo: p.logo, photo: p.photo,
    disp: { fam: f.family, wt: f.weight }, body: { fam: BODY, wt: 600 }, bodyB: { fam: BODY, wt: 800 },
    quote: { fam: QUOTE, wt: 500, it: true }, script: { fam: SCRIPT, wt: 400 },
    ink, ko: (col: string) => (layer === 'foil' ? '#000000' : col), gold, goldOn: gold !== 'none',
  };
}

type Anchor = 'start' | 'middle' | 'end';
function Txt({ x, y, size, ts, fill, anchor = 'middle', children, opacity }: { x: number; y: number; size: number; ts: TS; fill: string; anchor?: Anchor; children: string; opacity?: number }) {
  if (fill === 'none') return null;
  return <text x={f1(x)} y={f1(y)} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontStyle={ts.it ? 'italic' : undefined} fontSize={f1(size)} fill={fill} textAnchor={anchor} letterSpacing={ts.ls ? f1(ts.ls) : undefined} opacity={opacity}>{children}</text>;
}
/** khối chữ nhiều dòng, y = đỉnh khối → [node, cao] */
function block(text: string, o: { x: number; y: number; maxW: number; size: number; ts: TS; fill: string; maxLines?: number; lh?: number; anchor?: Anchor; upper?: boolean; min?: number }): [ReactNode, number] {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return [null, 0];
  const { lines, size } = fitBlock(t, o.maxW, o.size, o.ts, o.maxLines ?? 2, o.min ?? o.size * 0.45);
  const lh = size * (o.lh ?? 1.18);
  const node = <g>{lines.map((l, i) => <Txt key={i} x={o.x} y={o.y + size * 0.82 + i * lh} size={size} ts={o.ts} fill={o.fill} anchor={o.anchor}>{l}</Txt>)}</g>;
  return [node, size * 0.82 + (lines.length - 1) * lh + size * 0.3];
}
/** xếp chồng các khối theo chiều dọc, canh giữa trong [y0, y1] */
function stackV(items: { h: number; draw: (y: number) => ReactNode; gap?: number }[], y0: number, y1: number, align: 'center' | 'top' | 'bottom' = 'center'): ReactNode {
  const live = items.filter((i) => i.h > 0);
  const total = live.reduce((a, i, k) => a + i.h + (k ? i.gap ?? 0 : 0), 0);
  let y = align === 'top' ? y0 : align === 'bottom' ? y1 - total : y0 + Math.max(0, (y1 - y0 - total) / 2);
  return live.map((it, k) => { if (k) y += it.gap ?? 0; const n = <g key={k}>{it.draw(y)}</g>; y += it.h; return n; });
}
/** đo trước 1 khối (để xếp) */
function measure(text: string, o: { maxW: number; size: number; ts: TS; maxLines?: number; lh?: number; upper?: boolean; min?: number }) {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return 0;
  const { lines, size } = fitBlock(t, o.maxW, o.size, o.ts, o.maxLines ?? 2, o.min ?? o.size * 0.45);
  return size * 0.82 + (lines.length - 1) * size * (o.lh ?? 1.18) + size * 0.3;
}

/** cỡ chữ lớn nhất (≤ maxSize) để khối vừa chiều cao maxH, không quá maxLines, không tràn ngang */
function fitH(text: string, o: { maxW: number; ts: TS; maxLines: number; lh?: number; upper?: boolean }, maxSize: number, minSize: number, maxH: number): number {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return minSize;
  const ok = (sz: number) => {
    const lines = balanced(t, o.maxW, sz, o.ts);
    if (lines.length > o.maxLines) return false;
    if (Math.max(...lines.map((l) => textW(l, sz, o.ts))) > o.maxW) return false;
    return sz * 0.82 + (lines.length - 1) * sz * (o.lh ?? 1.18) + sz * 0.3 <= maxH;
  };
  if (ok(maxSize)) return maxSize;
  let lo = minSize, hi = maxSize;
  for (let i = 0; i < 14; i++) { const mid = (lo + hi) / 2; if (ok(mid)) lo = mid; else hi = mid; }
  return lo;
}

type MsgOpt = { maxW: number; size: number; ts: TS; maxLines: number; lh: number; min: number };
type MsgRef = { o: MsgOpt; item: { h: number; gap?: number; draw: (y: number) => ReactNode }; max: number };

// ---------- hoạ tiết vẽ code ----------
function Mark({ c, cx, cy, r, brand, filled }: { c: Ctx; cx: number; cy: number; r: number; brand: string; filled?: boolean }) {
  if (c.logo && c.layer !== 'foil') return <image href={c.logo} x={f1(cx - r)} y={f1(cy - r)} width={f1(r * 2)} height={f1(r * 2)} preserveAspectRatio="xMidYMid meet" />;
  if (c.logo) return null;
  const ini = initials(brand);
  const s = fitSize(ini, r * 1.2, r * 0.9, c.disp);
  return (
    <g>
      {filled ? <circle cx={f1(cx)} cy={f1(cy)} r={f1(r)} fill={c.gold} /> : c.goldOn && <circle cx={f1(cx)} cy={f1(cy)} r={f1(r - 2)} fill="none" stroke={c.gold} strokeWidth={3} />}
      {c.goldOn && !filled && <circle cx={f1(cx)} cy={f1(cy)} r={f1(r - 8)} fill="none" stroke={c.gold} strokeWidth={1.2} />}
      <Txt x={cx} y={cy + s * 0.35} size={s} ts={c.disp} fill={filled ? c.ko(c.P.bg) : c.gold}>{ini}</Txt>
    </g>
  );
}
function Divider({ c, cx, y, w }: { c: Ctx; cx: number; y: number; w: number }) {
  if (!c.goldOn) return null;
  return (
    <g>
      <path d={`M${f1(cx - w / 2)} ${f1(y)}H${f1(cx - 9)}M${f1(cx + 9)} ${f1(y)}H${f1(cx + w / 2)}`} stroke={c.gold} strokeWidth={2} />
      <path d={`M${f1(cx)} ${f1(y - 6)}L${f1(cx + 6)} ${f1(y)}L${f1(cx)} ${f1(y + 6)}L${f1(cx - 6)} ${f1(y)}Z`} fill={c.gold} />
    </g>
  );
}
function QuoteMark({ c, cx, y, s }: { c: Ctx; cx: number; y: number; s: number }) {
  // 2 dấu phẩy ngược tròn (vẽ path, không phụ thuộc glyph)
  const one = (x: number) => `M${f1(x + s * 0.18)} ${f1(y + s * 0.62)}a${f1(s * 0.2)} ${f1(s * 0.2)} 0 1 1 0.1 0Z M${f1(x + s * 0.02)} ${f1(y + s * 0.6)}C${f1(x - s * 0.02)} ${f1(y + s * 0.25)} ${f1(x + s * 0.12)} ${f1(y + s * 0.06)} ${f1(x + s * 0.32)} ${f1(y)}L${f1(x + s * 0.34)} ${f1(y + s * 0.06)}C${f1(x + s * 0.2)} ${f1(y + s * 0.14)} ${f1(x + s * 0.12)} ${f1(y + s * 0.3)} ${f1(x + s * 0.14)} ${f1(y + s * 0.46)}Z`;
  if (!c.goldOn) return null;
  return <path d={one(cx - s * 0.42) + one(cx + s * 0.06)} fill={c.gold} />;
}
/** cành lá mảnh (line-art) dọc */
function Sprig({ c, x, y, len, s = 1, color }: { c: Ctx; x: number; y: number; len: number; s?: number; color: string }) {
  if (color === 'none') return null;
  const leaves: ReactNode[] = [];
  const n = Math.max(5, Math.round(len / (60 * s)));
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6) / n, yy = y + t * len, xx = x + Math.sin(t * 3.2) * 18 * s;
    const side = i % 2 ? 1 : -1, L = (54 - t * 18) * s, a = side * (38 + t * 10);
    leaves.push(<ellipse key={i} cx={f1(xx + side * L * 0.42)} cy={f1(yy - L * 0.18)} rx={f1(L * 0.5)} ry={f1(L * 0.17)} transform={`rotate(${f1(-a)} ${f1(xx + side * L * 0.42)} ${f1(yy - L * 0.18)})`} fill="none" stroke={color} strokeWidth={f1(2.2 * s)} />);
  }
  let d = `M${f1(x)} ${f1(y)}`;
  for (let i = 1; i <= 24; i++) { const t = i / 24; d += `L${f1(x + Math.sin(t * 3.2) * 18 * s)} ${f1(y + t * len)}`; }
  return <g data-deco="sprig"><path d={d} fill="none" stroke={color} strokeWidth={f1(2.6 * s)} strokeLinecap="round" />{leaves}</g>;
}
function Flower({ cx, cy, r, fill, center }: { cx: number; cy: number; r: number; fill: string; center: string }) {
  if (fill === 'none') return null;
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={f1(cx)} cy={f1(cy - r * 0.55)} rx={f1(r * 0.42)} ry={f1(r * 0.55)} transform={`rotate(${a} ${f1(cx)} ${f1(cy)})`} fill={fill} />)}
      <circle cx={f1(cx)} cy={f1(cy)} r={f1(r * 0.28)} fill={center} />
    </g>
  );
}
/** cành mai ngang ở đỉnh (Tết) */
function MaiBranch({ c, x0, x1, y, s }: { c: Ctx; x0: number; x1: number; y: number; s: number }) {
  const branch = c.ink('#5A2A12');
  const pts = [0.08, 0.3, 0.52, 0.74, 0.92];
  return (
    <g data-deco="mai">
      {branch !== 'none' && <path d={`M${f1(x0)} ${f1(y + 30 * s)}C${f1(x0 + (x1 - x0) * 0.3)} ${f1(y - 10 * s)} ${f1(x0 + (x1 - x0) * 0.6)} ${f1(y + 40 * s)} ${f1(x1)} ${f1(y + 6 * s)}`} fill="none" stroke={branch} strokeWidth={f1(5 * s)} strokeLinecap="round" />}
      {pts.map((t, i) => {
        const x = x0 + (x1 - x0) * t, yy = y + (i % 2 ? 4 : 22) * s;
        return <Flower key={i} cx={x} cy={yy} r={(i % 2 ? 15 : 19) * s} fill={c.ink('#F6C42F')} center={c.ink('#C2410C')} />;
      })}
    </g>
  );
}
function Qr({ c, x, y, size, text }: { c: Ctx; x: number; y: number; size: number; text: string }) {
  if (!text.trim() || c.layer === 'foil') return null;
  const q = qrPath(text);
  const k = size / (q.n + 2);
  return (
    <g data-qr="1">
      <rect x={f1(x)} y={f1(y)} width={f1(size)} height={f1(size)} rx={f1(size * 0.05)} fill="#FFFFFF" />
      <path d={q.d} transform={`translate(${f1(x + k)} ${f1(y + k)}) scale(${(k).toFixed(4)})`} fill="#111111" />
    </g>
  );
}
/** ảnh khách (cover) trong khung, hoặc tranh vẽ code */
function PhotoOrArt({ c, x, y, w, h, kind, clipId }: { c: Ctx; x: number; y: number; w: number; h: number; kind: 'landscape' | 'rings'; clipId: string }) {
  if (c.layer === 'foil') return null;
  if (c.photo) {
    return (
      <g>
        <defs><clipPath id={clipId}><rect x={f1(x)} y={f1(y)} width={f1(w)} height={f1(h)} rx={kind === 'rings' ? f1(w / 2) : 0} /></clipPath></defs>
        <image href={c.photo} x={f1(x)} y={f1(y)} width={f1(w)} height={f1(h)} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clipId})`} data-photo="1" />
      </g>
    );
  }
  const P = c.P;
  if (kind === 'rings') {
    const r = Math.min(w, h) * 0.22, cx = x + w / 2, cy = y + h / 2;
    return (
      <g>
        <circle cx={f1(cx)} cy={f1(cy)} r={f1(Math.min(w, h) / 2)} fill={P.panel} />
        <circle cx={f1(cx - r * 0.55)} cy={f1(cy)} r={f1(r)} fill="none" stroke={P.accent} strokeWidth={f1(r * 0.16)} />
        <circle cx={f1(cx + r * 0.55)} cy={f1(cy)} r={f1(r)} fill="none" stroke={P.accent} strokeWidth={f1(r * 0.16)} />
      </g>
    );
  }
  // phong cảnh (bìa sách): trời chuyển màu, mặt trời, núi xa–gần xếp lớp, đàn chim
  const hill = (base: number, amp: number, ph: number) => {
    let d = `M${f1(x)} ${f1(y + h)}`;
    for (let i = 0; i <= 24; i++) { const t = i / 24; d += `L${f1(x + t * w)} ${f1(y + h * (base - amp * (0.55 * Math.sin(t * 5.1 + ph) + 0.45 * Math.sin(t * 2.3 + ph * 2))))}`; }
    return d + `L${f1(x + w)} ${f1(y + h)}Z`;
  };
  const bird = (bx: number, by: number, s: number) => `M${f1(bx - s)} ${f1(by)}Q${f1(bx - s * 0.5)} ${f1(by - s * 0.55)} ${f1(bx)} ${f1(by)}Q${f1(bx + s * 0.5)} ${f1(by - s * 0.55)} ${f1(bx + s)} ${f1(by)}`;
  return (
    <g>
      <defs>
        <clipPath id={clipId}><rect x={f1(x)} y={f1(y)} width={f1(w)} height={f1(h)} /></clipPath>
        <linearGradient id={`${clipId}-sky`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={P.panel} /><stop offset="0.75" stopColor={P.accent} stopOpacity={0.55} /><stop offset="1" stopColor={P.accent} stopOpacity={0.85} /></linearGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={f1(x)} y={f1(y)} width={f1(w)} height={f1(h)} fill={P.panel} />
        <rect x={f1(x)} y={f1(y)} width={f1(w)} height={f1(h)} fill={`url(#${clipId}-sky)`} />
        <circle cx={f1(x + w * 0.64)} cy={f1(y + h * 0.42)} r={f1(w * 0.15)} fill={P.accent} />
        <circle cx={f1(x + w * 0.64)} cy={f1(y + h * 0.42)} r={f1(w * 0.22)} fill={P.accent} opacity={0.25} />
        <path d={hill(0.62, 0.12, 0.4)} fill={P.ink} opacity={0.22} />
        <path d={hill(0.74, 0.1, 1.7)} fill={P.ink} opacity={0.4} />
        <path d={hill(0.88, 0.07, 2.9)} fill={P.ink} opacity={0.7} />
        <g fill="none" stroke={P.ink} strokeWidth={f1(w * 0.012)} strokeLinecap="round" opacity={0.7}>
          <path d={bird(x + w * 0.26, y + h * 0.26, w * 0.05)} /><path d={bird(x + w * 0.36, y + h * 0.2, w * 0.035)} /><path d={bird(x + w * 0.18, y + h * 0.34, w * 0.03)} />
        </g>
      </g>
    </g>
  );
}
/** khung viền vàng 2 nét, ôm theo hình bế */
function Frame({ c, spec }: { c: Ctx; spec: BMSpec }) {
  if (!c.goldOn) return null;
  return (
    <g data-deco="frame">
      <path d={shapePath(spec, 2.4)} fill="none" stroke={c.gold} strokeWidth={3} />
      <path d={shapePath(spec, 3.6)} fill="none" stroke={c.gold} strokeWidth={1.2} />
    </g>
  );
}

function faceArt(p: BMFaceProps, uid: string): ReactNode {
  const c = makeCtx(p, uid);
  const { P, box, cx, W, H } = c;
  const { spec, data, side } = p;
  const bleedR = BM_BLEED_MM * U + 4;
  const out: ReactNode[] = [];
  const bgFill = c.layer === 'foil' ? '#000000' : P.bg;
  out.push(<rect key="bg" x={-bleedR} y={-bleedR} width={W + bleedR * 2} height={H + bleedR * 2} fill={bgFill} />);
  const bw = box.w, top = box.y, bot = box.y + box.h;
  const L = spec.layout;
  const fs = (k: number) => bw * k; // cỡ chữ theo bề ngang vùng an toàn

  if (side === 'front') {
    if (L === 'quote' || L === 'literary' || L === 'school' || L === 'botanical') {
      const verse = L === 'literary' || (data.quote || '').includes('\n');
      if (L === 'literary') out.push(<Frame key="fr" c={c} spec={spec} />);
      if (L === 'botanical') out.push(<Sprig key="sp" c={c} x={cx} y={top + 4} len={box.h * 0.44} s={bw / 400} color={c.ink(P.accent)} />);
      const qMax = L === 'botanical' ? 7 : 10;
      const q = { maxW: bw * 0.98, size: fs(0.1), ts: c.quote, maxLines: qMax, lh: 1.22, min: 26 };
      const markH = L === 'quote' ? fs(0.22) : 0;
      const schoolCrest = L === 'school' ? fs(0.42) : 0;
      const brandFront = L === 'school' ? { maxW: bw, size: fs(0.1), ts: { ...c.disp, ls: 1.5 }, maxLines: 4, upper: true, min: 22 } : null;
      const authorO = { maxW: bw, size: fs(0.07), ts: { ...c.body, ls: 1 }, maxLines: 2, min: 18 };
      const workO = { maxW: bw, size: fs(0.062), ts: { ...c.quote }, maxLines: 1, min: 18 };
      const authorTxt = data.author ? `— ${data.author}` : '';
      const items: { h: number; draw: (y: number) => ReactNode; gap?: number }[] = [];
      if (schoolCrest) items.push({ h: schoolCrest, draw: (y) => <Crest c={c} cx={cx} y={y} s={schoolCrest} brand={data.brand} /> });
      if (brandFront) items.push({ h: measure(data.brand, brandFront), gap: fs(0.06), draw: (y) => block(data.brand, { ...brandFront, x: cx, y, fill: c.ink(P.ink) })[0] });
      if (L === 'school') items.push({ h: fs(0.08), gap: fs(0.04), draw: (y) => <Divider c={c} cx={cx} y={y + fs(0.04)} w={bw * 0.7} /> });
      if (markH) items.push({ h: markH, draw: (y) => <QuoteMark c={c} cx={cx} y={y} s={markH} /> });
      if (L === 'literary') items.push({ h: fs(0.12), draw: (y) => <Flower cx={cx} cy={y + fs(0.06)} r={fs(0.06)} fill={c.gold} center={c.ko(P.bg)} /> });
      const qItem = { h: 0, gap: fs(0.06), draw: (y: number) => block(data.quote, { ...q, x: cx, y, fill: c.ink(P.ink) })[0] };
      items.push(qItem);
      if (L !== 'school') items.push({ h: fs(0.08), gap: fs(0.05), draw: (y) => <Divider c={c} cx={cx} y={y + fs(0.04)} w={bw * 0.55} /> });
      items.push({ h: measure(authorTxt, authorO), gap: fs(0.04), draw: (y) => block(authorTxt, { ...authorO, x: cx, y, fill: c.ink(P.sub) })[0] });
      if (data.work && (L === 'literary' || L === 'botanical')) items.push({ h: measure(data.work, workO), gap: fs(0.01), draw: (y) => block(data.work, { ...workO, x: cx, y, fill: c.ink(P.sub) })[0] });
      const y0 = L === 'botanical' ? top + box.h * 0.5 : top;
      const brandBottom = L === 'quote' || L === 'literary' || L === 'botanical';
      const bb = { maxW: bw, size: fs(0.085), ts: { ...c.disp, ls: 2 }, maxLines: 2, upper: true, min: 18 };
      const bh = brandBottom ? measure(data.brand, bb) : 0;
      const y1 = bot - (bh ? bh + fs(0.12) : 0);
      // câu trích to nhất có thể trong phần còn trống (chừa khoảng thở)
      const others = items.reduce((a, it, k) => a + (it === qItem ? 0 : it.h) + (k ? it.gap ?? 0 : 0), 0);
      const room = (y1 - y0 - others) * (L === 'school' ? 0.92 : 0.8);
      q.size = fitH(data.quote, q, fs(verse ? 0.115 : L === 'school' ? 0.13 : 0.18), 26, room);
      q.min = q.size;
      qItem.h = measure(data.quote, q);
      out.push(<g key="st">{stackV(items, y0, y1)}</g>);
      if (brandBottom && bh) out.push(<g key="br">{block(data.brand, { ...bb, x: cx, y: bot - bh, fill: L === 'literary' ? c.gold : c.ink(P.ink) })[0]}</g>);
    } else if (L === 'book') {
      // bìa sách mini: ảnh/tranh trên + tên sách + tác giả + ngày ra mắt
      const coverH = box.h * 0.46;
      out.push(<rect key="pn" x={-bleedR} y={-bleedR} width={W + bleedR * 2} height={H + bleedR * 2} fill={c.ink(P.panel)} />);
      out.push(<PhotoOrArt key="ph" c={c} x={box.x} y={top} w={bw} h={coverH} kind="landscape" clipId={`${uid}-cv`} />);
      if (c.goldOn) out.push(<rect key="phf" x={f1(box.x)} y={f1(top)} width={f1(bw)} height={f1(coverH)} fill="none" stroke={c.gold} strokeWidth={2} />);
      const t = { maxW: bw, size: fs(0.17), ts: c.disp, maxLines: 3, lh: 1.08, min: 24 };
      const su = { maxW: bw, size: fs(0.07), ts: { ...c.body, ls: 2 }, maxLines: 1, upper: true, min: 16 };
      const au = { maxW: bw, size: fs(0.1), ts: c.quote, maxLines: 2, min: 18 };
      const dt = { maxW: bw * 0.9, size: fs(0.068), ts: { ...c.bodyB, ls: 1.5 }, maxLines: 1, upper: true, min: 16 };
      const items = [
        { h: measure(data.subtitle, su), draw: (y: number) => block(data.subtitle, { ...su, x: cx, y, fill: c.gold })[0] },
        { h: measure(data.title, t), gap: fs(0.03), draw: (y: number) => block(data.title, { ...t, x: cx, y, fill: c.ink(P.ink) })[0] },
        { h: fs(0.08), gap: fs(0.03), draw: (y: number) => <Divider c={c} cx={cx} y={y + fs(0.04)} w={bw * 0.5} /> },
        { h: measure(data.author, au), gap: fs(0.02), draw: (y: number) => block(data.author, { ...au, x: cx, y, fill: c.ink(P.ink) })[0] },
      ];
      const dh = measure(data.date, dt);
      out.push(<g key="st">{stackV(items, top + coverH + fs(0.08), bot - dh - fs(0.1))}</g>);
      if (dh) {
        const pw = Math.min(bw, textW((data.date || '').toUpperCase(), fitBlock((data.date || '').toUpperCase(), dt.maxW, dt.size, dt.ts, 1, 16).size, dt.ts) + fs(0.14));
        if (c.goldOn) out.push(<rect key="dp" x={f1(cx - pw / 2)} y={f1(bot - dh - fs(0.02))} width={f1(pw)} height={f1(dh + fs(0.04))} rx={f1((dh + fs(0.04)) / 2)} fill={c.gold} />);
        out.push(<g key="dt">{block(data.date, { ...dt, x: cx, y: bot - dh, fill: c.goldOn ? c.ko(P.panel) : c.ink(P.ink) })[0]}</g>);
      }
    } else if (L === 'wedding') {
      const ph = Math.min(bw * 0.86, box.h * 0.36);
      out.push(<Sprig key="s1" c={c} x={box.x + bw * 0.12} y={top - fs(0.02)} len={ph * 0.9} s={bw / 520} color={c.gold} />);
      out.push(<Sprig key="s2" c={c} x={box.x + bw * 0.88} y={top - fs(0.02)} len={ph * 0.9} s={bw / 520} color={c.gold} />);
      out.push(<PhotoOrArt key="ph" c={c} x={cx - ph / 2} y={top + fs(0.04)} w={ph} h={ph} kind="rings" clipId={`${uid}-wp`} />);
      if (c.goldOn) out.push(<circle key="phr" cx={f1(cx)} cy={f1(top + fs(0.04) + ph / 2)} r={f1(ph / 2 + 6)} fill="none" stroke={c.gold} strokeWidth={2.4} />);
      const n = { maxW: bw, size: fs(0.27), ts: c.script, maxLines: 1, min: 28 };
      const amp = fs(0.15);
      const dt = { maxW: bw, size: fs(0.085), ts: { ...c.bodyB, ls: 2 }, maxLines: 1, min: 16 };
      const items = [
        { h: measure(data.name1, n), draw: (y: number) => block(data.name1, { ...n, x: cx, y, fill: c.ink(P.ink) })[0] },
        { h: amp, draw: (y: number) => <Txt x={cx} y={y + amp * 0.8} size={amp} ts={{ fam: QUOTE, wt: 600 }} fill={c.gold}>&amp;</Txt> },
        { h: measure(data.name2, n), draw: (y: number) => block(data.name2, { ...n, x: cx, y, fill: c.ink(P.ink) })[0] },
        { h: fs(0.08), gap: fs(0.05), draw: (y: number) => <Divider c={c} cx={cx} y={y + fs(0.04)} w={bw * 0.6} /> },
        { h: measure(data.date, dt), gap: fs(0.04), draw: (y: number) => block(data.date, { ...dt, x: cx, y, fill: c.ink(P.sub) })[0] },
      ];
      out.push(<g key="st">{stackV(items, top + ph + fs(0.12), bot)}</g>);
    } else if (L === 'tet') {
      out.push(<MaiBranch key="mai" c={c} x0={-30} x1={W + 30} y={top - fs(0.06)} s={bw / 220} />);
      if (c.goldOn) out.push(<rect key="fr" x={f1(box.x - 18)} y={f1(top + fs(0.32))} width={f1(bw + 36)} height={f1(box.h - fs(0.32) + 18)} rx={8} fill="none" stroke={c.gold} strokeWidth={2.2} />);
      const t = { maxW: bw * 0.94, size: fs(0.16), ts: c.disp, maxLines: 2, lh: 1.05, min: 24 };
      const yr = { maxW: bw * 0.96, size: fs(0.36), ts: c.disp, maxLines: 1, min: 40 };
      const wi = { maxW: bw * 0.94, size: fs(0.075), ts: { ...c.bodyB, ls: 1.2 }, maxLines: 3, upper: true, min: 16 };
      const br = { maxW: bw * 0.94, size: fs(0.07), ts: { ...c.body, ls: 1.5 }, maxLines: 2, upper: true, min: 16 };
      const items = [
        { h: measure(data.title, t), draw: (y: number) => block(data.title, { ...t, x: cx, y, fill: c.gold })[0] },
        { h: measure(data.date, yr), gap: fs(0.02), draw: (y: number) => block(data.date, { ...yr, x: cx, y, fill: c.gold })[0] },
        { h: fs(0.08), gap: fs(0.04), draw: (y: number) => <Divider c={c} cx={cx} y={y + fs(0.04)} w={bw * 0.6} /> },
        { h: measure(data.subtitle, wi), gap: fs(0.05), draw: (y: number) => block(data.subtitle, { ...wi, x: cx, y, fill: c.ink(P.ink) })[0] },
      ];
      const bh = measure(data.brand, br);
      out.push(<g key="st">{stackV(items, top + fs(0.42), bot - bh - fs(0.12))}</g>);
      out.push(<g key="br">{block(data.brand, { ...br, x: cx, y: bot - bh, fill: c.ink(P.sub) })[0]}</g>);
    }
  } else {
    // ---------- mặt sau ----------
    if (L === 'school') {
      // thời khoá biểu mini + họ tên, lớp
      const hd = { maxW: bw, size: fs(0.085), ts: { ...c.bodyB, ls: 1.5 }, maxLines: 1, upper: true, min: 16 };
      const hh = measure('Thời khoá biểu', hd);
      out.push(<g key="h">{block('Thời khoá biểu', { ...hd, x: cx, y: top + fs(0.04), fill: c.ink(P.ink) })[0]}</g>);
      const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      const gy = top + fs(0.04) + hh + fs(0.06), rowsH = box.h * 0.62, rh = rowsH / (days.length + 1);
      const c0 = bw * 0.3, c1 = (bw - c0) / 2;
      const line = c.ink(P.sub);
      const cells: ReactNode[] = [];
      cells.push(<rect key="hb" x={f1(box.x)} y={f1(gy)} width={f1(bw)} height={f1(rh)} fill={c.ink(P.panel)} />);
      const cs = Math.min(fs(0.07), rh * 0.42);
      [['Thứ', box.x + c0 / 2], ['Sáng', box.x + c0 + c1 / 2], ['Chiều', box.x + c0 + c1 * 1.5]].forEach(([t, x], i) => cells.push(<Txt key={`th${i}`} x={x as number} y={gy + rh * 0.66} size={cs} ts={c.bodyB} fill={c.ink(P.ink)}>{t as string}</Txt>));
      days.forEach((d, i) => cells.push(<Txt key={`d${i}`} x={box.x + c0 / 2} y={gy + rh * (i + 1) + rh * 0.66} size={cs} ts={c.body} fill={c.ink(P.ink)}>{d}</Txt>));
      for (let i = 0; i <= days.length + 1; i++) cells.push(<line key={`r${i}`} x1={f1(box.x)} x2={f1(box.x + bw)} y1={f1(gy + rh * i)} y2={f1(gy + rh * i)} stroke={line} strokeWidth={1.4} opacity={0.7} />);
      [0, c0, c0 + c1, bw].forEach((x, i) => cells.push(<line key={`c${i}`} x1={f1(box.x + x)} x2={f1(box.x + x)} y1={f1(gy)} y2={f1(gy + rowsH)} stroke={line} strokeWidth={1.4} opacity={0.7} />));
      out.push(<g key="grid" data-grid="1">{cells}</g>);
      const ly = gy + rowsH + fs(0.12);
      const ls = Math.min(fs(0.07), 40);
      ['Họ tên', 'Lớp'].forEach((t, i) => {
        const y = ly + i * ls * 2.4;
        out.push(<Txt key={`l${i}`} x={box.x} y={y + ls} size={ls} ts={c.body} fill={c.ink(P.ink)} anchor="start">{`${t}:`}</Txt>);
        out.push(<line key={`ll${i}`} x1={f1(box.x + textW(`${t}:`, ls, c.body) + 10)} x2={f1(box.x + bw)} y1={f1(y + ls * 1.1)} y2={f1(y + ls * 1.1)} stroke={line} strokeWidth={1.4} strokeDasharray="4 5" />);
      });
      const br = { maxW: bw, size: fs(0.06), ts: { ...c.body, ls: 1 }, maxLines: 2, upper: true, min: 14 };
      const bh = measure(data.brand, br);
      out.push(<g key="br">{block(data.brand, { ...br, x: cx, y: bot - bh, fill: c.ink(P.sub) })[0]}</g>);
    } else {
      // nhãn hiệu + thông tin + QR (tuỳ bố cục)
      const showQr = ['quote', 'book', 'botanical', 'literary', 'tet'].includes(L) && !!(data.website || '').trim();
      const qrS = Math.min(bw * 0.56, box.h * 0.26);
      const markR = fs(0.16);
      const items: { h: number; draw: (y: number) => ReactNode; gap?: number }[] = [];
      // đoạn lời nhắn/giới thiệu: cỡ chữ tự lớn tới khi lấp vừa chỗ trống
      let msg: MsgRef | null = null;
      const msgItem = (o: { maxW: number; size: number; ts: TS; maxLines: number; lh: number; min: number }, fill: string, gap: number, max: number) => {
        const item = { h: 0, gap, draw: (y: number) => block(data.message, { ...o, x: cx, y, fill })[0] };
        msg = { o, item, max }; return item;
      };
      if (L !== 'wedding') items.push({ h: markR * 2, draw: (y) => <Mark c={c} cx={cx} cy={y + markR} r={markR} brand={data.brand} filled={L === 'tet'} /> });
      if (L === 'book') {
        const hd = { maxW: bw, size: fs(0.075), ts: { ...c.bodyB, ls: 1.5 }, maxLines: 1, upper: true, min: 16 };
        const ms = { maxW: bw, size: fs(0.072), ts: c.body, maxLines: 9, lh: 1.32, min: 17 };
        const pr = { maxW: bw, size: fs(0.11), ts: c.disp, maxLines: 1, min: 20 };
        items.push({ h: measure('Giới thiệu', hd), gap: fs(0.06), draw: (y) => block('Giới thiệu', { ...hd, x: cx, y, fill: c.gold })[0] });
        items.push(msgItem(ms, c.ink(P.ink), fs(0.04), fs(0.09)));
        items.push({ h: measure(data.price, pr), gap: fs(0.06), draw: (y) => block(data.price, { ...pr, x: cx, y, fill: c.ink(P.ink) })[0] });
      } else if (L === 'wedding') {
        const th = { maxW: bw, size: fs(0.2), ts: c.script, maxLines: 1, min: 28 };
        const ms = { maxW: bw, size: fs(0.08), ts: c.quote, maxLines: 9, lh: 1.3, min: 18 };
        items.push({ h: fs(0.12), draw: (y) => <Flower cx={cx} cy={y + fs(0.06)} r={fs(0.06)} fill={c.gold} center={c.ko(P.bg)} /> });
        items.push({ h: measure('Thank you', th), gap: fs(0.04), draw: (y) => block('Thank you', { ...th, x: cx, y, fill: c.ink(P.ink) })[0] });
        items.push(msgItem(ms, c.ink(P.sub), fs(0.06), fs(0.11)));
      } else if (L === 'tet') {
        const ms = { maxW: bw, size: fs(0.08), ts: c.quote, maxLines: 8, lh: 1.3, min: 18 };
        items.push(msgItem(ms, c.ink(P.ink), fs(0.08), fs(0.11)));
      }
      const br = { maxW: bw, size: fs(L === 'wedding' ? 0.12 : 0.1), ts: L === 'wedding' ? c.script : { ...c.disp, ls: 1.5 }, maxLines: 3, upper: L !== 'wedding', min: 18 };
      items.push({ h: measure(data.brand, br), gap: fs(0.06), draw: (y) => block(data.brand, { ...br, x: cx, y, fill: c.ink(P.ink) })[0] });
      if (data.slogan && ['quote', 'botanical', 'literary', 'tet'].includes(L)) {
        const sl = { maxW: bw, size: fs(0.07), ts: c.quote, maxLines: 2, min: 16 };
        items.push({ h: measure(data.slogan, sl), gap: fs(0.02), draw: (y) => block(data.slogan, { ...sl, x: cx, y, fill: c.ink(P.sub) })[0] });
      }
      if (L === 'quote') {
        items.push({ h: fs(0.08), gap: fs(0.05), draw: (y) => <Divider c={c} cx={cx} y={y + fs(0.04)} w={bw * 0.5} /> });
        const info = { maxW: bw, size: fs(0.064), ts: c.body, maxLines: 3, lh: 1.28, min: 15 };
        for (const k of ['address', 'hours', 'phone'] as const) if (data[k]) items.push({ h: measure(data[k], info), gap: fs(0.025), draw: (y) => block(data[k], { ...info, x: cx, y, fill: c.ink(P.ink) })[0] });
      }
      if (L === 'book' && data.phone) {
        const info = { maxW: bw, size: fs(0.062), ts: c.body, maxLines: 1, min: 15 };
        items.push({ h: measure(data.phone, info), gap: fs(0.02), draw: (y) => block(data.phone, { ...info, x: cx, y, fill: c.ink(P.sub) })[0] });
      }
      const capO = { maxW: bw, size: fs(0.056), ts: c.body, maxLines: 1, min: 14 };
      const cap = L === 'book' ? 'Quét để đặt sách' : L === 'tet' ? 'Quét để xem ưu đãi Tết' : 'Quét để ghé thăm';
      const qh = showQr ? qrS + fs(0.04) + measure(cap, capO) : 0;
      const m = msg as MsgRef | null;
      if (m) {
        const y1b = bot - (qh ? qh + fs(0.1) : 0);
        const others = items.reduce((a, it, k) => a + (it === m.item ? 0 : it.h) + (k ? it.gap ?? 0 : 0), 0);
        m.o.size = fitH(data.message, m.o, m.max, 17, (y1b - top - others) * 0.86);
        m.o.min = m.o.size;
        m.item.h = measure(data.message, m.o);
      }
      out.push(<g key="st">{stackV(items, top, bot - (qh ? qh + fs(0.1) : 0), 'center')}</g>);
      if (showQr) {
        out.push(<Qr key="qr" c={c} x={cx - qrS / 2} y={bot - qh} size={qrS} text={data.website} />);
        out.push(<g key="qc">{block(cap, { ...capO, x: cx, y: bot - qh + qrS + fs(0.04), fill: c.ink(P.sub) })[0]}</g>);
      }
    }
  }
  return out;
}

/** huy hiệu trường: khiên + chữ viết tắt */
function Crest({ c, cx, y, s, brand }: { c: Ctx; cx: number; y: number; s: number; brand: string }) {
  const w = s * 0.78, h = s;
  const d = `M${f1(cx - w / 2)} ${f1(y)}H${f1(cx + w / 2)}V${f1(y + h * 0.5)}C${f1(cx + w / 2)} ${f1(y + h * 0.82)} ${f1(cx + w * 0.12)} ${f1(y + h * 0.94)} ${f1(cx)} ${f1(y + h)}C${f1(cx - w * 0.12)} ${f1(y + h * 0.94)} ${f1(cx - w / 2)} ${f1(y + h * 0.82)} ${f1(cx - w / 2)} ${f1(y + h * 0.5)}Z`;
  const ini = initials(brand);
  const ts = fitSize(ini, w * 0.62, s * 0.34, c.disp);
  return (
    <g data-deco="crest">
      <path d={d} fill={c.ink(c.P.panel)} />
      {c.goldOn && <path d={d} fill="none" stroke={c.gold} strokeWidth={3} />}
      {/* quyển sách mở trên khiên */}
      <path d={`M${f1(cx)} ${f1(y + h * 0.2)}Q${f1(cx - w * 0.16)} ${f1(y + h * 0.14)} ${f1(cx - w * 0.32)} ${f1(y + h * 0.2)}V${f1(y + h * 0.36)}Q${f1(cx - w * 0.16)} ${f1(y + h * 0.3)} ${f1(cx)} ${f1(y + h * 0.36)}Q${f1(cx + w * 0.16)} ${f1(y + h * 0.3)} ${f1(cx + w * 0.32)} ${f1(y + h * 0.36)}V${f1(y + h * 0.2)}Q${f1(cx + w * 0.16)} ${f1(y + h * 0.14)} ${f1(cx)} ${f1(y + h * 0.2)}Z`} fill={c.gold} />
      <Txt x={cx} y={y + h * 0.68} size={ts} ts={c.disp} fill={c.ink(c.P.ink)}>{ini}</Txt>
    </g>
  );
}

let uidN = 0;
const GoldDefs = ({ uid }: { uid: string }) => (
  <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor="#F7E3A1" /><stop offset="0.35" stopColor="#C9A24B" /><stop offset="0.6" stopColor="#F3D98B" /><stop offset="1" stopColor="#A97C2B" />
  </linearGradient>
);

/** 1 mặt bookmark. screen = xem trước (cắt theo hình, lộ lỗ); print = lớp in (không cắt); foil = mặt nạ ép kim (trắng = ép) */
export function BookmarkSvg(p: BMFaceProps) {
  const [uid] = useState(() => p.uid || `bm${++uidN}`);
  const sz = bmSize(p.spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const layer = p.layer || 'screen';
  const b = p.bleed ? BM_BLEED_MM * U : 0;
  const hole = holeOf(p.spec);
  const screen = layer === 'screen';
  const cut = cutPath(p.spec);
  const box = safeBox(p.spec);
  return (
    <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={p.style} data-bm-side={p.side} data-bm-layer={layer} preserveAspectRatio="xMidYMid meet">
      <defs>
        <GoldDefs uid={uid} />
        <clipPath id={`${uid}-cut`}><path d={cut} clipRule="evenodd" /></clipPath>
      </defs>
      <g clipPath={screen ? `url(#${uid}-cut)` : undefined}>{faceArt(p, uid)}</g>
      {screen && <path d={cut} fill="none" stroke="#000" strokeOpacity={0.14} strokeWidth={2} fillRule="evenodd" data-cut="1" />}
      {screen && hole && <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill="none" data-hole="1" />}
      {screen && <rect x={box.x} y={box.y} width={box.w} height={box.h} fill="none" data-safe="1" />}
    </svg>
  );
}

// ---------- tờ in bình nhiều con ----------
export const BM_SHEETS = [
  { id: 'a4', name: 'A4 · 210×297', wMm: 210, hMm: 297 },
  { id: 'a3', name: 'A3 · 297×420', wMm: 297, hMm: 420 },
  { id: 'sra3', name: 'SRA3 · 320×450', wMm: 320, hMm: 450 },
];
const SHEET_MARGIN = 8, SHEET_GAP = 4, FOOT = 6;
export function bmSheetFit(sizeId: string, sheetId: string) {
  const sz = bmSize(sizeId);
  const sheet = BM_SHEETS.find((s) => s.id === sheetId) || BM_SHEETS[0];
  const fitFor = (w: number, h: number) => ({
    cols: Math.max(0, Math.floor((sheet.wMm - SHEET_MARGIN * 2 + SHEET_GAP) / (w + SHEET_GAP))),
    rows: Math.max(0, Math.floor((sheet.hMm - SHEET_MARGIN * 2 - FOOT + SHEET_GAP) / (h + SHEET_GAP))),
  });
  const a = fitFor(sz.wMm, sz.hMm), r = fitFor(sz.hMm, sz.wMm);
  const rot = r.cols * r.rows > a.cols * a.rows;
  const { cols, rows } = rot ? r : a;
  const cw = rot ? sz.hMm : sz.wMm, ch = rot ? sz.wMm : sz.hMm;
  const x0 = (sheet.wMm - (cols * cw + (cols - 1) * SHEET_GAP)) / 2;
  const y0 = (sheet.hMm - FOOT - (rows * ch + (rows - 1) * SHEET_GAP)) / 2;
  return { cols, rows, per: cols * rows, rot, cw, ch, x0, y0, sz, sheet };
}

/**
 * tờ in: lớp In (nền tràn 2mm) + CutContour (hình + lỗ). Mặt sau: đảo cột (in 2 mặt lật theo cạnh dài);
 * nếu con nằm ngang thì mặt sau xoay ngược chiều để đầu bookmark trùng nhau. layer 'foil' = tờ khuôn ép kim.
 */
export function BookmarkSheetSvg({ spec, data, logo, photo, sheetId, side, layer = 'print', withCut = true, style }: { spec: BMSpec; data: BMData; logo?: string; photo?: string; sheetId: string; side: 'front' | 'back'; layer?: 'print' | 'foil'; withCut?: boolean; style?: CSSProperties }) {
  const [uid] = useState(() => `bms${++uidN}`);
  const fit = bmSheetFit(spec.size, sheetId);
  const { sz, sheet } = fit;
  const W = sheet.wMm * U, H = sheet.hMm * U, b = BM_BLEED_MM * U;
  const tw = sz.wMm * U, th = sz.hMm * U;
  const cells = Array.from({ length: fit.per }, (_, i) => {
    const c = i % fit.cols, r = Math.floor(i / fit.cols);
    const cc = side === 'back' ? fit.cols - 1 - c : c;
    const x = (fit.x0 + cc * (fit.cw + SHEET_GAP)) * U, y = (fit.y0 + r * (fit.ch + SHEET_GAP)) * U;
    // con nằm ngang: mặt trước xoay 90° (đầu bookmark bên phải), mặt sau xoay -90° (đầu bên trái) → lật tờ khớp
    const tf = !fit.rot ? `translate(${f1(x)} ${f1(y)})`
      : side === 'front' ? `translate(${f1(x + th)} ${f1(y)}) rotate(90)` : `translate(${f1(x)} ${f1(y + tw)}) rotate(-90)`;
    return tf;
  });
  const cut = cutPath(spec);
  const foil = layer === 'foil';
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${sheet.wMm}mm`} height={`${sheet.hMm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-bm-sheet={side} data-count={cells.length} data-rot={fit.rot ? 1 : 0}>
      <defs>
        <GoldDefs uid={uid} />
        <clipPath id={`${uid}-cell`}><rect x={-b} y={-b} width={tw + 2 * b} height={th + 2 * b} /></clipPath>
      </defs>
      {foil && <rect width={W} height={H} fill="#000000" />}
      <g id={foil ? 'EpKim' : 'In'}>
        {cells.map((tf, i) => (
          <g key={i} transform={tf}>
            <g clipPath={`url(#${uid}-cell)`}>{faceArt({ spec, data, side, logo, photo, layer: foil ? 'foil' : 'print', bleed: true }, uid)}</g>
          </g>
        ))}
      </g>
      {withCut && !foil && (
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1.5}>
          <title>CutContour</title>
          {cells.map((tf, i) => <path key={i} d={cut} transform={tf} />)}
        </g>
      )}
      <text x={f1(SHEET_MARGIN * U)} y={f1(H - 30)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={26} fill={foil ? '#FFFFFF' : '#9CA3AF'}>
        {`Mivy · Bookmark ${sz.name} · ${foil ? 'KHUÔN ÉP KIM (trắng = ép)' : `mặt ${side === 'front' ? 'trước' : 'sau (đã đảo để in 2 mặt)'}`} · ${cells.length} con/tờ · nền tràn ${BM_BLEED_MM}mm${spec.hole ? ' · lỗ Ø5 xỏ dây tua' : ''}`}
      </text>
    </svg>
  );
}
