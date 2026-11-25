'use client';
// Biển công ty / biển phòng ban / biển số: 1 engine SVG (đơn vị mm) = LOẠI × BỐ CỤC × BẢNG MÀU × FONT × VẬT LIỆU.
// Render code 100%. Chữ đo bằng canvas (font thật) → co/xuống dòng cho vừa vùng an toàn (tránh ốc pát).
// 3 chế độ vẽ:
//  - 'preview': xem trước, nền giả vật liệu (mica màu, alu xước, inox vàng/trắng, gỗ) + nắp ốc pát
//  - 'print'  : FILE IN–CẮT đúng khổ + lề xén. Lớp In (nền chỉ in khi là mica), ChuNoi (chữ mica cắt rời,
//               chỉ nét), CutContour (đường cắt tấm), Khoan (lỗ ốc pát)
//  - 'tex'    : nguồn texture 3D (không lề xén). Mica: nền + nội dung, chữ nổi nằm trong <g data-raise>
//               (3D tách ra đùn khối). Kim loại/gỗ: chỉ phần mực, nền trong suốt.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export type PLKind = 'company' | 'room' | 'number';
export type PLMaterial = 'mica' | 'alu' | 'inox' | 'inoxGold' | 'wood';
export type PLLetter = 'ink' | 'gold' | 'silver';
export type PLMode = 'preview' | 'print' | 'tex';

export const PL_KINDS: { id: PLKind; name: string; sub: string }[] = [
  { id: 'company', name: 'Biển tên công ty', sub: 'Gắn tường sảnh / cổng' },
  { id: 'room', name: 'Biển phòng ban · chức danh', sub: 'Gắn cửa phòng' },
  { id: 'number', name: 'Biển số nhà · số phòng', sub: 'Nhỏ gọn' },
];

export interface PLSize { id: string; kind: PLKind; name: string; wMm: number; hMm: number }
export const PL_SIZES: PLSize[] = [
  { id: '60x40', kind: 'company', name: '60 × 40 cm', wMm: 600, hMm: 400 },
  { id: '80x50', kind: 'company', name: '80 × 50 cm', wMm: 800, hMm: 500 },
  { id: '100x60', kind: 'company', name: '100 × 60 cm', wMm: 1000, hMm: 600 },
  { id: '30x10', kind: 'room', name: '30 × 10 cm', wMm: 300, hMm: 100 },
  { id: '25x8', kind: 'room', name: '25 × 8 cm', wMm: 250, hMm: 80 },
  { id: '30x15', kind: 'room', name: '30 × 15 cm', wMm: 300, hMm: 150 },
  { id: '20x14', kind: 'number', name: '20 × 14 cm', wMm: 200, hMm: 140 },
  { id: '15x15', kind: 'number', name: '15 × 15 cm', wMm: 150, hMm: 150 },
  { id: '30x20', kind: 'number', name: '30 × 20 cm', wMm: 300, hMm: 200 },
];
export const plSize = (id: string) => PL_SIZES.find((s) => s.id === id) || PL_SIZES[0];
export const sizesOf = (k: PLKind) => PL_SIZES.filter((s) => s.kind === k);
export const PL_BLEED_MM = 3;

export const PL_MATERIALS: { id: PLMaterial; name: string; note: string }[] = [
  { id: 'mica', name: 'Mica trong + chữ nổi', note: 'Mica trong dày, nền in UV mặt sau, chữ mica cắt nổi, ốc pát inox' },
  { id: 'alu', name: 'Alu xước in UV', note: 'Tấm alu xước bạc, in UV trực tiếp — nền là kim loại, không in' },
  { id: 'inox', name: 'Inox trắng ăn mòn', note: 'Inox xước, chữ ăn mòn lõm + đổ sơn màu' },
  { id: 'inoxGold', name: 'Inox vàng gương ăn mòn', note: 'Inox vàng gương, chữ ăn mòn đổ sơn — sang trọng' },
  { id: 'wood', name: 'Gỗ khắc laser', note: 'Gỗ tự nhiên, chữ khắc laser cháy nâu' },
];
export const plMaterial = (id: string) => PL_MATERIALS.find((m) => m.id === id) || PL_MATERIALS[0];
export const PL_LETTERS: { id: PLLetter; name: string }[] = [
  { id: 'ink', name: 'Màu theo mẫu' }, { id: 'gold', name: 'Vàng gương' }, { id: 'silver', name: 'Bạc gương' },
];

export interface PLFont { id: string; name: string; family: string; weight: number; upper: boolean }
export const PL_FONTS: PLFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, upper: true },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800, upper: true },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800, upper: true },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400, upper: true },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700, upper: true },
];
export const plFont = (id: string) => PL_FONTS.find((f) => f.id === id) || PL_FONTS[0];
const BODY = 'Be Vietnam Pro';
// chỉ font có TTF ở /public/fonts → file in outline chữ được
export const PL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Prata&family=Cormorant+Garamond:wght@700&display=swap');`;

export function usePLFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pl-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pl-fonts'; link.rel = 'stylesheet';
        link.href = PL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...PL_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// bg/fg/acc: in trên mica (nền in). inkM/accM: mực in UV / sơn ăn mòn trên kim loại (nền = kim loại)
export interface PLPalette { id: string; name: string; bg: string; fg: string; acc: string; inkM: string; accM: string }
export const PL_PALETTES: PLPalette[] = [
  { id: 'navy', name: 'Navy · vàng', bg: '#1B2F55', fg: '#FFFFFF', acc: '#D4AF37', inkM: '#1B2F55', accM: '#B07A1E' },
  { id: 'red', name: 'Đỏ đô', bg: '#7E1A1F', fg: '#FFF6E8', acc: '#E8C36A', inkM: '#8E1B1F', accM: '#8E1B1F' },
  { id: 'black', name: 'Đen sang', bg: '#131313', fg: '#F4EFE4', acc: '#D4AF37', inkM: '#121212', accM: '#7A5B22' },
  { id: 'white', name: 'Trắng · đỏ', bg: '#FFFFFF', fg: '#1B2F55', acc: '#C8102E', inkM: '#1B2F55', accM: '#C8102E' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0E5C58', fg: '#FFFFFF', acc: '#F2C14E', inkM: '#0E5C58', accM: '#0E5C58' },
  { id: 'cream', name: 'Kem · nâu', bg: '#F3ECDF', fg: '#3A2A18', acc: '#A0712F', inkM: '#3A2A18', accM: '#8A5A22' },
];
export const plPalette = (id: string) => PL_PALETTES.find((p) => p.id === id) || PL_PALETTES[0];

export interface PLLayout { id: string; kind: PLKind; name: string }
export const PL_LAYOUTS: PLLayout[] = [
  { id: 'center', kind: 'company', name: 'Cổ điển giữa' },
  { id: 'logoLeft', kind: 'company', name: 'Logo trái' },
  { id: 'bilingual', kind: 'company', name: 'Song ngữ' },
  { id: 'minimal', kind: 'company', name: 'Tối giản' },
  { id: 'band', kind: 'company', name: 'Dải đầu' },
  { id: 'roomCenter', kind: 'room', name: 'Tên phòng' },
  { id: 'roomLeft', kind: 'room', name: 'Logo trái' },
  { id: 'title', kind: 'room', name: 'Chức danh' },
  { id: 'number', kind: 'number', name: 'Số lớn' },
  { id: 'numberLogo', kind: 'number', name: 'Số + logo' },
];

export interface PLSpec { kind: PLKind; layout: string; palette: string; font: string; material: PLMaterial; size: string; letter: PLLetter }
export interface PLTemplate { id: string; name: string; spec: PLSpec }
const T = (id: string, name: string, kind: PLKind, layout: string, palette: string, font: string, material: PLMaterial, size: string, letter: PLLetter = 'ink'): PLTemplate =>
  ({ id, name, spec: { kind, layout, palette, font, material, size, letter } });
export const PL_TEMPLATES: PLTemplate[] = [
  T('c-navy-mica', 'Mica navy · chữ nổi vàng', 'company', 'center', 'navy', 'montserrat', 'mica', '60x40', 'gold'),
  T('c-red-bi', 'Mica đỏ đô · song ngữ', 'company', 'bilingual', 'red', 'playfair', 'mica', '60x40', 'gold'),
  T('c-black-mica', 'Mica đen · chữ bạc', 'company', 'center', 'black', 'cormorant', 'mica', '60x40', 'silver'),
  T('c-white-band', 'Mica trắng · dải đầu', 'company', 'band', 'white', 'bvp', 'mica', '60x40', 'ink'),
  T('c-alu-left', 'Alu xước · logo trái', 'company', 'logoLeft', 'navy', 'montserrat', 'alu', '60x40'),
  T('c-alu-min', 'Alu xước · tối giản', 'company', 'minimal', 'black', 'oswald', 'alu', '60x40'),
  T('c-gold-center', 'Inox vàng · cổ điển', 'company', 'center', 'black', 'prata', 'inoxGold', '60x40'),
  T('c-inox-bi', 'Inox trắng · song ngữ', 'company', 'bilingual', 'red', 'bvp', 'inox', '60x40'),
  T('c-wood-min', 'Gỗ khắc · tối giản', 'company', 'minimal', 'cream', 'cormorant', 'wood', '60x40'),
  T('c-teal-left', 'Mica xanh ngọc · logo trái', 'company', 'logoLeft', 'teal', 'bvp', 'mica', '60x40', 'ink'),
  T('r-navy', 'Phòng ban · mica navy', 'room', 'roomCenter', 'navy', 'montserrat', 'mica', '30x10', 'gold'),
  T('r-alu', 'Phòng ban · alu logo', 'room', 'roomLeft', 'navy', 'bvp', 'alu', '30x10'),
  T('r-gold', 'Chức danh · inox vàng', 'room', 'title', 'black', 'playfair', 'inoxGold', '30x15'),
  T('r-wood', 'Chức danh · gỗ', 'room', 'title', 'cream', 'cormorant', 'wood', '30x15'),
  T('n-gold', 'Số nhà · inox vàng', 'number', 'number', 'black', 'oswald', 'inoxGold', '20x14'),
  T('n-mica', 'Số phòng · mica logo', 'number', 'numberLogo', 'navy', 'montserrat', 'mica', '20x14', 'gold'),
  T('n-wood', 'Số nhà · gỗ', 'number', 'number', 'cream', 'playfair', 'wood', '15x15'),
];
export const templatesOf = (k: PLKind) => PL_TEMPLATES.filter((t) => t.spec.kind === k);

export type PLData = Record<string, string>;
export interface PLField { key: string; label: string; ph?: string; kinds: PLKind[]; half?: boolean }
export const PL_FIELDS: PLField[] = [
  { key: 'company', label: 'Tên công ty (tiếng Việt)', ph: 'CÔNG TY TNHH AN KHANG', kinds: ['company'] },
  { key: 'en', label: 'Tên tiếng Anh / dòng phụ', ph: 'AN KHANG COMPANY LIMITED', kinds: ['company', 'room'] },
  { key: 'brand', label: 'Tên viết tắt / thương hiệu (logo chữ)', ph: 'AN KHANG', kinds: ['company', 'room', 'number'], half: true },
  { key: 'mst', label: 'Mã số thuế', ph: '0312 345 678', kinds: ['company'], half: true },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', kinds: ['company'] },
  { key: 'contact', label: 'Điện thoại · website (tuỳ chọn)', ph: '028 3822 1234 · ankhang.vn', kinds: ['company'] },
  { key: 'room', label: 'Tên phòng / bộ phận', ph: 'PHÒNG KẾ TOÁN', kinds: ['room'] },
  { key: 'position', label: 'Chức danh', ph: 'GIÁM ĐỐC', kinds: ['room'], half: true },
  { key: 'person', label: 'Họ tên', ph: 'Thu Hà', kinds: ['room'], half: true },
  { key: 'number', label: 'Số nhà / số phòng', ph: '12A', kinds: ['number'], half: true },
  { key: 'line', label: 'Dòng phụ (đường, tầng…)', ph: 'Đường Nguyễn Huệ · Quận 1', kinds: ['number'] },
];
export const defaultPLData = (): PLData => ({
  company: 'Công ty TNHH An Khang', en: 'An Khang Company Limited', brand: 'AN KHANG',
  mst: 'MST: 0312 345 678', address: '12 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', contact: '',
  room: 'Phòng Kế toán', position: 'Giám đốc', person: 'Thu Hà', number: '12A', line: 'Đường Nguyễn Huệ · Quận 1',
});
// biển phòng: "en" mặc định là tên phòng tiếng Anh
export const ROOM_EN_DEFAULT = 'Accounting Department';

// ---------- lỗ ốc pát + vùng an toàn ----------
export interface PLGeom { W: number; H: number; holes: { x: number; y: number }[]; drill: number; capD: number; gap: number; padX: number; padY: number; radius: number }
export function plGeom(kind: PLKind, size: string): PLGeom {
  const s = plSize(size); const W = s.wMm, H = s.hMm; const m = Math.min(W, H);
  if (kind === 'company') {
    const inset = Math.max(18, Math.min(30, m * 0.05)), capD = W >= 800 ? 30 : 25;
    return { W, H, holes: [[inset, inset], [W - inset, inset], [inset, H - inset], [W - inset, H - inset]].map(([x, y]) => ({ x, y })), drill: 8, capD, gap: 25,
      padX: inset + capD / 2 + Math.max(8, W * 0.025), padY: inset + capD / 2 + 6, radius: Math.max(4, Math.min(10, m * 0.015)) };
  }
  if (kind === 'room') {
    const inset = 12, capD = 14;
    return { W, H, holes: [{ x: inset, y: H / 2 }, { x: W - inset, y: H / 2 }], drill: 5, capD, gap: 15,
      padX: inset + capD / 2 + 7, padY: Math.max(8, H * 0.11), radius: 4 };
  }
  const inset = W >= 300 ? 15 : 12, capD = W >= 300 ? 16 : 14;
  return { W, H, holes: [[inset, inset], [W - inset, inset], [inset, H - inset], [W - inset, H - inset]].map(([x, y]) => ({ x, y })), drill: 5, capD, gap: 15,
    padX: inset + capD / 2 + 6, padY: inset + capD / 2 + 4, radius: 5 };
}

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
interface Met { w: number; asc: number; desc: number }
function measure(text: string, fam: string, wt: number, size: number, ls: number): Met {
  const n = [...text].length;
  if (typeof document === 'undefined') return { w: n * size * 0.6 + ls * size * Math.max(0, n - 1), asc: size * 0.9, desc: size * 0.25 };
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return { w: n * size * 0.6, asc: size * 0.9, desc: size * 0.25 };
  mctx.font = `${wt} 100px "${fam}"`;
  const m = mctx.measureText(text);
  const k = size / 100;
  return { w: m.width * k + ls * size * Math.max(0, n - 1), asc: (m.actualBoundingBoxAscent || 72) * k, desc: (m.actualBoundingBoxDescent || 20) * k };
}
// xuống dòng tham lam; 2 dòng thì cân lại cho đều
function wrap(text: string, maxW: number, fam: string, wt: number, size: number, ls: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (!cur || measure(t, fam, wt, size, ls).w <= maxW) cur = t; else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  if (out.length === 2) {
    const words = out.join(' ').split(' ');
    let best = out, bw = Math.max(...out.map((l) => measure(l, fam, wt, size, ls).w));
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(measure(a, fam, wt, size, ls).w, measure(b, fam, wt, size, ls).w);
      if (w <= maxW && w < bw - 0.5) { best = [a, b]; bw = w; }
    }
    return best;
  }
  return out;
}

// ---------- xếp chồng khối dọc, tự co cho vừa ----------
type Role = 'title' | 'sub' | 'small' | 'kicker' | 'huge';
interface TB { t: 'text'; key: string; text: string; role: Role; size: number; maxLines: number; min: number; raise?: boolean; color?: string }
interface LB { t: 'logo'; h: number; wf?: number }
interface RB { t: 'rule'; w: number; thick: number }
interface GB { t: 'gap'; h: number }
type Block = TB | LB | RB | GB;
interface Placed { blocks: (PlacedText | PlacedLogo | PlacedRule)[] }
interface PlacedText { t: 'text'; key: string; lines: string[]; size: number; base: number[]; x: number; anchor: 'middle' | 'start'; fam: string; wt: number; ls: number; color: string; raise: boolean }
interface PlacedLogo { t: 'logo'; x: number; y: number; w: number; h: number }
interface PlacedRule { t: 'rule'; x1: number; x2: number; y: number; thick: number }
interface Ctx { font: PLFont; fg: string; acc: string; sub: string }

function styleOf(role: Role, c: Ctx): { fam: string; wt: number; ls: number; upper: boolean; color: string } {
  if (role === 'title' || role === 'huge') return { fam: c.font.family, wt: c.font.weight, ls: role === 'huge' ? 0.06 : 0.02, upper: c.font.upper, color: c.fg };
  if (role === 'kicker') return { fam: BODY, wt: 800, ls: 0.16, upper: true, color: c.acc };
  if (role === 'sub') return { fam: BODY, wt: 600, ls: 0.1, upper: true, color: c.sub };
  return { fam: BODY, wt: 600, ls: 0.01, upper: false, color: c.sub };
}
const vn = (s: string, up: boolean) => (up ? s.toLocaleUpperCase('vi') : s);

function stack(blocks: Block[], box: { x: number; y: number; w: number; h: number }, align: 'center' | 'left', c: Ctx): Placed {
  let k = 1;
  type Fit = { lines: string[]; size: number; asc: number; desc: number; h: number };
  let fits: (Fit | null)[] = [];
  let total = 0;
  for (let iter = 0; iter < 14; iter++) {
    fits = blocks.map((b) => {
      if (b.t !== 'text') return null;
      const st = styleOf(b.role, c);
      const txt = vn(b.text, st.upper);
      let size = Math.max(b.min, b.size * k);
      let lines = wrap(txt, box.w, st.fam, st.wt, size, st.ls);
      // vượt số dòng hoặc có dòng (1 từ) vẫn tràn ngang → co cỡ chữ
      for (let g = 0; g < 40 && size > b.min && (lines.length > b.maxLines || lines.some((l) => measure(l, st.fam, st.wt, size, st.ls).w > box.w)); g++) {
        size = Math.max(b.min, size * 0.94);
        lines = wrap(txt, box.w, st.fam, st.wt, size, st.ls);
      }
      // chạm cỡ tối thiểu mà vẫn dư dòng (tên công ty rất dài) → co thêm tối đa 28%, rồi chấp nhận thêm dòng
      // (KHÔNG dồn chữ vào 1 dòng — sẽ tràn ngang); chiều cao tổng do vòng ngoài tự co.
      for (let g = 0; g < 12 && lines.length > b.maxLines && size > b.min * 0.72; g++) {
        size *= 0.95; lines = wrap(txt, box.w, st.fam, st.wt, size, st.ls);
      }
      const ms = lines.map((l) => measure(l, st.fam, st.wt, size, st.ls));
      const asc = Math.max(...ms.map((m) => m.asc), size * 0.7), desc = Math.max(...ms.map((m) => m.desc), size * 0.18);
      const h = lines.length * (asc + desc) + (lines.length - 1) * size * 0.14;
      return { lines, size, asc, desc, h };
    });
    total = blocks.reduce((s, b, i) => s + (b.t === 'text' ? fits[i]!.h : b.t === 'logo' ? b.h * k : b.t === 'rule' ? b.thick : b.h * k), 0);
    if (total <= box.h + 0.01) break;
    k *= Math.max(0.6, (box.h / total) * 0.985);
  }
  let y = box.y + Math.max(0, (box.h - total) / 2);
  const out: Placed['blocks'] = [];
  const x = align === 'center' ? box.x + box.w / 2 : box.x;
  blocks.forEach((b, i) => {
    if (b.t === 'gap') { y += b.h * k; return; }
    if (b.t === 'rule') {
      const w = Math.min(box.w, b.w);
      out.push({ t: 'rule', x1: align === 'center' ? x - w / 2 : x, x2: align === 'center' ? x + w / 2 : x + w, y: y + b.thick / 2, thick: b.thick });
      y += b.thick; return;
    }
    if (b.t === 'logo') {
      const h = b.h * k, w = h * (b.wf ?? 1);
      out.push({ t: 'logo', x: align === 'center' ? x - w / 2 : x, y, w, h });
      y += h; return;
    }
    const f = fits[i]!; const st = styleOf(b.role, c);
    const base = f.lines.map((_, j) => y + f.asc + j * (f.asc + f.desc + f.size * 0.14));
    out.push({ t: 'text', key: b.key, lines: f.lines, size: f.size, base, x, anchor: align === 'center' ? 'middle' : 'start', fam: st.fam, wt: st.wt, ls: st.ls, color: b.color || st.color, raise: !!b.raise });
    y += f.h;
  });
  return { blocks: out };
}

export const initials = (s: string) => {
  const w = (s || '').trim().split(/\s+/).filter(Boolean);
  return (w.length >= 2 ? w.slice(0, 2).map((x) => [...x][0]).join('') : [...(w[0] || 'A')].slice(0, 2).join('')).toLocaleUpperCase('vi');
};

export interface PLRender { spec: PLSpec; data: PLData; logo?: string; mode?: PLMode; className?: string; style?: CSSProperties }

export function PlaqueSvg({ spec, data, logo, mode = 'preview', className, style }: PLRender) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = plGeom(spec.kind, spec.size);
  const { W, H } = g;
  const pal = plPalette(spec.palette);
  const font = plFont(spec.font);
  const mat = spec.material;
  const metal = mat !== 'mica';
  const wood = mat === 'wood';
  const fg = wood ? '#3A2416' : metal ? pal.inkM : pal.fg;
  const acc = wood ? '#6A4424' : mat === 'inoxGold' ? pal.inkM : metal ? pal.accM : pal.acc; // trên inox vàng: nhấn = màu mực (đủ tương phản)
  const sub = fg;
  const c: Ctx = { font, fg, acc, sub };
  const raiseOn = mat === 'mica';
  const letterFill = !raiseOn || spec.letter === 'ink' ? fg : `url(#${uid}-${spec.letter})`;
  const b = mode === 'print' ? PL_BLEED_MM : 0;

  const box = { x: g.padX, y: g.padY, w: W - g.padX * 2, h: H - g.padY * 2 };
  const A = box.h;
  const d = { ...data };
  const has = (k: string) => !!(d[k] || '').trim();
  let placed: Placed[] = [];
  const decor: ReactNode[] = [];
  const logoBlocks: PlacedLogo[] = [];

  const L = spec.layout;
  if (spec.kind === 'company') {
    if (L === 'center') {
      placed = [stack([
        { t: 'logo', h: A * 0.2, wf: logo ? 2 : 1 }, { t: 'gap', h: A * 0.05 },
        { t: 'text', key: 'company', text: d.company, role: 'title', size: A * 0.15, maxLines: 2, min: A * 0.05, raise: true },
        { t: 'gap', h: A * 0.035 },
        ...(has('en') ? [{ t: 'text', key: 'en', text: d.en, role: 'sub', size: A * 0.05, maxLines: 2, min: A * 0.025 } as Block, { t: 'gap', h: A * 0.04 } as Block] : []),
        { t: 'rule', w: box.w * 0.28, thick: Math.max(1, A * 0.006) }, { t: 'gap', h: A * 0.04 },
        ...(has('mst') ? [{ t: 'text', key: 'mst', text: d.mst, role: 'small', size: A * 0.042, maxLines: 1, min: A * 0.022 } as Block, { t: 'gap', h: A * 0.014 } as Block] : []),
        ...(has('address') ? [{ t: 'text', key: 'address', text: d.address, role: 'small', size: A * 0.042, maxLines: 2, min: A * 0.022 } as Block] : []),
        ...(has('contact') ? [{ t: 'gap', h: A * 0.014 } as Block, { t: 'text', key: 'contact', text: d.contact, role: 'small', size: A * 0.04, maxLines: 1, min: A * 0.022 } as Block] : []),
      ], box, 'center', c)];
    } else if (L === 'logoLeft') {
      const lw = Math.min(A * 0.62, box.w * 0.27);
      const tx = box.x + lw + box.w * 0.06;
      logoBlocks.push({ t: 'logo', x: box.x, y: box.y + (A - lw) / 2, w: lw, h: lw });
      decor.push(<line key="div" x1={box.x + lw + box.w * 0.03} x2={box.x + lw + box.w * 0.03} y1={box.y + A * 0.12} y2={box.y + A * 0.88} stroke={acc} strokeWidth={Math.max(1, A * 0.006)} />);
      const tb = { x: tx, y: box.y, w: box.x + box.w - tx, h: A };
      placed = [stack([
        { t: 'text', key: 'company', text: d.company, role: 'title', size: A * 0.14, maxLines: 2, min: A * 0.05, raise: true },
        { t: 'gap', h: A * 0.035 },
        ...(has('en') ? [{ t: 'text', key: 'en', text: d.en, role: 'sub', size: A * 0.048, maxLines: 2, min: A * 0.025 } as Block, { t: 'gap', h: A * 0.04 } as Block] : []),
        { t: 'rule', w: tb.w * 0.22, thick: Math.max(1, A * 0.006) }, { t: 'gap', h: A * 0.04 },
        ...(has('mst') ? [{ t: 'text', key: 'mst', text: d.mst, role: 'small', size: A * 0.04, maxLines: 1, min: A * 0.022 } as Block, { t: 'gap', h: A * 0.012 } as Block] : []),
        ...(has('address') ? [{ t: 'text', key: 'address', text: d.address, role: 'small', size: A * 0.04, maxLines: 2, min: A * 0.022 } as Block] : []),
        ...(has('contact') ? [{ t: 'gap', h: A * 0.012 } as Block, { t: 'text', key: 'contact', text: d.contact, role: 'small', size: A * 0.038, maxLines: 1, min: A * 0.022 } as Block] : []),
      ], tb, 'left', c)];
    } else if (L === 'bilingual') {
      const foot = (d.mst && d.address) ? `${d.mst}  ·  ${d.address}` : (d.mst || d.address || '');
      placed = [stack([
        { t: 'text', key: 'company', text: d.company, role: 'title', size: A * 0.16, maxLines: 2, min: A * 0.05, raise: true },
        { t: 'gap', h: A * 0.05 }, { t: 'rule', w: box.w * 0.62, thick: Math.max(1, A * 0.005) }, { t: 'gap', h: A * 0.05 },
        ...(has('en') ? [{ t: 'text', key: 'en', text: d.en, role: 'sub', size: A * 0.075, maxLines: 2, min: A * 0.03, color: acc } as Block, { t: 'gap', h: A * 0.07 } as Block] : []),
        ...(foot ? [{ t: 'text', key: 'foot', text: foot, role: 'small', size: A * 0.04, maxLines: 2, min: A * 0.022 } as Block] : []),
        ...(has('contact') ? [{ t: 'gap', h: A * 0.012 } as Block, { t: 'text', key: 'contact', text: d.contact, role: 'small', size: A * 0.038, maxLines: 1, min: A * 0.022 } as Block] : []),
      ], box, 'center', c)];
    } else if (L === 'minimal') {
      placed = [stack([
        { t: 'text', key: 'brand', text: d.brand || d.company, role: 'huge', size: A * 0.34, maxLines: 1, min: A * 0.08, raise: true },
        { t: 'gap', h: A * 0.06 }, { t: 'rule', w: box.w * 0.12, thick: Math.max(1, A * 0.006) }, { t: 'gap', h: A * 0.06 },
        { t: 'text', key: 'company', text: d.company, role: 'sub', size: A * 0.058, maxLines: 2, min: A * 0.026 },
        ...(has('address') ? [{ t: 'gap', h: A * 0.025 } as Block, { t: 'text', key: 'address', text: d.address, role: 'small', size: A * 0.038, maxLines: 2, min: A * 0.022 } as Block] : []),
      ], box, 'center', c)];
    } else { // band
      const bandH = H * 0.3;
      decor.push(<rect key="band" x={-b} y={-b} width={W + b * 2} height={bandH + b} fill={acc} />);
      const lh = bandH * 0.52;
      const bx = { x: g.padX, y: 0, w: W - g.padX * 2, h: bandH };
      logoBlocks.push({ t: 'logo', x: bx.x, y: (bandH - lh) / 2, w: lh, h: lh });
      const bandCtx: Ctx = { ...c, fg: mat === 'mica' ? (isLight(acc) ? '#1B1B1B' : '#FFFFFF') : '#FFFFFF', sub: mat === 'mica' ? (isLight(acc) ? '#1B1B1B' : '#FFFFFF') : '#FFFFFF' };
      const bt = { x: bx.x + lh * 1.25, y: bandH * 0.2, w: bx.w - lh * 1.25, h: bandH * 0.6 };
      const brandP = stack([{ t: 'text', key: 'brand', text: d.brand || d.company, role: 'title', size: bandH * 0.36, maxLines: 1, min: bandH * 0.12 }], bt, 'left', bandCtx);
      const body = { x: box.x, y: bandH + H * 0.06, w: box.w, h: H - g.padY - (bandH + H * 0.06) };
      const B2 = body.h;
      placed = [brandP, stack([
        { t: 'text', key: 'company', text: d.company, role: 'title', size: B2 * 0.24, maxLines: 2, min: B2 * 0.07, raise: true },
        { t: 'gap', h: B2 * 0.05 },
        ...(has('en') ? [{ t: 'text', key: 'en', text: d.en, role: 'sub', size: B2 * 0.075, maxLines: 2, min: B2 * 0.035, color: acc } as Block, { t: 'gap', h: B2 * 0.06 } as Block] : []),
        ...(has('mst') ? [{ t: 'text', key: 'mst', text: d.mst, role: 'small', size: B2 * 0.06, maxLines: 1, min: B2 * 0.032 } as Block, { t: 'gap', h: B2 * 0.02 } as Block] : []),
        ...(has('address') ? [{ t: 'text', key: 'address', text: d.address, role: 'small', size: B2 * 0.06, maxLines: 2, min: B2 * 0.032 } as Block] : []),
      ], body, 'center', c)];
    }
  } else if (spec.kind === 'room') {
    if (L === 'roomLeft') {
      const lw = Math.min(A * 0.95, box.w * 0.2);
      logoBlocks.push({ t: 'logo', x: box.x, y: box.y + (A - lw) / 2, w: lw, h: lw });
      decor.push(<line key="div" x1={box.x + lw + box.w * 0.035} x2={box.x + lw + box.w * 0.035} y1={box.y + A * 0.1} y2={box.y + A * 0.9} stroke={acc} strokeWidth={Math.max(0.6, A * 0.012)} />);
      const tx = box.x + lw + box.w * 0.07;
      placed = [stack([
        { t: 'text', key: 'room', text: d.room, role: 'title', size: A * 0.4, maxLines: 2, min: A * 0.14, raise: true },
        ...(has('en') ? [{ t: 'gap', h: A * 0.08 } as Block, { t: 'text', key: 'en', text: d.en, role: 'sub', size: A * 0.15, maxLines: 1, min: A * 0.08, color: acc } as Block] : []),
      ], { x: tx, y: box.y, w: box.x + box.w - tx, h: A }, 'left', c)];
    } else if (L === 'title') {
      placed = [stack([
        ...(has('position') ? [{ t: 'text', key: 'position', text: d.position, role: 'kicker', size: A * 0.16, maxLines: 1, min: A * 0.07 } as Block, { t: 'gap', h: A * 0.06 } as Block, { t: 'rule', w: box.w * 0.16, thick: Math.max(0.6, A * 0.012) } as Block, { t: 'gap', h: A * 0.08 } as Block] : []),
        { t: 'text', key: 'person', text: d.person || d.room, role: 'title', size: A * 0.36, maxLines: 1, min: A * 0.12, raise: true },
        ...(has('room') && spec.size === '30x15' ? [{ t: 'gap', h: A * 0.07 } as Block, { t: 'text', key: 'room', text: d.room, role: 'sub', size: A * 0.1, maxLines: 1, min: A * 0.06 } as Block] : []),
      ], box, 'center', c)];
    } else { // roomCenter
      placed = [stack([
        { t: 'text', key: 'room', text: d.room, role: 'title', size: A * 0.46, maxLines: 2, min: A * 0.14, raise: true },
        ...(has('en') ? [{ t: 'gap', h: A * 0.09 } as Block, { t: 'text', key: 'en', text: d.en, role: 'sub', size: A * 0.15, maxLines: 1, min: A * 0.08, color: acc } as Block] : []),
        ...(has('person') && spec.size === '30x15' ? [{ t: 'gap', h: A * 0.06 } as Block, { t: 'text', key: 'person', text: [d.position, d.person].filter(Boolean).join(': '), role: 'small', size: A * 0.11, maxLines: 1, min: A * 0.06 } as Block] : []),
      ], box, 'center', c)];
    }
  } else { // number
    placed = [stack([
      ...(L === 'numberLogo' ? [{ t: 'logo', h: A * 0.2, wf: logo ? 2 : 1 } as Block, { t: 'gap', h: A * 0.05 } as Block] : []),
      { t: 'text', key: 'number', text: d.number, role: 'huge', size: A * (L === 'numberLogo' ? 0.5 : 0.66), maxLines: 1, min: A * 0.15, raise: true },
      ...(has('line') ? [{ t: 'gap', h: A * 0.05 } as Block, { t: 'rule', w: box.w * 0.3, thick: Math.max(0.6, A * 0.012) } as Block, { t: 'gap', h: A * 0.05 } as Block, { t: 'text', key: 'line', text: d.line, role: 'small', size: A * 0.1, maxLines: 2, min: A * 0.06 } as Block] : []),
    ], box, 'center', c)];
  }

  const all = placed.flatMap((p) => p.blocks);
  for (const bl of all) if (bl.t === 'logo') logoBlocks.push(bl);
  const rules = all.filter((x): x is PlacedRule => x.t === 'rule');
  const texts = all.filter((x): x is PlacedText => x.t === 'text');

  const logoEl = (lb: PlacedLogo, i: number) => {
    if (logo) return <image key={`lg${i}`} href={logo} x={lb.x} y={lb.y} width={lb.w} height={lb.h} preserveAspectRatio="xMidYMid meet" />;
    // monogram: vòng tròn + chữ viết tắt
    const r = Math.min(lb.w, lb.h) / 2, cx = lb.x + lb.w / 2, cy = lb.y + lb.h / 2;
    const ini = initials(d.brand || d.company);
    const ms = measure(ini, font.family, font.weight, r, 0);
    const fs = Math.min(r * 0.95, (r * 1.25 * r) / Math.max(1, ms.w));
    const m2 = measure(ini, font.family, font.weight, fs, 0);
    const col = spec.layout === 'band' && mat === 'mica' ? (isLight(acc) ? '#1B1B1B' : '#FFFFFF') : spec.layout === 'band' ? '#FFFFFF' : acc;
    return (
      <g key={`lg${i}`}>
        <circle cx={cx} cy={cy} r={r - Math.max(0.6, r * 0.05)} fill="none" stroke={col} strokeWidth={Math.max(0.8, r * 0.08)} />
        <text x={cx} y={cy + (m2.asc - m2.desc) / 2} textAnchor="middle" fontFamily={`"${font.family}"`} fontWeight={font.weight} fontSize={fs} fill={col} data-pl-text="logo">{ini}</text>
      </g>
    );
  };

  const textEl = (tb: PlacedText, i: number, raised: boolean, printCut = false) => tb.lines.map((ln, j) => (
    <text key={`${i}-${j}`} x={tb.anchor === 'middle' ? tb.x + (tb.ls * tb.size) / 2 : tb.x} y={tb.base[j]} textAnchor={tb.anchor}
      fontFamily={`"${tb.fam}"`} fontWeight={tb.wt} fontSize={tb.size} letterSpacing={tb.ls * tb.size}
      fill={printCut ? 'none' : raised ? letterFill : tb.color}
      stroke={printCut ? '#00AEEF' : undefined} strokeWidth={printCut ? 0.3 : undefined}
      data-pl-text={tb.key} data-pl-size={tb.size.toFixed(2)}>{ln}</text>
  ));

  // ---- nền ----
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  let bg: ReactNode = null;
  if (mode !== 'print' || mat === 'mica') {
    if (mat === 'mica' || mode === 'print') bg = <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={pal.bg} />;
    else if (mode === 'preview') bg = <rect x={0} y={0} width={W} height={H} rx={g.radius} fill={`url(#${uid}-mat)`} />;
  }
  if (mode === 'tex' && mat !== 'mica') bg = null;
  const matGrad = mat === 'alu' ? ['#E4E6E9', '#BFC4CA', '#E9EBEE', '#C6CBD1']
    : mat === 'inox' ? ['#F1F2F4', '#C9CDD2', '#F5F6F7', '#D1D4D8']
      : mat === 'inoxGold' ? ['#F4E3A6', '#C99B3E', '#F7E8B4', '#B98A2F']
        : ['#D6A66C', '#B9834B', '#D9AB72', '#BE8A53'];

  const raisedTexts = texts.filter((t) => t.raise && raiseOn);
  const flatTexts = texts.filter((t) => !(t.raise && raiseOn));

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" className={className} style={style}
      width={mode === 'print' ? `${W + b * 2}mm` : undefined} height={mode === 'print' ? `${H + b * 2}mm` : undefined} data-pl-mode={mode}>
      <defs>
        <linearGradient id={`${uid}-mat`} x1="0" y1="0" x2="1" y2="1">
          {matGrad.map((col, i) => <stop key={i} offset={i / (matGrad.length - 1)} stopColor={col} />)}
        </linearGradient>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F7E3A1" /><stop offset="0.45" stopColor="#D4A73E" /><stop offset="0.55" stopColor="#B8862A" /><stop offset="1" stopColor="#EDD08A" />
        </linearGradient>
        <linearGradient id={`${uid}-silver`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" /><stop offset="0.45" stopColor="#C9CED4" /><stop offset="0.55" stopColor="#A9AFB7" /><stop offset="1" stopColor="#EEF0F2" />
        </linearGradient>
        <pattern id={`${uid}-brush`} width="40" height="3" patternUnits="userSpaceOnUse">
          <rect width="40" height="3" fill="none" />
          <line x1="0" y1="0.8" x2="40" y2="0.8" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="0.25" />
          <line x1="0" y1="2.2" x2="40" y2="2.2" stroke="#000000" strokeOpacity="0.06" strokeWidth="0.25" />
        </pattern>
        <pattern id={`${uid}-grain`} width={W} height="9" patternUnits="userSpaceOnUse">
          <path d={`M0 3 Q ${W / 4} 1.5 ${W / 2} 3.5 T ${W} 3`} stroke="#7A4A22" strokeOpacity="0.22" strokeWidth="0.7" fill="none" />
          <path d={`M0 7 Q ${W / 3} 8.5 ${W * 0.66} 6.5 T ${W} 7.4`} stroke="#6A3E1A" strokeOpacity="0.14" strokeWidth="0.5" fill="none" />
        </pattern>
        <clipPath id={`${uid}-clip`}><rect x={0} y={0} width={W} height={H} rx={g.radius} /></clipPath>
      </defs>
      {mode === 'print' ? (
        <>
          <g id="In">
            {bg}
            {decor}
            {rules.map((r, i) => <line key={`r${i}`} x1={r.x1} x2={r.x2} y1={r.y} y2={r.y} stroke={acc} strokeWidth={r.thick} />)}
            {logoBlocks.map(logoEl)}
            {flatTexts.map((t, i) => textEl(t, i, false))}
          </g>
          {raisedTexts.length > 0 && <g id="ChuNoi">{raisedTexts.map((t, i) => textEl(t, 100 + i, true, true))}</g>}
          <g id="CutContour"><rect x={0} y={0} width={W} height={H} rx={g.radius} fill="none" stroke="#EC008C" strokeWidth={0.3} /></g>
          <g id="Khoan">
            {g.holes.map((h, i) => (
              <g key={i} stroke="#00A651" strokeWidth={0.25} fill="none">
                <circle cx={h.x} cy={h.y} r={g.drill / 2} />
                <line x1={h.x - g.drill} x2={h.x + g.drill} y1={h.y} y2={h.y} /><line x1={h.x} x2={h.x} y1={h.y - g.drill} y2={h.y + g.drill} />
              </g>
            ))}
          </g>
        </>
      ) : (
        <g clipPath={mode === 'preview' ? `url(#${uid}-clip)` : undefined}>
          {bg}
          {mode === 'preview' && (mat === 'alu' || mat === 'inox') && <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-brush)`} />}
          {mode === 'preview' && mat === 'wood' && <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}-grain)`} />}
          {decor}
          {rules.map((r, i) => <line key={`r${i}`} x1={r.x1} x2={r.x2} y1={r.y} y2={r.y} stroke={acc} strokeWidth={r.thick} />)}
          {logoBlocks.map(logoEl)}
          {flatTexts.map((t, i) => textEl(t, i, false))}
          {raisedTexts.length > 0 && (
            <g data-raise="1">
              {mode === 'preview' && <g transform={`translate(${Math.max(0.4, H * 0.004)} ${Math.max(0.5, H * 0.005)})`} opacity={0.35}>{raisedTexts.map((t, i) => t.lines.map((ln, j) => (
                <text key={`s${i}-${j}`} x={t.anchor === 'middle' ? t.x + (t.ls * t.size) / 2 : t.x} y={t.base[j]} textAnchor={t.anchor} fontFamily={`"${t.fam}"`} fontWeight={t.wt} fontSize={t.size} letterSpacing={t.ls * t.size} fill="#000">{ln}</text>
              )))}</g>}
              {raisedTexts.map((t, i) => textEl(t, 200 + i, true))}
            </g>
          )}
          {mode === 'preview' && g.holes.map((h, i) => (
            <g key={`cap${i}`}>
              <circle cx={h.x} cy={h.y} r={g.capD / 2} fill={`url(#${uid}-silver)`} stroke="#8D949C" strokeWidth={0.4} />
              <circle cx={h.x - g.capD * 0.12} cy={h.y - g.capD * 0.12} r={g.capD * 0.16} fill="#FFFFFF" opacity={0.55} />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

function isLight(hex: string) {
  const s = hex.replace('#', ''); const [r, g2, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g2 + 0.114 * b > 160;
}
