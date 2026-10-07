import { MarketingState } from '@/types';

// Data mẫu sẵn cho từng ngành: bấm ngành là có đủ nội dung + poster, không cần gõ gì.
// Mỗi mẫu đủ cả 3 copies (launch/story/action) để canvas render ngay.
export type CategorySample = {
  name: string;
  brand: string;
  offer: string;
  details: string;
  goal: string;
  copies: MarketingState['copies'];
};

export const CATEGORY_SAMPLES: Record<string, CategorySample> = {
  recruitment: {
    name: 'Lead Fullstack Developer',
    brand: 'Mivy Tech',
    offer: 'Lương 25 - 35 triệu',
    goal: 'recruitment',
    details:
      '5+ năm kinh nghiệm kiến trúc hệ thống lớn\nLương 25 - 35 triệu + Thưởng dự án KPI\nLàm việc TP.HCM · Hybrid\nThành thạo ReactJS, Node.js, Python, PostgreSQL\nEmail: tuyendung@mivy.vn',
    copies: {
      launch: { headline: 'Lead Fullstack Developer', subline: 'Gia nhập đội ngũ sản phẩm công nghệ cao', cta: 'Gửi CV ngay', caption: '🚀 MIVY TECH TUYỂN LEAD FULLSTACK DEVELOPER\n\n📌 Đãi ngộ: 25 - 35 triệu + thưởng KPI\n📌 Địa điểm: TP.HCM · Hybrid\n\nỨng tuyển: tuyendung@mivy.vn' },
      story: { headline: 'Yêu Cầu Chuyên Môn', subline: 'Tiêu chuẩn cho core member', cta: 'Tìm hiểu thêm', caption: '🎯 TIÊU CHÍ ỨNG VIÊN\n\n- 5+ năm kinh nghiệm production\n- Làm chủ ReactJS, Node, Python\n- Tư duy kiến trúc & dẫn dắt team', points: ['5+ năm kinh nghiệm hệ thống high-traffic', 'Thành thạo ReactJS, TypeScript, Node/Python', 'Tư duy Clean Code và tối ưu hiệu năng'] },
      action: { headline: 'Quy Trình Ứng Tuyển', subline: '3 bước kết nối và nhận offer', cta: 'Gửi CV hôm nay', caption: '📬 KẾT NỐI CÙNG MIVY TECH\n\n- Vòng 1: Gửi CV & Portfolio\n- Vòng 2: Phỏng vấn kỹ thuật\n- Vòng 3: Nhận offer & onboard', points: ['Vòng 1: Gửi CV & Portfolio', 'Vòng 2: Trao đổi cùng Tech Lead', 'Vòng 3: Thống nhất đãi ngộ & onboard'] },
    },
  },
  education: {
    name: 'Khóa Tiếng Anh Giao Tiếp 3 Tháng',
    brand: 'EnglishHub',
    offer: 'Ưu đãi 30% học phí trước 30/10',
    goal: 'education',
    details:
      'Dành cho người mất gốc muốn tự tin giao tiếp\nLộ trình 36 buổi, sĩ số tối đa 12 học viên\nGiáo viên bản ngữ và trợ giảng Việt\nThực hành phản xạ theo chủ đề thực tế\nHọc tối 2-4-6 hoặc 3-5-7',
    copies: {
      launch: { headline: 'Tiếng Anh Giao Tiếp 3 Tháng', subline: 'Tự tin nói chuyện từ con số 0', cta: 'Đăng ký ngay', caption: '🎓 KHÓA GIAO TIẾP CẤP TỐC\n\n📌 36 buổi · lớp tối đa 12 học viên\n📌 Ưu đãi 30% học phí trước 30/10\n\nĐăng ký để nhận tư vấn lộ trình!' },
      story: { headline: 'Học Được Gì Sau Khóa', subline: 'Lộ trình rõ ràng theo chủ đề', cta: 'Xem chi tiết', caption: '🎯 NỘI DUNG KHÓA HỌC\n\n- Phản xạ giao tiếp hằng ngày\n- Phát âm chuẩn cùng giáo viên bản ngữ\n- Thực hành theo chủ đề thực tế', points: ['Phản xạ giao tiếp theo tình huống thật', 'Phát âm chuẩn với giáo viên bản ngữ', 'Lớp nhỏ tối đa 12 học viên'] },
      action: { headline: 'Đăng Ký Khóa Học', subline: 'Giữ chỗ lớp sắp khai giảng', cta: 'Nhận tư vấn', caption: '📬 GIỮ CHỖ KHÓA SẮP MỞ\n\n- Lịch học linh hoạt 2-4-6 / 3-5-7\n- Ưu đãi 30% trước 30/10\n- Nhắn tin để được xếp lớp phù hợp', points: ['Lịch học 2-4-6 hoặc 3-5-7', 'Ưu đãi 30% học phí trước 30/10', 'Tư vấn xếp lớp theo trình độ'] },
    },
  },
  event: {
    name: 'Đêm Nhạc Acoustic "Thu Và Em"',
    brand: 'Moonlight Cafe',
    offer: 'Vé 150k đã gồm 1 nước',
    goal: 'event',
    details:
      'Chương trình nhạc acoustic ấm cúng cuối tuần\nThời gian: 19h30 thứ Bảy 25/10\nĐịa điểm: The Moonlight Cafe, Quận 3\nGóp mặt 3 ca sĩ khách mời\nSố chỗ giới hạn 80 khách',
    copies: {
      launch: { headline: 'Đêm Acoustic Thu Và Em', subline: 'Một tối cuối tuần thật chill', cta: 'Đặt chỗ ngay', caption: '🎶 ĐÊM NHẠC ACOUSTIC "THU VÀ EM"\n\n📌 19h30 thứ Bảy 25/10\n📌 The Moonlight Cafe, Quận 3\n\nVé 150k đã gồm 1 nước · chỗ có hạn!' },
      story: { headline: 'Có Gì Trong Đêm Nhạc', subline: 'Âm nhạc, không gian và kết nối', cta: 'Xem thêm', caption: '🎯 ĐIỂM NHẤN ĐÊM NHẠC\n\n- 3 ca sĩ khách mời\n- Không gian ấm cúng 80 chỗ\n- Acoustic mộc mạc gần gũi', points: ['3 ca sĩ khách mời', 'Không gian ấm cúng chỉ 80 chỗ', 'Acoustic mộc mạc, gần gũi'] },
      action: { headline: 'Giữ Chỗ Tối Nay', subline: 'Đặt bàn trước để có chỗ đẹp', cta: 'Nhắn tin đặt chỗ', caption: '📬 ĐẶT CHỖ ĐÊM NHẠC\n\n- Vé 150k gồm 1 nước\n- Số chỗ giới hạn 80 khách\n- Nhắn tin để giữ bàn', points: ['Vé 150k đã gồm 1 nước', 'Chỗ giới hạn 80 khách', 'Nhắn tin giữ bàn trước'] },
    },
  },
  food: {
    name: 'Bún Bò Huế O Xuân',
    brand: 'O Xuân',
    offer: 'Khai trương giảm 20% tuần đầu',
    goal: 'food',
    details:
      'Hương vị Huế chuẩn gốc, nước dùng ninh 8 tiếng\nTopping đầy đủ: giò, chả, bò, huyết\nKhông gian sạch sẽ, phục vụ nhanh\nMở cửa 6h–21h hàng ngày\nĐịa chỉ: 45 Nguyễn Trãi, Quận 1',
    copies: {
      launch: { headline: 'Bún Bò Huế O Xuân', subline: 'Chuẩn vị Huế giữa lòng Sài Gòn', cta: 'Ghé ngay', caption: '🍜 BÚN BÒ HUẾ O XUÂN KHAI TRƯƠNG\n\n📌 Nước dùng ninh 8 tiếng\n📌 Khai trương giảm 20% tuần đầu\n\n45 Nguyễn Trãi, Quận 1 · 6h–21h' },
      story: { headline: 'Vì Sao Nên Thử', subline: 'Hương vị làm nên tên tuổi', cta: 'Xem thực đơn', caption: '🎯 ĐIỂM NHẤN\n\n- Nước dùng ninh 8 tiếng\n- Topping đầy đủ giò, chả, bò, huyết\n- Không gian sạch, phục vụ nhanh', points: ['Nước dùng ninh 8 tiếng đậm vị', 'Topping đầy đủ giò, chả, bò, huyết', 'Không gian sạch, phục vụ nhanh'] },
      action: { headline: 'Ghé O Xuân Hôm Nay', subline: 'Ưu đãi khai trương có hạn', cta: 'Đặt món / Ghé quán', caption: '📬 GHÉ O XUÂN\n\n- Giảm 20% tuần khai trương\n- Có giao hàng qua app\n- 45 Nguyễn Trãi, Quận 1', points: ['Giảm 20% tuần khai trương', 'Có giao hàng qua app', '45 Nguyễn Trãi, Quận 1'] },
    },
  },
  beauty: {
    name: 'Liệu Trình Chăm Da Sáng Mịn',
    brand: 'Lavender Spa',
    offer: 'Trải nghiệm buổi đầu chỉ 199k',
    goal: 'beauty',
    details:
      'Phù hợp da xỉn màu, lỗ chân lông to\nQuy trình 7 bước với sản phẩm chính hãng\nChuyên viên tư vấn theo từng loại da\nKhông gian thư giãn riêng tư\nLiệu trình 60 phút',
    copies: {
      launch: { headline: 'Chăm Da Sáng Mịn', subline: 'Làn da rạng rỡ sau 60 phút', cta: 'Đặt lịch ngay', caption: '✨ LIỆU TRÌNH CHĂM DA SÁNG MỊN\n\n📌 Quy trình 7 bước chính hãng\n📌 Trải nghiệm buổi đầu chỉ 199k\n\nĐặt lịch để được ưu tiên!' },
      story: { headline: 'Liệu Trình Gồm Gì', subline: 'Chuẩn spa, chuẩn từng loại da', cta: 'Xem chi tiết', caption: '🎯 ĐIỂM NHẤN LIỆU TRÌNH\n\n- 7 bước với sản phẩm chính hãng\n- Tư vấn theo từng loại da\n- Không gian thư giãn riêng tư', points: ['Quy trình 7 bước chính hãng', 'Tư vấn theo từng loại da', 'Không gian thư giãn riêng tư'] },
      action: { headline: 'Đặt Lịch Hôm Nay', subline: 'Ưu đãi buổi đầu có hạn', cta: 'Nhắn tin đặt lịch', caption: '📬 ĐẶT LỊCH TRẢI NGHIỆM\n\n- Buổi đầu chỉ 199k\n- Liệu trình 60 phút\n- Nhắn tin để được ưu tiên', points: ['Buổi đầu chỉ 199k', 'Liệu trình 60 phút', 'Nhắn tin để được ưu tiên'] },
    },
  },
  property: {
    name: 'Căn Hộ The Sun Riverside',
    brand: 'The Sun Riverside',
    offer: 'Chiết khấu 5% cho 20 khách đầu',
    goal: 'property',
    details:
      'Căn 2 phòng ngủ, 68m², view sông\nBàn giao full nội thất cao cấp\nTiện ích hồ bơi, gym, công viên nội khu\nGần trung tâm Quận 7, kết nối nhanh\nHỗ trợ vay 70%, ân hạn gốc 24 tháng',
    copies: {
      launch: { headline: 'Căn Hộ The Sun Riverside', subline: 'Sống chuẩn view sông Quận 7', cta: 'Nhận bảng giá', caption: '🏙️ THE SUN RIVERSIDE\n\n📌 2PN · 68m² · view sông\n📌 Chiết khấu 5% cho 20 khách đầu\n\nĐể lại thông tin nhận bảng giá!' },
      story: { headline: 'Vì Sao Chọn Dự Án', subline: 'Vị trí, tiện ích và chính sách', cta: 'Xem chi tiết', caption: '🎯 ĐIỂM NHẤN DỰ ÁN\n\n- Full nội thất cao cấp\n- Hồ bơi, gym, công viên nội khu\n- Gần trung tâm Quận 7', points: ['Bàn giao full nội thất cao cấp', 'Tiện ích hồ bơi, gym, công viên', 'Gần trung tâm Quận 7'] },
      action: { headline: 'Đặt Chỗ Giữ Suất', subline: 'Chính sách vay linh hoạt', cta: 'Liên hệ tư vấn', caption: '📬 ĐĂNG KÝ XEM NHÀ MẪU\n\n- Hỗ trợ vay 70%\n- Ân hạn gốc 24 tháng\n- Chiết khấu 5% cho 20 khách đầu', points: ['Hỗ trợ vay 70% giá trị', 'Ân hạn gốc 24 tháng', 'Chiết khấu 5% cho 20 khách đầu'] },
    },
  },
  travel: {
    name: 'Tour Đà Nẵng – Hội An 3N2Đ',
    brand: 'VietTravel',
    offer: '3.990.000đ/khách · trẻ em giảm 50%',
    goal: 'travel',
    details:
      'Khám phá Bà Nà Hills, Cầu Vàng, phố cổ Hội An\nKhách sạn 4 sao gần biển Mỹ Khê\nXe đời mới, hướng dẫn viên nhiệt tình\nĂn uống theo chương trình, 6 bữa chính\nKhởi hành thứ Sáu hàng tuần',
    copies: {
      launch: { headline: 'Đà Nẵng – Hội An 3N2Đ', subline: 'Biển xanh, phố cổ, Cầu Vàng', cta: 'Đặt tour ngay', caption: '🌴 TOUR ĐÀ NẴNG – HỘI AN 3N2Đ\n\n📌 KS 4 sao gần biển Mỹ Khê\n📌 Chỉ 3.990.000đ/khách\n\nKhởi hành thứ Sáu hàng tuần!' },
      story: { headline: 'Lịch Trình Có Gì', subline: 'Trọn gói, không lo phát sinh', cta: 'Xem lịch trình', caption: '🎯 ĐIỂM NHẤN TOUR\n\n- Bà Nà Hills & Cầu Vàng\n- Phố cổ Hội An về đêm\n- KS 4 sao, 6 bữa chính', points: ['Bà Nà Hills & Cầu Vàng', 'Phố cổ Hội An về đêm', 'KS 4 sao gần biển, 6 bữa chính'] },
      action: { headline: 'Giữ Chỗ Đoàn Gần Nhất', subline: 'Số lượng mỗi đoàn có hạn', cta: 'Nhắn tin đặt tour', caption: '📬 ĐẶT TOUR HÔM NAY\n\n- 3.990.000đ/khách, trẻ em giảm 50%\n- 25 khách/đoàn\n- Nhắn tin để giữ chỗ', points: ['3.990.000đ/khách, trẻ em giảm 50%', 'Mỗi đoàn 25 khách', 'Nhắn tin giữ chỗ sớm'] },
    },
  },
  retail: {
    name: 'Giày Chạy Bộ AirStep Pro',
    brand: 'AirStep',
    offer: 'Giảm 25% + freeship toàn quốc',
    goal: 'retail',
    details:
      'Đế êm, hoàn trả năng lượng tốt khi chạy\nTrọng lượng nhẹ chỉ 240g\nThân giày thoáng khí, co giãn\nChống trơn trượt, bền với đường trường\nĐủ size 38–44, nhiều màu',
    copies: {
      launch: { headline: 'Giày Chạy Bộ AirStep Pro', subline: 'Nhẹ, êm, bứt tốc mọi cung đường', cta: 'Mua ngay', caption: '👟 AIRSTEP PRO\n\n📌 Nhẹ chỉ 240g, đế êm\n📌 Giảm 25% + freeship toàn quốc\n\nĐủ size 38–44, nhiều màu!' },
      story: { headline: 'Vì Sao Nên Chọn', subline: 'Thiết kế cho người chạy thật', cta: 'Xem chi tiết', caption: '🎯 ĐIỂM NỔI BẬT\n\n- Nhẹ 240g, đế hoàn trả năng lượng\n- Thoáng khí, co giãn\n- Chống trơn trượt bền bỉ', points: ['Nhẹ 240g, đế hoàn trả năng lượng', 'Thân giày thoáng khí, co giãn', 'Chống trơn trượt, bền đường trường'] },
      action: { headline: 'Chốt Đơn Hôm Nay', subline: 'Ưu đãi có hạn trong tuần', cta: 'Đặt hàng ngay', caption: '📬 ĐẶT HÀNG AIRSTEP PRO\n\n- Giảm 25% + freeship\n- Bảo hành keo đế 6 tháng\n- Nhắn tin để chốt size', points: ['Giảm 25% + freeship toàn quốc', 'Bảo hành keo đế 6 tháng', 'Nhắn tin chốt size nhanh'] },
    },
  },
  fitness: {
    name: 'Phòng Gym FitZone Khai Trương',
    brand: 'FitZone',
    offer: 'Gói năm ưu đãi còn 4.900.000đ',
    goal: 'fitness',
    details:
      'Hệ thống máy tập hiện đại nhập khẩu\nPhòng tập rộng 800m², máy lạnh toàn bộ\nPT kèm 1-1 theo mục tiêu\nLớp yoga, group-x miễn phí\nMở cửa 5h–23h',
    copies: {
      launch: { headline: 'FitZone Khai Trương', subline: 'Bắt đầu phiên bản khỏe hơn', cta: 'Đăng ký ngay', caption: '💪 FITZONE KHAI TRƯƠNG\n\n📌 Máy tập nhập khẩu, 800m²\n📌 Gói năm ưu đãi còn 4.900.000đ\n\nMở cửa 5h–23h mỗi ngày!' },
      story: { headline: 'Có Gì Tại FitZone', subline: 'Không gian và dịch vụ chuẩn', cta: 'Xem chi tiết', caption: '🎯 ĐIỂM NHẤN\n\n- Máy tập hiện đại, phòng 800m²\n- PT kèm 1-1 theo mục tiêu\n- Lớp yoga, group-x miễn phí', points: ['Máy tập nhập khẩu, phòng 800m²', 'PT kèm 1-1 theo mục tiêu', 'Lớp yoga, group-x miễn phí'] },
      action: { headline: 'Đăng Ký Hội Viên', subline: 'Ưu đãi khai trương có hạn', cta: 'Nhắn tin đăng ký', caption: '📬 ĐĂNG KÝ HỘI VIÊN\n\n- Gói năm còn 4.900.000đ\n- Tủ đồ, phòng tắm nước nóng\n- Nhắn tin để nhận tư vấn', points: ['Gói năm ưu đãi còn 4.900.000đ', 'Tủ đồ, phòng tắm nước nóng', 'Nhắn tin nhận tư vấn gói tập'] },
    },
  },
  technology: {
    name: 'App Quản Lý Chi Tiêu MoneyWise',
    brand: 'MoneyWise',
    offer: 'Dùng thử Premium 14 ngày miễn phí',
    goal: 'technology',
    details:
      'Ghi chép thu chi nhanh trong 3 giây\nTự động phân loại và báo cáo theo tháng\nĐặt ngân sách, nhắc hạn hóa đơn\nĐồng bộ nhiều thiết bị, bảo mật dữ liệu\nCó trên iOS và Android',
    copies: {
      launch: { headline: 'MoneyWise', subline: 'Quản lý chi tiêu trong 3 giây', cta: 'Tải app ngay', caption: '📱 MONEYWISE – QUẢN LÝ CHI TIÊU\n\n📌 Ghi thu chi trong 3 giây\n📌 Dùng thử Premium 14 ngày miễn phí\n\nCó trên iOS và Android!' },
      story: { headline: 'App Làm Được Gì', subline: 'Gọn nhẹ mà đủ dùng', cta: 'Xem tính năng', caption: '🎯 TÍNH NĂNG NỔI BẬT\n\n- Tự phân loại & báo cáo tháng\n- Đặt ngân sách, nhắc hóa đơn\n- Đồng bộ nhiều thiết bị', points: ['Tự phân loại và báo cáo theo tháng', 'Đặt ngân sách, nhắc hạn hóa đơn', 'Đồng bộ nhiều thiết bị, bảo mật'] },
      action: { headline: 'Trải Nghiệm Ngay', subline: 'Miễn phí 14 ngày Premium', cta: 'Tải miễn phí', caption: '📬 TẢI MONEYWISE\n\n- Dùng thử Premium 14 ngày\n- Miễn phí tính năng cơ bản\n- Có trên iOS & Android', points: ['Dùng thử Premium 14 ngày', 'Miễn phí tính năng cơ bản', 'Có trên iOS và Android'] },
    },
  },
  personal: {
    name: 'Coach Minh – Định Hướng Sự Nghiệp',
    brand: 'Coach Minh',
    offer: 'Buổi khám phá miễn phí 30 phút',
    goal: 'personal',
    details:
      'Đồng hành người đi làm 1–5 năm muốn chuyển hướng\n10 năm kinh nghiệm quản lý nhân sự\nBuổi 1-1 phân tích điểm mạnh, lộ trình\nHỗ trợ chỉnh CV và luyện phỏng vấn\nTư vấn online hoặc trực tiếp',
    copies: {
      launch: { headline: 'Coach Minh', subline: 'Gỡ rối và định hướng sự nghiệp', cta: 'Đặt lịch ngay', caption: '🧭 COACH MINH – ĐỊNH HƯỚNG SỰ NGHIỆP\n\n📌 10 năm kinh nghiệm quản lý nhân sự\n📌 Buổi khám phá miễn phí 30 phút\n\nĐặt lịch để bắt đầu!' },
      story: { headline: 'Em Giúp Được Gì', subline: 'Rõ ràng từng bước đi', cta: 'Xem chi tiết', caption: '🎯 NỘI DUNG ĐỒNG HÀNH\n\n- Phân tích điểm mạnh, lộ trình\n- Chỉnh CV và luyện phỏng vấn\n- Tư vấn online hoặc trực tiếp', points: ['Phân tích điểm mạnh và lộ trình', 'Chỉnh CV và luyện phỏng vấn', 'Tư vấn online hoặc trực tiếp'] },
      action: { headline: 'Bắt Đầu Hôm Nay', subline: 'Buổi khám phá miễn phí', cta: 'Nhắn tin đặt lịch', caption: '📬 ĐẶT BUỔI KHÁM PHÁ\n\n- Miễn phí 30 phút đầu\n- Phù hợp người đi làm 1–5 năm\n- Nhắn tin để xếp lịch', points: ['Miễn phí buổi khám phá 30 phút', 'Phù hợp người đi làm 1–5 năm', 'Nhắn tin để xếp lịch'] },
    },
  },
  service: {
    name: 'Dịch Vụ Thiết Kế Website Trọn Gói',
    brand: 'WebPro',
    offer: 'Trọn gói từ 5.900.000đ',
    goal: 'service',
    details:
      'Thiết kế web chuẩn SEO, chuẩn mobile\nGiao diện riêng theo thương hiệu\nTích hợp form, chat, thanh toán\nBàn giao trong 10–15 ngày\nHướng dẫn quản trị, bảo hành 12 tháng',
    copies: {
      launch: { headline: 'Thiết Kế Website Trọn Gói', subline: 'Website chuyên nghiệp, đúng thương hiệu', cta: 'Nhận báo giá', caption: '🌐 THIẾT KẾ WEBSITE TRỌN GÓI\n\n📌 Chuẩn SEO, chuẩn mobile\n📌 Trọn gói từ 5.900.000đ\n\nĐể lại thông tin nhận báo giá!' },
      story: { headline: 'Gói Dịch Vụ Gồm Gì', subline: 'Làm một lần, dùng lâu dài', cta: 'Xem chi tiết', caption: '🎯 HẠNG MỤC DỊCH VỤ\n\n- Giao diện riêng theo thương hiệu\n- Tích hợp form, chat, thanh toán\n- Bàn giao 10–15 ngày', points: ['Giao diện riêng theo thương hiệu', 'Tích hợp form, chat, thanh toán', 'Bàn giao trong 10–15 ngày'] },
      action: { headline: 'Bắt Đầu Dự Án', subline: 'Tư vấn miễn phí trước khi làm', cta: 'Liên hệ tư vấn', caption: '📬 LIÊN HỆ WEBPRO\n\n- Trọn gói từ 5.900.000đ\n- Hỗ trợ tên miền & hosting năm đầu\n- Bảo hành 12 tháng', points: ['Trọn gói từ 5.900.000đ', 'Hỗ trợ tên miền & hosting năm đầu', 'Bảo hành 12 tháng'] },
    },
  },
};
