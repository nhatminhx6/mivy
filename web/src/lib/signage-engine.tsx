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
  { id: 'gold', name: 'Inox vàng gương', base: '#c9a14a', edge: '#6b4e17', grad: ['#94712c', '#dcbb6a', '#ad8739', '#e6c97f', '#9a7631'], tex: 'none' },
  { id: 'inox', name: 'Inox xước', base: '#b9bcc0', edge: '#62666b', grad: ['#8e9297', '#e7e9eb', '#a6aaaf', '#f3f4f5', '#8c9095'], tex: 'brush' },
  { id: 'wood', name: 'Gỗ', base: '#a87444', edge: '#5b391a', tex: 'wood' },
  { id: 'white', name: 'Mica trắng', base: '#f4f2ed', edge: '#c8c4bb', tex: 'none' },
  { id: 'navy', name: 'Sơn xanh đậm', base: '#1d3557', edge: '#0d1a2b', tex: 'grain' },
];
export const matById = (id: string) => MATERIALS.find((m) => m.id === id) || MATERIALS[0];

// cảnh tường ảnh thật gen sẵn offline (/public/scenes) — giữa tường chừa trống để gắn bảng
// cnc: kiểu CNC hợp với bức tường này (vd tường Hội An → sơn thẳng, gỗ Nhật → chữ rời đen) — không ép tấm nền lên mọi tường
// light: [hệ số chuẩn hoá độ sáng tường (≈1/độ sáng vùng giữa), độ đậm] → bóng lá/ánh đèn của cảnh hắt lên bảng
// zone: [tâm x, tâm y, rộng tối đa, cao tối đa] theo tỉ lệ ảnh — cảnh có chỗ gắn bảng cố định (vd dải mặt tiền trên cửa kính); không có thì đặt giữa
export const SIGN_SCENES: { id: string; name: string; src: string; cnc: Partial<SignSpec>; light: [number, number]; zone?: [number, number, number, number] }[] = [
  { id: 'congnghiep', name: 'Xi măng công nghiệp', src: '/scenes/bh-1-congnghiep.jpg', cnc: { style: 'loose', letter: 'black' }, light: [1.28, 0.9] },
  { id: 'bar-dem', name: 'Bar gạch đêm', src: '/scenes/bh-2-bar-dem.jpg', cnc: { style: 'loose', letter: 'gold' }, light: [3.5, 0.55] },
  { id: 'hoian', name: 'Tường vàng Hội An', src: '/scenes/bh-3-hoian.jpg', cnc: { style: 'paint', letter: 'black' }, light: [1.27, 0.9] },
  { id: 'nhat', name: 'Gỗ kiểu Nhật', src: '/scenes/bh-4-nhat.jpg', cnc: { style: 'loose', letter: 'black' }, light: [1.3, 0.85] },
  { id: 'nha-trang', name: 'Tường trắng tối giản', src: '/scenes/bh-5-nha-trang.jpg', cnc: { style: 'loose', letter: 'gold' }, light: [1.08, 0.9] },
  { id: 'nhiet-doi', name: 'Đất nung nhiệt đới', src: '/scenes/bh-6-nhiet-doi.jpg', cnc: { style: 'paint', letter: 'white' }, light: [1.5, 0.95] },
  { id: 'sang-trong', name: 'Đá đen sang trọng', src: '/scenes/bh-7-sang-trong.jpg', cnc: { style: 'loose', letter: 'gold' }, light: [4, 0.45] },
  { id: 'pho-vn', name: 'Mặt phố Việt', src: '/scenes/bh-8-pho-vn.jpg', cnc: { style: 'loose', letter: 'white' }, light: [1.2, 0.6], zone: [0.506, 0.25, 0.78, 0.22] },
];
// mỗi loại bảng hợp vài cảnh → các mẫu xoay vòng cảnh
const KIND_SCENES: Record<SignKind, string[]> = {
  cnc: ['congnghiep', 'nhat', 'hoian', 'nhiet-doi', 'nha-trang', 'sang-trong'],
  neon: ['bar-dem', 'sang-trong', 'congnghiep'],
  lightbox: ['pho-vn', 'congnghiep', 'nha-trang'],
  channel: ['sang-trong', 'pho-vn', 'nha-trang', 'bar-dem'],
  engrave: ['nhat', 'nhiet-doi', 'sang-trong'],
  chalk: ['nhiet-doi', 'congnghiep', 'pho-vn'],
  print: ['pho-vn', 'congnghiep'],
};

export const WALLS: { id: string; name: string; base: string }[] = [
  { id: 'concrete', name: 'Xi măng', base: '#a3a19b' },
  { id: 'white', name: 'Tường trắng', base: '#e9e7e2' },
  { id: 'brick', name: 'Gạch', base: '#9c5a43' },
  { id: 'dark', name: 'Tường tối', base: '#2b2c2f' },
  { id: 'slat', name: 'Lam gỗ', base: '#6b4428' },
  { id: 'terracotta', name: 'Sơn đất nung', base: '#b4583a' },
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
  tpl: string; w: number; h: number; fontId: string; material: string; style: 'cut' | 'raised' | 'loose' | 'standoff' | 'paint'; letter: string; wall: string; scene?: string;
  kind?: SignKind; color?: string; ink?: string; accent?: string; halo?: boolean; bg?: string; variant?: string;
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
// Kiểu dựng của từng loại (CNC dùng spec.style, loại khác dùng spec.variant)
export const KIND_VARIANTS: Record<SignKind, { id: string; name: string }[]> = {
  cnc: [{ id: 'cut', name: 'Cắt thủng chữ' }, { id: 'raised', name: 'Chữ nổi trên tấm' }, { id: 'standoff', name: 'Tấm nổi cách tường' }, { id: 'loose', name: 'Chữ rời gắn tường' }, { id: 'paint', name: 'Sơn thẳng lên tường' }],
  neon: [{ id: 'clear', name: 'Mica trong chữ nhật' }, { id: 'contour', name: 'Mica cắt ôm chữ' }, { id: 'wall', name: 'Gắn thẳng tường' }, { id: 'black', name: 'Bảng đen viền neon' }],
  lightbox: [{ id: 'box', name: 'Hộp đèn khung dày' }, { id: 'slim', name: 'Hộp đèn siêu mỏng' }, { id: 'letterlit', name: 'Hộp tối, chữ sáng' }, { id: 'spot', name: 'Biển + đèn rọi' }],
  channel: [{ id: 'wall', name: 'Hắt sáng sau chữ' }, { id: 'front', name: 'Mặt chữ sáng' }], // bỏ kiểu chữ trên tấm nền — ngoài đời không ai làm
  engrave: [{ id: 'dark', name: 'Khắc chìm' }, { id: 'gold', name: 'Khắc dát vàng' }, { id: 'relief', name: 'Chạm nổi' }, { id: 'burn', name: 'Khắc cháy (gỗ)' }],
  chalk: [{ id: 'frame', name: 'Khung gỗ treo tường' }, { id: 'hang', name: 'Treo dây' }, { id: 'clip', name: 'Bảng kẹp' }],
  print: [{ id: 'alu', name: 'Alu bắt ốc' }, { id: 'stripe', name: 'Sọc viền' }, { id: 'frame', name: 'Khung màu' }, { id: 'banner', name: 'Bạt căng dây' }],
};
export const variantOf = (s: SignSpec): string => (s.kind || 'cnc') === 'cnc' ? s.style : s.variant || KIND_VARIANTS[s.kind!][0].id;
export const NEON_COLORS = ['#ff4fa3', '#4fc3ff', '#ffb347', '#f4f1ea', '#b46bff', '#ff5a4f', '#3ff0d0'];
export const FACE_COLORS = ['#c62828', '#1d3557', '#141414', '#f4b400', '#ffffff', '#7b2cbf', '#ff7a00', '#8d5524'];
export const INK_COLORS = ['#ffffff', '#141414', '#f4c95d', '#c62828'];
// Phối màu in sẵn (nền / chữ / nhấn) — phối tay, tránh nền xanh nhạt nhoà
export const PRINT_PALETTES: { id: string; name: string; face: string; ink: string; accent: string }[] = [
  { id: 'black-gold', name: 'Đen vàng', face: '#141414', ink: '#ffffff', accent: '#e8b730' },
  { id: 'red-cream', name: 'Đỏ kem', face: '#a8201a', ink: '#fff4e0', accent: '#f6c453' },
  { id: 'cream-brown', name: 'Kem nâu', face: '#f3e9dc', ink: '#3e2415', accent: '#b5651d' },
  { id: 'white-red', name: 'Trắng đỏ', face: '#faf7f2', ink: '#161616', accent: '#d62828' },
  { id: 'navy-gold', name: 'Navy vàng', face: '#14213d', ink: '#ffffff', accent: '#fca311' },
  { id: 'orange-black', name: 'Cam đen', face: '#ff6b1a', ink: '#161616', accent: '#ffffff' },
  { id: 'plum-gold', name: 'Tím vàng', face: '#3c1a5b', ink: '#ffffff', accent: '#fbb13c' },
  { id: 'pink-wine', name: 'Hồng đô', face: '#f7d9d9', ink: '#5a1a2b', accent: '#a4133c' },
  { id: 'teal-sand', name: 'Xanh két cát', face: '#0b3d4a', ink: '#f1faee', accent: '#e9c46a' },
];
export const CHALK_COLORS = ['#f3f1ea', '#ffd166', '#ff9ec7', '#9ad7ff'];
export const HALO_COLORS = ['#ffd9a0', '#ffffff', '#4fc3ff', '#ff4fa3'];
const hexMix = (a: string, b: string, t: number) => {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
};
// Mỗi mẫu trong lưới mang 1 phối riêng theo loại (màu/chất liệu/tường) → 17 mẫu không giống hệt nhau.
// Danh sách xoay vòng theo thứ tự mẫu; bấm mẫu là áp luôn phối đó, sau đó vẫn chỉnh tay được.
const LOOKS: Record<SignKind, Partial<SignSpec>[]> = {
  cnc: [
    { material: 'corten', letter: 'gold', style: 'cut', wall: 'concrete' },
    { material: 'black', letter: 'gold', style: 'standoff', wall: 'white' },
    { material: 'inox', letter: 'gold', style: 'loose', wall: 'slat' },
    { material: 'wood', letter: 'black', style: 'raised', wall: 'white' },
    { material: 'gold', letter: 'gold', style: 'cut', wall: 'dark' },
    { material: 'white', letter: 'black', style: 'standoff', wall: 'brick' },
    { material: 'black', letter: 'black', style: 'loose', wall: 'white' },
    { material: 'wood', letter: 'gold', style: 'cut', wall: 'dark' },
    { material: 'corten', letter: 'corten', style: 'loose', wall: 'white' },
  ],
  neon: [
    { color: '#ff4fa3', accent: '#4fc3ff', wall: 'dark', variant: 'clear' },
    { color: '#4fc3ff', accent: '#ff4fa3', wall: 'brick', variant: 'contour' },
    { color: '#ffb347', accent: '#f4f1ea', wall: 'brick', variant: 'wall' },
    { color: '#f4f1ea', accent: '#ffb347', wall: 'slat', variant: 'black' },
    { color: '#b46bff', accent: '#ff4fa3', wall: 'dark', variant: 'contour' },
    { color: '#ff5a4f', accent: '#ffb347', wall: 'terracotta', variant: 'black' },
    { color: '#3ff0d0', accent: '#f4f1ea', wall: 'brick', variant: 'contour' },
    { color: '#ff4fa3', accent: '#ffb347', wall: 'slat', variant: 'wall' },
  ],
  lightbox: [
    { color: '#ffffff', ink: '#141414', accent: '#c62828', wall: 'brick', variant: 'slim' },
    { color: '#c62828', ink: '#ffffff', accent: '#f4c95d', wall: 'concrete', variant: 'box' },
    { color: '#141414', ink: '#f4c95d', accent: '#ffffff', wall: 'white', variant: 'letterlit' },
    { color: '#f4b400', ink: '#141414', accent: '#c62828', wall: 'dark', variant: 'spot' },
    { color: '#1d3557', ink: '#ffffff', accent: '#f4b400', wall: 'terracotta', variant: 'box' },
    { color: '#ff7a00', ink: '#ffffff', accent: '#141414', wall: 'concrete', variant: 'slim' },
    { color: '#7b2cbf', ink: '#ffffff', accent: '#f4c95d', wall: 'dark', variant: 'letterlit' },
    { color: '#8d5524', ink: '#fff4e0', accent: '#f4c95d', wall: 'slat', variant: 'spot' },
  ],
  channel: [
    { material: 'black', letter: 'gold', color: '#ffd9a0', wall: 'concrete', variant: 'wall' },
    { material: 'wood', letter: 'black', color: '#ffd9a0', wall: 'white', variant: 'wall' },
    { material: 'white', letter: 'black', color: '#ffffff', wall: 'dark', variant: 'front' },
    { material: 'navy', letter: 'gold', color: '#ffd9a0', wall: 'brick', variant: 'wall' },
    { material: 'inox', letter: 'black', color: '#4fc3ff', wall: 'dark', variant: 'front' },
    { material: 'corten', letter: 'white', color: '#ffd9a0', wall: 'dark', variant: 'wall' },
    { material: 'black', letter: 'white', color: '#ff4fa3', wall: 'brick', variant: 'wall' },
    { material: 'wood', letter: 'gold', color: '#ffd9a0', wall: 'slat', variant: 'front' },
  ],
  engrave: [
    { material: 'wood', wall: 'white', variant: 'burn' },
    { material: 'black', wall: 'brick', variant: 'gold' },
    { material: 'gold', wall: 'dark', variant: 'relief' },
    { material: 'inox', wall: 'concrete', variant: 'dark' },
    { material: 'white', wall: 'slat', variant: 'gold' },
    { material: 'navy', wall: 'white', variant: 'gold' },
    { material: 'corten', wall: 'white', variant: 'relief' },
    { material: 'wood', wall: 'terracotta', variant: 'dark' },
  ],
  chalk: [
    { color: '#f3f1ea', accent: '#ffd166', bg: '#1f2a27', wall: 'brick', variant: 'frame' },
    { color: '#f3f1ea', accent: '#ff9ec7', bg: '#1c1c1e', wall: 'white', variant: 'hang' },
    { color: '#ffd166', accent: '#f3f1ea', bg: '#22302c', wall: 'slat', variant: 'clip' },
    { color: '#f3f1ea', accent: '#9ad7ff', bg: '#1c1c1e', wall: 'brick', variant: 'hang' },
    { color: '#9ad7ff', accent: '#f3f1ea', bg: '#1f2a27', wall: 'concrete', variant: 'frame' },
    { color: '#ff9ec7', accent: '#f3f1ea', bg: '#1c1c1e', wall: 'terracotta', variant: 'clip' },
  ],
  print: (['brick', 'white', 'slat', 'dark', 'white', 'concrete', 'white', 'slat', 'terracotta'] as const)
    .map((wall, i) => ({ color: PRINT_PALETTES[i].face, ink: PRINT_PALETTES[i].ink, accent: PRINT_PALETTES[i].accent, wall,
      variant: ['alu', 'stripe', 'banner', 'frame', 'alu', 'stripe', 'frame', 'banner', 'stripe'][i] })),
};
export function lookFor(kind: SignKind, tplId: string): Partial<SignSpec> {
  const l = LOOKS[kind]; const i = Math.max(0, SIGN_TEMPLATES.findIndex((t) => t.id === tplId));
  // cảnh có dải gắn bảng hẹp (mặt phố) chỉ hợp bảng ngang dài; bảng vuông/tròn/dọc xoay sang tường khác
  const tp = SIGN_TEMPLATES[i]; const all = KIND_SCENES[kind];
  const fit = all.filter((id) => !SIGN_SCENES.find((x) => x.id === id)?.zone || tp.w / tp.h >= 2);
  const sc = fit.length ? fit : all; const scene = sc[i % sc.length];
  const rec = kind === 'cnc' ? SIGN_SCENES.find((x) => x.id === scene)?.cnc : undefined;
  return { halo: true, ...l[i % l.length], scene, ...rec };
}
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
function Content({ t, d, W, H, font, fill, arcId, accent }: { t: SignTemplate; d: SignData; W: number; H: number; font: SignFont; fill: string; arcId: string; accent?: string }) {
  const acc = accent || fill; // chữ phụ + thanh/hạt trang trí
  const subUp = (d.sub || '').toUpperCase();
  const isSub = (s: string) => !!d.sub && (s === d.sub || s === subUp);
  const main = { family: font.family, weight: font.weight };
  const sub = font.group === 'script' ? main : SUB;
  const pad = Math.min(W, H) * 0.1;
  const T = (text: string, x: number, y: number, size: number, f: { family: string; weight: number }, anchor: 'start' | 'middle' = 'middle', spacing = 0) => text ? (
    <text x={x} y={y} fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={size} textAnchor={anchor} letterSpacing={spacing ? spacing * size : undefined} fill={isSub(text) ? acc : fill}>{text}</text>
  ) : null;
  const Ic = d.icon && d.icon !== 'none' ? iconById(d.icon) : null;
  const icon = (x: number, y: number, s: number) => Ic ? <Ic x={x} y={y} width={s} height={s} size={s} weight="fill" color={fill} /> : null;
  const out: ReactNode[] = [];

  if (t.id === 'villa') {
    const s = Ic ? H * 0.72 : 0; const x1 = W - pad - (Ic ? s + pad * 0.4 : 0); const cx = (pad + x1) / 2; const tw = x1 - pad;
    const ns = fit(d.name, main, tw, H * 0.36); const ss = fit(d.sub, sub, tw * 0.75, H * 0.19);
    out.push(T(d.name, cx, d.sub ? H * 0.5 : H * 0.6, ns, main), T(d.sub, cx, H * 0.5 + ss * 1.25, ss, sub));
    out.push(icon(W - pad - s, (H - s) / 2, s));
  } else if (t.id === 'houseno') {
    const ns = fit(d.number, main, W * 0.7, H * 0.5); const ss = fit(d.street.toUpperCase(), main, W - pad * 2, H * 0.19);
    out.push(T(d.number, W / 2, H * 0.52, ns, main));
    out.push(<rect key="rule" x={pad} y={H * 0.6} width={W - pad * 2} height={Math.max(3, H * 0.022)} fill={acc} />);
    out.push(T(d.street.toUpperCase(), W / 2, H * 0.6 + H * 0.06 + ss * 0.78, ss, main));
  } else if (t.id === 'shop') {
    const ns = fit(d.name, main, W - pad * 2, H * 0.27); const ss = fit(d.sub, SUB, W * 0.75, H * 0.095, 0.3);
    out.push(T(d.name, W / 2, d.sub ? H * 0.53 : H * 0.6, ns, main), T(d.sub, W / 2, H * 0.53 + ns * 0.35 + ss * 1.4, ss, SUB, 'middle', 0.35));
  } else if (t.id === 'long') {
    const s = Ic ? H * 0.62 : 0; const x0 = pad + (Ic ? s + pad * 0.7 : 0); const tw = W - x0 - pad;
    const ns = fit(d.name.toUpperCase(), main, tw, H * 0.42); const ss = fit(d.sub, SUB, tw, H * 0.16, 0.12);
    out.push(icon(pad, (H - s) / 2, s));
    out.push(T(d.name.toUpperCase(), x0, d.sub ? H * 0.5 + ns * 0.12 : H * 0.5 + ns * 0.36, ns, main, 'start'), T(d.sub, x0, H * 0.5 + ns * 0.12 + ss * 1.6, ss, SUB, 'start', 0.12));
  } else if (t.id === 'logo') {
    const s = Ic ? H * 0.4 : 0; const ns = fit(d.name.toUpperCase(), main, W - pad * 2, Ic ? H * 0.16 : H * 0.3); const ss = fit(d.sub, SUB, W * 0.7, H * 0.075, 0.2);
    out.push(icon((W - s) / 2, pad * 1.1, s));
    const ny = Ic ? pad * 1.1 + s + H * 0.06 + ns * 0.75 : H * 0.55;
    out.push(T(d.name.toUpperCase(), W / 2, ny, ns, main), T(d.sub, W / 2, ny + ss * 2, ss, SUB, 'middle', 0.2));
  } else if (t.id === 'arch') {
    const s = Ic ? W * 0.3 : 0; const ns = fit(d.number, main, W * 0.72, H * 0.32); const ss = fit(d.street.toUpperCase(), main, W - pad * 2, H * 0.085);
    out.push(icon((W - s) / 2, W * 0.16, s));
    out.push(T(d.number, W / 2, H * 0.66, ns, main));
    out.push(<rect key="rule" x={pad * 1.2} y={H * 0.72} width={W - pad * 2.4} height={Math.max(3, H * 0.014)} fill={acc} />);
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
    out.push(<circle key="d1" cx={cx - ar} cy={cy + r * 0.08} r={r * 0.035} fill={acc} />, <circle key="d2" cx={cx + ar} cy={cy + r * 0.08} r={r * 0.035} fill={acc} />);
  }
  // ---- mẫu bổ sung ----
  const bar = (x: number, y: number, w: number, h = Math.max(3, Math.min(W, H) * 0.014)) => <rect x={x} y={y - h / 2} width={w} height={h} fill={acc} />;
  const diamond = (x: number, y: number, s: number) => <rect x={x - s / 2} y={y - s / 2} width={s} height={s} fill={acc} transform={`rotate(45 ${x} ${y})`} />;
  if (t.id === 'frame') {
    // khung 4 thanh rời (chừa khe ở góc để lõi không rơi) + hạt kim cương ở góc
    const b = Math.min(W, H) * 0.07, g = Math.min(W, H) * 0.05, th = Math.max(3, Math.min(W, H) * 0.014);
    out.push(bar(b + g, b, W - 2 * (b + g), th), bar(b + g, H - b, W - 2 * (b + g), th));
    out.push(<rect x={b - th / 2} y={b + g} width={th} height={H - 2 * (b + g)} fill={acc} />, <rect x={W - b - th / 2} y={b + g} width={th} height={H - 2 * (b + g)} fill={acc} />);
    for (const [x, y] of [[b, b], [W - b, b], [b, H - b], [W - b, H - b]]) out.push(diamond(x, y, g * 0.7));
    const ns = fit(d.name, main, W - pad * 3.2, H * 0.3); const ss = fit(subUp, SUB, W * 0.6, H * 0.09, 0.3);
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
    const ns = fit(d.name, main, W * 0.66, H * 0.3); const ss = fit(subUp, SUB, W * 0.42, H * 0.09, 0.3);
    out.push(T(d.name, W / 2, d.sub ? H * 0.52 : H * 0.58, ns, main));
    if (d.sub) { const sw = textW(subUp, SUB.family, SUB.weight, ss, 0.3); const sy = H * 0.52 + ns * 0.28 + ss * 1.5; out.push(T(subUp, W / 2, sy, ss, SUB, 'middle', 0.3), diamond(W / 2 - sw / 2 - ss, sy - ss * 0.35, ss * 0.45), diamond(W / 2 + sw / 2 + ss, sy - ss * 0.35, ss * 0.45)); }
    out.push(bar(W * 0.4, H * 0.16, W * 0.2), bar(W * 0.4, H * 0.84, W * 0.2));
  } else if (t.id === 'hanging') {
    const hr = Math.min(W, H) * 0.028;
    out.push(<circle cx={W * 0.12} cy={H * 0.12} r={hr} fill={fill} />, <circle cx={W * 0.88} cy={H * 0.12} r={hr} fill={fill} />);
    const s = Ic ? H * 0.2 : 0; const ns = fit(d.name, main, W - pad * 2.4, H * 0.3); const ss = fit(d.sub, SUB, W * 0.62, H * 0.095, 0.15);
    out.push(icon((W - s) / 2, H * 0.08, s));
    out.push(T(d.name, W / 2, H * 0.64, ns, main), T(d.sub, W / 2, H * 0.64 + ns * 0.3 + ss * 1.5, ss, SUB, 'middle', 0.15));
  } else if (t.id === 'split') {
    const ns = fit(d.number, main, W * 0.42, H * 0.72); const nw = textW(d.number, main.family, main.weight, ns);
    const dx = pad + nw + pad * 0.7; const x2 = dx + pad * 0.7; const tw = W - x2 - pad;
    const ss = fit(d.street.toUpperCase(), main, tw, H * 0.2); const bs = fit(subUp, SUB, tw, H * 0.1, 0.12);
    out.push(T(d.number, pad, H / 2 + ns * 0.36, ns, main, 'start'));
    out.push(<rect x={dx} y={H * 0.18} width={Math.max(3, Math.min(W, H) * 0.02)} height={H * 0.64} fill={acc} />);
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
    const ns = fit(d.name.toUpperCase(), main, W - pad * 2.6, H * 0.26); const ss = fit(d.sub, SUB, W * 0.65, H * 0.09, 0.2);
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

// ánh sáng cảnh hắt lên bảng: độ sáng ảnh cảnh (xám, mờ, chuẩn hoá theo tường) nhân lên vùng bảng → bóng lá, quầng đèn rơi đúng lên bảng
function SceneLight({ spec, uid, VW, VH, ox, oy, children }: { spec: SignSpec; uid: string; VW: number; VH: number; ox: number; oy: number; children: React.ReactNode }) {
  const sc = spec.scene && SIGN_SCENES.find((x) => x.id === spec.scene);
  if (!sc) return null;
  const [g, op] = sc.light; const row = `${0.2126 * g} ${0.7152 * g} ${0.0722 * g} 0 0`;
  return (
    <>
      <defs>
        <filter id={`${uid}-lmap`} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation={VW * 0.003} />
          <feColorMatrix type="matrix" values={`${row}  ${row}  ${row}  0 0 0 1 0`} />
        </filter>
        <mask id={`${uid}-lmask`} maskUnits="userSpaceOnUse" x={0} y={0} width={VW} height={VH}><g transform={`translate(${ox} ${oy})`}>{children}</g></mask>
      </defs>
      <g mask={`url(#${uid}-lmask)`} style={{ mixBlendMode: 'multiply' }} opacity={op}>
        <image href={sc.src} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" filter={`url(#${uid}-lmap)`} />
      </g>
    </>
  );
}

// nền: cảnh ảnh thật nếu có, không thì tường vẽ code
function backdrop(spec: SignSpec, uid: string, VW: number, VH: number) {
  const sc = spec.scene && SIGN_SCENES.find((x) => x.id === spec.scene);
  if (!sc) return wallFill(spec.wall, uid, VW);
  return <image href={sc.src} x={0} y={0} width={VW} height={VH} preserveAspectRatio="xMidYMid slice" data-scene={sc.id} />;
}

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
      ) : w.id === 'slat' ? (
        <>
          <defs>
            <pattern id={`${uid}-slat`} width={VW / 22} height={VW} patternUnits="userSpaceOnUse">
              <rect width={VW / 22} height={VW} fill="#7a4e2e" />
              <rect x={VW / 22 * 0.86} width={VW / 22 * 0.14} height={VW} fill="#2a180c" />
              <rect width={VW / 22 * 0.12} height={VW} fill="#9a6a42" opacity={0.6} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${uid}-slat)`} />
        </>
      ) : null}
      <defs>
        <filter id={`${uid}-wall`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={`${0.35 * k}`} numOctaves={2} seed={2} />
          <feColorMatrix values={w.id === 'dark' ? '0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.12 -0.03' : '0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 -0.1'} />
        </filter>
      </defs>
      <rect width="100%" height="100%" filter={`url(#${uid}-wall)`} />
      <defs>
        <radialGradient id={`${uid}-light`} cx="50%" cy="15%" r="80%"><stop offset="0" stopColor="#fff" stopOpacity={w.id === 'dark' ? 0.08 : 0.24} /><stop offset="0.65" stopColor="#fff" stopOpacity={0} /></radialGradient>
        <radialGradient id={`${uid}-vig`} cx="50%" cy="42%" r="78%"><stop offset="0.5" stopColor="#000" stopOpacity={0} /><stop offset="1" stopColor="#000" stopOpacity={w.id === 'dark' ? 0.6 : 0.34} /></radialGradient>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${uid}-light)`} />
      <rect width="100%" height="100%" fill={`url(#${uid}-vig)`} />
    </>
  );
}

// aspect: ép khung cảnh theo tỉ lệ ô chứa (vd 4/3) → tường phủ kín, không hở viền
export function SignSvg({ spec, data, mode = 'preview', style, className, aspect }: { spec: SignSpec; data: SignData; mode?: 'preview' | 'cut'; style?: React.CSSProperties; className?: string; aspect?: number }) {
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

  const M = Math.max(W, H) * (!spec.scene ? 0.14 : ((spec.style === 'paint' || spec.style === 'loose') && (spec.kind || 'cnc') === 'cnc') || spec.kind === 'channel' ? 0.24 : 0.42); /* chữ thẳng tường: không tấm → chữ to hơn */ const th = Math.max(W, H) * 0.007; // lề tường + độ dày tấm
  let VW = W + M * 2, VH = H + M * 2;
  if (aspect) { if (VW / VH < aspect) VW = VH * aspect; else VH = VW / aspect; }
  let ox = (VW - W) / 2, oy = (VH - H) / 2;
  const zone = SIGN_SCENES.find((x) => x.id === spec.scene)?.zone;
  if (zone) { // bảng nằm gọn trong vùng gắn bảng của cảnh (ảnh 4:3, phủ kín khung kiểu slice)
    const [zcx, zcy, zw, zh] = zone, ia = 4 / 3, a = aspect || ia;
    VW = a >= ia ? Math.max(W / zw, (H * ia) / zh) : Math.max((W * a) / (zw * ia), (H * a) / zh); VH = VW / a;
    const Iw = Math.max(VW, VH * ia), Ih = Iw / ia;
    ox = (VW - Iw) / 2 + zcx * Iw - W / 2; oy = (VH - Ih) / 2 + zcy * Ih - H / 2;
  }
  const kind = spec.kind || 'cnc';
  if (kind !== 'cnc') return <SignKindSvg spec={spec} data={data} uid={uid} t={t} W={W} H={H} ox={ox} oy={oy} th={th} VW={VW} VH={VH} shape={shape} font={font} m={m} L={L} style={style} className={className} />;
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
        <mask id={`${uid}-mask`} maskUnits="userSpaceOnUse" x={-ox} y={-oy} width={VW} height={VH}>
          <path d={shape} fill="#ffffff" />
          <Content t={t} d={data} W={W} H={H} font={font} fill="#000000" arcId={`${arcId}m`} />
        </mask>
        <filter id={`${uid}-blur`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={th * 2.2} /></filter>
        <filter id={`${uid}-paint`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency={(0.6 * 900) / W} numOctaves={2} seed={3} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -1.1 1.62" result="m" />
          <feComposite in="SourceGraphic" in2="m" operator="in" />
        </filter>
        <filter id={`${uid}-tsh`} x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation={Math.min(W, H) * 0.006} /></filter>
        <filter id={`${uid}-lift`} x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx={0} dy={th * 0.6} stdDeviation={th * 0.5} floodOpacity={0.45} /></filter>
      </defs>
      {backdrop(spec, uid, VW, VH)}
      <g transform={`translate(${ox} ${oy})`}>
        <path d={shape} fill="none" data-plate="" />
        {spec.style !== 'loose' && spec.style !== 'paint' && <path d={shape} fill="#000" opacity={0.38} filter={`url(#${uid}-blur)`} transform={`translate(${th * 1.2} ${th * 3})`} />}
        {spec.style === 'cut' ? (
          <>
            <g transform={`translate(${th * 0.5} ${th})`}><g mask={`url(#${uid}-mask)`}><path d={shape} fill={m.edge} /></g></g>
            <g mask={`url(#${uid}-mask)`}>{plate}</g>
          </>
        ) : spec.style === 'paint' ? (
          // chữ sơn thẳng lên tường: hoà vào vân tường (multiply) + mép sơn sờn
          <g opacity={0.96} filter={`url(#${uid}-paint)`} style={{ mixBlendMode: L.id === 'white' ? 'normal' : 'multiply' }}>
            <Content t={t} d={data} W={W} H={H} font={font} fill={L.id === 'white' ? '#f3eee4' : L.id === 'black' || lum(L.base) > 0.55 ? '#211812' : L.base} arcId={arcId} />
          </g>
        ) : spec.style === 'loose' ? (
          <>
            {/* chữ rời bắt thẳng tường, không tấm */}
            <g opacity={0.5} filter={`url(#${uid}-tsh)`} transform={`translate(${th * 1.2} ${th * 2.4})`}><Content t={t} d={data} W={W} H={H} font={font} fill="#000000" arcId={`${arcId}s`} /></g>
            <g transform={`translate(${th * 0.4} ${th * 0.7})`}><Content t={t} d={data} W={W} H={H} font={font} fill={L.edge} arcId={`${arcId}e`} /></g>
            <Content t={t} d={data} W={W} H={H} font={font} fill={fillOf(L, uid, 'letter')} arcId={arcId} />
          </>
        ) : spec.style === 'standoff' ? (
          <>
            <path d={shape} fill="#000" opacity={0.3} filter={`url(#${uid}-blur)`} transform={`translate(${th * 4} ${th * 7})`} />
            <path d={shape} fill={m.edge} transform={`translate(${th * 0.5} ${th})`} />
            {plate}
            <g filter={`url(#${uid}-lift)`}><Content t={t} d={data} W={W} H={H} font={font} fill={fillOf(L, uid, 'letter')} arcId={arcId} /></g>
            <Bolts W={W} H={H} shape={t.shape} />
          </>
        ) : (
          <>
            <path d={shape} fill={m.edge} transform={`translate(${th * 0.5} ${th})`} />
            {plate}
            <g filter={`url(#${uid}-lift)`}><Content t={t} d={data} W={W} H={H} font={font} fill={fillOf(L, uid, 'letter')} arcId={arcId} /></g>
          </>
        )}
      </g>
      {spec.style !== 'paint' && (
        <SceneLight spec={spec} uid={uid} VW={VW} VH={VH} ox={ox} oy={oy}>
          {spec.style === 'loose' ? <Content t={t} d={data} W={W} H={H} font={font} fill="#ffffff" arcId={`${arcId}l`} /> : <path d={shape} fill="#ffffff" />}
        </SceneLight>
      )}
    </svg>
  );
}

// Ốc inox 4 góc (chỉ tấm chữ nhật / vát góc)
function Bolts({ W, H, shape }: { W: number; H: number; shape?: SignTemplate['shape'] }) {
  if (shape && shape !== 'rect' && shape !== 'chamfer') return null;
  const m = Math.min(W, H), br = m * 0.02, bi = shape === 'chamfer' ? m * 0.1 : m * 0.038;
  return <>{[[bi, bi], [W - bi, bi], [bi, H - bi], [W - bi, H - bi]].map(([x, y], i) => (
    <g key={i}>
      <circle cx={x + br * 0.25} cy={y + br * 0.4} r={br} fill="#000" opacity={0.35} />
      <circle cx={x} cy={y} r={br} fill="#b9bdc3" stroke="#6f747a" strokeWidth={br * 0.18} />
      <circle cx={x - br * 0.3} cy={y - br * 0.3} r={br * 0.35} fill="#fff" opacity={0.75} />
    </g>
  ))}</>;
}
const lum = (h: string) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };

// Các loại bảng hiệu ngoài CNC: neon, hộp đèn, chữ nổi LED, khắc laser, bảng phấn, in màu — mỗi loại vài kiểu (spec.variant)
function SignKindSvg({ spec, data, uid, t, W, H, ox, oy, th, VW, VH, shape, font, m, L, style, className }: {
  spec: SignSpec; data: SignData; uid: string; t: SignTemplate; W: number; H: number; ox: number; oy: number; th: number; VW: number; VH: number;
  shape: string; font: SignFont; m: Material; L: Material; style?: React.CSSProperties; className?: string;
}) {
  const kind = spec.kind || 'cnc';
  const v = variantOf(spec);
  const C = (fill: string, arc: string, accent?: string) => <Content t={t} d={data} W={W} H={H} font={font} fill={fill} accent={accent} arcId={`${uid}-${arc}`} />;
  const minWH = Math.min(W, H);
  const rectish = !t.shape || t.shape === 'rect' || t.shape === 'chamfer';
  const inset = (k: number) => { const ins = minWH * k, sx = (W - ins * 2) / W, sy = (H - ins * 2) / H; return { tf: `translate(${ins} ${ins}) scale(${sx} ${sy})`, sw: (w: number) => w / Math.min(sx, sy) }; };
  const blurF = (id: string, sd: number) => <filter key={id} id={`${uid}-${id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation={sd} /></filter>;
  const shadow = <path d={shape} fill="#000" opacity={0.38} filter={`url(#${uid}-blur)`} transform={`translate(${th * 1.2} ${th * 3})`} />;
  const letterShadow = (k: string, o = 0.45) => <g opacity={o} filter={`url(#${uid}-tsh)`} transform={`translate(${th * 0.9} ${th * 1.8})`}>{C('#000000', k)}</g>;
  const plate = (
    <>
      <path d={shape} fill={m.edge} transform={`translate(${th * 0.5} ${th})`} />
      <path d={shape} fill={fillOf(m, uid, 'plate')} />
      <g clipPath={`url(#${uid}-clip)`}><Texture m={m} uid={uid} /></g>
    </>
  );
  let body: ReactNode = null;
  const defs: ReactNode[] = [blurF('tsh', minWH * 0.006)];

  if (kind === 'neon') {
    const nc = spec.color || NEON_COLORS[0]; const na = spec.accent || nc;
    defs.push(blurF('glowL', minWH * 0.035), blurF('glowS', minWH * 0.008));
    const glow = (make: (f: string, a: string, k: string) => ReactNode) => (
      <>
        <g opacity={0.75} filter={`url(#${uid}-glowL)`}>{make(nc, na, 'n1')}</g>
        <g filter={`url(#${uid}-glowS)`}>{make(nc, na, 'n2')}</g>
        {make(hexMix(nc, '#ffffff', 0.72), hexMix(na, '#ffffff', 0.72), 'n3')}
      </>
    );
    const ib = inset(0.05);
    let board: ReactNode;
    if (v === 'contour') {
      // mica cắt ôm theo chữ
      const r = minWH * 0.05;
      defs.push(
        <filter key="ct" id={`${uid}-contour`} x="-25%" y="-25%" width="150%" height="150%">
          <feMorphology in="SourceAlpha" operator="dilate" radius={r} result="a" />
          <feMorphology in="SourceAlpha" operator="dilate" radius={r * 1.12} result="b" />
          <feComposite in="b" in2="a" operator="out" result="edge" />
          <feFlood floodColor="#ffffff" floodOpacity={0.08} /><feComposite in2="a" operator="in" result="fill" />
          <feFlood floodColor="#ffffff" floodOpacity={0.4} /><feComposite in2="edge" operator="in" result="ed" />
          <feMerge><feMergeNode in="fill" /><feMergeNode in="ed" /></feMerge>
        </filter>,
      );
      board = <g filter={`url(#${uid}-contour)`}>{C('#ffffff', 'nb')}</g>;
    } else if (v === 'wall') {
      board = letterShadow('ns', 0.55); // ống neon bắt thẳng tường
    } else if (v === 'black') {
      board = <>{shadow}<path d={shape} fill="#121314" />{glow((_, a, k) => <path key={k} d={shape} fill="none" stroke={a} strokeWidth={ib.sw(minWH * 0.012)} transform={ib.tf} />)}</>;
    } else {
      board = (
        <>
          <path d={shape} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.18)" strokeWidth={th * 0.5} />
          {[[0.06, 0.08], [0.94, 0.08], [0.06, 0.92], [0.94, 0.92]].map(([x, y], i) => <circle key={i} cx={W * x} cy={H * y} r={minWH * 0.012} fill="#cfd3d8" opacity={0.7} />)}
        </>
      );
    }
    body = <>{board}{glow((f, a, k) => C(f, k, a))}</>;
  } else if (kind === 'lightbox') {
    const face = spec.color || FACE_COLORS[0]; const ink = spec.ink || INK_COLORS[0]; const acc = spec.accent || ink;
    defs.push(
      <radialGradient key="lit" id={`${uid}-lit`} cx="50%" cy="45%" r="65%"><stop offset="0" stopColor="#fff" stopOpacity={0.38} /><stop offset="1" stopColor="#fff" stopOpacity={0} /></radialGradient>,
      blurF('boxglow', minWH * 0.06), blurF('lglow', minWH * 0.02),
    );
    if (v === 'letterlit') {
      // hộp tối, chỉ chữ sáng
      const lit = lum(face) < 0.15 || lum(face) > 0.9 ? ink : face;
      body = (
        <>
          {shadow}
          <path d={shape} fill="#151618" />
          <g opacity={0.85} filter={`url(#${uid}-lglow)`}>{C(lit, 'lg', acc)}</g>
          {C(hexMix(lit, '#ffffff', 0.35), 'lc', hexMix(acc, '#ffffff', 0.35))}
          <path d={shape} fill="none" stroke="#2a2c30" strokeWidth={minWH * 0.035} />
        </>
      );
    } else if (v === 'spot') {
      // biển không đèn trong, 2 đèn rọi cần cong phía trên
      defs.push(<linearGradient key="cone" id={`${uid}-cone`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fff6e0" stopOpacity={0.5} /><stop offset="1" stopColor="#fff6e0" stopOpacity={0} /></linearGradient>);
      const hy = -minWH * 0.1, by = -minWH * 0.3, cw = Math.min(W * 0.24, minWH * 0.7);
      body = (
        <>
          {shadow}
          <path d={shape} fill={hexMix(face, '#000000', 0.45)} transform={`translate(${th * 0.4} ${th * 0.6})`} />
          <path d={shape} fill={face} />
          {C(ink, 'l1', acc)}
          <path d={shape} fill="none" stroke="#2a2c30" strokeWidth={minWH * 0.012} />
          {[W * 0.25, W * 0.75].map((x, i) => (
            <g key={i}>
              <path d={`M ${x - cw * 0.05} ${hy} L ${x - cw} ${H * 0.75} L ${x + cw} ${H * 0.75} L ${x + cw * 0.05} ${hy} Z`} fill={`url(#${uid}-cone)`} />
              <path d={`M ${x} ${by} Q ${x} ${hy - minWH * 0.08} ${x} ${hy}`} stroke="#1c1d20" strokeWidth={minWH * 0.012} fill="none" />
              <rect x={x - minWH * 0.025} y={by - minWH * 0.02} width={minWH * 0.05} height={minWH * 0.03} rx={minWH * 0.006} fill="#1c1d20" />
              <path d={`M ${x - minWH * 0.04} ${hy + minWH * 0.02} L ${x - minWH * 0.025} ${hy - minWH * 0.025} H ${x + minWH * 0.025} L ${x + minWH * 0.04} ${hy + minWH * 0.02} Z`} fill="#1c1d20" />
              <ellipse cx={x} cy={hy + minWH * 0.02} rx={minWH * 0.034} ry={minWH * 0.008} fill="#fff6e0" />
            </g>
          ))}
        </>
      );
    } else {
      const slim = v === 'slim';
      body = (
        <>
          <path d={shape} fill={face} opacity={slim ? 0.4 : 0.55} filter={`url(#${uid}-boxglow)`} />
          {shadow}
          <path d={shape} fill={face} />
          <path d={shape} fill={`url(#${uid}-lit)`} />
          {C(ink, 'l1', acc)}
          <path d={shape} fill="none" stroke={slim ? '#d5d8dc' : '#2a2c30'} strokeWidth={minWH * (slim ? 0.022 : 0.05)} />
          <path d={shape} fill="none" stroke={slim ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.25)'} strokeWidth={th * 0.4} transform={`translate(${th * 0.3} ${th * 0.3})`} />
        </>
      );
    }
  } else if (kind === 'channel') {
    const side = hexMix(L.edge, '#000000', 0.1); const depth = Math.max(3, minWH * 0.012);
    const hc = spec.color || HALO_COLORS[0];
    defs.push(blurF('halo', minWH * 0.025), blurF('fglow', minWH * 0.018));
    const extrude = (c: string) => [4, 3, 2, 1].map((i) => <g key={i} transform={`translate(${depth * i * 0.35} ${depth * i * 0.5})`}>{C(c, `c${i}`)}</g>);
    if (v === 'front') {
      // chữ mặt sáng (mica phát sáng), thành chữ tối, gắn thẳng tường
      body = (
        <>
          {letterShadow('cs', 0.4)}
          <g opacity={0.7} filter={`url(#${uid}-fglow)`}>{C(hc, 'cg')}</g>
          {extrude('#1d1e20')}
          {C(hexMix(hc, '#ffffff', 0.45), 'c5')}
        </>
      );
    } else {
      body = (
        <>
          {spec.halo !== false && <g opacity={0.95} filter={`url(#${uid}-halo)`}>{C(hc, 'c0')}</g>}
          {extrude(side)}
          {C(fillOf(L, uid, 'letter'), 'c5')}
        </>
      );
    }
  } else if (kind === 'engrave') {
    defs.push(blurF('burn', minWH * 0.004), blurF('burn2', minWH * 0.012));
    const ink = ENGRAVE_INK[m.id] || '#333333';
    const gold = m.id === 'gold' ? '#3b2a0c' : '#ddb156';
    const marks = v === 'relief' ? (
      <>
        <g opacity={0.5} filter={`url(#${uid}-tsh)`} transform={`translate(${th * 0.5} ${th * 0.9})`}>{C('#000000', 'e0')}</g>
        <g opacity={0.45} transform={`translate(${-th * 0.25} ${-th * 0.35})`}>{C('#ffffff', 'e1')}</g>
        {C(fillOf(m, uid, 'plate'), 'e2')}
      </>
    ) : v === 'burn' ? (
      <>
        <g opacity={0.5} filter={`url(#${uid}-burn2)`}>{C('#5a2c0c', 'e1')}</g>
        <g opacity={0.92} filter={`url(#${uid}-burn)`}>{C('#22110a', 'e2')}</g>
      </>
    ) : v === 'gold' ? (
      <>
        <g opacity={0.55} transform={`translate(0 ${-th * 0.3})`}>{C('#000000', 'e1')}</g>
        {C(gold, 'e2')}
      </>
    ) : (
      <>
        <g opacity={0.35} transform={`translate(0 ${th * 0.3})`}>{C('#ffffff', 'e1')}</g>
        <g opacity={0.88}>{C(ink, 'e2')}</g>
      </>
    );
    body = <>{shadow}{plate}<g clipPath={`url(#${uid}-clip)`}>{marks}</g></>;
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
    const board = (
      <>
        <path d={shape} fill={spec.bg || '#1f2a27'} />
        <g clipPath={`url(#${uid}-clip)`}><rect x={-50} y={-50} width="200%" height="200%" filter={`url(#${uid}-board)`} /></g>
        <g filter={`url(#${uid}-chalk)`}>{C(ink, 'k1', spec.accent)}</g>
      </>
    );
    if (v === 'clip') {
      // bảng trơn viền nhựa, 2 kẹp sắt phía trên
      body = (
        <>
          {shadow}{board}
          <path d={shape} fill="none" stroke="#0d0e0f" strokeWidth={minWH * 0.018} />
          {[W * 0.3, W * 0.7].map((x, i) => (
            <g key={i}>
              <rect x={x - minWH * 0.06} y={-minWH * 0.02} width={minWH * 0.12} height={minWH * 0.07} rx={minWH * 0.01} fill="#2b2d31" stroke="#55595f" strokeWidth={minWH * 0.004} />
              <path d={`M ${x - minWH * 0.04} ${-minWH * 0.02} Q ${x} ${-minWH * 0.1} ${x + minWH * 0.04} ${-minWH * 0.02}`} fill="none" stroke="#a9adb3" strokeWidth={minWH * 0.008} />
            </g>
          ))}
        </>
      );
    } else {
      const hang = v === 'hang';
      const ny = -minWH * 0.24;
      body = (
        <>
          {hang && <>
            <path d={`M ${W * 0.18} ${minWH * 0.03} L ${W / 2} ${ny} L ${W * 0.82} ${minWH * 0.03}`} fill="none" stroke="#000" strokeOpacity={0.3} strokeWidth={minWH * 0.012} transform={`translate(${th} ${th * 2})`} />
            <path d={`M ${W * 0.18} ${minWH * 0.03} L ${W / 2} ${ny} L ${W * 0.82} ${minWH * 0.03}`} fill="none" stroke="#c9a97a" strokeWidth={minWH * 0.012} strokeLinejoin="round" />
            <circle cx={W / 2} cy={ny} r={minWH * 0.018} fill="#6b6f75" />
          </>}
          {shadow}{board}
          <path d={shape} fill="none" stroke="#7a4a24" strokeWidth={minWH * (hang ? 0.04 : 0.06)} />
          <path d={shape} fill="none" stroke="#a36a3b" strokeWidth={minWH * (hang ? 0.014 : 0.02)} />
        </>
      );
    }
  } else if (kind === 'print') {
    const pal = PRINT_PALETTES[0];
    const face = spec.color || pal.face; const ink = spec.ink || pal.ink; const acc = spec.accent || ink;
    const base = (
      <>
        {shadow}
        <path d={shape} fill={hexMix(face, '#000000', 0.45)} transform={`translate(${th * 0.4} ${th * 0.6})`} />
        <path d={shape} fill={face} />
      </>
    );
    if (v === 'banner') {
      // bạt hiflex: khoen + dây buộc, nếp gấp nhẹ
      const e = minWH * 0.04, r = minWH * 0.016;
      const pts = rectish ? [[e, e], [W - e, e], [e, H - e], [W - e, H - e], ...(W > H * 1.6 ? [[W / 2, e], [W / 2, H - e]] : [])] : [];
      body = (
        <>
          {pts.map(([x, y], i) => <line key={`r${i}`} x1={x} y1={y} x2={x + (x < W / 2 ? -1 : x > W / 2 ? 1 : 0) * minWH * 0.09} y2={y + (y < H / 2 ? -1 : 1) * minWH * 0.09} stroke="#e8e2d0" strokeWidth={minWH * 0.006} />)}
          {shadow}<path d={shape} fill={face} />
          <g clipPath={`url(#${uid}-clip)`}>{[0.33, 0.66].map((k) => <rect key={k} x={W * k} y={0} width={minWH * 0.01} height={H} fill="#000" opacity={0.05} />)}</g>
          {C(ink, 'p1', acc)}
          {pts.map(([x, y], i) => <g key={`e${i}`}><circle cx={x} cy={y} r={r} fill="#d9dbde" stroke="#8a8f95" strokeWidth={r * 0.2} /><circle cx={x} cy={y} r={r * 0.5} fill="#1b1c1e" /></g>)}
        </>
      );
    } else if (v === 'stripe') {
      const b = minWH * 0.055;
      body = (
        <>
          {base}
          <g clipPath={`url(#${uid}-clip)`}>
            <rect x={0} y={0} width={W} height={b} fill={acc} /><rect x={0} y={H - b} width={W} height={b} fill={acc} />
            <rect x={0} y={b + minWH * 0.012} width={W} height={minWH * 0.006} fill={acc} /><rect x={0} y={H - b - minWH * 0.018} width={W} height={minWH * 0.006} fill={acc} />
          </g>
          {C(ink, 'p1', acc)}
        </>
      );
    } else if (v === 'frame') {
      const ii = inset(0.065);
      body = (
        <>
          {base}
          <g clipPath={`url(#${uid}-clip)`}><path d={shape} fill="none" stroke={acc} strokeWidth={minWH * 0.09} /></g>
          <path d={shape} fill="none" stroke={ink} strokeOpacity={0.55} strokeWidth={ii.sw(minWH * 0.005)} transform={ii.tf} />
          {C(ink, 'p1', acc)}
        </>
      );
    } else {
      const ii = inset(0.075);
      body = (
        <>
          {base}
          {t.id !== 'frame' && <path d={shape} fill="none" stroke={acc} strokeWidth={ii.sw(minWH * 0.009)} transform={ii.tf} />}
          {C(ink, 'p1', acc)}
          <Bolts W={W} H={H} shape={t.shape} />
        </>
      );
    }
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
      {backdrop(spec, uid, VW, VH)}
      <g transform={`translate(${ox} ${oy})`}><path d={shape} fill="none" data-plate="" />{body}</g>
      {(kind === 'engrave' || kind === 'print' || kind === 'chalk') && <SceneLight spec={spec} uid={uid} VW={VW} VH={VH} ox={ox} oy={oy}><path d={shape} fill="#ffffff" /></SceneLight>}
    </svg>
  );
}
