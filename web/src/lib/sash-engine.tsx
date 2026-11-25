'use client';
// Băng đeo chéo (sash) sự kiện: dải satin 10×160/180cm, vắt vai phải → hông trái, 2 đầu may nối ở hông (hoa cài / tua rua).
// Chữ in/ép nhũ chạy dọc ĐOẠN TRƯỚC (từ vai xuống hông). 1 engine SVG (đơn vị mm) = BỐ CỤC × MÀU SATIN × MỰC × FONT,
// 4 chế độ vẽ: 'front' (xem trước đoạn trước), 'tex' (cả dải cho 3D), 'mask' (khuôn nhũ cho 3D), 'print' (file in + lề + dấu gấp/may).
// Danh sách tên → mỗi người 1 băng (tên vào dòng phụ).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';

// ---------- khổ ----------
export interface SHSize { id: string; name: string; L: number; W: number }
export const SH_SIZES: SHSize[] = [
  { id: '180x10', name: '180 × 10 cm (người lớn)', L: 1800, W: 100 },
  { id: '160x10', name: '160 × 10 cm (nữ, dáng nhỏ)', L: 1600, W: 100 },
  { id: '180x12', name: '180 × 12 cm (bản to)', L: 1800, W: 120 },
];
export const shSize = (id: string) => SH_SIZES.find((s) => s.id === id) || SH_SIZES[0];
export const SH_BLEED_MM = 5;
export const SH_SEW_MM = 40; // mỗi đầu chồng 40mm khi may nối ở hông

// vùng chữ: đoạn trước = từ vai (L/2) xuống hông; tránh nếp vai và chỗ nối/hoa cài ở hông
export const frontZone = (L: number) => ({ a: L / 2 + 150, b: L - 290 });
export const backZone = (L: number) => ({ a: 300, b: L / 2 - 110 });

// ---------- font ----------
export interface SHFont { id: string; name: string; family: string; weight: number; script?: boolean; upper?: boolean }
export const SH_FONTS: SHFont[] = [
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800, upper: true },
  { id: 'montserrat', name: 'Montserrat (hiện đại)', family: 'Montserrat', weight: 800, upper: true },
  { id: 'oswald', name: 'Oswald (gọn)', family: 'Oswald', weight: 700, upper: true },
  { id: 'cormorant', name: 'Cormorant (cổ điển)', family: 'Cormorant Garamond', weight: 700, upper: true },
  { id: 'greatvibes', name: 'Great Vibes (bay bướm)', family: 'Great Vibes', weight: 400, script: true },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
];
export const shFont = (id: string) => SH_FONTS.find((f) => f.id === id) || SH_FONTS[0];
const SUB = 'Be Vietnam Pro';

export const SH_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Great+Vibes&family=Dancing+Script:wght@700&display=swap');`;

export function useSHFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-sh-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-sh-fonts'; link.rel = 'stylesheet';
        link.href = SH_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...SH_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${SUB}"`, `800 40px "${SUB}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu satin + mực ----------
export interface SHSatin { id: string; name: string; bg: string; deep: string; band: string; ink: SHInkId }
export type SHInkId = 'gold' | 'silver' | 'white' | 'black';
export const SH_SATINS: SHSatin[] = [
  { id: 'do', name: 'Đỏ', bg: '#B3141E', deep: '#7E0B12', band: '#F2C14E', ink: 'gold' },
  { id: 'trang', name: 'Trắng', bg: '#F6F2EA', deep: '#DCD3C3', band: '#C9A13B', ink: 'gold' },
  { id: 'hong', name: 'Hồng', bg: '#EE9DB5', deep: '#C9668A', band: '#FFFFFF', ink: 'white' },
  { id: 'xanh', name: 'Xanh dương', bg: '#1C4C9C', deep: '#0F2E66', band: '#FFFFFF', ink: 'white' },
  { id: 'vang', name: 'Vàng', bg: '#E5B320', deep: '#B88708', band: '#B3141E', ink: 'black' },
  { id: 'den', name: 'Đen', bg: '#151515', deep: '#000000', band: '#C9A13B', ink: 'gold' },
  { id: 'ngoc', name: 'Xanh ngọc', bg: '#0E7066', deep: '#08463F', band: '#F2C14E', ink: 'gold' },
];
export const shSatin = (id: string) => SH_SATINS.find((s) => s.id === id) || SH_SATINS[0];
export interface SHInk { id: SHInkId; name: string; flat: string; g: [string, string, string]; foil: boolean }
export const SH_INKS: SHInk[] = [
  { id: 'gold', name: 'Nhũ vàng', flat: '#C9A13B', g: ['#8E6B1E', '#F6E08C', '#B8892A'], foil: true },
  { id: 'silver', name: 'Nhũ bạc', flat: '#D3D8DE', g: ['#7D848D', '#F4F6F8', '#A3AAB3'], foil: true },
  { id: 'white', name: 'In trắng', flat: '#FFFFFF', g: ['#FFFFFF', '#FFFFFF', '#FFFFFF'], foil: false },
  { id: 'black', name: 'In đen', flat: '#161616', g: ['#161616', '#161616', '#161616'], foil: false },
];
export const shInk = (id: string) => SH_INKS.find((i) => i.id === id) || SH_INKS[0];
const lum = (hex: string) => { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return 0.299 * r + 0.587 * g + 0.114 * b; };
/** mực gần màu satin quá → khó đọc */
export const lowContrast = (satin: string, ink: string) => Math.abs(lum(shSatin(satin).bg) - lum(shInk(ink).flat)) < 70;

// ---------- bố cục + mẫu ----------
export type SHLayout = 'classic' | 'laurel' | 'script' | 'stars' | 'stripe' | 'crown';
export const SH_LAYOUTS: { id: SHLayout; name: string }[] = [
  { id: 'classic', name: 'Viền kép cổ điển' },
  { id: 'laurel', name: 'Nguyệt quế' },
  { id: 'script', name: 'Chữ bay + tim' },
  { id: 'stars', name: 'Rắc sao' },
  { id: 'stripe', name: 'Sọc 2 mép' },
  { id: 'crown', name: 'Vương miện' },
];
export type SHFinish = 'rosette' | 'fringe' | 'plain';
export const SH_FINISHES: { id: SHFinish; name: string }[] = [
  { id: 'rosette', name: 'Hoa cài ở hông' },
  { id: 'fringe', name: 'Tua rua nhũ' },
  { id: 'plain', name: 'May nối trơn' },
];

export interface SHSpec { layout: SHLayout; satin: string; ink: SHInkId; font: string; size: string; finish: SHFinish }
export type SHData = Record<string, string>;
export interface SHTemplate { id: string; name: string; spec: Omit<SHSpec, 'size'>; data: SHData }
export const SH_TEMPLATES: SHTemplate[] = [
  { id: 'dai-su', name: 'Đại sứ thương hiệu', spec: { layout: 'classic', satin: 'do', ink: 'gold', font: 'playfair', finish: 'rosette' }, data: { title: 'ĐẠI SỨ THƯƠNG HIỆU', sub: 'AN KHANG BEAUTY 2027', back: '#ankhangbeauty' } },
  { id: 'tan-sv', name: 'Tân sinh viên', spec: { layout: 'stripe', satin: 'xanh', ink: 'white', font: 'montserrat', finish: 'plain' }, data: { title: 'TÂN SINH VIÊN K50', sub: 'Chào mừng đến với ngôi nhà chung', back: 'K50 · 2026' } },
  { id: 'bride', name: 'Bride to be', spec: { layout: 'script', satin: 'trang', ink: 'gold', font: 'greatvibes', finish: 'rosette' }, data: { title: 'Bride to be', sub: 'CÔ DÂU THU HÀ', back: '' } },
  { id: 'co-dau', name: 'Cô dâu', spec: { layout: 'script', satin: 'hong', ink: 'white', font: 'dancing', finish: 'fringe' }, data: { title: 'Cô Dâu', sub: 'THU HÀ & QUỐC BẢO', back: '#ThuHaQuocBao' } },
  { id: 'sinh-nhat', name: 'Happy Birthday', spec: { layout: 'stars', satin: 'den', ink: 'silver', font: 'dancing', finish: 'rosette' }, data: { title: 'Happy Birthday', sub: 'GIA KHÁNH · 18 TUỔI', back: '' } },
  { id: 'miss', name: 'Hoa khôi / Miss', spec: { layout: 'crown', satin: 'do', ink: 'gold', font: 'cormorant', finish: 'fringe' }, data: { title: 'MISS AN KHANG 2027', sub: '', back: '' } },
  { id: 'btc', name: 'Ban tổ chức', spec: { layout: 'classic', satin: 'den', ink: 'gold', font: 'oswald', finish: 'plain' }, data: { title: 'BAN TỔ CHỨC', sub: 'YEAR END PARTY 2026', back: '' } },
  { id: 'tnv', name: 'Tình nguyện viên', spec: { layout: 'stripe', satin: 'vang', ink: 'black', font: 'montserrat', finish: 'plain' }, data: { title: 'TÌNH NGUYỆN VIÊN', sub: 'MÙA HÈ XANH 2027', back: '' } },
  { id: 'vip', name: 'VIP', spec: { layout: 'laurel', satin: 'den', ink: 'gold', font: 'playfair', finish: 'rosette' }, data: { title: 'VIP', sub: 'KHÁCH MỜI ĐẶC BIỆT', back: '' } },
  { id: 'tot-nghiep', name: 'Tốt nghiệp', spec: { layout: 'laurel', satin: 'xanh', ink: 'gold', font: 'cormorant', finish: 'fringe' }, data: { title: 'TỐT NGHIỆP 2027', sub: 'KHOA KINH TẾ', back: '' } },
  { id: 'dai-bieu', name: 'Đại biểu', spec: { layout: 'crown', satin: 'ngoc', ink: 'gold', font: 'montserrat', finish: 'rosette' }, data: { title: 'ĐẠI BIỂU', sub: 'ĐẠI HỘI ĐOÀN 2027', back: '' } },
  { id: 'phu-dau', name: 'Phù dâu', spec: { layout: 'script', satin: 'hong', ink: 'black', font: 'greatvibes', finish: 'plain' }, data: { title: 'Phù dâu', sub: 'TEAM BRIDE', back: '' } },
];
export const defaultSHSpec = (): SHSpec => ({ ...SH_TEMPLATES[0].spec, size: SH_SIZES[0].id });
export const defaultSHData = (): SHData => ({ ...SH_TEMPLATES[0].data, names: '' });

export interface SHField { key: string; label: string; ph?: string }
export const SH_FIELDS: SHField[] = [
  { key: 'title', label: 'Chữ chính (chạy dọc băng)', ph: 'ĐẠI SỨ THƯƠNG HIỆU' },
  { key: 'sub', label: 'Dòng phụ (tên / năm / đơn vị — để trống nếu không cần)', ph: 'AN KHANG BEAUTY 2027' },
  { key: 'back', label: 'Chữ nhỏ đoạn sau lưng (hashtag, tuỳ chọn)', ph: '#ankhang2027' },
];

/** danh sách tên (mỗi dòng 1 người) → mỗi người 1 băng; trống = 1 mẫu chung */
export const parseNames = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 200);

// ---------- hình trang trí (mm) ----------
const f1 = (n: number) => +n.toFixed(2);
function starPath(cx: number, cy: number, r: number, rot = -Math.PI / 2) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.42 : r, a = rot + (i * Math.PI) / 5;
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)}`;
  }
  return d + 'Z';
}
const diamond = (cx: number, cy: number, r: number) => `M${f1(cx - r)} ${f1(cy)}L${f1(cx)} ${f1(cy - r * 0.62)}L${f1(cx + r)} ${f1(cy)}L${f1(cx)} ${f1(cy + r * 0.62)}Z`;
function heartPath(cx: number, cy: number, s: number) {
  return `M${f1(cx)} ${f1(cy + s * 0.55)}C${f1(cx - s * 1.1)} ${f1(cy - s * 0.1)} ${f1(cx - s * 0.55)} ${f1(cy - s * 0.85)} ${f1(cx)} ${f1(cy - s * 0.32)}`
    + `C${f1(cx + s * 0.55)} ${f1(cy - s * 0.85)} ${f1(cx + s * 1.1)} ${f1(cy - s * 0.1)} ${f1(cx)} ${f1(cy + s * 0.55)}Z`;
}
function crownPath(cx: number, cy: number, s: number) {
  const w = s * 1.5, h = s;
  const x0 = cx - w / 2, y0 = cy + h / 2;
  return `M${f1(x0)} ${f1(y0)}L${f1(x0 - w * 0.04)} ${f1(cy - h * 0.38)}L${f1(cx - w * 0.25)} ${f1(cy + h * 0.02)}L${f1(cx)} ${f1(cy - h * 0.55)}`
    + `L${f1(cx + w * 0.25)} ${f1(cy + h * 0.02)}L${f1(x0 + w * 1.04)} ${f1(cy - h * 0.38)}L${f1(x0 + w)} ${f1(y0)}Z`
    + `M${f1(x0)} ${f1(y0 + h * 0.1)}H${f1(x0 + w)}V${f1(y0 + h * 0.24)}H${f1(x0)}Z`;
}
/** cành nguyệt quế nằm ngang: gốc ở x0, ngọn hướng dir (+1 phải / -1 trái) */
function Laurel({ x0, cy, len, dir, fill }: { x0: number; cy: number; len: number; dir: 1 | -1; fill: string }) {
  const leaves: ReactNode[] = [];
  const n = 7;
  for (let i = 0; i < n; i++) {
    const t = (i + 0.6) / n;
    const x = x0 + dir * len * t;
    const bend = Math.sin(t * Math.PI) * len * 0.05;
    const sz = len * 0.13 * (1 - t * 0.45);
    for (const side of [-1, 1]) {
      const ang = side * 38 * dir; // lá nghiêng về phía ngọn cành
      leaves.push(<ellipse key={`${i}${side}`} cx={f1(x)} cy={f1(cy - bend + side * sz * 0.55)} rx={f1(sz)} ry={f1(sz * 0.36)} transform={`rotate(${f1(ang)} ${f1(x)} ${f1(cy - bend + side * sz * 0.55)})`} fill={fill} />);
    }
  }
  const xe = x0 + dir * len;
  return (
    <g>
      <path d={`M${f1(x0)} ${f1(cy)}Q${f1(x0 + dir * len * 0.5)} ${f1(cy - len * 0.1)} ${f1(xe)} ${f1(cy - len * 0.02)}`} stroke={fill} strokeWidth={f1(len * 0.025)} fill="none" strokeLinecap="round" />
      {leaves}
      <circle cx={f1(xe + dir * len * 0.04)} cy={f1(cy - len * 0.02)} r={f1(len * 0.035)} fill={fill} />
    </g>
  );
}

// ---------- đo + xếp chữ ----------
const fitTo = (t: string, maxW: number, size: number, fam: string, wt: number, lsK: number) => {
  const w = textW(t, size, { fam, wt, ls: size * lsK });
  return w > maxW ? (size * maxW) / w : size;
};

export type SHMode = 'front' | 'tex' | 'mask' | 'print';

/** 1 băng đeo. name = dòng phụ riêng của người này (in hàng loạt). */
export function SashSvg({ spec, data, name, mode, style }: { spec: SHSpec; data: SHData; name?: string; mode: SHMode; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sz = shSize(spec.size);
  const { L, W } = sz;
  const sat = shSatin(spec.satin), ink = shInk(spec.ink), fnt = shFont(spec.font);
  const mask = mode === 'mask', print = mode === 'print';
  const bg = mask ? '#000000' : sat.bg;
  const inkFill = mask ? '#FFFFFF' : mode === 'front' && ink.foil ? `url(#${uid}g)` : ink.flat;
  const band = mask ? '#000000' : sat.band;
  const fz = frontZone(L), bz = backZone(L);
  const title = (data.title || '').trim();
  const sub = (name ?? data.sub ?? '').trim();
  const backTxt = (data.back || '').trim();

  // ---- khối chữ đoạn trước ----
  const script = !!fnt.script;
  const lsT = script ? 0 : fnt.family === 'Oswald' ? 0.06 : 0.04;
  const stripe = spec.layout === 'stripe';
  const inner = stripe ? W * 0.2 : spec.layout === 'classic' ? W * 0.13 : W * 0.08; // mép trên/dưới dành cho viền
  const avail = W - inner * 2;
  const deco = spec.layout === 'laurel' ? W * 1.15 : spec.layout === 'crown' ? W * 0.75 : spec.layout === 'classic' || spec.layout === 'script' ? W * 0.45 : 0;
  const zoneW = fz.b - fz.a;
  const capK = script ? 0.5 : 0.72; // chiều cao chữ hoa / cỡ chữ
  const TS = { fam: fnt.family, wt: fnt.weight };
  const tw = (t: string, z: number) => textW(t, z, { ...TS, ls: z * lsT });
  const tMax = sub ? avail * (script ? 0.92 : 0.62) / (script ? 1.35 : 1) : avail * (script ? 1.15 : 0.82) / (script ? 1.2 : 1);
  // 1 dòng; quá dài (chữ co nhỏ) → ngắt 2 dòng cân nhau nếu được chữ to hơn rõ
  const words = title.split(/\s+/).filter(Boolean);
  const fitTitle = (maxTW: number): [string[], number] => {
    let lines = title ? [title] : [];
    let z = title ? fitTo(title, maxTW, tMax, fnt.family, fnt.weight, lsT) : 0;
    if (words.length >= 2 && z < avail * 0.32) {
      let best: [string, string] | null = null, bestW = Infinity;
      for (let i = 1; i < words.length; i++) {
        const l1 = words.slice(0, i).join(' '), l2 = words.slice(i).join(' ');
        const w = Math.max(tw(l1, 10), tw(l2, 10));
        if (w < bestW) { bestW = w; best = [l1, l2]; }
      }
      if (best) { const z2 = Math.min(tMax * 0.62, (10 * maxTW) / bestW); if (z2 > z * 1.15) { lines = best; z = z2; } }
    }
    return [lines, z];
  };
  // chữ dài mà vẫn nhỏ → bỏ hoa văn 2 bên (nguyệt quế, vương miện…) nhường chỗ cho chữ
  let decoOn = deco > 0;
  let maxTW = zoneW - deco * 2 - 20;
  let [tLines, tS] = fitTitle(maxTW);
  if (decoOn && tS < avail * 0.3) { decoOn = false; maxTW = zoneW - 20; [tLines, tS] = fitTitle(maxTW); }
  let sS = sub ? Math.min(avail * 0.2, fitTo(sub, maxTW, avail * 0.2, SUB, 600, 0.12)) : 0;
  // xếp dọc: các dòng chữ chính + dòng phụ; cao quá bề rộng băng → thu cả khối
  const lineGap = () => tS * (script ? 0.36 : 0.3); // chừa chỗ dấu chồng tiếng Việt (Ừ, Ỗ…) của dòng dưới
  const subGap = () => (sub ? Math.max(W * 0.04, tS * 0.12) + (script ? tS * 0.14 : 0) : 0);
  const blockH = () => tLines.length * tS * capK + (tLines.length - 1) * lineGap() + (sub ? subGap() + sS * 0.72 : 0);
  if (blockH() > avail) { const k = avail / blockH(); tS *= k; sS *= k; }
  const cx = (fz.a + fz.b) / 2;
  const top = inner + (avail - blockH()) / 2 + (script ? tS * 0.04 : 0);
  const tBases = tLines.map((_, i) => top + tS * capK * (i + 1) + lineGap() * i);
  const tBase = tBases[tBases.length - 1] ?? top;
  const sBase = tBase + subGap() + sS * 0.72;
  const tWidth = Math.max(0, ...tLines.map((l) => tw(l, tS)));

  const decoEls: ReactNode[] = [];
  const midY = W / 2;
  const tL = cx - tWidth / 2, tR = cx + tWidth / 2;
  if (!decoOn) { /* nhường chỗ cho chữ dài */ } else if (spec.layout === 'classic') {
    for (const s of [-1, 1]) decoEls.push(<path key={`d${s}`} d={diamond(s < 0 ? tL - W * 0.22 : tR + W * 0.22, midY, W * 0.09)} fill={inkFill} />,
      <path key={`l${s}`} d={`M${f1(s < 0 ? tL - W * 0.36 : tR + W * 0.36)} ${f1(midY)}H${f1(s < 0 ? tL - W * 0.5 : tR + W * 0.5)}`} stroke={inkFill} strokeWidth={0.9} />);
  } else if (spec.layout === 'laurel') {
    decoEls.push(<Laurel key="ll" x0={tL - W * 0.12} cy={midY + W * 0.04} len={W * 0.85} dir={-1} fill={inkFill} />);
    decoEls.push(<Laurel key="lr" x0={tR + W * 0.12} cy={midY + W * 0.04} len={W * 0.85} dir={1} fill={inkFill} />);
  } else if (spec.layout === 'crown') {
    decoEls.push(<path key="cr" d={crownPath(tL - W * 0.42, midY, W * 0.34)} fill={inkFill} />);
    decoEls.push(<path key="cr2" d={starPath(tR + W * 0.3, midY, W * 0.13)} fill={inkFill} />);
  } else if (spec.layout === 'script') {
    for (const s of [-1, 1]) decoEls.push(<path key={`h${s}`} d={heartPath(s < 0 ? tL - W * 0.22 : tR + W * 0.22, midY, W * 0.1)} fill={inkFill} />);
  }

  // ---- trang trí suốt chiều dài ----
  const longEls: ReactNode[] = [];
  if (spec.layout === 'classic') {
    for (const y of [W * 0.06, W * 0.94]) longEls.push(<rect key={`a${y}`} x={0} y={f1(y - 0.7)} width={L} height={1.4} fill={inkFill} />);
    for (const y of [W * 0.1, W * 0.9]) longEls.push(<rect key={`b${y}`} x={0} y={f1(y - 0.3)} width={L} height={0.6} fill={inkFill} />);
  } else if (stripe) {
    for (const y of [0, W - W * 0.13]) longEls.push(<rect key={`s${y}`} x={0} y={f1(y)} width={L} height={f1(W * 0.13)} fill={band} />);
    for (const y of [W * 0.13 + 1.6, W - W * 0.13 - 1.6]) longEls.push(<rect key={`t${y}`} x={0} y={f1(y - 0.4)} width={L} height={0.8} fill={inkFill} />);
  } else if (spec.layout === 'laurel' || spec.layout === 'crown') {
    for (const y of [W * 0.07, W * 0.93]) longEls.push(<rect key={`a${y}`} x={0} y={f1(y - 0.5)} width={L} height={1} fill={inkFill} />);
  } else if (spec.layout === 'script') {
    for (const y of [W * 0.07, W * 0.93]) for (let x = 6; x < L; x += 9) longEls.push(<circle key={`p${y}${x}`} cx={x} cy={f1(y)} r={0.9} fill={inkFill} />);
  } else if (spec.layout === 'stars') {
    // sao rắc đều, chừa khoảng quanh chữ
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let x = 30; x < L - 20; x += 38) {
      const y = W * (0.14 + rnd() * 0.72), r = W * (0.035 + rnd() * 0.05);
      const nearText = x > tL - 40 && x < tR + 40 && y > top - 8 && y < (sub ? sBase : tBase) + 8;
      if (nearText) continue;
      longEls.push(<path key={`st${x}`} d={starPath(x + rnd() * 14, y, r, rnd() * 2)} fill={inkFill} opacity={mask ? 1 : 0.85} />);
    }
  }

  // ---- chữ nhỏ đoạn sau lưng ----
  const bS = backTxt ? fitTo(backTxt, (bz.b - bz.a) * 0.6, W * 0.2, SUB, 800, 0.1) : 0;

  const b = print ? SH_BLEED_MM : 0;
  const vb = mode === 'front' ? `${f1(fz.a - 70)} 0 ${f1(zoneW + 140)} ${W}` : `${-b} ${-b} ${L + b * 2} ${W + b * 2}`;
  const mark = '#E6007E';

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-sash={mode} textRendering="geometricPrecision">
      <defs>
        <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={ink.g[0]} /><stop offset="0.5" stopColor={ink.g[1]} /><stop offset="1" stopColor={ink.g[2]} />
        </linearGradient>
        <linearGradient id={`${uid}sh`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0" /><stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0.16" />
          <stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.02" /><stop offset="1" stopColor="#000000" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect x={-b - 1} y={-b - 1} width={L + b * 2 + 2} height={W + b * 2 + 2} fill={bg} />
      {longEls}
      {decoEls}
      {tLines.map((ln, i) => (
        <text key={i} x={f1(cx)} y={f1(tBases[i])} textAnchor="middle" fontFamily={`"${fnt.family}"`} fontWeight={fnt.weight} fontSize={f1(tS)}
          letterSpacing={lsT ? f1(tS * lsT) : undefined} fill={inkFill} data-role="title">{ln}</text>
      ))}
      {sub && (
        <text x={f1(cx)} y={f1(sBase)} textAnchor="middle" fontFamily={`"${SUB}"`} fontWeight={600} fontSize={f1(sS)}
          letterSpacing={f1(sS * 0.12)} fill={inkFill} data-role="sub">{sub}</text>
      )}
      {backTxt && mode !== 'front' && (
        <text x={f1((bz.a + bz.b) / 2)} y={f1(W / 2 + bS * 0.36)} textAnchor="middle" fontFamily={`"${SUB}"`} fontWeight={800} fontSize={f1(bS)}
          letterSpacing={f1(bS * 0.1)} fill={inkFill} data-role="back">{backTxt}</text>
      )}
      {mode === 'front' && <rect x={f1(fz.a - 71)} y={0} width={f1(zoneW + 142)} height={W} fill={`url(#${uid}sh)`} />}
      {print && (
        <g fill="none" stroke={mark} strokeWidth={0.5} data-marks="1">
          {/* nếp vai + 2 đường may nối ở hông */}
          <path d={`M${L / 2} ${-b}V${W + b}`} strokeDasharray="4 3" />
          <path d={`M${SH_SEW_MM} ${-b}V${W + b}M${L - SH_SEW_MM} ${-b}V${W + b}`} strokeDasharray="1.5 2" />
        </g>
      )}
    </svg>
  );
}
