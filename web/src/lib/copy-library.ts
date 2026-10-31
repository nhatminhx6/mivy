// Kho copy "chất" viết sẵn offline (0 AI realtime) — bấm "Gợi ý nội dung" là ra câu bắt mắt.
// 2 chiều: NGÀNH (flavor tiêu đề + sale tag) × TÔNG giọng (CTA + chất giọng).

export type CopyTone = 'sale' | 'pro' | 'luxury' | 'friendly';

export const COPY_TONES: { id: CopyTone; name: string }[] = [
  { id: 'sale', name: '🔥 Máu lửa' },
  { id: 'pro', name: 'Chuyên nghiệp' },
  { id: 'luxury', name: 'Sang trọng' },
  { id: 'friendly', name: 'Thân thiện' },
];

export const COPY_INDUSTRIES: { id: string; name: string }[] = [
  { id: 'chung', name: 'Chung' },
  { id: 'thoi-trang', name: 'Thời trang' },
  { id: 'my-pham', name: 'Mỹ phẩm' },
  { id: 'do-an', name: 'Đồ ăn / F&B' },
  { id: 'phu-kien', name: 'Phụ kiện' },
  { id: 'dien-tu', name: 'Điện tử / Gia dụng' },
  { id: 'me-be', name: 'Mẹ & Bé' },
  { id: 'noi-that', name: 'Nhà cửa' },
  { id: 'spa', name: 'Spa / Làm đẹp' },
  { id: 'nha-hang', name: 'Quán ăn / Nhà hàng' },
  { id: 'du-lich', name: 'Du lịch' },
  { id: 'the-hinh', name: 'Thể hình / Gym' },
  { id: 'giao-duc', name: 'Giáo dục' },
  { id: 'su-kien', name: 'Sự kiện' },
  { id: 'tuyen-dung', name: 'Tuyển dụng' },
  { id: 'dich-vu', name: 'Dịch vụ' },
];

export interface ProductCopySet { headline: string; saleTag: string; cta: string; }

// CTA theo tông (dùng chung mọi ngành)
const TONE_CTA: Record<CopyTone, string[]> = {
  sale: ['CHỐT ĐƠN NGAY', 'SĂN LIỀN TAY', 'INBOX GIÁ TỐT', 'MUA KẺO HẾT', 'ĐẶT NGAY HÔM NAY'],
  pro: ['TÌM HIỂU NGAY', 'NHẬN TƯ VẤN', 'ĐẶT HÀNG NGAY', 'LIÊN HỆ NGAY', 'MUA CHÍNH HÃNG'],
  luxury: ['KHÁM PHÁ NGAY', 'SỞ HỮU NGAY', 'ĐẶT TRƯỚC', 'TRẢI NGHIỆM'],
  friendly: ['ĐẶT LIỀN NHA', 'GHÉ MUA THÔI', 'INBOX LIỀN', 'RƯỚC VỀ NGAY'],
};

// Sale tag mặc định theo tông (ngành có thể bổ sung tag riêng)
const TONE_SALETAG: Record<CopyTone, string[]> = {
  sale: ['GIẢM 50%', 'GIÁ SỐC', 'ĐỒNG GIÁ 99K', 'GIẢM 30%', 'FREESHIP'],
  pro: ['CHÍNH HÃNG', 'BẢO HÀNH 12TH', 'GIẢM 20%', 'TẶNG QUÀ'],
  luxury: ['PHIÊN BẢN GIỚI HẠN', 'QUÀ TẶNG CAO CẤP', 'ƯU ĐÃI RIÊNG', 'GIẢM 15%'],
  friendly: ['MUA 1 TẶNG 1', 'GIẢM 20% NÈ', 'FREESHIP NHA', 'QUÀ XINH'],
};

interface IndustryCopy { headline: Record<CopyTone, string[]>; saleTag?: string[]; usp?: string[]; }

const INDUSTRY: Record<string, IndustryCopy> = {
  chung: {
    headline: {
      sale: ['GIÁ SỐC HÔM NAY', 'SĂN DEAL CHỐT ĐƠN', 'XẢ KHO — GIÁ HỦY DIỆT', 'BÙNG NỔ ƯU ĐÃI', 'DEAL HOT CHÁY HÀNG', 'DUY NHẤT HÔM NAY', 'SALE LỚN NHẤT NĂM'],
      pro: ['CHẤT LƯỢNG TẠO KHÁC BIỆT', 'LỰA CHỌN THÔNG MINH', 'UY TÍN LÀM NÊN THƯƠNG HIỆU', 'SẢN PHẨM CHÍNH HÃNG', 'GIẢI PHÁP DÀNH CHO BẠN'],
      luxury: ['TINH HOA TRONG TỪNG CHI TIẾT', 'ĐẲNG CẤP KHÁC BIỆT', 'NGHỆ THUẬT CỦA SỰ TINH TẾ', 'VẺ ĐẸP VƯỢT THỜI GIAN'],
      friendly: ['HÀNG MỚI VỀ NÈ', 'XINH XỈU LUÔN Á', 'ƯU ĐÃI CHO NHÀ MÌNH', 'GHÉ LẤY LIỀN NHA'],
    },
  },
  'thoi-trang': {
    headline: {
      sale: ['XẢ TỦ CUỐI MÙA', 'SĂN SALE MẶC ĐẸP', 'GIÁ SỐC — MẶC CHẤT', 'DEAL QUẦN ÁO HOT', 'ĐỒNG GIÁ MẶC ĐẸP', 'SALE QUẦN ÁO CỰC MẠNH', 'GIÁ RẺ GIẬT MÌNH', 'XẢ HÀNG — DỌN TỦ', 'HOT TREND GIÁ SỐC', 'MẶC ĐẸP KHỎI LO GIÁ'],
      pro: ['CHẤT VẢI CAO CẤP', 'PHOM DÁNG CHUẨN ĐẸP', 'THỜI TRANG BỀN ĐẸP', 'MAY ĐO TỈ MỈ', 'CHUẨN FORM — CHUẨN GU', 'BỀN MÀU GIẶT KHÔNG PHAI', 'THIẾT KẾ TÔN DÁNG', 'CHẤT LIỆU THOÁNG MÁT'],
      luxury: ['PHONG CÁCH THƯỢNG LƯU', 'TINH TẾ TỪNG ĐƯỜNG KIM', 'ĐẲNG CẤP THỜI TRANG', 'KIẾN TẠO PHONG CÁCH', 'VÓC DÁNG THƯỢNG LƯU', 'TINH GIẢN MÀ SANG', 'DẤU ẤN RIÊNG CỦA BẠN', 'THANH LỊCH KHÔNG TUỔI'],
      friendly: ['MẶC XINH MỖI NGÀY', 'ĐỒ ĐẸP GIÁ XINH', 'TỦ ĐỒ CỦA NÀNG', 'DIỆN LÀ CUỐN', 'OUTFIT XINH ƠI LÀ XINH', 'MẶC VÀO LÀ MÊ', 'LÊN ĐỒ ĐI CHƠI THÔI', 'GU AI CŨNG KHEN'],
    },
    saleTag: ['ĐỒNG GIÁ 99K', 'MUA 2 GIẢM 30%', 'FREESHIP ĐƠN 2 MÓN', 'SALE 70%', 'MUA 3 TÍNH 2', 'GIẢM THÊM 10% ĐƠN ĐẦU'],
    usp: ['Vải mềm mát', 'Phom chuẩn tôn dáng', 'Đổi size 7 ngày', 'Nhiều màu nhiều size', 'Freeship đơn 2 món'],
  },
  'my-pham': {
    headline: {
      sale: ['DEAL LÀM ĐẸP HOT', 'GIÁ SỐC CHĂM DA', 'SALE MỸ PHẨM CHÍNH HÃNG', 'SĂN DEAL XINH ĐẸP', 'DEAL SKINCARE HOT', 'GIÁ HỜI CHO DA', 'SALE CHÍNH HÃNG CHÁY HÀNG', 'MUA LÀ ĐẸP'],
      pro: ['CHÍNH HÃNG — AN TOÀN DA', 'DƯỠNG DA CHUẨN KHOA HỌC', 'CHUYÊN GIA KHUYÊN DÙNG', 'LÀNH TÍNH CHO MỌI DA', 'BÁC SĨ DA LIỄU KHUYÊN DÙNG', 'KIỂM NGHIỆM DA LIỄU', 'THÀNH PHẦN LÀNH TÍNH', 'HIỆU QUẢ RÕ SAU 7 NGÀY'],
      luxury: ['BÍ QUYẾT LÀN DA HOÀN HẢO', 'VẺ ĐẸP RẠNG RỠ', 'TINH CHẤT THƯỢNG HẠNG', 'NÂNG NIU LÀN DA', 'LIỆU PHÁP DƯỠNG DA CAO CẤP', 'TRẺ HOÁ LÀN DA', 'CHẠM ĐẾN VẺ ĐẸP HOÀN MỸ', 'TINH TUÝ TỪ THIÊN NHIÊN'],
      friendly: ['DA ĐẸP KHÔNG LO', 'CHĂM DA MỖI NGÀY NHA', 'XINH TỪ TRONG RA NGOÀI', 'DA MỊN MÀNG NÈ', 'DA ĐẸP MỖI NGÀY NÈ', 'GLOW LÊN NÀO', 'CHĂM DA DỄ ỢT', 'XINH TƯƠI RẠNG RỠ'],
    },
    saleTag: ['TẶNG MINISIZE', 'MUA 1 TẶNG 1', 'GIẢM 40%', 'MUA 2 TẶNG 1', 'TẶNG COMBO MẪU THỬ', 'GIẢM 50% SẢN PHẨM THỨ 2'],
    usp: ['Chính hãng 100%', 'Lành tính', 'Cam kết auth', 'Kiểm nghiệm da liễu', 'Không cồn, không paraben', 'Phù hợp da nhạy cảm'],
  },
  'do-an': {
    headline: {
      sale: ['NGON — RẺ — NO CĂNG', 'DEAL ĂN VẶT HOT', 'GIÁ SỐC NO NÊ', 'COMBO GIÁ HỜI'],
      pro: ['NGUYÊN LIỆU TƯƠI SẠCH', 'CHUẨN VỊ — AN TOÀN', 'ĐẠT CHUẨN VỆ SINH', 'CHẾ BIẾN MỖI NGÀY'],
      luxury: ['TINH HOA ẨM THỰC', 'HƯƠNG VỊ THƯỢNG HẠNG', 'TRẢI NGHIỆM VỊ GIÁC', 'NGHỆ THUẬT ẨM THỰC'],
      friendly: ['NGON KHÓ CƯỠNG', 'ĂN LÀ MÊ', 'GHÉ LẤY LIỀN NHA', 'MÓN TỦ CỦA QUÁN'],
    },
    saleTag: ['MUA 1 TẶNG 1', 'COMBO NO NÊ', 'FREESHIP 2KM'],
    usp: ['Tươi mỗi ngày', 'Sạch & an toàn', 'Giao nóng hổi'],
  },
  'phu-kien': {
    headline: {
      sale: ['SĂN PHỤ KIỆN HOT', 'GIÁ SỐC — SANG LIỀN', 'DEAL CHẤT GIÁ HỜI', 'XẢ KHO PHỤ KIỆN'],
      pro: ['CHẤT LIỆU BỀN ĐẸP', 'TINH XẢO SẮC NÉT', 'BẢO HÀNH DÀI LÂU', 'HOÀN THIỆN TỈ MỈ'],
      luxury: ['ĐIỂM NHẤN ĐẲNG CẤP', 'TINH TẾ KHÓ RỜI MẮT', 'SANG TRỌNG TỪNG CHI TIẾT', 'KHẲNG ĐỊNH PHONG CÁCH'],
      friendly: ['XINH XỈU PHỤ KIỆN', 'ĐEO LÀ CUỐN', 'RƯỚC EM NÓ VỀ', 'NHỎ MÀ CÓ VÕ'],
    },
    saleTag: ['TẶNG HỘP QUÀ', 'MUA 2 GIẢM 25%', 'BẢO HÀNH 12TH'],
    usp: ['Không đen da', 'Sắc nét', 'Bảo hành dài'],
  },
  'dien-tu': {
    headline: {
      sale: ['DEAL CÔNG NGHỆ HOT', 'GIÁ SỐC CHÍNH HÃNG', 'XẢ KHO GIÁ HỦY', 'SĂN SALE CÔNG NGHỆ'],
      pro: ['CHÍNH HÃNG — BẢO HÀNH', 'BỀN BỈ VƯỢT TRỘI', 'CÔNG NGHỆ ĐÁNG TIỀN', 'HIỆU NĂNG MẠNH MẼ'],
      luxury: ['CÔNG NGHỆ ĐẲNG CẤP', 'TINH GỌN HOÀN HẢO', 'TRẢI NGHIỆM VƯỢT TRỘI', 'KIỆT TÁC CÔNG NGHỆ'],
      friendly: ['TIỆN ƠI LÀ TIỆN', 'DÙNG LÀ MÊ', 'SẮM LIỀN TAY NHA', 'NHÀ NÀO CŨNG CẦN'],
    },
    saleTag: ['TRẢ GÓP 0%', 'BẢO HÀNH 12TH', 'GIẢM 25%'],
    usp: ['Chính hãng', 'Bảo hành 12 tháng', '1 đổi 1'],
  },
  'me-be': {
    headline: {
      sale: ['SĂN ĐỒ CHO BÉ', 'GIÁ SỐC CHO MẸ', 'DEAL MẸ BỈM MÊ', 'XẢ KHO ĐỒ BÉ'],
      pro: ['AN TOÀN CHO BÉ YÊU', 'CHUẨN DA BÉ NHẠY CẢM', 'CHÍNH HÃNG — YÊN TÂM', 'KIỂM ĐỊNH NGHIÊM NGẶT'],
      luxury: ['CHĂM BÉ CHUẨN TINH TẾ', 'DÀNH ĐIỀU TỐT NHẤT', 'MỀM MẠI CAO CẤP', 'NÂNG NIU BÉ YÊU'],
      friendly: ['CHO BÉ CƯNG NHÀ MÌNH', 'XINH YÊU CHO BÉ', 'MẸ SẮM BÉ MÊ', 'BÉ KHOẺ MẸ VUI'],
    },
    saleTag: ['MUA 1 TẶNG 1', 'QUÀ CHO BÉ', 'GIẢM 30%'],
    usp: ['An toàn cho bé', 'Mềm mại', 'Không kích ứng'],
  },
  'noi-that': {
    headline: {
      sale: ['SĂN ĐỒ TRANG TRÍ', 'GIÁ SỐC CHO TỔ ẤM', 'DEAL NHÀ XINH', 'XẢ KHO NỘI THẤT'],
      pro: ['CHẤT LIỆU BỀN ĐẸP', 'THIẾT KẾ TINH GỌN', 'BỀN BỈ THEO NĂM THÁNG', 'HOÀN THIỆN CHẮC CHẮN'],
      luxury: ['KHÔNG GIAN ĐẲNG CẤP', 'TINH TẾ CHO TỔ ẤM', 'VẺ ĐẸP VƯỢT THỜI GIAN', 'NÂNG TẦM TỔ ẤM'],
      friendly: ['NHÀ XINH DỄ THƯƠNG', 'TRANG TRÍ CHO NHÀ', 'RƯỚC VỀ CHO ẤM NHÀ', 'NHÀ ĐẸP NHỜ TAY MÌNH'],
    },
    saleTag: ['FREESHIP CỒNG KỀNH', 'MUA 2 GIẢM 20%', 'GIẢM 30%'],
    usp: ['Bền đẹp', 'Dễ lắp đặt', 'Chất liệu cao cấp'],
  },
  'spa': {
    headline: {
      sale: ['DEAL LÀM ĐẸP HOT', 'ƯU ĐÃI LIỆU TRÌNH', 'GIÁ SỐC CHĂM DA', 'SĂN DEAL XINH'],
      pro: ['LIỆU TRÌNH CHUẨN Y KHOA', 'CHUYÊN VIÊN TAY NGHỀ CAO', 'CÔNG NGHỆ ĐỘC QUYỀN', 'CAM KẾT HIỆU QUẢ'],
      luxury: ['TẬN HƯỞNG THƯ GIÃN', 'NÂNG NIU TỪNG GIÁC QUAN', 'VẺ ĐẸP ĐƯỢC CHĂM CHUỐT', 'ĐẲNG CẤP SPA 5 SAO'],
      friendly: ['ĐẸP LÊN MỖI NGÀY NHA', 'THƯ GIÃN XẢ STRESS', 'DA ĐẸP DÁNG XINH', 'GHÉ SPA LIỀN NHA'],
    },
    saleTag: ['BUỔI ĐẦU CHỈ 199K', 'TẶNG 1 LIỆU TRÌNH', 'GIẢM 40%', 'COMBO ƯU ĐÃI'],
    usp: ['Chuyên viên tay nghề cao', 'Thiết bị hiện đại', 'Không gian riêng tư'],
  },
  'nha-hang': {
    headline: {
      sale: ['DEAL ĂN NGON GIÁ HỜI', 'COMBO NO NÊ', 'ƯU ĐÃI CUỐI TUẦN', 'ĐỒNG GIÁ MÓN NGON'],
      pro: ['NGUYÊN LIỆU TƯƠI MỖI NGÀY', 'ĐẦU BẾP TAY NGHỀ', 'CHUẨN VỊ — AN TOÀN', 'KHÔNG GIAN SẠCH ĐẸP'],
      luxury: ['TINH HOA ẨM THỰC', 'TRẢI NGHIỆM VỊ GIÁC', 'KHÔNG GIAN SANG TRỌNG', 'HƯƠNG VỊ THƯỢNG HẠNG'],
      friendly: ['NGON NHỚ ĐỜI', 'ĂN LÀ GHIỀN', 'GHÉ QUÁN THÔI NÀO', 'MÓN TỦ CỦA QUÁN'],
    },
    saleTag: ['COMBO 2 NGƯỜI', 'TẶNG MÓN KHAI VỊ', 'GIẢM 20% HÓA ĐƠN', 'FREE ĐỒ UỐNG'],
    usp: ['Tươi mỗi ngày', 'Không gian đẹp', 'Phục vụ tận tình'],
  },
  'tuyen-dung': {
    headline: {
      sale: ['TUYỂN GẤP — NHẬN NGAY', 'LƯƠNG HẤP DẪN — VÀO LÀM LIỀN', 'CƠ HỘI VIỆC LÀM HOT', 'ỨNG TUYỂN NGAY HÔM NAY', 'THƯỞNG NÓNG KHI NHẬN VIỆC'],
      pro: ['GIA NHẬP ĐỘI NGŨ CHÚNG TÔI', 'CƠ HỘI PHÁT TRIỂN SỰ NGHIỆP', 'MÔI TRƯỜNG CHUYÊN NGHIỆP', 'CHÚNG TÔI ĐANG TUYỂN DỤNG', 'LỘ TRÌNH THĂNG TIẾN RÕ RÀNG'],
      luxury: ['TÌM KIẾM NHÂN TÀI', 'KIẾN TẠO TƯƠNG LAI CÙNG NHAU', 'NƠI TÀI NĂNG TỎA SÁNG', 'ĐỒNG HÀNH CÙNG NGƯỜI GIỎI'],
      friendly: ['VỀ ĐỘI MÌNH NHÉ', 'TEAM ĐANG CHỜ BẠN NÈ', 'LÀM VUI — LƯƠNG ỔN', 'CÙNG LÀM CÙNG LỚN NHA'],
    },
  },
  'giao-duc': {
    headline: {
      sale: ['GIẢM HỌC PHÍ ĐẾN 50%', 'ĐĂNG KÝ SỚM — GIÁ ƯU ĐÃI', 'HỌC THỬ MIỄN PHÍ', 'KHAI GIẢNG — SLOT CÓ HẠN', 'TẶNG KHÓA HỌC KÈM THEO'],
      pro: ['CAM KẾT ĐẦU RA', 'LỘ TRÌNH HỌC CÁ NHÂN HÓA', 'GIÁO VIÊN GIÀU KINH NGHIỆM', 'HỌC THẬT — GIỎI THẬT', 'KHAI GIẢNG KHÓA MỚI'],
      luxury: ['ĐẦU TƯ CHO TƯƠNG LAI', 'CHUẨN QUỐC TẾ', 'NÂNG TẦM TRI THỨC', 'HỌC CÙNG CHUYÊN GIA'],
      friendly: ['HỌC MÀ VUI NHƯ CHƠI', 'TIẾN BỘ MỖI NGÀY', 'CÙNG HỌC NHA BẠN ƠI', 'LỚP XINH — HỌC DỄ'],
    },
  },
  'su-kien': {
    headline: {
      sale: ['VÉ EARLY BIRD GIẢM SỐC', 'SỐ VÉ CÓ HẠN', 'ĐĂNG KÝ NGAY KẺO LỠ', 'MIỄN PHÍ VÉ VÀO CỬA', 'SỰ KIỆN HOT NHẤT THÁNG'],
      pro: ['SỰ KIỆN SẮP DIỄN RA', 'TRÂN TRỌNG KÍNH MỜI', 'HỘI THẢO CHUYÊN ĐỀ', 'KẾT NỐI — CHIA SẺ — LAN TỎA', 'ĐỪNG BỎ LỠ SỰ KIỆN'],
      luxury: ['ĐÊM TIỆC ĐẲNG CẤP', 'SỰ KIỆN ĐỘC QUYỀN', 'GALA THƯỢNG LƯU', 'KHOẢNH KHẮC ĐÁNG NHỚ'],
      friendly: ['QUẨY HẾT MÌNH NÀO', 'HẸN GẶP NHAU NHA', 'RỦ BẠN ĐI CHUNG NÈ', 'VUI HẾT NẤC LUÔN'],
    },
  },
  'du-lich': {
    headline: {
      sale: ['TOUR GIÁ SỐC HÈ NÀY', 'SĂN TOUR GIÁ HỜI', 'GIẢM ĐẾN 30% TOUR HOT', 'ĐI LIỀN KẺO LỠ', 'COMBO VÉ + KHÁCH SẠN'],
      pro: ['HÀNH TRÌNH TRỌN GÓI', 'LỊCH TRÌNH CHUẨN — DỊCH VỤ TẬN TÂM', 'KHÁM PHÁ VIỆT NAM', 'ĐẶT TOUR UY TÍN', 'TOUR KHỞI HÀNH HẰNG TUẦN'],
      luxury: ['NGHỈ DƯỠNG ĐẲNG CẤP', 'HÀNH TRÌNH THƯỢNG LƯU', 'KỲ NGHỈ TRONG MƠ', 'RESORT 5 SAO TRỌN GÓI'],
      friendly: ['XÁCH BALO LÊN VÀ ĐI', 'ĐI ĐÂU CŨNG ĐƯỢC NÈ', 'TRỐN PHỐ CUỐI TUẦN', 'CHILL HẾT CỠ'],
    },
  },
  'the-hinh': {
    headline: {
      sale: ['TẬP THỬ MIỄN PHÍ', 'GIẢM 50% THẺ TẬP', 'ĐĂNG KÝ 1 TẶNG 1', 'ƯU ĐÃI HỘI VIÊN MỚI', 'GIÁ SỐC THẺ NĂM'],
      pro: ['HLV CÁ NHÂN 1 KÈM 1', 'LỘ TRÌNH GIẢM CÂN KHOA HỌC', 'THIẾT BỊ HIỆN ĐẠI', 'CAM KẾT KẾT QUẢ', 'KHỎE ĐẸP BỀN VỮNG'],
      luxury: ['PHÒNG TẬP CAO CẤP', 'NÂNG TẦM VÓC DÁNG', 'ĐẲNG CẤP SỨC KHỎE', 'TRẢI NGHIỆM PREMIUM'],
      friendly: ['ĐI TẬP CÙNG NHAU NHA', 'ĐỐT MỠ VUI VẺ', 'KHỎE MỖI NGÀY', 'DÁNG XINH KHÔNG KHÓ'],
    },
  },
  'dich-vu': {
    headline: {
      sale: ['ƯU ĐÃI KHÁCH MỚI', 'GIẢM 20% LẦN ĐẦU', 'MIỄN PHÍ KHẢO SÁT', 'DEAL DỊCH VỤ HOT', 'ĐẶT LỊCH NHẬN QUÀ'],
      pro: ['DỊCH VỤ CHUYÊN NGHIỆP', 'NHANH CHÓNG — UY TÍN', 'TẬN TÂM TỪNG KHÁCH HÀNG', 'BẢO HÀNH DÀI HẠN', 'ĐỘI NGŨ GIÀU KINH NGHIỆM'],
      luxury: ['DỊCH VỤ ĐẲNG CẤP', 'TRẢI NGHIỆM KHÁC BIỆT', 'CHUẨN 5 SAO', 'TINH TẾ TỪNG CHI TIẾT'],
      friendly: ['CỨ ĐỂ TỤI MÌNH LO', 'GỌI LÀ CÓ MẶT', 'NHANH GỌN LẸ NHA', 'PHỤC VỤ TẬN NƠI'],
    },
  },
};

// Slogan / subline theo tông (dùng cho bìa + poster)
const TONE_SLOGAN: Record<CopyTone, string[]> = {
  sale: ['Số lượng có hạn — nhanh tay!', 'Ưu đãi chỉ trong hôm nay', 'Giá tốt nhất thị trường', 'Cơ hội không thể bỏ lỡ'],
  pro: ['Cam kết chất lượng — uy tín hàng đầu', 'Được hàng ngàn khách tin chọn', 'Chính hãng, bảo hành dài lâu', 'Giải pháp tối ưu cho bạn'],
  luxury: ['Dành cho người sành điệu', 'Tinh tế trong từng khoảnh khắc', 'Nâng tầm phong cách sống', 'Đẳng cấp không cần phô trương'],
  friendly: ['Chất lượng mà giá vẫn xinh', 'Được lòng cả nhà mình', 'Thử là ghiền luôn nha', 'Giao tận tay, nhanh gọn lẹ'],
};

const MENU_TITLES = ['THỰC ĐƠN', 'MENU', 'BẢNG GIÁ', 'MENU HÔM NAY', 'GIÁ ƯU ĐÃI', 'THỰC ĐƠN ĐẶC BIỆT'];
const GENERIC_USPS = ['Chính hãng 100%', 'Giao nhanh toàn quốc', 'Đổi trả 7 ngày'];

function pickFrom(arr: string[], i: number): string { return arr.length ? arr[((i % arr.length) + arr.length) % arr.length] : ''; }

// Lấy 1 bộ copy banner theo NGÀNH × TÔNG × chỉ số (bấm nhiều lần ra biến thể khác)
export function suggestBannerCopy(industry: string, tone: CopyTone, i: number): ProductCopySet {
  const ind = INDUSTRY[industry] || INDUSTRY.chung;
  const headlines = ind.headline[tone] || INDUSTRY.chung.headline[tone];
  const saleTags = [...(ind.saleTag || []), ...TONE_SALETAG[tone]];
  const ctas = TONE_CTA[tone];
  return { headline: pickFrom(headlines, i), saleTag: pickFrom(saleTags, i + 1), cta: pickFrom(ctas, i + 2) };
}

// USP gợi ý theo ngành (fallback sang generic)
export function industryUsps(industry: string): string[] {
  const u = INDUSTRY[industry]?.usp;
  return u && u.length ? u : GENERIC_USPS;
}

// ----- Bìa / Brand asset -----
export interface CoverCopySet { badge: string; slogan: string; cta: string; usps: string[]; }
export function suggestCoverCopy(industry: string, tone: CopyTone, i: number): CoverCopySet {
  const ind = INDUSTRY[industry] || INDUSTRY.chung;
  const badges = [...(ind.saleTag || []), ...TONE_SALETAG[tone]];
  return {
    badge: pickFrom(badges, i),
    slogan: pickFrom(TONE_SLOGAN[tone], i + 1),
    cta: pickFrom(TONE_CTA[tone], i + 2),
    usps: industryUsps(industry),
  };
}

// ----- Poster -----
export interface PosterCopySet { headline: string; subline: string; cta: string; }
export function suggestPosterCopy(industry: string, tone: CopyTone, i: number): PosterCopySet {
  const ind = INDUSTRY[industry] || INDUSTRY.chung;
  const headlines = ind.headline[tone] || INDUSTRY.chung.headline[tone];
  return {
    headline: pickFrom(headlines, i),
    subline: pickFrom(TONE_SLOGAN[tone], i + 1),
    cta: pickFrom(TONE_CTA[tone], i + 2),
  };
}

// ----- Menu / Bảng giá -----
export function suggestMenuTitle(i: number): string { return pickFrom(MENU_TITLES, i); }
