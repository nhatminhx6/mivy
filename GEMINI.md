# Mivy Project Rules & UI Engineering Standards

## 1. UI & Typography Perfection (Bắt buộc 100%)
- **Zero Coordinate Guessing**: Tuyệt đối không đoán tọa độ mò Y (không dùng số ngẫu nhiên `+ 4`, `+ 10`). Toàn bộ số thứ tự (`01`, `02`, `BƯỚC 1`) và text/tiêu đề đi kèm PHẢI được tính toán qua trục tim ngang chung `centerY` (`badgeY = centerY - badgeH/2`, `textY = centerY - totalTextH/2`).
- **Dynamic Text Placement**: Vị trí X của text sau badge luôn tính động: `textX = badgeX + badgeW + gap` (tối thiểu 16px).
- **Anti-Bleed & Clipping**: Toàn bộ thẻ Bento hoặc box chứa nội dung động (lương, quyền lợi, mô tả) bắt buộc phải có `ctx.clip()` bo theo khung để triệt tiêu 100% nguy cơ tràn chữ sang ô kế bên.
- **Auto Wrap & Scale**: Dùng `posterText` để tự động xuống dòng và co giãn font chữ khi nội dung dài, không vẽ 1 dòng thô bằng `fillText`.

## 2. Server & Communication
- Luôn xưng hô "anh" - "em", ngắn gọn, thực tế, đúng trọng tâm.
- Chạy lệnh tự động trong sandbox, không hỏi xác nhận làm mất thời gian.
- Backend chạy port 8000, Web chạy port 3009.
- Không dùng API tính phí bên ngoài (0đ chi phí vận hành).
