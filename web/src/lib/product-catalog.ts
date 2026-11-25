// Danh mục SẢN PHẨM IN gốc — 1 nguồn sự thật duy nhất cho toàn bộ "web cần in gì".
// Thêm 1 sản phẩm = thêm 1 object vào PRODUCTS. Trang /in tự hiện, tự tìm kiếm được.
// mode 'studio' = đã có editor tự thiết kế; 'custom' = đi thẳng luồng gửi mẫu/yêu cầu (vẫn nhận đơn ngay).
// Mục tiêu: cover ĐỦ nhu cầu in của khách + sắp xếp dễ nhìn dễ kiếm.

export type CatalogCategory = {
  id: string;
  label: string;
  blurb: string;
  /** tên icon lucide, map trong CatalogBrowser */
  icon: string;
};

export type CatalogProduct = {
  id: string;
  name: string;
  /** id của category */
  cat: string;
  /** 'studio' = tự thiết kế có sẵn; 'custom' = gửi mẫu/yêu cầu */
  mode: 'studio' | 'custom';
  href: string;
  blurb: string;
  /** từ khoá để tìm kiếm (không dấu cũng ra) */
  keywords: string[];
  /** gắn nhãn "Hot"/"Mùa vụ" nếu cần */
  tag?: string;
};

export const CATEGORIES: CatalogCategory[] = [
  { id: 'tem-sticker', label: 'Tem nhãn & sticker', blurb: 'Tem dán sản phẩm, decal, sticker — nhận đơn lẻ, file in chuẩn.', icon: 'tag' },
  { id: 'bao-bi', label: 'Bao bì & hộp túi', blurb: 'Hộp giấy, túi giấy, hộp quai xách, bao bì sản phẩm.', icon: 'package' },
  { id: 'giay-to', label: 'Danh thiếp & giấy tờ', blurb: 'Card visit, tờ rơi, brochure, phong bì, tiêu đề thư.', icon: 'file' },
  { id: 'menu', label: 'Menu & bảng giá', blurb: 'Menu quán cà phê, quán ăn, bảng giá dịch vụ.', icon: 'list' },
  { id: 'quang-cao', label: 'Quảng cáo & biển bảng', blurb: 'Standee, poster, banner, backdrop, bảng hiệu.', icon: 'megaphone' },
  { id: 'su-kien', label: 'Sự kiện & quà tặng', blurb: 'Thiệp cưới/mời, lịch Tết, móc khoá, hashtag cầm tay.', icon: 'heart' },
  { id: 'qua-tang', label: 'Quà tặng in hình', blurb: 'Ly sứ, tranh canvas, gối, áo thun in ảnh/logo — làm từ 1 cái.', icon: 'gift' },
  { id: 'thuong-hieu', label: 'Thương hiệu', blurb: 'Logo, bộ nhận diện, bìa & avatar thương hiệu.', icon: 'sparkles' },
];

const custom = (label: string) => `/studio/print-custom?need=${encodeURIComponent(label)}`;

export const PRODUCTS: CatalogProduct[] = [
  // ─── Tem nhãn & sticker ───
  { id: 'sticker', name: 'Sticker', cat: 'tem-sticker', mode: 'studio', href: '/studio/sticker', blurb: 'Sticker die-cut, dán laptop/sản phẩm, logo quán.', keywords: ['sticker', 'hình dán', 'logo quán', 'die cut'] },
  { id: 'tem-san-pham', name: 'Tem nhãn sản phẩm', cat: 'tem-sticker', mode: 'studio', href: '/studio/sticker', blurb: 'Tem dán mỹ phẩm, thực phẩm, nước hoa, nến thơm.', keywords: ['tem nhãn', 'tem sản phẩm', 'tem mỹ phẩm', 'nhãn mác', 'nước hoa', 'thực phẩm'], tag: 'Hot' },
  { id: 'nhan-chai-hu', name: 'Nhãn chai · hũ · lọ', cat: 'tem-sticker', mode: 'studio', href: '/studio/label', blurb: 'Nhãn quấn chai, hũ mật ong, lọ gia vị, chai nước mắm — có thông tin bắt buộc.', keywords: ['nhãn chai', 'nhãn hũ', 'tem hũ', 'nhãn lọ', 'mật ong', 'nước mắm', 'chai thuỷ tinh', 'nhãn mác'], tag: 'Hot' },
  { id: 'decal', name: 'Decal dán', cat: 'tem-sticker', mode: 'studio', href: '/studio/sticker', blurb: 'Decal giấy, nhựa, trong — dán chai lọ, hộp.', keywords: ['decal', 'decal nhựa', 'decal trong', 'dán chai lọ'] },
  { id: 'nhan-ly-chai', name: 'Nhãn dán ly / chai', cat: 'tem-sticker', mode: 'studio', href: '/studio/sticker', blurb: 'Tem dán ly trà sữa, cà phê, chai nước.', keywords: ['nhãn ly', 'tem ly', 'dán chai', 'trà sữa', 'cà phê'] },
  { id: 'tem-bao-hanh', name: 'Tem bảo hành / tem vỡ', cat: 'tem-sticker', mode: 'studio', href: '/studio/seal', blurb: 'Tem vỡ niêm phong, tem bảo hành chống bóc.', keywords: ['tem bảo hành', 'tem vỡ', 'tem chống giả'] },
  { id: 'tem-niem-phong', name: 'Tem niêm phong', cat: 'tem-sticker', mode: 'studio', href: '/studio/seal?kind=seal', blurb: 'Tem niêm phong hộp, seal dán nắp.', keywords: ['tem niêm phong', 'seal', 'dán nắp hộp'] },
  { id: 'tag-treo', name: 'Tag treo quần áo', cat: 'tem-sticker', mode: 'studio', href: '/studio/hangtag', blurb: 'Tag treo shop thời trang, nhãn giá, thẻ cảm ơn kèm dây.', keywords: ['tag treo', 'hang tag', 'mác quần áo', 'thẻ treo', 'thời trang', 'nhãn giá'] },
  { id: 'mac-ao-det', name: 'Mác áo dệt · nhãn may', cat: 'tem-sticker', mode: 'studio', href: '/studio/wovenlabel', blurb: 'Mác dệt cổ áo, nhãn size, nhãn hướng dẫn giặt cho shop thời trang.', keywords: ['mác áo', 'mác dệt', 'nhãn dệt', 'nhãn may', 'woven label', 'thời trang'] },
  { id: 'nhan-ten-hoc-sinh', name: 'Nhãn tên học sinh', cat: 'tem-sticker', mode: 'studio', href: '/studio/namelabel', blurb: 'Tờ nhãn tên dán vở, bình nước, đồ dùng của bé — chống nước.', keywords: ['nhãn tên', 'nhãn vở', 'tem tên học sinh', 'sticker tên bé', 'name label'] },

  // ─── Bao bì & hộp túi ───
  { id: 'hop-giay', name: 'Hộp giấy', cat: 'bao-bi', mode: 'studio', href: '/studio/packaging', blurb: 'Hộp đựng sản phẩm, hộp quà — bế gấp theo khổ.', keywords: ['hộp giấy', 'hộp đựng', 'vỏ hộp', 'hộp quà', 'bao bì'], tag: 'Hot' },
  { id: 'tui-giay', name: 'Túi giấy', cat: 'bao-bi', mode: 'studio', href: '/studio/packaging', blurb: 'Túi giấy đựng sản phẩm, túi quà tặng doanh nghiệp.', keywords: ['túi giấy', 'túi đựng', 'túi quà', 'túi shop'], tag: 'Hot' },
  { id: 'hop-quai-xach', name: 'Hộp quai xách', cat: 'bao-bi', mode: 'studio', href: '/studio/packaging?kind=carry', blurb: 'Hộp có quai, đựng quà & sản phẩm cồng kềnh.', keywords: ['hộp quai xách', 'hộp có quai', 'hộp xách tay'] },
  { id: 'hop-qua-cung', name: 'Hộp quà cứng cao cấp', cat: 'bao-bi', mode: 'studio', href: '/studio/rigidbox', blurb: 'Hộp cứng nắp rời, hộp nam châm, hộp ngăn kéo — quà Tết, quà VIP.', keywords: ['hộp cứng', 'hộp quà cao cấp', 'hộp nam châm', 'hộp ngăn kéo', 'hộp quà tết', 'rigid box'], tag: 'Mùa vụ' },
  { id: 'hop-ong', name: 'Hộp ống tròn', cat: 'bao-bi', mode: 'studio', href: '/studio/tube', blurb: 'Hộp ống giấy đựng trà, cà phê, rượu, áo — nắp rời sang trọng.', keywords: ['hộp ống', 'ống giấy', 'hộp tròn', 'hộp trà', 'tube box'] },
  { id: 'bao-bi-sp', name: 'Bao bì sản phẩm', cat: 'bao-bi', mode: 'studio', href: '/studio/pouch', blurb: 'Túi zip, bao bì màng ghép, tem + hộp đồng bộ.', keywords: ['bao bì', 'túi zip', 'màng ghép', 'đóng gói'] },
  { id: 'ly-in-logo', name: 'Ly giấy / ly nhựa in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/cup', blurb: 'Ly cà phê, trà sữa, nước ép in logo quán.', keywords: ['ly giấy', 'ly nhựa', 'cốc giấy', 'ly trà sữa', 'ly cà phê', 'in ly'], tag: 'Hot' },
  { id: 'bang-keo', name: 'Băng keo in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/tape', blurb: 'Băng keo đóng hàng in tên shop — gói hàng online chuyên nghiệp.', keywords: ['băng keo', 'băng dính', 'băng keo in logo', 'đóng gói', 'shop online'] },
  { id: 'tui-vai', name: 'Túi vải canvas', cat: 'bao-bi', mode: 'studio', href: '/studio/tote', blurb: 'Túi tote canvas in logo — quà tặng, túi shop dùng lại.', keywords: ['túi vải', 'túi canvas', 'tote', 'túi tote', 'túi môi trường'] },
  { id: 'tui-rut', name: 'Túi rút in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/drawstring', blurb: 'Túi rút dây vải dù/canvas — quà sự kiện, giải chạy, CLB.', keywords: ['túi rút', 'túi dây rút', 'balo dây rút', 'túi sự kiện'] },
  { id: 'hop-do-an', name: 'Hộp đồ ăn · hộp pizza', cat: 'bao-bi', mode: 'studio', href: '/studio/foodbox', blurb: 'Hộp pizza, hộp cơm, hộp burger, khay giấy in logo quán.', keywords: ['hộp pizza', 'hộp cơm giấy', 'hộp burger', 'hộp đồ ăn', 'hộp mang đi', 'take away'] },
  { id: 'hop-banh-kem', name: 'Hộp bánh kem · cupcake', cat: 'bao-bi', mode: 'studio', href: '/studio/cakebox', blurb: 'Hộp bánh kem có cửa sổ, hộp cupcake có khay in logo tiệm.', keywords: ['hộp bánh kem', 'hộp bánh sinh nhật', 'hộp cupcake', 'hộp bánh ngọt', 'tiệm bánh'] },
  { id: 'tui-giay-do-an', name: 'Túi giấy đựng đồ ăn', cat: 'bao-bi', mode: 'studio', href: '/studio/foodbag', blurb: 'Túi giấy kraft đáy vuông, túi bánh mì chống dầu in logo.', keywords: ['túi giấy đồ ăn', 'túi bánh mì', 'túi giấy kraft', 'túi mang đi', 'túi sos'] },
  { id: 'tui-xop', name: 'Túi xốp / túi nilon in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/plasticbag', blurb: 'Túi xốp quai đục lỗ, túi PE quai xách in tên shop.', keywords: ['túi xốp', 'túi nilon', 'túi ni lông', 'túi pe', 'túi hd', 'túi shop'] },
  { id: 'thung-giao-hang', name: 'Thùng giao hàng in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/deliverybox', blurb: 'Decal thùng giao hàng sau xe máy — giao đồ ăn, tạp hoá, nước.', keywords: ['thùng giao hàng', 'thùng sau xe máy', 'decal thùng', 'ship hàng', 'giao đồ ăn'] },
  { id: 'decal-xe', name: 'Decal dán xe công ty', cat: 'quang-cao', mode: 'studio', href: '/studio/cardecal', blurb: 'Decal thân xe tải, xe van, ô tô dịch vụ in logo + hotline.', keywords: ['decal xe', 'dán xe', 'decal xe tải', 'quảng cáo trên xe', 'wrap xe'] },
  { id: 'thung-carton', name: 'Thùng carton in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/carton', blurb: 'Thùng carton ship hàng in logo shop — 3/5 lớp, in 1–2 màu.', keywords: ['thùng carton', 'hộp carton', 'thùng ship hàng', 'carton in logo', 'đóng gói online'], tag: 'Hot' },
  { id: 'tui-dung-ly', name: 'Túi đựng ly trà sữa', cat: 'bao-bi', mode: 'studio', href: '/studio/cupcarrier', blurb: 'Túi PE/ giấy đựng 1–2 ly trà sữa, cà phê mang đi in logo.', keywords: ['túi đựng ly', 'túi trà sữa', 'túi 1 ly', 'túi 2 ly', 'túi mang đi'] },
  { id: 'bao-gao', name: 'Bao gạo · bao bì nông sản', cat: 'bao-bi', mode: 'studio', href: '/studio/ricebag', blurb: 'Bao gạo PP dệt, túi gạo hút chân không 5–25kg in thương hiệu.', keywords: ['bao gạo', 'túi gạo', 'bao bì nông sản', 'bao pp', 'gạo st25'] },
  { id: 'hop-banh-trung-thu', name: 'Hộp bánh trung thu', cat: 'bao-bi', mode: 'studio', href: '/studio/mooncakebox', blurb: 'Hộp bánh trung thu 4–6 bánh, quà doanh nghiệp mùa thu.', keywords: ['hộp bánh trung thu', 'hộp trung thu', 'bánh trung thu', 'quà trung thu'], tag: 'Mùa vụ' },
  { id: 'giay-goi-qua', name: 'Giấy gói quà in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/giftwrap', blurb: 'Giấy gói quà, giấy pelure in logo lặp — gói hàng sang hơn.', keywords: ['giấy gói quà', 'giấy gói', 'giấy pelure', 'giấy lụa', 'gói quà'] },
  { id: 'ruy-bang', name: 'Ruy băng in logo', cat: 'bao-bi', mode: 'studio', href: '/studio/ribbon', blurb: 'Ruy băng satin in nhũ tên shop — buộc hộp quà, hoa, bánh.', keywords: ['ruy băng', 'ruy băng in logo', 'dây ruy băng', 'ribbon', 'gói quà'] },

  // ─── Danh thiếp & giấy tờ ───
  { id: 'card-visit', name: 'Card visit / danh thiếp', cat: 'giay-to', mode: 'studio', href: '/studio/cardvisit', blurb: 'Danh thiếp 2 mặt, cán mờ/bóng, bo góc.', keywords: ['card visit', 'danh thiếp', 'namecard', 'name card'], tag: 'Hot' },
  { id: 'to-roi', name: 'Tờ rơi / flyer', cat: 'giay-to', mode: 'studio', href: '/studio/flyer', blurb: 'Tờ rơi A5/A6, flyer khai trương, khuyến mãi.', keywords: ['tờ rơi', 'flyer', 'tờ gấp', 'brochure'] },
  { id: 'brochure', name: 'Brochure / catalogue', cat: 'giay-to', mode: 'studio', href: '/studio/brochure', blurb: 'Catalogue sản phẩm, brochure gấp 3, hồ sơ năng lực.', keywords: ['brochure', 'catalogue', 'catalog', 'hồ sơ năng lực', 'profile'] },
  { id: 'phong-bi', name: 'Phong bì / bao thư', cat: 'giay-to', mode: 'studio', href: '/studio/envelope', blurb: 'Bao thư công ty in logo, phong bì lì xì.', keywords: ['phong bì', 'bao thư', 'envelope', 'lì xì'] },
  { id: 'tieu-de-thu', name: 'Tiêu đề thư (letterhead)', cat: 'giay-to', mode: 'studio', href: '/studio/stationery', blurb: 'Giấy tiêu đề công ty, kẹp file, bộ văn phòng.', keywords: ['tiêu đề thư', 'letterhead', 'giấy a4 công ty', 'kẹp file'] },
  { id: 'voucher', name: 'Voucher / thẻ tích điểm', cat: 'giay-to', mode: 'studio', href: '/studio/voucher', blurb: 'Phiếu quà tặng, voucher giảm giá, thẻ tích điểm khách quen.', keywords: ['voucher', 'phiếu quà tặng', 'thẻ tích điểm', 'thẻ thành viên', 'gift card', 'coupon'] },
  { id: 'the-deo', name: 'Thẻ đeo nhân viên', cat: 'giay-to', mode: 'studio', href: '/studio/badge', blurb: 'Thẻ nhân viên, thẻ sự kiện kèm dây đeo in logo.', keywords: ['thẻ nhân viên', 'thẻ đeo', 'thẻ tên', 'dây đeo', 'name tag', 'thẻ sự kiện'] },
  { id: 'bang-ten-cai-ao', name: 'Bảng tên cài áo', cat: 'giay-to', mode: 'studio', href: '/studio/nametag', blurb: 'Bảng tên nhân viên kim loại/mica cài áo — shop, khách sạn, ngân hàng.', keywords: ['bảng tên', 'bảng tên cài áo', 'name tag', 'thẻ tên kim loại', 'bảng tên nhân viên'] },
  { id: 'hoa-don', name: 'Hoá đơn · phiếu liên', cat: 'giay-to', mode: 'studio', href: '/studio/receiptbook', blurb: 'Hoá đơn bán lẻ, phiếu thu, phiếu giao hàng 2–3 liên, đóng cuốn.', keywords: ['hoá đơn', 'hóa đơn bán lẻ', 'phiếu thu', 'phiếu chi', 'phiếu giao hàng', 'giấy carbon', '2 liên'], tag: 'Hot' },
  { id: 'giay-khen', name: 'Giấy khen · chứng nhận', cat: 'giay-to', mode: 'studio', href: '/studio/certificate', blurb: 'Giấy khen, bằng khen, chứng nhận khoá học — in hàng loạt theo danh sách.', keywords: ['giấy khen', 'bằng khen', 'chứng nhận', 'certificate', 'chứng chỉ', 'khen thưởng'] },
  { id: 'catalogue', name: 'Catalogue nhiều trang', cat: 'giay-to', mode: 'studio', href: '/studio/booklet', blurb: 'Catalogue sản phẩm 8–24 trang đóng ghim, hồ sơ năng lực.', keywords: ['catalogue', 'catalog', 'sách giới thiệu', 'booklet', 'hồ sơ năng lực', 'đóng ghim'] },
  { id: 've-su-kien', name: 'Vé sự kiện · vé mời', cat: 'giay-to', mode: 'studio', href: '/studio/ticket', blurb: 'Vé hội chợ, ca nhạc, gala có cuống xé, số nhảy, QR.', keywords: ['vé sự kiện', 'vé mời', 'vé ca nhạc', 'vé hội chợ', 'vé gala', 'ticket'] },
  { id: 'thiep-moi-su-kien', name: 'Thiệp mời sự kiện', cat: 'giay-to', mode: 'studio', href: '/studio/invitation', blurb: 'Thiệp mời hội nghị, khai trương, gala — in tên khách hàng loạt.', keywords: ['thiệp mời', 'thư mời', 'thiệp mời hội nghị', 'thiệp mời khai trương', 'invitation'] },
  { id: 'the-cao', name: 'Thẻ cào trúng thưởng', cat: 'giay-to', mode: 'studio', href: '/studio/scratchcard', blurb: 'Thẻ cào khuyến mãi, bốc thăm — lớp cào bạc, mã riêng từng thẻ.', keywords: ['thẻ cào', 'thẻ cào trúng thưởng', 'cào trúng thưởng', 'khuyến mãi'] },
  { id: 'postcard', name: 'Postcard · bưu thiếp', cat: 'giay-to', mode: 'studio', href: '/studio/postcard', blurb: 'Postcard du lịch, thiệp cảm ơn kèm đơn, bộ bưu thiếp quà tặng.', keywords: ['postcard', 'bưu thiếp', 'thiệp cảm ơn', 'thiệp kèm đơn'] },
  { id: 'bookmark', name: 'Bookmark kẹp sách', cat: 'giay-to', mode: 'studio', href: '/studio/bookmark', blurb: 'Bookmark nhà sách, quán cà phê sách, quà sự kiện.', keywords: ['bookmark', 'kẹp sách', 'đánh dấu trang', 'nhà sách'] },
  { id: 'cv', name: 'CV xin việc', cat: 'giay-to', mode: 'studio', href: '/studio/cv', blurb: 'Tạo CV đẹp, xuất PDF chuẩn in & nộp online.', keywords: ['cv', 'sơ yếu lý lịch', 'resume', 'xin việc'] },

  // ─── Menu & bảng giá ───
  { id: 'menu-quan', name: 'Menu quán', cat: 'menu', mode: 'studio', href: '/studio/pricelist', blurb: 'Menu cà phê, trà sữa, quán ăn — khổ A4/A5 hoặc treo tường.', keywords: ['menu', 'thực đơn', 'menu cà phê', 'menu quán ăn', 'trà sữa'], tag: 'Hot' },
  { id: 'bang-gia', name: 'Bảng giá dịch vụ', cat: 'menu', mode: 'studio', href: '/studio/pricelist', blurb: 'Bảng giá spa, salon, rửa xe — rõ ràng, dễ đọc.', keywords: ['bảng giá', 'bảng dịch vụ', 'bảng niêm yết', 'spa', 'salon'] },
  { id: 'bo-ban-an', name: 'Giấy lót khay · bao đũa · khăn giấy', cat: 'menu', mode: 'studio', href: '/studio/tableware', blurb: 'Bộ đồ bàn ăn in logo quán: lót khay, bao đũa, khăn giấy.', keywords: ['giấy lót khay', 'bao đũa', 'khăn giấy in logo', 'placemat', 'nhà hàng'] },
  { id: 'ke-mica-qr', name: 'Kệ mica QR để bàn', cat: 'menu', mode: 'studio', href: '/studio/qrstand', blurb: 'Kệ mica QR chuyển khoản, gọi món, wifi — đặt trên bàn quán.', keywords: ['kệ mica', 'mã qr', 'qr chuyển khoản', 'qr menu', 'wifi', 'để bàn'], tag: 'Hot' },
  { id: 'tent-card', name: 'Tent card để bàn', cat: 'menu', mode: 'studio', href: '/studio/tabletent', blurb: 'Thẻ chữ A để bàn: món mới, combo, wifi, số bàn.', keywords: ['tent card', 'thẻ để bàn', 'menu để bàn', 'bảng chữ v', 'combo'] },
  { id: 'menu-so', name: 'Menu dạng sổ', cat: 'menu', mode: 'studio', href: '/studio/menubook', blurb: 'Menu nhà hàng nhiều trang, bìa da ép logo hoặc bìa cứng.', keywords: ['menu sổ', 'menu bìa da', 'menu nhà hàng', 'menu nhiều trang', 'menu book'] },
  { id: 'menu-treo-tuong', name: 'Bảng menu treo tường', cat: 'menu', mode: 'studio', href: '/studio/menuboard', blurb: 'Bảng menu lớn sau quầy cà phê, trà sữa — nhiều tấm ghép, hộp đèn.', keywords: ['bảng menu treo tường', 'menu board', 'menu quầy', 'bảng giá treo', 'menu trà sữa'] },
  { id: 'hop-khan-giay', name: 'Hộp khăn giấy in logo', cat: 'menu', mode: 'studio', href: '/studio/tissuebox', blurb: 'Hộp khăn giấy để bàn nhà hàng, khách sạn, xe dịch vụ.', keywords: ['hộp khăn giấy', 'khăn giấy hộp', 'hộp giấy ăn', 'khăn giấy in logo'] },
  { id: 'khan-lanh', name: 'Khăn lạnh in logo', cat: 'menu', mode: 'studio', href: '/studio/wetwipe', blurb: 'Khăn lạnh, khăn ướt gói in tên quán.', keywords: ['khăn lạnh', 'khăn ướt', 'khăn in logo', 'nhà hàng', 'quán nhậu'] },
  { id: 'lot-ly', name: 'Lót ly in logo', cat: 'menu', mode: 'studio', href: '/studio/coaster', blurb: 'Lót ly giấy bồi, gỗ, silicon in logo quán cà phê, bar.', keywords: ['lót ly', 'đế lót ly', 'coaster', 'quán cà phê', 'bar'] },

  // ─── Quảng cáo & biển bảng ───
  { id: 'poster', name: 'Poster / banner sale', cat: 'quang-cao', mode: 'studio', href: '/studio/marketing', blurb: 'Poster khuyến mãi, banner sale, ảnh đăng mạng.', keywords: ['poster', 'banner', 'sale', 'khuyến mãi', 'quảng cáo'] },
  { id: 'standee', name: 'Standee', cat: 'quang-cao', mode: 'studio', href: '/studio/standee', blurb: 'Standee cuốn, standee X — khai trương, sự kiện.', keywords: ['standee', 'standee cuốn', 'roll up', 'bảng đứng'], tag: 'Hot' },
  { id: 'backdrop', name: 'Backdrop / phông', cat: 'quang-cao', mode: 'studio', href: '/studio/banner', blurb: 'Phông sự kiện, backdrop chụp ảnh, hiflex khổ lớn.', keywords: ['backdrop', 'phông', 'phông bạt', 'hiflex', 'sự kiện'] },
  { id: 'bang-hieu', name: 'Bảng hiệu', cat: 'quang-cao', mode: 'studio', href: '/studio/signage', blurb: 'Bảng hiệu quán, biển shop, hộp đèn.', keywords: ['bảng hiệu', 'biển hiệu', 'biển quảng cáo', 'hộp đèn'] },
  { id: 'bang-chu-a', name: 'Bảng chữ A vỉa hè', cat: 'quang-cao', mode: 'studio', href: '/studio/aframe', blurb: 'Bảng menu chữ A đặt trước quán — 2 mặt, gấp gọn.', keywords: ['bảng chữ a', 'bảng menu đứng', 'a-frame', 'bảng vỉa hè', 'bảng đứng'] },
  { id: 'decal-kinh', name: 'Decal dán kính', cat: 'quang-cao', mode: 'studio', href: '/studio/windowdecal', blurb: 'Decal cửa kính: logo, giờ mở cửa, wifi, khuyến mãi.', keywords: ['decal dán kính', 'decal cửa kính', 'giờ mở cửa', 'decal cắt chữ', 'one way'] },
  { id: 'mai-hien', name: 'Mái hiên · bạt che in logo', cat: 'quang-cao', mode: 'studio', href: '/studio/awning', blurb: 'Mái hiên bạt in tên quán, sọc màu — nổi bật mặt tiền.', keywords: ['mái hiên', 'bạt che', 'mái che di động', 'awning', 'mặt tiền quán'] },
  { id: 'tham-chui-chan', name: 'Thảm chùi chân in logo', cat: 'quang-cao', mode: 'studio', href: '/studio/doormat', blurb: 'Thảm cửa in logo, lời chào cho shop, văn phòng, khách sạn.', keywords: ['thảm chùi chân', 'thảm cửa', 'thảm in logo', 'thảm welcome'] },
  { id: 'hop-den', name: 'Hộp đèn quảng cáo', cat: 'quang-cao', mode: 'studio', href: '/studio/lightbox', blurb: 'Hộp đèn mica, hộp đèn vẫy tròn trước cửa quán.', keywords: ['hộp đèn', 'biển hộp đèn', 'hộp đèn vẫy', 'đèn led', 'biển sáng'] },
  { id: 'tem-ke', name: 'Tem kệ · wobbler siêu thị', cat: 'quang-cao', mode: 'studio', href: '/studio/shelftalker', blurb: 'Wobbler lắc lư, tem kệ giá, shelf strip cho tạp hoá, siêu thị.', keywords: ['wobbler', 'tem kệ', 'shelf talker', 'bảng giá kệ', 'siêu thị', 'tạp hoá'] },
  { id: 'co-phuon', name: 'Cờ phướn · cờ dây', cat: 'quang-cao', mode: 'studio', href: '/studio/flag', blurb: 'Cờ phướn giọt nước khai trương, cờ dây tam giác trang trí.', keywords: ['cờ phướn', 'cờ giọt nước', 'cờ dây', 'cờ đuôi nheo', 'cờ khai trương', 'feather flag'] },
  { id: 'bien-cong-ty', name: 'Biển công ty / văn phòng', cat: 'quang-cao', mode: 'studio', href: '/studio/plaque', blurb: 'Biển tên công ty, biển phòng ban — mica, alu, inox.', keywords: ['biển công ty', 'biển văn phòng', 'biển tên', 'biển phòng', 'biển mica', 'biển inox'] },
  { id: 'bien-bao', name: 'Biển báo · biển chỉ dẫn', cat: 'quang-cao', mode: 'studio', href: '/studio/signboard', blurb: 'Biển WC, lối thoát hiểm, cấm hút thuốc, wifi, chỉ hướng — mica/alu.', keywords: ['biển báo', 'biển chỉ dẫn', 'biển wc', 'lối thoát hiểm', 'cấm hút thuốc', 'biển phòng'] },
  { id: 'tranh-dan-tuong', name: 'Tranh dán tường trang trí', cat: 'quang-cao', mode: 'studio', href: '/studio/wallmural', blurb: 'Decal dán tường khổ lớn cho quán cà phê, văn phòng, homestay.', keywords: ['tranh dán tường', 'decal dán tường', 'giấy dán tường', 'trang trí quán', 'mural'] },
  { id: 'banner-hiflex', name: 'Banner hiflex', cat: 'quang-cao', mode: 'studio', href: '/studio/banner', blurb: 'Băng rôn, banner hiflex treo ngang/dọc.', keywords: ['banner', 'hiflex', 'băng rôn', 'treo tường'] },
  { id: 'infographic', name: 'Infographic', cat: 'quang-cao', mode: 'studio', href: '/studio/infographic', blurb: 'Infographic số liệu, quy trình — in hoặc đăng mạng.', keywords: ['infographic', 'đồ hoạ thông tin', 'số liệu'] },

  // ─── Sự kiện & quà tặng ───
  { id: 'thiep-cuoi', name: 'Thiệp cưới / sinh nhật', cat: 'su-kien', mode: 'studio', href: '/studio/cards', blurb: 'Thiệp cưới, sinh nhật — font tiếng Việt chuẩn, file in sẵn.', keywords: ['thiệp cưới', 'thiệp sinh nhật', 'thiệp mời', 'wedding'] },
  { id: 'so-do-cho-ngoi', name: 'Sơ đồ chỗ ngồi · thẻ tên bàn', cat: 'su-kien', mode: 'studio', href: '/studio/seating', blurb: 'Sơ đồ bàn tiệc cưới, thẻ tên khách, số bàn — dán danh sách là xong.', keywords: ['sơ đồ chỗ ngồi', 'thẻ tên bàn', 'số bàn tiệc', 'seating chart', 'tiệc cưới'] },
  { id: 'bang-chao-mung', name: 'Bảng chào mừng tiệc', cat: 'su-kien', mode: 'studio', href: '/studio/welcomesign', blurb: 'Bảng Welcome đám cưới, sinh nhật, sự kiện đặt trên giá vẽ.', keywords: ['bảng chào mừng', 'welcome sign', 'bảng tên cô dâu chú rể', 'bảng sự kiện'] },
  { id: 'hop-qua-cuoi', name: 'Hộp quà cưới mini', cat: 'su-kien', mode: 'studio', href: '/studio/favorbox', blurb: 'Hộp quà cảm ơn khách dự tiệc cưới, thôi nôi.', keywords: ['hộp quà cưới', 'quà cảm ơn khách', 'hộp kẹo cưới', 'favor box'] },
  { id: 'thiep-moi', name: 'Thiệp mời / tất niên', cat: 'su-kien', mode: 'studio', href: '/studio/cards', blurb: 'Thiệp mời sự kiện, tất niên, khai trương công ty.', keywords: ['thiệp mời', 'thiệp tất niên', 'year end', 'khai trương'] },
  { id: 'thiep-tet', name: 'Thiệp Tết doanh nghiệp', cat: 'su-kien', mode: 'studio', href: '/studio/greeting', blurb: 'Thiệp chúc Tết gửi khách hàng, đối tác — gấp đôi, ép kim.', keywords: ['thiệp tết', 'thiệp chúc mừng năm mới', 'thiệp doanh nghiệp', 'thiệp cảm ơn khách hàng', 'thiệp chúc tết'], tag: 'Mùa vụ' },
  { id: 'lich-tet', name: 'Lịch Tết / để bàn', cat: 'su-kien', mode: 'studio', href: '/studio/calendar', blurb: 'Lịch bloc, lịch để bàn in logo làm quà Tết.', keywords: ['lịch tết', 'lịch để bàn', 'lịch bloc', 'quà tết', 'lịch 2027'], tag: 'Mùa vụ' },
  { id: 'lich-treo', name: 'Lịch treo tường', cat: 'su-kien', mode: 'studio', href: '/studio/calendar?kind=wall', blurb: 'Lịch treo tường 7 tờ / 13 tờ in logo, ảnh sản phẩm.', keywords: ['lịch treo tường', 'lịch treo', 'lịch 7 tờ', 'lịch 13 tờ', 'quà tết'], tag: 'Mùa vụ' },
  { id: 'lich-bloc', name: 'Lịch bloc Tết', cat: 'su-kien', mode: 'studio', href: '/studio/calendar?kind=bloc', blurb: 'Lịch bloc xé ngày + bảng treo in logo — quà Tết truyền thống.', keywords: ['lịch bloc', 'lịch xé', 'lịch bloc tết', 'bảng lịch', 'lịch 365 ngày'], tag: 'Mùa vụ' },
  { id: 'so-tay', name: 'Sổ tay in logo', cat: 'su-kien', mode: 'studio', href: '/studio/notebook', blurb: 'Sổ lò xo, sổ bìa da in logo — quà tặng doanh nghiệp, hội nghị.', keywords: ['sổ tay', 'notebook', 'sổ lò xo', 'sổ bìa da', 'quà tặng doanh nghiệp'] },
  { id: 'giay-note', name: 'Giấy note in logo', cat: 'su-kien', mode: 'studio', href: '/studio/notepad', blurb: 'Giấy note dán, sổ note xé in logo — quà văn phòng, hội nghị.', keywords: ['giấy note', 'sticky note', 'giấy ghi chú', 'sổ note', 'note in logo'] },
  { id: 'standee-mica-mini', name: 'Standee mica mini để bàn', cat: 'su-kien', mode: 'studio', href: '/studio/acrylicstand', blurb: 'Standee mica nhân vật, thú cưng, idol, cặp đôi — cắt theo hình.', keywords: ['standee mica', 'standee mini', 'acrylic stand', 'mô hình mica', 'merch'] },
  { id: 'nam-cham', name: 'Nam châm tủ lạnh', cat: 'su-kien', mode: 'studio', href: '/studio/magnet', blurb: 'Nam châm quảng cáo giao đồ ăn, hotline — dán tủ lạnh khách.', keywords: ['nam châm', 'nam châm tủ lạnh', 'magnet', 'quảng cáo', 'hotline'] },
  { id: 'huy-hieu', name: 'Huy hiệu cài áo', cat: 'su-kien', mode: 'studio', href: '/studio/pin', blurb: 'Huy hiệu tròn 44/58mm — sự kiện, CLB, chiến dịch, merch.', keywords: ['huy hiệu', 'pin cài áo', 'button badge', 'merch', 'câu lạc bộ'] },
  { id: 'quat-cam-tay', name: 'Quạt cầm tay quảng cáo', cat: 'su-kien', mode: 'studio', href: '/studio/fan', blurb: 'Quạt nhựa in logo phát sự kiện, hội chợ, tuyển sinh.', keywords: ['quạt nhựa', 'quạt cầm tay', 'quạt quảng cáo', 'quạt sự kiện'] },
  { id: 'o-du', name: 'Ô dù in logo', cat: 'su-kien', mode: 'studio', href: '/studio/umbrella', blurb: 'Ô cầm tay, ô gấp, dù che quán in logo — quà tặng, quảng cáo.', keywords: ['ô dù', 'ô in logo', 'dù che', 'dù quán cà phê', 'quà tặng'] },
  { id: 'non-la', name: 'Nón lá in logo', cat: 'su-kien', mode: 'studio', href: '/studio/nonla', blurb: 'Nón lá in/vẽ logo — quà lưu niệm, sự kiện văn hoá, du lịch.', keywords: ['nón lá', 'nón lá in logo', 'quà lưu niệm', 'du lịch'] },
  { id: 'the-hanh-ly', name: 'Thẻ hành lý', cat: 'su-kien', mode: 'studio', href: '/studio/luggagetag', blurb: 'Thẻ treo vali in logo — công ty du lịch, quà khách hàng.', keywords: ['thẻ hành lý', 'luggage tag', 'thẻ vali', 'du lịch'] },
  { id: 'moc-khoa', name: 'Móc khoá', cat: 'su-kien', mode: 'studio', href: '/studio/keychain', blurb: 'Móc khoá mica, gỗ in hình — quà tặng, bán kèm.', keywords: ['móc khoá', 'moc khoa', 'keychain', 'quà tặng'] },
  { id: 'hashtag', name: 'Hashtag cầm tay', cat: 'su-kien', mode: 'studio', href: '/studio/hashtag', blurb: 'Hashtag cầm tay chụp hình sự kiện, đám cưới.', keywords: ['hashtag', 'cầm tay', 'photobooth', 'sự kiện'] },
  { id: 'khung-check-in', name: 'Khung check-in cầm tay', cat: 'su-kien', mode: 'studio', href: '/studio/selfieframe', blurb: 'Khung ảnh selfie formex cho tiệc cưới, khai trương, sự kiện.', keywords: ['khung check in', 'khung selfie', 'khung ảnh cầm tay', 'photo booth', 'khung hình sự kiện'] },
  { id: 'bang-deo-cheo', name: 'Băng đeo chéo', cat: 'su-kien', mode: 'studio', href: '/studio/sash', blurb: 'Băng đeo chéo sự kiện: đại sứ, tân sinh viên, cô dâu, sinh nhật.', keywords: ['băng đeo chéo', 'sash', 'băng hoa hậu', 'băng sự kiện', 'đại sứ'] },

  // ─── Thương hiệu ───
  { id: 'logo', name: 'Logo', cat: 'thuong-hieu', mode: 'studio', href: '/studio/logo', blurb: 'Tạo logo shop/quán từ mẫu — xuất file nét.', keywords: ['logo', 'thiết kế logo', 'thương hiệu'] },
  { id: 'bo-nhan-dien', name: 'Bộ nhận diện', cat: 'thuong-hieu', mode: 'studio', href: '/studio/brandpack', blurb: 'Logo + màu + card + tem đồng bộ một tông.', keywords: ['bộ nhận diện', 'brand kit', 'nhận diện thương hiệu', 'đồng bộ'] },
  { id: 'bia-avatar', name: 'Bìa & Avatar', cat: 'thuong-hieu', mode: 'studio', href: '/studio/brand-assets', blurb: 'Ảnh bìa, avatar fanpage, ảnh đại diện đồng bộ.', keywords: ['bìa', 'avatar', 'ảnh bìa', 'fanpage', 'cover'] },
  { id: 'ly-su', name: 'Ly sứ in hình', cat: 'qua-tang', mode: 'studio', href: '/studio/mug', blurb: 'Ly sứ in ảnh, tên, logo — quà sinh nhật, quà công ty.', keywords: ['ly sứ', 'cốc sứ', 'in ly', 'mug', 'in ảnh lên ly', 'quà tặng'], tag: 'Hot' },
  { id: 'ao-thun', name: 'Áo thun đồng phục', cat: 'qua-tang', mode: 'studio', href: '/studio/tshirt', blurb: 'Áo đồng phục công ty, lớp, nhóm, sự kiện — in logo trước/sau.', keywords: ['áo thun', 'áo đồng phục', 'áo lớp', 'áo nhóm', 'in áo', 'đồng phục'], tag: 'Hot' },
  { id: 'tap-de', name: 'Tạp dề in logo', cat: 'qua-tang', mode: 'studio', href: '/studio/apron', blurb: 'Tạp dề nhân viên quán cà phê, nhà hàng, tiệm bánh in/thêu logo.', keywords: ['tạp dề', 'tạp dề in logo', 'đồng phục quán', 'apron'] },
  { id: 'mu-bao-hiem', name: 'Mũ bảo hiểm in logo', cat: 'qua-tang', mode: 'studio', href: '/studio/helmet', blurb: 'Mũ bảo hiểm quà tặng khách hàng, sự kiện, đại lý.', keywords: ['mũ bảo hiểm', 'nón bảo hiểm', 'mũ bảo hiểm in logo', 'quà tặng đại lý'] },
  { id: 'mu-luoi-trai', name: 'Mũ lưỡi trai in/thêu logo', cat: 'qua-tang', mode: 'studio', href: '/studio/cap', blurb: 'Mũ đồng phục, mũ sự kiện thêu hoặc in logo.', keywords: ['mũ lưỡi trai', 'nón kết', 'mũ đồng phục', 'mũ thêu logo', 'nón in logo'] },
  { id: 'patch-theu', name: 'Patch thêu · huy hiệu vải', cat: 'qua-tang', mode: 'studio', href: '/studio/patch', blurb: 'Patch thêu logo CLB, đồng phục, balo — viền vắt sổ, ủi/may.', keywords: ['patch', 'patch thêu', 'huy hiệu vải', 'logo thêu', 'phù hiệu'] },
  { id: 'binh-giu-nhiet', name: 'Bình giữ nhiệt khắc logo', cat: 'qua-tang', mode: 'studio', href: '/studio/tumbler', blurb: 'Bình, ly giữ nhiệt khắc laser/in logo — quà tặng doanh nghiệp.', keywords: ['bình giữ nhiệt', 'ly giữ nhiệt', 'khắc laser', 'bình nước in logo', 'quà tặng doanh nghiệp'] },
  { id: 'but-in-logo', name: 'Bút bi in logo', cat: 'qua-tang', mode: 'studio', href: '/studio/pen', blurb: 'Bút bi nhựa, bút kim loại in/khắc logo — hội nghị, quà khách.', keywords: ['bút bi', 'bút in logo', 'bút khắc tên', 'bút quà tặng', 'bút hội nghị'] },
  { id: 'tranh-canvas', name: 'Tranh canvas in ảnh', cat: 'qua-tang', mode: 'studio', href: '/studio/canvas', blurb: 'In ảnh gia đình, ảnh cưới lên canvas căng khung.', keywords: ['tranh canvas', 'in ảnh canvas', 'tranh treo tường', 'ảnh cưới', 'khung ảnh'] },
  { id: 'photobook', name: 'Photobook · kỷ yếu', cat: 'qua-tang', mode: 'studio', href: '/studio/photobook', blurb: 'Sách ảnh bìa cứng: ảnh cưới, gia đình, du lịch, kỷ yếu lớp.', keywords: ['photobook', 'sách ảnh', 'album ảnh', 'kỷ yếu', 'in album'] },
  { id: 'goi-in-hinh', name: 'Gối in hình', cat: 'qua-tang', mode: 'studio', href: '/studio/pillow', blurb: 'Gối in ảnh, tên, câu chữ — quà sinh nhật, quà đôi.', keywords: ['gối in hình', 'gối in ảnh', 'gối ôm', 'quà sinh nhật', 'quà tặng'] },
  { id: 'lot-chuot', name: 'Lót chuột in hình', cat: 'qua-tang', mode: 'studio', href: '/studio/mousepad', blurb: 'Lót chuột, desk mat in ảnh/logo — quà công ty, gaming.', keywords: ['lót chuột', 'bàn di chuột', 'mouse pad', 'desk mat'] },
  { id: 'puzzle', name: 'Puzzle ghép hình in ảnh', cat: 'qua-tang', mode: 'studio', href: '/studio/puzzle', blurb: 'Tranh ghép hình in ảnh gia đình, ảnh cưới, quà sinh nhật.', keywords: ['puzzle', 'tranh ghép', 'ghép hình', 'xếp hình in ảnh'] },
  { id: 'op-lung', name: 'Ốp lưng điện thoại in hình', cat: 'qua-tang', mode: 'studio', href: '/studio/phonecase', blurb: 'Ốp lưng in ảnh, tên, hoạ tiết — làm từ 1 cái.', keywords: ['ốp lưng', 'ốp điện thoại', 'in ốp lưng', 'phone case'] },
  { id: 'bo-bai', name: 'Bộ bài in logo', cat: 'qua-tang', mode: 'studio', href: '/studio/playingcards', blurb: 'Bộ bài tây in logo mặt lưng + hộp — quà Tết, quà khách.', keywords: ['bộ bài', 'bài tây', 'bài in logo', 'quà tết'] },
  { id: 'dong-ho', name: 'Đồng hồ in logo', cat: 'qua-tang', mode: 'studio', href: '/studio/clock', blurb: 'Đồng hồ treo tường mặt in logo, ảnh — quà tặng doanh nghiệp.', keywords: ['đồng hồ', 'đồng hồ treo tường', 'đồng hồ in logo', 'quà tặng'] },
];

const strip = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();

const blob = (p: CatalogProduct) =>
  strip([p.name, p.blurb, ...p.keywords, CATEGORIES.find((c) => c.id === p.cat)?.label || ''].join(' '));

/** Lọc sản phẩm theo từ khoá (bỏ dấu) + theo category. */
export function filterProducts(query: string, cat: string | null): CatalogProduct[] {
  const q = strip(query.trim());
  return PRODUCTS.filter((p) => {
    if (cat && p.cat !== cat) return false;
    if (!q) return true;
    return q.split(/\s+/).every((w) => blob(p).includes(w));
  });
}

export const productsByCategory = (catId: string) => PRODUCTS.filter((p) => p.cat === catId);
