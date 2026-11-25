'use client';
// Quạt nhựa PP cầm tay quảng cáo: 1 engine SVG = MỤC ĐÍCH (tuyển sinh, khai trương, chiến dịch, âm nhạc, phòng khám,
// nhà đất, cổ vũ) × HÌNH (tròn, vuông bo góc, trái tim, quạt xoè) × TAY CẦM (liền 1 tấm / que rời tán đinh) × MÀU × FONT.
// 2 mặt in: mặt trước = hình chiến dịch (vẽ bằng code hoặc ảnh khách), mặt sau = thông tin + QR.
// Đơn vị vẽ: 10 = 1mm. Đường cắt (CutContour) viết bằng mm, dựng bằng code (tay cầm liền có bo lượn cổ + lỗ treo).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

const U = 10;
export const FAN_BLEED_MM = 2;
export const CUTCONTOUR = '#EC008C';
const HW = 15;     // nửa bề rộng tay cầm liền (tay cầm 30mm)
const FL = 9;      // bo lượn chỗ cổ quạt nối tay cầm
const HL = 112;    // chiều dài tay cầm liền (tính từ cổ)
const HOLE_R = 3;  // lỗ treo Ø6mm cuối tay cầm

// ---------- hình học ----------
export type FanShapeId = 'round' | 'square' | 'heart' | 'fold';
export type FanHandle = 'integrated' | 'stick';
export const FAN_SHAPES: { id: FanShapeId; name: string }[] = [
  { id: 'round', name: 'Tròn Ø20cm' },
  { id: 'square', name: 'Vuông bo góc 19cm' },
  { id: 'heart', name: 'Trái tim 21cm' },
  { id: 'fold', name: 'Quạt xoè 29cm' },
];
export const FAN_HANDLES: { id: FanHandle; name: string; note: string }[] = [
  { id: 'integrated', name: 'Tay cầm liền', note: 'Cắt liền 1 tấm nhựa PP, có lỗ treo — rẻ, phổ biến nhất' },
  { id: 'stick', name: 'Tay cầm rời (que)', note: 'Que nhựa/tre tán 2 đinh sau lưng — cầm chắc tay, sang hơn' },
];

type Pt = [number, number];
interface Rect { x: number; y: number; w: number; h: number }
const f2 = (n: number) => Math.round(n * 100) / 100;
const pt = (p: Pt) => `${f2(p[0])} ${f2(p[1])}`;
const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
function splitCubic(c: Pt[], t: number): [Pt[], Pt[]] {
  const [p0, p1, p2, p3] = c;
  const a = lerp(p0, p1, t), b = lerp(p1, p2, t), d = lerp(p2, p3, t), e = lerp(a, b, t), g = lerp(b, d, t), m = lerp(e, g, t);
  return [[p0, a, e, m], [m, g, d, p3]];
}
const cubicX = (c: Pt[], t: number) => { const s = 1 - t; return s * s * s * c[0][0] + 3 * s * s * t * c[1][0] + 3 * s * t * t * c[2][0] + t * t * t * c[3][0]; };
function tAtX(c: Pt[], x: number): number {
  let lo = 0, hi = 1;
  const dec = cubicX(c, 0) > cubicX(c, 1);
  for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if ((cubicX(c, m) > x) === dec) lo = m; else hi = m; }
  return (lo + hi) / 2;
}

interface Blade {
  bw: number; bh: number; cx: number; safe: Rect;
  closed: string;
  /** đoạn viền cánh quạt từ cổ trái, đi theo chiều kim đồng hồ, tới cổ phải (n = nửa bề rộng cổ) */
  open: (n: number) => { start: Pt; seg: string };
  fold?: { px: number; py: number; R: number; a: number; n: number };
}

const BLADES: Record<FanShapeId, Blade> = (() => {
  // tròn Ø200
  const R = 100;
  const round: Blade = {
    bw: 200, bh: 200, cx: 100, safe: { x: 30, y: 40, w: 140, h: 120 },
    closed: 'M0 100A100 100 0 1 1 200 100A100 100 0 1 1 0 100Z',
    open: (n) => { const y = 100 + Math.sqrt(R * R - n * n); return { start: [100 - n, y], seg: `A${R} ${R} 0 1 1 ${pt([100 + n, y])}` }; },
  };
  // vuông 190 bo góc 24
  const s = 190, r = 24;
  const sqBody = `L${r} ${s}A${r} ${r} 0 0 1 0 ${s - r}L0 ${r}A${r} ${r} 0 0 1 ${r} 0L${s - r} 0A${r} ${r} 0 0 1 ${s} ${r}L${s} ${s - r}A${r} ${r} 0 0 1 ${s - r} ${s}`;
  const square: Blade = {
    bw: s, bh: s, cx: s / 2, safe: { x: 15, y: 15, w: 160, h: 160 },
    closed: `M${s / 2} ${s}${sqBody}Z`,
    open: (n) => ({ start: [s / 2 - n, s], seg: `${sqBody}L${s / 2 + n} ${s}` }),
  };
  // trái tim 210×196: đáy nhọn ở (105,196)
  const LL: Pt[] = [[105, 196], [80, 175], [0, 125], [0, 64]];
  const top = 'C0 24 28 0 58 0C84 0 100 16 105 34C110 16 126 0 152 0C182 0 210 24 210 64';
  const RL: Pt[] = [[210, 64], [210, 125], [130, 175], [105, 196]];
  const heart: Blade = {
    bw: 210, bh: 196, cx: 105, safe: { x: 50, y: 44, w: 110, h: 100 },
    closed: `M105 196C80 175 0 125 0 64${top}C210 125 130 175 105 196Z`,
    open: (n) => {
      const [, l2] = splitCubic(LL, tAtX(LL, 105 - n));
      const [r1] = splitCubic(RL, tAtX(RL, 105 + n));
      return { start: l2[0], seg: `C${pt(l2[1])} ${pt(l2[2])} ${pt(l2[3])}${top}C${pt(r1[1])} ${pt(r1[2])} ${pt(r1[3])}` };
    },
  };
  // quạt xoè: hình rẻ quạt bán kính 170, mở ±58°, mép ngoài lượn sóng theo 12 nan
  const FR = 170, A = (58 * Math.PI) / 180, N = 12, cx = FR * Math.sin(A), py = FR, hub = 18;
  const at = (th: number, rad: number): Pt => [cx + rad * Math.sin(th), py - rad * Math.cos(th)];
  let scal = '';
  for (let i = 1; i <= N; i++) {
    const t0 = -A + ((i - 1) * 2 * A) / N, t1 = -A + (i * 2 * A) / N;
    scal += `Q${pt(at((t0 + t1) / 2, FR * 1.032))} ${pt(at(t1, FR))}`;
  }
  const c0 = at(-A, FR), c1 = at(A, FR);
  const hubL: Pt = [cx - hub * Math.sin(A), py - hub * Math.cos(A)], hubR: Pt = [cx + hub * Math.sin(A), py - hub * Math.cos(A)];
  const fold: Blade = {
    bw: f2(cx * 2), bh: py + hub, cx, safe: { x: f2(cx - 82), y: 30, w: 164, h: 82 },
    closed: `M${pt(hubL)}L${pt(c0)}${scal}L${pt(hubR)}A${hub} ${hub} 0 1 1 ${pt(hubL)}Z`,
    open: (n) => {
      const t = (cx - n) / cx, y = c0[1] + t * (py - c0[1]);
      return { start: [cx - n, y], seg: `L${pt(c0)}${scal}L${pt([cx + n, y])}` };
    },
    fold: { px: cx, py, R: FR, a: A, n: N },
  };
  return { round, square, heart, fold };
})();

export interface FanGeom {
  d: string; W: number; H: number; cx: number; bh: number; safe: Rect;
  handle?: { y0: number; y1: number; neckY: number }; // tay cầm liền: vùng in chữ dọc + cổ
  stickY0?: number;                                   // tay cầm rời: que bắt đầu từ y này (mm, từ trên xuống)
  fold?: Blade['fold'];
}
export function fanGeom(shape: FanShapeId, handle: FanHandle): FanGeom {
  const b = BLADES[shape];
  if (handle === 'stick') return { d: b.closed, W: b.bw, H: b.bh, cx: b.cx, bh: b.bh, safe: b.safe, stickY0: f2(b.bh * 0.66), fold: b.fold };
  const o = b.open(HW + FL), y = o.start[1], cx = b.cx, yB = y + HL;
  const d = `M${f2(cx - HW)} ${f2(yB - HW)}L${f2(cx - HW)} ${f2(y + FL)}Q${f2(cx - HW)} ${f2(y)} ${pt(o.start)}${o.seg}`
    + `Q${f2(cx + HW)} ${f2(y)} ${f2(cx + HW)} ${f2(y + FL)}L${f2(cx + HW)} ${f2(yB - HW)}A${HW} ${HW} 0 0 1 ${f2(cx - HW)} ${f2(yB - HW)}Z`
    + `M${f2(cx - HOLE_R)} ${f2(yB - 12)}a${HOLE_R} ${HOLE_R} 0 1 0 ${HOLE_R * 2} 0a${HOLE_R} ${HOLE_R} 0 1 0 ${-HOLE_R * 2} 0Z`;
  return { d, W: b.bw, H: f2(yB), cx, bh: b.bh, safe: b.safe, handle: { y0: y + FL + 6, y1: yB - 19, neckY: y }, fold: b.fold };
}

// ---------- mục đích + chữ mẫu ----------
export type FanPurpose = 'school' | 'opening' | 'campaign' | 'music' | 'clinic' | 'realty' | 'sport';
export const FAN_PURPOSES: { id: FanPurpose; name: string }[] = [
  { id: 'school', name: 'Tuyển sinh' },
  { id: 'opening', name: 'Khai trương' },
  { id: 'campaign', name: 'Chiến dịch · bầu chọn' },
  { id: 'music', name: 'Sự kiện âm nhạc' },
  { id: 'clinic', name: 'Phòng khám' },
  { id: 'realty', name: 'Bất động sản' },
  { id: 'sport', name: 'Cổ vũ thể thao' },
];
export type FanData = Record<string, string>;
export const FAN_SAMPLES: Record<FanPurpose, FanData> = {
  school: {
    eyebrow: 'Thông báo', title: 'TUYỂN SINH', highlight: 'NĂM HỌC 2027', sub: 'Nhận trẻ từ 18 tháng đến 6 tuổi',
    brand: 'MẦM NON ÁNH DƯƠNG', info: 'Lớp nhỏ 15 bé · cô tận tâm\nSân chơi rộng, bếp ăn tại trường\nĐưa đón tận nhà', hotline: '0988 112 233',
    address: '12 Nguyễn Văn Linh, Q.7, TP.HCM', link: 'https://anhduong.edu.vn',
  },
  opening: {
    eyebrow: 'Chào mừng', title: 'KHAI TRƯƠNG', highlight: 'GIẢM 30%', sub: 'Từ 01 đến 07/01/2027',
    brand: 'AN KHANG COFFEE', info: 'Mua 1 tặng 1 ngày đầu tiên\nTặng ly sứ 100 khách đầu\nWifi mạnh · máy lạnh mát', hotline: '0909 123 456',
    address: '25 Lê Lợi, Q.1, TP.HCM', link: 'https://facebook.com/ankhangcoffee',
  },
  campaign: {
    eyebrow: 'Chiến dịch xanh', title: 'NÓI KHÔNG VỚI', highlight: 'RÁC NHỰA', sub: 'Hành động nhỏ · thay đổi lớn',
    brand: 'CLB SỐNG XANH', info: 'Mang bình nước riêng\nDùng túi vải khi đi chợ\nPhân loại rác tại nguồn', hotline: '0938 246 810',
    address: 'Nhà văn hoá Thanh niên, Q.1', link: 'https://songxanh.org.vn',
  },
  music: {
    eyebrow: 'Đêm nhạc', title: 'MÙA HÈ RỰC RỠ', highlight: '20.06.2027', sub: 'Sân khấu ngoài trời · 19:30',
    brand: 'SUMMER LIVE 2027', info: 'Mở cổng 18:00 · diễn 19:30\nVé tại cổng & online\nKhông mang nước có ga', hotline: '1900 6868',
    address: 'Công viên Gia Định, Q. Gò Vấp', link: 'https://summerlive.vn',
  },
  clinic: {
    eyebrow: 'Nha khoa Sao Mai', title: 'NỤ CƯỜI KHOẺ', highlight: 'KHÁM MIỄN PHÍ', sub: 'Tư vấn & chụp X-quang 0đ',
    brand: 'NHA KHOA SAO MAI', info: 'Niềng răng · Implant · Bọc sứ\nBác sĩ chuyên khoa 15 năm\nTrả góp 0% lãi suất', hotline: '0903 456 789',
    address: '88 Trần Hưng Đạo, Q.5, TP.HCM', link: 'https://saomaidental.vn',
  },
  realty: {
    eyebrow: 'Mở bán đợt 1', title: 'AN KHANG RIVERSIDE', highlight: 'TỪ 2,9 TỶ', sub: 'Căn hộ ven sông · TP. Thủ Đức',
    brand: 'AN KHANG LAND', info: 'Thanh toán 30% nhận nhà\nSổ hồng lâu dài\nChiết khấu đến 8%', hotline: '0909 888 999',
    address: 'Nhà mẫu: 2 Võ Nguyên Giáp, Thủ Đức', link: 'https://ankhangriverside.vn',
  },
  sport: {
    eyebrow: 'Cổ vũ hết mình', title: 'VIỆT NAM', highlight: 'VÔ ĐỊCH', sub: 'Đồng hành cùng đội tuyển',
    brand: 'FAN CLUB SÀI GÒN', info: 'Tập trung 17:00 tại cổng B\nMặc áo đỏ, mang cờ & còi\nGiữ vệ sinh khán đài', hotline: '0977 234 567',
    address: 'Sân vận động Thống Nhất, Q.10', link: 'https://fanclubsaigon.vn',
  },
};
export interface FanField { key: string; label: string; ph?: string; side: 'front' | 'back'; multiline?: boolean; half?: boolean }
export const FAN_FIELDS: FanField[] = [
  { key: 'eyebrow', label: 'Dòng nhỏ trên', ph: 'Thông báo', side: 'front', half: true },
  { key: 'highlight', label: 'Điểm nhấn (khung màu)', ph: 'GIẢM 30%', side: 'front', half: true },
  { key: 'title', label: 'Tiêu đề lớn', ph: 'TUYỂN SINH', side: 'front' },
  { key: 'sub', label: 'Dòng phụ', ph: 'Từ 01 đến 07/01/2027', side: 'front' },
  { key: 'brand', label: 'Tên đơn vị / thương hiệu', ph: 'MẦM NON ÁNH DƯƠNG', side: 'back' },
  { key: 'info', label: 'Thông tin (mỗi dòng 1 ý, tối đa 4)', ph: 'Lớp nhỏ 15 bé\nĐưa đón tận nhà', side: 'back', multiline: true },
  { key: 'hotline', label: 'Hotline', ph: '0988 112 233', side: 'back', half: true },
  { key: 'link', label: 'Link web / Zalo / fanpage (mã QR)', ph: 'https://…', side: 'back', half: true },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Văn Linh, Q.7', side: 'back' },
];

// ---------- màu ----------
export interface FanPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; onAccent: string; deco: string; soft: string; dark?: boolean }
export const FAN_PALETTES: FanPalette[] = [
  { id: 'sky', name: 'Trời xanh – cam', bg: '#EAF6FF', ink: '#0D3355', sub: '#3D6A8F', accent: '#FF7A00', onAccent: '#FFFFFF', deco: '#FFC93C', soft: '#CDEBFF' },
  { id: 'pink', name: 'Hồng kẹo', bg: '#FFF1F5', ink: '#4A1530', sub: '#8A4D66', accent: '#E91E63', onAccent: '#FFFFFF', deco: '#FFB3CC', soft: '#FFDCE8' },
  { id: 'red', name: 'Đỏ vàng lễ hội', bg: '#FFF5E8', ink: '#3A0D06', sub: '#7A3A20', accent: '#D62828', onAccent: '#FFFFFF', deco: '#FFB703', soft: '#FFE0C2' },
  { id: 'green', name: 'Xanh lá', bg: '#F0FAF1', ink: '#0F2F1A', sub: '#3E6B4C', accent: '#2E9E47', onAccent: '#FFFFFF', deco: '#A7D676', soft: '#D5EFD9' },
  { id: 'neon', name: 'Neon đêm nhạc', bg: '#160F2E', ink: '#FFFFFF', sub: '#C9BFF2', accent: '#FF3D9A', onAccent: '#FFFFFF', deco: '#29E3FF', soft: '#2C2257', dark: true },
  { id: 'purple', name: 'Tím', bg: '#F6F0FF', ink: '#2A1250', sub: '#6A4C93', accent: '#7C3AED', onAccent: '#FFFFFF', deco: '#F5B700', soft: '#E6DAFB' },
  { id: 'teal', name: 'Xanh ngọc y tế', bg: '#EFFAF8', ink: '#0B2F2A', sub: '#3F6B64', accent: '#0F8A7E', onAccent: '#FFFFFF', deco: '#7FD8CC', soft: '#CFEEE9' },
  { id: 'navygold', name: 'Navy ánh vàng', bg: '#0F2340', ink: '#FFFFFF', sub: '#C8D3E6', accent: '#C9A24A', onAccent: '#0F2340', deco: '#E8D19A', soft: '#1C3660', dark: true },
  { id: 'blackyellow', name: 'Đen vàng', bg: '#151515', ink: '#FFFFFF', sub: '#CFCFCF', accent: '#FFD400', onAccent: '#151515', deco: '#FFD400', soft: '#2A2A2A', dark: true },
  { id: 'redyellow', name: 'Đỏ cờ – vàng', bg: '#D7141A', ink: '#FFFFFF', sub: '#FFE3A3', accent: '#FFD21F', onAccent: '#A80E13', deco: '#FFD21F', soft: '#E63A3F', dark: true },
];
export const fanPalette = (id: string) => FAN_PALETTES.find((p) => p.id === id) || FAN_PALETTES[0];

// ---------- font (đều có TTF trong /public/fonts → outline được) ----------
export interface FanFont { id: string; name: string; family: string; weight: number }
export const FAN_FONTS: FanFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald (cao)', family: 'Oswald', weight: 700 },
  { id: 'bungee', name: 'Bungee (khối)', family: 'Bungee', weight: 400 },
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800 },
];
export const fanFont = (id: string) => FAN_FONTS.find((f) => f.id === id) || FAN_FONTS[0];
const BODY = 'Be Vietnam Pro';
const NUM = 'Oswald';
export const FAN_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Bungee&family=Playfair+Display:wght@800&display=swap');`;

export function useFanFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-fan-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-fan-fonts'; link.rel = 'stylesheet';
        link.href = FAN_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '700 40px "Oswald"', '800 40px "Baloo 2"', '400 40px "Bungee"', '800 40px "Playfair Display"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec + mẫu ----------
export interface FanSpec { purpose: FanPurpose; shape: FanShapeId; handle: FanHandle; palette: string; font: string }
export interface FanTemplate { id: string; name: string; spec: FanSpec }
const T = (purpose: FanPurpose, shape: FanShapeId, handle: FanHandle, palette: string, font: string): FanTemplate => ({
  id: `${purpose}-${shape}-${handle}-${palette}`,
  name: `${FAN_PURPOSES.find((p) => p.id === purpose)!.name} · ${FAN_SHAPES.find((s) => s.id === shape)!.name.split(' ')[0]}${shape === 'fold' ? ' xoè' : ''}`,
  spec: { purpose, shape, handle, palette, font },
});
export const FAN_TEMPLATES: FanTemplate[] = [
  T('school', 'round', 'integrated', 'sky', 'baloo'),
  T('school', 'heart', 'integrated', 'pink', 'baloo'),
  T('opening', 'round', 'integrated', 'red', 'montserrat'),
  T('opening', 'fold', 'stick', 'navygold', 'playfair'),
  T('campaign', 'square', 'integrated', 'green', 'bvp'),
  T('campaign', 'round', 'stick', 'green', 'montserrat'),
  T('music', 'square', 'stick', 'neon', 'bungee'),
  T('music', 'heart', 'integrated', 'purple', 'montserrat'),
  T('clinic', 'round', 'integrated', 'teal', 'bvp'),
  T('clinic', 'square', 'stick', 'sky', 'bvp'),
  T('realty', 'fold', 'integrated', 'navygold', 'playfair'),
  T('realty', 'square', 'integrated', 'blackyellow', 'oswald'),
  T('sport', 'round', 'integrated', 'redyellow', 'oswald'),
  T('sport', 'fold', 'stick', 'redyellow', 'bungee'),
];
export const defaultFanSpec = (): FanSpec => ({ ...FAN_TEMPLATES[0].spec });

// ---------- đo chữ thật (canvas, font đã nạp) ----------
let mctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number): number { // bề rộng ở cỡ 1 (đơn vị = cỡ chữ)
  if (typeof document === 'undefined') return text.length * 0.6;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 0.6;
  mctx.font = `${weight} 100px "${family}"`;
  return mctx.measureText(text).width / 100;
}
/** cỡ chữ lớn nhất ≤ size để vừa maxW; giãn chữ = lsEm × cỡ chữ mỗi ký tự */
const fitSize = (text: string, family: string, weight: number, maxW: number, size: number, lsEm = 0) => {
  if (!text) return size;
  const per = measure(text, family, weight) + lsEm * text.length;
  return per * size > maxW ? maxW / per : size;
};
const textW = (text: string, family: string, weight: number, size: number, lsEm = 0) => (measure(text, family, weight) + lsEm * text.length) * size;
/** 1 dòng; chữ co quá minSize thì bẻ 2 dòng cân nhau */
function fitLines(text: string, family: string, weight: number, maxW: number, size: number, minSize: number, lsEm = 0): { lines: string[]; size: number } {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  const s1 = fitSize(t, family, weight, maxW, size, lsEm);
  const words = t.split(' ').filter(Boolean);
  if (s1 >= minSize || words.length < 2) return { lines: t ? [t] : [], size: s1 };
  let best: [string, string] = [t, ''], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, family, weight), measure(b, family, weight));
    if (w < bw) { bw = w; best = [a.replace(/\s*·$/, ''), b.replace(/^·\s*/, '')]; }
  }
  const s2 = Math.min(size, fitSize(best[0], family, weight, maxW, size, lsEm), fitSize(best[1], family, weight, maxW, size, lsEm));
  return s2 > s1 ? { lines: best, size: s2 } : { lines: [t], size: s1 };
}

const u = (mm: number) => Math.round(mm * U * 10) / 10; // mm → đơn vị vẽ

// chữ canh theo TÂM dòng (cy, mm) — baseline ≈ cy + 0.36·size
function Txt({ x, cy, text, size, family, weight, fill, anchor = 'middle', lsEm = 0, role, lineGap = 1.1 }: {
  x: number; cy: number; text: string | string[]; size: number; family: string; weight: number; fill: string; anchor?: 'start' | 'middle' | 'end'; lsEm?: number; role: string; lineGap?: number;
}) {
  const lines = (Array.isArray(text) ? text : [text]).filter(Boolean);
  if (!lines.length) return null;
  const gap = size * lineGap;
  const y0 = cy - ((lines.length - 1) * gap) / 2 + size * 0.36;
  return (
    <>
      {lines.map((ln, i) => (
        <text key={i} x={u(x)} y={u(y0 + i * gap)} fontFamily={`"${family}"`} fontWeight={weight} fontSize={u(size)} fill={fill} textAnchor={anchor}
          letterSpacing={lsEm ? u(lsEm * size) : undefined} data-role={role}>{ln}</text>
      ))}
    </>
  );
}

// ---------- hoạ tiết vẽ bằng code (mm) ----------
let seed = 1;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const star = (x: number, y: number, r: number, rot = 0) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.42 : r;
    d += `${i ? 'L' : 'M'}${u(x + rr * Math.cos(a))} ${u(y + rr * Math.sin(a))}`;
  }
  return d + 'Z';
};
const note = (x: number, y: number, s: number, fill: string, key: string) => (
  <g key={key} transform={`translate(${u(x)} ${u(y)}) scale(${(s * U / 100).toFixed(4)})`}>
    <ellipse cx={22} cy={78} rx={20} ry={14} fill={fill} transform="rotate(-20 22 78)" />
    <rect x={36} y={10} width={7} height={68} fill={fill} />
    <path d="M43 10Q60 22 66 44Q56 34 43 32Z" fill={fill} />
  </g>
);

function Backdrop({ purpose, p, bw, bh, cx }: { purpose: FanPurpose; p: FanPalette; bw: number; bh: number; cx: number }) {
  seed = 7 + purpose.length * 13;
  const big = <rect x={u(-60)} y={u(-60)} width={u(bw + 120)} height={u(bh + 200)} fill={p.bg} />;
  if (purpose === 'school') {
    const crayons = ['#FF6B6B', '#FFC93C', '#4FC3F7', '#7ED957', '#B388FF', '#FF8A3D'];
    return (
      <>
        {big}
        <circle cx={u(bw * 0.84)} cy={u(bh * 0.16)} r={u(bw * 0.13)} fill={p.deco} />
        {Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2, r0 = bw * 0.16, r1 = bw * 0.21; return <line key={i} x1={u(bw * 0.84 + r0 * Math.cos(a))} y1={u(bh * 0.16 + r0 * Math.sin(a))} x2={u(bw * 0.84 + r1 * Math.cos(a))} y2={u(bh * 0.16 + r1 * Math.sin(a))} stroke={p.deco} strokeWidth={u(2.2)} strokeLinecap="round" />; })}
        {[[0.18, 0.17, 1], [0.12, 0.8, 0.8], [0.84, 0.86, 0.9]].map(([x, y, k], i) => (
          <g key={i} fill="#FFFFFF" opacity={0.95}>
            <circle cx={u(bw * x - 12 * k)} cy={u(bh * y + 3 * k)} r={u(9 * k)} /><circle cx={u(bw * x)} cy={u(bh * y - 3 * k)} r={u(12 * k)} /><circle cx={u(bw * x + 13 * k)} cy={u(bh * y + 3 * k)} r={u(9 * k)} />
            <rect x={u(bw * x - 12 * k)} y={u(bh * y + 3 * k)} width={u(25 * k)} height={u(9 * k)} />
          </g>
        ))}
        {crayons.map((c, i) => {
          const x = bw * 0.08 + i * 9, y = bh * 0.95;
          return <g key={i} transform={`rotate(${-8 + i * 3} ${u(x)} ${u(y)})`}><rect x={u(x - 3)} y={u(y - 26)} width={u(6)} height={u(30)} rx={u(1)} fill={c} /><path d={`M${u(x - 3)} ${u(y - 26)}L${u(x)} ${u(y - 33)}L${u(x + 3)} ${u(y - 26)}Z`} fill={c} opacity={0.8} /></g>;
        })}
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={star(bw * (0.1 + rnd() * 0.8), bh * (0.08 + rnd() * 0.84), 2.4 + rnd() * 2, rnd())} fill={[p.accent, p.deco, '#4FC3F7'][i % 3]} opacity={0.75} />)}
      </>
    );
  }
  if (purpose === 'opening') {
    const n = 28, R = Math.max(bw, bh) * 1.2, ox = cx, oy = bh * 0.48;
    return (
      <>
        {big}
        {Array.from({ length: n }, (_, i) => {
          if (i % 2) return null;
          const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
          return <path key={i} d={`M${u(ox)} ${u(oy)}L${u(ox + R * Math.cos(a0))} ${u(oy + R * Math.sin(a0))}L${u(ox + R * Math.cos(a1))} ${u(oy + R * Math.sin(a1))}Z`} fill={p.soft} />;
        })}
        {Array.from({ length: 46 }, (_, i) => {
          const x = rnd() * bw, y = rnd() * bh, c = [p.accent, p.deco, '#2EC4B6', '#9B5DE5'][i % 4], r = rnd();
          return i % 3 === 0
            ? <circle key={i} cx={u(x)} cy={u(y)} r={u(1.2 + r * 1.4)} fill={c} />
            : <rect key={i} x={u(x)} y={u(y)} width={u(2 + r * 2.5)} height={u(1.2)} fill={c} transform={`rotate(${Math.round(r * 360)} ${u(x)} ${u(y)})`} />;
        })}
      </>
    );
  }
  if (purpose === 'campaign') {
    const leaf = (x: number, y: number, s: number, rot: number, c: string, k: number) => (
      <g key={k} transform={`translate(${u(x)} ${u(y)}) rotate(${rot}) scale(${(s * U / 40).toFixed(4)})`}>
        <path d="M0 20C0 6 12 -6 30 -8C30 10 18 22 0 20Z" fill={c} />
        <path d="M1 19Q14 8 27 -5" stroke={p.bg} strokeWidth={1.6} fill="none" opacity={0.7} />
      </g>
    );
    return (
      <>
        {big}
        <path d={`M${u(-60)} ${u(bh * 0.86)}Q${u(bw * 0.3)} ${u(bh * 0.74)} ${u(bw * 0.6)} ${u(bh * 0.84)}T${u(bw + 60)} ${u(bh * 0.8)}V${u(bh + 140)}H${u(-60)}Z`} fill={p.soft} />
        <path d={`M${u(-60)} ${u(bh * 0.93)}Q${u(bw * 0.4)} ${u(bh * 0.84)} ${u(bw * 0.75)} ${u(bh * 0.92)}T${u(bw + 60)} ${u(bh * 0.9)}V${u(bh + 140)}H${u(-60)}Z`} fill={p.deco} opacity={0.75} />
        {[[0.08, 0.12, 22, -20], [0.86, 0.1, 18, 35], [0.92, 0.5, 14, 80], [0.04, 0.55, 16, -60], [0.18, 0.86, 14, 10], [0.8, 0.84, 16, 160]].map(([x, y, s, r], i) => leaf(bw * x, bh * y, s, r, i % 2 ? p.accent : p.deco, i))}
        <circle cx={u(bw * 0.86)} cy={u(bh * 0.24)} r={u(bw * 0.05)} fill="none" stroke={p.accent} strokeWidth={u(1.6)} opacity={0.5} />
      </>
    );
  }
  if (purpose === 'music') {
    const ox = cx, oy = bh * 0.5;
    return (
      <>
        {big}
        {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={u(ox)} cy={u(oy)} r={u(18 + i * 13)} fill="none" stroke={i % 3 === 0 ? p.accent : p.soft} strokeWidth={u(i % 3 === 0 ? 1 : 2.4)} opacity={i % 3 === 0 ? 0.35 : 0.9} />)}
        {Array.from({ length: Math.round(bw / 7) }, (_, i) => { const h = 6 + Math.abs(Math.sin(i * 1.7)) * 22 + rnd() * 6; return <rect key={i} x={u(i * 7 + 1)} y={u(bh * 0.97 - h)} width={u(4.4)} height={u(h + 40)} rx={u(1)} fill={i % 2 ? p.accent : p.deco} opacity={0.85} />; })}
        {[[0.1, 0.12, 13], [0.82, 0.1, 15], [0.9, 0.55, 10], [0.06, 0.58, 11]].map(([x, y, s], i) => note(bw * x, bh * y, s, i % 2 ? p.deco : p.accent, `n${i}`))}
        {Array.from({ length: 14 }, (_, i) => <path key={i} d={star(bw * rnd(), bh * rnd() * 0.85, 1 + rnd() * 1.4, rnd())} fill="#FFFFFF" opacity={0.6} />)}
      </>
    );
  }
  if (purpose === 'clinic') {
    const cross = (x: number, y: number, s: number, c: string, o: number, k: number) => (
      <path key={k} d={`M${u(x - s * 0.18)} ${u(y - s / 2)}h${u(s * 0.36)}v${u(s * 0.32)}h${u(s * 0.32)}v${u(s * 0.36)}h${u(-s * 0.32)}v${u(s * 0.32)}h${u(-s * 0.36)}v${u(-s * 0.32)}h${u(-s * 0.32)}v${u(-s * 0.36)}h${u(s * 0.32)}Z`} fill={c} opacity={o} />
    );
    return (
      <>
        {big}
        <circle cx={u(bw * 0.95)} cy={u(bh * 0.02)} r={u(bw * 0.34)} fill={p.soft} />
        <circle cx={u(bw * 0.02)} cy={u(bh * 0.98)} r={u(bw * 0.3)} fill={p.soft} />
        {cross(bw * 0.14, bh * 0.18, 16, p.accent, 0.9, 1)}
        {cross(bw * 0.88, bh * 0.78, 12, p.deco, 0.9, 2)}
        {cross(bw * 0.8, bh * 0.14, 8, p.deco, 0.8, 3)}
        <g transform={`translate(${u(bw * 0.08)} ${u(bh * 0.7)}) scale(${(U * 0.24).toFixed(3)})`}>
          <path d="M20 8C10 8 4 16 6 30C8 44 12 54 16 66C18 72 24 72 25 64L28 48Q30 42 32 48L35 64C36 72 42 72 44 66C48 54 52 44 54 30C56 16 50 8 40 8C35 8 33 11 30 11C27 11 25 8 20 8Z" fill="#FFFFFF" stroke={p.accent} strokeWidth={3} />
        </g>
        {Array.from({ length: 7 }, (_, i) => <path key={i} d={star(bw * (0.1 + rnd() * 0.8), bh * (0.1 + rnd() * 0.8), 1.6 + rnd() * 1.6, 0)} fill={p.deco} opacity={0.7} />)}
      </>
    );
  }
  if (purpose === 'realty') {
    const base = bh * 0.97;
    const towers = Array.from({ length: Math.round(bw / 13) + 1 }, (_, i) => ({ x: i * 13 - 4, w: 11, h: 14 + Math.abs(Math.sin(i * 2.3)) * 30 + (i % 4 === 1 ? 12 : 0) }));
    return (
      <>
        {big}
        <circle cx={u(bw * 0.8)} cy={u(bh * 0.18)} r={u(bw * 0.09)} fill={p.accent} opacity={0.9} />
        {towers.map((t, i) => (
          <g key={i}>
            <rect x={u(t.x)} y={u(base - t.h)} width={u(t.w)} height={u(t.h + 40)} fill={p.soft} />
            {Array.from({ length: Math.floor(t.h / 5) }, (_, j) => <rect key={j} x={u(t.x + 2.5)} y={u(base - t.h + 3 + j * 5)} width={u(t.w - 5)} height={u(1.4)} fill={p.accent} opacity={(i + j) % 3 ? 0.25 : 0.7} />)}
          </g>
        ))}
        <path d={`M${u(-60)} ${u(base)}Q${u(bw * 0.25)} ${u(base - 3)} ${u(bw * 0.5)} ${u(base)}T${u(bw + 60)} ${u(base)}V${u(bh + 140)}H${u(-60)}Z`} fill={p.accent} opacity={0.55} />
        <path d={`M${u(bw * 0.06)} ${u(bh * 0.06)}H${u(bw * 0.94)}`} stroke={p.accent} strokeWidth={u(0.8)} opacity={0.7} />
      </>
    );
  }
  // sport: sọc chéo + sao
  const stripes = Array.from({ length: 14 }, (_, i) => <rect key={i} x={u(-120 + i * 34)} y={u(-120)} width={u(16)} height={u(bh + 400)} fill={p.soft} transform={`rotate(24 ${u(cx)} ${u(bh / 2)})`} />);
  return (
    <>
      {big}
      {stripes}
      {[[0.12, 0.14, 11], [0.86, 0.16, 9], [0.9, 0.78, 12], [0.1, 0.8, 9], [0.5, 0.06, 6]].map(([x, y, r], i) => <path key={i} d={star(bw * x, bh * y, r, 0)} fill={p.deco} />)}
      {Array.from({ length: 12 }, (_, i) => <circle key={`c${i}`} cx={u(bw * rnd())} cy={u(bh * rnd())} r={u(0.9 + rnd())} fill="#FFFFFF" opacity={0.7} />)}
    </>
  );
}

// nan quạt xoè: sọc sáng/tối theo từng nan + nét gấp (in luôn lên mặt quạt cho ra dáng quạt giấy)
function Pleats({ fold }: { fold: NonNullable<FanGeom['fold']> }) {
  const { px, py, R, a, n } = fold, RR = R * 1.2;
  const at = (th: number): string => `${u(px + RR * Math.sin(th))} ${u(py - RR * Math.cos(th))}`;
  return (
    <g data-role="pleats">
      {Array.from({ length: n }, (_, i) => {
        const t0 = -a + (i * 2 * a) / n, t1 = -a + ((i + 1) * 2 * a) / n;
        return <path key={i} d={`M${u(px)} ${u(py)}L${at(t0)}L${at(t1)}Z`} fill={i % 2 ? '#000000' : '#FFFFFF'} opacity={i % 2 ? 0.07 : 0.1} />;
      })}
      {Array.from({ length: n - 1 }, (_, i) => { const t = -a + ((i + 1) * 2 * a) / n; return <path key={`l${i}`} d={`M${u(px)} ${u(py)}L${at(t)}`} stroke="#000000" strokeOpacity={0.14} strokeWidth={u(0.35)} />; })}
      <circle cx={u(px)} cy={u(py)} r={u(7)} fill="#000000" opacity={0.08} />
    </g>
  );
}

function Phone({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g transform={`translate(${u(x)} ${u(y)}) scale(${(s * U / 100).toFixed(4)})`}>
      <path d="M30 12Q37 10 41 17L49 32Q51 38 46 42L40 46Q45 58 55 66L59 61Q63 56 69 58L83 66Q89 70 87 76L83 84Q79 90 71 88Q41 80 21 50Q13 32 22 19Z" fill={fill} />
    </g>
  );
}
function Qr({ text, x, y, s, ink }: { text: string; x: number; y: number; s: number; ink: string }) {
  const { d, n } = qrPath(text || ' ');
  const pad = s * 0.08, inner = s - pad * 2;
  return (
    <g data-role="qr">
      <rect x={u(x)} y={u(y)} width={u(s)} height={u(s)} rx={u(s * 0.06)} fill="#FFFFFF" />
      <path d={d} fill={ink} transform={`translate(${u(x + pad)} ${u(y + pad)}) scale(${(inner * U / n).toFixed(4)})`} />
    </g>
  );
}

// ---------- mặt trước ----------
function frontContent(r: Rect, data: FanData, f: FanFont, p: FanPalette, hasPhoto: boolean): ReactNode {
  const eb = (data.eyebrow || '').trim().toUpperCase(), title = (data.title || '').trim(), hl = (data.highlight || '').trim(), sub = (data.sub || '').trim();
  const W = r.w, EB_LS = 0.14;
  let k = 1, L = null as null | { ebS: number; tl: { lines: string[]; size: number }; hlS: number; sb: { lines: string[]; size: number }; total: number; gaps: number[] };
  for (let it = 0; it < 8; it++) {
    const ebS = eb ? fitSize(eb, BODY, 800, W * 0.9, W * 0.058 * k, EB_LS) : 0;
    const tl = fitLines(title, f.family, f.weight, W, W * 0.165 * k, W * 0.115 * k);
    const hlS = hl ? fitSize(hl, f.family, f.weight, W * 0.78, W * 0.12 * k) : 0;
    const sb = fitLines(sub, BODY, 800, W * 0.94, W * 0.06 * k, W * 0.048 * k);
    const gaps = [eb ? ebS * 0.75 : 0, hl ? tl.size * 0.3 : 0, sub ? (hl ? hlS * 0.42 : tl.size * 0.3) : 0];
    const total = (eb ? ebS : 0) + gaps[0] + tl.lines.length * tl.size * 1.02 + gaps[1] + (hl ? hlS * 1.5 : 0) + gaps[2] + sb.lines.length * sb.size * 1.22;
    L = { ebS, tl, hlS, sb, total, gaps };
    if (total <= r.h) break;
    k *= (r.h / total) * 0.985;
  }
  const { ebS, tl, hlS, sb, total, gaps } = L!;
  const cx = r.x + r.w / 2;
  let y = r.y + (r.h - total) / 2;
  const out: ReactNode[] = [];
  if (eb) { out.push(<Txt key="eb" x={cx} cy={y + ebS / 2} text={eb} size={ebS} family={BODY} weight={800} fill={p.dark ? p.deco : p.accent} lsEm={EB_LS} role="eyebrow" />); y += ebS + gaps[0]; }
  if (tl.lines.length) { out.push(<Txt key="tl" x={cx} cy={y + (tl.lines.length * tl.size * 1.02) / 2} text={tl.lines} size={tl.size} family={f.family} weight={f.weight} fill={p.ink} role="title" lineGap={1.02} />); y += tl.lines.length * tl.size * 1.02 + gaps[1]; }
  if (hl) {
    const ph = hlS * 1.5, pw = textW(hl, f.family, f.weight, hlS) + hlS * 1.1;
    out.push(<rect key="pill" x={u(cx - pw / 2)} y={u(y)} width={u(pw)} height={u(ph)} rx={u(ph / 2)} fill={p.accent} data-role="pill" />);
    out.push(<Txt key="hl" x={cx} cy={y + ph / 2} text={hl} size={hlS} family={f.family} weight={f.weight} fill={p.onAccent} role="highlight" />);
    y += ph + gaps[2];
  }
  if (sb.lines.length) out.push(<Txt key="sb" x={cx} cy={y + (sb.lines.length * sb.size * 1.22) / 2} text={sb.lines} size={sb.size} family={BODY} weight={800} fill={hasPhoto ? p.ink : p.sub} role="sub" lineGap={1.22} />);
  return <>{out}</>;
}

// ---------- mặt sau ----------
type Split = { cx: number; gap: number; yTop: number };
/** cột chữ: logo → tên → các ý → hotline (→ địa chỉ). Co đều cho vừa khung c; trả về node + đáy cột */
function column(c: Rect, base: number, data: FanData, f: FanFont, p: FanPalette, anchor: 'start' | 'middle', withAddr: boolean, valign: 'center' | 'top', logo?: string): { nodes: ReactNode[]; end: number } {
  const brand = (data.brand || '').trim(), hot = (data.hotline || '').trim(), addr = withAddr ? (data.address || '').trim() : '';
  const info = (data.info || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const ax = anchor === 'middle' ? c.x + c.w / 2 : c.x;
  type Lay = { lg: number; br: { lines: string[]; size: number }; inS: number; hf: number; ad: { lines: string[]; size: number }; g: number; total: number };
  let k = 1, L: Lay | null = null;
  for (let it = 0; it < 12; it++) {
    const g = base * 0.032 * k;
    const lg = logo ? base * 0.15 * k : 0;
    const br = fitLines(brand, f.family, f.weight, c.w, base * 0.1 * k, base * 0.075 * k);
    const inS = info.length ? Math.min(...info.map((t) => fitSize(t, BODY, 600, c.w - base * 0.06 * k, base * 0.052 * k))) : 0;
    const hf = hot ? fitSize(hot, NUM, 700, c.w - base * 0.13 * k, base * 0.12 * k, 0.03) : 0;
    const ad = fitLines(addr, BODY, 600, c.w, base * 0.044 * k, base * 0.036 * k);
    const total = (lg ? lg + g : 0) + br.lines.length * br.size * 1.04 + (info.length ? g + info.length * inS * 1.5 : 0) + (hot ? g + hf * 1.2 : 0) + (ad.lines.length ? g + ad.lines.length * ad.size * 1.25 : 0);
    L = { lg, br, inS, hf, ad, g, total };
    if (total <= c.h) break;
    k *= (c.h / total) * 0.985;
  }
  const { lg, br, inS, hf, ad, g, total } = L!;
  const nodes: ReactNode[] = [];
  let y = valign === 'top' ? c.y : c.y + (c.h - total) / 2;
  if (lg && logo) { nodes.push(<image key="lg" href={logo} x={u(anchor === 'middle' ? ax - lg / 2 : ax)} y={u(y)} width={u(lg)} height={u(lg)} preserveAspectRatio="xMidYMid meet" data-role="logo" />); y += lg + g; }
  if (br.lines.length) { const h = br.lines.length * br.size * 1.04; nodes.push(<Txt key="br" x={ax} cy={y + h / 2} text={br.lines} size={br.size} family={f.family} weight={f.weight} fill={p.ink} anchor={anchor} role="brand" lineGap={1.04} />); y += h; }
  if (info.length) {
    y += g;
    const bulletR = inS * 0.2, indent = inS * 0.75;
    info.forEach((t, i) => {
      const cy = y + inS * 0.75 + i * inS * 1.5;
      const tw = textW(t, BODY, 600, inS);
      const tx = anchor === 'middle' ? ax - (tw + indent) / 2 + indent : ax + indent;
      nodes.push(<circle key={`b${i}`} cx={u(tx - indent + bulletR)} cy={u(cy)} r={u(bulletR)} fill={p.accent} />);
      nodes.push(<Txt key={`i${i}`} x={tx} cy={cy} text={t} size={inS} family={BODY} weight={600} fill={p.sub} anchor="start" role="info" />);
    });
    y += info.length * inS * 1.5;
  }
  if (hot) {
    y += g;
    const ic = hf * 0.95, tw = textW(hot, NUM, 700, hf, 0.03), gap = hf * 0.25;
    const x0 = anchor === 'middle' ? ax - (ic + gap + tw) / 2 : ax;
    const cy = y + hf * 0.6;
    nodes.push(<circle key="pc" cx={u(x0 + ic / 2)} cy={u(cy)} r={u(ic / 2)} fill={p.accent} />);
    nodes.push(<Phone key="ph" x={x0 + ic * 0.18} y={cy - ic * 0.32} s={ic * 0.64} fill={p.onAccent} />);
    nodes.push(<Txt key="ht" x={x0 + ic + gap} cy={cy} text={hot} size={hf} family={NUM} weight={700} fill={p.dark ? p.deco : p.accent} anchor="start" lsEm={0.03} role="hotline" />);
    y += hf * 1.2;
  }
  if (ad.lines.length) { y += g; const h = ad.lines.length * ad.size * 1.25; nodes.push(<Txt key="ad" x={ax} cy={y + h / 2} text={ad.lines} size={ad.size} family={BODY} weight={600} fill={p.sub} anchor={anchor} role="address" lineGap={1.25} />); y += h; }
  return { nodes, end: y };
}

function backContent(r: Rect, data: FanData, f: FanFont, p: FanPalette, logo?: string, split?: Split): ReactNode {
  const addr = (data.address || '').trim(), link = (data.link || '').trim();
  const hasQr = !!link, wide = r.w / r.h > 1.9;
  const base = Math.min(r.w, r.h * 1.3);
  const qrInk = p.dark ? p.bg : p.ink;
  const out: ReactNode[] = [];
  const qrAt = (x: number, y: number, q: number) => {
    out.push(<Qr key="qr" text={link} x={x} y={y} s={q} ink={qrInk} />);
    out.push(<Txt key="ql" x={x + q / 2} cy={y + q + 2.8} text="Quét mã" size={Math.min(3.2, q * 0.11)} family={BODY} weight={800} fill={p.sub} role="qr-label" />);
  };
  if (wide) {
    if (hasQr) {
      const q = Math.min(r.h - 8, r.w * 0.3);
      qrAt(r.x, r.y + (r.h - q - 5) / 2, q);
      out.push(...column({ x: r.x + q + 7, y: r.y, w: r.w - q - 7, h: r.h }, base, data, f, p, 'start', true, 'center', logo).nodes);
    } else out.push(...column(r, base, data, f, p, 'middle', true, 'center', logo).nodes);
    return <>{out}</>;
  }
  if (split && split.yTop < r.y + r.h) {
    // tay cầm rời: phần dưới bị que che ở giữa → cột chữ ở trên đầu que, QR bên trái que, địa chỉ bên phải que
    const col = column({ x: r.x, y: r.y, w: r.w, h: split.yTop - r.y }, base, data, f, p, 'middle', !hasQr, hasQr ? 'top' : 'center', logo);
    out.push(...col.nodes);
    if (hasQr) {
      const yRow = col.end + base * 0.04, hr = r.y + r.h - yRow;
      const q = Math.max(14, Math.min(hr - 5, split.cx - split.gap - r.x - 2, 36));
      const qy = yRow + Math.max(0, (hr - q - 5) / 2);
      qrAt(split.cx - split.gap - q, qy, q);
      if (addr) {
        const ax = split.cx + split.gap, aw = r.x + r.w - ax;
        const ad = fitLines(addr, BODY, 600, aw, base * 0.044, base * 0.03);
        out.push(<Txt key="ad" x={ax} cy={qy + q / 2} text={ad.lines} size={ad.size} family={BODY} weight={600} fill={p.sub} anchor="start" role="address" lineGap={1.25} />);
      }
    }
    return <>{out}</>;
  }
  if (hasQr) {
    const q = Math.min(r.w * 0.3, r.h * 0.33);
    const rowY = r.y + r.h - q - 5;
    out.push(...column({ x: r.x, y: r.y, w: r.w, h: rowY - base * 0.03 - r.y }, base, data, f, p, 'middle', false, 'center', logo).nodes);
    qrAt(r.x + r.w - q, rowY, q);
    if (addr) {
      const ad = fitLines(addr, BODY, 600, r.w - q - 5, base * 0.044, base * 0.036);
      out.push(<Txt key="ad" x={r.x} cy={rowY + q / 2} text={ad.lines} size={ad.size} family={BODY} weight={600} fill={p.sub} anchor="start" role="address" lineGap={1.25} />);
    }
  } else out.push(...column(r, base, data, f, p, 'middle', true, 'center', logo).nodes);
  return <>{out}</>;
}

/**
 * 1 mặt quạt. bleed = có lề xén (nền tràn 2mm ngoài đường cắt, cho file in).
 * Không bleed: đúng khung thành phẩm, ngoài đường cắt trong suốt (xem trước, texture 3D).
 */
export function FanSvg({ spec, data, side, logo, photo, bleed = false, cut = false, style, nested }: {
  spec: FanSpec; data: FanData; side: 'front' | 'back'; logo?: string; photo?: string; bleed?: boolean; cut?: boolean; style?: CSSProperties; nested?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const g = fanGeom(spec.shape, spec.handle);
  const W = u(g.W), H = u(g.H), b = bleed ? u(FAN_BLEED_MM) : 0;
  const p = fanPalette(spec.palette), f = fanFont(spec.font);
  const brand = (data.brand || '').trim();

  const handleBand = g.handle && (() => {
    const hy0 = g.handle!.neckY + FL * 0.55;
    const len = g.handle!.y1 - g.handle!.y0;
    const hs = brand ? Math.min(7.5, fitSize(brand, f.family, f.weight, len, 9)) : 0;
    const hcx = g.cx, hcy = (g.handle!.y0 + g.handle!.y1) / 2;
    return (
      <>
        <rect x={u(g.cx - 40)} y={u(hy0)} width={u(80)} height={u(g.H - hy0 + 30)} fill={p.accent} data-role="handle" />
        {hs >= 3.4 && (
          <g transform={`rotate(-90 ${u(hcx)} ${u(hcy)})`}>
            <Txt x={hcx} cy={hcy} text={brand} size={hs} family={f.family} weight={f.weight} fill={p.onAccent} role="handle-brand" />
          </g>
        )}
      </>
    );
  })();

  let zones: ReactNode, content: ReactNode;
  if (side === 'front') {
    zones = (
      <>
        {photo ? (
          <>
            <rect x={u(-60)} y={u(-60)} width={u(g.W + 120)} height={u(g.H + 120)} fill={p.bg} />
            <image href={photo} x={0} y={0} width={u(g.W)} height={u(g.bh)} preserveAspectRatio="xMidYMid slice" data-role="photo" />
            <rect x={u(-60)} y={u(-60)} width={u(g.W + 120)} height={u(g.bh + 120)} fill={p.bg} opacity={0.58} />
          </>
        ) : <Backdrop purpose={spec.purpose} p={p} bw={g.W} bh={g.bh} cx={g.cx} />}
        {g.fold && <Pleats fold={g.fold} />}
      </>
    );
    // tay cầm rời: đinh tán trên của que lộ ở mặt trước → chữ dừng phía trên đinh
    const safeF = g.stickY0 !== undefined ? { ...g.safe, h: Math.min(g.safe.h, g.stickY0 + 12 - 6 - g.safe.y) } : g.safe;
    content = frontContent(safeF, data, f, p, !!photo);
  } else {
    zones = (
      <>
        <rect x={u(-60)} y={u(-60)} width={u(g.W + 120)} height={u(g.H + 120)} fill={p.bg} />
        <circle cx={u(g.W * 0.94)} cy={u(g.bh * 0.04)} r={u(g.W * 0.26)} fill={p.soft} />
        <circle cx={u(g.W * 0.04)} cy={u(g.bh * 0.98)} r={u(g.W * 0.22)} fill={p.soft} />
        {g.fold && <Pleats fold={g.fold} />}
      </>
    );
    // tay cầm rời: que tán ở giữa lưng, phủ 1/3 dưới cánh quạt → chữ né que (QR trái, địa chỉ phải)
    content = backContent(g.safe, data, f, p, logo, g.stickY0 !== undefined ? { cx: g.cx, gap: 10, yTop: g.stickY0 - 6 } : undefined);
  }

  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
      width={nested ? W + b * 2 : undefined} height={nested ? H + b * 2 : undefined} style={style} data-shape={spec.shape} data-side={side}>
      <defs>
        <mask id={`${uid}-m`} maskUnits="userSpaceOnUse" x={-b - 10} y={-b - 10} width={W + b * 2 + 20} height={H + b * 2 + 20}>
          <path d={g.d} transform={`scale(${U})`} fill="#FFFFFF" fillRule="evenodd" stroke={bleed ? '#FFFFFF' : 'none'} strokeWidth={bleed ? FAN_BLEED_MM * 2 : 0} strokeLinejoin="round" />
        </mask>
      </defs>
      <g mask={`url(#${uid}-m)`}>
        {zones}
        <g id="Content">
          {content}
          {handleBand}
        </g>
      </g>
      {cut && <path id="CutPreview" d={g.d} transform={`scale(${U})`} fill="none" fillRule="evenodd" stroke={CUTCONTOUR} strokeWidth={0.3} strokeDasharray="1.5 1" />}
      {cut && side === 'front' && g.stickY0 !== undefined && (
        <g data-role="rivet-guide" opacity={0.45}>
          <circle cx={u(g.cx)} cy={u(g.stickY0 + 12)} r={u(2.2)} fill="#9CA3AF" stroke="#FFFFFF" strokeWidth={u(0.4)} />
          <circle cx={u(g.cx)} cy={u(g.H - 18)} r={u(2.2)} fill="#9CA3AF" stroke="#FFFFFF" strokeWidth={u(0.4)} />
        </g>
      )}
      {cut && side === 'back' && g.stickY0 !== undefined && (
        <g data-role="stick-guide" opacity={0.55}>
          <rect x={u(g.cx - 6)} y={u(g.stickY0)} width={u(12)} height={u(g.H - g.stickY0 + 4)} rx={u(1.5)} fill="none" stroke="#6B7280" strokeWidth={u(0.5)} strokeDasharray={`${u(1.6)} ${u(1.2)}`} />
          <circle cx={u(g.cx)} cy={u(g.stickY0 + 12)} r={u(2.2)} fill="#6B7280" />
          <circle cx={u(g.cx)} cy={u(g.H - 18)} r={u(2.2)} fill="#6B7280" />
        </g>
      )}
    </svg>
  );
}

// ---------- tờ in 65×100cm: xếp lưới, lớp In + CutContour ----------
export const FAN_SHEET = { wMm: 650, hMm: 1000, marginMm: 12, gapMm: 6 };
export function fanSheetFit(shape: FanShapeId, handle: FanHandle) {
  const g = fanGeom(shape, handle);
  const gap = FAN_SHEET.gapMm, m = FAN_SHEET.marginMm;
  const grid = (w: number, h: number) => ({
    cols: Math.max(1, Math.floor((FAN_SHEET.wMm - m * 2 + gap) / (w + gap))),
    rows: Math.max(1, Math.floor((FAN_SHEET.hMm - m * 2 - 10 + gap) / (h + gap))),
    w, h,
  });
  const a = grid(g.W, g.H), r = grid(g.H, g.W);
  const rot = r.cols * r.rows > a.cols * a.rows;
  const { cols, rows, w, h } = rot ? r : a;
  const x0 = (FAN_SHEET.wMm - (cols * w + (cols - 1) * gap)) / 2;
  const y0 = (FAN_SHEET.hMm - 10 - (rows * h + (rows - 1) * gap)) / 2;
  return { cols, rows, per: cols * rows, x0, y0, g, rot, cw: w, ch: h };
}
export function FanSheetSvg({ spec, data, side, logo, photo, style }: { spec: FanSpec; data: FanData; side: 'front' | 'back'; logo?: string; photo?: string; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const fit = fanSheetFit(spec.shape, spec.handle);
  const { g } = fit;
  const W = u(FAN_SHEET.wMm), H = u(FAN_SHEET.hMm), b = u(FAN_BLEED_MM);
  const cells = Array.from({ length: fit.per }, (_, i) => {
    // mặt sau: đảo cột để khớp mặt trước khi in 2 mặt (hình quạt đối xứng → lưới căn giữa nên vị trí trùng)
    const col = side === 'back' ? fit.cols - 1 - (i % fit.cols) : i % fit.cols;
    const x = u(fit.x0 + col * (fit.cw + FAN_SHEET.gapMm)), y = u(fit.y0 + Math.floor(i / fit.cols) * (fit.ch + FAN_SHEET.gapMm));
    return fit.rot ? `translate(${x + u(g.H)} ${y}) rotate(90)` : `translate(${x} ${y})`;
  });
  const hName = FAN_HANDLES.find((h) => h.id === spec.handle)!.name.toLowerCase();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={`${FAN_SHEET.wMm}mm`} height={`${FAN_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" style={style} data-count={fit.per} data-side={side}>
      <defs>
        <g id={`${uid}-fan`} data-fan-def="1"><FanSvg spec={spec} data={data} side={side} logo={logo} photo={photo} bleed nested /></g>
        <path id={`${uid}-cut`} d={g.d} fillRule="evenodd" />
      </defs>
      <g id="In">
        {cells.map((t, i) => <use key={i} href={`#${uid}-fan`} x={-b} y={-b} transform={t} />)}
      </g>
      <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={0.1}>
        <title>CutContour</title>
        {cells.map((t, i) => <use key={i} href={`#${uid}-cut`} transform={`${t} scale(${U})`} />)}
      </g>
      <text x={u(FAN_SHEET.marginMm)} y={H - u(5)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={u(4.2)} fill="#9CA3AF">
        {`Mivy · quạt ${FAN_SHAPES.find((s) => s.id === spec.shape)!.name} · ${hName} · ${side === 'front' ? 'MẶT TRƯỚC' : 'MẶT SAU'} · ${fit.per} cái/tờ 65x100cm · lề xén ${FAN_BLEED_MM}mm · CutContour = đường bế`}
      </text>
    </svg>
  );
}
