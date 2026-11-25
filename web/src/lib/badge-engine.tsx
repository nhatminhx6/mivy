'use client';
// Thẻ đeo nhân viên / thẻ sự kiện + dây đeo: 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT, render code 100%.
// In hàng loạt: dán danh sách (Họ tên | Chức vụ | Mã NV) → mỗi người 1 thẻ, mặt sau dùng chung.
// Đơn vị: 10 = 1mm. Lỗ bấm (slot) chỉ vẽ ở bản xem — file in không có, chữ luôn né vùng lỗ.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { textW } from './flyer-engine';
import { qrPath } from './flyer-qr';

export { FL_FONT_CSS as BD_FONT_CSS, useFLFonts as useBDFonts } from './flyer-engine';

const K = 10;
const BODY = 'Be Vietnam Pro';

// ---------- loại + khổ ----------
export type BDKind = 'staff' | 'event';
export interface BDSize { id: string; kind: BDKind; name: string; wMm: number; hMm: number }
export const BD_SIZES: BDSize[] = [
  { id: 'v54', kind: 'staff', name: 'Dọc 54 × 86 mm', wMm: 54, hMm: 86 },
  { id: 'h86', kind: 'staff', name: 'Ngang 86 × 54 mm', wMm: 86, hMm: 54 },
  { id: 'e90', kind: 'event', name: '90 × 130 mm', wMm: 90, hMm: 130 },
  { id: 'e105', kind: 'event', name: 'A6 105 × 148 mm', wMm: 105, hMm: 148 },
];
export const bdSize = (id: string) => BD_SIZES.find((s) => s.id === id) || BD_SIZES[0];
export const BD_BLEED_MM = 2;
export const LANYARD_LEN_MM = 900;

// ---------- font (đều có TTF ở /public/fonts → file in outline được) ----------
export interface BDFont { id: string; name: string; family: string; weight: number }
export const BD_FONTS: BDFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
];
export const bdFont = (id: string) => BD_FONTS.find((f) => f.id === id) || BD_FONTS[0];

// ---------- bảng màu ----------
export interface BDPalette { id: string; name: string; accent: string; deep: string; accent2: string; paper: string; ink: string; sub: string; onAccent: string }
export const BD_PALETTES: BDPalette[] = [
  { id: 'navy', name: 'Navy', accent: '#1F3A68', deep: '#12264A', accent2: '#E0B44C', paper: '#FFFFFF', ink: '#14213D', sub: '#5A6781', onAccent: '#FFFFFF' },
  { id: 'teal', name: 'Xanh ngọc', accent: '#0F766E', deep: '#0A4F4A', accent2: '#F2A541', paper: '#FFFFFF', ink: '#0C2F2B', sub: '#4C6F69', onAccent: '#FFFFFF' },
  { id: 'indigo', name: 'Indigo', accent: '#4F46E5', deep: '#312E81', accent2: '#22D3EE', paper: '#FFFFFF', ink: '#1E1B38', sub: '#5A5781', onAccent: '#FFFFFF' },
  { id: 'red', name: 'Đỏ', accent: '#C8102E', deep: '#8E0B21', accent2: '#FFC43D', paper: '#FFFFFF', ink: '#2B1210', sub: '#7A4B40', onAccent: '#FFFFFF' },
  { id: 'forest', name: 'Rừng', accent: '#2F5D3A', deep: '#1F3F27', accent2: '#E4A32B', paper: '#FFFFFF', ink: '#1B2A1F', sub: '#5B6B5E', onAccent: '#FFFFFF' },
  { id: 'orange', name: 'Cam', accent: '#E8590C', deep: '#A8400A', accent2: '#1D3557', paper: '#FFFFFF', ink: '#231A0F', sub: '#6E5B45', onAccent: '#FFFFFF' },
  { id: 'purple', name: 'Tím', accent: '#6D28D9', deep: '#4C1D95', accent2: '#FACC15', paper: '#FFFFFF', ink: '#24113F', sub: '#6A5684', onAccent: '#FFFFFF' },
  { id: 'dark', name: 'Đen vàng', accent: '#C8A24A', deep: '#121418', accent2: '#E9D8A6', paper: '#FFFFFF', ink: '#15171C', sub: '#6B6F78', onAccent: '#121418' },
];
export const bdPalette = (id: string) => BD_PALETTES.find((p) => p.id === id) || BD_PALETTES[0];

// ---------- bố cục + mẫu ----------
export interface BDLayout { id: string; kind: BDKind; name: string }
export const BD_LAYOUTS: BDLayout[] = [
  { id: 'header', kind: 'staff', name: 'Đầu thẻ màu' },
  { id: 'wave', kind: 'staff', name: 'Sóng' },
  { id: 'side', kind: 'staff', name: 'Dải bên' },
  { id: 'minimal', kind: 'staff', name: 'Tối giản' },
  { id: 'bold', kind: 'staff', name: 'Nền đậm' },
  { id: 'hero', kind: 'event', name: 'Hội nghị' },
  { id: 'dark', kind: 'event', name: 'Gala tối' },
  { id: 'geo', kind: 'event', name: 'Hình khối' },
];
export interface BDSpec { kind: BDKind; layout: string; palette: string; font: string; size: string; holder: boolean; lanyardW: 15 | 20 }
export interface BDTemplate { id: string; name: string; spec: Pick<BDSpec, 'layout' | 'palette' | 'font'>; kind: BDKind }
const PICKS: [string, string, string][] = [
  ['header', 'navy', 'bvp'], ['header', 'teal', 'montserrat'], ['wave', 'indigo', 'montserrat'], ['wave', 'red', 'bvp'],
  ['side', 'forest', 'oswald'], ['minimal', 'orange', 'bvp'], ['bold', 'navy', 'montserrat'], ['bold', 'purple', 'bvp'],
  ['hero', 'navy', 'montserrat'], ['hero', 'red', 'bvp'], ['dark', 'dark', 'playfair'], ['geo', 'teal', 'oswald'],
];
export const BD_TEMPLATES: BDTemplate[] = PICKS.map(([layout, palette, font]) => {
  const l = BD_LAYOUTS.find((x) => x.id === layout)!;
  return { id: `${layout}-${palette}`, name: `${l.name} · ${bdPalette(palette).name}`, spec: { layout, palette, font }, kind: l.kind };
});

// ---------- dữ liệu ----------
export type BDData = Record<string, string>;
export interface BDField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; kinds: BDKind[] }
export const BD_FIELDS: BDField[] = [
  { key: 'company', label: 'Tên công ty / đơn vị', ph: 'CÔNG TY AN KHANG', kinds: ['staff', 'event'] },
  { key: 'slogan', label: 'Dòng phụ dưới tên công ty', ph: 'Giải pháp nội thất trọn gói', kinds: ['staff'] },
  { key: 'eventName', label: 'Tên sự kiện', ph: 'Hội nghị khách hàng 2027', kinds: ['event'] },
  { key: 'eventDate', label: 'Ngày giờ', ph: '08:00 · 15/01/2027', half: true, kinds: ['event'] },
  { key: 'eventPlace', label: 'Địa điểm', ph: 'GEM Center, Q.1', half: true, kinds: ['event'] },
  { key: 'phone', label: 'Hotline', ph: '0909 123 456', half: true, kinds: ['staff', 'event'] },
  { key: 'website', label: 'Website (tạo mã QR mặt sau)', ph: 'ankhang.vn', half: true, kinds: ['staff', 'event'] },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM', kinds: ['staff', 'event'] },
  { key: 'rules', label: 'Mặt sau: quy định (mỗi dòng 1 ý)', multiline: true, kinds: ['staff', 'event'] },
];
export const BD_SAMPLE: Record<BDKind, BDData> = {
  staff: {
    company: 'AN KHANG INTERIOR', slogan: 'Thiết kế & thi công nội thất', phone: '0909 123 456', website: 'ankhang.vn',
    address: '12 Nguyễn Huệ, Q.1, TP.HCM',
    rules: 'Đeo thẻ trong suốt giờ làm việc\nKhông cho người khác mượn thẻ\nBáo ngay cho phòng Nhân sự khi mất thẻ',
    people: 'Trần Quốc Bảo | Trưởng phòng Kinh doanh | AK-0012\nNguyễn Thu Hà | Kế toán trưởng | AK-0027\nLê Gia Khánh | Kỹ sư thiết kế | AK-0035\nPhạm Bảo Ngọc | Chuyên viên CSKH | AK-0041',
    depts: '',
  },
  event: {
    company: 'AN KHANG GROUP', eventName: 'Hội nghị khách hàng 2027', eventDate: '08:00 · Thứ Sáu 15/01/2027', eventPlace: 'GEM Center, 8 Nguyễn Bỉnh Khiêm, Q.1',
    phone: '0909 123 456', website: 'ankhang.vn/hoinghi', address: '12 Nguyễn Huệ, Q.1, TP.HCM',
    rules: 'Vui lòng đeo thẻ trong suốt chương trình\nQuét mã QR để check-in tại quầy lễ tân\nThẻ không có giá trị chuyển nhượng',
    people: 'Trần Quốc Bảo | Giám đốc điều hành | Diễn giả\nNguyễn Thu Hà | Công ty Hoa Sen | Khách mời\nLê Gia Khánh | Ban tổ chức | BTC\nPhạm Bảo Ngọc | Tập đoàn Sao Mai | VIP',
  },
};
export const defaultBDData = (kind: BDKind): BDData => ({ ...BD_SAMPLE[kind] });

// ---------- danh sách người ----------
export interface Person { name: string; title: string; code: string; role: string }
export interface Role { id: string; label: string; color: string; ink: string }
export const ROLES: Role[] = [
  { id: 'guest', label: 'KHÁCH MỜI', color: '#1E6FD9', ink: '#FFFFFF' },
  { id: 'org', label: 'BAN TỔ CHỨC', color: '#D7263D', ink: '#FFFFFF' },
  { id: 'speaker', label: 'DIỄN GIẢ', color: '#7C3AED', ink: '#FFFFFF' },
  { id: 'vip', label: 'VIP', color: '#15171C', ink: '#E9C46A' },
  { id: 'volunteer', label: 'TÌNH NGUYỆN VIÊN', color: '#15803D', ink: '#FFFFFF' },
  { id: 'press', label: 'BÁO CHÍ', color: '#EA580C', ink: '#FFFFFF' },
];
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
export function roleOf(s: string): Role {
  const f = fold(s || '');
  if (/btc|to chuc|organi|staff/.test(f)) return ROLES[1];
  if (/dien gia|speaker|dien thuyet/.test(f)) return ROLES[2];
  if (/vip/.test(f)) return ROLES[3];
  if (/tinh nguyen|tnv|volunteer/.test(f)) return ROLES[4];
  if (/bao chi|press|phong vien|truyen thong/.test(f)) return ROLES[5];
  return ROLES[0];
}
export function parsePeople(text: string): Person[] {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
    const [name = '', title = '', third = ''] = l.split('|').map((s) => s.trim());
    return { name, title, code: third, role: third };
  }).filter((p) => p.name);
}
export const initials = (s: string) => {
  const w = (s || '').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[w.length - 2][0] + w[w.length - 1][0]).toUpperCase();
};

// ---------- tiện ích chữ (đo bằng font thật) ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS, minF = 0.42) => {
  const w = textW(t, size, ts);
  return w > maxW ? Math.max(size * minF, (size * maxW) / w) : size;
};
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = []; let cur = '';
  for (const w of (text || '').trim().split(/\s+/).filter(Boolean)) {
    const nx = cur ? `${cur} ${w}` : w;
    if (!cur || textW(nx, size, ts) <= maxW) cur = nx; else { out.push(cur); cur = w; }
  }
  if (cur) out.push(cur);
  return out;
}
/** co chữ tới khi ≤ maxLines; dòng nào vẫn dài thì co riêng → luôn vừa bề rộng */
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.5) { s *= 0.93; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  return { lines: lines.map((l) => ({ t: l, s: fitSize(l, maxW, s, ts, 0.3) })), size: s };
}

type Anchor = 'start' | 'middle' | 'end';
function Line({ t, x, y, size, ts, fill, anchor = 'middle', maxW, upper, opacity }: { t: string; x: number; y: number; size: number; ts: TS; fill: string; anchor?: Anchor; maxW: number; upper?: boolean; opacity?: number }) {
  if (!t) return null;
  const s = upper ? t.toUpperCase() : t;
  const f = fitSize(s, maxW, size, ts);
  return <text x={x} y={y} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={f} fill={fill} textAnchor={anchor} letterSpacing={ts.ls || 0} opacity={opacity}>{s}</text>;
}
/** khối nhiều dòng, baseline dòng đầu = y; trả về JSX + đáy khối */
function Block({ text, x, y, size, ts, fill, anchor = 'middle', maxW, maxLines, lh = 1.12 }: { text: string; x: number; y: number; size: number; ts: TS; fill: string; anchor?: Anchor; maxW: number; maxLines: number; lh?: number }) {
  const b = fitBlock(text, maxW, size, ts, maxLines);
  return (
    <>
      {b.lines.map((l, i) => (
        <text key={i} x={x} y={y + i * b.size * lh} fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={l.s} fill={fill} textAnchor={anchor} letterSpacing={ts.ls || 0}>{l.t}</text>
      ))}
    </>
  );
}
const blockH = (text: string, maxW: number, size: number, ts: TS, maxLines: number, lh = 1.12) => {
  const b = fitBlock(text, maxW, size, ts, maxLines);
  return { n: b.lines.length, size: b.size, h: b.size * lh * (b.lines.length - 1) };
};

// ---------- hình phụ ----------
const rr = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;

/** vị trí lỗ bấm (đơn vị thiết kế) — dùng chung cho bản xem + 3D */
export function slotOf(sz: BDSize) {
  const ev = sz.kind === 'event';
  const w = (ev ? 15 : 13) * K, h = (ev ? 3.5 : 3) * K;
  const cy = (ev ? 7 : 5.2) * K;
  return { x: (sz.wMm * K) / 2 - w / 2, y: cy - h / 2, w, h, r: h / 2, safe: cy + h / 2 + (ev ? 2.5 : 2) * K };
}

/** logo: ảnh khách tải lên hoặc monogram vuông bo góc */
function Logo({ x, y, s, logo, company, bg, ink, uid, ts }: { x: number; y: number; s: number; logo?: string; company: string; bg: string; ink: string; uid: string; ts: TS }) {
  if (logo) return <image href={logo} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
  const ini = initials(company.replace(/^(công ty|cty|tập đoàn)\s+/i, ''));
  return (
    <g>
      <path d={rr(x, y, s, s, s * 0.24)} fill={bg} />
      <text x={x + s / 2} y={y + s * 0.66} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={800} fontSize={fitSize(ini, s * 0.78, s * 0.5, ts)} fill={ink} data-k={uid}>{ini}</text>
    </g>
  );
}

/** ảnh người (cắt khung) hoặc avatar chữ cái đầu */
function Photo({ id, shape, x, y, w, h, photo, name, p, ring, ts }: { id: string; shape: 'circle' | 'rect'; x: number; y: number; w: number; h: number; photo?: string; name: string; p: BDPalette; ring?: string; ts: TS }) {
  const d = shape === 'circle' ? `M${x} ${y + h / 2}a${w / 2} ${h / 2} 0 1 0 ${w} 0a${w / 2} ${h / 2} 0 1 0 ${-w} 0z` : rr(x, y, w, h, Math.min(w, h) * 0.1);
  const ini = initials(name);
  return (
    <g>
      <defs><clipPath id={id}><path d={d} /></clipPath></defs>
      {ring && <path d={d} fill="none" stroke={ring} strokeWidth={Math.min(w, h) * 0.07} />}
      {photo
        ? <image href={photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
        : (
          <g clipPath={`url(#${id})`}>
            <rect x={x} y={y} width={w} height={h} fill="#FFFFFF" />
            <rect x={x} y={y} width={w} height={h} fill={p.accent} opacity={0.13} />
            <rect x={x} y={y + h * 0.62} width={w} height={h * 0.38} fill={p.accent} opacity={0.1} />
            <text x={x + w / 2} y={y + h / 2 + Math.min(w, h) * 0.13} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={800} fontSize={Math.min(w, h) * 0.36} fill={p.accent}>{ini}</text>
          </g>
        )}
    </g>
  );
}

function Pill({ x, y, h, text, bg, fg, anchor = 'middle', maxW, ts }: { x: number; y: number; h: number; text: string; bg: string; fg: string; anchor?: Anchor; maxW: number; ts: TS }) {
  if (!text) return null;
  const size = fitSize(text, maxW - h * 0.9, h * 0.5, ts);
  const w = Math.min(maxW, textW(text, size, ts) + h * 0.9);
  const x0 = anchor === 'middle' ? x - w / 2 : anchor === 'end' ? x - w : x;
  return (
    <g>
      <path d={rr(x0, y, w, h, h / 2)} fill={bg} />
      <text x={x0 + w / 2} y={y + h * 0.66} textAnchor="middle" fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size} fill={fg} letterSpacing={ts.ls || 0}>{text}</text>
    </g>
  );
}

function Qr({ text, x, y, s, fill }: { text: string; x: number; y: number; s: number; fill: string }) {
  const q = qrPath(text || ' ');
  const n = q.n + 2; // viền trắng 1 ô
  return (
    <g>
      <rect x={x} y={y} width={s} height={s} fill="#FFFFFF" rx={s * 0.04} />
      <path d={q.d} fill={fill} transform={`translate(${x + s / n} ${y + s / n}) scale(${s / n})`} />
    </g>
  );
}

// ---------- THẺ ----------
export interface BadgeProps {
  spec: BDSpec; data: BDData; person: Person; side?: 'front' | 'back'; photo?: string; logo?: string;
  bleed?: boolean; showSlot?: boolean; style?: CSSProperties;
}

export function BadgeSvg({ spec, data, person, side = 'front', photo, logo, bleed = false, showSlot = false, style }: BadgeProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sz = bdSize(spec.size);
  const p = bdPalette(spec.palette);
  const f = bdFont(spec.font);
  const W = sz.wMm * K, H = sz.hMm * K;
  const b = bleed ? BD_BLEED_MM * K : 0;
  const slot = slotOf(sz);
  const disp: TS = { fam: f.family, wt: f.weight };
  const body: TS = { fam: BODY, wt: 600 };
  const bold: TS = { fam: BODY, wt: 800 };
  const caps: TS = { fam: BODY, wt: 800, ls: 0.9 };
  const ctx: Ctx = { W, H, b, p, sz, slot, disp, body, bold, caps, uid, data, person, photo, logo, spec };
  let content: ReactNode;
  if (side === 'back') content = sz.kind === 'event' ? <EventBack {...ctx} /> : <StaffBack {...ctx} />;
  else if (sz.kind === 'event') content = <EventFront {...ctx} />;
  else content = <StaffFront {...ctx} />;
  return (
    <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      {content}
      {showSlot && <path d={rr(slot.x, slot.y, slot.w, slot.h, slot.r)} fill="#FFFFFF" stroke="#94A3B8" strokeWidth={3} data-noprint="1" />}
    </svg>
  );
}

interface Ctx {
  W: number; H: number; b: number; p: BDPalette; sz: BDSize; slot: ReturnType<typeof slotOf>; disp: TS; body: TS; bold: TS; caps: TS;
  uid: string; data: BDData; person: Person; photo?: string; logo?: string; spec: BDSpec;
}

// nền tràn lề
const Bg = ({ c, fill }: { c: Ctx; fill: string }) => <rect x={-c.b} y={-c.b} width={c.W + 2 * c.b} height={c.H + 2 * c.b} fill={fill} />;

// ===== Thẻ nhân viên — mặt trước =====
function StaffFront(c: Ctx) {
  const { W, H, b, p, slot, disp, body, bold, caps, uid, data, person, photo, logo, spec } = c;
  const portrait = H > W;
  const L = spec.layout;
  const dark = L === 'bold';
  const ink = dark ? p.onAccent : p.ink, sub = dark ? 'rgba(255,255,255,0.78)' : p.sub;
  const m = 4 * K; // lề an toàn 4mm
  const els: ReactNode[] = [];

  // ---- nền + trang trí theo bố cục ----
  const headH = portrait ? H * 0.3 : H * 0.36;
  if (L === 'header') {
    els.push(<Bg key="bg" c={c} fill={p.paper} />);
    els.push(<rect key="h" x={-b} y={-b} width={W + 2 * b} height={headH + b} fill={p.accent} />);
    els.push(<path key="h2" d={`M${-b} ${headH} L${W + b} ${headH - H * 0.06} L${W + b} ${headH} Z`} fill={p.deep} opacity={0.55} />);
    els.push(<rect key="f" x={-b} y={H - 4.4 * K} width={W + 2 * b} height={4.4 * K + b} fill={p.accent} />);
    els.push(<rect key="f2" x={-b} y={H - 4.4 * K} width={W + 2 * b} height={0.6 * K} fill={p.accent2} />);
  } else if (L === 'wave') {
    els.push(<Bg key="bg" c={c} fill={p.paper} />);
    const y1 = headH, wv = portrait ? H * 0.07 : H * 0.042;
    els.push(<path key="w1" d={`M${-b} ${-b} H${W + b} V${y1 - wv} C${W * 0.7} ${y1 + wv * 0.6} ${W * 0.35} ${y1 - wv * 1.6} ${-b} ${y1} Z`} fill={p.accent} />);
    els.push(<path key="w2" d={`M${-b} ${y1 - wv * 0.35} C${W * 0.32} ${y1 - wv * 1.9} ${W * 0.72} ${y1 + wv * 0.2} ${W + b} ${y1 - wv * 1.35} V${y1 - wv * 1.05} C${W * 0.7} ${y1 - wv * 0.1} ${W * 0.35} ${y1 - wv * 2.2} ${-b} ${y1 - wv * 0.9} Z`} fill={p.accent2} opacity={0.9} />);
    const yb = H - 4.2 * K;
    els.push(<path key="w3" d={`M${-b} ${yb + wv * 0.4} C${W * 0.3} ${yb - wv * 0.5} ${W * 0.7} ${yb + wv * 0.9} ${W + b} ${yb - wv * 0.2} V${H + b} H${-b} Z`} fill={p.deep} />);
  } else if (L === 'side') {
    els.push(<Bg key="bg" c={c} fill={p.paper} />);
    const bw = portrait ? W * 0.17 : W * 0.12;
    els.push(<rect key="s" x={-b} y={-b} width={bw + b} height={H + 2 * b} fill={p.accent} />);
    els.push(<rect key="s2" x={bw} y={-b} width={0.7 * K} height={H + 2 * b} fill={p.accent2} />);
    // tên công ty chạy dọc trong dải
    const cname = (data.company || '').toUpperCase();
    const fs = fitSize(cname, H - 2 * m, bw * 0.46, caps);
    els.push(<text key="sv" transform={`translate(${bw * 0.64} ${H - m}) rotate(-90)`} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={p.onAccent} letterSpacing={0.9}>{cname}</text>);
  } else if (L === 'minimal') {
    els.push(<Bg key="bg" c={c} fill={p.paper} />);
    els.push(<rect key="t" x={-b} y={-b} width={W + 2 * b} height={1.6 * K + b} fill={p.accent} />);
    els.push(<rect key="bt" x={-b} y={H - 1.2 * K} width={W + 2 * b} height={1.2 * K + b} fill={p.ink} />);
  } else { // bold
    els.push(<Bg key="bg" c={c} fill={p.deep} />);
    els.push(<circle key="c1" cx={W * 1.02} cy={-H * 0.02} r={Math.max(W, H) * 0.42} fill={p.accent} opacity={0.55} />);
    els.push(<circle key="c2" cx={-W * 0.1} cy={H * 1.04} r={Math.max(W, H) * 0.3} fill={p.accent} opacity={0.35} />);
  }

  const company = data.company || '';
  const onHead = L === 'header' || L === 'wave' || L === 'bold';
  const headInk = onHead ? p.onAccent : p.ink;
  const role = person.title || '';
  const code = person.code ? `MÃ NV: ${person.code}` : '';

  if (portrait) {
    const left = L === 'side' ? W * 0.17 + 0.7 * K + m * 0.7 : m;
    const cx = (left + W - m) / 2;
    const tw = W - m - left;
    // logo + công ty (dưới vùng lỗ bấm)
    const ls = 6.4 * K;
    const ly = slot.safe;
    if (L === 'side') {
      els.push(<Logo key="lg" x={cx - ls / 2} y={ly} s={ls} logo={logo} company={company} bg={p.accent} ink={p.onAccent} uid={uid} ts={disp} />);
    } else {
      const ctext = company.toUpperCase();
      const cs = fitSize(ctext, tw - ls - 2 * K, 2.7 * K, caps);
      const gw = ls + 1.6 * K + textW(ctext, cs, caps);
      const gx = W / 2 - gw / 2;
      els.push(<Logo key="lg" x={gx} y={ly} s={ls} logo={logo} company={company} bg={onHead ? p.onAccent : p.accent} ink={onHead ? p.accent : p.onAccent} uid={uid} ts={disp} />);
      els.push(<text key="cn" x={gx + ls + 1.6 * K} y={ly + ls * 0.5 + (data.slogan ? -0.2 * K : cs * 0.36)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={cs} fill={headInk} letterSpacing={0.9}>{ctext}</text>);
      if (data.slogan) els.push(<Line key="sl" t={data.slogan} x={gx + ls + 1.6 * K} y={ly + ls * 0.5 + 2.4 * K} size={1.9 * K} ts={body} fill={headInk} anchor="start" maxW={tw - ls - 1.6 * K} opacity={0.85} />);
    }
    // ảnh: tròn lớn (đầu màu / nền đậm / tối giản) hoặc ảnh thẻ 3×4
    const shape = L === 'wave' || L === 'side' ? 'rect' : 'circle';
    const pw = shape === 'rect' ? W * 0.5 : L === 'minimal' ? W * 0.5 : W * 0.56;
    const ph = shape === 'rect' ? pw * (4 / 3) : pw;
    const below = ly + ls + (L === 'minimal' ? 4 : 3) * K;
    const py = L === 'header' ? Math.max(headH - pw * 0.42, ly + ls + 2.2 * K) : below;
    els.push(<Photo key="ph" id={`${uid}ph`} shape={shape} x={cx - pw / 2} y={py} w={pw} h={ph} photo={photo} name={person.name} p={p} ring={L === 'header' || L === 'bold' ? (L === 'bold' ? p.accent2 : '#FFFFFF') : undefined} ts={disp} />);
    // tên + chức vụ + mã NV: canh giữa vùng còn lại dưới ảnh
    const footTop = L === 'header' ? H - 4.4 * K : L === 'wave' ? H - 4.2 * K - H * 0.05 : L === 'minimal' ? H - 1.2 * K : H - 2 * K;
    const nh = blockH(person.name, tw, 4.8 * K, disp, 2);
    const pillH = 4.2 * K;
    const roleU = role.toUpperCase();
    const rh = blockH(roleU, tw, 2.5 * K, caps, 2, 1.2);
    const blockTotal = nh.size * 0.8 + nh.h + 4.2 * K + rh.h + (code ? 2.8 * K + pillH : 0);
    const zone0 = py + ph + 2 * K, zone1 = footTop - 2 * K;
    const top0 = Math.max(zone0, zone0 + (zone1 - zone0 - blockTotal) / 2);
    const ny = top0 + nh.size * 0.8;
    els.push(<Block key="nm" text={person.name} x={cx} y={ny} size={4.8 * K} ts={disp} fill={ink} maxW={tw} maxLines={2} />);
    const ty = ny + nh.h + 4.2 * K;
    els.push(<Block key="tt" text={roleU} x={cx} y={ty} size={2.5 * K} ts={caps} fill={dark ? p.accent2 : p.accent} maxW={tw} maxLines={2} lh={1.2} />);
    const pillY = Math.min(footTop - pillH - 1.4 * K, ty + rh.h + 2.8 * K);
    els.push(<Pill key="cd" x={cx} y={pillY} h={pillH} text={code} bg={dark ? p.accent2 : L === 'minimal' ? p.ink : p.accent} fg={dark ? p.deep : '#FFFFFF'} maxW={tw} ts={bold} />);
    if (L === 'header' && data.website) els.push(<Line key="ws" t={data.website} x={W / 2} y={H - 1.65 * K} size={1.7 * K} ts={bold} fill={p.onAccent} maxW={W - 2 * m} />);
    if (L === 'wave' && data.website) els.push(<Line key="ws" t={data.website} x={W / 2} y={H - 1.7 * K} size={1.7 * K} ts={bold} fill={p.onAccent} maxW={W - 2 * m} />);
  } else {
    // ---- ngang 86×54 ----
    const left = L === 'side' ? W * 0.12 + 0.7 * K + m * 0.7 : m;
    const top = slot.safe;
    const ls = 5.6 * K;
    const ctext = company.toUpperCase();
    if (L !== 'side') {
      els.push(<Logo key="lg" x={left} y={top - 1.2 * K} s={ls} logo={logo} company={company} bg={onHead ? p.onAccent : p.accent} ink={onHead ? p.accent : p.onAccent} uid={uid} ts={disp} />);
      const cs = fitSize(ctext, W - left - ls - 1.6 * K - m, 2.6 * K, caps);
      els.push(<text key="cn" x={left + ls + 1.6 * K} y={top - 1.2 * K + ls * 0.5 + (data.slogan ? -0.3 * K : cs * 0.36)} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={cs} fill={headInk} letterSpacing={0.9}>{ctext}</text>);
      if (data.slogan) els.push(<Line key="sl" t={data.slogan} x={left + ls + 1.6 * K} y={top - 1.2 * K + ls * 0.5 + 2.3 * K} size={1.8 * K} ts={body} fill={headInk} anchor="start" maxW={W - left - ls - 1.6 * K - m} opacity={0.85} />);
    } else {
      els.push(<Logo key="lg" x={W - m - ls} y={top - 1.2 * K} s={ls} logo={logo} company={company} bg={p.accent} ink={p.onAccent} uid={uid} ts={disp} />);
    }
    // ảnh trái (tròn: đầu màu/nền đậm; 3×4: còn lại), chữ phải canh giữa theo chiều cao vùng nội dung
    const cTop = L === 'header' || L === 'wave' ? headH + 1.5 * K : top - 1.2 * K + ls + (data.slogan && L !== 'side' ? 3 : 1.6) * K;
    const footTop = L === 'header' ? H - 4.4 * K : L === 'wave' ? H - 4.2 * K - H * 0.04 : L === 'minimal' ? H - 1.2 * K : H - 1.5 * K;
    const shape = L === 'bold' || L === 'header' ? 'circle' : 'rect';
    const ph = Math.max(14 * K, footTop - cTop - 1.8 * K);
    const pw = shape === 'circle' ? ph : ph * 0.75;
    els.push(<Photo key="ph" id={`${uid}ph`} shape={shape} x={left} y={cTop} w={pw} h={ph} photo={photo} name={person.name} p={p} ring={L === 'header' || L === 'bold' ? (L === 'bold' ? p.accent2 : p.accent) : undefined} ts={disp} />);
    const tx = left + pw + 3.4 * K;
    const tw = W - m - tx;
    const nh = blockH(person.name, tw, 4.4 * K, disp, 2);
    const pillH = 3.8 * K;
    const roleU = role.toUpperCase();
    const rh = blockH(roleU, tw, 2.3 * K, caps, 2, 1.2);
    const total = nh.size * 0.8 + nh.h + 3.8 * K + rh.h + (code ? 2.6 * K + pillH : 0);
    const nTop = cTop + Math.max(0, (footTop - cTop - total) / 2) + nh.size * 0.8;
    els.push(<Block key="nm" text={person.name} x={tx} y={nTop} size={4.4 * K} ts={disp} fill={ink} maxW={tw} maxLines={2} anchor="start" />);
    const ty = nTop + nh.h + 3.8 * K;
    els.push(<Block key="tt" text={roleU} x={tx} y={ty} size={2.3 * K} ts={caps} fill={dark ? p.accent2 : p.accent} maxW={tw} maxLines={2} lh={1.2} anchor="start" />);
    els.push(<Pill key="cd" x={tx} y={Math.min(footTop - pillH - 1 * K, ty + rh.h + 2.6 * K)} h={pillH} text={code} bg={dark ? p.accent2 : L === 'minimal' ? p.ink : p.accent} fg={dark ? p.deep : '#FFFFFF'} maxW={tw} ts={bold} anchor="start" />);
    if ((L === 'header' || L === 'wave') && data.website) els.push(<Line key="ws" t={data.website} x={W - m} y={H - (L === 'header' ? 1.6 : 1.7) * K} size={1.6 * K} ts={bold} fill={p.onAccent} maxW={W * 0.5} anchor="end" />);
  }
  void sub;
  return <>{els}</>;
}

// ===== Thẻ nhân viên — mặt sau (dùng chung) =====
function StaffBack(c: Ctx) {
  const { W, H, b, p, slot, disp, body, bold, caps, uid, data, logo } = c;
  const portrait = H > W;
  const m = 4 * K;
  const rules = (data.rules || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const qrText = data.website ? (data.website.startsWith('http') ? data.website : `https://${data.website}`) : `${data.company} ${data.phone}`;
  const els: ReactNode[] = [<Bg key="bg" c={c} fill={p.paper} />];
  els.push(<rect key="t" x={-b} y={-b} width={W + 2 * b} height={1.6 * K + b} fill={p.accent} />);
  els.push(<rect key="bt" x={-b} y={H - 6.4 * K} width={W + 2 * b} height={6.4 * K + b} fill={p.accent} />);
  const ls = 5.6 * K;
  const RuleList = ({ x, y, w, size }: { x: number; y: number; w: number; size: number }) => {
    let yy = y;
    return (
      <g>
        {rules.map((r, i) => {
          const bh = blockH(r, w - 2.4 * K, size, body, 2, 1.25);
          const el = (
            <g key={i}>
              <circle cx={x + 0.8 * K} cy={yy - size * 0.33} r={0.55 * K} fill={p.accent} />
              <Block text={r} x={x + 2.4 * K} y={yy} size={size} ts={body} fill={p.ink} maxW={w - 2.4 * K} maxLines={2} anchor="start" lh={1.25} />
            </g>
          );
          yy += bh.h + bh.size * 1.75;
          return el;
        })}
      </g>
    );
  };
  if (portrait) {
    const y0 = slot.safe;
    els.push(<Logo key="lg" x={W / 2 - ls / 2} y={y0} s={ls} logo={logo} company={data.company || ''} bg={p.accent} ink={p.onAccent} uid={uid} ts={disp} />);
    els.push(<Line key="cn" t={data.company || ''} x={W / 2} y={y0 + ls + 3.4 * K} size={2.6 * K} ts={caps} fill={p.ink} maxW={W - 2 * m} upper />);
    els.push(<Line key="lb" t="THẺ NHÂN VIÊN" x={W / 2} y={y0 + ls + 6.4 * K} size={2 * K} ts={{ ...caps, ls: 3 }} fill={p.accent} maxW={W - 2 * m} />);
    els.push(<line key="ln" x1={m} x2={W - m} y1={y0 + ls + 8.6 * K} y2={y0 + ls + 8.6 * K} stroke={p.accent} strokeOpacity={0.25} strokeWidth={2} />);
    els.push(<RuleList key="rl" x={m} y={y0 + ls + 12.2 * K} w={W - 2 * m} size={1.95 * K} />);
    const qs = 13 * K;
    const qy = H - 6.4 * K - qs - 3.4 * K;
    els.push(<Qr key="qr" text={qrText} x={W / 2 - qs / 2} y={qy} s={qs} fill={p.ink} />);
    els.push(<Line key="lost" t="Nhặt được thẻ xin liên hệ" x={W / 2} y={H - 4.3 * K} size={1.5 * K} ts={body} fill={p.onAccent} maxW={W - 2 * m} opacity={0.9} />);
    els.push(<Line key="ph" t={data.phone || ''} x={W / 2} y={H - 1.9 * K} size={2.1 * K} ts={bold} fill={p.onAccent} maxW={W - 2 * m} />);
  } else {
    const y0 = slot.safe;
    els.push(<Logo key="lg" x={m} y={y0 - 1.2 * K} s={ls} logo={logo} company={data.company || ''} bg={p.accent} ink={p.onAccent} uid={uid} ts={disp} />);
    els.push(<Line key="cn" t={data.company || ''} x={m + ls + 1.6 * K} y={y0 + 1.6 * K} size={2.4 * K} ts={caps} fill={p.ink} maxW={W - m * 2 - ls - 16 * K} anchor="start" upper />);
    els.push(<Line key="lb" t="THẺ NHÂN VIÊN" x={m + ls + 1.6 * K} y={y0 + 4.2 * K} size={1.8 * K} ts={{ ...caps, ls: 3 }} fill={p.accent} maxW={W * 0.5} anchor="start" />);
    const qs = 14 * K;
    els.push(<Qr key="qr" text={qrText} x={W - m - qs} y={y0 - 1.2 * K} s={qs} fill={p.ink} />);
    els.push(<RuleList key="rl" x={m} y={y0 + ls + 4 * K} w={W - 2 * m - qs - 2 * K} size={1.8 * K} />);
    els.push(<Line key="lost" t={`Nhặt được thẻ xin liên hệ: ${data.phone || ''}`} x={W / 2} y={H - 3.6 * K} size={1.8 * K} ts={bold} fill={p.onAccent} maxW={W - 2 * m} />);
    els.push(<Line key="ad" t={data.address || ''} x={W / 2} y={H - 1.7 * K} size={1.5 * K} ts={body} fill={p.onAccent} maxW={W - 2 * m} opacity={0.85} />);
  }
  return <>{els}</>;
}

// ===== Thẻ sự kiện — mặt trước =====
function EventFront(c: Ctx) {
  const { W, H, b, p, slot, disp, body, bold, caps, uid, data, person, photo, logo, spec } = c;
  const L = spec.layout;
  const role = roleOf(person.role);
  const m = 6 * K;
  const dark = L === 'dark';
  const ink = dark ? '#F4F2EC' : p.ink;
  const els: ReactNode[] = [<Bg key="bg" c={c} fill={dark ? p.deep : p.paper} />];
  const bandH = H * 0.36;
  const ribH = H * 0.15;
  // ---- đầu thẻ ----
  if (L === 'hero') {
    els.push(<rect key="hb" x={-b} y={-b} width={W + 2 * b} height={bandH + b} fill={p.accent} />);
    for (let i = 0; i < 7; i++) els.push(<circle key={`r${i}`} cx={W * 0.92} cy={bandH * 0.1} r={(i + 1) * W * 0.07} fill="none" stroke="#FFFFFF" strokeOpacity={0.09} strokeWidth={3} />);
    els.push(<rect key="hl" x={-b} y={bandH} width={W + 2 * b} height={0.8 * K} fill={p.accent2} />);
  } else if (L === 'dark') {
    els.push(<rect key="fr" x={3.6 * K} y={3.6 * K} width={W - 7.2 * K} height={H - 7.2 * K - ribH} fill="none" stroke={p.accent} strokeWidth={2.5} rx={1.2 * K} />);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI;
      els.push(<line key={`g${i}`} x1={W / 2} y1={bandH * 0.92} x2={W / 2 + Math.cos(a) * W * 0.8} y2={bandH * 0.92 - Math.sin(a) * W * 0.8} stroke={p.accent} strokeOpacity={0.08} strokeWidth={4} />);
    }
  } else { // geo
    const n = 6, cw = (W + 2 * b) / n, ch = bandH / 3;
    const tones = [p.accent, p.deep, p.accent2, p.accent];
    for (let r = 0; r < 3; r++) for (let i = 0; i < n; i++) {
      const x = -b + i * cw, y = -b + r * ch;
      const t = (i * 3 + r * 5) % 4, t2 = (i * 5 + r * 3 + 1) % 4;
      els.push(<rect key={`q${r}-${i}`} x={x} y={y} width={cw + 1} height={ch + 1} fill={tones[t]} opacity={t === 2 ? 0.95 : 1} />);
      els.push(<path key={`t${r}-${i}`} d={(i + r) % 2 ? `M${x} ${y}L${x + cw + 1} ${y}L${x} ${y + ch + 1}Z` : `M${x + cw + 1} ${y}L${x + cw + 1} ${y + ch + 1}L${x} ${y + ch + 1}Z`} fill={tones[t2]} opacity={0.85} />);
    }
    els.push(null); // chỗ cho thẻ trắng — vẽ sau khi biết chiều cao chữ sự kiện
  }
  const headInk = L === 'hero' ? p.onAccent : dark ? p.accent : p.ink;
  // logo + tên công ty dưới lỗ bấm
  const ls = 6.6 * K;
  const y0 = slot.safe;
  const ctext = (data.company || '').toUpperCase();
  const cs = fitSize(ctext, W - 2 * m - ls - 2 * K, 2.6 * K, caps);
  const gw = ls + 1.8 * K + textW(ctext, cs, caps);
  const lgY = L === 'geo' ? bandH * 0.38 + 2.6 * K : y0;
  els.push(<Logo key="lg" x={W / 2 - gw / 2} y={lgY} s={ls} logo={logo} company={data.company || ''} bg={L === 'hero' ? p.onAccent : p.accent} ink={L === 'hero' ? p.accent : dark ? p.deep : p.onAccent} uid={uid} ts={disp} />);
  els.push(<text key="cn" x={W / 2 - gw / 2 + ls + 1.8 * K} y={lgY + ls * 0.5 + cs * 0.36} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={cs} fill={headInk} letterSpacing={0.9}>{ctext}</text>);
  // tên sự kiện + ngày
  const evTs: TS = dark ? { ...disp } : { fam: BODY, wt: 800 };
  const evY = lgY + ls + 7 * K;
  const evMax = W - 2 * m - (L === 'geo' ? 2 * K : 0);
  const eh = blockH(data.eventName || '', evMax, 5.8 * K, evTs, 2);
  els.push(<Block key="ev" text={data.eventName || ''} x={W / 2} y={evY} size={5.8 * K} ts={evTs} fill={L === 'hero' ? p.onAccent : dark ? '#F4F2EC' : p.ink} maxW={evMax} maxLines={2} />);
  els.push(<Line key="dt" t={[data.eventDate, data.eventPlace].filter(Boolean).join('  ·  ')} x={W / 2} y={evY + eh.h + 4.4 * K} size={2.3 * K} ts={body} fill={L === 'hero' ? p.onAccent : dark ? p.accent2 : p.sub} maxW={evMax} opacity={L === 'hero' ? 0.9 : 1} />);

  if (L === 'geo') {
    const gi = els.indexOf(null);
    els[gi] = <path key="geoCard" d={rr(m * 0.8, bandH * 0.38, W - m * 1.6, Math.max(bandH * 0.78, evY + eh.h + 7.4 * K - bandH * 0.38), 1.6 * K)} fill="#FFFFFF" />;
  }
  // ---- người ----
  const ribY = H - ribH;
  const zoneTop = Math.max(bandH + (L === 'geo' ? 6 * K : 4 * K), evY + eh.h + (L === 'geo' ? 12 : 8) * K);
  const nh0 = blockH(person.name, W - 2 * m, 8 * K, disp, 2, 1.08);
  // khối tên + chức danh canh giữa vùng trống giữa đầu thẻ và dải vai trò
  let ny = (zoneTop + ribY) / 2 - (nh0.h + 6 * K) / 2 + nh0.size * 0.35;
  if (photo) {
    const ps = Math.min(22 * K, (ribY - zoneTop) * 0.42);
    els.push(<Photo key="ph" id={`${uid}ph`} shape="circle" x={W / 2 - ps / 2} y={zoneTop} w={ps} h={ps} photo={photo} name={person.name} p={p} ring={dark ? p.accent : p.accent2} ts={disp} />);
    ny = zoneTop + ps + 8 * K;
  }
  const nh = blockH(person.name, W - 2 * m, 8 * K, disp, 2, 1.08);
  els.push(<line key="nl" x1={W / 2 - 6 * K} x2={W / 2 + 6 * K} y1={ny - nh.size - 3 * K} y2={ny - nh.size - 3 * K} stroke={dark ? p.accent : role.color} strokeWidth={0.7 * K} strokeLinecap="round" />);
  els.push(<Block key="nm" text={person.name} x={W / 2} y={ny} size={8 * K} ts={disp} fill={ink} maxW={W - 2 * m} maxLines={2} lh={1.08} />);
  els.push(<Line key="ti" t={person.title || ''} x={W / 2} y={ny + nh.h + 5.6 * K} size={3.1 * K} ts={body} fill={dark ? p.accent2 : p.sub} maxW={W - 2 * m} />);
  // ---- dải vai trò (màu theo vai trò) ----
  els.push(<rect key="rb" x={-b} y={ribY} width={W + 2 * b} height={ribH + b} fill={role.color} />);
  els.push(<rect key="rb2" x={-b} y={ribY} width={W + 2 * b} height={0.7 * K} fill="#FFFFFF" opacity={0.25} />);
  els.push(<Line key="rl" t={role.label} x={W / 2} y={ribY + ribH * 0.64} size={ribH * 0.42} ts={{ fam: f(disp), wt: 800, ls: 4 }} fill={role.ink} maxW={W - 2 * m} />);
  return <>{els}</>;
}
const f = (ts: TS) => (ts.fam === 'Playfair Display' ? BODY : ts.fam);

// ===== Thẻ sự kiện — mặt sau =====
function EventBack(c: Ctx) {
  const { W, H, b, p, slot, disp, body, bold, caps, uid, data, logo } = c;
  const m = 6 * K;
  const rules = (data.rules || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const qrText = data.website ? (data.website.startsWith('http') ? data.website : `https://${data.website}`) : `${data.eventName} ${data.phone}`;
  const els: ReactNode[] = [<Bg key="bg" c={c} fill={p.paper} />];
  els.push(<rect key="bt" x={-b} y={H - 10 * K} width={W + 2 * b} height={10 * K + b} fill={p.accent} />);
  const ls = 6 * K, y0 = slot.safe;
  els.push(<Logo key="lg" x={W / 2 - ls / 2} y={y0} s={ls} logo={logo} company={data.company || ''} bg={p.accent} ink={p.onAccent} uid={uid} ts={disp} />);
  const ey = y0 + ls + 6 * K;
  const eh = blockH(data.eventName || '', W - 2 * m, 3.6 * K, bold, 2);
  els.push(<Block key="ev" text={data.eventName || ''} x={W / 2} y={ey} size={3.6 * K} ts={bold} fill={p.ink} maxW={W - 2 * m} maxLines={2} />);
  els.push(<Line key="dt" t={data.eventDate || ''} x={W / 2} y={ey + eh.h + 4 * K} size={2.2 * K} ts={body} fill={p.accent} maxW={W - 2 * m} />);
  els.push(<Line key="pl" t={data.eventPlace || ''} x={W / 2} y={ey + eh.h + 7.2 * K} size={2 * K} ts={body} fill={p.sub} maxW={W - 2 * m} />);
  const qs = 32 * K;
  const qy = ey + eh.h + 12 * K;
  els.push(<Qr key="qr" text={qrText} x={W / 2 - qs / 2} y={qy} s={qs} fill={p.ink} />);
  els.push(<Line key="ci" t="QUÉT ĐỂ CHECK-IN" x={W / 2} y={qy + qs + 3.6 * K} size={2 * K} ts={{ ...caps, ls: 2 }} fill={p.accent} maxW={W - 2 * m} />);
  let yy = qy + qs + 8.6 * K;
  rules.forEach((r, i) => {
    els.push(<Line key={`r${i}`} t={`• ${r}`} x={W / 2} y={yy} size={2 * K} ts={body} fill={p.ink} maxW={W - 2 * m} />);
    yy += 3.4 * K;
  });
  els.push(<Line key="hl" t={`Hotline ban tổ chức: ${data.phone || ''}`} x={W / 2} y={H - 5.6 * K} size={2.3 * K} ts={bold} fill={p.onAccent} maxW={W - 2 * m} />);
  els.push(<Line key="ws" t={data.website || ''} x={W / 2} y={H - 2.6 * K} size={1.9 * K} ts={body} fill={p.onAccent} maxW={W - 2 * m} opacity={0.85} />);
  return <>{els}</>;
}

// ---------- DÂY ĐEO (in lụa/in nhiệt chuyển, chạy lặp) ----------
/** 1 chu kỳ lặp: logo + tên công ty + chấm → trả bề dài chu kỳ (mm) */
export function lanyardPeriodMm(spec: BDSpec, data: BDData): number {
  const wMm = spec.lanyardW;
  const ts: TS = { fam: BODY, wt: 800, ls: 0.05 * wMm * K };
  const text = (data.company || 'MIVY').toUpperCase();
  const size = wMm * K * 0.42;
  return (wMm * 0.62 * K + 2.4 * K + textW(text, size, ts) + 7 * K) / K;
}

export function LanyardSvg({ spec, data, logo, lenMm, style }: { spec: BDSpec; data: BDData; logo?: string; lenMm: number; style?: CSSProperties }) {
  const p = bdPalette(spec.palette);
  const wMm = spec.lanyardW;
  const Wl = lenMm * K, Hl = wMm * K;
  const per = lanyardPeriodMm(spec, data) * K;
  const ts: TS = { fam: BODY, wt: 800, ls: 0.05 * wMm * K };
  const text = (data.company || 'MIVY').toUpperCase();
  const size = Hl * 0.42;
  const ls = Hl * 0.62;
  const bg = p.id === 'dark' ? p.deep : p.accent;
  const fg = p.id === 'dark' ? p.accent : p.onAccent;
  const n = Math.ceil(Wl / per) + 1;
  const items: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = i * per + 1.2 * K;
    items.push(
      <g key={i}>
        {logo
          ? <image href={logo} x={x} y={(Hl - ls) / 2} width={ls} height={ls} preserveAspectRatio="xMidYMid meet" />
          : <g>
            <circle cx={x + ls / 2} cy={Hl / 2} r={ls / 2} fill={fg} />
            <text x={x + ls / 2} y={Hl / 2 + ls * 0.17} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={ls * 0.44} fill={bg}>{initials(text.replace(/^(CÔNG TY|CTY|TẬP ĐOÀN)\s+/, ''))}</text>
          </g>}
        <text x={x + ls + 2.4 * K} y={Hl / 2 + size * 0.36} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={size} fill={fg} letterSpacing={ts.ls}>{text}</text>
        <circle cx={x + per - 3.8 * K} cy={Hl / 2} r={0.7 * K} fill={p.accent2} />
      </g>,
    );
  }
  return (
    <svg viewBox={`0 0 ${Wl} ${Hl}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      {/* nền + sọc tràn quá mép → texture lặp không lộ đường nối */}
      <rect x={-20} y={-20} width={Wl + 40} height={Hl + 40} fill={bg} />
      {items}
      <rect x={-20} y={Hl * 0.05} width={Wl + 40} height={Hl * 0.035} fill={p.accent2} opacity={0.9} />
      <rect x={-20} y={Hl * 0.915} width={Wl + 40} height={Hl * 0.035} fill={p.accent2} opacity={0.9} />
    </svg>
  );
}
