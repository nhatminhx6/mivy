'use client';
// Sơ đồ chỗ ngồi tiệc (cưới / thôi nôi / tất niên): dán danh sách khách → 1 bảng sơ đồ khổ lớn (A2, 60×90, 50×70)
// tự chia lưới thẻ bàn + co chữ cho vừa (5–40 bàn), thẻ tên khách gấp đôi 9×5cm (mỗi khách 1 thẻ, xếp 6 thẻ/tờ A4),
// và thẻ số bàn 10×15cm. Đơn vị SVG = mm. Hoạ tiết (hoa lá, nguyệt quế, vòm, khung song hỷ, art-deco, bóng bay) vẽ bằng code.
// Ép kim: 3 chế độ vẽ cùng 1 code — art (xem trước, nhũ vàng gradient), foil3d (trắng = nhũ, cho 3D), foilPrint (đen = khuôn ép).

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

// ---------- khổ ----------
export interface SCSize { id: string; name: string; wMm: number; hMm: number }
export const SC_SIZES: SCSize[] = [
  { id: 'a2', name: 'A2 · 42×59,4 cm', wMm: 420, hMm: 594 },
  { id: '50x70', name: '50×70 cm', wMm: 500, hMm: 700 },
  { id: '60x90', name: '60×90 cm', wMm: 600, hMm: 900 },
];
export const scSize = (id: string) => SC_SIZES.find((s) => s.id === id) || SC_SIZES[0];
export const SC_BLEED_MM = 3;
export const PLACE = { w: 90, h: 50 } as const;       // 1 mặt thẻ tên (gấp đôi → trải phẳng 90×100)
export const NUMBER = { w: 100, h: 150 } as const;    // thẻ số bàn
export const SHEET = { w: 210, h: 297, cols: 2, rows: 3, gap: 4 } as const; // A4, thẻ xoay 90° → 6 thẻ/tờ

// ---------- font ----------
export const SC_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Great+Vibes&family=Dancing+Script:wght@700&family=Playfair+Display:wght@800&family=Prata&family=Montserrat:wght@800&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Be+Vietnam+Pro:wght@600;800&display=swap');`;
interface FontRef { fam: string; wt: number; italic?: boolean }
export interface SCFontSet { id: string; name: string; script: FontRef; head: FontRef; body: FontRef }
export const SC_FONTS: SCFontSet[] = [
  { id: 'classic', name: 'Cổ điển', script: { fam: 'Great Vibes', wt: 400 }, head: { fam: 'Playfair Display', wt: 800 }, body: { fam: 'Cormorant Garamond', wt: 600 } },
  { id: 'garamond', name: 'Thanh lịch', script: { fam: 'Great Vibes', wt: 400 }, head: { fam: 'Cormorant Garamond', wt: 700 }, body: { fam: 'Cormorant Garamond', wt: 600 } },
  { id: 'soft', name: 'Mềm mại', script: { fam: 'Dancing Script', wt: 700 }, head: { fam: 'Prata', wt: 400 }, body: { fam: 'Be Vietnam Pro', wt: 600 } },
  { id: 'modern', name: 'Hiện đại', script: { fam: 'Great Vibes', wt: 400 }, head: { fam: 'Montserrat', wt: 800 }, body: { fam: 'Be Vietnam Pro', wt: 600 } },
];
export const scFont = (id: string) => SC_FONTS.find((f) => f.id === id) || SC_FONTS[0];
const NOTE: FontRef = { fam: 'Cormorant Garamond', wt: 500, italic: true };

export function useSCFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-sc-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-sc-fonts'; link.rel = 'stylesheet';
        link.href = SC_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const refs = [...SC_FONTS.flatMap((f) => [f.script, f.head, f.body]), NOTE];
    const probe = Array.from(new Set(refs.map((r) => `${r.italic ? 'italic ' : ''}${r.wt} 40px "${r.fam}"`)));
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123'))))
      .catch(() => null)
      .then(() => { widthCache.clear(); if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- đo chữ thật (đo ở 100px rồi nhân tỉ lệ, có cache) ----------
const widthCache = new Map<string, number>();
let mctx: CanvasRenderingContext2D | null = null;
export function textW(t: string, size: number, f: FontRef, ls = 0): number {
  const s = t || '';
  const key = `${f.italic ? 'i' : ''}${f.wt}|${f.fam}|${s}`;
  let w100 = widthCache.get(key);
  if (w100 === undefined) {
    if (typeof document === 'undefined') w100 = s.length * 55;
    else {
      mctx ??= document.createElement('canvas').getContext('2d');
      if (!mctx) w100 = s.length * 55;
      else { mctx.font = `${f.italic ? 'italic ' : ''}${f.wt} 100px "${f.fam}"`; w100 = mctx.measureText(s).width; }
    }
    widthCache.set(key, w100);
  }
  return (w100 * size) / 100 + ls * Math.max(0, s.length - 1);
}
const fitTo = (t: string, maxW: number, size: number, f: FontRef, ls = 0) => {
  const w = textW(t, size, f, ls);
  return w > maxW ? (size * maxW) / w : size;
};
const famAttr = (f: FontRef) => `'${f.fam}'`;
const fprops = (f: FontRef) => ({ fontFamily: famAttr(f), fontWeight: f.wt, fontStyle: f.italic ? 'italic' : undefined });

// ---------- bảng màu ----------
export interface SCPalette {
  id: string; name: string; paper: string; ink: string; sub: string; accent: string; accent2: string; leaf: string;
  card: string; cardInk: string; cardSub: string; dark?: boolean; gold?: boolean;
}
export const SC_PALETTES: SCPalette[] = [
  { id: 'ivory', name: 'Ngà · vàng kim', paper: '#FBF7EE', ink: '#3B3226', sub: '#7A6A55', accent: '#B08D57', accent2: '#EAD9BC', leaf: '#8FA27E', card: '#FFFDF8', cardInk: '#3B3226', cardSub: '#8C7A62', gold: true },
  { id: 'sage', name: 'Xanh sage', paper: '#F2F5EE', ink: '#2F3A2E', sub: '#64705E', accent: '#6E8A64', accent2: '#DCE6D2', leaf: '#7E9A72', card: '#FFFFFF', cardInk: '#2F3A2E', cardSub: '#74806C' },
  { id: 'blush', name: 'Hồng phấn', paper: '#FBF1EE', ink: '#4A2E2C', sub: '#8E6460', accent: '#C08079', accent2: '#F3D6D0', leaf: '#9DB08F', card: '#FFFFFF', cardInk: '#4A2E2C', cardSub: '#9A726D' },
  { id: 'red', name: 'Đỏ son · vàng', paper: '#8C1C1F', ink: '#FCEBC4', sub: '#F2D59A', accent: '#E3BC6A', accent2: '#A9302F', leaf: '#E3BC6A', card: '#FFF8EA', cardInk: '#5A1413', cardSub: '#9C5B3A', dark: true, gold: true },
  { id: 'navy', name: 'Navy · vàng', paper: '#17223B', ink: '#F3E7C9', sub: '#CDBF9A', accent: '#C9A45C', accent2: '#2A3858', leaf: '#C9A45C', card: '#FFFDF7', cardInk: '#17223B', cardSub: '#6B6A70', dark: true, gold: true },
  { id: 'babyblue', name: 'Xanh em bé', paper: '#EEF5FB', ink: '#24425F', sub: '#5C7A96', accent: '#6E9FCC', accent2: '#FCE3A7', leaf: '#9CC5A8', card: '#FFFFFF', cardInk: '#24425F', cardSub: '#6F87A0' },
  { id: 'babypink', name: 'Hồng em bé', paper: '#FCEFF3', ink: '#5A2A3D', sub: '#94627A', accent: '#DE8FAB', accent2: '#FFE3A1', leaf: '#A9C9A4', card: '#FFFFFF', cardInk: '#5A2A3D', cardSub: '#9C7084' },
  { id: 'blackgold', name: 'Đen · vàng', paper: '#121212', ink: '#F2E4BF', sub: '#C9B98E', accent: '#D4AF37', accent2: '#2A2620', leaf: '#D4AF37', card: '#1C1A17', cardInk: '#F2E4BF', cardSub: '#B8A982', dark: true, gold: true },
];
export const scPalette = (id: string) => SC_PALETTES.find((p) => p.id === id) || SC_PALETTES[0];

// ---------- bố cục + mẫu ----------
export type SCKind = 'wedding' | 'baby' | 'yep';
export const SC_KINDS: { id: SCKind; name: string }[] = [
  { id: 'wedding', name: 'Tiệc cưới' }, { id: 'baby', name: 'Thôi nôi · đầy tháng' }, { id: 'yep', name: 'Tất niên · sự kiện' },
];
export const SC_LAYOUTS = [
  { id: 'garden', name: 'Hoa lá' }, { id: 'laurel', name: 'Nguyệt quế' }, { id: 'arch', name: 'Vòm' },
  { id: 'redgold', name: 'Khung song hỷ' }, { id: 'minimal', name: 'Tối giản' }, { id: 'baby', name: 'Bóng bay' }, { id: 'deco', name: 'Art-deco' },
] as const;
export type SCLayout = (typeof SC_LAYOUTS)[number]['id'];

export interface SCSpec { kind: SCKind; layout: SCLayout; palette: string; font: string; size: string; foil: boolean; sortBy: 'given' | 'full' }
export interface SCTemplate { id: string; name: string; spec: Pick<SCSpec, 'kind' | 'layout' | 'palette' | 'font'> }
export const SC_TEMPLATES: SCTemplate[] = [
  { id: 'garden-ivory', name: 'Hoa lá · ngà vàng', spec: { kind: 'wedding', layout: 'garden', palette: 'ivory', font: 'classic' } },
  { id: 'laurel-sage', name: 'Nguyệt quế · sage', spec: { kind: 'wedding', layout: 'laurel', palette: 'sage', font: 'garamond' } },
  { id: 'arch-blush', name: 'Vòm · hồng phấn', spec: { kind: 'wedding', layout: 'arch', palette: 'blush', font: 'soft' } },
  { id: 'redgold', name: 'Song hỷ · đỏ son', spec: { kind: 'wedding', layout: 'redgold', palette: 'red', font: 'classic' } },
  { id: 'minimal-navy', name: 'Tối giản · navy', spec: { kind: 'wedding', layout: 'minimal', palette: 'navy', font: 'modern' } },
  { id: 'garden-blush', name: 'Hoa lá · hồng', spec: { kind: 'wedding', layout: 'garden', palette: 'blush', font: 'garamond' } },
  { id: 'baby-blue', name: 'Thôi nôi · bé trai', spec: { kind: 'baby', layout: 'baby', palette: 'babyblue', font: 'soft' } },
  { id: 'baby-pink', name: 'Thôi nôi · bé gái', spec: { kind: 'baby', layout: 'baby', palette: 'babypink', font: 'soft' } },
  { id: 'deco-black', name: 'Tất niên · đen vàng', spec: { kind: 'yep', layout: 'deco', palette: 'blackgold', font: 'modern' } },
  { id: 'deco-navy', name: 'Tất niên · navy', spec: { kind: 'yep', layout: 'deco', palette: 'navy', font: 'classic' } },
];

// ---------- nội dung ----------
export type SCData = Record<string, string>;
export interface SCField { key: string; label: string; ph?: string; half?: boolean }
export const SC_FIELDS: SCField[] = [
  { key: 'title', label: 'Dòng tiêu đề', ph: 'MỜI QUÝ KHÁCH TÌM CHỖ NGỒI', half: true },
  { key: 'names', label: 'Tên cô dâu chú rể / bé / sự kiện', ph: 'Quốc Bảo & Thu Hà', half: true },
  { key: 'date', label: 'Ngày', ph: 'Chủ nhật · 20.12.2026', half: true },
  { key: 'venue', label: 'Địa điểm', ph: 'Trung tâm tiệc cưới An Khang', half: true },
  { key: 'footer', label: 'Lời cảm ơn cuối bảng', ph: 'Cảm ơn quý khách đã đến chung vui' },
  { key: 'tableWord', label: 'Chữ “Bàn”', ph: 'Bàn', half: true },
];

const FAM = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý'];
const MID_M = ['Văn', 'Hữu', 'Quốc', 'Đức', 'Gia', 'Thanh', 'Hoài', 'Công', 'Bảo'];
const MID_F = ['Thị', 'Ngọc', 'Thu', 'Kim', 'Phương', 'Thanh', 'Mai', 'Bích', 'Hồng'];
const GIV_M = ['An', 'Bình', 'Hải', 'Hiếu', 'Hùng', 'Khánh', 'Khoa', 'Long', 'Nam', 'Phúc', 'Quân', 'Sơn', 'Thắng', 'Thịnh', 'Tú', 'Tùng', 'Duy', 'Đạt', 'Hưng', 'Lộc', 'Toàn', 'Trung', 'Vinh', 'Kiên'];
const GIV_F = ['Châu', 'Dung', 'Giang', 'Hà', 'Hạnh', 'Hoa', 'Hương', 'Lan', 'Linh', 'My', 'Ngân', 'Nhi', 'Quyên', 'Tâm', 'Thảo', 'Thuỷ', 'Trang', 'Trinh', 'Uyên', 'Vân', 'Vy', 'Yến', 'Trúc', 'Diệp'];
const NOTES: Record<SCKind, string[]> = {
  wedding: ['Họ hàng nhà trai', 'Họ hàng nhà gái', 'Bạn chú rể', 'Bạn cô dâu', 'Đồng nghiệp nhà trai', 'Đồng nghiệp nhà gái', 'Bạn đại học', 'Hàng xóm', 'Bạn thân', 'Gia đình'],
  baby: ['Ông bà nội', 'Ông bà ngoại', 'Cô dì chú bác', 'Bạn của bố', 'Bạn của mẹ', 'Hàng xóm', 'Đồng nghiệp'],
  yep: ['Ban giám đốc', 'Phòng Kinh doanh', 'Phòng Marketing', 'Phòng Kỹ thuật', 'Phòng Kế toán', 'Phòng Nhân sự', 'Khách mời đối tác', 'Kho vận', 'Chăm sóc khách hàng'],
};
/** danh sách khách mẫu (dạng "## Bàn i – ghi chú" + tên), tên không trùng */
export function sampleGuests(kind: SCKind, tables: number, perTable?: number): string {
  let s = 7 + tables * 31 + (perTable || 0);
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const used = new Set<string>();
  const name = () => {
    for (let k = 0; k < 50; k++) {
      const f = r() < 0.5;
      const n = `${pick(FAM)} ${pick(f ? MID_F : MID_M)} ${pick(f ? GIV_F : GIV_M)}`;
      if (!used.has(n)) { used.add(n); return n; }
    }
    return `${pick(FAM)} ${pick(MID_M)} ${pick(GIV_M)} ${used.size}`;
  };
  const out: string[] = [];
  for (let t = 1; t <= tables; t++) {
    out.push(`## Bàn ${t} – ${NOTES[kind][(t - 1) % NOTES[kind].length]}`);
    const n = perTable ?? 6 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) out.push(name());
  }
  return out.join('\n');
}
const KIND_DATA: Record<SCKind, SCData> = {
  wedding: { title: 'MỜI QUÝ KHÁCH TÌM CHỖ NGỒI', names: 'Quốc Bảo & Thu Hà', date: 'Chủ nhật · 20.12.2026', venue: 'Trung tâm tiệc cưới An Khang · Sảnh Hoa Hồng', footer: 'Cảm ơn quý khách đã đến chung vui cùng gia đình', tableWord: 'Bàn' },
  baby: { title: 'MỜI CẢ NHÀ TÌM CHỖ NGỒI', names: 'Bé Gia Khánh', date: 'Thôi nôi · Thứ bảy 16.01.2027', venue: 'Nhà hàng An Khang · Lầu 2', footer: 'Cảm ơn ông bà, cô chú đã đến mừng bé tròn 1 tuổi', tableWord: 'Bàn' },
  yep: { title: 'SƠ ĐỒ CHỖ NGỒI', names: 'Year End Party 2026', date: 'Công ty An Khang · Thứ sáu 22.01.2027', venue: 'Khách sạn An Khang · Ballroom', footer: 'Cảm ơn mọi người đã đồng hành cùng An Khang', tableWord: 'Bàn' },
};
export const defaultSCData = (kind: SCKind = 'wedding'): SCData => ({ ...KIND_DATA[kind], guests: sampleGuests(kind, 12) });

// ---------- đọc danh sách khách ----------
export interface SCTable { key: string; num: number | null; label: string; note: string; guests: string[] }
const SEP = /\s*[–—:|]\s*|\s+-\s+/;
function tableKey(raw: string): { key: string; num: number | null; label: string } {
  const t = raw.trim().replace(/^(bàn|ban|table|bàn số)\s*/i, '').trim();
  const m = /^(\d{1,3})\b/.exec(t);
  if (m) return { key: `#${Number(m[1])}`, num: Number(m[1]), label: String(Number(m[1])) };
  const lab = (t || raw.trim()).toUpperCase();
  return { key: `@${lab}`, num: null, label: lab };
}
const givenName = (n: string) => n.trim().split(/\s+/).pop() || n;
export function parseGuests(text: string, sortBy: SCSpec['sortBy'] = 'given'): SCTable[] {
  const map = new Map<string, SCTable>();
  const get = (raw: string, note = '') => {
    const k = tableKey(raw);
    let tb = map.get(k.key);
    if (!tb) { tb = { key: k.key, num: k.num, label: k.label, note: '', guests: [] }; map.set(k.key, tb); }
    if (note && !tb.note) tb.note = note;
    return tb;
  };
  let cur: SCTable | null = null;
  for (const line0 of (text || '').split('\n')) {
    const line = line0.replace(/\s+/g, ' ').trim();
    if (!line) continue;
    if (line.startsWith('#')) {
      const body = line.replace(/^#+\s*/, '');
      const [lab, ...rest] = body.split(SEP);
      cur = get(lab, rest.join(' – ').trim());
      continue;
    }
    if (line.includes('|')) {
      const [nm, tb] = line.split('|').map((x) => x.trim());
      if (nm && tb) { get(tb).guests.push(nm); continue; }
      if (nm) { (cur || get('?')).guests.push(nm); continue; }
    }
    (cur || get('Chưa xếp')).guests.push(line);
  }
  const coll = (a: string, b: string) => a.localeCompare(b, 'vi', { sensitivity: 'base' });
  const tables = Array.from(map.values()).filter((t) => t.guests.length);
  for (const t of tables) {
    t.guests.sort((a, b) => (sortBy === 'given' ? coll(givenName(a), givenName(b)) || coll(a, b) : coll(a, b)));
  }
  tables.sort((a, b) => (a.num !== null && b.num !== null ? a.num - b.num : a.num !== null ? -1 : b.num !== null ? 1 : coll(a.label, b.label)));
  return tables;
}
export const guestCount = (tables: SCTable[]) => tables.reduce((s, t) => s + t.guests.length, 0);
export interface SCGuest { name: string; table: SCTable }
export const allGuests = (tables: SCTable[]): SCGuest[] => tables.flatMap((t) => t.guests.map((name) => ({ name, table: t })));
export const tableTitle = (data: SCData, t: SCTable) => `${(data.tableWord || 'Bàn').toUpperCase()} ${t.label}`;

// ---------- chế độ vẽ (ép kim) ----------
export type FoilMode = 'art' | 'foil3d' | 'foilPrint';
interface Ctx { p: SCPalette; f: SCFontSet; fm: FoilMode; useFoil: boolean; gid: string }
/** màu cho phần “vàng” (có thể ép kim) */
const goldPaint = (c: Ctx, fallback: string) => (c.fm === 'foil3d' ? '#FFFFFF' : c.fm === 'foilPrint' ? '#000000' : c.useFoil ? `url(#${c.gid}-gold)` : fallback);
/** phần không ép kim: ẩn trong chế độ khuôn ép */
const Art = ({ c, children }: { c: Ctx; children: ReactNode }) => (c.fm === 'art' ? <>{children}</> : null);
/** phần chỉ ép kim khi bật — nếu không bật ép kim thì ở chế độ khuôn cũng ẩn */
const Gold = ({ c, children }: { c: Ctx; children: ReactNode }) => (c.fm === 'art' || c.useFoil ? <>{children}</> : null);
const GoldDefs = ({ c }: { c: Ctx }) => (c.fm === 'art' && c.useFoil ? (
  <defs>
    <linearGradient id={`${c.gid}-gold`} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#9A7533" /><stop offset="0.35" stopColor="#F3DC9A" /><stop offset="0.55" stopColor="#C29A4E" /><stop offset="1" stopColor="#F0D48A" />
    </linearGradient>
  </defs>
) : null);
const useGid = () => useId().replace(/[^a-zA-Z0-9]/g, '');
const mkCtx = (spec: SCSpec, fm: FoilMode, gid: string): Ctx => {
  const p = scPalette(spec.palette);
  return { p, f: scFont(spec.font), fm, useFoil: !!(spec.foil && p.gold), gid };
};
export const foilAllowed = (spec: Pick<SCSpec, 'palette'>) => !!scPalette(spec.palette).gold;

// ---------- hoạ tiết vẽ bằng code (đơn vị mm) ----------
function Sprig({ x, y, s, rot, c, flowers = true }: { x: number; y: number; s: number; rot: number; c: Ctx; flowers?: boolean }) {
  const { p } = c;
  const leaves: ReactNode[] = [];
  for (const [t, side] of [[0.18, 1], [0.3, -1], [0.44, 1], [0.56, -1], [0.7, 1], [0.82, -1]] as const) {
    const px = s * t, py = -s * 0.5 * t * t - s * 0.12 * t;
    leaves.push(<ellipse key={t} cx={px} cy={py + side * s * 0.05} rx={s * 0.085} ry={s * 0.032} fill={p.leaf} opacity={0.9} transform={`rotate(${side * 32 - 18} ${px} ${py + side * s * 0.05})`} />);
  }
  const flower = (fx: number, fy: number, r: number, k: number) => (
    <g key={`f${k}`}>
      {[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={fx + Math.cos((a * Math.PI) / 180) * r * 0.62} cy={fy + Math.sin((a * Math.PI) / 180) * r * 0.62} r={r * 0.55} fill={k % 2 ? p.accent2 : '#FFFFFF'} stroke={p.accent} strokeWidth={r * 0.06} opacity={0.96} />)}
      <circle cx={fx} cy={fy} r={r * 0.32} fill={goldPaint(c, p.accent)} />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <path d={`M0 0 C ${s * 0.3} ${-s * 0.05} ${s * 0.6} ${-s * 0.28} ${s} ${-s * 0.62}`} stroke={p.leaf} strokeWidth={s * 0.012} fill="none" strokeLinecap="round" />
      {leaves}
      {flowers && [flower(s * 0.98, -s * 0.6, s * 0.12, 0), flower(s * 0.62, -s * 0.27, s * 0.09, 1), flower(s * 0.3, -s * 0.07, s * 0.065, 2)]}
    </g>
  );
}
function CornerFlora({ x, y, s, rot, c }: { x: number; y: number; s: number; rot: number; c: Ctx }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      <Sprig x={0} y={0} s={s} rot={0} c={c} />
      <Sprig x={0} y={0} s={s * 0.8} rot={58} c={c} />
      <Sprig x={0} y={0} s={s * 0.55} rot={28} c={c} flowers={false} />
    </g>
  );
}
function Laurel({ cx, cy, r, c, initials }: { cx: number; cy: number; r: number; c: Ctx; initials: string }) {
  const leaves: ReactNode[] = [];
  const paint = goldPaint(c, c.p.accent);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 11; i++) {
      const a = Math.PI / 2 + side * (0.28 + i * 0.235);
      const px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      const deg = (a * 180) / Math.PI + (side > 0 ? -70 : 70);
      const off = i % 2 ? 1.07 : 0.93;
      leaves.push(<ellipse key={`${side}${i}`} cx={cx + (px - cx) * off} cy={cy + (py - cy) * off} rx={r * 0.13} ry={r * 0.045} fill={paint} transform={`rotate(${deg} ${cx + (px - cx) * off} ${cy + (py - cy) * off})`} />);
    }
  }
  return (
    <Gold c={c}>
      <g>
        <path d={`M ${cx - r * 0.28} ${cy + r * 0.97} A ${r} ${r} 0 0 1 ${cx - r * 0.97} ${cy - r * 0.28}`} stroke={paint} strokeWidth={r * 0.025} fill="none" />
        <path d={`M ${cx + r * 0.28} ${cy + r * 0.97} A ${r} ${r} 0 0 0 ${cx + r * 0.97} ${cy - r * 0.28}`} stroke={paint} strokeWidth={r * 0.025} fill="none" />
        {leaves}
        <text x={cx} y={cy + r * 0.2} textAnchor="middle" fontSize={r * 0.62} fill={paint} {...fprops(c.f.script)}>{initials}</text>
      </g>
    </Gold>
  );
}
function Balloons({ x, y, s, c }: { x: number; y: number; s: number; c: Ctx }) {
  const { p } = c;
  const b = [[0, 0, p.accent], [s * 0.42, -s * 0.18, p.accent2], [s * 0.18, s * 0.35, '#FFFFFF']] as const;
  return (
    <g transform={`translate(${x} ${y})`}>
      {b.map(([bx, by, col], i) => (
        <g key={i}>
          <path d={`M ${bx} ${by + s * 0.32} q ${s * 0.06} ${s * 0.25} ${-s * 0.02} ${s * 0.55}`} stroke={p.sub} strokeWidth={s * 0.012} fill="none" />
          <ellipse cx={bx} cy={by} rx={s * 0.24} ry={s * 0.3} fill={col} stroke={p.accent} strokeWidth={s * 0.012} />
          <ellipse cx={bx - s * 0.08} cy={by - s * 0.1} rx={s * 0.05} ry={s * 0.09} fill="#FFFFFF" opacity={0.6} />
        </g>
      ))}
    </g>
  );
}
function Star({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
    return `${(x + Math.cos(a) * rr).toFixed(2)},${(y + Math.sin(a) * rr).toFixed(2)}`;
  }).join(' ');
  return <polygon points={pts} fill={fill} />;
}
function Cloud({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) {
  return (
    <g fill={fill}>
      <circle cx={x} cy={y} r={s * 0.3} /><circle cx={x + s * 0.32} cy={y - s * 0.12} r={s * 0.38} /><circle cx={x + s * 0.68} cy={y} r={s * 0.28} />
      <rect x={x} y={y - s * 0.05} width={s * 0.68} height={s * 0.33} />
    </g>
  );
}
function DecoFan({ x, y, s, flip, c }: { x: number; y: number; s: number; flip: boolean; c: Ctx }) {
  const paint = goldPaint(c, c.p.accent);
  const sw = s * 0.012;
  return (
    <Gold c={c}>
      <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1)`} stroke={paint} strokeWidth={sw} fill="none">
        {[0.35, 0.55, 0.75, 1].map((k) => <path key={k} d={`M ${s * k} 0 A ${s * k} ${s * k} 0 0 1 0 ${s * k}`} />)}
        {Array.from({ length: 7 }, (_, i) => { const a = (i / 6) * (Math.PI / 2); return <line key={i} x1={Math.cos(a) * s * 0.35} y1={Math.sin(a) * s * 0.35} x2={Math.cos(a) * s} y2={Math.sin(a) * s} />; })}
      </g>
    </Gold>
  );
}
function Medallion({ cx, cy, r, c, initials }: { cx: number; cy: number; r: number; c: Ctx; initials: string }) {
  const paint = goldPaint(c, c.p.accent);
  return (
    <Gold c={c}>
      <g>
        {Array.from({ length: 16 }, (_, i) => {
          const a = (i / 16) * Math.PI * 2;
          return <ellipse key={i} cx={cx + Math.cos(a) * r * 0.86} cy={cy + Math.sin(a) * r * 0.86} rx={r * 0.17} ry={r * 0.07} fill={paint} transform={`rotate(${(a * 180) / Math.PI} ${cx + Math.cos(a) * r * 0.86} ${cy + Math.sin(a) * r * 0.86})`} />;
        })}
        <circle cx={cx} cy={cy} r={r * 0.68} fill="none" stroke={paint} strokeWidth={r * 0.04} />
        <circle cx={cx} cy={cy} r={r * 0.58} fill="none" stroke={paint} strokeWidth={r * 0.015} />
        <text x={cx} y={cy + r * 0.2} textAnchor="middle" fontSize={r * 0.62} fill={paint} {...fprops(c.f.script)}>{initials}</text>
      </g>
    </Gold>
  );
}
/** góc khung kiểu hồi văn (song hỷ / sang trọng) */
function KeyCorner({ x, y, s, sx, sy, c }: { x: number; y: number; s: number; sx: number; sy: number; c: Ctx }) {
  const paint = goldPaint(c, c.p.accent);
  return (
    <Gold c={c}>
      <path transform={`translate(${x} ${y}) scale(${sx} ${sy})`} d={`M0 ${s} V0 H${s} M${s * 0.22} ${s * 0.78} V${s * 0.22} H${s * 0.78} V${s * 0.5} H${s * 0.5} V${s * 0.36}`} stroke={paint} strokeWidth={s * 0.06} fill="none" strokeLinecap="square" />
    </Gold>
  );
}
function Diamond({ x, y, r, fill }: { x: number; y: number; r: number; fill: string }) {
  return <path d={`M${x} ${y - r} L${x + r} ${y} L${x} ${y + r} L${x - r} ${y} Z`} fill={fill} />;
}
/** chữ cái đầu của 2 người (“Quốc Bảo & Thu Hà” → “B&H”), 1 người → 1 chữ */
export function initialsOf(names: string): string {
  const parts = (names || '').split(/&|\bvà\b|\+/i).map((x) => x.trim()).filter(Boolean);
  const ini = parts.map((p) => (p.split(/\s+/).pop() || '').charAt(0).toUpperCase()).filter(Boolean);
  return ini.length >= 2 ? `${ini[0]}&${ini[1]}` : ini[0] || '';
}

// ---------- tính lưới thẻ bàn ----------
interface CardBox { t: SCTable; x: number; y: number; w: number; h: number }
export interface BoardFit { sz: number; cols: number; inner: number; cards: CardBox[]; overflow: boolean }
const CARD = { top: 0.85, num: 1.3, numLh: 1.15, note: 0.82, noteLh: 1.32, div: 0.95, lh: 1.36, bot: 0.65, pad: 0.75, colGap: 1.1 };
function cardH(t: SCTable, sz: number, inner: number) {
  const lines = Math.ceil(t.guests.length / inner);
  return sz * (CARD.top + CARD.num * CARD.numLh + (t.note ? CARD.note * CARD.noteLh : 0) + CARD.div + lines * CARD.lh + CARD.bot);
}
function fitBoard(tables: SCTable[], data: SCData, f: SCFontSet, area: { x: number; y: number; w: number; h: number }, maxSz: number): BoardFit {
  const N = tables.length;
  if (!N) return { sz: maxSz, cols: 1, inner: 1, cards: [], overflow: false };
  const minOk = 3.2;
  let best: { sz: number; c: number; k: number } | null = null;
  const titles = tables.map((t) => tableTitle(data, t));
  const feasible = (sz: number, c: number, k: number) => {
    const gapX = sz * 1.3, gapY = sz * 1.15;
    const cw = (area.w - (c - 1) * gapX) / c;
    const innerW = (cw - 2 * sz * CARD.pad - (k - 1) * sz * CARD.colGap) / k;
    if (innerW <= 0) return false;
    let total = 0;
    for (let r = 0; r * c < N; r++) {
      let h = 0;
      for (let i = r * c; i < Math.min(N, r * c + c); i++) h = Math.max(h, cardH(tables[i], sz, k));
      total += h + (r ? gapY : 0);
      if (total > area.h) return false;
    }
    for (let i = 0; i < N; i++) {
      if (textW(titles[i], sz * CARD.num, f.head, sz * 0.12) * 0.75 > cw - 2 * sz * CARD.pad) return false;
      for (const g of tables[i].guests) if (textW(g, sz, f.body) * 0.8 > innerW) return false;
    }
    return true;
  };
  for (let c = 1; c <= Math.min(N, 8); c++) {
    for (const k of [1, 2]) {
      if (k === 2 && !tables.some((t) => t.guests.length > 6)) continue;
      let lo = 1.5, hi = maxSz;
      if (!feasible(lo, c, k)) continue;
      for (let it = 0; it < 22; it++) { const mid = (lo + hi) / 2; if (feasible(mid, c, k)) lo = mid; else hi = mid; }
      if (!best || lo > best.sz * 1.02 || (lo > best.sz * 0.98 && c < best.c)) best = { sz: lo, c, k };
    }
  }
  const b = best || { sz: 1.5, c: Math.min(N, 8), k: 1 };
  const { sz, c, k } = b;
  const gapX = sz * 1.3, gapY = sz * 1.15;
  const cw = (area.w - (c - 1) * gapX) / c;
  const rows: number[] = [];
  for (let r = 0; r * c < N; r++) {
    let h = 0;
    for (let i = r * c; i < Math.min(N, r * c + c); i++) h = Math.max(h, cardH(tables[i], sz, k));
    rows.push(h);
  }
  const totalH = rows.reduce((s, h) => s + h, 0) + gapY * (rows.length - 1);
  let y = area.y + Math.max(0, (area.h - totalH) / 2);
  const cards: CardBox[] = [];
  rows.forEach((h, r) => {
    const inRow = Math.min(c, N - r * c);
    const rowW = inRow * cw + (inRow - 1) * gapX;
    let x = area.x + (area.w - rowW) / 2;
    for (let i = 0; i < inRow; i++) { cards.push({ t: tables[r * c + i], x, y, w: cw, h }); x += cw + gapX; }
    y += h + gapY;
  });
  return { sz, cols: c, inner: k, cards, overflow: !best || sz < minOk };
}

// ---------- BẢNG SƠ ĐỒ ----------
interface HeaderOut { node: ReactNode; bottom: number }
function header(c: Ctx, data: SCData, W: number, H: number, layout: SCLayout, top: number): HeaderOut {
  const { p, f } = c;
  const nodes: ReactNode[] = [];
  let y = top;
  const cx = W / 2;
  const initials = initialsOf(data.names || '');
  if (layout === 'laurel' && initials) {
    const r = W * 0.068;
    nodes.push(<Laurel key="laurel" cx={cx} cy={y + r} r={r} c={c} initials={initials} />);
    y += r * 2 + W * 0.02;
  }
  if (layout === 'redgold' && initials) {
    const r = W * 0.06;
    nodes.push(<Medallion key="med" cx={cx} cy={y + r} r={r} c={c} initials={initials} />);
    y += r * 2 + W * 0.022;
  }
  const head = layout === 'baby' || layout === 'deco' ? p.accent : p.ink;
  if (data.title) {
    const ls = W * 0.0045;
    const e = fitTo(data.title.toUpperCase(), W * 0.78, W * 0.025, f.head, ls);
    nodes.push(<Art key="t" c={c}><text x={cx} y={y + e * 0.8} textAnchor="middle" fontSize={e} letterSpacing={ls} fill={layout === 'deco' || layout === 'redgold' ? p.sub : head} {...fprops(f.head)} data-sc-text="title">{data.title.toUpperCase()}</text></Art>);
    y += e * 1.75;
  }
  if (data.names) {
    const maxW = W * 0.8;
    let n = Math.min(W * 0.095, H * 0.08);
    const one = fitTo(data.names, maxW, n, f.script);
    let lines = [data.names];
    if (one < W * 0.062 && /&/.test(data.names)) {
      const [a, b] = data.names.split('&');
      lines = [a.trim(), `& ${b.trim()}`];
      n = Math.min(n, ...lines.map((l) => fitTo(l, maxW, n, f.script)));
    } else n = one;
    const paint = goldPaint(c, layout === 'minimal' || layout === 'arch' || layout === 'baby' ? p.accent : p.accent);
    lines.forEach((l, i) => {
      nodes.push(<Gold key={`n${i}`} c={c}><text x={cx} y={y + n * 0.78} textAnchor="middle" fontSize={n} fill={paint} {...fprops(f.script)} data-sc-text="names">{l}</text></Gold>);
      y += n * (i < lines.length - 1 ? 0.98 : 1.12);
    });
  }
  if (data.date) {
    const d = fitTo(data.date, W * 0.6, W * 0.023, f.body);
    const tw = textW(data.date, d, f.body);
    const paint = goldPaint(c, p.accent);
    nodes.push(<Art key="d" c={c}><text x={cx} y={y + d * 0.8} textAnchor="middle" fontSize={d} fill={p.sub} {...fprops(f.body)} data-sc-text="date">{data.date}</text></Art>);
    nodes.push(<Gold key="dl" c={c}><g>
      <line x1={cx - tw / 2 - d * 4.2} y1={y + d * 0.5} x2={cx - tw / 2 - d * 1.1} y2={y + d * 0.5} stroke={paint} strokeWidth={d * 0.06} />
      <line x1={cx + tw / 2 + d * 1.1} y1={y + d * 0.5} x2={cx + tw / 2 + d * 4.2} y2={y + d * 0.5} stroke={paint} strokeWidth={d * 0.06} />
      <Diamond x={cx - tw / 2 - d * 0.7} y={y + d * 0.5} r={d * 0.18} fill={paint} /><Diamond x={cx + tw / 2 + d * 0.7} y={y + d * 0.5} r={d * 0.18} fill={paint} />
    </g></Gold>);
    y += d * 1.6;
  }
  if (data.venue) {
    const v = fitTo(data.venue, W * 0.7, W * 0.019, NOTE);
    nodes.push(<Art key="v" c={c}><text x={cx} y={y + v * 0.8} textAnchor="middle" fontSize={v} fill={p.sub} {...fprops(NOTE)} data-sc-text="venue">{data.venue}</text></Art>);
    y += v * 1.5;
  }
  return { node: <>{nodes}</>, bottom: y };
}

function TableCard({ cb, sz, inner, c, data }: { cb: CardBox; sz: number; inner: number; c: Ctx; data: SCData }) {
  const { p, f } = c;
  const { x, y, w, h, t } = cb;
  const pad = sz * CARD.pad;
  const title = tableTitle(data, t);
  const tls = sz * 0.12;
  const ts = fitTo(title, w - 2 * pad, sz * CARD.num, f.head, tls);
  let cy = y + sz * CARD.top + sz * CARD.num * 0.8;
  const out: ReactNode[] = [];
  const accentInk = p.dark && !p.gold ? p.cardInk : p.accent;
  out.push(<text key="t" x={x + w / 2} y={cy} textAnchor="middle" fontSize={ts} letterSpacing={tls} fill={p.card === '#1C1A17' ? p.accent : accentInk} {...fprops(f.head)} data-sc-table={t.label}>{title}</text>);
  cy += sz * CARD.num * (CARD.numLh - 0.8);
  if (t.note) {
    const ns = fitTo(t.note, w - 2 * pad, sz * CARD.note, NOTE);
    out.push(<text key="n" x={x + w / 2} y={cy + sz * CARD.note * 0.95} textAnchor="middle" fontSize={ns} fill={p.cardSub} {...fprops(NOTE)} data-sc-note="1">{t.note}</text>);
    cy += sz * CARD.note * CARD.noteLh;
  }
  const dy = cy + sz * CARD.div * 0.45;
  out.push(<g key="dv"><line x1={x + w / 2 - sz * 2.2} y1={dy} x2={x + w / 2 - sz * 0.45} y2={dy} stroke={p.accent} strokeWidth={sz * 0.05} /><line x1={x + w / 2 + sz * 0.45} y1={dy} x2={x + w / 2 + sz * 2.2} y2={dy} stroke={p.accent} strokeWidth={sz * 0.05} /><Diamond x={x + w / 2} y={dy} r={sz * 0.16} fill={p.accent} /></g>);
  cy += sz * CARD.div;
  const rows = Math.ceil(t.guests.length / inner);
  const colW = (w - 2 * pad - (inner - 1) * sz * CARD.colGap) / inner;
  t.guests.forEach((g, i) => {
    const col = Math.floor(i / rows), row = i % rows;
    const gx = x + pad + col * (colW + sz * CARD.colGap) + colW / 2;
    const gy = cy + row * sz * CARD.lh + sz * 0.95;
    const gs = fitTo(g, colW, sz, f.body);
    out.push(<text key={`g${i}`} x={gx} y={gy} textAnchor="middle" fontSize={gs} fill={p.cardInk} {...fprops(f.body)} data-guest={g}>{g}</text>);
  });
  return (
    <g data-card={t.label} data-card-box={`${x.toFixed(2)},${y.toFixed(2)},${w.toFixed(2)},${h.toFixed(2)}`}>
      <rect x={x} y={y} width={w} height={h} rx={sz * 0.7} fill={p.card} stroke={p.accent} strokeWidth={Math.max(0.3, sz * 0.06)} />
      {out}
    </g>
  );
}

export function SeatingBoardSvg({ spec, data, bleed = false, fm = 'art', maxTables, style }: {
  spec: SCSpec; data: SCData; bleed?: boolean; fm?: FoilMode; maxTables?: number; style?: CSSProperties;
}) {
  const gid = useGid();
  const c = mkCtx(spec, fm, gid);
  const { p } = c;
  const sz = scSize(spec.size);
  const W = sz.wMm, H = sz.hMm;
  const b = bleed ? SC_BLEED_MM : 0;
  const layout = spec.layout;
  let tables = parseGuests(data.guests || '', spec.sortBy);
  if (maxTables) tables = tables.slice(0, maxTables);
  const frameIn = W * 0.032;
  const cornerS = W * 0.23;
  const top = H * 0.055 + (layout === 'arch' ? W * 0.06 : 0);
  const hd = header(c, data, W, H, layout, top);
  const footerH = Math.max(H * 0.075, layout === 'garden' || layout === 'baby' ? cornerS * 0.62 : layout === 'deco' ? frameIn + W * 0.125 : 0);
  const sideM = W * (layout === 'garden' || layout === 'arch' ? 0.085 : 0.07);
  const area = { x: sideM, y: hd.bottom + W * 0.03, w: W - 2 * sideM, h: H - footerH - (hd.bottom + W * 0.03) - H * 0.012 };
  const fit = fitBoard(tables, data, c.f, area, W * 0.032);
  const goldStroke = goldPaint(c, p.accent);
  const bgFill = fm === 'foil3d' ? '#000000' : fm === 'foilPrint' ? '#FFFFFF' : p.paper;

  const deco: ReactNode[] = [];
  if (layout === 'garden') {
    deco.push(<Art key="cf1" c={c}><CornerFlora x={W * 0.015} y={W * 0.02} s={cornerS} rot={90} c={c} /></Art>);
    deco.push(<Art key="cf2" c={c}><CornerFlora x={W * 0.985} y={H - W * 0.02} s={cornerS} rot={-90} c={c} /></Art>);
    deco.push(<Gold key="fr" c={c}><rect x={frameIn} y={frameIn} width={W - 2 * frameIn} height={H - 2 * frameIn} fill="none" stroke={goldStroke} strokeWidth={W * 0.0018} /></Gold>);
  } else if (layout === 'arch') {
    const ax0 = frameIn * 1.2, ax1 = W - frameIn * 1.2, ya = W * 0.47, yb = H - frameIn * 1.2;
    const rx = (ax1 - ax0) / 2;
    deco.push(<Gold key="arch" c={c}><g fill="none" stroke={goldStroke}>
      <path d={`M${ax0} ${yb} V${ya} A${rx} ${ya - frameIn * 1.2} 0 0 1 ${ax1} ${ya} V${yb} Z`} strokeWidth={W * 0.0025} />
      <path d={`M${ax0 + W * 0.012} ${yb - W * 0.012} V${ya} A${rx - W * 0.012} ${ya - frameIn * 1.2 - W * 0.012} 0 0 1 ${ax1 - W * 0.012} ${ya} V${yb - W * 0.012} Z`} strokeWidth={W * 0.001} />
    </g></Gold>);
    deco.push(<Art key="as1" c={c}><Sprig x={W / 2 - W * 0.01} y={frameIn * 1.25} s={W * 0.13} rot={170} c={c} /><Sprig x={W / 2 + W * 0.01} y={frameIn * 1.25} s={W * 0.13} rot={10} c={c} /></Art>);
  } else if (layout === 'redgold' || layout === 'minimal') {
    const k = layout === 'redgold' ? W * 0.06 : W * 0.035;
    deco.push(<Gold key="fr2" c={c}><g fill="none" stroke={goldStroke}>
      <rect x={frameIn} y={frameIn} width={W - 2 * frameIn} height={H - 2 * frameIn} strokeWidth={W * (layout === 'redgold' ? 0.003 : 0.0015)} />
      {layout === 'redgold' && <rect x={frameIn + W * 0.012} y={frameIn + W * 0.012} width={W - 2 * frameIn - W * 0.024} height={H - 2 * frameIn - W * 0.024} strokeWidth={W * 0.0012} />}
    </g></Gold>);
    if (layout === 'redgold') {
      const o = frameIn + W * 0.02;
      deco.push(<KeyCorner key="k1" x={o} y={o} s={k} sx={1} sy={1} c={c} />, <KeyCorner key="k2" x={W - o} y={o} s={k} sx={-1} sy={1} c={c} />,
        <KeyCorner key="k3" x={o} y={H - o} s={k} sx={1} sy={-1} c={c} />, <KeyCorner key="k4" x={W - o} y={H - o} s={k} sx={-1} sy={-1} c={c} />);
    } else deco.push(<Gold key="dm" c={c}><Diamond x={W / 2} y={frameIn} r={W * 0.008} fill={goldStroke} /></Gold>);
  } else if (layout === 'baby') {
    deco.push(<Art key="bb" c={c}><g>
      <Cloud x={W * 0.05} y={H * 0.08} s={W * 0.16} fill="#FFFFFF" /><Cloud x={W * 0.78} y={H * 0.05} s={W * 0.14} fill="#FFFFFF" />
      <Balloons x={W * 0.86} y={H - cornerS * 0.62} s={cornerS * 0.55} c={c} />
      <Balloons x={W * 0.1} y={H - cornerS * 0.55} s={cornerS * 0.45} c={c} />
      {[[0.2, 0.04], [0.68, 0.11], [0.92, 0.2], [0.07, 0.22], [0.5, 0.025]].map(([sx, sy], i) => <Star key={i} x={W * sx} y={H * sy} r={W * 0.012} fill={i % 2 ? p.accent2 : p.accent} />)}
    </g></Art>);
  } else if (layout === 'deco') {
    deco.push(<DecoFan key="d1" x={frameIn} y={frameIn} s={W * 0.17} flip={false} c={c} />, <DecoFan key="d2" x={W - frameIn} y={frameIn} s={W * 0.17} flip c={c} />);
    deco.push(<Gold key="d3" c={c}><g fill="none" stroke={goldStroke} strokeWidth={W * 0.0018}>
      <rect x={frameIn} y={frameIn} width={W - 2 * frameIn} height={H - 2 * frameIn} />
      {[0.35, 0.6, 0.85].map((k) => <path key={k} d={`M ${W / 2 - W * 0.11 * k} ${H - frameIn} A ${W * 0.11 * k} ${W * 0.11 * k} 0 0 1 ${W / 2 + W * 0.11 * k} ${H - frameIn}`} />)}
    </g></Gold>);
  }

  const fs = fitTo(data.footer || '', W * 0.62, W * 0.021, NOTE);
  const footerY = layout === 'deco' ? H - frameIn - W * 0.105 : H - footerH / 2 + fs * 0.3;
  return (
    <svg viewBox={`${-b} ${-b} ${W + 2 * b} ${H + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={style} data-board={`${W}x${H}`} data-overflow={fit.overflow ? '1' : undefined} data-guest-size={fit.sz.toFixed(2)}>
      <GoldDefs c={c} />
      <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={bgFill} />
      {deco}
      {hd.node}
      <Art c={c}>{fit.cards.map((cb) => <TableCard key={cb.t.key} cb={cb} sz={fit.sz} inner={fit.inner} c={c} data={data} />)}</Art>
      {data.footer && <Art c={c}><text x={W / 2} y={footerY} textAnchor="middle" fontSize={fs} fill={p.sub} {...fprops(NOTE)} data-sc-text="footer">{data.footer}</text></Art>}
    </svg>
  );
}

// ---------- THẺ TÊN KHÁCH (mặt 90×50) ----------
/** nội dung 1 mặt trước (toạ độ 0..90 × 0..50) */
function PlaceFront({ c, data, g }: { c: Ctx; data: SCData; g: SCGuest }) {
  const { p, f } = c;
  const { w, h } = PLACE;
  const bg = c.fm === 'art' ? (p.dark ? p.paper : p.card) : 'none';
  const ns = Math.min(fitTo(g.name, w * 0.84, 10.5, f.script), 10.5);
  const tt = tableTitle(data, g.table);
  const ts = fitTo(tt, w * 0.6, 3.4, f.head, 0.5);
  const gold = goldPaint(c, p.accent);
  const nameFill = p.dark ? p.ink : p.cardInk;
  return (
    <g>
      {c.fm === 'art' && <rect x={0} y={0} width={w} height={h} fill={bg} />}
      <Gold c={c}><rect x={2.5} y={2.5} width={w - 5} height={h - 5} fill="none" stroke={gold} strokeWidth={0.3} rx={1} /></Gold>
      <Art c={c}><Sprig x={4} y={h - 4} s={11} rot={-8} c={c} /></Art>
      <Art c={c}><text x={w / 2} y={h * 0.5 + ns * 0.22} textAnchor="middle" fontSize={ns} fill={nameFill} {...fprops(f.script)} data-place-name={g.name}>{g.name}</text></Art>
      <Gold c={c}><g><line x1={w / 2 - 9} y1={h * 0.68} x2={w / 2 + 9} y2={h * 0.68} stroke={gold} strokeWidth={0.25} /><Diamond x={w / 2} y={h * 0.68} r={0.7} fill={gold} /></g></Gold>
      <Art c={c}><text x={w / 2} y={h * 0.84} textAnchor="middle" fontSize={ts} letterSpacing={0.5} fill={p.dark ? p.accent : p.accent} {...fprops(f.head)} data-place-table={g.table.label}>{tt}</text></Art>
    </g>
  );
}
function PlaceBack({ c, data }: { c: Ctx; data: SCData }) {
  const { p, f } = c;
  const { w, h } = PLACE;
  const ini = initialsOf(data.names || '');
  const gold = goldPaint(c, p.accent);
  return (
    <g>
      {c.fm === 'art' && <rect x={0} y={0} width={w} height={h} fill={p.dark ? p.paper : p.card} />}
      {ini && <Gold c={c}><text x={w / 2} y={h * 0.55} textAnchor="middle" fontSize={11} fill={gold} {...fprops(f.script)}>{ini}</text></Gold>}
      {data.date && <Art c={c}><text x={w / 2} y={h * 0.78} textAnchor="middle" fontSize={fitTo(data.date, w * 0.8, 2.6, f.body)} fill={p.dark ? p.sub : p.cardSub} {...fprops(f.body)}>{data.date}</text></Art>}
    </g>
  );
}
/** 1 mặt trước (cho 3D / xem trước) */
export function PlaceFaceSvg({ spec, data, guest, fm = 'art', style }: { spec: SCSpec; data: SCData; guest: SCGuest; fm?: FoilMode; style?: CSSProperties }) {
  const gid = useGid();
  const c = mkCtx(spec, fm, gid);
  return (
    <svg viewBox={`0 0 ${PLACE.w} ${PLACE.h}`} xmlns="http://www.w3.org/2000/svg" style={style} data-place-face="1">
      <GoldDefs c={c} />
      {fm === 'foil3d' && <rect width={PLACE.w} height={PLACE.h} fill="#000" />}
      <PlaceFront c={c} data={data} g={guest} />
    </svg>
  );
}
/** thẻ trải phẳng 90×100: nửa dưới = mặt trước, nửa trên = mặt sau (xoay 180°), nét gấp giữa */
function PlaceFlat({ c, data, g, x, y, rot = 0, print }: { c: Ctx; data: SCData; g: SCGuest; x: number; y: number; rot?: number; print: boolean }) {
  const { w, h } = PLACE;
  const bleed = print ? 2 : 0;
  const bgc = c.p.dark ? c.p.paper : c.p.card;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} data-place={g.name}>
      {c.fm === 'art' && <rect x={-bleed} y={-bleed} width={w + 2 * bleed} height={2 * h + 2 * bleed} fill={bgc} />}
      <g transform={`rotate(180 ${w / 2} ${h / 2})`}><PlaceBack c={c} data={data} /></g>
      <g transform={`translate(0 ${h})`}><PlaceFront c={c} data={data} g={g} /></g>
      {!print && <line x1={0} y1={h} x2={w} y2={h} stroke="#9AA3AF" strokeWidth={0.3} strokeDasharray="1.5 1" />}
    </g>
  );
}
export function PlaceFlatSvg({ spec, data, guest, style }: { spec: SCSpec; data: SCData; guest: SCGuest; style?: CSSProperties }) {
  const gid = useGid();
  const c = mkCtx(spec, 'art', gid);
  return (
    <svg viewBox={`-1 -1 ${PLACE.w + 2} ${PLACE.h * 2 + 2}`} xmlns="http://www.w3.org/2000/svg" style={style}>
      <GoldDefs c={c} />
      <PlaceFlat c={c} data={data} g={guest} x={0} y={0} print={false} />
      <rect x={0} y={0} width={PLACE.w} height={PLACE.h * 2} fill="none" stroke="#CBD5E1" strokeWidth={0.3} />
    </svg>
  );
}
export const PER_SHEET = SHEET.cols * SHEET.rows;
/** tờ A4 6 thẻ (thẻ xoay 90°: 100×90 → 2 cột × 3 hàng), lớp In + CutContour + Fold */
export function PlaceSheetSvg({ spec, data, guests, fm = 'art', style }: { spec: SCSpec; data: SCData; guests: SCGuest[]; fm?: FoilMode; style?: CSSProperties }) {
  const gid = useGid();
  const c = mkCtx(spec, fm, gid);
  const cw = PLACE.h * 2, ch = PLACE.w; // ô trên tờ sau khi xoay
  const gw = SHEET.cols * cw + (SHEET.cols - 1) * SHEET.gap, gh = SHEET.rows * ch + (SHEET.rows - 1) * SHEET.gap;
  const ox = (SHEET.w - gw) / 2, oy = (SHEET.h - gh) / 2;
  const cell = (i: number) => ({ x: ox + (i % SHEET.cols) * (cw + SHEET.gap), y: oy + Math.floor(i / SHEET.cols) * (ch + SHEET.gap) });
  return (
    <svg viewBox={`0 0 ${SHEET.w} ${SHEET.h}`} width={`${SHEET.w}mm`} height={`${SHEET.h}mm`} xmlns="http://www.w3.org/2000/svg" style={style} data-sheet={guests.length}>
      <GoldDefs c={c} />
      <rect width={SHEET.w} height={SHEET.h} fill={fm === 'foil3d' ? '#000' : '#FFFFFF'} />
      <g id="In">
        {guests.map((g, i) => {
          const { x, y } = cell(i);
          // xoay 90°: gốc thẻ (0,0) → góc trên phải ô
          return <PlaceFlat key={i} c={c} data={data} g={g} x={x + cw} y={y} rot={90} print />;
        })}
      </g>
      {fm === 'art' && (
        <>
          <g id="CutContour" fill="none" stroke="#FF00FF" strokeWidth={0.25}>
            {guests.map((_, i) => { const { x, y } = cell(i); return <rect key={i} x={x} y={y} width={cw} height={ch} />; })}
          </g>
          <g id="Fold" stroke="#00A3FF" strokeWidth={0.25} strokeDasharray="2 1.5">
            {guests.map((_, i) => { const { x, y } = cell(i); return <line key={i} x1={x + cw / 2} y1={y} x2={x + cw / 2} y2={y + ch} />; })}
          </g>
        </>
      )}
      {fm === 'art' && <text x={SHEET.w / 2} y={SHEET.h - 4} textAnchor="middle" fontSize={2.6} fill="#64748B" fontFamily="'Be Vietnam Pro'" fontWeight={600}>Thẻ tên khách 9×5cm gấp đôi · nét hồng = cắt · nét xanh đứt = gấp · {guests.length} thẻ/tờ</text>}
    </svg>
  );
}

// ---------- THẺ SỐ BÀN 10×15 ----------
export function TableNumberSvg({ spec, data, table, bleed = false, fm = 'art', style }: { spec: SCSpec; data: SCData; table: SCTable; bleed?: boolean; fm?: FoilMode; style?: CSSProperties }) {
  const gid = useGid();
  const c = mkCtx(spec, fm, gid);
  const { p, f } = c;
  const { w, h } = NUMBER;
  const b = bleed ? SC_BLEED_MM : 0;
  const gold = goldPaint(c, p.accent);
  const word = (data.tableWord || 'Bàn').toUpperCase();
  const big = table.label;
  const bs = fitTo(big, w * 0.72, big.length > 2 ? 46 : 62, f.head);
  const bgFill = fm === 'foil3d' ? '#000' : fm === 'foilPrint' ? '#FFF' : p.paper;
  const ns = fitTo(data.names || '', w * 0.8, 9, f.script);
  return (
    <svg viewBox={`${-b} ${-b} ${w + 2 * b} ${h + 2 * b}`} xmlns="http://www.w3.org/2000/svg" style={style} data-number={table.label}>
      <GoldDefs c={c} />
      <rect x={-b} y={-b} width={w + 2 * b} height={h + 2 * b} fill={bgFill} />
      <Gold c={c}><rect x={5} y={5} width={w - 10} height={h - 10} fill="none" stroke={gold} strokeWidth={0.5} rx={1.5} /></Gold>
      <Art c={c}>
        {spec.layout === 'baby' ? <Balloons x={w * 0.8} y={h * 0.18} s={18} c={c} /> : spec.layout === 'deco' ? null : <Sprig x={10} y={h - 12} s={26} rot={-12} c={c} />}
      </Art>
      {spec.layout === 'deco' && <DecoFan x={5} y={5} s={26} flip={false} c={c} />}
      <Art c={c}><text x={w / 2} y={h * 0.2} textAnchor="middle" fontSize={fitTo(word, w * 0.6, 7, f.head, 1.6)} letterSpacing={1.6} fill={p.dark ? p.sub : p.sub} {...fprops(f.head)} data-num-text="word">{word}</text></Art>
      <Gold c={c}><text x={w / 2} y={h * 0.2 + 8 + bs * 0.74} textAnchor="middle" fontSize={bs} fill={goldPaint(c, p.dark ? p.accent : p.ink)} {...fprops(f.head)} data-num-text="big">{big}</text></Gold>
      {table.note && <Art c={c}><text x={w / 2} y={h * 0.2 + 8 + bs * 0.74 + 12} textAnchor="middle" fontSize={fitTo(table.note, w * 0.8, 6, NOTE)} fill={p.sub} {...fprops(NOTE)} data-num-text="note">{table.note}</text></Art>}
      {data.names && <Gold c={c}><text x={w / 2} y={h * 0.86} textAnchor="middle" fontSize={ns} fill={gold} {...fprops(f.script)} data-num-text="names">{data.names}</text></Gold>}
    </svg>
  );
}
