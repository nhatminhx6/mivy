'use client';
// Kệ mica QR để bàn: thẻ in (A6 / 13×18 / A5) cắm vào kệ mica chữ L, chữ T hoặc kệ nghiêng đế gỗ.
// 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT, render code 100%, 0 AI. Mã QR mã hoá NGAY trên máy (encoder flyer-qr):
//  · Chuyển khoản: dựng chuẩn VietQR (EMVCo + CRC16) từ ngân hàng + số TK → app ngân hàng nào cũng quét được;
//    hoặc khách dán chuỗi mã từ app ngân hàng / tải ảnh QR của ngân hàng (chỉ trên máy, không gửi đi).
//  · Menu / gọi món, Wifi (WIFI:T:WPA;S:..;P:..;;), Đánh giá Google / fanpage. 1 thẻ có thể ghép 2 mã.
// Số bàn (tuỳ chọn): bàn từ..đến → mỗi bàn 1 thẻ trong file in. Lưới thiết kế rộng 1000, cao 1000·h/w; lề xén 2mm.

import type { CSSProperties, ReactNode } from 'react';
import { qrPath } from './flyer-qr';
import { FL_PALETTES, flPalette, textW, type FLPalette } from './flyer-engine';

export { FL_FONT_CSS as QS_FONT_CSS, useFLFonts as useQSFonts } from './flyer-engine';
export const QS_PALETTES = FL_PALETTES;

// ---------- khổ & kệ ----------
export interface QSSize { id: string; name: string; wMm: number; hMm: number }
export const QS_SIZES: QSSize[] = [
  { id: 'a6', name: 'A6 · 10×15cm', wMm: 100, hMm: 150 },
  { id: '13x18', name: '13×18cm', wMm: 130, hMm: 180 },
  { id: 'a5', name: 'A5 · 14.8×21cm', wMm: 148, hMm: 210 },
];
export const qsSize = (id: string) => QS_SIZES.find((s) => s.id === id) || QS_SIZES[0];
export const QS_BLEED_MM = 2;
export type StandKind = 'L' | 'T' | 'tilt';
export const QS_STANDS: { id: StandKind; name: string; note: string }[] = [
  { id: 'L', name: 'Mica chữ L', note: 'Kệ mica trong gấp chữ L, thẻ cài trong túi mica — phổ biến nhất' },
  { id: 'T', name: 'Mica chữ T (2 mặt)', note: 'Đế mica dày, khách 2 phía bàn đều quét được (in 2 thẻ/kệ)' },
  { id: 'tilt', name: 'Kệ nghiêng đế gỗ', note: 'Đế gỗ sồi xẻ rãnh, thẻ kẹp mica nghiêng 15° — sang, hợp quán cà phê' },
];

// ---------- font (chỉ font có TTF ở /public/fonts → file in outline được) ----------
export interface QSFont { id: string; name: string; family: string; weight: number }
export const QS_FONTS: QSFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const qsFont = (id: string) => QS_FONTS.find((f) => f.id === id) || QS_FONTS[0];
const BODY = 'Be Vietnam Pro';

// ---------- mục đích mã QR ----------
export type Purpose = 'bank' | 'menu' | 'wifi' | 'review';
export const QS_PURPOSES: { id: Purpose; name: string; label: string; invite: string }[] = [
  { id: 'bank', name: 'Chuyển khoản', label: 'CHUYỂN KHOẢN', invite: 'Quét mã để thanh toán' },
  { id: 'menu', name: 'Menu · gọi món', label: 'MENU', invite: 'Quét mã để gọi món' },
  { id: 'wifi', name: 'Wifi', label: 'WIFI', invite: 'Quét mã để kết nối wifi' },
  { id: 'review', name: 'Đánh giá · fanpage', label: 'ĐÁNH GIÁ', invite: 'Quét mã để đánh giá quán' },
];
export const purposeOf = (id: Purpose) => QS_PURPOSES.find((p) => p.id === id)!;

// ngân hàng → mã BIN (NAPAS) cho VietQR
export const QS_BANKS: { bin: string; name: string; short: string }[] = [
  { bin: '970436', name: 'Vietcombank', short: 'VCB' },
  { bin: '970415', name: 'VietinBank', short: 'CTG' },
  { bin: '970418', name: 'BIDV', short: 'BIDV' },
  { bin: '970405', name: 'Agribank', short: 'AGR' },
  { bin: '970407', name: 'Techcombank', short: 'TCB' },
  { bin: '970422', name: 'MB Bank', short: 'MB' },
  { bin: '970416', name: 'ACB', short: 'ACB' },
  { bin: '970432', name: 'VPBank', short: 'VPB' },
  { bin: '970423', name: 'TPBank', short: 'TPB' },
  { bin: '970403', name: 'Sacombank', short: 'STB' },
  { bin: '970441', name: 'VIB', short: 'VIB' },
  { bin: '970443', name: 'SHB', short: 'SHB' },
  { bin: '970437', name: 'HDBank', short: 'HDB' },
  { bin: '970448', name: 'OCB', short: 'OCB' },
  { bin: '970426', name: 'MSB', short: 'MSB' },
  { bin: '970440', name: 'SeABank', short: 'SEAB' },
  { bin: '970431', name: 'Eximbank', short: 'EIB' },
  { bin: '970449', name: 'LPBank', short: 'LPB' },
  { bin: '970428', name: 'Nam A Bank', short: 'NAB' },
  { bin: '970454', name: 'Bản Việt (BVBank)', short: 'BVB' },
  { bin: '970412', name: 'PVcomBank', short: 'PVCB' },
  { bin: '970409', name: 'Bac A Bank', short: 'BAB' },
  { bin: '970452', name: 'Kienlongbank', short: 'KLB' },
  { bin: '546034', name: 'Cake by VPBank', short: 'CAKE' },
];
export const bankOf = (bin: string) => QS_BANKS.find((b) => b.bin === bin) || QS_BANKS[0];

// ---------- VietQR (EMVCo merchant-presented, tĩnh) ----------
const tlv = (id: string, v: string) => `${id}${String(v.length).padStart(2, '0')}${v}`;
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}
export const noAccent = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
export function vietQR(bin: string, acc: string, note = ''): string {
  const a = (acc || '').replace(/\D/g, '').slice(0, 19) || '0';
  const consumer = tlv('00', bin) + tlv('01', a);
  const merchant = tlv('00', 'A000000727') + tlv('01', consumer) + tlv('02', 'QRIBFTTA');
  const msg = noAccent(note).replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 25);
  const body = tlv('00', '01') + tlv('01', '11') + tlv('38', merchant) + tlv('53', '704') + tlv('58', 'VN') + (msg ? tlv('62', tlv('08', msg)) : '') + '6304';
  return body + crc16(body);
}
const wifiEsc = (s: string) => (s || '').replace(/([\\;,:"])/g, '\\$1');
export const wifiPayload = (ssid: string, pass: string) => (pass ? `WIFI:T:WPA;S:${wifiEsc(ssid)};P:${wifiEsc(pass)};;` : `WIFI:T:nopass;S:${wifiEsc(ssid)};;`);

// ---------- dữ liệu ----------
export type QSData = Record<string, string>;
export interface QSField { key: string; label: string; ph?: string; half?: boolean; for?: Purpose; multiline?: boolean }
export const QS_FIELDS: QSField[] = [
  { key: 'brand', label: 'Tên quán / thương hiệu', ph: 'AN KHANG COFFEE', half: true },
  { key: 'invite', label: 'Lời mời (to nhất)', ph: 'Quét mã để thanh toán', half: true },
  { key: 'accNo', label: 'Số tài khoản', ph: '1023 4567 89', half: true, for: 'bank' },
  { key: 'accName', label: 'Chủ tài khoản', ph: 'NGUYEN THU HA', half: true, for: 'bank' },
  { key: 'bankNote', label: 'Nội dung chuyển khoản gợi ý (không dấu, tuỳ chọn)', ph: 'Thanh toan ban', for: 'bank' },
  { key: 'menuUrl', label: 'Link menu / gọi món', ph: 'https://ankhang.vn/menu', for: 'menu' },
  { key: 'menuNote', label: 'Dòng mô tả menu', ph: 'Xem menu · gọi món tại bàn', for: 'menu' },
  { key: 'wifiName', label: 'Tên wifi', ph: 'AnKhang_Coffee', half: true, for: 'wifi' },
  { key: 'wifiPass', label: 'Mật khẩu wifi', ph: 'cafengon2027', half: true, for: 'wifi' },
  { key: 'reviewUrl', label: 'Link đánh giá Google / fanpage', ph: 'https://g.page/r/…/review', for: 'review' },
  { key: 'reviewNote', label: 'Dòng mô tả đánh giá', ph: 'Đánh giá 5★ để nhận quà nhỏ', for: 'review' },
  { key: 'footer', label: 'Dòng cuối thẻ', ph: 'Cảm ơn quý khách · Hẹn gặp lại!' },
];
export const defaultQSData = (): QSData => ({
  brand: 'AN KHANG COFFEE', invite: 'Quét mã để thanh toán',
  bankBin: '970436', accNo: '1023456789', accName: 'NGUYEN THU HA', bankNote: '', bankPayload: '',
  menuUrl: 'https://ankhang.vn/menu', menuNote: 'Xem menu · gọi món tại bàn',
  wifiName: 'AnKhang_Coffee', wifiPass: 'cafengon2027',
  reviewUrl: 'https://g.page/r/ankhang-coffee/review', reviewNote: 'Đánh giá 5★ để nhận quà nhỏ',
  footer: 'Cảm ơn quý khách · Hẹn gặp lại!', tableFrom: '1', tableTo: '12',
});
export const tableList = (d: QSData, on: boolean): (number | null)[] => {
  if (!on) return [null];
  const a = Math.max(1, Math.min(99, parseInt(d.tableFrom, 10) || 1));
  const b = Math.max(a, Math.min(a + 59, Math.min(99, parseInt(d.tableTo, 10) || a)));
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
};

/** nội dung mã + chú thích cho 1 mục đích */
export interface QRItem { purpose: Purpose; text: string; title: string; big: string; small: string }
export function qrItem(p: Purpose, d: QSData): QRItem {
  if (p === 'bank') {
    const b = bankOf(d.bankBin);
    const acc = (d.accNo || '').replace(/\D/g, '');
    return { purpose: p, text: (d.bankPayload || '').trim() || vietQR(b.bin, acc, d.bankNote), title: b.name, big: acc.replace(/(\d{4})(?=\d)/g, '$1 '), small: (d.accName || '').toUpperCase() };
  }
  if (p === 'wifi') return { purpose: p, text: wifiPayload(d.wifiName, d.wifiPass), title: `Wifi: ${d.wifiName || ''}`, big: d.wifiPass ? `MK: ${d.wifiPass}` : 'Không mật khẩu', small: '' };
  if (p === 'menu') return { purpose: p, text: (d.menuUrl || '').trim() || 'https://', title: d.menuNote || 'Xem menu · gọi món', big: '', small: shortUrl(d.menuUrl) };
  return { purpose: p, text: (d.reviewUrl || '').trim() || 'https://', title: d.reviewNote || 'Đánh giá quán', big: '', small: shortUrl(d.reviewUrl) };
}
const shortUrl = (u: string) => (u || '').replace(/^https?:\/\//, '').replace(/\/$/, '').slice(0, 34);

// ---------- bố cục & mẫu ----------
export interface QSSpec { layout: string; palette: string; font: string; size: string; stand: StandKind; q1: Purpose; q2: Purpose | 'none'; table: boolean }
export const QS_LAYOUTS = [
  { id: 'band', name: 'Thanh đầu' },
  { id: 'bold', name: 'Nền màu' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'cafe', name: 'Quán cà phê' },
  { id: 'split', name: 'Số bàn lớn' },
  { id: 'pay', name: 'Thanh toán' },
];
export interface QSTemplate { id: string; name: string; spec: Pick<QSSpec, 'layout' | 'palette' | 'font'> }
const PICKS: [string, string, string][] = [
  ['pay', 'navy', 'montserrat'], ['band', 'red', 'montserrat'], ['bold', 'teal', 'bvp'], ['minimal', 'dark', 'playfair'],
  ['cafe', 'clay', 'playfair'], ['split', 'indigo', 'oswald'], ['pay', 'forest', 'bvp'], ['band', 'navy', 'bvp'],
  ['bold', 'orange', 'baloo'], ['minimal', 'rose', 'playfair'], ['cafe', 'forest', 'baloo'], ['split', 'purple', 'montserrat'],
];
export const QS_TEMPLATES: QSTemplate[] = PICKS.map(([layout, palette, font]) => ({
  id: `${layout}-${palette}`, name: `${QS_LAYOUTS.find((l) => l.id === layout)!.name} · ${flPalette(palette).name}`, spec: { layout, palette, font },
}));

// ---------- đo & đặt chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW && w > 0 ? (size * maxW) / w : size; };
function wrap(text: string, maxW: number, size: number, ts: TS): string[] {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  const out: string[] = []; let cur = '';
  for (const w of words) { const n = cur ? `${cur} ${w}` : w; if (!cur || textW(n, size, ts) <= maxW) cur = n; else { out.push(cur); cur = w; } }
  if (cur) out.push(cur);
  return out;
}
/** khối chữ ≤ maxLines dòng, co cỡ tới khi vừa; trả về node + chiều cao đã dùng */
function block(text: string, x: number, y: number, maxW: number, size: number, ts: TS, fill: string, o: { maxLines?: number; anchor?: 'start' | 'middle' | 'end'; lh?: number; upper?: boolean } = {}): { node: ReactNode; h: number } {
  const t = o.upper ? (text || '').toUpperCase() : text || '';
  if (!t.trim()) return { node: null, h: 0 };
  const maxLines = o.maxLines ?? 2, lh = o.lh ?? 1.12;
  // giãn chữ tỉ lệ theo cỡ chữ (co chữ thì giãn cũng co) → đo đúng bề rộng thật
  const tsAt = (sz: number): TS => ({ ...ts, ls: ((ts.ls || 0) * sz) / size });
  let s = size, lines = wrap(t, maxW, s, tsAt(s));
  while (lines.length > maxLines && s > size * 0.4) { s *= 0.93; lines = wrap(t, maxW, s, tsAt(s)); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1) {
    // cân dòng: bề rộng nhỏ nhất vẫn giữ nguyên số dòng → không còn 1 chữ mồ côi ở dòng cuối
    let lo = maxW * 0.4, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrap(t, mid, s, tsAt(s)).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrap(t, hi, s, tsAt(s));
  }
  const sizes = lines.map((l) => { const w = textW(l, s, tsAt(s)); return w > maxW && w > 0 ? (s * maxW) / w : s; });
  let yy = y;
  const node = (
    <g fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fill={fill} textAnchor={o.anchor || 'middle'}>
      {lines.map((l, i) => { yy += (i === 0 ? sizes[i] * 0.8 : sizes[i] * lh); return <text key={i} x={x} y={yy} fontSize={sizes[i]} letterSpacing={tsAt(sizes[i]).ls || 0}>{l}</text>; })}
    </g>
  );
  return { node, h: yy - y + sizes[sizes.length - 1] * 0.24 };
}

// ---------- icon vẽ code ----------
function Icon({ p, x, y, s, c }: { p: Purpose; x: number; y: number; s: number; c: string }) {
  const sw = s * 0.1;
  if (p === 'bank') return (
    <g transform={`translate(${x - s / 2} ${y - s / 2})`} fill="none" stroke={c} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">
      <path d={`M${s * 0.08} ${s * 0.36} L${s * 0.5} ${s * 0.1} L${s * 0.92} ${s * 0.36} Z`} />
      {[0.22, 0.41, 0.59, 0.78].map((k) => <line key={k} x1={s * k} y1={s * 0.44} x2={s * k} y2={s * 0.74} />)}
      <line x1={s * 0.06} y1={s * 0.86} x2={s * 0.94} y2={s * 0.86} />
    </g>
  );
  if (p === 'wifi') return (
    <g transform={`translate(${x} ${y + s * 0.3})`} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round">
      {[0.2, 0.42, 0.64].map((r) => <path key={r} d={`M${-s * r * 0.92} ${-s * r * 0.55} A${s * r} ${s * r} 0 0 1 ${s * r * 0.92} ${-s * r * 0.55}`} />)}
      <circle cx={0} cy={-s * 0.03} r={sw * 0.8} fill={c} stroke="none" />
    </g>
  );
  if (p === 'menu') return (
    <g transform={`translate(${x - s / 2} ${y - s / 2})`} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={`M${s * 0.28} ${s * 0.08} v${s * 0.3} q0 ${s * 0.12} ${s * 0.08} ${s * 0.12} v${s * 0.42}`} />
      <path d={`M${s * 0.2} ${s * 0.08} v${s * 0.26} M${s * 0.44} ${s * 0.08} v${s * 0.26} M${s * 0.2} ${s * 0.34} q${s * 0.12} ${s * 0.1} ${s * 0.24} 0`} />
      <path d={`M${s * 0.7} ${s * 0.92} V${s * 0.08} q${s * 0.16} ${s * 0.12} ${s * 0.14} ${s * 0.4} h${-s * 0.14}`} />
    </g>
  );
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.22 : s * 0.48; return `${x + Math.cos(a) * r},${y + s * 0.04 + Math.sin(a) * r}`; }).join(' ');
  return <polygon points={pts} fill={c} />;
}

// mã QR (hoặc ảnh QR ngân hàng khách tải lên) trên nền trắng có vùng yên tĩnh 4 ô
function QR({ item, x, y, size, img, frame }: { item: QRItem; x: number; y: number; size: number; img?: string; frame?: string }) {
  const { d, n } = qrPath(item.text);
  const q = 3.2; // vùng trắng quanh mã (đơn vị ô)
  const cell = size / (n + q * 2);
  const r = size * 0.06;
  const br = size * 0.16, bw = size * 0.022, o = size * 0.035;
  return (
    <g data-qr={img && item.purpose === 'bank' ? '' : item.text} data-qr-purpose={item.purpose}>
      <rect x={x} y={y} width={size} height={size} rx={r} fill="#FFFFFF" />
      {img && item.purpose === 'bank'
        ? <image href={img} x={x + size * 0.04} y={y + size * 0.04} width={size * 0.92} height={size * 0.92} preserveAspectRatio="xMidYMid meet" />
        : <path d={d} fill="#111111" transform={`translate(${x + cell * q} ${y + cell * q}) scale(${cell})`} shapeRendering="crispEdges" />}
      {frame && (
        <g fill="none" stroke={frame} strokeWidth={bw} strokeLinecap="round">
          <path d={`M${x - o} ${y - o + br} V${y - o} H${x - o + br}`} />
          <path d={`M${x + size + o - br} ${y - o} H${x + size + o} V${y - o + br}`} />
          <path d={`M${x - o} ${y + size + o - br} V${y + size + o} H${x - o + br}`} />
          <path d={`M${x + size + o - br} ${y + size + o} H${x + size + o} V${y + size + o - br}`} />
        </g>
      )}
    </g>
  );
}

// ---------- thẻ ----------
export function QrCardSvg({ spec, data, table = null, bleed = false, bankImg, style }: {
  spec: QSSpec; data: QSData; table?: number | null; bleed?: boolean; bankImg?: string; style?: CSSProperties;
}) {
  const sz = qsSize(spec.size);
  const W = 1000, H = Math.round((1000 * sz.hMm) / sz.wMm);
  const b = bleed ? (QS_BLEED_MM * W) / sz.wMm : 0;
  const p: FLPalette = flPalette(spec.palette);
  const f = qsFont(spec.font);
  const disp: TS = { fam: f.family, wt: f.weight };
  const bodyB: TS = { fam: BODY, wt: 800 };
  const body: TS = { fam: BODY, wt: 600 };
  const dark = p.id === 'dark';
  const items = [qrItem(spec.q1, data), ...(spec.q2 !== 'none' && spec.q2 !== spec.q1 ? [qrItem(spec.q2, data)] : [])];
  const tno = table != null ? String(table).padStart(2, '0') : '';
  const M = 70;
  const cx = W / 2;
  const full = (fill: string) => <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={fill} />;

  /** vùng mã: 1 mã (to + chú thích) hoặc 2 mã cạnh nhau; trả node */
  const qrArea = (x0: number, y0: number, w: number, h: number, ink: string, sub: string, frame?: string, panel?: string): ReactNode => {
    if (items.length === 1) {
      const it = items[0];
      const capH = it.purpose === 'bank' ? 236 : it.purpose === 'wifi' ? 150 : 128;
      const qs = Math.max(240, Math.min(w * 0.74, h - capH - 34));
      const qx = x0 + (w - qs) / 2, qy = y0 + 8 + Math.max(0, (h - (qs + capH + 34)) * 0.42); // dư chỗ → canh giữa theo chiều cao
      let cy = qy + qs + 46;
      const parts: ReactNode[] = [];
      const t1 = block(it.title, x0 + w / 2, cy, w * 0.94, it.purpose === 'bank' ? 44 : 46, bodyB, ink, { maxLines: 1 });
      parts.push(<g key="t">{t1.node}</g>); cy += t1.h + 10;
      if (it.big) { const t2 = block(it.big, x0 + w / 2, cy, w * 0.94, it.purpose === 'bank' ? 70 : 56, { ...disp, ls: it.purpose === 'bank' ? 2 : 0 }, ink, { maxLines: 1 }); parts.push(<g key="b">{t2.node}</g>); cy += t2.h + 10; }
      if (it.small) { const t3 = block(it.small, x0 + w / 2, cy, w * 0.94, 36, body, sub, { maxLines: 1 }); parts.push(<g key="s">{t3.node}</g>); }
      return (
        <g>
          {panel && <rect x={qx - 26} y={qy - 26} width={qs + 52} height={qs + 52} rx={40} fill={panel} />}
          <QR item={it} x={qx} y={qy} size={qs} img={bankImg} frame={frame} />
          {parts}
        </g>
      );
    }
    const gap = 40, cw = (w - gap) / 2;
    return (
      <g>
        {items.map((it, i) => {
          const x = x0 + i * (cw + gap);
          const qs = Math.max(200, Math.min(cw * 0.94, h - 210));
          const dy = Math.max(0, (h - (qs + 190)) * 0.42); // dư chỗ → canh giữa theo chiều cao
          const qx = x + (cw - qs) / 2, qy = y0 + 70 + dy;
          const lab = purposeOf(it.purpose).label;
          const pillW = Math.min(cw, textW(lab, 30, bodyB) + 110);
          const cap = it.purpose === 'bank' ? it.big : it.purpose === 'wifi' ? (it.big || '') : it.title;
          const cap2 = it.purpose === 'bank' ? it.title : it.purpose === 'wifi' ? (data.wifiName || '') : '';
          const c1 = block(cap, x + cw / 2, qy + qs + 30, cw * 0.98, 34, it.purpose === 'bank' ? { ...disp, ls: 1 } : bodyB, ink, { maxLines: 1 });
          const c2 = block(cap2, x + cw / 2, qy + qs + 34 + c1.h, cw * 0.98, 28, body, sub, { maxLines: 1 });
          return (
            <g key={i}>
              <rect x={x + (cw - pillW) / 2} y={y0 + dy} width={pillW} height={50} rx={25} fill={p.accent} />
              <Icon p={it.purpose} x={x + (cw - pillW) / 2 + 40} y={y0 + dy + 25} s={30} c={p.onAccent} />
              <text x={x + (cw - pillW) / 2 + 66} y={y0 + dy + 36} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fitSize(lab, pillW - 90, 30, bodyB)} fill={p.onAccent}>{lab}</text>
              {panel && <rect x={qx - 16} y={qy - 16} width={qs + 32} height={qs + 32} rx={28} fill={panel} />}
              <QR item={it} x={qx} y={qy} size={qs} img={bankImg} frame={frame} />
              {c1.node}{c2.node}
            </g>
          );
        })}
      </g>
    );
  };

  const tablePill = (x: number, y: number, bg: string, fg: string, anchor: 'start' | 'end' = 'end') => {
    if (!tno) return null;
    const w = 190, h = 74, xx = anchor === 'end' ? x - w : x;
    return (
      <g>
        <rect x={xx} y={y} width={w} height={h} rx={h / 2} fill={bg} />
        <text x={xx + w / 2} y={y + 51} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={36} fill={fg} letterSpacing={1}>BÀN {tno}</text>
      </g>
    );
  };
  const footer = (y: number, fill: string) => block(data.footer || '', cx, y, W - M * 2, 32, body, fill, { maxLines: 1 }).node;

  let content: ReactNode;
  const L = spec.layout;
  if (L === 'band') {
    const bandH = 190;
    const inv = block(data.invite, cx, bandH + 50, W - M * 2, 74, disp, p.ink, { maxLines: 2 });
    const top = bandH + 70 + inv.h;
    content = (
      <>
        {full(p.paper)}
        <rect x={-b} y={-b} width={W + b * 2} height={bandH + b} fill={p.accent} />
        {block(data.brand, tno ? M : cx, 78, tno ? W - M * 2 - 220 : W - M * 2, 60, disp, p.onAccent, { maxLines: 1, anchor: tno ? 'start' : 'middle' }).node}
        <rect x={tno ? M : cx - 60} y={150} width={120} height={8} rx={4} fill={p.accent2} />
        {tablePill(W - M, 58, p.accent2, p.on2)}
        {inv.node}
        {qrArea(M, top, W - M * 2, H - top - 120, p.ink, p.sub, p.accent)}
        <rect x={-b} y={H - 84} width={W + b * 2} height={84 + b} fill={p.deep} />
        {footer(H - 62, p.onAccent)}
      </>
    );
  } else if (L === 'bold') {
    const inv = block(data.invite, cx, 70, W - M * 2, 92, disp, p.onAccent, { maxLines: 2, lh: 1.05 });
    const cardY = 110 + inv.h, cardH = H - cardY - 170;
    content = (
      <>
        {full(p.accent)}
        <circle cx={W + 40} cy={-40} r={260} fill={p.deep} opacity={0.5} />
        <circle cx={-60} cy={H + 30} r={220} fill={p.accent2} opacity={0.35} />
        {inv.node}
        <rect x={M - 10} y={cardY} width={W - (M - 10) * 2} height={cardH} rx={48} fill="#FFFFFF" />
        {qrArea(M + 20, cardY + 44, W - (M + 20) * 2, cardH - 70, '#16181D', '#5B6070')}
        {tablePill(M - 10, H - 140, p.accent2, p.on2, 'start')}
        {block(data.brand, tno ? W - M : cx, H - 120, tno ? W - M * 2 - 220 : W - M * 2, 52, disp, p.onAccent, { maxLines: 1, anchor: tno ? 'end' : 'middle' }).node}
        {!tno && footer(H - 48, p.onAccent)}
      </>
    );
  } else if (L === 'minimal') {
    const inv = block(data.invite, cx, 250, W - M * 2 - 40, 66, disp, p.ink, { maxLines: 2 });
    const top = 300 + inv.h;
    content = (
      <>
        {full(p.paper)}
        <rect x={36} y={36} width={W - 72} height={H - 72} rx={26} fill="none" stroke={p.accent} strokeWidth={4} />
        {block(data.brand, cx, 110, tno ? W - 2 * 240 : W - M * 2 - 60, 40, { ...bodyB, ls: 8 }, p.accent, { maxLines: 1, upper: true }).node}
        <line x1={cx - 50} y1={185} x2={cx + 50} y2={185} stroke={p.accent2} strokeWidth={5} strokeLinecap="round" />
        {tno && <text x={W - 90} y={132} textAnchor="end" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={64} fill={p.accent}>{tno}</text>}
        {tno && <text x={W - 90} y={74} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={22} fill={p.sub} letterSpacing={4}>BÀN</text>}
        {inv.node}
        {qrArea(M + 20, top, W - (M + 20) * 2, H - top - 130, p.ink, p.sub, dark ? p.accent : p.accent, dark ? undefined : undefined)}
        {footer(H - 80, p.sub)}
      </>
    );
  } else if (L === 'cafe') {
    const inv = block(data.invite, cx, 320, W - M * 2 - 120, 70, disp, p.ink, { maxLines: 2 });
    const top = 350 + inv.h;
    const bean = (x: number, y: number, r: number, a: number) => (
      <g transform={`translate(${x} ${y}) rotate(${a})`}>
        <ellipse rx={r} ry={r * 0.68} fill={p.deep} />
        <path d={`M${-r * 0.8} 0 Q0 ${-r * 0.3} ${r * 0.8} 0`} stroke={p.paper} strokeWidth={r * 0.14} fill="none" strokeLinecap="round" />
      </g>
    );
    content = (
      <>
        {full(p.paper)}
        <path d={`M${-b} ${-b} H${W + b} V205 Q${W * 0.75} 265 ${W / 2} 225 T${-b} 235 Z`} fill={p.accent} />
        {bean(110, 300, 26, -20)}{bean(890, 290, 24, 30)}{bean(150, H - 170, 20, 50)}{bean(860, H - 190, 22, -40)}
        {/* ly cà phê nét vẽ */}
        <g transform={`translate(${cx} 62)`} fill="none" stroke={p.onAccent} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round">
          <path d="M-34 0 L-26 52 Q0 62 26 52 L34 0 Z" />
          <path d="M34 12 q22 2 18 20 q-4 14 -22 12" />
          <path d="M-12 -14 q-8 -10 0 -20 M6 -14 q-8 -10 0 -20" opacity={0.8} />
        </g>
        {block(data.brand, cx, 150, W - M * 2, 44, { ...bodyB, ls: 3 }, p.onAccent, { maxLines: 1, upper: true }).node}
        {tablePill(W - M, 40, p.accent2, p.on2)}
        {inv.node}
        {qrArea(M + 10, top, W - (M + 10) * 2, H - top - 120, p.ink, p.sub, undefined, p.accent2)}
        {footer(H - 62, p.sub)}
      </>
    );
  } else if (L === 'split') {
    const topH = Math.round(H * 0.34);
    const inv = block(data.invite, cx, topH + 34, W - M * 2, 60, disp, p.ink, { maxLines: 1 });
    const top = topH + 64 + inv.h;
    content = (
      <>
        {full(p.paper)}
        <rect x={-b} y={-b} width={W + b * 2} height={topH + b} fill={p.accent} />
        <path d={`M${-b} ${topH} L${W + b} ${topH - 80} V${topH} Z`} fill={p.paper} />
        {block(data.brand, cx, 54, W - M * 2, 42, { ...bodyB, ls: 4 }, p.onAccent, { maxLines: 1, upper: true }).node}
        {tno ? (
          <>
            <text x={cx} y={topH - 60 - Math.min(230, topH * 0.48) * 0.78 - 26} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={34} letterSpacing={10} fill={p.accent2}>BÀN SỐ</text>
            <text x={cx} y={topH - 60} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={Math.min(230, topH * 0.48)} fill={p.onAccent}>{tno}</text>
          </>
        ) : (
          <>
            <Icon p={spec.q1} x={cx} y={topH * 0.52} s={150} c={p.onAccent} />
          </>
        )}
        {inv.node}
        {qrArea(M, top, W - M * 2, H - top - 110, p.ink, p.sub, p.accent)}
        {footer(H - 56, p.sub)}
      </>
    );
  } else { // pay
    const hdr = block(data.invite, cx, 170, W - M * 2, 78, disp, p.onAccent, { maxLines: 2, lh: 1.04 });
    const headH = 220 + hdr.h;
    content = (
      <>
        {full(p.paper)}
        <rect x={-b} y={-b} width={W + b * 2} height={headH + b} fill={p.accent} />
        {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={W - 60 - i * 34} cy={headH - 40} r={6} fill={p.accent2} opacity={0.9 - i * 0.13} />)}
        <Icon p={spec.q1} x={M + 34} y={92} s={64} c={p.accent2} />
        {block(data.brand, M + 90, 78, W - M * 2 - (tno ? 320 : 100), 46, bodyB, p.onAccent, { maxLines: 1, anchor: 'start' }).node}
        {tablePill(W - M, 54, p.accent2, p.on2)}
        {hdr.node}
        {qrArea(M, headH + 60, W - M * 2, H - headH - 160, p.ink, p.sub, p.accent)}
        <rect x={M} y={H - 98} width={W - M * 2} height={4} rx={2} fill={p.accent2} />
        {footer(H - 48, p.sub)}
      </>
    );
  }

  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-w={W} data-h={H}>
      {content}
    </svg>
  );
}
