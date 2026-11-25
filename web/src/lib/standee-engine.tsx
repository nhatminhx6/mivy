'use client';
// Standee (poster dọc khổ lớn): 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT → nhiều mẫu, render code 100%.
// Đơn vị: 2px = 1mm (60×160cm → 1200×3200). Xuất PDF in đúng khổ + bleed 10mm (khổ lớn nhìn xa, dpi thấp).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

const U = 2; // px / mm

export interface STSize { id: string; name: string; wMm: number; hMm: number; dpi: number }
export const ST_SIZES: STSize[] = [
  { id: '60x160', name: '60 × 160 cm (cuốn)', wMm: 600, hMm: 1600, dpi: 100 },
  { id: '80x180', name: '80 × 180 cm', wMm: 800, hMm: 1800, dpi: 100 },
  { id: '60x160x', name: '60 × 160 cm (chữ X)', wMm: 600, hMm: 1600, dpi: 100 },
];
export const stSize = (id: string) => ST_SIZES.find((s) => s.id === id) || ST_SIZES[0];
export const ST_BLEED_MM = 10;

export interface STFont { id: string; name: string; family: string; weight: number; serif?: boolean }
export const ST_FONTS: STFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 900 },
  { id: 'archivo', name: 'Archivo', family: 'Archivo', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800, serif: true },
];
export const stFont = (id: string) => ST_FONTS.find((f) => f.id === id) || ST_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const ST_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&family=Montserrat:wght@700;900&family=Archivo:wght@600;800&family=Playfair+Display:wght@700;800&display=swap');`;

export function useSTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-st-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-st-fonts'; link.rel = 'stylesheet';
        link.href = ST_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...ST_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

export interface STPalette { id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; onAccent: string }
export const ST_PALETTES: STPalette[] = [
  { id: 'navy', name: 'Navy', paper: '#F6F8FC', ink: '#16233B', sub: '#4E5E7A', accent: '#1F3A68', accent2: '#C8A24A', onAccent: '#FFFFFF' },
  { id: 'indigo', name: 'Indigo', paper: '#F5F5FF', ink: '#1E1B38', sub: '#5A5781', accent: '#4F46E5', accent2: '#F59E0B', onAccent: '#FFFFFF' },
  { id: 'red', name: 'Đỏ sale', paper: '#FFF7F3', ink: '#3A1512', sub: '#7A4B40', accent: '#D7263D', accent2: '#FFC43D', onAccent: '#FFFFFF' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#F1FAF8', ink: '#0C2F2B', sub: '#49706A', accent: '#0F766E', accent2: '#F2A541', onAccent: '#FFFFFF' },
  { id: 'forest', name: 'Rừng', paper: '#F3FAF4', ink: '#13261C', sub: '#4C6B57', accent: '#1F4D3A', accent2: '#E4A32B', onAccent: '#FFFFFF' },
  { id: 'clay', name: 'Đất nung', paper: '#FFF8F4', ink: '#2E1A12', sub: '#7A584A', accent: '#B4553A', accent2: '#2E7D6B', onAccent: '#FFFFFF' },
  { id: 'purple', name: 'Tím', paper: '#FAF5FF', ink: '#2A1446', sub: '#6A5684', accent: '#7C3AED', accent2: '#FBBF24', onAccent: '#FFFFFF' },
  { id: 'dark', name: 'Đen vàng', paper: '#15181E', ink: '#F4F2EC', sub: '#AEB2BC', accent: '#C8A24A', accent2: '#C8A24A', onAccent: '#15181D' },
];
export const stPalette = (id: string) => ST_PALETTES.find((p) => p.id === id) || ST_PALETTES[0];

export interface STLayout { id: string; name: string }
export const ST_LAYOUTS: STLayout[] = [
  { id: 'promo', name: 'Khuyến mãi' },
  { id: 'grand', name: 'Khai trương' },
  { id: 'service', name: 'Dịch vụ' },
  { id: 'event', name: 'Sự kiện' },
];

export interface STSpec { layout: string; palette: string; font: string; size: string }
export interface STTemplate { id: string; name: string; spec: Omit<STSpec, 'size'> }
const PICKS: Record<string, string[]> = {
  promo: ['red', 'indigo', 'navy', 'purple'],
  grand: ['red', 'navy', 'clay', 'dark'],
  service: ['navy', 'teal', 'forest', 'indigo'],
  event: ['dark', 'navy', 'purple', 'teal'],
};
const FONT_OF: Record<string, string> = { promo: 'montserrat', grand: 'montserrat', service: 'bvp', event: 'playfair' };
export const ST_TEMPLATES: STTemplate[] = ST_LAYOUTS.flatMap((l) =>
  (PICKS[l.id] || []).map((palette) => ({ id: `${l.id}-${palette}`, name: `${l.name} · ${stPalette(palette).name}`, spec: { layout: l.id, palette, font: FONT_OF[l.id] || 'bvp' } })),
);

export type STData = Record<string, string>;
export interface STField { key: string; label: string; ph?: string; multiline?: boolean }
export const ST_FIELDS: STField[] = [
  { key: 'brand', label: 'Thương hiệu / logo chữ', ph: 'AN KHANG SPA' },
  { key: 'eyebrow', label: 'Dòng nhỏ trên', ph: 'ƯU ĐÃI THÁNG 12' },
  { key: 'title', label: 'Tiêu đề lớn', ph: 'Chăm sóc da chuẩn spa' },
  { key: 'highlight', label: 'Điểm nhấn (to nhất)', ph: 'GIẢM 30%' },
  { key: 'subtitle', label: 'Dòng phụ', ph: 'Áp dụng đến hết 31/12' },
  { key: 'bullets', label: 'Gạch đầu dòng (mỗi dòng 1 ý)', ph: 'Liệu trình 60 phút\nTặng mặt nạ cao cấp\nĐặt lịch tặng voucher', multiline: true },
  { key: 'phone', label: 'Điện thoại', ph: '0909 123 456' },
  { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn' },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM' },
];
export const defaultSTData = (): STData => ({
  brand: 'AN KHANG SPA', eyebrow: 'ƯU ĐÃI THÁNG 12', title: 'Chăm sóc da chuẩn spa',
  highlight: 'GIẢM 30%', subtitle: 'Áp dụng đến hết 31/12',
  bullets: 'Liệu trình 60 phút\nTặng mặt nạ cao cấp\nĐặt lịch tặng voucher',
  phone: '0909 123 456', website: 'ankhang.vn', address: '12 Nguyễn Huệ, Q.1, TP.HCM',
});

// ---- tiện ích chữ ----
const fit = (text: string, maxPx: number, size: number, factor = 0.58) => {
  const w = (text || '').length * size * factor;
  return w > maxPx ? Math.max(size * 0.45, maxPx / ((text || '').length * factor)) : size;
};
// xuống dòng theo số kí tự tối đa/dòng
const wrap = (text: string, maxChars: number): string[] => {
  const words = (text || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = []; let cur = '';
  for (const w of words) {
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
};

export function StandeeSvg({ spec, data, bleed = false, style }: { spec: STSpec; data: STData; bleed?: boolean; style?: CSSProperties }) {
  const sz = stSize(spec.size);
  const W = sz.wMm * U, H = sz.hMm * U;
  const b = bleed ? ST_BLEED_MM * U : 0;
  const p = stPalette(spec.palette);
  const f = stFont(spec.font);
  const disp = `"${f.family}"`;
  const dark = p.id === 'dark';
  const pad = W * 0.1;
  const cx = W / 2;
  const bullets = (data.bullets || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 6);

  const contact = [data.phone, data.website, data.address].filter(Boolean) as string[];
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;

  const bg = <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={dark ? p.paper : p.paper} />;

  // footer liên hệ (dải accent dưới cùng) — dùng chung
  const Footer = ({ y }: { y: number }) => (
    <g>
      <rect x={-b} y={y} width={W + b * 2} height={H + b - y} fill={p.accent} />
      <g textAnchor="middle" fill={p.onAccent}>
        {data.brand && <text x={cx} y={y + H * 0.04} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand, W * 0.8, 52)} letterSpacing={1}>{data.brand}</text>}
        <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={30}>
          {contact.map((c, i) => <text key={i} x={cx} y={y + H * 0.065 + i * 44}>{c}</text>)}
        </g>
      </g>
    </g>
  );

  const Bullets = ({ x, y, gap = 62, size = 34, color }: { x: number; y: number; gap?: number; size?: number; color: string }) => (
    <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={size} fill={color}>
      {bullets.map((bl, i) => (
        <g key={i} transform={`translate(${x} ${y + i * gap})`}>
          <circle cx={size * 0.4} cy={-size * 0.32} r={size * 0.26} fill={p.accent2} />
          <path d={`M${size * 0.25} ${-size * 0.34} l${size * 0.11} ${size * 0.13} l${size * 0.22} ${-size * 0.26}`} stroke={dark ? '#15181D' : '#1b1b1b'} strokeWidth={size * 0.08} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x={size * 1.1} y={0}>{bl}</text>
        </g>
      ))}
    </g>
  );

  let body: ReactNode;

  if (spec.layout === 'promo') {
    const hl = wrap(data.highlight || '', 7);
    const hs = hl.length > 1 ? W * 0.19 : W * 0.27; // điểm nhấn: 1 dòng thì to, nhiều dòng thì nhỏ lại cho vừa
    const titleLines = wrap(data.title || '', 16);
    body = (
      <>
        {bg}
        <rect x={-b} y={-b} width={W + b * 2} height={H * 0.14 + b} fill={p.accent} />
        <text x={cx} y={H * 0.09} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand, W * 0.8, 54)} fill={p.onAccent} letterSpacing={2}>{data.brand}</text>
        {data.eyebrow && <text x={cx} y={H * 0.19} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={38} fill={p.sub} letterSpacing={3}>{(data.eyebrow || '').toUpperCase()}</text>}
        {titleLines.map((ln, i) => (
          <text key={i} x={cx} y={H * 0.25 + i * 56} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(ln, W * 0.86, 56)} fill={p.ink}>{ln}</text>
        ))}
        {/* điểm nhấn khổng lồ — bám dải trên, không đè dòng phụ */}
        {hl.map((ln, i) => (
          <text key={i} x={cx} y={H * 0.4 + i * (hs * 1.05)} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(ln, W * 0.9, hs)} fill={p.accent}>{ln}</text>
        ))}
        {data.subtitle && <text x={cx} y={H * 0.55} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={40} fill={p.ink}>{data.subtitle}</text>}
        <g transform={`translate(0 ${H * 0.62})`}><Bullets x={pad} y={0} color={p.ink} /></g>
        <Footer y={H * 0.82} />
      </>
    );
  } else if (spec.layout === 'grand') {
    const hl = wrap(data.highlight || 'KHAI TRƯƠNG', 9);
    body = (
      <>
        {bg}
        <rect x={-b} y={-b} width={W + b * 2} height={H * 0.5 + b} fill={p.accent} />
        {data.eyebrow && <text x={cx} y={H * 0.1} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={40} fill={p.onAccent} letterSpacing={3} opacity={0.9}>{(data.eyebrow || '').toUpperCase()}</text>}
        {hl.map((ln, i) => (
          <text key={i} x={cx} y={H * 0.2 + i * (W * 0.19)} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(ln, W * 0.9, W * 0.2)} fill={p.onAccent}>{ln}</text>
        ))}
        {data.brand && <text x={cx} y={H * 0.46} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand, W * 0.84, 56)} fill={p.accent2} letterSpacing={1}>{data.brand}</text>}
        {wrap(data.title || '', 18).map((ln, i) => (
          <text key={i} x={cx} y={H * 0.58 + i * 52} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(ln, W * 0.86, 52)} fill={p.ink}>{ln}</text>
        ))}
        {data.subtitle && <text x={cx} y={H * 0.68} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={40} fill={p.accent}>{data.subtitle}</text>}
        <g transform={`translate(0 ${H * 0.72})`}><Bullets x={pad} y={0} color={p.ink} /></g>
        <Footer y={H * 0.86} />
      </>
    );
  } else if (spec.layout === 'service') {
    body = (
      <>
        {bg}
        <rect x={-b} y={-b} width={W + b * 2} height={H * 0.12 + b} fill={p.accent} />
        <text x={cx} y={H * 0.08} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand, W * 0.8, 56)} fill={p.onAccent} letterSpacing={2}>{data.brand}</text>
        {data.eyebrow && <text x={cx} y={H * 0.18} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={36} fill={p.accent} letterSpacing={3}>{(data.eyebrow || '').toUpperCase()}</text>}
        {wrap(data.title || '', 16).map((ln, i) => (
          <text key={i} x={cx} y={H * 0.24 + i * 60} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(ln, W * 0.86, 60)} fill={p.ink}>{ln}</text>
        ))}
        {data.subtitle && <text x={cx} y={H * 0.37} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={38} fill={p.sub}>{data.subtitle}</text>}
        <line x1={pad} y1={H * 0.42} x2={W - pad} y2={H * 0.42} stroke={p.accent2} strokeWidth={5} />
        <g transform={`translate(0 ${H * 0.48})`}><Bullets x={pad} y={0} gap={84} size={42} color={p.ink} /></g>
        {data.highlight && <text x={cx} y={H * 0.8} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.highlight, W * 0.9, W * 0.16)} fill={p.accent}>{data.highlight}</text>}
        <Footer y={H * 0.86} />
      </>
    );
  } else { // event
    body = (
      <>
        {bg}
        {dark ? null : <rect x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={p.accent} />}
        {(() => {
          const ink = dark ? p.ink : p.onAccent;
          const subc = dark ? p.sub : p.onAccent;
          return (
            <>
              {data.eyebrow && <text x={cx} y={H * 0.14} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={40} fill={p.accent2} letterSpacing={4}>{(data.eyebrow || '').toUpperCase()}</text>}
              <line x1={cx - W * 0.16} y1={H * 0.17} x2={cx + W * 0.16} y2={H * 0.17} stroke={p.accent2} strokeWidth={4} />
              {wrap(data.title || '', 14).map((ln, i) => (
                <text key={i} x={cx} y={H * 0.26 + i * 70} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(ln, W * 0.86, 72)} fill={ink}>{ln}</text>
              ))}
              {data.highlight && <text x={cx} y={H * 0.5} textAnchor="middle" fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.highlight, W * 0.88, W * 0.18)} fill={p.accent2}>{data.highlight}</text>}
              {data.subtitle && <text x={cx} y={H * 0.6} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={700} fontSize={44} fill={ink}>{data.subtitle}</text>}
              <g transform={`translate(0 ${H * 0.66})`}>
                <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={36} fill={subc} textAnchor="middle">
                  {bullets.map((bl, i) => <text key={i} x={cx} y={i * 56}>{bl}</text>)}
                </g>
              </g>
              <g textAnchor="middle">
                {data.brand && <text x={cx} y={H * 0.9} fontFamily={disp} fontWeight={f.weight} fontSize={fit(data.brand, W * 0.8, 52)} fill={ink} letterSpacing={1}>{data.brand}</text>}
                <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={30} fill={subc}>
                  {contact.map((c, i) => <text key={i} x={cx} y={H * 0.93 + i * 42}>{c}</text>)}
                </g>
              </g>
            </>
          );
        })()}
      </>
    );
  }

  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">{body}</svg>
  );
}
