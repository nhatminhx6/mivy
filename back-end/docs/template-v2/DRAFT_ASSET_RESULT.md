# Draft Asset Persistence Repair Result

## 1. Files Changed
* `web/src/lib/asset-store.ts` (mới):
  - Durable Asset Store sử dụng IndexedDB (`mivy-assets-v1`) và in-memory fallback.
  - Quản lý asset references nhẹ (`mivy-asset:<time>_<rand>`) cho data URI / Blobs.
  - Hàm `persistStateAssets`: persist dữ liệu ảnh thô độc lập trước khi metadata tham chiếu; nếu lưu thất bại giữ nguyên ảnh in-memory, ghi nhận lỗi rõ ràng, không xóa rỗng ảnh.
  - Hàm `resolveStateAssets`: bất đồng bộ giải mã asset reference thành data URI.
* `web/src/lib/industry-drafts.ts` (cập nhật):
  - Áp dụng kiến trúc hai lớp độc lập (Two-Tier Persistence): Metadata Layer trong Storage + Asset Layer trong Asset Store.
  - Bảo toàn 100% asset references (`mivy-asset:...`), HTTP/relative URLs, và tiny data URIs; không xóa mù quáng data URIs.
  - Khôi phục mẫu mặc định từ `CATEGORY_SAMPLES` khi ngành mục tiêu chưa từng có bản nháp.
  - Cung cấp `switchIndustry` (đồng bộ metadata) và `switchIndustryAsync` (đồng bộ metadata + asset persist/resolve).
* `web/src/app/studio/marketing/page.tsx` (cập nhật):
  - Khôi phục sau Reload (F5): Nạp metadata tức thì trong `useEffect`, sau đó bất đồng bộ giải mã asset references để khôi phục cả main và background image.
  - `saveState`: Cập nhật React state ngay lập tức; debounced persist asset vào IndexedDB và commit metadata nhẹ vào `mivy-marketing-v1` và `saveIndustryDraft`.
  - `changeCategory`: Bảo toàn asset ngành hiện tại trước khi chuyển; chuyển đổi metadata sang ngành mới ngay tức thì; bất đồng bộ giải mã asset ngành mới với **Stale-Request Guard** (`activeSwitchTokenRef`) chống tình trạng chuyển ngành nhanh làm ảnh cũ đè lên ngành mới.
  - Bảo toàn thao tác gỡ ảnh có chủ đích (Intentional Removal) cho cả main image và background image.
* `web/verify-draft-asset-qc.cjs` (mới):
  - Bộ kiểm thử tự động 9 test cases chạy trên isolated mock storage và custom asset driver, không chạm vào localStorage bản nháp thật của anh.

---

## 2. Test Thực Chạy & Kết Quả
Đã thực thi kiểm thử tự động tại `web/verify-draft-asset-qc.cjs` (Command: `node verify-draft-asset-qc.cjs`):
* **Test 1 (Tiny + Large Data URIs)**: PASSED. Cả 1x1 data URI và 120KB data URI đều persist và resolve khớp chính xác 100% dữ liệu gốc.
* **Test 2 (Separate Main / Background Roles)**: PASSED. Main image và background image được cấp 2 asset refs độc lập; resolve trả về đúng role; bảo toàn crop/fit/pan/zoom/dim/blur.
* **Test 3 (Switching A → B → A)**: PASSED. Ngành A (`recruitment`) có cả 2 layer ảnh và custom edits; chuyển sang B (`property`) nhận clean/sample B; chuyển lại A khôi phục 100% cả 2 layer ảnh và toàn bộ thông số của A.
* **Test 4 (Reload Persistence F5 Simulation)**: PASSED. Lưu metadata với asset refs, giả lập reload đọc lại và resolve khôi phục đầy đủ cả 2 layer ảnh.
* **Test 5 (Rapid Switching Stale-Request Guard)**: PASSED. Chuyển nhanh A → B → C; request B hoàn thành trễ hơn bị stale token guard hủy bỏ an toàn, không đè lên C.
* **Test 6 (User Intentional Removal)**: PASSED. Khi người dùng bấm gỡ ảnh, metadata lưu rỗng; chuyển A → B → A hoặc reload không tự hồi sinh ảnh cũ.
* **Test 7 (Quota/Denied Storage Non-destructive Failure)**: PASSED. Khi Asset Store ném lỗi QuotaExceeded hoặc PermissionDenied, ảnh trong bộ nhớ in-memory KHÔNG bị xóa thành rỗng, không crash app, metadata text vẫn lưu bình thường.
* **Test 8 (Legacy Inline Drafts Support)**: PASSED. Bản nháp cũ có sẵn inline data URI chưa migrate được giữ nguyên vẹn, không bị xóa mất.
* **Test 9 (HTTP URLs as Lightweight References)**: PASSED. Ảnh nền HTTP/relative không bị ghi thừa vào IndexedDB, giữ nguyên URL tham chiếu.

Kiểm tra biên dịch TypeScript:
* Command: `npx tsc --noEmit` tại `web/`
* Kết quả: Exit code 0, không có lỗi cú pháp hay type error.

---

## 3. Giới Hạn & Tuân Thủ Phạm Vi
* Không sửa đổi renderer (`catalog-renderer.ts`, `industry-renderer.ts`) hay `property-edge`.
* Không chạy production build vào `.next` đang chạy dev.
* Không sử dụng API trả phí bên ngoài.
* Không chạm vào hoặc ghi đè localStorage bản nháp thật của anh.
* Không tự đánh giá hay tự nhận đạt tính thẩm mỹ của poster (theo quy định).
