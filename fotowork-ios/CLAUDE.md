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
- Liquid Glass chính thức của iOS 26 (`glassEffect`, `GlassEffectContainer`, tab bar mặc định) — không tự giả lập bằng blur.
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
- Validate nhanh model + preset trên host: `cd Packages/FotoworkKit && swift build --target FotoworkCore`.
- Test (Swift Testing): `swift test` trong `Packages/FotoworkKit`.

## Design tokens (iOS 26 Liquid Glass)
- Nền tối `#07080F` + vệt màu mờ lớn (xanh `#2B72C2`, tím `#6B3FD6`, teal `#1E8F9E`) sau lớp kính.
- Hero & CTA: gradient `#2B72C2 → #3D56D6 → #4A3BBE`, bo lớn, bóng xanh.
- Nhấn theo loại: lime `#C8F051`, green `#3DDC84`, cam `#FFA53B`, đỏ `#FF5C5C/#FF8A8A`, tím `#B57CFF`, vàng `#F5D547`, link `#8CC4FF`.
- Card bo 26–30pt, nút viên tròn, chữ trắng, phụ `#C2C5D8`. Font hệ thống (SF Pro).

## Lộ trình màn hình (làm lần lượt, mỗi màn xong là build + chạy sim + báo anh)
Trang chủ ✅ → Chụp ✅ (AVFoundation + Vision) → Chỉnh ✅ (tiêu chí + nền/áo/sáng/cắt) → Xuất ✅ (dàn in 10×15 + JPG theo px/KB + watermark + StoreKit 2 placeholder) → **Giấy tờ** (VisionKit/CCCD/nén/PencilKit) → Avatar.

### Việc còn treo
- **Template trang phục** (Vest/Sơ mi/Áo dài): engine ghép đã có, cần bộ PNG tạo sẵn offline + anh duyệt gu rồi đặt vào asset `outfit-vest/shirt/aodai`.
- **Gói HD (StoreKit)**: product id `com.mivy.fotowork.hd` là placeholder — cần cấu hình App Store Connect / file `.storekit` để test mua.
- Camera trực tiếp + tách nền (Vision) chỉ chạy trên **máy thật**, không chạy trên simulator.

## Localization & privacy
- String Catalog, `vi` mặc định, có `en`; chừa `id, th, ms, km, my, lo`.
- `PrivacyInfo.xcprivacy` + `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (vi + en, InfoPlist.xcstrings).
