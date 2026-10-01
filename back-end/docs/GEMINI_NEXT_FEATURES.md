# MIVY — Review và backlog giao Gemini

Ngày: 24/09/2026. Baseline: commit 2068b38, sau migration Next.js 7620776.
Phạm vi: đọc code thay đổi, kiểm tra backend và TypeScript. Chưa chạy đánh giá hình thực tế hay gọi provider bên ngoài trong lượt review này.

## Kết quả review cần xử lý trước

1. **P1 — Poster tự thêm thông tin không có trong nguồn.** `web/src/lib/design-engine.ts:636–678` (đường dẫn từ repo root) cứng hóa TP.HCM, Hybrid, Full-time, Macbook, bảo hiểm VIP và cấp bậc. Renderer vẫn làm sai ngay cả khi model trả đúng. Xóa các business facts mặc định; chỉ render fact có nguồn hoặc đã được người dùng nhập. Không dùng dữ liệu giả để lấp ô.
2. **P1 — AI lỗi nhưng trả thành công bằng nội dung mẫu bịa.** `back-end/app/api/creative.py:88–102` chuyển sang fallback khi busy/timeout 15 giây/bất kỳ exception. `marketing_service.py:168+` fallback thêm KPI, học bổng, quy trình tuyển dụng, hotline 24/7. Trả trạng thái lỗi có thể retry; nếu cho dùng bản mẫu phải ghi rõ và chỉ trích dữ liệu nguồn. Không sửa test để hợp thức hóa thành công giả.
3. **P1 — Sinh ảnh thất bại trả PNG trong suốt 1×1.** `back-end/app/services/visual_service.py:192–203` và background fallback gọi cùng helper. Job có thể completed dù không có ảnh có giá trị. Bắt buộc xác thực decode, kích thước, MIME; sinh ảnh thất bại phải failed. Nền trang trí thủ công chỉ là lựa chọn riêng có nhãn rõ.
4. **P2 — Chưa hỗ trợ ngôn ngữ đầu ra.** Prompt bắt buộc tiếng Việt (`marketing_service.py:48`), template trộn nhãn Việt/Anh cố định. Chưa có language trong hợp đồng đầu vào. Không thể coi là hỗ trợ Anh đầy đủ.
5. **P2 — Timeout frontend/backend lệch.** `web/src/lib/api.ts` ngắt sau 30 giây, VisualService có thể chờ 35/45 giây. Dùng job bất đồng bộ, polling và timeout nhất quán; tránh bỏ kết quả đã tạo.

Kiểm tra: `.venv/bin/pytest -q`: 25 pass, 1 fail (`test_creative_image_refuses_mock`, expected503 actual202). `web/node_modules/.bin/tsc --noEmit`: pass. Test canvas cũ trong backend không đủ chứng minh renderer Next.js mới đẹp hoặc giữ đủ nội dung.

## Mục tiêu sản phẩm

Một brief + ảnh tùy chọn → bộ thiết kế và nội dung đăng được; dùng cho tuyển dụng, khóa học, dịch vụ, sản phẩm. Luồng chính gọn: Nhập nội dung → Chọn thiết kế → Chỉnh và tải. Không yêu cầu viết prompt dài. Tiếng Việt, tiếng Anh, nội dung trộn phải được giữ đúng. Không tự dịch, thêm ưu đãi hoặc bớt yêu cầu quan trọng.
Giữ ràng buộc hiện tại: không tự thêm API trả phí, không tự gửi brief ra provider mới. Provider local phải chạy local thật; external free không đồng nghĩa local. Không cam kết “0đ mãi mãi” hoặc chất lượng 8K khi output chỉ 1024px.
Frontend chính: `web/` ở repo root, Next.js port3009. Backend port8000. `back-end/web/` là legacy; không sửa nhầm để tuyên bố đã sửa UI Next.js.

## Thứ tự giao việc

### Đợt 0 — Sửa các lỗi review
- Hoàn thành năm vấn đề trên. Giữ nguyên bản đang chỉnh nếu tạo lại thất bại.
- Thêm kiểm thử timeout, busy, provider trả HTML/ảnh hỏng/ảnh1×1, nguồn không có lương/địa điểm/quyền lợi.
- Tiêu chí: không có thông tin không được cung cấp trong cả caption lẫn PNG; lỗi không masquerade thành ảnh AI thành công; tất cả tests đạt theo hợp đồng đúng.

### Đợt 1 — Ngôn ngữ + nội dung đầy đủ (ưu tiên tính năng đầu tiên)
- Form thêm `Ngôn ngữ nội dung`: Giữ nguyên (mặc định), Tiếng Việt, English. UI có thể vẫn tiếng Việt; nhãn trên poster, CTA và caption phải theo ngôn ngữ đầu ra.
- API `output_language: preserve|vi|en`, lưu vào draft, export manifest. Preserve không ép toàn bộ sang một ngôn ngữ khi nguồn trộn.
- Tạo danh sách ý từ brief, mỗi ý có `id`, `source_excerpt`, `text`, `selected`; hiển thị trong mục chỉnh sửa thu gọn. Tách phần nội dung người dùng sửa khỏi phần model suy ra.
- Không chỉ kiểm đếm số bullet: đối chiếu từng ý, số liệu, email, tên riêng, cấp bậc, công nghệ. Báo ý chưa được đưa vào ảnh.
- Đầu vào dài: tự phân trang carousel để giữ ý, có lựa chọn poster một trang. Không cắt bằng slice/ellipsis đối với thông tin quan trọng hoặc thu chữ đến không đọc được.
- Nghiệm thu: JD tám ý hiện tại ở ba bản Việt/Anh/trộn; không thiếu ý làm quen codebase, technical debt, mentoring, stakeholders. Giữ Lead/Senior, ReactJS, NodeJS. Không sinh ra TP.HCM, Hybrid, lương hay email nếu nguồn không có.

### Đợt 2 — Bộ nội dung theo kênh
- Chọn mục đích và đầu ra: poster, carousel, caption, kịch bản video ngắn. Không ép mọi brief thành launch/story/action cố định.
- Dựa trên cùng tập facts đã kiểm tra; Facebook/LinkedIn: bài đăng và carousel; TikTok: script các cảnh + chữ màn hình; Shopee: ảnh và mô tả sản phẩm.
- Nêu rõ script là văn bản, chưa phải video được render. Tránh nút chức năng chưa có backend.
- Xuất ZIP có PNG theo thứ tự, caption.txt, script.txt khi được chọn, source.txt và manifest gồm ngôn ngữ/kích thước/model.
- Nghiệm thu: sửa số liệu một lần → tất cả đầu ra liên quan cập nhật; tải được PNG/TXT/ZIP, nội dung export khớp preview.

### Đợt 3 — Brand Kit và chiến dịch thật
- Brand Kit: logo, màu chính/phụ, font hỗ trợ dấu Việt, tên và liên hệ xác nhận. Không lấy MIVY làm thương hiệu mặc định trên ảnh của khách.
- Lưu nhiều chiến dịch có id, tên, ngày, ảnh thu nhỏ; mở lại, nhân bản, đổi tên, xóa có thể khôi phục. Hiện drafts chỉ đọc một khóa localStorage nên chưa phải thư viện chiến dịch.
- Dùng API + SQLite hiện có cho dự án/assets; không nhét ảnh20MB vào localStorage. Migration giữ được bản nháp cũ; không tự thêm auth/cloud sync vào đợt này.
- Nghiệm thu: hai chiến dịch hai brand không ghi đè nhau; reload/restart vẫn mở đúng; đổi brand không đổi nội dung nguồn.

### Đợt 4 — Chọn model bằng kết quả thực tế
- Cơ chế provider adapter, tách `background generation` và `full poster generation`. Không gắn nhãn tạo toàn bộ thiết kế khi model chỉ tạo nền.
- Trang dev benchmark: cùng brief + cùng nội dung bắt buộc + cùng tỉ lệ → so sánh model. Dùng provider đã cấu hình; thiếu credentials/không hỗ trợ thì báo rõ, không fallback giả.
- Bộ đánh giá: 4 ngành × 3 ngôn ngữ =12 brief; lưu request, model/version, seed nếu có, thời gian, chi phí nếu có, ảnh gốc và lỗi. Kiểm tra chữ thủ công kèm OCR nếu sẵn, đủ ý, đúng fact, bố cục, giữ sản phẩm.
- Các model đã được đề cập chỉ là ứng viên, chưa có bằng chứng chạy thử: Ideogram4, Gemini image, Qwen image. Xác minh lại phiên bản/license/hardware trước cài đặt; không tự bật provider trả phí.
- Chỉ tích hợp model làm mặc định sau khi có ảnh đối chứng được anh đánh giá. Không tuyên bố model tốt chỉ từ tài liệu quảng cáo hoặc test mock.

## Prompt giao Gemini ngay

Đọc tài liệu này và GEMINI.md. Làm Đợt0 trước, sau đó Đợt1; chưa mở rộng sang đợt khác. Giữ UI đơn giản và sửa đúng Next.js hiện hành. Báo lỗi rõ, giữ draft, tuyệt đối không thêm business facts mặc định. Mỗi phần phải có kiểm tra API và kiểm tra preview/export thực tế với JD tám ý ở tiếng Việt, tiếng Anh và trộn. Kết thúc ghi rõ file thay đổi, checks đã chạy, ảnh đầu ra để anh xem và hạn chế còn lại. Không tự đánh giá thiết kế là “agency-grade” thay cho bằng chứng.
