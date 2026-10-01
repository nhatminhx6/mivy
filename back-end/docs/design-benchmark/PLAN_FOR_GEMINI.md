# MIVY — Model tạo thiết kế thương mại: kế hoạch triển khai và nghiệm thu

Ngày 25/09/2026. Ưu tiên mới do anh chốt: chất lượng thiết kế đầu ra, trước mở rộng tính năng.
Codex phụ trách spec, bộ đề và review; Gemini triển khai, chạy model và bàn giao bằng chứng. Đây là kế hoạch, chưa có kết quả benchmark.

## 1. Kết quả cần đạt

Từ brief ngắn + nội dung bắt buộc + ảnh tùy chọn, model tạo một thiết kế marketing hoàn chỉnh: concept, hình chủ đạo, typography, bố cục, chi tiết đồ họa, màu và ánh sáng có chủ đích. Đầu ra phải dùng được cho truyền thông đa ngành, Việt/Anh/trộn. Không coi đổi màu template, thêm hiệu ứng hoặc tăng resolution là cải thiện thiết kế.
Mốc đầu tiên: ít nhất một hướng tạo ra bộ ảnh được anh duyệt có thể dùng thương mại. Không mở rộng ngành, video, landing page trong đợt này.

## 2. Giữ công việc đang có

Repo đang có thay đổi chưa commit của Gemini ở backend/frontend/tests. Đọc và giữ nguyên; không reset/ghi đè để bắt đầu lại. Frontend hiện hành là /web ở gốc repo; back-end/web là legacy.
Tạo nhánh thử nghiệm theo quy ước repo nếu phù hợp; không thay mặc định sản phẩm trước khi nghiệm thu.

## 3. Khảo sát khả năng thực thi trước khi viết adapter

Ứng viên tham khảo từ lượt research trước: Ideogram 4, Gemini image/Nano Banana Pro, Qwen Image. Đây chưa phải phiên bản đã kiểm chứng hay model đã thắng.
- Xác minh tên model/endpoint còn dùng được từ tài liệu chính thức; khả năng sinh toàn poster, nhận ảnh tham chiếu, Việt/Anh, giấy phép thương mại, cấu hình chạy và chi phí. Ghi URL và ngày vào capability-matrix.md.
- Kiểm tra phần cứng, runtime, model đã cài và cấu hình credentials (chỉ báo có/không; không in secret).
- Giữ quy định GEMINI.md: không tự dùng API tính phí. Chỉ chạy local hoặc quota miễn phí đã có và được phép. Không tự đăng ký, mua quota, cài model rất lớn trước khi kiểm tra bộ nhớ/dung lượng.
- Nếu ứng viên không chạy được trong điều kiện hiện tại, ghi BLOCKED với lý do và phương án cụ thể. Không thay bằng model khác rồi gắn tên ứng viên; không gọi background-only là full-design.
- Nếu không có ứng viên khả dụng, hoàn thành harness offline và báo blocker. Không tuyên bố có kết quả ảnh thật. Quyết định chi phí cần anh quyết riêng.

## 4. Thử nghiệm trước tích hợp

Tạo harness CLI riêng trước, không xây thêm dashboard. Input: case_id, model/provider, output_language, aspect, exact_text[], brief, optional product/reference assets, seed nếu hỗ trợ.
Output: ảnh gốc model + manifest JSON với model ID thật, prompt chính xác, input hashes, tham số, thời gian, chi phí nếu biết, lỗi, đường dẫn ảnh. Không ghi khóa hoặc header bí mật.
Provider có generate_full_design(); capability flags rõ ràng. Không vẽ đè template cũ lên ảnh khi chấm. Text raster không được quảng cáo là editable; giữ workflow cũ độc lập.

Pilot: 3 case lõi trong cases.json × tối đa 2 model khả dụng × 2 lần = tối đa12 ảnh. Nếu chỉ một model khả dụng, chạy và báo chưa có đối chứng. Dùng cùng brief/nội dung/tỷ lệ; ghi riêng prompt adaptation theo provider. Không chọn một ảnh đẹp rồi giấu các lần hỏng.
Sau pilot, chỉ model đủ triển vọng mới chạy biến thể ngôn ngữ và tham chiếu. Không lặp gen vô hạn để tìm ảnh đẹp; mỗi vòng sửa prompt có version và giới hạn2 lần/case.

## 5. Bộ đề và tài nguyên

Dùng cases.json làm nguồn nội dung cố định. Tất cả dữ liệu là fixture demo, không phải cam kết thực của MIVY.
- recruitment-mixed: tám yêu cầu kỹ thuật; chữ nhiều; không tự thêm lương/email/địa điểm.
- product-vi: dùng ảnh giày do anh cung cấp. Gemini phải xác định đúng ảnh sản phẩm gốc trong repo hoặc attachment còn tồn tại, ghi hash/path. Không dùng screenshot poster lỗi làm sản phẩm chuẩn; thiếu asset thì báo case bị chặn.
- course-en: quảng bá khóa học bằng tiếng Anh, có thông tin cụ thể cố định.
- Chạy thêm recruitment-en và course-vi để kiểm tra cùng chủ đề qua hai ngôn ngữ.

Tìm2 mẫu tham chiếu cho mỗi case từ nguồn thiết kế công khai. Ghi nguồn và đặc điểm học được (concept, nhịp bố cục, hình chủ đạo, chi tiết), phân biệt đề xuất của Gemini với mẫu anh đã duyệt. Không lấy chính output cũ bị chê làm chuẩn; không chép logo/nội dung/asset không có quyền. Chỉ gửi ảnh tham chiếu tới provider khi có quyền sử dụng.

## 6. Chấm đầu ra: hai lớp độc lập

A. Kiểm tra có thể tự động:
- Decode ảnh, đúng tỷ lệ, không ảnh rỗng/placeholder, manifest đầy đủ, lỗi provider không thành success.
- OCR nếu có: đối chiếu exact_text; chuẩn hóa Unicode NFC và khoảng trắng, không bỏ dấu, chữ số hay dấu câu quan trọng. OCR không chắc thì needs_review, không tự coi đạt.
- Fixture bảo đảm tám ý JD có mặt, nguyên tên/công nghệ/số liệu. Đếm bullet không chứng minh giữ đủ ý.
- Timeout, response lỗi, model unavailable, quota exhausted và retry giới hạn. Không tự đổi provider hay tự lược chữ để pass.

B. Review trực quan thủ công, mỗi tiêu chí1–5:
1) Concept và hình chủ đạo phù hợp thông điệp, không stock/abstract trang trí vô nghĩa.
2) Hình ảnh và chi tiết: chất liệu, ánh sáng, độ nhất quán, không vật thể méo hoặc chi tiết AI lỗi.
3) Typography: Việt/Anh đúng, phân cấp rõ, đọc được ở kích thước hiển thị điện thoại.
4) Bố cục, cân bằng, khoảng thở, ảnh–chữ phối hợp.
5) Nhận diện và tính hoàn thiện: các yếu tố thống nhất; không chỉ là template đổi màu.
6) Đúng brief và có thể sử dụng: giữ sản phẩm/logo, không thông tin bịa.

Loại trực tiếp: sai giá/email/ngày, thiếu ý bắt buộc, sai dấu làm đổi nội dung, biến dạng sản phẩm, cắt chữ, thêm business facts. Nếu OCR có lỗi nhưng người đọc xác nhận đúng thì ghi override có bằng chứng.
Điều kiện đề xuất qua vòng: không lỗi loại trực tiếp, mỗi tiêu chí>=4/5 do reviewer chấm. Đây là rubric nội bộ, không phải benchmark thị trường. Anh là người chốt thẩm mỹ, không để model tự chấm rồi tự duyệt. Cho xem tất cả output cạnh nguồn và mẫu tham chiếu.

## 7. Tích hợp sau khi anh duyệt

Chỉ lúc đạt pilot mới thêm chế độ thử vào Next.js: nhập brief + ảnh → chọn hướng thiết kế → tạo → xem/tải ảnh. Provider config ở backend, secrets không ra browser. Job bất đồng bộ có trạng thái thật; giữ kết quả trước khi retry. Ghi ngôn ngữ vào draft. Không xây editor giả cho chữ đã raster hóa.
Nếu full-design đẹp nhưng chữ chưa đạt, thử riêng pipeline hybrid do model tạo art direction + visual và lớp chữ kiểm soát được. Chấm riêng, không mặc định quay về template cũ hoặc trộn kết quả với full-design.

## 8. Bàn giao để Codex test lại

- capability-matrix.md, lệnh chạy offline/live, dependencies cần thiết, cases đã chạy/bị chặn.
- reports/<run_id>/manifest.json + ảnh gốc từng lượt + contact sheet và scorecard trống/chấm có người ghi tên.
- Tests tự động thực sự chạy được; kết quả pass/fail, không sửa spec để hợp thức hóa lỗi.
- Danh sách code thay đổi; hạn chế còn lại; hướng có/không đủ triển vọng và bằng chứng.
- Không ghi “commercial-ready” khi chưa có anh duyệt. Không gọi mock/stub là live test.

## Prompt giao Gemini

Đọc tài liệu này, cases.json và GEMINI.md. Triển khai bước3–6 trước: xác minh model thực thi được, harness, test và pilot ảnh thật trong phạm vi miễn phí/local được phép. Chưa tích hợp thay luồng chính hay làm feature mới. Giữ các thay đổi hiện có. Nếu thiếu provider/asset/quota hãy báo cụ thể, không fake output. Bàn giao ảnh gốc và manifest để Codex review, anh duyệt. Chỉ làm bước7 sau khi có kết quả đạt và anh đồng ý hướng thiết kế.
