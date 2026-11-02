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
5. Chép 2 file vào `Packages/FotoworkKit/Sources/FotoworkImaging/Resources/Garments/`,
   thêm case vào `OutfitOption` (PortraitEditor.swift).
