'use client';
// Bút bi in/khắc logo: 1 engine SVG (đơn vị mm) = LOẠI BÚT × CÁCH IN × MÀU THÂN × BỐ CỤC × FONT → nhiều mẫu, render code 100%.
// Vùng in thân bút (vd 45×8mm) + vùng in kẹp (30×5mm) đúng khổ thật; in tampon 1–2 màu / UV đủ màu / khắc laser.
// Khắc tên riêng: dán danh sách tên → mỗi cây 1 tên, file in A4 tỉ lệ 1:1 xếp sẵn từng tên.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import type { TPLogo } from './tape-engine';

// ---------- loại bút ----------
export type PenModel = 'click' | 'cap' | 'metal' | 'stylus';
export type PenMethod = 'pad' | 'uv' | 'laser';
export interface PenArea { w: number; h: number }
export interface PenModelDef {
  id: PenModel; name: string; short: string; blurb: string;
  barrel: PenArea; clip: PenArea; methods: PenMethod[]; metal: boolean;
}
export const PEN_MODELS: PenModelDef[] = [
  { id: 'click', name: 'Bút bi nhựa bấm', short: 'Nhựa bấm', blurb: 'Phổ biến nhất — phát khách, văn phòng', barrel: { w: 45, h: 8 }, clip: { w: 30, h: 5 }, methods: ['pad', 'uv'], metal: false },
  { id: 'cap', name: 'Bút nhựa nắp đậy (hội nghị)', short: 'Nắp đậy', blurb: 'Rẻ, nhẹ — hội nghị, hội thảo, trường học', barrel: { w: 50, h: 7 }, clip: { w: 28, h: 4.5 }, methods: ['pad', 'uv'], metal: false },
  { id: 'metal', name: 'Bút kim loại xoay', short: 'Kim loại', blurb: 'Sang — quà VIP, khắc laser tên riêng', barrel: { w: 45, h: 7 }, clip: { w: 30, h: 4.5 }, methods: ['laser', 'uv'], metal: true },
  { id: 'stylus', name: 'Bút cảm ứng 2 đầu', short: 'Cảm ứng', blurb: 'Đầu bi + đầu cảm ứng điện thoại', barrel: { w: 40, h: 6.5 }, clip: { w: 28, h: 4.5 }, methods: ['laser', 'uv'], metal: true },
];
export const penModel = (id: string) => PEN_MODELS.find((m) => m.id === id) || PEN_MODELS[0];

export const PEN_METHODS: { id: PenMethod; name: string; note: string }[] = [
  { id: 'pad', name: 'In tampon 1–2 màu', note: 'Rẻ, bền — logo/chữ 1–2 màu mực' },
  { id: 'uv', name: 'In UV đủ màu', note: 'In logo nhiều màu, ảnh nhỏ' },
  { id: 'laser', name: 'Khắc laser', note: 'Khắc lộ lớp kim loại, không phai' },
];

// ---------- màu thân ----------
export type BodyFinish = 'plastic' | 'anodized' | 'chrome' | 'matte' | 'champagne';
export interface PenBody { id: string; name: string; hex: string; finish: BodyFinish; engrave: string }
export const PEN_BODIES: PenBody[] = [
  // nhựa
  { id: 'p-white', name: 'Trắng', hex: '#F3F3F0', finish: 'plastic', engrave: '#888' },
  { id: 'p-black', name: 'Đen', hex: '#1C1E22', finish: 'plastic', engrave: '#888' },
  { id: 'p-navy', name: 'Navy', hex: '#1F3A68', finish: 'plastic', engrave: '#888' },
  { id: 'p-red', name: 'Đỏ', hex: '#C41E2E', finish: 'plastic', engrave: '#888' },
  { id: 'p-blue', name: 'Xanh dương', hex: '#1E63C7', finish: 'plastic', engrave: '#888' },
  { id: 'p-green', name: 'Xanh lá', hex: '#1E7D46', finish: 'plastic', engrave: '#888' },
  { id: 'p-orange', name: 'Cam', hex: '#EE7A16', finish: 'plastic', engrave: '#888' },
  { id: 'p-yellow', name: 'Vàng', hex: '#F2C230', finish: 'plastic', engrave: '#888' },
  { id: 'p-purple', name: 'Tím', hex: '#6B3FA0', finish: 'plastic', engrave: '#888' },
  // kim loại — màu khắc = màu kim loại lộ ra sau khi laser bóc lớp sơn/anod
  { id: 'm-chrome', name: 'Bạc chrome', hex: '#D9DCE1', finish: 'chrome', engrave: '#3B3E44' },
  { id: 'm-black', name: 'Đen mờ', hex: '#26282C', finish: 'matte', engrave: '#DCDFE3' },
  { id: 'm-navy', name: 'Navy', hex: '#22355F', finish: 'anodized', engrave: '#E3E6EB' },
  { id: 'm-gun', name: 'Xám gunmetal', hex: '#4A4F57', finish: 'anodized', engrave: '#E8EAED' },
  { id: 'm-champ', name: 'Vàng champagne', hex: '#CBB48A', finish: 'champagne', engrave: '#5B4A2E' },
  { id: 'm-wine', name: 'Đỏ đô', hex: '#7A1E2B', finish: 'anodized', engrave: '#EFE6E3' },
  { id: 'm-teal', name: 'Xanh rêu', hex: '#2F5A4E', finish: 'anodized', engrave: '#E4EBE8' },
];
export const penBody = (id: string) => PEN_BODIES.find((b) => b.id === id) || PEN_BODIES[0];
export const bodiesFor = (m: PenModel) => PEN_BODIES.filter((b) => (penModel(m).metal ? b.finish !== 'plastic' : b.finish === 'plastic'));

export interface PenInk { id: string; name: string; hex: string }
export const PEN_INKS: PenInk[] = [
  { id: 'white', name: 'Trắng', hex: '#FFFFFF' },
  { id: 'black', name: 'Đen', hex: '#16181C' },
  { id: 'navy', name: 'Navy', hex: '#1F3A68' },
  { id: 'red', name: 'Đỏ', hex: '#D7263D' },
  { id: 'gold', name: 'Vàng kim', hex: '#C9A24A' },
  { id: 'blue', name: 'Xanh dương', hex: '#1E6FD9' },
  { id: 'green', name: 'Xanh lá', hex: '#1F8A4C' },
  { id: 'orange', name: 'Cam', hex: '#F28C28' },
  { id: 'silver', name: 'Bạc', hex: '#BFC4CA' },
];
export const penInk = (id: string) => PEN_INKS.find((i) => i.id === id) || PEN_INKS[0];

const lum = (hex: string) => {
  const s = hex.replace('#', ''); const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** mực gần màu thân → in ra khó đọc */
export const lowContrast = (inkHex: string, bodyHex: string) => Math.abs(lum(inkHex) - lum(bodyHex)) < 60;

// ---------- font ----------
export interface PenFont { id: string; name: string; family: string; weight: number; script?: boolean; ls?: number }
export const PEN_FONTS: PenFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, ls: 0.04 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800, ls: 0.02 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, ls: 0.06 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800, ls: 0.02 },
  { id: 'vibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400, script: true },
  { id: 'dancing', name: 'Dancing', family: 'Dancing Script', weight: 700, script: true },
];
export const penFont = (id: string) => PEN_FONTS.find((f) => f.id === id) || PEN_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const PEN_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Great+Vibes&family=Dancing+Script:wght@700&display=swap');`;

export function usePenFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pen-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pen-fonts'; link.rel = 'stylesheet';
        link.href = PEN_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...PEN_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục ----------
export type PenLayout = 'logo-brand' | 'logo-2line' | 'divider' | 'name' | 'hotline' | 'event';
export const PEN_LAYOUTS: { id: PenLayout; name: string }[] = [
  { id: 'logo-brand', name: 'Logo + tên' },
  { id: 'logo-2line', name: 'Logo + 2 dòng' },
  { id: 'divider', name: 'Tên | website' },
  { id: 'name', name: 'Khắc tên riêng' },
  { id: 'hotline', name: 'Hotline to' },
  { id: 'event', name: 'Sự kiện · hội nghị' },
];

export interface PenSpec {
  model: PenModel; method: PenMethod; body: string; layout: PenLayout; font: string;
  inks: string[]; // tampon: 1–2 màu mực (UV: màu chính + phụ)
  clipOn: boolean; box: boolean;
}
export interface PenTemplate { id: string; name: string; spec: PenSpec; sample?: PenData }
export const PEN_TEMPLATES: PenTemplate[] = [
  { id: 'click-logo', name: 'Nhựa bấm · Logo + tên', spec: { model: 'click', method: 'pad', body: 'p-white', layout: 'logo-brand', font: 'montserrat', inks: ['navy'], clipOn: true, box: false } },
  { id: 'click-2c', name: 'Nhựa bấm · 2 màu', spec: { model: 'click', method: 'pad', body: 'p-navy', layout: 'logo-2line', font: 'montserrat', inks: ['white', 'gold'], clipOn: true, box: false } },
  { id: 'click-hot', name: 'Nhựa bấm · Hotline', spec: { model: 'click', method: 'pad', body: 'p-red', layout: 'hotline', font: 'oswald', inks: ['white'], clipOn: true, box: false } },
  { id: 'click-uv', name: 'Nhựa bấm · UV đủ màu', spec: { model: 'click', method: 'uv', body: 'p-white', layout: 'logo-2line', font: 'bvp', inks: ['blue', 'orange'], clipOn: true, box: false } },
  { id: 'cap-event', name: 'Nắp đậy · Hội nghị', spec: { model: 'cap', method: 'pad', body: 'p-blue', layout: 'event', font: 'montserrat', inks: ['white'], clipOn: true, box: false }, sample: { brand: 'HỘI NGHỊ KHÁCH HÀNG 2027', line2: 'TP.HCM · 15/01/2027' } },
  { id: 'cap-web', name: 'Nắp đậy · Tên | web', spec: { model: 'cap', method: 'pad', body: 'p-black', layout: 'divider', font: 'oswald', inks: ['white', 'gold'], clipOn: true, box: false } },
  { id: 'metal-vip', name: 'Kim loại · Khắc tên VIP', spec: { model: 'metal', method: 'laser', body: 'm-black', layout: 'name', font: 'vibes', inks: ['white'], clipOn: true, box: true } },
  { id: 'metal-logo', name: 'Kim loại · Khắc logo', spec: { model: 'metal', method: 'laser', body: 'm-navy', layout: 'logo-brand', font: 'montserrat', inks: ['white'], clipOn: true, box: true } },
  { id: 'metal-chrome', name: 'Chrome · Doanh nghiệp', spec: { model: 'metal', method: 'laser', body: 'm-chrome', layout: 'logo-2line', font: 'playfair', inks: ['black'], clipOn: true, box: false } },
  { id: 'metal-champ', name: 'Champagne · Tri ân', spec: { model: 'metal', method: 'laser', body: 'm-champ', layout: 'name', font: 'dancing', inks: ['black'], clipOn: true, box: true } },
  { id: 'stylus-logo', name: 'Cảm ứng · Khắc logo', spec: { model: 'stylus', method: 'laser', body: 'm-gun', layout: 'logo-brand', font: 'bvp', inks: ['white'], clipOn: true, box: false } },
  { id: 'stylus-uv', name: 'Cảm ứng · UV màu', spec: { model: 'stylus', method: 'uv', body: 'm-chrome', layout: 'divider', font: 'montserrat', inks: ['red', 'navy'], clipOn: true, box: false } },
];

// ---------- nội dung ----------
export type PenData = Record<string, string>;
export interface PenField { key: string; label: string; ph?: string; half?: boolean }
export const PEN_FIELDS: PenField[] = [
  { key: 'brand', label: 'Tên công ty / thương hiệu (dòng chính)', ph: 'AN KHANG GROUP' },
  { key: 'line2', label: 'Dòng phụ (website, slogan, ngày sự kiện)', ph: 'ankhang.vn' },
  { key: 'hotline', label: 'Hotline', ph: '1900 6868', half: true },
  { key: 'clip', label: 'Chữ trên kẹp bút', ph: 'ankhang.vn', half: true },
];
export const defaultPenData = (): PenData => ({
  brand: 'AN KHANG GROUP', line2: 'ankhang.vn', hotline: '1900 6868', clip: 'ankhang.vn',
  names: 'Quốc Bảo\nThu Hà\nGia Khánh\nBảo Ngọc\nĐức Anh\nMai Phương',
});
export const parseNames = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 300);

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function measure(t: string, size: number, fam: string, wt: number, ls = 0): number {
  const s = t || '';
  const extra = ls * size * Math.max(0, [...s].length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + extra;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + extra;
  mctx.font = `${wt} ${size * 10}px "${fam}"`;
  return mctx.measureText(s).width / 10 + extra;
}
/** cỡ chữ lớn nhất ≤ maxSize để vừa maxW */
const fitSize = (t: string, maxW: number, maxSize: number, fam: string, wt: number, ls = 0) => {
  const w1 = measure(t, 1, fam, wt, ls);
  return w1 > 0 ? Math.min(maxSize, maxW / w1) : maxSize;
};
export const PEN_MIN_TEXT = 1.1; // mm — nhỏ hơn thì tampon/laser bị nhoè

// chia câu thành 2 dòng gần bằng nhau
function split2(t: string): [string, string] {
  const w = (t || '').trim().split(/\s+/);
  if (w.length < 2) return [t || '', ''];
  let best = 1, bd = Infinity;
  for (let i = 1; i < w.length; i++) { const d = Math.abs(w.slice(0, i).join(' ').length - w.slice(i).join(' ').length); if (d < bd) { bd = d; best = i; } }
  return [w.slice(0, best).join(' '), w.slice(best).join(' ')];
}

const initials = (s: string) => {
  const w = (s || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  const skip = new Set(['CÔNG', 'TY', 'TNHH', 'CP', 'GROUP', 'CO', 'JSC']);
  const main = w.filter((x) => !skip.has(x.toUpperCase()));
  const src = main.length ? main : w;
  return (src.length === 1 ? src[0].slice(0, 2) : src.slice(0, 2).map((x) => x[0]).join('')).toUpperCase() || 'AK';
};

// ---------- màu in theo cách in ----------
export interface PenColors { c1: string; c2: string; logoFull: boolean }
export function penColors(spec: PenSpec, mode: ArtMode, area: PenAreaId = 'barrel'): PenColors {
  if (spec.method === 'laser') {
    // kẹp bút kim loại là chrome → khắc ra màu xám đậm, khác màu khắc trên thân sơn
    const e = mode === 'print' ? '#000000' : area === 'clip' ? '#3B3E44' : penBody(spec.body).engrave;
    return { c1: e, c2: e, logoFull: false };
  }
  const a = penInk(spec.inks[0] || 'black').hex;
  const b = penInk(spec.inks[1] || spec.inks[0] || 'black').hex;
  if (spec.method === 'pad') return { c1: a, c2: spec.inks.length > 1 ? b : a, logoFull: false };
  return { c1: a, c2: b, logoFull: true };
}

export type ArtMode = 'view' | 'ink' | 'print';
export type PenAreaId = 'barrel' | 'clip';

interface ArtProps {
  spec: PenSpec; data: PenData; area: PenAreaId; name?: string;
  logo?: TPLogo | null; logoSrc?: string; mode?: ArtMode; style?: CSSProperties;
  /** lồng vào SVG khác (tờ file in A4) */
  nested?: { x: number; y: number; w: number; h: number };
}

// tắt ghép chữ (vd 'Th' của Great Vibes): file in outline từng ký tự theo vị trí trình duyệt → ghép chữ sẽ chồng glyph
const NOLIGA: CSSProperties = { fontVariantLigatures: 'none', fontFeatureSettings: '"liga" 0, "clig" 0' };

// biểu tượng điện thoại (24×24)
const PHONE = 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z';

/** Ảnh in 1 vùng (thân / kẹp) — viewBox đúng mm của vùng in */
export function PenArtSvg({ spec, data, area, name, logo = null, logoSrc = '', mode = 'view', style, nested }: ArtProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const md = penModel(spec.model);
  const A = area === 'barrel' ? md.barrel : md.clip;
  const W = A.w, H = A.h;
  const f = penFont(spec.font);
  const { c1, c2, logoFull } = penColors(spec, mode, area);
  const body = penBody(spec.body);
  const mx = Math.max(1.2, W * 0.035), my = Math.max(0.6, H * 0.1);
  const iw = W - mx * 2, ih = H - my * 2;
  const cy = H / 2;
  // baseline để khối chữ cao `s` nằm giữa theo chiều dọc (chữ hoa + dấu tiếng Việt)
  const base = (centerY: number, s: number) => centerY + s * 0.36;
  const disp = { fontFamily: `"${f.family}"`, fontWeight: f.weight } as const;
  const dispLs = (s: number) => (f.ls || 0) * s;
  const nodes: ReactNode[] = [];

  const logoMark = (x: number, y: number, s: number, key: string) => {
    if (logoSrc && logoFull) {
      nodes.push(<image key={key} href={logoSrc} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" />);
    } else if (logo) {
      const k = Math.min(s / logo.w, s / logo.h), lw = logo.w * k, lh = logo.h * k;
      const lx = x + (s - lw) / 2, ly = y + (s - lh) / 2;
      nodes.push(
        <g key={key}>
          <mask id={`${uid}m${key}`} maskUnits="userSpaceOnUse" x={lx} y={ly} width={lw} height={lh}>
            <image href={logo.href} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="none" />
          </mask>
          <rect x={lx} y={ly} width={lw} height={lh} fill={c1} mask={`url(#${uid}m${key})`} />
        </g>,
      );
    } else {
      // monogram: vòng tròn + chữ cái đầu
      const r = s / 2, ini = initials(data.brand || '');
      const ts = fitSize(ini, s * 0.62, s * 0.5, 'Montserrat', 800);
      nodes.push(
        <g key={key}>
          <circle cx={x + r} cy={y + r} r={r - s * 0.06} fill="none" stroke={c1} strokeWidth={s * 0.09} />
          <text x={x + r} y={base(y + r, ts)} textAnchor="middle" fontFamily="Montserrat" fontWeight={800} fontSize={ts} fill={c1}>{ini}</text>
        </g>,
      );
    }
  };
  const text = (t: string, x: number, y: number, s: number, fill: string, anchor: 'start' | 'middle' | 'end', key: string, font: { fam: string; wt: number; ls?: number } = { fam: f.family, wt: f.weight, ls: f.ls }) => {
    if (!t) return;
    nodes.push(
      <text key={key} x={x} y={y} fontSize={s} fill={fill} textAnchor={anchor} fontFamily={`"${font.fam}"`} fontWeight={font.wt} letterSpacing={(font.ls || 0) * s} style={NOLIGA} data-pen-text="1">{t}</text>,
    );
  };

  if (area === 'clip') {
    const t = spec.layout === 'name' ? (data.brand || '') : (data.clip || data.brand || '');
    const cf = f.script ? { fam: 'Montserrat', wt: 800, ls: 0.04 } : { fam: f.family, wt: f.weight, ls: f.ls };
    const s1 = fitSize(t, iw, ih * 0.86, cf.fam, cf.wt, cf.ls);
    const [a1, a2] = split2(t);
    if (s1 < 1.5 && a2) {
      // chữ dài trên kẹp hẹp → 2 dòng cân nhau
      const s = Math.max(PEN_MIN_TEXT, Math.min(fitSize(a1, iw, ih * 0.44, cf.fam, cf.wt, cf.ls), fitSize(a2, iw, ih * 0.44, cf.fam, cf.wt, cf.ls)));
      text(a1, W / 2, cy - s * 0.12, s, c1, 'middle', 'clip', cf);
      text(a2, W / 2, cy + s * 0.98, s, c1, 'middle', 'clip2', cf);
    } else {
      const s = Math.max(PEN_MIN_TEXT, s1);
      text(t, W / 2, base(cy, s), s, c1, 'middle', 'clip', cf);
    }
  } else {
    const L = spec.layout;
    if (L === 'logo-brand') {
      const s = ih * 0.96, gap = H * 0.16;
      const t = data.brand || '';
      const ts = Math.max(PEN_MIN_TEXT, fitSize(t, iw - s - gap, ih * 0.66, f.family, f.weight, f.ls));
      const tw = measure(t, ts, f.family, f.weight, f.ls);
      const x0 = (W - (s + gap + tw)) / 2;
      logoMark(x0, my + (ih - s) / 2, s, 'lg');
      text(t, x0 + s + gap, base(cy, ts), ts, c1, 'start', 'b');
    } else if (L === 'logo-2line') {
      const s = ih * 0.98, gap = H * 0.16;
      const t1 = data.brand || '', t2 = data.line2 || '';
      const room = iw - s - gap;
      const s1 = Math.max(PEN_MIN_TEXT, fitSize(t1, room, ih * (t2 ? 0.5 : 0.66), f.family, f.weight, f.ls));
      const s2 = Math.max(PEN_MIN_TEXT, fitSize(t2, room, Math.min(ih * 0.32, s1 * 0.8), BODY, 600));
      const tw = Math.max(measure(t1, s1, f.family, f.weight, f.ls), t2 ? measure(t2, s2, BODY, 600) : 0);
      const x0 = (W - (s + gap + tw)) / 2;
      logoMark(x0, my + (ih - s) / 2, s, 'lg');
      if (t2) {
        const blockH = s1 * 0.95 + s2 * 1.15;
        const top = cy - blockH / 2;
        text(t1, x0 + s + gap, top + s1 * 0.82, s1, c1, 'start', 'b');
        text(t2, x0 + s + gap, top + s1 * 0.95 + s2 * 0.95, s2, c2, 'start', 'l2', { fam: BODY, wt: 600 });
      } else text(t1, x0 + s + gap, base(cy, s1), s1, c1, 'start', 'b');
    } else if (L === 'divider') {
      const t1 = data.brand || '', t2 = data.line2 || '';
      const gap = H * 0.5;
      const w1 = measure(t1, 1, f.family, f.weight, f.ls), w2 = measure(t2, 0.82, BODY, 600);
      const sMax = ih * 0.62;
      const s = Math.min(sMax, (iw - (t2 ? gap : 0)) / (w1 + (t2 ? w2 : 0) || 1));
      if (t2 && s < Math.max(1.6, ih * 0.3)) {
        // quá dài cho 1 dòng → xếp 2 dòng (tên trên, dòng phụ dưới)
        const s1 = Math.max(PEN_MIN_TEXT, fitSize(t1, iw, ih * 0.5, f.family, f.weight, f.ls));
        const s2 = Math.max(PEN_MIN_TEXT, fitSize(t2, iw, Math.min(ih * 0.34, s1 * 0.85), BODY, 600));
        const blockH = s1 * 0.95 + s2 * 1.15, top = cy - blockH / 2;
        text(t1, W / 2, top + s1 * 0.82, s1, c1, 'middle', 'b');
        text(t2, W / 2, top + s1 * 0.95 + s2 * 0.95, s2, c2, 'middle', 'l2', { fam: BODY, wt: 600 });
      } else {
        const ss = Math.max(PEN_MIN_TEXT, s);
        const tw1 = w1 * ss, tw2 = t2 ? w2 * ss : 0;
        const x0 = (W - (tw1 + (t2 ? gap + tw2 : 0))) / 2;
        text(t1, x0, base(cy, ss), ss, c1, 'start', 'b');
        if (t2) {
          nodes.push(<line key="dv" x1={x0 + tw1 + gap / 2} x2={x0 + tw1 + gap / 2} y1={cy - ss * 0.42} y2={cy + ss * 0.42} stroke={c2} strokeWidth={Math.max(0.18, ss * 0.07)} />);
          text(t2, x0 + tw1 + gap, base(cy, ss * 0.82), ss * 0.82, c2, 'start', 'l2', { fam: BODY, wt: 600 });
        }
      }
    } else if (L === 'name') {
      const t = name || parseNames(data.names || '')[0] || 'Quốc Bảo';
      // chữ viết tay có nét đuôi dài (Q, g…) → nhỏ hơn chút và nâng baseline để đuôi không lọt khỏi vùng khắc
      const s = Math.max(PEN_MIN_TEXT, fitSize(t, iw * 0.92, ih * (f.script ? 0.8 : 0.66), f.family, f.weight, f.ls));
      text(t, W / 2, f.script ? cy + s * 0.2 : base(cy, s), s, c1, 'middle', 'n');
    } else if (L === 'hotline') {
      const t = data.hotline || '';
      const icon = ih * 0.78, gap = H * 0.12;
      const s = Math.max(PEN_MIN_TEXT, fitSize(t, iw - icon - gap, ih * 0.72, f.family, f.weight, f.ls));
      const tw = measure(t, s, f.family, f.weight, f.ls);
      const x0 = (W - (icon + gap + tw)) / 2;
      const k = icon / 24;
      nodes.push(<path key="ph" d={PHONE} fill={c2} transform={`translate(${x0} ${cy - icon / 2}) scale(${k})`} />);
      text(t, x0 + icon + gap, base(cy, s), s, c1, 'start', 'h');
    } else { // event
      const t1 = data.brand || '', t2 = data.line2 || '';
      const s1 = Math.max(PEN_MIN_TEXT, fitSize(t1, iw, ih * (t2 ? 0.48 : 0.66), f.family, f.weight, f.ls));
      const s2 = Math.max(PEN_MIN_TEXT, fitSize(t2, iw, Math.min(ih * 0.32, s1 * 0.8), BODY, 600));
      if (t2) {
        const blockH = s1 * 0.95 + s2 * 1.15, top = cy - blockH / 2;
        text(t1, W / 2, top + s1 * 0.82, s1, c1, 'middle', 'b');
        text(t2, W / 2, top + s1 * 0.95 + s2 * 0.95, s2, c2, 'middle', 'l2', { fam: BODY, wt: 600 });
      } else text(t1, W / 2, base(cy, s1), s1, c1, 'middle', 'b');
    }
  }

  const bg = mode === 'view'
    ? <rect x={0} y={0} width={W} height={H} rx={Math.min(1.2, H * 0.2)} fill={body.hex} />
    : null;
  const frame = mode === 'print'
    ? <rect id="Vung-in" x={0.05} y={0.05} width={W - 0.1} height={H - 0.1} fill="none" stroke="#EC008C" strokeWidth={0.1} strokeDasharray="0.6 0.4" />
    : null;
  const inner = <>{bg}<g id="In">{nodes}</g>{frame}</>;
  if (nested) return <svg x={nested.x} y={nested.y} width={nested.w} height={nested.h} viewBox={`0 0 ${W} ${H}`} overflow="visible">{inner}</svg>;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={mode === 'print' ? `${W}mm` : undefined} height={mode === 'print' ? `${H}mm` : undefined}
      style={style} data-area={area} data-w={W} data-h={H}>{inner}</svg>
  );
}

// ---------- bút phẳng (thumbnail + bản thiết kế) ----------
interface FlatGeo { L: number; r: number; band: number; clip: [number, number]; parts: { x0: number; x1: number; r0: number; r1: number; kind: 'tip' | 'body' | 'grip' | 'chrome' | 'rubber' | 'cap' }[] }
export function penGeo(m: PenModel): FlatGeo {
  if (m === 'click') return {
    L: 140, r: 5.2, band: 72, clip: [95, 131],
    parts: [
      { x0: 0, x1: 6, r0: 0.4, r1: 1.8, kind: 'tip' }, { x0: 6, x1: 20, r0: 1.8, r1: 4.5, kind: 'body' },
      { x0: 20, x1: 43, r0: 4.6, r1: 4.8, kind: 'grip' }, { x0: 43, x1: 46, r0: 5.25, r1: 5.25, kind: 'chrome' },
      { x0: 46, x1: 130, r0: 5.2, r1: 5.2, kind: 'body' }, { x0: 130, x1: 133, r0: 4.4, r1: 4.4, kind: 'chrome' },
      { x0: 133, x1: 140, r0: 3.0, r1: 2.4, kind: 'body' },
    ],
  };
  if (m === 'cap') return {
    L: 142, r: 4.4, band: 98, clip: [8, 50],
    parts: [
      { x0: 0, x1: 58, r0: 4.6, r1: 4.9, kind: 'cap' }, { x0: 58, x1: 138, r0: 4.4, r1: 4.4, kind: 'body' },
      { x0: 138, x1: 142, r0: 4.1, r1: 3.4, kind: 'body' },
    ],
  };
  if (m === 'metal') return {
    L: 138, r: 4.6, band: 78, clip: [101, 136],
    parts: [
      { x0: 0, x1: 26, r0: 0.4, r1: 4.5, kind: 'tip' }, { x0: 26, x1: 50, r0: 4.5, r1: 4.5, kind: 'body' },
      { x0: 50, x1: 52.5, r0: 4.7, r1: 4.7, kind: 'chrome' }, { x0: 52.5, x1: 124, r0: 4.6, r1: 4.6, kind: 'body' },
      { x0: 124, x1: 138, r0: 4.6, r1: 3.2, kind: 'chrome' },
    ],
  };
  return {
    L: 140, r: 4.4, band: 76, clip: [98, 130],
    parts: [
      { x0: 0, x1: 24, r0: 0.4, r1: 4.3, kind: 'tip' }, { x0: 24, x1: 48, r0: 4.3, r1: 4.3, kind: 'body' },
      { x0: 48, x1: 50.5, r0: 4.5, r1: 4.5, kind: 'chrome' }, { x0: 50.5, x1: 129, r0: 4.4, r1: 4.4, kind: 'body' },
      { x0: 129, x1: 132, r0: 4.45, r1: 4.45, kind: 'chrome' }, { x0: 132, x1: 140, r0: 4.2, r1: 3.6, kind: 'rubber' },
    ],
  };
}

const shade = (hex: string, k: number) => {
  const s = hex.replace('#', ''); const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16));
  const m = (v: number) => Math.max(0, Math.min(255, Math.round(k >= 0 ? v + (255 - v) * k : v * (1 + k))));
  return `#${[m(r), m(g), m(b)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

/** Bút nằm ngang nhìn từ trên (2D) — có vùng in thân + kẹp đúng vị trí */
export function PenFlatSvg({ spec, data, name, logo = null, logoSrc = '', style }: { spec: PenSpec; data: PenData; name?: string; logo?: TPLogo | null; logoSrc?: string; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const g = penGeo(spec.model);
  const md = penModel(spec.model);
  const body = penBody(spec.body);
  const cy = 9.6; // khung cao 18mm, trục bút ở y = 9.6
  const col = (k: FlatGeo['parts'][number]['kind']) =>
    k === 'tip' ? (md.metal || spec.model !== 'cap' ? '#C9CDD3' : body.hex)
      : k === 'chrome' ? '#D7DBE0' : k === 'grip' ? '#2B2D31' : k === 'rubber' ? '#24262A' : body.hex;
  const grad = (id: string, hex: string, metal: boolean) => (
    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={shade(hex, -0.35)} />
      <stop offset="0.22" stopColor={shade(hex, metal ? 0.55 : 0.28)} />
      <stop offset="0.42" stopColor={hex} />
      <stop offset="0.8" stopColor={shade(hex, -0.22)} />
      <stop offset="1" stopColor={shade(hex, -0.45)} />
    </linearGradient>
  );
  const kinds = Array.from(new Set(g.parts.map((p) => p.kind)));
  const bw = md.barrel.w, bh = md.barrel.h;
  // vùng in thân: nhìn từ trên thấy ~ đường kính; co chiều cao vùng in theo cung nhìn thấy
  const visH = Math.min(bh, g.r * 1.7);
  const clipW = md.clip.h + 1.2;
  const clipY = Math.max(0.2, cy - g.r - clipW * 0.55);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`-3 0 ${g.L + 6} 18`} style={style}>
      <defs>{kinds.map((k) => grad(`${uid}${k}`, col(k), k === 'chrome' || k === 'tip' || md.metal))}</defs>
      <ellipse cx={g.L / 2} cy={cy + g.r + 1.6} rx={g.L * 0.48} ry={1.2} fill="rgba(0,0,0,0.12)" />
      {g.parts.map((p, i) => (
        <path key={i} d={`M${p.x0} ${cy - p.r0} L${p.x1} ${cy - p.r1} L${p.x1} ${cy + p.r1} L${p.x0} ${cy + p.r0} Z`} fill={`url(#${uid}${p.kind})`} />
      ))}
      {/* vùng in thân */}
      <svg x={g.band - bw / 2} y={cy - visH / 2} width={bw} height={visH} viewBox={`0 0 ${bw} ${bh}`} preserveAspectRatio="none">
        <PenArtSvg spec={spec} data={data} area="barrel" name={name} logo={logo} logoSrc={logoSrc} mode="ink" nested={{ x: 0, y: 0, w: bw, h: bh }} />
      </svg>
      {/* kẹp */}
      {/* kẹp: dải nằm vắt mép trên thân (góc nhìn 3/4) */}
      <g>
        <rect x={g.clip[0]} y={clipY} width={g.clip[1] - g.clip[0]} height={clipW} rx={clipW / 2} fill={md.metal ? `url(#${uid}chrome)` : shade(body.hex, -0.08)} stroke="rgba(0,0,0,0.25)" strokeWidth={0.15} />
        {spec.clipOn && (
          <PenArtSvg spec={spec} data={data} area="clip" logo={logo} logoSrc={logoSrc} mode="ink"
            nested={{ x: (g.clip[0] + g.clip[1]) / 2 - md.clip.w / 2, y: clipY + (clipW - md.clip.h) / 2, w: md.clip.w, h: md.clip.h }} />
        )}
      </g>
    </svg>
  );
}

// ---------- tờ file in A4 (tỉ lệ 1:1) ----------
export interface SheetItem { kind: 'barrel' | 'clip' | 'zoom'; label: string; name?: string; h: number }
export function penSheetItems(spec: PenSpec, data: PenData): SheetItem[] {
  const md = penModel(spec.model);
  const items: SheetItem[] = [{ kind: 'zoom', label: 'Phóng to ×3 để xem (không in)', h: md.barrel.h * 3 + 9 }];
  const names = parseNames(data.names || '');
  if (spec.layout === 'name' && names.length) {
    names.forEach((n, i) => items.push({ kind: 'barrel', label: `${String(i + 1).padStart(2, '0')} · ${n}`, name: n, h: md.barrel.h + 6.5 }));
  } else items.push({ kind: 'barrel', label: `Thân bút · ${md.barrel.w}×${md.barrel.h}mm`, h: md.barrel.h + 6.5 });
  if (spec.clipOn) items.push({ kind: 'clip', label: `Kẹp bút · ${md.clip.w}×${md.clip.h}mm`, h: md.clip.h + 6.5 });
  return items;
}
const SHEET_TOP = 34, SHEET_BOTTOM = 284;
/** chia item thành các trang A4 */
export function penSheetPages(spec: PenSpec, data: PenData): SheetItem[][] {
  const pages: SheetItem[][] = [[]];
  let y = SHEET_TOP;
  for (const it of penSheetItems(spec, data)) {
    if (y + it.h > SHEET_BOTTOM && pages[pages.length - 1].length) { pages.push([]); y = SHEET_TOP; }
    pages[pages.length - 1].push(it); y += it.h;
  }
  return pages;
}

export function PenSheetSvg({ spec, data, items, page, pages, logo = null, logoSrc = '', style }: {
  spec: PenSpec; data: PenData; items: SheetItem[]; page: number; pages: number; logo?: TPLogo | null; logoSrc?: string; style?: CSSProperties;
}) {
  const md = penModel(spec.model);
  const body = penBody(spec.body);
  const method = PEN_METHODS.find((m) => m.id === spec.method)!;
  const inkTxt = spec.method === 'laser' ? 'khắc laser (vùng đen = vùng khắc)'
    : spec.method === 'uv' ? 'UV đủ màu' : `tampon ${spec.inks.length} màu: ${spec.inks.map((i) => penInk(i).name).join(' + ')}`;
  let y = SHEET_TOP;
  const X = 18;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 210 297" width="210mm" height="297mm" style={style} data-page={page}>
      <rect width={210} height={297} fill="#FFFFFF" />
      <g fontFamily={`"${BODY}"`} fill="#1B1F27">
        <text x={X} y={16} fontSize={4.2} fontWeight={800}>FILE IN BÚT · {md.name.toUpperCase()}</text>
        <text x={X} y={22.5} fontSize={2.6} fontWeight={600} fill="#4B5563">{`${method.name} · thân ${body.name.toLowerCase()} · ${inkTxt}`}</text>
        <text x={X} y={27.5} fontSize={2.4} fontWeight={600} fill="#6B7280">{`Tỉ lệ 1:1 (in đúng kích thước) · khung hồng nét đứt = giới hạn vùng in · trang ${page}/${pages}`}</text>
      </g>
      <line x1={X} x2={192} y1={30.5} y2={30.5} stroke="#D1D5DB" strokeWidth={0.25} />
      {items.map((it, i) => {
        const y0 = y; y += it.h;
        const A = it.kind === 'clip' ? md.clip : md.barrel;
        if (it.kind === 'zoom') {
          const k = 3;
          return (
            <g key={i}>
              <text x={X} y={y0 + 3.2} fontSize={2.4} fontWeight={600} fill="#6B7280" fontFamily={`"${BODY}"`}>{it.label}</text>
              <PenArtSvg spec={spec} data={data} area="barrel" name={parseNames(data.names || '')[0]} logo={logo} logoSrc={logoSrc} mode="view" nested={{ x: X, y: y0 + 5, w: A.w * k, h: A.h * k }} />
            </g>
          );
        }
        return (
          <g key={i}>
            <text x={X} y={y0 + 3.2} fontSize={2.4} fontWeight={600} fill="#374151" fontFamily={`"${BODY}"`}>{it.label}</text>
            <PenArtSvg spec={spec} data={data} area={it.kind} name={it.name} logo={logo} logoSrc={logoSrc} mode="print" nested={{ x: X, y: y0 + 4.5, w: A.w, h: A.h }} />
          </g>
        );
      })}
      <text x={X} y={291} fontSize={2.2} fill="#9CA3AF" fontFamily={`"${BODY}"`} fontWeight={600}>Mivy · {data.brand || ''}</text>
    </svg>
  );
}

// ---------- nắp hộp quà (3D) ----------
export const BOX = { w: 172, d: 46, h: 26 };
export function PenBoxLidSvg({ data, logo = null }: { data: PenData; logo?: TPLogo | null }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = BOX.w, H = BOX.d, gold = '#CDB27A';
  const t = data.brand || '';
  // nắp tựa sau hộp: chỉ nửa trên lộ ra → logo + tên công ty dồn lên trên
  const s = fitSize(t, W * 0.62, H * 0.13, 'Playfair Display', 800, 0.08);
  const ls = 0.08 * s;
  const m = H * 0.2, my = H * 0.1;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill="#1B2030" />
      <rect x={4} y={4} width={W - 8} height={H - 8} fill="none" stroke={gold} strokeWidth={0.5} />
      {logo ? (
        <>
          <mask id={`${uid}lm`} maskUnits="userSpaceOnUse" x={W / 2 - m / 2} y={my} width={m} height={m}>
            <image href={logo.href} x={W / 2 - m / 2} y={my} width={m} height={m} preserveAspectRatio="xMidYMid meet" />
          </mask>
          <rect x={W / 2 - m / 2} y={my} width={m} height={m} fill={gold} mask={`url(#${uid}lm)`} />
        </>
      ) : (
        <text x={W / 2} y={my + m * 0.86} textAnchor="middle" fontFamily='"Playfair Display"' fontWeight={800} fontSize={m} fill={gold}>{initials(t)}</text>
      )}
      <line x1={W / 2 - 14} x2={W / 2 + 14} y1={H * 0.37} y2={H * 0.37} stroke={gold} strokeWidth={0.35} />
      <text x={W / 2} y={H * 0.37 + s * 1.15} textAnchor="middle" fontFamily='"Playfair Display"' fontWeight={800} fontSize={s} letterSpacing={ls} fill={gold}>{t}</text>
    </svg>
  );
}
