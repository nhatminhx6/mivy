'use client';
// Catalogue nhiều trang (đóng ghim giữa / saddle stitch): 8–24 trang (bội số 4). Mỗi trang = 1 LOẠI TRANG (bìa, giới thiệu,
// lưới sản phẩm 2/4/6, nổi bật, bảng giá, dự án, đội ngũ, liên hệ, ghi chú, bìa sau) × PHONG CÁCH × BẢNG MÀU × FONT.
// Render code 100% (0 AI). Chữ ĐO THẬT bằng canvas → co/xuống dòng cho vừa ô, không tràn trang. Không có ảnh khách thì
// ô ảnh là hình minh hoạ vẽ code theo ngành. PDF in: trang đơn (đọc) hoặc BÌNH TRANG đóng ghim (tờ in 2 trang/mặt).

import { useId, type CSSProperties, type ReactNode } from 'react';
import { qrPath } from './flyer-qr';
import { textW, FL_FONTS, FL_PALETTES, FL_FONT_CSS, useFLFonts, type FLPalette } from './flyer-engine';

export { FL_FONT_CSS as BK_FONT_CSS, useFLFonts as useBKFonts, FL_FONTS as BK_FONTS, FL_PALETTES as BK_PALETTES };

// ---------- khổ ----------
export interface BKSize { id: string; name: string; wMm: number; hMm: number }
export const BK_SIZES: BKSize[] = [
  { id: 'a4', name: 'A4 dọc · 210×297mm', wMm: 210, hMm: 297 },
  { id: 'a5', name: 'A5 dọc · 148×210mm', wMm: 148, hMm: 210 },
  { id: 'a4l', name: 'A4 ngang · 297×210mm', wMm: 297, hMm: 210 },
];
export const bkSize = (id: string) => BK_SIZES.find((s) => s.id === id) || BK_SIZES[0];
export const BK_BLEED_MM = 3;
export const BK_COUNTS = [8, 12, 16, 20, 24] as const;
const U = 4; // đơn vị thiết kế / mm
const BODY = 'Be Vietnam Pro';

// ---------- ngành + phong cách + mẫu ----------
export type Industry = 'noithat' | 'mypham' | 'thucpham' | 'cokhi' | 'dulich';
export const BK_INDUSTRIES: { id: Industry; name: string }[] = [
  { id: 'noithat', name: 'Nội thất' }, { id: 'mypham', name: 'Mỹ phẩm' }, { id: 'thucpham', name: 'Thực phẩm' },
  { id: 'cokhi', name: 'Cơ khí · vật tư' }, { id: 'dulich', name: 'Du lịch' },
];
export type Style = 'modern' | 'minimal' | 'bold' | 'elegant' | 'fresh';
export const BK_STYLES: { id: Style; name: string }[] = [
  { id: 'modern', name: 'Hiện đại' }, { id: 'minimal', name: 'Tối giản' }, { id: 'bold', name: 'Mạnh mẽ' },
  { id: 'elegant', name: 'Sang trọng' }, { id: 'fresh', name: 'Tươi trẻ' },
];
export interface BKSpec { style: Style; palette: string; font: string; size: string; industry: Industry }
export interface BKTemplate { id: string; name: string; spec: Omit<BKSpec, 'size'> }
export const BK_TEMPLATES: BKTemplate[] = [
  { id: 'nt-elegant', name: 'Nội thất · Sang trọng', spec: { industry: 'noithat', style: 'elegant', palette: 'dark', font: 'playfair' } },
  { id: 'nt-minimal', name: 'Nội thất · Tối giản', spec: { industry: 'noithat', style: 'minimal', palette: 'forest', font: 'montserrat' } },
  { id: 'mp-fresh', name: 'Mỹ phẩm · Tươi trẻ', spec: { industry: 'mypham', style: 'fresh', palette: 'rose', font: 'playfair' } },
  { id: 'mp-elegant', name: 'Mỹ phẩm · Sang trọng', spec: { industry: 'mypham', style: 'elegant', palette: 'purple', font: 'playfair' } },
  { id: 'tp-modern', name: 'Thực phẩm · Hiện đại', spec: { industry: 'thucpham', style: 'modern', palette: 'clay', font: 'baloo' } },
  { id: 'tp-fresh', name: 'Thực phẩm · Tươi trẻ', spec: { industry: 'thucpham', style: 'fresh', palette: 'teal', font: 'baloo' } },
  { id: 'ck-bold', name: 'Cơ khí · Mạnh mẽ', spec: { industry: 'cokhi', style: 'bold', palette: 'orange', font: 'oswald' } },
  { id: 'ck-modern', name: 'Cơ khí · Hiện đại', spec: { industry: 'cokhi', style: 'modern', palette: 'navy', font: 'montserrat' } },
  { id: 'dl-bold', name: 'Du lịch · Mạnh mẽ', spec: { industry: 'dulich', style: 'bold', palette: 'indigo', font: 'montserrat' } },
  { id: 'dl-modern', name: 'Du lịch · Hiện đại', spec: { industry: 'dulich', style: 'modern', palette: 'teal', font: 'bvp' } },
];

// ---------- loại trang ----------
export type PageType = 'cover' | 'about' | 'grid2' | 'grid4' | 'grid6' | 'featured' | 'prices' | 'projects' | 'team' | 'contact' | 'notes' | 'back';
export const BK_PAGE_TYPES: { id: PageType; name: string }[] = [
  { id: 'about', name: 'Giới thiệu công ty' }, { id: 'grid2', name: 'Sản phẩm · 2 ô' }, { id: 'grid4', name: 'Sản phẩm · 4 ô' },
  { id: 'grid6', name: 'Sản phẩm · 6 ô' }, { id: 'featured', name: 'Sản phẩm nổi bật' }, { id: 'prices', name: 'Bảng giá' },
  { id: 'projects', name: 'Dự án · khách hàng' }, { id: 'team', name: 'Đội ngũ' }, { id: 'contact', name: 'Liên hệ + bản đồ + QR' },
  { id: 'notes', name: 'Trang ghi chú' },
];
export const pageTypeName = (t: PageType) => (t === 'cover' ? 'Bìa trước' : t === 'back' ? 'Bìa sau' : BK_PAGE_TYPES.find((x) => x.id === t)?.name || t);
const FILL: PageType[] = ['about', 'featured', 'grid4', 'grid4', 'grid6', 'prices', 'projects', 'grid2', 'team', 'grid4', 'featured', 'grid6', 'prices', 'grid4', 'grid2', 'notes', 'grid4', 'grid6', 'featured', 'grid4', 'notes', 'grid4'];
/** trang mặc định cho N trang: bìa · (N-3 trang ruột) · liên hệ · bìa sau */
export function defaultPages(n: number): PageType[] { return ['cover', ...FILL.slice(0, n - 3), 'contact', 'back']; }
/** đổi số trang mà GIỮ các trang khách đã chọn: thêm/bớt ở cuối phần ruột (trước trang liên hệ) */
export function resizePages(pages: PageType[], n: number): PageType[] {
  const inner = pages.slice(1, -1);
  const tail = inner[inner.length - 1] === 'contact' ? inner.pop()! : null;
  const want = n - 2 - (tail ? 1 : 0);
  while (inner.length > want) inner.pop();
  let k = 0;
  while (inner.length < want) inner.push(FILL[(inner.length + k++) % FILL.length]);
  return ['cover', ...inner, ...(tail ? [tail] : []), 'back'];
}

// ---------- bình trang đóng ghim: tờ s (0-based) mặt trước = [N-2s | 1+2s], mặt sau = [2+2s | N-1-2s] ----------
export function imposition(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let s = 0; s < n / 4; s++) { out.push([n - 2 * s, 1 + 2 * s]); out.push([2 + 2 * s, n - 1 - 2 * s]); }
  return out;
}
/** cặp trang mở ra khi đọc: [_,1] [2,3] … [N,_]  (0 = trống) */
export function readerSpreads(n: number): [number, number][] {
  const out: [number, number][] = [[0, 1]];
  for (let p = 2; p < n; p += 2) out.push([p, p + 1]);
  out.push([n, 0]);
  return out;
}

// ---------- dữ liệu ----------
export type BKData = Record<string, string>;
export type BKPhotos = Record<string, string>;
export interface BKField { key: string; label: string; ph?: string; multiline?: boolean; half?: boolean }
export const BK_FIELD_GROUPS: { title: string; types: PageType[]; fields: BKField[] }[] = [
  { title: 'Bìa trước', types: ['cover'], fields: [
    { key: 'brand', label: 'Tên thương hiệu', half: true }, { key: 'tagline', label: 'Dòng nhỏ (slogan)', half: true },
    { key: 'coverTitle', label: 'Tiêu đề bìa' }, { key: 'coverSub', label: 'Dòng phụ bìa' }, { key: 'year', label: 'Năm / phiên bản', half: true },
  ] },
  { title: 'Giới thiệu công ty', types: ['about'], fields: [
    { key: 'aboutTitle', label: 'Tiêu đề' }, { key: 'about', label: 'Đoạn giới thiệu', multiline: true },
    { key: 'stats', label: 'Con số nổi bật (mỗi dòng: Số | Ý nghĩa)', multiline: true },
  ] },
  { title: 'Sản phẩm (dùng cho các trang lưới)', types: ['grid2', 'grid4', 'grid6'], fields: [
    { key: 'productsTitle', label: 'Tiêu đề trang sản phẩm' },
    { key: 'products', label: 'Danh sách (mỗi dòng: Tên | Mã | Giá | Mô tả)', multiline: true },
  ] },
  { title: 'Sản phẩm nổi bật', types: ['featured'], fields: [
    { key: 'featKicker', label: 'Dòng nhỏ trên', half: true }, { key: 'featPrice', label: 'Giá', half: true },
    { key: 'featTitle', label: 'Tên sản phẩm' }, { key: 'featDesc', label: 'Mô tả', multiline: true },
    { key: 'featPoints', label: 'Điểm nổi bật (mỗi dòng 1 ý)', multiline: true },
  ] },
  { title: 'Bảng giá', types: ['prices'], fields: [
    { key: 'pricesTitle', label: 'Tiêu đề' }, { key: 'prices', label: 'Bảng giá (mỗi dòng: Tên | Giá)', multiline: true },
    { key: 'priceNote', label: 'Ghi chú dưới bảng' },
  ] },
  { title: 'Dự án · khách hàng', types: ['projects'], fields: [
    { key: 'projectsTitle', label: 'Tiêu đề' }, { key: 'projects', label: 'Danh sách (mỗi dòng: Tên | Khách hàng / nơi | Năm)', multiline: true },
  ] },
  { title: 'Đội ngũ', types: ['team'], fields: [
    { key: 'teamTitle', label: 'Tiêu đề' }, { key: 'team', label: 'Thành viên (mỗi dòng: Họ tên | Chức vụ)', multiline: true },
  ] },
  { title: 'Liên hệ & bìa sau', types: ['contact', 'back'], fields: [
    { key: 'phone', label: 'Điện thoại', half: true }, { key: 'email', label: 'Email', half: true },
    { key: 'website', label: 'Website (tạo mã QR)', half: true }, { key: 'hours', label: 'Giờ làm việc', half: true },
    { key: 'address', label: 'Địa chỉ' }, { key: 'backSlogan', label: 'Câu chốt ở bìa sau' },
  ] },
];

const common = (o: Partial<BKData>): BKData => ({
  productsTitle: 'Sản phẩm', pricesTitle: 'Bảng giá tham khảo', projectsTitle: 'Dự án tiêu biểu', teamTitle: 'Đội ngũ của chúng tôi',
  featKicker: 'SẢN PHẨM NỔI BẬT', priceNote: 'Giá đã gồm VAT. Liên hệ để nhận báo giá theo số lượng.', year: '2027',
  ...o,
}) as BKData;
export const BK_SAMPLES: Record<Industry, BKData> = {
  noithat: common({
    brand: 'AN KHANG HOME', tagline: 'NỘI THẤT GỖ TỰ NHIÊN', coverTitle: 'Bộ sưu tập nội thất 2027', coverSub: 'Gỗ sồi · gỗ óc chó · bọc vải cao cấp — bảo hành 5 năm',
    aboutTitle: 'Về An Khang Home', about: 'Hơn 12 năm thiết kế và sản xuất nội thất gỗ tự nhiên cho căn hộ, nhà phố và văn phòng. Xưởng 3.000m² tại Bình Dương, kiểm soát từ khâu chọn gỗ, sấy, ghép đến hoàn thiện sơn gốc nước an toàn cho gia đình.',
    stats: '12+ | năm kinh nghiệm\n4.800 | công trình bàn giao\n5 năm | bảo hành khung gỗ\n63 | tỉnh thành đã giao',
    products: 'Sofa Oslo 3 chỗ | NT-101 | 18.900.000đ | Khung gỗ sồi, đệm mút D40, vải bố chống bám bẩn\nGhế thư giãn Bora | NT-102 | 6.450.000đ | Lưng ngả 3 nấc, chân gỗ óc chó\nĐèn sàn Lumi | NT-103 | 2.150.000đ | Chao vải lanh, ánh sáng vàng ấm 3000K\nBàn trà Mây | NT-104 | 4.300.000đ | Mặt gỗ tròn Ø80, chân đan mây tự nhiên\nKệ sách Linh | NT-105 | 5.800.000đ | 5 tầng, gỗ cao su ghép, chịu lực 30kg/tầng\nGhế ăn Nori | NT-106 | 1.650.000đ | Lưng cong ôm, bọc nệm da PU\nTủ đầu giường Hana | NT-107 | 2.900.000đ | 2 ngăn kéo ray giảm chấn\nBàn ăn Gỗ Sồi 6 ghế | NT-108 | 14.500.000đ | Mặt 1m6, sơn PU mờ chống nước\nGiường ngủ Zen | NT-109 | 12.800.000đ | Đầu giường bọc nỉ, khung gỗ sồi 1m6\nTủ quần áo Mộc | NT-110 | 16.200.000đ | 4 cánh, gương toàn thân',
    featTitle: 'Sofa góc Oslo L 2m8', featPrice: '32.500.000đ', featDesc: 'Thiết kế module tháo rời, đổi chiều góc trái/phải dễ dàng. Vải bố dệt kim chống bám lông thú cưng, vỏ đệm tháo giặt được.',
    featPoints: 'Khung gỗ sồi tự nhiên sấy 8%\nĐệm mút D40 + lớp lông vũ nhân tạo\nĐổi màu vải miễn phí (12 màu)\nGiao lắp đặt tận nơi nội thành',
    prices: 'Sofa văng 1m8 | 12.900.000đ\nSofa góc L 2m8 | 32.500.000đ\nGhế thư giãn | 6.450.000đ\nBàn trà tròn Ø80 | 4.300.000đ\nBàn ăn 4 ghế | 9.800.000đ\nBàn ăn 6 ghế | 14.500.000đ\nGiường 1m6 | 12.800.000đ\nTủ quần áo 4 cánh | 16.200.000đ\nKệ tivi 1m8 | 5.200.000đ\nĐèn sàn | 2.150.000đ',
    projects: 'Căn hộ Vinhomes Grand Park | Chị Thu Hà, TP. Thủ Đức | 2026\nNhà phố Gò Vấp | Anh Quốc Bảo | 2026\nVăn phòng Gia Khánh Group | Quận 1 | 2025\nHomestay Đà Lạt Pine | Lâm Đồng | 2025\nBiệt thự Thảo Điền | Quận 2 | 2024\nCafe Mộc Garden | Bình Thạnh | 2024',
    team: 'Quốc Bảo | Giám đốc thiết kế\nThu Hà | Trưởng phòng kinh doanh\nGia Khánh | Kỹ sư sản xuất\nBảo Ngọc | Kiến trúc sư nội thất\nHoàng Long | Giám sát thi công\nMai Anh | Chăm sóc khách hàng',
    phone: '0909 123 456', email: 'hello@ankhanghome.vn', website: 'ankhanghome.vn', hours: '8:00 – 20:00 (cả CN)',
    address: '25 Nguyễn Văn Linh, Quận 7, TP.HCM', backSlogan: 'Nội thất bền đẹp cho tổ ấm của bạn',
  }),
  mypham: common({
    brand: 'THU HÀ BEAUTY', tagline: 'MỸ PHẨM THIÊN NHIÊN', coverTitle: 'Chăm da dịu nhẹ từ thiên nhiên', coverSub: 'Thành phần rõ ràng · không cồn · không paraben',
    aboutTitle: 'Câu chuyện của Thu Hà Beauty', about: 'Thu Hà Beauty bắt đầu từ một căn bếp nhỏ ở Đà Lạt với mong muốn làm ra những sản phẩm chăm da lành tính cho làn da nhạy cảm. Mỗi sản phẩm đều được kiểm nghiệm, công bố đầy đủ và đóng gói bằng vật liệu có thể tái chế.',
    stats: '30+ | sản phẩm\n150K | khách hàng tin dùng\n100% | công bố đầy đủ\n4,9★ | đánh giá trung bình',
    products: 'Serum Vitamin C 15% | MP-201 | 385.000đ | Sáng da, mờ thâm sau 4 tuần\nKem dưỡng ẩm Ceramide | MP-202 | 320.000đ | Phục hồi hàng rào bảo vệ da\nSữa rửa mặt Trà xanh | MP-203 | 189.000đ | Làm sạch dịu nhẹ, pH 5.5\nSon dưỡng có màu | MP-204 | 145.000đ | Dầu jojoba, giữ ẩm 8 giờ\nToner Hoa hồng | MP-205 | 210.000đ | Cân bằng da, không cồn\nKem chống nắng SPF50 | MP-206 | 299.000đ | Nâng tông nhẹ, không bết dính\nMặt nạ ngủ Yến mạch | MP-207 | 260.000đ | Dịu da sau 1 đêm\nDầu tẩy trang Bơ | MP-208 | 240.000đ | Tan lớp trang điểm chống nước',
    featTitle: 'Serum Vitamin C 15% Bright', featPrice: '385.000đ', featDesc: 'Vitamin C dạng ổn định kết hợp Niacinamide và chiết xuất cam thảo giúp da sáng đều màu, mờ thâm mụn mà không gây kích ứng.',
    featPoints: 'Phù hợp da nhạy cảm\nKết cấu mỏng nhẹ, thấm nhanh\nChai thuỷ tinh tối màu chống oxy hoá\nKiểm nghiệm da liễu',
    prices: 'Serum Vitamin C 30ml | 385.000đ\nKem dưỡng Ceramide 50ml | 320.000đ\nSữa rửa mặt 150ml | 189.000đ\nToner Hoa hồng 200ml | 210.000đ\nKem chống nắng 50ml | 299.000đ\nMặt nạ ngủ 80g | 260.000đ\nCombo sáng da 3 món | 790.000đ\nCombo phục hồi 3 món | 720.000đ',
    projects: 'Hệ thống 12 đại lý | TP.HCM · Hà Nội | 2026\nPop-up Crescent Mall | Quận 7 | 2026\nHợp tác spa Lotus | Đà Nẵng | 2025\nQuà tặng doanh nghiệp | Gia Khánh Group | 2025',
    team: 'Thu Hà | Nhà sáng lập\nBảo Ngọc | Dược sĩ công thức\nQuốc Bảo | Quản lý sản xuất\nMai Anh | Tư vấn da',
    phone: '0912 345 678', email: 'cskh@thuhabeauty.vn', website: 'thuhabeauty.vn', hours: '9:00 – 21:00',
    address: '88 Lê Lợi, Phường 1, Đà Lạt, Lâm Đồng', backSlogan: 'Đẹp tự nhiên, an tâm mỗi ngày',
  }),
  thucpham: common({
    brand: 'NÔNG SẢN GIA KHÁNH', tagline: 'SẠCH TỪ NÔNG TRẠI', coverTitle: 'Đặc sản sạch cho bữa cơm nhà', coverSub: 'Mật ong rừng · cà phê rang mộc · trái cây sấy dẻo',
    aboutTitle: 'Từ nông trại đến bàn ăn', about: 'Gia Khánh hợp tác trực tiếp với hơn 200 hộ nông dân ở Tây Nguyên và đồng bằng sông Cửu Long, thu mua đúng vụ, chế biến tại xưởng đạt chứng nhận an toàn thực phẩm và giao tận tay khách trong 48 giờ.',
    stats: '200+ | hộ nông dân liên kết\n48h | giao hàng toàn quốc\nHACCP | xưởng chế biến\n35 | sản phẩm đặc sản',
    products: 'Mật ong rừng U Minh | TP-301 | 280.000đ | Hũ thuỷ tinh 500g, không pha đường\nCà phê Robusta rang mộc | TP-302 | 165.000đ | Gói 500g, rang củi vừa\nXoài sấy dẻo | TP-303 | 95.000đ | Không đường, túi zip 250g\nHạt điều rang muối | TP-304 | 210.000đ | Loại W320, hũ 500g\nTrà Ô long Bảo Lộc | TP-305 | 180.000đ | Hộp 200g, hương hoa\nNước mắm Phú Quốc 40 độ | TP-306 | 120.000đ | Chai thuỷ tinh 500ml\nBánh tráng phơi sương | TP-307 | 55.000đ | Đặc sản Trảng Bàng\nTiêu đen Chư Sê | TP-308 | 75.000đ | Hũ 200g, cay thơm',
    featTitle: 'Mật ong rừng U Minh 500g', featPrice: '280.000đ', featDesc: 'Mật ong khai thác từ rừng tràm U Minh mùa hoa nở rộ, lọc lạnh giữ nguyên enzyme và hương tràm đặc trưng.',
    featPoints: 'Không pha đường, không gia nhiệt\nCó giấy kiểm nghiệm từng lô\nHũ thuỷ tinh nắp thiếc kín\nĐổi trả trong 7 ngày',
    prices: 'Mật ong rừng 500g | 280.000đ\nCà phê rang mộc 500g | 165.000đ\nXoài sấy dẻo 250g | 95.000đ\nHạt điều W320 500g | 210.000đ\nTrà Ô long 200g | 180.000đ\nNước mắm 40 độ 500ml | 120.000đ\nGiỏ quà Tết A | 890.000đ\nGiỏ quà Tết B | 1.290.000đ',
    projects: 'Quà Tết doanh nghiệp | An Khang Group · 1.200 phần | 2026\nChuỗi bếp sạch | 18 cửa hàng | 2026\nHội chợ OCOP | Cần Thơ | 2025\nTiếp thị đặc sản | Sân bay Tân Sơn Nhất | 2025',
    team: 'Gia Khánh | Giám đốc\nThu Hà | Quản lý chất lượng\nQuốc Bảo | Thu mua vùng nguyên liệu\nHoàng Long | Vận hành kho',
    phone: '0938 222 333', email: 'dathang@giakhanhfood.vn', website: 'giakhanhfood.vn', hours: '7:30 – 19:00',
    address: '12 Đường 30/4, Ninh Kiều, Cần Thơ', backSlogan: 'Ăn ngon, sống khoẻ, thương nhà nông',
  }),
  cokhi: common({
    brand: 'CƠ KHÍ AN PHÁT', tagline: 'VẬT TƯ CÔNG NGHIỆP', coverTitle: 'Catalogue vật tư cơ khí 2027', coverSub: 'Bánh răng · vòng bi · bulong · phụ kiện đường ống — giao nhanh toàn quốc',
    aboutTitle: 'Năng lực An Phát', about: 'An Phát cung cấp vật tư và gia công cơ khí chính xác cho nhà máy, xưởng sản xuất và công trình. Hệ thống máy CNC 5 trục, kho 2.000 mã hàng có sẵn, đội kỹ thuật hỗ trợ chọn vật tư đúng tải trọng và tiêu chuẩn.',
    stats: '2.000+ | mã hàng sẵn kho\n18 | máy CNC chính xác\nISO 9001 | quy trình chất lượng\n24h | phản hồi báo giá',
    products: 'Bánh răng trụ thép C45 | CK-401 | Liên hệ | Module 1–6, tôi cao tần\nĐai ốc lục giác M12 | CK-402 | 2.500đ | Inox 304, chuẩn DIN 934\nCờ lê vòng miệng 17mm | CK-403 | 85.000đ | Thép CR-V mạ chrome\nVòng bi 6205-2RS | CK-404 | 65.000đ | Phớt cao su 2 mặt\nCo hàn 90° DN50 | CK-405 | 48.000đ | Thép đúc SCH40\nBulong neo M20 | CK-406 | 32.000đ | Mạ kẽm nhúng nóng\nKhớp nối mềm | CK-407 | 420.000đ | Giảm rung động cơ\nXích công nghiệp 08B | CK-408 | 260.000đ | Cuộn 5m',
    featTitle: 'Gia công CNC theo bản vẽ', featPrice: 'Báo giá trong 24h', featDesc: 'Nhận gia công chi tiết máy, khuôn, đồ gá từ thép, inox, nhôm, đồng theo bản vẽ 2D/3D với dung sai đến ±0,01mm.',
    featPoints: 'CNC 5 trục, tiện CNC, cắt dây\nKiểm tra CMM từng lô\nNhận đơn từ 1 chi tiết\nGiao hàng toàn quốc',
    prices: 'Vòng bi 6205-2RS | 65.000đ\nVòng bi 6305-2RS | 92.000đ\nĐai ốc M12 inox (100 con) | 250.000đ\nBulong neo M20 | 32.000đ\nCo hàn 90° DN50 | 48.000đ\nKhớp nối mềm | 420.000đ\nXích 08B (5m) | 260.000đ\nGia công CNC | Theo bản vẽ',
    projects: 'Nhà máy bao bì An Khang | Bình Dương | 2026\nDây chuyền chế biến gỗ | Đồng Nai | 2026\nTrạm bơm Gia Khánh | Long An | 2025\nXưởng ô tô Quốc Bảo | Hải Phòng | 2025\nKhu công nghiệp VSIP | Bình Dương | 2024\nCảng Cái Mép | Bà Rịa – Vũng Tàu | 2024',
    team: 'Quốc Bảo | Giám đốc kỹ thuật\nGia Khánh | Kỹ sư CNC\nHoàng Long | Trưởng kho\nThu Hà | Kinh doanh dự án\nBảo Ngọc | Kế toán\nMạnh Hùng | QC',
    phone: '0283 456 789', email: 'baogia@anphatmech.vn', website: 'anphatmech.vn', hours: '7:30 – 17:30 (T2–T7)',
    address: 'Lô B5, KCN Sóng Thần, Dĩ An, Bình Dương', backSlogan: 'Chính xác — bền bỉ — đúng hẹn',
  }),
  dulich: common({
    brand: 'GIA KHÁNH TRAVEL', tagline: 'TOUR TRỌN GÓI', coverTitle: 'Khám phá Việt Nam mùa xuân 2027', coverSub: 'Hạ Long · Sa Pa · Đà Lạt · Phú Quốc — khởi hành hằng tuần',
    aboutTitle: 'Vì sao chọn Gia Khánh Travel', about: 'Hơn 10 năm tổ chức tour trong nước và quốc tế, Gia Khánh Travel thiết kế hành trình vừa đủ trải nghiệm vừa thong thả, khách sạn chọn lọc, hướng dẫn viên tận tâm và cam kết không phát sinh chi phí ngoài chương trình.',
    stats: '10+ | năm lữ hành\n85.000 | khách đã phục vụ\n120 | tour mỗi năm\n4,8★ | hài lòng sau tour',
    products: 'Hạ Long – Ninh Bình 3N2Đ | TR-501 | 4.290.000đ | Du thuyền 5 sao, Tràng An, Hang Múa\nSa Pa – Fansipan 3N2Đ | TR-502 | 3.890.000đ | Cáp treo, bản Cát Cát\nĐà Lạt mộng mơ 3N2Đ | TR-503 | 2.990.000đ | Đồi chè, thác Datanla\nPhú Quốc 4N3Đ | TR-504 | 5.490.000đ | Lặn ngắm san hô, cáp treo Hòn Thơm\nHuế – Hội An 4N3Đ | TR-505 | 4.990.000đ | Di sản miền Trung\nMiền Tây sông nước 2N1Đ | TR-506 | 1.690.000đ | Chợ nổi Cái Răng\nNha Trang biển xanh 3N2Đ | TR-507 | 3.290.000đ | 4 đảo, tắm bùn\nCôn Đảo tâm linh 2N1Đ | TR-508 | 4.590.000đ | Vé máy bay khứ hồi',
    featTitle: 'Hạ Long – Ninh Bình 3N2Đ', featPrice: 'từ 4.290.000đ', featDesc: 'Nghỉ đêm trên du thuyền 5 sao giữa vịnh, chèo kayak hang Luồn, ngồi thuyền Tràng An và leo Hang Múa ngắm toàn cảnh Tam Cốc.',
    featPoints: 'Xe đưa đón đời mới\nBữa ăn hải sản trên du thuyền\nHướng dẫn viên suốt tuyến\nBảo hiểm du lịch 100 triệu',
    prices: 'Hạ Long – Ninh Bình 3N2Đ | 4.290.000đ\nSa Pa – Fansipan 3N2Đ | 3.890.000đ\nĐà Lạt 3N2Đ | 2.990.000đ\nPhú Quốc 4N3Đ | 5.490.000đ\nHuế – Hội An 4N3Đ | 4.990.000đ\nMiền Tây 2N1Đ | 1.690.000đ\nNha Trang 3N2Đ | 3.290.000đ\nTrẻ em dưới 5 tuổi | Miễn phí',
    projects: 'Du lịch nghỉ dưỡng | An Khang Group · 320 khách | 2026\nTeam building | Ngân hàng Quốc Bảo · 180 khách | 2026\nHội nghị khách hàng | Phú Quốc | 2025\nTour tri ân | Gia Khánh Food · 90 khách | 2025',
    team: 'Gia Khánh | Giám đốc điều hành\nThu Hà | Điều hành tour\nQuốc Bảo | Hướng dẫn viên trưởng\nBảo Ngọc | Chăm sóc khách hàng\nHoàng Long | Đặt dịch vụ\nMai Anh | Visa & vé máy bay',
    phone: '1900 6868', email: 'tour@giakhanhtravel.vn', website: 'giakhanhtravel.vn', hours: '8:00 – 21:00 (cả lễ Tết)',
    address: '160 Pasteur, Quận 3, TP.HCM', backSlogan: 'Mỗi chuyến đi là một kỷ niệm đẹp',
  }),
};
export const defaultBKData = (ind: Industry): BKData => ({ ...BK_SAMPLES[ind] });

// ---------- tiện ích ----------
export const splitLines = (s: string) => (s || '').split('\n').map((x) => x.trim()).filter(Boolean);
const cols = (ln: string) => ln.split('|').map((x) => x.trim());
export interface Product { name: string; code: string; price: string; desc: string; idx: number }
export const parseProducts = (s: string): Product[] => splitLines(s).map((ln, idx) => { const [name = '', code = '', price = '', desc = ''] = cols(ln); return { name, code, price, desc, idx }; });
const GRID_N: Partial<Record<PageType, number>> = { grid2: 2, grid4: 4, grid6: 6 };
/** sản phẩm của 1 trang lưới: các trang lưới lấy nối tiếp nhau trong danh sách (hết thì quay vòng) */
export function productsForPage(pages: PageType[], index: number, products: Product[]): Product[] {
  if (!products.length) return [];
  let off = 0;
  for (let i = 0; i < index; i++) off += GRID_N[pages[i]] || 0;
  const n = GRID_N[pages[index]] || 0;
  return Array.from({ length: Math.min(n, Math.max(n, 0)) }, (_, k) => products[(off + k) % products.length]);
}

function hex(h: string) { const s = h.replace('#', ''); return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16)); }
export function mix(a: string, b: string, t: number) {
  const A = hex(a), B = hex(b);
  return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const isDarkHex = (h: string) => { const [r, g, b] = hex(h); return 0.299 * r + 0.587 * g + 0.114 * b < 110; };

// ---------- đo chữ ----------
interface TS { fam: string; wt: number; ls?: number }
const fitSize = (t: string, maxW: number, size: number, ts: TS) => { const w = textW(t, size, ts); return w > maxW ? (size * maxW) / w : size; };
function wrapLines(text: string, maxW: number, size: number, ts: TS): string[] {
  const out: string[] = [];
  for (const para of (text || '').split('\n')) {
    const words = para.trim().split(/\s+/).filter(Boolean);
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (!cur || textW(next, size, ts) <= maxW) cur = next; else { out.push(cur); cur = w; }
    }
    if (cur) out.push(cur);
  }
  return out;
}
function fitBlock(text: string, maxW: number, size: number, ts: TS, maxLines: number, balance = true) {
  let s = size, lines = wrapLines(text, maxW, s, ts);
  while (lines.length > maxLines && s > size * 0.5) { s *= 0.94; lines = wrapLines(text, maxW, s, ts); }
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && textW(last + '…', s, ts) > maxW) last = last.slice(0, -1).trimEnd();
    lines[maxLines - 1] = last + '…';
  } else if (balance && lines.length > 1 && !text.includes('\n')) {
    let lo = maxW * 0.45, hi = maxW;
    for (let i = 0; i < 12; i++) { const mid = (lo + hi) / 2; if (wrapLines(text, mid, s, ts).length <= lines.length) hi = mid; else lo = mid; }
    lines = wrapLines(text, hi, s, ts);
  }
  return { lines, size: s };
}
type Anchor = 'start' | 'middle' | 'end';
interface BlockOpts { text: string; x: number; y: number; maxW: number; size: number; maxLines?: number; lh?: number; anchor?: Anchor; ts: TS; fill: string; upper?: boolean; opacity?: number; balance?: boolean }
/** khối chữ đặt theo MÉP TRÊN y; trả chiều cao đã dùng */
function block(o: BlockOpts): { el: ReactNode; h: number } {
  const text = o.upper ? (o.text || '').toUpperCase() : o.text || '';
  if (!text.trim()) return { el: null, h: 0 };
  const { lines, size } = fitBlock(text, o.maxW, o.size, o.ts, o.maxLines ?? 2, o.balance ?? true);
  const lh = (o.lh ?? 1.18) * size;
  const el = (
    <g fontFamily={`"${o.ts.fam}"`} fontWeight={o.ts.wt} fill={o.fill} textAnchor={o.anchor || 'start'} letterSpacing={o.ts.ls ? (o.ts.ls * size) / o.size : undefined} opacity={o.opacity}>
      {lines.map((ln, i) => <text key={i} x={o.x} y={o.y + size * 0.92 + i * lh} fontSize={fitSize(ln, o.maxW, size, { ...o.ts, ls: o.ts.ls ? (o.ts.ls * size) / o.size : 0 })}>{ln}</text>)}
    </g>
  );
  return { el, h: size * 0.92 + (lines.length - 1) * lh + size * 0.3 };
}
/** đoạn văn vừa khung (w×h): co cỡ chữ tới khi đủ chỗ, tối thiểu minSize thì cắt "…" */
function para(o: { text: string; x: number; y: number; w: number; h: number; size: number; minSize: number; ts: TS; fill: string; lh?: number }): { el: ReactNode; h: number } {
  const lhK = o.lh ?? 1.5;
  let s = o.size;
  const rows = (sz: number) => Math.max(1, Math.floor((o.h - sz * 0.3) / (sz * lhK) + 0.08));
  while (s > o.minSize && wrapLines(o.text, o.w, s, o.ts).length > rows(s)) s *= 0.95;
  return block({ text: o.text, x: o.x, y: o.y, maxW: o.w, size: s, maxLines: rows(s), lh: lhK, ts: o.ts, fill: o.fill, balance: false });
}

// ---------- icon nét (24×24) ----------
const ICON: Record<string, string> = {
  phone: 'M6.5 3h3l1.5 4.5-2 1.3a12 12 0 005.7 5.7L16 16.5l4.5 1.5v3a1.5 1.5 0 01-1.6 1.5C10 22 2 14 2 5.1A1.5 1.5 0 013.5 3.5z',
  pin: 'M12 22s7-6.7 7-12A7 7 0 005 10c0 5.3 7 12 7 12zM12 7.5A2.5 2.5 0 1012 12.5 2.5 2.5 0 0012 7.5z',
  globe: 'M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 2.5 15.4 0 18M12 3c-2.5 2.6-2.5 15.4 0 18',
  mail: 'M3 6h18v12H3zM3 7l9 6 9-6',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2',
  check: 'M4 12.5l5 5L20 6.5',
};
function Ico({ k, x, y, s, color, w = 2 }: { k: string; x: number; y: number; s: number; color: string; w?: number }) {
  return <g transform={`translate(${x} ${y}) scale(${s / 24})`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round"><path d={ICON[k]} /></g>;
}
const rr = (x: number, y: number, w: number, h: number, r: number) => {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  return `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
};

// ---------- hình minh hoạ theo ngành (vẽ code, khung 100×100) ----------
function artShape(ind: Industry, v: number, c: { a: string; d: string; h: string; l: string; s: string }): ReactNode {
  const V = ((v % 5) + 5) % 5;
  if (ind === 'noithat') {
    if (V === 0) return (<g><rect x="14" y="40" width="72" height="24" rx="6" fill={c.a} /><rect x="18" y="28" width="64" height="20" rx="6" fill={c.d} /><rect x="9" y="38" width="13" height="30" rx="5" fill={c.d} /><rect x="78" y="38" width="13" height="30" rx="5" fill={c.d} /><rect x="22" y="44" width="27" height="10" rx="4" fill={c.l} opacity=".5" /><rect x="51" y="44" width="27" height="10" rx="4" fill={c.l} opacity=".5" /><path d="M18 68v8M82 68v8" stroke={c.s} strokeWidth="3" strokeLinecap="round" /></g>);
    if (V === 1) return (<g><path d="M30 26q20-10 40 0v34H30z" fill={c.d} /><rect x="24" y="52" width="52" height="16" rx="6" fill={c.a} /><rect x="20" y="44" width="10" height="26" rx="4" fill={c.a} /><rect x="70" y="44" width="10" height="26" rx="4" fill={c.a} /><path d="M28 70l-4 12M72 70l4 12" stroke={c.s} strokeWidth="3" strokeLinecap="round" /></g>);
    if (V === 2) return (<g><path d="M36 14h28l8 22H28z" fill={c.h} /><path d="M50 36v44" stroke={c.s} strokeWidth="3" /><ellipse cx="50" cy="82" rx="14" ry="4" fill={c.d} /><circle cx="50" cy="38" r="3" fill={c.d} /></g>);
    if (V === 3) return (<g><ellipse cx="50" cy="58" rx="36" ry="9" fill={c.a} /><path d="M26 62l-4 20M74 62l4 20M50 66v16" stroke={c.s} strokeWidth="3" strokeLinecap="round" /><path d="M46 50q-2-10 4-16q6 6 4 16z" fill={c.h} /><rect x="45" y="44" width="10" height="10" rx="2" fill={c.d} /><path d="M50 34q-8-14 2-22M50 34q10-10 16-6" stroke={c.d} strokeWidth="2" fill="none" /></g>);
    return (<g><rect x="22" y="12" width="56" height="74" rx="2" fill="none" stroke={c.d} strokeWidth="4" /><path d="M24 36h52M24 60h52" stroke={c.d} strokeWidth="3" />{[0, 1, 2, 3].map((i) => <rect key={i} x={28 + i * 7} y={18 + (i % 2) * 3} width="5" height={16 - (i % 2) * 3} fill={i % 2 ? c.h : c.a} />)}<rect x="52" y="44" width="16" height="14" rx="2" fill={c.a} />{[0, 1, 2].map((i) => <rect key={i} x={30 + i * 6} y="64" width="4" height="20" fill={i === 1 ? c.h : c.a} transform={`rotate(${i === 2 ? 12 : 0} ${32 + i * 6} 84)`} />)}</g>);
  }
  if (ind === 'mypham') {
    if (V === 0) return (<g><rect x="36" y="38" width="28" height="46" rx="6" fill={c.a} /><rect x="40" y="28" width="20" height="12" rx="2" fill={c.d} /><path d="M44 28q6-18 12 0z" fill={c.s} /><rect x="40" y="54" width="20" height="18" rx="2" fill={c.l} opacity=".85" /><path d="M43 60h14M43 65h10" stroke={c.d} strokeWidth="2" /></g>);
    if (V === 1) return (<g><rect x="24" y="48" width="52" height="32" rx="8" fill={c.a} /><rect x="22" y="38" width="56" height="13" rx="4" fill={c.d} /><rect x="34" y="58" width="32" height="12" rx="2" fill={c.l} opacity=".85" /></g>);
    if (V === 2) return (<g><path d="M36 30h28l-4 52H40z" fill={c.a} /><rect x="38" y="18" width="24" height="12" rx="2" fill={c.d} /><rect x="42" y="46" width="16" height="22" rx="2" fill={c.l} opacity=".85" /></g>);
    if (V === 3) return (<g><rect x="34" y="40" width="32" height="44" rx="8" fill={c.a} /><rect x="44" y="26" width="12" height="14" fill={c.d} /><path d="M44 26h-10v-6h22v6" fill={c.d} /><rect x="40" y="56" width="20" height="16" rx="2" fill={c.l} opacity=".85" /></g>);
    return (<g><rect x="38" y="50" width="24" height="34" rx="3" fill={c.d} /><rect x="40" y="36" width="20" height="16" fill={c.h} /><path d="M42 36V22l16-8v22z" fill={c.a} /></g>);
  }
  if (ind === 'thucpham') {
    if (V === 0) return (<g><path d="M18 50h64a32 28 0 01-64 0z" fill={c.a} /><path d="M24 50q10-8 18 0t18 0t18 0" stroke={c.h} strokeWidth="3" fill="none" /><path d="M38 40q-6-8 0-16M50 40q-6-8 0-16M62 40q-6-8 0-16" stroke={c.s} strokeWidth="2.5" fill="none" strokeLinecap="round" /><rect x="40" y="76" width="20" height="5" rx="2" fill={c.d} /></g>);
    if (V === 1) return (<g><rect x="30" y="34" width="40" height="48" rx="10" fill={c.h} /><rect x="28" y="24" width="44" height="12" rx="3" fill={c.d} /><rect x="36" y="50" width="28" height="18" rx="3" fill={c.l} opacity=".9" /><path d="M72 40l14-18" stroke={c.s} strokeWidth="3" strokeLinecap="round" /><ellipse cx="88" cy="20" rx="5" ry="7" fill={c.d} /></g>);
    if (V === 2) return (<g><path d="M30 24h40l4 60H26z" fill={c.a} /><path d="M30 24l6-8h28l6 8" fill={c.d} /><ellipse cx="50" cy="56" rx="9" ry="12" fill={c.d} /><path d="M50 45q-4 11 0 22" stroke={c.a} strokeWidth="2" fill="none" /></g>);
    if (V === 3) return (<g><circle cx="38" cy="58" r="18" fill={c.h} /><circle cx="62" cy="62" r="16" fill={c.a} /><circle cx="52" cy="40" r="14" fill={c.d} /><path d="M52 26q4-8 12-8q-2 8-12 8z" fill={c.s} /></g>);
    return (<g><path d="M14 58q36-26 72 0q-36 14-72 0z" fill={c.h} /><path d="M30 52l6-6M44 48l6-6M58 48l6-6" stroke={c.d} strokeWidth="3" strokeLinecap="round" /></g>);
  }
  if (ind === 'cokhi') {
    if (V === 0) {
      let d = ''; const n = 12;
      for (let i = 0; i < n * 4; i++) { const a = (i / (n * 4)) * Math.PI * 2; const r = i % 4 < 2 ? 34 : 27; d += `${i ? 'L' : 'M'}${(50 + Math.cos(a) * r).toFixed(1)} ${(50 + Math.sin(a) * r).toFixed(1)}`; }
      return (<g><path d={d + 'Z'} fill={c.a} /><circle cx="50" cy="50" r="12" fill={c.l} /><circle cx="50" cy="50" r="20" fill="none" stroke={c.d} strokeWidth="3" /></g>);
    }
    if (V === 1) { const pts = Array.from({ length: 6 }, (_, i) => { const a = (i / 6) * Math.PI * 2; return `${(50 + Math.cos(a) * 32).toFixed(1)},${(50 + Math.sin(a) * 32).toFixed(1)}`; }).join(' '); return (<g><polygon points={pts} fill={c.a} /><circle cx="50" cy="50" r="15" fill={c.l} /><circle cx="50" cy="50" r="15" fill="none" stroke={c.d} strokeWidth="3" strokeDasharray="3 3" /></g>); }
    if (V === 2) return (<g transform="rotate(-35 50 50)"><rect x="44" y="28" width="12" height="50" rx="4" fill={c.a} /><path d="M38 16a14 14 0 1024 0l-6 8h-12z" fill={c.d} /><circle cx="50" cy="84" r="10" fill="none" stroke={c.d} strokeWidth="6" /></g>);
    if (V === 3) return (<g><circle cx="50" cy="50" r="34" fill={c.d} /><circle cx="50" cy="50" r="26" fill={c.l} />{Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(a) * 22} cy={50 + Math.sin(a) * 22} r="5" fill={c.a} />; })}<circle cx="50" cy="50" r="15" fill={c.d} /><circle cx="50" cy="50" r="10" fill={c.l} /></g>);
    return (<g><path d="M22 74V46a24 24 0 0124-24h28" stroke={c.a} strokeWidth="18" fill="none" /><rect x="12" y="72" width="20" height="8" rx="2" fill={c.d} /><rect x="72" y="12" width="8" height="20" rx="2" fill={c.d} /></g>);
  }
  // du lịch
  if (V === 0) return (<g><circle cx="68" cy="30" r="12" fill={c.h} /><path d="M4 84l30-46 18 24 14-18 30 40z" fill={c.a} /><path d="M34 38l7 11-7-3-6 5z" fill={c.l} /><path d="M4 84h92" stroke={c.d} strokeWidth="3" /></g>);
  if (V === 1) return (<g><circle cx="74" cy="26" r="11" fill={c.h} /><path d="M4 70q12-6 24 0t24 0t24 0t20 0V92H4z" fill={c.a} /><path d="M30 70q2-26 10-38" stroke={c.d} strokeWidth="4" fill="none" /><path d="M40 32q-14-4-22 6M40 32q-6-12-18-12M40 32q10-8 22-2M40 32q12 4 14 16" stroke={c.s} strokeWidth="4" fill="none" strokeLinecap="round" /></g>);
  if (V === 2) return (<g><ellipse cx="28" cy="74" rx="20" ry="7" fill={c.l} /><ellipse cx="72" cy="80" rx="22" ry="7" fill={c.l} /><g transform="rotate(-12 50 46)"><path d="M12 48Q12 42 22 42H80Q92 42 94 46Q92 50 80 50H22Q12 50 12 48Z" fill={c.a} /><path d="M44 43L60 20H68L60 43Z" fill={c.d} /><path d="M46 49L60 72H68L60 49Z" fill={c.d} /><path d="M16 43L12 30H19L27 43Z" fill={c.d} /><circle cx="84" cy="45.5" r="2" fill={c.l} /></g></g>);
  if (V === 3) return (<g><path d="M30 34h40l-6-8H36z" fill={c.d} /><rect x="38" y="34" width="24" height="12" fill={c.a} /><path d="M26 50h48l-8-6H34z" fill={c.d} /><rect x="34" y="50" width="32" height="14" fill={c.a} /><path d="M22 68h56l-8-6H30z" fill={c.d} /><rect x="30" y="68" width="40" height="16" fill={c.a} /><rect x="46" y="72" width="8" height="12" fill={c.l} /><path d="M50 26V14" stroke={c.d} strokeWidth="3" /></g>);
  return (<g><path d="M0 52q25-22 50-6t50-10V62H0z" fill={c.d} opacity=".6" /><path d="M0 62h100v30H0z" fill={c.a} opacity=".55" /><path d="M30 64h40l-6 8H36z" fill={c.d} /><path d="M50 64V40l14 20z" fill={c.l} /><circle cx="78" cy="26" r="9" fill={c.h} /></g>);
}
/** ô ảnh: ảnh khách (cắt vừa ô) hoặc hình minh hoạ vẽ code */
function PhotoBox({ uid, x, y, w, h, r = 0, photo, ind, seed, p, bg }: { uid: string; x: number; y: number; w: number; h: number; r?: number; photo?: string; ind: Industry; seed: number; p: FLPalette; bg?: string }) {
  const id = `${uid}-ph-${seed}-${Math.round(x)}-${Math.round(y)}`;
  const dark = isDarkHex(p.paper);
  const base = bg || mix(p.accent2, dark ? '#20232a' : '#ffffff', dark ? 0.35 : 0.72);
  const c = { a: p.accent, d: dark ? mix(p.accent, '#000', 0.35) : p.deep, h: p.accent2, l: '#FFFFFF', s: dark ? '#E9E4D8' : mix(p.ink, '#fff', 0.25) };
  const s = (Math.min(w, h) / 100) * 0.78;
  return (
    <g>
      <clipPath id={id}><path d={rr(x, y, w, h, r)} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={x} y={y} width={w} height={h} fill={base} />
        {photo
          ? <image href={photo} x={x} y={y} width={w} height={h} preserveAspectRatio="xMidYMid slice" />
          : (<>
            <circle cx={x + w * 0.5} cy={y + h * 0.56} r={Math.min(w, h) * 0.42} fill={mix(base, p.accent, 0.12)} />
            <g transform={`translate(${x + w / 2 - 50 * s} ${y + h / 2 - 50 * s}) scale(${s})`}>{artShape(ind, seed, c)}</g>
          </>)}
      </g>
    </g>
  );
}

// ---------- QR ----------
function QR({ text, x, y, size, color, bg }: { text: string; x: number; y: number; size: number; color: string; bg: string }) {
  const q = qrPath(/^https?:\/\//i.test(text) ? text : `https://${text.trim()}`);
  const pad = size * 0.06, k = (size - pad * 2) / q.n;
  return (<g><rect x={x} y={y} width={size} height={size} rx={size * 0.04} fill={bg} /><path d={q.d} transform={`translate(${x + pad} ${y + pad}) scale(${k})`} fill={color} /></g>);
}

// ---------- 1 trang ----------
export interface PageCtx {
  spec: BKSpec; data: BKData; pages: PageType[]; index: number; photos: BKPhotos; bleed: boolean; uid: string; guides?: boolean;
}
export function pageDims(spec: Pick<BKSpec, 'size'>) { const sz = bkSize(spec.size); return { W: sz.wMm * U, H: sz.hMm * U, sz }; }

function renderPage(c: PageCtx): ReactNode {
  const { spec, data, pages, index, photos, uid } = c;
  const { W, H } = pageDims(spec);
  const b = c.bleed ? BK_BLEED_MM * U : 0;
  const p = FL_PALETTES.find((x) => x.id === spec.palette) || FL_PALETTES[0];
  const f = FL_FONTS.find((x) => x.id === spec.font) || FL_FONTS[0];
  const type = pages[index];
  const n = pages.length;
  const k = Math.min(W, H) / 840;
  const land = W > H;
  const m = 15 * U * k; // lề an toàn
  const H1: TS = { fam: f.family, wt: f.weight };
  const BB: TS = { fam: BODY, wt: 800 };
  const BR: TS = { fam: BODY, wt: 600 };
  const dark = isDarkHex(p.paper);
  const tint = mix(p.accent, p.paper, dark ? 0.82 : 0.9);
  const st = spec.style;
  const pageNo = index + 1;
  const left = pageNo % 2 === 0; // trang chẵn = trang trái
  const ind = spec.industry;
  const els: ReactNode[] = [];
  const bg = (fill: string) => <rect key="bg" x={-b} y={-b} width={W + b * 2} height={H + b * 2} fill={fill} />;

  // ---------- BÌA TRƯỚC ----------
  if (type === 'cover') {
    const brand = data.brand || '';
    if (st === 'bold' || st === 'elegant') {
      const deep = st === 'elegant' ? (dark ? p.paper : p.deep) : p.accent;
      const on = st === 'elegant' ? (dark ? p.ink : '#FFFFFF') : p.onAccent;
      els.push(bg(deep));
      if (st === 'elegant') els.push(<rect key="fr" x={9 * U * k} y={9 * U * k} width={W - 18 * U * k} height={H - 18 * U * k} fill="none" stroke={p.accent2} strokeWidth={1.6 * k} />);
      const phW = land ? W * 0.46 : W - m * 2.6, phH = land ? H - m * 2.6 : H * 0.38;
      const phX = land ? W - m * 1.3 - phW : m * 1.3, phY = land ? m * 1.3 : H * 0.27;
      els.push(<PhotoBox key="ph" uid={uid} x={phX} y={phY} w={phW} h={phH} r={st === 'elegant' ? 0 : 10 * k} photo={photos.cover} ind={ind} seed={0} p={p} bg={mix(deep, '#ffffff', 0.12)} />);
      const tx = m * 1.3, tw = land ? W * 0.42 : W - m * 2.6;
      let y = m * 1.4;
      const t1 = block({ text: data.tagline, x: tx, y, maxW: tw, size: 22 * k, maxLines: 1, ts: { ...BB, ls: 3 * k }, fill: p.accent2, upper: true }); els.push(<g key="tg">{t1.el}</g>); y += t1.h + 8 * k;
      const t2 = block({ text: brand, x: tx, y, maxW: tw, size: 50 * k, maxLines: 2, ts: H1, fill: on }); els.push(<g key="br">{t2.el}</g>); y += t2.h + 6 * k;
      if (land) {
        const t3 = block({ text: data.coverTitle, x: tx, y: y + 30 * k, maxW: tw, size: 64 * k, maxLines: 3, ts: H1, fill: on }); els.push(<g key="ct">{t3.el}</g>);
        const t4 = block({ text: data.coverSub, x: tx, y: y + 40 * k + t3.h, maxW: tw, size: 22 * k, maxLines: 3, ts: BR, fill: on, opacity: 0.85 }); els.push(<g key="cs">{t4.el}</g>);
      } else {
        const yb = phY + phH + 30 * k;
        const t3 = block({ text: data.coverTitle, x: tx, y: yb, maxW: tw, size: 58 * k, maxLines: 2, ts: H1, fill: on }); els.push(<g key="ct">{t3.el}</g>);
        const t4 = block({ text: data.coverSub, x: tx, y: yb + t3.h + 8 * k, maxW: data.year ? tw - textW(data.year, 24 * k, BB) - 60 * k : tw, size: 21 * k, maxLines: 2, ts: BR, fill: on, opacity: 0.85 }); els.push(<g key="cs">{t4.el}</g>);
      }
      if (data.year) {
        const yw = textW(data.year, 24 * k, BB) + 28 * k;
        els.push(<g key="yr"><rect x={W - m * 1.3 - yw} y={H - m * 1.3 - 40 * k} width={yw} height={40 * k} rx={20 * k} fill={p.accent2} /><text x={W - m * 1.3 - yw / 2} y={H - m * 1.3 - 12 * k} textAnchor="middle" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={24 * k} fill={p.on2}>{data.year}</text></g>);
      }
      return els;
    }
    // modern / minimal / fresh: ảnh lớn phía trên + khối chữ dưới
    els.push(bg(st === 'minimal' ? p.paper : p.paper));
    const phH = land ? H : H * 0.58;
    const phW = land ? W * 0.56 : W;
    if (st === 'minimal') {
      els.push(<PhotoBox key="ph" uid={uid} x={land ? W - m - (phW - m * 2) : m} y={m} w={land ? phW - m * 2 : W - m * 2} h={land ? H - m * 2 : phH - m} photo={photos.cover} ind={ind} seed={0} p={p} />);
    } else {
      els.push(<PhotoBox key="ph" uid={uid} x={land ? W - phW : -b} y={-b} w={land ? phW + b : W + b * 2} h={phH + b} photo={photos.cover} ind={ind} seed={0} p={p} />);
      if (st === 'fresh' && !land) els.push(<path key="wave" d={`M${-b} ${phH - 40 * k}Q${W * 0.3} ${phH + 10 * k} ${W * 0.6} ${phH - 20 * k}T${W + b} ${phH - 30 * k}V${H + b}H${-b}Z`} fill={p.paper} />);
      if (st === 'modern') els.push(<rect key="bar" x={land ? 0 : -b} y={land ? -b : phH} width={land ? 14 * k : W + b * 2} height={land ? H + b * 2 : 14 * k} fill={p.accent} />);
    }
    const tx = m, tw = land ? W - phW - m * 2 : W - m * 2;
    let y = land ? H * 0.16 : phH + 40 * k;
    const t1 = block({ text: data.tagline, x: tx, y, maxW: tw, size: 20 * k, maxLines: 1, ts: { ...BB, ls: 3 * k }, fill: p.accent, upper: true }); els.push(<g key="tg">{t1.el}</g>); y += t1.h + 6 * k;
    const t3 = block({ text: data.coverTitle, x: tx, y, maxW: tw, size: (land ? 56 : 58) * k, maxLines: land ? 4 : 2, ts: H1, fill: p.ink }); els.push(<g key="ct">{t3.el}</g>); y += t3.h + 8 * k;
    const t4 = block({ text: data.coverSub, x: tx, y, maxW: tw, size: 21 * k, maxLines: 2, ts: BR, fill: p.sub }); els.push(<g key="cs">{t4.el}</g>);
    const by = H - m - 6 * k;
    els.push(<line key="ln" x1={tx} x2={tx + tw} y1={by - 52 * k} y2={by - 52 * k} stroke={mix(p.ink, p.paper, 0.75)} strokeWidth={1.4 * k} />);
    const bw = data.year ? tw - textW(data.year, 22 * k, BB) - 20 * k : tw;
    const t5 = block({ text: data.brand, x: tx, y: by - 40 * k, maxW: bw, size: 30 * k, maxLines: 1, ts: H1, fill: p.accent }); els.push(<g key="br">{t5.el}</g>);
    if (data.year) els.push(<text key="yr" x={tx + tw} y={by - 12 * k} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={22 * k} fill={p.sub}>{data.year}</text>);
    return els;
  }

  // ---------- BÌA SAU ----------
  if (type === 'back') {
    const deep = st === 'minimal' || st === 'fresh' ? tint : st === 'elegant' && dark ? p.paper : p.deep;
    const on = st === 'minimal' || st === 'fresh' ? p.ink : st === 'elegant' && dark ? p.ink : '#FFFFFF';
    els.push(bg(deep));
    if (st === 'elegant') els.push(<rect key="fr" x={9 * U * k} y={9 * U * k} width={W - 18 * U * k} height={H - 18 * U * k} fill="none" stroke={p.accent2} strokeWidth={1.6 * k} />);
    const cx = W / 2, tw = Math.min(W - m * 2.4, 620 * k);
    let y = H * (land ? 0.16 : 0.22);
    const t1 = block({ text: data.brand, x: cx, y, maxW: tw, size: 52 * k, maxLines: 2, ts: H1, fill: on, anchor: 'middle' }); els.push(<g key="br">{t1.el}</g>); y += t1.h + 6 * k;
    const t2 = block({ text: data.tagline, x: cx, y, maxW: tw, size: 18 * k, maxLines: 1, ts: { ...BB, ls: 3 * k }, fill: st === 'minimal' || st === 'fresh' ? p.accent : p.accent2, anchor: 'middle', upper: true }); els.push(<g key="tg">{t2.el}</g>); y += t2.h + 30 * k;
    const t3 = block({ text: data.backSlogan, x: cx, y, maxW: tw, size: 30 * k, maxLines: 2, ts: H1, fill: on, anchor: 'middle', opacity: 0.92 }); els.push(<g key="sl">{t3.el}</g>); y += t3.h + 34 * k;
    const qs = 150 * k;
    if (data.website) { els.push(<QR key="qr" text={data.website} x={cx - qs / 2} y={y} size={qs} color="#111111" bg="#FFFFFF" />); y += qs + 12 * k; }
    const lines = [data.phone, data.email, data.website, data.address].filter(Boolean);
    lines.forEach((ln, i) => { const t = block({ text: ln, x: cx, y: y + i * 30 * k, maxW: tw, size: 19 * k, maxLines: 1, ts: BR, fill: on, anchor: 'middle', opacity: 0.88 }); els.push(<g key={`c${i}`}>{t.el}</g>); });
    return els;
  }

  // ---------- TRANG RUỘT: khung theo phong cách ----------
  els.push(bg(p.paper));
  const titleOf: Partial<Record<PageType, string>> = {
    about: data.aboutTitle, grid2: data.productsTitle, grid4: data.productsTitle, grid6: data.productsTitle, featured: data.featKicker,
    prices: data.pricesTitle, projects: data.projectsTitle, team: data.teamTitle, contact: 'Liên hệ với chúng tôi', notes: 'Ghi chú',
  };
  const title = titleOf[type] || '';
  let top = m;
  const inX = left ? m : m, inW = W - m * 2;
  if (st === 'modern') {
    const bandH = 30 * U * k * 0.62;
    els.push(<rect key="band" x={-b} y={-b} width={W + b * 2} height={bandH + b} fill={p.accent} />);
    // tiêu đề trang ưu tiên; tên thương hiệu góc phải tối đa 34% bề ngang (dài thì co nhỏ / cắt "…")
    const tW = Math.min(textW(title, 34 * k, H1), inW * 0.62);
    const bMax = Math.min(inW * 0.34, inW - tW - 30 * k);
    const t = block({ text: title, x: inX, y: bandH / 2 - 22 * k, maxW: inW - Math.min(bMax, textW(data.brand, 15 * k, BB)) - 30 * k, size: 34 * k, maxLines: 1, ts: H1, fill: p.onAccent }); els.push(<g key="tt">{t.el}</g>);
    els.push(<g key="bb">{block({ text: data.brand, x: inX + inW, y: bandH / 2 - 8 * k, maxW: bMax, size: 15 * k, maxLines: 1, ts: BB, fill: p.onAccent, anchor: 'end', opacity: 0.85 }).el}</g>);
    top = bandH + 28 * k;
  } else if (st === 'minimal') {
    const t = block({ text: title, x: inX, y: m, maxW: inW, size: 38 * k, maxLines: 1, ts: H1, fill: p.ink }); els.push(<g key="tt">{t.el}</g>);
    els.push(<rect key="ul" x={inX} y={m + t.h + 4 * k} width={46 * k} height={5 * k} fill={p.accent} />);
    top = m + t.h + 36 * k;
  } else if (st === 'bold') {
    const sw = 11 * U * k * 0.7;
    els.push(<rect key="stripe" x={left ? -b : W - sw} y={-b} width={sw + b} height={H + b * 2} fill={p.accent} />);
    const t = block({ text: title, x: inX, y: m, maxW: inW - sw, size: 44 * k, maxLines: 1, ts: H1, fill: p.ink, upper: true }); els.push(<g key="tt">{t.el}</g>);
    els.push(<rect key="ul" x={inX} y={m + t.h + 2 * k} width={Math.min(inW - sw, textW(title.toUpperCase(), 44 * k, H1)) * 0.4} height={9 * k} fill={p.accent2} />);
    top = m + t.h + 40 * k;
  } else if (st === 'elegant') {
    els.push(<rect key="fr" x={9 * U * k} y={9 * U * k} width={W - 18 * U * k} height={H - 18 * U * k} fill="none" stroke={mix(p.accent, p.paper, 0.35)} strokeWidth={1.2 * k} />);
    const t = block({ text: title, x: W / 2, y: m + 10 * k, maxW: inW - 60 * k, size: 36 * k, maxLines: 1, ts: H1, fill: p.ink, anchor: 'middle' }); els.push(<g key="tt">{t.el}</g>);
    const oy = m + 10 * k + t.h + 6 * k;
    els.push(<g key="orn" stroke={p.accent} strokeWidth={1.4 * k}><line x1={W / 2 - 70 * k} x2={W / 2 - 12 * k} y1={oy} y2={oy} /><line x1={W / 2 + 12 * k} x2={W / 2 + 70 * k} y1={oy} y2={oy} /><path d={`M${W / 2} ${oy - 6 * k}l6 ${6 * k}-6 ${6 * k}-6 ${-6 * k}z`} fill={p.accent} /></g>);
    top = oy + 30 * k;
  } else { // fresh
    els.push(<circle key="blob" cx={left ? -20 * k : W + 20 * k} cy={-10 * k} r={170 * k} fill={p.accent2} opacity={0.28} />);
    els.push(<circle key="blob2" cx={left ? W + 30 * k : -30 * k} cy={H + 10 * k} r={130 * k} fill={p.accent} opacity={0.12} />);
    const tw = Math.min(inW, textW(title, 30 * k, H1) + 48 * k);
    els.push(<rect key="pill" x={inX} y={m} width={tw} height={56 * k} rx={28 * k} fill={p.accent} />);
    const t = block({ text: title, x: inX + 24 * k, y: m + 8 * k, maxW: tw - 48 * k, size: 30 * k, maxLines: 1, ts: H1, fill: p.onAccent }); els.push(<g key="tt">{t.el}</g>);
    top = m + 56 * k + 30 * k;
  }
  // chân trang: số trang + thương hiệu
  const footY = H - m * 0.62;
  const fx = left ? inX : inX + inW;
  els.push(<g key="foot" fontFamily={`"${BODY}"`} fontSize={14 * k} fill={p.sub}>
    <text x={fx} y={footY} textAnchor={left ? 'start' : 'end'} fontWeight={800} fill={p.accent}>{String(pageNo).padStart(2, '0')}</text>
    <text x={left ? inX + 34 * k : inX + inW - 34 * k} y={footY} textAnchor={left ? 'start' : 'end'} fontWeight={600}>{(data.brand || '').slice(0, 40)}</text>
  </g>);
  const box = { x: inX, y: top, w: inW - (st === 'bold' ? 11 * U * k * 0.7 * (left ? 0 : 1) : 0), h: footY - 26 * k - top };
  if (st === 'bold' && left) { box.x += 11 * U * k * 0.7; box.w -= 11 * U * k * 0.7; }
  const rad = st === 'fresh' ? 16 * k : st === 'minimal' || st === 'elegant' ? 0 : 6 * k;
  const cardFill = st === 'minimal' ? 'none' : st === 'elegant' ? mix(p.accent2, p.paper, 0.85) : tint;

  // ---------- nội dung theo loại trang ----------
  if (type === 'about') {
    const gap = 22 * k;
    const stats = splitLines(data.stats).slice(0, 4).map(cols);
    const statH = stats.length ? 120 * k : 0;
    if (land) {
      const pw = box.w * 0.44;
      els.push(<PhotoBox key="ph" uid={uid} x={box.x} y={box.y} w={pw} h={box.h} r={rad} photo={photos.about} ind={ind} seed={1} p={p} />);
      const tx = box.x + pw + gap * 1.4, tw = box.w - pw - gap * 1.4;
      const pr = para({ text: data.about, x: tx, y: box.y, w: tw, h: box.h - statH - gap, size: 26 * k, minSize: 12 * k, ts: BR, fill: p.ink });
      els.push(<g key="ab">{pr.el}</g>);
      els.push(<g key="st">{statsRow(stats, tx, box.y + box.h - statH, tw, statH)}</g>);
    } else {
      const ph = box.h * 0.44;
      els.push(<PhotoBox key="ph" uid={uid} x={box.x} y={box.y} w={box.w} h={ph} r={rad} photo={photos.about} ind={ind} seed={1} p={p} />);
      const pr = para({ text: data.about, x: box.x, y: box.y + ph + gap, w: box.w, h: box.h - ph - gap * 2 - statH, size: 24 * k, minSize: 12 * k, ts: BR, fill: p.ink });
      els.push(<g key="ab">{pr.el}</g>);
      els.push(<g key="st">{statsRow(stats, box.x, box.y + box.h - statH, box.w, statH)}</g>);
    }
  } else if (type === 'grid2' || type === 'grid4' || type === 'grid6') {
    const items = productsForPage(pages, index, parseProducts(data.products));
    const nI = GRID_N[type]!;
    const [cN, rN] = nI === 2 ? (land ? [2, 1] : [1, 2]) : nI === 4 ? [2, 2] : land ? [3, 2] : [2, 3];
    const gx = 18 * k, gy = 20 * k;
    const cw = (box.w - gx * (cN - 1)) / cN, ch = (box.h - gy * (rN - 1)) / rN;
    items.forEach((it, i) => {
      const cx = box.x + (i % cN) * (cw + gx), cy = box.y + Math.floor(i / cN) * (ch + gy);
      els.push(<g key={`p${i}`} data-card="1">{productCard(it, cx, cy, cw, ch, nI === 2 && !land)}</g>);
    });
  } else if (type === 'featured') {
    const gap = 24 * k;
    const pts = splitLines(data.featPoints).slice(0, 5);
    const ph = land ? box.h : box.h * 0.5, pw = land ? box.w * 0.5 : box.w;
    els.push(<PhotoBox key="ph" uid={uid} x={box.x} y={box.y} w={pw} h={ph} r={rad} photo={photos.feat} ind={ind} seed={2} p={p} />);
    const tx = land ? box.x + pw + gap * 1.3 : box.x, tw = land ? box.w - pw - gap * 1.3 : box.w;
    let y = land ? box.y : box.y + ph + gap;
    const bottom = box.y + box.h;
    const t1 = block({ text: data.featTitle, x: tx, y, maxW: tw, size: 44 * k, maxLines: 2, ts: H1, fill: p.ink }); els.push(<g key="ft">{t1.el}</g>); y += t1.h + 8 * k;
    if (data.featPrice) {
      const fs = Math.min(26 * k, fitSize(data.featPrice, tw - 32 * k, 26 * k, BB));
      const pw2 = textW(data.featPrice, fs, BB) + 32 * k;
      els.push(<g key="fp"><rect x={tx} y={y} width={pw2} height={44 * k} rx={st === 'fresh' ? 22 * k : 4 * k} fill={p.accent} /><text x={tx + 16 * k} y={y + 30 * k} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fs} fill={p.onAccent}>{data.featPrice}</text></g>);
      y += 44 * k + 16 * k;
    }
    const ptsH = pts.length * 36 * k;
    const pr = para({ text: data.featDesc, x: tx, y, w: tw, h: Math.max(40 * k, bottom - y - ptsH - 16 * k), size: 22 * k, minSize: 11 * k, ts: BR, fill: p.sub });
    els.push(<g key="fd">{pr.el}</g>);
    const py = Math.max(y + pr.h + 10 * k, bottom - ptsH);
    pts.forEach((pt, i) => {
      const yy = py + i * 36 * k;
      els.push(<g key={`fpt${i}`}><circle cx={tx + 11 * k} cy={yy + 13 * k} r={11 * k} fill={p.accent2} /><Ico k="check" x={tx + 3 * k} y={yy + 5 * k} s={16 * k} color={p.on2} w={3} />{block({ text: pt, x: tx + 32 * k, y: yy, maxW: tw - 32 * k, size: 18 * k, maxLines: 1, ts: BB, fill: p.ink }).el}</g>);
    });
  } else if (type === 'prices') {
    const rows = splitLines(data.prices).map(cols).slice(0, 24);
    const noteH = data.priceNote ? 44 * k : 0;
    const twoCol = land && rows.length > 6;
    const perCol = twoCol ? Math.ceil(rows.length / 2) : rows.length;
    const colW = twoCol ? (box.w - 40 * k) / 2 : box.w;
    const rh = Math.min(84 * k, (box.h - noteH) / Math.max(1, perCol));
    const fs = Math.min(25 * k, rh * 0.4);
    rows.forEach((r, i) => {
      const ci = Math.floor(i / perCol), ri = i % perCol;
      const x0 = box.x + ci * (colW + 40 * k), y0 = box.y + ri * rh;
      const [name = '', price = ''] = r;
      const pW = Math.min(colW * 0.42, textW(price, fs, BB));
      const nameT = block({ text: name, x: x0 + 14 * k, y: y0 + rh / 2 - fs * 0.62, maxW: colW - pW - 70 * k, size: fs, maxLines: 1, ts: BR, fill: p.ink });
      const nw = Math.min(colW - pW - 70 * k, textW(name, fs, BR));
      els.push(<g key={`r${i}`}>
        {ri % 2 === 0 && st !== 'minimal' && <rect x={x0} y={y0} width={colW} height={rh} rx={rad * 0.5} fill={tint} opacity={0.7} />}
        {nameT.el}
        <line x1={x0 + 14 * k + nw + 10 * k} x2={x0 + colW - 14 * k - pW - 10 * k} y1={y0 + rh / 2 + fs * 0.3} y2={y0 + rh / 2 + fs * 0.3} stroke={mix(p.sub, p.paper, 0.45)} strokeWidth={1.6 * k} strokeDasharray={`${2 * k} ${5 * k}`} strokeLinecap="round" />
        <text x={x0 + colW - 14 * k} y={y0 + rh / 2 + fs * 0.36} textAnchor="end" fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fitSize(price, colW * 0.42, fs, BB)} fill={p.accent}>{price}</text>
      </g>);
    });
    if (data.priceNote) els.push(<g key="note">{block({ text: data.priceNote, x: box.x, y: box.y + box.h - noteH + 8 * k, maxW: box.w, size: 16 * k, maxLines: 2, ts: BR, fill: p.sub }).el}</g>);
  } else if (type === 'projects') {
    const list = splitLines(data.projects).map(cols).slice(0, 6);
    const cN = land ? 3 : 2, rN = Math.max(land ? 1 : 2, Math.ceil(list.length / cN));
    const gx = 18 * k, gy = 20 * k;
    const cw = (box.w - gx * (cN - 1)) / cN, ch = (box.h - gy * (rN - 1)) / rN;
    list.forEach((r, i) => {
      const cx = box.x + (i % cN) * (cw + gx), cy = box.y + Math.floor(i / cN) * (ch + gy);
      const ph = ch * 0.56;
      const [name = '', who = '', yr = ''] = r;
      els.push(<g key={`pj${i}`} data-card="1">
        {cardFill !== 'none' && <path d={rr(cx, cy, cw, ch, rad)} fill={cardFill} />}
        <PhotoBox uid={uid} x={cx} y={cy} w={cw} h={ph} r={rad} photo={photos[`pj${i}`]} ind={ind} seed={i + 3} p={p} />
        {yr && <g><rect x={cx + 10 * k} y={cy + 10 * k} width={textW(yr, 14 * k, BB) + 18 * k} height={26 * k} rx={13 * k} fill={p.accent} /><text x={cx + 19 * k} y={cy + 28 * k} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={14 * k} fill={p.onAccent}>{yr}</text></g>}
        {(() => { const pad = cardFill === 'none' ? 0 : 12 * k; const t1 = block({ text: name, x: cx + pad, y: cy + ph + 10 * k, maxW: cw - pad * 2, size: 19 * k, maxLines: 2, ts: BB, fill: p.ink }); const t2 = block({ text: who, x: cx + pad, y: cy + ph + 14 * k + t1.h, maxW: cw - pad * 2, size: 15 * k, maxLines: Math.max(1, Math.floor((ch - ph - t1.h - 24 * k) / (15 * k * 1.2))), ts: BR, fill: p.sub }); return <>{t1.el}{t2.el}</>; })()}
      </g>);
    });
  } else if (type === 'team') {
    const list = splitLines(data.team).map(cols).slice(0, 8);
    const cN = land ? 4 : 2, rN = Math.max(1, Math.ceil(list.length / cN));
    const gx = 18 * k, gy = 18 * k;
    const cw = (box.w - gx * (cN - 1)) / cN, ch = Math.min((box.h - gy * (rN - 1)) / rN, cw * 1.1);
    list.forEach((r, i) => {
      const cx = box.x + (i % cN) * (cw + gx), cy = box.y + Math.floor(i / cN) * (ch + gy);
      const [name = '', role = ''] = r;
      const rad2 = Math.min(cw * 0.26, ch * 0.28);
      const init = name.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
      els.push(<g key={`tm${i}`}>
        {cardFill !== 'none' && <path d={rr(cx, cy, cw, ch, rad)} fill={cardFill} />}
        <circle cx={cx + cw / 2} cy={cy + 16 * k + rad2} r={rad2} fill={i % 2 ? p.accent : p.accent2} />
        <text x={cx + cw / 2} y={cy + 16 * k + rad2 + rad2 * 0.34} textAnchor="middle" fontFamily={`"${f.family}"`} fontWeight={f.weight} fontSize={rad2 * 0.9} fill={i % 2 ? p.onAccent : p.on2}>{init}</text>
        {block({ text: name, x: cx + cw / 2, y: cy + 28 * k + rad2 * 2, maxW: cw - 20 * k, size: 20 * k, maxLines: 1, ts: BB, fill: p.ink, anchor: 'middle' }).el}
        {block({ text: role, x: cx + cw / 2, y: cy + 56 * k + rad2 * 2, maxW: cw - 20 * k, size: 15 * k, maxLines: Math.max(1, Math.floor((ch - 66 * k - rad2 * 2) / (18 * k))), ts: BR, fill: p.sub, anchor: 'middle' }).el}
      </g>);
    });
  } else if (type === 'contact') {
    const rows: [string, string][] = ([['phone', data.phone], ['mail', data.email], ['globe', data.website], ['pin', data.address], ['clock', data.hours]] as [string, string][]).filter(([, v]) => v);
    const listW = land ? box.w * 0.46 : box.w;
    const rh = 50 * k;
    rows.forEach(([ic, v], i) => {
      const y = box.y + i * rh;
      els.push(<g key={`ct${i}`}><circle cx={box.x + 18 * k} cy={y + 18 * k} r={18 * k} fill={p.accent} /><Ico k={ic} x={box.x + 8 * k} y={y + 8 * k} s={20 * k} color={p.onAccent} />{block({ text: v, x: box.x + 48 * k, y: y + 1 * k, maxW: listW - 48 * k, size: 19 * k, maxLines: 2, lh: 1.15, ts: BR, fill: p.ink }).el}</g>);
    });
    const qs = Math.min(170 * k, land ? box.h * 0.4 : box.h * 0.24);
    const mapX = land ? box.x + listW + 30 * k : box.x, mapW = land ? box.w - listW - 30 * k : box.w;
    const mapY = land ? box.y : box.y + rows.length * rh + 20 * k;
    const mapH = land ? box.h - qs - 30 * k : box.h - (rows.length * rh + 20 * k) - qs - 30 * k;
    els.push(<g key="map">{mapCard(mapX, mapY, mapW, Math.max(80 * k, mapH))}</g>);
    if (data.website) {
      const qy = box.y + box.h - qs;
      els.push(<QR key="qr" text={data.website} x={mapX} y={qy} size={qs} color="#111111" bg="#FFFFFF" />);
      els.push(<g key="qrt">{block({ text: 'Quét mã để xem website, đặt hàng và nhận báo giá mới nhất', x: mapX + qs + 20 * k, y: qy + qs / 2 - 30 * k, maxW: mapW - qs - 20 * k, size: 17 * k, maxLines: 3, ts: BR, fill: p.sub }).el}</g>);
    }
  } else if (type === 'notes') {
    const lh = 40 * k;
    for (let y = box.y + lh; y < box.y + box.h; y += lh) els.push(<line key={`nl${y}`} x1={box.x} x2={box.x + box.w} y1={y} y2={y} stroke={mix(p.sub, p.paper, 0.7)} strokeWidth={1.2 * k} />);
  }
  return els;

  // ----- mảnh con -----
  function statsRow(stats: string[][], x: number, y: number, w: number, h: number): ReactNode {
    if (!stats.length) return null;
    const g = 12 * k, n2 = stats.length, cw = (w - g * (n2 - 1)) / n2;
    return stats.map(([num = '', lab = ''], i) => (
      <g key={i}>
        <path d={rr(x + i * (cw + g), y, cw, h, rad)} fill={st === 'minimal' ? 'none' : i % 2 ? tint : mix(p.accent2, p.paper, 0.7)} stroke={st === 'minimal' ? mix(p.ink, p.paper, 0.8) : 'none'} strokeWidth={1.2 * k} />
        {block({ text: num, x: x + i * (cw + g) + cw / 2, y: y + 14 * k, maxW: cw - 16 * k, size: 34 * k, maxLines: 1, ts: H1, fill: p.accent, anchor: 'middle' }).el}
        {block({ text: lab, x: x + i * (cw + g) + cw / 2, y: y + 60 * k, maxW: cw - 16 * k, size: 14 * k, maxLines: 2, lh: 1.12, ts: BR, fill: p.sub, anchor: 'middle' }).el}
      </g>
    ));
  }
  function productCard(it: Product, x: number, y: number, w: number, h: number, row: boolean): ReactNode {
    const pad = cardFill === 'none' ? 0 : 14 * k;
    const ph = row ? h : Math.min(h * 0.6, w * 0.9);
    const pw = row ? w * 0.48 : w;
    const tx = row ? x + pw + 22 * k : x + pad, tw = row ? w - pw - 22 * k - pad : w - pad * 2;
    let ty = row ? y + 18 * k : y + ph + 12 * k;
    const bottom = y + h - (cardFill === 'none' ? 0 : 10 * k);
    const fsName = (row ? 30 : w > 300 * k ? 22 : 19) * k;
    const out: ReactNode[] = [];
    if (cardFill !== 'none') out.push(<path key="c" d={rr(x, y, w, h, rad)} fill={cardFill} />);
    out.push(<PhotoBox key="ph" uid={uid} x={x} y={y} w={pw} h={ph} r={rad} photo={photos[`p${it.idx}`]} ind={ind} seed={it.idx} p={p} />);
    if (it.code) {
      const cw2 = textW(it.code, 13 * k, BB) + 16 * k;
      out.push(<g key="cd"><rect x={x + 10 * k} y={y + 10 * k} width={cw2} height={24 * k} rx={4 * k} fill="#FFFFFF" opacity={0.92} /><text x={x + 18 * k} y={y + 27 * k} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={13 * k} fill="#1B1B1B">{it.code}</text></g>);
    }
    const nameT = block({ text: it.name, x: tx, y: ty, maxW: tw, size: fsName, maxLines: 2, lh: 1.12, ts: BB, fill: p.ink }); out.push(<g key="n">{nameT.el}</g>); ty += nameT.h + 2 * k;
    const priceH = it.price ? 30 * k : 0;
    const descRoom = bottom - ty - priceH - 6 * k;
    const dfs = (row ? 20 : 14) * k;
    const dl = Math.floor(descRoom / (dfs * 1.3));
    if (it.desc && dl >= 1) { const d = block({ text: it.desc, x: tx, y: ty, maxW: tw, size: dfs, maxLines: Math.min(dl, row ? 5 : 3), lh: 1.3, ts: BR, fill: p.sub, balance: false }); out.push(<g key="d">{d.el}</g>); }
    if (it.price) out.push(<text key="pr" x={tx} y={bottom - 8 * k} fontFamily={`"${BODY}"`} fontWeight={800} fontSize={fitSize(it.price, tw, (row ? 26 : 20) * k, BB)} fill={p.accent}>{it.price}</text>);
    return out;
  }
  function mapCard(x: number, y: number, w: number, h: number): ReactNode {
    const id = `${uid}-map-${index}`;
    const land2 = mix(p.accent2, p.paper, 0.82), road = '#FFFFFF', water = mix(p.accent, '#9fd3f0', 0.6);
    return (
      <g>
        <clipPath id={id}><path d={rr(x, y, w, h, rad)} /></clipPath>
        <g clipPath={`url(#${id})`}>
          <rect x={x} y={y} width={w} height={h} fill={land2} />
          <path d={`M${x} ${y + h * 0.8}Q${x + w * 0.3} ${y + h * 0.62} ${x + w * 0.55} ${y + h * 0.86}T${x + w} ${y + h * 0.7}V${y + h}H${x}Z`} fill={water} opacity={0.75} />
          {[0.22, 0.5, 0.78].map((t, i) => <line key={`v${i}`} x1={x + w * t} x2={x + w * t + w * 0.06} y1={y} y2={y + h} stroke={road} strokeWidth={(i === 1 ? 14 : 8) * k} />)}
          {[0.28, 0.55].map((t, i) => <line key={`h${i}`} x1={x} x2={x + w} y1={y + h * t} y2={y + h * t - h * 0.05} stroke={road} strokeWidth={(i === 0 ? 12 : 8) * k} />)}
          {[[0.08, 0.06], [0.6, 0.08], [0.3, 0.33], [0.82, 0.35], [0.06, 0.6]].map(([a, bb], i) => <rect key={`b${i}`} x={x + w * a} y={y + h * bb} width={w * 0.12} height={h * 0.14} rx={3 * k} fill={mix(land2, p.ink, 0.08)} />)}
        </g>
        <g transform={`translate(${x + w * 0.52} ${y + h * 0.42})`}>
          <path d={`M0 0c-${16 * k} -${20 * k} -${22 * k} -${30 * k} -${22 * k} -${42 * k}a${22 * k} ${22 * k} 0 0 1 ${44 * k} 0c0 ${12 * k} -${6 * k} ${22 * k} -${22 * k} ${42 * k}z`} fill={p.accent} />
          <circle cx={0} cy={-42 * k} r={8 * k} fill="#FFFFFF" />
        </g>
      </g>
    );
  }
}

/** 1 trang SVG (đơn vị 0.25mm). bleed → viewBox nới BK_BLEED_MM mỗi cạnh */
export function BookletPage({ spec, data, pages, index, photos, bleed = false, style }: { spec: BKSpec; data: BKData; pages: PageType[]; index: number; photos: BKPhotos; bleed?: boolean; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { W, H } = pageDims(spec);
  const b = bleed ? BK_BLEED_MM * U : 0;
  return (
    <svg viewBox={`${-b} ${-b} ${W + b * 2} ${H + b * 2}`} xmlns="http://www.w3.org/2000/svg" style={style} data-page={index + 1} data-type={pages[index]}>
      {renderPage({ spec, data, pages, index, photos, bleed, uid })}
    </svg>
  );
}

/** cặp 2 trang mở (đọc) — số trang 1-based, 0 = trống */
export function BookletSpread({ spec, data, pages, pair, photos, style }: { spec: BKSpec; data: BKData; pages: PageType[]; pair: [number, number]; photos: BKPhotos; style?: CSSProperties }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const { W, H } = pageDims(spec);
  const side = (pn: number, x: number) => {
    if (!pn) return <rect x={x} y={0} width={W} height={H} fill="none" />;
    const id = `${uid}-cl${pn}`;
    return (
      <g key={pn}>
        <clipPath id={id}><rect x={x} y={0} width={W} height={H} /></clipPath>
        <g clipPath={`url(#${id})`}><g transform={`translate(${x} 0)`}>{renderPage({ spec, data, pages, index: pn - 1, photos, bleed: false, uid: `${uid}p${pn}` })}</g></g>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W * 2} ${H}`} xmlns="http://www.w3.org/2000/svg" style={style} data-spread={pair.join('-')}>
      {side(pair[0], 0)}
      {side(pair[1], W)}
    </svg>
  );
}

// ---------- PDF in ----------
const MARK_ROOM = 9, MARK_LEN = 5;
type JsPdf = import('jspdf').jsPDF;
function cropMarks(pdf: JsPdf, tx0: number, ty0: number, tw: number, th: number, gap: number) {
  pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.15);
  const c = (cx: number, cy: number, sx: number, sy: number) => {
    pdf.line(cx - sx * gap, cy, cx - sx * (gap + MARK_LEN), cy);
    pdf.line(cx, cy - sy * gap, cx, cy - sy * (gap + MARK_LEN));
  };
  c(tx0, ty0, 1, 1); c(tx0 + tw, ty0, -1, 1); c(tx0, ty0 + th, 1, -1); c(tx0 + tw, ty0 + th, -1, -1);
}
/**
 * PDF in catalogue. pageEls = SVG từng trang CÓ lề xén (đúng thứ tự 1..N).
 * mode 'reader' = mỗi trang 1 trang PDF; 'imposed' = bình trang đóng ghim: mỗi trang PDF là 1 MẶT TỜ IN gồm 2 trang
 * (vd 8 trang: 8|1, 2|7, 6|3, 4|5), lề xén chỉ ở mép ngoài tờ, có vạch gấp giữa.
 */
export async function bookletPdf(pageEls: SVGSVGElement[], spec: Pick<BKSpec, 'size'>, fontCss: string, mode: 'reader' | 'imposed', dpi = 220, onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const { selfContainedSvg, svgToCanvas } = await import('./svg-export');
  const { jsPDF } = await import('jspdf');
  const sz = bkSize(spec.size);
  const bl = BK_BLEED_MM;
  const pxPerMm = dpi / 25.4;
  const pw = Math.round((sz.wMm + bl * 2) * pxPerMm), ph = Math.round((sz.hMm + bl * 2) * pxPerMm);
  const render = async (i: number) => svgToCanvas(await selfContainedSvg(pageEls[i], fontCss, { outline: true }), pw, ph, '#ffffff');
  const n = pageEls.length;
  if (mode === 'reader') {
    const W = sz.wMm + bl * 2 + MARK_ROOM * 2, H = sz.hMm + bl * 2 + MARK_ROOM * 2;
    const pdf = new jsPDF({ unit: 'mm', format: [W, H], orientation: W > H ? 'landscape' : 'portrait', compress: true });
    for (let i = 0; i < n; i++) {
      if (i) pdf.addPage([W, H], W > H ? 'landscape' : 'portrait');
      const c = await render(i);
      pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', MARK_ROOM, MARK_ROOM, sz.wMm + bl * 2, sz.hMm + bl * 2, undefined, 'FAST');
      cropMarks(pdf, MARK_ROOM + bl, MARK_ROOM + bl, sz.wMm, sz.hMm, bl);
      pdf.setFontSize(5); pdf.setTextColor(90, 90, 90);
      pdf.text(`Trang ${i + 1}/${n} - ${sz.wMm}x${sz.hMm}mm - le xen ${bl}mm`, MARK_ROOM + bl, H - 2);
      onProgress?.(i + 1, n);
    }
    return pdf.output('blob');
  }
  // bình trang: tờ rộng 2W, lề xén chỉ ở 4 mép ngoài tờ (gáy giữa 2 trang không có lề)
  const SW = sz.wMm * 2, SH = sz.hMm;
  const W = SW + bl * 2 + MARK_ROOM * 2, H = SH + bl * 2 + MARK_ROOM * 2;
  const pdf = new jsPDF({ unit: 'mm', format: [W, H], orientation: W > H ? 'landscape' : 'portrait', compress: true });
  const cache = new Map<number, HTMLCanvasElement>();
  const get = async (pn: number) => { if (!cache.has(pn)) cache.set(pn, await render(pn - 1)); return cache.get(pn)!; };
  const sheets = imposition(n);
  const bpx = Math.round(bl * pxPerMm), tpx = Math.round(sz.wMm * pxPerMm);
  for (let s = 0; s < sheets.length; s++) {
    const [L, R] = sheets[s];
    const out = document.createElement('canvas');
    out.width = tpx * 2 + bpx * 2; out.height = ph;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    const lc = await get(L), rc = await get(R);
    // trang trái: giữ lề trái, cắt lề phải (gáy); trang phải: cắt lề trái, giữ lề phải
    ctx.drawImage(lc, 0, 0, bpx + tpx, ph, 0, 0, bpx + tpx, ph);
    ctx.drawImage(rc, bpx, 0, tpx + bpx, ph, bpx + tpx, 0, tpx + bpx, ph);
    if (s) pdf.addPage([W, H], W > H ? 'landscape' : 'portrait');
    pdf.addImage(out.toDataURL('image/jpeg', 0.92), 'JPEG', MARK_ROOM, MARK_ROOM, SW + bl * 2, SH + bl * 2, undefined, 'FAST');
    cropMarks(pdf, MARK_ROOM + bl, MARK_ROOM + bl, SW, SH, bl);
    // vạch gấp giữa (nét đứt ngoài vùng xén)
    const fx = MARK_ROOM + bl + sz.wMm;
    pdf.setLineDashPattern([1, 0.8], 0); pdf.setLineWidth(0.15);
    pdf.line(fx, 0.8, fx, MARK_ROOM - 0.8); pdf.line(fx, H - MARK_ROOM + 0.8, fx, H - 0.8);
    pdf.setLineDashPattern([], 0);
    pdf.setFontSize(5); pdf.setTextColor(90, 90, 90);
    pdf.text(`To ${Math.floor(s / 2) + 1} - mat ${s % 2 ? 'sau' : 'truoc'} - trang ${L} | ${R} - dong ghim giua, net dut = vach gap`, MARK_ROOM + bl, H - 2);
    onProgress?.(s + 1, sheets.length);
  }
  return pdf.output('blob');
}
