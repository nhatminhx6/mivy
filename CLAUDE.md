# Mivy — luật làm việc (tự nạp mỗi session)

## Mục tiêu hiện tại (chốt 2026-11-03)
- Mivy = **web thiết kế miễn phí + dịch vụ in (môi giới)**: kho rất nhiều mẫu → **bất kỳ ai** cá nhân hoá → bấm "Gửi yêu cầu in" → anh tìm xưởng ngoài in → ăn chênh lệch. Đủ khách đều mới mở xưởng riêng.
- Vận hành: có đơn mới tìm xưởng (TP.HCM), báo giá qua Zalo → cọc → in mẫu khách duyệt → in lô → giao.
- Mọi tính năng phải phục vụ chuỗi **mẫu đẹp → cá nhân hoá → file in chuẩn (khổ, lề xén, vạch cắt) → đặt in**. Nhiều mẫu = engine code đẻ biến thể, không vẽ tay.
- Đang có: thiệp cưới/sinh nhật, sticker, móc khoá, logo, bộ nhận diện, bảng hiệu, menu/bảng giá, poster + đặt in / đơn của tôi / admin đơn·khách.
- **ĐÃ BỎ, đừng đề xuất lại:** ảnh cho sàn Shopee/TikTok (ảnh sản phẩm, người mẫu AI, xoá vật thể, làm nét, khung sale, video…). Máy in 3D gác lại. Đăng nhập Google/Zalo làm sau (giờ chỉ email + mật khẩu).

## Chen vào kẽ hở ngành in (chốt 2026-11-05)
Kẽ hở: (1) xưởng giỏi máy nhưng **dở file** — khách mang file tới 7/10 sai (thiếu bleed, RGB, chữ chưa outline, DPI thấp); (2) **đơn nhỏ/lẻ bị bỏ rơi**; (3) đặt in = trải nghiệm khổ (không giá trước, không biết khi nào xong). Mivy KHÔNG đấu "in rẻ" (xưởng luôn rẻ hơn) mà đấu **"từ ý tưởng → file in chuẩn trong 5 phút, không cần biết thiết kế"** — chỗ cả Canva (file không chuẩn in) lẫn xưởng (không cho tự thiết kế) đều bỏ trống.

**Kiềng 3 chân, cả 3 phải tốt — nhưng làm theo THỨ TỰ, không làm song song:**
1. **Engine xuất file in chuẩn** (nền, làm trước): khổ, bleed 2-3mm, vạch cắt, CMYK, outline chữ, DPI ≥300. Làm 1 lần, mọi sản phẩm cắm vào.
2. **1 sản phẩm mũi nhọn chạy TRỌN chuỗi** (thiệp cưới hoặc sticker/tem nhãn — mua lặp, gấp, file hay sai): thiết kế → xuất file chuẩn → gửi yêu cầu in → **chạy thật 1 đơn với xưởng** rồi mới tính tiếp.
3. **Dồn mẫu đẹp cho đúng sản phẩm đó** (engine đẻ biến thể) — CHỈ khi chuỗi đã thông. Đổ mẫu trước khi chuỗi thông = phí.
- Quy tắc: làm sâu 1 sản phẩm xuyên cả 3 chân → chạy thật 1 đơn → mới nhân rộng mẫu + sản phẩm khác. KHÔNG làm 7 sản phẩm cùng lúc mỗi cái một nửa.

## Tên ví dụ
- **NGHIÊM CẤM lấy tên anh làm ví dụ**: không dùng "Minh", "Nhật" (hay ghép kiểu "Minh Nhật", "Nhật Minh", "Minh Anh"…) cho tên mẫu, placeholder, dữ liệu mặc định, test, tài liệu. Dùng tên khác (Quốc Bảo, Thu Hà, Gia Khánh…).
- Không tính địa danh/từ thường: "Hồ Chí Minh", "Nhật Bản", "cập nhật", "chủ nhật", "chữ nhật", "minh hoạ", "xác minh"…

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
