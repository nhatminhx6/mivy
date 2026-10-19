# Báo Cáo QC: Khắc Phục Lỗi Kiểm Thử Test 8 & Xác Nhận Parity R2 (Oct 15 2026)

## 1. Hiện Trạng & Bằng Chứng Parity Trình Duyệt Thực Tế (R2 Baseline)
- **Bằng chứng độc lập mới nhất**: Thư mục `back-end/docs/template-v2/reports/attached-preview-r2-20261015/` ghi nhận kết quả so sánh pixel giải mã thực tế:
  ```json
  {
    "previewExport": 0,
    "exportZip": 0,
    "totalPixels": 1458000,
    "tests": "FAIL test8 line483",
    "scope": "legacy VI4:5 page2 existing profile"
  }
  ```
  - **Attached Preview vs Detached Export**: **0 pixel lệch** trên `1,458,000` pixel (100% khớp bit-for-bit).
  - **Detached Export vs Pack ZIP**: **0 pixel lệch** trên `1,458,000` pixel.
  - Cả 3 nguồn (Preview gắn trên DOM, Export PNG đơn lẻ, và file PNG trích xuất từ ZIP) đạt trạng thái đồng bộ tuyệt đối trên kịch bản legacy VI 4:5.

---

## 2. Nguyên Nhân Lỗi Kiểm Thử (Root Cause of Test Failure)
- **Triệu chứng**: Chạy `node verify-font-parity-qc.cjs` thất bại tại Test 8 dòng 483:
  ```
  AssertionError [ERR_ASSERTION]: drawIndustryPosterCore must call normalizeCanvasContext(ctx, canvas)
  ```
- **Nguyên nhân kỹ thuật**:
  - Test 8 trước đó sử dụng cơ chế cắt chuỗi tùy ý: `designEngine.slice(coreIdx, coreIdx + 600)`.
  - Nhánh concurrent supersampling gần đây đã bổ sung tham số `scale: number = 1`, biến tính toán `const S = Math.max(1, Math.min(4, scale));`, và logic nhân tỉ lệ canvas, đẩy dòng lệnh gọi `normalizeCanvasContext(ctx, canvas)` tại dòng 2164 ra vị trí offset ký tự thứ 602 (vượt quá giới hạn cứng 600 ký tự).
  - Đây là lỗi do kiểm thử giòn (brittle test slice), trong khi code thực tế vẫn gọi `normalizeCanvasContext(ctx, canvas)` đầy đủ và chính xác ngay trước khi dispatch render.

---

## 3. Khắc Phục Bằng Phân Tích AST (Function-Level AST Validation)
- **Nguyên tắc**: Giữ nguyên 100% code sản xuất và nhánh supersampling hiện tại (0 thay đổi file production).
- **Giải pháp**: Thay thế đoạn cắt chuỗi bằng bộ phân tích cú pháp TypeScript AST chuẩn (`ts.createSourceFile`):
  1. Duyệt AST để tìm định nghĩa hàm `drawIndustryPosterCore`.
  2. Quét toàn bộ `CallExpression` bên trong thân hàm `drawIndustryPosterCore`:
     - Kiểm tra sự hiện diện của lệnh gọi `normalizeCanvasContext` với 2 đối số chính xác là `(ctx, canvas)`.
     - Xác định vị trí ký tự của lệnh gọi chuẩn hóa (`normalizeCallPos`).
     - Xác định vị trí ký tự của lệnh dispatch đầu tiên (`drawIndustryConcept` hoặc `drawCatalogPoster` - `firstDispatchPos`).
  3. Khẳng định điều kiện bất biến: `normalizeCallPos < firstDispatchPos` (bảo đảm hàm chuẩn hóa ngữ cảnh luôn chạy trước bất kỳ lệnh dispatch render nào).
  4. Bổ sung kiểm chứng bằng chứng baseline R2 (`attached-preview-r2-20261015/qc.json`) với `previewExport === 0` và `exportZip === 0`.

---

## 4. Danh Sách Tệp Thay Đổi (Files Changed)
- `web/verify-font-parity-qc.cjs`: Nâng cấp Test 8 sang kiểm tra cấp hàm qua TypeScript AST và bổ sung xác minh baseline R2.
- `back-end/docs/template-v2/STORY_PARITY_TEST_RESULT.md`: Tài liệu báo cáo kết quả kiểm thử.
*(Không có tệp production nào bị thay đổi)*.

---

## 5. Kết Quả Kiểm Thử Tập Trung (Exact Test Verification)
- **`node verify-font-parity-qc.cjs`**: **8/8 tests PASS (100%)**
  ```
  === RUNNING MIVY FONT PARITY & READINESS QC ===

  --- Test 1: Multi-word font family extraction without truncation ---
  ✓ Passed: All multi-word font family names extract without truncation

  --- Test 2: ensurePosterFontsReady font face and weight requests ---
  ✓ Passed: ensurePosterFontsReady requests all families (including multi-word), weights 400..900, all unicode subsets, and actual glyphs

  --- Test 3: Production marketing/page.tsx font readiness and export parity wiring ---
  ✓ Passed: marketing/page.tsx correctly wired with snapshot before async, loadingdone re-render, and modal export parity

  --- Test 4: Review story-source/page.tsx font readiness & offscreen canvas parity ---
  ✓ Passed: story-source/page.tsx correctly wired across preview, downloadPagePng, and downloadScenarioZip using identical offscreen canvas

  --- Test 5: Decoded pixel verification of pre-repair browser evidence & 20261014 QC ---
  ✓ Confirmed R2 evidence baseline: detached single PNG versus ZIP equals exactly 0 / 1458000 differing pixels

  --- Test 6: collectGlyphsFromState extraction coverage ---
  ✓ Passed: collectGlyphsFromState correctly collects all characters including compound Vietnamese diacritics and special punctuation

  --- Test 7: Dev-only attached preview capture control in story-source/page.tsx ---
  ✓ Passed: Dev-only attached preview capture directly serializes canvas ref without redraw, font await, or replacement canvas, disabled until ready

  --- Test 8: Attached preview vs detached export typography normalization ---
  ✓ Confirmed R2 browser evidence: attached preview vs export vs ZIP all equal 0 / 1458000 differing pixels
  ✓ Passed: Dual-level typography normalization (CSS + Context2D: subpixel-antialiased, geometricPrecision, normal kerning), AST execution order, and Oct 14/15 baselines verified

  === ALL 8 FONT PARITY & PREVIEW CAPTURE QC TESTS PASSED 100%! ===
  ```
- **`node verify-story-source-qc.cjs`**: **10/10 tests PASS (100%)**.

---

## 6. Giới Hạn Còn Lại & Xác Nhận Độc Lập
- Kịch bản legacy VI 4:5 đã được xác nhận 0 pixel lệch độc lập ở đợt R2.
- Các kịch bản mở rộng khác (concept balanced, intentional empty clear) trên trình duyệt thực tế tiếp tục do Codex độc lập thực hiện; không tuyên bố nghiệm thu toàn diện chỉ dựa trên bộ unit test này.
