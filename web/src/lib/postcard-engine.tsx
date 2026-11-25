'use client';
// Postcard · bưu thiếp · thiệp cảm ơn kèm đơn: 1 engine SVG (đơn vị = mm) = MẶT TRƯỚC (cảnh vẽ bằng code / ảnh khách)
// × MẶT SAU (bưu thiếp cổ điển: lời nhắn + địa chỉ + tem + dấu bưu điện | cảm ơn shop: mã giảm giá + QR + social).
// Cảnh du lịch (Hội An, ruộng bậc thang, biển, Đà Lạt, Sài Gòn, hoa sen) vẽ 100% bằng code — không gọi AI theo request.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

// ---------- khổ ----------
export interface PCSize { id: string; name: string; w: number; h: number } // w×h theo chiều NGANG
export const PC_SIZES: PCSize[] = [
  { id: '10x15', name: '10 × 15 cm', w: 150, h: 100 },
  { id: 'a6', name: 'A6 · 10.5 × 14.8', w: 148, h: 105 },
  { id: '12x17', name: '12 × 17 cm', w: 170, h: 120 },
  { id: 'sq14', name: 'Vuông 14 × 14', w: 140, h: 140 },
];
export const PC_BLEED_MM = 2;
export type PCOrient = 'land' | 'port';
export function pcDims(sizeId: string, orient: PCOrient) {
  const s = PC_SIZES.find((x) => x.id === sizeId) || PC_SIZES[0];
  const port = orient === 'port' && s.w !== s.h;
  return { ...s, wMm: port ? s.h : s.w, hMm: port ? s.w : s.h };
}

// ---------- font (đều có TTF ở /public/fonts → outline được khi in) ----------
export interface PCFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const PC_FONTS: PCFont[] = [
  { id: 'greatvibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400, script: true },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, script: true },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
];
export const pcFont = (id: string) => PC_FONTS.find((f) => f.id === id) || PC_FONTS[0];
const BODY = 'Be Vietnam Pro';
const HAND = 'Dancing Script';

export const PC_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Great+Vibes&family=Dancing+Script:wght@700&family=Lobster&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&display=swap');`;

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
    const probe = [...PC_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface PCPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; line: string; dark?: boolean }
export const PC_PALETTES: PCPalette[] = [
  { id: 'vintage', name: 'Kem cổ điển', paper: '#F5EEDF', ink: '#3B2A1E', sub: '#7A6552', accent: '#B5432F', accent2: '#2F5D62', line: '#CDBFA6' },
  { id: 'white', name: 'Trắng', paper: '#FFFFFF', ink: '#1E2430', sub: '#5B6474', accent: '#1F3A68', accent2: '#C8A24A', line: '#D3D8E0' },
  { id: 'blush', name: 'Hồng pastel', paper: '#FBEDEE', ink: '#4A2C34', sub: '#86636D', accent: '#D0587E', accent2: '#5E8F72', line: '#E9C6CE' },
  { id: 'kraft', name: 'Kraft', paper: '#D9BF97', ink: '#3E2A16', sub: '#634A2C', accent: '#7A3B1E', accent2: '#2E4A3A', line: '#B79C70' },
  { id: 'sage', name: 'Xanh lá dịu', paper: '#EEF3EA', ink: '#24382B', sub: '#5B7062', accent: '#3E7A55', accent2: '#C98F2E', line: '#C9D7C3' },
  { id: 'navy', name: 'Navy đêm', paper: '#1E2A44', ink: '#F4EFE3', sub: '#B9C0CE', accent: '#E0B354', accent2: '#7FB3C8', line: '#3E4C6C', dark: true },
  { id: 'tet', name: 'Đỏ Tết', paper: '#FBF1E3', ink: '#5A1A14', sub: '#86493B', accent: '#C8272D', accent2: '#C98B22', line: '#E8C9A8' },
  { id: 'sunset', name: 'Hoàng hôn', paper: '#FFF4EA', ink: '#3A2433', sub: '#7D6070', accent: '#E0704A', accent2: '#5B4B8A', line: '#EFD0BF' },
];
export const pcPalette = (id: string) => PC_PALETTES.find((p) => p.id === id) || PC_PALETTES[0];

// ---------- cảnh ----------
export type SceneId = 'hoian' | 'terrace' | 'beach' | 'dalat' | 'saigon' | 'lotus';
export const PC_SCENES: { id: SceneId; name: string; title: string; caption: string }[] = [
  { id: 'hoian', name: 'Phố cổ Hội An', title: 'Hội An', caption: 'Phố cổ · Quảng Nam' },
  { id: 'terrace', name: 'Ruộng bậc thang', title: 'Mù Cang Chải', caption: 'Mùa lúa chín · Yên Bái' },
  { id: 'beach', name: 'Biển xanh', title: 'Nha Trang', caption: 'Biển xanh · Khánh Hoà' },
  { id: 'dalat', name: 'Đà Lạt sương mù', title: 'Đà Lạt', caption: 'Thành phố ngàn hoa' },
  { id: 'saigon', name: 'Sài Gòn lên đèn', title: 'Sài Gòn', caption: 'Thành phố không ngủ' },
  { id: 'lotus', name: 'Đầm sen', title: 'Đồng Tháp Mười', caption: 'Mùa sen nở' },
];
export const pcScene = (id: string) => PC_SCENES.find((s) => s.id === id) || PC_SCENES[0];

// ---------- spec / mẫu ----------
export type PCFront = 'full' | 'frame' | 'greet' | 'thanks';
export type PCBack = 'classic' | 'shop';
export interface PCSpec {
  front: PCFront; back: PCBack; scene: SceneId; palette: string; font: string;
  size: string; orient: PCOrient; set: boolean; setScenes: SceneId[]; printMsg: boolean;
}
export const PC_FRONTS: { id: PCFront; name: string }[] = [
  { id: 'full', name: 'Tràn ảnh' }, { id: 'frame', name: 'Khung trắng' }, { id: 'greet', name: 'Chữ lớn retro' }, { id: 'thanks', name: 'Lời cảm ơn' },
];
export const PC_BACKS: { id: PCBack; name: string }[] = [
  { id: 'classic', name: 'Bưu thiếp cổ điển' }, { id: 'shop', name: 'Cảm ơn khách (shop)' },
];

type TplSpec = Omit<PCSpec, 'size' | 'orient' | 'printMsg'>;
export interface PCTemplate { id: string; name: string; spec: TplSpec }
const ALL: SceneId[] = ['hoian', 'terrace', 'beach', 'dalat', 'saigon', 'lotus'];
const T = (id: string, name: string, s: Partial<TplSpec>): PCTemplate => ({
  id, name, spec: { front: 'full', back: 'classic', scene: 'hoian', palette: 'vintage', font: 'greatvibes', set: false, setScenes: ALL, ...s },
});
export const PC_TEMPLATES: PCTemplate[] = [
  T('hoian-full', 'Hội An · tràn ảnh', { scene: 'hoian', front: 'full', palette: 'vintage', font: 'greatvibes' }),
  T('terrace-frame', 'Ruộng bậc thang · khung', { scene: 'terrace', front: 'frame', palette: 'vintage', font: 'playfair' }),
  T('beach-greet', 'Biển · chữ retro', { scene: 'beach', front: 'greet', palette: 'white', font: 'oswald' }),
  T('dalat-frame', 'Đà Lạt · khung hồng', { scene: 'dalat', front: 'frame', palette: 'blush', font: 'dancing' }),
  T('saigon-full', 'Sài Gòn · tràn ảnh', { scene: 'saigon', front: 'full', palette: 'navy', font: 'lobster' }),
  T('lotus-frame', 'Đầm sen · tối giản', { scene: 'lotus', front: 'frame', palette: 'sage', font: 'playfair' }),
  T('saigon-greet', 'Sài Gòn · chữ retro', { scene: 'saigon', front: 'greet', palette: 'sunset', font: 'baloo' }),
  T('set6-full', 'Bộ 6 bưu thiếp du lịch', { set: true, setScenes: ALL, front: 'full', palette: 'vintage', font: 'greatvibes' }),
  T('set4-frame', 'Bộ 4 bưu thiếp khung', { set: true, setScenes: ['hoian', 'dalat', 'beach', 'lotus'], front: 'frame', palette: 'white', font: 'playfair' }),
  T('shop-blush', 'Cảm ơn shop · hồng', { front: 'thanks', back: 'shop', palette: 'blush', font: 'greatvibes', scene: 'lotus' }),
  T('shop-kraft', 'Cảm ơn shop · kraft', { front: 'thanks', back: 'shop', palette: 'kraft', font: 'dancing', scene: 'terrace' }),
  T('shop-sage', 'Cảm ơn shop · xanh lá', { front: 'thanks', back: 'shop', palette: 'sage', font: 'lobster', scene: 'dalat' }),
  T('shop-photo', 'Cảm ơn · ảnh/cảnh tràn', { front: 'full', back: 'shop', palette: 'sunset', font: 'dancing', scene: 'lotus' }),
  T('shop-tet', 'Chúc Tết khách hàng', { front: 'thanks', back: 'shop', palette: 'tet', font: 'baloo', scene: 'hoian' }),
];

export type PCData = Record<string, string>;
export interface PCField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; side: 'front' | 'back'; when?: (s: PCSpec) => boolean }
const isShopFront = (s: PCSpec) => s.front === 'thanks';
const isScene = (s: PCSpec) => s.front !== 'thanks';
export const PC_FIELDS: PCField[] = [
  { key: 'title', label: 'Tiêu đề trên ảnh', ph: 'Hội An', side: 'front', half: true, when: (s) => isScene(s) && !s.set },
  { key: 'caption', label: 'Dòng phụ', ph: 'Phố cổ · Quảng Nam', side: 'front', half: true, when: (s) => isScene(s) && !s.set },
  { key: 'greet', label: 'Chữ nhỏ trên tiêu đề (retro)', ph: 'Chào từ', side: 'front', half: true, when: (s) => s.front === 'greet' },
  { key: 'bigline', label: 'Lời cảm ơn lớn', ph: 'Cảm ơn bạn!', side: 'front', half: true, when: isShopFront },
  { key: 'sub', label: 'Dòng phụ mặt trước', ph: 'Mỗi đơn hàng là một niềm vui nhỏ', side: 'front', half: true, when: isShopFront },
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'An Khang Handmade', side: 'back', half: true },
  { key: 'hotline', label: 'Hotline / Zalo', ph: '0909 123 456', side: 'back', half: true, when: (s) => s.back === 'shop' },
  { key: 'thanks', label: 'Câu cảm ơn mặt sau', ph: 'Cảm ơn bạn đã ủng hộ An Khang!', side: 'back', when: (s) => s.back === 'shop' },
  { key: 'message', label: 'Lời nhắn', ph: 'Mỗi món đồ đều được gói bằng cả tấm lòng…', side: 'back', multiline: true },
  { key: 'code', label: 'Mã giảm giá', ph: 'CAMON10', side: 'back', half: true, when: (s) => s.back === 'shop' },
  { key: 'codeNote', label: 'Ghi chú mã', ph: 'Giảm 10% cho đơn tiếp theo', side: 'back', half: true, when: (s) => s.back === 'shop' },
  { key: 'website', label: 'Website / link (tạo QR)', ph: 'ankhang.vn', side: 'back', half: true, when: (s) => s.back === 'shop' },
  { key: 'social', label: 'Mạng xã hội', ph: '@ankhang.handmade', side: 'back', half: true, when: (s) => s.back === 'shop' },
  { key: 'credit', label: 'Dòng ghi chú nhỏ (góc dưới)', ph: 'Bộ bưu thiếp Việt Nam · An Khang', side: 'back', when: (s) => s.back === 'classic' },
];
export const PC_SAMPLES: Record<PCBack, PCData> = {
  classic: {
    title: 'Hội An', caption: 'Phố cổ · Quảng Nam', greet: 'Chào từ', bigline: 'Cảm ơn bạn!', sub: 'Mỗi đơn hàng là một niềm vui nhỏ',
    brand: 'Lữ Quán An Khang', hotline: '0909 123 456', thanks: 'Cảm ơn bạn đã ghé thăm!', message: '',
    code: 'CAMON10', codeNote: 'Giảm 10% cho lần sau', website: 'ankhang.vn', social: '@luquan.ankhang',
    credit: 'Bộ bưu thiếp Việt Nam · Lữ Quán An Khang',
  },
  shop: {
    title: 'Đồng Tháp Mười', caption: 'Mùa sen nở', greet: 'Chào từ', bigline: 'Cảm ơn bạn!', sub: 'Mỗi đơn hàng là một niềm vui nhỏ của tụi mình',
    brand: 'An Khang Handmade', hotline: '0909 123 456', thanks: 'Cảm ơn bạn đã ủng hộ An Khang Handmade!',
    message: 'Mỗi món đồ đều được tụi mình làm và gói bằng cả tấm lòng. Chúc bạn một ngày thật vui nha!',
    code: 'CAMON10', codeNote: 'Giảm 10% cho đơn tiếp theo', website: 'ankhang.vn', social: '@ankhang.handmade',
    credit: 'An Khang Handmade',
  },
};
export const defaultPCData = (back: PCBack = 'classic'): PCData => ({ ...PC_SAMPLES[back] });

// mẫu chữ tay (chỉ để xem thành phẩm 3D — không in)
export const PC_DEMO_HAND = {
  message: 'Gửi Thu Hà, phố cổ về đêm đẹp lắm, đèn lồng giăng khắp nơi. Nhớ bạn nhiều, hẹn sớm đi cùng nhau nha!',
  sign: '— Quốc Bảo',
  to: ['Thu Hà', '12 Nguyễn Huệ, Q.1', 'TP. Hồ Chí Minh'],
};

// ---------- đo chữ thật (canvas) ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  return (mctx.measureText(s).width * size) / 100 + ls;
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
/** co chữ tới khi ≤ maxLines dòng và mọi dòng vừa maxW; cân dòng tránh chữ mồ côi */
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number, minSize = size * 0.4, clip = false) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  const widest = () => Math.max(0, ...lines.map((l) => textW(l, s, ts)));
  while ((lines.length > maxLines || widest() > maxW) && s > minSize) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines && clip) {
    // quá dài → giữ cỡ chữ, cắt bớt và thêm "…" ở dòng cuối
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && textW(`${last}…`, s, ts) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = `${last}…`;
    return { lines, size: s };
  }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  if (widest() > maxW) s *= maxW / widest(); // 1 từ quá dài → co riêng cho vừa
  if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  return { lines, size: s };
}
type Anchor = 'start' | 'middle' | 'end';
interface BlockO { text: string; x: number; y: number; maxW: number; size: number; maxLines?: number; lh?: number; anchor?: Anchor; ts: TS; fill: string; upper?: boolean; opacity?: number; minSize?: number; testid?: string; clip?: boolean }
/** khối chữ: y = đường chân chữ dòng đầu. Trả về element + chiều cao đã dùng + size thực */
function block(o: BlockO): { el: ReactNode; h: number; size: number; lines: number } {
  const text = o.upper ? (o.text || '').toUpperCase() : o.text || '';
  if (!text.trim()) return { el: null, h: 0, size: o.size, lines: 0 };
  const f = fitBlock(text, o.maxW, o.size, o.ts, o.maxLines ?? 2, o.minSize, o.clip);
  const lh = (o.lh ?? 1.2) * f.size;
  const el = (
    <g fontFamily={`"${o.ts.fam}"`} fontWeight={o.ts.wt} fontSize={f.size} fill={o.fill} textAnchor={o.anchor || 'start'} opacity={o.opacity}
      letterSpacing={o.ts.ls ? o.ts.ls * f.size : undefined} data-testid={o.testid}>
      {f.lines.map((ln, i) => <text key={i} x={o.x} y={o.y + i * lh}>{ln}</text>)}
    </g>
  );
  return { el, h: f.lines.length * lh, size: f.size, lines: f.lines.length };
}

// ---------- tiện ích vẽ ----------
const mkRng = (seed: number) => () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
const f2 = (n: number) => Math.round(n * 100) / 100;

// ============ CẢNH (vẽ trong hộp 0..w × 0..h) ============
function SceneHoian({ w, h, u }: { w: number; h: number; u: string }) {
  const r = mkRng(7), m = Math.min(w, h);
  const ground = h * 0.78;
  const n = Math.max(3, Math.round(w / (h * 0.34)));
  const hw = w / n;
  const walls = ['#E9B949', '#DFA63A', '#F1C45B', '#D89A35'];
  const lanternC = ['#E8442E', '#F28C28', '#F6C443', '#D6336C'];
  const houses: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * hw, hh = h * (0.27 + r() * 0.06), top = ground - hh, rh = h * 0.07;
    const two = r() > 0.4;
    houses.push(
      <g key={i}>
        <rect x={x + hw * 0.02} y={top} width={hw * 0.96} height={hh} fill={walls[i % walls.length]} />
        {two && <rect x={x + hw * 0.02} y={top + hh * 0.44} width={hw * 0.96} height={hh * 0.04} fill="#8C5A2B" opacity={0.75} />}
        <path d={`M${f2(x - hw * 0.05)} ${f2(top + 0.4)} L${f2(x + hw * 1.05)} ${f2(top + 0.4)} L${f2(x + hw * 0.88)} ${f2(top - rh)} L${f2(x + hw * 0.12)} ${f2(top - rh)} Z`} fill="#7A3B2E" />
        {[0.25, 0.5, 0.75].map((k) => <line key={k} x1={x + hw * (0.12 + 0.76 * k) - hw * 0.02} y1={top - rh} x2={x + hw * (-0.05 + 1.1 * k)} y2={top} stroke="#5E2A20" strokeWidth={m * 0.004} />)}
        <rect x={x + hw * 0.36} y={ground - hh * 0.4} width={hw * 0.28} height={hh * 0.4} fill="#4A2A1C" />
        <line x1={x + hw * 0.5} y1={ground - hh * 0.4} x2={x + hw * 0.5} y2={ground} stroke="#6E4330" strokeWidth={m * 0.004} />
        {[0.12, 0.7].map((k) => (
          <g key={k}>
            <rect x={x + hw * k} y={top + hh * (two ? 0.14 : 0.2)} width={hw * 0.18} height={hh * 0.2} fill="#3E6B5A" />
            <rect x={x + hw * k + hw * 0.03} y={top + hh * (two ? 0.17 : 0.23)} width={hw * 0.12} height={hh * 0.14} fill="#F7D48A" opacity={0.85} />
          </g>
        ))}
        {/* đèn lồng dưới hiên */}
        <ellipse cx={x + hw * 0.5} cy={top + hh * 0.08} rx={m * 0.018} ry={m * 0.024} fill={lanternC[(i + 1) % 4]} />
      </g>,
    );
  }
  const strings = [
    { y0: h * 0.1, y1: h * 0.15, sag: h * 0.09, off: 0 },
    { y0: h * 0.24, y1: h * 0.2, sag: h * 0.07, off: 0.5 },
  ];
  const L = m * 0.05;
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-hs`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2E2A55" /><stop offset="0.45" stopColor="#B5577A" /><stop offset="0.8" stopColor="#F2A46B" /><stop offset="1" stopColor="#F7C98B" />
        </linearGradient>
        <linearGradient id={`${u}-hr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3A3F6E" /><stop offset="1" stopColor="#1A1F3F" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${u}-hs)`} />
      <circle cx={w * 0.82} cy={h * 0.36} r={m * 0.06} fill="#FCE9C0" opacity={0.9} />
      <path d={`M0 ${h * 0.56} ${Array.from({ length: 9 }, (_, i) => `L${f2((i / 8) * w)} ${f2(h * (0.47 + (i % 2) * 0.04))}`).join(' ')} L${w} ${h * 0.6} L0 ${h * 0.6} Z`} fill="#6B3F5E" opacity={0.45} />
      {houses}
      <rect x={0} y={ground} width={w} height={h - ground} fill={`url(#${u}-hr)`} />
      {Array.from({ length: 22 }, (_, i) => {
        const x = r() * w, y = ground + (h - ground) * (0.12 + r() * 0.8);
        return <rect key={i} x={x} y={y} width={w * (0.03 + r() * 0.08)} height={m * 0.006} fill={lanternC[i % 4]} opacity={0.45} rx={m * 0.003} />;
      })}
      {/* thuyền */}
      <path d={`M${w * 0.16} ${h * 0.9} Q${w * 0.25} ${h * 0.95} ${w * 0.36} ${h * 0.9} L${w * 0.33} ${h * 0.875} L${w * 0.19} ${h * 0.875} Z`} fill="#2B1A16" />
      <circle cx={w * 0.27} cy={h * 0.86} r={m * 0.014} fill="#F6C443" />
      <circle cx={w * 0.27} cy={h * 0.86} r={m * 0.03} fill="#F6C443" opacity={0.25} />
      {strings.map((s, si) => {
        const pts = (t: number) => ({ x: -w * 0.05 + t * w * 1.1, y: s.y0 + (s.y1 - s.y0) * t + s.sag * 4 * t * (1 - t) });
        const d = Array.from({ length: 21 }, (_, i) => { const p = pts(i / 20); return `${i ? 'L' : 'M'}${f2(p.x)} ${f2(p.y)}`; }).join(' ');
        const cnt = Math.max(5, Math.round(w / (L * 4.2)));
        return (
          <g key={si}>
            <path d={d} stroke="#3A2214" strokeWidth={m * 0.004} fill="none" />
            {Array.from({ length: cnt }, (_, k) => {
              const p = pts((k + 0.5 + s.off * 0.5) / (cnt + 0.5)), c = lanternC[(k + si) % 4], cy = p.y + L * 1.3;
              return (
                <g key={k}>
                  <circle cx={p.x} cy={cy} r={L * 1.8} fill={c} opacity={0.22} />
                  <line x1={p.x} y1={p.y} x2={p.x} y2={cy - L} stroke="#3A2214" strokeWidth={m * 0.003} />
                  <ellipse cx={p.x} cy={cy} rx={L * 0.82} ry={L} fill={c} />
                  <ellipse cx={p.x} cy={cy} rx={L * 0.45} ry={L} fill="none" stroke="#000" strokeOpacity={0.18} strokeWidth={m * 0.003} />
                  <rect x={p.x - L * 0.42} y={cy - L * 1.08} width={L * 0.84} height={L * 0.22} fill="#5A2A1A" />
                  <rect x={p.x - L * 0.42} y={cy + L * 0.86} width={L * 0.84} height={L * 0.22} fill="#5A2A1A" />
                  <line x1={p.x} y1={cy + L * 1.08} x2={p.x} y2={cy + L * 1.7} stroke={c} strokeWidth={m * 0.006} />
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

function SceneTerrace({ w, h, u }: { w: number; h: number; u: string }) {
  const m = Math.min(w, h);
  const cols = ['#D8C25A', '#A8B94A', '#C9B44C', '#8DAA45', '#E0C866', '#9CB44A', '#C2A93F'];
  const y0 = h * 0.44, nb = 9;
  const bands: ReactNode[] = [];
  for (let j = 0; j < nb; j++) {
    const base = y0 + ((h - y0) * Math.pow(j / nb, 1.15)) - h * 0.02;
    const amp = h * (0.018 + j * 0.004), ph = j * 1.3, fq = (Math.PI * 2 * (1.1 + (j % 3) * 0.25)) / w;
    const pts = Array.from({ length: 33 }, (_, i) => { const x = -w * 0.05 + (i / 32) * w * 1.1; return [x, base + amp * Math.sin(x * fq + ph)]; });
    const top = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)} ${f2(y)}`).join(' ');
    bands.push(
      <g key={j}>
        <path d={`${top} L${w * 1.05} ${h * 1.02} L${-w * 0.05} ${h * 1.02} Z`} fill={cols[j % cols.length]} />
        <path d={top} stroke="#F1E6A8" strokeWidth={m * 0.006} fill="none" opacity={0.85} />
        <path d={pts.map(([x, y], i) => `${i ? 'L' : 'M'}${f2(x)} ${f2(y + amp * 0.9)}`).join(' ')} stroke="#6E7F2E" strokeWidth={m * 0.003} fill="none" opacity={0.35} />
      </g>,
    );
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-ts`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9DD0EA" /><stop offset="1" stopColor="#F4EFD8" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${u}-ts)`} />
      <circle cx={w * 0.78} cy={h * 0.2} r={m * 0.07} fill="#FFE8A3" />
      <circle cx={w * 0.78} cy={h * 0.2} r={m * 0.12} fill="#FFE8A3" opacity={0.3} />
      <path d={`M0 ${h * 0.5} L${w * 0.14} ${h * 0.3} L${w * 0.3} ${h * 0.42} L${w * 0.48} ${h * 0.24} L${w * 0.66} ${h * 0.4} L${w * 0.84} ${h * 0.28} L${w} ${h * 0.4} L${w} ${h * 0.6} L0 ${h * 0.6} Z`} fill="#8FA9B8" />
      <path d={`M0 ${h * 0.52} L${w * 0.22} ${h * 0.38} L${w * 0.4} ${h * 0.48} L${w * 0.6} ${h * 0.36} L${w * 0.8} ${h * 0.47} L${w} ${h * 0.4} L${w} ${h * 0.62} L0 ${h * 0.62} Z`} fill="#6E8F7E" />
      {bands}
      {/* chòi nhỏ */}
      <g transform={`translate(${w * 0.68} ${h * 0.6})`}>
        <rect x={-m * 0.04} y={-m * 0.05} width={m * 0.08} height={m * 0.05} fill="#8A5A34" />
        <path d={`M${-m * 0.06} ${-m * 0.05} L0 ${-m * 0.1} L${m * 0.06} ${-m * 0.05} Z`} fill="#5E3A22" />
      </g>
    </g>
  );
}

function SceneBeach({ w, h, u }: { w: number; h: number; u: string }) {
  const m = Math.min(w, h), r = mkRng(3);
  const sea0 = h * 0.5, shore = h * 0.74;
  const tx = w * 0.84, ty = h * 0.96;
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-bs`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#5DB8E3" /><stop offset="1" stopColor="#D7F0F6" /></linearGradient>
        <linearGradient id={`${u}-bw`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#167BA6" /><stop offset="1" stopColor="#40BFCB" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${u}-bs)`} />
      <circle cx={w * 0.24} cy={h * 0.22} r={m * 0.07} fill="#FFF3C4" />
      <circle cx={w * 0.24} cy={h * 0.22} r={m * 0.13} fill="#FFF3C4" opacity={0.35} />
      {[[0.55, 0.16, 1], [0.75, 0.3, 0.8], [0.12, 0.38, 0.7]].map(([x, y, s], i) => (
        <g key={i} fill="#FFFFFF" opacity={0.9}>
          <ellipse cx={w * x} cy={h * y} rx={m * 0.09 * s} ry={m * 0.03 * s} />
          <ellipse cx={w * x + m * 0.05 * s} cy={h * y - m * 0.02 * s} rx={m * 0.06 * s} ry={m * 0.03 * s} />
        </g>
      ))}
      <path d={`M${w * 0.55} ${sea0} Q${w * 0.65} ${sea0 - h * 0.07} ${w * 0.78} ${sea0} Z`} fill="#4F8A8B" />
      <rect x={0} y={sea0} width={w} height={shore - sea0 + h * 0.04} fill={`url(#${u}-bw)`} />
      {Array.from({ length: 12 }, (_, i) => {
        const y = sea0 + (shore - sea0) * (0.1 + r() * 0.8), x = r() * w * 0.9, l = w * (0.05 + r() * 0.1);
        return <path key={i} d={`M${f2(x)} ${f2(y)} q${f2(l / 4)} ${f2(-m * 0.008)} ${f2(l / 2)} 0 t${f2(l / 2)} 0`} stroke="#FFFFFF" strokeWidth={m * 0.004} fill="none" opacity={0.6} />;
      })}
      <ellipse cx={w * 0.36} cy={sea0 + (shore - sea0) * 0.5} rx={m * 0.035} ry={m * 0.012} fill="#6B4A2B" />
      <path d={`M0 ${shore} Q${w * 0.3} ${shore - h * 0.04} ${w * 0.6} ${shore + h * 0.01} T${w} ${shore - h * 0.02} L${w} ${h} L0 ${h} Z`} fill="#F2D7A2" />
      <path d={`M0 ${shore} Q${w * 0.3} ${shore - h * 0.04} ${w * 0.6} ${shore + h * 0.01} T${w} ${shore - h * 0.02}`} stroke="#FFFFFF" strokeWidth={m * 0.012} fill="none" opacity={0.85} />
      {/* cây dừa */}
      <path d={`M${tx} ${ty} Q${tx - w * 0.02} ${h * 0.6} ${tx - w * 0.09} ${h * 0.3}`} stroke="#7A5230" strokeWidth={m * 0.03} fill="none" strokeLinecap="round" />
      {Array.from({ length: 7 }, (_, i) => {
        const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 1.15, cx = tx - w * 0.09, cy = h * 0.3, L = m * 0.22;
        const ex = cx + Math.cos(a) * L, ey = cy + Math.sin(a) * L * 0.6 + L * 0.25;
        const mx = cx + Math.cos(a) * L * 0.5, my = cy + Math.sin(a) * L * 0.5 - L * 0.12;
        return <path key={i} d={`M${f2(cx)} ${f2(cy)} Q${f2(mx)} ${f2(my - m * 0.03)} ${f2(ex)} ${f2(ey)} Q${f2(mx)} ${f2(my + m * 0.03)} ${f2(cx)} ${f2(cy)} Z`} fill={i % 2 ? '#2F7D4F' : '#3E9460'} />;
      })}
      <circle cx={tx - w * 0.09} cy={h * 0.31} r={m * 0.018} fill="#6B4A2B" />
    </g>
  );
}

function pine(x: number, y: number, hh: number, c: string, k: string) {
  const wd = hh * 0.42;
  return (
    <g key={k} fill={c}>
      <rect x={x - hh * 0.03} y={y - hh * 0.12} width={hh * 0.06} height={hh * 0.12} fill="#3B2A22" />
      {[0, 1, 2].map((i) => {
        const t = y - hh * 0.1 - i * hh * 0.26, s = 1 - i * 0.22;
        return <path key={i} d={`M${f2(x - wd * s)} ${f2(t)} L${f2(x)} ${f2(t - hh * 0.42)} L${f2(x + wd * s)} ${f2(t)} Z`} />;
      })}
    </g>
  );
}
function SceneDalat({ w, h, u }: { w: number; h: number; u: string }) {
  const m = Math.min(w, h), r = mkRng(5);
  const hill = (y: number, a: number, ph: number) => `M${-w * 0.05} ${h} L${-w * 0.05} ${f2(y)} ${Array.from({ length: 17 }, (_, i) => { const x = -w * 0.05 + (i / 16) * w * 1.1; return `L${f2(x)} ${f2(y - a * (0.5 + 0.5 * Math.sin(x / w * 7 + ph)))}`; }).join(' ')} L${w * 1.05} ${h} Z`;
  const trees: ReactNode[] = [];
  for (let i = 0; i < 16; i++) { const x = r() * w, y = h * (0.52 + r() * 0.06); trees.push(pine(x, y, m * (0.12 + r() * 0.06), '#4A6E62', `a${i}`)); }
  const front: ReactNode[] = [];
  for (let i = 0; i < 9; i++) { const x = (i / 8) * w * 0.98 + r() * w * 0.03, y = h * (0.73 + r() * 0.04); front.push(pine(x, y, m * (0.2 + r() * 0.1), '#24483E', `b${i}`)); }
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-ds`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#F3C9D8" /><stop offset="1" stopColor="#D6E2F4" /></linearGradient>
        <linearGradient id={`${u}-df`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#FFFFFF" stopOpacity={0} /><stop offset="1" stopColor="#FFFFFF" stopOpacity={0.75} /></linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${u}-ds)`} />
      <circle cx={w * 0.7} cy={h * 0.22} r={m * 0.06} fill="#FFF6E6" opacity={0.9} />
      <path d={hill(h * 0.42, h * 0.08, 0.3)} fill="#B9B6DA" />
      <path d={hill(h * 0.52, h * 0.07, 2.1)} fill="#8E9BC4" />
      {trees}
      <rect x={0} y={h * 0.42} width={w} height={h * 0.18} fill={`url(#${u}-df)`} />
      <path d={hill(h * 0.68, h * 0.05, 4)} fill="#5E7A8F" />
      {front}
      <rect x={0} y={h * 0.82} width={w} height={h * 0.18} fill="#9FB7CF" />
      {Array.from({ length: 10 }, (_, i) => <rect key={i} x={r() * w} y={h * (0.85 + r() * 0.12)} width={w * (0.04 + r() * 0.1)} height={m * 0.004} fill="#FFFFFF" opacity={0.55} />)}
      <path d={`M${w * 0.58} ${h * 0.9} Q${w * 0.64} ${h * 0.93} ${w * 0.7} ${h * 0.9} L${w * 0.68} ${h * 0.885} L${w * 0.6} ${h * 0.885} Z`} fill="#4B3A33" />
      {/* cẩm tú cầu góc dưới */}
      {Array.from({ length: 26 }, (_, i) => {
        const a = r() * Math.PI * 2, d = r() * m * 0.08;
        return <circle key={i} cx={w * 0.08 + Math.cos(a) * d} cy={h * 0.93 + Math.sin(a) * d * 0.7} r={m * 0.016} fill={i % 3 ? '#8FA6E0' : '#C89BD8'} />;
      })}
    </g>
  );
}

function SceneSaigon({ w, h, u }: { w: number; h: number; u: string }) {
  const m = Math.min(w, h), r = mkRng(9);
  const river = h * 0.8;
  const bl: ReactNode[] = [];
  const cols = ['#2A2340', '#33294D', '#2C3350', '#3A2F55'];
  let x = -w * 0.02, i = 0;
  while (x < w * 1.02) {
    const bw = w * (0.05 + r() * 0.06), bh = h * (0.16 + r() * 0.24);
    const skip = x > w * 0.42 && x < w * 0.62;
    if (!skip) {
      const top = river - bh;
      bl.push(<rect key={`b${i}`} x={x} y={top} width={bw} height={bh} fill={cols[i % 4]} />);
      for (let wy = top + m * 0.02; wy < river - m * 0.02; wy += m * 0.028) for (let wx = x + bw * 0.15; wx < x + bw * 0.85; wx += bw * 0.22) if (r() > 0.45) bl.push(<rect key={`w${i}-${f2(wx)}-${f2(wy)}`} x={wx} y={wy} width={bw * 0.1} height={m * 0.012} fill="#FFD58A" opacity={0.85} />);
    }
    x += bw + w * 0.006; i++;
  }
  // tháp cao (kiểu tháp 81 tầng) + tháp búp sen có sân đỗ
  const lx = w * 0.56, lw = w * 0.07;
  const lm = [0, 1, 2, 3].map((k) => <rect key={k} x={lx - lw / 2 + k * lw * 0.08} y={river - h * (0.62 - k * 0.0)} width={lw - k * lw * 0.16} height={h * 0.62 - k * h * 0.1} fill={k % 2 ? '#3A3460' : '#302A52'} />);
  const bx = w * 0.46;
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-ss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1F2547" /><stop offset="0.45" stopColor="#7A4E7A" /><stop offset="0.75" stopColor="#F08A5D" /><stop offset="1" stopColor="#F7C77B" />
        </linearGradient>
        <linearGradient id={`${u}-sr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3B3366" /><stop offset="1" stopColor="#15183A" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${u}-ss)`} />
      <circle cx={w * 0.3} cy={h * 0.62} r={m * 0.12} fill="#FFD27A" opacity={0.85} />
      {Array.from({ length: 30 }, (_, k) => <circle key={k} cx={r() * w} cy={r() * h * 0.35} r={m * 0.004} fill="#FFFFFF" opacity={0.7} />)}
      <path d={`M0 ${river} ${Array.from({ length: 24 }, (_, k) => { const xx = (k / 23) * w; return `L${f2(xx)} ${f2(river - h * (0.1 + (k % 3) * 0.04))} L${f2(xx + w / 46)} ${f2(river - h * (0.1 + (k % 3) * 0.04))}`; }).join(' ')} L${w} ${river} Z`} fill="#3A2F55" opacity={0.55} />
      {bl}
      {lm}
      <path d={`M${lx - m * 0.008} ${river - h * 0.62} L${lx} ${river - h * 0.72} L${lx + m * 0.008} ${river - h * 0.62} Z`} fill="#302A52" />
      <path d={`M${bx - w * 0.035} ${river} L${bx - w * 0.02} ${river - h * 0.48} Q${bx} ${river - h * 0.56} ${bx + w * 0.02} ${river - h * 0.48} L${bx + w * 0.035} ${river} Z`} fill="#3D3466" />
      <ellipse cx={bx + w * 0.022} cy={river - h * 0.4} rx={w * 0.025} ry={m * 0.008} fill="#56497F" />
      {Array.from({ length: 10 }, (_, k) => <rect key={k} x={bx - w * 0.015} y={river - h * 0.45 + k * h * 0.04} width={w * 0.03} height={m * 0.006} fill="#FFD58A" opacity={0.7} />)}
      <rect x={0} y={river} width={w} height={h - river} fill={`url(#${u}-sr)`} />
      {Array.from({ length: 26 }, (_, k) => <rect key={k} x={r() * w} y={river + (h - river) * (0.08 + r() * 0.85)} width={w * (0.02 + r() * 0.06)} height={m * 0.005} fill={k % 3 ? '#FFD58A' : '#F08A5D'} opacity={0.55} />)}
      <path d={`M${w * 0.7} ${h * 0.9} L${w * 0.86} ${h * 0.9} L${w * 0.84} ${h * 0.92} L${w * 0.72} ${h * 0.92} Z`} fill="#0F1230" />
      <rect x={w * 0.75} y={h * 0.875} width={w * 0.06} height={h * 0.025} fill="#0F1230" />
    </g>
  );
}

function lotusFlower(x: number, y: number, s: number, u: string, k: string) {
  const petal = (a: number, len: number, wid: number, fill: string, key: string) => {
    const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
    const tx = x + ca * len, ty = y + sa * len;
    return <path key={key} d={`M${f2(x)} ${f2(y)} Q${f2(x + ca * len * 0.5 + px * wid)} ${f2(y + sa * len * 0.5 + py * wid)} ${f2(tx)} ${f2(ty)} Q${f2(x + ca * len * 0.5 - px * wid)} ${f2(y + sa * len * 0.5 - py * wid)} ${f2(x)} ${f2(y)} Z`} fill={fill} />;
  };
  return (
    <g key={k}>
      {[-2.5, -0.64].map((a, i) => petal(a, s * 0.95, s * 0.3, `url(#${u}-lp2)`, `o${i}`))}
      {[-2.15, -1.0].map((a, i) => petal(a, s * 1.05, s * 0.34, `url(#${u}-lp)`, `m${i}`))}
      {petal(-Math.PI / 2, s * 1.15, s * 0.36, `url(#${u}-lp)`, 'c')}
      {[-1.85, -1.29].map((a, i) => petal(a, s * 0.85, s * 0.26, '#F7B8CE', `i${i}`))}
      <ellipse cx={x} cy={y - s * 0.1} rx={s * 0.16} ry={s * 0.08} fill="#F7D46B" />
    </g>
  );
}
function SceneLotus({ w, h, u }: { w: number; h: number; u: string }) {
  const m = Math.min(w, h), r = mkRng(13);
  const leaf = (cx: number, cy: number, rr: number, c: string, k: string) => {
    const a0 = 0.3 + r() * 5;
    const P = (a: number) => `${f2(cx + Math.cos(a) * rr)} ${f2(cy + Math.sin(a) * rr * 0.55)}`;
    const d = `M${f2(cx)} ${f2(cy)} L${P(a0 + 0.3)} A${f2(rr)} ${f2(rr * 0.55)} 0 1 1 ${P(a0)} Z`;
    return (
      <g key={k}>
        <path d={d} fill={c} />
        {Array.from({ length: 9 }, (_, i) => { const a = a0 + 0.5 + (i / 9) * Math.PI * 1.8; return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * rr * 0.9} y2={cy + Math.sin(a) * rr * 0.5} stroke="#BFE3B0" strokeWidth={m * 0.003} opacity={0.6} />; })}
      </g>
    );
  };
  return (
    <g>
      <defs>
        <linearGradient id={`${u}-lw`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#D5EFE8" /><stop offset="1" stopColor="#7FC4B8" /></linearGradient>
        <linearGradient id={`${u}-lp`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#F6C2D3" /><stop offset="1" stopColor="#E25E8E" /></linearGradient>
        <linearGradient id={`${u}-lp2`} x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#F9D3E0" /><stop offset="1" stopColor="#EA82A6" /></linearGradient>
      </defs>
      <rect x={0} y={0} width={w} height={h} fill={`url(#${u}-lw)`} />
      {Array.from({ length: 10 }, (_, i) => <ellipse key={i} cx={r() * w} cy={h * (0.2 + r() * 0.75)} rx={m * (0.05 + r() * 0.08)} ry={m * 0.015} fill="none" stroke="#FFFFFF" strokeWidth={m * 0.003} opacity={0.5} />)}
      {leaf(w * 0.18, h * 0.3, m * 0.2, '#57A86B', 'l1')}
      {leaf(w * 0.85, h * 0.25, m * 0.17, '#3E8E5A', 'l2')}
      {leaf(w * 0.62, h * 0.82, m * 0.26, '#3E8E5A', 'l3')}
      {leaf(w * 0.1, h * 0.86, m * 0.2, '#4C9A62', 'l4')}
      {leaf(w * 0.92, h * 0.7, m * 0.16, '#57A86B', 'l5')}
      <path d={`M${w * 0.42} ${h * 0.98} Q${w * 0.41} ${h * 0.75} ${w * 0.4} ${h * 0.56}`} stroke="#4C7F45" strokeWidth={m * 0.012} fill="none" />
      <path d={`M${w * 0.72} ${h * 0.98} Q${w * 0.74} ${h * 0.7} ${w * 0.75} ${h * 0.45}`} stroke="#4C7F45" strokeWidth={m * 0.01} fill="none" />
      {lotusFlower(w * 0.4, h * 0.56, m * 0.2, u, 'f1')}
      {lotusFlower(w * 0.75, h * 0.45, m * 0.14, u, 'f2')}
      <path d={`M${w * 0.27} ${h * 0.98} Q${w * 0.26} ${h * 0.82} ${w * 0.28} ${h * 0.68}`} stroke="#4C7F45" strokeWidth={m * 0.009} fill="none" />
      <path d={`M${w * 0.28} ${h * 0.68} Q${w * 0.25} ${h * 0.6} ${w * 0.28} ${h * 0.52} Q${w * 0.31} ${h * 0.6} ${w * 0.28} ${h * 0.68} Z`} fill={`url(#${u}-lp)`} />
    </g>
  );
}

const SCENES: Record<SceneId, (p: { w: number; h: number; u: string }) => JSX.Element> = {
  hoian: SceneHoian, terrace: SceneTerrace, beach: SceneBeach, dalat: SceneDalat, saigon: SceneSaigon, lotus: SceneLotus,
};
/** cảnh hoặc ảnh khách lấp đầy hộp (x,y,w,h) */
function Fill({ scene, photo, x, y, w, h, u }: { scene: SceneId; photo?: string; x: number; y: number; w: number; h: number; u: string }) {
  const S = SCENES[scene] || SceneHoian;
  return (
    <g>
      <defs><clipPath id={`${u}-clip`}><rect x={x} y={y} width={w} height={h} /></clipPath></defs>
      <g clipPath={`url(#${u}-clip)`}>
        {photo
          ? <image href={photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
          : <g transform={`translate(${f2(x)} ${f2(y)})`}><S w={w} h={h} u={u} /></g>}
      </g>
    </g>
  );
}

// ---------- tem thư ----------
function Stamp({ x, y, w, h, scene, p, u, value = '4000đ' }: { x: number; y: number; w: number; h: number; scene: SceneId; p: PCPalette; u: string; value?: string }) {
  const S = SCENES[scene] || SceneHoian;
  const rr = Math.min(w, h) * 0.045, step = rr * 2.6;
  // mép răng cưa: hình chữ nhật trắng + các lỗ tròn màu giấy dọc 4 cạnh
  const holes: ReactNode[] = [];
  for (let t = rr * 1.4; t < w - rr; t += step) { holes.push(<circle key={`t${t}`} cx={x + t} cy={y} r={rr} fill={p.paper} />, <circle key={`b${t}`} cx={x + t} cy={y + h} r={rr} fill={p.paper} />); }
  for (let t = rr * 1.4; t < h - rr; t += step) { holes.push(<circle key={`l${t}`} cx={x} cy={y + t} r={rr} fill={p.paper} />, <circle key={`r${t}`} cx={x + w} cy={y + t} r={rr} fill={p.paper} />); }
  const pad = w * 0.1, iw = w - pad * 2, ih = h - pad * 2 - h * 0.16;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" />
      {holes}
      <rect x={x + pad} y={y + pad} width={iw} height={ih} fill="#ddd" />
      <svg x={x + pad} y={y + pad} width={iw} height={ih} viewBox={`0 0 ${iw} ${ih}`} preserveAspectRatio="xMidYMid slice" overflow="hidden">
        <S w={iw} h={ih} u={`${u}-st`} />
      </svg>
      <g fontFamily={`"${BODY}"`} fontWeight={800} fill={p.accent}>
        <text x={x + pad} y={y + h - pad * 0.95} fontSize={h * 0.068}>VIỆT NAM</text>
        <text x={x + w - pad} y={y + h - pad * 0.95} fontSize={h * 0.068} textAnchor="end">{value}</text>
      </g>
    </g>
  );
}
function Postmark({ cx, cy, rr, place, color }: { cx: number; cy: number; rr: number; place: string; color: string }) {
  const sw = rr * 0.06;
  return (
    <g opacity={0.72} stroke={color} fill="none" strokeWidth={sw}>
      <circle cx={cx} cy={cy} r={rr} />
      <circle cx={cx} cy={cy} r={rr * 0.8} strokeWidth={sw * 0.6} />
      {[-0.45, -0.15, 0.15, 0.45].map((k) => (
        <path key={k} d={`M${f2(cx + rr * 0.95)} ${f2(cy + k * rr)} q${f2(rr * 0.35)} ${f2(-rr * 0.18)} ${f2(rr * 0.7)} 0 t${f2(rr * 0.7)} 0`} strokeWidth={sw * 0.8} />
      ))}
      <g stroke="none" fill={color} fontFamily={`"${BODY}"`} fontWeight={800} textAnchor="middle">
        <text x={cx} y={cy - rr * 0.18} fontSize={Math.min(rr * 0.26, (rr * 1.45) / (Math.max(4, place.length) * 0.66))}>{place.toUpperCase()}</text>
        <text x={cx} y={cy + rr * 0.26} fontSize={rr * 0.22}>06.02.2027</text>
      </g>
    </g>
  );
}

// ---------- icon nhỏ ----------
function heart(x: number, y: number, s: number, fill: string, k?: string) {
  return <path key={k} d={`M${f2(x)} ${f2(y + s * 0.35)} C${f2(x - s * 0.9)} ${f2(y - s * 0.25)} ${f2(x - s * 0.35)} ${f2(y - s * 0.75)} ${f2(x)} ${f2(y - s * 0.3)} C${f2(x + s * 0.35)} ${f2(y - s * 0.75)} ${f2(x + s * 0.9)} ${f2(y - s * 0.25)} ${f2(x)} ${f2(y + s * 0.35)} Z`} fill={fill} />;
}
function leafSprig(x: number, y: number, s: number, rot: number, c: string, k: string) {
  return (
    <g key={k} transform={`translate(${f2(x)} ${f2(y)}) rotate(${rot})`}>
      <path d={`M0 0 Q${s * 0.1} ${-s * 0.5} 0 ${-s}`} stroke={c} strokeWidth={s * 0.04} fill="none" />
      {[0.25, 0.45, 0.65, 0.85].map((t, i) => (
        <g key={i}>
          <path d={`M0 ${-s * t} q${-s * 0.28} ${-s * 0.04} ${-s * 0.3} ${-s * 0.18} q${s * 0.2} ${s * 0.02} ${s * 0.3} ${s * 0.18} Z`} fill={c} />
          <path d={`M0 ${-s * (t + 0.08)} q${s * 0.28} ${-s * 0.04} ${s * 0.3} ${-s * 0.18} q${-s * 0.2} ${s * 0.02} ${-s * 0.3} ${s * 0.18} Z`} fill={c} />
        </g>
      ))}
    </g>
  );
}
function monogram(brand: string) {
  const words = (brand || '').trim().split(/\s+/).filter(Boolean);
  return (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] || 'M').slice(0, 2)).toUpperCase();
}

// ============ SVG chính ============
export interface PostcardProps {
  spec: PCSpec; data: PCData; side: 'front' | 'back'; bleed?: boolean; photo?: string; logo?: string;
  /** bộ bưu thiếp: cảnh của tấm này (bỏ qua spec.scene, tiêu đề lấy theo cảnh) */
  scene?: SceneId;
  /** chỉ để xem 3D: viết tay mẫu lên mặt sau */
  demoHand?: boolean;
  style?: CSSProperties;
}

export function PostcardSvg({ spec, data, side, bleed = false, photo, logo, scene: sceneOv, demoHand = false, style }: PostcardProps) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const u = `pc${rid}`;
  const d = pcDims(spec.size, spec.orient);
  const W = d.wMm, H = d.hMm, b = bleed ? PC_BLEED_MM : 0;
  const p = pcPalette(spec.palette), f = pcFont(spec.font);
  const scene = sceneOv || spec.scene;
  const sc = pcScene(scene);
  const inSet = !!sceneOv;
  const title = inSet ? sc.title : data.title || '';
  const caption = inSet ? sc.caption : data.caption || '';
  const m = Math.min(W, H);
  const safe = m * 0.06; // lề an toàn chữ
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  const tsT: TS = { fam: f.family, wt: f.weight };
  const tsB: TS = { fam: BODY, wt: 600 };
  const tsBB: TS = { fam: BODY, wt: 800 };
  const usePhoto = inSet ? undefined : photo;
  let body: ReactNode;

  if (side === 'front') {
    if (spec.front === 'full') {
      const tSize = m * (f.script ? 0.2 : 0.15);
      const capB = block({ text: caption, x: safe, y: H - safe, maxW: W * 0.7, size: m * 0.05, maxLines: 1, ts: { ...tsBB, ls: 0.12 }, fill: '#FFFFFF', upper: true });
      const tt = block({ text: title, x: safe, y: 0, maxW: W - safe * 2, size: tSize, maxLines: 2, lh: f.script ? 1.0 : 1.05, ts: tsT, fill: '#FFFFFF' });
      const capH = capB.h ? capB.size * 1.6 : 0;
      const tY = H - safe - capH - tt.h + tt.size * 0.78;
      const titleB = block({ text: title, x: safe, y: tY, maxW: W - safe * 2, size: tSize, maxLines: 2, lh: f.script ? 1.0 : 1.05, ts: tsT, fill: '#FFFFFF' });
      body = (
        <>
          <Fill scene={scene} photo={usePhoto} x={-b} y={-b} w={W + b * 2} h={H + b * 2} u={u} />
          <defs>
            <linearGradient id={`${u}-scrim`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={0.55} /></linearGradient>
            <filter id={`${u}-sh`} x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx={0} dy={m * 0.006} stdDeviation={m * 0.01} floodColor="#000" floodOpacity={0.45} /></filter>
          </defs>
          <rect x={-b} y={H * 0.45} width={W + b * 2} height={H * 0.55 + b} fill={`url(#${u}-scrim)`} />
          <g filter={`url(#${u}-sh)`}>{titleB.el}{capB.el}</g>
        </>
      );
    } else if (spec.front === 'frame') {
      const mg = m * 0.055, bot = m * 0.17;
      const ix = mg, iy = mg, iw = W - mg * 2, ih = H - mg - bot;
      const tt = block({ text: title, x: ix, y: iy + ih + bot * 0.56, maxW: iw * 0.6, size: bot * (f.script ? 0.56 : 0.42), maxLines: 1, ts: tsT, fill: p.ink });
      const cap = block({ text: caption, x: ix + iw, y: iy + ih + bot * 0.52, maxW: iw * 0.36, size: bot * 0.17, maxLines: 2, lh: 1.25, anchor: 'end', ts: { ...tsB, ls: 0.04 }, fill: p.sub });
      body = (
        <>
          <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
          <Fill scene={scene} photo={usePhoto} x={ix} y={iy} w={iw} h={ih} u={u} />
          <rect x={ix - mg * 0.3} y={iy - mg * 0.3} width={iw + mg * 0.6} height={ih + mg * 0.6} fill="none" stroke={p.line} strokeWidth={m * 0.004} />
          {tt.el}
          {cap.el}
        </>
      );
    } else if (spec.front === 'greet') {
      const bigO = { text: title, x: W / 2, maxW: W - safe * 2, size: m * 0.24, maxLines: 2, lh: 0.98, anchor: 'middle' as Anchor, ts: { ...tsT, ls: f.script ? 0 : 0.02 }, fill: p.accent, upper: !f.script };
      const probe = block({ ...bigO, y: 0 });
      const gSize = m * 0.09;
      // khối (chữ nhỏ + tiêu đề lớn + dòng phụ) canh giữa theo chiều dọc, chữ nhỏ luôn nằm TRÊN đỉnh tiêu đề
      const blockH = gSize * 1.1 + probe.size * 0.8 + (probe.h - probe.size * 0.98) + probe.size * 0.2 + m * 0.08;
      const yBig = Math.max(safe + gSize * 1.2 + probe.size * 0.8, H / 2 - blockH / 2 + gSize * 1.1 + probe.size * 0.8);
      const gT = block({ text: data.greet || 'Chào từ', x: W / 2, y: yBig - probe.size * 0.82 - m * 0.02, maxW: W * 0.6, size: gSize, maxLines: 1, anchor: 'middle', ts: { fam: 'Dancing Script', wt: 700 }, fill: '#FFFFFF' });
      const big = block({ ...bigO, y: yBig });
      const bigEl = big.el;
      const cap = block({ text: caption, x: W / 2, y: Math.min(H - safe, yBig + big.h - big.size * 0.98 + big.size * 0.2 + m * 0.08), maxW: W * 0.7, size: m * 0.045, maxLines: 1, anchor: 'middle', ts: { ...tsBB, ls: 0.14 }, fill: '#FFFFFF', upper: true });
      body = (
        <>
          <Fill scene={scene} photo={usePhoto} x={-b} y={-b} w={W + b * 2} h={H + b * 2} u={u} />
          <defs>
            <filter id={`${u}-sh`} x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx={0} dy={m * 0.008} stdDeviation={m * 0.006} floodColor="#000" floodOpacity={0.5} /></filter>
          </defs>
          <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill="#000" opacity={0.12} />
          <g filter={`url(#${u}-sh)`}>
            {gT.el}
            <g stroke="#FFFFFF" strokeWidth={m * 0.012} strokeLinejoin="round" paintOrder="stroke">{bigEl}</g>
            {cap.el}
          </g>
          <rect x={m * 0.03} y={m * 0.03} width={W - m * 0.06} height={H - m * 0.06} fill="none" stroke="#FFFFFF" strokeWidth={m * 0.006} opacity={0.85} rx={m * 0.015} />
        </>
      );
    } else {
      // thanks: nền giấy + lời cảm ơn lớn + lá/tim trang trí
      const big = block({ text: data.bigline || 'Cảm ơn bạn!', x: W / 2, y: H * 0.5, maxW: W - safe * 2.4, size: m * (f.script ? 0.22 : 0.16), maxLines: 2, lh: 1.0, anchor: 'middle', ts: tsT, fill: p.accent });
      const y0 = H * 0.5 - big.h / 2 + big.size * 0.55;
      const bigB = block({ text: data.bigline || 'Cảm ơn bạn!', x: W / 2, y: y0, maxW: W - safe * 2.4, size: m * (f.script ? 0.22 : 0.16), maxLines: 2, lh: 1.0, anchor: 'middle', ts: tsT, fill: p.accent });
      const brandB = block({ text: data.brand || '', x: W / 2, y: y0 - bigB.size * 0.95 - m * 0.02, maxW: W * 0.7, size: m * 0.045, maxLines: 1, anchor: 'middle', ts: { ...tsBB, ls: 0.22 }, fill: p.ink, upper: true });
      const subB = block({ text: data.sub || '', x: W / 2, y: y0 + bigB.h - bigB.size * 0.2 + m * 0.07, maxW: W * 0.72, size: m * 0.045, maxLines: 2, anchor: 'middle', ts: tsB, fill: p.sub });
      const deco: ReactNode[] = [];
      deco.push(leafSprig(m * 0.1, H - m * 0.02, m * 0.3, -28, p.accent2, 'l1'), leafSprig(m * 0.17, H + m * 0.02, m * 0.22, 8, p.accent2, 'l2'));
      deco.push(leafSprig(W - m * 0.1, m * 0.02, m * 0.3, 152, p.accent2, 'l3'), leafSprig(W - m * 0.17, -m * 0.02, m * 0.22, 188, p.accent2, 'l4'));
      const hr = mkRng(21);
      for (let i = 0; i < 7; i++) deco.push(heart(W * (0.12 + hr() * 0.76), H * (hr() < 0.5 ? 0.08 + hr() * 0.12 : 0.8 + hr() * 0.12), m * (0.025 + hr() * 0.02), i % 2 ? p.accent : p.line, `h${i}`));
      body = (
        <>
          <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
          {spec.palette === 'kraft' && Array.from({ length: 60 }, (_, i) => { const r = mkRng(i + 3); return <rect key={i} x={r() * W} y={r() * H} width={m * 0.04} height={m * 0.002} fill="#8A6A45" opacity={0.25} transform={`rotate(${f2(r() * 180)} ${f2(r() * W)} ${f2(r() * H)})`} />; })}
          <rect x={m * 0.04} y={m * 0.04} width={W - m * 0.08} height={H - m * 0.08} fill="none" stroke={p.line} strokeWidth={m * 0.005} rx={m * 0.02} />
          {deco}
          {brandB.el}
          {bigB.el}
          {subB.el}
        </>
      );
    }
  } else if (spec.back === 'classic') {
    // ---------- mặt sau bưu thiếp cổ điển ----------
    const port = H > W * 1.05;
    const pad = m * 0.07;
    const header = block({ text: 'Bưu thiếp · Postcard', x: pad, y: pad + m * 0.035, maxW: W * 0.5, size: m * 0.04, maxLines: 1, ts: { ...tsBB, ls: 0.18 }, fill: p.accent, upper: true });
    // vùng lời nhắn / vùng địa chỉ
    const msg = port ? { x: pad, y: pad + m * 0.09, w: W - pad * 2, h: H * 0.42 } : { x: pad, y: pad + m * 0.09, w: W * 0.5 - pad * 1.4, h: H - pad * 2 - m * 0.2 };
    const adr = port ? { x: pad, y: H * 0.54, w: W - pad * 2, h: H * 0.46 - pad } : { x: W * 0.53, y: pad, w: W * 0.47 - pad, h: H - pad * 2 };
    const stW = Math.min(adr.w * 0.4, m * 0.26), stH = stW * 1.2;
    const stX = adr.x + adr.w - stW, stY = adr.y + (port ? m * 0.02 : 0);
    const pmR = stH * 0.42;
    const lines = 4, ly0 = stY + stH + m * 0.12, lgap = Math.min(m * 0.1, (adr.y + adr.h - ly0 - m * 0.02) / (lines - 0.3));
    const msgText = data.message || '';
    const showMsg = spec.printMsg && msgText.trim();
    const hand = demoHand && !showMsg;
    const msgB = showMsg || hand
      ? block({ text: showMsg ? msgText : PC_DEMO_HAND.message, x: msg.x, y: msg.y + m * 0.09, maxW: msg.w, size: m * 0.068, maxLines: port ? 5 : 7, lh: 1.32, ts: { fam: HAND, wt: 700 }, fill: hand ? '#24306B' : p.ink, minSize: m * 0.045, clip: true })
      : null;
    const signB = hand && msgB ? block({ text: PC_DEMO_HAND.sign, x: msg.x + msg.w, y: msg.y + m * 0.09 + msgB.h + m * 0.02, maxW: msg.w, size: m * 0.065, maxLines: 1, anchor: 'end', ts: { fam: HAND, wt: 700 }, fill: '#24306B' }) : null;
    const credit = block({ text: data.credit || data.brand || '', x: pad, y: H - pad * 0.75, maxW: port ? W - pad * 2 : W * 0.46, size: m * 0.032, maxLines: 1, ts: { ...tsB, ls: 0.04 }, fill: p.sub });
    const toLines = demoHand ? PC_DEMO_HAND.to : [];
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
        {header.el}
        {port
          ? <line x1={pad} y1={H * 0.5} x2={W - pad} y2={H * 0.5} stroke={p.line} strokeWidth={m * 0.006} />
          : <line x1={W * 0.5} y1={pad} x2={W * 0.5} y2={H - pad} stroke={p.line} strokeWidth={m * 0.006} />}
        {!showMsg && !hand && Array.from({ length: port ? 5 : 6 }, (_, i) => (
          <line key={i} x1={msg.x} x2={msg.x + msg.w} y1={msg.y + m * 0.11 + i * (msg.h - m * 0.1) / (port ? 5 : 6)} y2={msg.y + m * 0.11 + i * (msg.h - m * 0.1) / (port ? 5 : 6)} stroke={p.line} strokeWidth={m * 0.003} strokeDasharray={`${m * 0.01} ${m * 0.01}`} opacity={0.8} />
        ))}
        {msgB?.el}
        {signB?.el}
        <Stamp x={stX} y={stY} w={stW} h={stH} scene={scene} p={p} u={u} />
        <Postmark cx={stX - pmR * 0.95} cy={stY + stH * 0.55} rr={pmR} place={pcScene(scene).title} color={p.dark ? '#D8DCE6' : '#2E3A5A'} />
        {Array.from({ length: lines }, (_, i) => (
          <line key={i} x1={adr.x + (i === 0 ? m * 0.08 : 0)} x2={adr.x + adr.w} y1={ly0 + i * lgap} y2={ly0 + i * lgap} stroke={p.line} strokeWidth={m * 0.004} />
        ))}
        <text x={adr.x} y={ly0 - m * 0.01} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={m * 0.034} fill={p.sub}>Gửi:</text>
        {toLines.length > 0 && (
          <g fontFamily={`"${HAND}"`} fontWeight={700} fill="#24306B" fontSize={Math.min(lgap * 0.62, m * 0.06)}>
            {toLines.map((t, i) => <text key={i} x={adr.x + (i === 0 ? m * 0.09 : m * 0.01)} y={ly0 + i * lgap - lgap * 0.14}>{t}</text>)}
          </g>
        )}
        {credit.el}
      </>
    );
  } else {
    // ---------- mặt sau cảm ơn shop ----------
    const port = H > W * 1.05;
    const pad = m * 0.08;
    const qrS = port ? m * 0.26 : Math.min(m * 0.3, W * 0.22);
    const colW = port ? W - pad * 2 : W - pad * 3 - qrS;
    let y = pad + m * 0.02;
    const logoS = m * 0.13;
    const logoEl = logo
      ? <image href={logo} x={pad} y={y} width={logoS} height={logoS} preserveAspectRatio="xMidYMid meet" />
      : (
        <g>
          <circle cx={pad + logoS / 2} cy={y + logoS / 2} r={logoS / 2} fill={p.accent} />
          <text x={pad + logoS / 2} y={y + logoS * 0.64} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={logoS * 0.38} fill={p.dark ? p.paper : '#FFFFFF'}>{monogram(data.brand)}</text>
        </g>
      );
    const brandB = block({ text: data.brand || '', x: pad + logoS + m * 0.03, y: y + logoS * 0.62, maxW: colW - logoS - m * 0.03, size: m * 0.05, maxLines: 1, ts: { ...tsBB, ls: 0.1 }, fill: p.ink, upper: true });
    y += logoS + m * 0.08;
    const thx = block({ text: data.thanks || '', x: pad, y: y + m * 0.04, maxW: colW, size: m * 0.085, maxLines: 2, lh: 1.08, ts: tsT, fill: p.accent, minSize: m * 0.045 });
    y += thx.h + m * 0.05;
    // ô mã giảm giá (nét đứt): ngang → ghim đáy cột trái, lời nhắn chỉ được dùng phần còn lại phía trên
    const codeH = m * 0.15, codeW = port ? Math.min(colW - qrS - m * 0.06, m * 0.62) : Math.min(colW, m * 0.62);
    const hasCode = !!data.code?.trim();
    const codeTop = H - pad * 0.8 - m * 0.075 - (hasCode ? codeH : 0);
    const msgLimit = port ? H - pad - m * 0.36 : codeTop - m * 0.035;
    let msgB = block({ text: '', x: 0, y: 0, maxW: 1, size: 1, ts: tsB, fill: '' });
    // co chữ lời nhắn tới khi đủ số dòng cho phép; nhỏ tới mức tối thiểu mà vẫn dài → cắt "…"
    for (let ms = m * 0.042; ; ms *= 0.94) {
      const allow = Math.max(1, Math.min(4, Math.floor((msgLimit - (y + m * 0.02) + ms * 0.8) / (ms * 1.38))));
      const last = ms * 0.94 < m * 0.028;
      if (!last && wrapLines(data.message || '', colW, ms, tsB).length > allow) continue;
      msgB = block({ text: data.message || '', x: pad, y: y + m * 0.02, maxW: colW, size: ms, maxLines: allow, lh: 1.38, ts: tsB, fill: p.sub, minSize: ms, clip: true });
      break;
    }
    y += msgB.h + m * 0.04;
    const codeY = port ? y : codeTop;
    const code = block({ text: data.code || '', x: pad + codeW / 2, y: codeY + codeH * 0.52, maxW: codeW * 0.86, size: codeH * 0.4, maxLines: 1, anchor: 'middle', ts: { ...tsBB, ls: 0.08 }, fill: p.ink });
    const codeNote = block({ text: data.codeNote || '', x: pad + codeW / 2, y: codeY + codeH * 0.84, maxW: codeW * 0.88, size: codeH * 0.17, maxLines: 1, anchor: 'middle', ts: tsB, fill: p.sub });
    const soc = [data.social, data.hotline].filter(Boolean).join('  ·  ');
    const socB = block({ text: soc, x: pad, y: H - pad * 0.8, maxW: port ? W - pad * 2 : colW, size: m * 0.036, maxLines: 1, ts: tsBB, fill: p.ink });
    const q = data.website?.trim() ? qrPath(data.website.trim()) : null;
    const qx = port ? W - pad - qrS : W - pad - qrS, qy = port ? codeY : pad + m * 0.18;
    body = (
      <>
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />
        <rect x={-b} y={-b} width={W + b * 2} height={m * 0.025 + b} fill={p.accent} />
        {logoEl}
        {brandB.el}
        {thx.el}
        {msgB.el}
        {data.code?.trim() ? (
          <g>
            <rect x={pad} y={codeY} width={codeW} height={codeH} rx={m * 0.015} fill={p.dark ? '#26334F' : '#FFFFFF'} stroke={p.accent} strokeWidth={m * 0.006} strokeDasharray={`${m * 0.02} ${m * 0.012}`} />
            {code.el}
            {codeNote.el}
          </g>
        ) : null}
        {q && (
          <g>
            <rect x={qx - m * 0.015} y={qy - m * 0.015} width={qrS + m * 0.03} height={qrS + m * 0.03} rx={m * 0.012} fill="#FFFFFF" />
            <path d={q.d} transform={`translate(${f2(qx)} ${f2(qy)}) scale(${f2(qrS / q.n)})`} fill="#111111" />
            <text x={qx + qrS / 2} y={qy + qrS + m * 0.065} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={m * 0.032} fill={p.sub}>Quét để ghé shop</text>
          </g>
        )}
        {socB.el}
        {heart(W - pad * 0.9, H - pad * 0.95, m * 0.035, p.accent)}
      </>
    );
  }

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-side={side}>
      {body}
    </svg>
  );
}
