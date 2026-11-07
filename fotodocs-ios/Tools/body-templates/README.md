# Body templates (ghép vest)

Thân người mẫu mặc vest dùng cho `HeadSwap`. Gen **offline 1 lần**, không gen theo request.

1. Bật ComfyUI local (Z-Image-Turbo GGUF) ở `back-end/.comfyui`, cổng 8188.
2. Sửa `JOBS` trong `gen_body.py` (giới tính, màu vest), chạy:
   `python3 gen_body.py <thư mục ra>` → `<tên>.png` 1024×1024.
3. Tự xem ảnh: chính diện, đầu thẳng, **lộ cổ rõ**, nền trắng, vai không bị cắt.
4. Cắt nền + đo hàm:
   `swiftc -O prep_body.swift -o prep && ./prep in.png body-<giới>-<màu>.png body-<giới>-<màu>.json`
4b. Khử viền trắng ở mép cắt (nếu không, nền xanh/xám sẽ lộ một đường sáng dọc vai):
   `swiftc -O defringe_body.swift -o defringe && ./defringe body-<giới>-<màu>.png` (sửa tại chỗ).
5. Chép 2 file vào `Packages/FotoDocsKit/Sources/FotoDocsImaging/Resources/Garments/`,
   thêm case vào `OutfitOption` (PortraitEditor.swift).

## v2 — cổ áo đóng (2026-11-04)
Cổ áo mở chữ V (mẫu cũ) để lộ một chữ V da cắt thẳng → nhìn ra ghép. Mẫu v2: sơ mi cài kín cúc trên cùng, chân cổ áo
ôm sát cổ, cà vạt thắt cao (nam). **Gen ở máy gen, KHÔNG chạy trên máy dev của anh.**
1. Máy gen (ComfyUI + Z-Image-Turbo GGUF): `COMFY=http://127.0.0.1:8188 python3 gen_body_closed.py out/`
   → 4 mẫu × 4 seed = 16 ảnh `<tên>-s<seed>.png`.
2. Chép thư mục `out/` về máy dev, chọn mỗi mẫu 1 ảnh: chính diện, đầu thẳng, vai đủ, chân cổ áo thấy rõ quanh cổ, cổ không bị tóc che.
3. Bước 4, 4b, 5 như trên (đặt tên `body-<giới>-<màu>.png/.json` để thay mẫu cũ).
