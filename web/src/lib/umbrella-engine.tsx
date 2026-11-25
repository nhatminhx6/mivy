'use client';
// Ô dù in logo: ô cầm tay 8 nan · ô gấp 3 · dù che quán 2m4 (có diềm). Render code 100%, đơn vị mm.
// Mỗi MÚI (gore) = tam giác cong THẬT tính từ bán kính vòm + số nan: tại độ dài s dọc theo nan (tính từ đỉnh),
// nửa bề rộng múi w(s) = (π/N)·Rs·sin(s/Rs) (vòm cầu bán kính Rs). Mép dưới võng lên giữa 2 nan (sc) như ô thật.
// In lụa 1–2 màu lên vải đã nhuộm: nền = màu vải (không in), chỉ in logo/chữ. Cùng 1 hình học → file in + 3D khớp nhau.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export const CUTCONTOUR = '#EC008C';

// ---------- loại ô + hình học ----------
export type UmbKind = 'hand' | 'fold' | 'patio';
export interface UmbGeo {
  kind: UmbKind; name: string; short: string; N: number;
  Rs: number;      // bán kính vòm cầu (mm)
  L: number;       // chiều dài nan / chiều dài múi theo nan (mm)
  Phi: number;     // góc vòm tại mép (rad)
  rho: number;     // bán kính ô khi mở (nhìn từ trên) — Ø = 2ρ
  sc: number;      // độ võng mép dưới giữa 2 nan (tỉ lệ L)
  margin: number;  // khoảng an toàn từ đường may vào trong (mm)
  allow: number;   // chừa đường may / lề cắt (mm)
  valH: number;    // cao diềm (dù quán), 0 = không diềm
  y0: number;      // vị trí tâm cụm logo theo L (0 = đỉnh)
}
function mkGeo(kind: UmbKind, name: string, short: string, Rs: number, rho: number, sc: number, margin: number, allow: number, valH: number, y0: number): UmbGeo {
  const Phi = Math.asin(rho / Rs);
  return { kind, name, short, N: 8, Rs, L: Rs * Phi, Phi, rho, sc, margin, allow, valH, y0 };
}
export const UMB_KINDS: UmbGeo[] = [
  mkGeo('hand', 'Ô cầm tay 8 nan · Ø100cm', 'Ô cầm tay', 550, 500, 0.045, 24, 10, 0, 0.6),
  mkGeo('fold', 'Ô gấp 3 · Ø95cm', 'Ô gấp 3', 700, 475, 0.04, 22, 10, 0, 0.6),
  mkGeo('patio', 'Dù che quán 2m4 · có diềm', 'Dù quán 2m4', 2000, 1200, 0.025, 60, 15, 200, 0.64),
];
export const umbGeo = (k: UmbKind) => UMB_KINDS.find((g) => g.kind === k) || UMB_KINDS[0];
export const UMB_MATERIAL: Record<UmbKind, string> = {
  hand: 'Ô cầm tay 8 nan in 1 múi', fold: 'Ô gấp 3 in logo', patio: 'Dù che quán 2m4 (sân vườn)',
};

/** nửa bề rộng múi tại độ dài s (mm) tính từ đỉnh */
export const goreW = (g: UmbGeo, s: number) => (Math.PI / g.N) * g.Rs * Math.sin(Math.min(s, g.L) / g.Rs);
/** mép dưới (võng lên giữa múi): độ dài theo u ∈ [0,1] ngang múi */
export const goreSB = (g: UmbGeo, u: number) => g.L * (1 - g.sc * Math.sin(Math.PI * u));
export const goreWMax = (g: UmbGeo) => goreW(g, Math.min(g.L, (Math.PI / 2) * g.Rs));
/** bề rộng 1 tấm diềm = dây cung giữa 2 đầu nan */
export const valW = (g: UmbGeo) => 2 * g.rho * Math.sin(Math.PI / g.N);
export const VAL_SCALLOP = 34;

const f1 = (n: number) => (Math.round(n * 10) / 10).toString();
/** đường viền múi, nới ra `off` mm (off = 0 → đường may) */
export function gorePath(g: UmbGeo, off = 0): string {
  const pts: [number, number][] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) { const s = (g.L * i) / n; if (i === n) break; pts.push([-(goreW(g, s) + off), s]); }
  for (let i = 0; i <= 32; i++) {
    const u = i / 32, sb = goreSB(g, u);
    pts.push([(u - 0.5) * 2 * goreW(g, sb) + (u === 0 ? -off : u === 1 ? off : 0), sb + off]);
  }
  for (let i = n - 1; i >= 0; i--) { const s = (g.L * i) / n; pts.push([goreW(g, s) + off, s]); }
  const top = off > 0 ? `M${f1(-off)} ${f1(-off)} ` : '';
  const end = off > 0 ? ` L${f1(off)} ${f1(-off)}` : '';
  return `${top}${off > 0 ? 'L' : 'M'}${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L')}${end} Z`;
}
/** tấm diềm: trên thẳng, dưới 3 vỏ sò */
export function valPath(g: UmbGeo, off = 0): string {
  const W = valW(g), H = g.valH, k = 3, sw = W / k;
  let d = `M${f1(-off)} ${f1(-off)} L${f1(W + off)} ${f1(-off)} L${f1(W + off)} ${f1(H + off)}`;
  for (let i = k - 1; i >= 0; i--) {
    const x0 = sw * (i + 1), x1 = sw * i;
    d += ` Q${f1((x0 + x1) / 2)} ${f1(H + VAL_SCALLOP * 2 + off)} ${f1(i === 0 ? x1 - off : x1)} ${f1(H + off)}`;
  }
  return `${d} L${f1(-off)} ${f1(-off)} Z`;
}

// ---------- font ----------
export interface UmbFont { id: string; name: string; family: string; weight: number }
export const UMB_FONTS: UmbFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
];
export const umbFont = (id: string) => UMB_FONTS.find((f) => f.id === id) || UMB_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const UMB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&display=swap');`;

export function useUmbFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-umb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-umb-fonts'; link.rel = 'stylesheet';
        link.href = UMB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '700 40px "Oswald"', '800 40px "Baloo 2"', '800 40px "Playfair Display"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu vải + mực ----------
export interface UmbPalette { id: string; name: string; base: string; alt: string; ink: string; ink2: string }
export const UMB_PALETTES: UmbPalette[] = [
  { id: 'navy', name: 'Xanh navy', base: '#1E3A6E', alt: '#F4F3EF', ink: '#FFFFFF', ink2: '#E9B949' },
  { id: 'red', name: 'Đỏ', base: '#C21F2E', alt: '#F4F3EF', ink: '#FFFFFF', ink2: '#FFD54A' },
  { id: 'black', name: 'Đen', base: '#1B1C1F', alt: '#44464D', ink: '#FFFFFF', ink2: '#D4AF37' },
  { id: 'green', name: 'Xanh lá', base: '#1E7448', alt: '#F2F1EA', ink: '#FFFFFF', ink2: '#F4D35E' },
  { id: 'orange', name: 'Cam', base: '#EE7419', alt: '#FFFFFF', ink: '#FFFFFF', ink2: '#1B1C1F' },
  { id: 'sky', name: 'Xanh trời', base: '#2A87CF', alt: '#FFFFFF', ink: '#FFFFFF', ink2: '#FFE066' },
  { id: 'cream', name: 'Kem nâu', base: '#EFE5CF', alt: '#6B4A33', ink: '#5A3A22', ink2: '#B5653A' },
  { id: 'pink', name: 'Hồng', base: '#F3A6B8', alt: '#FFFFFF', ink: '#7A1F3D', ink2: '#FFFFFF' },
  { id: 'mint', name: 'Xanh mint', base: '#9DD8C8', alt: '#FFFFFF', ink: '#0F5C4C', ink2: '#FFFFFF' },
  { id: 'beige', name: 'Be', base: '#D9CBB0', alt: '#FFFFFF', ink: '#3B2F22', ink2: '#8C6A43' },
  { id: 'purple', name: 'Tím', base: '#5B2A86', alt: '#F3EEF8', ink: '#FFFFFF', ink2: '#F6C344' },
];
export const umbPalette = (id: string) => UMB_PALETTES.find((p) => p.id === id) || UMB_PALETTES[0];
export const isDarkHex = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
};
/** biến thể màu: múi màu chính / múi màu phụ (xen kẽ) → màu vải + mực tương phản */
export type UmbVariant = 'base' | 'alt';
export function variantColors(p: UmbPalette, v: UmbVariant, inks: 1 | 2): { fabric: string; ink: string; ink2: string } {
  if (v === 'base') return { fabric: p.base, ink: p.ink, ink2: inks === 2 ? p.ink2 : p.ink };
  // múi phụ: mực = màu vải chính (nếu tương phản) hoặc trắng/đen
  const ink = isDarkHex(p.alt) ? '#FFFFFF' : (isDarkHex(p.base) ? p.base : p.ink);
  return { fabric: p.alt, ink, ink2: ink };
}

// ---------- bố cục + mẫu ----------
export type UmbLayout = 'badge' | 'wordmark' | 'stack' | 'hotline';
export const UMB_LAYOUTS: { id: UmbLayout; name: string }[] = [
  { id: 'badge', name: 'Logo tròn + tên' },
  { id: 'wordmark', name: 'Tên thương hiệu to' },
  { id: 'stack', name: 'Logo + tên + hotline' },
  { id: 'hotline', name: 'Tên + hotline to' },
];
export type UmbPanels = 1 | 2 | 4 | 8;
export const UMB_PANEL_OPTS: { n: UmbPanels; name: string }[] = [
  { n: 1, name: 'In 1 múi' }, { n: 2, name: 'In 2 múi đối diện' }, { n: 4, name: 'In 4 múi cách nhau' }, { n: 8, name: 'In cả 8 múi' },
];
/** múi nào được in (múi 0 = múi quay ra trước) */
export const printedPanels = (n: UmbPanels, N = 8): number[] =>
  n === 1 ? [0] : n === 2 ? [0, N / 2] : n === 4 ? [0, 2, 4, 6] : Array.from({ length: N }, (_, i) => i);

export interface UmbSpec { kind: UmbKind; layout: UmbLayout; palette: string; font: string; panels: UmbPanels; alternate: boolean; inks: 1 | 2 }
export type UmbData = Record<string, string>;
export interface UmbTemplate { id: string; name: string; spec: UmbSpec; data: UmbData }
const T = (id: string, name: string, spec: UmbSpec, data: UmbData): UmbTemplate => ({ id, name, spec, data });
export const UMB_TEMPLATES: UmbTemplate[] = [
  T('bank', 'Ngân hàng · navy xen trắng', { kind: 'hand', layout: 'badge', palette: 'navy', font: 'montserrat', panels: 2, alternate: true, inks: 2 },
    { brand: 'AN KHANG BANK', slogan: 'Đồng hành cùng bạn', phone: '1900 6868', valance: 'AN KHANG BANK · 1900 6868' }),
  T('insure', 'Bảo hiểm · đỏ', { kind: 'hand', layout: 'stack', palette: 'red', font: 'bvp', panels: 4, alternate: false, inks: 2 },
    { brand: 'BẢO AN LIFE', slogan: 'Bảo vệ cả gia đình', phone: '1800 1234', valance: 'BẢO AN LIFE · 1800 1234' }),
  T('gift', 'Quà doanh nghiệp · đen', { kind: 'fold', layout: 'wordmark', palette: 'black', font: 'playfair', panels: 1, alternate: false, inks: 2 },
    { brand: 'Gia Khánh Group', slogan: 'Tri ân khách hàng 2027', phone: '', valance: 'Gia Khánh Group' }),
  T('coffee', 'Quán cà phê · dù kem nâu', { kind: 'patio', layout: 'badge', palette: 'cream', font: 'playfair', panels: 4, alternate: true, inks: 2 },
    { brand: 'MỘC COFFEE', slogan: 'Cà phê rang xay', phone: '0909 123 456', valance: 'MỘC COFFEE · 0909 123 456' }),
  T('milktea', 'Trà sữa · dù hồng', { kind: 'patio', layout: 'wordmark', palette: 'pink', font: 'baloo', panels: 8, alternate: true, inks: 1 },
    { brand: 'Trà Sữa Thu Hà', slogan: 'Ngọt ngào mỗi ngày', phone: '0938 456 789', valance: 'Trà Sữa Thu Hà · 0938 456 789' }),
  T('run', 'Giải chạy · cam', { kind: 'hand', layout: 'wordmark', palette: 'orange', font: 'oswald', panels: 8, alternate: false, inks: 1 },
    { brand: 'RUN FOR GREEN 2027', slogan: 'Chạy vì môi trường', phone: '', valance: 'RUN FOR GREEN 2027' }),
  T('land', 'Bất động sản · navy', { kind: 'fold', layout: 'stack', palette: 'navy', font: 'montserrat', panels: 2, alternate: false, inks: 2 },
    { brand: 'AN KHANG LAND', slogan: 'Sống xanh ven sông', phone: '0909 888 999', valance: 'AN KHANG LAND · 0909 888 999' }),
  T('spa', 'Spa · mint xen trắng', { kind: 'hand', layout: 'badge', palette: 'mint', font: 'playfair', panels: 2, alternate: true, inks: 1 },
    { brand: 'Lotus Spa', slogan: 'Chạm vào thư giãn', phone: '0938 222 333', valance: 'Lotus Spa · 0938 222 333' }),
  T('beer', 'Quán bia · dù xanh lá', { kind: 'patio', layout: 'wordmark', palette: 'green', font: 'oswald', panels: 8, alternate: false, inks: 2 },
    { brand: 'BIA TƯƠI QUỐC BẢO', slogan: 'Mát lạnh mỗi ngày', phone: '0912 345 678', valance: 'BIA TƯƠI QUỐC BẢO · 0912 345 678' }),
  T('school', 'Trường học · xanh trời', { kind: 'fold', layout: 'stack', palette: 'sky', font: 'bvp', panels: 4, alternate: false, inks: 2 },
    { brand: 'Trường Gia Khánh', slogan: 'Học vui – Học thật', phone: '028 3838 1234', valance: 'Trường Gia Khánh' }),
  T('seafood', 'Nhà hàng · dù đỏ xen trắng', { kind: 'patio', layout: 'hotline', palette: 'red', font: 'montserrat', panels: 4, alternate: true, inks: 2 },
    { brand: 'Hải Sản Biển Xanh', slogan: 'Tươi sống mỗi ngày', phone: '0912 345 678', valance: 'HẢI SẢN BIỂN XANH · 0912 345 678' }),
  T('minimal', 'Tối giản · be', { kind: 'hand', layout: 'wordmark', palette: 'beige', font: 'playfair', panels: 1, alternate: false, inks: 1 },
    { brand: 'Thu Hà Studio', slogan: 'thuhastudio.vn', phone: '', valance: 'Thu Hà Studio' }),
];
export const defaultUmbData = (): UmbData => ({ ...UMB_TEMPLATES[0].data });

export interface UmbField { key: string; label: string; ph?: string; patioOnly?: boolean }
export const UMB_FIELDS: UmbField[] = [
  { key: 'brand', label: 'Tên thương hiệu', ph: 'AN KHANG BANK' },
  { key: 'slogan', label: 'Slogan / dòng phụ', ph: 'Đồng hành cùng bạn' },
  { key: 'phone', label: 'Hotline', ph: '1900 6868' },
  { key: 'valance', label: 'Chữ trên diềm dù', ph: 'MỘC COFFEE · 0909 123 456', patioOnly: true },
];

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, fam: string, wt: number): number {
  const s = t || '';
  if (typeof document === 'undefined') return s.length * size * 0.6;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6;
  mctx.font = `${wt} ${size}px "${fam}"`;
  return mctx.measureText(s).width;
}
/** chia 2 dòng cân nhất */
function split2(text: string, size: number, fam: string, wt: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return [text.trim()];
  let best: string[] = [text], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(textW(a, size, fam, wt), textW(b, size, fam, wt));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best;
}
export const initials = (brand: string) => {
  const w = (brand || '').trim().split(/\s+/).filter((x) => x.length > 0 && !/^[\d·•\-–]+$/.test(x));
  if (!w.length) return 'A';
  return (w.length === 1 ? w[0].slice(0, 2) : w[0][0] + w[1][0]).toUpperCase();
};

// ---------- cụm logo/chữ trong múi ----------
export interface UmbLogo { href: string; ar: number } // ar = rộng/cao
type Item =
  | { kind: 'logo'; y: number; h: number; w: number }
  | { kind: 'text'; y: number; size: number; text: string; fam: string; wt: number; fill: string; w: number };

/** bề rộng khả dụng tại độ dài s (đã trừ vùng an toàn 2 bên) */
const availAt = (g: UmbGeo, s: number) => Math.max(0, 2 * (goreW(g, s) - g.margin));

function layoutArt(g: UmbGeo, spec: UmbSpec, data: UmbData, cols: { ink: string; ink2: string }, logo: UmbLogo | null): Item[] {
  const f = umbFont(spec.font);
  const y0 = g.L * g.y0;
  const A = availAt(g, y0);
  const brand = (data.brand || '').trim(), slogan = (data.slogan || '').trim(), phone = (data.phone || '').trim();
  const lay = spec.layout;
  const base = {
    logo: lay === 'badge' ? 0.42 : lay === 'stack' ? 0.3 : 0,
    brand: lay === 'wordmark' ? 0.2 : lay === 'hotline' ? 0.12 : lay === 'badge' ? 0.14 : 0.13,
    slogan: lay === 'wordmark' ? 0.08 : 0.07,
    phone: lay === 'hotline' ? 0.16 : lay === 'stack' ? 0.095 : 0,
  };
  let k = g.kind === 'patio' ? 1.55 : 1; // dù quán: múi rất to → logo to hơn hẳn cho nhìn từ xa
  for (let it = 0; it < 60; it++) {
    const items: Item[] = [];
    const gap = A * 0.035 * k;
    let y = 0; // tạm tính từ 0, sau dời cho tâm cụm ở y0
    const pushText = (text: string, size: number, fam: string, wt: number, fill: string, maxLines: number) => {
      if (!text) return;
      let lines = [text];
      const w1 = textW(text, size, fam, wt);
      if (maxLines > 1 && w1 > A * 0.92) lines = split2(text, size, fam, wt);
      lines.forEach((ln, li) => {
        y += size * (li ? 0.98 : 0.78); // dòng sau chừa chỗ dấu tiếng Việt chồng (ữ, ằ…)
        items.push({ kind: 'text', y, size, text: ln, fam, wt, fill, w: textW(ln, size, fam, wt) });
        y += size * 0.3;
      });
      y += gap;
    };
    if (base.logo) {
      const h = A * base.logo * k;
      const w = logo ? Math.min(h * logo.ar, A * 0.9) : h;
      const hh = logo ? w / logo.ar : h;
      items.push({ kind: 'logo', y, h: hh, w }); y += hh + gap * 1.2;
    }
    pushText(brand, A * base.brand * k, f.family, f.weight, cols.ink, 2);
    if (lay === 'hotline' || lay === 'stack') {
      pushText(slogan, A * base.slogan * k, BODY, 600, cols.ink2, 2);
      if (phone) pushText(phone, A * base.phone * k, lay === 'hotline' ? 'Oswald' : f.family, lay === 'hotline' ? 700 : f.weight, cols.ink2, 1);
    } else {
      pushText(slogan, A * base.slogan * k, BODY, 600, cols.ink2, 2);
    }
    const total = y - gap;
    const top = y0 - total / 2;
    // dời + kiểm tra vừa bề rộng múi tại mép trên từng phần tử
    let ok = true;
    for (const itm of items) {
      if (itm.kind === 'logo') {
        itm.y += top;
        if (itm.w > availAt(g, itm.y)) ok = false;
      } else {
        itm.y += top;
        const yTop = itm.y - itm.size * 0.78;
        if (itm.w > availAt(g, yTop)) ok = false;
      }
    }
    const last = items[items.length - 1];
    const bottom = last ? (last.kind === 'logo' ? last.y + last.h : last.y + last.size * 0.25) : y0;
    if (bottom > g.L * (1 - g.sc) - g.margin * 1.6) ok = false;
    if (ok || k < 0.3) return items;
    k *= 0.95;
  }
  return [];
}

/** cụm hình in trên 1 múi (toạ độ múi: đỉnh (0,0), trục y xuống theo nan) */
function PanelArt({ g, spec, data, cols, logo }: { g: UmbGeo; spec: UmbSpec; data: UmbData; cols: { ink: string; ink2: string }; logo: UmbLogo | null }) {
  const items = layoutArt(g, spec, data, cols, logo);
  const f = umbFont(spec.font);
  return (
    <g data-art="1">
      {items.map((it, i) => {
        if (it.kind === 'logo') {
          if (logo) return <image key={i} href={logo.href} x={f1(-it.w / 2)} y={f1(it.y)} width={f1(it.w)} height={f1(it.h)} preserveAspectRatio="xMidYMid meet" data-logo="1" />;
          const r = it.h / 2, cy = it.y + r, ini = initials(data.brand);
          const sz = Math.min(r * 0.95, (r * 1.5) / Math.max(1, textW(ini, 100, f.family, f.weight) / 100));
          return (
            <g key={i} data-logo="1">
              <circle cx={0} cy={f1(cy)} r={f1(r - r * 0.05)} fill="none" stroke={cols.ink} strokeWidth={f1(r * 0.07)} />
              <circle cx={0} cy={f1(cy)} r={f1(r * 0.8)} fill="none" stroke={cols.ink2} strokeWidth={f1(r * 0.025)} />
              <text x={0} y={f1(cy + sz * 0.36)} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={f1(sz)} fill={cols.ink}>{ini}</text>
            </g>
          );
        }
        return <text key={i} x={0} y={f1(it.y)} textAnchor="middle" fontFamily={`"${it.fam}"`} fontWeight={it.wt} fontSize={f1(it.size)} fill={it.fill}>{it.text}</text>;
      })}
    </g>
  );
}

// ---------- 1 múi (xem trước / texture 3D / file in) ----------
export function GoreSvg({ spec, data, variant = 'base', logo, print = false, style, testid }: {
  spec: UmbSpec; data: UmbData; variant?: UmbVariant; logo: UmbLogo | null; print?: boolean; style?: CSSProperties; testid?: string;
}) {
  const g = umbGeo(spec.kind);
  const p = umbPalette(spec.palette);
  const cols = variantColors(p, variant, spec.inks);
  const W = goreWMax(g);
  const pad = print ? g.allow + 6 : 0;
  const legendH = print ? Math.max(80, g.L * 0.11) : 0;
  const vx = -W - pad, vy = -pad, vw = 2 * (W + pad), vh = g.L + pad * 2 + legendH;
  const geoAttrs = { 'data-rs': g.Rs, 'data-n': g.N, 'data-l': f1(g.L), 'data-margin': g.margin, 'data-sc': g.sc } as Record<string, string | number>;
  if (!print) {
    return (
      <svg viewBox={`${f1(-W)} 0 ${f1(2 * W)} ${f1(g.L)}`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid} {...geoAttrs}>
        <path d={gorePath(g)} fill={cols.fabric} />
        <PanelArt g={g} spec={spec} data={data} cols={cols} logo={logo} />
      </svg>
    );
  }
  const printed = printedPanels(spec.panels).filter((i) => (spec.alternate && i % 2 ? 'alt' : 'base') === variant);
  const fs = Math.max(7, Math.min(g.L * 0.018, (2 * (W + pad)) / 64));
  const inkList = Array.from(new Set([cols.ink, cols.ink2]));
  return (
    <svg viewBox={`${f1(vx)} ${f1(vy)} ${f1(vw)} ${f1(vh)}`} width={`${f1(vw)}mm`} height={`${f1(vh)}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid} {...geoAttrs}>
      <rect x={f1(vx)} y={f1(vy)} width={f1(vw)} height={f1(vh)} fill="#FFFFFF" />
      <g id="Vai">
        <path d={gorePath(g, g.allow)} fill={cols.fabric} opacity={0.9} />
      </g>
      <g id="In">
        <PanelArt g={g} spec={spec} data={data} cols={cols} logo={logo} />
      </g>
      <g id="DuongMay" fill="none">
        <path d={gorePath(g)} stroke={isDarkHex(cols.fabric) ? '#FFFFFF' : '#1F2937'} strokeOpacity={0.8} strokeWidth={1.2} strokeDasharray="8 6" />
      </g>
      <g id="CutContour" fill="none">
        <path d={gorePath(g, g.allow)} stroke={CUTCONTOUR} strokeWidth={1} />
      </g>
      {/* mũi tên chỉ đỉnh ô */}
      <path d={`M0 ${f1(g.L * 0.08)} l${f1(-fs * 0.6)} ${f1(fs)} h${f1(fs * 1.2)} Z`} fill="#94A3B8" opacity={0.7} />
      <g fontFamily={`"${BODY}"`} fontWeight={600} fill="#334155" fontSize={f1(fs)}>
        <text x={f1(vx + 8)} y={f1(g.L + pad + fs * 1.6)}>{`${g.name} · múi dài ${Math.round(g.L)}mm · rộng ${Math.round(2 * W)}mm`}</text>
        <text x={f1(vx + 8)} y={f1(g.L + pad + fs * 3.0)}>{`In ${printed.length} múi (số ${printed.map((i) => i + 1).join(', ')}) · in lụa ${inkList.length} màu: ${inkList.join(' + ')}`}</text>
        <text x={f1(vx + 8)} y={f1(g.L + pad + fs * 4.4)}>{`Nền = màu vải ${cols.fabric} (không in) · nét đứt = đường may · nét hồng = đường cắt (chừa ${g.allow}mm)`}</text>
      </g>
    </svg>
  );
}

// ---------- diềm dù quán ----------
export function ValanceSvg({ spec, data, variant = 'base', print = false, style, testid }: {
  spec: UmbSpec; data: UmbData; variant?: UmbVariant; print?: boolean; style?: CSSProperties; testid?: string;
}) {
  const g = umbGeo(spec.kind);
  const p = umbPalette(spec.palette);
  const cols = variantColors(p, variant, spec.inks);
  const f = umbFont(spec.font);
  const W = valW(g), H = g.valH;
  const text = (data.valance || data.brand || '').trim();
  const maxW = W * 0.86;
  let size = H * 0.42;
  const tw = textW(text, size, f.family, f.weight);
  if (tw > maxW) size = (size * maxW) / tw;
  const pad = print ? g.allow + 6 : 0;
  const legendH = print ? 40 : 0;
  const vx = -pad, vy = -pad, vw = W + pad * 2, vh = H + VAL_SCALLOP + pad * 2 + legendH;
  const body = (
    <>
      <text x={f1(W / 2)} y={f1(H * 0.5 + size * 0.36)} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={f1(size)} fill={cols.ink}>{text}</text>
    </>
  );
  if (!print) {
    return (
      <svg viewBox={`0 0 ${f1(W)} ${f1(H + VAL_SCALLOP)}`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid}>
        <path d={valPath(g)} fill={cols.fabric} />
        <line x1={0} y1={6} x2={f1(W)} y2={6} stroke={cols.ink} strokeOpacity={0.25} strokeWidth={2} />
        <g data-art="1">{body}</g>
      </svg>
    );
  }
  return (
    <svg viewBox={`${f1(vx)} ${f1(vy)} ${f1(vw)} ${f1(vh)}`} width={`${f1(vw)}mm`} height={`${f1(vh)}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid}>
      <rect x={f1(vx)} y={f1(vy)} width={f1(vw)} height={f1(vh)} fill="#FFFFFF" />
      <g id="Vai"><path d={valPath(g, g.allow)} fill={cols.fabric} opacity={0.9} /></g>
      <g id="In"><g data-art="1">{body}</g></g>
      <g id="DuongMay" fill="none"><path d={valPath(g)} stroke={isDarkHex(cols.fabric) ? '#FFFFFF' : '#1F2937'} strokeOpacity={0.8} strokeWidth={1.2} strokeDasharray="8 6" /></g>
      <g id="CutContour" fill="none"><path d={valPath(g, g.allow)} stroke={CUTCONTOUR} strokeWidth={1} /></g>
      <text x={f1(vx + 8)} y={f1(H + VAL_SCALLOP + pad + 24)} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={12} fill="#334155">
        {`Diềm dù ${Math.round(W)}×${H}mm (+ vỏ sò ${VAL_SCALLOP}mm) · ${variant === 'base' ? 'diềm màu chính' : 'diềm màu phụ'} · nền là màu vải (không in)`}
      </text>
    </svg>
  );
}

// ---------- nhìn từ trên xuống (thumbnail mẫu + bản thiết kế) ----------
export function TopViewSvg({ spec, data, logo, logoAlt, style, testid }: {
  spec: UmbSpec; data: UmbData; logo: UmbLogo | null; logoAlt?: UmbLogo | null; style?: CSSProperties; testid?: string;
}) {
  const g = umbGeo(spec.kind);
  const p = umbPalette(spec.palette);
  const N = g.N, R = g.rho, dT = (2 * Math.PI) / N;
  const pr = new Set(printedPanels(spec.panels, N));
  const y0 = g.L * g.y0, r0 = g.Rs * Math.sin(y0 / g.Rs);
  const kx = (r0 * Math.tan(Math.PI / N)) / goreW(g, y0), ky = Math.cos(y0 / g.Rs);
  const pt = (a: number, r: number) => [r * Math.sin(a), r * Math.cos(a)] as const; // a = 0 → hướng xuống (múi trước)
  const uid = `tv${spec.kind}${spec.palette}${spec.panels}`;
  const panels: ReactNode[] = [];
  for (let k = 0; k < N; k++) {
    const a0 = k * dT - dT / 2, a1 = k * dT + dT / 2, am = k * dT;
    const [x0, y0p] = pt(a0, R), [x1, y1p] = pt(a1, R), [cxm, cym] = pt(am, R * Math.cos(Math.PI / N) * (1 - g.sc * 1.6));
    const d = `M0 0 L${f1(x0)} ${f1(y0p)} Q${f1(cxm)} ${f1(cym)} ${f1(x1)} ${f1(y1p)} Z`;
    const v: UmbVariant = spec.alternate && k % 2 ? 'alt' : 'base';
    const cols = variantColors(p, v, spec.inks);
    panels.push(
      <g key={k}>
        <clipPath id={`${uid}c${k}`}><path d={d} /></clipPath>
        <path d={d} fill={cols.fabric} stroke="rgba(0,0,0,0.18)" strokeWidth={R * 0.004} />
        {pr.has(k) && (
          <g clipPath={`url(#${uid}c${k})`}>
            <g transform={`rotate(${f1((-am * 180) / Math.PI)}) translate(0 ${f1(r0)}) scale(${kx.toFixed(4)} ${ky.toFixed(4)}) translate(0 ${f1(-y0)})`}>
              <PanelArt g={g} spec={spec} data={data} cols={cols} logo={v === 'alt' ? (logoAlt ?? logo) : logo} />
            </g>
          </g>
        )}
      </g>,
    );
  }
  const m = R * 0.08;
  return (
    <svg viewBox={`${f1(-R - m)} ${f1(-R - m)} ${f1(2 * (R + m))} ${f1(2 * (R + m))}`} xmlns="http://www.w3.org/2000/svg" style={style} data-testid={testid}>
      <circle cx={0} cy={0} r={f1(R * 1.02)} fill="rgba(15,23,42,0.07)" transform={`translate(${f1(R * 0.03)} ${f1(R * 0.04)})`} />
      {panels}
      <circle cx={0} cy={0} r={f1(R * (spec.kind === 'patio' ? 0.2 : 0.05))} fill={p.base} stroke="rgba(0,0,0,0.25)" strokeWidth={R * 0.006} />
      <circle cx={0} cy={0} r={f1(R * 0.025)} fill="#9CA3AF" />
    </svg>
  );
}

// ---------- logo khách: tô 1 màu mực (in lụa) ----------
export async function loadLogo(src: string): Promise<{ src: string; ar: number }> {
  const im = new Image(); im.src = src; await im.decode();
  return { src, ar: im.naturalWidth / Math.max(1, im.naturalHeight) };
}
const tintCache = new Map<string, Promise<string>>();
/** phần tối/đậm của logo → 1 màu mực, phần sáng/trong suốt → bỏ (vải lộ ra) */
export function tintLogo(src: string, hex: string, threshold = 200): Promise<string> {
  const key = `${hex}|${threshold}|${src.length}|${src.slice(-40)}`;
  if (!tintCache.has(key)) {
    tintCache.set(key, (async () => {
      const im = new Image(); im.src = src; await im.decode();
      const k = Math.min(1, 900 / Math.max(im.naturalWidth, im.naturalHeight));
      const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
      const c = document.createElement('canvas'); c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(im, 0, 0, w, h);
      const d = ctx.getImageData(0, 0, w, h), px = d.data;
      const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
      for (let i = 0; i < px.length; i += 4) {
        const l = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
        const on = px[i + 3] > 110 && l < threshold;
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = on ? 255 : 0;
      }
      ctx.putImageData(d, 0, 0);
      return c.toDataURL('image/png');
    })());
  }
  return tintCache.get(key)!;
}
