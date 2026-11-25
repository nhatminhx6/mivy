'use client';
// Banner hiflex (băng rôn) + Backdrop sự kiện: 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT, render code 100%.
// Đơn vị viewBox = mm thật. Mọi chữ được "xếp khối" theo hộp (đo bằng font thật) → đúng mọi tỉ lệ:
// băng rôn rất dài (500×80), dọc (80×200) hay backdrop (500×300) đều tự co giãn, không đè, không lòi.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export type BNKind = 'banner' | 'backdrop';
export const BN_KINDS: { id: BNKind; name: string }[] = [
  { id: 'banner', name: 'Băng rôn / banner hiflex' },
  { id: 'backdrop', name: 'Backdrop sự kiện' },
];

export interface BNSize { id: string; kind: BNKind; name: string; wMm: number; hMm: number }
export const BN_SIZES: BNSize[] = [
  { id: 'b300x80', kind: 'banner', name: '300 × 80 cm', wMm: 3000, hMm: 800 },
  { id: 'b400x100', kind: 'banner', name: '400 × 100 cm', wMm: 4000, hMm: 1000 },
  { id: 'b500x80', kind: 'banner', name: '500 × 80 cm', wMm: 5000, hMm: 800 },
  { id: 'b80x200', kind: 'banner', name: '80 × 200 cm (dọc)', wMm: 800, hMm: 2000 },
  { id: 'd300x200', kind: 'backdrop', name: '300 × 200 cm', wMm: 3000, hMm: 2000 },
  { id: 'd400x250', kind: 'backdrop', name: '400 × 250 cm', wMm: 4000, hMm: 2500 },
  { id: 'd500x300', kind: 'backdrop', name: '500 × 300 cm', wMm: 5000, hMm: 3000 },
];
export const bnSize = (id: string) => BN_SIZES.find((s) => s.id === id) || BN_SIZES[0];
export const bnSizesFor = (k: BNKind) => BN_SIZES.filter((s) => s.kind === k);
export const BN_BLEED_MM = 20;
// khổ lớn nhìn xa: in 36–100dpi là chuẩn hiflex; giới hạn ~10.000px cạnh dài để trình duyệt vẽ nổi
export const bnDpi = (s: BNSize) => Math.max(36, Math.min(100, Math.floor((10000 * 25.4) / (Math.max(s.wMm, s.hMm) + 2 * BN_BLEED_MM))));

// vị trí đóng khoen: 4 góc + mỗi ~50cm dọc theo 4 cạnh, cách mép 25mm
export const GROMMET_INSET = 25;
export function grommetPoints(W: number, H: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  const along = (len: number) => {
    const n = Math.max(1, Math.ceil((len - 2 * GROMMET_INSET) / 500));
    return Array.from({ length: n + 1 }, (_, i) => GROMMET_INSET + ((len - 2 * GROMMET_INSET) * i) / n);
  };
  const xs = along(W), ys = along(H);
  for (const x of xs) pts.push({ x, y: GROMMET_INSET }, { x, y: H - GROMMET_INSET });
  for (const y of ys.slice(1, -1)) pts.push({ x: GROMMET_INSET, y }, { x: W - GROMMET_INSET, y });
  return pts;
}

// ---------- font ----------
export interface BNFont { id: string; name: string; family: string; weight: number }
export const BN_FONTS: BNFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
];
export const bnFont = (id: string) => BN_FONTS.find((f) => f.id === id) || BN_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';

export const BN_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;700;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Cormorant+Garamond:wght@700&family=Great+Vibes&display=swap');`;

const mcache = new Map<string, number>();
let mctx: CanvasRenderingContext2D | null = null;
// bề rộng chữ ở cỡ 1 (đo bằng font thật của trình duyệt — khớp với lúc SVG vẽ)
function unitW(text: string, fam: string, wt: number): number {
  const k = `${wt}|${fam}|${text}`;
  const hit = mcache.get(k);
  if (hit !== undefined) return hit;
  if (typeof document === 'undefined') return text.length * 0.62;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 0.62;
  mctx.font = `${wt} 200px "${fam}"`;
  const v = mctx.measureText(text).width / 200;
  mcache.set(k, v);
  return v;
}

// chiều cao MỰC thật của dòng chữ ở cỡ 1 (dấu tiếng Việt trên chữ hoa của font cao như Oswald vượt 1em)
const icache = new Map<string, { a: number; d: number }>();
function unitInk(text: string, fam: string, wt: number): { a: number; d: number } {
  const k = `${wt}|${fam}|${text}`;
  const hit = icache.get(k);
  if (hit) return hit;
  if (typeof document === 'undefined') return { a: 0.95, d: 0.25 };
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return { a: 0.95, d: 0.25 };
  mctx.font = `${wt} 200px "${fam}"`;
  const m = mctx.measureText(text);
  const v = { a: m.actualBoundingBoxAscent / 200, d: m.actualBoundingBoxDescent / 200 };
  icache.set(k, v);
  return v;
}

export function useBNFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-bn-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-bn-fonts'; link.rel = 'stylesheet';
        link.href = BN_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...BN_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`, `700 40px "${BODY}"`, `400 60px "${SCRIPT}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &'))))
      .catch(() => null)
      .then(() => { mcache.clear(); icache.clear(); if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface BNPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string }
export const BN_PALETTES: BNPalette[] = [
  { id: 'red', name: 'Đỏ vàng', paper: '#FFF7F1', ink: '#3A1210', sub: '#7A4B40', accent: '#C8102E', accent2: '#FFC93C', onAccent: '#FFFFFF' },
  { id: 'navy', name: 'Navy ánh kim', paper: '#F5F7FB', ink: '#14213D', sub: '#4E5E7A', accent: '#13294B', accent2: '#D4A84B', onAccent: '#FFFFFF' },
  { id: 'black', name: 'Đen vàng', paper: '#F7F3EA', ink: '#16140F', sub: '#6E6656', accent: '#0E0E10', accent2: '#D4AF37', onAccent: '#F6F1E4' },
  { id: 'indigo', name: 'Indigo', paper: '#F6F5FF', ink: '#1E1B38', sub: '#5A5781', accent: '#4338CA', accent2: '#FBBF24', onAccent: '#FFFFFF' },
  { id: 'orange', name: 'Cam năng động', paper: '#FFF8F0', ink: '#2B1A0E', sub: '#7A5A40', accent: '#EA5A0C', accent2: '#1F2A44', onAccent: '#FFFFFF' },
  { id: 'purple', name: 'Tím', paper: '#FAF5FF', ink: '#2A1446', sub: '#6A5684', accent: '#6D28D9', accent2: '#FBBF24', onAccent: '#FFFFFF' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#F1FAF8', ink: '#0C2F2B', sub: '#49706A', accent: '#0F766E', accent2: '#F2A541', onAccent: '#FFFFFF' },
  { id: 'blush', name: 'Hồng pastel', paper: '#FBF1EE', ink: '#4A2C2A', sub: '#8A6A64', accent: '#B9766C', accent2: '#B08D57', onAccent: '#FFFFFF' },
  { id: 'ivory', name: 'Trắng ngà', paper: '#FBF8F1', ink: '#2F2A22', sub: '#7C7466', accent: '#3A332A', accent2: '#B8935A', onAccent: '#FBF8F1' },
  { id: 'burgundy', name: 'Đỏ rượu', paper: '#FBF5F1', ink: '#3B0D16', sub: '#7A4E55', accent: '#6D1A2A', accent2: '#D9B26F', onAccent: '#FFFFFF' },
];
export const bnPalette = (id: string) => BN_PALETTES.find((p) => p.id === id) || BN_PALETTES[0];

// ---------- bố cục + nội dung ----------
export type BNLayoutId = 'grand' | 'promo' | 'welcome' | 'yep' | 'wedding' | 'birthday' | 'hiring';
export const BN_LAYOUTS: { id: BNLayoutId; name: string }[] = [
  { id: 'grand', name: 'Khai trương' },
  { id: 'promo', name: 'Khuyến mãi' },
  { id: 'welcome', name: 'Chào mừng / hội nghị' },
  { id: 'yep', name: 'Tất niên · YEP' },
  { id: 'wedding', name: 'Đám cưới' },
  { id: 'birthday', name: 'Sinh nhật' },
  { id: 'hiring', name: 'Tuyển dụng' },
];

export interface BNSpec { kind: BNKind; layout: BNLayoutId; palette: string; font: string; size: string; pattern: boolean; grommets: boolean }
export interface BNTemplate { id: string; name: string; spec: Pick<BNSpec, 'layout' | 'palette' | 'font' | 'pattern'> }
const T = (layout: BNLayoutId, palette: string, font: string, pattern = false): BNTemplate => ({
  id: `${layout}-${palette}-${font}`,
  name: `${BN_LAYOUTS.find((l) => l.id === layout)!.name} · ${bnPalette(palette).name}`,
  spec: { layout, palette, font, pattern },
});
export const BN_TEMPLATES: BNTemplate[] = [
  T('grand', 'red', 'montserrat'), T('grand', 'black', 'playfair'),
  T('promo', 'red', 'oswald'), T('promo', 'purple', 'montserrat'), T('promo', 'orange', 'baloo'),
  T('welcome', 'navy', 'montserrat', true), T('welcome', 'teal', 'bvp'),
  T('yep', 'black', 'playfair'), T('yep', 'navy', 'montserrat'),
  T('wedding', 'blush', 'playfair', true), T('wedding', 'ivory', 'cormorant'),
  T('birthday', 'purple', 'baloo'),
  T('hiring', 'indigo', 'bvp'), T('hiring', 'orange', 'oswald'),
];

export type BNData = Record<string, string>;
export interface BNField { key: string; label: string; ph?: string }
const F = (key: string, label: string, ph?: string): BNField => ({ key, label, ph });
export const BN_FIELDS: Record<BNLayoutId, BNField[]> = {
  grand: [F('eyebrow', 'Dòng nhỏ trên'), F('highlight', 'Chữ lớn nhất'), F('brand', 'Tên cửa hàng'), F('subtitle', 'Ưu đãi / dòng phụ'), F('date', 'Thời gian'), F('address', 'Địa chỉ'), F('phone', 'Điện thoại'), F('website', 'Website / fanpage')],
  promo: [F('brand', 'Tên cửa hàng'), F('eyebrow', 'Dòng nhỏ trên'), F('title', 'Tiêu đề'), F('highlight', 'Điểm nhấn (to nhất)'), F('subtitle', 'Dòng phụ'), F('date', 'Thời gian áp dụng'), F('address', 'Địa chỉ'), F('phone', 'Điện thoại'), F('website', 'Website / fanpage')],
  welcome: [F('brand', 'Đơn vị tổ chức'), F('eyebrow', 'Lời chào'), F('title', 'Tên sự kiện'), F('subtitle', 'Chủ đề / slogan'), F('date', 'Thời gian'), F('address', 'Địa điểm')],
  yep: [F('brand', 'Tên công ty'), F('highlight', 'Chữ lớn nhất'), F('title', 'Tên tiệc (chữ bay bướm)'), F('subtitle', 'Thông điệp'), F('date', 'Thời gian'), F('address', 'Địa điểm')],
  wedding: [F('eyebrow', 'Dòng nhỏ trên'), F('title', 'Tên cô dâu & chú rể'), F('date', 'Ngày cưới'), F('subtitle', 'Lời cảm ơn'), F('address', 'Nhà hàng / địa điểm'), F('brand', 'Chữ lồng (monogram)', 'B & H')],
  birthday: [F('eyebrow', 'Dòng nhỏ trên'), F('title', 'Tên bé / người được mừng'), F('date', 'Tuổi · ngày'), F('subtitle', 'Lời chúc'), F('address', 'Địa điểm'), F('brand', 'Chữ lồng (monogram)', 'GK')],
  hiring: [F('brand', 'Tên cửa hàng / công ty'), F('eyebrow', 'Dòng nhỏ trên'), F('highlight', 'Chữ lớn nhất'), F('title', 'Vị trí cần tuyển'), F('subtitle', 'Quyền lợi'), F('date', 'Hạn nhận hồ sơ'), F('phone', 'Điện thoại / Zalo'), F('address', 'Địa chỉ')],
};
const SHOP = { brand: 'AN KHANG COFFEE', phone: '0909 123 456', website: 'ankhang.vn', address: '12 Nguyễn Huệ, Q.1, TP.HCM' };
export const BN_DEFAULTS: Record<BNLayoutId, BNData> = {
  grand: { ...SHOP, eyebrow: 'HÂN HẠNH', highlight: 'KHAI TRƯƠNG', subtitle: 'Đồng giá 19K toàn menu – 3 ngày đầu', date: '08:00 · Chủ nhật 15.12.2026' },
  promo: { ...SHOP, brand: 'AN KHANG FASHION', website: 'ankhangfashion.vn', eyebrow: 'SIÊU SALE CUỐI NĂM', title: 'Xả kho toàn bộ cửa hàng', highlight: 'GIẢM 50%', subtitle: 'Mua 2 tặng 1 – áp dụng mọi sản phẩm', date: 'Từ 20.12 đến 31.12.2026' },
  welcome: { brand: 'AN KHANG GROUP', eyebrow: 'CHÀO MỪNG QUÝ VỊ ĐẠI BIỂU', title: 'HỘI NGHỊ KHÁCH HÀNG 2027', subtitle: 'Đồng hành – Vươn xa', date: '08:00 · Thứ Sáu, 15.01.2027', address: 'Khách sạn Rex, 141 Nguyễn Huệ, Q.1, TP.HCM' },
  yep: { brand: 'AN KHANG GROUP', highlight: 'YEAR END PARTY', title: 'Gala Tất niên 2026', subtitle: 'Cảm ơn một năm đồng hành', date: '18:30 · Thứ Bảy, 23.01.2027', address: 'White Palace, Phạm Văn Đồng, TP.HCM' },
  wedding: { eyebrow: 'THE WEDDING OF', title: 'Quốc Bảo & Thu Hà', date: '20 · 12 · 2026', subtitle: 'Cảm ơn quý khách đã đến chung vui', address: 'Trung tâm tiệc cưới Riverside', brand: 'B & H' },
  birthday: { eyebrow: 'HAPPY BIRTHDAY', title: 'Gia Khánh', date: 'Tròn 1 tuổi · 06.12.2026', subtitle: 'Cảm ơn cả nhà đã đến chung vui', address: 'Nhà hàng Hoa Sen, Q.3', brand: 'GK' },
  hiring: { ...SHOP, eyebrow: "WE'RE HIRING", highlight: 'TUYỂN DỤNG', title: 'Pha chế · Phục vụ · Thu ngân', subtitle: 'Lương 7–10 triệu + thưởng · Đào tạo từ đầu', date: 'Nhận hồ sơ đến 31.01.2027' },
};
const IDENTITY = ['brand', 'phone', 'website', 'address'];
const BUSINESS: BNLayoutId[] = ['grand', 'promo', 'welcome', 'yep', 'hiring'];
// đổi bố cục: lấy nội dung mẫu của bố cục mới, giữ thông tin cửa hàng khách đã nhập (nếu cùng là mẫu kinh doanh)
export function dataForLayout(next: BNLayoutId, prev: BNLayoutId, cur: BNData): BNData {
  const d = { ...BN_DEFAULTS[next] };
  if (BUSINESS.includes(next) && BUSINESS.includes(prev)) for (const k of IDENTITY) if (k in d && cur[k] !== undefined) d[k] = cur[k];
  return d;
}

// ---------- xếp khối chữ ----------
interface Line {
  t?: string; fam: string; wt: number; rel: number; fill: string;
  ls?: number;   // letter-spacing (em)
  gap?: number;  // khoảng trống trước dòng (× cỡ gốc)
  lh?: number; asc?: number; wrap?: number; op?: number; italic?: boolean;
}
interface Box { x: number; y: number; w: number; h: number }
interface Row extends Line { text: string; first: boolean }

function balanceUnits(units: string[], k: number, sep: string): string[] {
  const total = units.join(sep).length, target = total / k;
  const out: string[] = []; let cur = '';
  units.forEach((w, i) => {
    const left = units.length - i, need = k - out.length - 1;
    const joined = cur ? cur + sep + w : w;
    if (cur && (left <= need || (out.length < k - 1 && Math.abs(joined.length - target) > Math.abs(cur.length - target)))) { out.push(cur); cur = w; }
    else cur = joined;
  });
  if (cur) out.push(cur);
  return out;
}
// chia chữ thành k dòng cân nhau; ưu tiên ngắt ở dấu " · " (danh sách), không để dòng mở đầu bằng dấu câu
function balance(text: string, k: number): string[] {
  const t = text.trim();
  if (k <= 1) return [t];
  const groups = t.split(/\s+·\s+/);
  if (groups.length >= k) return balanceUnits(groups, k, ' · ');
  const words = t.split(/\s+/);
  if (words.length < 2) return [t];
  const lines = balanceUnits(words, Math.min(k, words.length), ' ');
  for (let i = 1; i < lines.length; i++) {
    const m = lines[i].match(/^([·&–\-,]+)\s*(.*)$/);
    if (m) { lines[i - 1] += ' ' + m[1]; lines[i] = m[2]; }
  }
  return lines.filter(Boolean);
}

function rowsOf(lines: Line[], wraps: number[]): Row[] {
  const rows: Row[] = [];
  lines.forEach((l, i) => {
    const t = (l.t || '').trim();
    if (!t) return;
    const parts = t.includes('\n') ? t.split('\n').map((s) => s.trim()).filter(Boolean) : balance(t, wraps[i]);
    parts.forEach((p, j) => rows.push({ ...l, text: p, first: j === 0 }));
  });
  return rows;
}

function solve(rows: Row[], box: Box, maxBase?: number) {
  const maxW = box.w * 0.985;
  const cap = rows.map((r) => maxW / Math.max(1e-6, unitW(r.text, r.fam, r.wt) + (r.ls || 0) * r.text.length));
  const size = (s: number, i: number) => Math.min(rows[i].rel * s, cap[i]);
  // khoảng dòng tối thiểu = mực thật + đệm → không dòng nào đè dòng nào, kể cả font cao / dấu chồng
  const ink = rows.map((r) => unitInk(r.text, r.fam, r.wt));
  const asc = rows.map((r, i) => Math.max(r.asc ?? 0.93, ink[i].a + 0.05));
  const lhs = rows.map((r, i) => Math.max(r.lh ?? 1.2, asc[i] + ink[i].d + 0.05));
  const height = (s: number) => rows.reduce((h, r, i) => h + size(s, i) * lhs[i] + (r.first && i > 0 ? (r.gap ?? 0.12) * s : 0), 0);
  // giữ thứ bậc: không cho cỡ gốc vượt mức dòng chính (rel lớn nhất) đã chạm bề ngang → dòng phụ không to bất thường
  const top = Math.max(...rows.map((r) => r.rel));
  const prim = Math.min(...rows.map((r, i) => (r.rel >= top ? cap[i] / r.rel : Infinity)));
  let lo = 0, hi = Math.min(maxBase ?? box.h * 1.5, prim * 1.3);
  if (height(hi) <= box.h) lo = hi;
  else for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (height(mid) <= box.h) lo = mid; else hi = mid; }
  return { s: lo, sizes: rows.map((_, i) => size(lo, i)), total: height(lo), asc, lhs };
}

function stack(lines: Line[], box: Box, opt: { anchor?: 'start' | 'middle' | 'end'; valign?: 'top' | 'center' | 'bottom'; maxBase?: number } = {}): ReactNode {
  if (box.w <= 0 || box.h <= 0) return null;
  const wraps = lines.map(() => 1);
  // chọn số dòng cho các dòng được phép xuống dòng: chỉ xuống khi chữ to hơn rõ rệt (>12%)
  lines.forEach((l, i) => {
    if (!l.wrap || l.wrap < 2 || !(l.t || '').trim() || (l.t || '').includes('\n')) return;
    let best = 1, bestScore = -1;
    const groups = (l.t || '').split(/\s+·\s+/).length; // danh sách "A · B · C": tối đa mỗi mục 1 dòng, không cắt giữa mục
    for (let k = 1; k <= (groups > 1 ? Math.min(l.wrap, groups) : l.wrap); k++) {
      wraps[i] = k;
      const rows = rowsOf(lines, wraps);
      const r = solve(rows, box, opt.maxBase);
      const mine = rows.map((row, j) => ({ row, j })).filter((x) => x.row.t === l.t);
      const sz = Math.min(...mine.map((x) => r.sizes[x.j]));
      const score = sz * (k === 1 ? 1.12 : 1);
      if (score > bestScore) { bestScore = score; best = k; }
    }
    wraps[i] = best;
  });
  const rows = rowsOf(lines, wraps);
  if (!rows.length) return null;
  const { s, sizes, total, asc, lhs } = solve(rows, box, opt.maxBase);
  const anchor = opt.anchor || 'middle';
  const x = anchor === 'start' ? box.x : anchor === 'end' ? box.x + box.w : box.x + box.w / 2;
  // còn dư chiều cao (khổ dọc/backdrop) → nới khoảng cách giữa các khối chữ cho thoáng, tối đa 0.5 cỡ gốc mỗi chỗ
  const joints = rows.filter((r, i) => r.first && i > 0).length;
  const extra = joints ? Math.min(s * 0.7, Math.max(0, box.h - total) / joints) : 0;
  const used = total + extra * joints;
  let y = opt.valign === 'top' ? box.y : opt.valign === 'bottom' ? box.y + box.h - used : box.y + (box.h - used) / 2;
  return rows.map((r, i) => {
    if (r.first && i > 0) y += (r.gap ?? 0.12) * s + extra;
    const fs = sizes[i];
    const base = y + fs * asc[i];
    y += fs * lhs[i];
    return (
      <text key={i} x={x} y={base} textAnchor={anchor} fontFamily={`"${r.fam}"`} fontWeight={r.wt} fontSize={fs} fill={r.fill}
        letterSpacing={r.ls ? r.ls * fs : undefined} opacity={r.op} fontStyle={r.italic ? 'italic' : undefined}>{r.text}</text>
    );
  });
}

// ---------- trang trí (vẽ bằng code) ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function fireworks(cx: number, cy: number, R: number, color: string, seed: number, op = 1): ReactNode {
  const r = rng(seed); const n = 22;
  return (
    <g opacity={op} stroke={color} strokeLinecap="round" fill={color}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + r() * 0.12;
        const r0 = R * (0.26 + r() * 0.08), r1 = R * (0.72 + r() * 0.26);
        return (
          <g key={i}>
            <line x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * r1} y2={cy + Math.sin(a) * r1} strokeWidth={R * 0.028} />
            <circle cx={cx + Math.cos(a) * (r1 + R * 0.07)} cy={cy + Math.sin(a) * (r1 + R * 0.07)} r={R * 0.024} stroke="none" />
          </g>
        );
      })}
      <circle cx={cx} cy={cy} r={R * 0.07} stroke="none" />
    </g>
  );
}
function glitter(x: number, y: number, w: number, h: number, n: number, colors: string[], seed: number, rMin: number, rMax: number): ReactNode {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const cx = x + r() * w, cy = y + r() * h, rr = rMin + r() * (rMax - rMin), c = colors[i % colors.length], o = 0.35 + r() * 0.6;
        if (i % 5 === 0) { // ngôi sao 4 cánh lấp lánh
          const k = rr * 2.4;
          return <path key={i} d={`M${cx} ${cy - k}Q${cx} ${cy} ${cx + k} ${cy}Q${cx} ${cy} ${cx} ${cy + k}Q${cx} ${cy} ${cx - k} ${cy}Q${cx} ${cy} ${cx} ${cy - k}Z`} fill={c} opacity={o} />;
        }
        return <circle key={i} cx={cx} cy={cy} r={rr} fill={c} opacity={o} />;
      })}
    </g>
  );
}
const starburst = (cx: number, cy: number, r1: number, r2: number, n = 26) =>
  Array.from({ length: n * 2 }, (_, i) => { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r2 : r1; return `${(cx + Math.cos(a) * rr).toFixed(1)},${(cy + Math.sin(a) * rr).toFixed(1)}`; }).join(' ');
function sprig(x: number, y: number, len: number, ang: number, color: string, color2: string, seed = 1): ReactNode {
  // nhánh lá thanh mảnh: thân cong nhẹ + lá hình hạt hạnh nhân so le, nhỏ dần về ngọn
  const r = rng(seed);
  const bend = len * 0.1;
  const pt = (t: number) => ({ x: len * t, y: -bend * 4 * t * (1 - t) });
  const n = 9;
  return (
    <g transform={`translate(${x} ${y}) rotate(${ang})`}>
      <path d={`M0 0Q${len * 0.5} ${-bend * 2} ${len} 0`} fill="none" stroke={color} strokeWidth={len * 0.008} strokeLinecap="round" />
      {Array.from({ length: n }, (_, i) => {
        const t = 0.12 + (i / n) * 0.86;
        const { x: px, y: py } = pt(t);
        const s = len * (0.15 - t * 0.075) * (0.9 + r() * 0.2);
        const side = i % 2 ? 1 : -1;
        const rot = side * (42 + r() * 10) + (t - 0.5) * -12;
        return <path key={i} d={`M0 0Q${s * 0.5} ${-s * 0.3} ${s} 0Q${s * 0.5} ${s * 0.3} 0 0Z`} transform={`translate(${px} ${py}) rotate(${rot})`} fill={i % 3 === 1 ? color2 : color} opacity={0.88} />;
      })}
      <path d={`M0 0Q${len * 0.08} ${-len * 0.024} ${len * 0.15} 0Q${len * 0.08} ${len * 0.024} 0 0Z`} transform={`translate(${len} 0)`} fill={color} opacity={0.88} />
    </g>
  );
}
// lặp logo nền (step & repeat) — nhãn data-deco để QC bỏ qua
function stepRepeat(c: Ctx, text: string, color: string, op: number, fam: string, wt: number): ReactNode {
  if (!text.trim()) return null;
  const { W, H, b } = c;
  const cellH = Math.max(180, Math.min(W, H) / 6);
  const fs = cellH * 0.32;
  const cellW = Math.max(cellH * 1.6, unitW(text, fam, wt) * fs * 1.6);
  const rows = Math.ceil((H + 2 * b) / cellH) + 1, cols = Math.ceil((W + 2 * b) / cellW) + 2;
  const out: ReactNode[] = [];
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const x = -b - cellW / 2 + k * cellW + (r % 2 ? cellW / 2 : 0), y = -b + cellH * 0.62 + r * cellH;
    out.push(<text key={`${r}-${k}`} x={x} y={y} textAnchor="middle" fontFamily={`"${fam}"`} fontWeight={wt} fontSize={fs} fill={color}>{text}</text>);
  }
  return <g data-deco="1" opacity={op}>{out}</g>;
}

interface Ctx {
  W: number; H: number; b: number; m: number; S: number; mode: 'wide' | 'mid' | 'tall';
  p: BNPalette; f: BNFont; d: BNData; photo?: string; uid: string; pattern: boolean;
}
const contactOf = (d: BNData, keys = ['phone', 'website', 'address']) => keys.map((k) => (d[k] || '').trim()).filter(Boolean).join('   •   ');
const bgRect = (c: Ctx, fill: string) => <rect x={-c.b} y={-c.b} width={c.W + 2 * c.b} height={c.H + 2 * c.b} fill={fill} />;
const shrink = (bx: Box, k: number): Box => ({ x: bx.x + k, y: bx.y + k, w: bx.w - 2 * k, h: bx.h - 2 * k });

// ô ảnh của khách (cắt khung, viền màu nhấn)
function photoEl(c: Ctx, r: Box, shape: 'rect' | 'circle' | 'arch' = 'rect'): ReactNode {
  if (!c.photo) return null;
  const id = `${c.uid}ph`;
  const rx = Math.min(r.w, r.h) * 0.05;
  const d = shape === 'circle'
    ? (() => { const rr = Math.min(r.w, r.h) / 2, cx = r.x + r.w / 2, cy = r.y + r.h / 2; return `M${cx - rr} ${cy}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0Z`; })()
    : shape === 'arch'
      ? `M${r.x} ${r.y + r.h}V${r.y + r.w / 2}A${r.w / 2} ${r.w / 2} 0 0 1 ${r.x + r.w} ${r.y + r.w / 2}V${r.y + r.h}Z`
      : `M${r.x + rx} ${r.y}H${r.x + r.w - rx}Q${r.x + r.w} ${r.y} ${r.x + r.w} ${r.y + rx}V${r.y + r.h - rx}Q${r.x + r.w} ${r.y + r.h} ${r.x + r.w - rx} ${r.y + r.h}H${r.x + rx}Q${r.x} ${r.y + r.h} ${r.x} ${r.y + r.h - rx}V${r.y + rx}Q${r.x} ${r.y} ${r.x + rx} ${r.y}Z`;
  return (
    <g>
      <clipPath id={id}><path d={d} /></clipPath>
      <image href={c.photo} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
      <path d={d} fill="none" stroke={c.p.accent2} strokeWidth={c.S * 0.008} />
    </g>
  );
}
// chừa chỗ cho ảnh: băng rôn dài → bên cạnh; backdrop → 40% bề ngang; dọc → phía trên
function withPhoto(c: Ctx, bx: Box, side: 'left' | 'right' = 'left'): { box: Box; ph: Box | null } {
  if (!c.photo) return { box: bx, ph: null };
  const g = c.m * 0.6;
  if (c.mode === 'tall') { const h = Math.min(bx.h * 0.36, bx.w * 1.05); return { ph: { x: bx.x, y: bx.y, w: bx.w, h }, box: { ...bx, y: bx.y + h + g, h: bx.h - h - g } }; }
  const w = c.mode === 'wide' ? Math.min(bx.h * 1.3, bx.w * 0.3) : bx.w * 0.4;
  const ph = { x: side === 'left' ? bx.x : bx.x + bx.w - w, y: bx.y, w, h: bx.h };
  return { ph, box: { x: side === 'left' ? bx.x + w + g : bx.x, y: bx.y, w: bx.w - w - g, h: bx.h } };
}
// dải liên hệ cuối (backdrop / dọc)
function footer(c: Ctx, frac: number, bg: string, fg: string, keys?: string[]): { node: ReactNode; top: number } {
  const text = contactOf(c.d, keys);
  if (!text) return { node: null, top: c.H };
  const h = c.H * frac, top = c.H - h;
  return {
    top,
    node: (
      <g>
        <rect x={-c.b} y={top} width={c.W + 2 * c.b} height={h + c.b} fill={bg} />
        {stack([{ t: text, fam: BODY, wt: 700, rel: 1, fill: fg }], { x: c.m, y: top + h * 0.24, w: c.W - 2 * c.m, h: h * 0.52 })}
      </g>
    ),
  };
}

// ================= BỐ CỤC =================
function grand(c: Ctx): ReactNode {
  const { W, H, m, S, p, f, d, mode, uid } = c;
  const disp = f.family, wt = f.weight;
  const lines = (withContact: boolean): Line[] => [
    { t: d.eyebrow?.toUpperCase(), fam: BODY, wt: 700, rel: 0.3, fill: p.accent2, ls: 0.22 },
    { t: d.highlight, fam: disp, wt, rel: 1, fill: p.accent2, gap: 0.05, wrap: mode === 'wide' ? 1 : 2, lh: 1.12 },
    { t: d.brand, fam: disp, wt, rel: 0.46, fill: p.onAccent, gap: 0.1, wrap: 2 },
    { t: d.subtitle, fam: BODY, wt: 700, rel: 0.27, fill: p.onAccent, gap: 0.14, wrap: mode === 'tall' ? 3 : 2 },
    { t: d.date, fam: BODY, wt: 700, rel: 0.25, fill: p.accent2, gap: 0.1 },
    ...(withContact ? [{ t: contactOf(d), fam: BODY, wt: 600, rel: 0.2, fill: p.onAccent, gap: 0.14, op: 0.92 } as Line] : []),
  ];
  const frame = (
    <g fill="none" stroke={p.accent2}>
      <rect x={m * 0.42} y={m * 0.42} width={W - m * 0.84} height={H - m * 0.84} strokeWidth={S * 0.007} />
      <rect x={m * 0.62} y={m * 0.62} width={W - m * 1.24} height={H - m * 1.24} strokeWidth={S * 0.0025} opacity={0.8} />
    </g>
  );
  const glow = (
    <>
      <defs><radialGradient id={`${uid}gl`} cx="50%" cy="45%" r="60%"><stop offset="0" stopColor="#fff" stopOpacity="0.2" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient></defs>
      <rect x={-c.b} y={-c.b} width={W + 2 * c.b} height={H + 2 * c.b} fill={`url(#${uid}gl)`} />
    </>
  );
  const inner: Box = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
  if (mode === 'wide') {
    const side = H * 0.92;
    const { box, ph } = withPhoto(c, inner, 'left');
    const left = ph ? box.x : m + side;
    // băng rôn rất dài (≥ 4:1): tách 2 cột — chữ chính to giữa, thông tin phụ cột phải → nhìn xa vẫn đọc được
    const split = W / H >= 4;
    const info: Box = { x: W - m * 1.2 - W * 0.22, y: m * 1.3, w: W * 0.22, h: H - m * 2.6 };
    const all = lines(true);
    const bx = { x: left, y: m * 1.05, w: (split ? info.x - m * 0.9 : W - m - side) - left, h: H - m * 2.1 };
    return (
      <>
        {bgRect(c, p.accent)}{glow}
        {c.pattern && stepRepeat(c, d.brand || '', p.onAccent, 0.06, disp, wt)}
        {!ph && fireworks(m + side * 0.48, H / 2, H * 0.36, p.accent2, 3)}
        {!split && fireworks(W - m - side * 0.48, H / 2, H * 0.36, p.accent2, 7)}
        {frame}
        {ph && photoEl(c, ph)}
        {split ? (
          <>
            {stack(all.slice(0, 3), bx)}
            <line x1={info.x - m * 0.45} y1={m * 1.3} x2={info.x - m * 0.45} y2={H - m * 1.3} stroke={p.accent2} strokeWidth={S * 0.006} />
            {stack(all.slice(3).map((l, i) => ({ ...l, rel: i === 0 ? 1 : 0.85, wrap: 2 })), info, { anchor: 'start' })}
          </>
        ) : stack(all, bx)}
      </>
    );
  }
  const ft = footer(c, mode === 'tall' ? 0.075 : 0.1, p.accent2, p.accent);
  const R = mode === 'tall' ? W * 0.3 : Math.min(W * 0.085, H * 0.15);
  const sideX = mode === 'tall' ? m : Math.max(m, W * 0.19);
  const body: Box = { x: sideX, y: m + (mode === 'tall' ? R * 1.2 : 0), w: W - 2 * sideX, h: ft.top - m * 0.7 - m - (mode === 'tall' ? R * 1.2 : 0) };
  const { box, ph } = withPhoto(c, body, 'right');
  return (
    <>
      {bgRect(c, p.accent)}{glow}
      {c.pattern && stepRepeat(c, d.brand || '', p.onAccent, 0.06, disp, wt)}
      {mode === 'tall'
        ? fireworks(W / 2, m + R * 0.55, R * 0.62, p.accent2, 5)
        : <>
          {fireworks(W * 0.1, ft.top * 0.34, R, p.accent2, 3)}{fireworks(W * 0.9, ft.top * 0.34, R, p.accent2, 7)}
          {fireworks(W * 0.075, ft.top * 0.68, R * 0.62, p.accent2, 9, 0.8)}{fireworks(W * 0.925, ft.top * 0.68, R * 0.62, p.accent2, 13, 0.8)}
        </>}
      {frame}
      {ph && photoEl(c, ph)}
      {stack(lines(false), shrink(box, Math.min(box.w, box.h) * 0.02))}
      {ft.node}
    </>
  );
}

function promo(c: Ctx): ReactNode {
  const { W, H, m, S, p, f, d, mode, b } = c;
  const disp = f.family, wt = f.weight;
  const dots = (x: number, y: number, cols: number, rows: number, gap: number, color: string) => (
    <g fill={color}>{Array.from({ length: cols * rows }, (_, i) => <circle key={i} cx={x + (i % cols) * gap} cy={y + Math.floor(i / cols) * gap} r={gap * 0.16} />)}</g>
  );
  const main = (withContact: boolean): Line[] => [
    { t: d.brand, fam: disp, wt, rel: 0.32, fill: p.accent, ls: 0.04 },
    { t: d.title, fam: disp, wt, rel: 1, fill: p.ink, gap: 0.12, wrap: mode === 'wide' ? 2 : mode === 'tall' ? 4 : 3, lh: 1.12 },
    { t: d.subtitle, fam: BODY, wt: 700, rel: 0.36, fill: p.sub, gap: 0.14, wrap: 2 },
    { t: d.date, fam: BODY, wt: 800, rel: 0.32, fill: p.accent, gap: 0.12 },
    ...(withContact ? [{ t: contactOf(d), fam: BODY, wt: 600, rel: 0.24, fill: p.ink, gap: 0.16 } as Line] : []),
  ];
  const hl: Line[] = [
    { t: d.eyebrow?.toUpperCase(), fam: BODY, wt: 800, rel: 0.24, fill: p.accent2 === '#1F2A44' ? '#FFFFFF' : p.accent2, ls: 0.14 },
    { t: d.highlight, fam: disp, wt, rel: 1, fill: p.onAccent, gap: 0.06, wrap: 2, lh: 1.1 },
  ];
  if (mode === 'wide') {
    const x0 = W * 0.6, x1 = W * 0.65;
    const inner: Box = { x: m, y: m, w: W * 0.475 - m, h: H - 2 * m };
    const { box, ph } = withPhoto(c, inner, 'left');
    return (
      <>
        {bgRect(c, p.paper)}
        <polygon points={`${x0},${-b} ${W + b},${-b} ${W + b},${H + b} ${x1 - W * 0.1},${H + b}`} fill={p.accent} />
        <g opacity={0.35}>{dots(W - m * 0.45 - S * 0.03 * 4, m * 0.35, 5, 2, S * 0.03, p.onAccent)}</g>
        <polygon points={`${x0 - W * 0.035},${-b} ${x0 - W * 0.012},${-b} ${x1 - W * 0.122},${H + b} ${x1 - W * 0.145},${H + b}`} fill={p.accent2} />
        {ph && photoEl(c, ph)}
        {stack(main(true), box, { anchor: 'start' })}
        {stack(hl, { x: x1 - W * 0.02, y: m, w: W - m - (x1 - W * 0.02), h: H - 2 * m })}
      </>
    );
  }
  const ft = footer(c, mode === 'tall' ? 0.075 : 0.1, p.accent, p.onAccent);
  const area: Box = { x: m, y: m, w: W - 2 * m, h: ft.top - m * 0.8 - m };
  let burst: { cx: number; cy: number; R: number }, txt: Box, ph: Box | null = null;
  if (mode === 'mid') {
    const R = Math.min(area.h * 0.46, area.w * 0.22);
    burst = { cx: area.x + area.w - R * 1.02, cy: area.y + area.h / 2, R };
    let left: Box = { x: area.x, y: area.y, w: area.w - R * 2.2, h: area.h };
    const wp = withPhoto(c, left, 'left'); left = wp.box; ph = wp.ph;
    txt = left;
  } else {
    const R = Math.min(area.w * 0.48, area.h * 0.2);
    const wp = withPhoto(c, area, 'left'); ph = wp.ph;
    const a = wp.box;
    burst = { cx: W / 2, cy: a.y + a.h - R * 1.02, R };
    txt = { x: a.x, y: a.y, w: a.w, h: a.h - R * 2.15 };
  }
  const { cx, cy, R } = burst;
  return (
    <>
      {bgRect(c, p.paper)}
      <polygon points={`${-b},${-b} ${W * 0.42},${-b} ${-b},${H * 0.3}`} fill={p.accent} opacity={0.1} />
      {dots(W - m * 0.5 - S * 0.03 * 4, m * 0.5, 5, 3, S * 0.03, p.accent)}
      <polygon points={starburst(cx, cy, R, R * 0.88)} fill={p.accent} />
      <circle cx={cx} cy={cy} r={R * 0.8} fill="none" stroke={p.accent2 === '#1F2A44' ? '#FFFFFF' : p.accent2} strokeWidth={R * 0.02} strokeDasharray={`${R * 0.05} ${R * 0.04}`} />
      {stack(hl, { x: cx - R * 0.6, y: cy - R * 0.5, w: R * 1.2, h: R * 1.0 })}
      {ph && photoEl(c, ph)}
      {stack(main(false), txt, { anchor: mode === 'mid' ? 'start' : 'middle' })}
      {ft.node}
    </>
  );
}

function welcome(c: Ctx): ReactNode {
  const { W, H, m, S, p, f, d, mode, b } = c;
  const disp = f.family, wt = f.weight;
  const lines = (contact: boolean): Line[] => [
    { t: d.brand, fam: disp, wt, rel: 0.3, fill: p.accent2, ls: 0.1 },
    { t: d.eyebrow?.toUpperCase(), fam: BODY, wt: 700, rel: 0.26, fill: p.onAccent, ls: 0.16, gap: 0.22, op: 0.92 },
    { t: d.title, fam: disp, wt, rel: 1, fill: p.onAccent, gap: 0.1, wrap: mode === 'wide' ? 2 : mode === 'tall' ? 4 : 3, lh: 1.12 },
    { t: d.subtitle, fam: disp, wt, rel: 0.42, fill: p.accent2, gap: 0.12, wrap: 2 },
    { t: d.date, fam: BODY, wt: 700, rel: 0.25, fill: p.onAccent, gap: 0.22 },
    ...(contact ? [{ t: d.address, fam: BODY, wt: 600, rel: 0.22, fill: p.onAccent, gap: 0.06, op: 0.85, wrap: 2 } as Line] : []),
  ];
  const k = S * 0.55;
  const poly = (
    <g>
      <polygon points={`${-b},${-b} ${k * 1.1},${-b} ${-b},${k * 1.1}`} fill="#FFFFFF" opacity={0.06} />
      <polygon points={`${-b},${-b} ${k * 0.62},${-b} ${-b},${k * 0.62}`} fill={p.accent2} opacity={0.9} />
      <polygon points={`${W + b},${H + b} ${W - k * 1.1},${H + b} ${W + b},${H - k * 1.1}`} fill="#FFFFFF" opacity={0.06} />
      <polygon points={`${W + b},${H + b} ${W - k * 0.62},${H + b} ${W + b},${H - k * 0.62}`} fill={p.accent2} opacity={0.9} />
      <line x1={k * 0.78} y1={-b} x2={-b} y2={k * 0.78} stroke={p.accent2} strokeWidth={S * 0.004} />
      <line x1={W - k * 0.78} y1={H + b} x2={W + b} y2={H - k * 0.78} stroke={p.accent2} strokeWidth={S * 0.004} />
    </g>
  );
  const pat = c.pattern && stepRepeat(c, d.brand || '', p.onAccent, 0.05, disp, wt);
  if (mode === 'wide') {
    const inner: Box = { x: m + k * 0.5, y: m, w: W - 2 * m - k, h: H - 2 * m };
    const { box, ph } = withPhoto(c, inner, 'left');
    return <>{bgRect(c, p.accent)}{pat}{poly}{ph && photoEl(c, ph)}{stack(lines(true), box)}</>;
  }
  const band = S * 0.012;
  const inner: Box = { x: m + k * 0.12, y: m * 1.2, w: W - 2 * m - k * 0.24, h: H - 2.6 * m };
  const { box, ph } = withPhoto(c, inner, 'left');
  return (
    <>
      {bgRect(c, p.accent)}{pat}{poly}
      <rect x={-b} y={H - m * 0.55 - band} width={W * 0.55 + b} height={band} fill={p.accent2} />
      {ph && photoEl(c, ph)}
      {stack(lines(true), box)}
    </>
  );
}

function yep(c: Ctx): ReactNode {
  const { W, H, m, S, p, f, d, mode, b, uid } = c;
  const disp = f.family, wt = f.weight;
  const year = (`${d.title || ''} ${d.date || ''} ${d.highlight || ''}`.match(/20\d\d/) || [''])[0];
  const lines: Line[] = [
    { t: d.brand?.toUpperCase(), fam: BODY, wt: 800, rel: 0.24, fill: p.accent2, ls: 0.24 },
    { t: d.highlight, fam: disp, wt, rel: 1, fill: p.onAccent, gap: 0.1, wrap: mode === 'wide' ? 1 : 3, lh: 1.1 },
    { t: d.title, fam: SCRIPT, wt: 400, rel: 0.72, fill: p.accent2, gap: 0.02, lh: 1.32, asc: 1.0, wrap: 2 },
    { t: d.subtitle, fam: BODY, wt: 600, rel: 0.25, fill: p.onAccent, gap: 0.08, op: 0.9, wrap: 2 },
    { t: d.date, fam: BODY, wt: 800, rel: 0.25, fill: p.accent2, gap: 0.18, ls: 0.06 },
    { t: d.address, fam: BODY, wt: 600, rel: 0.2, fill: p.onAccent, gap: 0.06, op: 0.82, wrap: 2 },
  ];
  const yfs = Math.min(H * 0.82, (W * 0.92) / Math.max(0.1, unitW(year || '0', disp, wt)));
  const split = W / H >= 4;
  const info: Box = { x: W - m * 1.2 - W * 0.22, y: m * 1.3, w: W * 0.22, h: H - m * 2.6 };
  const inner: Box = mode === 'wide' ? { x: m + H * 0.5, y: m, w: (split ? info.x - m * 0.9 : W - m - H * 0.5) - (m + H * 0.5), h: H - 2 * m } : { x: m, y: m * 1.3, w: W - 2 * m, h: H - 2.6 * m };
  const { box, ph } = withPhoto(c, inner, 'left');
  const body = split
    ? <>
      {stack(lines.slice(0, 3), box)}
      <line x1={info.x - m * 0.45} y1={m * 1.3} x2={info.x - m * 0.45} y2={H - m * 1.3} stroke={p.accent2} strokeWidth={S * 0.005} opacity={0.7} />
      {stack(lines.slice(3).map((l, i) => ({ ...l, rel: i === 0 ? 1 : 0.85, wrap: 2 })), info, { anchor: 'start' })}
    </>
    : stack(lines, box);
  return (
    <>
      {bgRect(c, p.accent)}
      <defs><radialGradient id={`${uid}v`} cx="50%" cy="40%" r="70%"><stop offset="0" stopColor="#fff" stopOpacity="0.12" /><stop offset="0.6" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.35" /></radialGradient></defs>
      <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={`url(#${uid}v)`} />
      {c.pattern && stepRepeat(c, d.brand || '', p.accent2, 0.06, disp, wt)}
      {year && <text data-deco="1" x={W / 2} y={H / 2 + yfs * 0.36} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={wt} fontSize={yfs} fill="none" stroke={p.accent2} strokeWidth={yfs * 0.006} opacity={0.22}>{year}</text>}
      <g fill="none" stroke={p.accent2} opacity={0.55}>
        <circle cx={-S * 0.1} cy={-S * 0.1} r={S * 0.55} strokeWidth={S * 0.004} />
        <circle cx={-S * 0.1} cy={-S * 0.1} r={S * 0.62} strokeWidth={S * 0.0015} />
        <circle cx={W + S * 0.1} cy={H + S * 0.1} r={S * 0.55} strokeWidth={S * 0.004} />
        <circle cx={W + S * 0.1} cy={H + S * 0.1} r={S * 0.62} strokeWidth={S * 0.0015} />
      </g>
      {glitter(-b, -b, W * 0.3, H * 0.45, Math.round(40 + W / 60), [p.accent2, '#FFFFFF'], 11, S * 0.0035, S * 0.009)}
      {glitter(W * 0.7, H * 0.55, W * 0.3 + b, H * 0.45 + b, Math.round(40 + W / 60), [p.accent2, '#FFFFFF'], 23, S * 0.0035, S * 0.009)}
      {ph && photoEl(c, ph)}
      {body}
    </>
  );
}

function celebration(c: Ctx, kind: 'wedding' | 'birthday'): ReactNode {
  const { W, H, m, S, p, f, d, mode, b } = c;
  const disp = f.family, wt = f.weight;
  const mono = (d.brand || '').trim();
  const lines: Line[] = [
    { t: d.eyebrow?.toUpperCase(), fam: BODY, wt: 700, rel: 0.22, fill: p.sub, ls: 0.3 },
    ...((): Line[] => {
      const t = (d.title || '').trim();
      const nm: Line = { fam: SCRIPT, wt: 400, rel: 1, fill: p.accent, lh: 1.32, asc: 1.0 };
      const parts = t.split('&').map((x) => x.trim()).filter(Boolean);
      if (mode === 'wide' || parts.length !== 2) return [{ ...nm, t, gap: 0.06, wrap: mode === 'wide' ? 1 : 3 }];
      // dọc / backdrop: tên – & – tên trên 3 dòng (kiểu thiệp cưới)
      return [{ ...nm, t: parts[0], gap: 0.06 }, { ...nm, t: '&', rel: 0.55, gap: 0, lh: 1.05, asc: 0.85 }, { ...nm, t: parts[1], gap: 0 }];
    })(),
    { t: d.date, fam: disp, wt, rel: 0.4, fill: p.accent2, gap: 0.08, ls: 0.06 },
    { t: d.subtitle, fam: BODY, wt: 600, rel: 0.24, fill: p.ink, gap: 0.14, op: 0.85, wrap: 2 },
    { t: d.address, fam: BODY, wt: 700, rel: 0.21, fill: p.sub, gap: 0.05, wrap: 2 },
  ];
  const deco = kind === 'wedding'
    ? (x: number, y: number, len: number, ang: number, seed: number) => sprig(x, y, len, ang, p.accent2, p.accent, seed)
    : null;
  const confetti = kind === 'birthday' ? glitter(-b, -b, W + 2 * b, H + 2 * b, Math.round(60 + (W * H) / 90000), [p.accent, p.accent2, p.sub], 5, S * 0.004, S * 0.01) : null;
  const monogram = (cx: number, cy: number, r: number) => mono ? (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={p.paper} stroke={p.accent2} strokeWidth={r * 0.04} />
      <circle cx={cx} cy={cy} r={r * 0.86} fill="none" stroke={p.accent2} strokeWidth={r * 0.015} />
      {stack([{ t: mono, fam: disp, wt, rel: 1, fill: p.accent }], { x: cx - r * 0.62, y: cy - r * 0.42, w: r * 1.24, h: r * 0.84 })}
    </g>
  ) : null;
  const pat = c.pattern && stepRepeat(c, mono, p.accent, 0.07, disp, wt);
  const dbl = (x: number, y: number, w: number, h: number) => (
    <g fill="none" stroke={p.accent2}>
      <rect x={x} y={y} width={w} height={h} strokeWidth={S * 0.005} />
      <rect x={x + S * 0.018} y={y + S * 0.018} width={w - S * 0.036} height={h - S * 0.036} strokeWidth={S * 0.0018} />
    </g>
  );
  if (mode === 'wide') {
    const fr = m * 0.5;
    const inner: Box = { x: m, y: m, w: W - 2 * m, h: H - 2 * m };
    const r = inner.h * 0.36;
    const lx = m + inner.h * 0.55;
    let box: Box = { x: lx + inner.h * 0.6, y: m, w: W - m - (lx + inner.h * 0.6) - inner.h * 0.55, h: inner.h };
    let ph: Box | null = null;
    if (c.photo) { ph = { x: m + H * 0.05, y: m, w: inner.h, h: inner.h }; box = { ...box, x: ph.x + ph.w + m * 0.6, w: W - m - inner.h * 0.55 - (ph.x + ph.w + m * 0.6) }; }
    return (
      <>
        {bgRect(c, p.paper)}{pat}{confetti}
        {dbl(fr, fr, W - 2 * fr, H - 2 * fr)}
        {ph ? photoEl(c, ph, 'circle') : monogram(lx, H / 2, r)}
        {deco && <>{deco(W - fr - S * 0.05, H - fr - S * 0.03, inner.h * 0.62, -128, 1)}{deco(W - fr - S * 0.03, H - fr - S * 0.05, inner.h * 0.48, -158, 2)}</>}
        {stack(lines, box)}
      </>
    );
  }
  // backdrop / dọc: khung vòm đôi giữa
  const top = m * 0.8, bottom = H - m * 0.8;
  const photoSide = c.photo && mode === 'mid';
  const aw = Math.min(photoSide ? W / 2 - m * 1.5 : (W - 2 * m) * (mode === 'tall' ? 0.94 : 0.62), (bottom - top) * 0.95);
  const ax = photoSide ? W / 2 + m * 0.3 + ((W / 2 - m) - aw) / 2 : (W - aw) / 2;
  const arch = (x: number, w: number, close = false) => `M${x} ${bottom}V${top + w / 2}A${w / 2} ${w / 2} 0 0 1 ${x + w} ${top + w / 2}V${bottom}${close ? 'Z' : ''}`;
  const r = aw * 0.11;
  const my = top + aw * 0.19;
  let txt: Box = { x: ax + aw * 0.1, y: my + r + aw * 0.05, w: aw * 0.8, h: bottom - (my + r + aw * 0.05) - aw * 0.08 };
  let ph: Box | null = null;
  if (c.photo) {
    if (photoSide) { const pw = Math.min(W / 2 - m * 1.3, (bottom - top) * 0.8); ph = { x: m + ((W / 2 - m) - pw) / 2, y: top, w: pw, h: bottom - top }; }
    else { const h = (txt.h) * 0.42; ph = { x: txt.x, y: txt.y, w: txt.w, h }; txt = { ...txt, y: txt.y + h + m * 0.4, h: txt.h - h - m * 0.4 }; }
  }
  return (
    <>
      {bgRect(c, p.paper)}{pat}{confetti}
      <path d={arch(ax - S * 0.025, aw + S * 0.05, true)} fill={p.paper} opacity={0.88} />
      <path d={arch(ax, aw)} fill="none" stroke={p.accent2} strokeWidth={S * 0.005} />
      <path d={arch(ax - S * 0.022, aw + S * 0.044)} fill="none" stroke={p.accent2} strokeWidth={S * 0.0018} />
      {deco && !photoSide && <>
        {deco(ax - S * 0.03, bottom, aw * 0.42, -112, 1)}{deco(ax - S * 0.03, bottom, aw * 0.3, -152, 2)}
        {deco(ax + aw + S * 0.03, bottom, aw * 0.42, -68, 3)}{deco(ax + aw + S * 0.03, bottom, aw * 0.3, -28, 4)}
      </>}
      {ph && photoEl(c, ph, photoSide ? 'arch' : 'rect')}
      {monogram(ax + aw / 2, my, r)}
      {stack(lines, txt)}
    </>
  );
}

function hiring(c: Ctx): ReactNode {
  const { W, H, m, S, p, f, d, mode, b } = c;
  const disp = f.family, wt = f.weight;
  const a2 = p.accent2 === '#1F2A44' ? '#FFD166' : p.accent2;
  const head: Line[] = [
    { t: d.eyebrow?.toUpperCase(), fam: BODY, wt: 800, rel: 0.24, fill: a2, ls: 0.16 },
    { t: d.highlight, fam: disp, wt, rel: 1, fill: p.onAccent, gap: 0.04, wrap: 2, lh: 1.08 },
  ];
  const main = (contact: boolean): Line[] => [
    { t: d.brand, fam: disp, wt, rel: 0.3, fill: p.accent, ls: 0.04 },
    { t: d.title, fam: disp, wt, rel: 1, fill: p.ink, gap: 0.1, wrap: mode === 'tall' ? 4 : 3, lh: 1.12 },
    { t: d.subtitle, fam: BODY, wt: 700, rel: 0.34, fill: p.sub, gap: 0.14, wrap: 2 },
    { t: d.date, fam: BODY, wt: 800, rel: 0.3, fill: p.accent, gap: 0.12 },
    ...(contact ? [{ t: contactOf(d, ['phone', 'address']), fam: BODY, wt: 700, rel: 0.26, fill: p.ink, gap: 0.16 } as Line] : []),
  ];
  const dots = (x: number, y: number, n: number, gap: number) => (
    <g fill={p.accent} opacity={0.35}>{Array.from({ length: n * n }, (_, i) => <circle key={i} cx={x + (i % n) * gap} cy={y + Math.floor(i / n) * gap} r={gap * 0.15} />)}</g>
  );
  if (mode === 'wide') {
    const x1 = W * 0.33;
    const ix = x1 + H * 0.1 + m * 0.3;
    const inner: Box = { x: ix, y: m, w: W - m - ix, h: H - 2 * m };
    const { box, ph } = withPhoto(c, inner, 'right');
    return (
      <>
        {bgRect(c, p.paper)}
        {dots(W - m * 0.5 - S * 0.025 * 5, m * 0.35, 6, S * 0.025)}
        <polygon points={`${-b},${-b} ${x1},${-b} ${x1 - H * 0.22},${H + b} ${-b},${H + b}`} fill={p.accent} />
        <polygon points={`${x1 + H * 0.02},${-b} ${x1 + H * 0.06},${-b} ${x1 - H * 0.16},${H + b} ${x1 - H * 0.2},${H + b}`} fill={a2} />
        {stack(head, { x: m, y: m, w: x1 - H * 0.22 - m * 1.4, h: H - 2 * m })}
        {ph && photoEl(c, ph)}
        {stack(main(true), box, { anchor: 'start' })}
      </>
    );
  }
  const bandH = H * (mode === 'tall' ? 0.27 : 0.36);
  const ft = footer(c, mode === 'tall' ? 0.075 : 0.1, p.accent, p.onAccent, ['phone', 'address']);
  const area: Box = { x: m, y: bandH + m * 0.5, w: W - 2 * m, h: ft.top - m * 0.6 - bandH - m * 0.5 };
  const { box, ph } = withPhoto(c, area, 'right');
  return (
    <>
      {bgRect(c, p.paper)}
      <polygon points={`${-b},${-b} ${W + b},${-b} ${W + b},${bandH - H * 0.06} ${-b},${bandH}`} fill={p.accent} />
      <polygon points={`${-b},${bandH} ${W + b},${bandH - H * 0.06} ${W + b},${bandH - H * 0.045} ${-b},${bandH + H * 0.015}`} fill={a2} />
      {dots(W - m - S * 0.025 * 5, bandH + m * 0.1, 6, S * 0.025)}
      {stack(head, { x: m, y: m * 0.8, w: W - 2 * m, h: bandH - H * 0.06 - m * 1.2 })}
      {ph && photoEl(c, ph)}
      {stack(main(false), box, { anchor: mode === 'mid' ? 'start' : 'middle' })}
      {ft.node}
    </>
  );
}

// ---------- component ----------
export function BannerSvg({ spec, data, photo, bleed = false, marks = false, style }: {
  spec: Pick<BNSpec, 'layout' | 'palette' | 'font' | 'size' | 'pattern'>; data: BNData; photo?: string; bleed?: boolean; marks?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sz = bnSize(spec.size);
  const W = sz.wMm, H = sz.hMm, b = bleed ? BN_BLEED_MM : 0;
  const r = W / H;
  const S = Math.min(W, H);
  const c: Ctx = {
    W, H, b, S, m: Math.max(55, S * 0.07), mode: r >= 2.4 ? 'wide' : r <= 0.8 ? 'tall' : 'mid',
    p: bnPalette(spec.palette), f: bnFont(spec.font), d: data, photo, uid, pattern: spec.pattern,
  };
  const L = spec.layout;
  const body = L === 'grand' ? grand(c) : L === 'promo' ? promo(c) : L === 'welcome' ? welcome(c) : L === 'yep' ? yep(c)
    : L === 'wedding' ? celebration(c, 'wedding') : L === 'birthday' ? celebration(c, 'birthday') : hiring(c);
  return (
    <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-layout={L}>
      {body}
      {marks && (
        // dấu vị trí đóng khoen (nằm trong vùng gấp mép, khoen đóng đè lên)
        <g data-deco="1" fill="none" stroke="#7A7A7A" strokeWidth={0.8} opacity={0.9}>
          {grommetPoints(W, H).map((g, i) => (
            <g key={i}><circle cx={g.x} cy={g.y} r={6} /><path d={`M${g.x - 9} ${g.y}H${g.x + 9}M${g.x} ${g.y - 9}V${g.y + 9}`} /></g>
          ))}
        </g>
      )}
    </svg>
  );
}
