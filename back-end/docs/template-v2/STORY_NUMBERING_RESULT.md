# Báo Cáo QC: Khắc Phục Lỗi Trùng Lặp Số Thứ Tự Story (Duplicate Story Display Numbering Repair)

**Ngày thực hiện**: 19/10/2026  
**Môi trường**: Mivy Studio Marketing (`/studio/marketing` & `/studio/marketing/review/story-source`)  
**Mục tiêu**: Xử lý triệt để lỗi hiển thị số thứ tự kép (decorative badge + source prefix) trên các poster Story, bảo toàn 100% dữ liệu thô, cơ chế phân trang cân bằng, tính bất biến của draft và nội dung số có nghĩa (lương, ngày tháng, phần trăm, năm kinh nghiệm).

---

## 1. Hiện Trạng & Bằng Chứng Khuyết Tật (Defect Evidence)

Theo bằng chứng raster thực tế từ đợt kiểm tra `reports/concept-zip-20261015/`:
1. **Concept Story (recruitment-announcement)** (`zip/02-story-p{1..4}of4-4x5.png`):
   - Renderer vẽ số trang trí thương hiệu lớn: `01`, `02`, `03`...
   - Text nội dung đi kèm vẫn giữ nguyên tiền tố thô từ source: `"1. Thiết kế kiến trúc..."`, `"2. Tối ưu hiệu năng..."`, `"10. Trang bị MacBook..."`.
   - Kết quả: Poster hiển thị số kép (ví dụ vừa có số `01` to vừa có `"1. Thiết kế..."` bên dưới).
2. **Legacy Agenda (catalog-renderer)**:
   - Renderer vẽ badge tròn chỉ số trang nội bộ: `1`, `2`...
   - Text nội dung trang 2 lấy từ source details: `"04. Workshop: Đánh giá chất lượng..."`, `"05. Networking..."`.
   - Kết quả: Badge số `1` hiển thị cạnh text `"04. Workshop..."`, gây xung đột thị giác.

---

## 2. Nguyên Tắc Thiết Kế & Giải Pháp Triển Khai (Architecture & Design)

### 2.1. Chuẩn hóa Display-Only (Chỉ xử lý khi render ra Canvas)
- **Không thay đổi dữ liệu gốc**: Toàn bộ `state.copies.story.points`, `state.details`, `state.facts` và output của `resolveStorySource` (`items`, `pageItems`) được giữ nguyên bản 100%. Không làm biến đổi hash, không gây re-render rác và không làm hỏng lưu trữ draft.
- **Bảo toàn cơ chế phân trang**: Phân trang cân bằng `balancedPages` (ví dụ 10 mục thành 4 trang `3/3/2/2`) và trạng thái xóa chủ đích (`pointsEdited: true` với 0 mục) hoạt động độc lập và không bị ảnh hưởng.
- **Đồng bộ tuyệt đối Preview / Export / ZIP**: Cả Preview gắn trên DOM, Tải PNG đơn lẻ và Tải bộ ZIP đều chạy qua cùng một hàm vẽ (`drawIndustryPoster`), đảm bảo độ khớp 0 pixel lệch (0-diff parity).

### 2.2. Helper `stripLeadingEnumeration`
Được định nghĩa tại [`balanced-pages.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/balanced-pages.ts) và re-export qua [`story-source.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/story-source.ts):
```typescript
export function stripLeadingEnumeration(text?: string | null): string {
  if (!text || typeof text !== 'string') return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // 1. Tiền tố bước có nhãn: "Bước 1: ", "CHẶNG 01 - ", "Step 2. ", "Phần 1: "
  const labeledRegex = /^(?:bước|mục|phần|điều|khoản|chặng|bài|tiết|giai\s+đoạn|step|part|item|phase)\s+\d{1,2}(?:\s*[:.)\/:–—-]\s*|\s+)/i;
  const labeledMatch = trimmed.match(labeledRegex);
  if (labeledMatch) {
    const stripped = trimmed.slice(labeledMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  // 2. Số trong ngoặc đơn/ngoặc vuông: "(1) ", "[01] ", "1) ", "01) "
  // Không cắt "(100% remote)" hay "(45 - 65 triệu)"
  const bracketedRegex = /^(?:\(?\d{1,2}\)|\[\d{1,2}\])\s*/;
  const bracketedMatch = trimmed.match(bracketedRegex);
  if (bracketedMatch) {
    const stripped = trimmed.slice(bracketedMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  // 3. Số La Mã hoặc chữ cái kèm dấu: "I. ", "II) ", "iv. ", "A. ", "B) "
  const romanOrLetterRegex = /^(?:[IVXLCDM]+|[ivxlcdm]+|[A-Za-z])[\.\):]\s+/;
  const romanMatch = trimmed.match(romanOrLetterRegex);
  if (romanMatch) {
    const stripped = trimmed.slice(romanMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  // 4. Chữ số kèm ký tự phân cách (1-2 chữ số):
  // Dấu chấm: "1. ", "01. " (không khớp số thập phân "1.5 triệu", "4.5 sao", "15.000.000 VNĐ")
  // Dấu hai chấm: "1: ", "01: " (không khớp mốc giờ "08:30")
  // Dấu gạch ngang: "1 - ", "01 – " (không khớp dải lương "45 - 65 triệu", dải năm "1-2 năm")
  // Dấu gạch chéo: "1/ ", "01/ " (không khớp ngày tháng "15/10/2026", tỷ lệ "24/7", "9.8/10")
  const delimitedRegex = /^\d{1,2}(?:\.(?!\d)\s*|:(?!\s*\d)\s*|\s*[-–—](?!\s*\d)\s*|\/(?!\s*\d)\s*)/;
  const delimitedMatch = trimmed.match(delimitedRegex);
  if (delimitedMatch) {
    const stripped = trimmed.slice(delimitedMatch[0].length).trim();
    if (stripped.length > 0) return stripped;
  }

  return trimmed;
}
```

### 2.3. Các vị trí áp dụng Display Stripping
1. [`industry-renderer.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/industry-renderer.ts):
   - Story Recruitment rail: áp dụng `stripLeadingEnumeration(p)` khi vẽ nội dung bên dưới `numStr` (`01`, `02`...).
   - Launch Hero: áp dụng `stripLeadingEnumeration(p)` khi vẽ nội dung cạnh badge số `0${i + 1}`.
2. [`catalog-renderer.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/catalog-renderer.ts):
   - Danh sách điểm (Agenda / Catalog): áp dụng `stripLeadingEnumeration(p)` trước khi ngắt dòng vẽ cạnh badge tròn `String(i + 1)`.
3. [`design-engine.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/design-engine.ts):
   - `drawRecruitmentStory`, `drawEducationPoster`, `drawServicePoster`, `drawGeneralModernPoster`, `drawPhotoFullDetailPoster`, `drawPhotoActionPoster`: áp dụng `stripLeadingEnumeration` trước khi đưa vào `posterText` hoặc tách mảng từ `split(/\s+/)`.

---

## 3. Danh Sách Tệp Thay Đổi (Files Changed)

| Tệp | Thay đổi |
|---|---|
| [`web/src/lib/balanced-pages.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/balanced-pages.ts) | Cài đặt và export `stripLeadingEnumeration`; gắn vào `BalancedPagesFn`. |
| [`web/src/lib/story-source.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/story-source.ts) | Re-export `stripLeadingEnumeration`. |
| [`web/src/lib/industry-renderer.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/industry-renderer.ts) | Sử dụng `stripLeadingEnumeration` cho recruitment story rail và launch hero. |
| [`web/src/lib/catalog-renderer.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/catalog-renderer.ts) | Sử dụng `stripLeadingEnumeration` cho catalog/agenda point text. |
| [`web/src/lib/design-engine.ts`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/lib/design-engine.ts) | Sử dụng `stripLeadingEnumeration` cho các template poster có badge số. |
| [`web/src/app/studio/marketing/page.tsx`](file:///Users/minh.nn1/Projects/personal/mivy/web/src/app/studio/marketing/page.tsx) | Bổ sung style chuẩn hóa typography (`WebkitFontSmoothing`, `textRendering`) trên canvas preview DOM để đảm bảo parity đồng bộ. |
| [`web/verify-story-numbering-qc.cjs`](file:///Users/minh.nn1/Projects/personal/mivy/web/verify-story-numbering-qc.cjs) | Bộ kiểm thử tập trung độc lập xác thực tính chính xác của numbering, bảo toàn nội dung số và kiểm tra canvas render. |

---

## 4. Kết Quả Kiểm Thử Tập Trung (Focused Test Results)

### 4.1. `node verify-story-numbering-qc.cjs` (7/7 PASS 100%)
```text
=== RUNNING STORY NUMBERING & DISPLAY PARITY QC ===

--- Test 1: stripLeadingEnumeration unit cases (Numbered formats) ---
✓ Passed: 32 numbered formats correctly stripped of enumeration prefix

--- Test 2: Protected meaningful numeric content (Must NOT strip) ---
✓ Passed: 20 meaningful numeric formats preserved without stripping

--- Test 3: Mixed numbered with numeric values & un-numbered content ---
✓ Passed: 12 mixed & un-numbered cases verified

--- Test 4: Concept Story Renderer 10 items (recruitment-announcement) ---
✓ Passed: Concept story 10 items across 4 balanced pages verified without double enumeration

--- Test 5: Legacy Agenda Renderer (catalog-renderer) ---
✓ Passed: Legacy agenda 5 items across 2 pages verified without double enumeration

--- Test 6: Source Resolver & Draft Immutability ---
✓ Passed: Raw source resolver, draft immutability, balanced pagination, and intentional empty verified

--- Test 7: Export Parity (Preview canvas vs Offscreen export canvas) ---
✓ Passed: Preview, Single Export, and ZIP Export canvases produce 100% identical text sequences

=== ALL 7 STORY NUMBERING & DISPLAY PARITY QC TESTS PASSED 100%! ===
```

### 4.2. `node verify-font-parity-qc.cjs` (8/8 PASS 100%)
```text
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

### 4.3. `npx tsc --noEmit`
- **Kết quả**: Exit code 0, không có bất kỳ lỗi biên dịch TypeScript nào.

---

## 5. Giới Hạn & Bước Kế Tiếp (Limitations & Codex Verification)

- **Phạm vi hoàn thành**: Đã khắc phục triệt để hiện tượng đánh số thứ tự kép ở tầng render canvas cho cả concept mới và template legacy, đồng thời bảo đảm nội dung số có nghĩa không bị cắt gọt sai lệch.
- **Không tự ý xác nhận thẩm mỹ**: Việc đánh giá thẩm mỹ raster và so khớp pixel trên trình duyệt thực tế đối với các file PNG tải về từ ZIP/Preview thuộc thẩm quyền nghiệm thu độc lập của Codex.
