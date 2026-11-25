'use client';
// Gối in hình: 1 engine SVG (đơn vị mm) = BỐ CỤC × BẢNG MÀU × FONT × KHỔ → nhiều mẫu, render code 100%.
// Khách tải ảnh (giữ trên máy, không gửi đi) + kéo zoom/vị trí; chưa có ảnh thì ô ảnh hiện tranh minh hoạ vẽ bằng code.
// File in: mỗi mặt 1 trang, nền tràn thêm chừa đường may 15mm, nét may đứt + nét cắt liền (in chuyển nhiệt lên vải).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export const PW_SA_MM = 15; // chừa đường may mỗi cạnh

export type PWShape = 'rect' | 'round';
export interface PWSize { id: string; name: string; wMm: number; hMm: number; shape: PWShape }
export const PW_SIZES: PWSize[] = [
  { id: 'sq40', name: 'Vuông 40×40', wMm: 400, hMm: 400, shape: 'rect' },
  { id: 'sq45', name: 'Vuông 45×45', wMm: 450, hMm: 450, shape: 'rect' },
  { id: 'r3050', name: 'Chữ nhật 30×50', wMm: 500, hMm: 300, shape: 'rect' },
  { id: 'c40', name: 'Tròn Ø40', wMm: 400, hMm: 400, shape: 'round' },
  { id: 'hug', name: 'Gối ôm 40×100', wMm: 1000, hMm: 400, shape: 'rect' },
];
export const pwSize = (id: string) => PW_SIZES.find((s) => s.id === id) || PW_SIZES[0];

export type PWMaterial = 'velvet' | 'canvas';
export const PW_MATERIALS: { id: PWMaterial; name: string; note: string }[] = [
  { id: 'velvet', name: 'Vải nhung', note: 'Mềm mịn, ánh nhung, in chuyển nhiệt màu tươi' },
  { id: 'canvas', name: 'Vải canvas', note: 'Thô mộc, vân vải rõ, hợp decor quán' },
];

// ---------- font ----------
export interface PWFont { id: string; name: string; family: string; weight: number; script?: boolean }
export const PW_FONTS: PWFont[] = [
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700, script: true },
  { id: 'vibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400, script: true },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400, script: true },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const pwFont = (id: string) => PW_FONTS.find((f) => f.id === id) || PW_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const PW_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Dancing+Script:wght@700&family=Great+Vibes&family=Lobster&family=Baloo+2:wght@800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&display=swap');`;

export function usePWFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pw-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pw-fonts'; link.rel = 'stylesheet';
        link.href = PW_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...PW_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface PWPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string; piping: string }
export const PW_PALETTES: PWPalette[] = [
  { id: 'rose', name: 'Hồng phấn', bg: '#FCE7EC', bg2: '#F7C9D4', ink: '#5B2235', sub: '#8A4B5E', accent: '#E05A7E', accent2: '#F6B23E', onAccent: '#FFFFFF', piping: '#E9A3B5' },
  { id: 'cream', name: 'Kem', bg: '#F7EFE2', bg2: '#EBDCC2', ink: '#3E2E1F', sub: '#7A6650', accent: '#B5743C', accent2: '#5E8C61', onAccent: '#FFFFFF', piping: '#D9C3A0' },
  { id: 'mint', name: 'Xanh mint', bg: '#E4F4EE', bg2: '#C3E6D8', ink: '#16362D', sub: '#4B6F63', accent: '#2E9C7E', accent2: '#F29E4C', onAccent: '#FFFFFF', piping: '#A7D8C6' },
  { id: 'sky', name: 'Xanh baby', bg: '#E5F0FB', bg2: '#C6DDF5', ink: '#1B2F4D', sub: '#4E6688', accent: '#3E7CC9', accent2: '#F5C044', onAccent: '#FFFFFF', piping: '#A9C8EC' },
  { id: 'lavender', name: 'Tím lavender', bg: '#EFE9FA', bg2: '#DACDF2', ink: '#2F2250', sub: '#665A86', accent: '#7D5BC8', accent2: '#F0A6C0', onAccent: '#FFFFFF', piping: '#C9B8EC' },
  { id: 'sun', name: 'Vàng nắng', bg: '#FFF4D6', bg2: '#FBE29A', ink: '#47320A', sub: '#7D6430', accent: '#E58B16', accent2: '#3F8F6B', onAccent: '#FFFFFF', piping: '#F4CF6C' },
  { id: 'navy', name: 'Navy', bg: '#1E2C4A', bg2: '#2C3E63', ink: '#F7F2E8', sub: '#C2CBDD', accent: '#E3B55A', accent2: '#E7837A', onAccent: '#1E2C4A', piping: '#3A4D76' },
  { id: 'noel', name: 'Đỏ Noel', bg: '#B3242E', bg2: '#8F1820', ink: '#FFF8EE', sub: '#F6D9C9', accent: '#F2C35B', accent2: '#2E7D52', onAccent: '#5A1015', piping: '#E9D9C4' },
  { id: 'coffee', name: 'Nâu cà phê', bg: '#3B2A20', bg2: '#4C372A', ink: '#F5E9D8', sub: '#CDB89D', accent: '#D7A15E', accent2: '#8FB08A', onAccent: '#2B1D15', piping: '#6A4E3B' },
  { id: 'black', name: 'Đen tối giản', bg: '#1B1B1D', bg2: '#2A2A2E', ink: '#F4F2EE', sub: '#B9B6B0', accent: '#E8D3A8', accent2: '#E8D3A8', onAccent: '#1B1B1D', piping: '#3A3A3F' },
];
export const pwPalette = (id: string) => PW_PALETTES.find((p) => p.id === id) || PW_PALETTES[0];

// ---------- dữ liệu ----------
export type PWData = Record<string, string>;
export interface PWField { key: string; label: string; ph?: string; type?: 'date' | 'text' | 'area' }
export type SampleKind = 'person' | 'couple' | 'pet' | 'family' | 'baby' | 'scene';
export type BackPattern = 'hearts' | 'dots' | 'paws' | 'beans' | 'snow' | 'stars' | 'leaves';

export interface PWLayout {
  id: string; name: string; use: string;
  photos: { id: string; label: string; sample: SampleKind }[];
  fields: PWField[]; sample: PWData; pattern: BackPattern;
}
const F = {
  name: (label = 'Tên', ph = 'Thu Hà'): PWField => ({ key: 'name', label, ph }),
  name2: (label = 'Tên người kia', ph = 'Quốc Bảo'): PWField => ({ key: 'name2', label, ph }),
  title: (label = 'Dòng chữ lớn', ph = ''): PWField => ({ key: 'title', label, ph }),
  sub: (label = 'Dòng phụ', ph = ''): PWField => ({ key: 'sub', label, ph }),
  age: (): PWField => ({ key: 'age', label: 'Tuổi', ph: '25' }),
  date: (label = 'Ngày'): PWField => ({ key: 'date', label, type: 'date' }),
  back: (): PWField => ({ key: 'backText', label: 'Chữ mặt sau', ph: 'Thương nhiều' }),
};
export const PW_LAYOUTS: PWLayout[] = [
  { id: 'bday', name: 'Sinh nhật', use: 'Quà sinh nhật', photos: [{ id: 'p1', label: 'Ảnh', sample: 'person' }], pattern: 'dots',
    fields: [F.title('Lời chúc lớn'), F.name(), F.age(), F.sub(), F.back()],
    sample: { title: 'Happy Birthday', name: 'Thu Hà', age: '25', sub: 'Tuổi mới thật rực rỡ nhé!', backText: 'Tuổi mới bình an' } },
  { id: 'bdayfull', name: 'Sinh nhật ảnh lớn', use: 'Quà sinh nhật', photos: [{ id: 'p1', label: 'Ảnh', sample: 'person' }], pattern: 'dots',
    fields: [F.title('Lời chúc'), F.name(), F.sub('Ngày sinh nhật'), F.back()],
    sample: { title: 'Sinh nhật vui vẻ', name: 'Gia Khánh', sub: '12 · 12 · 2025', backText: 'Mãi vui như hôm nay' } },
  { id: 'couple', name: 'Cặp đôi đếm ngày', use: 'Quà cặp đôi', photos: [{ id: 'p1', label: 'Ảnh người 1', sample: 'person' }, { id: 'p2', label: 'Ảnh người 2', sample: 'person' }], pattern: 'hearts',
    fields: [F.name('Tên người 1', 'Quốc Bảo'), F.name2('Tên người 2', 'Thu Hà'), F.date('Ngày bắt đầu yêu'), F.title('Chữ sau số ngày'), F.back()],
    sample: { name: 'Quốc Bảo', name2: 'Thu Hà', date: '2023-02-14', title: 'ngày bên nhau', backText: 'Thương nhau mãi nhé' } },
  { id: 'polaroid', name: 'Polaroid đôi', use: 'Quà cặp đôi', photos: [{ id: 'p1', label: 'Ảnh 1', sample: 'couple' }, { id: 'p2', label: 'Ảnh 2', sample: 'scene' }], pattern: 'hearts',
    fields: [F.title('Tiêu đề'), F.name('Tên hai bạn', 'Bảo & Hà'), F.sub('Ngày kỷ niệm', '14.02.2023'), F.back()],
    sample: { title: 'Our Love', name: 'Bảo & Hà', sub: '14 · 02 · 2023', backText: 'Mình là của nhau' } },
  { id: 'family', name: 'Gia đình', use: 'Quà gia đình', photos: [{ id: 'p1', label: 'Ảnh gia đình', sample: 'family' }], pattern: 'leaves',
    fields: [F.title('Tiêu đề'), F.name('Tên gia đình', 'Nhà Bảo Ngọc'), F.sub('Câu nói'), F.back()],
    sample: { title: 'Gia đình nhỏ', name: 'Nhà Bảo Ngọc', sub: 'Nhà là nơi để thương', backText: 'Home sweet home' } },
  { id: 'pet', name: 'Thú cưng', use: 'Thú cưng', photos: [{ id: 'p1', label: 'Ảnh boss', sample: 'pet' }], pattern: 'paws',
    fields: [F.name('Tên boss', 'Mochi'), F.title('Danh hiệu'), F.sub(), F.back()],
    sample: { name: 'Mochi', title: 'Boss của nhà', sub: 'Sinh ngày 05.06.2023', backText: 'Đừng ngồi lên trẫm' } },
  { id: 'petbone', name: 'Thú cưng vui nhộn', use: 'Thú cưng', photos: [{ id: 'p1', label: 'Ảnh boss', sample: 'pet' }], pattern: 'paws',
    fields: [F.name('Tên boss', 'Lucky'), F.title('Dòng chữ'), F.back()],
    sample: { name: 'Lucky', title: 'Best Friend Forever', backText: 'Gâu gâu!' } },
  { id: 'quote', name: 'Câu chữ lớn', use: 'Câu chữ', photos: [], pattern: 'dots',
    fields: [{ key: 'title', label: 'Câu nói', type: 'area' }, F.sub('Dòng ký tên'), F.back()],
    sample: { title: 'Hôm nay cũng phải thật vui nhé!', sub: 'Gửi Thu Hà', backText: 'Cười nhiều lên' } },
  { id: 'floral', name: 'Câu chữ hoa lá', use: 'Câu chữ', photos: [], pattern: 'leaves',
    fields: [{ key: 'title', label: 'Câu nói', type: 'area' }, F.sub('Dòng nhỏ'), F.back()],
    sample: { title: 'Thương mình nhiều hơn một chút', sub: 'mỗi ngày', backText: 'Bình yên' } },
  { id: 'cafe', name: 'Logo quán cà phê', use: 'Decor quán', photos: [{ id: 'p1', label: 'Logo (tuỳ chọn)', sample: 'scene' }], pattern: 'beans',
    fields: [F.name('Tên quán', 'AN KHANG COFFEE'), F.title('Slogan'), F.sub('Dòng nhỏ'), F.back()],
    sample: { name: 'AN KHANG COFFEE', title: 'Chậm lại một chút', sub: 'Since 2020', backText: 'Cà phê & chuyện trò' } },
  { id: 'homestay', name: 'Homestay núi đồi', use: 'Decor quán', photos: [], pattern: 'leaves',
    fields: [F.name('Tên homestay', 'MÂY HOMESTAY'), F.title('Địa danh'), F.sub('Lời chúc'), F.back()],
    sample: { name: 'MÂY HOMESTAY', title: 'Đà Lạt', sub: 'Ngủ ngon nha!', backText: 'Hẹn gặp lại' } },
  { id: 'noel', name: 'Giáng sinh', use: 'Mùa lễ', photos: [{ id: 'p1', label: 'Ảnh', sample: 'person' }], pattern: 'snow',
    fields: [F.title('Lời chúc'), F.name(), F.sub(), F.back()],
    sample: { title: 'Merry Christmas', name: 'Gia Khánh', sub: 'Giáng sinh 2026', backText: 'Ho ho ho!' } },
  { id: 'baby', name: 'Bé chào đời', use: 'Em bé', photos: [{ id: 'p1', label: 'Ảnh bé', sample: 'baby' }], pattern: 'stars',
    fields: [F.name('Tên bé', 'Bé Na'), F.title('Dòng chữ'), F.sub('Ngày sinh · cân nặng · chiều dài'), F.back()],
    sample: { name: 'Bé Na', title: 'Chào đời', sub: '08.08.2025 · 3,2kg · 50cm', backText: 'Ngủ ngoan nhé con' } },
];
export const pwLayout = (id: string) => PW_LAYOUTS.find((l) => l.id === id) || PW_LAYOUTS[0];

export interface PWSpec { layout: string; palette: string; font: string; size: string; material: PWMaterial; back: 'pattern' | 'same' | 'plain' }
export interface PWTemplate { id: string; name: string; spec: Pick<PWSpec, 'layout' | 'palette' | 'font'> }
export const PW_TEMPLATES: PWTemplate[] = [
  ['bday', 'rose', 'dancing'], ['bdayfull', 'sky', 'lobster'], ['couple', 'rose', 'vibes'], ['polaroid', 'cream', 'vibes'],
  ['family', 'mint', 'dancing'], ['pet', 'sun', 'baloo'], ['petbone', 'sky', 'baloo'], ['quote', 'black', 'playfair'],
  ['floral', 'cream', 'dancing'], ['cafe', 'coffee', 'montserrat'], ['homestay', 'mint', 'montserrat'], ['noel', 'noel', 'lobster'],
  ['baby', 'lavender', 'dancing'], ['couple', 'navy', 'dancing'],
].map(([layout, palette, font]) => ({ id: `${layout}-${palette}`, name: `${pwLayout(layout).name} · ${pwPalette(palette).name}`, spec: { layout, palette, font } }));

export const defaultPWData = (layout = 'bday'): PWData => ({ ...pwLayout(layout).sample });

/** số ngày từ 'YYYY-MM-DD' tới hôm nay (giờ máy khách) */
export function daysSince(iso: string, now = new Date()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((t.getTime() - d.getTime()) / 86400000);
  return n >= 0 ? n : null;
}
const fmtNum = (n: number) => n.toLocaleString('vi-VN');
const fmtDate = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? `${m[3]} · ${m[2]} · ${m[1]}` : iso || ''; };

// ---------- ảnh khách ----------
export interface PWPhoto { src: string; zoom: number; x: number; y: number } // x,y ∈ [-1, 1]: dịch khung cắt
export type PWPhotos = Record<string, PWPhoto | undefined>;

// ---------- đo chữ thật ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} ${size}px "${ts.fam}"`;
  return mctx.measureText(s).width + ls;
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
/** co chữ ≤ maxLines dòng + cân dòng; dòng nào vẫn quá rộng (1 từ dài) thì co cả khối cho vừa */
function fitBlock(text: string, maxW: number, size: number, ts0: TS, maxLines: number) {
  // giãn chữ (letter-spacing) co theo cỡ chữ — không thì chữ nhỏ lại mà khoảng giãn vẫn to → tràn
  const at = (s: number): TS => ({ ...ts0, ls: (ts0.ls || 0) * (s / size) });
  let s = size, lines = wrapLines(text, maxW, s, at(s));
  while (lines.length > maxLines && s > size * 0.3) { s *= 0.94; lines = wrapLines(text, maxW, s, at(s)); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, at(s)).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, at(s));
  }
  const widest = Math.max(1, ...lines.map((l) => textW(l, s, at(s))));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s, ls: at(s).ls || 0 };
}

// ---------- hoạ tiết vẽ bằng code ----------
const heartPath = (cx: number, cy: number, s: number) =>
  `M${cx} ${cy + s * 0.35} C${cx - s * 0.05} ${cy + s * 0.3} ${cx - s * 0.5} ${cy} ${cx - s * 0.5} ${cy - s * 0.18} C${cx - s * 0.5} ${cy - s * 0.42} ${cx - s * 0.28} ${cy - s * 0.52} ${cx - s * 0.12} ${cy - s * 0.46} C${cx - s * 0.04} ${cy - s * 0.43} ${cx} ${cy - s * 0.36} ${cx} ${cy - s * 0.3} C${cx} ${cy - s * 0.36} ${cx + s * 0.04} ${cy - s * 0.43} ${cx + s * 0.12} ${cy - s * 0.46} C${cx + s * 0.28} ${cy - s * 0.52} ${cx + s * 0.5} ${cy - s * 0.42} ${cx + s * 0.5} ${cy - s * 0.18} C${cx + s * 0.5} ${cy} ${cx + s * 0.05} ${cy + s * 0.3} ${cx} ${cy + s * 0.35}Z`;
const starPath = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`; }
  return d + 'Z';
};
function Paw({ x, y, s, fill, rot = 0, opacity = 1 }: { x: number; y: number; s: number; fill: string; rot?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s / 40})`} fill={fill} opacity={opacity}>
      <ellipse cx={0} cy={8} rx={13} ry={11} />
      <ellipse cx={-14} cy={-6} rx={5.5} ry={7} /><ellipse cx={-5} cy={-14} rx={5.5} ry={7.5} />
      <ellipse cx={6} cy={-14} rx={5.5} ry={7.5} /><ellipse cx={15} cy={-6} rx={5.5} ry={7} />
    </g>
  );
}
function Bean({ x, y, s, fill, rot = 0, opacity = 1 }: { x: number; y: number; s: number; fill: string; rot?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity}>
      <ellipse rx={s * 0.42} ry={s * 0.6} fill={fill} />
      <path d={`M0 ${-s * 0.52} C${s * 0.16} ${-s * 0.2} ${-s * 0.16} ${s * 0.2} 0 ${s * 0.52}`} stroke="rgba(0,0,0,0.35)" strokeWidth={s * 0.07} fill="none" strokeLinecap="round" />
    </g>
  );
}
function Snowflake({ x, y, s, stroke, opacity = 1 }: { x: number; y: number; s: number; stroke: string; opacity?: number }) {
  const arms = [0, 60, 120];
  return (
    <g transform={`translate(${x} ${y})`} stroke={stroke} strokeWidth={s * 0.08} strokeLinecap="round" opacity={opacity} fill="none">
      {arms.map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <line x1={0} y1={-s / 2} x2={0} y2={s / 2} />
          <path d={`M${-s * 0.12} ${-s * 0.34} L0 ${-s * 0.24} L${s * 0.12} ${-s * 0.34} M${-s * 0.12} ${s * 0.34} L0 ${s * 0.24} L${s * 0.12} ${s * 0.34}`} />
        </g>
      ))}
    </g>
  );
}
function Leaf({ x, y, s, fill, rot = 0, opacity = 1 }: { x: number; y: number; s: number; fill: string; rot?: number; opacity?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity}>
      <path d={`M0 0 C${s * 0.35} ${-s * 0.25} ${s * 0.35} ${-s * 0.75} 0 ${-s} C${-s * 0.35} ${-s * 0.75} ${-s * 0.35} ${-s * 0.25} 0 0Z`} fill={fill} />
      <path d={`M0 0 L0 ${-s * 0.9}`} stroke="rgba(255,255,255,0.45)" strokeWidth={s * 0.04} />
    </g>
  );
}
function Sprig({ x, y, s, fill, rot = 0, flip = false }: { x: number; y: number; s: number; fill: string; rot?: number; flip?: boolean }) {
  const leaves = [0.18, 0.36, 0.54, 0.72];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -1 : 1} 1)`}>
      <path d={`M0 0 C${s * 0.1} ${-s * 0.35} ${s * 0.05} ${-s * 0.7} ${-s * 0.05} ${-s}`} stroke={fill} strokeWidth={s * 0.025} fill="none" strokeLinecap="round" />
      {leaves.map((t, i) => <Leaf key={i} x={s * 0.06 * (1 - t)} y={-s * t} s={s * 0.26} fill={fill} rot={i % 2 ? 48 : -48} />)}
      <Leaf x={-s * 0.05} y={-s * 0.96} s={s * 0.22} fill={fill} rot={-8} />
    </g>
  );
}

/** rải hoạ tiết đều (lưới so le, xoay lệch nhẹ theo seed) */
function scatter(W: number, H: number, step: number, ext: number, draw: (x: number, y: number, i: number, r: number) => ReactNode) {
  const out: ReactNode[] = [];
  let i = 0, seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
  for (let y = -ext + step * 0.4, row = 0; y < H + ext; y += step * 0.86, row++) {
    for (let x = -ext + (row % 2 ? step * 0.5 : 0) + step * 0.3; x < W + ext; x += step) out.push(draw(x, y, i++, rnd()));
  }
  return out;
}
export function PatternLayer({ kind, W, H, ext, fill, opacity = 0.22, step }: { kind: BackPattern; W: number; H: number; ext: number; fill: string; opacity?: number; step?: number }) {
  const st = step || Math.min(W, H) * 0.16;
  const items = scatter(W, H, st, ext, (x, y, i, r) => {
    const rot = (r - 0.5) * 60, s = st * 0.42;
    switch (kind) {
      case 'hearts': return <path key={i} d={heartPath(x, y, s)} fill={fill} opacity={opacity} transform={`rotate(${rot} ${x} ${y})`} />;
      case 'paws': return <Paw key={i} x={x} y={y} s={s} fill={fill} rot={rot} opacity={opacity} />;
      case 'beans': return <Bean key={i} x={x} y={y} s={s * 0.8} fill={fill} rot={rot * 2} opacity={opacity} />;
      case 'snow': return <Snowflake key={i} x={x} y={y} s={s * (0.7 + r * 0.5)} stroke={fill} opacity={opacity} />;
      case 'stars': return <path key={i} d={starPath(x, y, s * (0.25 + r * 0.25))} fill={fill} opacity={opacity} />;
      case 'leaves': return <Leaf key={i} x={x} y={y + s * 0.5} s={s} fill={fill} rot={rot * 2} opacity={opacity} />;
      default: return <circle key={i} cx={x} cy={y} r={s * 0.16} fill={fill} opacity={opacity} />;
    }
  });
  return <g>{items}</g>;
}

// tranh minh hoạ vẽ bằng code cho ô ảnh khi khách chưa tải ảnh (để mẫu vẫn đẹp)
function SampleArt({ kind, x, y, w, h, p }: { kind: SampleKind; x: number; y: number; w: number; h: number; p: PWPalette }) {
  const cx = x + w / 2, s = Math.min(w, h);
  const id = `sa-${kind}-${Math.round(x)}-${Math.round(y)}`;
  const sky = (a: string, b: string) => (
    <>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a} /><stop offset="1" stopColor={b} /></linearGradient></defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
    </>
  );
  if (kind === 'pet') {
    // mèo cam mặt tròn
    const fy = y + h * 0.56, r = s * 0.3;
    return (
      <g>
        {sky('#FFE7C2', '#F7B98B')}
        {[0.18, 0.82].map((k, i) => <circle key={i} cx={x + w * k} cy={y + h * 0.2} r={s * 0.07} fill="#FFFFFF" opacity={0.35} />)}
        <path d={`M${cx - r * 0.95} ${fy - r * 0.45} L${cx - r * 0.75} ${fy - r * 1.25} L${cx - r * 0.25} ${fy - r * 0.85}Z M${cx + r * 0.95} ${fy - r * 0.45} L${cx + r * 0.75} ${fy - r * 1.25} L${cx + r * 0.25} ${fy - r * 0.85}Z`} fill="#E98A3A" />
        <path d={`M${cx - r * 0.78} ${fy - r * 0.6} L${cx - r * 0.7} ${fy - r * 1.05} L${cx - r * 0.4} ${fy - r * 0.8}Z M${cx + r * 0.78} ${fy - r * 0.6} L${cx + r * 0.7} ${fy - r * 1.05} L${cx + r * 0.4} ${fy - r * 0.8}Z`} fill="#F7C6A3" />
        <ellipse cx={cx} cy={fy} rx={r} ry={r * 0.88} fill="#F09A4C" />
        <path d={`M${cx - r * 0.3} ${fy - r * 0.85} L${cx - r * 0.2} ${fy - r * 0.5} M${cx} ${fy - r * 0.88} L${cx} ${fy - r * 0.52} M${cx + r * 0.3} ${fy - r * 0.85} L${cx + r * 0.2} ${fy - r * 0.5}`} stroke="#C96F26" strokeWidth={r * 0.07} strokeLinecap="round" />
        <ellipse cx={cx} cy={fy + r * 0.32} rx={r * 0.5} ry={r * 0.36} fill="#FFF3E6" />
        {[-1, 1].map((k) => <g key={k}><ellipse cx={cx + k * r * 0.36} cy={fy - r * 0.08} rx={r * 0.12} ry={r * 0.16} fill="#2A1C12" /><circle cx={cx + k * r * 0.36 + r * 0.04} cy={fy - r * 0.14} r={r * 0.045} fill="#FFFFFF" /></g>)}
        <path d={`M${cx - r * 0.08} ${fy + r * 0.12} L${cx + r * 0.08} ${fy + r * 0.12} L${cx} ${fy + r * 0.22}Z`} fill="#E0657A" />
        <path d={`M${cx} ${fy + r * 0.22} q${-r * 0.08} ${r * 0.14} ${-r * 0.2} ${r * 0.08} M${cx} ${fy + r * 0.22} q${r * 0.08} ${r * 0.14} ${r * 0.2} ${r * 0.08}`} stroke="#6B4A36" strokeWidth={r * 0.035} fill="none" strokeLinecap="round" />
        {[-1, 1].map((k) => <path key={k} d={`M${cx + k * r * 0.45} ${fy + r * 0.2} l${k * r * 0.55} ${-r * 0.08} M${cx + k * r * 0.45} ${fy + r * 0.3} l${k * r * 0.55} ${r * 0.06}`} stroke="#FFFFFF" strokeWidth={r * 0.025} strokeLinecap="round" opacity={0.9} />)}
        <ellipse cx={cx} cy={y + h * 1.02} rx={r * 1.25} ry={r * 0.55} fill="#F09A4C" />
      </g>
    );
  }
  if (kind === 'family') {
    const gy = y + h * 0.72;
    return (
      <g>
        {sky('#BFE3F5', '#FBE6C4')}
        <circle cx={x + w * 0.74} cy={y + h * 0.3} r={s * 0.11} fill="#FFD26A" />
        <path d={`M${x} ${gy} Q${x + w * 0.3} ${gy - h * 0.16} ${x + w * 0.62} ${gy - h * 0.04} T${x + w} ${gy - h * 0.08} V${y + h} H${x}Z`} fill="#9CCB86" />
        <path d={`M${x} ${gy + h * 0.08} Q${x + w * 0.45} ${gy - h * 0.06} ${x + w} ${gy + h * 0.06} V${y + h} H${x}Z`} fill="#6FAE6A" />
        {[[0.36, 0.17, '#3D5A80'], [0.56, 0.16, '#B5546A'], [0.465, 0.11, '#E3A33B']].map(([k, hh, c], i) => {
          const px = x + w * (k as number), ph = h * (hh as number) * 1.7, py = gy + h * 0.08;
          return <g key={i} fill={c as string}><circle cx={px} cy={py - ph} r={ph * 0.18} /><path d={`M${px - ph * 0.22} ${py} Q${px - ph * 0.24} ${py - ph * 0.72} ${px} ${py - ph * 0.76} Q${px + ph * 0.24} ${py - ph * 0.72} ${px + ph * 0.22} ${py}Z`} /></g>;
        })}
      </g>
    );
  }
  if (kind === 'baby') {
    const r = s * 0.27, fy = y + h * 0.52;
    return (
      <g>
        {sky('#E8E3FA', '#FBE3EE')}
        {[[0.2, 0.2], [0.8, 0.26], [0.7, 0.12], [0.3, 0.8], [0.84, 0.76]].map(([a, b], i) => <path key={i} d={starPath(x + w * a, y + h * b, s * 0.035)} fill="#FFFFFF" opacity={0.8} />)}
        <circle cx={cx} cy={fy} r={r} fill="#FAD9C1" />
        <path d={`M${cx - r} ${fy - r * 0.1} Q${cx - r * 0.95} ${fy - r * 1.2} ${cx} ${fy - r * 1.05} Q${cx + r * 0.95} ${fy - r * 1.2} ${cx + r} ${fy - r * 0.1} Q${cx + r * 0.3} ${fy - r * 0.75} ${cx} ${fy - r * 0.62} Q${cx - r * 0.3} ${fy - r * 0.75} ${cx - r} ${fy - r * 0.1}Z`} fill="#F4A7BF" />
        <circle cx={cx} cy={fy - r * 1.08} r={r * 0.16} fill="#F4A7BF" />
        {[-1, 1].map((k) => <path key={k} d={`M${cx + k * r * 0.42 - r * 0.14} ${fy + r * 0.05} q${r * 0.14} ${r * 0.12} ${r * 0.28} 0`} stroke="#5A3A2E" strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />)}
        {[-1, 1].map((k) => <circle key={k} cx={cx + k * r * 0.55} cy={fy + r * 0.3} r={r * 0.12} fill="#F59BB0" opacity={0.6} />)}
        <path d={`M${cx - r * 0.12} ${fy + r * 0.42} q${r * 0.12} ${r * 0.1} ${r * 0.24} 0`} stroke="#B85C6A" strokeWidth={r * 0.06} fill="none" strokeLinecap="round" />
        <path d={`M${cx - r * 1.4} ${y + h} Q${cx - r * 1.1} ${fy + r * 0.85} ${cx} ${fy + r * 0.95} Q${cx + r * 1.1} ${fy + r * 0.85} ${cx + r * 1.4} ${y + h}Z`} fill="#BFD7F2" />
      </g>
    );
  }
  if (kind === 'scene') {
    return (
      <g>
        {sky('#FFD9B8', '#F79A8A')}
        <circle cx={cx} cy={y + h * 0.58} r={s * 0.2} fill="#FFF1C9" opacity={0.95} />
        <path d={`M${x} ${y + h * 0.7} L${x + w * 0.28} ${y + h * 0.46} L${x + w * 0.46} ${y + h * 0.62} L${x + w * 0.66} ${y + h * 0.4} L${x + w} ${y + h * 0.68} V${y + h} H${x}Z`} fill="#8E5A7A" opacity={0.85} />
        <path d={`M${x} ${y + h * 0.8} Q${x + w * 0.5} ${y + h * 0.66} ${x + w} ${y + h * 0.82} V${y + h} H${x}Z`} fill="#5B3A5E" />
      </g>
    );
  }
  // person / couple: chân dung bóng mờ trên nền bokeh ấm
  const people = kind === 'couple' ? [-0.17, 0.17] : [0];
  return (
    <g>
      {sky(kind === 'couple' ? '#FBD3C4' : p.bg2, kind === 'couple' ? '#F59AA8' : p.accent)}
      {[[0.15, 0.2, 0.1], [0.82, 0.18, 0.07], [0.72, 0.38, 0.05], [0.25, 0.45, 0.06], [0.9, 0.6, 0.08]].map(([a, b, rr], i) => <circle key={i} cx={x + w * a} cy={y + h * b} r={s * rr} fill="#FFFFFF" opacity={0.22} />)}
      {people.map((k, i) => {
        const px = cx + k * w, hr = s * (kind === 'couple' ? 0.13 : 0.17), hy = y + h * 0.5;
        return (
          <g key={i} fill="#FFFFFF" opacity={0.88}>
            <circle cx={px} cy={hy} r={hr} />
            <path d={`M${px - hr * 2.3} ${y + h} Q${px - hr * 2.1} ${hy + hr * 1.35} ${px} ${hy + hr * 1.25} Q${px + hr * 2.1} ${hy + hr * 1.35} ${px + hr * 2.3} ${y + h}Z`} />
          </g>
        );
      })}
      {kind === 'couple' && <path d={heartPath(cx, y + h * 0.27, s * 0.14)} fill="#FFFFFF" opacity={0.95} />}
    </g>
  );
}

// ---------- SVG gối ----------
type Anchor = 'start' | 'middle' | 'end';
export interface PillowSvgProps {
  spec: PWSpec; data: PWData; photos: PWPhotos; face: 'front' | 'back';
  /** file in: nới 15mm đường may + nét may/nét cắt */
  print?: boolean;
  style?: CSSProperties;
}

export function PillowSvg({ spec, data, photos, face, print = false, style }: PillowSvgProps) {
  const sz = pwSize(spec.size);
  const W = sz.wMm, H = sz.hMm, round = sz.shape === 'round';
  const ext = print ? PW_SA_MM : 0;
  const p = pwPalette(spec.palette), f = pwFont(spec.font), L = pwLayout(spec.layout);
  const disp: TS = { fam: f.family, wt: f.weight };
  const bodyB: TS = { fam: BODY, wt: 800 }, bodyR: TS = { fam: BODY, wt: 600 };
  const cx = W / 2, cy = H / 2;
  const wide = W / H > 1.45;
  const uid = `pw-${spec.layout}-${spec.size}-${face}-${print ? 'p' : 'v'}`;
  // vùng an toàn: gối phồng ăn mất mép → chữ cách đường may ≥ 9% cạnh ngắn (36mm ở gối 40)
  const m = Math.max(28, Math.min(W, H) * 0.09);
  const Rs = W / 2 - m; // gối tròn: bán kính vùng an toàn
  /** bề rộng dùng được cho 1 dải [y0, y1] trong cột [x0, x1] */
  const wAt = (y0: number, y1: number, x0 = m, x1 = W - m) => {
    if (!round) return x1 - x0;
    const dy = Math.max(Math.abs(y0 - cy), Math.abs(y1 - cy));
    return dy >= Rs ? 0 : 2 * Math.sqrt(Rs * Rs - dy * dy);
  };

  const T = (text: string, x: number, y: number, size: number, ts: TS, fill: string, anchor: Anchor = 'middle', extra: Partial<{ ls: number; opacity: number }> = {}) => (
    <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size} fill={fill} textAnchor={anchor} letterSpacing={extra.ls || undefined} opacity={extra.opacity}>{text}</text>
  );

  // ----- khối dọc: tự co cho vừa vùng (tròn thì co theo dây cung) -----
  type Block =
    | { k: 'text'; text: string; ts: TS; size: number; fill: string; lines?: number; ls?: number; upper?: boolean; lh?: number }
    | { k: 'photo'; slot: string; h: number; shape: 'circle' | 'rounded' | 'arch'; ring?: string; aspect?: number }
    | { k: 'gap'; h: number }
    | { k: 'heart'; h: number; fill: string }
    | { k: 'rule'; h: number; fill: string }
    | { k: 'pill'; text: string; size: number; bg: string; fill: string };
  const stack = (blocks: Block[], x0: number, x1: number, y0: number, y1: number): ReactNode => {
    const colCx = (x0 + x1) / 2;
    if (round) { y0 = Math.max(y0, cy - Rs * 0.9); y1 = Math.min(y1, cy + Rs * 0.9); }
    // gối tròn: dây cung không bao giờ < 60% đường kính an toàn (tránh chữ co về 0 khi ước lượng vị trí lệch)
    const wBand = (a: number, b2: number) => Math.max(round ? Rs * 1.2 : 0, wAt(a, b2, x0, x1));
    // đo ở tỉ lệ k → tổng cao; giảm k tới khi vừa
    const measure = (k: number, top0: number) => {
      let y = 0; const placed: { b: Block; y: number; h: number; lines?: string[]; size?: number; ls?: number }[] = [];
      for (const b of blocks) {
        if (b.k === 'text') {
          const txt = b.upper ? (b.text || '').toUpperCase() : b.text || '';
          if (!txt.trim()) continue;
          const sz0 = b.size * k;
          // bề rộng theo dải ước lượng ở vị trí hiện tại (vùng giữa → rộng nhất cho gối tròn)
          const fb = fitBlock(txt, Math.max(10, Math.min(x1 - x0, wBand(top0 + y, top0 + y + sz0 * 1.2 * (b.lines || 2))) * 0.98), sz0, { ...b.ts, ls: (b.ls || 0) * k }, b.lines || 2);
          const lh = (b.lh || 1.18) * fb.size;
          placed.push({ b, y, h: lh * fb.lines.length, lines: fb.lines, size: fb.size, ls: fb.ls });
          y += lh * fb.lines.length;
        } else if (b.k === 'photo') { placed.push({ b, y, h: b.h * k }); y += b.h * k; }
        else if (b.k === 'pill') { const h = b.size * k * 1.9; placed.push({ b, y, h, size: b.size * k }); y += h; }
        else { placed.push({ b, y, h: b.h * k }); y += b.h * k; }
      }
      return { placed, total: y };
    };
    // gối dài (gối ôm): chữ to hơn cho cân khổ rộng; gối tròn: đo 2 lượt theo vị trí đã canh giữa (dây cung đúng chỗ)
    const fitAll = (top0: number) => {
      let k = wide ? 1.45 : 1, r0 = measure(k, top0);
      for (let i = 0; i < 40 && r0.total > y1 - y0; i++) { k *= 0.95; r0 = measure(k, top0); }
      return { k, res: r0 };
    };
    let top0 = round ? y0 + (y1 - y0) * 0.25 : y0, fit = fitAll(top0);
    for (let it = 0; round && it < 3; it++) { top0 = y0 + (y1 - y0 - fit.res.total) / 2; fit = fitAll(top0); }
    const { k, res } = fit;
    // gối tròn: dịch + co thêm tới khi mọi dòng nằm trong dây cung
    const top = y0 + (y1 - y0 - res.total) / 2;
    const out: ReactNode[] = [];
    res.placed.forEach(({ b, y, h, lines, size, ls }, i) => {
      const yy = top + y;
      if (b.k === 'text' && lines && size) {
        const lh = h / lines.length;
        lines.forEach((ln, j) => {
          const avail = wBand(yy + j * lh, yy + (j + 1) * lh);
          const ts = { ...b.ts, ls: ls || 0 };
          const w = textW(ln, size, ts);
          const s2 = avail > 0 && w > avail * 0.98 ? size * (avail * 0.98) / w : size;
          out.push(<g key={`${i}-${j}`}>{T(ln, colCx, yy + j * lh + lh * 0.78 - (size - s2) * 0.3, s2, b.ts, b.fill, 'middle', { ls: ts.ls })}</g>);
        });
      } else if (b.k === 'photo') {
        const ph = h, pw = b.shape === 'circle' ? ph : Math.min(x1 - x0, ph * (b.aspect || 0.82));
        out.push(<g key={i}>{photoSlot(b.slot, colCx - pw / 2, yy, pw, ph, b.shape, b.ring)}</g>);
      } else if (b.k === 'heart') {
        out.push(<path key={i} d={heartPath(colCx, yy + h * 0.52, h * 0.95)} fill={b.fill} />);
      } else if (b.k === 'rule') {
        out.push(<g key={i}><line x1={colCx - h * 2.2} y1={yy + h / 2} x2={colCx - h * 0.6} y2={yy + h / 2} stroke={b.fill} strokeWidth={h * 0.08} strokeLinecap="round" /><path d={heartPath(colCx, yy + h * 0.55, h * 0.7)} fill={b.fill} /><line x1={colCx + h * 0.6} y1={yy + h / 2} x2={colCx + h * 2.2} y2={yy + h / 2} stroke={b.fill} strokeWidth={h * 0.08} strokeLinecap="round" /></g>);
      } else if (b.k === 'pill' && size) {
        // nhãn bo tròn: co chữ cho vừa bề rộng cột
        const avail = wBand(yy, yy + h) * 0.94;
        let sz2 = size, tw = textW(b.text, sz2, bodyB) + sz2 * 1.6;
        if (tw > avail) { sz2 = size * avail / tw; tw = avail; }
        const ph = sz2 * 1.6;
        out.push(<g key={i}><rect x={colCx - tw / 2} y={yy + (h - ph) / 2} width={tw} height={ph} rx={ph / 2} fill={b.bg} />{T(b.text, colCx, yy + h / 2 + sz2 * 0.36, sz2, bodyB, b.fill)}</g>);
      }
    });
    return <g>{out}</g>;
  };

  // ----- ô ảnh: ảnh khách (zoom + kéo) hoặc tranh minh hoạ -----
  const photoSlot = (slot: string, x: number, y: number, w: number, h: number, shape: 'circle' | 'rounded' | 'arch' | 'rect', ring?: string): ReactNode => {
    const cid = `${uid}-${slot}-${Math.round(x)}-${Math.round(y)}`;
    const r = Math.min(w, h);
    const clip = shape === 'circle' ? <circle cx={x + w / 2} cy={y + h / 2} r={r / 2} />
      : shape === 'arch' ? <path d={`M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h}Z`} />
      : <rect x={x} y={y} width={w} height={h} rx={shape === 'rounded' ? r * 0.08 : 0} />;
    const ph = photos[slot];
    const sampleKind = L.photos.find((s) => s.id === slot)?.sample || 'person';
    let inner: ReactNode;
    if (ph?.src) {
      const z = Math.max(1, ph.zoom || 1), iw = w * z, ih = h * z;
      const ix = x + w / 2 - iw / 2 - (ph.x || 0) * (iw - w) / 2, iy = y + h / 2 - ih / 2 - (ph.y || 0) * (ih - h) / 2;
      inner = <image href={ph.src} x={ix} y={iy} width={iw} height={ih} preserveAspectRatio="xMidYMid slice" />;
    } else inner = <SampleArt kind={sampleKind} x={x} y={y} w={w} h={h} p={p} />;
    return (
      <g data-photo-slot={slot}>
        <defs><clipPath id={cid}>{clip}</clipPath></defs>
        <g clipPath={`url(#${cid})`}>{inner}</g>
        {ring && (shape === 'circle'
          ? <circle cx={x + w / 2} cy={y + h / 2} r={r / 2} fill="none" stroke={ring} strokeWidth={r * 0.035} />
          : shape === 'arch' ? <path d={`M${x} ${y + h} V${y + w / 2} A${w / 2} ${w / 2} 0 0 1 ${x + w} ${y + w / 2} V${y + h}Z`} fill="none" stroke={ring} strokeWidth={r * 0.03} />
          : <rect x={x} y={y} width={w} height={h} rx={shape === 'rounded' ? r * 0.08 : 0} fill="none" stroke={ring} strokeWidth={r * 0.03} />)}
      </g>
    );
  };

  // nền (tràn ra chừa may khi in)
  const bgRect = (fill: string) => round
    ? <circle cx={cx} cy={cy} r={W / 2 + ext} fill={fill} />
    : <rect x={-ext} y={-ext} width={W + ext * 2} height={H + ext * 2} fill={fill} />;
  const clipId = `${uid}-shape`;
  const s0 = Math.min(W, H); // cạnh ngắn — mọi cỡ chữ tính theo nó
  const d = data;

  let body: ReactNode = null;
  if (face === 'back') {
    const txt = (d.backText || '').trim();
    if (spec.back === 'same') body = null; // vẽ lại mặt trước bên dưới
    else {
      const plain = spec.back === 'plain';
      const bw = wAt(cy - s0 * 0.08, cy + s0 * 0.08) * 0.8;
      const fb = fitBlock(txt, wide ? W * 0.55 : Math.min(bw, s0 * 0.78), s0 * (wide ? 0.16 : 0.1), disp, 2);
      const lh = fb.size * 1.12, bh = fb.lines.length * lh;
      body = (
        <>
          {bgRect(p.bg)}
          {!plain && <PatternLayer kind={L.pattern} W={W} H={H} ext={ext + 10} fill={p.accent} opacity={0.2} />}
          {txt && (
            <g>
              {!plain && <rect x={cx - (wide ? W * 0.6 : Math.min(bw, s0 * 0.82)) / 2 - s0 * 0.04} y={cy - bh / 2 - s0 * 0.06} width={(wide ? W * 0.6 : Math.min(bw, s0 * 0.82)) + s0 * 0.08} height={bh + s0 * 0.12} rx={s0 * 0.06} fill={p.bg} opacity={0.92} />}
              {fb.lines.map((ln, j) => <g key={j}>{T(ln, cx, cy - bh / 2 + j * lh + lh * 0.78, fb.size, disp, p.accent)}</g>)}
            </g>
          )}
        </>
      );
    }
  }

  if (face === 'front' || spec.back === 'same') {
    const ink = p.ink, sub = p.sub, acc = p.accent;
    const L1 = L.id;
    if (L1 === 'bday') {
      const flags = Math.round(W / (s0 * 0.09));
      const bunting = (
        <g>
          <path d={`M${-ext} ${H * 0.06} Q${cx} ${H * 0.16} ${W + ext} ${H * 0.06}`} stroke={sub} strokeWidth={s0 * 0.004} fill="none" />
          {Array.from({ length: flags }, (_, i) => {
            const t = (i + 0.5) / flags, fx = -ext + t * (W + ext * 2), fy = H * 0.06 + Math.sin(t * Math.PI) * H * 0.05;
            const c = [acc, p.accent2, p.bg2, '#FFFFFF'][i % 4];
            return <path key={i} d={`M${fx - s0 * 0.028} ${fy} L${fx + s0 * 0.028} ${fy} L${fx} ${fy + s0 * 0.06}Z`} fill={c} />;
          })}
        </g>
      );
      const confetti = scatter(W, H, s0 * 0.14, ext, (x, y, i, r) => <rect key={i} x={x} y={y} width={s0 * 0.012} height={s0 * 0.028} rx={s0 * 0.004} fill={[acc, p.accent2, p.bg2][i % 3]} opacity={0.55} transform={`rotate(${r * 180} ${x} ${y})`} />);
      const blocks: Block[] = [
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.13, fill: acc, lines: 2, lh: 1.05 },
        { k: 'gap', h: s0 * 0.02 },
        { k: 'photo', slot: 'p1', h: s0 * 0.4, shape: 'circle', ring: '#FFFFFF' },
        { k: 'gap', h: s0 * 0.025 },
        { k: 'text', text: d.name, ts: { fam: f.script ? 'Be Vietnam Pro' : f.family, wt: 800 }, size: s0 * 0.085, fill: ink },
        ...(d.age ? [{ k: 'pill', text: `Tròn ${d.age} tuổi`, size: s0 * 0.032, bg: acc, fill: p.onAccent } as Block] : []),
        { k: 'gap', h: s0 * 0.012 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.036, fill: sub, lines: 2 },
      ];
      body = (
        <>
          {bgRect(p.bg)}{confetti}{bunting}
          {wide
            ? <>{photoSlot('p1', m + s0 * 0.04, cy - s0 * 0.33, s0 * 0.66, s0 * 0.66, 'circle', '#FFFFFF')}{stack(blocks.filter((b) => b.k !== 'photo'), m + s0 * 0.8, W - m, m + s0 * 0.08, H - m)}</>
            : stack(blocks, m, W - m, m + s0 * 0.07, H - m)}
        </>
      );
    } else if (L1 === 'bdayfull') {
      const split = wide ? 0 : H * (round ? 0.6 : 0.62);
      const blocks: Block[] = [
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.1, fill: acc, lines: 1 },
        { k: 'text', text: d.name, ts: { fam: BODY, wt: 800 }, size: s0 * 0.085, fill: ink, lines: 1, upper: true, ls: s0 * 0.004 },
        { k: 'gap', h: s0 * 0.01 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.034, fill: sub, ls: s0 * 0.004 },
      ];
      body = wide ? (
        <>{bgRect(p.bg)}{photoSlot('p1', -ext, -ext, W * 0.5 + ext, H + ext * 2, 'rect')}<path d={`M${W * 0.5 - s0 * 0.06} ${-ext} Q${W * 0.5 + s0 * 0.06} ${cy} ${W * 0.5 - s0 * 0.06} ${H + ext}`} stroke={p.bg} strokeWidth={s0 * 0.12} fill="none" />{stack(blocks, W * 0.52, W - m, m, H - m)}</>
      ) : (
        <>
          {bgRect(p.bg)}
          {photoSlot('p1', -ext, -ext, W + ext * 2, split + ext, 'rect')}
          <path d={`M${-ext} ${split - s0 * 0.035} Q${cx} ${split + s0 * 0.05} ${W + ext} ${split - s0 * 0.035} V${H + ext} H${-ext}Z`} fill={p.bg} />
          {stack(blocks, m, W - m, split + s0 * 0.02, H - m * (round ? 1.25 : 0.85))}
        </>
      );
    } else if (L1 === 'couple') {
      const n = daysSince(d.date);
      const blocks: Block[] = [
        { k: 'text', text: `${d.name || ''} & ${d.name2 || ''}`, ts: disp, size: s0 * 0.085, fill: ink, lines: 1 },
        { k: 'gap', h: s0 * 0.015 },
        { k: 'text', text: n !== null ? fmtNum(n) : '…', ts: { fam: BODY, wt: 800 }, size: s0 * 0.13, fill: acc, lines: 1 },
        { k: 'text', text: d.title, ts: bodyR, size: s0 * 0.04, fill: sub, upper: true, ls: s0 * 0.006 },
        { k: 'gap', h: s0 * 0.015 },
        { k: 'text', text: d.date ? `Từ ngày ${fmtDate(d.date)}` : '', ts: bodyR, size: s0 * 0.03, fill: sub },
      ];
      const pr = s0 * (wide ? 0.42 : round ? 0.25 : 0.3), py = wide ? cy - pr / 2 : m + s0 * (round ? 0.05 : 0.0);
      const pcx = wide ? m + s0 * 0.5 : cx;
      body = (
        <>
          {bgRect(p.bg)}
          <PatternLayer kind="hearts" W={W} H={H} ext={ext} fill={acc} opacity={0.1} />
          {photoSlot('p1', pcx - pr * 1.05, py, pr, pr, 'circle', '#FFFFFF')}
          {photoSlot('p2', pcx + pr * 0.05, py, pr, pr, 'circle', '#FFFFFF')}
          <path d={heartPath(pcx - pr * 0.0 + 0, py + pr * 0.86, s0 * 0.09)} fill={acc} stroke="#FFFFFF" strokeWidth={s0 * 0.006} />
          {wide ? stack(blocks, m + s0 * 1.05, W - m, m, H - m) : stack(blocks, m, W - m, py + pr + s0 * 0.07, H - m * (round ? 1.15 : 0.9))}
        </>
      );
    } else if (L1 === 'polaroid') {
      const pw = s0 * (wide ? 0.5 : 0.36), phh = pw * 1.18;
      const pol = (slot: string, x: number, y: number, rot: number, cap: string) => (
        <g transform={`rotate(${rot} ${x + pw / 2} ${y + phh / 2})`}>
          <rect x={x + s0 * 0.008} y={y + s0 * 0.012} width={pw} height={phh} fill="#000000" opacity={0.12} rx={s0 * 0.004} />
          <rect x={x} y={y} width={pw} height={phh} fill="#FFFFFF" rx={s0 * 0.004} />
          {photoSlot(slot, x + pw * 0.07, y + pw * 0.07, pw * 0.86, pw * 0.86, 'rect')}
          {cap && T(cap, x + pw / 2, y + phh - pw * 0.075, pw * 0.085, { fam: 'Dancing Script', wt: 700 }, '#3A3A3A')}
        </g>
      );
      const cy0 = wide ? cy - phh / 2 : m + s0 * 0.14;
      const blocks: Block[] = [
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.11, fill: acc, lines: 1 },
        { k: 'text', text: d.name, ts: { fam: BODY, wt: 800 }, size: s0 * 0.05, fill: ink, upper: true, ls: s0 * 0.006 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.032, fill: sub },
      ];
      body = (
        <>
          {bgRect(p.bg)}
          <PatternLayer kind="hearts" W={W} H={H} ext={ext} fill={acc} opacity={0.08} />
          {wide ? (
            <>{pol('p1', m + s0 * 0.02, cy0, -6, '')}{pol('p2', m + s0 * 0.5, cy0 + s0 * 0.03, 5, '')}{stack(blocks, m + s0 * 1.1, W - m, m, H - m)}</>
          ) : (
            <>
              {pol('p1', cx - pw * 1.02, cy0, -7, '♥')}
              {pol('p2', cx + pw * 0.02, cy0 + s0 * 0.04, 6, '')}
              {stack(blocks, m, W - m, cy0 + phh + s0 * 0.07, H - m * (round ? 1.2 : 0.9))}
            </>
          )}
        </>
      );
    } else if (L1 === 'family') {
      const inset = s0 * 0.06;
      const band = s0 * 0.3;
      const blocks: Block[] = [
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.085, fill: acc, lines: 1 },
        { k: 'text', text: d.name, ts: { fam: BODY, wt: 800 }, size: s0 * 0.05, fill: ink, upper: true, ls: s0 * 0.005 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.032, fill: sub },
      ];
      body = round ? (
        <>{bgRect(p.bg)}{photoSlot('p1', cx - W * 0.3, m * 0.6, W * 0.6, W * 0.6, 'circle', '#FFFFFF')}{stack(blocks, m, W - m, m * 0.6 + W * 0.6 + s0 * 0.015, H - m)}</>
      ) : wide ? (
        <>{bgRect(p.bg)}{photoSlot('p1', inset, inset, W * 0.55, H - inset * 2, 'rounded', '#FFFFFF')}<Sprig x={W - m * 0.6} y={H - m * 0.4} s={s0 * 0.3} fill={p.accent2} rot={-20} flip />{stack(blocks, W * 0.55 + inset * 2, W - m, m, H - m)}</>
      ) : (
        <>
          {bgRect(p.bg)}
          {photoSlot('p1', inset, inset, W - inset * 2, H - inset * 2 - band, 'rounded', '#FFFFFF')}
          <Sprig x={m * 0.55} y={H - band * 0.15} s={band * 0.95} fill={p.accent2} rot={18} />
          <Sprig x={W - m * 0.55} y={H - band * 0.15} s={band * 0.95} fill={p.accent2} rot={-18} flip />
          {stack(blocks, m + s0 * 0.08, W - m - s0 * 0.08, H - inset - band + s0 * 0.01, H - inset * 1.1)}
        </>
      );
    } else if (L1 === 'pet' || L1 === 'petbone') {
      const isBone = L1 === 'petbone';
      const paws = !isBone && scatter(W, H, s0 * 0.2, ext, (x, y, i, r) => <Paw key={i} x={x} y={y} s={s0 * 0.07} fill={acc} rot={(r - 0.5) * 70} opacity={0.18} />);
      const bones = isBone && scatter(W, H, s0 * 0.2, ext, (x, y, i, r) => {
        const s = s0 * 0.05;
        return <g key={i} transform={`translate(${x} ${y}) rotate(${(r - 0.5) * 120})`} fill={i % 2 ? acc : p.accent2} opacity={0.22}><rect x={-s} y={-s * 0.22} width={s * 2} height={s * 0.44} rx={s * 0.2} />{[-1, 1].map((k) => <g key={k}><circle cx={k * s} cy={-s * 0.25} r={s * 0.28} /><circle cx={k * s} cy={s * 0.25} r={s * 0.28} /></g>)}</g>;
      });
      const blocks: Block[] = isBone ? [
        { k: 'photo', slot: 'p1', h: s0 * 0.48, shape: 'rounded', ring: '#FFFFFF', aspect: 1 },
        { k: 'gap', h: s0 * 0.03 },
        { k: 'text', text: d.name, ts: disp, size: s0 * 0.13, fill: ink, lines: 1 },
        { k: 'pill', text: (d.title || '').toUpperCase(), size: s0 * 0.032, bg: acc, fill: p.onAccent },
      ] : [
        { k: 'text', text: d.title, ts: { fam: BODY, wt: 800 }, size: s0 * 0.038, fill: sub, upper: true, ls: s0 * 0.008 },
        { k: 'gap', h: s0 * 0.015 },
        { k: 'photo', slot: 'p1', h: s0 * 0.46, shape: 'circle', ring: acc },
        { k: 'gap', h: s0 * 0.02 },
        { k: 'text', text: d.name, ts: disp, size: s0 * 0.13, fill: acc, lines: 1 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.032, fill: sub },
      ];
      body = (
        <>
          {bgRect(p.bg)}{paws}{bones}
          {wide
            ? <>{photoSlot('p1', m + s0 * 0.04, cy - s0 * 0.32, s0 * 0.64, s0 * 0.64, isBone ? 'rounded' : 'circle', isBone ? '#FFFFFF' : acc)}{stack(blocks.filter((b) => b.k !== 'photo'), m + s0 * 0.8, W - m, m, H - m)}</>
            : stack(blocks, m, W - m, m, H - m)}
        </>
      );
    } else if (L1 === 'quote' || L1 === 'floral') {
      const floral = L1 === 'floral';
      const blocks: Block[] = floral ? [
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.11, fill: ink, lines: 4, lh: 1.12 },
        { k: 'gap', h: s0 * 0.025 },
        { k: 'rule', h: s0 * 0.04, fill: acc },
        { k: 'gap', h: s0 * 0.015 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.036, fill: sub, upper: true, ls: s0 * 0.008 },
      ] : [
        { k: 'text', text: '“', ts: { fam: 'Playfair Display', wt: 800 }, size: s0 * 0.24, fill: acc, lh: 0.62 },
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.1, fill: ink, lines: 4, lh: 1.14 },
        { k: 'gap', h: s0 * 0.03 },
        { k: 'text', text: d.sub ? `— ${d.sub} —` : '', ts: bodyR, size: s0 * 0.034, fill: acc, ls: s0 * 0.004 },
      ];
      body = (
        <>
          {bgRect(p.bg)}
          {floral ? (
            <>
              <Sprig x={round ? W * 0.2 : m * 0.15} y={round ? H * 0.2 : m * 0.15} s={s0 * 0.26} fill={acc} rot={135} />
              <Sprig x={round ? W * 0.2 : m * 0.15} y={round ? H * 0.2 : m * 0.15} s={s0 * 0.2} fill={p.accent2} rot={100} />
              <Sprig x={round ? W * 0.8 : W - m * 0.15} y={round ? H * 0.8 : H - m * 0.15} s={s0 * 0.26} fill={acc} rot={-45} />
              <Sprig x={round ? W * 0.8 : W - m * 0.15} y={round ? H * 0.8 : H - m * 0.15} s={s0 * 0.2} fill={p.accent2} rot={-80} />
            </>
          ) : (
            <rect x={m * 0.55} y={m * 0.55} width={W - m * 1.1} height={H - m * 1.1} fill="none" stroke={acc} strokeWidth={s0 * 0.004} rx={round ? W : 0} opacity={0.6} />
          )}
          {stack(blocks, m + s0 * (floral && !wide ? 0.1 : 0.04), W - m - s0 * (floral && !wide ? 0.1 : 0.04), m + s0 * (floral ? 0.1 : 0.02), H - m - s0 * (floral ? 0.1 : 0.02))}
        </>
      );
    } else if (L1 === 'cafe') {
      const R = s0 * 0.3;
      const ring = (txt: string) => {
        // vòng chữ quanh logo (từng ký tự 1 <text> để outline được)
        const chars = [...(txt || '').toUpperCase()];
        const size = Math.min(s0 * 0.04, (Math.PI * 1.15 * R) / Math.max(1, chars.length) / 0.72);
        const total = chars.reduce((a, ch) => a + textW(ch, size, bodyB) + size * 0.12, 0);
        let a = -Math.PI / 2 - total / (R * 0.86) / 2;
        return chars.map((ch, i) => {
          const cw = textW(ch, size, bodyB) + size * 0.12, mid = a + cw / (R * 0.86) / 2; a += cw / (R * 0.86);
          const x = cx + Math.cos(mid) * R * 0.86, y = cy + Math.sin(mid) * R * 0.86;
          return <text key={i} x={x} y={y} transform={`rotate(${(mid * 180) / Math.PI + 90} ${x} ${y})`} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={size} fill={p.ink} textAnchor="middle" dominantBaseline="middle">{ch}</text>;
        });
      };
      const hasLogo = !!photos.p1?.src;
      body = (
        <>
          {bgRect(p.bg)}
          <PatternLayer kind="beans" W={W} H={H} ext={ext} fill={p.accent} opacity={0.14} step={s0 * 0.13} />
          <circle cx={cx} cy={cy} r={R * 1.08} fill={p.bg2} />
          <circle cx={cx} cy={cy} r={R} fill="none" stroke={p.accent} strokeWidth={s0 * 0.006} />
          <circle cx={cx} cy={cy} r={R * 0.72} fill="none" stroke={p.accent} strokeWidth={s0 * 0.003} />
          {ring(d.name)}
          {hasLogo ? photoSlot('p1', cx - R * 0.62, cy - R * 0.62, R * 1.24, R * 1.24, 'circle')
            : (
              <g>
                <path d={`M${cx - R * 0.3} ${cy - R * 0.16} h${R * 0.6} v${R * 0.22} a${R * 0.3} ${R * 0.26} 0 0 1 ${-R * 0.6} 0Z`} fill={p.accent} />
                <path d={`M${cx + R * 0.3} ${cy - R * 0.08} a${R * 0.1} ${R * 0.1} 0 0 1 0 ${R * 0.2}`} stroke={p.accent} strokeWidth={R * 0.05} fill="none" />
                {[-0.12, 0, 0.12].map((k, i) => <path key={i} d={`M${cx + k * R} ${cy - R * 0.24} q${R * 0.05} ${-R * 0.08} 0 ${-R * 0.16} q${-R * 0.05} ${-R * 0.08} 0 ${-R * 0.16}`} stroke={p.sub} strokeWidth={R * 0.03} fill="none" strokeLinecap="round" />)}
                {(() => { const t = (d.sub || '').toUpperCase(), fb = fitBlock(t, R * 1.15, R * 0.1, { ...bodyB, ls: R * 0.015 }, 2), lh = fb.size * 1.15; return fb.lines.map((ln, j) => <g key={j}>{T(ln, cx, cy + R * 0.38 + j * lh, fb.size, bodyB, p.sub, 'middle', { ls: R * 0.015 * fb.size / (R * 0.1) })}</g>); })()}
              </g>
            )}
          {stack([{ k: 'text', text: d.title, ts: disp, size: s0 * 0.07, fill: p.accent, lines: 1 }], m, W - m, cy + R * 1.12, H - m * 0.7)}
        </>
      );
    } else if (L1 === 'homestay') {
      const gy = H * 0.64;
      const blocks: Block[] = [
        { k: 'text', text: d.name, ts: { fam: BODY, wt: 800 }, size: s0 * 0.05, fill: p.onAccent === '#FFFFFF' ? '#FFFFFF' : p.ink, upper: true, ls: s0 * 0.01 },
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.16, fill: '#FFFFFF', lines: 1 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.036, fill: '#FFFFFF' },
      ];
      body = (
        <>
          {bgRect(p.accent)}
          <circle cx={round ? W * 0.74 : W - m * 1.1} cy={round ? H * 0.24 : m * 1.1} r={s0 * 0.065} fill={p.accent2} opacity={0.9} />
          {[0.12, 0.3].map((k, i) => <path key={i} d={`M${W * (k + (round ? 0.1 : 0))} ${H * (0.1 + i * 0.05) + (round ? H * 0.06 : 0)} q${s0 * 0.04} ${-s0 * 0.03} ${s0 * 0.08} 0 q${s0 * 0.04} ${-s0 * 0.03} ${s0 * 0.08} 0`} stroke="#FFFFFF" strokeWidth={s0 * 0.008} fill="none" opacity={0.7} strokeLinecap="round" />)}
          <path d={`M${-ext} ${gy} L${W * 0.22} ${H * 0.42} L${W * 0.42} ${gy - H * 0.06} L${W * 0.64} ${H * 0.36} L${W + ext} ${gy - H * 0.02} V${H + ext} H${-ext}Z`} fill={p.bg2} opacity={0.55} />
          <path d={`M${-ext} ${gy + H * 0.08} Q${W * 0.35} ${gy - H * 0.04} ${W * 0.6} ${gy + H * 0.06} T${W + ext} ${gy + H * 0.04} V${H + ext} H${-ext}Z`} fill={p.ink} opacity={0.35} />
          {scatter(W, H * 0.3, s0 * 0.07, ext, (x, y, i) => <path key={i} d={`M${x} ${gy + H * 0.12 + y * 0.6} l${s0 * 0.025} ${s0 * 0.07} h${-s0 * 0.05}Z`} fill={p.ink} opacity={0.35} />)}
          {stack(blocks, m, W - m, m * 1.1 + s0 * 0.05, gy - s0 * 0.04)}
        </>
      );
    } else if (L1 === 'noel') {
      const blocks: Block[] = [
        { k: 'text', text: d.title, ts: disp, size: s0 * 0.12, fill: p.accent, lines: 2, lh: 1.02 },
        { k: 'gap', h: s0 * 0.02 },
        { k: 'photo', slot: 'p1', h: s0 * 0.38, shape: 'arch', ring: p.accent, aspect: 0.78 },
        { k: 'gap', h: s0 * 0.02 },
        { k: 'text', text: d.name, ts: { fam: BODY, wt: 800 }, size: s0 * 0.06, fill: p.ink, upper: true, ls: s0 * 0.006 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.032, fill: p.sub },
      ];
      body = (
        <>
          {bgRect(p.bg)}
          <PatternLayer kind="snow" W={W} H={H} ext={ext} fill="#FFFFFF" opacity={0.25} />
          {/* dây đèn + cành thông 2 góc trên */}
          <Sprig x={-s0 * 0.02} y={s0 * 0.05} s={s0 * 0.3} fill={p.accent2} rot={110} />
          <Sprig x={W + s0 * 0.02} y={s0 * 0.05} s={s0 * 0.3} fill={p.accent2} rot={-110} flip />
          {[0.12, 0.88].map((k, i) => <circle key={i} cx={W * k} cy={s0 * 0.11} r={s0 * 0.022} fill={p.accent} />)}
          {wide
            ? <>{photoSlot('p1', m + s0 * 0.08, m + s0 * 0.02, s0 * 0.5, H - m * 2 - s0 * 0.04, 'arch', p.accent)}{stack(blocks.filter((b) => b.k !== 'photo'), m + s0 * 0.75, W - m, m, H - m)}</>
            : stack(blocks, m, W - m, m + s0 * 0.04, H - m)}
        </>
      );
    } else { // baby
      const blocks: Block[] = [
        { k: 'text', text: d.title, ts: { fam: BODY, wt: 800 }, size: s0 * 0.036, fill: p.sub, upper: true, ls: s0 * 0.01 },
        { k: 'gap', h: s0 * 0.015 },
        { k: 'photo', slot: 'p1', h: s0 * 0.42, shape: 'circle', ring: '#FFFFFF' },
        { k: 'gap', h: s0 * 0.02 },
        { k: 'text', text: d.name, ts: disp, size: s0 * 0.13, fill: p.accent, lines: 1 },
        { k: 'text', text: d.sub, ts: bodyR, size: s0 * 0.032, fill: p.sub, lines: 2 },
      ];
      body = (
        <>
          {bgRect(p.bg)}
          <PatternLayer kind="stars" W={W} H={H} ext={ext} fill={p.accent2} opacity={0.4} />
          <path d={`M${W * 0.82} ${s0 * 0.08} a${s0 * 0.07} ${s0 * 0.07} 0 1 0 ${s0 * 0.05} ${s0 * 0.12} a${s0 * 0.055} ${s0 * 0.055} 0 1 1 ${-s0 * 0.05} ${-s0 * 0.12}Z`} fill={p.accent2} opacity={round ? 0 : 0.9} />
          {wide
            ? <>{photoSlot('p1', m + s0 * 0.04, cy - s0 * 0.32, s0 * 0.64, s0 * 0.64, 'circle', '#FFFFFF')}{stack(blocks.filter((b) => b.k !== 'photo'), m + s0 * 0.8, W - m, m, H - m)}</>
            : stack(blocks, m, W - m, m, H - m)}
        </>
      );
    }
  }

  // ----- khung -----
  const vb = `${-ext} ${-ext} ${W + ext * 2} ${H + ext * 2}`;
  const shapeClip = round ? <circle cx={cx} cy={cy} r={W / 2 + ext} /> : <rect x={-ext} y={-ext} width={W + ext * 2} height={H + ext * 2} />;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-pw-face={face}>
      <defs><clipPath id={clipId}>{shapeClip}</clipPath></defs>
      {print && <rect x={-ext} y={-ext} width={W + ext * 2} height={H + ext * 2} fill="#FFFFFF" />}
      <g clipPath={`url(#${clipId})`}>
        {body}
      </g>
      {print && (
        <g data-print-marks="1" fill="none">
          {/* nét may (đứt) = mép gối thành phẩm; nét cắt (liền) = mép vải */}
          {round
            ? <><circle cx={cx} cy={cy} r={W / 2} stroke="#E11D48" strokeWidth={0.6} strokeDasharray="4 3" /><circle cx={cx} cy={cy} r={W / 2 + ext - 0.3} stroke="#111111" strokeWidth={0.6} /></>
            : <><rect x={0} y={0} width={W} height={H} stroke="#E11D48" strokeWidth={0.6} strokeDasharray="4 3" /><rect x={-ext + 0.3} y={-ext + 0.3} width={W + ext * 2 - 0.6} height={H + ext * 2 - 0.6} stroke="#111111" strokeWidth={0.6} /></>}
        </g>
      )}
    </svg>
  );
}
