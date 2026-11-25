'use client';
// Card visit / danh thiếp: 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT → hàng trăm mẫu, 0 AI realtime.
// Đơn vị thiết kế: 10 = 1mm (90×54mm → 900×540). Render code 100% → xuất PDF in 300dpi + bleed 2mm + vạch cắt.
// 2 mặt: mặt trước (tên + liên hệ) và mặt sau (thương hiệu). Khổ ngang chuẩn VN.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ ----------
export interface CVSize { id: string; name: string; wMm: number; hMm: number }
export const CV_SIZES: CVSize[] = [
  { id: '90x54', name: '90 × 54 mm (chuẩn)', wMm: 90, hMm: 54 },
  { id: '90x50', name: '90 × 50 mm', wMm: 90, hMm: 50 },
  { id: '85x55', name: '85 × 55 mm', wMm: 85, hMm: 55 },
];
export const cvSize = (id: string) => CV_SIZES.find((s) => s.id === id) || CV_SIZES[0];
export const CV_BLEED_MM = 2;

// ---------- font (đều có subset tiếng Việt) ----------
export interface CVFont { id: string; name: string; family: string; weight: number; serif?: boolean }
export const CV_FONTS: CVFont[] = [
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'manrope', name: 'Manrope', family: 'Manrope', weight: 800 },
  { id: 'archivo', name: 'Archivo', family: 'Archivo', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 700, serif: true },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700, serif: true },
];
export const cvFont = (id: string) => CV_FONTS.find((f) => f.id === id) || CV_FONTS[0];
const BODY = 'Be Vietnam Pro'; // font liên hệ: luôn sạch + đủ dấu tiếng Việt

export const CV_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;800&family=Montserrat:wght@600;800&family=Manrope:wght@600;800&family=Archivo:wght@600;800&family=Playfair+Display:wght@700&family=Cormorant+Garamond:wght@600;700&display=swap');`;

export function useCVFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cv-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-cv-fonts'; link.rel = 'stylesheet';
        link.href = CV_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CV_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `500 40px "${BODY}"`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface CVPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; onAccent: string }
export const CV_PALETTES: CVPalette[] = [
  { id: 'navy', name: 'Navy', paper: '#FFFFFF', ink: '#16233B', sub: '#5B6B85', accent: '#1F3A68', onAccent: '#FFFFFF' },
  { id: 'indigo', name: 'Indigo', paper: '#FFFFFF', ink: '#1E1B38', sub: '#64618A', accent: '#4F46E5', onAccent: '#FFFFFF' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#FFFFFF', ink: '#0C2F2B', sub: '#4E7B74', accent: '#0F766E', onAccent: '#FFFFFF' },
  { id: 'burgundy', name: 'Đỏ rượu', paper: '#FFFFFF', ink: '#2E1115', sub: '#7A5054', accent: '#7C2230', onAccent: '#FFF7F2' },
  { id: 'forest', name: 'Rừng', paper: '#FFFFFF', ink: '#13261C', sub: '#52735F', accent: '#1F4D3A', onAccent: '#F3FBF5' },
  { id: 'clay', name: 'Đất nung', paper: '#FFFDFB', ink: '#2E1A12', sub: '#7D5B4C', accent: '#B4553A', onAccent: '#FFF6F1' },
  { id: 'slate', name: 'Ghi đá', paper: '#FFFFFF', ink: '#1E252F', sub: '#5E6773', accent: '#334155', onAccent: '#F8FAFC' },
  { id: 'gold', name: 'Đen vàng', paper: '#14171D', ink: '#F4F2EC', sub: '#AEB2BC', accent: '#C8A24A', onAccent: '#14171D' },
];
export const cvPalette = (id: string) => CV_PALETTES.find((p) => p.id === id) || CV_PALETTES[0];

// ---------- bố cục ----------
export interface CVLayout { id: string; name: string }
export const CV_LAYOUTS: CVLayout[] = [
  { id: 'leftbar', name: 'Dải bên trái' },
  { id: 'split', name: 'Chia nửa' },
  { id: 'centered', name: 'Căn giữa' },
  { id: 'minimal', name: 'Tối giản' },
  { id: 'corner', name: 'Góc màu' },
  { id: 'dark', name: 'Nền tối' },
];

export interface CVSpec { layout: string; palette: string; font: string; size: string }
export interface CVTemplate { id: string; name: string; spec: Omit<CVSpec, 'size'> }
const PICKS: Record<string, string[]> = {
  leftbar: ['navy', 'indigo', 'burgundy', 'teal'],
  split: ['indigo', 'navy', 'forest', 'clay'],
  centered: ['slate', 'navy', 'gold', 'teal'],
  minimal: ['slate', 'navy', 'clay', 'burgundy'],
  corner: ['teal', 'indigo', 'clay', 'forest'],
  dark: ['gold', 'navy', 'indigo', 'burgundy'],
};
const FONT_OF: Record<string, string> = { leftbar: 'bvp', split: 'montserrat', centered: 'playfair', minimal: 'manrope', corner: 'archivo', dark: 'playfair' };
export const CV_TEMPLATES: CVTemplate[] = CV_LAYOUTS.flatMap((l) =>
  (PICKS[l.id] || []).map((palette) => ({
    id: `${l.id}-${palette}`,
    name: `${l.name} · ${cvPalette(palette).name}`,
    spec: { layout: l.id, palette, font: FONT_OF[l.id] || 'bvp' },
  })),
);

// ---------- nội dung ----------
export type CVData = Record<string, string>;
export interface CVField { key: string; label: string; ph?: string; hint?: string; half?: boolean }
export const CV_FIELDS: CVField[] = [
  { key: 'name', label: 'Họ tên', ph: 'Quốc Bảo', half: true },
  { key: 'title', label: 'Chức danh', ph: 'Giám đốc kinh doanh', half: true },
  { key: 'company', label: 'Công ty / thương hiệu', ph: 'CÔNG TY TNHH AN KHANG' },
  { key: 'phone', label: 'Điện thoại', ph: '0909 123 456', half: true },
  { key: 'email', label: 'Email', ph: 'quocbao@ankhang.vn', half: true },
  { key: 'website', label: 'Website', ph: 'ankhang.vn', half: true },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM', half: true },
  { key: 'slogan', label: 'Slogan (mặt sau)', ph: 'Tận tâm cho từng sản phẩm' },
];
export const defaultCVData = (): CVData => ({
  name: 'Quốc Bảo', title: 'Giám đốc kinh doanh', company: 'CÔNG TY TNHH AN KHANG',
  phone: '0909 123 456', email: 'quocbao@ankhang.vn', website: 'ankhang.vn',
  address: '12 Nguyễn Huệ, Q.1, TP.HCM', slogan: 'Tận tâm cho từng sản phẩm',
});

// ---------- tiện ích ----------
const initials = (s: string) => (s || '').trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]?.toUpperCase() || '').join('') || 'M';
// co cỡ chữ cho vừa bề rộng (ước lượng ~0.58em/kí tự cho sans) → tên/công ty dài không tràn
const fit = (text: string, max: number, size: number, factor = 0.6) => {
  const w = (text || '').length * size * factor;
  return w > max ? Math.max(size * 0.5, (max / ((text || '').length * factor))) : size;
};

// icon liên hệ (stroke, 24×24) — vẽ nhỏ cạnh mỗi dòng
const ICONS: Record<string, string> = {
  phone: 'M6.5 4h3l1.5 4-2 1.3a12 12 0 005.7 5.7L16 17l4 1.5v3a1.5 1.5 0 01-1.6 1.5C10 23 1 14 1 5.6A1.5 1.5 0 012.5 4z',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18',
  pin: 'M12 22s7-6.7 7-12A7 7 0 005 10c0 5.3 7 12 7 12zM12 7.5A2.5 2.5 0 1012 12.5 2.5 2.5 0 0012 7.5z',
};
function Ico({ type, x, y, s, color }: { type: string; x: number; y: number; s: number; color: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 24})`} stroke={color} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICONS[type]} />
    </g>
  );
}

// ---------- SVG danh thiếp ----------
export function CardVisitSvg({ spec, data, side = 'front', bleed = false, style }: {
  spec: CVSpec; data: CVData; side?: 'front' | 'back'; bleed?: boolean; style?: CSSProperties;
}) {
  const sz = cvSize(spec.size);
  const W = sz.wMm * 10, H = sz.hMm * 10;
  const b = bleed ? CV_BLEED_MM * 10 : 0;
  const p = cvPalette(spec.palette);
  const f = cvFont(spec.font);
  const disp = `"${f.family}"`;
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;

  const contact = [
    data.phone && { t: 'phone', v: data.phone },
    data.email && { t: 'mail', v: data.email },
    data.website && { t: 'globe', v: data.website },
    data.address && { t: 'pin', v: data.address },
  ].filter(Boolean) as { t: string; v: string }[];

  // nền (tràn ra bleed): bg bao phủ cả vùng lề xén
  const bgRect = (fill: string) => <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={fill} />;

  const ContactList = ({ x, y, color, iconColor }: { x: number; y: number; color: string; iconColor: string }) => {
    const lh = Math.min(42, (H * 0.5) / Math.max(contact.length, 1));
    const fs = Math.min(21, lh * 0.52);
    return (
      <g fontFamily={`"${BODY}"`} fontWeight={500} fontSize={fs} fill={color}>
        {contact.map((c, i) => (
          <g key={c.t} transform={`translate(${x} ${y + i * lh})`}>
            <Ico type={c.t} x={0} y={-fs * 0.82} s={fs * 1.05} color={iconColor} />
            <text x={fs * 1.5} y={0}>{c.v}</text>
          </g>
        ))}
      </g>
    );
  };

  let body: ReactNode = null;

  if (side === 'back') {
    // Mặt sau: nền accent, initials + công ty + slogan + website — thương hiệu gọn
    const dark = p.id === 'gold';
    body = (
      <>
        {bgRect(dark ? p.paper : p.accent)}
        <g textAnchor="middle" fontFamily={disp}>
          <circle cx={W / 2} cy={H * 0.33} r={H * 0.13} fill="none" stroke={dark ? p.accent : p.onAccent} strokeWidth={3} opacity={0.9} />
          <text x={W / 2} y={H * 0.33 + H * 0.05} fontWeight={f.weight} fontSize={H * 0.13} fill={dark ? p.accent : p.onAccent}>{initials(data.name || data.company)}</text>
          <text x={W / 2} y={H * 0.62} fontWeight={f.weight} fontSize={fit(data.company || '', W * 0.82, 30)} fill={dark ? p.ink : p.onAccent}>{data.company}</text>
          {data.slogan && <text x={W / 2} y={H * 0.74} fontFamily={`"${BODY}"`} fontWeight={500} fontStyle="italic" fontSize={19} fill={dark ? p.sub : p.onAccent} opacity={0.85}>{data.slogan}</text>}
          {data.website && <text x={W / 2} y={H * 0.88} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={dark ? p.accent : p.onAccent} letterSpacing={1}>{data.website}</text>}
        </g>
      </>
    );
  } else if (spec.layout === 'leftbar') {
    const barW = W * 0.34;
    body = (
      <>
        {bgRect(p.paper)}
        <rect x={-b} y={-b} width={barW + b} height={H + b * 2} fill={p.accent} />
        <g textAnchor="middle">
          <text x={barW / 2} y={H / 2 - 6} fontFamily={disp} fontWeight={f.weight} fontSize={barW * 0.42} fill={p.onAccent}>{initials(data.name || data.company)}</text>
          {data.company && <text x={barW / 2} y={H * 0.78} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fit(data.company, barW * 0.84, 14)} fill={p.onAccent} opacity={0.85}>{data.company}</text>}
        </g>
        <g transform={`translate(${barW + 40} ${H * 0.3})`}>
          <text fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.name || '', W - barW - 70, 46)} fill={p.ink}>{data.name}</text>
          {data.title && <text y={34} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={19} fill={p.accent} letterSpacing={0.5}>{data.title}</text>}
        </g>
        <ContactList x={barW + 40} y={H * 0.62} color={p.sub} iconColor={p.accent} />
      </>
    );
  } else if (spec.layout === 'split') {
    const topH = H * 0.42;
    body = (
      <>
        {bgRect(p.paper)}
        <rect x={-b} y={-b} width={W + b * 2} height={topH + b} fill={p.accent} />
        <g transform={`translate(${W * 0.5} ${topH * 0.56})`} textAnchor="middle">
          <text fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.name || '', W * 0.86, 44)} fill={p.onAccent}>{data.name}</text>
          {data.title && <text y={30} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={p.onAccent} opacity={0.9}>{data.title}</text>}
        </g>
        {data.company && <text x={W * 0.5} y={topH + 46} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.company, W * 0.8, 24)} fill={p.ink}>{data.company}</text>}
        <ContactList x={W * 0.16} y={topH + 92} color={p.sub} iconColor={p.accent} />
      </>
    );
  } else if (spec.layout === 'centered') {
    body = (
      <>
        {bgRect(p.paper)}
        <g textAnchor="middle" transform={`translate(${W / 2} 0)`}>
          <text y={H * 0.33} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.name || '', W * 0.8, 48)} fill={p.ink}>{data.name}</text>
          {data.title && <text y={H * 0.33 + 32} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={p.accent} letterSpacing={2}>{(data.title || '').toUpperCase()}</text>}
          <line x1={-W * 0.14} y1={H * 0.49} x2={W * 0.14} y2={H * 0.49} stroke={p.accent} strokeWidth={2.5} />
          {data.company && <text y={H * 0.6} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.company, W * 0.72, 22)} fill={p.sub}>{data.company}</text>}
        </g>
        <g fontFamily={`"${BODY}"`} fontWeight={500} fontSize={16} fill={p.sub} textAnchor="middle">
          {[data.phone, data.email, data.website].filter(Boolean).map((v, i, a) => (
            <text key={i} x={W / 2} y={H * 0.76 + i * 26}>{v}</text>
          ))}
        </g>
      </>
    );
  } else if (spec.layout === 'minimal') {
    body = (
      <>
        {bgRect(p.paper)}
        <g transform={`translate(44 ${H * 0.34})`}>
          <text fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.name || '', W * 0.7, 44)} fill={p.ink}>{data.name}</text>
          {data.title && <text y={32} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={p.sub}>{data.title}{data.company ? `, ${data.company}` : ''}</text>}
        </g>
        <rect x={44} y={H * 0.56} width={W * 0.08} height={6} fill={p.accent} />
        <ContactList x={44} y={H * 0.68} color={p.sub} iconColor={p.accent} />
      </>
    );
  } else if (spec.layout === 'corner') {
    body = (
      <>
        {bgRect(p.paper)}
        <path d={`M${-b} ${-b} L${W * 0.42} ${-b} L${-b} ${H * 0.5} Z`} fill={p.accent} />
        <path d={`M${W + b} ${H + b} L${W * 0.58} ${H + b} L${W + b} ${H * 0.5} Z`} fill={p.accent} opacity={0.18} />
        <g transform={`translate(44 ${H * 0.4})`}>
          <text fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.name || '', W * 0.72, 44)} fill={p.ink}>{data.name}</text>
          {data.title && <text y={32} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={p.accent}>{data.title}</text>}
          {data.company && <text y={60} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={16} fill={p.sub}>{data.company}</text>}
        </g>
        <ContactList x={44} y={H * 0.74} color={p.sub} iconColor={p.accent} />
      </>
    );
  } else { // dark
    body = (
      <>
        {bgRect('#14171D')}
        <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill="none" stroke={p.accent} strokeWidth={2} opacity={0.5} transform="translate(0 0)" />
        <g transform={`translate(44 ${H * 0.36})`}>
          <text fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.name || '', W * 0.72, 46)} fill="#F6F5F1">{data.name}</text>
          {data.title && <text y={34} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={18} fill={p.accent} letterSpacing={1}>{(data.title || '').toUpperCase()}</text>}
          {data.company && <text y={62} fontFamily={`"${BODY}"`} fontWeight={500} fontSize={16} fill="#AEB2BC">{data.company}</text>}
        </g>
        <ContactList x={44} y={H * 0.74} color="#C7CAD2" iconColor={p.accent} />
      </>
    );
  }

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      {body}
    </svg>
  );
}
