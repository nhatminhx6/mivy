'use client';
// Ốp lưng điện thoại in hình: thiết kế mặt lưng ốp (đơn vị SVG = mm) theo MÁY CHUNG (định nghĩa bằng kích thước,
// không dùng tên hãng/dòng máy) × KIỂU ỐP (dẻo trong / cứng in tràn viền / viền màu) × BỐ CỤC × BẢNG MÀU × FONT.
// Ô camera luôn ở mép trên (góc trái hoặc giữa) → vùng chữ đặt dưới ô camera, không lấn lỗ khoét.
// Chế độ vẽ: preview (mockup phẳng có màu máy/viền) · tex (texture 3D) · print (file in: lề xén, lỗ camera không in,
// CutContour; in tràn viền thì trải thêm phần quấn cạnh + vạch gấp + vị trí lỗ nút). Ảnh khách chỉ nằm trên máy.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { coverRect, photoDpi, samplePhotos, type CVPhoto } from './canvas-engine';

// ---------- máy (chung, theo kích thước) ----------
export type CamKind = 'sq' | 'pill' | 'round';
export interface PCModel {
  id: string; name: string; hint: string;
  pW: number; pH: number; T: number; r: number;              // thân máy (mm)
  cam: { kind: CamKind; x: number; y: number; w: number; h: number; r: number }; // cụm camera (toạ độ thân máy, nhìn từ lưng, y xuống)
  lenses: { x: number; y: number; r: number }[]; flash: { x: number; y: number; r: number };
}
export const PC_MODELS: PCModel[] = [
  { id: 'p61', name: 'Máy 6.1 inch', hint: 'camera vuông góc trái', pW: 71.6, pH: 147.6, T: 7.9, r: 10.5,
    cam: { kind: 'sq', x: 5.5, y: 5.5, w: 34, h: 34, r: 8 }, lenses: [{ x: 14, y: 14, r: 6 }, { x: 14, y: 29.5, r: 6 }], flash: { x: 29, y: 13, r: 2.2 } },
  { id: 'p67', name: 'Máy 6.7 inch', hint: 'camera vuông góc trái', pW: 77.6, pH: 160.8, T: 7.9, r: 11,
    cam: { kind: 'sq', x: 6, y: 6, w: 38, h: 38, r: 9 }, lenses: [{ x: 15.5, y: 15.5, r: 6.7 }, { x: 15.5, y: 32.5, r: 6.7 }], flash: { x: 32.5, y: 14.5, r: 2.4 } },
  { id: 'p65', name: 'Máy 6.5 inch', hint: 'camera dọc', pW: 75.8, pH: 162, T: 8.3, r: 9,
    cam: { kind: 'pill', x: 8, y: 8, w: 21, h: 58, r: 10.5 }, lenses: [{ x: 18.5, y: 18.5, r: 5.8 }, { x: 18.5, y: 32, r: 5.8 }, { x: 18.5, y: 45.5, r: 5.8 }], flash: { x: 18.5, y: 57.5, r: 2.2 } },
  { id: 'p64', name: 'Máy 6.4 inch', hint: 'camera tròn giữa', pW: 74.5, pH: 158, T: 8.1, r: 10,
    cam: { kind: 'round', x: 20.25, y: 9, w: 34, h: 34, r: 17 }, lenses: [{ x: 30.4, y: 19.2, r: 4.6 }, { x: 44.1, y: 19.2, r: 4.6 }, { x: 30.4, y: 32.8, r: 4.6 }, { x: 44.1, y: 32.8, r: 4.6 }], flash: { x: 37.25, y: 26, r: 1.6 } },
];
export const pcModel = (id: string) => PC_MODELS.find((m) => m.id === id) || PC_MODELS[0];

export const PC_WALL = 1.3;   // thành ốp (mm)
export const PC_BACK = 1.1;   // lưng ốp (mm)
export const PC_BLEED = 2;    // lề xén file in (mm)

export interface Rect { x: number; y: number; w: number; h: number; r: number }
/** kích thước ốp (mặt lưng nhìn từ sau, gốc trên-trái), lỗ camera, vùng cấm chữ, vị trí nút ở 2 cạnh */
export function pcDims(id: string) {
  const m = pcModel(id), t = PC_WALL;
  const W = m.pW + t * 2, H = m.pH + t * 2, r = m.r + t;
  const D = m.T + PC_BACK + 0.9;                        // chiều sâu thành ốp (ôm qua mặt kính 0.9mm)
  const g = 1.4;                                        // hở quanh cụm camera
  const c = m.cam;
  const hole: Rect = { x: c.x + t - g, y: c.y + t - g, w: c.w + g * 2, h: c.h + g * 2, r: c.kind === 'round' ? (c.w + g * 2) / 2 : c.r + g };
  const keep: Rect = { x: hole.x - 3, y: hole.y - 3, w: hole.w + 6, h: hole.h + 6, r: 0 };
  const buttons = [
    { side: 'R' as const, y: H * 0.25, len: H * 0.1 },   // nút nguồn (cạnh phải khi nhìn mặt kính = cạnh TRÁI khi nhìn lưng)
    { side: 'L' as const, y: H * 0.19, len: H * 0.07 },
    { side: 'L' as const, y: H * 0.28, len: H * 0.07 },
  ];
  return { m, W, H, r, D, hole, keep, buttons };
}

export function rrPath(x: number, y: number, w: number, h: number, r: number): string {
  const k = Math.min(r, w / 2, h / 2);
  return `M${x + k} ${y}H${x + w - k}A${k} ${k} 0 0 1 ${x + w} ${y + k}V${y + h - k}A${k} ${k} 0 0 1 ${x + w - k} ${y + h}H${x + k}A${k} ${k} 0 0 1 ${x} ${y + h - k}V${y + k}A${k} ${k} 0 0 1 ${x + k} ${y}Z`;
}
export const holePath = (h: Rect) => rrPath(h.x, h.y, h.w, h.h, h.r);

// ---------- kiểu ốp / màu ----------
export type CaseType = 'clear' | 'hard' | 'rim';
export const PC_CASES: { id: CaseType; name: string; hint: string; material: string }[] = [
  { id: 'hard', name: 'Ốp cứng in tràn viền', hint: 'Hình phủ kín lưng + quấn sang 4 cạnh', material: 'Ốp cứng in tràn viền' },
  { id: 'clear', name: 'Ốp dẻo trong', hint: 'Chỗ không in thấy màu máy bên trong', material: 'Ốp dẻo in UV' },
  { id: 'rim', name: 'Ốp viền màu', hint: 'In lưng, 4 cạnh là viền dẻo màu', material: 'Ốp dẻo in UV' },
];
export const PHONE_COLORS = [
  { id: 'black', name: 'Đen', hex: '#1E1F22' }, { id: 'white', name: 'Trắng', hex: '#EDEDEA' },
  { id: 'blue', name: 'Xanh dương', hex: '#3B5B83' }, { id: 'lilac', name: 'Tím nhạt', hex: '#CFC3E6' },
  { id: 'cream', name: 'Vàng kem', hex: '#F1E6C8' }, { id: 'green', name: 'Xanh lá', hex: '#9DB89A' },
];
export const RIM_COLORS = [
  { id: 'black', name: 'Đen', hex: '#1C1C1F' }, { id: 'white', name: 'Trắng', hex: '#F2F1EE' },
  { id: 'pink', name: 'Hồng', hex: '#EBA3B8' }, { id: 'navy', name: 'Xanh navy', hex: '#26345C' },
  { id: 'lilac', name: 'Tím', hex: '#9C86CF' }, { id: 'red', name: 'Đỏ', hex: '#C8303B' },
];
export const phoneColor = (id: string) => PHONE_COLORS.find((c) => c.id === id) || PHONE_COLORS[0];
export const rimColor = (id: string) => RIM_COLORS.find((c) => c.id === id) || RIM_COLORS[0];

// ---------- font ----------
export interface PCFont { id: string; name: string; family: string; weight: number }
export const PC_FONTS: PCFont[] = [
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800 },
  { id: 'montserrat', name: 'Montserrat (hiện đại)', family: 'Montserrat', weight: 800 },
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'greatvibes', name: 'Great Vibes (chữ ký)', family: 'Great Vibes', weight: 400 },
  { id: 'dancing', name: 'Dancing (viết tay)', family: 'Dancing Script', weight: 700 },
  { id: 'lobster', name: 'Lobster (vui)', family: 'Lobster', weight: 400 },
];
export const pcFont = (id: string) => PC_FONTS.find((f) => f.id === id) || PC_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const PC_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Montserrat:wght@800&family=Baloo+2:wght@800&family=Great+Vibes&family=Dancing+Script:wght@700&family=Lobster&display=swap');`;

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
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface PCPalette { id: string; name: string; bg: string; ink: string; accent: string; accent2: string; soft: string }
export const PC_PALETTES: PCPalette[] = [
  { id: 'blush', name: 'Hồng phấn', bg: '#F7DADF', ink: '#5A2333', accent: '#C9506E', accent2: '#E8B04B', soft: '#FBEAEC' },
  { id: 'sage', name: 'Xanh xô thơm', bg: '#DCE6D5', ink: '#24392B', accent: '#5E8A63', accent2: '#D9A95B', soft: '#EEF3EA' },
  { id: 'navy', name: 'Navy ánh vàng', bg: '#1C2A4D', ink: '#F4EEDC', accent: '#E2B85A', accent2: '#8FA9E0', soft: '#2C3D68' },
  { id: 'black', name: 'Đen nhũ vàng', bg: '#141414', ink: '#F3EFE6', accent: '#D4AF61', accent2: '#8C8C8C', soft: '#2A2A2A' },
  { id: 'cream', name: 'Kem nâu', bg: '#F4EBDD', ink: '#4A3426', accent: '#A9744B', accent2: '#C9A15B', soft: '#FBF6EE' },
  { id: 'lilac', name: 'Tím lavender', bg: '#E4DBF3', ink: '#3A2B5E', accent: '#7B62B8', accent2: '#E9A6C3', soft: '#F2EDFA' },
  { id: 'sky', name: 'Xanh trời', bg: '#D6E8F5', ink: '#1E3A55', accent: '#3F7FB8', accent2: '#F2B544', soft: '#EBF4FB' },
  { id: 'red', name: 'Đỏ son', bg: '#B8242F', ink: '#FFF4E4', accent: '#F2C463', accent2: '#FFFFFF', soft: '#CF3A45' },
];
export const pcPalette = (id: string) => PC_PALETTES.find((p) => p.id === id) || PC_PALETTES[0];

const lum = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
export const darkHex = (hex: string) => lum(hex) < 128;

// ---------- bố cục ----------
export type PCLayout = 'photo' | 'signature' | 'floral' | 'checker' | 'marble' | 'couple' | 'zodiac' | 'quote';
export const PC_LAYOUTS: { id: PCLayout; name: string; photo?: boolean }[] = [
  { id: 'photo', name: 'Ảnh cá nhân', photo: true }, { id: 'signature', name: 'Tên chữ ký' },
  { id: 'floral', name: 'Hoạ tiết hoa' }, { id: 'checker', name: 'Caro' }, { id: 'marble', name: 'Vân đá' },
  { id: 'couple', name: 'Cặp đôi (2 ốp)' }, { id: 'zodiac', name: 'Chòm sao' }, { id: 'quote', name: 'Câu nói' },
];
export const pcLayout = (id: string) => PC_LAYOUTS.find((l) => l.id === id) || PC_LAYOUTS[0];

export interface PCSpec { model: string; caseType: CaseType; layout: PCLayout; palette: string; font: string; phone: string; rim: string }
export interface PCTemplate { id: string; name: string; spec: Pick<PCSpec, 'layout' | 'palette' | 'font'> }
export const PC_TEMPLATES: PCTemplate[] = [
  { id: 'photo-blush', name: 'Ảnh · chữ ký hồng', spec: { layout: 'photo', palette: 'blush', font: 'greatvibes' } },
  { id: 'photo-navy', name: 'Ảnh · Playfair', spec: { layout: 'photo', palette: 'navy', font: 'playfair' } },
  { id: 'sig-cream', name: 'Tên chữ ký · kem', spec: { layout: 'signature', palette: 'cream', font: 'greatvibes' } },
  { id: 'sig-black', name: 'Tên chữ ký · đen nhũ', spec: { layout: 'signature', palette: 'black', font: 'dancing' } },
  { id: 'floral-blush', name: 'Hoa · hồng phấn', spec: { layout: 'floral', palette: 'blush', font: 'playfair' } },
  { id: 'floral-sage', name: 'Hoa · xô thơm', spec: { layout: 'floral', palette: 'sage', font: 'dancing' } },
  { id: 'checker-sky', name: 'Caro · xanh trời', spec: { layout: 'checker', palette: 'sky', font: 'baloo' } },
  { id: 'checker-red', name: 'Caro · đỏ son', spec: { layout: 'checker', palette: 'red', font: 'montserrat' } },
  { id: 'marble-cream', name: 'Vân đá · kem', spec: { layout: 'marble', palette: 'cream', font: 'playfair' } },
  { id: 'marble-black', name: 'Vân đá · đen nhũ', spec: { layout: 'marble', palette: 'black', font: 'playfair' } },
  { id: 'couple-blush', name: 'Cặp đôi · trái tim', spec: { layout: 'couple', palette: 'blush', font: 'dancing' } },
  { id: 'zodiac-navy', name: 'Chòm sao · navy', spec: { layout: 'zodiac', palette: 'navy', font: 'montserrat' } },
  { id: 'zodiac-lilac', name: 'Chòm sao · lavender', spec: { layout: 'zodiac', palette: 'lilac', font: 'playfair' } },
  { id: 'quote-sage', name: 'Câu nói · xô thơm', spec: { layout: 'quote', palette: 'sage', font: 'baloo' } },
];

// ---------- cung hoàng đạo (chòm sao vẽ bằng chấm + nét, toạ độ 0..1) ----------
export const ZODIAC: { name: string; dates: string; lines: [number, number][][] }[] = [
  { name: 'Bạch Dương', dates: '21/3 – 19/4', lines: [[[0.08, 0.6], [0.45, 0.38], [0.7, 0.42], [0.92, 0.58]]] },
  { name: 'Kim Ngưu', dates: '20/4 – 20/5', lines: [[[0.05, 0.12], [0.35, 0.45], [0.5, 0.56], [0.64, 0.5], [0.95, 0.2]], [[0.5, 0.56], [0.55, 0.9]]] },
  { name: 'Song Tử', dates: '21/5 – 21/6', lines: [[[0.2, 0.1], [0.25, 0.5], [0.3, 0.9]], [[0.62, 0.1], [0.64, 0.5], [0.72, 0.9]], [[0.2, 0.1], [0.62, 0.1]]] },
  { name: 'Cự Giải', dates: '22/6 – 22/7', lines: [[[0.5, 0.1], [0.5, 0.45], [0.2, 0.85]], [[0.5, 0.45], [0.82, 0.8]]] },
  { name: 'Sư Tử', dates: '23/7 – 22/8', lines: [[[0.9, 0.78], [0.56, 0.72], [0.3, 0.6], [0.34, 0.34], [0.5, 0.18], [0.67, 0.24], [0.62, 0.42], [0.3, 0.6]]] },
  { name: 'Xử Nữ', dates: '23/8 – 22/9', lines: [[[0.05, 0.3], [0.3, 0.36], [0.5, 0.5], [0.72, 0.45], [0.95, 0.62]], [[0.5, 0.5], [0.45, 0.88]], [[0.72, 0.45], [0.76, 0.12]]] },
  { name: 'Thiên Bình', dates: '23/9 – 23/10', lines: [[[0.5, 0.1], [0.2, 0.45], [0.8, 0.45], [0.5, 0.1]], [[0.2, 0.45], [0.15, 0.86]], [[0.8, 0.45], [0.86, 0.8]]] },
  { name: 'Bọ Cạp', dates: '24/10 – 21/11', lines: [[[0.95, 0.1], [0.85, 0.26], [0.7, 0.36], [0.55, 0.5], [0.45, 0.7], [0.3, 0.86], [0.12, 0.8], [0.08, 0.62]]] },
  { name: 'Nhân Mã', dates: '22/11 – 21/12', lines: [[[0.1, 0.7], [0.3, 0.55], [0.5, 0.6], [0.66, 0.4], [0.88, 0.3]], [[0.5, 0.6], [0.55, 0.9]], [[0.66, 0.4], [0.6, 0.14]]] },
  { name: 'Ma Kết', dates: '22/12 – 19/1', lines: [[[0.05, 0.2], [0.4, 0.5], [0.75, 0.78], [0.95, 0.4], [0.6, 0.3], [0.05, 0.2]]] },
  { name: 'Bảo Bình', dates: '20/1 – 18/2', lines: [[[0.05, 0.3], [0.25, 0.46], [0.45, 0.35], [0.65, 0.5], [0.88, 0.4]], [[0.45, 0.35], [0.5, 0.82]]] },
  { name: 'Song Ngư', dates: '19/2 – 20/3', lines: [[[0.05, 0.82], [0.35, 0.6], [0.55, 0.45], [0.95, 0.14]], [[0.55, 0.45], [0.9, 0.72]]] },
];

// ---------- nội dung ----------
export type PCData = Record<string, string>;
export interface PCField { key: string; label: string; ph?: string; multiline?: boolean; select?: string[] }
export const PC_FIELDS: Record<PCLayout, PCField[]> = {
  photo: [{ key: 'name', label: 'Chữ trên ảnh (tên, chú thích)', ph: 'Thu Hà' }, { key: 'line', label: 'Dòng nhỏ', ph: 'Đà Lạt · 2025' }],
  signature: [{ key: 'name', label: 'Tên (chữ ký)', ph: 'Thu Hà' }, { key: 'line', label: 'Dòng nhỏ', ph: 'Be happy, be you' }],
  floral: [{ key: 'name', label: 'Tên', ph: 'Thu Hà' }, { key: 'line', label: 'Dòng nhỏ', ph: 'Nở rộ theo cách của mình' }],
  checker: [{ key: 'name', label: 'Tên', ph: 'Gia Khánh' }, { key: 'line', label: 'Dòng nhỏ', ph: 'Ngày nào cũng vui' }],
  marble: [{ key: 'name', label: 'Tên (tạo chữ lồng)', ph: 'Thu Hà' }, { key: 'line', label: 'Dòng nhỏ', ph: 'Est. 2001' }],
  couple: [{ key: 'name', label: 'Người 1 (ốp A)', ph: 'Thu Hà' }, { key: 'name2', label: 'Người 2 (ốp B)', ph: 'Quốc Bảo' }, { key: 'line', label: 'Ngày yêu nhau', ph: '14 · 02 · 2024' }],
  zodiac: [{ key: 'sign', label: 'Cung hoàng đạo', select: ZODIAC.map((z) => z.name) }, { key: 'name', label: 'Tên', ph: 'Bảo Ngọc' }],
  quote: [{ key: 'quote', label: 'Câu nói', ph: 'Hôm nay vui là được, mai tính tiếp', multiline: true }, { key: 'name', label: 'Ký tên', ph: 'Gia Khánh' }],
};
export const PC_SAMPLES: Record<PCLayout, PCData> = {
  photo: { name: 'Thu Hà', line: 'Đà Lạt · 2025' },
  signature: { name: 'Thu Hà', line: 'Be happy, be you' },
  floral: { name: 'Thu Hà', line: 'Nở rộ theo cách của mình' },
  checker: { name: 'Gia Khánh', line: 'Ngày nào cũng vui' },
  marble: { name: 'Thu Hà', line: 'Est. 2001' },
  couple: { name: 'Thu Hà', name2: 'Quốc Bảo', line: '14 · 02 · 2024' },
  zodiac: { sign: '4', name: 'Bảo Ngọc' },
  quote: { quote: 'Hôm nay vui là được, mai tính tiếp', name: 'Gia Khánh' },
};
export const defaultPCData = (layout: PCLayout = 'photo'): PCData => ({ ...PC_SAMPLES[layout] });
/** đổi bố cục khi khách đã sửa: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu mới */
export function switchPCData(d: PCData, from: PCLayout, to: PCLayout): PCData {
  const oldS = PC_SAMPLES[from] || {}, next: PCData = { ...PC_SAMPLES[to] };
  for (const [k, v] of Object.entries(d)) if (v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function textW(text: string, family: string, weight: number, size: number): number {
  if (typeof document === 'undefined') return text.length * size * 0.56;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  mctx!.font = `${weight} 100px "${family}"`;
  return (mctx!.measureText(text).width / 100) * size;
}
function fitSize(text: string, family: string, weight: number, maxW: number, maxS: number, minS = 2.6): number {
  const w = textW(text, family, weight, maxS);
  return Math.max(minS, w > maxW ? (maxS * maxW) / w : maxS);
}
function wrapLines(text: string, family: string, weight: number, size: number, maxW: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = []; let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (cur && textW(t, family, weight, size) > maxW) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
/** chữ nhiều dòng: co cỡ tới khi vừa khung (rộng × cao) */
function fitBlock(text: string, family: string, weight: number, maxW: number, maxH: number, maxS: number, minS = 3, lh = 1.28) {
  for (let s = maxS; s >= minS; s -= 0.25) {
    const lines = wrapLines(text, family, weight, s, maxW);
    if (lines.length * s * lh <= maxH && lines.every((l) => textW(l, family, weight, s) <= maxW)) return { size: s, lines };
  }
  const lines = wrapLines(text, family, weight, minS, maxW);
  const maxL = Math.max(1, Math.floor(maxH / (minS * lh)));
  return { size: minS, lines: lines.length > maxL ? [...lines.slice(0, maxL - 1), lines.slice(maxL - 1).join(' ').slice(0, 40) + '…'] : lines };
}
function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
const initials = (name: string) => (name || '').trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase() || '').join('') || 'A';

// ---------- hình trang trí vẽ bằng code ----------
function Flower({ cx, cy, r, c, c2, rot = 0 }: { cx: number; cy: number; r: number; c: string; c2: string; rot?: number }) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      {[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-r * 0.55} rx={r * 0.38} ry={r * 0.58} fill={c} transform={`rotate(${a})`} />)}
      <circle r={r * 0.26} fill={c2} />
    </g>
  );
}
function Leaf({ x, y, l, a, c }: { x: number; y: number; l: number; a: number; c: string }) {
  return <path d={`M0 0 Q${l * 0.45} ${-l * 0.28} ${l} 0 Q${l * 0.45} ${l * 0.28} 0 0Z`} fill={c} transform={`translate(${x} ${y}) rotate(${a})`} />;
}
function Bouquet({ x, y, s, p, flip = false }: { x: number; y: number; s: number; p: PCPalette; flip?: boolean }) {
  const k = flip ? -1 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${k * s} ${s})`}>
      <Leaf x={-2} y={2} l={14} a={-150} c={p.accent} />
      <Leaf x={1} y={-1} l={12} a={-70} c={p.accent} />
      <Leaf x={4} y={3} l={11} a={10} c={p.accent} />
      <Flower cx={0} cy={0} r={7} c={p.accent2} c2={p.soft} rot={10} />
      <Flower cx={9} cy={-6} r={4.6} c={p.soft} c2={p.accent2} rot={30} />
      <Flower cx={-8} cy={-9} r={3.8} c={p.accent} c2={p.soft} rot={-12} />
      <circle cx={12} cy={5} r={1.2} fill={p.accent2} /><circle cx={-12} cy={2} r={1} fill={p.accent2} />
    </g>
  );
}
function heartPath(cx: number, cy: number, s: number): string {
  // tim cân đối, tâm (cx, cy), rộng ~2s
  return `M${cx} ${cy + s * 0.9} C${cx - s * 1.25} ${cy + s * 0.05} ${cx - s * 1.05} ${cy - s * 0.95} ${cx} ${cy - s * 0.38} C${cx + s * 1.05} ${cy - s * 0.95} ${cx + s * 1.25} ${cy + s * 0.05} ${cx} ${cy + s * 0.9}Z`;
}

// ---------- vẽ thiết kế (toạ độ mặt lưng ốp W×H, ext = nới nền ra ngoài cho lề xén / phần quấn cạnh) ----------
export interface PCArt { photo?: CVPhoto | null }
export function photoOf(art: PCArt): CVPhoto { return art.photo || samplePhotos()[0]; }

function Art({ spec, data, art, W, H, ext, side, clear }: {
  spec: PCSpec; data: PCData; art: PCArt; W: number; H: number; ext: number; side: 'A' | 'B'; clear: boolean;
}) {
  const d = pcDims(spec.model);
  const p = pcPalette(spec.palette);
  const f = pcFont(spec.font);
  const ph = phoneColor(spec.phone).hex;
  // ốp trong: chữ phải nổi trên màu máy → chọn mực sáng/tối theo màu máy
  const inkOnPhone = darkHex(ph) ? (darkHex(p.ink) ? (darkHex(p.soft) ? '#FFFFFF' : p.soft) : p.ink) : (darkHex(p.ink) ? p.ink : (darkHex(p.accent) ? p.accent : '#222222'));
  const ink = clear ? inkOnPhone : p.ink;
  const accent = clear && darkHex(ph) === darkHex(p.accent) ? (darkHex(ph) ? p.accent2 : p.ink) : p.accent;
  const fam = `'${f.family}'`, body = `'${BODY}'`;
  const bgR = { x: -ext, y: -ext, width: W + ext * 2, height: H + ext * 2 };
  const top = d.hole.y + d.hole.h + 7;
  const Z = { x: 7, y: top, w: W - 14, h: H - top - 9 };   // vùng chữ: dưới ô camera
  const cx = W / 2;
  const out: ReactNode[] = [];
  const bg = (fill: string) => !clear && out.push(<rect key="bg" {...bgR} fill={fill} />);
  const T = (k: string, x: number, y: number, size: number, text: string, o: { fam?: string; weight?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; deco?: boolean } = {}) => {
    // chữ quá dài (đã co tới cỡ tối thiểu) → cắt "…" cho vừa bề rộng còn lại trên lưng ốp
    const raw = (o.fam ?? fam).replace(/'/g, ''), wt = o.weight ?? f.weight, anchor = o.anchor ?? 'middle';
    const avail = anchor === 'middle' ? 2 * Math.min(x, W - x) - 10 : anchor === 'start' ? W - x - 6 : x - 6;
    let tx = text;
    if (!o.deco && textW(tx, raw, wt, size) > avail) {
      while (tx.length > 2 && textW(tx + '…', raw, wt, size) > avail) tx = tx.slice(0, -1);
      tx = tx.trimEnd() + '…';
    }
    out.push(<text key={k} x={x} y={y} fontFamily={o.fam ?? fam} fontWeight={wt} fontSize={size} fill={o.fill ?? ink} textAnchor={anchor} {...(o.deco ? { 'data-deco': '1' } : {})}>{tx}</text>);
  };
  const name = (side === 'B' && spec.layout === 'couple' ? data.name2 : data.name) || '';

  if (spec.layout === 'photo') {
    const ph0 = photoOf(art);
    const slot = { x: -ext, y: -ext, w: W + ext * 2, h: H + ext * 2 };
    const r = coverRect(slot, ph0);
    out.push(<image key="ph" href={ph0.src} x={r.x} y={r.y} width={r.w} height={r.h} preserveAspectRatio="none" />);
    if (name || data.line) {
      out.push(<defs key="gd"><linearGradient id="pc-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.55" /></linearGradient></defs>);
      out.push(<rect key="sh" x={-ext} y={H * 0.66} width={W + ext * 2} height={H * 0.34 + ext} fill="url(#pc-shade)" />);
      const s = name ? fitSize(name, f.family, f.weight, W - 16, 13, 5) : 0;
      if (name) T('n', cx, H - 19, s, name, { fill: '#FFFFFF' });
      if (data.line) T('l', cx, H - 10.5, fitSize(data.line, BODY, 600, W - 18, 3.6, 2.6), data.line, { fam: body, weight: 600, fill: '#FFFFFF' });
    }
  } else if (spec.layout === 'signature') {
    bg(p.bg);
    const s = fitSize(name || ' ', f.family, f.weight, Z.w - 4, 21, 6);
    const y = Z.y + Z.h * 0.5;
    if (name) T('n', cx, y, s, name);
    out.push(<path key="sw" d={`M${cx - Z.w * 0.32} ${y + s * 0.32} Q${cx} ${y + s * 0.62} ${cx + Z.w * 0.36} ${y + s * 0.22}`} fill="none" stroke={accent} strokeWidth={0.55} strokeLinecap="round" />);
    if (data.line) T('l', cx, y + s * 0.62 + 8, fitSize(data.line, BODY, 600, Z.w - 6, 3.6), data.line, { fam: body, weight: 600, fill: accent });
    out.push(<path key="ht" d={heartPath(cx, Z.y + 6, 2.2)} fill={accent} />);
  } else if (spec.layout === 'floral') {
    bg(p.bg);
    out.push(<Bouquet key="b1" x={11} y={H - 12} s={1.15} p={p} />);
    out.push(<Bouquet key="b2" x={W - 8} y={Z.y + Z.h * 0.18} s={0.9} p={p} flip />);
    out.push(<Bouquet key="b3" x={W - 14} y={H - 30} s={0.6} p={p} flip />);
    const s = fitSize(name || ' ', f.family, f.weight, Z.w * 0.78, 14, 5);
    const y = Z.y + Z.h * 0.5;
    if (name) T('n', cx, y, s, name);
    if (data.line) {
      const b = fitBlock(data.line, BODY, 600, Z.w * 0.7, 10, 3.6, 2.8, 1.3);
      b.lines.forEach((l, i) => T(`l${i}`, cx, y + 7.5 + i * b.size * 1.3, b.size, l, { fam: body, weight: 600, fill: accent }));
    }
  } else if (spec.layout === 'checker') {
    if (!clear) bg(p.soft);
    const per = 9, n = Math.ceil((Math.max(W, H) + ext * 2) / per) + 2;
    const stripes: ReactNode[] = [];
    for (let i = -1; i < n; i++) {
      stripes.push(<rect key={`v${i}`} x={-ext + i * per} y={-ext} width={per / 2} height={H + ext * 2} fill={p.accent} opacity={0.38} />);
      stripes.push(<rect key={`h${i}`} x={-ext} y={-ext + i * per} width={W + ext * 2} height={per / 2} fill={p.accent} opacity={0.38} />);
    }
    out.push(<g key="st">{stripes}</g>);
    const darkC = darkHex(p.ink) ? p.ink : darkHex(p.bg) ? p.bg : darkHex(p.accent) ? p.accent : '#333333';
    const s = fitSize(name || ' ', f.family, f.weight, Z.w - 16, 11, 4);
    const pw = Math.min(Z.w, textW(name || ' ', f.family, f.weight, s) + 16), phh = s * 1.75;
    const y = Z.y + Z.h * 0.46;
    out.push(<rect key="pill" x={cx - pw / 2} y={y - phh * 0.68} width={pw} height={phh} rx={phh / 2} fill="#FFFFFF" stroke={p.accent} strokeWidth={0.6} />);
    if (name) T('n', cx, y, s, name, { fill: darkC });
    if (data.line) {
      const ls = fitSize(data.line, BODY, 800, Z.w - 18, 3.4);
      const lw = textW(data.line, BODY, 800, ls) + 7;
      out.push(<rect key="lp" x={cx - lw / 2} y={y + phh * 0.5 + 3} width={lw} height={ls * 1.7} rx={ls * 0.85} fill={darkC} />);
      T('l', cx, y + phh * 0.5 + 3 + ls * 1.18, ls, data.line, { fam: body, weight: 800, fill: '#FFFFFF' });
    }
  } else if (spec.layout === 'marble') {
    bg(p.bg);
    const r = rnd(7 + spec.palette.length * 13);
    const veinC = darkHex(p.bg) ? '#FFFFFF' : p.ink;
    const veins: ReactNode[] = [];
    for (let i = 0; i < 9; i++) {
      const y0 = -ext + r() * (H + ext * 2), y1 = y0 + (r() - 0.3) * H * 0.7;
      const dpath = `M${-ext - 2} ${y0} C${W * 0.3} ${y0 + (r() - 0.5) * 50} ${W * 0.6} ${y1 + (r() - 0.5) * 60} ${W + ext + 2} ${y1}`;
      veins.push(<path key={i} d={dpath} fill="none" stroke={veinC} strokeWidth={0.25 + r() * 1.3} opacity={0.12 + r() * 0.28} strokeLinecap="round" />);
    }
    for (let i = 0; i < 5; i++) { // mảng loang mờ (vân đá lớn)
      const y0 = -ext + r() * (H + ext * 2);
      veins.push(<path key={`c${i}`} d={`M${-ext - 4} ${y0} C${W * 0.3} ${y0 + (r() - 0.5) * 70} ${W * 0.7} ${y0 + (r() - 0.5) * 70} ${W + ext + 4} ${y0 + (r() - 0.5) * 40}`} fill="none" stroke={veinC} strokeWidth={5 + r() * 9} opacity={0.035 + r() * 0.04} strokeLinecap="round" />);
    }
    veins.push(<path key="gold" d={`M${-ext} ${H * 0.7} C${W * 0.35} ${H * 0.55} ${W * 0.55} ${H * 0.92} ${W + ext} ${H * 0.62}`} fill="none" stroke={p.accent} strokeWidth={0.7} opacity={0.9} />);
    out.push(<g key="v">{veins}</g>);
    const ini = initials(name);
    const R = Math.min(15, Z.w * 0.24);
    const y = Z.y + Z.h * 0.36;
    out.push(<circle key="c" cx={cx} cy={y} r={R} fill={clear ? 'none' : p.bg} stroke={p.accent} strokeWidth={0.8} />);
    out.push(<circle key="c2" cx={cx} cy={y} r={R - 1.6} fill="none" stroke={p.accent} strokeWidth={0.3} />);
    const s = fitSize(ini, f.family, f.weight, R * 1.25, R * 0.95, 4);
    T('ini', cx, y + s * 0.34, s, ini, { fill: p.accent });
    if (name) T('n', cx, y + R + 9, fitSize(name, BODY, 800, Z.w - 8, 4.4), name, { fam: body, weight: 800 });
    if (data.line) T('l', cx, y + R + 15.5, fitSize(data.line, BODY, 600, Z.w - 10, 3.2), data.line, { fam: body, weight: 600, fill: p.accent });
  } else if (spec.layout === 'couple') {
    bg(p.bg);
    const hs = W * 0.36;
    const hy = Z.y + Z.h * 0.66;
    out.push(<path key="h" d={heartPath(side === 'A' ? W : 0, hy, hs)} fill={accent} />);
    const s = fitSize(name || ' ', f.family, f.weight, Z.w - 4, 13, 5);
    if (name) T('n', cx, Z.y + s * 0.9, s, name);
    if (data.line) T('l', cx, Z.y + s * 0.9 + 8, fitSize(data.line, BODY, 600, Z.w - 6, 3.6), data.line, { fam: body, weight: 600, fill: accent });
  } else if (spec.layout === 'zodiac') {
    bg(p.bg);
    const z = ZODIAC[Math.max(0, Math.min(11, parseInt(data.sign || '0', 10) || 0))];
    const starC = clear ? ink : (darkHex(p.bg) ? '#FFFFFF' : p.ink);
    const r = rnd(31);
    const dust: ReactNode[] = [];
    for (let i = 0; i < 80; i++) dust.push(<circle key={i} cx={-ext + r() * (W + ext * 2)} cy={-ext + r() * (H + ext * 2)} r={0.15 + r() * 0.4} fill={starC} opacity={0.25 + r() * 0.5} />);
    out.push(<g key="dust">{dust}</g>);
    const bx = Z.x + 6, bw = Z.w - 12, by = Z.y + 2, bh = Z.h * 0.46;
    const P = (q: [number, number]) => [bx + q[0] * bw, by + q[1] * bh];
    const seen = new Set<string>();
    z.lines.forEach((ln, i) => out.push(<polyline key={`ln${i}`} points={ln.map((q) => P(q).join(',')).join(' ')} fill="none" stroke={starC} strokeWidth={0.32} opacity={0.75} />));
    z.lines.flat().forEach((q, i) => {
      const k = q.join(); if (seen.has(k)) return; seen.add(k);
      const [x, y] = P(q);
      out.push(<g key={`s${i}`}><circle cx={x} cy={y} r={2} fill={p.accent} opacity={0.22} /><circle cx={x} cy={y} r={0.95} fill={p.accent} /></g>);
    });
    const ny = Z.y + Z.h * 0.64;
    const s = fitSize(z.name.toUpperCase(), f.family, f.weight, Z.w - 6, 8.5, 4);
    T('z', cx, ny, s, z.name.toUpperCase());
    T('zd', cx, ny + 6.5, 3.2, z.dates, { fam: body, weight: 600, fill: p.accent });
    if (name) T('n', cx, Z.y + Z.h - 3, fitSize(name, 'Great Vibes', 400, Z.w - 8, 9, 4), name, { fam: "'Great Vibes'", weight: 400 });
  } else { // quote
    bg(p.bg);
    T('q', Z.x + 2, Z.y + 16, 22, '“', { anchor: 'start', fill: accent, deco: true });
    const b = fitBlock(data.quote || ' ', f.family, f.weight, Z.w - 6, Z.h * 0.62, 11, 4.2, 1.24);
    const y0 = Z.y + Z.h * 0.24 + b.size;
    b.lines.forEach((l, i) => T(`q${i}`, cx, y0 + i * b.size * 1.24, b.size, l));
    if (name) T('n', cx, y0 + (b.lines.length - 1) * b.size * 1.24 + 10, fitSize(`— ${name}`, BODY, 600, Z.w - 8, 3.8), `— ${name}`, { fam: body, weight: 600, fill: accent });
  }
  return <>{out}</>;
}

// ---------- SVG chính ----------
export type PCMode = 'preview' | 'tex' | 'print';
export function PhoneCaseSvg({ spec, data, art, mode = 'preview', side = 'A', style }: {
  spec: PCSpec; data: PCData; art: PCArt; mode?: PCMode; side?: 'A' | 'B'; style?: CSSProperties;
}) {
  const d = pcDims(spec.model);
  const { W, H, r, D, hole, keep } = d;
  const clear = spec.caseType === 'clear';
  const wrap = spec.caseType === 'hard';
  const outline = rrPath(0, 0, W, H, r);
  const hp = holePath(hole);
  const uid = `pc-${mode}-${side}`;
  const meta = { 'data-back': `${W},${H}`, 'data-keep': `${keep.x},${keep.y},${keep.w},${keep.h}` };

  if (mode === 'tex') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>
        <defs><clipPath id={`${uid}-c`}><path d={`${outline}${hp}`} clipRule="evenodd" /></clipPath></defs>
        <g clipPath={`url(#${uid}-c)`}><Art spec={spec} data={data} art={art} W={W} H={H} ext={0} side={side} clear={clear} /></g>
      </svg>
    );
  }

  if (mode === 'print') {
    const e = (wrap ? D : 0) + PC_BLEED;
    const vb = `${-e} ${-e} ${W + e * 2} ${H + e * 2}`;
    const m = d.m;
    return (
      <svg viewBox={vb} width={`${W + e * 2}mm`} height={`${H + e * 2}mm`} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>
        <defs>
          <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-e} y={-e} width={W + e * 2} height={H + e * 2}>
            <rect x={-e} y={-e} width={W + e * 2} height={H + e * 2} fill="#fff" /><path d={hp} fill="#000" />
          </mask>
        </defs>
        <g id="In" mask={`url(#${uid}-m)`}><Art spec={spec} data={data} art={art} W={W} H={H} ext={e} side={side} clear={clear} /></g>
        {wrap && (
          <g id="Fold" fill="none" stroke="#00A0E0" strokeWidth={0.25} strokeDasharray="1.6 1">
            <path d={outline} />
            <rect x={-D} y={-D} width={W + D * 2} height={H + D * 2} rx={r + D} />
          </g>
        )}
        {wrap && (
          <g id="LoNut" fill="none" stroke="#FF00FF" strokeWidth={0.25}>
            {d.buttons.map((b, i) => <rect key={i} x={b.side === 'L' ? -D * 0.75 : W + D * 0.25} y={b.y} width={D * 0.5} height={b.len} rx={0.8} />)}
          </g>
        )}
        <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth={0.25}>
          {!wrap && <path d={outline} />}
          <path d={hp} />
        </g>
        <g id="KhongIn"><path d={hp} fill="none" stroke="#FF00FF" strokeWidth={0.15} strokeDasharray="0.8 0.8" /></g>
        <title>{`Ốp ${m.name} · ${PC_CASES.find((c) => c.id === spec.caseType)?.name} · ${W.toFixed(1)}×${H.toFixed(1)}mm`}</title>
      </svg>
    );
  }

  // preview: mockup phẳng mặt lưng
  const phone = phoneColor(spec.phone).hex;
  const caseFill = clear ? phone : spec.caseType === 'rim' ? rimColor(spec.rim).hex : pcPalette(spec.palette).bg;
  const inset = spec.caseType === 'rim' ? 2.2 : 0;
  const inner = rrPath(inset, inset, W - inset * 2, H - inset * 2, r - inset);
  const m = d.m, t = PC_WALL;
  return (
    <svg viewBox={`-3 -3 ${W + 6} ${H + 6}`} xmlns="http://www.w3.org/2000/svg" style={style} {...meta}>
      <defs>
        <clipPath id={`${uid}-c`}><path d={`${inner}${hp}`} clipRule="evenodd" /></clipPath>
        <linearGradient id={`${uid}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity="0.28" /><stop offset="0.45" stopColor="#fff" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.1" /></linearGradient>
      </defs>
      <path d={outline} fill={caseFill} stroke="rgba(0,0,0,0.18)" strokeWidth={0.4} />
      <g clipPath={`url(#${uid}-c)`}><Art spec={spec} data={data} art={art} W={W} H={H} ext={0} side={side} clear={clear} /></g>
      {/* cụm camera của máy (nhìn qua lỗ khoét) */}
      <path d={hp} fill="#2A2C31" />
      <path d={rrPath(m.cam.x + t, m.cam.y + t, m.cam.w, m.cam.h, m.cam.r)} fill={phone} stroke="rgba(0,0,0,0.25)" strokeWidth={0.3} />
      {m.lenses.map((l, i) => <g key={i}><circle cx={l.x + t} cy={l.y + t} r={l.r} fill="#B9BDC4" /><circle cx={l.x + t} cy={l.y + t} r={l.r * 0.78} fill="#111418" /><circle cx={l.x + t - l.r * 0.25} cy={l.y + t - l.r * 0.25} r={l.r * 0.18} fill="#5E6B85" /></g>)}
      <circle cx={m.flash.x + t} cy={m.flash.y + t} r={m.flash.r} fill="#F4E9C8" stroke="#BDB49A" strokeWidth={0.2} />
      <path d={outline} fill={`url(#${uid}-g)`} />
    </svg>
  );
}

/** khổ file in (mm, chưa tính lề xén) */
export function pcTrim(spec: PCSpec) {
  const d = pcDims(spec.model);
  const e = spec.caseType === 'hard' ? d.D : 0;
  return { wMm: d.W + e * 2, hMm: d.H + e * 2 };
}
/** dpi thực tế của ảnh khách trên vùng in */
export function pcPhotoDpi(spec: PCSpec, photo: CVPhoto): number {
  const t = pcTrim(spec);
  return photoDpi({ x: 0, y: 0, w: t.wMm + PC_BLEED * 2, h: t.hMm + PC_BLEED * 2 }, photo);
}
