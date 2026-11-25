'use client';
// Huy hiệu cài áo (button pin): 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT → nhiều mẫu, render code 100%.
// Đơn vị vẽ = mm, tâm huy hiệu ở (0,0). Huy hiệu bấm máy: mặt nhìn thấy Ø D, bản in Ø Dc lớn hơn để GẤP MÉP
// ra sau (44mm → in 56mm). Nền luôn tràn tới hết vòng gấp; chữ/hình quan trọng nằm trong vùng an toàn (D − 5mm).
// Chữ chạy vòng: mỗi ký tự 1 <text> xoay quanh tâm → outline được ra path cho file in.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ ----------
export interface PinSize { id: string; name: string; d: number; dc: number }
export const PIN_SIZES: PinSize[] = [
  { id: '32', name: 'Ø32mm', d: 32, dc: 45 },
  { id: '44', name: 'Ø44mm', d: 44, dc: 56 },
  { id: '58', name: 'Ø58mm', d: 58, dc: 70 },
  { id: '75', name: 'Ø75mm', d: 75, dc: 88 },
];
export const pinSize = (id: string) => PIN_SIZES.find((s) => s.id === id) || PIN_SIZES[1];
export const SAFE_INSET = 2.5; // mm: mép cong của mặt vòm — chữ lùi vào trong

export type PinBack = 'pin' | 'magnet' | 'opener' | 'mirror';
export const PIN_BACKS: { id: PinBack; name: string; note: string }[] = [
  { id: 'pin', name: 'Kim cài', note: 'Ghim áo, balo, túi — phổ biến nhất' },
  { id: 'magnet', name: 'Nam châm', note: 'Không thủng áo, dán tủ lạnh được' },
  { id: 'opener', name: 'Khui bia', note: 'Mặt sau là đồ khui nắp chai' },
  { id: 'mirror', name: 'Gương', note: 'Mặt sau là gương soi nhỏ' },
];

// ---------- font ----------
export interface PinFont { id: string; name: string; family: string; weight: number }
export const PIN_FONTS: PinFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald (cao)', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const pinFont = (id: string) => PIN_FONTS.find((f) => f.id === id) || PIN_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Lobster';
export const PIN_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Lobster&display=swap');`;

export function usePinFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pin-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pin-fonts'; link.rel = 'stylesheet';
        link.href = PIN_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '700 40px "Oswald"', '800 40px "Baloo 2"', '800 40px "Playfair Display"', '400 40px "Lobster"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu ----------
export interface PinPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; onAccent: string; deco: string }
export const PIN_PALETTES: PinPalette[] = [
  { id: 'navy', name: 'Navy vàng', bg: '#F4F1EA', bg2: '#E8E2D4', ink: '#13233F', sub: '#4B5A73', accent: '#1B3358', onAccent: '#FFFFFF', deco: '#D4A63A' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#F0FAF7', bg2: '#D7F0E8', ink: '#0B2F2A', sub: '#3F6B62', accent: '#0F8A6C', onAccent: '#FFFFFF', deco: '#FFC145' },
  { id: 'red', name: 'Đỏ thể thao', bg: '#FFFFFF', bg2: '#F2F2F2', ink: '#1A1A1A', sub: '#555555', accent: '#D62839', onAccent: '#FFFFFF', deco: '#1A1A1A' },
  { id: 'green', name: 'Xanh rừng', bg: '#FFFBF0', bg2: '#F1E9D2', ink: '#14301F', sub: '#4F6B57', accent: '#1F5C3A', onAccent: '#FFFFFF', deco: '#E9B949' },
  { id: 'sunny', name: 'Nắng Sài Gòn', bg: '#FFD23F', bg2: '#FFC21A', ink: '#1C1C1C', sub: '#3A3A3A', accent: '#E63946', onAccent: '#FFFFFF', deco: '#FFFFFF' },
  { id: 'kraft', name: 'Kraft cà phê', bg: '#E9D9BF', bg2: '#DCC7A4', ink: '#3A2416', sub: '#6E4E36', accent: '#6B4226', onAccent: '#F6EBD9', deco: '#B07D4F' },
  { id: 'black', name: 'Đen tối giản', bg: '#141414', bg2: '#222222', ink: '#F5F1E8', sub: '#BDB6A8', accent: '#F5F1E8', onAccent: '#141414', deco: '#E0B15A' },
  { id: 'pink', name: 'Hồng ngọt', bg: '#FFE4EC', bg2: '#FFC9D9', ink: '#5B1A31', sub: '#8E4A62', accent: '#E0457B', onAccent: '#FFFFFF', deco: '#FFFFFF' },
  { id: 'tet', name: 'Đỏ Tết', bg: '#C8102E', bg2: '#A50D25', ink: '#FFE7A8', sub: '#FFD27A', accent: '#F5C451', onAccent: '#8E0B1F', deco: '#F5C451' },
  { id: 'gold', name: 'Vàng kim', bg: '#F7E7B4', bg2: '#EFD58A', ink: '#7A0F1C', sub: '#8F3B22', accent: '#B3121F', onAccent: '#FFF3D0', deco: '#C8102E' },
  { id: 'grad', name: 'Xanh tốt nghiệp', bg: '#0E2347', bg2: '#16305C', ink: '#FFFFFF', sub: '#C7D3EA', accent: '#E3B33F', onAccent: '#0E2347', deco: '#E3B33F' },
  { id: 'blue', name: 'Xanh dương', bg: '#EAF3FF', bg2: '#D2E5FF', ink: '#0C2340', sub: '#3E5A80', accent: '#1565C0', onAccent: '#FFFFFF', deco: '#FFB300' },
  { id: 'orange', name: 'Cam năng động', bg: '#FFF4E8', bg2: '#FFE2C2', ink: '#3A1D05', sub: '#7A4B23', accent: '#F26B1D', onAccent: '#FFFFFF', deco: '#2B7A78' },
];
export const pinPalette = (id: string) => PIN_PALETTES.find((p) => p.id === id) || PIN_PALETTES[0];

// ---------- bố cục + chữ mẫu ----------
export type PinLayoutId = 'event' | 'club' | 'campaign' | 'cafe' | 'photo' | 'tet' | 'grad' | 'name';
export type PinData = Record<string, string>;
export interface PinFieldDef { key: string; label: string; ph?: string }
export interface PinLayout { id: PinLayoutId; name: string; fields: PinFieldDef[]; nameKey?: string; photo?: boolean }
export const PIN_LAYOUTS: PinLayout[] = [
  { id: 'event', name: 'Sự kiện · hội thảo', nameKey: 'sub', fields: [
    { key: 'top', label: 'Chữ vòng trên (tên sự kiện)' }, { key: 'title', label: 'Chữ to giữa (vai trò)' },
    { key: 'sub', label: 'Dòng dưới (tên người)' }, { key: 'bottom', label: 'Chữ vòng dưới (ngày · nơi)' }] },
  { id: 'club', name: 'CLB · đội nhóm', fields: [
    { key: 'top', label: 'Chữ vòng trên (tên CLB)' }, { key: 'title', label: 'Chữ trong khiên (viết tắt / số áo)' },
    { key: 'bottom', label: 'Chữ vòng dưới' }] },
  { id: 'campaign', name: 'Chiến dịch · khẩu hiệu', fields: [
    { key: 'top', label: 'Dòng trên' }, { key: 'title', label: 'Dòng to (sau trái tim)' }, { key: 'sub', label: 'Dòng nhỏ dưới' }] },
  { id: 'cafe', name: 'Merch quán cà phê', fields: [
    { key: 'top', label: 'Chữ vòng trên (tên quán)' }, { key: 'title', label: 'Dòng giữa (dưới ly)' }, { key: 'bottom', label: 'Chữ vòng dưới (slogan)' }] },
  { id: 'photo', name: 'Ảnh · cặp đôi', photo: true, fields: [
    { key: 'title', label: 'Chữ trên ruy băng (tên)' }, { key: 'sub', label: 'Dòng nhỏ (ngày kỷ niệm)' }] },
  { id: 'tet', name: 'Tết', fields: [
    { key: 'top', label: 'Chữ vòng trên' }, { key: 'title', label: 'Chữ to giữa' }, { key: 'bottom', label: 'Chữ vòng dưới (lời chúc / tên công ty)' }] },
  { id: 'grad', name: 'Tốt nghiệp', nameKey: 'sub', fields: [
    { key: 'title', label: 'Chữ to (năm / lớp)' }, { key: 'sub', label: 'Tên người' }, { key: 'bottom', label: 'Chữ vòng dưới (trường)' }] },
  { id: 'name', name: 'Bảng tên', nameKey: 'title', fields: [
    { key: 'top', label: 'Dòng chào trên' }, { key: 'title', label: 'Tên (to nhất)' }, { key: 'sub', label: 'Chức vụ / nhóm' }] },
];
export const pinLayout = (id: string) => PIN_LAYOUTS.find((l) => l.id === id) || PIN_LAYOUTS[0];

export const PIN_SAMPLES: Record<PinLayoutId, PinData> = {
  event: { top: 'HỘI THẢO CHUYỂN ĐỔI SỐ 2027', title: 'DIỄN GIẢ', sub: 'Quốc Bảo', bottom: 'TP.HCM · 12.03.2027' },
  club: { top: 'CLB BÓNG ĐÁ AN KHANG', title: 'AK', bottom: 'THÀNH LẬP 2019' },
  campaign: { top: 'TÔI', title: 'SÀI GÒN', sub: 'Sống xanh mỗi ngày' },
  cafe: { top: 'MỘC SƠN COFFEE', title: 'SINCE 2020', bottom: 'CÀ PHÊ MỘC · RANG XAY TẠI CHỖ' },
  photo: { title: 'Bảo & Hà', sub: '14.02.2027' },
  tet: { top: 'XUÂN ĐINH MÙI 2027', title: 'PHÚC', bottom: 'AN KHANG THỊNH VƯỢNG' },
  grad: { title: '2027', sub: 'Thu Hà', bottom: 'ĐẠI HỌC KINH TẾ · KHOÁ 49' },
  name: { top: 'XIN CHÀO, TÔI LÀ', title: 'Gia Khánh', sub: 'Tình nguyện viên' },
};

export interface PinSpec { layout: PinLayoutId; palette: string; font: string; size: string; back: PinBack }
export interface PinTemplate { id: string; name: string; spec: Pick<PinSpec, 'layout' | 'palette' | 'font'> }
const T = (layout: PinLayoutId, palette: string, font: string, name: string): PinTemplate => ({ id: `${layout}-${palette}`, name, spec: { layout, palette, font } });
export const PIN_TEMPLATES: PinTemplate[] = [
  T('event', 'navy', 'montserrat', 'Hội thảo navy'),
  T('event', 'teal', 'bvp', 'Sự kiện xanh ngọc'),
  T('club', 'red', 'oswald', 'CLB đỏ thể thao'),
  T('club', 'green', 'oswald', 'Đội nhóm xanh rừng'),
  T('campaign', 'sunny', 'baloo', 'Tôi yêu Sài Gòn'),
  T('cafe', 'kraft', 'montserrat', 'Quán cà phê kraft'),
  T('cafe', 'black', 'oswald', 'Cà phê đen tối giản'),
  T('photo', 'pink', 'baloo', 'Ảnh cặp đôi'),
  T('tet', 'tet', 'playfair', 'Tết đỏ kim'),
  T('tet', 'gold', 'playfair', 'Tết vàng kim'),
  T('grad', 'grad', 'montserrat', 'Tốt nghiệp'),
  T('name', 'blue', 'bvp', 'Bảng tên xanh'),
  T('name', 'orange', 'baloo', 'Bảng tên cam'),
];
export const defaultPinSpec: PinSpec = { layout: 'event', palette: 'navy', font: 'montserrat', size: '44', back: 'pin' };

// danh sách tên (chế độ hàng loạt): mỗi dòng 1 người
export const parseNames = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 300);

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function measure(text: string, family: string, weight: number): number {
  if (typeof document === 'undefined') return text.length * 60;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return text.length * 60;
  mctx.font = `${weight} 100px "${family}"`;
  return mctx.measureText(text).width; // ở cỡ 100
}
const textW = (t: string, family: string, weight: number, size: number, ls = 0) => (measure(t, family, weight) * size) / 100 + ls * Math.max(0, Array.from(t).length - 1);
const f2 = (n: number) => Math.round(n * 100) / 100;
/** bề rộng dây cung của vòng tròn bán kính r tại khoảng cách y (lấy chỗ hẹp nhất của dòng chữ cao h) */
const chord = (r: number, y: number, h: number) => {
  const yy = Math.max(Math.abs(y), Math.abs(y - h)); // dòng chữ từ y-h (đỉnh) tới y (chân)
  return yy >= r ? 0 : 2 * Math.sqrt(r * r - yy * yy);
};

interface TOpts { family: string; weight: number; size: number; fill: string; ls?: number; min?: number; r?: number; maxW?: number }
/** chữ thẳng canh giữa x=0, chân chữ tại y; tự co cho vừa dây cung vòng r (hoặc maxW) */
function Line({ text, y, o }: { text: string; y: number; o: TOpts }) {
  if (!text) return null;
  let s = o.size;
  const cap = 0.74;
  for (let k = 0; k < 40; k++) {
    const lim = Math.min(o.maxW ?? Infinity, o.r ? chord(o.r, y, s * cap) * 0.94 : Infinity);
    if (textW(text, o.family, o.weight, s, o.ls ? (o.ls * s) : 0) <= lim) break;
    s *= 0.95;
  }
  // chạm cỡ tối thiểu mà vẫn dài → bỏ giãn chữ trước khi để tràn
  const minS = o.min ?? 0.8;
  let ls = o.ls ? o.ls * s : 0;
  if (s < minS) { s = minS; ls = 0; }
  return <text x={0} y={f2(y)} textAnchor="middle" fontFamily={`"${o.family}"`} fontWeight={o.weight} fontSize={f2(s)} letterSpacing={ls ? f2(ls) : undefined} fill={o.fill}>{text}</text>;
}

/** cỡ chữ 1 dòng vừa dây cung (giống Line) */
function fitLine(text: string, y: number, o: TOpts): number {
  let s = o.size;
  for (let k = 0; k < 40; k++) {
    const lim = Math.min(o.maxW ?? Infinity, o.r ? chord(o.r, y, s * 0.74) * 0.94 : Infinity);
    if (textW(text, o.family, o.weight, s, o.ls ? o.ls * s : 0) <= lim) break;
    s *= 0.95;
  }
  return s;
}
/** tên dài: 1 dòng nếu còn đủ to, không thì bẻ 2 dòng cân nhau (chân dòng 2 tại y) */
const needsTwo = (text: string, y: number, o: TOpts, minOne: number) => {
  const t = (text || '').trim();
  return t.split(/\s+/).length >= 2 && fitLine(t, y, o) < minOne;
};
function Fit2({ text, y, o, minOne, k2 = 0.82 }: { text: string; y: number; o: TOpts; minOne: number; k2?: number }) {
  const t = (text || '').trim();
  if (!t) return null;
  const words = t.split(/\s+/);
  if (!needsTwo(t, y, o, minOne)) return <Line text={t} y={y} o={o} />;
  let best = 1, bestD = Infinity;
  for (let i = 1; i < words.length; i++) {
    const d = Math.abs(textW(words.slice(0, i).join(' '), o.family, o.weight, 10) - textW(words.slice(i).join(' '), o.family, o.weight, 10));
    if (d < bestD) { bestD = d; best = i; }
  }
  const a = words.slice(0, best).join(' '), b = words.slice(best).join(' ');
  const s2 = Math.min(o.size * k2, fitLine(a, y - o.size * k2, { ...o, size: o.size * k2 }), fitLine(b, y, { ...o, size: o.size * k2 }));
  const lh = s2 * 1.02;
  return (
    <g>
      <Line text={a} y={y - lh} o={{ ...o, size: s2 }} />
      <Line text={b} y={y} o={{ ...o, size: s2 }} />
    </g>
  );
}

const ARC_MIN = 1.3; // mm — chữ vòng nhỏ hơn thì in khó đọc
const ARC_MAX_SPAN = 176;
/** cỡ chữ + góc cung thực dùng: co chữ cho vừa span; chạm cỡ tối thiểu thì nới cung (tối đa 176°) */
function arcPlan(text: string, rb: number, span: number, o: TOpts) {
  const chars = Array.from(text || '');
  const ls = (sz: number) => (o.ls ?? 0.06) * sz;
  const total = (sz: number) => chars.reduce((a, ch) => a + textW(ch, o.family, o.weight, sz) + ls(sz), -ls(sz));
  const arcOf = (deg: number) => rb * (deg * Math.PI / 180);
  let s = o.size;
  for (let k = 0; k < 80 && total(s) > arcOf(span) && s > ARC_MIN; k++) s = Math.max(ARC_MIN, s * 0.96);
  let used = chars.length ? (total(s) / rb) * (180 / Math.PI) : 0;
  if (used > ARC_MAX_SPAN) { s *= ARC_MAX_SPAN / used; used = ARC_MAX_SPAN; } // quá dài: đành nhỏ hơn mức tối thiểu
  return { s, used, total, ls };
}
/** vòng còn chỗ cho hoạ tiết 2 bên (chữ vòng trên/dưới chưa lấn tới ngang tâm) */
const sideRoom = (...plans: { text: string; rb: number; span: number; o: TOpts }[]) => plans.every((q) => arcPlan(q.text, q.rb, q.span, q.o).used <= 158);

/** chữ chạy cung tròn quanh tâm; top: chân chữ ở bán kính rb, chữ dựng ra ngoài; bottom: chữ dựng vào trong, đọc trái→phải */
function ArcText({ text, rb, side, span, o }: { text: string; rb: number; side: 'top' | 'bottom'; span: number; o: TOpts }) {
  const chars = Array.from(text || '');
  if (!chars.length) return null;
  const { s, total, ls } = arcPlan(text, rb, span, o);
  const tot = total(s);
  const out: ReactNode[] = [];
  let pos = -tot / 2;
  chars.forEach((ch, i) => {
    const w = textW(ch, o.family, o.weight, s);
    const mid = pos + w / 2;
    pos += w + ls(s);
    if (!ch.trim()) return;
    const phi = mid / rb; // rad, dương = sang phải
    const deg = (phi * 180) / Math.PI;
    const x = rb * Math.sin(phi);
    const y = side === 'top' ? -rb * Math.cos(phi) : rb * Math.cos(phi);
    out.push(<text key={i} x={f2(x)} y={f2(y)} textAnchor="middle" transform={`rotate(${f2(side === 'top' ? deg : -deg)} ${f2(x)} ${f2(y)})`} fontFamily={`"${o.family}"`} fontWeight={o.weight} fontSize={f2(s)} fill={o.fill}>{ch}</text>);
  });
  return <g>{out}</g>;
}

// ---------- hình vẽ bằng code ----------
const heart = (cx: number, cy: number, s: number) =>
  `M${f2(cx)} ${f2(cy + s * 0.42)}C${f2(cx - s * 0.62)} ${f2(cy + 0.02 * s)} ${f2(cx - s * 0.6)} ${f2(cy - s * 0.46)} ${f2(cx - s * 0.27)} ${f2(cy - s * 0.46)}C${f2(cx - s * 0.1)} ${f2(cy - s * 0.46)} ${f2(cx)} ${f2(cy - s * 0.34)} ${f2(cx)} ${f2(cy - s * 0.24)}C${f2(cx)} ${f2(cy - s * 0.34)} ${f2(cx + s * 0.1)} ${f2(cy - s * 0.46)} ${f2(cx + s * 0.27)} ${f2(cy - s * 0.46)}C${f2(cx + s * 0.6)} ${f2(cy - s * 0.46)} ${f2(cx + s * 0.62)} ${f2(cy + 0.02 * s)} ${f2(cx)} ${f2(cy + s * 0.42)}Z`;
const star = (cx: number, cy: number, r: number) => {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    d += `${i ? 'L' : 'M'}${f2(cx + rr * Math.cos(a))} ${f2(cy + rr * Math.sin(a))}`;
  }
  return d + 'Z';
};
const shield = (cx: number, cy: number, s: number) =>
  `M${f2(cx)} ${f2(cy - s * 0.5)}L${f2(cx + s * 0.42)} ${f2(cy - s * 0.36)}L${f2(cx + s * 0.42)} ${f2(cy + 0.02 * s)}C${f2(cx + s * 0.42)} ${f2(cy + s * 0.28)} ${f2(cx + s * 0.2)} ${f2(cy + s * 0.44)} ${f2(cx)} ${f2(cy + s * 0.53)}C${f2(cx - s * 0.2)} ${f2(cy + s * 0.44)} ${f2(cx - s * 0.42)} ${f2(cy + s * 0.28)} ${f2(cx - s * 0.42)} ${f2(cy + 0.02 * s)}L${f2(cx - s * 0.42)} ${f2(cy - s * 0.36)}Z`;
const ring = (ro: number, ri: number) =>
  `M${f2(-ro)} 0a${f2(ro)} ${f2(ro)} 0 1 0 ${f2(ro * 2)} 0a${f2(ro)} ${f2(ro)} 0 1 0 ${f2(-ro * 2)} 0Z M${f2(-ri)} 0a${f2(ri)} ${f2(ri)} 0 1 0 ${f2(ri * 2)} 0a${f2(ri)} ${f2(ri)} 0 1 0 ${f2(-ri * 2)} 0Z`;
// tia nắng: các múi quạt xen kẽ
const rays = (r: number, n: number) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a0 = (i * 2 * Math.PI) / n, a1 = a0 + Math.PI / n;
    d += `M0 0L${f2(r * Math.cos(a0))} ${f2(r * Math.sin(a0))}L${f2(r * Math.cos(a1))} ${f2(r * Math.sin(a1))}Z`;
  }
  return d;
};
// hoa mai 5 cánh
function Mai({ x, y, r, fill, core }: { x: number; y: number; r: number; fill: string; core: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        return <circle key={i} cx={f2(x + r * 0.55 * Math.cos(a))} cy={f2(y + r * 0.55 * Math.sin(a))} r={f2(r * 0.5)} fill={fill} />;
      })}
      <circle cx={f2(x)} cy={f2(y)} r={f2(r * 0.28)} fill={core} />
    </g>
  );
}
// ly cà phê nóng (thân + quai + đĩa + khói)
function Cup({ y, s, fill, steam }: { y: number; s: number; fill: string; steam: string }) {
  const w = s, h = s * 0.72;
  return (
    <g>
      {[-0.2, 0.05, 0.3].map((k, i) => (
        <path key={i} d={`M${f2(w * k - w * 0.08)} ${f2(y - h * 0.62)}c${f2(-w * 0.12)} ${f2(-h * 0.18)} ${f2(w * 0.12)} ${f2(-h * 0.28)} 0 ${f2(-h * 0.46)}`} fill="none" stroke={steam} strokeWidth={f2(s * 0.055)} strokeLinecap="round" />
      ))}
      <path d={`M${f2(-w * 0.5)} ${f2(y - h * 0.5)}H${f2(w * 0.38)}L${f2(w * 0.3)} ${f2(y + h * 0.32)}Q${f2(w * 0.27)} ${f2(y + h * 0.5)} ${f2(w * 0.1)} ${f2(y + h * 0.5)}H${f2(-w * 0.22)}Q${f2(-w * 0.39)} ${f2(y + h * 0.5)} ${f2(-w * 0.42)} ${f2(y + h * 0.32)}Z`} fill={fill} />
      <path d={`M${f2(w * 0.36)} ${f2(y - h * 0.3)}h${f2(w * 0.08)}a${f2(w * 0.15)} ${f2(w * 0.15)} 0 0 1 0 ${f2(w * 0.3)}h${f2(-w * 0.12)}`} fill="none" stroke={fill} strokeWidth={f2(s * 0.07)} />
      <rect x={f2(-w * 0.62)} y={f2(y + h * 0.56)} width={f2(w * 1.12)} height={f2(s * 0.07)} rx={f2(s * 0.035)} fill={fill} />
    </g>
  );
}
// mũ tốt nghiệp
function Cap({ y, s, fill, tassel }: { y: number; s: number; fill: string; tassel: string }) {
  return (
    <g>
      <path d={`M0 ${f2(y - s * 0.32)}L${f2(s * 0.62)} ${f2(y - s * 0.08)}L0 ${f2(y + s * 0.16)}L${f2(-s * 0.62)} ${f2(y - s * 0.08)}Z`} fill={fill} />
      <path d={`M${f2(-s * 0.34)} ${f2(y + 0.03 * s)}V${f2(y + s * 0.3)}Q0 ${f2(y + s * 0.46)} ${f2(s * 0.34)} ${f2(y + s * 0.3)}V${f2(y + 0.03 * s)}L0 ${f2(y + s * 0.16)}Z`} fill={fill} />
      <path d={`M${f2(s * 0.08)} ${f2(y - s * 0.06)}L${f2(s * 0.48)} ${f2(y + s * 0.04)}V${f2(y + s * 0.34)}`} fill="none" stroke={tassel} strokeWidth={f2(s * 0.035)} />
      <rect x={f2(s * 0.44)} y={f2(y + s * 0.3)} width={f2(s * 0.08)} height={f2(s * 0.16)} rx={f2(s * 0.02)} fill={tassel} />
    </g>
  );
}

// ---------- mặt huy hiệu ----------
export interface PinFaceProps { spec: PinSpec; data: PinData; photo?: string; uid: string }
/** nội dung 1 huy hiệu, tâm (0,0), nền phủ tới Ø dc (+1mm) */
export function PinFace({ spec, data, photo, uid }: PinFaceProps) {
  const sz = pinSize(spec.size), p = pinPalette(spec.palette), f = pinFont(spec.font);
  const R = sz.d / 2, Rc = sz.dc / 2 + 1, rs = R - SAFE_INSET; // rs = bán kính vùng an toàn
  const k = R / 22; // hệ số theo khổ 44mm
  const disp = { family: f.family, weight: f.weight };
  const body = { family: BODY, weight: 800 };
  const bg = <circle r={f2(Rc)} fill={p.bg} />;
  const clip = `${uid}-photo`;
  let content: ReactNode;

  switch (spec.layout) {
    case 'event': {
      // vành màu chứa chữ vòng trên/dưới, giữa nền sáng: vai trò to + tên (tên dài → 2 dòng, đẩy vai trò lên)
      const ri = rs * 0.7, band = rs - ri;
      const nameO: TOpts = { family: SCRIPT, weight: 400, size: 4.6 * k, fill: p.ink, r: ri - 1.4 * k, min: 1.6 };
      const two = needsTwo(data.sub || '', 10.6 * k, nameO, 3.2 * k);
      const aT = { text: (data.top || '').toUpperCase(), rb: ri + band * 0.24, span: 150, o: { ...body, size: band * 0.56, fill: p.onAccent, ls: 0.08 } };
      const aB = { text: (data.bottom || '').toUpperCase(), rb: rs - band * 0.24, span: 120, o: { ...body, size: band * 0.5, fill: p.onAccent, ls: 0.06 } };
      content = (
        <>
          <circle r={f2(Rc)} fill={p.accent} />
          <circle r={f2(ri)} fill={p.bg} />
          <circle r={f2(ri - 0.9 * k)} fill="none" stroke={p.deco} strokeWidth={f2(0.45 * k)} />
          <ArcText {...aT} side="top" />
          <ArcText {...aB} side="bottom" />
          {sideRoom(aT, aB) && [-1, 1].map((sx) => <path key={sx} d={star(sx * (ri + band * 0.5), 0, band * 0.18)} fill={p.deco} />)}
          <Line text={(data.title || '').toUpperCase()} y={(two ? 0.4 : 3.2) * k} o={{ ...disp, size: (two ? 6.4 : 7.4) * k, fill: p.accent, r: ri - 1.6 * k, ls: 0.02 }} />
          <rect x={f2(-4.5 * k)} y={f2((two ? 2.2 : 5.3) * k)} width={f2(9 * k)} height={f2(0.5 * k)} rx={f2(0.25 * k)} fill={p.deco} />
          <Fit2 text={data.sub || ''} y={10.6 * k} minOne={3.2 * k} o={nameO} />
        </>
      );
      break;
    }
    case 'club': {
      const ri = rs * 0.7, band = rs - ri;
      const aT = { text: (data.top || '').toUpperCase(), rb: ri + band * 0.22, span: 160, o: { ...disp, size: band * 0.6, fill: p.onAccent, ls: 0.05 } };
      const aB = { text: (data.bottom || '').toUpperCase(), rb: rs - band * 0.22, span: 100, o: { ...body, size: band * 0.42, fill: p.onAccent, ls: 0.1 } };
      content = (
        <>
          <circle r={f2(Rc)} fill={p.accent} />
          <circle r={f2(ri)} fill={p.bg} />
          <path d={ring(ri, ri - 0.6 * k)} fill={p.deco} fillRule="evenodd" />
          <ArcText {...aT} side="top" />
          <ArcText {...aB} side="bottom" />
          {sideRoom(aT, aB) && [-1, 1].map((sx) => <path key={sx} d={star(sx * (ri + band * 0.5), 0, band * 0.2)} fill={p.onAccent} />)}
          <path d={shield(0, 0.4 * k, 20 * k)} fill={p.accent} />
          <path d={shield(0, 0.4 * k, 16.6 * k)} fill="none" stroke={p.onAccent} strokeWidth={f2(0.55 * k)} />
          {[-1, 0, 1].map((i) => <path key={i} d={star(i * 3 * k, -5.3 * k, 1.05 * k)} fill={p.onAccent} />)}
          <Line text={(data.title || '').toUpperCase()} y={4.6 * k} o={{ ...disp, size: 8.6 * k, fill: p.onAccent, maxW: 11.5 * k }} />
        </>
      );
      break;
    }
    case 'campaign': {
      content = (
        <>
          {bg}
          <path d={rays(Rc, 24)} fill={p.bg2} />
          <circle r={f2(rs + 0.4 * k)} fill="none" stroke={p.ink} strokeWidth={f2(0.5 * k)} strokeDasharray={`${f2(1.2 * k)} ${f2(1 * k)}`} />
          <Line text={(data.top || '').toUpperCase()} y={-5.6 * k} o={{ ...disp, size: 6.6 * k, fill: p.ink, r: rs - 1 * k }} />
          <path d={heart(0, -0.4 * k, 9.4 * k)} fill={p.accent} />
          <Line text={(data.title || '').toUpperCase()} y={10.6 * k} o={{ ...disp, size: 7.2 * k, fill: p.ink, r: rs - 1.2 * k }} />
          <Line text={data.sub || ''} y={15.4 * k} o={{ family: BODY, weight: 600, size: 2.7 * k, fill: p.sub, r: rs - 0.8 * k, min: 1.2 }} />
        </>
      );
      break;
    }
    case 'cafe': {
      const ri = rs * 0.72, band = rs - ri;
      const aT = { text: (data.top || '').toUpperCase(), rb: ri + band * 0.26, span: 150, o: { ...disp, size: band * 0.56, fill: p.ink, ls: 0.1 } };
      const aB = { text: (data.bottom || '').toUpperCase(), rb: rs - band * 0.26, span: 125, o: { ...body, size: band * 0.4, fill: p.sub, ls: 0.06 } };
      content = (
        <>
          {bg}
          <circle r={f2(rs - band * 0.02)} fill="none" stroke={p.accent} strokeWidth={f2(0.5 * k)} />
          <circle r={f2(ri)} fill="none" stroke={p.accent} strokeWidth={f2(0.5 * k)} />
          <ArcText {...aT} side="top" />
          <ArcText {...aB} side="bottom" />
          {sideRoom(aT, aB) && [-1, 1].map((sx) => <circle key={sx} cx={f2(sx * (ri + band * 0.5))} r={f2(band * 0.1)} fill={p.accent} />)}
          <Cup y={-1.6 * k} s={12 * k} fill={p.accent} steam={p.deco} />
          <Line text={(data.title || '').toUpperCase()} y={9.6 * k} o={{ ...body, size: 2.8 * k, fill: p.ink, r: ri - 1 * k, ls: 0.22 }} />
        </>
      );
      break;
    }
    case 'photo': {
      const rib = 4.6 * k, ry = 8.6 * k;
      content = (
        <>
          <defs><clipPath id={clip}><circle r={f2(Rc)} /></clipPath></defs>
          {bg}
          {photo
            ? <image href={photo} x={f2(-Rc)} y={f2(-Rc)} width={f2(Rc * 2)} height={f2(Rc * 2)} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${clip})`} />
            : (
              <g>
                <circle r={f2(Rc)} fill={p.bg2} />
                {Array.from({ length: 22 }).map((_, i) => {
                  const a = i * 2.4, rr = (Math.sqrt(i + 0.5) / Math.sqrt(22)) * Rc;
                  return <path key={i} d={heart(rr * Math.cos(a), rr * Math.sin(a), (2 + (i % 3)) * k)} fill={i % 2 ? p.bg : p.accent} opacity={0.55} />;
                })}
                <path d={heart(0, -3.4 * k, 13 * k)} fill={p.accent} />
              </g>
            )}
          {/* ruy băng tên vắt ngang */}
          <path d={`M${f2(-rs - 2 * k)} ${f2(ry - rib / 2)}H${f2(rs + 2 * k)}l${f2(-1.6 * k)} ${f2(rib / 2)}l${f2(1.6 * k)} ${f2(rib / 2)}H${f2(-rs - 2 * k)}l${f2(1.6 * k)} ${f2(-rib / 2)}Z`} fill={p.accent} />
          <Line text={data.title || ''} y={ry + rib * 0.27} o={{ family: SCRIPT, weight: 400, size: rib * 0.82, fill: p.onAccent, r: rs - 1.2 * k, min: 1.4 }} />
          <Line text={data.sub || ''} y={ry + rib + 3.2 * k} o={{ family: BODY, weight: 800, size: 2.5 * k, fill: photo ? '#FFFFFF' : p.ink, r: rs - 0.6 * k, ls: 0.14, min: 1.2 }} />
        </>
      );
      break;
    }
    case 'tet': {
      const ri = rs * 0.72, band = rs - ri;
      content = (
        <>
          {bg}
          <path d={rays(Rc, 36)} fill={p.bg2} opacity={0.55} />
          <circle r={f2(ri)} fill={p.bg} stroke={p.deco} strokeWidth={f2(0.55 * k)} />
          <circle r={f2(rs)} fill="none" stroke={p.deco} strokeWidth={f2(0.35 * k)} />
          <ArcText text={(data.top || '').toUpperCase()} rb={ri + band * 0.26} side="top" span={150} o={{ ...body, size: band * 0.52, fill: p.ink, ls: 0.08 }} />
          <ArcText text={(data.bottom || '').toUpperCase()} rb={rs - band * 0.26} side="bottom" span={140} o={{ ...body, size: band * 0.44, fill: p.ink, ls: 0.06 }} />
          <Mai x={-ri * 0.6} y={-ri * 0.56} r={2.6 * k} fill={p.deco} core={p.accent === p.deco ? p.bg2 : p.accent} />
          <Mai x={ri * 0.64} y={-ri * 0.46} r={1.6 * k} fill={p.deco} core={p.accent === p.deco ? p.bg2 : p.accent} />
          <Mai x={ri * 0.46} y={ri * 0.66} r={2.1 * k} fill={p.deco} core={p.accent === p.deco ? p.bg2 : p.accent} />
          <Line text={data.title || ''} y={4.2 * k} o={{ ...disp, size: 10.4 * k, fill: p.ink, r: ri - 2.6 * k }} />
        </>
      );
      break;
    }
    case 'grad': {
      const ri = rs * 0.72, band = rs - ri;
      const nameO: TOpts = { family: SCRIPT, weight: 400, size: 3.9 * k, fill: p.ink, r: ri - 1 * k, min: 1.4 };
      const two = needsTwo(data.sub || '', 11.4 * k, nameO, 2.9 * k);
      const aB = { text: (data.bottom || '').toUpperCase(), rb: rs - band * 0.26, span: 150, o: { ...body, size: band * 0.42, fill: p.ink, ls: 0.06 } };
      content = (
        <>
          {bg}
          <circle r={f2(ri)} fill={p.bg2} />
          <circle r={f2(ri)} fill="none" stroke={p.accent} strokeWidth={f2(0.5 * k)} />
          <ArcText {...aB} side="bottom" />
          <ArcText text="CLASS OF" rb={ri + band * 0.26} side="top" span={70} o={{ ...body, size: band * 0.48, fill: p.accent, ls: 0.3 }} />
          {sideRoom(aB) && [-1, 1].map((sx) => <path key={sx} d={star(sx * (ri + band * 0.5), 0, band * 0.17)} fill={p.accent} />)}
          <Cap y={-7.2 * k} s={11 * k} fill={p.ink} tassel={p.accent} />
          <Line text={data.title || ''} y={(two ? 4.8 : 6.4) * k} o={{ ...disp, size: (two ? 7.4 : 8.6) * k, fill: p.accent, r: ri - 1.2 * k }} />
          <Fit2 text={data.sub || ''} y={11.4 * k} minOne={2.9 * k} o={nameO} />
        </>
      );
      break;
    }
    default: { // name — bảng tên
      const top = -5.2 * k;
      content = (
        <>
          {bg}
          <rect x={f2(-Rc)} y={f2(-Rc)} width={f2(Rc * 2)} height={f2(Rc + top)} fill={p.accent} />
          <rect x={f2(-Rc)} y={f2(9.6 * k)} width={f2(Rc * 2)} height={f2(Rc)} fill={p.accent} />
          <Line text={(data.top || '').toUpperCase()} y={top - 3 * k} o={{ ...body, size: 3 * k, fill: p.onAccent, r: rs - 0.6 * k, ls: 0.08, min: 1.2 }} />
          <Fit2 text={data.title || ''} y={5.6 * k} minOne={5.6 * k} k2={0.62} o={{ ...disp, size: 8.4 * k, fill: p.ink, r: rs - 0.8 * k, min: 1.8 }} />
          <Line text={data.sub || ''} y={14.2 * k} o={{ family: BODY, weight: 600, size: 2.7 * k, fill: p.onAccent, r: rs - 0.6 * k, min: 1.2 }} />
        </>
      );
    }
  }
  return <g>{content}</g>;
}

// ---------- SVG xuất ----------
export type PinMode = 'face' | 'print' | 'guide';
/**
 * face  = chỉ mặt nhìn thấy (Ø D) — thumbnail, PNG
 * print = bản in tới đường cắt Ø Dc (có vòng gấp mép) — texture 3D
 * guide = bản in + vạch: đường cắt, mép mặt, vùng an toàn — xem trước phẳng
 */
export function PinSvg({ spec, data, photo, mode = 'face', style }: { spec: PinSpec; data: PinData; photo?: string; mode?: PinMode; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const sz = pinSize(spec.size);
  const R = sz.d / 2, Rc = sz.dc / 2;
  const half = mode === 'face' ? R : mode === 'print' ? Rc : Rc + 1.5;
  const clipR = mode === 'face' ? R : Rc;
  return (
    <svg viewBox={`${f2(-half)} ${f2(-half)} ${f2(half * 2)} ${f2(half * 2)}`} xmlns="http://www.w3.org/2000/svg" style={style} data-pin-mode={mode}>
      <defs><clipPath id={`${uid}-c`}><circle r={f2(clipR)} /></clipPath></defs>
      <g clipPath={`url(#${uid}-c)`}><PinFace spec={spec} data={data} photo={photo} uid={uid} /></g>
      {mode === 'guide' && (
        <g fill="none" data-guide="1">
          <circle r={f2(Rc)} stroke="#EC008C" strokeWidth={0.3} />
          <circle r={f2(R)} stroke="#FFFFFF" strokeWidth={0.35} strokeDasharray="1.2 0.9" />
          <circle r={f2(R)} stroke="#1F2937" strokeWidth={0.18} strokeDasharray="1.2 0.9" strokeDashoffset={1.05} />
          <circle r={f2(R - SAFE_INSET)} stroke="#22C55E" strokeWidth={0.22} strokeDasharray="0.6 0.6" />
        </g>
      )}
    </svg>
  );
}

// ---------- tờ A4 in–cắt ----------
export const PIN_SHEET = { wMm: 210, hMm: 297, marginMm: 8, gapMm: 3 };
export function pinSheetFit(sizeId: string) {
  const dc = pinSize(sizeId).dc;
  const cols = Math.max(1, Math.floor((PIN_SHEET.wMm - PIN_SHEET.marginMm * 2 + PIN_SHEET.gapMm) / (dc + PIN_SHEET.gapMm)));
  const rows = Math.max(1, Math.floor((PIN_SHEET.hMm - PIN_SHEET.marginMm * 2 - 6 + PIN_SHEET.gapMm) / (dc + PIN_SHEET.gapMm)));
  return { cols, rows, per: cols * rows, dc };
}
/** danh sách huy hiệu (dữ liệu từng con) — hàng loạt theo tên hoặc lặp 1 mẫu */
export function pinItems(spec: PinSpec, data: PinData, names: string[], qty: number): PinData[] {
  const key = pinLayout(spec.layout).nameKey;
  if (key && names.length) return names.map((n) => ({ ...data, [key]: n }));
  return Array.from({ length: Math.max(1, Math.min(2000, qty)) }, () => data);
}
export const pinPages = (spec: PinSpec, items: number) => Math.max(1, Math.ceil(items / pinSheetFit(spec.size).per));

/** 1 tờ A4: lớp "In" (mỗi con tràn tới đường cắt) + lớp "CutContour" (đường cắt tròn, spot Magenta) */
export function PinSheetSvg({ spec, items, photo, page = 0, style }: { spec: PinSpec; items: PinData[]; photo?: string; page?: number; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const fit = pinSheetFit(spec.size), sz = pinSize(spec.size);
  const Rc = sz.dc / 2;
  const list = items.slice(page * fit.per, (page + 1) * fit.per);
  const gw = fit.cols * fit.dc + (fit.cols - 1) * PIN_SHEET.gapMm, gh = fit.rows * fit.dc + (fit.rows - 1) * PIN_SHEET.gapMm;
  const x0 = (PIN_SHEET.wMm - gw) / 2 + Rc, y0 = (PIN_SHEET.hMm - 6 - gh) / 2 + Rc;
  const cells = list.map((d, i) => ({ d, x: x0 + (i % fit.cols) * (fit.dc + PIN_SHEET.gapMm), y: y0 + Math.floor(i / fit.cols) * (fit.dc + PIN_SHEET.gapMm) }));
  const total = pinPages(spec, items.length);
  return (
    <svg viewBox={`0 0 ${PIN_SHEET.wMm} ${PIN_SHEET.hMm}`} width={`${PIN_SHEET.wMm}mm`} height={`${PIN_SHEET.hMm}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-pin-sheet={page}>
      <rect width={PIN_SHEET.wMm} height={PIN_SHEET.hMm} fill="#FFFFFF" />
      <defs><clipPath id={`${uid}-cc`}><circle r={f2(Rc)} /></clipPath></defs>
      <g id="In">
        {cells.map((c, i) => (
          <g key={i} transform={`translate(${f2(c.x)} ${f2(c.y)})`}>
            <g clipPath={`url(#${uid}-cc)`}><PinFace spec={spec} data={c.d} photo={photo} uid={`${uid}-${i}`} /></g>
          </g>
        ))}
      </g>
      <g id="CutContour" fill="none" stroke="#EC008C" strokeWidth={0.25}>
        <title>CutContour</title>
        {cells.map((c, i) => <circle key={i} cx={f2(c.x)} cy={f2(c.y)} r={f2(Rc)} />)}
      </g>
      <text x={PIN_SHEET.marginMm} y={PIN_SHEET.hMm - 5} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={2.6} fill="#9CA3AF">
        {`Mivy · huy hiệu ${sz.name} · in Ø${sz.dc}mm (gấp mép) · tờ ${page + 1}/${total} · ${list.length} con`}
      </text>
    </svg>
  );
}
