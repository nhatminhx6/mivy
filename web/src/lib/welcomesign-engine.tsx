'use client';
// Bảng chào mừng tiệc (welcome sign): 1 engine SVG = DỊP (cưới, vu quy/thành hôn, sinh nhật, thôi nôi, khai trương,
// tất niên, hội nghị) × BỐ CỤC (vòm, hoa góc, ảnh, khung mảnh, song hỷ, tiệc vui) × BẢNG MÀU × CẶP FONT (serif + viết tay)
// × CHẤT LIỆU (formex in UV, mica trong in UV + lót trắng, canvas) → render code 100%.
// Đơn vị vẽ: 1 = 1mm. Mica trong: KHÔNG in nền — chỉ in mảng lót trắng (vòm/khung) + chữ; có thêm lớp "mực trắng" riêng.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { coverRect, photoDpi, samplePhotos, type CVPhoto } from './canvas-engine';
import { solarToLunar, canChiYear, LUNAR_MONTH_NAMES } from './lunar-vn';

export const WS_BLEED_MM = 3;
export const CUTCONTOUR = '#EC008C';

// ---------- khổ ----------
export interface WsSize { id: string; name: string; wMm: number; hMm: number }
export const WS_SIZES: WsSize[] = [
  { id: '40x60', name: '40 × 60 cm', wMm: 400, hMm: 600 },
  { id: '50x70', name: '50 × 70 cm (phổ biến)', wMm: 500, hMm: 700 },
  { id: '60x90', name: '60 × 90 cm', wMm: 600, hMm: 900 },
  { id: '90x60', name: '90 × 60 cm (ngang)', wMm: 900, hMm: 600 },
];
export const wsSize = (id: string) => WS_SIZES.find((s) => s.id === id) || WS_SIZES[1];

export type WsMaterial = 'formex' | 'acrylic' | 'canvas';
export const WS_MATERIALS: { id: WsMaterial; name: string; hint: string }[] = [
  { id: 'formex', name: 'Formex 5mm in UV', hint: 'Cứng, nhẹ, rẻ — phổ biến nhất' },
  { id: 'acrylic', name: 'Mica trong in UV', hint: 'Trong suốt, nền tiệc nhìn xuyên qua — đang hot' },
  { id: 'canvas', name: 'Canvas căng khung', hint: 'Vải canvas, giữ làm kỷ niệm' },
];

// ---------- dịp + chữ mẫu ----------
export type WsOccasion = 'wedding' | 'vuquy' | 'birthday' | 'baby' | 'opening' | 'yep' | 'conference';
export const WS_OCCASIONS: { id: WsOccasion; name: string }[] = [
  { id: 'wedding', name: 'Đám cưới' },
  { id: 'vuquy', name: 'Vu quy · thành hôn' },
  { id: 'birthday', name: 'Sinh nhật' },
  { id: 'baby', name: 'Thôi nôi · đầy tháng' },
  { id: 'opening', name: 'Khai trương' },
  { id: 'yep', name: 'Tất niên · YEP' },
  { id: 'conference', name: 'Hội nghị · hội thảo' },
];
const lunarNote = (d: number, m: number, y: number) => {
  const l = solarToLunar(d, m, y);
  return `Nhằm ngày ${String(l.day).padStart(2, '0')} tháng ${LUNAR_MONTH_NAMES[l.month - 1]} năm ${canChiYear(l.year)}`;
};
export type WsData = Record<string, string>;
export const WS_SAMPLES: Record<WsOccasion, WsData> = {
  wedding: { eyebrow: '', kicker: 'Welcome to the wedding of', title: 'Quốc Bảo & Thu Hà', date: '12 . 12 . 2026', venue: 'An Khang Palace · Sảnh Hoa Hồng', note: 'Cảm ơn quý khách đã đến chung vui' },
  vuquy: { eyebrow: 'LỄ VU QUY', kicker: 'Trân trọng kính mời', title: 'Thu Hà & Quốc Bảo', date: 'Thứ Bảy · 12 . 12 . 2026', venue: 'Tư gia nhà gái · 18 Lê Lợi, TP. Huế', note: lunarNote(12, 12, 2026) },
  birthday: { eyebrow: 'HAPPY BIRTHDAY', kicker: 'Mừng sinh nhật', title: 'Bé Gia Khánh', date: '7 tuổi · 20 . 03 . 2027', venue: 'Nhà hàng An Khang · Phòng VIP 2', note: 'Cảm ơn mọi người đã đến chung vui cùng con' },
  baby: { eyebrow: 'THÔI NÔI', kicker: 'Mừng bé tròn 1 tuổi', title: 'Bảo An', date: '05 . 05 . 2027', venue: 'Tư gia · 25 Trần Phú, Đà Nẵng', note: 'Chúc con luôn khoẻ mạnh, bình an' },
  opening: { eyebrow: 'GRAND OPENING', kicker: 'Chào mừng quý khách', title: 'AN KHANG COFFEE', date: 'Khai trương 08 . 01 . 2027', venue: '12 Nguyễn Huệ, Quận 1, TP.HCM', note: 'Giảm 30% toàn menu trong 3 ngày đầu' },
  yep: { eyebrow: 'YEAR END PARTY 2026', kicker: 'Welcome to', title: 'AN KHANG GROUP', date: 'Tối 22 . 01 . 2027 · 18:00', venue: 'Sảnh Grand Ballroom · An Khang Palace', note: 'Bứt phá cùng nhau — Vững bước 2027' },
  conference: { eyebrow: 'HỘI NGHỊ KHÁCH HÀNG 2027', kicker: 'Chào mừng quý đại biểu', title: 'Đồng hành cùng phát triển', date: 'Thứ Sáu · 15 . 03 . 2027', venue: 'Trung tâm Hội nghị An Khang · Hội trường A', note: 'Đơn vị tổ chức: Công ty TNHH An Khang' },
};
export interface WsField { key: string; label: string; ph?: string; half?: boolean }
export const WS_FIELDS: WsField[] = [
  { key: 'eyebrow', label: 'Dòng nhỏ trên cùng (in hoa)', ph: 'LỄ VU QUY', half: true },
  { key: 'kicker', label: 'Lời chào (chữ viết tay)', ph: 'Welcome to the wedding of', half: true },
  { key: 'title', label: 'Tên cô dâu chú rể / tên bé / tên sự kiện', ph: 'Quốc Bảo & Thu Hà' },
  { key: 'date', label: 'Ngày giờ', ph: '12 . 12 . 2026', half: true },
  { key: 'venue', label: 'Địa điểm', ph: 'An Khang Palace · Sảnh Hoa Hồng', half: true },
  { key: 'note', label: 'Dòng cuối (lời cảm ơn / ngày âm lịch)', ph: 'Cảm ơn quý khách đã đến chung vui' },
];

// ---------- bảng màu ----------
export interface WsPalette { id: string; name: string; bg: string; bg2: string; ink: string; sub: string; accent: string; gold: string; leaf: string; flowers: string[]; dark?: boolean }
export const WS_PALETTES: WsPalette[] = [
  { id: 'ivory', name: 'Kem ánh vàng', bg: '#FBF6EC', bg2: '#F1E6CF', ink: '#3A2E20', sub: '#7B6A50', accent: '#B8892E', gold: '#C49A45', leaf: '#8FA586', flowers: ['#FFFFFF', '#F3DCCF', '#E9C4B4', '#F7EBD8'] },
  { id: 'blush', name: 'Hồng phấn', bg: '#FCF1EE', bg2: '#F5D8D2', ink: '#5A2F37', sub: '#94676E', accent: '#C0566B', gold: '#C49A45', leaf: '#8DAA88', flowers: ['#F2A9B6', '#FFFFFF', '#E7848F', '#F8D6CC'] },
  { id: 'sage', name: 'Xanh xô thơm', bg: '#F2F4EE', bg2: '#DCE3D3', ink: '#2F3D32', sub: '#617360', accent: '#6E8B68', gold: '#B79A5B', leaf: '#7E9B79', flowers: ['#FFFFFF', '#F2EAD9', '#DDE6D3', '#F6DCCB'] },
  { id: 'navy', name: 'Navy ánh kim', bg: '#14213D', bg2: '#22305A', ink: '#FFFFFF', sub: '#D8C59A', accent: '#D6B062', gold: '#D6B062', leaf: '#9DB2A1', flowers: ['#FFFFFF', '#F1E1C0', '#E9C9C2', '#D6B062'], dark: true },
  { id: 'black', name: 'Đen ánh vàng', bg: '#151515', bg2: '#242424', ink: '#F7F2E7', sub: '#CDBB8E', accent: '#D4AF5A', gold: '#D4AF5A', leaf: '#A2A58A', flowers: ['#FFFFFF', '#E8D7B0', '#D4AF5A', '#F3E9D8'], dark: true },
  { id: 'red', name: 'Đỏ son hỷ', bg: '#B3121F', bg2: '#8E0E19', ink: '#FFF3D6', sub: '#FFD98A', accent: '#F4C45A', gold: '#F4C45A', leaf: '#F4C45A', flowers: ['#F4C45A', '#FFE2A0', '#FFFFFF', '#FF9C7A'], dark: true },
  { id: 'burgundy', name: 'Đỏ đô', bg: '#5E1222', bg2: '#47101A', ink: '#FBEFDF', sub: '#E3C68E', accent: '#D9B26A', gold: '#D9B26A', leaf: '#B9A27A', flowers: ['#F2D6C9', '#FFFFFF', '#D9B26A', '#E6A4A4'], dark: true },
  { id: 'pastel', name: 'Pastel tiệc', bg: '#FFF8EE', bg2: '#FFE2EB', ink: '#4A2F5E', sub: '#86699A', accent: '#FF6F91', gold: '#E9B44C', leaf: '#7FC8A9', flowers: ['#FF9AB4', '#7FD3E6', '#FFD66B', '#B79CFF'] },
  { id: 'sky', name: 'Xanh em bé', bg: '#EEF6FF', bg2: '#D5E8FF', ink: '#24406B', sub: '#5D7BA6', accent: '#4A8BDB', gold: '#E9A82E', leaf: '#7FB7A0', flowers: ['#9CC8FF', '#FFFFFF', '#F5B841', '#FFB3C7'] },
  { id: 'teal', name: 'Xanh ngọc', bg: '#0F4C4A', bg2: '#0B3B39', ink: '#F4FBF8', sub: '#A8DCD1', accent: '#F2B45A', gold: '#F2B45A', leaf: '#7FC4B4', flowers: ['#F2B45A', '#FFFFFF', '#F28C6A', '#A8DCD1'], dark: true },
];
export const wsPalette = (id: string) => WS_PALETTES.find((p) => p.id === id) || WS_PALETTES[0];

// ---------- font (tiêu đề + viết tay) — tất cả có TTF để outline file in ----------
export interface WsFont { id: string; name: string; family: string; weight: number; caps?: boolean }
export const WS_HEADS: WsFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'montserrat', name: 'Montserrat', family: 'Montserrat', weight: 800, caps: true },
  { id: 'bevietnam', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const WS_SCRIPTS: WsFont[] = [
  { id: 'greatvibes', name: 'Great Vibes', family: 'Great Vibes', weight: 400 },
  { id: 'alexbrush', name: 'Alex Brush', family: 'Alex Brush', weight: 400 },
  { id: 'allura', name: 'Allura', family: 'Allura', weight: 400 },
  { id: 'dancing', name: 'Dancing Script', family: 'Dancing Script', weight: 700 },
];
const headOf = (id: string) => WS_HEADS.find((f) => f.id === id) || WS_HEADS[0];
const scriptOf = (id: string) => WS_SCRIPTS.find((f) => f.id === id) || WS_SCRIPTS[0];
const BODY = 'Be Vietnam Pro';
export const WS_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Montserrat:wght@800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:wght@700&family=Prata&family=Great+Vibes&family=Alex+Brush&family=Allura&family=Dancing+Script:wght@700&display=swap');`;

export function useWsFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ws-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ws-fonts'; link.rel = 'stylesheet';
        link.href = WS_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [...WS_HEADS, ...WS_SCRIPTS].map((f) => `${f.weight} 40px "${f.family}"`).concat(['600 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"']);
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 &·')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- spec + mẫu ----------
export type WsLayout = 'arch' | 'floral' | 'photo' | 'frame' | 'songhy' | 'party';
export const WS_LAYOUTS: { id: WsLayout; name: string }[] = [
  { id: 'arch', name: 'Vòm cổng hoa' },
  { id: 'floral', name: 'Hoa lá 2 góc' },
  { id: 'photo', name: 'Có ảnh' },
  { id: 'frame', name: 'Khung mảnh sang trọng' },
  { id: 'songhy', name: 'Hỷ truyền thống' },
  { id: 'party', name: 'Tiệc vui · bóng bay' },
];
export interface WsSpec { occasion: WsOccasion; layout: WsLayout; palette: string; head: string; script: string; size: string; material: WsMaterial }
export interface WsTemplate { id: string; name: string; spec: Omit<WsSpec, 'size' | 'material'> & { material?: WsMaterial } }
const T = (id: string, name: string, occasion: WsOccasion, layout: WsLayout, palette: string, head: string, script: string, material?: WsMaterial): WsTemplate =>
  ({ id, name, spec: { occasion, layout, palette, head, script, ...(material ? { material } : {}) } });
export const WS_TEMPLATES: WsTemplate[] = [
  T('wed-arch-ivory', 'Cưới · vòm hoa kem', 'wedding', 'arch', 'ivory', 'playfair', 'greatvibes'),
  T('wed-floral-blush', 'Cưới · hoa hồng phấn', 'wedding', 'floral', 'blush', 'cormorant', 'allura'),
  T('wed-photo-sage', 'Cưới · ảnh cô dâu chú rể', 'wedding', 'photo', 'sage', 'prata', 'alexbrush'),
  T('wed-frame-navy', 'Cưới · navy ánh kim', 'wedding', 'frame', 'navy', 'playfair', 'greatvibes'),
  T('wed-arch-clear', 'Cưới · mica trong vòm trắng', 'wedding', 'arch', 'sage', 'cormorant', 'greatvibes', 'acrylic'),
  T('vuquy-red', 'Lễ vu quy · đỏ son', 'vuquy', 'songhy', 'red', 'playfair', 'greatvibes'),
  T('thanhhon-burgundy', 'Lễ thành hôn · đỏ đô', 'vuquy', 'songhy', 'burgundy', 'cormorant', 'alexbrush'),
  T('bd-party-pastel', 'Sinh nhật · bóng bay', 'birthday', 'party', 'pastel', 'montserrat', 'dancing'),
  T('baby-photo-sky', 'Thôi nôi · ảnh bé', 'baby', 'photo', 'sky', 'bevietnam', 'dancing'),
  T('open-party-red', 'Khai trương · đỏ vàng', 'opening', 'party', 'red', 'montserrat', 'dancing'),
  T('yep-frame-black', 'Tất niên · đen vàng', 'yep', 'frame', 'black', 'montserrat', 'greatvibes'),
  T('conf-floral-teal', 'Hội nghị · xanh ngọc', 'conference', 'frame', 'teal', 'bevietnam', 'allura', 'formex'),
];
export const defaultWsSpec = (): WsSpec => ({ material: 'formex', size: '50x70', ...WS_TEMPLATES[0].spec });
export const wsLayoutNeedsPhoto = (l: WsLayout) => l === 'photo';

// ---------- đo chữ thật ----------
let mctx: CanvasRenderingContext2D | null = null;
const ctx = () => { if (typeof document === 'undefined') return null; mctx ??= document.createElement('canvas').getContext('2d'); return mctx; };
function measure(text: string, family: string, weight: number): number {
  const c = ctx(); if (!c) return text.length * 60;
  c.font = `${weight} 100px "${family}"`;
  return c.measureText(text).width;
}
const metricCache = new Map<string, { asc: number; desc: number }>();
function metric(family: string, weight: number) {
  const k = `${weight}|${family}`;
  const hit = metricCache.get(k); if (hit) return hit;
  const c = ctx();
  let asc = 0.95, desc = 0.28;
  if (c) {
    c.font = `${weight} 100px "${family}"`;
    const m = c.measureText('ẮHgjđ');
    if (m.fontBoundingBoxAscent) { asc = m.fontBoundingBoxAscent / 100; desc = m.fontBoundingBoxDescent / 100; }
  }
  const v = { asc, desc };
  if (typeof document !== 'undefined' && document.fonts.check(`${weight} 20px "${family}"`)) metricCache.set(k, v);
  return v;
}
const fitSize = (text: string, family: string, weight: number, maxW: number, size: number, ls = 0) => {
  if (!text) return size;
  const per = measure(text, family, weight) / 100, L = ls * Math.max(0, text.length - 1);
  return per * size + L > maxW ? Math.max(1, (maxW - L) / per) : size;
};
/** 1 dòng nếu đủ to, không thì bẻ 2 dòng cân (ưu tiên bẻ quanh dấu "&") */
function fitLines(text: string, family: string, weight: number, maxW: number, size: number, minSize: number, ls = 0): { lines: string[]; size: number } {
  const t = (text || '').trim().replace(/\s+/g, ' ');
  const s1 = fitSize(t, family, weight, maxW, size, ls);
  const words = t.split(' ').filter(Boolean);
  if (words.length < 2 || s1 >= size * 0.97) return { lines: t ? [t] : [], size: s1 };
  let best: string[] = [t], bw = Infinity;
  const amp = words.indexOf('&');
  if (amp > 0 && amp < words.length - 1 && words.length >= 3) {
    // "Quốc Bảo & Thu Hà" → "Quốc Bảo &" / "Thu Hà" — cân bằng hơn
    best = [words.slice(0, amp + 1).join(' '), words.slice(amp + 1).join(' ')];
    bw = Math.max(measure(best[0], family, weight), measure(best[1], family, weight));
  } else {
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(measure(a, family, weight), measure(b, family, weight));
      if (w < bw) { bw = w; best = [a, b]; }
    }
  }
  const s2 = Math.min(size * 0.9, ...best.map((l) => fitSize(l, family, weight, maxW, size, ls)));
  // 2 dòng chỉ khi chữ to hơn rõ (≥25%) hoặc 1 dòng đã dưới mức tối thiểu
  return s2 > s1 * 1.25 || (s1 < minSize && s2 > s1) ? { lines: best, size: s2 } : { lines: [t], size: s1 };
}
const f1 = (n: number) => Math.round(n * 10) / 10;

interface Box { x: number; y: number; w: number; h: number }
type Item =
  | { kind: 'text'; text: string; family: string; weight: number; max: number; min: number; fill: string; role: string; ls?: number }
  | { kind: 'rule'; w: number; color: string; h: number }
  | { kind: 'gap'; h: number };
/** xếp các dòng vào hộp: mỗi dòng co theo bề ngang, tổng cao vượt hộp thì co đều (giữ tối thiểu), canh giữa dọc. */
function Stack({ items, box }: { items: Item[]; box: Box }) {
  const its = items.filter((i) => i.kind !== 'text' || (i.text || '').trim());
  if (!its.some((i) => i.kind === 'text')) return null;
  // thử phóng to cả khối (g) cho đầy hộp — chữ vẫn bị bề ngang chặn qua fitLines; chọn g lớn nhất còn vừa chiều cao
  const layoutAt = (g: number) => its.map((it) => (it.kind === 'text' ? { it, ...fitLines(it.text, it.family, it.weight, box.w, it.max * g, it.min, it.ls) } : { it, lines: [] as string[], size: 0 }));
  const heightOf = (fit: ReturnType<typeof layoutAt>, g: number) => fit.reduce((a, f) => {
    if (f.it.kind === 'text') { const m = metric(f.it.family, f.it.weight); return a + f.lines.length * (m.asc + m.desc) * f.size; }
    return a + f.it.h * g;
  }, 0);
  let g = 1, fit = layoutAt(1);
  for (const cand of [1.6, 1.45, 1.3, 1.15]) {
    const f = layoutAt(cand);
    if (heightOf(f, cand) <= box.h * 0.94) { g = cand; fit = f; break; }
  }
  const hOf = (i: number, k: number) => {
    const f = fit[i];
    if (f.it.kind === 'text') { const m = metric(f.it.family, f.it.weight); return f.lines.length * (m.asc + m.desc) * f.size * k; }
    return f.it.h * g * k;
  };
  let k = 1;
  for (let it = 0; it < 4; it++) {
    const tot = fit.reduce((a, _f, i) => a + hOf(i, k), 0);
    if (tot <= box.h) break;
    k *= box.h / tot;
  }
  const total = fit.reduce((a, _f, i) => a + hOf(i, k), 0);
  let y = box.y + (box.h - total) / 2;
  const cx = box.x + box.w / 2;
  const out: ReactNode[] = [];
  fit.forEach((f, i) => {
    const it = f.it;
    if (it.kind === 'gap') { y += it.h * g * k; return; }
    if (it.kind === 'rule') {
      const yy = y + (it.h * g * k) / 2, w = it.w * g;
      out.push(
        <g key={`r${i}`} data-role="rule">
          <line x1={f1(cx - w / 2)} y1={f1(yy)} x2={f1(cx - 6)} y2={f1(yy)} stroke={it.color} strokeWidth={1.2} />
          <path d={`M${f1(cx)} ${f1(yy - 3.6)} L${f1(cx + 3.6)} ${f1(yy)} L${f1(cx)} ${f1(yy + 3.6)} L${f1(cx - 3.6)} ${f1(yy)} Z`} fill={it.color} />
          <line x1={f1(cx + 6)} y1={f1(yy)} x2={f1(cx + w / 2)} y2={f1(yy)} stroke={it.color} strokeWidth={1.2} />
        </g>,
      );
      y += it.h * g * k; return;
    }
    const m = metric(it.family, it.weight), s = f.size * k;
    f.lines.forEach((ln, j) => {
      out.push(
        <text key={`${i}-${j}`} x={f1(cx)} y={f1(y + m.asc * s)} fontFamily={`'${it.family}'`} fontWeight={it.weight} fontSize={f1(s)} fill={it.fill}
          textAnchor="middle" letterSpacing={it.ls ? f1(it.ls * (s / it.max)) : undefined} data-role={it.role} style={{ fontVariantLigatures: 'none' }}>{ln}</text>,
      );
      y += (m.asc + m.desc) * s;
    });
  });
  return <>{out}</>;
}

// ---------- trang trí vẽ bằng code ----------
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const reseed = (s: number) => { seed = s; };

function Rose({ x, y, r, c, center }: { x: number; y: number; r: number; c: string; center: string }) {
  // hoa tròn nhiều lớp cánh (hồng/mẫu đơn cách điệu)
  const petals: ReactNode[] = [];
  for (let ring = 0; ring < 3; ring++) {
    const n = 7 - ring * 2, rr = r * (1 - ring * 0.28);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + ring * 0.5;
      const px = x + Math.cos(a) * rr * 0.42, py = y + Math.sin(a) * rr * 0.42;
      petals.push(<ellipse key={`${ring}-${i}`} cx={f1(px)} cy={f1(py)} rx={f1(rr * 0.52)} ry={f1(rr * 0.4)} transform={`rotate(${f1((a * 180) / Math.PI)} ${f1(px)} ${f1(py)})`} fill={c} stroke="rgba(0,0,0,0.07)" strokeWidth={0.6} />);
    }
  }
  return <g>{petals}<circle cx={f1(x)} cy={f1(y)} r={f1(r * 0.16)} fill={center} /></g>;
}
function Eucalyptus({ x, y, len, rot, c }: { x: number; y: number; len: number; rot: number; c: string }) {
  // cành bạch đàn: thân cong + lá tròn so le
  const leaves: ReactNode[] = [];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1), lx = t * len, side = i % 2 ? 1 : -1, lr = len * (0.085 - t * 0.03);
    leaves.push(<ellipse key={i} cx={f1(lx)} cy={f1(side * lr * 1.1)} rx={f1(lr)} ry={f1(lr * 0.8)} fill={c} opacity={0.92} />);
  }
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`}>
      <path d={`M0 0 Q${f1(len * 0.5)} ${f1(-len * 0.06)} ${f1(len)} 0`} stroke={c} strokeWidth={f1(len * 0.012 + 0.6)} fill="none" />
      {leaves}
    </g>
  );
}
function Fern({ x, y, len, rot, c }: { x: number; y: number; len: number; rot: number; c: string }) {
  const lv: ReactNode[] = [];
  for (let i = 1; i < 10; i++) {
    const t = i / 10, lx = t * len, l = len * 0.16 * (1 - t * 0.7);
    lv.push(<path key={i} d={`M${f1(lx)} 0 q${f1(l * 0.3)} ${f1(-l * 0.5)} ${f1(l * 0.9)} ${f1(-l)} M${f1(lx)} 0 q${f1(l * 0.3)} ${f1(l * 0.5)} ${f1(l * 0.9)} ${f1(l)}`} stroke={c} strokeWidth={f1(len * 0.012 + 0.5)} fill="none" strokeLinecap="round" />);
  }
  return <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`}><path d={`M0 0 L${f1(len)} 0`} stroke={c} strokeWidth={f1(len * 0.014 + 0.6)} />{lv}</g>;
}
/** cụm hoa lá: hoa chính ở giữa, lá toả ra theo hướng `dir` (độ) */
function Spray({ x, y, s, dir, p, sd }: { x: number; y: number; s: number; dir: number; p: WsPalette; sd: number }) {
  reseed(sd);
  const parts: ReactNode[] = [];
  for (let i = 0; i < 6; i++) {
    const a = dir + (i - 2.5) * 26 + (rnd() - 0.5) * 12;
    parts.push(i % 2 ? <Eucalyptus key={`e${i}`} x={x} y={y} len={s * (0.85 + rnd() * 0.35)} rot={a} c={p.leaf} /> : <Fern key={`f${i}`} x={x} y={y} len={s * (0.7 + rnd() * 0.3)} rot={a} c={p.leaf} />);
  }
  const fl = p.flowers;
  parts.push(<Rose key="r1" x={x} y={y} r={s * 0.2} c={fl[0]} center={p.gold} />);
  const a1 = ((dir + 40) * Math.PI) / 180, a2 = ((dir - 38) * Math.PI) / 180;
  parts.push(<Rose key="r2" x={x + Math.cos(a1) * s * 0.26} y={y + Math.sin(a1) * s * 0.26} r={s * 0.14} c={fl[2]} center={p.gold} />);
  parts.push(<Rose key="r3" x={x + Math.cos(a2) * s * 0.28} y={y + Math.sin(a2) * s * 0.28} r={s * 0.12} c={fl[1]} center={p.gold} />);
  for (let i = 0; i < 5; i++) {
    const a = ((dir + (rnd() - 0.5) * 120) * Math.PI) / 180, d = s * (0.3 + rnd() * 0.25);
    parts.push(<circle key={`b${i}`} cx={f1(x + Math.cos(a) * d)} cy={f1(y + Math.sin(a) * d)} r={f1(s * 0.025)} fill={fl[3]} />);
  }
  return <g data-deco="spray">{parts}</g>;
}
function Balloon({ x, y, r, c, ink }: { x: number; y: number; r: number; c: string; ink: string }) {
  return (
    <g>
      <path d={`M${f1(x)} ${f1(y + r * 1.15)} q${f1(-r * 0.25)} ${f1(r * 0.8)} ${f1(r * 0.1)} ${f1(r * 1.8)}`} stroke={ink} strokeWidth={0.9} fill="none" opacity={0.55} />
      <ellipse cx={f1(x)} cy={f1(y)} rx={f1(r)} ry={f1(r * 1.17)} fill={c} />
      <path d={`M${f1(x - r * 0.12)} ${f1(y + r * 1.14)} l${f1(r * 0.12)} ${f1(-r * 0.12)} l${f1(r * 0.12)} ${f1(r * 0.12)} z`} fill={c} />
      <ellipse cx={f1(x - r * 0.35)} cy={f1(y - r * 0.45)} rx={f1(r * 0.2)} ry={f1(r * 0.32)} fill="#FFFFFF" opacity={0.45} transform={`rotate(-25 ${f1(x - r * 0.35)} ${f1(y - r * 0.45)})`} />
    </g>
  );
}
function Rings({ x, y, r, c }: { x: number; y: number; r: number; c: string }) {
  return (
    <g fill="none" stroke={c} strokeWidth={f1(r * 0.14)}>
      <circle cx={f1(x - r * 0.42)} cy={f1(y)} r={f1(r * 0.62)} />
      <circle cx={f1(x + r * 0.42)} cy={f1(y)} r={f1(r * 0.62)} />
      <path d={`M${f1(x + r * 0.42)} ${f1(y - r * 0.62 - r * 0.24)} l${f1(r * 0.16)} ${f1(r * 0.16)} l${f1(-r * 0.16)} ${f1(r * 0.16)} l${f1(-r * 0.16)} ${f1(-r * 0.16)} z`} fill={c} stroke="none" />
    </g>
  );
}
/** góc khung hoa văn mảnh: đường L đôi + hình thoi + xoắn nhỏ */
function Corner({ x, y, s, sx, sy, c }: { x: number; y: number; s: number; sx: 1 | -1; sy: 1 | -1; c: string }) {
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${sx} ${sy})`} fill="none" stroke={c} strokeWidth={1.4}>
      <path d={`M0 ${f1(s)} L0 0 L${f1(s)} 0`} />
      <path d={`M${f1(s * 0.14)} ${f1(s * 0.7)} L${f1(s * 0.14)} ${f1(s * 0.14)} L${f1(s * 0.7)} ${f1(s * 0.14)}`} strokeWidth={0.9} />
      <path d={`M${f1(s * 0.3)} ${f1(s * 0.3)} m-${f1(s * 0.08)} 0 l${f1(s * 0.08)} -${f1(s * 0.08)} l${f1(s * 0.08)} ${f1(s * 0.08)} l-${f1(s * 0.08)} ${f1(s * 0.08)} z`} fill={c} stroke="none" />
      <path d={`M${f1(s * 0.42)} ${f1(s * 0.14)} q${f1(s * 0.16)} ${f1(s * 0.02)} ${f1(s * 0.2)} ${f1(s * 0.14)} q-${f1(s * 0.02)} ${f1(s * 0.1)} -${f1(s * 0.1)} ${f1(s * 0.06)}`} strokeWidth={0.9} />
      <path d={`M${f1(s * 0.14)} ${f1(s * 0.42)} q${f1(s * 0.02)} ${f1(s * 0.16)} ${f1(s * 0.14)} ${f1(s * 0.2)} q${f1(s * 0.1)} -${f1(s * 0.02)} ${f1(s * 0.06)} -${f1(s * 0.1)}`} strokeWidth={0.9} />
    </g>
  );
}
/** hoa văn "hồi văn" (key-fret) chạy dọc viền — dùng cho mẫu hỷ truyền thống */
function FretBand({ x, y, w, h, c }: { x: number; y: number; w: number; h: number; c: string }) {
  const u = h, n = Math.max(2, Math.floor(w / (u * 2)));
  const step = w / n, d: string[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = x + i * step;
    d.push(`M${f1(x0)} ${f1(y + u)} L${f1(x0)} ${f1(y)} L${f1(x0 + step * 0.75)} ${f1(y)} L${f1(x0 + step * 0.75)} ${f1(y + u * 0.7)} L${f1(x0 + step * 0.35)} ${f1(y + u * 0.7)} L${f1(x0 + step * 0.35)} ${f1(y + u * 0.35)}`);
  }
  return <path d={d.join(' ')} fill="none" stroke={c} strokeWidth={f1(u * 0.13)} strokeLinejoin="miter" />;
}
/** huy hiệu tròn hỷ: vòng đôi + 8 cánh sen + nhẫn cưới ở giữa (không dùng chữ Hán) */
function HyMedal({ x, y, r, p }: { x: number; y: number; r: number; p: WsPalette }) {
  const petals: ReactNode[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 360;
    petals.push(<path key={i} d={`M0 ${f1(-r * 0.34)} Q${f1(r * 0.17)} ${f1(-r * 0.62)} 0 ${f1(-r * 0.8)} Q${f1(-r * 0.17)} ${f1(-r * 0.62)} 0 ${f1(-r * 0.34)} Z`} transform={`translate(${f1(x)} ${f1(y)}) rotate(${a})`} fill={p.gold} opacity={0.9} />);
  }
  const dots: ReactNode[] = [];
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; dots.push(<circle key={i} cx={f1(x + Math.cos(a) * r * 0.9)} cy={f1(y + Math.sin(a) * r * 0.9)} r={f1(r * 0.028)} fill={p.gold} />); }
  return (
    <g data-deco="medal">
      <circle cx={f1(x)} cy={f1(y)} r={f1(r)} fill="none" stroke={p.gold} strokeWidth={f1(r * 0.04)} />
      <circle cx={f1(x)} cy={f1(y)} r={f1(r * 0.82)} fill="none" stroke={p.gold} strokeWidth={f1(r * 0.015)} />
      {dots}{petals}
      <circle cx={f1(x)} cy={f1(y)} r={f1(r * 0.3)} fill={p.bg2} stroke={p.gold} strokeWidth={f1(r * 0.02)} />
      <Rings x={x} y={y + r * 0.02} r={r * 0.2} c={p.gold} />
    </g>
  );
}

// ---------- hình học + nội dung ----------
export interface WsRender { W: number; H: number; art: ReactNode; photoSlot: { x: number; y: number; w: number; h: number } | null; textBox: Box }
export interface WsPhoto extends CVPhoto { }
const archPath = (x: number, y: number, w: number, h: number) => {
  const r = Math.min(w / 2, h * 0.42);
  return `M${f1(x)} ${f1(y + h)} L${f1(x)} ${f1(y + r)} A${f1(w / 2)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)} L${f1(x + w)} ${f1(y + h)} Z`;
};
const rrPath = (x: number, y: number, w: number, h: number, r: number) =>
  `M${f1(x + r)} ${f1(y)} H${f1(x + w - r)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w)} ${f1(y + r)} V${f1(y + h - r)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + w - r)} ${f1(y + h)} H${f1(x + r)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x)} ${f1(y + h - r)} V${f1(y + r)} A${f1(r)} ${f1(r)} 0 0 1 ${f1(x + r)} ${f1(y)} Z`;

export function composeWs(spec: WsSpec, data: WsData, photo: WsPhoto | null, uid: string): WsRender {
  const sz = wsSize(spec.size);
  const W = sz.wMm, H = sz.hMm, land = W > H;
  const p = wsPalette(spec.palette);
  const head = headOf(spec.head), scr = scriptOf(spec.script);
  const clear = spec.material === 'acrylic';
  const u = Math.min(W, H) / 100;           // 1u ≈ 1% cạnh ngắn
  const m = u * 6.5;                         // lề
  // mica trong: chữ nằm trên mảng lót trắng → dùng màu chữ tối của bảng màu (bảng tối thì lấy nền làm màu chữ)
  const ink = clear && p.dark ? p.bg : p.ink;
  const sub = clear && p.dark ? p.bg2 : p.sub;
  const acc = clear && p.dark ? p.bg : p.accent;
  const parts: ReactNode[] = [];
  let photoSlot: WsRender['photoSlot'] = null;
  let box: Box = { x: m * 1.6, y: m * 1.6, w: W - m * 3.2, h: H - m * 3.2 };
  const caps = head.caps;
  const title = caps ? (data.title || '').toUpperCase() : data.title || '';
  const big = land ? 1.15 : 1;
  const items: Item[] = [
    { kind: 'text', text: (data.eyebrow || '').toUpperCase(), family: BODY, weight: 800, max: u * 3.6, min: u * 2.2, fill: acc, role: 'eyebrow', ls: u * 0.9 },
    { kind: 'gap', h: u * 1.2 },
    { kind: 'text', text: data.kicker || '', family: scr.family, weight: scr.weight, max: u * 9 * big, min: u * 4, fill: acc, role: 'kicker' },
    { kind: 'gap', h: u * 1.4 },
    { kind: 'text', text: title, family: head.family, weight: head.weight, max: u * (caps ? 11 : 13) * big, min: u * 5, fill: ink, role: 'title', ls: caps ? u * 0.3 : 0 },
    { kind: 'gap', h: u * 2 },
    { kind: 'rule', w: u * 34, color: p.gold, h: u * 2.4 },
    { kind: 'gap', h: u * 2 },
    { kind: 'text', text: data.date || '', family: head.family, weight: head.weight, max: u * 5, min: u * 2.6, fill: ink, role: 'date', ls: u * 0.15 },
    { kind: 'gap', h: u * 1.1 },
    { kind: 'text', text: data.venue || '', family: BODY, weight: 600, max: u * 3.3, min: u * 2.2, fill: sub, role: 'venue' },
    { kind: 'gap', h: u * 2.2 },
    { kind: 'text', text: data.note || '', family: scr.family === 'Dancing Script' ? BODY : scr.family, weight: scr.family === 'Dancing Script' ? 600 : scr.weight, max: u * (scr.family === 'Dancing Script' ? 3 : 4.6), min: u * 2.2, fill: sub, role: 'note' },
  ];
  // nền (mica trong: không in nền)
  if (!clear) parts.push(<rect key="bg" x={-30} y={-30} width={W + 60} height={H + 60} fill={p.bg} />);

  switch (spec.layout) {
    case 'arch': {
      const ax = m, ay = m, aw = W - 2 * m, ah = H - 2 * m;
      const r = Math.min(aw / 2, ah * 0.42);
      if (clear) parts.push(<path key="panel" d={archPath(ax, ay, aw, ah)} fill="#FFFFFF" data-white="1" />);
      else {
        parts.push(<path key="a2" d={archPath(ax, ay, aw, ah)} fill={p.bg2} opacity={0.55} />);
        parts.push(<path key="a1" d={archPath(ax + u * 1.6, ay + u * 1.6, aw - u * 3.2, ah - u * 3.2)} fill="none" stroke={p.gold} strokeWidth={1.6} />);
      }
      parts.push(<path key="a0" d={archPath(ax + u * 2.6, ay + u * 2.6, aw - u * 5.2, ah - u * 5.2)} fill="none" stroke={p.gold} strokeWidth={0.8} opacity={0.8} />);
      const spr = Math.min(aw, ah) * 0.2;
      parts.push(<Spray key="s1" x={ax + aw * 0.2} y={ay + r * 0.55} s={spr} dir={-35} p={p} sd={11} />);
      parts.push(<Spray key="s2" x={ax + aw * 0.86} y={ay + ah * 0.97} s={spr * 0.8} dir={200} p={p} sd={29} />);
      const top = ay + r * (land ? 0.5 : 0.62);
      box = { x: ax + aw * 0.13, y: top, w: aw * 0.74, h: ay + ah - top - u * 7 };
      break;
    }
    case 'floral': {
      if (clear) parts.push(<path key="panel" d={rrPath(m * 1.2, m * 1.2, W - m * 2.4, H - m * 2.4, u * 6)} fill="#FFFFFF" data-white="1" />);
      parts.push(<rect key="fr" x={f1(m * 1.6)} y={f1(m * 1.6)} width={f1(W - m * 3.2)} height={f1(H - m * 3.2)} fill="none" stroke={p.gold} strokeWidth={1.2} />);
      const s = Math.min(W, H) * 0.3;
      parts.push(<Spray key="tl" x={m * 1.9} y={m * 1.9} s={s} dir={45} p={p} sd={5} />);
      parts.push(<Spray key="br" x={W - m * 1.9} y={H - m * 1.9} s={s} dir={225} p={p} sd={17} />);
      // hộp chữ tránh 2 cụm hoa góc (cụm toả tới ~s từ góc)
      box = land ? { x: m * 1.9 + s * 0.75, y: H * 0.14, w: W - 2 * (m * 1.9 + s * 0.75), h: H * 0.72 } : { x: W * 0.15, y: m * 1.9 + s * 0.78, w: W * 0.7, h: H - 2 * (m * 1.9 + s * 0.78) };
      break;
    }
    case 'photo': {
      const slot = land ? { x: m, y: m, w: W * 0.46 - m, h: H - 2 * m } : { x: m, y: m, w: W - 2 * m, h: (H - 2 * m) * 0.5 };
      photoSlot = slot;
      const clip = archPath(slot.x, slot.y, slot.w, slot.h);
      const ph = photo || samplePhotos()[0];
      const rct = coverRect(slot, ph);
      if (clear) parts.push(<path key="panel" d={rrPath(m * 0.6, m * 0.6, W - m * 1.2, H - m * 1.2, u * 5)} fill="#FFFFFF" data-white="1" />);
      parts.push(<clipPath key="pc" id={`${uid}-pc`}><path d={clip} /></clipPath>);
      parts.push(<image key="ph" href={ph.src} x={f1(rct.x)} y={f1(rct.y)} width={f1(rct.w)} height={f1(rct.h)} clipPath={`url(#${uid}-pc)`} preserveAspectRatio="none" data-photo="1" />);
      parts.push(<path key="pf" d={archPath(slot.x - u * 1.4, slot.y - u * 1.4, slot.w + u * 2.8, slot.h + u * 1.4)} fill="none" stroke={p.gold} strokeWidth={1.4} />);
      parts.push(<Spray key="sp" x={slot.x + slot.w * 0.92} y={slot.y + slot.h * 0.98} s={Math.min(W, H) * 0.17} dir={200} p={p} sd={41} />);
      box = land ? { x: W * 0.5, y: m * 1.4, w: W * 0.46 - m * 0.6, h: H - m * 2.8 } : { x: m * 1.3, y: slot.y + slot.h + u * 4, w: W - m * 2.6, h: H - (slot.y + slot.h + u * 4) - m * 1.3 };
      break;
    }
    case 'frame': {
      if (clear) parts.push(<path key="panel" d={rrPath(m * 0.9, m * 0.9, W - m * 1.8, H - m * 1.8, u * 2)} fill="#FFFFFF" data-white="1" />);
      parts.push(<rect key="f1" x={f1(m)} y={f1(m)} width={f1(W - 2 * m)} height={f1(H - 2 * m)} fill="none" stroke={p.gold} strokeWidth={2} />);
      parts.push(<rect key="f2" x={f1(m + u * 1.4)} y={f1(m + u * 1.4)} width={f1(W - 2 * m - u * 2.8)} height={f1(H - 2 * m - u * 2.8)} fill="none" stroke={p.gold} strokeWidth={0.8} />);
      const cs = u * 12;
      for (const [cx, cy, sx, sy] of [[m + u * 2.6, m + u * 2.6, 1, 1], [W - m - u * 2.6, m + u * 2.6, -1, 1], [m + u * 2.6, H - m - u * 2.6, 1, -1], [W - m - u * 2.6, H - m - u * 2.6, -1, -1]] as const)
        parts.push(<Corner key={`c${cx}${cy}`} x={cx} y={cy} s={cs} sx={sx} sy={sy} c={p.gold} />);
      if (spec.occasion === 'wedding') parts.push(<Rings key="rg" x={W / 2} y={m + u * 11} r={u * 4.2} c={p.gold} />);
      box = { x: m + u * 8, y: m + u * (spec.occasion === 'wedding' ? 18 : 10), w: W - 2 * m - u * 16, h: H - 2 * m - u * (spec.occasion === 'wedding' ? 26 : 20) };
      break;
    }
    case 'songhy': {
      if (clear) parts.push(<path key="panel" d={rrPath(m * 0.9, m * 0.9, W - m * 1.8, H - m * 1.8, u * 2)} fill={p.bg} data-white="1" />);
      parts.push(<rect key="b1" x={f1(m * 0.7)} y={f1(m * 0.7)} width={f1(W - m * 1.4)} height={f1(H - m * 1.4)} fill="none" stroke={p.gold} strokeWidth={2.4} />);
      parts.push(<FretBand key="ft" x={m * 0.7 + u * 3} y={m * 0.7 + u * 2} w={W - m * 1.4 - u * 6} h={u * 2.4} c={p.gold} />);
      parts.push(<g key="fb" transform={`rotate(180 ${f1(W / 2)} ${f1(H - m * 0.7 - u * 3.2)})`}><FretBand x={m * 0.7 + u * 3} y={H - m * 0.7 - u * 4.4} w={W - m * 1.4 - u * 6} h={u * 2.4} c={p.gold} /></g>);
      parts.push(<rect key="b2" x={f1(m * 0.7 + u * 6)} y={f1(m * 0.7 + u * 6)} width={f1(W - m * 1.4 - u * 12)} height={f1(H - m * 1.4 - u * 12)} fill="none" stroke={p.gold} strokeWidth={0.9} />);
      const mr = land ? H * 0.17 : W * 0.15;
      if (land) {
        parts.push(<HyMedal key="md" x={W * 0.2} y={H / 2} r={mr} p={p} />);
        box = { x: W * 0.36, y: m + u * 9, w: W * 0.58 - m, h: H - 2 * m - u * 18 };
      } else {
        parts.push(<HyMedal key="md" x={W / 2} y={m + u * 9 + mr} r={mr} p={p} />);
        const top = m + u * 12 + mr * 2;
        box = { x: m + u * 9, y: top, w: W - 2 * m - u * 18, h: H - top - m - u * 10 };
      }
      break;
    }
    case 'party': {
      if (clear) parts.push(<path key="panel" d={rrPath(m * 0.9, H * 0.2, W - m * 1.8, H * 0.72, u * 5)} fill="#FFFFFF" data-white="1" />);
      reseed(23);
      const br = u * 7.5, cols = p.flowers;
      const cl = (x: number, y: number, k: number) => [0, 1, 2].map((i) => <Balloon key={`${k}-${i}`} x={x + (i - 1) * br * 1.35} y={y + (i === 1 ? -br * 0.6 : 0)} r={br * (i === 1 ? 1.05 : 0.9)} c={cols[(k + i) % cols.length]} ink={ink} />);
      parts.push(<g key="bl" data-deco="balloons">{cl(m + br * 2.2, m + br * 1.6, 0)}{cl(W - m - br * 2.2, m + br * 1.6, 2)}</g>);
      const conf: ReactNode[] = [];
      for (let i = 0; i < 70; i++) {
        const x = m + rnd() * (W - 2 * m), y = m + rnd() * (H - 2 * m);
        const inText = x > W * 0.1 && x < W * 0.9 && y > H * 0.28 && y < H * 0.9;
        if (inText) continue;
        const c = cols[i % cols.length], r = u * (0.5 + rnd() * 0.7);
        conf.push(i % 3 ? <rect key={i} x={f1(x)} y={f1(y)} width={f1(r * 2)} height={f1(r * 0.9)} fill={c} transform={`rotate(${f1(rnd() * 180)} ${f1(x)} ${f1(y)})`} /> : <circle key={i} cx={f1(x)} cy={f1(y)} r={f1(r * 0.7)} fill={c} />);
      }
      parts.push(<g key="cf" data-deco="confetti">{conf}</g>);
      box = { x: W * 0.12, y: H * 0.3, w: W * 0.76, h: H * 0.58 };
      if (land) box = { x: W * 0.18, y: H * 0.3, w: W * 0.64, h: H * 0.6 };
      break;
    }
  }
  parts.push(<g key="txt" data-text-box={`${f1(box.x)},${f1(box.y)},${f1(box.w)},${f1(box.h)}`}><Stack items={items} box={box} /></g>);
  return { W, H, art: <>{parts}</>, photoSlot, textBox: box };
}

export type WsMode = 'preview' | 'tex' | 'print' | 'white';
/** preview: xem trước (mica: kính mờ nhẹ để nhìn thấy tấm) · tex: texture 3D · print: file in có lề xén + CutContour ·
 *  white: lớp mực trắng (mica trong) — mọi mảng in = đen, xưởng in lót trắng theo lớp này */
export function WelcomeSvg({ spec, data, photo = null, mode = 'preview', style }: { spec: WsSpec; data: WsData; photo?: WsPhoto | null; mode?: WsMode; style?: CSSProperties }) {
  const uid = useId().replace(/:/g, '');
  const r = composeWs(spec, data, photo, uid);
  const b = mode === 'print' || mode === 'white' ? WS_BLEED_MM : 0;
  const clear = spec.material === 'acrylic';
  const vb = `${-b} ${-b} ${r.W + 2 * b} ${r.H + 2 * b}`;
  const corner = Math.min(r.W, r.H) * 0.012;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} data-ws-w={r.W} data-ws-h={r.H} width={mode === 'print' || mode === 'white' ? `${r.W + 2 * b}mm` : undefined} height={mode === 'print' || mode === 'white' ? `${r.H + 2 * b}mm` : undefined}>
      <defs>
        <clipPath id={`${uid}-bd`}><rect x={-b} y={-b} width={r.W + 2 * b} height={r.H + 2 * b} /></clipPath>
        <filter id={`${uid}-blk`} colorInterpolationFilters="sRGB"><feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" /></filter>
      </defs>
      {mode === 'preview' && clear && <rect x={0} y={0} width={r.W} height={r.H} rx={corner} fill="rgba(235,244,248,0.55)" stroke="rgba(120,150,170,0.55)" strokeWidth={1.4} />}
      <g id="In" clipPath={`url(#${uid}-bd)`} filter={mode === 'white' ? `url(#${uid}-blk)` : undefined} data-ws-art="1">
        {mode === 'white' ? <WhiteOnly>{r.art}</WhiteOnly> : r.art}
      </g>
      {mode === 'print' && <g id="CutContour"><rect x={0} y={0} width={r.W} height={r.H} rx={corner} fill="none" stroke={CUTCONTOUR} strokeWidth={0.3} /></g>}
    </svg>
  );
}
// lớp trắng: giữ nguyên mọi mảng (lót trắng + chữ + hoạ tiết) → filter biến thành đen = vùng in mực trắng dưới màu
function WhiteOnly({ children }: { children: ReactNode }) { return <>{children}</>; }

/** dpi thực tế của ảnh trong ô ảnh (null nếu bố cục không có ảnh) */
export function wsPhotoDpi(spec: WsSpec, data: WsData, photo: WsPhoto | null): number | null {
  if (!wsLayoutNeedsPhoto(spec.layout) || !photo) return null;
  const r = composeWs(spec, data, photo, 'dpi');
  return r.photoSlot ? photoDpi(r.photoSlot, photo) : null;
}
