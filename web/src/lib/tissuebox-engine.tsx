'use client';
// Hộp khăn giấy in logo: 3 dáng hộp (chữ nhật · vuông cao · dẹt mini) × mẫu ngành (nhà hàng, khách sạn, spa, xe dịch vụ,
// văn phòng, cà phê). Mỗi mặt hộp = 1 đoạn SVG (đơn vị mm) vẽ 100% bằng code → dùng chung cho file in (khuôn trải phẳng)
// lẫn texture 3D. Khuôn: hộp dán 2 đầu, nắp trên có lỗ rút khăn (đường xé răng cưa) + vạch màng PE.

import { useEffect, useState, type CSSProperties } from 'react';

// ======================= KÍCH THƯỚC =======================
export type TbKind = 'rect' | 'cube' | 'pocket';
export const TB_KINDS: { id: TbKind; name: string; sub: string }[] = [
  { id: 'rect', name: 'Hộp chữ nhật', sub: 'Bàn ăn, lễ tân' },
  { id: 'cube', name: 'Hộp vuông cao', sub: 'Phòng khách sạn, spa' },
  { id: 'pocket', name: 'Hộp dẹt mini', sub: 'Xe dịch vụ, túi xách' },
];
export interface TbSize { id: string; kind: TbKind; name: string; L: number; D: number; H: number }
export const TB_SIZES: TbSize[] = [
  { id: 'rect-22', kind: 'rect', name: '22 × 11 × 8 cm', L: 220, D: 110, H: 80 },
  { id: 'rect-24', kind: 'rect', name: '24 × 12 × 9 cm', L: 240, D: 120, H: 90 },
  { id: 'cube-11', kind: 'cube', name: '11 × 11 × 12 cm', L: 110, D: 110, H: 120 },
  { id: 'cube-12', kind: 'cube', name: '12 × 12 × 13 cm', L: 120, D: 120, H: 130 },
  { id: 'pocket-12', kind: 'pocket', name: '12 × 8 × 3,5 cm', L: 120, D: 80, H: 35 },
  { id: 'pocket-15', kind: 'pocket', name: '15 × 9 × 4 cm', L: 150, D: 90, H: 40 },
];
export const tbSize = (id: string) => TB_SIZES.find((s) => s.id === id) || TB_SIZES[0];
export const tbSizesFor = (k: TbKind) => TB_SIZES.filter((s) => s.kind === k);
export const TB_BLEED = 3;

// ======================= FONT =======================
export interface TbFont { id: string; name: string; family: string; weight: number }
export const TB_FONTS: TbFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'dancing', name: 'Dancing', family: 'Dancing Script', weight: 700 },
];
export const tbFont = (id: string) => TB_FONTS.find((f) => f.id === id) || TB_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const TB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@800&family=Be+Vietnam+Pro:wght@600;800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Montserrat:wght@800&family=Dancing+Script:wght@700&display=swap');`;

export function useTbFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-tb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) { link = document.createElement('link'); link.id = 'mivy-tb-fonts'; link.rel = 'stylesheet'; link.href = TB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link); }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 32px "${BODY}"`, `800 32px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ ầốềộ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ======================= MÀU · HOẠ TIẾT · MẪU =======================
export interface TbPalette { id: string; name: string; bg: string; ink: string; sub: string; accent: string; onAccent: string; pat: string }
export const TB_PALETTES: TbPalette[] = [
  { id: 'ivory', name: 'Ngà · vàng kim', bg: '#F7F1E6', ink: '#2B2118', sub: '#6E5A44', accent: '#B8893B', onAccent: '#FFFFFF', pat: '#E2D3B6' },
  { id: 'navy', name: 'Navy · vàng', bg: '#1C2B4A', ink: '#F5EBD6', sub: '#C9BFA8', accent: '#C9A24C', onAccent: '#1C2B4A', pat: '#2C3D62' },
  { id: 'forest', name: 'Xanh lá dịu', bg: '#EEF3EC', ink: '#1F3B2C', sub: '#4E6B58', accent: '#2F6B4F', onAccent: '#FFFFFF', pat: '#C9DCCD' },
  { id: 'blush', name: 'Hồng phấn', bg: '#FBEDEA', ink: '#5A2E33', sub: '#8A5A5E', accent: '#C96F78', onAccent: '#FFFFFF', pat: '#F0CFCA' },
  { id: 'marble', name: 'Trắng đá', bg: '#F5F5F3', ink: '#1A1A1A', sub: '#555555', accent: '#1A1A1A', onAccent: '#FFFFFF', pat: '#B9B9B6' },
  { id: 'wood', name: 'Gỗ sồi', bg: '#E9D9BF', ink: '#3E2A18', sub: '#6B4D30', accent: '#7A4E2A', onAccent: '#FFF6EA', pat: '#CDAE84' },
  { id: 'taxi', name: 'Vàng taxi', bg: '#FFD23F', ink: '#1A1A1A', sub: '#3A3A3A', accent: '#1A1A1A', onAccent: '#FFD23F', pat: '#F0C11C' },
  { id: 'teal', name: 'Trắng · xanh ngọc', bg: '#FFFFFF', ink: '#0F4C5C', sub: '#3D6C77', accent: '#13919B', onAccent: '#FFFFFF', pat: '#D3ECEE' },
  { id: 'coffee', name: 'Nâu cà phê', bg: '#3B2618', ink: '#F3E3CC', sub: '#CDB596', accent: '#D79A55', onAccent: '#3B2618', pat: '#4D3323' },
  { id: 'red', name: 'Đỏ truyền thống', bg: '#8E1B1B', ink: '#FFF3E0', sub: '#F2D2B0', accent: '#E9B949', onAccent: '#8E1B1B', pat: '#A22A2A' },
];
export const tbPalette = (id: string) => TB_PALETTES.find((p) => p.id === id) || TB_PALETTES[0];

export type TbPattern = 'marble' | 'wood' | 'botanical' | 'geometric' | 'dots' | 'stripes' | 'checker' | 'beans' | 'none';
export const TB_PATTERNS: { id: TbPattern; name: string }[] = [
  { id: 'marble', name: 'Vân đá' }, { id: 'wood', name: 'Vân gỗ' }, { id: 'botanical', name: 'Lá cây' },
  { id: 'geometric', name: 'Hình học' }, { id: 'dots', name: 'Chấm bi' }, { id: 'stripes', name: 'Sọc chéo' },
  { id: 'checker', name: 'Ca rô taxi' }, { id: 'beans', name: 'Hạt cà phê' }, { id: 'none', name: 'Trơn' },
];
export type TbLayout = 'card' | 'band' | 'open';
export const TB_LAYOUTS: { id: TbLayout; name: string }[] = [
  { id: 'card', name: 'Khung giữa' }, { id: 'band', name: 'Dải màu' }, { id: 'open', name: 'Chữ trên nền' },
];

export type TbData = Record<string, string>;
export interface TbLook { id: string; name: string; palette: string; font: string; pattern: TbPattern; layout: TbLayout; data: TbData }
const D = (brand: string, slogan: string, hotline: string, web: string): TbData => ({ brand, slogan, hotline, web });
export const TB_LOOKS: TbLook[] = [
  { id: 'nh-sang', name: 'Nhà hàng sang trọng', palette: 'navy', font: 'playfair', pattern: 'geometric', layout: 'card', data: D('NHÀ HÀNG AN KHANG', 'Hương vị Việt · Phục vụ tận tâm', '0909 123 456', 'ankhang.vn') },
  { id: 'nh-quan', name: 'Quán cơm gia đình', palette: 'red', font: 'baloo', pattern: 'dots', layout: 'band', data: D('QUÁN NGON QUỐC BẢO', 'Cơm nhà – Ấm lòng', '0938 456 789', 'Đặt bàn qua Zalo') },
  { id: 'ks-coden', name: 'Khách sạn cổ điển', palette: 'ivory', font: 'playfair', pattern: 'marble', layout: 'card', data: D('KHÁCH SẠN THU HÀ', 'Chào mừng quý khách', '028 3822 1234', 'thuhahotel.vn') },
  { id: 'ks-hiendai', name: 'Khách sạn hiện đại', palette: 'marble', font: 'montserrat', pattern: 'marble', layout: 'open', data: D('GIA KHÁNH BOUTIQUE', 'Stay well · Ngủ ngon', '028 3911 2468', 'giakhanhhotel.vn') },
  { id: 'spa-la', name: 'Spa thảo mộc', palette: 'forest', font: 'playfair', pattern: 'botanical', layout: 'card', data: D('THU HÀ SPA', 'Thư giãn · Chăm sóc · Tươi trẻ', '0912 345 678', 'thuhaspa.vn') },
  { id: 'spa-hong', name: 'Spa hồng', palette: 'blush', font: 'dancing', pattern: 'botanical', layout: 'band', data: D('An Nhiên Beauty', 'Đẹp từ bên trong', '0907 222 333', 'annhienbeauty.vn') },
  { id: 'taxi', name: 'Taxi · xe dịch vụ', palette: 'taxi', font: 'oswald', pattern: 'checker', layout: 'band', data: D('TAXI AN KHANG', 'Gọi là có · 24/7', '1900 1234', 'taxiankhang.vn') },
  { id: 'xe-dulich', name: 'Xe du lịch', palette: 'teal', font: 'montserrat', pattern: 'geometric', layout: 'open', data: D('XE QUỐC BẢO', 'Đưa đón sân bay · Tour liên tỉnh', '0988 777 666', 'xequocbao.vn') },
  { id: 'vp-toigian', name: 'Văn phòng tối giản', palette: 'marble', font: 'bvp', pattern: 'none', layout: 'card', data: D('CÔNG TY TNHH AN KHANG', 'Đồng hành cùng thành công', '028 3456 7890', 'ankhang.com.vn') },
  { id: 'vp-xanh', name: 'Văn phòng năng động', palette: 'forest', font: 'montserrat', pattern: 'stripes', layout: 'band', data: D('GIA KHÁNH TECH', 'Sáng tạo mỗi ngày', '0901 234 567', 'giakhanh.tech') },
  { id: 'cf-moc', name: 'Cà phê mộc', palette: 'wood', font: 'baloo', pattern: 'wood', layout: 'card', data: D('CÀ PHÊ QUỐC BẢO', 'Một tách – Một ngày vui', '0933 888 999', 'cafequocbao.vn') },
  { id: 'cf-dem', name: 'Cà phê rang xay', palette: 'coffee', font: 'oswald', pattern: 'beans', layout: 'open', data: D('AN KHANG COFFEE', 'Rang xay mỗi sáng', '0966 555 444', 'ankhangcoffee.vn') },
];
export const tbLook = (id: string) => TB_LOOKS.find((l) => l.id === id) || TB_LOOKS[0];

export interface TbSpec { kind: TbKind; size: string; look: string; palette: string; font: string; pattern: TbPattern; layout: TbLayout }
export const tbSpecFor = (kind: TbKind, look = TB_LOOKS[0]): TbSpec => ({
  kind, size: tbSizesFor(kind)[0].id, look: look.id, palette: look.palette, font: look.font, pattern: look.pattern, layout: look.layout,
});

export interface TbField { key: string; label: string; ph?: string; half?: boolean }
export const TB_FIELDS: TbField[] = [
  { key: 'brand', label: 'Tên thương hiệu / quán', ph: 'NHÀ HÀNG AN KHANG' },
  { key: 'slogan', label: 'Slogan / lời chào', ph: 'Hương vị Việt · Phục vụ tận tâm' },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456', half: true },
  { key: 'web', label: 'Website / Zalo / địa chỉ', ph: 'ankhang.vn', half: true },
];

// ======================= ĐO CHỮ =======================
let mctx: CanvasRenderingContext2D | null = null;
const mc = () => { if (typeof document === 'undefined') return null; mctx ??= document.createElement('canvas').getContext('2d'); return mctx; };
export function textW(s: string, family: string, weight: number, size: number, ls = 0) {
  const c = mc();
  if (!c) return s.length * size * 0.6 + ls * Math.max(0, s.length - 1);
  c.font = `${weight} ${size * 10}px "${family}"`;
  return c.measureText(s).width / 10 + ls * Math.max(0, s.length - 1);
}
// tỉ lệ ascent/descent của khung chữ (đúng cái getBBox của SVG trả về) → xếp dòng không đè nhau
const vmCache = new Map<string, { a: number; d: number }>();
export function vmetrics(family: string, weight: number) {
  const k = `${family}|${weight}`;
  if (vmCache.has(k)) return vmCache.get(k)!;
  const c = mc();
  let a = 1.0, d = 0.3;
  if (c) {
    c.font = `${weight} 100px "${family}"`;
    const m = c.measureText('ẦẪỘ Ằgjpqy');
    if (m.fontBoundingBoxAscent) { a = m.fontBoundingBoxAscent / 100; d = m.fontBoundingBoxDescent / 100; }
  }
  const v = { a, d };
  if (document.fonts?.check?.(`${weight} 20px "${family}"`)) vmCache.set(k, v);
  return v;
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const n2 = (n: number) => Math.round(n * 100) / 100;

interface Line { s: string; family: string; weight: number; size: number; color: string; ls?: number; op?: number; min?: number }
// xếp chồng các dòng, căn giữa (cx) trong khoảng [top, bottom]; mỗi dòng co cho vừa maxW; cả khối co nếu quá cao
function stack(lines: Line[], cx: number, top: number, bottom: number, maxW: number, gap: number, anchor: 'middle' | 'start' = 'middle'): string {
  let L = lines.filter((l) => l.s && l.s.trim());
  if (!L.length) return '';
  for (const l of L) {
    const ls = l.ls ?? 0;
    const w = textW(l.s, l.family, l.weight, l.size, ls * l.size);
    if (w > maxW) l.size = (l.size * maxW) / w;
  }
  // dòng phụ quá dài (co dưới ngưỡng đọc được) → bỏ, giữ tên to rõ
  L = L.filter((l, i) => i === 0 || !l.min || l.size >= l.min);
  const hOf = (l: Line) => { const v = vmetrics(l.family, l.weight); return (v.a + v.d) * l.size; };
  let total = L.reduce((t, l) => t + hOf(l), 0) + gap * (L.length - 1);
  const avail = bottom - top;
  let g = gap;
  if (total > avail) { const k = avail / total; L.forEach((l) => { l.size *= k; }); g = gap * k; total = avail; }
  let y = top + (avail - total) / 2;
  let out = '';
  for (const l of L) {
    const v = vmetrics(l.family, l.weight);
    const base = y + v.a * l.size;
    const lsAttr = l.ls ? ` letter-spacing="${n2(l.ls * l.size)}"` : '';
    out += `<text x="${n2(cx)}" y="${n2(base)}" font-family="'${l.family}'" font-weight="${l.weight}" font-size="${n2(l.size)}" fill="${l.color}" text-anchor="${anchor}"${lsAttr}${l.op != null ? ` opacity="${l.op}"` : ''}>${esc(l.s)}</text>`;
    y += (v.a + v.d) * l.size + g;
  }
  return out;
}

// tên thương hiệu: 1 dòng nếu vừa, bị co nhiều thì tách 2 dòng cân nhau
function brandSplit(s: string, family: string, weight: number, size: number, maxW: number): string[] {
  const one = textW(s, family, weight, size);
  const words = s.trim().split(/\s+/);
  if (one <= maxW || words.length < 2 || one * 0.62 < maxW) return [s];
  let best = [s], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(textW(a, family, weight, size), textW(b, family, weight, size));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best;
}

// ======================= HOẠ TIẾT (vẽ code, có seed để mỗi mặt mỗi khác) =======================
function rng(seed: number) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seedOf = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

function patternSvg(p: TbPattern, w: number, h: number, pal: TbPalette, seed: string, op = 1): string {
  const r = rng(seedOf(seed));
  const c = pal.pat;
  let o = '';
  if (p === 'marble') {
    const n = Math.max(4, Math.round((w + h) / 45));
    for (let i = 0; i < n; i++) {
      const x0 = r() * w * 1.2 - w * 0.1, y0 = -5, x3 = x0 + (r() - 0.3) * w * 0.9, y3 = h + 5;
      const d = `M${n2(x0)} ${y0}C${n2(x0 + (r() - 0.5) * w * 0.5)} ${n2(h * 0.35)} ${n2(x3 + (r() - 0.5) * w * 0.5)} ${n2(h * 0.65)} ${n2(x3)} ${y3}`;
      o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n2(0.35 + r() * 1.1)}" stroke-linecap="round"/>`;
      if (r() < 0.6) o += `<path d="M${n2(x0 + 10)} ${n2(h * 0.2)}q${n2((r() - 0.5) * 30)} ${n2(h * 0.15)} ${n2((r() - 0.5) * 40)} ${n2(h * 0.3)}" fill="none" stroke="${c}" stroke-width="0.3" opacity="0.7"/>`;
    }
  } else if (p === 'wood') {
    for (let y = 1.5; y < h + 3; y += 2.4 + r() * 1.2) {
      let d = `M-2 ${n2(y)}`;
      const amp = 0.4 + r() * 0.9, k = 0.03 + r() * 0.03, ph = r() * 6;
      for (let x = 0; x <= w + 4; x += 6) d += `L${x} ${n2(y + Math.sin(x * k + ph) * amp)}`;
      o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${n2(0.25 + r() * 0.45)}"/>`;
    }
    for (let i = 0; i < Math.max(1, Math.round(w / 90)); i++) {
      const cx = r() * w, cy = r() * h, rx = 3 + r() * 4;
      o += `<ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx)}" ry="${n2(rx * 0.45)}" fill="none" stroke="${c}" stroke-width="0.6"/><ellipse cx="${n2(cx)}" cy="${n2(cy)}" rx="${n2(rx * 0.45)}" ry="${n2(rx * 0.2)}" fill="${c}"/>`;
    }
  } else if (p === 'botanical') {
    const sprig = (x: number, y: number, ang: number, len: number) => {
      let s = `<g transform="translate(${n2(x)} ${n2(y)}) rotate(${n2(ang)})"><path d="M0 0Q${n2(len * 0.15)} ${n2(-len * 0.5)} 0 ${n2(-len)}" fill="none" stroke="${c}" stroke-width="0.8"/>`;
      for (let i = 1; i <= 5; i++) {
        const t = i / 6, ly = -len * t, sz = len * 0.18 * (1 - t * 0.35);
        s += `<ellipse cx="${n2(sz * 0.55)}" cy="${n2(ly)}" rx="${n2(sz * 0.55)}" ry="${n2(sz * 0.22)}" transform="rotate(-35 ${n2(sz * 0.55)} ${n2(ly)})" fill="${c}"/>`;
        s += `<ellipse cx="${n2(-sz * 0.55)}" cy="${n2(ly - 1)}" rx="${n2(sz * 0.55)}" ry="${n2(sz * 0.22)}" transform="rotate(35 ${n2(-sz * 0.55)} ${n2(ly - 1)})" fill="${c}"/>`;
      }
      return s + '</g>';
    };
    const L = Math.min(w, h) * 0.55;
    o += sprig(L * 0.12, h + 2, 28, L) + sprig(w - L * 0.1, h + 2, -30, L * 0.9) + sprig(w * 0.04, -2, 150, L * 0.7) + sprig(w * 0.97, -2, -155, L * 0.75);
  } else if (p === 'geometric') {
    const s = 10;
    for (let x = -h; x < w + h; x += s) {
      o += `<line x1="${x}" y1="0" x2="${x + h}" y2="${n2(h)}" stroke="${c}" stroke-width="0.35"/><line x1="${x}" y1="${n2(h)}" x2="${x + h}" y2="0" stroke="${c}" stroke-width="0.35"/>`;
    }
  } else if (p === 'dots') {
    const s = 8;
    for (let y = 2, row = 0; y < h + 4; y += s * 0.86, row++) for (let x = (row % 2) * s / 2; x < w + 4; x += s) o += `<circle cx="${n2(x)}" cy="${n2(y)}" r="1.25" fill="${c}"/>`;
  } else if (p === 'stripes') {
    for (let x = -h; x < w + h; x += 8) o += `<path d="M${x} 0l${n2(h)} ${n2(h)}h3l${n2(-h)} ${n2(-h)}Z" fill="${c}"/>`;
  } else if (p === 'checker') {
    const q = 5, rows = h >= 60 ? 2 : 1; // mặt thấp (hộp dẹt): 1 hàng ca rô cho đỡ chật
    for (const y0 of [0, h - q * rows]) for (let x = 0, i = 0; x < w; x += q, i++) for (let j = 0; j < rows; j++) {
      if ((i + j) % 2 === 0) o += `<rect x="${x}" y="${n2(y0 + j * q)}" width="${q}" height="${q}" fill="${pal.accent}"/>`;
    }
  } else if (p === 'beans') {
    const s = 13;
    for (let y = 5, row = 0; y < h + 6; y += s * 0.8, row++) for (let x = 4 + (row % 2) * s / 2; x < w + 6; x += s) {
      const a = Math.round(r() * 180);
      o += `<g transform="rotate(${a} ${n2(x)} ${n2(y)})"><ellipse cx="${n2(x)}" cy="${n2(y)}" rx="3" ry="2" fill="${c}"/><path d="M${n2(x - 2.4)} ${n2(y)}q2.4 -1 4.8 0" fill="none" stroke="${pal.bg}" stroke-width="0.45"/></g>`;
    }
  }
  return o ? `<g opacity="${op}">${o}</g>` : '';
}

// ======================= BIỂU TƯỢNG =======================
const GENERIC = new Set(['CÔNG', 'TY', 'TNHH', 'CP', 'NHÀ', 'HÀNG', 'KHÁCH', 'SẠN', 'QUÁN', 'CÀ', 'PHÊ', 'XE', 'TAXI', 'SPA', 'THE', 'CỔ', 'PHẦN', 'NGON', 'TIỆM']);
export function monogram(brand: string) {
  const w = brand.toUpperCase().split(/\s+/).filter(Boolean);
  const keep = w.filter((x) => !GENERIC.has(x));
  const src = keep.length ? keep : w;
  const m = src.slice(0, 2).map((x) => x[0]).join('');
  return m || 'M';
}
export interface Ctx { pal: TbPalette; font: TbFont; data: TbData; pattern: TbPattern; layout: TbLayout; logo?: string; uid: string }
function badge(cx: number, cy: number, r: number, c: Ctx, onAccent = false): string {
  const ring = onAccent ? c.pal.onAccent : c.pal.accent;
  if (c.logo) {
    const id = `${c.uid}-lg${Math.round(cx * 10)}${Math.round(cy * 10)}`;
    return `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="#FFFFFF" stroke="${ring}" stroke-width="${n2(r * 0.07)}"/>`
      + `<clipPath id="${id}"><circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.84)}"/></clipPath>`
      + `<image href="${c.logo}" x="${n2(cx - r * 0.84)}" y="${n2(cy - r * 0.84)}" width="${n2(r * 1.68)}" height="${n2(r * 1.68)}" preserveAspectRatio="xMidYMid meet" clip-path="url(#${id})"/>`;
  }
  const m = monogram(c.data.brand || '');
  const fill = onAccent ? c.pal.onAccent : c.pal.accent, txt = onAccent ? c.pal.accent : c.pal.onAccent;
  const v = vmetrics(c.font.family, c.font.weight);
  let sz = r * 0.95;
  const tw = textW(m, c.font.family, c.font.weight, sz);
  if (tw > r * 1.4) sz *= (r * 1.4) / tw;
  const base = cy + (v.a - v.d) * sz / 2 - sz * 0.04;
  return `<circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r)}" fill="${fill}"/><circle cx="${n2(cx)}" cy="${n2(cy)}" r="${n2(r * 0.86)}" fill="none" stroke="${txt}" stroke-width="${n2(r * 0.035)}" opacity="0.7"/>`
    + `<text x="${n2(cx)}" y="${n2(base)}" text-anchor="middle" font-family="'${c.font.family}'" font-weight="${c.font.weight}" font-size="${n2(sz)}" fill="${txt}">${esc(m)}</text>`;
}
function phone(cx: number, cy: number, s: number, color: string): string {
  // ống nghe điện thoại: cung tròn dày + 2 đầu bo
  const r = s * 0.42;
  return `<path d="M${n2(cx - r * 0.75)} ${n2(cy - r * 0.6)}A${n2(r)} ${n2(r)} 0 0 0 ${n2(cx + r * 0.6)} ${n2(cy + r * 0.75)}" fill="none" stroke="${color}" stroke-width="${n2(s * 0.2)}" stroke-linecap="round"/>`
    + `<circle cx="${n2(cx - r * 0.78)}" cy="${n2(cy - r * 0.62)}" r="${n2(s * 0.17)}" fill="${color}"/><circle cx="${n2(cx + r * 0.62)}" cy="${n2(cy + r * 0.78)}" r="${n2(s * 0.17)}" fill="${color}"/>`;
}

// ======================= MẶT HỘP =======================
export type Face = 'top' | 'front' | 'back' | 'endL' | 'endR' | 'bottom';
export interface Opening { kind: 'oval' | 'round' | 'slot'; cx: number; cy: number; rx: number; ry: number }
export function openingOf(kind: TbKind, L: number, Dp: number): Opening {
  if (kind === 'cube') { const r = Math.min(L, Dp) * 0.3; return { kind: 'round', cx: L / 2, cy: Dp / 2, rx: r, ry: r }; }
  if (kind === 'pocket') return { kind: 'slot', cx: L / 2, cy: Dp / 2, rx: L * 0.3, ry: 6.5 };
  return { kind: 'oval', cx: L / 2, cy: Dp / 2, rx: L * 0.34, ry: Dp * 0.19 };
}
export function openingPath(o: Opening, dx = 0, dy = 0): string {
  const cx = o.cx + dx, cy = o.cy + dy;
  if (o.kind === 'slot') {
    const r = o.ry;
    return `M${n2(cx - o.rx + r)} ${n2(cy - r)}H${n2(cx + o.rx - r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(cx + o.rx - r)} ${n2(cy + r)}H${n2(cx - o.rx + r)}A${n2(r)} ${n2(r)} 0 0 1 ${n2(cx - o.rx + r)} ${n2(cy - r)}Z`;
  }
  return `M${n2(cx - o.rx)} ${n2(cy)}A${n2(o.rx)} ${n2(o.ry)} 0 1 0 ${n2(cx + o.rx)} ${n2(cy)}A${n2(o.rx)} ${n2(o.ry)} 0 1 0 ${n2(cx - o.rx)} ${n2(cy)}Z`;
}

export function ctxOf(spec: TbSpec, data: TbData, logo?: string, uid = 'tb'): Ctx {
  return { pal: tbPalette(spec.palette), font: tbFont(spec.font), data, pattern: spec.pattern, layout: spec.layout, logo, uid };
}

/** Nội dung 1 mặt (SVG, đơn vị mm, gốc 0,0 → w,h). Dùng cho file in lẫn texture 3D. */
export function faceInner(face: Face, w: number, h: number, c: Ctx, kind: TbKind): string {
  const { pal, font, data } = c;
  const seed = `${c.pattern}-${face}-${Math.round(w)}x${Math.round(h)}`;
  const m = Math.max(3.5, Math.min(w, h) * 0.08); // lề an toàn
  const patOp = c.layout === 'open' ? 0.55 : 1;
  let o = `<rect x="0" y="0" width="${n2(w)}" height="${n2(h)}" fill="${pal.bg}"/>` + patternSvg(c.pattern, w, h, pal, seed, patOp);
  const brand = (data.brand || '').trim(), slogan = (data.slogan || '').trim(), hot = (data.hotline || '').trim(), web = (data.web || '').trim();
  const fam = font.family, fw = font.weight;
  const checkerPad = c.pattern === 'checker' ? (h >= 60 ? 10.5 : 5.5) : 0; // ca rô taxi chiếm 2 hàng ở mép trên/dưới

  if (face === 'top') {
    const op = openingOf(kind, w, h);
    // khoang lỗ rút khăn: vẽ viền mờ để nhìn ra vị trí xé (file in vẫn in tràn, đường xé ở lớp Perf)
    o += `<path d="${openingPath(op)}" fill="none" stroke="${pal.accent}" stroke-width="0.5" opacity="0.35"/>`;
    const band = op.cy - op.ry - 2; // khoảng trống trên/dưới lỗ
    const maxW = w - 2 * m;
    if (band - m * 0.6 >= 9) {
      o += stack([{ s: brand, family: fam, weight: fw, size: Math.min(band * 0.55, 11), color: pal.ink }], w / 2, Math.max(m * 0.6, checkerPad), band, maxW, 0);
      o += stack([{ s: slogan || hot, family: BODY, weight: 600, size: Math.min(band * 0.38, 6.5), color: pal.sub }], w / 2, h - band, h - Math.max(m * 0.6, checkerPad), maxW, 0);
    }
    return o;
  }
  if (face === 'bottom') {
    o = `<rect x="0" y="0" width="${n2(w)}" height="${n2(h)}" fill="${pal.bg}"/>`;
    o += stack([
      { s: brand, family: fam, weight: fw, size: 7, color: pal.ink },
      { s: 'Khăn giấy rút cao cấp · 2 lớp', family: BODY, weight: 600, size: 4, color: pal.sub },
      { s: hot ? `Hotline ${hot}` : '', family: BODY, weight: 600, size: 4, color: pal.sub },
    ], w / 2, m, h - m, w - 2 * m, 1.6);
    return o;
  }

  const inner = { x: m, y: m + checkerPad * 0.6, w: w - 2 * m, h: h - 2 * m - checkerPad * 1.2 };
  // ---- dải màu (layout band): dải dưới chứa hotline ----
  let bandH = 0;
  if (c.layout === 'band' && (face === 'front' || face === 'back') && h >= 50) {
    bandH = Math.max(7, h * 0.24);
    const by = h - bandH - (c.pattern === 'checker' ? 10 : 0); // (band chỉ dùng khi mặt cao ≥ 50mm → luôn 2 hàng ca rô)
    o += `<rect x="0" y="${n2(by)}" width="${n2(w)}" height="${n2(bandH)}" fill="${pal.accent}"/>`;
    const line = face === 'front' ? (hot ? `Hotline ${hot}` : web) : web || hot;
    const bandTxt = stack([{ s: line, family: BODY, weight: 800, size: bandH * 0.42, color: pal.onAccent, ls: 0.04 }], w / 2 + (face === 'front' && hot ? bandH * 0.32 : 0), by + bandH * 0.12, by + bandH * 0.88, w - 2 * m - bandH, 0);
    o += bandTxt;
    if (face === 'front' && hot) {
      const tw = Math.min(textW(line, BODY, 800, bandH * 0.42, 0.04 * bandH * 0.42), w - 2 * m - bandH);
      o += phone(w / 2 + bandH * 0.32 - tw / 2 - bandH * 0.5, by + bandH / 2, bandH * 0.5, pal.onAccent);
    }
    inner.h = by - inner.y - m * 0.4;
  }

  // ---- khung giữa (layout card) ----
  const card = c.layout === 'card' && face !== 'endL';
  if (card) {
    const cw = inner.w, ch = inner.h;
    o += `<rect x="${n2(inner.x)}" y="${n2(inner.y)}" width="${n2(cw)}" height="${n2(ch)}" rx="${n2(Math.min(cw, ch) * 0.06)}" fill="${pal.bg}" stroke="${pal.accent}" stroke-width="0.6"/>`;
    o += `<rect x="${n2(inner.x + 1.4)}" y="${n2(inner.y + 1.4)}" width="${n2(cw - 2.8)}" height="${n2(ch - 2.8)}" rx="${n2(Math.min(cw, ch) * 0.05)}" fill="none" stroke="${pal.accent}" stroke-width="0.25" opacity="0.7"/>`;
    inner.x += 3.5; inner.y += 3; inner.w -= 7; inner.h -= 6;
  }
  const { x, y, w: iw, h: ih } = inner;

  if (face === 'front' || face === 'endR') {
    const wide = iw / ih > 1.9;
    const r = Math.min(ih * (wide ? 0.36 : 0.22), iw * 0.2, 16);
    const brandSize = Math.min(ih * 0.3, 14);
    if (wide && ih >= 14) {
      // logo trái, chữ phải — cả cụm căn giữa mặt hộp
      const tw0 = iw - 2 * r - 4;
      const bl0 = brandSplit(brand, fam, fw, brandSize, tw0);
      const bs0 = bl0.length > 1 ? brandSize * 0.82 : brandSize;
      const contentW = Math.min(tw0, Math.max(...bl0.map((s) => textW(s, fam, fw, bs0)), textW(slogan, BODY, 600, Math.min(brandSize * 0.45, 6))));
      const shift = Math.max(0, (iw - (2 * r + 4 + contentW)) / 2);
      const bx = x + shift + r + 1;
      o += badge(bx, y + ih / 2, r, c);
      const tx = bx + r + 3, tw = x + iw - tx;
      const bl = brandSplit(brand, fam, fw, brandSize, tw);
      o += stack([
        ...bl.map((s) => ({ s, family: fam, weight: fw, size: bl.length > 1 ? brandSize * 0.82 : brandSize, color: pal.ink })),
        { s: face === 'front' ? slogan : '', family: BODY, weight: 600, size: Math.min(brandSize * 0.45, 6), color: pal.sub, min: 2.4 },
      ], tx, y, y + ih, tw, ih * 0.05, 'start');
    } else if (ih < 14) {
      // mặt thấp (hộp dẹt): 1 dòng tên
      o += stack([{ s: brand, family: fam, weight: fw, size: ih * 0.62, color: pal.ink }], w / 2, y, y + ih, iw, 0);
    } else {
      // logo trên, chữ dưới
      const by = y + r + 0.5;
      o += badge(w / 2, by, r, c);
      const bl = brandSplit(brand, fam, fw, brandSize, iw);
      o += stack([
        ...bl.map((s) => ({ s, family: fam, weight: fw, size: bl.length > 1 ? brandSize * 0.82 : brandSize, color: pal.ink })),
        { s: face === 'front' ? slogan : '', family: BODY, weight: 600, size: Math.min(brandSize * 0.45, 6), color: pal.sub, min: 2.4 },
      ], w / 2, by + r + 2, y + ih, iw, ih * 0.04);
    }
    return o;
  }
  if (face === 'back') {
    const big = Math.min(ih * 0.26, 12);
    const lines: Line[] = [];
    if (ih >= 14) lines.push({ s: brand, family: fam, weight: fw, size: big * 0.8, color: pal.ink });
    if (c.layout !== 'band') lines.push({ s: hot ? `Hotline ${hot}` : '', family: BODY, weight: 800, size: big * 0.7, color: pal.accent });
    if (ih >= 14 || c.layout === 'band') lines.push({ s: c.layout === 'band' ? slogan : web, family: BODY, weight: 600, size: big * 0.5, color: pal.sub, min: 2.4 });
    if (ih < 14 && !lines.length) lines.push({ s: hot, family: BODY, weight: 800, size: ih * 0.6, color: pal.accent });
    o += stack(lines, w / 2, y, y + ih, iw, ih * 0.06);
    return o;
  }
  // endL: câu slogan dạng trích dẫn, có gạch trang trí
  if (ih < 14) {
    o += stack([{ s: hot || slogan, family: BODY, weight: 800, size: ih * 0.6, color: pal.accent }], w / 2, y, y + ih, iw, 0);
    return o;
  }
  const qs = Math.min(ih * 0.18, 8.5);
  const words = slogan.split(/\s+/);
  const half = Math.ceil(words.length / 2);
  const sl = textW(slogan, fam, fw, qs) > iw && words.length > 2 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [slogan];
  o += `<line x1="${n2(w / 2 - iw * 0.18)}" y1="${n2(y + ih * 0.14)}" x2="${n2(w / 2 + iw * 0.18)}" y2="${n2(y + ih * 0.14)}" stroke="${pal.accent}" stroke-width="0.6"/>`;
  o += `<line x1="${n2(w / 2 - iw * 0.18)}" y1="${n2(y + ih * 0.86)}" x2="${n2(w / 2 + iw * 0.18)}" y2="${n2(y + ih * 0.86)}" stroke="${pal.accent}" stroke-width="0.6"/>`;
  o += stack([
    ...sl.map((s) => ({ s, family: fam, weight: fw, size: qs, color: pal.ink })),
    { s: ih >= 36 ? web : '', family: BODY, weight: 600, size: qs * 0.5, color: pal.sub, min: 2.4 }, // mặt thấp: bỏ dòng web cho chữ đủ to
  ], w / 2, y + ih * 0.2, y + ih * 0.8, iw, qs * 0.3);
  return o;
}

export function faceSvgString(face: Face, w: number, h: number, c: Ctx, kind: TbKind): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${n2(w)} ${n2(h)}" width="${n2(w)}mm" height="${n2(h)}mm">${faceInner(face, w, h, c, kind)}</svg>`;
}

// ======================= KHUÔN TRẢI PHẲNG =======================
type Pt = [number, number];
export interface Panel { face: Face; x: number; y: number; w: number; h: number; rot: 0 | 180 }
export interface TbDie { W: number; H: number; ox: number; oy: number; cut: string; folds: string; perf: string; film: string; panels: Panel[]; flaps: Pt[][]; L: number; Dp: number; Hb: number; cutLoops: number; foldCount: number }

export function tbDieline(spec: TbSpec): TbDie {
  const s = tbSize(spec.size);
  const L = s.L, Dp = s.D, Hb = s.H;
  const f = Math.min(Hb * 0.45, Dp * 0.45, 32), g = Math.min(Dp - 6, Dp * 0.8), glue = 12;
  const R = (x: number, y: number, w: number, h: number): Pt[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
  const panels: Panel[] = [
    { face: 'top', x: 0, y: 0, w: L, h: Dp, rot: 0 },
    { face: 'front', x: 0, y: Dp, w: L, h: Hb, rot: 0 },
    { face: 'bottom', x: 0, y: Dp + Hb, w: L, h: Dp, rot: 0 },
    { face: 'back', x: 0, y: 2 * Dp + Hb, w: L, h: Hb, rot: 180 },
    { face: 'endL', x: -Dp, y: Dp, w: Dp, h: Hb, rot: 0 },
    { face: 'endR', x: L, y: Dp, w: Dp, h: Hb, rot: 0 },
  ];
  const y4 = 2 * Dp + 2 * Hb;
  const flaps: Pt[][] = [
    [[0, 0], [0, Dp], [-f, Dp - 4], [-f, 4]],
    [[L, 0], [L + f, 4], [L + f, Dp - 4], [L, Dp]],
    [[0, Dp + Hb], [0, 2 * Dp + Hb], [-f, 2 * Dp + Hb - 4], [-f, Dp + Hb + 4]],
    [[L, Dp + Hb], [L + f, Dp + Hb + 4], [L + f, 2 * Dp + Hb - 4], [L, 2 * Dp + Hb]],
    [[0, 2 * Dp + Hb], [0, y4], [-g, y4 - 5], [-g, 2 * Dp + Hb + 5]],
    [[L, 2 * Dp + Hb], [L + g, 2 * Dp + Hb + 5], [L + g, y4 - 5], [L, y4]],
    [[0, y4], [L, y4], [L - 8, y4 + glue], [8, y4 + glue]],
  ];
  const polys: Pt[][] = [...panels.map((p) => R(p.x, p.y, p.w, p.h)), ...flaps];
  // cạnh dùng chung 2 mảnh = nét gấp; cạnh 1 mảnh = nét cắt
  const k = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
  const edges = new Map<string, { a: Pt; b: Pt; n: number }>();
  for (const poly of polys) for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const key = [k(a), k(b)].sort().join('|');
    const e = edges.get(key); if (e) e.n++; else edges.set(key, { a, b, n: 1 });
  }
  const cutSegs = [...edges.values()].filter((e) => e.n === 1), foldSegs = [...edges.values()].filter((e) => e.n > 1);
  // nối nét cắt thành vòng kín
  const adj = new Map<string, { to: Pt; id: number }[]>();
  cutSegs.forEach((e, i) => {
    (adj.get(k(e.a)) ?? adj.set(k(e.a), []).get(k(e.a))!).push({ to: e.b, id: i });
    (adj.get(k(e.b)) ?? adj.set(k(e.b), []).get(k(e.b))!).push({ to: e.a, id: i });
  });
  const used = new Set<number>();
  let cut = '', loops = 0;
  for (let i = 0; i < cutSegs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);
    const start = cutSegs[i].a; let cur = cutSegs[i].b;
    let d = `M${n2(start[0])} ${n2(start[1])}L${n2(cur[0])} ${n2(cur[1])}`;
    for (let guard = 0; guard < 500 && k(cur) !== k(start); guard++) {
      const nx = (adj.get(k(cur)) || []).find((q) => !used.has(q.id));
      if (!nx) break;
      used.add(nx.id); cur = nx.to; d += `L${n2(cur[0])} ${n2(cur[1])}`;
    }
    cut += d + 'Z'; loops++;
  }
  const folds = foldSegs.map((e) => `M${n2(e.a[0])} ${n2(e.a[1])}L${n2(e.b[0])} ${n2(e.b[1])}`).join('');
  const op = openingOf(spec.kind, L, Dp);
  const perf = openingPath(op);
  const film = op.kind === 'round' ? `M${n2(op.cx - op.rx * 0.7)} ${n2(op.cy)}H${n2(op.cx + op.rx * 0.7)}` : `M${n2(op.cx - op.rx * 0.82)} ${n2(op.cy)}H${n2(op.cx + op.rx * 0.82)}`;
  const minX = -Math.max(Dp, g, f), maxX = L + Math.max(Dp, g, f), maxY = y4 + glue;
  const pad = TB_BLEED + 6;
  return { W: maxX - minX + 2 * pad, H: maxY + 2 * pad, ox: minX - pad, oy: -pad, cut, folds, perf, film, panels, flaps, L, Dp, Hb, cutLoops: loops, foldCount: foldSegs.length };
}

const CUT = '#E6007E', FOLD = '#009FE3', PERF = '#E6007E', FILM = '#00A651';

/** Khuôn trải phẳng: lớp In (nền tràn lề + từng mặt) · CutContour · Fold · Perf (đường xé lỗ rút) · MangPE. preview = có chú thích */
export function TissueDieline({ spec, data, logo, preview = false, style }: { spec: TbSpec; data: TbData; logo?: string; preview?: boolean; style?: CSSProperties }) {
  const die = tbDieline(spec);
  const c = ctxOf(spec, data, logo, preview ? 'tbp' : 'tbf');
  const pal = c.pal;
  const polyD = (pts: Pt[]) => 'M' + pts.map((p) => `${n2(p[0])} ${n2(p[1])}`).join('L') + 'Z';
  const allPolys = [...die.panels.map((p) => polyD([[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]])), ...die.flaps.map(polyD)].join('');
  const legendY = die.oy + die.H - 2;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${n2(die.ox)} ${n2(die.oy)} ${n2(die.W)} ${n2(die.H)}`} width={`${n2(die.W)}mm`} height={`${n2(die.H)}mm`} style={style} data-testid="tb-die">
      <rect x={die.ox} y={die.oy} width={die.W} height={die.H} fill="#FFFFFF" />
      <g id="In">
        {/* nền tràn lề 3mm quanh toàn bộ khuôn */}
        <path d={allPolys} fill={pal.bg} stroke={pal.bg} strokeWidth={TB_BLEED * 2} strokeLinejoin="round" />
        {die.panels.map((p) => {
          const id = `${c.uid}-cl-${p.face}`;
          const tf = p.rot === 180 ? `translate(${n2(p.x + p.w)} ${n2(p.y + p.h)}) rotate(180)` : `translate(${n2(p.x)} ${n2(p.y)})`;
          return (
            <g key={p.face} transform={tf} data-panel={p.face} data-w={p.w} data-h={p.h}>
              <clipPath id={id}><rect x={0} y={0} width={p.w} height={p.h} /></clipPath>
              <g clipPath={`url(#${id})`} dangerouslySetInnerHTML={{ __html: faceInner(p.face, p.w, p.h, c, spec.kind) }} />
            </g>
          );
        })}
      </g>
      <g id="CutContour"><path d={die.cut} fill="none" stroke={CUT} strokeWidth={0.3} /></g>
      <g id="Fold"><path d={die.folds} fill="none" stroke={FOLD} strokeWidth={0.3} strokeDasharray="3 2" /></g>
      <g id="Perf"><path d={die.perf} fill="none" stroke={PERF} strokeWidth={0.3} strokeDasharray="1.2 0.8" /></g>
      <g id="MangPE"><path d={die.film} fill="none" stroke={FILM} strokeWidth={0.3} strokeDasharray="4 1.5" /></g>
      {preview && (
        <g fontFamily={BODY} fontWeight={600} fontSize={4} fill="#475569">
          <text x={die.ox + 6} y={legendY}>
            <tspan fill={CUT}>━ cắt</tspan>{'   '}<tspan fill={FOLD}>╌ gấp</tspan>{'   '}<tspan fill={PERF}>┄ xé lỗ rút khăn</tspan>{'   '}<tspan fill={FILM}>╌ màng PE (xẻ rãnh)</tspan>
          </text>
        </g>
      )}
    </svg>
  );
}

/** Ảnh mẫu: mặt trước + nắp (thumbnail) */
export function FaceSvg({ face, spec, data, logo, style }: { face: Face; spec: TbSpec; data: TbData; logo?: string; style?: CSSProperties }) {
  const s = tbSize(spec.size);
  const w = face === 'top' || face === 'bottom' ? s.L : face === 'endL' || face === 'endR' ? s.D : s.L;
  const h = face === 'top' || face === 'bottom' ? s.D : s.H;
  const c = ctxOf(spec, data, logo, `tbt-${face}-${spec.look}-${spec.palette}`);
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} style={style} dangerouslySetInnerHTML={{ __html: faceInner(face, w, h, c, spec.kind) }} />;
}
