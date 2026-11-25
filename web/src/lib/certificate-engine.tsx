'use client';
// Giấy khen · Bằng khen · Chứng nhận (khoá học / tham gia sự kiện) — 1 engine SVG = LOẠI × BỐ CỤC VIỀN × BẢNG MÀU × FONT.
// Viền hoa văn vẽ 100% bằng code: guilloche (sóng đan), vòng nguyệt quế, hoa góc, huy chương có ruy băng.
// In hàng loạt: dán danh sách "Họ tên | Lớp/Phòng ban | Thành tích" → mỗi người 1 tấm + số hiệu riêng.
// Ép kim: mọi chi tiết vàng = lớp nhũ (xem trước ánh kim; file in có thêm trang khuôn ép kim đen/trắng).
// Đơn vị: 10px = 1mm, bố cục dựng trên khổ A4; A3 = phóng đều √2.

import { useEffect, useId, useState, type CSSProperties, type ReactNode } from 'react';

export const U = 10;
export const CT_BLEED_MM = 3;

// ---------- loại ----------
export type CTKind = 'khen' | 'bangkhen' | 'course' | 'event';
export const CT_KINDS: { id: CTKind; name: string; note: string }[] = [
  { id: 'khen', name: 'Giấy khen', note: 'Trường học, công ty — học sinh giỏi, nhân viên xuất sắc' },
  { id: 'bangkhen', name: 'Bằng khen', note: 'Trang trọng, có Quốc hiệu' },
  { id: 'course', name: 'Chứng nhận khoá học', note: 'Song ngữ Việt – Anh, 2 chữ ký' },
  { id: 'event', name: 'Chứng nhận sự kiện', note: 'Tham gia hội thảo, giải chạy, hội nghị' },
];

// ---------- khổ ----------
export type CTOrient = 'land' | 'port';
export interface CTSize { id: string; name: string; s: number }
export const CT_SIZES: CTSize[] = [
  { id: 'a4', name: 'A4 (21 × 29,7 cm)', s: 1 },
  { id: 'a3', name: 'A3 (29,7 × 42 cm)', s: Math.SQRT2 },
];
export const ctSize = (id: string) => CT_SIZES.find((s) => s.id === id) || CT_SIZES[0];
/** khổ thật (mm) */
export function ctDims(spec: Pick<CTSpec, 'orient' | 'size'>) {
  const s = ctSize(spec.size).s;
  const bw = spec.orient === 'land' ? 297 : 210, bh = spec.orient === 'land' ? 210 : 297;
  return { wMm: Math.round(bw * s), hMm: Math.round(bh * s), s, bw: bw * U, bh: bh * U };
}

// ---------- font ----------
export interface TF { fam: string; wt: number; it?: boolean; ls?: number }
export interface CTFont { id: string; name: string; fam: string; wt: number }
export const CT_TITLE_FONTS: CTFont[] = [
  { id: 'playfair', name: 'Playfair', fam: 'Playfair Display', wt: 800 },
  { id: 'cormorant', name: 'Cormorant', fam: 'Cormorant Garamond', wt: 700 },
  { id: 'prata', name: 'Prata', fam: 'Prata', wt: 400 },
  { id: 'montserrat', name: 'Montserrat', fam: 'Montserrat', wt: 800 },
];
export const ctTitleFont = (id: string) => CT_TITLE_FONTS.find((f) => f.id === id) || CT_TITLE_FONTS[0];
export const CT_NAME_FONTS: CTFont[] = [
  { id: 'vibes', name: 'Chữ ký (Great Vibes)', fam: 'Great Vibes', wt: 400 },
  { id: 'alex', name: 'Thư pháp (Alex Brush)', fam: 'Alex Brush', wt: 400 },
  { id: 'serif', name: 'Có chân (Cormorant)', fam: 'Cormorant Garamond', wt: 700 },
  { id: 'sans', name: 'Không chân (Be Vietnam)', fam: 'Be Vietnam Pro', wt: 800 },
];
export const ctNameFont = (id: string) => CT_NAME_FONTS.find((f) => f.id === id) || CT_NAME_FONTS[0];
const BODY: TF = { fam: 'Be Vietnam Pro', wt: 600 };
const BODYB: TF = { fam: 'Be Vietnam Pro', wt: 800 };
const ITAL: TF = { fam: 'Cormorant Garamond', wt: 500, it: true };
const SERIF: TF = { fam: 'Cormorant Garamond', wt: 700 };

export const CT_FONT_CSS = `@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@600;800&family=Playfair+Display:wght@800&family=Cormorant+Garamond:ital,wght@0,600;0,700;1,500&family=Prata&family=Montserrat:wght@800&family=Great+Vibes&family=Alex+Brush&display=swap');`;

export function useCTFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let on = true;
    let link = document.getElementById('mivy-ct-fonts') as HTMLLinkElement | null;
    const sheet = new Promise<void>((res) => {
      if (link?.sheet) return res();
      if (!link) {
        link = document.createElement('link'); link.id = 'mivy-ct-fonts'; link.rel = 'stylesheet';
        link.href = CT_FONT_CSS.match(/url\('([^']+)'\)/)![1]; document.head.appendChild(link);
      }
      link.addEventListener('load', () => res(), { once: true });
      link.addEventListener('error', () => res(), { once: true });
    });
    const probe = [
      ...CT_TITLE_FONTS.map((f) => `${f.wt} 40px "${f.fam}"`), ...CT_NAME_FONTS.map((f) => `${f.wt} 40px "${f.fam}"`),
      '600 40px "Be Vietnam Pro"', '800 40px "Be Vietnam Pro"', 'italic 500 40px "Cormorant Garamond"', '600 40px "Cormorant Garamond"',
    ];
    sheet
      .then(() => Promise.all(probe.map((p) => document.fonts.load(p, 'ẮÂÊÔƠƯĐ ăâêôơưđ Aa 0123 –'))))
      .catch(() => null)
      .then(() => { if (on) setReady(true); });
    return () => { on = false; };
  }, []);
  return ready;
}

// ---------- bảng màu ----------
// paper = nền giấy, paper2 = hoa văn chìm, frame = viền/khối màu, accent = tiêu đề, ink/sub = chữ, gold = nhũ, onFrame = chữ trên khối màu
export interface CTPalette { id: string; name: string; paper: string; paper2: string; frame: string; frame2: string; accent: string; ink: string; sub: string; gold: string; onFrame: string }
export const CT_PALETTES: CTPalette[] = [
  { id: 'red', name: 'Đỏ vàng', paper: '#FFFBF1', paper2: '#F6E7C6', frame: '#B3121F', frame2: '#7E0A14', accent: '#C0141F', ink: '#2A1A14', sub: '#6B5446', gold: '#C9A13B', onFrame: '#FFF4DA' },
  { id: 'blue', name: 'Xanh dương', paper: '#F8FAFF', paper2: '#DCE6F7', frame: '#1F4FA0', frame2: '#14346E', accent: '#1B3F86', ink: '#16233B', sub: '#56627A', gold: '#C9A13B', onFrame: '#FFFFFF' },
  { id: 'navy', name: 'Navy vàng', paper: '#FBF9F3', paper2: '#ECE4D0', frame: '#14213D', frame2: '#0A1326', accent: '#14213D', ink: '#14213D', sub: '#5A6680', gold: '#C8A24A', onFrame: '#F6EBD0' },
  { id: 'black', name: 'Đen ánh kim', paper: '#FFFDF7', paper2: '#EEE6D3', frame: '#1A1A1A', frame2: '#000000', accent: '#1A1A1A', ink: '#1A1A1A', sub: '#6B6B6B', gold: '#C5A253', onFrame: '#F3E6C4' },
  { id: 'teal', name: 'Xanh ngọc', paper: '#F7FBFA', paper2: '#D6EAE6', frame: '#0F5F5A', frame2: '#08403C', accent: '#0F5F5A', ink: '#12302D', sub: '#56706C', gold: '#C9A54E', onFrame: '#FFFFFF' },
  { id: 'wine', name: 'Đỏ rượu', paper: '#FFFAF3', paper2: '#F0E0CC', frame: '#5E1A22', frame2: '#3D0E14', accent: '#6B1B26', ink: '#2A1414', sub: '#76585A', gold: '#CFA75C', onFrame: '#F8EEDC' },
  { id: 'purple', name: 'Tím hoàng gia', paper: '#FCFAFF', paper2: '#E7DFF3', frame: '#4B2A7B', frame2: '#2F1852', accent: '#4B2A7B', ink: '#241634', sub: '#655A78', gold: '#C9A54E', onFrame: '#FFFFFF' },
  { id: 'green', name: 'Xanh lá', paper: '#F8FBF5', paper2: '#DCEAD3', frame: '#1F5A35', frame2: '#123B22', accent: '#1F5A35', ink: '#16261D', sub: '#5D6E62', gold: '#C9A13B', onFrame: '#FFFFFF' },
  { id: 'brown', name: 'Nâu kem', paper: '#FAF4E8', paper2: '#EADBC0', frame: '#6B4A2E', frame2: '#4A3220', accent: '#5A3B22', ink: '#2F1F16', sub: '#7D6655', gold: '#B8904A', onFrame: '#FAF4E8' },
  { id: 'slate', name: 'Xám thanh lịch', paper: '#FBFBFA', paper2: '#E2E5E8', frame: '#2F3A45', frame2: '#1D252D', accent: '#22303C', ink: '#1F2A33', sub: '#66727D', gold: '#B9975B', onFrame: '#FFFFFF' },
];
export const ctPalette = (id: string) => CT_PALETTES.find((p) => p.id === id) || CT_PALETTES[0];

// ---------- bố cục viền ----------
export type CTLayout = 'classic' | 'formal' | 'laurel' | 'modern' | 'ribbon' | 'minimal';
export const CT_LAYOUTS: { id: CTLayout; name: string }[] = [
  { id: 'classic', name: 'Cổ điển · hoa văn góc' },
  { id: 'formal', name: 'Trang trọng · viền đậm' },
  { id: 'laurel', name: 'Nguyệt quế · huy chương' },
  { id: 'modern', name: 'Hiện đại · dải màu' },
  { id: 'ribbon', name: 'Ruy băng chéo góc' },
  { id: 'minimal', name: 'Tối giản' },
];
export type Frame3D = 'gold' | 'wood' | 'black';

export interface CTSpec {
  kind: CTKind; layout: CTLayout; palette: string; font: string; nameFont: string;
  orient: CTOrient; size: string; foil: boolean; quochieu: boolean; bilingual: boolean; frame3d: Frame3D;
}

// ---------- nội dung mẫu ----------
export type CTData = Record<string, string>;
export type CTPreset = 'school' | 'school2' | 'company' | 'bangkhen' | 'course' | 'event';
const PRESETS: Record<CTPreset, CTData> = {
  school: {
    orgParent: 'UBND QUẬN 3', org: 'TRƯỜNG THCS AN KHANG', issuer: 'HIỆU TRƯỞNG TRƯỜNG THCS AN KHANG',
    title: 'GIẤY KHEN', titleEn: '', lead: 'Khen tặng em', leadEn: '', name: 'Trần Gia Khánh', unitLabel: 'Lớp', unit: '9A3',
    reason: 'Đã đạt danh hiệu Học sinh Giỏi\nNăm học 2026 – 2027', reasonEn: '', detail: '',
    place: 'TP. Hồ Chí Minh', date: 'ngày 25 tháng 5 năm 2027', signRole: 'HIỆU TRƯỞNG', signName: 'Lê Thu Hà', signRole2: '', signName2: '',
    prefix: 'GK', start: '1', list: '',
  },
  school2: {
    orgParent: 'PHÒNG GIÁO DỤC VÀ ĐÀO TẠO QUẬN 10', org: 'TRƯỜNG TIỂU HỌC BẢO NGỌC', issuer: 'HIỆU TRƯỞNG TRƯỜNG TIỂU HỌC BẢO NGỌC',
    title: 'GIẤY KHEN', titleEn: '', lead: 'Khen tặng em', leadEn: '', name: 'Phạm Bảo Ngọc', unitLabel: 'Lớp', unit: '5A1',
    reason: 'Đã hoàn thành xuất sắc nhiệm vụ học tập và rèn luyện\nNăm học 2026 – 2027', reasonEn: '', detail: '',
    place: 'TP. Hồ Chí Minh', date: 'ngày 28 tháng 5 năm 2027', signRole: 'HIỆU TRƯỞNG', signName: 'Đỗ Quốc Bảo', signRole2: '', signName2: '',
    prefix: 'HS', start: '1', list: '',
  },
  company: {
    orgParent: '', org: 'CÔNG TY TNHH AN KHANG', issuer: 'GIÁM ĐỐC CÔNG TY TNHH AN KHANG',
    title: 'GIẤY KHEN', titleEn: '', lead: 'Khen tặng', leadEn: '', name: 'Nguyễn Quốc Bảo', unitLabel: 'Phòng ban', unit: 'Phòng Kinh doanh',
    reason: 'NHÂN VIÊN XUẤT SẮC NĂM 2026\nĐã có thành tích nổi bật, góp phần hoàn thành vượt mức kế hoạch kinh doanh của Công ty', reasonEn: '', detail: '',
    place: 'TP. Hồ Chí Minh', date: 'ngày 20 tháng 1 năm 2027', signRole: 'GIÁM ĐỐC', signName: 'Đỗ Thu Hà', signRole2: '', signName2: '',
    prefix: 'NV', start: '1', list: '',
  },
  bangkhen: {
    orgParent: '', org: 'CÔNG TY CỔ PHẦN AN KHANG', issuer: 'CHỦ TỊCH HỘI ĐỒNG QUẢN TRỊ CÔNG TY CỔ PHẦN AN KHANG',
    title: 'BẰNG KHEN', titleEn: '', lead: 'Tặng', leadEn: '', name: 'Ông Lê Quốc Bảo', unitLabel: 'Chức vụ', unit: 'Trưởng phòng Kỹ thuật',
    reason: 'Đã có thành tích xuất sắc trong công tác năm 2026,\ngóp phần vào sự nghiệp xây dựng và phát triển Công ty', reasonEn: '', detail: '',
    place: 'Hà Nội', date: 'ngày 15 tháng 1 năm 2027', signRole: 'CHỦ TỊCH HĐQT', signName: 'Vũ Gia Khánh', signRole2: '', signName2: '',
    prefix: 'BK', start: '1', list: '',
  },
  course: {
    orgParent: '', org: 'TRUNG TÂM ANH NGỮ THU HÀ', issuer: '',
    title: 'CHỨNG NHẬN', titleEn: 'CERTIFICATE OF COMPLETION', lead: 'Chứng nhận học viên', leadEn: 'This is to certify that', name: 'Hoàng Bảo Ngọc', unitLabel: '', unit: '',
    reason: 'Đã hoàn thành khoá học\nTIẾNG ANH GIAO TIẾP NÂNG CAO', reasonEn: 'has successfully completed the Advanced English Communication course',
    detail: 'Thời gian: 01/09/2026 – 30/11/2026 · Thời lượng: 72 giờ · Xếp loại: Giỏi',
    place: 'TP. Hồ Chí Minh', date: 'ngày 30 tháng 11 năm 2026', signRole: 'GIÁM ĐỐC · DIRECTOR', signName: 'Lê Thu Hà', signRole2: 'GIẢNG VIÊN · INSTRUCTOR', signName2: 'Trần Quốc Bảo',
    prefix: 'CN', start: '1', list: '',
  },
  event: {
    orgParent: '', org: 'HIỆP HỘI DOANH NGHIỆP AN KHANG', issuer: '',
    title: 'GIẤY CHỨNG NHẬN', titleEn: 'CERTIFICATE OF PARTICIPATION', lead: 'Trân trọng chứng nhận', leadEn: 'This certificate is proudly presented to', name: 'Phạm Gia Khánh', unitLabel: 'Đơn vị', unit: 'Công ty TNHH Bảo Ngọc',
    reason: 'Đã tham gia\nHỘI THẢO CHUYỂN ĐỔI SỐ DOANH NGHIỆP 2027', reasonEn: 'for participating in the Digital Transformation Forum 2027',
    detail: 'Tổ chức ngày 15/03/2027 tại TP. Hồ Chí Minh',
    place: 'TP. Hồ Chí Minh', date: 'ngày 15 tháng 3 năm 2027', signRole: 'TRƯỞNG BAN TỔ CHỨC', signName: 'Đặng Thu Hà', signRole2: '', signName2: '',
    prefix: 'SK', start: '1', list: '',
  },
};
export const samplePreset = (p: CTPreset): CTData => ({ ...PRESETS[p] });

export interface CTField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean; kinds?: CTKind[]; bi?: boolean }
export const CT_FIELDS: CTField[] = [
  { key: 'orgParent', label: 'Cơ quan cấp trên (nếu có)', half: true, kinds: ['khen', 'bangkhen'] },
  { key: 'org', label: 'Tên đơn vị cấp', half: true },
  { key: 'issuer', label: 'Người/đơn vị khen thưởng (dòng trên tiêu đề)', kinds: ['khen', 'bangkhen'] },
  { key: 'title', label: 'Tiêu đề', half: true },
  { key: 'titleEn', label: 'Tiêu đề tiếng Anh', half: true, bi: true },
  { key: 'lead', label: 'Câu dẫn', half: true },
  { key: 'leadEn', label: 'Câu dẫn tiếng Anh', half: true, bi: true },
  { key: 'name', label: 'Họ tên (khi không dùng danh sách)', half: true },
  { key: 'unitLabel', label: 'Nhãn đơn vị (Lớp / Phòng ban…)', half: true },
  { key: 'unit', label: 'Lớp / phòng ban / đơn vị', half: true },
  { key: 'reason', label: 'Thành tích / nội dung (dòng VIẾT HOA = nổi bật)', multiline: true },
  { key: 'reasonEn', label: 'Nội dung tiếng Anh', multiline: true, bi: true },
  { key: 'detail', label: 'Dòng chi tiết (thời gian, thời lượng, xếp loại…)', kinds: ['course', 'event'] },
  { key: 'place', label: 'Địa danh', half: true },
  { key: 'date', label: 'Ngày tháng', half: true, ph: 'ngày 25 tháng 5 năm 2027' },
  { key: 'signRole', label: 'Chức vụ người ký', half: true },
  { key: 'signName', label: 'Họ tên người ký', half: true },
  { key: 'signRole2', label: 'Chức vụ người ký 2 (tuỳ chọn)', half: true },
  { key: 'signName2', label: 'Họ tên người ký 2', half: true },
];

// ---------- mẫu ----------
export interface CTTemplate { id: string; name: string; preset: CTPreset; spec: CTSpec }
const T = (id: string, name: string, preset: CTPreset, s: Partial<CTSpec> & Pick<CTSpec, 'kind' | 'layout' | 'palette'>): CTTemplate => ({
  id, name, preset,
  spec: {
    font: 'playfair', nameFont: 'vibes', orient: 'land', size: 'a4', foil: false,
    quochieu: s.kind === 'khen' || s.kind === 'bangkhen', bilingual: s.kind === 'course' || s.kind === 'event', frame3d: 'gold', ...s,
  },
});
export const CT_TEMPLATES: CTTemplate[] = [
  T('hsg-classic', 'Học sinh giỏi · cổ điển đỏ', 'school', { kind: 'khen', layout: 'classic', palette: 'red', font: 'playfair' }),
  T('hstt-classic', 'Học sinh tiên tiến · xanh', 'school2', { kind: 'khen', layout: 'classic', palette: 'blue', font: 'cormorant', nameFont: 'serif', frame3d: 'wood' }),
  T('nv-laurel', 'Nhân viên xuất sắc · nguyệt quế', 'company', { kind: 'khen', layout: 'laurel', palette: 'navy', font: 'cormorant', quochieu: false, frame3d: 'black' }),
  T('nv-ribbon-port', 'Nhân viên xuất sắc · dọc', 'company', { kind: 'khen', layout: 'ribbon', palette: 'black', font: 'prata', orient: 'port', quochieu: false, frame3d: 'black', foil: true }),
  T('bk-formal', 'Bằng khen · đỏ trang trọng', 'bangkhen', { kind: 'bangkhen', layout: 'formal', palette: 'red', font: 'playfair', nameFont: 'serif' }),
  T('bk-formal-green', 'Bằng khen · xanh lá', 'bangkhen', { kind: 'bangkhen', layout: 'formal', palette: 'green', font: 'prata', nameFont: 'serif', frame3d: 'wood' }),
  T('cn-modern', 'Khoá học · hiện đại navy', 'course', { kind: 'course', layout: 'modern', palette: 'navy', font: 'montserrat', frame3d: 'black' }),
  T('cn-laurel-teal', 'Khoá học · nguyệt quế ngọc', 'course', { kind: 'course', layout: 'laurel', palette: 'teal', font: 'cormorant', foil: true }),
  T('cn-minimal', 'Khoá học · tối giản', 'course', { kind: 'course', layout: 'minimal', palette: 'slate', font: 'prata', nameFont: 'alex', frame3d: 'black' }),
  T('sk-ribbon', 'Sự kiện · ruy băng đỏ rượu', 'event', { kind: 'event', layout: 'ribbon', palette: 'wine', font: 'playfair' }),
  T('sk-modern-purple', 'Sự kiện · tím dọc', 'event', { kind: 'event', layout: 'modern', palette: 'purple', font: 'montserrat', orient: 'port', nameFont: 'sans', frame3d: 'black' }),
  T('sk-minimal-brown', 'Sự kiện · nâu kem', 'event', { kind: 'event', layout: 'minimal', palette: 'brown', font: 'cormorant', nameFont: 'alex', frame3d: 'wood' }),
];

// ---------- danh sách người nhận ----------
export interface Person { name: string; unit: string; reason: string }
export function ctPeople(d: CTData): Person[] {
  const rows = (d.list || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 300);
  if (!rows.length) return [{ name: d.name || '', unit: d.unit || '', reason: d.reason || '' }];
  return rows.map((r) => {
    const [name, unit, reason] = r.split('|').map((s) => (s || '').trim());
    return { name: name || '', unit: unit ?? d.unit ?? '', reason: reason ? reason.replace(/\s*\/\s*/g, '\n') : d.reason || '' };
  });
}
export const ctSerial = (d: CTData, i: number) => {
  const n = (parseInt(d.start || '1', 10) || 1) + i;
  return `${(d.prefix || '').trim()}${(d.prefix || '').trim() ? '-' : ''}${String(n).padStart(4, '0')}`;
};

// ---------- đo chữ ----------
let mctx: CanvasRenderingContext2D | null = null;
export function tw(t: string, size: number, f: TF): number {
  const s = t || '';
  const ls = (f.ls || 0) * size * Math.max(0, s.length - 1);
  if (typeof document === 'undefined') return s.length * size * 0.55 + ls;
  mctx ??= document.createElement('canvas').getContext('2d');
  if (!mctx) return s.length * size * 0.55 + ls;
  mctx.font = `${f.it ? 'italic ' : ''}${f.wt} ${size}px "${f.fam}"`;
  return mctx.measureText(s).width + ls;
}
const fitS = (t: string, maxW: number, size: number, f: TF, min = 0.4) => { const w = tw(t, size, f); return w > maxW ? Math.max(size * min, (size * maxW) / w) : size; };
function wrap(text: string, maxW: number, size: number, f: TF): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    if (!words.length) continue;
    let cur = '';
    for (const w of words) {
      const nx = cur ? `${cur} ${w}` : w;
      if (cur && tw(nx, size, f) > maxW) { out.push(cur); cur = w; } else cur = nx;
    }
    if (cur) out.push(cur);
  }
  return out;
}
/** xuống dòng cân (không để 1 chữ lẻ ở dòng cuối) */
function wrapBal(text: string, maxW: number, size: number, f: TF): string[] {
  let lines = wrap(text, maxW, size, f);
  const n = lines.length;
  if (n < 2) return lines;
  let lo = maxW * 0.45, hi = maxW;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (wrap(text, mid, size, f).length > n) lo = mid; else hi = mid;
  }
  lines = wrap(text, hi, size, f);
  return lines;
}
const isCaps = (s: string) => /\p{L}/u.test(s) && s === s.toUpperCase();

// ---------- tiện ích vẽ ----------
const f1 = (v: number) => Math.round(v * 10) / 10;
function Txt({ x, y, t, size, f, fill, anchor = 'middle', op }: { x: number; y: number; t: string; size: number; f: TF; fill: string; anchor?: 'start' | 'middle' | 'end'; op?: number }) {
  if (!t) return null;
  return (
    <text x={f1(x)} y={f1(y)} fontFamily={`"${f.fam}"`} fontWeight={f.wt} fontStyle={f.it ? 'italic' : undefined} fontSize={f1(size)}
      letterSpacing={f.ls ? f1(f.ls * size) : undefined} textAnchor={anchor} fill={fill} opacity={op}>{t}</text>
  );
}
function sinePath(x0: number, y0: number, x1: number, y1: number, amp: number, period: number, phase: number): string {
  const L = Math.hypot(x1 - x0, y1 - y0); if (L < 1) return '';
  const ux = (x1 - x0) / L, uy = (y1 - y0) / L, nx = -uy, ny = ux;
  const steps = Math.max(8, Math.ceil(L / (period / 14)));
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * L, o = amp * Math.sin((2 * Math.PI * t) / period + phase);
    d += `${i ? 'L' : 'M'}${f1(x0 + ux * t + nx * o)} ${f1(y0 + uy * t + ny * o)}`;
  }
  return d;
}
function rosePath(cx: number, cy: number, R: number, a: number, n: number, rot = 0, steps = 360): string {
  let d = '';
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2, r = R + a * Math.sin(n * th);
    d += `${i ? 'L' : 'M'}${f1(cx + r * Math.cos(th + rot))} ${f1(cy + r * Math.sin(th + rot))}`;
  }
  return d + 'Z';
}
function scallop(cx: number, cy: number, R: number, bumps: number, depth: number): string {
  let d = '';
  const steps = bumps * 8;
  for (let i = 0; i <= steps; i++) {
    const th = (i / steps) * Math.PI * 2, r = R * (1 - depth * (0.5 - 0.5 * Math.cos(bumps * th)));
    d += `${i ? 'L' : 'M'}${f1(cx + r * Math.cos(th))} ${f1(cy + r * Math.sin(th))}`;
  }
  return d + 'Z';
}

/** dải guilloche (sóng đan) chạy quanh 1 khung chữ nhật: 2 họ sóng ngược pha → mắt lưới như giấy tiền */
function GuillocheFrame({ x0, y0, x1, y1, band, color, lines = 4, period = 44, sw = 1.5 }: { x0: number; y0: number; x1: number; y1: number; band: number; color: string; lines?: number; period?: number; sw?: number }) {
  const amp = band * 0.36, c = band / 2;
  const sides: [number, number, number, number][] = [
    [x0 + band, y0 + c, x1 - band, y0 + c], [x0 + band, y1 - c, x1 - band, y1 - c],
    [x0 + c, y0 + band, x0 + c, y1 - band], [x1 - c, y0 + band, x1 - c, y1 - band],
  ];
  let d = '';
  for (const [ax, ay, bx, by] of sides) {
    for (let k = 0; k < lines; k++) {
      const ph = (k * 2 * Math.PI) / lines;
      d += sinePath(ax, ay, bx, by, amp, period, ph) + sinePath(ax, ay, bx, by, amp * 0.55, period, Math.PI - ph);
    }
  }
  const corners = [[x0 + c, y0 + c], [x1 - c, y0 + c], [x0 + c, y1 - c], [x1 - c, y1 - c]];
  return (
    <g fill="none" stroke={color} strokeWidth={sw}>
      <path d={d} />
      <rect x={x0} y={y0} width={x1 - x0} height={y1 - y0} strokeWidth={sw * 2} />
      <rect x={x0 + band} y={y0 + band} width={x1 - x0 - 2 * band} height={y1 - y0 - 2 * band} strokeWidth={sw * 2} />
      {corners.map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx - c} y={cy - c} width={band} height={band} fill={color} stroke="none" opacity={0.18} />
          <path d={rosePath(cx, cy, band * 0.26, band * 0.12, 6) + rosePath(cx, cy, band * 0.26, band * 0.12, 6, Math.PI / 6)} />
          <circle cx={cx} cy={cy} r={band * 0.07} fill={color} stroke="none" />
        </g>
      ))}
    </g>
  );
}

/** hoa văn góc: cuộn xoắn + lá + chấm, vẽ ở góc trên-trái rồi lật đối xứng 4 góc */
function CornerFlourish({ x, y, s, color, flipX = false, flipY = false }: { x: number; y: number; s: number; color: string; flipX?: boolean; flipY?: boolean }) {
  const half = (
    <>
      {/* thân cuộn dài dọc cạnh, thon dần */}
      <path d={`M${s * 0.06} ${s * 0.06} C ${s * 0.4} ${s * 0.02}, ${s * 0.7} ${s * 0.09}, ${s * 1.0} ${s * 0.05} C ${s * 0.72} ${s * 0.12}, ${s * 0.42} ${s * 0.07}, ${s * 0.16} ${s * 0.13} Z`} fill={color} />
      {/* xoắn ốc */}
      <path d={`M${s * 0.16} ${s * 0.13} C ${s * 0.32} ${s * 0.1}, ${s * 0.4} ${s * 0.3}, ${s * 0.27} ${s * 0.33} C ${s * 0.16} ${s * 0.35}, ${s * 0.15} ${s * 0.22}, ${s * 0.24} ${s * 0.22} C ${s * 0.3} ${s * 0.22}, ${s * 0.3} ${s * 0.29}, ${s * 0.26} ${s * 0.29}`} fill="none" stroke={color} strokeWidth={s * 0.022} strokeLinecap="round" />
      {/* lá */}
      <path d={`M${s * 0.45} ${s * 0.1} C ${s * 0.52} ${s * 0.2}, ${s * 0.64} ${s * 0.22}, ${s * 0.72} ${s * 0.17} C ${s * 0.64} ${s * 0.12}, ${s * 0.53} ${s * 0.11}, ${s * 0.45} ${s * 0.1} Z`} fill={color} />
      <circle cx={s * 0.86} cy={s * 0.13} r={s * 0.018} fill={color} />
      <circle cx={s * 0.94} cy={s * 0.11} r={s * 0.012} fill={color} />
    </>
  );
  return (
    <g transform={`translate(${f1(x)} ${f1(y)}) scale(${flipX ? -1 : 1} ${flipY ? -1 : 1})`}>
      {half}
      <g transform="matrix(0 1 1 0 0 0)">{half}</g>
      <path d={`M0 0 L${s * 0.13} ${s * 0.04} L${s * 0.04} ${s * 0.13} Z`} fill={color} />
      <circle cx={s * 0.09} cy={s * 0.09} r={s * 0.028} fill={color} />
    </g>
  );
}

/** cành nguyệt quế ôm quanh huy chương: t = 0 ở đáy, 90 ở hông, 180 ở đỉnh (side = -1 trái, 1 phải) */
function LaurelBranch({ cx, cy, R, color, side, leaf = 30, from = 22, to = 150 }: { cx: number; cy: number; R: number; color: string; side: 1 | -1; leaf?: number; from?: number; to?: number }) {
  const rad = (a: number) => (a * Math.PI) / 180;
  const pt = (t: number) => [cx + side * R * Math.sin(rad(t)), cy + R * Math.cos(rad(t))];
  const tan = (t: number) => (Math.atan2(-Math.sin(rad(t)), side * Math.cos(rad(t))) * 180) / Math.PI;
  let stem = '';
  for (let i = 0; i <= 40; i++) { const [x, y] = pt(from + ((to - from) * i) / 40); stem += `${i ? 'L' : 'M'}${f1(x)} ${f1(y)}`; }
  const leaves: ReactNode[] = [];
  const n = Math.round((to - from) / 11);
  for (let i = 0; i < n; i++) {
    const t = from + ((i + 0.6) / n) * (to - from);
    const sc = 1 - 0.42 * (i / n); // lá to ở gốc, nhỏ dần lên ngọn
    const [px, py] = pt(t), base = tan(t);
    for (const o of [-1, 1]) {
      const rx = leaf * sc, ry = leaf * sc * 0.36;
      leaves.push(<ellipse key={`${i}${o}`} cx={0} cy={0} rx={f1(rx)} ry={f1(ry)} fill={color}
        transform={`translate(${f1(px)} ${f1(py)}) rotate(${f1(base + o * 42)}) translate(${f1(rx * 0.95)} 0)`} />);
    }
  }
  const [ex, ey] = pt(to);
  return (
    <g>
      <path d={stem} fill="none" stroke={color} strokeWidth={f1(leaf * 0.13)} strokeLinecap="round" />
      {leaves}
      <ellipse cx={0} cy={0} rx={f1(leaf * 0.5)} ry={f1(leaf * 0.2)} fill={color} transform={`translate(${f1(ex)} ${f1(ey)}) rotate(${f1(tan(to))}) translate(${f1(leaf * 0.45)} 0)`} />
    </g>
  );
}

/** huy chương guilloche + ruy băng (ribbon = màu khối, có nếp gấp) */
function Rosette({ cx, cy, r, gold, paper, ribbon, ribbon2, text, mask }: { cx: number; cy: number; r: number; gold: string; paper: string; ribbon?: string; ribbon2?: string; text?: string; mask: boolean }) {
  const tail = (dir: 1 | -1) => {
    const x0 = cx + dir * r * 0.32, y0 = cy + r * 0.5, w = r * 0.5, L = r * 1.45;
    const x1 = x0 + dir * r * 0.38, y1 = y0 + L;
    return (
      <g key={dir}>
        <path d={`M${f1(x0 - w / 2)} ${f1(y0)} L${f1(x0 + w / 2)} ${f1(y0)} L${f1(x1 + w / 2)} ${f1(y1)} L${f1(x1)} ${f1(y1 - w * 0.55)} L${f1(x1 - w / 2)} ${f1(y1)} Z`} fill={ribbon} />
        {!mask && <path d={`M${f1(x0 - w / 2)} ${f1(y0)} L${f1(x0 - w * 0.1)} ${f1(y0)} L${f1(x1 - w * 0.1)} ${f1(y1 - w * 0.35)} L${f1(x1 - w / 2)} ${f1(y1)} Z`} fill={ribbon2} opacity={0.55} />}
      </g>
    );
  };
  return (
    <g>
      {ribbon && [tail(-1), tail(1)]}
      <path d={scallop(cx, cy, r, 44, 0.09)} fill={gold} />
      <circle cx={cx} cy={cy} r={r * 0.8} fill="none" stroke={paper} strokeWidth={r * 0.025} />
      <path d={rosePath(cx, cy, r * 0.56, r * 0.12, 12) + rosePath(cx, cy, r * 0.56, r * 0.12, 12, Math.PI / 12)} fill="none" stroke={paper} strokeWidth={r * 0.016} opacity={0.9} />
      <circle cx={cx} cy={cy} r={r * 0.36} fill={gold} stroke={paper} strokeWidth={r * 0.02} />
      {text
        ? <Txt x={cx} y={cy + r * 0.1} t={text} size={fitS(text, r * 0.56, r * 0.3, BODYB)} f={BODYB} fill={paper} />
        : <path d={starPath(cx, cy, r * 0.26, r * 0.11)} fill={paper} />}
    </g>
  );
}
function starPath(cx: number, cy: number, R: number, r: number): string {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r : R;
    d += `${i ? 'L' : 'M'}${f1(cx + rr * Math.cos(a))} ${f1(cy + rr * Math.sin(a))}`;
  }
  return d + 'Z';
}

/** dải viền đậm (bằng khen): khối màu + chuỗi hoa văn quả trám vàng + chỉ vàng 2 mép */
function FormalBand({ x0, y0, x1, y1, band, fill, gold }: { x0: number; y0: number; x1: number; y1: number; band: number; fill: string; gold: string }) {
  const shapes: ReactNode[] = [];
  const c = band / 2, step = band * 0.9;
  const along = (ax: number, ay: number, bx: number, by: number, key: string) => {
    const L = Math.hypot(bx - ax, by - ay), n = Math.max(2, Math.floor(L / step));
    const ux = (bx - ax) / L, uy = (by - ay) / L, sp = L / n;
    for (let i = 0; i <= n; i++) {
      const px = ax + ux * i * sp, py = ay + uy * i * sp, rr = band * 0.2;
      shapes.push(<path key={`${key}${i}`} d={`M${f1(px)} ${f1(py - rr)} L${f1(px + rr)} ${f1(py)} L${f1(px)} ${f1(py + rr)} L${f1(px - rr)} ${f1(py)} Z`} fill={gold} />);
      if (i < n) shapes.push(<circle key={`${key}d${i}`} cx={f1(px + ux * sp / 2)} cy={f1(py + uy * sp / 2)} r={band * 0.06} fill={gold} />);
    }
  };
  along(x0 + band * 1.5, y0 + c, x1 - band * 1.5, y0 + c, 't');
  along(x0 + band * 1.5, y1 - c, x1 - band * 1.5, y1 - c, 'b');
  along(x0 + c, y0 + band * 1.5, x0 + c, y1 - band * 1.5, 'l');
  along(x1 - c, y0 + band * 1.5, x1 - c, y1 - band * 1.5, 'r');
  const corners = [[x0 + c, y0 + c], [x1 - c, y0 + c], [x0 + c, y1 - c], [x1 - c, y1 - c]];
  return (
    <g>
      <path d={`M${x0} ${y0}H${x1}V${y1}H${x0}Z M${x0 + band} ${y0 + band}V${y1 - band}H${x1 - band}V${y0 + band}Z`} fill={fill} fillRule="evenodd" />
      <g fill="none" stroke={gold} strokeWidth={band * 0.05}>
        <rect x={x0 + band * 0.12} y={y0 + band * 0.12} width={x1 - x0 - band * 0.24} height={y1 - y0 - band * 0.24} />
        <rect x={x0 + band * 0.88} y={y0 + band * 0.88} width={x1 - x0 - band * 1.76} height={y1 - y0 - band * 1.76} />
      </g>
      {shapes}
      {corners.map(([cx, cy], i) => (
        <g key={i}>
          <rect x={cx - c * 0.78} y={cy - c * 0.78} width={c * 1.56} height={c * 1.56} fill={gold} transform={`rotate(45 ${cx} ${cy})`} />
          <circle cx={cx} cy={cy} r={c * 0.42} fill={fill} />
          <path d={starPath(cx, cy, c * 0.34, c * 0.14)} fill={gold} />
        </g>
      ))}
    </g>
  );
}

/** hoa văn chìm toàn trang (giấy an ninh): sóng mảnh */
function SecurityWaves({ W, H, color, gap = 34, period = 260, amp = 22 }: { W: number; H: number; color: string; gap?: number; period?: number; amp?: number }) {
  let d = '';
  for (let y = -amp; y < H + amp; y += gap) d += sinePath(-20, y, W + 20, y, amp, period, (y / gap) * 0.35);
  return <path d={d} fill="none" stroke={color} strokeWidth={1.2} />;
}

// ---------- ngữ cảnh vẽ ----------
interface Ctx {
  spec: CTSpec; d: CTData; p: Person; serial: string; W: number; H: number; P: CTPalette; G: string; mask: boolean;
  tf: TF; nf: TF; logo?: string; seal?: string; sig?: string;
}
interface Box { x: number; y: number; w: number; h: number; align: 'center' | 'left' }

// ---------- nội dung: dồn khối, tự co cho vừa khung ----------
interface Block { h: number; gap: number; draw: (y: number) => ReactNode }
function contentBlocks(c: Ctx, box: Box, k: number, withHeader: boolean): Block[] {
  const { spec, d, p, P } = c;
  const bi = spec.bilingual;
  const B: Block[] = [];
  const ax = box.align === 'center' ? box.x + box.w / 2 : box.x;
  const anchor = box.align === 'center' ? 'middle' : 'start';
  const mw = box.w;
  const base = 2100 / 210; // 1mm
  const mm = (v: number) => v * base * k;

  // header: đơn vị cấp + quốc hiệu
  if (withHeader) {
    const two = spec.kind === 'khen' && spec.quochieu;
    if (two) {
      const colW = mw * 0.46, s1 = mm(3.4), s2 = mm(3.6);
      const leftX = box.x + colW / 2, rightX = box.x + mw - colW / 2;
      const parent = (d.orgParent || '').toUpperCase(), org = (d.org || '').toUpperCase();
      const ps = fitS(parent, colW, s1, BODY);
      // tên đơn vị dài: xuống 2 dòng thay vì co nhỏ không đọc được
      let orgLines = [org], os = fitS(org, colW, s2, BODYB);
      if (os < s2 * 0.8) { orgLines = wrapBal(org, colW, s2 * 0.9, BODYB).slice(0, 2); os = Math.min(...orgLines.map((l) => fitS(l, colW, s2 * 0.9, BODYB))); }
      const qh1 = 'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', qh2 = 'Độc lập – Tự do – Hạnh phúc';
      const q1 = fitS(qh1, colW, s2, BODYB), q2 = fitS(qh2, colW, mm(3.8), { ...BODYB });
      const orgY0 = parent ? mm(8.2) : mm(5.4);
      const lineY = orgY0 + (orgLines.length - 1) * os * 1.25 + mm(1.8);
      const h = Math.max(mm(11.5), lineY + mm(1.5));
      B.push({
        h, gap: 0, draw: (y) => (
          <g key="hdr">
            {parent && <Txt x={leftX} y={y + mm(3.6)} t={parent} size={ps} f={BODY} fill={P.ink} />}
            {orgLines.map((l, i) => <Txt key={i} x={leftX} y={y + orgY0 + i * os * 1.25} t={l} size={os} f={BODYB} fill={P.ink} />)}
            <line x1={leftX - colW * 0.16} x2={leftX + colW * 0.16} y1={y + lineY} y2={y + lineY} stroke={P.ink} strokeWidth={mm(0.25)} />
            <Txt x={rightX} y={y + mm(3.6)} t={qh1} size={q1} f={BODYB} fill={P.ink} />
            <Txt x={rightX} y={y + mm(8.2)} t={qh2} size={q2} f={{ fam: 'Be Vietnam Pro', wt: 600 }} fill={P.ink} />
            <line x1={rightX - tw(qh2, q2, BODY) / 2} x2={rightX + tw(qh2, q2, BODY) / 2} y1={y + mm(10)} y2={y + mm(10)} stroke={P.ink} strokeWidth={mm(0.25)} />
          </g>
        ),
      });
    } else if (spec.quochieu && (spec.kind === 'khen' || spec.kind === 'bangkhen')) {
      const qh1 = 'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM', qh2 = 'Độc lập – Tự do – Hạnh phúc';
      const q1 = fitS(qh1, mw * 0.8, mm(4.2), BODYB), q2 = fitS(qh2, mw * 0.8, mm(4.2), BODY);
      B.push({
        h: mm(11.5), gap: 0, draw: (y) => (
          <g key="qh">
            <Txt x={box.x + mw / 2} y={y + mm(4.2)} t={qh1} size={q1} f={BODYB} fill={P.ink} />
            <Txt x={box.x + mw / 2} y={y + mm(9.2)} t={qh2} size={q2} f={BODY} fill={P.ink} />
            <line x1={box.x + mw / 2 - mm(16)} x2={box.x + mw / 2 + mm(16)} y1={y + mm(11)} y2={y + mm(11)} stroke={P.ink} strokeWidth={mm(0.25)} />
          </g>
        ),
      });
    } else if (d.org) {
      // đơn vị cấp (có logo thì logo đứng trên)
      const os = fitS(d.org.toUpperCase(), mw * 0.9, mm(4.2), { ...BODYB, ls: 0.08 });
      const lh = c.logo ? mm(16) : 0;
      B.push({
        h: lh + mm(5.5), gap: 0, draw: (y) => (
          <g key="org">
            {c.logo && !c.mask && <image href={c.logo} x={box.align === 'center' ? ax - mm(7) : ax} y={y} width={mm(14)} height={mm(14)} preserveAspectRatio="xMidYMid meet" />}
            <Txt x={ax} y={y + lh + mm(4.2)} t={d.org.toUpperCase()} size={os} f={{ ...BODYB, ls: 0.08 }} fill={P.sub} anchor={anchor} />
          </g>
        ),
      });
    }
  }
  // dòng người khen thưởng (trên tiêu đề, kiểu VN)
  if ((spec.kind === 'khen' || spec.kind === 'bangkhen') && d.issuer) {
    const lines = wrapBal(d.issuer.toUpperCase(), mw * 0.8, mm(4.6), BODYB).slice(0, 2);
    const s = Math.min(...lines.map((l) => fitS(l, mw * 0.86, mm(4.6), BODYB)));
    B.push({
      h: lines.length * s * 1.3, gap: mm(5), draw: (y) => <g key="iss">{lines.map((l, i) => <Txt key={i} x={ax} y={y + s * (0.95 + i * 1.3)} t={l} size={s} f={BODYB} fill={P.ink} anchor={anchor} />)}</g>,
    });
  }
  // tiêu đề
  const tf = { ...c.tf, ls: c.tf.fam === 'Montserrat' ? 0.06 : 0.03 };
  const title = (d.title || '').toUpperCase();
  const ts = fitS(title, mw * 0.92, mm(spec.kind === 'bangkhen' ? 21 : 19), tf);
  const enS = mm(4.2);
  const showEn = bi && !!d.titleEn;
  B.push({
    h: ts * 0.95 + (showEn ? enS * 1.9 : 0), gap: mm(5.5), draw: (y) => (
      <g key="title">
        <Txt x={ax} y={y + ts * 0.82} t={title} size={ts} f={tf} fill={c.mask ? c.P.accent : P.accent} anchor={anchor} />
        {showEn && <Txt x={ax} y={y + ts * 0.95 + enS * 1.35} t={d.titleEn.toUpperCase()} size={fitS(d.titleEn.toUpperCase(), mw * 0.9, enS, { ...BODYB, ls: 0.32 })} f={{ ...BODYB, ls: 0.32 }} fill={c.G} anchor={anchor} />}
      </g>
    ),
  });
  // câu dẫn
  if (d.lead) {
    const ls = mm(5.4), lsEn = mm(3.6);
    const showLeadEn = bi && !!d.leadEn;
    B.push({
      h: ls * 1.05 + (showLeadEn ? lsEn * 1.5 : 0), gap: mm(5), draw: (y) => (
        <g key="lead">
          <Txt x={ax} y={y + ls * 0.85} t={d.lead} size={fitS(d.lead, mw, ls, ITAL)} f={ITAL} fill={P.sub} anchor={anchor} />
          {showLeadEn && <Txt x={ax} y={y + ls * 1.05 + lsEn * 1.2} t={d.leadEn} size={fitS(d.leadEn, mw, lsEn, ITAL)} f={ITAL} fill={P.sub} anchor={anchor} op={0.85} />}
        </g>
      ),
    });
  }
  // tên người nhận
  const script = c.nf.fam === 'Great Vibes' || c.nf.fam === 'Alex Brush';
  const nmBase = mm(script ? 17 : 12);
  const nm = p.name || ' ';
  const ns = fitS(nm, mw * 0.9, nmBase, c.nf, 0.35);
  B.push({
    h: ns * (script ? 1.12 : 1.0), gap: mm(script ? 3 : 4.5), draw: (y) => (
      <g key="name">
        <Txt x={ax} y={y + ns * (script ? 0.86 : 0.82)} t={nm} size={ns} f={c.nf} fill={P.ink} anchor={anchor} />
        <line x1={box.align === 'center' ? ax - mw * 0.3 : ax} x2={box.align === 'center' ? ax + mw * 0.3 : ax + mw * 0.55}
          y1={y + ns * (script ? 1.04 : 0.98)} y2={y + ns * (script ? 1.04 : 0.98)} stroke={c.G} strokeWidth={mm(0.35)} />
      </g>
    ),
  });
  // đơn vị
  if (p.unit) {
    const ut = d.unitLabel ? `${d.unitLabel}: ${p.unit}` : p.unit;
    const us = fitS(ut, mw * 0.9, mm(4.8), BODY);
    B.push({ h: us * 1.1, gap: mm(3.2), draw: (y) => <Txt key="unit" x={ax} y={y + us * 0.9} t={ut} size={us} f={BODY} fill={P.ink} anchor={anchor} /> });
  }
  // thành tích / nội dung (dòng viết hoa = nổi bật)
  const paras = (p.reason || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const rows: { t: string; s: number; f: TF; fill: string }[] = [];
  for (const para of paras) {
    const caps = isCaps(para);
    const f = caps ? { ...SERIF, ls: 0.02 } : BODY;
    const base0 = caps ? mm(7.2) : mm(4.9);
    let s = base0, ls = wrapBal(para, mw * 0.94, s, f);
    while (ls.length > (caps ? 2 : 3) && s > base0 * 0.6) { s *= 0.94; ls = wrapBal(para, mw * 0.94, s, f); }
    for (const l of ls) rows.push({ t: l, s: fitS(l, mw * 0.96, s, f), f, fill: caps ? P.accent : P.ink });
  }
  if (rows.length) {
    const h = rows.reduce((a, r) => a + r.s * 1.38, 0);
    B.push({
      h, gap: mm(4), draw: (y) => {
        let yy = y;
        return <g key="reason">{rows.map((r, i) => { yy += r.s * 1.38; return <Txt key={i} x={ax} y={yy - r.s * 0.42} t={r.t} size={r.s} f={r.f} fill={r.fill} anchor={anchor} />; })}</g>;
      },
    });
  }
  if (bi && d.reasonEn) {
    const s = mm(3.7);
    const ls = wrapBal(d.reasonEn, mw * 0.86, s, ITAL).slice(0, 2);
    B.push({ h: ls.length * s * 1.3, gap: mm(1.5), draw: (y) => <g key="ren">{ls.map((l, i) => <Txt key={i} x={ax} y={y + s * (0.95 + i * 1.3)} t={l} size={fitS(l, mw, s, ITAL)} f={ITAL} fill={P.sub} anchor={anchor} />)}</g> });
  }
  if (d.detail && (spec.kind === 'course' || spec.kind === 'event')) {
    const s = fitS(d.detail, mw * 0.94, mm(3.6), BODY);
    B.push({ h: s * 1.2, gap: mm(3.2), draw: (y) => <Txt key="det" x={ax} y={y + s * 0.95} t={d.detail} size={s} f={BODY} fill={P.sub} anchor={anchor} /> });
  }
  return B;
}

function Content({ c, box, withHeader = true }: { c: Ctx; box: Box; withHeader?: boolean }) {
  // co dần đến khi vừa chiều cao khung
  let k = 1, blocks = contentBlocks(c, box, k, withHeader);
  const need = (bs: Block[]) => bs.reduce((a, b, i) => a + b.h + (i ? b.gap : 0), 0);
  while (need(blocks) > box.h && k > 0.5) { k *= 0.95; blocks = contentBlocks(c, box, k, withHeader); }
  const total = need(blocks);
  const free = Math.max(0, box.h - total);
  // khoảng trống chia cho các khe (tối đa gấp 2,2 khe gốc), phần dư canh giữa
  const gaps = blocks.slice(1).reduce((a, b) => a + b.gap, 0) || 1;
  const extraPerUnit = Math.min(free / gaps, 1.2);
  const used = total + gaps * extraPerUnit;
  let y = box.y + Math.max(0, (box.h - used) / 2);
  return (
    <g data-content="1">
      {blocks.map((b, i) => {
        if (i) y += b.gap * (1 + extraPerUnit);
        const node = b.draw(y);
        y += b.h;
        return node;
      })}
    </g>
  );
}

// ---------- chữ ký + số hiệu ----------
function SignBlock({ c, cx, y, w, role, name, withDate, sealHere }: { c: Ctx; cx: number; y: number; w: number; role: string; name: string; withDate: boolean; sealHere: boolean }) {
  const { P, d } = c;
  const mm = (v: number) => v * 10;
  const dateTxt = [d.place, d.date].filter(Boolean).join(', ');
  const ds = fitS(dateTxt, w, mm(4.4), ITAL);
  const rs = fitS(role.toUpperCase(), w, mm(3.9), BODYB);
  const nfS = fitS(name, w, mm(4.4), BODYB);
  let yy = y;
  const out: ReactNode[] = [];
  if (withDate && dateTxt) { out.push(<Txt key="d" x={cx} y={yy + ds * 0.85} t={dateTxt} size={ds} f={ITAL} fill={P.sub} />); yy += ds * 1.45; }
  out.push(<Txt key="r" x={cx} y={yy + rs * 0.9} t={role.toUpperCase()} size={rs} f={BODYB} fill={P.ink} />);
  const sigTop = yy + rs * 1.3, sigH = mm(19);
  if (!c.mask) {
    if (sealHere && c.seal) out.push(<image key="seal" href={c.seal} x={cx - mm(24)} y={sigTop - mm(2)} width={mm(30)} height={mm(30)} opacity={0.88} preserveAspectRatio="xMidYMid meet" />);
    if (sealHere && c.sig) out.push(<image key="sig" href={c.sig} x={cx - mm(18)} y={sigTop + mm(1)} width={mm(36)} height={mm(16)} preserveAspectRatio="xMidYMid meet" />);
  }
  out.push(<Txt key="n" x={cx} y={sigTop + sigH + nfS * 0.9} t={name} size={nfS} f={BODYB} fill={P.ink} />);
  return <g data-sign="1">{out}</g>;
}
const signHeight = (withDate: boolean) => (withDate ? 6.4 : 0) * 10 + 3.9 * 13 + 190 + 4.4 * 10 * 1.1;

function SerialTag({ c, x, y, anchor = 'start' }: { c: Ctx; x: number; y: number; anchor?: 'start' | 'middle' | 'end' }) {
  const lbl = c.spec.bilingual ? 'Số / No.: ' : 'Số: ';
  return <Txt x={x} y={y} t={`${lbl}${c.serial}`} size={34} f={BODY} fill={c.P.sub} anchor={anchor} />;
}

/** hàng chữ ký: 1 người (bên phải, có ngày tháng) hoặc 2 người (trái + phải); midNode = huy chương giữa (nếu có) */
/** serial: true = tự đặt số hiệu (cột trái nếu 1 người ký, giữa nếu 2 người ký và giữa trống) */
function Signatures({ c, x, y, w, midFree = 0, serial = true }: { c: Ctx; x: number; y: number; w: number; midFree?: number; serial?: boolean }) {
  const two = !!(c.d.signRole2 || c.d.signName2);
  const colW = Math.min(w * 0.36, 1000);
  const baseY = y + signHeight(true) - 14;
  if (!two) {
    return (
      <g>
        {serial && <SerialTag c={c} x={x + colW / 2} y={baseY} anchor="middle" />}
        <SignBlock c={c} cx={x + w - colW / 2} y={y} w={colW} role={c.d.signRole || ''} name={c.d.signName || ''} withDate sealHere />
      </g>
    );
  }
  const off = signHeight(true) - signHeight(false);
  return (
    <g>
      {serial && !midFree && <SerialTag c={c} x={x + w / 2} y={baseY} anchor="middle" />}
      <SignBlock c={c} cx={x + colW / 2} y={y + off} w={colW} role={c.d.signRole2 || ''} name={c.d.signName2 || ''} withDate={false} sealHere={false} />
      <SignBlock c={c} cx={x + w - colW / 2} y={y} w={colW} role={c.d.signRole || ''} name={c.d.signName || ''} withDate sealHere />
    </g>
  );
}

// ---------- bố cục ----------
function Layout({ c }: { c: Ctx }) {
  const { W, H, P, G, spec, mask } = c;
  const land = W > H;
  const m = 95; // lề ngoài 9,5mm
  const sigH = signHeight(true);
  const watermark = !mask && (
    <g opacity={0.07} fill="none" stroke={P.accent} strokeWidth={2}>
      {[0, 1, 2, 3].map((i) => <path key={i} d={rosePath(W / 2, H / 2, Math.min(W, H) * 0.24, Math.min(W, H) * 0.05, 10, (i * Math.PI) / 20)} />)}
    </g>
  );

  if (spec.layout === 'classic') {
    const band = 58, ins = m + 26;
    const box: Box = { x: ins + band + 90, y: ins + band + 70, w: W - 2 * (ins + band + 90), h: H - 2 * (ins + band + 70) - sigH - 40, align: 'center' };
    return (
      <>
        {watermark}
        <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={P.frame} strokeWidth={16} />
        <GuillocheFrame x0={ins} y0={ins} x1={W - ins} y1={H - ins} band={band} color={G} lines={4} period={46} sw={1.6} />
        <rect x={ins + band + 16} y={ins + band + 16} width={W - 2 * (ins + band + 16)} height={H - 2 * (ins + band + 16)} fill="none" stroke={P.frame} strokeWidth={4} />
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([fx, fy], i) => (
          <CornerFlourish key={i} x={fx ? W - ins - band - 26 : ins + band + 26} y={fy ? H - ins - band - 26 : ins + band + 26} s={land ? 330 : 280} color={G} flipX={!!fx} flipY={!!fy} />
        ))}
        <Content c={c} box={box} />
        <Signatures c={c} x={box.x} y={H - ins - band - 70 - sigH} w={box.w} />
      </>
    );
  }

  if (spec.layout === 'formal') {
    const band = 82, ins = m;
    const inner = ins + band + 40;
    const emb = 210;
    const box: Box = { x: inner + 80, y: inner + 30 + emb + 20, w: W - 2 * (inner + 80), h: H - 2 * inner - 60 - emb - 20 - sigH - 30, align: 'center' };
    return (
      <>
        <rect x={inner} y={inner} width={W - 2 * inner} height={H - 2 * inner} fill={mask ? P.paper : P.paper} />
        {watermark}
        <FormalBand x0={ins} y0={ins} x1={W - ins} y1={H - ins} band={band} fill={P.frame} gold={G} />
        <rect x={inner - 18} y={inner - 18} width={W - 2 * (inner - 18)} height={H - 2 * (inner - 18)} fill="none" stroke={G} strokeWidth={3} />
        <rect x={inner - 8} y={inner - 8} width={W - 2 * (inner - 8)} height={H - 2 * (inner - 8)} fill="none" stroke={G} strokeWidth={1.5} />
        {/* huy hiệu trên cùng: logo khách hoặc ngôi sao vàng trong vòng hoa văn */}
        {c.logo && !mask
          ? <image href={c.logo} x={W / 2 - emb / 2} y={inner + 20} width={emb} height={emb} preserveAspectRatio="xMidYMid meet" />
          : <Rosette cx={W / 2} cy={inner + 20 + emb / 2} r={emb / 2} gold={G} paper={P.paper} mask={mask} />}
        <Content c={c} box={box} />
        <Signatures c={c} x={box.x} y={H - inner - 40 - sigH} w={box.w} />
      </>
    );
  }

  if (spec.layout === 'laurel') {
    const ins = m + 10;
    const rr = land ? 150 : 140;
    const cx = W / 2, cy = H - ins - 40 - rr * 1.95;
    const box: Box = { x: ins + 170, y: ins + 120, w: W - 2 * (ins + 170), h: cy - rr * 1.6 - ins - 120, align: 'center' };
    return (
      <>
        {!mask && <g opacity={0.55}><SecurityWaves W={W} H={H} color={P.paper2} /></g>}
        <rect x={ins} y={ins} width={W - 2 * ins} height={H - 2 * ins} fill="none" stroke={G} strokeWidth={10} />
        <rect x={ins + 26} y={ins + 26} width={W - 2 * (ins + 26)} height={H - 2 * (ins + 26)} fill="none" stroke={G} strokeWidth={2.5} />
        {[[0, 0], [1, 0], [0, 1], [1, 1]].map(([fx, fy], i) => (
          <CornerFlourish key={i} x={fx ? W - ins - 40 : ins + 40} y={fy ? H - ins - 40 : ins + 40} s={250} color={G} flipX={!!fx} flipY={!!fy} />
        ))}
        <LaurelBranch cx={cx} cy={cy} R={rr * 1.3} color={G} side={-1} leaf={rr * 0.24} />
        <LaurelBranch cx={cx} cy={cy} R={rr * 1.3} color={G} side={1} leaf={rr * 0.24} />
        <Rosette cx={cx} cy={cy} r={rr} gold={G} paper={P.paper} ribbon={P.frame} ribbon2={P.frame2} mask={mask} text={yearOf(c.d.date)} />
        <Content c={c} box={box} />
        <Signatures c={c} x={ins + 140} y={H - ins - 80 - sigH} w={W - 2 * (ins + 140)} midFree={rr * 3} />
        {!!(c.d.signRole2 || c.d.signName2) && <SerialTag c={c} x={W - ins - 320} y={ins + 112} anchor="end" />}
      </>
    );
  }

  if (spec.layout === 'modern') {
    if (land) {
      const bw = W * 0.2;
      const box: Box = { x: bw + 170, y: m + 110, w: W - bw - 170 - m - 120, h: H - 2 * m - 220 - sigH - 30, align: 'left' };
      return (
        <>
          <rect x={-100} y={-100} width={bw + 100} height={H + 200} fill={P.frame} />
          <g opacity={mask ? 1 : 0.55}>
            {Array.from({ length: 9 }, (_, i) => <path key={i} d={sinePath(bw * 0.18 + i * bw * 0.08, -60, bw * 0.18 + i * bw * 0.08, H + 60, bw * 0.07, 220, i * 0.7)} fill="none" stroke={G} strokeWidth={2} />)}
          </g>
          <rect x={bw} y={-100} width={22} height={H + 200} fill={G} />
          <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={G} strokeWidth={3} opacity={0.9} />
          <Rosette cx={bw + 11} cy={m + 300} r={150} gold={G} paper={P.paper} ribbon={P.frame} ribbon2={P.frame2} mask={mask} />
          <Content c={c} box={box} />
          <Signatures c={c} x={box.x} y={H - m - 90 - sigH} w={box.w} serial={false} />
          <SerialTag c={c} x={W - m - 60} y={m + 70} anchor="end" />
        </>
      );
    }
    const bh = H * 0.15;
    const box: Box = { x: m + 140, y: bh + 260, w: W - 2 * (m + 140), h: H - bh - 260 - m - 140 - sigH, align: 'left' };
    return (
      <>
        <rect x={-100} y={-100} width={W + 200} height={bh + 100} fill={P.frame} />
        <g opacity={mask ? 1 : 0.55}>
          {Array.from({ length: 7 }, (_, i) => <path key={i} d={sinePath(-60, bh * 0.15 + i * bh * 0.11, W + 60, bh * 0.15 + i * bh * 0.11, bh * 0.07, 260, i * 0.7)} fill="none" stroke={G} strokeWidth={2} />)}
        </g>
        <rect x={-100} y={bh} width={W + 200} height={20} fill={G} />
        <rect x={m} y={m} width={W - 2 * m} height={H - 2 * m} fill="none" stroke={G} strokeWidth={3} opacity={0.9} />
        <Rosette cx={W - m - 300} cy={bh + 10} r={150} gold={G} paper={P.paper} ribbon={P.frame} ribbon2={P.frame2} mask={mask} />
        <Content c={c} box={box} />
        <Signatures c={c} x={box.x} y={H - m - 100 - sigH} w={box.w} />
      </>
    );
  }

  if (spec.layout === 'ribbon') {
    const ins = m + 30;
    const tri = Math.min(W, H) * 0.3;
    const rr = 135;
    const box: Box = { x: ins + 220, y: ins + 110, w: W - 2 * (ins + 220), h: H - 2 * (ins + 110) - sigH - 40, align: 'center' };
    const medalX = land ? ins + 330 : W / 2, medalY = land ? H - ins - 360 : H - ins - sigH - 260;
    return (
      <>
        {watermark}
        <path d={`M-100 -100 L${tri + 120} -100 L-100 ${tri + 120} Z`} fill={P.frame} />
        <path d={`M${tri + 120} -100 L${tri + 190} -100 L-100 ${tri + 190} L-100 ${tri + 120} Z`} fill={G} />
        <path d={`M${W + 100} ${H + 100} L${W - tri - 120} ${H + 100} L${W + 100} ${H - tri - 120} Z`} fill={P.frame} />
        <path d={`M${W - tri - 120} ${H + 100} L${W - tri - 190} ${H + 100} L${W + 100} ${H - tri - 190} L${W + 100} ${H - tri - 120} Z`} fill={G} />
        <rect x={ins} y={ins} width={W - 2 * ins} height={H - 2 * ins} fill="none" stroke={G} strokeWidth={4} />
        <rect x={ins + 16} y={ins + 16} width={W - 2 * (ins + 16)} height={H - 2 * (ins + 16)} fill="none" stroke={G} strokeWidth={1.5} />
        <Rosette cx={medalX} cy={medalY} r={rr} gold={G} paper={P.paper} ribbon={P.frame} ribbon2={P.frame2} mask={mask} text={yearOf(c.d.date)} />
        <Content c={c} box={land ? box : { ...box, h: medalY - rr - 60 - box.y }} />
        <Signatures c={c} x={land ? box.x + box.w * 0.3 : box.x} y={H - ins - 80 - sigH} w={land ? box.w * 0.7 : box.w} serial={false} />
        <SerialTag c={c} x={W - ins - 50} y={ins + 80} anchor="end" />
      </>
    );
  }

  // minimal
  const ins = m + 20;
  const box: Box = { x: ins + 200, y: ins + 150, w: W - 2 * (ins + 200), h: H - 2 * (ins + 150) - sigH - 30, align: 'center' };
  return (
    <>
      <rect x={ins} y={ins} width={W - 2 * ins} height={H - 2 * ins} fill="none" stroke={P.frame} strokeWidth={5} />
      <rect x={ins + 34} y={ins + 34} width={W - 2 * (ins + 34)} height={H - 2 * (ins + 34)} fill="none" stroke={G} strokeWidth={2} />
      <path d={scallop(W / 2, H - ins - 34 - 120, 74, 36, 0.1)} fill={G} />
      <path d={starPath(W / 2, H - ins - 34 - 120, 30, 13)} fill={mask ? P.paper : P.paper} />
      <Content c={c} box={box} />
      <Signatures c={c} x={box.x - 60} y={H - ins - 70 - sigH} w={box.w + 120} midFree={1} serial={false} />
      <SerialTag c={c} x={W - ins - 80} y={ins + 110} anchor="end" />
    </>
  );
}
const yearOf = (date: string) => (date.match(/(20\d\d)/) || [])[1] || '';

// ---------- 1 tấm ----------
/** print = bản in (vàng = màu phẳng). foilMask: true = khuôn cho 3D (trắng = nhũ), 'print' = khuôn xưởng (đen = nhũ) */
export function CertificateSvg({ spec, data, index = 0, bleed = false, print = false, foilMask = false, logo, seal, sig, style }: {
  spec: CTSpec; data: CTData; index?: number; bleed?: boolean; print?: boolean; foilMask?: boolean | 'print';
  logo?: string; seal?: string; sig?: string; style?: CSSProperties;
}) {
  const uid = useId().replace(/:/g, '');
  const dm = ctDims(spec);
  const W = dm.bw, H = dm.bh, s = dm.s;
  const b = bleed ? (CT_BLEED_MM * U) / s : 0;
  const P0 = ctPalette(spec.palette);
  const inv = foilMask === 'print', on = inv ? '#000000' : '#FFFFFF', off = inv ? '#FFFFFF' : '#000000';
  const P: CTPalette = foilMask ? { ...P0, paper: off, paper2: off, frame: off, frame2: off, accent: off, ink: off, sub: off, onFrame: off, gold: on } : P0;
  const G = foilMask ? on : spec.foil && !print ? `url(#${uid}-gold)` : P.gold;
  const people = ctPeople(data);
  const p = people[Math.min(index, people.length - 1)] || people[0];
  const c: Ctx = {
    spec, d: data, p, serial: ctSerial(data, index), W, H, P, G, mask: !!foilMask,
    tf: { fam: ctTitleFont(spec.font).fam, wt: ctTitleFont(spec.font).wt }, nf: { fam: ctNameFont(spec.nameFont).fam, wt: ctNameFont(spec.nameFont).wt },
    logo, seal, sig,
  };
  const vbW = (W + 2 * b) * s, vbH = (H + 2 * b) * s;
  return (
    <svg viewBox={`0 0 ${f1(vbW)} ${f1(vbH)}`} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet" data-ct-w={dm.wMm} data-ct-h={dm.hMm} data-ct-s={s}>
      <defs>
        <linearGradient id={`${uid}-gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8C6A22" /><stop offset="0.28" stopColor="#E9CF7A" /><stop offset="0.5" stopColor="#B58B32" />
          <stop offset="0.72" stopColor="#F3DE95" /><stop offset="1" stopColor="#9A7426" />
        </linearGradient>
        <radialGradient id={`${uid}-paper`} cx="0.5" cy="0.45" r="0.75">
          <stop offset="0" stopColor={P.paper} /><stop offset="1" stopColor={foilMask ? P.paper : mix(P.paper, P.paper2, 0.45)} />
        </radialGradient>
      </defs>
      <g transform={`scale(${s}) translate(${f1(b)} ${f1(b)})`}>
        <rect x={-b} y={-b} width={W + 2 * b} height={H + 2 * b} fill={foilMask ? off : `url(#${uid}-paper)`} />
        <Layout c={c} />
      </g>
    </svg>
  );
}
function mix(a: string, b: string, t: number) {
  const h = (s: string) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const A = h(a), B = h(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
