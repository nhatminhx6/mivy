# Công tác phí — ghi chú test tay + lỗi đã sửa (17/11/2026)

## Bấm tay trong app (sim iPhone 17 Pro) → `man-hinh/`
- Chọn 2 ảnh từ thư viện: vé gửi xe (không ghi ngày, ảnh chụp 16/03) và hoá đơn chụp nghiêng → app ghi 16/03/2026 · Đi lại · 30.000 và 17/03/2026 · Ăn uống · 180.000 (đúng).
- Xuất PDF từ app: `bang-ke-tu-app.pdf` — “Đi lại” đọc ra đúng chữ Đ.

## Lỗi tìm ra và đã sửa
1. **Ảnh chụp nghiêng đọc sai tổng tiền** (5° → 30.000 thay vì 180.000): cột số tiền bên phải lệch xuống một dòng, app ghép nhầm. Giờ app đo độ nghiêng từ các dòng chữ, nghiêng quá 1° thì xoay thẳng rồi đọc lại (đã thử 5° và 9° ngược chiều).
2. **Hoá đơn không ghi ngày bị gán ngày hôm nay** → bảng kê ghi “Từ 10/03 đến 17/11”. Giờ lấy ngày chụp ảnh (EXIF); chỉ khi không có mới dùng hôm nay.
3. **Phân loại sai**: vé máy bay (OCR dính chữ “VIETNAMAIRLINES”), vé gửi xe (“giữ xe”), quán không có chữ “quán/nhà hàng” (bánh xèo, nem…) → giờ nhận đúng Đi lại / Ăn uống.
4. **PDF cắt mất ghi chú** (“Tiếp khách Công ty Sa…”): giờ ghi chú xuống dòng dưới nơi chi, dòng tự cao lên.
5. **Chữ “Đ” trong PDF thành “Ð”** (font hệ thống iOS): copy/tìm “Đi lại” không ra. PDF bảng kê và nhãn thẻ hai mặt giờ dùng Be Vietnam Pro.
