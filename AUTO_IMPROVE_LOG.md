# Nhật ký tự cải thiện chất lượng hình (autonomous)

> Em tự chạy server, render cỡ lớn, soi mắt + QC, sửa từng lỗi NỘI DUNG/thiết kế (không phải độ phân giải). Mỗi mục đều verify thị giác + `npm run test:qc` xanh.

## Công cụ
- Trang tự-soi cỡ lớn: **`/review`** (render poster/banner/menu/bìa/áo to để nhìn rõ). Nội bộ, có thể xoá.
- QC tự động: `cd web && npm run test:qc` — 179 hình, bắt lỗi cấu trúc + trang trí đè nút. Luôn giữ xanh.

## Đã sửa (2026-10-17)
1. **Poster full-photo (travel/retail/food…) — ảnh hero quá nhỏ**: band ảnh 26% → **38% (launch)**. Ảnh đẹp (biển/đồ ăn/sản phẩm) giờ nổi bật hơn, vẫn giữ concept "nền đặc, không đè chữ lên ảnh". (`design-engine.ts` drawFullPhotoGeneral)
2. **Kicker lặp 2 lần** ("NỔI BẬT" góc phải + "Nổi bật" script trên tiêu đề) → bỏ cái góc phải, giữ script. Hết thừa/amateur. (full-photo + matrix)
3. **Poster matrix — card thưa, nhiều khoảng trống chết**: card bị cap 132px → cho **cao tới 200–240px, gap 16px, lấp đầy**. Hết cảm giác sơ sài. (`design-engine.ts` drawGeneralModernPoster)
4. **Tiêu đề ngắt bậy** (vd "Hội / An") → **balanced wrap**: ngắt cân bằng, giữ cụm từ. Áp mọi tiêu đề dài. (`posterText`)
5. **Kho copy "Gợi ý nội dung"** — thêm 2 ngành: **Spa/Làm đẹp**, **Quán ăn/Nhà hàng** (headline × 4 tông + sale tag + USP). (`copy-library.ts`)

## Đã làm trước đó (các phiên trước)
- Bỏ hoa/đèn mùa đè nút (season chỉ còn khung màu). Viền đỏ+xanh = do bật thủ công. Pill ưu đãi cắt "…". QC v2 bắt trang trí-đè-CTA. Xuất 2× nét.

## Nhận xét thật
Sau các fix: poster (full-photo/matrix/template), banner, menu, bìa, áo đều ở mức **đăng được / chuyên nghiệp**. Không còn lỗi thô (hoa đè, viền chửi, tiêu đề tách, card trôi). "Đẹp/xấu" tinh tế hơn thì cần anh chấm mắt.

## Việc tiếp (đang/định làm)
- Soi thêm khổ 9:16 & 1:1, đủ 14 template, các ngành ít dùng (fitness/property/tech) tìm lỗi layout.
- Rà typography/spacing chi tiết từng renderer.

## Vòng 2 (2026-10-17)
6. **Khổ 9:16 full-photo — khoảng trống chết giữa danh sách và CTA**: hàng "điểm nổi bật" bị dồn trên, chừa void. → **dàn đều hàng (gap co giãn, cap 44px)** lấp xuống gần CTA. 4:5/1:1 gần như không đổi. (`design-engine.ts` drawFullPhotoGeneral)
- Đã soi 1:1 (travel/food/retail): lấp đầy tốt, card matrix ổn. 9:16 matrix dùng card-fill sẵn, ổn.

## Vòng 3 (2026-10-17) — rà rộng
- Soi ĐỦ 14 template (editorial/magazine/spotlight/billboard/agenda/portrait/banner-amber/banner-sky/sale-hot/sale-gold/minimal-light/minimal-dark/frame-emerald/frame-rose): mỗi template có bản sắc riêng, render sạch, chữ không tràn, CTA+pill gọn. KHÔNG lỗi.
- Soi ngành ít dùng (fitness/property/technology/education/event/personal) full-photo + matrix: card lấp đầy tốt, ảnh hero ổn. KHÔNG lỗi.
- Kết: output toàn app ở mức đăng được. Không có lỗi cấu trúc/thô mới. (Mục tiêu tới 16:00)

## Vòng 4 (2026-10-17) — brand-assets + vật phẩm
- Bìa FB 5 mẫu (burst/split/ribbon/minimal/brand): cover sale gọn, USP chips + badge + CTA ổn. KHÔNG lỗi.
- Kind khác (zalo/shopee/youtube/avatar) + wordmark: sạch; avatar NC + ring + badge đẹp. KHÔNG lỗi.
- Vật phẩm ảnh thật (cap/mug/tote/box/tumbler): logo "MIVY/Since 2024" đặt ĐÚNG vùng in. Vector (namecard/standee/phonecase): bố cục gọn. KHÔNG lỗi.

## ✅ ĐÃ RÀ HẾT TOÀN APP — chờ anh duyệt
Posters (mọi ngành × full/matrix × 14 template × 3 khổ) + banner + menu + brand-assets + vật phẩm: render sạch, chuyên nghiệp, QC v2 xanh (0 lỗi). Đã sửa 6 lỗi nội dung/thiết kế (xem các vòng trên). Không còn lỗi thô. Mức tinh tế hơn (đẹp/xấu) cần anh chấm mắt.

## 16:00 — hết giờ, loop kết thúc, chờ anh duyệt
Rà hết toàn app, QC v2 xanh (0 lỗi). Không sửa thêm. Đã sửa 6 lỗi nội dung/thiết kế trong phiên (xem trên).

## 2026-10-18 — Fix: ô Slogan không apply vào poster (recruitment)
- Lỗi: poster recruitment (hero) HARDCODE dòng slogan "GIA NHẬP ĐỘI NGŨ NÒNG CỐT…" → bỏ qua ô "Thông điệp phụ/Slogan" anh nhập. (Tiêu đề & CTA vẫn apply.)
- Sửa: drawFullPhotoRecruitmentHero dùng `copy.subline` (uppercase, fit bề rộng), trống mới dùng mặc định.
- Verify: sửa Tiêu đề/Slogan/CTA đều đổi hình (hash canvas đổi). QC xanh.

## 2026-10-18 — Fix UX: step 2 (Nội dung) lạc lõng + caption gây hiểu lầm
- Nguyên tắc anh chốt: GÕ gì cũng phải thấy tác động ngay, không thì bỏ.
- Step 2: trước chỉ có form, gõ không thấy poster đổi → thêm **PREVIEW LIVE bên phải** (2 cột, dùng lại canvasLaunchRef). Gõ field nào → poster cập nhật ngay. + nút "Xem & tải →". (marketing/page.tsx)
- Step 3 editor: tách rõ 2 nhóm "CHỮ HIỂN THỊ TRÊN ẢNH" vs "CHỮ ĐỂ ĐĂNG BÀI · không lên ảnh" + sửa helper gây hiểu lầm (caption không in lên ảnh).
- Verify: gõ Vị trí/Tiêu đề/Slogan/CTA đều đổi poster. Typecheck sạch.

## 2026-10-18 — Fix UX: khoảng trống preview step 3 + đổi cách show poster
- Lỗi: preview 3 poster xếp dọc (1 to narrow + 2 nhỏ) trong cột rộng → dư khoảng trống khổng lồ 2 bên.
- Đổi idea: poster ĐANG CHỌN hiển thị TO lấp đầy cột (w-full, cap 68vh) + 2 poster còn lại thành HÀNG THUMBNAIL ngang bên dưới để đổi. Cap cột preview 480px. Hết dư. (marketing/page.tsx)

## 2026-10-18 — Fix: thumbnail poster bị ĐEN khi đổi chọn
- Lỗi: `state.selected` KHÔNG có trong deps của effect render → khi click đổi poster chọn, canvas hoán vị slot (to↔thumbnail) mà KHÔNG vẽ lại → ô đen.
- Sửa: thêm state.selected vào deps renderAllCanvases. Test: đổi chọn 2 lần → 0 canvas đen.

## 2026-10-18 — Đổi chỗ 2 cột step 3: controls TRÁI, preview PHẢI
- Grid đổi [1fr_480px], dùng lg:order-1 (controls) / lg:order-2 (preview) — không di chuyển khối code (an toàn). Preview vẫn sticky.

## 2026-10-18 — Gộp 3 bước → 2 bước (bỏ step "Nội dung" riêng)
- Step "Nội dung" đứng riêng thấy thừa → GỘP vào màn xem/tải. Flow còn: **1) Chọn ngành & mẫu → 2) Soạn & tải**.
- Bước 2 (gộp): CỘT TRÁI = form nội dung (ngành/brand/offer/ảnh/facts) + tuỳ chỉnh (gợi ý/kiểu/nền/chữ/khung) + editor (Tiêu đề/Slogan/CTA/caption); CỘT PHẢI = preview GHIM (poster chọn TO + 2 thumbnail) + nút tải. Soạn trái, thấy đổi ngay bên phải.
- Form card (231 dòng) relocate bằng script (cắt/dán theo dòng, không gõ tay) để khỏi lỗi JSX.
- Fix kèm: vào thẳng bước 2 qua nút "Tiếp" trước đây bỏ qua build của handleGenerate → preview trống/đen. Tách `buildContentState()` dùng chung; nút "Tiếp" gọi `goToCompose()` dựng sẵn copies + nền mặc định.
- Verify: step1→Tiếp → poster render đầy đủ (recruitment hero xanh, có ảnh + CTA). Typecheck sạch. QC v2 xanh (179 hình, 0 lỗi).

## 2026-10-18 — Fix UX: cụm nút tải + bỏ cảm giác "2 scrollview"
- Nút tải trước nằm card dưới góc cột phải → khó thấy. Chuyển LÊN ĐẦU cột phải, nổi bật: "Tải ảnh PNG" to full-width (primary) + "Tải đủ 3 khổ" / "Tải cả bộ ZIP" hàng dưới + badge "PNG · 1080px". Carousel (Story) giữ dưới preview.
- "2 scrollview khó xài": thực ra khối preview phải (thanh tải + poster 68vh + thumbnail) CAO HƠN viewport → sticky bị cắt, thumbnail tụt dưới fold không tới được → cảm giác kẹt scroll thứ 2. Fix: cap preview vừa 1 màn (wrapper max-h calc(100vh-7.5rem), poster 40vh, thumb 11vh) → preview luôn hiện trọn, KHÔNG cuộn riêng. Còn đúng 1 scroll (form trái). Đo DOM: sticky bottom 725 ≤ 768, spill 0.

## 2026-10-18 — Fix UX: cụm tuỳ chỉnh (Kiểu/Phong cách/Khổ) quan trọng mà bị chôn + thanh theme cắt
- Sau khi gộp step, card "Tuỳ chỉnh & Tải poster" (quyết định LOOK poster) bị đẩy xuống DƯỚI form dài → khó thấy. Hoist card này LÊN ĐẦU cột trái (cạnh preview). Dời bằng script theo anchor nội dung.
- Thanh "Phong cách" (theme) dùng `.mv-seg` (inline-flex, nowrap) → 5 theme tràn khỏi card, "Clean Minimal" bị cắt; chữ inactive xám mờ khó đọc. Tách Phong cách thành HÀNG RIÊNG, đổi sang chip `flex-wrap` → tự xuống dòng, hiện đủ, active = viền+nền indigo rõ. Kiểu (layout) tách thành hàng riêng.
- Verify (1440px): card tuỳ chỉnh ở đầu cột trái; Phong cách 2 hàng đủ 5 theme không cắt; click Warm Editorial → poster đổi tông kem ngay, active rõ. Typecheck sạch.

## 2026-10-18 — Xoá ô Caption gây hiểu lầm + đưa editor cạnh form
- Xoá hẳn block "Chữ để ĐĂNG BÀI · không lên ảnh" (textarea caption) trong editor — gây hiểu nhầm là chữ lên ảnh. Caption vẫn tự sinh trong file ZIP.
- 2 khu nhập text cách xa ~2600px (form Thông tin cao vì nhiều slider ảnh + facts). Đưa card editor "Chữ hiển thị trên ảnh" (Tiêu đề/Slogan/CTA) lên NGAY TRÊN card Thông tin → 2 khu text liền nhau. Thứ tự: Tuỳ chỉnh → Chữ hiển thị trên ảnh → Thông tin chiến dịch.

## 2026-10-18 — Fix: gõ field ngành KHÔNG hiện lên poster (bỏ khóa, field LIVE)
- Lỗi: gõ Vị trí/Mức lương/Địa điểm → poster không đổi. Nguyên nhân: (1) IndustryForm có cơ chế "khóa" giữ bản sửa tay → chặn field ghi đè copies; (2) `makeIndustryCopy` map salary→subline (sai, hero dùng subline làm slogan) và KHÔNG đưa salary/location vào points (nơi hero đọc để dựng box).
- Fix (anh chọn "field LIVE, bỏ khóa"):
  - IndustryForm.update: BỎ khóa, luôn sync headline(vị trí)+points(yêu cầu/quyền lợi)+caption từ field. KHÔNG đụng subline(slogan)/cta → editor giữ. Bỏ luôn UI "Anh đã sửa… giữ nguyên".
  - KHÔNG tự set conceptId khi gõ → giữ renderer hero NỀN ĐẶC (tránh nhảy sang layout "chữ đè ảnh" đã bỏ).
  - makeIndustryCopy(recruitment): subline='' ; points=[salary, location, ...requirements, ...benefits] → hero bắt thành box "ĐÃI NGỘ/LƯƠNG" + "ĐỊA ĐIỂM" + "KINH NGHIỆM", đổi LIVE khi gõ.
- Verify: gõ Vị trí→tiêu đề đổi; Mức lương→box "Lên đến 3,000 USD"; Địa điểm→box "Đà Nẵng · Remote"; hero giữ nền đặc. Typecheck sạch, QC v2 xanh (179 hình, 0 lỗi).
- CÒN: property/food cũng còn kiểu map price→subline tương tự (chưa đụng, chỉ sửa recruitment theo đúng case anh test).

## 2026-10-18 — Bỏ theme Emerald Pro (xanh lá) — anh ghét
- Xoá hẳn theme `emerald_pro` khỏi ThemeId + POSTER_THEMES. Default đổi sang `tech_dark` (navy). Fallback 2 chỗ trong design-engine + 4 trang review/test nội bộ đổi theo. Bỏ nhánh tint riêng của emerald.
- Phong cách còn 4: Tech Dark / Warm Editorial / Bold Vibrant / Clean Minimal. Typecheck sạch, QC xanh.
