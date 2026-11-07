'use client';
// Hashtag cầm tay (bảng chữ bế viền chụp ảnh sự kiện): chữ bay + chữ đậm + hình trang trí, viền trắng ôm theo chữ.
// Mẫu = nội dung theo dịp × màu × bộ font; bế viền dùng chung engine sticker (diecutFromArt) → file cắt CutContour.

import { nameFont } from './card-engine';
import { diecutFromArt, icon3d, trimAlpha, type CutResult } from './cutout-engine';

export type HtRole = 'script' | 'bold' | 'small';
export interface HtLine { t: string; role: HtRole; c: 'a' | 'b'; s?: number }
export interface HtTemplate { id: string; occasion: string; name: string; lines: HtLine[]; deco: string | null; decoPos: 'right' | 'both'; palette: string; fontSet: string }
export interface HtSpec { tpl: string; texts: string[]; palette: string; fontSet: string; deco: string | null; widthMm: number }

export const HT_OCCASIONS = [
  { id: '2011', name: '20/11' }, { id: 'bday', name: 'Sinh nhật' }, { id: 'wedding', name: 'Đám cưới' },
  { id: 'grad', name: 'Tốt nghiệp' }, { id: 'open', name: 'Khai trương' }, { id: 'tet', name: 'Tết' },
];
export const HT_PALETTES = [
  { id: 'red', name: 'Đỏ – đen', a: '#D7263D', b: '#1F2329' },
  { id: 'pink', name: 'Hồng', a: '#E3437A', b: '#3B2A33' },
  { id: 'gold', name: 'Vàng đồng', a: '#B8862B', b: '#2A2118' },
  { id: 'navy', name: 'Xanh navy', a: '#2457C5', b: '#14213D' },
  { id: 'purple', name: 'Tím', a: '#7446D6', b: '#24183D' },
];
export const HT_FONTSETS = [
  { id: 'f1', name: 'Bay bổng', script: 'greatvibes', bold: 'montserrat' },
  { id: 'f2', name: 'Mềm mại', script: 'dancing', bold: 'baloo' },
  { id: 'f3', name: 'Vui tươi', script: 'lobster', bold: 'bungee' },
  { id: 'f4', name: 'Sang trọng', script: 'alexbrush', bold: 'playfair' },
];
export const HT_DECOS = ['red_heart', 'sparkles', 'birthday_cake', 'party_popper', 'ring', 'trophy', 'glowing_star', 'wrapped_gift', 'crown'];
export const HT_SIZES = [300, 400, 500, 600, 800]; // chiều ngang (mm)
export const HT_ROLE_LABEL: Record<HtRole, string> = { script: 'chữ bay', bold: 'chữ đậm', small: 'dòng nhỏ' };

export const HT_TEMPLATES: HtTemplate[] = [
  { id: 'tri-an', occasion: '2011', name: 'Tri ân + ngày', deco: 'red_heart', decoPos: 'both', palette: 'red', fontSet: 'f1', lines: [
    { t: 'Tri ân Thầy Cô', role: 'script', c: 'b' }, { t: 'Nhân ngày 20/11', role: 'bold', c: 'a' }, { t: 'Chúc thầy cô luôn vui vẻ, hạnh phúc', role: 'small', c: 'b' }] },
  { id: 'so-lon', occasion: '2011', name: 'Số lớn', deco: 'sparkles', decoPos: 'right', palette: 'red', fontSet: 'f4', lines: [
    { t: '20-11', role: 'bold', c: 'b', s: 1.35 }, { t: 'Tri Ân Thầy Cô', role: 'script', c: 'a' }] },
  { id: 'nha-giao', occasion: '2011', name: 'Nhà giáo Việt Nam', deco: 'red_heart', decoPos: 'right', palette: 'red', fontSet: 'f2', lines: [
    { t: 'Chúc mừng ngày', role: 'script', c: 'b', s: 0.8 }, { t: 'Nhà giáo Việt Nam 20/11', role: 'script', c: 'b' }, { t: 'Uống nước nhớ nguồn', role: 'small', c: 'a', s: 0.56 }] },
  { id: 'cam-on', occasion: '2011', name: 'Cảm ơn Thầy Cô', deco: 'red_heart', decoPos: 'right', palette: 'red', fontSet: 'f1', lines: [
    { t: 'Cảm ơn', role: 'script', c: 'a', s: 0.75 }, { t: 'Thầy Cô', role: 'script', c: 'b', s: 1.3 }] },
  { id: 'happy-bday', occasion: 'bday', name: 'Happy Birthday', deco: 'birthday_cake', decoPos: 'right', palette: 'pink', fontSet: 'f3', lines: [
    { t: 'Happy', role: 'script', c: 'a' }, { t: 'Birthday', role: 'bold', c: 'b' }, { t: 'Bảo Anh tròn 18', role: 'small', c: 'a', s: 0.5 }] },
  { id: 'sn-vui-ve', occasion: 'bday', name: 'Sinh nhật vui vẻ', deco: 'party_popper', decoPos: 'both', palette: 'purple', fontSet: 'f2', lines: [
    { t: 'Sinh nhật', role: 'script', c: 'b' }, { t: 'Vui vẻ', role: 'bold', c: 'a', s: 1.1 }] },
  { id: 'just-married', occasion: 'wedding', name: 'Just Married', deco: 'ring', decoPos: 'right', palette: 'gold', fontSet: 'f4', lines: [
    { t: 'Just', role: 'script', c: 'b', s: 0.8 }, { t: 'Married', role: 'script', c: 'a', s: 1.25 }, { t: 'Quốc Bảo & Thu Hà', role: 'small', c: 'b', s: 0.45 }] },
  { id: 'hanh-phuc', occasion: 'wedding', name: 'Hạnh phúc', deco: 'red_heart', decoPos: 'both', palette: 'red', fontSet: 'f1', lines: [
    { t: 'Hạnh phúc', role: 'script', c: 'a', s: 1.1 }, { t: 'Trăm năm', role: 'bold', c: 'b', s: 0.7 }] },
  { id: 'tan-cu-nhan', occasion: 'grad', name: 'Tân cử nhân', deco: 'trophy', decoPos: 'right', palette: 'navy', fontSet: 'f1', lines: [
    { t: 'Tân cử nhân', role: 'script', c: 'b', s: 1.25 }, { t: 'Graduation 2026', role: 'bold', c: 'a', s: 0.7 }] },
  { id: 'chuc-mung-tn', occasion: 'grad', name: 'Chúc mừng tốt nghiệp', deco: 'glowing_star', decoPos: 'both', palette: 'gold', fontSet: 'f3', lines: [
    { t: 'Chúc mừng', role: 'script', c: 'b', s: 0.8 }, { t: 'Tốt nghiệp', role: 'bold', c: 'a' }] },
  { id: 'khai-truong', occasion: 'open', name: 'Khai trương', deco: 'party_popper', decoPos: 'both', palette: 'red', fontSet: 'f3', lines: [
    { t: 'Khai trương', role: 'script', c: 'b', s: 0.85 }, { t: 'Hồng phát', role: 'bold', c: 'a', s: 1.15 }] },
  { id: 'tet', occasion: 'tet', name: 'Chúc mừng năm mới', deco: 'sparkles', decoPos: 'both', palette: 'red', fontSet: 'f2', lines: [
    { t: 'Chúc mừng', role: 'script', c: 'b', s: 0.8 }, { t: 'Năm mới 2027', role: 'bold', c: 'a' }, { t: 'An khang thịnh vượng', role: 'small', c: 'b', s: 0.5 }] },
];
export const htTpl = (id: string) => HT_TEMPLATES.find((t) => t.id === id) || HT_TEMPLATES[0];
export const htSpecFrom = (t: HtTemplate, widthMm = 500): HtSpec => ({ tpl: t.id, texts: t.lines.map((l) => l.t), palette: t.palette, fontSet: t.fontSet, deco: t.deco, widthMm });
export const htDecoUrl = (id: string) => icon3d(id);

// ghép chữ + hình trang trí lên canvas trong suốt; B = cỡ chữ gốc (px) → quyết định độ phân giải ảnh in
function compose(spec: HtSpec, deco: HTMLImageElement | null, B: number): HTMLCanvasElement {
  const t = htTpl(spec.tpl);
  const pal = HT_PALETTES.find((p) => p.id === spec.palette) || HT_PALETTES[0];
  const fs = HT_FONTSETS.find((f) => f.id === spec.fontSet) || HT_FONTSETS[0];
  const meas = document.createElement('canvas').getContext('2d')!;
  const rows = t.lines.map((l, i) => {
    const text = (spec.texts[i] ?? l.t).trim();
    const f = nameFont(l.role === 'bold' ? fs.bold : fs.script);
    const size = B * (l.s ?? (l.role === 'small' ? 0.38 : l.role === 'bold' ? 0.82 : 1)) * (l.role === 'bold' && f.id === 'bungee' ? 0.85 : 1);
    const str = l.role === 'bold' ? text.toUpperCase() : text;
    meas.font = `${f.weight} ${size}px "${f.family}"`;
    const m = meas.measureText(str);
    const w = Math.max(m.width, (m.actualBoundingBoxLeft || 0) + (m.actualBoundingBoxRight || 0));
    const asc = m.actualBoundingBoxAscent || size * 0.75, desc = m.actualBoundingBoxDescent || size * 0.2;
    return { str, f, size, w, asc, desc, color: l.c === 'a' ? pal.a : pal.b };
  }).filter((r) => r.str);
  const maxW = Math.max(B, ...rows.map((r) => r.w));
  const M = B * 1.2;
  const gap = B * 0.06;
  const totalH = rows.reduce((h, r) => h + r.asc + r.desc + gap, 0);
  const c = document.createElement('canvas');
  c.width = Math.ceil(maxW + M * 2); c.height = Math.ceil(totalH + M * 2);
  const ctx = c.getContext('2d')!;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  const cx = c.width / 2;
  let y = M;
  rows.forEach((r) => {
    y += r.asc;
    ctx.font = `${r.f.weight} ${r.size}px "${r.f.family}"`; ctx.fillStyle = r.color;
    ctx.fillText(r.str, cx, y);
    y += r.desc + gap;
  });
  // hình trang trí bám góc dòng đầu (phải; "both" thêm bản nhỏ bên trái dòng cuối)
  if (deco && rows.length) {
    const r0 = rows[0], D = Math.max(B * 0.7, r0.asc * 1.15);
    const ar = (deco.naturalHeight || 1) / (deco.naturalWidth || 1);
    ctx.drawImage(deco, cx + r0.w / 2 - D * 0.08, M - D * 0.45, D, D * ar);
    if (spec.deco && htTpl(spec.tpl).decoPos === 'both') {
      const rl = rows[rows.length - 1], d2 = D * 0.7;
      ctx.drawImage(deco, cx - rl.w / 2 - d2 * 1.05, y - gap - rl.desc - rl.asc - d2 * 0.1, d2, d2 * ar);
    }
  }
  return trimAlpha(c);
}

// viền trắng ~2.2% bề ngang (50cm → 11mm), ảnh in ~150dpi (bảng cầm tay nhìn từ xa)
export function htBorderMm(widthMm: number) { return Math.min(14, Math.max(6, widthMm * 0.022)); }
export function buildHashtag(spec: HtSpec, deco: HTMLImageElement | null, quality: 'thumb' | 'full' = 'full'): CutResult {
  const B = quality === 'thumb' ? 70 : Math.min(420, Math.max(200, spec.widthMm * 0.55));
  const art = compose(spec, deco, B);
  const b = htBorderMm(spec.widthMm);
  const P = art.width / Math.max(50, spec.widthMm - b * 2);
  return diecutFromArt(art, { sizeMm: spec.widthMm, borderMm: b, edge: '#FFFFFF', P });
}
