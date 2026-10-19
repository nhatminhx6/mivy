# Báo Cáo QC: Phân Tích & Khắc Phục Lệch Pixel Giữa Attached Preview Canvas & Detached Export (Oct 15 2026 - Đợt 2)

## 1. Hiện Trạng & Bằng Chứng Trình Duyệt Mới Nhất (Oct 15 09:58 Local Baseline)
- **Bằng chứng độc lập**: Thư mục `back-end/docs/template-v2/reports/attached-preview-20261015/` chứa:
  - `preview.png`: Chụp trực tiếp từ ref `<canvas>` đang gắn trên DOM (nút QC "Chụp preview DOM", không vẽ lại, không nạp lại font).
  - `export.png`: Xuất qua thẻ canvas offscreen độc lập (`document.createElement('canvas')`).
  - `pack.zip`: Gói ZIP chứa các file export poster.
  - `qc.json`: Kết quả so sánh raster thực tế:
    ```json
    {
      "previewExport": 20926,
      "exportZip": 0,
      "totalPixels": 1458000,
      "tests": "8/8",
      "scope": "legacy VI4:5 page2 existing browser profile"
    }
    ```
- **Tiến triển**:
  - `exportZip: 0`: Parity giữa bản xuất đơn lẻ và gói ZIP duy trì tuyệt đối **0 pixel lệch** trên `1,458,000` pixels (khớp bit-for-bit).
  - `previewExport`: Giảm từ `37,107` xuống `20,926` pixel (cải thiện ~16,181 pixel sau đợt chuẩn hóa `letter-spacing: normal`).
  - Tuy nhiên, mức chênh lệch `20,926 / 1,458,000` (1.43%) vẫn chưa đạt chuẩn 0 diffs.

---

## 2. Phân Tích Chi Tiết 20,926 Pixel Còn Lại & Context Properties

### 2.1 Không thể quy kết 100% nguyên nhân cho công thức độ rộng gần đúng
- Ở đợt sửa trước, công thức co cụm horizontal width `Delta W ≈ -0.006 * fs * chars` đã giải thích và triệt tiêu được hiện tượng dãn/co ngang của các dòng chữ (~16,181 diffs).
- Đo đạc thực tế trên `20261015`:
  - Độ rộng dòng Item 4: Preview `683px` vs Export `683px` (bằng nhau tuyệt đối).
  - Tâm tọa độ (Center of Mass) của từng ký tự:
    - Ký tự 'A' (Headline): $dX = 0.0032\text{px}, dY = 0.0974\text{px}$.
    - Ký tự '6' (Headline): $dX = 0.0948\text{px}, dY = -0.0655\text{px}$.
  - Không còn hiện tượng lệch vị trí, trượt layout, hay co giãn từ toán học độ rộng.

### 2.2 Phân bố 6 vùng pixel lệch thực tế
Toàn bộ 20,926 pixel lệch còn lại nằm đúng 100% tại 6 dải văn bản:
1. **Brand** (`Y=70..89`): 1,877 pixel lệch (phạm vi $X=71..389$).
2. **Headline** (`Y=175..242`): 4,501 pixel lệch (phạm vi $X=72..746$).
3. **Subline** (`Y=486..513`): 2,714 pixel lệch (phạm vi $X=71..489$).
4. **Item 4** (`Y=768..800`): 4,014 pixel lệch (phạm vi $X=88..752$).
5. **Item 5** (`Y=1017..1049`): 3,615 pixel lệch (phạm vi $X=85..683$).
6. **CTA / Offer** (`Y=1225..1257`): 4,205 pixel lệch (phạm vi $X=105..903$).
*Tổng cộng*: $1,877 + 4,501 + 2,714 + 4,014 + 3,615 + 4,205 = 20,926$ pixel.
Các vùng nền, viền bento, mảng màu, hình tròn số thứ tự: **khớp đúng 0 pixel lệch**.

### 2.3 Phân tích giá trị màu & độ đậm nét của nét chữ (Stroke Thickness & Coverage)
- **Lõi nét chữ (Solid core)**: Tại các tọa độ $X=107..120$ của nét chữ 'A', giá trị RGB giữa Preview và Export là `[48, 36, 83]` — **giống nhau 100%**.
- **Màu nền (Background)**: Tại $X \le 105$ và $X \ge 123$, giá trị RGB là `[238, 234, 255]` — **giống nhau 100%**.
- **Viền răng cưa (Anti-aliased edge)**: Độ lệch tập trung duy nhất ở 1 lớp pixel bán trong suốt bao quanh nét chữ:
  - Ví dụ tại cạnh trái nét chữ ($X=106$): Preview độ che phủ $20.4\%$ (`[199, 194, 220]`) trong khi Export độ che phủ $47.0\%$ (`[149, 141, 174]`).
  - Tại cạnh phải nét chữ ($X=121$): Preview độ che phủ $38.9\%$ (`[164, 157, 188]`) trong khi Export độ che phủ $88.9\%$ (`[69, 58, 102]`).
- **Tổng độ che phủ nét chữ (Stroke coverage)** trên Preview luôn mỏng hơn Export từ 5% đến 14%:
  - *Headline*: Preview $17,102$ vs Export $18,011$ (Export đậm hơn +5.3%, dày hơn ~0.77px).
  - *Brand*: Preview $809$ vs Export $899$ (Export đậm hơn +11%).
  - *Subline*: Preview $2,269$ vs Export $2,581$ (Export đậm hơn +13.7%).
  - *Item 4*: Preview $4,263$ vs Export $4,786$ (Export đậm hơn +12.2%).

### 2.4 Bản chất nguyên nhân kỹ thuật
1. **Kế thừa CSS `-webkit-font-smoothing`**:
   - `globals.css` định nghĩa `body { -webkit-font-smoothing: antialiased; }`.
   - Trên macOS Blink/WebKit, `-webkit-font-smoothing: antialiased` kích hoạt grayscale antialiasing, vô hiệu hóa cơ chế làm dày nét chữ (font dilation) của CoreText, khiến chữ mảnh hơn.
   - Thẻ `<canvas>` gắn trong DOM là phần tử con của `body` nên tự động thừa hưởng quy tắc này.
   - Ngược lại, thẻ canvas offscreen được tạo rời bằng `document.createElement('canvas')` không có phần tử cha, giữ giá trị mặc định của hệ thống là `subpixel-antialiased` (font dilation được kích hoạt), làm nét chữ dày hơn ~0.77px.
2. **Context properties `textRendering` và `fontKerning`**:
   - Việc đặt `(ctx as any).textRendering = 'auto'` và `fontKerning = 'auto'` cho phép trình duyệt áp dụng các heuristic khác nhau (tối ưu hóa cho màn hình 60fps trên DOM canvas vs tối ưu chất lượng tĩnh trên offscreen bitmap).
   - Chuyển sang `textRendering = 'geometricPrecision'` và `fontKerning = 'normal'` buộc engine Skia áp dụng cùng quy tắc rasterization hình học không phụ thuộc vào ngữ cảnh gắn thẻ.

---

## 3. Kiến Trúc Sửa Đổi Hẹp (Narrow Targeted Repair)

Bám sát chỉ đạo: "Avoid further broad global CSS changes unless evidence requires them; preserve direct capture without redraw and export parity."

1. **Chuẩn hóa Context2D (`web/src/lib/poster-font.ts`)**:
   - Trong `normalizeCanvasContext(ctx, canvas)`:
     - Đặt `canvas.style.webkitFontSmoothing = 'subpixel-antialiased'`.
     - Đặt `canvas.style.textRendering = 'geometricPrecision'`.
     - Đặt `(ctx as any).textRendering = 'geometricPrecision'`.
     - Đặt `(ctx as any).fontKerning = 'normal'`.
     - Giữ nguyên `letterSpacing = '0px'`, `wordSpacing = '0px'`, `direction = 'ltr'`.
2. **Bảo toàn hàm vẽ văn bản (`web/src/lib/design-engine.ts`)**:
   - Trong `posterText`: Bổ sung `ctx.textAlign = 'left'` tường minh trước khi vẽ các dòng, tránh ô nhiễm thuộc tính căn lề từ các thao tác vẽ trước đó.
3. **Quy tắc CSS Canvas (`web/src/app/globals.css`)**:
   - Khóa chặt các thuộc tính kế thừa trên thẻ `canvas`:
     ```css
     canvas {
       letter-spacing: normal !important;
       word-spacing: normal !important;
       font-kerning: normal !important;
       text-rendering: geometricPrecision !important;
       -webkit-font-smoothing: subpixel-antialiased !important;
     }
     ```
4. **Style trực tiếp trên JSX Canvas**:
   - Cập nhật inline style trên thẻ `<canvas>` tại:
     - `web/src/app/studio/marketing/review/story-source/page.tsx`
     - `web/src/app/studio/marketing/page.tsx`
     - `web/src/app/studio/marketing/review/page.tsx`
   - Đảm bảo `WebkitFontSmoothing: 'subpixel-antialiased'` và `textRendering: 'geometricPrecision'` hiện diện trực tiếp trên phần tử DOM.
5. **Bảo toàn cơ chế Capture và Export**:
   - `capturePreviewPng` tiếp tục trích xuất trực tiếp `canvasRefs.current[idx]` qua `toBlob` mà không vẽ lại hay nạp font lại.
   - Cơ chế export (`downloadPagePng`, `downloadScenarioZip`) không thay đổi logic, bảo toàn `exportZip: 0`.

---

## 4. Danh Sách Tệp Thay Đổi (Files Changed)
- `web/src/lib/poster-font.ts`: Bổ sung `webkitFontSmoothing` và `geometricPrecision` trong `normalizeCanvasContext`.
- `web/src/lib/design-engine.ts`: Bổ sung `ctx.textAlign = 'left'` tường minh trong `posterText`.
- `web/src/app/globals.css`: Bổ sung `subpixel-antialiased`, `geometricPrecision`, `font-kerning: normal` cho `canvas`.
- `web/src/app/studio/marketing/review/story-source/page.tsx`: Cập nhật inline typography style trên preview canvas.
- `web/src/app/studio/marketing/page.tsx`: Cập nhật inline typography style trên preview canvas.
- `web/src/app/studio/marketing/review/page.tsx`: Cập nhật inline typography style trên preview canvas.
- `web/verify-font-parity-qc.cjs`: Cập nhật Test 8 kiểm chứng ngữ cảnh context properties và đối chiếu baseline Oct 15 (`20,926` diffs).

---

## 5. Kết Quả Kiểm Thử (Exact Test Results)
- **`node verify-font-parity-qc.cjs`**: **8/8 tests PASS (100%)**
  - Test 1: Trích xuất tên font đa từ đầy đủ (PASS).
  - Test 2: Nạp đầy đủ font face, weights, unicode subsets và glyphs thực tế (PASS).
  - Test 3: Wire-up snapshot trước async và loadingdone trên marketing/page.tsx (PASS).
  - Test 4: Wire-up preview và export trên review fixture (PASS).
  - Test 5: Xác minh baseline decoded pixel (Oct 13: 43,209 diffs, Oct 14: 31,582 diffs, R2: 0 diffs) (PASS).
  - Test 6: Độ phủ thu thập glyphs tiếng Việt và ký tự đặc biệt (PASS).
  - Test 7: Nút capture preview DOM trực tiếp ref không vẽ lại, vô hiệu khi đang render (PASS).
  - Test 8: Chuẩn hóa typography 2 cấp (subpixel-antialiased, geometricPrecision, normal kerning) và baseline Oct 14 (`37,107`) / Oct 15 (`previewExport=20926`, `exportZip=0`) (PASS).
- **`node verify-story-source-qc.cjs`**: **10/10 tests PASS (100%)**.
- **`npx tsc --noEmit`**: **0 lỗi biên dịch TypeScript**.

---

## 6. Giới Hạn Còn Lại & Kiểm Thử Trình Duyệt Độc Lập
1. **Parity Bản Xuất**: `exportZip: 0` được duy trì 100% không đổi.
2. **Nghiệm Thu Raster Trình Duyệt Thực Tế**:
   - Em không đưa ra kết luận chấp thuận thẩm mỹ hoặc khẳng định 0 diffs từ unit test.
   - Việc mở lại trang `/studio/marketing/review/story-source`, chụp preview DOM và tải export để so sánh pixel giải mã sẽ do Codex độc lập thực hiện.
