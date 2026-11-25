'use client';
// Brochure gấp 3 (A4 ngang 297×210, gấp cuộn / roll fold): 1 tờ 2 mặt = 6 ô.
//  · Mặt NGOÀI (trái→phải): ô gập vào trong 97mm | ô lưng 100mm | ô bìa 100mm
//  · Mặt TRONG (trái→phải): 100mm | 100mm | 97mm (mặt sau của ô gập vào trong)
// Ô gập vào trong hẹp hơn 3mm để gập không bị cấn. Mỗi ô có VAI TRÒ (bìa, liên hệ, giới thiệu, dịch vụ, bảng giá, quy trình…)
// tuỳ ngành → 1 engine SVG = BỐ CỤC NGÀNH × BẢNG MÀU × FONT, render code 100%, 0 AI. Chữ đo thật bằng canvas, tự co vừa ô,
// không bao giờ vượt nếp gấp. Đơn vị: 10 = 1mm (tờ 2970×2100).

import { useId, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';
import { FL_FONTS, FL_PALETTES, flFont, flPalette, textW, type FLPalette } from './flyer-engine';

export { FL_FONT_CSS as BR_FONT_CSS, useFLFonts as useBRFonts, FL_FONTS as BR_FONTS, FL_PALETTES as BR_PALETTES } from './flyer-engine';

export const BR_W_MM = 297, BR_H_MM = 210, BR_BLEED_MM = 2;
const U = 10; // đơn vị / mm
const W = BR_W_MM * U, H = BR_H_MM * U;
/** vị trí nếp gấp (mm tính từ mép trái) của từng mặt — dùng cho vạch gấp file in + kiểm tra */
export const BR_FOLDS = { outside: [97, 197], inside: [100, 200] } as const;
const M = 90; // lề an toàn trong mỗi ô (9mm từ nếp gấp / mép xén)

// ---------- bố cục theo ngành ----------
export type Role = 'cover' | 'back' | 'about' | 'services' | 'prices' | 'prices2' | 'why' | 'steps' | 'promo' | 'gallery';
type CoverStyle = 'bold' | 'photoTop' | 'framed';
export interface BRLayout { id: string; name: string; cover: CoverStyle; flap: Role; inside: [Role, Role, Role]; art: string }
export const BR_LAYOUTS: BRLayout[] = [
  { id: 'company', name: 'Hồ sơ năng lực', cover: 'bold', flap: 'why', inside: ['about', 'services', 'steps'], art: 'company' },
  { id: 'spa', name: 'Spa · thẩm mỹ', cover: 'framed', flap: 'promo', inside: ['about', 'prices', 'why'], art: 'spa' },
  { id: 'restaurant', name: 'Nhà hàng · menu', cover: 'photoTop', flap: 'promo', inside: ['gallery', 'prices', 'prices2'], art: 'restaurant' },
  { id: 'school', name: 'Trường · khoá học', cover: 'bold', flap: 'why', inside: ['about', 'prices', 'steps'], art: 'school' },
  { id: 'realestate', name: 'Bất động sản · dự án', cover: 'photoTop', flap: 'why', inside: ['about', 'gallery', 'prices'], art: 'realestate' },
  { id: 'clinic', name: 'Phòng khám', cover: 'framed', flap: 'promo', inside: ['about', 'services', 'steps'], art: 'clinic' },
];
export const brLayout = (id: string) => BR_LAYOUTS.find((l) => l.id === id) || BR_LAYOUTS[0];
/** vai trò 3 ô mặt ngoài (trái→phải) */
export const outsideRoles = (l: BRLayout): Role[] => [l.flap, 'back', 'cover'];

export interface BRSpec { layout: string; palette: string; font: string }
export interface BRTemplate { id: string; name: string; spec: BRSpec }
const PICKS: Record<string, [string, string][]> = {
  company: [['navy', 'montserrat'], ['indigo', 'bvp']],
  spa: [['rose', 'playfair'], ['dark', 'playfair']],
  restaurant: [['forest', 'baloo'], ['clay', 'oswald']],
  school: [['indigo', 'montserrat'], ['orange', 'baloo']],
  realestate: [['dark', 'playfair'], ['teal', 'montserrat']],
  clinic: [['teal', 'bvp'], ['navy', 'bvp']],
};
export const BR_TEMPLATES: BRTemplate[] = BR_LAYOUTS.flatMap((l) =>
  (PICKS[l.id] || []).map(([palette, font]) => ({ id: `${l.id}-${palette}`, name: `${l.name} · ${flPalette(palette).name}`, spec: { layout: l.id, palette, font } })),
);

// ---------- nội dung ----------
export type BRData = Record<string, string>;
export interface BRField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean }
export const BR_ROLE_NAME: Record<Role, string> = {
  cover: 'Bìa', back: 'Lưng · liên hệ', about: 'Giới thiệu', services: 'Dịch vụ', prices: 'Bảng giá', prices2: 'Bảng giá 2',
  why: 'Vì sao chọn chúng tôi', steps: 'Quy trình', promo: 'Ưu đãi', gallery: 'Hình ảnh',
};
export const BR_FIELDS: Record<Role, BRField[]> = {
  cover: [
    { key: 'brand', label: 'Thương hiệu', half: true },
    { key: 'tagline', label: 'Dòng nhỏ (slogan)', half: true },
    { key: 'title', label: 'Tiêu đề bìa' },
    { key: 'subtitle', label: 'Dòng phụ bìa' },
  ],
  back: [
    { key: 'phone', label: 'Điện thoại / hotline', half: true },
    { key: 'hours', label: 'Giờ mở cửa', half: true },
    { key: 'website', label: 'Website (tạo mã QR)', half: true },
    { key: 'email', label: 'Email', half: true },
    { key: 'address', label: 'Địa chỉ' },
  ],
  about: [
    { key: 'aboutTitle', label: 'Tiêu đề giới thiệu' },
    { key: 'about', label: 'Đoạn giới thiệu', multiline: true },
    { key: 'stats', label: 'Con số nổi bật (mỗi dòng: Số | Ý nghĩa)', multiline: true },
  ],
  services: [
    { key: 'servicesTitle', label: 'Tiêu đề dịch vụ' },
    { key: 'services', label: 'Dịch vụ (mỗi dòng: Tên | Mô tả ngắn)', multiline: true },
  ],
  prices: [
    { key: 'pricesTitle', label: 'Tiêu đề bảng giá' },
    { key: 'prices', label: 'Bảng giá (mỗi dòng: Tên | Giá)', multiline: true },
  ],
  prices2: [
    { key: 'prices2Title', label: 'Tiêu đề bảng giá 2' },
    { key: 'prices2', label: 'Bảng giá 2 (mỗi dòng: Tên | Giá)', multiline: true },
  ],
  why: [
    { key: 'whyTitle', label: 'Tiêu đề "vì sao chọn"' },
    { key: 'why', label: 'Lý do (mỗi dòng: Ý chính | Giải thích)', multiline: true },
  ],
  steps: [
    { key: 'stepsTitle', label: 'Tiêu đề quy trình' },
    { key: 'steps', label: 'Các bước (mỗi dòng: Bước | Mô tả)', multiline: true },
  ],
  promo: [
    { key: 'promoTitle', label: 'Dòng nhỏ ưu đãi', half: true },
    { key: 'promo', label: 'Ưu đãi (to nhất)', half: true },
    { key: 'promoNote', label: 'Điều kiện ưu đãi', multiline: true },
  ],
  gallery: [
    { key: 'galleryTitle', label: 'Tiêu đề ô hình ảnh' },
    { key: 'gallery', label: 'Chú thích ô hình ảnh', multiline: true },
  ],
};
/** ô nào dùng ảnh khách: ảnh 1 = bìa, ảnh 2 = ô "Hình ảnh" (nếu bố cục có) */
export const usesPhoto2 = (l: BRLayout) => l.inside.includes('gallery');

const SAMPLES: Record<string, BRData> = {
  company: {
    brand: 'AN PHÁT CONSTRUCTION', tagline: 'HỒ SƠ NĂNG LỰC 2027', title: 'Xây dựng bền vững, bàn giao đúng hẹn', subtitle: 'Tổng thầu thiết kế & thi công nhà xưởng, văn phòng, nhà phố',
    aboutTitle: 'Về chúng tôi', about: 'Hơn 15 năm đồng hành cùng doanh nghiệp Việt, An Phát đã hoàn thiện hàng trăm công trình từ nhà phố đến nhà xưởng quy mô lớn. Chúng tôi cam kết minh bạch chi phí, đúng tiến độ và bảo hành dài hạn.',
    stats: '15+ | Năm kinh nghiệm\n320 | Công trình\n98% | Đúng tiến độ\n10 năm | Bảo hành kết cấu',
    servicesTitle: 'Lĩnh vực hoạt động', services: 'Thiết kế kiến trúc | Concept, hồ sơ xin phép, 3D\nThi công trọn gói | Nhà phố, biệt thự, văn phòng\nNhà xưởng công nghiệp | Kết cấu thép tiền chế\nCải tạo & sửa chữa | Nâng tầng, chống thấm, nội thất',
    stepsTitle: 'Quy trình làm việc', steps: 'Khảo sát | Đo đạc hiện trạng, lắng nghe nhu cầu\nThiết kế & báo giá | Phương án, dự toán minh bạch\nKý hợp đồng | Cam kết tiến độ, bảo hành\nThi công | Giám sát hằng ngày, báo cáo ảnh\nBàn giao | Nghiệm thu, bàn giao hồ sơ',
    whyTitle: 'Vì sao chọn An Phát', why: 'Báo giá trọn gói | Không phát sinh ngoài hợp đồng\nĐội ngũ kỹ sư 60+ | Chứng chỉ hành nghề hạng I\nTiến độ minh bạch | Cập nhật ảnh công trình mỗi ngày\nBảo hành 10 năm | Kết cấu & chống thấm',
    phone: '1900 6868', hours: 'T2 – T7 · 8:00 – 17:30', website: 'anphatxaydung.vn', email: 'lienhe@anphatxaydung.vn', address: '68 Nguyễn Văn Linh, P. Tân Phong, Q.7, TP.HCM',
  },
  spa: {
    brand: 'THU HÀ BEAUTY SPA', tagline: 'CHĂM SÓC DA CHUẨN Y KHOA', title: 'Đánh thức làn da rạng rỡ', subtitle: 'Liệu trình cá nhân hoá cho từng làn da',
    aboutTitle: 'Câu chuyện của Thu Hà', about: 'Thu Hà Beauty Spa ra đời với mong muốn mang đến không gian thư giãn chuẩn mực và liệu trình chăm sóc da an toàn, hiệu quả. Đội ngũ chuyên viên được đào tạo bài bản, sản phẩm nhập khẩu chính hãng.',
    stats: '8 năm | Kinh nghiệm\n25.000+ | Khách hàng\n4.9★ | Đánh giá Google\n100% | Sản phẩm chính hãng',
    pricesTitle: 'Bảng giá dịch vụ', prices: 'Chăm sóc da cơ bản | 299K\nTrị mụn chuẩn y khoa | 450K\nNâng cơ trẻ hoá | 890K\nCấy trắng collagen | 690K\nMassage body đá nóng | 390K\nGội đầu dưỡng sinh | 150K\nTriệt lông vùng nách | 199K',
    whyTitle: 'Vì sao chọn Thu Hà', why: 'Soi da miễn phí | Tư vấn đúng tình trạng da\nChuyên viên tay nghề cao | Đào tạo chuẩn y khoa\nKhông gian riêng tư | Phòng đơn, sạch sẽ, thơm mát\nCam kết hiệu quả | Không hài lòng, làm lại miễn phí',
    promoTitle: 'ƯU ĐÃI KHÁCH MỚI', promo: 'GIẢM 30%', promoNote: 'Áp dụng cho lần trải nghiệm đầu tiên. Mang theo brochure này khi đến spa.',
    phone: '0909 234 567', hours: '9:00 – 21:00 mỗi ngày', website: 'thuhaspa.vn', email: 'hello@thuhaspa.vn', address: '146 Hai Bà Trưng, P. Đa Kao, Q.1, TP.HCM',
  },
  restaurant: {
    brand: 'BẾP NHÀ QUỐC BẢO', tagline: 'MÓN VIỆT · NẤU MỚI MỖI NGÀY', title: 'Hương vị cơm nhà giữa lòng phố', subtitle: 'Nhận đặt tiệc, cơm văn phòng & giao tận nơi',
    galleryTitle: 'Món ngon mỗi ngày', gallery: 'Nguyên liệu chợ sáng, nêm nếm vừa ăn như cơm mẹ nấu. Không bột ngọt, không dầu chiên lại.',
    pricesTitle: 'Món chính', prices: 'Cơm gà xối mỡ | 55K\nCơm sườn bì chả | 59K\nBún bò Huế | 65K\nCanh chua cá lóc | 89K\nThịt kho trứng | 79K\nRau muống xào tỏi | 45K\nGỏi cuốn tôm thịt | 45K',
    prices2Title: 'Đồ uống & tráng miệng', prices2: 'Trà đá / trà tắc | 10K\nNước sâm bí đao | 25K\nNước chanh dây | 29K\nSinh tố bơ | 39K\nChè khúc bạch | 35K\nBánh flan caramel | 25K',
    promoTitle: 'ĐẶT TIỆC TỪ 10 KHÁCH', promo: 'TẶNG LẨU', promoNote: 'Tặng 1 lẩu thái cho bàn tiệc từ 10 khách. Đặt trước 1 ngày qua hotline.',
    phone: '0938 456 789', hours: '10:00 – 22:00 mỗi ngày', website: 'bepnhaquocbao.vn', email: 'datban@bepnhaquocbao.vn', address: '72 Võ Văn Tần, P.6, Q.3, TP.HCM',
  },
  school: {
    brand: 'GIA KHÁNH ENGLISH', tagline: 'KHAI GIẢNG THÁNG 1/2027', title: 'Tự tin giao tiếp tiếng Anh sau 3 tháng', subtitle: 'Lớp nhỏ, giáo viên bản ngữ, cam kết đầu ra',
    aboutTitle: 'Về Gia Khánh English', about: 'Trung tâm Anh ngữ Gia Khánh tập trung vào phản xạ giao tiếp thực tế cho người đi làm và học sinh. Giáo trình độc quyền, lớp tối đa 12 học viên, học lại miễn phí nếu chưa đạt.',
    stats: '12 | Học viên / lớp\n100% | Giáo viên bản ngữ\n9.000+ | Học viên\n6.5+ | IELTS trung bình',
    pricesTitle: 'Khoá học & học phí', prices: 'Giao tiếp cơ bản (3 tháng) | 3.600K\nGiao tiếp nâng cao | 4.200K\nLuyện thi IELTS 6.5+ | 8.900K\nTiếng Anh thiếu nhi | 2.800K\nTiếng Anh doanh nghiệp | Liên hệ',
    stepsTitle: 'Lộ trình học', steps: 'Kiểm tra đầu vào | Miễn phí, có kết quả ngay\nXếp lớp phù hợp | Theo trình độ & mục tiêu\nHọc & luyện phản xạ | 3 buổi/tuần, 90 phút/buổi\nKiểm tra định kỳ | Báo cáo tiến bộ mỗi tháng\nCấp chứng chỉ | Cam kết đầu ra',
    whyTitle: 'Vì sao chọn Gia Khánh', why: 'Giáo viên bản ngữ | Có chứng chỉ TESOL/CELTA\nLớp học nhỏ | Tối đa 12 học viên\nHọc lại miễn phí | Nếu chưa đạt đầu ra\nGiờ học linh hoạt | Sáng, tối & cuối tuần',
    phone: '0912 345 678', hours: 'T2 – CN · 8:00 – 21:00', website: 'giakhanhenglish.edu.vn', email: 'tuvan@giakhanhenglish.edu.vn', address: '210 Cách Mạng Tháng 8, P.10, Q.3, TP.HCM',
  },
  realestate: {
    brand: 'AN KHANG RIVERSIDE', tagline: 'CĂN HỘ VEN SÔNG · TP. THỦ ĐỨC', title: 'Sống xanh bên sông, kết nối mọi tiện ích', subtitle: 'Bàn giao quý IV/2027 · Sổ hồng lâu dài',
    aboutTitle: 'Tổng quan dự án', about: 'An Khang Riverside toạ lạc ngay mặt sông Sài Gòn, 15 phút đến trung tâm Quận 1. Dự án gồm 3 tháp căn hộ với hơn 40 tiện ích nội khu, mật độ xây dựng chỉ 25%.',
    stats: '3,2 ha | Tổng diện tích\n3 tháp | 25 tầng\n40+ | Tiện ích nội khu\n25% | Mật độ xây dựng',
    galleryTitle: 'Tiện ích đẳng cấp', gallery: 'Hồ bơi tràn bờ, công viên ven sông 1,2km, gym, BBQ, khu vui chơi trẻ em và trường mầm non nội khu.',
    pricesTitle: 'Loại căn hộ', prices: '1PN · 52m² | từ 2,6 tỷ\n2PN · 68m² | từ 3,4 tỷ\n2PN+ · 79m² | từ 3,9 tỷ\n3PN · 98m² | từ 4,8 tỷ\nPenthouse | Liên hệ',
    whyTitle: 'Giá trị vượt trội', why: 'Vị trí ven sông | 15 phút đến Quận 1\nPháp lý minh bạch | Sổ hồng lâu dài\nThanh toán linh hoạt | Chỉ 15% đến khi nhận nhà\nChủ đầu tư uy tín | 20 năm kinh nghiệm',
    phone: '1900 8686', hours: 'Nhà mẫu mở cửa 8:00 – 18:00', website: 'ankhangriverside.vn', email: 'sales@ankhangriverside.vn', address: 'Nhà mẫu: 12 Nguyễn Văn Hưởng, P. Thảo Điền, TP. Thủ Đức',
  },
  clinic: {
    brand: 'NHA KHOA SAO MAI', tagline: 'NỤ CƯỜI KHOẺ · TỰ TIN', title: 'Chăm sóc răng miệng toàn diện cho cả gia đình', subtitle: 'Bác sĩ chuyên khoa · Thiết bị hiện đại',
    aboutTitle: 'Về Sao Mai', about: 'Nha khoa Sao Mai được thành lập bởi đội ngũ bác sĩ răng hàm mặt nhiều năm kinh nghiệm. Quy trình vô trùng chuẩn Bộ Y tế, chụp phim kỹ thuật số, không đau, không chờ lâu.',
    stats: '12 năm | Hoạt động\n15 | Bác sĩ chuyên khoa\n50.000+ | Lượt điều trị\n0đ | Khám & tư vấn',
    servicesTitle: 'Dịch vụ nổi bật', services: 'Niềng răng | Mắc cài & khay trong suốt\nCấy ghép Implant | Bảo hành trọn đời\nBọc sứ thẩm mỹ | Sứ toàn sứ tự nhiên\nTẩy trắng răng | Trắng sáng sau 60 phút\nNha khoa trẻ em | Nhẹ nhàng, không sợ hãi',
    stepsTitle: 'Quy trình khám', steps: 'Đặt lịch | Qua hotline hoặc website\nThăm khám & chụp phim | Bác sĩ khám trực tiếp\nTư vấn phác đồ | Báo giá rõ ràng từng hạng mục\nĐiều trị | Vô trùng, không đau\nTái khám | Nhắc lịch, chăm sóc sau điều trị',
    promoTitle: 'THÁNG NỤ CƯỜI', promo: 'GIẢM 20%', promoNote: 'Giảm 20% niềng răng & bọc sứ khi đặt lịch trước 31/01/2027. Khám & chụp phim miễn phí.',
    phone: '0901 111 222', hours: 'T2 – CN · 8:00 – 20:00', website: 'nhakhoasaomai.vn', email: 'datlich@nhakhoasaomai.vn', address: '35 Phan Xích Long, P.2, Q. Phú Nhuận, TP.HCM',
  },
};
export const BR_SAMPLES = SAMPLES;
export const defaultBRData = (layout = 'company'): BRData => ({ ...(SAMPLES[layout] || SAMPLES.company) });

// ---------- đo & xếp chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW ? (size * maxW) / w : size; };
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
function fitLines(text: string, maxW: number, size: number, ts: TS, maxLines: number, balance = true) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.5) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) lines = [...lines.slice(0, maxLines - 1), lines.slice(maxLines - 1).join(' ')];
  else if (balance && lines.length > 1 && !text.includes('\n')) {
    // cân dòng → không để 1 chữ mồ côi ở dòng cuối
    let lo = maxW * 0.5, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  return { lines, size: s };
}
type Anchor = 'start' | 'middle' | 'end';
interface BlockOpts { text: string; x: number; y: number; maxW: number; size: number; maxLines?: number; lh?: number; anchor?: Anchor; ts: TS; fill: string; upper?: boolean; opacity?: number; balance?: boolean }
/** khối chữ đặt theo MÉP TRÊN y → trả chiều cao đã chiếm */
function block(o: BlockOpts): { el: ReactNode; h: number } {
  const text = o.upper ? (o.text || '').toUpperCase() : o.text || '';
  if (!text.trim()) return { el: null, h: 0 };
  const { lines, size } = fitLines(text, o.maxW, o.size, o.ts, o.maxLines ?? 2, o.balance ?? true);
  const lh = (o.lh ?? 1.14) * size;
  const el = (
    <g fontFamily={`"${o.ts.fam}"`} fontWeight={o.ts.wt} fill={o.fill} textAnchor={o.anchor || 'start'} letterSpacing={o.ts.ls || undefined} opacity={o.opacity}>
      {lines.map((ln, i) => <text key={i} x={o.x} y={o.y + size * 0.92 + i * lh} fontSize={fitSize(ln, o.maxW, size, o.ts)}>{ln}</text>)}
    </g>
  );
  return { el, h: size * 0.92 + (lines.length - 1) * lh + size * 0.3 };
}
/** dựng nội dung theo hệ số k (1 → nhỏ dần) tới khi vừa chiều cao cho phép */
function fitV(avail: number, fn: (k: number) => { el: ReactNode; h: number }, min = 0.5) {
  let k = 1, r = fn(k);
  while (r.h > avail && k > min) { k *= 0.94; r = fn(k); }
  return r;
}
const rows = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean).map((ln) => { const [a, ...rest] = ln.split('|'); return { a: a.trim(), b: rest.join('|').trim() }; });
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255; };
const onColor = (bg: string, p: FLPalette) => (lum(bg) < 0.55 ? '#FFFFFF' : p.ink);
const initials = (s: string) => (s || 'A').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const rr = (x: number, y: number, w: number, h: number, r: number) => `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
const qrUrl = (w: string) => (/^https?:\/\//i.test(w) ? w : `https://${w.trim()}`);

// ---------- icon nét 24×24 ----------
const ICON: Record<string, string> = {
  phone: 'M6.5 3h3l1.5 4.5-2 1.3a12 12 0 005.7 5.7L16 16.5l4.5 1.5v3a1.5 1.5 0 01-1.6 1.5C10 22 2 14 2 5.1A1.5 1.5 0 013.5 3.5z',
  pin: 'M12 22s7-6.7 7-12A7 7 0 005 10c0 5.3 7 12 7 12zM12 7.5A2.5 2.5 0 1012 12.5 2.5 2.5 0 0012 7.5z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  mail: 'M3 6h18v12H3zM3 7l9 6.5L21 7',
  check: 'M5 12.5l4.5 4.5L19 7.5',
};
function Ico({ k, x, y, s, color, w = 2 }: { k: string; x: number; y: number; s: number; color: string; w?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s / 24})`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={ICON[k]} />
    </g>
  );
}

// ---------- tranh vẽ code thay ảnh (theo ngành) ----------
function Art({ kind, x, y, w, h, p, gid }: { kind: string; x: number; y: number; w: number; h: number; p: FLPalette; gid: string }) {
  const cx = x + w / 2, m = Math.min(w, h);
  const light = '#FFFFFF';
  const grad = (
    <defs>
      <linearGradient id={gid} x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stopColor={p.accent} />
        <stop offset="1" stopColor={p.deep} />
      </linearGradient>
    </defs>
  );
  const bg = <rect x={x} y={y} width={w} height={h} fill={`url(#${gid})`} />;
  if (kind === 'company') {
    const base = y + h * 0.92;
    const bs = [0.42, 0.62, 0.5, 0.78, 0.56, 0.68, 0.38];
    return (
      <g>{grad}{bg}
        <circle cx={x + w * 0.78} cy={y + h * 0.24} r={m * 0.13} fill={p.accent2} opacity={0.9} />
        {/* cần cẩu */}
        <path d={`M${x + w * 0.18} ${base}V${y + h * 0.16}M${x + w * 0.06} ${y + h * 0.2}H${x + w * 0.52}M${x + w * 0.18} ${y + h * 0.16}L${x + w * 0.06} ${y + h * 0.2}M${x + w * 0.18} ${y + h * 0.16}L${x + w * 0.52} ${y + h * 0.2}M${x + w * 0.46} ${y + h * 0.2}V${y + h * 0.36}`} stroke={p.accent2} strokeWidth={m * 0.012} fill="none" opacity={0.85} />
        <rect x={x + w * 0.44} y={y + h * 0.36} width={w * 0.04} height={h * 0.04} fill={p.accent2} opacity={0.85} />
        {bs.map((f, i) => {
          const bw = w * 0.13, bx = x + w * (0.03 + i * 0.137), bh = h * f, by = base - bh;
          const cols = 3, rws = Math.floor(bh / (h * 0.07));
          return (
            <g key={i}>
              <rect x={bx} y={by} width={bw} height={bh + h} fill={light} opacity={0.1 + (i % 3) * 0.06} />
              {Array.from({ length: rws }).map((_, r) => Array.from({ length: cols }).map((__, c) => (
                <rect key={`${r}-${c}`} x={bx + bw * (0.14 + c * 0.27)} y={by + h * 0.03 + r * h * 0.07} width={bw * 0.18} height={h * 0.035} fill={(r + c + i) % 4 === 0 ? p.accent2 : light} opacity={(r + c + i) % 4 === 0 ? 0.75 : 0.28} />
              )))}
            </g>
          );
        })}
        <rect x={x} y={base} width={w} height={h} fill={p.deep} />
      </g>
    );
  }
  if (kind === 'spa') {
    const c = { x: cx, y: y + h * 0.6 };
    const petal = (a: number, len: number, wid: number) => `M${c.x} ${c.y}C${c.x + Math.cos(a - wid) * len * 0.7} ${c.y - Math.sin(a - wid) * len * 0.7} ${c.x + Math.cos(a) * len} ${c.y - Math.sin(a) * len} ${c.x + Math.cos(a) * len} ${c.y - Math.sin(a) * len}C${c.x + Math.cos(a) * len} ${c.y - Math.sin(a) * len} ${c.x + Math.cos(a + wid) * len * 0.7} ${c.y - Math.sin(a + wid) * len * 0.7} ${c.x} ${c.y}Z`;
    return (
      <g>{grad}{bg}
        <circle cx={cx} cy={y + h * 0.42} r={m * 0.36} fill={p.accent2} opacity={0.35} />
        <circle cx={cx} cy={y + h * 0.42} r={m * 0.26} fill={p.accent2} opacity={0.4} />
        {[Math.PI * 0.5, Math.PI * 0.32, Math.PI * 0.68, Math.PI * 0.16, Math.PI * 0.84].map((a, i) => (
          <path key={i} d={petal(a, m * (i === 0 ? 0.42 : i < 3 ? 0.36 : 0.28), 0.32)} fill={light} opacity={i === 0 ? 0.95 : i < 3 ? 0.8 : 0.62} />
        ))}
        {[0, 1, 2].map((i) => <path key={i} d={`M${x} ${c.y + h * (0.08 + i * 0.07)}Q${x + w * 0.25} ${c.y + h * (0.04 + i * 0.07)} ${cx} ${c.y + h * (0.08 + i * 0.07)}T${x + w} ${c.y + h * (0.08 + i * 0.07)}`} stroke={light} strokeWidth={m * 0.008} fill="none" opacity={0.35 - i * 0.08} />)}
        {Array.from({ length: 14 }).map((_, i) => <circle key={i} cx={x + w * ((i * 0.137 + 0.07) % 1)} cy={y + h * ((i * 0.29 + 0.1) % 0.5)} r={m * (0.006 + (i % 3) * 0.004)} fill={light} opacity={0.6} />)}
      </g>
    );
  }
  if (kind === 'restaurant') {
    const c = { x: cx + w * 0.04, y: y + h * 0.52 };
    const R = m * 0.36;
    return (
      <g>{grad}{bg}
        <rect x={x} y={y} width={w} height={h} fill={p.deep} opacity={0.35} />
        {/* khăn kẻ ô */}
        {Array.from({ length: 6 }).map((_, i) => <rect key={i} x={x + w * 0.02 + i * w * 0.05} y={y} width={w * 0.025} height={h} fill={p.accent2} opacity={0.12} />)}
        <circle cx={c.x + R * 0.05} cy={c.y + R * 0.08} r={R * 1.02} fill="#000" opacity={0.18} />
        <circle cx={c.x} cy={c.y} r={R} fill="#FBF8F2" />
        <circle cx={c.x} cy={c.y} r={R * 0.8} fill="none" stroke={p.accent2} strokeWidth={R * 0.02} opacity={0.6} />
        <circle cx={c.x} cy={c.y} r={R * 0.66} fill={p.accent2} opacity={0.9} />
        {[[-0.25, -0.2, 0.2, p.accent], [0.22, -0.18, 0.17, '#5C8A3A'], [0.02, 0.26, 0.22, p.deep], [-0.28, 0.2, 0.12, '#E9E2CF'], [0.3, 0.22, 0.12, '#E9E2CF']].map(([dx, dy, r, col], i) => (
          <circle key={i} cx={c.x + R * (dx as number)} cy={c.y + R * (dy as number)} r={R * (r as number)} fill={col as string} opacity={0.92} />
        ))}
        {/* đũa */}
        <rect x={c.x + R * 1.12} y={c.y - R * 1.05} width={R * 0.07} height={R * 2.2} rx={R * 0.03} fill="#C9A06A" transform={`rotate(12 ${c.x + R * 1.15} ${c.y})`} />
        <rect x={c.x + R * 1.26} y={c.y - R * 1.05} width={R * 0.07} height={R * 2.2} rx={R * 0.03} fill="#B88A52" transform={`rotate(9 ${c.x + R * 1.29} ${c.y})`} />
        {[-0.3, 0, 0.3].map((d, i) => <path key={i} d={`M${c.x + R * d} ${c.y - R * 0.75}c${-R * 0.12} ${-R * 0.18} ${R * 0.12} ${-R * 0.3} 0 ${-R * 0.5}s${R * 0.12} ${-R * 0.32} 0 ${-R * 0.5}`} stroke={light} strokeWidth={R * 0.035} fill="none" strokeLinecap="round" opacity={0.7} />)}
      </g>
    );
  }
  if (kind === 'school') {
    const c = { x: cx, y: y + h * 0.66 };
    const bw = m * 0.4;
    return (
      <g>{grad}{bg}
        {Array.from({ length: 9 }).map((_, i) => <path key={i} d={`M${x + w * ((i * 0.23 + 0.06) % 1)} ${y + h * ((i * 0.31 + 0.08) % 0.5)}l${m * 0.015} ${m * 0.035}l${m * 0.035} ${m * 0.015}l${-m * 0.035} ${m * 0.015}l${-m * 0.015} ${m * 0.035}l${-m * 0.015} ${-m * 0.035}l${-m * 0.035} ${-m * 0.015}l${m * 0.035} ${-m * 0.015}z`} fill={p.accent2} opacity={0.8} />)}
        {/* sách mở */}
        <path d={`M${c.x} ${c.y}C${c.x - bw * 0.4} ${c.y - bw * 0.16} ${c.x - bw * 0.8} ${c.y - bw * 0.16} ${c.x - bw} ${c.y - bw * 0.08}V${c.y + bw * 0.42}C${c.x - bw * 0.8} ${c.y + bw * 0.34} ${c.x - bw * 0.4} ${c.y + bw * 0.34} ${c.x} ${c.y + bw * 0.5}Z`} fill={light} />
        <path d={`M${c.x} ${c.y}C${c.x + bw * 0.4} ${c.y - bw * 0.16} ${c.x + bw * 0.8} ${c.y - bw * 0.16} ${c.x + bw} ${c.y - bw * 0.08}V${c.y + bw * 0.42}C${c.x + bw * 0.8} ${c.y + bw * 0.34} ${c.x + bw * 0.4} ${c.y + bw * 0.34} ${c.x} ${c.y + bw * 0.5}Z`} fill="#EEF0F7" />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${c.x - bw * 0.85} ${c.y + bw * (0.04 + i * 0.09)}C${c.x - bw * 0.6} ${c.y - bw * (0.02 - i * 0.09)} ${c.x - bw * 0.3} ${c.y - bw * (0.02 - i * 0.09)} ${c.x - bw * 0.12} ${c.y + bw * (0.06 + i * 0.09)}`} stroke={p.accent} strokeWidth={m * 0.006} fill="none" opacity={0.35} />)}
        {/* mũ tốt nghiệp */}
        <path d={`M${c.x} ${c.y - bw * 0.95}L${c.x + bw * 0.62} ${c.y - bw * 0.72}L${c.x} ${c.y - bw * 0.49}L${c.x - bw * 0.62} ${c.y - bw * 0.72}Z`} fill={p.deep} />
        <path d={`M${c.x - bw * 0.36} ${c.y - bw * 0.62}V${c.y - bw * 0.4}C${c.x - bw * 0.2} ${c.y - bw * 0.3} ${c.x + bw * 0.2} ${c.y - bw * 0.3} ${c.x + bw * 0.36} ${c.y - bw * 0.4}V${c.y - bw * 0.62}L${c.x} ${c.y - bw * 0.49}Z`} fill={p.deep} opacity={0.85} />
        <path d={`M${c.x + bw * 0.5} ${c.y - bw * 0.76}V${c.y - bw * 0.45}`} stroke={p.accent2} strokeWidth={m * 0.01} />
        <circle cx={c.x + bw * 0.5} cy={c.y - bw * 0.43} r={m * 0.016} fill={p.accent2} />
      </g>
    );
  }
  if (kind === 'realestate') {
    const base = y + h * 0.78;
    const towers = [[0.12, 0.42, 0.16], [0.3, 0.6, 0.15], [0.5, 0.72, 0.17], [0.7, 0.52, 0.15], [0.86, 0.34, 0.12]];
    return (
      <g>{grad}{bg}
        <circle cx={x + w * 0.8} cy={y + h * 0.18} r={m * 0.07} fill={p.accent2} opacity={0.9} />
        {towers.map(([fx, fh, fw], i) => {
          const tw = w * fw, tx = x + w * fx - tw / 2, th = h * fh, ty = base - th;
          return (
            <g key={i}>
              <rect x={tx} y={ty} width={tw} height={th} fill={light} opacity={0.16 + (i % 2) * 0.08} />
              <rect x={tx} y={ty} width={tw * 0.08} height={th} fill={p.accent2} opacity={0.5} />
              {Array.from({ length: Math.floor(th / (h * 0.045)) }).map((_, r) => (
                <rect key={r} x={tx + tw * 0.18} y={ty + h * 0.02 + r * h * 0.045} width={tw * 0.7} height={h * 0.014} fill={light} opacity={r % 3 === 1 ? 0.6 : 0.3} />
              ))}
            </g>
          );
        })}
        <rect x={x} y={base} width={w} height={h} fill={p.deep} />
        {[0, 1, 2, 3].map((i) => <path key={i} d={`M${x} ${base + h * (0.04 + i * 0.045)}q${w * 0.06} ${-h * 0.02} ${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0t${w * 0.12} 0`} stroke={p.accent2} strokeWidth={m * 0.006} fill="none" opacity={0.55 - i * 0.1} />)}
      </g>
    );
  }
  // clinic
  const c = { x: cx, y: y + h * 0.5 };
  const t = m * 0.34;
  return (
    <g>{grad}{bg}
      <circle cx={c.x} cy={c.y} r={m * 0.38} fill={light} opacity={0.14} />
      <circle cx={c.x} cy={c.y} r={m * 0.3} fill={light} opacity={0.14} />
      {/* răng */}
      <path d={`M${c.x} ${c.y - t * 0.5}C${c.x - t * 0.2} ${c.y - t * 0.72} ${c.x - t * 0.72} ${c.y - t * 0.74} ${c.x - t * 0.7} ${c.y - t * 0.14}C${c.x - t * 0.68} ${c.y + t * 0.3} ${c.x - t * 0.5} ${c.y + t * 0.42} ${c.x - t * 0.42} ${c.y + t * 0.8}C${c.x - t * 0.36} ${c.y + t * 1.05} ${c.x - t * 0.14} ${c.y + t * 1.02} ${c.x - t * 0.1} ${c.y + t * 0.7}C${c.x - t * 0.06} ${c.y + t * 0.42} ${c.x + t * 0.06} ${c.y + t * 0.42} ${c.x + t * 0.1} ${c.y + t * 0.7}C${c.x + t * 0.14} ${c.y + t * 1.02} ${c.x + t * 0.36} ${c.y + t * 1.05} ${c.x + t * 0.42} ${c.y + t * 0.8}C${c.x + t * 0.5} ${c.y + t * 0.42} ${c.x + t * 0.68} ${c.y + t * 0.3} ${c.x + t * 0.7} ${c.y - t * 0.14}C${c.x + t * 0.72} ${c.y - t * 0.74} ${c.x + t * 0.2} ${c.y - t * 0.72} ${c.x} ${c.y - t * 0.5}Z`} fill={light} />
      <path d={`M${c.x - t * 0.42} ${c.y - t * 0.3}C${c.x - t * 0.4} ${c.y - t * 0.5} ${c.x - t * 0.22} ${c.y - t * 0.56} ${c.x - t * 0.1} ${c.y - t * 0.48}`} stroke={p.accent} strokeWidth={m * 0.01} fill="none" strokeLinecap="round" opacity={0.4} />
      <path d={`M${x} ${y + h * 0.86}H${x + w * 0.3}l${w * 0.04} ${-h * 0.08}l${w * 0.05} ${h * 0.14}l${w * 0.05} ${-h * 0.2}l${w * 0.04} ${h * 0.14}H${x + w}`} stroke={p.accent2} strokeWidth={m * 0.012} fill="none" strokeLinejoin="round" />
      {[[0.16, 0.2], [0.84, 0.3], [0.2, 0.62], [0.86, 0.66]].map(([fx, fy], i) => (
        <path key={i} d={`M${x + w * fx - m * 0.03} ${y + h * fy}h${m * 0.06}M${x + w * fx} ${y + h * fy - m * 0.03}v${m * 0.06}`} stroke={light} strokeWidth={m * 0.014} strokeLinecap="round" opacity={0.75} />
      ))}
    </g>
  );
}

const CTA: Record<string, string> = { restaurant: 'ĐẶT BÀN · ĐẶT TIỆC', realestate: 'HOTLINE BÁN HÀNG', school: 'ĐĂNG KÝ HỌC THỬ MIỄN PHÍ', clinic: 'ĐẶT LỊCH KHÁM', spa: 'ĐẶT LỊCH NGAY' };

// ---------- SVG 1 mặt brochure ----------
export function BrochureSvg({ spec, data, side, bleed = false, guides = false, photo1, photo2, style }: {
  spec: BRSpec; data: BRData; side: 'outside' | 'inside'; bleed?: boolean; guides?: boolean; photo1?: string; photo2?: string; style?: CSSProperties;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const L = brLayout(spec.layout);
  const p = flPalette(spec.palette);
  const f = flFont(spec.font);
  const D: TS = { fam: f.family, wt: f.weight };
  const B6: TS = { fam: 'Be Vietnam Pro', wt: 600 };
  const B8: TS = { fam: 'Be Vietnam Pro', wt: 800 };
  const b = bleed ? BR_BLEED_MM * U : 0;
  const dark = lum(p.paper) < 0.4;
  const tint = dark ? '#1E2128' : p.accent;
  const defs: ReactNode[] = [];
  let nid = 0;
  const id = (k: string) => `${uid}${k}${nid++}`;

  const panels = side === 'outside'
    ? [{ x: 0, w: 970, role: L.flap }, { x: 970, w: 1000, role: 'back' as Role }, { x: 1970, w: 1000, role: 'cover' as Role }]
    : [{ x: 0, w: 1000, role: L.inside[0] }, { x: 1000, w: 1000, role: L.inside[1] }, { x: 2000, w: 970, role: L.inside[2] }];

  // nền 1 ô — tràn lề xén ở mép ngoài tờ
  const bgRect = (x: number, w: number, fill: string, opacity?: number) => {
    const x0 = x <= 0 ? -b : x, x1 = x + w >= W ? W + b : x + w;
    return <rect x={x0} y={-b} width={x1 - x0} height={H + b * 2} fill={fill} opacity={opacity} />;
  };
  // ô ảnh: ảnh khách (cắt vừa) hoặc tranh vẽ code
  const slot = (x: number, y: number, w: number, h: number, d: string, ph?: string) => {
    const cid = id('c');
    defs.push(<clipPath key={cid} id={cid}><path d={d} /></clipPath>);
    if (ph) return <image href={ph} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" clipPath={`url(#${cid})`} />;
    return <g clipPath={`url(#${cid})`}><Art kind={L.art} x={x} y={y} w={w} h={h} p={p} gid={id('g')} /></g>;
  };

  // tiêu đề ô bên trong: số thứ tự + tiêu đề + gạch nhấn
  const heading = (x: number, y: number, w: number, num: string, title: string, k: number, ink: string, acc: string) => {
    const n = block({ text: num, x, y, maxW: w, size: 30 * k, ts: { ...B8, ls: 4 }, fill: acc, maxLines: 1 });
    const t = block({ text: title, x, y: y + n.h + 6, maxW: w, size: 74 * k, ts: D, fill: ink, maxLines: 2, lh: 1.08 });
    const by = y + n.h + 6 + t.h + 12 * k;
    return { el: <g>{n.el}{t.el}<rect x={x} y={by} width={70} height={8} rx={4} fill={p.accent2} /></g>, h: by + 8 - y + 44 * k };
  };

  const render = (role: Role, x: number, w: number, idx: number): ReactNode => {
    const cx = x + M, cw = w - M * 2, top = M + 20, bottom = H - M;
    const num = idx > 0 ? String(idx).padStart(2, '0') : '';
    const soft = idx % 2 === 0; // ô giữa nền nhạt để tách ô
    const paperBg = <>{bgRect(x, w, p.paper)}{soft && bgRect(x, w, tint, dark ? 1 : 0.06)}</>;

    if (role === 'cover') {
      const brand = data.brand || '';
      if (L.cover === 'bold') {
        const on = onColor(p.accent, p);
        const artY = H * 0.6;
        const r = fitV(artY - 60 - top - 150, (k) => {
          let y = top + 150;
          const t1 = block({ text: data.tagline, x: cx, y, maxW: cw, size: 30 * k, ts: { ...B8, ls: 3 }, fill: p.accent2, upper: true, maxLines: 2 }); y += t1.h + 24 * k;
          const t2 = block({ text: data.title, x: cx, y, maxW: cw, size: 118 * k, ts: D, fill: on, maxLines: 4, lh: 1.06 }); y += t2.h + 26 * k;
          const t3 = block({ text: data.subtitle, x: cx, y, maxW: cw, size: 36 * k, ts: B6, fill: on, maxLines: 3, lh: 1.35, opacity: 0.88 }); y += t3.h;
          return { el: <>{t1.el}{t2.el}{t3.el}</>, h: y - top - 150 };
        });
        const mark = 74;
        return (
          <>
            {bgRect(x, w, p.accent)}
            <rect x={x} y={-b} width={22} height={H + b * 2} fill={p.accent2} opacity={0.9} />
            <circle cx={cx + mark / 2} cy={top + mark / 2} r={mark / 2} fill={p.accent2} />
            {block({ text: initials(brand), x: cx + mark / 2, y: top + mark * 0.17, maxW: mark * 0.78, size: 34, ts: D, fill: p.accent, anchor: 'middle', maxLines: 1 }).el}
            {block({ text: brand, x: cx + mark + 22, y: top + mark * 0.22, maxW: cw - mark - 22, size: 36, ts: { ...D, ls: 1 }, fill: on, maxLines: 1 }).el}
            {r.el}
            {slot(cx, artY, cw + M + b, bottom - artY + M + b, `M${cx + 40} ${artY}H${x + w + b}V${H + b}H${cx}V${artY + 40}A40 40 0 0 1 ${cx + 40} ${artY}Z`, photo1)}
          </>
        );
      }
      if (L.cover === 'photoTop') {
        const ph = H * 0.56;
        const r = fitV(bottom - ph - 70, (k) => {
          let y = ph + 70;
          const t1 = block({ text: data.tagline, x: cx, y, maxW: cw, size: 28 * k, ts: { ...B8, ls: 3 }, fill: p.accent, upper: true, maxLines: 2 }); y += t1.h + 18 * k;
          const t2 = block({ text: data.title, x: cx, y, maxW: cw, size: 96 * k, ts: D, fill: p.ink, maxLines: 4, lh: 1.08 }); y += t2.h + 22 * k;
          const t3 = block({ text: data.subtitle, x: cx, y, maxW: cw, size: 34 * k, ts: B6, fill: p.sub, maxLines: 3, lh: 1.35 }); y += t3.h;
          return { el: <>{t1.el}{t2.el}{t3.el}</>, h: y - ph - 70 };
        });
        const pillH = 76;
        const bw = Math.min(cw, textW(brand, 32, { ...D, ls: 1 }) + 64);
        return (
          <>
            {bgRect(x, w, p.paper)}
            {slot(x, -b, w + b, ph + b, `M${x} ${-b}H${x + w + b}V${ph - 50}Q${x + w * 0.7} ${ph + 40} ${x} ${ph - 10}Z`, photo1)}
            <path d={rr(cx, top, bw, pillH, pillH / 2)} fill={p.paper} />
            <g>{block({ text: brand, x: cx + bw / 2, y: top + pillH * 0.2, maxW: bw - 56, size: 32, ts: { ...D, ls: 1 }, fill: p.accent, maxLines: 1, anchor: 'middle' }).el}</g>
            <rect x={cx} y={ph + 30} width={90} height={10} rx={5} fill={p.accent2} />
            {r.el}
          </>
        );
      }
      // framed
      const ccy = top + 590, R = 320;
      const r = fitV(bottom - (ccy + R + 80) - 40, (k0) => {
        const k = k0 * 1.3;
        let y = ccy + R + 80;
        const t2 = block({ text: data.title, x: x + w / 2, y, maxW: cw - 20, size: 82 * k, ts: D, fill: p.ink, maxLines: 3, lh: 1.1, anchor: 'middle' }); y += t2.h + 18 * k;
        const t3 = block({ text: data.subtitle, x: x + w / 2, y, maxW: cw - 40, size: 32 * k, ts: B6, fill: p.sub, maxLines: 3, lh: 1.35, anchor: 'middle' }); y += t3.h;
        return { el: <>{t2.el}{t3.el}</>, h: y - (ccy + R + 80) };
      });
      const fsh = Math.max(0, (bottom - (ccy + R + 80) - 40 - r.h) * 0.4);
      return (
        <>
          {bgRect(x, w, p.paper)}
          <rect x={x + 44} y={44} width={w - 88} height={H - 88} fill="none" stroke={p.accent2} strokeWidth={4} />
          <rect x={x + 58} y={58} width={w - 116} height={H - 116} fill="none" stroke={p.accent2} strokeWidth={1.5} opacity={0.7} />
          {block({ text: brand, x: x + w / 2, y: top + 10, maxW: cw - 20, size: 42, ts: { ...D, ls: 2 }, fill: p.accent, maxLines: 1, anchor: 'middle' }).el}
          {block({ text: data.tagline, x: x + w / 2, y: top + 80, maxW: cw - 20, size: 24, ts: { ...B8, ls: 3 }, fill: p.sub, upper: true, maxLines: 1, anchor: 'middle' }).el}
          <circle cx={x + w / 2} cy={ccy} r={R + 22} fill="none" stroke={p.accent2} strokeWidth={5} />
          {slot(x + w / 2 - R, ccy - R, R * 2, R * 2, `M${x + w / 2 - R} ${ccy}a${R} ${R} 0 1 0 ${R * 2} 0a${R} ${R} 0 1 0 ${-R * 2} 0Z`, photo1)}
          <g transform={`translate(0 ${fsh})`}>{r.el}</g>
        </>
      );
    }

    if (role === 'back') {
      const bg = p.deep;
      const on = onColor(bg, p);
      const contacts = ([['phone', data.phone], ['clock', data.hours], ['pin', data.address], ['globe', data.website], ['mail', data.email]] as const).filter(([, v]) => (v || '').trim());
      const qrS = 230;
      const mapH = 330;
      const restH = bottom - top;
      const r = fitV(restH - mapH - qrS - 120, (k0) => {
        const k = k0 * 1.25;
        let y = top;
        const mark = 90 * k;
        const head = (
          <>
            <circle cx={x + w / 2} cy={y + mark / 2} r={mark / 2} fill={p.accent2} />
            {block({ text: initials(data.brand), x: x + w / 2, y: y + mark * 0.17, maxW: mark * 0.78, size: 40 * k, ts: D, fill: p.deep, anchor: 'middle', maxLines: 1 }).el}
          </>
        );
        y += mark + 24 * k;
        const t1 = block({ text: data.brand, x: x + w / 2, y, maxW: cw, size: 48 * k, ts: { ...D, ls: 1 }, fill: on, maxLines: 2, anchor: 'middle' }); y += t1.h + 6;
        const t2 = block({ text: data.tagline, x: x + w / 2, y, maxW: cw, size: 22 * k, ts: { ...B8, ls: 2 }, fill: p.accent2, upper: true, maxLines: 2, anchor: 'middle' }); y += t2.h + 36 * k;
        const items: ReactNode[] = [];
        contacts.forEach(([ic, v], i) => {
          const s = 34 * k;
          const t = block({ text: v, x: cx + s + 22, y, maxW: cw - s - 22, size: 30 * k, ts: ic === 'phone' ? B8 : B6, fill: on, maxLines: 2, lh: 1.3, balance: false });
          items.push(<g key={i}><Ico k={ic} x={cx} y={y + 2} s={s} color={p.accent2} />{t.el}</g>);
          y += Math.max(t.h, s) + 20 * k;
        });
        return { el: <>{head}{t1.el}{t2.el}{items}</>, h: y - top };
      });
      // bản đồ vẽ code + QR
      const my = bottom - qrS - 40 - mapH;
      const mx = cx, mw = cw;
      const cid = id('m');
      defs.push(<clipPath key={cid} id={cid}><path d={rr(mx, my, mw, mapH, 22)} /></clipPath>);
      const pinX = mx + mw * 0.56, pinY = my + mapH * 0.5;
      const { d: qd, n: qn } = qrPath(qrUrl(data.website || data.brand || 'mivy.vn'));
      return (
        <>
          {bgRect(x, w, bg)}
          {r.el}
          <g clipPath={`url(#${cid})`}>
            <rect x={mx} y={my} width={mw} height={mapH} fill="#EEF0EA" />
            <path d={`M${mx} ${my + mapH * 0.78}C${mx + mw * 0.3} ${my + mapH * 0.62} ${mx + mw * 0.55} ${my + mapH * 0.98} ${mx + mw} ${my + mapH * 0.74}V${my + mapH}H${mx}Z`} fill="#BFD9E8" />
            <rect x={mx + mw * 0.08} y={my + mapH * 0.08} width={mw * 0.2} height={mapH * 0.3} rx={8} fill="#CFE3C4" />
            {[[0, 0.32, 1, 0.38, 22], [0, 0.6, 1, 0.52, 16], [0.36, 0, 0.42, 1, 22], [0.74, 0, 0.68, 1, 14]].map(([x1, y1, x2, y2, sw], i) => (
              <line key={i} x1={mx + mw * x1} y1={my + mapH * y1} x2={mx + mw * x2} y2={my + mapH * y2} stroke="#FFFFFF" strokeWidth={sw} strokeLinecap="round" />
            ))}
            <circle cx={pinX} cy={pinY} r={46} fill={p.accent} opacity={0.18} />
            <path d={`M${pinX} ${pinY + 6}c-24 -26 -36 -42 -36 -60a36 36 0 0 1 72 0c0 18 -12 34 -36 60z`} fill={p.accent} />
            <circle cx={pinX} cy={pinY - 54} r={13} fill="#FFFFFF" />
          </g>
          <path d={rr(mx, my, mw, mapH, 22)} fill="none" stroke={on} strokeOpacity={0.2} strokeWidth={2} />
          <rect x={cx} y={bottom - qrS} width={qrS} height={qrS} rx={14} fill="#FFFFFF" />
          <path d={qd} transform={`translate(${cx + 16} ${bottom - qrS + 16}) scale(${(qrS - 32) / qn})`} fill="#111111" />
          {block({ text: 'Quét mã để xem website & đặt lịch', x: cx + qrS + 28, y: bottom - qrS + 30, maxW: cw - qrS - 28, size: 30, ts: B8, fill: on, maxLines: 3, lh: 1.3 }).el}
          {block({ text: data.website, x: cx + qrS + 28, y: bottom - 70, maxW: cw - qrS - 28, size: 24, ts: B6, fill: p.accent2, maxLines: 1 }).el}
        </>
      );
    }

    if (role === 'promo') {
      // phiếu ưu đãi: xếp dòng chảy từ trên xuống (đo thật từng khối) → chữ to mấy cũng không đè nhau
      const bg = p.accent, on = onColor(bg, p);
      const ix = x + w / 2, iw = cw - 90;
      const build = (k: number) => {
        let y = top + 150 * k;
        const boxY = y;
        y += 70 * k;
        const t1 = block({ text: data.promoTitle, x: ix, y, maxW: iw, size: 34 * k, ts: { ...B8, ls: 3 }, fill: on, upper: true, maxLines: 2, anchor: 'middle' }); y += t1.h + 30 * k;
        const pr = block({ text: data.promo, x: ix, y, maxW: iw, size: 180 * k, ts: D, fill: p.accent2, maxLines: 2, lh: 1.02, anchor: 'middle' }); y += pr.h + 40 * k;
        const divY = y; y += 50 * k;
        const t2 = block({ text: 'MANG BROCHURE NÀY KHI ĐẾN', x: ix, y, maxW: iw, size: 26 * k, ts: { ...B8, ls: 2 }, fill: on, maxLines: 2, anchor: 'middle', opacity: 0.9 }); y += t2.h + 16 * k;
        const t3 = block({ text: data.phone, x: ix, y, maxW: iw, size: 62 * k, ts: D, fill: on, maxLines: 1, anchor: 'middle' }); y += t3.h + 60 * k;
        const boxH = y - boxY;
        y += 50 * k;
        const t4 = block({ text: data.promoNote, x: ix, y, maxW: cw - 20, size: 32 * k, ts: B6, fill: on, maxLines: 6, lh: 1.42, anchor: 'middle' }); y += t4.h;
        const el = (
          <>
            <path d={rr(cx, boxY, cw, boxH, 30)} fill="none" stroke={on} strokeWidth={4} strokeDasharray="18 14" opacity={0.85} />
            <circle cx={cx} cy={divY} r={34} fill={bg} />
            <circle cx={cx + cw} cy={divY} r={34} fill={bg} />
            <line x1={cx + 60} y1={divY} x2={cx + cw - 60} y2={divY} stroke={on} strokeWidth={2} strokeDasharray="6 10" opacity={0.5} />
            {t1.el}{pr.el}{t2.el}{t3.el}{t4.el}
          </>
        );
        return { el, h: y - top };
      };
      let k = 1.4, r = build(k);
      while (r.h > bottom - 80 - top && k > 0.5) { k *= 0.95; r = build(k); }
      const shift = Math.max(0, (bottom - 80 - top - r.h) * 0.45);
      return (
        <>
          {bgRect(x, w, bg)}
          {[0, 1, 2, 3, 4, 5].map((i) => <circle key={i} cx={x + w * (0.1 + (i % 3) * 0.4)} cy={top + 80 + Math.floor(i / 3) * (H - 360)} r={60 + (i % 2) * 40} fill={on} opacity={0.05} />)}
          {block({ text: data.brand, x: ix, y: top, maxW: cw, size: 30, ts: { ...D, ls: 2 }, fill: on, maxLines: 1, anchor: 'middle', opacity: 0.85 }).el}
          <g transform={`translate(0 ${shift})`}>{r.el}</g>
          {block({ text: data.website, x: ix, y: bottom - 50, maxW: cw, size: 26, ts: B6, fill: p.accent2, maxLines: 1, anchor: 'middle' }).el}
        </>
      );
    }

    if (role === 'gallery') {
      const textR = (k: number, y0: number) => {
        let y = y0;
        const hd = heading(cx, y, cw, num, data.galleryTitle, k, p.ink, p.accent); y += hd.h;
        const t = block({ text: data.gallery, x: cx, y, maxW: cw, size: 32 * k, ts: B6, fill: p.sub, maxLines: 13, lh: 1.5, balance: false }); y += t.h;
        return { el: <>{hd.el}{t.el}</>, h: y - y0 };
      };
      const est = textR(1.3, 0).h;
      const phH = Math.max(560, Math.min(1300, bottom - top - est - 60));
      const y0 = top + phH + 60;
      const r = fitV(bottom - y0, (k) => textR(k * 1.3, y0));
      return (
        <>
          {paperBg}
          {slot(cx, top, cw, phH, rr(cx, top, cw, phH, 28), photo2)}
          {r.el}
        </>
      );
    }

    // ô nội dung có tiêu đề — chữ to dần tới khi ô đầy vừa phải; còn trống thì thêm ảnh (ô giới thiệu) hoặc thẻ liên hệ,
    // phần dư chia đều vào khoảng cách giữa các mục → ô nào cũng đầy đặn, không lọt thỏm 1/3 trên.
    const ink = p.ink;
    const content = (k: number, extra: number, y0: number): { el: ReactNode; h: number; n: number } => {
      let y = y0;
      const titleOf: Partial<Record<Role, string>> = { about: data.aboutTitle, services: data.servicesTitle, prices: data.pricesTitle, prices2: data.prices2Title, why: data.whyTitle, steps: data.stepsTitle };
      const hd = heading(cx, y, cw, num, titleOf[role] || '', Math.min(k, 1.12), ink, p.accent);
      y += hd.h;
      const els: ReactNode[] = [hd.el];
      let n = 0;
      if (role === 'about') {
        const t = block({ text: data.about, x: cx, y, maxW: cw, size: 31 * k, ts: B6, fill: p.sub, maxLines: 14, lh: 1.55, balance: false }); els.push(t.el); y += t.h + 50 * k + extra;
        const st = rows(data.stats).slice(0, 4);
        const colW = (cw - 30) / 2;
        for (let i = 0; i < st.length; i += 2) {
          let hRow = 0;
          for (let j = 0; j < 2 && i + j < st.length; j++) {
            const sx = cx + j * (colW + 30);
            const a = block({ text: st[i + j].a, x: sx, y: y + 20 * k, maxW: colW - 10, size: 76 * k, ts: D, fill: p.accent, maxLines: 1 });
            const bb = block({ text: st[i + j].b, x: sx, y: y + 20 * k + a.h, maxW: colW - 10, size: 26 * k, ts: B6, fill: p.sub, maxLines: 2, lh: 1.3 });
            els.push(<g key={`s${i + j}`}><rect x={sx} y={y} width={colW} height={4} fill={p.accent2} />{a.el}{bb.el}</g>);
            hRow = Math.max(hRow, 20 * k + a.h + bb.h);
          }
          y += hRow + 36 * k;
        }
        n = 1;
      } else if (role === 'services' || role === 'why') {
        const it = rows(role === 'services' ? data.services : data.why).slice(0, 7);
        n = it.length;
        it.forEach((r0, i) => {
          const s = 58 * k;
          const tx = cx + s + 26;
          const a = block({ text: r0.a, x: tx, y, maxW: cw - s - 26, size: 36 * k, ts: B8, fill: ink, maxLines: 2, lh: 1.2 });
          const bb = block({ text: r0.b, x: tx, y: y + a.h, maxW: cw - s - 26, size: 28 * k, ts: B6, fill: p.sub, maxLines: 3, lh: 1.38, balance: false });
          const iy = y + 4;
          els.push(
            <g key={`i${i}`}>
              <circle cx={cx + s / 2} cy={iy + s / 2} r={s / 2} fill={role === 'why' ? p.accent2 : p.accent} />
              {role === 'why'
                ? <Ico k="check" x={cx + s * 0.2} y={iy + s * 0.2} s={s * 0.6} color={onColor(p.accent2, p)} w={3} />
                : block({ text: String(i + 1), x: cx + s / 2, y: iy + s * 0.16, maxW: s * 0.8, size: s * 0.56, ts: D, fill: onColor(p.accent, p), anchor: 'middle', maxLines: 1 }).el}
              {a.el}{bb.el}
            </g>,
          );
          y += Math.max(a.h + bb.h, s) + 34 * k + extra;
        });
      } else if (role === 'steps') {
        const it = rows(data.steps).slice(0, 6);
        n = it.length;
        const s = 54 * k;
        const ys: number[] = [];
        const inner: ReactNode[] = [];
        it.forEach((r0, i) => {
          ys.push(y);
          const tx = cx + s + 28;
          const a = block({ text: r0.a, x: tx, y: y + 2, maxW: cw - s - 28, size: 35 * k, ts: B8, fill: ink, maxLines: 2, lh: 1.2 });
          const bb = block({ text: r0.b, x: tx, y: y + 2 + a.h, maxW: cw - s - 28, size: 28 * k, ts: B6, fill: p.sub, maxLines: 3, lh: 1.38, balance: false });
          inner.push(
            <g key={`st${i}`}>
              <circle cx={cx + s / 2} cy={y + s / 2} r={s / 2} fill={soft ? '#FFFFFF' : p.paper} stroke={p.accent} strokeWidth={5} />
              {block({ text: String(i + 1), x: cx + s / 2, y: y + s * 0.17, maxW: s * 0.8, size: s * 0.52, ts: D, fill: p.accent, anchor: 'middle', maxLines: 1 }).el}
              {a.el}{bb.el}
            </g>,
          );
          y += Math.max(a.h + bb.h, s) + 40 * k + extra;
        });
        if (ys.length > 1) els.push(<line key="ln" x1={cx + s / 2} y1={ys[0] + s / 2} x2={cx + s / 2} y2={ys[ys.length - 1] + s / 2} stroke={p.accent2} strokeWidth={5} />);
        els.push(...inner);
      } else { // prices / prices2
        const it = rows(role === 'prices' ? data.prices : data.prices2).slice(0, 10);
        n = it.length;
        it.forEach((r0, i) => {
          const pw = Math.min(cw * 0.42, textW(r0.b, 34 * k, D) + 6);
          const a = block({ text: r0.a, x: cx, y, maxW: cw - pw - 40, size: 33 * k, ts: B6, fill: ink, maxLines: 2, lh: 1.25, balance: false });
          const pr = block({ text: r0.b, x: cx + cw, y, maxW: pw, size: 34 * k, ts: D, fill: p.accent, maxLines: 1, anchor: 'end' });
          const ly = y + 33 * k * 0.92;
          const lastW = textW(r0.a || ' ', 33 * k, B6);
          const lx0 = Math.min(cx + lastW + 14, cx + cw - pw - 26);
          els.push(
            <g key={`p${i}`}>
              {a.el}{pr.el}
              {a.h < 60 * k && <line x1={lx0} y1={ly} x2={cx + cw - pw - 14} y2={ly} stroke={p.sub} strokeWidth={3} strokeDasharray="2 9" strokeLinecap="round" opacity={0.6} />}
            </g>,
          );
          y += Math.max(a.h, pr.h) + 30 * k + extra;
          if (i < it.length - 1) els.push(<line key={`pl${i}`} x1={cx} y1={y - 15 * k - extra / 2} x2={cx + cw} y2={y - 15 * k - extra / 2} stroke={p.sub} strokeOpacity={0.15} strokeWidth={2} />);
        });
      }
      return { el: <>{els}</>, h: y - y0, n };
    };
    const avail = bottom - top;
    let k = 1.28, r = content(k, 0, top);
    while (r.h > avail && k > 0.5) { k *= 0.95; r = content(k, 0, top); }
    let left = avail - r.h;
    let filler: ReactNode = null;
    let y0 = top;
    if (role === 'about' && left > 330) {
      // ô giới thiệu: ảnh (ảnh khách 2 nếu có, không thì tranh vẽ theo ngành) ở trên
      const ih = Math.min(left - 70, 860);
      filler = slot(cx, top, cw, ih, rr(cx, top, cw, ih, 26), photo2);
      y0 = top + ih + 70; left -= ih + 70;
      r = content(k, 0, y0);
    } else if (left > 400 && (side === 'outside' || idx === 3)) {
      // thẻ liên hệ cuối ô (CTA): nền màu nhấn, hotline to
      const chH = Math.min(400, left - 70);
      const cy0 = bottom - chH;
      const on = onColor(p.accent, p);
      filler = (
        <g>
          <path d={rr(cx, cy0, cw, chH, 26)} fill={p.accent} />
          <circle cx={cx + cw - 40} cy={cy0 + 40} r={110} fill={on} opacity={0.06} />
          {block({ text: CTA[L.id] || 'TƯ VẤN MIỄN PHÍ', x: cx + 44, y: cy0 + chH * 0.16, maxW: cw - 88, size: 26, ts: { ...B8, ls: 3 }, fill: Math.abs(lum(p.accent2) - lum(p.accent)) < 0.3 ? on : p.accent2, maxLines: 1 }).el}
          {block({ text: data.phone, x: cx + 44, y: cy0 + chH * 0.16 + 52, maxW: cw - 88, size: Math.min(84, chH * 0.24), ts: D, fill: on, maxLines: 1 }).el}
          {block({ text: data.hours || data.website, x: cx + 44, y: cy0 + chH * 0.16 + 52 + Math.min(84, chH * 0.24) * 1.25, maxW: cw - 88, size: 26, ts: B6, fill: on, maxLines: 2, opacity: 0.85 }).el}
        </g>
      );
      left -= chH + 70;
    }
    if (role !== 'about' && left > 0 && r.n > 1) r = content(k, Math.min(filler ? 48 : 110, (left * (filler ? 1 : 0.8)) / r.n), y0);
    const accentFoot = role === 'why' && side === 'outside';
    return (
      <>
        {paperBg}
        {accentFoot && <rect x={x} y={H - 26} width={w} height={26 + b} fill={p.accent} />}
        {filler}
        {r.el}
      </>
    );
  };

  const body = panels.map((pn, i) => (
    <g key={i} data-panel={`${pn.x},${pn.w}`} data-role={pn.role}>{render(pn.role, pn.x, pn.w, side === 'inside' ? i + 1 : 0)}</g>
  ));
  const folds = (side === 'outside' ? BR_FOLDS.outside : BR_FOLDS.inside).map((mm) => mm * U);
  const vb = `${-b} ${-b} ${W + b * 2} ${H + b * 2}`;
  return (
    <svg viewBox={vb} xmlns="http://www.w3.org/2000/svg" style={style} preserveAspectRatio="xMidYMid meet">
      <defs>{defs}</defs>
      {body}
      {guides && folds.map((fx, i) => <line key={i} x1={fx} y1={0} x2={fx} y2={H} stroke="#7C8796" strokeWidth={3} strokeDasharray="14 12" opacity={0.55} data-guide="1" />)}
    </svg>
  );
}

// ---------- PDF in 2 trang (ngoài + trong): lề xén 2mm, vạch cắt + VẠCH GẤP (nét đứt ngoài vùng xén) ----------
export async function brochurePdf(outside: SVGSVGElement, inside: SVGSVGElement, fontCss: string, dpi = 300): Promise<Blob> {
  const { selfContainedSvg, svgToCanvas } = await import('./svg-export');
  const { printPageDims, drawPrintPage } = await import('./print-export');
  const trim = { wMm: BR_W_MM, hMm: BR_H_MM };
  const { pageW, pageH, bleedBoxW } = printPageDims(trim, BR_BLEED_MM);
  const room = (pageW - bleedBoxW) / 2;
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'mm', format: [pageW, pageH], orientation: 'landscape', compress: true });
  const wMm = trim.wMm + BR_BLEED_MM * 2, hMm = trim.hMm + BR_BLEED_MM * 2;
  const outW = Math.round((wMm / 25.4) * dpi), outH = Math.round((hMm / 25.4) * dpi);
  const pages: [SVGSVGElement, readonly number[]][] = [[outside, BR_FOLDS.outside], [inside, BR_FOLDS.inside]];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) pdf.addPage([pageW, pageH], 'landscape');
    const c = await svgToCanvas(await selfContainedSvg(pages[i][0], fontCss, { outline: true }), outW, outH, '#ffffff');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    drawPrintPage(pdf as any, c.toDataURL('image/png'), outW, outH, trim, BR_BLEED_MM);
    // vạch gấp: nét đứt ở khoảng trắng trên + dưới, thẳng hàng nếp gấp
    pdf.setLineWidth(0.15);
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineDashPattern([1, 0.8], 0);
    for (const fmm of pages[i][1]) {
      const fx = room + BR_BLEED_MM + fmm;
      pdf.line(fx, 0.6, fx, room - 0.6);
      pdf.line(fx, pageH - room + 0.6, fx, pageH - 0.6);
    }
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(5);
    pdf.setTextColor(90, 90, 90);
    pdf.text(i === 0 ? 'MAT NGOAI - gap cuon (roll fold) - net dut = vach gap' : 'MAT TRONG - in ngua mat ngoai (lat canh dai)', room + BR_BLEED_MM, pageH - 1.2);
  }
  return pdf.output('blob');
}

export const BR_ALL_FONTS = FL_FONTS;
export const BR_ALL_PALETTES = FL_PALETTES;
