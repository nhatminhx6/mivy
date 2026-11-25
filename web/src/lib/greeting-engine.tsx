'use client';
// Thiệp Tết doanh nghiệp / thiệp chúc mừng: 1 engine SVG (đơn vị mm) = BỐ CỤC (dịp + tranh vẽ bằng code) × BẢNG MÀU × FONT.
// Thiệp gấp đôi = 2 tờ trải: MẶT NGOÀI [mặt sau | bìa] + MẶT TRONG [trong trái | trong phải lời chúc]; thiệp phẳng = trước + sau.
// Ép kim: phần vàng (foil) vẽ lại ở chế độ 'foil3d' (trắng trên đen → bản đồ kim loại 3D) và 'foilPrint' (đen trên trắng → khuôn ép).
// Cá nhân hoá: mỗi dòng danh sách người nhận → 1 trang trong riêng "Kính gửi: …".

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';
import { solarToLunar } from './lunar-vn';

export const GT_BLEED_MM = 3;

// ---------- khổ ----------
export interface GTSize { id: string; name: string; w: number; h: number }
export const GT_SIZES: GTSize[] = [
  { id: 'a6', name: '10 × 15 cm', w: 100, h: 150 },
  { id: '12x17', name: '12 × 17 cm', w: 120, h: 170 },
  { id: 'sq14', name: 'Vuông 14 × 14', w: 140, h: 140 },
];
export const gtSize = (id: string) => GT_SIZES.find((s) => s.id === id) || GT_SIZES[0];

// ---------- font ----------
export interface GTFont { id: string; name: string; family: string; weight: number }
export const GT_FONTS: GTFont[] = [
  { id: 'playfair', name: 'Playfair', family: 'Playfair Display', weight: 800 },
  { id: 'cormorant', name: 'Cormorant', family: 'Cormorant Garamond', weight: 700 },
  { id: 'prata', name: 'Prata', family: 'Prata', weight: 400 },
  { id: 'bvp', name: 'Be Vietnam', family: 'Be Vietnam Pro', weight: 800 },
];
export const gtFont = (id: string) => GT_FONTS.find((f) => f.id === id) || GT_FONTS[0];
const BODY = 'Be Vietnam Pro';
const SERIF = 'Cormorant Garamond';
const VN_SCRIPT = 'Dancing Script';
const EN_SCRIPT = 'Great Vibes';

export const GT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Prata&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap');`;

export function useGTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-gt-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-gt-fonts'; link.rel = 'stylesheet';
        link.href = GT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [
      ...GT_FONTS.map((f) => `${f.weight} 60px "${f.family}"`),
      `600 40px "${BODY}"`, `600 40px "${SERIF}"`, `italic 500 40px "${SERIF}"`, `700 40px "${VN_SCRIPT}"`, `400 40px "${EN_SCRIPT}"`,
    ];
    sheet.then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123')))).catch(() => null).then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
export type Flower = 'mai' | 'dao';
export interface GTPalette {
  id: string; name: string;
  bg: string; bg2: string; gold: string; ink: string; // bìa + trang trong trái
  paper: string; pInk: string; pSub: string; accent: string; // trang lời chúc
  foil: boolean; light?: boolean; flower: Flower;
}
export const GT_PALETTES: GTPalette[] = [
  { id: 'red', name: 'Đỏ ánh kim', bg: '#B3121B', bg2: '#8A0D14', gold: '#E3BC62', ink: '#FFF4DC', paper: '#FFFBF3', pInk: '#3A1D14', pSub: '#7D5A4A', accent: '#A8121A', foil: true, flower: 'mai' },
  { id: 'wine', name: 'Đỏ mận', bg: '#5E1530', bg2: '#45101F', gold: '#D9B061', ink: '#FBEBD6', paper: '#FFF9F4', pInk: '#2E1420', pSub: '#7C5A66', accent: '#6E1C38', foil: true, flower: 'dao' },
  { id: 'navy', name: 'Navy ánh kim', bg: '#16264A', bg2: '#0F1B36', gold: '#D4AF5A', ink: '#F7EFD9', paper: '#FBF8F2', pInk: '#1B2438', pSub: '#5E6779', accent: '#1B2C4F', foil: true, flower: 'mai' },
  { id: 'black', name: 'Đen ánh kim', bg: '#17171A', bg2: '#0C0C0E', gold: '#D9B865', ink: '#F4EAD2', paper: '#FBF8F1', pInk: '#1E1E1E', pSub: '#6E6A62', accent: '#8C6A22', foil: true, flower: 'mai' },
  { id: 'cream', name: 'Kem đỏ', bg: '#FBF3E4', bg2: '#F1E3C8', gold: '#C59A3A', ink: '#9A1219', paper: '#FFFDF8', pInk: '#3A1D14', pSub: '#7D5A4A', accent: '#A8121A', foil: true, light: true, flower: 'mai' },
  { id: 'peach', name: 'Hồng đào', bg: '#F7DCD6', bg2: '#EFC3BA', gold: '#C2185B', ink: '#5A2430', paper: '#FFF8F6', pInk: '#4A2B30', pSub: '#8E6A70', accent: '#C2185B', foil: false, light: true, flower: 'dao' },
  { id: 'jade', name: 'Ngọc bích', bg: '#0E4D4F', bg2: '#0A3A3C', gold: '#E0BE6E', ink: '#F3F0E4', paper: '#F9FBF8', pInk: '#14302F', pSub: '#5B706E', accent: '#0E4D4F', foil: true, flower: 'mai' },
  { id: 'pine', name: 'Xanh thông', bg: '#173F2C', bg2: '#0F2C1F', gold: '#E1BF6B', ink: '#F7F1E1', paper: '#FCFAF4', pInk: '#1D2B22', pSub: '#5E6B60', accent: '#A8121A', foil: true, flower: 'mai' },
  { id: 'snow', name: 'Trắng xanh', bg: '#FFFFFF', bg2: '#EEF2F8', gold: '#1F3A68', ink: '#1F3A68', paper: '#FFFFFF', pInk: '#1D2433', pSub: '#66708A', accent: '#1F3A68', foil: false, light: true, flower: 'mai' },
];
export const gtPalette = (id: string) => GT_PALETTES.find((p) => p.id === id) || GT_PALETTES[0];

// ---------- dịp + bố cục ----------
export type Occasion = 'tet' | 'xmas' | 'thanks' | 'anniv';
export const OCCASIONS: { id: Occasion; name: string }[] = [
  { id: 'tet', name: 'Tết Đinh Mùi 2027' },
  { id: 'xmas', name: 'Giáng sinh · Năm mới' },
  { id: 'thanks', name: 'Tri ân khách hàng' },
  { id: 'anniv', name: 'Kỷ niệm thành lập' },
];
export interface GTLayout { id: string; name: string; occ: Occasion }
export const GT_LAYOUTS: GTLayout[] = [
  { id: 'mai', name: 'Cành mai', occ: 'tet' },
  { id: 'dao', name: 'Đào & đèn lồng', occ: 'tet' },
  { id: 'lantern', name: 'Đèn lồng · pháo', occ: 'tet' },
  { id: 'frame', name: 'Khung ấn Phúc', occ: 'tet' },
  { id: 'fireworks', name: 'Pháo hoa 2027', occ: 'tet' },
  { id: 'xmas', name: 'Cây thông', occ: 'xmas' },
  { id: 'thanks', name: 'Vòng nguyệt quế', occ: 'thanks' },
  { id: 'anniv', name: 'Cột mốc năm', occ: 'anniv' },
];
export const gtLayout = (id: string) => GT_LAYOUTS.find((l) => l.id === id) || GT_LAYOUTS[0];
export const occOf = (layout: string): Occasion => gtLayout(layout).occ;

export interface GTSpec { layout: string; palette: string; font: string; size: string; fold: boolean; foil: boolean }
export interface GTTemplate { id: string; name: string; spec: Pick<GTSpec, 'layout' | 'palette' | 'font'> }
const T = (layout: string, palette: string, font: string): GTTemplate => ({
  id: `${layout}-${palette}`, name: `${gtLayout(layout).name} · ${gtPalette(palette).name}`, spec: { layout, palette, font },
});
export const GT_TEMPLATES: GTTemplate[] = [
  T('mai', 'red', 'playfair'), T('frame', 'navy', 'cormorant'), T('dao', 'peach', 'prata'), T('lantern', 'red', 'cormorant'),
  T('fireworks', 'black', 'playfair'), T('mai', 'cream', 'prata'), T('frame', 'red', 'playfair'), T('dao', 'wine', 'cormorant'),
  T('lantern', 'jade', 'playfair'), T('fireworks', 'navy', 'bvp'), T('xmas', 'pine', 'playfair'), T('thanks', 'snow', 'cormorant'),
  T('thanks', 'navy', 'prata'), T('anniv', 'black', 'playfair'),
];
export const defaultGTSpec = (): GTSpec => ({ ...GT_TEMPLATES[0].spec, size: 'a6', fold: true, foil: true });
/** ép kim có hiệu lực khi bảng màu có phần vàng ánh kim + khách bật */
export const gtHasFoil = (spec: GTSpec) => spec.foil && gtPalette(spec.palette).foil;

// ---------- nội dung ----------
export type GTData = Record<string, string>;
export interface GTField { key: string; label: string; ph?: string; half?: boolean; multiline?: boolean; group: 'brand' | 'cover' | 'inside' }
export const GT_FIELDS: GTField[] = [
  { key: 'brand', label: 'Tên công ty / thương hiệu', ph: 'AN KHANG', half: true, group: 'brand' },
  { key: 'slogan', label: 'Dòng giới thiệu', ph: 'Mỹ phẩm thiên nhiên', half: true, group: 'brand' },
  { key: 'phone', label: 'Hotline', ph: '1900 6868', half: true, group: 'brand' },
  { key: 'website', label: 'Website', ph: 'ankhang.vn', half: true, group: 'brand' },
  { key: 'address', label: 'Địa chỉ', ph: '12 Nguyễn Huệ, Q.1, TP.HCM', group: 'brand' },
  { key: 'bigWord', label: 'Chữ thư pháp trên bìa', ph: 'Xuân', half: true, group: 'cover' },
  { key: 'years', label: 'Số năm (kỷ niệm)', ph: '10', half: true, group: 'cover' },
  { key: 'headline', label: 'Tiêu đề bìa', ph: 'Chúc Mừng Năm Mới', group: 'cover' },
  { key: 'sub', label: 'Dòng phụ bìa', ph: 'Xuân Đinh Mùi 2027', group: 'cover' },
  { key: 'quote', label: 'Câu chúc trang trái (mỗi dòng 1 câu)', ph: 'An Khang – Thịnh Vượng\nVạn Sự Như Ý', multiline: true, group: 'inside' },
  { key: 'greeting', label: 'Lời chúc (trang phải)', multiline: true, group: 'inside' },
  { key: 'signer', label: 'Người đại diện ký', ph: 'Quốc Bảo', half: true, group: 'inside' },
  { key: 'role', label: 'Chức vụ', ph: 'Tổng Giám đốc', half: true, group: 'inside' },
];

/** lời chúc mẫu trang trọng — {brand} thay bằng tên công ty */
export const GREETING_PRESETS: Record<Occasion, { name: string; text: string }[]> = {
  tet: [
    { name: 'Cảm ơn + chúc Tết', text: 'Nhân dịp Xuân Đinh Mùi 2027, {brand} xin gửi lời cảm ơn chân thành đến Quý khách đã tin tưởng và đồng hành cùng chúng tôi trong suốt năm qua. Kính chúc Quý khách cùng gia đình một năm mới An Khang – Thịnh Vượng – Vạn Sự Như Ý.' },
    { name: 'Gửi đối tác', text: 'Xuân về Tết đến, kính chúc Quý đối tác cùng gia đình năm mới sức khoẻ dồi dào, hạnh phúc viên mãn, kinh doanh phát đạt. Mong rằng chúng ta sẽ tiếp tục hợp tác bền vững và cùng nhau gặt hái nhiều thành công hơn nữa trong năm 2027.' },
    { name: 'Thay mặt công ty', text: 'Thay mặt Ban lãnh đạo và toàn thể nhân viên {brand}, xin kính chúc Quý khách một mùa xuân ấm áp, một năm mới bình an, may mắn và tràn đầy niềm vui.' },
  ],
  xmas: [
    { name: 'Giáng sinh + năm mới', text: 'Mùa Giáng sinh an lành và năm mới 2027 đang đến gần, {brand} xin gửi lời chúc sức khoẻ, hạnh phúc và thành công đến Quý khách cùng gia đình. Cảm ơn Quý khách đã luôn đồng hành cùng chúng tôi.' },
    { name: 'Ngắn gọn', text: 'Chúc Quý khách một mùa Giáng sinh ấm áp bên người thân và một năm mới 2027 rực rỡ, an khang.' },
  ],
  thanks: [
    { name: 'Tri ân', text: '{brand} trân trọng cảm ơn Quý khách đã tin tưởng lựa chọn sản phẩm và dịch vụ của chúng tôi. Sự ủng hộ của Quý khách là động lực để chúng tôi không ngừng hoàn thiện mỗi ngày.' },
    { name: 'Khách thân thiết', text: 'Cảm ơn Quý khách đã là một phần quan trọng trong hành trình của {brand}. Chúng tôi mong tiếp tục được phục vụ và mang đến cho Quý khách những trải nghiệm tốt đẹp nhất.' },
  ],
  anniv: [
    { name: 'Kỷ niệm', text: 'Hành trình {years} năm của {brand} không thể trọn vẹn nếu thiếu sự đồng hành của Quý khách hàng và đối tác. Xin chân thành cảm ơn và mong tiếp tục nhận được sự tin yêu trong chặng đường mới.' },
  ],
};

const OCC_TEXT: Record<Occasion, Pick<GTData, 'bigWord' | 'headline' | 'sub' | 'quote' | 'greeting'>> = {
  tet: { bigWord: 'Xuân', headline: 'Chúc Mừng Năm Mới', sub: 'Xuân Đinh Mùi 2027', quote: 'An Khang – Thịnh Vượng\nVạn Sự Như Ý', greeting: GREETING_PRESETS.tet[0].text },
  xmas: { bigWord: 'Merry Christmas', headline: 'Mừng Giáng Sinh', sub: '& Happy New Year 2027', quote: 'Giáng sinh an lành\nNăm mới hạnh phúc', greeting: GREETING_PRESETS.xmas[0].text },
  thanks: { bigWord: 'Thank you', headline: 'Tri Ân Khách Hàng', sub: 'Cảm ơn Quý khách đã đồng hành', quote: 'Mỗi sự tin tưởng của Quý khách\nlà một món quà quý giá', greeting: GREETING_PRESETS.thanks[0].text },
  anniv: { bigWord: 'Thank you', headline: 'Kỷ Niệm Thành Lập', sub: '2017 – 2027', quote: 'Một thập kỷ vững bước\ncùng niềm tin của Quý khách', greeting: GREETING_PRESETS.anniv[0].text },
};
/** các ô đổi theo dịp (khách chưa sửa thì nạp lại chữ mẫu đúng dịp) */
export const OCC_KEYS = ['bigWord', 'headline', 'sub', 'quote', 'greeting'] as const;
export const occText = (o: Occasion) => ({ ...OCC_TEXT[o] });

export const defaultGTData = (): GTData => ({
  brand: 'AN KHANG', slogan: 'Mỹ phẩm thiên nhiên', phone: '1900 6868', website: 'ankhang.vn', address: '12 Nguyễn Huệ, Q.1, TP.HCM',
  years: '10', signer: 'Quốc Bảo', role: 'Tổng Giám đốc',
  recipients: 'Anh Trần Gia Khánh | Công ty TNHH Hải Đăng\nChị Lê Thu Hà | Chuỗi nhà thuốc Bình An\nÔng Phạm Quốc Bảo | Tập đoàn Sao Mai',
  ...OCC_TEXT.tet,
});

export interface Recipient { name: string; org: string }
/** mỗi dòng: "Tên | Đơn vị" (đơn vị tuỳ chọn) */
export function parseRecipients(text: string): Recipient[] {
  return (text || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 500).map((l) => {
    const [name, ...rest] = l.split('|');
    return { name: name.trim(), org: rest.join('|').trim() };
  }).filter((r) => r.name);
}
export const GENERIC_RECIPIENT: Recipient = { name: 'Quý khách hàng', org: '' };

/** Mùng 1 Tết 2027 (âm lịch → dương lịch, múi +7) */
export const TET_2027 = (() => {
  for (let d = new Date(2027, 0, 15); d.getMonth() < 2; d.setDate(d.getDate() + 1)) {
    const l = solarToLunar(d.getDate(), d.getMonth() + 1, d.getFullYear());
    if (l.day === 1 && l.month === 1 && !l.leap) {
      const wd = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'][d.getDay()];
      return `Mùng 1 Tết · ${wd}, ${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
    }
  }
  return '';
})();

// ---------- đo chữ thật ----------
let mctx: CanvasRenderingContext2D | null = null;
interface TF { fam: string; wt: number; it?: boolean; ls?: number }
export function tw(t: string, size: number, f: TF): number {
  const s = t || '';
  const ls = (f.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.56 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.56 + ls;
  mctx.font = `${f.it ? 'italic ' : ''}${f.wt} 100px "${f.fam}"`;
  return (mctx.measureText(s).width * size) / 100 + ls;
}
const fitW = (t: string, maxW: number, size: number, f: TF, min = 0) => { const w = tw(t, size, f); return Math.max(min, w > maxW ? (size * maxW) / w : size); };
function wrap(text: string, maxW: number, size: number, f: TF): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const nxt = cur ? `${cur} ${w}` : w;
      if (cur && tw(nxt, size, f) > maxW) { out.push(cur); cur = w; } else cur = nxt;
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** chữ đoạn: thu nhỏ dần tới khi vừa khung (rộng × cao), trả dòng + cỡ */
function fitBlock(text: string, maxW: number, maxH: number, size: number, min: number, f: TF, lh: number) {
  let s = size;
  for (let i = 0; i < 40; i++) {
    const lines = wrap(text, maxW, s, f);
    const widest = Math.max(0, ...lines.map((l) => tw(l, s, f)));
    if ((lines.length * s * lh <= maxH && widest <= maxW) || s <= min) return { lines, size: s };
    s = Math.max(min, s * 0.94);
  }
  return { lines: wrap(text, maxW, s, f), size: s };
}
/** tiêu đề ≤ maxLines dòng, cân dòng, co chữ cho vừa rộng */
function fitTitle(text: string, maxW: number, size: number, f: TF, maxLines = 2, min = 0) {
  const t = (text || '').trim();
  if (!t) return { lines: [] as string[], size };
  if (tw(t, size, f) <= maxW) return { lines: [t], size };
  const words = t.split(/\s+/);
  if (maxLines >= 2 && words.length > 1) {
    let best = { lines: [t], w: Infinity };
    for (let i = 1; i < words.length; i++) {
      const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
      const w = Math.max(tw(a, size, f), tw(b, size, f));
      if (w < best.w) best = { lines: [a, b], w };
    }
    const s = best.w > maxW ? (size * maxW) / best.w : size;
    return { lines: best.lines, size: Math.max(min, s) };
  }
  return { lines: [t], size: fitW(t, maxW, size, f, min) };
}

// ---------- tô màu theo chế độ (thiết kế / ép kim 3D / khuôn ép kim in) ----------
export type GTMode = 'art' | 'foil3d' | 'foilPrint';
interface Ctx { p: GTPalette; mode: GTMode; foil: boolean; uid: string; gid: string; k: number; w: number; h: number; disp: GTFont; occ: Occasion; data: GTData; logo?: string }
/** màu của 1 nét: isGold = phần vàng (được ép kim nếu bật) */
function P(c: Ctx, color: string, isGold = false): string {
  if (c.mode === 'art') return isGold && c.foil ? `url(#${c.gid}-gold)` : color;
  const on = isGold && c.foil;
  return c.mode === 'foil3d' ? (on ? '#FFFFFF' : '#000000') : (on ? '#000000' : '#FFFFFF');
}
/** nền: ở chế độ ép kim luôn là nền trống */
const BGc = (c: Ctx, color: string) => (c.mode === 'art' ? color : c.mode === 'foil3d' ? '#000000' : '#FFFFFF');
/** hoạ tiết mờ: không ép kim (ép kim mảng mờ trông bẩn) */
const faint = (c: Ctx) => c.mode === 'art';

function rng(seed: number) {
  let s = seed % 2147483647; if (s <= 0) s += 2147483646;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}
const f1 = (n: number) => +n.toFixed(2);

// ---------- hoạ tiết vẽ bằng code (đơn vị mm) ----------
const FLOWER = {
  mai: { petal: '#F7C42F', petal2: '#FBDB6A', center: '#D9761A', stamen: '#B4561A', bud: '#E9A81F' },
  dao: { petal: '#F49AB2', petal2: '#FBC9D6', center: '#C2185B', stamen: '#9C1450', bud: '#E46D8F' },
};
function Blossom({ c, x, y, r, fl, rot = 0 }: { c: Ctx; x: number; y: number; r: number; fl: Flower; rot?: number }) {
  const col = FLOWER[fl];
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) rotate(${f1(rot)})`}>
      {[0, 1, 2, 3, 4].map((i) => <ellipse key={i} cx={0} cy={-r * 0.52} rx={r * 0.46} ry={r * 0.56} fill={P(c, i % 2 ? col.petal2 : col.petal)} transform={`rotate(${i * 72})`} />)}
      <circle r={r * 0.3} fill={P(c, col.center)} />
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => { const a = (i / 8) * Math.PI * 2; return <circle key={i} cx={f1(Math.cos(a) * r * 0.42)} cy={f1(Math.sin(a) * r * 0.42)} r={r * 0.07} fill={P(c, col.stamen)} />; })}
    </g>
  );
}
/** cành mai/đào: thân thuôn + nhánh + hoa + nụ (seed cố định) */
function Branch({ c, x, y, len, angle, seed, fl, scale, wood = '#4A2A1A' }: { c: Ctx; x: number; y: number; len: number; angle: number; seed: number; fl: Flower; scale: number; wood?: string }) {
  const r = rng(seed * 97 + 13);
  const out: ReactNode[] = [], blooms: ReactNode[] = [];
  let key = 0;
  const grow = (x0: number, y0: number, L: number, a: number, w0: number, depth: number) => {
    const n = 7; const pts: [number, number][] = [[x0, y0]];
    let cx = x0, cy = y0, ca = a;
    for (let i = 1; i <= n; i++) { ca += (r() - 0.5) * 0.5; cx += Math.cos(ca) * (L / n); cy += Math.sin(ca) * (L / n); pts.push([cx, cy]); }
    const left: string[] = [], right: string[] = [];
    pts.forEach(([px, py], i) => {
      const [qx, qy] = pts[Math.min(i + 1, n)], [ox, oy] = pts[Math.max(i - 1, 0)];
      const dx = qx - ox, dy = qy - oy, dl = Math.hypot(dx, dy) || 1;
      const wd = (w0 * (1 - (i / n) * 0.8)) / 2;
      left.push(`${f1(px - (dy / dl) * wd)},${f1(py + (dx / dl) * wd)}`);
      right.unshift(`${f1(px + (dy / dl) * wd)},${f1(py - (dx / dl) * wd)}`);
    });
    out.push(<polygon key={`b${key++}`} points={[...left, ...right].join(' ')} fill={P(c, wood)} />);
    pts.forEach(([px, py], i) => {
      if (i === 0) return;
      if (depth < 2 && i % 2 === 1 && i < n - 1) grow(px, py, L * (0.42 + r() * 0.15), ca + (r() > 0.5 ? 0.75 : -0.75) + (r() - 0.5) * 0.3, w0 * 0.45, depth + 1);
      if (i >= 2 && r() > 0.3) {
        const off = (r() - 0.5) * w0 * 2.2;
        const bx = px + off, by = py + (r() - 0.5) * w0 * 2;
        if (r() > 0.32) blooms.push(<Blossom key={`f${key++}`} c={c} x={bx} y={by} r={(9 + r() * 6) * scale} fl={fl} rot={r() * 72} />);
        else blooms.push(<circle key={`u${key++}`} cx={f1(bx)} cy={f1(by)} r={(3.2 + r() * 2.2) * scale} fill={P(c, FLOWER[fl].bud)} />);
      }
    });
    const [tx, ty] = pts[n];
    blooms.push(<circle key={`t${key++}`} cx={f1(tx)} cy={f1(ty)} r={3 * scale} fill={P(c, FLOWER[fl].bud)} />);
  };
  grow(x, y, len, angle, 9 * scale, 0);
  return <g>{out}{blooms}</g>;
}
function Lantern({ c, x, y, s, string }: { c: Ctx; x: number; y: number; s: number; string: number }) {
  const body = c.p.light ? '#C8102E' : '#D7261E';
  const rib = c.p.gold;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)})`}>
      <line x1={0} y1={-string} x2={0} y2={-s * 0.62} stroke={P(c, rib, true)} strokeWidth={s * 0.035} />
      <rect x={-s * 0.2} y={-s * 0.68} width={s * 0.4} height={s * 0.13} rx={s * 0.03} fill={P(c, rib, true)} />
      <ellipse cx={0} cy={0} rx={s * 0.5} ry={s * 0.58} fill={P(c, body)} />
      {[-0.3, 0, 0.3].map((q) => <ellipse key={q} cx={0} cy={0} rx={Math.abs(q) * s * 0.9 + s * 0.04} ry={s * 0.57} fill="none" stroke={P(c, rib, true)} strokeWidth={s * 0.028} />)}
      <rect x={-s * 0.2} y={s * 0.55} width={s * 0.4} height={s * 0.13} rx={s * 0.03} fill={P(c, rib, true)} />
      {[-0.1, -0.03, 0.04, 0.11].map((q) => <line key={q} x1={q * s} y1={s * 0.68} x2={q * s * 1.4} y2={s * 1.08} stroke={P(c, rib, true)} strokeWidth={s * 0.028} />)}
    </g>
  );
}
/** dây pháo: dây vàng + ống pháo đỏ so le */
function Firecrackers({ c, x, y, len, s, seed }: { c: Ctx; x: number; y: number; len: number; s: number; seed: number }) {
  const r = rng(seed);
  const n = Math.max(4, Math.floor(len / (s * 1.25)));
  return (
    <g>
      <line x1={x} y1={y} x2={x} y2={y + len} stroke={P(c, c.p.gold, true)} strokeWidth={s * 0.12} />
      {Array.from({ length: n }, (_, i) => {
        const cy = y + s * 0.8 + i * (len - s) / n;
        const side = i % 2 ? 1 : -1;
        const rot = side * (28 + r() * 14);
        return (
          <g key={i} transform={`translate(${f1(x)} ${f1(cy)}) rotate(${f1(rot)})`}>
            <rect x={-s * 0.26} y={0} width={s * 0.52} height={s * 1.15} rx={s * 0.08} fill={P(c, '#D7261E')} />
            <rect x={-s * 0.26} y={0} width={s * 0.52} height={s * 0.16} fill={P(c, c.p.gold, true)} />
            <rect x={-s * 0.26} y={s * 0.99} width={s * 0.52} height={s * 0.16} fill={P(c, c.p.gold, true)} />
          </g>
        );
      })}
      <g transform={`translate(${f1(x)} ${f1(y + len + s * 0.4)})`}>
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1={0} y1={0} x2={(i - 2) * s * 0.18} y2={s * 0.9} stroke={P(c, c.p.gold, true)} strokeWidth={s * 0.08} />)}
      </g>
    </g>
  );
}
function Cloud({ c, x, y, s, gold = true, opacity = 1 }: { c: Ctx; x: number; y: number; s: number; gold?: boolean; opacity?: number }) {
  if (!gold && !faint(c)) return null;
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${f1(s / 100)})`} fill="none" stroke={gold ? P(c, c.p.gold, true) : P(c, c.p.ink)} strokeWidth={4.5} strokeLinecap="round" opacity={opacity}>
      <path d="M-90 20 C-90 -10 -55 -18 -42 0 C-40 -38 10 -44 18 -8 C30 -30 72 -22 70 8 C92 8 98 28 84 36 L-84 36 C-96 34 -98 24 -90 20 Z" />
      <path d="M-42 0 C-30 12 -12 8 -14 -6 C-16 -16 -30 -14 -28 -4" />
      <path d="M18 -8 C26 6 46 4 44 -10" />
    </g>
  );
}
/** hoạ tiết đồng tiền/vảy sóng mờ phủ nền */
function Pattern({ c, id, x, y, w, h, cell, opacity }: { c: Ctx; id: string; x: number; y: number; w: number; h: number; cell: number; opacity: number }) {
  if (!faint(c)) return null;
  const col = c.p.light ? c.p.gold : c.p.gold;
  return (
    <>
      <defs>
        <pattern id={id} width={cell} height={cell} patternUnits="userSpaceOnUse">
          {[[cell / 2, cell / 2], [0, 0], [cell, 0], [0, cell], [cell, cell]].map(([px, py], i) => <circle key={i} cx={px} cy={py} r={cell * 0.36} fill="none" stroke={col} strokeWidth={cell * 0.035} />)}
        </pattern>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} opacity={opacity} />
    </>
  );
}
function Sunburst({ c, cx, cy, r, n = 28 }: { c: Ctx; cx: number; cy: number; r: number; n?: number }) {
  if (!faint(c)) return null;
  const rays: string[] = [];
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = a0 + (Math.PI / n) * 0.9;
    rays.push(`M${f1(cx)} ${f1(cy)} L${f1(cx + Math.cos(a0) * r)} ${f1(cy + Math.sin(a0) * r)} L${f1(cx + Math.cos(a1) * r)} ${f1(cy + Math.sin(a1) * r)} Z`);
  }
  return <path d={rays.join(' ')} fill={c.p.gold} opacity={c.p.light ? 0.16 : 0.12} />;
}
function Burst({ c, x, y, r, gold = true, seed }: { c: Ctx; x: number; y: number; r: number; gold?: boolean; seed: number }) {
  const rr = rng(seed);
  const col = gold ? P(c, c.p.gold, true) : P(c, c.p.ink);
  const n = 18;
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const a = (i / n) * Math.PI * 2 + rr() * 0.1;
        const r0 = r * (0.28 + rr() * 0.1), r1 = r * (0.78 + rr() * 0.22);
        return (
          <g key={i}>
            <line x1={f1(x + Math.cos(a) * r0)} y1={f1(y + Math.sin(a) * r0)} x2={f1(x + Math.cos(a) * r1)} y2={f1(y + Math.sin(a) * r1)} stroke={col} strokeWidth={r * 0.028} strokeLinecap="round" />
            <circle cx={f1(x + Math.cos(a) * (r1 + r * 0.08))} cy={f1(y + Math.sin(a) * (r1 + r * 0.08))} r={r * 0.03} fill={col} />
          </g>
        );
      })}
      <circle cx={x} cy={y} r={r * 0.06} fill={col} />
    </g>
  );
}
/** cành nguyệt quế: lá xếp dọc cung tròn, từ đáy vòng lên (side -1 = nhánh trái, 1 = nhánh phải) */
function Laurel({ c, cx, cy, r, side, from = 255, to = 145, leaf }: { c: Ctx; cx: number; cy: number; r: number; side: 1 | -1; from?: number; to?: number; leaf: number }) {
  const col = P(c, c.p.gold, true);
  // góc toán học (y hướng lên) của nhánh trái; nhánh phải = đối xứng qua trục dọc
  const pt = (deg: number) => { const a = (deg * Math.PI) / 180; return [cx - side * Math.cos(a) * r, cy - Math.sin(a) * r] as const; };
  const n = 12;
  const items: ReactNode[] = [];
  const path: string[] = [];
  for (let i = 0; i <= n; i++) {
    const deg = from + ((to - from) * i) / n;
    const [px, py] = pt(deg);
    path.push(`${i ? 'L' : 'M'}${f1(px)} ${f1(py)}`);
    if (i === 0) continue;
    const [qx, qy] = pt(from + ((to - from) * (i - 1)) / n);
    const dir = (Math.atan2(py - qy, px - qx) * 180) / Math.PI; // hướng mọc
    const s2 = leaf * (0.75 + (0.35 * i) / n);
    for (const off of [-1, 1]) {
      const ang = dir + off * 38;
      const ox = Math.cos((ang * Math.PI) / 180) * s2 * 0.55, oy = Math.sin((ang * Math.PI) / 180) * s2 * 0.55;
      items.push(<ellipse key={`${i}${off}`} cx={f1(px + ox)} cy={f1(py + oy)} rx={f1(s2 * 0.3)} ry={f1(s2 * 0.62)} fill={col} transform={`rotate(${f1(ang + 90)} ${f1(px + ox)} ${f1(py + oy)})`} />);
    }
  }
  const [tx, ty] = pt(to);
  items.push(<circle key="tip" cx={f1(tx)} cy={f1(ty)} r={f1(leaf * 0.22)} fill={col} />);
  return <g><path d={path.join(' ')} fill="none" stroke={col} strokeWidth={f1(leaf * 0.12)} strokeLinecap="round" />{items}</g>;
}
function Star({ c, x, y, r, gold = true, points = 5 }: { c: Ctx; x: number; y: number; r: number; gold?: boolean; points?: number }) {
  const pts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points, rr = i % 2 ? r * 0.42 : r;
    pts.push(`${f1(x + Math.cos(a) * rr)},${f1(y + Math.sin(a) * rr)}`);
  }
  return <polygon points={pts.join(' ')} fill={gold ? P(c, c.p.gold, true) : P(c, c.p.ink)} />;
}
function Snow({ c, w, h, seed, n }: { c: Ctx; w: number; h: number; seed: number; n: number }) {
  if (!faint(c)) return null;
  const r = rng(seed);
  return <g fill={c.p.ink} opacity={0.5}>{Array.from({ length: n }, (_, i) => <circle key={i} cx={f1(r() * w)} cy={f1(r() * h)} r={f1(0.25 + r() * 0.7)} />)}</g>;
}
/** cây thông nét vàng: tầng tam giác + sao + quả châu */
function XmasTree({ c, cx, top, hgt }: { c: Ctx; cx: number; top: number; hgt: number }) {
  const col = P(c, c.p.gold, true);
  const tiers = 4, out: ReactNode[] = [];
  for (let i = 0; i < tiers; i++) {
    const y0 = top + hgt * 0.1 + (i * hgt * 0.72) / tiers, y1 = y0 + hgt * 0.3;
    const half = hgt * (0.12 + i * 0.075);
    out.push(<path key={i} d={`M${f1(cx)} ${f1(y0)} L${f1(cx + half)} ${f1(y1)} L${f1(cx - half)} ${f1(y1)} Z`} fill="none" stroke={col} strokeWidth={hgt * 0.012} strokeLinejoin="round" />);
    out.push(<path key={`g${i}`} d={`M${f1(cx - half * 0.55)} ${f1(y1 - hgt * 0.07)} Q${f1(cx)} ${f1(y1 - hgt * 0.02)} ${f1(cx + half * 0.6)} ${f1(y1 - hgt * 0.1)}`} fill="none" stroke={col} strokeWidth={hgt * 0.006} />);
    out.push(<circle key={`b${i}`} cx={f1(cx + half * (i % 2 ? -0.45 : 0.4))} cy={f1(y1 - hgt * 0.04)} r={hgt * 0.018} fill={P(c, '#D7261E')} />);
  }
  const trunkY = top + hgt * 0.1 + ((tiers - 1) * hgt * 0.72) / tiers + hgt * 0.3;
  out.push(<rect key="t" x={cx - hgt * 0.035} y={trunkY} width={hgt * 0.07} height={hgt * 0.08} fill={col} />);
  return <g>{out}<Star c={c} x={cx} y={top + hgt * 0.06} r={hgt * 0.07} /></g>;
}
/** khung viền đôi + hoạ tiết góc mây */
function OrnateFrame({ c, w, h, m }: { c: Ctx; w: number; h: number; m: number }) {
  const col = P(c, c.p.gold, true);
  const corner = (x: number, y: number, sx: number, sy: number, i: number) => (
    <g key={i} transform={`translate(${f1(x)} ${f1(y)}) scale(${sx} ${sy})`} fill="none" stroke={col} strokeWidth={m * 0.1} strokeLinecap="round">
      <path d={`M0 ${m * 2.6} C0 ${m * 1.1} ${m * 1.1} 0 ${m * 2.6} 0`} />
      <path d={`M${m * 0.7} ${m * 1.7} C${m * 0.9} ${m * 1.1} ${m * 1.2} ${m * 0.8} ${m * 1.7} ${m * 0.7} C${m * 1.45} ${m * 1.05} ${m * 1.4} ${m * 1.4} ${m * 1.7} ${m * 1.5}`} />
      <circle cx={m * 0.55} cy={m * 0.55} r={m * 0.22} fill={col} stroke="none" />
    </g>
  );
  return (
    <g>
      <rect x={m} y={m} width={w - m * 2} height={h - m * 2} fill="none" stroke={col} strokeWidth={m * 0.11} />
      <rect x={m * 1.45} y={m * 1.45} width={w - m * 2.9} height={h - m * 2.9} fill="none" stroke={col} strokeWidth={m * 0.05} />
      {corner(m * 1.45, m * 1.45, 1, 1, 0)}{corner(w - m * 1.45, m * 1.45, -1, 1, 1)}
      {corner(m * 1.45, h - m * 1.45, 1, -1, 2)}{corner(w - m * 1.45, h - m * 1.45, -1, -1, 3)}
    </g>
  );
}
/** vạch trang trí: — ◆ — */
function Divider({ c, cx, y, w, gold = true }: { c: Ctx; cx: number; y: number; w: number; gold?: boolean }) {
  const col = gold ? P(c, c.p.gold, true) : P(c, c.p.pSub);
  const d = w * 0.05;
  return (
    <g>
      <line x1={cx - w / 2} y1={y} x2={cx - d * 1.8} y2={y} stroke={col} strokeWidth={w * 0.012} />
      <line x1={cx + d * 1.8} y1={y} x2={cx + w / 2} y2={y} stroke={col} strokeWidth={w * 0.012} />
      <path d={`M${f1(cx)} ${f1(y - d)} L${f1(cx + d)} ${f1(y)} L${f1(cx)} ${f1(y + d)} L${f1(cx - d)} ${f1(y)} Z`} fill={col} />
    </g>
  );
}
/** logo: ảnh khách hoặc chữ lồng (monogram) vàng trong vòng tròn */
function Logo({ c, cx, cy, size, gold = true }: { c: Ctx; cx: number; cy: number; size: number; gold?: boolean }) {
  if (c.logo) {
    if (c.mode !== 'art') return null; // logo ảnh: in 4 màu, không ép kim → nền khuôn ép để trống
    return <image href={c.logo} x={cx - size / 2} y={cy - size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />;
  }
  const words = (c.data.brand || 'M').trim().split(/\s+/).filter((w) => !/^(công|ty|tnhh|cổ|phần|cty|tập|đoàn|thương|mại|dịch|vụ|sản|xuất|đầu|tư|xây|dựng|việt|nam|tm|dv|&|-|–)$/i.test(w));
  const mono = (words.length >= 2 ? words[0][0] + words[1][0] : (words[0] || 'M').slice(0, 2)).toUpperCase();
  const col = gold ? P(c, c.p.gold, true) : P(c, c.p.accent);
  const f: TF = { fam: c.disp.family, wt: c.disp.weight };
  const fs = fitW(mono, size * 0.62, size * 0.42, f);
  return (
    <g>
      <circle cx={cx} cy={cy} r={size / 2} fill="none" stroke={col} strokeWidth={size * 0.045} />
      <circle cx={cx} cy={cy} r={size * 0.42} fill="none" stroke={col} strokeWidth={size * 0.015} />
      <text x={cx} y={cy + fs * 0.35} textAnchor="middle" fontFamily={`"${c.disp.family}"`} fontWeight={c.disp.weight} fontSize={fs} fill={col}>{mono}</text>
    </g>
  );
}

// ---------- chữ ----------
interface TxtOpts { fam: string; wt: number; it?: boolean; ls?: number; fill: string; anchor?: 'middle' | 'start' | 'end' }
function Lines({ lines, x, y, size, lh, o }: { lines: string[]; x: number; y: number; size: number; lh: number; o: TxtOpts }) {
  return (
    <>
      {lines.map((ln, i) => (
        <text key={i} x={f1(x)} y={f1(y + i * size * lh)} textAnchor={o.anchor || 'middle'} fontFamily={`"${o.fam}"`} fontWeight={o.wt}
          fontStyle={o.it ? 'italic' : undefined} fontSize={f1(size)} letterSpacing={o.ls ? f1(o.ls * size) : undefined} fill={o.fill}>{ln}</text>
      ))}
    </>
  );
}
const scriptFam = (occ: Occasion, text: string) => (occ === 'xmas' || occ === 'thanks' || occ === 'anniv') && /^[\x20-\x7E]*$/.test(text) ? EN_SCRIPT : VN_SCRIPT;

/** khối chữ bìa: [chữ thư pháp] + tiêu đề + ◆ + dòng phụ, căn giữa trong [y0, y1] */
function CoverText({ c, y0, y1, script = true, headCaps = true, gap = 1 }: { c: Ctx; y0: number; y1: number; script?: boolean; headCaps?: boolean; gap?: number }) {
  const { k, w, data, disp, p } = c;
  const cx = w / 2;
  const maxW = w * 0.8;
  const sc = script && data.bigWord?.trim() ? data.bigWord.trim() : '';
  const sFam = scriptFam(c.occ, sc);
  const sF: TF = { fam: sFam, wt: sFam === VN_SCRIPT ? 700 : 400 };
  const sSize = sc ? fitW(sc, maxW, (sFam === EN_SCRIPT ? 17 : 24) * k, sF, 8 * k) : 0;
  const head = headCaps ? (data.headline || '').toUpperCase() : data.headline || '';
  const hF: TF = { fam: disp.family, wt: disp.weight, ls: headCaps ? 0.06 : 0 };
  const ht = fitTitle(head, maxW, (headCaps ? 7.4 : 9) * k, hF, 2, 3.6 * k);
  const subF: TF = { fam: SERIF, wt: 500, it: true };
  const sub = (data.sub || '').trim();
  const subSize = sub ? fitW(sub, maxW, 5.2 * k, subF, 3 * k) : 0;
  const blocks: { h: number; render: (y: number) => ReactNode }[] = [];
  if (sc) blocks.push({ h: sSize * 1.0, render: (y) => <Lines lines={[sc]} x={cx} y={y + sSize * 0.76} size={sSize} lh={1} o={{ fam: sFam, wt: sF.wt, fill: P(c, p.gold, true) }} /> });
  if (ht.lines.length) blocks.push({ h: ht.lines.length * ht.size * 1.18 + ht.size * 0.15, render: (y) => <Lines lines={ht.lines} x={cx} y={y + ht.size * 1.05} size={ht.size} lh={1.18} o={{ fam: disp.family, wt: disp.weight, ls: hF.ls, fill: P(c, p.ink) }} /> });
  blocks.push({ h: 4.2 * k, render: (y) => <Divider c={c} cx={cx} y={y + 2.1 * k} w={26 * k} /> });
  if (sub) blocks.push({ h: subSize * 1.2, render: (y) => <Lines lines={[sub]} x={cx} y={y + subSize * 0.9} size={subSize} lh={1} o={{ fam: SERIF, wt: 500, it: true, fill: P(c, p.gold, true) }} /> });
  const g = 2.2 * k * gap;
  const total = blocks.reduce((s, b) => s + b.h, 0) + g * (blocks.length - 1);
  let y = y0 + Math.max(0, (y1 - y0 - total) / 2);
  return <g>{blocks.map((b, i) => { const node = <g key={i}>{b.render(y)}</g>; y += b.h + g; return node; })}</g>;
}
function BrandFoot({ c, y }: { c: Ctx; y: number }) {
  const { k, w, data, p } = c;
  const t = (data.brand || '').toUpperCase();
  if (!t) return null;
  const f: TF = { fam: BODY, wt: 800, ls: 0.22 };
  const s = fitW(t, w * 0.7, 2.6 * k, f, 1.6 * k);
  return <Lines lines={[t]} x={w / 2} y={y} size={s} lh={1} o={{ fam: BODY, wt: 800, ls: 0.22, fill: P(c, p.gold, true) }} />;
}

// ---------- 4 mặt ----------
export type GTFace = 'cover' | 'back' | 'inLeft' | 'inRight';

function Cover(c: Ctx): ReactNode {
  const { w, h, k, p } = c;
  const fl = p.flower;
  const L = gtLayout(c.data.__layout || '').id;
  switch (L) {
    case 'mai':
      return (
        <>
          <Pattern c={c} id={`${c.uid}-pt`} x={-5} y={-5} w={w + 10} h={h + 10} cell={9 * k} opacity={p.light ? 0.22 : 0.13} />
          <Cloud c={c} x={w * 0.17} y={h * 0.36} s={16 * k} opacity={0.9} />
          <Branch c={c} x={w + 3} y={-1} len={w * 0.84} angle={2.86} seed={7} fl={fl} scale={0.34 * k} wood={p.light ? '#5A3420' : '#3A1F12'} />
          <Branch c={c} x={w + 2} y={h * 0.17} len={w * 0.34} angle={3.08} seed={19} fl={fl} scale={0.28 * k} wood={p.light ? '#5A3420' : '#3A1F12'} />
          <CoverText c={c} y0={h * 0.5} y1={h * 0.9} />
          <BrandFoot c={c} y={h - 6 * k} />
        </>
      );
    case 'dao':
      return (
        <>
          <Pattern c={c} id={`${c.uid}-pt`} x={-5} y={-5} w={w + 10} h={h + 10} cell={9 * k} opacity={p.light ? 0.2 : 0.12} />
          <Branch c={c} x={w + 3} y={h * 0.03} len={w * 0.78} angle={2.8} seed={23} fl={fl} scale={0.34 * k} wood={p.light ? '#5A3420' : '#3A1F12'} />
          <Lantern c={c} x={w * 0.2} y={h * 0.2} s={12 * k} string={h * 0.2 + 4} />
          <Lantern c={c} x={w * 0.36} y={h * 0.12} s={8.5 * k} string={h * 0.12 + 4} />
          <CoverText c={c} y0={h * 0.46} y1={h * 0.88} />
          <BrandFoot c={c} y={h - 7 * k} />
        </>
      );
    case 'lantern':
      return (
        <>
          <Sunburst c={c} cx={w / 2} cy={h * 0.3} r={Math.max(w, h) * 0.7} />
          <Lantern c={c} x={w * 0.5} y={h * 0.24} s={17 * k} string={h * 0.24 + 4} />
          <Lantern c={c} x={w * 0.26} y={h * 0.15} s={11 * k} string={h * 0.15 + 4} />
          <Lantern c={c} x={w * 0.74} y={h * 0.15} s={11 * k} string={h * 0.15 + 4} />
          <Firecrackers c={c} x={w * 0.09} y={-4} len={h * 0.4} s={5.4 * k} seed={5} />
          <Firecrackers c={c} x={w * 0.91} y={-4} len={h * 0.34} s={5.4 * k} seed={11} />
          <CoverText c={c} y0={h * 0.5} y1={h * 0.88} />
          <BrandFoot c={c} y={h - 6 * k} />
        </>
      );
    case 'frame': {
      const m = 5 * k, r = Math.min(w * 0.27, h * 0.2);
      const cy = h * 0.34;
      const sc = (c.data.bigWord || '').trim() || 'Phúc';
      const sF: TF = { fam: VN_SCRIPT, wt: 700 };
      const ss = fitW(sc, r * 1.55, r * 0.95, sF, r * 0.4);
      return (
        <>
          <Pattern c={c} id={`${c.uid}-pt`} x={-5} y={-5} w={w + 10} h={h + 10} cell={10 * k} opacity={p.light ? 0.18 : 0.1} />
          <OrnateFrame c={c} w={w} h={h} m={m} />
          <circle cx={w / 2} cy={cy} r={r} fill="none" stroke={P(c, p.gold, true)} strokeWidth={0.7 * k} />
          <circle cx={w / 2} cy={cy} r={r * 0.88} fill="none" stroke={P(c, p.gold, true)} strokeWidth={0.25 * k} strokeDasharray={`${f1(0.6 * k)} ${f1(0.8 * k)}`} />
          <Cloud c={c} x={w / 2 - r * 1.2} y={cy + r * 0.92} s={r * 0.46} />
          <Cloud c={c} x={w / 2 + r * 1.2} y={cy - r * 0.98} s={r * 0.42} />
          <Lines lines={[sc]} x={w / 2} y={cy + ss * 0.3} size={ss} lh={1} o={{ fam: VN_SCRIPT, wt: 700, fill: P(c, p.gold, true) }} />
          <CoverText c={{ ...c, data: { ...c.data, bigWord: '' } }} y0={cy + r + 4 * k} y1={h - 15 * k} script={false} />
          <BrandFoot c={c} y={h - 9.5 * k} />
        </>
      );
    }
    case 'fireworks': {
      const yr = '2027';
      const f: TF = { fam: c.disp.family, wt: c.disp.weight };
      const ys = fitW(yr, w * 0.74, 34 * k, f);
      const head = (c.data.headline || '').trim();
      const hd = fitTitle(head, w * 0.84, 12 * k, { fam: VN_SCRIPT, wt: 700 }, 2, 3.5 * k);
      const sub = (c.data.sub || '').toUpperCase();
      const subF: TF = { fam: BODY, wt: 600, ls: 0.2 };
      const subs = fitW(sub, w * 0.8, 3 * k, subF, 1.8 * k);
      const base = h * 0.6;
      return (
        <>
          <Burst c={c} x={w * 0.28} y={h * 0.2} r={16 * k} seed={3} />
          <Burst c={c} x={w * 0.72} y={h * 0.13} r={11 * k} seed={9} />
          <Burst c={c} x={w * 0.82} y={h * 0.34} r={8 * k} seed={17} gold={false} />
          <Burst c={c} x={w * 0.14} y={h * 0.42} r={6.5 * k} seed={29} gold={false} />
          <Snow c={c} w={w} h={h * 0.5} seed={41} n={40} />
          <Lines lines={hd.lines} x={w / 2} y={base - ys * 0.78 - (hd.lines.length - 1) * hd.size * 1.05} size={hd.size} lh={1.05} o={{ fam: VN_SCRIPT, wt: 700, fill: P(c, p.ink) }} />
          <Lines lines={[yr]} x={w / 2} y={base + ys * 0.2} size={ys} lh={1} o={{ fam: c.disp.family, wt: c.disp.weight, fill: P(c, p.gold, true) }} />
          <Divider c={c} cx={w / 2} y={base + ys * 0.2 + 5 * k} w={30 * k} />
          <Lines lines={[sub]} x={w / 2} y={base + ys * 0.2 + 12 * k} size={subs} lh={1} o={{ fam: BODY, wt: 600, ls: 0.2, fill: P(c, p.ink) }} />
          <BrandFoot c={c} y={h - 7 * k} />
        </>
      );
    }
    case 'xmas':
      return (
        <>
          <Snow c={c} w={w} h={h} seed={7} n={70} />
          <XmasTree c={c} cx={w / 2} top={h * 0.07} hgt={Math.min(h * 0.46, w * 0.75)} />
          <CoverText c={c} y0={h * 0.55} y1={h * 0.88} />
          <BrandFoot c={c} y={h - 6.5 * k} />
        </>
      );
    case 'thanks': {
      const r = Math.min(w * 0.34, h * 0.24), cy = h * 0.36;
      const sc = (c.data.bigWord || '').trim();
      const sFam = scriptFam('thanks', sc);
      const ss = sc ? fitW(sc, r * 1.6, 15 * k, { fam: sFam, wt: sFam === VN_SCRIPT ? 700 : 400 }, 6 * k) : 0;
      return (
        <>
          <Laurel c={c} cx={w / 2} cy={cy} r={r} side={-1} leaf={3.4 * k} />
          <Laurel c={c} cx={w / 2} cy={cy} r={r} side={1} leaf={3.4 * k} />
          {sc && <Lines lines={[sc]} x={w / 2} y={cy + ss * 0.3} size={ss} lh={1} o={{ fam: sFam, wt: sFam === VN_SCRIPT ? 700 : 400, fill: P(c, p.gold, true) }} />}
          <Star c={c} x={w / 2} y={cy - r - 2 * k} r={2.4 * k} />
          <CoverText c={{ ...c, data: { ...c.data, bigWord: '' } }} y0={cy + r + 2 * k} y1={h * 0.88} script={false} />
          <BrandFoot c={c} y={h - 7 * k} />
        </>
      );
    }
    case 'anniv': {
      const yrs = ((c.data.years || '').trim() || '10').slice(0, 3);
      const f: TF = { fam: c.disp.family, wt: c.disp.weight };
      const cy = h * 0.34;
      const ys = fitW(yrs, w * 0.42, 40 * k, f, 14 * k);
      const r = Math.max(ys * 0.75, 20 * k);
      const ribbonY = cy + ys * 0.42;
      const rw = 30 * k;
      return (
        <>
          <Pattern c={c} id={`${c.uid}-pt`} x={-5} y={-5} w={w + 10} h={h + 10} cell={10 * k} opacity={0.08} />
          <Laurel c={c} cx={w / 2} cy={cy} r={r} side={-1} leaf={3 * k} from={250} to={150} />
          <Laurel c={c} cx={w / 2} cy={cy} r={r} side={1} leaf={3 * k} from={250} to={150} />
          <Lines lines={[yrs]} x={w / 2} y={cy + ys * 0.28} size={ys} lh={1} o={{ fam: c.disp.family, wt: c.disp.weight, fill: P(c, p.gold, true) }} />
          <path d={`M${f1(w / 2 - rw / 2 - 4 * k)} ${f1(ribbonY)} L${f1(w / 2 - rw / 2)} ${f1(ribbonY + 2.6 * k)} L${f1(w / 2 - rw / 2 - 4 * k)} ${f1(ribbonY + 5.2 * k)} L${f1(w / 2 + rw / 2 + 4 * k)} ${f1(ribbonY + 5.2 * k)} L${f1(w / 2 + rw / 2)} ${f1(ribbonY + 2.6 * k)} L${f1(w / 2 + rw / 2 + 4 * k)} ${f1(ribbonY)} Z`} fill={P(c, p.gold, true)} />
          <Lines lines={['NĂM']} x={w / 2} y={ribbonY + 3.75 * k} size={3.1 * k} lh={1} o={{ fam: BODY, wt: 800, ls: 0.3, fill: P(c, p.bg) }} />
          <CoverText c={{ ...c, data: { ...c.data, bigWord: '' } }} y0={ribbonY + 8 * k} y1={h * 0.88} script={false} />
          <BrandFoot c={c} y={h - 7 * k} />
        </>
      );
    }
    default: return null;
  }
}

function InLeft(c: Ctx): ReactNode {
  const { w, h, k, p, occ, data } = c;
  const quote = (data.quote || '').split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const qF: TF = { fam: c.disp.family, wt: c.disp.weight };
  const qMax = Math.max(0, ...quote.map((q) => tw(q, 6 * k, qF)));
  const qs = quote.length ? Math.max(3 * k, qMax > w * 0.78 ? (6 * k * w * 0.78) / qMax : 6 * k) : 0;
  const cy = h * 0.36, r = Math.min(w * 0.26, h * 0.17);
  let motif: ReactNode;
  if (occ === 'tet') {
    const ss = fitW('Phúc', r * 1.5, r * 1.0, { fam: VN_SCRIPT, wt: 700 });
    motif = (
      <>
        <circle cx={w / 2} cy={cy} r={r} fill={P(c, p.light ? p.accent : '#C8102E')} />
        <circle cx={w / 2} cy={cy} r={r * 0.9} fill="none" stroke={p.light && !p.foil ? P(c, '#FFFFFF') : P(c, p.gold, true)} strokeWidth={0.45 * k} />
        <Lines lines={['Phúc']} x={w / 2} y={cy + ss * 0.3} size={ss} lh={1} o={{ fam: VN_SCRIPT, wt: 700, fill: p.light && !p.foil ? P(c, '#FFFFFF') : P(c, p.gold, true) }} />
        <Cloud c={c} x={w * 0.8} y={h * 0.1} s={14 * k} />
        <Cloud c={c} x={w * 0.2} y={h * 0.93} s={14 * k} />
      </>
    );
  } else if (occ === 'xmas') {
    motif = (
      <>
        <Snow c={c} w={w} h={h} seed={13} n={60} />
        <Star c={c} x={w / 2} y={cy} r={r * 0.7} points={8} />
        <circle cx={w / 2} cy={cy} r={r} fill="none" stroke={P(c, p.gold, true)} strokeWidth={0.4 * k} />
      </>
    );
  } else {
    motif = (
      <>
        <Pattern c={c} id={`${c.uid}-pl`} x={-5} y={-5} w={w + 10} h={h + 10} cell={10 * k} opacity={0.08} />
        <Logo c={c} cx={w / 2} cy={cy} size={r * 1.7} />
      </>
    );
  }
  const yQ = cy + r + 10 * k;
  return (
    <>
      <Pattern c={c} id={`${c.uid}-pi`} x={-5} y={-5} w={w + 10} h={h + 10} cell={9 * k} opacity={p.light ? 0.16 : 0.08} />
      {motif}
      <Lines lines={quote} x={w / 2} y={yQ} size={qs} lh={1.35} o={{ fam: c.disp.family, wt: c.disp.weight, fill: P(c, p.ink) }} />
      <Divider c={c} cx={w / 2} y={yQ + quote.length * qs * 1.35 + 1 * k} w={24 * k} />
      {occ === 'tet' && TET_2027 && (
        <Lines lines={[TET_2027]} x={w / 2} y={yQ + quote.length * qs * 1.35 + 8 * k} size={fitW(TET_2027, w * 0.8, 3.1 * k, { fam: SERIF, wt: 500, it: true }, 2 * k)} lh={1}
          o={{ fam: SERIF, wt: 500, it: true, fill: P(c, p.gold, true) }} />
      )}
    </>
  );
}

function InRight(c: Ctx, rcp: Recipient, flat: boolean): ReactNode {
  const { w, h, k, p, data } = c;
  const cx = w / 2;
  const maxW = w * 0.78;
  let y = 13 * k;
  const nodes: ReactNode[] = [];
  nodes.push(<Divider key="d0" c={c} cx={cx} y={y} w={22 * k} />);
  y += 8 * k;
  // Kính gửi
  const kgF: TF = { fam: SERIF, wt: 500, it: true };
  const kg = 'Kính gửi';
  nodes.push(<Lines key="kg" lines={[kg]} x={cx} y={y} size={3.6 * k} lh={1} o={{ fam: SERIF, wt: 500, it: true, fill: P(c, p.pSub) }} />);
  y += 6.6 * k;
  const nF: TF = { fam: SERIF, wt: 700 };
  const nm = fitTitle(rcp.name, maxW, 6.2 * k, nF, 2, 3.4 * k);
  nodes.push(<Lines key="nm" lines={nm.lines} x={cx} y={y} size={nm.size} lh={1.12} o={{ fam: SERIF, wt: 700, fill: P(c, p.pInk) }} />);
  y += (nm.lines.length - 1) * nm.size * 1.12;
  if (rcp.org) {
    const oF: TF = { fam: BODY, wt: 600, ls: 0.04 };
    const os = fitW(rcp.org, maxW, 2.7 * k, oF, 1.7 * k);
    y += 5 * k;
    nodes.push(<Lines key="org" lines={[rcp.org]} x={cx} y={y} size={os} lh={1} o={{ fam: BODY, wt: 600, ls: 0.04, fill: P(c, p.pSub) }} />);
  }
  y += 6 * k;
  // chữ ký (neo từ dưới lên)
  const foot = flat ? 16 * k : 9 * k;
  const brandT = (data.brand || '').toUpperCase();
  const bF: TF = { fam: BODY, wt: 800, ls: 0.16 };
  const bs = brandT ? fitW(brandT, maxW, 2.7 * k, bF, 1.6 * k) : 0;
  const roleT = (data.role || '').toUpperCase();
  const rF: TF = { fam: BODY, wt: 600, ls: 0.12 };
  const rs = roleT ? fitW(roleT, maxW, 2.2 * k, rF, 1.5 * k) : 0;
  const sig = (data.signer || '').trim();
  const sF: TF = { fam: VN_SCRIPT, wt: 700 };
  const ss = sig ? fitW(sig, maxW, 8 * k, sF, 4 * k) : 0;
  let yb = h - foot;
  const bottom: ReactNode[] = [];
  if (brandT) { bottom.push(<Lines key="br" lines={[brandT]} x={cx} y={yb} size={bs} lh={1} o={{ fam: BODY, wt: 800, ls: 0.16, fill: P(c, p.accent) }} />); yb -= bs + 2 * k; }
  if (roleT) { bottom.push(<Lines key="rl" lines={[roleT]} x={cx} y={yb} size={rs} lh={1} o={{ fam: BODY, wt: 600, ls: 0.12, fill: P(c, p.pSub) }} />); yb -= rs + 1.6 * k; }
  if (sig) { bottom.push(<Lines key="sg" lines={[sig]} x={cx} y={yb} size={ss} lh={1} o={{ fam: VN_SCRIPT, wt: 700, fill: P(c, p.gold, p.foil) }} />); yb -= ss * 0.95 + 1 * k; }
  bottom.push(<Lines key="tt" lines={['Trân trọng,']} x={cx} y={yb} size={3.4 * k} lh={1} o={{ fam: SERIF, wt: 500, it: true, fill: P(c, p.pSub) }} />);
  yb -= 3.4 * k + 5 * k;
  // thân lời chúc: co chữ cho vừa khoảng giữa
  const body = (data.greeting || '').replace(/\{brand\}/g, (data.brand || '').trim() || 'chúng tôi').replace(/\{years\}/g, (data.years || '').trim() || '10');
  const bodyF: TF = { fam: SERIF, wt: 600 };
  const bh = Math.max(10 * k, yb - y);
  const fb = fitBlock(body, maxW, bh, 4.6 * k, 2.6 * k, bodyF, 1.42);
  const blockH = fb.lines.length * fb.size * 1.42;
  const by = y + Math.max(0, (bh - blockH) / 2) + fb.size * 0.95;
  nodes.push(<Lines key="body" lines={fb.lines} x={cx} y={by} size={fb.size} lh={1.42} o={{ fam: SERIF, wt: 600, fill: P(c, p.pInk) }} />);
  if (flat) {
    const contact = [data.phone, data.website].filter(Boolean).join('  ·  ');
    const cF: TF = { fam: BODY, wt: 600 };
    if (contact) nodes.push(<Lines key="ct" lines={[contact]} x={cx} y={h - 6 * k} size={fitW(contact, maxW, 2.3 * k, cF, 1.5 * k)} lh={1} o={{ fam: BODY, wt: 600, fill: P(c, p.pSub) }} />);
  }
  return (
    <>
      {nodes}
      {bottom}
      {faint(c) && <rect x={4 * k} y={4 * k} width={w - 8 * k} height={h - 8 * k} fill="none" stroke={p.gold} strokeWidth={0.25 * k} opacity={0.5} />}
    </>
  );
}

function Back(c: Ctx): ReactNode {
  const { w, h, k, p, data } = c;
  const cx = w / 2, cy = h * 0.6;
  const size = 17 * k;
  const brandT = (data.brand || '').toUpperCase();
  const bF: TF = { fam: c.disp.family, wt: c.disp.weight, ls: 0.12 };
  const bs = brandT ? fitW(brandT, w * 0.75, 4.6 * k, bF, 2.2 * k) : 0;
  const slogan = (data.slogan || '').trim();
  const sF: TF = { fam: SERIF, wt: 500, it: true };
  const sls = slogan ? fitW(slogan, w * 0.75, 3.4 * k, sF, 2 * k) : 0;
  const contact = [data.phone, data.website].filter(Boolean).join('  ·  ');
  const cF: TF = { fam: BODY, wt: 600 };
  const addr = (data.address || '').trim();
  return (
    <>
      <Pattern c={c} id={`${c.uid}-pb`} x={-5} y={-5} w={w + 10} h={h + 10} cell={9 * k} opacity={p.light ? 0.14 : 0.07} />
      <Logo c={c} cx={cx} cy={cy - size * 0.6} size={size} />
      {brandT && <Lines lines={[brandT]} x={cx} y={cy + size * 0.2 + bs} size={bs} lh={1} o={{ fam: c.disp.family, wt: c.disp.weight, ls: 0.12, fill: P(c, p.ink) }} />}
      {slogan && <Lines lines={[slogan]} x={cx} y={cy + size * 0.2 + bs + 5 * k} size={sls} lh={1} o={{ fam: SERIF, wt: 500, it: true, fill: P(c, p.gold, true) }} />}
      <Divider c={c} cx={cx} y={h - 17 * k} w={20 * k} />
      {contact && <Lines lines={[contact]} x={cx} y={h - 11 * k} size={fitW(contact, w * 0.8, 2.4 * k, cF, 1.5 * k)} lh={1} o={{ fam: BODY, wt: 600, fill: P(c, p.ink) }} />}
      {addr && <Lines lines={[addr]} x={cx} y={h - 7 * k} size={fitW(addr, w * 0.84, 2.2 * k, cF, 1.4 * k)} lh={1} o={{ fam: BODY, wt: 600, fill: P(c, p.ink) }} />}
    </>
  );
}

function faceBg(c: Ctx, face: GTFace) { return face === 'inRight' ? c.p.paper : face === 'back' ? c.p.bg2 : c.p.bg; }

interface PanelProps { spec: GTSpec; data: GTData; face: GTFace; recipient?: Recipient; mode?: GTMode; logo?: string; flat?: boolean }
function makeCtx(uid: string, spec: GTSpec, data: GTData, mode: GTMode, logo?: string): Ctx {
  const sz = gtSize(spec.size);
  const p = gtPalette(spec.palette);
  return {
    p, mode, foil: gtHasFoil(spec), uid, gid: uid, k: Math.min(sz.w / 100, sz.h / 140), w: sz.w, h: sz.h,
    disp: gtFont(spec.font), occ: occOf(spec.layout), data: { ...data, __layout: spec.layout }, logo,
  };
}
function panel(c: Ctx, face: GTFace, recipient: Recipient, flat: boolean): ReactNode {
  if (face === 'cover') return Cover(c);
  if (face === 'back') return Back(c);
  if (face === 'inLeft') return InLeft(c);
  return InRight(c, recipient, flat);
}
function Defs({ c }: { c: Ctx }) {
  if (c.mode !== 'art' || !c.foil) return null;
  return (
    <defs>
      <linearGradient id={`${c.gid}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F6E3A1" /><stop offset="0.35" stopColor={c.p.gold} /><stop offset="0.62" stopColor="#B88A2E" /><stop offset="1" stopColor="#EED489" />
      </linearGradient>
    </defs>
  );
}

/** 1 mặt thiệp (đúng khổ thành phẩm, không lề xén) — dùng làm texture 3D + ảnh mẫu */
export function GreetingFace({ spec, data, face, recipient, mode = 'art', logo, flat = false, style }: PanelProps & { style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = makeCtx(uid, spec, data, mode, logo);
  return (
    <svg viewBox={`0 0 ${c.w} ${c.h}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      <Defs c={c} />
      <defs><clipPath id={`${uid}-clip`}><rect x={0} y={0} width={c.w} height={c.h} /></clipPath></defs>
      <rect x={0} y={0} width={c.w} height={c.h} fill={BGc(c, faceBg(c, face))} />
      <g clipPath={`url(#${uid}-clip)`}>{panel(c, face, recipient || GENERIC_RECIPIENT, flat)}</g>
    </svg>
  );
}

export type GTSheet = 'outside' | 'inside' | 'front' | 'back';
/** tờ in: gấp đôi → 'outside' [mặt sau | bìa], 'inside' [trong trái | trong phải]; phẳng → 'front' (bìa), 'back' (lời chúc).
 *  bleed = lề xén ra 4 cạnh ngoài; mỗi nửa cắt riêng (clip) để hình không lấn qua nếp gấp. */
export function GreetingSheet({ spec, data, sheet, recipient, mode = 'art', logo, bleed = false, style }: {
  spec: GTSpec; data: GTData; sheet: GTSheet; recipient?: Recipient; mode?: GTMode; logo?: string; bleed?: boolean; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = makeCtx(uid, spec, data, mode, logo);
  const b = bleed ? GT_BLEED_MM : 0;
  const rcp = recipient || GENERIC_RECIPIENT;
  const halves: GTFace[] = sheet === 'outside' ? ['back', 'cover'] : sheet === 'inside' ? ['inLeft', 'inRight'] : sheet === 'front' ? ['cover'] : ['inRight'];
  const W = c.w * halves.length;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${c.h + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet={sheet}>
      <Defs c={c} />
      <defs>
        {halves.map((_, i) => (
          <clipPath key={i} id={`${uid}-c${i}`}>
            <rect x={i * c.w - (i === 0 ? b : 0)} y={-b} width={c.w + (i === 0 ? b : 0) + (i === halves.length - 1 ? b : 0)} height={c.h + b * 2} />
          </clipPath>
        ))}
      </defs>
      {halves.map((face, i) => (
        <g key={face} clipPath={`url(#${uid}-c${i})`}>
          <rect x={i * c.w - b} y={-b} width={c.w + b * 2} height={c.h + b * 2} fill={BGc(c, faceBg(c, face))} />
          <g transform={`translate(${i * c.w} 0)`}>{panel({ ...c, uid: `${uid}${i}` }, face, rcp, halves.length === 1)}</g>
        </g>
      ))}
    </svg>
  );
}
