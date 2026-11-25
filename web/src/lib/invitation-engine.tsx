'use client';
// Thiệp mời sự kiện (doanh nghiệp): 1 engine SVG (đơn vị mm) = BỐ CỤC (viền/hoạ tiết vẽ bằng code) × BẢNG MÀU × FONT × DỊP.
// Thiệp phẳng 1 tờ: MẶT TRƯỚC (kính mời + sự kiện + thời gian + địa điểm) | MẶT SAU (chương trình + RSVP + chỉ đường + người mời ký).
// Thiệp gấp đôi: MẶT NGOÀI [mặt sau | bìa] + MẶT TRONG [chương trình + RSVP | kính mời + chi tiết + chữ ký].
// Ép kim: phần vàng vẽ lại ở 'foil3d' (trắng/đen → bản đồ kim loại 3D) và 'foilPrint' (đen/trắng → khuôn ép).
// Cá nhân hoá: mỗi dòng danh sách "Tên | Chức vụ/Đơn vị" → 1 trang kính mời riêng. Chữ đo thật, tự co để không tràn.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { canChiYear, solarToLunar, LUNAR_MONTH_NAMES } from './lunar-vn';
import { qrPath } from './flyer-qr';

export const IV_BLEED_MM = 3;

// ---------- khổ (mỗi mặt, đứng) ----------
export interface IVSize { id: string; name: string; w: number; h: number }
export const IV_SIZES: IVSize[] = [
  { id: 'dl', name: '10 × 20 cm (DL)', w: 100, h: 200 },
  { id: '13x18', name: '13 × 18 cm', w: 130, h: 180 },
  { id: 'a5', name: 'A5 14,8 × 21 cm', w: 148, h: 210 },
];
export const ivSize = (id: string) => IV_SIZES.find((s) => s.id === id) || IV_SIZES[0];
export const RSVP_SIZE = { w: 90, h: 60 };

// ---------- font ----------
export interface IVFont { id: string; name: string; family: string; weight: number }
export const IV_FONTS: IVFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
];
export const ivFont = (id: string) => IV_FONTS.find((f) => f.id === id) || IV_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SERIF = 'Cormorant Garamond';
const SCRIPT = 'Great Vibes';

export const IV_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Prata&family=Montserrat:wght@800&family=Great+Vibes&display=swap');`;

export function useIVFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-iv-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-iv-fonts'; link.rel = 'stylesheet';
        link.href = IV_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [
      ...IV_FONTS.map((f) => `${f.weight} 60px "${f.family}"`),
      `600 40px "${BODY}"`, `800 40px "${BODY}"`, `600 40px "${SERIF}"`, `700 40px "${SERIF}"`, `italic 500 40px "${SERIF}"`, `400 40px "${SCRIPT}"`,
    ];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface IVPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; gold: string; light: boolean; foil: boolean }
export const IV_PALETTES: IVPalette[] = [
  { id: 'navy', name: 'Navy ánh kim', bg: '#14233F', bg2: '#1D3157', ink: '#F5EFE1', sub: '#C9D1E3', accent: '#2C4A7E', gold: '#D4AF5E', light: false, foil: true },
  { id: 'black', name: 'Đen vàng', bg: '#121212', bg2: '#1F1F1F', ink: '#F4EEDF', sub: '#BDB6A6', accent: '#2A2A2A', gold: '#D6B062', light: false, foil: true },
  { id: 'ivory', name: 'Ngà vàng kim', bg: '#FBF6EA', bg2: '#F1E7CF', ink: '#2A2418', sub: '#6F6350', accent: '#B48A3C', gold: '#B8913F', light: true, foil: true },
  { id: 'burgundy', name: 'Đỏ đô', bg: '#5A1322', bg2: '#6E1A2C', ink: '#F7EBDD', sub: '#E1C4BE', accent: '#7C2235', gold: '#D9B26A', light: false, foil: true },
  { id: 'emerald', name: 'Lục bảo', bg: '#0F3B33', bg2: '#145046', ink: '#F2EEDF', sub: '#BFD3CB', accent: '#1B5E52', gold: '#D2B064', light: false, foil: true },
  { id: 'blush', name: 'Hồng phấn', bg: '#FBEDEA', bg2: '#F4DCD6', ink: '#3E2A2A', sub: '#7D6060', accent: '#C98B86', gold: '#B9876B', light: true, foil: true },
  { id: 'white-red', name: 'Trắng đỏ', bg: '#FFFFFF', bg2: '#FBECEC', ink: '#1F1A1A', sub: '#5E5555', accent: '#C8102E', gold: '#C8102E', light: true, foil: false },
  { id: 'white-navy', name: 'Trắng navy', bg: '#FFFFFF', bg2: '#EEF2F8', ink: '#16233B', sub: '#4E5E7A', accent: '#1F3A68', gold: '#1F3A68', light: true, foil: false },
];
export const ivPalette = (id: string) => IV_PALETTES.find((p) => p.id === id) || IV_PALETTES[0];

// ---------- dịp ----------
export type IVOcc = 'khaitruong' | 'hoinghi' | 'gala' | 'kyniem' | 'ramat' | 'hoithao' | 'tangia' | 'totnghiep';
export const IV_OCCASIONS: { id: IVOcc; name: string }[] = [
  { id: 'khaitruong', name: 'Khai trương' }, { id: 'hoinghi', name: 'Hội nghị khách hàng' }, { id: 'gala', name: 'Gala · Year End' },
  { id: 'kyniem', name: 'Kỷ niệm thành lập' }, { id: 'ramat', name: 'Ra mắt sản phẩm' }, { id: 'hoithao', name: 'Hội thảo' },
  { id: 'tangia', name: 'Tân gia' }, { id: 'totnghiep', name: 'Lễ tốt nghiệp' },
];
const OCC_TEXT: Record<IVOcc, Record<string, string>> = {
  khaitruong: { kicker: 'LỄ KHAI TRƯƠNG', title: 'AN KHANG COFFEE', subtitle: 'Chi nhánh Thảo Điền', time: '08:30', agenda: '08:30 | Đón khách\n09:00 | Cắt băng khai trương\n09:20 | Múa lân chúc mừng\n09:45 | Tiệc nhẹ & giao lưu', dress: '', closing: 'Sự hiện diện của Quý vị là niềm vinh hạnh của chúng tôi.' },
  hoinghi: { kicker: 'HỘI NGHỊ KHÁCH HÀNG 2027', title: 'Đồng hành & Bứt phá', subtitle: 'Tri ân khách hàng – đối tác chiến lược', time: '08:00', agenda: '08:00 | Đón khách · Check-in\n08:30 | Khai mạc\n09:00 | Tổng kết 2026 & định hướng 2027\n10:30 | Vinh danh đối tác\n11:30 | Tiệc trưa', dress: 'Dress code: Lịch sự', closing: 'Rất hân hạnh được đón tiếp Quý vị.' },
  gala: { kicker: 'YEAR END PARTY', title: 'Gala Đêm Hội Ngộ 2026', subtitle: 'Một năm rực rỡ – Cùng nhau toả sáng', time: '18:00', agenda: '18:00 | Đón khách · Chụp ảnh\n18:45 | Khai mạc\n19:15 | Tiệc tối & văn nghệ\n20:30 | Bốc thăm may mắn', dress: 'Dress code: Đen – Vàng', closing: 'Hẹn gặp Quý vị trong đêm hội ngộ!' },
  kyniem: { kicker: 'LỄ KỶ NIỆM 10 NĂM THÀNH LẬP', title: 'Một thập kỷ – Một hành trình', subtitle: 'Công ty TNHH An Khang (2017 – 2027)', time: '17:30', agenda: '17:30 | Đón khách\n18:00 | Phát biểu khai mạc\n18:20 | Hành trình 10 năm\n19:00 | Tiệc kỷ niệm', dress: 'Dress code: Trắng – Xanh navy', closing: 'Trân trọng cảm ơn Quý vị đã đồng hành cùng chúng tôi.' },
  ramat: { kicker: 'LỄ RA MẮT SẢN PHẨM', title: 'An Khang Pure', subtitle: 'Dòng mỹ phẩm thuần chay thế hệ mới', time: '14:00', agenda: '14:00 | Đón khách\n14:30 | Giới thiệu sản phẩm\n15:15 | Trải nghiệm thực tế\n16:00 | Giao lưu & quà tặng', dress: '', closing: 'Rất mong được đón tiếp Quý vị.' },
  hoithao: { kicker: 'HỘI THẢO', title: 'Chuyển đổi số cho doanh nghiệp vừa và nhỏ', subtitle: 'Chia sẻ từ chuyên gia – thực hành ngay', time: '08:30', agenda: '08:30 | Đăng ký\n09:00 | Phiên 1: Bán hàng đa kênh\n10:15 | Phiên 2: Tự động hoá vận hành\n11:30 | Hỏi đáp & kết nối', dress: '', closing: 'Số lượng chỗ có hạn – vui lòng xác nhận sớm.' },
  tangia: { kicker: 'TIỆC TÂN GIA', title: 'Mừng nhà mới', subtitle: 'Gia đình Quốc Bảo – Thu Hà', time: '11:00', agenda: '11:00 | Đón khách\n11:30 | Thắp hương nhập trạch\n12:00 | Tiệc mừng', dress: '', closing: 'Rất vui được đón anh chị và gia đình.' },
  totnghiep: { kicker: 'LỄ TỐT NGHIỆP', title: 'Khoá K24', subtitle: 'Trường Đại học An Khang', time: '08:00', agenda: '08:00 | Đón khách\n08:30 | Khai mạc buổi lễ\n09:00 | Trao bằng tốt nghiệp\n10:30 | Chụp ảnh lưu niệm', dress: '', closing: 'Rất mong gia đình đến chung vui cùng em.' },
};
export const IV_OCC_KEYS = ['kicker', 'title', 'subtitle', 'time', 'agenda', 'dress', 'closing'] as const;
export const ivOccText = (o: IVOcc) => ({ ...OCC_TEXT[o] });

// ---------- bố cục + mẫu ----------
export type IVLayoutId = 'classic' | 'artdeco' | 'modern' | 'gala' | 'botanical' | 'seal';
export const IV_LAYOUTS: { id: IVLayoutId; name: string }[] = [
  { id: 'classic', name: 'Cổ điển viền kép' }, { id: 'artdeco', name: 'Art-deco' }, { id: 'modern', name: 'Hiện đại dải màu' },
  { id: 'gala', name: 'Gala ánh sao' }, { id: 'botanical', name: 'Lá cành' }, { id: 'seal', name: 'Huy hiệu ruy băng' },
];
export interface IVSpec { layout: IVLayoutId; palette: string; font: string; occ: IVOcc; size: string; fold: boolean; foil: boolean; lunar: boolean; rsvpCard: boolean }
export interface IVTemplate { id: string; name: string; spec: Pick<IVSpec, 'layout' | 'palette' | 'font' | 'occ'> }
export const IV_TEMPLATES: IVTemplate[] = [
  { id: 'kt-red', name: 'Khai trương đỏ', spec: { layout: 'seal', palette: 'white-red', font: 'montserrat', occ: 'khaitruong' } },
  { id: 'kt-black', name: 'Khai trương đen vàng', spec: { layout: 'artdeco', palette: 'black', font: 'playfair', occ: 'khaitruong' } },
  { id: 'hn-navy', name: 'Hội nghị navy', spec: { layout: 'classic', palette: 'navy', font: 'playfair', occ: 'hoinghi' } },
  { id: 'hn-modern', name: 'Hội nghị hiện đại', spec: { layout: 'modern', palette: 'white-navy', font: 'montserrat', occ: 'hoinghi' } },
  { id: 'gala-black', name: 'Gala đêm hội', spec: { layout: 'gala', palette: 'black', font: 'playfair', occ: 'gala' } },
  { id: 'gala-burgundy', name: 'Year End đỏ đô', spec: { layout: 'gala', palette: 'burgundy', font: 'cormorant', occ: 'gala' } },
  { id: 'kn-emerald', name: 'Kỷ niệm lục bảo', spec: { layout: 'seal', palette: 'emerald', font: 'cormorant', occ: 'kyniem' } },
  { id: 'kn-ivory', name: 'Kỷ niệm ngà', spec: { layout: 'artdeco', palette: 'ivory', font: 'prata', occ: 'kyniem' } },
  { id: 'rm-blush', name: 'Ra mắt hồng phấn', spec: { layout: 'botanical', palette: 'blush', font: 'cormorant', occ: 'ramat' } },
  { id: 'ht-modern', name: 'Hội thảo', spec: { layout: 'modern', palette: 'navy', font: 'montserrat', occ: 'hoithao' } },
  { id: 'tg-ivory', name: 'Tân gia lá cành', spec: { layout: 'botanical', palette: 'ivory', font: 'prata', occ: 'tangia' } },
  { id: 'tn-classic', name: 'Tốt nghiệp', spec: { layout: 'classic', palette: 'burgundy', font: 'playfair', occ: 'totnghiep' } },
];
export const defaultIVSpec = (): IVSpec => ({ ...IV_TEMPLATES[2].spec, size: 'dl', fold: false, foil: true, lunar: true, rsvpCard: true });
export const ivHasFoil = (spec: IVSpec) => spec.foil && ivPalette(spec.palette).foil;

// ---------- dữ liệu ----------
export type IVData = Record<string, string>;
export interface IVField { key: string; label: string; ph?: string; half?: boolean; multiline?: boolean; type?: string; group: 'host' | 'event' | 'program' }
export const IV_FIELDS: IVField[] = [
  { key: 'brand', label: 'Đơn vị mời', ph: 'CÔNG TY TNHH AN KHANG', group: 'host' },
  { key: 'host', label: 'Người mời (ký)', ph: 'Trần Quốc Bảo', half: true, group: 'host' },
  { key: 'hostRole', label: 'Chức vụ người mời', ph: 'Giám đốc', half: true, group: 'host' },
  { key: 'kicker', label: 'Tên lễ / sự kiện (dòng nhỏ)', ph: 'LỄ KHAI TRƯƠNG', group: 'event' },
  { key: 'title', label: 'Tiêu đề lớn', ph: 'AN KHANG COFFEE', group: 'event' },
  { key: 'subtitle', label: 'Dòng phụ', ph: 'Chi nhánh Thảo Điền', group: 'event' },
  { key: 'date', label: 'Ngày', type: 'date', half: true, group: 'event' },
  { key: 'time', label: 'Giờ', ph: '18:00', half: true, group: 'event' },
  { key: 'venue', label: 'Địa điểm', ph: 'Khách sạn An Khang – Sảnh Hoa Sen', group: 'event' },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM', group: 'event' },
  { key: 'mapLink', label: 'Link bản đồ (tạo QR chỉ đường)', ph: 'https://maps.app.goo.gl/…', group: 'event' },
  { key: 'agenda', label: 'Chương trình (mỗi dòng: Giờ | Nội dung)', multiline: true, group: 'program' },
  { key: 'dress', label: 'Dress code (tuỳ chọn)', ph: 'Dress code: Đen – Vàng', group: 'program' },
  { key: 'rsvpPhone', label: 'Hotline xác nhận', ph: '0909 123 456', half: true, group: 'program' },
  { key: 'rsvpBy', label: 'Hạn xác nhận', ph: '10/01/2027', half: true, group: 'program' },
  { key: 'rsvpLink', label: 'Link form xác nhận (tạo QR RSVP)', ph: 'https://ankhang.vn/rsvp', group: 'program' },
  { key: 'closing', label: 'Lời kết', group: 'program' },
];
export const defaultIVData = (occ: IVOcc = 'hoinghi'): IVData => ({
  brand: 'CÔNG TY TNHH AN KHANG', host: 'Trần Quốc Bảo', hostRole: 'Giám đốc',
  date: '2027-01-16', venue: 'Khách sạn An Khang – Sảnh Hoa Sen', address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  mapLink: 'https://maps.google.com/?q=12+Nguyen+Hue+Quan+1', rsvpPhone: '0909 123 456', rsvpBy: '10/01/2027', rsvpLink: 'https://ankhang.vn/rsvp',
  recipients: '', ...OCC_TEXT[occ],
});

export interface Recipient { name: string; org: string }
export const GENERIC_RECIPIENT: Recipient = { name: 'Quý khách', org: '' };
export function parseRecipients(text: string): Recipient[] {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 500).map((l) => {
    const [n, ...rest] = l.split('|');
    return { name: (n || '').trim(), org: rest.join('|').trim() };
  }).filter((r) => r.name);
}
export function parseAgenda(text: string): { t: string; d: string }[] {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 8).map((l) => {
    const i = l.indexOf('|');
    return i < 0 ? { t: '', d: l } : { t: l.slice(0, i).trim(), d: l.slice(i + 1).trim() };
  });
}

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export function dateParts(iso: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  const d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(2027, 0, 16);
  const day = d.getDate(), month = d.getMonth() + 1, year = d.getFullYear();
  const l = solarToLunar(day, month, year);
  return {
    day, month, year, weekday: WEEKDAYS[d.getDay()],
    lunar: `Nhằm ngày ${l.day} tháng ${LUNAR_MONTH_NAMES[l.month - 1]}${l.leap ? ' (nhuận)' : ''} năm ${canChiYear(l.year)}`,
    short: `${String(day).padStart(2, '0')} · ${String(month).padStart(2, '0')} · ${year}`,
  };
}

// ---------- đo chữ thật ----------
let mctx: CanvasRenderingContext2D | null = null;
interface TF { fam: string; wt: number; it?: boolean; ls?: number }
export function tw(t: string, size: number, f: TF): number {
  const s = t || '';
  const ls = (f.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.56 + ls;
  const key = `${f.it ? 1 : 0}|${f.wt}|${f.fam}|${s}`;
  let w100 = wCache.get(key);
  if (w100 === undefined) {
    mctx ??= document.createElement('canvas').getContext('2d');
    if (!mctx) return s.length * size * 0.56 + ls;
    mctx.font = `${f.it ? 'italic ' : ''}${f.wt} 100px "${f.fam}"`;
    w100 = mctx.measureText(s).width;
    if (wCache.size > 60000) wCache.clear();
    wCache.set(key, w100);
  }
  return (w100 * size) / 100 + ls;
}
const wCache = new Map<string, number>();
function wrap(text: string, maxW: number, size: number, f: TF): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const nxt = cur ? `${cur} ${w}` : w;
      if (cur && tw(nxt, size, f) > maxW) { out.push(cur); cur = w; } else cur = nxt;
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** chia dòng cân (≤ maxLines), co chữ cho vừa rộng */
function balanced(text: string, maxW: number, size: number, f: TF, maxLines: number): { lines: string[]; size: number } {
  const t = (text || '').trim();
  if (!t) return { lines: [], size };
  if (tw(t, size, f) <= maxW || maxLines <= 1) return { lines: [t], size: Math.min(size, (size * maxW) / Math.max(0.01, tw(t, size, f))) };
  const words = t.split(/\s+/);
  let best = { lines: [t], w: tw(t, size, f) };
  if (words.length > 1) {
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(tw(a, size, f), tw(b, size, f));
      if (w < best.w) best = { lines: [a, b], w };
    }
    if (maxLines >= 3 && best.w > maxW && words.length > 2) {
      for (let i = 1; i < words.length - 1; i++) for (let j = i + 1; j < words.length; j++) {
        const parts = [words.slice(0, i).join(' '), words.slice(i, j).join(' '), words.slice(j).join(' ')];
        const w = Math.max(...parts.map((p) => tw(p, size, f)));
        if (w < best.w) best = { lines: parts, w };
      }
    }
  }
  return { lines: best.lines, size: best.w > maxW ? (size * maxW) / best.w : size };
}

// ---------- tô màu theo chế độ ----------
export type IVMode = 'art' | 'foil3d' | 'foilPrint';
interface Ctx { p: IVPalette; mode: IVMode; foil: boolean; gid: string; disp: IVFont; data: IVData; logo?: string }
function C(c: Ctx, color: string, gold = false): string {
  if (c.mode === 'art') return gold && c.foil ? `url(#${c.gid}-gold)` : (gold ? c.p.gold : color);
  const on = gold && c.foil;
  return c.mode === 'foil3d' ? (on ? '#FFFFFF' : '#000000') : (on ? '#000000' : '#FFFFFF');
}
const bgOf = (c: Ctx) => (c.mode === 'art' ? c.p.bg : c.mode === 'foil3d' ? '#000000' : '#FFFFFF');

// ---------- bộ xếp chồng khối chữ (tự co cả khối để vừa khung) ----------
interface TextBlock { kind: 'text'; text: string; f: TF; size: number; min: number; color: string; gold?: boolean; maxLines?: number; lh?: number; gap?: number; upper?: boolean; prio?: number; tag?: string }
interface RuleBlock { kind: 'rule'; w: number; gap?: number; gold?: boolean; ornament?: boolean; prio?: number }
interface DateBlock { kind: 'date'; gap?: number; size: number }
interface AgendaBlock { kind: 'agenda'; rows: { t: string; d: string }[]; size: number; min: number; gap?: number }
interface QRBlock { kind: 'qr'; items: { text: string; label: string }[]; size: number; gap?: number; prio?: number }
interface MarkBlock { kind: 'mark'; size: number; gap?: number; prio?: number }
type Block = TextBlock | RuleBlock | DateBlock | AgendaBlock | QRBlock | MarkBlock;

function stack(c: Ctx, blocks0: Block[], box: { x: number; y: number; w: number; h: number }, key: string): ReactNode {
  let blocks = blocks0.filter((b) => !(b.kind === 'text' && !b.text.trim()) && !(b.kind === 'agenda' && !b.rows.length) && !(b.kind === 'qr' && !b.items.length));
  const cx = box.x + box.w / 2;
  for (let attempt = 0; attempt < 12; attempt++) {
    // dò thô từ to → nhỏ, gặp k vừa khung đầu tiên thì chia đôi tinh chỉnh lên sát giới hạn
    for (let k = 1; k >= 0.25; k -= 0.07) {
      if (!place(c, blocks, box, cx, k, key)) continue;
      let lo = k, hi = Math.min(1, k + 0.07);
      if (hi > lo) for (let i = 0; i < 5; i++) { const mid = (lo + hi) / 2; if (place(c, blocks, box, cx, mid, key)) lo = mid; else hi = mid; }
      return place(c, blocks, box, cx, lo, key);
    }
    // vẫn tràn → bỏ khối phụ có prio cao nhất
    let worst = -1, wi = -1;
    blocks.forEach((b, i) => { const p = (b as { prio?: number }).prio ?? 0; if (p > worst) { worst = p; wi = i; } });
    if (worst <= 0) break;
    blocks = blocks.filter((_, i) => i !== wi);
  }
  return place(c, blocks, box, cx, 0.25, key, true);
}

function place(c: Ctx, blocks: Block[], box: { x: number; y: number; w: number; h: number }, cx: number, k: number, key: string, force = false): ReactNode | null {
  const parts: { h: number; draw: (top: number) => ReactNode; gap: number }[] = [];
  for (let bi = 0; bi < blocks.length; bi++) {
    const b = blocks[bi];
    const gap = (b.gap ?? 0) * k;
    if (b.kind === 'text') {
      const f = b.f;
      const txt = b.upper ? b.text.toUpperCase() : b.text;
      let size = b.size * k;
      if (size < b.min && !force) return null;
      size = Math.max(size, force ? b.min : 0);
      let lines: string[];
      if ((b.maxLines ?? 2) <= 3) {
        const r = balanced(txt, box.w, size, f, b.maxLines ?? 2);
        if (r.size < b.min && !force) return null;
        size = Math.max(Math.min(size, r.size), force ? b.min : 0);
        lines = r.lines;
        if (lines.some((l) => tw(l, size, f) > box.w + 0.01)) size = Math.min(size, ...lines.map((l) => (size * box.w) / tw(l, size, f)));
      } else {
        lines = wrap(txt, box.w, size, f);
        if (lines.length > (b.maxLines ?? 6)) { if (!force) return null; lines = lines.slice(0, b.maxLines); }
      }
      const lh = b.lh ?? 1.28;
      const h = lines.length * size * lh;
      parts.push({
        h, gap, draw: (top) => (
          <g key={`${key}-t${bi}`}>
            {lines.map((ln, i) => (
              <text key={i} x={cx} y={top + size * lh * i + size * (lh * 0.5 + 0.34)} textAnchor="middle" fontFamily={`'${f.fam}'`} fontWeight={f.wt}
                fontStyle={f.it ? 'italic' : undefined} letterSpacing={f.ls ? f.ls * size : undefined} fontSize={size} fill={C(c, b.color, b.gold)} data-iv={b.tag}>{ln}</text>
            ))}
          </g>
        ),
      });
    } else if (b.kind === 'rule') {
      const w = Math.min(box.w, b.w);
      parts.push({
        h: b.ornament ? 3.2 * Math.max(0.7, k) : 1, gap, draw: (top) => {
          const y = top + (b.ornament ? 1.6 * Math.max(0.7, k) : 0.5);
          const col = C(c, c.p.gold, b.gold ?? true);
          return (
            <g key={`${key}-r${bi}`}>
              <line x1={cx - w / 2} y1={y} x2={b.ornament ? cx - 2.6 : cx + w / 2} y2={y} stroke={col} strokeWidth={0.25} />
              {b.ornament && <><line x1={cx + 2.6} y1={y} x2={cx + w / 2} y2={y} stroke={col} strokeWidth={0.25} /><path d={`M${cx} ${y - 1.4}L${cx + 1.4} ${y}L${cx} ${y + 1.4}L${cx - 1.4} ${y}Z`} fill={col} /></>}
            </g>
          );
        },
      });
    } else if (b.kind === 'date') {
      const dp = dateParts(c.data.date);
      const big = b.size * k;
      const sm = Math.max(2.2, big * 0.3);
      const sideW = Math.min(box.w * 0.34, Math.max(tw(dp.weekday.toUpperCase(), sm, { fam: BODY, wt: 800, ls: 0.12 }), tw(`THÁNG ${dp.month} · ${dp.year}`, sm, { fam: BODY, wt: 800, ls: 0.12 })) + 2);
      const fitK = Math.min(1, (box.w - 4) / (sideW * 2 + big * 1.4 + 6));
      if (fitK < 0.7 && !force) return null;
      const s2 = sm * fitK, b2 = big * fitK;
      const h = b2 * 1.05;
      parts.push({
        h, gap, draw: (top) => {
          const mid = top + h / 2;
          const col = C(c, c.p.gold, true);
          const half = (b2 * 0.7) + 2.5;
          const fl = { fam: BODY, wt: 800, ls: 0.12 };
          const leftT = dp.weekday.toUpperCase(), rightT = `THÁNG ${dp.month} · ${dp.year}`;
          const lw = Math.min(box.w / 2 - half - 1, tw(leftT, s2, fl)), rw = Math.min(box.w / 2 - half - 1, tw(rightT, s2, fl));
          const ls2 = Math.min(s2, (s2 * (box.w / 2 - half - 1)) / Math.max(0.01, tw(leftT, s2, fl))), rs2 = Math.min(s2, (s2 * (box.w / 2 - half - 1)) / Math.max(0.01, tw(rightT, s2, fl)));
          return (
            <g key={`${key}-d${bi}`}>
              <line x1={cx - half - lw} y1={mid - s2 * 0.95} x2={cx - half} y2={mid - s2 * 0.95} stroke={col} strokeWidth={0.22} />
              <line x1={cx - half - lw} y1={mid + s2 * 0.85} x2={cx - half} y2={mid + s2 * 0.85} stroke={col} strokeWidth={0.22} />
              <text x={cx - half - lw / 2} y={mid + ls2 * 0.36} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={800} fontSize={ls2} letterSpacing={0.12 * ls2} fill={C(c, c.p.ink)} data-iv="date">{leftT}</text>
              <text x={cx} y={mid + b2 * 0.36} textAnchor="middle" fontFamily={`'${c.disp.family}'`} fontWeight={c.disp.weight} fontSize={b2} fill={C(c, c.p.gold, true)} data-iv="date">{String(dp.day).padStart(2, '0')}</text>
              <line x1={cx + half} y1={mid - s2 * 0.95} x2={cx + half + rw} y2={mid - s2 * 0.95} stroke={col} strokeWidth={0.22} />
              <line x1={cx + half} y1={mid + s2 * 0.85} x2={cx + half + rw} y2={mid + s2 * 0.85} stroke={col} strokeWidth={0.22} />
              <text x={cx + half + rw / 2} y={mid + rs2 * 0.36} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={800} fontSize={rs2} letterSpacing={0.12 * rs2} fill={C(c, c.p.ink)} data-iv="date">{rightT}</text>
            </g>
          );
        },
      });
    } else if (b.kind === 'agenda') {
      const size = b.size * k;
      if (size < b.min && !force) return null;
      const fT = { fam: BODY, wt: 800 }, fD = { fam: BODY, wt: 600 };
      const tW = Math.max(...b.rows.map((r) => tw(r.t, size, fT)), 0) + (b.rows.some((r) => r.t) ? size * 1.2 : 0);
      const dW = box.w - tW - 2;
      if (dW < box.w * 0.45 && !force) return null;
      const rows = b.rows.map((r) => ({ ...r, lines: wrap(r.d, dW, size, fD) }));
      const lh = 1.32;
      const h = rows.reduce((a, r) => a + Math.max(1, r.lines.length) * size * lh + size * 0.35, 0);
      const inner = tW + Math.max(...rows.map((r) => Math.max(...r.lines.map((l) => tw(l, size, fD)), 0)), 0);
      const x0 = cx - Math.min(box.w, inner + 1) / 2;
      parts.push({
        h, gap, draw: (top) => {
          let y = top;
          return (
            <g key={`${key}-a${bi}`}>
              {rows.map((r, i) => {
                const yy = y; y += Math.max(1, r.lines.length) * size * lh + size * 0.35;
                return (
                  <g key={i}>
                    {r.t && <text x={x0} y={yy + size * (lh * 0.5 + 0.34)} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={size} fill={C(c, c.p.gold, true)} data-iv="agenda">{r.t}</text>}
                    {r.lines.map((ln, j) => <text key={j} x={x0 + tW} y={yy + size * lh * j + size * (lh * 0.5 + 0.34)} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={size} fill={C(c, c.p.ink)} data-iv="agenda">{ln}</text>)}
                  </g>
                );
              })}
            </g>
          );
        },
      });
    } else if (b.kind === 'qr') {
      const q = Math.min(b.size * Math.max(k, 0.75), (box.w - 6) / b.items.length - 4);
      const lab = Math.max(1.9, q * 0.13);
      const h = q + lab * 1.9;
      parts.push({
        h, gap, draw: (top) => {
          const n = b.items.length;
          const span = n * q + (n - 1) * q * 0.45;
          return (
            <g key={`${key}-q${bi}`}>
              {b.items.map((it, i) => {
                const x = cx - span / 2 + i * q * 1.45;
                const qp = qrPath(it.text || 'https://mivy.vn');
                const s = q / (qp.n + 2);
                const lw = tw(it.label, lab, { fam: BODY, wt: 800, ls: 0.06 });
                const ls = Math.min(lab, (lab * (q * 1.4)) / Math.max(0.01, lw));
                return (
                  <g key={i}>
                    <rect x={x} y={top} width={q} height={q} rx={0.8} fill={C(c, '#FFFFFF')} />
                    <g transform={`translate(${x + s} ${top + s}) scale(${s})`}><path d={qp.d} fill={C(c, '#111111')} /></g>
                    <text x={x + q / 2} y={top + q + ls * 1.35} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={800} fontSize={ls} letterSpacing={0.06 * ls} fill={C(c, c.p.sub)} data-iv="qr-label">{it.label}</text>
                  </g>
                );
              })}
            </g>
          );
        },
      });
    } else if (b.kind === 'mark') {
      const s = b.size * Math.max(k, 0.7);
      parts.push({ h: s, gap, draw: (top) => <g key={`${key}-m${bi}`}>{monogram(c, cx, top + s / 2, s)}</g> });
    }
  }
  const total = parts.reduce((a, p, i) => a + p.h + (i ? p.gap : 0), 0);
  if (total > box.h + 0.01 && !force) return null;
  let y = box.y + Math.max(0, (box.h - total) / 2);
  return (
    <g>{parts.map((p, i) => { if (i) y += p.gap; const n = p.draw(y); y += p.h; return n; })}</g>
  );
}

// ---------- logo / chữ lồng ----------
const GENERIC = new Set(['CÔNG', 'TY', 'TNHH', 'CP', 'CỔ', 'PHẦN', 'TẬP', 'ĐOÀN', 'THƯƠNG', 'MẠI', 'DỊCH', 'VỤ', 'MTV', 'VÀ', 'GIA', 'ĐÌNH', 'TRƯỜNG', 'ĐẠI', 'HỌC']);
export function initials(brand: string): string {
  const w = (brand || '').toUpperCase().split(/\s+/).filter((x) => x && !GENERIC.has(x));
  const src = w.length ? w : (brand || 'AK').toUpperCase().split(/\s+/);
  return src.slice(0, 2).map((x) => x[0]).join('') || 'AK';
}
function monogram(c: Ctx, x: number, y: number, s: number): ReactNode {
  if (c.logo && c.mode === 'art') {
    return <image href={c.logo} x={x - s / 2} y={y - s / 2} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
  }
  if (c.logo) return null;
  const ini = initials(c.data.brand);
  const col = C(c, c.p.gold, true);
  const fs = s * (ini.length > 1 ? 0.4 : 0.5);
  return (
    <g>
      <circle cx={x} cy={y} r={s / 2 - 0.2} fill="none" stroke={col} strokeWidth={0.35} />
      <circle cx={x} cy={y} r={s / 2 - 1.3} fill="none" stroke={col} strokeWidth={0.18} />
      <text x={x} y={y + fs * 0.35} textAnchor="middle" fontFamily={`'${c.disp.family}'`} fontWeight={c.disp.weight} fontSize={fs} fill={col}>{ini}</text>
    </g>
  );
}

// ---------- trang trí theo bố cục ----------
function leafSprig(c: Ctx, x: number, y: number, s: number, rot: number): ReactNode {
  const col = C(c, c.p.gold, true);
  const leaves = [0.18, 0.34, 0.5, 0.66, 0.82];
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0 C 6 -4 14 -6 24 -6" fill="none" stroke={col} strokeWidth={0.35 / s * 0.9} />
      {leaves.map((t, i) => {
        const px = 24 * t, py = -6 * t * t * 1.0 - 4 * t * (1 - t);
        return (
          <g key={i}>
            <ellipse cx={px} cy={py - 1.6} rx={1.1} ry={2.3} transform={`rotate(${-30 + i * 4} ${px} ${py - 1.6})`} fill={col} />
            <ellipse cx={px + 0.8} cy={py + 1.5} rx={1.0} ry={2.0} transform={`rotate(${210 - i * 4} ${px + 0.8} ${py + 1.5})`} fill={col} />
          </g>
        );
      })}
    </g>
  );
}
function flourish(c: Ctx, x: number, y: number, sx: number, sy: number, s: number): ReactNode {
  const col = C(c, c.p.gold, true);
  return (
    <g transform={`translate(${x} ${y}) scale(${sx * s} ${sy * s})`} fill="none" stroke={col} strokeWidth={0.28 / s} strokeLinecap="round">
      <path d="M0 9 C0 3 3 0 9 0" />
      <path d="M2.2 9 C2.4 5 5 2.4 9 2.2" />
      <path d="M9 0 C11.5 0 12.5 1.6 11.6 3 C10.8 4.2 9 3.6 9.4 2.4" />
      <path d="M0 9 C0 11.5 1.6 12.5 3 11.6 C4.2 10.8 3.6 9 2.4 9.4" />
      <circle cx={5.2} cy={5.2} r={0.9} fill={col} stroke="none" />
    </g>
  );
}
function star(cx: number, cy: number, r: number): string {
  let d = '';
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4 - Math.PI / 2, rr = i % 2 ? r * 0.28 : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
  }
  return d + 'Z';
}

/** nền + viền + hoạ tiết. Trả về {deco, safe} — safe = khung chữ an toàn */
function decor(c: Ctx, layout: IVLayoutId, W: number, H: number, b: number, face: string): { deco: ReactNode; safe: { x: number; y: number; w: number; h: number } } {
  const m = Math.max(6, W * 0.075);
  const gold = C(c, c.p.gold, true);
  const bgR = <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={bgOf(c)} />;
  const isCover = face === 'cover' || face === 'front';
  switch (layout) {
    case 'classic': {
      const i1 = m * 0.55, i2 = m * 0.55 + 1.6;
      return {
        deco: (
          <>
            {bgR}
            <rect x={i1} y={i1} width={W - i1 * 2} height={H - i1 * 2} fill="none" stroke={gold} strokeWidth={0.6} />
            <rect x={i2} y={i2} width={W - i2 * 2} height={H - i2 * 2} fill="none" stroke={gold} strokeWidth={0.22} />
            {flourish(c, i2 + 1.4, i2 + 1.4, 1, 1, W / 120)}
            {flourish(c, W - i2 - 1.4, i2 + 1.4, -1, 1, W / 120)}
            {flourish(c, i2 + 1.4, H - i2 - 1.4, 1, -1, W / 120)}
            {flourish(c, W - i2 - 1.4, H - i2 - 1.4, -1, -1, W / 120)}
          </>
        ),
        safe: { x: i2 + 6, y: i2 + 9, w: W - (i2 + 6) * 2, h: H - (i2 + 9) * 2 },
      };
    }
    case 'artdeco': {
      const i1 = m * 0.5, st = 5;
      const p = `M${i1 + st} ${i1}H${W - i1 - st}L${W - i1} ${i1 + st}V${H - i1 - st}L${W - i1 - st} ${H - i1}H${i1 + st}L${i1} ${H - i1 - st}V${i1 + st}Z`;
      const i2 = i1 + 1.8;
      const p2 = `M${i2 + st} ${i2}H${W - i2 - st}L${W - i2} ${i2 + st}V${H - i2 - st}L${W - i2 - st} ${H - i2}H${i2 + st}L${i2} ${H - i2 - st}V${i2 + st}Z`;
      const fan = (y: number, dir: number) => {
        const r = W * 0.16;
        return (
          <g>
            {Array.from({ length: 9 }, (_, k) => {
              const a = Math.PI + (k / 8) * Math.PI;
              return <line key={k} x1={W / 2} y1={y} x2={W / 2 + Math.cos(a) * r} y2={y + dir * Math.abs(Math.sin(a)) * r * 0.62} stroke={gold} strokeWidth={0.22} />;
            })}
            <path d={`M${W / 2 - r * 0.42} ${y} A ${r * 0.42} ${r * 0.26} 0 0 ${dir > 0 ? 0 : 1} ${W / 2 + r * 0.42} ${y}`} fill="none" stroke={gold} strokeWidth={0.3} />
          </g>
        );
      };
      return {
        deco: (<>{bgR}<path d={p} fill="none" stroke={gold} strokeWidth={0.55} /><path d={p2} fill="none" stroke={gold} strokeWidth={0.2} />{fan(i2 + 0.3, 1)}{fan(H - i2 - 0.3, -1)}</>),
        safe: { x: i2 + 6, y: i2 + W * 0.13, w: W - (i2 + 6) * 2, h: H - (i2 + W * 0.13) * 2 },
      };
    }
    case 'modern': {
      const band = isCover ? H * 0.2 : H * 0.09;
      return {
        deco: (
          <>
            {bgR}
            <rect x={-b} y={-b} width={W + b * 2} height={band + b} fill={c.mode === 'art' ? c.p.accent : bgOf(c)} />
            <rect x={-b} y={band} width={W + b * 2} height={0.8} fill={gold} />
            <rect x={-b} y={H - 4} width={W + b * 2} height={4 + b} fill={c.mode === 'art' ? c.p.accent : bgOf(c)} />
          </>
        ),
        safe: { x: m, y: band + 7, w: W - m * 2, h: H - band - 7 - 10 },
      };
    }
    case 'gala': {
      const rays = Array.from({ length: 28 }, (_, k) => {
        const a = (k / 28) * Math.PI * 2;
        const r0 = W * 0.18, r1 = W * (k % 2 ? 0.48 : 0.62);
        return <line key={k} x1={W / 2 + Math.cos(a) * r0} y1={H * 0.3 + Math.sin(a) * r0} x2={W / 2 + Math.cos(a) * r1} y2={H * 0.3 + Math.sin(a) * r1} stroke={gold} strokeWidth={0.15} opacity={c.mode === 'art' ? 0.55 : 1} />;
      });
      const stars = [[0.12, 0.06], [0.88, 0.1], [0.08, 0.5], [0.92, 0.46], [0.14, 0.93], [0.86, 0.95], [0.5, 0.035]].map(([sx, sy], k) => (
        <path key={k} d={star(W * sx, H * sy, 1.6 + (k % 3) * 0.5)} fill={gold} />
      ));
      return {
        deco: (<>{bgR}{isCover && <g>{rays}</g>}{stars}<rect x={m * 0.5} y={m * 0.5} width={W - m} height={H - m} fill="none" stroke={gold} strokeWidth={0.3} /></>),
        safe: { x: m + 3, y: m + 8, w: W - (m + 3) * 2, h: H - (m + 8) * 2 },
      };
    }
    case 'botanical': {
      const s = W / 70;
      return {
        deco: (
          <>
            {bgR}
            {leafSprig(c, 2, 4, s, 38)}
            {leafSprig(c, W - 2, H - 4, s, 218)}
            <rect x={m * 0.6} y={m * 0.6} width={W - m * 1.2} height={H - m * 1.2} fill="none" stroke={gold} strokeWidth={0.2} />
          </>
        ),
        safe: { x: m + 4, y: m + W * 0.2, w: W - (m + 4) * 2, h: H - (m + W * 0.2) * 2 },
      };
    }
    default: { // seal: viền + huy hiệu ruy băng ở đầu (chỉ mặt bìa/trước)
      const i1 = m * 0.55;
      const sealR = W * 0.11;
      const sy = i1 + 4 + sealR;
      const seal = isCover ? (
        <g>
          <path d={`M${W / 2 - sealR * 0.55} ${sy + sealR * 0.6}L${W / 2 - sealR * 0.9} ${sy + sealR * 1.75}L${W / 2 - sealR * 0.45} ${sy + sealR * 1.45}L${W / 2 - sealR * 0.2} ${sy + sealR * 1.85}L${W / 2} ${sy + sealR * 0.7}Z`} fill={c.mode === 'art' ? c.p.accent : C(c, c.p.accent)} />
          <path d={`M${W / 2 + sealR * 0.55} ${sy + sealR * 0.6}L${W / 2 + sealR * 0.9} ${sy + sealR * 1.75}L${W / 2 + sealR * 0.45} ${sy + sealR * 1.45}L${W / 2 + sealR * 0.2} ${sy + sealR * 1.85}L${W / 2} ${sy + sealR * 0.7}Z`} fill={c.mode === 'art' ? c.p.accent : C(c, c.p.accent)} />
          {Array.from({ length: 24 }, (_, k) => { const a = (k / 24) * Math.PI * 2; return <circle key={k} cx={W / 2 + Math.cos(a) * sealR} cy={sy + Math.sin(a) * sealR} r={sealR * 0.16} fill={gold} />; })}
          <circle cx={W / 2} cy={sy} r={sealR} fill={gold} />
          <circle cx={W / 2} cy={sy} r={sealR * 0.8} fill="none" stroke={C(c, c.p.bg)} strokeWidth={0.3} />
          <text x={W / 2} y={sy + sealR * 0.2} textAnchor="middle" fontFamily={`'${c.disp.family}'`} fontWeight={c.disp.weight} fontSize={sealR * 0.62} fill={C(c, c.p.bg)}>{initials(c.data.brand)}</text>
        </g>
      ) : null;
      const top = isCover ? sy + sealR * 1.95 + 3 : i1 + 10;
      return {
        deco: (<>{bgR}<rect x={i1} y={i1} width={W - i1 * 2} height={H - i1 * 2} fill="none" stroke={gold} strokeWidth={0.5} /><rect x={i1 + 1.4} y={i1 + 1.4} width={W - i1 * 2 - 2.8} height={H - i1 * 2 - 2.8} fill="none" stroke={gold} strokeWidth={0.18} />{seal}</>),
        safe: { x: i1 + 7, y: top, w: W - (i1 + 7) * 2, h: H - top - i1 - 9 },
      };
    }
  }
}

// ---------- nội dung từng mặt ----------
export type IVFace = 'front' | 'back' | 'cover' | 'backOut' | 'inLeft' | 'inRight' | 'rsvp';
interface FaceProps { spec: IVSpec; data: IVData; face: IVFace; recipient?: Recipient; mode?: IVMode; logo?: string }

function faceBlocks(c: Ctx, spec: IVSpec, face: IVFace, rcp: Recipient, W: number): Block[] {
  const d = c.data, p = c.p, f = c.disp;
  const s = W / 100; // tỉ lệ theo khổ DL
  const DISP: TF = { fam: f.family, wt: f.weight };
  const KICK: TF = { fam: BODY, wt: 800, ls: 0.16 };
  const BODYF: TF = { fam: BODY, wt: 600 };
  const ITAL: TF = { fam: SERIF, wt: 500, it: true };
  const SCR: TF = { fam: SCRIPT, wt: 400 };
  const dp = dateParts(d.date);
  const agenda = parseAgenda(d.agenda);
  const qrs = [
    ...(d.rsvpLink ? [{ text: d.rsvpLink, label: 'XÁC NHẬN' }] : []),
    ...(d.mapLink ? [{ text: d.mapLink, label: 'CHỈ ĐƯỜNG' }] : []),
  ];
  const inviteHead: Block[] = [
    { kind: 'text', text: 'Trân trọng kính mời', f: ITAL, size: 4.6 * s, min: 2.6, color: p.sub, maxLines: 1, gap: 4 * s, tag: 'invite' },
    { kind: 'text', text: rcp.name || 'Quý khách', f: SCR, size: 9.5 * s, min: 4.2, color: p.gold, gold: true, maxLines: 2, lh: 1.15, gap: 1.2 * s, tag: 'recipient' },
    { kind: 'text', text: rcp.org, f: BODYF, size: 3.2 * s, min: 2, color: p.sub, maxLines: 2, gap: 0.6 * s, tag: 'recipient-org' },
    { kind: 'text', text: 'Tới dự', f: ITAL, size: 4 * s, min: 2.4, color: p.sub, maxLines: 1, gap: 2.4 * s },
  ];
  const eventCore: Block[] = [
    { kind: 'text', text: d.kicker, f: KICK, size: 3.4 * s, min: 2, color: p.gold, gold: true, maxLines: 2, gap: 1.6 * s, upper: true, tag: 'kicker' },
    { kind: 'text', text: d.title, f: DISP, size: 9 * s, min: 3.8, color: p.ink, maxLines: 5, lh: 1.14, gap: 1.6 * s, tag: 'title' },
    { kind: 'text', text: d.subtitle, f: ITAL, size: 4.2 * s, min: 2.3, color: p.sub, maxLines: 2, gap: 1.2 * s, prio: 3, tag: 'subtitle' },
  ];
  const when: Block[] = [
    { kind: 'rule', w: 34 * s, gap: 3 * s, ornament: true },
    { kind: 'text', text: d.time ? `Vào lúc ${d.time}` : '', f: BODYF, size: 3.5 * s, min: 2, color: p.ink, maxLines: 1, gap: 2.4 * s, tag: 'time' },
    { kind: 'date', size: 11 * s, gap: 1.6 * s },
    { kind: 'text', text: spec.lunar ? `(${dp.lunar})` : '', f: ITAL, size: 3.2 * s, min: 1.9, color: p.sub, maxLines: 2, gap: 1.4 * s, prio: 2, tag: 'lunar' },
  ];
  const where: Block[] = [
    { kind: 'text', text: 'Tại', f: ITAL, size: 3.6 * s, min: 2.1, color: p.sub, maxLines: 1, gap: 2.4 * s },
    { kind: 'text', text: d.venue, f: { fam: BODY, wt: 800 }, size: 4 * s, min: 2.2, color: p.ink, maxLines: 3, gap: 0.6 * s, tag: 'venue' },
    { kind: 'text', text: d.address, f: BODYF, size: 3.1 * s, min: 1.9, color: p.sub, maxLines: 4, gap: 0.6 * s, tag: 'address' },
  ];
  const sign: Block[] = [
    { kind: 'text', text: d.closing, f: ITAL, size: 3.4 * s, min: 2, color: p.sub, maxLines: 3, gap: 3 * s, prio: 4, tag: 'closing' },
    { kind: 'text', text: d.hostRole || d.brand ? 'Trân trọng,' : '', f: ITAL, size: 3.4 * s, min: 2, color: p.sub, maxLines: 1, gap: 2.4 * s },
    { kind: 'text', text: d.hostRole, f: KICK, size: 2.8 * s, min: 1.8, color: p.gold, gold: true, maxLines: 1, upper: true, gap: 0.8 * s, tag: 'host-role' },
    { kind: 'text', text: d.host, f: SCR, size: 7 * s, min: 3.4, color: p.ink, maxLines: 1, gap: 0.4 * s, tag: 'host' },
  ];
  const program: Block[] = [
    { kind: 'text', text: 'CHƯƠNG TRÌNH', f: KICK, size: 3.6 * s, min: 2.1, color: p.gold, gold: true, maxLines: 1, tag: 'program' },
    { kind: 'rule', w: 22 * s, gap: 1.6 * s, ornament: true },
    { kind: 'agenda', rows: agenda, size: 3.3 * s, min: 1.9, gap: 3 * s },
    { kind: 'text', text: d.dress, f: ITAL, size: 3.4 * s, min: 2, color: p.ink, maxLines: 2, gap: 3 * s, prio: 1, tag: 'dress' },
  ];
  const rsvp: Block[] = [
    { kind: 'rule', w: 46 * s, gap: 4 * s },
    { kind: 'text', text: 'Vui lòng xác nhận tham dự', f: KICK, size: 2.9 * s, min: 1.8, color: p.gold, gold: true, maxLines: 2, upper: true, gap: 3 * s, tag: 'rsvp' },
    { kind: 'text', text: [d.rsvpPhone, d.rsvpBy ? `trước ${d.rsvpBy}` : ''].filter(Boolean).join(' · '), f: BODYF, size: 3.4 * s, min: 2, color: p.ink, maxLines: 2, gap: 1 * s, tag: 'rsvp-phone' },
    { kind: 'qr', items: qrs, size: 17 * s, gap: 2.4 * s, prio: 5 },
  ];
  const head: Block[] = [{ kind: 'mark', size: 13 * s, prio: 7 }, { kind: 'text', text: d.brand, f: KICK, size: 2.9 * s, min: 1.8, color: p.ink, maxLines: 2, upper: true, gap: 2 * s, prio: 8, tag: 'brand' }];

  switch (face) {
    case 'front': return [...(spec.layout === 'seal' ? [] : head), ...inviteHead, ...eventCore, ...when, ...where];
    case 'back': return [...program, ...rsvp, ...sign];
    case 'cover': return [
      ...(spec.layout === 'seal' ? [] : [{ kind: 'mark', size: 16 * s, prio: 3 } as Block]),
      { kind: 'text', text: d.brand, f: KICK, size: 3 * s, min: 1.8, color: p.sub, maxLines: 2, upper: true, gap: 3 * s, prio: 4, tag: 'brand' },
      { kind: 'text', text: 'THƯ MỜI', f: { fam: BODY, wt: 800, ls: 0.4 }, size: 3.4 * s, min: 2, color: p.gold, gold: true, maxLines: 1, gap: 8 * s, prio: 5, tag: 'letter' },
      { kind: 'text', text: d.kicker, f: KICK, size: 3.8 * s, min: 2.2, color: p.gold, gold: true, maxLines: 2, gap: 3 * s, upper: true, tag: 'kicker' },
      { kind: 'text', text: d.title, f: DISP, size: 12 * s, min: 4.4, color: p.ink, maxLines: 5, lh: 1.12, gap: 2.4 * s, tag: 'title' },
      { kind: 'text', text: d.subtitle, f: ITAL, size: 4.6 * s, min: 2.4, color: p.sub, maxLines: 2, gap: 2 * s, prio: 2, tag: 'subtitle' },
      { kind: 'rule', w: 30 * s, gap: 6 * s, ornament: true, prio: 1 },
      { kind: 'text', text: dp.short, f: { fam: BODY, wt: 800, ls: 0.2 }, size: 4 * s, min: 2.2, color: p.ink, maxLines: 1, gap: 3 * s, tag: 'date' },
    ];
    case 'backOut': return [
      { kind: 'mark', size: 12 * s, prio: 2 },
      { kind: 'text', text: d.brand, f: KICK, size: 2.8 * s, min: 1.8, color: p.ink, maxLines: 2, upper: true, gap: 2.4 * s, tag: 'brand' },
      { kind: 'text', text: d.venue, f: { fam: BODY, wt: 800 }, size: 3.2 * s, min: 2, color: p.ink, maxLines: 3, gap: 6 * s, tag: 'venue' },
      { kind: 'text', text: d.address, f: BODYF, size: 2.8 * s, min: 1.8, color: p.sub, maxLines: 4, gap: 0.8 * s, tag: 'address' },
      { kind: 'qr', items: d.mapLink ? [{ text: d.mapLink, label: 'QUÉT ĐỂ CHỈ ĐƯỜNG' }] : [], size: 20 * s, gap: 4 * s, prio: 1 },
    ];
    case 'inLeft': return [...program, ...rsvp];
    case 'inRight': return [...inviteHead, ...eventCore, ...when, ...where, ...sign.map((b) => (b.kind === 'text' && b.tag === 'closing' ? { ...b, prio: 6 } : b))];
    default: return [];
  }
}

function RsvpCard({ c, gid }: { c: Ctx; gid: string }) {
  const W = RSVP_SIZE.w, H = RSVP_SIZE.h, d = c.data, p = c.p;
  const q = 30;
  const qp = qrPath(d.rsvpLink || d.rsvpPhone || 'RSVP');
  const sc = q / (qp.n + 2);
  const gold = C(c, p.gold, true);
  return (
    <g>
      <rect x={-IV_BLEED_MM} y={-IV_BLEED_MM} width={W + IV_BLEED_MM * 2} height={H + IV_BLEED_MM * 2} fill={bgOf(c)} />
      <rect x={3} y={3} width={W - 6} height={H - 6} fill="none" stroke={gold} strokeWidth={0.4} />
      <rect x={W - q - 9} y={(H - q) / 2} width={q} height={q} rx={0.8} fill={C(c, '#FFFFFF')} />
      <g transform={`translate(${W - q - 9 + sc} ${(H - q) / 2 + sc}) scale(${sc})`}><path d={qp.d} fill={C(c, '#111111')} /></g>
      {(() => {
        const tx = 9, maxW = W - q - 9 - tx - 4;
        const k: TF = { fam: BODY, wt: 800, ls: 0.14 };
        const t1 = 'XÁC NHẬN THAM DỰ';
        const s1 = Math.min(3.6, (3.6 * maxW) / tw(t1, 3.6, k));
        const disp: TF = { fam: c.disp.family, wt: c.disp.weight };
        let tl = balanced(d.title || '', maxW, 5.2, disp, 2);
        if (tl.size < 3.2 && d.kicker) tl = balanced(d.kicker, maxW, 4.4, { fam: BODY, wt: 800 }, 2); // tên dài quá → dùng tên lễ
        if (tl.size < 2.4) tl = { lines: [], size: 2.4 };
        const body: TF = { fam: BODY, wt: 600 };
        const l3 = d.rsvpPhone ? `Hotline: ${d.rsvpPhone}` : '';
        const s3 = l3 ? Math.min(2.9, (2.9 * maxW) / tw(l3, 2.9, body)) : 2.9;
        const l4 = d.rsvpBy ? `Vui lòng phản hồi trước ${d.rsvpBy}` : 'Vui lòng phản hồi sớm';
        const it: TF = { fam: SERIF, wt: 500, it: true };
        const s4 = Math.min(3.1, (3.1 * maxW) / tw(l4, 3.1, it));
        let y = 15;
        return (
          <g>
            <text x={tx} y={y} fontFamily={`'${BODY}'`} fontWeight={800} fontSize={s1} letterSpacing={0.14 * s1} fill={gold} data-iv="rsvp-card">{t1}</text>
            {tl.lines.map((ln, i) => { y += tl.size * (i ? 1.15 : 1.6); return <text key={i} x={tx} y={y} fontFamily={`'${c.disp.family}'`} fontWeight={c.disp.weight} fontSize={tl.size} fill={C(c, p.ink)} data-iv="rsvp-card">{ln}</text>; })}
            <line x1={tx} y1={y + 3} x2={tx + Math.min(maxW, 26)} y2={y + 3} stroke={gold} strokeWidth={0.25} />
            {l3 && <text x={tx} y={y + 9} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={s3} fill={C(c, p.ink)} data-iv="rsvp-card">{l3}</text>}
            <text x={tx} y={y + (l3 ? 14 : 9)} fontFamily={`'${SERIF}'`} fontStyle="italic" fontWeight={500} fontSize={s4} fill={C(c, p.sub)} data-iv="rsvp-card">{l4}</text>
            <text x={W - q / 2 - 9} y={(H + q) / 2 + 4.2} textAnchor="middle" fontFamily={`'${BODY}'`} fontWeight={800} fontSize={2.2} letterSpacing={0.3} fill={C(c, p.sub)} data-iv="rsvp-card">QUÉT ĐỂ XÁC NHẬN</text>
          </g>
        );
      })()}
      <defs><GoldDef c={c} gid={gid} /></defs>
    </g>
  );
}

function GoldDef({ c, gid }: { c: Ctx; gid: string }) {
  const g = c.p.gold;
  return (
    <linearGradient id={`${gid}-gold`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor={g} />
      <stop offset="0.45" stopColor="#F6E3A8" />
      <stop offset="0.6" stopColor={g} />
      <stop offset="1" stopColor="#9C7A32" />
    </linearGradient>
  );
}

function makeCtx(spec: IVSpec, data: IVData, mode: IVMode, logo: string | undefined, gid: string): Ctx {
  return { p: ivPalette(spec.palette), mode, foil: ivHasFoil(spec), gid, disp: ivFont(spec.font), data, logo };
}

/** 1 mặt thiệp (đúng khổ, không lề xén) — dùng cho xem trước + texture 3D + mẫu */
export function InvitationFace({ spec, data, face, recipient, mode = 'art', logo, bleed = false, style }: FaceProps & { bleed?: boolean; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const c = makeCtx(spec, data, mode, logo, `iv${uid}`);
  if (face === 'rsvp') {
    const b = bleed ? IV_BLEED_MM : 0;
    return (
      <svg viewBox={`${-b} ${-b} ${RSVP_SIZE.w + b * 2} ${RSVP_SIZE.h + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
        <RsvpCard c={c} gid={c.gid} />
      </svg>
    );
  }
  const sz = ivSize(spec.size);
  const W = sz.w, H = sz.h;
  const b = bleed ? IV_BLEED_MM : 0;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <defs><GoldDef c={c} gid={c.gid} /></defs>
      <FaceBody c={c} spec={spec} face={face} rcp={recipient || GENERIC_RECIPIENT} W={W} H={H} b={b} />
    </svg>
  );
}

function FaceBody({ c, spec, face, rcp, W, H, b }: { c: Ctx; spec: IVSpec; face: IVFace; rcp: Recipient; W: number; H: number; b: number }) {
  const { deco, safe } = decor(c, spec.layout, W, H, b, face);
  return (
    <g data-face={face}>
      {deco}
      {stack(c, faceBlocks(c, spec, face, rcp, W), safe, face)}
    </g>
  );
}

export type IVSheet = 'front' | 'back' | 'outside' | 'inside';
/** tờ in: thiệp phẳng = 1 mặt; gấp đôi = 2 mặt cạnh nhau (trái | phải). bleed → có lề xén */
export function InvitationSheet({ spec, data, sheet, recipient, mode = 'art', logo, bleed = false, style }: {
  spec: IVSpec; data: IVData; sheet: IVSheet; recipient?: Recipient; mode?: IVMode; logo?: string; bleed?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const c = makeCtx(spec, data, mode, logo, `ivs${uid}`);
  const sz = ivSize(spec.size);
  const W = sz.w, H = sz.h;
  const b = bleed ? IV_BLEED_MM : 0;
  const rcp = recipient || GENERIC_RECIPIENT;
  if (sheet === 'front' || sheet === 'back') {
    return (
      <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
        <defs><GoldDef c={c} gid={c.gid} /></defs>
        <FaceBody c={c} spec={spec} face={sheet} rcp={rcp} W={W} H={H} b={b} />
      </svg>
    );
  }
  const [L, R]: IVFace[] = sheet === 'outside' ? ['backOut', 'cover'] : ['inLeft', 'inRight'];
  return (
    <svg viewBox={`${-b} ${-b} ${W * 2 + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <defs>
        <GoldDef c={c} gid={c.gid} />
        <clipPath id={`${c.gid}-cl`}><rect x={-b} y={-b} width={W + b} height={H + b * 2} /></clipPath>
        <clipPath id={`${c.gid}-cr`}><rect x={0} y={-b} width={W + b} height={H + b * 2} /></clipPath>
      </defs>
      <g clipPath={`url(#${c.gid}-cl)`}><FaceBody c={c} spec={spec} face={L} rcp={rcp} W={W} H={H} b={b} /></g>
      <g transform={`translate(${W} 0)`} clipPath={`url(#${c.gid}-cr)`}><FaceBody c={c} spec={spec} face={R} rcp={rcp} W={W} H={H} b={b} /></g>
      {mode === 'art' && !bleed && <line x1={W} y1={0} x2={W} y2={H} stroke={c.p.light ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.16)'} strokeWidth={0.25} strokeDasharray="1.2 1" />}
    </svg>
  );
}
