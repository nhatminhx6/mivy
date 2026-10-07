# Plan: Nâng chất lượng thiết kế Poster (cho Gemini làm tiếp)

Mục tiêu: poster ở màn `/studio/marketing` đang **xấu ở mọi ngành**. Cần làm đẹp lại phần **render poster** (canvas), không đụng backend, không đổi data flow.

## 1. Pipeline render (đọc trước khi sửa)

`src/app/studio/marketing/page.tsx` gọi `drawIndustryPoster(...)` cho 3 canvas (launch / story / action).

`drawIndustryPoster` ở `src/lib/design-engine.ts` (dòng ~1955) route theo thứ tự:
1. `conceptId` → `drawIndustryConcept` (`src/lib/industry-renderer.ts`)  ← hiện KHÔNG dùng (đã tắt).
2. `templateId` → `drawCatalogPoster` (`src/lib/catalog-renderer.ts`)  ← **poster trong ảnh lỗi là do đây** (template `magazine/editorial/agenda/...`).
3. `layoutMode==='full_photo'` hoặc có ảnh → `drawFullPhotoGeneral` / `drawFullPhotoRecruitment*` (design-engine.ts).
4. Còn lại → `drawEducationPoster` / `drawServicePoster` / `drawGeneralModernPoster` / `drawRecruitment*`.

Themes: `POSTER_THEMES` (design-engine.ts dòng 5) — 5 theme, mỗi theme có `bg/ink/accent/accentText/cardBorder/...`.
Templates: `TEMPLATES` trong `src/lib/template-catalog.ts` (editorial, spotlight, billboard, magazine, agenda, portrait).

Data vào poster: `copy = { headline, subline, cta, caption, points[] }` + `marketing.brand` + `marketing.offer`. **Không được bịa thêm data** ngoài mấy field này.

## 2. Lỗi thẩm mỹ hiện tại (từ poster mẫu "Tour Đà Nẵng")

1. **Trùng lặp nội dung**: `subline` lặp y hệt `points[0]` → đọc thừa. Cần ẩn subline nếu nó ≈ headline/point[0].
2. **Số thứ tự 01/02/03 mờ tịt**: dùng màu accent tối trên nền tối → không đọc được. Phải tăng tương phản (accent sáng, hoặc pill nền) hoặc đổi sang bullet.
3. **Khoảng trống giữa quá lớn**: nội dung dồn trên + dưới, giữa trống huơ. Cần lưới/căn nhịp hợp lý theo chiều cao.
4. **CTA bar lạc tông**: thanh nâu không ăn nhập nền xanh. CTA phải dùng accent nhất quán với theme + chữ đủ tương phản.
5. **Chữ chìm trên ảnh sáng**: scrim gradient chưa đủ → thêm overlay/scrim mạnh hơn hoặc khối nền bán trong suốt sau cụm chữ để LUÔN đọc được.
6. **Thiếu phân cấp & thương hiệu**: brand chỉ là chữ nhỏ góc; thiếu điểm nhấn màu, thiếu khối, thiếu hệ typography rõ ràng.
7. **Offer chưa nổi**: ưu đãi (giá/khuyến mãi) cần 1 badge nổi bật — đây là thứ người bán cần nhất.

## 3. Việc cần làm

Tập trung `src/lib/catalog-renderer.ts` (ưu tiên 1, vì đang vẽ ra poster lỗi) + `design-engine.ts` các hàm `drawFullPhoto*`, `drawGeneralModernPoster`, và `POSTER_THEMES`.

- [ ] **Scrim/đọc được**: đảm bảo mọi cụm text có nền đủ tối (gradient hoặc card bán trong suốt) → contrast chữ/nền ≥ 4.5:1 ở mọi vùng ảnh.
- [ ] **Bỏ trùng lặp**: nếu `subline` gần giống `headline` hoặc `points[0]` (so sánh chuẩn hóa, bỏ dấu/thường) thì không vẽ subline.
- [ ] **Points**: thay số mờ bằng đánh số/bullet có tương phản (số trên nền pill accent, hoặc dấu chấm accent sáng) + đường kẻ mảnh. Căn đều, line-height thoáng.
- [ ] **CTA**: pill bo tròn dùng `theme.accent` + `theme.accentText`, đặt nhất quán, có mũi tên. Không dùng màu lạc tông.
- [ ] **Offer badge**: 1 pill nổi bật (accent hoặc tương phản) hiển thị `marketing.offer` khi có.
- [ ] **Hệ typography**: định nghĩa scale rõ (H1 / subline / point / cta / brand) co giãn theo `aspect` (1:1/4:5/9:16).
- [ ] **Bố cục**: safe margin nhất quán (vd 64px), chia vùng trên (brand+headline) / giữa (subline/points) / dưới (CTA+offer), lấp khoảng trống hợp lý.
- [ ] **Bộ 3 nhất quán**: launch (hero), story (points/tiêu chí), action (CTA/liên hệ) cùng hệ thị giác, khác vai trò.
- [ ] Áp đồng đều cho **12 ngành** (recruitment, education, event, food, beauty, property, travel, retail, fitness, technology, personal, service).

## 4. Ràng buộc (bắt buộc giữ)

- CHỈ sửa render/canvas + theme. **Không** đổi: API backend, `MarketingState` shape, luồng gọi `/v1/creative/*`, export PNG/ZIP (`handleDownloadSingle` / `handleDownloadZip` trong page.tsx).
- Giữ **tiếng Việt có dấu**, font `"Be Vietnam Pro"`.
- Hỗ trợ đủ 3 tỷ lệ: `1:1`=1080×1080, `4:5`=1080×1350, `9:16`=1080×1920. Không tràn chữ, không vỡ layout ở tỷ lệ nào.
- Data chỉ từ `copy` + `marketing.brand/offer`. Không bịa số liệu/thông tin.
- `npx tsc --noEmit` phải sạch (hiện 0 lỗi — giữ nguyên).

## 5. Cách test / nghiệm thu

- Chạy FE: `npm run dev` (port 3009) → `/studio/marketing` → bấm lần lượt 12 ngành, đổi 3 tỷ lệ, xem cả 3 poster (có nút "Phóng to xem ảnh").
- Có sẵn trang QC: `/studio/marketing/review` ("Xem bộ mẫu kiểm tra").
- Có sẵn script QC trong `web/`: `render-*-qc.cjs`, `verify-*.cjs` — dùng để render hàng loạt và soi.
- **Đạt khi**: mọi text đọc rõ trên mọi nền; không trùng lặp headline/subline/points; số/bullet rõ; CTA + offer nổi bật đúng tông theme; 12 ngành × 3 poster × 3 tỷ lệ đều gọn gàng; `tsc` sạch.

## 6. Data mẫu (đã có, để test nhanh)

`src/lib/category-samples.ts` — mỗi ngành đã có sẵn name/brand/offer/details + 3 copies (launch/story/action) đầy đủ. Bấm ngành là ra data ngay, dùng để kiểm thử design.
