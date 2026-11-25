'use client';
// Thẻ cào trúng thưởng: 1 engine SVG = BỐ CỤC × CHỦ ĐỀ (hình vẽ code) × BẢNG MÀU × FONT.
// Mỗi thẻ: nền in chung (lớp In) + nội dung RIÊNG từng tấm (lớp Variable: giải + mã cào + số seri)
// + lớp mực cào bạc/vàng (lớp Scratch, chỉ là vùng phủ) + đường cắt (CutContour).
// Giải thưởng chia theo bảng "Tên giải | số lượng" → xáo trộn theo seed (lặp lại được) → mỗi tấm 1 giải + 1 mã cào riêng.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';
import { qrPath } from './flyer-qr';

export const U = 10; // px / mm
export const SC_BLEED_MM = 2;
export const CUTCONTOUR = '#EC008C';
const BODY = 'Be Vietnam Pro';

// dùng chung bộ font của voucher (đều có TTF → outline được)
export { VC_FONT_CSS as SC_FONT_CSS, useVCFonts as useSCFonts } from './voucher-engine';

// ---------- khổ ----------
export interface SCSize { id: string; name: string; wMm: number; hMm: number; rMm: number }
export const SC_SIZES: SCSize[] = [
  { id: '85x54', name: '8,5 × 5,4 cm (thẻ ATM)', wMm: 85, hMm: 54, rMm: 3 },
  { id: '90x55', name: '9 × 5,5 cm', wMm: 90, hMm: 55, rMm: 2.5 },
  { id: '60x90', name: '6 × 9 cm (dọc)', wMm: 60, hMm: 90, rMm: 3 },
];
export const scSize = (id: string) => SC_SIZES.find((s) => s.id === id) || SC_SIZES[0];

// ---------- vùng cào ----------
export type SCZone = 'rect' | 'circle' | 'star' | 'ticket';
export const SC_ZONES: { id: SCZone; name: string }[] = [
  { id: 'rect', name: 'Chữ nhật bo góc' },
  { id: 'circle', name: 'Tròn' },
  { id: 'star', name: 'Ngôi sao' },
  { id: 'ticket', name: 'Vé (khuyết 2 bên)' },
];
export type SCInk = 'silver' | 'gold';

// ---------- font ----------
export interface SCFont { id: string; name: string; family: string; weight: number }
export const SC_FONTS: SCFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const scFont = (id: string) => SC_FONTS.find((f) => f.id === id) || SC_FONTS[0];

// ---------- bảng màu ----------
// bg/bg2 = nền thẻ, accent = điểm nhấn, onBg = chữ trên nền, paper = nền ô giải (dưới lớp cào), prize = màu chữ giải
export interface SCPalette { id: string; name: string; bg: string; bg2: string; accent: string; onBg: string; paper: string; prize: string; back: string; backInk: string }
export const SC_PALETTES: SCPalette[] = [
  { id: 'tet', name: 'Đỏ Tết', bg: '#B3121B', bg2: '#E0302A', accent: '#F7C948', onBg: '#FFF6E0', paper: '#FFF8E6', prize: '#B3121B', back: '#FFF8EE', backInk: '#4A1410' },
  { id: 'gold', name: 'Vàng kim', bg: '#F2B705', bg2: '#FFD54A', accent: '#B3121B', onBg: '#3A2200', paper: '#FFFDF4', prize: '#B3121B', back: '#FFFBEF', backInk: '#3A2200' },
  { id: 'green', name: 'Xanh lá', bg: '#0E7A4F', bg2: '#19A66A', accent: '#FFD84D', onBg: '#F2FFF7', paper: '#F7FFF9', prize: '#0E7A4F', back: '#F5FBF7', backInk: '#0B3B27' },
  { id: 'purple', name: 'Tím', bg: '#5B21B6', bg2: '#8B5CF6', accent: '#FDE047', onBg: '#FAF5FF', paper: '#FBF8FF', prize: '#5B21B6', back: '#FAF7FF', backInk: '#2E1065' },
  { id: 'navy', name: 'Navy', bg: '#14285A', bg2: '#25448F', accent: '#F5B82E', onBg: '#F1F5FF', paper: '#F7F9FF', prize: '#14285A', back: '#F6F8FD', backInk: '#14285A' },
  { id: 'pink', name: 'Hồng', bg: '#DB2777', bg2: '#F472B6', accent: '#FFF1A8', onBg: '#FFF5FA', paper: '#FFF7FB', prize: '#BE185D', back: '#FFF7FB', backInk: '#5B1033' },
  { id: 'orange', name: 'Cam', bg: '#EA580C', bg2: '#FB923C', accent: '#FFF3B0', onBg: '#FFF8F1', paper: '#FFFBF5', prize: '#C2410C', back: '#FFF9F3', backInk: '#4A1D05' },
  { id: 'black', name: 'Đen vàng', bg: '#151515', bg2: '#2C2C2C', accent: '#E8C26A', onBg: '#F7F0DC', paper: '#FFFCF2', prize: '#151515', back: '#FBF8EF', backInk: '#1C1C1C' },
];
export const scPalette = (id: string) => SC_PALETTES.find((p) => p.id === id) || SC_PALETTES[0];

// ---------- chủ đề + bố cục + mẫu ----------
export type SCTheme = 'khaitruong' | 'sieuthi' | 'nhahang' | 'sukien' | 'thoitrang' | 'tet';
export const SC_THEMES: { id: SCTheme; name: string }[] = [
  { id: 'khaitruong', name: 'Khai trương' }, { id: 'sieuthi', name: 'Siêu thị' }, { id: 'nhahang', name: 'Nhà hàng' },
  { id: 'sukien', name: 'Sự kiện' }, { id: 'thoitrang', name: 'Thời trang' }, { id: 'tet', name: 'Tết · lì xì cào' },
];
export type SCLayout = 'banner' | 'side' | 'center';
export const SC_LAYOUTS: { id: SCLayout; name: string }[] = [
  { id: 'banner', name: 'Tiêu đề trên · ô cào dưới' }, { id: 'side', name: 'Chữ trái · ô cào phải' }, { id: 'center', name: 'Ô cào giữa' },
];

export interface SCSpec { layout: SCLayout; theme: SCTheme; palette: string; font: string; size: string; zone: SCZone; ink: SCInk }
export interface SCTemplate { id: string; name: string; spec: Omit<SCSpec, 'size'> }
const T = (id: string, name: string, theme: SCTheme, layout: SCLayout, palette: string, font: string, zone: SCZone, ink: SCInk = 'silver'): SCTemplate => ({ id, name, spec: { theme, layout, palette, font, zone, ink } });
export const SC_TEMPLATES: SCTemplate[] = [
  T('kt-do', 'Khai trương · đỏ', 'khaitruong', 'banner', 'tet', 'montserrat', 'rect'),
  T('kt-tim', 'Khai trương · tím', 'khaitruong', 'side', 'purple', 'baloo', 'star', 'gold'),
  T('st-cam', 'Siêu thị · cam', 'sieuthi', 'side', 'orange', 'baloo', 'rect'),
  T('st-xanh', 'Siêu thị · xanh', 'sieuthi', 'banner', 'green', 'montserrat', 'ticket'),
  T('nh-navy', 'Nhà hàng · navy', 'nhahang', 'side', 'navy', 'playfair', 'circle', 'gold'),
  T('nh-den', 'Nhà hàng · đen vàng', 'nhahang', 'center', 'black', 'playfair', 'rect', 'gold'),
  T('sk-tim', 'Sự kiện · tím', 'sukien', 'center', 'purple', 'oswald', 'star'),
  T('sk-hong', 'Sự kiện · hồng', 'sukien', 'banner', 'pink', 'baloo', 'circle'),
  T('tt-den', 'Thời trang · đen', 'thoitrang', 'side', 'black', 'oswald', 'ticket'),
  T('tt-hong', 'Thời trang · hồng', 'thoitrang', 'center', 'pink', 'montserrat', 'rect'),
  T('tet-do', 'Lì xì cào · đỏ', 'tet', 'center', 'tet', 'playfair', 'circle', 'gold'),
  T('tet-vang', 'Lì xì cào · vàng', 'tet', 'banner', 'gold', 'baloo', 'star'),
];

// ---------- dữ liệu ----------
export type SCData = Record<string, string>;
const SAMPLE: Record<SCTheme, Partial<SCData>> = {
  khaitruong: { brand: 'AN KHANG MART', title: 'CÀO LÀ TRÚNG', sub: 'Mừng khai trương chi nhánh mới', prizes: 'Xe đạp thể thao | 1\nPhiếu mua hàng 200k | 9\nGiảm 20k cho đơn sau | 40\nChúc may mắn lần sau | 150' },
  sieuthi: { brand: 'AN KHANG MART', title: 'CÀO NGAY – TRÚNG LIỀN', sub: 'Hoá đơn từ 300k nhận 1 thẻ cào', prizes: 'Nồi chiên không dầu | 1\nPhiếu mua hàng 100k | 9\nTặng 1 thùng nước suối | 40\nChúc may mắn lần sau | 150' },
  nhahang: { brand: 'BẾP NHÀ QUỐC BẢO', title: 'Cào nhận quà', sub: 'Tri ân thực khách thân thiết', prizes: 'Bữa tối cho 2 người | 1\nGiảm 30% hoá đơn | 9\nTặng 1 món tráng miệng | 40\nChúc may mắn lần sau | 150' },
  sukien: { brand: 'GALA AN KHANG 2026', title: 'LUCKY DRAW', sub: 'Cào thẻ – nhận quà ngay tại sự kiện', prizes: 'Điện thoại thông minh | 1\nTai nghe không dây | 9\nBình giữ nhiệt | 40\nChúc may mắn lần sau | 150' },
  thoitrang: { brand: 'THU HÀ FASHION', title: 'SCRATCH & WIN', sub: 'Cào để mở quà – áp dụng toàn bộ cửa hàng', prizes: 'Voucher 500k | 1\nGiảm 30% | 9\nGiảm 10% | 40\nChúc may mắn lần sau | 150' },
  tet: { brand: 'AN KHANG MART', title: 'Lì xì cào may mắn', sub: 'Xuân Đinh Mùi 2027 – Lộc đầy nhà', prizes: 'Lì xì 1.000.000đ | 1\nLì xì 100.000đ | 9\nLì xì 20.000đ | 40\nChúc năm mới an khang | 150' },
};
const COMMON: SCData = {
  hint: 'Cào lớp bạc để nhận quà',
  rules: 'Cào nhẹ lớp bạc để xem giải thưởng.\nMỗi thẻ chỉ đổi thưởng 1 lần, kèm hoá đơn.\nThẻ rách, tẩy xoá hoặc mất mã không hợp lệ.\nKhông quy đổi thành tiền mặt.',
  expiry: '31/03/2027',
  redeem: 'Đổi thưởng tại quầy thu ngân',
  hotline: '0909 123 456',
  address: '12 Nguyễn Huệ, Q.1, TP.HCM',
  website: 'ankhang.vn',
  prefix: 'AK',
  start: '1',
  seed: 'ANKHANG-2027',
};
export function sampleData(theme: SCTheme): SCData {
  return { ...COMMON, ...SAMPLE[theme], hint: theme === 'tet' ? 'Cào nhẹ để nhận lộc đầu năm' : COMMON.hint } as SCData;
}
export interface SCField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; side: 'front' | 'back' }
export const SC_FIELDS: SCField[] = [
  { key: 'brand', label: 'Thương hiệu / cửa hàng', half: true, side: 'front' },
  { key: 'title', label: 'Tiêu đề lớn', half: true, side: 'front' },
  { key: 'sub', label: 'Dòng phụ', side: 'front' },
  { key: 'hint', label: 'Chữ hướng dẫn cạnh ô cào', side: 'front' },
  { key: 'rules', label: 'Thể lệ (mặt sau, mỗi dòng 1 ý)', multiline: true, side: 'back' },
  { key: 'redeem', label: 'Cách đổi thưởng', half: true, side: 'back' },
  { key: 'expiry', label: 'Hạn sử dụng', half: true, side: 'back' },
  { key: 'hotline', label: 'Hotline', half: true, side: 'back' },
  { key: 'website', label: 'Website / link (tạo mã QR)', half: true, side: 'back' },
  { key: 'address', label: 'Địa chỉ', side: 'back' },
];

// ---------- phân bổ giải thưởng ----------
export interface SCPrize { name: string; qty: number }
export const MAX_CARDS = 5000;
export function parsePrizes(text: string): SCPrize[] {
  const out: SCPrize[] = [];
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim(); if (!line) continue;
    const [name, q] = line.split('|').map((s) => s.trim());
    const qty = Math.max(0, Math.min(MAX_CARDS, parseInt((q || '1').replace(/\D/g, ''), 10) || 0));
    const nm = name && name.length > 60 ? `${name.slice(0, 60).replace(/\s+\S*$/, '')}…` : name; // cắt ở ranh giới chữ
    if (nm && qty > 0) out.push({ name: nm, qty });
  }
  return out.length ? out : [{ name: 'Chúc may mắn lần sau', qty: 1 }];
}
/** tổng số thẻ (cắt ở MAX_CARDS, phần thừa của giải cuối bị bớt) */
export function prizeTotal(prizes: SCPrize[]) { return Math.min(MAX_CARDS, prizes.reduce((s, p) => s + p.qty, 0)); }

// PRNG có seed: xmur3 (băm chuỗi) → sfc32
function xmur3(str: string) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^= h >>> 16) >>> 0; };
}
function sfc32(a: number, b: number, c: number, d: number) {
  return () => {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0; c = (c << 21) | (c >>> 11); d = (d + 1) | 0; t = (t + d) | 0; c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
export function rngOf(seed: string) { const h = xmur3(seed); return sfc32(h(), h(), h(), h()); }
const CODE_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ 0/O/1/I dễ nhầm
export interface SCCard { i: number; serial: string; prize: string; prizeIdx: number; code: string }
export function serialOf(d: SCData, i: number) {
  const start = Math.max(0, parseInt(d.start || '1', 10) || 0);
  return `${(d.prefix || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)}${String(start + i).padStart(5, '0')}`;
}
/** Xáo giải theo seed (Fisher–Yates) + mã cào 8 ký tự riêng từng tấm (không trùng). Cùng seed → cùng kết quả. */
export function allocate(d: SCData): SCCard[] {
  const prizes = parsePrizes(d.prizes || '');
  const total = prizeTotal(prizes);
  const pool: number[] = [];
  prizes.forEach((p, k) => { for (let j = 0; j < p.qty && pool.length < total; j++) pool.push(k); });
  const rnd = rngOf(`${d.seed || 'mivy'}|giai`);
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  const crnd = rngOf(`${d.seed || 'mivy'}|ma`);
  const used = new Set<string>();
  return pool.map((k, i) => {
    let code = '';
    do { code = Array.from({ length: 8 }, () => CODE_ABC[Math.floor(crnd() * CODE_ABC.length)]).join(''); } while (used.has(code));
    used.add(code);
    return { i, serial: serialOf(d, i), prize: prizes[k].name, prizeIdx: k, code: `${code.slice(0, 4)}-${code.slice(4)}` };
  });
}
export function newSeed(): string {
  const a = new Uint32Array(2);
  (globalThis.crypto || ({} as Crypto)).getRandomValues?.(a);
  return `${(a[0] || Date.now()).toString(36)}${(a[1] || Math.random() * 1e9).toString(36)}`.toUpperCase().slice(0, 12);
}
/** bảng đối chiếu cho chủ cửa hàng: STT, số seri, mã cào, giải (BOM để Excel đọc đúng tiếng Việt) */
export function manifestCsv(cards: SCCard[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  return '﻿' + ['STT,Số seri,Mã cào,Giải thưởng', ...cards.map((c) => [c.i + 1, c.serial, c.code, esc(c.prize)].join(','))].join('\n');
}

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitOne = (t: string, maxW: number, size: number, ts: TS, min = 0) => {
  const w = textW(t, size, ts);
  return Math.max(min, w > maxW ? (size * maxW) / w : size);
};
function wrap(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.split(/\s+/).filter(Boolean); let cur = '';
    for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (!cur || textW(n, size, ts) <= maxW) cur = n; else { out.push(cur); cur = w; } }
    if (cur) out.push(cur);
  }
  return out;
}
/** khối chữ: thử size giảm dần tới khi ≤ maxLines dòng và vừa cao; cân 2 dòng cho đều */
function fitBlock(text: string, maxW: number, maxH: number, size: number, ts: TS, maxLines: number, lh = 1.12, min = 8) {
  let s = size;
  for (let k = 0; k < 40; k++) {
    let lines = wrap(text, maxW, s, ts);
    if (lines.length === 2 && !text.includes('\n')) { // cân 2 dòng
      const words = text.split(/\s+/); let best = lines, bd = Infinity;
      for (let c = 1; c < words.length; c++) { const a = words.slice(0, c).join(' '), b = words.slice(c).join(' '); const wa = textW(a, s, ts), wb = textW(b, s, ts); if (wa <= maxW && wb <= maxW && Math.abs(wa - wb) < bd) { bd = Math.abs(wa - wb); best = [a, b]; } }
      lines = best;
    }
    const widest = Math.max(0, ...lines.map((l) => textW(l, s, ts)));
    if (lines.length <= maxLines && lines.length * s * lh <= maxH && widest <= maxW + 0.5) return { lines, size: s };
    if (s <= min) { // tối thiểu: giữ maxLines dòng, dòng cuối cắt "…"
      const ls = lines.slice(0, maxLines);
      if (lines.length > maxLines) { let last = ls[maxLines - 1]; while (last && textW(`${last}…`, s, ts) > maxW) last = last.slice(0, -1); ls[maxLines - 1] = `${last}…`; }
      return { lines: ls.map((l) => (textW(l, s, ts) > maxW ? l : l)), size: Math.min(s, ...ls.map((l) => fitOne(l, maxW, s, ts))) };
    }
    s = Math.max(min, s * 0.93);
  }
  return { lines: [text], size: min };
}

// ---------- hình học ----------
const f1 = (n: number) => Math.round(n * 10) / 10;
export const rrPath = (x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${f1(x + r)} ${f1(y)}H${f1(x + w - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(y + h - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w - r)} ${f1(y + h)}H${f1(x + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x)} ${f1(y + h - r)}V${f1(y + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(y)}Z`;
};
function starPath(cx: number, cy: number, R: number, r: number, n = 5) {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n; const rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rr)} ${f1(cy + Math.sin(a) * rr)}`;
  }
  return `${d}Z`;
}
export interface Box { x: number; y: number; w: number; h: number } // px

/** đường bao vùng cào (px trong toạ độ thẻ) */
export function zonePath(zone: SCZone, z: Box): string {
  if (zone === 'circle') { const r = Math.min(z.w, z.h) / 2; const cx = z.x + z.w / 2, cy = z.y + z.h / 2; return `M${f1(cx - r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx + r)} ${f1(cy)}A${f1(r)} ${f1(r)} 0 1 0 ${f1(cx - r)} ${f1(cy)}Z`; }
  if (zone === 'star') { const R = Math.min(z.w, z.h) / 2; return starPath(z.x + z.w / 2, z.y + z.h / 2, R, R * 0.84, 12); } // sao nổ 12 cánh: lõi rộng chứa được giải
  if (zone === 'ticket') {
    const n = Math.min(z.h * 0.22, 3.2 * U); const r = 1.2 * U; const { x, y, w, h } = z; const my = y + h / 2;
    return `M${f1(x + r)} ${f1(y)}H${f1(x + w - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)}V${f1(my - n)}A${f1(n)} ${f1(n)} 0 0 0 ${f1(x + w)} ${f1(my + n)}V${f1(y + h - r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w - r)} ${f1(y + h)}H${f1(x + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x)} ${f1(y + h - r)}V${f1(my + n)}A${f1(n)} ${f1(n)} 0 0 0 ${f1(x)} ${f1(my - n)}V${f1(y + r)}A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(y)}Z`;
  }
  return rrPath(z.x, z.y, z.w, z.h, Math.min(2 * U, z.h * 0.2));
}
/** hộp chữ an toàn bên trong vùng cào (để giải + mã không lòi ra mép lớp mực) */
export function zoneSafe(zone: SCZone, z: Box): Box {
  if (zone === 'circle') { const r = Math.min(z.w, z.h) / 2; const s = r * 1.3; return { x: z.x + z.w / 2 - s / 2, y: z.y + z.h / 2 - s * 0.36, w: s, h: s * 0.72 }; }
  if (zone === 'star') { const R = Math.min(z.w, z.h) / 2; return { x: z.x + z.w / 2 - R * 0.62, y: z.y + z.h / 2 - R * 0.4, w: R * 1.24, h: R * 0.8 }; }
  if (zone === 'ticket') { const n = Math.min(z.h * 0.22, 3.2 * U); return { x: z.x + n + 1.2 * U, y: z.y + 1.4 * U, w: z.w - 2 * n - 2.4 * U, h: z.h - 2.8 * U }; }
  return { x: z.x + 2 * U, y: z.y + 1.4 * U, w: z.w - 4 * U, h: z.h - 2.8 * U };
}

/** bố cục mặt trước: vùng chữ + vùng cào (px, toạ độ thẻ, chưa tính lề xén) */
export function frontLayout(spec: SCSpec) {
  const sz = scSize(spec.size); const W = sz.wMm * U, H = sz.hMm * U;
  const portrait = sz.hMm > sz.wMm;
  const m = 4 * U;
  const lay: SCLayout = portrait && spec.layout === 'side' ? 'banner' : spec.layout;
  const roundish = spec.zone === 'circle' || spec.zone === 'star';
  let text: Box, zone: Box;
  if (lay === 'side') {
    const zw = roundish ? Math.min(H - 2 * m, W * 0.42) : W * 0.46;
    const zh = roundish ? zw : H * 0.5;
    zone = { x: W - m - zw, y: (H - zh) / 2 + 1.5 * U, w: zw, h: zh };
    text = { x: m, y: m, w: W - 3 * m - zw + m * 0.5, h: H - 2 * m };
  } else if (lay === 'center') {
    const zh = portrait ? H * 0.3 : H * 0.36; const zy = portrait ? H * 0.42 : H * (roundish ? 0.38 : 0.35);
    // tròn/sao: to hơn ô chữ nhật để giải đọc rõ, nhưng chừa chỗ chữ hướng dẫn phía dưới
    const zw = roundish ? Math.min(zh * (portrait ? 1.05 : 1.4), H - m - 4.2 * U - zy) : (portrait ? W - 2 * m : W * 0.62);
    zone = { x: (W - zw) / 2, y: zy, w: zw, h: roundish ? zw : zh };
    text = { x: m, y: m, w: W - 2 * m, h: zone.y - m - 1.6 * U };
  } else { // banner
    const zh = portrait ? H * 0.3 : H * 0.36; const zw = roundish ? zh * (portrait ? 1.05 : 1.22) : (portrait ? W - 2 * m : W * 0.7);
    zone = { x: (W - zw) / 2, y: H - m - 4.6 * U - (roundish ? zw : zh), w: zw, h: roundish ? zw : zh };
    text = { x: m, y: m, w: W - 2 * m, h: zone.y - m - 1 * U };
  }
  return { W, H, lay, portrait, text, zone, safe: zoneSafe(spec.zone, zone) };
}

// ---------- hình trang trí theo chủ đề (vẽ code) ----------
// Đặt vào 2 "khe" trống theo bố cục (cạnh ô cào / góc thẻ) — không bao giờ đè lên khối chữ.
function artSlots(L: ReturnType<typeof frontLayout>) {
  const { W, H, zone: z, lay, portrait } = L;
  if (portrait) return [{ x: W * 0.87, y: H * 0.075, r: W * 0.1 }];
  if (lay === 'side') return [{ x: W * 0.09, y: H * 0.84, r: H * 0.11 }];
  const gap = (W - z.w) / 2; const r = Math.min(gap * 0.36, z.h * 0.4);
  return [{ x: z.x + z.w + gap / 2, y: z.y + z.h * 0.5, r }, { x: gap / 2, y: z.y + z.h * 0.5, r: r * 0.8 }];
}
function Motif({ theme, P, x, y, r, k }: { theme: SCTheme; P: SCPalette; x: number; y: number; r: number; k: number }) {
  const c = P.accent;
  if (theme === 'khaitruong') return (
    <g transform={`translate(${f1(x)} ${f1(y)})`} stroke={c} strokeWidth={f1(r * 0.09)} strokeLinecap="round">
      {Array.from({ length: 12 }, (_, i) => { const a = (i * Math.PI) / 6; return <line key={i} x1={f1(Math.cos(a) * r * 0.38)} y1={f1(Math.sin(a) * r * 0.38)} x2={f1(Math.cos(a) * r)} y2={f1(Math.sin(a) * r)} />; })}
      <circle r={f1(r * 0.12)} fill={c} stroke="none" />
    </g>
  );
  if (theme === 'sukien') return (
    <g>
      <path d={starPath(x, y, r, r * 0.45)} fill={c} />
      <path d={starPath(x + r * 0.9, y - r * 0.75, r * 0.35, r * 0.16)} fill={P.onBg} opacity={0.8} />
    </g>
  );
  if (theme === 'sieuthi') return k === 0 ? (
    <g>
      <path d={starPath(x, y, r, r * 0.8, 14)} fill={c} />
      <text x={f1(x)} y={f1(y + r * 0.17)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(r * 0.48)} fill={P.bg}>SALE</text>
    </g>
  ) : (
    <g transform={`translate(${f1(x - r)} ${f1(y - r * 0.7)}) scale(${f1((r * 2) / 120 * 100) / 100})`} fill="none" stroke={c} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M0 0 H20 L36 60 H96 L108 18 H28" /><circle cx={44} cy={78} r={8} /><circle cx={88} cy={78} r={8} />
    </g>
  );
  if (theme === 'nhahang') return (
    <g transform={`translate(${f1(x)} ${f1(y)})`} fill="none" stroke={c} strokeWidth={f1(r * 0.08)} strokeLinecap="round">
      <circle r={f1(r * 0.62)} /><circle r={f1(r * 0.42)} opacity={0.6} />
      {k === 0 && <><path d={`M${f1(-r * 0.95)} ${f1(-r * 0.5)} v${f1(r)} M${f1(-r * 1.07)} ${f1(-r * 0.5)} v${f1(r * 0.34)} M${f1(-r * 0.83)} ${f1(-r * 0.5)} v${f1(r * 0.34)}`} />
        <path d={`M${f1(r * 0.95)} ${f1(-r * 0.5)} q${f1(r * 0.17)} ${f1(r * 0.28)} 0 ${f1(r * 0.5)} v${f1(r * 0.5)}`} /></>}
    </g>
  );
  if (theme === 'thoitrang') return (
    <g transform={`translate(${f1(x)} ${f1(y)})`} fill="none" stroke={c} strokeWidth={f1(r * 0.1)} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M0 ${f1(-r * 0.55)} a${f1(r * 0.17)} ${f1(r * 0.17)} 0 1 1 ${f1(r * 0.17)} ${f1(r * 0.17)} v${f1(r * 0.14)} L${f1(r * 0.9)} ${f1(r * 0.4)} H${f1(-r * 0.9)} L${f1(r * 0.17)} ${f1(-r * 0.24)}`} />
    </g>
  );
  // tết: chùm hoa mai (khe 0) / đồng tiền (khe 1)
  if (k === 1) return (
    <g transform={`translate(${f1(x)} ${f1(y)})`} fill="none" stroke={c} strokeWidth={f1(r * 0.12)}>
      <circle r={f1(r * 0.8)} /><rect x={f1(-r * 0.24)} y={f1(-r * 0.24)} width={f1(r * 0.48)} height={f1(r * 0.48)} />
    </g>
  );
  const flower = (cx: number, cy: number, fr: number, key: number) => (
    <g key={key} transform={`translate(${f1(cx)} ${f1(cy)})`}>
      {[0, 1, 2, 3, 4].map((i) => <circle key={i} cx={f1(Math.cos((i * 2 * Math.PI) / 5 - Math.PI / 2) * fr * 0.62)} cy={f1(Math.sin((i * 2 * Math.PI) / 5 - Math.PI / 2) * fr * 0.62)} r={f1(fr * 0.55)} fill={c} />)}
      <circle r={f1(fr * 0.32)} fill={P.bg} /><circle r={f1(fr * 0.14)} fill={c} />
    </g>
  );
  return <g>{flower(x, y, r * 0.62, 1)}{flower(x - r * 0.62, y + r * 0.62, r * 0.42, 2)}{flower(x + r * 0.5, y - r * 0.72, r * 0.36, 3)}</g>;
}
function Art({ theme, P, L }: { theme: SCTheme; P: SCPalette; L: ReturnType<typeof frontLayout> }) {
  const { W, H } = L; const sl = artSlots(L);
  // giấy kim tuyến nhỏ sát mép thẻ (khai trương / sự kiện)
  const conf = theme === 'khaitruong' || theme === 'sukien'
    ? [[0.03, 0.2, 20], [0.97, 0.36, -25], [0.04, 0.55, 35], [0.5, 0.03, 60], [0.25, 0.04, 15]] : [];
  return (
    <g>
      {conf.map(([px, py, rot], i) => <rect key={i} x={f1(W * px)} y={f1(H * py)} width={f1(2.2 * U)} height={f1(0.8 * U)} rx={2} fill={i % 2 ? P.accent : P.onBg} opacity={0.8} transform={`rotate(${rot} ${f1(W * px)} ${f1(H * py)})`} />)}
      {sl.map((p, k) => p.r > 1.5 * U && <Motif key={k} theme={theme} P={P} x={p.x} y={p.y} r={p.r} k={k} />)}
    </g>
  );
}

// ---------- thẻ ----------
export type SCMode = 'cover' | 'reveal' | 'print' | 'scratchMask' | 'variable';
/**
 * mode:
 *  cover   = xem trước "chưa cào" (lớp mực bạc/vàng phủ ô giải)
 *  reveal  = xem trước "đã cào" (thấy giải + mã)
 *  print   = lớp In (nền chung, KHÔNG có giải/mã/số riêng)
 *  variable= chỉ phần riêng từng tấm (giải + mã + số seri) trên nền trong suốt
 *  scratchMask = khuôn lớp mực cào (vùng đen trên nền trắng) cho xưởng
 */
export function ScratchSvg({ spec, data, side, card, mode = 'reveal', bleed = false, nested, style }: {
  spec: SCSpec; data: SCData; side: 'front' | 'back'; card: SCCard | null; mode?: SCMode; bleed?: boolean; nested?: { x: number; y: number }; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const sz = scSize(spec.size); const P = scPalette(spec.palette); const F = scFont(spec.font);
  const L = frontLayout(spec); const { W, H } = L;
  const b = bleed ? SC_BLEED_MM * U : 0;
  const vb = `${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`;
  const disp: TS = { fam: F.family, wt: F.weight };
  const inkWord = (t: string) => (spec.ink === 'gold' ? (t || '').replace(/lớp bạc/gi, 'lớp vàng') : t || '');
  data = { ...data, hint: inkWord(data.hint), rules: inkWord(data.rules) };
  const body: TS = { fam: BODY, wt: 600 }; const bodyB: TS = { fam: BODY, wt: 800 };
  const showBase = mode === 'cover' || mode === 'reveal' || mode === 'print';
  const showVar = (mode === 'reveal' || mode === 'variable') && !!card; // 'cover': giải bị lớp mực che → không vẽ (khỏi lộ giải trong file)
  const ink = spec.ink === 'gold' ? { a: '#F6E3A1', b: '#C9A045', c: '#E9CD7A', t: '#8C6A1E' } : { a: '#EEF0F3', b: '#A7ADB6', c: '#D3D7DD', t: '#6B7280' };

  let content: ReactNode;
  if (mode === 'scratchMask') {
    // khuôn lớp mực cào cho xưởng: vùng đen = phủ mực cào, nền trắng
    content = <><rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill="#FFF" />{side === 'front' && <path d={zonePath(spec.zone, L.zone)} fill="#000" />}</>;
  } else if (side === 'front') {
    const tb = L.text; const z = L.zone; const sf = L.safe;
    // tiêu đề / thương hiệu / dòng phụ — xếp từ trên xuống trong vùng chữ
    const brandS = fitOne((data.brand || '').toUpperCase(), tb.w * (L.lay === 'side' ? 1 : 0.7), 3.2 * U, { ...bodyB, ls: 0.6 * U * 0.1 }, 2 * U);
    const titleBlk = fitBlock(data.title || '', L.lay === 'side' ? tb.w : tb.w * 0.86, tb.h * 0.52, (L.portrait ? 8.5 : 9.5) * U, disp, 2, 1.06, 3.6 * U);
    const subBlk = fitBlock(data.sub || '', L.lay === 'side' ? tb.w : tb.w * 0.84, tb.h * 0.26, 2.6 * U, body, 2, 1.2, 1.9 * U);
    const center = L.lay !== 'side';
    const tx = center ? tb.x + tb.w / 2 : tb.x; const anchor = center ? 'middle' : 'start';
    const used = brandS * 1.25 + titleBlk.lines.length * titleBlk.size * 1.06 + subBlk.lines.length * subBlk.size * 1.2 + 1.2 * U;
    let yy = tb.y + Math.max(0, (tb.h - used) * (L.lay === 'side' ? 0.45 : 0.4));
    const items: ReactNode[] = [];
    yy += brandS;
    items.push(<text key="br" x={f1(tx)} y={f1(yy)} textAnchor={anchor} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(brandS)} letterSpacing={f1(brandS * 0.06)} fill={P.accent}>{(data.brand || '').toUpperCase()}</text>);
    yy += brandS * 0.3 + 0.6 * U;
    titleBlk.lines.forEach((ln, i) => { yy += titleBlk.size * (i ? 1.06 : 0.92); items.push(<text key={`t${i}`} x={f1(tx)} y={f1(yy)} textAnchor={anchor} fontFamily={`"${F.family}"`} fontWeight={F.weight} fontSize={f1(titleBlk.size)} fill={P.onBg}>{ln}</text>); });
    yy += 0.6 * U;
    subBlk.lines.forEach((ln) => { yy += subBlk.size * 1.2; items.push(<text key={`s${ln}`} x={f1(tx)} y={f1(yy)} textAnchor={anchor} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(subBlk.size)} fill={P.onBg} opacity={0.92}>{ln}</text>); });
    // hướng dẫn cào: dưới ô cào (banner/center) hoặc trên ô (side)
    const hintS = fitOne(data.hint || '', z.w + 6 * U, 2.1 * U, body, 1.5 * U);
    const hintY = L.lay === 'side' ? z.y - 1.3 * U : z.y + z.h + hintS + 1.1 * U;
    const serialS = 1.8 * U;
    const zp = zonePath(spec.zone, z);
    content = (
      <>
        {showBase && <>
          <defs>
            <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={P.bg2} /><stop offset="1" stopColor={P.bg} /></linearGradient>
            <pattern id={`${uid}-sec`} width={1.6 * U} height={1.6 * U} patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1={0} y1={0} x2={0} y2={1.6 * U} stroke={P.prize} strokeOpacity={0.08} strokeWidth={0.5 * U} /></pattern>
          </defs>
          <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={`url(#${uid}-bg)`} />
          <Art theme={spec.theme} P={P} L={L} />
          {items}
          {/* nền ô giải (in sẵn, nằm DƯỚI lớp cào): giấy sáng + hoa văn chống soi */}
          <path d={zp} fill={P.paper} stroke={P.accent} strokeWidth={0.5 * U} data-zone="1" />
          <path d={zp} fill={`url(#${uid}-sec)`} />
          <text x={f1(L.lay === 'side' ? z.x + z.w / 2 : z.x + z.w / 2)} y={f1(hintY)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(hintS)} fill={P.onBg} opacity={0.95}>{data.hint}</text>
        </>}
        {showVar && card && (() => {
          const pr = fitBlock(card.prize, sf.w, sf.h * 0.7, (L.portrait ? 5.2 : 5.6) * U, { fam: F.family, wt: F.weight }, 3, 1.05, 1.5 * U); // giải là thông tin chính: cho 3 dòng, chữ nhỏ tới 1,5mm chứ không cắt
          const codeS = fitOne(`Mã: ${card.code}`, sf.w, 2 * U, bodyB, 1.4 * U);
          const blockH = pr.lines.length * pr.size * 1.05 + codeS * 1.5;
          let py = sf.y + (sf.h - blockH) / 2;
          return (
            <g data-card-var="1" data-serial={card.serial} data-prize={card.prize} data-code={card.code}>
              {pr.lines.map((ln, i) => { py += pr.size * (i ? 1.05 : 0.9); return <text key={i} x={f1(sf.x + sf.w / 2)} y={f1(py)} textAnchor="middle" fontFamily={`"${F.family}"`} fontWeight={F.weight} fontSize={f1(pr.size)} fill={P.prize} data-var="prize">{ln}</text>; })}
              <text x={f1(sf.x + sf.w / 2)} y={f1(py + codeS * 1.5)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(codeS)} letterSpacing={f1(codeS * 0.08)} fill={P.backInk} data-var="code">{`Mã: ${card.code}`}</text>
              <text x={f1(W - 3 * U)} y={f1(H - 2.4 * U)} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(serialS)} letterSpacing={f1(serialS * 0.06)} fill={P.onBg} opacity={0.9} data-var="serial">{`Số ${card.serial}`}</text>
            </g>
          );
        })()}
        {mode === 'cover' && <>
          <defs>
            <linearGradient id={`${uid}-ink`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={ink.a} /><stop offset="0.45" stopColor={ink.b} /><stop offset="0.7" stopColor={ink.a} /><stop offset="1" stopColor={ink.c} /></linearGradient>
          </defs>
          <path d={zp} fill={`url(#${uid}-ink)`} />
          {(() => { // chữ in đè lên lớp mực: ô hẹp (ngôi sao/tròn nhỏ) thì ghi gọn "CÀO"
            let lbl = 'CÀO TẠI ĐÂY'; let fs = Math.min(3 * U, fitOne(lbl, L.safe.w, 3 * U, bodyB));
            if (fs < 1.8 * U) { lbl = 'CÀO'; fs = Math.min(3 * U, fitOne(lbl, L.safe.w, 3 * U, bodyB)); }
            return <text x={f1(z.x + z.w / 2)} y={f1(z.y + z.h / 2 + fs * 0.36)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(fs)} letterSpacing={f1(0.3 * U)} fill={ink.t} opacity={0.55}>{lbl}</text>;
          })()}
        </>}
      </>
    );
  } else { // mặt sau
    const m = 4 * U;
    const head = 9 * U;
    const qrOn = !!(data.website || '').trim();
    const qrS = Math.min(H - head - 2 * m - 5 * U, L.portrait ? W * 0.36 : 19 * U);
    const colW = L.portrait ? W - 2 * m : W - 2 * m - (qrOn ? qrS + 3 * U : 0);
    const rulesTxt = (data.rules || '').split('\n').map((s) => s.trim()).filter(Boolean).map((s) => `• ${s}`).join('\n');
    const infoLines = [data.redeem, data.expiry && `Hạn sử dụng: ${data.expiry}`, data.hotline && `Hotline: ${data.hotline}`, data.address].filter(Boolean) as string[];
    const avail = (L.portrait ? H - head - m - qrS - 7 * U : H - head - m * 1.6);
    const rules = fitBlock(rulesTxt, colW, avail * 0.6, 2.1 * U, body, 8, 1.28, 1.45 * U);
    const info = fitBlock(infoLines.join('\n'), colW, avail * 0.36, 2 * U, bodyB, 5, 1.28, 1.45 * U);
    const brandS = fitOne((data.brand || '').toUpperCase(), W - 2 * m, 3.4 * U, bodyB, 1.8 * U);
    const qr = qrOn ? qrPath(data.website) : null;
    const contentH = 3.5 * U + rules.lines.length * rules.size * 1.28 + 1.2 * U + info.lines.length * info.size * 1.28 + (L.portrait && qr ? 4 * U + qrS + 3 * U : 0);
    let yy = head + Math.max(3.2 * U, L.portrait ? (H - head - m * 0.5 - contentH) / 2 + 2.3 * U : 3.2 * U);
    const qx = L.portrait ? (W - qrS) / 2 : W - m - qrS; let qy = L.portrait ? H - m - qrS - 2.6 * U : head + (H - head - qrS) / 2 - 1.2 * U;
    content = showBase ? (
      <>
        <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={P.back} />
        <rect x={-b} y={-b} width={W + 2 * b} height={head + b} fill={P.bg} />
        <text x={f1(W / 2)} y={f1(head / 2 + brandS * 0.36)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(brandS)} letterSpacing={f1(brandS * 0.06)} fill={P.onBg}>{(data.brand || '').toUpperCase()}</text>
        <text x={m} y={f1(yy)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={2.3 * U} fill={P.prize}>THỂ LỆ</text>
        {(() => { yy += 1.2 * U; return null; })()}
        {rules.lines.map((ln, i) => { yy += rules.size * 1.28; return <text key={`r${i}`} x={m} y={f1(yy)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(rules.size)} fill={P.backInk}>{ln}</text>; })}
        {(() => { yy += 1.2 * U; return null; })()}
        {info.lines.map((ln, i) => { yy += info.size * 1.28; return <text key={`i${i}`} x={m} y={f1(yy)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={f1(info.size)} fill={P.backInk}>{ln}</text>; })}
        {qr && L.portrait && (() => { qy = Math.min(qy, yy + 4 * U); return null; })()}
        {qr && <g>
          <rect x={f1(qx - 1 * U)} y={f1(qy - 1 * U)} width={f1(qrS + 2 * U)} height={f1(qrS + 2 * U)} rx={U} fill="#FFFFFF" />
          <path d={qr.d} transform={`translate(${f1(qx)} ${f1(qy)}) scale(${f1((qrS / qr.n) * 100) / 100})`} fill="#111827" />
          <text x={f1(qx + qrS / 2)} y={f1(qy + qrS + 2.6 * U)} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={f1(Math.min(1.8 * U, fitOne(data.website, qrS + 4 * U, 1.8 * U, body)))} fill={P.backInk}>{data.website}</text>
        </g>}
      </>
    ) : null;
  }

  const inner = <>{content}</>;
  if (nested) return <svg x={nested.x} y={nested.y} width={W + 2 * b} height={H + 2 * b} viewBox={vb} overflow="hidden">{inner}</svg>;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-sc-side={side} data-sc-mode={mode} data-w-mm={sz.wMm} data-h-mm={sz.hMm}>{inner}</svg>
  );
}

// ---------- tờ in hàng loạt ----------
export const SC_SHEET = { wMm: 325, hMm: 430, marginMm: 8, gapMm: 2 * SC_BLEED_MM };
export function scSheetFit(spec: SCSpec) {
  const sz = scSize(spec.size); const g = SC_SHEET.gapMm;
  const cols = Math.max(1, Math.floor((SC_SHEET.wMm - SC_SHEET.marginMm * 2 + g) / (sz.wMm + g)));
  const rows = Math.max(1, Math.floor((SC_SHEET.hMm - SC_SHEET.marginMm * 2 - 6 + g) / (sz.hMm + g)));
  const x0 = (SC_SHEET.wMm - (cols * sz.wMm + (cols - 1) * g)) / 2;
  const y0 = (SC_SHEET.hMm - 6 - (rows * sz.hMm + (rows - 1) * g)) / 2;
  return { cols, rows, per: cols * rows, x0, y0, sz };
}
export const scSheetPages = (spec: SCSpec, n: number) => Math.max(1, Math.ceil(n / scSheetFit(spec).per));

/**
 * Tờ in 32,5×43 cm: lớp In (nền chung, dùng <use>), Variable (giải + mã + số riêng từng tấm),
 * Scratch (vùng phủ mực cào), CutContour. Mặt sau: lật gương, chỉ In + CutContour.
 */
export function ScratchSheetSvg({ spec, data, cards, side, page = 0, style }: { spec: SCSpec; data: SCData; cards: SCCard[]; side: 'front' | 'back'; page?: number; style?: CSSProperties }) {
  const u = useId().replace(/:/g, '');
  const fit = scSheetFit(spec); const { sz } = fit;
  const SW = SC_SHEET.wMm * U, SH = SC_SHEET.hMm * U;
  const w = sz.wMm * U, h = sz.hMm * U, b = SC_BLEED_MM * U, g = SC_SHEET.gapMm * U;
  const L = frontLayout(spec);
  const first = page * fit.per;
  const list = side === 'front' ? cards.slice(first, first + fit.per) : cards.slice(0, Math.min(fit.per, cards.length));
  const cells = list.map((c, i) => {
    const col = i % fit.cols, row = Math.floor(i / fit.cols);
    let x = fit.x0 * U + col * (w + g);
    if (side === 'back') x = SW - x - w;
    return { x, y: fit.y0 * U + row * (h + g), c };
  });
  const r = sz.rMm * U;
  return (
    <svg viewBox={`0 0 ${SW} ${SH}`} width={`${SC_SHEET.wMm}mm`} height={`${SC_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet-page={page} data-count={cells.length} data-side={side}>
      <rect x={0} y={0} width={SW} height={SH} fill="#FFFFFF" />
      <defs>
        <g id={`${u}-card`} data-card-def="1"><ScratchSvg spec={spec} data={data} side={side} card={null} mode="print" bleed nested={{ x: 0, y: 0 }} /></g>
        <path id={`${u}-cut`} d={rrPath(0, 0, w, h, r)} />
        <path id={`${u}-zone`} d={zonePath(spec.zone, L.zone)} />
      </defs>
      <g id="In" data-name="In">{cells.map((c, i) => <use key={i} href={`#${u}-card`} x={f1(c.x - b)} y={f1(c.y - b)} />)}</g>
      {side === 'front' && <>
        <g id="Variable" data-name="Variable">
          {cells.map((c, i) => <g key={i} transform={`translate(${f1(c.x)} ${f1(c.y)})`}><ScratchSvg spec={spec} data={data} side="front" card={c.c} mode="variable" nested={{ x: 0, y: 0 }} /></g>)}
        </g>
        <g id="Scratch" data-name="Scratch" fill="#000000" opacity={0.35}>
          <title>Scratch</title>
          {cells.map((c, i) => <use key={i} href={`#${u}-zone`} x={f1(c.x)} y={f1(c.y)} />)}
        </g>
      </>}
      <g id="CutContour" data-name="CutContour" fill="none" stroke={CUTCONTOUR} strokeWidth={1}>
        <title>CutContour</title>
        {cells.map((c, i) => <use key={i} href={`#${u}-cut`} x={f1(c.x)} y={f1(c.y)} />)}
      </g>
      <text x={SC_SHEET.marginMm * U} y={SH - 3 * U} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={26} fill="#9CA3AF">
        {`Mivy · thẻ cào · ${side === 'front' ? `mặt trước · tờ ${page + 1}` : 'mặt sau (lật gương, in chung mọi tờ)'} · ${cells.length} tấm · ${sz.name}${side === 'front' && cells.length ? ` · số ${cells[0].c.serial} đến ${cells[cells.length - 1].c.serial}` : ''} · lớp Scratch = vùng phủ mực cào`}
      </text>
    </svg>
  );
}
