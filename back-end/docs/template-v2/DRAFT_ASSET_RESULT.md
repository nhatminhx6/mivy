# Draft Asset Persistence Repair Result (Revision 2026-10-08 03:59 UTC)

## 1. Summary of Issues Addressed

### A. Đợt Sửa Lỗi Outgoing Save Timer Stale Write (2026-10-08 03:59 UTC)
1. **Nguyên Nhân Ghi Nhận Tại `reports/outgoing-save-review-20261008.json`**:
   - Khi chuyển ngành A→B (`changeCategory('property', 50)`), trong lúc outgoing persist của A đang pending await (50ms), người dùng gọi `saveState({ name: 'Latest edit' }, 100)`.
   - `saveState` tạo ra một `saveTimer` mới với delay 100ms.
   - Khi `changeCategory` hoàn tất bước 5 (chuyển sang B, ghi `property` vào `mivy-marketing-v1`), `saveTimer` cũ 100ms vẫn sống sót. Sau 100ms, timer callback thức dậy và ghi đè `recruitment` vào `mivy-marketing-v1` trên storage.
   - Hậu quả: UI hiển thị ngành B (`property`), nhưng `mivy-marketing-v1` trên disk lại là `recruitment`, khiến reload trang mở sai ngành.

2. **Giải Pháp Phòng Thủ Kép (Transition Commit Invalidation & Active Category Ownership)**:
   - **Phòng thủ 1 (Transition Commit Invalidation)**: Trong `changeCategory`, ngay tại thời điểm commit transition (ngay trước khi chuyển sang `nextMeta`), controller lập tức hủy bỏ và vô hiệu hóa toàn bộ save timers tạo trong lúc outgoing persist:
     ```ts
     if (this.saveTimer) {
       clearTimeout(this.saveTimer);
       this.saveTimer = null;
     }
     this.activeSaveSeq++;
     ```
   - **Phòng thủ 2 (Active Category Ownership Guard)**: Trong `saveState`, cả ở bước ghi nhanh metadata đồng bộ và bước debounced commit bất đồng bộ, controller kiểm tra quyền sở hữu active category:
     ```ts
     const currentActiveCat = currentActive.categoryId || (currentActive.industry === 'general' ? 'retail' : currentActive.industry);
     const saveCat = newState.categoryId || (newState.industry === 'general' ? 'retail' : newState.industry);
     if (currentActiveCat === saveCat) {
       this.storage?.setItem(this.storageKey, JSON.stringify(persistedState));
     }
     ```
     Nếu controller không còn ở ngành của bản save đó nữa, tuyệt đối không được ghi vào main active key (`mivy-marketing-v1`).
   - Cả bản edit mới nhất của ngành cũ (`inMemoryDrafts` và `saveIndustryDraft`) và target edits/untouched images của ngành mới đều được bảo toàn trọn vẹn 100%.

3. **Mở Rộng Test 9 (Để Timer Settle trong B & Assert Main Storage Category B)**:
   - Trong `verify-draft-asset-lifecycle-qc.cjs`, Test 9 được cấu hình:
     - `saveState` có delay 100ms trong lúc `changeCategory('property', 50)` đang await.
     - Sau khi switch sang property hoàn tất, test đợi 150ms để timer 100ms hoàn toàn settle trong khi B vẫn đang active (không gọi dispose hay switch back sớm).
     - Khẳng định: `persistedMain.categoryId === 'property'` (kiểm tra disk active draft không bị recruitment đè bẹp).
     - Khẳng định: `controller.getState().image` giải mã thành công thành data URI.
     - Sau đó switch quay lại recruitment: khẳng định `name === 'Latest edit'` được khôi phục trọn vẹn.

---

## 2. Files Changed
* `web/src/lib/draft-controller.ts`:
  - `saveState`: kiểm tra `currentActiveCat === saveCat` trước mọi lần ghi vào `this.storageKey` (ở cả fast sync save và debounced commit).
  - `changeCategory`: hủy `this.saveTimer` và tăng `this.activeSaveSeq++` tại thời điểm transition commit trước khi ghi `nextMeta`.
* `web/src/lib/asset-store.ts`:
  - So sánh equality `existingData === dataUri` trước khi tái sử dụng cache, phân tán FNV-1a kép chuẩn ASCII.
* `web/verify-draft-asset-lifecycle-qc.cjs`:
  - Mở rộng **Test 9**: đợi pending timer settle trong B (150ms), assert `mivy-marketing-v1` duy trì đúng `property`, assert untouched target image resolve, rồi switch về `recruitment` kiểm tra khôi phục `Latest edit`.
  - Giữ nguyên **Test 10**: cache equality comparison on candidate data.
* `web/src/app/studio/marketing/page.tsx`:
  - Giữ nguyên tích hợp production controller, brandKit sync và dispose. Không chạm renderer canvas.

---

## 3. Test Thực Chạy & Kết Quả

### Bộ Test 1: Production DraftController Lifecycle & Identity QC (`node verify-draft-asset-lifecycle-qc.cjs`)
1. **Test 1 (Full-content identity differ at index 101)**: PASSED.
2. **Test 2 (Store-scoped cache without manual clear)**: PASSED.
3. **Test 3 (Pre-existing stale disk draft vs newer in-memory draft on quota A→B→A)**: PASSED.
4. **Test 4 (Untouched image resolves while text edited + 1 image cleared)**: PASSED.
5. **Test 5 (Synchronized BrandKit state owner)**: PASSED.
6. **Test 6 (Lifecycle Dispose & Unmount Cancellation)**: PASSED.
7. **Test 7 (save→switch race condition)**: PASSED.
8. **Test 8 (IDB transaction error handling)**: PASSED.
9. **Test 9 (Outgoing save timer settlement & main storage ownership)**: PASSED. Timer 100ms của edit ngành cũ thức dậy khi B active bị vô hiệu hóa hoàn toàn, `mivy-marketing-v1` duy trì `property`, untouched target image resolve thành công, switch back khôi phục trọn vẹn `Latest edit`.
10. **Test 10 (Cache equality comparison prevents collision reuse)**: PASSED.

**Kết quả: 10/10 tests PASSED 100% trên production controller thật.**

### Bộ Test 2: Base Asset Store QC (`node verify-draft-asset-qc.cjs`)
* **9/9 tests PASSED 100%**.

### TypeScript Compilation:
* `npx tsc --noEmit` tại `web/`: PASSED (exit code 0, không có lỗi type error).

---

## 4. Báo Cáo Giới Hạn & Tuân Thủ Phạm Vi Thực Tế
* **Driver Testing vs Native IDB (Báo cáo trung thực)**:
  - Toàn bộ suite kiểm thử tự động trong Node/CLI sandbox sử dụng `AssetStoreDriver` (mock driver).
  - Test 8 kiểm tra nhánh reject khi transaction gặp lỗi, **không phải** native IndexedDB transaction abort-after-request-success trên trình duyệt thực tế.
  - Kiểm thử native IDB vòng tròn trên trình duyệt thực tế (port 3009) vẫn là một hạng mục mở cần chạy trực tiếp trên browser.
* **Phạm vi an toàn**:
  - Không can thiệp vào renderer canvas (`catalog-renderer.ts`, `industry-renderer.ts`) hay `property-edge`.
  - Giữ nguyên vẹn 100% thay đổi của anh và agent khác (`brandKit`, `logoImg`, `loadBrand`, `studio/logo`, icons, backgrounds).
  - Không chạy `next build` đè vào dev server `.next` đang chạy.
  - Không sử dụng Claude hoặc API tính phí bên ngoài.
  - Không chạm vào hay ghi đè `localStorage` thật của anh.
  - Không tự nhận đạt tính thẩm mỹ của poster.
