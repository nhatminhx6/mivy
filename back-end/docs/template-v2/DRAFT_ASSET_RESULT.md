# Draft Asset Persistence Repair Result (Final Revision Review)

## 1. Summary of 6 Blocking Paths Addressed (Revision 2026-10-07 14:45 UTC)

1. **Lỗi 1 (save→switch race condition)**:
   - Trong `changeCategory`, ngay khi bắt đầu chuyển ngành: lập tức `clearTimeout(this.saveTimer)` và tăng `activeSaveSeq++`.
   - Bất kỳ debounced save nào của ngành cũ đang chờ hoặc in-flight đều bị hủy bỏ ngay lập tức, không thể ghi đè metadata của ngành cũ vào `mivy-marketing-v1` sau khi ngành mới đã active.

2. **Lỗi 2 (edit→switch restore race & revision ownership)**:
   - Trong `saveState`: mỗi lần user edit hoặc xóa ảnh, lập tức tăng `activeSwitchToken++`.
   - Khi `resolveStateAssets` của switch ngành hoàn tất: thực hiện **merge thông minh**, chỉ gán resolved asset vào trường ảnh nếu trường ảnh đó chưa bị user gỡ hoặc sửa (`activeCurrent[field] === nextMeta[field]`).
   - Mọi thao tác edit text và gỡ ảnh có chủ đích (`image: ''`, `backgroundImage: ''`) của user trong lúc resolve đang in-flight được bảo toàn 100%, không bị đè bẹp.

3. **Lỗi 3 (quota khi switch làm mất bản chưa lưu)**:
   - Xây dựng cơ chế **Recoverable In-Memory Per-Category Drafts** (`this.inMemoryDrafts`): bản nháp của ngành cũ luôn được lưu trọn vẹn vào bộ nhớ in-memory trước khi switch.
   - Khi `saveIndustryDraft` trả về `false` (LocalStorage bị lỗi quota):
     - Visibly surface failure qua `setStatusText`: thông báo rõ ràng cho người dùng bộ nhớ trình duyệt đã đầy.
     - Khi user chuyển quay lại ngành cũ trong phiên đó: `changeCategory` khôi phục trọn vẹn dữ liệu từ `inMemoryDrafts`, bảo toàn 100% công sức của user dù LocalStorage bị chặn/đầy.

4. **Lỗi 4 (text edit khiến ảnh initial restore không giải mã)**:
   - Trong `loadInitialDraft`: khi `resolveStateAssets` hoàn tất, không còn logic abort mù quáng khi có text edit.
   - Thực hiện merge trường ảnh: chỉ cập nhật `resolved[field]` nếu trường ảnh trong state hiện tại vẫn đang giữ đúng ref gốc (`cur[field] === parsed[field]`).
   - Text edits người dùng vừa nhập được giữ nguyên vẹn 100%, và ảnh vẫn được giải mã thành data URI thành công lên canvas.

5. **Lỗi 5 (IDB transaction commit & no implicit memory-only success)**:
   - Trong `saveAsset`: `tx.oncomplete` là điểm duy nhất resolve `id`, đảm bảo dữ liệu thực sự đã commit vào cơ sở dữ liệu. Mọi lỗi hoặc `tx.onabort` sau request success đều reject Promise đúng chuẩn.
   - Loại bỏ hoàn toàn fallback in-memory giả vờ thành công bền vững khi IndexedDB không khả dụng; surface error để `persistStateAssets` giữ nguyên data URI in-memory và báo lỗi rõ ràng.

6. **Lỗi 6 (Tránh nhân bản asset mỗi lần sửa chữ)**:
   - Bổ sung `immutableAssetCache` và `computeContentHash` trong `asset-store.ts`.
   - Khi cùng một raw data URI được gửi vào persist nhiều lần (do user sửa text), `saveAsset` tái sử dụng ngay asset ref đã commit trước đó, không ghi thêm bản ghi mới vào IndexedDB.
   - Chỉ ghi cache khi transaction đã commit thành công (`tx.oncomplete`).

7. **Shared Production Controller**:
   - Trích xuất toàn bộ state machine và lifecycle logic thành `DraftController` tại [`web/src/lib/draft-controller.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/draft-controller.ts).
   - `page.tsx` sử dụng trực tiếp production controller này.
   - Bộ kiểm thử lifecycle chạy trực tiếp trên instance của `DraftController`, không dùng logic copy mô phỏng.

---

## 2. Files Changed
* `web/src/lib/asset-store.ts`:
  - `saveAsset`: Resolve chỉ trên `tx.oncomplete`, reject trên `tx.onabort`/`tx.onerror`.
  - Loại bỏ silent memory fallback giả thành công bền vững.
  - Tích hợp `immutableAssetCache` chống nhân bản asset khi sửa chữ.
* `web/src/lib/draft-controller.ts` *(Mới)*:
  - Shared production controller quản lý toàn bộ vòng đời persistence, race conditions, debounced saves và out-of-order switches.
* `web/src/lib/industry-drafts.ts`:
  - `createDefaultIndustryState`: trả về clean defaults rỗng, không chèn samples vào campaign mới.
  - `saveIndustryDraft`: bảo toàn dữ liệu storage cũ khi gặp lỗi quota, trả về boolean status.
* `web/src/app/studio/marketing/page.tsx`:
  - Ủy quyền toàn bộ persistence và category switching cho `DraftController`.
  - Giữ nguyên 100% các tích hợp `brandKit`, `loadBrand()`, và renderer với `logoImg`.
* `web/verify-draft-asset-lifecycle-qc.cjs`:
  - Viết lại toàn bộ 6 test cases chạy trực tiếp trên instance của production `DraftController`.
* `web/verify-draft-asset-qc.cjs`:
  - Bộ kiểm thử cơ sở 9 ca kiểm thử persistence và asset store.

---

## 3. Test Thực Chạy & Kết Quả

### Bộ Test 1: Production DraftController Lifecycle (`node verify-draft-asset-lifecycle-qc.cjs`)
* **Test 1 (Đường 1 — save→switch race)**: PASSED. Switch sang B lập tức hủy save in-flight của A, B sở hữu storage và state, reload không mở nhầm A.
* **Test 2 (Đường 2 — edit→switch restore race)**: PASSED. Sửa tiêu đề và gỡ ảnh nền trong lúc target assets đang resolve; khi resolve hoàn tất, tiêu đề và trạng thái gỡ ảnh của user được bảo toàn 100%.
* **Test 3 (Đường 3 — Quota error during switch)**: PASSED. Khi storage ném QuotaExceededError, failure được thông báo tới user, bản nháp A được bảo vệ qua in-memory fallback và khôi phục trọn vẹn khi switch lại A.
* **Test 4 (Đường 4 — Text edit during initial restore)**: PASSED. User gõ tiêu đề mới trong lúc mount; tiêu đề mới được giữ VÀ ảnh vẫn được giải mã thành công vào state.
* **Test 5 (Đường 5 — IDB transaction failure & no fake durability)**: PASSED. Transaction abort reject đúng chuẩn, không giả thành công, dữ liệu raw được giữ in-memory.
* **Test 6 (Đường 6 — Asset deduplication cache)**: PASSED. Sửa text 5 lần với cùng ảnh; số lượng bản ghi ghi vào database giữ nguyên là 1, tái sử dụng asset ref an toàn.
* **Kết quả: 6/6 tests PASSED 100% trên production controller thật.**

### Bộ Test 2: Asset Store & Persistence Suite (`node verify-draft-asset-qc.cjs`)
* **Test 1 đến Test 9**: PASSED 100%.

### TypeScript Compilation:
* `npx tsc --noEmit` tại `web/`: Exit code 0, không có lỗi type error nào.

---

## 4. Giới Hạn & Tuân Thủ Phạm Vi
* Không can thiệp vào renderer (`catalog-renderer.ts`, `industry-renderer.ts`) hay `property-edge`.
* Giữ nguyên vẹn mọi thay đổi của agent khác (`brandKit`, `logoImg`, `loadBrand`, `studio/logo`, `@phosphor-icons/react`).
* Không chạy `next build` / production build đè vào `.next` đang chạy dev.
* Không sử dụng API tính phí bên ngoài hay Claude.
* Không chạm vào hoặc ghi đè localStorage bản nháp thật của anh.
* **Limitation về Browser IDB**: Trong môi trường Node/CLI sandbox không có sẵn DOM/headless browser nên automated tests sử dụng `AssetStoreDriver` (mock driver với full transaction completion, latency, và aborts). Khi chạy trên browser thật (port 3009), `openDB` gọi trực tiếp `window.indexedDB` (`mivy-assets-v1`) với transaction `tx.oncomplete`.
* Không tự đánh giá hay tự nhận đạt tính thẩm mỹ của poster.
