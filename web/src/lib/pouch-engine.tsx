'use client';
// Túi zip đứng (doypack) / bao bì màng ghép: 1 engine SVG = BỐ CỤC × NGÀNH × BẢNG MÀU × FONT × CHẤT LIỆU → nhiều mẫu,
// render code 100% (0 AI realtime). Đơn vị vẽ = 1mm. Mỗi mặt túi có vùng hàn (2 bên + mép trên), khoá zip, vết xé,
// lỗ treo, đáy gusset (bế tròn) → chữ luôn nằm trong VÙNG AN TOÀN, không lấn vào mép hàn.
// Cửa sổ trong / lỗ treo / vết xé = vùng KHÔNG IN (cắt alpha) → bản 3D nhìn xuyên thấy hạt bên trong.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ ----------
export interface PCSize { id: string; name: string; wMm: number; hMm: number; gMm: number }
export const PC_SIZES: PCSize[] = [
  { id: '12x20', name: '12×20 cm', wMm: 120, hMm: 200, gMm: 35 },
  { id: '15x22', name: '15×22 cm', wMm: 150, hMm: 220, gMm: 40 },
  { id: '18x26', name: '18×26 cm', wMm: 180, hMm: 260, gMm: 45 },
  { id: '20x30', name: '20×30 cm', wMm: 200, hMm: 300, gMm: 50 },
];
export const pcSize = (id: string) => PC_SIZES.find((s) => s.id === id) || PC_SIZES[1];
export const PC_BLEED_MM = 3;

// ---------- chất liệu ----------
export type PCMaterial = 'foil' | 'white' | 'matte' | 'kraft' | 'clear';
export const PC_MATERIALS: { id: PCMaterial; name: string; note: string }[] = [
  { id: 'foil', name: 'Màng bạc', note: 'metalized, bóng ánh kim, chắn sáng tốt' },
  { id: 'white', name: 'Màng trắng bóng', note: 'màu in tươi, bóng' },
  { id: 'matte', name: 'Màng mờ', note: 'matte sang, ít bám vân tay' },
  { id: 'kraft', name: 'Giấy kraft', note: 'mộc, thân thiện — nền giấy không in' },
  { id: 'clear', name: 'Màng trong', note: 'nhìn thấy sản phẩm, in nhãn trắng' },
];
export const KRAFT = '#C9A67E';

export type PCWindow = 'none' | 'oval' | 'rect' | 'arch';
export const PC_WINDOWS: { id: PCWindow; name: string }[] = [
  { id: 'none', name: 'Không' }, { id: 'oval', name: 'Bầu dục' }, { id: 'rect', name: 'Chữ nhật' }, { id: 'arch', name: 'Vòm' },
];

// ---------- ngành (hình vẽ code + hạt bên trong bản 3D) ----------
export type PCIndustry = 'coffee' | 'nuts' | 'tea' | 'candy' | 'cosmetic' | 'pet';
export const PC_INDUSTRIES: { id: PCIndustry; name: string }[] = [
  { id: 'coffee', name: 'Cà phê' }, { id: 'nuts', name: 'Hạt dinh dưỡng' }, { id: 'tea', name: 'Trà' },
  { id: 'candy', name: 'Bánh kẹo' }, { id: 'cosmetic', name: 'Mỹ phẩm' }, { id: 'pet', name: 'Thú cưng' },
];

// ---------- font (chỉ font có TTF ở /public/fonts → file in outline được) ----------
export interface PCFont { id: string; name: string; family: string; weight: number }
export const PC_FONTS: PCFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'baloo', name: 'Baloo', family: 'Baloo 2', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const pcFont = (id: string) => PC_FONTS.find((f) => f.id === id) || PC_FONTS[0];
const BODY = 'Be Vietnam Pro';

export const PC_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Baloo+2:wght@800&family=Oswald:wght@700&display=swap');`;

export function usePCFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-pc-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-pc-fonts'; link.rel = 'stylesheet';
        link.href = PC_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...PC_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export interface PCPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; onAccent: string; panel: string; panelInk: string }
export const PC_PALETTES: PCPalette[] = [
  { id: 'espresso', name: 'Nâu espresso', bg: '#2B1D16', bg2: '#3D2A1F', ink: '#F3E7D3', sub: '#CDB89A', accent: '#C8913E', onAccent: '#2B1D16', panel: '#F3E7D3', panelInk: '#2B1D16' },
  { id: 'kraft', name: 'Mộc kraft', bg: '#E9DCC6', bg2: '#D8C3A0', ink: '#2E1D10', sub: '#5A3E22', accent: '#2F5D3A', onAccent: '#F7F1E3', panel: '#F7F1E3', panelInk: '#2E1D10' },
  { id: 'matcha', name: 'Matcha', bg: '#E9F0DF', bg2: '#D2E2BD', ink: '#1E3A23', sub: '#4F6B50', accent: '#3E7B45', onAccent: '#FFFFFF', panel: '#FFFFFF', panelInk: '#1E3A23' },
  { id: 'forest', name: 'Rừng', bg: '#1F3D2B', bg2: '#2C5239', ink: '#F2EBD9', sub: '#C9D6B8', accent: '#D9A441', onAccent: '#1F3D2B', panel: '#F2EBD9', panelInk: '#1F3D2B' },
  { id: 'berry', name: 'Hồng dâu', bg: '#FFE3EC', bg2: '#FFC2D6', ink: '#5A1630', sub: '#8E4A63', accent: '#E0336F', onAccent: '#FFFFFF', panel: '#FFFFFF', panelInk: '#5A1630' },
  { id: 'sunny', name: 'Vàng nắng', bg: '#FFE7A3', bg2: '#FFD45C', ink: '#3B2306', sub: '#6B4A1E', accent: '#E85D04', onAccent: '#FFFFFF', panel: '#FFF8E6', panelInk: '#3B2306' },
  { id: 'pearl', name: 'Ngọc trai', bg: '#FAF7F2', bg2: '#EFE5D8', ink: '#3A2E2A', sub: '#8A7A70', accent: '#B08D57', onAccent: '#FFFFFF', panel: '#FFFFFF', panelInk: '#3A2E2A' },
  { id: 'rose', name: 'Hồng nude', bg: '#F4DCD6', bg2: '#E9C3B9', ink: '#5A2E28', sub: '#8D5F57', accent: '#A64B3A', onAccent: '#FFFFFF', panel: '#FFF6F3', panelInk: '#5A2E28' },
  { id: 'tangerine', name: 'Cam', bg: '#FF8A3D', bg2: '#FF6F1F', ink: '#FFFFFF', sub: '#FFE6D2', accent: '#1D3557', onAccent: '#FFFFFF', panel: '#FFFFFF', panelInk: '#1D3557' },
  { id: 'navy', name: 'Navy', bg: '#16284A', bg2: '#1F3A68', ink: '#FFFFFF', sub: '#BFD0EA', accent: '#F2C14E', onAccent: '#16284A', panel: '#FFFFFF', panelInk: '#16284A' },
];
export const pcPalette = (id: string) => PC_PALETTES.find((p) => p.id === id) || PC_PALETTES[0];

export const isDarkHex = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 128;
};
// màu thực in theo chất liệu: kraft = nền giấy (không in) → mực phải tối
function effPalette(p: PCPalette, m: PCMaterial): PCPalette {
  if (m !== 'kraft') return p;
  const ink = isDarkHex(p.ink) ? p.ink : isDarkHex(p.bg) ? p.bg : '#2E1D10';
  const sub = isDarkHex(p.sub) ? p.sub : '#5A3E22';
  return { ...p, bg: KRAFT, bg2: '#B88F61', ink, sub };
}

// ---------- bố cục + mẫu ----------
export type PCLayout = 'band' | 'label' | 'split' | 'minimal' | 'pattern';
export const PC_LAYOUTS: { id: PCLayout; name: string }[] = [
  { id: 'band', name: 'Cổ điển' }, { id: 'label', name: 'Nhãn giữa' }, { id: 'split', name: 'Chia khối' },
  { id: 'minimal', name: 'Tối giản' }, { id: 'pattern', name: 'Hoạ tiết' },
];

export interface PCSpec {
  layout: PCLayout; palette: string; font: string; industry: PCIndustry; material: PCMaterial;
  window: PCWindow; euro: boolean; notch: boolean; valve: boolean; size: string;
}
export interface PCTemplate { id: string; name: string; spec: Omit<PCSpec, 'size' | 'euro' | 'notch'> }
const tpl = (industry: PCIndustry, layout: PCLayout, palette: string, font: string, material: PCMaterial, window: PCWindow, valve = false): PCTemplate => ({
  id: `${industry}-${layout}-${palette}`,
  name: `${PC_INDUSTRIES.find((i) => i.id === industry)!.name} · ${PC_LAYOUTS.find((l) => l.id === layout)!.name}`,
  spec: { industry, layout, palette, font, material, window, valve },
});
export const PC_TEMPLATES: PCTemplate[] = [
  tpl('coffee', 'band', 'espresso', 'playfair', 'foil', 'none', true),
  tpl('coffee', 'pattern', 'kraft', 'oswald', 'kraft', 'rect', true),
  tpl('nuts', 'label', 'kraft', 'playfair', 'kraft', 'oval'),
  tpl('nuts', 'split', 'forest', 'montserrat', 'matte', 'rect'),
  tpl('tea', 'pattern', 'matcha', 'cormorant', 'matte', 'arch'),
  tpl('tea', 'label', 'forest', 'cormorant', 'foil', 'none'),
  tpl('candy', 'split', 'berry', 'baloo', 'white', 'oval'),
  tpl('candy', 'pattern', 'sunny', 'baloo', 'clear', 'none'),
  tpl('cosmetic', 'minimal', 'pearl', 'cormorant', 'matte', 'none'),
  tpl('cosmetic', 'minimal', 'rose', 'playfair', 'foil', 'arch'),
  tpl('pet', 'split', 'tangerine', 'baloo', 'white', 'none'),
  tpl('pet', 'band', 'navy', 'montserrat', 'matte', 'oval'),
];

// ---------- nội dung ----------
export type PCData = Record<string, string>;
export interface PCField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; back?: boolean }
export const PC_FIELDS: PCField[] = [
  { key: 'brand', label: 'Thương hiệu', ph: 'MỘC SƠN COFFEE', half: true },
  { key: 'net', label: 'Khối lượng tịnh', ph: 'NET 500g', half: true },
  { key: 'name', label: 'Tên sản phẩm', ph: 'Cà phê Robusta rang mộc' },
  { key: 'desc', label: 'Mô tả ngắn', ph: 'Đậm vị · Hậu ngọt · Rang củi' },
  { key: 'badges', label: 'Huy hiệu (mỗi dòng 1 ý, tối đa 3)', ph: '100% nguyên chất\nRang mộc\nCầu Đất', multiline: true },
  { key: 'ingredients', label: 'Thành phần', ph: 'Hạt cà phê Robusta 100%', back: true },
  { key: 'usage', label: 'Hướng dẫn sử dụng', ph: 'Pha phin 20g với 70ml nước sôi…', multiline: true, back: true },
  { key: 'storage', label: 'Bảo quản', ph: 'Đóng kín khoá zip, nơi khô ráo…', back: true },
  { key: 'maker', label: 'Nhà sản xuất', ph: 'Công ty TNHH Thực phẩm An Khang', back: true },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM', back: true },
  { key: 'hotline', label: 'Hotline', ph: '0909 123 456', half: true, back: true },
  { key: 'website', label: 'Website', ph: 'ankhangfoods.vn', half: true, back: true },
  { key: 'barcode', label: 'Mã vạch EAN-13 (12–13 số)', ph: '893601234567', half: true, back: true },
];
const COMMON = { maker: 'Công ty TNHH Thực phẩm An Khang', address: '12 Nguyễn Huệ, Q.1, TP.HCM', hotline: '0909 123 456', website: 'ankhangfoods.vn', barcode: '893601234567' };
export const PC_SAMPLES: Record<PCIndustry, PCData> = {
  coffee: { ...COMMON, brand: 'MỘC SƠN COFFEE', name: 'Cà phê Robusta rang mộc', desc: 'Đậm vị · Hậu ngọt · Rang củi', net: 'NET 500g', badges: '100% nguyên chất\nRang mộc\nCầu Đất', ingredients: 'Hạt cà phê Robusta Cầu Đất 100%, rang mộc không tẩm.', usage: 'Pha phin: 20g cà phê + 70ml nước sôi 92–95°C, ủ 4–5 phút. Pha máy: xay mịn, 18g cho 1 shot.', storage: 'Đóng kín khoá zip sau khi dùng. Để nơi khô ráo, tránh ánh nắng.' },
  nuts: { ...COMMON, brand: 'HẠT NHÀ AN', name: 'Hạt điều rang muối', desc: 'Bình Phước · Size A+ · Còn vỏ lụa', net: 'NET 250g', badges: 'Không chất bảo quản\nRang củi\nGiòn tan', ingredients: 'Hạt điều Bình Phước, muối biển.', usage: 'Dùng ngay sau khi mở túi. Ngon hơn khi ăn kèm trà hoặc cà phê.', storage: 'Đóng kín khoá zip, nơi khô ráo, thoáng mát.' },
  tea: { ...COMMON, brand: 'TRÀ THÁI AN', name: 'Trà xanh Tân Cương', desc: 'Búp non · Sao tay · Nước xanh', net: 'NET 200g', badges: 'Búp 1 tôm 2 lá\nSao thủ công\nThái Nguyên', ingredients: 'Búp chè xanh Tân Cương 100%.', usage: 'Tráng ấm, cho 5–7g trà, rót nước 80–85°C, hãm 1–2 phút.', storage: 'Đóng kín khoá zip, tránh ẩm và mùi lạ.' },
  candy: { ...COMMON, brand: 'BÉ NGỌT', name: 'Kẹo dẻo trái cây', desc: 'Vị dâu · cam · nho', net: 'NET 150g', badges: 'Nước ép thật\nKhông phẩm màu\nBé mê', ingredients: 'Đường, siro glucose, gelatin, nước ép dâu/cam/nho, axit citric.', usage: 'Dùng trực tiếp. Không dùng cho trẻ dưới 3 tuổi.', storage: 'Nơi khô mát, dưới 30°C. Đóng kín sau khi mở.' },
  cosmetic: { ...COMMON, brand: 'LÀNH', name: 'Bột tắm trắng thảo mộc', desc: 'Cám gạo · Nghệ · Yến mạch', net: 'NET 100g', badges: 'Thuần chay\nKhông paraben\nThủ công', ingredients: 'Bột cám gạo, nghệ vàng, yến mạch, sữa dê, tinh dầu cam.', usage: 'Trộn 2 thìa bột với sữa tươi hoặc nước, thoa đều, massage 10 phút rồi tắm sạch.', storage: 'Đóng kín khoá zip, nơi khô ráo.', maker: 'Cơ sở mỹ phẩm Lành', website: 'lanh.vn' },
  pet: { ...COMMON, brand: 'MEO MEO', name: 'Hạt cho mèo vị cá hồi', desc: 'Cho mèo mọi lứa tuổi', net: 'NET 1kg', badges: 'Giàu Omega 3\nLông mượt\nDễ tiêu hoá', ingredients: 'Cá hồi, gạo, bột gà, dầu cá, vitamin & khoáng chất.', usage: 'Mèo 3–5kg: 50–70g/ngày, chia 2 bữa. Luôn để sẵn nước sạch.', storage: 'Đóng kín khoá zip sau khi dùng, nơi khô ráo.', maker: 'Công ty TNHH Pet An Khang', website: 'meomeo.vn' },
};
export const defaultPCData = (ind: PCIndustry = 'coffee'): PCData => ({ ...PC_SAMPLES[ind] });

// ---------- hình học 1 mặt túi (mm, gốc góc trên-trái, y xuống) ----------
export interface PCGeom {
  W: number; H: number; G: number; seal: number; topSeal: number; tearY: number; zipY: number;
  euro: { cx: number; cy: number } | null; notch: boolean; bottomY: number;
  safe: { x0: number; y0: number; x1: number; y1: number };
  valve: { cx: number; cy: number; r: number } | null;
}
export function pouchGeom(spec: Pick<PCSpec, 'size' | 'euro' | 'notch' | 'valve'>): PCGeom {
  const sz = pcSize(spec.size);
  const W = sz.wMm, H = sz.hMm, G = sz.gMm;
  const seal = 8;
  const topSeal = spec.euro ? 20 : 11;
  const tearY = topSeal + 5;
  const zipY = tearY + 9;
  const bottomY = H - G / 2; // đường hàn đáy (giữa) — dưới mức này gấp vào đáy
  const safe = { x0: seal + 4, y0: zipY + 6, x1: W - seal - 4, y1: bottomY - 4 };
  const valve = spec.valve ? { cx: W / 2, cy: zipY + 12, r: 8 } : null;
  if (valve) safe.y0 = valve.cy + valve.r + 4;
  return { W, H, G, seal, topSeal, tearY, zipY, euro: spec.euro ? { cx: W / 2, cy: topSeal * 0.5 } : null, notch: spec.notch, bottomY, safe, valve };
}

// đường cắt (không in): lỗ treo, vết xé — dạng path SVG (mm) để dùng chung cho mask 2D + alpha 3D
export function holePaths(g: PCGeom): string[] {
  const out: string[] = [];
  if (g.euro) {
    const { cx, cy } = g.euro, hw = 16, hh = 3, r = 5.5;
    // lỗ treo euro: rãnh ngang bo tròn + vòng giữa
    out.push(`M${cx - hw + hh},${cy - hh} L${cx - r * 0.86},${cy - hh} A${r},${r} 0 0 1 ${cx + r * 0.86},${cy - hh} L${cx + hw - hh},${cy - hh} A${hh},${hh} 0 0 1 ${cx + hw - hh},${cy + hh} L${cx + r * 0.86},${cy + hh} A${r},${r} 0 0 1 ${cx - r * 0.86},${cy + hh} L${cx - hw + hh},${cy + hh} A${hh},${hh} 0 0 1 ${cx - hw + hh},${cy - hh} Z`);
  }
  if (g.notch) {
    out.push(`M-0.5,${g.tearY - 2} L4,${g.tearY} L-0.5,${g.tearY + 2} Z`);
    out.push(`M${g.W + 0.5},${g.tearY - 2} L${g.W - 4},${g.tearY} L${g.W + 0.5},${g.tearY + 2} Z`);
  }
  return out;
}

// ---------- đo chữ thật (đơn vị mm: đo ở 100px rồi quy đổi) ----------
interface TS { fam: string; wt: number; ls?: number }
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, ts: TS): number {
  const s = t || '';
  const ls = (ts.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.6 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.6 + ls;
  mctx.font = `${ts.wt} 100px "${ts.fam}"`;
  return (mctx.measureText(s).width * size) / 100 + ls;
}
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || textW(next, size, ts) <= maxW) cur = next;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** co chữ tới khi ≤ maxLines dòng và mọi dòng vừa bề rộng; cân dòng tránh chữ mồ côi */
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  const tooWide = () => lines.some((l) => textW(l, s, ts) > maxW + 0.01);
  while ((lines.length > maxLines || tooWide()) && s > size * 0.3) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  // dòng nào vẫn quá rộng (1 từ rất dài) → co cả khối
  const widest = Math.max(0, ...lines.map((l) => textW(l, s, ts)));
  if (widest > maxW) s *= maxW / widest;
  return { lines, size: s };
}
const ASC = 0.95, DESC = 0.3;
const blockH = (n: number, size: number, lh: number) => (n ? size * (ASC + DESC) + (n - 1) * size * lh : 0);

type Anchor = 'start' | 'middle' | 'end';
function Lines({ lines, x, y, size, lh = 1.15, ts, fill, anchor = 'middle', op }: { lines: string[]; x: number; y: number; size: number; lh?: number; ts: TS; fill: string; anchor?: Anchor; op?: number }) {
  return (
    <g fontFamily={`"${ts.fam}"`} fontWeight={ts.wt} fontSize={size} fill={fill} textAnchor={anchor} letterSpacing={ts.ls ? ts.ls * size : undefined} opacity={op}>
      {lines.map((l, i) => <text key={i} x={x} y={y + size * ASC + i * size * lh}>{l}</text>)}
    </g>
  );
}

// ---------- hình vẽ code theo ngành ----------
function Icon({ ind, x, y, r, rot = 0, color, detail }: { ind: PCIndustry; x: number; y: number; r: number; rot?: number; color: string; detail: string }) {
  const sw = 0.12;
  let body: ReactNode;
  switch (ind) {
    case 'coffee':
      body = <><ellipse cx={0} cy={0} rx={0.64} ry={1} fill={color} /><path d="M0,-0.86 C0.32,-0.38 -0.32,0.38 0,0.86" stroke={detail} strokeWidth={sw} fill="none" strokeLinecap="round" /></>;
      break;
    case 'nuts':
      body = <><path d="M-0.8,-0.5 C-0.95,0.55 0.1,1.08 0.82,0.55 C0.98,0.4 0.82,0.18 0.6,0.28 C0.1,0.52 -0.36,0.12 -0.3,-0.48 C-0.27,-0.78 -0.74,-0.84 -0.8,-0.5Z" fill={color} /><path d="M-0.55,-0.35 C-0.6,0.3 -0.1,0.62 0.4,0.52" stroke={detail} strokeWidth={sw * 0.8} fill="none" opacity={0.5} /></>;
      break;
    case 'tea':
      body = <><path d="M0,-1 C0.72,-0.5 0.72,0.5 0,1 C-0.72,0.5 -0.72,-0.5 0,-1Z" fill={color} /><path d="M0,-0.85 L0,0.92" stroke={detail} strokeWidth={sw} /><path d="M0,-0.2 L0.32,-0.45 M0,0.25 L-0.32,0 M0,0.55 L0.3,0.32" stroke={detail} strokeWidth={sw * 0.7} /></>;
      break;
    case 'candy':
      body = <><path d="M-0.55,0 L-1,-0.42 L-1,0.42Z M0.55,0 L1,-0.42 L1,0.42Z" fill={detail} /><circle r={0.56} fill={color} /><path d="M-0.3,-0.45 L0.1,0.52 M0.08,-0.54 L0.42,0.3" stroke="#FFFFFF" strokeWidth={sw} opacity={0.55} /></>;
      break;
    case 'cosmetic':
      body = <>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={0} cy={-0.5} rx={0.32} ry={0.52} fill={color} transform={`rotate(${a})`} />)}<circle r={0.26} fill={detail} /></>;
      break;
    default:
      body = <><ellipse cx={0} cy={0.35} rx={0.5} ry={0.42} fill={color} /><circle cx={-0.58} cy={-0.18} r={0.2} fill={color} /><circle cx={-0.22} cy={-0.56} r={0.21} fill={color} /><circle cx={0.22} cy={-0.56} r={0.21} fill={color} /><circle cx={0.58} cy={-0.18} r={0.2} fill={color} /></>;
  }
  return <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${r})`}>{body}</g>;
}
const REAL: Record<PCIndustry, [string, string]> = {
  coffee: ['#5B3A24', '#2C1A10'], nuts: ['#E7C98F', '#A8803F'], tea: ['#4E8A3E', '#2D5524'],
  candy: ['#E0336F', '#FFC43D'], cosmetic: ['#E8B4A6', '#F2C94C'], pet: ['#8B5A2B', '#5A3A1A'],
};
const CANDY = ['#E0336F', '#F59E0B', '#7C3AED', '#10B981', '#EF4444'];

/** minh hoạ ngành trong ô (x,y,w,h): đĩa nền + cụm hình rải tự nhiên */
function Art({ ind, x, y, w, h, p }: { ind: PCIndustry; x: number; y: number; w: number; h: number; p: PCPalette }) {
  const cx = x + w / 2, cy = y + h / 2, R = Math.min(w, h) / 2;
  const [c, d] = REAL[ind];
  const spots: [number, number, number, number][] = [
    [0, 0.1, 0.34, -18], [-0.48, -0.22, 0.24, 28], [0.5, -0.18, 0.25, -40], [-0.3, 0.52, 0.2, 60], [0.36, 0.5, 0.21, 12], [0.02, -0.55, 0.19, 75], [-0.68, 0.22, 0.16, -30], [0.7, 0.2, 0.16, 40],
  ];
  return (
    <g>
      <circle cx={cx} cy={cy} r={R * 0.96} fill={p.bg2} opacity={0.85} />
      <circle cx={cx} cy={cy} r={R * 0.96} fill="none" stroke={p.accent} strokeWidth={R * 0.018} opacity={0.7} />
      {spots.map(([dx, dy, s, rot], i) => (
        <Icon key={i} ind={ind} x={cx + dx * R * 0.9} y={cy + dy * R * 0.9} r={s * R} rot={rot} color={ind === 'candy' ? CANDY[i % CANDY.length] : c} detail={ind === 'candy' ? CANDY[(i + 2) % CANDY.length] : d} />
      ))}
    </g>
  );
}

function shapePath(shape: PCWindow | 'circle', x: number, y: number, w: number, h: number): string {
  if (shape === 'oval' || shape === 'circle') {
    const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
    return `M${cx - rx},${cy} A${rx},${ry} 0 1 0 ${cx + rx},${cy} A${rx},${ry} 0 1 0 ${cx - rx},${cy} Z`;
  }
  if (shape === 'arch') {
    const r = Math.min(w / 2, h);
    return `M${x},${y + h} L${x},${y + r} A${w / 2},${r} 0 0 1 ${x + w},${y + r} L${x + w},${y + h} Z`;
  }
  const r = Math.min(w, h) * 0.08;
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

// ---------- mã vạch EAN-13 ----------
const EAN_L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const EAN_G = ['0100111', '0110011', '0011011', '0100001', '0011101', '0111001', '0000101', '0010001', '0001001', '0010111'];
const EAN_R = ['1110010', '1100110', '1101100', '1000010', '1011100', '1001110', '1010000', '1000100', '1001000', '1110100'];
const EAN_P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
export function ean13(input: string): { digits: string; bits: string } {
  let d = (input || '').replace(/\D/g, '').slice(0, 12);
  if (d.length < 12) d = '893601234567';
  const sum = [...d].reduce((s, ch, i) => s + Number(ch) * (i % 2 ? 3 : 1), 0);
  const digits = d + String((10 - (sum % 10)) % 10);
  const first = Number(digits[0]);
  let bits = '101';
  for (let i = 1; i <= 6; i++) bits += (EAN_P[first][i - 1] === 'L' ? EAN_L : EAN_G)[Number(digits[i])];
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += EAN_R[Number(digits[i])];
  bits += '101';
  return { digits, bits };
}
function Barcode({ x, y, m, code }: { x: number; y: number; m: number; code: string }) {
  const { digits, bits } = ean13(code);
  const h = m * 55, guard = new Set([0, 1, 2, 45, 46, 47, 48, 49, 92, 93, 94]);
  const qz = m * 9; const W = qz * 2 + m * 95;
  const rects: ReactNode[] = [];
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') rects.push(<rect key={i} x={x + qz + i * m} y={y} width={m} height={guard.has(i) ? h + m * 5 : h} fill="#111111" />);
  const fs = m * 8.5;
  return (
    <g>
      <rect x={x} y={y - m * 3} width={W} height={h + m * 15.5} fill="#FFFFFF" rx={m * 2} />
      {rects}
      <g fontFamily={`"${BODY}"`} fontWeight={600} fontSize={fs} fill="#111111" textAnchor="middle">
        <text x={x + qz - m * 4} y={y + h + m * 9.5}>{digits[0]}</text>
        <text x={x + qz + m * 24} y={y + h + m * 9.5} letterSpacing={m * 2.2}>{digits.slice(1, 7)}</text>
        <text x={x + qz + m * 71} y={y + h + m * 9.5} letterSpacing={m * 2.2}>{digits.slice(7)}</text>
      </g>
    </g>
  );
}
const barcodeSize = (m: number) => ({ w: m * 113, h: m * 67 });

// ---------- MẶT TRƯỚC ----------
interface Ctx { g: PCGeom; p: PCPalette; disp: TS; data: PCData; spec: PCSpec; photo: string; uid: string; clear: boolean }

function HeroFill({ c, box, shape }: { c: Ctx; box: { x: number; y: number; w: number; h: number }; shape: PCWindow | 'circle' }) {
  // cửa sổ: để trống (đã cắt bằng mask) + viền in; không cửa sổ: ảnh khách hoặc hình vẽ ngành
  const { x, y, w, h } = box;
  if (c.spec.window !== 'none' && !c.clear) {
    return <path d={shapePath(c.spec.window, x, y, w, h)} fill="none" stroke={c.p.accent} strokeWidth={0.8} />;
  }
  if (c.clear) return null; // túi trong: chính sản phẩm là "hình"
  if (c.photo) {
    const id = `${c.uid}-ph`;
    return (
      <g>
        <clipPath id={id}><path d={shapePath(shape, x, y, w, h)} /></clipPath>
        <image href={c.photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${id})`} />
        <path d={shapePath(shape, x, y, w, h)} fill="none" stroke={c.p.accent} strokeWidth={0.8} />
      </g>
    );
  }
  const s = Math.min(w, h);
  return <Art ind={c.spec.industry} x={x + (w - s) / 2} y={y + (h - s) / 2} w={s} h={s} p={c.p} />;
}
/** ô hình (cửa sổ / ảnh / minh hoạ): khi có cửa sổ, ô = cửa sổ theo hình khách chọn */
const heroShape = (c: Ctx, dflt: PCWindow | 'circle') => (c.spec.window !== 'none' && !c.clear ? c.spec.window : dflt);

function badgesOf(d: PCData) { return (d.badges || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 3); }

// huy hiệu tròn (con dấu) — chữ co vừa trong vòng tròn
function Seals({ c, cx, y, d, gap }: { c: Ctx; cx: number; y: number; d: number; gap: number }) {
  const bs = badgesOf(c.data);
  if (!bs.length) return null;
  const total = bs.length * d + (bs.length - 1) * gap;
  const ts: TS = { fam: BODY, wt: 800 };
  return (
    <g>
      {bs.map((b, i) => {
        const x = cx - total / 2 + i * (d + gap) + d / 2, yy = y + d / 2;
        const fb = fitBlock(b.toUpperCase(), d * 0.7, d * 0.15, ts, 3);
        const bh = blockH(fb.lines.length, fb.size, 1.1);
        return (
          <g key={i}>
            <circle cx={x} cy={yy} r={d / 2} fill={c.p.accent} />
            <circle cx={x} cy={yy} r={d / 2 - d * 0.06} fill="none" stroke={c.p.onAccent} strokeWidth={d * 0.012} strokeDasharray={`${d * 0.03} ${d * 0.025}`} opacity={0.8} />
            <Lines lines={fb.lines} x={x} y={yy - bh / 2} size={fb.size} lh={1.1} ts={ts} fill={c.p.onAccent} />
          </g>
        );
      })}
    </g>
  );
}
function NetPill({ c, cx, y, h, anchor = 'middle', inverse = false }: { c: Ctx; cx: number; y: number; h: number; anchor?: Anchor; inverse?: boolean }) {
  if (!c.data.net) return null;
  const ts: TS = { fam: BODY, wt: 800, ls: 0.06 };
  const s = h * 0.52, tw = textW(c.data.net.toUpperCase(), s, ts), w = tw + h * 1.2;
  const x = anchor === 'middle' ? cx - w / 2 : anchor === 'end' ? cx - w : cx;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={inverse ? c.p.onAccent : c.p.accent} />
      <Lines lines={[c.data.net.toUpperCase()]} x={x + w / 2} y={y + (h - s * (ASC + DESC)) / 2 + s * 0.06} size={s} ts={ts} fill={inverse ? c.p.accent : c.p.onAccent} />
    </g>
  );
}

function Front({ c, k }: { c: Ctx; k: number }): { node: ReactNode; ok: boolean } {
  const { g, p, disp, data } = c;
  const { x0, y0, x1, y1 } = g.safe;
  const sw = x1 - x0, cx = (x0 + x1) / 2, sh = y1 - y0;
  const body: TS = { fam: BODY, wt: 600 };
  const bold: TS = { fam: BODY, wt: 800 };
  const nodes: ReactNode[] = [];
  let ok = true;

  if (c.spec.layout === 'band' || c.spec.layout === 'minimal') {
    const minimal = c.spec.layout === 'minimal';
    const brandTs: TS = minimal ? { fam: BODY, wt: 800, ls: 0.28 } : { ...disp, ls: 0.08 };
    const br = fitBlock((data.brand || '').toUpperCase(), sw * (minimal ? 0.8 : 0.9), sw * (minimal ? 0.05 : 0.085) * k, brandTs, 1);
    let y = y0 + sh * 0.01;
    nodes.push(<Lines key="br" lines={br.lines} x={cx} y={y} size={br.size} ts={brandTs} fill={minimal ? p.sub : p.accent} />);
    y += blockH(br.lines.length, br.size, 1);
    // hoa văn: — ◆ —
    const oy = y + sw * 0.03;
    nodes.push(<g key="orn" stroke={p.accent} strokeWidth={0.5}><line x1={cx - sw * 0.2} y1={oy} x2={cx - sw * 0.04} y2={oy} /><line x1={cx + sw * 0.04} y1={oy} x2={cx + sw * 0.2} y2={oy} /><rect x={cx - 1.4} y={oy - 1.4} width={2.8} height={2.8} fill={p.accent} transform={`rotate(45 ${cx} ${oy})`} /></g>);
    y = oy + sw * 0.045;
    const ti = fitBlock(data.name || '', sw * 0.96, sw * (minimal ? 0.11 : 0.12) * k, disp, 3);
    nodes.push(<Lines key="ti" lines={ti.lines} x={cx} y={y} size={ti.size} lh={1.06} ts={disp} fill={p.ink} />);
    y += blockH(ti.lines.length, ti.size, 1.06) + sw * 0.02;
    if (data.desc) {
      const de = fitBlock(data.desc, sw * 0.92, sw * 0.046 * k, body, 2);
      nodes.push(<Lines key="de" lines={de.lines} x={cx} y={y} size={de.size} ts={body} fill={p.sub} />);
      y += blockH(de.lines.length, de.size, 1.15);
    }
    const netH = sw * 0.09 * k;
    const bs = badgesOf(data);
    const sealD = minimal ? 0 : Math.min(sw * 0.25, sh * 0.17) * k;
    const bottom = y1 - netH - (bs.length && !minimal ? sealD + sw * 0.04 : 0) - (minimal && bs.length ? sw * 0.07 : 0) - sw * 0.03;
    const heroTop = y + sw * 0.07, heroH = bottom - heroTop;
    if (heroH < sw * 0.32) ok = false;
    const hw = Math.min(sw * 0.82, Math.max(0, heroH) * (minimal ? 0.78 : 1.05)), hh = Math.max(0, heroH);
    nodes.push(<HeroFill key="hero" c={c} box={{ x: cx - hw / 2, y: heroTop, w: hw, h: hh }} shape={heroShape(c, minimal ? 'arch' : 'circle')} />);
    let yb = bottom + sw * 0.03;
    if (minimal) {
      if (bs.length) {
        const row = fitBlock(bs.join('  ·  '), sw * 0.94, sw * 0.04 * k, body, 1);
        nodes.push(<Lines key="bs" lines={row.lines} x={cx} y={yb} size={row.size} ts={body} fill={p.sub} />);
        yb += sw * 0.07;
      }
      const nt = fitBlock((data.net || '').toUpperCase(), sw * 0.6, netH * 0.62, { ...bold, ls: 0.2 }, 1);
      nodes.push(<Lines key="net" lines={nt.lines} x={cx} y={y1 - blockH(1, nt.size, 1)} size={nt.size} ts={{ ...bold, ls: 0.2 }} fill={p.accent} />);
    } else {
      if (bs.length) { nodes.push(<Seals key="seals" c={c} cx={cx} y={yb} d={sealD} gap={sw * 0.05} />); }
      nodes.push(<NetPill key="net" c={c} cx={cx} y={y1 - netH} h={netH} />);
    }
  } else if (c.spec.layout === 'label') {
    const padX = sw * 0.07;
    const brandTs: TS = { fam: BODY, wt: 800, ls: 0.22 };
    const br = fitBlock((data.brand || '').toUpperCase(), sw * 0.78, sw * 0.05 * k, brandTs, 1);
    const ti = fitBlock(data.name || '', sw * 0.84, sw * 0.12 * k, disp, 3);
    const de = data.desc ? fitBlock(data.desc, sw * 0.8, sw * 0.044 * k, body, 2) : null;
    const lh = blockH(1, br.size, 1) + sw * 0.05 + blockH(ti.lines.length, ti.size, 1.06) + (de ? sw * 0.03 + blockH(de.lines.length, de.size, 1.15) : 0);
    const ly = y0 + sw * 0.01, lH = lh + padX * 2;
    nodes.push(<rect key="lb" x={x0} y={ly} width={sw} height={lH} rx={sw * 0.05} fill={p.panel} />);
    nodes.push(<rect key="lb2" x={x0 + sw * 0.022} y={ly + sw * 0.022} width={sw * 0.956} height={lH - sw * 0.044} rx={sw * 0.035} fill="none" stroke={p.accent} strokeWidth={0.5} />);
    let y = ly + padX;
    nodes.push(<Lines key="br" lines={br.lines} x={cx} y={y} size={br.size} ts={brandTs} fill={p.accent} />);
    y += blockH(1, br.size, 1) + sw * 0.02;
    nodes.push(<line key="ln" x1={cx - sw * 0.12} y1={y} x2={cx + sw * 0.12} y2={y} stroke={p.accent} strokeWidth={0.5} />);
    y += sw * 0.03;
    nodes.push(<Lines key="ti" lines={ti.lines} x={cx} y={y} size={ti.size} lh={1.06} ts={disp} fill={p.panelInk} />);
    y += blockH(ti.lines.length, ti.size, 1.06) + sw * 0.03;
    if (de) nodes.push(<Lines key="de" lines={de.lines} x={cx} y={y} size={de.size} ts={body} fill={p.panelInk} op={0.75} />);
    const netH = sw * 0.09 * k;
    const bs = badgesOf(data);
    const rowH = bs.length ? sw * 0.075 : 0;
    const heroTop = ly + lH + sw * 0.05, bottom = y1 - netH - rowH - sw * 0.05;
    const heroH = bottom - heroTop;
    if (heroH < sw * 0.3) ok = false;
    const hw = Math.min(sw * 0.86, Math.max(0, heroH) * 1.25);
    nodes.push(<HeroFill key="hero" c={c} box={{ x: cx - hw / 2, y: heroTop, w: hw, h: Math.max(0, heroH) }} shape={heroShape(c, 'circle')} />);
    if (bs.length) {
      const row = fitBlock(bs.map((b) => `• ${b}`).join('    '), sw * 0.96, sw * 0.04 * k, bold, 1);
      nodes.push(<Lines key="bs" lines={row.lines} x={cx} y={bottom + sw * 0.03} size={row.size} ts={bold} fill={p.ink} />);
    }
    nodes.push(<NetPill key="net" c={c} cx={cx} y={y1 - netH} h={netH} />);
  } else if (c.spec.layout === 'split') {
    const brandTs: TS = { fam: BODY, wt: 800, ls: 0.18 };
    const br = fitBlock((data.brand || '').toUpperCase(), sw * 0.9, sw * 0.05 * k, brandTs, 1);
    const ti = fitBlock(data.name || '', sw * 0.96, sw * 0.13 * k, disp, 3);
    const de = data.desc ? fitBlock(data.desc, sw * 0.94, sw * 0.046 * k, body, 2) : null;
    let y = y0 + sw * 0.01;
    const head: ReactNode[] = [];
    head.push(<Lines key="br" lines={br.lines} x={x0} y={y} size={br.size} ts={brandTs} fill={p.onAccent} anchor="start" op={0.9} />);
    y += blockH(1, br.size, 1) + sw * 0.035;
    head.push(<Lines key="ti" lines={ti.lines} x={x0} y={y} size={ti.size} lh={1.04} ts={disp} fill={p.onAccent} anchor="start" />);
    y += blockH(ti.lines.length, ti.size, 1.04) + sw * 0.025;
    if (de) { head.push(<Lines key="de" lines={de.lines} x={x0} y={y} size={de.size} ts={body} fill={p.onAccent} anchor="start" op={0.85} />); y += blockH(de.lines.length, de.size, 1.15); }
    const splitY = y + sw * 0.08;
    // khối màu trên (tràn lề) + đường sóng
    const L = -PC_BLEED_MM, R = g.W + PC_BLEED_MM;
    if (!c.clear) nodes.push(<path key="blk" d={`M${L},${-PC_BLEED_MM} H${R} V${splitY - sw * 0.04} C${g.W * 0.7},${splitY + sw * 0.06} ${g.W * 0.35},${splitY - sw * 0.1} ${L},${splitY + sw * 0.02} Z`} fill={p.accent} />);
    else nodes.push(<rect key="blk" x={x0 - sw * 0.04} y={y0 - sw * 0.03} width={sw * 1.08} height={splitY - y0} rx={sw * 0.04} fill={p.accent} />);
    nodes.push(<g key="head">{head}</g>);
    const netH = sw * 0.09 * k;
    const bs = badgesOf(data);
    const pillH = sw * 0.075 * k;
    const heroTop = splitY + sw * 0.04, bottom = y1 - Math.max(netH, bs.length ? pillH * bs.length + sw * 0.02 * (bs.length - 1) : 0) - sw * 0.05;
    const heroH = bottom - heroTop;
    if (heroH < sw * 0.3) ok = false;
    const hw = Math.min(sw, Math.max(0, heroH) * 1.3);
    nodes.push(<HeroFill key="hero" c={c} box={{ x: cx - hw / 2, y: heroTop, w: hw, h: Math.max(0, heroH) }} shape={heroShape(c, 'rect')} />);
    // huy hiệu dạng viên thuốc (trái) + NET (phải)
    const pts: TS = { fam: BODY, wt: 800 };
    let py = bottom + sw * 0.05;
    for (const [i, b] of bs.entries()) {
      const fb = fitBlock(b, sw * 0.5, pillH * 0.5, pts, 1);
      const w = textW(fb.lines[0] || '', fb.size, pts) + pillH;
      nodes.push(<g key={`p${i}`}><rect x={x0} y={py} width={w} height={pillH} rx={pillH / 2} fill={p.bg2} /><Lines lines={fb.lines} x={x0 + w / 2} y={py + (pillH - fb.size * (ASC + DESC)) / 2 + fb.size * 0.06} size={fb.size} ts={pts} fill={p.ink} /></g>);
      py += pillH + sw * 0.02;
    }
    nodes.push(<NetPill key="net" c={c} cx={x1} y={y1 - netH} h={netH} anchor="end" />);
  } else { // pattern
    const wantHero = (c.spec.window !== 'none' || !!c.photo) && !c.clear;
    const D = (wantHero ? Math.min(sw * 0.5, sh * 0.27) : Math.min(sw * 0.7, sh * 0.42)) * k;
    const ecy = y0 + D / 2 + sw * 0.01;
    nodes.push(<circle key="em" cx={cx} cy={ecy} r={D / 2} fill={p.accent} />);
    nodes.push(<circle key="em2" cx={cx} cy={ecy} r={D / 2 - D * 0.05} fill="none" stroke={p.onAccent} strokeWidth={D * 0.008} opacity={0.8} />);
    nodes.push(<Icon key="eic" ind={c.spec.industry} x={cx} y={ecy - D * 0.24} r={D * 0.09} rot={-20} color={p.onAccent} detail={p.accent} />);
    const brandTs: TS = { ...disp, ls: 0.04 };
    const br = fitBlock((data.brand || '').toUpperCase(), D * 0.78, D * 0.13, brandTs, 2);
    const bh = blockH(br.lines.length, br.size, 1.02);
    nodes.push(<Lines key="br" lines={br.lines} x={cx} y={ecy - bh / 2 + D * 0.06} size={br.size} lh={1.02} ts={brandTs} fill={p.onAccent} />);
    const nt = (data.net || '').toUpperCase();
    if (nt) { const fs = fitBlock(nt, D * 0.5, D * 0.06, { fam: BODY, wt: 800, ls: 0.15 }, 1); nodes.push(<Lines key="en" lines={fs.lines} x={cx} y={ecy + D * 0.3} size={fs.size} ts={{ fam: BODY, wt: 800, ls: 0.15 }} fill={p.onAccent} op={0.9} />); }
    let y = ecy + D / 2 + sw * 0.05;
    const ti = fitBlock(data.name || '', sw * 0.96, sw * 0.105 * k, disp, 2);
    const tbH = blockH(ti.lines.length, ti.size, 1.06);
    const rib = !c.clear;
    if (rib) nodes.push(<rect key="rib" x={x0 - sw * 0.03} y={y - sw * 0.02} width={sw * 1.06} height={tbH + sw * 0.04} rx={sw * 0.02} fill={p.panel} />);
    else nodes.push(<rect key="rib" x={x0 - sw * 0.03} y={y - sw * 0.02} width={sw * 1.06} height={tbH + sw * 0.04} rx={sw * 0.02} fill={p.panel} />);
    nodes.push(<Lines key="ti" lines={ti.lines} x={cx} y={y} size={ti.size} lh={1.06} ts={disp} fill={p.panelInk} />);
    y += tbH + sw * 0.06;
    if (data.desc) {
      const de = fitBlock(data.desc, sw * 0.92, sw * 0.045 * k, { fam: BODY, wt: 800 }, 2);
      if (c.clear) nodes.push(<rect key="dbg" x={x0} y={y - sw * 0.015} width={sw} height={blockH(de.lines.length, de.size, 1.15) + sw * 0.03} rx={sw * 0.02} fill={p.panel} />);
      nodes.push(<Lines key="de" lines={de.lines} x={cx} y={y} size={de.size} ts={{ fam: BODY, wt: 800 }} fill={c.clear ? p.panelInk : p.ink} />);
      y += blockH(de.lines.length, de.size, 1.15);
    }
    const bs = badgesOf(data);
    const sealD = bs.length ? Math.min(sw * 0.22, sh * 0.15) * k : 0;
    const heroTop = y + sw * 0.04, bottom = y1 - sealD - (sealD ? sw * 0.03 : 0);
    const heroH = bottom - heroTop;
    if (wantHero) {
      if (heroH < sw * 0.3) ok = false;
      const hw = Math.min(sw * 0.86, heroH * 1.2);
      nodes.push(<HeroFill key="hero" c={c} box={{ x: cx - hw / 2, y: heroTop, w: hw, h: Math.max(0, heroH) }} shape={heroShape(c, 'rect')} />);
    } else if (heroH < 0) ok = false;
    if (bs.length) nodes.push(<Seals key="seals" c={c} cx={cx} y={y1 - sealD} d={sealD} gap={sw * 0.05} />);
  }
  return { node: <>{nodes}</>, ok };
}

// ---------- MẶT SAU ----------
function Back({ c, k }: { c: Ctx; k: number }): { node: ReactNode; ok: boolean } {
  const { g, p, disp, data } = c;
  const { x0, y0, x1, y1 } = g.safe;
  const sw = x1 - x0;
  const body: TS = { fam: BODY, wt: 600 };
  const bold: TS = { fam: BODY, wt: 800 };
  const nodes: ReactNode[] = [];
  let y = y0;
  const br = fitBlock((data.brand || '').toUpperCase(), sw * 0.62, sw * 0.07 * k, { ...disp, ls: 0.04 }, 1);
  nodes.push(<Lines key="br" lines={br.lines} x={x0} y={y} size={br.size} ts={{ ...disp, ls: 0.04 }} fill={c.clear ? p.panelInk : p.accent} anchor="start" />);
  if (data.net) {
    const nt = fitBlock(data.net.toUpperCase(), sw * 0.34, sw * 0.045 * k, bold, 1);
    nodes.push(<Lines key="nt" lines={nt.lines} x={x1} y={y + (br.size - nt.size) * 0.5} size={nt.size} ts={bold} fill={c.clear ? p.panelInk : p.ink} anchor="end" />);
  }
  y += blockH(1, br.size, 1) + sw * 0.01;
  const nm = fitBlock(data.name || '', sw, sw * 0.05 * k, bold, 2);
  nodes.push(<Lines key="nm" lines={nm.lines} x={x0} y={y} size={nm.size} ts={bold} fill={c.clear ? p.panelInk : p.ink} anchor="start" />);
  y += blockH(nm.lines.length, nm.size, 1.15) + sw * 0.04;

  // khung thông tin
  const pad = sw * 0.05, iw = sw - pad * 2;
  const L = sw * 0.036 * k, Tz = sw * 0.04 * k;
  const secs = [['THÀNH PHẦN', data.ingredients], ['HƯỚNG DẪN SỬ DỤNG', data.usage], ['BẢO QUẢN', data.storage]].filter(([, t]) => (t || '').trim()) as [string, string][];
  const blocks = secs.map(([lab, t]) => ({ lab, fb: fitBlock(t, iw, Tz, body, 5) }));
  const panelH = pad * 2 + blocks.reduce((s, b, i) => s + blockH(1, L, 1) + sw * 0.012 + blockH(b.fb.lines.length, b.fb.size, 1.3) + (i < blocks.length - 1 ? sw * 0.035 : 0), 0);
  const panelY = y;
  if (blocks.length) {
    nodes.push(<rect key="pn" x={x0} y={panelY} width={sw} height={panelH} rx={sw * 0.035} fill={p.panel} opacity={0.96} />);
    let py = panelY + pad;
    blocks.forEach((b, i) => {
      nodes.push(<Lines key={`l${i}`} lines={[b.lab]} x={x0 + pad} y={py} size={L} ts={{ ...bold, ls: 0.08 }} fill={p.accent === p.panel ? p.panelInk : p.accent} anchor="start" />);
      py += blockH(1, L, 1) + sw * 0.012;
      nodes.push(<Lines key={`t${i}`} lines={b.fb.lines} x={x0 + pad} y={py} size={b.fb.size} lh={1.3} ts={body} fill={p.panelInk} anchor="start" />);
      py += blockH(b.fb.lines.length, b.fb.size, 1.3) + sw * 0.035;
    });
  }
  y = panelY + panelH + sw * 0.045;

  // hàng dưới: thông tin NSX (trái) | ô NSX/HSD + mã vạch (phải)
  const m = Math.max(0.22, Math.min(0.33, sw * 0.0027)) * k;
  const bc = barcodeSize(m);
  const rightW = Math.max(bc.w, sw * 0.36);
  const boxH = sw * 0.16 * k;
  const bcY = y1 - bc.h + m * 3;
  const boxY = bcY - m * 3 - sw * 0.03 - boxH;
  if (boxY < y) return { node: <>{nodes}</>, ok: false };
  const rx = x1 - rightW;
  nodes.push(<g key="box"><rect x={rx} y={boxY} width={rightW} height={boxH} rx={1.2} fill="#FFFFFF" stroke={c.clear ? '#333' : p.sub} strokeWidth={0.35} />
    <Lines lines={['NSX:', 'HSD:', 'Số lô:']} x={rx + rightW * 0.06} y={boxY + boxH * 0.1} size={boxH * 0.2} lh={1.28} ts={bold} fill="#333333" anchor="start" /></g>);
  nodes.push(<Barcode key="bc" x={x1 - bc.w} y={bcY} m={m} code={data.barcode} />);
  const lw = sw - rightW - sw * 0.05;
  const info = [data.maker, data.address && `Đ/c: ${data.address}`, data.hotline && `Hotline: ${data.hotline}`, data.website, 'Xuất xứ: Việt Nam'].filter(Boolean) as string[];
  const it = sw * 0.034 * k;
  let iy = boxY;
  const iNodes: ReactNode[] = [];
  info.forEach((t, i) => {
    const fb = fitBlock(t, lw, it, i === 0 ? bold : body, 3);
    iNodes.push(<Lines key={i} lines={fb.lines} x={x0} y={iy} size={fb.size} lh={1.25} ts={i === 0 ? bold : body} fill={c.clear ? p.panelInk : p.ink} anchor="start" />);
    iy += blockH(fb.lines.length, fb.size, 1.25) + sw * 0.012;
  });
  if (c.clear) nodes.push(<rect key="ibg" x={x0 - 2} y={boxY - 2} width={lw + 4} height={iy - boxY + 2} rx={1.5} fill={p.panel} />);
  nodes.push(<g key="info">{iNodes}</g>);
  return { node: <>{nodes}</>, ok: iy <= y1 + 0.5 };
}

// ---------- nền ----------
function Surface({ c, side }: { c: Ctx; side: 'front' | 'back' }) {
  const { g, p, spec } = c;
  const b = PC_BLEED_MM;
  if (c.clear) return null;
  const out: ReactNode[] = [<rect key="bg" x={-b} y={-b} width={g.W + b * 2} height={g.H + b * 2} fill={p.bg} />];
  if (spec.layout === 'pattern' || (spec.layout === 'label' && spec.material !== 'kraft')) {
    // hoạ tiết rải đều (icon ngành), mờ
    const step = g.W / 5.5;
    let i = 0;
    for (let yy = -step * 0.3; yy < g.H + step; yy += step * 0.86) {
      for (let xx = ((i % 2) * step) / 2 - step * 0.2; xx < g.W + step; xx += step) {
        out.push(<Icon key={`i${i}-${Math.round(xx)}`} ind={spec.industry} x={xx} y={yy} r={step * 0.17} rot={((i * 37 + xx) % 80) - 40} color={isDarkHex(p.bg) ? p.ink : p.accent} detail={p.bg} />);
      }
      i++;
    }
    out.push(<g key="pt" opacity={1} />);
    return <g opacity={1}><rect x={-b} y={-b} width={g.W + b * 2} height={g.H + b * 2} fill={p.bg} /><g opacity={side === 'back' ? 0.07 : 0.13}>{out.slice(1)}</g></g>;
  }
  if (spec.layout === 'band' && side === 'front') {
    // viền khung đôi sát mép hàn + dải đáy
    out.push(<rect key="f1" x={g.seal + 2} y={g.zipY + 2} width={g.W - g.seal * 2 - 4} height={g.bottomY - g.zipY - 1} fill="none" stroke={p.accent} strokeWidth={0.5} opacity={0.8} />);
    out.push(<rect key="db" x={-b} y={g.bottomY - 1} width={g.W + b * 2} height={g.H - g.bottomY + 1 + b} fill={p.bg2} />);
  }
  if (spec.layout === 'minimal' && side === 'front') {
    out.push(<rect key="f1" x={g.seal + 3} y={g.zipY + 3} width={g.W - g.seal * 2 - 6} height={g.bottomY - g.zipY - 3} fill="none" stroke={p.accent} strokeWidth={0.35} />);
    out.push(<path key="lf" d={`M${-b},${g.H * 0.62} C${g.W * 0.3},${g.H * 0.55} ${g.W * 0.6},${g.H * 0.75} ${g.W + b},${g.H * 0.66} V${g.H + b} H${-b} Z`} fill={p.bg2} opacity={0.7} />);
  }
  return <g>{out}</g>;
}

// ---------- vạch kỹ thuật (không in, chỉ hiện trên bản thiết kế + file in để xưởng biết) ----------
const TECH = { seal: '#E6007E', zip: '#00A3E0', win: '#00A651', cut: '#E30613', valve: '#F39200' };
function Guides({ c, labels = true }: { c: Ctx; labels?: boolean }) {
  const { g, spec } = c;
  const fs = Math.max(2.2, g.W * 0.018);
  const T = ({ x, y, t, col, a = 'start' }: { x: number; y: number; t: string; col: string; a?: Anchor }) =>
    labels ? <text x={x} y={y} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={col} textAnchor={a}>{t}</text> : null;
  const win = c.spec.window !== 'none' && !c.clear;
  return (
    <g data-guides="1" fill="none" strokeWidth={0.35}>
      <g stroke={TECH.seal} strokeDasharray="2 1.2">
        <line x1={g.seal} y1={0} x2={g.seal} y2={g.H} />
        <line x1={g.W - g.seal} y1={0} x2={g.W - g.seal} y2={g.H} />
        <line x1={0} y1={g.topSeal} x2={g.W} y2={g.topSeal} />
        <path d={`M0,${g.H - 3} Q${g.W / 2},${g.H - g.G - 1} ${g.W},${g.H - 3}`} />
      </g>
      <line x1={g.seal} y1={g.zipY} x2={g.W - g.seal} y2={g.zipY} stroke={TECH.zip} strokeWidth={0.7} />
      <T x={g.W / 2} y={g.zipY - 1} t="KHOÁ ZIP" col={TECH.zip} a="middle" />
      <T x={g.seal + 1} y={g.topSeal - 1.2} t="MÉP HÀN" col={TECH.seal} />
      <T x={g.W / 2} y={g.H - 2.2} t="ĐÁY GẤP (HÀN)" col={TECH.seal} a="middle" />
      {g.notch && <T x={g.seal + 1} y={g.tearY + fs * 0.4} t="vết xé" col={TECH.cut} />}
      {holePaths(g).map((d, i) => <path key={i} d={d} stroke={TECH.cut} strokeWidth={0.4} />)}
      {g.valve && spec.valve && <><circle cx={g.valve.cx} cy={g.valve.cy} r={g.valve.r} stroke={TECH.valve} strokeDasharray="1.2 0.8" /><T x={g.valve.cx + g.valve.r + 1} y={g.valve.cy + fs * 0.35} t="VAN 1 CHIỀU" col={TECH.valve} /></>}
      {win && c.spec.window !== 'none' && <WindowGuide c={c} labels={labels} fs={fs} />}
    </g>
  );
}
function WindowGuide({ c, labels, fs }: { c: Ctx; labels: boolean; fs: number }) {
  const w = c.win;
  if (!w) return null;
  return (
    <g>
      <path d={w} stroke={TECH.win} strokeDasharray="1.6 1" strokeWidth={0.45} fill="none" />
      {labels && c.winBox && <text x={c.winBox.x + c.winBox.w / 2} y={c.winBox.y + c.winBox.h / 2} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={TECH.win} textAnchor="middle">CỬA SỔ – KHÔNG IN</text>}
    </g>
  );
}
interface Ctx { win?: string; winBox?: { x: number; y: number; w: number; h: number } }

// van 1 chiều in nhẹ (vòng lỗ thoát khí) — chỉ là dấu in, van thật dán bên trong
function ValveMark({ c }: { c: Ctx }) {
  const v = c.g.valve;
  if (!v || !c.spec.valve) return null;
  const col = isDarkHex(c.p.bg) ? '#FFFFFF' : '#000000';
  return (
    <g opacity={0.28}>
      <circle cx={v.cx} cy={v.cy} r={v.r * 0.95} fill="none" stroke={col} strokeWidth={0.35} />
      {Array.from({ length: 6 }, (_, i) => <circle key={i} cx={v.cx + Math.cos((i / 6) * Math.PI * 2) * v.r * 0.45} cy={v.cy + Math.sin((i / 6) * Math.PI * 2) * v.r * 0.45} r={0.55} fill={col} />)}
      <circle cx={v.cx} cy={v.cy} r={0.6} fill={col} />
    </g>
  );
}

// tìm ô cửa sổ thật của bố cục: dựng mặt trước 1 lần với cờ ghi lại hộp hero
function solve(c: Ctx, side: 'front' | 'back') {
  let k = 1, res = side === 'front' ? Front({ c, k }) : Back({ c, k });
  while (!res.ok && k > 0.55) { k *= 0.93; res = side === 'front' ? Front({ c, k }) : Back({ c, k }); }
  return res.node;
}

/** lấy hộp ô hình (cửa sổ) đã giải của mặt trước — duyệt cây React tìm phần tử HeroFill */
function findHero(node: ReactNode): { x: number; y: number; w: number; h: number } | null {
  let found: { x: number; y: number; w: number; h: number } | null = null;
  const walk = (n: ReactNode) => {
    if (found || !n || typeof n !== 'object') return;
    if (Array.isArray(n)) { n.forEach(walk); return; }
    const el = n as { type?: unknown; props?: { box?: { x: number; y: number; w: number; h: number }; children?: ReactNode } };
    if (el.type === HeroFill && el.props?.box) { found = el.props.box; return; }
    if (el.props?.children) walk(el.props.children);
  };
  walk(node);
  return found;
}

/** vùng cửa sổ (mm) của mặt trước theo thiết kế hiện tại — dùng cho mask 2D + lớp phim 3D */
export function windowPath(spec: PCSpec, data: PCData): string | null {
  if (spec.window === 'none' || spec.material === 'clear') return null;
  const c = makeCtx(spec, data, '', 'x');
  const box = findHero(solve(c, 'front'));
  return box && box.w > 1 && box.h > 1 ? shapePath(spec.window, box.x, box.y, box.w, box.h) : null;
}

function makeCtx(spec: PCSpec, data: PCData, photo: string, uid: string): Ctx {
  const f = pcFont(spec.font);
  return { g: pouchGeom(spec), p: effPalette(pcPalette(spec.palette), spec.material), disp: { fam: f.family, wt: f.weight }, data, spec, photo, uid, clear: spec.material === 'clear' };
}

/**
 * 1 mặt túi (W×H mm). mode 'screen' = như thành phẩm (nền kraft hiện màu giấy); 'print' = file in (nền giấy/trong không in).
 * Vùng không in (cửa sổ, lỗ treo, vết xé) để TRONG SUỐT. guides = vạch kỹ thuật.
 */
export function PouchFaceSvg({ spec, data, photo = '', side = 'front', mode = 'screen', guides = false, bleed = false, style }: {
  spec: PCSpec; data: PCData; photo?: string; side?: 'front' | 'back'; mode?: 'screen' | 'print'; guides?: boolean; bleed?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = makeCtx(spec, data, photo, uid);
  const { g } = c;
  const content = solve(c, side);
  if (side === 'front') {
    const box = findHero(content);
    if (box && spec.window !== 'none' && !c.clear) { c.winBox = box; c.win = shapePath(spec.window, box.x, box.y, box.w, box.h); }
  }
  const b = bleed ? PC_BLEED_MM : 0;
  const holes = holePaths(g);
  const kraftPrint = mode === 'print' && spec.material === 'kraft';
  const mid = `${uid}-cut`;
  return (
    <svg viewBox={`${-b} ${-b} ${g.W + b * 2} ${g.H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet"
      data-safe={`${g.seal} ${g.zipY} ${g.W - g.seal} ${g.bottomY}`} data-side={side}>
      <defs>
        <mask id={mid} maskUnits="userSpaceOnUse" x={-b - 1} y={-b - 1} width={g.W + b * 2 + 2} height={g.H + b * 2 + 2}>
          <rect x={-b - 1} y={-b - 1} width={g.W + b * 2 + 2} height={g.H + b * 2 + 2} fill="#FFFFFF" />
          {holes.map((d, i) => <path key={i} d={d} fill="#000000" />)}
          {c.win && <path d={c.win} fill="#000000" />}
        </mask>
      </defs>
      <g mask={`url(#${mid})`}>
        {kraftPrint ? null : <Surface c={c} side={side} />}
        {side === 'front' && <ValveMark c={c} />}
        {content}
      </g>
      {guides && <Guides c={c} />}
    </svg>
  );
}

/** đáy gusset (W×G mm): nền + tên thương hiệu lặp */
export function PouchGussetSvg({ spec, data, bleed = false, mode = 'print', guides = false, style }: { spec: PCSpec; data: PCData; bleed?: boolean; mode?: 'screen' | 'print'; guides?: boolean; style?: CSSProperties }) {
  const c = makeCtx(spec, data, '', 'g');
  const { g, p } = c;
  const b = bleed ? PC_BLEED_MM : 0;
  const ts: TS = { fam: BODY, wt: 800, ls: 0.25 };
  const t = (data.brand || '').toUpperCase();
  const s = Math.min(g.G * 0.16, (g.W * 0.8) / Math.max(1, textW(t, 1, ts)));
  const paint = !(c.clear || (mode === 'print' && spec.material === 'kraft'));
  return (
    <svg viewBox={`${-b} ${-b} ${g.W + b * 2} ${g.G + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      {paint && <rect x={-b} y={-b} width={g.W + b * 2} height={g.G + b * 2} fill={p.bg2} />}
      {t && <Lines lines={[t]} x={g.W / 2} y={g.G / 2 - s * 0.62} size={s} ts={ts} fill={c.clear ? p.panelInk : p.ink} op={0.6} />}
      {guides && <g fill="none" stroke={TECH.seal} strokeWidth={0.35} strokeDasharray="2 1.2"><line x1={0} y1={g.G / 2} x2={g.W} y2={g.G / 2} /><path d={`M0,3 Q${g.W / 2},${g.G - 1} ${g.W},3`} /><path d={`M0,${g.G - 3} Q${g.W / 2},1 ${g.W},${g.G - 3}`} /></g>}
    </svg>
  );
}

// ---------- tờ file in (khuôn trải): mặt trước | mặt sau | đáy, mỗi phần có lề xén + vạch cắt + chú thích ----------
export function pouchSheetDims(spec: PCSpec) {
  const g = pouchGeom(spec);
  const M = 18, GAP = 16;
  return { g, M, GAP, W: M * 2 + g.W * 2 + GAP, H: M * 2 + g.H + GAP + g.G + 40 };
}
export function PouchSheetSvg({ spec, data, photo = '', style }: { spec: PCSpec; data: PCData; photo?: string; style?: CSSProperties }) {
  const { g, M, GAP, W, H } = pouchSheetDims(spec);
  const b = PC_BLEED_MM;
  const pieces = [
    { key: 'front', x: M, y: M, w: g.W, h: g.H, label: 'MẶT TRƯỚC' },
    { key: 'back', x: M + g.W + GAP, y: M, w: g.W, h: g.H, label: 'MẶT SAU' },
    { key: 'gusset', x: M, y: M + g.H + GAP, w: g.W, h: g.G, label: 'ĐÁY (GUSSET) — gấp đôi theo đường giữa' },
  ];
  const crop = (x: number, y: number, w: number, h: number) => {
    const L = 5, o = b + 1.5;
    const segs: [number, number, number, number][] = [];
    for (const [cx, cy, sx, sy] of [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]] as const) {
      segs.push([cx + sx * o, cy, cx + sx * (o + L), cy], [cx, cy + sy * o, cx, cy + sy * (o + L)]);
    }
    return segs.map((s, i) => <line key={i} x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} stroke="#000" strokeWidth={0.25} />);
  };
  const lab: TS = { fam: BODY, wt: 800 };
  const sz = pcSize(spec.size);
  const mat = PC_MATERIALS.find((m) => m.id === spec.material)!;
  const legend: [string, string][] = [[TECH.seal, 'Mép hàn / đáy gấp (không đặt chữ)'], [TECH.zip, 'Khoá zip'], [TECH.cut, 'Bế: lỗ treo / vết xé'], [TECH.win, 'Cửa sổ trong — không in'], [TECH.valve, 'Van 1 chiều']];
  const ly = M + g.H + GAP + g.G + PC_BLEED_MM + 16;
  let lx = M;
  let row = 0;
  const legendX = legend.map(([, t]) => { const w = 11 + textW(t, 3, { fam: BODY, wt: 600 }) + 8; if (lx + w > W - M && lx > M) { lx = M; row++; } const x = [lx, row]; lx += w; return x; });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet="1">
      <rect x={0} y={0} width={W} height={H} fill="#FFFFFF" />
      {pieces.map((pc) => (
        <g key={pc.key}>
          <text x={pc.x} y={pc.y - b - 3} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={3.2} fill="#333">{pc.label}</text>
          <svg x={pc.x - b} y={pc.y - b} width={pc.w + b * 2} height={pc.h + b * 2} viewBox={`${-b} ${-b} ${pc.w + b * 2} ${pc.h + b * 2}`} overflow="hidden">
            {pc.key === 'gusset'
              ? <PouchGussetSvg spec={spec} data={data} bleed mode="print" guides />
              : <PouchFaceSvg spec={spec} data={data} photo={photo} side={pc.key as 'front' | 'back'} mode="print" guides bleed />}
          </svg>
          {crop(pc.x, pc.y, pc.w, pc.h)}
        </g>
      ))}
      <g fontFamily={`"${BODY}"`} fontSize={3} fontWeight={600} fill="#333">
        <Lines lines={[`TÚI ZIP ĐỨNG ${sz.name} · đáy ${sz.gMm / 10}cm · ${mat.name}${spec.window !== 'none' && spec.material !== 'clear' ? ' · cửa sổ' : ''}${spec.euro ? ' · lỗ treo' : ''}${spec.notch ? ' · vết xé' : ''}${spec.valve ? ' · van 1 chiều' : ''}`]} x={M} y={ly - 3.6} size={3.4} ts={lab} fill="#111" anchor="start" />
        {legend.map(([col, t], i) => (
          <g key={i} transform={`translate(${legendX[i][0]} ${ly + 4 + legendX[i][1] * 5})`}>
            <line x1={0} y1={-1} x2={7} y2={-1} stroke={col} strokeWidth={0.7} strokeDasharray={i === 1 ? undefined : '2 1.2'} />
            <text x={9} y={0}>{t}</text>
          </g>
        ))}
        <text x={M} y={ly + 11 + row * 5}>Lề xén {b}mm quanh mỗi mặt · vạch kỹ thuật màu chỉ để xưởng canh, không in. Vùng trong suốt = không in (cửa sổ / lỗ bế).</text>
      </g>
    </svg>
  );
}
