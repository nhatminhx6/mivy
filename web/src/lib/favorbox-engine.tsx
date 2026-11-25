'use client';
// Hộp quà cưới mini (favor box) — hộp gối, hộp vuông nắp gài (lỗ xỏ ruy băng), lục giác, tam giác, hình nhà, túi xách mini.
// 1 engine dựng: (1) Art từng mặt hộp (mm) dùng chung cho file in + texture 3D, (2) khuôn bế sinh bằng code
// (đa giác tấm → cạnh chung = nét gấp, cạnh riêng = nét cắt; nét gấp cong cho hộp gối), (3) khuôn nhũ (ép kim),
// (4) bình nhiều con trên tờ in. Render 100% code, không AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export type Pt = [number, number];
const r2 = (n: number) => Math.round(n * 100) / 100;

// ======================= LOẠI HỘP · KHỔ =======================
export type FbKind = 'pillow' | 'square' | 'hex' | 'tri' | 'gable' | 'bag';
export const FB_KINDS: { id: FbKind; name: string; hint: string }[] = [
  { id: 'pillow', name: 'Hộp gối', hint: 'Gấp cong 2 đầu, không cần keo nắp' },
  { id: 'square', name: 'Vuông nắp gài', hint: 'Nắp gài + 2 lỗ xỏ ruy băng' },
  { id: 'hex', name: 'Lục giác', hint: 'Nắp lục giác in hình chính' },
  { id: 'tri', name: 'Tam giác', hint: 'Lăng trụ tam giác đứng' },
  { id: 'gable', name: 'Hình nhà', hint: 'Mái nhà 2 mặt dễ thương' },
  { id: 'bag', name: 'Túi xách mini', hint: 'Quai khoét lỗ xách tay' },
];
// a, b, c (mm) — nghĩa theo loại: gối W×L×D · vuông cạnh×cạnh×cao · lục giác/tam giác cạnh×—×cao · nhà/túi rộng×sâu×cao
export interface FbSize { id: string; kind: FbKind; name: string; a: number; b: number; c: number }
export const FB_SIZES: FbSize[] = [
  { id: 'pillow-s', kind: 'pillow', name: '60 × 90 mm', a: 60, b: 90, c: 20 },
  { id: 'pillow-l', kind: 'pillow', name: '80 × 120 mm', a: 80, b: 120, c: 26 },
  { id: 'square-s', kind: 'square', name: '50 × 50 × 50', a: 50, b: 50, c: 50 },
  { id: 'square-m', kind: 'square', name: '60 × 60 × 60', a: 60, b: 60, c: 60 },
  { id: 'square-l', kind: 'square', name: '80 × 80 × 60', a: 80, b: 80, c: 60 },
  { id: 'hex-s', kind: 'hex', name: 'Cạnh 30 · cao 50', a: 30, b: 0, c: 50 },
  { id: 'hex-l', kind: 'hex', name: 'Cạnh 40 · cao 60', a: 40, b: 0, c: 60 },
  { id: 'tri-s', kind: 'tri', name: 'Cạnh 55 · cao 60', a: 55, b: 0, c: 60 },
  { id: 'tri-l', kind: 'tri', name: 'Cạnh 70 · cao 80', a: 70, b: 0, c: 80 },
  { id: 'gable-s', kind: 'gable', name: '50 × 50 × 50', a: 50, b: 50, c: 50 },
  { id: 'gable-l', kind: 'gable', name: '70 × 60 × 60', a: 70, b: 60, c: 60 },
  { id: 'bag-s', kind: 'bag', name: '60 × 35 × 60', a: 60, b: 35, c: 60 },
  { id: 'bag-l', kind: 'bag', name: '80 × 45 × 80', a: 80, b: 45, c: 80 },
];
export const fbSize = (id: string) => FB_SIZES.find((s) => s.id === id) || FB_SIZES[0];
export const fbSizesFor = (k: FbKind) => FB_SIZES.filter((s) => s.kind === k);
export const FB_BLEED = 3;
export const GLUE = 12;
export const pillowSag = (s: FbSize) => s.c * 0.8;           // độ võng cung gấp 2 đầu hộp gối
export const gableRise = (s: FbSize) => r2(s.a * 0.42);       // chiều cao mái (tam giác đầu hồi)
export const bagHandle = (s: FbSize) => r2(s.c * 0.42);       // phần quai nhô trên thân túi

// ======================= FONT =======================
export interface FbFont { id: string; name: string; script: string; sw: number; serif: string; fw: number }
export const FB_FONTS: FbFont[] = [
  { id: 'classic', name: 'Cổ điển', script: 'Great Vibes', sw: 400, serif: 'Cormorant Garamond', fw: 700 },
  { id: 'elegant', name: 'Sang trọng', script: 'Great Vibes', sw: 400, serif: 'Playfair Display', fw: 800 },
  { id: 'soft', name: 'Mềm mại', script: 'Dancing Script', sw: 700, serif: 'Prata', fw: 400 },
  { id: 'modern', name: 'Hiện đại', script: 'Dancing Script', sw: 700, serif: 'Montserrat', fw: 800 },
];
export const fbFont = (id: string) => FB_FONTS.find((f) => f.id === id) || FB_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const FB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Cormorant+Garamond:wght@700&family=Dancing+Script:wght@700&family=Great+Vibes&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Prata&display=swap');`;

export function useFbFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-fb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-fb-fonts'; link.rel = 'stylesheet'; link.href = FB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...FB_FONTS.flatMap((f) => [`${f.sw} 40px "${f.script}"`, `${f.fw} 40px "${f.serif}"`]), `600 30px "${BODY}"`, `800 30px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ ầốềộ Aa 0123 &')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

let mctx: CanvasRenderingContext2D | null = null;
export function textW(s: string, family: string, weight: number, size: number) {
  if (typeof document === 'undefined') return s.length * size * 0.55;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.55;
  mctx.font = `${weight} ${size * 10}px "${family}"`;
  return mctx.measureText(s).width / 10;
}

// ======================= MÀU · ÉP KIM =======================
export interface FbPalette { id: string; name: string; paper: string; ink: string; accent: string; soft: string; ribbon: string; kraft?: boolean; dark?: boolean }
export const FB_PALETTES: FbPalette[] = [
  { id: 'ivory', name: 'Ngà · vàng', paper: '#FBF5EA', ink: '#5A4433', accent: '#B08B52', soft: '#EADBC2', ribbon: '#D8C29A' },
  { id: 'blush', name: 'Hồng phấn', paper: '#F8E5E2', ink: '#6B3C42', accent: '#C4848C', soft: '#EDC9C9', ribbon: '#E3A9AF' },
  { id: 'sage', name: 'Xanh sage', paper: '#E6EEE4', ink: '#30503E', accent: '#7A9A7F', soft: '#CADBC9', ribbon: '#A9C2AB' },
  { id: 'navy', name: 'Navy · vàng', paper: '#1F2D4C', ink: '#F5EEDC', accent: '#D6B36A', soft: '#33456B', ribbon: '#D6B36A', dark: true },
  { id: 'red', name: 'Đỏ Tết', paper: '#B1241D', ink: '#FFF2D3', accent: '#F2C14E', soft: '#C64238', ribbon: '#F2C14E', dark: true },
  { id: 'white', name: 'Trắng tối giản', paper: '#FFFFFF', ink: '#2C2C2C', accent: '#8E8E8E', soft: '#EDEDED', ribbon: '#C9C9C9' },
  { id: 'kraft', name: 'Kraft mộc', paper: '#C49A6C', ink: '#3B2716', accent: '#FFFFFF', soft: '#B48A5C', ribbon: '#F4EBDD', kraft: true },
  { id: 'lavender', name: 'Tím lavender', paper: '#ECE5F5', ink: '#4A3A6A', accent: '#9C86C8', soft: '#D9CDEC', ribbon: '#B7A5DB' },
  { id: 'baby', name: 'Xanh em bé', paper: '#E2EEF8', ink: '#2E4A66', accent: '#7AA5CF', soft: '#C8DCEE', ribbon: '#9CC0E2' },
];
export const fbPalette = (id: string) => FB_PALETTES.find((p) => p.id === id) || FB_PALETTES[0];

export type FbFoil = 'none' | 'gold' | 'silver' | 'rose';
export const FB_FOILS: { id: FbFoil; name: string; color: string }[] = [
  { id: 'none', name: 'Không ép kim', color: '' },
  { id: 'gold', name: 'Nhũ vàng', color: '#C9A44C' },
  { id: 'silver', name: 'Nhũ bạc', color: '#BFC4CB' },
  { id: 'rose', name: 'Nhũ hồng', color: '#D8A08A' },
];

// ======================= DỊP · MẪU =======================
export type Occ = 'cuoi' | 'thoinoi' | 'sinhnhat' | 'tet';
export const FB_OCCS: { id: Occ; name: string }[] = [
  { id: 'cuoi', name: 'Tiệc cưới' }, { id: 'thoinoi', name: 'Thôi nôi · đầy tháng' }, { id: 'sinhnhat', name: 'Sinh nhật' }, { id: 'tet', name: 'Tết' },
];
export type Motif = 'wreath' | 'rings' | 'hearts' | 'sprig' | 'balloon' | 'moon' | 'mai' | 'lantern';
export type Pattern = 'dots' | 'hearts' | 'stripes' | 'stars' | 'mai' | 'none';
export type Layout = 'wreath' | 'monogram' | 'band' | 'arch';
export const FB_LAYOUTS: { id: Layout; name: string }[] = [
  { id: 'wreath', name: 'Vòng lá' }, { id: 'monogram', name: 'Chữ lồng' }, { id: 'band', name: 'Dải ngang' }, { id: 'arch', name: 'Khung vòm' },
];
export type FbData = Record<string, string>;
export const FB_DATA: Record<Occ, FbData> = {
  cuoi: { title: 'Thank you', names: 'Quốc Bảo & Thu Hà', date: '20.12.2026', message: 'Cảm ơn bạn đã đến chung vui cùng chúng mình', contents: 'Kẹo cưới · Socola' },
  thoinoi: { title: 'Thôi nôi', names: 'Bé Gia Khánh', date: '15.01.2027', message: 'Cảm ơn cô chú đã đến mừng bé tròn 1 tuổi', contents: 'Bánh kẹo' },
  sinhnhat: { title: 'Happy Birthday', names: 'Bảo Ngọc', date: '08.03.2027', message: 'Cảm ơn bạn đã đến dự tiệc sinh nhật', contents: 'Socola · Kẹo dẻo' },
  tet: { title: 'Xuân Đinh Mùi', names: 'An Khang', date: 'Tết 2027', message: 'Chúc mừng năm mới · An khang thịnh vượng', contents: 'Mứt Tết · Hạt sen' },
};
export const FB_FIELDS: { key: string; label: string; ph: string; half?: boolean }[] = [
  { key: 'title', label: 'Lời chính (chữ bay)', ph: 'Thank you', half: true },
  { key: 'date', label: 'Ngày', ph: '20.12.2026', half: true },
  { key: 'names', label: 'Tên cô dâu & chú rể / tên bé', ph: 'Quốc Bảo & Thu Hà' },
  { key: 'message', label: 'Lời cảm ơn (mặt sau)', ph: 'Cảm ơn bạn đã đến chung vui' },
  { key: 'contents', label: 'Bên trong có (ghi chú nhỏ)', ph: 'Kẹo cưới · Socola' },
];

export interface FbTpl { id: string; name: string; occ: Occ; layout: Layout; palette: string; font: string; foil: FbFoil; motif: Motif; pattern: Pattern }
export const FB_TPLS: FbTpl[] = [
  { id: 'cuoi-ivory', name: 'Cưới · Ngà vòng lá', occ: 'cuoi', layout: 'wreath', palette: 'ivory', font: 'classic', foil: 'gold', motif: 'wreath', pattern: 'dots' },
  { id: 'cuoi-blush', name: 'Cưới · Hồng chữ lồng', occ: 'cuoi', layout: 'monogram', palette: 'blush', font: 'elegant', foil: 'rose', motif: 'hearts', pattern: 'hearts' },
  { id: 'cuoi-sage', name: 'Cưới · Sage khung vòm', occ: 'cuoi', layout: 'arch', palette: 'sage', font: 'soft', foil: 'gold', motif: 'sprig', pattern: 'none' },
  { id: 'cuoi-navy', name: 'Cưới · Navy nhẫn cưới', occ: 'cuoi', layout: 'band', palette: 'navy', font: 'elegant', foil: 'gold', motif: 'rings', pattern: 'stripes' },
  { id: 'cuoi-white', name: 'Cưới · Trắng tối giản', occ: 'cuoi', layout: 'monogram', palette: 'white', font: 'modern', foil: 'silver', motif: 'rings', pattern: 'none' },
  { id: 'cuoi-kraft', name: 'Cưới · Kraft mộc', occ: 'cuoi', layout: 'wreath', palette: 'kraft', font: 'classic', foil: 'none', motif: 'sprig', pattern: 'dots' },
  { id: 'thoinoi-baby', name: 'Thôi nôi · Xanh em bé', occ: 'thoinoi', layout: 'arch', palette: 'baby', font: 'soft', foil: 'none', motif: 'moon', pattern: 'stars' },
  { id: 'thoinoi-blush', name: 'Đầy tháng · Hồng', occ: 'thoinoi', layout: 'wreath', palette: 'blush', font: 'soft', foil: 'none', motif: 'moon', pattern: 'stars' },
  { id: 'sinhnhat-lav', name: 'Sinh nhật · Lavender', occ: 'sinhnhat', layout: 'band', palette: 'lavender', font: 'modern', foil: 'silver', motif: 'balloon', pattern: 'dots' },
  { id: 'sinhnhat-ivory', name: 'Sinh nhật · Bóng bay', occ: 'sinhnhat', layout: 'arch', palette: 'ivory', font: 'modern', foil: 'gold', motif: 'balloon', pattern: 'stars' },
  { id: 'tet-red', name: 'Tết · Đỏ hoa mai', occ: 'tet', layout: 'monogram', palette: 'red', font: 'elegant', foil: 'gold', motif: 'mai', pattern: 'mai' },
  { id: 'tet-ivory', name: 'Tết · Ngà đèn lồng', occ: 'tet', layout: 'band', palette: 'ivory', font: 'classic', foil: 'gold', motif: 'lantern', pattern: 'mai' },
];
export const fbTpl = (id: string) => FB_TPLS.find((t) => t.id === id) || FB_TPLS[0];

export interface FbSpec { kind: FbKind; size: string; tpl: string; palette: string; font: string; foil: FbFoil; layout: Layout }
export const fbSpecFor = (kind: FbKind, tpl = FB_TPLS[0]): FbSpec => ({
  kind, size: fbSizesFor(kind)[0].id, tpl: tpl.id, palette: tpl.palette, font: tpl.font, foil: tpl.palette === 'kraft' ? 'none' : tpl.foil, layout: tpl.layout,
});

// chữ lồng: chữ đầu tên cuối mỗi người ("Quốc Bảo & Thu Hà" → B & H; "Bé Gia Khánh" → K)
export function monogramOf(names: string): string {
  const parts = (names || '').split(/\s*(?:&|\+| và | and )\s*/i).map((p) => p.trim()).filter(Boolean);
  const ini = (p: string) => { const w = p.split(/\s+/).filter(Boolean); return (w[w.length - 1] || '?').charAt(0).toUpperCase(); };
  if (parts.length >= 2) return `${ini(parts[0])} & ${ini(parts[1])}`;
  return ini(parts[0] || '?');
}

// ======================= ART (mm) =======================
export type Item =
  | { t: 'p'; d: string; fill?: string; stroke?: string; sw?: number; op?: number; foil?: boolean; dash?: string }
  | { t: 'x'; s: string; x: number; y: number; size: number; family: string; weight: number; color: string; op?: number; foil?: boolean; ls?: number }
  | { t: 'img'; href: string; x: number; y: number; w: number; h: number };
export interface Art { w: number; h: number; bg: string | null; items: Item[] }
export type Role = 'main' | 'aux' | 'side' | 'cap' | 'plain';
export interface Box { x: number; y: number; w: number; h: number }
export interface Ctx { tpl: FbTpl; pal: FbPalette; font: FbFont; data: FbData; foil: FbFoil; layout: Layout; logo?: string }
export const ctxOf = (spec: FbSpec, data: FbData, logo?: string): Ctx => ({
  tpl: fbTpl(spec.tpl), pal: fbPalette(spec.palette), font: fbFont(spec.font), data, foil: fbPalette(spec.palette).kraft ? 'none' : spec.foil, layout: spec.layout, logo,
});
// màu "nhũ": ép kim → màu nhũ (khi in bị bỏ khỏi lớp In, đi khuôn ép riêng); không ép kim → màu nhấn của bảng màu
const deco = (c: Ctx) => (c.foil === 'none' ? c.pal.accent : FB_FOILS.find((f) => f.id === c.foil)!.color);

const circ = (cx: number, cy: number, r: number) => `M${r2(cx - r)} ${r2(cy)}a${r2(r)} ${r2(r)} 0 1 0 ${r2(2 * r)} 0a${r2(r)} ${r2(r)} 0 1 0 ${r2(-2 * r)} 0Z`;
const heartD = (cx: number, cy: number, s: number) =>
  `M${r2(cx)} ${r2(cy + s * 0.42)}C${r2(cx - s * 0.62)} ${r2(cy - s * 0.02)} ${r2(cx - s * 0.42)} ${r2(cy - s * 0.52)} ${r2(cx)} ${r2(cy - s * 0.2)}C${r2(cx + s * 0.42)} ${r2(cy - s * 0.52)} ${r2(cx + s * 0.62)} ${r2(cy - s * 0.02)} ${r2(cx)} ${r2(cy + s * 0.42)}Z`;
const starD = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${r2(cx + Math.cos(a) * rr)} ${r2(cy + Math.sin(a) * rr)}`; }
  return d + 'Z';
};
const flowerD = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5; d += circ(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, r * 0.48); }
  return d;
};
const leafD = (x: number, y: number, len: number, ang: number) => {
  const ca = Math.cos(ang), sa = Math.sin(ang), w = len * 0.36;
  const P = (u: number, v: number) => `${r2(x + u * ca - v * sa)} ${r2(y + u * sa + v * ca)}`;
  return `M${P(0, 0)}Q${P(len * 0.5, -w)} ${P(len, 0)}Q${P(len * 0.5, w)} ${P(0, 0)}Z`;
};

// ---- hoạ tiết trang trí chính (motif) trong ô vuông s, tâm (cx,cy) ----
function motifItems(m: Motif, cx: number, cy: number, s: number, c: Ctx): Item[] {
  const fx = deco(c), ink = c.pal.ink, out: Item[] = [];
  const foil = c.foil !== 'none';
  if (m === 'wreath' || m === 'sprig') {
    // 2 cành lá ôm nửa vòng tròn (wreath) hoặc 1 cành ngang (sprig)
    if (m === 'wreath') {
      const R = s * 0.46;
      for (const side of [-1, 1]) {
        let stem = '';
        for (let i = 0; i <= 14; i++) {
          const a = Math.PI / 2 + side * (0.15 + (i / 14) * 2.4);
          stem += `${i ? 'L' : 'M'}${r2(cx + Math.cos(a) * R)} ${r2(cy + Math.sin(a) * R)}`;
          if (i > 0 && i % 2 === 0) {
            const lx = cx + Math.cos(a) * R, ly = cy + Math.sin(a) * R;
            out.push({ t: 'p', d: leafD(lx, ly, s * 0.13, a + side * 1.9), fill: fx, foil });
            out.push({ t: 'p', d: leafD(lx, ly, s * 0.11, a + side * 1.0 + Math.PI), fill: fx, foil, op: 0.85 });
          }
        }
        out.push({ t: 'p', d: stem, stroke: fx, sw: Math.max(0.25, s * 0.012), foil });
      }
    } else {
      out.push({ t: 'p', d: `M${r2(cx - s * 0.42)} ${r2(cy + s * 0.05)}Q${r2(cx)} ${r2(cy - s * 0.12)} ${r2(cx + s * 0.42)} ${r2(cy + s * 0.05)}`, stroke: fx, sw: Math.max(0.25, s * 0.014), foil });
      for (let i = 0; i < 7; i++) {
        const u = -0.36 + i * 0.12, x = cx + u * s, y = cy + s * 0.02 - Math.cos(u * 3) * s * 0.06;
        out.push({ t: 'p', d: leafD(x, y, s * 0.14, -Math.PI / 2 - 0.5 + (i % 2) * 1.0), fill: fx, foil });
      }
      out.push({ t: 'p', d: flowerD(cx, cy - s * 0.06, s * 0.07), fill: ink, op: 0.85 });
    }
  } else if (m === 'rings') {
    const r = s * 0.2;
    out.push({ t: 'p', d: circ(cx - r * 0.55, cy + s * 0.04, r), stroke: fx, sw: Math.max(0.35, s * 0.03), foil });
    out.push({ t: 'p', d: circ(cx + r * 0.55, cy + s * 0.04, r), stroke: fx, sw: Math.max(0.35, s * 0.03), foil });
    out.push({ t: 'p', d: `M${r2(cx + r * 0.55)} ${r2(cy + s * 0.04 - r - s * 0.07)}l${r2(s * 0.05)} ${r2(s * 0.05)}l${r2(-s * 0.05)} ${r2(s * 0.05)}l${r2(-s * 0.05)} ${r2(-s * 0.05)}Z`, fill: fx, foil });
  } else if (m === 'hearts') {
    out.push({ t: 'p', d: heartD(cx - s * 0.1, cy, s * 0.42), fill: fx, foil });
    out.push({ t: 'p', d: heartD(cx + s * 0.16, cy + s * 0.08, s * 0.28), stroke: ink, sw: Math.max(0.3, s * 0.02) });
  } else if (m === 'balloon') {
    const cols = [c.pal.accent, c.pal.ink, fx];
    [[-0.18, -0.06, 0.2], [0.02, -0.16, 0.23], [0.2, -0.04, 0.19]].forEach(([dx, dy, rr], i) => {
      const bx = cx + dx * s, by = cy + dy * s, r = rr * s;
      out.push({ t: 'p', d: `M${r2(bx)} ${r2(by + r * 1.15)}Q${r2(cx + dx * s * 0.3)} ${r2(cy + s * 0.28)} ${r2(cx)} ${r2(cy + s * 0.44)}`, stroke: ink, sw: Math.max(0.2, s * 0.008), op: 0.7 });
      out.push({ t: 'p', d: `M${r2(bx)} ${r2(by - r)}C${r2(bx + r * 1.1)} ${r2(by - r)} ${r2(bx + r * 0.9)} ${r2(by + r * 0.9)} ${r2(bx)} ${r2(by + r * 1.15)}C${r2(bx - r * 0.9)} ${r2(by + r * 0.9)} ${r2(bx - r * 1.1)} ${r2(by - r)} ${r2(bx)} ${r2(by - r)}Z`, fill: cols[i], foil: i === 2 && foil });
    });
  } else if (m === 'moon') {
    const r = s * 0.3;
    out.push({ t: 'p', d: `M${r2(cx + r * 0.2)} ${r2(cy - r)}A${r2(r)} ${r2(r)} 0 1 0 ${r2(cx + r * 0.2)} ${r2(cy + r)}A${r2(r * 0.78)} ${r2(r * 0.78)} 0 1 1 ${r2(cx + r * 0.2)} ${r2(cy - r)}Z`, fill: fx, foil });
    out.push({ t: 'p', d: starD(cx + s * 0.28, cy - s * 0.2, s * 0.08), fill: fx, foil });
    out.push({ t: 'p', d: starD(cx + s * 0.34, cy + s * 0.12, s * 0.05), fill: ink, op: 0.7 });
    out.push({ t: 'p', d: starD(cx - s * 0.36, cy - s * 0.26, s * 0.045), fill: ink, op: 0.6 });
  } else if (m === 'mai') {
    out.push({ t: 'p', d: `M${r2(cx - s * 0.44)} ${r2(cy + s * 0.3)}Q${r2(cx - s * 0.1)} ${r2(cy + s * 0.1)} ${r2(cx + s * 0.1)} ${r2(cy - s * 0.12)}T${r2(cx + s * 0.44)} ${r2(cy - s * 0.32)}`, stroke: c.pal.dark ? c.pal.ink : '#6B4A2E', sw: Math.max(0.3, s * 0.03), op: 0.9 });
    [[-0.2, 0.18, 0.13], [0.04, -0.06, 0.16], [0.28, -0.24, 0.12], [0.2, 0.06, 0.09]].forEach(([dx, dy, rr]) => {
      out.push({ t: 'p', d: flowerD(cx + dx * s, cy + dy * s, rr * s), fill: c.pal.id === 'red' ? fx : '#E9B32C', foil: c.pal.id === 'red' && foil });
      out.push({ t: 'p', d: circ(cx + dx * s, cy + dy * s, rr * s * 0.25), fill: c.pal.id === 'red' ? c.pal.paper : '#B5361E' });
    });
  } else { // lantern
    const w = s * 0.4, h = s * 0.5, top = cy - h * 0.45;
    out.push({ t: 'p', d: `M${r2(cx)} ${r2(cy - s * 0.48)}V${r2(top)}`, stroke: c.pal.ink, sw: Math.max(0.25, s * 0.012) });
    out.push({ t: 'p', d: `M${r2(cx - w * 0.3)} ${r2(top)}H${r2(cx + w * 0.3)}V${r2(top + h * 0.08)}H${r2(cx - w * 0.3)}Z`, fill: fx, foil });
    out.push({ t: 'p', d: `M${r2(cx - w * 0.3)} ${r2(top + h * 0.08)}C${r2(cx - w * 0.62)} ${r2(top + h * 0.3)} ${r2(cx - w * 0.62)} ${r2(top + h * 0.7)} ${r2(cx - w * 0.3)} ${r2(top + h * 0.92)}H${r2(cx + w * 0.3)}C${r2(cx + w * 0.62)} ${r2(top + h * 0.7)} ${r2(cx + w * 0.62)} ${r2(top + h * 0.3)} ${r2(cx + w * 0.3)} ${r2(top + h * 0.08)}Z`, fill: c.pal.id === 'red' ? '#F6E2B3' : '#C8322A' });
    for (const dx of [-0.15, 0, 0.15]) out.push({ t: 'p', d: `M${r2(cx + dx * w * 1.6)} ${r2(top + h * 0.12)}V${r2(top + h * 0.88)}`, stroke: fx, sw: Math.max(0.2, s * 0.008), foil, op: 0.8 });
    out.push({ t: 'p', d: `M${r2(cx - w * 0.3)} ${r2(top + h * 0.92)}H${r2(cx + w * 0.3)}V${r2(top + h)}H${r2(cx - w * 0.3)}Z`, fill: fx, foil });
    out.push({ t: 'p', d: `M${r2(cx)} ${r2(top + h)}V${r2(top + h + s * 0.14)}`, stroke: '#C8322A', sw: Math.max(0.4, s * 0.025) });
  }
  return out;
}

// ---- hoạ tiết nền ----
function patternItems(p: Pattern, w: number, h: number, c: Ctx, seed: number): Item[] {
  if (p === 'none') return [];
  const out: Item[] = [], col = c.pal.dark ? c.pal.ink : c.pal.accent, op = c.pal.dark ? 0.12 : 0.22;
  const step = Math.max(7, Math.min(11, Math.min(w, h) / 5));
  if (p === 'stripes') {
    let d = '';
    for (let x = -h; x < w + h; x += step * 0.9) d += `M${r2(x)} 0L${r2(x + h)} ${r2(h)}`;
    out.push({ t: 'p', d, stroke: col, sw: 0.45, op: op * 0.8 });
    return out;
  }
  let d = '';
  for (let y = step / 2, row = 0; y < h + step; y += step, row++) {
    for (let x = (row % 2 ? step / 2 : 0) + ((seed % 3) * 0.7); x < w + step; x += step) {
      if (p === 'dots') d += circ(x, y, 0.55);
      else if (p === 'hearts') d += heartD(x, y, 2.2);
      else if (p === 'stars') d += starD(x, y, 1.1);
      else if (p === 'mai') d += flowerD(x, y, 1.2);
    }
  }
  out.push({ t: 'p', d, fill: col, op });
  return out;
}

// ---- dựng chữ ----
interface TxtLine { s: string; size: number; family: string; weight: number; color: string; foil?: boolean; gapAfter: number; ls?: number }
// chữ dài → tách 2 dòng cân nhau
function splitBalanced(s: string, fam: string, wt: number, size: number, max: number): string[] {
  const w = textW(s, fam, wt, size);
  if (w <= max) return [s];
  const words = s.trim().split(/\s+/);
  if (words.length < 2) return [s];
  let best = [s], bestW = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const mw = Math.max(textW(a, fam, wt, size), textW(b, fam, wt, size));
    if (mw < bestW) { bestW = mw; best = [a, b]; }
  }
  return best;
}
function wrapWords(s: string, fam: string, wt: number, size: number, max: number, maxLines: number): string[] {
  const words = (s || '').trim().split(/\s+/).filter(Boolean);
  const lines: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (textW(t, fam, wt, size) <= max || !cur) cur = t; else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { const keep = lines.slice(0, maxLines); keep[maxLines - 1] = keep[maxLines - 1].replace(/\s*\S*$/, '') + '…'; return keep; }
  return lines;
}
// đặt 1 khối dòng chữ vào giữa box; tự co chiều cao (giữ tỉ lệ) cho vừa, co từng dòng cho vừa bề ngang
function stack(lines: TxtLine[], box: Box, extraTop = 0): { items: Item[]; top: number; k: number } {
  const vis = lines.filter((l) => l.s);
  const asc = (l: TxtLine) => l.size * 0.8, des = (l: TxtLine) => l.size * 0.28;
  let total = extraTop;
  vis.forEach((l, i) => { total += asc(l) + des(l) + (i < vis.length - 1 ? l.gapAfter : 0); });
  const k = Math.min(1, box.h / Math.max(1, total));
  let y = box.y + (box.h - total * k) / 2 + extraTop * k;
  const items: Item[] = [];
  vis.forEach((l, i) => {
    let size = l.size * k;
    const w = textW(l.s, l.family, l.weight, size) + (l.ls || 0) * Math.max(0, l.s.length - 1);
    const ys = y + asc(l) * k;
    if (w > box.w) size = (size * box.w) / w;
    items.push({ t: 'x', s: l.s, x: box.x + box.w / 2, y: ys, size, family: l.family, weight: l.weight, color: l.color, foil: l.foil, ls: l.ls });
    y += (asc(l) + des(l) + (i < vis.length - 1 ? l.gapAfter : 0)) * k;
  });
  return { items, top: box.y + (box.h - total * k) / 2, k };
}

// ---- MẶT CHÍNH ----
function mainArt(w: number, h: number, c: Ctx, safe: Box, seed: number): Art {
  const { pal, font, data } = c, fx = deco(c), foil = c.foil !== 'none';
  const items: Item[] = [...patternItems(c.tpl.pattern, w, h, c, seed)];
  const u = Math.min(safe.w, safe.h * 0.9);         // thước đo chung
  const lay = c.layout;
  const title = data.title || '', names = data.names || '', date = data.date || '';
  const mono = monogramOf(names);
  const nameSize = u * 0.12, titleSize = u * 0.2, dateSize = u * 0.075, contSize = u * 0.06;
  const nameLines = splitBalanced(names, font.serif, font.fw, nameSize, safe.w * 0.92);
  const mk = (s: string, size: number, family: string, weight: number, color: string, gapAfter: number, extra: Partial<TxtLine> = {}): TxtLine => ({ s, size, family, weight, color, gapAfter, ...extra });
  const dateLine = date ? [mk(date, dateSize, BODY, 600, pal.ink, 0, { ls: dateSize * 0.12 })] : [];
  const contLine = data.contents && safe.h > 50 ? [mk(data.contents, contSize, BODY, 600, pal.ink, 0)] : [];

  if (lay === 'band') {
    // dải màu ngang giữa mặt, tên trên dải; lời chính phía trên, ngày phía dưới
    const bandH = Math.max(nameSize * nameLines.length * 1.25 + u * 0.06, u * 0.2);
    const by = safe.y + safe.h * 0.52 - bandH / 2;
    items.push({ t: 'p', d: `M${r2(-2)} ${r2(by)}H${r2(w + 2)}V${r2(by + bandH)}H${r2(-2)}Z`, fill: pal.dark ? pal.soft : pal.accent, op: pal.dark ? 1 : 0.9 });
    items.push({ t: 'p', d: `M${r2(-2)} ${r2(by - 0.9)}H${r2(w + 2)}M${r2(-2)} ${r2(by + bandH + 0.9)}H${r2(w + 2)}`, stroke: fx, sw: 0.35, foil });
    const onBand = pal.dark ? pal.ink : (pal.id === 'white' ? '#FFFFFF' : pal.paper);
    items.push(...stack(nameLines.map((s, i) => mk(s, nameSize, font.serif, font.fw, onBand, i < nameLines.length - 1 ? u * 0.02 : 0)), { x: safe.x, y: by, w: safe.w, h: bandH }).items);
    const upper: Box = { x: safe.x, y: safe.y, w: safe.w, h: by - safe.y - u * 0.03 };
    const mh = Math.min(upper.h * 0.5, u * 0.3);
    if (mh > 6) items.push(...motifItems(c.tpl.motif, w / 2, upper.y + mh / 2, mh, c));
    items.push(...stack([mk(title, titleSize, font.script, font.sw, pal.ink, 0, { foil: false })], { x: upper.x, y: upper.y + (mh > 6 ? mh : 0), w: upper.w, h: Math.max(4, upper.h - (mh > 6 ? mh : 0)) }).items);
    const lower: Box = { x: safe.x, y: by + bandH + u * 0.04, w: safe.w, h: safe.y + safe.h - (by + bandH + u * 0.04) };
    items.push(...stack([...dateLine.map((l) => ({ ...l, gapAfter: u * 0.04 })), ...contLine], lower).items);
    return { w, h, bg: null, items };
  }
  if (lay === 'monogram') {
    const r = Math.min(safe.w * 0.34, safe.h * 0.2);
    const cy = safe.y + r + safe.h * 0.04;
    items.push({ t: 'p', d: circ(w / 2, cy, r), stroke: fx, sw: Math.max(0.35, r * 0.04), foil });
    items.push({ t: 'p', d: circ(w / 2, cy, r * 0.86), stroke: fx, sw: Math.max(0.2, r * 0.015), foil, op: 0.8 });
    if (c.logo) items.push({ t: 'img', href: c.logo, x: w / 2 - r * 0.7, y: cy - r * 0.7, w: r * 1.4, h: r * 1.4 });
    else {
      const ms = mono.length > 1 ? r * 0.62 : r * 1.0;
      const mw = textW(mono, font.script, font.sw, ms);
      const msz = mw > r * 1.6 ? (ms * r * 1.6) / mw : ms;
      items.push({ t: 'x', s: mono, x: w / 2, y: cy + msz * 0.3, size: msz, family: font.script, weight: font.sw, color: fx, foil });
    }
    if (c.tpl.motif === 'mai') items.push(...motifItems('mai', w / 2 + r * 0.9, cy - r * 0.75, r * 0.9, c));
    const rest: Box = { x: safe.x, y: cy + r + u * 0.04, w: safe.w, h: safe.y + safe.h - (cy + r + u * 0.04) };
    items.push(...stack([
      mk(title, titleSize * 0.9, font.script, font.sw, pal.ink, u * 0.02),
      ...nameLines.map((s, i) => mk(s, nameSize * 0.92, font.serif, font.fw, pal.ink, i < nameLines.length - 1 ? u * 0.015 : u * 0.035)),
      ...dateLine.map((l) => ({ ...l, gapAfter: u * 0.03 })), ...contLine,
    ], rest).items);
    return { w, h, bg: null, items };
  }
  if (lay === 'arch') {
    // khung vòm mảnh ép kim, chữ bên trong
    const ax = safe.x + safe.w * 0.06, aw = safe.w * 0.88, ay = safe.y + safe.h * 0.02, ah = safe.h * 0.96;
    const rr = aw / 2;
    const archD = `M${r2(ax)} ${r2(ay + ah)}V${r2(ay + rr)}A${r2(rr)} ${r2(rr)} 0 0 1 ${r2(ax + aw)} ${r2(ay + rr)}V${r2(ay + ah)}Z`;
    items.push({ t: 'p', d: archD, stroke: fx, sw: Math.max(0.3, u * 0.008), foil });
    const inset = Math.max(1.4, u * 0.025);
    items.push({ t: 'p', d: `M${r2(ax + inset)} ${r2(ay + ah - inset)}V${r2(ay + rr)}A${r2(rr - inset)} ${r2(rr - inset)} 0 0 1 ${r2(ax + aw - inset)} ${r2(ay + rr)}V${r2(ay + ah - inset)}Z`, stroke: fx, sw: Math.max(0.15, u * 0.004), foil, op: 0.75 });
    const ms = Math.min(rr * 0.9, safe.h * 0.24);
    items.push(...motifItems(c.tpl.motif, w / 2, ay + rr * 0.55 + ms * 0.15, ms, c));
    const inner: Box = { x: ax + inset * 2, y: ay + rr * 0.55 + ms * 0.7, w: aw - inset * 4, h: ay + ah - inset * 2 - (ay + rr * 0.55 + ms * 0.7) };
    items.push(...stack([
      mk(title, titleSize * 0.85, font.script, font.sw, pal.ink, u * 0.02),
      ...nameLines.map((s, i) => mk(s, nameSize * 0.85, font.serif, font.fw, pal.ink, i < nameLines.length - 1 ? u * 0.015 : u * 0.035)),
      ...dateLine.map((l) => ({ ...l, gapAfter: u * 0.03 })), ...contLine,
    ], inner).items);
    return { w, h, bg: null, items };
  }
  // wreath: vòng lá ôm chữ lồng, chữ phía dưới
  const ws = Math.min(safe.w * 0.66, safe.h * 0.42);
  const cy = safe.y + ws / 2 + safe.h * 0.02;
  items.push(...motifItems(c.tpl.motif === 'sprig' ? 'wreath' : c.tpl.motif, w / 2, cy, ws, c));
  if (c.logo) items.push({ t: 'img', href: c.logo, x: w / 2 - ws * 0.26, y: cy - ws * 0.26, w: ws * 0.52, h: ws * 0.52 });
  else {
    const ms = mono.length > 1 ? ws * 0.22 : ws * 0.34;
    const mw = textW(mono, font.script, font.sw, ms);
    const msz = mw > ws * 0.56 ? (ms * ws * 0.56) / mw : ms;
    items.push({ t: 'x', s: mono, x: w / 2, y: cy + msz * 0.3, size: msz, family: font.script, weight: font.sw, color: pal.ink });
  }
  const rest: Box = { x: safe.x, y: cy + ws / 2 + u * 0.03, w: safe.w, h: safe.y + safe.h - (cy + ws / 2 + u * 0.03) };
  items.push(...stack([
    mk(title, titleSize * 0.85, font.script, font.sw, fx, u * 0.015, { foil }),
    ...nameLines.map((s, i) => mk(s, nameSize * 0.85, font.serif, font.fw, pal.ink, i < nameLines.length - 1 ? u * 0.015 : u * 0.03)),
    ...dateLine.map((l) => ({ ...l, gapAfter: u * 0.03 })), ...contLine,
  ], rest).items);
  return { w, h, bg: null, items };
}

// ---- MẶT SAU: lời cảm ơn + ghi chú bên trong ----
function auxArt(w: number, h: number, c: Ctx, safe: Box, seed: number): Art {
  const { pal, font, data } = c, fx = deco(c), foil = c.foil !== 'none';
  const items: Item[] = [...patternItems(c.tpl.pattern, w, h, c, seed + 3)];
  const u = Math.min(safe.w, safe.h);
  const ms = Math.min(u * 0.26, safe.h * 0.22);
  items.push(...motifItems(c.tpl.motif === 'wreath' ? 'sprig' : c.tpl.motif, w / 2, safe.y + ms * 0.55, ms, c));
  const msgSize = Math.max(2, u * 0.075);
  const msg = wrapWords(data.message || '', BODY, 600, msgSize, safe.w * 0.9, 4);
  const rest: Box = { x: safe.x, y: safe.y + ms * 1.1, w: safe.w, h: safe.h - ms * 1.1 };
  items.push(...stack([
    ...msg.map((s, i) => ({ s, size: msgSize, family: BODY, weight: 600, color: pal.ink, gapAfter: i < msg.length - 1 ? msgSize * 0.35 : u * 0.06 })),
    { s: monogramOf(data.names || ''), size: u * 0.16, family: font.script, weight: font.sw, color: fx, foil, gapAfter: u * 0.03 },
    ...(data.contents ? [{ s: data.contents, size: Math.max(1.8, u * 0.055), family: BODY, weight: 600, color: pal.ink, gapAfter: 0 }] : []),
  ], rest).items);
  return { w, h, bg: null, items };
}
// ---- MẶT HÔNG: hoạ tiết + chữ lồng nhỏ nếu đủ chỗ ----
function sideArt(w: number, h: number, c: Ctx, seed: number): Art {
  const items: Item[] = [...patternItems(c.tpl.pattern === 'none' ? 'dots' : c.tpl.pattern, w, h, c, seed)];
  if (w >= 24 && h >= 30) {
    const r = Math.min(w, h) * 0.2, fx = deco(c);
    items.push({ t: 'p', d: circ(w / 2, h / 2, r), fill: c.pal.paper });
    items.push({ t: 'p', d: circ(w / 2, h / 2, r), stroke: fx, sw: 0.35, foil: c.foil !== 'none' });
    const mono = monogramOf(c.data.names || ''), ms = mono.length > 1 ? r * 0.62 : r * 1.05;
    const mw = textW(mono, c.font.script, c.font.sw, ms);
    const msz = mw > r * 1.6 ? (ms * r * 1.6) / mw : ms;
    items.push({ t: 'x', s: mono, x: w / 2, y: h / 2 + msz * 0.3, size: msz, family: c.font.script, weight: c.font.sw, color: c.pal.ink });
  }
  return { w, h, bg: null, items };
}
// ---- NẮP / MÁI / QUAI: hoạ tiết + motif nhỏ (không chữ — ruy băng / quai che giữa) ----
function capArt(w: number, h: number, c: Ctx, seed: number, motif = true): Art {
  const items: Item[] = [...patternItems(c.tpl.pattern === 'none' ? 'dots' : c.tpl.pattern, w, h, c, seed)];
  if (motif && Math.min(w, h) >= 26) items.push(...motifItems(c.tpl.motif === 'wreath' ? 'hearts' : c.tpl.motif, w * 0.78, h * 0.78, Math.min(w, h) * 0.26, c));
  return { w, h, bg: null, items };
}

// ======================= CÁC MẶT CỦA HỘP =======================
export interface Face { id: string; role: Role; w: number; h: number; safe: Box; shape?: Pt[]; holes?: string }
const inset = (w: number, h: number, m: number, top = m, bot = m): Box => ({ x: m, y: top, w: w - 2 * m, h: h - top - bot });
export const hexPts = (s: number): Pt[] => {
  const H = s * Math.sqrt(3);
  return [[s / 2, H], [s * 1.5, H], [s * 2, H / 2], [s * 1.5, 0], [s / 2, 0], [0, H / 2]];
};
export const stadiumD = (cx: number, cy: number, w: number, h: number) => {
  const r = h / 2;
  return `M${r2(cx - w / 2 + r)} ${r2(cy - r)}H${r2(cx + w / 2 - r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(cx + w / 2 - r)} ${r2(cy + r)}H${r2(cx - w / 2 + r)}A${r2(r)} ${r2(r)} 0 0 1 ${r2(cx - w / 2 + r)} ${r2(cy - r)}Z`;
};
export const bagHole = (s: FbSize) => { const hh = bagHandle(s); return { cx: s.a / 2, cy: hh * 0.5, w: s.a * 0.46, h: Math.min(10, hh * 0.36) }; };
export const ribbonHoles = (s: FbSize) => [{ x: s.a / 2 - s.a * 0.16, y: s.a / 2, r: 2.2 }, { x: s.a / 2 + s.a * 0.16, y: s.a / 2, r: 2.2 }];

export function fbFaces(spec: FbSpec): Face[] {
  const s = fbSize(spec.size), { a, b, c } = s;
  if (spec.kind === 'pillow') {
    const e = pillowSag(s);
    return [
      { id: 'front', role: 'main', w: a, h: b, safe: inset(a, b, 4, e + 3, e + 3) },
      { id: 'back', role: 'aux', w: a, h: b, safe: inset(a, b, 4, e + 3, e + 3) },
    ];
  }
  if (spec.kind === 'square') {
    return [
      { id: 'front', role: 'main', w: a, h: c, safe: inset(a, c, 3.5) },
      { id: 'side1', role: 'side', w: a, h: c, safe: inset(a, c, 3) },
      { id: 'back', role: 'aux', w: a, h: c, safe: inset(a, c, 3.5) },
      { id: 'side2', role: 'side', w: a, h: c, safe: inset(a, c, 3) },
      { id: 'lid', role: 'cap', w: a, h: a, safe: inset(a, a, 3) },
    ];
  }
  if (spec.kind === 'hex') {
    const H = a * Math.sqrt(3), R = H / 2 * 0.86;  // hình chính trong vòng tròn nội tiếp
    const faces: Face[] = [{ id: 'cap', role: 'main', w: 2 * a, h: H, shape: hexPts(a), safe: { x: a - R * 0.72, y: H / 2 - R * 0.72, w: R * 1.44, h: R * 1.44 } }];
    for (let i = 0; i < 6; i++) faces.push({ id: `side${i}`, role: i === 3 ? 'aux' : 'side', w: a, h: c, safe: inset(a, c, 2.5) });
    return faces;
  }
  if (spec.kind === 'tri') {
    const th = a * Math.sqrt(3) / 2;
    return [
      { id: 'front', role: 'main', w: a, h: c, safe: inset(a, c, 3.5) },
      { id: 'back', role: 'aux', w: a, h: c, safe: inset(a, c, 3.5) },
      { id: 'side', role: 'side', w: a, h: c, safe: inset(a, c, 3) },
      { id: 'cap', role: 'cap', w: a, h: th, shape: [[0, th], [a, th], [a / 2, 0]], safe: { x: a * 0.3, y: th * 0.45, w: a * 0.4, h: th * 0.45 } },
    ];
  }
  if (spec.kind === 'gable') {
    const r = gableRise(s), L = Math.hypot(a / 2, r) + 3;
    const pent: Pt[] = [[0, c + r], [0, r], [a / 2, 0], [a, r], [a, c + r]];
    return [
      { id: 'front', role: 'main', w: a, h: c + r, shape: pent, safe: inset(a, c + r, 3.5, r + 2, 3) },
      { id: 'side1', role: 'side', w: b, h: c, safe: inset(b, c, 3) },
      { id: 'back', role: 'aux', w: a, h: c + r, shape: pent, safe: inset(a, c + r, 3.5, r + 2, 3) },
      { id: 'side2', role: 'side', w: b, h: c, safe: inset(b, c, 3) },
      { id: 'roof1', role: 'cap', w: b, h: L, safe: inset(b, L, 3) },
      { id: 'roof2', role: 'cap', w: b, h: L, safe: inset(b, L, 3) },
    ];
  }
  // bag
  const hh = bagHandle(s), hole = bagHole(s);
  const holeD = stadiumD(hole.cx, hole.cy, hole.w, hole.h);
  return [
    { id: 'front', role: 'main', w: a, h: c, safe: inset(a, c, 3.5) },
    { id: 'side1', role: 'side', w: b, h: c, safe: inset(b, c, 3) },
    { id: 'back', role: 'aux', w: a, h: c, safe: inset(a, c, 3.5) },
    { id: 'side2', role: 'side', w: b, h: c, safe: inset(b, c, 3) },
    { id: 'handleF', role: 'cap', w: a, h: hh, safe: inset(a, hh, 3), holes: holeD },
    { id: 'handleB', role: 'cap', w: a, h: hh, safe: inset(a, hh, 3), holes: holeD },
  ];
}
export function faceArt(f: Face, c: Ctx, seed = 1): Art {
  if (f.role === 'main') return mainArt(f.w, f.h, c, f.safe, seed);
  if (f.role === 'aux') return auxArt(f.w, f.h, c, f.safe, seed);
  if (f.role === 'side') return sideArt(f.w, f.h, c, seed);
  if (f.role === 'cap') return capArt(f.w, f.h, c, seed, !f.holes && !f.id.startsWith('roof'));
  return { w: f.w, h: f.h, bg: null, items: [] };
}

// ======================= VẼ ART =======================
// mode: view (xem/3D màu), print (lớp In: bỏ phần ép kim), mask (khuôn nhũ in: đen trên trắng), mask3d (trắng trên đen)
export type ArtMode = 'view' | 'print' | 'mask' | 'mask3d';
let clipSeq = 0;
export function ArtG({ art, mode = 'view' }: { art: Art; mode?: ArtMode }) {
  const mask = mode === 'mask' || mode === 'mask3d', ink = mode === 'mask' ? '#000000' : '#FFFFFF';
  return (
    <>
      {art.items.map((a, i) => {
        if (a.t === 'img') return mask ? null : <image key={i} href={a.href} x={a.x} y={a.y} width={a.w} height={a.h} preserveAspectRatio="xMidYMid meet" />;
        const isFoil = !!a.foil;
        if (mask && !isFoil) return null;
        if (mode === 'print' && isFoil) return null;
        if (a.t === 'p') {
          const fill = a.fill ? (mask ? ink : a.fill) : 'none', stroke = a.stroke ? (mask ? ink : a.stroke) : undefined;
          return <path key={i} d={a.d} fill={fill} stroke={stroke} strokeWidth={a.sw} opacity={mask ? 1 : a.op} strokeDasharray={a.dash} strokeLinecap="round" strokeLinejoin="round" />;
        }
        return <text key={i} x={a.x} y={a.y} fontFamily={`'${a.family}'`} fontWeight={a.weight} fontSize={r2(a.size)} fill={mask ? ink : a.color} opacity={mask ? 1 : a.op} textAnchor="middle" letterSpacing={a.ls ? r2(a.ls) : undefined} data-fb-text="1">{a.s}</text>;
      })}
    </>
  );
}
// canvas (texture 3D). k = px/mm. Ảnh (logo) phải nạp sẵn vào imgs.
export function drawArt(ctx: CanvasRenderingContext2D, art: Art, k: number, imgs: Map<string, HTMLImageElement>, mode: ArtMode = 'view') {
  const mask = mode === 'mask3d' || mode === 'mask', ink = mode === 'mask' ? '#000' : '#FFF';
  ctx.save(); ctx.scale(k, k);
  for (const a of art.items) {
    if (a.t !== 'img' && mask && !a.foil) continue;
    ctx.save();
    if (a.t === 'p') {
      ctx.globalAlpha = mask ? 1 : a.op ?? 1;
      const path = new Path2D(a.d);
      if (a.fill) { ctx.fillStyle = mask ? ink : a.fill; ctx.fill(path); }
      if (a.stroke) { ctx.strokeStyle = mask ? ink : a.stroke; ctx.lineWidth = a.sw ?? 0.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(path); }
    } else if (a.t === 'img') {
      const im = imgs.get(a.href);
      if (im && !mask) { const s = Math.min(a.w / im.width, a.h / im.height); const dw = im.width * s, dh = im.height * s; ctx.drawImage(im, a.x + (a.w - dw) / 2, a.y + (a.h - dh) / 2, dw, dh); }
    } else {
      ctx.globalAlpha = mask ? 1 : a.op ?? 1;
      ctx.font = `${a.weight} ${a.size}px "${a.family}"`;
      ctx.fillStyle = mask ? ink : a.color; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      if (a.ls && 'letterSpacing' in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${a.ls}px`;
      ctx.fillText(a.s, a.x, a.y);
    }
    ctx.restore();
  }
  ctx.restore();
}

// ======================= KHUÔN BẾ =======================
type Poly = Pt[];
interface ArtPlace { face: string; x: number; y: number; rot: 0 | 180; clip: Poly }
interface DieBase { polys: Poly[]; arts: ArtPlace[]; holes: string[]; plain: Poly[] }
const R = (x: number, y: number, w: number, h: number): Poly => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// cung tròn qua 2 điểm, độ võng sag (dương = võng sang phải hướng đi p→q), n đoạn
function arcPts(p: Pt, q: Pt, sag: number, n = 18): Pt[] {
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy);
  const nx = -dy / len, ny = dx / len;   // pháp tuyến bên phải (toạ độ y xuống)
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = p[0] + dx * t, y = p[1] + dy * t;
    const s = sag * (1 - (2 * t - 1) ** 2);   // parabol ≈ cung nông
    out.push([x + nx * s, y + ny * s]);
  }
  return out;
}
// lưỡi gài trên cạnh p→q, hướng ra ngoài (xa tâm đa giác ref)
function tongue(p: Pt, q: Pt, depth: number, ref: Pt, inset = 3): Poly {
  const dx = q[0] - p[0], dy = q[1] - p[1], len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len;
  let nx = -uy, ny = ux;
  const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2;
  if ((ref[0] - mx) * nx + (ref[1] - my) * ny > 0) { nx = -nx; ny = -ny; }
  const k = Math.min(inset, len / 4);
  return [p, q, [q[0] - ux * k + nx * depth, q[1] - uy * k + ny * depth], [p[0] + ux * k + nx * depth, p[1] + uy * k + ny * depth]];
}
const cen = (poly: Poly): Pt => [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
const glue = (x: number, y0: number, y1: number): Poly => [[x, y0], [x + GLUE, y0 + 6], [x + GLUE, y1 - 6], [x, y1]];
const dust = (x: number, y: number, w: number, depth: number, up: boolean): Poly => up
  ? [[x, y], [x + w, y], [x + w - 2, y - depth], [x + 2, y - depth]]
  : [[x + w, y], [x, y], [x + 2, y + depth], [x + w - 2, y + depth]];

function buildDie(spec: FbSpec): DieBase {
  const s = fbSize(spec.size), { a, b, c } = s;
  const polys: Poly[] = [], arts: ArtPlace[] = [], holes: string[] = [], plain: Poly[] = [];
  const add = (p: Poly, face?: string, at?: Pt, rot: 0 | 180 = 0) => { polys.push(p); if (face && at) arts.push({ face, x: at[0], y: at[1], rot, clip: p }); else plain.push(p); };
  if (spec.kind === 'pillow') {
    const e = pillowSag(s);
    [0, 1].forEach((i) => {
      const x0 = i * a, x1 = x0 + a;
      const topIn = arcPts([x0, 0], [x1, 0], e), botIn = arcPts([x1, b], [x0, b], e);   // nét gấp cong lõm vào tấm
      const topOut = arcPts([x0, 0], [x1, 0], -e), botOut = arcPts([x1, b], [x0, b], -e); // nét cắt cong ra ngoài
      add([...topIn, ...botIn], i === 0 ? 'front' : 'back', [x0, 0]);
      add([...topOut, ...topIn.slice().reverse().slice(1, -1)]);
      add([...botOut, ...botIn.slice().reverse().slice(1, -1)]);
    });
    add(glue(2 * a, 0, b));
  } else if (spec.kind === 'square') {
    const xs = [0, a, 2 * a, 3 * a], ids = ['front', 'side1', 'back', 'side2'];
    xs.forEach((x, i) => add(R(x, 0, a, c), ids[i], [x, 0]));
    add(glue(4 * a, 0, c));
    const lid = R(0, -a, a, a); add(lid, 'lid', [0, -a], 0);
    add(tongue([a, -a], [0, -a], 14, cen(lid)));
    add(dust(a, 0, a, a * 0.36, true)); add(dust(3 * a, 0, a, a * 0.36, true));
    const base = R(2 * a, c, a, a); add(base);
    add(tongue([2 * a, c + a], [3 * a, c + a], 14, cen(base)));
    add(dust(a, c, a, a * 0.36, false)); add(dust(3 * a, c, a, a * 0.36, false));
    for (const h of ribbonHoles(s)) holes.push(circ(h.x, -a + h.y, h.r));
  } else if (spec.kind === 'hex') {
    for (let i = 0; i < 6; i++) add(R(i * a, 0, a, c), `side${i}`, [i * a, 0]);
    add(glue(6 * a, 0, c));
    const H = a * Math.sqrt(3);
    const cap: Poly = [[0, 0], [a, 0], [1.5 * a, -H / 2], [a, -H], [0, -H], [-0.5 * a, -H / 2]];
    add(cap, 'cap', [-0.5 * a, -H]);
    add(tongue([a, -H], [0, -H], 11, cen(cap)));
    const x3 = 3 * a;
    const bot: Poly = [[x3 + a, c], [x3, c], [x3 - 0.5 * a, c + H / 2], [x3, c + H], [x3 + a, c + H], [x3 + 1.5 * a, c + H / 2]];
    add(bot);
    add(tongue([x3, c + H], [x3 + a, c + H], 11, cen(bot)));
  } else if (spec.kind === 'tri') {
    const ids = ['front', 'back', 'side'];
    ids.forEach((id, i) => add(R(i * a, 0, a, c), id, [i * a, 0]));
    add(glue(3 * a, 0, c));
    const th = a * Math.sqrt(3) / 2;
    const cap: Poly = [[0, 0], [a, 0], [a / 2, -th]]; add(cap, 'cap', [0, -th]);
    add(tongue([a, 0], [a / 2, -th], 10, cen(cap)));
    const bot: Poly = [[2 * a, c], [a, c], [1.5 * a, c + th]]; add(bot);
    add(tongue([1.5 * a, c + th], [2 * a, c], 10, cen(bot)));
  } else if (spec.kind === 'gable') {
    const r = gableRise(s), L = Math.hypot(a / 2, r) + 3;
    const pent = (x: number): Poly => [[x, c], [x, 0], [x + a / 2, -r], [x + a, 0], [x + a, c]];
    add(pent(0), 'front', [0, -r]);
    add(R(a, 0, b, c), 'side1', [a, 0]);
    add(pent(a + b), 'back', [a + b, -r]);
    add(R(2 * a + b, 0, b, c), 'side2', [2 * a + b, 0]);
    add(glue(2 * a + 2 * b, 0, c));
    add(R(a, -L, b, L), 'roof1', [a, -L]);
    add(R(2 * a + b, -L, b, L), 'roof2', [2 * a + b, -L]);
    const base = R(0, c, a, b); add(base);
    add(tongue([a, c + b], [0, c + b], 12, cen(base)));
    add(dust(a, c, b, b * 0.38, false)); add(dust(2 * a + b, c, b, b * 0.38, false));
  } else {
    const hh = bagHandle(s), hole = bagHole(s);
    // tấm trước/sau cao hơn (thân + quai) → thêm đỉnh tại y=0 để cạnh chung với hông khớp đúng đoạn
    const tall = (x: number): Poly => [[x, -hh], [x + a, -hh], [x + a, 0], [x + a, c], [x, c], [x, 0]];
    add(tall(0)); arts.push({ face: 'front', x: 0, y: 0, rot: 0, clip: R(0, 0, a, c) }, { face: 'handleF', x: 0, y: -hh, rot: 0, clip: R(0, -hh, a, hh) });
    add(R(a, 0, b, c), 'side1', [a, 0]);
    add(tall(a + b)); arts.push({ face: 'back', x: a + b, y: 0, rot: 0, clip: R(a + b, 0, a, c) }, { face: 'handleB', x: a + b, y: -hh, rot: 0, clip: R(a + b, -hh, a, hh) });
    add(R(2 * a + b, 0, b, c), 'side2', [2 * a + b, 0]);
    add(glue(2 * a + 2 * b, 0, c));
    add(dust(a, 0, b, b * 0.46, true)); add(dust(2 * a + b, 0, b, b * 0.46, true));
    const base = R(0, c, a, b); add(base);
    add(tongue([a, c + b], [0, c + b], 12, cen(base)));
    add(dust(a, c, b, b * 0.38, false)); add(dust(2 * a + b, c, b, b * 0.38, false));
    holes.push(stadiumD(hole.cx, -hh + hole.cy, hole.w, hole.h), stadiumD(a + b + hole.cx, -hh + hole.cy, hole.w, hole.h));
  }
  return { polys, arts, holes, plain };
}

// cạnh xuất hiện ở 2 tấm = nét gấp; cạnh riêng = nét cắt → nối thành vòng
const key = (p: Pt) => `${Math.round(p[0] * 100)},${Math.round(p[1] * 100)}`;
function splitEdges(polys: Poly[]) {
  const m = new Map<string, { a: Pt; b: Pt; n: number }>();
  for (const pl of polys) for (let i = 0; i < pl.length; i++) {
    const a = pl[i], b = pl[(i + 1) % pl.length];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.01) continue;
    const ka = key(a), kb = key(b), k = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
    const e = m.get(k); if (e) e.n++; else m.set(k, { a, b, n: 1 });
  }
  const cut: { a: Pt; b: Pt }[] = [], fold: { a: Pt; b: Pt }[] = [];
  m.forEach((e) => (e.n > 1 ? fold : cut).push(e));
  return { cut, fold };
}
function loops(segs: { a: Pt; b: Pt }[]): Pt[][] {
  const adj = new Map<string, number[]>();
  segs.forEach((s, i) => { for (const p of [s.a, s.b]) { const k = key(p); adj.set(k, [...(adj.get(k) || []), i]); } });
  const used = new Set<number>(), out: Pt[][] = [];
  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const loop: Pt[] = [segs[i].a, segs[i].b];
    let cur = segs[i].b;
    for (let guard = 0; guard < 20000; guard++) {
      const nx = (adj.get(key(cur)) || []).find((j) => !used.has(j));
      if (nx === undefined) break;
      used.add(nx);
      const s = segs[nx]; cur = key(s.a) === key(cur) ? s.b : s.a;
      loop.push(cur);
    }
    out.push(loop);
  }
  return out;
}
// gộp các đoạn gấp thẳng nối tiếp nhau (cung cong vẫn là nhiều đoạn nhỏ)
const segD = (segs: { a: Pt; b: Pt }[]) => segs.map((s) => `M${r2(s.a[0])} ${r2(s.a[1])}L${r2(s.b[0])} ${r2(s.b[1])}`).join('');
const loopD = (l: Pt[]) => `M${l.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z`;

export interface Die { cut: string; outline: string; fold: string; cutLoops: number; holes: string[]; arts: ArtPlace[]; W: number; H: number; ox: number; oy: number }
export function fbDieline(spec: FbSpec): Die {
  const d = buildDie(spec);
  const { cut, fold } = splitEdges(d.polys);
  const ls = loops(cut);
  const all = d.polys.flat();
  const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
  const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
  const M = FB_BLEED + 2;
  const outline = ls.map(loopD).join('');
  return {
    cut: outline + d.holes.join(''), outline, fold: segD(fold), cutLoops: ls.length, holes: d.holes, arts: d.arts,
    W: r2(maxX - minX + 2 * M), H: r2(maxY - minY + 2 * M), ox: r2(M - minX), oy: r2(M - minY),
  };
}

// ======================= COMPONENT SVG =======================
export function FaceSvg({ spec, data, logo, face, mode = 'view', style, bg = true }: { spec: FbSpec; data: FbData; logo?: string; face: Face; mode?: ArtMode; style?: CSSProperties; bg?: boolean }) {
  const c = ctxOf(spec, data, logo);
  const art = faceArt(face, c, face.id.length);
  const [id] = useState(() => `fbf${++clipSeq}`);
  const shapeD = face.shape ? `M${face.shape.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z` : `M0 0H${face.w}V${face.h}H0Z`;
  return (
    <svg viewBox={`0 0 ${face.w} ${face.h}`} xmlns="http://www.w3.org/2000/svg" style={style} data-face={face.id} data-role={face.role}>
      <defs><clipPath id={id}><path d={shapeD} /></clipPath></defs>
      <path d={shapeD} fill={bg ? c.pal.paper : 'none'} data-shape="1" />
      <g clipPath={`url(#${id})`}><ArtG art={art} mode={mode} /></g>
      {face.holes && <path d={face.holes} fill="#FFFFFF" stroke="#C9C2B6" strokeWidth={0.3} />}
      {spec.kind === 'square' && face.id === 'lid' && ribbonHoles(fbSize(spec.size)).map((h, i) => <circle key={i} cx={h.x} cy={h.y} r={h.r} fill="#FFFFFF" stroke="#C9C2B6" strokeWidth={0.3} />)}
    </svg>
  );
}

// mặt chính làm ảnh mẫu (thumbnail)
export function FavorThumb({ spec, data, logo, style }: { spec: FbSpec; data: FbData; logo?: string; style?: CSSProperties }) {
  const f = fbFaces(spec).find((x) => x.role === 'main')!;
  return <FaceSvg spec={spec} data={data} logo={logo} face={f} style={style} />;
}

function DieBody({ spec, data, logo, die, mode, uid }: { spec: FbSpec; data: FbData; logo?: string; die: Die; mode: 'print' | 'preview' | 'mask'; uid: string }) {
  const lid = (n: string) => (mode === 'print' ? n : `${n}${uid}`); // file in: đúng tên lớp In / CutContour / Fold
  const c = ctxOf(spec, data, logo), faces = fbFaces(spec);
  const byId = new Map(faces.map((f) => [f.id, f]));
  const kraftPrint = c.pal.kraft && mode === 'print';
  const artMode: ArtMode = mode === 'mask' ? 'mask' : mode === 'print' ? (c.foil === 'none' ? 'view' : 'print') : 'view';
  return (
    <g transform={`translate(${die.ox} ${die.oy})`}>
      {mode !== 'mask' && <g id={lid('In')}>
        {/* nền tràn lề 3mm: tô + viền dày theo đúng đường cắt (kraft: giấy có sẵn màu, không in nền) */}
        {!kraftPrint && <path d={die.outline} fill={c.pal.paper} stroke={c.pal.paper} strokeWidth={FB_BLEED * 2} strokeLinejoin="round" />}
        {mode === 'preview' && c.pal.kraft && <path d={die.outline} fill={c.pal.paper} />}
        {die.arts.map((a, i) => {
          const f = byId.get(a.face); if (!f) return null;
          const cid = `${uid}c${i}`;
          return (
            <g key={i}>
              <defs><clipPath id={cid}><path d={`M${a.clip.map((p) => `${r2(p[0])} ${r2(p[1])}`).join('L')}Z`} /></clipPath></defs>
              <g clipPath={`url(#${cid})`}>
                <g transform={`translate(${a.x} ${a.y})${a.rot ? ` rotate(180 ${f.w / 2} ${f.h / 2})` : ''}`}>
                  <ArtG art={faceArt(f, c, f.id.length)} mode={artMode} />
                </g>
              </g>
            </g>
          );
        })}
      </g>}
      {mode === 'mask' && die.arts.map((a, i) => {
        const f = byId.get(a.face); if (!f) return null;
        return <g key={i} transform={`translate(${a.x} ${a.y})${a.rot ? ` rotate(180 ${f.w / 2} ${f.h / 2})` : ''}`}><ArtG art={faceArt(f, c, f.id.length)} mode="mask" /></g>;
      })}
      {mode !== 'mask' && <>
        <g id={lid('CutContour')}><path d={die.cut} fill="none" stroke="#EC008C" strokeWidth={0.3} /></g>
        <g id={lid('Fold')}><path d={die.fold} fill="none" stroke={mode === 'preview' ? '#2D8FD6' : '#00A0E3'} strokeWidth={0.3} strokeDasharray="2 1.2" /></g>
      </>}
    </g>
  );
}

// khuôn bế 1 con (đúng khổ mm). mode print = file gửi xưởng; preview = có chú thích; mask = khuôn ép kim
export function FavorDieline({ spec, data, logo, mode = 'print', style }: { spec: FbSpec; data: FbData; logo?: string; mode?: 'print' | 'preview' | 'mask'; style?: CSSProperties }) {
  const die = fbDieline(spec);
  const [uid] = useState(() => `fbd${++clipSeq}`);
  const legend = mode === 'preview' ? 9 : 0;
  return (
    <svg viewBox={`0 0 ${die.W} ${r2(die.H + legend)}`} width={`${die.W}mm`} height={`${r2(die.H + legend)}mm`} xmlns="http://www.w3.org/2000/svg" style={style}
      data-testid={mode === 'mask' ? 'fb-mask' : mode === 'print' ? 'fb-die' : 'fb-die-preview'} data-loops={die.cutLoops} data-holes={die.holes.length}>
      <rect x={0} y={0} width={die.W} height={r2(die.H + legend)} fill="#FFFFFF" />
      <DieBody spec={spec} data={data} logo={logo} die={die} mode={mode} uid={uid} />
      {legend > 0 && (
        <g transform={`translate(4 ${r2(die.H + 3)})`}>
          <path d="M0 2H8" stroke="#EC008C" strokeWidth={0.5} /><text x={10} y={3} fontSize={2.6} fontFamily="'Be Vietnam Pro'" fontWeight={600} fill="#444">Nét cắt</text>
          <path d="M28 2H36" stroke="#2D8FD6" strokeWidth={0.5} strokeDasharray="2 1.2" /><text x={38} y={3} fontSize={2.6} fontFamily="'Be Vietnam Pro'" fontWeight={600} fill="#444">Nét gấp</text>
          <text x={58} y={3} fontSize={2.6} fontFamily="'Be Vietnam Pro'" fontWeight={600} fill="#444">Lề in 3mm · khổ {Math.round(die.W)}×{Math.round(die.H)}mm</text>
        </g>
      )}
    </svg>
  );
}

// ======================= BÌNH NHIỀU CON TRÊN TỜ IN =======================
export const SHEET = { w: 325, h: 430, m: 8, gap: 4 };
export function sheetLayout(die: Die) {
  const fit = (w: number, h: number) => ({ cols: Math.max(0, Math.floor((SHEET.w - 2 * SHEET.m + SHEET.gap) / (w + SHEET.gap))), rows: Math.max(0, Math.floor((SHEET.h - 2 * SHEET.m - 10 + SHEET.gap) / (h + SHEET.gap))) });
  const a = fit(die.W, die.H), b = fit(die.H, die.W);
  const na = a.cols * a.rows, nb = b.cols * b.rows;
  return nb > na ? { ...b, rot: true, n: nb } : { ...a, rot: false, n: na };
}
export function FavorSheet({ spec, data, logo, mode = 'print', style }: { spec: FbSpec; data: FbData; logo?: string; mode?: 'print' | 'mask'; style?: CSSProperties }) {
  const die = fbDieline(spec), L = sheetLayout(die);
  const [uid] = useState(() => `fbs${++clipSeq}`);
  const cw = L.rot ? die.H : die.W, ch = L.rot ? die.W : die.H;
  const ox = (SHEET.w - (L.cols * cw + (L.cols - 1) * SHEET.gap)) / 2, oy = SHEET.m + 10;
  const cells: ReactNode[] = [];
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
    const x = ox + c * (cw + SHEET.gap), y = oy + r * (ch + SHEET.gap);
    cells.push(<use key={`${r}-${c}`} href={`#${uid}`} transform={L.rot ? `translate(${r2(x + cw)} ${r2(y)}) rotate(90)` : `translate(${r2(x)} ${r2(y)})`} />);
  }
  return (
    <svg viewBox={`0 0 ${SHEET.w} ${SHEET.h}`} width={`${SHEET.w}mm`} height={`${SHEET.h}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={mode === 'mask' ? 'fb-sheet-mask' : 'fb-sheet'} data-per-sheet={L.n}>
      <rect x={0} y={0} width={SHEET.w} height={SHEET.h} fill="#FFFFFF" />
      <defs><g id={uid}><DieBody spec={spec} data={data} logo={logo} die={die} mode={mode} uid={uid} /></g></defs>
      {cells}
      <text x={SHEET.m} y={SHEET.m + 4} fontSize={3.2} fontFamily="'Be Vietnam Pro'" fontWeight={600} fill="#666">
        {`Tờ ${SHEET.w / 10}×${SHEET.h / 10}cm · ${L.n} hộp/tờ · khuôn ${Math.round(die.W)}×${Math.round(die.H)}mm${mode === 'mask' ? ' · KHUÔN ÉP KIM' : ''}`}
      </text>
    </svg>
  );
}
