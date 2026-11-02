# Fotowork — iOS app (luật làm việc, tự nạp mỗi session)

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
- **CHỈ dùng sim iPhone Air** (`5FE5370F-C8BF-4731-9687-F141CDE5163E`). **TUYỆT ĐỐI KHÔNG build/test/cài/chạy app này trên sim iPhone 17** (anh dùng cho việc khác). Ảnh test nằm trong thư viện Ảnh của iPhone Air.
```bash
cd fotowork-ios && xcodegen generate
xcodebuild -project Fotowork.xcodeproj -scheme Fotowork \
  -destination 'platform=iOS Simulator,name=iPhone Air' \
  -derivedDataPath .build-xcode build
```
- Test (Swift Testing, target `FotoworkTests` ở `Tests/`, chạy trên simulator):
  ```bash
  cd fotowork-ios && xcodebuild test -project Fotowork.xcodeproj -scheme Fotowork \
    -destination 'platform=iOS Simulator,name=iPhone Air' -derivedDataPath .build-xcode
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
Trang chủ ✅ (menu = bảng tất cả cỡ ảnh, Công cụ nhanh mở thẳng màn ở tab Giấy tờ/Avatar) → Chụp ✅ → Chỉnh ✅ (Nền & áo: ghép vest bằng HeadSwap) → Xuất ✅ (File in 10×15 / File số / In ngay AirPrint) → Giấy tờ ✅ (Scan→PDF, CCCD→A4, Nén, Ký tên PencilKit, Bộ hồ sơ SwiftData, tìm kiếm) → Avatar ✅ → Cài đặt ✅ (bảng cỡ ảnh, quyền riêng tư, xoá dữ liệu bộ hồ sơ, chia sẻ app). **v1 đủ các màn chính.**

### Việc còn treo
- **Ghép vest = GHÉP ĐẦU lên thân mẫu (2026-11-01, anh chốt hướng này)**. Cách cũ (đặt áo vest PNG + tự vẽ cổ) bị anh chê "cổ giả" → đã bỏ. Giờ: thân người mẫu mặc vest **gen sẵn offline** bằng Z-Image (ComfyUI local `back-end/.comfyui`, prompt: ảnh thẻ chính diện, lộ cổ, nền trắng) → cắt nền + đo `chin/cx/jawW` (script prep) → lưu `FotoworkImaging/Resources/Garments/body-<giới>-<màu>.png/.json`. Trên máy: `HeadSwap.compose` đặt đầu người dùng (KHÔNG chỉnh mặt) lên thân mẫu theo bề rộng hàm, chỉ giữ cổ + quần áo của mẫu, chỉnh màu da cổ (YCbCr): sắc da lấy ở má, độ sáng lấy từ cổ thật của người dùng (nếu lộ dưới cằm, không tối hơn mặt quá 14%). Cỡ đầu: theo bề rộng hàm, kéo về tỉ lệ cổ/hàm thật của người dùng (±12%). Người dùng tự tinh chỉnh được (card "Tinh chỉnh ghép áo", `OutfitTuning`): cỡ đầu, vị trí đầu, độ sáng cổ, màu da cổ — mặt KHÔNG bị chỉnh. Mép cằm mờ dần vào cổ theo đúng đường hàm (chỉ trong bề rộng cổ); cổ được thêm hạt nhiễu bằng độ nhiễu da mặt (đo ở má, quy theo tỉ lệ đầu). Chỉ đạt với ảnh **chính diện, đầu thẳng**. Thêm mẫu: gen ảnh → chạy prep → thêm case `OutfitOption`.
- **Simulator không chạy model Vision** ("Could not create inference context"): landmark ra contour rác, không có mask người. Trên sim code KHÔNG gọi Vision (`FaceGeometry.useVision = false`): hàm = khuôn hàm trung bình (đo từ Vision) co giãn theo mắt/miệng CIDetector + dò mép bóng dưới cằm; tách người = loang nền từ mép (màu trôi chậm) + lọc cây xanh / tường lọt giữa tóc–cổ. Thử trên Mac: bật/tắt `useVision` để so 2 chế độ. Chất lượng thật xem trên máy thật.
- Chỉnh ảnh: chọn màu nền mà chưa tách được người → checklist KHÔNG tính "nền đồng màu" + báo "Chưa thay được nền cho ảnh này" (trước đây báo 10/10 sai).
- **Icon app**: vẽ bằng code `Tools/app-icon/make_icon.py` (navy + thẻ ảnh người mặc vest). Muốn icon xịn hơn → gen offline rồi anh duyệt.
- **Thân mẫu vest hiện có**: nam xanh, nam đen, nữ xanh, nữ đen (`Resources/Garments/body-*`). Tóc vàng/màu sáng chưa giữ được phần tóc dài dưới cằm.
- **Gói HD (StoreKit)**: product id `com.mivy.fotowork.hd` là placeholder — cần cấu hình App Store Connect / file `.storekit` để test mua.
- **Chỉ chạy trên máy thật** (không chạy trên simulator): camera trực tiếp, tách nền Vision (ảnh thẻ & avatar), scan tài liệu VisionKit. Trên sim đều có fallback bằng chọn ảnh.
- Avatar: nền hiện render bằng code (gradient + khung). Nếu muốn nền minh hoạ đẹp hơn → kho template tạo sẵn offline, anh duyệt gu.

## Localization & privacy
- String Catalog, `vi` mặc định, có `en`; chừa `id, th, ms, km, my, lo`.
- `PrivacyInfo.xcprivacy` + `NSCameraUsageDescription` / `NSPhotoLibraryUsageDescription` (vi + en, InfoPlist.xcstrings).
