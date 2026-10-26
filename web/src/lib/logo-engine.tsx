// Logo engine — sinh logo HOÀN CHỈNH bằng code (SVG) từ "công thức" thiết kế sẵn: kiểu × font × màu × biểu tượng.
// Không gọi AI realtime. User nhập tên → xem lưới logo → chọn bằng mắt → tinh chỉnh nhẹ.

import { useEffect, useId, useState } from 'react';
import { COLOR_PRESETS, Palette } from '@/lib/brand-presets';
import { iconById } from '@/lib/logo-icons';
import { artInfo, artsForIndustry } from '@/lib/logo-art';

export type Gu = 'toi-gian' | 'sang' | 'de-thuong' | 'manh-me';
export const LOGO_GUS: { id: Gu; name: string }[] = [
  { id: 'toi-gian', name: 'Tối giản' }, { id: 'sang', name: 'Sang trọng' },
  { id: 'de-thuong', name: 'Dễ thương' }, { id: 'manh-me', name: 'Mạnh mẽ' },
];

// Toàn bộ font dưới đây ĐÃ KIỂM có bộ dấu tiếng Việt trên Google Fonts.
export interface LogoFont { id: string; family: string; weight: number; gu: Gu[]; script?: boolean }
export const LOGO_FONTS: LogoFont[] = [
  { id: 'playfair', family: 'Playfair Display', weight: 800, gu: ['sang'] },
  { id: 'cormorant', family: 'Cormorant Garamond', weight: 700, gu: ['sang'] },
  { id: 'prata', family: 'Prata', weight: 400, gu: ['sang'] },
  { id: 'lora', family: 'Lora', weight: 700, gu: ['sang', 'toi-gian'] },
  { id: 'notoserif', family: 'Noto Serif Display', weight: 700, gu: ['sang'] },
  { id: 'bevietnam', family: 'Be Vietnam Pro', weight: 800, gu: ['toi-gian', 'manh-me'] },
  { id: 'montserrat', family: 'Montserrat', weight: 800, gu: ['toi-gian', 'manh-me'] },
  { id: 'josefin', family: 'Josefin Sans', weight: 700, gu: ['toi-gian', 'sang'] },
  { id: 'lexend', family: 'Lexend', weight: 700, gu: ['toi-gian'] },
  { id: 'quicksand', family: 'Quicksand', weight: 700, gu: ['de-thuong', 'toi-gian'] },
  { id: 'nunito', family: 'Nunito', weight: 900, gu: ['de-thuong'] },
  { id: 'baloo', family: 'Baloo 2', weight: 800, gu: ['de-thuong'] },
  { id: 'oswald', family: 'Oswald', weight: 700, gu: ['manh-me'] },
  { id: 'anton', family: 'Anton', weight: 400, gu: ['manh-me'] },
  { id: 'barlow', family: 'Barlow Condensed', weight: 800, gu: ['manh-me'] },
  { id: 'pacifico', family: 'Pacifico', weight: 400, gu: ['de-thuong'], script: true },
  { id: 'dancing', family: 'Dancing Script', weight: 700, gu: ['sang', 'de-thuong'], script: true },
  { id: 'lobster', family: 'Lobster', weight: 400, gu: ['de-thuong', 'manh-me'], script: true },
  { id: 'patrick', family: 'Patrick Hand', weight: 400, gu: ['de-thuong'], script: true },
  // Bổ sung — đều có subset tiếng Việt (đã kiểm), tránh tofu
  { id: 'jakarta', family: 'Plus Jakarta Sans', weight: 800, gu: ['toi-gian', 'manh-me'] },
  { id: 'manrope', family: 'Manrope', weight: 800, gu: ['toi-gian'] },
  { id: 'spacegrotesk', family: 'Space Grotesk', weight: 700, gu: ['toi-gian', 'manh-me'] },
  { id: 'unbounded', family: 'Unbounded', weight: 800, gu: ['manh-me'] },
  { id: 'bricolage', family: 'Bricolage Grotesque', weight: 800, gu: ['sang', 'toi-gian'] },
  { id: 'epilogue', family: 'Epilogue', weight: 800, gu: ['toi-gian'] },
  { id: 'fraunces', family: 'Fraunces', weight: 700, gu: ['sang'] },
  { id: 'bitter', family: 'Bitter', weight: 800, gu: ['sang', 'toi-gian'] },
  { id: 'merriweather', family: 'Merriweather', weight: 900, gu: ['sang'] },
  { id: 'grandstander', family: 'Grandstander', weight: 800, gu: ['de-thuong'] },
];
export const fontById = (id: string) => LOGO_FONTS.find((f) => f.id === id) || LOGO_FONTS[5];
const SANS: LogoFont = { id: 'slogan', family: 'Be Vietnam Pro', weight: 600, gu: [] };

// CSS @import cho 1 nhóm font (xuất ảnh chỉ nhúng đúng font đang dùng cho nhẹ).
export function logoFontCss(ids: string[] = LOGO_FONTS.map((f) => f.id)): string {
  const fams = new Map<string, Set<number>>([['Be Vietnam Pro', new Set([500, 600])]]);
  for (const f of ids.map(fontById)) {
    if (!fams.has(f.family)) fams.set(f.family, new Set());
    fams.get(f.family)!.add(f.weight);
  }
  const q = Array.from(fams.entries()).map(([fam, ws]) => {
    const w = Array.from(ws).sort((a, b) => a - b);
    return `family=${fam.replace(/ /g, '+')}${w.length === 1 && w[0] === 400 ? '' : `:wght@${w.join(';')}`}`;
  }).join('&');
  return `@import url('https://fonts.googleapis.com/css2?${q}&display=swap');`;
}

const PALETTE_BY_GU: Record<Gu, string[]> = {
  'toi-gian': ['Trắng đen', 'Xanh dương', 'Đen tối giản', 'Tím sang', 'Xanh mint'],
  sang: ['Vàng gold', 'Nâu ấm', 'Đen tối giản', 'Tím sang', 'Trắng đen'],
  'de-thuong': ['Hồng ngọt', 'Pastel dịu', 'Cam năng động', 'Xanh mint'],
  'manh-me': ['Đỏ nhiệt', 'Cam năng động', 'Xanh dương', 'Đen tối giản'],
};
// Bỏ các palette xanh lá khỏi gợi ý mặc định (anh không thích xanh lá mặc định).
export const LOGO_PALETTES: Palette[] = COLOR_PRESETS.filter((p) => !/xanh (lá|ngọc)/i.test(p.name));

export const LOGO_INDUSTRIES: { id: string; name: string; icons: string[] }[] = [
  { id: 'retail', name: 'Bán lẻ / Tổng hợp', icons: ['store', 'bag', 'cart', 'gift', 'star', 'sparkles'] },
  { id: 'fnb', name: 'Ăn uống / Quán', icons: ['coffee', 'utensils', 'cake', 'icecream', 'burger', 'pizza'] },
  { id: 'fashion', name: 'Thời trang', icons: ['shirt', 'scissors', 'gem', 'crown', 'sparkles', 'bag'] },
  { id: 'beauty', name: 'Mỹ phẩm / Spa', icons: ['flower', 'droplets', 'leaf', 'sparkles', 'heart', 'gem'] },
  { id: 'tech', name: 'Công nghệ', icons: ['laptop', 'code', 'zap', 'rocket', 'bulb', 'phone'] },
  { id: 'kids', name: 'Mẹ & bé', icons: ['baby', 'heart', 'star', 'gift', 'sun', 'moon'] },
  { id: 'pet', name: 'Thú cưng', icons: ['dog', 'cat', 'heart', 'home', 'star', 'leaf'] },
  { id: 'travel', name: 'Du lịch', icons: ['plane', 'map', 'mountain', 'sun', 'waves', 'globe'] },
  { id: 'fitness', name: 'Thể thao / Sức khoẻ', icons: ['dumbbell', 'bike', 'health', 'flame', 'zap', 'heart'] },
  { id: 'home', name: 'Nhà cửa / Nội thất', icons: ['home', 'building', 'tree', 'sprout', 'bulb', 'wrench'] },
];

export type LogoKind = 'word-dot' | 'word-caps' | 'mono-h' | 'mono-stack' | 'badge' | 'icon-h' | 'icon-stack' | 'illus';
export const LOGO_KINDS: { id: LogoKind; name: string }[] = [
  { id: 'word-dot', name: 'Chữ + điểm nhấn' }, { id: 'word-caps', name: 'Chữ in hoa' },
  { id: 'mono-h', name: 'Monogram ngang' }, { id: 'mono-stack', name: 'Monogram đứng' },
  { id: 'badge', name: 'Huy hiệu' }, { id: 'icon-h', name: 'Icon ngang' }, { id: 'icon-stack', name: 'Icon đứng' },
  { id: 'illus', name: 'Hình minh hoạ' },
];
export type Shape = 'circle' | 'ring' | 'square' | 'diamond';
export const SHAPES: { id: Shape; name: string }[] = [
  { id: 'circle', name: 'Tròn đặc' }, { id: 'ring', name: 'Vòng kép' }, { id: 'square', name: 'Vuông bo' }, { id: 'diamond', name: 'Kim cương' },
];
export type Accent = 'dot' | 'swoosh' | 'spark';
export const ACCENTS: { id: Accent; name: string }[] = [{ id: 'dot', name: 'Chấm' }, { id: 'swoosh', name: 'Gạch cong' }, { id: 'spark', name: 'Ngôi sao' }];
export const usesIcon = (k: LogoKind) => k === 'icon-h' || k === 'icon-stack' || k === 'badge';
export const usesShape = (k: LogoKind) => k !== 'word-dot' && k !== 'word-caps' && k !== 'illus';

export interface LogoSpec { id: string; kind: LogoKind; fontId: string; palette: Palette; icon: string; shape: Shape; accent: Accent; art?: string }

// ---------- sinh lưới gợi ý (seed cố định → bấm "xem bộ khác" là đổi seed) ----------
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle<T>(arr: T[], r: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export function generateLogos(opts: { gus: Gu[]; industry: string; seed: number; count?: number }): LogoSpec[] {
  const r = rng(opts.seed * 9973 + 17);
  const gus = opts.gus.length ? opts.gus : LOGO_GUS.map((g) => g.id);
  const fonts = shuffle(LOGO_FONTS.filter((f) => f.gu.some((g) => gus.includes(g))), r);
  const names = Array.from(new Set(gus.flatMap((g) => PALETTE_BY_GU[g])));
  const palettes = shuffle(LOGO_PALETTES.filter((p) => names.includes(p.name)), r);
  const icons = (LOGO_INDUSTRIES.find((i) => i.id === opts.industry) || LOGO_INDUSTRIES[0]).icons;
  const kinds = shuffle(LOGO_KINDS.map((k) => k.id).filter((k) => k !== 'illus'), r);

  const out: LogoSpec[] = [];
  let fi = 0;
  for (let i = 0; i < (opts.count ?? 24); i++) {
    const kind = kinds[i % kinds.length];
    let font = fonts[fi++ % fonts.length];
    // chữ viết tay không hợp chữ in hoa giãn cách / chữ chạy vòng huy hiệu
    for (let t = 0; t < fonts.length && font.script && (kind === 'word-caps' || kind === 'badge'); t++) font = fonts[fi++ % fonts.length];
    out.push({
      id: `${opts.seed}-${i}`, kind, fontId: font.id,
      palette: palettes[(i + Math.floor(i / palettes.length)) % palettes.length],
      icon: icons[Math.floor(r() * icons.length)],
      shape: SHAPES[Math.floor(r() * SHAPES.length)].id,
      accent: ACCENTS[Math.floor(r() * ACCENTS.length)].id,
    });
  }
  return out;
}

// Logo hình minh hoạ: mỗi hình trong kho của ngành 1 gợi ý (font + màu xoay vòng theo seed).
export function generateIllusLogos(opts: { gus: Gu[]; industry: string; seed: number }): LogoSpec[] {
  const r = rng(opts.seed * 7919 + 3);
  const gus = opts.gus.length ? opts.gus : LOGO_GUS.map((g) => g.id);
  const fonts = shuffle(LOGO_FONTS.filter((f) => !f.script && f.gu.some((g) => gus.includes(g))), r);
  const names = Array.from(new Set(gus.flatMap((g) => PALETTE_BY_GU[g])));
  const palettes = shuffle(LOGO_PALETTES.filter((p) => names.includes(p.name)), r);
  return artsForIndustry(opts.industry).map((art, i) => ({
    id: `illus-${opts.seed}-${i}`, kind: 'illus' as const, fontId: fonts[i % fonts.length].id, palette: palettes[i % palettes.length],
    icon: 'store', shape: 'circle' as const, accent: 'dot' as const, art,
  }));
}

// Nhóm kiểu logo để chia lưới gợi ý cho dễ nhìn
export const LOGO_GROUPS: { id: string; name: string; kinds: LogoKind[] }[] = [
  { id: 'illus', name: 'Hình minh hoạ', kinds: ['illus'] },
  { id: 'icon', name: 'Icon + tên', kinds: ['icon-h', 'icon-stack'] },
  { id: 'word', name: 'Chữ', kinds: ['word-dot', 'word-caps'] },
  { id: 'mono', name: 'Chữ cái đầu (monogram)', kinds: ['mono-h', 'mono-stack'] },
  { id: 'badge', name: 'Huy hiệu', kinds: ['badge'] },
];

// ---------- đo chữ (canvas, cần font đã load) ----------
let ctx: CanvasRenderingContext2D | null = null;
interface TM { w: number; asc: number; desc: number }
function measure(text: string, f: LogoFont, size: number, lsEm = 0): TM {
  if (typeof document === 'undefined') return { w: text.length * size * 0.6, asc: size * 0.75, desc: size * 0.2 };
  ctx ||= document.createElement('canvas').getContext('2d')!;
  ctx.font = `${f.weight} ${size}px "${f.family}"`;
  const m = ctx.measureText(text || ' ');
  return { w: m.width + lsEm * size * Math.max(0, Array.from(text).length - 1), asc: m.actualBoundingBoxAscent, desc: m.actualBoundingBoxDescent };
}
// cỡ chữ lớn nhất ≤ base sao cho rộng ≤ maxW
const fit = (text: string, f: LogoFont, base: number, maxW: number, ls = 0) => Math.min(base, (base * maxW) / Math.max(1, measure(text, f, base, ls).w));

export function initials(name: string): string {
  const w = name.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return 'A';
  const pick = w.length > 1 ? Array.from(w[0])[0] + Array.from(w[1])[0] : Array.from(w[0])[0];
  return pick.toLocaleUpperCase('vi');
}

const SPARK = 'M12 0C13 7 17 11 24 12C17 13 13 17 12 24C11 17 7 13 0 12C7 11 11 7 12 0Z';
const spark = (cx: number, cy: number, s: number, fill: string, key?: string) =>
  <path key={key} d={SPARK} fill={fill} transform={`translate(${cx - s / 2},${cy - s / 2}) scale(${s / 24})`} />;

interface Colors { ink: string; accent: string; on: string; mono?: 'black' | 'white' }

function T({ x, y, text, f, size, fill, anchor = 'start', ls = 0 }: { x: number; y: number; text: string; f: LogoFont; size: number; fill: string; anchor?: 'start' | 'middle'; ls?: number }) {
  // letter-spacing của SVG cộng cả sau ký tự cuối → bù nửa khoảng khi căn giữa
  return <text x={anchor === 'middle' ? x + (ls * size) / 2 : x} y={y} fontFamily={`'${f.family}'`} fontWeight={f.weight} fontSize={size}
    letterSpacing={ls ? `${ls}em` : undefined} fill={fill} textAnchor={anchor}>{text}</text>;
}

// Khối biểu tượng (monogram hoặc icon) tâm (cx,cy) cạnh S.
function Mark({ spec, kind, name, f, cx, cy, S, c }: { spec: LogoSpec; kind: 'mono' | 'icon'; name: string; f: LogoFont; cx: number; cy: number; S: number; c: Colors }) {
  const shape = spec.shape;
  const box = shape === 'diamond' ? (
    <rect x={cx - S * 0.37} y={cy - S * 0.37} width={S * 0.74} height={S * 0.74} rx={S * 0.12} fill={c.accent} transform={`rotate(45 ${cx} ${cy})`} />
  ) : shape === 'square' ? <rect x={cx - S / 2} y={cy - S / 2} width={S} height={S} rx={S * 0.26} fill={c.ink} />
    : shape === 'ring' ? <><circle cx={cx} cy={cy} r={S / 2 - 3} fill="none" stroke={c.ink} strokeWidth={6} /><circle cx={cx} cy={cy} r={S / 2 - 15} fill="none" stroke={c.accent} strokeWidth={2.5} /></>
      : <circle cx={cx} cy={cy} r={S / 2} fill={c.accent} />;
  const fg = shape === 'ring' ? c.ink : c.on;
  if (kind === 'icon') {
    const Icon = iconById(spec.icon);
    const s = shape === 'diamond' ? S * 0.42 : S * 0.52;
    return <g>{box}<g transform={`translate(${cx - s / 2},${cy - s / 2})`}><Icon size={s} color={fg} weight={shape === 'ring' ? 'bold' : 'fill'} /></g></g>;
  }
  const ini = initials(name);
  const boxW = shape === 'diamond' ? S * 0.4 : S * 0.56;
  const m0 = measure(ini, f, 100);
  const size = 100 * Math.min(boxW / Math.max(1, m0.w), (boxW * 0.92) / Math.max(1, m0.asc + m0.desc));
  const m = measure(ini, f, size);
  return <g>{box}<T x={cx} y={cy + (m.asc - m.desc) / 2} text={ini} f={f} size={size} fill={fg} anchor="middle" /></g>;
}

// ---------- vẽ 1 logo ----------
export interface LogoRender { W: number; H: number; body: JSX.Element }

function layout(spec: LogoSpec, name: string, slogan: string, c: Colors, uid: string): LogoRender {
  const f = fontById(spec.fontId);
  const pad = 36;
  const sl = slogan.trim().toLocaleUpperCase('vi');

  if (spec.kind === 'word-dot') {
    const size = fit(name, f, 130, 880);
    const m = measure(name, f, size);
    const accW = spec.accent === 'dot' ? size * 0.3 : spec.accent === 'spark' ? size * 0.44 : 0;
    const slSize = 26, slLs = 0.28;
    const slm = sl ? measure(sl, SANS, slSize, slLs) : null;
    const W = pad * 2 + Math.max(m.w + accW, slm ? slm.w : 0);
    const base = pad + (spec.accent === 'spark' ? size * 0.18 : 0) + m.asc;
    let bottom = base + m.desc + (spec.accent === 'swoosh' ? size * 0.26 : 0);
    const x0 = (W - (m.w + accW)) / 2;
    const els: JSX.Element[] = [<T key="n" x={x0} y={base} text={name} f={f} size={size} fill={c.ink} />];
    if (spec.accent === 'dot') els.push(<circle key="a" cx={x0 + m.w + size * 0.17} cy={base - size * 0.07} r={size * 0.085} fill={c.accent} />);
    if (spec.accent === 'spark') els.push(spark(x0 + m.w + size * 0.24, base - m.asc * 0.95, size * 0.36, c.accent, 'a'));
    if (spec.accent === 'swoosh') els.push(<path key="a" d={`M${x0} ${base + size * 0.16} Q${x0 + m.w * 0.5} ${base + size * 0.32} ${x0 + m.w} ${base + size * 0.1}`} stroke={c.accent} strokeWidth={size * 0.06} fill="none" strokeLinecap="round" />);
    if (slm) {
      const y = bottom + 24 + slm.asc;
      els.push(<T key="s" x={W / 2} y={y} text={sl} f={SANS} size={slSize} fill={c.accent} anchor="middle" ls={slLs} />);
      bottom = y + slm.desc;
    }
    return { W, H: bottom + pad, body: <>{els}</> };
  }

  if (spec.kind === 'word-caps') {
    const text = name.toLocaleUpperCase('vi');
    const ls = 0.14;
    const size = fit(text, f, 112, 880, ls);
    const m = measure(text, f, size, ls);
    const slSize = 24, slLs = 0.32, line = 56, gap = 16;
    const slm = sl ? measure(sl, SANS, slSize, slLs) : null;
    const W = pad * 2 + Math.max(m.w, slm ? slm.w + 2 * (line + gap) : 240);
    const base = pad + m.asc;
    const y = base + m.desc + 30;
    const els: JSX.Element[] = [<T key="n" x={W / 2} y={base} text={text} f={f} size={size} fill={c.ink} anchor="middle" ls={ls} />];
    let bottom: number;
    if (slm) {
      const sb = y + slm.asc;
      const mid = sb - slm.asc * 0.42;
      const half = slm.w / 2;
      els.push(<T key="s" x={W / 2} y={sb} text={sl} f={SANS} size={slSize} fill={c.accent} anchor="middle" ls={slLs} />);
      els.push(<line key="l1" x1={W / 2 - half - gap - line} x2={W / 2 - half - gap} y1={mid} y2={mid} stroke={c.accent} strokeWidth={3} />);
      els.push(<line key="l2" x1={W / 2 + half + gap} x2={W / 2 + half + gap + line} y1={mid} y2={mid} stroke={c.accent} strokeWidth={3} />);
      bottom = sb + slm.desc;
    } else {
      els.push(<line key="l1" x1={W / 2 - 110} x2={W / 2 - 16} y1={y} y2={y} stroke={c.accent} strokeWidth={3} />);
      els.push(<rect key="d" x={W / 2 - 6} y={y - 6} width={12} height={12} fill={c.accent} transform={`rotate(45 ${W / 2} ${y})`} />);
      els.push(<line key="l2" x1={W / 2 + 16} x2={W / 2 + 110} y1={y} y2={y} stroke={c.accent} strokeWidth={3} />);
      bottom = y + 8;
    }
    return { W, H: bottom + pad, body: <>{els}</> };
  }

  if (spec.kind === 'badge') {
    const W = 640, cx = 320, R = 292;
    const top = name.toLocaleUpperCase('vi');
    const ls = 0.12;
    let size = 60;
    for (let k = 0; k < 2; k++) {
      const asc = measure(top, f, size, ls).asc;
      const rt = R - 34 - asc;
      size = Math.min(60, (60 * Math.PI * rt * 0.74) / Math.max(1, measure(top, f, 60, ls).w));
    }
    const mt = measure(top, f, size, ls);
    const rt = R - 34 - mt.asc;
    const bottomText = sl || `EST. ${new Date().getFullYear()}`;
    const bs = Math.min(30, (30 * Math.PI * (R - 46) * 0.6) / Math.max(1, measure(bottomText, SANS, 30, 0.2).w));
    const mb = measure(bottomText, SANS, bs, 0.2);
    const rb = R - 34 - mb.desc;
    const coreR = R * 0.42;
    const Icon = iconById(spec.icon);
    const useIcon = spec.shape === 'circle' || spec.shape === 'ring';
    return {
      W, H: W, body: <>
        <defs>
          <path id={`${uid}t`} d={`M${cx - rt} ${cx} A${rt} ${rt} 0 0 1 ${cx + rt} ${cx}`} />
          <path id={`${uid}b`} d={`M${cx - rb} ${cx} A${rb} ${rb} 0 0 0 ${cx + rb} ${cx}`} />
        </defs>
        <circle cx={cx} cy={cx} r={R} fill="none" stroke={c.ink} strokeWidth={7} />
        <circle cx={cx} cy={cx} r={R - 20} fill="none" stroke={c.accent} strokeWidth={2.5} />
        <text fontFamily={`'${f.family}'`} fontWeight={f.weight} fontSize={size} letterSpacing={`${ls}em`} fill={c.ink} textAnchor="middle">
          <textPath href={`#${uid}t`} startOffset="50%">{top}</textPath>
        </text>
        <text fontFamily={`'${SANS.family}'`} fontWeight={SANS.weight} fontSize={bs} letterSpacing="0.2em" fill={c.accent} textAnchor="middle">
          <textPath href={`#${uid}b`} startOffset="50%">{bottomText}</textPath>
        </text>
        {spark(cx - (R - 36), cx, 22, c.accent, 's1')}{spark(cx + (R - 36), cx, 22, c.accent, 's2')}
        <circle cx={cx} cy={cx} r={coreR} fill={c.accent} />
        {useIcon
          ? <g transform={`translate(${cx - coreR * 0.56},${cx - coreR * 0.56})`}><Icon size={coreR * 1.12} color={c.on} weight="fill" /></g>
          : (() => { const ini = initials(name); const m0 = measure(ini, f, 100); const s = 100 * Math.min((coreR * 1.1) / Math.max(1, m0.w), (coreR * 1.0) / Math.max(1, m0.asc + m0.desc)); const m = measure(ini, f, s); return <T x={cx} y={cx + (m.asc - m.desc) / 2} text={ini} f={f} size={s} fill={c.on} anchor="middle" />; })()}
      </>,
    };
  }

  if (spec.kind === 'illus') {
    // hình minh hoạ to phía trên, tên đậm + slogan bên dưới (kiểu logo mascot)
    const art = artInfo(spec.art || 'pets/betta');
    const S = 340; const aw = art.ratio > 1 ? S / art.ratio : S, ah = art.ratio > 1 ? S : S * art.ratio;
    const size = fit(name, f, 96, 720);
    const m = measure(name, f, size);
    const slSize = 26, slLs = 0.22;
    const slm = sl ? measure(sl, SANS, slSize, slLs) : null;
    const W = pad * 2 + Math.max(S, m.w, slm ? slm.w : 0);
    const nb = pad + ah + 26 + m.asc;
    const sb = nb + m.desc + 18 + (slm ? slm.asc : 0);
    return {
      W, H: (slm ? sb + slm.desc : nb + m.desc) + pad, body: <>
        <image href={art.href} x={(W - aw) / 2} y={pad} width={aw} height={ah} filter={c.mono ? `url(#${uid}m)` : undefined} />
        {c.mono && <defs><filter id={`${uid}m`}><feColorMatrix type="matrix" values={c.mono === 'white' ? '0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0' : '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0'} /></filter></defs>}
        <T x={W / 2} y={nb} text={name} f={f} size={size} fill={c.ink} anchor="middle" />
        {slm && <T x={W / 2} y={sb} text={sl} f={SANS} size={slSize} fill={c.accent} anchor="middle" ls={slLs} />}
      </>,
    };
  }

  // mono-* / icon-*: khối biểu tượng + tên (ngang hoặc đứng)
  const markKind = spec.kind.startsWith('icon') ? 'icon' : 'mono';
  const stacked = spec.kind.endsWith('stack');
  const slSize = 22, slLs = 0.26;
  if (!stacked) {
    const S = 176;
    const size = fit(name, f, 92, 640);
    const m = measure(name, f, size);
    const slm = sl ? measure(sl, SANS, slSize, slLs) : null;
    const textH = m.asc + m.desc + (slm ? 16 + slm.asc + slm.desc : 0);
    const H = pad * 2 + Math.max(S, textH);
    const cy = H / 2;
    const tx = pad + S + 34;
    const W = tx + Math.max(m.w, slm ? slm.w : 0) + pad;
    const nb = cy - textH / 2 + m.asc;
    return {
      W, H, body: <>
        <Mark spec={spec} kind={markKind} name={name} f={f} cx={pad + S / 2} cy={cy} S={S} c={c} />
        <T x={tx} y={nb} text={name} f={f} size={size} fill={c.ink} />
        {slm && <T x={tx} y={nb + m.desc + 16 + slm.asc} text={sl} f={SANS} size={slSize} fill={c.accent} ls={slLs} />}
      </>,
    };
  }
  const S = 216;
  const size = fit(name, f, 86, 640);
  const m = measure(name, f, size);
  const slm = sl ? measure(sl, SANS, slSize, slLs) : null;
  const W = pad * 2 + Math.max(S, m.w, slm ? slm.w : 0);
  const nb = pad + S + 30 + m.asc;
  const sb = nb + m.desc + 18 + (slm ? slm.asc : 0);
  return {
    W, H: (slm ? sb + slm.desc : nb + m.desc) + pad, body: <>
      <Mark spec={spec} kind={markKind} name={name} f={f} cx={W / 2} cy={pad + S / 2} S={S} c={c} />
      <T x={W / 2} y={nb} text={name} f={f} size={size} fill={c.ink} anchor="middle" />
      {slm && <T x={W / 2} y={sb} text={sl} f={SANS} size={slSize} fill={c.accent} anchor="middle" ls={slLs} />}
    </>,
  };
}

export type LogoTone = 'color' | 'black' | 'white';

// Component SVG logo. frame="avatar": nền tròn vuông 1000×1000 cho ảnh đại diện Shopee/Facebook.
export function LogoSvg({ spec, name, slogan = '', tone = 'color', frame, className, style }: {
  spec: LogoSpec; name: string; slogan?: string; tone?: LogoTone; frame?: 'avatar'; className?: string; style?: React.CSSProperties;
}) {
  const uid = 'lg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = spec.palette;
  const c: Colors = tone === 'color' ? { ink: p.colorPrimary, accent: p.colorAccent, on: '#ffffff' }
    : tone === 'black' ? { ink: '#000000', accent: '#000000', on: '#ffffff', mono: 'black' } : { ink: '#ffffff', accent: '#ffffff', on: '#000000', mono: 'white' };
  const { W, H, body } = layout(spec, name.trim() || 'Tên shop', slogan, c, uid);
  if (frame === 'avatar') {
    const s = 760 / Math.max(W, H);
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" width={1000} height={1000} className={className} style={style}>
        <circle cx={500} cy={500} r={500} fill={p.colorSurface} />
        <g transform={`translate(${500 - (W * s) / 2},${500 - (H * s) / 2}) scale(${s})`}>{body}</g>
      </svg>
    );
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={className} style={style} data-logo-kind={spec.kind}>
      {body}
    </svg>
  );
}

// ---------- icon vuông cho app / web (favicon, Android, iOS) ----------
export type IconBg = 'brand' | 'light' | 'dark';
export const ICON_BGS: { id: IconBg; name: string }[] = [{ id: 'brand', name: 'Nền màu thương hiệu' }, { id: 'light', name: 'Nền trắng' }, { id: 'dark', name: 'Nền tối' }];

// Vẽ phần "dấu" của logo (hình minh hoạ / icon / chữ cái đầu) vào ô vuông 1024.
// bg=false → nền trong suốt (lớp foreground của Android adaptive icon). scale = tỉ lệ dấu so với cạnh.
export function LogoIconSvg({ spec, name, bg, transparent = false, scale = 0.62, style }: {
  spec: LogoSpec; name: string; bg: IconBg; transparent?: boolean; scale?: number; style?: React.CSSProperties;
}) {
  const uid = 'ic' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const p = spec.palette; const N = 1024; const S = N * scale; const c0 = N / 2;
  const isArt = spec.kind === 'illus';
  const fill = bg === 'brand' ? (isArt ? p.colorSurface : p.colorAccent) : bg === 'light' ? '#ffffff' : p.colorPrimary;
  const glyph = bg === 'light' ? p.colorAccent : isArt && bg === 'brand' ? p.colorPrimary : '#ffffff';
  const useIcon = spec.kind === 'icon-h' || spec.kind === 'icon-stack' || (spec.kind === 'badge' && (spec.shape === 'circle' || spec.shape === 'ring'));
  let mark: JSX.Element;
  if (isArt) {
    const art = artInfo(spec.art || 'pets/betta');
    const aw = art.ratio > 1 ? S / art.ratio : S, ah = art.ratio > 1 ? S : S * art.ratio;
    mark = <image href={art.href} x={c0 - aw / 2} y={c0 - ah / 2} width={aw} height={ah} />;
  } else if (useIcon) {
    const Icon = iconById(spec.icon);
    mark = <g transform={`translate(${c0 - S / 2},${c0 - S / 2})`}><Icon size={S} color={glyph} weight="fill" /></g>;
  } else {
    const f = fontById(spec.fontId); const ini = initials(name || 'A');
    const m0 = measure(ini, f, 100);
    const size = 100 * Math.min(S / Math.max(1, m0.w), (S * 0.9) / Math.max(1, m0.asc + m0.desc));
    const m = measure(ini, f, size);
    mark = <T x={c0} y={c0 + (m.asc - m.desc) / 2} text={ini} f={f} size={size} fill={glyph} anchor="middle" />;
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${N} ${N}`} width={N} height={N} style={style} data-icon-uid={uid}>
      {!transparent && <rect width={N} height={N} fill={fill} />}
      {mark}
    </svg>
  );
}

// Nạp toàn bộ font logo 1 lần (link Google Fonts) rồi chờ font sẵn sàng — đo chữ bằng canvas cần font thật.
export function useLogoFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-logo-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link');
        link.id = 'mivy-logo-fonts';
        link.rel = 'stylesheet';
        link.href = logoFontCss().match(/url\('([^']+)'\)/)![1];
        document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    sheet
      .then(() => Promise.all([...LOGO_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), '600 30px "Be Vietnam Pro"', '500 30px "Be Vietnam Pro"']
        .map((font) => document.fonts.load(font, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}
