# FotoDocs — iOS app (luật làm việc, tự nạp mỗi session)

Ứng dụng **ảnh thẻ / ảnh visa / giấy tờ / avatar** cho người dùng Việt Nam + ĐNA.
Nằm trong repo `mivy` nhưng **độc lập hoàn toàn với web/ và back-end/** — không sửa chéo.

## Giao tiếp
- Nói với anh bằng **tiếng Việt, xưng "em", gọi user là "anh"**. Code / tên biến / commit bằng tiếng Anh.
- Chữ TRONG APP (cho người dùng cuối) xưng **"bạn"**, không dùng "anh".
- Trả lời ngắn gọn. Trước khi code mảng lớn thì đưa plan ngắn để anh duyệt.

## Nguyên tắc sản phẩm (BẮT BUỘC)
- Mọi xử lý ảnh chạy **ON-DEVICE** (Vision, Core Image, Core ML). **Không gửi ảnh khuôn mặt lên server, không gọi AI trả phí theo request.**
- Ảnh giấy tờ chính thức: chỉ xử lý nền / ánh sáng / cắt khung / trang phục — **KHÔNG làm đẹp hay chỉnh khuôn mặt.**
- Không hứa 100% đạt chuẩn. Luôn hiển thị "theo hướng dẫn của cơ quan lãnh sự" + ngày cập nhật preset.
- Avatar: phải có checkbox đồng ý "ảnh của tôi hoặc được phép dùng" trước khi tạo.

## Nguồn dữ liệu preset
- `Shared/presets.json` là **nguồn chuẩn ảnh duy nhất** (8 nước visa + 8 nước gốc ĐNA). `researched` = ngày cập nhật.
- FotoDocsCore trỏ tới file này qua **symlink** `Sources/FotoDocsCore/Resources/presets.json` → một bản duy nhất, không nhân đôi. Sửa data chỉ sửa ở `Shared/`.

## Stack & kiến trúc
- Xcode 27, **Swift 6.2** (strict concurrency `complete`), deployment target **iOS 26**.
- SwiftUI thuần · Observation (`@Observable`) · async/await + actors. **Không dùng Combine** cho state mới.
- **Theme SÁNG** (design duyệt 2026-10-31): KHÔNG dùng Liquid Glass tối nữa. Thẻ trắng phẳng viền mảnh + bóng nhẹ qua modifier `.fotoCard()/.fotoCardCircle()/.fotoCardCapsule()` trong FotoDocsDesign. `glassEffect` chỉ còn (nếu cần) cho bề mặt tối.
- Modular bằng **một local Swift Package `Packages/FotoDocsKit`**, mỗi module là 1 target:
  - `FotoDocsCore` — models, PresetStore (đọc presets.json), DI qua Environment (`\.presetStore`).
  - `FotoDocsImaging` — xử lý ảnh on-device (Vision/Core Image). Protocol-based để sau cắm Core ML (BiRefNet/MODNet) không đổi UI.
  - `FotoDocsDesign` — design system: màu, typography, component Liquid Glass dùng chung.
  - `FeatureIDPhoto` / `FeatureDocuments` / `FeatureAvatar` / `FeatureSettings`.
- App target (`FotoDocs/`) chỉ ghép module + navigation (TabView 4 tab).
- MVVM: mỗi màn 1 `@MainActor @Observable` view model; DI qua SwiftUI Environment (live `PresetStore` + `MockPresetStore` cho preview/test).

## Project được GENERATE, không commit .xcodeproj
- `FotoDocs.xcodeproj` do **xcodegen** sinh từ `project.yml`. Chỉnh cấu hình → sửa `project.yml` rồi chạy lại:
  ```bash
  cd fotodocs-ios && xcodegen generate
  ```
- `.xcodeproj` và thư mục build nằm trong `.gitignore`. Commit `project.yml`, source, `presets.json`.

## Build & chạy
- **CHỈ dùng sim iPhone Air** (`5FE5370F-C8BF-4731-9687-F141CDE5163E`). **TUYỆT ĐỐI KHÔNG build/test/cài/chạy app này trên sim iPhone 17** (anh dùng cho việc khác). Ảnh test nằm trong thư viện Ảnh của iPhone Air.
```bash
cd fotodocs-ios && xcodegen generate
xcodebuild -project FotoDocs.xcodeproj -scheme FotoDocs \
  -destination 'platform=iOS Simulator,name=iPhone Air' \
  -derivedDataPath .build-xcode build
```
- Test (Swift Testing, target `FotoDocsTests` ở `Tests/`, chạy trên simulator):
  ```bash
  cd fotodocs-ios && xcodebuild test -project FotoDocs.xcodeproj -scheme FotoDocs \
    -destination 'platform=iOS Simulator,name=iPhone Air' -derivedDataPath .build-xcode
  ```
  Test headless phần logic (FotoDocsCore + FotoDocsImaging): preset, model, CaptureTarget, crop math, PhotoExporter, FaceChecker (ảnh synthetic), StandardChecklist. KHÔNG `swift test` được vì các Feature target import UIKit/VisionKit (iOS-only).

## Design tokens (light theme — nguồn: canvas design claude.ai/artifact/4NBGzixMCngFJKprkTNVpo)
- Nền `#F4F6FB`, chữ chính `#121726`, phụ `#5B6579`, mờ `#8A92A6`.
- Thẻ: trắng `#FFFFFF`, viền `#E4E8F1`, bóng `0 1px 2px rgba(18,23,38,.05)`; bar/sheet bóng `0 8px 24px rgba(18,23,38,.10)`.
- Brand navy `#1E3A8A` (dark `#15306F`), tint `#EAF0FB`. Hero = khối navy đặc bo 24, nút "Bắt đầu" trắng đè mép.
- CTA: navy đặc bo 16, chữ trắng, bóng `rgba(30,58,138,.28)`.
- Status: success `#1F7A4D` (check `#46C27C`), warning `#B45309`, PRO `#C2710C`.
- Màn **Chụp** là bề mặt TỐI `#2A313E`, control translucent trắng (`rgba(255,255,255,.16)` + viền `.32`).
- Font: **Be Vietnam Pro** bundle trong FotoDocsDesign/Resources/Fonts (4 weight), đăng ký `FotoFonts.register()` lúc launch; dùng qua `Font.bvp(.style, .weight)` / `Font.bvp(size:_:)`. KHÔNG dùng `.font(.system/.headline…)` trực tiếp nữa.
- Tab bar: **custom trắng nổi** (`FotoDocsTabBar` trong RootView), active = tint pill navy. Màn push gọi `.fotoHidesTabBar()` để ẩn bar (RootView đọc `TabBarHiddenKey`). Content đổi tab bằng switch (không giữ state giữa tab — chấp nhận v1).

## Lộ trình màn hình (làm lần lượt, mỗi màn xong là build + chạy sim + báo anh)
Trang chủ ✅ (menu = bảng tất cả cỡ ảnh, Công cụ nhanh mở thẳng màn ở tab Giấy tờ/Avatar) → Chụp ✅ → Chỉnh ✅ (Nền & áo: ghép vest bằng HeadSwap) → Xuất ✅ (File in 10×15 / File số / In ngay AirPrint) → Giấy tờ ✅ (Scan→PDF, Thẻ hai mặt→A4, Nén, Ký tên PencilKit, Điền form visa, Công tác phí, Bộ hồ sơ SwiftData, tìm kiếm) → Avatar ✅ → Cài đặt ✅ (bảng cỡ ảnh, quyền riêng tư, xoá dữ liệu bộ hồ sơ, chia sẻ app). **v1 đủ các màn chính.**

### Việc còn treo
- **Ghép vest = GHÉP ĐẦU lên thân mẫu (2026-11-01, anh chốt hướng này)**. Cách cũ (đặt áo vest PNG + tự vẽ cổ) bị anh chê "cổ giả" → đã bỏ. Giờ: thân người mẫu mặc vest **gen sẵn offline** bằng Z-Image (ComfyUI local `back-end/.comfyui`, prompt: ảnh thẻ chính diện, lộ cổ, nền trắng) → cắt nền + đo `chin/cx/jawW` (script prep) → lưu `FotoDocsImaging/Resources/Garments/body-<giới>-<màu>.png/.json`. Trên máy: `HeadSwap.compose` đặt đầu người dùng (KHÔNG chỉnh mặt) lên thân mẫu theo bề rộng hàm, chỉ giữ cổ + quần áo của mẫu, chỉnh màu da cổ (YCbCr): sắc da lấy ở má, độ sáng lấy từ cổ thật của người dùng (nếu lộ dưới cằm, không tối hơn mặt quá 14%). Cỡ đầu: theo bề rộng hàm, kéo về tỉ lệ cổ/hàm thật của người dùng (±12%). Người dùng tự tinh chỉnh được (card "Tinh chỉnh ghép áo", `OutfitTuning`): cỡ đầu, vị trí đầu, độ sáng cổ, màu da cổ — mặt KHÔNG bị chỉnh. Mép cằm mờ dần vào cổ theo đúng đường hàm (chỉ trong bề rộng cổ); nếu ảnh lộ đủ cổ thật (≥0.2 bề rộng hàm dưới cằm) thì GIỮ cổ thật của người dùng (bóng tối dưới cằm thật), nằm trong cổ mẫu, mờ dần vào cổ mẫu trước cổ áo — màu cổ mẫu lấy theo cổ thật; cổ được thêm hạt nhiễu bằng độ nhiễu da mặt (đo ở má, quy theo tỉ lệ đầu). Chỉ đạt với ảnh **chính diện, đầu thẳng**. Thêm mẫu: gen ảnh → chạy prep → thêm case `OutfitOption`.
- **Simulator không chạy model Vision** ("Could not create inference context"): landmark ra contour rác, không có mask người. Trên sim code KHÔNG gọi Vision (`FaceGeometry.useVision = false`): hàm = khuôn hàm trung bình (đo từ Vision) co giãn theo mắt/miệng CIDetector + dò mép bóng dưới cằm; tách người = loang nền từ mép (màu trôi chậm) + lọc cây xanh / tường lọt giữa tóc–cổ. Thử trên Mac: bật/tắt `useVision` để so 2 chế độ. Chất lượng thật xem trên máy thật.
- Chỉnh ảnh: chọn màu nền mà chưa tách được người → checklist KHÔNG tính "nền đồng màu" + báo "Chưa thay được nền cho ảnh này" (trước đây báo 10/10 sai).
- **Icon app**: vẽ bằng code `Tools/app-icon/make_icon.py` (navy + thẻ ảnh người mặc vest). Muốn icon xịn hơn → gen offline rồi anh duyệt.
- **Nền màu (xanh/xám) khi ghép áo**: mép tóc được khử màu tường cũ, đuôi tóc dài (cạnh cổ) khử thêm màu áo cũ của người dùng (`HeadSwap.decontaminate`, lượt 2 sâu hơn): tách màu nền B / màu người F tại chỗ, tính alpha theo khoảng cách B→F; KHÔNG đụng mặt và da dưới chân tóc). Khe giữa hàm và tóc dài được giữ điểm ảnh gốc (không lộ nền mới). Thân mẫu đã khử viền trắng ở mép cắt (`Tools/body-templates/defringe_body.swift`). Chế độ sim: ảnh nền phức tạp (tường nhà, cây) vẫn có thể dính mảng nền — giới hạn của tách nền fallback.
- **Thân mẫu vest hiện có**: nam xanh, nam đen, nữ xanh, nữ đen (`Resources/Garments/body-*`). Tóc vàng/màu sáng chưa giữ được phần tóc dài dưới cằm.
- **Công tác phí** (`FeatureDocuments/ExpenseView`, 2026-11-02): chụp/chọn ảnh hoá đơn → OCR Vision trên máy (`ReceiptReader`, vi-VT) → `ReceiptParser` (FotoDocsCore) đoán nơi chi / ngày / tổng tiền / loại → người dùng sửa → lưu SwiftData `ExpenseReceipt` → xuất `.xlsx` (`XLSXWriter`, zip tự viết, có công thức SUM) hoặc PDF A4 (bảng kê + số tiền bằng chữ + ảnh hoá đơn). Mới thử bằng hoá đơn tổng hợp; hoá đơn giấy nhiệt thật (nhăn, mờ) chưa thử trên máy thật.
- **Điền form visa** (`FeatureDocuments/VisaFormView`, 2026-11-02): quét CCCD → đọc **mã QR** (Vision + CIDetector dự phòng, chạy cả trên sim) `CCCDInfo`; quét hộ chiếu → đọc **MRZ** có kiểm tra check digit `PassportMRZ` → `VisaProfile` lưu JSON (Application Support, completeFileProtection). `VisaForms` (FotoDocsCore) = danh sách ô theo thứ tự form 8 nước + định dạng ngày riêng từng nước → bảng chạm-để-copy + "Copy tất cả". Bước 2 (điền PDF chính thức): **Nhật** ✅ (MOFA 000124525.pdf, anh tải tay — web MOFA chặn tải tự động; đặt ở `FeatureDocuments/Resources/VisaForms/japan-visa-form.pdf`). `JapanVisaPDF` đọc vị trí ô AcroForm theo tên ô (T2, T7…, ghép với nhãn in theo toạ độ), bỏ widget rồi VẼ PHẲNG chữ lên dòng kẻ + tick ô chọn + dán ảnh vào khung 35×45 → PDF in được, xem giống nhau ở mọi app. MOFA đổi form → tải lại, kiểm lại tên ô — form Hàn chưa có bản PDF chính thức còn sống (link MOFA Hàn 404, Hàn chuyển e-Form online visa.go.kr) nên Hàn dùng bảng copy.
- **Thêm 2026-11-03** (đều on-device, chưa thử máy thật):
  - **Thẻ hai mặt** (`CCCDView`): CCCD / bằng lái / BHYT / thẻ SV / thẻ ngân hàng. `CardScanner.extractCard` tìm mép thẻ (Vision rectangles, CIDetector dự phòng) + nắn phối cảnh; thẻ ngân hàng `maskCardNumbers` che số (chừa 4 số cuối) + CVV mặt sau.
  - **Ảnh nộp online** (`OnlinePhotoView`, `CaptureTarget.online`): 6 cổng (DS-160 600×600 ≤240KB, COVA 354×472 ≤120KB, UK, hộ chiếu online BCA, thi THPT, hồ sơ 3×4). Chụp mới → luồng chụp/chỉnh/xuất "File số" đúng px/KB; hoặc **Kiểm tra ảnh** có sẵn (`OnlinePhotoCheck` + `PhotoProbe`: JPEG, tỉ lệ, px, KB, mặt, cỡ đầu ≈ face box × 1.45, nền sáng) → "Sửa cho đạt chuẩn" mở EditView. Cổng VN không công bố KB chính thức → app giữ dưới mức thấp nhất các hướng dẫn nêu.
  - **Ảnh cho bé** (`CaptureTarget.baby`, `infant`): EditViewModel tự xoay ảnh cho mặt thẳng (`FaceLevel.leveled`, CIDetector 4 hướng + lượt 2, sai < 0.5°); "lộ hai tai" chỉ là gợi ý.
  - **Lịch trình chuyến đi** + **Bản dịch giấy tờ** (khai sinh, CT07, xác nhận công tác + nghỉ phép) trong màn Điền form visa → PDF A4 tiếng Anh (`TravelDocsPDF`), lưu JSON local (`LocalJSON`), điền sẵn từ hồ sơ visa. Bản dịch là THAM KHẢO, người dùng mang đi công chứng.
- **Đăng nhập (LÀM SAU, anh chốt 2026-11-03)**: dùng chung **tài khoản Mivy** (back-end Mivy cấp token; các app cùng Team ID dùng chung Keychain access group). Đăng nhập **tuỳ chọn**, app dùng được không cần tài khoản; chỉ vài tính năng bắt đăng nhập (ví, đặt in, đồng bộ). Mua đồ số trong app (HD, bỏ watermark) vẫn qua IAP, không trừ ví Mivy. Chưa code cho tới khi anh bảo.
- **Gói HD (StoreKit)**: product id `com.mivy.fotodocs.hd` là placeholder — cần cấu hình App Store Connect / file `.storekit` để test mua.
- **Chỉ chạy trên máy thật** (không chạy trên simulator): camera trực tiếp, tách nền Vision (ảnh thẻ & avatar), scan tài liệu VisionKit. Trên sim đều có fallback bằng chọn ảnh.
- Avatar: nền hiện render bằng code (gradient + khung). Nếu muốn nền minh hoạ đẹp hơn → kho template tạo sẵn offline, anh duyệt gu.

## Localization & privacy
- String Catalog, `vi` mặc định, có `en`; chừa `id, th, ms, km, my, lo`.
- `PrivacyInfo.xcprivacy` + `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (vi + en, InfoPlist.xcstrings).
