# Mivy — luật làm việc (tự nạp mỗi session)

## Gen ảnh
- Gen ảnh xong: **gửi file cho anh xem, TUYỆT ĐỐI không tự mở/đọc ảnh để tự đánh giá.**
- Chỉ khi **anh nói "ảnh đạt"** thì mới coi là đạt. Nhận xét của AI không thay được của anh.
- Đọc ảnh tốn nhiều token — chỉ Read 1 tấm khi anh yêu cầu soi một lỗi cụ thể.

## Kiến trúc AI (BẮT BUỘC cho mọi tính năng)
- **AI gen SẴN template/tài nguyên (offline, 1 lần) → lưu tĩnh → user chỉ CHỌN + ĐIỀN → render bằng CODE (canvas/HTML).**
- **KHÔNG gọi AI gen theo từng request của user** (ảnh nền, layout, infographic, landing...). Hạ tầng Mivy nhỏ, user đông là sập — không như big tech.
- AI realtime chỉ dùng tối thiểu, cho việc nhẹ (vd Ollama viết lại copy khi user bấm nút), không phải mặc định.
- Nền/poster/brand kit/infographic/landing: đều theo mô hình "kho template gen sẵn + code ghép".

## Tiết kiệm token
- Làm gọn: đọc đúng phần cần, không đọc cả file to, không quét `.venv`/`.comfyui`.
- Gộp việc, hỏi rõ 1 lần rồi làm, đỡ qua lại nhiều lượt.
- Trả lời ngắn: **"đơn giản, dài dòng = vứt".**
