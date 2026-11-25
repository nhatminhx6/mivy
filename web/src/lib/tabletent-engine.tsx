'use client';
// Tent card để bàn: 3 kiểu — chữ A gấp 2 mặt (có đế + tai dán), lăng trụ tam giác 3 mặt (đứng), thẻ cài kệ mica chữ V.
// Mỗi MẶT chọn 1 công dụng (món mới/combo, happy hour, wifi + QR, đặt chỗ, số bàn + QR gọi món, đánh giá Google,
// menu mini / room service, bảng tên đại biểu). Bảng tên: dán danh sách → mỗi người 1 thẻ (2 mặt cùng tên).
// Render code 100% (SVG), QR mã hoá ngay trên máy. Lưới mặt: rộng 1000, cao 1000·h/w. Khuôn bế (dieline) đơn vị mm:
// nét cắt (CutContour, magenta) + nét gấp (Fold, cyan nét đứt), nền tràn lề xén 3mm ra ngoài nét cắt.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';
import { FL_PALETTES, flPalette, textW, type FLPalette } from './flyer-engine';
import { wifiPayload } from './qrstand-engine';

export { FL_FONT_CSS as TT_FONT_CSS, useFLFonts as useTTFonts } from './flyer-engine';
export const TT_PALETTES = FL_PALETTES;

// ---------- kiểu, khổ ----------
export type TTKind = 'a' | 'tri' | 'v';
export const TT_KINDS: { id: TTKind; name: string; faces: number; note: string }[] = [
  { id: 'a', name: 'Chữ A gấp 2 mặt', faces: 2, note: '1 tờ gấp: mặt trước + mặt sau + đế dán keo — phổ biến nhất, rẻ nhất' },
  { id: 'tri', name: 'Tam giác 3 mặt', faces: 3, note: 'Lăng trụ đứng 3 mặt, có nắp tam giác 2 đầu — khách ngồi phía nào cũng thấy' },
  { id: 'v', name: 'Kệ mica chữ V', faces: 2, note: 'Kệ mica gấp chữ V, cài 2 thẻ in rời — sang, thay nội dung dễ' },
];
export const ttKind = (id: TTKind) => TT_KINDS.find((k) => k.id === id) || TT_KINDS[0];

export interface TTSize { id: string; name: string; wMm: number; hMm: number }
export const TT_SIZES: TTSize[] = [
  { id: '10x15', name: '10×15cm đứng', wMm: 100, hMm: 150 },
  { id: '10x20', name: '10×20cm đứng', wMm: 100, hMm: 200 },
  { id: '20x10', name: '20×10cm ngang (bảng tên)', wMm: 200, hMm: 100 },
  { id: '15x21', name: '15×21cm đứng (A5)', wMm: 150, hMm: 210 },
];
export const ttSize = (id: string) => TT_SIZES.find((s) => s.id === id) || TT_SIZES[0];
export const TT_BLEED_MM = 3;   // khuôn bế
export const TT_CARD_BLEED_MM = 2; // thẻ rời kệ mica
export const TT_TILT_DEG = 16;  // mỗi mặt chữ A nghiêng 16° so với phương đứng
export const TT_GLUE_MM = 12;

// ---------- font (đều có TTF → file in outline được) ----------
export interface TTFont { id: string; name: string; family: string; weight: number }
export const TT_FONTS: TTFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const ttFont = (id: string) => TT_FONTS.find((f) => f.id === id) || TT_FONTS[0];
const BODY = 'Be Vietnam Pro';

// ---------- công dụng từng mặt ----------
export type TTUse = 'combo' | 'happy' | 'wifi' | 'reserved' | 'table' | 'review' | 'room' | 'name';
export const TT_USES: { id: TTUse; name: string }[] = [
  { id: 'combo', name: 'Món mới · combo' },
  { id: 'happy', name: 'Happy hour · khuyến mãi' },
  { id: 'wifi', name: 'Wifi + QR' },
  { id: 'reserved', name: 'Bàn đặt trước' },
  { id: 'table', name: 'Số bàn + QR gọi món' },
  { id: 'review', name: 'Đánh giá Google' },
  { id: 'room', name: 'Menu mini · room service' },
  { id: 'name', name: 'Bảng tên đại biểu' },
];
export const useName = (u: TTUse) => TT_USES.find((x) => x.id === u)?.name || u;

// ---------- dữ liệu ----------
export type TTData = Record<string, string>;
export interface TTField { key: string; label: string; ph?: string; half?: boolean; multiline?: boolean; for?: TTUse }
export const TT_FIELDS: TTField[] = [
  { key: 'brand', label: 'Tên quán / thương hiệu', ph: 'AN KHANG COFFEE', half: true },
  { key: 'footer', label: 'Dòng cuối (SĐT · web)', ph: '0909 123 456 · ankhang.vn', half: true },
  { key: 'comboKicker', label: 'Nhãn nhỏ', ph: 'MÓN MỚI', half: true, for: 'combo' },
  { key: 'comboName', label: 'Tên món / combo', ph: 'Bánh flan cà phê muối', half: true, for: 'combo' },
  { key: 'comboPrice', label: 'Giá', ph: '39.000đ', half: true, for: 'combo' },
  { key: 'comboOld', label: 'Giá cũ (gạch, tuỳ chọn)', ph: '49.000đ', half: true, for: 'combo' },
  { key: 'comboDesc', label: 'Mô tả ngắn', ph: 'Flan mềm mịn, sốt cà phê rang xay, kem muối béo nhẹ', for: 'combo' },
  { key: 'hhTitle', label: 'Tiêu đề', ph: 'HAPPY HOUR', half: true, for: 'happy' },
  { key: 'hhTime', label: 'Khung giờ', ph: '14:00 – 17:00 mỗi ngày', half: true, for: 'happy' },
  { key: 'hhDeal', label: 'Ưu đãi (to nhất)', ph: 'MUA 1 TẶNG 1', half: true, for: 'happy' },
  { key: 'hhNote', label: 'Điều kiện', ph: 'Áp dụng mọi món nước size M', half: true, for: 'happy' },
  { key: 'wifiName', label: 'Tên wifi', ph: 'AnKhang_Guest', half: true, for: 'wifi' },
  { key: 'wifiPass', label: 'Mật khẩu wifi', ph: 'cafengon2027', half: true, for: 'wifi' },
  { key: 'tableNo', label: 'Số bàn', ph: '05', half: true, for: 'reserved' },
  { key: 'resLabel', label: 'Dòng đặt chỗ', ph: 'ĐÃ ĐẶT CHỖ', half: true, for: 'reserved' },
  { key: 'resName', label: 'Khách đặt (tuỳ chọn)', ph: 'Anh Quốc Bảo', half: true, for: 'reserved' },
  { key: 'resTime', label: 'Giờ (tuỳ chọn)', ph: '19:00 · 6 khách', half: true, for: 'reserved' },
  { key: 'tableNo', label: 'Số bàn', ph: '05', half: true, for: 'table' },
  { key: 'menuUrl', label: 'Link menu / gọi món (tạo QR)', ph: 'https://ankhang.vn/menu', half: true, for: 'table' },
  { key: 'tableNote', label: 'Dòng hướng dẫn', ph: 'Quét mã để xem menu & gọi món', for: 'table' },
  { key: 'reviewUrl', label: 'Link đánh giá Google (tạo QR)', ph: 'https://g.page/r/…/review', half: true, for: 'review' },
  { key: 'reviewText', label: 'Lời mời đánh giá', ph: 'Hài lòng? Cho quán 5 sao nhé!', half: true, for: 'review' },
  { key: 'roomTitle', label: 'Tiêu đề menu', ph: 'ROOM SERVICE', half: true, for: 'room' },
  { key: 'roomHotline', label: 'Dòng gọi món', ph: 'Gọi số 9 từ phòng · 6:00 – 22:00', half: true, for: 'room' },
  { key: 'roomItems', label: 'Món (mỗi dòng: Tên | Giá)', multiline: true, for: 'room' },
  { key: 'eventName', label: 'Tên sự kiện / hội nghị', ph: 'HỘI NGHỊ KHÁCH HÀNG 2027', for: 'name' },
  { key: 'names', label: 'Danh sách đại biểu (mỗi dòng: Họ tên | Chức vụ, đơn vị) → mỗi người 1 thẻ', multiline: true, for: 'name' },
];
export const defaultTTData = (): TTData => ({
  brand: 'AN KHANG COFFEE', footer: '0909 123 456 · ankhang.vn',
  comboKicker: 'MÓN MỚI', comboName: 'Bánh flan cà phê muối', comboPrice: '39.000đ', comboOld: '49.000đ',
  comboDesc: 'Flan mềm mịn, sốt cà phê rang xay, kem muối béo nhẹ',
  hhTitle: 'HAPPY HOUR', hhTime: '14:00 – 17:00 mỗi ngày', hhDeal: 'MUA 1 TẶNG 1', hhNote: 'Áp dụng mọi món nước size M',
  wifiName: 'AnKhang_Guest', wifiPass: 'cafengon2027',
  tableNo: '05', resLabel: 'ĐÃ ĐẶT CHỖ', resName: 'Anh Quốc Bảo', resTime: '19:00 · 6 khách',
  menuUrl: 'https://ankhang.vn/menu', tableNote: 'Quét mã để xem menu & gọi món',
  reviewUrl: 'https://g.page/r/ankhang-coffee/review', reviewText: 'Hài lòng? Cho quán 5 sao nhé!',
  roomTitle: 'ROOM SERVICE', roomHotline: 'Gọi số 9 từ phòng · 6:00 – 22:00',
  roomItems: 'Phở bò tái | 85.000đ\nCơm chiên hải sản | 95.000đ\nMì xào bò | 90.000đ\nCà phê sữa đá | 45.000đ\nNước cam ép | 55.000đ',
  eventName: 'HỘI NGHỊ KHÁCH HÀNG 2027',
  names: 'Nguyễn Quốc Bảo | Giám đốc kinh doanh\nTrần Thu Hà | Trưởng phòng Marketing\nLê Gia Khánh | Đại diện đối tác An Khang',
});

export interface TTPerson { name: string; role: string }
export function personList(d: TTData): TTPerson[] {
  return (d.names || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 200).map((l) => {
    const [n, ...r] = l.split('|');
    return { name: (n || '').trim(), role: r.join('|').trim() };
  });
}

// ---------- mẫu ----------
export const TT_LAYOUTS = [
  { id: 'band', name: 'Thanh đầu' },
  { id: 'bold', name: 'Nền màu' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'frame', name: 'Khung sang' },
  { id: 'photo', name: 'Ảnh lớn' },
];
export interface TTSpec { kind: TTKind; size: string; layout: string; palette: string; font: string; faces: [TTUse, TTUse, TTUse] }
export interface TTTemplate { id: string; name: string; spec: Pick<TTSpec, 'layout' | 'palette' | 'font' | 'faces'>; size?: string; sample?: Record<string, string> }
export const TT_TEMPLATES: TTTemplate[] = [
  { id: 'mon-moi', name: 'Món mới · ảnh', spec: { layout: 'photo', palette: 'clay', font: 'playfair', faces: ['combo', 'wifi', 'review'] } },
  { id: 'happy-hour', name: 'Happy hour', spec: { layout: 'bold', palette: 'orange', font: 'oswald', faces: ['happy', 'combo', 'wifi'] } },
  { id: 'wifi-qr', name: 'Wifi + QR', spec: { layout: 'minimal', palette: 'navy', font: 'montserrat', faces: ['wifi', 'review', 'combo'] } },
  { id: 'dat-cho', name: 'Bàn đặt trước', spec: { layout: 'frame', palette: 'dark', font: 'playfair', faces: ['reserved', 'reserved', 'reserved'] } },
  { id: 'danh-gia', name: 'Đánh giá Google', spec: { layout: 'band', palette: 'teal', font: 'bvp', faces: ['review', 'wifi', 'combo'] } },
  { id: 'room-service', name: 'Room service khách sạn', spec: { layout: 'frame', palette: 'navy', font: 'playfair', faces: ['room', 'wifi', 'review'] },
    sample: { brand: 'AN KHANG HOTEL', footer: 'Lễ tân: số 0 · ankhanghotel.vn' } },
  { id: 'bang-ten', name: 'Bảng tên hội nghị', size: '20x10', spec: { layout: 'band', palette: 'navy', font: 'montserrat', faces: ['name', 'name', 'name'] },
    sample: { brand: 'AN KHANG GROUP', footer: 'ankhang.vn' } },
  { id: 'bang-ten-toi-gian', name: 'Bảng tên tối giản', size: '20x10', spec: { layout: 'minimal', palette: 'indigo', font: 'bvp', faces: ['name', 'name', 'name'] },
    sample: { brand: 'AN KHANG GROUP', footer: 'ankhang.vn' } },
  { id: 'combo-tra-sua', name: 'Combo trà sữa', spec: { layout: 'bold', palette: 'rose', font: 'baloo', faces: ['combo', 'happy', 'wifi'] },
    sample: { brand: 'THU HÀ TEA', comboKicker: 'COMBO ĐÔI', comboName: '2 trà sữa trân châu + 1 bánh', comboPrice: '79.000đ', comboOld: '98.000đ', comboDesc: 'Size L, chọn vị tuỳ thích — chỉ tại quán' } },
  { id: 'so-ban', name: 'Số bàn + gọi món', spec: { layout: 'bold', palette: 'forest', font: 'oswald', faces: ['table', 'table', 'wifi'] } },
  { id: 'menu-mini', name: 'Menu mini nhà hàng', spec: { layout: 'band', palette: 'red', font: 'bvp', faces: ['room', 'review', 'wifi'] },
    sample: { brand: 'BẾP NHÀ QUỐC BẢO', roomTitle: 'MÓN ĐẶC BIỆT HÔM NAY', roomHotline: 'Gọi phục vụ: bấm chuông trên bàn', footer: '0909 123 456 · bepnhaquocbao.vn' } },
  { id: 'khuyen-mai', name: 'Khuyến mãi · ảnh', spec: { layout: 'photo', palette: 'red', font: 'montserrat', faces: ['happy', 'combo', 'review'] } },
];

// ---------- đo & đặt chữ ----------
interface TS { fam: string; wt: number; ls?: number }
function wrap(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (!cur || textW(n, size, ts) <= maxW) cur = n; else { out.push(cur); cur = w; } }
    if (cur) out.push(cur);
  }
  return out;
}
interface Laid { lines: string[]; sizes: number[]; s: number; lh: number; h: number; ts: TS }
function layText(text: string, maxW: number, size: number, ts: TS, maxLines = 2, lh = 1.16): Laid | null {
  const t = (text || '').trim();
  if (!t) return null;
  const tsAt = (sz: number): TS => ({ ...ts, ls: ((ts.ls || 0) * sz) / size });
  let s = size, lines = wrap(t, maxW, s, tsAt(s));
  while (lines.length > maxLines && s > size * 0.5) { s *= 0.93; lines = wrap(t, maxW, s, tsAt(s)); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1 && !t.includes('\n')) {
    // cân dòng: không để 1 chữ mồ côi ở dòng cuối
    let lo = maxW * 0.4, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(t, mid, s, tsAt(s)).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrap(t, hi, s, tsAt(s));
  }
  const sizes = lines.map((l) => { const w = textW(l, s, tsAt(s)); return w > maxW && w > 0 ? (s * maxW) / w : s; });
  return { lines, sizes, s, lh, h: lines.length * s * lh, ts: tsAt(s) };
}
function TextLines({ L, cx, y, fill, anchor = 'middle', deco }: { L: Laid; cx: number; y: number; fill: string; anchor?: 'start' | 'middle' | 'end'; deco?: string }) {
  return (
    <g fontFamily={`"${L.ts.fam}"`} fontWeight={L.ts.wt} fill={fill} textAnchor={anchor} textDecoration={deco}>
      {L.lines.map((l, i) => (
        <text key={i} x={cx} y={y + L.s * (0.82 + (L.lh - 1) / 2) + i * L.s * L.lh} fontSize={L.sizes[i]} letterSpacing={((L.ts.ls || 0) * L.sizes[i]) / L.s || 0}>{l}</text>
      ))}
    </g>
  );
}

// ---------- icon vẽ code ----------
type IconKind = 'wifi' | 'star' | 'dish' | 'glass' | 'cloche' | 'cutlery' | 'mic';
function Icon({ k, cx, cy, s, c, c2 }: { k: IconKind; cx: number; cy: number; s: number; c: string; c2?: string }) {
  const sw = s * 0.075;
  if (k === 'wifi') return (
    <g transform={`translate(${cx} ${cy + s * 0.32})`} fill="none" stroke={c} strokeWidth={sw * 1.2} strokeLinecap="round">
      {[0.2, 0.42, 0.64].map((r) => <path key={r} d={`M${-s * r * 0.92} ${-s * r * 0.55} A${s * r} ${s * r} 0 0 1 ${s * r * 0.92} ${-s * r * 0.55}`} />)}
      <circle cx={0} cy={-s * 0.03} r={sw} fill={c} stroke="none" />
    </g>
  );
  if (k === 'star') {
    const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.21 : s * 0.5; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + s * 0.04 + Math.sin(a) * r).toFixed(1)}`; }).join(' ');
    return <polygon points={pts} fill={c} />;
  }
  if (k === 'dish') return ( // đĩa bánh flan
    <g>
      <ellipse cx={cx} cy={cy + s * 0.28} rx={s * 0.5} ry={s * 0.12} fill={c2 || c} opacity={0.9} />
      <path d={`M${cx - s * 0.3} ${cy + s * 0.24} L${cx - s * 0.22} ${cy - s * 0.12} Q${cx} ${cy - s * 0.2} ${cx + s * 0.22} ${cy - s * 0.12} L${cx + s * 0.3} ${cy + s * 0.24} Z`} fill={c} />
      <path d={`M${cx - s * 0.22} ${cy - s * 0.12} Q${cx} ${cy - s * 0.2} ${cx + s * 0.22} ${cy - s * 0.12} Q${cx + s * 0.18} ${cy - s * 0.02} ${cx + s * 0.1} ${cy - s * 0.04} Q${cx} ${cy + s * 0.04} ${cx - s * 0.12} ${cy - s * 0.04} Q${cx - s * 0.2} ${cy - s * 0.02} ${cx - s * 0.22} ${cy - s * 0.12} Z`} fill={c2 || c} opacity={0.75} />
    </g>
  );
  if (k === 'glass') return ( // ly cocktail
    <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${cx - s * 0.38} ${cy - s * 0.36} H${cx + s * 0.38} L${cx} ${cy + s * 0.06} Z`} fill={c2 || 'none'} />
      <path d={`M${cx} ${cy + s * 0.06} V${cy + s * 0.4} M${cx - s * 0.2} ${cy + s * 0.42} H${cx + s * 0.2}`} />
      <circle cx={cx + s * 0.28} cy={cy - s * 0.42} r={s * 0.09} fill={c} stroke="none" />
    </g>
  );
  if (k === 'cloche') return ( // nắp chuông room service
    <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
      <path d={`M${cx - s * 0.42} ${cy + s * 0.2} A${s * 0.42} ${s * 0.4} 0 0 1 ${cx + s * 0.42} ${cy + s * 0.2} Z`} fill={c2 || 'none'} />
      <path d={`M${cx - s * 0.5} ${cy + s * 0.28} H${cx + s * 0.5}`} />
      <circle cx={cx} cy={cy - s * 0.26} r={s * 0.06} fill={c} />
    </g>
  );
  if (k === 'mic') return (
    <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
      <rect x={cx - s * 0.14} y={cy - s * 0.44} width={s * 0.28} height={s * 0.5} rx={s * 0.14} fill={c2 || 'none'} />
      <path d={`M${cx - s * 0.28} ${cy - s * 0.04} Q${cx - s * 0.28} ${cy + s * 0.22} ${cx} ${cy + s * 0.22} Q${cx + s * 0.28} ${cy + s * 0.22} ${cx + s * 0.28} ${cy - s * 0.04} M${cx} ${cy + s * 0.22} V${cy + s * 0.42} M${cx - s * 0.16} ${cy + s * 0.44} H${cx + s * 0.16}`} />
    </g>
  );
  return ( // dao nĩa
    <g fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${cx - s * 0.22} ${cy - s * 0.44} V${cy - s * 0.12} Q${cx - s * 0.22} ${cy} ${cx - s * 0.12} ${cy} V${cy + s * 0.44} M${cx - s * 0.02} ${cy - s * 0.44} V${cy - s * 0.12} Q${cx - s * 0.02} ${cy} ${cx - s * 0.12} ${cy} M${cx - s * 0.12} ${cy - s * 0.44} V${cy - s * 0.1}`} />
      <path d={`M${cx + s * 0.2} ${cy + s * 0.44} V${cy - s * 0.44} Q${cx + s * 0.38} ${cy - s * 0.3} ${cx + s * 0.34} ${cy + s * 0.02} H${cx + s * 0.2}`} />
    </g>
  );
}

// ---------- khối nội dung (xếp dọc, tự co cho vừa ô) ----------
type El =
  | { t: 'text'; s: string; size: number; ts: TS; color: string; maxLines?: number; upper?: boolean; lh?: number }
  | { t: 'chip'; s: string; size: number; ts: TS; bg: string; color: string }
  | { t: 'qr'; text: string; size: number }
  | { t: 'gap'; h: number }
  | { t: 'icon'; k: IconKind; size: number; color: string; c2?: string }
  | { t: 'stars'; size: number; color: string }
  | { t: 'price'; price: string; old: string; size: number; ts: TS; color: string; oldColor: string }
  | { t: 'list'; rows: [string, string][]; size: number; color: string; sub: string; price: string }
  | { t: 'rule'; w: number; color: string };

interface Meas { h: number; node: (cx: number, y: number) => ReactNode }
function measure(el: El, k: number, maxW: number, key: number): Meas | null {
  if (el.t === 'gap') return { h: el.h * k, node: () => null };
  if (el.t === 'rule') return { h: 10 * k, node: (cx, y) => <rect key={key} x={cx - (el.w * k) / 2} y={y + 3 * k} width={el.w * k} height={4 * k} rx={2 * k} fill={el.color} /> };
  if (el.t === 'text') {
    const L = layText(el.upper ? el.s.toUpperCase() : el.s, maxW, el.size * k, el.ts, el.maxLines ?? 2, el.lh);
    if (!L) return null;
    return { h: L.h, node: (cx, y) => <TextLines key={key} L={L} cx={cx} y={y} fill={el.color} /> };
  }
  if (el.t === 'chip') {
    const txt = (el.s || '').toUpperCase().trim();
    if (!txt) return null;
    let s = el.size * k; const padX = s * 0.9;
    const ts = { ...el.ts, ls: s * 0.08 };
    let w = textW(txt, s, ts) + padX * 2;
    if (w > maxW) { s *= maxW / w; w = maxW; }
    const h = s * 1.9;
    return { h, node: (cx, y) => (
      <g key={key}>
        <rect x={cx - w / 2} y={y} width={w} height={h} rx={h / 2} fill={el.bg} />
        <text x={cx} y={y + h * 0.5 + s * 0.36} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={s} letterSpacing={s * 0.08} fill={el.color}>{txt}</text>
      </g>
    ) };
  }
  if (el.t === 'qr') {
    const size = Math.min(el.size * k, maxW);
    const { d, n } = qrPath(el.text || 'https://');
    const q = 3; const cell = size / (n + q * 2);
    return { h: size, node: (cx, y) => (
      <g key={key} data-qr={el.text}>
        <rect x={cx - size / 2} y={y} width={size} height={size} rx={size * 0.06} fill="#FFFFFF" />
        <path d={d} fill="#111111" transform={`translate(${cx - size / 2 + cell * q} ${y + cell * q}) scale(${cell})`} shapeRendering="crispEdges" />
      </g>
    ) };
  }
  if (el.t === 'icon') {
    const s = el.size * k;
    return { h: s, node: (cx, y) => <g key={key}><Icon k={el.k} cx={cx} cy={y + s / 2} s={s} c={el.color} c2={el.c2} /></g> };
  }
  if (el.t === 'stars') {
    const s = Math.min(el.size * k, maxW / 5.6);
    return { h: s, node: (cx, y) => <g key={key}>{[0, 1, 2, 3, 4].map((i) => <Icon key={i} k="star" cx={cx + (i - 2) * s * 1.12} cy={y + s / 2} s={s} c={el.color} />)}</g> };
  }
  if (el.t === 'price') {
    if (!el.price.trim()) return null;
    let s = el.size * k; const os = s * 0.42;
    const gap = s * 0.3;
    const pw = () => textW(el.price, s, el.ts), ow = () => (el.old.trim() ? textW(el.old, os, { fam: BODY, wt: 600 }) + gap : 0);
    let w = pw() + ow();
    if (w > maxW) { s *= maxW / w; w = maxW; }
    const os2 = s * 0.42, ow2 = el.old.trim() ? textW(el.old, os2, { fam: BODY, wt: 600 }) : 0;
    const total = textW(el.price, s, el.ts) + (ow2 ? ow2 + gap : 0);
    const h = s * 1.12;
    return { h, node: (cx, y) => {
      const x0 = cx - total / 2, base = y + s * 0.88;
      return (
        <g key={key}>
          <text x={x0} y={base} fontFamily={`"${el.ts.fam}"`} fontWeight={el.ts.wt} fontSize={s} fill={el.color}>{el.price}</text>
          {ow2 > 0 && (
            <g>
              <text x={x0 + total - ow2} y={base} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={os2} fill={el.oldColor}>{el.old}</text>
              <rect x={x0 + total - ow2 - os2 * 0.05} y={base - os2 * 0.36} width={ow2 + os2 * 0.1} height={os2 * 0.09} fill={el.oldColor} />
            </g>
          )}
        </g>
      );
    } };
  }
  // list (menu mini)
  const rows = el.rows.slice(0, 8);
  if (!rows.length) return null;
  const s = el.size * k, rh = s * 1.62;
  const ts: TS = { fam: BODY, wt: 600 };
  return { h: rows.length * rh, node: (cx, y) => (
    <g key={key}>
      {rows.map(([name, price], i) => {
        const pw = price ? textW(price, s, { fam: BODY, wt: 800 }) : 0;
        const avail = maxW - pw - s * 1.2;
        const nw = textW(name, s, ts);
        const ns = nw > avail && nw > 0 ? (s * avail) / nw : s;
        const nw2 = textW(name, ns, ts);
        const base = y + i * rh + rh * 0.66;
        const x0 = cx - maxW / 2, x1 = cx + maxW / 2;
        return (
          <g key={i}>
            <text x={x0} y={base} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={ns} fill={el.color}>{name}</text>
            {price && <line x1={x0 + nw2 + s * 0.35} y1={base - s * 0.08} x2={x1 - pw - s * 0.35} y2={base - s * 0.08} stroke={el.sub} strokeWidth={s * 0.07} strokeDasharray={`${s * 0.07} ${s * 0.22}`} strokeLinecap="round" opacity={0.7} />}
            {price && <text x={x1} y={base} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={s} fill={el.price}>{price}</text>}
          </g>
        );
      })}
    </g>
  ) };
}
function Stack({ els, box, keyBase = 0 }: { els: El[]; box: { x: number; y: number; w: number; h: number }; keyBase?: number }) {
  // bắt đầu to (lấp đầy mặt thẻ), co dần tới khi vừa 94% chiều cao ô
  let k = 1.7, ms: (Meas | null)[] = [];
  for (let i = 0; i < 40; i++) {
    ms = els.map((e, j) => measure(e, k, box.w, keyBase + j));
    const tot = ms.reduce((a, m) => a + (m?.h || 0), 0);
    if (tot <= box.h * 0.94 || k < 0.4) break;
    k *= 0.96;
  }
  const tot = ms.reduce((a, m) => a + (m?.h || 0), 0);
  let y = box.y + Math.max(0, (box.h - tot) / 2);
  const cx = box.x + box.w / 2;
  return <g>{ms.map((m) => { if (!m) return null; const n = m.node(cx, y); y += m.h; return n; })}</g>;
}

// ---------- màu theo bố cục ----------
interface Cols { bg: string; ink: string; sub: string; accent: string; chipBg: string; chipInk: string; line: string; star: string }
function colsOf(layout: string, p: FLPalette): Cols {
  if (layout === 'bold') return { bg: p.accent, ink: p.onAccent, sub: p.onAccent, accent: p.accent2, chipBg: p.accent2, chipInk: p.on2, line: p.onAccent, star: p.accent2 };
  if (layout === 'frame') {
    const light = p.id === 'dark' ? '#F4F2EC' : '#FFFFFF';
    return { bg: p.deep, ink: light, sub: '#D9D5CC', accent: p.accent2, chipBg: p.accent2, chipInk: p.deep, line: p.accent2, star: p.accent2 };
  }
  return { bg: p.paper, ink: p.ink, sub: p.sub, accent: p.accent, chipBg: p.accent2, chipInk: p.on2, line: p.accent, star: '#F2A900' };
}

// ---------- nội dung 1 mặt theo công dụng ----------
function useEls(use: TTUse, d: TTData, c: Cols, disp: TS, base: number, person: TTPerson | null, landscape: boolean): El[] {
  const body: TS = { fam: BODY, wt: 600 }, bodyB: TS = { fam: BODY, wt: 800 };
  const B = base;
  if (use === 'combo') return [
    { t: 'chip', s: d.comboKicker || '', size: B * 0.036, ts: bodyB, bg: c.chipBg, color: c.chipInk },
    { t: 'gap', h: B * 0.04 },
    { t: 'text', s: d.comboName || '', size: B * 0.105, ts: disp, color: c.ink, maxLines: 3, lh: 1.1 },
    { t: 'gap', h: B * 0.03 },
    { t: 'text', s: d.comboDesc || '', size: B * 0.042, ts: body, color: c.sub, maxLines: 3, lh: 1.3 },
    { t: 'gap', h: B * 0.05 },
    { t: 'price', price: d.comboPrice || '', old: d.comboOld || '', size: B * 0.1, ts: disp, color: c.accent, oldColor: c.sub },
  ];
  if (use === 'happy') return [
    { t: 'icon', k: 'glass', size: B * (landscape ? 0.12 : 0.16), color: c.accent, c2: c.chipBg },
    { t: 'gap', h: B * 0.03 },
    { t: 'text', s: d.hhTitle || '', size: B * 0.13, ts: disp, color: c.ink, maxLines: 2, upper: true, lh: 1.04 },
    { t: 'gap', h: B * 0.02 },
    { t: 'text', s: d.hhTime || '', size: B * 0.046, ts: bodyB, color: c.sub, maxLines: 2 },
    { t: 'gap', h: B * 0.05 },
    { t: 'chip', s: d.hhDeal || '', size: B * 0.062, ts: { ...disp }, bg: c.chipBg, color: c.chipInk },
    { t: 'gap', h: B * 0.035 },
    { t: 'text', s: d.hhNote || '', size: B * 0.036, ts: body, color: c.sub, maxLines: 2 },
  ];
  if (use === 'wifi') return [
    { t: 'icon', k: 'wifi', size: B * (landscape ? 0.1 : 0.13), color: c.accent },
    { t: 'text', s: 'WIFI MIỄN PHÍ', size: B * 0.04, ts: { ...bodyB, ls: B * 0.004 }, color: c.sub, maxLines: 1 },
    { t: 'gap', h: B * 0.025 },
    { t: 'text', s: d.wifiName || '', size: B * 0.068, ts: disp, color: c.ink, maxLines: 1 },
    { t: 'text', s: d.wifiPass ? `Mật khẩu: ${d.wifiPass}` : 'Không cần mật khẩu', size: B * 0.05, ts: bodyB, color: c.accent, maxLines: 1 },
    { t: 'gap', h: B * 0.04 },
    { t: 'qr', text: wifiPayload(d.wifiName || '', d.wifiPass || ''), size: B * (landscape ? 0.36 : 0.42) },
    { t: 'gap', h: B * 0.025 },
    { t: 'text', s: 'Quét mã để kết nối ngay', size: B * 0.036, ts: body, color: c.sub, maxLines: 1 },
  ];
  if (use === 'reserved') return [
    { t: 'text', s: 'BÀN SỐ', size: B * 0.045, ts: { ...bodyB, ls: B * 0.006 }, color: c.sub, maxLines: 1 },
    { t: 'gap', h: B * 0.02 },
    { t: 'text', s: d.tableNo || '', size: B * (landscape ? 0.26 : 0.3), ts: disp, color: c.accent, maxLines: 1, lh: 1.2 },
    { t: 'rule', w: B * 0.18, color: c.line },
    { t: 'gap', h: B * 0.03 },
    { t: 'text', s: d.resLabel || '', size: B * 0.075, ts: disp, color: c.ink, maxLines: 2, upper: true },
    { t: 'gap', h: B * 0.02 },
    { t: 'text', s: d.resName || '', size: B * 0.048, ts: bodyB, color: c.ink, maxLines: 1 },
    { t: 'text', s: d.resTime || '', size: B * 0.042, ts: body, color: c.sub, maxLines: 1 },
  ];
  if (use === 'table') return [
    { t: 'text', s: 'BÀN', size: B * 0.05, ts: { ...bodyB, ls: B * 0.008 }, color: c.sub, maxLines: 1 },
    { t: 'gap', h: B * 0.02 },
    { t: 'text', s: d.tableNo || '', size: B * (landscape ? 0.2 : 0.24), ts: disp, color: c.accent, maxLines: 1, lh: 1.2 },
    { t: 'gap', h: B * 0.03 },
    { t: 'qr', text: (d.menuUrl || '').trim() || 'https://', size: B * (landscape ? 0.34 : 0.4) },
    { t: 'gap', h: B * 0.03 },
    { t: 'text', s: d.tableNote || '', size: B * 0.044, ts: bodyB, color: c.ink, maxLines: 2 },
  ];
  if (use === 'review') return [
    { t: 'stars', size: B * 0.075, color: c.star },
    { t: 'gap', h: B * 0.035 },
    { t: 'text', s: d.reviewText || '', size: B * 0.075, ts: disp, color: c.ink, maxLines: 3, lh: 1.12 },
    { t: 'gap', h: B * 0.04 },
    { t: 'qr', text: (d.reviewUrl || '').trim() || 'https://', size: B * (landscape ? 0.34 : 0.4) },
    { t: 'gap', h: B * 0.025 },
    { t: 'text', s: 'Quét mã · đánh giá trên Google Maps', size: B * 0.034, ts: body, color: c.sub, maxLines: 2 },
  ];
  if (use === 'room') {
    const rows = (d.roomItems || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => { const [a, ...b] = l.split('|'); return [(a || '').trim(), b.join('|').trim()] as [string, string]; });
    return [
      { t: 'icon', k: 'cloche', size: B * (landscape ? 0.08 : 0.11), color: c.accent, c2: 'none' },
      { t: 'gap', h: B * 0.015 },
      { t: 'text', s: d.roomTitle || '', size: B * 0.07, ts: disp, color: c.ink, maxLines: 2, upper: true },
      { t: 'rule', w: B * 0.16, color: c.line },
      { t: 'gap', h: B * 0.035 },
      { t: 'list', rows, size: B * 0.042, color: c.ink, sub: c.sub, price: c.accent },
      { t: 'gap', h: B * 0.035 },
      { t: 'text', s: d.roomHotline || '', size: B * 0.038, ts: bodyB, color: c.accent, maxLines: 2 },
    ];
  }
  // bảng tên
  const p = person || { name: 'Họ và tên đại biểu', role: 'Chức vụ · đơn vị' };
  return [
    { t: 'text', s: d.eventName || '', size: B * (landscape ? 0.075 : 0.045), ts: { ...bodyB, ls: B * 0.004 }, color: c.sub, maxLines: 2, upper: true },
    { t: 'gap', h: B * 0.05 },
    { t: 'text', s: p.name, size: B * (landscape ? 0.24 : 0.12), ts: disp, color: c.ink, maxLines: 2, lh: 1.08 },
    { t: 'gap', h: B * 0.035 },
    { t: 'text', s: p.role, size: B * (landscape ? 0.09 : 0.05), ts: body, color: c.accent, maxLines: 2 },
  ];
}

// ảnh minh hoạ vẽ code khi khách chưa tải ảnh (layout 'photo')
function ArtFill({ x, y, w, h, use, p, id }: { x: number; y: number; w: number; h: number; use: TTUse; p: FLPalette; id: string }) {
  const k: IconKind = use === 'combo' ? 'dish' : use === 'happy' ? 'glass' : use === 'wifi' ? 'wifi' : use === 'room' ? 'cloche' : use === 'name' ? 'mic' : use === 'review' ? 'star' : 'cutlery';
  const s = Math.min(w, h) * 0.56;
  const dots: ReactNode[] = [];
  const step = Math.min(w, h) / 9;
  for (let yy = y + step / 2, r = 0; yy < y + h; yy += step, r++) for (let xx = x + (r % 2 ? step / 2 : 0); xx < x + w + step; xx += step) dots.push(<circle key={`${xx}-${yy}`} cx={xx} cy={yy} r={step * 0.07} fill={p.accent2} opacity={0.35} />);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.accent} /><stop offset="1" stopColor={p.deep} /></linearGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id}-g)`} />
      {dots}
      <circle cx={x + w / 2} cy={y + h / 2} r={s * 0.62} fill={p.deep} opacity={0.35} />
      <Icon k={k} cx={x + w / 2} cy={y + h / 2} s={s} c={p.accent2} c2={'#FFFFFF'} />
    </g>
  );
}

// ---------- 1 MẶT (lưới 1000 × H) ----------
export interface FaceProps { spec: TTSpec; data: TTData; use: TTUse; person?: TTPerson | null; photo?: string; logo?: string; faceIdx?: number }
export const faceH = (spec: TTSpec) => { const s = ttSize(spec.size); return (1000 * s.hMm) / s.wMm; };

/** nội dung mặt (đơn vị lưới), nền tràn ra ngoài khung `bleedU` mỗi phía */
export function FaceArt({ spec, data, use, person = null, photo, logo, bleedU = 0, faceIdx = 0 }: FaceProps & { bleedU?: number }) {
  const H = faceH(spec), W = 1000, b = bleedU;
  const landscape = H < W;
  const p = flPalette(spec.palette);
  const f = ttFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight };
  const c = colsOf(spec.layout, p);
  const base = Math.min(1000, H * 1.25);
  const pad = base * 0.07;
  const rid = useId();
  const uid = `tt${faceIdx}${rid}`.replace(/[^a-z0-9]/gi, '');
  const brandTs: TS = { fam: BODY, wt: 800, ls: base * 0.005 };
  const brandL = layText((data.brand || '').toUpperCase(), W - pad * 2 - (logo ? base * 0.12 : 0), base * 0.042, brandTs, 1);
  const footL = layText(data.footer || '', W - pad * 2, base * 0.03, { fam: BODY, wt: 600 }, 1);
  const els = useEls(use, data, c, disp, base, person, landscape);
  const footY = H - pad * 0.55 - (footL ? footL.h : 0);
  const nodes: ReactNode[] = [];
  let box = { x: pad, y: pad, w: W - pad * 2, h: H - pad * 2 };

  nodes.push(<rect key="bg" x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={c.bg} />);
  const logoNode = (x: number, y: number, s: number) => logo ? <image key="logo" href={logo} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" /> : null;

  if (spec.layout === 'band') {
    const hb = base * 0.15;
    nodes.push(<rect key="band" x={-b} y={-b} width={W + b * 2} height={hb + b} fill={p.accent} />);
    nodes.push(<rect key="band2" x={-b} y={hb} width={W + b * 2} height={base * 0.012} fill={p.accent2} />);
    if (logo) nodes.push(logoNode(pad, hb * 0.18, hb * 0.64));
    if (brandL) nodes.push(<TextLines key="brand" L={brandL} cx={W / 2 + (logo ? base * 0.06 : 0)} y={(hb - brandL.h) / 2} fill={p.onAccent} />);
    if (footL) nodes.push(<TextLines key="foot" L={footL} cx={W / 2} y={footY} fill={c.sub} />);
    box = { x: pad, y: hb + pad * 0.8, w: W - pad * 2, h: footY - pad * 0.5 - (hb + pad * 0.8) };
  } else if (spec.layout === 'bold' || spec.layout === 'minimal') {
    if (spec.layout === 'minimal') nodes.push(<rect key="fr" x={pad * 0.45} y={pad * 0.45} width={W - pad * 0.9} height={H - pad * 0.9} rx={base * 0.02} fill="none" stroke={c.line} strokeWidth={base * 0.006} />);
    else {
      // vài chấm trang trí góc
      nodes.push(<circle key="d1" cx={W + base * 0.02} cy={-base * 0.02} r={base * 0.2} fill={p.deep} opacity={0.28} />);
      nodes.push(<circle key="d2" cx={-base * 0.04} cy={H + base * 0.03} r={base * 0.16} fill={p.accent2} opacity={0.22} />);
    }
    const ty = pad * 1.05;
    if (logo) nodes.push(logoNode(W / 2 - base * 0.05, ty, base * 0.1));
    const by = ty + (logo ? base * 0.12 : 0);
    if (brandL) nodes.push(<TextLines key="brand" L={brandL} cx={W / 2} y={by} fill={spec.layout === 'bold' ? c.ink : c.accent} />);
    if (footL) nodes.push(<TextLines key="foot" L={footL} cx={W / 2} y={footY - (spec.layout === 'minimal' ? pad * 0.25 : 0)} fill={c.sub} />);
    const top = by + (brandL ? brandL.h : 0) + pad * 0.6;
    box = { x: pad * 1.1, y: top, w: W - pad * 2.2, h: footY - pad * 0.6 - top };
  } else if (spec.layout === 'frame') {
    const i1 = pad * 0.42, i2 = pad * 0.62;
    nodes.push(<rect key="f1" x={i1} y={i1} width={W - i1 * 2} height={H - i1 * 2} fill="none" stroke={p.accent2} strokeWidth={base * 0.007} />);
    nodes.push(<rect key="f2" x={i2} y={i2} width={W - i2 * 2} height={H - i2 * 2} fill="none" stroke={p.accent2} strokeWidth={base * 0.0025} />);
    for (const [cx, cy] of [[i2, i2], [W - i2, i2], [i2, H - i2], [W - i2, H - i2]]) nodes.push(<rect key={`c${cx}${cy}`} x={cx - base * 0.012} y={cy - base * 0.012} width={base * 0.024} height={base * 0.024} transform={`rotate(45 ${cx} ${cy})`} fill={p.accent2} />);
    const ty = pad * 1.25;
    if (logo) nodes.push(logoNode(W / 2 - base * 0.05, ty, base * 0.1));
    const by = ty + (logo ? base * 0.12 : 0);
    if (brandL) nodes.push(<TextLines key="brand" L={brandL} cx={W / 2} y={by} fill={c.accent} />);
    if (footL) nodes.push(<TextLines key="foot" L={footL} cx={W / 2} y={footY - pad * 0.5} fill={c.sub} />);
    const top = by + (brandL ? brandL.h : 0) + pad * 0.5;
    box = { x: pad * 1.3, y: top, w: W - pad * 2.6, h: footY - pad * 0.95 - top };
  } else { // photo
    const pr = landscape ? { x: -b, y: -b, w: W * 0.42 + b, h: H + b * 2 } : { x: -b, y: -b, w: W + b * 2, h: H * 0.42 + b };
    const clipId = `${uid}-clip`;
    nodes.push(<clipPath key="cp" id={clipId}><rect x={pr.x} y={pr.y} width={pr.w} height={pr.h} /></clipPath>);
    nodes.push(
      <g key="ph" clipPath={`url(#${clipId})`}>
        {photo
          ? <image href={photo} x={pr.x} y={pr.y} width={pr.w} height={pr.h} preserveAspectRatio="xMidYMid slice" />
          : <ArtFill x={pr.x} y={pr.y} w={pr.w} h={pr.h} use={use} p={p} id={uid} />}
      </g>,
    );
    // nhãn thương hiệu đè góc ảnh
    const chipMax = W * (landscape ? 0.42 : 1) - pad * 1.2 - base * 0.06;
    const pbL = layText((data.brand || '').toUpperCase(), chipMax, base * 0.042, brandTs, 1);
    if (pbL) {
      const bw = textW(pbL.lines[0], pbL.sizes[0], pbL.ts) + base * 0.06;
      const bh = pbL.h + base * 0.03;
      nodes.push(<rect key="bchip" x={pad * 0.6} y={pad * 0.6} width={bw} height={bh} rx={bh / 2} fill={p.paper} opacity={0.92} />);
      nodes.push(<TextLines key="brand" L={pbL} cx={pad * 0.6 + bw / 2} y={pad * 0.6 + base * 0.015} fill={p.accent} />);
    }
    if (logo) nodes.push(logoNode(landscape ? W * 0.42 - pad * 0.6 - base * 0.1 : W - pad * 0.6 - base * 0.1, landscape ? H - pad * 0.6 - base * 0.1 : H * 0.42 - pad * 0.6 - base * 0.1, base * 0.1));
    nodes.push(<rect key="seam" x={landscape ? W * 0.42 : -b} y={landscape ? -b : H * 0.42} width={landscape ? base * 0.012 : W + b * 2} height={landscape ? H + b * 2 : base * 0.012} fill={p.accent2} />);
    if (footL) nodes.push(<TextLines key="foot" L={footL} cx={landscape ? W * 0.71 : W / 2} y={footY} fill={c.sub} />);
    box = landscape
      ? { x: W * 0.42 + pad * 0.8, y: pad * 0.8, w: W * 0.58 - pad * 1.6, h: footY - pad * 1.3 }
      : { x: pad, y: H * 0.42 + pad * 0.7, w: W - pad * 2, h: footY - pad * 0.5 - (H * 0.42 + pad * 0.7) };
  }
  nodes.push(<g key="content" data-box={`${box.x.toFixed(1)},${box.y.toFixed(1)},${box.w.toFixed(1)},${box.h.toFixed(1)}`}><Stack els={els} box={box} /></g>);
  return <g>{nodes}</g>;
}

/** 1 mặt hoàn chỉnh (xem trước / thẻ in kệ mica). bleedMm > 0 → viewBox nới ra lề xén */
export function FaceSvg(props: FaceProps & { bleedMm?: number; style?: CSSProperties }) {
  const { spec, bleedMm = 0, style } = props;
  const s = ttSize(spec.size);
  const u = 1000 / s.wMm, b = bleedMm * u, H = faceH(spec);
  return (
    <svg viewBox={`${-b} ${-b} ${1000 + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-face={props.faceIdx ?? 0}>
      <FaceArt {...props} bleedU={Math.max(b, TT_BLEED_MM * u)} />
    </svg>
  );
}

// ---------- KHUÔN BẾ (mm) ----------
export const TT_SHEET_MARGIN = 10;
export interface DieInfo { wMm: number; hMm: number; sheetW: number; sheetH: number; cut: string; folds: [number, number, number, number][]; base?: number; cap?: number }
export function dieInfo(spec: TTSpec): DieInfo {
  const s = ttSize(spec.size); const w = s.wMm, h = s.hMm, G = TT_GLUE_MM, M = TT_SHEET_MARGIN;
  if (spec.kind === 'tri') {
    const th = (w * Math.sqrt(3)) / 2;
    const cut = `M0 ${th} H${w} L${w * 1.5} 0 L${w * 2} ${th} H${w * 3} L${w * 3 + 10} ${th + 4} V${th + h - 4} L${w * 3} ${th + h} H${w * 2} L${w * 1.5} ${th * 2 + h} L${w} ${th + h} H0 Z`;
    const folds: DieInfo['folds'] = [[w, th, w, th + h], [w * 2, th, w * 2, th + h], [w * 3, th, w * 3, th + h], [w, th, w * 2, th], [w, th + h, w * 2, th + h]];
    const dw = w * 3 + 10, dh = h + th * 2;
    return { wMm: dw, hMm: dh, sheetW: dw + M * 2, sheetH: dh + M * 2 + 8, cut, folds, cap: th };
  }
  if (spec.kind === 'v') {
    const dw = w * 2 + 10, dh = h;
    return { wMm: dw, hMm: dh, sheetW: dw + M * 2, sheetH: dh + M * 2 + 8, cut: `M0 0 H${w} V${h} H0 Z M${w + 10} 0 H${w * 2 + 10} V${h} H${w + 10} Z`, folds: [] };
  }
  const D = Math.round(2 * h * Math.sin((TT_TILT_DEG * Math.PI) / 180));
  const total = h * 2 + D + G;
  const cut = `M0 0 H${w} V${h * 2 + D} L${w - 5} ${total} H5 L0 ${h * 2 + D} Z`;
  const folds: DieInfo['folds'] = [[0, h, w, h], [0, h * 2, w, h * 2], [0, h * 2 + D, w, h * 2 + D]];
  return { wMm: w, hMm: total, sheetW: w + M * 2, sheetH: total + M * 2 + 8, cut, folds, base: D };
}

/** 1 mặt đặt vào khuôn (mm): ô [x,y,w,h], nới lề xén chỉ ở cạnh NGOÀI (l,t,r,b mm); rot180 = in lộn ngược */
function Placed({ props, x, y, w, h, bl, rot }: { props: FaceProps; x: number; y: number; w: number; h: number; bl: [number, number, number, number]; rot?: boolean }) {
  const u = 1000 / w; const [l, t, r, bb] = bl; const H = faceH(props.spec);
  const inner = (
    <svg x={x - l} y={y - t} width={w + l + r} height={h + t + bb} viewBox={`${-l * u} ${-t * u} ${(w + l + r) * u} ${H + (t + bb) * u}`} preserveAspectRatio="none" overflow="hidden">
      <FaceArt {...props} bleedU={TT_BLEED_MM * u} />
    </svg>
  );
  return rot ? <g transform={`rotate(180 ${x + w / 2} ${y + h / 2})`}>{inner}</g> : inner;
}

export function DielineSvg({ spec, data, person = null, photo, logo, screen = false, style }: { spec: TTSpec; data: TTData; person?: TTPerson | null; photo?: string; logo?: string; screen?: boolean; style?: CSSProperties }) {
  const s = ttSize(spec.size); const w = s.wMm, h = s.hMm, B = TT_BLEED_MM;
  const info = dieInfo(spec); const M = TT_SHEET_MARGIN;
  const p = flPalette(spec.palette);
  const fp = (i: number): FaceProps => ({ spec, data, use: spec.faces[i], person, photo, logo, faceIdx: i });
  const plain = spec.layout === 'bold' ? p.accent : spec.layout === 'frame' ? p.deep : p.paper;
  const art: ReactNode[] = [];
  if (spec.kind === 'a') {
    const D = info.base!;
    // mặt sau (in lộn ngược) ở trên — gấp ở đỉnh — mặt trước — đế — tai dán
    art.push(<Placed key="f1" props={fp(1)} x={0} y={0} w={w} h={h} bl={[B, 0, B, B]} rot />);
    art.push(<Placed key="f0" props={fp(0)} x={0} y={h} w={w} h={h} bl={[B, 0, B, 0]} />);
    art.push(<rect key="base" x={-B} y={h * 2} width={w + B * 2} height={D + TT_GLUE_MM + B} fill={plain} />);
  } else if (spec.kind === 'tri') {
    const th = info.cap!;
    art.push(<Placed key="f0" props={fp(0)} x={0} y={th} w={w} h={h} bl={[B, B, 0, B]} />);
    art.push(<Placed key="f1" props={fp(1)} x={w} y={th} w={w} h={h} bl={[0, 0, 0, 0]} />);
    art.push(<Placed key="f2" props={fp(2)} x={w * 2} y={th} w={w} h={h} bl={[0, B, 0, B]} />);
    art.push(<polygon key="capT" points={`${w},${th} ${w * 1.5},0 ${w * 2},${th}`} fill={plain} stroke={plain} strokeWidth={B * 2} strokeLinejoin="round" />);
    art.push(<polygon key="capB" points={`${w},${th + h} ${w * 1.5},${th * 2 + h} ${w * 2},${th + h}`} fill={plain} stroke={plain} strokeWidth={B * 2} strokeLinejoin="round" />);
    art.push(<rect key="glue" x={w * 3} y={th - B} width={10 + B} height={h + B * 2} fill={plain} />);
  } else {
    art.push(<Placed key="f0" props={fp(0)} x={0} y={0} w={w} h={h} bl={[B, B, B, B]} />);
    art.push(<Placed key="f1" props={fp(1)} x={w + 10} y={0} w={w} h={h} bl={[B, B, B, B]} />);
  }
  const fs = 3.2;
  const note = spec.kind === 'a'
    ? 'Từ trên xuống: mặt sau (in ngược) · gấp đỉnh · mặt trước · gấp · đế · gấp · tai dán keo dưới mặt sau'
    : spec.kind === 'tri' ? 'Mặt 1 · mặt 2 · mặt 3 · tai dán — nắp tam giác trên/dưới gập kín 2 đầu'
      : 'Kệ mica chữ V: 2 thẻ rời, cắt theo khung — mỗi thẻ cài 1 mặt kệ';
  return (
    <svg viewBox={`0 0 ${info.sheetW} ${info.sheetH}`} width={`${info.sheetW}mm`} height={`${info.sheetH}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet={`${info.sheetW.toFixed(1)}x${info.sheetH.toFixed(1)}`}>
      <rect x={0} y={0} width={info.sheetW} height={info.sheetH} fill="#FFFFFF" />
      <g transform={`translate(${M} ${M})`}>
        <g id="In">{art}</g>
        <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.3}><path d={info.cut} /></g>
        <g id="Fold" fill="none" stroke="#00AEEF" strokeWidth={0.3} strokeDasharray="2.2 1.4">
          {info.folds.map(([x1, y1, x2, y2], i) => <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />)}
        </g>
        {screen && spec.kind === 'a' && (
          <g fontFamily={`"${BODY}"`} fontWeight={800} fontSize={3} fill="#64748B" textAnchor="start">
            <text x={w + 2} y={h / 2}>Sau</text>
            <text x={w + 2} y={h * 1.5}>Trước</text>
            <text x={w + 2} y={h * 2 + info.base! / 2 + 1}>Đế</text>
            <text x={w + 2} y={h * 2 + info.base! + TT_GLUE_MM / 2 + 1}>Dán</text>
          </g>
        )}
      </g>
      <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill="#334155">
        <line x1={M} y1={info.sheetH - 6.2} x2={M + 6} y2={info.sheetH - 6.2} stroke="#EC008C" strokeWidth={0.4} />
        <text x={M + 7.5} y={info.sheetH - 5.2}>Cắt</text>
        <line x1={M + 17} y1={info.sheetH - 6.2} x2={M + 23} y2={info.sheetH - 6.2} stroke="#00AEEF" strokeWidth={0.4} strokeDasharray="2.2 1.4" />
        <text x={M + 24.5} y={info.sheetH - 5.2}>Gấp</text>
        <text x={M} y={info.sheetH - 1.6} fontSize={2.4} fill="#64748B">{`${w}×${h}mm/mặt · lề xén ${B}mm · ${note}`.slice(0, Math.floor((info.sheetW - M * 2) / 1.25))}</text>
      </g>
    </svg>
  );
}
