// "Skin" = phong cách nghệ thuật (palette + font + trang trí) TÁCH khỏi bố cục nội dung.
// Một bố cục poster quảng cáo chuẩn (headline + mô tả + info + CTA + ảnh) được KHOÁC da theo skin.
// => Lấy vibe cổ điển/deco/thiên nhiên... áp lên poster ngành, KHÔNG bê nguyên template brand.

export interface AdContent {
  eyebrow?: string;   // dòng nhỏ trên cùng (ngành / ngày)
  headline?: string;  // tiêu đề lớn
  subhead?: string;   // mô tả 1 dòng
  points?: string[];  // 2-4 ý / info
  cta?: string;       // nút
  brand?: string;     // tên shop / thương hiệu
  image?: string;     // ảnh (data URL / URL)
  priceOld?: string;  // giá gốc (gạch) — bố cục Khuyến mãi
  priceNew?: string;  // giá sale (nổi bật)
  bgImage?: string;   // nền riêng (lớp dưới) — bố cục Sản phẩm
  products?: string[]; // ảnh sản phẩm (cutout) nổi ở trung tâm — tối đa 3
  imgZoom?: number;   // phóng to ảnh chính (%) — 100 = vừa khung
  imgX?: number;      // dịch ảnh ngang (0-100)
  imgY?: number;      // dịch ảnh dọc (0-100)
  bgDim?: number;     // độ phủ nền (0-85) — bố cục Sản phẩm
  bgBlur?: number;    // độ mờ nền (px)
  bgX?: number;       // vị trí nền ngang (0-100)
  bgY?: number;       // vị trí nền dọc (0-100)
}

export interface AdSkin {
  id: string;
  name: string;
  group: string;      // nhóm hiển thị trong băng chọn
  fontImport: string; // @import google fonts
  bg: string;
  ink: string;        // màu chữ chính
  muted: string;      // chữ phụ
  accent: string;     // màu nhấn / nút
  accentInk: string;  // chữ trên nút
  fontDisplay: string;
  fontBody: string;
  headlineUpper?: boolean;
  headlineItalic?: boolean;
  headlineWeight?: number;
  ctaOutline?: boolean;     // nút viền thay vì nền đặc
  layout?: 'minimal' | 'device' | 'appstore' | 'split' | 'review' | 'collage' | 'fullbleed' | 'annotate' | 'blog' | 'product'; // loại bố cục
  bgGradient?: string;      // nền gradient/pattern (css) cho nền — kiểu brandbird
  imageFrame?: 'browser';   // khung trình duyệt (3 chấm macOS) quanh ảnh
  imageTilt?: boolean;      // nghiêng ảnh 3D nhẹ (perspective)
  imageReflect?: boolean;   // phản chiếu sàn dưới ảnh/thiết bị (-webkit-box-reflect)
  grain?: boolean;          // phủ hạt noise mịn lên nền (tăng độ "film"/sang)
  device?: 'phone' | 'laptop' | 'ipad' | 'polaroid'; // khung thiết bị cho layout 'device'
  // lớp trang trí vẽ đè (khung, hoa văn, texture...) — nhận màu ink/accent
  frame: (ink: string, accent: string, muted: string) => string;
}

const grain = (opacity = 0.07) =>
  `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:${opacity};mix-blend-mode:multiply;pointer-events:none" aria-hidden="true"><filter id="gn"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#gn)"/></svg>`;

// ===== Thư viện GRADIENT (sinh hàng loạt) — ảnh-chủ-đạo, bố cục tối giản =====
const BVP = "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');";
const glow = (id: string, name: string, css: string, light = false): AdSkin => ({
  id: `g_${id}`, name, group: 'Gradient', layout: 'minimal',
  fontImport: BVP, bgGradient: css,
  bg: '#2a2a33', ink: light ? '#26242e' : '#ffffff', muted: light ? '#6f6b78' : 'rgba(255,255,255,0.82)',
  accent: light ? '#26242e' : '#ffffff', accentInk: light ? '#ffffff' : '#241a3a',
  fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif", frame: () => '',
});
const G = (a: string, b: string, c?: string) => `linear-gradient(145deg,${a} 0%,${b} ${c ? '55%' : '100%'}${c ? `,${c} 100%` : ''})`;
const GLOW_SKINS: AdSkin[] = [
  glow('tim', 'Tím mộng', G('#8b5cf6', '#b06ae0', '#ec6fb0')),
  glow('hoanghon', 'Hoàng hôn', G('#ff8a4c', '#ff5e7e', '#e0457a')),
  glow('bien', 'Biển', G('#3b82f6', '#4f74e8', '#7c6bf0')),
  glow('hongsen', 'Hồng sen', G('#f472b6', '#c026d3', '#7c3aed')),
  glow('cham', 'Chàm', G('#4f46e5', '#6d28d9', '#2563eb')),
  glow('dao', 'Đào', G('#fdba74', '#fb7185', '#e11d6b')),
  glow('camlua', 'Cam lửa', G('#f97316', '#dc2626')),
  glow('sanho', 'San hô', G('#fb7185', '#f43f5e')),
  glow('man', 'Mận', G('#a21caf', '#6d28d9')),
  glow('lamngoc', 'Lam ngọc', G('#06b6d4', '#3b82f6')),
  glow('thanhlong', 'Thanh long', G('#ec4899', '#f97316')),
  glow('tudang', 'Tử đằng', G('#6366f1', '#a855f7')),
  glow('ruby', 'Ruby', G('#e11d48', '#9f1239')),
  glow('hophach', 'Hổ phách', G('#f59e0b', '#ea580c')),
  glow('thachanh', 'Thạch anh', G('#a78bfa', '#f0abfc'), true),
  glow('xanhdem', 'Xanh đêm', G('#1e3a8a', '#3b0764')),
  glow('dorou', 'Đỏ rượu', G('#7f1d1d', '#b91c1c')),
  glow('camdao', 'Cam đào', G('#fb923c', '#fb7185')),
  glow('lamtim', 'Lam tím', G('#2563eb', '#9333ea')),
  glow('mamxoi', 'Mâm xôi', G('#be123c', '#9d174d')),
  glow('nho', 'Nho', G('#7c3aed', '#4338ca')),
  glow('duahau', 'Dưa hấu', G('#fb7185', '#fb923c')),
  glow('hongtia', 'Hồng tía', G('#d946ef', '#8b5cf6')),
  glow('chieuta', 'Chiều tà', G('#f472b6', '#fb923c')),
  glow('bachabien', 'Bạc hà biển', G('#0891b2', '#2563eb')),
  glow('hongkhoi', 'Hồng khói', G('#be185d', '#7c3aed')),
  glow('timthan', 'Tím than', G('#312e81', '#5b21b6')),
  glow('hongcam', 'Hồng cam', G('#ff6b9d', '#ffa07a')),
  glow('pastelhong', 'Pastel hồng', G('#ffe4ec', '#e9d5ff'), true),
  glow('pastelxanh', 'Pastel xanh', G('#e0f2fe', '#ede9fe'), true),
  glow('kem', 'Kem', G('#faf5eb', '#f3e8d8'), true),
  glow('xamsang', 'Xám sang', G('#e5e7eb', '#cbd5e1'), true),
  glow('thanchi', 'Than chì', G('#1f2937', '#111827')),
  glow('dentuyen', 'Đen tuyền', G('#27272a', '#09090b')),
];

// ===== Kho NỀN MESH (nhiều lớp radial — kiểu gradients.fm) =====
// Mỗi nền: nhiều "đốm màu" ở các góc chồng lên base → chuyển màu mượt, giàu chiều sâu.
type Stop = [at: string, color: string];
const mesh = (base: string, stops: Stop[]): string =>
  [...stops.map(([at, c]) => `radial-gradient(60% 60% at ${at}, ${c} 0%, transparent 70%)`), base].join(',');
// skin beautifier từ 1 nền mesh: ảnh bo góc + bóng sâu + tilt + reflection + grain, chữ trắng
const bgSkin = (id: string, name: string, group: string, css: string, opt: Partial<AdSkin> = {}, light = false): AdSkin => ({
  id: `bg_${id}`, name, group, layout: 'minimal',
  fontImport: BVP, bgGradient: css,
  bg: '#2a2a33', ink: light ? '#241f2e' : '#ffffff', muted: light ? '#6b6676' : 'rgba(255,255,255,0.85)',
  accent: light ? '#241f2e' : '#ffffff', accentInk: light ? '#ffffff' : '#241a3a',
  fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif",
  imageTilt: true, imageReflect: true, grain: true, frame: () => '',
  ...opt,
});

const MESH_SKINS: AdSkin[] = [
  // — Mesh ấm —
  bgSkin('sunset', 'Nắng hồng', 'Mesh ấm', mesh('#ff7a59', [['18% 20%', '#ffd166'], ['85% 15%', '#ff5e7e'], ['50% 90%', '#c026d3']])),
  bgSkin('peachy', 'Đào mật', 'Mesh ấm', mesh('#fb7185', [['20% 25%', '#fdba74'], ['80% 20%', '#f472b6'], ['70% 85%', '#e11d6b']])),
  bgSkin('coral', 'San hô rực', 'Mesh ấm', mesh('#f43f5e', [['15% 15%', '#fb923c'], ['85% 40%', '#ec4899'], ['45% 90%', '#be123c']])),
  bgSkin('amber', 'Hổ phách', 'Mesh ấm', mesh('#ea580c', [['25% 20%', '#fbbf24'], ['80% 25%', '#f97316'], ['55% 88%', '#b91c1c']])),
  bgSkin('flamingo', 'Hồng lửa', 'Mesh ấm', mesh('#db2777', [['20% 20%', '#fb7185'], ['82% 18%', '#f97316'], ['60% 85%', '#9d174d']])),
  // — Mesh lạnh —
  bgSkin('ocean', 'Biển sâu', 'Mesh lạnh', mesh('#1e40af', [['18% 20%', '#38bdf8'], ['85% 25%', '#6366f1'], ['50% 90%', '#1e3a8a']])),
  bgSkin('aurora', 'Cực quang', 'Mesh lạnh', mesh('#1e1b4b', [['15% 20%', '#06b6d4'], ['85% 15%', '#8b5cf6'], ['55% 88%', '#4f46e5']])),
  bgSkin('teal', 'Lam ngọc', 'Mesh lạnh', mesh('#0e7490', [['20% 22%', '#22d3ee'], ['82% 28%', '#3b82f6'], ['50% 90%', '#155e75']])),
  bgSkin('indigo', 'Chàm đêm', 'Mesh lạnh', mesh('#312e81', [['18% 18%', '#6366f1'], ['84% 22%', '#a855f7'], ['55% 88%', '#1e1b4b']])),
  bgSkin('frost', 'Băng lam', 'Mesh lạnh', mesh('#1d4ed8', [['22% 20%', '#60a5fa'], ['80% 25%', '#818cf8'], ['50% 88%', '#4338ca']])),
  // — Mesh tím/magenta —
  bgSkin('violetdream', 'Tím mộng', 'Mesh tím', mesh('#6d28d9', [['18% 20%', '#c084fc'], ['85% 18%', '#ec4899'], ['55% 90%', '#5b21b6']])),
  bgSkin('orchid', 'Lan tím', 'Mesh tím', mesh('#7c3aed', [['20% 22%', '#e879f9'], ['82% 25%', '#8b5cf6'], ['50% 88%', '#6d28d9']])),
  bgSkin('grape', 'Nho chín', 'Mesh tím', mesh('#581c87', [['18% 20%', '#a855f7'], ['84% 20%', '#d946ef'], ['55% 88%', '#4c1d95']])),
  bgSkin('plum', 'Mận tía', 'Mesh tím', mesh('#86198f', [['22% 20%', '#e879f9'], ['80% 28%', '#a21caf'], ['50% 90%', '#701a75']])),
  // — Mesh tối sang —
  bgSkin('midnight', 'Nửa đêm', 'Mesh tối', mesh('#0b1020', [['20% 18%', '#4338ca'], ['85% 22%', '#7c3aed'], ['55% 90%', '#0f172a']])),
  bgSkin('obsidian', 'Hắc diện', 'Mesh tối', mesh('#09090b', [['20% 20%', '#334155'], ['82% 24%', '#4f46e5'], ['55% 88%', '#18181b']])),
  bgSkin('emberdark', 'Than hồng', 'Mesh tối', mesh('#1c0a0a', [['22% 20%', '#b91c1c'], ['82% 22%', '#ea580c'], ['55% 90%', '#111827']])),
  bgSkin('deepsea', 'Vực biển', 'Mesh tối', mesh('#020617', [['20% 20%', '#0e7490'], ['84% 24%', '#1d4ed8'], ['55% 88%', '#0f172a']])),
  // — Mesh pastel (chữ tối) —
  bgSkin('cotton', 'Kẹo bông', 'Mesh pastel', mesh('#fde7f3', [['20% 20%', '#fbcfe8'], ['82% 22%', '#ddd6fe'], ['55% 88%', '#e0f2fe']]), {}, true),
  bgSkin('mint', 'Phớt lam', 'Mesh pastel', mesh('#e0f2fe', [['20% 22%', '#cffafe'], ['82% 20%', '#ede9fe'], ['55% 88%', '#dbeafe']]), {}, true),
  bgSkin('cream', 'Kem sữa', 'Mesh pastel', mesh('#faf5eb', [['22% 20%', '#fef3c7'], ['80% 24%', '#fee2e2'], ['55% 88%', '#f3e8ff']]), {}, true),
  bgSkin('lilac', 'Oải hương', 'Mesh pastel', mesh('#f3e8ff', [['20% 20%', '#e9d5ff'], ['82% 22%', '#fbcfe8'], ['55% 88%', '#dbeafe']]), {}, true),
];

// ===== Các LOẠI bố cục (device / appstore / split / review / collage) =====
const mk = (o: Partial<AdSkin> & { id: string; name: string; group: string; layout: AdSkin['layout'] }): AdSkin => ({
  fontImport: BVP, fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif",
  bg: '#eceaf2', ink: '#1f1d1a', muted: '#7a7788', accent: '#6d28d9', accentInk: '#ffffff', frame: () => '',
  ...o,
});
const onGrad = { ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', accent: '#ffffff', accentInk: '#2a1a4a' };
const onDark = { bg: '#16151a', ink: '#f2f0ea', muted: '#9a968d', accent: '#d8a24a', accentInk: '#16151a' };
const patt = (id: string, name: string, css: string, light = false): AdSkin => mk({
  id: `p_${id}`, name, group: 'Hoạ tiết', layout: 'minimal', bgGradient: css,
  ...(light ? {} : { ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', accent: '#ffffff', accentInk: '#2a1a4a' }),
});
const LAYOUT_SKINS: AdSkin[] = [
  // 2. Khung thiết bị
  mk({ id: 'dev_phone_violet', name: 'Điện thoại · tím', group: 'Khung máy', layout: 'device', device: 'phone', imageTilt: true, bgGradient: G('#7c6bf0', '#b06ae0', '#ec6fb0'), ...onGrad }),
  mk({ id: 'dev_phone_light', name: 'Điện thoại · sáng', group: 'Khung máy', layout: 'device', device: 'phone' }),
  mk({ id: 'dev_laptop_dark', name: 'Laptop · tối', group: 'Khung máy', layout: 'device', device: 'laptop', ...onDark }),
  mk({ id: 'dev_laptop_ocean', name: 'Laptop · biển', group: 'Khung máy', layout: 'device', device: 'laptop', imageTilt: true, bgGradient: G('#3b82f6', '#7c6bf0'), ...onGrad }),
  // 3. App Store
  mk({ id: 'app_violet', name: 'App Store · tím', group: 'App Store', layout: 'appstore', bgGradient: G('#7c6bf0', '#b06ae0', '#ec6fb0'), ...onGrad }),
  mk({ id: 'app_sunset', name: 'App Store · hoàng hôn', group: 'App Store', layout: 'appstore', bgGradient: G('#ff8a4c', '#ff5e7e', '#e0457a'), ...onGrad }),
  mk({ id: 'app_dark', name: 'App Store · tối', group: 'App Store', layout: 'appstore', ...onDark }),
  // 5. Chia đôi
  mk({ id: 'split_light', name: 'Chia đôi · sáng', group: 'Chia đôi', layout: 'split', bg: '#f4f1ea', ink: '#1f1d1a', muted: '#8a857c', accent: '#a9674b', accentInk: '#ffffff' }),
  mk({ id: 'split_dark', name: 'Chia đôi · tối', group: 'Chia đôi', layout: 'split', ...onDark }),
  mk({ id: 'split_violet', name: 'Chia đôi · tím', group: 'Chia đôi', layout: 'split', bgGradient: G('#7c6bf0', '#b06ae0'), ...onGrad }),
  // 7. Review
  mk({ id: 'review_light', name: 'Review · sáng', group: 'Review', layout: 'review', bg: '#eceaf2', accent: '#f5a623' }),
  mk({ id: 'review_violet', name: 'Review · tím', group: 'Review', layout: 'review', bgGradient: G('#7c6bf0', '#ec6fb0'), accent: '#f5a623' }),
  mk({ id: 'review_dark', name: 'Review · tối', group: 'Review', layout: 'review', bg: '#16151a', accent: '#f5a623' }),
  // 8. Collage
  mk({ id: 'collage_light', name: 'Collage · sáng', group: 'Collage', layout: 'collage', bg: '#efece4', ink: '#1f1d1a', muted: '#8a857c', accent: '#1f1d1a', accentInk: '#ffffff' }),
  mk({ id: 'collage_violet', name: 'Collage · tím', group: 'Collage', layout: 'collage', bgGradient: G('#7c6bf0', '#ec6fb0'), ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', accent: '#5b21b6', accentInk: '#ffffff' }),
  mk({ id: 'collage_sunset', name: 'Collage · hoàng hôn', group: 'Collage', layout: 'collage', bgGradient: G('#ff8a4c', '#e0457a'), ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', accent: '#9a2a44', accentInk: '#ffffff' }),
  // 2b. Khung iPad / Polaroid
  mk({ id: 'dev_ipad_violet', name: 'iPad · tím', group: 'Khung máy', layout: 'device', device: 'ipad', imageTilt: true, bgGradient: G('#7c6bf0', '#ec6fb0'), ...onGrad }),
  mk({ id: 'dev_ipad_light', name: 'iPad · sáng', group: 'Khung máy', layout: 'device', device: 'ipad' }),
  mk({ id: 'dev_polaroid_light', name: 'Polaroid · sáng', group: 'Khung máy', layout: 'device', device: 'polaroid', bg: '#efece4', ink: '#1f1d1a', muted: '#8a857c', accent: '#a9674b', accentInk: '#ffffff' }),
  mk({ id: 'dev_polaroid_dark', name: 'Polaroid · tối', group: 'Khung máy', layout: 'device', device: 'polaroid', ...onDark }),
  // 4. Ảnh tràn viền
  mk({ id: 'fb_classic', name: 'Tràn viền · cổ điển', group: 'Tràn viền', layout: 'fullbleed', accent: '#ffffff', accentInk: '#1f1d1a' }),
  mk({ id: 'fb_amber', name: 'Tràn viền · nhấn cam', group: 'Tràn viền', layout: 'fullbleed', accent: '#f97316', accentInk: '#ffffff' }),
  mk({ id: 'fb_violet', name: 'Tràn viền · nhấn tím', group: 'Tràn viền', layout: 'fullbleed', accent: '#8b5cf6', accentInk: '#ffffff' }),
  // 6. Chú thích
  mk({ id: 'an_light', name: 'Chú thích · sáng', group: 'Chú thích', layout: 'annotate', bg: '#f4f1ea', ink: '#1f1d1a', muted: '#8a857c', accent: '#e11d48', accentInk: '#ffffff' }),
  mk({ id: 'an_violet', name: 'Chú thích · tím', group: 'Chú thích', layout: 'annotate', bgGradient: G('#7c6bf0', '#ec6fb0'), ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', accent: '#ffe14d', accentInk: '#3a2a00' }),
  mk({ id: 'an_dark', name: 'Chú thích · tối', group: 'Chú thích', layout: 'annotate', bg: '#16151a', ink: '#f2f0ea', muted: '#9a968d', accent: '#f5a623', accentInk: '#16151a' }),
  // 9. Nền hoạ tiết
  patt('dot_violet', 'Chấm bi tím', 'radial-gradient(circle at center, rgba(255,255,255,0.16) 2.5px, transparent 3px) 0 0/46px 46px, linear-gradient(145deg,#6d28d9,#9333ea)'),
  patt('grid_blue', 'Lưới xanh', 'linear-gradient(rgba(255,255,255,0.12) 1px,transparent 1px) 0 0/48px 48px, linear-gradient(90deg,rgba(255,255,255,0.12) 1px,transparent 1px) 0 0/48px 48px, linear-gradient(145deg,#2563eb,#7c3aed)'),
  patt('diag_sunset', 'Sọc chéo cam', 'repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0 16px, transparent 16px 32px), linear-gradient(145deg,#ff8a4c,#e0457a)'),
  patt('mesh_aurora', 'Mesh tím-hồng', 'radial-gradient(at 18% 20%, #a855f7 0, transparent 50%), radial-gradient(at 82% 28%, #ec4899 0, transparent 48%), radial-gradient(at 50% 85%, #6366f1 0, transparent 55%), #1e1b4b'),
  patt('dot_cream', 'Chấm bi kem', 'radial-gradient(circle at center, rgba(0,0,0,0.07) 2.5px, transparent 3px) 0 0/46px 46px, linear-gradient(145deg,#faf5eb,#f0e7d6)', true),
  patt('grid_slate', 'Lưới xám', 'linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px) 0 0/50px 50px, linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px) 0 0/50px 50px, linear-gradient(145deg,#1f2937,#0f172a)'),
  // Blog / Lifestyle — ảnh lớn + hộp chữ (card trắng), tiêu đề serif
  {
    id: 'blog_cream', name: 'Blog · kem', group: 'Blog', layout: 'blog',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bg: '#efe6d6', ink: '#1f1d1a', muted: '#8a857c', accent: '#b5452f', accentInk: '#ffffff',
    fontDisplay: "'Playfair Display', serif", fontBody: "'Be Vietnam Pro', sans-serif", frame: () => '',
  },
  {
    id: 'blog_dark', name: 'Blog · tối', group: 'Blog', layout: 'blog',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bg: '#15181f', ink: '#f2f0ea', muted: '#9a968d', accent: '#e0a43b', accentInk: '#15181f',
    fontDisplay: "'Playfair Display', serif", fontBody: "'Be Vietnam Pro', sans-serif", frame: () => '',
  },
  {
    id: 'blog_violet', name: 'Blog · tím', group: 'Blog', layout: 'blog',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bgGradient: G('#7c6bf0', '#b06ae0', '#ec6fb0'), bg: '#8b5cf6', ink: '#ffffff', muted: 'rgba(255,255,255,0.82)', accent: '#6d28d9', accentInk: '#ffffff',
    fontDisplay: "'Playfair Display', serif", fontBody: "'Be Vietnam Pro', sans-serif", frame: () => '',
  },
  // Sản phẩm — nền + 1-3 ảnh sản phẩm trung tâm + giá sale
  mk({ id: 'product_cream', name: 'Sản phẩm · kem', group: 'Sản phẩm', layout: 'product', bg: '#f4efe4', ink: '#1f1d1a', muted: '#8a857c', accent: '#e11d48', accentInk: '#ffffff' }),
  mk({ id: 'product_gold', name: 'Sản phẩm · giá vàng', group: 'Sản phẩm', layout: 'product', bg: '#fbfaf6', ink: '#1a1a1a', muted: '#7a756c', accent: '#facc15', accentInk: '#1f1d1a' }),
  mk({ id: 'product_dark', name: 'Sản phẩm · tối', group: 'Sản phẩm', layout: 'product', bg: '#15151b', ink: '#f4f2ec', muted: '#9a968d', accent: '#f5a623', accentInk: '#15151b' }),
];

export const AD_SKINS: AdSkin[] = [
  {
    id: 'minimal_light',
    name: 'Tối giản sáng',
    group: 'Tối giản',
    layout: 'minimal',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bg: '#f4f1ea', ink: '#1f1d1a', muted: '#8a857c', accent: '#a9674b', accentInk: '#ffffff',
    fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif",
    frame: () => '',
  },
  {
    id: 'minimal_dark',
    name: 'Tối giản tối',
    group: 'Tối giản',
    layout: 'minimal',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bg: '#16151a', ink: '#f2f0ea', muted: '#9a968d', accent: '#d8a24a', accentInk: '#16151a',
    fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif",
    frame: () => '',
  },
  ...MESH_SKINS,
  ...GLOW_SKINS,
  {
    id: 'window_light', name: 'Khung trình duyệt', group: 'Tối giản', layout: 'minimal',
    imageFrame: 'browser', imageTilt: true,
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bg: '#eceaf2', ink: '#1f1d2a', muted: '#7a7788', accent: '#6d28d9', accentInk: '#ffffff',
    fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif", frame: () => '',
  },
  {
    id: 'window_violet', name: 'Cửa sổ nghiêng', group: 'Tối giản', layout: 'minimal',
    imageFrame: 'browser', imageTilt: true,
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap');",
    bgGradient: 'linear-gradient(145deg,#7c6bf0 0%,#b06ae0 55%,#ec6fb0 100%)',
    bg: '#8b5cf6', ink: '#ffffff', muted: 'rgba(255,255,255,0.8)', accent: '#ffffff', accentInk: '#4a2a8a',
    fontDisplay: "'Be Vietnam Pro', sans-serif", fontBody: "'Be Vietnam Pro', sans-serif", frame: () => '',
  },
  ...LAYOUT_SKINS,
  {
    id: 'vintage',
    name: 'Cổ điển / Vintage',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,800;1,500&family=EB+Garamond:ital,wght@0,400;0,500;1,400&display=swap');",
    bg: '#f0e6cf', ink: '#2c1d0d', muted: '#6b4e2a', accent: '#2c1d0d', accentInk: '#f0e6cf',
    fontDisplay: "'Playfair Display', serif", fontBody: "'EB Garamond', serif",
    frame: (ink, _a, muted) => `
      ${grain(0.08)}
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${ink}">
        <rect x="46" y="46" width="988" height="1258" stroke-width="5"/>
        <rect x="64" y="64" width="952" height="1222" stroke-width="1.5"/>
        <g stroke-width="2.4" stroke-linecap="round">
          <path d="M64 150 q86 0 86 -86 M64 120 q56 0 56 -56"/>
          <path d="M1016 150 q-86 0 -86 -86 M1016 120 q-56 0 -56 -56"/>
          <path d="M64 1200 q86 0 86 86 M64 1230 q56 0 56 56"/>
          <path d="M1016 1200 q-86 0 -86 86 M1016 1230 q-56 0 -56 56"/>
        </g>
      </svg>`,
  },
  {
    id: 'deco',
    name: 'Art Deco',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Poiret+One&family=Jost:wght@300;500;700&display=swap');",
    bg: '#0f1b1a', ink: '#f3ead3', muted: '#b9a978', accent: '#c9a84a', accentInk: '#0f1b1a',
    fontDisplay: "'Poiret One', 'Jost', sans-serif", fontBody: "'Jost', sans-serif",
    headlineUpper: true,
    frame: (_i, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${accent}">
        <rect x="54" y="54" width="972" height="1242" stroke-width="2"/>
        <g stroke-width="2.4">
          <path d="M54 230 L170 54 M54 170 L116 54"/>
          <path d="M1026 230 L910 54 M1026 170 L964 54"/>
          <path d="M54 1120 L170 1296 M54 1180 L116 1296"/>
          <path d="M1026 1120 L910 1296 M1026 1180 L964 1296"/>
        </g>
        <g fill="${accent}" stroke="none">
          <circle cx="540" cy="92" r="5"/><circle cx="540" cy="1258" r="5"/>
        </g>
      </svg>`,
  },
  {
    id: 'botanical',
    name: 'Thiên nhiên / Botanical',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;1,9..144,400&family=Jost:wght@300;500&display=swap');",
    bg: '#eef1e6', ink: '#24341f', muted: '#5e7049', accent: '#3f5b2e', accentInk: '#eef1e6',
    fontDisplay: "'Fraunces', serif", fontBody: "'Jost', sans-serif",
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${muted}" stroke-width="2.2" stroke-linecap="round">
        <g transform="translate(120,150)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40 M44 158 q-40 -6 -58 -40"/>
        </g>
        <g transform="translate(960,150) scale(-1,1)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40 M44 158 q-40 -6 -58 -40"/>
        </g>
        <g transform="translate(120,1200) scale(1,-1)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40"/>
        </g>
        <g transform="translate(960,1200) scale(-1,-1)">
          <path d="M0 160 C0 90 40 40 110 0"/>
          <path d="M70 118 q-40 -6 -58 -40 M96 76 q-40 -6 -58 -40"/>
        </g>
      </svg>`,
  },
  {
    id: 'noir',
    name: 'Tối giản / Noir',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@400;600;800&display=swap');",
    bg: '#0b0b0c', ink: '#f5f5f3', muted: '#8a8a86', accent: '#e4ff32', accentInk: '#0b0b0c',
    fontDisplay: "'Anton', sans-serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (ink) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" stroke="${ink}" stroke-width="1" opacity="0.35">
        <line x1="72" y1="120" x2="1008" y2="120"/>
        <line x1="72" y1="1230" x2="1008" y2="1230"/>
      </svg>`,
  },
  {
    id: 'pop',
    name: 'Pop / Rực rỡ',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;700&display=swap');",
    bg: '#ff4d2e', ink: '#fff7ed', muted: '#ffd9c9', accent: '#111111', accentInk: '#ffe14d',
    fontDisplay: "'Archivo Black', sans-serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (ink) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${ink}" stroke-width="3" opacity="0.9">
        <rect x="44" y="44" width="992" height="1262" rx="26"/>
      </svg>`,
  },
  {
    id: 'nouveau',
    name: 'Art Nouveau',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=EB+Garamond&display=swap');",
    bg: '#ebe7d8', ink: '#2f3b2a', muted: '#7b7a4e', accent: '#9c6b3f', accentInk: '#ebe7d8',
    fontDisplay: "'Cormorant Garamond', serif", fontBody: "'EB Garamond', serif",
    headlineItalic: true, headlineWeight: 600,
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${muted}" stroke-width="2.4" stroke-linecap="round">
        <rect x="52" y="52" width="976" height="1246" stroke="${accent}" stroke-width="1.4"/>
        <path d="M52 220 C52 120 130 70 230 62 C150 90 108 150 110 240"/>
        <path d="M1028 220 C1028 120 950 70 850 62 C930 90 972 150 970 240"/>
        <path d="M52 1130 C52 1230 130 1280 230 1288 C150 1260 108 1200 110 1110"/>
        <path d="M1028 1130 C1028 1230 950 1280 850 1288 C930 1260 972 1200 970 1110"/>
      </svg>`,
  },
  {
    id: 'oriental',
    name: 'Á Đông',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Noto+Serif:wght@400;600&display=swap');",
    bg: '#f3e9d6', ink: '#7a1f1a', muted: '#9c6b2f', accent: '#b8862c', accentInk: '#fbf3e0',
    fontDisplay: "'Playfair Display', serif", fontBody: "'Noto Serif', serif",
    frame: (ink, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none" stroke="${ink}">
        <rect x="56" y="56" width="968" height="1238" stroke-width="3"/>
        <rect x="74" y="74" width="932" height="1202" stroke="${accent}" stroke-width="1"/>
        <g stroke="${accent}" stroke-width="3">
          <path d="M92 92 h70 M92 92 v70 M988 92 h-70 M988 92 v70 M92 1258 h70 M92 1258 v-70 M988 1258 h-70 M988 1258 v-70"/>
        </g>
        <circle cx="540" cy="150" r="26" stroke="${accent}" stroke-width="2"/>
      </svg>`,
  },
  {
    id: 'retro70',
    name: 'Retro 70s',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Alfa+Slab+One&family=Archivo:wght@500;700&display=swap');",
    bg: '#f0d9a8', ink: '#5a2a16', muted: '#b5732e', accent: '#d9541f', accentInk: '#f0d9a8',
    fontDisplay: "'Alfa Slab One', serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none">
        <g stroke-width="10" fill="none">
          <path d="M-40 1310 a300 300 0 0 1 600 0" stroke="${accent}"/>
          <path d="M-40 1310 a360 360 0 0 1 720 0" stroke="${muted}"/>
          <path d="M520 1310 a300 300 0 0 1 600 0" stroke="${accent}"/>
        </g>
      </svg>`,
  },
  {
    id: 'genz',
    name: 'GenZ / Sticker',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;700&display=swap');",
    bg: '#6c4cf0', ink: '#fdfcff', muted: '#d7ccff', accent: '#d6ff3d', accentInk: '#1a1030',
    fontDisplay: "'Archivo Black', sans-serif", fontBody: "'Archivo', sans-serif",
    headlineUpper: true,
    frame: (ink, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none">
        <rect x="40" y="48" width="1000" height="1254" rx="34" stroke="${ink}" stroke-width="3"/>
        <g fill="${accent}">
          <path d="M150 140 l14 34 l36 4 l-28 24 l9 36 l-31 -20 l-31 20 l9 -36 l-28 -24 l36 -4 z"/>
          <circle cx="930" cy="150" r="20"/>
        </g>
      </svg>`,
  },
  {
    id: 'celestial',
    name: 'Thiên văn',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital@0;1&family=EB+Garamond&display=swap');",
    bg: '#121633', ink: '#f4ecd8', muted: '#8a8fc0', accent: '#e7c25c', accentInk: '#121633',
    fontDisplay: "'Playfair Display', serif", fontBody: "'EB Garamond', serif",
    frame: (_i, accent, muted) => {
      const star = (x: number, y: number, r: number) => `<path d="M${x} ${y - r} l${r * 0.28} ${r * 0.72} l${r * 0.72} ${r * 0.28} l-${r * 0.72} ${r * 0.28} l-${r * 0.28} ${r * 0.72} l-${r * 0.28} -${r * 0.72} l-${r * 0.72} -${r * 0.28} l${r * 0.72} -${r * 0.28} z" fill="${accent}"/>`;
      return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" fill="none">
        <rect x="54" y="54" width="972" height="1242" stroke="${muted}" stroke-width="1.2" opacity="0.6"/>
        <path d="M200 190 a360 360 0 0 1 680 0" stroke="${accent}" stroke-width="1.2" stroke-dasharray="3 10"/>
        ${star(540, 140, 20)}${star(170, 300, 10)}${star(920, 320, 12)}${star(210, 1120, 9)}${star(880, 1100, 11)}
      </svg>`;
    },
  },
  {
    id: 'candlenight',
    name: 'Đêm nến',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=EB+Garamond:ital@0;1&display=swap');",
    bg: '#15100e', ink: '#f2e7d6', muted: '#b89a84', accent: '#c6564d', accentInk: '#15100e',
    fontDisplay: "'Cormorant Garamond', serif", fontBody: "'EB Garamond', serif",
    headlineItalic: true, headlineWeight: 600,
    frame: (_i, accent, muted) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${muted}" stroke-width="1.2">
        <rect x="56" y="56" width="968" height="1238"/>
        <g fill="${accent}" stroke="none"><path d="M540 118 c-20 -17 -16 -34 -5 -34 c6 0 5 6 5 8 c0 -2 -1 -8 5 -8 c11 0 15 17 -5 34 Z"/></g>
      </svg>`,
  },
  {
    id: 'blush',
    name: 'Hồng phấn',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;1,500;1,600&family=EB+Garamond:ital@0;1&display=swap');",
    bg: '#f7e8e6', ink: '#6e2f38', muted: '#b67e88', accent: '#cf6f7c', accentInk: '#ffffff',
    fontDisplay: "'Playfair Display', serif", fontBody: "'EB Garamond', serif",
    headlineItalic: true,
    frame: (_i, accent, muted) => {
      const heart = (x: number, y: number, s: number) => `<path transform="translate(${x},${y}) scale(${s})" d="M0 12 C-16 -2 -12 -16 -4 -16 C-1 -16 0 -11 0 -9 C0 -11 1 -16 4 -16 C12 -16 16 -2 0 12 Z" fill="${accent}"/>`;
      return `<svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${muted}" stroke-width="1.3">
        <rect x="54" y="54" width="972" height="1242"/>
        ${heart(110, 110, 1.6)}${heart(970, 110, 1.6)}${heart(110, 1240, 1.6)}${heart(970, 1240, 1.6)}
      </svg>`;
    },
  },
  {
    id: 'burgundy',
    name: 'Rượu vang',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;1,500&family=EB+Garamond&display=swap');",
    bg: '#3a0f17', ink: '#f4e0ca', muted: '#c98f86', accent: '#e4b45a', accentInk: '#3a0f17',
    fontDisplay: "'Cormorant Garamond', serif", fontBody: "'EB Garamond', serif",
    frame: (_i, accent) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" fill="none" stroke="${accent}" stroke-width="1.4">
        <rect x="52" y="52" width="976" height="1246"/>
        <rect x="66" y="66" width="948" height="1218" stroke-width="0.8"/>
        <g stroke-width="2"><path d="M86 160 q74 0 74 -74 M994 160 q-74 0 -74 -74 M86 1190 q74 0 74 74 M994 1190 q-74 0 -74 74"/></g>
      </svg>`,
  },
  {
    id: 'editorial',
    name: 'Tạp chí',
    group: 'Tạp chí',
    fontImport: "@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=EB+Garamond:ital@0;1&display=swap');",
    bg: '#f7f6f2', ink: '#161616', muted: '#8a8a86', accent: '#c4342b', accentInk: '#f7f6f2',
    fontDisplay: "'Oswald', sans-serif", fontBody: "'EB Garamond', serif",
    headlineUpper: true,
    frame: (ink) => `
      <svg width="1080" height="1350" viewBox="0 0 1080 1350" style="position:absolute;inset:0" aria-hidden="true" stroke="${ink}" stroke-width="1" opacity="0.5">
        <line x1="72" y1="118" x2="1008" y2="118"/>
        <line x1="72" y1="128" x2="1008" y2="128"/>
        <line x1="72" y1="1232" x2="1008" y2="1232"/>
      </svg>`,
  },
];

export function getSkin(id: string): AdSkin | undefined {
  return AD_SKINS.find((s) => s.id === id);
}

// ===== TÁCH MÀU NỀN KHỎI BỐ CỤC =====
// Nhóm chỉ-là-nền (gradient/mesh/pattern) → KHÔNG hiện ở băng bố cục, mà thành dải swatch màu.
const BG_ONLY_GROUPS = new Set(['Gradient', 'Mesh ấm', 'Mesh lạnh', 'Mesh tím', 'Mesh tối', 'Mesh pastel', 'Hoạ tiết']);

export interface AdBackground { id: string; name: string; group: string; css: string; light: boolean }
// chấm bi (dot-grid) đè lên 1 nền — texture tinh tế kiểu brandbird
const dg = (dot: string, base: string) => `radial-gradient(${dot} 1.6px, transparent 1.7px) 0 0/30px 30px, ${base}`;
const bgL = (id: string, name: string, group: string, css: string): AdBackground => ({ id, name, group, css, light: true });
const bgD = (id: string, name: string, group: string, css: string): AdBackground => ({ id, name, group, css, light: false });

// Kho màu TỈA theo gu brandbird: tiết chế — 1 tông chủ đạo + 1 accent, thêm trung tính / tối sang / dot-grid.
export const AD_BACKGROUNDS: AdBackground[] = [
  { id: 'none', name: 'Theo mẫu', group: 'Mặc định', css: '', light: false },

  // — Trung tính (sáng, sang, dùng nhiều nhất ở brandbird) —
  bgL('n_cream', 'Kem sữa', 'Trung tính', G('#faf6ee', '#efe6d6')),
  bgL('n_beige', 'Be ấm', 'Trung tính', G('#f1e9dc', '#e3d6c2')),
  bgL('n_sand', 'Nâu kem', 'Trung tính', G('#efe4d2', '#ddc9ab')),
  bgL('n_ivory', 'Trắng ngà', 'Trung tính', G('#fcfbf8', '#f1efe9')),
  bgL('n_mist', 'Xám sáng', 'Trung tính', G('#eef0f3', '#dde2e8')),
  bgL('n_blush', 'Hồng kem', 'Trung tính', G('#f8efe9', '#efdad0')),

  // — Gradient (tinh tế, signature brandbird) —
  bgD('gr_violet', 'Tím mộng', 'Gradient', G('#8b5cf6', '#b06ae0', '#ec6fb0')),
  bgD('gr_sunset', 'Hoàng hôn', 'Gradient', G('#ff8a4c', '#ff5e7e', '#e0457a')),
  bgD('gr_ocean', 'Biển', 'Gradient', G('#3b82f6', '#6366f1', '#7c6bf0')),
  bgD('gr_peach', 'Đào', 'Gradient', G('#fb923c', '#fb7185', '#e11d6b')),
  bgD('gr_indigo', 'Chàm', 'Gradient', G('#4f46e5', '#6d28d9', '#2563eb')),
  bgD('gr_wisteria', 'Tử đằng', 'Gradient', G('#6366f1', '#a855f7')),
  bgD('gr_aurora', 'Cực quang', 'Gradient', mesh('#1e1b4b', [['15% 20%', '#06b6d4'], ['85% 15%', '#8b5cf6'], ['55% 88%', '#4f46e5']])),
  bgD('gr_dream', 'Mộng mị', 'Gradient', mesh('#6d28d9', [['18% 20%', '#c084fc'], ['85% 18%', '#ec4899'], ['55% 90%', '#5b21b6']])),

  // — Tối sang (dark, cao cấp) —
  bgD('d_navy', 'Navy', 'Tối sang', G('#1e293b', '#0f172a')),
  bgD('d_charcoal', 'Than chì', 'Tối sang', G('#1f2937', '#111827')),
  bgD('d_onyx', 'Đen tuyền', 'Tối sang', G('#27272a', '#09090b')),
  bgD('d_midnight', 'Nửa đêm', 'Tối sang', G('#111633', '#1e1b4b')),
  bgD('d_wine', 'Rượu vang', 'Tối sang', G('#3a0f17', '#1f0a0e')),
  bgD('d_forest', 'Lục thẫm', 'Tối sang', G('#14302a', '#0b1a17')),

  // — Pastel (sáng, dịu) —
  bgL('p_cotton', 'Kẹo bông', 'Pastel', mesh('#fde7f3', [['20% 20%', '#fbcfe8'], ['82% 22%', '#ddd6fe'], ['55% 88%', '#e0f2fe']])),
  bgL('p_sky', 'Phớt lam', 'Pastel', mesh('#e0f2fe', [['20% 22%', '#cffafe'], ['82% 20%', '#ede9fe'], ['55% 88%', '#dbeafe']])),
  bgL('p_lilac', 'Oải hương', 'Pastel', mesh('#f3e8ff', [['20% 20%', '#e9d5ff'], ['82% 22%', '#fbcfe8'], ['55% 88%', '#dbeafe']])),
  bgL('p_butter', 'Bơ nhạt', 'Pastel', G('#fef3c7', '#fde2c0')),

  // — Hoạ tiết (dot-grid tiết chế) —
  bgD('t_navydot', 'Navy chấm', 'Hoạ tiết', dg('rgba(255,255,255,0.10)', 'linear-gradient(145deg,#1e293b,#0f172a)')),
  bgD('t_violetdot', 'Tím chấm', 'Hoạ tiết', dg('rgba(255,255,255,0.13)', 'linear-gradient(145deg,#6d28d9,#9333ea)')),
  bgL('t_creamdot', 'Kem chấm', 'Hoạ tiết', dg('rgba(0,0,0,0.06)', 'linear-gradient(145deg,#faf6ee,#efe6d6)')),
  bgD('t_slategrid', 'Lưới xám', 'Hoạ tiết', 'linear-gradient(rgba(255,255,255,0.06) 1px,transparent 1px) 0 0/48px 48px, linear-gradient(90deg,rgba(255,255,255,0.06) 1px,transparent 1px) 0 0/48px 48px, linear-gradient(145deg,#1f2937,#0f172a)'),
];
export function getBackground(id?: string): AdBackground | undefined {
  return AD_BACKGROUNDS.find((b) => b.id === id);
}

// Băng bố cục = mọi skin TRỪ nhóm chỉ-là-nền VÀ device mockup (iPhone/MacBook/App Store —
// hợp dân làm app, KHÔNG hợp người bán hàng). Giữ code renderer, chỉ ẩn khỏi UI.
const HIDDEN_LAYOUTS = new Set(['device', 'appstore']);
// Tạp chí giữ 6 kiểu đặc sắc nhất; ẩn các kiểu trùng vibe/kém nổi (giữ code).
const HIDDEN_SKIN_IDS = new Set(['botanical', 'deco', 'nouveau', 'retro70', 'genz', 'celestial', 'candlenight', 'burgundy']);
export const AD_LAYOUTS: AdSkin[] = AD_SKINS.filter(
  (s) => !BG_ONLY_GROUPS.has(s.group) && !(s.layout && HIDDEN_LAYOUTS.has(s.layout)) && !HIDDEN_SKIN_IDS.has(s.id),
);
