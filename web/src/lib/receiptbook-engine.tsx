'use client';
// Hoá đơn bán lẻ · phiếu thu/chi · phiếu giao hàng · phiếu bảo hành — in LIÊN giấy carbonless, đóng cuốn, số nhảy.
// 1 engine SVG = LOẠI PHIẾU × BỐ CỤC × MÀU MỰC × FONT × KHỔ → render code 100%, tự co chữ/dòng bảng cho vừa khổ.
// Đơn vị: 10 = 1mm. In 1 màu mực + số nhảy đỏ (đúng cách xưởng in hoá đơn liên làm); màu giấy liên = giấy, KHÔNG in.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const U = 10; // đơn vị / mm

// ---------- khổ ----------
export interface RBSize { id: string; name: string; wMm: number; hMm: number; k: number }
export const RB_SIZES: RBSize[] = [
  { id: 'a5d', name: 'A5 dọc 148×210', wMm: 148, hMm: 210, k: 1 },
  { id: 'a5n', name: 'A5 ngang 210×148', wMm: 210, hMm: 148, k: 0.94 },
  { id: 'a6', name: 'A6 105×148', wMm: 105, hMm: 148, k: 0.8 },
  { id: 'a43', name: '1/3 A4 210×99', wMm: 210, hMm: 99, k: 0.84 },
];
export const rbSize = (id: string) => RB_SIZES.find((s) => s.id === id) || RB_SIZES[0];
export const RB_BLEED_MM = 2;

// ---------- loại phiếu ----------
export type RBType = 'invoice' | 'receipt' | 'payment' | 'delivery' | 'warranty';
export const RB_TYPES: { id: RBType; name: string; title: string; en: string }[] = [
  { id: 'invoice', name: 'Hoá đơn bán lẻ', title: 'HOÁ ĐƠN BÁN LẺ', en: 'SALES INVOICE' },
  { id: 'receipt', name: 'Phiếu thu', title: 'PHIẾU THU', en: 'RECEIPT VOUCHER' },
  { id: 'payment', name: 'Phiếu chi', title: 'PHIẾU CHI', en: 'PAYMENT VOUCHER' },
  { id: 'delivery', name: 'Phiếu giao hàng', title: 'PHIẾU GIAO HÀNG', en: 'DELIVERY NOTE' },
  { id: 'warranty', name: 'Phiếu bảo hành', title: 'PHIẾU BẢO HÀNH', en: 'WARRANTY CARD' },
];
export const rbType = (id: RBType) => RB_TYPES.find((t) => t.id === id) || RB_TYPES[0];

// ---------- liên (màu GIẤY, không in) ----------
export const RB_PAPER = ['#FFFFFF', '#FBDCE4', '#D8E7F8']; // trắng – hồng – xanh
export const RB_PAPER_NAME = ['trắng', 'hồng', 'xanh'];
const SECOND: Record<RBType, string> = {
  invoice: 'Giao khách hàng', receipt: 'Giao người nộp', payment: 'Giao người nhận', delivery: 'Giao người nhận', warranty: 'Giao khách hàng',
};
export function lienLabel(type: RBType, parts: number, i: number): string {
  if (parts <= 1) return '';
  if (i === 0) return 'Liên 1: Lưu';
  if (i === 1) return `Liên 2: ${SECOND[type]}`;
  return `Liên ${i + 1}: Nội bộ`;
}

// ---------- font (đều có TTF trong /public/fonts → outline được) ----------
export interface RBFont { id: string; name: string; family: string; weight: number }
export const RB_FONTS: RBFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const rbFont = (id: string) => RB_FONTS.find((f) => f.id === id) || RB_FONTS[0];
const BODY = 'Be Vietnam Pro'; // chữ phiếu: 600 (đúng TTF outline) — sạch, đủ dấu
const BW = 600;
const HAND = 'Dancing Script'; // chữ viết tay mẫu (chỉ cho ảnh 3D)

export const RB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useRBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-rb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-rb-fonts'; link.rel = 'stylesheet';
        link.href = RB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...RB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `${BW} 40px "${BODY}"`, `700 40px "${HAND}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu mực (in 1 màu) ----------
export interface RBPalette { id: string; name: string; ink: string; soft: string }
export const RB_PALETTES: RBPalette[] = [
  { id: 'navy', name: 'Xanh navy', ink: '#1F3A68', soft: '#E6ECF5' },
  { id: 'black', name: 'Đen', ink: '#1C1C1C', soft: '#ECECEC' },
  { id: 'red', name: 'Đỏ', ink: '#B42318', soft: '#F8E3E1' },
  { id: 'green', name: 'Xanh lá', ink: '#1E6B47', soft: '#E3F0E8' },
  { id: 'teal', name: 'Xanh ngọc', ink: '#0F6E6E', soft: '#E0F0EF' },
  { id: 'purple', name: 'Tím', ink: '#5B2C83', soft: '#EEE6F4' },
  { id: 'orange', name: 'Cam đất', ink: '#B4500C', soft: '#F7E9DD' },
];
export const rbPalette = (id: string) => RB_PALETTES.find((p) => p.id === id) || RB_PALETTES[0];
export const RB_NUMBER_RED = '#D42A2A'; // số nhảy: máy đóng số mực đỏ

// ---------- bố cục + mẫu ----------
export type RBLayout = 'simple' | 'band' | 'border' | 'logo' | 'bilingual';
export const RB_LAYOUTS: { id: RBLayout; name: string }[] = [
  { id: 'simple', name: 'Đơn giản' },
  { id: 'band', name: 'Dải màu' },
  { id: 'border', name: 'Viền khung' },
  { id: 'logo', name: 'Logo lớn' },
  { id: 'bilingual', name: 'Song ngữ' },
];
export interface RBSpec {
  layout: RBLayout; palette: string; font: string; size: string;
  parts: 1 | 2 | 3; rows: number; perBook: 50 | 100; books: number;
}
export interface RBTemplate { id: string; name: string; spec: Pick<RBSpec, 'layout' | 'palette' | 'font'> }
export const RB_TEMPLATES: RBTemplate[] = [
  { id: 'simple-black', name: 'Đơn giản · Đen', spec: { layout: 'simple', palette: 'black', font: 'bvp' } },
  { id: 'simple-navy', name: 'Đơn giản · Navy', spec: { layout: 'simple', palette: 'navy', font: 'montserrat' } },
  { id: 'band-navy', name: 'Dải màu · Navy', spec: { layout: 'band', palette: 'navy', font: 'bvp' } },
  { id: 'band-red', name: 'Dải màu · Đỏ', spec: { layout: 'band', palette: 'red', font: 'oswald' } },
  { id: 'border-green', name: 'Viền khung · Xanh lá', spec: { layout: 'border', palette: 'green', font: 'playfair' } },
  { id: 'border-purple', name: 'Viền khung · Tím', spec: { layout: 'border', palette: 'purple', font: 'bvp' } },
  { id: 'logo-navy', name: 'Logo lớn · Navy', spec: { layout: 'logo', palette: 'navy', font: 'montserrat' } },
  { id: 'logo-orange', name: 'Logo lớn · Cam đất', spec: { layout: 'logo', palette: 'orange', font: 'oswald' } },
  { id: 'bilingual-navy', name: 'Song ngữ · Navy', spec: { layout: 'bilingual', palette: 'navy', font: 'bvp' } },
  { id: 'bilingual-teal', name: 'Song ngữ · Xanh ngọc', spec: { layout: 'bilingual', palette: 'teal', font: 'montserrat' } },
];

// ---------- nội dung ----------
export type RBData = Record<string, string>;
export interface RBField { key: string; label: string; ph?: string; half?: boolean; multiline?: boolean; only?: RBType[] }
export const RB_FIELDS: RBField[] = [
  { key: 'shop', label: 'Tên cửa hàng / công ty', ph: 'CỬA HÀNG AN KHANG' },
  { key: 'slogan', label: 'Dòng giới thiệu (ngành hàng)', ph: 'Điện máy – Gia dụng chính hãng' },
  { key: 'address', label: 'Địa chỉ', ph: '128 Nguyễn Trãi, Q.1, TP.HCM' },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456', half: true },
  { key: 'mst', label: 'Mã số thuế (MST)', ph: '0312 345 678', half: true },
  { key: 'title', label: 'Tên phiếu (để trống = mặc định)', ph: '' },
  { key: 'terms', label: 'Điều kiện bảo hành (mỗi dòng 1 ý)', multiline: true, only: ['warranty'] },
  { key: 'footer', label: 'Dòng cuối phiếu', ph: 'Cảm ơn quý khách — Hẹn gặp lại!' },
];
export const defaultRBData = (): RBData => ({
  shop: 'CỬA HÀNG AN KHANG', slogan: 'Điện máy – Gia dụng chính hãng',
  address: '128 Nguyễn Trãi, P. Bến Thành, Q.1, TP.HCM', hotline: '0909 123 456', mst: '0312 345 678',
  title: '', footer: 'Cảm ơn quý khách — Hẹn gặp lại!',
  terms: 'Bảo hành miễn phí lỗi kỹ thuật do nhà sản xuất.\nKhông bảo hành khi sản phẩm rơi vỡ, vào nước, cháy nổ.\nVui lòng mang theo phiếu này khi đến bảo hành.',
  prefix: 'AK', start: '1', logo: '',
});

export const rbNumber = (data: RBData, i: number) => {
  const s = Math.max(0, parseInt((data.start || '1').replace(/\D/g, ''), 10) || 1);
  return `${(data.prefix || '').trim().toUpperCase()}${String(s + i).padStart(6, '0')}`;
};

// ---------- song ngữ ----------
const EN: Record<string, string> = {
  'Tên khách hàng': 'Customer', 'Địa chỉ': 'Address', 'Số điện thoại': 'Phone', 'Họ tên người nộp tiền': 'Payer',
  'Lý do nộp': 'Reason', 'Số tiền': 'Amount', 'Viết bằng chữ': 'In words', 'Kèm theo': 'Attached',
  'Họ tên người nhận tiền': 'Receiver', 'Lý do chi': 'Reason', 'Người nhận': 'Recipient', 'Địa chỉ giao hàng': 'Delivery address',
  'Thu hộ (COD)': 'COD', 'Khách hàng': 'Customer', 'Ngày mua': 'Purchase date', 'Sản phẩm': 'Product',
  'Số serial / IMEI': 'Serial', 'Thời hạn bảo hành': 'Period', 'Số tiền viết bằng chữ': 'Amount in words',
  STT: 'No.', 'Tên hàng': 'Description', 'ĐVT': 'Unit', SL: 'Qty', 'Đơn giá': 'Price', 'Thành tiền': 'Amount', 'Ghi chú': 'Note',
  'Tổng cộng': 'Total', 'Người mua hàng': 'Buyer', 'Người bán hàng': 'Seller', 'Người nộp tiền': 'Payer', 'Người lập phiếu': 'Prepared by',
  'Thủ quỹ': 'Cashier', 'Người nhận tiền': 'Receiver', 'Người nhận hàng': 'Receiver', 'Người giao hàng': 'Deliverer',
  'Đại diện cửa hàng': 'Store', 'Điều kiện bảo hành': 'Warranty terms',
};

// ---------- cấu trúc từng loại phiếu ----------
interface InfoField { label: string; half?: boolean; key: string }
interface Col { h: string; w: number; align?: 'start' | 'middle' | 'end' } // w: tỉ lệ (flex)
interface FormDef { info: InfoField[]; cols?: Col[]; total?: boolean; words?: boolean; sigs: string[]; terms?: boolean }
const FORMS: Record<RBType, FormDef> = {
  invoice: {
    info: [{ label: 'Tên khách hàng', key: 'cus' }, { label: 'Địa chỉ', key: 'addr' }, { label: 'Số điện thoại', key: 'phone', half: true }],
    cols: [{ h: 'STT', w: 0.07, align: 'middle' }, { h: 'Tên hàng', w: 0.37 }, { h: 'ĐVT', w: 0.09, align: 'middle' }, { h: 'SL', w: 0.08, align: 'middle' }, { h: 'Đơn giá', w: 0.18, align: 'end' }, { h: 'Thành tiền', w: 0.21, align: 'end' }],
    total: true, words: true, sigs: ['Người mua hàng', 'Người bán hàng'],
  },
  receipt: {
    info: [{ label: 'Họ tên người nộp tiền', key: 'cus' }, { label: 'Địa chỉ', key: 'addr' }, { label: 'Lý do nộp', key: 'reason' },
      { label: 'Số tiền', key: 'amount', half: true }, { label: 'Kèm theo', key: 'att', half: true }, { label: 'Viết bằng chữ', key: 'words' }],
    sigs: ['Người nộp tiền', 'Người lập phiếu', 'Thủ quỹ'],
  },
  payment: {
    info: [{ label: 'Họ tên người nhận tiền', key: 'cus' }, { label: 'Địa chỉ', key: 'addr' }, { label: 'Lý do chi', key: 'reason' },
      { label: 'Số tiền', key: 'amount', half: true }, { label: 'Kèm theo', key: 'att', half: true }, { label: 'Viết bằng chữ', key: 'words' }],
    sigs: ['Người nhận tiền', 'Người lập phiếu', 'Thủ quỹ'],
  },
  delivery: {
    info: [{ label: 'Người nhận', key: 'cus', half: true }, { label: 'Số điện thoại', key: 'phone', half: true }, { label: 'Địa chỉ giao hàng', key: 'addr' }, { label: 'Thu hộ (COD)', key: 'cod', half: true }],
    cols: [{ h: 'STT', w: 0.08, align: 'middle' }, { h: 'Tên hàng', w: 0.46 }, { h: 'ĐVT', w: 0.11, align: 'middle' }, { h: 'SL', w: 0.1, align: 'middle' }, { h: 'Ghi chú', w: 0.25 }],
    total: true, sigs: ['Người nhận hàng', 'Người giao hàng'],
  },
  warranty: {
    info: [{ label: 'Khách hàng', key: 'cus', half: true }, { label: 'Số điện thoại', key: 'phone', half: true }, { label: 'Sản phẩm', key: 'prod' },
      { label: 'Số serial / IMEI', key: 'serial', half: true }, { label: 'Ngày mua', key: 'date', half: true }, { label: 'Thời hạn bảo hành', key: 'period', half: true }],
    terms: true, sigs: ['Khách hàng', 'Đại diện cửa hàng'],
  },
};
export const rbHasTable = (t: RBType) => !!FORMS[t].cols;

// chữ viết tay mẫu (ảnh 3D cho giống phiếu đã dùng)
const FILL: Record<RBType, { info: Record<string, string>; rows?: string[][]; total?: string; words?: string }> = {
  invoice: {
    info: { cus: 'Thu Hà', addr: '45 Lê Lợi, Q.1', phone: '0938 456 789' },
    rows: [['Nồi cơm điện 1.8L', 'cái', '1', '890.000', '890.000'], ['Ấm siêu tốc', 'cái', '2', '250.000', '500.000'], ['Bộ dao inox', 'bộ', '1', '320.000', '320.000']],
    total: '1.710.000', words: 'Một triệu bảy trăm mười nghìn đồng',
  },
  receipt: { info: { cus: 'Quốc Bảo', addr: '22 Pasteur, Q.3', reason: 'Thanh toán đơn hàng tháng 11', amount: '2.500.000đ', att: '01', words: 'Hai triệu năm trăm nghìn đồng' } },
  payment: { info: { cus: 'Gia Khánh', addr: '9 Võ Văn Tần, Q.3', reason: 'Chi tiền nhập hàng', amount: '4.200.000đ', att: '02', words: 'Bốn triệu hai trăm nghìn đồng' } },
  delivery: {
    info: { cus: 'Gia Khánh', phone: '0912 345 678', addr: '18 Hai Bà Trưng, Q.1', cod: '650.000đ' },
    rows: [['Quạt đứng mini', 'cái', '1', 'Giao giờ HC'], ['Đèn bàn LED', 'cái', '2', '']],
  },
  warranty: { info: { cus: 'Thu Hà', phone: '0938 456 789', prod: 'Máy xay sinh tố 1.5L', serial: 'SN2611-0458', date: '24/11/2026', period: '12 tháng' } },
};

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, family: string, weight: number, size: number): number {
  if (typeof document === 'undefined') return (t || '').length * size * 0.55;
  if (!mctx) mctx = document.createElement('canvas').getContext('2d');
  if (!mctx) return (t || '').length * size * 0.55;
  mctx.font = `${weight} ${size}px "${family}"`;
  return mctx.measureText(t || '').width;
}
const fit = (t: string, fam: string, wt: number, size: number, maxW: number, min = size * 0.55) => {
  const w = textW(t, fam, wt, size);
  return w <= maxW ? size : Math.max(min, (size * maxW) / w);
};
// cắt bớt + "…" nếu ở cỡ nhỏ nhất vẫn tràn
const clip = (t: string, fam: string, wt: number, size: number, maxW: number) => {
  if (textW(t, fam, wt, size) <= maxW) return t;
  let s = t;
  while (s.length > 1 && textW(s + '…', fam, wt, size) > maxW) s = s.slice(0, -1);
  return s.trimEnd() + '…';
};
const wrapLines = (t: string, fam: string, wt: number, size: number, maxW: number): string[] => {
  const out: string[] = [];
  for (const para of (t || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const tryS = cur ? `${cur} ${w}` : w;
      if (!cur || textW(tryS, fam, wt, size) <= maxW) cur = tryS;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
};
// tách 2 dòng cân đối theo từ (dòng dài nhất ngắn nhất)
const split2 = (t: string, fam: string, wt: number): string[] => {
  const ws = t.split(/\s+/).filter(Boolean);
  if (ws.length < 2) return [t];
  let best: string[] = [t], bw = Infinity;
  for (let i = 1; i < ws.length; i++) {
    const a = ws.slice(0, i).join(' '), b = ws.slice(i).join(' ');
    const m = Math.max(textW(a, fam, wt, 100), textW(b, fam, wt, 100));
    if (m < bw) { bw = m; best = [a, b]; }
  }
  return best;
};
const initials = (name: string) => {
  const skip = new Set(['CỬA', 'HÀNG', 'CÔNG', 'TY', 'TNHH', 'SHOP', 'CTY', 'CỔ', 'PHẦN', 'TIỆM', 'NHÀ', 'THUỐC', 'QUÁN', 'THƯƠNG', 'MẠI', 'DỊCH', 'VỤ', 'SẢN', 'XUẤT', 'ĐẦU', 'TƯ', 'XÂY', 'DỰNG']);
  const ws = (name || '').toUpperCase().split(/\s+/).filter((w) => w && !skip.has(w));
  const pick = (ws.length ? ws : (name || 'M').toUpperCase().split(/\s+/)).slice(0, 2);
  return pick.map((w) => [...w][0] || '').join('') || 'M';
};

// ---------- SVG phiếu ----------
export interface FormProps {
  type: RBType; spec: RBSpec; data: RBData;
  part?: number;          // liên thứ mấy (0-based)
  bleed?: boolean;        // nới lề xén 2mm (file in)
  paper?: boolean;        // tô màu giấy liên (xem trước) — file in: false (giấy đã có màu)
  filled?: boolean;       // chữ viết tay mẫu (ảnh 3D)
  numberOffset?: number;  // số nhảy: bộ thứ mấy
  style?: CSSProperties;
}

export function ReceiptFormSvg({ type, spec, data, part = 0, bleed = false, paper = true, filled = false, numberOffset = 0, style }: FormProps) {
  const sz = rbSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const b = bleed ? RB_BLEED_MM * U : 0;
  const pal = rbPalette(spec.palette);
  const ink = pal.ink;
  const f = rbFont(spec.font);
  const disp = f.family;
  const L = spec.layout;
  const bi = L === 'bilingual';
  const def = FORMS[type];
  const T = rbType(type);
  const lab = (s: string) => (bi && EN[s] ? `${s} (${EN[s]})` : s);
  const parts = Math.max(1, Math.min(3, spec.parts));
  const pi = Math.min(part, parts - 1);
  const paperColor = paper ? RB_PAPER[parts > 1 ? pi : 0] : '#FFFFFF';
  const fillData = filled ? FILL[type] : null;
  const handInk = '#2747A0';

  // ---- lập bố cục: thử co cỡ chữ cho tới khi vừa khổ ----
  const landscape = W > H;
  const plan = (s: number) => {
    const k = sz.k * s;
    const fs = 30 * k;                     // chữ thân ~3mm ở A5
    const M = (L === 'border' ? 78 : 58) * sz.k;
    const x0 = M, x1 = W - M, cw = x1 - x0;
    const lh = fs * 2.05;                  // dòng kẻ chấm
    // header
    const showLogo = L === 'logo' || L === 'band' || !!data.logo;
    const logoS = L === 'logo' ? 210 * k : 130 * k;
    const nameFs = 50 * k;
    const infoFs = fs * 0.9;
    const infoLines = [data.slogan, data.address, [data.hotline && `Hotline: ${data.hotline}`, data.mst && `MST: ${data.mst}`].filter(Boolean).join('   ·   ')].filter((x) => (x || '').trim()) as string[];
    // tên + thông tin header: tên dài → 2 dòng cân đối; địa chỉ dài → xuống dòng (tối đa 2), không cắt cụt
    const centerHead = L === 'border';
    const numW = Math.min(420 * k, cw * 0.4);
    const txOff = showLogo && !centerHead ? logoS + 22 * k : 0;
    const nameMaxW = centerHead ? cw - numW * 2 - 40 * k : cw - numW - 30 * k - txOff;
    const shop = (data.shop || '').trim();
    let nameLines = shop ? [shop] : [];
    let nameSize = fit(shop, disp, f.weight, nameFs, nameMaxW, nameFs * 0.5);
    if (shop && nameSize < nameFs * 0.74) {
      const two = split2(shop, disp, f.weight);
      if (two.length === 2) { nameLines = two; nameSize = Math.min(...two.map((t) => fit(t, disp, f.weight, nameFs * 0.86, nameMaxW, nameFs * 0.45))); }
    }
    const infoOut: { t: string; s: number }[] = [];
    for (const line of infoLines) {
      const s2 = fit(line, BODY, BW, infoFs, nameMaxW, infoFs * 0.84);
      if (textW(line, BODY, BW, s2) <= nameMaxW) { infoOut.push({ t: line, s: s2 }); continue; }
      const ls = wrapLines(line, BODY, BW, s2, nameMaxW);
      infoOut.push({ t: ls[0], s: s2 });
      if (ls.length > 1) infoOut.push({ t: clip(ls.slice(1).join(' '), BODY, BW, s2, nameMaxW), s: s2 });
    }
    const headTextH = nameLines.length * nameSize * 1.08 + infoOut.length * infoFs * 1.45;
    const headH = Math.max(showLogo ? logoS : 0, headTextH) + (L === 'band' ? 70 * k : 18 * k);
    const titleFs = (bi ? 56 : 62) * k;
    const titleH = titleFs * 1.25 + (bi ? fs * 1.35 : 0) + fs * 1.9;   // tiêu đề + (EN) + ngày tháng
    // info: ô half ghép 2 trên 1 dòng khi khổ ngang/rộng
    const pair = landscape || cw > 1200;
    const infoRows: InfoField[][] = [];
    for (let i = 0; i < def.info.length; i++) {
      const a = def.info[i], n = def.info[i + 1];
      if (pair && a.half && n?.half) { infoRows.push([a, n]); i++; } else infoRows.push([a]);
    }
    const infoH = infoRows.length * lh + fs * 0.4;
    const sigH = fs * 2.7 + Math.max(92, 150 * k * (landscape ? 0.66 : 1));
    const footH = data.footer?.trim() ? fs * 1.9 : fs * 0.4;
    const headY = L === 'band' ? 0 : M;
    let avail = H - headY - headH - titleH - infoH - sigH - footH - M * 0.75;
    let rows = 0, rh = 0, thh = 0, termLines: string[] = [], termFs = fs * 0.9;
    const afterTable = (def.total ? fs * 2.1 : 0) + (def.words ? lh : 0);
    if (def.cols) {
      thh = bi ? fs * 3.1 : fs * 2.2;
      rh = fs * 2.05;
      const space = avail - thh - afterTable - fs * 0.6;
      rows = Math.max(0, Math.min(spec.rows, Math.floor(space / rh)));
      avail = space - rows * rh;
    } else if (def.terms) {
      const raw = data.terms || '';
      termLines = wrapLines(raw.split('\n').filter((x) => x.trim()).map((x) => `•  ${x.trim()}`).join('\n'), BODY, BW, termFs, cw);
      const cap = Math.max(0, Math.floor((avail - fs * 1.8) / (termFs * 1.5)));
      if (termLines.length > cap) termLines = [...termLines.slice(0, Math.max(0, cap - 1)), ...(cap > 0 ? [clip(termLines[cap - 1] || '', BODY, BW, termFs, cw)] : [])];
      avail -= fs * 1.8 + termLines.length * termFs * 1.5;
    }
    // phiếu không có bảng (thu/chi/bảo hành): giãn dòng kẻ cho đủ chỗ viết tay, không để trống nửa dưới
    let lhI = lh;
    if (!def.cols && avail > 0) {
      const add = Math.min(lh * 0.8, Math.max(0, (avail - fs) / (infoRows.length + 1.5)));
      lhI = lh + add; avail -= add * infoRows.length;
    }
    return { centerHead, numW, nameMaxW, nameLines, nameSize, infoOut, lhI, k, fs, M, x0, x1, cw, lh, showLogo, logoS, nameFs, infoFs, infoLines, headH, headY, titleFs, titleH, infoRows, infoH, sigH, footH, rows, rh, thh, afterTable, avail, termLines, termFs };
  };
  let P = plan(1);
  const wantRows = def.cols ? Math.min(spec.rows, 3) : 0;
  for (const s of [0.94, 0.88, 0.82, 0.77, 0.72]) {
    if ((def.cols ? P.rows >= wantRows : true) && P.avail >= -1) break;
    P = plan(s);
  }
  const { fs, M, x0, x1, cw, lh, infoFs, headH, headY, titleFs, k } = P;

  const els: ReactNode[] = [];
  let key = 0;
  const K = () => key++;
  const txt = (x: number, y: number, t: string, o: { size: number; fam?: string; wt?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; testid?: string }) => (
    <text key={K()} x={x} y={y} fontFamily={`"${o.fam || BODY}"`} fontWeight={o.wt ?? BW} fontSize={o.size} fill={o.fill || ink}
      textAnchor={o.anchor || 'start'} letterSpacing={o.ls} data-rb={o.testid}>{t}</text>
  );
  const dots = (xa: number, xb: number, y: number) => xb - xa > 20 && (
    <line key={K()} x1={xa} y1={y} x2={xb} y2={y} stroke={ink} strokeWidth={Math.max(3, 4.2 * k)} strokeDasharray={`0.1 ${10 * k}`} strokeLinecap="round" />
  );
  const hand = (x: number, y: number, t: string, maxW: number, anchor: 'start' | 'middle' | 'end' = 'start') => {
    const size = fit(t, HAND, 700, fs * 1.35, maxW, fs * 0.8);
    return <text key={K()} x={x} y={y} fontFamily={`"${HAND}"`} fontWeight={700} fontSize={size} fill={handInk} textAnchor={anchor} opacity={parts > 1 && pi > 0 ? 0.78 : 0.95}>{t}</text>;
  };

  // nền giấy (liên) + lề xén
  els.push(<rect key={K()} x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={paperColor} />);

  // ---- khung (viền) ----
  if (L === 'border') {
    const o = M * 0.42, o2 = o + 14 * k;
    els.push(<rect key={K()} x={o} y={o} width={W - o * 2} height={H - o * 2} fill="none" stroke={ink} strokeWidth={9 * k} rx={6 * k} />);
    els.push(<rect key={K()} x={o2} y={o2} width={W - o2 * 2} height={H - o2 * 2} fill="none" stroke={ink} strokeWidth={3 * k} rx={4 * k} />);
    // hoa văn góc
    for (const [cx, cy, sx, sy] of [[o2, o2, 1, 1], [W - o2, o2, -1, 1], [o2, H - o2, 1, -1], [W - o2, H - o2, -1, -1]] as const) {
      const r = 26 * k;
      els.push(<path key={K()} d={`M${cx + sx * r * 1.6} ${cy + sy * 4 * k} Q${cx + sx * r * 0.4} ${cy + sy * r * 0.4} ${cx + sx * 4 * k} ${cy + sy * r * 1.6}`} fill="none" stroke={ink} strokeWidth={3.5 * k} />);
      els.push(<circle key={K()} cx={cx + sx * r * 0.62} cy={cy + sy * r * 0.62} r={4.5 * k} fill={ink} />);
    }
  }

  // ---- header ----
  const bandH = headY + headH;
  const onBand = L === 'band';
  const hc = onBand ? '#FFFFFF' : ink;
  if (onBand) els.push(<rect key={K()} x={-b} y={-b} width={W + b * 2} height={bandH + b} fill={ink} />);
  const hy = onBand ? M * 0.7 : headY;
  // số + liên (phải)
  const numW = P.numW;
  const numX = x1;
  const numLabel = bi ? 'Số (No.):' : 'Số:';
  const numStr = rbNumber(data, numberOffset);
  const numFs = fit(numStr, BODY, 800, fs * 1.45, numW - textW(numLabel + ' ', BODY, BW, fs) - 10, fs * 0.9);
  if (onBand) els.push(<rect key={K()} x={numX - numW - 10 * k} y={hy - 4 * k} width={numW + 20 * k} height={fs * 2.9 + 12 * k} rx={10 * k} fill="#FFFFFF" />);
  els.push(<g key={K()} data-rb="number">
    {txt(numX - textW(numStr, BODY, 800, numFs) - 8 * k, hy + fs * 1.35, numLabel, { size: fs, fill: ink, anchor: 'end' })}
    <text x={numX} y={hy + fs * 1.35} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={numFs} fill={RB_NUMBER_RED} textAnchor="end" data-rb="num">{numStr}</text>
  </g>);
  const ll = lienLabel(type, parts, pi);
  if (ll) els.push(txt(numX, hy + fs * 2.75, ll, { size: fs * 0.86, fill: ink, anchor: 'end', testid: 'lien' }));

  // logo / monogram
  let tx = x0;
  const centerHead = P.centerHead;
  const ly = hy;
  if (P.showLogo && !centerHead) {
    const s = P.logoS;
    if (data.logo) els.push(<image key={K()} href={data.logo} x={x0} y={ly} width={s} height={s} preserveAspectRatio="xMidYMid meet" />);
    else {
      els.push(<circle key={K()} cx={x0 + s / 2} cy={ly + s / 2} r={s / 2 - 3 * k} fill={onBand ? '#FFFFFF' : 'none'} stroke={onBand ? 'none' : ink} strokeWidth={5 * k} />);
      const ini = initials(data.shop);
      els.push(txt(x0 + s / 2, ly + s / 2 + s * 0.13, ini, { size: fit(ini, disp, f.weight, s * 0.4, s * 0.62), fam: disp, wt: f.weight, fill: ink, anchor: 'middle' }));
    }
    tx = x0 + s + 22 * k;
  }
  // tên + thông tin
  const nameMaxW = P.nameMaxW;
  const nx = centerHead ? W / 2 : tx;
  const na = centerHead ? 'middle' : 'start';
  let ny = hy - P.nameSize * 0.13;
  P.nameLines.forEach((ln) => {
    ny += P.nameSize * 1.08;
    els.push(txt(nx, ny, clip(ln, disp, f.weight, P.nameSize, nameMaxW), { size: P.nameSize, fam: disp, wt: f.weight, fill: hc, anchor: na, testid: 'shop' }));
  });
  for (const it of P.infoOut) {
    ny += infoFs * 1.45;
    els.push(txt(nx, ny, it.t, { size: it.s, fill: hc, anchor: na }));
  }
  if (!onBand) {
    const sepY = headY + headH - 6 * k;
    els.push(<line key={K()} x1={x0} y1={sepY} x2={x1} y2={sepY} stroke={ink} strokeWidth={L === 'simple' || bi ? 3 * k : 5 * k} />);
    if (L === 'logo') els.push(<line key={K()} x1={x0} y1={sepY + 9 * k} x2={x1} y2={sepY + 9 * k} stroke={ink} strokeWidth={2 * k} />);
  }

  // ---- tiêu đề + ngày ----
  let y = bandH + titleFs * 1.12;
  const title = (data.title || '').trim() || T.title;
  const tFs = fit(title, disp, f.weight, titleFs, cw * 0.9);
  els.push(txt(W / 2, y, title, { size: tFs, fam: disp, wt: f.weight, anchor: 'middle', ls: 2 * k, testid: 'title' }));
  if (bi) { y += fs * 1.35; els.push(txt(W / 2, y, T.en, { size: fs * 0.95, anchor: 'middle', ls: 4 * k })); }
  y += fs * 1.7;
  {
    const dl = bi ? 'Ngày (Date) ........ tháng ........ năm 20........' : 'Ngày ........ tháng ........ năm 20........';
    els.push(txt(W / 2, y, dl, { size: fs * 0.92, anchor: 'middle' }));
    if (fillData) {
      const wDl = textW(dl, BODY, BW, fs * 0.92);
      const xs = W / 2 - wDl / 2;
      els.push(hand(xs + wDl * (bi ? 0.33 : 0.2), y - fs * 0.25, '24', 200));
      els.push(hand(xs + wDl * (bi ? 0.6 : 0.55), y - fs * 0.25, '11', 200));
      els.push(hand(xs + wDl * 0.92, y - fs * 0.25, '26', 200));
    }
  }
  y += fs * 0.6;

  // ---- dòng thông tin ----
  for (const row of P.infoRows) {
    y += P.lhI;
    const colW = (cw - (row.length - 1) * 40 * k) / row.length;
    row.forEach((fd, i) => {
      const cx0 = x0 + i * (colW + 40 * k);
      const label = `${lab(fd.label)}:`;
      const ls = fit(label, BODY, BW, fs, colW * 0.62, fs * 0.8);
      els.push(txt(cx0, y, label, { size: ls, testid: 'label' }));
      const lw = textW(label, BODY, BW, ls);
      els.push(dots(cx0 + lw + 12 * k, cx0 + colW, y + 4 * k));
      const v = fillData?.info[fd.key];
      if (v) els.push(hand(cx0 + lw + 30 * k, y - fs * 0.15, v, colW - lw - 40 * k));
    });
  }
  y += fs * 0.4;

  // ---- bảng ----
  if (def.cols) {
    y += fs * 0.6;
    const ty = y;
    const cols = def.cols;
    const tw = cw;
    const xs: number[] = [x0];
    cols.forEach((c) => xs.push(xs[xs.length - 1] + c.w * tw));
    xs[xs.length - 1] = x1;
    const tableH = P.thh + P.rows * P.rh + (def.total ? fs * 2.1 : 0);
    // nền đầu bảng
    els.push(<rect key={K()} x={x0} y={ty} width={tw} height={P.thh} fill={L === 'simple' ? 'none' : pal.soft} />);
    // khung + kẻ
    const sw = 2.6 * k;
    els.push(<rect key={K()} x={x0} y={ty} width={tw} height={tableH} fill="none" stroke={ink} strokeWidth={sw * 1.6} />);
    for (let i = 1; i < cols.length; i++) {
      const bottom = def.total && i < cols.length - 1 ? ty + P.thh + P.rows * P.rh : ty + tableH;
      els.push(<line key={K()} x1={xs[i]} y1={ty} x2={xs[i]} y2={bottom} stroke={ink} strokeWidth={sw} />);
    }
    els.push(<line key={K()} x1={x0} y1={ty + P.thh} x2={x1} y2={ty + P.thh} stroke={ink} strokeWidth={sw * 1.3} />);
    for (let r = 1; r <= P.rows; r++) {
      const ry = ty + P.thh + r * P.rh;
      els.push(<line key={K()} x1={x0} y1={ry} x2={x1} y2={ry} stroke={ink} strokeWidth={r === P.rows && def.total ? sw * 1.3 : sw * 0.7} opacity={r === P.rows && def.total ? 1 : 0.75} />);
    }
    // tiêu đề cột
    cols.forEach((c, i) => {
      const cxm = (xs[i] + xs[i + 1]) / 2, cwid = xs[i + 1] - xs[i] - 10 * k;
      const hs = fit(c.h, BODY, 800, fs * 0.95, cwid, fs * 0.62);
      if (bi && EN[c.h]) {
        els.push(txt(cxm, ty + P.thh * 0.45, c.h, { size: hs, wt: 800, anchor: 'middle' }));
        const es = fit(EN[c.h], BODY, BW, fs * 0.78, cwid, fs * 0.55);
        els.push(txt(cxm, ty + P.thh * 0.8, EN[c.h], { size: es, anchor: 'middle' }));
      } else els.push(txt(cxm, ty + P.thh / 2 + hs * 0.36, c.h, { size: hs, wt: 800, anchor: 'middle' }));
    });
    // STT in sẵn
    for (let r = 0; r < P.rows; r++) {
      const ry = ty + P.thh + r * P.rh + P.rh / 2 + fs * 0.33;
      els.push(txt((xs[0] + xs[1]) / 2, ry, String(r + 1), { size: fs * 0.85, anchor: 'middle' }));
      const fr = fillData?.rows?.[r];
      if (fr) fr.forEach((v, ci) => {
        if (!v) return;
        const c = cols[ci + 1]; const ax = c.align === 'end' ? xs[ci + 2] - 12 * k : c.align === 'middle' ? (xs[ci + 1] + xs[ci + 2]) / 2 : xs[ci + 1] + 12 * k;
        els.push(hand(ax, ry + fs * 0.05, v, xs[ci + 2] - xs[ci + 1] - 20 * k, c.align || 'start'));
      });
    }
    if (def.total) {
      const tyy = ty + P.thh + P.rows * P.rh + fs * 1.42;
      const tl = lab('Tổng cộng');
      els.push(txt(xs[cols.length - 1] - 14 * k, tyy, tl, { size: fit(tl, BODY, 800, fs, xs[cols.length - 1] - x0 - 30 * k), wt: 800, anchor: 'end' }));
      if (fillData?.total) els.push(hand(x1 - 12 * k, tyy, fillData.total, xs[cols.length] - xs[cols.length - 1] - 20 * k, 'end'));
    }
    // watermark logo (bố cục logo/viền)
    if ((L === 'logo' || L === 'border') && P.rows >= 3) {
      const wr = Math.min(tw * 0.22, (P.rows * P.rh) * 0.42);
      const wcx = x0 + tw / 2, wcy = ty + P.thh + (P.rows * P.rh) / 2;
      els.push(<g key={K()} opacity={0.07}>
        <circle cx={wcx} cy={wcy} r={wr} fill="none" stroke={ink} strokeWidth={wr * 0.08} />
        {txt(wcx, wcy + wr * 0.28, initials(data.shop), { size: fit(initials(data.shop), disp, f.weight, wr * 0.9, wr * 1.3), fam: disp, wt: f.weight, anchor: 'middle' })}
      </g>);
    }
    y = ty + tableH;
    if (def.words) {
      y += lh * 0.95;
      const wl = `${lab('Số tiền viết bằng chữ')}:`;
      const ws = fit(wl, BODY, BW, fs, cw * 0.5, fs * 0.8);
      els.push(txt(x0, y, wl, { size: ws }));
      const lw = textW(wl, BODY, BW, ws);
      els.push(dots(x0 + lw + 12 * k, x1, y + 4 * k));
      if (fillData?.words) els.push(hand(x0 + lw + 30 * k, y - fs * 0.15, fillData.words, cw - lw - 40 * k));
    }
  } else if (def.terms && P.termLines.length) {
    y += fs * 1.5;
    els.push(txt(x0, y, `${lab('Điều kiện bảo hành')}:`, { size: fs * 0.95, wt: 800 }));
    for (const tl of P.termLines) { y += P.termFs * 1.5; els.push(txt(x0, y, tl, { size: P.termFs, testid: 'term' })); }
  }

  // ---- chữ ký ----
  const sigs = def.sigs;
  const sigTop = H - M * 0.75 - P.footH - P.sigH;
  const sw2 = cw / sigs.length;
  sigs.forEach((s, i) => {
    const cxm = x0 + sw2 * (i + 0.5);
    const tl = lab(s);
    const ts = fit(tl, BODY, 800, fs, sw2 - 16 * k, fs * 0.7);
    els.push(txt(cxm, sigTop + fs * 1.15, tl, { size: ts, wt: 800, anchor: 'middle', testid: 'sig' }));
    const note = bi ? '(Ký, ghi rõ họ tên / Sign)' : '(Ký, ghi rõ họ tên)';
    els.push(txt(cxm, sigTop + fs * 2.25, note, { size: fit(note, BODY, BW, fs * 0.82, sw2 - 16 * k, fs * 0.6), anchor: 'middle' }));
    if (fillData && i === 0) {
      els.push(<path key={K()} d={`M${cxm - 90 * k} ${sigTop + P.sigH * 0.72} c ${30 * k} ${-60 * k}, ${50 * k} ${30 * k}, ${80 * k} ${-20 * k} s ${40 * k} ${40 * k}, ${90 * k} ${-10 * k}`} fill="none" stroke={handInk} strokeWidth={5 * k} strokeLinecap="round" opacity={0.85} />);
    }
  });
  // ---- dòng cuối ----
  if (data.footer?.trim()) {
    const fy = H - M * 0.75 - P.footH * 0.25;
    const fsz = fit(data.footer, BODY, BW, fs * 0.85, cw, fs * 0.6);
    els.push(txt(W / 2, fy, clip(data.footer, BODY, BW, fsz, cw), { size: fsz, anchor: 'middle', testid: 'footer' }));
  }

  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-rows={P.rows} data-scale={(P.k / sz.k).toFixed(2)}>
      {els}
    </svg>
  );
}

// ---------- trang THÔNG SỐ IN (trang cuối PDF: dặn xưởng) ----------
export function SpecNoteSvg({ type, spec, data }: { type: RBType; spec: RBSpec; data: RBData }) {
  const sz = rbSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const b = RB_BLEED_MM * U;
  const pal = rbPalette(spec.palette);
  const parts = spec.parts;
  const total = spec.perBook * Math.max(1, spec.books);
  const lienTxt = parts === 1 ? '1 liên (giấy Ford trắng, xé)' : `${parts} liên carbonless: ${Array.from({ length: parts }, (_, i) => `${lienLabel(type, parts, i).replace(/^Liên \d+: /, `L${i + 1} `)} – giấy ${RB_PAPER_NAME[i]}`).join(' · ')}`;
  const rows: [string, string][] = [
    ['Loại phiếu', rbType(type).name + ((data.title || '').trim() ? ` (“${data.title.trim()}”)` : '')],
    ['Khổ thành phẩm', `${sz.name} mm · lề xén ${RB_BLEED_MM}mm`],
    ['Số liên', lienTxt],
    ['Mực in', `1 màu ${pal.name.toLowerCase()} + số nhảy đỏ (máy đóng số)`],
    ['Số nhảy', `${rbNumber(data, 0)} → ${rbNumber(data, total - 1)} (mỗi bộ 1 số, các liên cùng số)`],
    ['Đóng cuốn', `${spec.perBook} bộ/cuốn · ${spec.books} cuốn · tổng ${total.toLocaleString('vi-VN')} bộ`],
    ['Gáy', 'Keo gáy + băng keo vải đen cạnh trên, có đường răng cưa để xé'],
    ['Bìa', 'Bìa sau carton xám, có tờ lót chặn (chống in hằn sang bộ dưới)'],
  ];
  const k = Math.min(W, H) / 1480;
  const fs = 36 * k * (W > H ? 0.95 : 1);
  const x0 = 80 * k, cw = W - 160 * k;
  let y = 150 * k;
  const els: ReactNode[] = [];
  let key = 0;
  els.push(<rect key={key++} x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill="#FFFFFF" />);
  els.push(<text key={key++} x={x0} y={y} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs * 1.6} fill="#1C1C1C">THÔNG SỐ IN — GỬI XƯỞNG</text>);
  y += fs * 0.9;
  els.push(<line key={key++} x1={x0} y1={y} x2={x0 + cw} y2={y} stroke="#1C1C1C" strokeWidth={3 * k} />);
  const lw = cw * 0.3;
  for (const [a, v] of rows) {
    const lines = wrapLines(v, BODY, BW, fs, cw - lw);
    y += fs * 1.9;
    els.push(<text key={key++} x={x0} y={y} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill="#1C1C1C">{a}</text>);
    lines.forEach((ln, i) => els.push(<text key={key++} x={x0 + lw} y={y + i * fs * 1.4} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fs} fill="#333">{ln}</text>));
    y += (lines.length - 1) * fs * 1.4;
  }
  y += fs * 2.2;
  const note = 'Các trang trước: mỗi liên 1 trang (mẫu bộ số đầu tiên). Màu giấy liên do giấy carbonless, KHÔNG in nền. Số nhảy in đỏ bằng máy đóng số theo dải trên.';
  wrapLines(note, BODY, BW, fs * 0.85, cw).forEach((ln, i) => els.push(<text key={key++} x={x0} y={y + i * fs * 1.3} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fs * 0.85} fill="#666">{ln}</text>));
  return <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg">{els}</svg>;
}
