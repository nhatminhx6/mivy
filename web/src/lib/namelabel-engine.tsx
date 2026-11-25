'use client';
// Nhãn tên học sinh: 1 tờ A4 decal kiss-cut trộn nhiều cỡ nhãn — nhãn lớn 60×25 (vở, sách), nhãn vừa 45×15
// (hộp bút, bình nước), nhãn mini 30×10 (bút chì), nhãn tròn Ø25 (ảnh/hình + tên), cặp nhãn giày Trái/Phải
// (hình ghép nửa–nửa). CHỦ ĐỀ dễ thương vẽ 100% bằng code (khủng long, kỳ lân, xe hơi, tàu vũ trụ…) — KHÔNG dùng
// nhân vật có bản quyền. Nhiều bé → mỗi bé 1 tờ. Đơn vị vẽ = mm (viewBox 210×297).
// File in: lớp In (nền tràn 1mm) + CutContour (đường bế kiss-cut từng nhãn, spot Magenta).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export const NL_SHEET = { wMm: 210, hMm: 297 };
export const NL_BLEED = 1;
export const CUTCONTOUR = '#EC008C';

// ---------- chủ đề ----------
export type NlThemeId = 'dino' | 'unicorn' | 'car' | 'rocket' | 'cat' | 'bear' | 'flower' | 'hero' | 'whale' | 'rainbow' | 'soccer' | 'crown';
export type NlPattern = 'dots' | 'stars' | 'waves' | 'hearts' | 'confetti' | 'grid';
export interface NlTheme { id: NlThemeId; name: string; accent: string; accent2: string; soft: string; ink: string; pattern: NlPattern }
export const NL_THEMES: NlTheme[] = [
  { id: 'dino', name: 'Khủng long', accent: '#3FA34D', accent2: '#F7C948', soft: '#E6F5E3', ink: '#1F4A27', pattern: 'dots' },
  { id: 'unicorn', name: 'Kỳ lân', accent: '#A86FD6', accent2: '#FF8FC0', soft: '#F6ECFB', ink: '#4B2A63', pattern: 'stars' },
  { id: 'car', name: 'Xe hơi', accent: '#E63946', accent2: '#1D7FD8', soft: '#FDECEC', ink: '#4A1418', pattern: 'grid' },
  { id: 'rocket', name: 'Tàu vũ trụ', accent: '#23356B', accent2: '#FF8A3D', soft: '#E6EBF7', ink: '#18224A', pattern: 'stars' },
  { id: 'cat', name: 'Mèo con', accent: '#F28C28', accent2: '#7A4A26', soft: '#FFF1E0', ink: '#5B3A1E', pattern: 'hearts' },
  { id: 'bear', name: 'Gấu nâu', accent: '#9C6B43', accent2: '#F2C14E', soft: '#F5EADF', ink: '#4A2E1B', pattern: 'dots' },
  { id: 'flower', name: 'Vườn hoa', accent: '#E85D9E', accent2: '#FFC94A', soft: '#FDEAF3', ink: '#6A1F45', pattern: 'confetti' },
  { id: 'hero', name: 'Siêu anh hùng', accent: '#1D4ED8', accent2: '#EF4444', soft: '#E6EEFF', ink: '#0F2167', pattern: 'stars' },
  { id: 'whale', name: 'Cá voi biển', accent: '#2A9DD8', accent2: '#FFB703', soft: '#E3F4FC', ink: '#0D3B5C', pattern: 'waves' },
  { id: 'rainbow', name: 'Cầu vồng', accent: '#7C5CE0', accent2: '#FFB703', soft: '#F1EDFD', ink: '#33236B', pattern: 'confetti' },
  { id: 'soccer', name: 'Bóng đá', accent: '#2E7D32', accent2: '#F7C948', soft: '#E7F3E8', ink: '#173D19', pattern: 'grid' },
  { id: 'crown', name: 'Vương miện', accent: '#C2185B', accent2: '#F4B400', soft: '#FCE8F0', ink: '#5B0B2C', pattern: 'hearts' },
];
export const nlTheme = (id: string) => NL_THEMES.find((t) => t.id === id) || NL_THEMES[0];

// ---------- font ----------
export interface NlFont { id: string; name: string; family: string; weight: number }
export const NL_FONTS: NlFont[] = [
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'lobster', name: 'Lobster (bay)', family: 'Lobster', weight: 400 },
  { id: 'bungee', name: 'Bungee (khối)', family: 'Bungee', weight: 400 },
  { id: 'dancing', name: 'Dancing (viết tay)', family: 'Dancing Script', weight: 700 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
];
export const nlFont = (id: string) => NL_FONTS.find((f) => f.id === id) || NL_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const NL_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Lobster&family=Bungee&family=Dancing+Script:wght@700&family=Montserrat:wght@800&family=Be+Vietnam+Pro:wght@600;800&display=swap');`;

export function useNlFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-nl-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-nl-fonts'; link.rel = 'stylesheet';
        link.href = NL_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Baloo 2"', '400 40px "Lobster"', '400 40px "Bungee"', '700 40px "Dancing Script"', '800 40px "Montserrat"', '600 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec / bé / mẫu ----------
export type NlStyle = 'solid' | 'light';
export interface NlSpec { theme: NlThemeId; font: string; style: NlStyle; showSchool: boolean; showPhone: boolean }
export interface NlKid { name: string; cls: string; school: string; phone: string }
export interface NlTemplate { id: string; name: string; spec: Pick<NlSpec, 'theme' | 'font' | 'style'> }
const T = (theme: NlThemeId, font: string, style: NlStyle): NlTemplate => ({ id: `${theme}-${style}`, name: `${nlTheme(theme).name}${style === 'light' ? ' · nền nhạt' : ''}`, spec: { theme, font, style } });
export const NL_TEMPLATES: NlTemplate[] = [
  T('dino', 'baloo', 'solid'), T('unicorn', 'lobster', 'light'), T('car', 'bungee', 'solid'), T('rocket', 'baloo', 'solid'),
  T('cat', 'baloo', 'light'), T('bear', 'dancing', 'light'), T('flower', 'lobster', 'solid'), T('hero', 'bungee', 'solid'),
  T('whale', 'baloo', 'light'), T('rainbow', 'baloo', 'solid'), T('soccer', 'montserrat', 'solid'), T('crown', 'dancing', 'light'),
];
export const defaultNlSpec = (): NlSpec => ({ ...NL_TEMPLATES[0].spec, showSchool: true, showPhone: true });
export const defaultNlKid = (): NlKid => ({ name: 'Gia Khánh', cls: 'Lớp 2A', school: 'TH An Khang', phone: '0909 123 456' });

/** "Tên | Lớp | Trường | SĐT" mỗi dòng 1 bé; ô thiếu lấy từ thông tin chung */
export function parseKids(text: string, base: NlKid): NlKid[] {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 40).map((l) => {
    const [name, cls, school, phone] = l.split('|').map((s) => s.trim());
    return { name: name || base.name, cls: cls || base.cls, school: school || base.school, phone: phone || base.phone };
  });
}

// ---------- vị trí nhãn trên tờ A4 ----------
export type NlType = 'big' | 'medium' | 'round' | 'mini' | 'shoe';
export interface NlSlot { id: string; type: NlType; x: number; y: number; w: number; h: number; side?: 'L' | 'R' }
export const NL_TYPE_NAME: Record<NlType, string> = { big: 'Nhãn lớn 60×25 (vở, sách)', medium: 'Nhãn vừa 45×15 (hộp bút, bình nước)', round: 'Nhãn tròn Ø25 (ảnh + tên)', mini: 'Nhãn mini 30×10 (bút chì)', shoe: 'Nhãn giày Trái/Phải 32×30' };
function makeSlots(): NlSlot[] {
  const out: NlSlot[] = [];
  const grid = (type: NlType, cols: number, rows: number, w: number, h: number, gx: number, gy: number, y0: number) => {
    const x0 = (NL_SHEET.wMm - (cols * w + (cols - 1) * gx)) / 2;
    let n = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push({ id: `${type}${n++}`, type, x: x0 + c * (w + gx), y: y0 + r * (h + gy), w, h });
  };
  grid('big', 3, 2, 60, 25, 5, 5, 24);
  grid('medium', 4, 3, 45, 15, 5, 4, 86);
  grid('round', 7, 2, 25, 25, 4, 4, 146);
  grid('mini', 6, 3, 30, 10, 4, 4, 207);
  // 2 cặp nhãn giày: mỗi cặp 2 nhãn 32×30 cách 3mm, 2 cặp cách 20mm
  const pw = 32 * 2 + 3, x0 = (NL_SHEET.wMm - (pw * 2 + 20)) / 2;
  for (let p = 0; p < 2; p++) {
    out.push({ id: `shoe${p * 2}`, type: 'shoe', x: x0 + p * (pw + 20), y: 252, w: 32, h: 30, side: 'L' });
    out.push({ id: `shoe${p * 2 + 1}`, type: 'shoe', x: x0 + p * (pw + 20) + 35, y: 252, w: 32, h: 30, side: 'R' });
  }
  return out;
}
export const NL_SLOTS = makeSlots();
export const NL_COUNT = NL_SLOTS.length;
const RADIUS: Record<NlType, number> = { big: 4, medium: 3, round: 12.5, mini: 2.5, shoe: 4.5 };

const rrPath = (x: number, y: number, w: number, h: number, r: number) =>
  `M${f2(x + r)} ${f2(y)}H${f2(x + w - r)}A${r} ${r} 0 0 1 ${f2(x + w)} ${f2(y + r)}V${f2(y + h - r)}A${r} ${r} 0 0 1 ${f2(x + w - r)} ${f2(y + h)}H${f2(x + r)}A${r} ${r} 0 0 1 ${f2(x)} ${f2(y + h - r)}V${f2(y + r)}A${r} ${r} 0 0 1 ${f2(x + r)} ${f2(y)}Z`;
const circPath = (cx: number, cy: number, r: number) => `M${f2(cx - r)} ${f2(cy)}A${r} ${r} 0 1 1 ${f2(cx + r)} ${f2(cy)}A${r} ${r} 0 1 1 ${f2(cx - r)} ${f2(cy)}Z`;
/** đường bế của 1 nhãn (toạ độ tờ), nới thêm `grow` mm (lề tràn) */
export function slotPath(s: NlSlot, grow = 0): string {
  if (s.type === 'round') return circPath(s.x + s.w / 2, s.y + s.h / 2, s.w / 2 + grow);
  return rrPath(s.x - grow, s.y - grow, s.w + grow * 2, s.h + grow * 2, RADIUS[s.type] + grow);
}
function f2(n: number) { return Math.round(n * 100) / 100; }

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
const metricCache = new Map<string, { asc: number; desc: number }>();
function ctx() {
  if (typeof document === 'undefined') return null;
  mctx ??= document.createElement('canvas').getContext('2d');
  return mctx;
}
function textW(text: string, family: string, weight: number): number {
  const c = ctx(); if (!c) return text.length * 0.55;
  c.font = `${weight} 100px "${family}"`;
  return c.measureText(text).width / 100;
}
/** ascent/descent của font (đơn vị = cỡ chữ) — đúng như hộp getBBox của SVG */
function fontMetrics(family: string, weight: number) {
  const k = `${family}|${weight}`;
  const hit = metricCache.get(k); if (hit) return hit;
  const c = ctx();
  let asc = 0.95, desc = 0.28;
  if (c) {
    c.font = `${weight} 100px "${family}"`;
    const m = c.measureText('ẮỘg');
    if (m.fontBoundingBoxAscent) { asc = m.fontBoundingBoxAscent / 100; desc = m.fontBoundingBoxDescent / 100; }
  }
  const v = { asc, desc };
  if (typeof document !== 'undefined' && document.fonts?.check(`${weight} 20px "${family}"`)) metricCache.set(k, v);
  return v;
}
interface Line { text: string; family: string; weight: number; size: number; fill: string; opacity?: number }
/** cỡ lớn nhất ≤ max để vừa `w` */
const fitSize = (text: string, family: string, weight: number, w: number, max: number) => Math.min(max, w / Math.max(0.01, textW(text, family, weight)));
/** tên: 1 dòng nếu đủ to, không thì 2 dòng cân (tách theo khoảng trắng) */
function nameLines(text: string, family: string, weight: number, w: number, max: number, min: number, hMax: number): string[] {
  const t = text.trim() || ' ';
  const s1 = fitSize(t, family, weight, w, max);
  const words = t.split(/\s+/);
  if (s1 >= min * 1.15 || words.length < 2) return [t];
  let best: string[] = [t], bestS = s1;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const s = Math.min(fitSize(a, family, weight, w, max), fitSize(b, family, weight, w, max));
    const m = fontMetrics(family, weight);
    const s2 = Math.min(s, hMax / ((m.asc + m.desc) * 2 + 0.05));
    if (s2 > bestS) { bestS = s2; best = [a, b]; }
  }
  return best;
}
/** xếp chồng các dòng, căn giữa theo chiều dọc trong [y0,y1]; trả về baseline từng dòng */
function stack(lines: Line[], y0: number, y1: number, gap: number): number[] {
  const hs = lines.map((l) => { const m = fontMetrics(l.family, l.weight); return { asc: m.asc * l.size, h: (m.asc + m.desc) * l.size }; });
  const total = hs.reduce((a, b) => a + b.h, 0) + gap * (lines.length - 1);
  let y = y0 + (y1 - y0 - total) / 2;
  return hs.map((h) => { const b = y + h.asc; y += h.h + gap; return b; });
}
/** thu nhỏ đều mọi dòng cho tới khi tổng cao vừa `hAvail` */
function shrinkToHeight(lines: Line[], hAvail: number, gap: number) {
  const total = () => lines.reduce((a, l) => { const m = fontMetrics(l.family, l.weight); return a + (m.asc + m.desc) * l.size; }, 0) + gap * (lines.length - 1);
  let t = total();
  if (t > hAvail) { const k = (hAvail - gap * (lines.length - 1)) / (t - gap * (lines.length - 1)); for (const l of lines) l.size *= k; t = total(); }
}

const lineH = (l: Line) => { const m = fontMetrics(l.family, l.weight); return (m.asc + m.desc) * l.size; };
/** tên vừa ô (rộng w, cao hMax): 1 dòng → 2 dòng cân → (nhãn nhỏ) tên gọi = 2 chữ cuối nếu vẫn nhỏ hơn min */
function fitName(name: string, family: string, weight: number, w: number, max: number, hMax: number, min: number, oneLine = false): { lines: string[]; size: number } {
  const m = fontMetrics(family, weight), lh = m.asc + m.desc, gap = 0.2;
  const tryText = (t: string) => {
    const lines = oneLine ? [t] : nameLines(t, family, weight, w, max, min, hMax);
    let size = Math.min(...lines.map((x) => fitSize(x, family, weight, w, max)));
    const need = lines.length * lh * size + gap * (lines.length - 1);
    if (need > hMax) size *= (hMax - gap * (lines.length - 1)) / (lines.length * lh * size);
    return { lines, size };
  };
  let r = tryText((name || ' ').trim() || ' ');
  const words = (name || '').trim().split(/\s+/);
  if (r.size < min && words.length > 2) {
    const r2 = tryText(words.slice(-2).join(' '));
    if (r2.size > r.size) r = r2;
  }
  return r;
}
/** dòng phụ: co tới min, vẫn dài thì cắt "…" */
function fitInfo(text: string, family: string, weight: number, w: number, max: number, min: number): { text: string; size: number } | null {
  const t = (text || '').trim(); if (!t) return null;
  const s = fitSize(t, family, weight, w, max);
  if (s >= min) return { text: t, size: s };
  let cut = t;
  while (cut.length > 1 && fitSize(cut + '…', family, weight, w, max) < min) cut = cut.slice(0, -1);
  return { text: cut.trimEnd() + '…', size: min };
}

// ---------- hình minh hoạ (vẽ trong ô −10..10, tâm 0) ----------
export function ThemeIcon({ theme, cx, cy, r, half }: { theme: NlTheme; cx: number; cy: number; r: number; half?: boolean }) {
  const a = theme.accent, b = theme.accent2, ink = theme.ink;
  const k = r / 10;
  let body: ReactNode;
  switch (theme.id) {
    case 'dino':
      body = (<>
        <path d="M-1.5 -1.2 L0 -4 L1.6 -1.6 L3.2 -4 L4.8 -1.3 L6.3 -3.2 L7.2 -0.2Z" fill={b} />
        <ellipse cx={1.6} cy={2.6} rx={6.6} ry={4.6} fill={a} />
        <path d="M7 3.6 Q10.4 3 9.8 -0.4 Q8.6 2.2 6.2 1.6Z" fill={a} />
        <rect x={-2.2} y={5.6} width={2.6} height={3.6} rx={1.2} fill={a} />
        <rect x={3.2} y={5.6} width={2.6} height={3.6} rx={1.2} fill={a} />
        <circle cx={-4.6} cy={-2.2} r={4.2} fill={a} />
        <ellipse cx={1.8} cy={4.2} rx={3.6} ry={2} fill="#FFFFFF" opacity={0.35} />
        <circle cx={-5.6} cy={-3.2} r={1.05} fill="#FFFFFF" /><circle cx={-5.4} cy={-3.1} r={0.6} fill={ink} />
        <path d="M-8.2 -0.6 Q-6.6 0.8 -4.8 -0.3" stroke={ink} strokeWidth={0.6} fill="none" strokeLinecap="round" />
        <circle cx={-2.6} cy={-0.8} r={0.8} fill="#FF8FA3" opacity={0.7} />
      </>);
      break;
    case 'unicorn':
      body = (<>
        <path d="M-1.2 -6.4 L1.4 -10 L2.2 -5.8Z" fill={b === '#FF8FC0' ? '#F7C948' : b} />
        <circle cx={3.4} cy={-3.2} r={2.6} fill="#FF8FC0" /><circle cx={5} cy={0} r={2.4} fill="#C9A7F0" /><circle cx={4.6} cy={3} r={2.2} fill="#8FD3F5" />
        <ellipse cx={-0.6} cy={0.4} rx={5.6} ry={6.2} fill="#FFFFFF" stroke={a} strokeWidth={0.6} />
        <ellipse cx={-3.2} cy={3.8} rx={3.6} ry={2.8} fill="#FFE3F0" />
        <path d="M2 -5.2 L3.6 -7.6 L4 -4.6Z" fill="#FFFFFF" stroke={a} strokeWidth={0.5} />
        <path d="M-2.6 -1 Q-1.4 0 -0.2 -1" stroke={ink} strokeWidth={0.6} fill="none" strokeLinecap="round" />
        <circle cx={-4.4} cy={3.6} r={0.45} fill={ink} /><circle cx={-2.2} cy={3.8} r={0.45} fill={ink} />
        <circle cx={0.4} cy={1.4} r={0.9} fill="#FF8FA3" opacity={0.6} />
      </>);
      break;
    case 'car':
      body = (<>
        <path d="M-6 -1.6 Q-4.6 -6 0 -6 Q4 -6 5.6 -1.6Z" fill={a} />
        <path d="M-4.4 -2 Q-3.4 -4.8 -0.6 -4.8 L-0.6 -2Z M0.6 -2 L0.6 -4.8 Q3 -4.8 4 -2Z" fill="#CFEFFF" />
        <rect x={-9.4} y={-2} width={18.8} height={6.4} rx={2.4} fill={a} />
        <rect x={-9.4} y={0.6} width={18.8} height={1.2} fill="#FFFFFF" opacity={0.35} />
        <circle cx={-5} cy={4.6} r={2.8} fill="#2B2D33" /><circle cx={-5} cy={4.6} r={1.2} fill="#D7DBE0" />
        <circle cx={5} cy={4.6} r={2.8} fill="#2B2D33" /><circle cx={5} cy={4.6} r={1.2} fill="#D7DBE0" />
        <rect x={7.6} y={-1.2} width={1.6} height={1.2} rx={0.5} fill={b === '#1D7FD8' ? '#FFD166' : b} />
      </>);
      break;
    case 'rocket':
      body = (<>
        <path d="M-1.6 6.2 Q0 10.4 1.6 6.2Z" fill={b} />
        <path d="M-1 6 Q0 8.4 1 6Z" fill="#FFD166" />
        <path d="M-3 2.6 L-6 6.6 L-3 5.6Z M3 2.6 L6 6.6 L3 5.6Z" fill={b} />
        <path d="M0 -9.6 Q4.2 -5 3.2 5.6 L-3.2 5.6 Q-4.2 -5 0 -9.6Z" fill="#FFFFFF" stroke={a} strokeWidth={0.6} />
        <path d="M0 -9.6 Q2.2 -7.4 2.8 -5 L-2.8 -5 Q-2.2 -7.4 0 -9.6Z" fill={b} />
        <circle cx={0} cy={-0.8} r={2} fill="#8FD3F5" stroke={a} strokeWidth={0.7} />
        <circle cx={-0.6} cy={-1.4} r={0.6} fill="#FFFFFF" />
        <circle cx={-7.4} cy={-6.6} r={0.7} fill={b} /><circle cx={7.2} cy={-2.6} r={0.5} fill={b} /><circle cx={6.4} cy={-8} r={0.45} fill={a} />
      </>);
      break;
    case 'cat':
      body = (<>
        <path d="M-7.6 -2.4 L-6.6 -9.2 L-2.2 -5.4Z M7.6 -2.4 L6.6 -9.2 L2.2 -5.4Z" fill={a} />
        <path d="M-6.4 -4 L-6 -7.4 L-3.8 -5.4Z M6.4 -4 L6 -7.4 L3.8 -5.4Z" fill="#FFC6D0" />
        <ellipse cx={0} cy={0.8} rx={8.2} ry={7.2} fill={a} />
        <ellipse cx={0} cy={3.6} rx={4.2} ry={3} fill="#FFFFFF" opacity={0.85} />
        <ellipse cx={-3} cy={-0.4} rx={0.95} ry={1.3} fill={ink} /><ellipse cx={3} cy={-0.4} rx={0.95} ry={1.3} fill={ink} />
        <path d="M-0.8 2 L0.8 2 L0 2.9Z" fill="#FF7A8A" />
        <path d="M0 2.9 Q-1 4 -2 3.4 M0 2.9 Q1 4 2 3.4" stroke={ink} strokeWidth={0.45} fill="none" strokeLinecap="round" />
        <path d="M-4.6 2.4 L-8.6 1.8 M-4.6 3.4 L-8.4 3.8 M4.6 2.4 L8.6 1.8 M4.6 3.4 L8.4 3.8" stroke={ink} strokeWidth={0.35} strokeLinecap="round" />
      </>);
      break;
    case 'bear':
      body = (<>
        <circle cx={-6.2} cy={-5.6} r={3} fill={a} /><circle cx={6.2} cy={-5.6} r={3} fill={a} />
        <circle cx={-6.2} cy={-5.6} r={1.5} fill="#E8C9A6" /><circle cx={6.2} cy={-5.6} r={1.5} fill="#E8C9A6" />
        <circle cx={0} cy={0.6} r={8} fill={a} />
        <ellipse cx={0} cy={3.2} rx={4} ry={3.1} fill="#E8C9A6" />
        <circle cx={-3.2} cy={-1} r={0.95} fill={ink} /><circle cx={3.2} cy={-1} r={0.95} fill={ink} />
        <ellipse cx={0} cy={2.2} rx={1.4} ry={1} fill={ink} />
        <path d="M0 3.2 Q-1 4.4 -2 3.8 M0 3.2 Q1 4.4 2 3.8" stroke={ink} strokeWidth={0.45} fill="none" strokeLinecap="round" />
        <circle cx={-5} cy={2} r={1} fill="#FF8FA3" opacity={0.5} /><circle cx={5} cy={2} r={1} fill="#FF8FA3" opacity={0.5} />
      </>);
      break;
    case 'flower':
      body = (<>
        <path d="M0 4 Q-0.6 7.4 0.4 9.8" stroke="#3FA34D" strokeWidth={1.1} fill="none" strokeLinecap="round" />
        <ellipse cx={-2.6} cy={7.6} rx={2.2} ry={1} fill="#3FA34D" transform="rotate(-30 -2.6 7.6)" />
        {[0, 60, 120, 180, 240, 300].map((d) => <ellipse key={d} cx={0} cy={-4.6} rx={2.7} ry={3.6} fill={a} transform={`rotate(${d})`} />)}
        <circle cx={0} cy={0} r={3} fill={b} />
        <circle cx={-0.9} cy={-0.5} r={0.45} fill={ink} /><circle cx={0.9} cy={-0.5} r={0.45} fill={ink} />
        <path d="M-1 0.8 Q0 1.7 1 0.8" stroke={ink} strokeWidth={0.4} fill="none" strokeLinecap="round" />
      </>);
      break;
    case 'hero':
      body = (<>
        <path d="M0 -9.4 L7.8 -6.4 Q7.8 3.6 0 9.4 Q-7.8 3.6 -7.8 -6.4Z" fill={a} />
        <path d="M0 -7.4 L6 -5.1 Q6 2.6 0 7.2 Q-6 2.6 -6 -5.1Z" fill="#FFFFFF" />
        <path d="M0 -5.6 L4.4 -3.9 Q4.4 1.8 0 5.2 Q-4.4 1.8 -4.4 -3.9Z" fill={b} />
        <path d="M0.8 -4.6 L-2.4 0.6 L-0.2 0.6 L-1 4.4 L2.4 -0.8 L0.2 -0.8Z" fill="#FFD166" />
      </>);
      break;
    case 'whale':
      body = (<>
        <path d="M-1 -4.6 Q-1.6 -8 -3.2 -8.6 M-1 -4.6 Q-0.6 -8.2 1.2 -8.8 M-1 -4.6 L-1 -8.4" stroke="#8FD3F5" strokeWidth={0.9} fill="none" strokeLinecap="round" />
        <path d="M-8.6 1.4 Q-8.6 -4.6 -1 -4.6 Q6.8 -4.6 7.6 1.2 L9.8 -1.6 Q10.2 2.6 8 4.2 Q4.6 6.8 -1.6 6.6 Q-8.6 6.2 -8.6 1.4Z" fill={a} />
        <path d="M-8 2.6 Q-1 6.6 6.4 3.2 Q4.4 6 -1.6 6 Q-7.2 5.8 -8 2.6Z" fill="#FFFFFF" opacity={0.8} />
        <circle cx={-4.6} cy={-0.4} r={0.9} fill={ink} /><circle cx={-4.8} cy={-0.7} r={0.3} fill="#FFFFFF" />
        <path d="M-7 1.8 Q-5.6 2.8 -4.2 2" stroke={ink} strokeWidth={0.45} fill="none" strokeLinecap="round" />
        <circle cx={-2.6} cy={1.4} r={0.8} fill="#FF8FA3" opacity={0.55} />
      </>);
      break;
    case 'rainbow':
      body = (<>
        {['#FF6B6B', '#FFB703', '#7BD389', '#4CC9F0', a].map((c, i) => (
          <path key={c} d={`M${-8.6 + i * 1.5} 3.2 A${8.6 - i * 1.5} ${8.6 - i * 1.5} 0 0 1 ${8.6 - i * 1.5} 3.2`} stroke={c} strokeWidth={1.5} fill="none" />
        ))}
        <g fill="#FFFFFF" stroke="#D8DDE6" strokeWidth={0.3}>
          <circle cx={-8} cy={4.6} r={2.2} /><circle cx={-5.6} cy={3.8} r={2.6} /><circle cx={-3.6} cy={5} r={1.8} />
          <circle cx={8} cy={4.6} r={2.2} /><circle cx={5.6} cy={3.8} r={2.6} /><circle cx={3.6} cy={5} r={1.8} />
        </g>
      </>);
      break;
    case 'soccer':
      body = (<>
        <circle cx={0} cy={0} r={8.6} fill="#FFFFFF" stroke="#2B2D33" strokeWidth={0.6} />
        <path d="M0 -2.8 L2.66 -0.86 L1.64 2.26 L-1.64 2.26 L-2.66 -0.86Z" fill="#2B2D33" />
        <path d="M0 -2.8 L0 -6.4 M2.66 -0.86 L6 -2 M1.64 2.26 L3.8 5.2 M-1.64 2.26 L-3.8 5.2 M-2.66 -0.86 L-6 -2" stroke="#2B2D33" strokeWidth={0.5} />
        <path d="M-2 -8.4 L0 -6.4 L2 -8.4 M6 -2 L8.4 -1 L7.6 2 M3.8 5.2 L5 7.6 M-3.8 5.2 L-5 7.6 M-6 -2 L-8.4 -1 L-7.6 2" stroke="#2B2D33" strokeWidth={0.5} fill="none" />
        <path d="M-2 -8.4 L0 -6.4 L2 -8.4 Q0 -8.9 -2 -8.4Z M6 -2 L8.4 -1 Q8.5 0.6 7.6 2 L5.6 1 Z" fill="#2B2D33" />
      </>);
      break;
    case 'crown':
      body = (<>
        <path d="M-8 4.6 L-8.6 -4.4 L-4.2 -0.6 L0 -7.4 L4.2 -0.6 L8.6 -4.4 L8 4.6Z" fill={b} stroke="#C98A00" strokeWidth={0.5} strokeLinejoin="round" />
        <rect x={-8.2} y={4} width={16.4} height={3.2} rx={1} fill={b} stroke="#C98A00" strokeWidth={0.5} />
        <circle cx={0} cy={1.2} r={1.5} fill={a} /><circle cx={-4.4} cy={2.2} r={1.1} fill="#4CC9F0" /><circle cx={4.4} cy={2.2} r={1.1} fill="#7BD389" />
        <circle cx={-8.6} cy={-4.6} r={1} fill={b} /><circle cx={0} cy={-7.6} r={1} fill={b} /><circle cx={8.6} cy={-4.6} r={1} fill={b} />
        <circle cx={-3} cy={5.6} r={0.5} fill={a} /><circle cx={0} cy={5.6} r={0.5} fill={a} /><circle cx={3} cy={5.6} r={0.5} fill={a} />
      </>);
      break;
  }
  return <g transform={`translate(${f2(cx)} ${f2(cy)}) scale(${f2(k * (half ? 1 : 1))})`} data-icon={theme.id}>{body}</g>;
}

// hoạ tiết nền mờ trong nhãn
function Pattern({ theme, w, h, color, opacity }: { theme: NlTheme; w: number; h: number; color: string; opacity: number }) {
  const els: ReactNode[] = [];
  const step = Math.max(4.2, Math.min(w, h) / 3.2);
  let i = 0;
  for (let y = step / 2; y < h + step; y += step) {
    for (let x = ((Math.round(y / step) % 2) * step) / 2; x < w + step; x += step) {
      const key = i++;
      const s = step * 0.16;
      switch (theme.pattern) {
        case 'dots': els.push(<circle key={key} cx={x} cy={y} r={s} />); break;
        case 'stars': els.push(<path key={key} d={`M${x} ${y - s * 1.6}L${x + s * 0.5} ${y - s * 0.5}L${x + s * 1.6} ${y}L${x + s * 0.5} ${y + s * 0.5}L${x} ${y + s * 1.6}L${x - s * 0.5} ${y + s * 0.5}L${x - s * 1.6} ${y}L${x - s * 0.5} ${y - s * 0.5}Z`} />); break;
        case 'hearts': els.push(<path key={key} d={`M${x} ${y + s * 1.1}C${x - s * 2} ${y - s * 0.2} ${x - s} ${y - s * 1.6} ${x} ${y - s * 0.5}C${x + s} ${y - s * 1.6} ${x + s * 2} ${y - s * 0.2} ${x} ${y + s * 1.1}Z`} />); break;
        case 'confetti': els.push(<rect key={key} x={x - s} y={y - s * 0.35} width={s * 2} height={s * 0.7} rx={s * 0.3} transform={`rotate(${(key * 47) % 180} ${x} ${y})`} />); break;
        case 'grid': els.push(<rect key={key} x={x - s * 0.7} y={y - s * 0.7} width={s * 1.4} height={s * 1.4} rx={s * 0.3} transform={`rotate(45 ${x} ${y})`} />); break;
        case 'waves': els.push(<path key={key} d={`M${x - s * 2} ${y}Q${x - s} ${y - s} ${x} ${y}T${x + s * 2} ${y}`} fill="none" stroke={color} strokeWidth={s * 0.45} strokeLinecap="round" />); break;
      }
    }
  }
  return <g fill={color} opacity={opacity}>{els}</g>;
}

function PhoneIcon({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  // tay nghe điện thoại (vẽ path, không dùng ký tự)
  return <path transform={`translate(${f2(x)} ${f2(y)}) scale(${f2(s / 10)})`} fill={fill}
    d="M2.2 0.6 L4.2 0.2 Q4.8 0.1 5 0.7 L5.8 3 Q6 3.6 5.5 4 L4.2 5 Q5.4 7.6 8 8.8 L9 7.5 Q9.4 7 10 7.2 L12.2 8 Q12.8 8.2 12.7 8.8 L12.3 10.8 Q12.2 11.4 11.6 11.4 Q1.6 11.2 1.6 1.2 Q1.6 0.7 2.2 0.6Z" />;
}

// ---------- 1 nhãn (toạ độ cục bộ 0..w, 0..h) ----------
interface LabelProps { slot: NlSlot; spec: NlSpec; kid: NlKid; photo?: string; uid: string; bleed?: number }
function LabelContent({ slot, spec, kid, photo, uid, bleed = 0 }: LabelProps) {
  const th = nlTheme(spec.theme);
  const font = nlFont(spec.font);
  const solid = spec.style === 'solid';
  const bg = solid ? th.accent : th.soft;
  const nameFill = solid ? '#FFFFFF' : th.accent;
  const infoFill = solid ? '#FFFFFF' : th.ink;
  const patColor = solid ? '#FFFFFF' : th.accent;
  const { w, h, type } = slot;
  const clip = `${uid}-c`;
  const shape = type === 'round' ? circPath(w / 2, h / 2, w / 2 + bleed) : rrPath(-bleed, -bleed, w + bleed * 2, h + bleed * 2, RADIUS[type] + bleed);
  const name = kid.name || ' ';
  const info = [kid.cls, spec.showSchool ? kid.school : ''].filter((s) => s && s.trim()).join(' · ');
  const phone = spec.showPhone ? (kid.phone || '').trim() : '';

  const iconBadge = (cx: number, cy: number, r: number) => (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="#FFFFFF" />
      <circle cx={cx} cy={cy} r={r - 0.35} fill="none" stroke={th.accent2} strokeWidth={0.6} />
      {photo && (type === 'big' || type === 'round') ? (
        <>
          <clipPath id={`${uid}-ph`}><circle cx={cx} cy={cy} r={r - 0.75} /></clipPath>
          <image href={photo} x={cx - r} y={cy - r} width={r * 2} height={r * 2} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${uid}-ph)`} />
        </>
      ) : <ThemeIcon theme={th} cx={cx} cy={cy} r={r * 0.78} />}
    </g>
  );
  const textEls: ReactNode[] = [];
  const pushLines = (lines: Line[], bases: number[], x: number, anchor: 'start' | 'middle') => {
    lines.forEach((l, i) => textEls.push(
      <text key={`${textEls.length}`} x={f2(x)} y={f2(bases[i])} fontFamily={`'${l.family}'`} fontWeight={l.weight} fontSize={f2(l.size)} fill={l.fill} opacity={l.opacity} textAnchor={anchor} data-nl-text="1">{l.text}</text>,
    ));
  };

  let deco: ReactNode = null;
  const nameOf = (lines: string[], size: number): Line[] => lines.map((t) => ({ text: t, family: font.family, weight: font.weight, size, fill: nameFill }));
  const infoOf = (text: string, w: number, max: number, weight = 600): Line | null => {
    const r = fitInfo(text, BODY, weight, w, max, 1.9);
    return r ? { text: r.text, family: BODY, weight, size: r.size, fill: infoFill, opacity: 0.92 } : null;
  };
  if (type === 'big') {
    const r = 9.6, cx = 12.6, cy = h / 2;
    deco = iconBadge(cx, cy, r);
    const x0 = 25.4, tw = w - x0 - 2.8;
    const extra: Line[] = [];
    const il = info ? infoOf(info, tw, 2.8) : null; if (il) extra.push(il);
    const pl0 = phone ? infoOf(phone, tw - 3.4, 2.6, 800) : null; if (pl0) extra.push(pl0);
    const extraH = extra.reduce((a, l) => a + lineH(l), 0) + 0.7 * extra.length;
    const nm = fitName(name, font.family, font.weight, tw, 8.6, h - 4.4 - extraH, 3.2);
    const lines: Line[] = [...nameOf(nm.lines, nm.size), ...extra];
    shrinkToHeight(lines, h - 4.4, 0.7);
    const bases = stack(lines, 2.2, h - 2.2, 0.7);
    if (pl0) {
      const pl = lines[lines.length - 1], pb = bases[bases.length - 1];
      pushLines(lines.slice(0, -1), bases.slice(0, -1), x0, 'start');
      textEls.push(<PhoneIcon key="ph" x={x0} y={pb - pl.size * 0.78} s={pl.size * 0.78} fill={infoFill} />);
      pushLines([pl], [pb], x0 + pl.size * 1.15, 'start');
    } else pushLines(lines, bases, x0, 'start');
  } else if (type === 'medium') {
    const r = 5.9, cx = 7.4, cy = h / 2;
    deco = iconBadge(cx, cy, r);
    const x0 = 14.6, tw = w - x0 - 2.2;
    const sub = info || phone;
    const sl = sub ? infoOf(sub, tw, 2.2) : null;
    const nm = fitName(name, font.family, font.weight, tw, 6.4, h - 2.6 - (sl ? lineH(sl) + 0.4 : 0), 2.6);
    const lines: Line[] = [...nameOf(nm.lines, nm.size), ...(sl ? [sl] : [])];
    shrinkToHeight(lines, h - 2.6, 0.4);
    pushLines(lines, stack(lines, 1.3, h - 1.3, 0.4), x0, 'start');
  } else if (type === 'mini') {
    const r = 3.7, cx = 4.6, cy = h / 2;
    deco = iconBadge(cx, cy, r);
    const x0 = 9.4, tw = w - x0 - 1.6;
    const nm = fitName(name, font.family, font.weight, tw, 5.2, h - 1.6, 2.2);
    const lines = nameOf(nm.lines, nm.size);
    shrinkToHeight(lines, h - 1.6, 0.2);
    pushLines(lines, stack(lines, 0.8, h - 0.8, 0.2), x0, 'start');
  } else if (type === 'round') {
    const cx = w / 2;
    deco = iconBadge(cx, 8.7, 6.2);
    // tên nằm dưới ảnh: bề ngang = dây cung tròn ở cao độ dòng chữ (thụt 1.6mm)
    const R = w / 2 - 1.6;
    const yTop = 15.4, yBot = 20.8;
    const chord = (y: number) => 2 * Math.sqrt(Math.max(0, R * R - (y - h / 2) ** 2));
    const tw = Math.min(chord(yTop), chord(yBot)) * 0.96;
    const nm = fitName(name, font.family, font.weight, tw, 4.4, yBot - yTop, 2.2, true);
    const lines = nameOf(nm.lines, nm.size);
    shrinkToHeight(lines, yBot - yTop, 0);
    pushLines(lines, stack(lines, yTop, yBot, 0), cx, 'middle');
  } else if (type === 'shoe') {
    // hình to ghép nửa–nửa: tâm hình nằm ở mép trong của mỗi nhãn (L: mép phải, R: mép trái)
    const icx = slot.side === 'L' ? w + 1.5 : -1.5;
    deco = (
      <g>
        <circle cx={icx} cy={12.4} r={11.4} fill="#FFFFFF" opacity={solid ? 0.95 : 1} />
        <ThemeIcon theme={th} cx={icx} cy={12.4} r={9.4} />
      </g>
    );
    const lx = slot.side === 'L' ? 5.4 : w - 5.4;
    deco = (<>{deco}
      <circle cx={lx} cy={5.4} r={3.4} fill={th.accent2} />
      <text x={lx} y={f2(5.4 + ((fontMetrics(BODY, 800).asc - fontMetrics(BODY, 800).desc) * 3.6) / 2)} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={3.6} fill="#FFFFFF" textAnchor="middle" data-nl-text="1" data-nl-lr="1">{slot.side === 'L' ? 'L' : 'R'}</text>
    </>);
    const tw = w - 4;
    const nm = fitName(name, font.family, font.weight, tw, 4.6, 5.6, 2.4, true);
    const lines = nameOf(nm.lines, nm.size);
    shrinkToHeight(lines, 5.6, 0);
    pushLines(lines, stack(lines, 23.4, 29, 0), w / 2, 'middle');
  }

  return (
    <g>
      <clipPath id={clip}><path d={shape} /></clipPath>
      <path d={shape} fill={bg} data-shape="1" />
      <g clipPath={`url(#${clip})`}>
        <Pattern theme={th} w={w + bleed} h={h + bleed} color={patColor} opacity={solid ? 0.14 : 0.16} />
        {type === 'shoe' && <rect x={-bleed} y={h - 7.4} width={w + bleed * 2} height={7.4 + bleed} fill={solid ? th.ink : '#FFFFFF'} opacity={solid ? 0.22 : 0.85} />}
        {deco}
      </g>
      {textEls}
    </g>
  );
}

// ---------- 1 nhãn đứng riêng (texture 3D / ảnh) ----------
export function NlLabelSvg({ type, spec, kid, photo, style }: { type: NlType; spec: NlSpec; kid: NlKid; photo?: string; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const slot = NL_SLOTS.find((s) => s.type === type)!;
  const local: NlSlot = { ...slot, x: 0, y: 0 };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${slot.w} ${slot.h}`} width={`${slot.w}mm`} height={`${slot.h}mm`} style={style} data-nl-single={type}>
      <LabelContent slot={local} spec={spec} kid={kid} photo={photo} uid={`${uid}s`} />
    </svg>
  );
}

// ---------- cả tờ ----------
export type NlSheetMode = 'preview' | 'print' | 'tex';
/** preview: tờ đế + vết bế mờ + tiêu đề; print: lớp In (tràn 1mm) + CutContour; tex: như preview, nhãn đã bóc để ô trống */
export function NlSheetSvg({ spec, kid, photo, mode = 'preview', peeled = [], style, kidIndex = 0 }: {
  spec: NlSpec; kid: NlKid; photo?: string; mode?: NlSheetMode; peeled?: string[]; style?: CSSProperties; kidIndex?: number;
}) {
  const uid = useId().replace(/:/g, '');
  const th = nlTheme(spec.theme);
  const print = mode === 'print';
  const bleed = print ? NL_BLEED : 0;
  const title = `Nhãn tên · ${kid.name || ''}`.trim();
  const titleSize = Math.min(5.2, fitSize(title, 'Baloo 2', 800, 120, 5.2));
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${NL_SHEET.wMm} ${NL_SHEET.hMm}`} width={`${NL_SHEET.wMm}mm`} height={`${NL_SHEET.hMm}mm`} style={style} data-nl-sheet={mode} data-kid={kidIndex}>
      {!print && <rect x={0} y={0} width={NL_SHEET.wMm} height={NL_SHEET.hMm} fill="#F6F4EF" />}
      <g id="In">
        {/* tiêu đề in trên phần đế (bóc bỏ) — giúp phát đúng tờ cho từng bé */}
        <text x={10} y={16} fontFamily="'Baloo 2'" fontWeight={800} fontSize={f2(titleSize)} fill={th.accent} data-nl-title="1">{title}</text>
        <text x={200} y={16} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.8} fill={th.ink} opacity={0.7} textAnchor="end">{`Chủ đề ${th.name} · ${NL_COUNT} nhãn`}</text>
        {NL_SLOTS.map((s) => {
          const gone = peeled.includes(s.id);
          return (
            <g key={s.id} transform={`translate(${f2(s.x)} ${f2(s.y)})`} data-nl={s.type} data-slot={s.id}>
              {gone ? (
                <path d={s.type === 'round' ? circPath(s.w / 2, s.h / 2, s.w / 2) : rrPath(0, 0, s.w, s.h, RADIUS[s.type])} fill="#EDEAE2" stroke="#CFC9BC" strokeWidth={0.3} />
              ) : (
                <LabelContent slot={{ ...s, x: 0, y: 0 }} spec={spec} kid={kid} photo={photo} uid={`${uid}${s.id}`} bleed={bleed} />
              )}
            </g>
          );
        })}
        {!print && (
          <text x={105} y={291} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={2.6} fill="#8A8476" textAnchor="middle">Decal nhựa chống nước · cán màng bóng · bóc ra dán vở, bình nước, bút, giày</text>
        )}
      </g>
      {print ? (
        <g id="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={0.25}>
          {NL_SLOTS.map((s) => <path key={s.id} d={slotPath(s)} data-cut={s.id} />)}
        </g>
      ) : (
        <g fill="none" stroke="rgba(60,52,40,0.22)" strokeWidth={0.25}>
          {NL_SLOTS.filter((s) => !peeled.includes(s.id)).map((s) => <path key={s.id} d={slotPath(s, 0.15)} />)}
        </g>
      )}
    </svg>
  );
}
