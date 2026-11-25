'use client';
// Bộ văn phòng: 1 nhận diện → TIÊU ĐỀ THƯ A4 + KẸP FILE A4 (khuôn bế có túi + khe cài card) + card nhỏ cho 3D.
// Mẫu = BỐ CỤC × BẢNG MÀU × FONT, render code 100% (0 AI realtime). Đơn vị: 10 = 1mm.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const U = 10;
export const ST_LH = { wMm: 210, hMm: 297 };
export const ST_LH_BLEED_MM = 3;
export const ST_FD_BLEED_MM = 3;

// ---------- font (đều có TTF trong /public/fonts → outline được khi xuất file in) ----------
export interface SFont { id: string; name: string; family: string; weight: number; serif?: boolean; upper?: boolean }
export const SF_FONTS: SFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800, serif: true },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700, serif: true },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400, serif: true },
];
export const sfFont = (id: string) => SF_FONTS.find((f) => f.id === id) || SF_FONTS[0];
const BODY = 'Be Vietnam Pro';
const BW = 600; // chữ liên hệ: 600 (có TTF để outline)

export const SF_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:ital,wght@0,400;0,600;0,800;1,400;1,600&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@600;700&family=Oswald:wght@700&family=Prata&display=swap');`;

export function useSFFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-sf-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-sf-fonts'; link.rel = 'stylesheet';
        link.href = SF_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...SF_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `400 40px "${BODY}"`, `italic 600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface SPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string; tint: string }
export const SF_PALETTES: SPalette[] = [
  { id: 'navy', name: 'Navy', paper: '#FFFFFF', ink: '#16233B', sub: '#5B6B85', accent: '#1F3A68', accent2: '#C8A24A', onAccent: '#FFFFFF', tint: '#EEF2F8' },
  { id: 'black', name: 'Đen', paper: '#FFFFFF', ink: '#121212', sub: '#5F6368', accent: '#161616', accent2: '#A3A3A3', onAccent: '#FFFFFF', tint: '#F2F2F1' },
  { id: 'burgundy', name: 'Đỏ rượu', paper: '#FFFFFF', ink: '#2E1115', sub: '#7A5054', accent: '#7C2230', accent2: '#B8925A', onAccent: '#FFF7F2', tint: '#F8EFEE' },
  { id: 'orange', name: 'Cam công trình', paper: '#FFFFFF', ink: '#1F2329', sub: '#5C636E', accent: '#E8731A', accent2: '#1F2937', onAccent: '#FFFFFF', tint: '#FDF1E7' },
  { id: 'indigo', name: 'Indigo', paper: '#FFFFFF', ink: '#1E1B38', sub: '#64618A', accent: '#4F46E5', accent2: '#06B6D4', onAccent: '#FFFFFF', tint: '#EEF0FF' },
  { id: 'teal', name: 'Xanh y tế', paper: '#FFFFFF', ink: '#0C2F2B', sub: '#4E7B74', accent: '#0F766E', accent2: '#5EC2B7', onAccent: '#FFFFFF', tint: '#E8F5F3' },
  { id: 'forest', name: 'Xanh rừng', paper: '#FFFFFF', ink: '#13261C', sub: '#52735F', accent: '#1F4D3A', accent2: '#D4A537', onAccent: '#F3FBF5', tint: '#EEF4EF' },
  { id: 'gold', name: 'Kem vàng', paper: '#FBF8F1', ink: '#2A2418', sub: '#7A6D55', accent: '#B08D3C', accent2: '#2A2418', onAccent: '#FFFFFF', tint: '#F3ECDC' },
  { id: 'slate', name: 'Ghi đá', paper: '#FFFFFF', ink: '#1E252F', sub: '#5E6773', accent: '#334155', accent2: '#0EA5E9', onAccent: '#F8FAFC', tint: '#EEF1F5' },
];
export const sfPalette = (id: string) => SF_PALETTES.find((p) => p.id === id) || SF_PALETTES[0];

// ---------- bố cục + mẫu ----------
export const SF_LAYOUTS = [
  { id: 'band', name: 'Dải đầu trang' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'classic', name: 'Cổ điển' },
  { id: 'diagonal', name: 'Vát chéo' },
  { id: 'sidebar', name: 'Dải bên' },
  { id: 'wave', name: 'Sóng mềm' },
  { id: 'arc', name: 'Vòng cung' },
  { id: 'frame', name: 'Khung viền' },
] as const;
export type SFLayout = (typeof SF_LAYOUTS)[number]['id'];

export interface SFSpec { layout: SFLayout; palette: string; font: string; watermark: boolean }
export interface SFTemplate { id: string; name: string; spec: SFSpec }
export const SF_TEMPLATES: SFTemplate[] = [
  { id: 'corp', name: 'Doanh nghiệp', spec: { layout: 'band', palette: 'navy', font: 'bvp', watermark: false } },
  { id: 'mini', name: 'Tối giản', spec: { layout: 'minimal', palette: 'black', font: 'montserrat', watermark: false } },
  { id: 'law', name: 'Luật · Kế toán', spec: { layout: 'classic', palette: 'burgundy', font: 'playfair', watermark: true } },
  { id: 'build', name: 'Xây dựng', spec: { layout: 'diagonal', palette: 'orange', font: 'oswald', watermark: false } },
  { id: 'tech', name: 'Công nghệ', spec: { layout: 'sidebar', palette: 'indigo', font: 'montserrat', watermark: false } },
  { id: 'med', name: 'Y tế · Nha khoa', spec: { layout: 'wave', palette: 'teal', font: 'bvp', watermark: true } },
  { id: 'edu', name: 'Giáo dục', spec: { layout: 'arc', palette: 'forest', font: 'prata', watermark: false } },
  { id: 'lux', name: 'Sang trọng', spec: { layout: 'frame', palette: 'gold', font: 'cormorant', watermark: true } },
  { id: 'estate', name: 'Bất động sản', spec: { layout: 'band', palette: 'forest', font: 'playfair', watermark: false } },
  { id: 'finance', name: 'Tư vấn · Tài chính', spec: { layout: 'classic', palette: 'slate', font: 'montserrat', watermark: false } },
];

// ---------- nội dung ----------
export type SFData = Record<string, string>;
export interface SFField { key: string; label: string; ph?: string; half?: boolean }
export const SF_FIELDS: SFField[] = [
  { key: 'brand', label: 'Tên thương hiệu (chữ to)', ph: 'AN KHANG', half: true },
  { key: 'company', label: 'Tên công ty đầy đủ', ph: 'CÔNG TY TNHH AN KHANG', half: true },
  { key: 'slogan', label: 'Slogan', ph: 'Tận tâm trong từng giải pháp' },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM' },
  { key: 'mst', label: 'Mã số thuế', ph: '0312 345 678', half: true },
  { key: 'phone', label: 'Điện thoại', ph: '028 3822 6688', half: true },
  { key: 'email', label: 'Email', ph: 'lienhe@ankhang.vn', half: true },
  { key: 'website', label: 'Website', ph: 'ankhang.vn', half: true },
  { key: 'rep', label: 'Người đại diện', ph: 'Quốc Bảo', half: true },
  { key: 'repTitle', label: 'Chức vụ', ph: 'Giám đốc', half: true },
];
export const defaultSFData = (): SFData => ({
  brand: 'AN KHANG', company: 'CÔNG TY TNHH AN KHANG', slogan: 'Tận tâm trong từng giải pháp',
  address: '12 Nguyễn Huệ, P. Bến Nghé, Q.1, TP.HCM', mst: '0312 345 678', phone: '028 3822 6688',
  email: 'lienhe@ankhang.vn', website: 'ankhang.vn', rep: 'Quốc Bảo', repTitle: 'Giám đốc',
});

// ---------- đo chữ thật (canvas, font đã nạp) → co cỡ + xuống dòng chính xác ----------
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, family: string, weight: number | string, italic = false, ls = 0): number {
  if (typeof document === 'undefined') return (t || '').length * size * 0.58;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return (t || '').length * size * 0.58;
  mctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px "${family}"`;
  return mctx.measureText(t || '').width + ls * Math.max(0, (t || '').length - 1);
}
const fitS = (t: string, maxW: number, size: number, family: string, weight: number | string, ls = 0, min = size * 0.35) => {
  const w = textW(t, size, family, weight, false, ls * 1);
  return w > maxW ? Math.max(min, (size * maxW) / w) : size;
};
function wrapW(t: string, maxW: number, size: number, family: string, weight: number | string): string[] {
  const words = (t || '').trim().split(/\s+/).filter(Boolean);
  const out: string[] = []; let cur = '';
  for (const w of words) {
    const nx = cur ? `${cur} ${w}` : w;
    if (cur && textW(nx, size, family, weight) > maxW) { out.push(cur); cur = w; } else cur = nx;
  }
  if (cur) out.push(cur);
  return out;
}
const STRIP = /^(CÔNG TY|CONG TY|CTY|TNHH|MTV|CỔ PHẦN|CO PHAN|CP|TẬP ĐOÀN|DOANH NGHIỆP|TƯ NHÂN|MỘT THÀNH VIÊN|THƯƠNG MẠI|DỊCH VỤ)$/i;
export function initials(d: SFData): string {
  const src = (d.brand || d.company || 'A').trim().split(/\s+/).filter((w) => !STRIP.test(w));
  const ws = src.length ? src : (d.company || 'A').split(/\s+/);
  return ws.slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || 'A';
}
const up = (s: string) => (s || '').toLocaleUpperCase('vi-VN');

// ---------- logo: ảnh khách tải lên hoặc monogram vẽ bằng code ----------
type MarkShape = 'circle' | 'square' | 'hex' | 'shield' | 'diamond' | 'ring';
const SHAPE_OF: Record<SFLayout, MarkShape> = { band: 'square', minimal: 'circle', classic: 'shield', diagonal: 'hex', sidebar: 'square', wave: 'circle', arc: 'ring', frame: 'diamond' };
function Mark({ cx, cy, s, shape, fill, ink, d, logo, f }: { cx: number; cy: number; s: number; shape: MarkShape; fill: string; ink: string; d: SFData; logo?: string; f: SFont }) {
  if (logo) return <image href={logo} x={cx - s / 2} y={cy - s / 2} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
  const r = s / 2;
  const ini = initials(d);
  const fs = s * (ini.length > 1 ? 0.36 : 0.46);
  let shapeEl: ReactNode;
  let txt = ink;
  switch (shape) {
    case 'circle': shapeEl = <circle cx={cx} cy={cy} r={r} fill={fill} />; break;
    case 'square': shapeEl = <rect x={cx - r} y={cy - r} width={s} height={s} rx={s * 0.2} fill={fill} />; break;
    case 'hex': {
      const pts = Array.from({ length: 6 }, (_, i) => { const a = (Math.PI / 3) * i + Math.PI / 6; return `${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`; }).join(' ');
      shapeEl = <polygon points={pts} fill={fill} />; break;
    }
    case 'shield': shapeEl = <path d={`M${cx - r * 0.86} ${cy - r * 0.9} H${cx + r * 0.86} V${cy + r * 0.05} C${cx + r * 0.86} ${cy + r * 0.62} ${cx + r * 0.4} ${cy + r * 0.88} ${cx} ${cy + r} C${cx - r * 0.4} ${cy + r * 0.88} ${cx - r * 0.86} ${cy + r * 0.62} ${cx - r * 0.86} ${cy + r * 0.05} Z`} fill={fill} />; break;
    case 'diamond': shapeEl = <g><rect x={cx - r * 0.7} y={cy - r * 0.7} width={r * 1.4} height={r * 1.4} transform={`rotate(45 ${cx} ${cy})`} fill="none" stroke={fill} strokeWidth={s * 0.035} /></g>; txt = fill; break;
    default: shapeEl = <g><circle cx={cx} cy={cy} r={r * 0.94} fill="none" stroke={fill} strokeWidth={s * 0.05} /><circle cx={cx} cy={cy} r={r * 0.78} fill="none" stroke={fill} strokeWidth={s * 0.015} /></g>; txt = fill;
  }
  return (
    <g>
      {shapeEl}
      <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={shape === 'diamond' ? fs * 0.82 : fs} fill={txt}>{ini}</text>
    </g>
  );
}

// ---------- liên hệ: icon + chữ, tự xếp hàng theo bề rộng ----------
const ICONS: Record<string, string> = {
  phone: 'M6.5 4h3l1.5 4-2 1.3a12 12 0 005.7 5.7L16 17l4 1.5v3a1.5 1.5 0 01-1.6 1.5C10 23 1 14 1 5.6A1.5 1.5 0 012.5 4z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18',
  pin: 'M12 22s7-6.7 7-12A7 7 0 005 10c0 5.3 7 12 7 12zM12 7.5A2.5 2.5 0 1012 12.5 2.5 2.5 0 0012 7.5z',
  tax: 'M6 2h9l5 5v15H6zM14 2v6h6M9 13h8M9 17h6',
};
interface CItem { t: string; v: string }
const contactsOf = (d: SFData, which = ['pin', 'tax', 'phone', 'mail', 'globe']): CItem[] => {
  const all: Record<string, string> = { pin: d.address, tax: d.mst ? `MST: ${d.mst}` : '', phone: d.phone, mail: d.email, globe: d.website };
  return which.map((t) => ({ t, v: all[t] || '' })).filter((c) => c.v.trim());
};
const itemW = (c: CItem, fs: number) => fs * 1.45 + textW(c.v, fs, BODY, BW);
function packRows(items: CItem[], maxW: number, fs0: number, oneEach = false) {
  let fs = fs0;
  const widest = Math.max(0, ...items.map((c) => itemW(c, fs)));
  if (widest > maxW) fs = Math.max(fs0 * 0.6, fs * (maxW / widest));
  const gap = fs * 1.5;
  const rows: { items: CItem[]; w: number }[] = [];
  for (const c of items) {
    const w = itemW(c, fs);
    const last = rows[rows.length - 1];
    if (!oneEach && last && last.w + gap + w <= maxW) { last.items.push(c); last.w += gap + w; } else rows.push({ items: [c], w });
  }
  return { fs, gap, rows };
}
function Contacts({ items, x, y, maxW, fs: fs0, align = 'left', color, iconColor, lh = 1.75, oneEach = false }: {
  items: CItem[]; x: number; y: number; maxW: number; fs: number; align?: 'left' | 'center' | 'right'; color: string; iconColor: string; lh?: number; oneEach?: boolean;
}) {
  const { fs, gap, rows } = packRows(items, maxW, fs0, oneEach);
  return (
    <g fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fs} fill={color}>
      {rows.map((r, ri) => {
        let cx = align === 'left' ? x : align === 'center' ? x - r.w / 2 : x - r.w;
        const yy = y + ri * fs * lh;
        return (
          <g key={ri}>
            {r.items.map((c) => {
              const g = (
                <g key={c.t}>
                  <g transform={`translate(${cx} ${yy - fs * 0.86}) scale(${(fs * 1.02) / 24})`} stroke={iconColor} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[c.t]} /></g>
                  <text x={cx + fs * 1.45} y={yy}>{c.v}</text>
                </g>
              );
              cx += itemW(c, fs) + gap;
              return g;
            })}
          </g>
        );
      })}
    </g>
  );
}
const rowsH = (items: CItem[], maxW: number, fs: number, lh = 1.75, oneEach = false) => { const p = packRows(items, maxW, fs, oneEach); return p.rows.length * p.fs * lh; };

// ---------- thư mẫu (chỉ để xem trước — file in tắt) ----------
function SampleLetter({ x, y, w, yMax, d }: { x: number; y: number; w: number; yMax: number; d: SFData }) {
  const fs = 34, lh = 58, c = '#3B3F46';
  const paras = [
    `Lời đầu tiên, ${d.brand || 'chúng tôi'} xin gửi lời cảm ơn chân thành đến Quý khách hàng đã tin tưởng và đồng hành cùng chúng tôi trong suốt thời gian qua.`,
    `Nhằm phục vụ Quý khách tốt hơn, từ ngày 01/02/2027 chúng tôi chính thức áp dụng chương trình chăm sóc khách hàng mới với nhiều ưu đãi thiết thực. Chi tiết xin liên hệ hotline ${d.phone || ''} hoặc truy cập ${d.website || ''}.`,
    'Trân trọng cảm ơn và kính chúc Quý khách một năm mới an khang, thịnh vượng.',
  ];
  const out: ReactNode[] = [];
  let yy = y + fs;
  out.push(<text key="no" x={x} y={yy} fontSize={fs * 0.9} fill={c}>Số: 125/2027/{initials(d)}-CV</text>);
  out.push(<text key="dt" x={x + w} y={yy} textAnchor="end" fontStyle="italic" fontSize={fs * 0.9} fill={c}>TP.HCM, ngày 15 tháng 01 năm 2027</text>);
  yy += lh * 2;
  out.push(<text key="kg" x={x} y={yy} fontWeight={600} fontSize={fs} fill={c}>Kính gửi: Quý khách hàng và đối tác</text>);
  yy += lh * 1.6;
  paras.forEach((pp, pi) => {
    for (const ln of wrapW(pp, w - 60, fs, BODY, 400)) {
      if (yy > yMax - lh * 5) return;
      out.push(<text key={`${pi}-${yy}`} x={x + 60} y={yy} fontSize={fs} fill={c}>{ln}</text>);
      yy += lh;
    }
    yy += lh * 0.5;
  });
  yy = Math.min(yy + lh, yMax - lh * 3.2);
  const sx = x + w - 380;
  out.push(<text key="t" x={sx} y={yy} textAnchor="middle" fontWeight={600} fontSize={fs} fill={c}>{up(d.repTitle || 'Giám đốc')}</text>);
  out.push(<text key="n" x={sx} y={yy + lh * 2.6} textAnchor="middle" fontWeight={600} fontSize={fs} fill={c}>{d.rep}</text>);
  return <g fontFamily={`"${BODY}"`} fontWeight={400}>{out}</g>;
}

// ======================================================================================
// TIÊU ĐỀ THƯ A4
// ======================================================================================
export interface LHProps { spec: SFSpec; data: SFData; logo?: string; bleed?: boolean; sample?: boolean; crop?: 'header' | 'footer'; style?: CSSProperties }
interface LHParts { bg: ReactNode; head: ReactNode; foot: ReactNode; bodyTop: number; bodyBot: number; bodyX: number }

function lhParts(spec: SFSpec, d: SFData, logo: string | undefined, b: number): LHParts {
  const W = ST_LH.wMm * U, H = ST_LH.hMm * U, M = 200;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  const disp = `"${f.family}"`;
  const brand = f.upper ? up(d.brand) : d.brand;
  const shape = SHAPE_OF[spec.layout];
  const all = contactsOf(d);
  const paper = <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.paper} />;
  const mk = (cx: number, cy: number, s: number, fill: string, ink: string, sh: MarkShape = shape) => <Mark cx={cx} cy={cy} s={s} shape={sh} fill={fill} ink={ink} d={d} logo={logo} f={f} />;

  switch (spec.layout) {
    case 'band': {
      const bh = 380;
      const right = [d.slogan, d.website].filter(Boolean);
      const rW = right.length ? Math.max(...right.map((t, i) => textW(t, i ? 30 : 32, BODY, BW, i === 0))) : 0;
      const bMax = W - 2 * M - 250 - Math.min(rW, W * 0.34) - 80;
      return {
        bg: paper,
        head: (
          <g>
            <rect x={-b} y={-b} width={W + b * 2} height={bh + b} fill={p.accent} />
            <rect x={-b} y={bh} width={W + b * 2} height={16} fill={p.accent2} />
            {mk(M + 95, bh / 2, 190, p.onAccent, p.accent)}
            <text x={M + 240} y={bh / 2 + 6} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, bMax, 96, f.family, f.weight)} fill={p.onAccent}>{brand}</text>
            {d.company && <text x={M + 242} y={bh / 2 + 68} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.company, bMax, 30, BODY, BW, 2)} letterSpacing={2} fill={p.onAccent} opacity={0.82}>{d.company}</text>}
            <g textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={BW}>
              {d.slogan && <text x={W - M} y={bh / 2 + 4} fontStyle="italic" fontSize={fitS(d.slogan, W * 0.34, 32, BODY, BW)} fill={p.onAccent} opacity={0.9}>{d.slogan}</text>}
              {d.website && <text x={W - M} y={bh / 2 + 58} fontSize={30} fill={p.accent2} letterSpacing={1}>{d.website}</text>}
            </g>
          </g>
        ),
        foot: (
          <g>
            <rect x={M} y={2690} width={W - 2 * M} height={4} fill={p.accent2} />
            <Contacts items={all} x={W / 2} y={2770} maxW={W - 2 * M} fs={28} align="center" color={p.sub} iconColor={p.accent} />
            <rect x={-b} y={2925} width={W + b * 2} height={H - 2925 + b} fill={p.accent} />
          </g>
        ),
        bodyTop: 520, bodyBot: 2640, bodyX: M,
      };
    }
    case 'minimal': {
      const right = contactsOf(d, ['phone', 'mail', 'globe']);
      const rW = Math.min(W * 0.36, Math.max(0, ...right.map((c) => itemW(c, 28))));
      const bMax = W - 2 * M - 170 - rW - 80;
      return {
        bg: paper,
        head: (
          <g>
            {mk(M + 65, 250, 130, p.accent, p.onAccent)}
            <text x={M + 165} y={258} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, bMax, 76, f.family, f.weight)} fill={p.ink}>{brand}</text>
            {d.company && <text x={M + 167} y={305} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.company, bMax, 25, BODY, BW, 2)} letterSpacing={2} fill={p.sub}>{d.company}</text>}
            <Contacts items={right} x={W - M} y={212} maxW={W * 0.36} fs={28} align="right" color={p.sub} iconColor={p.accent} lh={1.7} oneEach />
            <rect x={M} y={380} width={W - 2 * M} height={2} fill={p.ink} opacity={0.18} />
          </g>
        ),
        foot: (
          <g>
            <rect x={M} y={2720} width={120} height={10} fill={p.accent} />
            <Contacts items={contactsOf(d, ['pin', 'tax'])} x={M} y={2800} maxW={W - 2 * M} fs={26} color={p.sub} iconColor={p.accent} />
          </g>
        ),
        bodyTop: 480, bodyBot: 2660, bodyX: M,
      };
    }
    case 'classic': {
      const brandFs = fitS(brand, W - 2 * M, 84, f.family, f.weight);
      return {
        bg: paper,
        head: (
          <g textAnchor="middle">
            {mk(W / 2, 215, 170, p.accent, p.onAccent)}
            <text x={W / 2} y={410} fontFamily={disp} fontWeight={f.weight} fontSize={brandFs} fill={p.ink}>{brand}</text>
            {d.company && <text x={W / 2} y={465} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(up(d.company), W - 2 * M, 26, BODY, BW, 6)} letterSpacing={6} fill={p.sub}>{up(d.company)}</text>}
            <rect x={M} y={510} width={W - 2 * M} height={6} fill={p.accent} />
            <rect x={M} y={526} width={W - 2 * M} height={2} fill={p.accent} />
          </g>
        ),
        foot: (
          <g>
            <rect x={M} y={2680} width={W - 2 * M} height={2} fill={p.accent} />
            <rect x={M} y={2688} width={W - 2 * M} height={6} fill={p.accent} />
            <Contacts items={all} x={W / 2} y={2770} maxW={W - 2 * M} fs={27} align="center" color={p.sub} iconColor={p.accent} />
          </g>
        ),
        bodyTop: 620, bodyBot: 2630, bodyX: M,
      };
    }
    case 'diagonal': {
      const x0 = W * 0.6, hb = 340;
      const blkItems = contactsOf(d, ['phone', 'mail', 'globe']);
      const blkMax = W - (x0 + 170) - 130;
      const bMax = x0 - 90 - (M + 210);
      const slMax = W * 0.36 - 120 - M;
      return {
        bg: paper,
        head: (
          <g>
            <polygon points={`${x0 - 110},${-b} ${x0 - 50},${-b} ${x0 + 90},${hb} ${x0 + 30},${hb}`} fill={p.accent2} />
            <polygon points={`${x0},${-b} ${W + b},${-b} ${W + b},${hb} ${x0 + 140},${hb}`} fill={p.accent} />
            <Contacts items={blkItems} x={W - 130} y={140} maxW={blkMax} fs={27} align="right" color={p.onAccent} iconColor={p.onAccent} lh={1.7} oneEach />
            {mk(M + 85, 200, 170, p.accent, p.onAccent)}
            <text x={M + 205} y={212} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, bMax, 100, f.family, f.weight, 2)} letterSpacing={2} fill={p.ink}>{brand}</text>
            {d.company && <text x={M + 207} y={265} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.company, bMax, 26, BODY, BW, 1)} letterSpacing={1} fill={p.sub}>{d.company}</text>}
            <rect x={M} y={hb + 60} width={W * 0.28} height={8} fill={p.accent} />
          </g>
        ),
        foot: (
          <g>
            <polygon points={`${-b},2790 ${W * 0.36},2790 ${W * 0.36 - 100},${H + b} ${-b},${H + b}`} fill={p.accent2} />
            <polygon points={`${W * 0.36 + 30},2790 ${W * 0.36 + 70},2790 ${W * 0.36 - 30},${H + b} ${W * 0.36 - 70},${H + b}`} fill={p.accent} />
            {d.slogan && <text x={M - 40} y={2895} fontFamily={`"${BODY}"`} fontStyle="italic" fontWeight={BW} fontSize={fitS(d.slogan, slMax, 30, BODY, BW)} fill={p.onAccent}>{d.slogan}</text>}
            <Contacts items={contactsOf(d, ['pin', 'tax'])} x={W * 0.39} y={2860} maxW={W - W * 0.39 - M + 60} fs={25} color={p.sub} iconColor={p.accent} lh={1.6} />
          </g>
        ),
        bodyTop: 500, bodyBot: 2650, bodyX: M,
      };
    }
    case 'sidebar': {
      const band = 160, x = 300;
      const right = contactsOf(d, ['globe', 'phone']);
      const rW = Math.min(W * 0.3, Math.max(0, ...right.map((c) => itemW(c, 27))));
      const bMax = W - M - rW - 60 - (x + 120);
      const dots: ReactNode[] = [];
      for (let yy = 60; yy < 640; yy += 44) for (let xx = 34; xx < band - 10; xx += 44) dots.push(<circle key={`${xx}-${yy}`} cx={xx} cy={yy} r={5} fill={p.onAccent} opacity={0.28} />);
      return {
        bg: paper,
        head: (
          <g>
            <rect x={-b} y={-b} width={band + b} height={H + b * 2} fill={p.accent} />
            <rect x={band} y={-b} width={22} height={H + b * 2} fill={p.accent2} />
            {dots}
            {mk(x + 55, 230, 120, p.accent, p.onAccent)}
            <text x={x + 140} y={240} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, bMax, 80, f.family, f.weight)} fill={p.ink}>{brand}</text>
            {d.company && <text x={x + 142} y={290} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.company, bMax, 25, BODY, BW, 2)} letterSpacing={2} fill={p.sub}>{d.company}</text>}
            <Contacts items={right} x={W - M} y={222} maxW={W * 0.3} fs={27} align="right" color={p.sub} iconColor={p.accent} oneEach />
            <rect x={x} y={360} width={220} height={8} fill={p.accent2} />
          </g>
        ),
        foot: (
          <g>
            <text transform={`translate(${band / 2 + 14} ${H - 220}) rotate(-90)`} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, 1400, 44, f.family, f.weight, 10)} letterSpacing={10} fill={p.onAccent}>{brand}</text>
            <rect x={x} y={2700} width={W - x - M} height={2} fill={p.ink} opacity={0.15} />
            <Contacts items={all} x={x} y={2780} maxW={W - x - M} fs={26} color={p.sub} iconColor={p.accent} />
          </g>
        ),
        bodyTop: 470, bodyBot: 2650, bodyX: x,
      };
    }
    case 'wave': {
      const right = contactsOf(d, ['phone', 'globe']);
      const rW = Math.min(W * 0.32, Math.max(0, ...right.map((c) => itemW(c, 28))));
      const bMax = W - 2 * M - 190 - rW - 60;
      const fItems = all;
      const fp = packRows(fItems, W - 2 * M, 26);
      const fH = fp.rows.length * fp.fs * 1.7;
      return {
        bg: paper,
        head: (
          <g>
            <path d={`M${-b} ${-b} H${W + b} V230 C${W * 0.72} 320 ${W * 0.36} 150 ${-b} 260 Z`} fill={p.tint} />
            <path d={`M${-b} ${-b} H${W + b} V140 C${W * 0.7} 220 ${W * 0.32} 80 ${-b} 170 Z`} fill={p.accent} />
            {mk(M + 80, 410, 150, p.accent, p.onAccent)}
            <text x={M + 185} y={418} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, bMax, 78, f.family, f.weight)} fill={p.ink}>{brand}</text>
            {d.company && <text x={M + 187} y={466} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.company, bMax, 25, BODY, BW, 2)} letterSpacing={2} fill={p.sub}>{d.company}</text>}
            <Contacts items={right} x={W - M} y={400} maxW={W * 0.32} fs={28} align="right" color={p.accent} iconColor={p.accent} oneEach />
          </g>
        ),
        foot: (
          <g>
            <path d={`M${-b} ${H + b} V2690 C${W * 0.3} 2620 ${W * 0.66} 2760 ${W + b} 2670 V${H + b} Z`} fill={p.tint} />
            <path d={`M${-b} ${H + b} V2790 C${W * 0.32} 2730 ${W * 0.68} 2850 ${W + b} 2770 V${H + b} Z`} fill={p.accent} />
            <Contacts items={fItems} x={W / 2} y={Math.max(2868, H - 50 - fH + fp.fs)} maxW={W - 2 * M} fs={26} align="center" color={p.onAccent} iconColor={p.onAccent} lh={1.7} />
          </g>
        ),
        bodyTop: 570, bodyBot: 2580, bodyX: M,
      };
    }
    case 'arc': {
      const bMax = W * 0.5;
      return {
        bg: paper,
        head: (
          <g>
            <circle cx={W + 40} cy={-60} r={470} fill={p.accent} />
            <circle cx={W - 420} cy={330} r={86} fill={p.accent2} />
            <circle cx={W - 250} cy={470} r={34} fill="none" stroke={p.accent} strokeWidth={6} />
            {mk(M + 80, 230, 160, p.accent, p.onAccent)}
            <text x={M + 190} y={232} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, bMax, 80, f.family, f.weight)} fill={p.ink}>{brand}</text>
            {d.company && <text x={M + 192} y={282} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(up(d.company), bMax, 24, BODY, BW, 3)} letterSpacing={3} fill={p.sub}>{up(d.company)}</text>}
            {d.slogan && <text x={M + 192} y={334} fontFamily={`"${BODY}"`} fontStyle="italic" fontWeight={BW} fontSize={fitS(d.slogan, bMax, 27, BODY, BW)} fill={p.accent}>{d.slogan}</text>}
          </g>
        ),
        foot: (
          <g>
            <circle cx={-90} cy={H + 90} r={320} fill={p.accent2} />
            <circle cx={170} cy={H - 330} r={26} fill={p.accent} />
            <rect x={M + 200} y={2730} width={W - 2 * M - 200} height={3} fill={p.accent} />
            <Contacts items={all} x={M + 200} y={2810} maxW={W - 2 * M - 200} fs={26} color={p.sub} iconColor={p.accent} />
          </g>
        ),
        bodyTop: 520, bodyBot: 2660, bodyX: M,
      };
    }
    default: { // frame
      const fi = 90;
      const orn = (y: number) => (
        <g>
          <rect x={W / 2 - 420} y={y - 1} width={360} height={2} fill={p.accent} />
          <rect x={W / 2 + 60} y={y - 1} width={360} height={2} fill={p.accent} />
          <rect x={W / 2 - 14} y={y - 14} width={28} height={28} transform={`rotate(45 ${W / 2} ${y})`} fill={p.accent} />
        </g>
      );
      const corner = (x: number, y: number) => <rect key={`${x}-${y}`} x={x - 12} y={y - 12} width={24} height={24} transform={`rotate(45 ${x} ${y})`} fill={p.accent} />;
      return {
        bg: (
          <g>
            {paper}
            <rect x={fi} y={fi} width={W - fi * 2} height={H - fi * 2} fill="none" stroke={p.accent} strokeWidth={4} />
            <rect x={fi + 22} y={fi + 22} width={W - fi * 2 - 44} height={H - fi * 2 - 44} fill="none" stroke={p.accent} strokeWidth={1.5} />
            {[corner(fi, fi), corner(W - fi, fi), corner(fi, H - fi), corner(W - fi, H - fi)]}
          </g>
        ),
        head: (
          <g textAnchor="middle">
            {mk(W / 2, 290, 150, p.accent, p.onAccent)}
            <text x={W / 2} y={480} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(up(brand), W - 2 * M - 100, 86, f.family, f.weight, 6)} letterSpacing={6} fill={p.ink}>{up(brand)}</text>
            {d.company && <text x={W / 2} y={535} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(up(d.company), W - 2 * M - 100, 24, BODY, BW, 7)} letterSpacing={7} fill={p.sub}>{up(d.company)}</text>}
            {orn(590)}
          </g>
        ),
        foot: (
          <g>
            {orn(2680)}
            <Contacts items={all} x={W / 2} y={2755} maxW={W - 2 * M - 80} fs={25} align="center" color={p.sub} iconColor={p.accent} lh={1.7} />
          </g>
        ),
        bodyTop: 680, bodyBot: 2620, bodyX: M,
      };
    }
  }
}

export function LetterheadSvg({ spec, data, logo, bleed = false, sample = false, crop, style }: LHProps) {
  const W = ST_LH.wMm * U, H = ST_LH.hMm * U;
  const b = bleed && !crop ? ST_LH_BLEED_MM * U : 0;
  const p = sfPalette(spec.palette);
  const parts = lhParts(spec, data, logo, b);
  const hb = parts.bodyTop - 40, ft = parts.bodyBot + 20;
  const vb = crop === 'header' ? `0 0 ${W} ${hb}` : crop === 'footer' ? `0 ${ft} ${W} ${H - ft}` : `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  const f = sfFont(spec.font);
  const bw = W - parts.bodyX - 200;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-body-top={parts.bodyTop} data-body-bot={parts.bodyBot}>
      {parts.bg}
      {spec.watermark && !crop && (
        <g opacity={0.055}><Mark cx={W / 2} cy={(parts.bodyTop + parts.bodyBot) / 2} s={900} shape={SHAPE_OF[spec.layout] === 'ring' || SHAPE_OF[spec.layout] === 'diamond' ? SHAPE_OF[spec.layout] : 'ring'} fill={p.accent} ink={p.paper} d={data} logo={logo} f={f} /></g>
      )}
      {parts.head}
      {parts.foot}
      {sample && !crop && <SampleLetter x={parts.bodyX} y={parts.bodyTop + 40} w={bw} yMax={parts.bodyBot} d={data} />}
    </svg>
  );
}

// ======================================================================================
// KẸP FILE (presentation folder A4): bìa trước, bìa sau, gáy, túi — + khuôn bế trải phẳng
// ======================================================================================
export const FD = { PW: 2200, PH: 3100, SP: 60, PK: 1100, TAB: 150 };
export const FD_CARD = { cx: FD.PW * 0.62, cy: 650, w: 900, h: 540 };
interface Ext { l: number; r: number; t: number; b: number }
const E0: Ext = { l: 0, r: 0, t: 0, b: 0 };
const isDarkCover = (l: SFLayout) => l === 'band' || l === 'sidebar' || l === 'classic';

export function folderFront(spec: SFSpec, d: SFData, logo: string | undefined, e: Ext = E0): ReactNode {
  const { PW: W, PH: H } = FD;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  const disp = `"${f.family}"`;
  const brand = f.upper || spec.layout === 'frame' ? up(d.brand) : d.brand;
  const shape = SHAPE_OF[spec.layout];
  const dark = isDarkCover(spec.layout);
  const bgc = dark ? p.accent : p.paper;
  const fg = dark ? p.onAccent : p.ink;
  const subc = dark ? p.onAccent : p.sub;
  const bg = <rect x={-e.l} y={-e.t} width={W + e.l + e.r} height={H + e.t + e.b} fill={bgc} />;
  const mk = (cx: number, cy: number, s: number, fill: string, ink: string) => <Mark cx={cx} cy={cy} s={s} shape={shape} fill={fill} ink={ink} d={d} logo={logo} f={f} />;
  const center = (y: number, markS: number, markFill: string, markInk: string) => (
    <g textAnchor="middle">
      {mk(W / 2, y, markS, markFill, markInk)}
      <text x={W / 2} y={y + markS / 2 + 190} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, W - 360, 150, f.family, f.weight, spec.layout === 'frame' ? 8 : 0)} letterSpacing={spec.layout === 'frame' ? 8 : 0} fill={fg}>{brand}</text>
      {d.slogan && <text x={W / 2} y={y + markS / 2 + 290} fontFamily={`"${BODY}"`} fontStyle="italic" fontWeight={BW} fontSize={fitS(d.slogan, W - 400, 46, BODY, BW)} fill={subc} opacity={0.88}>{d.slogan}</text>}
    </g>
  );
  const web = (y: number, c: string) => d.website ? <text x={W / 2} y={y} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.website, W - 400, 40, BODY, BW, 3)} letterSpacing={3} fill={c}>{d.website}</text> : null;
  switch (spec.layout) {
    case 'band':
      return <g>{bg}<rect x={-e.l} y={H * 0.76} width={W + e.l + e.r} height={22} fill={p.accent2} />{center(H * 0.33, 400, p.onAccent, p.accent)}{web(H - 200, p.accent2)}</g>;
    case 'minimal':
      return <g>{bg}{center(H * 0.38, 330, p.accent, p.onAccent)}<rect x={W / 2 - 80} y={H * 0.72} width={160} height={10} fill={p.accent} />{web(H - 200, p.sub)}</g>;
    case 'classic':
      return (
        <g>{bg}
          <rect x={130} y={130} width={W - 260} height={H - 260} fill="none" stroke={p.accent2} strokeWidth={8} />
          <rect x={160} y={160} width={W - 320} height={H - 320} fill="none" stroke={p.accent2} strokeWidth={2.5} />
          {center(H * 0.36, 360, p.onAccent, p.accent)}
          {d.company && <text x={W / 2} y={H * 0.72} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(up(d.company), W - 500, 34, BODY, BW, 8)} letterSpacing={8} fill={p.accent2}>{up(d.company)}</text>}
          {web(H - 250, p.onAccent)}
        </g>
      );
    case 'diagonal':
      return (
        <g>{bg}
          <polygon points={`${-e.l},${H * 0.6} ${W + e.r},${H * 0.42} ${W + e.r},${H + e.b} ${-e.l},${H + e.b}`} fill={p.accent} />
          <polygon points={`${-e.l},${H * 0.555} ${W + e.r},${H * 0.375} ${W + e.r},${H * 0.4} ${-e.l},${H * 0.58}`} fill={p.accent2} />
          {mk(260 + 130, 470, 260, p.accent, p.onAccent)}
          <text x={260} y={900} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, W - 520, 200, f.family, f.weight, 4)} letterSpacing={4} fill={p.ink}>{brand}</text>
          {d.slogan && <text x={262} y={1000} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.slogan, W - 520, 46, BODY, BW)} fill={p.sub}>{d.slogan}</text>}
          {d.website && <text x={W - 220} y={H - 220} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.website, W * 0.6, 42, BODY, BW, 3)} letterSpacing={3} fill={p.onAccent}>{d.website}</text>}
        </g>
      );
    case 'sidebar': {
      const dots: ReactNode[] = [];
      for (let yy = 200; yy < 1300; yy += 80) for (let xx = W - 900; xx < W - 120; xx += 80) dots.push(<circle key={`${xx}-${yy}`} cx={xx} cy={yy} r={9} fill={p.onAccent} opacity={0.16} />);
      return (
        <g>{bg}{dots}
          <rect x={220} y={H * 0.5} width={260} height={16} fill={p.accent2} />
          {mk(220 + 140, H * 0.5 - 300, 280, p.onAccent, p.accent)}
          <text x={220} y={H * 0.5 + 230} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, W - 440, 170, f.family, f.weight)} fill={p.onAccent}>{brand}</text>
          {d.slogan && <text x={222} y={H * 0.5 + 330} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.slogan, W - 440, 46, BODY, BW)} fill={p.onAccent} opacity={0.85}>{d.slogan}</text>}
          {d.website && <text x={222} y={H - 220} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.website, W - 440, 40, BODY, BW, 3)} letterSpacing={3} fill={p.accent2}>{d.website}</text>}
        </g>
      );
    }
    case 'wave':
      return (
        <g>{bg}
          <path d={`M${-e.l} ${H + e.b} V${H * 0.7} C${W * 0.3} ${H * 0.62} ${W * 0.66} ${H * 0.78} ${W + e.r} ${H * 0.66} V${H + e.b} Z`} fill={p.tint} />
          <path d={`M${-e.l} ${H + e.b} V${H * 0.8} C${W * 0.32} ${H * 0.74} ${W * 0.7} ${H * 0.86} ${W + e.r} ${H * 0.76} V${H + e.b} Z`} fill={p.accent} />
          {center(H * 0.3, 360, p.accent, p.onAccent)}
          {web(H - 180, p.onAccent)}
        </g>
      );
    case 'arc':
      return (
        <g>{bg}
          <circle cx={W + 80} cy={-80} r={1150} fill={p.accent} />
          <circle cx={W * 0.36} cy={H * 0.33} r={170} fill={p.accent2} />
          <circle cx={-60} cy={H + 60} r={420} fill={p.tint} />
          {mk(260 + 150, H * 0.56, 300, p.accent, p.onAccent)}
          <text x={260} y={H * 0.56 + 380} fontFamily={disp} fontWeight={f.weight} fontSize={fitS(brand, W - 520, 150, f.family, f.weight)} fill={p.ink}>{brand}</text>
          {d.slogan && <text x={262} y={H * 0.56 + 480} fontFamily={`"${BODY}"`} fontStyle="italic" fontWeight={BW} fontSize={fitS(d.slogan, W - 520, 44, BODY, BW)} fill={p.accent}>{d.slogan}</text>}
          {d.website && <text x={W - 220} y={H - 200} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.website, W * 0.6, 40, BODY, BW, 3)} letterSpacing={3} fill={p.sub}>{d.website}</text>}
        </g>
      );
    default: // frame
      return (
        <g>{bg}
          <rect x={120} y={120} width={W - 240} height={H - 240} fill="none" stroke={p.accent} strokeWidth={8} />
          <rect x={150} y={150} width={W - 300} height={H - 300} fill="none" stroke={p.accent} strokeWidth={2.5} />
          {center(H * 0.36, 330, p.accent, p.onAccent)}
          <rect x={W / 2 - 18} y={H * 0.7 - 18} width={36} height={36} transform={`rotate(45 ${W / 2} ${H * 0.7})`} fill={p.accent} />
          {web(H - 260, p.sub)}
        </g>
      );
  }
}

export function folderBack(spec: SFSpec, d: SFData, logo: string | undefined, e: Ext = E0): ReactNode {
  const { PW: W, PH: H } = FD;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  const brand = f.upper || spec.layout === 'frame' ? up(d.brand) : d.brand;
  const items = contactsOf(d);
  const fs = packRows(items, W - 500, 32, true).fs;
  const ch = items.length * fs * 1.8;
  return (
    <g>
      <rect x={-e.l} y={-e.t} width={W + e.l + e.r} height={H + e.t + e.b} fill={spec.layout === 'frame' ? p.paper : '#FFFFFF'} />
      <Mark cx={W / 2} cy={H * 0.5} s={200} shape={SHAPE_OF[spec.layout]} fill={p.accent} ink={p.onAccent} d={d} logo={logo} f={f} />
      <text x={W / 2} y={H * 0.5 + 220} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fitS(brand, W - 500, 64, f.family, f.weight)} fill={p.ink}>{brand}</text>
      {d.company && <text x={W / 2} y={H * 0.5 + 290} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.company, W - 500, 28, BODY, BW, 2)} letterSpacing={2} fill={p.sub}>{d.company}</text>}
      <Contacts items={items} x={W / 2} y={Math.min(H * 0.5 + 420, H - 200 - ch)} maxW={W - 500} fs={32} align="center" color={p.sub} iconColor={p.accent} lh={1.8} oneEach />
      <rect x={-e.l} y={H - 70} width={W + e.l + e.r} height={70 + e.b} fill={p.accent} />
    </g>
  );
}

export function folderSpine(spec: SFSpec, d: SFData, e: Ext = E0): ReactNode {
  const { SP: W, PH: H } = FD;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  const brand = up(d.brand);
  return (
    <g>
      <rect x={-e.l} y={-e.t} width={W + e.l + e.r} height={H + e.t + e.b} fill={p.accent} />
      <text transform={`translate(${W / 2 + 12} ${H / 2}) rotate(-90)`} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fitS(brand, H * 0.5, 34, f.family, f.weight, 8)} letterSpacing={8} fill={p.onAccent}>{brand}</text>
    </g>
  );
}

// túi: toạ độ "đứng" (nhìn từ trong kẹp): y=0 mép tự do (trên), y=PK nếp gấp (dưới)
const pocketTop = (u: number) => { // mép trên cong nhẹ, thấp dần sang phải (khe card bên phải)
  const t = u / FD.PW; return 40 + 160 * (t * t * (3 - 2 * t));
};
export const pocketEdgePath = () => `M0 40 C${FD.PW * 0.35} 40 ${FD.PW * 0.55} 200 ${FD.PW} 200`;
export function pocketShapePts(n = 40): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) { const u = (FD.PW * i) / n; pts.push([u, pocketTop(u)]); }
  pts.push([FD.PW, FD.PK], [0, FD.PK]);
  return pts;
}
export function cardSlits(): [number, number, number, number][] {
  const { cx, cy, w, h } = FD_CARD;
  const bl = [cx - w / 2, cy + h / 2], br = [cx + w / 2, cy + h / 2];
  const c1 = [bl[0] + 25, bl[1] - 25], c2 = [br[0] - 25, br[1] - 25];
  return [[c1[0] - 75, c1[1] - 75, c1[0] + 75, c1[1] + 75], [c2[0] - 75, c2[1] + 75, c2[0] + 75, c2[1] - 75]];
}
export function folderPocket(spec: SFSpec, d: SFData, logo: string | undefined, e: Ext = E0, showSlits = false): ReactNode {
  const { PW: W, PK: H } = FD;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  return (
    <g>
      <rect x={-e.l} y={-e.t} width={W + e.l + e.r} height={H + e.t + e.b} fill={p.accent} />
      <g opacity={0.12}><Mark cx={300} cy={H * 0.62} s={560} shape={SHAPE_OF[spec.layout] === 'diamond' ? 'diamond' : 'ring'} fill={p.onAccent} ink={p.accent} d={d} logo={undefined} f={f} /></g>
      <rect x={-e.l} y={H - 60} width={W + e.l + e.r} height={14} fill={p.accent2} />
      {d.slogan && <text x={160} y={H - 200} fontFamily={`"${BODY}"`} fontStyle="italic" fontWeight={BW} fontSize={fitS(d.slogan, W * 0.42, 36, BODY, BW)} fill={p.onAccent} opacity={0.9}>{d.slogan}</text>}
      {d.website && <text x={160} y={H - 130} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={fitS(d.website, W * 0.42, 34, BODY, BW, 3)} letterSpacing={3} fill={p.accent2}>{d.website}</text>}
      {logo && <image href={logo} x={160} y={300} width={240} height={240} preserveAspectRatio="xMidYMid meet" opacity={0.9} />}
      {showSlits && cardSlits().map((s, i) => <line key={i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} stroke="#000" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />)}
    </g>
  );
}

// mặt trong kẹp (để dựng 3D): nền nhạt + logo chìm
export function folderInside(spec: SFSpec, d: SFData): ReactNode {
  const { PW, PH, SP } = FD;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  return (
    <g>
      <rect x={0} y={0} width={PW * 2 + SP} height={PH} fill={p.tint} />
      <g opacity={0.07}><Mark cx={PW / 2} cy={PH * 0.45} s={900} shape="ring" fill={p.accent} ink={p.tint} d={d} f={f} /></g>
    </g>
  );
}

// từng mặt riêng → SVG (texture 3D + kiểm tra chữ)
export function FolderFaceSvg({ face, spec, data, logo, style }: { face: 'front' | 'back' | 'spine' | 'pocket' | 'inside'; spec: SFSpec; data: SFData; logo?: string; style?: CSSProperties }) {
  const { PW, PH, SP, PK } = FD;
  const [w, h] = face === 'spine' ? [SP, PH] : face === 'pocket' ? [PW, PK] : face === 'inside' ? [PW * 2 + SP, PH] : [PW, PH];
  const body = face === 'front' ? folderFront(spec, data, logo) : face === 'back' ? folderBack(spec, data, logo) : face === 'spine' ? folderSpine(spec, data) : face === 'pocket' ? folderPocket(spec, data, logo, E0, true) : folderInside(spec, data);
  return <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={style} data-face={face}>{body}</svg>;
}

// ---------- khuôn bế trải phẳng (mặt ngoài) ----------
const CUT = '#1F2937', FOLD = '#2563EB';
export function folderNet() {
  const { PW, PH, SP, PK, TAB } = FD;
  const M = 100;
  const x0 = -TAB - M, y0 = -M, w = 2 * PW + SP + TAB + 2 * M, h = PH + PK + 2 * M;
  return { x0, y0, w, h, wMm: w / U, hMm: h / U };
}
export function FolderDielineSvg({ spec, data, logo, labels = false, uid = 'fdn', style }: { spec: SFSpec; data: SFData; logo?: string; labels?: boolean; uid?: string; style?: CSSProperties }) {
  const { PW, PH, SP, PK, TAB } = FD;
  const b = ST_FD_BLEED_MM * U;
  const net = folderNet();
  const p = sfPalette(spec.palette);
  // túi: lật 180° (gấp lên vào trong) → (u,v) đứng ↦ (PW-u, PH+PK-v)
  const fx = (u: number) => PW - u, fy = (v: number) => PH + PK - v;
  const pt = (u: number, v: number) => `${fx(u)} ${fy(v)}`;
  const cut = [
    `M0 0 H${2 * PW + SP} V${PH} H${PW}`,
    `L${pt(-TAB, PK - 60)} L${pt(-TAB, 200)} L${pt(0, 120)} L${pt(0, 40)}`,
    `C${pt(PW * 0.35, 40)} ${pt(PW * 0.55, 200)} ${pt(PW, 200)}`,
    `L${pt(PW, 260)} L${pt(PW + TAB, 340)} L${pt(PW + TAB, PK - 60)} L0 ${PH} Z`,
  ].join(' ');
  const tabFill = (pts: [number, number][]) => <polygon points={pts.map(([u, v]) => `${fx(u)},${fy(v)}`).join(' ')} fill={p.accent} />;
  const dash = (x1: number, y1: number, x2: number, y2: number, k: string) => <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke={FOLD} strokeWidth={3} strokeDasharray="22 16" />;
  return (
    <svg viewBox={`${net.x0} ${net.y0} ${net.w} ${net.h}`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid-svg="folder-net">
      <defs>
        {/* mỗi mảnh chỉ in tới lề xén của nó — hình trang trí không lấn sang mảnh bên cạnh */}
        <clipPath id={`${uid}-b`}><rect x={-b} y={-b} width={PW + b} height={PH + b} /></clipPath>
        <clipPath id={`${uid}-f`}><rect x={0} y={-b} width={PW + b} height={PH + b * 2} /></clipPath>
        <clipPath id={`${uid}-p`}><rect x={0} y={-b} width={PW} height={PK + b} /></clipPath>
      </defs>
      <rect x={net.x0} y={net.y0} width={net.w} height={net.h} fill="#FFFFFF" />
      <g id="In">
        <g clipPath={`url(#${uid}-b)`}>{folderBack(spec, data, logo, { l: b, t: b, r: 0, b: 0 })}</g>
        <g transform={`translate(${PW + SP} 0)`} clipPath={`url(#${uid}-f)`}>{folderFront(spec, data, logo, { l: 0, t: b, r: b, b: b })}</g>
        <g transform={`translate(${PW} 0)`}>{folderSpine(spec, data, { l: 0, r: 0, t: b, b: b })}</g>
        {tabFill([[0, PK], [-TAB - b, PK - 60], [-TAB - b, 200 - b], [0, 120 - b]])}
        {tabFill([[PW, PK], [PW + TAB + b, PK - 60], [PW + TAB + b, 340 - b], [PW, 260 - b]])}
        <g transform={`translate(${PW} ${PH + PK}) rotate(180)`} clipPath={`url(#${uid}-p)`}>{folderPocket(spec, data, logo, { l: 0, r: 0, t: b, b: 0 })}</g>
      </g>
      <g id="CutContour" fill="none" stroke={CUT} strokeWidth={3.2}>
        <path d={cut} />
        {cardSlits().map((s, i) => <line key={i} x1={fx(s[0])} y1={fy(s[1])} x2={fx(s[2])} y2={fy(s[3])} />)}
      </g>
      <g id="Fold">
        {dash(PW, 0, PW, PH, 's1')}{dash(PW + SP, 0, PW + SP, PH, 's2')}
        {dash(0, PH, PW, PH, 'pk')}
        {dash(fx(0), fy(PK), fx(0), fy(120), 't1')}{dash(fx(PW), fy(PK), fx(PW), fy(260), 't2')}
      </g>
      {labels && (
        <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={46} fill="#2563EB" opacity={0.9}>
          <text x={PW / 2} y={-30} textAnchor="middle">Bìa sau</text>
          <text x={PW + SP + PW / 2} y={-30} textAnchor="middle">Bìa trước</text>
          <text x={PW / 2} y={PH + PK + 75} textAnchor="middle">Túi (gấp lên vào trong) · 2 khe cài card</text>
          <g transform={`translate(${PW + 260} ${PH + 300})`} fill="#1F2937" fontSize={40}>
            <line x1={0} y1={-12} x2={90} y2={-12} stroke={CUT} strokeWidth={3.2} /><text x={110} y={0}>Nét cắt</text>
            <line x1={0} y1={58} x2={90} y2={58} stroke={FOLD} strokeWidth={3} strokeDasharray="22 16" /><text x={110} y={70}>Nét gấp</text>
            <text x={0} y={150} fill="#64748B">Khổ trải: {net.wMm.toFixed(0)} × {net.hMm.toFixed(0)} mm · lề xén {ST_FD_BLEED_MM}mm</text>
            <text x={0} y={210} fill="#64748B">Thành phẩm: {PW / U} × {PH / U} mm, gáy {SP / U}mm, túi cao {PK / U}mm</text>
          </g>
        </g>
      )}
    </svg>
  );
}

// ---------- card visit đồng bộ (cho cảnh 3D) ----------
export function MiniCardSvg({ spec, data, logo, side, style }: { spec: SFSpec; data: SFData; logo?: string; side: 'front' | 'back'; style?: CSSProperties }) {
  const W = 900, H = 540;
  const p = sfPalette(spec.palette), f = sfFont(spec.font);
  const brand = f.upper || spec.layout === 'frame' ? up(data.brand) : data.brand;
  if (side === 'back') {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style}>
        <rect width={W} height={H} fill={p.accent} />
        <Mark cx={W / 2} cy={H * 0.4} s={130} shape={SHAPE_OF[spec.layout]} fill={p.onAccent} ink={p.accent} d={data} logo={logo} f={f} />
        <text x={W / 2} y={H * 0.75} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fitS(brand, W - 160, 54, f.family, f.weight)} fill={p.onAccent}>{brand}</text>
      </svg>
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      <rect width={W} height={H} fill={spec.layout === 'frame' ? p.paper : '#FFFFFF'} />
      <rect x={0} y={0} width={18} height={H} fill={p.accent} />
      <Mark cx={W - 120} cy={110} s={100} shape={SHAPE_OF[spec.layout]} fill={p.accent} ink={p.onAccent} d={data} logo={logo} f={f} />
      <text x={70} y={150} fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fitS(data.rep, W - 300, 50, f.family, f.weight)} fill={p.ink}>{data.rep}</text>
      {data.repTitle && <text x={72} y={196} fontFamily={`"${BODY}"`} fontWeight={BW} fontSize={22} fill={p.accent}>{data.repTitle}</text>}
      <Contacts items={contactsOf(data, ['phone', 'mail', 'globe', 'pin'])} x={70} y={310} maxW={W - 140} fs={20} color={p.sub} iconColor={p.accent} lh={1.85} oneEach />
    </svg>
  );
}

// ---------- PDF gộp gửi xưởng: trang 1 tiêu đề thư (lề xén + vạch cắt), trang 2 khuôn kẹp file ----------
export async function stationeryOrderPdf(lhBleed: SVGSVGElement, net: SVGSVGElement): Promise<Blob> {
  const { selfContainedSvg, svgToCanvas } = await import('./svg-export');
  const { printPageDims, drawPrintPage } = await import('./print-export');
  const { jsPDF } = await import('jspdf');
  const trim = { wMm: ST_LH.wMm, hMm: ST_LH.hMm };
  const { pageW, pageH } = printPageDims(trim, ST_LH_BLEED_MM);
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'portrait', compress: true });
  const dpi = 300, IN = 25.4;
  const lw = Math.round(((trim.wMm + ST_LH_BLEED_MM * 2) / IN) * dpi), lh = Math.round(((trim.hMm + ST_LH_BLEED_MM * 2) / IN) * dpi);
  const c1 = await svgToCanvas(await selfContainedSvg(lhBleed, SF_FONT_CSS, { outline: true }), lw, lh, '#ffffff');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawPrintPage(pdf as any, c1.toDataURL('image/png'), lw, lh, trim, ST_LH_BLEED_MM);
  const n = folderNet();
  const nw = Math.round((n.wMm / IN) * 200), nh = Math.round((n.hMm / IN) * 200);
  const c2 = await svgToCanvas(await selfContainedSvg(net, SF_FONT_CSS, { outline: true }), nw, nh, '#ffffff');
  pdf.addPage([n.wMm, n.hMm], n.wMm >= n.hMm ? 'landscape' : 'portrait');
  pdf.addImage(c2.toDataURL('image/png'), 'PNG', 0, 0, n.wMm, n.hMm, undefined, 'FAST');
  return pdf.output('blob');
}
