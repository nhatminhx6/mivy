'use client';
// Bình / ly giữ nhiệt khắc laser hoặc in UV: thiết kế = 2 ô trang trí (MẶT TRƯỚC: logo/thương hiệu, MẶT SAU: tên người nhận)
// đúng khổ vùng khắc tối đa của từng sản phẩm (mm). Mẫu = BỐ CỤC × HOÀN THIỆN (inox xước / sơn tĩnh điện màu) × CÁCH LÀM.
// Khắc laser = 1 màu (đen trong file = chỗ laser bắn): trên sơn → lộ inox sáng; trên inox trần → vết khắc sẫm.
// Khắc hàng loạt: danh sách tên (mỗi dòng 1 người, "Tên | số" cho áo đội) → mỗi bình 1 mặt sau riêng.
// Render code 100% (đơn vị SVG = mm), logo khách chỉ nằm trên máy, không AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- sản phẩm ----------
export type TBKind = 'flask' | 'sport' | 'tumbler';
export interface TBProduct {
  id: string; name: string; short: string; kind: TBKind;
  diaTop: number; diaBot: number; body: number; cap: number; // thân (mm) + nắp
  area: { w: number; h: number; y0: number };                 // vùng khắc tối đa mỗi mặt + cao độ đáy vùng (tính từ đáy bình)
  material: string;
}
export const TB_PRODUCTS: TBProduct[] = [
  { id: 'flask500', name: 'Bình inox 500ml (nắp vặn)', short: 'Bình 500ml', kind: 'flask', diaTop: 70, diaBot: 70, body: 205, cap: 50, area: { w: 52, h: 118, y0: 38 }, material: 'Bình inox 500ml khắc laser' },
  { id: 'sport750', name: 'Bình thể thao 750ml (có quai)', short: 'Bình thể thao', kind: 'sport', diaTop: 76, diaBot: 76, body: 212, cap: 34, area: { w: 56, h: 120, y0: 34 }, material: 'Bình inox 500ml khắc laser' },
  { id: 'tumbler600', name: 'Ly giữ nhiệt 600ml (nắp + ống hút)', short: 'Ly 600ml', kind: 'tumbler', diaTop: 88, diaBot: 66, body: 172, cap: 14, area: { w: 60, h: 92, y0: 40 }, material: 'Ly giữ nhiệt 600ml có ống hút' },
  { id: 'tumbler900', name: 'Ly giữ nhiệt 900ml (nắp + ống hút)', short: 'Ly 900ml', kind: 'tumbler', diaTop: 98, diaBot: 72, body: 195, cap: 15, area: { w: 64, h: 106, y0: 42 }, material: 'Ly giữ nhiệt 600ml có ống hút' },
];
export const tbProduct = (id: string) => TB_PRODUCTS.find((p) => p.id === id) || TB_PRODUCTS[0];

// ---------- hoàn thiện ----------
export interface TBFinish { id: string; name: string; hex: string | null } // null = inox xước
export const TB_FINISHES: TBFinish[] = [
  { id: 'steel', name: 'Inox xước', hex: null },
  { id: 'black', name: 'Đen nhám', hex: '#1E2023' },
  { id: 'navy', name: 'Xanh navy', hex: '#22324F' },
  { id: 'moss', name: 'Xanh rêu', hex: '#4A5A3E' },
  { id: 'wine', name: 'Đỏ đô', hex: '#6B1E2A' },
  { id: 'grey', name: 'Xám đá', hex: '#7D848D' },
  { id: 'pink', name: 'Hồng phấn', hex: '#E7B3BB' },
  { id: 'cream', name: 'Kem', hex: '#E8DECB' },
  { id: 'white', name: 'Trắng', hex: '#F1F1EE' },
];
export const tbFinish = (id: string) => TB_FINISHES.find((f) => f.id === id) || TB_FINISHES[0];

export type TBMethod = 'laser' | 'uv';
export const TB_METHODS: { id: TBMethod; name: string; hint: string }[] = [
  { id: 'laser', name: 'Khắc laser', hint: '1 màu, bền vĩnh viễn, sang' },
  { id: 'uv', name: 'In UV màu', hint: 'Đủ màu, hợp logo nhiều màu' },
];

const STEEL_ENGRAVE = '#3E4247';  // vết khắc trên inox trần (sẫm)
const STEEL_BARE = '#C9CDD2';     // lộ inox khi khắc trên lớp sơn
export const luma = (hex: string) => {
  const s = hex.replace('#', ''); const [r, g, b] = [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b;
};
/** màu vết khắc nhìn thấy trên thành phẩm */
export const engraveHex = (f: TBFinish) => (f.hex ? STEEL_BARE : STEEL_ENGRAVE);
export const finishBase = (f: TBFinish) => f.hex || '#B9BEC4';

// ---------- bảng màu in UV ----------
export interface TBPalette { id: string; name: string; main: string; accent: string; sub: string }
export const TB_PALETTES: TBPalette[] = [
  { id: 'gold', name: 'Vàng kim', main: '#E9C670', accent: '#C9962E', sub: '#F3E3B8' },
  { id: 'white', name: 'Trắng + vàng', main: '#FFFFFF', accent: '#FFC93C', sub: '#E5E7EB' },
  { id: 'ink', name: 'Mực đen + đỏ', main: '#1E2230', accent: '#C8102E', sub: '#4B5563' },
  { id: 'coffee', name: 'Nâu cà phê', main: '#4A2E1E', accent: '#B9783F', sub: '#7A5A45' },
  { id: 'neon', name: 'Trắng + xanh neon', main: '#FFFFFF', accent: '#B6FF3B', sub: '#C7CDD4' },
  { id: 'ocean', name: 'Xanh biển + cam', main: '#0E3A5F', accent: '#F08A3C', sub: '#3C6E91' },
  { id: 'redgold', name: 'Đỏ + vàng Tết', main: '#F7D57A', accent: '#FFFFFF', sub: '#F3C1A0' },
];
export const tbPalette = (id: string) => TB_PALETTES.find((p) => p.id === id) || TB_PALETTES[0];

/** cảnh báo tương phản thấp (mực/vết khắc gần màu thân bình) */
export function lowContrast(spec: TBSpec): boolean {
  const f = tbFinish(spec.finish);
  const base = finishBase(f);
  const ink = spec.method === 'laser' ? engraveHex(f) : tbPalette(spec.palette).main;
  return Math.abs(luma(base) - luma(ink)) < 55;
}

// ---------- font ----------
export interface TBFont { id: string; name: string; family: string; weight: number }
export const TB_FONTS: TBFont[] = [
  { id: 'montserrat', name: 'Montserrat (hiện đại)', family: 'Montserrat', weight: 800 },
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800 },
  { id: 'oswald', name: 'Oswald (khoẻ, gọn)', family: 'Oswald', weight: 700 },
  { id: 'bvp', name: 'Be Vietnam (dễ đọc)', family: 'Be Vietnam Pro', weight: 800 },
];
export const tbFont = (id: string) => TB_FONTS.find((f) => f.id === id) || TB_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
const HAND = 'Dancing Script';
export const TB_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Oswald:wght@700&family=Great+Vibes&family=Dancing+Script:wght@700&display=swap');`;

export function useTBFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-tb-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-tb-fonts'; link.rel = 'stylesheet';
        link.href = TB_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...TB_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `400 40px "${SCRIPT}"`, `700 40px "${HAND}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bố cục + mẫu ----------
export interface TBLayout { id: string; name: string }
export const TB_LAYOUTS: TBLayout[] = [
  { id: 'corp', name: 'Quà doanh nghiệp' },
  { id: 'vip', name: 'Tri ân khách VIP' },
  { id: 'anniv', name: 'Kỷ niệm thành lập' },
  { id: 'event', name: 'Hội nghị · sự kiện' },
  { id: 'gym', name: 'Gym · uống đủ nước' },
  { id: 'minimal', name: 'Tên riêng tối giản' },
  { id: 'tet', name: 'Quà Tết' },
  { id: 'team', name: 'Đội nhóm · team' },
  { id: 'cafe', name: 'Quán cà phê' },
];
export const tbLayout = (id: string) => TB_LAYOUTS.find((l) => l.id === id) || TB_LAYOUTS[0];

export interface TBSpec { layout: string; product: string; finish: string; method: TBMethod; palette: string; font: string }
export interface TBTemplate { id: string; name: string; spec: TBSpec }
export const TB_TEMPLATES: TBTemplate[] = [
  { id: 'corp-black', name: 'Quà doanh nghiệp · đen khắc', spec: { layout: 'corp', product: 'flask500', finish: 'black', method: 'laser', palette: 'gold', font: 'montserrat' } },
  { id: 'corp-steel', name: 'Doanh nghiệp · inox xước', spec: { layout: 'corp', product: 'flask500', finish: 'steel', method: 'laser', palette: 'ink', font: 'playfair' } },
  { id: 'vip-navy', name: 'Tri ân khách VIP · navy', spec: { layout: 'vip', product: 'flask500', finish: 'navy', method: 'laser', palette: 'gold', font: 'playfair' } },
  { id: 'anniv-white', name: 'Kỷ niệm 10 năm · in UV', spec: { layout: 'anniv', product: 'flask500', finish: 'white', method: 'uv', palette: 'ocean', font: 'montserrat' } },
  { id: 'event-moss', name: 'Hội nghị khách hàng', spec: { layout: 'event', product: 'flask500', finish: 'moss', method: 'laser', palette: 'gold', font: 'oswald' } },
  { id: 'gym-black', name: 'Gym · mốc uống nước', spec: { layout: 'gym', product: 'sport750', finish: 'black', method: 'uv', palette: 'neon', font: 'oswald' } },
  { id: 'minimal-pink', name: 'Tên riêng · hồng phấn in UV', spec: { layout: 'minimal', product: 'flask500', finish: 'pink', method: 'uv', palette: 'ink', font: 'playfair' } },
  { id: 'tet-wine', name: 'Quà Tết · đỏ đô in UV', spec: { layout: 'tet', product: 'flask500', finish: 'wine', method: 'uv', palette: 'redgold', font: 'playfair' } },
  { id: 'team-navy', name: 'Team building · số áo', spec: { layout: 'team', product: 'sport750', finish: 'navy', method: 'uv', palette: 'white', font: 'oswald' } },
  { id: 'cafe-cream', name: 'Ly quán cà phê · kem', spec: { layout: 'cafe', product: 'tumbler600', finish: 'cream', method: 'uv', palette: 'coffee', font: 'playfair' } },
  { id: 'thanks-navy', name: 'Cảm ơn nhân viên · ly', spec: { layout: 'vip', product: 'tumbler900', finish: 'navy', method: 'laser', palette: 'white', font: 'montserrat' } },
  { id: 'corp-tumbler', name: 'Ly giữ nhiệt doanh nghiệp', spec: { layout: 'corp', product: 'tumbler600', finish: 'black', method: 'laser', palette: 'gold', font: 'oswald' } },
];

// ---------- nội dung ----------
export type TBData = Record<string, string>;
export interface TBField { key: string; label: string; ph?: string; multiline?: boolean }
const F = {
  brand: { key: 'brand', label: 'Tên công ty / thương hiệu', ph: 'AN KHANG GROUP' },
  slogan: { key: 'slogan', label: 'Slogan / dòng phụ', ph: 'Đồng hành cùng thành công' },
  names: { key: 'names', label: 'Tên người nhận — mỗi dòng 1 người (khắc riêng từng bình)', ph: 'Nguyễn Quốc Bảo\nTrần Thu Hà', multiline: true },
  message: { key: 'message', label: 'Lời nhắn mặt sau', ph: 'Cảm ơn bạn đã đồng hành', multiline: true },
  gift: { key: 'gift', label: 'Dòng trên tên', ph: 'Thân tặng' },
  years: { key: 'years', label: 'Số năm', ph: '10' },
  span: { key: 'span', label: 'Năm thành lập – nay', ph: '2017 – 2027' },
  eyebrow: { key: 'eyebrow', label: 'Dòng nhỏ trên', ph: 'HỘI NGHỊ KHÁCH HÀNG' },
  event: { key: 'event', label: 'Tên sự kiện', ph: 'Kết nối – Bứt phá 2027' },
  date: { key: 'date', label: 'Ngày', ph: '15.03.2027' },
  place: { key: 'place', label: 'Địa điểm', ph: 'GEM Center, TP.HCM' },
  headline: { key: 'headline', label: 'Câu chính', ph: 'UỐNG ĐỦ NƯỚC' },
  marks: { key: 'marks', label: 'Mốc uống nước — mỗi dòng "giờ | lời nhắc"', ph: '8:00 | Khởi động', multiline: true },
  wish: { key: 'wish', label: 'Lời chúc', ph: 'An khang thịnh vượng' },
  team: { key: 'team', label: 'Tên đội', ph: 'AN KHANG FC' },
  tagline: { key: 'tagline', label: 'Dòng giới thiệu', ph: 'Rang mộc · pha tay' },
} satisfies Record<string, TBField>;
export const TB_FIELDS: Record<string, TBField[]> = {
  corp: [F.brand, F.slogan, F.names, F.message],
  vip: [F.brand, F.gift, F.names, F.message],
  anniv: [F.brand, F.years, F.span, F.names, F.message],
  event: [F.eyebrow, F.event, F.date, F.place, F.brand, F.names, F.message],
  gym: [F.headline, F.marks, F.brand, F.names, F.message],
  minimal: [F.names, F.message, F.brand],
  tet: [F.brand, F.wish, F.names, F.message],
  team: [F.team, F.brand, { ...F.names, label: 'Thành viên — mỗi dòng "Tên | số áo"', ph: 'Quốc Bảo | 07' }, F.message],
  cafe: [F.brand, F.tagline, F.names, F.message],
};
const NAMES = 'Nguyễn Quốc Bảo\nTrần Thu Hà\nLê Gia Khánh';
export const TB_SAMPLES: Record<string, TBData> = {
  corp: { brand: 'AN KHANG GROUP', slogan: 'Đồng hành cùng thành công', names: NAMES, message: 'Cảm ơn bạn đã luôn đồng hành cùng An Khang' },
  vip: { brand: 'AN KHANG BANK', gift: 'Thân tặng', names: 'Chị Trần Thu Hà\nAnh Lê Gia Khánh\nAnh Nguyễn Quốc Bảo', message: 'Trân trọng cảm ơn Quý khách đã tin tưởng' },
  anniv: { brand: 'AN KHANG GROUP', years: '10', span: '2017 – 2027', names: NAMES, message: '10 năm vững bước — cảm ơn bạn đã là một phần hành trình' },
  event: { eyebrow: 'Hội nghị khách hàng', event: 'Kết nối – Bứt phá 2027', date: '15.03.2027', place: 'GEM Center, TP.HCM', brand: 'AN KHANG', names: NAMES, message: 'Cảm ơn bạn đã tham dự' },
  gym: { headline: 'Uống đủ nước', marks: '8:00 | Khởi động ngày mới\n10:00 | Giữ nhịp nhé\n12:00 | Nạp năng lượng\n14:00 | Tỉnh táo lên\n16:00 | Sắp xong rồi\n18:00 | Hoàn thành!', brand: 'AN KHANG FITNESS', names: 'Thu Hà\nQuốc Bảo\nGia Khánh', message: 'Mục tiêu: 2 lít mỗi ngày' },
  minimal: { names: 'Trần Thu Hà\nNguyễn Quốc Bảo\nLê Gia Khánh', message: 'Mỗi ngày một ngụm yêu thương', brand: '' },
  tet: { brand: 'AN KHANG GROUP', wish: 'An khang thịnh vượng', names: NAMES, message: 'Kính chúc năm mới vạn sự như ý' },
  team: { team: 'AN KHANG FC', brand: 'Team Building 2027', names: 'Quốc Bảo | 07\nThu Hà | 10\nGia Khánh | 23', message: 'Cùng nhau chiến thắng' },
  cafe: { brand: 'AN KHANG COFFEE', tagline: 'Rang mộc · pha tay', names: 'Quốc Bảo\nThu Hà\nGia Khánh', message: 'Mang ly theo — giảm 5.000đ mỗi lần ghé' },
};
export const defaultTBData = (layout = 'corp'): TBData => ({ ...(TB_SAMPLES[layout] || TB_SAMPLES.corp) });
// đổi bố cục khi khách đã sửa: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu mới
export function switchTBData(d: TBData, from: string, to: string): TBData {
  const oldS = TB_SAMPLES[from] || {}, next: TBData = { ...defaultTBData(to) };
  for (const [k, v] of Object.entries(d)) if (v && v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

export interface TBPerson { name: string; num: string }
export const MAX_NAMES = 200;
/** danh sách người nhận (mỗi dòng 1 người; "Tên | số"). Trống → 1 bình không tên */
export function tbPeople(d: TBData): TBPerson[] {
  const rows = (d.names || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, MAX_NAMES)
    .map((l) => { const [n, k] = l.split('|').map((s) => s.trim()); return { name: n || '', num: k || '' }; });
  return rows.length ? rows : [{ name: '', num: '' }];
}

// ---------- đo chữ thật (canvas) ----------
let mctx: CanvasRenderingContext2D | null = null;
const ctx = () => (mctx ||= typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null);
export function tw(text: string, fam: string, weight: number, size: number, ls = 0): number {
  const c = ctx();
  if (!c) return text.length * size * 0.56;
  c.font = `${weight} ${size}px "${fam}"`;
  return c.measureText(text).width + ls * Math.max(0, [...text].length - 1);
}
function wrapLines(text: string, fam: string, weight: number, size: number, maxW: number, ls = 0): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const t = cur ? cur + ' ' + w : w;
      if (!cur || tw(t, fam, weight, size, ls) <= maxW) cur = t;
      else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
function balance(lines: string[], fam: string, weight: number, size: number, maxW: number, ls: number): string[] {
  if (lines.length < 2) return lines;
  const all = lines.join(' ');
  let best = lines, bestW = Math.max(...lines.map((l) => tw(l, fam, weight, size, ls)));
  for (let k = 0.3; k < 1; k += 0.04) {
    const t = wrapLines(all, fam, weight, size, maxW * k, ls);
    if (t.length !== lines.length) continue;
    const w = Math.max(...t.map((l) => tw(l, fam, weight, size, ls)));
    if (w <= maxW && w < bestW + 0.01) { best = t; bestW = w; }
  }
  return best;
}

interface TextOpts { fam: string; weight: number; max: number; min?: number; maxLines?: number; ls?: number; lh?: number; upper?: boolean; role?: Role; widthK?: number }
interface Fitted { lines: string[]; size: number; o: TextOpts }
function fitText(text: string, maxW: number, o: TextOpts, scale = 1): Fitted | null {
  const t = (o.upper ? (text || '').toUpperCase() : text || '').replace(/[ \t]+/g, ' ').trim();
  if (!t) return null;
  const max = o.max * scale, min = Math.max(2.2, (o.min ?? o.max * 0.42) * scale), ml = o.maxLines ?? 2;
  let size = max;
  for (let i = 0; i < 50; i++) {
    const ls = (o.ls ?? 0) * size;
    const lines = wrapLines(t, o.fam, o.weight, size, maxW, ls);
    if (lines.length <= ml && lines.every((l) => tw(l, o.fam, o.weight, size, ls) <= maxW)) {
      return { lines: balance(lines, o.fam, o.weight, size, maxW, ls), size, o };
    }
    if (size <= min + 1e-6) {
      // tới cỡ nhỏ nhất mà vẫn dài: giữ maxLines dòng, ép ngang từng dòng (không dưới 2.2mm)
      const keep = lines.slice(0, ml);
      const s2 = Math.min(size, ...keep.map((l) => (size * maxW) / Math.max(0.01, tw(l, o.fam, o.weight, size, ls))));
      return { lines: keep, size: Math.max(2.2, s2), o };
    }
    size = Math.max(min, size * 0.94);
  }
  return null;
}

type Role = 'main' | 'accent' | 'sub';
type Item =
  | { k: 't'; text: string; o: TextOpts }
  | { k: 'g'; h: number; render: (y: number, h: number) => ReactNode }
  | { k: 'gap'; h: number };
interface Box { x: number; y: number; w: number; h: number }

// ngăn xếp dọc canh giữa, tự co cả khối cho vừa chiều cao ô
function Stack({ box, items, ink }: { box: Box; items: Item[]; ink: (r: Role) => string }) {
  const X = box.x + box.w / 2;
  let scale = 1, placed: { it: Item; f?: Fitted; h: number }[] = [];
  for (let pass = 0; pass < 14; pass++) {
    placed = items.map((it) => {
      if (it.k === 't') {
        const f = fitText(it.text, box.w * (it.o.widthK ?? 1), it.o, scale);
        return { it, f: f || undefined, h: f ? f.lines.length * f.size * (it.o.lh ?? 1.2) : 0 };
      }
      return { it, h: it.h * scale };
    }).filter((p) => p.h > 0);
    const total = placed.reduce((a, p) => a + p.h, 0);
    if (total <= box.h || scale < 0.35) break;
    scale *= Math.max(0.8, Math.min(0.97, box.h / total));
  }
  const total = placed.reduce((a, p) => a + p.h, 0);
  let y = box.y + Math.max(0, (box.h - total) / 2);
  const nodes: ReactNode[] = [];
  placed.forEach((p, i) => {
    if (p.it.k === 't' && p.f) {
      const { lines, size, o } = p.f;
      const lh = o.lh ?? 1.2;
      lines.forEach((ln, j) => {
        const base = y + j * size * lh + size * lh / 2 + size * 0.35;
        nodes.push(
          <text key={`${i}-${j}`} x={X} y={base} textAnchor="middle" fontFamily={`"${o.fam}"`} fontWeight={o.weight} fontSize={size}
            fill={ink(o.role || 'main')} letterSpacing={(o.ls ?? 0) * size || undefined}>{ln}</text>,
        );
      });
    } else if (p.it.k === 'g') {
      nodes.push(<g key={i}>{p.it.render(y, p.h)}</g>);
    }
    y += p.h;
  });
  return <>{nodes}</>;
}

// ---------- hoạ tiết vẽ code ----------
const initials = (s: string) => {
  const w = (s || '').replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean);
  if (!w.length) return 'AK';
  const pick = w.length >= 3 ? [w[w.length - 2], w[w.length - 1]] : w.slice(0, 2);
  return pick.map((x) => x[0]).join('').toUpperCase();
};
function Monogram({ cx, cy, r, text, ink, fam, weight }: { cx: number; cy: number; r: number; text: string; ink: string; fam: string; weight: number }) {
  const t = initials(text);
  const size = Math.min(r * 0.95, (r * 1.45) / Math.max(1, tw(t, fam, weight, 1)));
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={ink} strokeWidth={Math.max(0.5, r * 0.07)} />
      <circle cx={cx} cy={cy} r={r * 0.84} fill="none" stroke={ink} strokeWidth={Math.max(0.3, r * 0.025)} />
      <text x={cx} y={cy + size * 0.35} textAnchor="middle" fontFamily={`"${fam}"`} fontWeight={weight} fontSize={size} fill={ink}>{t}</text>
    </g>
  );
}
function Rule({ cx, y, w, ink, diamond = true }: { cx: number; y: number; w: number; ink: string; diamond?: boolean }) {
  return (
    <g>
      <line x1={cx - w / 2} y1={y} x2={cx - (diamond ? 1.8 : 0)} y2={y} stroke={ink} strokeWidth={0.45} />
      <line x1={cx + (diamond ? 1.8 : 0)} y1={y} x2={cx + w / 2} y2={y} stroke={ink} strokeWidth={0.45} />
      {diamond && <path d={`M${cx - 1.1} ${y} L${cx} ${y - 1.1} L${cx + 1.1} ${y} L${cx} ${y + 1.1} Z`} fill={ink} />}
    </g>
  );
}
function Blossom({ cx, cy, r, ink, rot = 0 }: { cx: number; cy: number; r: number; ink: string; rot?: number }) {
  return (
    <g transform={`rotate(${rot} ${cx} ${cy})`}>
      {Array.from({ length: 5 }, (_, i) => {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        return <ellipse key={i} cx={cx + Math.cos(a) * r * 0.55} cy={cy + Math.sin(a) * r * 0.55} rx={r * 0.48} ry={r * 0.36} transform={`rotate(${(a * 180) / Math.PI + 90} ${cx + Math.cos(a) * r * 0.55} ${cy + Math.sin(a) * r * 0.55})`} fill={ink} />;
      })}
      <circle cx={cx} cy={cy} r={r * 0.2} fill="none" stroke={ink} strokeWidth={r * 0.08} opacity={0.6} />
    </g>
  );
}
function MaiBranch({ x, y, s, ink, flip = false }: { x: number; y: number; s: number; ink: string; flip?: boolean }) {
  // cành mai: thân cong có đốt + 4 hoa 5 cánh to + nụ
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 2 C 5 3, 9 1.5, 13 -1 C 16 -3, 19 -3.5, 23 -3 M9 1.4 C 11 4, 13 6.5, 17 8 M15 -2 C 16 -5.5, 18 -8, 20 -9.5" stroke={ink} strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Blossom cx={23} cy={-3} r={4.2} ink={ink} rot={12} />
      <Blossom cx={17} cy={8} r={3.6} ink={ink} rot={48} />
      <Blossom cx={20.5} cy={-9.8} r={3} ink={ink} rot={80} />
      <Blossom cx={8} cy={-1.8} r={2.6} ink={ink} rot={30} />
      <circle cx={12.5} cy={4.4} r={1.15} fill={ink} /><circle cx={4} cy={2.6} r={0.9} fill={ink} /><circle cx={25.5} cy={4} r={1} fill={ink} />
    </g>
  );
}
// đôi cành mai đối xứng, tự co cho gọn trong ô (cành cao ~25 đơn vị: từ -13 tới +12, rộng 30)
function MaiPair({ cx, y, h, maxW, ink }: { cx: number; y: number; h: number; maxW: number; ink: string }) {
  const s = Math.min(h / 25.5, (maxW / 2 - 2.5) / 30.5);
  const ay = y + h / 2 - 0.5 * s; // tâm khối cao 25 đơn vị nằm giữa ô
  return <><MaiBranch x={cx - 2} y={ay} s={s} ink={ink} flip /><MaiBranch x={cx + 2} y={ay} s={s} ink={ink} /></>;
}
function CoffeeCup({ cx, cy, s, ink }: { cx: number; cy: number; s: number; ink: string }) {
  return (
    <g transform={`translate(${cx} ${cy}) scale(${s})`} fill="none" stroke={ink} strokeWidth={1.1} strokeLinecap="round">
      <path d="M-8 -2 L8 -2 L6.5 9 Q6 11 4 11 L-4 11 Q-6 11 -6.5 9 Z" fill={ink} stroke="none" />
      <path d="M8 1 Q12.5 1 12 4.5 Q11.5 7.5 7.2 7" />
      <path d="M-3 -6 Q-5 -9 -3 -12 M1 -6 Q-1 -9 1 -12 M5 -6 Q3 -9 5 -12" strokeWidth={0.9} />
      <path d="M-11 13 L11 13" />
    </g>
  );
}
function Drop({ cx, cy, h, ink }: { cx: number; cy: number; h: number; ink: string }) {
  const w = h * 0.62;
  return <path d={`M${cx} ${cy - h / 2} C ${cx + w * 0.15} ${cy - h * 0.2}, ${cx + w / 2} ${cy}, ${cx + w / 2} ${cy + h * 0.14} A ${w / 2} ${w / 2} 0 0 1 ${cx - w / 2} ${cy + h * 0.14} C ${cx - w / 2} ${cy}, ${cx - w * 0.15} ${cy - h * 0.2}, ${cx} ${cy - h / 2} Z`} fill={ink} />;
}

// ---------- logo ----------
export interface TBLogo { src: string; mask?: { href: string; w: number; h: number } | null; w: number; h: number }
function LogoArt({ logo, x, y, w, h, ink, uv, uid }: { logo: TBLogo; x: number; y: number; w: number; h: number; ink: string; uv: boolean; uid: string }) {
  const ar = (uv ? logo.w / logo.h : (logo.mask ? logo.mask.w / logo.mask.h : logo.w / logo.h)) || 1;
  let lw = w, lh = w / ar;
  if (lh > h) { lh = h; lw = h * ar; }
  const lx = x + (w - lw) / 2, ly = y + (h - lh) / 2;
  if (uv || !logo.mask) return <image href={logo.src} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="xMidYMid meet" data-logo="1" />;
  // khắc laser: logo → bóng 1 màu (mask) tô bằng màu mực
  return (
    <g data-logo="1">
      <defs><mask id={`${uid}-lm`} maskUnits="userSpaceOnUse" x={lx} y={ly} width={lw} height={lh}><image href={logo.mask.href} x={lx} y={ly} width={lw} height={lh} preserveAspectRatio="none" /></mask></defs>
      <rect x={lx} y={ly} width={lw} height={lh} fill={ink} mask={`url(#${uid}-lm)`} />
    </g>
  );
}

// ---------- vẽ 1 mặt ----------
/** preview = nền màu bình + màu vết khắc/mực thật; print = file in (laser: đen trên trắng; UV: màu, nền trong);
 *  mask = texture 3D cho khắc (trắng = chỗ khắc, nền đen); decal = texture 3D cho in UV (nền trong) */
export type TBRender = 'preview' | 'print' | 'mask' | 'decal';
export type TBSide = 'front' | 'back';

function sideArt(spec: TBSpec, side: TBSide, d: TBData, person: TBPerson, W: number, H: number, ink: (r: Role) => string, logo: TBLogo | null, uv: boolean, uid: string): ReactNode {
  const f = tbFont(spec.font);
  const disp = { fam: f.family, weight: f.weight };
  const m = 3.2;
  const box: Box = { x: m, y: m, w: W - m * 2, h: H - m * 2 };
  const cx = W / 2;
  const logoItem = (hk: number): Item => ({
    k: 'g', h: H * hk, render: (y, h) => (logo
      ? <LogoArt logo={logo} x={cx - box.w * 0.42} y={y + h * 0.06} w={box.w * 0.84} h={h * 0.88} ink={ink('main')} uv={uv} uid={uid} />
      : <Monogram cx={cx} cy={y + h / 2} r={Math.min(h * 0.44, box.w * 0.3)} text={d.brand || d.team || person.name} ink={ink('main')} fam={f.family} weight={f.weight} />),
  });
  const rule = (w = 0.5): Item => ({ k: 'g', h: 3.2, render: (y, h) => <Rule cx={cx} y={y + h / 2} w={box.w * w} ink={ink('accent')} /> });
  const gap = (h: number): Item => ({ k: 'gap', h });
  const T = (text: string, o: TextOpts): Item => ({ k: 't', text, o });
  const name = person.name;
  const L = spec.layout;

  if (side === 'back') {
    // mặt sau: tên người nhận (khắc riêng từng bình) + lời nhắn + thương hiệu nhỏ
    const scriptName = L === 'vip' || L === 'minimal' || L === 'tet';
    const items: Item[] = [];
    if (L === 'team') {
      if (person.num) items.push(T(person.num, { ...disp, max: 30, maxLines: 1, lh: 1.02, role: 'accent' }));
      items.push(T(name, { ...disp, max: 8.5, maxLines: 2, upper: true, ls: 0.04 }), gap(2), rule(0.42), gap(2));
      if (d.team) items.push(T(d.team, { fam: BODY, weight: 800, max: 4, maxLines: 2, upper: true, ls: 0.14, role: 'sub' }));
      if (d.message) items.push(gap(1.5), T(d.message, { fam: BODY, weight: 600, max: 3.6, maxLines: 3, role: 'sub' }));
    } else if (L === 'gym') {
      items.push(
        { k: 'g', h: 14, render: (y, h) => <Drop cx={cx} cy={y + h / 2} h={h * 0.9} ink={ink('accent')} /> }, gap(3),
        T(name, { ...disp, max: 10, maxLines: 2, upper: true, ls: 0.03 }), gap(2),
        T(d.message || '', { fam: BODY, weight: 600, max: 4, maxLines: 3, role: 'sub' }),
      );
      if (d.brand) items.push(gap(5), T(d.brand, { fam: BODY, weight: 800, max: 3, maxLines: 2, upper: true, ls: 0.18, role: 'sub' }));
    } else {
      if (L === 'vip' || L === 'tet') items.push(T(d.gift || (L === 'tet' ? 'Kính tặng' : 'Thân tặng'), { fam: BODY, weight: 600, max: 3.6, maxLines: 1, upper: true, ls: 0.28, role: 'sub' }), gap(2));
      if (L === 'tet') items.push({ k: 'g', h: 12, render: (y, h) => <MaiPair cx={cx} y={y} h={h} maxW={box.w} ink={ink('accent')} /> }, gap(2));
      if (name) items.push(T(name, scriptName ? { fam: SCRIPT, weight: 400, max: 14, min: 5, maxLines: 2, lh: 1.05 } : { ...disp, max: 9, maxLines: 2, upper: true, ls: 0.03 }));
      items.push(gap(2.5), rule(0.5), gap(2.5));
      if (d.message) items.push(T(d.message, { fam: L === 'minimal' ? HAND : BODY, weight: L === 'minimal' ? 700 : 600, max: L === 'minimal' ? 5.2 : 3.8, maxLines: 4, lh: 1.28, role: 'sub' }));
      if (L !== 'minimal' && d.brand) items.push(gap(5), T(d.brand, { fam: BODY, weight: 800, max: 3.2, maxLines: 2, upper: true, ls: 0.2, role: 'sub' }));
      if (L === 'anniv' && d.span) items.push(gap(1), T(d.span, { fam: BODY, weight: 600, max: 3, maxLines: 1, role: 'sub' }));
    }
    return <Stack box={box} items={items} ink={ink} />;
  }

  // ---- mặt trước ----
  let items: Item[] = [];
  if (L === 'corp') {
    items = [logoItem(0.3), gap(4), T(d.brand || '', { ...disp, max: 8, maxLines: 3, upper: true, ls: 0.04 }), gap(2), rule(0.46), gap(2), T(d.slogan || '', { fam: BODY, weight: 600, max: 4, maxLines: 3, role: 'sub' })];
  } else if (L === 'vip') {
    items = [logoItem(0.24), gap(4), T(d.brand || '', { ...disp, max: 7, maxLines: 3, upper: true, ls: 0.06 }), gap(2.5), rule(0.4), gap(2.5),
      T('Tri ân khách hàng', { fam: SCRIPT, weight: 400, max: 9, min: 4.5, maxLines: 2, lh: 1.05, role: 'accent' })];
  } else if (L === 'anniv') {
    items = [logoItem(0.16), gap(2), T(d.years || '10', { ...disp, max: 42, maxLines: 1, lh: 1.0, role: 'accent' }), T('NĂM', { fam: BODY, weight: 800, max: 6, maxLines: 1, ls: 0.4 }),
      gap(1.5), T('Kỷ niệm thành lập', { fam: SCRIPT, weight: 400, max: 7.5, min: 4, maxLines: 1, role: 'sub' }), gap(2), rule(0.5), gap(2),
      T(d.brand || '', { ...disp, max: 5.4, maxLines: 2, upper: true, ls: 0.05 }), T(d.span || '', { fam: BODY, weight: 600, max: 3.4, maxLines: 1, role: 'sub' })];
  } else if (L === 'event') {
    items = [T(d.eyebrow || '', { fam: BODY, weight: 800, max: 3.6, maxLines: 2, upper: true, ls: 0.18, role: 'accent' }), gap(3),
      T(d.event || '', { ...disp, max: 9, maxLines: 4, upper: true, lh: 1.12 }), gap(2.5), rule(0.5), gap(2.5),
      T(d.date || '', { fam: BODY, weight: 800, max: 4.4, maxLines: 1, ls: 0.08 }), T(d.place || '', { fam: BODY, weight: 600, max: 3.4, maxLines: 2, role: 'sub' }),
      gap(4), logoItem(0.13)];
  } else if (L === 'gym') {
    // mốc uống nước: giờ trái | lời nhắc phải + vạch mực nước
    const marks = (d.marks || '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((a) => a[0]).slice(0, 8);
    const head = fitText(d.headline || '', box.w, { ...disp, max: 8.5, maxLines: 2, upper: true, ls: 0.03 });
    const headH = head ? head.lines.length * head.size * 1.15 : 0;
    const top = m + headH + 4, bot = H - m - 2;
    const rowH = marks.length ? (bot - top) / marks.length : 0;
    const tSize = Math.min(6.2, rowH * 0.42);
    const timeW = Math.max(...marks.map((r) => tw(r[0], f.family, f.weight, tSize)), 1);
    const lblMax = box.w - timeW - 7;
    return (
      <>
        {head && head.lines.map((ln, j) => (
          <text key={`h${j}`} x={cx} y={m + j * head.size * 1.15 + head.size * 0.92} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={head.size} fill={ink('main')} letterSpacing={0.03 * head.size}>{ln}</text>
        ))}
        {marks.map((r, i) => {
          const yc = top + rowH * (i + 0.5);
          const lbl = fitText(r[1] || '', lblMax, { fam: BODY, weight: 600, max: Math.min(3.8, rowH * 0.3), min: 2.2, maxLines: 2, lh: 1.12 });
          const lh = lbl ? lbl.size * 1.12 : 0;
          return (
            <g key={i}>
              <line x1={m} y1={top + rowH * i} x2={W - m} y2={top + rowH * i} stroke={ink('sub')} strokeWidth={0.3} strokeDasharray="1 1.2" />
              <text x={m} y={yc + tSize * 0.35} fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={tSize} fill={ink('accent')}>{r[0]}</text>
              {lbl && lbl.lines.map((ln, j) => (
                <text key={j} x={W - m} y={yc - ((lbl.lines.length - 1) * lh) / 2 + j * lh + lbl.size * 0.35} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={lbl.size} fill={ink('main')}>{ln}</text>
              ))}
            </g>
          );
        })}
        <line x1={m} y1={bot} x2={W - m} y2={bot} stroke={ink('sub')} strokeWidth={0.3} strokeDasharray="1 1.2" />
      </>
    );
  } else if (L === 'minimal') {
    items = [{ k: 'g', h: H * 0.42, render: (y, h) => <Monogram cx={cx} cy={y + h / 2} r={Math.min(h * 0.46, box.w * 0.44)} text={name || 'Mivy'} ink={ink('main')} fam={f.family} weight={f.weight} /> },
      gap(4), T(name, { fam: SCRIPT, weight: 400, max: 11, min: 5, maxLines: 2, lh: 1.05 })];
    if (d.brand) items.push(gap(2), T(d.brand, { fam: BODY, weight: 800, max: 3, maxLines: 1, upper: true, ls: 0.2, role: 'sub' }));
  } else if (L === 'tet') {
    items = [{ k: 'g', h: H * 0.16, render: (y, h) => <MaiPair cx={cx} y={y} h={h} maxW={box.w} ink={ink('accent')} /> },
      gap(2), T('Xuân Đinh Mùi', { fam: BODY, weight: 800, max: 4, maxLines: 1, upper: true, ls: 0.24, role: 'sub' }),
      T('2027', { ...disp, max: 22, maxLines: 1, lh: 1.05, role: 'accent' }), gap(1.5),
      T(d.wish || '', { fam: SCRIPT, weight: 400, max: 9, min: 4.5, maxLines: 2, lh: 1.05 }), gap(3), rule(0.5), gap(3), logoItem(0.12),
      gap(1.5), T(d.brand || '', { fam: BODY, weight: 800, max: 3.6, maxLines: 2, upper: true, ls: 0.16, role: 'sub' })];
  } else if (L === 'team') {
    items = [logoItem(0.26), gap(4), T(d.team || '', { ...disp, max: 11, maxLines: 2, upper: true, lh: 1.08 }), gap(2), rule(0.5), gap(2),
      T(d.brand || '', { fam: BODY, weight: 800, max: 3.8, maxLines: 2, upper: true, ls: 0.16, role: 'accent' })];
  } else { // cafe
    items = [{ k: 'g', h: H * 0.2, render: (y, h) => <CoffeeCup cx={cx} cy={y + h * 0.48} s={h / 28} ink={ink('accent')} /> }, gap(3),
      T(d.brand || '', { ...disp, max: 8.5, maxLines: 3, upper: true, ls: 0.03 }), gap(2), rule(0.42), gap(2),
      T(d.tagline || '', { fam: HAND, weight: 700, max: 6, maxLines: 2, role: 'sub' })];
  }
  return <Stack box={box} items={items} ink={ink} />;
}

let uidN = 0;
/** 1 mặt trang trí đúng khổ vùng khắc (mm) */
export function TumblerSideSvg({ spec, data, side, person, logo, render, style, guides = false }: {
  spec: TBSpec; data: TBData; side: TBSide; person: TBPerson; logo: TBLogo | null; render: TBRender; style?: CSSProperties; guides?: boolean;
}) {
  const [uid] = useState(() => `tb${++uidN}`);
  const pr = tbProduct(spec.product), fin = tbFinish(spec.finish), pal = tbPalette(spec.palette);
  const W = pr.area.w, H = pr.area.h;
  const uv = spec.method === 'uv';
  const ink = (r: Role): string => {
    if (render === 'mask') return '#FFFFFF';
    if (!uv) return render === 'print' ? '#000000' : engraveHex(fin);
    return r === 'accent' ? pal.accent : r === 'sub' ? pal.sub : pal.main;
  };
  const bgFill = render === 'mask' ? '#000000' : render === 'preview' ? finishBase(fin) : render === 'print' && !uv ? '#FFFFFF' : null;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-tb-w={W} data-tb-h={H} data-side={side}>
      {bgFill && <rect width={W} height={H} fill={bgFill} />}
      {render === 'preview' && !fin.hex && (
        <g opacity={0.35} data-guide="1">{Array.from({ length: Math.ceil(H / 0.8) }, (_, i) => <line key={i} x1={0} x2={W} y1={i * 0.8} y2={i * 0.8} stroke={i % 3 ? '#E8EAED' : '#9AA0A7'} strokeWidth={0.18} />)}</g>
      )}
      {sideArt(spec, side, data, person, W, H, ink, logo, uv, `${uid}${render[0]}`)}
      {guides && <rect data-guide="1" x={0.3} y={0.3} width={W - 0.6} height={H - 0.6} fill="none" stroke="#94A3B8" strokeWidth={0.35} strokeDasharray="2 1.4" />}
    </svg>
  );
}

/** tờ file in 1 bình: MẶT TRƯỚC | MẶT SAU (tên riêng), đúng khổ thật + nhãn xám (không khắc) */
export const SHEET_GAP = 12, SHEET_LABEL = 7;
export function tbSheetDims(spec: TBSpec) {
  const a = tbProduct(spec.product).area;
  return { w: a.w * 2 + SHEET_GAP, h: a.h + SHEET_LABEL };
}
export function TumblerSheetSvg({ spec, data, person, idx, logo, style }: {
  spec: TBSpec; data: TBData; person: TBPerson; idx: number; logo: TBLogo | null; style?: CSSProperties;
}) {
  const a = tbProduct(spec.product).area;
  const { w, h } = tbSheetDims(spec);
  const laser = spec.method === 'laser';
  const lbl = { fontFamily: `"${BODY}"`, fontWeight: 600, fontSize: 2.6, fill: '#8C9198' } as const;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet={idx}>
      {laser && <rect width={w} height={h} fill="#FFFFFF" />}
      <svg x={0} y={0} width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`}>
        <TumblerSideSvg spec={spec} data={data} side="front" person={person} logo={logo} render="print" />
      </svg>
      <svg x={a.w + SHEET_GAP} y={0} width={a.w} height={a.h} viewBox={`0 0 ${a.w} ${a.h}`}>
        <TumblerSideSvg spec={spec} data={data} side="back" person={person} logo={logo} render="print" />
      </svg>
      <g data-label="1">
        <rect x={0} y={0} width={a.w} height={a.h} fill="none" stroke="#C3C8CE" strokeWidth={0.2} strokeDasharray="1.5 1" />
        <rect x={a.w + SHEET_GAP} y={0} width={a.w} height={a.h} fill="none" stroke="#C3C8CE" strokeWidth={0.2} strokeDasharray="1.5 1" />
        <text x={a.w / 2} y={a.h + 4.6} textAnchor="middle" {...lbl}>MẶT TRƯỚC</text>
        <text x={a.w * 1.5 + SHEET_GAP} y={a.h + 4.6} textAnchor="middle" {...lbl}>{`MẶT SAU · #${idx + 1}${person.name ? ` ${person.name}` : ''}`.slice(0, 40)}</text>
      </g>
    </svg>
  );
}
