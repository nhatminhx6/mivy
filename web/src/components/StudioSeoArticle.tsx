// Khối nội dung SEO (SSR, server component) đặt DƯỚI tool ở các trang mũi nhọn.
// Mục đích: cho Google chữ thật để xếp hạng (tool canvas không có text) + FAQ rich result.
// Dùng <details> native → không cần JS, vẫn SSR. Trang nào chưa khai báo → render null.
import Link from 'next/link';

type Faq = { q: string; a: string };
type RelatedLink = { href: string; label: string };
type Article = {
  heading: string;
  intro: string;
  blocks: { h: string; p: string }[];
  faq: Faq[];
  related?: RelatedLink[];
};

const CONTENT: Record<string, Article> = {
  sticker: {
    heading: 'In sticker & tem nhãn theo yêu cầu — từ thiết kế tới file in chuẩn',
    intro:
      'Mivy cho bạn tự thiết kế sticker, tem nhãn, decal die-cut online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Không cần biết thiết kế, không cần phần mềm, nhận cả đơn lẻ vài chục cái.',
    blocks: [
      {
        h: 'Tự thiết kế rồi ra file in chuẩn trong vài phút',
        p: 'Chọn hình dạng (tròn, vuông, bo góc hoặc die-cut theo đường viền), thêm logo và chữ, chỉnh màu — xong là tải được. Hệ thống tự thêm tràn lề (bleed), vạch cắt bế, dàn màu CMYK và để chữ ở dạng nét (outline) để xưởng in không bị lỗi font hay sai màu.',
      },
      {
        h: 'Vì sao file in chuẩn lại quan trọng',
        p: 'Phần lớn file khách tự mang tới xưởng bị thiếu tràn lề, để hệ màu RGB hoặc chữ chưa chuyển nét nên in ra lệch màu, trắng mép, hỏng chữ. File Mivy xuất ra đã đúng chuẩn nhà in nên vào máy là chạy, đỡ một vòng chỉnh sửa qua lại.',
      },
      {
        h: 'Nhận đơn lẻ, số lượng ít',
        p: 'Nhiều xưởng bỏ qua đơn nhỏ, còn Mivy nhận từ số lượng ít: tem mỹ phẩm, tem nước hoa, nhãn nến thơm, sticker quán cà phê, logo dán laptop… Gửi yêu cầu in, bạn được báo giá nhanh qua Zalo trước khi quyết.',
      },
    ],
    faq: [
      { q: 'In sticker số lượng ít được không?', a: 'Được. Mivy nhận cả đơn lẻ từ vài chục cái, không bắt đặt số lượng lớn như nhiều xưởng.' },
      { q: 'File in sticker cần những gì?', a: 'Cần tràn lề 2–3mm, đường cắt bế, hệ màu CMYK, độ phân giải từ 300dpi và chữ đã chuyển nét. Mivy tự động xuất đúng tất cả khi bạn tải file in.' },
      { q: 'Có những chất liệu sticker nào?', a: 'Phổ biến là decal giấy, decal nhựa (PP), decal trong, decal metalize và decal bế theo hình. Khi báo giá, xưởng sẽ tư vấn chất liệu hợp với sản phẩm của bạn.' },
      { q: 'Quy trình đặt in diễn ra thế nào?', a: 'Bạn thiết kế và bấm Gửi yêu cầu in → nhận báo giá qua Zalo → cọc → in mẫu để duyệt → in cả lô → giao hàng.' },
      { q: 'Giá in sticker bao nhiêu?', a: 'Giá phụ thuộc số lượng, kích thước và chất liệu. Bạn luôn được báo giá cụ thể trước khi in, không phát sinh bất ngờ.' },
    ],
    related: [
      { href: '/in/tem-nuoc-hoa', label: 'In tem nhãn nước hoa' },
      { href: '/in/tem-nhan-fnb', label: 'In tem nhãn F&B, đồ ăn thức uống' },
    ],
  },
  cards: {
    heading: 'Thiết kế thiệp cưới online & in theo yêu cầu',
    intro:
      'Tự thiết kế thiệp cưới, thiệp sinh nhật online miễn phí trên Mivy: chọn mẫu, điền tên và nội dung, xem thành phẩm rồi tải file in chuẩn hoặc gửi yêu cầu in. Nhận cả đơn lẻ, không cần biết thiết kế.',
    blocks: [
      {
        h: 'Chọn mẫu, điền nội dung là xong',
        p: 'Chọn một mẫu thiệp, điền tên cô dâu chú rể (ví dụ Quốc Bảo & Thu Hà), ngày cưới, địa điểm và lời mời. Đổi màu, đổi font, đổi khổ ngay trên màn hình và xem trước thành phẩm trước khi tải.',
      },
      {
        h: 'Ngày âm lịch, file in chuẩn ép kim',
        p: 'Thiệp tự hiển thị được ngày âm lịch kèm ngày dương. Khi tải file in, Mivy xuất PDF đúng khổ kèm tràn lề, vạch cắt, vạch gấp và khuôn ép kim để xưởng gia công đúng ngay từ lần đầu.',
      },
      {
        h: 'In số lượng ít cho đám cưới nhỏ',
        p: 'Không cần đặt hàng trăm tấm. Gửi yêu cầu in, bạn được báo giá nhanh qua Zalo, in mẫu duyệt rồi mới in cả lô — hợp với tiệc nhỏ, tiệc báo hỷ hoặc thiệp mời sự kiện của doanh nghiệp.',
      },
    ],
    faq: [
      { q: 'In thiệp cưới số lượng ít được không?', a: 'Được. Mivy nhận cả đơn lẻ, phù hợp với tiệc nhỏ hoặc khi bạn chỉ cần vài chục tấm.' },
      { q: 'Thiệp có in được ngày âm lịch không?', a: 'Có. Bạn nhập ngày dương, thiệp tự hiển thị kèm ngày âm lịch tương ứng.' },
      { q: 'File in thiệp cưới gồm những gì?', a: 'File PDF đúng khổ, có tràn lề, vạch cắt, vạch gấp và khuôn ép kim nếu mẫu có chi tiết ép kim — đưa thẳng cho xưởng là in được.' },
      { q: 'Có ép kim, dập nổi được không?', a: 'Có. Mẫu hỗ trợ ép kim sẽ xuất sẵn khuôn gia công; khi gửi yêu cầu in bạn nêu nhu cầu để xưởng báo giá đúng.' },
      { q: 'Bao lâu thì nhận được thiệp?', a: 'Sau khi chốt giá và cọc, xưởng in mẫu để bạn duyệt rồi in cả lô. Thời gian tùy số lượng và kiểu gia công, được hẹn rõ khi báo giá.' },
    ],
    related: [
      { href: '/in/thiep-tat-nien', label: 'Thiệp & quà tất niên doanh nghiệp' },
      { href: '/in', label: 'Xem tất cả sản phẩm in' },
    ],
  },
  calendar: {
    heading: 'Thiết kế lịch Tết doanh nghiệp & in theo yêu cầu',
    intro:
      'Tự thiết kế lịch Tết — lịch để bàn, lịch treo tường, lịch bloc — in logo công ty online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Mùa Tết đặt sớm để kịp giao, nhận cả số lượng ít.',
    blocks: [
      {
        h: 'Lịch để bàn, treo tường in logo công ty',
        p: 'Chọn mẫu lịch, thêm logo, slogan và thông tin liên hệ của công ty, chỉnh màu theo bộ nhận diện. Mivy tự dựng phần lịch ngày tháng âm – dương chuẩn cho năm mới, bạn chỉ việc điền nội dung thương hiệu.',
      },
      {
        h: 'File in chuẩn, in bao nhiêu cũng được',
        p: 'File xuất ra đã có tràn lề, vạch cắt và hệ màu CMYK đúng chuẩn nhà in. Lịch Tết là quà tặng khách hàng, đối tác dịp cuối năm nên thường in số lượng vừa phải — Mivy nhận cả đơn ít, không bắt đặt hàng nghìn cuốn.',
      },
      {
        h: 'Đặt sớm cho kịp mùa Tết',
        p: 'Cuối năm xưởng in rất tải, nên đặt lịch sớm để kịp gia công và giao trước Tết. Gửi yêu cầu in, bạn được báo giá nhanh qua Zalo, duyệt mẫu rồi mới in cả lô.',
      },
    ],
    faq: [
      { q: 'In lịch Tết số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng vừa phải, hợp để tặng khách hàng, đối tác dịp cuối năm.' },
      { q: 'Có những loại lịch nào?', a: 'Phổ biến là lịch để bàn, lịch treo tường (lò xo) và lịch bloc. Bạn chọn loại phù hợp rồi thiết kế ngay trên Mivy.' },
      { q: 'Lịch có đúng ngày âm lịch không?', a: 'Có. Phần ngày tháng được dựng sẵn chuẩn âm – dương cho năm mới, bạn chỉ thêm nội dung thương hiệu.' },
      { q: 'Nên đặt in lịch Tết khi nào?', a: 'Càng sớm càng tốt, lý tưởng là trước Tết 4–6 tuần, vì cuối năm xưởng in rất tải và cần thời gian gia công, giao hàng.' },
      { q: 'File in lịch gồm gì?', a: 'File đúng khổ kèm tràn lề, vạch cắt, hệ màu CMYK — đưa thẳng cho xưởng là in được.' },
    ],
    related: [
      { href: '/in/lich-tet', label: 'In lịch Tết doanh nghiệp' },
      { href: '/in/thiep-tat-nien', label: 'Thiệp & quà tất niên' },
    ],
  },
  cardvisit: {
    heading: 'Thiết kế card visit (danh thiếp) online & in theo yêu cầu',
    intro:
      'Tự thiết kế card visit, danh thiếp 2 mặt online miễn phí: chọn mẫu, điền tên, chức danh, số điện thoại, logo — xuất file in chuẩn rồi gửi yêu cầu in. Nhận cả đơn lẻ, không cần biết thiết kế.',
    blocks: [
      {
        h: 'Danh thiếp 2 mặt, đúng chuẩn 9×5,5cm',
        p: 'Chọn mẫu, điền tên (ví dụ Gia Khánh), chức danh, công ty, điện thoại và thêm logo. Mivy dựng đúng khổ danh thiếp tiêu chuẩn, canh lề an toàn để chữ không bị cắt phạm khi xén.',
      },
      {
        h: 'File in chuẩn, không lỗi font lỗi màu',
        p: 'File xuất ra có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét nên vào máy in là chạy, không bị sai màu hay nhảy font — lỗi hay gặp khi mang file tự làm ra tiệm.',
      },
      {
        h: 'In số lượng ít, cán màng, bo góc',
        p: 'Nhận in từ số lượng ít. Khi gửi yêu cầu in, bạn nêu nhu cầu cán mờ/bóng, bo góc hay ép kim để xưởng báo giá đúng, duyệt mẫu rồi in cả lô.',
      },
    ],
    faq: [
      { q: 'In card visit số lượng ít được không?', a: 'Được. Mivy nhận cả đơn lẻ, không bắt đặt số lượng lớn.' },
      { q: 'Kích thước danh thiếp chuẩn là bao nhiêu?', a: 'Phổ biến nhất là 9×5,5cm. Mivy dựng sẵn đúng khổ kèm vùng tràn lề và lề an toàn.' },
      { q: 'Có cán màng, bo góc, ép kim được không?', a: 'Có. Bạn nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá kiểu gia công phù hợp.' },
      { q: 'File in card visit gồm gì?', a: 'File 2 mặt đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá in danh thiếp bao nhiêu?', a: 'Tùy số lượng, loại giấy và gia công. Bạn luôn được báo giá cụ thể trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  packaging: {
    heading: 'Thiết kế hộp giấy & túi giấy in logo theo yêu cầu',
    intro:
      'Tự thiết kế hộp giấy, túi giấy đựng sản phẩm in logo online miễn phí rồi xuất file in chuẩn (đã bế gấp đúng khổ) và gửi yêu cầu in. Nhận cả đơn số lượng ít cho shop, thương hiệu mới.',
    blocks: [
      {
        h: 'Hộp, túi giấy dựng đúng khuôn bế',
        p: 'Chọn kiểu hộp hoặc túi, nhập kích thước, thêm logo và hoạ tiết thương hiệu. Mivy dựng sẵn khuôn bế – gấp theo khổ để xưởng cấn, bế đúng, ráp thành hộp không bị lệch.',
      },
      {
        h: 'File in chuẩn, đúng màu thương hiệu',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK nên in ra đúng màu, gấp ráp gọn. Đỡ được vòng chỉnh sửa file mà khách tự làm hay gặp khi mang ra xưởng.',
      },
      {
        h: 'Nhận đơn ít cho shop, thương hiệu nhỏ',
        p: 'Không cần đặt hàng nghìn cái. Hợp với shop mỹ phẩm, F&B, quà tặng muốn có bao bì riêng từ số lượng ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In hộp giấy, túi giấy số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít, hợp với shop và thương hiệu mới.' },
      { q: 'Có làm được hộp theo kích thước riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn bế – gấp theo đúng khổ đó.' },
      { q: 'File in bao bì gồm gì?', a: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK — đưa thẳng cho xưởng cấn bế, in.' },
      { q: 'Có những chất liệu nào?', a: 'Phổ biến là giấy ivory, kraft, couche cán màng. Xưởng sẽ tư vấn chất liệu hợp với sản phẩm khi báo giá.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }, { href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  label: {
    heading: 'Thiết kế nhãn chai, hũ, lọ & in theo yêu cầu',
    intro:
      'Tự thiết kế nhãn dán chai, hũ, lọ — mật ong, nước mắm, gia vị, mỹ phẩm, nước hoa — online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn lẻ, có đủ chỗ cho thông tin bắt buộc.',
    blocks: [
      {
        h: 'Nhãn quấn chai, hũ đúng kích thước',
        p: 'Chọn mẫu, nhập kích thước nhãn theo chai/hũ của bạn, thêm tên sản phẩm, logo và thành phần. Mivy dựng đúng khổ nhãn quấn, chừa chỗ cho thông tin bắt buộc như thành phần, HSD, mã vạch.',
      },
      {
        h: 'File in chuẩn, không trắng mép khi bóc',
        p: 'File có tràn lề và vạch bế nên khi in dán quanh chai không bị trắng mép, lệch hình. Hệ màu CMYK và chữ chuyển nét giúp in đúng màu, sắc nét cho cả chữ nhỏ.',
      },
      {
        h: 'Chất liệu chống nước, chống dầu',
        p: 'Nhãn chai hũ thường cần decal nhựa chống nước, chống dầu để không bong khi bảo quản lạnh hay dính ẩm. Khi báo giá, xưởng tư vấn chất liệu hợp với sản phẩm của bạn.',
      },
    ],
    faq: [
      { q: 'In nhãn chai, hũ số lượng ít được không?', a: 'Được. Mivy nhận cả đơn lẻ, hợp với cơ sở nhỏ, sản phẩm handmade.' },
      { q: 'Nhãn có chống nước, chống dầu không?', a: 'Có. Thường dùng decal nhựa chống nước; xưởng tư vấn chất liệu khi báo giá theo sản phẩm của bạn.' },
      { q: 'Nhãn có chừa chỗ cho thành phần, mã vạch không?', a: 'Có. Mẫu nhãn chai hũ được dựng để đủ chỗ cho thông tin bắt buộc như thành phần, hạn sử dụng, mã vạch.' },
      { q: 'Làm được nhãn theo kích thước chai riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng nhãn đúng khổ để quấn vừa chai, hũ.' },
      { q: 'File in nhãn gồm gì?', a: 'File có tràn lề, vạch bế, hệ màu CMYK và chữ đã chuyển nét.' },
    ],
    related: [
      { href: '/in/tem-nhan-fnb', label: 'Tem nhãn F&B, thực phẩm' },
      { href: '/in/tem-nuoc-hoa', label: 'Tem nhãn mỹ phẩm, nước hoa' },
    ],
  },
  keychain: {
    heading: 'Thiết kế móc khoá in theo yêu cầu, nhận đơn lẻ',
    intro:
      'Tự thiết kế móc khoá in logo, in hình online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Làm quà tặng, quà sự kiện, lưu niệm quán — nhận cả đơn lẻ, số lượng ít.',
    blocks: [
      {
        h: 'Móc khoá in logo, in hình theo ý bạn',
        p: 'Chọn hình dạng móc khoá, thêm logo, tên hoặc hình ảnh và chỉnh màu. Mivy dựng file đúng khổ kèm đường cắt để xưởng gia công đúng hình, không bị phạm vào chi tiết.',
      },
      {
        h: 'File in chuẩn, nét cả chi tiết nhỏ',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao nên in sắc nét, đúng màu — kể cả logo nhiều chi tiết hay chữ nhỏ.',
      },
      {
        h: 'Quà tặng, lưu niệm từ số lượng ít',
        p: 'Hợp làm quà sự kiện, quà tặng khách, móc khoá lưu niệm cho quán, shop. Gửi yêu cầu in để được báo giá nhanh qua Zalo, in mẫu duyệt rồi in cả lô.',
      },
    ],
    faq: [
      { q: 'In móc khoá số lượng ít được không?', a: 'Được. Mivy nhận cả đơn lẻ, hợp làm quà tặng, lưu niệm.' },
      { q: 'Có những loại móc khoá nào?', a: 'Phổ biến là móc khoá mica (acrylic), móc khoá nhựa dẻo, móc khoá kim loại. Xưởng tư vấn loại hợp nhu cầu khi báo giá.' },
      { q: 'Làm được móc khoá theo hình riêng không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để gia công đúng hình đó.' },
      { q: 'File in móc khoá gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá làm móc khoá bao nhiêu?', a: 'Tùy chất liệu và số lượng. Bạn được báo giá cụ thể trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  cup: {
    heading: 'Thiết kế ly giấy, ly nhựa in logo quán & in theo yêu cầu',
    intro:
      'Tự thiết kế ly giấy, ly nhựa in logo cho quán cà phê, trà sữa online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít cho quán mới mở.',
    blocks: [
      {
        h: 'Ly in logo quán, đúng khổ in quanh thân',
        p: 'Chọn dung tích ly, thêm logo và hoạ tiết thương hiệu. Mivy dựng đúng khổ in trải phẳng quanh thân ly để khi cuốn lại, hình không bị lệch hay đứt nét ở mối nối.',
      },
      {
        h: 'File in chuẩn, đúng màu nhận diện',
        p: 'File có tràn lề, vùng in an toàn và hệ màu CMYK nên in đúng màu thương hiệu, không trắng mép. Chữ chuyển nét giúp logo sắc nét trên chất liệu ly.',
      },
      {
        h: 'Nhận đơn ít cho quán mới mở',
        p: 'Không cần đặt hàng chục nghìn ly. Hợp với quán mới mở muốn có ly riêng từ số lượng vừa phải. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In ly logo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng vừa phải, hợp với quán mới mở.' },
      { q: 'In được trên ly giấy và ly nhựa chứ?', a: 'Được cả hai. Bạn chọn loại ly và dung tích, xưởng tư vấn chất liệu khi báo giá.' },
      { q: 'File in ly gồm gì?', a: 'File trải phẳng đúng khổ thân ly, có tràn lề, vùng in an toàn và hệ màu CMYK.' },
      { q: 'Có in nhiều màu, chuyển sắc không?', a: 'Tùy công nghệ in của xưởng; bạn nêu nhu cầu khi gửi yêu cầu in để được tư vấn và báo giá đúng.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Tem nhãn & bao bì F&B' }],
  },
  flyer: {
    heading: 'Thiết kế tờ rơi, flyer & in theo yêu cầu',
    intro:
      'Tự thiết kế tờ rơi, flyer A5/A6 quảng cáo khai trương, khuyến mãi online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít, giao nhanh.',
    blocks: [
      {
        h: 'Tờ rơi khai trương, khuyến mãi đúng khổ',
        p: 'Chọn mẫu A5 hoặc A6, điền nội dung chương trình, hình ảnh và thông tin liên hệ. Mẫu dựng sẵn bố cục rõ ràng, canh lề an toàn để chữ không bị cắt phạm khi xén.',
      },
      {
        h: 'File in chuẩn, in nhanh số lượng lớn',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK nên in đồng loạt vẫn đúng màu, không lệch. Tờ rơi thường in số lượng lớn để phát — file chuẩn giúp xưởng chạy nhanh, không phải chỉnh sửa lại.',
      },
      {
        h: 'Giấy phù hợp, báo giá trước',
        p: 'Tờ rơi phát tay thường in giấy couche 100–150gsm. Gửi yêu cầu in, bạn được tư vấn loại giấy và báo giá theo số lượng trước khi in.',
      },
    ],
    faq: [
      { q: 'In tờ rơi số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít lẫn in số lượng lớn để phát.' },
      { q: 'Kích thước tờ rơi phổ biến là gì?', a: 'A5 (14,8×21cm) và A6 (10,5×14,8cm) là phổ biến nhất; ngoài ra có tờ gấp (gấp đôi, gấp ba).' },
      { q: 'Nên in tờ rơi giấy gì?', a: 'Thường là giấy couche 100–150gsm. Xưởng tư vấn loại giấy hợp mục đích khi báo giá.' },
      { q: 'File in tờ rơi gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá in tờ rơi bao nhiêu?', a: 'Tùy số lượng và loại giấy; số lượng càng nhiều đơn giá càng rẻ. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  envelope: {
    heading: 'Thiết kế lì xì, phong bì công ty & in theo yêu cầu',
    intro:
      'Tự thiết kế bao lì xì Tết, phong bì công ty in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Đúng mùa Tết, nhận cả đơn số lượng ít — đặt sớm để kịp giao.',
    blocks: [
      {
        h: 'Bao lì xì, phong bì in logo thương hiệu',
        p: 'Chọn mẫu lì xì Tết hoặc phong bì công ty, thêm logo, hoa văn và lời chúc. Mẫu dựng đúng khổ bao lì xì và phong bì tiêu chuẩn, có đường bế – gấp để xưởng gia công đúng.',
      },
      {
        h: 'File in chuẩn, ép kim nổi bật',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK. Lì xì Tết hay dùng ép kim vàng/đỏ — khi gửi yêu cầu in bạn nêu nhu cầu để xưởng xuất khuôn ép và báo giá đúng.',
      },
      {
        h: 'Đặt sớm cho kịp Tết',
        p: 'Cuối năm xưởng in rất tải, lì xì và phong bì Tết nên đặt sớm. Gửi yêu cầu in để được báo giá nhanh qua Zalo, duyệt mẫu rồi in cả lô, giao kịp trước Tết.',
      },
    ],
    faq: [
      { q: 'In bao lì xì số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng vừa phải, hợp để tặng khách, nhân viên dịp Tết.' },
      { q: 'Có ép kim cho lì xì không?', a: 'Có. Mẫu hỗ trợ ép kim sẽ xuất khuôn gia công; nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Nên đặt in lì xì Tết khi nào?', a: 'Càng sớm càng tốt, lý tưởng trước Tết 4–6 tuần vì cuối năm xưởng rất tải.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, đường bế, đường gấp và hệ màu CMYK.' },
      { q: 'Làm được phong bì theo kích thước riêng không?', a: 'Có. Bạn chọn khổ phong bì (A6, DL…) hoặc nhập kích thước riêng.' },
    ],
    related: [
      { href: '/in/lich-tet', label: 'In lịch & quà Tết' },
      { href: '/in/thiep-tat-nien', label: 'Thiệp & quà tất niên' },
    ],
  },
  standee: {
    heading: 'Thiết kế standee quảng cáo & in theo yêu cầu',
    intro:
      'Tự thiết kế standee cuốn (X, chữ Y), standee quảng cáo online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Nhận cả đơn lẻ cho sự kiện, khai trương.',
    blocks: [
      {
        h: 'Standee đúng khổ, chữ to rõ từ xa',
        p: 'Chọn mẫu standee, thêm logo, thông điệp và hình ảnh. Mẫu dựng đúng khổ standee phổ biến (60×160cm, 80×180cm), canh chữ to rõ, đọc được từ xa tại sự kiện.',
      },
      {
        h: 'File in khổ lớn chuẩn, không vỡ hình',
        p: 'File xuất ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in căng bạt/PP không bị vỡ hình, đúng màu thương hiệu.',
      },
      {
        h: 'Nhận đơn lẻ cho sự kiện, khai trương',
        p: 'Chỉ cần 1–2 cái cho buổi khai trương, hội thảo, gian hàng — Mivy vẫn nhận. Gửi yêu cầu in để được báo giá nhanh qua Zalo kèm khung standee nếu cần.',
      },
    ],
    faq: [
      { q: 'In standee 1 cái được không?', a: 'Được. Mivy nhận cả đơn lẻ cho sự kiện, khai trương.' },
      { q: 'Kích thước standee phổ biến là gì?', a: '60×160cm và 80×180cm là hai khổ phổ biến nhất cho standee cuốn.' },
      { q: 'Có kèm khung standee không?', a: 'Có thể in kèm khung (chân X, cuốn). Bạn nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'File in standee gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'In standee bằng chất liệu gì?', a: 'Thường in trên bạt PP hoặc PP cán màng. Xưởng tư vấn chất liệu khi báo giá.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  voucher: {
    heading: 'Thiết kế voucher, thẻ tích điểm & in theo yêu cầu',
    intro:
      'Tự thiết kế voucher giảm giá, thẻ tích điểm, thẻ thành viên in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Hợp quán, shop — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Voucher, thẻ tích điểm in logo quán',
        p: 'Chọn mẫu, thêm logo, mệnh giá hoặc ô tích điểm và điều kiện sử dụng. Mẫu dựng đúng khổ thẻ, canh lề an toàn để thông tin không bị xén phạm.',
      },
      {
        h: 'File in chuẩn, cán màng bền tay',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét. Thẻ tích điểm cầm lâu nên thường cán màng, bo góc — nêu nhu cầu để xưởng báo giá gia công đúng.',
      },
      {
        h: 'Nhận đơn ít cho quán, shop',
        p: 'Không cần in hàng nghìn thẻ. Hợp quán cà phê, spa, shop muốn có chương trình khách thân thiết. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In voucher, thẻ tích điểm số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán, shop.' },
      { q: 'Có cán màng, bo góc không?', a: 'Có. Bạn nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá kiểu gia công.' },
      { q: 'Thẻ có đánh số, mã QR được không?', a: 'Có thể thêm mã QR, số seri trong thiết kế; với số nhảy seri hãy nêu khi gửi yêu cầu để xưởng xử lý.' },
      { q: 'File in thẻ gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá in bao nhiêu?', a: 'Tùy số lượng, loại giấy và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  tote: {
    heading: 'Thiết kế túi vải canvas in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế túi tote canvas in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Làm quà tặng, túi shop dùng lại, túi sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Túi tote in logo, in hình theo ý bạn',
        p: 'Chọn kiểu túi và màu vải, thêm logo, slogan hoặc hình minh hoạ. Mivy dựng file đúng vùng in trên thân túi để khi in lên vải, hình nằm đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn cho in lụa, in chuyển nhiệt',
        p: 'File xuất đúng kích thước vùng in, màu rõ ràng để xưởng in lụa hoặc in chuyển nhiệt lên vải đúng màu, sắc nét. Chữ chuyển nét giúp logo không bị bể.',
      },
      {
        h: 'Quà tặng, túi shop từ số lượng ít',
        p: 'Hợp làm quà tặng khách, túi sự kiện, giải chạy, hoặc túi đựng của shop dùng lại. Gửi yêu cầu in để được báo giá nhanh qua Zalo theo số lượng và kiểu in.',
      },
    ],
    faq: [
      { q: 'In túi vải số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, sự kiện.' },
      { q: 'In túi vải bằng công nghệ gì?', a: 'Thường là in lụa (số lượng nhiều, bền) hoặc in chuyển nhiệt/DTG (hình nhiều màu). Xưởng tư vấn khi báo giá.' },
      { q: 'Có chọn được màu và kiểu túi không?', a: 'Có. Bạn chọn màu vải và kiểu túi trước khi thiết kế phần in.' },
      { q: 'File in túi vải gồm gì?', a: 'File đúng kích thước vùng in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  seal: {
    heading: 'Thiết kế tem bảo hành, tem vỡ, tem niêm phong & in theo yêu cầu',
    intro:
      'Tự thiết kế tem bảo hành, tem vỡ, tem niêm phong chống bóc online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Chống hàng giả, niêm phong sản phẩm — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Tem vỡ, tem bảo hành chống bóc',
        p: 'Chọn mẫu, thêm logo, thông tin bảo hành hoặc ô ghi ngày. Tem vỡ khi bóc sẽ rách, giúp chống tháo lắp và làm giả. Mivy dựng file đúng khổ tem kèm đường cắt.',
      },
      {
        h: 'File in chuẩn, nét cả chữ nhỏ',
        p: 'File có tràn lề, vạch bế, hệ màu CMYK và chữ chuyển nét nên in sắc nét cả chi tiết nhỏ như số seri, mã bảo hành. Vào máy in là chạy, không lỗi font.',
      },
      {
        h: 'Niêm phong hộp, seal dán nắp',
        p: 'Ngoài tem bảo hành, bạn làm được tem niêm phong dán nắp hộp, seal chống mở. Gửi yêu cầu in để được tư vấn chất liệu (decal vỡ, decal bể) và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In tem bảo hành số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít.' },
      { q: 'Tem vỡ khác tem thường thế nào?', a: 'Tem vỡ dùng chất liệu giòn, khi bóc sẽ rách vụn nên không tháo dán lại được — chống làm giả, chống tháo lắp.' },
      { q: 'Có đánh số seri, mã QR được không?', a: 'Có thể thêm mã QR, số seri; với số nhảy seri hãy nêu khi gửi yêu cầu in để xưởng xử lý.' },
      { q: 'File in tem gồm gì?', a: 'File đúng khổ, có tràn lề, vạch bế, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Dùng chất liệu gì?', a: 'Thường là decal vỡ (tem vỡ) hoặc decal giấy/nhựa. Xưởng tư vấn khi báo giá theo nhu cầu.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  hangtag: {
    heading: 'Thiết kế tag treo quần áo, thẻ giá & in theo yêu cầu',
    intro:
      'Tự thiết kế tag treo (hang tag) cho shop thời trang, nhãn giá, thẻ cảm ơn kèm dây online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Tag treo in logo shop thời trang',
        p: 'Chọn mẫu tag, thêm logo, giá, size hoặc lời cảm ơn, chọn vị trí lỗ xỏ dây. Mẫu dựng đúng khổ tag treo phổ biến, canh lề để chữ không bị xén và lỗ không phạm nội dung.',
      },
      {
        h: 'File in chuẩn, cán màng, dập lỗ',
        p: 'File có tràn lề, vạch cắt, vị trí dập lỗ và hệ màu CMYK. Tag treo thường cán mờ/bóng, bo góc, xỏ dây — nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.',
      },
      {
        h: 'Nhận đơn ít cho shop nhỏ',
        p: 'Không cần đặt hàng nghìn tag. Hợp shop thời trang, local brand mới. Gửi yêu cầu in để được báo giá nhanh qua Zalo theo số lượng và kiểu gia công.',
      },
    ],
    faq: [
      { q: 'In tag treo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho shop nhỏ, local brand.' },
      { q: 'Có dập lỗ, xỏ dây sẵn không?', a: 'Có. Bạn nêu nhu cầu dập lỗ và loại dây khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'Có cán màng, bo góc không?', a: 'Có. Tag treo thường cán mờ/bóng và bo góc cho đẹp, bền.' },
      { q: 'File in tag gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, vị trí dập lỗ và hệ màu CMYK.' },
      { q: 'Giá in bao nhiêu?', a: 'Tùy số lượng, loại giấy và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tshirt: {
    heading: 'Thiết kế áo thun đồng phục in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế áo thun đồng phục, áo nhóm, áo sự kiện in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít cho nhóm, công ty, sự kiện.',
    blocks: [
      {
        h: 'Áo thun in logo, đặt vị trí in rõ ràng',
        p: 'Chọn màu áo, thêm logo và chữ, đặt vị trí in (ngực trái, lưng, giữa ngực). Mivy dựng file đúng vùng in để xưởng in đúng vị trí, cân đối trên áo.',
      },
      {
        h: 'File in chuẩn cho in lụa, in chuyển nhiệt',
        p: 'File xuất đúng kích thước hình in, màu rõ ràng để xưởng in lụa (số lượng nhiều) hoặc in chuyển nhiệt/DTG (hình nhiều màu) lên áo đúng màu, sắc nét.',
      },
      {
        h: 'Nhận đơn ít cho nhóm, sự kiện',
        p: 'Không cần đặt hàng trăm áo. Hợp nhóm bạn, lớp, phòng ban, giải chạy, sự kiện. Gửi yêu cầu in để được tư vấn chất vải và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In áo thun số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho nhóm, sự kiện.' },
      { q: 'In áo bằng công nghệ gì?', a: 'Thường là in lụa (số lượng nhiều, bền), in chuyển nhiệt hoặc DTG (hình nhiều màu). Xưởng tư vấn khi báo giá.' },
      { q: 'Chọn được màu áo và chất vải không?', a: 'Có. Bạn chọn màu áo và loại vải (cotton, cá sấu…) trước khi thiết kế phần in.' },
      { q: 'File in áo gồm gì?', a: 'File đúng kích thước hình in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  magnet: {
    heading: 'Thiết kế nam châm tủ lạnh in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế nam châm tủ lạnh in logo, in hình online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Làm quà tặng, lưu niệm, nhắc đặt hàng cho quán — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Nam châm in logo, in hình theo ý bạn',
        p: 'Chọn hình dạng nam châm, thêm logo, số hotline hoặc hình minh hoạ. Mivy dựng file đúng khổ kèm đường cắt để xưởng gia công đúng hình, không phạm vào chi tiết.',
      },
      {
        h: 'File in chuẩn, nét và đúng màu',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao nên in sắc nét, đúng màu — kể cả logo nhiều chi tiết hay chữ nhỏ như số điện thoại.',
      },
      {
        h: 'Quà tặng, nhắc đặt hàng cho quán',
        p: 'Nam châm hotline dán tủ lạnh giúp khách nhớ quán, tiệm — làm quà tặng kèm đơn hàng rất hợp. Gửi yêu cầu in để được báo giá nhanh qua Zalo theo số lượng.',
      },
    ],
    faq: [
      { q: 'In nam châm số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, lưu niệm.' },
      { q: 'Làm được nam châm theo hình riêng không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để gia công đúng hình đó.' },
      { q: 'File in nam châm gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Dùng chất liệu gì?', a: 'Thường là decal in phủ lên tấm nam châm dẻo. Xưởng tư vấn khi báo giá theo nhu cầu.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước và số lượng. Bạn được báo giá cụ thể trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  pricelist: {
    heading: 'Thiết kế bảng giá, menu quán & in theo yêu cầu',
    intro:
      'Tự thiết kế bảng giá dịch vụ, menu quán cà phê, quán ăn online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn lẻ cho quán, tiệm.',
    blocks: [
      {
        h: 'Bảng giá, menu rõ ràng dễ đọc',
        p: 'Chọn mẫu, nhập danh mục món/dịch vụ và giá, thêm logo và hình. Mẫu dựng bố cục rõ ràng, chia nhóm dễ đọc, canh lề an toàn để chữ không bị xén.',
      },
      {
        h: 'File in chuẩn, đúng màu thương hiệu',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK nên in đúng màu, sắc nét cả bảng giá khổ lớn lẫn menu để bàn. Chữ chuyển nét giúp giá tiền, tên món rõ ràng.',
      },
      {
        h: 'Nhiều khổ: để bàn, treo tường, ép nhựa',
        p: 'Làm được menu để bàn, bảng giá treo tường hoặc ép nhựa chống nước. Gửi yêu cầu in để được tư vấn khổ, chất liệu và báo giá theo nhu cầu quán.',
      },
    ],
    faq: [
      { q: 'In bảng giá, menu số lượng ít được không?', a: 'Được. Mivy nhận cả đơn lẻ cho quán, tiệm.' },
      { q: 'Có ép nhựa chống nước cho menu không?', a: 'Có. Menu để bàn thường ép nhựa cho bền, chống nước; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'Cập nhật giá rồi in lại được chứ?', a: 'Được. Bạn sửa nội dung trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Có những khổ nào?', a: 'Menu để bàn (A5, A4), bảng giá treo tường (A3, A2) hoặc khổ riêng theo yêu cầu.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  brochure: {
    heading: 'Thiết kế brochure, catalogue & in theo yêu cầu',
    intro:
      'Tự thiết kế brochure gấp ba, catalogue sản phẩm, hồ sơ năng lực online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít cho doanh nghiệp.',
    blocks: [
      {
        h: 'Brochure gấp, catalogue nhiều trang',
        p: 'Chọn mẫu brochure gấp đôi/gấp ba hoặc catalogue, thêm nội dung, hình sản phẩm và thông tin liên hệ. Mẫu dựng đúng khổ và vị trí nếp gấp để gấp ráp gọn, không lệch.',
      },
      {
        h: 'File in chuẩn, đúng màu sản phẩm',
        p: 'File có tràn lề, vạch cắt, vạch gấp và hệ màu CMYK nên in ra đúng màu, gấp đúng nếp. Hình sản phẩm sắc nét, chữ rõ — hợp để giới thiệu dịch vụ, năng lực.',
      },
      {
        h: 'Nhận đơn ít cho hồ sơ, hội thảo',
        p: 'Không cần in hàng nghìn bản. Hợp hồ sơ năng lực, tài liệu hội thảo, catalogue gửi khách. Gửi yêu cầu in để được tư vấn giấy và báo giá theo số lượng, số trang.',
      },
    ],
    faq: [
      { q: 'In brochure, catalogue số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho doanh nghiệp.' },
      { q: 'Làm được catalogue nhiều trang không?', a: 'Có. Bạn thêm nhiều trang; xưởng đóng gáy (dập ghim, keo nhiệt) tùy số trang.' },
      { q: 'File in brochure gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, vạch gấp và hệ màu CMYK.' },
      { q: 'Nên in giấy gì?', a: 'Thường là couche 150–300gsm cán màng. Xưởng tư vấn khi báo giá theo mục đích.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng, số trang và loại giấy. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tape: {
    heading: 'Thiết kế băng keo in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế băng keo đóng hàng in tên shop, in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Gói hàng online chuyên nghiệp — nhận cả đơn số lượng vừa phải.',
    blocks: [
      {
        h: 'Băng keo in tên shop, logo lặp',
        p: 'Chọn khổ băng keo, thêm logo, tên shop hoặc thông điệp. Mivy dựng file lặp liền mạch để in trên cuộn, dán tới đâu cũng thấy thương hiệu.',
      },
      {
        h: 'File in chuẩn, nét trên nền trong/đục',
        p: 'File đúng khổ bản keo, màu rõ ràng để in trên băng keo trong hoặc đục đều đẹp. Chữ chuyển nét giúp tên shop sắc nét dù khổ in hẹp.',
      },
      {
        h: 'Gói hàng online chuyên nghiệp',
        p: 'Băng keo in logo giúp kiện hàng nhìn chuyên nghiệp, tăng nhận diện khi giao. Gửi yêu cầu in để được tư vấn khổ, số màu và báo giá theo số lượng cuộn.',
      },
    ],
    faq: [
      { q: 'In băng keo logo tối thiểu bao nhiêu?', a: 'Băng keo thường in theo số lượng cuộn; Mivy báo giá theo nhu cầu, nhận cả đơn vừa phải cho shop.' },
      { q: 'In được mấy màu?', a: 'Thường in 1–2 màu trên nền trong hoặc đục. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Khổ băng keo phổ biến là gì?', a: 'Phổ biến là bản 4,8cm và 6cm. Bạn chọn khổ khi thiết kế.' },
      { q: 'File in băng keo gồm gì?', a: 'File đúng khổ bản keo, hoạ tiết lặp liền mạch, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  mug: {
    heading: 'Thiết kế ly sứ in hình, in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế ly sứ in hình, in logo làm quà tặng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng khách, quà sự kiện, lưu niệm — nhận cả 1 cái.',
    blocks: [
      {
        h: 'Ly sứ in hình, in logo theo ý bạn',
        p: 'Chọn kiểu ly, thêm logo, tên hoặc hình ảnh và chỉnh màu. Mivy dựng file đúng vùng in quanh thân ly để hình nằm đúng vị trí, cân đối khi in chuyển nhiệt.',
      },
      {
        h: 'File in chuẩn, lên màu đẹp trên sứ',
        p: 'File đúng kích thước vùng in, màu rõ ràng để in chuyển nhiệt lên ly sứ đúng màu, nét. Chữ chuyển nét giúp logo và tên không bị bể.',
      },
      {
        h: 'Quà tặng, lưu niệm từ 1 cái',
        p: 'Hợp làm quà tặng in ảnh riêng, quà sự kiện, quà doanh nghiệp. Mivy nhận cả 1 cái. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In ly sứ 1 cái được không?', a: 'Được. Mivy nhận cả 1 cái, hợp làm quà tặng in ảnh riêng.' },
      { q: 'In ly sứ bằng công nghệ gì?', a: 'Thường là in chuyển nhiệt (sublimation) lên ly phủ lớp in. Bền màu, rửa được nhẹ nhàng.' },
      { q: 'Dùng được hình ảnh của tôi không?', a: 'Được. Bạn thêm ảnh/logo riêng; nên dùng ảnh rõ nét để in đẹp.' },
      { q: 'File in ly gồm gì?', a: 'File đúng kích thước vùng in quanh thân ly, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá in ly sứ bao nhiêu?', a: 'Tùy số lượng và kiểu ly. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  notebook: {
    heading: 'Thiết kế sổ tay in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế sổ tay, sổ ghi chú in logo công ty online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng doanh nghiệp, văn phòng phẩm thương hiệu — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Sổ tay in logo bìa, ruột theo ý bạn',
        p: 'Chọn khổ sổ, thiết kế bìa với logo và hoạ tiết thương hiệu, chọn kiểu ruột (kẻ ngang, chấm, trơn). Mivy dựng file bìa đúng khổ kèm gáy để xưởng gia công đúng.',
      },
      {
        h: 'File in chuẩn, bìa đẹp đúng màu',
        p: 'File bìa có tràn lề, vạch cắt và hệ màu CMYK nên in đúng màu thương hiệu, sắc nét. Bìa thường cán màng, ép kim — nêu nhu cầu để xưởng báo giá gia công.',
      },
      {
        h: 'Quà tặng doanh nghiệp, hội thảo',
        p: 'Sổ tay in logo là quà tặng khách, nhân viên, tài liệu hội thảo rất phổ biến. Gửi yêu cầu in để được tư vấn kiểu đóng gáy và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In sổ tay số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Chọn được kiểu ruột và đóng gáy không?', a: 'Có. Bạn chọn ruột (kẻ ngang, chấm, trơn) và kiểu đóng (lò xo, keo nhiệt, chỉ). Xưởng tư vấn khi báo giá.' },
      { q: 'Bìa có ép kim, cán màng không?', a: 'Có. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá kiểu gia công bìa.' },
      { q: 'File in sổ gồm gì?', a: 'File bìa đúng khổ kèm gáy, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy khổ, số trang và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  foodbox: {
    heading: 'Thiết kế hộp đồ ăn, hộp pizza in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp pizza, hộp cơm, hộp burger, khay giấy in logo quán online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Đồ mang đi chuyên nghiệp — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp đồ ăn in logo, dựng đúng khuôn bế',
        p: 'Chọn kiểu hộp (pizza, cơm, burger, khay), nhập kích thước, thêm logo và hoạ tiết. Mivy dựng khuôn bế – gấp theo khổ để xưởng cấn, bế đúng, ráp thành hộp chắc.',
      },
      {
        h: 'File in chuẩn, mực an toàn thực phẩm',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK. Hộp đựng đồ ăn cần in mặt ngoài với mực phù hợp — xưởng tư vấn chất liệu và loại mực khi báo giá.',
      },
      {
        h: 'Nhận đơn ít cho quán mới',
        p: 'Không cần đặt hàng nghìn hộp. Hợp quán đồ ăn mới mở muốn có bao bì mang đi riêng. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In hộp đồ ăn số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán mới mở.' },
      { q: 'Mực in có an toàn với thực phẩm không?', a: 'Hộp đựng đồ ăn in mặt ngoài với mực phù hợp; xưởng tư vấn chất liệu, loại mực đạt yêu cầu khi báo giá.' },
      { q: 'Làm được hộp theo kích thước riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn bế – gấp theo đúng khổ đó.' },
      { q: 'File in hộp gồm gì?', a: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }],
  },
  banner: {
    heading: 'Thiết kế banner, backdrop & in theo yêu cầu',
    intro:
      'Tự thiết kế banner quảng cáo, backdrop sự kiện, phông chụp hình online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Nhận cả đơn lẻ cho sự kiện, khai trương.',
    blocks: [
      {
        h: 'Banner, backdrop đúng khổ, chữ to rõ',
        p: 'Chọn mẫu, nhập kích thước theo không gian, thêm logo, thông điệp và hình. Mẫu canh bố cục để chữ chính to rõ, đọc được từ xa; logo nhà tài trợ sắp xếp gọn gàng.',
      },
      {
        h: 'File in khổ lớn chuẩn, không vỡ hình',
        p: 'File xuất ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in bạt hiflex/PP không bị vỡ hình, đúng màu thương hiệu dù phóng to.',
      },
      {
        h: 'Nhận đơn lẻ cho sự kiện, khai trương',
        p: 'Chỉ cần 1 tấm backdrop cho buổi lễ, 1 banner khai trương — Mivy vẫn nhận. Gửi yêu cầu in để được tư vấn chất liệu (hiflex, PP, canvas) và báo giá theo m².',
      },
    ],
    faq: [
      { q: 'In banner, backdrop 1 tấm được không?', a: 'Được. Mivy nhận cả đơn lẻ cho sự kiện, khai trương.' },
      { q: 'In chất liệu gì?', a: 'Thường là bạt hiflex (ngoài trời), PP hoặc canvas (trong nhà). Xưởng tư vấn khi báo giá.' },
      { q: 'Làm được khổ lớn theo không gian không?', a: 'Có. Bạn nhập kích thước theo tường/không gian, Mivy dựng file đúng tỷ lệ đó.' },
      { q: 'File in banner gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Giá tính thế nào?', a: 'Thường tính theo mét vuông và chất liệu. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  carton: {
    heading: 'Thiết kế thùng carton in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế thùng carton ship hàng in logo shop online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Gói hàng online chuyên nghiệp — nhận cả đơn số lượng vừa phải.',
    blocks: [
      {
        h: 'Thùng carton in logo shop, đúng kích thước',
        p: 'Chọn kích thước thùng, chọn số lớp (3 lớp, 5 lớp), thêm logo và tên shop. Mivy dựng file in theo khuôn thùng để in 1–2 màu lên mặt ngoài đúng vị trí, không lệch.',
      },
      {
        h: 'File in chuẩn cho in flexo 1–2 màu',
        p: 'File đúng khuôn trải của thùng, nét in rõ ràng để xưởng in flexo 1–2 màu lên carton đều, không mờ. Logo và tên shop hiện rõ trên kiện hàng.',
      },
      {
        h: 'Gói hàng online nhìn chuyên nghiệp',
        p: 'Thùng carton in logo giúp kiện hàng nhận diện tốt, tăng uy tín khi giao. Gửi yêu cầu in để được tư vấn số lớp, kích thước và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In thùng carton logo tối thiểu bao nhiêu?', a: 'Thường in theo số lượng; Mivy báo giá theo nhu cầu và nhận cả đơn vừa phải cho shop.' },
      { q: 'In được mấy màu trên thùng?', a: 'Thường in flexo 1–2 màu trên carton. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Chọn được số lớp và kích thước không?', a: 'Có. Bạn chọn 3 lớp hoặc 5 lớp và nhập kích thước thùng theo sản phẩm.' },
      { q: 'File in thùng gồm gì?', a: 'File theo khuôn trải của thùng, nét in rõ, đúng vị trí mặt ngoài.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  foodbag: {
    heading: 'Thiết kế túi giấy đựng đồ ăn in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế túi giấy kraft đựng đồ ăn, túi bánh mì chống dầu in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Đồ mang đi chuyên nghiệp — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Túi giấy đồ ăn in logo quán',
        p: 'Chọn kiểu túi (đáy vuông, túi bánh mì, túi SOS), nhập kích thước, thêm logo và hoạ tiết. Mivy dựng file đúng khuôn túi để in đúng vị trí, gấp dán gọn.',
      },
      {
        h: 'File in chuẩn, chống dầu vẫn nét',
        p: 'File có tràn lề, đường gấp và hệ màu CMYK. Túi đồ ăn thường dùng giấy kraft chống dầu — xưởng tư vấn chất liệu, loại mực phù hợp thực phẩm khi báo giá.',
      },
      {
        h: 'Nhận đơn ít cho quán mang đi',
        p: 'Không cần đặt hàng nghìn túi. Hợp quán bánh mì, đồ ăn vặt, take away mới mở. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In túi giấy đồ ăn số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán mang đi.' },
      { q: 'Túi có chống dầu không?', a: 'Có. Túi đồ ăn thường dùng giấy kraft chống dầu; xưởng tư vấn chất liệu, mực đạt yêu cầu khi báo giá.' },
      { q: 'Làm được túi theo kích thước riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn túi theo đúng khổ đó.' },
      { q: 'File in túi gồm gì?', a: 'File có tràn lề, đường gấp và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }],
  },
  apron: {
    heading: 'Thiết kế tạp dề in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế tạp dề in logo cho quán cà phê, nhà hàng, tiệm bánh online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Đồng phục pha chế, bếp — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Tạp dề in logo quán, đặt vị trí rõ ràng',
        p: 'Chọn kiểu và màu tạp dề, thêm logo, tên quán hoặc tên nhân viên, đặt vị trí in (ngực, túi trước). Mivy dựng file đúng vùng in để in cân đối trên tạp dề.',
      },
      {
        h: 'File in chuẩn cho in lụa, thêu',
        p: 'File đúng kích thước hình in, màu rõ ràng để xưởng in lụa hoặc thêu logo lên vải đúng màu, bền. Chữ chuyển nét giúp logo không bị bể.',
      },
      {
        h: 'Đồng phục pha chế, bếp từ số lượng ít',
        p: 'Hợp quán cà phê, trà sữa, nhà hàng, tiệm bánh muốn đồng phục gọn gàng. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất vải và báo giá.',
      },
    ],
    faq: [
      { q: 'In tạp dề số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán, tiệm.' },
      { q: 'In logo lên tạp dề bằng cách nào?', a: 'Thường là in lụa hoặc thêu. In lụa hợp số lượng nhiều, thêu bền và sang. Xưởng tư vấn khi báo giá.' },
      { q: 'Chọn được màu và kiểu tạp dề không?', a: 'Có. Bạn chọn màu vải và kiểu (yếm, ngang eo) trước khi thiết kế phần in.' },
      { q: 'File in tạp dề gồm gì?', a: 'File đúng kích thước hình in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy chất vải, kiểu in và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  cap: {
    heading: 'Thiết kế mũ lưỡi trai in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế mũ lưỡi trai, nón kết in/thêu logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Đồng phục, quà tặng, quà sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Mũ lưỡi trai in/thêu logo theo ý bạn',
        p: 'Chọn màu mũ, thêm logo hoặc chữ, đặt vị trí (trước, bên hông, sau). Mivy dựng file đúng vùng trang trí để xưởng in hoặc thêu logo đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, logo nét khi thêu/in',
        p: 'File đúng kích thước, màu rõ ràng để thêu vi tính hoặc in chuyển nhiệt lên mũ sắc nét. Chữ chuyển nét giúp logo không bị bể khi thu nhỏ.',
      },
      {
        h: 'Đồng phục, quà sự kiện từ số lượng ít',
        p: 'Hợp đồng phục công ty, nón sự kiện, quà tặng khách. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn kiểu mũ và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In mũ lưỡi trai số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho đồng phục, sự kiện.' },
      { q: 'In hay thêu logo lên mũ?', a: 'Cả hai. Thêu bền và sang, in chuyển nhiệt hợp hình nhiều màu. Xưởng tư vấn khi báo giá.' },
      { q: 'Chọn được màu và kiểu mũ không?', a: 'Có. Bạn chọn màu và kiểu mũ (lưỡi trai, snapback, bucket) trước khi thiết kế.' },
      { q: 'File in mũ gồm gì?', a: 'File đúng kích thước vùng trang trí, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu mũ, kiểu in/thêu và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  ribbon: {
    heading: 'Thiết kế ruy băng in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế ruy băng satin in logo, in chữ online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Buộc hộp quà, bó hoa, bánh — nhận cả đơn số lượng vừa phải.',
    blocks: [
      {
        h: 'Ruy băng in logo, in chữ lặp',
        p: 'Chọn bản ruy băng, màu nền và màu chữ, thêm logo hoặc tên shop. Mivy dựng file lặp liền mạch để in trên dây, buộc tới đâu cũng thấy thương hiệu.',
      },
      {
        h: 'File in chuẩn, nét trên bản hẹp',
        p: 'File đúng bản ruy băng, màu rõ ràng để in nhũ hoặc in thường lên satin đẹp, sắc nét dù bản hẹp. Chữ chuyển nét giúp tên shop không bị bể.',
      },
      {
        h: 'Gói quà, bó hoa, bánh sang hơn',
        p: 'Ruy băng in logo giúp hộp quà, bó hoa, bánh nhìn chỉn chu, tăng nhận diện thương hiệu. Gửi yêu cầu in để được tư vấn bản, màu và báo giá theo số mét/cuộn.',
      },
    ],
    faq: [
      { q: 'In ruy băng logo số lượng ít được không?', a: 'Thường in theo cuộn/số mét; Mivy báo giá theo nhu cầu và nhận cả đơn vừa phải.' },
      { q: 'In nhũ được không?', a: 'Được. Ruy băng hay in nhũ vàng/bạc cho sang. Nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'Chọn được bản và màu ruy băng không?', a: 'Có. Bạn chọn bản (1cm, 2,5cm…) và màu nền trước khi thiết kế phần in.' },
      { q: 'File in ruy băng gồm gì?', a: 'File đúng bản, hoạ tiết lặp liền mạch, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  giftwrap: {
    heading: 'Thiết kế giấy gói quà in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế giấy gói quà, giấy pelure in logo lặp online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Gói hàng, gói quà sang hơn — nhận cả đơn số lượng vừa phải.',
    blocks: [
      {
        h: 'Giấy gói quà in logo lặp liền mạch',
        p: 'Chọn hoa văn, màu nền, thêm logo hoặc tên shop. Mivy dựng file lặp liền mạch (seamless) để in khổ lớn, cắt tới đâu hoa văn vẫn liền, không đứt mạch.',
      },
      {
        h: 'File in chuẩn, màu đều trên khổ lớn',
        p: 'File đúng khổ in, hoạ tiết lặp chính xác và hệ màu CMYK nên in đều màu, không lệch mạch. Phù hợp giấy gói, giấy pelure, giấy lụa.',
      },
      {
        h: 'Gói hàng, gói quà sang hơn',
        p: 'Giấy gói in thương hiệu giúp sản phẩm nhìn chỉn chu, tăng trải nghiệm mở hộp. Gửi yêu cầu in để được tư vấn loại giấy và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In giấy gói quà số lượng ít được không?', a: 'Thường in theo số lượng tờ/khổ; Mivy báo giá theo nhu cầu và nhận cả đơn vừa phải.' },
      { q: 'Hoa văn có bị đứt mạch khi cắt không?', a: 'Không. File dựng lặp liền mạch (seamless) nên cắt tới đâu hoa văn vẫn liền.' },
      { q: 'In được giấy gì?', a: 'Phổ biến là giấy gói, pelure, giấy lụa. Xưởng tư vấn loại giấy khi báo giá.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, hoạ tiết lặp liền mạch và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  cakebox: {
    heading: 'Thiết kế hộp bánh kem, hộp cupcake in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp bánh kem có cửa sổ, hộp cupcake in logo tiệm online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Tiệm bánh chuyên nghiệp hơn — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp bánh kem, cupcake in logo tiệm',
        p: 'Chọn kiểu hộp (bánh kem, cupcake), nhập kích thước, thêm logo và hoạ tiết. Mivy dựng khuôn bế – gấp theo khổ, chừa cửa sổ nếu cần, để xưởng cấn bế đúng.',
      },
      {
        h: 'File in chuẩn, đúng màu thương hiệu',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK nên in đúng màu, gấp ráp gọn. Hộp bánh đẹp giúp tiệm nhìn chuyên nghiệp, hợp để tặng và bán.',
      },
      {
        h: 'Nhận đơn ít cho tiệm bánh nhỏ',
        p: 'Không cần đặt hàng nghìn hộp. Hợp tiệm bánh, home bakery muốn có hộp riêng. Gửi yêu cầu in để được tư vấn chất liệu và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In hộp bánh kem số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho tiệm bánh nhỏ, home bakery.' },
      { q: 'Có làm hộp có cửa sổ không?', a: 'Có. Mẫu hộp bánh kem thường có cửa sổ nhìn bánh; Mivy chừa sẵn vị trí khi dựng khuôn.' },
      { q: 'Làm được hộp theo kích thước bánh riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn bế theo đúng khổ đó.' },
      { q: 'File in hộp gồm gì?', a: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }],
  },
  plasticbag: {
    heading: 'Thiết kế túi xốp, túi nilon in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế túi xốp, túi nilon (PE) in logo shop online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Túi đựng cho shop, cửa hàng — nhận cả đơn số lượng vừa phải.',
    blocks: [
      {
        h: 'Túi xốp, túi PE in tên shop',
        p: 'Chọn kiểu túi (quai đục lỗ, quai xách), nhập kích thước, thêm logo và tên shop. Mivy dựng file đúng khổ túi để in logo lên mặt túi đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, nét trên nền túi',
        p: 'File đúng khổ túi, màu rõ ràng để in logo lên túi xốp/PE đều, nét. Chữ chuyển nét giúp tên shop sắc nét dù in trên chất liệu nhựa.',
      },
      {
        h: 'Túi đựng cho shop, cửa hàng',
        p: 'Túi in logo giúp khách mang đồ về mà vẫn thấy thương hiệu, tăng nhận diện. Gửi yêu cầu in để được tư vấn chất liệu, số màu và báo giá theo số lượng/kg.',
      },
    ],
    faq: [
      { q: 'In túi xốp, túi nilon logo tối thiểu bao nhiêu?', a: 'Thường in theo số lượng/kg; Mivy báo giá theo nhu cầu và nhận cả đơn vừa phải cho shop.' },
      { q: 'In được mấy màu?', a: 'Thường in 1–2 màu lên túi. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Chọn được kiểu và kích thước túi không?', a: 'Có. Bạn chọn kiểu (quai đục lỗ, quai xách) và nhập kích thước theo nhu cầu.' },
      { q: 'File in túi gồm gì?', a: 'File đúng khổ túi, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  namelabel: {
    heading: 'Thiết kế nhãn tên học sinh & in theo yêu cầu',
    intro:
      'Tự thiết kế nhãn tên dán vở, bình nước, đồ dùng của bé online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Chống nước, dễ thương — nhận cả 1 tờ nhiều nhãn.',
    blocks: [
      {
        h: 'Tờ nhãn tên nhiều cái, in tên bé',
        p: 'Chọn mẫu, nhập tên bé (ví dụ Gia Hân), chọn hình minh hoạ và màu. Mivy dàn nhiều nhãn trên một tờ, có đường cắt rõ để cắt rời dễ dàng.',
      },
      {
        h: 'File in chuẩn, chống nước bền',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK. Nhãn dán bình nước, hộp cơm cần decal chống nước — xưởng tư vấn chất liệu để dán không bong khi rửa.',
      },
      {
        h: 'Dán vở, bình nước, đồ dùng của bé',
        p: 'Nhãn tên giúp bé không lẫn đồ dùng ở lớp. Gửi yêu cầu in để được tư vấn chất liệu chống nước và báo giá theo số tờ.',
      },
    ],
    faq: [
      { q: 'In nhãn tên học sinh số lượng ít được không?', a: 'Được. Một tờ đã có nhiều nhãn; Mivy nhận cả đơn ít.' },
      { q: 'Nhãn có chống nước không?', a: 'Có. Dán bình nước, hộp cơm thường dùng decal chống nước; xưởng tư vấn chất liệu khi báo giá.' },
      { q: 'In được nhiều tên khác nhau trên một tờ không?', a: 'Thường một tờ cho một bé; nếu cần nhiều tên hãy nêu khi gửi yêu cầu in để xưởng xử lý.' },
      { q: 'File in nhãn gồm gì?', a: 'File đúng khổ tờ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số tờ và chất liệu. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  shelftalker: {
    heading: 'Thiết kế tem kệ, wobbler quảng cáo & in theo yêu cầu',
    intro:
      'Tự thiết kế tem kệ, wobbler, thẻ treo kệ quảng cáo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Hút mắt tại điểm bán — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Tem kệ, wobbler hút mắt tại điểm bán',
        p: 'Chọn mẫu, thêm thông điệp khuyến mãi, giá, logo. Mivy dựng file đúng khổ wobbler kèm vị trí chân lò xo/dán để treo nhún trên kệ, thu hút khách khi lướt qua.',
      },
      {
        h: 'File in chuẩn, màu nổi bật',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in màu nổi bật, chữ rõ. Giá và thông điệp khuyến mãi hiện rõ để kích thích mua hàng.',
      },
      {
        h: 'Chiến dịch khuyến mãi từ số lượng ít',
        p: 'Hợp siêu thị mini, cửa hàng, quầy trưng bày cần làm nổi sản phẩm trong đợt sale. Gửi yêu cầu in để được tư vấn kiểu treo và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In tem kệ, wobbler số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho cửa hàng, quầy trưng bày.' },
      { q: 'Wobbler treo nhún thế nào?', a: 'Dùng chân lò xo dán vào kệ để tem nhún khi có gió/di chuyển, hút mắt. Mivy chừa sẵn vị trí khi dựng file.' },
      { q: 'Có cán màng không?', a: 'Có. Tem kệ thường cán màng cho bền; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho cửa hàng, F&B' }],
  },
  drawstring: {
    heading: 'Thiết kế túi rút in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế túi rút dây (vải dù, canvas) in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà sự kiện, giải chạy, CLB — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Túi rút in logo theo ý bạn',
        p: 'Chọn màu túi và chất liệu (dù, canvas), thêm logo và chữ, đặt vị trí in trên thân túi. Mivy dựng file đúng vùng in để in cân đối, đẹp.',
      },
      {
        h: 'File in chuẩn cho in lụa, chuyển nhiệt',
        p: 'File đúng kích thước hình in, màu rõ ràng để in lụa (số lượng nhiều) hoặc in chuyển nhiệt (hình nhiều màu) lên vải túi đúng màu, bền.',
      },
      {
        h: 'Quà sự kiện, giải chạy từ số lượng ít',
        p: 'Hợp quà sự kiện, túi vận động viên, quà tặng CLB. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In túi rút số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sự kiện, CLB.' },
      { q: 'In túi rút bằng công nghệ gì?', a: 'Thường là in lụa hoặc in chuyển nhiệt. Xưởng tư vấn hợp số lượng và hình khi báo giá.' },
      { q: 'Chọn được màu và chất liệu túi không?', a: 'Có. Bạn chọn màu và chất liệu (dù, canvas) trước khi thiết kế phần in.' },
      { q: 'File in túi gồm gì?', a: 'File đúng kích thước hình in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tumbler: {
    heading: 'Thiết kế bình giữ nhiệt in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế bình giữ nhiệt, ly giữ nhiệt in logo làm quà tặng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà doanh nghiệp, quà sự kiện — nhận cả số lượng ít.',
    blocks: [
      {
        h: 'Bình giữ nhiệt in logo theo ý bạn',
        p: 'Chọn kiểu bình, thêm logo, tên hoặc hình, chỉnh màu. Mivy dựng file đúng vùng in quanh thân bình để in laser/UV hoặc chuyển nhiệt đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, logo nét trên kim loại',
        p: 'File đúng kích thước vùng in, màu rõ ràng để khắc laser, in UV hoặc in chuyển nhiệt lên bình đúng màu, nét. Chữ chuyển nét giúp logo không bị bể.',
      },
      {
        h: 'Quà tặng doanh nghiệp, sự kiện',
        p: 'Bình giữ nhiệt in logo là quà tặng cao cấp, bền, hay dùng dịp sự kiện, tri ân. Mivy nhận cả số lượng ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In bình giữ nhiệt số lượng ít được không?', a: 'Được. Mivy nhận cả số lượng ít cho quà tặng.' },
      { q: 'In logo lên bình bằng cách nào?', a: 'Thường là khắc laser, in UV hoặc in chuyển nhiệt. Xưởng tư vấn hợp chất liệu bình khi báo giá.' },
      { q: 'Chọn được kiểu và màu bình không?', a: 'Có. Bạn chọn kiểu và màu bình trước khi thiết kế phần in.' },
      { q: 'File in bình gồm gì?', a: 'File đúng kích thước vùng in quanh thân, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu bình, kiểu in và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  luggagetag: {
    heading: 'Thiết kế thẻ hành lý in tên & in theo yêu cầu',
    intro:
      'Tự thiết kế thẻ hành lý (luggage tag) in tên, in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng du lịch, nhận diện vali — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Thẻ hành lý in tên, in logo',
        p: 'Chọn mẫu thẻ, thêm tên, thông tin liên hệ hoặc logo, chọn vị trí xỏ dây. Mivy dựng file đúng khổ thẻ kèm vị trí dập lỗ để gia công đúng.',
      },
      {
        h: 'File in chuẩn, bền khi va đập',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK. Thẻ hành lý hay ép nhựa hoặc làm da/nhựa cứng cho bền — nêu nhu cầu để xưởng báo giá chất liệu.',
      },
      {
        h: 'Quà du lịch, nhận diện vali',
        p: 'Thẻ hành lý giúp nhận ra vali nhanh, làm quà tặng du lịch rất hợp. Gửi yêu cầu in để được tư vấn chất liệu và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In thẻ hành lý số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Chất liệu thẻ hành lý là gì?', a: 'Thường là nhựa ép, PVC hoặc da. Xưởng tư vấn chất liệu bền khi báo giá.' },
      { q: 'Có xỏ dây sẵn không?', a: 'Có. Bạn nêu nhu cầu dây khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'File in thẻ gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, vị trí dập lỗ và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy chất liệu và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  windowdecal: {
    heading: 'Thiết kế decal dán kính & in theo yêu cầu',
    intro:
      'Tự thiết kế decal dán kính cho cửa hàng, văn phòng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Trang trí mặt tiền, giờ mở cửa, khuyến mãi — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Decal dán kính mặt tiền, văn phòng',
        p: 'Chọn mẫu, thêm logo, giờ mở cửa hoặc thông điệp khuyến mãi, nhập kích thước theo ô kính. Mivy dựng file đúng khổ để cắt/in decal dán vừa vặn.',
      },
      {
        h: 'File in chuẩn cho decal trong, mờ, bế chữ',
        p: 'File đúng khổ, có vạch cắt/bế và hệ màu CMYK. Decal kính có loại trong, mờ (mịn kính) hoặc bế chữ dán — nêu nhu cầu để xưởng tư vấn và báo giá.',
      },
      {
        h: 'Trang trí mặt tiền, nhận đơn lẻ',
        p: 'Chỉ cần dán 1 ô kính cũng làm được. Hợp quán, shop, văn phòng muốn mặt tiền chuyên nghiệp. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In decal dán kính đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một ô kính.' },
      { q: 'Có những loại decal kính nào?', a: 'Phổ biến là decal trong, decal mờ (giả kính mịn) và bế chữ dán. Xưởng tư vấn hợp mục đích khi báo giá.' },
      { q: 'Làm được theo kích thước ô kính riêng không?', a: 'Có. Bạn nhập kích thước theo ô kính, Mivy dựng file đúng khổ đó.' },
      { q: 'File in decal gồm gì?', a: 'File đúng khổ, có vạch cắt/bế và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  bookmark: {
    heading: 'Thiết kế bookmark kẹp sách & in theo yêu cầu',
    intro:
      'Tự thiết kế bookmark (dấu trang) kẹp sách in hình, in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng, lưu niệm nhà sách — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bookmark in hình, in chữ theo ý bạn',
        p: 'Chọn mẫu, thêm hình, trích dẫn hoặc logo, chọn vị trí dập lỗ xỏ tua. Mivy dựng file đúng khổ bookmark kèm vạch cắt để gia công đúng.',
      },
      {
        h: 'File in chuẩn, nét hai mặt',
        p: 'File 2 mặt có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in sắc nét, đúng màu. Bookmark thường cán màng cho bền — nêu nhu cầu để báo giá.',
      },
      {
        h: 'Quà tặng, lưu niệm nhà sách',
        p: 'Hợp quà tặng kèm sách, lưu niệm nhà sách, quà sự kiện văn hoá đọc. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In bookmark số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Có cán màng, dập lỗ xỏ tua không?', a: 'Có. Bookmark thường cán màng và dập lỗ xỏ tua; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'In được hai mặt không?', a: 'Được. Mivy dựng file 2 mặt đúng khổ, canh lề an toàn.' },
      { q: 'File in bookmark gồm gì?', a: 'File 2 mặt đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng, loại giấy và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  postcard: {
    heading: 'Thiết kế postcard, bưu thiếp & in theo yêu cầu',
    intro:
      'Tự thiết kế postcard, bưu thiếp in hình online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng, lưu niệm du lịch, thiệp cảm ơn — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Postcard in hình hai mặt',
        p: 'Chọn mẫu, thêm hình mặt trước và nội dung mặt sau (lời chúc, ô ghi địa chỉ, tem). Mivy dựng file 2 mặt đúng khổ bưu thiếp, canh lề an toàn.',
      },
      {
        h: 'File in chuẩn, hình sắc nét',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao nên hình in sắc nét, đúng màu. Chữ chuyển nét giúp lời chúc, thông tin rõ ràng.',
      },
      {
        h: 'Quà tặng, lưu niệm, thiệp cảm ơn',
        p: 'Hợp quà tặng, lưu niệm du lịch, thiệp cảm ơn kèm đơn hàng. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn giấy và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In postcard số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, lưu niệm.' },
      { q: 'In được hai mặt không?', a: 'Được. Mivy dựng file 2 mặt đúng khổ bưu thiếp.' },
      { q: 'Nên in giấy gì?', a: 'Thường là giấy mỹ thuật hoặc couche dày 250–300gsm. Xưởng tư vấn khi báo giá.' },
      { q: 'File in postcard gồm gì?', a: 'File 2 mặt đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng và loại giấy. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tabletent: {
    heading: 'Thiết kế tent card để bàn & in theo yêu cầu',
    intro:
      'Tự thiết kế tent card (thẻ chữ A để bàn) quảng cáo món, khuyến mãi, mã QR online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Hợp quán, nhà hàng — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Tent card để bàn, hai mặt chữ A',
        p: 'Chọn mẫu, thêm hình món, giá, mã QR hoặc thông điệp. Mivy dựng file hai mặt kèm nếp gấp chữ A để dựng đứng trên bàn, canh lề an toàn.',
      },
      {
        h: 'File in chuẩn, đúng màu món ăn',
        p: 'File có tràn lề, vạch cắt, đường gấp và hệ màu CMYK nên in đúng màu, gấp đứng gọn. Hình món ăn sắc nét giúp kích thích gọi món.',
      },
      {
        h: 'Quảng cáo món, mã QR tại bàn',
        p: 'Hợp đặt menu combo, món mới, mã QR gọi món/thanh toán ngay trên bàn. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn khổ và báo giá.',
      },
    ],
    faq: [
      { q: 'In tent card số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán, nhà hàng.' },
      { q: 'Có ép nhựa chống nước không?', a: 'Có. Tent card để bàn thường cán màng hoặc ép nhựa cho bền; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'Cập nhật món, giá rồi in lại được chứ?', a: 'Được. Bạn sửa nội dung trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
      { q: 'File in tent card gồm gì?', a: 'File hai mặt đúng khổ, có tràn lề, vạch cắt, đường gấp và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  wetwipe: {
    heading: 'Thiết kế khăn lạnh in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế bao khăn lạnh in logo quán online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Khăn lạnh thương hiệu cho nhà hàng, quán ăn — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bao khăn lạnh in logo quán',
        p: 'Chọn mẫu bao, thêm logo, tên quán và thông tin liên hệ. Mivy dựng file đúng khổ bao khăn để in đúng vị trí, hiện rõ thương hiệu khi khách dùng.',
      },
      {
        h: 'File in chuẩn, nét trên màng bao',
        p: 'File đúng khổ bao, màu rõ ràng để in lên màng đẹp, nét. Chữ chuyển nét giúp tên quán, hotline rõ ràng dù khổ in nhỏ.',
      },
      {
        h: 'Khăn lạnh thương hiệu cho nhà hàng',
        p: 'Khăn lạnh in logo giúp quán nhìn chuyên nghiệp, tăng nhận diện. Gửi yêu cầu in để được tư vấn loại khăn, mùi hương và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In khăn lạnh số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán, nhà hàng.' },
      { q: 'Chọn được loại khăn, mùi hương không?', a: 'Có. Bạn nêu nhu cầu loại khăn và mùi hương khi gửi yêu cầu in để xưởng tư vấn.' },
      { q: 'In mấy màu lên bao khăn?', a: 'Thường in 1–2 màu lên màng bao. Nêu nhu cầu khi gửi yêu cầu in để báo giá.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ bao, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  coaster: {
    heading: 'Thiết kế lót ly in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế lót ly (coaster) in logo quán online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Lót ly giấy, lót ly ép — quán cà phê, bar — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Lót ly in logo quán theo ý bạn',
        p: 'Chọn hình dạng lót ly (tròn, vuông), thêm logo và hoạ tiết. Mivy dựng file đúng khổ kèm đường cắt để xưởng bế đúng hình, nét.',
      },
      {
        h: 'File in chuẩn, nét và đúng màu',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in sắc nét, đúng màu thương hiệu dù trên giấy ép dày hay giấy thường.',
      },
      {
        h: 'Lót ly cho quán cà phê, bar',
        p: 'Lót ly in logo tăng nhận diện và tạo điểm nhấn trên bàn. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In lót ly số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán.' },
      { q: 'Có những chất liệu lót ly nào?', a: 'Phổ biến là giấy ép dày thấm nước, giấy couche cán màng hoặc nhựa/cao su. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm được lót ly theo hình riêng không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để bế đúng hình đó.' },
      { q: 'File in lót ly gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy chất liệu và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  rigidbox: {
    heading: 'Thiết kế hộp quà cứng cao cấp & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp cứng nắp rời, hộp nam châm, hộp ngăn kéo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà Tết, quà VIP sang trọng — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp cứng cao cấp in logo thương hiệu',
        p: 'Chọn kiểu hộp (nắp rời, nam châm, ngăn kéo), nhập kích thước, thêm logo và hoạ tiết. Mivy dựng file bồi hộp cứng theo khổ để xưởng gia công đúng, chắc chắn.',
      },
      {
        h: 'File in chuẩn, ép kim nổi bật',
        p: 'File có tràn lề, hệ màu CMYK và vị trí ép kim/dập nổi. Hộp quà cao cấp hay ép kim vàng, dập nổi — nêu nhu cầu để xưởng xuất khuôn và báo giá.',
      },
      {
        h: 'Quà Tết, quà VIP sang trọng',
        p: 'Hộp cứng là bao bì quà biếu cao cấp dịp Tết, tri ân đối tác. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu bồi và báo giá.',
      },
    ],
    faq: [
      { q: 'In hộp cứng số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà biếu cao cấp.' },
      { q: 'Có ép kim, dập nổi không?', a: 'Có. Hộp cứng hay ép kim, dập nổi; nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.' },
      { q: 'Làm được hộp theo kích thước riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn hộp theo đúng khổ đó.' },
      { q: 'File in hộp gồm gì?', a: 'File theo khuôn bồi hộp, có tràn lề, hệ màu CMYK và vị trí ép kim nếu có.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [
      { href: '/in/lich-tet', label: 'Quà Tết doanh nghiệp' },
      { href: '/in', label: 'Xem tất cả sản phẩm in' },
    ],
  },
  wovenlabel: {
    heading: 'Thiết kế mác áo dệt, nhãn may & in theo yêu cầu',
    intro:
      'Tự thiết kế mác dệt cổ áo, nhãn size, nhãn hướng dẫn giặt cho shop thời trang online miễn phí rồi xuất file chuẩn và gửi yêu cầu làm. Local brand chuyên nghiệp — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Mác dệt cổ áo, nhãn size, nhãn giặt',
        p: 'Chọn kiểu mác (dệt, in satin), thêm logo, size và ký hiệu hướng dẫn giặt. Mivy dựng file đúng khổ mác để xưởng dệt hoặc in satin đúng chi tiết.',
      },
      {
        h: 'File chuẩn, logo nét khi dệt',
        p: 'File đúng kích thước, màu rõ ràng và chữ chuyển nét để dệt hoặc in satin sắc nét dù khổ nhỏ. Logo local brand hiện rõ trên mác.',
      },
      {
        h: 'Local brand thời trang chuyên nghiệp',
        p: 'Mác dệt giúp sản phẩm thời trang nhìn chỉn chu, đúng chuẩn. Mivy nhận cả đơn ít. Gửi yêu cầu làm để được tư vấn kiểu mác và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'Làm mác áo dệt số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho local brand.' },
      { q: 'Mác dệt khác mác in thế nào?', a: 'Mác dệt bằng sợi, bền và cao cấp; mác in satin rẻ hơn, hợp nhãn hướng dẫn giặt. Xưởng tư vấn khi báo giá.' },
      { q: 'Có làm nhãn size, nhãn giặt riêng không?', a: 'Có. Bạn thêm size và ký hiệu giặt; Mivy dựng file đúng chuẩn mác.' },
      { q: 'File làm mác gồm gì?', a: 'File đúng kích thước mác, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu mác và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tube: {
    heading: 'Thiết kế hộp ống tròn & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp ống giấy (tube box) đựng trà, cà phê, rượu, áo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Bao bì nắp rời sang trọng — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp ống tròn in logo, nắp rời',
        p: 'Chọn kích thước ống, thêm logo và hoạ tiết. Mivy dựng file nhãn quấn đúng chu vi ống để in dán quanh thân không bị lệch, đứt mạch ở mối nối.',
      },
      {
        h: 'File in chuẩn, đúng màu thương hiệu',
        p: 'File có tràn lề, hệ màu CMYK và chữ chuyển nét nên in đúng màu, dán quanh ống liền mạch. Phù hợp hộp trà, cà phê, rượu, đựng áo cao cấp.',
      },
      {
        h: 'Bao bì sang cho quà biếu',
        p: 'Hộp ống nắp rời nhìn sang, hợp quà biếu, sản phẩm cao cấp. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In hộp ống tròn số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sản phẩm cao cấp.' },
      { q: 'Làm được theo kích thước ống riêng không?', a: 'Có. Bạn nhập đường kính và chiều cao, Mivy dựng nhãn quấn đúng chu vi.' },
      { q: 'File in hộp ống gồm gì?', a: 'File nhãn quấn đúng chu vi, có tràn lề, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Có ép kim được không?', a: 'Có. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  nonla: {
    heading: 'Thiết kế nón lá in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế nón lá in logo, in hình làm quà tặng, đạo cụ sự kiện online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà lưu niệm Việt Nam — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Nón lá in logo, in hình theo ý bạn',
        p: 'Chọn mẫu, thêm logo, hình hoặc thông điệp. Mivy dựng file đúng vùng in trên nón để xưởng in/dán đúng vị trí, cân đối trên bề mặt cong.',
      },
      {
        h: 'File in chuẩn, nét trên bề mặt nón',
        p: 'File đúng kích thước vùng in, màu rõ ràng để in lên nón lá đẹp, nét. Chữ chuyển nét giúp logo rõ ràng.',
      },
      {
        h: 'Quà lưu niệm, đạo cụ sự kiện',
        p: 'Nón lá in logo làm quà lưu niệm du lịch, đạo cụ chụp hình, sự kiện văn hoá. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In nón lá số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà lưu niệm, sự kiện.' },
      { q: 'In logo lên nón lá bằng cách nào?', a: 'Thường là in/dán decal hoặc in trực tiếp lên bề mặt. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm được hình riêng không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file đúng vùng in trên nón.' },
      { q: 'File in nón gồm gì?', a: 'File đúng kích thước vùng in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu in và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  acrylicstand: {
    heading: 'Thiết kế standee mica mini (acrylic stand) & in theo yêu cầu',
    intro:
      'Tự thiết kế standee mica mini, acrylic stand in hình online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà fan, trưng bày để bàn — nhận cả 1 cái.',
    blocks: [
      {
        h: 'Standee mica mini in hình theo ý bạn',
        p: 'Chọn hình dạng, thêm hình nhân vật/ảnh và chân đế. Mivy dựng file đúng khổ kèm đường cắt để xưởng bế mica đúng hình, có chân đứng.',
      },
      {
        h: 'File in chuẩn, nét trên mica trong',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao nên in UV lên mica trong sắc nét, đúng màu. Có thể in lớp trắng lót để màu không bị trong suốt.',
      },
      {
        h: 'Quà fan, trưng bày để bàn từ 1 cái',
        p: 'Hợp quà fan, mô hình nhân vật, standee thương hiệu để bàn. Mivy nhận cả 1 cái. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In standee mica 1 cái được không?', a: 'Được. Mivy nhận cả 1 cái, hợp quà fan, trưng bày.' },
      { q: 'Làm được theo hình riêng không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để bế mica đúng hình đó.' },
      { q: 'In mica trong màu có bị nhạt không?', a: 'Không nếu in lớp trắng lót phía sau; xưởng xử lý để màu lên chuẩn, không trong suốt.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  umbrella: {
    heading: 'Thiết kế ô dù in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế ô dù (dù cầm tay, dù cây) in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng, dù quán cà phê — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Ô dù in logo theo ý bạn',
        p: 'Chọn kiểu dù, màu vải, thêm logo và chữ, đặt vị trí in trên múi dù. Mivy dựng file đúng vùng in để xưởng in lên vải dù đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, bền màu ngoài trời',
        p: 'File đúng kích thước hình in, màu rõ ràng để in lên vải dù đúng màu, bền khi phơi nắng mưa. Chữ chuyển nét giúp logo rõ ràng.',
      },
      {
        h: 'Quà tặng, dù quán cà phê',
        p: 'Ô dù in logo làm quà tặng khách, dù che quán cà phê, sự kiện ngoài trời. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn kiểu dù và báo giá.',
      },
    ],
    faq: [
      { q: 'In ô dù số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, quán.' },
      { q: 'Chọn được kiểu và màu dù không?', a: 'Có. Bạn chọn kiểu (cầm tay, cây, gấp) và màu vải trước khi thiết kế phần in.' },
      { q: 'In lên dù bằng cách nào?', a: 'Thường là in lụa hoặc in chuyển nhiệt lên múi dù. Xưởng tư vấn khi báo giá.' },
      { q: 'File in dù gồm gì?', a: 'File đúng kích thước hình in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu dù và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  pillow: {
    heading: 'Thiết kế gối in hình & in theo yêu cầu',
    intro:
      'Tự thiết kế gối in hình, in logo làm quà tặng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng in ảnh riêng, quà doanh nghiệp — nhận cả 1 cái.',
    blocks: [
      {
        h: 'Gối in hình, in logo theo ý bạn',
        p: 'Chọn kiểu gối (vuông, chữ nhật, tim), thêm ảnh hoặc logo và chữ. Mivy dựng file đúng khổ vỏ gối để in chuyển nhiệt lên vải đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, ảnh sắc nét',
        p: 'File đúng kích thước vỏ gối, độ phân giải cao để in chuyển nhiệt lên vải đúng màu, nét. Chữ chuyển nét giúp lời chúc rõ ràng.',
      },
      {
        h: 'Quà tặng in ảnh, quà doanh nghiệp',
        p: 'Gối in ảnh làm quà tặng kỷ niệm, quà doanh nghiệp, quà sự kiện. Mivy nhận cả 1 cái. Gửi yêu cầu in để được tư vấn kiểu gối và báo giá.',
      },
    ],
    faq: [
      { q: 'In gối 1 cái được không?', a: 'Được. Mivy nhận cả 1 cái, hợp quà tặng in ảnh riêng.' },
      { q: 'Dùng ảnh của tôi được không?', a: 'Được. Bạn thêm ảnh riêng; nên dùng ảnh rõ nét để in đẹp.' },
      { q: 'Chọn được kiểu và kích thước gối không?', a: 'Có. Bạn chọn kiểu và kích thước vỏ gối trước khi thiết kế.' },
      { q: 'File in gối gồm gì?', a: 'File đúng kích thước vỏ gối, độ phân giải cao và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu gối và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  canvas: {
    heading: 'Thiết kế tranh canvas in theo yêu cầu',
    intro:
      'Tự thiết kế tranh canvas in ảnh, in tranh trang trí online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Trang trí nhà, quán, quà tặng — nhận cả 1 tấm.',
    blocks: [
      {
        h: 'Tranh canvas in ảnh, tranh trang trí',
        p: 'Chọn khổ tranh, thêm ảnh hoặc tranh và chỉnh bố cục. Mivy dựng file đúng khổ kèm phần viền căng khung để xưởng căng canvas lên khung gỗ không mất hình.',
      },
      {
        h: 'File in chuẩn, hình sắc nét không vỡ',
        p: 'File ở độ phân giải phù hợp khổ tranh, có phần viền căng khung và hệ màu chuẩn nên in khổ lớn không bị vỡ hình, đúng màu.',
      },
      {
        h: 'Trang trí nhà, quán, quà tặng',
        p: 'Tranh canvas trang trí phòng khách, quán cà phê, văn phòng hoặc làm quà tặng in ảnh. Mivy nhận cả 1 tấm. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In tranh canvas 1 tấm được không?', a: 'Được. Mivy nhận cả 1 tấm, hợp trang trí và quà tặng.' },
      { q: 'Có căng khung gỗ sẵn không?', a: 'Có. File dựng sẵn phần viền căng khung; bạn nêu nhu cầu căng khung khi gửi yêu cầu in.' },
      { q: 'Dùng ảnh của tôi được không?', a: 'Được. Nên dùng ảnh độ phân giải cao để in khổ lớn không vỡ.' },
      { q: 'File in canvas gồm gì?', a: 'File đúng khổ, có phần viền căng khung, độ phân giải cao và hệ màu chuẩn.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy khổ tranh và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  phonecase: {
    heading: 'Thiết kế ốp lưng điện thoại in theo yêu cầu',
    intro:
      'Tự thiết kế ốp lưng điện thoại in hình, in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng, ốp theo ý bạn — nhận cả 1 cái.',
    blocks: [
      {
        h: 'Ốp lưng in hình, in logo theo ý bạn',
        p: 'Chọn dòng máy, thêm ảnh hoặc logo và chữ. Mivy dựng file đúng khuôn ốp của dòng máy đó, chừa vị trí camera, nút bấm để in không phạm.',
      },
      {
        h: 'File in chuẩn, ảnh sắc nét',
        p: 'File đúng khuôn ốp, độ phân giải cao để in UV/chuyển nhiệt lên ốp đúng màu, nét. Chữ chuyển nét giúp chi tiết nhỏ rõ ràng.',
      },
      {
        h: 'Quà tặng, ốp cá nhân hoá',
        p: 'Ốp lưng in ảnh làm quà tặng, ốp theo sở thích, ốp thương hiệu. Mivy nhận cả 1 cái. Gửi yêu cầu in để được chọn dòng máy và báo giá.',
      },
    ],
    faq: [
      { q: 'In ốp lưng 1 cái được không?', a: 'Được. Mivy nhận cả 1 cái, hợp quà tặng, cá nhân hoá.' },
      { q: 'Có hỗ trợ dòng máy của tôi không?', a: 'Bạn chọn dòng máy khi thiết kế; Mivy dựng khuôn ốp theo dòng đó. Nếu thiếu, nêu khi gửi yêu cầu in.' },
      { q: 'Dùng ảnh của tôi được không?', a: 'Được. Nên dùng ảnh rõ nét để in đẹp.' },
      { q: 'File in ốp gồm gì?', a: 'File đúng khuôn ốp, chừa vị trí camera/nút, độ phân giải cao.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy loại ốp và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  puzzle: {
    heading: 'Thiết kế puzzle in ảnh (tranh ghép) & in theo yêu cầu',
    intro:
      'Tự thiết kế puzzle in ảnh, tranh ghép làm quà tặng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng kỷ niệm, quà sự kiện — nhận cả 1 bộ.',
    blocks: [
      {
        h: 'Puzzle in ảnh theo ý bạn',
        p: 'Chọn khổ và số mảnh, thêm ảnh hoặc hình. Mivy dựng file đúng khổ puzzle để xưởng in và bế mảnh ghép đúng, ảnh khớp khi ghép lại.',
      },
      {
        h: 'File in chuẩn, ảnh sắc nét',
        p: 'File đúng khổ, độ phân giải cao, hệ màu CMYK để in lên bìa puzzle đúng màu, nét. Ảnh ghép lại rõ ràng, đẹp.',
      },
      {
        h: 'Quà tặng kỷ niệm, quà sự kiện',
        p: 'Puzzle in ảnh làm quà tặng kỷ niệm, quà cho bé, quà sự kiện. Mivy nhận cả 1 bộ. Gửi yêu cầu in để được chọn số mảnh và báo giá.',
      },
    ],
    faq: [
      { q: 'In puzzle 1 bộ được không?', a: 'Được. Mivy nhận cả 1 bộ, hợp quà tặng kỷ niệm.' },
      { q: 'Chọn được số mảnh không?', a: 'Có. Bạn chọn số mảnh (ví dụ 48, 108, 500) tùy độ khó và kích thước.' },
      { q: 'Dùng ảnh của tôi được không?', a: 'Được. Nên dùng ảnh rõ nét để ghép lại đẹp.' },
      { q: 'File in puzzle gồm gì?', a: 'File đúng khổ, độ phân giải cao và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy khổ, số mảnh và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  playingcards: {
    heading: 'Thiết kế bộ bài in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế bộ bài tây in logo, in hình online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng thương hiệu, bài sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bộ bài in logo, in hình theo ý bạn',
        p: 'Chọn mẫu mặt lưng, thêm logo và hoạ tiết, chọn kiểu mặt số. Mivy dựng file đúng khổ lá bài kèm tràn lề, vạch cắt để xưởng in và bế bo góc đúng.',
      },
      {
        h: 'File in chuẩn, nét hai mặt',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in sắc nét, đúng màu cả mặt lưng lẫn mặt số. Bộ bài thường cán bóng cho bền.',
      },
      {
        h: 'Quà tặng thương hiệu, bài sự kiện',
        p: 'Bộ bài in logo làm quà tặng độc đáo, vật phẩm sự kiện, bài quảng cáo. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn hộp đựng và báo giá.',
      },
    ],
    faq: [
      { q: 'In bộ bài số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Tùy biến được mặt lưng và mặt số không?', a: 'Có. Bạn thiết kế mặt lưng và chọn kiểu mặt số theo thương hiệu.' },
      { q: 'Có kèm hộp đựng không?', a: 'Có. Bạn nêu nhu cầu hộp khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'File in bộ bài gồm gì?', a: 'File đúng khổ lá bài, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  clock: {
    heading: 'Thiết kế đồng hồ in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế đồng hồ treo tường in logo, in hình làm quà tặng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà doanh nghiệp, quà sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Đồng hồ in logo theo ý bạn',
        p: 'Chọn kiểu đồng hồ, thêm logo, hình nền và số. Mivy dựng file mặt đồng hồ đúng khổ, chừa lỗ trục kim để xưởng gia công đúng, kim quay không vướng.',
      },
      {
        h: 'File in chuẩn, mặt đồng hồ nét',
        p: 'File có tràn lề, vị trí trục kim, hệ màu CMYK và chữ chuyển nét nên in mặt đồng hồ sắc nét, đúng màu thương hiệu.',
      },
      {
        h: 'Quà doanh nghiệp, quà sự kiện',
        p: 'Đồng hồ in logo làm quà tặng khách, quà tri ân, vật phẩm thương hiệu bền. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn kiểu và báo giá.',
      },
    ],
    faq: [
      { q: 'In đồng hồ số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Chọn được kiểu đồng hồ không?', a: 'Có. Bạn chọn kiểu (tròn, vuông, khổ to/nhỏ) trước khi thiết kế mặt.' },
      { q: 'Dùng logo, hình riêng được không?', a: 'Được. Bạn thêm logo, hình nền riêng cho mặt đồng hồ.' },
      { q: 'File in đồng hồ gồm gì?', a: 'File mặt đồng hồ đúng khổ, có tràn lề, vị trí trục kim và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu đồng hồ và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  helmet: {
    heading: 'Thiết kế mũ bảo hiểm in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế mũ bảo hiểm in logo làm quà tặng, đồng phục giao hàng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà quảng cáo, đội ship — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Mũ bảo hiểm in logo theo ý bạn',
        p: 'Chọn kiểu mũ, màu, thêm logo và chữ, đặt vị trí in (hai bên, phía trước). Mivy dựng file đúng vùng in để xưởng in/dán decal lên mũ đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, bền khi đội nắng',
        p: 'File đúng kích thước vùng in, màu rõ ràng để in/dán decal lên mũ bền màu, không bong. Chữ chuyển nét giúp logo, hotline rõ ràng.',
      },
      {
        h: 'Quà quảng cáo, đội ship',
        p: 'Mũ bảo hiểm in logo làm quà tặng quảng cáo, đồng phục đội giao hàng, sự kiện. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn kiểu mũ và báo giá.',
      },
    ],
    faq: [
      { q: 'In mũ bảo hiểm số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, đội ship.' },
      { q: 'In lên mũ bằng cách nào?', a: 'Thường là in/dán decal chịu thời tiết lên vỏ mũ. Xưởng tư vấn khi báo giá.' },
      { q: 'Chọn được kiểu và màu mũ không?', a: 'Có. Bạn chọn kiểu (nửa đầu, 3/4) và màu trước khi thiết kế phần in.' },
      { q: 'File in mũ gồm gì?', a: 'File đúng kích thước vùng in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu mũ và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  pen: {
    heading: 'Thiết kế bút in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế bút bi in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng doanh nghiệp, văn phòng phẩm thương hiệu — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bút in logo, in tên công ty',
        p: 'Chọn kiểu bút, màu thân, thêm logo và tên công ty. Mivy dựng file đúng vùng in trên thân bút để xưởng in đúng vị trí, hiện rõ thương hiệu.',
      },
      {
        h: 'File in chuẩn, nét trên thân bút hẹp',
        p: 'File đúng kích thước vùng in, màu rõ ràng để in lên thân bút sắc nét dù khổ hẹp. Chữ chuyển nét giúp tên công ty, hotline rõ ràng.',
      },
      {
        h: 'Quà tặng, văn phòng phẩm thương hiệu',
        p: 'Bút in logo làm quà tặng khách, văn phòng phẩm nội bộ, quà hội thảo. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn kiểu bút và báo giá.',
      },
    ],
    faq: [
      { q: 'In bút logo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'In lên bút bằng cách nào?', a: 'Thường là in lụa hoặc khắc laser lên thân bút. Xưởng tư vấn khi báo giá.' },
      { q: 'Chọn được kiểu và màu bút không?', a: 'Có. Bạn chọn kiểu và màu thân bút trước khi thiết kế phần in.' },
      { q: 'File in bút gồm gì?', a: 'File đúng kích thước vùng in, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu bút và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  certificate: {
    heading: 'Thiết kế giấy khen, chứng nhận & in theo yêu cầu',
    intro:
      'Tự thiết kế giấy khen, giấy chứng nhận, bằng khen online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Sự kiện, khoá học, công ty — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Giấy khen, chứng nhận trang trọng',
        p: 'Chọn mẫu, điền tên người nhận (ví dụ Quốc Bảo), nội dung và chữ ký. Mẫu dựng khung viền trang trọng, canh lề an toàn để chữ không bị xén.',
      },
      {
        h: 'File in chuẩn, ép kim sang trọng',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK. Giấy khen hay ép kim viền, con dấu nổi — nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.',
      },
      {
        h: 'In nhiều tên cho sự kiện, khoá học',
        p: 'Cần in nhiều giấy khen với tên khác nhau cho lễ trao giải, kết thúc khoá học. Bạn dán danh sách tên để tạo hàng loạt, xuất file in rồi gửi yêu cầu.',
      },
    ],
    faq: [
      { q: 'In giấy khen số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sự kiện, công ty.' },
      { q: 'In được nhiều tên khác nhau không?', a: 'Được. Bạn dán danh sách tên để tạo hàng loạt giấy khen rồi xuất file in.' },
      { q: 'Có ép kim, dấu nổi không?', a: 'Có. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.' },
      { q: 'File in giấy khen gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Nên in giấy gì?', a: 'Thường là giấy mỹ thuật hoặc couche dày. Xưởng tư vấn khi báo giá.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  receiptbook: {
    heading: 'Thiết kế hoá đơn, phiếu nhiều liên & in theo yêu cầu',
    intro:
      'Tự thiết kế hoá đơn bán lẻ, phiếu thu, phiếu giao hàng nhiều liên in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hoá đơn, phiếu liên in logo công ty',
        p: 'Chọn mẫu, thêm logo, thông tin công ty và các cột cần ghi. Mivy dựng file đúng khổ phiếu, canh bảng rõ ràng để viết tay hoặc đóng cuốn nhiều liên.',
      },
      {
        h: 'File in chuẩn, nhiều liên giấy carbon',
        p: 'File có tràn lề, vạch cắt và hệ màu phù hợp. Phiếu nhiều liên (2–3 liên) dùng giấy carbon tự nhân bản — nêu nhu cầu số liên khi gửi yêu cầu in.',
      },
      {
        h: 'Đóng cuốn, nhảy số seri',
        p: 'Hoá đơn, phiếu thu thường đóng thành cuốn và nhảy số seri. Gửi yêu cầu in để được tư vấn số liên, cách đóng cuốn và báo giá.',
      },
    ],
    faq: [
      { q: 'In hoá đơn, phiếu liên số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho cửa hàng, công ty.' },
      { q: 'Làm được phiếu 2–3 liên không?', a: 'Được. Phiếu nhiều liên dùng giấy carbon tự nhân bản; nêu số liên khi gửi yêu cầu in.' },
      { q: 'Có nhảy số seri, đóng cuốn không?', a: 'Có. Bạn nêu nhu cầu khi gửi yêu cầu in để xưởng xử lý số seri và đóng cuốn.' },
      { q: 'File in phiếu gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu phù hợp.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số liên, số cuốn và cách gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  lightbox: {
    heading: 'Thiết kế hộp đèn quảng cáo & in theo yêu cầu',
    intro:
      'Tự thiết kế mặt hộp đèn (lightbox) quảng cáo mặt tiền online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Biển hiệu phát sáng — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Mặt hộp đèn in logo, thông điệp',
        p: 'Chọn mẫu, nhập kích thước mặt hộp đèn, thêm logo và thông điệp. Mivy dựng file đúng khổ để in bạt xuyên sáng (hiflex, PP) dán mặt hộp đèn đúng kích thước.',
      },
      {
        h: 'File in khổ lớn chuẩn, sáng đều',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên khi đèn LED hắt sáng, màu lên đều, chữ rõ, không vỡ hình.',
      },
      {
        h: 'Biển hiệu phát sáng mặt tiền',
        p: 'Hộp đèn giúp mặt tiền nổi bật ban đêm. Gửi yêu cầu in để được tư vấn chất liệu bạt xuyên sáng và báo giá theo kích thước; khung và LED do xưởng thi công.',
      },
    ],
    faq: [
      { q: 'In mặt hộp đèn đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một mặt hộp đèn.' },
      { q: 'In chất liệu gì cho hộp đèn?', a: 'Thường là bạt hiflex hoặc PP xuyên sáng để đèn LED hắt qua. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm được theo kích thước mặt tiền không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng khổ đó.' },
      { q: 'File in hộp đèn gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Có thi công khung, LED không?', a: 'Khung và LED do xưởng thi công; Mivy lo phần thiết kế và file in. Nêu nhu cầu khi gửi yêu cầu.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  deliverybox: {
    heading: 'Thiết kế thùng giao hàng in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế decal thùng giao hàng sau xe máy in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Giao đồ ăn, tạp hoá, nước — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Decal thùng giao hàng in logo quán',
        p: 'Chọn kích thước thùng, thêm logo, hình món và hotline. Mivy dựng file đúng khổ các mặt thùng để in decal dán vừa vặn, hiện rõ thương hiệu khi chạy đường.',
      },
      {
        h: 'File in chuẩn, bền ngoài trời',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK. Decal thùng chạy nắng mưa cần chất liệu bền màu — xưởng tư vấn decal, cán bóng chống phai khi báo giá.',
      },
      {
        h: 'Giao đồ ăn, tạp hoá nhìn chuyên nghiệp',
        p: 'Thùng giao hàng in logo như một bảng quảng cáo di động, tăng nhận diện. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In decal thùng giao hàng số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán, shop.' },
      { q: 'Decal có bền nắng mưa không?', a: 'Có. Dùng decal bền màu, cán bóng chống phai; xưởng tư vấn khi báo giá.' },
      { q: 'Làm được theo kích thước thùng riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng các mặt thùng.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ các mặt thùng, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  menuboard: {
    heading: 'Thiết kế bảng menu treo tường & in theo yêu cầu',
    intro:
      'Tự thiết kế bảng menu treo tường cho quán cà phê, quán ăn online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Menu rõ ràng từ xa — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Bảng menu treo tường rõ ràng từ xa',
        p: 'Chọn mẫu, nhập danh mục món và giá, thêm logo, hình. Mẫu dựng bố cục chia nhóm rõ ràng, chữ to để khách đọc được từ quầy, canh lề an toàn.',
      },
      {
        h: 'File in khổ lớn chuẩn, đúng màu món',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in bảng to không vỡ hình, đúng màu. Hình món hấp dẫn, giá rõ.',
      },
      {
        h: 'Nhiều chất liệu: PP, format, khung',
        p: 'In trên PP cán format, bạt hoặc ép khung tùy nhu cầu. Gửi yêu cầu in để được tư vấn chất liệu, cách treo và báo giá theo kích thước.',
      },
    ],
    faq: [
      { q: 'In bảng menu treo tường đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho quán.' },
      { q: 'Cập nhật món, giá rồi in lại được chứ?', a: 'Được. Bạn sửa nội dung trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
      { q: 'In chất liệu gì?', a: 'Thường là PP cán format, bạt hoặc ép khung. Xưởng tư vấn khi báo giá.' },
      { q: 'File in bảng menu gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  ticket: {
    heading: 'Thiết kế vé sự kiện & in theo yêu cầu',
    intro:
      'Tự thiết kế vé sự kiện, vé xem phim, vé hội chợ online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Có cuống xé, mã QR, số seri — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Vé sự kiện có cuống xé, mã QR',
        p: 'Chọn mẫu, thêm tên sự kiện, thông tin chỗ ngồi, mã QR và cuống xé soát vé. Mivy dựng file đúng khổ vé kèm đường răng cưa/đường xé để gia công đúng.',
      },
      {
        h: 'File in chuẩn, chống làm giả',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét. Vé có thể thêm số seri, mã QR để soát và chống giả — nêu nhu cầu khi gửi yêu cầu in.',
      },
      {
        h: 'Hội chợ, show diễn, sự kiện',
        p: 'Hợp vé hội chợ, show ca nhạc, workshop, sự kiện nội bộ. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn gia công và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In vé sự kiện số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sự kiện nhỏ.' },
      { q: 'Có mã QR, số seri, cuống xé không?', a: 'Có. Bạn thêm mã QR, số seri và cuống xé; nêu nhu cầu nhảy số khi gửi yêu cầu in.' },
      { q: 'File in vé gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, đường răng cưa/xé và hệ màu CMYK.' },
      { q: 'Có cán màng không?', a: 'Có. Vé thường cán màng cho bền; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  badge: {
    heading: 'Thiết kế thẻ đeo nhân viên & in theo yêu cầu',
    intro:
      'Tự thiết kế thẻ đeo nhân viên, thẻ ra vào, thẻ sự kiện in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Công ty, sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Thẻ nhân viên in logo, ảnh, chức danh',
        p: 'Chọn mẫu, thêm logo công ty, ảnh, tên và chức danh. Mivy dựng file đúng khổ thẻ kèm vị trí dập lỗ xỏ dây để gia công đúng.',
      },
      {
        h: 'File in chuẩn, ép nhựa bền',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in sắc nét, đúng màu. Thẻ thường ép nhựa PVC cho bền — nêu nhu cầu khi gửi yêu cầu in.',
      },
      {
        h: 'In nhiều tên cho công ty, sự kiện',
        p: 'Cần in nhiều thẻ với tên, ảnh khác nhau cho toàn công ty hay sự kiện. Bạn dán danh sách để tạo hàng loạt, xuất file in rồi gửi yêu cầu.',
      },
    ],
    faq: [
      { q: 'In thẻ nhân viên số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho công ty, sự kiện.' },
      { q: 'In được nhiều tên, ảnh khác nhau không?', a: 'Được. Bạn dán danh sách tên, ảnh để tạo hàng loạt thẻ rồi xuất file in.' },
      { q: 'Có ép nhựa, kèm dây đeo không?', a: 'Có. Thẻ thường ép nhựa PVC, kèm dây/dập lỗ; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'File in thẻ gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, vị trí dập lỗ và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  plaque: {
    heading: 'Thiết kế biển công ty, bảng hiệu & in theo yêu cầu',
    intro:
      'Tự thiết kế biển công ty, bảng tên công ty, bảng chức danh online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in/gia công. Mặt tiền, sảnh, cửa phòng — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Biển công ty, bảng tên chỉn chu',
        p: 'Chọn mẫu, thêm logo, tên công ty và thông tin, nhập kích thước theo vị trí lắp. Mivy dựng file đúng khổ để gia công mica, inox, đồng hoặc in theo yêu cầu.',
      },
      {
        h: 'File in/khắc chuẩn, nét trang trọng',
        p: 'File đúng khổ, hệ màu chuẩn và chữ chuyển nét nên in hoặc khắc sắc nét, đúng màu thương hiệu. Logo và tên công ty hiện rõ, trang trọng.',
      },
      {
        h: 'Mặt tiền, sảnh, cửa phòng',
        p: 'Hợp biển mặt tiền, bảng tên sảnh lễ tân, bảng chức danh cửa phòng. Mivy nhận cả đơn lẻ. Gửi yêu cầu để được tư vấn chất liệu (mica, inox, đồng) và báo giá.',
      },
    ],
    faq: [
      { q: 'Làm biển công ty đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho mặt tiền, cửa phòng.' },
      { q: 'Có những chất liệu nào?', a: 'Phổ biến là mica, inox, đồng hoặc in trực tiếp. Xưởng tư vấn chất liệu hợp vị trí và ngân sách khi báo giá.' },
      { q: 'Làm theo kích thước riêng được không?', a: 'Có. Bạn nhập kích thước theo vị trí lắp, Mivy dựng file đúng khổ.' },
      { q: 'File gồm gì?', a: 'File đúng khổ, hệ màu chuẩn và chữ đã chuyển nét để in hoặc khắc.' },
      { q: 'Quy trình thế nào?', a: 'Thiết kế → gửi yêu cầu → báo giá qua Zalo → cọc → làm mẫu duyệt → gia công → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  aframe: {
    heading: 'Thiết kế bảng chữ A vỉa hè & in theo yêu cầu',
    intro:
      'Tự thiết kế bảng chữ A (standee gấp vỉa hè) quảng cáo quán online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Hút khách trước cửa — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Bảng chữ A đặt vỉa hè hút khách',
        p: 'Chọn mẫu, thêm logo, menu, khuyến mãi hoặc chỉ đường. Mivy dựng file hai mặt đúng khổ bảng chữ A để in và lắp lên khung gấp đặt trước cửa.',
      },
      {
        h: 'File in khổ lớn chuẩn, chữ to rõ',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in không vỡ hình, chữ to rõ đọc được từ ngoài đường.',
      },
      {
        h: 'Quảng cáo trước cửa, nhận đơn lẻ',
        p: 'Chỉ cần 1 bảng cho quán cũng làm được. Hợp quán cà phê, nhà hàng, shop muốn hút khách đi ngang. Gửi yêu cầu in để được tư vấn khung và báo giá.',
      },
    ],
    faq: [
      { q: 'In bảng chữ A đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho quán.' },
      { q: 'Có kèm khung gấp không?', a: 'Có. Bạn nêu nhu cầu khung khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'Cập nhật nội dung rồi in lại được chứ?', a: 'Được. Bạn sửa nội dung trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
      { q: 'File in gồm gì?', a: 'File hai mặt đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước, chất liệu và khung. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  flag: {
    heading: 'Thiết kế cờ phướn, cờ dây & in theo yêu cầu',
    intro:
      'Tự thiết kế cờ phướn, cờ dây, cờ lưu niệm quảng cáo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Sự kiện, khai trương, trang trí — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Cờ phướn, cờ dây in logo, thông điệp',
        p: 'Chọn kiểu (phướn dọc, cờ dây tam giác, cờ để bàn), thêm logo và thông điệp. Mivy dựng file đúng khổ cờ kèm phần may viền để treo chắc, không rách.',
      },
      {
        h: 'File in chuẩn, bền ngoài trời',
        p: 'File ở độ phân giải phù hợp, có tràn lề và hệ màu CMYK để in trên vải cờ hoặc bạt bền màu, không vỡ hình khi phóng to.',
      },
      {
        h: 'Sự kiện, khai trương, trang trí',
        p: 'Hợp trang trí khai trương, lễ hội, sự kiện ngoài trời, cổ vũ. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In cờ phướn, cờ dây số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sự kiện.' },
      { q: 'In chất liệu gì?', a: 'Thường là vải cờ (phi bóng) hoặc bạt. Xưởng tư vấn hợp mục đích khi báo giá.' },
      { q: 'Có may viền, luồn dây không?', a: 'Có. Mivy dựng sẵn phần viền; bạn nêu nhu cầu may, luồn dây khi gửi yêu cầu in.' },
      { q: 'File in cờ gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp, có tràn lề và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước, chất liệu và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  booklet: {
    heading: 'Thiết kế catalogue nhiều trang & in theo yêu cầu',
    intro:
      'Tự thiết kế catalogue sản phẩm, hồ sơ năng lực nhiều trang online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Doanh nghiệp giới thiệu chuyên nghiệp — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Catalogue nhiều trang, bố cục nhất quán',
        p: 'Thêm nhiều trang sản phẩm, dịch vụ với bố cục nhất quán, chèn hình và thông tin. Mivy dựng file đúng khổ, đánh số trang để đóng gáy đúng thứ tự.',
      },
      {
        h: 'File in chuẩn, đúng màu sản phẩm',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK nên hình sản phẩm in đúng màu, sắc nét. Phù hợp giới thiệu năng lực, danh mục sản phẩm.',
      },
      {
        h: 'Đóng gáy đẹp, nhận đơn ít',
        p: 'Tùy số trang, xưởng đóng dập ghim hoặc keo nhiệt. Mivy nhận cả đơn ít cho hồ sơ, hội thảo. Gửi yêu cầu in để được tư vấn giấy, cách đóng và báo giá.',
      },
    ],
    faq: [
      { q: 'In catalogue số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho doanh nghiệp.' },
      { q: 'Làm được bao nhiêu trang?', a: 'Linh hoạt; số trang nên là bội số phù hợp cách đóng. Xưởng tư vấn khi báo giá.' },
      { q: 'Đóng gáy kiểu gì?', a: 'Dập ghim (ít trang) hoặc keo nhiệt/gáy vuông (nhiều trang). Xưởng tư vấn khi báo giá.' },
      { q: 'File in catalogue gồm gì?', a: 'File đúng khổ, đánh số trang, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số trang, số lượng và loại giấy. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  photobook: {
    heading: 'Thiết kế photobook, kỷ yếu & in theo yêu cầu',
    intro:
      'Tự thiết kế photobook, album ảnh, kỷ yếu online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Lưu niệm cưới, gia đình, lớp học — nhận cả 1 cuốn.',
    blocks: [
      {
        h: 'Photobook, kỷ yếu bố cục ảnh đẹp',
        p: 'Thêm ảnh vào các trang theo bố cục có sẵn, chèn chữ và trang bìa. Mivy dựng file đúng khổ, đánh số trang để đóng cuốn đúng thứ tự, ảnh không bị cắt phạm.',
      },
      {
        h: 'File in chuẩn, ảnh sắc nét',
        p: 'File có tràn lề, độ phân giải cao và hệ màu chuẩn nên ảnh in sắc nét, đúng màu da, màu cảnh. Bìa cứng hoặc mềm tùy nhu cầu.',
      },
      {
        h: 'Lưu niệm cưới, gia đình, lớp học',
        p: 'Hợp album cưới, ảnh gia đình, kỷ yếu lớp, kỷ niệm công ty. Mivy nhận cả 1 cuốn. Gửi yêu cầu in để được tư vấn khổ, bìa và báo giá.',
      },
    ],
    faq: [
      { q: 'In photobook 1 cuốn được không?', a: 'Được. Mivy nhận cả 1 cuốn, hợp lưu niệm cá nhân.' },
      { q: 'Dùng ảnh của tôi được không?', a: 'Được. Nên dùng ảnh độ phân giải cao để in đẹp.' },
      { q: 'Chọn được bìa cứng hay mềm không?', a: 'Có. Bạn chọn bìa cứng hoặc mềm; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'File in photobook gồm gì?', a: 'File đúng khổ, đánh số trang, có tràn lề, độ phân giải cao và hệ màu chuẩn.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy khổ, số trang và bìa. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  menubook: {
    heading: 'Thiết kế menu dạng sổ & in theo yêu cầu',
    intro:
      'Tự thiết kế menu dạng sổ nhiều trang cho nhà hàng, quán ăn online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Menu chỉn chu, dễ cập nhật — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Menu dạng sổ nhiều trang, chia nhóm món',
        p: 'Thêm các trang món theo nhóm (khai vị, món chính, đồ uống…), chèn hình và giá. Mivy dựng file đúng khổ, đánh số trang để đóng cuốn menu đúng thứ tự.',
      },
      {
        h: 'File in chuẩn, hình món hấp dẫn',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK nên hình món in đúng màu, hấp dẫn. Menu thường cán màng hoặc ép nhựa cho bền khi khách lật nhiều.',
      },
      {
        h: 'Dễ cập nhật, nhận đơn ít',
        p: 'Đổi món, đổi giá rồi in lại dễ dàng. Mivy nhận cả đơn ít cho quán. Gửi yêu cầu in để được tư vấn cách đóng, gia công và báo giá.',
      },
    ],
    faq: [
      { q: 'In menu dạng sổ số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán.' },
      { q: 'Cập nhật món, giá rồi in lại được chứ?', a: 'Được. Bạn sửa nội dung trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
      { q: 'Có ép nhựa, cán màng không?', a: 'Có. Menu lật nhiều thường cán màng hoặc ép nhựa cho bền; nêu nhu cầu khi gửi yêu cầu in.' },
      { q: 'File in menu gồm gì?', a: 'File đúng khổ, đánh số trang, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số trang, số lượng và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  ricebag: {
    heading: 'Thiết kế bao gạo, bao bì nông sản & in theo yêu cầu',
    intro:
      'Tự thiết kế bao gạo PP dệt, túi gạo hút chân không in thương hiệu online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nông sản thương hiệu — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bao gạo, túi nông sản in thương hiệu',
        p: 'Chọn loại bao (PP dệt, túi hút chân không), dung lượng (5–25kg), thêm logo, thông tin sản phẩm. Mivy dựng file đúng khổ bao để in đúng vị trí, hiện rõ thương hiệu.',
      },
      {
        h: 'File in chuẩn, nét trên bao dệt',
        p: 'File đúng khổ, màu rõ ràng để in lên bao PP dệt hoặc túi màng ghép đẹp, nét. Có chỗ cho thông tin bắt buộc như khối lượng, nguồn gốc.',
      },
      {
        h: 'Nông sản lên đời thương hiệu',
        p: 'Bao bì đẹp giúp gạo, nông sản bán được giá hơn, chuyên nghiệp hơn. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In bao gạo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho cơ sở nông sản nhỏ.' },
      { q: 'Có những loại bao nào?', a: 'Phổ biến là bao PP dệt và túi màng ghép hút chân không. Xưởng tư vấn hợp sản phẩm khi báo giá.' },
      { q: 'Có chừa chỗ cho khối lượng, nguồn gốc không?', a: 'Có. Mẫu được dựng để đủ chỗ cho thông tin bắt buộc.' },
      { q: 'File in bao gồm gì?', a: 'File đúng khổ bao, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }],
  },
  mooncakebox: {
    heading: 'Thiết kế hộp bánh trung thu & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp bánh trung thu 4–6 bánh, quà doanh nghiệp mùa thu online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Quà biếu Trung thu — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp bánh trung thu in logo thương hiệu',
        p: 'Chọn kiểu hộp (4–6 bánh, có khay), nhập kích thước, thêm logo và hoạ tiết Trung thu. Mivy dựng khuôn bế – gấp theo khổ để xưởng cấn bế đúng, ráp chắc.',
      },
      {
        h: 'File in chuẩn, ép kim sang trọng',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK. Hộp trung thu hay ép kim, dập nổi cho sang — nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.',
      },
      {
        h: 'Quà biếu Trung thu, đặt sớm',
        p: 'Hộp trung thu là quà biếu doanh nghiệp mùa thu. Mùa cao điểm xưởng tải, nên đặt sớm. Gửi yêu cầu in để được báo giá nhanh qua Zalo, duyệt mẫu rồi in lô.',
      },
    ],
    faq: [
      { q: 'In hộp bánh trung thu số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà biếu.' },
      { q: 'Có ép kim, dập nổi không?', a: 'Có. Hộp trung thu hay ép kim, dập nổi; nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Làm được hộp theo số bánh riêng không?', a: 'Có. Bạn chọn 4–6 bánh và nhập kích thước, Mivy dựng khuôn theo đúng khổ.' },
      { q: 'Nên đặt khi nào?', a: 'Đặt sớm trước Trung thu vì mùa cao điểm xưởng rất tải.' },
      { q: 'File in hộp gồm gì?', a: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }],
  },
  invitation: {
    heading: 'Thiết kế thiệp mời sự kiện & in theo yêu cầu',
    intro:
      'Tự thiết kế thiệp mời sự kiện, khai trương, hội thảo, tiệc công ty online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Trang trọng, nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Thiệp mời trang trọng, đúng nội dung',
        p: 'Chọn mẫu, điền tên sự kiện, thời gian, địa điểm và lời mời. Mẫu dựng bố cục trang trọng, canh lề an toàn, hỗ trợ cả tiếng Việt lẫn song ngữ.',
      },
      {
        h: 'File in chuẩn, ép kim sang trọng',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK. Thiệp mời hay ép kim, dập nổi cho sang — nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.',
      },
      {
        h: 'In nhiều tên khách mời',
        p: 'Cần in nhiều thiệp với tên khách khác nhau? Bạn dán danh sách để tạo hàng loạt, xuất file in rồi gửi yêu cầu. Mivy nhận cả đơn ít.',
      },
    ],
    faq: [
      { q: 'In thiệp mời số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sự kiện.' },
      { q: 'In được nhiều tên khách khác nhau không?', a: 'Được. Bạn dán danh sách tên để tạo hàng loạt thiệp rồi xuất file in.' },
      { q: 'Có ép kim, dập nổi không?', a: 'Có. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.' },
      { q: 'File in thiệp mời gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng, loại giấy và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in/thiep-tat-nien', label: 'Thiệp & quà sự kiện doanh nghiệp' }],
  },
  seating: {
    heading: 'Thiết kế sơ đồ chỗ ngồi tiệc & in theo yêu cầu',
    intro:
      'Tự thiết kế sơ đồ chỗ ngồi, bảng xếp bàn tiệc cưới, sự kiện online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Khách tìm bàn dễ — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Sơ đồ chỗ ngồi rõ ràng, dễ tìm bàn',
        p: 'Nhập tên bàn và danh sách khách, chọn bố cục. Mivy dàn sơ đồ rõ ràng, chữ to dễ đọc để khách tìm bàn nhanh khi vào tiệc.',
      },
      {
        h: 'File in khổ lớn chuẩn, chữ rõ từ xa',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in bảng to không vỡ, chữ rõ từ xa. Hợp đặt ở lối vào tiệc.',
      },
      {
        h: 'Tiệc cưới, sự kiện, nhận đơn lẻ',
        p: 'Chỉ cần 1 bảng cho buổi tiệc. Hợp tiệc cưới, gala, hội nghị. Gửi yêu cầu in để được tư vấn chất liệu (PP, format, ép khung) và báo giá.',
      },
    ],
    faq: [
      { q: 'In sơ đồ chỗ ngồi đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một buổi tiệc.' },
      { q: 'Cập nhật danh sách khách rồi in lại được chứ?', a: 'Được. Bạn sửa danh sách trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
      { q: 'In chất liệu gì?', a: 'Thường là PP cán format hoặc ép khung. Xưởng tư vấn khi báo giá.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước và chất liệu. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  welcomesign: {
    heading: 'Thiết kế bảng chào mừng tiệc & in theo yêu cầu',
    intro:
      'Tự thiết kế bảng chào mừng (welcome sign) tiệc cưới, sự kiện online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Đón khách ấn tượng — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Bảng chào mừng đón khách ấn tượng',
        p: 'Chọn mẫu, thêm tên cô dâu chú rể hoặc tên sự kiện, ngày và lời chào. Mẫu dựng bố cục sang, canh lề an toàn, chữ to để đặt ở lối vào đón khách.',
      },
      {
        h: 'File in khổ lớn chuẩn, đẹp từ xa',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in bảng to không vỡ hình, màu đẹp, chữ rõ từ xa.',
      },
      {
        h: 'Tiệc cưới, sự kiện, nhận đơn lẻ',
        p: 'Chỉ cần 1 bảng cho buổi tiệc. Hợp tiệc cưới, sinh nhật, khai trương, gala. Gửi yêu cầu in để được tư vấn chất liệu, giá đỡ và báo giá.',
      },
    ],
    faq: [
      { q: 'In bảng chào mừng đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một buổi tiệc.' },
      { q: 'In chất liệu gì?', a: 'Thường là PP cán format, foam hoặc ép khung kèm giá đỡ. Xưởng tư vấn khi báo giá.' },
      { q: 'Có kèm giá đỡ không?', a: 'Có. Bạn nêu nhu cầu giá đỡ khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước, chất liệu và giá đỡ. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  doormat: {
    heading: 'Thiết kế thảm chùi chân in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế thảm chùi chân in logo cửa hàng online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Thảm đón khách thương hiệu — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Thảm chùi chân in logo đón khách',
        p: 'Chọn kích thước thảm, thêm logo, lời chào (welcome) hoặc hình. Mivy dựng file đúng khổ thảm để in/dệt logo đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, bền khi chùi nhiều',
        p: 'File đúng kích thước, màu rõ ràng để in/dệt lên thảm bền màu dù chùi và giặt nhiều. Chữ chuyển nét giúp logo rõ ràng.',
      },
      {
        h: 'Cửa hàng, văn phòng, sự kiện',
        p: 'Thảm in logo đặt trước cửa hàng, văn phòng, gian hàng sự kiện tạo ấn tượng chuyên nghiệp. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá.',
      },
    ],
    faq: [
      { q: 'In thảm chùi chân số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho cửa hàng.' },
      { q: 'Thảm có bền khi giặt không?', a: 'Có. Dùng chất liệu và cách in/dệt bền màu; xưởng tư vấn khi báo giá.' },
      { q: 'Làm được theo kích thước riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng khổ thảm.' },
      { q: 'File in thảm gồm gì?', a: 'File đúng kích thước, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước, chất liệu và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  awning: {
    heading: 'Thiết kế mái hiên, bạt che in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế mái hiên, bạt che in logo cho cửa hàng, quán online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Mặt tiền nổi bật — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Mái hiên, bạt che in logo quán',
        p: 'Chọn mẫu, nhập kích thước mái hiên, thêm logo, tên quán và hotline. Mivy dựng file đúng khổ để in bạt mái hiên đúng kích thước, hiện rõ thương hiệu.',
      },
      {
        h: 'File in khổ lớn chuẩn, bền nắng mưa',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK để in bạt bền màu ngoài trời, không vỡ hình khi phóng to.',
      },
      {
        h: 'Mặt tiền nổi bật, nhận đơn lẻ',
        p: 'Mái hiên in logo che nắng mưa và quảng cáo thương hiệu cùng lúc. Gửi yêu cầu in để được tư vấn chất liệu bạt, khung và báo giá theo kích thước.',
      },
    ],
    faq: [
      { q: 'In mái hiên đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một cửa hàng.' },
      { q: 'In chất liệu gì?', a: 'Thường là bạt hiflex hoặc bạt mái hiên chuyên dụng bền ngoài trời. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm theo kích thước mặt tiền được không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng khổ.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Có thi công khung không?', a: 'Khung do xưởng thi công; Mivy lo thiết kế và file in. Nêu nhu cầu khi gửi yêu cầu.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tissuebox: {
    heading: 'Thiết kế hộp khăn giấy in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp khăn giấy in logo cho quán, khách sạn online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Bàn ăn thương hiệu — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp khăn giấy in logo quán',
        p: 'Chọn kiểu hộp, nhập kích thước, thêm logo và hoạ tiết. Mivy dựng khuôn bế – gấp theo khổ để xưởng cấn bế đúng, chừa khe rút khăn.',
      },
      {
        h: 'File in chuẩn, đúng màu thương hiệu',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK nên in đúng màu, gấp ráp gọn. Hộp khăn đẹp giúp bàn ăn chỉn chu, nhận diện tốt.',
      },
      {
        h: 'Quán, nhà hàng, khách sạn',
        p: 'Hộp khăn in logo đặt trên bàn quán cà phê, nhà hàng, phòng khách sạn. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In hộp khăn giấy số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán.' },
      { q: 'Làm được theo kích thước riêng không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn bế theo đúng khổ đó.' },
      { q: 'File in hộp gồm gì?', a: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK.' },
      { q: 'Chất liệu gì?', a: 'Thường là giấy ivory hoặc kraft cán màng. Xưởng tư vấn khi báo giá.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  wallmural: {
    heading: 'Thiết kế tranh dán tường & in theo yêu cầu',
    intro:
      'Tự thiết kế tranh dán tường (wall mural), decal trang trí tường online miễn phí rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Trang trí nhà, quán — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Tranh dán tường theo không gian',
        p: 'Chọn mẫu hoặc thêm hình, nhập kích thước mảng tường. Mivy dựng file đúng khổ, chia khổ in nếu tường lớn để dán ghép liền mạch, không đứt hình.',
      },
      {
        h: 'File in khổ lớn chuẩn, không vỡ hình',
        p: 'File ở độ phân giải phù hợp khổ lớn, có hệ màu chuẩn để in decal dán tường sắc nét, đúng màu dù phủ cả mảng tường.',
      },
      {
        h: 'Trang trí nhà, quán, văn phòng',
        p: 'Tranh dán tường tạo điểm nhấn cho quán cà phê, phòng khách, văn phòng, khu chụp hình. Mivy nhận cả đơn lẻ. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In tranh dán tường đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một mảng tường.' },
      { q: 'Tường lớn có bị đứt hình khi ghép không?', a: 'Không. Mivy chia khổ in để dán ghép liền mạch, hình liền nhau.' },
      { q: 'In chất liệu gì?', a: 'Thường là decal dán tường (PP, PVC) hoặc giấy dán tường. Xưởng tư vấn khi báo giá.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, chia khổ nếu cần, độ phân giải cao và hệ màu chuẩn.' },
      { q: 'Giá bao nhiêu?', a: 'Thường tính theo mét vuông và chất liệu. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  selfieframe: {
    heading: 'Thiết kế khung check-in cầm tay & in theo yêu cầu',
    intro:
      'Tự thiết kế khung check-in cầm tay, khung chụp hình sự kiện online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Sự kiện, tiệc, chụp hình — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Khung check-in cầm tay in logo, hashtag',
        p: 'Chọn mẫu, thêm logo, hashtag sự kiện và hoạ tiết. Mivy dựng file đúng khổ khung kèm đường cắt khoét giữa để xưởng bế formex đúng, cầm chụp chắc tay.',
      },
      {
        h: 'File in chuẩn, màu nổi bật',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in màu nổi bật, chữ rõ. Hashtag và logo hiện rõ khi khách chụp hình đăng mạng.',
      },
      {
        h: 'Sự kiện, tiệc, chụp hình',
        p: 'Khung check-in giúp khách chụp hình lan toả thương hiệu sự kiện. Mivy nhận cả đơn lẻ. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In khung check-in đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một sự kiện.' },
      { q: 'In chất liệu gì?', a: 'Thường là formex (PP foam) bế khoét giữa để cầm. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm được theo hình riêng không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để bế đúng.' },
      { q: 'File in khung gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  greeting: {
    heading: 'Thiết kế thiệp Tết doanh nghiệp & in theo yêu cầu',
    intro:
      'Tự thiết kế thiệp chúc Tết, thiệp tri ân gửi khách hàng, đối tác in logo công ty online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Đúng mùa Tết — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Thiệp Tết in logo, lời chúc công ty',
        p: 'Chọn mẫu, thêm logo, lời chúc và chữ ký lãnh đạo. Dán danh sách người nhận để tạo nhiều thiệp "Kính gửi…" khác nhau. Mẫu dựng trang trọng, canh lề an toàn.',
      },
      {
        h: 'File in chuẩn, ép kim sang trọng',
        p: 'File có tràn lề, vạch cắt, vạch gấp và khuôn ép kim. Thiệp Tết hay ép kim vàng, dập nổi — Mivy xuất sẵn khuôn gia công để xưởng làm đúng ngay từ đầu.',
      },
      {
        h: 'Đặt sớm cho kịp Tết',
        p: 'Cuối năm xưởng in rất tải, thiệp Tết nên đặt sớm. Gửi yêu cầu in để được báo giá nhanh qua Zalo, duyệt mẫu rồi in cả lô, giao kịp trước Tết.',
      },
    ],
    faq: [
      { q: 'In thiệp Tết doanh nghiệp số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng vừa phải để tặng khách, đối tác.' },
      { q: 'In nhiều tên người nhận khác nhau được không?', a: 'Được. Bạn dán danh sách để tạo hàng loạt thiệp "Kính gửi…" rồi xuất file in.' },
      { q: 'Có ép kim, dập nổi không?', a: 'Có. Mẫu hỗ trợ ép kim xuất sẵn khuôn; nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Nên đặt khi nào?', a: 'Đặt sớm trước Tết 4–6 tuần vì cuối năm xưởng rất tải.' },
      { q: 'File in thiệp gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, vạch gấp và khuôn ép kim nếu có.' },
    ],
    related: [
      { href: '/in/thiep-tat-nien', label: 'Thiệp & quà tất niên' },
      { href: '/in/lich-tet', label: 'Lịch & quà Tết' },
    ],
  },
  logo: {
    heading: 'Tạo logo online miễn phí cho thương hiệu',
    intro:
      'Tự tạo logo online miễn phí trên Mivy: chọn mẫu, đổi tên, màu, font rồi tải logo chất lượng cao dùng cho in ấn và online. Không cần biết thiết kế.',
    blocks: [
      {
        h: 'Chọn mẫu, đổi tên là có logo',
        p: 'Chọn một mẫu logo, nhập tên thương hiệu, đổi màu, font và biểu tượng. Xem trước ngay rồi tải — nhanh, không cần phần mềm hay kỹ năng thiết kế.',
      },
      {
        h: 'Tải file chất lượng cao, dùng được mọi nơi',
        p: 'Logo tải về ở độ phân giải cao, nền trong, dùng cho card visit, bao bì, biển hiệu lẫn ảnh đại diện mạng xã hội — in ra vẫn sắc nét.',
      },
      {
        h: 'Liền mạch với in ấn và bộ nhận diện',
        p: 'Có logo rồi, bạn cắm thẳng vào các sản phẩm in trên Mivy hoặc dựng bộ nhận diện đồng bộ. Cần in sản phẩm có logo, gửi yêu cầu in ngay.',
      },
    ],
    faq: [
      { q: 'Tạo logo trên Mivy có miễn phí không?', a: 'Có. Bạn tự thiết kế và xem trước miễn phí; chỉ trả phí khi đặt in sản phẩm nếu cần.' },
      { q: 'Logo tải về dùng in được không?', a: 'Được. File độ phân giải cao, nền trong, in card visit, bao bì, biển hiệu đều sắc nét.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Bạn chọn mẫu, đổi tên, màu, font là xong.' },
      { q: 'Dùng logo cho mạng xã hội được không?', a: 'Được. Logo dùng cho cả in ấn lẫn ảnh đại diện, bìa mạng xã hội.' },
      { q: 'Tạo xong in sản phẩm có logo được không?', a: 'Được. Bạn cắm logo vào các sản phẩm in trên Mivy rồi gửi yêu cầu in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  brandpack: {
    heading: 'Thiết kế bộ nhận diện thương hiệu online',
    intro:
      'Tự dựng bộ nhận diện thương hiệu (logo, màu, font, card visit, bao bì…) online miễn phí trên Mivy rồi xuất file chuẩn để in. Thương hiệu đồng bộ — không cần biết thiết kế.',
    blocks: [
      {
        h: 'Bộ nhận diện đồng bộ từ một nơi',
        p: 'Chọn logo, bảng màu và font thương hiệu; Mivy áp đồng bộ lên card visit, bao bì, tiêu đề thư, mạng xã hội. Thương hiệu nhất quán mà không cần thuê thiết kế.',
      },
      {
        h: 'File in chuẩn cho từng ấn phẩm',
        p: 'Mỗi ấn phẩm xuất file đúng chuẩn in (tràn lề, vạch cắt, CMYK) nên đưa cho xưởng là in được, đúng màu thương hiệu.',
      },
      {
        h: 'Liền mạch với đặt in',
        p: 'Dựng bộ nhận diện xong, bạn in luôn card visit, bao bì, standee… đồng bộ. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'Dựng bộ nhận diện trên Mivy miễn phí không?', a: 'Có. Bạn tự dựng và xem trước miễn phí; chỉ trả phí khi đặt in.' },
      { q: 'Bộ nhận diện gồm những gì?', a: 'Logo, bảng màu, font và áp lên các ấn phẩm như card visit, bao bì, tiêu đề thư, mạng xã hội.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Mivy áp đồng bộ tự động theo logo, màu, font bạn chọn.' },
      { q: 'In các ấn phẩm được không?', a: 'Được. Mỗi ấn phẩm xuất file in chuẩn, gửi yêu cầu in là làm được.' },
      { q: 'File gồm gì?', a: 'File đúng chuẩn in cho từng ấn phẩm: tràn lề, vạch cắt và hệ màu CMYK.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  'brand-assets': {
    heading: 'Thiết kế ảnh bìa & avatar thương hiệu online',
    intro:
      'Tự thiết kế ảnh bìa, ảnh đại diện (avatar) cho Facebook, mạng xã hội, thương hiệu online miễn phí trên Mivy. Đúng kích thước từng nền tảng — không cần biết thiết kế.',
    blocks: [
      {
        h: 'Ảnh bìa, avatar đúng kích thước nền tảng',
        p: 'Chọn mẫu, thêm logo và thông điệp, chọn nền tảng (Facebook, mạng xã hội). Mivy dựng đúng kích thước từng nơi để ảnh không bị cắt méo khi đăng.',
      },
      {
        h: 'Đồng bộ với thương hiệu',
        p: 'Dùng logo, màu, font thương hiệu để ảnh bìa và avatar đồng bộ với bộ nhận diện. Xem trước ngay rồi tải ảnh sắc nét để đăng.',
      },
      {
        h: 'Nhanh, miễn phí, không cần thiết kế',
        p: 'Chỉ cần chọn mẫu và điền nội dung là có bộ ảnh thương hiệu dùng cho mạng xã hội. Cần in ấn phẩm thương hiệu, bạn gửi yêu cầu in trên Mivy.',
      },
    ],
    faq: [
      { q: 'Thiết kế ảnh bìa, avatar có miễn phí không?', a: 'Có. Bạn tự thiết kế và tải miễn phí.' },
      { q: 'Có đúng kích thước Facebook, mạng xã hội không?', a: 'Có. Mivy dựng đúng kích thước từng nền tảng để ảnh không bị cắt méo.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Bạn chọn mẫu, thêm logo và nội dung là xong.' },
      { q: 'Ảnh tải về dùng được ngay chứ?', a: 'Được. Ảnh sắc nét, đúng kích thước để đăng ngay.' },
      { q: 'Có đồng bộ thương hiệu không?', a: 'Có. Dùng logo, màu, font thương hiệu để đồng bộ với bộ nhận diện.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  marketing: {
    heading: 'Thiết kế poster, banner quảng cáo online',
    intro:
      'Tự thiết kế poster, banner quảng cáo, ảnh khuyến mãi online miễn phí trên Mivy: chọn mẫu, điền nội dung, tải ảnh sắc nét để đăng hoặc in. Không cần biết thiết kế.',
    blocks: [
      {
        h: 'Poster, banner sale chọn mẫu điền nội dung',
        p: 'Chọn mẫu theo ngành, thêm tiêu đề, giá, hình và logo. Đổi màu, đổi bố cục ngay trên màn hình, xem trước rồi tải — nhanh, không cần phần mềm.',
      },
      {
        h: 'Tải ảnh đăng mạng hoặc file in',
        p: 'Tải ảnh sắc nét đa tỷ lệ (vuông, dọc, ngang) để đăng mạng xã hội, hoặc xuất file in chuẩn để in poster, standee và gửi yêu cầu in.',
      },
      {
        h: 'Đa ngành, cập nhật nhanh',
        p: 'Mẫu phủ nhiều ngành: F&B, thời trang, dịch vụ, sự kiện. Đổi nội dung chiến dịch rồi xuất lại bất cứ lúc nào. Cần in, gửi yêu cầu in ngay trên Mivy.',
      },
    ],
    faq: [
      { q: 'Thiết kế poster, banner có miễn phí không?', a: 'Có. Bạn tự thiết kế và tải miễn phí; chỉ trả phí khi đặt in nếu cần.' },
      { q: 'Tải được nhiều tỷ lệ không?', a: 'Được. Tải đa tỷ lệ (vuông, dọc, ngang) để đăng mạng xã hội hoặc in.' },
      { q: 'In poster, standee được không?', a: 'Được. Xuất file in chuẩn rồi gửi yêu cầu in trên Mivy.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Bạn chọn mẫu, điền nội dung là xong.' },
      { q: 'Có mẫu cho ngành của tôi không?', a: 'Mẫu phủ nhiều ngành: F&B, thời trang, dịch vụ, sự kiện và nhiều hơn.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  infographic: {
    heading: 'Thiết kế infographic online miễn phí',
    intro:
      'Tự thiết kế infographic, ảnh thông tin, bài đăng số liệu online miễn phí trên Mivy: chọn mẫu, điền số liệu, tải ảnh sắc nét để đăng hoặc in. Không cần biết thiết kế.',
    blocks: [
      {
        h: 'Infographic chọn mẫu, điền số liệu',
        p: 'Chọn mẫu, điền tiêu đề, số liệu, các bước hoặc so sánh. Mẫu dựng bố cục rõ ràng, dễ đọc, canh màu hài hoà — chỉ cần thay nội dung của bạn.',
      },
      {
        h: 'Tải ảnh đăng mạng hoặc file in',
        p: 'Tải ảnh sắc nét để đăng mạng xã hội, website, hoặc xuất file in chuẩn để in tờ rơi, standee thông tin và gửi yêu cầu in.',
      },
      {
        h: 'Truyền tải thông tin dễ hiểu',
        p: 'Infographic giúp số liệu, quy trình dễ hiểu và dễ chia sẻ hơn. Đổi nội dung rồi xuất lại bất cứ lúc nào. Nhanh, miễn phí, không cần kỹ năng thiết kế.',
      },
    ],
    faq: [
      { q: 'Thiết kế infographic có miễn phí không?', a: 'Có. Bạn tự thiết kế và tải miễn phí.' },
      { q: 'Tải ảnh đăng mạng được không?', a: 'Được. Tải ảnh sắc nét để đăng mạng xã hội, website.' },
      { q: 'In infographic được không?', a: 'Được. Xuất file in chuẩn để in tờ rơi, standee rồi gửi yêu cầu in.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Bạn chọn mẫu, điền số liệu, nội dung là xong.' },
      { q: 'Có cập nhật nội dung rồi xuất lại được chứ?', a: 'Được. Bạn sửa nội dung rồi xuất lại bất cứ lúc nào.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  signage: {
    heading: 'Thiết kế bảng hiệu quán, cửa hàng online',
    intro:
      'Tự thiết kế bảng hiệu quán cà phê, cửa hàng, shop online miễn phí trên Mivy rồi xuất file in chuẩn khổ lớn và gửi yêu cầu in. Mặt tiền chuyên nghiệp — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Bảng hiệu mặt tiền đẹp, đúng khổ',
        p: 'Chọn mẫu, thêm tên quán, logo và thông tin, nhập kích thước mặt tiền. Mivy dựng file đúng khổ để in bạt, hiflex hoặc gia công alu, mica theo yêu cầu.',
      },
      {
        h: 'File in khổ lớn chuẩn, chữ to rõ',
        p: 'File ở độ phân giải phù hợp khổ lớn, có tràn lề và hệ màu CMYK nên in không vỡ hình, chữ to rõ, đọc được từ ngoài đường.',
      },
      {
        h: 'Mặt tiền chuyên nghiệp, nhận đơn lẻ',
        p: 'Chỉ cần 1 bảng cho quán cũng làm được. Gửi yêu cầu in để được tư vấn chất liệu (bạt, hiflex, alu, mica, chữ nổi) và báo giá; khung do xưởng thi công.',
      },
    ],
    faq: [
      { q: 'Làm bảng hiệu đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một quán, cửa hàng.' },
      { q: 'Có những chất liệu nào?', a: 'Phổ biến là bạt hiflex, alu, mica, chữ nổi. Xưởng tư vấn hợp mặt tiền và ngân sách khi báo giá.' },
      { q: 'Làm theo kích thước mặt tiền được không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng khổ.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, độ phân giải phù hợp in khổ lớn, có tràn lề và hệ màu CMYK.' },
      { q: 'Có thi công khung không?', a: 'Khung và lắp đặt do xưởng; Mivy lo thiết kế và file in. Nêu nhu cầu khi gửi yêu cầu.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  signboard: {
    heading: 'Thiết kế biển báo, bảng chỉ dẫn & in theo yêu cầu',
    intro:
      'Tự thiết kế biển báo, bảng chỉ dẫn, bảng nội quy online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Toà nhà, quán, sự kiện — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Biển báo, chỉ dẫn rõ ràng dễ hiểu',
        p: 'Chọn mẫu, thêm ký hiệu, mũi tên, chữ chỉ dẫn hoặc nội quy. Mẫu dựng bố cục rõ ràng, chữ to, biểu tượng dễ hiểu, canh lề an toàn.',
      },
      {
        h: 'File in chuẩn, bền trong ngoài',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK. In trên decal, mica, alu hoặc format tùy vị trí trong nhà/ngoài trời — xưởng tư vấn chất liệu khi báo giá.',
      },
      {
        h: 'Toà nhà, quán, sự kiện, nhận đơn lẻ',
        p: 'Hợp biển chỉ dẫn toà nhà, bảng nội quy quán, hướng dẫn sự kiện. Mivy nhận cả đơn lẻ. Gửi yêu cầu in để được tư vấn và báo giá.',
      },
    ],
    faq: [
      { q: 'In biển báo, chỉ dẫn đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ.' },
      { q: 'In chất liệu gì?', a: 'Thường là decal, mica, alu hoặc format tùy vị trí. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm theo kích thước riêng được không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng khổ.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước, chất liệu và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  cv: {
    heading: 'Tạo CV online miễn phí, tải PDF',
    intro:
      'Tự tạo CV, hồ sơ xin việc online miễn phí trên Mivy: chọn mẫu, điền thông tin, tải PDF gọn gàng để nộp. Không cần biết thiết kế, không tốn tiền.',
    blocks: [
      {
        h: 'CV chọn mẫu, điền thông tin là xong',
        p: 'Chọn mẫu CV, điền thông tin cá nhân, kinh nghiệm, kỹ năng và học vấn. Đổi màu, font, bố cục ngay trên màn hình rồi tải PDF — nhanh, không cần phần mềm.',
      },
      {
        h: 'Tải PDF gọn gàng, dễ đọc',
        p: 'CV tải về dạng PDF đúng khổ A4, bố cục gọn gàng, chữ rõ ràng, mở được trên mọi thiết bị và in ra sắc nét để nộp trực tiếp.',
      },
      {
        h: 'Miễn phí, nhiều mẫu phù hợp ngành',
        p: 'Nhiều mẫu CV từ tối giản tới sáng tạo, hợp nhiều ngành nghề. Tạo và tải miễn phí. Cần in CV đẹp trên giấy tốt, bạn gửi yêu cầu in trên Mivy.',
      },
    ],
    faq: [
      { q: 'Tạo CV trên Mivy có miễn phí không?', a: 'Có. Bạn tự tạo và tải PDF miễn phí.' },
      { q: 'CV tải về định dạng gì?', a: 'PDF đúng khổ A4, mở được trên mọi thiết bị và in sắc nét.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Bạn chọn mẫu, điền thông tin là xong.' },
      { q: 'Có nhiều mẫu không?', a: 'Có. Nhiều mẫu từ tối giản tới sáng tạo, hợp nhiều ngành nghề.' },
      { q: 'In CV trên giấy tốt được không?', a: 'Được. Gửi yêu cầu in trên Mivy để in CV đẹp trên giấy chất lượng.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  hashtag: {
    heading: 'Thiết kế hashtag cầm tay & in theo yêu cầu',
    intro:
      'Tự thiết kế hashtag cầm tay, props chụp hình sự kiện online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Tiệc, sự kiện, check-in — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Hashtag cầm tay in theo sự kiện',
        p: 'Chọn mẫu, thêm hashtag, tên sự kiện hoặc tên cô dâu chú rể. Mivy dựng file đúng khổ kèm đường cắt để xưởng bế formex đúng chữ, cầm chụp chắc tay.',
      },
      {
        h: 'File in chuẩn, màu nổi bật',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in màu nổi bật, chữ rõ. Hashtag hiện rõ khi khách chụp hình đăng mạng.',
      },
      {
        h: 'Tiệc, sự kiện, check-in',
        p: 'Hashtag cầm tay giúp khách chụp hình lan toả sự kiện. Mivy nhận cả đơn lẻ. Gửi yêu cầu in để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'In hashtag cầm tay đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một sự kiện.' },
      { q: 'In chất liệu gì?', a: 'Thường là formex (PP foam) bế theo chữ. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm theo chữ, hashtag riêng được không?', a: 'Có. Bạn nhập hashtag, Mivy xuất file kèm đường cắt để bế đúng.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  stationery: {
    heading: 'Thiết kế bộ văn phòng (tiêu đề thư, phong bì) & in theo yêu cầu',
    intro:
      'Tự thiết kế bộ văn phòng — tiêu đề thư, phong bì, kẹp file, thẻ ghi chú — in logo công ty online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bộ văn phòng đồng bộ thương hiệu',
        p: 'Chọn mẫu, thêm logo và thông tin công ty; Mivy áp đồng bộ lên tiêu đề thư, phong bì, kẹp file. Thương hiệu nhất quán trên mọi giấy tờ giao dịch.',
      },
      {
        h: 'File in chuẩn, đúng màu thương hiệu',
        p: 'Mỗi ấn phẩm xuất file đúng chuẩn in (tràn lề, vạch cắt, CMYK) nên in đúng màu, sắc nét. Đưa cho xưởng là in được ngay.',
      },
      {
        h: 'Chuyên nghiệp hoá giao dịch, nhận đơn ít',
        p: 'Giấy tờ in logo giúp công ty nhìn chuyên nghiệp. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn giấy và báo giá theo số lượng.',
      },
    ],
    faq: [
      { q: 'In bộ văn phòng số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho công ty, cơ sở nhỏ.' },
      { q: 'Bộ văn phòng gồm những gì?', a: 'Thường là tiêu đề thư, phong bì, kẹp file, thẻ ghi chú — áp đồng bộ logo, màu thương hiệu.' },
      { q: 'File in gồm gì?', a: 'Mỗi ấn phẩm có file đúng khổ, tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Có cần biết thiết kế không?', a: 'Không. Mivy áp đồng bộ tự động theo logo và màu bạn chọn.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng và loại giấy từng ấn phẩm. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  tableware: {
    heading: 'Thiết kế bộ bàn ăn F&B (lót khay, giấy lót) & in theo yêu cầu',
    intro:
      'Tự thiết kế bộ bàn ăn cho quán F&B — giấy lót khay, lót ly, tent card — in logo online miễn phí rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bộ bàn ăn đồng bộ thương hiệu quán',
        p: 'Chọn mẫu, thêm logo và hoạ tiết; Mivy áp đồng bộ lên giấy lót khay, lót ly, tent card. Bàn ăn nhìn chỉn chu, tăng nhận diện thương hiệu quán.',
      },
      {
        h: 'File in chuẩn, mực phù hợp thực phẩm',
        p: 'File có tràn lề, vạch cắt và hệ màu CMYK. Giấy lót khay tiếp xúc đồ ăn cần mực phù hợp — xưởng tư vấn chất liệu, loại mực khi báo giá.',
      },
      {
        h: 'Quán cà phê, nhà hàng, nhận đơn ít',
        p: 'Hợp quán cà phê, nhà hàng muốn bàn ăn đồng bộ. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In bộ bàn ăn số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán.' },
      { q: 'Giấy lót khay có an toàn thực phẩm không?', a: 'Giấy lót tiếp xúc đồ ăn dùng mực phù hợp; xưởng tư vấn chất liệu đạt yêu cầu khi báo giá.' },
      { q: 'Gồm những gì?', a: 'Thường là giấy lót khay, lót ly, tent card — áp đồng bộ logo, hoạ tiết quán.' },
      { q: 'File in gồm gì?', a: 'Mỗi món có file đúng khổ, tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  qrstand: {
    heading: 'Thiết kế kệ mica QR để bàn & in theo yêu cầu',
    intro:
      'Tự thiết kế kệ mica QR để bàn (menu QR, mã thanh toán) online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Quán cà phê, nhà hàng — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Kệ QR để bàn in logo, mã quét',
        p: 'Chọn mẫu, thêm logo, mã QR menu/thanh toán và hướng dẫn. Mivy dựng file đúng khổ kẹp mica để in tấm chèn, đặt đứng trên bàn cho khách quét.',
      },
      {
        h: 'File in chuẩn, QR quét nét',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và mã QR đủ độ tương phản để quét nhạy. Chữ chuyển nét giúp hướng dẫn rõ ràng.',
      },
      {
        h: 'Gọi món, thanh toán tại bàn',
        p: 'Kệ QR giúp khách tự xem menu, gọi món, thanh toán nhanh. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn kẹp mica và báo giá.',
      },
    ],
    faq: [
      { q: 'In kệ QR để bàn số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán.' },
      { q: 'Mã QR in ra quét được không?', a: 'Được. File giữ đủ độ tương phản và kích thước để QR quét nhạy.' },
      { q: 'Có kèm kẹp mica không?', a: 'Có. Bạn nêu nhu cầu kẹp mica khi gửi yêu cầu in để xưởng báo giá trọn bộ.' },
      { q: 'File in gồm gì?', a: 'File tấm chèn đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Cập nhật QR rồi in lại được chứ?', a: 'Được. Bạn đổi mã QR trên Mivy rồi xuất file in mới bất cứ lúc nào.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  cupcarrier: {
    heading: 'Thiết kế túi đựng ly trà sữa in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế túi đựng 1–2 ly trà sữa, cà phê mang đi in logo online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Túi đựng ly in logo quán',
        p: 'Chọn kiểu túi (1 ly, 2 ly), chất liệu (PE, giấy), thêm logo và tên quán. Mivy dựng file đúng khổ túi để in logo đúng vị trí, cân đối.',
      },
      {
        h: 'File in chuẩn, nét trên túi',
        p: 'File đúng khổ túi, màu rõ ràng để in logo lên túi PE/giấy đều, nét. Chữ chuyển nét giúp tên quán sắc nét dù khổ in nhỏ.',
      },
      {
        h: 'Đồ uống mang đi chuyên nghiệp',
        p: 'Túi đựng ly in logo giúp đồ mang đi nhận diện tốt, chuyên nghiệp. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In túi đựng ly số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quán.' },
      { q: 'In được 1 ly và 2 ly chứ?', a: 'Được. Bạn chọn kiểu túi 1 ly hoặc 2 ly khi thiết kế.' },
      { q: 'In mấy màu?', a: 'Thường in 1–2 màu lên túi. Nêu nhu cầu khi gửi yêu cầu in để báo giá.' },
      { q: 'File in túi gồm gì?', a: 'File đúng khổ túi, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'In cho quán, F&B' }],
  },
  cardecal: {
    heading: 'Thiết kế decal dán xe công ty & in theo yêu cầu',
    intro:
      'Tự thiết kế decal thân xe tải, xe van, ô tô dịch vụ in logo + hotline online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Quảng cáo di động — nhận cả đơn lẻ.',
    blocks: [
      {
        h: 'Decal dán xe in logo, hotline',
        p: 'Chọn loại xe, nhập kích thước vùng dán, thêm logo, hotline và thông điệp. Mivy dựng file đúng khổ các mặt xe để in decal dán vừa vặn, hiện rõ thương hiệu.',
      },
      {
        h: 'File in chuẩn, bền ngoài trời',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK. Decal dán xe chạy nắng mưa cần chất liệu bền màu, cán bóng — xưởng tư vấn khi báo giá.',
      },
      {
        h: 'Quảng cáo di động khắp nơi',
        p: 'Decal xe như bảng quảng cáo di động, tăng nhận diện khi xe chạy. Mivy nhận cả đơn lẻ. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In decal dán xe đơn lẻ được không?', a: 'Được. Mivy nhận cả đơn lẻ cho một xe.' },
      { q: 'Decal có bền nắng mưa không?', a: 'Có. Dùng decal bền màu, cán bóng chống phai; xưởng tư vấn khi báo giá.' },
      { q: 'Làm theo kích thước xe riêng được không?', a: 'Có. Bạn nhập kích thước, Mivy dựng file đúng các mặt xe.' },
      { q: 'File in gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → thi công dán → giao.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  pouch: {
    heading: 'Thiết kế túi zip, bao bì sản phẩm & in theo yêu cầu',
    intro:
      'Tự thiết kế túi zip, bao bì màng ghép đựng sản phẩm in logo online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Thực phẩm, mỹ phẩm — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Túi zip, bao bì màng ghép in thương hiệu',
        p: 'Chọn kiểu túi (zip, đứng đáy, 3 biên), nhập kích thước, thêm logo và thông tin sản phẩm. Mivy dựng file đúng khổ túi để in đúng vị trí, chừa chỗ thông tin bắt buộc.',
      },
      {
        h: 'File in chuẩn, nét trên màng ghép',
        p: 'File đúng khổ, màu rõ ràng để in trên màng ghép đẹp, nét, bảo quản tốt sản phẩm. Chữ chuyển nét giúp thông tin rõ ràng.',
      },
      {
        h: 'Thực phẩm, mỹ phẩm, nhận đơn ít',
        p: 'Hợp đồ ăn khô, hạt, trà, mỹ phẩm, bột. Mivy nhận cả đơn ít cho thương hiệu mới. Gửi yêu cầu in để được tư vấn chất liệu màng và báo giá.',
      },
    ],
    faq: [
      { q: 'In túi zip, bao bì số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho thương hiệu mới.' },
      { q: 'Có những kiểu túi nào?', a: 'Phổ biến là túi zip, túi đứng đáy, túi 3 biên, có thể có van, cửa sổ. Xưởng tư vấn khi báo giá.' },
      { q: 'Có chừa chỗ thành phần, HSD không?', a: 'Có. Mẫu được dựng để đủ chỗ cho thông tin bắt buộc.' },
      { q: 'File in túi gồm gì?', a: 'File đúng khổ túi, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/tem-nhan-fnb', label: 'Bao bì & tem nhãn F&B' }],
  },
  favorbox: {
    heading: 'Thiết kế hộp quà cưới mini & in theo yêu cầu',
    intro:
      'Tự thiết kế hộp quà cưới mini (favor box) đựng quà cảm ơn khách online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Tiệc cưới, sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Hộp quà mini đựng quà cảm ơn khách',
        p: 'Chọn kiểu hộp mini, thêm tên cô dâu chú rể, ngày cưới và lời cảm ơn. Mivy dựng khuôn bế – gấp theo khổ để xưởng cấn bế đúng, gấp thành hộp xinh.',
      },
      {
        h: 'File in chuẩn, ép kim xinh xắn',
        p: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK. Hộp quà cưới hay ép kim tên, ngày — nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá.',
      },
      {
        h: 'Tiệc cưới, sự kiện, nhận đơn ít',
        p: 'Hộp favor đựng kẹo, nến, quà nhỏ cảm ơn khách dự tiệc. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá nhanh qua Zalo.',
      },
    ],
    faq: [
      { q: 'In hộp quà cưới mini số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho tiệc nhỏ.' },
      { q: 'Có ép kim tên, ngày không?', a: 'Có. Nêu nhu cầu khi gửi yêu cầu in để xưởng báo giá gia công.' },
      { q: 'Làm theo kích thước riêng được không?', a: 'Có. Bạn nhập kích thước, Mivy dựng khuôn bế theo đúng khổ.' },
      { q: 'File in hộp gồm gì?', a: 'File có tràn lề, đường bế, đường gấp và hệ màu CMYK.' },
      { q: 'Quy trình đặt in thế nào?', a: 'Thiết kế → gửi yêu cầu in → báo giá qua Zalo → cọc → in mẫu duyệt → in cả lô → giao.' },
    ],
    related: [{ href: '/in/thiep-tat-nien', label: 'Thiệp & quà sự kiện' }],
  },
  notepad: {
    heading: 'Thiết kế giấy note in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế giấy note, sticky note in logo công ty online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Quà tặng văn phòng — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Giấy note in logo theo ý bạn',
        p: 'Chọn khổ giấy note, thêm logo, hoạ tiết hoặc kẻ dòng. Mivy dựng file đúng khổ để in và đóng tập giấy note có keo dán cạnh.',
      },
      {
        h: 'File in chuẩn, nét đúng màu',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in sắc nét, đúng màu thương hiệu dù khổ nhỏ.',
      },
      {
        h: 'Quà tặng văn phòng, nhận đơn ít',
        p: 'Giấy note in logo làm quà tặng khách, văn phòng phẩm nội bộ, quà hội thảo. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá.',
      },
    ],
    faq: [
      { q: 'In giấy note số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Có keo dán cạnh như sticky note không?', a: 'Có. Bạn nêu nhu cầu keo dán khi gửi yêu cầu in để xưởng báo giá.' },
      { q: 'Làm theo khổ riêng được không?', a: 'Có. Bạn chọn khổ giấy note, Mivy dựng file đúng khổ.' },
      { q: 'File in giấy note gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy khổ, số tờ mỗi tập và số lượng. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  patch: {
    heading: 'Thiết kế patch thêu (nhãn thêu) & làm theo yêu cầu',
    intro:
      'Tự thiết kế patch thêu, logo thêu đính áo, mũ, balo online miễn phí trên Mivy rồi xuất file chuẩn và gửi yêu cầu làm. Đồng phục, local brand — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Patch thêu logo theo ý bạn',
        p: 'Chọn hình dạng patch, thêm logo và chữ, chọn màu chỉ. Mivy dựng file đúng khổ kèm đường viền để xưởng thêu và cắt viền (merrow/laser) đúng hình.',
      },
      {
        h: 'File chuẩn, logo nét khi thêu',
        p: 'File đúng kích thước, màu rõ ràng để chuyển thành mẫu thêu sắc nét. Chi tiết quá nhỏ sẽ được tối giản cho hợp kỹ thuật thêu — xưởng tư vấn khi báo giá.',
      },
      {
        h: 'Đồng phục, local brand, nhận đơn ít',
        p: 'Patch thêu đính áo, mũ, balo tăng chất cho đồng phục, local brand. Mivy nhận cả đơn ít. Gửi yêu cầu làm để được tư vấn kiểu đính và báo giá.',
      },
    ],
    faq: [
      { q: 'Làm patch thêu số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho local brand, đồng phục.' },
      { q: 'Logo nhiều chi tiết thêu được không?', a: 'Chi tiết quá nhỏ sẽ được tối giản cho hợp kỹ thuật thêu; xưởng tư vấn khi báo giá.' },
      { q: 'Có kiểu đính nào?', a: 'Đính may, keo nhiệt (ủi) hoặc khoá dán. Bạn nêu nhu cầu khi gửi yêu cầu làm.' },
      { q: 'File làm patch gồm gì?', a: 'File đúng kích thước, màu chỉ rõ ràng và đường viền cắt.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước, độ phức tạp và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  pin: {
    heading: 'Thiết kế huy hiệu cài áo (pin) & làm theo yêu cầu',
    intro:
      'Tự thiết kế huy hiệu cài áo, pin logo, pin sự kiện online miễn phí trên Mivy rồi xuất file chuẩn và gửi yêu cầu làm. Quà tặng, đồng phục, sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Huy hiệu cài áo in logo, hình theo ý bạn',
        p: 'Chọn hình dạng pin, thêm logo, chữ hoặc hình. Mivy dựng file đúng khổ kèm đường cắt để xưởng làm pin (in, ép mica hoặc men) đúng hình, gắn kim cài sau.',
      },
      {
        h: 'File chuẩn, nét cả chi tiết nhỏ',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao nên hình, chữ sắc nét dù khổ pin nhỏ.',
      },
      {
        h: 'Quà tặng, đồng phục, sự kiện',
        p: 'Pin logo làm quà tặng, phụ kiện đồng phục, vật phẩm sự kiện, fan. Mivy nhận cả đơn ít. Gửi yêu cầu làm để được tư vấn chất liệu và báo giá.',
      },
    ],
    faq: [
      { q: 'Làm huy hiệu cài áo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, sự kiện.' },
      { q: 'Có những loại pin nào?', a: 'Phổ biến là pin in phủ mica, pin men (enamel), pin kim loại. Xưởng tư vấn khi báo giá.' },
      { q: 'Làm theo hình riêng được không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để làm đúng hình.' },
      { q: 'File làm pin gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy chất liệu và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  fan: {
    heading: 'Thiết kế quạt cầm tay in logo & in theo yêu cầu',
    intro:
      'Tự thiết kế quạt cầm tay, quạt nhựa in logo làm quà tặng, quạt sự kiện online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Quạt cầm tay in logo theo ý bạn',
        p: 'Chọn kiểu quạt (nhựa, giấy), thêm logo, hình và thông điệp. Mivy dựng file đúng khổ mặt quạt để in đúng vị trí, cân đối hai mặt.',
      },
      {
        h: 'File in chuẩn, màu nổi bật',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và chữ chuyển nét nên in màu nổi bật, chữ rõ. Logo và thông điệp hiện rõ khi khách phe phẩy.',
      },
      {
        h: 'Quà tặng, quạt sự kiện mùa hè',
        p: 'Quạt cầm tay in logo làm quà tặng, vật phẩm sự kiện ngoài trời, quảng cáo mùa hè. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá.',
      },
    ],
    faq: [
      { q: 'In quạt cầm tay số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng, sự kiện.' },
      { q: 'Có những loại quạt nào?', a: 'Phổ biến là quạt nhựa và quạt giấy (cầm tay). Xưởng tư vấn khi báo giá.' },
      { q: 'In được hai mặt không?', a: 'Được. Mivy dựng file hai mặt đúng khổ mặt quạt.' },
      { q: 'File in quạt gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy loại quạt và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  mousepad: {
    heading: 'Thiết kế lót chuột in hình & in theo yêu cầu',
    intro:
      'Tự thiết kế lót chuột (mousepad) in logo, in hình làm quà tặng online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Quà văn phòng, quà tặng — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Lót chuột in logo, in hình theo ý bạn',
        p: 'Chọn hình dạng lót chuột, thêm logo, ảnh hoặc hình. Mivy dựng file đúng khổ kèm đường cắt để xưởng in và bế đúng hình, cân đối.',
      },
      {
        h: 'File in chuẩn, hình sắc nét',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao để in chuyển nhiệt lên mặt vải lót chuột đúng màu, nét.',
      },
      {
        h: 'Quà văn phòng, quà tặng',
        p: 'Lót chuột in logo làm quà tặng khách, quà nội bộ, vật phẩm thương hiệu để bàn làm việc. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá.',
      },
    ],
    faq: [
      { q: 'In lót chuột số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho quà tặng.' },
      { q: 'Dùng ảnh của tôi được không?', a: 'Được. Nên dùng ảnh rõ nét để in đẹp.' },
      { q: 'Làm theo hình riêng được không?', a: 'Có. Bạn thiết kế hình, Mivy xuất file kèm đường cắt để bế đúng hình đó.' },
      { q: 'File in lót chuột gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và độ phân giải cao.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kích thước và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  nametag: {
    heading: 'Thiết kế bảng tên cài áo & in theo yêu cầu',
    intro:
      'Tự thiết kế bảng tên cài áo nhân viên (name tag) in logo online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Nhà hàng, shop, sự kiện — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Bảng tên cài áo in logo, chức danh',
        p: 'Chọn mẫu, thêm logo công ty, tên và chức danh nhân viên. Mivy dựng file đúng khổ bảng tên để gia công mica, kim loại hoặc in theo yêu cầu, gắn kim cài/nam châm.',
      },
      {
        h: 'File in/khắc chuẩn, nét trang trọng',
        p: 'File đúng khổ, hệ màu chuẩn và chữ chuyển nét nên in hoặc khắc sắc nét. Logo và tên hiện rõ, chuyên nghiệp.',
      },
      {
        h: 'In nhiều tên cho cả nhóm',
        p: 'Cần làm bảng tên cho cả cửa hàng, sự kiện? Bạn dán danh sách tên để tạo hàng loạt rồi xuất file. Mivy nhận cả đơn ít. Gửi yêu cầu in để được báo giá.',
      },
    ],
    faq: [
      { q: 'Làm bảng tên cài áo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít.' },
      { q: 'Làm nhiều tên khác nhau được không?', a: 'Được. Bạn dán danh sách tên để tạo hàng loạt rồi xuất file.' },
      { q: 'Có những chất liệu nào?', a: 'Phổ biến là mica, kim loại hoặc in phủ. Gắn kim cài hoặc nam châm. Xưởng tư vấn khi báo giá.' },
      { q: 'File gồm gì?', a: 'File đúng khổ, hệ màu chuẩn và chữ đã chuyển nét để in hoặc khắc.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy chất liệu và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  sash: {
    heading: 'Thiết kế băng đeo chéo (sash) & làm theo yêu cầu',
    intro:
      'Tự thiết kế băng đeo chéo in chữ cho sự kiện, cuộc thi, lễ tốt nghiệp online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu làm. Nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Băng đeo chéo in chữ theo sự kiện',
        p: 'Chọn màu băng, thêm chữ (tên danh hiệu, sự kiện, lớp), chọn kiểu chữ. Mivy dựng file đúng khổ băng để in/thêu chữ đúng vị trí, cân đối khi đeo chéo.',
      },
      {
        h: 'File in chuẩn, chữ nét trên vải',
        p: 'File đúng khổ băng, màu rõ ràng để in nhũ hoặc thêu chữ lên vải satin đẹp, nét. Chữ chuyển nét giúp danh hiệu rõ ràng.',
      },
      {
        h: 'Cuộc thi, tốt nghiệp, sự kiện',
        p: 'Băng đeo chéo cho cuộc thi sắc đẹp, lễ tốt nghiệp, đại sứ sự kiện. Mivy nhận cả đơn ít. Gửi yêu cầu làm để được tư vấn và báo giá.',
      },
    ],
    faq: [
      { q: 'Làm băng đeo chéo số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho sự kiện.' },
      { q: 'In hay thêu chữ lên băng?', a: 'Cả hai. In nhũ nhanh, thêu bền và sang. Xưởng tư vấn khi báo giá.' },
      { q: 'Chọn được màu băng không?', a: 'Có. Bạn chọn màu băng trước khi thiết kế phần chữ.' },
      { q: 'File gồm gì?', a: 'File đúng khổ băng, màu rõ ràng và chữ đã chuyển nét.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy kiểu làm và số lượng. Bạn được báo giá trước khi làm.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
  scratchcard: {
    heading: 'Thiết kế thẻ cào trúng thưởng & in theo yêu cầu',
    intro:
      'Tự thiết kế thẻ cào trúng thưởng, thẻ cào khuyến mãi in logo online miễn phí trên Mivy rồi xuất file in chuẩn và gửi yêu cầu in. Chương trình khuyến mãi — nhận cả đơn số lượng ít.',
    blocks: [
      {
        h: 'Thẻ cào khuyến mãi in logo quán',
        p: 'Chọn mẫu, thêm logo, thể lệ và vùng cào. Mivy dựng file đúng khổ thẻ kèm vùng phủ nhũ bạc để xưởng phủ lớp cào che nội dung trúng thưởng.',
      },
      {
        h: 'File in chuẩn, vùng cào đúng chỗ',
        p: 'File có tràn lề, vạch cắt, hệ màu CMYK và đánh dấu vùng phủ nhũ để cào. Có thể thêm số seri, mã để quản lý — nêu nhu cầu khi gửi yêu cầu in.',
      },
      {
        h: 'Chương trình khuyến mãi, bốc thăm',
        p: 'Thẻ cào tạo hứng thú cho khách khi mua hàng, dự sự kiện. Mivy nhận cả đơn ít. Gửi yêu cầu in để được tư vấn lớp phủ và báo giá.',
      },
    ],
    faq: [
      { q: 'In thẻ cào số lượng ít được không?', a: 'Được. Mivy nhận cả đơn số lượng ít cho chương trình khuyến mãi.' },
      { q: 'Lớp cào che nội dung làm thế nào?', a: 'Xưởng phủ lớp nhũ bạc lên vùng đánh dấu; cào ra mới thấy nội dung trúng thưởng.' },
      { q: 'Có số seri, mã quản lý không?', a: 'Có. Bạn nêu nhu cầu số seri, mã khi gửi yêu cầu in để xưởng xử lý.' },
      { q: 'File in thẻ cào gồm gì?', a: 'File đúng khổ, có tràn lề, vạch cắt, hệ màu CMYK và vùng phủ nhũ đánh dấu.' },
      { q: 'Giá bao nhiêu?', a: 'Tùy số lượng và gia công. Bạn được báo giá trước khi in.' },
    ],
    related: [{ href: '/in', label: 'Xem tất cả sản phẩm in' }],
  },
};

export function StudioSeoArticle({ slug }: { slug: string }) {
  const a = CONTENT[slug];
  if (!a) return null;

  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: a.faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section className="mt-10 border-t border-mv-hair pt-8" aria-label="Giới thiệu & câu hỏi thường gặp">
      <div className="max-w-3xl mx-auto space-y-6 text-mv-fg">
        <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">{a.heading}</h2>
        <p className="text-mv-muted leading-relaxed">{a.intro}</p>

        <div className="space-y-5">
          {a.blocks.map((b) => (
            <div key={b.h}>
              <h3 className="font-bold text-mv-fg mb-1">{b.h}</h3>
              <p className="text-mv-muted leading-relaxed">{b.p}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="font-bold text-mv-fg mb-2">Câu hỏi thường gặp</h3>
          <div className="divide-y divide-mv-hair border-y border-mv-hair">
            {a.faq.map((f) => (
              <details key={f.q} className="group py-3">
                <summary className="cursor-pointer font-semibold text-mv-fg list-none flex items-start gap-2">
                  <span className="text-mv-accent">＋</span>
                  <span>{f.q}</span>
                </summary>
                <p className="mt-2 pl-6 text-mv-muted leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>

        {a.related && a.related.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {a.related.map((r) => (
              <Link
                key={r.href}
                href={r.href}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg bg-mv-accent-soft text-mv-accent hover:underline"
              >
                {r.label} →
              </Link>
            ))}
          </div>
        )}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
    </section>
  );
}

export const STUDIO_SEO_ARTICLE_SLUGS = Object.keys(CONTENT);
