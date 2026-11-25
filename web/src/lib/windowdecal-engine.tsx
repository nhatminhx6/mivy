'use client';
// Decal dán kính cửa hàng: 1 engine SVG (đơn vị mm, toạ độ = mặt kính thật W×H) = LOẠI DECAL × BỐ CỤC × MÀU × FONT.
// Render code 100%. Các khối nội dung (thương hiệu, giờ mở cửa, wifi, thanh toán, mở cửa, đẩy/kéo, dải cản va,
// khuyến mãi) được đặt theo CHIỀU CAO THẬT tính từ sàn (tầm mắt 1m5, tay nắm ~1m05…), chữ đo bằng canvas rồi co cho vừa.
// 3 loại decal:
//  - 'cut'   : decal cắt chữ (vinyl 1 màu, không nền) — file cắt chỉ có đường CutContour (chữ đã outline)
//  - 'print' : decal PP in màu, mỗi khối là 1 tấm bo góc (đường cắt bế), có tuỳ chọn in ngược "dán mặt trong"
//  - 'oneway': decal 1 chiều (lưới lỗ) phủ kín kính — tranh quảng cáo tràn kính, trong nhìn ra vẫn thấy
// 4 chế độ vẽ: 'preview' (kính + khung + decal), 'tex' (chỉ decal, nền trong suốt → texture 3D),
// 'print' (file in đúng khổ kính: lớp In/Vinyl + CutContour), 'thumb' (= preview, gọn).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

export type WDType = 'cut' | 'print' | 'oneway';
export type WDMode = 'preview' | 'tex' | 'print';
export type WDBlock = 'brand' | 'hours' | 'wifi' | 'payment' | 'open' | 'door' | 'band' | 'promo';

export const WD_TYPES: { id: WDType; name: string; note: string }[] = [
  { id: 'cut', name: 'Decal cắt chữ', note: 'Vinyl 1 màu, không nền — chữ nằm thẳng trên kính, sang & bền' },
  { id: 'print', name: 'Decal in PP', note: 'In màu từng tấm bo góc (giờ mở cửa, wifi QR, thanh toán…)' },
  { id: 'oneway', name: 'Decal 1 chiều', note: 'Lưới lỗ phủ kín kính: ngoài thấy tranh quảng cáo, trong vẫn nhìn ra' },
];

export const WD_BLOCKS: { id: WDBlock; name: string; types: WDType[] }[] = [
  { id: 'brand', name: 'Logo + tên shop', types: ['cut', 'print'] },
  { id: 'hours', name: 'Giờ mở cửa', types: ['cut', 'print'] },
  { id: 'wifi', name: 'Wifi', types: ['cut', 'print'] },
  { id: 'payment', name: 'Thanh toán', types: ['cut', 'print'] },
  { id: 'open', name: 'Mở cửa / Open', types: ['cut', 'print'] },
  { id: 'door', name: 'Đẩy / Kéo', types: ['cut', 'print'] },
  { id: 'band', name: 'Dải cản va (tầm mắt)', types: ['cut', 'print'] },
  { id: 'promo', name: 'Khuyến mãi', types: ['cut', 'print'] },
];

// ---------- kính ----------
export interface WDGlass { id: string; name: string; door: boolean; w: number; h: number }
export const WD_GLASS: WDGlass[] = [
  { id: 'door90', name: 'Cửa 1 cánh 90×200', door: true, w: 900, h: 2000 },
  { id: 'door100', name: 'Cửa 1 cánh 100×220', door: true, w: 1000, h: 2200 },
  { id: 'win120', name: 'Vách kính 120×200', door: false, w: 1200, h: 2000 },
  { id: 'win200', name: 'Mặt tiền 200×220', door: false, w: 2000, h: 2200 },
  { id: 'custom', name: 'Tự nhập khổ', door: true, w: 900, h: 2000 },
];
export const wdGlassPreset = (id: string) => WD_GLASS.find((g) => g.id === id) || WD_GLASS[0];

export interface WDGeom { W: number; H: number; door: boolean; bottom: number } // bottom = mép dưới kính cách sàn (mm)
export function wdGeom(spec: Pick<WDSpec, 'glass' | 'wCm' | 'hCm' | 'door'>): WDGeom {
  const p = wdGlassPreset(spec.glass);
  const custom = spec.glass === 'custom';
  const W = custom ? Math.max(500, Math.min(3000, Math.round((spec.wCm || 90) * 10))) : p.w;
  const H = custom ? Math.max(800, Math.min(3000, Math.round((spec.hCm || 200) * 10))) : p.h;
  const door = custom ? !!spec.door : p.door;
  return { W, H, door, bottom: door ? 100 : 150 };
}
// tay nắm cửa: thanh dọc gần mép phải, cao 0.75 → 1.35 m
export const handleOf = (g: WDGeom) => ({ x: g.W - 95, y0: g.H - (1350 - g.bottom), y1: g.H - (750 - g.bottom) });

// ---------- font ----------
export interface WDFont { id: string; name: string; family: string; weight: number }
export const WD_FONTS: WDFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'lobster', name: 'Lobster', family: 'Lobster', weight: 400 },
];
export const wdFont = (id: string) => WD_FONTS.find((f) => f.id === id) || WD_FONTS[0];
const BODY = 'Be Vietnam Pro';
// chỉ font có TTF ở /public/fonts → file cắt outline chữ được
export const WD_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Baloo+2:wght@800&family=Lobster&display=swap');`;

export function useWDFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-wd-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-wd-fonts'; link.rel = 'stylesheet';
        link.href = WD_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...WD_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦẨ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu ----------
// màu vinyl decal cắt (1 màu)
export interface WDVinyl { id: string; name: string; hex: string; gold?: boolean }
export const WD_VINYLS: WDVinyl[] = [
  { id: 'white', name: 'Trắng', hex: '#FFFFFF' },
  { id: 'gold', name: 'Vàng kim', hex: '#C9A24A', gold: true },
  { id: 'black', name: 'Đen', hex: '#1A1A1A' },
  { id: 'red', name: 'Đỏ', hex: '#C8102E' },
  { id: 'green', name: 'Xanh lá', hex: '#1E7B4B' },
];
export const wdVinyl = (id: string) => WD_VINYLS.find((v) => v.id === id) || WD_VINYLS[0];
// bảng màu decal in / 1 chiều
export interface WDPalette { id: string; name: string; bg: string; fg: string; acc: string; soft: string }
export const WD_PALETTES: WDPalette[] = [
  { id: 'navy', name: 'Navy · vàng', bg: '#1B2F55', fg: '#FFFFFF', acc: '#E3B341', soft: '#2C4472' },
  { id: 'coffee', name: 'Cà phê', bg: '#F4EBDD', fg: '#3B2416', acc: '#B0692E', soft: '#E6D5BC' },
  { id: 'mint', name: 'Trà sữa pastel', bg: '#FFF4EC', fg: '#4A2C2A', acc: '#E8789A', soft: '#CFEDE4' },
  { id: 'pharmacy', name: 'Xanh nhà thuốc', bg: '#FFFFFF', fg: '#0F5132', acc: '#1E9E5A', soft: '#E3F5EA' },
  { id: 'red', name: 'Đỏ ăn uống', bg: '#C8102E', fg: '#FFFFFF', acc: '#FFD23F', soft: '#A50D25' },
  { id: 'mono', name: 'Đen trắng', bg: '#151515', fg: '#FFFFFF', acc: '#F2C14E', soft: '#2A2A2A' },
];
export const wdPalette = (id: string) => WD_PALETTES.find((p) => p.id === id) || WD_PALETTES[0];

// ---------- spec + mẫu ----------
export interface WDSpec {
  type: WDType; vinyl: string; palette: string; font: string; arch: boolean; blocks: WDBlock[];
  glass: string; wCm: number; hCm: number; door: boolean; inside: boolean; oneStyle: 'sale' | 'brand';
}
export interface WDTemplate { id: string; name: string; spec: Omit<WDSpec, 'glass' | 'wCm' | 'hCm' | 'door' | 'inside'> }
const T = (id: string, name: string, type: WDType, vinyl: string, palette: string, font: string, arch: boolean, blocks: WDBlock[], oneStyle: 'sale' | 'brand' = 'sale'): WDTemplate =>
  ({ id, name, spec: { type, vinyl, palette, font, arch, blocks, oneStyle } });
export const WD_TEMPLATES: WDTemplate[] = [
  T('cafe-white', 'Quán cà phê · chữ trắng vòm', 'cut', 'white', 'coffee', 'playfair', true, ['brand', 'hours', 'wifi', 'door']),
  T('spa-gold', 'Spa · salon · vàng kim', 'cut', 'gold', 'navy', 'playfair', false, ['brand', 'hours', 'open', 'door']),
  T('min-black', 'Tối giản · chữ đen', 'cut', 'black', 'mono', 'montserrat', false, ['brand', 'hours', 'payment']),
  T('band-frost', 'Dải mờ cản va + logo', 'cut', 'white', 'mono', 'montserrat', false, ['brand', 'band', 'hours', 'door']),
  T('tea-red', 'Trà sữa · đỏ · OPEN', 'cut', 'red', 'mint', 'baloo', true, ['brand', 'open', 'hours', 'promo']),
  T('pp-hours', 'Bộ thẻ giờ mở cửa · wifi QR', 'print', 'white', 'navy', 'montserrat', false, ['brand', 'hours', 'wifi', 'open', 'payment']),
  T('pp-pharmacy', 'Nhà thuốc · xanh', 'print', 'white', 'pharmacy', 'bvp', false, ['brand', 'hours', 'payment', 'door']),
  T('pp-food', 'Quán ăn · khuyến mãi', 'print', 'white', 'red', 'baloo', false, ['brand', 'promo', 'hours', 'wifi']),
  T('pp-milktea', 'Trà sữa pastel', 'print', 'white', 'mint', 'lobster', true, ['brand', 'hours', 'wifi', 'band']),
  T('pp-pay', 'Chấp nhận thanh toán', 'print', 'white', 'coffee', 'oswald', false, ['open', 'payment', 'wifi', 'door']),
  T('ow-sale', '1 chiều · Sale tràn kính', 'oneway', 'white', 'red', 'montserrat', false, [], 'sale'),
  T('ow-brand', '1 chiều · Hình ảnh thương hiệu', 'oneway', 'white', 'navy', 'playfair', false, [], 'brand'),
];
export const WD_FIRST: WDSpec = { ...WD_TEMPLATES[0].spec, glass: 'door90', wCm: 90, hCm: 200, door: true, inside: false };

export type WDData = Record<string, string>;
export interface WDField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; for: (WDBlock | 'oneway')[] }
export const WD_FIELDS: WDField[] = [
  { key: 'brand', label: 'Tên shop / thương hiệu', ph: 'AN KHANG COFFEE', for: ['brand', 'band', 'oneway'] },
  { key: 'tagline', label: 'Dòng phụ dưới tên', ph: 'Cà phê rang xay · Bánh ngọt', for: ['brand', 'oneway'] },
  { key: 'hours', label: 'Giờ mở cửa (mỗi dòng: Ngày | Giờ)', ph: 'Thứ 2 – Thứ 6 | 7:00 – 22:00', multiline: true, for: ['hours'] },
  { key: 'wifiName', label: 'Tên wifi', ph: 'AnKhang_Coffee', half: true, for: ['wifi'] },
  { key: 'wifiPass', label: 'Mật khẩu wifi', ph: 'cafengon2027', half: true, for: ['wifi'] },
  { key: 'promo', label: 'Khuyến mãi (chữ to nhất)', ph: 'GIẢM 20%', half: true, for: ['promo', 'oneway'] },
  { key: 'promoSub', label: 'Điều kiện khuyến mãi', ph: 'Cho hoá đơn từ 99K', half: true, for: ['promo', 'oneway'] },
  { key: 'phone', label: 'Hotline', ph: '0909 123 456', half: true, for: ['payment', 'oneway', 'brand'] },
  { key: 'website', label: 'Website / fanpage', ph: 'ankhang.vn', half: true, for: ['oneway', 'brand'] },
];
export const defaultWDData = (): WDData => ({
  brand: 'AN KHANG COFFEE', tagline: 'Cà phê rang xay · Bánh ngọt',
  hours: 'Thứ 2 – Thứ 6 | 7:00 – 22:00\nThứ 7 – Chủ nhật | 7:00 – 23:00',
  wifiName: 'AnKhang_Coffee', wifiPass: 'cafengon2027', promo: 'GIẢM 20%', promoSub: 'Cho hoá đơn từ 99K · đến 31/12',
  phone: '0909 123 456', website: 'ankhang.vn', doorLabel: 'push',
});

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
interface Met { w: number; asc: number; desc: number } // ở cỡ 100
const metCache = new Map<string, Met>();
function met(text: string, fam: string, wt: number): Met {
  const k = `${wt}|${fam}|${text}`;
  const hit = metCache.get(k); if (hit) return hit;
  let r: Met;
  if (typeof document === 'undefined') r = { w: [...text].length * 60, asc: 74, desc: 22 };
  else {
    mctx ??= document.createElement('canvas').getContext('2d');
    if (!mctx) r = { w: [...text].length * 60, asc: 74, desc: 22 };
    else {
      mctx.font = `${wt} 100px "${fam}"`;
      const m = mctx.measureText(text);
      // chiều cao theo nét chữ thật của dòng (gồm dấu chồng tiếng Việt) — tối thiểu bằng chữ hoa có dấu
      const ref = mctx.measureText('ẮỐẾ');
      r = { w: m.width, asc: Math.max(m.actualBoundingBoxAscent || 72, ref.actualBoundingBoxAscent || 72), desc: Math.max(m.actualBoundingBoxDescent || 18, 18) };
    }
  }
  if (metCache.size > 4000) metCache.clear();
  metCache.set(k, r);
  return r;
}
interface F { fam: string; wt: number }
// cỡ chữ lớn nhất để 1 dòng vừa w × h
function fitSize(text: string, f: F, w: number, h: number, ls = 0): number {
  const m = met(text, f.fam, f.wt); const n = Math.max(1, [...text].length);
  const perW = m.w / 100 + (ls * (n - 1)); // độ rộng / 1 đơn vị cỡ chữ
  return Math.max(0.1, Math.min(h / ((m.asc + m.desc) / 100), w / Math.max(0.01, perW)));
}

interface TOpt { key: string; f: F; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; arc?: boolean }
// 1 dòng chữ, đỉnh nét ở yTop, cỡ = size
function txt(text: string, x: number, yTop: number, size: number, o: TOpt): ReactNode {
  const m = met(text, o.f.fam, o.f.wt);
  return (
    <text key={`${o.key}-${x.toFixed(1)}-${yTop.toFixed(1)}`} x={r2(x)} y={r2(yTop + (m.asc * size) / 100)} fontFamily={`"${o.f.fam}"`} fontWeight={o.f.wt} fontSize={r2(size)}
      fill={o.fill} textAnchor={o.anchor || 'middle'} letterSpacing={o.ls ? r2(o.ls * size) : undefined} data-wd-text={o.key} data-wd-size={r2(size)}>{text}</text>
  );
}
const r2 = (v: number) => Math.round(v * 100) / 100;
const lineH = (text: string, f: F, size: number) => { const m = met(text, f.fam, f.wt); return ((m.asc + m.desc) * size) / 100; };

// ---------- bố trí khối theo chiều cao thật ----------
export interface Box { x: number; y: number; w: number; h: number }
export interface Placed extends Box { key: WDBlock }
const MAXH: Record<WDBlock, number> = { brand: 420, hours: 360, wifi: 260, payment: 250, open: 190, door: 150, band: 130, promo: 300 };
const MAXW: Record<WDBlock, number> = { brand: 1300, hours: 620, wifi: 560, payment: 680, open: 380, door: 160, band: 99999, promo: 640 };

export function layoutBlocks(spec: WDSpec, g: WDGeom): { placed: Placed[]; dropped: WDBlock[] } {
  const { W, H, bottom, door } = g;
  const on = new Set(spec.type === 'oneway' ? [] : spec.blocks);
  if (!door) on.delete('door');
  const placed: Placed[] = []; const dropped: WDBlock[] = [];
  const top = bottom + H; // mép trên kính so với sàn
  const yOf = (hFloor: number) => H - (hFloor - bottom);
  // vùng nội dung ngang (tránh tay nắm)
  const hx0 = door ? W - 175 : W;
  const cx0 = door ? 60 : 80, cx1 = door ? (on.has('door') ? W - 350 : hx0) : W - 80;
  const fx0 = 60, fx1 = W - 60; // vùng trên cao (trên tay nắm) dùng hết bề ngang
  const zone = (a: number, b: number) => { const lo = Math.max(a, bottom + 45), hi = Math.min(b, top - 45); return hi - lo >= 70 ? { y: yOf(hi), h: hi - lo } : null; };
  const band = on.has('band');
  // dải cản va: tầm mắt 1m44 → 1m57, tràn hết bề ngang kính
  if (band) {
    const z = zone(1440, 1570);
    if (z) placed.push({ key: 'band', x: 0, y: z.y, w: W, h: z.h }); else dropped.push('band');
  }
  const stack = (keys: WDBlock[], z: { y: number; h: number } | null, x0: number, x1: number, align: 'top' | 'bottom') => {
    const ks = keys.filter((k) => on.has(k));
    if (!ks.length) return;
    if (!z) { dropped.push(...ks); return; }
    const cw = x1 - x0, gap = 34;
    // đủ rộng → xếp 2 cột (khối đầu bên trái), còn lại xếp dọc
    if (ks.length >= 2 && cw >= 800) {
      const cols: WDBlock[][] = [[ks[0]], ks.slice(1)];
      const w0 = Math.min(MAXW[ks[0]], (cw - gap) * 0.55), w1 = Math.min(Math.max(...cols[1].map((k) => MAXW[k])), cw - gap - w0);
      const tot = w0 + gap + w1, sx = x0 + (cw - tot) / 2;
      col(cols[0], z, sx, w0, align); col(cols[1], z, sx + w0 + gap, w1, align);
    } else col(ks, z, x0 + (cw - Math.min(cw, Math.max(...ks.map((k) => MAXW[k])))) / 2, Math.min(cw, Math.max(...ks.map((k) => MAXW[k]))), align);
  };
  const col = (ks: WDBlock[], z: { y: number; h: number }, x: number, w: number, align: 'top' | 'bottom') => {
    const gap = 30;
    const want = ks.map((k) => MAXH[k]);
    const avail = z.h - gap * (ks.length - 1);
    const k = Math.min(1, avail / want.reduce((a, b) => a + b, 0));
    const hs = want.map((v) => v * k);
    const used = hs.reduce((a, b) => a + b, 0) + gap * (ks.length - 1);
    let y = align === 'top' ? z.y : z.y + z.h - used;
    ks.forEach((key, i) => {
      const bw = Math.min(w, MAXW[key]);
      if (hs[i] < 70) { dropped.push(key); return; }
      placed.push({ key, x: x + (w - bw) / 2, y, w: bw, h: hs[i] });
      y += hs[i] + gap;
    });
  };
  const bz = zone(1630, 2080);
  if (bz) {
    stack(['brand'], bz, fx0, fx1, 'bottom');
    stack(['hours', 'wifi', 'open'], zone(1000, band ? 1405 : 1590), cx0, cx1, 'top');
    stack(['promo', 'payment'], zone(560, 960), cx0, cx1, 'top');
  } else {
    // kính thấp (đỉnh kính dưới ~1m7): chia đôi kính — nửa trên tên shop + giờ/wifi, nửa dưới khuyến mãi + thanh toán
    const midF = bottom + H * 0.5;
    const upTop = band && placed.some((p) => p.key === 'band') ? 1405 : top - 45;
    stack(['brand', 'hours', 'wifi', 'open'], zone(midF, upTop), cx0, cx1, 'top');
    stack(['promo', 'payment'], zone(bottom + 45, midF - 30), cx0, cx1, 'top');
  }
  if (on.has('door')) {
    const z = zone(985, 1135);
    if (z) placed.push({ key: 'door', x: W - 312, y: z.y, w: 128, h: z.h }); else dropped.push('door');
  }
  return { placed, dropped };
}

// ---------- logo chữ (monogram) ----------
export const initials = (s: string) => {
  const w = (s || '').trim().split(/\s+/).filter(Boolean);
  const pick = w.filter((x) => !/^(công|ty|tnhh|cổ|phần|shop|quán|tiệm|the|of|&)$/i.test(x));
  const src = pick.length ? pick : w;
  return (src.length >= 2 ? src[0][0] + src[1][0] : (src[0] || 'M').slice(0, 2)).toLocaleUpperCase('vi');
};

// ---------- hình nét ĐẶC (fill, evenodd) — decal cắt được, không dùng stroke ----------
const f2 = (v: number) => Math.round(v * 100) / 100;
export function rrPath(x: number, y: number, w: number, h: number, r: number): string {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${f2(x + r)} ${f2(y)}H${f2(x + w - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x + w)} ${f2(y + r)}V${f2(y + h - r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x + w - r)} ${f2(y + h)}H${f2(x + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x)} ${f2(y + h - r)}V${f2(y + r)}A${f2(r)} ${f2(r)} 0 0 1 ${f2(x + r)} ${f2(y)}Z`;
}
export const ringRR = (x: number, y: number, w: number, h: number, r: number, t: number) => rrPath(x, y, w, h, r) + rrPath(x + t, y + t, w - 2 * t, h - 2 * t, Math.max(0, r - t));
const circ = (cx: number, cy: number, R: number) => `M${f2(cx - R)} ${f2(cy)}A${f2(R)} ${f2(R)} 0 1 0 ${f2(cx + R)} ${f2(cy)}A${f2(R)} ${f2(R)} 0 1 0 ${f2(cx - R)} ${f2(cy)}Z`;
export const ringC = (cx: number, cy: number, R: number, t: number) => circ(cx, cy, R) + circ(cx, cy, Math.max(0.1, R - t));
const arcBand = (cx: number, cy: number, R: number, t: number, a0: number, a1: number) => {
  const p = (rr: number, a: number) => `${f2(cx + rr * Math.cos(a))} ${f2(cy + rr * Math.sin(a))}`;
  const ri = R - t, cap = t / 2;
  return `M${p(R, a0)}A${f2(R)} ${f2(R)} 0 0 1 ${p(R, a1)}A${f2(cap)} ${f2(cap)} 0 0 1 ${p(ri, a1)}A${f2(ri)} ${f2(ri)} 0 0 0 ${p(ri, a0)}A${f2(cap)} ${f2(cap)} 0 0 1 ${p(R, a0)}Z`;
};
const bar = (x1: number, y1: number, x2: number, y2: number, t: number) => {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = (-dy / L) * t / 2, ny = (dx / L) * t / 2;
  return `M${f2(x1 + nx)} ${f2(y1 + ny)}L${f2(x2 + nx)} ${f2(y2 + ny)}L${f2(x2 - nx)} ${f2(y2 - ny)}L${f2(x1 - nx)} ${f2(y1 - ny)}Z`;
};
type IconKind = 'cash' | 'qr' | 'card' | 'wallet' | 'wifi' | 'arrow';
function icon(kind: IconKind, x: number, y: number, s: number, c: string, sw: number, key: string): ReactNode {
  const t = Math.max(4, sw * (100 / s)); // độ dày nét trong hệ 0..100
  let d = '';
  if (kind === 'cash') d = ringRR(6, 24, 88, 52, 8, t) + ringC(50, 50, 14, t) + circ(19, 37, t * 0.7) + circ(81, 63, t * 0.7);
  else if (kind === 'card') d = ringRR(6, 20, 88, 60, 9, t) + rrPath(6, 34, 88, t, 0) + rrPath(18, 54, 22, 14, 2);
  else if (kind === 'wallet') d = ringRR(26, 6, 48, 88, 9, t) + rrPath(43, 13, 14, t * 0.8, t * 0.4) + circ(50, 82, 4.5) + bar(38, 46, 47, 55, t) + bar(46, 56, 62, 38, t);
  else if (kind === 'qr') d = [[8, 8], [62, 8], [8, 62]].map(([a, b]) => ringRR(a, b, 30, 30, 4, Math.min(t, 8)) + rrPath(a + 10, b + 10, 10, 10, 1)).join('') + rrPath(62, 62, 12, 12, 1) + rrPath(80, 80, 12, 12, 1) + rrPath(80, 62, 12, 8, 1) + rrPath(62, 82, 10, 10, 1);
  else if (kind === 'wifi') d = [58, 40, 22].map((R) => arcBand(50, 88, R, t, Math.PI * 1.22, Math.PI * 1.78)).join('') + circ(50, 86, 7);
  else { const h = t / 2; d = `M8 ${f2(50 - h)}H62V26L92 50L62 74V${f2(50 + h)}H8Z`; }
  return <path key={key} d={d} fill={c} fillRule="evenodd" transform={`translate(${r2(x)} ${r2(y)}) scale(${r2(s / 100)})`} data-wd-icon={kind} />;
}

// ---------- chữ vòm (từng ký tự 1 <text> → outline được) ----------
function arcText(text: string, box: Box, f: F, fill: string, key: string, maxSize: number): { nodes: ReactNode[]; bottom: number } {
  const chars = [...text];
  const m = met('ẮỐẾ', f.fam, f.wt);
  let s = maxSize;
  const R = box.w * 0.9; // vòm thoải, không gập
  let span = 0, ws: number[] = [], hgt = 0;
  for (let it = 0; it < 60; it++) {
    ws = chars.map((ch) => (met(ch === ' ' ? 'n' : ch, f.fam, f.wt).w / 100) * s * (ch === ' ' ? 0.6 : 1));
    const T = ws.reduce((a, b) => a + b, 0) + s * 0.06 * (chars.length - 1);
    span = T / R;
    const chord = 2 * R * Math.sin(Math.min(span, 3) / 2);
    const sag = R * (1 - Math.cos(span / 2));
    const maxW = Math.max(...ws, 1);
    // cao thật của vòm: nét trên giữa → chân ký tự cuối (đã xoay)
    hgt = (m.asc * s) / 100 + sag + ((m.desc * s) / 100) * Math.cos(span / 2) + (maxW / 2) * Math.sin(span / 2);
    if (span <= 1.6 && chord <= box.w * 0.92 && hgt <= box.h) break;
    s *= 0.95;
  }
  const cx = box.x + box.w / 2;
  const asc = (m.asc * s) / 100;
  const cy = box.y + asc + R; // tâm vòng tròn (đỉnh nét chữ giữa chạm box.y)
  let cum = 0;
  const nodes = chars.map((ch, i) => {
    const th = -span / 2 + (cum + ws[i] / 2) / R;
    cum += ws[i] + s * 0.06;
    if (ch === ' ') return null;
    const px = cx + R * Math.sin(th), py = cy - R * Math.cos(th);
    return (
      <text key={`${key}-a${i}`} x={r2(px)} y={r2(py)} fontFamily={`"${f.fam}"`} fontWeight={f.wt} fontSize={r2(s)} fill={fill} textAnchor="middle"
        transform={`rotate(${r2((th * 180) / Math.PI)} ${r2(px)} ${r2(py)})`} data-wd-text={key} data-wd-arc="1" data-wd-size={r2(s)}>{ch}</text>
    );
  });
  return { nodes, bottom: box.y + hgt };
}

// ---------- vẽ từng khối ----------
interface Ctx { spec: WDSpec; data: WDData; g: WDGeom; ink: string; acc: string; panel: string | null; disp: F; body: F; bodyB: F; logo: string; mode: WDMode; uid: string }

function brandBlock(b: Box, c: Ctx): ReactNode {
  const { data, spec } = c;
  const brand = (data.brand || '').trim() || 'TÊN SHOP';
  const tag = (data.tagline || '').trim();
  const out: ReactNode[] = [];
  const pad = c.panel ? Math.min(b.w, b.h) * 0.08 : 0;
  const ib = { x: b.x + pad, y: b.y + pad, w: b.w - pad * 2, h: b.h - pad * 2 };
  // logo: ảnh khách (decal in) hoặc logo chữ vòng tròn (vẽ nét — cắt được)
  const lh = Math.min(ib.h * 0.36, ib.w * 0.3);
  const lcx = ib.x + ib.w / 2, lcy = ib.y + lh / 2;
  if (c.logo && spec.type !== 'cut') out.push(<image key="logo" href={c.logo} x={r2(lcx - lh / 2)} y={r2(ib.y)} width={r2(lh)} height={r2(lh)} preserveAspectRatio="xMidYMid meet" />);
  else {
    const ini = initials(brand);
    out.push(<path key="lr" d={ringC(lcx, lcy, lh / 2, lh * 0.07)} fill={c.acc} fillRule="evenodd" />);
    const s = fitSize(ini, c.disp, lh * 0.6, lh * 0.46);
    out.push(txt(ini, lcx, lcy - lineH(ini, c.disp, s) / 2, s, { key: 'logo', f: c.disp, fill: c.acc }));
  }
  const y0 = ib.y + lh + ib.h * 0.05;
  const remain = ib.y + ib.h - y0;
  const tagH = tag ? Math.min(remain * 0.22, 60) : 0;
  const nameH = remain - tagH - (tag ? remain * 0.06 : 0);
  let nameBottom: number;
  if (spec.arch) {
    const a = arcText(brand, { x: ib.x, y: y0, w: ib.w, h: nameH }, c.disp, c.ink, 'brand', Math.min(nameH * 0.62, 150));
    out.push(...a.nodes); nameBottom = a.bottom;
  } else {
    const s = Math.min(fitSize(brand, c.disp, ib.w, nameH), 170);
    out.push(txt(brand, ib.x + ib.w / 2, y0 + (nameH - lineH(brand, c.disp, s)) / 2, s, { key: 'brand', f: c.disp, fill: c.ink }));
    nameBottom = y0 + (nameH + lineH(brand, c.disp, s)) / 2;
  }
  if (tag) {
    const s = Math.min(fitSize(tag, c.body, ib.w * 0.92, tagH), 46);
    out.push(txt(tag, ib.x + ib.w / 2, Math.min(nameBottom + ib.h * 0.04, ib.y + ib.h - lineH(tag, c.body, s)), s, { key: 'tagline', f: c.body, fill: c.ink }));
  }
  return <g key="brand">{out}</g>;
}

function hoursBlock(b: Box, c: Ctx): ReactNode {
  const rows = (c.data.hours || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 4).map((l) => {
    const [d, t] = l.split('|').map((x) => (x || '').trim()); return { d: d || l, t: t || '' };
  });
  const pad = c.panel ? Math.min(b.w, b.h) * 0.1 : 0;
  const ib = { x: b.x + pad, y: b.y + pad, w: b.w - pad * 2, h: b.h - pad * 2 };
  const out: ReactNode[] = [];
  const titleH = ib.h * 0.26, subH = ib.h * 0.1;
  const s1 = Math.min(fitSize('GIỜ MỞ CỬA', c.bodyB, ib.w * 0.9, titleH, 0.08), 70);
  out.push(txt('GIỜ MỞ CỬA', ib.x + ib.w / 2, ib.y, s1, { key: 'hours-title', f: c.bodyB, fill: c.acc, ls: 0.08 }));
  const s2 = Math.min(fitSize('OPENING HOURS', c.body, ib.w * 0.6, subH, 0.2), 26);
  const ySub = ib.y + lineH('GIỜ MỞ CỬA', c.bodyB, s1) + ib.h * 0.04;
  out.push(txt('OPENING HOURS', ib.x + ib.w / 2, ySub, s2, { key: 'hours-sub', f: c.body, fill: c.ink, ls: 0.2 }));
  const yRows = ySub + lineH('OPENING HOURS', c.body, s2) + ib.h * 0.07;
  const rh = (ib.y + ib.h - yRows) / Math.max(1, rows.length);
  // cỡ chung cho mọi dòng: ngày (trái) + giờ (phải) vừa bề ngang, chừa khoảng giữa
  let s = Math.min(rh * 0.62, 52);
  for (const r of rows) {
    const wd = met(r.d, c.body.fam, c.body.wt).w / 100, wt = met(r.t, c.bodyB.fam, c.bodyB.wt).w / 100;
    s = Math.min(s, (ib.w * 0.94) / Math.max(0.01, wd + wt + 0.8));
  }
  rows.forEach((r, i) => {
    const yT = yRows + i * rh + (rh - lineH(r.d + r.t, c.body, s)) / 2;
    if (!r.t) { out.push(txt(r.d, ib.x + ib.w / 2, yT, s, { key: `hours-d${i}`, f: c.body, fill: c.ink })); return; }
    out.push(txt(r.d, ib.x, yT, s, { key: `hours-d${i}`, f: c.body, fill: c.ink, anchor: 'start' }));
    out.push(txt(r.t, ib.x + ib.w, yT, s, { key: `hours-t${i}`, f: c.bodyB, fill: c.ink, anchor: 'end' }));
    if (i < rows.length - 1) { const t = Math.max(2, s * 0.06); out.push(<rect key={`hl${i}`} x={r2(ib.x)} y={r2(yRows + (i + 1) * rh - t / 2)} width={r2(ib.w)} height={r2(t)} fill={c.ink} opacity={c.panel ? 0.28 : 1} />); }
  });
  return <g key="hours">{out}</g>;
}

const wifiPayload = (n: string, p: string) => { const e = (v: string) => v.replace(/([\\;,:"])/g, '\\$1'); return `WIFI:T:WPA;S:${e(n)};P:${e(p)};;`; };

function wifiBlock(b: Box, c: Ctx): ReactNode {
  const name = (c.data.wifiName || '').trim() || 'Wifi', pass = (c.data.wifiPass || '').trim();
  const pad = c.panel ? Math.min(b.w, b.h) * 0.1 : 0;
  const ib = { x: b.x + pad, y: b.y + pad, w: b.w - pad * 2, h: b.h - pad * 2 };
  const out: ReactNode[] = [];
  let tx = ib.x, tw = ib.w;
  // decal in: mã QR wifi quét là vào (nền trắng cho camera đọc)
  if (c.spec.type === 'print') {
    const q = qrPath(wifiPayload(name, pass));
    const qs = Math.min(ib.h, ib.w * 0.42);
    const m = qs / (q.n + 2);
    out.push(<rect key="qbg" x={r2(ib.x)} y={r2(ib.y + (ib.h - qs) / 2)} width={r2(qs)} height={r2(qs)} rx={r2(qs * 0.06)} fill="#FFFFFF" />);
    out.push(<path key="qr" d={q.d} transform={`translate(${r2(ib.x + m)} ${r2(ib.y + (ib.h - qs) / 2 + m)}) scale(${r2(m * 1000) / 1000})`} fill="#111111" data-wd-qr="1" />);
    tx = ib.x + qs + ib.w * 0.06; tw = ib.x + ib.w - tx;
  }
  const ih = Math.min(ib.h * 0.34, tw * 0.3);
  out.push(icon('wifi', tx + (c.spec.type === 'print' ? 0 : (tw - ih) / 2), ib.y, ih, c.acc, Math.max(2.5, ih * 0.09), 'wifi-ic'));
  const anchor = c.spec.type === 'print' ? 'start' : 'middle';
  const ax = anchor === 'start' ? tx : tx + tw / 2;
  const y1 = ib.y + ih + ib.h * 0.06;
  const lh1 = (ib.y + ib.h - y1) * 0.5;
  const s1 = Math.min(fitSize(name, c.bodyB, tw, lh1 * 0.8), 52);
  out.push(txt(name, ax, y1, s1, { key: 'wifi-name', f: c.bodyB, fill: c.ink, anchor }));
  if (pass) {
    const pl = `Mật khẩu: ${pass}`;
    const s2 = Math.min(fitSize(pl, c.body, tw, lh1 * 0.62), 40);
    out.push(txt(pl, ax, y1 + lineH(name, c.bodyB, s1) + lh1 * 0.18, s2, { key: 'wifi-pass', f: c.body, fill: c.ink, anchor }));
  }
  return <g key="wifi">{out}</g>;
}

function paymentBlock(b: Box, c: Ctx): ReactNode {
  const pad = c.panel ? Math.min(b.w, b.h) * 0.09 : 0;
  const ib = { x: b.x + pad, y: b.y + pad, w: b.w - pad * 2, h: b.h - pad * 2 };
  const out: ReactNode[] = [];
  const title = 'CHẤP NHẬN THANH TOÁN';
  const s1 = Math.min(fitSize(title, c.bodyB, ib.w * 0.95, ib.h * 0.18, 0.06), 46);
  out.push(txt(title, ib.x + ib.w / 2, ib.y, s1, { key: 'pay-title', f: c.bodyB, fill: c.acc, ls: 0.06 }));
  const items: { k: 'cash' | 'qr' | 'card' | 'wallet'; l: string }[] = [{ k: 'cash', l: 'Tiền mặt' }, { k: 'qr', l: 'Chuyển khoản' }, { k: 'card', l: 'Thẻ' }, { k: 'wallet', l: 'Ví điện tử' }];
  const yI = ib.y + lineH(title, c.bodyB, s1) + ib.h * 0.08;
  const cw = ib.w / items.length;
  const labH = ib.h * 0.17;
  const is = Math.min(cw * 0.66, ib.y + ib.h - yI - labH - ib.h * 0.04);
  let ls = 99;
  for (const it of items) ls = Math.min(ls, fitSize(it.l, c.body, cw * 0.94, labH));
  ls = Math.min(ls, 30);
  items.forEach((it, i) => {
    const cx = ib.x + cw * (i + 0.5);
    out.push(icon(it.k, cx - is / 2, yI, is, c.ink, Math.max(2.5, is * 0.07), `pay-${it.k}`));
    out.push(txt(it.l, cx, yI + is + ib.h * 0.04, ls, { key: `pay-l${i}`, f: c.body, fill: c.ink }));
  });
  return <g key="payment">{out}</g>;
}

function openBlock(b: Box, c: Ctx): ReactNode {
  const out: ReactNode[] = [];
  const sw = Math.max(3, b.h * 0.035);
  // khung bo tròn (decal cắt: viền nét; decal in: tấm nền)
  if (!c.panel) out.push(<path key="ob" d={ringRR(b.x, b.y, b.w, b.h, b.h * 0.22, sw)} fill={c.ink} fillRule="evenodd" />);
  const ib = { x: b.x + b.w * 0.1, y: b.y + b.h * 0.14, w: b.w * 0.8, h: b.h * 0.72 };
  const s1 = Math.min(fitSize('MỞ CỬA', c.disp, ib.w, ib.h * 0.62), 110);
  const s2 = Math.min(fitSize('WE ARE OPEN', c.body, ib.w * 0.8, ib.h * 0.22, 0.18), 34);
  const tot = lineH('MỞ CỬA', c.disp, s1) + ib.h * 0.06 + lineH('WE ARE OPEN', c.body, s2);
  const y = ib.y + (ib.h - tot) / 2;
  out.push(txt('MỞ CỬA', ib.x + ib.w / 2, y, s1, { key: 'open', f: c.disp, fill: c.panel ? c.acc : c.ink }));
  out.push(txt('WE ARE OPEN', ib.x + ib.w / 2, y + lineH('MỞ CỬA', c.disp, s1) + ib.h * 0.06, s2, { key: 'open-en', f: c.body, fill: c.ink, ls: 0.18 }));
  return <g key="open">{out}</g>;
}

function doorBlock(b: Box, c: Ctx): ReactNode {
  const pull = (c.data.doorLabel || 'push') === 'pull';
  const vi = pull ? 'KÉO' : 'ĐẨY', en = pull ? 'PULL' : 'PUSH';
  const out: ReactNode[] = [];
  const s1 = Math.min(fitSize(vi, c.disp, b.w * 0.9, b.h * 0.46), 80);
  const s2 = Math.min(fitSize(en, c.body, b.w * 0.6, b.h * 0.18, 0.2), 30);
  const h1 = lineH(vi, c.disp, s1), h2 = lineH(en, c.body, s2);
  const ar = Math.min(b.w * 0.5, b.h * 0.26);
  const tot = h1 + h2 + ar + b.h * 0.08;
  let y = b.y + (b.h - tot) / 2;
  out.push(txt(vi, b.x + b.w / 2, y, s1, { key: 'door', f: c.disp, fill: c.ink })); y += h1 + b.h * 0.04;
  out.push(txt(en, b.x + b.w / 2, y, s2, { key: 'door-en', f: c.body, fill: c.ink, ls: 0.2 })); y += h2 + b.h * 0.04;
  // mũi tên: đẩy → hướng vào trong (lên), kéo → về phía người (xuống) — vẽ ngang chỉ về tay nắm
  const ax = b.x + (b.w - ar) / 2;
  out.push(<g key="darr" transform={pull ? `translate(${r2(ax + ar)} ${r2(y + ar)}) rotate(180)` : `translate(${r2(ax)} ${r2(y)})`}>{icon('arrow', 0, 0, ar, c.acc, Math.max(3, ar * 0.1), 'door-ar')}</g>);
  return <g key="door">{out}</g>;
}

function promoBlock(b: Box, c: Ctx): ReactNode {
  const promo = (c.data.promo || '').trim() || 'KHUYẾN MÃI';
  const sub = (c.data.promoSub || '').trim();
  const out: ReactNode[] = [];
  const print = c.spec.type === 'print';
  let ib = { x: b.x, y: b.y, w: b.w, h: b.h };
  if (print) {
    // tem nổ hình sao (starburst) chứa khuyến mãi
    const R = Math.min(b.h / 2, b.w * 0.2), cx = b.x + R + 4, cy = b.y + b.h / 2;
    const n = 16; let d = '';
    for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? R * 0.84 : R; d += `${i ? 'L' : 'M'}${r2(cx + rr * Math.cos(a))} ${r2(cy + rr * Math.sin(a))}`; }
    out.push(<path key="burst" d={`${d}Z`} fill={c.acc} />);
    const pw = promo.split(/\s+/);
    const l1 = pw.length > 1 ? pw.slice(0, -1).join(' ') : promo, l2 = pw.length > 1 ? pw[pw.length - 1] : '';
    const s1 = Math.min(fitSize(l1, c.disp, R * 1.2, R * 0.34), 60);
    const s2 = l2 ? Math.min(fitSize(l2, c.disp, R * 1.3, R * 0.62), 140) : 0;
    const tot = lineH(l1, c.disp, s1) + (l2 ? lineH(l2, c.disp, s2) + R * 0.04 : 0);
    out.push(txt(l1, cx, cy - tot / 2, s1, { key: 'promo', f: c.disp, fill: c.panel || '#FFFFFF' }));
    if (l2) out.push(txt(l2, cx, cy - tot / 2 + lineH(l1, c.disp, s1) + R * 0.04, s2, { key: 'promo-2', f: c.disp, fill: c.panel || '#FFFFFF' }));
    ib = { x: cx + R + b.w * 0.05, y: b.y + b.h * 0.12, w: b.x + b.w - (cx + R + b.w * 0.05) - b.w * 0.04, h: b.h * 0.76 };
    const head = 'ƯU ĐÃI';
    const sh = Math.min(fitSize(head, c.disp, ib.w, ib.h * 0.34), 80);
    out.push(txt(head, ib.x, ib.y, sh, { key: 'promo-head', f: c.disp, fill: c.ink, anchor: 'start' }));
    if (sub) {
      const lines = wrapTo(sub, c.body, ib.w, 2);
      let s = Math.min(ib.h * 0.22, 40);
      for (const l of lines) s = Math.min(s, fitSize(l, c.body, ib.w, ib.h * 0.26));
      lines.forEach((l, i) => out.push(txt(l, ib.x, ib.y + lineH(head, c.disp, sh) + ib.h * 0.1 + i * lineH(l, c.body, s) * 1.15, s, { key: `promo-sub${i}`, f: c.body, fill: c.ink, anchor: 'start' })));
    }
    return <g key="promo">{out}</g>;
  }
  const s1 = Math.min(fitSize(promo, c.disp, ib.w, ib.h * (sub ? 0.62 : 0.85)), 220);
  const h1 = lineH(promo, c.disp, s1);
  const s2 = sub ? Math.min(fitSize(sub, c.body, ib.w * 0.95, ib.h * 0.2), 44) : 0;
  const tot = h1 + (sub ? ib.h * 0.06 + lineH(sub, c.body, s2) : 0);
  const y = ib.y + (ib.h - tot) / 2;
  out.push(txt(promo, ib.x + ib.w / 2, y, s1, { key: 'promo', f: c.disp, fill: c.ink }));
  if (sub) out.push(txt(sub, ib.x + ib.w / 2, y + h1 + ib.h * 0.06, s2, { key: 'promo-sub', f: c.body, fill: c.ink }));
  return <g key="promo">{out}</g>;
}

// tách chữ thành ≤ n dòng cho vừa (tham lam, cân đều)
function wrapTo(text: string, f: F, w: number, n: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length <= 1 || n <= 1) return [text];
  if (met(text, f.fam, f.wt).w <= w * 2.4) return [text];
  let best = [text], score = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const sc = Math.max(met(a, f.fam, f.wt).w, met(b, f.fam, f.wt).w);
    if (sc < score) { score = sc; best = [a, b]; }
  }
  return best;
}

// dải cản va: dải mờ tràn ngang kính, tên shop lặp. knock = chữ KHOÉT trong dải mờ (decal cắt: thấy kính qua chữ)
function bandBlock(b: Box, c: Ctx, frost: string, textFill: string, knock = false): ReactNode {
  const brand = ((c.data.brand || '').trim() || 'TÊN SHOP').toLocaleUpperCase('vi');
  const s = b.h * 0.36, ls = 0.12;
  const unitW = (met(brand, c.bodyB.fam, c.bodyB.wt).w / 100) * s + ls * s * Math.max(0, [...brand].length - 1);
  const gap = s * 1.4;
  const n = Math.max(1, Math.floor((b.w - gap) / (unitW + gap)));
  const tot = n * unitW + (n - 1) * gap;
  const x0 = b.x + (b.w - tot) / 2;
  const yT = b.y + (b.h - lineH(brand, c.bodyB, s)) / 2;
  const marks: ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const x = x0 + i * (unitW + gap);
    marks.push(txt(brand, x + unitW / 2, yT, s, { key: `band-${i}`, f: c.bodyB, fill: knock ? '#000' : textFill, ls }));
    if (i < n - 1) { const dx = x + unitW + gap / 2, dy = b.y + b.h / 2, d = s * 0.22; marks.push(<path key={`bd${i}`} d={`M${r2(dx)} ${r2(dy - d)}L${r2(dx + d)} ${r2(dy)}L${r2(dx)} ${r2(dy + d)}L${r2(dx - d)} ${r2(dy)}Z`} fill={knock ? '#000' : textFill} />); }
  }
  if (knock) {
    const id = `${c.uid}bandm`;
    return (
      <g key="bandg">
        <mask id={id} maskUnits="userSpaceOnUse" x={b.x} y={b.y} width={b.w} height={b.h}><rect x={r2(b.x)} y={r2(b.y)} width={r2(b.w)} height={r2(b.h)} fill="#fff" />{marks}</mask>
        <rect x={r2(b.x)} y={r2(b.y)} width={r2(b.w)} height={r2(b.h)} fill={frost} mask={`url(#${id})`} data-wd-band="1" />
      </g>
    );
  }
  return <g key="bandg"><rect x={r2(b.x)} y={r2(b.y)} width={r2(b.w)} height={r2(b.h)} fill={frost} data-wd-band="1" />{marks}</g>;
}

// ---------- decal 1 chiều: tranh tràn kính ----------
function onewayArt(c: Ctx, W: number, H: number): ReactNode {
  const p = wdPalette(c.spec.palette);
  const { data, g, uid } = c;
  const brand = (data.brand || '').trim() || 'TÊN SHOP';
  const eye = H - (1500 - g.bottom); // tầm mắt
  const out: ReactNode[] = [];
  const sale = c.spec.oneStyle === 'sale';
  const gid = `${uid}og${p.id}${c.spec.oneStyle}`;
  out.push(<defs key="d"><linearGradient id={gid} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={p.bg} /><stop offset="1" stopColor={p.soft} /></linearGradient></defs>);
  out.push(<rect key="bg" x={0} y={0} width={W} height={H} fill={`url(#${gid})`} />);
  if (c.logo) out.push(<image key="ph" href={c.logo} x={0} y={0} width={W} height={H * 0.62} preserveAspectRatio="xMidYMid slice" opacity={0.92} />);
  else if (sale) {
    // tia nắng chéo + vòng tròn — vẽ code
    for (let i = 0; i < 9; i++) out.push(<path key={`ray${i}`} d={`M${r2(W / 2)} ${r2(H * 0.3)}L${r2(W * (i / 8) * 1.4 - W * 0.2)} 0L${r2(W * ((i + 0.5) / 8) * 1.4 - W * 0.2)} 0Z`} fill={p.fg} opacity={0.07} />);
    out.push(<circle key="c1" cx={r2(W * 0.85)} cy={r2(H * 0.12)} r={r2(W * 0.22)} fill={p.acc} opacity={0.22} />);
    out.push(<circle key="c2" cx={r2(W * 0.1)} cy={r2(H * 0.5)} r={r2(W * 0.16)} fill={p.acc} opacity={0.16} />);
  } else {
    // sóng mềm + vòng tròn sáng (hình ảnh thương hiệu)
    out.push(<circle key="s1" cx={r2(W * 0.74)} cy={r2(H * 0.1)} r={r2(Math.min(W, H) * 0.2)} fill={p.acc} opacity={0.85} />);
    for (let i = 0; i < 4; i++) {
      const y = H * (0.36 + i * 0.07);
      out.push(<path key={`w${i}`} d={`M0 ${r2(y)} C ${r2(W * 0.3)} ${r2(y - H * 0.06)}, ${r2(W * 0.6)} ${r2(y + H * 0.06)}, ${r2(W)} ${r2(y - H * 0.02)} L ${W} ${H} L 0 ${H} Z`} fill={i % 2 ? p.soft : p.bg} opacity={0.55} />);
    }
  }
  // vùng chữ: tránh thanh tay nắm khi là cửa
  const lx = W * 0.07, rx = g.door ? W - 185 : W * 0.93;
  const cw = rx - lx, ccx = (lx + rx) / 2;
  const promo = (data.promo || '').trim(), sub = (data.promoSub || '').trim();
  // khối chữ chính quanh tầm mắt (nhìn rõ nhất từ vỉa hè)
  if (sale) {
    const head = 'KHUYẾN MÃI';
    const sh = Math.min(fitSize(head, c.bodyB, cw * 0.8, H * 0.05, 0.1), 90);
    const sp = Math.min(fitSize(promo || 'SALE', c.disp, cw, H * 0.16), 520);
    const ss = sub ? Math.min(fitSize(sub, c.body, cw, H * 0.04), 70) : 0;
    const tot = lineH(head, c.bodyB, sh) + H * 0.015 + lineH(promo || 'SALE', c.disp, sp) + (sub ? H * 0.02 + lineH(sub, c.body, ss) : 0);
    let y = eye - tot / 2;
    out.push(<rect key="hb" x={r2(ccx - (met(head, c.bodyB.fam, c.bodyB.wt).w / 100) * sh * 0.65 - sh * 0.8)} y={r2(y - sh * 0.3)} width={r2((met(head, c.bodyB.fam, c.bodyB.wt).w / 100) * sh * 1.3 + sh * 1.6)} height={r2(lineH(head, c.bodyB, sh) + sh * 0.6)} rx={r2(sh * 0.5)} fill={p.acc} />);
    out.push(txt(head, ccx, y, sh, { key: 'ow-head', f: c.bodyB, fill: p.bg, ls: 0.1 })); y += lineH(head, c.bodyB, sh) + H * 0.015;
    out.push(txt(promo || 'SALE', ccx, y, sp, { key: 'ow-promo', f: c.disp, fill: p.fg })); y += lineH(promo || 'SALE', c.disp, sp) + H * 0.02;
    if (sub) out.push(txt(sub, ccx, y, ss, { key: 'ow-sub', f: c.body, fill: p.fg }));
  } else {
    const sb = Math.min(fitSize(brand, c.disp, cw, H * 0.1), 300);
    const tag = (data.tagline || '').trim();
    const st = tag ? Math.min(fitSize(tag, c.body, cw * 0.9, H * 0.035), 70) : 0;
    const tot = lineH(brand, c.disp, sb) + (tag ? H * 0.02 + lineH(tag, c.body, st) : 0);
    const y = eye - tot / 2;
    out.push(txt(brand, ccx, y, sb, { key: 'ow-brand', f: c.disp, fill: p.fg }));
    if (tag) out.push(txt(tag, ccx, y + lineH(brand, c.disp, sb) + H * 0.02, st, { key: 'ow-tag', f: c.body, fill: p.fg }));
  }
  // dải chân: sale → tên shop + liên hệ; thương hiệu → hotline + web
  const fh = Math.min(H * 0.12, 260), fy = H - fh;
  out.push(<rect key="foot" x={0} y={r2(fy)} width={W} height={r2(fh)} fill={p.fg} opacity={0.94} />);
  const contact = [data.phone, data.website].filter(Boolean).join('  ·  ');
  const l1 = sale ? brand : (data.phone ? `HOTLINE ${data.phone}` : brand);
  const l2 = sale ? contact : (data.website || '');
  const f1 = sale ? c.disp : c.bodyB;
  const s1 = Math.min(fitSize(l1, f1, cw, fh * 0.36), 140);
  const s2 = l2 ? Math.min(fitSize(l2, c.bodyB, cw, fh * 0.22), 60) : 0;
  const tot = lineH(l1, f1, s1) + (l2 ? fh * 0.08 + lineH(l2, c.bodyB, s2) : 0);
  out.push(txt(l1, ccx, fy + (fh - tot) / 2, s1, { key: 'ow-foot', f: f1, fill: p.bg }));
  if (l2) out.push(txt(l2, ccx, fy + (fh - tot) / 2 + lineH(l1, f1, s1) + fh * 0.08, s2, { key: 'ow-contact', f: c.bodyB, fill: p.bg }));
  return <g key="ow">{out}</g>;
}

// ---------- SVG chính ----------
export function WindowDecalSvg({ spec, data, logo = '', mode = 'preview', marks = false, style }: {
  spec: WDSpec; data: WDData; logo?: string; mode?: WDMode; marks?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const g = wdGeom(spec);
  const { W, H } = g;
  const f = wdFont(spec.font);
  const disp: F = { fam: f.family, wt: f.weight };
  const body: F = { fam: BODY, wt: 600 }, bodyB: F = { fam: BODY, wt: 800 };
  const cut = spec.type === 'cut', oneway = spec.type === 'oneway';
  const vin = wdVinyl(spec.vinyl);
  const pal = wdPalette(spec.palette);
  const flatInk = mode !== 'preview'; // vàng kim: preview dùng gradient, file in/texture dùng màu phẳng
  const vinInk = vin.gold && !flatInk ? `url(#${uid}gold)` : vin.hex;
  const base: Omit<Ctx, 'ink' | 'acc' | 'panel'> = { spec, data, g, disp, body, bodyB, logo, mode, uid };
  const { placed } = oneway ? { placed: [] as Placed[] } : layoutBlocks(spec, g);
  const F = mode === 'preview' ? Math.max(30, W * 0.035) : 0; // khung nhôm quanh kính khi xem trước
  const vb = mode === 'preview' ? `${-F} ${-F} ${W + F * 2} ${H + F * 2}` : `0 0 ${W} ${H}`;
  const darkVinyl = cut && ['black', 'green'].includes(vin.id);

  // decal (dùng chung cho preview / tex / print)
  const decal: ReactNode[] = [];
  const cutLines: ReactNode[] = []; // decal in: đường bế quanh từng tấm
  if (oneway) decal.push(onewayArt({ ...base, ink: pal.fg, acc: pal.acc, panel: null }, W, H));
  else {
    for (const b of placed) {
      if (b.key === 'band') {
        if (cut) decal.push(<g key="band" data-layer="frost">{bandBlock(b, { ...base, ink: vin.hex, acc: vin.hex, panel: null }, mode === 'print' ? '#D9DDE1' : 'rgba(236,240,243,0.74)', '#FFFFFF', mode !== 'print')}</g>);
        else decal.push(bandBlock(b, { ...base, ink: pal.fg, acc: pal.acc, panel: pal.bg }, pal.bg, pal.fg));
        if (!cut) cutLines.push(<rect key="cl-band" x={r2(b.x)} y={r2(b.y)} width={r2(b.w)} height={r2(b.h)} />);
        continue;
      }
      const ctx: Ctx = cut ? { ...base, ink: vinInk, acc: vinInk, panel: null } : { ...base, ink: pal.fg, acc: pal.acc, panel: pal.bg };
      if (!cut) {
        const rx = Math.min(b.w, b.h) * (b.key === 'open' ? 0.22 : 0.08);
        decal.push(<rect key={`p-${b.key}`} x={r2(b.x)} y={r2(b.y)} width={r2(b.w)} height={r2(b.h)} rx={r2(rx)} fill={pal.bg} data-wd-panel={b.key} />);
        cutLines.push(<rect key={`cl-${b.key}`} x={r2(b.x)} y={r2(b.y)} width={r2(b.w)} height={r2(b.h)} rx={r2(rx)} />);
      }
      const fn = { brand: brandBlock, hours: hoursBlock, wifi: wifiBlock, payment: paymentBlock, open: openBlock, door: doorBlock, promo: promoBlock }[b.key];
      decal.push(<g key={`b-${b.key}`} data-wd-block={b.key}>{fn(b, ctx)}</g>);
    }
  }
  const defs = (
    <defs>
      <linearGradient id={`${uid}gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F6E3A1" /><stop offset="0.45" stopColor="#C9A24A" /><stop offset="0.7" stopColor="#EFD58A" /><stop offset="1" stopColor="#A8812F" />
      </linearGradient>
      <linearGradient id={`${uid}glass`} x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0" stopColor={darkVinyl ? '#E6EDEF' : '#3B4A50'} /><stop offset="1" stopColor={darkVinyl ? '#C9D5D8' : '#1F2A2F'} />
      </linearGradient>
      <linearGradient id={`${uid}frame`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#5C6268" /><stop offset="0.5" stopColor="#8A9097" /><stop offset="1" stopColor="#4F555B" /></linearGradient>
      <pattern id={`${uid}perf`} width={8} height={8} patternUnits="userSpaceOnUse"><circle cx={4} cy={4} r={1.6} fill="#000" opacity={0.35} /></pattern>
    </defs>
  );

  if (mode === 'print') {
    // FILE IN đúng khổ kính. Dán mặt trong → lật gương để nhìn từ ngoài đọc xuôi (decal 1 chiều luôn dán mặt ngoài)
    const mirror = spec.inside && !oneway;
    const tr = mirror ? `translate(${W} 0) scale(-1 1)` : undefined;
    return (
      <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} width={`${W}mm`} height={`${H}mm`} data-wd-mirror={mirror ? '1' : '0'}>
        {defs}
        {cut ? (
          <g transform={tr}>
            <g id="NenThamKhao"><rect x={0} y={0} width={W} height={H} fill="#55656C" /></g>
            <g id="CutContour" data-vinyl={vin.id}>{decal.filter((d) => !(d as { props?: { 'data-layer'?: string } })?.props?.['data-layer'])}</g>
            <g id="CutContour-DecalMo">{decal.filter((d) => (d as { props?: { 'data-layer'?: string } })?.props?.['data-layer'] === 'frost')}</g>
          </g>
        ) : (
          <g transform={tr}>
            <g id="In">{decal}</g>
            {!oneway && <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth={0.5}>{cutLines}</g>}
          </g>
        )}
      </svg>
    );
  }
  if (mode === 'tex') {
    return <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style}>{defs}{decal}</svg>;
  }
  // preview: khung nhôm + kính + nội thất mờ phía sau + decal + tay nắm + vạch tầm mắt
  const h = handleOf(g);
  const eye = H - (1500 - g.bottom);
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-wd-w={W} data-wd-h={H} data-wd-door={g.door ? 1 : 0} data-wd-bottom={g.bottom}>
      {defs}
      <rect x={-F} y={-F} width={W + F * 2} height={H + F * 2} rx={F * 0.2} fill={`url(#${uid}frame)`} />
      <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}glass)`} />
      {/* nội thất mờ phía sau kính: đèn ấm + kệ */}
      {!oneway && <g opacity={darkVinyl ? 0.18 : 0.35}>
        {[0.25, 0.5, 0.75].map((t, i) => <circle key={i} cx={W * t} cy={H * 0.12} r={W * 0.09} fill="#FFD9A0" opacity={0.35} />)}
        <rect x={W * 0.08} y={H * 0.55} width={W * 0.84} height={H * 0.05} fill="#000" opacity={0.25} />
        <rect x={W * 0.08} y={H * 0.72} width={W * 0.84} height={H * 0.05} fill="#000" opacity={0.25} />
      </g>}
      <path d={`M${W * 0.05} 0 L${W * 0.3} 0 L${W * 0.02} ${H * 0.45} L0 ${H * 0.45} L0 ${H * 0.08}Z`} fill="#FFFFFF" opacity={0.07} />
      {decal}
      {oneway && <rect x={0} y={0} width={W} height={H} fill={`url(#${uid}perf)`} />}
      {g.door && <g>
        <rect x={h.x - 11} y={h.y0} width={22} height={h.y1 - h.y0} rx={11} fill="#D5D9DE" stroke="#8D949B" strokeWidth={2} />
        <rect x={h.x - 6} y={h.y0 + 8} width={5} height={h.y1 - h.y0 - 16} rx={2.5} fill="#FFFFFF" opacity={0.6} />
      </g>}
      {marks && <g opacity={0.8}>
        <line x1={-F} x2={W + F} y1={eye} y2={eye} stroke="#FFB020" strokeWidth={Math.max(2, W * 0.003)} strokeDasharray={`${W * 0.02} ${W * 0.012}`} />
      </g>}
    </svg>
  );
}

// ---------- tiện ích cho trang ----------
export const wdHiddenNote = (spec: WDSpec): string => {
  const { dropped } = layoutBlocks(spec, wdGeom(spec));
  if (!dropped.length) return '';
  const names = dropped.map((d) => WD_BLOCKS.find((b) => b.id === d)?.name || d);
  return `Kính thấp quá nên chưa đặt được: ${names.join(', ')}.`;
};
