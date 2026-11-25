'use client';
// Khung check-in cầm tay (selfie frame): tấm formex lớn có Ô CỬA SỔ khoét giữa để khách chụp ảnh qua.
// 1 engine SVG = DỊP (cưới, khai trương, sinh nhật, YEP, tốt nghiệp, thôi nôi) × BỐ CỤC (polaroid, băng rôn, ô giữa,
// kiểu mạng xã hội) × Ô CỬA SỔ (chữ nhật, bo góc, vòm, tròn, tim) × VIỀN NGOÀI (chữ nhật, hoa sò, mây, bóng bay) → render code 100%.
// Đơn vị vẽ: 1 = 1mm. Đường cắt (viền ngoài + ô cửa sổ) cũng tính bằng mm → dùng chung cho file in–cắt và khối 3D.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export const SF_BLEED_MM = 3;
export const CUTCONTOUR = '#EC008C';

// ---------- khổ ----------
export interface SfSize { id: string; name: string; wMm: number; hMm: number }
export const SF_SIZES: SfSize[] = [
  { id: '60x45', name: '60 × 45 cm (cầm tay)', wMm: 600, hMm: 450 },
  { id: '80x60', name: '80 × 60 cm', wMm: 800, hMm: 600 },
  { id: '100x70', name: '100 × 70 cm (2–4 người)', wMm: 1000, hMm: 700 },
];
export const sfSize = (id: string) => SF_SIZES.find((s) => s.id === id) || SF_SIZES[0];

export type SfOutline = 'rect' | 'scallop' | 'cloud' | 'balloons';
export const SF_OUTLINES: { id: SfOutline; name: string }[] = [
  { id: 'rect', name: 'Chữ nhật bo góc' },
  { id: 'scallop', name: 'Viền hoa sò' },
  { id: 'cloud', name: 'Đám mây' },
  { id: 'balloons', name: 'Bóng bay trên đỉnh' },
];
export type SfWindow = 'rect' | 'rounded' | 'arch' | 'circle' | 'heart';
export const SF_WINDOWS: { id: SfWindow; name: string }[] = [
  { id: 'rect', name: 'Chữ nhật' },
  { id: 'rounded', name: 'Bo tròn góc' },
  { id: 'arch', name: 'Vòm cửa' },
  { id: 'circle', name: 'Tròn' },
  { id: 'heart', name: 'Trái tim' },
];
export type SfLayout = 'polaroid' | 'banner' | 'center' | 'social';
export const SF_LAYOUTS: { id: SfLayout; name: string }[] = [
  { id: 'polaroid', name: 'Polaroid (chữ dưới)' },
  { id: 'banner', name: 'Băng rôn (chữ trên)' },
  { id: 'center', name: 'Ô giữa' },
  { id: 'social', name: 'Bài đăng mạng xã hội' },
];
export type SfDeco = 'flowers' | 'balloons' | 'fireworks' | 'confetti' | 'laurel' | 'stars' | 'none';
export const SF_DECOS: { id: SfDeco; name: string }[] = [
  { id: 'flowers', name: 'Hoa & lá' },
  { id: 'balloons', name: 'Bóng bay' },
  { id: 'fireworks', name: 'Pháo hoa' },
  { id: 'confetti', name: 'Giấy kim tuyến' },
  { id: 'laurel', name: 'Cành nguyệt quế' },
  { id: 'stars', name: 'Ngôi sao' },
  { id: 'none', name: 'Không' },
];

// ---------- dịp + chữ mẫu ----------
export type SfPurpose = 'wedding' | 'opening' | 'birthday' | 'yep' | 'grad' | 'baby';
export const SF_PURPOSES: { id: SfPurpose; name: string }[] = [
  { id: 'wedding', name: 'Đám cưới' },
  { id: 'opening', name: 'Khai trương' },
  { id: 'birthday', name: 'Sinh nhật' },
  { id: 'yep', name: 'Year End Party' },
  { id: 'grad', name: 'Tốt nghiệp' },
  { id: 'baby', name: 'Thôi nôi · đầy tháng' },
];
export type SfData = Record<string, string>;
export const SF_SAMPLES: Record<SfPurpose, SfData> = {
  wedding: { kicker: 'Happy Wedding', title: 'Quốc Bảo & Thu Hà', date: '12.12.2026', hashtag: '#BaoHaWedding', extra: 'Trăm năm hạnh phúc' },
  opening: { kicker: 'Khai trương', title: 'AN KHANG COFFEE', date: '08.01.2027', hashtag: '#AnKhangCoffee', extra: '12 Nguyễn Huệ, Q.1' },
  birthday: { kicker: 'Happy Birthday', title: 'Bé Gia Khánh 7 tuổi', date: '20.03.2027', hashtag: '#GiaKhanh7', extra: 'Chúc con luôn vui khoẻ' },
  yep: { kicker: 'An Khang Group', title: 'Year End Party 2026', date: '22.01.2027', hashtag: '#AnKhangYEP2026', extra: 'Bứt phá cùng nhau' },
  grad: { kicker: 'Lễ tốt nghiệp', title: 'Tốt nghiệp K24', date: '15.06.2027', hashtag: '#K24Graduation', extra: 'Đại học Kinh tế' },
  baby: { kicker: 'Mừng thôi nôi', title: 'Bé Bảo An', date: '05.05.2027', hashtag: '#BeBaoAn1Tuoi', extra: 'Tròn 1 tuổi' },
};
export interface SfField { key: string; label: string; ph?: string; half?: boolean }
export const SF_FIELDS: SfField[] = [
  { key: 'kicker', label: 'Dòng nhỏ (chữ viết tay)', ph: 'Happy Wedding', half: true },
  { key: 'date', label: 'Ngày', ph: '12.12.2026', half: true },
  { key: 'title', label: 'Tiêu đề lớn (tên cô dâu chú rể / tên quán / sự kiện)', ph: 'Quốc Bảo & Thu Hà' },
  { key: 'hashtag', label: 'Hashtag', ph: '#BaoHaWedding', half: true },
  { key: 'extra', label: 'Dòng phụ (lời chúc / địa điểm)', ph: 'Trăm năm hạnh phúc', half: true },
];

// ---------- bảng màu ----------
export interface SfPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; accent2: string; deco: string[]; leaf: string; dark?: boolean }
export const SF_PALETTES: SfPalette[] = [
  { id: 'blush', name: 'Hồng phấn', bg: '#FFF4F1', bg2: '#F9DCD6', ink: '#5A2E35', sub: '#9A6B70', accent: '#C2546B', accent2: '#C9973A', deco: ['#F2A7B5', '#E7838F', '#F8D3C8', '#FFFFFF'], leaf: '#8DAA7F' },
  { id: 'ivory', name: 'Kem ánh vàng', bg: '#FFFBF2', bg2: '#F3E7CC', ink: '#3B2F1E', sub: '#8A7656', accent: '#B8892E', accent2: '#3B2F1E', deco: ['#E9D29A', '#C9A24B', '#F5E8C4', '#FFFFFF'], leaf: '#9BAA7A' },
  { id: 'mono', name: 'Trắng tối giản', bg: '#FFFFFF', bg2: '#EFEFEF', ink: '#111111', sub: '#6B6B6B', accent: '#E1306C', accent2: '#D4A24C', deco: ['#F7C6D6', '#F09AB0', '#ECECEC', '#FFFFFF'], leaf: '#9A9A9A' },
  { id: 'red', name: 'Đỏ khai trương', bg: '#C8102E', bg2: '#A00B24', ink: '#FFF6E5', sub: '#FFD98A', accent: '#FFD24A', accent2: '#FFFFFF', deco: ['#FFD24A', '#FF9A3D', '#FFFFFF', '#FFE9A8'], leaf: '#FFD24A', dark: true },
  { id: 'teal', name: 'Xanh ngọc', bg: '#E8F7F4', bg2: '#BFE9E1', ink: '#0F4C48', sub: '#3E7F79', accent: '#F2994A', accent2: '#0F766E', deco: ['#F2C94C', '#F2994A', '#2BB3A3', '#FFFFFF'], leaf: '#2BB3A3' },
  { id: 'pastel', name: 'Pastel tiệc', bg: '#FFF8EC', bg2: '#FFE3EC', ink: '#4A2F5E', sub: '#86699A', accent: '#FF6F91', accent2: '#3FB4CF', deco: ['#FF9AB4', '#7FD3E6', '#FFD66B', '#B79CFF'], leaf: '#7FC8A9' },
  { id: 'sunny', name: 'Vàng nắng', bg: '#FFD84D', bg2: '#FFC21A', ink: '#2A2140', sub: '#4F3F70', accent: '#E9414F', accent2: '#2A2140', deco: ['#FF5A5F', '#3EC1D3', '#FFFFFF', '#7B61FF'], leaf: '#2A9D8F' },
  { id: 'navy', name: 'Navy ánh kim', bg: '#0F1B3D', bg2: '#1C2B57', ink: '#FFFFFF', sub: '#D9C08A', accent: '#D8B25A', accent2: '#FFFFFF', deco: ['#D8B25A', '#F3E2B3', '#8FA4D8', '#FFFFFF'], leaf: '#D8B25A', dark: true },
  { id: 'neon', name: 'Đêm neon', bg: '#121016', bg2: '#221D2C', ink: '#FFFFFF', sub: '#C4BCD6', accent: '#FF3D8B', accent2: '#2CE6D6', deco: ['#FF3D8B', '#2CE6D6', '#FFE14D', '#A78BFA'], leaf: '#2CE6D6', dark: true },
  { id: 'green', name: 'Xanh lá học đường', bg: '#F3F8EE', bg2: '#DDEBD1', ink: '#1F3B2A', sub: '#4F6E57', accent: '#2F6B45', accent2: '#B8892E', deco: ['#7FA86B', '#C9A24B', '#A9C99A', '#FFFFFF'], leaf: '#5E8C55' },
  { id: 'baby', name: 'Xanh em bé', bg: '#EEF6FF', bg2: '#D4E8FF', ink: '#24406B', sub: '#5D7BA6', accent: '#4A8BDB', accent2: '#E9A82E', deco: ['#9CC8FF', '#F5B841', '#FFFFFF', '#FFB3C7'], leaf: '#7FB7A0' },
];
export const sfPalette = (id: string) => SF_PALETTES.find((p) => p.id === id) || SF_PALETTES[0];

// ---------- font ----------
export interface SfFont { id: string; name: string; family: string; weight: number }
export const SF_FONTS: SfFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
];
export const SF_SCRIPTS: SfFont[] = [
  { id: 'greatvibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
const sfFont = (id: string) => SF_FONTS.find((f) => f.id === id) || SF_FONTS[0];
const sfScript = (id: string) => SF_SCRIPTS.find((f) => f.id === id) || SF_SCRIPTS[0];
const BODY = 'Be Vietnam Pro';
export const SF_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Oswald:wght@700&family=Lobster&family=Great+Vibes&family=Dancing+Script:wght@700&display=swap');`;

export function useSfFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-sf-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-sf-fonts'; link.rel = 'stylesheet';
        link.href = SF_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...SF_FONTS, ...SF_SCRIPTS].map((f) => `${f.weight} 40px "${f.family}"`).concat(['600 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"']);
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 #&')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec + mẫu ----------
export interface SfSpec {
  purpose: SfPurpose; layout: SfLayout; window: SfWindow; outline: SfOutline; deco: SfDeco;
  palette: string; font: string; script: string; size: string;
}
export interface SfTemplate { id: string; name: string; spec: Omit<SfSpec, 'size'> }
const T = (id: string, name: string, purpose: SfPurpose, layout: SfLayout, window: SfWindow, outline: SfOutline, deco: SfDeco, palette: string, font: string, script = 'greatvibes'): SfTemplate =>
  ({ id, name, spec: { purpose, layout, window, outline, deco, palette, font, script } });
export const SF_TEMPLATES: SfTemplate[] = [
  T('wed-blush', 'Cưới · hoa hồng phấn', 'wedding', 'polaroid', 'rounded', 'scallop', 'flowers', 'blush', 'playfair'),
  T('wed-heart', 'Cưới · tim ánh vàng', 'wedding', 'center', 'heart', 'rect', 'laurel', 'ivory', 'playfair'),
  T('wed-social', 'Cưới · bài đăng', 'wedding', 'social', 'rect', 'rect', 'flowers', 'mono', 'playfair'),
  T('open-red', 'Khai trương · đỏ vàng', 'opening', 'banner', 'rect', 'rect', 'fireworks', 'red', 'montserrat', 'dancing'),
  T('open-cloud', 'Khai trương · mây xanh', 'opening', 'polaroid', 'arch', 'cloud', 'confetti', 'teal', 'baloo', 'dancing'),
  T('bd-balloon', 'Sinh nhật · bóng bay', 'birthday', 'polaroid', 'rounded', 'balloons', 'balloons', 'pastel', 'baloo', 'dancing'),
  T('bd-sunny', 'Sinh nhật · ô tròn', 'birthday', 'center', 'circle', 'cloud', 'confetti', 'sunny', 'baloo', 'dancing'),
  T('yep-navy', 'YEP · navy ánh kim', 'yep', 'banner', 'rect', 'rect', 'fireworks', 'navy', 'oswald'),
  T('yep-neon', 'YEP · bài đăng neon', 'yep', 'social', 'rounded', 'rect', 'stars', 'neon', 'montserrat'),
  T('grad-navy', 'Tốt nghiệp · nguyệt quế', 'grad', 'polaroid', 'rect', 'rect', 'laurel', 'navy', 'playfair'),
  T('grad-green', 'Tốt nghiệp · ô tròn', 'grad', 'center', 'circle', 'scallop', 'laurel', 'green', 'playfair'),
  T('baby-cloud', 'Thôi nôi · mây xanh', 'baby', 'center', 'heart', 'cloud', 'stars', 'baby', 'baloo', 'dancing'),
];
export const defaultSfSpec = (): SfSpec => ({ ...SF_TEMPLATES[0].spec, size: '60x45' });

// ---------- đo chữ thật ----------
let mctx: CanvasRenderingContext2D | null = null;
const ctx = () => {
  if (typeof document === 'undefined') return null;
  mctx ??= document.createElement('canvas').getContext('2d');
  return mctx;
};
function measure(text: string, family: string, weight: number): number {
  const c = ctx(); if (!c) return text.length * 60;
  c.font = `${weight} 100px "${family}"`;
  return c.measureText(text).width;
}
const metricCache = new Map<string, { asc: number; desc: number }>();
/** ascent/descent của font (trên cỡ 1) — khớp với hộp getBBox của <text> → xếp dòng không đè nhau */
function metric(family: string, weight: number) {
  const k = `${weight}|${family}`;
  if (!metricCache.has(k)) {
    const c = ctx();
    let asc = 0.95, desc = 0.28;
    if (c) {
      c.font = `${weight} 100px "${family}"`;
      const m = c.measureText('ẮHgjđ');
      if (m.fontBoundingBoxAscent) { asc = m.fontBoundingBoxAscent / 100; desc = m.fontBoundingBoxDescent / 100; }
    }
    // chỉ cache khi font đã nạp (tránh lưu số đo font dự phòng)
    if (typeof document !== 'undefined' && document.fonts.check(`${weight} 20px "${family}"`)) metricCache.set(k, { asc, desc });
    else return { asc, desc };
  }
  return metricCache.get(k)!;
}
const fitSize = (text: string, family: string, weight: number, maxW: number, size: number, ls = 0) => {
  if (!text) return size;
  const per = measure(text, family, weight) / 100, L = ls * Math.max(0, text.length - 1);
  return per * size + L > maxW ? Math.max(1, (maxW - L) / per) : size;
};
function fitLines(text: string, family: string, weight: number, maxW: number, size: number, minSize: number, ls = 0): { lines: string[]; size: number } {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  const s1 = fitSize(t, family, weight, maxW, size, ls);
  const words = t.split(' ').filter(Boolean);
  if (s1 >= minSize || words.length < 2) return { lines: t ? [t] : [], size: s1 };
  let best: [string, string] = [t, ''], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, family, weight), measure(b, family, weight));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  const s2 = Math.min(size * 0.8, fitSize(best[0], family, weight, maxW, size, ls), fitSize(best[1], family, weight, maxW, size, ls));
  return s2 > s1 ? { lines: best, size: s2 } : { lines: [t], size: s1 };
}
const f1 = (n: number) => Math.round(n * 10) / 10;

interface Ln { text: string; family: string; weight: number; max: number; min: number; fill: string; role: string; ls?: number }
interface Box { x: number; y: number; w: number; h: number }
/** xếp các dòng chữ vào hộp: mỗi dòng co theo bề ngang (dài quá thì bẻ 2 dòng), tổng cao vượt hộp thì co đều. */
function Stack({ lines, box, anchor = 'middle', gapK = 0.16 }: { lines: Ln[]; box: Box; anchor?: 'middle' | 'start'; gapK?: number }) {
  const ls = lines.filter((l) => (l.text || '').trim());
  if (!ls.length) return null;
  const fit = ls.map((l) => ({ l, ...fitLines(l.text, l.family, l.weight, box.w, l.max, l.min, l.ls) }));
  const hOf = (i: number, s: number) => { const m = metric(fit[i].l.family, fit[i].l.weight); return fit[i].lines.length * (m.asc + m.desc) * s; };
  let k = 1;
  for (let it = 0; it < 3; it++) {
    const tot = fit.reduce((a, f, i) => a + hOf(i, f.size * k), 0) + gapK * (fit.length - 1) * (fit.reduce((a, f) => a + f.size, 0) / fit.length) * k;
    if (tot <= box.h) break;
    k *= box.h / tot;
  }
  const sizes = fit.map((f) => f.size * k);
  const avg = sizes.reduce((a, s) => a + s, 0) / sizes.length;
  const total = fit.reduce((a, _f, i) => a + hOf(i, sizes[i]), 0) + gapK * avg * (fit.length - 1);
  let y = box.y + (box.h - total) / 2;
  const x = anchor === 'middle' ? box.x + box.w / 2 : box.x;
  const out: ReactNode[] = [];
  fit.forEach((f, i) => {
    const m = metric(f.l.family, f.l.weight), s = sizes[i];
    f.lines.forEach((ln, j) => {
      out.push(
        <text key={`${i}-${j}`} x={f1(x)} y={f1(y + m.asc * s)} fontFamily={`"${f.l.family}"`} fontWeight={f.l.weight} fontSize={f1(s)} fill={f.l.fill}
          textAnchor={anchor} letterSpacing={f.l.ls ? f1(f.l.ls * (s / f.l.max)) : undefined} data-role={f.l.role} style={{ fontVariantLigatures: 'none' }}>{ln}</text>,
      );
      y += (m.asc + m.desc) * s;
    });
    y += gapK * avg;
  });
  return <>{out}</>;
}

// ---------- hình học: viền ngoài + ô cửa sổ ----------
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const reseed = (s: number) => { seed = s; };

/** cạnh có các "bướu" bán nguyệt lồi ra ngoài (path chạy theo chiều kim đồng hồ) */
function bumps(ax: number, ay: number, bx: number, by: number, chords: number[]): string {
  const len = Math.hypot(bx - ax, by - ay), dx = (bx - ax) / len, dy = (by - ay) / len;
  const tot = chords.reduce((a, c) => a + c, 0);
  let t = 0, d = '';
  for (const c of chords) {
    const cc = (c / tot) * len; t += cc;
    const r = cc / 2;
    d += `A${f1(r)} ${f1(r)} 0 0 1 ${f1(ax + dx * t)} ${f1(ay + dy * t)}`;
  }
  return d;
}
function chordsFor(len: number, base: number, jitter: number): number[] {
  const n = Math.max(2, Math.round(len / base));
  return Array.from({ length: n }, () => 1 + (rnd() - 0.5) * jitter);
}

export interface SfGeom {
  W: number; H: number;
  outline: string;            // đường cắt ngoài
  windowD: string;            // đường cắt ô cửa sổ
  win: Box;                   // hộp bao ô cửa sổ
  inner: Box;                 // vùng nền phẳng bên trong viền trang trí
  top: Box; bottom: Box;      // dải chữ trên / dưới
  lobes: { cx: number; cy: number; r: number }[]; // bóng bay trên đỉnh (viền balloons)
}

export function sfGeom(spec: SfSpec): SfGeom {
  const sz = sfSize(spec.size), W = sz.wMm, H = sz.hMm, mn = Math.min(W, H);
  reseed(97 + W);
  let outline = '', inner: Box = { x: 0, y: 0, w: W, h: H };
  const lobes: SfGeom['lobes'] = [];
  if (spec.outline === 'rect') {
    const r = mn * 0.03;
    outline = `M${r} 0H${W - r}A${r} ${r} 0 0 1 ${W} ${r}V${H - r}A${r} ${r} 0 0 1 ${W - r} ${H}H${r}A${r} ${r} 0 0 1 0 ${H - r}V${r}A${r} ${r} 0 0 1 ${r} 0Z`;
  } else if (spec.outline === 'scallop' || spec.outline === 'cloud') {
    const scal = spec.outline === 'scallop';
    const base = mn * (scal ? 0.075 : 0.15), e = base * (scal ? 0.5 : 0.56);
    const x0 = e, y0 = e, x1 = W - e, y1 = H - e;
    const jit = scal ? 0 : 0.7;
    outline = `M${f1(x0)} ${f1(y0)}` + bumps(x0, y0, x1, y0, chordsFor(x1 - x0, base, jit)) + bumps(x1, y0, x1, y1, chordsFor(y1 - y0, base, jit))
      + bumps(x1, y1, x0, y1, chordsFor(x1 - x0, base, jit)) + bumps(x0, y1, x0, y0, chordsFor(y1 - y0, base, jit)) + 'Z';
    inner = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  } else {
    // bóng bay: 3 quả tròn nhô lên trên đỉnh, phần còn lại chữ nhật bo góc
    const R = mn * 0.11, top = R * 1.35, r = mn * 0.03;
    const cxs = [W * 0.2, W * 0.5, W * 0.8], rs = [R * 0.92, R * 1.08, R * 0.92];
    let d = `M${r} ${top}`;
    cxs.forEach((cx, i) => {
      const rr = rs[i], cy = top - rr * 0.62, half = Math.sqrt(rr * rr - (top - cy) ** 2);
      d += `L${f1(cx - half)} ${f1(top)}A${f1(rr)} ${f1(rr)} 0 1 1 ${f1(cx + half)} ${f1(top)}`;
      lobes.push({ cx, cy, r: rr });
    });
    d += `L${W - r} ${top}A${r} ${r} 0 0 1 ${W} ${top + r}V${H - r}A${r} ${r} 0 0 1 ${W - r} ${H}H${r}A${r} ${r} 0 0 1 0 ${H - r}V${top + r}A${r} ${r} 0 0 1 ${r} ${top}Z`;
    outline = d;
    inner = { x: 0, y: top, w: W, h: H - top };
  }

  // bố cục: dải trên / dải dưới / ô cửa sổ
  const m = Math.min(inner.w, inner.h) * 0.075;
  const ix = inner.x, iy = inner.y, iw = inner.w, ih = inner.h;
  let ht: number, hb: number, side = m;
  if (spec.layout === 'polaroid') { ht = m; hb = ih * 0.27; }
  else if (spec.layout === 'banner') { ht = ih * 0.24; hb = ih * 0.13; }
  else if (spec.layout === 'center') { ht = ih * 0.15; hb = ih * 0.24; }
  else { ht = ih * 0.15; hb = ih * 0.22; side = m * 0.8; }
  let win: Box = { x: ix + side, y: iy + ht, w: iw - side * 2, h: ih - ht - hb };
  if (spec.window === 'circle' || spec.window === 'heart') {
    const s = Math.min(win.w, win.h * (spec.window === 'heart' ? 1.1 : 1));
    const hh = spec.window === 'heart' ? s / 1.1 : s;
    win = { x: win.x + (win.w - s) / 2, y: win.y + (win.h - hh) / 2, w: s, h: hh };
  }
  const { x, y, w, h } = win;
  let windowD: string;
  if (spec.window === 'rect' || spec.window === 'rounded') {
    const r = spec.window === 'rect' ? 6 : Math.min(w, h) * 0.12;
    windowD = `M${f1(x + r)} ${f1(y)}H${f1(x + w - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(y + h - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w - r)} ${f1(y + h)}H${f1(x + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x)} ${f1(y + h - r)}V${f1(y + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(y)}Z`;
  } else if (spec.window === 'arch') {
    const r = Math.min(w / 2, h * 0.6), rb = Math.min(w, h) * 0.04;
    windowD = `M${f1(x)} ${f1(y + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(y)}H${f1(x + w - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(y + h - rb)}A${f1(rb)} ${f1(rb)} 0 0 1 ${f1(x + w - rb)} ${f1(y + h)}H${f1(x + rb)}A${f1(rb)} ${f1(rb)} 0 0 1 ${f1(x)} ${f1(y + h - rb)}Z`;
  } else if (spec.window === 'circle') {
    const r = w / 2;
    windowD = `M${f1(x)} ${f1(y + r)}A${f1(r)} ${f1(r)} 0 1 1 ${f1(x + w)} ${f1(y + r)}A${f1(r)} ${f1(r)} 0 1 1 ${f1(x)} ${f1(y + r)}Z`;
  } else {
    const P = (u: number, v: number) => `${f1(x + u * w)} ${f1(y + v * h)}`;
    windowD = `M${P(0.5, 0.97)}C${P(0.18, 0.74)} ${P(0, 0.52)} ${P(0, 0.3)}C${P(0, 0.12)} ${P(0.13, 0)} ${P(0.28, 0)}C${P(0.39, 0)} ${P(0.47, 0.06)} ${P(0.5, 0.15)}`
      + `C${P(0.53, 0.06)} ${P(0.61, 0)} ${P(0.72, 0)}C${P(0.87, 0)} ${P(1, 0.12)} ${P(1, 0.3)}C${P(1, 0.52)} ${P(0.82, 0.74)} ${P(0.5, 0.97)}Z`;
  }
  return {
    W, H, outline, windowD, win, inner, lobes,
    top: { x: ix + side, y: iy, w: iw - side * 2, h: ht },
    bottom: { x: ix + side, y: iy + ih - hb, w: iw - side * 2, h: hb },
  };
}

// ---------- trang trí vẽ bằng code ----------
function Flower({ x, y, r, c, center, rot = 0 }: { x: number; y: number; r: number; c: string; center: string; rot?: number }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`}>
      {Array.from({ length: 6 }, (_, i) => <ellipse key={i} cx={0} cy={-r * 0.55} rx={r * 0.38} ry={r * 0.55} fill={c} transform={`rotate(${i * 60})`} opacity={0.95} />)}
      {Array.from({ length: 6 }, (_, i) => <ellipse key={`b${i}`} cx={0} cy={-r * 0.34} rx={r * 0.24} ry={r * 0.36} fill="#FFFFFF" opacity={0.28} transform={`rotate(${i * 60 + 30})`} />)}
      <circle r={r * 0.26} fill={center} />
    </g>
  );
}
function Leaf({ x, y, s, rot, c }: { x: number; y: number; s: number; rot: number; c: string }) {
  return <path d={`M0 0C${s * 0.35} ${-s * 0.32} ${s * 0.8} ${-s * 0.28} ${s} 0C${s * 0.8} ${s * 0.28} ${s * 0.35} ${s * 0.32} 0 0Z`} fill={c} transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`} />;
}
function Balloon({ x, y, r, c, stringLen, ink }: { x: number; y: number; r: number; c: string; stringLen: number; ink: string }) {
  return (
    <g>
      <path d={`M${f1(x)} ${f1(y + r * 1.15)}q${f1(-r * 0.25)} ${f1(stringLen * 0.3)} 0 ${f1(stringLen * 0.55)}t0 ${f1(stringLen * 0.45)}`} fill="none" stroke={ink} strokeOpacity={0.45} strokeWidth={Math.max(1, r * 0.035)} />
      <ellipse cx={x} cy={y} rx={r} ry={r * 1.15} fill={c} />
      <path d={`M${f1(x - r * 0.12)} ${f1(y + r * 1.13)}l${f1(r * 0.12)} ${f1(r * 0.16)}l${f1(r * 0.12)} ${f1(-r * 0.16)}Z`} fill={c} />
      <ellipse cx={x - r * 0.35} cy={y - r * 0.45} rx={r * 0.18} ry={r * 0.3} fill="#FFFFFF" opacity={0.45} transform={`rotate(-25 ${f1(x - r * 0.35)} ${f1(y - r * 0.45)})`} />
    </g>
  );
}
function Burst({ x, y, r, c, n = 14 }: { x: number; y: number; r: number; c: string; n?: number }) {
  return (
    <g stroke={c} strokeLinecap="round" strokeWidth={Math.max(1.2, r * 0.045)}>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2, r0 = r * 0.28, r1 = r * (i % 2 ? 0.78 : 1);
        return <line key={i} x1={f1(x + Math.cos(a) * r0)} y1={f1(y + Math.sin(a) * r0)} x2={f1(x + Math.cos(a) * r1)} y2={f1(y + Math.sin(a) * r1)} />;
      })}
      {Array.from({ length: n }, (_, i) => {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        return <circle key={`d${i}`} cx={f1(x + Math.cos(a) * r * 1.08)} cy={f1(y + Math.sin(a) * r * 1.08)} r={r * 0.04} fill={c} stroke="none" />;
      })}
    </g>
  );
}
function Star({ x, y, r, c, rot = 0 }: { x: number; y: number; r: number; c: string; rot?: number }) {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; return `${f1(x + Math.cos(a) * rr)},${f1(y + Math.sin(a) * rr)}`; }).join(' ');
  return <polygon points={pts} fill={c} transform={rot ? `rotate(${rot} ${f1(x)} ${f1(y)})` : undefined} />;
}
function Laurel({ x, y, len, c, flip }: { x: number; y: number; len: number; c: string; flip?: boolean }) {
  const n = 7, leaves: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1), a = -Math.PI * 0.62 + t * Math.PI * 0.62;
    const px = Math.cos(a) * len * 0.5, py = Math.sin(a) * len * 0.5 + len * 0.5;
    const s = len * (0.2 - t * 0.05);
    leaves.push(<Leaf key={`l${i}`} x={px} y={py} s={s} rot={(a * 180) / Math.PI - 50} c={c} />);
    leaves.push(<Leaf key={`r${i}`} x={px} y={py} s={s * 0.9} rot={(a * 180) / Math.PI + 70} c={c} />);
  }
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${flip ? -1 : 1} 1)`}>
      <path d={`M${f1(len * 0.5 * Math.cos(-Math.PI * 0.62))} ${f1(len * 0.5 * Math.sin(-Math.PI * 0.62) + len * 0.5)}A${f1(len * 0.5)} ${f1(len * 0.5)} 0 0 1 ${f1(len * 0.5)} ${f1(len * 0.5)}`} fill="none" stroke={c} strokeWidth={Math.max(1.2, len * 0.018)} />
      {leaves}
    </g>
  );
}
function GradCap({ x, y, s, c, tassel }: { x: number; y: number; s: number; c: string; tassel: string }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(-14)`}>
      <path d={`M${-s * 0.32} ${s * 0.08}V${s * 0.32}Q0 ${s * 0.46} ${s * 0.32} ${s * 0.32}V${s * 0.08}Z`} fill={c} />
      <path d={`M${-s * 0.6} 0L0 ${-s * 0.26}L${s * 0.6} 0L0 ${s * 0.26}Z`} fill={c} />
      <path d={`M0 0L${s * 0.48} ${s * 0.12}V${s * 0.46}`} fill="none" stroke={tassel} strokeWidth={s * 0.04} />
      <circle cx={s * 0.48} cy={s * 0.5} r={s * 0.06} fill={tassel} />
    </g>
  );
}

/** trang trí quanh ô cửa sổ / góc khung (phần lấn vào ô cửa sổ bị mask cắt đi như khung thật) */
function Decor({ spec, g, p }: { spec: SfSpec; g: SfGeom; p: SfPalette }) {
  const { win } = g, mn = Math.min(g.W, g.H);
  reseed(311 + g.W + spec.deco.length);
  const out: ReactNode[] = [];
  const wx0 = win.x, wy0 = win.y, wx1 = win.x + win.w, wy1 = win.y + win.h;
  const social = spec.layout === 'social';
  // cụm trang trí ở 2 góc chéo ô cửa sổ, đẩy ra ngoài 1 chút để phần lớn nằm trên viền (phần lấn vào ô bị cắt đi);
  // bố cục MXH: dải trên/dưới có chữ + icon → đặt cụm ở giữa 2 cạnh bên
  const cornerA = social
    ? [{ x: wx0 - mn * 0.01, y: wy0 + win.h * 0.38 }, { x: wx1 + mn * 0.01, y: wy0 + win.h * 0.62 }]
    : spec.window === 'circle' || spec.window === 'heart'
      ? [{ x: wx0 - mn * 0.04, y: wy0 + win.h * 0.22 }, { x: wx1 + mn * 0.04, y: wy1 - win.h * 0.18 }]
      : [{ x: wx0 - mn * 0.018, y: wy0 - mn * 0.012 }, { x: wx1 + mn * 0.018, y: wy1 + mn * 0.012 }];
  if (spec.deco === 'flowers') {
    const r = mn * (social ? 0.045 : 0.062);
    cornerA.forEach((c, k) => {
      const sgn = k ? -1 : 1;
      for (let i = 0; i < 6; i++) out.push(<Leaf key={`lf${k}${i}`} x={c.x} y={c.y} s={r * 2.2} rot={(k ? 180 : 0) + i * 22 - 30 + rnd() * 10} c={p.leaf} />);
      out.push(<Flower key={`f${k}a`} x={c.x} y={c.y} r={r * 1.35} c={p.deco[0]} center={p.accent2} rot={rnd() * 40} />);
      out.push(<Flower key={`f${k}b`} x={c.x + sgn * r * 1.9} y={c.y - sgn * r * 0.5} r={r * 0.95} c={p.deco[1]} center={p.accent2} rot={rnd() * 40} />);
      out.push(<Flower key={`f${k}c`} x={c.x - sgn * r * 0.4} y={c.y + sgn * r * 1.8} r={r * 0.85} c={p.deco[2]} center={p.accent2} rot={rnd() * 40} />);
      for (let i = 0; i < 4; i++) out.push(<circle key={`bd${k}${i}`} cx={c.x + sgn * (r * 2.6 + rnd() * r)} cy={c.y + sgn * (r * 0.6 + rnd() * r * 1.4)} r={r * 0.16} fill={p.deco[1]} />);
    });
  } else if (spec.deco === 'balloons') {
    const r = mn * 0.06;
    const groups = g.lobes.length || social ? [] : [{ x: wx0 + r * 0.6, y: wy0 + r * 0.4 }, { x: wx1 - r * 0.6, y: wy0 + r * 0.4 }];
    groups.forEach((c, k) => {
      const sgn = k ? -1 : 1;
      out.push(<Balloon key={`b${k}1`} x={c.x} y={c.y} r={r} c={p.deco[k % 4]} stringLen={r * 2.4} ink={p.ink} />);
      out.push(<Balloon key={`b${k}2`} x={c.x + sgn * r * 1.5} y={c.y + r * 0.9} r={r * 0.82} c={p.deco[(k + 1) % 4]} stringLen={r * 2} ink={p.ink} />);
      out.push(<Balloon key={`b${k}3`} x={c.x - sgn * r * 0.2} y={c.y + r * 2.1} r={r * 0.7} c={p.deco[(k + 2) % 4]} stringLen={r * 1.6} ink={p.ink} />);
    });
    // giấy kim tuyến lấm tấm trên viền
    for (let i = 0; i < 26; i++) {
      const px = g.inner.x + rnd() * g.inner.w, py = g.inner.y + rnd() * g.inner.h;
      if (px > wx0 - 8 && px < wx1 + 8 && py > wy0 - 8 && py < wy1 + 8) continue;
      if (py > g.bottom.y - 4 || py < g.top.y + g.top.h) continue;
      out.push(<rect key={`cf${i}`} x={f1(px)} y={f1(py)} width={mn * 0.012} height={mn * 0.026} fill={p.deco[i % 4]} transform={`rotate(${f1(rnd() * 180)} ${f1(px)} ${f1(py)})`} />);
    }
  } else if (spec.deco === 'fireworks') {
    const r = mn * 0.075;
    const pts = [{ x: g.inner.x + r * 1.2, y: g.inner.y + r * 1.2 }, { x: g.inner.x + g.inner.w - r * 1.2, y: g.inner.y + r * 1.2 },
      { x: g.inner.x + r * 1.9, y: g.inner.y + r * 3 }, { x: g.inner.x + g.inner.w - r * 1.9, y: g.inner.y + r * 3.1 }];
    pts.forEach((c, i) => out.push(<Burst key={`fw${i}`} x={c.x} y={c.y} r={r * (i < 2 ? 1 : 0.62)} c={p.deco[i % 3]} />));
    for (let i = 0; i < 34; i++) {
      const side = i % 2, px = side ? g.inner.x + g.inner.w - rnd() * (g.W * 0.12) : g.inner.x + rnd() * (g.W * 0.12);
      const py = g.inner.y + rnd() * g.inner.h;
      if (px > wx0 - 6 && px < wx1 + 6 && py > wy0 - 6 && py < wy1 + 6) continue;
      if (py > g.bottom.y - 4) continue;
      out.push(<circle key={`dt${i}`} cx={f1(px)} cy={f1(py)} r={mn * 0.006 * (1 + rnd())} fill={p.deco[i % 4]} />);
    }
  } else if (spec.deco === 'confetti' || spec.deco === 'stars') {
    const star = spec.deco === 'stars';
    for (let i = 0; i < 70; i++) {
      const px = g.inner.x + rnd() * g.inner.w, py = g.inner.y + rnd() * g.inner.h;
      if (px > wx0 - 10 && px < wx1 + 10 && py > wy0 - 10 && py < wy1 + 10) continue;
      // tránh hai dải chữ (giữa)
      const inText = (b: Box) => py > b.y - 8 && py < b.y + b.h + 8 && px > b.x - 8 && px < b.x + b.w + 8;
      if (inText(g.bottom) || (g.top.h > mn * 0.08 && inText(g.top))) continue;
      const c = p.deco[i % p.deco.length];
      if (star) out.push(<Star key={`st${i}`} x={px} y={py} r={mn * (0.012 + rnd() * 0.018)} c={c} rot={rnd() * 40} />);
      else if (i % 3 === 0) out.push(<circle key={`cf${i}`} cx={f1(px)} cy={f1(py)} r={mn * 0.009} fill={c} />);
      else out.push(<rect key={`cf${i}`} x={f1(px)} y={f1(py)} width={mn * 0.012} height={mn * 0.028} rx={mn * 0.003} fill={c} transform={`rotate(${f1(rnd() * 180)} ${f1(px)} ${f1(py)})`} />);
    }
    if (star) [0, 1].forEach((k) => out.push(<Star key={`bs${k}`} x={k ? wx1 - mn * 0.01 : wx0 + mn * 0.01} y={k ? wy1 - mn * 0.02 : wy0 + mn * 0.02} r={mn * 0.055} c={p.accent2} rot={k * 12} />));
  } else if (spec.deco === 'laurel') {
    const len = Math.min(g.bottom.h * 1.05, g.W * 0.17);
    const by = g.bottom.y + (g.bottom.h - len) / 2;
    out.push(<Laurel key="la" x={g.bottom.x + len * 0.05} y={by} len={len} c={p.accent} />);
    out.push(<Laurel key="lb" x={g.bottom.x + g.bottom.w - len * 0.05} y={by} len={len} c={p.accent} flip />);
    if (spec.purpose === 'grad') out.push(<GradCap key="cap" x={wx0 + mn * 0.02} y={wy0 + mn * 0.015} s={mn * 0.13} c={p.dark ? p.accent : p.ink} tassel={p.dark ? p.ink : p.accent} />);
  }
  return <g id="Decor">{out}</g>;
}

// ---------- icon mạng xã hội chung chung (không phải logo thương hiệu) ----------
function SocialIcons({ x, y, s, c, heart }: { x: number; y: number; s: number; c: string; heart: string }) {
  const sw = s * 0.09;
  return (
    <g fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
      <path d={`M${x + s * 0.5} ${y + s * 0.9}C${x - s * 0.05} ${y + s * 0.5} ${x - s * 0.02} ${y + s * 0.05} ${x + s * 0.28} ${y + s * 0.08}C${x + s * 0.4} ${y + s * 0.09} ${x + s * 0.47} ${y + s * 0.18} ${x + s * 0.5} ${y + s * 0.25}C${x + s * 0.53} ${y + s * 0.18} ${x + s * 0.6} ${y + s * 0.09} ${x + s * 0.72} ${y + s * 0.08}C${x + s * 1.02} ${y + s * 0.05} ${x + s * 1.05} ${y + s * 0.5} ${x + s * 0.5} ${y + s * 0.9}Z`} fill={heart} stroke={heart} />
      <path d={`M${x + s * 1.9} ${y + s * 0.85}L${x + s * 1.7} ${y + s * 0.74}A${s * 0.42} ${s * 0.42} 0 1 1 ${x + s * 1.86} ${y + s * 0.62}Z`} />
      <path d={`M${x + s * 2.35} ${y + s * 0.12}L${x + s * 3.25} ${y + s * 0.12}L${x + s * 2.72} ${y + s * 0.9}L${x + s * 2.62} ${y + s * 0.48}Z M${x + s * 2.62} ${y + s * 0.48}L${x + s * 3.25} ${y + s * 0.12}`} />
    </g>
  );
}
function Bookmark({ x, y, s, c }: { x: number; y: number; s: number; c: string }) {
  return <path d={`M${x} ${y + s * 0.08}H${x + s * 0.64}V${y + s * 0.92}L${x + s * 0.32} ${y + s * 0.66}L${x} ${y + s * 0.92}Z`} fill="none" stroke={c} strokeWidth={s * 0.09} strokeLinejoin="round" />;
}

const initials = (t: string) => {
  const w = (t || '').replace(/[&@#]/g, ' ').split(/\s+/).filter((x) => x && !/^(bé|happy|year|end|party|tốt|nghiệp|mừng|khai|trương)$/i.test(x));
  return (w.length >= 2 ? w[0][0] + w[w.length - 1][0] : (w[0] || 'M').slice(0, 2)).toUpperCase();
};
const handleOf = (d: SfData) => {
  const h = (d.hashtag || '').replace(/^#/, '').trim();
  return h ? h.toLowerCase() : 'mivy.studio';
};

// ---------- ghép thiết kế ----------
export interface SfRender { g: SfGeom; art: ReactNode }
export function composeSf(spec: SfSpec, data: SfData, logo?: string, uid = 'sf'): SfRender {
  const g = sfGeom(spec), p = sfPalette(spec.palette), fd = sfFont(spec.font), sc = sfScript(spec.script);
  const mn = Math.min(g.W, g.H);
  const lobeCols = [p.deco[0], p.accent, p.deco[1], p.accent2].filter((c) => c.toUpperCase() !== '#FFFFFF' && c.toUpperCase() !== p.bg.toUpperCase());
  const bg = (
    <g id="Nen">
      <rect x={-20} y={-20} width={g.W + 40} height={g.H + 40} fill={p.bg} />
      {p.dark
        ? <rect x={-20} y={-20} width={g.W + 40} height={g.H + 40} fill={`url(#${uid}-rg)`} />
        : <rect x={-20} y={-20} width={g.W + 40} height={g.H + 40} fill={`url(#${uid}-dots)`} />}
      {g.lobes.map((l, i) => <g key={`lb${i}`}>
        <ellipse cx={l.cx} cy={l.cy} rx={l.r} ry={l.r} fill={lobeCols[i % lobeCols.length]} />
        <ellipse cx={l.cx - l.r * 0.35} cy={l.cy - l.r * 0.4} rx={l.r * 0.18} ry={l.r * 0.3} fill="#FFFFFF" opacity={0.45} transform={`rotate(-25 ${f1(l.cx - l.r * 0.35)} ${f1(l.cy - l.r * 0.4)})`} />
      </g>)}
      {/* viền nét mảnh quanh ô cửa sổ (in) */}
      <path d={g.windowD} fill="none" stroke={p.accent} strokeWidth={mn * 0.012} transform="" opacity={0.9} />
    </g>
  );
  const defs = (
    <>
      <radialGradient id={`${uid}-rg`} cx="50%" cy="35%" r="75%">
        <stop offset="0" stopColor={p.bg2} /><stop offset="1" stopColor={p.bg} />
      </radialGradient>
      <pattern id={`${uid}-dots`} width={mn * 0.05} height={mn * 0.05} patternUnits="userSpaceOnUse">
        <circle cx={mn * 0.025} cy={mn * 0.025} r={mn * 0.0045} fill={p.bg2} />
      </pattern>
      {logo && <clipPath id={`${uid}-av`}><circle cx={0} cy={0} r={1} /></clipPath>}
    </>
  );

  // chữ
  const txt: ReactNode[] = [];
  const { top, bottom } = g;
  const textW = (b: Box, decoSides: boolean) => b.w * (decoSides ? 0.68 : 0.9);
  const lawSides = spec.deco === 'laurel';
  // logo trong dải dưới (không áp dụng bố cục social: logo vào avatar)
  let bBox: Box = { x: bottom.x + (bottom.w - textW(bottom, lawSides)) / 2, y: bottom.y + bottom.h * 0.08, w: textW(bottom, lawSides), h: bottom.h * 0.84 };
  if (logo && spec.layout !== 'social') {
    const ls = Math.min(bottom.h * 0.66, bottom.w * 0.18);
    const lx = bottom.x + bottom.w - ls - bottom.w * (lawSides ? 0.17 : 0.02), ly = bottom.y + (bottom.h - ls) / 2;
    txt.push(<image key="logo" href={logo} x={f1(lx)} y={f1(ly)} width={f1(ls)} height={f1(ls)} preserveAspectRatio="xMidYMid meet" data-role="logo" />);
    const right = lx - bottom.w * 0.02, left = bottom.x + bottom.w * (lawSides ? 0.17 : 0.02) + ls * 0.25;
    bBox = { x: left, y: bBox.y, w: right - left, h: bBox.h };
  }
  const info = [data.date, data.hashtag].map((x) => (x || '').trim()).filter(Boolean).join('  ·  ');
  const kick: Ln = { text: data.kicker || '', family: sc.family, weight: sc.weight, max: mn * 0.13, min: mn * 0.045, fill: p.accent, role: 'kicker' };
  const title: Ln = { text: data.title || '', family: fd.family, weight: fd.weight, max: mn * 0.12, min: mn * 0.05, fill: p.ink, role: 'title' };
  const infoL: Ln = { text: info, family: BODY, weight: 600, max: mn * 0.045, min: mn * 0.022, fill: p.sub, role: 'info' };
  const extraL: Ln = { text: data.extra || '', family: BODY, weight: 600, max: mn * 0.036, min: mn * 0.02, fill: p.sub, role: 'extra' };

  if (spec.layout === 'polaroid') {
    txt.push(<Stack key="b" box={bBox} lines={[kick, title, infoL]} gapK={0.12} />);
  } else if (spec.layout === 'banner') {
    const tb: Box = { x: top.x + top.w * 0.08, y: top.y + top.h * 0.1, w: top.w * 0.84, h: top.h * 0.84 };
    txt.push(<Stack key="t" box={tb} lines={[kick, { ...title, max: mn * 0.12 }]} gapK={0.06} />);
    txt.push(<Stack key="b" box={bBox} lines={[{ ...infoL, max: mn * 0.045 }, extraL]} gapK={0.2} />);
  } else if (spec.layout === 'center') {
    const tb: Box = { x: top.x + top.w * 0.12, y: top.y + top.h * 0.12, w: top.w * 0.76, h: top.h * 0.8 };
    txt.push(<Stack key="t" box={tb} lines={[{ ...kick, max: mn * 0.11 }]} />);
    txt.push(<Stack key="b" box={bBox} lines={[title, infoL]} gapK={0.14} />);
  } else {
    // bài đăng MXH: avatar + tên tài khoản trên; hàng icon + lượt thích + chú thích dưới
    const av = top.h * 0.56, ax = top.x + av * 0.6, ay = top.y + top.h / 2;
    txt.push(<circle key="avr" cx={ax} cy={ay} r={av / 2 + mn * 0.006} fill="none" stroke={p.accent} strokeWidth={mn * 0.006} />);
    if (logo) {
      txt.push(<g key="av" transform={`translate(${f1(ax)} ${f1(ay)}) scale(${f1(av / 2)})`}><image href={logo} x={-1} y={-1} width={2} height={2} clipPath={`url(#${uid}-av)`} preserveAspectRatio="xMidYMid slice" data-role="logo" /></g>);
    } else {
      txt.push(<circle key="avc" cx={ax} cy={ay} r={av / 2} fill={p.accent} />);
      txt.push(<Stack key="avt" box={{ x: ax - av * 0.36, y: ay - av * 0.3, w: av * 0.72, h: av * 0.6 }} lines={[{ text: initials(data.title || ''), family: fd.family, weight: fd.weight, max: av * 0.42, min: av * 0.2, fill: p.dark ? p.bg : '#FFFFFF', role: 'avatar' }]} />);
    }
    const hx = ax + av * 0.75;
    txt.push(<Stack key="h" anchor="start" box={{ x: hx, y: top.y + top.h * 0.14, w: top.x + top.w - hx - top.h * 0.9, h: top.h * 0.72 }}
      lines={[{ text: handleOf(data), family: BODY, weight: 800, max: top.h * 0.3, min: mn * 0.022, fill: p.ink, role: 'handle' }, { ...extraL, max: top.h * 0.2 }]} gapK={0.08} />);
    // ••• bên phải
    [0, 1, 2].forEach((i) => txt.push(<circle key={`dot${i}`} cx={top.x + top.w - top.h * 0.2 - i * top.h * 0.16} cy={ay} r={top.h * 0.045} fill={p.ink} />));
    const isz = bottom.h * 0.2, iy = bottom.y + bottom.h * 0.1;
    txt.push(<SocialIcons key="ic" x={bottom.x} y={iy} s={isz} c={p.ink} heart={p.accent} />);
    txt.push(<Bookmark key="bm" x={bottom.x + bottom.w - isz * 0.64} y={iy} s={isz} c={p.ink} />);
    const cb: Box = { x: bottom.x, y: iy + isz * 1.25, w: bottom.w, h: bottom.y + bottom.h - (iy + isz * 1.25) - bottom.h * 0.04 };
    txt.push(<Stack key="cap" anchor="start" box={cb} gapK={0.1}
      lines={[{ text: `2.026 lượt thích · ${data.kicker || ''}`.replace(/ · $/, ''), family: BODY, weight: 800, max: mn * 0.034, min: mn * 0.02, fill: p.ink, role: 'likes' },
        { ...title, max: mn * 0.07, min: mn * 0.03 }, { ...infoL, max: mn * 0.032 }]} />);
  }
  const art = (
    <>
      <defs>{defs}</defs>
      {bg}
      <Decor spec={spec} g={g} p={p} />
      <g id="Text">{txt}</g>
    </>
  );
  return { g, art };
}

/**
 * Khung check-in. mode:
 *  - 'preview': đúng khổ thành phẩm, ngoài viền + ô cửa sổ trong suốt (xem trước, texture 3D)
 *  - 'print': có lề xén 3mm (nền tràn ra ngoài đường cắt + lấn vào ô cửa sổ), lớp In + CutContour (viền + ô cửa sổ), khổ mm thật
 * cut = vẽ nét đứt đường cắt lên bản xem trước.
 */
export function SelfieFrameSvg({ spec, data, logo, mode = 'preview', cut = false, style }: {
  spec: SfSpec; data: SfData; logo?: string; mode?: 'preview' | 'print'; cut?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const { g, art } = composeSf(spec, data, logo, uid);
  const print = mode === 'print';
  const b = print ? SF_BLEED_MM : 0;
  const vb = `${-b} ${-b} ${g.W + b * 2} ${g.H + b * 2}`;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" style={style}
      width={print ? `${g.W + b * 2}mm` : undefined} height={print ? `${g.H + b * 2}mm` : undefined}
      data-w={g.W} data-h={g.H} data-window={`${f1(g.win.x)},${f1(g.win.y)},${f1(g.win.w)},${f1(g.win.h)}`}>
      <defs>
        <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-b - 20} y={-b - 20} width={g.W + b * 2 + 40} height={g.H + b * 2 + 40}>
          <path d={g.outline} fill="#FFFFFF" stroke={print ? '#FFFFFF' : 'none'} strokeWidth={print ? b * 2 : 0} strokeLinejoin="round" />
          <path d={g.windowD} fill="#000000" stroke={print ? '#FFFFFF' : 'none'} strokeWidth={print ? b * 2 : 0} strokeLinejoin="round" />
        </mask>
      </defs>
      <g id="In" mask={`url(#${uid}-m)`}>{art}</g>
      {print && (
        <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={0.25}>
          <title>CutContour</title>
          <path d={g.outline} data-cut="outline" />
          <path d={g.windowD} data-cut="window" />
        </g>
      )}
      {cut && !print && (
        <g fill="none" stroke={CUTCONTOUR} strokeWidth={Math.min(g.W, g.H) * 0.004} strokeDasharray={`${Math.min(g.W, g.H) * 0.016} ${Math.min(g.W, g.H) * 0.01}`} id="CutPreview">
          <path d={g.outline} /><path d={g.windowD} />
        </g>
      )}
    </svg>
  );
}
