'use client';
// Photobook · kỷ yếu (bìa cứng, trang đôi lay-flat): kho ảnh của khách → TỰ DÀN ẢNH ra các trang đôi theo chuỗi bố cục
// của chủ đề (tràn trang đôi, 2 ảnh, chữ + ảnh, 1 lớn + 2, 4 ảnh, khung + 2 nhỏ, 6 ảnh, chân dung lớp, trang chữ).
// Khách đổi bố cục / đổi ảnh / sửa chú thích từng trang đôi. Bìa = bìa cứng bồi (lưng + gáy + mặt), gáy tính theo số trang.
// Đơn vị: mm. Render 100% bằng code (SVG). Chưa có ảnh → ảnh minh hoạ vẽ bằng code.

import { useId, type CSSProperties, type ReactNode } from 'react';
import { CV_FONTS, CV_FONT_CSS, cvFont, useCVFonts, coverRect, photoDpi, samplePhotos } from './canvas-engine';
import { selfContainedSvg, svgToCanvas } from './svg-export';
import { printPageDims } from './print-export';

export const PB_FONTS = CV_FONTS;
export const PB_FONT_CSS = CV_FONT_CSS;
export const usePBFonts = useCVFonts;
const BODY = 'Be Vietnam Pro';
const SERIF = 'Cormorant Garamond';

// ---------- khổ, số trang, bìa ----------
export interface PBSize { id: string; name: string; wMm: number; hMm: number }
export const PB_SIZES: PBSize[] = [
  { id: '20x20', name: '20×20', wMm: 200, hMm: 200 },
  { id: '25x25', name: '25×25', wMm: 250, hMm: 250 },
  { id: 'a4', name: 'A4 ngang (29.7×21)', wMm: 297, hMm: 210 },
  { id: '30x30', name: '30×30', wMm: 300, hMm: 300 },
];
export const pbSize = (id: string) => PB_SIZES.find((s) => s.id === id) || PB_SIZES[0];
export const PB_PAGES = [20, 24, 28, 32, 36, 40] as const;
export const PB_BLEED = 3;          // lề xén mỗi cạnh
const BOARD_OVER = 3;               // bìa cứng dư ra so với ruột (đầu, chân, mép ngoài)
export const PB_TURN = 15;          // giấy bồi bìa gấp vào trong bìa cứng
export const PB_HINGE = 7;          // rãnh bản lề giữa bìa và gáy
export const PB_BOARD_T = 2.5;      // độ dày bìa cứng
export const PB_LEAF_T = 0.9;       // lay-flat: mỗi tờ (2 trang) dày ~0.9mm (giấy ảnh bồi)
/** gáy (mm) theo số trang: ruột + 2 bìa cứng + độ hở */
export const pbSpine = (pages: number) => Math.round((pages / 2) * PB_LEAF_T + PB_BOARD_T * 2 + 1);

export function pbCoverDims(spec: Pick<PBSpec, 'size' | 'pages'>) {
  const s = pbSize(spec.size);
  const bw = s.wMm + BOARD_OVER, bh = s.hMm + BOARD_OVER * 2;
  const spine = pbSpine(spec.pages);
  // file in bìa: gấp mép | lưng | bản lề | gáy | bản lề | mặt | gấp mép
  const CW = PB_TURN * 2 + bw * 2 + PB_HINGE * 2 + spine, CH = PB_TURN * 2 + bh;
  const backX = PB_TURN, spineX = PB_TURN + bw + PB_HINGE, frontX = spineX + spine + PB_HINGE;
  return { W: s.wMm, H: s.hMm, bw, bh, spine, CW, CH, backX, spineX, frontX };
}

// ---------- màu ----------
export interface PBPalette { id: string; name: string; page: string; ink: string; sub: string; accent: string; cover: string; coverInk: string }
export const PB_PALETTES: PBPalette[] = [
  { id: 'ivory', name: 'Ngà', page: '#FBF8F2', ink: '#3A3027', sub: '#8A7A66', accent: '#B08D57', cover: '#EFE6D6', coverInk: '#5A4632' },
  { id: 'mono', name: 'Đen trắng', page: '#FFFFFF', ink: '#1A1A1A', sub: '#6B6B6B', accent: '#1A1A1A', cover: '#1E1E1E', coverInk: '#F4F1EA' },
  { id: 'blush', name: 'Hồng phấn', page: '#FFF6F4', ink: '#5A3A3A', sub: '#9C7676', accent: '#D98B8B', cover: '#F3D7D3', coverInk: '#6B3E3E' },
  { id: 'sky', name: 'Xanh em bé', page: '#F5FAFD', ink: '#24405A', sub: '#6A869E', accent: '#5E9DD0', cover: '#D6E8F4', coverInk: '#24405A' },
  { id: 'teal', name: 'Xanh biển', page: '#F4F8F6', ink: '#16343A', sub: '#5C7A7C', accent: '#2F8A8F', cover: '#1F5E63', coverInk: '#F3EBDD' },
  { id: 'navy', name: 'Navy vàng', page: '#F7F6F2', ink: '#17233B', sub: '#5D6B82', accent: '#B8913A', cover: '#1C2B4A', coverInk: '#E9CF8E' },
  { id: 'mint', name: 'Bạc hà', page: '#F4FBF7', ink: '#1F3D33', sub: '#5E7E72', accent: '#3FA37A', cover: '#CFEBDD', coverInk: '#1F3D33' },
  { id: 'terracotta', name: 'Đất nung', page: '#FBF5EF', ink: '#3D2418', sub: '#8C6650', accent: '#C0653E', cover: '#B4553A', coverInk: '#FFF1E6' },
];
export const pbPalette = (id: string) => PB_PALETTES.find((p) => p.id === id) || PB_PALETTES[0];

// ---------- chủ đề, bìa, mẫu ----------
export type PBTheme = 'wedding' | 'family' | 'travel' | 'yearbook' | 'company';
export const PB_THEMES: { id: PBTheme; name: string }[] = [
  { id: 'wedding', name: 'Ảnh cưới' }, { id: 'family', name: 'Gia đình · em bé' }, { id: 'travel', name: 'Du lịch' },
  { id: 'yearbook', name: 'Kỷ yếu lớp' }, { id: 'company', name: 'Kỷ niệm công ty' },
];
export type PBCover = 'full' | 'window' | 'linen' | 'class';
export const PB_COVERS: { id: PBCover; name: string }[] = [
  { id: 'full', name: 'Ảnh tràn bìa' }, { id: 'window', name: 'Khung ảnh' }, { id: 'linen', name: 'Vải lanh + ảnh nhỏ' }, { id: 'class', name: 'Kỷ yếu' },
];
export interface PBSpec { theme: PBTheme; palette: string; font: string; cover: PBCover; size: string; pages: number; sample: string }
export interface PBTemplate { id: string; name: string; spec: Pick<PBSpec, 'theme' | 'palette' | 'font' | 'cover' | 'sample'> }
export const PB_TEMPLATES: PBTemplate[] = [
  { id: 'cuoi-co-dien', name: 'Cưới · cổ điển', spec: { theme: 'wedding', palette: 'ivory', font: 'greatvibes', cover: 'window', sample: 'wedding' } },
  { id: 'cuoi-hien-dai', name: 'Cưới · hiện đại', spec: { theme: 'wedding', palette: 'mono', font: 'playfair', cover: 'full', sample: 'wedding' } },
  { id: 'em-be', name: 'Em bé đầu đời', spec: { theme: 'family', palette: 'sky', font: 'dancing', cover: 'window', sample: 'baby' } },
  { id: 'gia-dinh', name: 'Gia đình mình', spec: { theme: 'family', palette: 'terracotta', font: 'cormorant', cover: 'linen', sample: 'family' } },
  { id: 'du-lich', name: 'Du lịch · phượt', spec: { theme: 'travel', palette: 'teal', font: 'montserrat', cover: 'full', sample: 'travel' } },
  { id: 'du-lich-nhe', name: 'Du lịch · nhẹ nhàng', spec: { theme: 'travel', palette: 'blush', font: 'dancing', cover: 'linen', sample: 'travel' } },
  { id: 'ky-yeu', name: 'Kỷ yếu · navy vàng', spec: { theme: 'yearbook', palette: 'navy', font: 'montserrat', cover: 'class', sample: 'yearbook' } },
  { id: 'ky-yeu-pastel', name: 'Kỷ yếu · bạc hà', spec: { theme: 'yearbook', palette: 'mint', font: 'bvp', cover: 'class', sample: 'yearbook' } },
  { id: 'cong-ty', name: 'Kỷ niệm công ty', spec: { theme: 'company', palette: 'navy', font: 'bvp', cover: 'full', sample: 'company' } },
  { id: 'toi-gian', name: 'Tối giản đen trắng', spec: { theme: 'family', palette: 'mono', font: 'cormorant', cover: 'linen', sample: 'family' } },
];

// ---------- nội dung ----------
export type PBData = Record<string, string>;
export interface PBField { key: string; label: string; ph?: string; multiline?: boolean; themes?: PBTheme[] }
export const PB_FIELDS: PBField[] = [
  { key: 'title', label: 'Tiêu đề bìa' },
  { key: 'names', label: 'Tên / dòng phụ' },
  { key: 'date', label: 'Ngày / năm' },
  { key: 'school', label: 'Trường', themes: ['yearbook'] },
  { key: 'teacher', label: 'Giáo viên chủ nhiệm', themes: ['yearbook'] },
  { key: 'intro', label: 'Lời mở đầu (trang chữ)', multiline: true },
  { key: 'ending', label: 'Lời kết (trang cuối)', multiline: true },
  { key: 'captions', label: 'Chú thích các trang (mỗi dòng 1 trang đôi)', multiline: true },
  { key: 'students', label: 'Danh sách lớp (mỗi dòng: Họ tên | câu nói)', multiline: true, themes: ['yearbook'] },
];
const STUDENTS = [
  'Trần Gia Khánh | Thanh xuân là những ngày không quay lại',
  'Lê Quốc Bảo | Hẹn gặp lại ở một phiên bản tốt hơn',
  'Phạm Thu Hà | Cảm ơn vì đã là một phần thanh xuân của tớ',
  'Nguyễn Bảo Ngọc | Cứ đi rồi sẽ đến',
  'Đỗ Hoàng Long | Bàn cuối là chân ái',
  'Vũ Khánh Linh | Mai này lớn rồi, nhớ nhau nhé',
  'Hồ Tuấn Kiệt | Ước mơ không có hạn nộp bài',
  'Bùi Thảo Vy | Tuổi 18 đẹp nhất là có các cậu',
  'Đặng Hải Đăng | Đỗ đại học rồi khao cả lớp',
  'Ngô Mai Anh | Hoa phượng năm nay đỏ hơn mọi năm',
  'Phan Đức Huy | Học đi, rồi chơi sau',
  'Trịnh Ngọc Hân | Mỗi ngày đến lớp là một ngày vui',
  'Lý Thanh Tùng | Đừng quên tớ đấy',
  'Mai Phương Thảo | Bình yên là khi cả lớp cùng cười',
  'Đinh Quang Vinh | Ra trường rồi vẫn là anh em',
  'Tạ Yến Nhi | Giữ lửa nhé 12A1',
  'Châu Bảo Trâm | Ba năm ngắn mà dài lắm',
  'Lương Gia Huy | Sân trường này sẽ nhớ chúng ta',
  'Kiều Thu Trang | Thương cô chủ nhiệm nhất',
  'Tô Hữu Phước | Trời xanh, mây trắng, nắng vàng',
  'Hà Kim Ngân | Chúc cả lớp chân cứng đá mềm',
  'Văn Đức Anh | Gặp lại nhau ở đỉnh cao',
].join('\n');
export const PB_SAMPLES: Record<string, PBData> = {
  wedding: {
    title: 'Ngày chung đôi', names: 'Quốc Bảo & Thu Hà', date: '20 · 12 · 2026',
    intro: 'Từ những buổi hẹn đầu tiên bên ly cà phê nhỏ, đến ngày cùng nhau nói lời hứa trọn đời. Cuốn sách này giữ lại những khoảnh khắc đẹp nhất của hai đứa — để mười năm, hai mươi năm nữa mở ra vẫn thấy tim mình ấm.',
    ending: 'Mãi bên nhau bạn nhé', captions: 'Lần đầu gặp nhau\nĐà Lạt mùa hoa\nNgày dạm ngõ\nLễ vu quy\nTiệc cưới ấm áp\nTrăng mật bên biển\nNhững ngày bình yên\nCùng nhau về nhà',
  },
  baby: {
    title: 'Con yêu của mẹ', names: 'Bé Gia Khánh', date: 'Năm đầu đời · 2026',
    intro: 'Ngày con chào đời, cả nhà như vỡ oà. Từng tiếng khóc, nụ cười đầu tiên, bước chân chập chững… mẹ ghi lại hết ở đây để mai này con lớn, con biết mình đã được yêu thương nhiều đến thế nào.',
    ending: 'Lớn lên thật khoẻ con nhé', captions: 'Ngày đầu gặp con\nTháng đầu tiên\nNụ cười đầu tiên\nĐầy tháng\nBiết lẫy rồi\nTập ngồi\nThôi nôi\nBước chân đầu tiên',
  },
  family: {
    title: 'Nhà mình', names: 'Gia đình Thu Hà & Quốc Bảo', date: 'Năm 2026',
    intro: 'Một năm với thật nhiều chuyến đi, những bữa cơm đông đủ và tiếng cười của bọn trẻ. Nhà là nơi để về — và cuốn sách nhỏ này là những mảnh ghép làm nên nhà mình.',
    ending: 'Nhà là nơi để thương', captions: 'Tết sum vầy\nCuối tuần ở quê\nMùa hè rực rỡ\nSinh nhật bé\nChuyến đi biển\nTrung thu\nNhững ngày thường\nGiáng sinh ấm áp',
  },
  travel: {
    title: 'Đà Lạt mộng mơ', names: 'Thu Hà & hội bạn thân', date: 'Tháng 3 · 2026',
    intro: 'Ba ngày hai đêm với sương sớm, đồi thông, những con dốc và ly sữa đậu nóng. Đi để thấy mình còn trẻ, để nhớ rằng thế giới ngoài kia vẫn còn rất nhiều điều đẹp.',
    ending: 'Hẹn chuyến đi tiếp theo', captions: 'Đường đèo sáng sớm\nĐồi chè Cầu Đất\nHồ Tuyền Lâm\nChợ đêm\nQuán cà phê trên đồi\nThung lũng hoa\nHoàng hôn cuối ngày\nTrên đường về',
  },
  yearbook: {
    title: 'Kỷ yếu 12A1', names: 'Niên khoá 2023 – 2026', date: '2026', school: 'Trường THPT Lê Quý Đôn', teacher: 'Cô Nguyễn Thu Hà',
    intro: 'Ba năm dưới mái trường, mình đã cùng nhau học, cùng nhau quậy, cùng nhau khóc cười. Rồi mai mỗi đứa một nơi, nhưng 12A1 vẫn mãi là nhà. Cảm ơn cô — người đã luôn tin chúng mình.',
    ending: 'Thanh xuân của chúng ta', captions: 'Ngày đầu nhập học\nHội trại 26/3\nVăn nghệ 20/11\nGiờ ra chơi\nDã ngoại cuối năm\nNgày bế giảng\nPhút chia tay',
    students: STUDENTS,
  },
  company: {
    title: '10 năm An Khang', names: 'Công ty TNHH An Khang · 2016 – 2026', date: '2016 – 2026',
    intro: 'Từ một văn phòng nhỏ với năm thành viên, An Khang hôm nay là mái nhà chung của hơn hai trăm con người. Cảm ơn khách hàng, đối tác và từng thành viên đã cùng nhau đi qua chặng đường mười năm.',
    ending: 'Cùng nhau vươn xa', captions: 'Những ngày đầu\nVăn phòng mới\nTeam building Phú Quốc\nLễ ký kết đối tác\nTất niên 2025\nĐội ngũ hôm nay\nHướng tới tương lai',
  },
};
export const defaultPBData = (sample = 'wedding'): PBData => ({ school: '', teacher: '', students: '', ...(PB_SAMPLES[sample] || PB_SAMPLES.wedding) });

export interface PBStudent { name: string; quote: string }
export const parseStudents = (s: string): PBStudent[] => (s || '').split('\n').map((l) => l.trim()).filter(Boolean)
  .map((l) => { const [n, ...q] = l.split('|'); return { name: (n || '').trim(), quote: q.join('|').trim() }; }).filter((x) => x.name).slice(0, 120);

// ---------- bố cục trang đôi ----------
export type PBLayout = 'full' | 'two' | 'text-photo' | 'three' | 'four' | 'big2' | 'six' | 'portraits' | 'quote';
export const PB_LAYOUTS: { id: PBLayout; name: string; photos: number }[] = [
  { id: 'full', name: 'Tràn trang đôi', photos: 1 },
  { id: 'two', name: '2 ảnh tràn', photos: 2 },
  { id: 'text-photo', name: 'Chữ + ảnh', photos: 1 },
  { id: 'three', name: '1 lớn + 2', photos: 3 },
  { id: 'four', name: '4 ảnh', photos: 4 },
  { id: 'big2', name: 'Khung + 2 nhỏ', photos: 3 },
  { id: 'six', name: '6 ảnh', photos: 6 },
  { id: 'portraits', name: 'Chân dung lớp', photos: 0 },
  { id: 'quote', name: 'Trang chữ', photos: 0 },
];
export const pbLayout = (id: string) => PB_LAYOUTS.find((l) => l.id === id) || PB_LAYOUTS[0];

const SEQ: Record<PBTheme, PBLayout[]> = {
  wedding: ['full', 'text-photo', 'three', 'two', 'big2', 'four', 'full', 'six', 'two', 'three', 'big2', 'four'],
  family: ['full', 'text-photo', 'four', 'three', 'two', 'six', 'big2', 'full', 'four', 'three', 'two', 'six'],
  travel: ['full', 'four', 'text-photo', 'six', 'two', 'three', 'big2', 'full', 'four', 'six', 'two', 'three'],
  yearbook: ['full', 'text-photo'],
  company: ['full', 'text-photo', 'four', 'six', 'three', 'two', 'big2', 'full', 'four', 'six', 'three', 'two'],
};
const YB_AFTER: PBLayout[] = ['four', 'six', 'three', 'two', 'big2', 'full', 'four', 'six', 'three', 'two'];

export interface PBSpread { layout: PBLayout; photos: number[]; caption: string; text?: string; from?: number; count?: number }
export interface PBOverride { layout?: PBLayout; shift?: number; caption?: string }

/** số chân dung mỗi trang đôi (theo khổ trang) */
export function portraitGrid(W: number, H: number) {
  const land = W > H * 1.15;
  const cols = land ? 4 : 3, rows = land ? 2 : 3;
  return { cols, rows, perSpread: cols * rows * 2 };
}

/** Tự dàn trang: chuỗi bố cục theo chủ đề, ảnh lấy lần lượt từ kho (hết thì quay vòng), chú thích theo thứ tự. */
export function autoSpreads(spec: PBSpec, data: PBData, nPhotos: number, nStudents: number, ov: Record<number, PBOverride> = {}): PBSpread[] {
  const n = spec.pages / 2;
  const sz = pbSize(spec.size);
  let seq: PBLayout[];
  if (spec.theme === 'yearbook') {
    const per = portraitGrid(sz.wMm, sz.hMm).perSpread;
    const need = Math.max(1, Math.min(n - 3, Math.ceil(Math.max(1, nStudents) / per)));
    seq = [...SEQ.yearbook, ...Array(need).fill('portraits')];
    let k = 0; while (seq.length < n - 1) seq.push(YB_AFTER[k++ % YB_AFTER.length]);
  } else {
    const base = SEQ[spec.theme];
    seq = Array.from({ length: n - 1 }, (_, i) => base[i % base.length]);
  }
  seq = seq.slice(0, n - 1);
  seq.push('quote');
  const caps = (data.captions || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const out: PBSpread[] = [];
  let cur = 0, ci = 0, si = 0, textUsed = false;
  const portraitSpreads = seq.filter((l) => l === 'portraits').length;
  const perP = Math.ceil(Math.max(1, nStudents) / Math.max(1, portraitSpreads));
  for (let i = 0; i < n; i++) {
    const o = ov[i] || {};
    let layout = o.layout || seq[i];
    if (layout === 'portraits' && spec.theme !== 'yearbook') layout = 'four';
    const L = pbLayout(layout);
    const shift = o.shift || 0;
    const photos = nPhotos ? Array.from({ length: L.photos }, (_, k) => (((cur + shift + k) % nPhotos) + nPhotos) % nPhotos) : [];
    cur += L.photos;
    const sp: PBSpread = { layout, photos, caption: '' };
    if (layout === 'portraits') { sp.from = si; sp.count = Math.min(perP, Math.max(0, nStudents - si)); si += sp.count; }
    else if (layout !== 'quote') sp.caption = caps.length ? caps[ci++ % caps.length] : '';
    if (layout === 'text-photo') { sp.text = !textUsed ? data.intro || '' : ''; textUsed = true; }
    if (layout === 'quote') sp.text = data.ending || '';
    if (o.caption !== undefined) sp.caption = o.caption;
    out.push(sp);
  }
  return out;
}

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
function textW(t: string, size: number, fam: string, wt: number | string, italic = false): number {
  const s = t || '';
  if (typeof document === 'undefined') return s.length * size * 0.55;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.55;
  mctx.font = `${italic ? 'italic ' : ''}${wt} ${size}px "${fam}"`;
  return mctx.measureText(s).width;
}
const fitW = (t: string, maxW: number, size: number, fam: string, wt: number | string, italic = false, ls = 0) => {
  const n = Math.max(0, [...(t || '')].length - 1);
  const w = textW(t, size, fam, wt, italic) + size * ls * n;
  return w > maxW ? (size * maxW) / w : size;
};
function wrapLines(text: string, maxW: number, size: number, fam: string, wt: number | string, italic = false): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const t = cur ? `${cur} ${w}` : w;
      if (cur && textW(t, size, fam, wt, italic) > maxW) { out.push(cur); cur = w; } else cur = t;
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** cân dòng: tránh 1 chữ mồ côi ở dòng cuối */
function balance(lines: string[], maxW: number, size: number, fam: string, wt: number | string, italic = false): string[] {
  if (lines.length < 2) return lines;
  const last = lines[lines.length - 1], prev = lines[lines.length - 2];
  if (last.split(' ').length > 1) return lines;
  const pw = prev.split(' ');
  if (pw.length < 3) return lines;
  const moved = `${pw[pw.length - 1]} ${last}`;
  if (textW(moved, size, fam, wt, italic) > maxW) return lines;
  return [...lines.slice(0, -2), pw.slice(0, -1).join(' '), moved];
}
function fitBlock(text: string, maxW: number, maxH: number, size: number, minSize: number, maxLines: number, fam: string, wt: number | string, italic = false, lh = 1.3) {
  let s = size;
  for (let k = 0; k < 60; k++) {
    const lines = wrapLines(text, maxW, s, fam, wt, italic);
    const wide = Math.max(0, ...lines.map((l) => textW(l, s, fam, wt, italic)));
    if ((lines.length <= maxLines && lines.length * s * lh <= maxH && wide <= maxW + 0.01) || s <= minSize) {
      let ls = lines;
      if (s <= minSize) {
        // tới cỡ tối thiểu mà vẫn dài: cắt bớt dòng + dấu …
        const cap = Math.max(1, Math.min(maxLines, Math.floor(maxH / (s * lh))));
        if (ls.length > cap) { ls = ls.slice(0, cap); let l = ls[cap - 1]; while (l.length > 1 && textW(l + '…', s, fam, wt, italic) > maxW) l = l.slice(0, -1); ls[cap - 1] = l.trimEnd() + '…'; }
      }
      return { lines: balance(ls, maxW, s, fam, wt, italic), size: s };
    }
    s *= 0.94;
  }
  return { lines: wrapLines(text, maxW, s, fam, wt, italic), size: s };
}

// ---------- ảnh ----------
export interface PBPhoto { src: string; w: number; h: number; name?: string; sample?: boolean }
interface Rect { x: number; y: number; w: number; h: number }
const cover = (r: Rect, p: PBPhoto) => coverRect(r, { w: p.w, h: p.h, zoom: 1, px: 0, py: 0 });

function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
// ảnh minh hoạ thêm (người/thành phố/đường) — vẽ bằng code
function drawExtra(kind: string): string {
  const W = 1600, H = 1200;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d')!;
  const r = rnd(kind.length * 977 + kind.charCodeAt(0) * 13);
  const grad = (stops: [number, string][], y0 = 0, y1 = H) => { const g = x.createLinearGradient(0, y0, 0, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };
  const person = (cx: number, base: number, h: number, col: string, dress = false) => {
    x.fillStyle = col;
    const hr = h * 0.068, top = base - h;
    x.beginPath(); x.ellipse(cx, top + hr, hr * 0.88, hr, 0, 0, 7); x.fill();
    const sh = top + hr * 2.15, sw = h * (dress ? 0.095 : 0.125);
    x.beginPath();
    x.moveTo(cx - hr * 0.32, top + hr * 1.75); x.lineTo(cx + hr * 0.32, top + hr * 1.75);
    x.quadraticCurveTo(cx + sw * 0.85, sh - hr * 0.1, cx + sw, sh + hr * 0.9);
    if (dress) {
      x.lineTo(cx + sw * 0.62, base - h * 0.47);
      x.quadraticCurveTo(cx + h * 0.2, base - h * 0.12, cx + h * 0.25, base); x.lineTo(cx - h * 0.25, base);
      x.quadraticCurveTo(cx - h * 0.2, base - h * 0.12, cx - sw * 0.62, base - h * 0.47);
    } else {
      x.lineTo(cx + sw * 0.86, base - h * 0.47); x.lineTo(cx + sw * 0.62, base); x.lineTo(cx + hr * 0.18, base);
      x.lineTo(cx, base - h * 0.38); x.lineTo(cx - hr * 0.18, base); x.lineTo(cx - sw * 0.62, base); x.lineTo(cx - sw * 0.86, base - h * 0.47);
    }
    x.lineTo(cx - sw, sh + hr * 0.9);
    x.quadraticCurveTo(cx - sw * 0.85, sh - hr * 0.1, cx - hr * 0.32, top + hr * 1.75);
    x.closePath(); x.fill();
  };
  if (kind === 'couple') {
    x.fillStyle = grad([[0, '#F3B88B'], [0.5, '#F7D7B4'], [1, '#FCEBD9']], 0, H * 0.62); x.fillRect(0, 0, W, H);
    const sun = x.createRadialGradient(W * 0.5, H * 0.56, 0, W * 0.5, H * 0.56, 300); sun.addColorStop(0, 'rgba(255,250,235,1)'); sun.addColorStop(1, 'rgba(255,230,200,0)'); x.fillStyle = sun; x.fillRect(0, 0, W, H);
    x.fillStyle = grad([[0, '#E9B48E'], [1, '#7E6A86']], H * 0.6, H); x.fillRect(0, H * 0.6, W, H * 0.4);
    for (let i = 0; i < 80; i++) { x.fillStyle = `rgba(255,240,220,${0.2 + r() * 0.4})`; x.fillRect(W * 0.5 - 200 + r() * 400, H * 0.62 + i * 4.5, 30 + r() * 120, 2); }
    x.filter = 'blur(1.2px)';
    person(W * 0.465, H * 0.88, H * 0.44, '#3B2B3A'); person(W * 0.54, H * 0.88, H * 0.395, '#3B2B3A', true);
    x.strokeStyle = '#3B2B3A'; x.lineWidth = 11; x.lineCap = 'round'; x.beginPath(); x.moveTo(W * 0.49, H * 0.66); x.quadraticCurveTo(W * 0.503, H * 0.69, W * 0.518, H * 0.665); x.stroke();
    x.filter = 'none';
    x.fillStyle = 'rgba(59,43,58,0.25)'; x.beginPath(); x.ellipse(W * 0.5, H * 0.885, W * 0.09, H * 0.012, 0, 0, 7); x.fill();
  } else if (kind === 'flowers') {
    x.fillStyle = grad([[0, '#DCE7D3'], [1, '#B9CDB0']]); x.fillRect(0, 0, W, H);
    x.filter = 'blur(40px)'; for (let i = 0; i < 18; i++) { x.fillStyle = ['#9DB78E', '#E9F0E2', '#C8D9BE'][i % 3]; x.beginPath(); x.arc(r() * W, r() * H, 80 + r() * 160, 0, 7); x.fill(); } x.filter = 'none';
    for (let i = 0; i < 34; i++) {
      const cx = W * 0.5 + (r() - 0.5) * W * 0.5, cy = H * 0.45 + (r() - 0.5) * H * 0.45, R = 50 + r() * 60;
      const col = ['#F6D3D8', '#FFFFFF', '#F2B5C0', '#FBE7EA', '#E79AA9'][Math.floor(r() * 5)];
      for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; x.fillStyle = col; x.globalAlpha = 0.9; x.beginPath(); x.ellipse(cx + Math.cos(a) * R * 0.45, cy + Math.sin(a) * R * 0.45, R * 0.42, R * 0.3, a, 0, 7); x.fill(); }
      x.globalAlpha = 1; x.fillStyle = '#F4D58D'; x.beginPath(); x.arc(cx, cy, R * 0.16, 0, 7); x.fill();
    }
  } else if (kind === 'city') {
    x.fillStyle = grad([[0, '#141A38'], [0.6, '#3B3F73'], [1, '#C97C7C']], 0, H * 0.8); x.fillRect(0, 0, W, H);
    for (let b = 0; b < 26; b++) {
      const bw = 50 + r() * 90, bh = 180 + r() * 520, bx = b * (W / 24) - 30 + r() * 20;
      x.fillStyle = ['#1B1E3A', '#23264A', '#191B33'][b % 3]; x.fillRect(bx, H * 0.82 - bh, bw, bh);
      for (let wy = H * 0.82 - bh + 14; wy < H * 0.8; wy += 22) for (let wx = bx + 8; wx < bx + bw - 10; wx += 16) if (r() > 0.55) { x.fillStyle = `rgba(255,214,140,${0.5 + r() * 0.5})`; x.fillRect(wx, wy, 7, 10); }
    }
    x.fillStyle = grad([[0, '#2A2C4F'], [1, '#0E0F1F']], H * 0.82, H); x.fillRect(0, H * 0.82, W, H * 0.18);
    for (let i = 0; i < 120; i++) { x.fillStyle = `rgba(255,200,130,${0.15 + r() * 0.35})`; x.fillRect(r() * W, H * 0.83 + r() * H * 0.15, 30 + r() * 60, 2); }
  } else if (kind === 'road') {
    x.fillStyle = grad([[0, '#8EC5E8'], [1, '#EAF4F8']], 0, H * 0.5); x.fillRect(0, 0, W, H);
    const ridge = (base: number, amp: number, col: string, f: number, ph: number) => { x.beginPath(); x.moveTo(0, H); for (let i = 0; i <= W; i += 8) x.lineTo(i, base + Math.sin(i * f + ph) * amp + Math.sin(i * f * 2.3 + ph) * amp * 0.4); x.lineTo(W, H); x.closePath(); x.fillStyle = col; x.fill(); };
    ridge(H * 0.42, 50, '#7FA88F', 0.004, 1); ridge(H * 0.5, 40, '#5E8E6C', 0.006, 2.5); ridge(H * 0.58, 30, '#4E7A57', 0.005, 0.3);
    x.fillStyle = '#5B5F66'; x.beginPath(); x.moveTo(W * 0.49, H * 0.55); x.lineTo(W * 0.51, H * 0.55); x.lineTo(W * 0.8, H); x.lineTo(W * 0.2, H); x.closePath(); x.fill();
    x.strokeStyle = '#F3E6B5'; x.setLineDash([30, 40]); x.lineWidth = 8; x.beginPath(); x.moveTo(W * 0.5, H * 0.56); x.lineTo(W * 0.5, H); x.stroke(); x.setLineDash([]);
    for (let i = 0; i < 30; i++) { const tx = r() < 0.5 ? r() * W * 0.3 : W * 0.7 + r() * W * 0.3, ty = H * 0.55 + r() * H * 0.3; x.fillStyle = '#2F5A3C'; x.beginPath(); x.moveTo(tx, ty - 90); x.lineTo(tx + 30, ty); x.lineTo(tx - 30, ty); x.closePath(); x.fill(); }
  } else if (kind === 'kid') {
    x.fillStyle = grad([[0, '#FDF1E6'], [1, '#F6DDE4']]); x.fillRect(0, 0, W, H);
    x.filter = 'blur(50px)'; for (let i = 0; i < 10; i++) { x.fillStyle = ['#FFFFFF', '#F9D3DC', '#DDEBF7'][i % 3]; x.beginPath(); x.arc(r() * W, r() * H, 100 + r() * 180, 0, 7); x.fill(); } x.filter = 'none';
    x.fillStyle = '#EED9C4'; x.fillRect(0, H * 0.78, W, H * 0.22);
    person(W * 0.48, H * 0.86, H * 0.36, '#6B4E5A');
    x.strokeStyle = '#6B4E5A'; x.lineWidth = 4; x.beginPath(); x.moveTo(W * 0.53, H * 0.6); x.quadraticCurveTo(W * 0.6, H * 0.45, W * 0.62, H * 0.3); x.stroke();
    x.fillStyle = '#E86F7E'; x.beginPath(); x.ellipse(W * 0.62, H * 0.24, 70, 85, 0, 0, 7); x.fill();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.beginPath(); x.ellipse(W * 0.6, H * 0.21, 16, 26, -0.4, 0, 7); x.fill();
  } else if (kind === 'group') {
    x.fillStyle = grad([[0, '#BFD9EE'], [0.55, '#E8F1F6'], [1, '#F2EEE2']], 0, H * 0.55); x.fillRect(0, 0, W, H);
    x.fillStyle = '#E9D9A8'; x.fillRect(0, H * 0.18, W, H * 0.36); // dãy nhà trường vàng
    for (let i = 0; i < 14; i++) { x.fillStyle = '#D7C38C'; x.fillRect(40 + i * 115, H * 0.24, 60, H * 0.1); }
    x.filter = 'blur(18px)'; for (let i = 0; i < 9; i++) { x.fillStyle = ['#7FAE76', '#93BE84', '#6E9E68'][i % 3]; x.beginPath(); x.arc(r() * W, H * 0.2 + r() * H * 0.12, 90 + r() * 80, 0, 7); x.fill(); } x.filter = 'none';
    x.fillStyle = '#CFC7B4'; x.fillRect(0, H * 0.54, W, H * 0.46);
    const kid = (cx: number, base: number, h: number, girl: boolean) => {
      const hr = h * 0.085, top = base - h;
      x.fillStyle = '#2C3E66'; x.beginPath(); x.roundRect(cx - h * 0.13, base - h * 0.5, h * 0.26, h * 0.5, 6); x.fill(); // quần/váy
      x.fillStyle = '#F6F6F3'; x.beginPath(); x.roundRect(cx - h * 0.17, top + hr * 2.1, h * 0.34, h * 0.42, [h * 0.08, h * 0.08, 6, 6]); x.fill(); // áo trắng
      x.fillStyle = '#E2B596'; x.beginPath(); x.ellipse(cx, top + hr * 1.15, hr * 0.85, hr, 0, 0, 7); x.fill(); // mặt
      x.fillStyle = '#1E1A1A'; x.beginPath(); x.ellipse(cx, top + hr * 0.75, hr * 0.92, hr * 0.62, 0, Math.PI, 0); x.fill(); // tóc
      if (girl) { x.fillRect(cx - hr * 0.92, top + hr * 0.7, hr * 0.22, hr * 1.5); x.fillRect(cx + hr * 0.7, top + hr * 0.7, hr * 0.22, hr * 1.5); }
    };
    x.filter = 'blur(1.4px)';
    for (let i = 0; i < 12; i++) kid(W * 0.07 + i * W * 0.078, H * 0.78, H * (0.4 + r() * 0.05), r() > 0.5);
    for (let i = 0; i < 11; i++) kid(W * 0.11 + i * W * 0.078, H * 0.9, H * (0.38 + r() * 0.04), r() > 0.5);
    for (let i = 0; i < 10; i++) kid(W * 0.15 + i * W * 0.078, H * 1.02, H * (0.36 + r() * 0.04), r() > 0.5);
    x.filter = 'none';
  } else { // cafe
    x.fillStyle = grad([[0, '#3A2A22'], [1, '#6E4C38']]); x.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) { const g2 = x.createRadialGradient(0, 0, 0, 0, 0, 1); void g2; x.fillStyle = `rgba(255,${190 + Math.floor(r() * 50)},${120 + Math.floor(r() * 60)},${0.15 + r() * 0.35})`; x.beginPath(); x.arc(r() * W, r() * H * 0.6, 20 + r() * 70, 0, 7); x.fill(); }
    x.fillStyle = '#8A6A52'; x.fillRect(0, H * 0.7, W, H * 0.3);
    x.fillStyle = '#F4EFE6'; x.beginPath(); x.ellipse(W * 0.5, H * 0.72, 200, 40, 0, 0, 7); x.fill();
    x.fillStyle = '#FFFFFF'; x.fillRect(W * 0.43, H * 0.5, W * 0.14, H * 0.2);
    x.fillStyle = '#7A4B2A'; x.beginPath(); x.ellipse(W * 0.5, H * 0.5, W * 0.07, 22, 0, 0, 7); x.fill();
    x.strokeStyle = '#FFFFFF'; x.lineWidth = 16; x.beginPath(); x.arc(W * 0.58, H * 0.6, 45, -1.2, 1.2); x.stroke();
  }
  const vg = x.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, W * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.12)');
  x.fillStyle = vg; x.fillRect(0, 0, W, H);
  return c.toDataURL('image/jpeg', 0.86);
}
const extraCache = new Map<string, PBPhoto>();
const extra = (k: string, name: string): PBPhoto => {
  if (!extraCache.has(k)) extraCache.set(k, { src: drawExtra(k), w: 1600, h: 1200, name, sample: true });
  return extraCache.get(k)!;
};
/** bộ ảnh minh hoạ theo chủ đề (chỉ chạy trên trình duyệt) */
export function pbSamples(sample: string): PBPhoto[] {
  const cv = samplePhotos().slice(0, 4).map((p) => ({ src: p.src, w: p.w, h: p.h, name: p.name, sample: true }));
  const [sunset, sea, hills, abstract] = cv;
  const E = (k: string, n: string) => extra(k, n);
  const sets: Record<string, PBPhoto[]> = {
    wedding: [E('couple', 'Đôi uyên ương'), E('flowers', 'Hoa cưới'), sunset, hills, sea, E('cafe', 'Cà phê hẹn hò'), abstract, E('city', 'Phố đêm')],
    baby: [E('kid', 'Bé và bóng bay'), hills, E('flowers', 'Hoa'), sea, abstract, sunset],
    family: [E('kid', 'Bé và bóng bay'), sea, hills, E('cafe', 'Cà phê'), sunset, E('flowers', 'Hoa'), E('road', 'Đường quê')],
    travel: [E('road', 'Đường đèo'), hills, sea, E('city', 'Phố đêm'), sunset, E('cafe', 'Quán cà phê'), abstract],
    yearbook: [E('group', 'Ảnh tập thể'), hills, E('city', 'Thành phố'), E('cafe', 'Quán quen'), sea, sunset],
    company: [E('group', 'Đội ngũ'), E('city', 'Thành phố'), E('cafe', 'Phòng làm việc'), E('road', 'Hành trình'), hills, sea],
  };
  return sets[sample] || sets.wedding;
}

// ---------- vị trí ô ảnh / chữ trên trang đôi (mm, gốc trên-trái trang trái) ----------
interface SpreadGeo { rects: Rect[]; text?: Rect; cap?: Rect; capOver?: boolean }
export function spreadGeo(layout: PBLayout, W: number, H: number): SpreadGeo {
  const s = Math.min(W, H);
  const m = Math.round(s * 0.075 * 10) / 10, g = Math.round(s * 0.022 * 10) / 10;
  const capH = Math.max(5, m * 0.55);
  const margin = (page: 0 | 1): Rect => ({ x: page * W + m, y: H - m + (m - capH) / 2 - 0.2, w: W - m * 2, h: capH }); // chú thích nằm ở lề dưới
  const over: Rect = { x: W + m, y: H - m * 0.55 - capH, w: W - m * 2, h: capH };
  switch (layout) {
    case 'full': return { rects: [{ x: 0, y: 0, w: W * 2, h: H }], cap: over, capOver: true };
    case 'two': return { rects: [{ x: 0, y: 0, w: W, h: H }, { x: W, y: 0, w: W, h: H }], cap: over, capOver: true };
    case 'text-photo': return { rects: [{ x: W, y: 0, w: W, h: H }], text: { x: m * 1.35, y: m * 1.5, w: W - m * 2.7, h: H - m * 3 } };
    case 'three': {
      const h = (H - m * 2 - g) / 2;
      return { rects: [{ x: 0, y: 0, w: W, h: H }, { x: W + m, y: m, w: W - m * 2, h }, { x: W + m, y: m + h + g, w: W - m * 2, h }], cap: margin(1) };
    }
    case 'four': {
      const h = (H - m * 2 - g) / 2;
      return { rects: [0, 1].flatMap((p) => [{ x: p * W + m, y: m, w: W - m * 2, h }, { x: p * W + m, y: m + h + g, w: W - m * 2, h }]), cap: margin(1) };
    }
    case 'big2': {
      const m2 = m * 1.5, h = (H - m * 2 - g - capH * 1.6) / 2;
      return {
        rects: [{ x: m, y: m, w: W - m * 2, h: H - m * 2 }, { x: W + m2, y: m, w: W - m2 * 2, h }, { x: W + m2, y: m + h + g, w: W - m2 * 2, h }],
        cap: { x: W + m2, y: m + h * 2 + g + capH * 0.3, w: W - m2 * 2, h: capH },
      };
    }
    case 'six': {
      const ih = H - m * 2 - g, h1 = ih * 0.58, h2 = ih - h1, hw = (W - m * 2 - g) / 2;
      return {
        rects: [
          { x: m, y: m, w: W - m * 2, h: h1 }, { x: m, y: m + h1 + g, w: hw, h: h2 }, { x: m + hw + g, y: m + h1 + g, w: hw, h: h2 },
          { x: W + m, y: m, w: hw, h: h2 }, { x: W + m + hw + g, y: m, w: hw, h: h2 }, { x: W + m, y: m + h2 + g, w: W - m * 2, h: h1 },
        ],
        cap: margin(1),
      };
    }
    case 'quote': return { rects: [], text: { x: W + m * 1.4, y: m * 1.6, w: W - m * 2.8, h: H - m * 3.2 } };
    default: return { rects: [] };
  }
}

/** dpi thực của từng ảnh trong kho (lấy ô nhỏ dpi nhất mà ảnh xuất hiện) */
export function photoMinDpi(spec: PBSpec, spreads: PBSpread[], pool: PBPhoto[], coverIdx: number): number[] {
  const sz = pbSize(spec.size);
  const out = pool.map(() => Infinity);
  spreads.forEach((sp) => {
    const geo = spreadGeo(sp.layout, sz.wMm, sz.hMm);
    geo.rects.forEach((r, k) => { const i = sp.photos[k]; if (i !== undefined && pool[i]) out[i] = Math.min(out[i], photoDpi(r, { ...pool[i], zoom: 1, px: 0, py: 0 })); });
  });
  const cd = pbCoverDims(spec);
  if (pool[coverIdx]) {
    const r = spec.cover === 'full' ? { x: 0, y: 0, w: cd.bw, h: cd.bh } : spec.cover === 'class' ? { x: 0, y: 0, w: cd.bw, h: cd.bh * 0.4 } : { x: 0, y: 0, w: cd.bw * 0.72, h: cd.bh * 0.5 };
    out[coverIdx] = Math.min(out[coverIdx], photoDpi(r, { ...pool[coverIdx], zoom: 1, px: 0, py: 0 }));
  }
  return out.map((d) => (Number.isFinite(d) ? d : 0));
}

// ---------- vẽ ----------
function Img({ r, p, clip }: { r: Rect; p?: PBPhoto; clip: string }) {
  if (!p) return <rect x={r.x} y={r.y} width={r.w} height={r.h} fill="#D9D4CC" />;
  const c = cover(r, p);
  return (
    <g>
      <clipPath id={clip}><rect x={r.x} y={r.y} width={r.w} height={r.h} /></clipPath>
      <image href={p.src} x={c.x} y={c.y} width={c.w} height={c.h} preserveAspectRatio="none" clipPath={`url(#${clip})`} />
    </g>
  );
}
/** ô ảnh chạm mép trang → nới ra lề xén (bản in) */
const bleedRect = (r: Rect, W2: number, H: number, B: number): Rect => {
  if (!B) return r;
  const x0 = r.x <= 0.01 ? r.x - B : r.x, y0 = r.y <= 0.01 ? r.y - B : r.y;
  const x1 = r.x + r.w >= W2 - 0.01 ? r.x + r.w + B : r.x + r.w, y1 = r.y + r.h >= H - 0.01 ? r.y + r.h + B : r.y + r.h;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
};

// chân dung giả (khi chưa có ảnh): nền màu + bóng người — vẽ SVG
function Avatar({ r, i, pal, clip }: { r: Rect; i: number; pal: PBPalette; clip: string }) {
  const hues = ['#C9D7E8', '#E8D6C9', '#D3E6D9', '#E6D3E2', '#E9E2C8', '#CFE3E6'];
  const bg = hues[i % hues.length];
  const cx = r.x + r.w / 2, hr = r.w * 0.2;
  return (
    <g>
      <clipPath id={clip}><rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.w * 0.05} /></clipPath>
      <g clipPath={`url(#${clip})`}>
        <rect x={r.x} y={r.y} width={r.w} height={r.h} fill={bg} />
        <circle cx={cx} cy={r.y + r.h * 0.42} r={hr} fill={pal.ink} opacity={0.32} />
        <ellipse cx={cx} cy={r.y + r.h * 1.02} rx={r.w * 0.42} ry={r.h * 0.36} fill={pal.ink} opacity={0.32} />
      </g>
    </g>
  );
}

function Ornament({ cx, cy, w, color }: { cx: number; cy: number; w: number; color: string }) {
  return (
    <g stroke={color} strokeWidth={w * 0.012} fill="none" strokeLinecap="round">
      <path d={`M${cx - w / 2} ${cy} H${cx - w * 0.08} M${cx + w * 0.08} ${cy} H${cx + w / 2}`} />
      <path d={`M${cx} ${cy - w * 0.05} L${cx + w * 0.05} ${cy} L${cx} ${cy + w * 0.05} L${cx - w * 0.05} ${cy} Z`} fill={color} stroke="none" />
    </g>
  );
}

export type PBMode = 'face' | 'tex' | 'print';

export function SpreadSvg({ spec, data, spread, pool, portraits = [], mode = 'face', style }: {
  spec: PBSpec; data: PBData; spread: PBSpread; pool: PBPhoto[]; portraits?: PBPhoto[]; mode?: PBMode; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const sz = pbSize(spec.size);
  const W = sz.wMm, H = sz.hMm, W2 = W * 2;
  const B = mode === 'print' ? PB_BLEED : 0;
  const pal = pbPalette(spec.palette);
  const f = cvFont(spec.font);
  const disp = f.family, dw = f.weight;
  const corp = spec.theme === 'yearbook' || spec.theme === 'company';
  const body = corp ? BODY : SERIF, bw = corp ? 600 : 600;
  const geo = spreadGeo(spread.layout, W, H);
  const s = Math.min(W, H);
  const els: ReactNode[] = [];

  geo.rects.forEach((r, k) => {
    const rr = bleedRect(r, W2, H, B);
    els.push(<Img key={`p${k}`} r={rr} p={pool[spread.photos[k]]} clip={`${uid}c${k}`} />);
  });

  // chú thích
  if (geo.cap && spread.caption) {
    const c = geo.cap;
    const size = fitW(spread.caption, c.w * (geo.capOver ? 0.7 : 1), s * 0.02, body, bw, !corp);
    const tw = textW(spread.caption, size, body, bw, !corp);
    if (geo.capOver) {
      const pw = tw + size * 1.6, ph = size * 1.9;
      const px = c.x + c.w - pw, py = c.y + c.h - ph;
      els.push(
        <g key="cap">
          <rect x={px} y={py} width={pw} height={ph} rx={ph / 2} fill={pal.page} opacity={0.88} />
          <text x={px + pw / 2} y={py + ph / 2 + size * 0.35} textAnchor="middle" fontFamily={`"${body}"`} fontWeight={bw} fontStyle={corp ? undefined : 'italic'} fontSize={size} fill={pal.ink} data-pb="cap">{spread.caption}</text>
        </g>,
      );
    } else {
      els.push(<text key="cap" x={c.x + c.w} y={c.y + c.h * 0.72} textAnchor="end" fontFamily={`"${body}"`} fontWeight={bw} fontStyle={corp ? undefined : 'italic'} fontSize={size} fill={pal.sub} data-pb="cap">{spread.caption}</text>);
    }
  }

  // trang chữ + ảnh
  if (spread.layout === 'text-photo' && geo.text) {
    const t = geo.text;
    const head = spread.caption || data.title || '';
    const yb = spec.theme === 'yearbook';
    const cw = t.w * 0.9;
    const hs = fitBlock(head, cw, t.h * 0.28, s * (f.script ? 0.1 : 0.072), s * 0.035, 2, disp, dw, false, 1.12);
    const para = spread.text || (yb ? `Giáo viên chủ nhiệm: ${data.teacher || ''}` : data.names || '');
    const foot = yb ? [data.school, data.teacher ? `GVCN: ${data.teacher}` : ''].filter(Boolean).join(' · ') : (data.date || '');
    const footS = foot ? fitW(foot.toUpperCase(), t.w, s * 0.018, BODY, 600, false, 0.08) : 0;
    const headH = hs.lines.length * hs.size * 1.12;
    const gapA = s * 0.035, gapB = s * 0.05;
    const avail = t.h - headH - gapA - gapB - (foot ? footS * 3 : 0);
    const ps = fitBlock(para, cw, Math.max(s * 0.05, avail), s * 0.03, s * 0.016, 14, body, bw, !corp, 1.45);
    const paraH = ps.lines.length * ps.size * 1.45;
    const blockH = headH + gapA + gapB + paraH;
    let y = t.y + Math.max(0, (t.h - (foot ? footS * 3 : 0) - blockH) * 0.42);
    hs.lines.forEach((l, i) => els.push(<text key={`h${i}`} x={t.x} y={y + hs.size * 0.92 + i * hs.size * 1.12} fontFamily={`"${disp}"`} fontWeight={dw} fontSize={hs.size} fill={pal.ink} data-pb="head">{l}</text>));
    y += headH + gapA;
    els.push(<rect key="hr" x={t.x} y={y - s * 0.012} width={t.w * 0.16} height={s * 0.0045} fill={pal.accent} />);
    y += gapB;
    ps.lines.forEach((l, i) => els.push(<text key={`b${i}`} x={t.x} y={y + ps.size * 0.4 + i * ps.size * 1.45} fontFamily={`"${body}"`} fontWeight={bw} fontStyle={corp ? undefined : 'italic'} fontSize={ps.size} fill={pal.ink} opacity={0.88} data-pb="body">{l}</text>));
    if (foot) els.push(<text key="ft" x={t.x} y={t.y + t.h} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={footS} fill={pal.sub} letterSpacing={footS * 0.08} data-pb="foot">{foot.toUpperCase()}</text>);
  }

  // trang kết
  if (spread.layout === 'quote' && geo.text) {
    const t = geo.text;
    const cx = t.x + t.w / 2;
    const q = fitBlock(spread.text || '', t.w, t.h * 0.42, s * (f.script ? 0.085 : 0.06), s * 0.03, 3, disp, dw, false, 1.18);
    const blockH = q.lines.length * q.size * 1.18;
    const y0 = t.y + t.h * 0.42 - blockH / 2;
    q.lines.forEach((l, i) => els.push(<text key={`q${i}`} x={cx} y={y0 + q.size + i * q.size * 1.18} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={q.size} fill={pal.ink} data-pb="quote">{l}</text>));
    const yo = y0 + blockH + s * 0.05;
    els.push(<Ornament key="orn" cx={cx} cy={yo} w={t.w * 0.4} color={pal.accent} />);
    const nm = data.names || '';
    const ns = fitW(nm, t.w, s * 0.024, body, bw, !corp);
    if (nm) els.push(<text key="nm" x={cx} y={yo + s * 0.06} textAnchor="middle" fontFamily={`"${body}"`} fontWeight={bw} fontStyle={corp ? undefined : 'italic'} fontSize={ns} fill={pal.sub} data-pb="names">{nm}</text>);
    const dt = data.date || '';
    const ds = fitW(dt, t.w, s * 0.016, BODY, 600, false, 0.12);
    if (dt) els.push(<text key="dt" x={cx} y={yo + s * 0.06 + ns * 1.9} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={ds} fill={pal.sub} letterSpacing={ds * 0.12} data-pb="date">{dt.toUpperCase()}</text>);
    // trang trái: chữ lồng + đường viền mảnh
    const ini = (data.names || data.title || 'M').split(/&|·|,/).map((x) => x.trim().split(/\s+/).pop()?.[0] || '').filter(Boolean).slice(0, 2).join(' & ') || '♥';
    const is = fitW(ini, W * 0.5, s * 0.1, disp, dw);
    els.push(<rect key="fr" x={s * 0.1} y={s * 0.1} width={W - s * 0.2} height={H - s * 0.2} fill="none" stroke={pal.accent} strokeWidth={s * 0.0025} opacity={0.7} />);
    els.push(<text key="ini" x={W / 2} y={H / 2 + is * 0.35} textAnchor="middle" fontFamily={`"${disp}"`} fontWeight={dw} fontSize={is} fill={pal.accent} opacity={0.9} data-pb="ini">{ini}</text>);
  }

  // chân dung lớp
  if (spread.layout === 'portraits') {
    const students = parseStudents(data.students || '').slice(spread.from || 0, (spread.from || 0) + (spread.count || 0));
    const { cols, rows: maxRows } = portraitGrid(W, H);
    const m = s * 0.07, g = s * 0.025;
    const top = m * 1.1;
    const perPage = [Math.ceil(students.length / 2), Math.floor(students.length / 2)];
    const rows = Math.max(1, Math.min(maxRows, Math.ceil(Math.max(...perPage) / cols)));
    const cw = (W - m * 2 - g * (cols - 1)) / cols, ch = Math.min((H - top - m - g * (maxRows - 1)) / maxRows * 1.35, (H - top - m - g * (rows - 1)) / rows);
    const txtH = Math.max(s * 0.07, ch * 0.28);
    const ph = Math.min(cw * 0.95 * 1.25, ch - txtH), pw = ph / 1.25;
    const gridH = rows * ch + (rows - 1) * g;
    const y0 = top + Math.max(0, (H - top - m - gridH) / 2);
    // nhãn lớp ở lề trên
    const lbl = [data.title, data.school].filter(Boolean).join(' · ');
    const ls = fitW(lbl.toUpperCase(), W - m * 2, s * 0.016, BODY, 600, false, 0.12);
    if (lbl) els.push(<text key="lbl" x={m} y={top * 0.62} fontFamily={`"${BODY}"`} fontWeight={600} fontSize={ls} fill={pal.sub} letterSpacing={ls * 0.12} data-pb="lbl">{lbl.toUpperCase()}</text>);
    students.forEach((st, k) => {
      const page = k < perPage[0] ? 0 : 1, j = page ? k - perPage[0] : k;
      const nIn = perPage[page], rowN = Math.floor(j / cols), inRow = Math.min(cols, nIn - rowN * cols);
      const rowW = inRow * cw + (inRow - 1) * g; // hàng cuối thiếu người → canh giữa
      const cx = page * W + (W - rowW) / 2 + (j % cols) * (cw + g) + cw / 2;
      const cy = y0 + rowN * (ch + g);
      const r = { x: cx - pw / 2, y: cy, w: pw, h: ph };
      const idx = (spread.from || 0) + k;
      const p = portraits[idx];
      if (p) {
        const c = cover(r, p);
        els.push(<g key={`st${k}`}><clipPath id={`${uid}s${k}`}><rect x={r.x} y={r.y} width={r.w} height={r.h} rx={r.w * 0.05} /></clipPath><image href={p.src} x={c.x} y={c.y} width={c.w} height={c.h} preserveAspectRatio="none" clipPath={`url(#${uid}s${k})`} /></g>);
      } else els.push(<Avatar key={`st${k}`} r={r} i={idx} pal={pal} clip={`${uid}s${k}`} />);
      const nsz = fitW(st.name, cw, s * 0.02, BODY, 800);
      const ny = cy + ph + nsz * 1.25;
      els.push(<text key={`sn${k}`} x={cx} y={ny} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={nsz} fill={pal.ink} data-pb="sname">{st.name}</text>);
      if (st.quote) {
        const qh = ch - ph - nsz * 1.6;
        const q = fitBlock(`“${st.quote}”`, cw, qh, s * 0.0155, s * 0.0105, 2, SERIF, 500, true, 1.2);
        q.lines.forEach((l, i) => els.push(<text key={`sq${k}-${i}`} x={cx} y={ny + nsz * 0.35 + q.size * (1.05 + i * 1.2)} textAnchor="middle" fontFamily={`"${SERIF}"`} fontWeight={500} fontStyle="italic" fontSize={q.size} fill={pal.sub} data-pb="squote">{l}</text>));
      }
    });
  }

  return (
    <svg viewBox={`${-B} ${-B} ${W2 + B * 2} ${H + B * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-pb-spread={spread.layout}>
      <defs>
        <linearGradient id={`${uid}fold`} x1="0" x2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="0.47" stopColor="#000" stopOpacity="0.09" />
          <stop offset="0.5" stopColor="#000" stopOpacity="0.16" /><stop offset="0.53" stopColor="#000" stopOpacity="0.09" /><stop offset="1" stopColor="#000" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={-B} y={-B} width={W2 + B * 2} height={H + B * 2} fill={pal.page} />
      {els}
      {mode === 'face' && <rect x={W - s * 0.05} y={0} width={s * 0.1} height={H} fill={`url(#${uid}fold)`} pointerEvents="none" />}
    </svg>
  );
}

// ---------- bìa ----------
/** mode: 'front' = chỉ mặt bìa (thumbnail); 'tex' = lưng | gáy | mặt (3D); 'print' = file in bìa bồi (gấp mép + bản lề + lề xén) */
export function CoverSvg({ spec, data, photo, mode = 'tex', style }: {
  spec: PBSpec; data: PBData; photo?: PBPhoto; mode?: 'front' | 'tex' | 'print'; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const d = pbCoverDims(spec);
  const pal = pbPalette(spec.palette);
  const f = cvFont(spec.font);
  const disp = f.family, dw = f.weight;
  const corp = spec.theme === 'yearbook' || spec.theme === 'company';
  const body = corp ? BODY : SERIF;
  const { bw, bh, spine } = d;
  const B = mode === 'print' ? PB_BLEED : 0;
  // gốc toạ độ từng mảng
  let fx: number, fy: number, bx: number, sx: number, VW: number, VH: number;
  if (mode === 'front') { fx = 0; fy = 0; bx = -9999; sx = -9999; VW = bw; VH = bh; }
  else if (mode === 'tex') { bx = 0; sx = bw; fx = bw + spine; fy = 0; VW = bw * 2 + spine; VH = bh; }
  else { bx = d.backX; sx = d.spineX; fx = d.frontX; fy = PB_TURN; VW = d.CW; VH = d.CH; }
  const by = fy;
  const els: ReactNode[] = [];
  const s = Math.min(bw, bh);
  const dark = ['mono', 'teal', 'navy', 'terracotta'].includes(pal.id);
  const fullPhoto = spec.cover === 'full';
  // ảnh tràn bìa: nới sang gấp mép + lề xén ở mép ngoài/đầu/chân
  const front: Rect = { x: fx, y: fy, w: bw, h: bh };
  const ext: Rect = mode === 'print' ? { x: fx, y: -B, w: VW + B - fx, h: VH + B * 2 } : front;

  if (fullPhoto) {
    els.push(<Img key="fp" r={ext} p={photo} clip={`${uid}fp`} />);
    els.push(<rect key="sh" x={ext.x} y={fy + bh * 0.5} width={ext.w} height={ext.y + ext.h - (fy + bh * 0.5)} fill={`url(#${uid}shade)`} />);
  }
  const cx = fx + bw / 2;
  const T = (key: string, txt: string, y: number, size: number, fam: string, wt: number, fill: string, extra: Partial<{ italic: boolean; ls: number; tag: string }> = {}) =>
    els.push(<text key={key} x={cx} y={y} textAnchor="middle" fontFamily={`"${fam}"`} fontWeight={wt} fontStyle={extra.italic ? 'italic' : undefined} fontSize={size} fill={fill} letterSpacing={extra.ls ? size * extra.ls : undefined} data-pb={extra.tag || 'cover'}>{txt}</text>);

  const title = data.title || '', names = data.names || '', date = data.date || '';
  if (spec.cover === 'full') {
    const tb = fitBlock(title, bw * 0.84, bh * 0.22, s * (f.script ? 0.15 : 0.11), s * 0.05, 2, disp, dw, false, 1.08);
    const ns = fitW(names, bw * 0.84, s * 0.035, body, 600, !corp);
    const ds = fitW(date, bw * 0.84, s * 0.022, BODY, 600, false, 0.14);
    const yEnd = fy + bh - s * 0.09;
    const yD = yEnd, yN = yD - ds * 1.9, yT = yN - Math.max(ns * 1.5, tb.size * 0.34 + ns * 1.15) - (tb.lines.length - 1) * tb.size * 1.08;
    tb.lines.forEach((l, i) => T(`t${i}`, l, yT + i * tb.size * 1.08, tb.size, disp, dw, '#FFFFFF', { tag: 'ctitle' }));
    if (names) T('n', names, yN, ns, body, 600, '#FFFFFF', { italic: !corp, tag: 'cnames' });
    if (date) T('d', date.toUpperCase(), yD, ds, BODY, 600, '#FFFFFF', { ls: 0.14, tag: 'cdate' });
  } else if (spec.cover === 'window' || spec.cover === 'linen') {
    const win = spec.cover === 'window';
    // đo khối chữ trước → ảnh co lại cho vừa (bìa ngang A4 thấp)
    const tb = fitBlock(title, bw * 0.8, bh * 0.16, s * (f.script ? 0.11 : 0.08), s * 0.04, 2, disp, dw, false, 1.08);
    const ns = fitW(names, bw * 0.8, s * 0.032, body, 600, !corp);
    const ds = fitW(date, bw * 0.7, s * 0.02, BODY, 600, false, 0.16);
    const gapTN = Math.max(s * 0.06, tb.size * 0.34 + ns * 1.1);
    const textH = tb.size * 0.8 + (tb.lines.length - 1) * tb.size * 1.08 + (names ? gapTN + ns * 0.2 : 0) + (date ? ns * 1.7 + ds * 0.3 : 0);
    const topM = bh * 0.1, botM = s * 0.07, gapPT = s * 0.07;
    const maxPh = bh - topM - botM - gapPT - textH;
    const ph0 = win ? bh * 0.5 : bw * 0.38;
    const phh = Math.max(s * 0.18, Math.min(ph0, maxPh));
    const pw = win ? Math.min(bw * 0.72, phh * 1.44) : phh;
    const pr: Rect = { x: fx + (bw - pw) / 2, y: fy + topM + Math.max(0, (maxPh - phh) * (win ? 0.25 : 0.45)), w: pw, h: phh };
    els.push(<rect key="pf" x={pr.x - s * 0.012} y={pr.y - s * 0.012} width={pr.w + s * 0.024} height={pr.h + s * 0.024} fill={win ? '#FFFFFF' : pal.coverInk} opacity={win ? 0.95 : 0.85} />);
    els.push(<Img key="pi" r={pr} p={photo} clip={`${uid}pi`} />);
    if (win) els.push(<rect key="bd" x={fx + s * 0.04} y={fy + s * 0.04} width={bw - s * 0.08} height={bh - s * 0.08} fill="none" stroke={pal.coverInk} strokeWidth={s * 0.003} opacity={0.6} />);
    const top = pr.y + pr.h + gapPT;
    tb.lines.forEach((l, i) => T(`t${i}`, l, top + tb.size * 0.8 + i * tb.size * 1.08, tb.size, disp, dw, pal.coverInk, { tag: 'ctitle' }));
    let y = top + tb.size * 0.8 + (tb.lines.length - 1) * tb.size * 1.08 + gapTN;
    if (names) { T('n', names, y, ns, body, 600, pal.coverInk, { italic: !corp, tag: 'cnames' }); y += ns * 1.7; }
    if (date) T('d', date.toUpperCase(), y, ds, BODY, 600, pal.coverInk, { ls: 0.16, tag: 'cdate' });
  } else { // class: kỷ yếu
    const sch = data.school || '';
    const ss = fitW(sch.toUpperCase(), bw * 0.8, s * 0.024, BODY, 600, false, 0.16);
    if (sch) T('sc', sch.toUpperCase(), fy + bh * 0.1, ss, BODY, 600, pal.coverInk, { ls: 0.16, tag: 'cschool' });
    const ky = 'KỶ YẾU';
    const ks = fitW(ky, bw * 0.6, s * 0.045, BODY, 800, false, 0.5);
    T('ky', ky, fy + bh * 0.19, ks, BODY, 800, pal.coverInk, { ls: 0.5, tag: 'cky' });
    const cls = (title || '').replace(/^kỷ yếu\s*/i, '') || title;
    const cs = fitW(cls, bw * 0.84, s * 0.15, disp, dw);
    T('cl', cls, fy + bh * 0.19 + ks * 0.6 + cs * 0.95, cs, disp, dw, pal.coverInk, { tag: 'ctitle' });
    const pr: Rect = { x: fx, y: fy + bh * 0.44, w: bw, h: bh * 0.4 };
    const prE = mode === 'print' ? { ...pr, w: VW + B - fx } : pr;
    els.push(<Img key="cp" r={prE} p={photo} clip={`${uid}cp`} />);
    els.push(<rect key="l1" x={prE.x} y={pr.y - s * 0.006} width={prE.w} height={s * 0.006} fill={pal.accent} />);
    els.push(<rect key="l2" x={prE.x} y={pr.y + pr.h} width={prE.w} height={s * 0.006} fill={pal.accent} />);
    const ns = fitW(names, bw * 0.84, s * 0.03, BODY, 600);
    if (names) T('n', names, fy + bh * 0.84 + s * 0.08, ns, BODY, 600, pal.coverInk, { tag: 'cnames' });
    for (let k = 0; k < 3; k++) els.push(<path key={`st${k}`} d={star(cx + (k - 1) * s * 0.06, fy + bh * 0.31 + cs * 0.3 + s * 0.05, s * 0.014)} fill={pal.accent} />);
  }

  // lưng + gáy (không có ở chế độ 'front')
  if (mode !== 'front') {
    const bcx = bx + bw / 2;
    const tag = [names || title, date].filter(Boolean).join(' · ');
    const ts = fitW(tag, bw * 0.7, s * 0.02, BODY, 600, false, 0.1);
    if (tag) els.push(<text key="bk" x={bcx} y={by + bh - s * 0.08} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={600} fontSize={ts} fill={pal.coverInk} opacity={0.75} letterSpacing={ts * 0.1} data-pb="back">{tag.toUpperCase()}</text>);
    els.push(<Ornament key="bo" cx={bcx} cy={by + bh * 0.46} w={bw * 0.22} color={pal.coverInk} />);
    // gáy: chữ dọc
    const spTxt = [title, date].filter(Boolean).join('  ·  ');
    const scx = sx + spine / 2, scy = by + bh / 2;
    const sps = Math.min(spine * 0.42, fitW(spTxt, bh * 0.78, spine * 0.42, BODY, 800, false, 0.08));
    if (spTxt) els.push(<text key="sp" x={scx} y={scy} transform={`rotate(90 ${scx} ${scy})`} textAnchor="middle" dominantBaseline="central" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={sps} fill={pal.coverInk} letterSpacing={sps * 0.08} data-pb="spine">{spTxt.toUpperCase()}</text>);
  }

  // vạch kỹ thuật (chỉ ở vùng gấp mép — bị gấp vào trong, không lộ ra bìa)
  const marks: ReactNode[] = [];
  if (mode === 'print') {
    const xs = [d.backX, d.backX + bw, d.spineX, d.spineX + spine, d.frontX, d.frontX + bw];
    const st = { stroke: '#E6007E', strokeWidth: 0.25 };
    xs.forEach((x, i) => { marks.push(<line key={`mt${i}`} x1={x} y1={-B} x2={x} y2={PB_TURN - 3} {...st} />); marks.push(<line key={`mb${i}`} x1={x} y1={VH - PB_TURN + 3} x2={x} y2={VH + B} {...st} />); });
    [PB_TURN, PB_TURN + bh].forEach((y, i) => { marks.push(<line key={`ml${i}`} x1={-B} y1={y} x2={PB_TURN - 3} y2={y} {...st} />); marks.push(<line key={`mr${i}`} x1={VW - PB_TURN + 3} y1={y} x2={VW + B} y2={y} {...st} />); });
  }

  return (
    <svg viewBox={`${-B} ${-B} ${VW + B * 2} ${VH + B * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-pb-cover={mode}>
      <defs>
        <linearGradient id={`${uid}shade`} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity="0.62" /></linearGradient>
        <pattern id={`${uid}linen`} width="1.6" height="1.6" patternUnits="userSpaceOnUse">
          <path d="M0 0.4 H1.6 M0.4 0 V1.6" stroke={dark ? '#FFFFFF' : '#000000'} strokeOpacity="0.06" strokeWidth="0.35" />
        </pattern>
      </defs>
      <rect x={-B} y={-B} width={VW + B * 2} height={VH + B * 2} fill={pal.cover} />
      {spec.cover === 'linen' && <rect x={-B} y={-B} width={VW + B * 2} height={VH + B * 2} fill={`url(#${uid}linen)`} />}
      {els}
      {marks}
    </svg>
  );
}
function star(cx: number, cy: number, r: number) {
  let d = '';
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; d += `${i ? 'L' : 'M'}${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}`; }
  return d + 'Z';
}

// ---------- PDF in: trang 1 = bìa bồi, sau đó từng trang đôi (lay-flat in liền) ----------
export async function pbPdf(coverEl: SVGSVGElement, spreadEls: SVGSVGElement[], spec: PBSpec, onProgress?: (i: number, n: number) => void, dpi = 200): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const cd = pbCoverDims(spec);
  const pages: { el: SVGSVGElement; trim: { wMm: number; hMm: number } }[] = [
    { el: coverEl, trim: { wMm: cd.CW, hMm: cd.CH } },
    ...spreadEls.map((el) => ({ el, trim: { wMm: cd.W * 2, hMm: cd.H } })),
  ];
  let pdf: InstanceType<typeof jsPDF> | null = null;
  for (let i = 0; i < pages.length; i++) {
    onProgress?.(i + 1, pages.length);
    const { el, trim } = pages[i];
    const { pageW, pageH, bleedBoxW, bleedBoxH } = printPageDims(trim, PB_BLEED);
    const room = (pageW - bleedBoxW) / 2;
    const orient = pageW >= pageH ? 'landscape' : 'portrait';
    if (!pdf) pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: orient, compress: true });
    else pdf.addPage([pageW, pageH], orient);
    const outW = Math.round((bleedBoxW / 25.4) * dpi), outH = Math.round((bleedBoxH / 25.4) * dpi);
    const c = await svgToCanvas(await selfContainedSvg(el, PB_FONT_CSS, { outline: true }), outW, outH, '#ffffff');
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', room, room, bleedBoxW, bleedBoxH, undefined, 'FAST');
    // vạch cắt 4 góc vùng thành phẩm
    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
    const t0x = room + PB_BLEED, t0y = room + PB_BLEED, t1x = t0x + trim.wMm, t1y = t0y + trim.hMm, gap = PB_BLEED, L = Math.max(3, room - PB_BLEED - 1);
    for (const [x, y, sx, sy] of [[t0x, t0y, 1, 1], [t1x, t0y, -1, 1], [t0x, t1y, 1, -1], [t1x, t1y, -1, -1]] as const) {
      pdf.line(x - sx * gap, y, x - sx * (gap + L), y);
      pdf.line(x, y - sy * gap, x, y - sy * (gap + L));
    }
  }
  return pdf!.output('blob');
}
