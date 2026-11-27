# Task cho Antigravity — làm nốt 11 sản phẩm in dở dang (Mivy)

Cập nhật: 25/11/2026. File này đủ để làm việc, không cần đọc lịch sử chat. Làm xong món nào thì đánh dấu `[x]` trong bảng ở mục 4.

## 1. Bối cảnh ngắn

- Mivy = web thiết kế miễn phí + dịch vụ in môi giới. Mỗi sản phẩm in có 1 trang studio: khách chọn mẫu → điền nội dung → xem **thành phẩm 3D (three.js)** → tải file in chuẩn → bấm "Gửi yêu cầu in".
- Đã có khoảng 95 trang studio chạy tốt, ví dụ `/studio/coaster`, `/studio/tote`, `/studio/tumbler`. **Làm y hệt pattern của chúng.**
- Code web ở `web/` (Next.js 14, React 18, TypeScript, Tailwind token `mv-*`, three.js 0.169).

## 2. Luật bắt buộc

- Xưng hô với user: gọi **"anh"**, tự xưng **"em"**. Trả lời ngắn.
- **Không dùng tên "Minh", "Nhật"** cho dữ liệu mẫu, placeholder hay test. Dùng tên khác: Quốc Bảo, Thu Hà, Gia Khánh, An Khang, Bảo Ngọc…
- Không gọi AI theo từng request của khách. Mọi hình vẽ bằng code (SVG/canvas/three.js). Ảnh khách tải lên chỉ xử lý trên máy khách.
- Không dùng thương hiệu thật hoặc nhân vật có bản quyền (hãng xe, hãng điện thoại, nhân vật hoạt hình…).
- **Tên font trong thuộc tính SVG phải bọc ngoặc nháy**: `fontFamily="'Baloo 2'"`. Không bọc thì trình duyệt tự đổi sang font khác.
- Font dùng trong file in phải có TTF trong `web/public/fonts`, để chữ chuyển thành nét qua `svg-outline.ts`.
- **KHÔNG sửa các file dùng chung** (đã nối sẵn cho cả 11 món):
  - `web/src/lib/auth.tsx` (PrintProduct)
  - `web/src/components/PrintRequest.tsx` (QTY/MATERIALS)
  - `back-end/app/services/print_order_service.py` (PRODUCTS)
  - `web/src/app/studio/layout.tsx` (menu + breadcrumb)
  - `web/src/lib/product-catalog.ts`
  - `web/src/lib/mockup3d.ts`, `web/src/components/Mockup3D.tsx`
  - `web/src/lib/svg-export.ts`, `web/src/lib/svg-outline.ts`, `web/src/lib/image-utils.ts`

  Chỉ tạo hoặc sửa 4 file của từng món: `src/lib/<id>-engine.tsx`, `src/lib/<id>-3d.ts`, `src/app/studio/<id>/page.tsx`, `e2e/<id>-qc.spec.ts`.
- Không commit (anh tự commit).
- Ảnh kết quả lưu vào `output/<id>/` (không để ở scratchpad).

## 3. Pattern để copy (đọc trước khi làm)

- **Mẫu đầy đủ nên đọc:**
  - `web/src/lib/coaster-engine.tsx`
  - `web/src/lib/coaster-3d.ts`
  - `web/src/app/studio/coaster/page.tsx`
  - `web/e2e/coaster-qc.spec.ts`
- **Lõi 3D dùng chung `web/src/lib/mockup3d.ts`:**
  - Builder trả về `{ group, view:{az,el}, aim?, zoom?, blob?, swing? }`.
  - Đồ treo tường hoặc dán lên mặt phẳng thì đặt `swing: 0.5` để khi xoay không lộ mặt sau.
  - Có sẵn `svgTex`, `canvasTex`, `snapshot`.
- **Component:** `PreviewTabs` (mặc định mở tab 3D, có `data-testid` `tab-3d` / `tab-flat`) và `Mockup3DView` (ref `.snapshot(w,h)`), cả hai trong `web/src/components/Mockup3D.tsx`.
- **Xuất file:** dùng `svg-export.ts` (`svgToPng`, `svgToPrintPdf`, `svgsToPrintPdf`, `svgToSizedPdf`, `selfContainedSvg(el, css, {outline:true})`). File in có các lớp `In`, `CutContour`, `Fold`, lề xén 2–3mm.
- **Đặt in:** `<PrintRequest product="<id>" makeFiles=...>`. Trong đó `file` là PDF/SVG in, `preview` là ảnh chụp 3D (lỗi thì dùng JPEG phẳng).
- **Hook QC:** trong bản dev, gắn `window.__xxSnap(w,h)` để Playwright chụp 3D ở góc mặc định.
- **Tham khảo khi cần (chỉ đọc, import được):**
  - `tape-engine.tsx` (`logoToMask`: logo → 1 màu)
  - `flyer-qr.ts` (mã QR)
  - `pouch-engine.tsx` (`ean13`)
  - `seal-engine.tsx` (`zipStore`, tờ in có số)
  - `canvas-engine.tsx` (ảnh khách: crop, dpi, ảnh mẫu vẽ bằng code)
  - `cup-3d.ts` (ly PET, trà sữa, trân châu)
  - `plasticbag-3d.ts` (màng nhựa nhăn)
  - `cutout-engine.ts` + `cutout-3d.ts` (đường cắt theo hình, mica trong)
  - `foodbox-engine.tsx` (khuôn bế dựng từ các mảnh)
  - `cap-3d.ts` / `apron-engine.tsx` (hiệu ứng thêu)
  - `signage-3d.ts` (mặt tiền shop)

## 4. Việc cần làm (theo thứ tự)

| # | Món (`id`) | Route | Đang có | Còn thiếu | Xong |
|---|---|---|---|---|---|
| 1 | Ruy băng in logo (`ribbon`) | /studio/ribbon | engine, 3d, page | **sửa 2 lỗi TS ở page.tsx dòng 54 & 149** (kiểu `RBData`), viết e2e, QC | [x] |
| 2 | Giấy note in logo (`notepad`) | /studio/notepad | engine, 3d, page | e2e + QC + soi 3D | [x] |
| 3 | Hộp quà cưới mini (`favorbox`) | /studio/favorbox | engine, 3d, page | đặt id lớp đúng `In`/`CutContour`/`Fold` trong file in, e2e, QC | [x] |
| 4 | Patch thêu (`patch`) | /studio/patch | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 5 | Standee mica mini (`acrylicstand`) | /studio/acrylicstand | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 6 | Túi đựng ly trà sữa (`cupcarrier`) | /studio/cupcarrier | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 7 | Decal dán xe công ty (`cardecal`) | /studio/cardecal | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 8 | Thùng carton in logo (`carton`) | /studio/carton | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 9 | Bao gạo · bao bì nông sản (`ricebag`) | /studio/ricebag | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 10 | Nón lá in logo (`nonla`) | /studio/nonla | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |
| 11 | Hộp bánh trung thu (`mooncakebox`) | /studio/mooncakebox | engine, 3D, page, e2e | QC Playwright và duyệt ảnh 3D | [ ] |

Tiến độ tiếp quản: mục 5–11 đã có route, bản thiết kế, builder 3D và spec Playwright.
Mục 4 đã có code và spec từ phiên trước. Các ô 4–11 chờ chạy QC trên Chrome,
kiểm tra file tải xuống và xem ảnh 3D. Phiên hiện tại bị chặn mở cổng local 3009.

Món nào đã có engine thì đọc engine trước, giữ nguyên hướng đã làm, chỉ hoàn thiện. Không viết lại từ đầu.

### Spec từng món (tóm tắt)

1. **ribbon**: khổ 10/15/20/25/38mm. Satin, grosgrain, organza (xuyên sáng), vải bố. In nhũ vàng/bạc/hồng hoặc 1–2 màu. Đoạn lặp (logo + tên + "Thank you"…) chạy dọc cuộn. 3D: cuộn ruy băng có đầu dải buông ra bàn, hộp quà thắt nơ (vòng + đuôi cắt chữ V).
2. **notepad**: giấy note dán 76×76/76×51 + hình cắt theo hình; sổ note xé A6/A5; khối note vuông 9×9×9 in hình ở 4 mặt cạnh; bộ sticky bìa cứng. 3D: chồng giấy note có tờ trên cong lên, sổ xé gáy keo, khối note thấy hình in trên mép giấy.
3. **favorbox**: hộp gối, lục giác/tam giác, vuông có lỗ xỏ ruy băng, hộp hình nhà, túi xách mini (5–8cm). Dịp cưới/thôi nôi/sinh nhật/Tết, ép kim. Khuôn bế ghép nhiều con trên 1 tờ. 3D: cụm hộp trên bàn, 1 hộp mở thấy kẹo/socola.
4. **patch**: dáng tròn/khiên/chữ nhật/ô van/cắt theo hình. Viền vắt sổ hoặc cắt nóng. Mặt sau ủi/gai dán/may. Thêu ≤8 màu chỉ, cảnh báo chữ <4mm; patch in; PVC dẻo. 3D: patch nổi vân chỉ, viền vắt sổ cuộn, may trên vải; 1 cái lật thấy mặt sau.
5. **acrylicstand**: ảnh/nhân vật → đường cắt viền 2–3mm (dùng `cutout-engine`). Cao 8–15cm. Đế oval/chữ nhật/theo hình có in tên, khe cắm. Có lớp mực trắng lót. 3D: mica trong dày 3mm, cạnh bắt sáng, cắm trên đế mica.
6. **cupcarrier**: túi PE 1–2 ly (trong/sữa/màu, quai đục hoặc quai vòng), túi kraft 2–4 ly có khay giữ ly, túi vải không dệt. In 1–2 màu. 3D: túi PE đựng ly trà sữa (nắp vòm, ống hút, trân châu), màng nhăn ôm ly.
7. **cardecal**: xe chung chung, không giống hãng nào (van, xe tải thùng kín 1–2 tấn, ô tô 5–7 chỗ). Có vùng không in (kính, khe cửa, tay nắm, hốc bánh). Thiết kế 2 bên hông sao cho chữ đọc đúng chiều ở cả 2 bên, cộng phía sau. Hotline thật to. Decal in hoặc decal cắt chữ. 3D: xe tải thùng góc 3/4 có decal.
8. **carton**: thùng RSC (nhập D×R×C, 3/5 lớp) và hộp nắp gài e-commerce. In flexo 1–2 màu trên kraft hoặc trắng. Icon hàng dễ vỡ, hướng lên, tránh mưa vẽ bằng code. Hộp nắp gài in mặt trong "Thank you". Khuôn bế dựng bằng code. 3D: thùng đóng có dán băng keo, hộp mailer mở thấy chữ in bên trong, mép thấy sóng carton.
9. **ricebag**: bao PP dệt 5/10/25kg (flexo 1–3 màu), túi gạo hút chân không 1–5kg, túi giấy kraft nhiều lớp. Có thông tin bắt buộc, EAN-13, QR. Hình bông lúa, cánh đồng, hạt gạo vẽ bằng code. 3D: bao PP căng phồng có vân dệt, miệng may; khối gạo hút chân không; vài hạt rơi.
10. **nonla**: nón Ø40/45/50. Vùng in khi trải phẳng là hình quạt vành khăn (tính từ đường sinh và góc trải). Mẫu: quà đối tác, du lịch ("Xin chào Việt Nam", Hội An), áo dài/hoa sen, 20/11. 3D: nón lá có vân lá cọ và các vòng gân, hình in quấn đúng theo nón, có quai.
11. **mooncakebox**: hộp bánh trung thu cứng 4/6 bánh có khay (giống `rigidbox` nhưng chủ đề trung thu: trăng, đèn lồng, thỏ ngọc, hoa văn). Có ép kim. 3D: hộp mở thấy 4–6 bánh trong khay, nắp dựng bên cạnh.

## 5. Cách chạy và kiểm tra

- Dev server: `cd web && npm run dev` (port **3009**). Backend nếu cần: `cd back-end && .venv/bin/uvicorn app.main:app --port 8000 --reload`.
- Typecheck (phải sạch, 0 lỗi toàn repo):
  ```bash
  cd web && npx tsc --noEmit
  ```
- QC Playwright cho từng món (chạy 1 worker, ảnh ra ngoài `test-results`):
  ```bash
  cd web && QC_BASE=http://localhost:3009 QC_OUT=../output/<id>/qc npx playwright test e2e/<id>-qc.spec.ts --workers=1
  ```
- **Spec QC tối thiểu cho mỗi món:**
  - Mọi mẫu × mọi khổ: chữ nằm trong vùng in, không chồng nhau, cỡ chữ ≥ mức tối thiểu.
  - Chữ rất dài vẫn gọn.
  - File tải về hợp lệ: PDF bắt đầu bằng `%PDF`; SVG có `CutContour` và không còn thẻ `<text>`.
  - Chụp 3D được.
  - Có nút `print-request`.
  - Không có lỗi trang.
- Tự soi ảnh 3D (chụp qua hook `__xxSnap` bằng Playwright), sửa tới khi nhìn như ảnh sản phẩm thật. Lưu 2–3 ảnh vào `output/<id>/`.
- **Cuối cùng**, chạy lại QC toàn bộ các món đã có để chắc không vỡ gì:
  ```bash
  cd web && QC_BASE=http://localhost:3009 QC_OUT=../output/qc-all npx playwright test --workers=2
  ```
  Ghi chú: `poster-infographic-qc` từng bị quá giờ khi máy tải nặng. Chạy riêng lúc máy rảnh để xác nhận.

## 6. Khi xong

- Đánh dấu `[x]` từng dòng trong bảng mục 4.
- Báo anh ngắn gọn: món nào xong, QC bao nhiêu/bao nhiêu, ảnh ở đâu, còn tồn gì.
