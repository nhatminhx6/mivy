# Mivy: đánh giá lại pipeline ảnh sản phẩm

Ngày 21/09/2026. Đây là quyết định thiết kế và kế hoạch kiểm chứng, chưa phải thông báo đã sửa xong chất lượng ảnh. Không đổi runtime trong lượt đánh giá này.

## Vấn đề có bằng chứng

1. `workflows/product_ad.json` node 9 dùng ImageScale với crop=center. Adapter đổi kích thước node này sang khổ đích trước khi node 10 tách chủ thể. Một ảnh vuông 600×600 khi cover sang 512×896 chỉ còn vùng giữa khoảng 343 pixel chiều ngang: mất khoảng 43% bề rộng. Chủ thể bị cắt trước khi mask và composite; prompt/model tốt hơn không lấy lại được pixel gốc đã mất.
2. `studio_white` trong `app/api/creative.py` vẫn trở thành prompt gửi diffusion. Nền trắng là yêu cầu xác định nhưng đang dùng bộ sinh ngẫu nhiên; negative prompt không bảo đảm ảnh trống. Vật thể thừa trong ảnh người dùng phù hợp với lỗi này.
3. Mask hiện dùng u2netp, threshold 0.5, lấp mọi lỗ và erode 1 pixel. Chưa có đánh giá mask thật theo nhóm sản phẩm. Lấp mọi lỗ có thể làm mất lỗ thật của quai/tay cầm; erode có thể làm mất chi tiết mảnh. Đế trắng bị mất có thể do segmentation; cần lưu và xem mask để xác nhận, không suy đoán chỉ từ ảnh cuối.
4. 512×896 không phải 9:16 chính xác. Upscale 2× cho 1024×1792 không sửa được tỉ lệ hoặc phục hồi chi tiết đã mất.
5. Test hiện kiểm tra job, mapping, truyền ảnh và mask giả lập. Chưa kiểm tra đầy đủ chủ thể, mask thật, màu/logo, bố cục, kích thước cuối và vật thể thừa. Các con số test pass trước đây không chứng minh ảnh đạt chất lượng bán hàng.

## Quyết định kiến trúc

Tách ảnh bán hàng tiêu chuẩn và ảnh bối cảnh sáng tạo thành hai pipeline.

### A. Ảnh bán hàng tiêu chuẩn — ưu tiên thực hiện

Ảnh gốc → chuẩn hóa EXIF → tách nền tại độ phân giải phù hợp → xem/kiểm tra cutout → lấy bounding box chủ thể → scale đồng đều để fit với padding → đặt trên canvas đích → xuất.

- Giữ pixel chủ thể gốc; không đưa chủ thể qua diffusion.
- Tách nền trước bố trí; không cover/crop ảnh đầu vào theo khổ đầu ra.
- Nền trắng = fill #FFFFFF. Gradient = render theo mã. Không gọi diffusion cho hai lựa chọn này.
- Mẫu gỗ/cẩm thạch có thể dùng ảnh nền đã tuyển chọn, kiểm tra quyền sử dụng và vùng đặt vật thể; chưa có asset đạt chuẩn thì chưa hứa hỗ trợ.
- Kích thước đề xuất để test: 1080×1080, 1080×1350, 1080×1920. Đây là tỉ lệ preset của Mivy, không tuyên bố đã kiểm chứng mọi quy định nền tảng.
- Không thêm bóng giả trước khi cutout đạt; bóng sản phẩm cần giữ/tạo thành lớp riêng.
- Nếu mask lỗi: cho sửa xóa/khôi phục hoặc dùng ảnh gốc với viền/padding. Không âm thầm trả ảnh mất chi tiết dưới nhãn thành công.

### B. Ảnh bối cảnh AI — thực hiện sau

- Cần điều khiển vùng đặt sản phẩm, mặt phẳng tiếp xúc, ánh sáng và bóng; ghép tùy ý vào một nền sinh độc lập không đảm bảo hợp lý.
- Giữ pipeline riêng để đánh giá, không lấy kết quả đẹp của một seed làm bằng chứng ổn định.
- Chưa đưa lại thành lựa chọn mặc định trước khi qua bộ đánh giá ảnh thật.

## Phương án tách nền cần so sánh

- Local hiện tại: U2NetP làm baseline, không mặc định tốt vì đã cài sẵn.
- BiRefNet general: ứng viên local để benchmark; repo/model card chính thức cung cấp model segmentation và metadata MIT. Chưa đo chất lượng hoặc tốc độ trên máy này, không khẳng định sẽ giải quyết mọi lỗi.
- Photoroom: phương án API đối chứng nếu sau này anh chọn dùng cloud. Có positioning fit/padding và nền màu/nền ảnh tĩnh. Chưa gọi API, chưa gửi ảnh và chưa phát sinh chi phí; quyết định hiện tại của anh vẫn là local.
- RMBG-2.0: không coi weights tải về là mặc nhiên dùng thương mại; model card nêu non-commercial, cần xem điều khoản phù hợp trước khi chọn cho sản phẩm kinh doanh.

## Thí nghiệm trước khi tích hợp

1. Giữ nguyên baseline, ghi lại commit/worktree trạng thái, model và thông số.
2. Lập bộ tối thiểu 20 ảnh có nguồn sử dụng hợp lệ: giày đế trắng, sản phẩm tối màu, chai, hộp, túi có quai/lỗ, chi tiết mảnh, nền bận; ghi riêng ảnh trong suốt là nhóm khó. Hiện đã có ảnh giày của anh, chưa đủ bộ này; không nhận là đã benchmark 20 ảnh.
3. So sánh U2NetP và BiRefNet trên đúng cùng tập ảnh, cùng kích thước và thiết bị. Lưu ảnh gốc, alpha mask, cutout trên nền caro, ảnh cuối ở ba tỉ lệ, thời gian và bộ nhớ. Không thay model và bố cục cùng lúc khi đánh giá nguyên nhân.
4. Stage đầu chỉ nghiệm thu nền trắng. Gate đề xuất: không cắt chủ thể ở cả ba tỉ lệ; không mất logo/sọc/đế/quai; nền ngoài chủ thể đúng trắng; kích thước chính xác; không vật thể thừa; nội dung bên trong mask lấy từ ảnh gốc sau resize.
5. Review vùng biên ở mức zoom 100%, ghi fail theo nguyên nhân, so sánh trên cùng bảng ảnh. Ngưỡng thử nghiệm: ít nhất 18/20 ảnh sạch dùng được không sửa; không chấp nhận lỗi mất chủ thể. Đây là tiêu chí đề xuất, không phải kết quả hiện có hay chứng nhận chất lượng production.
6. Chỉ tích hợp ứng viên đạt gate. Sau đó mới đánh giá gradient, nền mẫu và AI lifestyle riêng. Ghi thời gian thực đo; chưa hứa SLA hoặc khả năng realtime.

## Nguồn chính thức đã đọc

- https://docs.photoroom.com/image-editing-api-plus-plan/positioning — fit subject/reference box vào target area, padding/alignment.
- https://docs.photoroom.com/image-editing-api-plus-plan/static-background — nền màu hoặc ảnh tĩnh.
- https://github.com/ZhengPeng7/BiRefNet — triển khai chính thức segmentation độ phân giải cao.
- https://huggingface.co/ZhengPeng7/BiRefNet/blob/main/README.md — model card và license metadata.
- https://huggingface.co/briaai/RMBG-2.0 — model card, hạn chế dùng weights non-commercial.
