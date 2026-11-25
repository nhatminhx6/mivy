# Test toàn app FotoDocs — sim iPhone 17 Pro (17/11/2026)

Test tự động: 79/79 pass.

| Tính năng | Kết quả | File ra (trong output/) |
|---|---|---|
| Ảnh thẻ: chụp (camera giả) → chỉnh → xuất | Đạt | id-photo/fotodocs-in-10x15.jpg (1181×1772, 300 dpi) |
| Điền form visa (CCCD, hộ chiếu, Nhật PDF) | Đạt | visa/ |
| Scan tài liệu (2 ảnh → PDF) | Đạt | scan/fotodocs-scan.pdf (2 trang) |
| Thẻ hai mặt → A4 | Lỗi → đã sửa | the-hai-mat/ |
| Nén file (mục tiêu 100 KB) | Đạt (89 KB), sửa lỗi nhỏ giao diện | nen-file/ |
| Ký tên → PDF | Đạt | ky-ten/ |
| Tạo CV → PDF | Đạt | cv/cv-tran-quoc-bao.pdf |
| Công tác phí (hoá đơn giả → Excel) | Đạt, OCR đọc đúng quán/ngày/tổng | cong-tac-phi/ |
| Bộ hồ sơ | Đạt | — |
| Avatar | Lỗi → đã sửa | — |
| Cài đặt | Đạt | — |

Lỗi đã sửa:
1. Thẻ hai mặt: ảnh thẻ đã cắt sẵn (scan/ảnh chụp màn hình) bị cắt nhầm vào ô ảnh chân dung bên trong → giờ giữ nguyên cả thẻ (CardScanner, có test mới).
2. Avatar: tick đồng ý rồi mà nút "Chọn ảnh và tạo avatar" vẫn mờ vì chưa chọn kiểu, không có gì nhắc → giờ tự chọn sẵn kiểu đầu.
3. Xuất ảnh: chọn "File in 10×15" mà khung xem trước chỉ hiện 1 ảnh → giờ hiện đúng tờ 4 ảnh.
4. Xuất ảnh: đổi sang "File số" vẫn còn dòng "Dàn 4 ảnh · 10×15" của lần xuất trước → giờ tự xoá.
5. Nén file: ảnh xem trước lòi ra ngoài góc bo tròn → đã cắt theo góc (chưa xem lại trên sim).

Không test được trên sim: camera thật, tách nền người (thay nền, ghép vest, avatar đổi nền), AirPrint.
Ảnh chụp màn hình từng bước: test-17pro/*.png
