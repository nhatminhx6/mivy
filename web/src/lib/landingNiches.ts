// Landing niche data — 1 template, nhiều niche.
// Thêm 1 niche = thêm 1 object ở đây, không đụng UI. Đúng tinh thần "engine đẻ biến thể".
// Nội dung bám đúng nhu cầu soi được ở group Hội In Ấn (19/11/2026):
// nhỏ lẻ bị từ chối, gấp, file hay sai, giá mập mờ — xem output/phan-tich-nhu-cau/.

export type IconKey =
  | 'file'
  | 'small'
  | 'fast'
  | 'price'
  | 'palette'
  | 'ruler'
  | 'layers'
  | 'shield';

export type Pain = { icon: IconKey; title: string; desc: string };
export type Spec = { label: string; value: string };
export type Faq = { q: string; a: string };

export type Niche = {
  slug: string;
  /** Tên sản phẩm ngắn, dùng trong câu */
  product: string;
  /** Nhãn nhỏ phía trên H1 */
  eyebrow: string;
  h1: string;
  /** Câu mô tả dưới H1 */
  tagline: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  /** Link vào studio để tự thiết kế */
  studioHref: string;
  /** Nhãn nút CTA chính */
  ctaDesign: string;
  pains: Pain[];
  specs: Spec[];
  steps: string[];
  faqs: Faq[];
};

const SHARED_PAINS: Pain[] = [
  {
    icon: 'file',
    title: 'Gửi kèm thiết kế',
    desc: 'Tải file thiết kế theo mẫu đã chọn để Mivy kiểm tra trước khi in.',
  },
  {
    icon: 'small',
    title: 'Nhận đơn lẻ, số lượng ít',
    desc: 'Không ép số lượng lớn. In vài chục chiếc vẫn làm — đúng nhu cầu shop nhỏ, mẫu mới, hàng test.',
  },
  {
    icon: 'price',
    title: 'Gửi nhu cầu theo mẫu',
    desc: 'Chọn số lượng, chất liệu và để lại thông tin liên hệ cho Mivy.',
  },
  {
    icon: 'fast',
    title: 'Ghi ngày cần nhận',
    desc: 'Cho Mivy biết ngày bạn cần hàng để xác nhận thời gian phù hợp.',
  },
];

export const NICHES: Niche[] = [
  {
    slug: 'tem-nuoc-hoa',
    product: 'tem nước hoa',
    eyebrow: 'Tem · nhãn · decal',
    h1: 'In tem nước hoa chiết — tự thiết kế, file chuẩn, nhận đơn lẻ',
    tagline:
      'Chọn mẫu đẹp, điền tên hương & dung tích, tải file thiết kế — rồi đặt in số lượng ít, giao nhanh. Không cần biết thiết kế.',
    metaTitle: 'In tem nước hoa chiết số lượng ít — tự thiết kế, file chuẩn | Mivy',
    metaDescription:
      'Tự thiết kế tem nước hoa chiết từ mẫu đẹp, tải file thiết kế. Nhận in số lượng ít, gửi yêu cầu trực tuyến. Miễn phí thiết kế.',
    keywords: [
      'in tem nước hoa',
      'in tem chiết nước hoa',
      'tem dán chai nước hoa',
      'in tem nước hoa số lượng ít',
      'decal nước hoa',
      'thiết kế tem nước hoa',
    ],
    studioHref: '/studio/sticker',
    ctaDesign: 'Tự thiết kế tem nước hoa',
    pains: SHARED_PAINS,
    specs: [
      { label: 'Khổ phổ biến', value: '3×4cm · 4×6cm · tem tròn Ø3–5cm' },
      { label: 'Chất liệu', value: 'Decal nhựa, decal trong, metalized (giả kim loại)' },
      { label: 'Gia công', value: 'Cán màng mờ/bóng, bế theo hình, cắt rời' },
      { label: 'Số lượng tối thiểu', value: 'Từ 50 tem' },
    ],
    steps: [
      'Chọn mẫu tem nước hoa trong kho — bố cục sang, hợp chai chiết.',
      'Điền tên hương, dung tích (5ml/10ml…), thêm logo nếu có.',
      'Xem trước và tải file thiết kế.',
      'Bấm "Gửi yêu cầu in" — Mivy sẽ liên hệ để xác nhận nhu cầu.',
    ],
    faqs: [
      {
        q: 'In ít (50–100 tem) có nhận không?',
        a: 'Có. Mivy chuyên nhận đơn lẻ, số lượng ít — đúng cho shop nước hoa chiết, mẫu mới hay hàng test. Không ép số lượng lớn.',
      },
      {
        q: 'Tôi không biết thiết kế, có làm được không?',
        a: 'Được. Bạn chỉ chọn mẫu có sẵn và điền nội dung (tên hương, dung tích). Mivy render bằng code nên chữ tiếng Việt luôn sắc nét, không méo.',
      },
      {
        q: 'File có bị xưởng chê thiếu chuẩn không?',
        a: 'Bạn có thể gửi file trực tiếp từ Studio. Mivy sẽ kiểm tra file và liên hệ nếu cần điều chỉnh.',
      },
      {
        q: 'Tem dán chai có bền, chống nước không?',
        a: 'Có. Dùng decal nhựa cán màng, bám tốt, chịu ẩm — hợp với chai nước hoa cầm tay thường xuyên.',
      },
    ],
  },
  {
    slug: 'tem-nhan-fnb',
    product: 'tem nhãn F&B',
    eyebrow: 'Tem · nhãn · decal',
    h1: 'In tem nhãn cho quán ăn, tiệm bánh, cà phê — trọn bộ, đơn lẻ',
    tagline:
      'Thêm logo cho tem dán ly, hộp mang đi hoặc thiết kế nhãn chai, hũ. Xem trước mẫu rồi gửi nhu cầu in.',
    metaTitle: 'In tem nhãn quán ăn, cà phê, tiệm bánh — đồng bộ, đơn lẻ | Mivy',
    metaDescription:
      'Thiết kế & in tem nhãn F&B: tem dán ly, nhãn hộp, sticker logo, tem niêm phong. Chọn mẫu, thêm logo và gửi yêu cầu in trực tuyến.',
    keywords: [
      'in tem nhãn quán ăn',
      'in sticker cà phê',
      'tem dán ly',
      'nhãn hộp đựng thức ăn',
      'in tem logo quán',
      'tem nhãn số lượng ít',
    ],
    studioHref: '/studio/sticker',
    ctaDesign: 'Thiết kế tem logo',
    pains: SHARED_PAINS,
    specs: [
      { label: 'Loại hay in', value: 'Tem dán ly, nhãn hộp, sticker logo, tem niêm phong' },
      { label: 'Chất liệu', value: 'Decal giấy, decal nhựa, decal trong, tem vỡ' },
      { label: 'Gia công', value: 'Cán màng, bế tròn/vuông, cắt rời theo hình' },
      { label: 'Số lượng tối thiểu', value: 'Từ 100 tem' },
    ],
    steps: [
      'Chọn mẫu theo loại quán (đồ ăn, trà sữa, cà phê, bánh).',
      'Điền tên quán, slogan, thông tin liên hệ, gắn logo.',
      'Xem lại mẫu và kiểm tra kích thước.',
      'Gửi mẫu, số lượng và thông tin liên hệ cho Mivy.',
    ],
    faqs: [
      {
        q: 'Quán mới mở, in ít được không?',
        a: 'Được. Mivy nhận đơn lẻ từ 100 tem, hợp với quán mới hoặc khi muốn test mẫu trước khi in nhiều.',
      },
      {
        q: 'Có làm được trọn bộ cùng tông không?',
        a: 'Bạn có thể dùng cùng logo và màu thương hiệu cho từng mẫu tem, nhãn trong Studio.',
      },
      {
        q: 'Tem niêm phong bóc là rách có in được không?',
        a: 'Có. Mivy hỗ trợ tem vỡ (bóc ra là vỡ) dùng làm tem bảo hành, niêm phong hộp.',
      },
    ],
  },
  {
    slug: 'thiep-tat-nien',
    product: 'thiệp tất niên',
    eyebrow: 'Thiệp · sự kiện',
    h1: 'In thiệp mời tất niên — thiết kế nhanh, file chuẩn, kịp mùa',
    tagline:
      'Mẫu thiệp tất niên sang, điền tên công ty & thông tin buổi tiệc là xong. Xuất file in chuẩn, nhận in số lượng vừa, giao kịp lịch tổ chức.',
    metaTitle: 'In thiệp mời tất niên cuối năm — mẫu đẹp, file chuẩn | Mivy',
    metaDescription:
      'Thiết kế & in thiệp mời tất niên: mẫu sang, tự điền nội dung, xuất file in chuẩn (bleed, vạch cắt). Nhận in số lượng vừa, gửi yêu cầu trực tuyến.',
    keywords: [
      'in thiệp mời tất niên',
      'thiệp tất niên công ty',
      'mẫu thiệp tất niên',
      'in thiệp cuối năm',
      'thiệp mời year end party',
    ],
    studioHref: '/studio/cards',
    ctaDesign: 'Tự thiết kế thiệp tất niên',
    pains: SHARED_PAINS,
    specs: [
      { label: 'Khổ phổ biến', value: '12×22cm (bao thư) · ruột gấp 11×22cm' },
      { label: 'Chất liệu', value: 'Giấy mỹ thuật, couche 300gsm, ép kim tuỳ chọn' },
      { label: 'Gia công', value: 'Cấn gấp, ép kim, bo góc' },
      { label: 'Số lượng', value: 'Từ 50 thiệp' },
    ],
    steps: [
      'Chọn mẫu thiệp tất niên hợp ngành của công ty.',
      'Điền tên công ty, lời mời, thời gian & địa điểm tiệc.',
      'Xuất file in chuẩn — cả bao thư và ruột thiệp.',
      'Gửi mẫu và ngày cần nhận để Mivy liên hệ xác nhận.',
    ],
    faqs: [
      {
        q: 'Cuối năm in có kịp không?',
        a: 'Kịp. Thiết kế xong có file in ngay, Mivy ưu tiên đơn mùa tất niên và tìm xưởng gần để giao nhanh. Đặt sớm càng chắc.',
      },
      {
        q: 'Có cả bao thư và ruột thiệp không?',
        a: 'Có. Mẫu ra sẵn cả bao thư (12×22cm) và ruột gấp (11×22cm), cùng tông, xuất file in một lần.',
      },
    ],
  },
  {
    slug: 'lich-tet',
    product: 'lịch Tết',
    eyebrow: 'Lịch · quà Tết',
    h1: 'In lịch Tết 2027 — thiết kế theo thương hiệu, nhận số lượng ít',
    tagline:
      'Lịch bloc, lịch để bàn in logo công ty làm quà Tết. Chọn mẫu, gắn logo & ảnh sản phẩm, xuất file in chuẩn, nhận in số lượng vừa phải.',
    metaTitle: 'In lịch Tết 2027 theo thương hiệu — lịch bloc, để bàn | Mivy',
    metaDescription:
      'Thiết kế & in lịch Tết 2027: lịch bloc, lịch để bàn in logo công ty. Mẫu đẹp, tự gắn logo & ảnh, file in chuẩn, gửi yêu cầu trực tuyến.',
    keywords: [
      'in lịch tết 2027',
      'in lịch bloc',
      'lịch để bàn in logo',
      'lịch tết công ty',
      'in lịch quà tết',
    ],
    studioHref: '/studio/templates',
    ctaDesign: 'Tự thiết kế lịch Tết',
    pains: SHARED_PAINS,
    specs: [
      { label: 'Loại', value: 'Lịch bloc, lịch để bàn, lịch 1 tờ' },
      { label: 'Chất liệu', value: 'Giấy couche, bìa cứng, in offset/3D' },
      { label: 'Gia công', value: 'Đóng lò xo, dựng chân, ép kim logo' },
      { label: 'Số lượng', value: 'Từ 50 cuốn' },
    ],
    steps: [
      'Chọn mẫu lịch Tết hợp thương hiệu.',
      'Gắn logo, màu thương hiệu, ảnh sản phẩm.',
      'Xuất file in chuẩn cho xưởng.',
      'Gửi mẫu và ngày cần nhận để Mivy liên hệ xác nhận.',
    ],
    faqs: [
      {
        q: 'Làm quà Tết, in số lượng ít được không?',
        a: 'Được. Mivy nhận từ 50 cuốn, hợp với doanh nghiệp nhỏ muốn tặng khách thân thiết mà không phải in cả nghìn cuốn.',
      },
      {
        q: 'Có gắn logo và màu thương hiệu riêng không?',
        a: 'Có. Bạn gắn logo, chọn màu thương hiệu và ảnh sản phẩm — lịch ra đúng nhận diện công ty bạn.',
      },
    ],
  },
];

export const NICHE_SLUGS = NICHES.map((n) => n.slug);

export function getNiche(slug: string): Niche | undefined {
  return NICHES.find((n) => n.slug === slug);
}
