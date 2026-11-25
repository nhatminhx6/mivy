'use client';
// Hộp đèn quảng cáo: 1 engine SVG (đơn vị mm) = LOẠI × BỐ CỤC × BẢNG MÀU × FONT × NGÀNH. Render code 100%.
// 3 loại: hộp đèn vẫy TRÒN (2 mặt, treo tay đỡ chữ L), hộp đèn CHỮ NHẬT gắn tường (1 mặt, mica hút nổi),
// hộp đèn ĐỨNG vỉa hè (2 mặt, bạt căng, đế bánh xe). Chữ đo bằng canvas (font thật) → co/xuống dòng cho vừa
// vùng an toàn; mặt tròn thì mỗi dòng phải lọt dây cung tại độ cao của nó (không lòi ra ngoài vòng).
// 3 chế độ vẽ:
//  - 'preview': mặt hộp đèn + viền khung (xem phẳng)
//  - 'print'  : FILE IN đúng khổ + lề xén; cut=true thêm lớp CutContour (đường cắt tròn / chữ nhật)
//  - 'tex'    : nguồn texture 3D (đúng khổ, không lề, không viền)

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type LBKind = 'round' | 'wall' | 'stand';
export type LBMode = 'preview' | 'print' | 'tex';
export type LBBack = 'same' | 'info';
export type LBLight = 'white' | 'warm';

export const LB_KINDS: { id: LBKind; name: string; sub: string; faces: number }[] = [
  { id: 'round', name: 'Hộp đèn vẫy tròn', sub: '2 mặt · treo tay đỡ chữ L', faces: 2 },
  { id: 'wall', name: 'Hộp đèn chữ nhật gắn tường', sub: '1 mặt · mica hút nổi', faces: 1 },
  { id: 'stand', name: 'Hộp đèn đứng vỉa hè', sub: '2 mặt · bạt căng · bánh xe', faces: 2 },
];
export const lbKind = (k: LBKind) => LB_KINDS.find((x) => x.id === k)!;

export interface LBSize { id: string; kind: LBKind; name: string; wMm: number; hMm: number; dMm: number }
export const LB_SIZES: LBSize[] = [
  { id: 'r40', kind: 'round', name: 'Ø40 cm', wMm: 400, hMm: 400, dMm: 120 },
  { id: 'r50', kind: 'round', name: 'Ø50 cm', wMm: 500, hMm: 500, dMm: 140 },
  { id: 'r60', kind: 'round', name: 'Ø60 cm', wMm: 600, hMm: 600, dMm: 160 },
  { id: 'w60', kind: 'wall', name: '60 × 40 cm', wMm: 600, hMm: 400, dMm: 100 },
  { id: 'w80', kind: 'wall', name: '80 × 50 cm', wMm: 800, hMm: 500, dMm: 100 },
  { id: 'w100', kind: 'wall', name: '100 × 60 cm', wMm: 1000, hMm: 600, dMm: 110 },
  { id: 'w120', kind: 'wall', name: '120 × 60 cm', wMm: 1200, hMm: 600, dMm: 120 },
  { id: 's40', kind: 'stand', name: '40 × 60 cm (dày 15)', wMm: 400, hMm: 600, dMm: 150 },
  { id: 's50', kind: 'stand', name: '50 × 80 cm (dày 15)', wMm: 500, hMm: 800, dMm: 150 },
];
export const lbSize = (id: string) => LB_SIZES.find((s) => s.id === id) || LB_SIZES[0];
export const sizesOf = (k: LBKind) => LB_SIZES.filter((s) => s.kind === k);
export const LB_BLEED_MM = 5;

export const LB_MATERIALS: { id: string; kind: LBKind[]; name: string; note: string; order: string; gloss: boolean }[] = [
  { id: 'mica-hut', kind: ['round', 'wall'], name: 'Mica hút nổi', note: 'Mặt mica trắng sữa in UV, chữ & logo hút nổi 5–10mm — đẹp, bền ngoài trời', order: 'Hộp đèn mica hút nổi', gloss: true },
  { id: 'mica-phang', kind: ['round', 'wall', 'stand'], name: 'Mica phẳng in UV', note: 'Mặt mica phẳng in UV trực tiếp — rẻ hơn hút nổi, giao nhanh', order: 'Hộp đèn mica hút nổi', gloss: true },
  { id: 'bat', kind: ['wall', 'stand'], name: 'Bạt căng xuyên sáng', note: 'Bạt hiflex xuyên sáng căng khung nhôm/sắt — thay mặt dễ, giá tốt', order: 'Hộp đèn bạt căng 2 mặt', gloss: false },
];
export const materialsOf = (k: LBKind) => LB_MATERIALS.filter((m) => m.kind.includes(k));
export const lbMaterial = (id: string) => LB_MATERIALS.find((m) => m.id === id) || LB_MATERIALS[0];
export const LB_LIGHTS: { id: LBLight; name: string; color: string }[] = [
  { id: 'white', name: 'LED trắng 6500K', color: '#FFFFFF' },
  { id: 'warm', name: 'LED vàng ấm 3000K', color: '#FFE4B8' },
];

export interface LBFont { id: string; name: string; family: string; weight: number; upper: boolean }
export const LB_FONTS: LBFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800, upper: true },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, upper: true },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800, upper: false },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800, upper: false },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, upper: false },
];
export const lbFont = (id: string) => LB_FONTS.find((f) => f.id === id) || LB_FONTS[0];
const BODY = 'Be Vietnam Pro';
// chỉ font có TTF ở /public/fonts → file in outline chữ được
export const LB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Lobster&display=swap');`;

export function useLBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-lb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-lb-fonts'; link.rel = 'stylesheet';
        link.href = LB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...LB_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// bg: nền mặt đèn · fg: chữ chính · acc: màu nhấn · onAcc: chữ trên nền nhấn · sub: chữ phụ · frame: màu khung
export interface LBPalette { id: string; name: string; bg: string; fg: string; acc: string; onAcc: string; sub: string; frame: string; acc2?: string }
export const LB_PALETTES: LBPalette[] = [
  { id: 'coffee', name: 'Nâu cà phê', bg: '#3B2416', fg: '#FFF3E0', acc: '#E8A54B', onAcc: '#2B170C', sub: '#F2D3A8', frame: '#1C1C1C' },
  { id: 'cream', name: 'Kem · đỏ', bg: '#FFF6E6', fg: '#4A2C17', acc: '#C0392B', onAcc: '#FFFFFF', sub: '#7A5236', frame: '#2A2A2A' },
  { id: 'pink', name: 'Hồng spa', bg: '#FCE7EC', fg: '#8E2C4F', acc: '#C99A2E', onAcc: '#FFFFFF', sub: '#A2506E', frame: '#E8E8E8' },
  { id: 'barber', name: 'Barber', bg: '#FFFFFF', fg: '#1C2A5A', acc: '#C8102E', onAcc: '#FFFFFF', sub: '#1C2A5A', frame: '#1C1C1C', acc2: '#1C2A5A' },
  { id: 'pharma', name: 'Xanh nhà thuốc', bg: '#0E8A4E', fg: '#FFFFFF', acc: '#FFFFFF', onAcc: '#0E8A4E', sub: '#E3FFF0', frame: '#E8E8E8' },
  { id: 'pho', name: 'Đỏ phở', bg: '#B71C1C', fg: '#FFE082', acc: '#FFE082', onAcc: '#8E1414', sub: '#FFF3D6', frame: '#1C1C1C' },
  { id: 'tea', name: 'Trà sữa', bg: '#F6E7CF', fg: '#5B3A29', acc: '#4E9F6E', onAcc: '#FFFFFF', sub: '#7B5A46', frame: '#F2F2F2' },
  { id: 'navy', name: 'Navy · cam', bg: '#14213D', fg: '#FFFFFF', acc: '#FCA311', onAcc: '#14213D', sub: '#C9D3E6', frame: '#1C1C1C' },
  { id: 'black', name: 'Đen · vàng', bg: '#121212', fg: '#FFFFFF', acc: '#F5C518', onAcc: '#121212', sub: '#D8D8D8', frame: '#1C1C1C' },
  { id: 'yellow', name: 'Vàng bánh mì', bg: '#FFD23F', fg: '#2A1A0A', acc: '#D7263D', onAcc: '#FFFFFF', sub: '#5A3A12', frame: '#1C1C1C' },
];
export const lbPalette = (id: string) => LB_PALETTES.find((p) => p.id === id) || LB_PALETTES[0];

export type LBIndustry = 'cafe' | 'spa' | 'toc' | 'thuoc' | 'pho' | 'trasua' | 'banhmi';
export const LB_INDUSTRIES: { id: LBIndustry; name: string }[] = [
  { id: 'cafe', name: 'Cà phê' }, { id: 'spa', name: 'Spa · nail' }, { id: 'toc', name: 'Cắt tóc' }, { id: 'thuoc', name: 'Nhà thuốc' },
  { id: 'pho', name: 'Phở · quán ăn' }, { id: 'trasua', name: 'Trà sữa' }, { id: 'banhmi', name: 'Bánh mì' },
];

export type LBData = Record<string, string>;
const SAMPLES: Record<LBIndustry, LBData> = {
  cafe: { brand: 'An Khang', category: 'Cà phê', tagline: 'Rang xay nguyên chất', hotline: '0909 123 456', extra: 'Mở cửa 6:00 – 22:00\nWifi miễn phí' },
  spa: { brand: 'Thu Hà', category: 'Spa & Nail', tagline: 'Chăm sóc da chuẩn y khoa', hotline: '0938 222 333', extra: 'Gội đầu dưỡng sinh\nNail · Mi · Facial' },
  toc: { brand: 'Quốc Bảo', category: 'Cắt tóc nam', tagline: 'Cắt · Gội · Cạo mặt', hotline: '0912 456 789', extra: 'Cắt tóc · Gội đầu\nCạo mặt · Ráy tai' },
  thuoc: { brand: 'Gia Khánh', category: 'Nhà thuốc', tagline: 'Dược sĩ tư vấn tận tâm', hotline: '028 3822 1234', extra: 'Thuốc theo đơn\nThực phẩm chức năng' },
  pho: { brand: 'Bà Tư', category: 'Phở bò', tagline: 'Gia truyền Nam Định', hotline: '0903 777 888', extra: 'Phở tái · Phở chín\nPhở đặc biệt' },
  trasua: { brand: 'Mây', category: 'Trà sữa', tagline: 'Trân châu nấu mỗi ngày', hotline: '0977 456 123', extra: 'Trà sữa · Trà trái cây\nSữa tươi trân châu' },
  banhmi: { brand: 'Cô Ba', category: 'Bánh mì', tagline: 'Nóng giòn mỗi sáng', hotline: '0905 321 654', extra: 'Bánh mì thịt · Xíu mại\nỐp la · Chả cá' },
};
export const sampleData = (ind: LBIndustry): LBData => ({ ...SAMPLES[ind] });
export interface LBField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean }
export const LB_FIELDS: LBField[] = [
  { key: 'brand', label: 'Tên quán (to nhất)', ph: 'An Khang', half: true },
  { key: 'category', label: 'Ngành (CÀ PHÊ, SPA, NHÀ THUỐC…)', ph: 'Cà phê', half: true },
  { key: 'tagline', label: 'Câu phụ', ph: 'Rang xay nguyên chất' },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456', half: true },
  { key: 'extra', label: 'Dịch vụ / giờ mở cửa (mặt sau, hộp đứng — mỗi dòng 1 ý)', ph: 'Mở cửa 6:00 – 22:00', multiline: true },
];

export type LBDeco = 'plain' | 'dots' | 'stripes' | 'double';
export interface LBLayout { id: string; kind: LBKind; name: string }
export const LB_LAYOUTS: LBLayout[] = [
  { id: 'ring', kind: 'round', name: 'Vành màu' },
  { id: 'icon', kind: 'round', name: 'Biểu tượng lớn' },
  { id: 'split', kind: 'round', name: 'Chia đôi' },
  { id: 'left', kind: 'wall', name: 'Logo trái' },
  { id: 'center', kind: 'wall', name: 'Giữa + dải hotline' },
  { id: 'band', kind: 'wall', name: 'Dải ngành trên' },
  { id: 'stack', kind: 'stand', name: 'Xếp dọc' },
  { id: 'half', kind: 'stand', name: 'Nửa trên màu' },
];

export interface LBSpec {
  kind: LBKind; layout: string; palette: string; font: string; industry: LBIndustry; deco: LBDeco;
  size: string; material: string; light: LBLight; back: LBBack;
}
export interface LBTemplate { id: string; name: string; spec: LBSpec }
const T = (id: string, name: string, kind: LBKind, layout: string, palette: string, font: string, industry: LBIndustry, deco: LBDeco = 'plain'): LBTemplate => ({
  id, name,
  spec: { kind, layout, palette, font, industry, deco, size: sizesOf(kind)[kind === 'round' ? 1 : 0].id, material: kind === 'stand' ? 'bat' : 'mica-hut', light: 'white', back: 'same' },
});
export const LB_TEMPLATES: LBTemplate[] = [
  T('r-cafe', 'Cà phê · vành vàng', 'round', 'ring', 'coffee', 'lobster', 'cafe', 'dots'),
  T('r-toc', 'Cắt tóc · sọc barber', 'round', 'ring', 'barber', 'oswald', 'toc', 'stripes'),
  T('r-spa', 'Spa · hoa sen', 'round', 'icon', 'pink', 'playfair', 'spa', 'double'),
  T('r-thuoc', 'Nhà thuốc · chữ thập', 'round', 'split', 'pharma', 'bvp', 'thuoc'),
  T('r-trasua', 'Trà sữa · ly trân châu', 'round', 'icon', 'tea', 'baloo', 'trasua', 'dots'),
  T('r-pho', 'Phở · chia đôi đỏ', 'round', 'split', 'pho', 'montserrat', 'pho'),
  T('w-pho', 'Phở bò · dải ngành', 'wall', 'band', 'pho', 'montserrat', 'pho'),
  T('w-cafe', 'Cà phê · logo trái', 'wall', 'left', 'coffee', 'lobster', 'cafe'),
  T('w-thuoc', 'Nhà thuốc · giữa', 'wall', 'center', 'pharma', 'bvp', 'thuoc'),
  T('w-banhmi', 'Bánh mì · logo trái', 'wall', 'left', 'yellow', 'baloo', 'banhmi'),
  T('s-trasua', 'Trà sữa · xếp dọc', 'stand', 'stack', 'tea', 'baloo', 'trasua', 'dots'),
  T('s-toc', 'Cắt tóc · nửa trên', 'stand', 'half', 'navy', 'oswald', 'toc'),
  T('s-cafe', 'Cà phê · xếp dọc', 'stand', 'stack', 'black', 'montserrat', 'cafe'),
];
export const templatesOf = (k: LBKind) => LB_TEMPLATES.filter((t) => t.spec.kind === k);

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function measureW(text: string, fam: string, wt: number, size: number, ls: number): number {
  const n = [...text].length;
  if (typeof document === 'undefined') return n * size * 0.6 + ls * size * Math.max(0, n - 1);
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return n * size * 0.6;
  mctx.font = `${wt} 100px "${fam}"`;
  return mctx.measureText(text).width * (size / 100) + ls * size * Math.max(0, n - 1);
}
function wrap(text: string, maxW: number, fam: string, wt: number, size: number, ls: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (!cur || measureW(t, fam, wt, size, ls) <= maxW) cur = t; else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  if (out.length === 2) { // cân 2 dòng cho đều (tránh 1 từ mồ côi)
    const words = out.join(' ').split(' ');
    let best = out, bw = Math.max(...out.map((l) => measureW(l, fam, wt, size, ls)));
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(measureW(a, fam, wt, size, ls), measureW(b, fam, wt, size, ls));
      if (w <= maxW && w < bw - 0.5) { best = [a, b]; bw = w; }
    }
    return best;
  }
  return out;
}
const vn = (s: string, up: boolean) => (up ? s.toLocaleUpperCase('vi') : s);
// làm tối màu (t = 0..1)
const shade = (hex: string, t: number) => '#' + [1, 3, 5].map((i) => Math.round(parseInt(hex.slice(i, i + 2), 16) * (1 - t)).toString(16).padStart(2, '0')).join('');

// ---------- xếp khối dọc, tự co cho vừa vùng (rect hoặc tròn) ----------
interface TextItem { t: 'text'; key: string; text: string; fam: string; wt: number; size: number; min: number; maxLines: number; ls: number; color: string; upper: boolean }
interface PillItem { t: 'pill'; key: string; text: string; fam: string; wt: number; size: number; min: number; ls: number; color: string; fill: string; upper: boolean }
interface PhoneItem { t: 'phone'; key: string; text: string; fam: string; wt: number; size: number; min: number; color: string }
interface IconItem { t: 'icon'; h: number; color: string; acc: string }
interface GapItem { t: 'gap'; h: number }
type Item = TextItem | PillItem | PhoneItem | IconItem | GapItem;

interface PText { t: 'text'; key: string; line: string; x: number; base: number; size: number; fam: string; wt: number; ls: number; color: string; anchor: 'middle' | 'start' }
interface PPill { t: 'pill'; x: number; y: number; w: number; h: number; fill: string }
interface PPhone { t: 'phoneIcon'; x: number; y: number; s: number; color: string }
interface PIcon { t: 'icon'; cx: number; cy: number; s: number; color: string; acc: string }
type Placed = PText | PPill | PPhone | PIcon;

interface Area { x: number; y: number; w: number; h: number; circle?: { cx: number; cy: number; r: number }; align: 'center' | 'start' }
const LH = 1.24, ASC = 1.0;

// bề rộng cho phép của 1 dải [y0,y1] trong vùng (tròn: dây cung hẹp nhất trong dải)
function widthAt(a: Area, y0: number, y1: number): number {
  if (!a.circle) return a.w;
  const { cy, r } = a.circle;
  const d = Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy));
  if (d >= r) return 0;
  return Math.min(a.w, 2 * Math.sqrt(r * r - d * d));
}

function layout(items: Item[], a: Area): Placed[] {
  let best: Placed[] = [];
  for (let k = 1; k > 0.28; k *= 0.95) {
    const out: Placed[] = [];
    // 1) cỡ chữ + xuống dòng
    const wrapW = a.circle ? a.w * 0.84 : a.w;
    const sized = items.map((it) => {
      if (it.t === 'text') {
        let size = Math.max(it.min, it.size * k);
        const txt = vn(it.text, it.upper);
        // ưu tiên 1 dòng: chỉ hơi dài (≤ 30%) thì co chữ cho vừa 1 dòng thay vì xuống dòng
        const one = measureW(txt, it.fam, it.wt, size, it.ls);
        if (one > wrapW && one * 0.7 <= wrapW) size = Math.max(it.min, (size * wrapW) / one * 0.985);
        let lines = wrap(txt, wrapW, it.fam, it.wt, size, it.ls);
        const widest = () => Math.max(...lines.map((l) => measureW(l, it.fam, it.wt, size, it.ls)));
        // quá số dòng / 1 từ vẫn tràn → co tiếp (tối đa xuống 60% cỡ tối thiểu)
        for (let g = 0; g < 40 && (lines.length > it.maxLines || widest() > wrapW) && size > it.min * 0.6; g++) {
          size *= 0.94; lines = wrap(txt, wrapW, it.fam, it.wt, size, it.ls);
        }
        if (lines.length > it.maxLines) { // vẫn dư → cắt "…" dòng cuối cho gọn trong khung
          lines = lines.slice(0, it.maxLines);
          let last = lines[lines.length - 1];
          while (last.includes(' ') && measureW(`${last}…`, it.fam, it.wt, size, it.ls) > wrapW) last = last.slice(0, last.lastIndexOf(' '));
          lines[lines.length - 1] = `${last}…`;
        }
        return { it, size, lines, h: lines.length * size * LH };
      }
      if (it.t === 'pill') {
        const txt = vn(it.text, it.upper); let size = Math.max(it.min, it.size * k);
        const w = measureW(txt, it.fam, it.wt, size, it.ls) + size * 1.6;
        if (w > wrapW) size = Math.max(it.min * 0.6, (size * wrapW) / w);
        return { it, size, lines: [txt], h: size * 1.9 };
      }
      if (it.t === 'phone') {
        let size = Math.max(it.min, it.size * k);
        const w = measureW(it.text, it.fam, it.wt, size, 0.02) + size * 1.25;
        if (w > wrapW) size = Math.max(it.min * 0.6, (size * wrapW) / w);
        return { it, size, lines: [it.text], h: size * LH };
      }
      if (it.t === 'icon') return { it, size: 0, lines: [], h: it.h * k };
      return { it, size: 0, lines: [], h: it.h * k };
    }).filter((s) => !(s.it.t === 'text' || s.it.t === 'pill' || s.it.t === 'phone') || s.lines.some((l) => l.trim()));
    const total = sized.reduce((t, s) => t + s.h, 0);
    if (total > a.h) { best = []; continue; }
    let y = a.y + (a.h - total) / 2;
    let ok = true;
    const cx = a.align === 'center' ? a.x + a.w / 2 : a.x;
    for (const s of sized) {
      const it = s.it;
      if (it.t === 'gap') { y += s.h; continue; }
      if (it.t === 'icon') {
        const sz = s.h;
        if (widthAt(a, y, y + sz) < sz) ok = false;
        out.push({ t: 'icon', cx: a.align === 'center' ? cx : a.x + sz / 2, cy: y + sz / 2, s: sz, color: it.color, acc: it.acc });
        y += sz; continue;
      }
      if (it.t === 'pill') {
        const tw = measureW(s.lines[0], it.fam, it.wt, s.size, it.ls);
        const pw = tw + s.size * 1.6, ph = s.size * 1.6, py = y + s.size * 0.15;
        if (pw > widthAt(a, py, py + ph)) ok = false;
        const px = a.align === 'center' ? cx - pw / 2 : a.x;
        out.push({ t: 'pill', x: px, y: py, w: pw, h: ph, fill: it.fill });
        out.push({ t: 'text', key: it.key, line: s.lines[0], x: a.align === 'center' ? cx : px + s.size * 0.8, base: py + ph / 2 + s.size * 0.36, size: s.size, fam: it.fam, wt: it.wt, ls: it.ls, color: it.color, anchor: a.align === 'center' ? 'middle' : 'start' });
        y += s.h; continue;
      }
      if (it.t === 'phone') {
        const tw = measureW(it.text, it.fam, it.wt, s.size, 0.02);
        const icon = s.size * 0.95, gap = s.size * 0.3, full = icon + gap + tw;
        if (full > widthAt(a, y, y + s.h)) ok = false;
        const x0 = a.align === 'center' ? cx - full / 2 : a.x;
        out.push({ t: 'phoneIcon', x: x0, y: y + (s.h - icon) / 2 + s.size * 0.02, s: icon, color: it.color });
        out.push({ t: 'text', key: it.key, line: it.text, x: x0 + icon + gap, base: y + s.size * ASC, size: s.size, fam: it.fam, wt: it.wt, ls: 0.02, color: it.color, anchor: 'start' });
        y += s.h; continue;
      }
      for (const line of s.lines) {
        const lw = measureW(line, it.fam, it.wt, s.size, it.ls);
        if (lw > widthAt(a, y + s.size * 0.02, y + s.size * LH * 0.98)) ok = false;
        out.push({ t: 'text', key: it.key, line, x: cx, base: y + s.size * ASC, size: s.size, fam: it.fam, wt: it.wt, ls: it.ls, color: it.color, anchor: a.align === 'center' ? 'middle' : 'start' });
        y += s.size * LH;
      }
    }
    best = out;
    if (ok) return out;
  }
  return best;
}

// ---------- biểu tượng ngành (vẽ code) ----------
function IndustryIcon({ id, cx, cy, s, color, acc }: { id: LBIndustry; cx: number; cy: number; s: number; color: string; acc: string }) {
  const k = s / 100;
  const sw = 6;
  const tf = `translate(${cx - s / 2} ${cy - s / 2}) scale(${k})`;
  const common = { fill: 'none', stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  let body: ReactNode;
  switch (id) {
    case 'cafe':
      body = <>
        <path d="M22 44 h46 v14 a23 23 0 0 1 -46 0 z" fill={color} />
        <path d="M68 50 h6 a10 10 0 0 1 0 20 h-8" {...common} />
        <path d="M14 86 h66" {...common} />
        <path d="M34 34 c-5 -6 5 -10 0 -18 M46 34 c-5 -6 5 -10 0 -18 M58 34 c-5 -6 5 -10 0 -18" {...common} stroke={acc} strokeWidth={4.5} />
      </>; break;
    case 'spa':
      body = <>
        <path d="M50 22 c12 14 12 34 0 50 c-12 -16 -12 -36 0 -50 z" fill={color} />
        <path d="M50 72 c-8 -16 -24 -26 -38 -24 c2 16 18 26 38 24 z" fill={color} opacity={0.85} />
        <path d="M50 72 c8 -16 24 -26 38 -24 c-2 16 -18 26 -38 24 z" fill={color} opacity={0.85} />
        <path d="M18 82 q32 10 64 0" {...common} stroke={acc} strokeWidth={4.5} />
      </>; break;
    case 'toc':
      body = <>
        <circle cx="30" cy="74" r="11" {...common} />
        <circle cx="70" cy="74" r="11" {...common} />
        <path d="M38 66 L72 16 M62 66 L28 16" {...common} strokeWidth={7} />
        <circle cx="50" cy="45" r="4" fill={acc} />
      </>; break;
    case 'thuoc':
      body = <>
        <path d="M38 14 h24 v24 h24 v24 h-24 v24 h-24 v-24 h-24 v-24 h24 z" fill={color} />
        <circle cx="50" cy="50" r="9" fill={acc === color ? 'none' : acc} />
      </>; break;
    case 'pho':
      body = <>
        <path d="M14 50 h72 a36 32 0 0 1 -72 0 z" fill={color} />
        <path d="M40 82 h20" {...common} />
        <path d="M58 46 L86 14 M66 46 L92 20" {...common} stroke={acc} strokeWidth={4.5} />
        <path d="M30 38 c-4 -5 4 -9 0 -15 M44 38 c-4 -5 4 -9 0 -15" {...common} strokeWidth={4} />
      </>; break;
    case 'trasua':
      body = <>
        <path d="M30 36 h40 l-5 52 h-30 z" fill={color} />
        <path d="M27 36 h46 a23 14 0 0 0 -46 0 z" fill={color} opacity={0.85} />
        <path d="M54 24 L64 6" {...common} stroke={acc} strokeWidth={5} />
        {[[41, 78], [50, 80], [59, 78], [45, 70], [55, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="3.6" fill={acc} />)}
      </>; break;
    case 'banhmi':
      body = <>
        <path d="M12 64 C12 44 40 32 70 30 C86 29 92 38 88 48 C82 64 52 76 26 76 C17 76 12 72 12 64 z" fill={color} />
        <path d="M30 56 l10 -10 M46 52 l10 -10 M62 46 l10 -10" {...common} stroke={acc} strokeWidth={4.5} />
      </>; break;
  }
  return <g transform={tf}>{body}</g>;
}

// tai nghe điện thoại (biểu tượng hotline)
function PhoneIcon({ x, y, s, color }: { x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 24})`}>
      <path d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z" fill={color} />
    </g>
  );
}

// ---------- vẽ 1 mặt ----------
export interface LBFaceProps {
  spec: LBSpec; data: LBData; logo?: string; face?: 'front' | 'back'; mode?: LBMode; cut?: boolean; style?: CSSProperties;
}

export function LightboxSvg({ spec, data, logo, face = 'front', mode = 'preview', cut = false, style }: LBFaceProps) {
  const sz = lbSize(spec.size);
  const W = sz.wMm, H = sz.hMm, M = Math.min(W, H);
  const p = lbPalette(spec.palette), f = lbFont(spec.font);
  const round = spec.kind === 'round';
  const b = mode === 'print' ? LB_BLEED_MM : 0;
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  const uid = `lb-${spec.kind}-${spec.layout}-${face}-${mode}`;
  const info = face === 'back' && spec.back === 'info';
  const brand = data.brand || '', cat = data.category || '', tag = data.tagline || '', hot = data.hotline || '', extra = (data.extra || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4);

  const T = (key: string, text: string, size: number, min: number, o: Partial<TextItem> = {}): TextItem =>
    ({ t: 'text', key, text, fam: f.family, wt: f.weight, size, min, maxLines: 2, ls: f.upper ? 0.02 : 0, color: p.fg, upper: f.upper, ...o });
  const S = (key: string, text: string, size: number, min: number, o: Partial<TextItem> = {}): TextItem =>
    ({ t: 'text', key, text, fam: BODY, wt: 600, size, min, maxLines: 2, ls: 0.02, color: p.sub, upper: false, ...o });
  const K = (key: string, text: string, size: number, min: number, color: string): TextItem =>
    ({ t: 'text', key, text, fam: BODY, wt: 800, size, min, maxLines: 1, ls: 0.14, color, upper: true });
  const PH = (size: number, min: number, color: string): PhoneItem => ({ t: 'phone', key: 'hotline', text: hot, fam: BODY, wt: 800, size, min, color });
  const PILL = (size: number, min: number, fill: string, color: string): PillItem =>
    ({ t: 'pill', key: 'category', text: cat, fam: BODY, wt: 800, size, min, ls: 0.12, color, fill, upper: true });
  const IC = (h: number, color = p.fg, acc = p.acc): IconItem => ({ t: 'icon', h, color, acc });
  const G = (h: number): GapItem => ({ t: 'gap', h });

  const bgEls: ReactNode[] = [];
  const placed: Placed[] = [];
  const frameDeco: ReactNode[] = [];

  if (round) {
    const r = W / 2, cx = W / 2, cy = H / 2;
    bgEls.push(<circle key="bg" cx={cx} cy={cy} r={r + b} fill={p.bg} />);
    const band = M * 0.085;
    if (info) {
      bgEls.push(<circle key="rl" cx={cx} cy={cy} r={r - M * 0.04} fill="none" stroke={p.acc} strokeWidth={M * 0.012} />);
      const ri = r - M * 0.08;
      placed.push(...layout([
        K('category', cat, M * 0.06, M * 0.028, p.acc), G(M * 0.015),
        T('brand', brand, M * 0.13, M * 0.05, { maxLines: 2 }), G(M * 0.02),
        ...extra.map((e, i) => S(`extra${i}`, e, M * 0.052, M * 0.026, { maxLines: 1 })), G(M * 0.03),
        PH(M * 0.075, M * 0.035, p.fg),
      ], { x: cx - ri, y: cy - ri, w: ri * 2, h: ri * 2, circle: { cx, cy, r: ri }, align: 'center' }));
    } else if (spec.layout === 'ring') {
      // vành màu ngoài (chấm / sọc barber / trơn) + nội dung trong vòng
      if (spec.deco === 'stripes') {
        const n = 64;
        bgEls.push(
          <defs key="d"><clipPath id={`${uid}-ring`}><path d={`M${cx - r - b} ${cy} a${r + b} ${r + b} 0 1 0 ${(r + b) * 2} 0 a${r + b} ${r + b} 0 1 0 ${-(r + b) * 2} 0 z M${cx - r + band} ${cy} a${r - band} ${r - band} 0 1 1 ${(r - band) * 2} 0 a${r - band} ${r - band} 0 1 1 ${-(r - band) * 2} 0 z`} fillRule="evenodd" clipRule="evenodd" /></clipPath></defs>,
          <g key="st" clipPath={`url(#${uid}-ring)`}>
            <circle cx={cx} cy={cy} r={r + b} fill="#FFFFFF" />
            {Array.from({ length: n }, (_, i) => {
              // sọc xéo kiểu cột barber: đỏ · trắng · xanh · trắng, mép ngoài lệch góc so với mép trong
              const step = (Math.PI * 2) / n, a0 = i * step, a1 = a0 + step, tw = step * 1.6;
              const R1 = r - band - 2, R2 = r + b + 2;
              const pt = (a: number, R: number) => `${(cx + Math.cos(a) * R).toFixed(2)} ${(cy + Math.sin(a) * R).toFixed(2)}`;
              const col = [p.acc, '#FFFFFF', p.acc2 || p.fg, '#FFFFFF'][i % 4];
              return <path key={i} d={`M${pt(a0, R1)} L${pt(a0 + tw, R2)} L${pt(a1 + tw, R2)} L${pt(a1, R1)} z`} fill={col} />;
            })}
          </g>,
        );
      } else {
        bgEls.push(<circle key="band" cx={cx} cy={cy} r={r - band / 2} fill="none" stroke={p.acc} strokeWidth={band + b * 2} />);
        if (spec.deco === 'dots') {
          const n = 36;
          for (let i = 0; i < n; i++) {
            const a = (i / n) * Math.PI * 2;
            bgEls.push(<circle key={`dt${i}`} cx={cx + Math.cos(a) * (r - band / 2)} cy={cy + Math.sin(a) * (r - band / 2)} r={band * 0.13} fill={p.onAcc} />);
          }
        }
      }
      bgEls.push(<circle key="in" cx={cx} cy={cy} r={r - band - M * 0.008} fill="none" stroke={p.acc} strokeWidth={M * 0.006} />);
      const ri = r - band - M * 0.035;
      placed.push(...layout([
        IC(M * 0.17), G(M * 0.01),
        T('brand', brand, M * 0.15, M * 0.06, { maxLines: 2 }), G(M * 0.012),
        PILL(M * 0.05, M * 0.026, p.acc, p.onAcc), G(M * 0.02),
        PH(M * 0.055, M * 0.03, p.sub),
      ], { x: cx - ri, y: cy - ri, w: ri * 2, h: ri * 2, circle: { cx, cy, r: ri }, align: 'center' }));
    } else if (spec.layout === 'icon') {
      bgEls.push(<circle key="r1" cx={cx} cy={cy} r={r - M * 0.03} fill="none" stroke={p.acc} strokeWidth={M * 0.012} />);
      if (spec.deco === 'double') bgEls.push(<circle key="r2" cx={cx} cy={cy} r={r - M * 0.055} fill="none" stroke={p.acc} strokeWidth={M * 0.005} />);
      if (spec.deco === 'dots') for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; bgEls.push(<circle key={`dt${i}`} cx={cx + Math.cos(a) * (r - M * 0.045)} cy={cy + Math.sin(a) * (r - M * 0.045)} r={M * 0.006} fill={p.acc} />); }
      const ri = r - M * 0.075;
      placed.push(...layout([
        IC(M * 0.28, p.acc, p.fg), G(M * 0.01),
        T('category', cat, M * 0.12, M * 0.05, { maxLines: 1, color: p.fg }),
        T('brand', brand, M * 0.085, M * 0.04, { maxLines: 2, color: p.sub }), G(M * 0.015),
        PH(M * 0.05, M * 0.028, p.fg),
      ], { x: cx - ri, y: cy - ri, w: ri * 2, h: ri * 2, circle: { cx, cy, r: ri }, align: 'center' }));
    } else { // split: nửa trên màu nhấn (icon + ngành), nửa dưới (tên + hotline)
      const mid = cy + M * 0.02;
      bgEls.push(
        <defs key="d"><clipPath id={`${uid}-c`}><circle cx={cx} cy={cy} r={r + b} /></clipPath></defs>,
        <rect key="top" x={-b} y={-b} width={W + b * 2} height={mid + b} fill={p.acc === '#FFFFFF' ? shade(p.bg, 0.22) : p.acc} clipPath={`url(#${uid}-c)`} />,
        <line key="ln" x1={cx - r} x2={cx + r} y1={mid} y2={mid} stroke={p.fg} strokeWidth={M * 0.006} opacity={0.5} />,
      );
      const topCol = p.acc === '#FFFFFF' ? '#FFFFFF' : p.onAcc;
      const ri = r - M * 0.06;
      placed.push(...layout([
        IC(M * 0.2, topCol, topCol === p.fg ? p.acc : p.bg), G(M * 0.01),
        T('category', cat, M * 0.1, M * 0.045, { maxLines: 1, color: topCol, fam: BODY, wt: 800, upper: true, ls: 0.06 }),
      ], { x: cx - ri, y: cy - ri, w: ri * 2, h: mid - (cy - ri) - M * 0.03, circle: { cx, cy, r: ri }, align: 'center' }));
      placed.push(...layout([
        T('brand', brand, M * 0.12, M * 0.05, { maxLines: 2 }), G(M * 0.015),
        PH(M * 0.055, M * 0.03, p.sub),
      ], { x: cx - ri, y: mid + M * 0.03, w: ri * 2, h: cy + ri - mid - M * 0.03, circle: { cx, cy, r: ri }, align: 'center' }));
    }
  } else if (spec.kind === 'wall') {
    bgEls.push(<rect key="bg" x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.bg} />);
    const pad = H * 0.08;
    if (spec.layout === 'left') {
      const d = H * 0.7, bx = pad + d / 2, by = H / 2;
      bgEls.push(<circle key="badge" cx={bx} cy={by} r={d / 2} fill={p.acc} />);
      bgEls.push(<circle key="badge2" cx={bx} cy={by} r={d / 2 - H * 0.025} fill="none" stroke={p.onAcc} strokeWidth={H * 0.006} opacity={0.6} />);
      placed.push({ t: 'icon', cx: bx, cy: by, s: d * 0.6, color: p.onAcc, acc: p.bg });
      const x0 = pad + d + H * 0.08;
      placed.push(...layout([
        K('category', cat, H * 0.09, H * 0.04, p.acc), G(H * 0.01),
        T('brand', brand, H * 0.26, H * 0.09, { maxLines: 2 }), G(H * 0.015),
        S('tagline', tag, H * 0.065, H * 0.035, { maxLines: 1 }), G(H * 0.03),
        PH(H * 0.08, H * 0.04, p.fg),
      ], { x: x0, y: pad, w: W - x0 - pad, h: H - pad * 2, align: 'start' }));
    } else if (spec.layout === 'center') {
      const bandH = H * 0.2;
      bgEls.push(<rect key="band" x={-b} y={H - bandH} width={W + b * 2} height={bandH + b} fill={p.acc === '#FFFFFF' ? p.fg : p.acc} opacity={p.acc === '#FFFFFF' ? 0.16 : 1} />);
      bgEls.push(<rect key="fr" x={pad * 0.6} y={pad * 0.6} width={W - pad * 1.2} height={H - bandH - pad * 0.9} fill="none" stroke={p.acc} strokeWidth={H * 0.008} rx={H * 0.02} />);
      const bandCol = p.acc === '#FFFFFF' ? p.fg : p.onAcc;
      placed.push(...layout([
        IC(H * 0.14, p.acc, p.fg), G(H * 0.01),
        K('category', cat, H * 0.075, H * 0.035, p.acc),
        T('brand', brand, H * 0.22, H * 0.08, { maxLines: 2 }),
        S('tagline', tag, H * 0.058, H * 0.03, { maxLines: 1 }),
      ], { x: pad * 1.2, y: pad, w: W - pad * 2.4, h: H - bandH - pad * 1.4, align: 'center' }));
      placed.push(...layout([PH(bandH * 0.48, H * 0.04, bandCol)], { x: pad, y: H - bandH, w: W - pad * 2, h: bandH, align: 'center' }));
    } else { // band: dải ngành trên
      const bandH = H * 0.3;
      bgEls.push(<rect key="band" x={-b} y={-b} width={W + b * 2} height={bandH + b} fill={p.acc} />);
      bgEls.push(<rect key="ln" x={-b} y={bandH} width={W + b * 2} height={H * 0.012} fill={p.fg} opacity={0.35} />);
      const ic = bandH * 0.7;
      placed.push({ t: 'icon', cx: pad + ic / 2, cy: bandH / 2, s: ic, color: p.onAcc, acc: p.bg });
      placed.push({ t: 'icon', cx: W - pad - ic / 2, cy: bandH / 2, s: ic, color: p.onAcc, acc: p.bg });
      placed.push(...layout([K('category', cat, bandH * 0.52, H * 0.05, p.onAcc)], { x: pad * 2 + ic, y: 0, w: W - pad * 4 - ic * 2, h: bandH, align: 'center' }));
      placed.push(...layout([
        T('brand', brand, H * 0.24, H * 0.08, { maxLines: 2 }), G(H * 0.015),
        S('tagline', tag, H * 0.065, H * 0.03, { maxLines: 1 }), G(H * 0.025),
        PH(H * 0.08, H * 0.04, p.fg),
      ], { x: pad, y: bandH + pad * 0.6, w: W - pad * 2, h: H - bandH - pad * 1.2, align: 'center' }));
    }
  } else { // stand (dọc)
    bgEls.push(<rect key="bg" x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.bg} />);
    const pad = W * 0.08;
    const bandH = H * 0.13;
    const bandCol = p.acc === '#FFFFFF' ? p.fg : p.onAcc;
    bgEls.push(<rect key="hb" x={-b} y={H - bandH} width={W + b * 2} height={bandH + b} fill={p.acc} />);
    if (info) {
      placed.push(...layout([
        K('category', cat, W * 0.07, W * 0.035, p.acc), G(W * 0.02),
        T('brand', brand, W * 0.17, W * 0.07, { maxLines: 2 }), G(W * 0.04),
        ...extra.map((e, i) => S(`extra${i}`, e, W * 0.065, W * 0.035, { maxLines: 2, color: p.fg })),
      ], { x: pad, y: pad, w: W - pad * 2, h: H - bandH - pad * 2, align: 'center' }));
    } else if (spec.layout === 'half') {
      const topH = H * 0.46;
      bgEls.push(<rect key="top" x={-b} y={-b} width={W + b * 2} height={topH + b} fill={p.acc} />);
      bgEls.push(<path key="wave" d={`M${-b} ${topH} Q${W * 0.25} ${topH + H * 0.04} ${W / 2} ${topH} T${W + b} ${topH} V${topH - 1} H${-b} z`} fill={p.acc} />);
      placed.push(...layout([
        IC(W * 0.3, p.onAcc, p.bg), G(W * 0.02),
        T('brand', brand, W * 0.18, W * 0.07, { maxLines: 2, color: p.onAcc }),
      ], { x: pad, y: pad, w: W - pad * 2, h: topH - pad * 1.3, align: 'center' }));
      placed.push(...layout([
        K('category', cat, W * 0.09, W * 0.04, p.fg), G(W * 0.025),
        ...extra.map((e, i) => S(`extra${i}`, e, W * 0.06, W * 0.032, { maxLines: 1 })),
      ], { x: pad, y: topH + H * 0.05, w: W - pad * 2, h: H - bandH - topH - H * 0.08, align: 'center' }));
    } else { // stack
      if (spec.deco === 'dots') for (let i = 0; i < 9; i++) bgEls.push(<circle key={`dt${i}`} cx={pad + (i * (W - pad * 2)) / 8} cy={pad * 0.6} r={W * 0.008} fill={p.acc} />);
      placed.push(...layout([
        IC(W * 0.3, p.acc, p.fg), G(W * 0.02),
        K('category', cat, W * 0.085, W * 0.04, p.acc),
        T('brand', brand, W * 0.19, W * 0.07, { maxLines: 2 }), G(W * 0.02),
        S('tagline', tag, W * 0.055, W * 0.03, { maxLines: 2 }), G(W * 0.04),
        ...extra.map((e, i) => S(`extra${i}`, e, W * 0.058, W * 0.03, { maxLines: 1, color: p.fg })),
      ], { x: pad, y: pad, w: W - pad * 2, h: H - bandH - pad * 1.6, align: 'center' }));
    }
    placed.push(...layout([PH(bandH * 0.42, W * 0.04, bandCol)], { x: pad, y: H - bandH, w: W - pad * 2, h: bandH, align: 'center' }));
  }

  // khung viền (chỉ khi xem phẳng)
  if (mode === 'preview') {
    if (round) frameDeco.push(<circle key="fr" cx={W / 2} cy={H / 2} r={W / 2 - M * 0.006} fill="none" stroke={p.frame} strokeWidth={M * 0.014} />);
    else frameDeco.push(<rect key="fr" x={M * 0.008} y={M * 0.008} width={W - M * 0.016} height={H - M * 0.016} fill="none" stroke={p.frame} strokeWidth={M * 0.018} rx={M * 0.012} />);
  }

  const content = (
    <>
      {bgEls}
      {placed.map((e, i) => {
        if (e.t === 'pill') return <rect key={i} x={e.x} y={e.y} width={e.w} height={e.h} rx={e.h / 2} fill={e.fill} />;
        if (e.t === 'phoneIcon') return <PhoneIcon key={i} x={e.x} y={e.y} s={e.s} color={e.color} />;
        if (e.t === 'icon') {
          if (logo) return <image key={i} href={logo} x={e.cx - e.s / 2} y={e.cy - e.s / 2} width={e.s} height={e.s} preserveAspectRatio="xMidYMid meet" data-lb-logo="1" />;
          return <IndustryIcon key={i} id={spec.industry} cx={e.cx} cy={e.cy} s={e.s} color={e.color} acc={e.acc} />;
        }
        return null;
      })}
      {placed.map((e, i) => e.t === 'text' ? (
        <text key={`t${i}`} x={e.x} y={e.base} textAnchor={e.anchor} fontFamily={`"${e.fam}"`} fontWeight={e.wt} fontSize={e.size} letterSpacing={e.ls * e.size} fill={e.color}
          data-lb-text={e.key} data-lb-size={e.size.toFixed(2)} style={{ fontKerning: 'normal' }}>{e.line}</text>
      ) : null)}
      {frameDeco}
    </>
  );

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" width={mode === 'print' ? `${W + b * 2}mm` : undefined} height={mode === 'print' ? `${H + b * 2}mm` : undefined}>
      {round && mode !== 'print' ? (
        <>
          <defs><clipPath id={`${uid}-face`}><circle cx={W / 2} cy={H / 2} r={W / 2} /></clipPath></defs>
          <g clipPath={`url(#${uid}-face)`}>{content}</g>
        </>
      ) : <g id="In">{content}</g>}
      {cut && (
        <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.5}>
          {round ? <circle cx={W / 2} cy={H / 2} r={W / 2} /> : <rect x={0} y={0} width={W} height={H} />}
        </g>
      )}
    </svg>
  );
}
