# Browser Native IndexedDB QC Harness Result

## 1. Mục Đích & Bối Cảnh Cập Nhật (2026-10-08)
Đợt sửa đổi này giải quyết triệt để các phát hiện của Codex trong đợt chạy harness đầu tiên (`reports/browser-idb-first-20261008.json`):
1. **Khắc phục lỗi Schema Poisoning & NotFoundError**:
   - *Nguyên nhân*: Hàm `inspectNativeIDB` trước đó đã gọi `window.indexedDB.open(QC_ASSET_DB, 1)` trước khi production store kịp khởi tạo, nhưng lại thiếu handler `onupgradeneeded`. Hành động này vô tình tạo ra cơ sở dữ liệu IndexedDB version 1 nhưng không có bất kỳ object store nào. Khi `DraftController` / `asset-store` production mở DB sau đó ở version 1, sự kiện nâng cấp schema không được kích hoạt lại, dẫn tới lỗi `NotFoundError: The specified object store was not found` tại bước `saveAsset`.
   - *Giải pháp*: Bổ sung cơ chế **Self-Healing Schema** trực tiếp trong `openAssetDB` (`web/src/lib/asset-store.ts`). Nếu phát hiện cơ sở dữ liệu đã mở mà chưa có object store `assets` (`!db.objectStoreNames.contains(ASSET_STORE_NAME)`), hàm sẽ tự động đóng kết nối và mở lại với `db.version + 1` để kích hoạt `onupgradeneeded` tạo bảng `assets`. Đồng thời, chuẩn hóa `inspectNativeIDB` trong harness để dùng chung `openAssetDB(QC_ASSET_DB)`. Cơ chế này chỉ phục hồi trên namespace `mivy-qc-*`, tuyệt đối không tác động đến cơ sở dữ liệu thật của ứng dụng.
2. **Triệt tiêu 100% False Positive (Chặn Inline Fallback coi là Thành Công)**:
   - *Nguyên nhân*: Khi `persistStateAssets` gặp lỗi IDB, cơ chế phòng thủ giữ nguyên data URI in-memory để không làm mất ảnh của người dùng. Các bài test cũ chỉ kiểm tra `restored.image.startsWith('data:')`, dẫn tới việc các test 2–5 vẫn báo "PASS" dù trong native IDB thực tế có 0 bản ghi (IDB hoàn toàn rỗng).
   - *Giải pháp*: Bắt buộc bổ sung các assertion nghiêm ngặt trước khi tiến hành resolve:
     - `failedFields.length === 0`: Không có bất kỳ trường nào thất bại khi ghi vào IDB.
     - Toàn bộ trường ảnh sau khi persist PHẢI là `mivy-asset:...` ref (không chấp nhận data URI inline).
     - Mọi ref IDB phải THỰC SỰ tồn tại trong danh sách keys của native IndexedDB (`inspectNativeIDB`).
     - Tuyệt đối không chấp nhận inline fallback là kết quả thành công cho native IDB.
3. **Thực thi Actual Page Reload Thật (F5 Browser Reload)**:
   - Bổ sung nút và luồng kiểm tra `🔄 Chạy Actual F5 Reload Thật`. Luồng này lưu draft vào LocalStorage `mivy-qc-marketing-v1`, đặt cờ `sessionStorage.setItem('mivy_qc_pending_actual_reload', 'true')` và thực hiện `window.location.reload()`.
   - Khi trang web tải lại từ đầu, `useEffect` tự động phát hiện cờ, đọc dữ liệu QC có sẵn (tuyệt đối không reseed), dùng `DraftController` nạp metadata và giải mã hình ảnh từ native IndexedDB `mivy-qc-assets-v1`, vẽ poster lên canvas và xác nhận PASS.
4. **Bổ sung Tải Ảnh Canvas PNG Cho Visual Inspection**:
   - Thêm nút `⬇ Tải PNG Canvas` ở từng test card và nút `🖼 Tải Toàn Bộ PNGs` trên thanh công cụ chính để tải file `.png` của canvas render thật. Giúp Codex và anh dễ dàng kiểm tra trực quan kết quả vẽ poster khi công cụ chụp màn hình (screenshot) của trình duyệt gặp sự cố.
5. **Thắt chặt Bảo Mật Dev-Only**:
   - Enforce bằng `if (process.env.NODE_ENV === 'production') notFound();` tại server component boundary thay vì chỉ hiển thị badge trên giao diện.

---

## 2. Đường Dẫn (URL) & Hướng Dẫn Vận Hành

### A. URL Truy Cập
* **URL trực tiếp**: `http://localhost:3009/studio/marketing/review/persistence`
* **Hoặc điều hướng từ**: `http://localhost:3009/studio/marketing/review` (bấm liên kết `🔬 Chuyển sang QC Persistence (Native IDB) →` ở thanh thông báo đầu trang).

### B. Hướng Dẫn Thao Tác QC
1. Truy cập vào `http://localhost:3009/studio/marketing/review/persistence`.
2. Bấm nút **`▶ Chạy Tất Cả (Run All QC)`**:
   - Chạy tuần tự 6 ca kiểm thử native IndexedDB.
   - Assert chặt chẽ: `failedFields.length === 0`, `persisted` chứa `mivy-asset:...` refs, và native IDB thực sự chứa các khóa tương ứng.
   - Giải mã dữ liệu và render poster lên 6 khung canvas tương ứng.
3. Bấm nút **`🔄 Chạy Actual F5 Reload Thật`**:
   - Trình duyệt sẽ thực hiện F5 thật qua `window.location.reload()`.
   - Sau khi F5, harness tự động nạp draft QC có sẵn từ storage, giải mã ảnh từ native IDB `mivy-qc-assets-v1` và render lên canvas của Test 3, xác minh trạng thái bền vững sau khi tải lại trang thật.
4. Bấm nút **`🖼 Tải Toàn Bộ PNGs`** hoặc **`⬇ Tải PNG Canvas`** ở từng card để lưu ảnh render thật về máy.
5. Bấm nút **`⬇ Tải JSON Báo Cáo`** để tải file `mivy-browser-qc-report-[YYYY-MM-DD].json` chứa đầy đủ logs, assertion details, và cờ `actualReloadVerified`.
6. Bấm nút **`🗑 Dọn Dẹp QC Storage`** khi hoàn tất để dọn dẹp sạch namespace QC.

---

## 3. Chi Tiết 6 Ca Kiểm Thử Native IndexedDB

1. **Test 1: Native IndexedDB Persist & Resolve Roundtrip**:
   - Lưu `image` (Main Fixture) và `backgroundImage` (Background Fixture) vào native IDB `mivy-qc-assets-v1`.
   - Assert: `failedFields` rỗng, các trường ảnh chuyển thành `mivy-asset:...` refs, và cả 2 refs đều có mặt trong IDB object store `assets`.
   - Giải mã qua `resolveStateAssets` và assert trùng khớp 100% data URI gốc. Render poster lên Canvas 1.

2. **Test 2: A→B→A Category Switch Persistence**:
   - Khởi tạo controller ở ngành A (`recruitment`) với ảnh chính A.
   - Assert lưu thành công vào native IDB trước khi chuyển sang ngành B (`property`).
   - Sửa tiêu đề ở ngành B và lưu draft.
   - Chuyển ngược lại ngành A: khẳng định phục hồi trọn vẹn tiêu đề và ảnh chính từ native IDB/drafts (không bị inline fallback). Render Canvas 2.

3. **Test 3: Browser Reload State & Restore Assets from Native IDB (Kèm Actual F5)**:
   - Lưu draft ngành `food` với main và background fixture vào `mivy-qc-marketing-v1` và persist vào IDB.
   - Assert các refs có thật trong IDB trước khi kiểm tra controller mới.
   - Kiểm tra khôi phục tức thì metadata và giải mã ảnh thành công. Render Canvas 3.
   - Hỗ trợ thêm bước F5 trình duyệt thật để kiểm tra end-to-end lifecycle.

4. **Test 4: Intentional Clear Image Preservation during Resolve**:
   - Ngành `property` có cả ảnh chính và ảnh nền trong native IDB.
   - Khi đang resolve, người dùng chủ động gỡ ảnh nền (`backgroundImage = ''`).
   - Khẳng định: ảnh nền không bị IDB hồi sinh đè lên, ảnh chính còn lại giải mã thành công sang data URI. Render Canvas 4.

5. **Test 5: Edited Text Preservation with Untouched Image Resolve**:
   - Người dùng sửa tiêu đề mới trong khi ảnh chính đang trong quá trình giải mã từ IDB.
   - Khẳng định: tiêu đề mới được bảo toàn 100%, ảnh chính untouched giải mã thành công sang data URI. Render Canvas 5.

6. **Test 6: Delayed Outgoing Save Timer Settlement & Active Draft Ownership**:
   - Khi chuyển từ A sang B (delay 50ms), kích hoạt `saveState` cho ngành A với delay 100ms.
   - Đợi switch sang B hoàn tất và đợi thêm 150ms để timer của A lắng xuống hoàn toàn.
   - Khẳng định: LocalStorage `mivy-qc-marketing-v1` không bị timer của A ghi đè, duy trì đúng category `property`.
   - Chuyển ngược lại A: khẳng định bản edit mới nhất của A được bảo toàn nguyên vẹn từ drafts. Render Canvas 6.

---

## 4. Dữ Liệu Fixture Độc Lập & Minh Bạch

- **Main Fixture (`createMainFixture`)**: Canvas 400×400 px, nền teal/blue, họa tiết hình khối và nhãn rõ ràng `"MIVY QC FIXTURE · MAIN"`.
- **Background Fixture (`createBgFixture`)**: Canvas 600×800 px, nền gradient tối kèm lưới sọc mờ 40px và nhãn `"MIVY QC FIXTURE · BACKGROUND"`.
- Hoàn toàn tự tạo bằng HTML5 Canvas API trên client, không tải từ URL bên ngoài, 0đ chi phí, độc lập và an toàn tuyệt đối.

---

## 5. Danh Sách Files Thay Đổi

* [`web/src/lib/asset-store.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/asset-store.ts):
  - Export `openAssetDB(dbName)` kèm cơ chế **Self-Healing Schema** tự động nâng version tạo `assets` store nếu DB mở ra bị thiếu store.
* [`web/src/app/studio/marketing/review/persistence/page.tsx`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/app/studio/marketing/review/persistence/page.tsx):
  - Sử dụng `openAssetDB(QC_ASSET_DB)` để triệt tiêu lỗi poison schema.
  - Assert chặt chẽ `failedFields === 0`, `mivy-asset:...` refs và IDB keys thật để loại bỏ 100% false positive.
  - Bổ sung cơ chế F5 trình duyệt thật (`actual F5 reload`) với cờ session không reseed.
  - Thêm chức năng xuất ảnh Canvas PNG từng card và hàng loạt.
  - Kích hoạt `notFound()` khi `process.env.NODE_ENV === 'production'`.
  - Chuẩn hóa module exports theo chuẩn Next.js App Router.
* [`web/src/app/studio/marketing/review/page.tsx`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/app/studio/marketing/review/page.tsx):
  - Thêm thanh liên kết điều hướng sang `/studio/marketing/review/persistence`.
* [`back-end/docs/template-v2/DRAFT_BROWSER_QC_RESULT.md`](file:///Users/minh.nn1/Projects/personal/mivy/back-end/docs/template-v2/DRAFT_BROWSER_QC_RESULT.md):
  - Báo cáo cập nhật kết quả và tài liệu hướng dẫn QC.

---

## 6. Kết Quả Kiểm Tra Kỹ Thuật & Giới Hạn

1. **Static Typing & Unit Tests**:
   - `npx tsc --noEmit`: **PASSED** (Exit code 0, không có lỗi type).
   - `node verify-draft-asset-lifecycle-qc.cjs`: **10/10 tests PASSED 100%**.
   - `node verify-draft-asset-qc.cjs`: **9/9 tests PASSED 100%**.
2. **Tuân Thủ Phạm Vi & Cam Kết**:
   - Giữ nguyên toàn bộ logic của renderer (`industry-renderer.ts`, `catalog-renderer.ts`, `property-edge`).
   - Không chạy lệnh `next build` gây hỏng dev cache đang chạy.
   - Không đụng chạm dữ liệu thật ngoài namespace `mivy-qc-*`.
   - Không sử dụng Claude hoặc bất kỳ API trả phí bên ngoài nào.
   - **Tuyên bố trung thực**: Harness chỉ dùng để kiểm tra tính bền vững của persistence, lifecycle draft và native IndexedDB; hoàn toàn không tự nhận hay tuyên bố đạt tiêu chuẩn thẩm mỹ thương mại của poster.
