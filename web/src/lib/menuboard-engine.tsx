'use client';
// Bảng menu treo tường (menu board sau quầy cà phê / trà sữa / bánh mì / cơm): 1–4 tấm ghép cạnh nhau,
// thực đơn dán dạng "## Nhóm | M | L" + "Tên | giá M | giá L" → tự chia nhóm sang các tấm, tự co chữ vừa khít,
// cân đều các cột. Món nổi bật có ảnh khách (chỉ nằm trên máy) hoặc hình minh hoạ vẽ bằng code.
// Đơn vị SVG = mm thật. Render code 100% — AI không chạm vào.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { fmtPrice, type MBPrice } from './menubook-engine';

// ---------- khổ, chất liệu ----------
export interface MBDSize { id: string; name: string; wMm: number; hMm: number }
export const MBD_SIZES: MBDSize[] = [
  { id: '60x80', name: '60 × 80 cm (dọc)', wMm: 600, hMm: 800 },
  { id: '80x60', name: '80 × 60 cm (ngang)', wMm: 800, hMm: 600 },
  { id: '100x60', name: '100 × 60 cm (ngang)', wMm: 1000, hMm: 600 },
];
export const mbdSize = (id: string) => MBD_SIZES.find((s) => s.id === id) || MBD_SIZES[0];
export const MBD_BLEED_MM = 3;
export const MBD_GAP_MM = 30; // khe giữa các tấm khi treo

export type MBDMaterial = 'alu' | 'lightbox' | 'wood';
export const MBD_MATERIALS: { id: MBDMaterial; name: string; note: string; order: string }[] = [
  { id: 'alu', name: 'Alu in UV', note: 'Tấm alu 3mm in UV, bắt ốc pát nổi lên tường — bền, dễ lau.', order: 'Bảng menu alu in UV treo tường' },
  { id: 'lightbox', name: 'Hộp đèn mica', note: 'Mặt mica in UV, LED bên trong — sáng rõ cả buổi tối.', order: 'Hộp đèn menu (mica)' },
  { id: 'wood', name: 'Khung gỗ + decal', note: 'Khung gỗ thông, mặt decal in dán — ấm, mộc.', order: 'Bảng menu gỗ + decal' },
];
export const mbdMaterial = (id: string) => MBD_MATERIALS.find((m) => m.id === id) || MBD_MATERIALS[0];

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
const BODY = 'Be Vietnam Pro';
const PRICE = 'Oswald';
export interface MBDFont { id: string; name: string; family: string; weight: number; upper: boolean }
export const MBD_FONTS: MBDFont[] = [
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'dancing', name: 'Viết tay', family: 'Dancing Script', weight: 700, upper: false },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800, upper: false },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, upper: true },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800, upper: false },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, upper: false },
];
export const mbdFont = (id: string) => MBD_FONTS.find((f) => f.id === id) || MBD_FONTS[0];
export const MBD_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Montserrat:wght@800&family=Baloo+2:wght@800&family=Dancing+Script:wght@700&family=Lobster&display=swap');`;

export function useMBDFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-mbd-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-mbd-fonts'; link.rel = 'stylesheet';
        link.href = MBD_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...MBD_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- phong cách + bảng màu ----------
export type MBDKind = 'chalk' | 'modern' | 'wood' | 'neon' | 'kraft';
export interface MBDPalette {
  id: string; name: string; kind: MBDKind;
  bg: string; bg2: string; paper?: string; ink: string; sub: string; acc: string; acc2: string; onAcc: string;
}
export const MBD_PALETTES: MBDPalette[] = [
  { id: 'chalk-slate', name: 'Bảng phấn đen', kind: 'chalk', bg: '#2C3230', bg2: '#232826', ink: '#F4F1E8', sub: '#C9C4B5', acc: '#F2C94C', acc2: '#EE9A86', onAcc: '#2C3230' },
  { id: 'chalk-green', name: 'Bảng phấn xanh rêu', kind: 'chalk', bg: '#24392F', bg2: '#1C2D26', ink: '#F3F0E4', sub: '#BCD0C2', acc: '#F6D365', acc2: '#9AD1D4', onAcc: '#24392F' },
  { id: 'modern-orange', name: 'Hiện đại cam', kind: 'modern', bg: '#FFF8F0', bg2: '#FFE7D1', ink: '#2A1C12', sub: '#7A6556', acc: '#E8621A', acc2: '#2E7D5B', onAcc: '#FFFFFF' },
  { id: 'modern-teal', name: 'Hiện đại xanh ngọc', kind: 'modern', bg: '#F3FAF8', bg2: '#D9F0EA', ink: '#10302A', sub: '#4F6E67', acc: '#0F766E', acc2: '#D99A1E', onAcc: '#FFFFFF' },
  { id: 'modern-red', name: 'Hiện đại đỏ', kind: 'modern', bg: '#FFF7F2', bg2: '#FBE2D7', ink: '#2B1410', sub: '#7C5248', acc: '#C8102E', acc2: '#E89A00', onAcc: '#FFFFFF' },
  { id: 'wood-oak', name: 'Gỗ sồi & trắng', kind: 'wood', bg: '#B98A5B', bg2: '#A3754A', paper: '#FFFDF8', ink: '#2E2117', sub: '#7A6553', acc: '#9A4B2C', acc2: '#3D6B4F', onAcc: '#FFFFFF' },
  { id: 'wood-walnut', name: 'Gỗ óc chó & kem', kind: 'wood', bg: '#6E4C34', bg2: '#5A3D29', paper: '#FBF6EC', ink: '#2A2018', sub: '#77685B', acc: '#B5651D', acc2: '#2F5D50', onAcc: '#FFFFFF' },
  { id: 'neon-violet', name: 'Neon tím hồng', kind: 'neon', bg: '#16121F', bg2: '#1F1A2D', ink: '#FDF6FF', sub: '#B9AFCF', acc: '#FF4FD8', acc2: '#4FF0FF', onAcc: '#16121F' },
  { id: 'neon-cyan', name: 'Neon xanh cam', kind: 'neon', bg: '#0E1518', bg2: '#152328', ink: '#F1FFFE', sub: '#A8C4C6', acc: '#3DF5E0', acc2: '#FFB547', onAcc: '#0E1518' },
  { id: 'kraft', name: 'Giấy kraft', kind: 'kraft', bg: '#C9A273', bg2: '#B88E5E', ink: '#3A2414', sub: '#674630', acc: '#8E2F1F', acc2: '#2F4F3A', onAcc: '#F4E6D0' },
];
export const mbdPalette = (id: string) => MBD_PALETTES.find((p) => p.id === id) || MBD_PALETTES[0];
const DARK: Record<MBDKind, boolean> = { chalk: true, modern: false, wood: false, neon: true, kraft: false };

export type MBDIndustry = 'cafe' | 'trasua' | 'banhmi' | 'com';
export const MBD_INDUSTRIES: { id: MBDIndustry; name: string }[] = [
  { id: 'cafe', name: 'Cà phê' }, { id: 'trasua', name: 'Trà sữa' }, { id: 'banhmi', name: 'Bánh mì' }, { id: 'com', name: 'Cơm' },
];

export interface MBDSpec {
  palette: string; font: string; industry: MBDIndustry; size: string; panels: number; material: MBDMaterial; price: MBPrice; leader: boolean;
}
export interface MBDTemplate { id: string; name: string; spec: Omit<MBDSpec, 'size' | 'panels' | 'material' | 'price'> }
export const MBD_TEMPLATES: MBDTemplate[] = [
  { id: 't1', name: 'Phấn đen · Cà phê', spec: { palette: 'chalk-slate', font: 'dancing', industry: 'cafe', leader: true } },
  { id: 't2', name: 'Hiện đại cam · Trà sữa', spec: { palette: 'modern-orange', font: 'baloo', industry: 'trasua', leader: false } },
  { id: 't3', name: 'Gỗ sồi · Cà phê', spec: { palette: 'wood-oak', font: 'playfair', industry: 'cafe', leader: true } },
  { id: 't4', name: 'Neon tím · Trà sữa', spec: { palette: 'neon-violet', font: 'baloo', industry: 'trasua', leader: false } },
  { id: 't5', name: 'Kraft · Bánh mì', spec: { palette: 'kraft', font: 'oswald', industry: 'banhmi', leader: true } },
  { id: 't6', name: 'Hiện đại đỏ · Cơm tấm', spec: { palette: 'modern-red', font: 'montserrat', industry: 'com', leader: true } },
  { id: 't7', name: 'Phấn xanh · Trà sữa', spec: { palette: 'chalk-green', font: 'lobster', industry: 'trasua', leader: true } },
  { id: 't8', name: 'Neon xanh · Cà phê', spec: { palette: 'neon-cyan', font: 'oswald', industry: 'cafe', leader: false } },
  { id: 't9', name: 'Gỗ óc chó · Bánh mì', spec: { palette: 'wood-walnut', font: 'oswald', industry: 'banhmi', leader: true } },
  { id: 't10', name: 'Hiện đại xanh · Cà phê', spec: { palette: 'modern-teal', font: 'montserrat', industry: 'cafe', leader: false } },
];
export const MBD_FIRST: MBDSpec = { ...MBD_TEMPLATES[0].spec, size: '60x80', panels: 3, material: 'alu', price: 'k' };

// ---------- nội dung ----------
export type MBDData = Record<string, string>;
export interface MBDField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; rows?: number }
export const MBD_FIELDS: MBDField[] = [
  { key: 'brand', label: 'Tên quán', half: true },
  { key: 'slogan', label: 'Câu slogan', half: true },
  { key: 'menu', label: 'Thực đơn — "## Nhóm | M | L" rồi mỗi dòng "Tên | giá M | giá L". Đầu tên: * = best seller, + = món nổi bật có ảnh. Thêm "mới" cuối dòng = nhãn MỚI', multiline: true, rows: 12 },
  { key: 'toppingsTitle', label: 'Tiêu đề ô topping / món thêm', half: true },
  { key: 'toppings', label: 'Topping (cách nhau dấu phẩy, vd "Trân châu đen 5k")', half: true },
  { key: 'combo', label: 'Combo (mỗi dòng: Tên | Mô tả | Giá)', multiline: true, rows: 2 },
  { key: 'hotline', label: 'Hotline / đặt món', half: true },
  { key: 'note', label: 'Ghi chú cuối bảng (wifi, giờ mở cửa…)', half: true },
];
const SAMPLES: Record<MBDIndustry, MBDData> = {
  cafe: {
    brand: 'AN KHANG COFFEE', slogan: 'Rang mộc mỗi sáng',
    menu: '## Cà phê | Nóng | Đá\nCà phê đen | 20k | 22k\nCà phê sữa | 25k | 27k\n*Bạc xỉu | 29k | 32k\nCà phê muối | | 35k | mới\nEspresso | 30k |\nLatte | 39k | 42k\n## Trà & đá xay | M | L\n+Trà đào cam sả | 35k | 42k\nTrà vải hoa hồng | 35k | 42k\nMatcha đá xay | 45k | 52k\nCookie đá xay | 45k | 52k\nSữa chua việt quất | 39k | 45k\n## Bánh ngọt\nCroissant bơ | 25k\nTiramisu | 39k\nBánh chuối nướng | 22k',
    toppingsTitle: 'Thêm vào ly', toppings: 'Shot espresso 10k, Kem cheese 10k, Sữa yến mạch 8k, Thạch cà phê 6k',
    combo: 'Combo sáng | Cà phê sữa + croissant bơ | 45k', hotline: '0909 123 456', note: 'Wifi: ankhang2027 · Mở cửa 6:30 – 22:00',
  },
  trasua: {
    brand: 'MÂY TEA', slogan: 'Trà ngon · Trân châu dẻo',
    menu: '## Trà sữa | M | L\n*Trà sữa trân châu đen | 30k | 36k\nTrà sữa ô long | 32k | 38k\nTrà sữa matcha | 35k | 41k\nTrà sữa khoai môn | 35k | 41k\nSữa tươi trân châu đường đen | 35k | 42k | mới\n## Trà trái cây | M | L\n+Trà đào cam sả | 32k | 38k\nTrà vải | 30k | 36k\nTrà chanh dây | 28k | 34k\nTrà dâu tằm | 32k | 38k\n## Đá xay | M | L\nMatcha đá xay | 42k | 48k\nSô cô la đá xay | 42k | 48k\nCookie đá xay | 45k | 52k',
    toppingsTitle: 'Topping', toppings: 'Trân châu đen 5k, Trân châu trắng 6k, Pudding trứng 7k, Thạch đào 6k, Kem cheese 10k, Flan 8k',
    combo: 'Combo đôi | 2 ly trà sữa size L + 1 topping | 69k', hotline: '0938 456 789', note: 'Ít đá · ít ngọt theo ý bạn',
  },
  banhmi: {
    brand: 'BÁNH MÌ GIA KHÁNH', slogan: 'Giòn rụm từ 1998',
    menu: '## Bánh mì\n*Bánh mì thập cẩm | 30k\n+Bánh mì đặc biệt | 40k\nBánh mì xíu mại | 25k\nBánh mì gà xé | 25k\nBánh mì ốp la | 22k\nBánh mì chả cá | 25k | mới\nBánh mì chay | 20k\n## Ăn kèm\nXíu mại chén | 25k\nTrứng ốp la | 8k\nPa tê thêm | 6k\n## Nước uống\nSữa đậu nành | 12k\nTrà tắc | 15k\nCà phê sữa đá | 20k',
    toppingsTitle: 'Thêm nhân', toppings: 'Chả lụa 8k, Thịt nguội 10k, Xíu mại 10k, Trứng 8k',
    combo: 'Combo no nê | Bánh mì đặc biệt + sữa đậu nành | 49k', hotline: '0912 345 678', note: 'Mở cửa 5:30 – 21:00 · Nhận đặt sỉ',
  },
  com: {
    brand: 'CƠM TẤM QUỐC BẢO', slogan: 'Sườn nướng than hồng',
    menu: '## Cơm tấm\n*Cơm sườn nướng | 45k\n+Cơm sườn bì chả | 55k\nCơm sườn ốp la | 52k\nCơm gà nướng | 48k\nCơm chả trứng | 40k\nCơm bì chả | 38k\n## Món thêm\nSườn thêm | 25k\nChả trứng | 12k\nTrứng ốp la | 8k\nCanh chua | 15k | mới\n## Nước\nTrà đá | 3k\nNước sâm | 12k\nNước mía | 15k',
    toppingsTitle: 'Thêm cơm & đồ chua', toppings: 'Thêm cơm 5k, Đồ chua 5k, Mỡ hành 3k, Nước mắm 3k',
    combo: 'Combo trưa | Cơm sườn + canh + trà đá | 59k', hotline: '0903 678 910', note: 'Giao tận nơi trong 3km',
  },
};
export const defaultMBDData = (ind: MBDIndustry): MBDData => ({ ...SAMPLES[ind] });

// ---------- phân tích thực đơn ----------
export interface MBDItem { name: string; prices: string[]; desc: string; best: boolean; hero: boolean; isNew: boolean }
export interface MBDSection { title: string; labels: string[]; items: MBDItem[]; cols: number }
const isPrice = (s: string) => /^[\d.,]+\s*(k|đ|d|vnđ|vnd)?$/i.test(s.replace(/\s/g, ''));
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim();
export function parseBoardMenu(text: string): MBDSection[] {
  const out: MBDSection[] = [];
  let cur: MBDSection | null = null;
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const parts = line.replace(/^#+\s*/, '').split('|').map((s) => s.trim());
      cur = { title: parts[0] || '', labels: parts.slice(1).filter(Boolean), items: [], cols: 0 };
      out.push(cur); continue;
    }
    const parts = line.split('|').map((s) => s.trim());
    let name = parts[0] || '';
    let best = false, hero = false, isNew = false, desc = '';
    for (;;) {
      if (name.startsWith('*')) { best = true; name = name.slice(1).trim(); continue; }
      if (name.startsWith('+')) { hero = true; name = name.slice(1).trim(); continue; }
      break;
    }
    if (!name) continue;
    const prices: string[] = [];
    for (const p of parts.slice(1)) {
      const n = norm(p);
      if (p === '' || isPrice(p)) prices.push(p);
      else if (['moi', 'new'].includes(n)) isNew = true;
      else if (['best', 'hot', 'bestseller'].includes(n)) best = true;
      else if (!desc) desc = p;
    }
    while (prices.length && prices[prices.length - 1] === '') prices.pop();
    if (!cur) { cur = { title: '', labels: [], items: [], cols: 0 }; out.push(cur); }
    cur.items.push({ name, prices, desc, best, hero, isNew });
  }
  for (const s of out) {
    s.cols = Math.max(1, s.labels.length, ...s.items.map((i) => i.prices.length));
    if (s.cols > 1 && s.labels.length < s.cols) s.labels = s.cols === 2 ? ['M', 'L'] : ['S', 'M', 'L'].slice(0, s.cols);
    if (s.cols === 1 && s.labels.length === 1) s.labels = [];
  }
  return out.filter((s) => s.items.length);
}
export const heroItems = (text: string) => parseBoardMenu(text).flatMap((s) => s.items).filter((i) => i.hero);

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function tw(t: string, size: number, fam: string, wt: number, ls = 0): number {
  const s = t || '';
  const extra = ls * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.56 + extra;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.56 + extra;
  mctx.font = `${wt} ${size * 10}px "${fam}"`;
  return mctx.measureText(s).width / 10 + extra;
}
function wrap(text: string, maxW: number, size: number, fam: string, wt: number): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const out: string[] = []; let cur = '';
  for (const w of words) {
    const nx = cur ? `${cur} ${w}` : w;
    if (!cur || tw(nx, size, fam, wt) <= maxW) cur = nx; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}
/** co tới khi ≤ maxLines dòng, cân dòng; vẫn dư → cắt "…" */
function fit(text: string, maxW: number, size: number, fam: string, wt: number, maxLines: number, minScale = 0.6): { lines: string[]; size: number } {
  let s = size;
  let lines = wrap(text, maxW, s, fam, wt);
  while (lines.length > maxLines && s > size * minScale) { s *= 0.95; lines = wrap(text, maxW, s, fam, wt); }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && tw(`${last}…`, s, fam, wt) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
  } else if (lines.length > 1) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(text, mid, s, fam, wt).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrap(text, hi, s, fam, wt);
  }
  for (let i = 0; i < 30; i++) {
    const widest = Math.max(0, ...lines.map((l) => tw(l, s, fam, wt)));
    if (widest <= maxW) break;
    s *= Math.max(0.8, Math.min(0.98, maxW / widest));
  }
  return { lines, size: s };
}
const up = (s: string, on: boolean) => (on ? s.toLocaleUpperCase('vi') : s);

// ---------- hình minh hoạ món (vẽ code) ----------
export type IlloKind = 'iced' | 'hot' | 'milktea' | 'frappe' | 'juice' | 'banhmi' | 'rice';
export function illoFor(name: string, ind: MBDIndustry): IlloKind {
  const n = norm(name);
  if (/banh mi/.test(n)) return 'banhmi';
  if (/com|suon/.test(n)) return 'rice';
  if (/tran chau|tra sua|milk|khoai mon/.test(n)) return 'milktea';
  if (/da xay|smoothie|frappe|sua chua/.test(n)) return 'frappe';
  if (/dao|vai|chanh|cam|nuoc ep|dau/.test(n)) return 'juice';
  if (/nong|espresso|latte|cappuccino/.test(n)) return 'hot';
  if (/ca phe|bac xiu|cold brew/.test(n)) return 'iced';
  return ind === 'trasua' ? 'milktea' : ind === 'banhmi' ? 'banhmi' : ind === 'com' ? 'rice' : 'iced';
}
/** minh hoạ trong ô vuông (x,y,size). line = nét phấn/neon trên nền tối; color = tô màu */
export function Illo({ kind, x, y, s, line, ink, acc, acc2 }: { kind: IlloKind; x: number; y: number; s: number; line: boolean; ink: string; acc: string; acc2: string }) {
  const sw = s * 0.022;
  const st = { stroke: line ? ink : '#3A2618', strokeWidth: sw, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };
  const F = (c: string, o = 1) => (line ? { fill: c, fillOpacity: 0.16 * o } : { fill: c });
  const P = (px: number, py: number) => `${x + px * s} ${y + py * s}`;
  const glass = (top: number, bot: number, l1: number, r1: number, l2: number, r2: number) => `M${P(l1, top)} L${P(r1, top)} L${P(r2, bot)} L${P(l2, bot)} Z`;
  const steam = [0.38, 0.5, 0.62].map((sx, i) => <path key={i} d={`M${P(sx, 0.32)} q${s * 0.05} ${-s * 0.06} 0 ${-s * 0.11} q${-s * 0.05} ${-s * 0.06} 0 ${-s * 0.11}`} fill="none" {...st} stroke={line ? ink : '#B9A795'} />);
  switch (kind) {
    case 'iced': return (
      <g>
        <path d={glass(0.4, 0.92, 0.3, 0.7, 0.35, 0.65)} {...F('#6B3E26')} />
        <path d={glass(0.24, 0.4, 0.28, 0.72, 0.3, 0.7)} {...F('#E9D2B3')} />
        {[[0.36, 0.27], [0.52, 0.3], [0.44, 0.44]].map(([a, b], i) => <rect key={i} x={x + a * s} y={y + b * s} width={s * 0.13} height={s * 0.12} rx={s * 0.025} fill={line ? ink : '#FFFFFF'} fillOpacity={line ? 0.2 : 0.75} stroke={line ? ink : '#D9CBB8'} strokeWidth={sw * 0.7} />)}
        <path d={`M${P(0.6, 0.06)} L${P(0.54, 0.6)}`} fill="none" stroke={acc} strokeWidth={s * 0.045} strokeLinecap="round" />
        <path d={glass(0.18, 0.92, 0.27, 0.73, 0.35, 0.65)} fill="none" {...st} />
        <path d={`M${P(0.33, 0.3)} L${P(0.37, 0.82)}`} fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={sw * 1.2} strokeLinecap="round" />
      </g>
    );
    case 'milktea': return (
      <g>
        <path d={glass(0.3, 0.93, 0.3, 0.7, 0.36, 0.64)} {...F('#C99A6B')} />
        {Array.from({ length: 11 }, (_, i) => <circle key={i} cx={x + (0.39 + (i % 4) * 0.07 + (Math.floor(i / 4) % 2) * 0.03) * s} cy={y + (0.86 - Math.floor(i / 4) * 0.055) * s} r={s * 0.027} fill={line ? ink : '#2B1B14'} fillOpacity={line ? 0.7 : 1} />)}
        <path d={`M${P(0.6, 0.04)} L${P(0.53, 0.62)}`} fill="none" stroke={acc} strokeWidth={s * 0.06} strokeLinecap="round" />
        <path d={`M${P(0.27, 0.3)} Q${P(0.5, 0.1)} ${P(0.73, 0.3)} Z`} {...F('#FFFFFF', 0.6)} fillOpacity={line ? 0.1 : 0.55} {...st} />
        <path d={glass(0.3, 0.93, 0.3, 0.7, 0.36, 0.64)} fill="none" {...st} />
        <rect x={x + 0.34 * s} y={y + 0.5 * s} width={s * 0.32} height={s * 0.12} rx={s * 0.02} fill={acc2} fillOpacity={line ? 0.35 : 0.9} />
      </g>
    );
    case 'frappe': return (
      <g>
        <path d={glass(0.36, 0.93, 0.3, 0.7, 0.36, 0.64)} {...F('#8A5A3C')} />
        {[0.32, 0.24, 0.17].map((yy, i) => <ellipse key={i} cx={x + 0.5 * s} cy={y + yy * s} rx={s * (0.21 - i * 0.05)} ry={s * 0.06} {...F('#FFF6EA')} fillOpacity={line ? 0.15 : 1} {...st} />)}
        <path d={`M${P(0.37, 0.3)} q${s * 0.06} ${s * 0.05} ${s * 0.12} 0 t${s * 0.12} 0`} fill="none" stroke="#6B3E26" strokeWidth={sw * 1.3} />
        <path d={`M${P(0.6, 0.02)} L${P(0.55, 0.2)}`} fill="none" stroke={acc} strokeWidth={s * 0.05} strokeLinecap="round" />
        <path d={glass(0.36, 0.93, 0.3, 0.7, 0.36, 0.64)} fill="none" {...st} />
      </g>
    );
    case 'juice': return (
      <g>
        <path d={glass(0.34, 0.92, 0.3, 0.7, 0.35, 0.65)} {...F('#F2994A')} />
        <path d={glass(0.2, 0.92, 0.28, 0.72, 0.35, 0.65)} fill="none" {...st} />
        <circle cx={x + 0.71 * s} cy={y + 0.22 * s} r={s * 0.12} {...F('#F7C948')} {...st} />
        {Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return <line key={i} x1={x + 0.71 * s} y1={y + 0.22 * s} x2={x + (0.71 + Math.cos(a) * 0.1) * s} y2={y + (0.22 + Math.sin(a) * 0.1) * s} stroke={line ? ink : '#E08A1E'} strokeWidth={sw * 0.7} />; })}
        <path d={`M${P(0.44, 0.06)} L${P(0.47, 0.6)}`} fill="none" stroke={acc2} strokeWidth={s * 0.04} strokeLinecap="round" />
        {[[0.4, 0.5], [0.55, 0.62], [0.45, 0.75]].map(([a, b], i) => <circle key={i} cx={x + a * s} cy={y + b * s} r={s * 0.025} fill="#FFFFFF" fillOpacity={0.6} />)}
      </g>
    );
    case 'hot': return (
      <g>
        {steam}
        <ellipse cx={x + 0.48 * s} cy={y + 0.86 * s} rx={s * 0.36} ry={s * 0.07} {...F('#FFFFFF', 0.5)} fillOpacity={line ? 0.1 : 1} {...st} />
        <path d={`M${P(0.24, 0.42)} L${P(0.72, 0.42)} Q${P(0.7, 0.82)} ${P(0.48, 0.82)} Q${P(0.26, 0.82)} ${P(0.24, 0.42)} Z`} {...F(acc)} fillOpacity={line ? 0.18 : 1} {...st} />
        <path d={`M${P(0.71, 0.5)} q${s * 0.16} ${s * 0.0} ${s * 0.1} ${s * 0.15} q${-s * 0.03} ${s * 0.07} ${-s * 0.13} ${s * 0.05}`} fill="none" {...st} />
        <ellipse cx={x + 0.48 * s} cy={y + 0.43 * s} rx={s * 0.24} ry={s * 0.05} fill={line ? ink : '#6B3E26'} fillOpacity={line ? 0.35 : 1} />
      </g>
    );
    case 'banhmi': return (
      <g transform={`rotate(-14 ${x + 0.5 * s} ${y + 0.55 * s})`}>
        <path d={`M${P(0.1, 0.62)} Q${P(0.12, 0.38)} ${P(0.5, 0.36)} Q${P(0.9, 0.36)} ${P(0.92, 0.6)} Q${P(0.9, 0.74)} ${P(0.5, 0.74)} Q${P(0.1, 0.76)} ${P(0.1, 0.62)} Z`} {...F('#D99A4E')} {...st} />
        <path d={`M${P(0.16, 0.6)} Q${P(0.5, 0.52)} ${P(0.86, 0.58)}`} fill="none" stroke={line ? acc2 : '#5E9C3A'} strokeWidth={s * 0.05} strokeLinecap="round" />
        <path d={`M${P(0.2, 0.6)} Q${P(0.5, 0.56)} ${P(0.8, 0.6)}`} fill="none" stroke={line ? acc : '#C0392B'} strokeWidth={s * 0.025} strokeDasharray={`${s * 0.06} ${s * 0.05}`} strokeLinecap="round" />
        {[0.3, 0.45, 0.6, 0.75].map((a, i) => <path key={i} d={`M${P(a - 0.04, 0.44)} q${s * 0.04} ${-s * 0.03} ${s * 0.09} ${-s * 0.01}`} fill="none" stroke={line ? ink : '#F3D29B'} strokeWidth={sw * 1.2} strokeLinecap="round" />)}
      </g>
    );
    case 'rice': default: return (
      <g>
        <ellipse cx={x + 0.5 * s} cy={y + 0.66 * s} rx={s * 0.44} ry={s * 0.2} {...F('#FFFFFF', 0.5)} fillOpacity={line ? 0.1 : 1} {...st} />
        <ellipse cx={x + 0.5 * s} cy={y + 0.66 * s} rx={s * 0.34} ry={s * 0.14} fill="none" stroke={line ? ink : '#E3DCD2'} strokeWidth={sw * 0.7} />
        <path d={`M${P(0.22, 0.66)} Q${P(0.3, 0.42)} ${P(0.46, 0.46)} Q${P(0.56, 0.5)} ${P(0.56, 0.66)} Z`} {...F('#FBF7EE')} fillOpacity={line ? 0.15 : 1} {...st} />
        <path d={`M${P(0.5, 0.6)} Q${P(0.6, 0.44)} ${P(0.8, 0.5)} Q${P(0.84, 0.64)} ${P(0.62, 0.7)} Q${P(0.5, 0.7)} ${P(0.5, 0.6)} Z`} {...F('#9C4A1F')} {...st} />
        <path d={`M${P(0.58, 0.58)} l${s * 0.15} ${-s * 0.03} M${P(0.58, 0.63)} l${s * 0.17} ${-s * 0.03}`} stroke={line ? ink : '#6E2F12'} strokeWidth={sw} />
        <ellipse cx={x + 0.32 * s} cy={y + 0.42 * s} rx={s * 0.1} ry={s * 0.06} {...F('#FFFFFF')} fillOpacity={line ? 0.15 : 1} {...st} />
        <circle cx={x + 0.32 * s} cy={y + 0.42 * s} r={s * 0.035} fill={line ? acc : '#F5B82E'} />
        {[0.7, 0.78].map((a, i) => <circle key={i} cx={x + a * s} cy={y + 0.75 * s} r={s * 0.04} fill={line ? acc2 : '#7CB65A'} fillOpacity={line ? 0.5 : 1} stroke={line ? ink : '#4E8A35'} strokeWidth={sw * 0.6} />)}
      </g>
    );
  }
}

// ---------- mô hình bố cục ----------
export interface MBDTopping { name: string; price: string }
export interface MBDCombo { name: string; desc: string; price: string }
type Atom =
  | { t: 'head'; sec: number; labels: boolean }
  | { t: 'labels'; sec: number }
  | { t: 'item'; sec: number; it: MBDItem }
  | { t: 'hero'; sec: number; it: MBDItem }
  | { t: 'tops' }
  | { t: 'combo'; i: number };
interface Placed { atom: Atom; x: number; y: number; w: number; h: number; cont?: boolean; labelsOnly?: boolean }
export interface PanelModel { band: { kind: 'brand' } | { kind: 'title'; text: string } | { kind: 'empty' }; placed: Placed[] }
export interface BoardModel {
  W: number; H: number; n: number; s: number; overflow: boolean; dropped: number;
  bandH: number; footH: number; pad: number; R: number;
  panels: PanelModel[]; sections: MBDSection[]; tops: MBDTopping[]; combos: MBDCombo[];
}

function parseTops(text: string): MBDTopping[] {
  return (text || '').split(/[,\n]/).map((x) => x.trim()).filter(Boolean).map((t) => {
    const m = t.match(/^(.*?)[\s:–-]+([\d.,]+\s*(k|đ|d)?)$/i);
    return m ? { name: m[1].trim(), price: m[2].trim() } : { name: t, price: '' };
  }).slice(0, 12);
}
function parseCombos(text: string): MBDCombo[] {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2).map((l) => {
    const [name = '', desc = '', price = ''] = l.split('|').map((x) => x.trim());
    return { name, desc, price };
  }).filter((c) => c.name || c.desc);
}

interface Ctx { spec: MBDSpec; pal: MBDPalette; font: MBDFont; R: number; s: number; secs: MBDSection[]; tops: MBDTopping[]; combos: MBDCombo[]; data: MBDData }
const sizes = (c: Ctx) => {
  const f = 0.04 * c.R * c.s;
  return { f, desc: f * 0.6, head: f * 1.45, label: f * 0.62, gap: f * 0.48, price: f * 1.02 };
};
const priceStr = (c: Ctx, p: string) => (p ? fmtPrice(p, c.spec.price) : '');
function priceColW(c: Ctx, sec: MBDSection): number {
  const z = sizes(c);
  let w = 0;
  for (const it of sec.items) for (const p of it.prices) w = Math.max(w, tw(priceStr(c, p), z.price, PRICE, 700));
  for (const l of sec.labels) w = Math.max(w, tw(l, z.label, BODY, 800));
  return Math.max(w, z.f * 1.6) + z.f * 0.55;
}
// đo từng mảnh: chiều cao + thông tin vẽ
interface ItemLay { nameLines: string[]; nameSize: number; descLine: string; h: number; pw: number }
function layItem(c: Ctx, sec: MBDSection, it: MBDItem, w: number): ItemLay {
  const z = sizes(c);
  const pw = priceColW(c, sec) * sec.cols;
  const tagW = (it.best ? z.f * 1.55 : 0) + (it.isNew ? z.f * 1.55 : 0);
  const avail = Math.max(w * 0.3, w - pw - z.f * 0.6 - tagW);
  const one = tw(it.name, z.f, BODY, 600);
  let nameLines = [it.name], nameSize = z.f;
  if (one > avail) {
    if (one * 0.84 <= avail) nameSize = (z.f * avail) / one;
    else { const r = fit(it.name, avail, z.f * 0.92, BODY, 600, 2, 0.7); nameLines = r.lines; nameSize = r.size; }
  }
  let descLine = '';
  if (it.desc) {
    descLine = it.desc;
    const dw = w - pw - z.f * 0.6;
    while (descLine.length > 1 && tw(descLine, z.desc, BODY, 600) > dw) descLine = `${descLine.slice(0, -2).trimEnd()}…`;
  }
  const h = nameLines.length * nameSize * 1.3 + (descLine ? z.desc * 1.35 : 0) + z.gap;
  return { nameLines, nameSize, descLine, h, pw };
}
const headH = (c: Ctx, sec: MBDSection, labelsOnly = false, labels = true) => {
  const z = sizes(c);
  return (labelsOnly ? 0 : z.head * 1.3 + z.f * 0.35) + (labels && sec.cols > 1 ? z.label * 1.6 : z.f * 0.2);
};
interface HeroLay { img: number; badge: number; nameLines: string[]; nameSize: number; price: number; ptxt: string; h: number; descLines: string[] }
function layHero(c: Ctx, it: MBDItem, w: number): HeroLay {
  const z = sizes(c);
  const img = Math.min(w * 0.4, c.R * 0.3 * c.s);
  const tw0 = w - img - z.f * 0.7;
  const n = fit(it.name, tw0, z.f * 1.35, BODY, 800, 2, 0.65);
  const descLines = it.desc ? fit(it.desc, tw0, z.desc, BODY, 600, 2, 0.8).lines : [];
  const badge = z.f * 0.72;
  const prices = it.prices.map((p) => priceStr(c, p)).filter(Boolean);
  const ptxt = prices.length > 1 ? `${prices[0]} – ${prices[prices.length - 1]}` : prices[0] || '';
  const price = Math.min(z.f * 1.7, ptxt ? (z.f * 1.7 * tw0) / Math.max(1, tw(ptxt, z.f * 1.7, PRICE, 700)) : z.f * 1.7);
  const textH = badge * 1.9 + n.lines.length * n.size * 1.22 + descLines.length * z.desc * 1.3 + price * 1.25;
  return { img, badge, nameLines: n.lines, nameSize: n.size, price, ptxt, h: Math.max(img, textH) + z.gap * 1.6, descLines };
}
interface TopsLay { rows: { name: string; price: string; w: number; x: number }[][]; chip: number; h: number; title: number }
function layTops(c: Ctx, w: number): TopsLay {
  const z = sizes(c);
  const chip = z.f * 0.74, padX = chip * 0.7, gap = chip * 0.55, title = z.f * 0.95;
  const rows: TopsLay['rows'] = [[]];
  let x = 0;
  const inner = w - z.f * 1.2;
  for (const t of c.tops) {
    const pr = priceStr(c, t.price);
    const cw = tw(t.name, chip, BODY, 600) + (pr ? tw(` ${pr}`, chip, BODY, 800) : 0) + padX * 2;
    if (x > 0 && x + cw > inner) { rows.push([]); x = 0; }
    rows[rows.length - 1].push({ name: t.name, price: pr, w: Math.min(cw, inner), x });
    x += cw + gap;
  }
  const h = z.f * 0.6 + title * 1.5 + rows.length * chip * 2.1 + z.f * 0.5 + z.gap;
  return { rows, chip, h, title };
}
interface ComboLay { nameSize: number; nameLines: string[]; descLines: string[]; desc: number; circle: number; h: number }
function layCombo(c: Ctx, cb: MBDCombo, w: number): ComboLay {
  const z = sizes(c);
  const circle = z.f * 3.4;
  const tw0 = w - circle - z.f * 1.6;
  const n = fit(up(cb.name, true), tw0, z.f * 1.1, BODY, 800, 1, 0.6);
  const d = fit(cb.desc, tw0, z.desc * 1.1, BODY, 600, 2, 0.75);
  const textH = n.size * 1.4 + d.lines.length * d.size * 1.35;
  return { nameSize: n.size, nameLines: n.lines, descLines: d.lines, desc: d.size, circle, h: Math.max(circle + z.f * 0.6, textH + z.f * 1.2) + z.gap };
}

function atomH(c: Ctx, a: Atom, w: number): number {
  if (a.t === 'head') return headH(c, c.secs[a.sec], false, a.labels);
  if (a.t === 'labels') return headH(c, c.secs[a.sec], true, true);
  if (a.t === 'item') return layItem(c, c.secs[a.sec], a.it, w).h;
  if (a.t === 'hero') return layHero(c, a.it, w).h;
  if (a.t === 'tops') return layTops(c, w).h;
  return layCombo(c, c.combos[a.i], w).h;
}

export function buildBoard(spec: MBDSpec, data: MBDData): BoardModel {
  const sz = mbdSize(spec.size);
  const W = sz.wMm, H = sz.hMm, n = Math.max(1, Math.min(4, spec.panels));
  const R = Math.min(W, H);
  const pad = 0.055 * R;
  const bandH = (H > W ? 0.17 : 0.2) * H;
  const footH = 0.085 * H;
  const cols = W / H >= 1.2 ? 2 : 1;
  const colGap = 0.05 * W;
  const colW = (W - pad * 2 - (cols - 1) * colGap) / cols;
  const bodyTop = bandH + pad * 0.55, bodyH = H - footH - pad * 0.45 - bodyTop;
  const secs = parseBoardMenu(data.menu || '');
  const tops = parseTops(data.toppings || '');
  const combos = parseCombos(data.combo || '');
  const pal = mbdPalette(spec.palette), font = mbdFont(spec.font);

  const atoms: Atom[] = [];
  secs.forEach((sec, i) => {
    const heroes = sec.items.filter((it) => it.hero);
    // có món nổi bật: nhãn cột M/L đặt ngay trên hàng giá (sau ảnh), không treo trên ảnh
    atoms.push({ t: 'head', sec: i, labels: !heroes.length });
    for (const it of heroes) atoms.push({ t: 'hero', sec: i, it });
    if (heroes.length && sec.cols > 1 && sec.items.some((it) => !it.hero)) atoms.push({ t: 'labels', sec: i });
    for (const it of sec.items) if (!it.hero) atoms.push({ t: 'item', sec: i, it });
  });
  if (tops.length) atoms.push({ t: 'tops' });
  combos.forEach((_, i) => atoms.push({ t: 'combo', i }));

  const nSlots = n * cols;
  const slotX = (k: number) => pad + (k % cols) * (colW + colGap);
  // chạy dòng chảy với hệ số chữ s, sức chứa mỗi cột cap → vị trí từng mảnh
  const flow = (s: number, cap: number) => {
    const c: Ctx = { spec, pal, font, R, s, secs, tops, combos, data };
    const z = sizes(c);
    const slots: { placed: Placed[]; used: number }[] = Array.from({ length: nSlots }, () => ({ placed: [], used: 0 }));
    let k = 0, placedN = 0, ok = true;
    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      if (k >= nSlots) { ok = false; break; }
      let h = atomH(c, a, colW);
      const gapTop = a.t === 'head' || a.t === 'tops' || a.t === 'combo' ? z.f * 0.55 : 0;
      // tiêu đề nhóm phải đi kèm ≥1 món
      const nextH = (a.t === 'head' || a.t === 'labels') && atoms[i + 1] && atoms[i + 1].t !== 'head' ? atomH(c, atoms[i + 1], colW) : 0;
      const need = (sl: { used: number }) => (sl.used ? gapTop : 0) + h + nextH;
      while (k < nSlots && slots[k].used + need(slots[k]) > cap && slots[k].used > 0) k++;
      if (k >= nSlots) { ok = false; break; }
      const sl = slots[k];
      // đầu tấm 2,3,4: tên nhóm lên dải đầu tấm → trong thân chỉ còn nhãn cột M/L
      const bandTop = sl.used === 0 && k >= cols && k % cols === 0;
      // nhóm đang chảy sang cột/tấm mới → chèn lại tiêu đề nhóm (đánh dấu "tiếp")
      if (sl.used === 0 && (a.t === 'item' || a.t === 'hero' || a.t === 'labels')) {
        const lab = a.t !== 'hero';
        // cột 2 cùng tấm: không lặp tiêu đề nhóm, chỉ giữ nhãn cột
        const noTitle = bandTop || k % cols !== 0;
        const ch = headH(c, secs[a.sec], noTitle, lab);
        sl.placed.push({ atom: { t: 'head', sec: a.sec, labels: lab }, x: slotX(k), y: 0, w: colW, h: ch, cont: true, labelsOnly: noTitle });
        sl.used += ch;
        if (a.t === 'labels') { placedN++; continue; } // tiêu đề "tiếp" đã kèm nhãn cột
      }
      if (a.t === 'head' && bandTop) h = headH(c, secs[a.sec], true, a.labels);
      if (h > cap - sl.used) {
        if (sl.used === 0 || h > cap) { ok = false; }
        h = Math.min(h, Math.max(0, cap - sl.used));
        if (!ok) break;
      }
      const top = sl.used ? gapTop : 0;
      sl.placed.push({ atom: a, x: slotX(k), y: sl.used + top, w: colW, h, labelsOnly: a.t === 'head' && bandTop });
      sl.used += top + h;
      placedN++;
    }
    return { slots, ok, placedN, z };
  };
  // tìm s lớn nhất vừa hết
  let lo = 0.5, hi = 1.4, best = -1;
  for (let i = 0; i < 16; i++) { const mid = (lo + hi) / 2; if (flow(mid, bodyH).ok) { best = mid; lo = mid; } else hi = mid; }
  let s = best > 0 ? best * 0.985 : 0.5;
  let overflow = best < 0;
  // cân đều các cột: sức chứa nhỏ nhất mà vẫn vừa
  let cap = bodyH;
  if (!overflow) {
    let cl = bodyH * 0.35, ch = bodyH;
    for (let i = 0; i < 14; i++) { const mid = (cl + ch) / 2; if (flow(s, mid).ok) ch = mid; else cl = mid; }
    cap = Math.min(bodyH, ch * 1.02);
  } else s = 0.5;
  const res = flow(s, cap);
  if (!res.ok) overflow = true;
  const dropped = atoms.length - res.placedN;

  // dàn đều theo chiều dọc: nới khoảng cách (có trần), phần dư chia đều trên/dưới
  const panels: PanelModel[] = Array.from({ length: n }, () => ({ band: { kind: 'empty' } as PanelModel['band'], placed: [] }));
  res.slots.forEach((sl, k) => {
    const p = Math.floor(k / cols);
    if (!sl.placed.length) return;
    const used = sl.used;
    const extra = Math.max(0, bodyH - used);
    const gaps = sl.placed.length;
    const per = Math.min(extra / (gaps + 1), res.z.f * 0.9);
    const rest = extra - per * (gaps - 1);
    const off = rest * 0.35;
    sl.placed.forEach((pl, i) => panels[p].placed.push({ ...pl, y: bodyTop + off + pl.y + per * i }));
  });
  // dải đầu: tấm 1 = tên quán; tấm sau = tên nhóm đầu tiên trên tấm (tiêu đề đó không vẽ lại trong thân, chỉ giữ nhãn M/L)
  panels.forEach((pm, i) => {
    if (i === 0) { pm.band = { kind: 'brand' }; return; }
    const first = pm.placed.find((pl) => pl.x === pad);
    if (first && (first.atom.t === 'head' || first.atom.t === 'item' || first.atom.t === 'hero')) {
      const sec = secs[(first.atom as { sec: number }).sec];
      pm.band = { kind: 'title', text: sec.title || 'Menu' };
    } else if (first && first.atom.t === 'tops') pm.band = { kind: 'title', text: data.toppingsTitle || 'Topping' };
    else if (first && first.atom.t === 'combo') pm.band = { kind: 'title', text: 'Combo ưu đãi' };
    else pm.band = { kind: 'title', text: data.slogan || 'Menu' };
  });
  return { W, H, n, s, overflow, dropped, bandH, footH, pad, R, panels, sections: secs, tops, combos };
}

// ---------- vẽ ----------
export interface MBDRenderProps { model: BoardModel; spec: MBDSpec; data: MBDData; photos: Record<string, string>; logo: string }

function Background({ k, model, pal, idp, b }: { k: number; model: BoardModel; pal: MBDPalette; idp: string; b: number }) {
  const { W, H, bandH, footH, pad } = model;
  const box = { x: -b, y: -b, w: W + b * 2, h: H + b * 2 };
  let seed = 11 + k * 97; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const base = <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={pal.bg} />;
  if (pal.kind === 'chalk') {
    const smudges = Array.from({ length: 7 }, (_, i) => <ellipse key={i} cx={rnd() * W} cy={rnd() * H} rx={W * (0.12 + rnd() * 0.18)} ry={H * (0.05 + rnd() * 0.08)} fill="#FFFFFF" fillOpacity={0.035} filter={`url(#${idp}blur)`} />);
    const dust = Array.from({ length: 420 }, (_, i) => <circle key={i} cx={rnd() * W} cy={rnd() * H} r={0.4 + rnd() * 1.1} fill="#FFFFFF" fillOpacity={0.05 + rnd() * 0.08} />);
    const inset = pad * 0.45;
    return <g>{base}<rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${idp}vig)`} />{smudges}{dust}
      <rect x={inset} y={inset} width={W - inset * 2} height={H - inset * 2} rx={6} fill="none" stroke={pal.ink} strokeOpacity={0.55} strokeWidth={2.2} strokeDasharray="22 6 3 6" />
      <rect x={inset + 8} y={inset + 8} width={W - inset * 2 - 16} height={H - inset * 2 - 16} rx={4} fill="none" stroke={pal.ink} strokeOpacity={0.25} strokeWidth={1.2} /></g>;
  }
  if (pal.kind === 'modern') {
    return <g>{base}
      <circle cx={W * (k % 2 ? 0.05 : 0.95)} cy={H * 0.98} r={R(model) * 0.42} fill={pal.bg2} />
      <circle cx={W * (k % 2 ? 0.98 : 0.02)} cy={H * 0.3} r={R(model) * 0.18} fill={pal.bg2} fillOpacity={0.8} />
      <rect x={box.x} y={box.y} width={box.w} height={bandH + b} fill={pal.acc} />
      <rect x={box.x} y={H - footH} width={box.w} height={footH + b} fill={pal.ink} />
    </g>;
  }
  if (pal.kind === 'wood') {
    const pw = 120;
    const planks = Array.from({ length: Math.ceil((W + b * 2) / pw) + 1 }, (_, i) => {
      const x0 = box.x + i * pw;
      const grains = Array.from({ length: 7 }, (_, j) => {
        const gx = x0 + 8 + rnd() * (pw - 16);
        return <path key={j} d={`M${gx} ${box.y} C ${gx + (rnd() - 0.5) * 30} ${H * 0.3}, ${gx + (rnd() - 0.5) * 30} ${H * 0.7}, ${gx + (rnd() - 0.5) * 16} ${H + b}`} fill="none" stroke={pal.bg2} strokeOpacity={0.55} strokeWidth={1 + rnd() * 2} />;
      });
      return <g key={i}><rect x={x0} y={box.y} width={pw} height={box.h} fill={i % 2 ? pal.bg : shade(pal.bg, -0.06)} />{grains}<line x1={x0} y1={box.y} x2={x0} y2={H + b} stroke="#000" strokeOpacity={0.18} strokeWidth={2} /></g>;
    });
    return <g>{planks}
      <rect x={pad * 0.6} y={bandH} width={W - pad * 1.2} height={H - bandH - footH} rx={10} fill={pal.paper} />
      <rect x={pad * 0.6 + 7} y={bandH + 7} width={W - pad * 1.2 - 14} height={H - bandH - footH - 14} rx={6} fill="none" stroke={pal.acc} strokeOpacity={0.35} strokeWidth={1.5} />
    </g>;
  }
  if (pal.kind === 'neon') {
    const bh = 60, bw = 140;
    const bricks: ReactNode[] = [];
    for (let r = 0; r * bh < H + b; r++) {
      bricks.push(<line key={`h${r}`} x1={box.x} y1={r * bh} x2={W + b} y2={r * bh} stroke={pal.bg2} strokeWidth={3} />);
      for (let cI = 0; cI * bw < W + bw; cI++) { const x0 = cI * bw + (r % 2 ? bw / 2 : 0); bricks.push(<line key={`v${r}-${cI}`} x1={x0} y1={r * bh} x2={x0} y2={r * bh + bh} stroke={pal.bg2} strokeWidth={3} />); }
    }
    const inset = pad * 0.45;
    return <g>{base}{bricks}<rect x={box.x} y={box.y} width={box.w} height={box.h} fill={`url(#${idp}vig)`} />
      <rect x={inset} y={inset} width={W - inset * 2} height={H - inset * 2} rx={18} fill="none" stroke={k % 2 ? pal.acc2 : pal.acc} strokeWidth={4} filter={`url(#${idp}glow)`} /></g>;
  }
  // kraft
  const dots = Array.from({ length: 900 }, (_, i) => <circle key={i} cx={rnd() * W} cy={rnd() * H} r={0.4 + rnd() * 1.3} fill={rnd() > 0.5 ? '#5A3A1C' : '#F3DDB8'} fillOpacity={0.08 + rnd() * 0.12} />);
  const fibres = Array.from({ length: 60 }, (_, i) => { const x0 = rnd() * W, y0 = rnd() * H; return <path key={i} d={`M${x0} ${y0} q${8 + rnd() * 12} ${(rnd() - 0.5) * 8} ${18 + rnd() * 20} ${(rnd() - 0.5) * 6}`} fill="none" stroke="#7A5530" strokeOpacity={0.12} strokeWidth={0.8} />; });
  const inset = pad * 0.45;
  return <g>{base}{dots}{fibres}
    <rect x={box.x} y={box.y} width={box.w} height={bandH + b} fill={pal.ink} />
    <rect x={inset} y={bandH + inset * 0.4} width={W - inset * 2} height={H - bandH - inset * 1.4} rx={4} fill="none" stroke={pal.ink} strokeOpacity={0.7} strokeWidth={2} strokeDasharray="10 7" />
  </g>;
}
const R = (m: BoardModel) => m.R;
export function shade(hex: string, k: number): string {
  const nn = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  const r = f((nn >> 16) & 255), g = f((nn >> 8) & 255), bb = f(nn & 255);
  return `#${((r << 16) | (g << 8) | bb).toString(16).padStart(6, '0')}`;
}

function bandColors(pal: MBDPalette) {
  switch (pal.kind) {
    case 'modern': return { ink: pal.onAcc, sub: shade(pal.acc, 0.7) };
    case 'wood': return { ink: '#FFF8EC', sub: '#F1E0C8' };
    case 'kraft': return { ink: pal.onAcc, sub: shade(pal.bg, 0.25) };
    case 'neon': return { ink: pal.acc, sub: pal.sub };
    default: return { ink: pal.ink, sub: pal.sub };
  }
}
function footColors(pal: MBDPalette) {
  if (pal.kind === 'modern') return { ink: '#FFFFFF', sub: shade(pal.ink, 0.7) };
  if (pal.kind === 'wood') return { ink: '#FFF8EC', sub: '#F1E0C8' };
  return { ink: pal.ink, sub: pal.sub };
}

function PanelContent({ model, k, spec, data, photos, logo, idp }: MBDRenderProps & { k: number; idp: string }) {
  const pal = mbdPalette(spec.palette), font = mbdFont(spec.font);
  const { W, H, bandH, footH, pad, sections: secs } = model;
  const c: Ctx = { spec, pal, font, R: model.R, s: model.s, secs, tops: model.tops, combos: model.combos, data };
  const z = sizes(c);
  const dark = DARK[pal.kind];
  const glow = pal.kind === 'neon' ? `url(#${idp}glow)` : undefined;
  const pm = model.panels[k];
  const bc = bandColors(pal), fc = footColors(pal);
  const tf = font.family, twt = font.weight;
  const out: ReactNode[] = [];

  // ---- dải đầu ----
  if (pm.band.kind === 'brand') {
    const hasLogo = !!logo;
    const lg = bandH * 0.62;
    const tx0 = pad + (hasLogo ? lg + pad * 0.5 : 0);
    const availW = W - tx0 - pad;
    const slogan = data.slogan || '';
    const bt = fit(up(data.brand || 'Tên quán', font.upper), availW, bandH * (slogan ? 0.42 : 0.5), tf, twt, 1, 0.4);
    const ss = slogan ? fit(slogan, availW, bandH * 0.17, BODY, 600, 1, 0.6) : null;
    const blockH = bt.size * 1.05 + (ss ? ss.size * 1.6 : 0);
    const y0 = (bandH - blockH) / 2 + bt.size * 0.86;
    const cx = hasLogo ? tx0 : W / 2;
    const anchor = hasLogo ? 'start' : 'middle';
    if (hasLogo) {
      out.push(<g key="logo"><clipPath id={`${idp}lg`}><circle cx={pad + lg / 2} cy={bandH / 2} r={lg / 2} /></clipPath>
        <circle cx={pad + lg / 2} cy={bandH / 2} r={lg / 2 + 3} fill={dark ? pal.ink : '#FFFFFF'} />
        <image href={logo} x={pad} y={bandH / 2 - lg / 2} width={lg} height={lg} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${idp}lg)`} /></g>);
    }
    out.push(<text key="brand" x={cx} y={y0} fontFamily={`"${tf}"`} fontWeight={twt} fontSize={bt.size} fill={bc.ink} textAnchor={anchor} filter={glow}>{bt.lines[0]}</text>);
    if (ss) out.push(<text key="slogan" x={cx} y={y0 + bt.size * 0.3 + ss.size * 1.25} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={ss.size} fill={bc.sub} textAnchor={anchor} letterSpacing={ss.size * 0.06}>{ss.lines[0]}</text>);
  } else if (pm.band.kind === 'title') {
    const t = fit(up(pm.band.text, font.upper), W - pad * 2 - bandH * 0.9, bandH * 0.46, tf, twt, 1, 0.45);
    const y = bandH / 2 + t.size * 0.34;
    out.push(<text key="bt" x={W / 2} y={y} fontFamily={`"${tf}"`} fontWeight={twt} fontSize={t.size} fill={bc.ink} textAnchor="middle" filter={glow}>{t.lines[0]}</text>);
    const half = tw(t.lines[0], t.size, tf, twt) / 2;
    if (pal.kind !== 'modern') for (const dir of [-1, 1]) {
      const x1 = W / 2 + dir * (half + bandH * 0.12), x2 = x1 + dir * bandH * 0.32;
      out.push(<line key={`orn${dir}`} x1={x1} y1={bandH / 2} x2={x2} y2={bandH / 2} stroke={bc.ink} strokeOpacity={0.6} strokeWidth={2.4} strokeLinecap="round" />);
      out.push(<circle key={`ornc${dir}`} cx={x2 + dir * 7} cy={bandH / 2} r={3.4} fill={bc.ink} fillOpacity={0.6} />);
    }
  }
  if (pal.kind === 'chalk') out.push(<path key="swash" d={`M${W * 0.3} ${bandH - pad * 0.15} q${W * 0.1} ${-8} ${W * 0.2} 0 t${W * 0.2} 0`} fill="none" stroke={pal.acc} strokeOpacity={0.75} strokeWidth={2.6} strokeLinecap="round" />);

  // ---- thân ----
  pm.placed.forEach((pl, i) => {
    const a = pl.atom;
    const key = `a${i}`;
    if (a.t === 'head' || a.t === 'labels') {
      const sec = secs[a.sec];
      const showLabels = a.t === 'labels' || a.labels;
      const titleOff = a.t === 'labels' || pl.labelsOnly;
      const pw1 = priceColW(c, sec);
      let y = pl.y;
      if (!titleOff) {
        const title = up(sec.title + (pl.cont ? ' (tiếp)' : ''), font.upper);
        const t = fit(title, pl.w, z.head, tf, twt, 1, 0.6);
        y += z.head * 0.98;
        out.push(<text key={`${key}t`} x={pl.x} y={y} fontFamily={`"${tf}"`} fontWeight={twt} fontSize={t.size} fill={pal.kind === 'neon' ? (a.sec % 2 ? pal.acc2 : pal.acc) : pal.acc} filter={glow}>{t.lines[0]}</text>);
        const tw1 = tw(t.lines[0], t.size, tf, twt);
        const uy = y + z.f * 0.28;
        if (pal.kind === 'modern') out.push(<rect key={`${key}u`} x={pl.x} y={uy} width={Math.min(pl.w, tw1 * 0.5)} height={z.f * 0.16} rx={z.f * 0.08} fill={pal.acc2} />);
        else if (pal.kind === 'chalk') out.push(<path key={`${key}u`} d={`M${pl.x} ${uy} q${tw1 * 0.25} ${-4} ${tw1 * 0.5} 0 t${tw1 * 0.45} 0`} fill="none" stroke={pal.ink} strokeOpacity={0.55} strokeWidth={2} strokeLinecap="round" />);
        else out.push(<line key={`${key}u`} x1={pl.x + tw1 + z.f * 0.5} y1={y - t.size * 0.32} x2={pl.x + pl.w} y2={y - t.size * 0.32} stroke={pal.kind === 'neon' ? pal.sub : pal.ink} strokeOpacity={0.35} strokeWidth={1.6} />);
        y += z.f * 0.35 + z.head * 0.3;
      }
      if (showLabels && sec.cols > 1) {
        y += z.label * 1.1;
        sec.labels.forEach((l, j) => {
          const xr = pl.x + pl.w - (sec.cols - 1 - j) * pw1;
          out.push(<text key={`${key}l${j}`} x={xr} y={y} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={z.label} fill={pal.sub} textAnchor="end" letterSpacing={z.label * 0.08}>{up(l, true)}</text>);
        });
      }
      return;
    }
    if (a.t === 'item') {
      const sec = secs[a.sec];
      const L = layItem(c, sec, a.it, pl.w);
      const pw1 = priceColW(c, sec);
      let y = pl.y + L.nameSize * 0.98;
      const ink = pal.ink;
      L.nameLines.forEach((ln, j) => out.push(<text key={`${key}n${j}`} x={pl.x} y={y + j * L.nameSize * 1.3} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={L.nameSize} fill={ink}>{ln}</text>));
      const lastY = y + (L.nameLines.length - 1) * L.nameSize * 1.3;
      let ex = pl.x + tw(L.nameLines[L.nameLines.length - 1], L.nameSize, BODY, 600) + z.f * 0.3;
      const pill = (label: string, fill: string, txt: string) => {
        const ps = z.f * 0.5, pw = tw(label, ps, BODY, 800) + ps * 1.1, ph = ps * 1.55;
        out.push(<g key={`${key}p${label}`}><rect x={ex} y={lastY - L.nameSize * 0.7} width={pw} height={ph} rx={ph / 2} fill={fill} />
          <text x={ex + pw / 2} y={lastY - L.nameSize * 0.7 + ph * 0.7} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ps} fill={txt} textAnchor="middle">{label}</text></g>);
        ex += pw + z.f * 0.25;
      };
      if (a.it.best) pill('BEST', pal.acc, pal.kind === 'chalk' || pal.kind === 'neon' ? pal.onAcc : '#FFFFFF');
      if (a.it.isNew) pill('MỚI', pal.acc2, pal.kind === 'neon' || pal.kind === 'chalk' ? pal.onAcc : '#FFFFFF');
      const priceX0 = pl.x + pl.w - sec.cols * pw1;
      if (spec.leader && ex < priceX0 - z.f * 0.6) {
        out.push(<line key={`${key}ld`} x1={ex + z.f * 0.1} y1={lastY - z.f * 0.08} x2={priceX0 + pw1 * 0.25} y2={lastY - z.f * 0.08} stroke={pal.sub} strokeOpacity={0.6} strokeWidth={z.f * 0.07} strokeDasharray={`${z.f * 0.06} ${z.f * 0.22}`} strokeLinecap="round" />);
      }
      a.it.prices.forEach((p, j) => {
        const txt = priceStr(c, p);
        if (!txt) return;
        const xr = pl.x + pl.w - (sec.cols - 1 - j) * pw1;
        out.push(<text key={`${key}pr${j}`} x={xr} y={lastY} fontFamily={`"${PRICE}"`} fontWeight={700} fontSize={z.price} fill={pal.kind === 'neon' ? pal.acc2 : pal.kind === 'chalk' ? pal.acc : pal.ink} textAnchor="end">{txt}</text>);
      });
      if (L.descLine) out.push(<text key={`${key}d`} x={pl.x} y={lastY + z.desc * 1.35} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={z.desc} fill={pal.sub}>{L.descLine}</text>);
      return;
    }
    if (a.t === 'hero') {
      const L = layHero(c, a.it, pl.w);
      const cy = pl.y + Math.max(L.img, L.h - z.gap * 1.6) / 2;
      const cx = pl.x + L.img / 2;
      const photo = photos[a.it.name];
      out.push(<circle key={`${key}pl`} cx={cx} cy={cy} r={L.img / 2} fill={dark ? '#FFFFFF' : pal.bg2} fillOpacity={dark ? 0.06 : 1} stroke={dark ? pal.ink : 'none'} strokeOpacity={0.5} strokeWidth={2} strokeDasharray={dark ? '8 6' : undefined} />);
      if (photo) {
        out.push(<g key={`${key}ph`}><clipPath id={`${idp}h${i}`}><circle cx={cx} cy={cy} r={L.img / 2 - 4} /></clipPath>
          <image href={photo} x={cx - L.img / 2} y={cy - L.img / 2} width={L.img} height={L.img} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${idp}h${i})`} /></g>);
      } else {
        out.push(<Illo key={`${key}il`} kind={illoFor(a.it.name, spec.industry)} x={cx - L.img * 0.42} y={cy - L.img * 0.44} s={L.img * 0.84} line={dark} ink={pal.ink} acc={pal.acc} acc2={pal.acc2} />);
      }
      const tx = pl.x + L.img + z.f * 0.7;
      const textH = L.badge * 1.9 + L.nameLines.length * L.nameSize * 1.22 + L.descLines.length * z.desc * 1.3 + L.price * 1.25;
      let y = cy - textH / 2;
      const bl = a.it.best ? 'BEST SELLER' : 'MÓN NỔI BẬT';
      const bw = tw(bl, L.badge, BODY, 800) + L.badge * 1.4;
      out.push(<rect key={`${key}bg`} x={tx} y={y} width={bw} height={L.badge * 1.6} rx={L.badge * 0.8} fill={pal.acc} />);
      out.push(<text key={`${key}bt`} x={tx + bw / 2} y={y + L.badge * 1.13} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={L.badge} fill={pal.kind === 'neon' || pal.kind === 'chalk' ? pal.onAcc : '#FFFFFF'} textAnchor="middle" letterSpacing={L.badge * 0.06}>{bl}</text>);
      y += L.badge * 1.9;
      L.nameLines.forEach((ln, j) => out.push(<text key={`${key}hn${j}`} x={tx} y={y + L.nameSize * 0.95 + j * L.nameSize * 1.22} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={L.nameSize} fill={pal.ink}>{ln}</text>));
      y += L.nameLines.length * L.nameSize * 1.22;
      L.descLines.forEach((ln, j) => out.push(<text key={`${key}hd${j}`} x={tx} y={y + z.desc * 1.05 + j * z.desc * 1.3} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={z.desc} fill={pal.sub}>{ln}</text>));
      y += L.descLines.length * z.desc * 1.3;
      const ptxt = L.ptxt;
      if (ptxt) out.push(<text key={`${key}hp`} x={tx} y={y + L.price * 1.02} fontFamily={`"${PRICE}"`} fontWeight={700} fontSize={L.price} fill={pal.kind === 'neon' ? pal.acc2 : pal.acc} filter={glow}>{ptxt}</text>);
      return;
    }
    if (a.t === 'tops') {
      const L = layTops(c, pl.w);
      const bh = L.h - z.gap;
      const fill = dark ? '#FFFFFF' : pal.bg2;
      out.push(<rect key={`${key}bx`} x={pl.x} y={pl.y} width={pl.w} height={bh} rx={z.f * 0.5} fill={fill} fillOpacity={dark ? 0.05 : pal.kind === 'wood' ? 0.6 : 0.85} stroke={pal.kind === 'neon' ? pal.acc2 : pal.kind === 'chalk' ? pal.ink : 'none'} strokeOpacity={0.6} strokeWidth={2} strokeDasharray={pal.kind === 'chalk' ? '10 6' : undefined} filter={glow} />);
      const tt = fit(up(data.toppingsTitle || 'Topping', font.upper), pl.w - z.f * 1.2, L.title, tf, twt, 1, 0.6);
      out.push(<text key={`${key}tt`} x={pl.x + z.f * 0.6} y={pl.y + z.f * 0.6 + L.title * 0.95} fontFamily={`"${tf}"`} fontWeight={twt} fontSize={tt.size} fill={pal.acc} filter={glow}>{tt.lines[0]}</text>);
      let yy = pl.y + z.f * 0.6 + L.title * 1.5;
      L.rows.forEach((row, ri) => {
        row.forEach((ch, ci) => {
          const x0 = pl.x + z.f * 0.6 + ch.x, ph = L.chip * 1.7;
          out.push(<g key={`${key}c${ri}-${ci}`}>
            <rect x={x0} y={yy} width={ch.w} height={ph} rx={ph / 2} fill="none" stroke={pal.kind === 'neon' ? pal.sub : pal.ink} strokeOpacity={0.4} strokeWidth={1.6} />
            <text x={x0 + L.chip * 0.7} y={yy + ph * 0.68} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={L.chip} fill={pal.ink}>{ch.name}{ch.price ? <tspan fontWeight={800} fill={pal.kind === 'neon' ? pal.acc2 : pal.acc}>{` ${ch.price}`}</tspan> : null}</text>
          </g>);
        });
        yy += L.chip * 2.1;
      });
      return;
    }
    // combo
    const cb = model.combos[a.i];
    const L = layCombo(c, cb, pl.w);
    const bh = L.h - z.gap;
    const fill = pal.kind === 'neon' ? 'none' : pal.kind === 'chalk' ? '#FFFFFF' : pal.acc;
    const txt = pal.kind === 'neon' ? pal.ink : pal.kind === 'chalk' ? pal.ink : '#FFFFFF';
    out.push(<rect key={`${key}bx`} x={pl.x} y={pl.y} width={pl.w} height={bh} rx={z.f * 0.55} fill={fill} fillOpacity={pal.kind === 'chalk' ? 0.07 : 1} stroke={pal.kind === 'neon' ? pal.acc : pal.kind === 'chalk' ? pal.acc : 'none'} strokeWidth={3} filter={glow} />);
    const tyc = pl.y + bh / 2;
    const textH = L.nameSize * 1.4 + L.descLines.length * L.desc * 1.35;
    let y = tyc - textH / 2 + L.nameSize * 0.95;
    out.push(<text key={`${key}cn`} x={pl.x + z.f * 0.8} y={y} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={L.nameSize} fill={pal.kind === 'chalk' ? pal.acc : txt} letterSpacing={L.nameSize * 0.04}>{L.nameLines[0]}</text>);
    y += L.nameSize * 0.45;
    L.descLines.forEach((ln, j) => out.push(<text key={`${key}cd${j}`} x={pl.x + z.f * 0.8} y={y + L.desc * 1.2 + j * L.desc * 1.35} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={L.desc} fill={txt} fillOpacity={0.88}>{ln}</text>));
    const pr = priceStr(c, cb.price);
    if (pr) {
      const ccx = pl.x + pl.w - z.f * 0.6 - L.circle / 2;
      out.push(<circle key={`${key}cc`} cx={ccx} cy={tyc} r={L.circle / 2} fill={pal.kind === 'neon' ? 'none' : pal.acc2} stroke={pal.kind === 'neon' ? pal.acc2 : '#FFFFFF'} strokeWidth={pal.kind === 'neon' ? 3 : 2.5} strokeOpacity={pal.kind === 'neon' ? 1 : 0.6} filter={glow} />);
      const ps = fit(pr, L.circle * 0.78, L.circle * 0.34, PRICE, 700, 1, 0.5);
      out.push(<text key={`${key}cp`} x={ccx} y={tyc + ps.size * 0.36} fontFamily={`"${PRICE}"`} fontWeight={700} fontSize={ps.size} fill={pal.kind === 'neon' ? pal.acc2 : '#FFFFFF'} textAnchor="middle">{ps.lines[0]}</text>);
    }
  });

  // ---- chân bảng ----
  const fsz = footH * 0.46, fy = H - footH / 2 + fsz * 0.36;
  const last = k === model.n - 1, first = k === 0;
  if (first && data.hotline) {
    const ix = pad, iy = H - footH / 2;
    out.push(<path key="ph" d={`M${ix + fsz * 0.2} ${iy - fsz * 0.45} q${-fsz * 0.25} ${fsz * 0.45} ${fsz * 0.4} ${fsz * 0.95} l${fsz * 0.22} ${-fsz * 0.22} l${-fsz * 0.25} ${-fsz * 0.28} l${-fsz * 0.15} ${fsz * 0.1} q${-fsz * 0.2} ${-fsz * 0.15} ${-fsz * 0.28} ${-fsz * 0.38} l${fsz * 0.12} ${-fsz * 0.12} l${-fsz * 0.2} ${-fsz * 0.3} Z`} fill={fc.ink} />);
    const ht = fit(data.hotline, (model.n === 1 ? W * 0.42 : W * 0.8) - fsz * 1.2, fsz, BODY, 800, 1, 0.6);
    out.push(<text key="hl" x={ix + fsz * 1.1} y={fy} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ht.size} fill={fc.ink} letterSpacing={ht.size * 0.04}>{ht.lines[0]}</text>);
  }
  if (last && data.note) {
    const nt = fit(data.note, model.n === 1 ? W * 0.5 - pad : W - pad * 2, fsz * 0.82, BODY, 600, 1, 0.55);
    out.push(<text key="nt" x={model.n === 1 ? W - pad : W / 2} y={fy} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={nt.size} fill={fc.sub} textAnchor={model.n === 1 ? 'end' : 'middle'}>{nt.lines[0]}</text>);
  }
  if (!first && !last) {
    const mb = fit(up(data.brand || '', font.upper), W - pad * 2, fsz * 0.85, tf, twt, 1, 0.5);
    if (mb.lines[0]) out.push(<text key="mb" x={W / 2} y={fy} fontFamily={`"${tf}"`} fontWeight={twt} fontSize={mb.size} fill={fc.sub} textAnchor="middle">{mb.lines[0]}</text>);
  }
  return <>{out}</>;
}

function Defs({ idp, pal }: { idp: string; pal: MBDPalette }) {
  return (
    <defs>
      <filter id={`${idp}glow`} x="-20%" y="-40%" width="140%" height="180%"><feGaussianBlur stdDeviation="4" result="b" /><feComponentTransfer in="b" result="bb"><feFuncA type="linear" slope="0.75" /></feComponentTransfer><feMerge><feMergeNode in="bb" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
      <filter id={`${idp}blur`} x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18" /></filter>
      <radialGradient id={`${idp}vig`} cx="50%" cy="45%" r="75%"><stop offset="60%" stopColor="#000" stopOpacity={0} /><stop offset="100%" stopColor="#000" stopOpacity={pal.kind === 'neon' ? 0.45 : 0.32} /></radialGradient>
    </defs>
  );
}

/** 1 tấm, đúng khổ mm. bleed > 0 → nền tràn lề xén (file in) */
export function PanelSvg({ k, bleed = 0, idp = 'p', style, ...p }: MBDRenderProps & { k: number; bleed?: number; idp?: string; style?: CSSProperties }) {
  const { W, H } = p.model;
  const pal = mbdPalette(p.spec.palette);
  const id = `${idp}${k}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-bleed} ${-bleed} ${W + bleed * 2} ${H + bleed * 2}`} width={`${W + bleed * 2}mm`} height={`${H + bleed * 2}mm`} style={style} data-panel={k}>
      <Defs idp={id} pal={pal} />
      <Background k={k} model={p.model} pal={pal} idp={id} b={bleed} />
      <PanelContent {...p} k={k} idp={id} />
    </svg>
  );
}

/** cả bảng: các tấm cạnh nhau (khe MBD_GAP_MM) — xem trước & ảnh tổng */
export function BoardSvg({ idp = 'b', style, ...p }: MBDRenderProps & { idp?: string; style?: CSSProperties }) {
  const { W, H, n } = p.model;
  const pal = mbdPalette(p.spec.palette);
  const TW = n * W + (n - 1) * MBD_GAP_MM;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${TW} ${H}`} style={style}>
      {Array.from({ length: n }, (_, k) => (
        <svg key={k} x={k * (W + MBD_GAP_MM)} y={0} width={W} height={H} viewBox={`0 0 ${W} ${H}`} overflow="hidden">
          <Defs idp={`${idp}${k}`} pal={pal} />
          <Background k={k} model={p.model} pal={pal} idp={`${idp}${k}`} b={0} />
          <PanelContent {...p} k={k} idp={`${idp}${k}`} />
        </svg>
      ))}
    </svg>
  );
}
