# Mivy — bàn giao định hướng và trạng thái project

Cập nhật: 19/09/2026. File này dành cho Claude hoặc AI khác tiếp tục làm việc từ cuộc trao đổi với anh, không cần đọc lại lịch sử chat.

## 1. Cách làm việc với anh

- Gọi người dùng là **anh**, AI tự xưng **em**; không dùng tôi/bạn hoặc tao/mày để xưng hô.
- Anh là **Fullstack Mobile dev**, làm ReactJS/NextJS và biết một ít backend. Không gọi anh là “iOS dev”.
- Anh dùng nhiều công cụ AI để tiết kiệm hạn mức. Ghi lại quyết định, thay đổi và việc còn dang dở vào file này khi bàn giao.
- Anh ưu tiên làm được thật, không chỉ demo mock hoặc báo thành công vì API trả 200.

## 2. Mong muốn anh đã xác nhận

- Mivy tạo **full bộ quảng cáo/truyền thông**, gồm nội dung theo template và hình ảnh; có thể mở rộng video, landing page.
- Có nội dung cho TikTok, Shopee, Facebook… nhưng **không giới hạn vào bán hàng, shop hoặc thương mại điện tử**.
- Muốn học cách đóng gói sản phẩm từ các mô hình trong ảnh tham khảo để áp dụng tại Việt Nam.
- Về lâu dài muốn xây **công ty quảng cáo**, có thể dùng Mivy làm nền tảng vận hành.
- Chưa chốt một ngành, nhóm khách hàng hay mô hình thu phí cụ thể.

## 3. Các mô hình tham khảo và cách áp dụng

Các mô hình dưới đây do anh đưa trong ảnh. Số doanh thu, MRR và giá bán công ty trong ảnh **chưa được xác minh**; không dùng làm bằng chứng thành công của Mivy. Học quy trình và cách đóng gói, không sao chép thương hiệu, tài sản hay nội dung độc quyền.

| Mô hình | Điều đáng học | Hướng thử tại Việt Nam |
|---|---|---|
| Headlime | Viết nội dung theo template, đầu vào có cấu trúc | Bộ nội dung khai trương, tuyển sinh, tuyển dụng, ra mắt dịch vụ |
| HeadshotPro | Một kết quả chuyên biệt, bán theo gói | Bộ ảnh hồ sơ cá nhân/đội ngũ cho người tìm việc, tư vấn viên, doanh nghiệp |
| AvatarAI | Bộ hình cá nhân nhất quán | Avatar, ảnh bìa, thumbnail, nhân vật cho creator/giảng viên/streamer |
| AIDesigner | Tạo bộ thiết kế marketing từ mô tả | Poster, banner, bài đăng cho sự kiện, trung tâm đào tạo, quán ăn, phòng tập |
| Unicorn Platform | Landing page chuyên biệt theo nhu cầu | Trang khóa học/workshop/dịch vụ có nội dung, form đăng ký, liên hệ |
| BrandBird | Biến tài nguyên có sẵn thành hình truyền thông nhanh | Screenshot app/web thành ảnh giới thiệu tính năng, thumbnail, bộ ra mắt |
| Chuyển thiết kế tĩnh thành video | Giảm công học công cụ motion | Video demo ngắn từ screenshot hoặc bộ hình |

Điểm chung: **đầu vào đơn giản → đầu ra cụ thể, dùng được → tiết kiệm một quy trình nhiều bước**.

## 4. Hai hướng được đề xuất, chưa được anh chốt

### A. Bộ truyền thông cho một dịp

Khách chọn khai trương, tuyển sinh, sự kiện, tuyển dụng hoặc ra mắt; nhập thông tin và tài nguyên. Mivy trả về:

- Ý tưởng chủ đạo, thông điệp và tiêu đề.
- Bài đăng/caption/CTA.
- Poster và các biến thể hình đồng nhất.
- Kịch bản video ngắn; về sau có thể thêm video hoàn chỉnh và landing page.

Ví dụ: workshop làm gốm cuối tuần → poster, bài giới thiệu, bài nhắc lịch, story, kịch bản video.

Đây là hướng em đã nghiêng về vì phù hợp mục tiêu công ty quảng cáo. Cách mở rộng đề xuất: **một loại chiến dịch làm tốt → nhiều ngành dùng được → thêm loại chiến dịch**. Chưa có quyết định bắt buộc chọn workshop làm ngách đầu tiên.

### B. Bộ ra mắt cho người làm sản phẩm

Screenshot app/web + mô tả → ảnh giới thiệu tính năng, nội dung ra mắt, thumbnail, video demo ngắn. Gần kinh nghiệm và khả năng tự đánh giá của anh; cần kiểm chứng quy mô nhóm khách có thể tiếp cận ở Việt Nam, có thể thử khách quốc tế.

### Bước khám phá được đề xuất

Làm hai bộ demo hoàn chỉnh: **một workshop và một lần ra mắt app**. Đưa cho đúng hai nhóm khách xem và chào làm bộ tiếp theo có trả phí. Dùng phản hồi để chọn hướng, chưa xây một công cụ quá rộng ngay.

Việt hóa cần nằm ở template đúng tình huống, giọng văn, typography tiếng Việt, ngày giờ/địa điểm chính xác, chỉnh sửa dễ; không chỉ dịch giao diện.

## 5. Hình dung sản phẩm và kiến trúc (chưa triển khai)

Đơn vị sản phẩm đề xuất là **Campaign**, thay vì một job ảnh rời rạc.

Luồng: brief → chọn ý tưởng/template → sinh nội dung và hình đồng nhất → user chỉnh sửa → xuất bộ file theo kênh.

Brief cần hỗ trợ thương hiệu, đối tượng, mục tiêu, thông điệp, sự kiện/sản phẩm/dịch vụ, ngày giờ/địa điểm nếu có, ưu đãi nếu có, giọng văn, kênh và tài nguyên đầu vào. Không ép mọi chiến dịch phải có giá hoặc sản phẩm.

Các entity có thể bổ sung: `Brand`, `Campaign`, `Creative`, `Template`, `Asset`; `Product` là tùy chọn cho chiến dịch sản phẩm. Đây là đề xuất thiết kế, chưa phải schema đang tồn tại.

### Text quảng cáo

- Dùng API LLM ở giai đoạn đầu; chưa cần train model riêng.
- Chưa chọn nhà cung cấp/model, chưa cấu hình API key, chưa có module gen text.
- Dự kiến `CopywritingService`, đầu ra JSON có cấu trúc theo loại nội dung và kênh; có thể dùng endpoint `POST /v1/campaigns/{id}/copy` sau khi thiết kế Campaign.
- Template gồm cấu trúc thông điệp, các trường cần nhập và bố cục; ví dụ vấn đề → lợi ích → bằng chứng được cung cấp → ưu đãi nếu có → CTA.
- Cho sửa/copy/viết lại từng phần và lưu phiên bản đã chọn.
- Không tự bịa giá, tính năng, công dụng, bảo hành, bằng chứng, ưu đãi, ngày giờ hoặc địa điểm.
- Text và hình dùng chung brief/ý tưởng chiến dịch.

### Thiết kế hình

- Tách lớp: ảnh/tài nguyên gốc, nền, text/logo/giá/CTA.
- Render chữ bằng code để giữ đúng tiếng Việt và chỉnh sửa được; không giao toàn bộ chữ cho model ảnh.
- Đổi chữ hoặc bố cục không nên phải sinh lại nền AI.
- Workflow giữ sản phẩm hiện tại chỉ là một khả năng cho chiến dịch sản phẩm, không phải kiến trúc bắt buộc cho mọi loại chiến dịch.

## 6. Thị trường và cách kiểm chứng

- “Gen text + gen ảnh” chưa đủ khác biệt. Sapo đã có tạo nội dung AI, Photoroom có tạo nền/ảnh sản phẩm. Cơ hội được đề xuất là giao **bộ đầu ra hoàn chỉnh, ít phải sửa, đúng tình huống**.
- Nhu cầu và mức sẵn lòng trả tiền của từng nhóm khách Việt Nam vẫn là giả thuyết.
- Đề xuất bắt đầu bằng dịch vụ có người duyệt, dùng Mivy để tự động hóa dần; phù hợp hướng phát triển công ty quảng cáo.
- Đo: đầu ra có được đăng thật không, số lần chỉnh, thời gian làm, chi phí sinh lại, khách mua tiếp. Không hứa tăng doanh số nếu chưa đo.
- Đợt thử 4 tuần/10 cuộc trao đổi/5 khách thử; mốc 3 khách trả phí và 2 mua lại là **ngưỡng thử nghiệm từng được đề xuất**, không phải cam kết hay chuẩn thị trường. Điều chỉnh theo hướng anh chọn.
- Công ty quảng cáo về sau còn cần nghiên cứu khách hàng, chiến lược thương hiệu, vận hành quảng cáo và đo hiệu quả; phần mềm hiện chưa có các năng lực đó.

Nguồn tham khảo đã xem (không thay thế phỏng vấn khách):

- https://help.sapo.vn/su-dung-ai-tao-noi-dung-cho-san-pham-bai-viet
- https://www.photoroom.com/ai-product-photography
- https://vnexpress.net/shopee-tiktok-shop-chiem-8-thi-phan-nganh-ban-le-5005886.html

## 7. Trạng thái code thực tế

Workspace: `/Users/minh.nn1/Projects/personal/mivy/back-end`.

- Python 3.12, FastAPI, SQLAlchemy async, SQLite, queue xử lý từng job.
- Web hiện tại là HTML/CSS/JavaScript thuần trong `web/`, chưa phải React/NextJS.
- Có upload ảnh, tạo job, poll trạng thái, lấy ảnh kết quả; lưu dưới `data/`.
- API: `GET /health`, `POST /v1/generations/images`, `GET /v1/generations/{id}`, `GET /v1/generations/{id}/result`.
- Có mock engine và ComfyUI adapter. `.env` local đã chuyển sang `comfyui`; `.env.example` vẫn mặc định mock.
- Đã sửa dependency thành `sqlalchemy[asyncio]` để có greenlet.
- Chưa có Campaign, gen text, thư viện template marketing, editor nhiều lớp, tài khoản, thanh toán, đăng bài tự động hay analytics.

### ComfyUI local

- Cài tại `.comfyui/`, venv riêng `.comfyui/.venv/`.
- Máy local Apple Silicon 16 GB; đã xác nhận PyTorch nhận MPS.
- DreamShaper 8 tại `.comfyui/models/checkpoints/dreamshaper_8.safetensors`, đã kiểm tra SHA-256 khi tải.
- Nguồn model: https://huggingface.co/Lykon/DreamShaper/blob/main/DreamShaper_8_pruned.safetensors
- Workflow: `workflows/product_ad.json`.
- Custom node: `comfy_nodes/mivy_product/__init__.py`; dependencies ở `comfy_nodes/requirements.txt` (`rembg[cpu]==2.0.74`).
- `run-comfyui.sh` symlink custom node vào ComfyUI, đặt `U2NET_HOME` dưới `.comfyui/models/rembg/`.
- Model tách nền U2NetP đã tải tại máy này; nguồn thư viện: https://github.com/danielgatis/rembg
- Các thư mục runtime/model và dữ liệu local bị gitignore, không mặc định tồn tại khi clone sang máy khác.

### Lỗi chất lượng và phần sửa còn cần đánh giá

Workflow đầu tiên vẽ lại toàn ảnh, làm đổi kiểu giày/đế nhưng nền vẫn trơn. Anh phản hồi không có tác dụng. Smoke test chạy được không chứng minh đạt yêu cầu sáng tạo.

Đã sửa thành: resize/crop 512×512 → U2NetP tách sản phẩm → inpaint nền → composite sản phẩm gốc trở lại. KSampler 25 steps, denoise 1.0.

- Job mới `a16e5a86-2abb-4612-a736-2921ff3f4696` hoàn tất khoảng 20 giây.
- **Chưa hoàn tất visual QA ảnh của job này trước khi cuộc trao đổi chuyển sang sửa web. Không được báo chất lượng đã đạt.**
- Ảnh cần xem: `data/outputs/a16e5a86-2abb-4612-a736-2921ff3f4696.png`.
- Ảnh đầu vào: `data/uploads/cb72061f-515e-487a-abfd-59b08e16feb4.jpg`.
- Ảnh lỗi trước sửa: `data/outputs/280ef362-3b76-4ba5-819f-177b685436ae.png`.
- Có thể tồn tại job mới hơn do anh tự thử; đọc DB khi cần, không suy diễn nội dung/chất lượng.
- Workflow vẫn **luôn xuất 512×512**, dù UI có tỷ lệ 4:5/16:9. Chưa nối tỷ lệ vào pipeline.
- Center-crop có thể cắt mất tài nguyên; cần xem lại khi phát triển layout.
- Mask có thể lỗi ở biên, sản phẩm trong suốt hoặc nền phức tạp. Composite giữ góc gốc, không tạo được góc chụp mới.
- Negative prompt còn có `extra shoes`, `white background`; đang thiên về thử giày, chưa phù hợp mọi chiến dịch/template.

### Sửa web đã hoàn tất

Ảnh preview bị cắt do sizing trong grid. Đã sửa `#image-preview` tại `web/styles.css` sang absolute/inset 0, width/height 100%, object-fit contain, object-position center. Đã chọn ảnh giày trên browser và xác nhận hiển thị đầy đủ, giữa khung.

### Kiểm tra đã chạy

- Ruff pass; 8 tests backend pass ở lần kiểm tra gần nhất trong session trước.
- Có 2 deprecation warnings liên quan Starlette/httpx và AnyIO; không làm test fail.
- Đã có smoke test ComfyUI thật, nhưng tests hiện có không chứng minh chất lượng ảnh, nội dung hay mọi custom node.
- Chưa có bài kiểm chứng nhu cầu khách hàng hoặc khách trả phí.

## 8. Chạy lại

Từ thư mục project:

```bash
./scripts/run-local.sh
```

Chạy ComfyUI cổng 8188 và API/UI cổng 8000; script ép engine `comfyui`, reload chỉ theo dõi `app/`.

- UI: http://127.0.0.1:8000/ui/
- API docs: http://127.0.0.1:8000/docs
- ComfyUI: http://127.0.0.1:8188

Kiểm tra cổng trước khi chạy để tránh tạo tiến trình trùng. Không giả định server từ session cũ còn sống. Lần sửa CSS ngày 19/09 chỉ khởi động lại backend để kiểm tra web, chưa xác nhận ComfyUI đang chạy lại.

```bash
.venv/bin/ruff check .
.venv/bin/pytest -q
```

Không ghi API key/secrets vào tài liệu hoặc commit `.env`.

## 9. Điểm tiếp tục cho Claude

1. Đọc file này và README, kiểm tra code hiện tại trước khi sửa.
2. Giữ đúng định hướng **truyền thông đa mục đích**, không mặc định quay về shop giày hay chỉ bán hàng.
3. Phân biệt mong muốn đã chốt với đề xuất chưa được anh chọn; việc tạo file bàn giao không đồng nghĩa anh đã duyệt triển khai toàn bộ roadmap.
4. Nếu tiếp tục phần chất lượng ảnh: mở ảnh job mới nêu trên, đánh giá nền/biên/sản phẩm và báo thật những gì còn thiếu.
5. Nếu tiếp tục sản phẩm: chốt scope demo chiến dịch rồi đặc tả brief, đầu ra, template, editor và tiêu chí nghiệm thu. Có thể bắt đầu với demo workshop và ra mắt app đã đề xuất.
6. Sau mỗi phần, cập nhật trạng thái đã làm/chưa làm, lệnh chạy và hạn chế ở đây để chuyển tiếp giữa các AI.
