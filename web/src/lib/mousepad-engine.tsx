'use client';
// Lót chuột in hình / desk mat: 1 engine SVG (đơn vị mm) = BỐ CỤC × BẢNG MÀU × FONT × KHỔ → nhiều mẫu, render code 100%.
// Ảnh khách chỉ xử lý trên máy. Chữ đo thật bằng canvas → co/xuống dòng cho vừa vùng an toàn (cả lót tròn).
// mode: face = mặt xem trước (bo góc/tròn, có viền khâu) · tex = texture 3D (vuông, không bo) · print = file in (lề xén 3mm, + nét cắt khi cut).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { coverRect, photoDpi, type CVPhoto } from './canvas-engine';

export const MP_BLEED = 3;

export interface MPSize { id: string; name: string; wMm: number; hMm: number; r: number; round?: boolean; desk?: boolean }
export const MP_SIZES: MPSize[] = [
  { id: '24x20', name: '24 × 20 cm', wMm: 240, hMm: 200, r: 8 },
  { id: 'c22', name: 'Tròn Ø22 cm', wMm: 220, hMm: 220, r: 110, round: true },
  { id: '80x30', name: 'Desk mat 80 × 30', wMm: 800, hMm: 300, r: 12, desk: true },
  { id: '90x40', name: 'Desk mat 90 × 40', wMm: 900, hMm: 400, r: 14, desk: true },
];
export const mpSize = (id: string) => MP_SIZES.find((s) => s.id === id) || MP_SIZES[0];
export const MP_THICK = [3, 4] as const;
export type MPStitch = 'none' | 'black' | 'white' | 'accent';
export const MP_STITCHES: { id: MPStitch; name: string }[] = [
  { id: 'none', name: 'Không khâu' }, { id: 'black', name: 'Khâu đen' }, { id: 'white', name: 'Khâu trắng' }, { id: 'accent', name: 'Khâu theo màu mẫu' },
];

// ---------- font ----------
export interface MPFont { id: string; name: string; family: string; weight: number }
export const MP_FONTS: MPFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bungee', name: 'Bungee', family: 'Bungee', weight: 400 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const mpFont = (id: string) => MP_FONTS.find((f) => f.id === id) || MP_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const MP_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Baloo+2:wght@600;800&family=Oswald:wght@700&family=Bungee&family=Dancing+Script:wght@700&family=Playfair+Display:wght@800&display=swap');`;

export function useMPFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-mp-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-mp-fonts'; link.rel = 'stylesheet';
        link.href = MP_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...MP_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `600 40px "Baloo 2"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 +')))).catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
/** bề rộng (mm) của chữ ở cỡ size (mm) */
export function textW(t: string, family: string, weight: number, size: number, ls = 0): number {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return t.length * size * 0.6;
  mctx.font = `${weight} 100px "${family}"`;
  return (mctx.measureText(t).width / 100) * size + Math.max(0, t.length - 1) * ls * size;
}
/** cỡ lớn nhất ≤ maxSize để chữ vừa maxW */
function fit(t: string, family: string, weight: number, maxW: number, maxSize: number, ls = 0): number {
  if (!t) return maxSize;
  const w1 = textW(t, family, weight, 1, ls);
  return Math.max(0.5, Math.min(maxSize, maxW / Math.max(0.01, w1)));
}
/** chia chữ thành n dòng cân đối (n ≤ 3: thử mọi điểm ngắt, chọn dòng dài nhất ngắn nhất) */
function splitLines(t: string, n: number, family: string, weight: number): string[] {
  const words = t.trim().split(/\s+/).filter(Boolean);
  if (n <= 1 || words.length <= 1) return [words.join(' ')];
  n = Math.min(n, words.length, 3);
  const w = (i: number, j: number) => textW(words.slice(i, j).join(' '), family, weight, 1);
  let best: number[] = [], bestW = Infinity;
  if (n === 2) for (let i = 1; i < words.length; i++) { const m = Math.max(w(0, i), w(i, words.length)); if (m < bestW) { bestW = m; best = [i]; } }
  else for (let i = 1; i < words.length - 1; i++) for (let j = i + 1; j < words.length; j++) { const m = Math.max(w(0, i), w(i, j), w(j, words.length)); if (m < bestW) { bestW = m; best = [i, j]; } }
  const cuts = [0, ...best, words.length];
  return cuts.slice(0, -1).map((c, k) => words.slice(c, cuts[k + 1]).join(' '));
}
/** chọn số dòng (1..maxLines) cho cỡ chữ lớn nhất trong khung maxW × maxH */
function wrapFit(t: string, family: string, weight: number, maxW: number, maxH: number, maxSize: number, maxLines = 3, lh = 1.18) {
  let best = { lines: [t], size: 0 };
  const nWords = t.trim().split(/\s+/).filter(Boolean).length;
  for (let n = 1; n <= Math.min(maxLines, Math.max(1, nWords)); n++) {
    const lines = splitLines(t, n, family, weight);
    const wMax = Math.max(...lines.map((l) => textW(l, family, weight, 1)));
    const size = Math.min(maxSize, maxW / Math.max(0.01, wMax), maxH / (lines.length * lh));
    if (size > best.size * 1.06) best = { lines, size };
  }
  return best;
}

// ---------- bảng màu ----------
export interface MPPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; accent2: string }
export const MP_PALETTES: MPPalette[] = [
  { id: 'white', name: 'Trắng', bg: '#FFFFFF', bg2: '#EEF1F6', ink: '#16233B', sub: '#5A6579', accent: '#2563EB', accent2: '#F59E0B' },
  { id: 'cream', name: 'Kem', bg: '#F7F1E5', bg2: '#ECE2CF', ink: '#2E2418', sub: '#7A6A55', accent: '#B5562F', accent2: '#2F6F73' },
  { id: 'navy', name: 'Navy', bg: '#14213D', bg2: '#1F3158', ink: '#F5F1E8', sub: '#B7C1D8', accent: '#F2B134', accent2: '#4FC3F7' },
  { id: 'black', name: 'Đen', bg: '#121212', bg2: '#242424', ink: '#F5F2EA', sub: '#B5B0A5', accent: '#E8B04B', accent2: '#E35D6A' },
  { id: 'neoncyan', name: 'Neon xanh', bg: '#070B18', bg2: '#13183A', ink: '#E9FBFF', sub: '#8AA4C8', accent: '#22D3EE', accent2: '#A855F7' },
  { id: 'neonpink', name: 'Neon hồng', bg: '#12061F', bg2: '#2A0E3D', ink: '#FFEFFB', sub: '#C59BD8', accent: '#F472B6', accent2: '#22D3EE' },
  { id: 'tet', name: 'Đỏ Tết', bg: '#B3121D', bg2: '#8E0C15', ink: '#FFF5DC', sub: '#F8D9A8', accent: '#F6C445', accent2: '#FFFFFF' },
  { id: 'excel', name: 'Xanh Excel', bg: '#F4FAF6', bg2: '#DDEFE3', ink: '#123524', sub: '#4D6B5A', accent: '#107C41', accent2: '#0B5E30' },
  { id: 'photoshop', name: 'Xanh Photoshop', bg: '#001E36', bg2: '#0A2C4A', ink: '#E8F4FF', sub: '#8DB3D6', accent: '#31A8FF', accent2: '#7FD0FF' },
  { id: 'pink', name: 'Hồng pastel', bg: '#FCE7EE', bg2: '#F8D3E0', ink: '#5B2A3C', sub: '#9A5E74', accent: '#EC6F9A', accent2: '#8FD3C8' },
  { id: 'mint', name: 'Bạc hà', bg: '#E3F6EF', bg2: '#C9EDDF', ink: '#1F4B43', sub: '#4F7F74', accent: '#F28C8C', accent2: '#F6C76B' },
  { id: 'lavender', name: 'Tím lavender', bg: '#EDE7FA', bg2: '#DCD2F4', ink: '#3A2C63', sub: '#6F61A0', accent: '#F59FC1', accent2: '#8BD3E6' },
];
export const mpPalette = (id: string) => MP_PALETTES.find((p) => p.id === id) || MP_PALETTES[0];

// ---------- bộ phím tắt ----------
export type MPSet = 'excel' | 'word' | 'photoshop' | 'windows' | 'macos';
export const MP_SETS: { id: MPSet; name: string; title: string; items: [string, string][] }[] = [
  { id: 'excel', name: 'Excel', title: 'PHÍM TẮT EXCEL', items: [
    ['Ctrl+C', 'Sao chép'], ['Ctrl+V', 'Dán'], ['Ctrl+Z', 'Hoàn tác'], ['Ctrl+S', 'Lưu tệp'], ['Ctrl+F', 'Tìm kiếm'], ['Ctrl+H', 'Tìm và thay thế'],
    ['Ctrl+A', 'Chọn tất cả'], ['Alt+=', 'Tính tổng nhanh'], ['Ctrl+;', 'Chèn ngày hôm nay'], ['Ctrl+Shift+;', 'Chèn giờ hiện tại'], ['F2', 'Sửa ô đang chọn'],
    ['F4', 'Cố định ô ($A$1)'], ['Ctrl+1', 'Định dạng ô'], ['Ctrl+Shift+L', 'Bật/tắt bộ lọc'], ['Ctrl+T', 'Tạo bảng'], ['Ctrl+D', 'Chép công thức xuống'],
    ['Ctrl+R', 'Chép sang phải'], ['Alt+Enter', 'Xuống dòng trong ô'], ['Ctrl+Space', 'Chọn cả cột'], ['Shift+Space', 'Chọn cả dòng'], ['Ctrl++', 'Chèn ô/dòng'],
    ['Ctrl+-', 'Xoá ô/dòng'], ['Ctrl+Home', 'Về ô A1'], ['Ctrl+End', 'Đến ô cuối dữ liệu'], ['Ctrl+PgDn', 'Sang sheet sau'], ['Ctrl+PgUp', 'Về sheet trước'],
    ['Ctrl+Shift+$', 'Định dạng tiền tệ'], ['Ctrl+Shift+%', 'Định dạng phần trăm'], ['Ctrl+K', 'Chèn liên kết'], ['F11', 'Tạo biểu đồ nhanh'],
  ] },
  { id: 'word', name: 'Word', title: 'PHÍM TẮT WORD', items: [
    ['Ctrl+B', 'In đậm'], ['Ctrl+I', 'In nghiêng'], ['Ctrl+U', 'Gạch chân'], ['Ctrl+E', 'Căn giữa'], ['Ctrl+L', 'Căn trái'], ['Ctrl+R', 'Căn phải'],
    ['Ctrl+J', 'Căn đều hai bên'], ['Ctrl+Enter', 'Ngắt trang'], ['Ctrl+]', 'Tăng cỡ chữ'], ['Ctrl+[', 'Giảm cỡ chữ'], ['Ctrl+K', 'Chèn liên kết'],
    ['Ctrl+F', 'Tìm kiếm'], ['Ctrl+H', 'Tìm và thay thế'], ['Ctrl+P', 'In tài liệu'], ['Ctrl+N', 'Tài liệu mới'], ['Ctrl+O', 'Mở tệp'],
    ['Ctrl+Shift+C', 'Chép định dạng'], ['Ctrl+Shift+V', 'Dán định dạng'], ['Ctrl+1', 'Giãn dòng đơn'], ['Ctrl+2', 'Giãn dòng đôi'], ['Ctrl+5', 'Giãn dòng 1,5'],
    ['Ctrl+=', 'Chỉ số dưới'], ['Ctrl+Shift+=', 'Chỉ số trên'], ['Shift+F3', 'Đổi chữ HOA/thường'], ['F7', 'Kiểm tra chính tả'], ['Alt+Shift+D', 'Chèn ngày'],
    ['Ctrl+Z', 'Hoàn tác'], ['Ctrl+Y', 'Làm lại'], ['Ctrl+S', 'Lưu tệp'], ['F12', 'Lưu thành tệp khác'],
  ] },
  { id: 'photoshop', name: 'Photoshop', title: 'PHÍM TẮT PHOTOSHOP', items: [
    ['V', 'Di chuyển'], ['M', 'Khung chọn'], ['L', 'Lasso'], ['W', 'Chọn nhanh'], ['C', 'Cắt ảnh'], ['I', 'Hút màu'], ['J', 'Healing'], ['B', 'Cọ vẽ'],
    ['S', 'Clone Stamp'], ['E', 'Tẩy'], ['G', 'Gradient'], ['T', 'Chữ'], ['P', 'Pen'], ['U', 'Hình khối'], ['D', 'Màu mặc định'], ['X', 'Đổi màu trước/sau'],
    ['Ctrl+J', 'Nhân bản layer'], ['Ctrl+T', 'Biến đổi tự do'], ['Ctrl+G', 'Gom nhóm layer'], ['Ctrl+E', 'Gộp layer'], ['Ctrl+Shift+N', 'Layer mới'],
    ['Ctrl+Alt+Z', 'Lùi nhiều bước'], ['Ctrl+I', 'Đảo màu'], ['Ctrl+L', 'Levels'], ['Ctrl+M', 'Curves'], ['Ctrl+U', 'Hue / Saturation'],
    ['Ctrl+0', 'Vừa màn hình'], ['Ctrl+D', 'Bỏ vùng chọn'], ['Ctrl+Shift+I', 'Đảo vùng chọn'], ['Ctrl+Shift+S', 'Lưu thành'],
  ] },
  { id: 'windows', name: 'Windows', title: 'PHÍM TẮT WINDOWS', items: [
    ['Win+D', 'Hiện màn hình chính'], ['Win+E', 'Mở File Explorer'], ['Win+L', 'Khoá máy'], ['Win+V', 'Lịch sử clipboard'], ['Win+Shift+S', 'Chụp vùng màn hình'],
    ['Win+.', 'Bảng emoji'], ['Win+Tab', 'Xem các cửa sổ'], ['Alt+Tab', 'Chuyển cửa sổ'], ['Alt+F4', 'Đóng cửa sổ'], ['Ctrl+Shift+Esc', 'Task Manager'],
    ['Win+I', 'Cài đặt'], ['Win+R', 'Hộp lệnh Run'], ['Win+Ctrl+D', 'Desktop ảo mới'], ['Win+P', 'Trình chiếu'], ['Win+PrtSc', 'Chụp toàn màn hình'],
    ['Win+Left', 'Ghim cửa sổ trái'], ['Win+Right', 'Ghim cửa sổ phải'], ['Win+Up', 'Phóng to cửa sổ'], ['Ctrl+Shift+T', 'Mở lại tab vừa đóng'], ['Ctrl+W', 'Đóng tab'],
    ['Ctrl+Tab', 'Chuyển tab'], ['F2', 'Đổi tên tệp'], ['F5', 'Tải lại trang'], ['Ctrl+Shift+N', 'Thư mục mới'], ['Shift+Del', 'Xoá vĩnh viễn'],
    ['Win+H', 'Gõ bằng giọng nói'], ['Win+K', 'Kết nối thiết bị'], ['Win+M', 'Thu nhỏ tất cả'], ['Win+A', 'Cài đặt nhanh'], ['Win+N', 'Thông báo'],
  ] },
  { id: 'macos', name: 'macOS', title: 'PHÍM TẮT MACOS', items: [
    ['Cmd+Space', 'Spotlight'], ['Cmd+Tab', 'Chuyển ứng dụng'], ['Cmd+Q', 'Thoát ứng dụng'], ['Cmd+W', 'Đóng cửa sổ'], ['Cmd+Shift+3', 'Chụp màn hình'],
    ['Cmd+Shift+4', 'Chụp một vùng'], ['Cmd+Shift+5', 'Quay màn hình'], ['Cmd+Opt+Esc', 'Buộc thoát'], ['Cmd+,', 'Cài đặt ứng dụng'], ['Cmd+Ctrl+Q', 'Khoá máy'],
    ['Cmd+Delete', 'Bỏ vào Thùng rác'], ['Cmd+Shift+.', 'Hiện tệp ẩn'], ['Cmd+Opt+D', 'Ẩn/hiện Dock'], ['Ctrl+Up', 'Mission Control'], ['Cmd+H', 'Ẩn ứng dụng'],
    ['Cmd+M', 'Thu nhỏ cửa sổ'], ['Cmd+N', 'Cửa sổ mới'], ['Cmd+T', 'Tab mới'], ['Cmd+Shift+T', 'Mở lại tab'], ['Cmd+Ctrl+F', 'Toàn màn hình'],
    ['Cmd+Opt+V', 'Di chuyển tệp'], ['Cmd+I', 'Xem thông tin'], ['Space', 'Xem nhanh tệp'], ['Cmd+Shift+N', 'Thư mục mới'], ['Cmd+F', 'Tìm kiếm'],
    ['Cmd+Z', 'Hoàn tác'], ['Cmd+Shift+Z', 'Làm lại'], ['Cmd+A', 'Chọn tất cả'], ['Cmd+S', 'Lưu tệp'], ['Cmd+P', 'In'],
  ] },
];
export const mpSet = (id: string) => MP_SETS.find((s) => s.id === id) || MP_SETS[0];

// ---------- bố cục + mẫu ----------
export type MPLayout = 'photo' | 'polaroid' | 'logo' | 'gaming' | 'calendar' | 'shortcuts' | 'pastel' | 'quote';
export const MP_LAYOUTS: { id: MPLayout; name: string; photo?: boolean; noRound?: boolean }[] = [
  { id: 'photo', name: 'Ảnh tràn', photo: true },
  { id: 'polaroid', name: 'Polaroid', photo: true },
  { id: 'logo', name: 'Logo công ty' },
  { id: 'gaming', name: 'Gaming neon' },
  { id: 'calendar', name: 'Lịch 2027', noRound: true },
  { id: 'shortcuts', name: 'Phím tắt', noRound: true },
  { id: 'pastel', name: 'Pastel dễ thương' },
  { id: 'quote', name: 'Câu nói' },
];
export const mpLayout = (id: string) => MP_LAYOUTS.find((l) => l.id === id) || MP_LAYOUTS[0];
export const sizeOk = (layout: string, size: string) => !(mpLayout(layout).noRound && mpSize(size).round);

export interface MPSpec { layout: MPLayout; palette: string; font: string; size: string; thick: 3 | 4; stitch: MPStitch; set: MPSet }
export interface MPTemplate { id: string; name: string; sample?: number; spec: Pick<MPSpec, 'layout' | 'palette' | 'font' | 'size'> & { set?: MPSet; stitch?: MPStitch } }
export const MP_TEMPLATES: MPTemplate[] = [
  { id: 'photo-classic', name: 'Ảnh kỷ niệm', sample: 1, spec: { layout: 'photo', palette: 'white', font: 'montserrat', size: '24x20' } },
  { id: 'photo-desk', name: 'Ảnh phong cảnh · desk mat', sample: 0, spec: { layout: 'photo', palette: 'black', font: 'bvp', size: '80x30', stitch: 'black' } },
  { id: 'polaroid-pink', name: 'Polaroid hồng', sample: 2, spec: { layout: 'polaroid', palette: 'pink', font: 'dancing', size: '24x20' } },
  { id: 'logo-navy', name: 'Logo công ty · navy', spec: { layout: 'logo', palette: 'navy', font: 'montserrat', size: '24x20' } },
  { id: 'logo-desk', name: 'Quà nhân viên · desk mat', spec: { layout: 'logo', palette: 'white', font: 'montserrat', size: '90x40', stitch: 'accent' } },
  { id: 'gaming-cyan', name: 'Gaming neon xanh', spec: { layout: 'gaming', palette: 'neoncyan', font: 'bungee', size: '80x30', stitch: 'black' } },
  { id: 'gaming-pink', name: 'Gaming neon hồng · tròn', spec: { layout: 'gaming', palette: 'neonpink', font: 'oswald', size: 'c22' } },
  { id: 'cal-cream', name: 'Lịch 2027 · desk mat', spec: { layout: 'calendar', palette: 'cream', font: 'montserrat', size: '90x40', stitch: 'black' } },
  { id: 'cal-tet', name: 'Lịch Tết 2027 · đỏ', spec: { layout: 'calendar', palette: 'tet', font: 'montserrat', size: '24x20' } },
  { id: 'sc-excel', name: 'Phím tắt Excel', spec: { layout: 'shortcuts', palette: 'excel', font: 'bvp', size: '90x40', set: 'excel', stitch: 'black' } },
  { id: 'sc-ps', name: 'Phím tắt Photoshop', spec: { layout: 'shortcuts', palette: 'photoshop', font: 'bvp', size: '80x30', set: 'photoshop', stitch: 'black' } },
  { id: 'pastel-mint', name: 'Pastel bạc hà', spec: { layout: 'pastel', palette: 'mint', font: 'baloo', size: '24x20' } },
  { id: 'pastel-lav', name: 'Pastel tím · tròn', spec: { layout: 'pastel', palette: 'lavender', font: 'baloo', size: 'c22' } },
  { id: 'quote-black', name: 'Câu nói tạo động lực', spec: { layout: 'quote', palette: 'black', font: 'playfair', size: '24x20' } },
];

export type MPData = Record<string, string>;
export interface MPField { key: string; label: string; ph?: string; multiline?: boolean; layouts: MPLayout[] }
export const MP_FIELDS: MPField[] = [
  { key: 'title', label: 'Dòng chữ chính', layouts: ['photo', 'polaroid', 'gaming', 'pastel'] },
  { key: 'sub', label: 'Dòng phụ', layouts: ['photo', 'polaroid', 'gaming', 'pastel'] },
  { key: 'brand', label: 'Tên công ty / thương hiệu', layouts: ['logo', 'calendar', 'shortcuts'] },
  { key: 'slogan', label: 'Slogan / lời chúc', layouts: ['logo', 'calendar'] },
  { key: 'contact', label: 'Website · hotline', layouts: ['logo', 'calendar'] },
  { key: 'quote', label: 'Câu nói', multiline: true, layouts: ['quote'] },
  { key: 'author', label: 'Tác giả', layouts: ['quote'] },
];
export const MP_SAMPLES: Record<MPLayout, MPData> = {
  photo: { title: 'Gia đình nhỏ', sub: 'Đà Lạt · mùa hoa 2026' },
  polaroid: { title: 'Mãi bên nhau', sub: 'Quốc Bảo & Thu Hà · 14.02.2026' },
  logo: { brand: 'AN KHANG TECH', slogan: 'Cùng nhau bứt phá 2027', contact: 'ankhang.vn · 1900 6868' },
  gaming: { title: 'GAME ON', sub: 'Level up mỗi ngày' },
  calendar: { brand: 'AN KHANG', slogan: 'Chúc mừng năm mới 2027', contact: 'ankhang.vn · 1900 6868' },
  shortcuts: { brand: 'Gia Khánh Academy' },
  pastel: { title: 'Hôm nay thật vui', sub: 'Học chăm, chơi khoẻ nha!' },
  quote: { quote: 'Làm việc chăm chỉ trong im lặng, để thành công lên tiếng.', author: 'Khuyết danh' },
};
export const defaultMPData = (): MPData => Object.assign({}, ...Object.values(MP_SAMPLES).reverse());

export interface MPLogo { src: string; w: number; h: number }

// ---------- hình học ----------
interface Rect { x: number; y: number; w: number; h: number }
const f2 = (n: number) => Math.round(n * 100) / 100;
/** đường cắt: chữ nhật bo góc hoặc tròn (toạ độ mm, gốc trên-trái) */
export function cutPath(sz: MPSize, inset = 0): string {
  const W = sz.wMm - inset * 2, H = sz.hMm - inset * 2, o = inset;
  if (sz.round) {
    const r = W / 2;
    return `M${f2(o)} ${f2(o + r)}A${f2(r)} ${f2(r)} 0 1 1 ${f2(o + W)} ${f2(o + r)}A${f2(r)} ${f2(r)} 0 1 1 ${f2(o)} ${f2(o + r)}Z`;
  }
  const r = Math.max(0, sz.r - inset);
  return `M${f2(o + r)} ${f2(o)}H${f2(o + W - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(o + W)} ${f2(o + r)}V${f2(o + H - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(o + W - r)} ${f2(o + H)}H${f2(o + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(o)} ${f2(o + H - r)}V${f2(o + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(o + r)} ${f2(o)}Z`;
}
/** lề an toàn (mm) */
export const mpSafe = (sz: MPSize) => (sz.desk ? 10 : 7);
/** bề rộng dùng được cho 1 dải chữ [y0, y1] (lót tròn: dây cung hẹp nhất trong dải) */
function bandW(sz: MPSize, y0: number, y1: number): number {
  const s = mpSafe(sz);
  if (!sz.round) return sz.wMm - s * 2;
  const R = sz.wMm / 2 - s, c = sz.hMm / 2;
  const d = Math.max(Math.abs(y0 - c), Math.abs(y1 - c));
  return d >= R ? 0 : 2 * Math.sqrt(R * R - d * d) * 0.94;
}
/** ô ảnh của bố cục (để tính dpi + đặt ảnh) */
export function mpPhotoSlot(spec: MPSpec): Rect | null {
  const sz = mpSize(spec.size); const W = sz.wMm, H = sz.hMm, b = MP_BLEED;
  if (spec.layout === 'photo') return { x: -b, y: -b, w: W + b * 2, h: H + b * 2 };
  if (spec.layout === 'polaroid') return polaroidGeom(sz).photo;
  return null;
}
export const mpPhotoDpi = (spec: MPSpec, p: CVPhoto | null) => {
  const s = mpPhotoSlot(spec); return s && p ? photoDpi(s, p) : 0;
};
function polaroidGeom(sz: MPSize) {
  const W = sz.wMm, H = sz.hMm, s = mpSafe(sz);
  let fw: number, cx: number, cy: number;
  if (sz.desk) { fw = (H - s * 2) * 0.86 / 1.2; cx = W - s - fw * 0.62 - W * 0.04; cy = H / 2; }
  else if (sz.round) { fw = W * 0.5; cx = W / 2; cy = H / 2 - W * 0.02; }
  else { fw = Math.min((H - s * 2) * 0.9 / 1.2, W * 0.62); cx = W / 2; cy = H / 2; }
  const fh = fw * 1.2, m = fw * 0.06;
  const frame = { x: cx - fw / 2, y: cy - fh / 2, w: fw, h: fh };
  const photo = { x: frame.x + m, y: frame.y + m, w: fw - m * 2, h: fw - m * 2 };
  const cap = { x: frame.x + m, y: photo.y + photo.h + m * 0.4, w: fw - m * 2, h: frame.y + fh - (photo.y + photo.h) - m * 0.9 };
  return { frame, photo, cap, cx, cy };
}

// ---------- trang trí vẽ bằng code ----------
const star = (cx: number, cy: number, r: number) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5; const rr = i % 2 ? r * 0.45 : r; pts.push(`${f2(cx + Math.cos(a) * rr)},${f2(cy + Math.sin(a) * rr)}`); }
  return pts.join(' ');
};
const heart = (cx: number, cy: number, s: number) => `M${f2(cx)} ${f2(cy + s * 0.35)}C${f2(cx - s * 0.9)} ${f2(cy - s * 0.25)} ${f2(cx - s * 0.45)} ${f2(cy - s * 0.85)} ${f2(cx)} ${f2(cy - s * 0.38)}C${f2(cx + s * 0.45)} ${f2(cy - s * 0.85)} ${f2(cx + s * 0.9)} ${f2(cy - s * 0.25)} ${f2(cx)} ${f2(cy + s * 0.35)}Z`;
function Cloud({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return <g fill={fill}><circle cx={x} cy={y} r={s * 0.5} /><circle cx={x + s * 0.55} cy={y - s * 0.25} r={s * 0.6} /><circle cx={x + s * 1.15} cy={y} r={s * 0.45} /><rect x={x} y={y - s * 0.05} width={s * 1.15} height={s * 0.5} rx={s * 0.2} /></g>;
}
function Cat({ x, y, s, p }: { x: number; y: number; s: number; p: MPPalette }) {
  // mặt mèo tròn: đầu + tai + mắt + má hồng + ria
  const head = '#FFFFFF';
  return (
    <g>
      <path d={`M${f2(x - s * 0.78)} ${f2(y - s * 0.35)}L${f2(x - s * 0.62)} ${f2(y - s * 1.05)}L${f2(x - s * 0.15)} ${f2(y - s * 0.72)}Z`} fill={head} stroke={p.ink} strokeWidth={s * 0.06} strokeLinejoin="round" />
      <path d={`M${f2(x + s * 0.78)} ${f2(y - s * 0.35)}L${f2(x + s * 0.62)} ${f2(y - s * 1.05)}L${f2(x + s * 0.15)} ${f2(y - s * 0.72)}Z`} fill={head} stroke={p.ink} strokeWidth={s * 0.06} strokeLinejoin="round" />
      <ellipse cx={x} cy={y} rx={s * 0.95} ry={s * 0.8} fill={head} stroke={p.ink} strokeWidth={s * 0.06} />
      <circle cx={x - s * 0.35} cy={y - s * 0.08} r={s * 0.09} fill={p.ink} /><circle cx={x + s * 0.35} cy={y - s * 0.08} r={s * 0.09} fill={p.ink} />
      <ellipse cx={x - s * 0.55} cy={y + s * 0.2} rx={s * 0.16} ry={s * 0.1} fill={p.accent} opacity={0.6} />
      <ellipse cx={x + s * 0.55} cy={y + s * 0.2} rx={s * 0.16} ry={s * 0.1} fill={p.accent} opacity={0.6} />
      <path d={`M${f2(x - s * 0.1)} ${f2(y + s * 0.12)}Q${f2(x)} ${f2(y + s * 0.24)} ${f2(x + s * 0.1)} ${f2(y + s * 0.12)}`} fill="none" stroke={p.ink} strokeWidth={s * 0.05} strokeLinecap="round" />
      <g stroke={p.ink} strokeWidth={s * 0.035} strokeLinecap="round">
        <line x1={x - s * 0.62} y1={y + s * 0.05} x2={x - s * 1.15} y2={y - s * 0.05} /><line x1={x - s * 0.62} y1={y + s * 0.15} x2={x - s * 1.15} y2={y + s * 0.2} />
        <line x1={x + s * 0.62} y1={y + s * 0.05} x2={x + s * 1.15} y2={y - s * 0.05} /><line x1={x + s * 0.62} y1={y + s * 0.15} x2={x + s * 1.15} y2={y + s * 0.2} />
      </g>
    </g>
  );
}
const initials = (s: string) => {
  const stop = new Set(['công', 'ty', 'tnhh', 'cổ', 'phần', 'cp', 'và', '&']);
  const w = s.trim().split(/\s+/).filter((x) => x && !stop.has(x.toLowerCase()));
  return (w.length >= 2 ? w[0][0] + w[1][0] : (w[0] || 'M').slice(0, 2)).toUpperCase();
};

// ---------- lịch 2027 ----------
const HOLI = new Set(['1-1', '5-2', '6-2', '7-2', '8-2', '9-2', '16-4', '30-4', '1-5', '1-9', '2-9']); // Tết DL, Tết Âm 2027 (5–9/2), Giỗ Tổ (10/3 ÂL = 16/4), 30/4, 1/5, Quốc khánh
function monthDays(m: number) {
  const first = new Date(2027, m, 1), n = new Date(2027, m + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7; // T2 = 0
  return { lead, n };
}

/** Chữ: <text> có data-role để QC dò */
function T({ x, y, s, fam, wt, fill, anchor = 'middle', children, ls, op, role = 'text' }: { x: number; y: number; s: number; fam: string; wt: number; fill: string; anchor?: 'start' | 'middle' | 'end'; children: ReactNode; ls?: number; op?: number; role?: string }) {
  return <text x={f2(x)} y={f2(y)} fontFamily={`"${fam}"`} fontWeight={wt} fontSize={f2(s)} fill={fill} textAnchor={anchor} letterSpacing={ls ? f2(ls * s) : undefined} opacity={op} data-role={role}>{children}</text>;
}

export type MPMode = 'face' | 'tex' | 'print';

export function MousepadSvg({ spec, data, photo, logo, mode = 'face', cut = false, style }: {
  spec: MPSpec; data: MPData; photo?: CVPhoto | null; logo?: MPLogo | null; mode?: MPMode; cut?: boolean; style?: CSSProperties;
}) {
  const sz = mpSize(spec.size);
  const W = sz.wMm, H = sz.hMm, s = mpSafe(sz), b = mode === 'print' ? MP_BLEED : 0;
  const p = mpPalette(spec.palette), f = mpFont(spec.font);
  const rid = useId();
  const uid = `mp${spec.layout}${mode}${rid}`.replace(/[^a-z0-9]/gi, '');
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  const bg = <rect x={-MP_BLEED} y={-MP_BLEED} width={W + MP_BLEED * 2} height={H + MP_BLEED * 2} fill={p.bg} />;
  const L = spec.layout;
  const desk = !!sz.desk, round = !!sz.round;
  const cx = W / 2;

  const img = (slot: Rect, clipId: string) => photo ? (() => {
    const r = coverRect(slot, photo);
    return (
      <g>
        <clipPath id={clipId}><rect x={f2(slot.x)} y={f2(slot.y)} width={f2(slot.w)} height={f2(slot.h)} /></clipPath>
        <image href={photo.src} x={f2(r.x)} y={f2(r.y)} width={f2(r.w)} height={f2(r.h)} preserveAspectRatio="none" clipPath={`url(#${clipId})`} />
      </g>
    );
  })() : <rect x={slot.x} y={slot.y} width={slot.w} height={slot.h} fill={p.bg2} />;

  const logoMark = (x: number, y: number, size: number, ring: string, fg: string) => logo ? (() => {
    const k = Math.min(size / logo.w, size / logo.h);
    return <image href={logo.src} x={f2(x - (logo.w * k) / 2)} y={f2(y - (logo.h * k) / 2)} width={f2(logo.w * k)} height={f2(logo.h * k)} preserveAspectRatio="xMidYMid meet" data-role="logo" />;
  })() : (
    <g data-role="logo">
      <circle cx={x} cy={y} r={size / 2} fill={ring} />
      <circle cx={x} cy={y} r={size / 2 - size * 0.06} fill="none" stroke={fg} strokeWidth={size * 0.018} opacity={0.6} />
      <T x={x} y={y + size * 0.13} s={fit(initials(data.brand || 'Mivy'), f.family, f.weight, size * 0.62, size * 0.38)} fam={f.family} wt={f.weight} fill={fg} role="mono">{initials(data.brand || 'Mivy')}</T>
    </g>
  );

  let body: ReactNode = null;

  if (L === 'photo') {
    const slot = { x: -MP_BLEED, y: -MP_BLEED, w: W + MP_BLEED * 2, h: H + MP_BLEED * 2 };
    const title = data.title || '', sub = data.sub || '';
    const tMax = desk ? H * 0.14 : H * 0.11;
    const yBase = round ? H * 0.74 : H - s - (sub ? tMax * 0.95 : tMax * 0.2);
    const bw = round ? bandW(sz, yBase - tMax, yBase + tMax * 1.2) : desk ? W * 0.55 : W - s * 2;
    const bt = wrapFit(title, f.family, f.weight, bw, tMax * 2.1, tMax, 2, 1.1);
    const ts = bt.size;
    const ss = fit(sub, BODY, 600, bw, Math.max(ts * 0.42, H * 0.04));
    const anchor = desk ? 'start' : 'middle';
    const tx = desk ? s + 6 : cx;
    const nl = bt.lines.length;
    body = (
      <>
        {bg}
        {img(slot, `${uid}ph`)}
        {(title || sub) && (
          <>
            <defs><linearGradient id={`${uid}gr`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.58" /></linearGradient></defs>
            <rect x={-MP_BLEED} y={H * (round ? 0.45 : 0.5)} width={W + MP_BLEED * 2} height={H * (round ? 0.55 : 0.5) + MP_BLEED} fill={`url(#${uid}gr)`} />
            {title && bt.lines.map((ln, i) => <T key={i} x={tx} y={yBase - (nl - 1 - i) * ts * 1.1} s={ts} fam={f.family} wt={f.weight} fill="#FFFFFF" anchor={anchor}>{ln}</T>)}
            {sub && <T x={tx} y={yBase + ts * 0.25 + ss * 1.25} s={ss} fam={BODY} wt={600} fill="#FFFFFF" anchor={anchor} op={0.92}>{sub}</T>}
          </>
        )}
      </>
    );
  } else if (L === 'polaroid') {
    const g = polaroidGeom(sz);
    const rot = desk ? 3 : -4;
    const title = data.title || '', sub = data.sub || '';
    const cap = g.cap;
    const ts = fit(title, f.family, f.weight, cap.w * 0.92, cap.h * 0.52);
    const ss = fit(sub, BODY, 600, cap.w * 0.92, Math.min(cap.h * 0.2, Math.max(ts * 0.45, cap.h * 0.16)));
    const dots = (
      <>
        <defs><pattern id={`${uid}dt`} width={desk ? 16 : 10} height={desk ? 16 : 10} patternUnits="userSpaceOnUse"><circle cx={desk ? 8 : 5} cy={desk ? 8 : 5} r={desk ? 1.6 : 1.1} fill={p.bg2} /></pattern></defs>
        <rect x={-MP_BLEED} y={-MP_BLEED} width={W + MP_BLEED * 2} height={H + MP_BLEED * 2} fill={`url(#${uid}dt)`} />
      </>
    );
    // desk mat: khối chữ to bên trái
    let left: ReactNode = null;
    if (desk) {
      const lw = g.frame.x - s * 2 - W * 0.03;
      const hs = H * 0.13;
      const bt = wrapFit(title, f.family, f.weight, lw, H * 0.42, hs, 2);
      const sb = fit(sub, BODY, 600, lw, bt.size * 0.4);
      const y0 = H / 2 - (bt.lines.length * bt.size * 1.15) / 2 + bt.size * 0.8;
      left = (
        <g>
          {bt.lines.map((ln, i) => <T key={i} x={s + 8} y={y0 + i * bt.size * 1.15} s={bt.size} fam={f.family} wt={f.weight} fill={p.ink} anchor="start">{ln}</T>)}
          {sub && <T x={s + 8} y={y0 + (bt.lines.length - 1) * bt.size * 1.15 + bt.size * 0.55 + sb * 1.4} s={sb} fam={BODY} wt={600} fill={p.sub} anchor="start">{sub}</T>}
          {[0, 1, 2].map((i) => <path key={i} d={heart(s + 14 + i * 16, H - s - 14, 7 - i)} fill={p.accent} opacity={0.75 - i * 0.18} />)}
        </g>
      );
    }
    body = (
      <>
        {bg}{dots}
        {!desk && [[0.12, 0.16, 7], [0.88, 0.2, 6], [0.9, 0.82, 8], [0.1, 0.8, 5]].map(([x, y, r], i) => round
          ? <path key={i} d={heart(cx + (x - 0.5) * W * 0.62, H / 2 + (y - 0.5) * H * 0.62, r)} fill={p.accent} opacity={0.55} />
          : <path key={i} d={heart(W * x, H * y, r)} fill={p.accent} opacity={0.55} />)}
        {left}
        <g transform={`rotate(${rot} ${f2(g.cx)} ${f2(g.cy)})`}>
          <rect x={g.frame.x + 1.2} y={g.frame.y + 2} width={g.frame.w} height={g.frame.h} fill="#000" opacity={0.16} rx={1} />
          <rect x={g.frame.x} y={g.frame.y} width={g.frame.w} height={g.frame.h} fill="#FFFFFF" rx={1} />
          {img(g.photo, `${uid}ph`)}
          {!desk && title && <T x={g.cx} y={cap.y + cap.h * 0.52} s={ts} fam={f.family} wt={f.weight} fill={p.ink}>{title}</T>}
          {!desk && sub && <T x={g.cx} y={cap.y + cap.h * 0.52 + ts * 0.3 + ss * 1.2} s={ss} fam={BODY} wt={600} fill={p.sub}>{sub}</T>}
          {desk && <path d={heart(g.cx, cap.y + cap.h * 0.5, cap.h * 0.32)} fill={p.accent} />}
        </g>
      </>
    );
  } else if (L === 'logo') {
    const brand = data.brand || '', slogan = data.slogan || '', contact = data.contact || '';
    const deco = (
      <g>
        <path d={`M${-MP_BLEED} ${-MP_BLEED}H${W * 0.34}L${-MP_BLEED} ${H * (desk ? 0.62 : 0.3)}Z`} fill={p.bg2} />
        <path d={`M${W + MP_BLEED} ${H + MP_BLEED}H${W * (desk ? 0.7 : 0.62)}L${W + MP_BLEED} ${H * (desk ? 0.35 : 0.7)}Z`} fill={p.accent} opacity={0.9} />
        <path d={`M${W + MP_BLEED} ${H + MP_BLEED}H${W * (desk ? 0.8 : 0.76)}L${W + MP_BLEED} ${H * (desk ? 0.55 : 0.8)}Z`} fill={p.accent2} opacity={0.85} />
      </g>
    );
    if (desk) {
      const ls = (H - s * 2) * 0.56;
      const lx = s + W * 0.04 + ls / 2;
      const tx = lx + ls / 2 + W * 0.05;
      const tw = W * 0.72 - tx;
      const bs = wrapFit(brand, f.family, f.weight, tw, H * 0.34, H * 0.17, 2);
      const sl = fit(slogan, BODY, 600, tw, bs.size * 0.46);
      const cs = fit(contact, BODY, 600, tw, sl * 0.82);
      const block = bs.lines.length * bs.size * 1.12 + sl * 1.8 + cs * 2.2;
      let y = H / 2 - block / 2 + bs.size * 0.82;
      const out: ReactNode[] = bs.lines.map((ln, i) => <T key={i} x={tx} y={y + i * bs.size * 1.12} s={bs.size} fam={f.family} wt={f.weight} fill={p.ink} anchor="start">{ln}</T>);
      y += (bs.lines.length - 1) * bs.size * 1.12;
      body = (
        <>
          {bg}{deco}
          {logoMark(lx, H / 2, ls, p.accent, '#FFFFFF')}
          <line x1={tx - W * 0.025} y1={H * 0.28} x2={tx - W * 0.025} y2={H * 0.72} stroke={p.accent} strokeWidth={1.4} />
          {out}
          {slogan && <T x={tx} y={y + bs.size * 0.3 + sl * 1.5} s={sl} fam={BODY} wt={600} fill={p.sub} anchor="start">{slogan}</T>}
          {contact && <T x={tx} y={y + bs.size * 0.3 + sl * 1.5 + cs * 2.1} s={cs} fam={BODY} wt={800} fill={p.accent} anchor="start">{contact}</T>}
        </>
      );
    } else {
      const ls = round ? W * 0.26 : (H - s * 2) * 0.34;
      const ly = round ? H * 0.31 : s + H * 0.04 + ls / 2;
      const by = ly + ls / 2 + H * 0.12;
      const bs = wrapFit(brand, f.family, f.weight, bandW(sz, by - H * 0.09, by + H * 0.05), H * 0.2, H * 0.1, 2);
      const yb = by;
      const yAfter = yb + (bs.lines.length - 1) * bs.size * 1.12;
      const sy = yAfter + bs.size * 0.3 + H * 0.065;
      const sl = fit(slogan, BODY, 600, bandW(sz, sy - 8, sy + 2), bs.size * 0.5);
      const cy = round ? H * 0.84 : H - s - H * 0.035;
      const cs = fit(contact, BODY, 800, bandW(sz, cy - 6, cy + 2), Math.min(sl * 0.9, H * 0.05));
      body = (
        <>
          {bg}{!round && deco}
          {round && <circle cx={cx} cy={H / 2} r={W / 2 - s * 0.6} fill="none" stroke={p.accent} strokeWidth={1.2} strokeDasharray="3 3" />}
          {logoMark(cx, ly, ls, p.accent, '#FFFFFF')}
          {bs.lines.map((ln, i) => <T key={i} x={cx} y={yb + i * bs.size * 1.12} s={bs.size} fam={f.family} wt={f.weight} fill={p.ink}>{ln}</T>)}
          {slogan && <T x={cx} y={sy} s={sl} fam={BODY} wt={600} fill={p.sub}>{slogan}</T>}
          {contact && <T x={cx} y={cy} s={cs} fam={BODY} wt={800} fill={round ? p.accent : p.ink}>{contact}</T>}
        </>
      );
    }
  } else if (L === 'gaming') {
    const title = data.title || '', sub = data.sub || '';
    const hz = desk ? H * 0.6 : H * 0.62;
    const grid: ReactNode[] = [];
    const vx = cx;
    for (let i = -14; i <= 14; i++) grid.push(<line key={`v${i}`} x1={vx + i * (W / 28) * 0.35} y1={hz} x2={vx + i * (W / 28) * 2.6} y2={H + MP_BLEED} stroke={p.accent} strokeWidth={desk ? 0.9 : 0.5} opacity={0.55} />);
    for (let k = 0; k < 9; k++) { const t = Math.pow(k / 8, 1.8); const y = hz + (H + MP_BLEED - hz) * t; grid.push(<line key={`h${k}`} x1={-MP_BLEED} y1={y} x2={W + MP_BLEED} y2={y} stroke={p.accent} strokeWidth={desk ? 0.9 : 0.5} opacity={0.35 + t * 0.4} />); }
    const sunR = desk ? H * 0.3 : H * 0.24;
    const hexes: ReactNode[] = [];
    const hs = desk ? 22 : 11;
    for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) {
      const hx = (desk ? W * 0.03 : W * 0.02) + c * hs * 1.5, hy = hs * 0.8 + r * hs * 0.866 * 2 + (c % 2) * hs * 0.866;
      if (hy > hz - hs) continue;
      const pts = Array.from({ length: 6 }, (_, k) => `${f2(hx + Math.cos((k * Math.PI) / 3) * hs * 0.82)},${f2(hy + Math.sin((k * Math.PI) / 3) * hs * 0.82)}`).join(' ');
      hexes.push(<polygon key={`${r}-${c}`} points={pts} fill="none" stroke={p.accent2} strokeWidth={desk ? 0.8 : 0.45} opacity={0.18 + ((r + c) % 3) * 0.08} />);
    }
    const tMax = desk ? H * 0.22 : H * 0.14;
    const ty = round ? H * 0.47 : hz - (desk ? H * 0.07 : H * 0.05);
    const tw = round ? bandW(sz, ty - tMax, ty) : desk ? W * 0.6 : W - s * 2;
    const ts = fit(title, f.family, f.weight, tw, tMax, 0.04);
    const sy = round ? ty + ts * 0.25 + H * 0.08 : ty + ts * 0.32 + (desk ? H * 0.09 : H * 0.075);
    const ss = fit(sub, BODY, 800, round ? bandW(sz, sy - 6, sy + 1) : tw * 0.9, Math.max(ts * 0.32, H * (desk ? 0.05 : 0.04)), 0.18);
    const brk = (x: number, y: number, dx: number, dy: number) => <path d={`M${f2(x)} ${f2(y + dy)}V${f2(y)}H${f2(x + dx)}`} fill="none" stroke={p.accent} strokeWidth={desk ? 2 : 1.1} />;
    const bl = desk ? 34 : 14;
    body = (
      <>
        <defs>
          <radialGradient id={`${uid}rg`} cx="0.5" cy="0.45" r="0.75"><stop offset="0" stopColor={p.bg2} /><stop offset="1" stopColor={p.bg} /></radialGradient>
          <linearGradient id={`${uid}sun`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={p.accent2} /><stop offset="1" stopColor={p.accent} /></linearGradient>
          <filter id={`${uid}gl`} x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation={desk ? 3 : 1.6} /></filter>
        </defs>
        <rect x={-MP_BLEED} y={-MP_BLEED} width={W + MP_BLEED * 2} height={H + MP_BLEED * 2} fill={`url(#${uid}rg)`} />
        {hexes}
        <circle cx={cx} cy={hz} r={sunR} fill={`url(#${uid}sun)`} opacity={0.32} />
        {[0, 1, 2, 3].map((k) => <rect key={k} x={cx - sunR} y={hz - sunR * (0.18 + k * 0.16)} width={sunR * 2} height={sunR * 0.05 + k * 0.6} fill={p.bg} opacity={0.6} />)}
        {grid}
        <line x1={-MP_BLEED} y1={hz} x2={W + MP_BLEED} y2={hz} stroke={p.accent} strokeWidth={desk ? 1.6 : 0.8} />
        {!round && <>{brk(s, s, bl, bl)}{brk(W - s, s, -bl, bl)}{brk(s, H - s, bl, -bl)}{brk(W - s, H - s, -bl, -bl)}</>}
        {title && <g filter={`url(#${uid}gl)`} opacity={0.9}><T x={cx} y={ty} s={ts} fam={f.family} wt={f.weight} fill={p.accent} ls={0.04} role="glow">{title}</T></g>}
        {title && <T x={cx} y={ty} s={ts} fam={f.family} wt={f.weight} fill={p.ink} ls={0.04}>{title}</T>}
        {sub && <T x={cx} y={sy} s={ss} fam={BODY} wt={800} fill={p.accent2} ls={0.18}>{sub.toUpperCase()}</T>}
      </>
    );
  } else if (L === 'calendar') {
    const brand = data.brand || '', slogan = data.slogan || '', contact = data.contact || '';
    const mono = { fam: f.family, wt: f.weight };
    let gx: number, gy: number, gw: number, gh: number, cols: number;
    let header: ReactNode;
    if (desk) {
      const side = W * 0.22;
      gx = s; gy = s; gw = W - s * 2 - side - W * 0.02; gh = H - s * 2; cols = 6;
      const px = W - s - side / 2, pw = side * 0.9;
      const yr = fit('2027', mono.fam, mono.wt, pw, H * 0.2);
      const bs = wrapFit(brand, mono.fam, mono.wt, pw, H * 0.18, H * 0.075, 2);
      const sl = wrapFit(slogan, BODY, 600, pw, H * 0.12, bs.size * 0.55, 2);
      const cs = fit(contact, BODY, 800, pw, sl.size * 0.9);
      const lsz = Math.min(pw * 0.5, H * 0.2);
      let y = s + H * 0.03 + lsz;
      header = (
        <g>
          <rect x={W - s - side} y={s} width={side} height={H - s * 2} rx={6} fill={p.bg2} />
          {logoMark(px, s + H * 0.03 + lsz / 2, lsz, p.accent, '#FFFFFF')}
          <T x={px} y={(y += H * 0.03 + yr * 0.8)} s={yr} fam={mono.fam} wt={mono.wt} fill={p.accent}>2027</T>
          {bs.lines.map((ln, i) => <T key={`b${i}`} x={px} y={(y += (i ? bs.size * 1.1 : yr * 0.25 + bs.size * 1.2))} s={bs.size} fam={mono.fam} wt={mono.wt} fill={p.ink}>{ln}</T>)}
          {sl.lines.map((ln, i) => <T key={`s${i}`} x={px} y={(y += (i ? sl.size * 1.2 : sl.size * 1.9))} s={sl.size} fam={BODY} wt={600} fill={p.sub}>{ln}</T>)}
          {contact && <T x={px} y={H - s - H * 0.05} s={cs} fam={BODY} wt={800} fill={p.accent}>{contact}</T>}
        </g>
      );
    } else {
      const hh = H * 0.14;
      gx = s; gy = s + hh + 3; gw = W - s * 2; gh = H - s * 2 - hh - 3; cols = 4;
      const bsz = fit(brand, mono.fam, mono.wt, gw * 0.5, hh * 0.42);
      const ssz = fit(slogan, BODY, 600, gw * 0.5, hh * 0.24);
      const yr = fit('2027', mono.fam, mono.wt, gw * 0.3, hh * 0.78);
      header = (
        <g>
          <rect x={-MP_BLEED} y={-MP_BLEED} width={W + MP_BLEED * 2} height={s + hh + MP_BLEED} fill={p.bg2} />
          <T x={s} y={s + hh * 0.48} s={bsz} fam={mono.fam} wt={mono.wt} fill={p.ink} anchor="start">{brand}</T>
          <T x={s} y={s + hh * 0.48 + ssz * 1.5} s={ssz} fam={BODY} wt={600} fill={p.sub} anchor="start">{slogan}</T>
          <T x={W - s} y={s + hh * 0.78} s={yr} fam={mono.fam} wt={mono.wt} fill={p.accent} anchor="end">2027</T>
        </g>
      );
    }
    const rows = 12 / cols;
    const gap = desk ? 8 : 3.2;
    const mw = (gw - gap * (cols - 1)) / cols, mh = (gh - gap * (rows - 1)) / rows;
    const red = spec.palette === 'tet' ? '#FFE08A' : '#D6312F';
    const months: ReactNode[] = [];
    for (let m = 0; m < 12; m++) {
      const c = m % cols, r = Math.floor(m / cols);
      const x0 = gx + c * (mw + gap), y0 = gy + r * (mh + gap);
      const { lead, n } = monthDays(m);
      const th = mh * 0.15, wh = mh * 0.11;
      const cw = mw / 7, ch = (mh - th - wh) / 6;
      const ds = Math.min(ch * 0.58, cw * 0.5);
      const cells: ReactNode[] = [];
      ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].forEach((d, i) => cells.push(<T key={`w${i}`} x={x0 + cw * (i + 0.5)} y={y0 + th + wh * 0.72} s={Math.min(wh * 0.62, cw * 0.42)} fam={BODY} wt={800} fill={i === 6 ? red : p.sub}>{d}</T>));
      for (let d = 1; d <= n; d++) {
        const k = lead + d - 1, col = k % 7, row = Math.floor(k / 7);
        const hol = HOLI.has(`${d}-${m + 1}`);
        const xx = x0 + cw * (col + 0.5), yy = y0 + th + wh + ch * (row + 0.5);
        if (hol) cells.push(<circle key={`h${d}`} cx={xx} cy={yy} r={Math.min(cw, ch) * 0.42} fill={spec.palette === 'tet' ? '#FFFFFF' : red} opacity={spec.palette === 'tet' ? 0.2 : 0.14} />);
        cells.push(<T key={d} x={xx} y={yy + ds * 0.36} s={ds} fam={BODY} wt={hol || col === 6 ? 800 : 600} fill={hol || col === 6 ? red : p.ink}>{d}</T>);
      }
      months.push(
        <g key={m}>
          <T x={x0 + cw * 0.5 - ds * 0.3} y={y0 + th * 0.75} s={Math.min(th * 0.7, mw * 0.13)} fam={mono.fam} wt={mono.wt} fill={p.accent} anchor="start">{`THÁNG ${m + 1}`}</T>
          {cells}
        </g>,
      );
    }
    body = <>{bg}{header}{months}</>;
  } else if (L === 'shortcuts') {
    const set = mpSet(spec.set);
    const hh = desk ? H * 0.13 : H * 0.15;
    const cols = desk ? 4 : 2;
    const maxItems = desk ? set.items.length : 14;
    const items = set.items.slice(0, maxItems);
    const rows = Math.ceil(items.length / cols);
    const gx = s, gy = s + hh + (desk ? 8 : 4), gw = W - s * 2, gh = H - s - gy;
    const cgap = desk ? 14 : 5;
    const colW = (gw - cgap * (cols - 1)) / cols, rowH = gh / rows;
    const keyS = Math.min(rowH * 0.34, colW * 0.07);
    const capH = keyS * 1.75, padX = keyS * 0.5, plus = keyS * 0.7;
    const comboOf = (c: string) => (c.endsWith('++') ? [...c.slice(0, -2).split('+'), '+'] : c.split('+'));
    const capsMax = Math.max(...items.map(([c]) => comboOf(c).reduce((w, k, i, a) => w + textW(k, BODY, 800, keyS) + padX * 2 + (i < a.length - 1 ? plus : 0), 0)));
    const descMax = Math.max(...items.map(([, d]) => textW(d, BODY, 600, keyS * 0.95)));
    const gapCD = keyS * 0.9;
    const kScale = Math.min(1, colW / (capsMax + gapCD + descMax)); // 1 tỉ lệ chung cho cả bảng → chữ đều nhau
    const capArea = capsMax * kScale;
    const ttl = fit(set.title, f.family, f.weight, gw * 0.62, hh * 0.5, 0.03);
    const brand = data.brand || '';
    const bsz = fit(brand, BODY, 800, gw * 0.3, hh * 0.24);
    const out: ReactNode[] = [];
    items.forEach(([combo, desc], i) => {
      const c = Math.floor(i / rows), r = i % rows;
      const x0 = gx + c * (colW + cgap), yc = gy + r * rowH + rowH / 2;
      const ks = keyS * kScale, ch2 = capH * kScale, px2 = padX * kScale, pl = plus * kScale;
      let x = x0;
      const keys = comboOf(combo);
      keys.forEach((k, j) => {
        const kw = textW(k, BODY, 800, ks) + px2 * 2;
        out.push(<rect key={`c${i}-${j}`} x={f2(x)} y={f2(yc - ch2 / 2)} width={f2(kw)} height={f2(ch2)} rx={f2(ch2 * 0.22)} fill={p.bg2} stroke={p.accent} strokeWidth={desk ? 0.6 : 0.35} />);
        out.push(<T key={`k${i}-${j}`} x={x + kw / 2} y={yc + ks * 0.36} s={ks} fam={BODY} wt={800} fill={p.ink} role="key">{k}</T>);
        x += kw;
        if (j < keys.length - 1) { out.push(<T key={`p${i}-${j}`} x={x + pl / 2} y={yc + ks * 0.36} s={ks * 0.9} fam={BODY} wt={800} fill={p.sub} role="plus">+</T>); x += pl; }
      });
      const dx = x0 + capArea + gapCD * kScale;
      const ds = keyS * 0.95 * kScale;
      out.push(<T key={`d${i}`} x={dx} y={yc + ds * 0.36} s={ds} fam={BODY} wt={600} fill={p.ink} anchor="start">{desc}</T>);
      if (r % 2 === 0) out.unshift(<rect key={`z${i}`} x={x0 - keyS * 0.4} y={yc - rowH / 2 + 0.6} width={colW + keyS * 0.8} height={rowH - 1.2} rx={keyS * 0.4} fill={p.bg2} opacity={0.55} />);
    });
    body = (
      <>
        {bg}
        <rect x={-MP_BLEED} y={-MP_BLEED} width={W + MP_BLEED * 2} height={s + hh + MP_BLEED} fill={p.accent} />
        <T x={s} y={s + hh * 0.68} s={ttl} fam={f.family} wt={f.weight} fill="#FFFFFF" anchor="start" ls={0.03}>{set.title}</T>
        {brand && <T x={W - s} y={s + hh * 0.62} s={bsz} fam={BODY} wt={800} fill="#FFFFFF" anchor="end" op={0.9}>{brand}</T>}
        {out}
      </>
    );
  } else if (L === 'pastel') {
    const title = data.title || '', sub = data.sub || '';
    const tMax = desk ? H * 0.18 : H * 0.13;
    let tx = cx, anchor: 'start' | 'middle' = 'middle', ty = round ? H * 0.46 : H * 0.42, tw = round ? bandW(sz, ty - tMax * 2, ty + tMax) : W - s * 2 - W * 0.06;
    if (desk) { tx = s + W * 0.06; anchor = 'start'; ty = H * 0.48; tw = W * 0.55; }
    const bt = wrapFit(title, f.family, f.weight, tw, desk ? H * 0.42 : H * 0.3, tMax, 2);
    const y0 = ty - ((bt.lines.length - 1) * bt.size * 1.08) / 2;
    const yEnd = y0 + (bt.lines.length - 1) * bt.size * 1.08;
    const sy = yEnd + bt.size * 0.3 + bt.size * 0.55;
    const ss = fit(sub, 'Baloo 2', 600, round ? bandW(sz, sy - 8, sy + 2) : tw, Math.max(bt.size * 0.42, H * 0.04));
    const sc = desk ? H * 0.12 : H * 0.07;
    const deco: ReactNode[] = [];
    const spots: [number, number, number][] = desk
      ? [[0.05, 0.16, 1], [0.38, 0.1, 0.7], [0.92, 0.12, 0.8], [0.66, 0.86, 0.6], [0.04, 0.86, 0.6]]
      : round ? [[0.24, 0.22, 0.6], [0.74, 0.2, 0.5], [0.8, 0.74, 0.5], [0.2, 0.72, 0.45]] : [[0.08, 0.1, 0.8], [0.84, 0.08, 0.65], [0.06, 0.84, 0.55], [0.48, 0.92, 0.4]];
    spots.forEach(([x, y, k], i) => {
      if (i % 2 === 0) deco.push(<Cloud key={`c${i}`} x={W * x} y={H * y} s={sc * k * 1.4} fill="#FFFFFF" />);
      else deco.push(<polygon key={`s${i}`} points={star(W * x, H * y, sc * k * 0.6)} fill={p.accent2} />);
    });
    const dots: [number, number][] = round ? [[0.33, 0.14], [0.68, 0.86], [0.86, 0.45], [0.14, 0.5]] : [[0.3, 0.2], [0.6, 0.14], [0.92, 0.5], [0.24, 0.92], [0.04, 0.5]];
    dots.forEach(([x, y], i) => deco.push(<path key={`h${i}`} d={heart(W * x, H * y, sc * 0.45)} fill={p.accent} opacity={0.8} />));
    const catS = desk ? H * 0.2 : round ? W * 0.085 : H * 0.12;
    const catX = desk ? W * 0.82 : round ? cx : W - s - catS * 1.35, catY = desk ? H * 0.56 : round ? H * 0.835 : H - s - catS * 0.95;
    body = (
      <>
        {bg}
        <circle cx={desk ? W * 0.82 : W * 0.78} cy={desk ? H * 0.5 : H * 0.62} r={desk ? H * 0.38 : H * 0.34} fill={p.bg2} />
        {deco}
        <Cat x={catX} y={catY} s={catS} p={p} />
        {bt.lines.map((ln, i) => <T key={i} x={tx} y={y0 + i * bt.size * 1.08 + bt.size * 0.35} s={bt.size} fam={f.family} wt={f.weight} fill={p.ink} anchor={anchor}>{ln}</T>)}
        {sub && <T x={tx} y={sy + bt.size * 0.35} s={ss} fam="Baloo 2" wt={600} fill={p.sub} anchor={anchor}>{sub}</T>}
      </>
    );
  } else { // quote
    const q = data.quote || '', au = data.author || '';
    const qw = round ? W * 0.66 : desk ? W * 0.62 : W - s * 2 - W * 0.1;
    const qh = round ? H * 0.36 : desk ? H * 0.56 : H * 0.48;
    const bt = wrapFit(q, f.family, f.weight, qw, qh, desk ? H * 0.11 : H * 0.085, 4, 1.25);
    const lh = bt.size * 1.25;
    const y0 = H / 2 - ((bt.lines.length - 1) * lh) / 2 + bt.size * 0.3 - (au ? bt.size * 0.4 : 0);
    const yEnd = y0 + (bt.lines.length - 1) * lh;
    const ay = yEnd + bt.size * 0.4 + bt.size * 1.1;
    const as = fit(au ? `— ${au}` : '', BODY, 600, round ? bandW(sz, ay - 6, ay + 1) : qw, bt.size * 0.5, 0.08);
    const qm = desk ? H * 0.16 : H * 0.12;
    const qx = round ? cx - qm * 0.6 : desk ? W * 0.17 : s + W * 0.04, qy = round ? H * 0.2 : desk ? H * 0.2 : s + H * 0.04;
    const mark = (x: number) => <path d={`M${f2(x)} ${f2(qy + qm * 0.5)}a${f2(qm * 0.25)} ${f2(qm * 0.25)} 0 1 0 ${f2(qm * 0.5)} 0a${f2(qm * 0.25)} ${f2(qm * 0.25)} 0 1 0 -${f2(qm * 0.5)} 0Zm${f2(qm * 0.5)} 0q0 ${f2(qm * 0.5)} -${f2(qm * 0.42)} ${f2(qm * 0.7)}`} fill={p.accent} stroke={p.accent} strokeWidth={qm * 0.06} />;
    body = (
      <>
        {bg}
        {!round && <rect x={-MP_BLEED} y={H - s * 0.6} width={W + MP_BLEED * 2} height={s * 0.6 + MP_BLEED} fill={p.accent} />}
        <g transform={`rotate(180 ${f2(qx + qm * 0.56)} ${f2(qy + qm * 0.6)})`}>{mark(qx)}{mark(qx + qm * 0.62)}</g>
        {bt.lines.map((ln, i) => <T key={i} x={cx} y={y0 + i * lh} s={bt.size} fam={f.family} wt={f.weight} fill={p.ink}>{ln}</T>)}
        {au && <line x1={cx - qw * 0.08} y1={yEnd + bt.size * 0.7} x2={cx + qw * 0.08} y2={yEnd + bt.size * 0.7} stroke={p.accent} strokeWidth={desk ? 1.2 : 0.6} />}
        {au && <T x={cx} y={ay} s={as} fam={BODY} wt={600} fill={p.sub} ls={0.08}>{`— ${au}`}</T>}
      </>
    );
  }

  const shape = cutPath(sz);
  const stitchCol = spec.stitch === 'black' ? '#1B1B1B' : spec.stitch === 'white' ? '#F4F4F2' : spec.stitch === 'accent' ? p.accent : null;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-w={W} data-h={H} data-safe={s} data-round={round ? 1 : 0}>
      {mode === 'face' ? (
        <>
          <defs><clipPath id={`${uid}cl`}><path d={shape} /></clipPath></defs>
          <g clipPath={`url(#${uid}cl)`}>{body}</g>
          {stitchCol && <path d={cutPath(sz, 1.3)} fill="none" stroke={stitchCol} strokeWidth={2.6} strokeDasharray="1.2 0.5" />}
        </>
      ) : body}
      {mode === 'print' && cut && <g id="CutContour"><path d={shape} fill="none" stroke="#FF00FF" strokeWidth={0.3} /></g>}
    </svg>
  );
}

export const mpOrderTitle = (spec: MPSpec) => {
  const sz = mpSize(spec.size);
  return `${sz.desk ? 'Desk mat' : 'Lót chuột'} ${sz.name.replace('Desk mat ', '')} · dày ${spec.thick}mm${spec.stitch !== 'none' ? ' · viền khâu' : ''} · ${mpLayout(spec.layout).name}`;
};
