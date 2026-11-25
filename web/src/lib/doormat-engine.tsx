'use client';
// Thảm chùi chân in logo: 1 engine SVG = BỐ CỤC × BẢNG MÀU × FONT × CHẤT LIỆU (nỉ đế cao su in kỹ thuật số đủ màu /
// cao su đúc logo 1 màu nổi / xơ dừa in 1 màu mực tối) × KHỔ (40×60, 60×90, 90×150, tuỳ chỉnh) → render code 100%.
// Đơn vị vẽ: 1 = 1mm. Vùng in = thảm trừ viền cao su (25mm; xơ dừa 20mm). Chữ đo bằng font thật (canvas), xếp theo
// khung chữ THẬT của từng dòng (gồm dấu tiếng Việt chồng) → không đè nhau, không lòi khỏi vùng in.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ ----------
export type DmSizeId = '40x60' | '60x90' | '90x150' | 'custom';
export const DM_SIZES: { id: DmSizeId; name: string; wMm: number; hMm: number }[] = [
  { id: '40x60', name: '40 × 60 cm', wMm: 600, hMm: 400 },
  { id: '60x90', name: '60 × 90 cm', wMm: 900, hMm: 600 },
  { id: '90x150', name: '90 × 150 cm', wMm: 1500, hMm: 900 },
  { id: 'custom', name: 'Tuỳ chỉnh', wMm: 800, hMm: 500 },
];
export const DM_BLEED_MM = 5; // phần in lấn dưới viền cao su (xưởng ép viền đè lên)

// ---------- chất liệu ----------
export type DmMaterial = 'felt' | 'rubber' | 'coir';
export const DM_MATERIALS: { id: DmMaterial; name: string; note: string; border: number; order: string }[] = [
  { id: 'felt', name: 'Nỉ đế cao su in kỹ thuật số', note: 'Mặt nỉ nylon, in đủ màu, viền cao su đen — phổ biến nhất', border: 25, order: 'Thảm nỉ đế cao su' },
  { id: 'rubber', name: 'Cao su đúc logo 1 màu', note: 'Logo + chữ đúc nổi 1 màu trên nền cao su — bền, chịu mưa', border: 25, order: 'Thảm cao su in logo 60×90' },
  { id: 'coir', name: 'Xơ dừa in 1 màu', note: 'Sợi xơ dừa thô, chỉ in được mực tối (đen, nâu, đỏ đô, xanh rêu)', border: 20, order: 'Thảm xơ dừa in 1 màu' },
];
export const dmMaterial = (id: string) => DM_MATERIALS.find((m) => m.id === id) || DM_MATERIALS[0];

// nền cao su (đúc) + mực 1 màu
export const DM_RUBBER_BASES = [
  { id: 'black', name: 'Đen', hex: '#232427' },
  { id: 'grey', name: 'Xám than', hex: '#4A4E55' },
  { id: 'brown', name: 'Nâu', hex: '#4E3527' },
  { id: 'red', name: 'Đỏ đô', hex: '#6E1F22' },
];
export const DM_RUBBER_INKS = [
  { id: 'grey', name: 'Xám bạc', hex: '#A9AEB6' },
  { id: 'yellow', name: 'Vàng', hex: '#E9B53A' },
  { id: 'red', name: 'Đỏ', hex: '#C8342C' },
  { id: 'white', name: 'Trắng ngà', hex: '#EDE7DA' },
  { id: 'blue', name: 'Xanh dương', hex: '#3F78C4' },
];
export const DM_COIR_INKS = [
  { id: 'black', name: 'Đen', hex: '#1E1A17' },
  { id: 'brown', name: 'Nâu sẫm', hex: '#3A2214' },
  { id: 'wine', name: 'Đỏ đô', hex: '#5E1418' },
  { id: 'green', name: 'Xanh rêu', hex: '#23361F' },
];
export const DM_COIR_BG = '#B98552';

// ---------- ngành + chữ mẫu ----------
export type DmPurpose = 'shop' | 'office' | 'hotel' | 'restaurant' | 'spa' | 'home';
export const DM_PURPOSES: { id: DmPurpose; name: string }[] = [
  { id: 'shop', name: 'Cửa hàng' },
  { id: 'office', name: 'Văn phòng' },
  { id: 'hotel', name: 'Khách sạn' },
  { id: 'restaurant', name: 'Nhà hàng' },
  { id: 'spa', name: 'Spa · salon' },
  { id: 'home', name: 'Nhà riêng' },
];
export type DmData = Record<string, string>;
export const DM_SAMPLES: Record<DmPurpose, DmData> = {
  shop: { welcome: 'WELCOME', brand: 'AN KHANG STORE', tagline: 'Thời trang · Phụ kiện', hours: 'Mở cửa 8:00 – 22:00', note: 'Cảm ơn quý khách', wifi: 'Wifi: AnKhang · 12345678' },
  office: { welcome: 'XIN CHÀO', brand: 'CÔNG TY TNHH AN KHANG', tagline: 'Tầng 5 · 12 Nguyễn Huệ, Q.1', hours: 'Thứ 2 – Thứ 7 · 8:00 – 17:30', note: 'Vui lòng giữ trật tự', wifi: 'Wifi: AnKhang-Guest · ankhang2026' },
  hotel: { welcome: 'Chào mừng quý khách', brand: 'THU HÀ HOTEL', tagline: 'Boutique · Đà Lạt', hours: 'Lễ tân 24/7', note: 'Chúc quý khách kỳ nghỉ vui vẻ', wifi: 'Wifi: ThuHa-Hotel · welcome88' },
  restaurant: { welcome: 'WELCOME', brand: 'BẾP AN KHANG', tagline: 'Món Việt nhà làm', hours: '10:00 – 22:00 mỗi ngày', note: 'Đặt bàn: 0909 123 456', wifi: 'Wifi: BepAnKhang · ngonnhanha' },
  spa: { welcome: 'Vui lòng cởi giày', brand: 'THU HÀ SPA', tagline: 'Thư giãn · Chăm sóc da', hours: '9:00 – 21:00', note: 'Cảm ơn quý khách', wifi: 'Wifi: ThuHa-Spa · thugian123' },
  home: { welcome: 'Chào mừng về nhà', brand: 'Nhà Quốc Bảo', tagline: 'Bình an · Hạnh phúc', hours: '', note: 'Vui lòng cởi giày', wifi: '' },
};
export const DM_FIELDS: { key: string; label: string; ph?: string; half?: boolean }[] = [
  { key: 'welcome', label: 'Lời chào lớn (WELCOME / XIN CHÀO / Vui lòng cởi giày…)' },
  { key: 'brand', label: 'Tên shop / công ty / gia đình' },
  { key: 'tagline', label: 'Dòng phụ', half: true },
  { key: 'hours', label: 'Giờ mở cửa', half: true },
  { key: 'note', label: 'Lời nhắn', half: true },
  { key: 'wifi', label: 'Wifi', half: true },
];

// ---------- màu (nỉ in đủ màu) ----------
export interface DmPalette { id: string; name: string; bg: string; ink: string; accent: string; soft: string }
export const DM_PALETTES: DmPalette[] = [
  { id: 'noir', name: 'Đen ánh vàng', bg: '#1C1C1E', ink: '#F4EBD9', accent: '#D4A84A', soft: '#2C2B2D' },
  { id: 'navy', name: 'Navy', bg: '#1E2F52', ink: '#FFFFFF', accent: '#E8B94A', soft: '#26396A' },
  { id: 'wine', name: 'Đỏ đô', bg: '#6B1D24', ink: '#FBEFDC', accent: '#E3B45C', soft: '#7C2830' },
  { id: 'moss', name: 'Xanh rêu', bg: '#2F4A33', ink: '#F3EEDD', accent: '#D8B46A', soft: '#3A5A3E' },
  { id: 'cream', name: 'Kem nâu', bg: '#EFE4D0', ink: '#3B2618', accent: '#9A5B2E', soft: '#E2D2B6' },
  { id: 'grey', name: 'Xám cam', bg: '#3A3D44', ink: '#F5F5F2', accent: '#F28C38', soft: '#464A52' },
  { id: 'blush', name: 'Hồng pastel', bg: '#F4DCD6', ink: '#5A2E2E', accent: '#C2606A', soft: '#EBC9C1' },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0F5C59', ink: '#F2FAF7', accent: '#F2C35B', soft: '#156B67' },
];
export const dmPalette = (id: string) => DM_PALETTES.find((p) => p.id === id) || DM_PALETTES[0];

// ---------- font ----------
export interface DmFont { id: string; name: string; family: string; weight: number }
export const DM_FONTS: DmFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'oswald', name: 'Oswald (cao)', family: 'Oswald', weight: 700 },
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800 },
  { id: 'baloo', name: 'Baloo (tròn)', family: 'Baloo 2', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const dmFont = (id: string) => DM_FONTS.find((f) => f.id === id) || DM_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
export const DM_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Playfair+Display:wght@800&family=Baloo+2:wght@800&family=Great+Vibes&display=swap');`;

export function useDmFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-dm-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-dm-fonts'; link.rel = 'stylesheet';
        link.href = DM_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = ['800 40px "Montserrat"', '700 40px "Oswald"', '800 40px "Playfair Display"', '800 40px "Baloo 2"', '800 40px "Be Vietnam Pro"', '600 40px "Be Vietnam Pro"', '400 40px "Great Vibes"'];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Ầ Ộ Aa 0123 ·–')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec + mẫu ----------
export type DmLayout = 'classic' | 'logo' | 'stripe' | 'pattern' | 'home' | 'notice';
export const DM_LAYOUTS: { id: DmLayout; name: string }[] = [
  { id: 'classic', name: 'Khung cổ điển' },
  { id: 'logo', name: 'Logo + chữ' },
  { id: 'stripe', name: 'Dải màu' },
  { id: 'pattern', name: 'Hoạ tiết + nhãn' },
  { id: 'home', name: 'Chữ viết tay (nhà riêng)' },
  { id: 'notice', name: 'Lời nhắn + biểu tượng' },
];
export type DmPattern = 'dots' | 'diag' | 'check' | 'leaf';
export interface DmSpec {
  size: DmSizeId; wCm: number; hCm: number;
  material: DmMaterial; layout: DmLayout; palette: string; font: string;
  purpose: DmPurpose; rubberBase: string; rubberInk: string; coirInk: string; pattern: DmPattern;
}
export interface DmTemplate { id: string; name: string; spec: Partial<DmSpec> & { layout: DmLayout; purpose: DmPurpose } }
export const DM_TEMPLATES: DmTemplate[] = [
  { id: 'shop-classic', name: 'Cửa hàng · khung vàng', spec: { material: 'felt', layout: 'classic', palette: 'noir', font: 'playfair', purpose: 'shop' } },
  { id: 'shop-logo', name: 'Cửa hàng · logo', spec: { material: 'felt', layout: 'logo', palette: 'navy', font: 'montserrat', purpose: 'shop' } },
  { id: 'office-stripe', name: 'Văn phòng · dải màu', spec: { material: 'felt', layout: 'stripe', palette: 'navy', font: 'bvp', purpose: 'office' } },
  { id: 'hotel-classic', name: 'Khách sạn · đỏ đô', spec: { material: 'felt', layout: 'classic', palette: 'wine', font: 'playfair', purpose: 'hotel' } },
  { id: 'rest-pattern', name: 'Nhà hàng · hoạ tiết', spec: { material: 'felt', layout: 'pattern', palette: 'cream', font: 'baloo', purpose: 'restaurant', pattern: 'check' } },
  { id: 'spa-notice', name: 'Spa · cởi giày', spec: { material: 'felt', layout: 'notice', palette: 'moss', font: 'bvp', purpose: 'spa' } },
  { id: 'home-script', name: 'Nhà riêng · viết tay', spec: { material: 'felt', layout: 'home', palette: 'blush', font: 'playfair', purpose: 'home' } },
  { id: 'cafe-stripe', name: 'Quán · xanh ngọc', spec: { material: 'felt', layout: 'stripe', palette: 'teal', font: 'oswald', purpose: 'restaurant' } },
  { id: 'rubber-logo', name: 'Cao su đúc · logo', spec: { material: 'rubber', layout: 'logo', palette: 'noir', font: 'montserrat', purpose: 'office', rubberBase: 'black', rubberInk: 'grey' } },
  { id: 'rubber-classic', name: 'Cao su đúc · WELCOME', spec: { material: 'rubber', layout: 'classic', palette: 'noir', font: 'oswald', purpose: 'shop', rubberBase: 'grey', rubberInk: 'yellow' } },
  { id: 'coir-home', name: 'Xơ dừa · nhà riêng', spec: { material: 'coir', layout: 'home', palette: 'cream', font: 'playfair', purpose: 'home', coirInk: 'black' } },
  { id: 'coir-pattern', name: 'Xơ dừa · hoạ tiết lá', spec: { material: 'coir', layout: 'pattern', palette: 'cream', font: 'montserrat', purpose: 'shop', coirInk: 'brown', pattern: 'leaf' } },
];
export const defaultDmSpec = (): DmSpec => ({
  size: '60x90', wCm: 80, hCm: 50, material: 'felt', layout: 'classic', palette: 'noir', font: 'playfair', purpose: 'shop',
  rubberBase: 'black', rubberInk: 'grey', coirInk: 'black', pattern: 'dots',
});
export const applyTpl = (s: DmSpec, t: DmTemplate): DmSpec => ({ ...s, ...t.spec });

/** khổ thảm thật (mm) — luôn ngang (rộng ≥ sâu) */
export function dmDims(spec: DmSpec): { W: number; H: number; B: number; pW: number; pH: number } {
  let W: number, H: number;
  if (spec.size === 'custom') {
    W = Math.round(Math.min(2000, Math.max(300, (spec.wCm || 80) * 10)));
    H = Math.round(Math.min(1500, Math.max(300, (spec.hCm || 50) * 10)));
  } else { const s = DM_SIZES.find((x) => x.id === spec.size) || DM_SIZES[1]; W = s.wMm; H = s.hMm; }
  const B = dmMaterial(spec.material).border;
  return { W, H, B, pW: W - B * 2, pH: H - B * 2 };
}

// ---------- đo chữ ----------
interface M { w: number; asc: number; desc: number } // ở 100px
let mctx: CanvasRenderingContext2D | null = null;
const mcache = new Map<string, M>();
export function measure(text: string, family: string, weight: number): M {
  const key = `${weight}|${family}|${text}`;
  const hit = mcache.get(key); if (hit) return hit;
  let r: M = { w: text.length * 58, asc: 78, desc: 22 };
  if (typeof document !== 'undefined') {
    mctx ??= document.createElement('canvas').getContext('2d');
    if (mctx) {
      mctx.font = `${weight} 100px "${family}"`;
      const t = mctx.measureText(text || ' ');
      r = { w: t.width, asc: Math.max(70, t.actualBoundingBoxAscent || 72), desc: Math.max(4, t.actualBoundingBoxDescent || 18) };
    }
  }
  if (mcache.size > 4000) mcache.clear();
  mcache.set(key, r);
  return r;
}
const f1 = (n: number) => Math.round(n * 10) / 10;
/** chữ "đục" trên mảng mực ở bản 1 màu = không in mực (giấy/cao su nền lộ ra) */
export const NOINK = '#FFFFFF';

interface LineIn { text: string; family: string; weight: number; maxS: number; minS?: number; fill: string; role: string; ls?: number; wrap?: boolean; upper?: boolean }
interface LineOut { text: string; family: string; weight: number; s: number; fill: string; role: string; ls: number; asc: number; desc: number; w: number }
const lsW = (t: string, s: number, ls: number) => ls * s * Math.max(0, t.length - 1);
const FLOOR = 16; // chữ chính trên thảm không nhỏ hơn 16mm

/** chia n dòng cân bằng theo bề rộng (thử mọi điểm ngắt giữa các từ) */
function splitN(t: string, n: number, family: string, weight: number): string[] | null {
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < n) return null;
  const wOf = (a: number, b: number) => measure(words.slice(a, b).join(' '), family, weight).w;
  let best: number[] | null = null, bw = Infinity;
  const rec = (start: number, k: number, cuts: number[]) => {
    if (k === 1) { const cs = [...cuts, words.length]; let mx = 0, p = start === 0 ? 0 : 0; p = 0; for (const c of cs) { mx = Math.max(mx, wOf(p, c)); p = c; } if (mx < bw) { bw = mx; best = cs; } return; }
    for (let i = start + 1; i <= words.length - k + 1; i++) rec(i, k - 1, [...cuts, i]);
  };
  rec(0, n, []);
  if (!best) return null;
  const out: string[] = []; let p = 0;
  for (const c of best as number[]) { out.push(words.slice(p, c).join(' ')); p = c; }
  return out;
}
/** xếp chồng các dòng trong khung w×h: cỡ chữ lớn nhất ≤ maxS vừa bề ngang; tổng cao vượt h thì thu nhỏ đều */
function stack(lines: LineIn[], w: number, h: number, gapK = 0.3): { out: LineOut[]; total: number } {
  const expanded: LineIn[] = [];
  const fitW = (t: string, ln: LineIn) => w / (measure(t, ln.family, ln.weight).w / 100 + (ln.ls || 0) * Math.max(0, t.length - 1));
  for (const ln of lines) {
    const t = (ln.upper ? ln.text.toUpperCase() : ln.text).trim();
    if (!t) continue;
    const s1 = Math.min(ln.maxS, fitW(t, ln));
    // dòng chính: quá nhỏ thì bẻ 2–3 dòng cân bằng (dòng phụ có sàn riêng → rút gọn "…" ở dưới)
    const want = Math.min(ln.maxS * 0.62, FLOOR * 1.25);
    if (!ln.minS && (ln.wrap || s1 < FLOOR) && s1 < want) {
      let best: string[] = [t], bestS = s1;
      for (const n of [2, 3]) {
        const parts = splitN(t, n, ln.family, ln.weight);
        if (!parts) break;
        const sN = Math.min(ln.maxS * (n === 2 ? 0.8 : 0.66), ...parts.map((x) => fitW(x, ln)));
        if (sN > bestS * 1.15) { best = parts; bestS = sN; }
        if (bestS >= want) break;
      }
      if (best.length > 1) { best.forEach((x) => expanded.push({ ...ln, text: x, upper: false, maxS: bestS })); continue; }
    }
    expanded.push({ ...ln, text: t, upper: false, maxS: s1 });
  }
  const out: LineOut[] = expanded.map((ln) => {
    const m = measure(ln.text, ln.family, ln.weight);
    const ls = ln.ls || 0;
    return { text: ln.text, family: ln.family, weight: ln.weight, s: ln.maxS, fill: ln.fill, role: ln.role, ls, asc: m.asc / 100, desc: m.desc / 100, w: m.w / 100 };
  });
  const tot = (arr: LineOut[] = out) => arr.reduce((a, l, i) => a + l.s * (l.asc + l.desc) + (i ? gapK * Math.min(l.s, arr[i - 1].s) : 0), 0);
  const floorOf = (i: number) => expanded[i].minS ?? FLOOR;
  const capOf = (l: LineOut) => w / (l.w + l.ls * Math.max(0, l.text.length - 1)); // cỡ lớn nhất còn vừa bề ngang
  let total = tot();
  if (total > h && total > 0) { const k = h / total; out.forEach((l) => { l.s *= k; }); total = tot(); }
  // chữ phụ không nhỏ hơn sàn: nâng lại về sàn, quá rộng thì rút gọn "…"
  for (let i = 0; i < out.length; i++) {
    const l = out[i], mn = expanded[i].minS;
    if (!mn || l.s >= mn) continue;
    l.s = mn;
    if (l.w * mn + lsW(l.text, mn, l.ls) <= w) continue;
    const words = l.text.split(/\s+/);
    while (words.length > 1) {
      words.pop();
      const t2 = words.join(' ').replace(/[·,–-]$/, '').trim() + '…';
      const m2 = measure(t2, l.family, l.weight);
      if ((m2.w / 100) * mn + lsW(t2, mn, l.ls) <= w) { l.text = t2; l.w = m2.w / 100; l.asc = m2.asc / 100; l.desc = m2.desc / 100; break; }
    }
  }
  // vẫn cao quá: thu nhỏ dòng chính (không có sàn riêng) nhưng không dưới FLOOR; còn tràn thì bỏ bớt dòng phụ từ dưới lên
  total = tot();
  if (total > h) {
    const flex = out.map((_, i) => !expanded[i].minS);
    const fixedH = tot(out.map((l, i) => (flex[i] ? { ...l, s: 0 } : l)));
    const flexH = total - fixedH;
    if (flexH > 0) { const k = Math.max(0, (h - fixedH) / flexH); out.forEach((l, i) => { if (flex[i]) l.s = Math.min(capOf(l), Math.max(FLOOR, l.s * k)); }); }
    total = tot();
    for (let i = out.length - 1; i >= 0 && total > h; i--) {
      if (!expanded[i].minS) continue;
      out.splice(i, 1); expanded.splice(i, 1); total = tot();
    }
    if (total > h) { const k = h / total; out.forEach((l, i) => { l.s = Math.min(capOf(l), Math.max(floorOf(i) * 0.9, l.s * k)); }); total = tot(); }
  }
  return { out, total };
}

/** vẽ chồng dòng: căn giữa theo cx (hoặc trái tại x), đỉnh khối = y (hoặc căn giữa trong [y, y+h]) */
function Stack({ lines, x, y, w, h, align = 'middle', valign = 'middle', gapK = 0.3 }: {
  lines: LineIn[]; x: number; y: number; w: number; h: number; align?: 'start' | 'middle'; valign?: 'top' | 'middle'; gapK?: number;
}) {
  const { out, total } = stack(lines, w, h, gapK);
  let yy = valign === 'middle' ? y + (h - total) / 2 : y;
  const ax = align === 'middle' ? x + w / 2 : x;
  return (
    <>
      {out.map((l, i) => {
        if (i) yy += gapK * Math.min(l.s, out[i - 1].s);
        const base = yy + l.asc * l.s;
        yy = base + l.desc * l.s;
        return (
          <text key={i} x={f1(ax)} y={f1(base)} textAnchor={align} fontFamily={`'${l.family}'`} fontWeight={l.weight} fontSize={f1(l.s)}
            letterSpacing={l.ls ? f1(l.ls * l.s) : undefined} fill={l.fill} data-role={l.role}
            data-asc={f1(l.asc * l.s)} data-desc={f1(l.desc * l.s)}>{l.text}</text>
        );
      })}
    </>
  );
}

// ---------- hình vẽ code (ô 100×100) ----------
type IconKind = 'shoe' | 'leaf';
function Icon({ kind, x, y, s, c }: { kind: IconKind; x: number; y: number; s: number; c: string }) {
  const tr = `translate(${f1(x - s / 2)} ${f1(y - s / 2)}) scale(${f1(s / 100 * 1000) / 1000})`;
  let el: ReactNode = null;
  switch (kind) {
    // giày thể thao 1 màu: thân + đế tách bằng khe (không dùng màu phụ → in được 1 màu)
    case 'shoe': el = <g fill={c}><path d="M8 70 L10 40 Q11 34 17 36 L31 42 Q37 44 41 38 L47 29 Q51 24 56 28 L62 36 Q73 50 90 56 Q97 59 97 66 V70 Z" /><path d="M5 75 H98 V79 Q98 84 93 84 H10 Q5 84 5 79 Z" /></g>; break;
    // cành lá 1 màu: cuống + 5 lá
    case 'leaf': el = <g fill={c}><path d="M49 96 C47 70 50 40 52 6" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" />
      {[[50, 10, 0], [43, 30, -38], [58, 42, 38], [42, 58, -42], [57, 72, 40]].map(([x, y, a], i) => <ellipse key={i} cx={x} cy={y} rx="7" ry="15" transform={`rotate(${a} ${x} ${y})`} />)}</g>; break;
  }
  return <g transform={tr} data-role="icon">{el}</g>;
}

function initials(brand: string) {
  const skip = new Set(['CÔNG', 'TY', 'TNHH', 'CP', 'NHÀ', 'HÀNG', 'QUÁN', 'BẾP', 'CỬA', 'THE']);
  const w = (brand || '').toUpperCase().split(/\s+/).filter((x) => x && !skip.has(x));
  const src = w.length ? w : (brand || 'M').toUpperCase().split(/\s+/).filter(Boolean);
  return src.slice(0, 2).map((x) => x[0]).join('') || 'A';
}

// ---------- hoạ tiết nền ----------
function Pattern({ kind, w, h, c, id }: { kind: DmPattern; w: number; h: number; c: string; id: string }) {
  const t = Math.max(40, Math.min(w, h) / 7);
  let cell: ReactNode;
  if (kind === 'dots') cell = <circle cx={t / 2} cy={t / 2} r={t * 0.12} fill={c} />;
  else if (kind === 'diag') cell = <path d={`M0 ${t} L${t} 0 M${-t / 4} ${t / 4} L${t / 4} ${-t / 4} M${t * 0.75} ${t * 1.25} L${t * 1.25} ${t * 0.75}`} stroke={c} strokeWidth={t * 0.1} />;
  else if (kind === 'check') cell = <><rect width={t / 2} height={t / 2} fill={c} /><rect x={t / 2} y={t / 2} width={t / 2} height={t / 2} fill={c} /></>;
  else cell = <path d={`M${t / 2} ${t * 0.14} C${t * 0.78} ${t * 0.3} ${t * 0.78} ${t * 0.62} ${t / 2} ${t * 0.86} C${t * 0.22} ${t * 0.62} ${t * 0.22} ${t * 0.3} ${t / 2} ${t * 0.14} Z`} fill={c} transform={`rotate(25 ${t / 2} ${t / 2})`} />;
  return (
    <>
      <defs><pattern id={id} width={t} height={t} patternUnits="userSpaceOnUse">{cell}</pattern></defs>
      <rect width={w} height={h} fill={`url(#${id})`} data-role="pattern" />
    </>
  );
}

// ---------- màu theo chất liệu ----------
export interface DmCols { bg: string | null; ink: string; accent: string; soft: string; one: boolean; light: boolean }
function hexL(hex: string) { const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
export function dmInk(spec: DmSpec): string {
  if (spec.material === 'rubber') return (DM_RUBBER_INKS.find((x) => x.id === spec.rubberInk) || DM_RUBBER_INKS[0]).hex;
  return (DM_COIR_INKS.find((x) => x.id === spec.coirInk) || DM_COIR_INKS[0]).hex;
}
export function dmRubberBase(spec: DmSpec): string { return (DM_RUBBER_BASES.find((x) => x.id === spec.rubberBase) || DM_RUBBER_BASES[0]).hex; }
export type DmMode = 'preview' | 'print' | 'tex' | 'mask';
function colsOf(spec: DmSpec, mode: DmMode): DmCols {
  if (spec.material === 'felt') {
    const p = dmPalette(spec.palette);
    return { bg: p.bg, ink: p.ink, accent: p.accent, soft: p.soft, one: false, light: hexL(p.bg) > 0.6 };
  }
  if (mode === 'mask') return { bg: '#000000', ink: '#FFFFFF', accent: '#FFFFFF', soft: '#FFFFFF', one: true, light: false };
  const ink = spec.material === 'rubber' && mode === 'print' ? '#000000' : dmInk(spec); // khuôn đúc: đen = phần nổi
  // print: không in nền (khuôn/ mực 1 màu); tex xơ dừa: nền trắng để nhân (multiply) lên vân xơ dừa trong 3D
  const bg = mode === 'print' ? null
    : mode === 'tex' ? (spec.material === 'rubber' ? dmRubberBase(spec) : '#FFFFFF')
    : spec.material === 'rubber' ? dmRubberBase(spec) : DM_COIR_BG;
  return { bg, ink, accent: ink, soft: ink, one: true, light: spec.material === 'coir' };
}

// ---------- vẽ nội dung vùng in (toạ độ vùng in: 0..pW × 0..pH) ----------
function Content({ spec, data, logo, logoMask, mode, pW, pH }: {
  spec: DmSpec; data: DmData; logo?: string; logoMask?: { href: string; w: number; h: number } | null; mode: DmMode; pW: number; pH: number;
}) {
  const uid = useId().replace(/:/g, '');
  const c = colsOf(spec, mode);
  const f = dmFont(spec.font);
  const pad = Math.min(pW, pH) * 0.075;
  const iW = pW - pad * 2, iH = pH - pad * 2;
  const minS = Math.max(14, Math.min(pW, pH) * 0.035); // chữ phụ ≥ 14mm (nhìn từ trên xuống vẫn đọc được)
  const big = Math.min(pH * 0.3, 260);
  const D = data;
  const emblem = (cx: number, cy: number, s: number) => {
    const r = s / 2;
    if (logo || logoMask) {
      if (c.one && logoMask) {
        const k = Math.min(s / logoMask.w, s / logoMask.h);
        const w = logoMask.w * k, h = logoMask.h * k;
        return (
          <g data-role="logo">
            <defs><mask id={`lm${uid}`} maskUnits="userSpaceOnUse" x={cx - w / 2} y={cy - h / 2} width={w} height={h}><image href={logoMask.href} x={cx - w / 2} y={cy - h / 2} width={w} height={h} preserveAspectRatio="xMidYMid meet" /></mask></defs>
            <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill={c.accent} mask={`url(#lm${uid})`} />
          </g>
        );
      }
      if (!c.one && logo) return <image data-role="logo" href={logo} x={cx - r} y={cy - r} width={s} height={s} preserveAspectRatio="xMidYMid meet" />;
    }
    const ini = initials(D.brand);
    const m = measure(ini, f.family, f.weight);
    const ts = Math.min(s * 0.42, (s * 0.62) / (m.w / 100));
    return (
      <g data-role="emblem">
        <circle cx={cx} cy={cy} r={r - s * 0.04} fill="none" stroke={c.accent} strokeWidth={s * 0.06} />
        <circle cx={cx} cy={cy} r={r - s * 0.13} fill="none" stroke={c.accent} strokeWidth={s * 0.018} />
        <text x={f1(cx)} y={f1(cy + (m.asc - m.desc) / 200 * ts)} textAnchor="middle" fontFamily={`'${f.family}'`} fontWeight={f.weight} fontSize={f1(ts)} fill={c.accent}
          data-role="initials" data-asc={f1(m.asc / 100 * ts)} data-desc={f1(m.desc / 100 * ts)}>{ini}</text>
      </g>
    );
  };
  const small = (k: string, fill = c.ink, mx = minS * 1.5): LineIn => ({ text: D[k] || '', family: BODY, weight: 600, maxS: mx, minS, fill, role: k });
  const info = [D.hours, D.wifi].filter(Boolean).join('   ·   ');
  let body: ReactNode;

  if (spec.layout === 'classic') {
    const fr = pad * 0.45;
    body = (
      <>
        <rect x={fr} y={fr} width={pW - fr * 2} height={pH - fr * 2} rx={pad * 0.35} fill="none" stroke={c.accent} strokeWidth={Math.max(6, pad * 0.12)} data-role="frame" />
        <rect x={fr * 1.7} y={fr * 1.7} width={pW - fr * 3.4} height={pH - fr * 3.4} rx={pad * 0.25} fill="none" stroke={c.accent} strokeWidth={Math.max(3, pad * 0.04)} />
        <Stack x={pad * 1.25} y={pad * 1.2} w={pW - pad * 2.5} h={pH - pad * 2.4} lines={[
          { text: D.welcome || '', family: f.family, weight: f.weight, maxS: big, fill: c.accent, role: 'welcome', ls: 0.06, wrap: true },
          { text: D.brand || '', family: f.family, weight: f.weight, maxS: big * 0.42, fill: c.ink, role: 'brand', ls: 0.04, wrap: true },
          small('tagline'),
          { text: info || D.note || '', family: BODY, weight: 600, maxS: minS * 1.35, minS, fill: c.ink, role: 'info' },
        ]} gapK={0.55} />
      </>
    );
  } else if (spec.layout === 'logo') {
    const es = Math.min(iH * 0.82, iW * 0.36);
    const tx = pad + es + pad * 0.8;
    body = (
      <>
        {emblem(pad + es / 2, pH / 2, es)}
        <line x1={tx - pad * 0.4} y1={pH / 2 - es * 0.42} x2={tx - pad * 0.4} y2={pH / 2 + es * 0.42} stroke={c.accent} strokeWidth={Math.max(4, pad * 0.06)} />
        <Stack x={tx} y={pad} w={pW - tx - pad} h={iH} align="start" lines={[
          { text: D.welcome || '', family: BODY, weight: 800, maxS: big * 0.36, fill: c.accent, role: 'welcome', ls: 0.12, upper: true },
          { text: D.brand || '', family: f.family, weight: f.weight, maxS: big * 0.6, fill: c.ink, role: 'brand', wrap: true },
          small('tagline'),
          { text: D.hours || '', family: BODY, weight: 600, maxS: minS * 1.3, minS, fill: c.ink, role: 'hours' },
        ]} gapK={0.5} />
      </>
    );
  } else if (spec.layout === 'stripe') {
    const bh = pH * 0.22;
    const onBand = c.one ? (c.bg ?? NOINK) : (hexL(c.accent) > 0.6 ? '#1E1E1E' : '#FFFFFF');
    body = (
      <>
        <rect x={0} y={0} width={pW} height={bh} fill={c.accent} data-role="band" />
        <rect x={0} y={pH - bh * 0.62} width={pW} height={bh * 0.62} fill={c.accent} data-role="band" />
        <Stack x={pad} y={bh * 0.14} w={iW} h={bh * 0.72} lines={[{ text: D.welcome || '', family: f.family, weight: f.weight, maxS: bh * 0.7, fill: onBand, role: 'welcome', ls: 0.08, upper: true }]} />
        <Stack x={pad} y={pH - bh * 0.62 + bh * 0.12} w={iW} h={bh * 0.38} lines={[{ text: info || D.note || '', family: BODY, weight: 600, maxS: minS * 1.4, minS, fill: onBand, role: 'info' }]} />
        <Stack x={pad} y={bh + pad * 0.5} w={iW} h={pH - bh * 1.62 - pad} lines={[
          { text: D.brand || '', family: f.family, weight: f.weight, maxS: big * 0.62, fill: c.ink, role: 'brand', wrap: true },
          small('tagline'),
        ]} gapK={0.5} />
      </>
    );
  } else if (spec.layout === 'pattern') {
    const lw = Math.min(iW * 0.78, pW - pad * 2), lh = Math.min(iH * 0.66, pH - pad * 2);
    const lx = (pW - lw) / 2, ly = (pH - lh) / 2;
    const gap = Math.max(10, lh * 0.05);
    body = (
      <>
        <defs><mask id={`ko${uid}`} maskUnits="userSpaceOnUse" x={-20} y={-20} width={pW + 40} height={pH + 40}>
          <rect x={-20} y={-20} width={pW + 40} height={pH + 40} fill="#FFFFFF" />
          <rect x={lx - gap} y={ly - gap} width={lw + gap * 2} height={lh + gap * 2} rx={lh * 0.16} fill="#000000" />
        </mask></defs>
        <g mask={`url(#ko${uid})`}><Pattern kind={spec.pattern} w={pW} h={pH} c={c.one ? c.ink : c.soft} id={`pt${uid}`} /></g>
        <rect x={lx} y={ly} width={lw} height={lh} rx={lh * 0.14} fill={c.one ? 'none' : c.bg!} stroke={c.accent} strokeWidth={Math.max(6, lh * 0.03)} data-role="label" />
        <Stack x={lx + lh * 0.14} y={ly + lh * 0.1} w={lw - lh * 0.28} h={lh * 0.8} lines={[
          { text: D.welcome || '', family: BODY, weight: 800, maxS: lh * 0.16, fill: c.accent, role: 'welcome', ls: 0.14, upper: true },
          { text: D.brand || '', family: f.family, weight: f.weight, maxS: lh * 0.34, fill: c.ink, role: 'brand', wrap: true },
          { text: D.hours || D.tagline || '', family: BODY, weight: 600, maxS: Math.max(minS, lh * 0.09), minS, fill: c.ink, role: 'hours' },
        ]} gapK={0.48} />
      </>
    );
  } else if (spec.layout === 'home') {
    const ic = Math.min(iH * 0.32, iW * 0.14);
    body = (
      <>
        <Icon kind="leaf" x={pad + ic * 0.5} y={pH / 2} s={ic} c={c.accent} />
        <Icon kind="leaf" x={pW - pad - ic * 0.5} y={pH / 2} s={ic} c={c.accent} />
        <Stack x={pad + ic * 1.15} y={pad * 0.9} w={pW - pad * 2 - ic * 2.3} h={pH - pad * 1.8} lines={[
          { text: D.welcome || '', family: BODY, weight: 800, maxS: big * 0.2, fill: c.accent, role: 'welcome', ls: 0.16, upper: true },
          { text: D.brand || '', family: SCRIPT, weight: 400, maxS: big * 1.0, fill: c.ink, role: 'brand', wrap: (D.brand || '').length > 20 },
          { text: D.tagline || '', family: BODY, weight: 600, maxS: minS * 1.4, minS, fill: c.ink, role: 'tagline', ls: 0.1 },
          { text: D.note || '', family: BODY, weight: 600, maxS: minS * 1.25, minS, fill: c.accent, role: 'note' },
        ]} gapK={0.42} />
      </>
    );
  } else { // notice
    const ic = Math.min(iH * 0.62, iW * 0.26);
    const tx = pad + ic + pad * 0.7;
    body = (
      <>
        <circle cx={pad + ic / 2} cy={pH * 0.46} r={ic / 2} fill={c.one ? 'none' : c.soft} stroke={c.accent} strokeWidth={Math.max(5, ic * 0.04)} />
        <Icon kind="shoe" x={pad + ic / 2} y={pH * 0.46} s={ic * 0.62} c={c.accent} />
        <Stack x={tx} y={pad} w={pW - tx - pad} h={iH * 0.8} align="start" lines={[
          { text: D.welcome || '', family: f.family, weight: f.weight, maxS: big * 0.42, fill: c.accent, role: 'welcome', wrap: true, upper: true },
          { text: D.brand || '', family: f.family, weight: f.weight, maxS: big * 0.3, fill: c.ink, role: 'brand', ls: 0.05, wrap: true },
          small('tagline'),
        ]} gapK={0.48} />
        <Stack x={pad} y={pH - pad - iH * 0.16} w={iW} h={iH * 0.16} lines={[{ text: info || D.note || '', family: BODY, weight: 600, maxS: minS * 1.3, minS, fill: c.ink, role: 'info' }]} />
      </>
    );
  }
  return (
    <>
      {c.bg ? <rect x={-DM_BLEED_MM} y={-DM_BLEED_MM} width={pW + DM_BLEED_MM * 2} height={pH + DM_BLEED_MM * 2} fill={c.bg} data-role="bg" /> : null}
      {body}
    </>
  );
}

export interface DmSvgProps {
  spec: DmSpec; data: DmData; logo?: string; logoMask?: { href: string; w: number; h: number } | null;
  mode?: DmMode; bleed?: boolean; style?: CSSProperties;
}
/** preview: cả tấm thảm (viền + vùng in, giả chất liệu). print/tex/mask: CHỈ vùng in (print có lề lấn viền). */
export function DoormatSvg({ spec, data, logo, logoMask, mode = 'preview', bleed = false, style }: DmSvgProps) {
  const uid = useId().replace(/:/g, '');
  const { W, H, B, pW, pH } = dmDims(spec);
  if (mode !== 'preview') {
    const b = mode === 'print' && bleed ? DM_BLEED_MM : 0;
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-b} ${-b} ${pW + b * 2} ${pH + b * 2}`} width={`${pW + b * 2}mm`} height={`${pH + b * 2}mm`} style={style} data-mat-mode={mode} data-pw={pW} data-ph={pH}>
        <clipPath id={`cl${uid}`}><rect x={-b} y={-b} width={pW + b * 2} height={pH + b * 2} /></clipPath>
        <g id="In" clipPath={`url(#cl${uid})`}><Content spec={spec} data={data} logo={logo} logoMask={logoMask} mode={mode} pW={pW} pH={pH} /></g>
      </svg>
    );
  }
  const r = Math.min(30, B * 1.2);
  const border = spec.material === 'rubber' ? dmRubberBase(spec) : spec.material === 'coir' ? '#2A2622' : '#1F1F21';
  const coir = spec.material === 'coir';
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} style={style} data-mat-mode="preview" data-pw={pW} data-ph={pH} data-b={B}>
      <defs>
        <filter id={`fz${uid}`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={coir ? 0.09 : 0.6} numOctaves={coir ? 3 : 2} seed={4} result="n" />
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.22 0" />
        </filter>
        <clipPath id={`pc${uid}`}><rect x={B} y={B} width={pW} height={pH} rx={Math.max(4, r - B)} /></clipPath>
      </defs>
      <rect x={0} y={0} width={W} height={H} rx={r} fill={border} data-role="border" />
      {spec.material === 'rubber' && <rect x={B * 0.35} y={B * 0.35} width={W - B * 0.7} height={H - B * 0.7} rx={r * 0.8} fill="none" stroke="#FFFFFF14" strokeWidth={3} />}
      <g clipPath={`url(#pc${uid})`}>
        <g transform={`translate(${B} ${B})`} data-role="print-area">
          <Content spec={spec} data={data} logo={logo} logoMask={logoMask} mode="preview" pW={pW} pH={pH} />
        </g>
        <rect x={B} y={B} width={pW} height={pH} filter={`url(#fz${uid})`} data-role="texture" pointerEvents="none" />
      </g>
    </svg>
  );
}
