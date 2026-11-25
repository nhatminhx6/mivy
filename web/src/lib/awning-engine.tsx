'use client';
// Mái hiên · bạt che in logo: 1 engine SVG đơn vị mm thật = LOẠI MÁI × VẢI (sọc / trơn / in KTS) × BẢNG MÀU × FONT.
// Mảnh vải: mái (canopy, rộng W × dài dốc L), diềm (valance W × cao, mép lượn sóng/vỏ sò/thẳng), hông (vòm/kiểu Pháp).
// Chữ xếp theo hộp, đo bằng font thật (lấy max ascent/descent của font & mực chữ) → không lòi, không đè.
// File in: tờ trải phẳng đúng mm, lề may 40mm, chia khổ vải theo khổ cuộn (đường may nối), lớp In/CutContour/Seam/Fold.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export type AWKind = 'retract' | 'dome' | 'french';
export const AW_KINDS: { id: AWKind; name: string; sub: string }[] = [
  { id: 'retract', name: 'Mái hiên di động tay quay', sub: 'Dốc 15°, tay gấp, cuốn gọn' },
  { id: 'dome', name: 'Mái vòm cố định', sub: 'Khung vòm 1/4, có hông tròn' },
  { id: 'french', name: 'Mái kiểu Pháp', sub: 'Dốc 35°, 2 hông tam giác' },
];
export const AW_PROJ: Record<AWKind, number[]> = { retract: [1500, 2000, 2500, 3000], dome: [800, 1000, 1200], french: [800, 1000, 1200] };
const PITCH: Record<AWKind, number> = { retract: 15, dome: 0, french: 35 };

export type AWFabric = 'stripe' | 'solid' | 'print';
export const AW_FABRICS: { id: AWFabric; name: string }[] = [
  { id: 'stripe', name: 'Sọc màu cổ điển' },
  { id: 'solid', name: 'Bạt trơn 1 màu' },
  { id: 'print', name: 'Bạt in kỹ thuật số' },
];
export type AWEdge = 'scallop' | 'wave' | 'straight';
export const AW_EDGES: { id: AWEdge; name: string }[] = [
  { id: 'scallop', name: 'Vỏ sò' }, { id: 'wave', name: 'Lượn sóng' }, { id: 'straight', name: 'Thẳng' },
];
export type AWLayout = 'center' | 'stack' | 'split' | 'repeat';
export const AW_LAYOUTS: { id: AWLayout; name: string }[] = [
  { id: 'center', name: 'Tên giữa' }, { id: 'stack', name: 'Tên + slogan' }, { id: 'split', name: 'Tên | hotline' }, { id: 'repeat', name: 'Lặp tên' },
];
export type AWCanopy = 'none' | 'logo' | 'brand';
export const AW_CANOPY: { id: AWCanopy; name: string }[] = [
  { id: 'none', name: 'Mái để trơn' }, { id: 'logo', name: 'Huy hiệu logo trên mái' }, { id: 'brand', name: 'In tên lớn trên mái' },
];
export const AW_ROLLS = [1200, 1500, 3200]; // khổ cuộn vải (mm): bạt sọc 1.2/1.5m, bạt in KTS 3.2m
export const AW_HEM = 40;   // lề may / gấp mép quanh mảnh (mm)
export const AW_SEAM = 30;  // chồng mí đường may nối khổ (mm)

// ---------- font ----------
export interface AWFont { id: string; name: string; family: string; weight: number }
export const AW_FONTS: AWFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
  { id: 'dancing', name: 'Dancing', family: 'Dancing Script', weight: 700 },
];
export const awFont = (id: string) => AW_FONTS.find((f) => f.id === id) || AW_FONTS[0];
const BODY = 'Be Vietnam Pro';
export const AW_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Lobster&family=Dancing+Script:wght@700&display=swap');`;

const mcache = new Map<string, { w: number; a: number; d: number }>();
let mctx: CanvasRenderingContext2D | null = null;
// đo ở cỡ 1: bề rộng + cao trên/dưới (lấy max của font & mực chữ → dấu chồng tiếng Việt không lòi)
function metric(text: string, fam: string, wt: number) {
  const k = `${wt}|${fam}|${text}`;
  const hit = mcache.get(k);
  if (hit) return hit;
  let v = { w: text.length * 0.6, a: 0.95, d: 0.28 };
  if (typeof document !== 'undefined') {
    mctx ??= document.createElement('canvas').getContext('2d');
    if (mctx) {
      mctx.font = `${wt} 200px '${fam}'`;
      const m = mctx.measureText(text || ' ');
      v = {
        w: m.width / 200,
        a: Math.max(m.fontBoundingBoxAscent || 0, m.actualBoundingBoxAscent || 0) / 200 || 0.95,
        d: Math.max(m.fontBoundingBoxDescent || 0, m.actualBoundingBoxDescent || 0) / 200 || 0.28,
      };
    }
  }
  mcache.set(k, v);
  return v;
}

export function useAWFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-aw-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-aw-fonts'; link.rel = 'stylesheet';
        link.href = AW_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...AW_FONTS.map((f) => `${f.weight} 60px '${f.family}'`), `600 40px '${BODY}'`, `800 40px '${BODY}'`];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &'))))
      .catch(() => null)
      .then(() => { mcache.clear(); if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface AWPalette { id: string; name: string; a: string; b: string; val: string; ink: string }
export const AW_PALETTES: AWPalette[] = [
  { id: 'coffee', name: 'Nâu cà phê', a: '#6B4226', b: '#F3E6D0', val: '#5A3620', ink: '#F6EAD5' },
  { id: 'redwhite', name: 'Đỏ trắng', a: '#C8102E', b: '#FFFFFF', val: '#B30E28', ink: '#FFFFFF' },
  { id: 'green', name: 'Xanh rêu kem', a: '#1F5D45', b: '#F4EBD9', val: '#1A503B', ink: '#F4EBD9' },
  { id: 'navy', name: 'Navy trắng', a: '#1F3A68', b: '#FFFFFF', val: '#1A3159', ink: '#FFFFFF' },
  { id: 'blackgold', name: 'Đen ánh vàng', a: '#1C1C1C', b: '#3A3A3A', val: '#151515', ink: '#D9B45A' },
  { id: 'blush', name: 'Hồng phấn', a: '#E7A3A7', b: '#FFF6F2', val: '#C9707A', ink: '#FFF6F2' },
  { id: 'teal', name: 'Xanh ngọc', a: '#127C7A', b: '#FFFFFF', val: '#0F6B69', ink: '#FFFFFF' },
  { id: 'yellow', name: 'Vàng đen', a: '#F2C230', b: '#232323', val: '#1F1F1F', ink: '#F2C230' },
  { id: 'terra', name: 'Đất nung', a: '#C0603C', b: '#F6E7D8', val: '#A84F2F', ink: '#FBEFE3' },
  { id: 'lavender', name: 'Tím lavender', a: '#8A79B5', b: '#F5F1FA', val: '#75649F', ink: '#FFFFFF' },
];
export const awPalette = (id: string) => AW_PALETTES.find((p) => p.id === id) || AW_PALETTES[0];

// ---------- spec / mẫu ----------
export type AWUse = 'cafe' | 'bakery' | 'food' | 'grocery' | 'spa' | 'shop';
export interface AWSpec {
  kind: AWKind; widthMm: number; proj: number; valH: number; edge: AWEdge; fabric: AWFabric; stripeMm: number;
  palette: string; font: string; layout: AWLayout; canopy: AWCanopy; roll: number;
}
export interface AWTemplate { id: string; name: string; use: AWUse; spec: Omit<AWSpec, 'widthMm' | 'roll'> }
const T = (id: string, name: string, use: AWUse, s: Omit<AWSpec, 'widthMm' | 'roll'>): AWTemplate => ({ id, name, use, spec: s });
export const AW_TEMPLATES: AWTemplate[] = [
  T('cafe-classic', 'Cà phê sọc nâu', 'cafe', { kind: 'retract', proj: 2000, valH: 300, edge: 'scallop', fabric: 'stripe', stripeMm: 200, palette: 'coffee', font: 'playfair', layout: 'center', canopy: 'none' }),
  T('cafe-print', 'Cà phê in tên mái', 'cafe', { kind: 'retract', proj: 2500, valH: 300, edge: 'straight', fabric: 'print', stripeMm: 200, palette: 'green', font: 'lobster', layout: 'stack', canopy: 'brand' }),
  T('bakery-dome', 'Tiệm bánh vòm hồng', 'bakery', { kind: 'dome', proj: 1000, valH: 300, edge: 'scallop', fabric: 'stripe', stripeMm: 200, palette: 'blush', font: 'dancing', layout: 'center', canopy: 'logo' }),
  T('bakery-french', 'Tiệm bánh kiểu Pháp', 'bakery', { kind: 'french', proj: 1000, valH: 250, edge: 'wave', fabric: 'stripe', stripeMm: 250, palette: 'terra', font: 'playfair', layout: 'split', canopy: 'none' }),
  T('food-repeat', 'Quán ăn đỏ trắng', 'food', { kind: 'retract', proj: 2500, valH: 300, edge: 'straight', fabric: 'stripe', stripeMm: 250, palette: 'redwhite', font: 'baloo', layout: 'repeat', canopy: 'none' }),
  T('food-dome', 'Nhà hàng đen vàng', 'food', { kind: 'dome', proj: 1200, valH: 300, edge: 'straight', fabric: 'solid', stripeMm: 200, palette: 'blackgold', font: 'playfair', layout: 'center', canopy: 'logo' }),
  T('grocery-yellow', 'Tạp hoá vàng đen', 'grocery', { kind: 'retract', proj: 2000, valH: 300, edge: 'straight', fabric: 'stripe', stripeMm: 200, palette: 'yellow', font: 'oswald', layout: 'split', canopy: 'none' }),
  T('grocery-teal', 'Tạp hoá xanh ngọc', 'grocery', { kind: 'french', proj: 1000, valH: 300, edge: 'scallop', fabric: 'solid', stripeMm: 200, palette: 'teal', font: 'montserrat', layout: 'stack', canopy: 'brand' }),
  T('spa-dome', 'Spa vòm lavender', 'spa', { kind: 'dome', proj: 1000, valH: 250, edge: 'straight', fabric: 'solid', stripeMm: 200, palette: 'lavender', font: 'dancing', layout: 'stack', canopy: 'logo' }),
  T('spa-navy', 'Spa navy in mái', 'spa', { kind: 'retract', proj: 2000, valH: 300, edge: 'wave', fabric: 'print', stripeMm: 200, palette: 'navy', font: 'playfair', layout: 'center', canopy: 'brand' }),
  T('shop-black', 'Shop sọc đen', 'shop', { kind: 'french', proj: 1200, valH: 300, edge: 'straight', fabric: 'stripe', stripeMm: 120, palette: 'blackgold', font: 'montserrat', layout: 'center', canopy: 'none' }),
  T('shop-navy', 'Shop navy lặp tên', 'shop', { kind: 'retract', proj: 1500, valH: 250, edge: 'scallop', fabric: 'solid', stripeMm: 200, palette: 'navy', font: 'oswald', layout: 'repeat', canopy: 'logo' }),
];

export type AWData = Record<string, string>;
export const AW_FIELDS: { key: string; label: string; ph?: string }[] = [
  { key: 'brand', label: 'Tên quán (in lớn trên diềm)', ph: 'AN KHANG COFFEE' },
  { key: 'slogan', label: 'Slogan / dòng phụ', ph: 'Cà phê rang xay mỗi ngày' },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456' },
];
export const AW_SAMPLES: Record<AWUse, AWData> = {
  cafe: { brand: 'AN KHANG COFFEE', slogan: 'Cà phê rang xay mỗi ngày', hotline: '0909 123 456' },
  bakery: { brand: 'Tiệm bánh Thu Hà', slogan: 'Bánh tươi nướng mỗi sáng', hotline: '0938 456 789' },
  food: { brand: 'QUÁN CƠM GIA KHÁNH', slogan: 'Cơm nhà – ngon như mẹ nấu', hotline: '0912 345 678' },
  grocery: { brand: 'TẠP HOÁ QUỐC BẢO', slogan: 'Đủ món – giá tốt – giao tận nhà', hotline: '0903 222 111' },
  spa: { brand: 'An Nhiên Spa', slogan: 'Thư giãn – chăm sóc da', hotline: '0987 654 321' },
  shop: { brand: 'BẢO NGỌC FASHION', slogan: 'Thời trang công sở', hotline: '0977 888 999' },
};
export const awTemplate = (id: string) => AW_TEMPLATES.find((t) => t.id === id) || AW_TEMPLATES[0];

// ---------- hình học ----------
export interface AWGeo {
  W: number; proj: number; L: number; drop: number; valH: number; pitch: number;
  scD: number;                 // độ sâu mép lượn (mm)
  side: 'none' | 'tri' | 'quarter';
}
export function awGeo(s: AWSpec): AWGeo {
  const W = s.widthMm, p = s.proj;
  const scD = s.edge === 'scallop' ? 55 : s.edge === 'wave' ? 40 : 0;
  if (s.kind === 'dome') return { W, proj: p, L: (Math.PI / 2) * p, drop: p, valH: s.valH, pitch: 0, scD, side: 'quarter' };
  const pitch = PITCH[s.kind];
  const r = (pitch * Math.PI) / 180;
  return { W, proj: p, L: p / Math.cos(r), drop: p * Math.tan(r), valH: s.valH, pitch, scD, side: s.kind === 'french' ? 'tri' : 'none' };
}
// chia khổ vải mái: mảnh chạy dọc dốc, mỗi mảnh ≤ khổ cuộn (đã trừ chồng mí)
export function awPanels(s: AWSpec): { n: number; pw: number; total: number; fabricM: number } {
  const g = awGeo(s);
  const total = g.W + 2 * AW_HEM;
  const n = Math.max(1, Math.ceil(total / (s.roll - AW_SEAM)));
  const pw = total / n;
  const fabricM = (n * (g.L + 2 * AW_HEM) + (g.W + 2 * AW_HEM) * (g.valH + AW_HEM < s.roll / 2 ? 0.5 : 1) + (g.side !== 'none' ? 2 * (g.proj + 100) : 0)) / 1000;
  return { n, pw, total, fabricM: Math.round(fabricM * 10) / 10 };
}

// mép dưới diềm: chuỗi lệnh đi từ (W, y-depth) sang trái tới (0, y-depth) — vỏ sò / lượn sóng (thẳng: rỗng)
function edgeArcs(W: number, y: number, edge: AWEdge, depth: number): string {
  if (edge === 'straight' || depth <= 0) return '';
  const n = Math.max(3, Math.round(W / (edge === 'scallop' ? 230 : 320)));
  const w = W / n;
  let d = '';
  for (let i = n; i > 0; i--) {
    const x1 = (i - 1) * w;
    if (edge === 'scallop') d += ` A${w / 2} ${depth} 0 0 1 ${x1} ${y - depth}`;
    else d += ` Q${x1 + w / 2} ${y + depth * 0.95} ${x1} ${y - depth}`;
  }
  return d;
}
// đường bao mảnh diềm: sx = nới 2 bên, top = nới mép trên, dy = hạ mép dưới (lề in tràn)
export function valancePath(W: number, H: number, edge: AWEdge, depth: number, sx = 0, top = 0, dy = 0): string {
  const y = H + dy;
  if (edge === 'straight' || depth <= 0) return `M${-sx} ${-top} L${W + sx} ${-top} L${W + sx} ${y} L${-sx} ${y} Z`;
  return `M${-sx} ${-top} L${W + sx} ${-top} L${W + sx} ${y - depth} L${W} ${y - depth}${edgeArcs(W, y, edge, depth)} L${-sx} ${y - depth} Z`;
}

// ---------- chữ ----------
interface Box { x: number; y: number; w: number; h: number }
interface Ctx { s: AWSpec; d: AWData; p: AWPalette; f: AWFont; g: AWGeo; logo?: string; uid: string }
// cỡ lớn nhất vừa hộp; trả về null nếu rỗng
function fit(text: string, fam: string, wt: number, box: Box, ls = 0, maxSize = Infinity) {
  const t = (text || '').trim();
  if (!t) return null;
  const m = metric(t, fam, wt);
  const wUnit = m.w + ls * Math.max(0, t.length - 1);
  // chừa 7% chiều cao: getBBox của trình duyệt đôi khi cao hơn số đo canvas vài %
  const size = Math.min(maxSize, box.h / ((m.a + m.d) * 1.07), box.w / Math.max(0.01, wUnit));
  return { t, size, w: wUnit * size, a: m.a * size, d: m.d * size };
}
function Txt({ text, fam, wt, box, fill, anchor = 'middle', ls = 0, maxSize, role }: {
  text: string; fam: string; wt: number; box: Box; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; maxSize?: number; role: string;
}) {
  const r = fit(text, fam, wt, box, ls, maxSize);
  if (!r) return null;
  const x = anchor === 'start' ? box.x : anchor === 'end' ? box.x + box.w : box.x + box.w / 2;
  const y = box.y + (box.h - (r.a + r.d)) / 2 + r.a;
  return (
    <text x={x} y={y} fontFamily={`'${fam}'`} fontWeight={wt} fontSize={r.size} fill={fill} textAnchor={anchor}
      letterSpacing={ls ? r.size * ls : undefined} data-awt={role} data-box={`${box.x},${box.y},${box.w},${box.h}`}>{r.t}</text>
  );
}
const initials = (s: string) => {
  const skip = new Set(['tiệm', 'quán', 'nhà', 'hàng', 'cửa', 'shop', 'spa', 'coffee', 'cà', 'phê', 'tạp', 'hoá', 'hóa', 'cơm', 'bánh', 'fashion']);
  const w = (s || '').split(/\s+/).filter((x) => x && !skip.has(x.toLowerCase()));
  return (w.length ? w : (s || 'M').split(/\s+/)).slice(0, 2).map((x) => x[0]?.toUpperCase() || '').join('') || 'M';
};
// huy hiệu tròn: logo khách hoặc chữ lồng
function badge(c: Ctx, cx: number, cy: number, r: number, bg: string, fg: string, role: string): ReactNode {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={bg} />
      <circle cx={cx} cy={cy} r={r * 0.88} fill="none" stroke={fg} strokeWidth={r * 0.035} />
      {c.logo
        ? <image href={c.logo} x={cx - r * 0.66} y={cy - r * 0.66} width={r * 1.32} height={r * 1.32} preserveAspectRatio="xMidYMid meet" />
        : <Txt text={initials(c.d.brand)} fam={c.f.family} wt={c.f.weight} fill={fg} role={role} box={{ x: cx - r * 0.6, y: cy - r * 0.42, w: r * 1.2, h: r * 0.84 }} />}
    </g>
  );
}
const phoneIcon = (x: number, y: number, s: number, fill: string) => (
  <path transform={`translate(${x} ${y}) scale(${s / 24})`} fill={fill}
    d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.6a1 1 0 0 1-.25 1z" />
);

// ---------- vải: nền sọc / trơn / in ----------
function fabricBg(c: Ctx, x: number, y: number, w: number, h: number, vertical = true): ReactNode {
  const { p, s } = c;
  if (s.fabric !== 'stripe') {
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={p.a} />
        {s.fabric === 'print' && (
          // bạt in KTS: vân chấm mờ cho có chất in, không lấn chữ
          <g opacity={0.09} fill={p.b}>
            {Array.from({ length: Math.ceil(w / 140) + 1 }, (_, i) => Array.from({ length: Math.ceil(h / 140) + 1 }, (_, j) => (
              <circle key={`${i}-${j}`} cx={x + i * 140 + (j % 2) * 70} cy={y + j * 140} r={10} />
            )))}
          </g>
        )}
      </g>
    );
  }
  const sw = s.stripeMm;
  const len = vertical ? w : h;
  const mid = (vertical ? x + w / 2 : y + h / 2);
  const k0 = Math.floor((len / 2 + sw) / sw) + 1;
  const out: ReactNode[] = [<rect key="bg" x={x} y={y} width={w} height={h} fill={p.b} />];
  for (let k = -k0; k <= k0; k++) {
    if (k % 2 !== 0) continue;
    const s0 = mid - sw / 2 + k * sw;
    out.push(vertical
      ? <rect key={k} x={s0} y={y} width={sw} height={h} fill={p.a} />
      : <rect key={k} x={x} y={s0} width={w} height={sw} fill={p.a} />);
  }
  return <g>{out}</g>;
}

// ---------- mảnh MÁI (W × L), y=0 = mép tường, y=L = mép trước ----------
export function canopyNode(c: Ctx, b = 0): ReactNode {
  const { g, s, p, f, d } = c;
  const W = g.W, L = g.L;
  const clipId = `${c.uid}-awc-${b}`;
  let deco: ReactNode = null;
  if (s.canopy === 'logo') {
    const r = Math.min(L * 0.26, 520, W * 0.12);
    deco = badge(c, W / 2, L * 0.6, r, s.fabric === 'stripe' ? p.val : p.ink, s.fabric === 'stripe' ? p.ink : p.val, 'canopy-logo');
  } else if (s.canopy === 'brand') {
    const band: Box = { x: W * 0.08, y: L * 0.34, w: W * 0.84, h: L * 0.36 };
    const fg = s.fabric === 'stripe' ? p.ink : p.b;
    deco = (
      <g>
        {s.fabric === 'stripe' && <rect x={band.x - 60} y={band.y - 50} width={band.w + 120} height={band.h + L * 0.22 + 100} rx={40} fill={p.val} />}
        <Txt text={d.brand} fam={f.family} wt={f.weight} fill={fg} role="canopy-brand" box={band} ls={0.03} />
        <Txt text={d.slogan} fam={BODY} wt={600} fill={fg} role="canopy-slogan" box={{ x: W * 0.2, y: L * 0.73, w: W * 0.6, h: L * 0.12 }} />
      </g>
    );
  }
  return (
    <g>
      <defs><clipPath id={clipId}><rect x={-b} y={-b} width={W + 2 * b} height={L + 2 * b} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>{fabricBg(c, -b, -b, W + 2 * b, L + 2 * b)}</g>
      {deco}
    </g>
  );
}

// ---------- mảnh DIỀM (W × valH), mép dưới lượn ----------
export function valanceNode(c: Ctx, b = 0): ReactNode {
  const { g, s, p, f, d } = c;
  const W = g.W, H = g.valH;
  const clipId = `${c.uid}-awv-${b}`;
  const top = 34;                                 // dải viền trên (che ống/thanh trước)
  const bandTop = top + 10, bandBot = H - g.scD - 10;
  const band: Box = { x: 70, y: bandTop, w: W - 140, h: Math.max(40, bandBot - bandTop) };
  const bg = s.fabric === 'stripe' || s.fabric === 'print' ? p.val : p.a;
  const fg = p.ink;
  const ls = f.id === 'lobster' || f.id === 'dancing' ? 0 : 0.04;
  let text: ReactNode = null;
  if (s.layout === 'center') {
    // tên giữa (+ huy hiệu logo bên trái nếu có logo)
    const hasLogo = !!c.logo;
    const lg = hasLogo ? band.h * 0.94 : 0;
    const r = fit(d.brand, f.family, f.weight, { ...band, w: band.w - (hasLogo ? lg + 50 : 0), h: band.h * 0.96 }, ls);
    const tw = r ? r.w : 0;
    const gx = W / 2 - (tw + (hasLogo ? lg + 50 : 0)) / 2;
    text = (
      <g>
        {hasLogo && badge(c, gx + lg / 2, band.y + band.h / 2, lg / 2, p.b, p.a, 'val-logo')}
        <Txt text={d.brand} fam={f.family} wt={f.weight} fill={fg} role="val-brand" ls={ls}
          box={{ x: gx + (hasLogo ? lg + 50 : 0), y: band.y + band.h * 0.02, w: Math.max(1, Math.min(tw + 2, band.w - (hasLogo ? lg + 50 : 0))), h: band.h * 0.96 }} />
      </g>
    );
  } else if (s.layout === 'stack') {
    text = (
      <g>
        <Txt text={d.brand} fam={f.family} wt={f.weight} fill={fg} role="val-brand" ls={ls} box={{ x: band.x, y: band.y, w: band.w, h: band.h * 0.62 }} />
        <Txt text={[d.slogan, d.hotline].filter(Boolean).join('  ·  ')} fam={BODY} wt={600} fill={fg} role="val-sub" box={{ x: band.x + band.w * 0.12, y: band.y + band.h * 0.7, w: band.w * 0.76, h: band.h * 0.3 }} />
      </g>
    );
  } else if (s.layout === 'split') {
    const leftW = band.w * 0.62, gap = band.w * 0.04;
    const rx = band.x + leftW + gap, rw = band.w - leftW - gap;
    const ph = band.h * 0.42;
    text = (
      <g>
        <Txt text={d.brand} fam={f.family} wt={f.weight} fill={fg} role="val-brand" ls={ls} anchor="start" box={{ x: band.x, y: band.y + band.h * 0.06, w: leftW, h: band.h * 0.88 }} />
        <circle cx={band.x + leftW + gap / 2} cy={band.y + band.h / 2} r={Math.min(14, band.h * 0.06)} fill={fg} />
        {d.hotline && phoneIcon(rx, band.y + band.h / 2 - ph / 2, ph, fg)}
        <Txt text={d.hotline} fam={BODY} wt={800} fill={fg} role="val-hotline" anchor="start" box={{ x: rx + ph * 1.25, y: band.y + band.h * 0.18, w: Math.max(1, rw - ph * 1.25), h: band.h * 0.64 }} />
      </g>
    );
  } else {
    // lặp tên: mỗi đoạn ~1.6m, chấm tròn ngăn cách
    const n = Math.max(1, Math.round(W / 1700));
    const seg = (W - 140) / n;
    text = (
      <g>
        {Array.from({ length: n }, (_, i) => (
          <g key={i}>
            <Txt text={d.brand} fam={f.family} wt={f.weight} fill={fg} role="val-brand" ls={ls} box={{ x: 70 + i * seg + seg * 0.06, y: band.y + band.h * 0.1, w: seg * 0.88, h: band.h * 0.8 }} />
            {i > 0 && <circle cx={70 + i * seg} cy={band.y + band.h / 2} r={Math.min(16, band.h * 0.07)} fill={fg} />}
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      <defs><clipPath id={clipId}><path d={valancePath(W, H, s.edge, g.scD, b, b, b)} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>
        <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={bg} />
        <rect x={-b} y={top - 10} width={W + 2 * b} height={10} fill={s.fabric === 'stripe' ? p.b : p.ink} opacity={0.9} />
        {s.edge !== 'straight' && <path d={`M${W} ${H - 8 - g.scD}` + edgeArcs(W, H - 8, s.edge, g.scD)} fill="none" stroke={p.ink} strokeOpacity={0.55} strokeWidth={5} strokeDasharray="14 10" />}
      </g>
      {text}
    </g>
  );
}

// ---------- mảnh HÔNG (vòm 1/4 tròn hoặc tam giác), x = theo chiều vươn ra, y xuống ----------
export function sidePath(g: AWGeo, b = 0): string {
  if (g.side === 'quarter') {
    const r = g.proj + b;
    return `M${-b} ${-b} A${r} ${r} 0 0 1 ${g.proj + b} ${g.drop + b} L${-b} ${g.drop + b} Z`;
  }
  return `M${-b} ${-b * 2} L${g.proj + b * 2} ${g.drop + b} L${-b} ${g.drop + b} Z`;
}
export function sideNode(c: Ctx, b = 0): ReactNode {
  const { g, s } = c;
  if (g.side === 'none') return null;
  const clipId = `${c.uid}-aws-${b}`;
  return (
    <g>
      <defs><clipPath id={clipId}><path d={sidePath(g, b)} /></clipPath></defs>
      <g clipPath={`url(#${clipId})`}>{fabricBg(c, -b - 10, -b * 2 - 10, g.proj + 3 * b + 20, g.drop + 3 * b + 20)}</g>
    </g>
  );
}

// ---------- SVG xuất ra: từng mảnh (texture 3D) ----------
export type AWPiece = 'canopy' | 'valance' | 'side';
export function AwningPiece({ spec, data, logo, piece, style }: { spec: AWSpec; data: AWData; logo?: string; piece: AWPiece; style?: CSSProperties }) {
  const uid = 'aw' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const c: Ctx = { s: spec, d: data, p: awPalette(spec.palette), f: awFont(spec.font), g: awGeo(spec), logo, uid };
  const { g } = c;
  const [w, h, node] = piece === 'canopy' ? [g.W, g.L, canopyNode(c)] : piece === 'valance' ? [g.W, g.valH, valanceNode(c)] : [g.proj, g.drop, sideNode(c)];
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={style} data-piece={piece}>{node}</svg>;
}

// ---------- mặt đứng nhìn từ phố (thumbnail / PNG) ----------
export function AwningFront({ spec, data, logo, style }: { spec: AWSpec; data: AWData; logo?: string; style?: CSSProperties }) {
  const uid = 'aw' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const c: Ctx = { s: spec, d: data, p: awPalette(spec.palette), f: awFont(spec.font), g: awGeo(spec), logo, uid };
  const { g, s } = c;
  const W = g.W, side = 0.09 * W + 300;
  const canH = s.kind === 'dome' ? g.proj * 0.9 : s.kind === 'french' ? g.L * 0.55 : g.L * 0.3; // mái nhìn nghiêng (co theo phối cảnh)
  const top = 260, valY = top + canH;
  const H = valY + g.valH + 760;
  const clip = `${c.uid}-awf`;
  const shape = s.kind === 'dome'
    ? `M0 ${valY} C0 ${top + canH * 0.05} ${W * 0.08} ${top} ${W * 0.2} ${top} L${W * 0.8} ${top} C${W * 0.92} ${top} ${W} ${top + canH * 0.05} ${W} ${valY} Z`
    : `M${s.kind === 'french' ? W * 0.03 : W * 0.015} ${top} L${W - (s.kind === 'french' ? W * 0.03 : W * 0.015)} ${top} L${W} ${valY} L0 ${valY} Z`;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-side} 0 ${W + 2 * side} ${H}`} style={style} data-front="1">
      <defs>
        <linearGradient id={`${clip}-sh`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0.28" /><stop offset="1" stopColor="#000" stopOpacity="0" /></linearGradient>
        <clipPath id={clip}><path d={shape} /></clipPath>
      </defs>
      <rect x={-side} y={0} width={W + 2 * side} height={H} fill="#E9E4DA" />
      <rect x={W * 0.06} y={valY + g.valH - 40} width={W * 0.88} height={H} fill="#2C3440" />
      <rect x={W * 0.08} y={valY + g.valH} width={W * 0.84} height={H} fill="#46525F" />
      <rect x={W * 0.06} y={valY + g.valH - 40} width={W * 0.88} height={260} fill={`url(#${clip}-sh)`} />
      <g clipPath={`url(#${clip})`}>
        <g transform={`translate(0 ${top}) scale(1 ${canH / g.L})`}>{canopyNode(c)}</g>
        <rect x={0} y={top} width={W} height={canH} fill={`url(#${clip}-sh)`} opacity={0.5} transform={`rotate(180 ${W / 2} ${top + canH / 2})`} />
      </g>
      <g transform={`translate(0 ${valY})`}>{valanceNode(c)}</g>
    </svg>
  );
}

// ---------- tờ FILE IN trải phẳng (mm thật) ----------
export interface AWSheet { w: number; h: number; dpi: number }
const M = 120, TITLE = 300, GAP = 180;
export function awSheet(spec: AWSpec): AWSheet {
  const g = awGeo(spec);
  const cw = g.W + 2 * AW_HEM, sideW = g.side !== 'none' ? 2 * (g.proj + 2 * AW_HEM) + GAP : 0;
  const w = Math.max(cw, sideW) + 2 * M;
  const h = M + TITLE + (g.L + 2 * AW_HEM) + GAP + (g.valH + 2 * AW_HEM) + (g.side !== 'none' ? GAP + g.drop + 2 * AW_HEM : 0) + M;
  const dpi = Math.max(25, Math.min(72, Math.floor((10000 * 25.4) / Math.max(w, h))));
  return { w, h, dpi };
}
export function AwningSheet({ spec, data, logo, style }: { spec: AWSpec; data: AWData; logo?: string; style?: CSSProperties }) {
  const uid = 'aw' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const c: Ctx = { s: spec, d: data, p: awPalette(spec.palette), f: awFont(spec.font), g: awGeo(spec), logo, uid };
  const { g, s } = c;
  const sh = awSheet(spec);
  const pan = awPanels(spec);
  const B = AW_HEM;
  const x0 = M + B, yC = M + TITLE + B;
  const yV = yC + g.L + B + GAP + B;
  const yS = yV + g.valH + B + GAP + B;
  const lab = (x: number, y: number, t: string, size = 46, anchor: 'start' | 'middle' = 'start') => (
    <text x={x} y={y} fontFamily={`'${BODY}'`} fontWeight={600} fontSize={size} fill="#334155" textAnchor={anchor} data-label="1">{t}</text>
  );
  const kindName = AW_KINDS.find((k) => k.id === s.kind)?.name || '';
  const seams = Array.from({ length: pan.n - 1 }, (_, i) => -B + (i + 1) * pan.pw);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${sh.w} ${sh.h}`} width={`${sh.w}mm`} height={`${sh.h}mm`} style={style} data-sheet="1">
      <rect x={0} y={0} width={sh.w} height={sh.h} fill="#FFFFFF" />
      {lab(M, M + 70, `MÁI HIÊN · ${kindName} · rộng ${(g.W / 1000).toFixed(2)} m · vươn ${(g.proj / 1000).toFixed(2)} m`, 70)}
      {lab(M, M + 150, `Mái ${pan.n} khổ × ${s.roll} mm (chồng mí ${AW_SEAM} mm) · lề may ${AW_HEM} mm · cần ~${pan.fabricM} m bạt · in ${sh.dpi}dpi`, 46)}
      {/* MÁI */}
      <g id="In">
        <g transform={`translate(${x0} ${yC})`}>{canopyNode(c, B)}</g>
        <g transform={`translate(${x0} ${yV})`}>{valanceNode(c, B)}</g>
        {g.side !== 'none' && (
          <>
            <g transform={`translate(${x0} ${yS})`}>{sideNode(c, B * 0.5)}</g>
            <g transform={`translate(${x0 + g.proj + 2 * B + GAP + g.proj} ${yS}) scale(-1 1)`}>{sideNode(c, B * 0.5)}</g>
          </>
        )}
      </g>
      <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth={2}>
        <rect x={x0 - B} y={yC - B} width={g.W + 2 * B} height={g.L + 2 * B} />
        <path transform={`translate(${x0} ${yV})`} d={valancePath(g.W, g.valH, s.edge, g.scD, B, B, 0)} />
        {g.side !== 'none' && (
          <>
            <path transform={`translate(${x0} ${yS})`} d={sidePath(g, B * 0.5)} />
            <path transform={`translate(${x0 + g.proj + 2 * B + GAP + g.proj} ${yS}) scale(-1 1)`} d={sidePath(g, B * 0.5)} />
          </>
        )}
      </g>
      <g id="Fold" fill="none" stroke="#0EA5E9" strokeWidth={2} strokeDasharray="20 12">
        <rect x={x0} y={yC} width={g.W} height={g.L} />
        <line x1={x0} y1={yV} x2={x0 + g.W} y2={yV} />
      </g>
      <g id="Seam" fill="none" stroke="#16A34A" strokeWidth={3} strokeDasharray="40 16">
        {seams.map((sx, i) => <line key={i} x1={x0 + sx} y1={yC - B} x2={x0 + sx} y2={yC + g.L + B} />)}
      </g>
      {lab(x0, yC - B - 18, `[1] MÁI (mặt trên) — mép trên may vào ống cuốn/thanh tường, mép dưới luồn thanh trước · ${g.W} × ${Math.round(g.L)} mm`)}
      {seams.map((sx, i) => lab(x0 + sx + 14, yC + 60, `may nối ${i + 1}|${i + 2}`, 36))}
      {lab(x0, yV - B - 18, `[2] DIỀM trước — cắt theo mép ${AW_EDGES.find((e) => e.id === s.edge)?.name.toLowerCase()}, may dưới thanh trước · ${g.W} × ${g.valH} mm`)}
      {g.side !== 'none' && lab(x0, yS - B - 18, `[3] HÔNG trái + phải (đối xứng) · ${g.proj} × ${Math.round(g.drop)} mm`)}
      {lab(M, sh.h - M / 2, 'Chú thích: hồng = đường cắt · xanh dương = nếp gấp lề may · xanh lá = đường may nối khổ vải. Vải sọc: canh sọc trùng đường nối.', 36)}
    </svg>
  );
}
