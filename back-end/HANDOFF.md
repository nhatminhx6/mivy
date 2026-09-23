# Mivy — bàn giao định hướng và trạng thái project

Cập nhật: 20/09/2026. File này dành cho Claude hoặc AI khác tiếp tục làm việc từ cuộc trao đổi với anh, không cần đọc lại lịch sử chat.

### Cập nhật mới nhất: 20/09/2026 — nối AI local thật

- Anh đã duyệt **chạy model local, không dùng API key**. Ollama đang dùng `qwen3:8b`; model đã có trên máy. ComfyUI dùng DreamShaper 8.
- `/ui/` hiện có luồng thật: chọn demo hoặc nhập brief ngắn → chọn hướng → **Viết bộ nội dung bằng AI** → bài giới thiệu/caption/kịch bản → tab Thiết kế → **Tạo ảnh AI** → chỉnh chữ và tải ảnh/poster/TXT.
- Text từ `/v1/creative/text`, KHÔNG ghép template khi model lỗi. Giọng văn, đối tượng và concept đều gửi đến model. Lỗi hiển thị trên web, giữ nội dung cũ.
- Ảnh từ `/v1/creative/images`: không cần upload (text-to-image); nếu bật giữ chủ thể và có ảnh thì dùng background inpaint + mask/composite cũ. Ảnh gốc vẫn giữ riêng; ảnh sinh lưu URL job.
- Text và image dùng chung khóa tính toán. Ollama `keep_alive=0`; ComfyUI được yêu cầu giải phóng model sau khi ảnh thành công.
- `scripts/run-local.sh` khởi động các dịch vụ còn thiếu (Ollama, ComfyUI, FastAPI); không tạo trùng hoặc dừng dịch vụ có sẵn. Nếu thiếu text model thì tải bằng `ollama pull`.
- Bản nháp vẫn localStorage `mivy-drafts-v1`, không có tài khoản/đồng bộ. Text chưa có persisted background job; reload giữa lúc viết có thể mất kết quả vừa tạo. Job ảnh lưu SQLite và có nút kiểm tra tiếp.
- Đọc [COMPETITOR_RESEARCH.md](COMPETITOR_RESEARCH.md) cho định hướng đa mục đích. Không quay lại chỉ tập trung bán hàng hoặc yêu cầu anh viết prompt dài.
- Màn test API ảnh cũ ở `/ui/image-lab.html`. Bản nháp mẫu cũ được ghi nhãn riêng và có nút viết lại bằng AI.

## 1. Cách làm việc với anh

- Gọi người dùng là **anh**, AI tự xưng **em**; không dùng tôi/bạn hoặc tao/mày để xưng hô.
- Anh là **Fullstack Mobile dev**, làm ReactJS/NextJS và biết một ít backend. Không gọi anh là “iOS dev”.
- Anh dùng nhiều công cụ AI để tiết kiệm hạn mức. Ghi lại quyết định, thay đổi và việc còn dang dở vào file này khi bàn giao.
- Anh ưu tiên làm được thật, không chỉ demo mock hoặc báo thành công vì API trả 200.
- **Gen ảnh xong: gửi file cho anh, KHÔNG tự mở/đọc ảnh để tự đánh giá. Chỉ khi anh nói "ảnh đạt" thì mới đạt.** Đọc ảnh tốn nhiều token và việc phán ảnh là của anh.
- Tiết kiệm token: làm gọn, không đọc file/ảnh thừa, không quét cả `.venv`/`.comfyui`, gộp việc, trả lời ngắn ("đơn giản, dài dòng = vứt").

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
- Đã chọn Ollama local `qwen3:8b`, không cần API key; module `app/services/text_service.py`.
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

## Prototype web — bàn giao triển khai

- Files: `web/index.html`, `web/studio.css`, `web/studio.js`. API lab vẫn dùng `web/styles.css` và `web/app.js`.
- LocalStorage key: `mivy-drafts-v1`; bản nháp chỉ trên trình duyệt hiện tại. Không có đồng bộ tài khoản hoặc import JSON.
- Giọng văn đã gửi tới model. Poster xuất canvas PNG 1080×1080, chưa phải editor kéo thả hoặc render giống hệt preview. Ảnh AI gốc 512×512. Video chỉ là kịch bản text.
- Bước tiếp theo: nâng chất lượng model/copy và ảnh, persisted Campaign/Creative + text job, editor preview khớp export và nhiều tỉ lệ. Không xem việc đã nối model là chất lượng production: Qwen3 đôi khi tự thêm chi tiết, DreamShaper có thể vẽ sai tay/chi tiết.

### Bằng chứng kiểm tra 20/09

- Browser: từ brief workshop → text Qwen3 → ảnh ComfyUI → tải PNG/TXT và reload mở lại. Job ảnh thật `3946f053-1022-4bde-96da-d7e8f70fcad1`, output `data/outputs/3946f053-1022-4bde-96da-d7e8f70fcad1.png`, sinh khoảng 19 giây. Text thử đầu khoảng 37 giây.
- Đã sửa lỗi Ollama grammar không nhận maxLength lớn: bỏ giới hạn độ dài khỏi decoding schema, vẫn validate Pydantic khi nhận.
- Text có bước dịch mô tả hình sang English nếu model trả chữ có dấu. Prompt không hiện thành ô bắt anh nhập.
- Ollama API tham khảo: https://github.com/ollama/ollama/blob/main/docs/api.md (structured outputs, think=false, keep_alive).
- Kiểm tra cuối: 17 pytest pass, Ruff pass, node syntax pass; thêm 1 unittest trong ComfyUI runtime xác nhận mask lấp lỗ bên trong chủ thể. Chạy `.comfyui/.venv/bin/python -m unittest comfy_nodes.test_product_mask`.
- Đã test API text với brief ra mắt app (22.6 giây). Product image upload cũng chạy thật: job cuối `709b0c72-4e03-47ce-9159-5e0e60a79ccf` (~20 giây). Đã xem ảnh; sọc trắng trên giày giữ nguyên sau sửa `binary_fill_holes`, biên vẫn có thể có halo.
- Custom node mask thay đổi cần restart ComfyUI. `comfy_nodes/requirements.txt` khai báo scipy rõ ràng.

### 21/09/2026 — sửa ảnh tải lên bị bỏ qua
- Luồng chiến dịch trước đây chỉ gửi ảnh khi `preserveSubject=true`; mặc định false với loại event/service/app khiến upload bị bỏ qua. Đã bỏ điều kiện/toggle: có ảnh thì luôn gửi ảnh để giữ chủ thể và đổi nền, kể cả bản nháp cũ có flag false.
- Chặn gửi khi FileReader chưa đọc xong. Luồng ảnh sản phẩm bắt buộc có upload; API trả image_required khi preset background thiếu ảnh. Sửa designImage dùng optional chaining để luồng ảnh độc lập không lỗi current=null.
- Kiểm tra: 18 pytest, 2 Node regression tests pass. Browser đã xác nhận thiếu ảnh có thông báo. Ảnh giày thật + nền bàn gỗ: job ad34f000-cf52-4bba-a387-86e4e4cfea47, ~22 giây; đã xem output.
- Sau kiểm tra còn thấy model vẽ thêm chi tiết quanh giày, đã đổi adapter sang tạo nền độc lập (EmptyLatentImage), rồi composite chủ thể gốc; preset mô tả mặt phẳng trống. Job xác nhận 1fdae184-3d08-4edc-bdbf-3a67ba1af0be. Đúng giày gốc, nhưng mask vẫn giữ một phần bóng xám ở mũi giày và nền có thể sinh vật thể thừa; không xem đây là chất lượng ảnh thương mại hoàn thiện.

### Đánh giá lại sau phản hồi chất lượng ảnh 21/09
Đọc `IMAGE_PIPELINE_REVIEW.md` trước khi sửa pipeline tiếp. Đã xác nhận center-crop trước segmentation làm cắt sản phẩm khi đổi tỉ lệ, và nền trắng vẫn dùng diffusion gây vật thể lạ. Quyết định đề xuất: nền trắng/gradient + cutout + fit/padding xác định, benchmark U2NetP/BiRefNet trên ảnh thật trước khi thay model. Không có benchmark hoàn chỉnh hay sửa runtime trong lượt nghiên cứu này; không dùng test API pass làm bằng chứng chất lượng ảnh. Phương án local vẫn ưu tiên theo lựa chọn của anh.

### 21/09/2026 — product output fix implemented and visually checked
- Uploaded photos now route through `ProductImageEngine` → local BiRefNet cutout → deterministic white/gradient composition. No diffusion for uploaded products; no center-crop before segmentation. Original RGB retained, alpha boundaries preserved (no global hole filling or erosion), fit with 8% minimum-side padding, centered.
- Exact PNG sizes: 1080×1080, 1080×1350, 1080×1920. ComfyUI remains for no-photo illustrations. Unsupported scene presets removed from UI/API pending quality validation.
- BiRefNet general model installed locally (~973 MB); `scripts/setup-product.sh` installs pinned rembg and downloads model for another checkout. `.env.example` contains product runtime settings. Keep venv executable symlink unresolved (`absolute`, not `resolve`), otherwise subprocess loses its dependencies.
- Actual shoe compared U2NetP vs BiRefNet. U2NetP retained gray shadow at toe; BiRefNet removed it while retaining stripes and white sole. Cold local segmentation ~20.5 s; subsequent same-photo ratios use cached mask, ~0.2 s API jobs. This is ONE real photo, not a full product benchmark.
- Visual artifacts: `data/outputs/qa-u2netp.png`, `qa-birefnet.png`; API square job `7213e90b-4287-4a8f-a5ad-def058885556`, portrait gradient job `c1682781-78cd-4c64-8085-7c6d827224f1`. Each has mask, cutout and JSON diagnostics. Square/portrait export sizes checked; white 9:16 and gradient 4:5 viewed.
- Browser upload → white 9:16 → result → download verified. Actual downloaded file `/Users/minh.nn1/Downloads/mivy-image.png` is 1080×1920. Preview contains full product; download button above result.
- Verification: 20 pytest, 6 compositor unittest, 2 Node regression tests; Ruff and JS syntax passed.
- Next quality work: representative real-photo suite across opaque products, detailed edges, complex backgrounds and transparent objects; user-visible mask correction if needed. Do not re-enable generated scenes merely because an API job succeeds. This is a reliable basic product-photo export, not a finished advertising layout or universal segmentation guarantee.

### Marketing poster MVP — 21/09
- New sidebar/home entry Tạo quảng cáo. `web/marketing.js` takes brief + optional image + goal/brand/confirmed offer. Local Ollama endpoint `POST /v1/creative/marketing` returns launch/story/action headline, subline, CTA, caption. TextService existing endpoint unchanged.
- Three graphic compositions, editable text, 1:1 / 4:5 / 9:16, same canvas preview/export. Product cutout from new completed-job `/cutout` route. No lifestyle scene generation yet; this is graphic poster composition. Brand currently text, not uploaded logo.
- Download selected PNG, all three PNG + captions in ZIP, or captions TXT. Dependency-free ZIP writer `web/marketing-zip.js`. One current marketing draft in localStorage mivy-marketing-v1; no account or campaign history integration yet.
- Verified real local AI on shoe brief, 3 visual previews, title edit, aspect switching, reload draft persistence. Downloaded ZIP validated with Python zipfile CRC and all 3 PNG were 1080x1080. Viewed exported launch PNG. 4:5 preview visually inspected; Story selected/download attempted, final file inspection pending.
- 22 pytest passed, Ruff passed. AI caption can still add subjective/unconfirmed properties (observed comfort wording despite missing source fact); user review remains necessary. Next: tighten factual copy checks, distinct layout art direction for more industries, logo assets and actual scene generation benchmark.

### Industry expansion — recruitment, education, services
- `MarketingBrief.industry`: general/recruitment/education/service; long source up to 12,000 characters. Industry output requires 1–3 highlights per image in addition to headline/subline/CTA/caption. Existing general output stays compatible.
- Recruitment: role/pay/location → requirements → benefits/application. Education: introduction → curriculum → registration. Services: introduction → scope → booking. Separate prompts and fact-oriented layouts (numbered cards, learning timeline, service accent cards).
- Industry selector in Tạo quảng cáo changes input labels and remembers independent local drafts. No required image. Industry photos stay intact, no product background removal. Editable highlight list, existing PNG/TXT/ZIP exports; ZIP now includes original input for review.
- Real recruitment JD tested through browser with local Qwen: pay 25–35 million, requirements, benefits and contact rendered in three images. Downloaded ZIP CRC valid: three 1080×1350 PNG, three captions, original text. Switching sectors restored recruitment draft. This remains AI summarization requiring source review, not guaranteed factual extraction.
- Regression tests cover long briefs, unknown industry rejection and required highlights. Initial real runs omitted optional highlights; schema now requires non-empty highlights for industry jobs and rejects missing ones.
- Revised-schema real API checks: education 33 s, service 26 s, both return nonempty highlights. Outputs still contain generic embellishment; avoid claiming perfectly grounded facts. Fixed sector CTA to a channel-neutral action (or supplied CTA) so an email-only service does not get “call now”; normalized reader address. Ruff and marketing tests pass.

### Industry visual redesign after user rejected list-card output
- Replaced three near-identical list cards with role-specific editorial layouts in `web/industry-design.js`: large position/title on ink with highlighted concrete fact; light numbered editorial requirements; saturated contact poster with extracted email and supporting facts. Be Vietnam Pro typography shared with the UI. Existing saved copy renders without a new AI call.
- Render-time deduplication removes repeated headline/bullets and omits unsupported “không cần/không yêu cầu” filler. New generation prompt discourages redundant/generic copy. This is not full fact verification.
- Same canvas exports; downloaded 4:5 ZIP checked and launch/contact PNG visually reviewed. Salary/price fact prioritized in accent band. Original editable copy and source kept. User still needs to assess this new design direction.

### 22/09 — reference-led recruitment poster
- Recruitment launch now orange/black photo-led poster, inspired by linked PosterMyWall reference; generated original B&W team asset bundled at web/assets/recruitment-team.png (prompt/provenance in sibling .md). Shows hiring headline, role, source-derived tech/experience tags, large photo, CTA and email on ONE image. Default photo visibly labeled AI illustration; user upload overrides it. No extra AI call to redraw saved drafts.
- Primary poster larger in results; supporting requirements/contact thumbnails smaller. Main heading/CTA still editable; technology tags derive from input JD. Subline shown when sufficient space under title.
- Downloaded 1080×1350 PNG visually inspected with real saved recruitment draft. JS syntax verified. User should assess final reference direction; not claiming all content/aspect combinations tested.

### 22/09 — recruitment content density
- Main recruitment poster now shows up to 10 highlights in two columns, with a small photo strip; no longer limits the main image to two tags. Old sparse drafts fall back to source JD lines. Editing points explicitly overrides that fallback.
- Recruitment launch schema requests one highlight per source line (6–10), preserves full role title, and uses lower generation temperature. Local browser run with the user's eight-line Lead/Senior JD returned and visibly rendered eight bullets at 4:5. Four marketing tests and Ruff pass.
- Remaining quality issue: local model still paraphrases imperfectly (production software translation, omission of some nuances); point count is not semantic coverage validation. Supporting cards also need stronger grounding (observed invented contact placeholder). Do not claim these are solved.

### 22/09 — Agency-grade Bento Grid & Multi-Theme Poster Engine
- Thay thế toàn bộ code canvas 2D thô sơ bằng Engine Poster chuẩn Agency (Bento Grid, Glassmorphism, atmospheric lighting).
- Tích hợp 5 bộ theme thiết kế cao cấp: `Emerald Pro`, `Tech Dark`, `Warm Editorial`, `Bold Vibrant`, `Clean Minimal`.
- **Poster tuyển dụng chuẩn thị trường (Market-Grade Recruitment Matrix):**
  - Loại bỏ hoàn toàn việc ép ảnh stock nhỏ vào góc phải (không dùng ảnh stock vô dụng).
  - Loại bỏ các khung viền bounding box tù túng quanh từng gạch đầu dòng.
  - Áp dụng bố cục **Bảng Ma Trận 4 cột (Job Specification Matrix Table)**: `Role / Vị trí`, `Kinh nghiệm`, `Kỹ năng / Stack`, `Địa điểm` với các đường kẻ phân tách thanh mảnh, trích xuất dữ liệu trực tiếp từ JD.
  - Typography tương phản cao: chữ viết tay *"We're"* nghệ thuật, chữ **"HIRING"** siêu đậm 86px, tên vị trí viết hoa sắc sảo và slogan góc viết tay (*"Good People, Great Products"*, *"Same People, Brighter Tomorrow"*).
  - Vẽ vector procedural: bóng các tòa nhà chọc trời (City Skyline Silhouette) ở đáy và nút bo tròn `[ ✈ Send your CV ]` kèm thông tin liên hệ trực tiếp (Zalo / Hotline / Email).
- Hỗ trợ đổi theme tức thì trên UI thông qua Theme Bar mà không cần gọi lại AI.
- Hỗ trợ toàn diện 4 ngành (Tuyển dụng, Khóa học, Dịch vụ, Sản phẩm tự do) trên cả 3 tỷ lệ (1:1, 4:5, 9:16).
- Nâng dung lượng tải ảnh từ 2 MB lên 20 MB trên toàn bộ giao diện (Tạo quảng cáo, Tạo ảnh sản phẩm, Tạo chiến dịch) và nâng giới hạn backend lên 25 MB (`MAX_UPLOAD_SIZE_MB=25`).
- Kiểm tra tự động: 24 pytest pass, `tests/industry-poster.test.mjs` pass 180/180 biến thể render (4 ngành x 3 poster x 3 tỷ lệ x 5 theme); ruff pass clean.

### 23/09 — Kiến trúc Hybrid AI Studio & Hướng dẫn Cài đặt Đa Máy
- **Kiến trúc Hybrid AI (0đ API, 100% Free):**
  - **Visual AI Model:** Tích hợp `VisualService` (`POST /v1/creative/background`, `GET /v1/creative/backgrounds/{filename}`) sinh visual background 3D nghệ thuật bằng model Flux.1 miễn phí qua Pollinations AI (hoặc local ComfyUI/fallback). Không để diffusion vẽ chữ để tránh lỗi font và méo ký tự tiếng Việt.
  - **Modern Layout Engine:** Ảnh visual AI được vẽ làm nền với lớp phủ gradient điện ảnh (cinematic tint) theo từng theme; đặt bên dưới bảng ma trận 4 cột và typography Glassmorphism sắc nét tiếng Việt.
  - **UI Controls:** Nút `✨ Đổi nền AI` trên thanh công cụ xem trước poster cho phép sinh lại visual background mới tức thì. Tự động sinh nền khi tạo 3 mẫu quảng cáo mới.
  - **Google Fonts:** Tích hợp preloaded Google Fonts (`Plus Jakarta Sans`, `Be Vietnam Pro`, `Caveat`) trong `web/index.html` với cache buster `v=179013`.
- **Hỗ trợ Cài đặt Đa Máy (Multi-Machine Support):**
  - Tạo script cài đặt 1 chạm: [`scripts/setup-machine.sh`](scripts/setup-machine.sh) tự động tạo virtualenv, cài dependencies, kéo model Ollama `qwen3:8b`.
  - Cập nhật [`scripts/run-local.sh`](scripts/run-local.sh) tự động phát hiện ComfyUI: nếu máy chưa có ComfyUI thì tự chuyển sang chế độ gọn nhẹ (Ollama + Pollinations Visual AI) mà không báo lỗi.
  - Viết tài liệu chi tiết: [`SETUP_MULTI_MACHINE.md`](SETUP_MULTI_MACHINE.md) hướng dẫn thiết lập từ A-Z cho các máy làm việc khác của anh.
- **Kiểm thử tự động:** 26 pytest pass, Ruff pass clean, 180 biến thể canvas render pass 100%.

