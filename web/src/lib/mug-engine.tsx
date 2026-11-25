'use client';
// Ly sứ in hình (in chuyển nhiệt): thiết kế = 1 dải in quấn quanh thân ly (11oz 200×85mm, 15oz 220×100mm).
// Mẫu = BỐ CỤC × BẢNG MÀU × FONT × KIỂU IN (2 bên quai / tràn quanh / 1 bên cho người cầm tay phải hoặc trái).
// Vị trí trên dải (x = 0 và x = W sát 2 bên quai): ô A ở 3W/4 = mặt thấy khi quai bên PHẢI người nhìn,
// ô B ở W/4 = mặt thấy khi quai bên TRÁI người nhìn (= mặt khoe ra ngoài khi người cầm bằng tay phải).
// Render code 100%, đơn vị SVG = mm. Ảnh khách chỉ nằm trên máy (dataURL), không AI.

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

export interface MugSize { id: string; name: string; dia: number; height: number; wMm: number; hMm: number }
export const MUG_SIZES: MugSize[] = [
  { id: '11oz', name: '11oz · 330ml', dia: 82, height: 96, wMm: 200, hMm: 85 },
  { id: '15oz', name: '15oz · 450ml', dia: 86, height: 117, wMm: 220, hMm: 100 },
];
export const mugSize = (id: string) => MUG_SIZES.find((s) => s.id === id) || MUG_SIZES[0];

export type MugMode = 'two' | 'full' | 'rh' | 'lh';
export const MUG_MODES: { id: MugMode; name: string; hint: string }[] = [
  { id: 'two', name: '2 bên quai', hint: 'Cầm tay nào cũng khoe được hình' },
  { id: 'full', name: 'Tràn quanh ly', hint: 'Nền màu phủ kín thân ly' },
  { id: 'rh', name: '1 bên · cầm tay phải', hint: 'Hình quay ra ngoài khi cầm tay phải' },
  { id: 'lh', name: '1 bên · cầm tay trái', hint: 'Hình quay ra ngoài khi cầm tay trái' },
];

export type MugKind = 'white' | 'color' | 'magic';
export const MUG_KINDS: { id: MugKind; name: string; material: string }[] = [
  { id: 'white', name: 'Ly trắng', material: 'Ly sứ trắng 11oz in chuyển nhiệt' },
  { id: 'color', name: 'Quai + lòng màu', material: 'Ly sứ quai màu / lòng màu' },
  { id: 'magic', name: 'Ly đổi màu', material: 'Ly sứ đổi màu (gặp nóng hiện hình)' },
];
export const MUG_COLORS = [
  { id: 'red', name: 'Đỏ', hex: '#D0343F' }, { id: 'pink', name: 'Hồng', hex: '#F28DB2' },
  { id: 'navy', name: 'Xanh navy', hex: '#24407A' }, { id: 'sky', name: 'Xanh trời', hex: '#5AA9E6' },
  { id: 'yellow', name: 'Vàng', hex: '#F5C542' }, { id: 'green', name: 'Xanh lá', hex: '#3E9B6A' },
  { id: 'black', name: 'Đen', hex: '#1F1F22' }, { id: 'orange', name: 'Cam', hex: '#F08A3C' },
];
export const mugColor = (id: string) => MUG_COLORS.find((c) => c.id === id) || MUG_COLORS[0];

export interface MugFont { id: string; name: string; family: string; weight: number }
export const MUG_FONTS: MugFont[] = [
  { id: 'baloo', name: 'Baloo (tròn, dễ thương)', family: 'Baloo 2', weight: 800 },
  { id: 'playfair', name: 'Playfair (sang)', family: 'Playfair Display', weight: 800 },
  { id: 'montserrat', name: 'Montserrat (hiện đại)', family: 'Montserrat', weight: 800 },
  { id: 'lobster', name: 'Lobster (vui)', family: 'Lobster', weight: 400 },
  { id: 'oswald', name: 'Oswald (gọn, mạnh)', family: 'Oswald', weight: 700 },
];
export const mugFont = (id: string) => MUG_FONTS.find((f) => f.id === id) || MUG_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SCRIPT = 'Great Vibes';
const HAND = 'Dancing Script';

export const MUG_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Baloo+2:wght@800&family=Playfair+Display:wght@800&family=Montserrat:wght@800&family=Lobster&family=Oswald:wght@700&family=Great+Vibes&family=Dancing+Script:wght@700&display=swap');`;

export function useMugFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-mug-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-mug-fonts'; link.rel = 'stylesheet';
        link.href = MUG_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...MUG_FONTS.map((f) => `${f.weight} 40px "${f.family}"`), `600 40px "${BODY}"`, `800 40px "${BODY}"`, `400 40px "${SCRIPT}"`, `700 40px "${HAND}"`];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 ♥')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

export interface MugPalette { id: string; name: string; bg: string; ink: string; accent: string; accent2: string; soft: string; onAccent: string }
export const MUG_PALETTES: MugPalette[] = [
  { id: 'rose', name: 'Hồng phấn', bg: '#FCE4EC', ink: '#5B1F35', accent: '#E0457B', accent2: '#F7B32B', soft: '#F8C9D9', onAccent: '#FFFFFF' },
  { id: 'navy', name: 'Navy vàng', bg: '#1E2F55', ink: '#1E2F55', accent: '#2F4F8F', accent2: '#E7B547', soft: '#DCE5F5', onAccent: '#FFFFFF' },
  { id: 'mint', name: 'Bạc hà', bg: '#DDF3EA', ink: '#123D32', accent: '#2A9D7A', accent2: '#F4A259', soft: '#BFE8D8', onAccent: '#FFFFFF' },
  { id: 'red', name: 'Đỏ son', bg: '#B3202E', ink: '#7A1520', accent: '#D0343F', accent2: '#E9B44C', soft: '#F9D7D3', onAccent: '#FFF6E8' },
  { id: 'cream', name: 'Kem cà phê', bg: '#F3E6D3', ink: '#3E2A1E', accent: '#8A5A3B', accent2: '#D99A4E', soft: '#EBD8BE', onAccent: '#FFF8EE' },
  { id: 'black', name: 'Đen tối giản', bg: '#1C1C1E', ink: '#1C1C1E', accent: '#1C1C1E', accent2: '#E8B44A', soft: '#E7E7E7', onAccent: '#FFFFFF' },
  { id: 'sky', name: 'Trời xanh', bg: '#DDEFFC', ink: '#123A5C', accent: '#2E86DE', accent2: '#FF9F43', soft: '#C6E2F8', onAccent: '#FFFFFF' },
  { id: 'lilac', name: 'Tím lavender', bg: '#EDE4FA', ink: '#3B2464', accent: '#7E57C2', accent2: '#F06292', soft: '#DCCEF4', onAccent: '#FFFFFF' },
  { id: 'gold', name: 'Vàng kim', bg: '#FFF4D6', ink: '#3A2A08', accent: '#C9961A', accent2: '#D0343F', soft: '#F8E4A8', onAccent: '#FFFFFF' },
];
export const mugPalette = (id: string) => MUG_PALETTES.find((p) => p.id === id) || MUG_PALETTES[0];

export interface MugLayout { id: string; name: string; photos: number; logo?: boolean }
export const MUG_LAYOUTS: MugLayout[] = [
  { id: 'birthday', name: 'Sinh nhật', photos: 0 },
  { id: 'photo', name: 'Ảnh + lời chúc', photos: 1 },
  { id: 'collage', name: 'Ghép 3 ảnh', photos: 3 },
  { id: 'mother', name: 'Tặng mẹ', photos: 0 },
  { id: 'teacher', name: 'Tri ân thầy cô', photos: 0 },
  { id: 'love', name: 'Cặp đôi · Valentine', photos: 0 },
  { id: 'quote', name: 'Câu chữ', photos: 0 },
  { id: 'best', name: 'Nhất quả đất', photos: 0 },
  { id: 'corporate', name: 'Logo công ty', photos: 0, logo: true },
  { id: 'tet', name: 'Quà Tết', photos: 0, logo: true },
  { id: 'name', name: 'Tên lặp hoạ tiết', photos: 0 },
];
export const mugLayout = (id: string) => MUG_LAYOUTS.find((l) => l.id === id) || MUG_LAYOUTS[0];

export interface MugSpec { layout: string; palette: string; font: string; size: string; mode: MugMode; kind: MugKind; color: string }
export interface MugTemplate { id: string; name: string; spec: Pick<MugSpec, 'layout' | 'palette' | 'font' | 'mode'> }
export const MUG_TEMPLATES: MugTemplate[] = [
  { id: 'bd-rose', name: 'Sinh nhật hồng', spec: { layout: 'birthday', palette: 'rose', font: 'baloo', mode: 'two' } },
  { id: 'bd-sky', name: 'Sinh nhật tràn màu', spec: { layout: 'birthday', palette: 'sky', font: 'baloo', mode: 'full' } },
  { id: 'photo-cream', name: 'Ảnh kỷ niệm', spec: { layout: 'photo', palette: 'cream', font: 'playfair', mode: 'two' } },
  { id: 'photo-mint', name: 'Ảnh tràn nền', spec: { layout: 'photo', palette: 'mint', font: 'baloo', mode: 'full' } },
  { id: 'collage-lilac', name: 'Ghép 3 ảnh', spec: { layout: 'collage', palette: 'lilac', font: 'lobster', mode: 'full' } },
  { id: 'mother-rose', name: 'Mẹ tuyệt nhất', spec: { layout: 'mother', palette: 'rose', font: 'playfair', mode: 'two' } },
  { id: 'teacher-mint', name: 'Tri ân 20/11', spec: { layout: 'teacher', palette: 'mint', font: 'playfair', mode: 'two' } },
  { id: 'love-red', name: 'Valentine đỏ', spec: { layout: 'love', palette: 'red', font: 'lobster', mode: 'two' } },
  { id: 'quote-black', name: 'Câu chữ tối giản', spec: { layout: 'quote', palette: 'black', font: 'oswald', mode: 'rh' } },
  { id: 'quote-cream', name: 'Cà phê trước đã', spec: { layout: 'quote', palette: 'cream', font: 'playfair', mode: 'two' } },
  { id: 'best-gold', name: 'Sếp tốt nhất quả đất', spec: { layout: 'best', palette: 'gold', font: 'montserrat', mode: 'two' } },
  { id: 'corp-navy', name: 'Quà doanh nghiệp', spec: { layout: 'corporate', palette: 'navy', font: 'montserrat', mode: 'two' } },
  { id: 'tet-red', name: 'Quà Tết 2027', spec: { layout: 'tet', palette: 'red', font: 'playfair', mode: 'full' } },
  { id: 'name-sky', name: 'Tên hoạ tiết', spec: { layout: 'name', palette: 'sky', font: 'baloo', mode: 'full' } },
];

export type MugData = Record<string, string>;
export interface MugField { key: string; label: string; ph?: string; multiline?: boolean }
// trường hiện theo bố cục (đỡ rối)
export const MUG_FIELDS: Record<string, MugField[]> = {
  birthday: [{ key: 'title', label: 'Dòng chính' }, { key: 'name', label: 'Tên người nhận' }, { key: 'wish', label: 'Lời chúc', multiline: true }, { key: 'name2', label: 'Người tặng (ký tên)' }],
  photo: [{ key: 'name', label: 'Tên / tiêu đề dưới ảnh' }, { key: 'title', label: 'Dòng chính mặt sau' }, { key: 'wish', label: 'Lời chúc', multiline: true }, { key: 'date', label: 'Ngày kỷ niệm' }],
  collage: [{ key: 'title', label: 'Dòng chính' }, { key: 'name', label: 'Tên' }, { key: 'date', label: 'Ngày / dòng nhỏ' }],
  mother: [{ key: 'title', label: 'Dòng chính' }, { key: 'wish', label: 'Lời chúc', multiline: true }, { key: 'name2', label: 'Người tặng (ký tên)' }],
  teacher: [{ key: 'title', label: 'Dòng chính' }, { key: 'name', label: 'Tên thầy/cô' }, { key: 'wish', label: 'Lời chúc', multiline: true }, { key: 'date', label: 'Ngày / lớp' }],
  love: [{ key: 'name', label: 'Tên người 1' }, { key: 'name2', label: 'Tên người 2' }, { key: 'title', label: 'Câu nói' }, { key: 'date', label: 'Ngày kỷ niệm' }],
  quote: [{ key: 'title', label: 'Câu chữ (to)', multiline: true }, { key: 'name', label: 'Dòng nhỏ / tên chủ ly' }],
  best: [{ key: 'title', label: 'Danh hiệu', ph: 'SẾP TỐT NHẤT QUẢ ĐẤT' }, { key: 'name', label: 'Tên người nhận' }, { key: 'wish', label: 'Dòng chứng nhận' }],
  corporate: [{ key: 'brand', label: 'Tên công ty / thương hiệu' }, { key: 'title', label: 'Slogan' }, { key: 'extra', label: 'Website / hotline' }],
  tet: [{ key: 'title', label: 'Câu chúc lớn' }, { key: 'date', label: 'Dòng năm' }, { key: 'brand', label: 'Thương hiệu / người tặng' }, { key: 'wish', label: 'Lời chúc mặt sau', multiline: true }],
  name: [{ key: 'name', label: 'Tên (lặp hoạ tiết)' }, { key: 'title', label: 'Dòng nhỏ dưới tên' }],
};

export const MUG_SAMPLES: Record<string, MugData> = {
  birthday: { title: 'Chúc mừng sinh nhật', name: 'Thu Hà', wish: 'Tuổi mới luôn rạng rỡ, bình an và thật nhiều niềm vui nhé!', name2: 'Quốc Bảo' },
  photo: { name: 'Gia đình nhỏ của mình', title: 'Mãi bên nhau', wish: 'Cảm ơn vì đã luôn ở đây, cùng nhau đi qua mọi ngày bình thường.', date: '12.06.2026' },
  collage: { title: 'Kỷ niệm đáng nhớ', name: 'Hội bạn thân', date: 'Đà Lạt · Hè 2026' },
  mother: { title: 'Mẹ là tuyệt nhất', wish: 'Con cảm ơn mẹ vì tất cả. Chúc mẹ luôn khoẻ, luôn cười thật tươi.', name2: 'Con gái Thu Hà' },
  teacher: { title: 'Tri ân thầy cô', name: 'Cô Gia Khánh', wish: 'Cảm ơn cô đã dìu dắt chúng em bằng cả trái tim.', date: '20.11.2026 · Lớp 12A1' },
  love: { name: 'Thu Hà', name2: 'Quốc Bảo', title: 'Mãi là của nhau', date: '14.02.2026' },
  quote: { title: 'Cà phê trước, chuyện khác tính sau', name: 'Ly của Quốc Bảo' },
  best: { title: 'Sếp tốt nhất quả đất', name: 'Anh Quốc Bảo', wish: 'Chứng nhận bởi cả team Marketing' },
  corporate: { brand: 'AN KHANG GROUP', title: 'Đồng hành cùng thành công', extra: 'ankhang.vn · 1900 6868' },
  tet: { title: 'An Khang Thịnh Vượng', date: 'Xuân Đinh Mùi 2027', brand: 'AN KHANG GROUP', wish: 'Kính chúc Quý khách năm mới an khang, vạn sự như ý.' },
  name: { name: 'Gia Khánh', title: 'Ly này của mình nha' },
};
export const defaultMugData = (layout = 'birthday'): MugData => ({ ...(MUG_SAMPLES[layout] || MUG_SAMPLES.birthday) });
// đổi bố cục khi khách đã sửa: giữ ô khách tự viết, ô còn chữ mẫu cũ → chữ mẫu mới
export function switchMugData(d: MugData, from: string, to: string): MugData {
  const oldS = MUG_SAMPLES[from] || {}, next: MugData = { ...defaultMugData(to) };
  for (const [k, v] of Object.entries(d)) if (v && v.trim() && v !== oldS[k]) next[k] = v;
  return next;
}

// ---------- đo chữ thật (canvas) ----------
let mctx: CanvasRenderingContext2D | null = null;
const ctx = () => (mctx ||= typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null);
function tw(text: string, fam: string, weight: number, size: number, ls = 0): number {
  const c = ctx();
  if (!c) return text.length * size * 0.55;
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
// cân dòng: tránh 1 chữ mồ côi ở dòng cuối
function balance(lines: string[], fam: string, weight: number, size: number, maxW: number, ls: number): string[] {
  if (lines.length < 2) return lines;
  const all = lines.join(' ');
  let best = lines, bestW = Math.max(...lines.map((l) => tw(l, fam, weight, size, ls)));
  for (let k = 0.6; k < 1; k += 0.05) {
    const t = wrapLines(all, fam, weight, size, maxW * k, ls);
    if (t.length !== lines.length) continue;
    const w = Math.max(...t.map((l) => tw(l, fam, weight, size, ls)));
    if (w <= maxW && w < bestW + 0.01) { best = t; bestW = w; }
  }
  return best;
}

interface TextOpts { fam: string; weight: number; max: number; min?: number; maxLines?: number; fill: string; ls?: number; lh?: number; upper?: boolean; widthK?: number; italic?: boolean; deco?: boolean }
interface Fitted { lines: string[]; size: number; o: TextOpts }
function fitText(text: string, maxW: number, o: TextOpts, scale = 1): Fitted | null {
  const t = (o.upper ? (text || '').toUpperCase() : text || '').trim();
  if (!t) return null;
  const max = o.max * scale, min = (o.min ?? o.max * 0.45) * scale, ml = o.maxLines ?? 2;
  let size = max;
  for (let i = 0; i < 40; i++) {
    const ls = (o.ls ?? 0) * size;
    const lines = wrapLines(t, o.fam, o.weight, size, maxW, ls);
    if (lines.length <= ml && lines.every((l) => tw(l, o.fam, o.weight, size, ls) <= maxW)) {
      return { lines: balance(lines, o.fam, o.weight, size, maxW, ls), size, o };
    }
    if (size <= min) {
      // tới cỡ nhỏ nhất: ép từng dòng vừa ngang
      const s2 = Math.min(size, ...lines.slice(0, ml).map((l) => (size * maxW) / Math.max(1, tw(l, o.fam, o.weight, size, ls))));
      return { lines: lines.slice(0, ml), size: s2, o };
    }
    size = Math.max(min, size * 0.94);
  }
  return null;
}

// ---------- ngăn xếp dọc trong 1 ô (tự co để vừa chiều cao) ----------
type Item =
  | { k: 't'; text: string; o: TextOpts }
  | { k: 'g'; h: number; render: (y: number, h: number) => ReactNode }
  | { k: 'gap'; h: number };
interface Box { x: number; y: number; w: number; h: number }

function Stack({ box, items, cx }: { box: Box; items: Item[]; cx?: number }) {
  const X = cx ?? box.x + box.w / 2;
  let scale = 1, placed: { it: Item; f?: Fitted; h: number }[] = [];
  for (let pass = 0; pass < 10; pass++) {
    placed = items.map((it) => {
      if (it.k === 't') {
        const f = fitText(it.text, box.w * (it.o.widthK ?? 1), it.o, scale);
        return { it, f: f || undefined, h: f ? f.lines.length * f.size * (it.o.lh ?? 1.18) : 0 };
      }
      return { it, h: it.h * scale };
    }).filter((p) => p.h > 0 || p.it.k === 'gap');
    const total = placed.reduce((a, p) => a + p.h, 0);
    if (total <= box.h || scale < 0.4) break;
    scale *= Math.max(0.8, Math.min(0.97, box.h / total));
  }
  const total = placed.reduce((a, p) => a + p.h, 0);
  let y = box.y + (box.h - total) / 2;
  const nodes: ReactNode[] = [];
  placed.forEach((p, i) => {
    if (p.it.k === 't' && p.f) {
      const { lines, size, o } = p.f;
      const lh = o.lh ?? 1.18;
      lines.forEach((ln, j) => {
        const base = y + j * size * lh + size * lh / 2 + size * 0.34;
        nodes.push(
          <text key={`${i}-${j}`} x={X} y={base} textAnchor="middle" fontFamily={`"${o.fam}"`} fontWeight={o.weight} fontSize={size}
            fill={o.fill} letterSpacing={(o.ls ?? 0) * size || undefined} fontStyle={o.italic ? 'italic' : undefined} data-deco={o.deco ? '1' : undefined}>{ln}</text>,
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
const heartPath = (cx: number, cy: number, s: number) => {
  // tim cao ~ s
  const w = s * 0.55;
  return `M${cx} ${cy + s * 0.42} C${cx - w * 1.9} ${cy - s * 0.12} ${cx - w * 0.9} ${cy - s * 0.78} ${cx} ${cy - s * 0.3} C${cx + w * 0.9} ${cy - s * 0.78} ${cx + w * 1.9} ${cy - s * 0.12} ${cx} ${cy + s * 0.42}Z`;
};
const starPath = (cx: number, cy: number, r: number, n = 5, k = 0.45) => {
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / n, rr = i % 2 ? r * k : r;
    d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`;
  }
  return d + 'Z';
};
const burstPath = (cx: number, cy: number, r: number, n = 18) => starPath(cx, cy, r, n, 0.86);
function rng(seed: number) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }

function Flower({ x, y, r, petal, center, rot = 0 }: { x: number; y: number; r: number; petal: string; center: string; rot?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={0} cy={-r * 0.55} rx={r * 0.38} ry={r * 0.55} fill={petal} transform={`rotate(${i * 72})`} />)}
      <circle r={r * 0.28} fill={center} />
    </g>
  );
}
function Leaf({ x, y, l, rot, fill }: { x: number; y: number; l: number; rot: number; fill: string }) {
  return <path d={`M0 0 Q${l * 0.5} ${-l * 0.32} ${l} 0 Q${l * 0.5} ${l * 0.32} 0 0Z`} fill={fill} transform={`translate(${x} ${y}) rotate(${rot})`} />;
}
// cành hoa nhỏ (góc ô)
function Sprig({ x, y, s, rot, p }: { x: number; y: number; s: number; rot: number; p: MugPalette }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <path d="M0 0 Q8 -10 22 -14" stroke="#5E8C61" strokeWidth={0.9} fill="none" />
      <Leaf x={6} y={-4} l={7} rot={-70} fill="#7FB283" />
      <Leaf x={12} y={-9} l={7} rot={10} fill="#6AA472" />
      <Leaf x={16} y={-11} l={6} rot={-80} fill="#7FB283" />
      <Flower x={22} y={-14} r={5} petal={p.accent} center={p.accent2} />
      <Flower x={9} y={-12} r={3.4} petal={p.soft} center={p.accent2} rot={20} />
    </g>
  );
}
function Confetti({ box, n, seed, colors }: { box: Box; n: number; seed: number; colors: string[] }) {
  const r = rng(seed);
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = box.x + r() * box.w, y = box.y + r() * box.h, c = colors[i % colors.length], t = r();
        if (t < 0.4) return <rect key={i} x={x} y={y} width={2.2} height={1} rx={0.3} fill={c} transform={`rotate(${r() * 180} ${x} ${y})`} />;
        if (t < 0.7) return <circle key={i} cx={x} cy={y} r={0.75} fill={c} />;
        return <path key={i} d={starPath(x, y, 1.3, 4, 0.4)} fill={c} />;
      })}
    </g>
  );
}
function MaiBranch({ x, y, s, flip, p }: { x: number; y: number; s: number; flip?: boolean; p: MugPalette }) {
  const pts = [[14, -4], [26, -9], [36, -6], [20, 3], [44, -14]];
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
      <path d="M0 0 Q14 -2 26 -9 T48 -16 M20 -6 Q24 0 22 5" stroke="#5B3A21" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      {pts.map(([px, py], i) => <Flower key={i} x={px} y={py} r={i % 2 ? 3.2 : 4} petal="#F6C445" center={p.accent} rot={i * 17} />)}
      <circle cx={31} cy={-12} r={1.2} fill="#F6C445" /><circle cx={9} cy={-3} r={1} fill="#F6C445" />
    </g>
  );
}
function Coffee({ x, y, s, p }: { x: number; y: number; s: number; p: MugPalette }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={p.accent} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M-8 -3 H8 V5 Q8 10 3 10 H-3 Q-8 10 -8 5 Z" fill={p.soft} />
      <path d="M8 -1 Q13 -1 13 3 Q13 7 8 6" />
      <path d="M-3 -6 Q-5 -9 -3 -12 M2 -6 Q0 -9 2 -12" stroke={p.accent2} />
    </g>
  );
}
function Book({ x, y, s, p }: { x: number; y: number; s: number; p: MugPalette }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} strokeLinejoin="round">
      <path d="M0 -6 Q-7 -9 -14 -7 V6 Q-7 4 0 7 Q7 4 14 6 V-7 Q7 -9 0 -6 Z" fill={p.soft} stroke={p.accent} strokeWidth={1.1} />
      <path d="M0 -6 V7" stroke={p.accent} strokeWidth={1.1} />
      <path d="M-11 -3 Q-6 -4.5 -3 -3 M-11 0 Q-6 -1.5 -3 0 M3 -3 Q6 -4.5 11 -3 M3 0 Q6 -1.5 11 0" stroke={p.accent} strokeWidth={0.6} fill="none" />
    </g>
  );
}

// khung ảnh (ảnh khách hoặc hình minh hoạ thay thế khi chưa có ảnh)
function PhotoSlot({ id, x, y, w, h, r, src, p, stroke }: { id: string; x: number; y: number; w: number; h: number; r: number; src?: string; p: MugPalette; stroke?: string }) {
  return (
    <g>
      <defs><clipPath id={id}><rect x={x} y={y} width={w} height={h} rx={r} /></clipPath></defs>
      <g clipPath={`url(#${id})`}>
        {src
          ? <image href={src} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
          : (
            <g>
              <rect x={x} y={y} width={w} height={h} fill={p.soft} />
              <circle cx={x + w * 0.72} cy={y + h * 0.3} r={Math.min(w, h) * 0.12} fill={p.accent2} opacity={0.85} />
              <path d={`M${x} ${y + h} L${x + w * 0.32} ${y + h * 0.52} L${x + w * 0.55} ${y + h * 0.78} L${x + w * 0.72} ${y + h * 0.6} L${x + w} ${y + h} Z`} fill={p.accent} opacity={0.55} />
              <path d={heartPath(x + w * 0.32, y + h * 0.36, Math.min(w, h) * 0.2)} fill={p.onAccent === '#FFFFFF' ? '#FFFFFF' : p.onAccent} opacity={0.9} />
            </g>
          )}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill="none" stroke={stroke || '#FFFFFF'} strokeWidth={1.4} />
    </g>
  );
}

export interface MugArt { photos: string[]; logo?: string }

// ---------- 1 ô thiết kế (mặt A hoặc B) theo bố cục ----------
function panel(layout: string, side: 'A' | 'B', box: Box, p: MugPalette, f: MugFont, d: MugData, art: MugArt, onBg: boolean, uid: string): ReactNode {
  const disp = f.family, dw = f.weight;
  // trên nền màu đậm (chế độ tràn) chữ dùng màu nền sáng
  const darkBg = onBg && ['navy', 'red', 'black'].includes(p.id);
  const ink = darkBg ? '#FFFFFF' : p.ink;
  const acc = darkBg ? p.accent2 : p.accent;
  const sub = darkBg ? 'rgba(255,255,255,0.85)' : p.ink;
  const inner: Box = { x: box.x + box.w * 0.06, y: box.y + box.h * 0.06, w: box.w * 0.88, h: box.h * 0.88 };
  const T = (text: string, o: Omit<TextOpts, 'fill'> & { fill?: string }): Item => ({ k: 't', text, o: { fill: ink, ...o } as TextOpts });
  const gap = (h: number): Item => ({ k: 'gap', h });
  const wish = (max = 6.2, lines = 4): Item => T(d.wish || '', { fam: BODY, weight: 600, max, min: 3.4, maxLines: lines, fill: sub, lh: 1.32, widthK: 0.92 });
  const sign = (pre = '— '): Item => T(d.name2 ? pre + d.name2 : '', { fam: HAND, weight: 700, max: 8, min: 4.5, maxLines: 1, fill: acc });

  switch (layout) {
    case 'birthday':
      if (side === 'A') return (
        <>
          <Confetti box={box} n={34} seed={7} colors={[p.accent, p.accent2, p.soft]} />
          <Stack box={inner} items={[
            T('Happy Birthday', { fam: BODY, weight: 800, max: 4.4, maxLines: 1, fill: acc, ls: 0.18, upper: true }),
            gap(2),
            T(d.title || '', { fam: disp, weight: dw, max: 15, min: 7, maxLines: 2, lh: 1.05 }),
            gap(1.5),
            T(d.name || '', { fam: SCRIPT, weight: 400, max: 20, min: 9, maxLines: 1, fill: acc, lh: 1.1 }),
          ]} />
        </>
      );
      return (
        <>
          <path d={heartPath(box.x + box.w * 0.15, box.y + box.h * 0.16, 7)} fill={p.accent} opacity={0.85} />
          <path d={starPath(box.x + box.w * 0.86, box.y + box.h * 0.2, 4)} fill={p.accent2} />
          <path d={heartPath(box.x + box.w * 0.84, box.y + box.h * 0.84, 5)} fill={p.accent2} opacity={0.9} />
          <Stack box={{ ...inner, x: inner.x + 4, w: inner.w - 8 }} items={[wish(6.6, 4), gap(3), sign()]} />
        </>
      );
    case 'photo': {
      if (side === 'A') {
        const pw = box.w * 0.72, ph = box.h * 0.66;
        return (
          <Stack box={inner} items={[
            { k: 'g', h: ph, render: (y, h) => <PhotoSlot id={`${uid}-ph0`} x={box.x + (box.w - pw * (h / ph)) / 2} y={y} w={pw * (h / ph)} h={h} r={4} src={art.photos[0]} p={p} stroke={darkBg ? p.accent2 : p.accent} /> },
            gap(3),
            T(d.name || '', { fam: disp, weight: dw, max: 9, min: 4.6, maxLines: 1 }),
          ]} />
        );
      }
      return (
        <>
          <Sprig x={box.x + box.w * 0.08} y={box.y + box.h * 0.95} s={0.9} rot={-8} p={p} />
          <Stack box={inner} items={[
            T(d.title || '', { fam: SCRIPT, weight: 400, max: 17, min: 8, maxLines: 1, fill: acc }),
            gap(2), wish(6, 4), gap(2.5),
            T(d.date || '', { fam: BODY, weight: 800, max: 4.4, maxLines: 1, fill: acc, ls: 0.16 }),
          ]} />
        </>
      );
    }
    case 'collage': {
      if (side === 'A') {
        const ph = inner.h * 0.78;
        return (
          <Stack box={inner} items={[
            { k: 'g', h: ph, render: (y, h) => <PhotoSlot id={`${uid}-ph0`} x={inner.x + inner.w * 0.08} y={y} w={inner.w * 0.84} h={h} r={3} src={art.photos[0]} p={p} /> },
            gap(2.5),
            T(d.title || '', { fam: disp, weight: dw, max: 9, min: 5, maxLines: 1 }),
          ]} />
        );
      }
      const hh = inner.h * 0.56;
      return (
        <Stack box={inner} items={[
          { k: 'g', h: hh, render: (y, h) => (
            <>
              <PhotoSlot id={`${uid}-ph1`} x={inner.x + inner.w * 0.03} y={y} w={inner.w * 0.45} h={h} r={3} src={art.photos[1]} p={p} />
              <PhotoSlot id={`${uid}-ph2`} x={inner.x + inner.w * 0.52} y={y} w={inner.w * 0.45} h={h} r={3} src={art.photos[2]} p={p} />
            </>
          ) },
          gap(3),
          T(d.name || '', { fam: disp, weight: dw, max: 9, min: 4.6, maxLines: 1 }),
          gap(1),
          T(d.date || '', { fam: BODY, weight: 800, max: 4.4, maxLines: 1, fill: acc, ls: 0.14 }),
        ]} />
      );
    }
    case 'mother':
      if (side === 'A') return (
        <>
          <Sprig x={box.x + box.w * 0.04} y={box.y + box.h * 0.96} s={1.15} rot={-12} p={p} />
          <g transform={`translate(${box.x + box.w * 0.96} ${box.y + box.h * 0.06}) scale(-1 1)`}><Sprig x={0} y={0} s={0.9} rot={-110} p={p} /></g>
          <Stack box={inner} items={[
            T('Gửi mẹ yêu', { fam: SCRIPT, weight: 400, max: 11, maxLines: 1, fill: acc }),
            gap(1.5),
            T(d.title || '', { fam: disp, weight: dw, max: 14, min: 7, maxLines: 2, lh: 1.05 }),
            gap(2),
            { k: 'g', h: 7, render: (y, h) => <path d={heartPath(box.x + box.w / 2, y + h / 2, h)} fill={p.accent} /> },
          ]} />
        </>
      );
      return (
        <>
          <Flower x={box.x + box.w * 0.12} y={box.y + box.h * 0.14} r={5} petal={p.soft} center={p.accent2} />
          <Flower x={box.x + box.w * 0.9} y={box.y + box.h * 0.86} r={4} petal={p.accent} center={p.accent2} rot={30} />
          <Stack box={{ ...inner, x: inner.x + 4, w: inner.w - 8 }} items={[wish(6.4, 4), gap(3), sign()]} />
        </>
      );
    case 'teacher':
      if (side === 'A') return (
        <>
          <Sprig x={box.x + box.w * 0.03} y={box.y + box.h * 0.98} s={1} rot={-14} p={p} />
          <Stack box={inner} items={[
            { k: 'g', h: 13, render: (y, h) => <Book x={box.x + box.w / 2} y={y + h / 2} s={h / 16} p={p} /> },
            gap(2),
            T(d.title || '', { fam: disp, weight: dw, max: 12, min: 6, maxLines: 2, lh: 1.05 }),
            gap(1.5),
            T(d.name || '', { fam: SCRIPT, weight: 400, max: 14, min: 7, maxLines: 1, fill: acc }),
          ]} />
        </>
      );
      return (
        <>
          <g transform={`translate(${box.x + box.w} ${box.y}) scale(-1 1)`}><Sprig x={0} y={0} s={0.8} rot={-100} p={p} /></g>
          <Stack box={{ ...inner, x: inner.x + 4, w: inner.w - 8 }} items={[wish(6.4, 4), gap(3),
            T(d.date || '', { fam: BODY, weight: 800, max: 4.2, maxLines: 1, fill: acc, ls: 0.12 })]} />
        </>
      );
    case 'love': {
      const ini = (n?: string) => ([...((n || '').trim().split(/\s+/).pop() || '')][0] || '').toUpperCase();
      const i1 = ini(d.name), i2 = ini(d.name2);
      if (side === 'A') return (
        <Stack box={inner} items={[
          { k: 'g', h: inner.h * 0.62, render: (y, h) => {
            const cx = box.x + box.w / 2, cy = y + h * 0.52;
            const fs = h * 0.36;
            return (
              <g>
                <path d={heartPath(cx, cy, h)} fill={acc} />
                <text x={cx - h * 0.2} y={cy + fs * 0.16} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={fs} fill={p.onAccent}>{i1}</text>
                <text x={cx + h * 0.2} y={cy + fs * 0.16} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={fs} fill={p.onAccent}>{i2}</text>
                <text x={cx} y={cy + fs * 0.08} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs * 0.42} fill={p.onAccent}>&amp;</text>
              </g>
            );
          } },
          gap(3),
          T([d.name, d.name2].filter(Boolean).join(' & '), { fam: disp, weight: dw, max: 9, min: 4.6, maxLines: 1 }),
        ]} />
      );
      return (
        <>
          {[[0.12, 0.2, 5], [0.86, 0.14, 4], [0.9, 0.8, 6], [0.1, 0.84, 3.5]].map(([a, b, s], i) => <path key={i} d={heartPath(box.x + box.w * a, box.y + box.h * b, s)} fill={i % 2 ? p.accent2 : acc} opacity={0.85} />)}
          <Stack box={inner} items={[
            T(d.title || '', { fam: SCRIPT, weight: 400, max: 18, min: 8, maxLines: 2, fill: acc, lh: 1.05 }),
            gap(3),
            T(d.date || '', { fam: BODY, weight: 800, max: 5, maxLines: 1, ls: 0.2 }),
          ]} />
        </>
      );
    }
    case 'quote':
      if (side === 'A') return (
        <Stack box={inner} items={[
          { k: 'g', h: 9, render: (y, h) => <text x={box.x + box.w / 2} y={y + h * 1.25} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={h * 2} fill={acc} opacity={0.35} data-deco="1">“</text> },
          T(d.title || '', { fam: disp, weight: dw, max: 13, min: 5.5, maxLines: 4, lh: 1.08, upper: f.id === 'oswald' || f.id === 'montserrat' }),
          gap(3),
          { k: 'g', h: 1.2, render: (y) => <rect x={box.x + box.w / 2 - 9} y={y} width={18} height={1.2} rx={0.6} fill={p.accent2} /> },
          gap(2.5),
          T(d.name || '', { fam: BODY, weight: 800, max: 4.2, maxLines: 1, fill: acc, ls: 0.14, upper: true }),
        ]} />
      );
      return (
        <Stack box={inner} items={[
          { k: 'g', h: 22, render: (y, h) => <Coffee x={box.x + box.w / 2} y={y + h * 0.55} s={h / 24} p={{ ...p, accent: acc }} /> },
          gap(3),
          T(d.name || '', { fam: HAND, weight: 700, max: 9, min: 5, maxLines: 1, fill: acc }),
        ]} />
      );
    case 'best':
      if (side === 'A') return (
        <Stack box={inner} items={[
          { k: 'g', h: inner.h * 0.6, render: (y, h) => {
            const cx = box.x + box.w / 2, cy = y + h / 2, r = h / 2;
            const tf = fitText(d.title || '', r * 1.35, { fam: disp, weight: dw, max: r * 0.34, min: r * 0.16, maxLines: 3, fill: p.onAccent, upper: true, lh: 1.04 });
            const lh = 1.04;
            return (
              <g>
                <path d={burstPath(cx, cy, r)} fill={acc} />
                <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={p.onAccent} strokeWidth={0.6} strokeDasharray="1.4 1.2" />
                {tf && tf.lines.map((ln, j) => (
                  <text key={j} x={cx} y={cy - ((tf.lines.length - 1) * tf.size * lh) / 2 + j * tf.size * lh + tf.size * 0.34} textAnchor="middle"
                    fontFamily={`"${disp}"`} fontWeight={dw} fontSize={tf.size} fill={p.onAccent}>{ln}</text>
                ))}
                <path d={starPath(cx - r * 0.42, cy - r * 0.62, r * 0.09)} fill={p.accent2} />
                <path d={starPath(cx, cy - r * 0.68, r * 0.11)} fill={p.accent2} />
                <path d={starPath(cx + r * 0.42, cy - r * 0.62, r * 0.09)} fill={p.accent2} />
              </g>
            );
          } },
          gap(3),
          { k: 'g', h: 10, render: (y, h) => {
            const w = Math.min(inner.w, 66), x = box.x + box.w / 2 - w / 2;
            const nf = fitText(d.name || '', w - 12, { fam: BODY, weight: 800, max: h * 0.5, min: h * 0.3, maxLines: 1, fill: '#3A2A08' });
            return (
              <g>
                <path d={`M${x} ${y} H${x + w} L${x + w - 3.5} ${y + h / 2} L${x + w} ${y + h} H${x} L${x + 3.5} ${y + h / 2} Z`} fill={p.accent2} />
                {nf && <text x={x + w / 2} y={y + h / 2 + nf.size * 0.34} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={nf.size} fill="#3A2A08">{nf.lines[0]}</text>}
              </g>
            );
          } },
        ]} />
      );
      return (
        <>
          <Confetti box={box} n={22} seed={21} colors={[p.accent, p.accent2]} />
          <Stack box={inner} items={[
            T('Chứng nhận', { fam: SCRIPT, weight: 400, max: 13, maxLines: 1, fill: acc }),
            gap(2),
            T(d.wish || '', { fam: BODY, weight: 800, max: 5.6, min: 3.4, maxLines: 3, lh: 1.3, widthK: 0.86 }),
            gap(3),
            { k: 'g', h: 9, render: (y, h) => <><path d={starPath(box.x + box.w / 2 - 10, y + h / 2, h * 0.42)} fill={p.accent2} /><path d={starPath(box.x + box.w / 2, y + h / 2, h / 2)} fill={acc} /><path d={starPath(box.x + box.w / 2 + 10, y + h / 2, h * 0.42)} fill={p.accent2} /></> },
          ]} />
        </>
      );
    case 'corporate': {
      const logo = (h: number, y: number) => {
        const cx = box.x + box.w / 2;
        if (art.logo) return <image href={art.logo} x={cx - h} y={y} width={h * 2} height={h} preserveAspectRatio="xMidYMid meet" />;
        const ini = (d.brand || 'A').trim().split(/\s+/).slice(0, 2).map((w) => [...w][0] || '').join('').toUpperCase();
        return (
          <g>
            <circle cx={cx} cy={y + h / 2} r={h / 2} fill={acc} />
            <circle cx={cx} cy={y + h / 2} r={h / 2 - 1.4} fill="none" stroke={p.accent2} strokeWidth={0.8} />
            <text x={cx} y={y + h / 2 + h * 0.13} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={h * 0.38} fill={darkBg ? p.ink : p.onAccent}>{ini}</text>
          </g>
        );
      };
      const big = side === 'A';
      return (
        <Stack box={inner} items={[
          { k: 'g', h: big ? 26 : 18, render: (y, h) => logo(h, y) },
          gap(big ? 4 : 3),
          T(d.brand || '', { fam: disp, weight: dw, max: big ? 9 : 7, min: 4.2, maxLines: 2, ls: 0.06, lh: 1.08 }),
          gap(2),
          T(big ? d.title || '' : d.extra || '', { fam: BODY, weight: 600, max: big ? 4.8 : 4.2, min: 3.2, maxLines: 2, fill: acc, lh: 1.3 }),
        ]} />
      );
    }
    case 'tet':
      if (side === 'A') return (
        <>
          <MaiBranch x={box.x + box.w * 0.02} y={box.y + box.h * 0.2} s={0.9} p={p} />
          <g transform={`translate(${box.x + box.w * 0.98} ${box.y + box.h * 0.92})`}><MaiBranch x={0} y={0} s={0.7} flip p={p} /></g>
          <Stack box={inner} items={[
            gap(4),
            T(d.title || '', { fam: disp, weight: dw, max: 12.5, min: 6, maxLines: 2, lh: 1.08, fill: darkBg ? p.accent2 : p.accent }),
            gap(2.5),
            T(d.date || '', { fam: BODY, weight: 800, max: 4.6, maxLines: 1, ls: 0.16, upper: true }),
          ]} />
        </>
      );
      return (
        <Stack box={{ ...inner, x: inner.x + 4, w: inner.w - 8 }} items={[
          T(d.brand || '', { fam: disp, weight: dw, max: 8, min: 4.4, maxLines: 2, fill: darkBg ? p.accent2 : p.accent, ls: 0.05 }),
          gap(3), wish(5.8, 4),
          gap(3), { k: 'g', h: 8, render: (y, h) => <Flower x={box.x + box.w / 2} y={y + h / 2} r={h / 2} petal="#F6C445" center={p.accent} /> },
        ]} />
      );
    case 'name':
    default:
      if (side === 'A') return (
        <Stack box={inner} items={[
          { k: 'g', h: inner.h * 0.66, render: (y, h) => {
            const cx = box.x + box.w / 2, cy = y + h / 2;
            const nf = fitText(d.name || '', h * 0.86, { fam: disp, weight: dw, max: h * 0.26, min: h * 0.12, maxLines: 2, fill: p.onAccent, lh: 1.02 });
            return (
              <g>
                <circle cx={cx} cy={cy} r={h / 2} fill={acc} />
                <circle cx={cx} cy={cy} r={h / 2 - 1.6} fill="none" stroke={p.onAccent} strokeWidth={0.5} />
                {nf && nf.lines.map((ln, j) => (
                  <text key={j} x={cx} y={cy - ((nf.lines.length - 1) * nf.size * 1.02) / 2 + j * nf.size * 1.02 + nf.size * 0.34} textAnchor="middle"
                    fontFamily={`"${disp}"`} fontWeight={dw} fontSize={nf.size} fill={p.onAccent}>{ln}</text>
                ))}
              </g>
            );
          } },
          gap(3),
          T(d.title || '', { fam: HAND, weight: 700, max: 8.5, min: 4.4, maxLines: 1, fill: darkBg ? '#FFFFFF' : p.ink }),
        ]} />
      );
      return (
        <Stack box={inner} items={[
          T(d.name || '', { fam: SCRIPT, weight: 400, max: 20, min: 9, maxLines: 1, fill: acc }),
          gap(2),
          { k: 'g', h: 6, render: (y, h) => <path d={heartPath(box.x + box.w / 2, y + h / 2, h)} fill={p.accent2} /> },
        ]} />
      );
  }
}

// nền tràn quanh ly (chế độ 'full'): màu + hoạ tiết lặp
function fullBg(layout: string, W: number, H: number, p: MugPalette, d: MugData, f: MugFont): ReactNode {
  const r = rng(layout.length * 13 + 5);
  const dots: ReactNode[] = [];
  if (layout === 'name') {
    const nm = (d.name || '').trim() || ' ';
    const fs = H * 0.11, rowH = fs * 1.9;
    const SEP = ' · ';
    const unit = tw(nm + SEP, f.family, f.weight, fs) || 30;
    for (let row = 0, y = fs; y < H + fs; row++, y += rowH) {
      const off = (row % 2) * unit * 0.5;
      const reps = Math.ceil((W + unit) / unit) + 1;
      dots.push(<text key={`r${row}`} x={-off} y={y} fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={fs} fill={p.onAccent} opacity={0.22} data-deco="1">{Array(reps).fill(nm).join(SEP)}</text>);
    }
    return <g><rect width={W} height={H} fill={p.accent} />{dots}</g>;
  }
  const bg = ['navy', 'red', 'black'].includes(p.id) ? p.bg : p.bg;
  for (let i = 0; i < 70; i++) {
    const x = r() * W, y = r() * H, t = r();
    const c = [p.soft, p.accent2, '#FFFFFF'][i % 3];
    if (layout === 'tet') dots.push(<Flower key={i} x={x} y={y} r={1.6 + t * 1.4} petal="#F6C445" center={p.accent} rot={t * 90} />);
    else if (layout === 'love' || layout === 'mother') dots.push(<path key={i} d={heartPath(x, y, 2 + t * 2)} fill={c} opacity={0.5} />);
    else if (t < 0.5) dots.push(<circle key={i} cx={x} cy={y} r={0.6 + t * 1.4} fill={c} opacity={0.55} />);
    else dots.push(<path key={i} d={starPath(x, y, 1 + t * 1.2, 4, 0.42)} fill={c} opacity={0.6} />);
  }
  return <g><rect width={W} height={H} fill={bg} />{dots}</g>;
}

// vị trí ô A/B trên dải in
export function mugPanels(sz: MugSize) {
  const W = sz.wMm, H = sz.hMm;
  const pw = Math.min(W * 0.4, H * 1.0), ph = H * 0.92; // ~105° quanh ly: nhìn thẳng thấy trọn
  const mk = (cx: number): Box => ({ x: cx - pw / 2, y: (H - ph) / 2, w: pw, h: ph });
  return { A: mk(W * 0.75), B: mk(W * 0.25) };
}
// mặt "khoe" chính: A (quai bên phải người nhìn) hay B (quai bên trái)
export const heroSide = (mode: MugMode): 'A' | 'B' => (mode === 'rh' ? 'B' : 'A');

let uidN = 0;
export function MugSvg({ spec, data, art, mirror = false, guides = false, style }: {
  spec: MugSpec; data: MugData; art: MugArt; mirror?: boolean; guides?: boolean; style?: CSSProperties;
}) {
  const [uid] = useState(() => `mug${++uidN}`);
  const sz = mugSize(spec.size);
  const W = sz.wMm, H = sz.hMm;
  const p = mugPalette(spec.palette), f = mugFont(spec.font);
  const { A, B } = mugPanels(sz);
  const full = spec.mode === 'full';
  let body: ReactNode;
  if (spec.mode === 'rh' || spec.mode === 'lh') {
    // 1 bên: nội dung chính (A) đặt vào ô quay ra ngoài
    const box = spec.mode === 'rh' ? B : A;
    body = <>{panel(spec.layout, 'A', box, p, f, data, art, false, `${uid}a`)}</>;
  } else {
    body = (
      <>
        {full && fullBg(spec.layout, W, H, p, data, f)}
        {full && spec.layout !== 'name' && (
          <>
            <rect x={A.x} y={A.y} width={A.w} height={A.h} rx={6} fill="#FFFFFF" opacity={0.86} />
            <rect x={B.x} y={B.y} width={B.w} height={B.h} rx={6} fill="#FFFFFF" opacity={0.86} />
          </>
        )}
        {panel(spec.layout, 'A', A, p, f, data, art, full && spec.layout === 'name', `${uid}a`)}
        {panel(spec.layout, 'B', B, p, f, data, art, full && spec.layout === 'name', `${uid}b`)}
      </>
    );
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-mug-w={W} data-mug-h={H}>
      <rect width={W} height={H} fill="#FFFFFF" />
      <g transform={mirror ? `translate(${W} 0) scale(-1 1)` : undefined}>{body}</g>
      {guides && (
        <g pointerEvents="none" data-guide="1">
          <rect x={0.25} y={0.25} width={W - 0.5} height={H - 0.5} fill="none" stroke="#94A3B8" strokeWidth={0.4} strokeDasharray="2 1.5" />
          <line x1={W / 2} y1={2} x2={W / 2} y2={H - 2} stroke="#CBD5E1" strokeWidth={0.3} strokeDasharray="1 1.5" />
        </g>
      )}
    </svg>
  );
}
