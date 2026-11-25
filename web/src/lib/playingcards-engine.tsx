'use client';
// Bộ bài in logo: 52 lá + 2 Joker + mặt lưng thương hiệu + hộp đựng (tuck box) — VẼ 100% BẰNG CODE.
// Chất bài, pip, quân J/Q/K là hình học tự thiết kế (không chép bộ bài có sẵn). Mặt lưng ép đối xứng
// xoay 180°: mọi chi tiết vẽ ở nửa trên rồi nhân bản xoay 180° quanh tâm → lật ngược bài vẫn y hệt.
// Đơn vị: mm. Lá bài poker 63×88, bo góc 3.5, lề xén 2mm.

import { useEffect, useState, type CSSProperties, type ReactElement, type ReactNode } from 'react';

export const PC_W = 63, PC_H = 88, PC_R = 3.5, PC_BLEED = 2;
const CX = PC_W / 2, CY = PC_H / 2;

// ---------- font ----------
export const PC_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@800&family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Cormorant+Garamond:wght@700&display=swap');`;
const F_SERIF = "'Playfair Display'", F_SANS = "'Montserrat'", F_BODY = "'Be Vietnam Pro'", F_CLASSIC = "'Cormorant Garamond'";

export function usePCFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pc-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pc-fonts'; link.rel = 'stylesheet';
        link.href = PC_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Playfair Display"', '800 40px "Montserrat"', '600 30px "Be Vietnam Pro"', '800 30px "Be Vietnam Pro"', '700 30px "Cormorant Garamond"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ AKQJ 10')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// đo chữ thật (font đã nạp) → co cỡ cho vừa bề rộng
let measureCtx: CanvasRenderingContext2D | null = null;
function textW(text: string, family: string, weight: number, size: number, spacing = 0): number {
  if (typeof document === 'undefined') return text.length * size * 0.6;
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * size * 0.6;
  measureCtx.font = `${weight} 100px ${family}`;
  return (measureCtx.measureText(text).width / 100) * size + Math.max(0, text.length - 1) * spacing;
}
const fitSize = (text: string, family: string, weight: number, max: number, maxW: number, min: number, spacing = 0) => {
  const w = textW(text, family, weight, max, spacing * (max / max));
  return w <= maxW ? max : Math.max(min, (max * maxW) / w);
};
// tên dài: nếu 1 dòng phải co dưới ~72% cỡ chuẩn → bẻ 2 dòng cân nhau (không bỏ chữ nào, không lòi khung)
function brandLines(text: string, family: string, weight: number, max: number, maxW: number, spacing = 0): { lines: string[]; size: number } {
  const one = fitSize(text, family, weight, max, maxW, 0.1, spacing);
  const ws = text.split(/\s+/).filter(Boolean);
  if (one >= max * 0.72 || ws.length < 2) return { lines: [text], size: one };
  let best = { lines: [text], size: one };
  for (let k = 1; k < ws.length; k++) {
    const a = ws.slice(0, k).join(' '), b = ws.slice(k).join(' ');
    const size = Math.min(fitSize(a, family, weight, max * 0.86, maxW, 0.1, spacing), fitSize(b, family, weight, max * 0.86, maxW, 0.1, spacing));
    if (size > best.size) best = { lines: [a, b], size };
  }
  return best;
}

// ---------- chất bài ----------
export type Suit = 'S' | 'H' | 'D' | 'C';
export const SUITS: Suit[] = ['S', 'H', 'D', 'C'];
export const SUIT_NAME: Record<Suit, string> = { S: 'Bích', H: 'Cơ', D: 'Rô', C: 'Chuồn' };
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;
export type Rank = (typeof RANKS)[number];
export type CardId = { suit: Suit; rank: Rank } | { joker: 'color' | 'mono' };
export const isRed = (s: Suit) => s === 'H' || s === 'D';

// path trong hộp -50..50 (tâm 0,0) — tự vẽ
const SUIT_D: Record<Suit, string> = {
  H: 'M0 40 C -12 28 -48 8 -48 -16 C -48 -38 -22 -46 0 -24 C 22 -46 48 -38 48 -16 C 48 8 12 28 0 40 Z',
  D: 'M0 -48 L35 0 L0 48 L-35 0 Z',
  S: 'M0 -46 C 12 -32 46 -14 46 8 C 46 26 26 34 7 20 C 9 32 15 41 22 46 L -22 46 C -15 41 -9 32 -7 20 C -26 34 -46 26 -46 8 C -46 -14 -12 -32 0 -46 Z',
  C: 'M0 -42 m -19 0 a 19 19 0 1 0 38 0 a 19 19 0 1 0 -38 0 M-21 6 m -19 0 a 19 19 0 1 0 38 0 a 19 19 0 1 0 -38 0 M21 6 m -19 0 a 19 19 0 1 0 38 0 a 19 19 0 1 0 -38 0 M-5 8 C -5 28 -11 40 -22 46 L 22 46 C 11 40 5 28 5 8 Z',
};
export function SuitShape({ suit, x, y, size, rot = 0, fill, pip }: { suit: Suit; x: number; y: number; size: number; rot?: number; fill: string; pip?: boolean }) {
  return <path d={SUIT_D[suit]} fill={fill} transform={`translate(${f(x)} ${f(y)}) rotate(${rot}) scale(${f(size / 100)})`} data-pip={pip ? '1' : undefined} />;
}
const f = (n: number) => Math.round(n * 1000) / 1000;

// toạ độ pip chuẩn (x: trái/giữa/phải, y theo hàng) — nửa dưới xoay 180°
const XL = 18.5, XC = CX, XR = PC_W - 18.5;
const Y1 = 17.5, Y4 = PC_H - 17.5, YM = CY;
const Y2 = Y1 + (Y4 - Y1) / 3, Y3 = Y1 + ((Y4 - Y1) * 2) / 3;
const PIPS: Record<string, [number, number][]> = {
  '2': [[XC, Y1], [XC, Y4]],
  '3': [[XC, Y1], [XC, YM], [XC, Y4]],
  '4': [[XL, Y1], [XR, Y1], [XL, Y4], [XR, Y4]],
  '5': [[XL, Y1], [XR, Y1], [XC, YM], [XL, Y4], [XR, Y4]],
  '6': [[XL, Y1], [XR, Y1], [XL, YM], [XR, YM], [XL, Y4], [XR, Y4]],
  '7': [[XL, Y1], [XR, Y1], [XC, (Y1 + YM) / 2], [XL, YM], [XR, YM], [XL, Y4], [XR, Y4]],
  '8': [[XL, Y1], [XR, Y1], [XC, (Y1 + YM) / 2], [XL, YM], [XR, YM], [XC, (YM + Y4) / 2], [XL, Y4], [XR, Y4]],
  '9': [[XL, Y1], [XR, Y1], [XL, Y2], [XR, Y2], [XC, YM], [XL, Y3], [XR, Y3], [XL, Y4], [XR, Y4]],
  '10': [[XL, Y1], [XR, Y1], [XC, (Y1 + Y2) / 2], [XL, Y2], [XR, Y2], [XL, Y3], [XR, Y3], [XC, (Y3 + Y4) / 2], [XL, Y4], [XR, Y4]],
};
export const pipCount = (r: Rank) => (r === 'A' ? 1 : PIPS[r] ? PIPS[r].length : 0);

// ---------- bảng màu + kiểu ----------
export interface PCPalette { id: string; name: string; bg: string; fg: string; accent: string; ink: string; dark: boolean }
export const PC_PALETTES: PCPalette[] = [
  { id: 'red', name: 'Đỏ Tết · vàng kim', bg: '#A30F1D', fg: '#D9A84E', accent: '#F2CB63', ink: '#FFF3DC', dark: true },
  { id: 'navy', name: 'Navy · vàng', bg: '#15294D', fg: '#C9A24B', accent: '#E8C86E', ink: '#F6EEDB', dark: true },
  { id: 'black', name: 'Đen · nhũ vàng', bg: '#121212', fg: '#B8963F', accent: '#E3C46B', ink: '#F4EBD5', dark: true },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0E5D59', fg: '#8FD2C7', accent: '#F2C14E', ink: '#F1FBF9', dark: true },
  { id: 'purple', name: 'Tím hoàng gia', bg: '#3B1D5E', fg: '#B49AE0', accent: '#F4C86B', ink: '#F7F0FF', dark: true },
  { id: 'forest', name: 'Xanh rêu', bg: '#1F4132', fg: '#8DBE98', accent: '#E8C468', ink: '#EFF7F0', dark: true },
  { id: 'orange', name: 'Cam đất', bg: '#C2531C', fg: '#FFD5AA', accent: '#FFF0DA', ink: '#FFF7EE', dark: true },
  { id: 'blush', name: 'Hồng pastel', bg: '#F3D5D1', fg: '#C46A6C', accent: '#9C3D47', ink: '#6A2630', dark: false },
];
export const pcPalette = (id: string) => PC_PALETTES.find((p) => p.id === id) || PC_PALETTES[0];

export interface PCBackLayout { id: string; name: string }
export const PC_BACKS: PCBackLayout[] = [
  { id: 'lattice', name: 'Mắt lưới' },
  { id: 'rays', name: 'Hào quang' },
  { id: 'frame', name: 'Khung cổ điển' },
  { id: 'dots', name: 'Chấm bi' },
  { id: 'waves', name: 'Vảy sóng' },
  { id: 'lotus', name: 'Hoa sen' },
  { id: 'mai', name: 'Hoa mai Tết' },
  { id: 'stripes', name: 'Sọc chéo' },
];
export interface PCFaceStyle { id: string; name: string; note: string }
export const PC_FACES: PCFaceStyle[] = [
  { id: 'classic', name: 'Cổ điển', note: 'Chữ có chân, quân bài khoác áo choàng hoạ tiết' },
  { id: 'modern', name: 'Hiện đại', note: 'Chữ không chân, quân bài khối hình học' },
  { id: 'aodai', name: 'Áo dài Việt', note: 'Vua khăn đóng · Đầm nón lá · Bồi khăn vấn' },
];

export interface PCSpec { back: string; palette: string; face: string }
export interface PCTemplate { id: string; name: string; spec: PCSpec }
export const PC_TEMPLATES: PCTemplate[] = [
  { id: 'lattice-navy', name: 'Mắt lưới · Navy', spec: { back: 'lattice', palette: 'navy', face: 'classic' } },
  { id: 'mai-red', name: 'Hoa mai Tết · Đỏ', spec: { back: 'mai', palette: 'red', face: 'aodai' } },
  { id: 'frame-black', name: 'Khung cổ điển · Đen', spec: { back: 'frame', palette: 'black', face: 'classic' } },
  { id: 'lotus-red', name: 'Hoa sen · Đỏ', spec: { back: 'lotus', palette: 'red', face: 'aodai' } },
  { id: 'rays-purple', name: 'Hào quang · Tím', spec: { back: 'rays', palette: 'purple', face: 'classic' } },
  { id: 'dots-teal', name: 'Chấm bi · Ngọc', spec: { back: 'dots', palette: 'teal', face: 'modern' } },
  { id: 'waves-navy', name: 'Vảy sóng · Navy', spec: { back: 'waves', palette: 'navy', face: 'aodai' } },
  { id: 'stripes-orange', name: 'Sọc chéo · Cam', spec: { back: 'stripes', palette: 'orange', face: 'modern' } },
  { id: 'lattice-forest', name: 'Mắt lưới · Rêu', spec: { back: 'lattice', palette: 'forest', face: 'classic' } },
  { id: 'dots-blush', name: 'Chấm bi · Hồng', spec: { back: 'dots', palette: 'blush', face: 'modern' } },
];

export interface PCData { brand: string; slogan: string; web: string; logo?: string }
export const defaultPCData = (): PCData => ({ brand: 'AN KHANG', slogan: 'Xuân Đinh Mùi 2027', web: 'ankhang.vn', logo: '' });

const GENERIC = new Set(['công', 'ty', 'tnhh', 'cổ', 'phần', 'cp', 'tm', 'dv', 'thương', 'mại', 'dịch', 'vụ', 'the', 'quán', 'nhà', 'hàng', 'cửa', 'tiệm']);
export function monogram(brand: string): string {
  const ws = (brand || '').trim().split(/\s+/).filter(Boolean);
  const key = ws.filter((w) => !GENERIC.has(w.toLowerCase()));
  const use = key.length ? key : ws;
  return (use.slice(0, 2).map((w) => w[0]).join('') || 'M').toUpperCase();
}

// ---------- tiện ích hình ----------
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${f(x + r)} ${f(y)} H${f(x + w - r)} A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)} V${f(y + h - r)} A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)} H${f(x + r)} A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)} V${f(y + r)} A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)} Z`;
export const cardOutline = (inset = 0) => rr(inset, inset, PC_W - inset * 2, PC_H - inset * 2, Math.max(0.5, PC_R - inset));
const star = (cx: number, cy: number, ro: number, ri: number, n: number, rot = -90) => {
  const pts: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = ((rot + (i * 180) / n) * Math.PI) / 180, r = i % 2 ? ri : ro;
    pts.push(`${f(cx + Math.cos(a) * r)},${f(cy + Math.sin(a) * r)}`);
  }
  return pts.join(' ');
};
// hoa 5 cánh (mai)
function Blossom({ x, y, r, fill, center }: { x: number; y: number; r: number; fill: string; center: string }) {
  return (
    <g transform={`translate(${f(x)} ${f(y)})`}>
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={0} cy={-r * 0.55} rx={r * 0.42} ry={r * 0.55} fill={fill} transform={`rotate(${i * 72})`} />)}
      <circle r={r * 0.28} fill={center} />
    </g>
  );
}

// Logo/monogram trong huy hiệu tròn
function LogoBadge({ x, y, r, data, pal, ring = true }: { x: number; y: number; r: number; data: PCData; pal: PCPalette; ring?: boolean }) {
  const mono = monogram(data.brand);
  return (
    <g>
      {ring && <circle cx={x} cy={y} r={r} fill={pal.bg} stroke={pal.accent} strokeWidth={r * 0.08} />}
      {data.logo
        ? <image href={data.logo} x={x - r * 0.72} y={y - r * 0.72} width={r * 1.44} height={r * 1.44} preserveAspectRatio="xMidYMid meet" />
        : <text x={x} y={y + r * 0.34} textAnchor="middle" fontFamily={F_SERIF} fontWeight={800} fontSize={r * (mono.length > 1 ? 0.92 : 1.1)} fill={pal.accent}>{mono}</text>}
    </g>
  );
}

// ---------- MẶT LƯNG (đối xứng xoay 180°) ----------
// nửa trên: pattern + logo + tên, cắt ở đường giữa; nhân bản xoay 180° → đối xứng tuyệt đối.
function backHalf(spec: PCSpec, data: PCData, pal: PCPalette, b: number, uid: string): ReactNode {
  const L = spec.back;
  const top = -b, bot = CY, left = -b, right = PC_W + b;
  const parts: ReactNode[] = [];
  const stroke = pal.fg;
  if (L === 'lattice') {
    const sp = 5.2;
    for (let k = -30; k <= 30; k++) {
      const o = k * sp;
      parts.push(<line key={`a${k}`} x1={CX + o - 60} y1={CY - 60} x2={CX + o + 60} y2={CY + 60} stroke={stroke} strokeWidth={0.32} opacity={0.75} />);
      parts.push(<line key={`b${k}`} x1={CX + o + 60} y1={CY - 60} x2={CX + o - 60} y2={CY + 60} stroke={stroke} strokeWidth={0.32} opacity={0.75} />);
    }
    for (let i = -8; i <= 8; i++) for (let j = -10; j <= 0; j++) {
      parts.push(<circle key={`d${i}_${j}`} cx={CX + i * sp} cy={CY + j * sp} r={0.55} fill={pal.accent} opacity={0.9} />);
    }
  } else if (L === 'rays') {
    const n = 36;
    for (let i = 0; i < n; i++) {
      if (i % 2) continue;
      const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, R = 90;
      parts.push(<polygon key={i} points={`${CX},${CY} ${f(CX + Math.cos(a0) * R)},${f(CY + Math.sin(a0) * R)} ${f(CX + Math.cos(a1) * R)},${f(CY + Math.sin(a1) * R)}`} fill={stroke} opacity={0.35} />);
    }
    for (let k = 1; k <= 6; k++) parts.push(<circle key={`c${k}`} cx={CX} cy={CY} r={k * 7.5} fill="none" stroke={pal.accent} strokeWidth={0.25} opacity={0.6} />);
  } else if (L === 'frame') {
    // ô quả trám trong khung
    for (let i = -6; i <= 6; i++) for (let j = -9; j <= 0; j++) {
      const x = CX + i * 6 + (j % 2 ? 3 : 0), y = CY + j * 4.4;
      parts.push(<polygon key={`q${i}_${j}`} points={`${f(x)},${f(y - 1.7)} ${f(x + 1.7)},${f(y)} ${f(x)},${f(y + 1.7)} ${f(x - 1.7)},${f(y)}`} fill={stroke} opacity={0.55} />);
    }
    // hoa văn góc
    for (const sx of [1, -1]) {
      const x0 = sx > 0 ? 8 : PC_W - 8;
      parts.push(<path key={`fl${sx}`} d={`M${x0} ${f(8 + 9)} Q${x0} 8 ${f(x0 + sx * 9)} 8 M${f(x0 + sx * 2.5)} ${f(8 + 5)} Q${f(x0 + sx * 2.5)} ${f(8 + 2.5)} ${f(x0 + sx * 5)} ${f(8 + 2.5)}`} fill="none" stroke={pal.accent} strokeWidth={0.6} strokeLinecap="round" />);
      parts.push(<circle key={`fd${sx}`} cx={f(x0 + sx * 1.6)} cy={9.6} r={0.9} fill={pal.accent} />);
    }
  } else if (L === 'dots') {
    const sp = 4.4;
    for (let i = -9; i <= 9; i++) for (let j = -12; j <= 0; j++) {
      const x = CX + i * sp + (j % 2 ? sp / 2 : 0), y = CY + j * sp * 0.87;
      const d = Math.hypot(x - CX, (y - CY) * 0.8);
      const r = Math.max(0.25, 1.35 - d * 0.03);
      parts.push(<circle key={`p${i}_${j}`} cx={f(x)} cy={f(y)} r={f(r)} fill={stroke} opacity={0.85} />);
    }
  } else if (L === 'waves') {
    // vảy sóng (seigaiha/vảy cá) — hàng so le
    const R = 4.2;
    for (let j = -14; j <= 1; j++) for (let i = -9; i <= 9; i++) {
      const x = CX + i * R * 2 + (j % 2 ? R : 0), y = CY + j * R * 0.95;
      for (let k = 3; k >= 1; k--) parts.push(<circle key={`w${i}_${j}_${k}`} cx={f(x)} cy={f(y)} r={f((R * k) / 3)} fill={k % 2 ? pal.bg : stroke} stroke={stroke} strokeWidth={0.2} opacity={k % 2 ? 1 : 0.55} />);
    }
  } else if (L === 'lotus') {
    // sen nhỏ lặp + cánh sen lớn quanh huy hiệu
    for (let i = -4; i <= 4; i++) for (let j = -5; j <= -1; j++) {
      const x = CX + i * 9 + (j % 2 ? 4.5 : 0), y = CY + j * 8.2;
      parts.push(<g key={`l${i}_${j}`} transform={`translate(${f(x)} ${f(y)})`} opacity={0.6}>
        <path d="M0 -2.6 C 1.4 -1.2 1.4 1 0 1.6 C -1.4 1 -1.4 -1.2 0 -2.6 Z" fill={stroke} />
        <path d="M0 1.6 C -2.4 1.4 -3 -0.4 -2.8 -1.6 C -1.6 -0.8 -0.8 0.4 0 1.6 Z M0 1.6 C 2.4 1.4 3 -0.4 2.8 -1.6 C 1.6 -0.8 0.8 0.4 0 1.6 Z" fill={stroke} />
      </g>);
    }
    // cánh sen lớn xoè quanh huy hiệu (nửa trên: -90°..90°)
    for (let i = 0; i < 9; i++) {
      const a = -80 + (i * 160) / 8;
      parts.push(<path key={`pet${i}`} d="M0 -9.4 C 2.7 -11.8 3.3 -14.2 0 -16.2 C -3.3 -14.2 -2.7 -11.8 0 -9.4 Z" fill={pal.accent} opacity={0.9} transform={`translate(${CX} ${CY}) rotate(${a})`} />);
    }
  } else if (L === 'mai') {
    const pts: [number, number, number][] = [[10, 12, 2.6], [22, 7, 2.0], [52, 14, 2.4], [40, 9, 1.6], [7, 29, 1.8], [56, 30, 2.2], [17, 38, 1.5], [47, 40, 1.7], [31, 18, 1.4]];
    parts.push(<path key="br1" d={`M-3 22 C 6 18 12 14 22 7 M8 17 C 10 13 9 9 10 6 M66 26 C 58 22 52 18 40 9`} fill="none" stroke={stroke} strokeWidth={0.7} strokeLinecap="round" opacity={0.85} />);
    pts.forEach(([x, y, r], i) => parts.push(<Blossom key={`m${i}`} x={x} y={y} r={r} fill={pal.accent} center={pal.bg} />));
  } else { // stripes
    for (let k = -20; k <= 20; k++) {
      const o = k * 6;
      // sọc canh giữa offset → xoay 180° trùng khít, không lộ đường nối giữa
      parts.push(<polygon key={`s${k}`} points={`${f(CX + o - 61.2)},${f(CY + 60)} ${f(CX + o - 58.8)},${f(CY + 60)} ${f(CX + o + 61.2)},${f(CY - 60)} ${f(CX + o + 58.8)},${f(CY - 60)}`} fill={stroke} opacity={0.5} />);
    }
  }

  // logo + tên ở 1/4 trên (bản xoay sẽ hiện ở 1/4 dưới)
  const name = (data.brand || '').trim();
  const bl = brandLines(name, F_SERIF, 800, 4.6, PC_W - 24, 0.3);
  const nSize = bl.size, two = bl.lines.length > 1;
  const lineH = nSize * 1.12;
  const plateW = Math.max(...bl.lines.map((ln) => textW(ln, F_SERIF, 800, nSize, 0.3))) + 6.4;
  const baseY = two ? 21.2 : 22.6;
  const hasText = !!name;
  const showSlogan = !!data.slogan && L !== 'rays';
  return (
    <g clipPath={`url(#${uid}-half)`}>
      <rect x={left} y={top} width={right - left} height={bot - top} fill={pal.bg} />
      {parts}
      {/* bảng tên */}
      {hasText && (
        <g>
          <rect x={CX - plateW / 2} y={baseY - nSize * 0.95} width={plateW} height={nSize * 1.45 + (two ? lineH : 0)} rx={nSize * 0.3} fill={pal.bg} stroke={pal.accent} strokeWidth={0.3} />
          {bl.lines.map((ln, i) => <text key={i} x={CX} y={f(baseY + i * lineH)} textAnchor="middle" fontFamily={F_SERIF} fontWeight={800} fontSize={f(nSize)} letterSpacing={0.3} fill={pal.ink} data-pc-text="1">{ln}</text>)}
        </g>
      )}
      <LogoBadge x={CX} y={13.2} r={4.2} data={data} pal={pal} />
      {showSlogan && <text x={CX} y={two ? 29.4 : 27.8} textAnchor="middle" fontFamily={F_BODY} fontWeight={600} fontSize={f(fitSize(data.slogan, F_BODY, 600, 2.1, PC_W - 24, 1.4))} fill={pal.ink} opacity={0.9} data-pc-text="1">{data.slogan}</text>}
    </g>
  );
}

function BackArt({ spec, data, b, uid }: { spec: PCSpec; data: PCData; b: number; uid: string }) {
  const pal = pcPalette(spec.palette);
  return (
    <>
      <defs>
        <clipPath id={`${uid}-half`}><rect x={-b - 1} y={-b - 1} width={PC_W + b * 2 + 2} height={CY + b + 1} /></clipPath>
      </defs>
      <rect x={-b} y={-b} width={PC_W + b * 2} height={PC_H + b * 2} fill={pal.bg} />
      {backHalf(spec, data, pal, b, uid)}
      <g transform={`rotate(180 ${CX} ${CY})`}>{backHalf(spec, data, pal, b, `${uid}`)}</g>
      {/* khung viền + huy hiệu giữa: tự đối xứng */}
      <path d={cardOutline(3)} fill="none" stroke={pal.accent} strokeWidth={0.5} />
      <path d={cardOutline(4.1)} fill="none" stroke={pal.accent} strokeWidth={0.22} opacity={0.8} />
      <circle cx={CX} cy={CY} r={8.6} fill={pal.bg} stroke={pal.accent} strokeWidth={0.5} />
      <circle cx={CX} cy={CY} r={7.4} fill="none" stroke={pal.accent} strokeWidth={0.2} />
      <polygon points={star(CX, CY, 6.2, 2.6, 8, -90)} fill={pal.accent} />
      <circle cx={CX} cy={CY} r={1.6} fill={pal.bg} />
    </>
  );
}

export function CardBackSvg({ spec, data, bleed = false, style, uid = 'pcb' }: { spec: PCSpec; data: PCData; bleed?: boolean; style?: CSSProperties; uid?: string }) {
  const b = bleed ? PC_BLEED : 0;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-b} ${-b} ${PC_W + b * 2} ${PC_H + b * 2}`} width={`${PC_W + b * 2}mm`} height={`${PC_H + b * 2}mm`} style={style} data-pc-back="1">
      {bleed ? <BackArt spec={spec} data={data} b={b} uid={uid} /> : (
        <>
          <defs><clipPath id={`${uid}-card`}><path d={cardOutline()} /></clipPath></defs>
          <g clipPath={`url(#${uid}-card)`}><BackArt spec={spec} data={data} b={0} uid={uid} /></g>
        </>
      )}
    </svg>
  );
}

// ---------- MẶT BÀI ----------
const RED = '#C51A2C', BLACK = '#17171A', GOLD = '#C9A24B', SKIN = '#F2D3B2';

// góc bài: chữ + chất nhỏ (góc dưới xoay 180°)
function Corner({ rank, suit, color, face }: { rank: string; suit?: Suit; color: string; face: string }) {
  const fam = face === 'modern' ? F_SANS : F_SERIF;
  const ten = rank === '10';
  return (
    <g>
      <text x={5.6} y={10.4} textAnchor="middle" fontFamily={fam} fontWeight={800} fontSize={ten ? 6.2 : 7.2} letterSpacing={ten ? -0.5 : 0} fill={color} data-pc-text="1">{rank}</text>
      {suit && <SuitShape suit={suit} x={5.6} y={15} size={4.6} fill={color} />}
    </g>
  );
}

// quân J/Q/K: nửa trên vẽ hình người hình học, nửa dưới = bản xoay 180° (bài 2 đầu)
function CourtHalf({ rank, suit, face, pal }: { rank: 'J' | 'Q' | 'K'; suit: Suit; face: string; pal: PCPalette }) {
  const red = isRed(suit);
  const ink = red ? RED : BLACK;
  const robe = red ? RED : (pal.dark ? pal.bg : '#1E2F57');
  const robe2 = red ? '#8E1020' : '#0E1830';
  const trim = GOLD;
  const hx = CX, hy = 23.5;
  const parts: ReactNode[] = [];
  // nền ô
  parts.push(<rect key="bg" x={11.5} y={10.5} width={PC_W - 23} height={CY - 10.5} fill={face === 'modern' ? '#F6F3EC' : '#FBF6EA'} />);
  if (face === 'classic') {
    for (let i = 0; i < 10; i++) parts.push(<line key={`bgl${i}`} x1={11.5 + i * 4.4} y1={10.5} x2={11.5 + i * 4.4 - 10} y2={CY} stroke={ink} strokeWidth={0.12} opacity={0.25} />);
  }
  // thân áo
  if (face === 'modern') {
    parts.push(<polygon key="body" points={`${hx - 13},${CY} ${hx - 9},${hy + 8} ${hx + 9},${hy + 8} ${hx + 13},${CY}`} fill={robe} />);
    parts.push(<polygon key="v" points={`${hx - 4},${hy + 8} ${hx},${hy + 14} ${hx + 4},${hy + 8}`} fill={trim} />);
    for (let i = 0; i < 4; i++) parts.push(<rect key={`blk${i}`} x={hx - 11 + i * 5.6} y={CY - 4.5} width={4.2} height={4.5} fill={i % 2 ? trim : robe2} />);
  } else if (face === 'aodai') {
    // áo dài: thân dài, cổ đứng, hàng khuy chéo
    parts.push(<path key="body" d={`M${hx - 12} ${CY} L${hx - 9.5} ${hy + 7.5} Q${hx} ${hy + 5} ${hx + 9.5} ${hy + 7.5} L${hx + 12} ${CY} Z`} fill={robe} />);
    parts.push(<rect key="collar" x={hx - 2.6} y={hy + 4.6} width={5.2} height={2.6} rx={0.8} fill={trim} />);
    parts.push(<path key="placket" d={`M${hx + 2.6} ${hy + 7.2} Q${hx + 6} ${hy + 10} ${hx + 7.5} ${hy + 13}`} fill="none" stroke={trim} strokeWidth={0.6} />);
    for (let i = 0; i < 3; i++) parts.push(<circle key={`btn${i}`} cx={hx + 4.2 + i * 1.6} cy={hy + 8.6 + i * 1.6} r={0.4} fill={trim} />);
    // hoa văn sen trên vạt áo
    parts.push(<path key="lotus" d={`M${hx - 5} ${CY - 3} C ${hx - 3.5} ${CY - 7} ${hx - 6.5} ${CY - 7} ${hx - 5} ${CY - 3} Z M${hx - 5} ${CY - 3} C ${hx - 8} ${CY - 4} ${hx - 8.5} ${CY - 6} ${hx - 8} ${CY - 7} C ${hx - 6.5} ${CY - 6} ${hx - 5.5} ${CY - 5} ${hx - 5} ${CY - 3} Z M${hx - 5} ${CY - 3} C ${hx - 2} ${CY - 4} ${hx - 1.5} ${CY - 6} ${hx - 2} ${CY - 7} C ${hx - 3.5} ${CY - 6} ${hx - 4.5} ${CY - 5} ${hx - 5} ${CY - 3} Z`} fill={trim} opacity={0.9} />);
  } else {
    // cổ điển: áo choàng có viền + hoạ tiết quả trám
    parts.push(<path key="body" d={`M${hx - 13} ${CY} L${hx - 10.5} ${hy + 7} Q${hx} ${hy + 4} ${hx + 10.5} ${hy + 7} L${hx + 13} ${CY} Z`} fill={robe} />);
    parts.push(<path key="cape" d={`M${hx - 10.5} ${hy + 7} Q${hx} ${hy + 11} ${hx + 10.5} ${hy + 7}`} fill="none" stroke={trim} strokeWidth={0.9} />);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const x = hx - 7.5 + i * 5, y = CY - 7 + j * 4.2;
      parts.push(<polygon key={`dm${i}_${j}`} points={`${x},${y - 1.4} ${x + 1.4},${y} ${x},${y + 1.4} ${x - 1.4},${y}`} fill={trim} opacity={0.85} />);
    }
  }
  // đồ cầm tay
  if (rank === 'K') {
    parts.push(<line key="sw" x1={hx + 9.5} y1={hy - 6} x2={hx + 9.5} y2={CY - 1} stroke="#8D96A3" strokeWidth={0.9} strokeLinecap="round" />);
    parts.push(<line key="gd" x1={hx + 7.2} y1={hy + 6} x2={hx + 11.8} y2={hy + 6} stroke={trim} strokeWidth={0.9} strokeLinecap="round" />);
  } else if (rank === 'Q') {
    parts.push(<line key="stem" x1={hx - 9} y1={hy + 2} x2={hx - 7} y2={hy + 11} stroke="#3F7A4A" strokeWidth={0.5} />);
    parts.push(<Blossom key="fl" x={hx - 9.2} y={hy + 1} r={2.4} fill={red ? '#F28CA0' : trim} center={trim} />);
  } else {
    parts.push(<path key="leaf" d={`M${hx + 8} ${hy + 12} C ${hx + 12} ${hy + 6} ${hx + 11} ${hy + 1} ${hx + 9} ${hy - 2} C ${hx + 7} ${hy + 3} ${hx + 6.5} ${hy + 8} ${hx + 8} ${hy + 12} Z`} fill="#3F7A4A" />);
  }
  // đầu
  parts.push(<circle key="head" cx={hx} cy={hy} r={5} fill={SKIN} />);
  parts.push(<circle key="e1" cx={hx - 1.7} cy={hy - 0.2} r={0.45} fill={BLACK} />);
  parts.push(<circle key="e2" cx={hx + 1.7} cy={hy - 0.2} r={0.45} fill={BLACK} />);
  parts.push(<path key="m" d={`M${hx - 1.3} ${hy + 2} Q${hx} ${hy + 2.9} ${hx + 1.3} ${hy + 2}`} fill="none" stroke="#9B4A3A" strokeWidth={0.35} strokeLinecap="round" />);
  if (rank === 'K') parts.push(<path key="beard" d={`M${hx - 4.2} ${hy + 1.6} Q${hx} ${hy + 7.5} ${hx + 4.2} ${hy + 1.6} Q${hx} ${hy + 4.4} ${hx - 4.2} ${hy + 1.6} Z`} fill={face === 'modern' ? '#3A3A3A' : '#5A3A22'} />);
  // mũ / tóc
  if (face === 'aodai') {
    if (rank === 'K') { // khăn đóng
      parts.push(<ellipse key="hat" cx={hx} cy={hy - 4.6} rx={5.6} ry={2.4} fill={robe2} />);
      parts.push(<path key="hatl" d={`M${hx - 5.4} ${hy - 4.4} Q${hx} ${hy - 2.6} ${hx + 5.4} ${hy - 4.4}`} fill="none" stroke={trim} strokeWidth={0.4} />);
    } else if (rank === 'Q') { // nón lá
      parts.push(<path key="hair" d={`M${hx - 5} ${hy} Q${hx - 6.5} ${hy + 7} ${hx - 4} ${hy + 9} L${hx - 3.2} ${hy - 2} Z`} fill="#2A1F1A" />);
      parts.push(<polygon key="non" points={`${hx - 11},${hy - 3.4} ${hx},${hy - 11.5} ${hx + 11},${hy - 3.4}`} fill="#E9D59A" stroke="#B89A55" strokeWidth={0.3} />);
      for (let i = 1; i <= 3; i++) parts.push(<line key={`nl${i}`} x1={hx - 11 + i * 2.6} y1={hy - 3.4 - i * 1.6} x2={hx + 11 - i * 2.6} y2={hy - 3.4 - i * 1.6} stroke="#B89A55" strokeWidth={0.2} />);
    } else { // khăn vấn
      parts.push(<rect key="hat" x={hx - 5.3} y={hy - 5.6} width={10.6} height={2.8} rx={1.4} fill={robe2} />);
      parts.push(<line key="hatl" x1={hx - 5} y1={hy - 4.2} x2={hx + 5} y2={hy - 4.2} stroke={trim} strokeWidth={0.35} />);
    }
  } else if (face === 'modern') {
    if (rank === 'K') parts.push(<path key="cr" d={`M${hx - 5} ${hy - 3.6} L${hx - 5} ${hy - 8.6} L${hx + 5} ${hy - 8.6} L${hx + 5} ${hy - 3.6} Q${hx} ${hy - 5.4} ${hx - 5} ${hy - 3.6} Z`} fill={trim} />);
    else if (rank === 'Q') parts.push(<circle key="halo" cx={hx} cy={hy - 3} r={7.4} fill="none" stroke={trim} strokeWidth={0.9} />);
    else parts.push(<polygon key="cap" points={`${hx - 5.6},${hy - 3} ${hx},${hy - 10} ${hx + 5.6},${hy - 3}`} fill={robe2} />);
  } else {
    if (rank === 'K') parts.push(<polygon key="crown" points={`${hx - 5.2},${hy - 4} ${hx - 5.2},${hy - 9.5} ${hx - 2.6},${hy - 6.6} ${hx},${hy - 10.5} ${hx + 2.6},${hy - 6.6} ${hx + 5.2},${hy - 9.5} ${hx + 5.2},${hy - 4}`} fill={trim} />);
    else if (rank === 'Q') {
      parts.push(<path key="hair" d={`M${hx - 5} ${hy} Q${hx - 6.6} ${hy + 6} ${hx - 4.4} ${hy + 8} L${hx - 3} ${hy - 3} Z M${hx + 5} ${hy} Q${hx + 6.6} ${hy + 6} ${hx + 4.4} ${hy + 8} L${hx + 3} ${hy - 3} Z`} fill="#4A2E1C" />);
      parts.push(<polygon key="tiara" points={star(hx, hy - 6.2, 2.6, 1.1, 5)} fill={trim} />);
    } else {
      parts.push(<ellipse key="cap" cx={hx - 0.6} cy={hy - 4.4} rx={6} ry={2.2} fill={robe2} />);
      parts.push(<path key="feather" d={`M${hx + 3.6} ${hy - 5} C ${hx + 8} ${hy - 9} ${hx + 9} ${hy - 7} ${hx + 10.5} ${hy - 11}`} fill="none" stroke={trim} strokeWidth={0.9} strokeLinecap="round" />);
    }
  }
  // chất nhỏ trong khung
  parts.push(<SuitShape key="sp" suit={suit} x={15.3} y={14.6} size={4.4} fill={ink} />);
  return <>{parts}</>;
}

function FaceArt({ card, spec, data, uid }: { card: CardId; spec: PCSpec; data: PCData; uid: string }) {
  const pal = pcPalette(spec.palette);
  if ('joker' in card) {
    const color = card.joker === 'color';
    const ink = color ? RED : BLACK;
    const acc = color ? pal.bg : '#2A2A2A';
    const jk = (
      <g>
        {'JOKER'.split('').map((ch, i) => <text key={i} x={5.4} y={8.6 + i * 4.3} textAnchor="middle" fontFamily={F_SANS} fontWeight={800} fontSize={3.9} fill={ink} data-pc-text="1">{ch}</text>)}
      </g>
    );
    const brand = (data.brand || '').trim();
    return (
      <>
        <rect x={-3} y={-3} width={PC_W + 6} height={PC_H + 6} fill="#FFFFFF" />
        {jk}
        <g transform={`rotate(180 ${CX} ${CY})`}>{jk}</g>
        <polygon points={star(CX, CY - 3, 21, 12.5, 12)} fill={acc} opacity={color ? 1 : 0.9} />
        <polygon points={star(CX, CY - 3, 16.5, 10.5, 12, -75)} fill={color ? pal.accent : '#BDBDBD'} opacity={0.95} />
        <circle cx={CX} cy={CY - 3} r={9.6} fill="#FFFFFF" stroke={acc} strokeWidth={0.6} />
        <LogoBadge x={CX} y={CY - 3} r={8.2} data={data} pal={color ? pal : { ...pal, bg: '#1A1A1A', accent: '#E8E8E8' }} />
        {brand && (() => {
          const bl = brandLines(brand, F_SERIF, 800, 4.6, PC_W - 24, 0.2);
          return bl.lines.map((ln, i) => <text key={i} x={CX} y={f(CY + 24.4 + i * bl.size * 1.12 - (bl.lines.length - 1) * bl.size * 0.5)} textAnchor="middle" fontFamily={F_SERIF} fontWeight={800} fontSize={f(bl.size)} letterSpacing={0.2} fill={ink} data-pc-text="1">{ln}</text>);
        })()}
        <text x={CX} y={CY + 31} textAnchor="middle" fontFamily={F_BODY} fontWeight={600} fontSize={2.2} letterSpacing={0.6} fill={ink} opacity={0.75} data-pc-text="1">JOKER</text>
      </>
    );
  }
  const { suit, rank } = card;
  const ink = isRed(suit) ? RED : BLACK;
  const corner = <Corner rank={rank} suit={suit} color={ink} face={spec.face} />;
  let center: ReactNode = null;
  if (rank === 'A') {
    const spadeBrand = suit === 'S' && (data.brand || '').trim();
    center = (
      <g>
        <SuitShape suit={suit} x={CX} y={CY - (spadeBrand ? 2 : 0)} size={suit === 'S' ? 30 : 24} fill={ink} pip />
        {spadeBrand && (() => {
          const bl = brandLines(spadeBrand, F_SERIF, 800, 3.6, PC_W - 26, 0.3);
          return bl.lines.map((ln, i) => <text key={i} x={CX} y={f(CY + 18.6 + i * bl.size * 1.15)} textAnchor="middle" fontFamily={F_SERIF} fontWeight={800} fontSize={f(bl.size)} letterSpacing={0.3} fill={ink} data-pc-text="1">{ln}</text>);
        })()}
      </g>
    );
  } else if (rank === 'J' || rank === 'Q' || rank === 'K') {
    center = (
      <g>
        <defs><clipPath id={`${uid}-ct`}><rect x={11.5} y={10.5} width={PC_W - 23} height={CY - 10.5} /></clipPath></defs>
        <g clipPath={`url(#${uid}-ct)`}><CourtHalf rank={rank} suit={suit} face={spec.face} pal={pal} /></g>
        <g transform={`rotate(180 ${CX} ${CY})`}><g clipPath={`url(#${uid}-ct)`}><CourtHalf rank={rank} suit={suit} face={spec.face} pal={pal} /></g></g>
        <rect x={11.5} y={10.5} width={PC_W - 23} height={PC_H - 21} fill="none" stroke={ink} strokeWidth={0.45} />
        <line x1={11.5} y1={CY} x2={PC_W - 11.5} y2={CY} stroke={ink} strokeWidth={0.3} />
      </g>
    );
  } else {
    const size = rank === '10' || rank === '9' ? 9.4 : 10.4;
    center = <g>{PIPS[rank].map(([x, y], i) => <SuitShape key={i} suit={suit} x={x} y={y} size={size} rot={y > CY + 0.01 ? 180 : 0} fill={ink} pip />)}</g>;
  }
  return (
    <>
      <rect x={-3} y={-3} width={PC_W + 6} height={PC_H + 6} fill="#FFFFFF" />
      {corner}
      <g transform={`rotate(180 ${CX} ${CY})`}>{corner}</g>
      {center}
    </>
  );
}

export const cardKey = (c: CardId) => ('joker' in c ? `J-${c.joker}` : `${c.rank}${c.suit}`);
export const cardLabel = (c: CardId) => ('joker' in c ? (c.joker === 'color' ? 'Joker màu' : 'Joker đen') : `${c.rank} ${SUIT_NAME[c.suit]}`);
export const ALL_CARDS: CardId[] = [
  ...SUITS.flatMap((suit) => RANKS.map((rank) => ({ suit, rank }) as CardId)),
  { joker: 'color' }, { joker: 'mono' },
];

export function CardFaceSvg({ card, spec, data, bleed = false, style, uid }: { card: CardId; spec: PCSpec; data: PCData; bleed?: boolean; style?: CSSProperties; uid?: string }) {
  const b = bleed ? PC_BLEED : 0;
  const id = uid || `pcf-${cardKey(card)}`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-b} ${-b} ${PC_W + b * 2} ${PC_H + b * 2}`} width={`${PC_W + b * 2}mm`} height={`${PC_H + b * 2}mm`} style={style} data-pc-face={cardKey(card)}>
      {bleed ? <FaceArt card={card} spec={spec} data={data} uid={id} /> : (
        <>
          <defs><clipPath id={`${id}-card`}><path d={cardOutline()} /></clipPath></defs>
          <g clipPath={`url(#${id}-card)`}><FaceArt card={card} spec={spec} data={data} uid={id} /></g>
          <path d={cardOutline(0.1)} fill="none" stroke="#D9D6CF" strokeWidth={0.2} />
        </>
      )}
    </svg>
  );
}

// ---------- HỘP ĐỰNG (tuck box) ----------
// Lòng hộp vừa 54 lá ≈ 17mm → W 66 × H 91 × D 20 (mm). Hộp gài 2 đầu ngược chiều (reverse tuck end).
export const BOX = { W: 66, H: 91, D: 20, G: 11, L: 20, T: 15 };
const BOX_BLEED = 3;
export type BoxPanel = 'front' | 'back' | 'side' | 'lid';

function PanelArt({ panel, spec, data, w, h, uid }: { panel: BoxPanel; spec: PCSpec; data: PCData; w: number; h: number; uid: string }) {
  const pal = pcPalette(spec.palette);
  const brand = (data.brand || '').trim();
  if (panel === 'back') {
    // mặt lưng bài thu nhỏ (cùng thiết kế) → khách nhìn hộp là biết bộ bài
    const k = Math.min(w / PC_W, h / PC_H);
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} fill={pal.bg} />
        <g transform={`translate(${f((w - PC_W * k) / 2)} ${f((h - PC_H * k) / 2)}) scale(${f(k)})`}><BackArt spec={spec} data={data} b={0} uid={`${uid}-bk`} /></g>
      </g>
    );
  }
  if (panel === 'side') {
    const s = fitSize(brand, F_SERIF, 800, 6, h - 22, 2.6, 0.4);
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} fill={pal.bg} />
        <line x1={2} y1={3} x2={2} y2={h - 3} stroke={pal.accent} strokeWidth={0.3} />
        <line x1={w - 2} y1={3} x2={w - 2} y2={h - 3} stroke={pal.accent} strokeWidth={0.3} />
        <g transform={`translate(${w / 2} ${h / 2}) rotate(-90)`}>
          {brand && <text x={0} y={s * 0.36} textAnchor="middle" fontFamily={F_SERIF} fontWeight={800} fontSize={f(s)} letterSpacing={0.4} fill={pal.ink} data-pc-text="1">{brand}</text>}
        </g>
        {(['S', 'H', 'D', 'C'] as Suit[]).map((st, i) => <SuitShape key={st} suit={st} x={w / 2} y={(i < 2 ? 6 + i * 5 : h - 11 + (i - 2) * 5)} size={3.4} fill={pal.accent} />)}
      </g>
    );
  }
  if (panel === 'lid') {
    return (
      <g>
        <rect x={0} y={0} width={w} height={h} fill={pal.bg} />
        <SuitShape suit="S" x={w / 2} y={h / 2} size={Math.min(8, h * 0.6)} fill={pal.accent} />
      </g>
    );
  }
  // mặt trước hộp
  const bl = brandLines(brand, F_SERIF, 800, 8.2, w - 13, 0.4);
  const nS = bl.size, extra = bl.lines.length > 1 ? nS * 1.1 : 0;
  const sub = 'BỘ BÀI CAO CẤP · 54 LÁ';
  return (
    <g>
      <rect x={0} y={0} width={w} height={h} fill={pal.bg} />
      <rect x={3} y={3} width={w - 6} height={h - 6} rx={2} fill="none" stroke={pal.accent} strokeWidth={0.5} />
      <rect x={4.3} y={4.3} width={w - 8.6} height={h - 8.6} rx={1.4} fill="none" stroke={pal.accent} strokeWidth={0.2} />
      <LogoBadge x={w / 2} y={h * 0.27} r={9.5} data={data} pal={pal} />
      {brand && bl.lines.map((ln, i) => <text key={i} x={w / 2} y={f(h * 0.5 - extra * 0.4 + i * nS * 1.1)} textAnchor="middle" fontFamily={F_SERIF} fontWeight={800} fontSize={f(nS)} letterSpacing={0.4} fill={pal.ink} data-pc-text="1">{ln}</text>)}
      <line x1={w / 2 - 10} y1={h * 0.5 + 3.6 + extra * 0.6} x2={w / 2 + 10} y2={h * 0.5 + 3.6 + extra * 0.6} stroke={pal.accent} strokeWidth={0.35} />
      <text x={w / 2} y={h * 0.5 + 8.6 + extra * 0.6} textAnchor="middle" fontFamily={F_BODY} fontWeight={800} fontSize={f(fitSize(sub, F_BODY, 800, 2.6, w - 14, 1.6, 0.4))} letterSpacing={0.4} fill={pal.accent} data-pc-text="1">{sub}</text>
      {data.slogan && <text x={w / 2} y={h * 0.5 + 13.4 + extra * 0.6} textAnchor="middle" fontFamily={F_CLASSIC} fontWeight={700} fontSize={f(fitSize(data.slogan, F_CLASSIC, 700, 3.6, w - 14, 1.8))} fill={pal.ink} data-pc-text="1">{data.slogan}</text>}
      {(['S', 'H', 'D', 'C'] as Suit[]).map((st, i) => <SuitShape key={st} suit={st} x={w / 2 - 10.5 + i * 7} y={h * 0.82} size={4.6} fill={i === 1 || i === 2 ? pal.ink : pal.accent} />)}
      {data.web && <text x={w / 2} y={h - 7.2} textAnchor="middle" fontFamily={F_BODY} fontWeight={600} fontSize={f(fitSize(data.web, F_BODY, 600, 2.2, w - 16, 1.4))} fill={pal.ink} opacity={0.85} data-pc-text="1">{data.web}</text>}
    </g>
  );
}

export function BoxPanelSvg({ panel, spec, data, style }: { panel: BoxPanel; spec: PCSpec; data: PCData; style?: CSSProperties }) {
  const w = panel === 'side' || panel === 'lid' ? BOX.D : BOX.W;
  const h = panel === 'lid' ? BOX.W : BOX.H;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} width={`${w}mm`} height={`${h}mm`} style={style}>
      <PanelArt panel={panel} spec={spec} data={data} w={w} h={h} uid={`bp-${panel}`} />
    </svg>
  );
}

// toạ độ khuôn: x: dán | lưng | hông | trước | hông ; y: lưỡi + nắp | thân | nắp + lưỡi (đáy, gài ngược)
export function boxGeom() {
  const { W, H, D, G, L, T } = BOX;
  const X0 = 0, X1 = G, X2 = G + W, X3 = X2 + D, X4 = X3 + W, X5 = X4 + D;
  const yb = T + L, ye = yb + H;
  const F = D * 0.86, notch = 8;
  const pts = [
    `M${X1} ${yb}`, `L${X1} ${yb - L}`, `L${X1 + 3} ${yb - L - T + 4}`, `Q${X1 + 4} ${yb - L - T} ${X1 + 9} ${yb - L - T}`, `L${X2 - 9} ${yb - L - T}`, `Q${X2 - 4} ${yb - L - T} ${X2 - 3} ${yb - L - T + 4}`, `L${X2} ${yb - L}`,
    `L${X2} ${yb}`, `L${X2 + 1.5} ${yb - F}`, `L${X3 - 5} ${yb - F}`, `L${X3} ${yb - 3}`, `L${X3} ${yb}`,
    `L${X3 + W / 2 - notch} ${yb}`, `A${notch} ${notch} 0 0 0 ${X3 + W / 2 + notch} ${yb}`, `L${X4} ${yb}`,
    `L${X4} ${yb - 3}`, `L${X4 + 5} ${yb - F}`, `L${X5 - 1.5} ${yb - F}`, `L${X5} ${yb}`,
    `L${X5} ${ye}`, `L${X5 - 1.5} ${ye + F}`, `L${X4 + 5} ${ye + F}`, `L${X4} ${ye + 3}`, `L${X4} ${ye}`,
    `L${X4} ${ye + L}`, `L${X4 - 3} ${ye + L + T - 4}`, `Q${X4 - 4} ${ye + L + T} ${X4 - 9} ${ye + L + T}`, `L${X3 + 9} ${ye + L + T}`, `Q${X3 + 4} ${ye + L + T} ${X3 + 3} ${ye + L + T - 4}`, `L${X3} ${ye + L}`, `L${X3} ${ye}`,
    `L${X3} ${ye + 3}`, `L${X3 - 5} ${ye + F}`, `L${X2 + 1.5} ${ye + F}`, `L${X2} ${ye}`,
    `L${X1} ${ye}`, `L${X0} ${ye - 6}`, `L${X0} ${yb + 6}`, 'Z',
  ];
  const folds: [number, number, number, number][] = [
    [X1, yb, X1, ye], [X2, yb, X2, ye], [X3, yb, X3, ye], [X4, yb, X4, ye],
    [X1, yb, X2, yb], [X1, yb - L, X2, yb - L], [X2, yb, X3, yb], [X4, yb, X5, yb],
    [X3, ye, X4, ye], [X3, ye + L, X4, ye + L], [X2, ye, X3, ye], [X4, ye, X5, ye],
  ];
  return { cut: pts.join(' '), folds, X0, X1, X2, X3, X4, X5, yb, ye, w: X5, h: ye + L + T };
}

export function TuckBoxSvg({ spec, data, style, labels = false }: { spec: PCSpec; data: PCData; style?: CSSProperties; labels?: boolean }) {
  const pal = pcPalette(spec.palette);
  const g = boxGeom();
  const m = BOX_BLEED + 2;
  const vbW = g.w + m * 2, vbH = g.h + m * 2 + (labels ? 7 : 0);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-m} ${-m} ${vbW} ${vbH}`} width={`${vbW}mm`} height={`${vbH}mm`} style={style} data-pc-box="1">
      <defs>
        <clipPath id="pcbox-clip"><path d={g.cut} /></clipPath>
        <clipPath id="pcbox-bleed"><path d={g.cut} stroke="#000" strokeWidth={BOX_BLEED * 2} /></clipPath>
      </defs>
      <rect x={-m} y={-m} width={vbW} height={vbH} fill="#FFFFFF" />
      <g id="In">
        <path d={g.cut} fill={pal.bg} stroke={pal.bg} strokeWidth={BOX_BLEED * 2} strokeLinejoin="round" />
        <g clipPath="url(#pcbox-clip)">
          <g data-pc-panel="back" transform={`translate(${g.X1} ${g.yb})`}><PanelArt panel="back" spec={spec} data={data} w={BOX.W} h={BOX.H} uid="tb-back" /></g>
          <g data-pc-panel="side" transform={`translate(${g.X2} ${g.yb})`}><PanelArt panel="side" spec={spec} data={data} w={BOX.D} h={BOX.H} uid="tb-sl" /></g>
          <g data-pc-panel="front" transform={`translate(${g.X3} ${g.yb})`}><PanelArt panel="front" spec={spec} data={data} w={BOX.W} h={BOX.H} uid="tb-front" /></g>
          <g data-pc-panel="side" transform={`translate(${g.X4} ${g.yb})`}><PanelArt panel="side" spec={spec} data={data} w={BOX.D} h={BOX.H} uid="tb-sr" /></g>
          <g transform={`translate(${g.X1 + BOX.W / 2} ${g.yb - BOX.L / 2}) rotate(90)`}><SuitShape suit="S" x={0} y={0} size={7} fill={pal.accent} /></g>
        </g>
      </g>
      <g id="CutContour"><path d={g.cut} fill="none" stroke="#EC008C" strokeWidth={0.3} /></g>
      <g id="Fold" stroke="#00A0E3" strokeWidth={0.3} strokeDasharray="2 1.2">
        {g.folds.map(([a, b2, c, d], i) => <line key={i} x1={a} y1={b2} x2={c} y2={d} />)}
      </g>
      {labels && (
        <text x={0} y={g.h + m + 3} fontFamily={F_BODY} fontWeight={600} fontSize={2.6} fill="#555" data-pc-legend="1">
          Hộp {BOX.W}×{BOX.H}×{BOX.D}mm · hồng = đường cắt · xanh đứt = đường gấp · nền tràn lề {BOX_BLEED}mm
        </text>
      )}
    </svg>
  );
}

// tiện ích: ReactElement SVG → SVGSVGElement (không cần gắn DOM) — dùng cho texture 3D + PDF
export async function svgElementOf(node: ReactElement): Promise<SVGSVGElement> {
  const { renderToStaticMarkup } = await import('react-dom/server');
  const doc = new DOMParser().parseFromString(renderToStaticMarkup(node), 'image/svg+xml');
  return document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
}
