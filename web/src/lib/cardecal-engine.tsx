'use client';
// Decal dán xe công ty: 3 loại xe CHUNG (không mô phỏng hãng/ mẫu xe thật) — xe tải thùng kín 1,5 tấn, xe van chở hàng,
// ô tô 5–7 chỗ dịch vụ. Mỗi xe có các TẤM decal (hông trái · hông phải · đuôi · nắp capo) đúng kích thước gần thật (mm)
// + VÙNG KHÔNG IN (kính, tay nắm, vòm bánh, biển số) định nghĩa bằng code. Chữ TO đọc được khi xe chạy.
// Hông trái/ phải đối xứng: đầu xe luôn về phía logo, vệt tốc độ kéo về đuôi — chữ KHÔNG bị lật gương.
// 2 loại decal: 'print' cán màng in tràn (nền màu phủ cả tấm, khoét vùng không in) · 'cut' decal cắt chữ (không nền, 1–2 màu vinyl).
// 4 chế độ vẽ: preview (xem phẳng, nền sơn xe + vùng không in gạch chéo) · print (file in đúng khổ + lề xén, CutContour)
//              · tex (texture 3D, vùng không in trong suốt) · mock (ảnh mockup phẳng có nền sơn).

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';

export type CDVehicle = 'truck' | 'van' | 'car';
export type CDPanelId = 'left' | 'right' | 'rear' | 'hood';
export type CDKind = 'print' | 'cut';
export type CDMode = 'preview' | 'print' | 'tex' | 'mock';
export const CD_BLEED_MM = 10;

export const CD_VEHICLES: { id: CDVehicle; name: string; sub: string }[] = [
  { id: 'truck', name: 'Xe tải thùng kín 1,5 tấn', sub: 'thùng 3,3 × 1,75 × 1,75 m' },
  { id: 'van', name: 'Xe van chở hàng', sub: 'dài 5 m, hông không kính' },
  { id: 'car', name: 'Ô tô 5–7 chỗ dịch vụ', sub: 'taxi · dạy lái · đưa đón' },
];

/** vùng không in — toạ độ tấm "chuẩn" (nhìn hông TRÁI xe: đầu xe ở bên trái, x=0) */
export interface CDZone { kind: 'rect' | 'circle'; x: number; y: number; w: number; h: number; r?: number; label: string }
export interface CDPanel { id: CDPanelId; name: string; w: number; h: number; holes: CDZone[]; seams: number[] }

const rect = (x: number, y: number, w: number, h: number, label: string): CDZone => ({ kind: 'rect', x, y, w, h, label });
const circ = (cx: number, cy: number, r: number, label: string): CDZone => ({ kind: 'circle', x: cx - r, y: cy - r, w: r * 2, h: r * 2, r, label });

interface VehicleDef { side: { w: number; h: number; holes: CDZone[]; seams: number[] }; rear: { w: number; h: number; holes: CDZone[]; seams: number[] }; hood?: { w: number; h: number } }
const VEH: Record<CDVehicle, VehicleDef> = {
  truck: {
    side: { w: 3200, h: 1600, holes: [], seams: [] },
    rear: { w: 1650, h: 1550, holes: [rect(1650 / 2 - 300, 620, 150, 300, 'tay khoá'), rect(1650 / 2 + 150, 620, 150, 300, 'tay khoá'),
      rect(0, 120, 70, 160, 'bản lề'), rect(0, 1270, 70, 160, 'bản lề'), rect(1580, 120, 70, 160, 'bản lề'), rect(1580, 1270, 70, 160, 'bản lề')], seams: [1650 / 2] },
  },
  van: {
    side: { w: 2600, h: 1150, holes: [rect(860, 520, 170, 60, 'tay nắm'), circ(2350, 1260, 420, 'vòm bánh')], seams: [1180] },
    rear: { w: 1500, h: 1150, holes: [rect(70, 40, 1360, 380, 'kính sau'), rect(1500 / 2 + 60, 640, 160, 60, 'tay nắm')], seams: [1500 / 2] },
    hood: { w: 1400, h: 700 },
  },
  car: {
    side: { w: 2400, h: 560, holes: [rect(760, 40, 150, 46, 'tay nắm'), rect(1700, 40, 150, 46, 'tay nắm'), circ(-350, 680, 400, 'vòm bánh'), circ(2600, 680, 400, 'vòm bánh')], seams: [1150, 2050] },
    rear: { w: 1250, h: 480, holes: [rect(1250 / 2 - 60, 30, 120, 60, 'camera'), rect(1250 / 2 - 270, 330, 540, 140, 'biển số')], seams: [] },
    hood: { w: 1400, h: 1000 },
  },
};

/** các tấm của xe (hông phải = hông trái lật gương HÌNH HỌC, chữ vẫn xuôi) */
export function cdPanels(v: CDVehicle, withHood: boolean): CDPanel[] {
  const d = VEH[v];
  const mirror = (z: CDZone, w: number): CDZone => ({ ...z, x: w - z.x - z.w });
  const out: CDPanel[] = [
    { id: 'left', name: 'Hông trái (tài xế)', w: d.side.w, h: d.side.h, holes: d.side.holes, seams: d.side.seams },
    { id: 'right', name: 'Hông phải', w: d.side.w, h: d.side.h, holes: d.side.holes.map((z) => mirror(z, d.side.w)), seams: d.side.seams.map((s) => d.side.w - s) },
    { id: 'rear', name: 'Đuôi xe', w: d.rear.w, h: d.rear.h, holes: d.rear.holes, seams: d.rear.seams },
  ];
  if (withHood && d.hood) out.push({ id: 'hood', name: 'Nắp capo', w: d.hood.w, h: d.hood.h, holes: [], seams: [] });
  return out;
}
export const cdPanel = (v: CDVehicle, id: CDPanelId, withHood = true) => cdPanels(v, withHood).find((p) => p.id === id) ?? cdPanels(v, withHood)[0];
export const cdHasHood = (v: CDVehicle) => !!VEH[v].hood;

// ---------- font ----------
export interface CDFont { id: string; name: string; family: string; weight: number; upper: boolean }
export const CD_FONTS: CDFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, upper: true },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800, upper: true },
  { id: 'archivo', name: 'Archivo', family: 'Archivo', weight: 800, upper: true },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800, upper: false },
];
export const cdFont = (id: string) => CD_FONTS.find((f) => f.id === id) || CD_FONTS[0];
const BODY = 'Be Vietnam Pro';
const NUM = 'Oswald';
export const CD_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Oswald:wght@700&family=Archivo:wght@800&family=Baloo+2:wght@800&display=swap');`;

export function useCDFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-cd-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-cd-fonts'; link.rel = 'stylesheet';
        link.href = CD_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...CD_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- màu ----------
// bg nền decal in tràn · fg chữ chính · acc màu nhấn · onAcc chữ trên nền nhấn · sub chữ phụ · paint màu sơn xe gợi ý
export interface CDPalette { id: string; name: string; bg: string; fg: string; acc: string; onAcc: string; sub: string; paint: string }
export const CD_PALETTES: CDPalette[] = [
  { id: 'navy', name: 'Navy · cam', bg: '#FFFFFF', fg: '#14284B', acc: '#F08A24', onAcc: '#FFFFFF', sub: '#3B4E6E', paint: '#F4F5F6' },
  { id: 'deep', name: 'Xanh đậm · vàng', bg: '#12305A', fg: '#FFFFFF', acc: '#F5C518', onAcc: '#12305A', sub: '#C8D6EA', paint: '#12305A' },
  { id: 'water', name: 'Trắng · xanh nước', bg: '#FFFFFF', fg: '#0B4F8A', acc: '#1E88E5', onAcc: '#FFFFFF', sub: '#3D6A90', paint: '#F4F5F6' },
  { id: 'fresh', name: 'Trắng · xanh lá rêu', bg: '#FFFFFF', fg: '#1E4D2B', acc: '#5E9E3A', onAcc: '#FFFFFF', sub: '#47604E', paint: '#F4F5F6' },
  { id: 'burgundy', name: 'Đỏ đô · kem', bg: '#7A1E2C', fg: '#FFF4E0', acc: '#F2B134', onAcc: '#3A0D14', sub: '#F2D3C4', paint: '#7A1E2C' },
  { id: 'cool', name: 'Bạc · xanh lạnh', bg: '#EEF3F7', fg: '#0D3B66', acc: '#00A6C8', onAcc: '#FFFFFF', sub: '#40607A', paint: '#C9CED4' },
  { id: 'ink', name: 'Đen · vàng', bg: '#16181C', fg: '#FFFFFF', acc: '#F2C230', onAcc: '#16181C', sub: '#C9CCD2', paint: '#1B1D21' },
  { id: 'wood', name: 'Kem · nâu gỗ', bg: '#F7F1E6', fg: '#4A2E1F', acc: '#B5793A', onAcc: '#FFFFFF', sub: '#7A5A44', paint: '#F2EEE6' },
  { id: 'teach', name: 'Trắng · đỏ', bg: '#FFFFFF', fg: '#B3261E', acc: '#B3261E', onAcc: '#FFFFFF', sub: '#5E2A26', paint: '#F4F5F6' },
  { id: 'rose', name: 'Hồng phấn · tím', bg: '#FFF1F5', fg: '#5B2A6E', acc: '#D96C9A', onAcc: '#FFFFFF', sub: '#7D5A86', paint: '#F4F5F6' },
];
export const cdPalette = (id: string) => CD_PALETTES.find((p) => p.id === id) || CD_PALETTES[0];

export const CD_PAINTS: { id: string; name: string; color: string | null }[] = [
  { id: 'auto', name: 'Theo mẫu', color: null },
  { id: 'white', name: 'Trắng', color: '#F4F5F6' },
  { id: 'silver', name: 'Bạc', color: '#C9CED4' },
  { id: 'black', name: 'Đen', color: '#1B1D21' },
  { id: 'navy', name: 'Xanh navy', color: '#12305A' },
  { id: 'red', name: 'Đỏ', color: '#A3202B' },
];

// ---------- nội dung mẫu ----------
export type CDIndustry = 'logistics' | 'water' | 'aircon' | 'furniture' | 'food' | 'driving' | 'spa' | 'taxi';
export const CD_INDUSTRIES: { id: CDIndustry; name: string }[] = [
  { id: 'logistics', name: 'Vận tải · chuyển nhà' }, { id: 'water', name: 'Nước uống' }, { id: 'aircon', name: 'Điện lạnh · sửa chữa' },
  { id: 'furniture', name: 'Nội thất · xây dựng' }, { id: 'food', name: 'Thực phẩm sạch' }, { id: 'driving', name: 'Dạy lái xe' },
  { id: 'spa', name: 'Spa · đưa đón' }, { id: 'taxi', name: 'Taxi · xe dịch vụ' },
];
export type CDData = Record<string, string>;
const SAMPLES: Record<CDIndustry, CDData> = {
  logistics: { brand: 'Vận tải Quốc Bảo', slogan: 'Nhanh – An toàn – Đúng hẹn', services: 'Chuyển nhà · Chuyển văn phòng · Giao hàng liên tỉnh', hotline: '1900 6868', web: 'vantaiquocbao.vn', qr: 'https://vantaiquocbao.vn/bao-gia', qrLabel: 'Quét báo giá' },
  water: { brand: 'Nước tinh khiết An Khang', slogan: 'Trong lành mỗi ngày', services: 'Bình 20L · Chai 500ml · Giao tận nơi', hotline: '0909 123 456', web: 'nuocankhang.vn', qr: 'https://zalo.me/0909123456', qrLabel: 'Quét Zalo đặt nước' },
  aircon: { brand: 'Điện lạnh Gia Khánh', slogan: 'Có mặt sau 30 phút', services: 'Sửa máy lạnh · Tủ lạnh · Máy giặt · Vệ sinh', hotline: '0938 222 333', web: 'dienlanhgiakhanh.vn', qr: 'https://zalo.me/0938222333', qrLabel: 'Quét Zalo gọi thợ' },
  furniture: { brand: 'Nội thất Thu Hà', slogan: 'Thiết kế – Thi công trọn gói', services: 'Tủ bếp · Phòng ngủ · Văn phòng · Showroom', hotline: '0977 456 123', web: 'noithatthuha.vn', qr: 'https://noithatthuha.vn', qrLabel: 'Xem mẫu nội thất' },
  food: { brand: 'Thực phẩm sạch Bảo Ngọc', slogan: 'Từ nông trại đến bàn ăn', services: 'Rau củ · Thịt cá tươi · Giao trong ngày', hotline: '0903 777 888', web: 'thucphambaongoc.vn', qr: 'https://zalo.me/0903777888', qrLabel: 'Quét Zalo đặt hàng' },
  driving: { brand: 'Dạy lái xe An Khang', slogan: 'Học nhanh – Thi đậu ngay', services: 'Hạng B1 · B2 · C · Xe số tự động', hotline: '0912 456 789', web: 'daylaixeankhang.vn', qr: 'https://zalo.me/0912456789', qrLabel: 'Quét Zalo đăng ký' },
  spa: { brand: 'Thu Hà Beauty Spa', slogan: 'Xe đưa đón miễn phí', services: 'Chăm sóc da · Massage · Gội đầu dưỡng sinh', hotline: '0905 321 654', web: 'thuhaspa.vn', qr: 'https://zalo.me/0905321654', qrLabel: 'Quét Zalo đặt lịch' },
  taxi: { brand: 'Xe dịch vụ Gia Khánh', slogan: 'Đưa đón sân bay 24/7', services: 'Sân bay · Đi tỉnh · Hợp đồng tháng', hotline: '1900 9090', web: 'xegiakhanh.vn', qr: 'https://zalo.me/19009090', qrLabel: 'Quét Zalo đặt xe' },
};
export const sampleData = (ind: CDIndustry): CDData => ({ ...SAMPLES[ind] });

export interface CDField { key: string; label: string; ph?: string; half?: boolean }
export const CD_FIELDS: CDField[] = [
  { key: 'brand', label: 'Tên công ty / thương hiệu (to nhất)', ph: 'Vận tải Quốc Bảo' },
  { key: 'slogan', label: 'Slogan', ph: 'Nhanh – An toàn – Đúng hẹn', half: true },
  { key: 'hotline', label: 'Hotline (chữ to, đọc từ xa)', ph: '1900 6868', half: true },
  { key: 'services', label: 'Dịch vụ (ngăn bằng dấu ·)', ph: 'Chuyển nhà · Chuyển văn phòng · Giao hàng liên tỉnh' },
  { key: 'web', label: 'Website / fanpage', ph: 'vantaiquocbao.vn', half: true },
  { key: 'qrLabel', label: 'Chữ dưới QR', ph: 'Quét báo giá', half: true },
  { key: 'qr', label: 'Link cho mã QR (để trống = không in QR)', ph: 'https://zalo.me/…' },
];

export interface CDLayout { id: string; name: string }
export const CD_LAYOUTS: CDLayout[] = [
  { id: 'swoosh', name: 'Vệt cong tốc độ' },
  { id: 'band', name: 'Dải ngang giữa' },
  { id: 'block', name: 'Khối màu đầu xe' },
  { id: 'wave', name: 'Sóng chân' },
  { id: 'minimal', name: 'Tối giản (hợp decal cắt)' },
];

export interface CDSpec { vehicle: CDVehicle; layout: string; palette: string; font: string; industry: CDIndustry; kind: CDKind; paint: string; hood: boolean }
export interface CDTemplate { id: string; name: string; spec: CDSpec }
const T = (id: string, name: string, vehicle: CDVehicle, layout: string, palette: string, font: string, industry: CDIndustry, kind: CDKind = 'print'): CDTemplate => ({
  id, name, spec: { vehicle, layout, palette, font, industry, kind, paint: 'auto', hood: false },
});
export const CD_TEMPLATES: CDTemplate[] = [
  T('truck-logistics', 'Vận tải · vệt cam', 'truck', 'swoosh', 'navy', 'montserrat', 'logistics'),
  T('truck-water', 'Nước uống · sóng xanh', 'truck', 'wave', 'water', 'bvp', 'water'),
  T('truck-furniture', 'Nội thất · khối gỗ', 'truck', 'block', 'wood', 'archivo', 'furniture'),
  T('truck-food', 'Thực phẩm · dải xanh', 'truck', 'band', 'fresh', 'baloo', 'food'),
  T('truck-deep', 'Vận tải · xanh đậm', 'truck', 'band', 'deep', 'oswald', 'logistics'),
  T('van-aircon', 'Điện lạnh · bạc', 'van', 'swoosh', 'cool', 'montserrat', 'aircon'),
  T('van-food', 'Thực phẩm · sóng', 'van', 'wave', 'fresh', 'bvp', 'food'),
  T('van-ink', 'Sửa chữa · đen vàng', 'van', 'block', 'ink', 'oswald', 'aircon'),
  T('car-driving', 'Dạy lái xe · cắt chữ đỏ', 'car', 'minimal', 'teach', 'archivo', 'driving', 'cut'),
  T('car-spa', 'Spa đưa đón · hồng', 'car', 'swoosh', 'rose', 'baloo', 'spa'),
  T('car-taxi', 'Xe dịch vụ · dải vàng', 'car', 'band', 'deep', 'oswald', 'taxi'),
  T('van-cut', 'Vận tải · cắt chữ navy', 'van', 'minimal', 'navy', 'montserrat', 'logistics', 'cut'),
];

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function measureW(text: string, fam: string, wt: number, size: number, ls = 0): number {
  const n = [...text].length;
  if (typeof document === 'undefined') return n * size * 0.6 + ls * size * Math.max(0, n - 1);
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return n * size * 0.6;
  mctx.font = `${wt} 100px "${fam}"`;
  return mctx.measureText(text).width * (size / 100) + ls * size * Math.max(0, n - 1);
}
const metCache = new Map<string, { asc: number; desc: number }>();
function fontMetrics(fam: string, wt: number): { asc: number; desc: number } {
  const k = `${wt} ${fam}`;
  const hit = metCache.get(k); if (hit) return hit;
  if (typeof document === 'undefined') return { asc: 1.05, desc: 0.4 };
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return { asc: 1.05, desc: 0.4 };
  mctx.font = `${wt} 100px "${fam}"`;
  const m = mctx.measureText('ẮÂỐ Ẹg');
  const v = { asc: (m.fontBoundingBoxAscent || 105) / 100, desc: (m.fontBoundingBoxDescent || 40) / 100 };
  if (document.fonts?.check?.(`${wt} 20px "${fam}"`)) metCache.set(k, v);
  return v;
}

interface Box { x: number; y: number; w: number; h: number }
const hit = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

/** thu hộp nội dung để TRÁNH vùng không in (kính, tay nắm, vòm bánh…): giữ phần lớn nhất còn lại */
function avoid(b: Box, holes: CDZone[], gap: number): Box {
  let cur = { ...b };
  for (const z of holes) {
    const hz: Box = { x: z.x - gap, y: z.y - gap, w: z.w + gap * 2, h: z.h + gap * 2 };
    if (!hit(cur, hz)) continue;
    const c: Box[] = [
      { x: cur.x, y: cur.y, w: cur.w, h: hz.y - cur.y },
      { x: cur.x, y: hz.y + hz.h, w: cur.w, h: cur.y + cur.h - (hz.y + hz.h) },
      { x: cur.x, y: cur.y, w: hz.x - cur.x, h: cur.h },
      { x: hz.x + hz.w, y: cur.y, w: cur.x + cur.w - (hz.x + hz.w), h: cur.h },
    ].filter((r) => r.w > 0 && r.h > 0);
    // ưu tiên giữ chiều cao (chữ to) → chấm điểm = min(h, w*0.25)·√diện tích
    c.sort((p, q) => Math.min(q.h, q.w * 0.3) * Math.sqrt(q.w * q.h) - Math.min(p.h, p.w * 0.3) * Math.sqrt(p.w * p.h));
    cur = c[0] ?? { x: cur.x, y: cur.y, w: 0, h: 0 };
  }
  return cur;
}

interface TextOpts { fam: string; wt: number; fill: string; anchor?: 'start' | 'middle' | 'end'; ls?: number; max?: number; upper?: boolean; lines?: 1 | 2; role?: string }
function split2(text: string, fam: string, wt: number, ls: number): [string, string] | null {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return null;
  let best: [string, string] | null = null, bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measureW(a, fam, wt, 100, ls), measureW(b, fam, wt, 100, ls));
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best;
}
function fitText(text: string, b: Box, o: TextOpts): { node: ReactNode; size: number; w: number } {
  const t = o.upper ? text.toLocaleUpperCase('vi') : text;
  if (!t.trim() || b.w <= 4 || b.h <= 4) return { node: null, size: 0, w: 0 };
  const ls = o.ls ?? 0;
  const fm = fontMetrics(o.fam, o.wt);
  const em = Math.max(fm.asc + fm.desc, 1.1) * 1.04;
  const one = Math.min(b.h / em, o.max ?? Infinity, b.w / Math.max(0.01, measureW(t, o.fam, o.wt, 1, ls)));
  let lines = [t], size = one;
  if ((o.lines ?? 1) === 2) {
    const sp = split2(t, o.fam, o.wt, ls);
    if (sp) {
      const two = Math.min(b.h / 2 / em, o.max ?? Infinity, ...sp.map((l) => b.w / Math.max(0.01, measureW(l, o.fam, o.wt, 1, ls))));
      if (two > one * 1.2) { lines = sp; size = two; }
    }
  }
  const anchor = o.anchor ?? 'middle';
  const x = anchor === 'middle' ? b.x + b.w / 2 : anchor === 'start' ? b.x : b.x + b.w;
  const rowH = Math.min(b.h / lines.length, em * size);
  const top = b.y + (b.h - rowH * lines.length) / 2;
  const w = Math.max(...lines.map((l) => measureW(l, o.fam, o.wt, size, ls)));
  const node = (
    <g data-role={o.role}>
      {lines.map((ln, i) => (
        <text key={i} x={x} y={top + rowH * i + (rowH - (fm.asc + fm.desc) * size) / 2 + fm.asc * size} textAnchor={anchor} fontFamily={`'${o.fam}'`} fontWeight={o.wt}
          fontSize={size} fill={o.fill} letterSpacing={ls ? ls * size : undefined}>{ln}</text>
      ))}
    </g>
  );
  return { node, size, w };
}

// ---------- hình vẽ bằng code ----------
/** biểu tượng ngành (hộp 100×100) */
function Icon({ ind, color, x, y, s }: { ind: CDIndustry; color: string; x: number; y: number; s: number }) {
  let body: ReactNode;
  if (ind === 'logistics') {
    body = (<g><rect x={4} y={22} width={60} height={46} rx={4} fill={color} /><path d="M66 36 H84 L96 52 V68 H66 Z" fill={color} />
      <circle cx={24} cy={76} r={11} fill={color} /><circle cx={80} cy={76} r={11} fill={color} /><circle cx={24} cy={76} r={4} fill="#00000040" /><circle cx={80} cy={76} r={4} fill="#00000040" /></g>);
  } else if (ind === 'water') {
    body = (<g><path d="M50 6 C66 30 82 48 82 64 C82 82 68 94 50 94 C32 94 18 82 18 64 C18 48 34 30 50 6 Z" fill={color} /><path d="M34 64 C34 76 42 82 52 82" stroke="#FFFFFF66" strokeWidth={6} fill="none" strokeLinecap="round" /></g>);
  } else if (ind === 'aircon') {
    body = (<g><path d="M50 8 V92 M14 29 L86 71 M86 29 L14 71" stroke={color} strokeWidth={9} strokeLinecap="round" />
      {[0, 60, 120, 180, 240, 300].map((a) => <path key={a} d="M50 18 L40 8 M50 18 L60 8" stroke={color} strokeWidth={6} strokeLinecap="round" transform={`rotate(${a} 50 50)`} />)}</g>);
  } else if (ind === 'furniture') {
    body = (<g><rect x={10} y={40} width={80} height={30} rx={8} fill={color} /><rect x={16} y={20} width={68} height={26} rx={8} fill={color} opacity={0.75} />
      <rect x={14} y={70} width={8} height={18} rx={2} fill={color} /><rect x={78} y={70} width={8} height={18} rx={2} fill={color} /></g>);
  } else if (ind === 'food') {
    body = (<g><path d="M50 30 C30 10 8 22 10 46 C12 72 34 92 50 82 C66 92 88 72 90 46 C92 22 70 10 50 30 Z" fill={color} />
      <path d="M50 32 C52 18 60 10 72 6" stroke={color} strokeWidth={7} fill="none" strokeLinecap="round" /></g>);
  } else if (ind === 'driving') {
    body = (<g><circle cx={50} cy={50} r={40} fill="none" stroke={color} strokeWidth={10} /><circle cx={50} cy={50} r={9} fill={color} />
      <path d="M12 50 H41 M59 50 H88 M50 59 V88" stroke={color} strokeWidth={10} strokeLinecap="round" /></g>);
  } else if (ind === 'spa') {
    body = (<g>{[-50, -25, 0, 25, 50].map((a) => <ellipse key={a} cx={50} cy={40} rx={11} ry={30} fill={color} opacity={a === 0 ? 1 : 0.8} transform={`rotate(${a} 50 78)`} />)}
      <rect x={18} y={84} width={64} height={8} rx={4} fill={color} /></g>);
  } else {
    body = (<g><path d="M14 58 L24 32 C26 26 30 24 36 24 H64 C70 24 74 26 76 32 L86 58 V78 H14 Z" fill={color} />
      <rect x={30} y={8} width={40} height={14} rx={3} fill={color} /><circle cx={28} cy={80} r={10} fill={color} /><circle cx={72} cy={80} r={10} fill={color} />
      <rect x={28} y={34} width={44} height={18} rx={3} fill="#FFFFFF55" /></g>);
  }
  return <g transform={`translate(${x} ${y}) scale(${s / 100})`}>{body}</g>;
}

function Phone({ color, x, y, s }: { color: string; x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 100})`}>
      <path d="M28 8 C22 8 14 12 12 20 C8 40 22 66 42 82 C54 92 70 96 82 90 C88 86 92 80 90 74 L86 64 C84 60 80 58 76 60 L64 66 C60 68 56 66 52 62 C44 56 38 48 34 40 C32 36 32 32 36 30 L46 22 C50 20 50 16 48 12 L42 4 C38 0 32 6 28 8 Z" fill={color} />
    </g>
  );
}

function LogoImg({ src, x, y, s, bg }: { src: string; x: number; y: number; s: number; bg?: string }) {
  return (
    <g>
      {bg && <circle cx={x + s / 2} cy={y + s / 2} r={s / 2} fill={bg} />}
      <image href={src} x={x + s * 0.12} y={y + s * 0.12} width={s * 0.76} height={s * 0.76} preserveAspectRatio="xMidYMid meet" />
    </g>
  );
}

function QrCard({ text, label, x, y, w }: { text: string; label: string; x: number; y: number; w: number }) {
  const q = qrPath(text);
  const pad = w * 0.07, qs = w - pad * 2;
  const capH = label.trim() ? w * 0.22 : 0;
  const cap = capH ? fitText(label, { x: x + pad * 0.5, y: y + w - pad * 0.3, w: w - pad, h: capH - pad * 0.3 }, { fam: BODY, wt: 800, fill: '#111111', role: 'qrlabel' }) : null;
  return (
    <g data-role="qr">
      <rect x={x} y={y} width={w} height={w + capH} rx={w * 0.06} fill="#FFFFFF" />
      <path d={q.d} transform={`translate(${x + pad} ${y + pad}) scale(${qs / q.n})`} fill="#111111" />
      {cap?.node}
    </g>
  );
}
const qrH = (w: number, label: string) => w + (label.trim() ? w * 0.22 : 0);

// ---------- vẽ 1 tấm ----------
interface Ctx { panel: CDPanel; p: CDPalette; f: CDFont; d: CDData; spec: CDSpec; logo: string; dir: 1 | -1; paint: string }

/** vệt cong tốc độ: kéo từ đuôi về đầu xe. dir=-1 đầu xe bên trái (hông trái) */
function Swoosh({ w, h, color, color2, dir, y0 = 0.55 }: { w: number; h: number; color: string; color2: string; dir: 1 | -1; y0?: number }) {
  const X = (t: number) => (dir === -1 ? t * w : w - t * w); // t=0 đầu xe
  const a = `M${X(0.28)} ${h} C${X(0.5)} ${h * (y0 + 0.25)} ${X(0.75)} ${h * y0} ${X(1.02)} ${h * (y0 - 0.06)} L${X(1.02)} ${h * (y0 + 0.14)} C${X(0.8)} ${h * (y0 + 0.2)} ${X(0.62)} ${h * 0.95} ${X(0.52)} ${h} Z`;
  const b = `M${X(0.55)} ${h} C${X(0.7)} ${h * (y0 + 0.32)} ${X(0.86)} ${h * (y0 + 0.2)} ${X(1.02)} ${h * (y0 + 0.2)} L${X(1.02)} ${h} Z`;
  return <g data-role="deco"><path d={a} fill={color} /><path d={b} fill={color2} /></g>;
}

function sideBody(c: Ctx): ReactNode {
  const { panel, p, f, d, spec, logo, dir } = c;
  const { w, h, holes } = panel;
  const cut = spec.kind === 'cut';
  const pad = Math.min(w, h) * 0.07;
  const gap = Math.min(w, h) * 0.035;
  const front = (bw: number) => (dir === -1 ? pad : w - pad - bw); // x của khối nằm phía đầu xe
  const hasQr = !!(d.qr || '').trim() && !cut && h >= 900;
  const brandOpts = (fill: string): TextOpts => ({ fam: f.family, wt: f.weight, fill, upper: f.upper, lines: 2, role: 'brand' });
  const ink = p.fg, accInk = p.acc;
  const iconOrLogo = (x: number, y: number, s: number, color: string, bg?: string) => (logo
    ? <LogoImg src={logo} x={x} y={y} s={s} bg={bg ?? (cut ? undefined : '#FFFFFF')} />
    : <Icon ind={spec.industry} color={color} x={x} y={y} s={s} />);
  const place = (b: Box) => avoid(b, holes, gap);
  const out: ReactNode[] = [];

  const hotlineBlock = (b0: Box, fill: string, iconC: string, anchor: 'start' | 'middle' = 'middle') => {
    const b = place(b0);
    if (!(d.hotline || '').trim() || b.w < 50 || b.h < 30) return null;
    const ic = Math.min(b.h * 0.7, b.w * 0.14);
    const g2 = ic * 0.2;
    const t = fitText(d.hotline, { x: b.x + ic + g2, y: b.y, w: b.w - ic - g2, h: b.h }, { fam: NUM, wt: 700, fill, anchor: 'start', ls: 0.01, role: 'hotline' });
    const total = ic + g2 + t.w;
    const shift = anchor === 'middle' ? Math.max(0, (b.w - total) / 2) : dir === 1 && anchor === 'start' ? Math.max(0, b.w - total) : 0;
    return <g transform={`translate(${shift} 0)`}><Phone color={iconC} x={b.x} y={b.y + (b.h - ic) / 2} s={ic} />{t.node}</g>;
  };
  const anchorFront: 'start' | 'end' = dir === -1 ? 'start' : 'end';

  if (spec.layout === 'band') {
    const bandY = h * 0.5, bandH = h * 0.2;
    out.push(<rect key="band" x={0} y={bandY} width={w} height={bandH} fill={p.acc} data-role="deco" />);
    const ic = Math.min(h * 0.36, w * 0.14);
    out.push(<g key="ic">{iconOrLogo(front(ic), pad + (bandY - pad - ic) / 2 - gap * 0.2, ic, accInk)}</g>);
    const bx = dir === -1 ? pad + ic + gap * 1.5 : pad;
    out.push(<g key="b">{fitText(d.brand || '', place({ x: bx, y: pad * 0.6, w: w - pad * 2 - ic - gap * 1.5, h: bandY - pad * 0.6 - gap }), { ...brandOpts(ink), anchor: anchorFront }).node}</g>);
    out.push(<g key="s">{fitText(d.services || '', place({ x: pad, y: bandY + bandH * 0.12, w: w - pad * 2, h: bandH * 0.76 }), { fam: BODY, wt: 800, fill: cut ? c.paint : p.onAcc, upper: true, ls: 0.02, role: 'services' }).node}</g>);
    const qw = hasQr ? Math.min(h * 0.24, w * 0.12) : 0;
    const by = bandY + bandH + gap;
    out.push(<g key="h">{hotlineBlock({ x: pad + (hasQr && dir === 1 ? qw + gap : 0), y: by, w: w - pad * 2 - (hasQr ? qw + gap : 0), h: h - pad * 0.6 - by }, ink, accInk)}</g>);
    if (hasQr) { const qy = h - pad * 0.5 - qrH(qw, d.qrLabel || ''); const qx = dir === -1 ? w - pad - qw : pad; out.push(<QrCard key="qr" text={d.qr} label={d.qrLabel || ''} x={qx} y={qy} w={qw} />); }
    return out;
  }

  if (spec.layout === 'block') {
    const bw = w * 0.27;
    const bx = dir === -1 ? 0 : w - bw;
    out.push(<rect key="blk" x={bx} y={0} width={bw} height={h} fill={p.acc} data-role="deco" />);
    const ic = Math.min(bw * 0.55, h * 0.36);
    const icx = bx + (bw - ic) / 2;
    out.push(<g key="ic">{iconOrLogo(icx, h * 0.1, ic, cut ? c.paint : p.onAcc, cut ? undefined : '#FFFFFF')}</g>);
    const qw = hasQr ? Math.min(bw * 0.58, h * 0.3) : 0;
    if (hasQr) out.push(<QrCard key="qr" text={d.qr} label={d.qrLabel || ''} x={bx + (bw - qw) / 2} y={h - pad * 0.6 - qrH(qw, d.qrLabel || '')} w={qw} />);
    else out.push(<g key="sl">{fitText(d.slogan || '', place({ x: bx + bw * 0.08, y: h * 0.1 + ic + gap, w: bw * 0.84, h: h * 0.22 }), { fam: BODY, wt: 800, fill: cut ? c.paint : p.onAcc, lines: 2, role: 'slogan' }).node}</g>);
    const rx = dir === -1 ? bw + pad : pad, rw = w - bw - pad * 2;
    out.push(<g key="b">{fitText(d.brand || '', place({ x: rx, y: pad * 0.6, w: rw, h: h * 0.36 }), { ...brandOpts(ink), anchor: anchorFront }).node}</g>);
    out.push(<g key="s">{fitText(d.services || '', place({ x: rx, y: pad * 0.6 + h * 0.38, w: rw, h: h * 0.13 }), { fam: BODY, wt: 800, fill: accInk, upper: true, ls: 0.02, anchor: anchorFront, role: 'services' }).node}</g>);
    out.push(<g key="h">{hotlineBlock({ x: rx, y: h * 0.6, w: rw, h: h * 0.24 }, ink, accInk, 'start')}</g>);
    out.push(<g key="wb">{fitText(d.web || '', place({ x: rx, y: h * 0.86, w: rw, h: h * 0.09 }), { fam: BODY, wt: 600, fill: p.sub, anchor: anchorFront, role: 'web' }).node}</g>);
    return out;
  }

  if (spec.layout === 'wave') {
    const wy = h * 0.66;
    const X = (t: number) => (dir === -1 ? t * w : w - t * w);
    const wave = `M${X(0)} ${wy + h * 0.08} C${X(0.22)} ${wy - h * 0.06} ${X(0.42)} ${wy + h * 0.14} ${X(0.62)} ${wy + h * 0.02} S${X(0.9)} ${wy - h * 0.1} ${X(1.02)} ${wy} L${X(1.02)} ${h + 2} L${X(0)} ${h + 2} Z`;
    out.push(<path key="wv" d={wave} fill={p.acc} data-role="deco" />);
    out.push(<path key="wv2" d={wave} fill="none" stroke={p.acc} strokeWidth={h * 0.02} transform={`translate(0 ${-h * 0.05})`} opacity={0.5} data-role="deco" />);
    const ic = Math.min(h * 0.3, w * 0.12);
    out.push(<g key="ic">{iconOrLogo(front(ic), pad * 0.8, ic, accInk)}</g>);
    const bx = dir === -1 ? pad + ic + gap * 1.5 : pad;
    out.push(<g key="b">{fitText(d.brand || '', place({ x: bx, y: pad * 0.6, w: w - pad * 2 - ic - gap * 1.5, h: h * 0.34 }), { ...brandOpts(ink), anchor: anchorFront }).node}</g>);
    out.push(<g key="sl">{fitText(d.slogan || '', place({ x: bx, y: pad * 0.6 + h * 0.35, w: w - pad * 2 - ic - gap * 1.5, h: h * 0.1 }), { fam: BODY, wt: 800, fill: accInk, anchor: anchorFront, role: 'slogan' }).node}</g>);
    out.push(<g key="s">{fitText(d.services || '', place({ x: pad, y: h * 0.5, w: w - pad * 2, h: h * 0.09 }), { fam: BODY, wt: 600, fill: p.sub, role: 'services' }).node}</g>);
    out.push(<g key="h">{hotlineBlock({ x: pad, y: wy + h * 0.1, w: w - pad * 2, h: h - wy - h * 0.1 - pad * 0.4 }, cut ? c.paint : p.onAcc, cut ? c.paint : p.onAcc)}</g>);
    return out;
  }

  if (spec.layout === 'minimal') {
    const ic = Math.min(h * 0.4, w * 0.13);
    out.push(<g key="ic">{iconOrLogo(front(ic), (h * 0.62 - ic) / 2, ic, accInk)}</g>);
    const bx = dir === -1 ? pad + ic + gap * 1.5 : pad;
    out.push(<g key="b">{fitText(d.brand || '', place({ x: bx, y: pad * 0.5, w: w - pad * 2 - ic - gap * 1.5, h: h * 0.46 }), { ...brandOpts(ink), anchor: anchorFront }).node}</g>);
    out.push(<rect key="ln" x={bx + (dir === 1 ? (w - pad * 2 - ic - gap * 1.5) * 0.2 : 0)} y={h * 0.55} width={(w - pad * 2 - ic - gap * 1.5) * 0.8} height={Math.max(8, h * 0.018)} fill={p.acc} data-role="deco" />);
    out.push(<g key="h">{hotlineBlock({ x: pad, y: h * 0.62, w: w - pad * 2, h: h * 0.3 }, accInk, accInk)}</g>);
    return out;
  }

  // swoosh (mặc định)
  out.push(<Swoosh key="sw" w={w} h={h} color={p.acc} color2={p.fg} dir={dir} />);
  const ic = Math.min(h * 0.3, w * 0.12);
  out.push(<g key="ic">{iconOrLogo(front(ic), pad * 0.8, ic, accInk)}</g>);
  const bx = dir === -1 ? pad + ic + gap * 1.5 : pad;
  const bw = w * 0.78 - ic - gap * 1.5;
  const brandX = dir === -1 ? bx : w - pad - ic - gap * 1.5 - bw;
  out.push(<g key="b">{fitText(d.brand || '', place({ x: brandX, y: pad * 0.6, w: bw, h: h * 0.34 }), { ...brandOpts(ink), anchor: anchorFront }).node}</g>);
  out.push(<g key="sl">{fitText(d.slogan || '', place({ x: brandX, y: pad * 0.6 + h * 0.35, w: bw, h: h * 0.1 }), { fam: BODY, wt: 800, fill: accInk, anchor: anchorFront, role: 'slogan' }).node}</g>);
  out.push(<g key="s">{fitText(d.services || '', place({ x: dir === -1 ? pad : w * 0.32, y: h * 0.52, w: w * 0.68 - pad, h: h * 0.08 }), { fam: BODY, wt: 600, fill: p.sub, anchor: anchorFront, role: 'services' }).node}</g>);
  const hx = dir === -1 ? pad : w * 0.45;
  out.push(<g key="h">{hotlineBlock({ x: hx, y: h * 0.63, w: w * 0.55 - pad, h: h * 0.24 }, ink, accInk, 'start')}</g>);
  return out;
}

function rearBody(c: Ctx): ReactNode {
  const { panel, p, f, d, spec, logo } = c;
  const { w, h, holes } = panel;
  const cut = spec.kind === 'cut';
  const pad = Math.min(w, h) * 0.07, gap = Math.min(w, h) * 0.04;
  const place = (b: Box) => avoid(b, holes, gap);
  const out: ReactNode[] = [];
  if (!cut && spec.layout !== 'minimal') out.push(<rect key="bt" x={0} y={h * 0.84} width={w} height={h * 0.16} fill={p.acc} data-role="deco" />);
  const ic = Math.min(h * 0.22, w * 0.16);
  const top = place({ x: pad, y: pad * 0.6, w: w - pad * 2, h: h * 0.3 });
  out.push(<g key="ic">{logo ? <LogoImg src={logo} x={top.x} y={top.y + (top.h - ic) / 2} s={ic} bg={cut ? undefined : '#FFFFFF'} /> : <Icon ind={spec.industry} color={p.acc} x={top.x} y={top.y + (top.h - ic) / 2} s={ic} />}</g>);
  out.push(<g key="b">{fitText(d.brand || '', { x: top.x + ic + gap, y: top.y, w: top.w - ic - gap, h: top.h }, { fam: f.family, wt: f.weight, fill: p.fg, upper: f.upper, lines: 2, anchor: 'start', role: 'brand' }).node}</g>);
  out.push(<g key="s">{fitText(d.services || '', place({ x: pad, y: pad * 0.6 + h * 0.32, w: w - pad * 2, h: h * 0.1 }), { fam: BODY, wt: 800, fill: p.acc, upper: true, ls: 0.02, role: 'services' }).node}</g>);
  // hotline: giữa đuôi (tránh tay khoá / biển số)
  const hb = place({ x: pad, y: h * 0.45, w: w - pad * 2, h: h * 0.34 });
  if ((d.hotline || '').trim() && hb.w > 40 && hb.h > 20) {
    const icp = Math.min(hb.h * 0.6, hb.w * 0.14);
    const t = fitText(d.hotline, { x: hb.x + icp * 1.2, y: hb.y, w: hb.w - icp * 1.2, h: hb.h }, { fam: NUM, wt: 700, fill: p.fg, anchor: 'start', ls: 0.01, role: 'hotline' });
    const shift = Math.max(0, (hb.w - icp * 1.2 - t.w) / 2);
    out.push(<g key="h" transform={`translate(${shift} 0)`}><Phone color={p.acc} x={hb.x} y={hb.y + (hb.h - icp) / 2} s={icp} />{t.node}</g>);
  }
  out.push(<g key="w">{fitText(d.web || '', place({ x: pad, y: h * 0.86, w: w - pad * 2, h: h * 0.12 }), { fam: BODY, wt: 800, fill: cut || spec.layout === 'minimal' ? p.sub : p.onAcc, role: 'web' }).node}</g>);
  return out;
}

function hoodBody(c: Ctx): ReactNode {
  const { panel, p, f, d, spec, logo } = c;
  const { w, h } = panel;
  const ic = Math.min(h * 0.42, w * 0.3);
  return [
    <g key="ic">{logo ? <LogoImg src={logo} x={(w - ic) / 2} y={h * 0.08} s={ic} bg={spec.kind === 'cut' ? undefined : '#FFFFFF'} /> : <Icon ind={spec.industry} color={p.acc} x={(w - ic) / 2} y={h * 0.08} s={ic} />}</g>,
    <g key="b">{fitText(d.brand || '', { x: w * 0.08, y: h * 0.56, w: w * 0.84, h: h * 0.24 }, { fam: f.family, wt: f.weight, fill: p.fg, upper: f.upper, lines: 2, role: 'brand' }).node}</g>,
    <g key="h">{fitText(d.hotline || '', { x: w * 0.2, y: h * 0.81, w: w * 0.6, h: h * 0.13 }, { fam: NUM, wt: 700, fill: p.acc, role: 'hotline' }).node}</g>,
  ];
}

function zonePath(z: CDZone): string {
  if (z.kind === 'circle') {
    const r = z.r!, cx = z.x + r, cy = z.y + r;
    return `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${r * 2} 0 a${r} ${r} 0 1 0 ${-r * 2} 0 Z`;
  }
  const rr = Math.min(z.w, z.h) * 0.18;
  return `M${z.x + rr} ${z.y} H${z.x + z.w - rr} Q${z.x + z.w} ${z.y} ${z.x + z.w} ${z.y + rr} V${z.y + z.h - rr} Q${z.x + z.w} ${z.y + z.h} ${z.x + z.w - rr} ${z.y + z.h} H${z.x + rr} Q${z.x} ${z.y + z.h} ${z.x} ${z.y + z.h - rr} V${z.y + rr} Q${z.x} ${z.y} ${z.x + rr} ${z.y} Z`;
}

let uid = 0;
export function CarDecalSvg({ spec, data, panel, logo = '', mode = 'preview', style }: {
  spec: CDSpec; data: CDData; panel: CDPanelId; logo?: string; mode?: CDMode; style?: CSSProperties;
}) {
  const [id] = useState(() => `cd${++uid}`);
  const pn = cdPanel(spec.vehicle, panel, spec.hood);
  const { w, h } = pn;
  const p = cdPalette(spec.palette), f = cdFont(spec.font);
  const paint = CD_PAINTS.find((x) => x.id === spec.paint)?.color ?? p.paint;
  const b = mode === 'print' ? CD_BLEED_MM : 0;
  const cut = spec.kind === 'cut';
  const dir: 1 | -1 = panel === 'right' ? 1 : -1;
  const ctx: Ctx = { panel: pn, p, f, d: data, spec, logo, dir, paint };
  const body = panel === 'rear' ? rearBody(ctx) : panel === 'hood' ? hoodBody(ctx) : sideBody(ctx);
  // vùng in = tấm − vùng không in (evenodd)
  const panelD = `M${-b} ${-b} H${w + b} V${h + b} H${-b} Z ` + pn.holes.map(zonePath).join(' ');
  const showPaint = mode === 'preview' || mode === 'mock';
  const sw = Math.max(1.5, Math.min(w, h) * 0.003);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`${-b} ${-b} ${w + b * 2} ${h + b * 2}`} width={`${w + b * 2}mm`} height={`${h + b * 2}mm`}
      style={style} data-panel={panel} data-w={w} data-h={h} data-kind={spec.kind}>
      <defs>
        <clipPath id={`${id}-c`}><path d={panelD} clipRule="evenodd" /></clipPath>
        <pattern id={`${id}-hatch`} width={40} height={40} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width={40} height={40} fill="#5A6170" /><rect width={14} height={40} fill="#737B8C" />
        </pattern>
      </defs>
      {showPaint && <rect x={0} y={0} width={w} height={h} fill={paint} />}
      <g id="In" clipPath={`url(#${id}-c)`}>
        {!cut && <rect x={-b} y={-b} width={w + b * 2} height={h + b * 2} fill={p.bg} />}
        {body}
      </g>
      {/* đường cắt: tấm + vùng khoét; decal cắt chữ: cắt theo nét mọi chi tiết */}
      {mode === 'print' && (
        <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth={0.5}>
          {!cut && <rect x={0} y={0} width={w} height={h} />}
          {!cut && pn.holes.map((z, i) => <path key={i} d={zonePath(z)} />)}
          {cut && <g clipPath={`url(#${id}-c)`}>{body}</g>}
        </g>
      )}
      {mode === 'print' && pn.seams.length > 0 && (
        <g id="KheCua" stroke="#00A0FF" strokeWidth={0.6} strokeDasharray="12 8">
          {pn.seams.map((s, i) => <line key={i} x1={s} y1={0} x2={s} y2={h} />)}
        </g>
      )}
      {mode === 'preview' && (
        <g data-role="zones">
          {pn.holes.map((z, i) => (
            <g key={i}>
              <path d={zonePath(z)} fill={`url(#${id}-hatch)`} opacity={0.85} />
              <path d={zonePath(z)} fill="none" stroke="#1F2430" strokeWidth={sw * 1.6} strokeDasharray={`${sw * 6} ${sw * 4}`} />
            </g>
          ))}
          {pn.seams.map((s, i) => <line key={i} x1={s} y1={0} x2={s} y2={h} stroke="#1F2430" strokeOpacity={0.45} strokeWidth={sw * 1.4} strokeDasharray={`${sw * 8} ${sw * 6}`} />)}
          <rect x={0} y={0} width={w} height={h} fill="none" stroke="#000" strokeOpacity={0.25} strokeWidth={sw * 1.2} />
        </g>
      )}
    </svg>
  );
}
