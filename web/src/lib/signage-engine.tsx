'use client';
// Bảng hiệu cắt CNC/laser (sắt corten, thép sơn, inox, gỗ, mica). Render 100% bằng SVG:
// - mode 'preview': mockup trên tường (chất liệu + bóng + độ dày tấm) để khách xem
// - mode 'cut': file cắt cho xưởng (viền tấm đỏ + phần cắt đen), kích thước thật theo mm
import { Fragment, useEffect, useId, useState, type ReactNode } from 'react';
import { iconById } from '@/lib/logo-icons';

export interface SignFont { id: string; family: string; weight: number; group: 'stencil' | 'script' | 'sans' | 'serif' }
// Đều có subset tiếng Việt (đã kiểm Google Fonts)
export const SIGN_FONTS: SignFont[] = [
  { id: 'saira-stencil', family: 'Saira Stencil One', weight: 400, group: 'stencil' },
  { id: 'shoulders-stencil', family: 'Big Shoulders Stencil Display', weight: 800, group: 'stencil' },
  { id: 'blackops', family: 'Black Ops One', weight: 400, group: 'stencil' },
  { id: 'greatvibes', family: 'Great Vibes', weight: 400, group: 'script' },
  { id: 'alexbrush', family: 'Alex Brush', weight: 400, group: 'script' },
  { id: 'dancing', family: 'Dancing Script', weight: 700, group: 'script' },
  { id: 'allura', family: 'Allura', weight: 400, group: 'script' },
  { id: 'bevietnam', family: 'Be Vietnam Pro', weight: 800, group: 'sans' },
  { id: 'montserrat', family: 'Montserrat', weight: 800, group: 'sans' },
  { id: 'oswald', family: 'Oswald', weight: 700, group: 'sans' },
  { id: 'bungee', family: 'Bungee', weight: 400, group: 'sans' },
  { id: 'playfair', family: 'Playfair Display', weight: 800, group: 'serif' },
  { id: 'prata', family: 'Prata', weight: 400, group: 'serif' },
];
export const FONT_GROUPS: { id: SignFont['group']; name: string }[] = [
  { id: 'stencil', name: 'Stencil (cắt thủng không rơi lõi)' }, { id: 'script', name: 'Viết tay' },
  { id: 'sans', name: 'Chữ đậm' }, { id: 'serif', name: 'Có chân' },
];
export const signFont = (id: string) => SIGN_FONTS.find((f) => f.id === id) || SIGN_FONTS[0];
const SUB = { family: 'Be Vietnam Pro', weight: 600 };

export function signFontCss(ids: string[] = SIGN_FONTS.map((f) => f.id)): string {
  const fams = new Map<string, Set<number>>([[SUB.family, new Set([SUB.weight])]]);
  for (const f of ids.map(signFont)) { if (!fams.has(f.family)) fams.set(f.family, new Set()); fams.get(f.family)!.add(f.weight); }
  const q = Array.from(fams.entries()).map(([fam, ws]) => {
    const w = Array.from(ws).sort((a, b) => a - b);
    return `family=${fam.replace(/ /g, '+')}${w.length === 1 && w[0] === 400 ? '' : `:wght@${w.join(';')}`}`;
  }).join('&');
  return `@import url('https://fonts.googleapis.com/css2?${q}&display=swap');`;
}

export function useSignFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-sign-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-sign-fonts'; link.rel = 'stylesheet';
        link.href = signFontCss().match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true }); link.addEventListener('error', () => res(), { once: true });
    });
    sheet
      .then(() => Promise.all([...SIGN_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `${SUB.weight} 30px "${SUB.family}"`]
        .map((font) => document.fonts.load(font, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- chất liệu ----------
export interface Material { id: string; name: string; base: string; edge: string; grad?: string[]; tex: 'rust' | 'grain' | 'brush' | 'wood' | 'none' }
export const MATERIALS: Material[] = [
  { id: 'corten', name: 'Sắt rỉ corten', base: '#8e4322', edge: '#55260f', tex: 'rust' },
  { id: 'black', name: 'Thép sơn đen', base: '#202225', edge: '#0b0c0d', tex: 'grain' },
  { id: 'gold', name: 'Inox vàng gương', base: '#c9a14a', edge: '#6b4e17', grad: ['#7d5b1d', '#f4d57e', '#a97e2c', '#fde9aa', '#8c6621'], tex: 'none' },
  { id: 'inox', name: 'Inox xước', base: '#b9bcc0', edge: '#62666b', grad: ['#8e9297', '#e7e9eb', '#a6aaaf', '#f3f4f5', '#8c9095'], tex: 'brush' },
  { id: 'wood', name: 'Gỗ', base: '#a87444', edge: '#5b391a', tex: 'wood' },
  { id: 'white', name: 'Mica trắng', base: '#f4f2ed', edge: '#c8c4bb', tex: 'none' },
  { id: 'navy', name: 'Sơn xanh đậm', base: '#1d3557', edge: '#0d1a2b', tex: 'grain' },
];
export const matById = (id: string) => MATERIALS.find((m) => m.id === id) || MATERIALS[0];

export const WALLS: { id: string; name: string; base: string }[] = [
  { id: 'concrete', name: 'Xi măng', base: '#a3a19b' },
  { id: 'white', name: 'Tường trắng', base: '#e9e7e2' },
  { id: 'brick', name: 'Gạch', base: '#9c5a43' },
  { id: 'dark', name: 'Tường tối', base: '#2b2c2f' },
];

// ---------- mẫu ----------
export type SignField = 'name' | 'sub' | 'number' | 'street' | 'icon';
export interface SignTemplate { id: string; name: string; w: number; h: number; font: string; fields: SignField[]; shape?: 'rect' | 'arch' | 'circle' | 'oval' | 'chamfer' | 'shield' | 'hex' }
// w/h: kích thước mặc định (mm)
export const SIGN_TEMPLATES: SignTemplate[] = [
  { id: 'villa', name: 'Tên nhà / villa', w: 900, h: 400, font: 'greatvibes', fields: ['name', 'sub', 'icon'] },
  { id: 'houseno', name: 'Số nhà + tên đường', w: 500, h: 340, font: 'blackops', fields: ['number', 'street'] },
  { id: 'shop', name: 'Tên shop + web', w: 600, h: 420, font: 'saira-stencil', fields: ['name', 'sub'] },
  { id: 'long', name: 'Bảng ngang mặt tiền', w: 1200, h: 300, font: 'montserrat', fields: ['icon', 'name', 'sub'] },
  { id: 'logo', name: 'Icon + tên (vuông)', w: 500, h: 500, font: 'oswald', fields: ['icon', 'name', 'sub'] },
  { id: 'arch', name: 'Vòm cổng (dọc)', w: 400, h: 560, font: 'shoulders-stencil', fields: ['icon', 'number', 'street'], shape: 'arch' },
  { id: 'round', name: 'Biển tròn', w: 500, h: 500, font: 'saira-stencil', fields: ['number', 'street'], shape: 'circle' },
  { id: 'frame', name: 'Khung viền góc', w: 700, h: 420, font: 'playfair', fields: ['name', 'sub'] },
  { id: 'ornament', name: 'Cổ điển hoạ tiết', w: 900, h: 400, font: 'prata', fields: ['name', 'sub', 'icon'] },
  { id: 'vertical', name: 'Bảng dọc cửa', w: 320, h: 900, font: 'oswald', fields: ['icon', 'name', 'sub'] },
  { id: 'oval', name: 'Biển oval', w: 700, h: 420, font: 'alexbrush', fields: ['name', 'sub'], shape: 'oval' },
  { id: 'hanging', name: 'Biển treo quán', w: 700, h: 440, font: 'dancing', fields: ['icon', 'name', 'sub'] },
  { id: 'split', name: 'Số nhà hiện đại', w: 700, h: 300, font: 'bevietnam', fields: ['number', 'street', 'sub'] },
  { id: 'pattern', name: 'Hoa văn lặp', w: 800, h: 420, font: 'saira-stencil', fields: ['icon', 'name'] },
  { id: 'chamfer', name: 'Vát góc công nghiệp', w: 700, h: 400, font: 'shoulders-stencil', fields: ['name', 'sub'], shape: 'chamfer' },
  { id: 'shield', name: 'Huy hiệu khiên', w: 500, h: 620, font: 'playfair', fields: ['icon', 'name', 'sub'], shape: 'shield' },
  { id: 'hex', name: 'Lục giác số nhà', w: 600, h: 520, font: 'blackops', fields: ['icon', 'number', 'street'], shape: 'hex' },
];
export const tplById = (id: string) => SIGN_TEMPLATES.find((t) => t.id === id) || SIGN_TEMPLATES[0];

export interface SignData { name: string; sub: string; number: string; street: string; icon: string }
export type SignKind = 'cnc' | 'neon' | 'lightbox' | 'channel' | 'engrave' | 'chalk' | 'print';
export interface SignSpec {
  tpl: string; w: number; h: number; fontId: string; material: string; style: 'cut' | 'raised'; letter: string; wall: string;
  kind?: SignKind; color?: string; ink?: string; halo?: boolean;
}
// Loại bảng hiệu (mỗi loại render khác nhau trên cùng bố cục mẫu)
export const SIGN_KINDS: { id: SignKind; name: string; desc: string }[] = [
  { id: 'cnc', name: 'Cắt CNC', desc: 'Sắt, inox, gỗ cắt laser' },
  { id: 'neon', name: 'Đèn neon', desc: 'Neon LED uốn chữ' },
  { id: 'lightbox', name: 'Hộp đèn', desc: 'Mica in, đèn sáng bên trong' },
  { id: 'channel', name: 'Chữ nổi LED', desc: 'Chữ khối 3D + đèn hắt sau' },
  { id: 'engrave', name: 'Khắc laser', desc: 'Khắc chìm trên gỗ, mica' },
  { id: 'chalk', name: 'Bảng phấn', desc: 'Bảng đen khung gỗ, viết phấn' },
  { id: 'print', name: 'In màu', desc: 'Alu / bạt in màu phẳng' },
];
export const NEON_COLORS = ['#ff4fa3', '#4fc3ff', '#ffb347', '#f4f1ea', '#b46bff', '#ff5a4f', '#3ff0d0'];
export const FACE_COLORS = ['#c62828', '#1d3557', '#141414', '#f4b400', '#ffffff', '#7b2cbf', '#ff7a00', '#8d5524'];
export const INK_COLORS = ['#ffffff', '#141414', '#f4c95d', '#c62828'];
export const CHALK_COLORS = ['#f3f1ea', '#ffd166', '#ff9ec7', '#9ad7ff'];
export const HALO_COLORS = ['#ffd9a0', '#ffffff', '#4fc3ff', '#ff4fa3'];
const hexMix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
const ENGRAVE_INK: Record<string, string> = { corten: '#3a1a0a', black: '#c8c8c8', gold: '#5d4313', inox: '#4f5357', wood: '#4a2810', white: '#8e9399', navy: '#c9d6e8' };

// đo chữ bằng canvas (font đã nạp) → cỡ chữ vừa khung
let _mctx: CanvasRenderingContext2D | null = null;
function textW(text: string, family: string, weight: number, size: number, spacing = 0): number {
  if (typeof document === 'undefined') return text.length * size * 0.6;
  if (!_mctx) _mctx = document.createElement('canvas').getContext('2d');
  _mctx!.font = `${weight} ${size}px "${family}"`;
  return _mctx!.measureText(text).width + spacing * size * Math.max(0, Array.from(text).length - 1);
}
function fit(text: string, f: { family: string; weight: number }, maxW: number, maxH: number, spacing = 0): number {
  const w = textW(text || ' ', f.family, f.weight, 100, spacing);
  return Math.max(4, Math.min(maxH, (maxW * 100) / Math.max(1, w)));
}

function platePath(W: number, H: number, shape: SignTemplate['shape']): string {
  if (shape === 'circle') { const r = Math.min(W, H) / 2; return `M ${W / 2 - r} ${H / 2} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`; }
  if (shape === 'arch') { const r = W / 2; return `M 0 ${H} L 0 ${r} A ${r} ${r} 0 0 1 ${W} ${r} L ${W} ${H} Z`; }
  if (shape === 'oval') return `M 0 ${H / 2} A ${W / 2} ${H / 2} 0 1 0 ${W} ${H / 2} A ${W / 2} ${H / 2} 0 1 0 0 ${H / 2} Z`;
  if (shape === 'chamfer') { const c = Math.min(W, H) * 0.12; return `M ${c} 0 H ${W - c} L ${W} ${c} V ${H - c} L ${W - c} ${H} H ${c} L 0 ${H - c} V ${c} Z`; }
  if (shape === 'shield') return `M 0 0 H ${W} V ${H * 0.45} C ${W} ${H * 0.75} ${W * 0.72} ${H * 0.9} ${W / 2} ${H} C ${W * 0.28} ${H * 0.9} 0 ${H * 0.75} 0 ${H * 0.45} Z`;
  if (shape === 'hex') return `M ${W * 0.25} 0 H ${W * 0.75} L ${W} ${H / 2} L ${W * 0.75} ${H} H ${W * 0.25} L 0 ${H / 2} Z`;
  const c = Math.min(W, H) * 0.012;
  return `M ${c} 0 H ${W - c} Q ${W} 0 ${W} ${c} V ${H - c} Q ${W} ${H} ${W - c} ${H} H ${c} Q 0 ${H} 0 ${H - c} V ${c} Q 0 0 ${c} 0 Z`;
}

// Nội dung cần cắt (chữ + icon), tô bằng `fill`. Toạ độ trong khung tấm W×H.
function Content({ t, d, W, H, font, fill, arcId }: { t: SignTemplate; d: SignData; W: number; H: number; font: SignFont; fill: string; arcId: string }) {
  const main = { family: font.family, weight: font.weight };
  const sub = font.group === 'script' ? main : SUB;
  const pad = Math.min(W, H) * 0.1;
  const T = (text: string, x: number, y: number, size: number, f: { family: string; weight: number }, anchor: 'start' | 'middle' = 'middle', spacing = 0) => text ? (
    <text x={x} y={y} fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={size} textAnchor={anchor} letterSpacing={spacing ? spacing * size : undefined} fill={fill}>{text}</text>
  ) : null;
  const Ic = d.icon && d.icon !== 'none' ? iconById(d.icon) : null;
  const icon = (x: number, y: number, s: number) => Ic ? <Ic x={x} y={y} width={s} height={s} size={s} weight="fill" color={fill} /> : null;
  const out: ReactNode[] = [];

  if (t.id === 'villa') {
    const s = Ic ? H * 0.72 : 0; const x1 = W - pad - (Ic ? s + pad * 0.4 : 0); const cx = (pad + x1) / 2; const tw = x1 - pad;
    const ns = fit(d.name, main, tw, H * 0.36); const ss = fit(d.sub, sub, tw * 0.6, H * 0.17);
    out.push(T(d.name, cx, d.sub ? H * 0.5 : H * 0.6, ns, main), T(d.sub, cx, H * 0.5 + ss * 1.25, ss, sub));
    out.push(icon(W - pad - s, (H - s) / 2, s));
  } else if (t.id === 'houseno') {
    const ns = fit(d.number, main, W * 0.7, H * 0.5); const ss = fit(d.street.toUpperCase(), main, W - pad * 2, H * 0.19);
    out.push(T(d.number, W / 2, H * 0.52, ns, main));
    out.push(<rect key="rule" x={pad} y={H * 0.6} width={W - pad * 2} height={Math.max(3, H * 0.022)} fill={fill} />);
    out.push(T(d.street.toUpperCase(), W / 2, H * 0.6 + H * 0.06 + ss * 0.78, ss, main));
  } else if (t.id === 'shop') {
    const ns = fit(d.name, main, W - pad * 2, H * 0.27); const ss = fit(d.sub, SUB, W * 0.75, H * 0.075, 0.35);
    out.push(T(d.name, W / 2, d.sub ? H * 0.53 : H * 0.6, ns, main), T(d.sub, W / 2, H * 0.53 + ns * 0.35 + ss * 1.4, ss, SUB, 'middle', 0.35));
  } else if (t.id === 'long') {
    const s = Ic ? H * 0.62 : 0; const x0 = pad + (Ic ? s + pad * 0.7 : 0); const tw = W - x0 - pad;
    const ns = fit(d.name.toUpperCase(), main, tw, H * 0.42); const ss = fit(d.sub, SUB, tw, H * 0.13, 0.12);
    out.push(icon(pad, (H - s) / 2, s));
    out.push(T(d.name.toUpperCase(), x0, d.sub ? H * 0.5 + ns * 0.12 : H * 0.5 + ns * 0.36, ns, main, 'start'), T(d.sub, x0, H * 0.5 + ns * 0.12 + ss * 1.6, ss, SUB, 'start', 0.12));
  } else if (t.id === 'logo') {
    const s = Ic ? H * 0.4 : 0; const ns = fit(d.name.toUpperCase(), main, W - pad * 2, Ic ? H * 0.16 : H * 0.3); const ss = fit(d.sub, SUB, W * 0.7, H * 0.06, 0.2);
    out.push(icon((W - s) / 2, pad * 1.1, s));
    const ny = Ic ? pad * 1.1 + s + H * 0.06 + ns * 0.75 : H * 0.55;
    out.push(T(d.name.toUpperCase(), W / 2, ny, ns, main), T(d.sub, W / 2, ny + ss * 2, ss, SUB, 'middle', 0.2));
  } else if (t.id === 'arch') {
    const s = Ic ? W * 0.3 : 0; const ns = fit(d.number, main, W * 0.72, H * 0.32); const ss = fit(d.street.toUpperCase(), main, W - pad * 2, H * 0.085);
    out.push(icon((W - s) / 2, W * 0.16, s));
    out.push(T(d.number, W / 2, H * 0.66, ns, main));
    out.push(<rect key="rule" x={pad * 1.2} y={H * 0.72} width={W - pad * 2.4} height={Math.max(3, H * 0.014)} fill={fill} />);
    out.push(T(d.street.toUpperCase(), W / 2, H * 0.72 + H * 0.04 + ss * 0.8, ss, main));
  } else if (t.id === 'round') {
    const r = Math.min(W, H) / 2; const cx = W / 2, cy = H / 2;
    const ns = fit(d.number, main, r * 1.05, r * 0.72); const fs = Math.min(r * 0.17, (Math.PI * r * 0.74 * 0.9) / Math.max(4, Array.from(d.street).length * 0.68));
    const ar = r * 0.74;
    out.push(T(d.number, cx, cy + ns * 0.36, ns, main));
    out.push(<path key="arcdef" id={arcId} d={`M ${cx - ar} ${cy} A ${ar} ${ar} 0 0 1 ${cx + ar} ${cy}`} fill="none" />);
    if (d.street) out.push(
      <text key="arc" fontFamily={`"${main.family}"`} fontWeight={main.weight} fontSize={fs} fill={fill} letterSpacing={fs * 0.12}>
        <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{d.street.toUpperCase()}</textPath>
      </text>,
    );
    out.push(<circle key="d1" cx={cx - ar} cy={cy + r * 0.08} r={r * 0.035} fill={fill} />, <circle key="d2" cx={cx + ar} cy={cy + r * 0.08} r={r * 0.035} fill={fill} />);
  }
  // ---- mẫu bổ sung ----
  const bar = (x: number, y: number, w: number, h = Math.max(3, Math.min(W, H) * 0.014)) => <rect x={x} y={y - h / 2} width={w} height={h} fill={fill} />;
  const diamond = (x: number, y: number, s: number) => <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={fill} transform={`rotate(45 ${x} ${y})`} />;
  const subUp = (d.sub || '').toUpperCase();
  if (t.id === 'frame') {
    // khung 4 thanh rời (chừa khe ở góc để lõi không rơi) + hạt kim cương ở góc
    const b = Math.min(W, H) * 0.07, g = Math.min(W, H) * 0.05, th = Math.max(3, Math.min(W, H) * 0.014);
    out.push(bar(b + g, b, W - 2 * (b + g), th), bar(b + g, H - b, W - 2 * (b + g), th));
    out.push(<rect x={b - th / 2} y={b + g} width={th} height={H - 2 * (b + g)} fill={fill} />, <rect x={W - b - th / 2} y={b + g} width={th} height={H - 2 * (b + g)} fill={fill} />);
    for (const [x, y] of [[b, b], [W - b, b], [b, H - b], [W - b, H - b]]) out.push(diamond(x, y, g * 0.7));
    const ns = fit(d.name, main, W - pad * 3.2, H * 0.3); const ss = fit(subUp, SUB, W * 0.55, H * 0.075, 0.3);
    out.push(T(d.name, W / 2, d.sub ? H * 0.53 : H * 0.6, ns, main), T(subUp, W / 2, H * 0.53 + ns * 0.3 + ss * 1.5, ss, SUB, 'middle', 0.3));
  } else if (t.id === 'ornament') {
    const ns = fit(d.name, main, W * 0.66, H * 0.3); const ss = fit(subUp, SUB, W * 0.4, H * 0.09, 0.3);
    const sw = textW(subUp, SUB.family, SUB.weight, ss, 0.3); const sy = H * 0.55 + ns * 0.25 + ss * 1.6;
    out.push(bar(W * 0.3, H * 0.2, W * 0.15), diamond(W / 2, H * 0.2, H * 0.045), bar(W * 0.55, H * 0.2, W * 0.15));
    out.push(T(d.name, W / 2, H * 0.55, ns, main));
    if (d.sub) out.push(T(subUp, W / 2, sy, ss, SUB, 'middle', 0.3), bar(W / 2 - sw / 2 - W * 0.13, sy - ss * 0.35, W * 0.1), bar(W / 2 + sw / 2 + W * 0.03, sy - ss * 0.35, W * 0.1));
    if (Ic) { const s = H * 0.22; out.push(icon(pad * 0.8, H * 0.55 - ns * 0.35 - s / 2, s), icon(W - pad * 0.8 - s, H * 0.55 - ns * 0.35 - s / 2, s)); }
  } else if (t.id === 'vertical') {
    const words = (d.name || ' ').split(/\s+/).filter(Boolean); const s = Ic ? W * 0.5 : 0;
    const y0 = pad + (Ic ? s + pad * 0.6 : 0), y1 = H - pad - (d.sub ? H * 0.07 : 0);
    const lh = (y1 - y0) / words.length; const ws = Math.min(...words.map((w) => fit(w.toUpperCase(), main, W - pad * 2, lh * 0.85)));
    out.push(icon((W - s) / 2, pad, s));
    words.forEach((w, i) => out.push(T(w.toUpperCase(), W / 2, y0 + lh * i + lh / 2 + ws * 0.36, ws, main)));
    if (d.sub) { const ss = fit(subUp, SUB, W - pad * 2, H * 0.03, 0.2); out.push(bar(W * 0.3, y1 + H * 0.005, W * 0.4), T(subUp, W / 2, y1 + H * 0.045, ss, SUB, 'middle', 0.2)); }
  } else if (t.id === 'oval') {
    const ns = fit(d.name, main, W * 0.66, H * 0.3); const ss = fit(subUp, SUB, W * 0.38, H * 0.075, 0.3);
    out.push(T(d.name, W / 2, d.sub ? H * 0.52 : H * 0.58, ns, main));
    if (d.sub) { const sw = textW(subUp, SUB.family, SUB.weight, ss, 0.3); const sy = H * 0.52 + ns * 0.28 + ss * 1.5; out.push(T(subUp, W / 2, sy, ss, SUB, 'middle', 0.3), diamond(W / 2 - sw / 2 - ss, sy - ss * 0.35, ss * 0.45), diamond(W / 2 + sw / 2 + ss, sy - ss * 0.35, ss * 0.45)); }
    out.push(bar(W * 0.4, H * 0.16, W * 0.2), bar(W * 0.4, H * 0.84, W * 0.2));
  } else if (t.id === 'hanging') {
    const hr = Math.min(W, H) * 0.028;
    out.push(<circle cx={W * 0.12} cy={H * 0.12} r={hr} fill={fill} />, <circle cx={W * 0.88} cy={H * 0.12} r={hr} fill={fill} />);
    const s = Ic ? H * 0.2 : 0; const ns = fit(d.name, main, W - pad * 2.4, H * 0.3); const ss = fit(d.sub, SUB, W * 0.6, H * 0.08, 0.15);
    out.push(icon((W - s) / 2, H * 0.08, s));
    out.push(T(d.name, W / 2, H * 0.64, ns, main), T(d.sub, W / 2, H * 0.64 + ns * 0.3 + ss * 1.5, ss, SUB, 'middle', 0.15));
  } else if (t.id === 'split') {
    const ns = fit(d.number, main, W * 0.42, H * 0.72); const nw = textW(d.number, main.family, main.weight, ns);
    const dx = pad + nw + pad * 0.7; const x2 = dx + pad * 0.7; const tw = W - x2 - pad;
    const ss = fit(d.street.toUpperCase(), main, tw, H * 0.2); const bs = fit(subUp, SUB, tw, H * 0.1, 0.12);
    out.push(T(d.number, pad, H / 2 + ns * 0.36, ns, main, 'start'));
    out.push(<rect x={dx} y={H * 0.18} width={Math.max(3, Math.min(W, H) * 0.02)} height={H * 0.64} fill={fill} />);
    out.push(T(d.street.toUpperCase(), x2, d.sub ? H * 0.5 : H / 2 + ss * 0.36, ss, main, 'start'), T(subUp, x2, H * 0.5 + bs * 1.7, bs, SUB, 'start', 0.12));
  } else if (t.id === 'pattern') {
    // hoa văn lặp (icon hoặc hạt kim cương) phủ tấm, chừa dải giữa cho tên
    const band = H * 0.34, by = (H - band) / 2, cell = H * 0.2, s = cell * 0.62;
    const cols = Math.floor((W - pad) / cell);
    const ox = (W - cols * cell) / 2;
    for (let r = 0; ; r++) {
      const cy = pad * 0.5 + cell * r + cell / 2; if (cy + s / 2 > H - pad * 0.4) break;
      if (cy + s / 2 > by - cell * 0.15 && cy - s / 2 < by + band + cell * 0.15) continue;
      for (let c = 0; c < cols - (r % 2); c++) {
        const cx = ox + cell * c + cell / 2 + (r % 2 ? cell / 2 : 0);
        out.push(Ic ? icon(cx - s / 2, cy - s / 2, s) : diamond(cx, cy, s * 0.5));
      }
    }
    out.push(bar(pad, by, W - pad * 2), bar(pad, by + band, W - pad * 2));
    const ns = fit(d.name.toUpperCase(), main, W - pad * 3, band * 0.62);
    out.push(T(d.name.toUpperCase(), W / 2, H / 2 + ns * 0.36, ns, main));
  } else if (t.id === 'chamfer') {
    const ns = fit(d.name.toUpperCase(), main, W - pad * 2.6, H * 0.26); const ss = fit(d.sub, SUB, W * 0.65, H * 0.075, 0.2);
    out.push(bar(W * 0.38, H * 0.2, W * 0.24), bar(W * 0.38, H * 0.8, W * 0.24));
    out.push(T(d.name.toUpperCase(), W / 2, d.sub ? H * 0.53 : H / 2 + ns * 0.36, ns, main), T(d.sub, W / 2, H * 0.53 + ss * 1.9, ss, SUB, 'middle', 0.2));
  } else if (t.id === 'shield') {
    const s = Ic ? W * 0.3 : 0; const ns = fit(d.name.toUpperCase(), main, W * 0.74, H * 0.12); const ss = fit(subUp, SUB, W * 0.5, H * 0.045, 0.3);
    out.push(icon((W - s) / 2, H * 0.09, s));
    const ny = Ic ? H * 0.09 + s + H * 0.04 + ns * 0.75 : H * 0.42;
    out.push(T(d.name.toUpperCase(), W / 2, ny, ns, main), bar(W * 0.3, ny + H * 0.05, W * 0.4), T(subUp, W / 2, ny + H * 0.05 + ss * 2, ss, SUB, 'middle', 0.3));
  } else if (t.id === 'hex') {
    const s = Ic ? H * 0.16 : 0; const ns = fit(d.number, main, W * 0.42, H * 0.4); const ss = fit(d.street.toUpperCase(), main, W * 0.52, H * 0.085);
    out.push(icon((W - s) / 2, H * 0.08, s));
    out.push(T(d.number, W / 2, H * 0.6, ns, main), bar(W * 0.3, H * 0.68, W * 0.4), T(d.street.toUpperCase(), W / 2, H * 0.68 + H * 0.03 + ss * 0.8, ss, main));
  }
  return <>{out.map((n, i) => <Fragment key={i}>{n}</Fragment>)}</>;
}

function Texture({ m, uid }: { m: Material; uid: string }) {
  if (m.tex === 'none') return null;
  return <rect x={-50} y={-50} width="200%" height="200%" filter={`url(#${uid}-tex)`} />;
}
function texFilter(m: Material, uid: string, W: number) {
  const k = 600 / W; // giữ mật độ vân ổn định theo kích thước
  if (m.tex === 'rust') return (
    <filter id={`${uid}-tex`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={`${0.05 * k} ${0.003 * k}`} numOctaves={4} seed={7} result="n1" />
      <feColorMatrix in="n1" values="0 0 0 0 0.28  0 0 0 0 0.10  0 0 0 0 0.04  0 0 0 1.5 -0.72" result="dark" />
      <feTurbulence type="fractalNoise" baseFrequency={`${0.008 * k} ${0.012 * k}`} numOctaves={3} seed={21} result="n2" />
      <feColorMatrix in="n2" values="0 0 0 0 0.70  0 0 0 0 0.32  0 0 0 0 0.12  0 0 0 1.1 -0.66" result="light" />
      <feMerge><feMergeNode in="light" /><feMergeNode in="dark" /></feMerge>
    </filter>
  );
  const freq = m.tex === 'brush' ? `${0.002 * k} ${0.6 * k}` : m.tex === 'wood' ? `${0.0015 * k} ${0.12 * k}` : `${0.9 * k}`;
  const vals = m.tex === 'wood' ? '0 0 0 0 0.30  0 0 0 0 0.16  0 0 0 0 0.06  0 0 0 2.4 -0.95'
    : m.tex === 'brush' ? '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 -0.35' : '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.25 -0.08';
  return (
    <filter id={`${uid}-tex`} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={freq} numOctaves={m.tex === 'grain' ? 1 : 3} seed={4} />
      <feColorMatrix values={vals} />
    </filter>
  );
}
const fillOf = (m: Material, uid: string, part: string) => (m.grad ? `url(#${uid}-${part})` : m.base);
const gradDef = (m: Material, uid: string, part: string) => m.grad ? (
  <linearGradient id={`${uid}-${part}`} x1="0" y1="0" x2="1" y2="1">
    {m.grad.map((c, i) => <stop key={i} offset={i / (m.grad!.length - 1)} stopColor={c} />)}
  </linearGradient>
) : null;

function wallFill(id: string, uid: string, VW: number) {
  const w = WALLS.find((x) => x.id === id) || WALLS[0];
  const k = 900 / VW;
  return (
    <>
      <rect width="100%" height="100%" fill={w.base} />
      {w.id === 'brick' ? (
        <>
          <defs>
            <pattern id={`${uid}-brick`} width={VW / 9} height={VW / 27} patternUnits="userSpaceOnUse">
              <rect width={VW / 9} height={VW / 27} fill="#a5614a" />
              <path d={`M0 ${VW / 27 - 1} H${VW / 9} M${VW / 18} 0 V${VW / 54} M0 ${VW / 54} H${VW / 9} M2 ${VW / 54} V${VW / 27}`} stroke="#d8cfc4" strokeWidth={VW * 0.002} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${uid}-brick)`} />
        </>
      ) : null}
      <defs>
        <filter id={`${uid}-wall`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`${0.35 * k}`} numOctaves={2} seed={2} />
          <feColorMatrix values={w.id === 'dark' ? '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.12 -0.03' : '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 -0.1'} />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter={`url(#${uid}-wall)`} />
    </>
  );
}

export function SignSvg({ spec, data, mode = 'preview', style, className }: { spec: SignSpec; data: SignData; mode?: 'preview' | 'cut'; style?: React.CSSProperties; className?: string }) {
  const uid = 's' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = tplById(spec.tpl); const W = spec.w, H = spec.h; const font = signFont(spec.fontId);
  const m = matById(spec.material); const L = matById(spec.letter);
  const shape = platePath(W, H, t.shape);
  const arcId = `${uid}-arc`;

  if (mode === 'cut') {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} width={`${W}mm`} height={`${H}mm`} style={style} className={className}>
        <path d={shape} fill="none" stroke="#ff0000" strokeWidth={0.4} />
        <Content t={t} d={data} W={W} H={H} font={font} fill="#000000" arcId={arcId} />
      </svg>
    );
  }

  const M = Math.max(W, H) * 0.14; const th = Math.max(W, H) * 0.007; // lề tường + độ dày tấm
  const VW = W + M * 2, VH = H + M * 2;
  const kind = spec.kind || 'cnc';
  if (kind !== 'cnc') return <SignKindSvg spec={spec} data={data} uid={uid} t={t} W={W} H={H} M={M} th={th} VW={VW} VH={VH} shape={shape} font={font} m={m} L={L} style={style} className={className} />;
  const plate = (
    <>
      <path d={shape} fill={fillOf(m, uid, 'plate')} />
      <g clipPath={`url(#${uid}-clip)`}><Texture m={m} uid={uid} /></g>
    </>
  );
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${VW} ${VH}`} style={style} className={className}>
      <defs>
        {texFilter(m, uid, W)}
        {gradDef(m, uid, 'plate')}
        {gradDef(L, uid, 'letter')}
        <clipPath id={`${uid}-clip`}><path d={shape} /></clipPath>
        <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x={-M} y={-M} width={VW} height={VH}>
          <path d={shape} fill="#ffffff" />
          <Content t={t} d={data} W={W} H={H} font={font} fill="#000000" arcId={`${arcId}m`} />
        </mask>
        <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={th * 2.2} /></filter>
        <filter id={`${uid}-lift`} x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx={0} dy={th * 0.6} stdDeviation={th * 0.5} floodOpacity={0.45} /></filter>
      </defs>
      {wallFill(spec.wall, uid, VW)}
      <g transform={`translate(${M} ${M})`}>
        <path d={shape} fill="#000" opacity={0.38} filter={`url(#${uid}-blur)`} transform={`translate(${th * 1.2} ${th * 3})`} />
        {spec.style === 'cut' ? (
          <>
            <g transform={`translate(${th * 0.5} ${th})`}><g mask={`url(#${uid}-mask)`}><path d={shape} fill={m.edge} /></g></g>
            <g mask={`url(#${uid}-mask)`}>{plate}</g>
          </>
        ) : (
          <>
            <path d={shape} fill={m.edge} transform={`translate(${th * 0.5} ${th})`} />
            {plate}
            <g filter={`url(#${uid}-lift)`}><Content t={t} d={data} W={W} H={H} font={font} fill={fillOf(L, uid, 'letter')} arcId={arcId} /></g>
          </>
        )}
      </g>
    </svg>
  );
}

// Các loại bảng hiệu ngoài CNC: neon, hộp đèn, chữ nổi LED, khắc laser, bảng phấn, in màu
function SignKindSvg({ spec, data, uid, t, W, H, M, th, VW, VH, shape, font, m, L, style, className }: {
  spec: SignSpec; data: SignData; uid: string; t: SignTemplate; W: number; H: number; M: number; th: number; VW: number; VH: number;
  shape: string; font: SignFont; m: Material; L: Material; style?: React.CSSProperties; className?: string;
}) {
  const kind = spec.kind || 'cnc';
  const C = (fill: string, arc: string) => <Content t={t} d={data} W={W} H={H} font={font} fill={fill} arcId={`${uid}-${arc}`} />;
  const minWH = Math.min(W, H);
  const shadow = <path d={shape} fill="#000" opacity={0.38} filter={`url(#${uid}-blur)`} transform={`translate(${th * 1.2} ${th * 3})`} />;
  const plate = (
    <>
      <path d={shape} fill={m.edge} transform={`translate(${th * 0.5} ${th})`} />
      <path d={shape} fill={fillOf(m, uid, 'plate')} />
      <g clipPath={`url(#${uid}-clip)`}><Texture m={m} uid={uid} /></g>
    </>
  );
  let body: ReactNode = null;
  const defs: ReactNode[] = [];

  if (kind === 'neon') {
    const nc = spec.color || NEON_COLORS[0];
    defs.push(
      <filter key="g1" id={`${uid}-glowL`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={minWH * 0.035} /></filter>,
      <filter key="g2" id={`${uid}-glowS`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={minWH * 0.008} /></filter>,
    );
    body = (
      <>
        {/* tấm mica trong gắn tường */}
        <path d={shape} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeWidth={th * 0.5} />
        {[[0.06, 0.08], [0.94, 0.08], [0.06, 0.92], [0.94, 0.92]].map(([x, y], i) => <circle key={i} cx={W * x} cy={H * y} r={minWH * 0.012} fill="#cfd3d8" opacity={0.7} />)}
        <g opacity={0.75} filter={`url(#${uid}-glowL)`}>{C(nc, 'n1')}</g>
        <g filter={`url(#${uid}-glowS)`}>{C(nc, 'n2')}</g>
        {C(hexMix(nc, '#ffffff', 0.72), 'n3')}
      </>
    );
  } else if (kind === 'lightbox') {
    const face = spec.color || FACE_COLORS[0]; const ink = spec.ink || INK_COLORS[0];
    defs.push(
      <radialGradient key="lit" id={`${uid}-lit`} cx="50%" cy="45%" r="65%"><stop offset="0" stopColor="#fff" stopOpacity={0.38} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></radialGradient>,
      <filter key="halo" id={`${uid}-boxglow`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={minWH * 0.06} /></filter>,
    );
    body = (
      <>
        <path d={shape} fill={face} opacity={0.55} filter={`url(#${uid}-boxglow)`} />
        {shadow}
        <path d={shape} fill={face} />
        <path d={shape} fill={`url(#${uid}-lit)`} />
        {C(ink, 'l1')}
        <path d={shape} fill="none" stroke="#2a2c30" strokeWidth={minWH * 0.05} />
        <path d={shape} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={th * 0.4} transform={`translate(${th * 0.3} ${th * 0.3})`} />
      </>
    );
  } else if (kind === 'channel') {
    const side = hexMix(L.edge, '#000000', 0.1); const depth = Math.max(3, minWH * 0.012);
    defs.push(<filter key="h" id={`${uid}-halo`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={minWH * 0.025} /></filter>);
    body = (
      <>
        {shadow}{plate}
        {spec.halo !== false && <g opacity={0.95} filter={`url(#${uid}-halo)`}>{C(spec.color || HALO_COLORS[0], 'c0')}</g>}
        {[4, 3, 2, 1].map((i) => <g key={i} transform={`translate(${depth * i * 0.35} ${depth * i * 0.5})`}>{C(side, `c${i}`)}</g>)}
        {C(fillOf(L, uid, 'letter'), 'c5')}
      </>
    );
  } else if (kind === 'engrave') {
    const ink = ENGRAVE_INK[m.id] || '#333333';
    body = (
      <>
        {shadow}{plate}
        <g clipPath={`url(#${uid}-clip)`}>
          <g opacity={0.35} transform={`translate(0 ${th * 0.3})`}>{C('#ffffff', 'e1')}</g>
          <g opacity={0.88}>{C(ink, 'e2')}</g>
        </g>
      </>
    );
  } else if (kind === 'chalk') {
    const ink = spec.color || CHALK_COLORS[0];
    defs.push(
      <filter key="ck" id={`${uid}-chalk`} x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="fractalNoise" baseFrequency={1.1 * (600 / W)} numOctaves={2} seed={5} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale={th * 0.9} result="d" />
        <feColorMatrix in="n" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 2.2 -0.35" result="a" />
        <feComposite in="d" in2="a" operator="in" />
      </filter>,
      <filter key="bd" id={`${uid}-board`} x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency={0.05 * (600 / W)} numOctaves={3} seed={9} />
        <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.16 -0.04" />
      </filter>,
    );
    body = (
      <>
        {shadow}
        <path d={shape} fill="#1f2a27" />
        <g clipPath={`url(#${uid}-clip)`}><rect x={-50} y={-50} width="200%" height="200%" filter={`url(#${uid}-board)`} /></g>
        <g filter={`url(#${uid}-chalk)`}>{C(ink, 'k1')}</g>
        <path d={shape} fill="none" stroke="#7a4a24" strokeWidth={minWH * 0.06} />
        <path d={shape} fill="none" stroke="#a36a3b" strokeWidth={minWH * 0.02} />
      </>
    );
  } else if (kind === 'print') {
    const face = spec.color || FACE_COLORS[1]; const ink = spec.ink || INK_COLORS[0];
    defs.push(
      <linearGradient key="pg" id={`${uid}-pg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={hexMix(face, '#ffffff', 0.12)} /><stop offset="1" stopColor={hexMix(face, '#000000', 0.18)} /></linearGradient>,
    );
    body = (
      <>
        {shadow}
        <path d={shape} fill={hexMix(face, '#000000', 0.45)} transform={`translate(${th * 0.4} ${th * 0.6})`} />
        <path d={shape} fill={`url(#${uid}-pg)`} />
        <g clipPath={`url(#${uid}-clip)`}><circle cx={W * 0.95} cy={H * 0.05} r={minWH * 0.6} fill={hexMix(face, '#ffffff', 0.1)} opacity={0.5} /></g>
        {C(ink, 'p1')}
      </>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${VW} ${VH}`} style={style} className={className}>
      <defs>
        {texFilter(m, uid, W)}
        {gradDef(m, uid, 'plate')}
        {gradDef(L, uid, 'letter')}
        <clipPath id={`${uid}-clip`}><path d={shape} /></clipPath>
        <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={th * 2.2} /></filter>
        {defs}
      </defs>
      {wallFill(spec.wall, uid, VW)}
      <g transform={`translate(${M} ${M})`}>{body}</g>
    </svg>
  );
}
