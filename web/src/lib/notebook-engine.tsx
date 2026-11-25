'use client';
// Sổ tay in logo: 1 engine SVG (đơn vị = mm) cho 3 loại sổ — lò xo bìa cứng (bìa in màu bồi bìa, lề gập 15mm),
// bìa da/simili khâu gáy (KHÔNG in màu: logo ép kim / ép chìm → file = khuôn ép 1 màu đen), kraft bìa mềm
// (in mực lên giấy kraft, nền kraft không in). Mẫu = loại × bố cục × màu × font, render code 100%.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { drawPrintPage, printPageDims } from './print-export';

export type NBKind = 'wire' | 'leather' | 'kraft';
export type NBBind = 'side' | 'top';
export type NBRule = 'lined' | 'dot' | 'grid' | 'blank';
export type NBFoil = 'gold' | 'silver' | 'copper' | 'deboss';

export const NB_KINDS: { id: NBKind; name: string; blurb: string }[] = [
  { id: 'wire', name: 'Sổ lò xo bìa cứng', blurb: 'Bìa in màu bồi bìa cứng, gáy lò xo kép' },
  { id: 'leather', name: 'Sổ bìa da', blurb: 'Bìa da/simili khâu gáy, logo ép kim / ép chìm' },
  { id: 'kraft', name: 'Sổ kraft bìa mềm', blurb: 'Bìa giấy kraft in mực, giá mềm' },
];

export interface NBSize { id: string; kind: NBKind; name: string; wMm: number; hMm: number }
export const NB_SIZES: NBSize[] = [
  { id: 'wire-a5', kind: 'wire', name: 'A5 · 148×210', wMm: 148, hMm: 210 },
  { id: 'wire-b5', kind: 'wire', name: 'B5 · 176×250', wMm: 176, hMm: 250 },
  { id: 'leather-a5', kind: 'leather', name: 'A5 · 148×210', wMm: 148, hMm: 210 },
  { id: 'leather-b5', kind: 'leather', name: 'B5 · 176×250', wMm: 176, hMm: 250 },
  { id: 'kraft-a6', kind: 'kraft', name: 'A6 · 105×148', wMm: 105, hMm: 148 },
  { id: 'kraft-a5', kind: 'kraft', name: 'A5 · 148×210', wMm: 148, hMm: 210 },
];
export const nbSize = (id: string) => NB_SIZES.find((s) => s.id === id) || NB_SIZES[0];
export const sizesOfKind = (k: NBKind) => NB_SIZES.filter((s) => s.kind === k);

export const NB_WRAP_MM = 15;   // lò xo bìa cứng: giấy bìa gập ôm qua tấm bìa 15mm
export const NB_BLEED_MM = 3;   // kraft + ruột: lề xén 3mm
export const SPINE_MM: Record<NBKind, number> = { wire: 0, leather: 16, kraft: 3 };
export const NB_PAGES = { wire: 120, leather: 192, kraft: 80 } as const;

// ---------- font (chỉ font có TTF ở /public/fonts → file in outline được) ----------
export interface NBFont { id: string; name: string; family: string; weight: number }
export const NB_FONTS: NBFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
];
export const nbFont = (id: string) => NB_FONTS.find((f) => f.id === id) || NB_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const NB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Cormorant+Garamond:wght@700&display=swap');`;

export function useNBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-nb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-nb-fonts'; link.rel = 'stylesheet';
        link.href = NB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...NB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu ----------
/** bìa in màu (lò xo) — kraft dùng palette 'kraft-*' (nền = giấy kraft, KHÔNG in) */
export interface NBPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string; rule: string; kraft?: boolean }
export const NB_PALETTES: NBPalette[] = [
  { id: 'navy', name: 'Navy vàng', bg: '#1F3A68', ink: '#FFFFFF', sub: '#C9D3E6', accent: '#C8A24A', accent2: '#2B4C85', onAccent: '#1F3A68', rule: '#8FA6CF' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0F5E58', ink: '#FFFFFF', sub: '#BFE3DD', accent: '#F2C94C', accent2: '#13766E', onAccent: '#0F3D39', rule: '#7FC4BB' },
  { id: 'sky', name: 'Xanh học đường', bg: '#F4F8FF', ink: '#173A72', sub: '#4F6890', accent: '#2F6FD0', accent2: '#FFC93C', onAccent: '#FFFFFF', rule: '#9DB8E6' },
  { id: 'coral', name: 'Kem san hô', bg: '#F6EFE6', ink: '#1E2A3A', sub: '#5D6470', accent: '#E2654B', accent2: '#2E5E73', onAccent: '#FFFFFF', rule: '#E8B9A9' },
  { id: 'black', name: 'Đen ánh kim', bg: '#17191E', ink: '#F4F1EA', sub: '#B4B0A6', accent: '#C8A24A', accent2: '#2A2D34', onAccent: '#17191E', rule: '#6E6A60' },
  { id: 'red', name: 'Đỏ Tết', bg: '#A8201A', ink: '#FFF3D6', sub: '#F6D7A8', accent: '#F2C14E', accent2: '#C2362C', onAccent: '#7A140F', rule: '#E8A06A' },
  { id: 'sage', name: 'Xanh lá nhạt', bg: '#E6EEE3', ink: '#1F3B2D', sub: '#4E6656', accent: '#4F8A5B', accent2: '#C9A646', onAccent: '#FFFFFF', rule: '#9EBBA5' },
  { id: 'kraft-dark', name: 'Kraft · mực nâu đen', bg: '#C7A275', ink: '#2A2018', sub: '#4A3A2A', accent: '#2A2018', accent2: '#2A2018', onAccent: '#C7A275', rule: '#8A6B4A', kraft: true },
  { id: 'kraft-navy', name: 'Kraft · mực navy', bg: '#C7A275', ink: '#1F3157', sub: '#2E3F63', accent: '#1F3157', accent2: '#1F3157', onAccent: '#C7A275', rule: '#7B6B5A', kraft: true },
  { id: 'kraft-red', name: 'Kraft · mực đỏ', bg: '#C7A275', ink: '#8E2A22', sub: '#7A2E25', accent: '#8E2A22', accent2: '#8E2A22', onAccent: '#C7A275', rule: '#8A5A45', kraft: true },
];
export const nbPalette = (id: string) => NB_PALETTES.find((p) => p.id === id) || NB_PALETTES[0];
export const palettesOfKind = (k: NBKind) => NB_PALETTES.filter((p) => (k === 'kraft' ? !!p.kraft : !p.kraft));

export interface NBLeather { id: string; name: string; color: string; band: string }
export const NB_LEATHERS: NBLeather[] = [
  { id: 'den', name: 'Đen', color: '#1D1D20', band: '#111114' },
  { id: 'nau', name: 'Nâu bò', color: '#6E4427', band: '#3B2416' },
  { id: 'navy', name: 'Xanh navy', color: '#1E2B46', band: '#141C2E' },
  { id: 'do', name: 'Đỏ đô', color: '#5C1A20', band: '#331014' },
  { id: 'reu', name: 'Xanh rêu', color: '#394632', band: '#222A1D' },
  { id: 'be', name: 'Be sữa', color: '#CDB99B', band: '#6E5A40' },
];
export const nbLeather = (id: string) => NB_LEATHERS.find((l) => l.id === id) || NB_LEATHERS[0];
export const NB_FOILS: { id: NBFoil; name: string; color: string }[] = [
  { id: 'gold', name: 'Ép kim vàng', color: '#D8B24C' },
  { id: 'silver', name: 'Ép kim bạc', color: '#CDD2D8' },
  { id: 'copper', name: 'Ép kim đồng', color: '#C07A4A' },
  { id: 'deboss', name: 'Ép chìm (không màu)', color: '' },
];
export const nbFoil = (id: string) => NB_FOILS.find((f) => f.id === id) || NB_FOILS[0];

// ---------- bố cục + mẫu ----------
export const NB_LAYOUTS: { id: string; name: string }[] = [
  { id: 'corporate', name: 'Doanh nghiệp' },
  { id: 'event', name: 'Hội nghị · sự kiện' },
  { id: 'school', name: 'Trường học' },
  { id: 'pattern', name: 'Hoạ tiết tối giản' },
  { id: 'tet', name: 'Quà Tết' },
  { id: 'minimal', name: 'Logo giữa' },
  { id: 'corner', name: 'Logo góc + viền' },
];
export const NB_LAYOUTS_OF: Record<NBKind, string[]> = {
  wire: ['corporate', 'event', 'school', 'pattern', 'tet'],
  leather: ['minimal', 'corner', 'tet', 'event'],
  kraft: ['pattern', 'corporate', 'school', 'minimal'],
};

export interface NBSpec {
  kind: NBKind; layout: string; palette: string; font: string; size: string;
  bind: NBBind; rule: NBRule; leather: string; foil: NBFoil; logoMono: boolean;
}
export interface NBTemplate { id: string; name: string; spec: Partial<NBSpec> & { kind: NBKind; layout: string } }
export const NB_TEMPLATES: NBTemplate[] = [
  { id: 'w-corp', name: 'Doanh nghiệp · navy', spec: { kind: 'wire', layout: 'corporate', palette: 'navy', font: 'montserrat' } },
  { id: 'w-event', name: 'Hội nghị · xanh ngọc', spec: { kind: 'wire', layout: 'event', palette: 'teal', font: 'montserrat' } },
  { id: 'w-school', name: 'Trường học', spec: { kind: 'wire', layout: 'school', palette: 'sky', font: 'bvp' } },
  { id: 'w-pattern', name: 'Hoạ tiết · san hô', spec: { kind: 'wire', layout: 'pattern', palette: 'coral', font: 'playfair' } },
  { id: 'w-tet', name: 'Quà Tết · đỏ kim', spec: { kind: 'wire', layout: 'tet', palette: 'red', font: 'playfair' } },
  { id: 'w-black', name: 'Doanh nghiệp · đen', spec: { kind: 'wire', layout: 'corporate', palette: 'black', font: 'cormorant' } },
  { id: 'l-min', name: 'Da đen · ép vàng', spec: { kind: 'leather', layout: 'minimal', leather: 'den', foil: 'gold', font: 'cormorant' } },
  { id: 'l-corner', name: 'Da nâu · ép chìm', spec: { kind: 'leather', layout: 'corner', leather: 'nau', foil: 'deboss', font: 'playfair' } },
  { id: 'l-tet', name: 'Da đỏ đô · Tết ép vàng', spec: { kind: 'leather', layout: 'tet', leather: 'do', foil: 'gold', font: 'playfair' } },
  { id: 'l-event', name: 'Da navy · ép bạc', spec: { kind: 'leather', layout: 'event', leather: 'navy', foil: 'silver', font: 'montserrat' } },
  { id: 'k-pattern', name: 'Kraft · hoạ tiết', spec: { kind: 'kraft', layout: 'pattern', palette: 'kraft-dark', font: 'playfair' } },
  { id: 'k-corp', name: 'Kraft · doanh nghiệp', spec: { kind: 'kraft', layout: 'corporate', palette: 'kraft-navy', font: 'montserrat' } },
  { id: 'k-school', name: 'Kraft · trường học', spec: { kind: 'kraft', layout: 'school', palette: 'kraft-red', font: 'bvp' } },
];
export const templatesOfKind = (k: NBKind) => NB_TEMPLATES.filter((t) => t.spec.kind === k);
const KIND_DEFAULT: Record<NBKind, Partial<NBSpec>> = {
  wire: { palette: 'navy', size: 'wire-a5', logoMono: false },
  leather: { leather: 'den', foil: 'gold', size: 'leather-a5', logoMono: true },
  kraft: { palette: 'kraft-dark', size: 'kraft-a6', logoMono: true },
};
export function applyTemplate(cur: NBSpec, t: NBTemplate): NBSpec {
  const sameKind = cur.kind === t.spec.kind;
  const base: NBSpec = sameKind ? cur : { ...cur, ...KIND_DEFAULT[t.spec.kind] } as NBSpec;
  return { ...base, ...t.spec };
}
export const NB_FIRST: NBSpec = { kind: 'wire', layout: 'corporate', palette: 'navy', font: 'montserrat', size: 'wire-a5', bind: 'side', rule: 'lined', leather: 'den', foil: 'gold', logoMono: false };

// ---------- nội dung ----------
export type NBData = Record<string, string>;
export interface NBField { key: string; label: string; ph?: string; half?: boolean }
export const NB_FIELDS: NBField[] = [
  { key: 'brand', label: 'Tên công ty / trường / thương hiệu' },
  { key: 'title', label: 'Tiêu đề sổ', half: true },
  { key: 'label', label: 'Dòng nhãn nhỏ', half: true },
  { key: 'slogan', label: 'Slogan / lời chúc' },
  { key: 'date', label: 'Ngày · địa điểm (sự kiện)' },
  { key: 'website', label: 'Website', half: true },
  { key: 'phone', label: 'Hotline', half: true },
];
export const NB_SAMPLES: Record<string, NBData> = {
  corporate: { brand: 'AN KHANG GROUP', title: 'PLANNER 2027', label: 'Sổ tay công việc', slogan: 'Kiến tạo giá trị bền vững', date: '', website: 'ankhang.vn', phone: '1900 6868' },
  event: { brand: 'AN KHANG GROUP', title: 'Hội nghị khách hàng 2027', label: 'SỔ TAY ĐẠI BIỂU', slogan: 'Đồng hành · Bứt phá', date: '15.03.2027 · TP. Hồ Chí Minh', website: 'ankhang.vn', phone: '1900 6868' },
  school: { brand: 'TRƯỜNG THPT GIA KHÁNH', title: 'SỔ TAY HỌC SINH', label: 'Năm học 2026 – 2027', slogan: 'Chăm ngoan · Sáng tạo · Tự tin', date: '', website: 'thptgiakhanh.edu.vn', phone: '028 3822 6868' },
  pattern: { brand: 'THU HÀ STUDIO', title: 'Notebook', label: 'Ý tưởng mỗi ngày', slogan: 'Ghi lại mọi ý tưởng đẹp', date: '', website: 'thuhastudio.vn', phone: '0909 123 456' },
  tet: { brand: 'AN KHANG GROUP', title: 'XUÂN ĐINH MÙI', label: '2027', slogan: 'An khang thịnh vượng', date: '', website: 'ankhang.vn', phone: '1900 6868' },
  minimal: { brand: 'QUỐC BẢO LAW FIRM', title: 'NOTEBOOK', label: 'Est. 2012', slogan: 'Tận tâm · Chính trực', date: '', website: 'quocbaolaw.vn', phone: '028 3910 6868' },
  corner: { brand: 'AN KHANG', title: 'JOURNAL', label: 'Since 2012', slogan: 'Crafted for thinkers', date: '', website: 'ankhang.vn', phone: '1900 6868' },
};
export const defaultNBData = (layout = 'corporate'): NBData => ({ ...(NB_SAMPLES[layout] || NB_SAMPLES.corporate) });

/** đổi bố cục khi khách đã sửa chữ: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu bố cục mới */
export function switchNBData(d: NBData, from: string, to: string): NBData {
  const oldS = NB_SAMPLES[from] || {}, next = defaultNBData(to);
  for (const [k, v] of Object.entries(d)) if ((v || '').trim() && v !== oldS[k]) next[k] = v;
  return next;
}

// ---------- logo ----------
/** logo khách: ảnh gốc (màu) + mặt nạ 1 màu (trắng = in) để ép kim / in 1 màu */
export interface NBLogo { href: string; w: number; h: number; mask?: { href: string; w: number; h: number } }

// ---------- đo + xếp chữ ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} ${size * 20}px "${ts.fam}"`; // đo ở cỡ lớn (đơn vị mm nhỏ) cho chính xác
  return mctx.measureText(s).width / 20 + ls;
}
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
/** co chữ tới khi ≤ maxLines dòng + từng dòng vừa bề rộng; cân dòng tránh chữ mồ côi */
function fitBlock(text: string, maxW: number, size: number, ts0: TS, maxLines: number, minScale = 0.4) {
  // giãn chữ (letter-spacing) co theo cỡ chữ → chữ nhỏ lại thì khoảng giãn cũng nhỏ lại
  const at = (s: number): TS => ({ ...ts0, ls: (ts0.ls || 0) * (s / size) });
  let s = size, lines = wrapLines(text, maxW, s, at(s));
  while (lines.length > maxLines && s > size * minScale) { s *= 0.94; lines = wrapLines(text, maxW, s, at(s)); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, at(s)).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, at(s));
  }
  for (let i = 0; i < 40; i++) {
    const widest = Math.max(0, ...lines.map((l) => textW(l, s, at(s))));
    if (widest <= maxW) break;
    s *= Math.max(0.8, Math.min(0.98, maxW / widest));
  }
  return { lines, size: s, ls: at(s).ls || 0 };
}
type Anchor = 'start' | 'middle' | 'end';
interface BlockOpts { text: string; x: number; y: number; maxW: number; size: number; maxLines?: number; lh?: number; anchor?: Anchor; ts: TS; fill: string; upper?: boolean; minScale?: number }
/** khối chữ: y = baseline dòng đầu; trả về JSX + baseline dòng cuối */
function block(o: BlockOpts): { el: ReactNode; last: number; size: number; lines: number } {
  const text = o.upper ? (o.text || '').toUpperCase() : o.text || '';
  if (!text.trim()) return { el: null, last: o.y, size: o.size, lines: 0 };
  const { lines, size, ls } = fitBlock(text, o.maxW, o.size, o.ts, o.maxLines ?? 2, o.minScale);
  const lh = (o.lh ?? 1.18) * size;
  const el = (
    <text x={o.x} textAnchor={o.anchor || 'middle'} fontFamily={`"${o.ts.fam}"`} fontWeight={o.ts.wt} fontSize={size} fill={o.fill} letterSpacing={ls || undefined}>
      {lines.map((ln, i) => <tspan key={i} x={o.x} y={o.y + i * lh}>{ln}</tspan>)}
    </text>
  );
  return { el, last: o.y + (lines.length - 1) * lh, size, lines: lines.length };
}

const initials = (brand: string) => {
  const skip = new Set(['TRƯỜNG', 'THPT', 'THCS', 'TH', 'CÔNG', 'TY', 'TNHH', 'CP', 'CỔ', 'PHẦN', 'NHÀ', 'HÀNG']);
  const ws = (brand || '').toUpperCase().split(/\s+/).filter((w) => w && !skip.has(w));
  return ((ws[0]?.[0] || 'M') + (ws[1]?.[0] || '')).slice(0, 2);
};

// ---------- màu theo loại (in màu / ép kim / mặt nạ) ----------
export type NBMode = 'color' | 'print' | 'mask' | 'alpha';
interface Col { bg: string | null; ink: string; sub: string; accent: string; accent2: string; onAccent: string; rule: string; flat: boolean }
function colorsFor(spec: NBSpec, mode: NBMode): Col {
  const solid = (c: string, bg: string | null): Col => ({ bg, ink: c, sub: c, accent: c, accent2: c, onAccent: bg || 'none', rule: c, flat: true });
  if (mode === 'mask') return solid('#000000', '#FFFFFF');
  if (mode === 'alpha') return solid('#FFFFFF', null);
  if (spec.kind === 'leather') {
    const L = nbLeather(spec.leather), F = nbFoil(spec.foil);
    const fg = F.id === 'deboss' ? shade(L.color, -0.35) : F.color;
    return solid(fg, L.color);
  }
  const p = nbPalette(spec.palette);
  const flat = !!p.kraft;
  // kraft: bản in KHÔNG có nền (giấy kraft là nền) → print = nền trắng giấy, chỉ in mực
  const bg = flat && mode === 'print' ? null : p.bg;
  return { bg, ink: p.ink, sub: p.sub, accent: p.accent, accent2: p.accent2, onAccent: p.onAccent, rule: p.rule, flat };
}
export function shade(hex: string, k: number): string {
  const n = parseInt(hex.replace('#', ''), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(k < 0 ? c * (1 + k) : c + (255 - c) * k)));
  const r = f((n >> 16) & 255), g = f((n >> 8) & 255), b = f(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ---------- vẽ 1 mặt bìa (gốc = góc trên trái vùng thành phẩm) ----------
interface Ext { l: number; r: number; t: number; b: number }
interface PanelCtx { W: number; H: number; ext: Ext; spec: NBSpec; data: NBData; logo: NBLogo | null; c: Col; uid: string; mode: NBMode }

/** vùng an toàn: chừa gáy lò xo (lỗ đục) + lề 9–10mm */
function safeBox(p: PanelCtx, face: 'front' | 'back') {
  const m = p.W < 120 ? 8 : 10;
  const bindEdge = p.spec.kind === 'wire' ? 14 : p.spec.kind === 'leather' ? 12 : m;
  let x0 = m, x1 = p.W - m, y0 = m, y1 = p.H - m;
  if (p.spec.kind === 'wire' && p.spec.bind === 'top') y0 = bindEdge;
  else if (face === 'front') x0 = bindEdge; else x1 = p.W - bindEdge;
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2 };
}

function Logo({ p, cx, cy, size, color, ring = true }: { p: PanelCtx; cx: number; cy: number; size: number; color: string; ring?: boolean }) {
  const lg = p.logo;
  const mono = p.c.flat || p.spec.logoMono || p.mode === 'mask' || p.mode === 'alpha';
  if (lg) {
    const src = mono && lg.mask ? lg.mask : lg;
    const k = Math.min(size / src.w, size / src.h);
    const w = src.w * k, h = src.h * k, x = cx - w / 2, y = cy - h / 2;
    if (mono && lg.mask) {
      const id = `${p.uid}-lm`;
      return (
        <g>
          <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}><image href={lg.mask.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" /></mask>
          <rect x={x} y={y} width={w} height={h} fill={color} mask={`url(#${id})`} />
        </g>
      );
    }
    return <image href={lg.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />;
  }
  // chưa có logo → monogram chữ cái đầu
  const f = nbFont(p.spec.font);
  const ini = initials(p.data.brand);
  const r = size / 2;
  const fs = textW(ini, r, { fam: f.family, wt: f.weight }) > r * 1.2 ? (r * r * 1.2) / textW(ini, r, { fam: f.family, wt: f.weight }) : r;
  return (
    <g>
      {ring && <circle cx={cx} cy={cy} r={r * 0.94} fill="none" stroke={color} strokeWidth={size * 0.035} />}
      {ring && <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={color} strokeWidth={size * 0.012} />}
      <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fs} fill={color}>{ini}</text>
    </g>
  );
}

// hoạ tiết Truchet (cung 1/4) — nền tối giản, deterministic theo seed
function truchet(x0: number, y0: number, w: number, h: number, cell: number, color: string, sw: number, seed = 7): ReactNode {
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  let d = '';
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = x0 + i * cell, y = y0 + j * cell, r = cell / 2;
    if (rnd() < 0.5) d += `M${x + r} ${y}A${r} ${r} 0 0 1 ${x} ${y + r}M${x + cell} ${y + r}A${r} ${r} 0 0 0 ${x + r} ${y + cell}`;
    else d += `M${x + r} ${y}A${r} ${r} 0 0 0 ${x + cell} ${y + r}M${x} ${y + r}A${r} ${r} 0 0 1 ${x + r} ${y + cell}`;
  }
  return <path d={d} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round" />;
}

// cành mai: thân cong + hoa 5 cánh (fill) hoặc viền (ép kim)
function maiBranch(x: number, y: number, s: number, flip: boolean, petal: string, core: string, branch: string, outline: boolean): ReactNode {
  const sx = flip ? -1 : 1;
  const flowers: [number, number, number][] = [[-8, 10, 1], [-24, 18, 0.8], [-38, 30, 0.9], [-50, 22, 0.65], [-30, 4, 0.6], [-58, 38, 0.75]];
  const flower = (fx: number, fy: number, k: number, key: number) => {
    const r = 4.2 * k;
    return (
      <g key={key} transform={`translate(${fx} ${fy})`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={Math.cos(a) * r * 0.62} cy={Math.sin(a) * r * 0.62} r={r * 0.5} fill={outline ? 'none' : petal} stroke={outline ? petal : 'none'} strokeWidth={outline ? 0.35 : 0} />;
        })}
        <circle r={r * 0.28} fill={core} />
      </g>
    );
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${sx * s} ${s})`}>
      <path d="M6 -6 C -10 6, -28 10, -44 26 S -60 40, -66 46 M-22 12 C -26 4, -30 0, -34 -4 M-44 26 C -50 22, -54 18, -58 16" fill="none" stroke={branch} strokeWidth={1.6} strokeLinecap="round" />
      {flowers.map(([fx, fy, k], i) => flower(fx, fy, k, i))}
    </g>
  );
}

function FrontPanel(p: PanelCtx): ReactNode {
  const { W, H, ext, spec, data, c } = p;
  const f = nbFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight };
  const body: TS = { fam: BODY, wt: 600 };
  const bodyB: TS = { fam: BODY, wt: 800, ls: 0.4 };
  const sb = safeBox(p, 'front');
  const k = W / 148; // tỉ lệ theo A5
  const X0 = -ext.l, Y0 = -ext.t, FW = W + ext.l + ext.r, FH = H + ext.t + ext.b;
  const bg = c.bg ? <rect x={X0} y={Y0} width={FW} height={FH} fill={c.bg} /> : null;
  const foilish = spec.kind === 'leather' || p.mode === 'mask' || p.mode === 'alpha';
  const out: ReactNode[] = [bg];

  if (spec.layout === 'corporate') {
    if (!c.flat) {
      out.push(<rect key="band" x={X0} y={H - 30 * k} width={FW} height={30 * k + ext.b} fill={c.accent2} />);
      out.push(<rect key="line" x={X0} y={H - 30 * k} width={FW} height={1.4 * k} fill={c.accent} />);
    } else {
      out.push(<line key="l1" x1={sb.x0} x2={sb.x1} y1={H - 26 * k} y2={H - 26 * k} stroke={c.ink} strokeWidth={0.5} />);
    }
    const L = 44 * k;
    out.push(<Logo key="lg" p={p} cx={sb.cx} cy={H * 0.33} size={L} color={c.accent} />);
    const b = block({ text: data.brand, x: sb.cx, y: H * 0.33 + L / 2 + 15 * k, maxW: sb.w * 0.92, size: 9.5 * k, maxLines: 2, ts: { ...disp, ls: 0.6 * k }, fill: c.ink, upper: true });
    out.push(<g key="b">{b.el}</g>);
    out.push(<rect key="dv" x={sb.cx - 7 * k} y={b.last + 5 * k} width={14 * k} height={0.9 * k} fill={c.accent} />);
    const sl = block({ text: data.slogan, x: sb.cx, y: b.last + 12 * k, maxW: sb.w * 0.85, size: 4.2 * k, maxLines: 2, ts: body, fill: c.sub });
    out.push(<g key="s">{sl.el}</g>);
    const t = block({ text: data.title, x: sb.cx, y: H - 30 * k - 9 * k, maxW: sb.w * 0.8, size: 4.6 * k, maxLines: 1, ts: { ...bodyB, ls: 1.4 * k }, fill: c.ink, upper: true });
    out.push(<g key="t">{t.el}</g>);
    const foot = [data.website, data.phone].filter(Boolean).join('   ·   ');
    const ft = block({ text: foot, x: sb.cx, y: H - 13 * k, maxW: sb.w, size: 3.4 * k, maxLines: 1, ts: body, fill: c.flat ? c.ink : c.ink });
    out.push(<g key="f">{ft.el}</g>);
  } else if (spec.layout === 'event') {
    if (!foilish && !c.flat) {
      out.push(<path key="d1" d={`M${X0} ${H * 0.72} L${W + ext.r} ${H * 0.5} L${W + ext.r} ${H + ext.b} L${X0} ${H + ext.b} Z`} fill={c.accent2} />);
      out.push(<path key="d2" d={`M${X0} ${H * 0.8} L${W + ext.r} ${H * 0.6} L${W + ext.r} ${H * 0.62} L${X0} ${H * 0.82} Z`} fill={c.accent} />);
      out.push(<circle key="c1" cx={W * 0.86} cy={H * 0.16} r={26 * k} fill="none" stroke={c.accent} strokeWidth={1.2 * k} opacity={0.55} />);
      out.push(<circle key="c2" cx={W * 0.86} cy={H * 0.16} r={18 * k} fill="none" stroke={c.accent} strokeWidth={0.6 * k} opacity={0.4} />);
    } else {
      out.push(<line key="l1" x1={sb.cx - 10 * k} x2={sb.cx + 10 * k} y1={H * 0.3 - 8 * k} y2={H * 0.3 - 8 * k} stroke={c.accent} strokeWidth={0.6 * k} />);
    }
    const left = foilish ? sb.cx : sb.x0;
    const anc: Anchor = foilish ? 'middle' : 'start';
    out.push(<Logo key="lg" p={p} cx={foilish ? sb.cx : sb.x0 + 7 * k} cy={sb.y0 + 9 * k} size={14 * k} color={c.accent} />);
    if (!foilish) out.push(<g key="br">{block({ text: data.brand, x: sb.x0 + 17 * k, y: sb.y0 + 10.4 * k, maxW: sb.w * 0.6, size: 3.8 * k, maxLines: 1, ts: bodyB, fill: c.ink, anchor: 'start', upper: true }).el}</g>);
    const lb = block({ text: data.label, x: left, y: H * 0.3 + (foilish ? 0 : 8 * k), maxW: sb.w * 0.9, size: 3.6 * k, maxLines: 1, ts: { ...bodyB, ls: 1.2 * k }, fill: c.accent, anchor: anc, upper: true });
    out.push(<g key="lb">{lb.el}</g>);
    const t = block({ text: data.title, x: left, y: lb.last + 13 * k, maxW: sb.w * 0.94, size: 12 * k, maxLines: 3, lh: 1.08, ts: disp, fill: c.ink, anchor: anc });
    out.push(<g key="t">{t.el}</g>);
    const dt = block({ text: data.date, x: left, y: t.last + 10 * k, maxW: sb.w * 0.94, size: 3.8 * k, maxLines: 2, ts: body, fill: c.sub, anchor: anc });
    out.push(<g key="dt">{dt.el}</g>);
    const bottomFill = foilish || c.flat ? c.ink : c.ink;
    if (foilish) out.push(<g key="brb">{block({ text: data.brand, x: sb.cx, y: H - 14 * k, maxW: sb.w * 0.8, size: 3.8 * k, maxLines: 1, ts: { ...bodyB, ls: 1 * k }, fill: c.ink, upper: true }).el}</g>);
    else out.push(<g key="sl">{block({ text: data.slogan, x: sb.x1, y: H - 13 * k, maxW: sb.w * 0.7, size: 4 * k, maxLines: 1, ts: bodyB, fill: bottomFill, anchor: 'end' }).el}</g>);
  } else if (spec.layout === 'school') {
    const topH = H * 0.44;
    if (!c.flat) {
      out.push(<rect key="top" x={X0} y={Y0} width={FW} height={topH - Y0} fill={c.accent} />);
      out.push(<path key="wave" d={`M${X0} ${topH} C ${W * 0.3} ${topH + 10 * k}, ${W * 0.62} ${topH - 8 * k}, ${W + ext.r} ${topH + 4 * k} L${W + ext.r} ${topH} L${X0} ${topH - 0.01} Z`} fill={c.accent} />);
      // chấm sao trang trí
      for (let i = 0; i < 9; i++) out.push(<circle key={`st${i}`} cx={sb.x0 + ((i * 37) % 100) / 100 * sb.w} cy={sb.y0 + ((i * 53) % 100) / 100 * (topH - sb.y0 - 12 * k)} r={0.7 * k} fill={c.onAccent} opacity={0.5} />);
    } else {
      out.push(<rect key="frame" x={sb.x0 - 2 * k} y={sb.y0} width={sb.w + 4 * k} height={sb.h} fill="none" stroke={c.ink} strokeWidth={0.6} />);
    }
    const onTop = c.flat ? c.ink : c.onAccent;
    // khiên huy hiệu
    const cs = 30 * k, ccx = sb.cx, ccy = sb.y0 + 16 * k;
    out.push(
      <g key="crest" transform={`translate(${ccx} ${ccy})`}>
        <path d={`M${-cs / 2} ${-cs * 0.42} L${cs / 2} ${-cs * 0.42} L${cs / 2} ${cs * 0.05} C ${cs / 2} ${cs * 0.35}, ${cs * 0.2} ${cs * 0.5}, 0 ${cs * 0.6} C ${-cs * 0.2} ${cs * 0.5}, ${-cs / 2} ${cs * 0.35}, ${-cs / 2} ${cs * 0.05} Z`} fill="none" stroke={c.flat ? c.ink : c.accent2} strokeWidth={1.1 * k} />
      </g>,
    );
    out.push(<Logo key="lg" p={p} cx={ccx} cy={ccy + 1 * k} size={18 * k} color={onTop} ring={false} />);
    const b = block({ text: data.brand, x: sb.cx, y: ccy + cs * 0.6 + 9 * k, maxW: sb.w * 0.92, size: 6 * k, maxLines: 2, ts: { ...bodyB, ls: 0.5 * k }, fill: onTop, upper: true });
    out.push(<g key="b">{b.el}</g>);
    const ty = Math.max(topH + 22 * k, b.last + 18 * k);
    const t = block({ text: data.title, x: sb.cx, y: ty, maxW: sb.w * 0.92, size: 11 * k, maxLines: 2, lh: 1.05, ts: disp, fill: c.flat ? c.ink : c.ink, upper: true });
    out.push(<g key="t">{t.el}</g>);
    const lb = block({ text: data.label, x: sb.cx, y: t.last + 9 * k, maxW: sb.w * 0.8, size: 4.4 * k, maxLines: 1, ts: body, fill: c.flat ? c.ink : c.accent });
    out.push(<g key="lb">{lb.el}</g>);
    // ô điền tên / lớp
    const fy = Math.max(lb.last + 16 * k, H - 44 * k);
    const lineCol = c.flat ? c.ink : c.sub;
    [['Họ và tên', 0], ['Lớp', 1]].forEach(([lab, i]) => {
      const yy = fy + (i as number) * 12 * k;
      out.push(<text key={`fl${i}`} x={sb.x0 + 4 * k} y={yy} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={3.6 * k} fill={lineCol}>{lab as string}:</text>);
      out.push(<line key={`fd${i}`} x1={sb.x0 + 4 * k + textW(`${lab}:`, 3.6 * k, body) + 2 * k} x2={sb.x1 - 4 * k} y1={yy + 0.6 * k} y2={yy + 0.6 * k} stroke={lineCol} strokeWidth={0.35 * k} strokeDasharray={`${0.6 * k} ${1 * k}`} />);
    });
    out.push(<g key="sl">{block({ text: data.slogan, x: sb.cx, y: H - 12 * k, maxW: sb.w * 0.9, size: 3.4 * k, maxLines: 1, ts: body, fill: c.flat ? c.ink : c.sub }).el}</g>);
  } else if (spec.layout === 'pattern') {
    if (!foilish) out.push(<g key="pt" opacity={c.flat ? 0.9 : 1}>{truchet(X0, Y0, FW, FH, 14 * k, c.flat ? c.ink : c.accent, c.flat ? 0.8 * k : 1.6 * k, 11)}</g>);
    const cw = Math.min(sb.w * 0.84, 100 * k), chh = 64 * k;
    const cx0 = sb.cx - cw / 2, cy0 = H * 0.5 - chh / 2;
    out.push(<rect key="card" x={cx0} y={cy0} width={cw} height={chh} rx={2.5 * k} fill={c.flat ? (c.bg || 'none') : c.bg || '#fff'} stroke={c.flat ? c.ink : c.accent} strokeWidth={c.flat ? 0.6 * k : 0.9 * k} />);
    if (c.flat && !c.bg) out.push(<rect key="cardw" x={cx0 + 0.3} y={cy0 + 0.3} width={cw - 0.6} height={chh - 0.6} rx={2.3 * k} fill="none" stroke={c.ink} strokeWidth={0.3 * k} />);
    out.push(<Logo key="lg" p={p} cx={sb.cx} cy={cy0 + 13 * k} size={12 * k} color={c.flat ? c.ink : c.accent} />);
    const t = block({ text: data.title, x: sb.cx, y: cy0 + 34 * k, maxW: cw * 0.86, size: 12 * k, maxLines: 1, ts: disp, fill: c.ink });
    out.push(<g key="t">{t.el}</g>);
    out.push(<g key="lb">{block({ text: data.label, x: sb.cx, y: t.last + 8 * k, maxW: cw * 0.8, size: 3.6 * k, maxLines: 1, ts: body, fill: c.sub }).el}</g>);
    out.push(<g key="b">{block({ text: data.brand, x: sb.cx, y: cy0 + chh - 6 * k, maxW: cw * 0.8, size: 3.2 * k, maxLines: 1, ts: { ...bodyB, ls: 1 * k }, fill: c.flat ? c.ink : c.accent, upper: true }).el}</g>);
  } else if (spec.layout === 'tet') {
    const gold = c.accent;
    out.push(<g key="m1">{maiBranch(W + 2 * k, sb.y0 - 4 * k, 1.05 * k, false, gold, foilish ? gold : c.onAccent, foilish ? gold : shade(c.accent, -0.35), foilish)}</g>);
    out.push(<g key="m2">{maiBranch(sb.x0 - 4 * k, H - 8 * k, 0.8 * k, true, gold, foilish ? gold : c.onAccent, foilish ? gold : shade(c.accent, -0.35), foilish)}</g>);
    if (!foilish) out.push(<rect key="fr" x={sb.x0 + 2 * k} y={sb.y0 + 2 * k} width={sb.w - 4 * k} height={sb.h - 4 * k} fill="none" stroke={gold} strokeWidth={0.5 * k} opacity={0.7} />);
    out.push(<Logo key="lg" p={p} cx={sb.cx} cy={H * 0.28} size={22 * k} color={gold} />);
    const t = block({ text: data.title, x: sb.cx, y: H * 0.44, maxW: sb.w * 0.86, size: 10 * k, maxLines: 2, ts: { ...disp, ls: 0.8 * k }, fill: c.ink, upper: true });
    out.push(<g key="t">{t.el}</g>);
    const yr = block({ text: data.label, x: sb.cx, y: t.last + 24 * k, maxW: sb.w * 0.8, size: 22 * k, maxLines: 1, ts: disp, fill: gold });
    out.push(<g key="yr">{yr.el}</g>);
    out.push(<g key="sl">{block({ text: data.slogan, x: sb.cx, y: yr.last + 11 * k, maxW: sb.w * 0.84, size: 4.6 * k, maxLines: 2, ts: { fam: 'Cormorant Garamond', wt: 700 }, fill: c.ink }).el}</g>);
    out.push(<g key="b">{block({ text: data.brand, x: sb.cx, y: H - 16 * k, maxW: sb.w * 0.8, size: 3.8 * k, maxLines: 1, ts: { ...bodyB, ls: 1.2 * k }, fill: gold, upper: true }).el}</g>);
  } else if (spec.layout === 'minimal') {
    out.push(<Logo key="lg" p={p} cx={sb.cx} cy={H * 0.4} size={30 * k} color={c.accent} />);
    const b = block({ text: data.brand, x: sb.cx, y: H * 0.4 + 15 * k + 11 * k, maxW: sb.w * 0.86, size: 6.4 * k, maxLines: 2, ts: { ...disp, ls: 1 * k }, fill: c.ink, upper: true });
    out.push(<g key="b">{b.el}</g>);
    out.push(<rect key="dv" x={sb.cx - 9 * k} y={b.last + 5 * k} width={18 * k} height={0.5 * k} fill={c.accent} />);
    out.push(<g key="s">{block({ text: data.slogan, x: sb.cx, y: b.last + 12 * k, maxW: sb.w * 0.8, size: 3.6 * k, maxLines: 1, ts: { ...body, ls: 0.6 * k }, fill: c.sub }).el}</g>);
    if (spec.kind === 'kraft') out.push(<g key="t">{block({ text: data.title, x: sb.cx, y: H - 14 * k, maxW: sb.w * 0.8, size: 3.6 * k, maxLines: 1, ts: { ...bodyB, ls: 1.6 * k }, fill: c.ink, upper: true }).el}</g>);
  } else { // corner: viền mảnh + logo góc dưới phải
    const ins = 7 * k;
    out.push(<rect key="fr" x={sb.x0 - 2 * k + ins * 0.2} y={ins} width={W - (sb.x0 - 2 * k + ins * 0.2) - ins} height={H - ins * 2} rx={1.5 * k} fill="none" stroke={c.accent} strokeWidth={0.6 * k} />);
    out.push(<rect key="fr2" x={sb.x0 - 2 * k + ins * 0.2 + 1.6 * k} y={ins + 1.6 * k} width={W - (sb.x0 - 2 * k + ins * 0.2) - ins - 3.2 * k} height={H - ins * 2 - 3.2 * k} rx={1 * k} fill="none" stroke={c.accent} strokeWidth={0.25 * k} />);
    const ct = block({ text: data.title, x: sb.cx, y: H * 0.42, maxW: sb.w * 0.8, size: 9 * k, maxLines: 2, ts: { ...disp, ls: 2.4 * k }, fill: c.ink, upper: true });
    out.push(<g key="t">{ct.el}</g>);
    out.push(<g key="lb">{block({ text: data.label, x: sb.cx, y: ct.last + 9 * k, maxW: sb.w * 0.7, size: 3.4 * k, maxLines: 1, ts: { ...body, ls: 0.8 * k }, fill: c.sub }).el}</g>);
    const lx = sb.x1 - 12 * k, ly = H - 24 * k;
    out.push(<Logo key="lg" p={p} cx={lx} cy={ly} size={14 * k} color={c.accent} />);
    out.push(<g key="b">{block({ text: data.brand, x: lx + 7 * k, y: ly + 13 * k, maxW: sb.w * 0.7, size: 3.2 * k, maxLines: 1, ts: { ...bodyB, ls: 1 * k }, fill: c.ink, anchor: 'end', upper: true }).el}</g>);
  }
  return <g data-face="front">{out}</g>;
}

function BackPanel(p: PanelCtx): ReactNode {
  const { W, H, ext, spec, data, c } = p;
  const k = W / 148;
  const sb = safeBox(p, 'back');
  const X0 = -ext.l, Y0 = -ext.t, FW = W + ext.l + ext.r, FH = H + ext.t + ext.b;
  const body: TS = { fam: BODY, wt: 600 };
  const out: ReactNode[] = [];
  if (c.bg) out.push(<rect key="bg" x={X0} y={Y0} width={FW} height={FH} fill={c.bg} />);
  if (spec.kind === 'leather') return <g data-face="back">{out}</g>; // da: mặt sau trơn (chỉ ép mặt trước)
  if (spec.layout === 'pattern' && !c.flat) out.push(<g key="pt" opacity={0.35}>{truchet(X0, Y0, FW, FH, 14 * k, c.accent, 1.2 * k, 11)}</g>);
  if (spec.layout === 'corporate' && !c.flat) out.push(<rect key="band" x={X0} y={H - 30 * k} width={FW} height={30 * k + ext.b} fill={c.accent2} />);
  if (spec.layout === 'school' && !c.flat) out.push(<rect key="band" x={X0} y={H - 22 * k} width={FW} height={22 * k + ext.b} fill={c.accent} />);
  out.push(<Logo key="lg" p={p} cx={sb.cx} cy={H * 0.62} size={14 * k} color={c.flat ? c.ink : c.accent} />);
  out.push(<g key="b">{block({ text: data.brand, x: sb.cx, y: H * 0.62 + 14 * k, maxW: sb.w * 0.8, size: 3.6 * k, maxLines: 2, ts: { fam: BODY, wt: 800, ls: 0.8 * k }, fill: c.ink, upper: true }).el}</g>);
  const foot = [data.website, data.phone].filter(Boolean).join('  ·  ');
  const onBand = (spec.layout === 'corporate' || spec.layout === 'school') && !c.flat;
  out.push(<g key="f">{block({ text: foot, x: sb.cx, y: H - 12 * k, maxW: sb.w * 0.9, size: 3 * k, maxLines: 1, ts: body, fill: onBand ? (spec.layout === 'school' ? c.onAccent : c.ink) : c.sub }).el}</g>);
  return <g data-face="back">{out}</g>;
}

let uidN = 0;
const useUid = () => { const [u] = useState(() => `nb${++uidN}`); return u; };

export interface NBCommon { spec: NBSpec; data: NBData; logo: NBLogo | null; mode?: NBMode; style?: CSSProperties }

/** 1 mặt bìa (trước/sau) — lò xo: ext = lề gập 15mm khi in; view: ext 0 + vạch lỗ lò xo mờ */
export function CoverSvg({ spec, data, logo, mode = 'color', face = 'front', ext = 0, holes = false, style }: NBCommon & { face?: 'front' | 'back'; ext?: number; holes?: boolean }) {
  const uid = useUid();
  const sz = nbSize(spec.size);
  const W = sz.wMm, H = sz.hMm;
  const e: Ext = { l: ext, r: ext, t: ext, b: ext };
  const p: PanelCtx = { W, H, ext: e, spec, data, logo, c: colorsFor(spec, mode), uid, mode };
  const holeMarks: ReactNode[] = [];
  if (holes && spec.kind === 'wire') {
    const along = spec.bind === 'top' ? W : H, n = Math.floor((along - 10) / 8.47);
    for (let i = 0; i < n; i++) {
      const t = along / 2 + (i - (n - 1) / 2) * 8.47;
      const x = spec.bind === 'top' ? t - 2 : face === 'front' ? 3.5 : W - 6.5, y = spec.bind === 'top' ? 3.5 : t - 2;
      holeMarks.push(<rect key={i} x={x} y={y} width={spec.bind === 'top' ? 4 : 3} height={spec.bind === 'top' ? 3 : 4} rx={0.6} fill="#000" opacity={0.28} />);
    }
  }
  return (
    <svg viewBox={`${-ext} ${-ext} ${W + ext * 2} ${H + ext * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-nb={`cover-${face}`}>
      {face === 'front' ? FrontPanel(p) : BackPanel(p)}
      {holeMarks}
    </svg>
  );
}

/** trải bìa: mặt sau | gáy | mặt trước (kraft + da) — bleed = lề xén */
export function SpreadSvg({ spec, data, logo, mode = 'color', bleed = 0, frontOnly = false, style }: NBCommon & { bleed?: number; frontOnly?: boolean }) {
  const uid = useUid();
  const sz = nbSize(spec.size);
  const W = sz.wMm, H = sz.hMm, sp = SPINE_MM[spec.kind];
  const c = colorsFor(spec, mode);
  const total = W * 2 + sp;
  const back: PanelCtx = { W, H, ext: { l: bleed, r: sp / 2, t: bleed, b: bleed }, spec, data, logo, c, uid: `${uid}b`, mode };
  const front: PanelCtx = { W, H, ext: { l: sp / 2, r: bleed, t: bleed, b: bleed }, spec, data, logo, c, uid: `${uid}f`, mode };
  if (frontOnly) {
    const fp: PanelCtx = { ...front, ext: { l: bleed, r: bleed, t: bleed, b: bleed } };
    return <svg viewBox={`${-bleed} ${-bleed} ${W + bleed * 2} ${H + bleed * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-nb="mask">{c.bg && <rect x={-bleed} y={-bleed} width={W + bleed * 2} height={H + bleed * 2} fill={c.bg} />}{FrontPanel(fp)}</svg>;
  }
  const f = nbFont(spec.font);
  return (
    <svg viewBox={`${-bleed} ${-bleed} ${total + bleed * 2} ${H + bleed * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-nb="spread">
      {c.bg && <rect x={-bleed} y={-bleed} width={total + bleed * 2} height={H + bleed * 2} fill={c.bg} />}
      <g>{BackPanel(back)}</g>
      <g transform={`translate(${W + sp} 0)`}>{FrontPanel(front)}</g>
      {sp >= 10 && spec.kind !== 'leather' && (
        <text transform={`translate(${W + sp / 2 + 1.2} ${H / 2}) rotate(90)`} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={3.4} fill={c.ink}>{(data.brand || '').toUpperCase()}</text>
      )}
    </svg>
  );
}

/** trang ruột: kẻ ngang / chấm / ô ly / trơn + đầu trang có logo; side = trang trái/phải (lề gáy) */
export function InnerSvg({ spec, data, logo, bleed = 0, side = 'right', style }: NBCommon & { bleed?: number; side?: 'left' | 'right' }) {
  const uid = useUid();
  const sz = nbSize(spec.size);
  const W = sz.wMm, H = sz.hMm, k = W / 148;
  const p = spec.kind === 'leather' ? null : nbPalette(spec.palette);
  const accent = spec.kind === 'leather' ? shade(nbLeather(spec.leather).color, 0.15) : p!.kraft ? p!.ink : p!.accent2 === p!.bg ? p!.accent : (p!.id === 'sky' || p!.id === 'coral' || p!.id === 'sage' ? p!.accent : p!.bg);
  const rule = '#AEB9C8', dot = '#98A4B5';
  const bindTop = spec.kind === 'wire' && spec.bind === 'top';
  const gut = spec.kind === 'wire' ? (bindTop ? 8 : 14) : 12, m = 9 * k;
  const x0 = bindTop ? m : side === 'right' ? gut : m, x1 = bindTop ? W - m : side === 'right' ? W - m : W - gut;
  const y0 = (bindTop ? 14 : 0) + 22 * k, y1 = H - 13 * k;
  const step = spec.rule === 'lined' ? 7 : 5;
  const els: ReactNode[] = [];
  if (spec.rule === 'lined') for (let y = y0 + step; y <= y1; y += step) els.push(<line key={y} x1={x0} x2={x1} y1={y} y2={y} stroke={rule} strokeWidth={0.3} />);
  if (spec.rule === 'grid') {
    for (let y = y0; y <= y1 + 0.01; y += step) els.push(<line key={`h${y}`} x1={x0} x2={x0 + Math.floor((x1 - x0) / step) * step} y1={y} y2={y} stroke={rule} strokeWidth={0.18} />);
    const gy1 = y0 + Math.floor((y1 - y0) / step) * step;
    for (let x = x0; x <= x1 + 0.01; x += step) els.push(<line key={`v${x}`} x1={x} x2={x} y1={y0} y2={gy1} stroke={rule} strokeWidth={0.18} />);
  }
  if (spec.rule === 'dot') {
    let d = '';
    for (let y = y0; y <= y1; y += step) for (let x = x0; x <= x1; x += step) d += `M${x} ${y}h0`;
    els.push(<path key="dots" d={d} stroke={dot} strokeWidth={0.55} strokeLinecap="round" />);
  }
  const ctx: PanelCtx = { W, H, ext: { l: 0, r: 0, t: 0, b: 0 }, spec: { ...spec, logoMono: true }, data, logo, c: { bg: null, ink: accent, sub: accent, accent, accent2: accent, onAccent: '#fff', rule: accent, flat: true }, uid, mode: 'color' };
  const hy = (bindTop ? 14 : 0) + 12 * k;
  const dateTxt = 'Ngày ……/……/……';
  return (
    <svg viewBox={`${-bleed} ${-bleed} ${W + bleed * 2} ${H + bleed * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-nb={`inner-${side}`}>
      <rect x={-bleed} y={-bleed} width={W + bleed * 2} height={H + bleed * 2} fill={spec.kind === 'kraft' ? '#FBF7EE' : '#FFFFFF'} />
      <Logo p={ctx} cx={x0 + 3.4 * k} cy={hy - 1.3 * k} size={7 * k} color={accent} />
      {block({ text: data.brand, x: x0 + 8.5 * k, y: hy, maxW: (x1 - x0) * 0.5, size: 2.8 * k, maxLines: 1, ts: { fam: BODY, wt: 800, ls: 0.4 * k }, fill: accent, anchor: 'start', upper: true }).el}
      <text x={x1} y={hy} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={2.8 * k} fill="#8A94A3">{dateTxt}</text>
      <line x1={x0} x2={x1} y1={hy + 4 * k} y2={hy + 4 * k} stroke={accent} strokeWidth={0.4} />
      {els}
      {block({ text: data.website, x: (x0 + x1) / 2, y: H - 6 * k, maxW: (x1 - x0) * 0.6, size: 2.4 * k, maxLines: 1, ts: { fam: BODY, wt: 600 }, fill: '#9AA3B0' }).el}
    </svg>
  );
}

// ---------- PDF nhiều trang khác khổ (bìa + khuôn ép + ruột) ----------
const MM_PER_IN = 25.4;
export interface NBPdfPage { el: SVGSVGElement; trim: { wMm: number; hMm: number }; bleed: number; dpi?: number }
export async function nbPdf(pages: NBPdfPage[], fontCss: string): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (const pg of pages) {
    const { pageW, pageH } = printPageDims(pg.trim, pg.bleed);
    const orientation = pageW >= pageH ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation, compress: true });
    else pdf.addPage([pageW, pageH], orientation);
    const dpi = pg.dpi || 300;
    const wMm = pg.trim.wMm + pg.bleed * 2, hMm = pg.trim.hMm + pg.bleed * 2;
    const outW = Math.round((wMm / MM_PER_IN) * dpi), outH = Math.round((hMm / MM_PER_IN) * dpi);
    const c = await svgToCanvas(await selfContainedSvg(pg.el, fontCss, { outline: true }), outW, outH, '#ffffff');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawPrintPage(pdf as any, c.toDataURL('image/png'), outW, outH, pg.trim, pg.bleed);
  }
  return pdf!.output('blob');
}
