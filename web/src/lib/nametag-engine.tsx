'use client';
// Bảng tên cài áo (staff name tag): 1 engine SVG = BỐ CỤC × CHẤT LIỆU × MÀU × FONT, render code 100%.
// Đơn vị mm. Chất liệu quyết định cách in:
//  - Khắc laser (kim loại vàng/bạc xước, đen khắc lộ vàng, gỗ): 1 màu — file sản xuất = vùng khắc màu ĐEN.
//  - In UV (kim loại bạc in màu, mica trắng/đen): nhiều màu theo bảng màu.
// Chế độ: 'view' (xem trước có nền vật liệu) · 'print' (file sản xuất: chỉ mực/khắc + khung) · 'tex' (texture 3D: chỉ mực, nền trong).
// Danh sách nhiều người "Tên | Chức vụ | Chức vụ EN" → mỗi người 1 bảng, xếp tờ A4 sản xuất.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export type NTMaterial = 'gold' | 'silver' | 'blackGold' | 'metalUV' | 'micaWhite' | 'micaBlack' | 'wood';
export type NTShape = 'rect' | 'pill' | 'oval';
export type NTBack = 'pin' | 'magnet';
export type NTMode = 'view' | 'print' | 'tex';
export type NTIndustry = 'bank' | 'hotel' | 'spa' | 'restaurant' | 'retail' | 'hospital';

export const NT_MATERIALS: { id: NTMaterial; name: string; note: string; laser: boolean }[] = [
  { id: 'gold', name: 'Kim loại vàng xước · khắc laser', note: 'Chữ khắc tối trên nền vàng xước — sang, bền', laser: true },
  { id: 'silver', name: 'Kim loại bạc xước · khắc laser', note: 'Chữ khắc tối trên nền bạc xước — lịch sự', laser: true },
  { id: 'blackGold', name: 'Đen nhám · khắc lộ vàng', note: 'Lớp sơn đen, laser bóc lộ kim loại vàng', laser: true },
  { id: 'metalUV', name: 'Kim loại bạc · in màu UV', note: 'In logo đủ màu trên nền bạc xước', laser: false },
  { id: 'micaWhite', name: 'Mica trắng · in UV', note: 'Nền trắng bóng, in màu sắc nét — phổ biến', laser: false },
  { id: 'micaBlack', name: 'Mica đen · in UV', note: 'Nền đen bóng, chữ sáng (in lót trắng)', laser: false },
  { id: 'wood', name: 'Gỗ · khắc laser', note: 'Vân gỗ tự nhiên, chữ cháy nâu — quán cà phê, spa', laser: true },
];
export const ntMaterial = (id: string) => NT_MATERIALS.find((m) => m.id === id) || NT_MATERIALS[0];
export const isLaser = (m: NTMaterial) => ntMaterial(m).laser;
export const isDarkBase = (m: NTMaterial) => m === 'micaBlack' || m === 'blackGold';

export const NT_SHAPES: { id: NTShape; name: string }[] = [
  { id: 'rect', name: 'Chữ nhật bo góc' },
  { id: 'pill', name: 'Bo tròn 2 đầu' },
  { id: 'oval', name: 'Oval' },
];
export const NT_BACKS: { id: NTBack; name: string; note: string }[] = [
  { id: 'pin', name: 'Kim cài', note: 'Ghim xuyên áo, chắc chắn' },
  { id: 'magnet', name: 'Nam châm', note: 'Không thủng áo — áo vest, sơ mi đẹp' },
];

export interface NTSize { id: string; name: string; wMm: number; hMm: number }
export const NT_SIZES: NTSize[] = [
  { id: '70x20', name: '70 × 20 mm', wMm: 70, hMm: 20 },
  { id: '75x25', name: '75 × 25 mm', wMm: 75, hMm: 25 },
  { id: '60x22', name: '60 × 22 mm', wMm: 60, hMm: 22 },
];
export const ntSize = (id: string) => NT_SIZES.find((s) => s.id === id) || NT_SIZES[0];

export interface NTFont { id: string; name: string; family: string; weight: number; upper?: boolean }
export const NT_FONTS: NTFont[] = [
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'oswald', name: 'Oswald', family: 'Oswald', weight: 700, upper: true },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'vibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400 },
];
export const ntFont = (id: string) => NT_FONTS.find((f) => f.id === id) || NT_FONTS[0];
const BODY = 'Be Vietnam Pro';
const EN = 'Cormorant Garamond';
// mọi font đều có TTF ở /public/fonts → file sản xuất outline chữ được
export const NT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Cormorant+Garamond:ital,wght@0,700;1,500&family=Great+Vibes&display=swap');`;

export function useNTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-nt-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-nt-fonts'; link.rel = 'stylesheet';
        link.href = NT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...NT_FONTS.map((f) => `${f.weight} 60px "${f.family}"`), `600 40px "${BODY}"`, `italic 500 40px "${EN}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ỐẾỀẦ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// fg/acc/sub: in trên nền SÁNG (mica trắng, kim loại bạc) · *D: trên nền TỐI (mica đen)
export interface NTPalette { id: string; name: string; fg: string; acc: string; sub: string; fgD: string; accD: string; subD: string }
export const NT_PALETTES: NTPalette[] = [
  { id: 'navy', name: 'Navy · vàng', fg: '#16294D', acc: '#B8892E', sub: '#4A5670', fgD: '#FFFFFF', accD: '#E2C27A', subD: '#C9CED8' },
  { id: 'red', name: 'Đỏ đô', fg: '#6E1216', acc: '#C8102E', sub: '#5E4A4A', fgD: '#FFF4E6', accD: '#F0B45E', subD: '#D9C8C0' },
  { id: 'teal', name: 'Xanh ngọc', fg: '#0D4F4B', acc: '#0F8C7E', sub: '#4C6461', fgD: '#EFFFFB', accD: '#5FD3C0', subD: '#BFD9D4' },
  { id: 'black', name: 'Đen · vàng', fg: '#151515', acc: '#9C7A2C', sub: '#555555', fgD: '#FFFFFF', accD: '#D4AF37', subD: '#BBBBBB' },
  { id: 'pink', name: 'Hồng spa', fg: '#6B2C3E', acc: '#C9627F', sub: '#7C6067', fgD: '#FFEFF3', accD: '#F0A5BA', subD: '#E3C9D0' },
  { id: 'blue', name: 'Xanh y tế', fg: '#0B4F8A', acc: '#1E9E5A', sub: '#4A5C70', fgD: '#EAF4FF', accD: '#6FD39C', subD: '#C2D3E6' },
  { id: 'orange', name: 'Cam năng động', fg: '#3A2A1E', acc: '#E0601A', sub: '#6E5A4C', fgD: '#FFF3EA', accD: '#FF9A5A', subD: '#E0CDBF' },
];
export const ntPalette = (id: string) => NT_PALETTES.find((p) => p.id === id) || NT_PALETTES[0];

export const NT_LAYOUTS: { id: string; name: string }[] = [
  { id: 'logo-left', name: 'Logo trái' },
  { id: 'logo-right', name: 'Logo phải' },
  { id: 'center', name: 'Căn giữa' },
  { id: 'band', name: 'Dải màu trái' },
  { id: 'topbar', name: 'Thanh tên công ty' },
  { id: 'bilingual', name: 'Song ngữ' },
  { id: 'minimal', name: 'Tối giản' },
];

export const NT_INDUSTRIES: { id: NTIndustry; name: string }[] = [
  { id: 'bank', name: 'Ngân hàng' },
  { id: 'hotel', name: 'Khách sạn' },
  { id: 'spa', name: 'Spa' },
  { id: 'restaurant', name: 'Nhà hàng' },
  { id: 'retail', name: 'Bán lẻ' },
  { id: 'hospital', name: 'Bệnh viện · phòng khám' },
];

export interface NTSpec {
  layout: string; material: NTMaterial; palette: string; font: string; shape: NTShape; size: string;
  back: NTBack; industry: NTIndustry; bilingual: boolean;
}
export type NTData = Record<string, string>;
export interface NTTemplate { id: string; name: string; spec: NTSpec }

const T = (id: string, name: string, s: Omit<NTSpec, 'size' | 'back' | 'bilingual'> & Partial<NTSpec>): NTTemplate =>
  ({ id, name, spec: { size: '70x20', back: 'pin', bilingual: false, ...s } });
export const NT_TEMPLATES: NTTemplate[] = [
  T('bank-gold', 'Ngân hàng · vàng khắc', { layout: 'logo-left', material: 'gold', palette: 'navy', font: 'montserrat', shape: 'rect', industry: 'bank' }),
  T('bank-uv', 'Ngân hàng · bạc in màu', { layout: 'band', material: 'metalUV', palette: 'navy', font: 'bvp', shape: 'rect', industry: 'bank' }),
  T('hotel-black', 'Khách sạn · đen lộ vàng', { layout: 'bilingual', material: 'blackGold', palette: 'black', font: 'playfair', shape: 'rect', industry: 'hotel', bilingual: true, back: 'magnet', size: '75x25' }),
  T('hotel-silver', 'Khách sạn · bạc song ngữ', { layout: 'center', material: 'silver', palette: 'navy', font: 'cormorant', shape: 'pill', industry: 'hotel', bilingual: true, back: 'magnet' }),
  T('spa-white', 'Spa · mica trắng', { layout: 'logo-left', material: 'micaWhite', palette: 'pink', font: 'vibes', shape: 'pill', industry: 'spa', size: '75x25' }),
  T('spa-wood', 'Spa · gỗ khắc', { layout: 'minimal', material: 'wood', palette: 'black', font: 'cormorant', shape: 'oval', industry: 'spa', size: '75x25' }),
  T('rest-red', 'Nhà hàng · dải đỏ', { layout: 'band', material: 'micaWhite', palette: 'red', font: 'oswald', shape: 'rect', industry: 'restaurant' }),
  T('rest-black', 'Nhà hàng · mica đen', { layout: 'topbar', material: 'micaBlack', palette: 'orange', font: 'montserrat', shape: 'rect', industry: 'restaurant', size: '75x25' }),
  T('retail-orange', 'Bán lẻ · thanh cam', { layout: 'topbar', material: 'micaWhite', palette: 'orange', font: 'bvp', shape: 'rect', industry: 'retail', back: 'magnet', size: '75x25' }),
  T('retail-teal', 'Bán lẻ · logo phải', { layout: 'logo-right', material: 'metalUV', palette: 'teal', font: 'montserrat', shape: 'rect', industry: 'retail' }),
  T('hosp-blue', 'Phòng khám · xanh y tế', { layout: 'logo-left', material: 'micaWhite', palette: 'blue', font: 'bvp', shape: 'rect', industry: 'hospital', bilingual: true, size: '75x25' }),
  T('hosp-silver', 'Phòng khám · bạc khắc', { layout: 'minimal', material: 'silver', palette: 'blue', font: 'oswald', shape: 'rect', industry: 'hospital', size: '60x22' }),
];

// dữ liệu mẫu theo ngành (KHÔNG dùng tên chủ shop làm ví dụ)
export const NT_SAMPLES: Record<NTIndustry, NTData> = {
  bank: { brand: 'NGÂN HÀNG AN KHANG', people: 'Trần Quốc Bảo | Giao dịch viên | Teller\nLê Thu Hà | Chuyên viên tư vấn | Advisor\nPhạm Gia Khánh | Trưởng phòng | Manager' },
  hotel: { brand: 'SAO MAI HOTEL', people: 'Nguyễn Bảo Ngọc | Lễ tân | Receptionist\nVõ Hoàng Long | Quản lý sảnh | Lobby Manager\nĐặng Khánh Linh | Hướng dẫn | Concierge' },
  spa: { brand: 'THU HÀ BEAUTY SPA', people: 'Lê Thu Hà | Kỹ thuật viên | Therapist\nNguyễn Thanh Tâm | Tư vấn da | Skin Advisor\nPhạm Bảo Ngọc | Lễ tân | Receptionist' },
  restaurant: { brand: 'NHÀ HÀNG BẾP QUÊ', people: 'Trần Quốc Bảo | Phục vụ | Server\nVõ Hoàng Long | Quản lý ca | Shift Manager\nLê Khánh Linh | Thu ngân | Cashier' },
  retail: { brand: 'AN KHANG MART', people: 'Phạm Gia Khánh | Thu ngân | Cashier\nNguyễn Thanh Tâm | Nhân viên bán hàng | Sales\nĐặng Bảo Ngọc | Cửa hàng trưởng | Store Manager' },
  hospital: { brand: 'PHÒNG KHÁM AN TÂM', people: 'BS. Lê Thu Hà | Bác sĩ nội khoa | Physician\nNguyễn Thanh Tâm | Điều dưỡng | Nurse\nTrần Gia Khánh | Dược sĩ | Pharmacist' },
};
export const defaultNTData = (ind: NTIndustry = 'bank'): NTData => ({ ...NT_SAMPLES[ind] });

export interface NTPerson { name: string; title: string; en: string }
export function parsePeople(s: string): NTPerson[] {
  return (s || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 500).map((l) => {
    const [name = '', title = '', en = ''] = l.split('|').map((x) => x.trim());
    return { name, title, en };
  }).filter((p) => p.name);
}

// ---------- hình học ----------
export function shapePath(shape: NTShape, x: number, y: number, w: number, h: number): string {
  const f = (n: number) => +n.toFixed(3);
  if (shape === 'oval') {
    const rx = w / 2, ry = h / 2, cx = x + rx, cy = y + ry;
    return `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)} Z`;
  }
  const r = shape === 'pill' ? h / 2 : Math.min(2.5, h * 0.14);
  return `M${f(x + r)} ${f(y)} H${f(x + w - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)} V${f(y + h - r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)} H${f(x + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)} V${f(y + r)} A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)} Z`;
}
// bề rộng của tấm tại độ cao y (mm)
export function chordW(shape: NTShape, W: number, H: number, y: number): number {
  const yy = Math.max(0, Math.min(H, y));
  if (shape === 'oval') { const t = (yy - H / 2) / (H / 2); return W * Math.sqrt(Math.max(0, 1 - t * t)); }
  const r = shape === 'pill' ? H / 2 : Math.min(2.5, H * 0.14);
  const d = yy < r ? r - yy : yy > H - r ? yy - (H - r) : 0;
  return W - 2 * (r - Math.sqrt(Math.max(0, r * r - d * d)));
}
// vùng an toàn (chữ/logo không ra sát mép, tránh bo góc)
export function safeBox(shape: NTShape, W: number, H: number) {
  // oval: hộp chữ nhật nội tiếp an toàn (dây cung ở mép trên/dưới hộp vẫn rộng hơn hộp ~10%)
  const px = shape === 'pill' ? H * 0.36 : shape === 'oval' ? W * 0.17 : 2.4;
  const py = shape === 'oval' ? H * 0.19 : Math.max(1.9, H * 0.1);
  return { x: px, y: py, w: W - px * 2, h: H - py * 2 };
}

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
interface Met { w: number; asc: number; desc: number }
function measure(text: string, fam: string, wt: number, size: number, ls: number, italic = false): Met {
  const n = [...text].length;
  if (typeof document === 'undefined') return { w: n * size * 0.6, asc: size * 0.9, desc: size * 0.25 };
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return { w: n * size * 0.6, asc: size * 0.9, desc: size * 0.25 };
  mctx.font = `${italic ? 'italic ' : ''}${wt} 100px "${fam}"`;
  const m = mctx.measureText(text);
  const k = size / 100;
  return { w: m.width * k + ls * size * Math.max(0, n - 1), asc: (m.actualBoundingBoxAscent || 72) * k, desc: (m.actualBoundingBoxDescent || 20) * k };
}

type LineKey = 'brand' | 'name' | 'title' | 'en';
interface LineDef { key: LineKey; text: string; fam: string; wt: number; ls: number; italic?: boolean; rel: number; min: number; color: string }
interface Fitted { key: LineKey; lines: string[]; size: number; base: number[]; fam: string; wt: number; ls: number; italic?: boolean; color: string }

function balance2(t: string, fam: string, wt: number, size: number, ls: number): string[] {
  const words = t.split(/\s+/).filter(Boolean);
  if (words.length < 2) return [t];
  let best = [t], bw = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const w = Math.max(measure(a, fam, wt, size, ls).w, measure(b, fam, wt, size, ls).w);
    if (w < bw) { bw = w; best = [a, b]; }
  }
  return best;
}

// xếp các dòng chữ trong box: co theo chiều ngang trước, rồi co đều cho vừa chiều cao; tên dài quá → 2 dòng
function fitStack(defs: LineDef[], box: { x: number; y: number; w: number; h: number }, H: number, extraH = 0): { fitted: Fitted[]; ruleY?: number; over: boolean } {
  let k = 1;
  let out: { def: LineDef; lines: string[]; size: number; asc: number; desc: number; h: number }[] = [];
  let total = 0;
  for (let it = 0; it < 18; it++) {
    out = defs.map((d) => {
      let size = Math.max(d.min, d.rel * H * k);
      let lines = [d.text];
      const w0 = measure(d.text, d.fam, d.wt, size, d.ls, d.italic).w;
      if (w0 > box.w) size = Math.max(d.min, size * (box.w / w0) * 0.995);
      // ở cỡ tối thiểu vẫn tràn ngang → xuống 2 dòng cân đều (tên, chức vụ, tên công ty dài)
      if (measure(d.text, d.fam, d.wt, size, d.ls, d.italic).w > box.w + 0.01) {
        lines = balance2(d.text, d.fam, d.wt, size, d.ls);
        const mw = Math.max(...lines.map((l) => measure(l, d.fam, d.wt, size, d.ls, d.italic).w));
        if (mw > box.w) size = size * (box.w / mw) * 0.995; // 2 dòng vẫn tràn → co thêm (hơn là lòi mép)
      }
      const ms = lines.map((l) => measure(l, d.fam, d.wt, size, d.ls, d.italic));
      const asc = Math.max(...ms.map((m) => m.asc), size * 0.62), desc = Math.max(...ms.map((m) => m.desc), size * 0.12);
      const h = lines.length * (asc + desc) + (lines.length - 1) * size * 0.12;
      return { def: d, lines, size, asc, desc, h };
    });
    const gaps = out.reduce((s, o, i) => s + (i ? Math.max(0.5, o.size * 0.28) : 0), 0);
    total = out.reduce((s, o) => s + o.h, 0) + gaps + extraH;
    if (total <= box.h + 0.01) break;
    k *= Math.max(0.7, (box.h / total) * 0.985);
  }
  let y = box.y + Math.max(0, (box.h - total) / 2);
  const fitted: Fitted[] = [];
  let ruleY: number | undefined;
  out.forEach((o, i) => {
    if (i) y += Math.max(0.5, o.size * 0.28);
    if (extraH && o.def.key === 'title') { ruleY = y + extraH / 2 - Math.max(0.5, o.size * 0.14); y += extraH; }
    const base = o.lines.map((_, j) => y + o.asc + j * (o.asc + o.desc + o.size * 0.12));
    fitted.push({ key: o.def.key, lines: o.lines, size: o.size, base, fam: o.def.fam, wt: o.def.wt, ls: o.def.ls, italic: o.def.italic, color: o.def.color });
    y += o.h;
  });
  return { fitted, ruleY, over: total > box.h + 0.25 };
}
// không vừa (kể cả khi đã co tới cỡ tối thiểu) → bỏ dần dòng phụ: tiếng Anh, rồi tên công ty — không để chữ lòi khỏi tấm
function fitDrop(defs: LineDef[], box: { x: number; y: number; w: number; h: number }, H: number, extraH = 0) {
  let d = defs, r = fitStack(d, box, H, extraH);
  for (const k of ['en', 'brand'] as LineKey[]) {
    if (!r.over) break;
    if (!d.some((x) => x.key === k)) continue;
    d = d.filter((x) => x.key !== k); r = fitStack(d, box, H, extraH);
  }
  return r;
}

// ---------- icon ngành (vẽ code, toàn mảng đặc → khắc laser được) — hộp 24×24 ----------
function industryIcon(ind: NTIndustry, color: string): ReactNode {
  switch (ind) {
    case 'bank': return <path fill={color} d="M12 1.5 1.5 7.2v2.3h21V7.2L12 1.5Zm0 2.6 6.6 3.6H5.4L12 4.1ZM3.4 11h2.6v7.6H3.4V11Zm4.9 0h2.6v7.6H8.3V11Zm4.8 0h2.6v7.6h-2.6V11Zm4.9 0h2.6v7.6H18V11ZM1.5 20h21v2.5h-21V20Z" />;
    case 'hotel': return <path fill={color} d="M10.6 4.2h2.8v1.6a8.6 8.6 0 0 1 8 8.6v1.2H2.6v-1.2a8.6 8.6 0 0 1 8-8.6V4.2Zm-1.4-2.2h5.6v1.8H9.2V2Zm-7.7 15.6h21v2.6h-21v-2.6Zm6.2-5.6c.9-1.9 2.6-3.2 4.6-3.5l.3 1.6c-1.5.3-2.7 1.2-3.4 2.6l-1.5-.7Z" />;
    case 'spa': return <path fill={color} d="M12 3c2.3 2.4 3.4 5 3.4 7.8 0 2.6-1.2 4.9-3.4 6.9-2.2-2-3.4-4.3-3.4-6.9C8.6 8 9.7 5.4 12 3Zm-8.8 6.2c3.2.2 5.6 1.3 7.1 3.4.9 1.3 1.4 3 1.6 5.1-2.9-.2-5.1-1.2-6.6-3.1-1.3-1.6-2-3.4-2.1-5.4Zm17.6 0c-.1 2-.8 3.8-2.1 5.4-1.5 1.9-3.7 2.9-6.6 3.1.2-2.1.7-3.8 1.6-5.1 1.5-2.1 3.9-3.2 7.1-3.4ZM3 19.6h18V22H3v-2.4Z" />;
    case 'restaurant': return <path fill={color} d="M5 1.8h1.6v6.4h1.2V1.8h1.6v6.4h1.2V1.8h1.6v7.6c0 1.6-1.1 2.9-2.6 3.2v9.6H6.8v-9.6A3.3 3.3 0 0 1 4.2 9.4V1.8H5Zm12.8 0c2.2 0 3.8 2.6 3.8 6.1 0 2.6-1 4.7-2.4 5.5v8.8h-2.8V13.4c-1.4-.8-2.4-2.9-2.4-5.5 0-3.5 1.6-6.1 3.8-6.1Z" />;
    case 'retail': return <path fill={color} fillRule="evenodd" d="M7.4 7V6a4.6 4.6 0 0 1 9.2 0v1h3.6l1.1 15.5H2.7L3.8 7h3.6Zm2.4 0h4.4V6a2.2 2.2 0 1 0-4.4 0v1Zm-2.4 2.4v2.2h2.4V9.4H7.4Zm6.8 0v2.2h2.4V9.4h-2.4Z" />;
    case 'hospital': return <path fill={color} fillRule="evenodd" d="M12 1.2a10.8 10.8 0 1 1 0 21.6 10.8 10.8 0 0 1 0-21.6Zm-2.1 4.6v4.1H5.8v4.2h4.1v4.1h4.2v-4.1h4.1V9.9h-4.1V5.8H9.9Z" />;
  }
}

export interface NTLogo { href: string; w: number; h: number; mask: boolean }

export interface NTProps {
  spec: NTSpec; data: NTData; person: NTPerson; logo?: NTLogo | null; mode?: NTMode;
  style?: CSSProperties; className?: string; nested?: { x: number; y: number; w: number; h: number };
}

const ENGRAVE: Partial<Record<NTMaterial, string>> = { gold: '#2C2010', silver: '#202328', blackGold: '#E6C77E', wood: '#4A2810' };

export function NametagSvg({ spec, data, person, logo = null, mode = 'view', style, className, nested }: NTProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const sz = ntSize(spec.size);
  const W = sz.wMm, H = sz.hMm;
  const mat = spec.material;
  const laser = isLaser(mat);
  const dark = isDarkBase(mat);
  const pal = ntPalette(spec.palette);
  const font = ntFont(spec.font);
  const print = mode === 'print';
  // màu mực
  const engrave = print ? '#000000' : ENGRAVE[mat] || '#222';
  const fg = laser ? engrave : dark ? pal.fgD : pal.fg;
  const acc = laser ? engrave : dark ? pal.accD : pal.acc;
  const sub = laser ? engrave : dark ? pal.subD : pal.sub;
  const onBand = laser ? 'knock' : dark ? '#141414' : '#FFFFFF';
  const box = safeBox(spec.shape, W, H);
  const layout = spec.layout;
  const showEn = (spec.bilingual || layout === 'bilingual') && !!person.en;
  const brand = (data.brand || '').trim();
  const up = (s: string, u?: boolean) => (u ? s.toLocaleUpperCase('vi') : s);

  const nameDef = (rel: number): LineDef => ({ key: 'name', text: up(person.name, font.upper), fam: font.family, wt: font.weight, ls: font.family === 'Great Vibes' ? 0 : 0.01, rel: font.family === 'Great Vibes' ? rel * 1.18 : rel, min: 2.4, color: fg });
  const titleDef = (rel = 0.17): LineDef => ({ key: 'title', text: up(person.title, true), fam: BODY, wt: 600, ls: 0.08, rel, min: 1.6, color: sub });
  const enDef = (): LineDef => ({ key: 'en', text: person.en, fam: EN, wt: 500, italic: true, ls: 0.01, rel: 0.16, min: 1.6, color: sub });
  const brandDef = (rel = 0.13, color = acc): LineDef => ({ key: 'brand', text: up(brand, true), fam: BODY, wt: 800, ls: 0.14, rel, min: 1.4, color });

  // phần tử đồ hoạ
  const els: ReactNode[] = [];
  const koText: ReactNode[] = []; // chữ khoét trên dải (khắc laser)
  let bandEl: ReactNode = null;

  const drawLogo = (x: number, y: number, w: number, h: number, color: string, key: string) => {
    if (logo) {
      if (logo.mask) {
        const id = `${uid}-lg-${key}`;
        els.push(
          <g key={key} data-nt-logo="1">
            <mask id={id} maskUnits="userSpaceOnUse" x={x} y={y} width={w} height={h}><image href={logo.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" /></mask>
            <rect x={x} y={y} width={w} height={h} fill={color} mask={`url(#${id})`} />
          </g>,
        );
      } else els.push(<image key={key} data-nt-logo="1" href={logo.href} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid meet" />);
    } else {
      const s = Math.min(w, h);
      els.push(<g key={key} data-nt-logo="1" transform={`translate(${x + (w - s) / 2} ${y + (h - s) / 2}) scale(${s / 24})`}>{industryIcon(spec.industry, color)}</g>);
    }
  };

  let fitted: Fitted[] = [];
  let rule: { x1: number; x2: number; y: number } | null = null;
  let anchor: 'start' | 'middle' | 'end' = 'start';
  let tx = box.x;

  if (layout === 'logo-left' || layout === 'logo-right' || layout === 'bilingual') {
    const ls = Math.min(box.h * (layout === 'bilingual' ? 0.78 : 0.92), box.w * 0.27);
    const gap = Math.max(1.6, H * 0.1);
    const left = layout !== 'logo-right';
    const lx = left ? box.x : box.x + box.w - ls;
    drawLogo(lx, box.y + (box.h - ls) / 2, ls, ls, acc, 'logo');
    // vạch dọc phân cách
    const vx = left ? lx + ls + gap / 2 : lx - gap / 2;
    els.push(<rect key="vr" x={vx - 0.18} y={box.y + box.h * 0.12} width={0.36} height={box.h * 0.76} fill={acc} opacity={laser ? 1 : 0.55} />);
    const tb = { x: left ? lx + ls + gap : box.x, y: box.y, w: box.w - ls - gap, h: box.h };
    const defs: LineDef[] = [nameDef(0.36), titleDef()];
    if (showEn) defs.push(enDef());
    fitted = fitDrop(defs, tb, H).fitted;
    anchor = left ? 'start' : 'end'; tx = left ? tb.x : tb.x + tb.w;
  } else if (layout === 'center') {
    const lh = box.h * 0.22;
    const defs: LineDef[] = [nameDef(0.34), titleDef(0.15)];
    if (showEn) defs.push(enDef());
    const tb = { x: box.x, y: box.y + lh + Math.max(0.5, H * 0.03), w: box.w, h: box.h - lh - Math.max(0.5, H * 0.03) };
    // logo nhỏ trên đầu + tên công ty kế bên
    const bs0 = Math.max(1.4, lh * 0.72);
    const bw0 = brand ? measure(up(brand, true), BODY, 800, bs0, 0.14).w : 0;
    const bsz0 = bw0 > box.w - lh - 1 ? bs0 * ((box.w - lh - 1) / bw0) : bs0;
    if (brand && bsz0 >= 1.35) { // tên công ty quá dài so với tấm → chỉ để logo cho gọn
      const bw = bw0;
      const total = lh + 1 + Math.min(bw, box.w - lh - 1);
      const x0 = W / 2 - total / 2;
      drawLogo(x0, box.y, lh, lh, acc, 'logo');
      const bsz = bsz0;
      els.push(<text key="brand" data-nt-text="brand" data-nt-size={bsz.toFixed(2)} x={x0 + lh + 1} y={box.y + lh / 2 + bsz * 0.36} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={bsz} letterSpacing={bsz * 0.14} fill={acc}>{up(brand, true)}</text>);
    } else drawLogo(W / 2 - lh / 2, box.y, lh, lh, acc, 'logo');
    fitted = fitDrop(defs, tb, H).fitted;
    anchor = 'middle'; tx = W / 2;
  } else if (layout === 'band') {
    const bw = W * 0.26;
    const bandFill = laser ? engrave : acc;
    bandEl = <rect key="band" x={-1} y={-1} width={bw + 1} height={H + 2} fill={bandFill} />;
    const is = Math.min(bw * 0.56, H * 0.56);
    const iconColor = laser ? '#000' : onBand;
    if (laser) {
      // khoét icon/logo khỏi dải: vẽ vào mask
      const s = is; const x = (bw - s) / 2 + (spec.shape === 'pill' ? H * 0.12 : spec.shape === 'oval' ? W * 0.05 : 0), y = (H - s) / 2;
      koText.push(logo && logo.mask
        ? <image key="ko-logo" href={logo.href} x={x} y={y} width={s} height={s} preserveAspectRatio="xMidYMid meet" style={{ filter: 'invert(1)' }} />
        : logo ? <rect key="ko-logo" x={x} y={y} width={s} height={s} fill="#000" />
          : <g key="ko-logo" transform={`translate(${x} ${y}) scale(${s / 24})`}>{industryIcon(spec.industry, iconColor)}</g>);
    } else {
      const off = spec.shape === 'pill' ? H * 0.12 : spec.shape === 'oval' ? W * 0.05 : 0;
      drawLogo((bw - is) / 2 + off, (H - is) / 2, is, is, onBand, 'logo');
    }
    const tb = { x: bw + Math.max(2, H * 0.12), y: box.y, w: W - bw - Math.max(2, H * 0.12) - (spec.shape === 'rect' ? 2.4 : box.x * 0.85), h: box.h };
    const defs: LineDef[] = [];
    if (brand) defs.push(brandDef(0.12));
    defs.push(nameDef(0.34), titleDef(0.15));
    if (showEn) defs.push(enDef());
    fitted = fitDrop(defs, tb, H).fitted;
    anchor = 'start'; tx = tb.x;
  } else if (layout === 'topbar') {
    const bh = H * (spec.shape === 'oval' ? 0.36 : 0.3);
    bandEl = <rect key="band" x={-1} y={-1} width={W + 2} height={bh + 1} fill={laser ? engrave : acc} />;
    if (brand) {
      // co chữ theo bề rộng THẬT của tấm ở độ cao dòng chữ (oval / bo tròn hẹp dần về mép trên)
      let bs = bh * 0.46, base = 0;
      for (let g = 0; g < 30; g++) {
        base = bh * (spec.shape === 'oval' ? 0.66 : 0.5) + bs * 0.36;
        const avail = chordW(spec.shape, W, H, base - bs * 0.78) - (spec.shape === 'rect' ? 6 : 2.4);
        const bwid = measure(up(brand, true), BODY, 800, bs, 0.14).w;
        if (bwid <= avail) break;
        bs *= Math.max(0.8, avail / bwid);
      }
      const t = <text key="brand" data-nt-text="brand" data-nt-size={bs.toFixed(2)} x={W / 2} y={base} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={bs} letterSpacing={bs * 0.14} fill={laser ? '#000' : onBand}>{up(brand, true)}</text>;
      if (laser) koText.push(t); else els.push(t);
    }
    const tb = { x: box.x, y: bh + Math.max(0.8, H * 0.06), w: box.w, h: H - bh - Math.max(0.8, H * 0.06) - box.y * 0.9 };
    const defs: LineDef[] = [nameDef(0.32), titleDef(0.14)];
    if (showEn) defs.push(enDef());
    fitted = fitDrop(defs, tb, H).fitted;
    anchor = 'middle'; tx = W / 2;
  } else { // minimal
    const defs: LineDef[] = [];
    if (brand) defs.push(brandDef(0.11));
    defs.push(nameDef(0.34), titleDef(0.15));
    if (showEn) defs.push(enDef());
    const ruleH = Math.max(1, H * 0.07);
    const r = fitDrop(defs, box, H, ruleH);
    fitted = r.fitted;
    if (r.ruleY !== undefined) rule = { x1: W / 2 - Math.min(box.w * 0.18, 9), x2: W / 2 + Math.min(box.w * 0.18, 9), y: r.ruleY };
    anchor = 'middle'; tx = W / 2;
  }

  const texts = fitted.map((f) => f.lines.map((ln, j) => (
    <text key={`${f.key}-${j}`} data-nt-text={f.key} data-nt-size={f.size.toFixed(2)} x={tx} y={f.base[j]} textAnchor={anchor}
      fontFamily={`"${f.fam}"`} fontWeight={f.wt} fontStyle={f.italic ? 'italic' : undefined} fontSize={f.size} letterSpacing={f.ls ? f.ls * f.size : undefined} fill={f.color}>{ln}</text>
  )));

  const plate = shapePath(spec.shape, 0, 0, W, H);
  const clipId = `${uid}-clip`, koId = `${uid}-ko`;

  // nền vật liệu (chỉ xem trước)
  let base: ReactNode = null;
  if (mode === 'view') {
    const g = `${uid}-g`, st = `${uid}-st`;
    const stops: Record<NTMaterial, string[]> = {
      gold: ['#F4DE9C', '#D6AE55', '#F7E5AE', '#CDA34B'], silver: ['#F1F3F5', '#C3C8CE', '#EEF0F2', '#BCC1C8'],
      blackGold: ['#26262A', '#151517', '#232326', '#141416'], metalUV: ['#F1F3F5', '#C9CED4', '#EEF0F2', '#C2C7CD'],
      micaWhite: ['#FFFFFF', '#F4F4F2', '#FFFFFF', '#F1F1EE'], micaBlack: ['#242428', '#0E0E10', '#1D1D20', '#0C0C0E'], wood: ['#D8A970', '#C08C55', '#D3A169', '#B98450'],
    };
    const brushedM = mat === 'gold' || mat === 'silver' || mat === 'metalUV';
    base = (
      <g>
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">{stops[mat].map((c, i) => <stop key={i} offset={i / 3} stopColor={c} />)}</linearGradient>
          {brushedM && (
            <pattern id={st} width={W} height={0.9} patternUnits="userSpaceOnUse">
              <rect width={W} height={0.3} fill="#fff" opacity={0.18} /><rect y={0.5} width={W} height={0.2} fill="#000" opacity={0.05} />
            </pattern>
          )}
        </defs>
        <path d={plate} fill={`url(#${g})`} />
        {brushedM && <path d={plate} fill={`url(#${st})`} />}
        {mat === 'wood' && Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M-2 ${(i + 0.5) * (H / 7)} C ${W * 0.3} ${(i + 0.5) * (H / 7) - 1.2} ${W * 0.6} ${(i + 0.5) * (H / 7) + 1.4} ${W + 2} ${(i + 0.5) * (H / 7) - 0.4}`} stroke="#7A4A22" strokeOpacity={0.18} strokeWidth={0.35} fill="none" />
        ))}
        {(mat === 'micaWhite' || mat === 'micaBlack') && <path d={shapePath(spec.shape, W * 0.02, H * 0.06, W * 0.96, H * 0.36)} fill="#fff" opacity={mat === 'micaWhite' ? 0.5 : 0.07} />}
      </g>
    );
  }

  const bandGroup = bandEl ? (
    laser ? <g mask={`url(#${koId})`}>{bandEl}</g> : bandEl
  ) : null;

  const content = (
    <>
      <defs>
        <clipPath id={clipId}><path d={plate} /></clipPath>
        {laser && bandEl && (
          <mask id={koId} maskUnits="userSpaceOnUse" x={-2} y={-2} width={W + 4} height={H + 4}>
            <rect x={-2} y={-2} width={W + 4} height={H + 4} fill="#fff" />
            {koText}
          </mask>
        )}
      </defs>
      {base}
      <g clipPath={`url(#${clipId})`} id={print ? (laser ? 'Khac' : 'In') : undefined}>
        {bandGroup}
        {els}
        {rule && <rect x={rule.x1} y={rule.y - 0.15} width={rule.x2 - rule.x1} height={0.3} fill={acc} />}
        {texts}
      </g>
      {mode === 'view' && <path d={plate} fill="none" stroke={dark ? '#000' : '#6B5A3A'} strokeOpacity={0.35} strokeWidth={0.25} />}
      {print && (
        <g id={laser || mat === 'metalUV' ? 'Khung' : 'CutContour'}>
          <path d={plate} fill="none" stroke={laser || mat === 'metalUV' ? '#00AEEF' : '#FF00FF'} strokeWidth={0.12} data-nt-plate="1" />
        </g>
      )}
      {!print && <path d={plate} fill="none" stroke="none" data-nt-plate="1" />}
    </>
  );

  if (nested) {
    return <svg x={nested.x} y={nested.y} width={nested.w} height={nested.h} viewBox={`0 0 ${W} ${H}`} overflow="visible">{content}</svg>;
  }
  return <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} style={style} className={className}>{content}</svg>;
}

// ---------- tờ sản xuất A4: mọi bảng tên xếp lưới ----------
export const SHEET = { W: 210, H: 297, m: 10, head: 16, gap: 6, label: 3.6 };
export function sheetFit(spec: NTSpec) {
  const s = ntSize(spec.size);
  const cols = Math.max(1, Math.floor((SHEET.W - SHEET.m * 2 + SHEET.gap) / (s.wMm + SHEET.gap)));
  const rows = Math.max(1, Math.floor((SHEET.H - SHEET.m * 2 - SHEET.head + SHEET.gap) / (s.hMm + SHEET.gap + SHEET.label)));
  return { cols, rows, per: cols * rows };
}
export const sheetPages = (spec: NTSpec, n: number) => Math.max(1, Math.ceil(n / sheetFit(spec).per));

export function NametagSheetSvg({ spec, data, people, logo = null, page, style }: { spec: NTSpec; data: NTData; people: NTPerson[]; logo?: NTLogo | null; page: number; style?: CSSProperties }) {
  const s = ntSize(spec.size);
  const { cols, per } = sheetFit(spec);
  const pages = sheetPages(spec, people.length);
  const list = people.slice(page * per, page * per + per);
  const gridW = cols * s.wMm + (cols - 1) * SHEET.gap;
  const x0 = (SHEET.W - gridW) / 2;
  const m = ntMaterial(spec.material);
  const laser = m.laser;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${SHEET.W} ${SHEET.H}`} style={style} data-nt-sheet={page}>
      <rect width={SHEET.W} height={SHEET.H} fill="#FFFFFF" />
      <g fontFamily={`"${BODY}"`} fill="#333">
        <text x={SHEET.m} y={SHEET.m + 3} fontSize={3.4} fontWeight={800}>MIVY · BẢNG TÊN CÀI ÁO · {(data.brand || '').toLocaleUpperCase('vi')}</text>
        <text x={SHEET.m} y={SHEET.m + 7.6} fontSize={2.3} fontWeight={600}>
          {m.name} · {s.name} · {ntShapeName(spec.shape)} · Mặt sau: {spec.back === 'pin' ? 'kim cài' : 'nam châm'} · {people.length} cái · Tỉ lệ 1:1 · Trang {page + 1}/{pages}
        </text>
        <text x={SHEET.m} y={SHEET.m + 11.4} fontSize={2.1} fontWeight={600} fill="#666">
          {laser ? 'Màu ĐEN = vùng khắc laser · viền xanh = khung phôi (không cắt)' : spec.material === 'metalUV' ? 'In UV đủ màu lên phôi kim loại · viền xanh = khung phôi (không cắt)' : `In UV${spec.material === 'micaBlack' ? ' (có lót trắng dưới chữ sáng)' : ''} rồi cắt laser theo đường hồng (CutContour)`}
        </text>
      </g>
      {list.map((p, i) => {
        const r = Math.floor(i / cols), c = i % cols;
        const x = x0 + c * (s.wMm + SHEET.gap), y = SHEET.m + SHEET.head + r * (s.hMm + SHEET.gap + SHEET.label);
        const idx = page * per + i + 1;
        return (
          <g key={i}>
            <NametagSvg spec={spec} data={data} person={p} logo={logo} mode="print" nested={{ x, y, w: s.wMm, h: s.hMm }} />
            <text x={x} y={y + s.hMm + 2.6} fontFamily={`"${BODY}"`} fontSize={1.8} fontWeight={600} fill="#888" data-nt-label={idx}>#{String(idx).padStart(2, '0')} {p.name}</text>
          </g>
        );
      })}
    </svg>
  );
}
const ntShapeName = (s: NTShape) => NT_SHAPES.find((x) => x.id === s)?.name || '';
