# Fotowork — iOS app (luật làm việc, tự nạp mỗi session)

Ứng dụng **ảnh thẻ / ảnh visa / giấy tờ / avatar** cho người dùng Việt Nam + ĐNA.
Nằm trong repo `mivy` nhưng **độc lập hoàn toàn với web/ và back-end/** — không sửa chéo.

## Giao tiếp
- Nói với anh bằng **tiếng Việt, xưng "em", gọi user là "anh"**. Code / tên biến / commit bằng tiếng Anh.
- Trả lời ngắn gọn. Trước khi code mảng lớn thì đưa plan ngắn để anh duyệt.

## Nguyên tắc sản phẩm (BẮT BUỘC)
- Mọi xử lý ảnh chạy **ON-DEVICE** (Vision, Core Image, Core ML). **Không gửi ảnh khuôn mặt lên server, không gọi AI trả phí theo request.**
- Ảnh giấy tờ chính thức: chỉ xử lý nền / ánh sáng / cắt khung / trang phục — **KHÔNG làm đẹp hay chỉnh khuôn mặt.**
- Không hứa 100% đạt chuẩn. Luôn hiển thị "theo hướng dẫn của cơ quan lãnh sự" + ngày cập nhật preset.
- Avatar: phải có checkbox đồng ý "ảnh của tôi hoặc được phép dùng" trước khi tạo.

## Nguồn dữ liệu preset
- `Shared/presets.json` là **nguồn chuẩn ảnh duy nhất** (8 nước visa + 8 nước gốc ĐNA). `researched` = ngày cập nhật.
- FotoworkCore trỏ tới file này qua **symlink** `Sources/FotoworkCore/Resources/presets.json` → một bản duy nhất, không nhân đôi. Sửa data chỉ sửa ở `Shared/`.

## Stack & kiến trúc
- Xcode 27, **Swift 6.2** (strict concurrency `complete`), deployment target **iOS 26**.
- SwiftUI thuần · Observation (`@Observable`) · async/await + actors. **Không dùng Combine** cho state mới.
- **Theme SÁNG** (design duyệt 2026-10-31): KHÔNG dùng Liquid Glass tối nữa. Thẻ trắng phẳng viền mảnh + bóng nhẹ qua modifier `.fotoCard()/.fotoCardCircle()/.fotoCardCapsule()` trong FotoworkDesign. `glassEffect` chỉ còn (nếu cần) cho bề mặt tối.
- Modular bằng **một local Swift Package `Packages/FotoworkKit`**, mỗi module là 1 target:
  - `FotoworkCore` — models, PresetStore (đọc presets.json), DI qua Environment (`\.presetStore`).
  - `FotoworkImaging` — xử lý ảnh on-device (Vision/Core Image). Protocol-based để sau cắm Core ML (BiRefNet/MODNet) không đổi UI.
  - `FotoworkDesign` — design system: màu, typography, component Liquid Glass dùng chung.
  - `FeatureIDPhoto` / `FeatureDocuments` / `FeatureAvatar` / `FeatureSettings`.
- App target (`Fotowork/`) chỉ ghép module + navigation (TabView 4 tab).
- MVVM: mỗi màn 1 `@MainActor @Observable` view model; DI qua SwiftUI Environment (live `PresetStore` + `MockPresetStore` cho preview/test).

## Project được GENERATE, không commit .xcodeproj
- `Fotowork.xcodeproj` do **xcodegen** sinh từ `project.yml`. Chỉnh cấu hình → sửa `project.yml` rồi chạy lại:
  ```bash
  cd fotowork-ios && xcodegen generate
  ```
- `.xcodeproj` và thư mục build nằm trong `.gitignore`. Commit `project.yml`, source, `presets.json`.

## Build & chạy
```bash
cd fotowork-ios && xcodegen generate
xcodebuild -project Fotowork.xcodeproj -scheme Fotowork \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  -derivedDataPath .build-xcode build
```
- Test (Swift Testing, target `FotoworkTests` ở `Tests/`, chạy trên simulator):
  ```bash
  cd fotowork-ios && xcodebuild test -project Fotowork.xcodeproj -scheme Fotowork \
    -destination 'platform=iOS Simulator,name=iPhone 17' -derivedDataPath .build-xcode
  ```
  Test headless phần logic (FotoworkCore + FotoworkImaging): preset, model, CaptureTarget, crop math, PhotoExporter, FaceChecker (ảnh synthetic), StandardChecklist. KHÔNG `swift test` được vì các Feature target import UIKit/VisionKit (iOS-only).

## Design tokens (light theme — nguồn: canvas design claude.ai/artifact/4NBGzixMCngFJKprkTNVpo)
- Nền `#F4F6FB`, chữ chính `#121726`, phụ `#5B6579`, mờ `#8A92A6`.
- Thẻ: trắng `#FFFFFF`, viền `#E4E8F1`, bóng `0 1px 2px rgba(18,23,38,.05)`; bar/sheet bóng `0 8px 24px rgba(18,23,38,.10)`.
- Brand navy `#1E3A8A` (dark `#15306F`), tint `#EAF0FB`. Hero = khối navy đặc bo 24, nút "Bắt đầu" trắng đè mép.
- CTA: navy đặc bo 16, chữ trắng, bóng `rgba(30,58,138,.28)`.
- Status: success `#1F7A4D` (check `#46C27C`), warning `#B45309`, PRO `#C2710C`.
- Màn **Chụp** là bề mặt TỐI `#2A313E`, control translucent trắng (`rgba(255,255,255,.16)` + viền `.32`).
- Font: **Be Vietnam Pro** bundle trong FotoworkDesign/Resources/Fonts (4 weight), đăng ký `FotoFonts.register()` lúc launch; dùng qua `Font.bvp(.style, .weight)` / `Font.bvp(size:_:)`. KHÔNG dùng `.font(.system/.headline…)` trực tiếp nữa.
- Tab bar: **custom trắng nổi** (`FotoworkTabBar` trong RootView), active = tint pill navy. Màn push gọi `.fotoHidesTabBar()` để ẩn bar (RootView đọc `TabBarHiddenKey`). Content đổi tab bằng switch (không giữ state giữa tab — chấp nhận v1).

## Lộ trình màn hình (làm lần lượt, mỗi màn xong là build + chạy sim + báo anh)
Trang chủ ✅ → Chụp ✅ → Chỉnh ✅ → Xuất ✅ → Giấy tờ ✅ (Scan→PDF, CCCD→A4, Nén, Ký tên PencilKit, Bộ hồ sơ SwiftData) → Avatar ✅ (tab + template nền code + consent + tách nền ghép). **v1 đủ các màn chính.**

### Việc còn treo
- **Ghép vest: ĐÃ BẬT lại (2026-10-31)** — 3 mẫu Vest xanh/xám/đen. Template = layer `服饰` cắt từ PSD thật (Drive của anh), lưu ở `FotoworkImaging/Resources/Garments/*.png` (1000px). Engine `GarmentFitter` (on-device): Vision faceContour + mask người → scale lỗ cổ áo ≈ 0.8× bề rộng hàm, treo dưới cằm 0.12× hàm, vẽ cổ tổng hợp theo màu da, xoá áo cũ (giữ tóc trong elip quanh đầu), vẽ lại đầu đè lên cổ áo. KHÔNG chỉnh mặt. Chỉ đạt với ảnh **chính diện**; mặt nghiêng/cúi sẽ kém. Muốn thêm mẫu: export layer `服饰` PNG trong suốt, cổ áo hở ở giữa, thêm case vào `OutfitOption`. Sơ mi/áo dài chưa có template.
- **Simulator không chạy model Vision** (lỗi "Could not create inference context"; landmark trả contour rác, không có mask người). `GarmentFitter` tự fallback: elip hàm từ face box + CIDetector, nền giữ ảnh gốc. Chất lượng thật phải xem trên máy thật (hoặc harness Mac chạy cùng code).
- **Gói HD (StoreKit)**: product id `com.mivy.fotowork.hd` là placeholder — cần cấu hình App Store Connect / file `.storekit` để test mua.
- **Chỉ chạy trên máy thật** (không chạy trên simulator): camera trực tiếp, tách nền Vision (ảnh thẻ & avatar), scan tài liệu VisionKit. Trên sim đều có fallback bằng chọn ảnh.
- Avatar: nền hiện render bằng code (gradient + khung). Nếu muốn nền minh hoạ đẹp hơn → kho template tạo sẵn offline, anh duyệt gu.

## Localization & privacy
- String Catalog, `vi` mặc định, có `en`; chừa `id, th, ms, km, my, lo`.
- `PrivacyInfo.xcprivacy` + `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (vi + en, InfoPlist.xcstrings).
