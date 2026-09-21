# Nghiên cứu tính năng tham khảo cho Mivy

Ngày tra cứu: 19/09/2026. Mục tiêu: phác thảo web Mivy phục vụ truyền thông đa mục đích, không chỉ bán hàng. Tài liệu dành cho anh và AI tiếp tục triển khai.

## Phạm vi và mức xác minh

- Đã đọc trang sản phẩm/help center chính thức dưới đây. Đây là tính năng nhà cung cấp công bố, chưa thử bằng tài khoản trả phí và chưa benchmark chất lượng tiếng Việt.
- Không xác nhận MRR, doanh thu, hiệu quả chuyển đổi hoặc giá bán công ty trong ảnh tham khảo.
- Cột “Áp dụng” và các phần thiết kế Mivy là đề xuất của em, không phải tính năng đã triển khai hoặc quyết định anh đã duyệt.
- Web hiện tại là **màn test API ảnh cho dev**, không phải luồng sản phẩm. Không bắt người dùng viết prompt kỹ thuật dài. Anh yêu cầu phác thảo tính năng trên web trước.

## 1. Các app trong ảnh

| App | Tính năng công bố đã tìm thấy | Đề xuất áp dụng vào Mivy |
|---|---|---|
| Headlime | Sinh nội dung quảng cáo/headline; template nội dung; blog editor; landing page builder; tài liệu theo biến/CSV; cộng tác | Chọn loại nội dung → điền thông tin ngắn → nhiều phương án; cho lưu template riêng. Học cấu trúc quy trình, không sao chép thư viện mẫu |
| HeadshotPro | Upload selfie, chọn nền/trang phục, nhận bộ ảnh; sửa ảnh; đội ngũ dùng bộ style do admin chọn | Chọn phong cách bằng hình, hướng dẫn và kiểm tra ảnh đầu vào, kết quả theo bộ; giữ ảnh chân dung chuyên biệt cho giai đoạn sau |
| AvatarAI / Photo AI | AvatarAI hiện chuyển đến Photo AI; avatar tồn tại dạng photo pack. Có bộ ảnh theo chủ đề, model cá nhân và remix | Bộ phong cách thương hiệu cá nhân, chọn pack thay vì viết prompt; nhất quán nhân vật là hạng mục cần đánh giá riêng |
| AIDesigner | Hiện bao gồm UI web/mobile, brand kit, logo, quảng cáo, infographic; chỉnh từng phần và giữ ngữ cảnh thương hiệu | Một ý tưởng → nhiều tài nguyên đồng nhất; chỉnh riêng chữ/ảnh/phần bố cục mà không bỏ bản đang tốt |
| Unicorn Platform | Website không cần code, template trang/section, AI chỉnh nội dung, responsive, blog, custom code, Stripe | Landing page từ thông tin chiến dịch, tái sử dụng headline/ảnh/CTA; triển khai sau bộ nội dung và thiết kế |
| BrandBird | Screenshot → hình social; preset nền, hiệu ứng 3D, mockup thiết bị, annotation, watermark, kích thước theo kênh, xuất ảnh | Nhánh ra mắt app/web: screenshot + tiêu đề → hình tính năng, mockup và thumbnail; không cần sinh lại UI trong screenshot |
| SuperMotion — khả năng cao là dòng video không ghi tên | Screenshot/screen recording → video quảng bá; có template và các mục zoom, mockup browser, text, nhiều cảnh | Biến bộ hình/screenshot thành video ngắn bằng chuyển động có sẵn; hợp lý hơn việc bắt đầu bằng toàn bộ video generative |

Nguồn từng app:

- [Headlime](https://headlime.com/) — trang còn đề cập GPT-3 và việc kết hợp Conversion.ai; không suy ra công nghệ hiện hành hay trạng thái vận hành chỉ từ landing page.
- [HeadshotPro](https://www.headshotpro.com/) — không dùng các cam kết chất lượng/tốc độ của nhà cung cấp làm cam kết cho Mivy.
- [AvatarAI chuyển hướng](https://avatarai.me/) và [Photo AI avatar](https://photoai.com/ai-avatars).
- [AIDesigner](https://www.aidesigner.ai/) — phạm vi hiện rộng hơn mô tả “thiết kế marketing” trong ảnh; chưa xác minh thông tin founder/doanh thu của ảnh.
- [Unicorn Platform](https://unicornplatform.com/).
- [BrandBird](https://www.brandbird.app/).
- [SuperMotion](https://www.supermotion.co/) và [trang có giới thiệu Jim Raptis](https://www.supermotion.co/pricing). Dòng cuối ảnh không có tên nên nhận diện SuperMotion vẫn là suy luận.

## 2. App tương tự đáng học thêm

| App | Tính năng công bố | Điều nên học |
|---|---|---|
| Predis.ai | Post, carousel, video, caption; gợi ý ý tưởng; brand colors/logo; chỉnh template; lịch nội dung, duyệt bài, xuất bản nhiều tài khoản | Quy trình từ ý tưởng đến bộ nội dung và duyệt; gần hướng Mivy muốn phục vụ cả creator, dịch vụ, doanh nghiệp và agency |
| Jasper | Brand Voice từ bài mẫu; thông tin thương hiệu; công cụ cho chiến dịch nhiều kênh | Nhớ cách viết và dữ kiện thương hiệu để không phải nhập lại; dùng cùng brief cho các đầu ra |
| Canva | Magic Resize chuyển thiết kế sang nhiều kích thước, tạo bản sao và khôi phục qua lịch sử phiên bản | Một thiết kế có biến thể theo kênh; đổi tỷ lệ phải điều chỉnh bố cục chứ không chỉ kéo giãn ảnh |
| Adobe Express | Brand kit lưu logo/màu/font; template có các giới hạn thương hiệu; resize | Editor đủ đơn giản cho người không chuyên; giữ các yếu tố thương hiệu nhất quán |
| AdCreative.ai | Tạo banner, text, ảnh và video; có creative scoring và công cụ xem thông tin creative | Sinh và so sánh nhiều phương án. Chưa làm điểm “dự đoán chuyển đổi” khi Mivy chưa có dữ liệu kiểm chứng |
| Jitter | Template motion, nhập thiết kế Figma, chỉnh layer/animation, cộng tác, xuất video/GIF/Lottie | Animation từ thiết kế đã có; preview từng cảnh, thay text/ảnh mà giữ chuyển động |

Nguồn:

- [Predis features](https://predis.ai/features/).
- [Jasper Brand Voice](https://help.jasper.ai/hc/en-us/articles/18618693085339-Brand-Voice), [Jasper cho brand marketers](https://www.jasper.ai/solutions/by-role/brand-marketers).
- [Canva Resize](https://www.canva.com/en_gb/help/resize-variantb/).
- [Adobe Express brand kit](https://community.adobe.com/announcements-327/how-to-set-up-and-use-brand-kits-in-adobe-express-1629072), [Adobe on-brand creation](https://business.adobe.com/products/express-business/scale-on-brand-content.html).
- [AdCreative.ai](https://www.adcreative.ai/), [help center tính năng](https://help.adcreative.ai/en/collections/11004452-creative-tools-features). Những lời hứa tăng chuyển đổi trên trang là claim marketing, không phải kết quả đã kiểm chứng trong nghiên cứu này.
- [Jitter overview](https://help.jitter.video/en/articles/12089209-what-is-jitter), [Jitter templates](https://help.jitter.video/en/articles/14788758-create-from-a-template).

## 3. Kết luận thiết kế cho Mivy — đề xuất

Không ghép tất cả thành một danh sách công cụ AI rời rạc. Tổ chức theo việc người dùng cần hoàn thành, dùng chung brand, brief và tài nguyên.

### Hai điểm bắt đầu

1. **Tạo nhanh:** một bài viết, poster, carousel, hình screenshot hoặc kịch bản. Không ép tạo chiến dịch đầy đủ khi nhu cầu nhỏ.
2. **Tạo bộ chiến dịch:** một dịp/mục tiêu → đề xuất hướng truyền thông → bộ nội dung đồng nhất → chỉnh → xuất.

Phục vụ sản phẩm, dịch vụ, sự kiện/khóa học, thương hiệu cá nhân, tuyển dụng, ra mắt app/web. Không chốt workshop hay giày thành phạm vi duy nhất.

### Chức năng cốt lõi và lợi ích

| Chức năng đề xuất | Người dùng được hỗ trợ thế nào | Nguồn cảm hứng | Ưu tiên |
|---|---|---|---|
| Brand profile | Lưu tên, logo, màu, giọng văn, đối tượng, thông tin đúng; nhập một lần | Jasper, Adobe, AIDesigner | P0 |
| Brief có hướng dẫn | Form thay đổi theo mục đích; hỏi phần còn thiếu, có ví dụ ngắn | Template-first của Headlime; UX đề xuất cho Mivy | P0 |
| Ba hướng ý tưởng | So sánh thông điệp + headline + hình định hướng, có giải thích ngắn | Predis gợi ý ý tưởng; cách chọn ba hướng là đề xuất Mivy | P0 |
| Template nội dung và hình | Chọn theo mục tiêu; hiển thị mẫu đã điền dữ liệu thay vì tên style trừu tượng | Headlime, BrandBird | P0 |
| Bộ đầu ra | Bài đăng, headline, CTA, poster, story, carousel, kịch bản cùng thông điệp | Predis, Jasper | P0 |
| Editor đơn giản | Sửa từng phần, thay ảnh, đổi màu, thu ngắn nội dung, hoàn tác | AIDesigner, Adobe | P0 |
| Biến thể theo kênh | Bố cục và độ dài khác nhau, dữ kiện vẫn đồng nhất | Canva, Predis | P0 |
| Lưu và xuất | Lưu bản nháp, mở lại, copy text, tải hình/bộ file; báo lỗi rõ | Tổng hợp quy trình | P0 |
| Lịch nội dung | Đề xuất nhịp đăng, kéo nội dung vào ngày; tách khỏi đăng tự động | Predis | P1 |
| Duyệt và bình luận | Khách duyệt hoặc yêu cầu sửa từng tài nguyên; lưu version | Predis, Jitter | P1 |
| Screenshot studio | Khung thiết bị, highlight tính năng, nền, text | BrandBird | P1 |
| Video motion | Bộ hình → các cảnh với text, chuyển động và xuất MP4 | SuperMotion, Jitter | P1 |
| Landing page | Dùng lại brief, asset và CTA để tạo trang chiến dịch | Unicorn Platform | P2 |
| Chân dung/avatar | Bộ ảnh cá nhân có kiểm tra độ giống và đầu vào | HeadshotPro, Photo AI | P2 |
| Đăng tự động và analytics | Kết nối tài khoản, xem kết quả thật | Predis | P2 |
| Không gian nhiều khách hàng | Tách brand, quyền truy cập, duyệt và bàn giao | Jasper, Predis | P2 |

P0 = phác thảo và kiểm chứng trước; P1 = sau khi luồng lõi dùng được; P2 = mở rộng. Ưu tiên này chưa phải danh sách anh đã duyệt triển khai toàn bộ.

## 4. Bản phác thảo web nên có gì

Giữ màn test API riêng cho dev. Website sản phẩm không có ô prompt kỹ thuật dài làm điểm bắt đầu.

### Điều hướng

- Tổng quan: tạo nhanh, tạo chiến dịch, gần đây.
- Chiến dịch: bản nháp, đang làm, chờ duyệt, hoàn tất.
- Mẫu: lọc theo mục đích và định dạng, preview trước khi chọn.
- Thương hiệu: thông tin, nhận diện, giọng văn.
- Tài nguyên: ảnh, screenshot, logo, đầu ra đã chọn.
- Lịch nội dung: để giai đoạn sau hoặc ghi rõ bản phác thảo.

### Luồng thử xuyên suốt

1. Chọn “Tạo bộ chiến dịch”, rồi chọn mục đích.
2. Nhập tên + vài dữ kiện và ảnh nếu có. Form thay đổi theo mục đích, chỉ hỏi phần thiết yếu.
3. Xác nhận thẻ thông tin; trường còn thiếu hiện rõ. URL nhập vào có thể là chức năng sau, không giả vờ đã đọc URL.
4. Chọn một trong ba hướng; không bắt người dùng tự viết concept.
5. Chọn các đầu ra muốn nhận; cho biết phần nào là text, thiết kế, kịch bản hay video thật.
6. Xem bảng kết quả chia tab Nội dung / Thiết kế / Kịch bản. Sửa trực tiếp, tạo lại riêng phần chọn, giữ phần đã duyệt.
7. Xem trước từng kênh rồi lưu/xuất.

### Ba kịch bản để tránh thiết kế chỉ hợp bán hàng

- Workshop: thời gian, địa điểm, phí nếu có, cách đăng ký → poster, bài giới thiệu/nhắc lịch, story.
- Ra mắt app: screenshot, tính năng, đối tượng, link → hình tính năng, carousel, bài ra mắt, kịch bản demo.
- Dịch vụ: lợi ích, phạm vi, bằng chứng do khách cung cấp, cách liên hệ → bài giới thiệu, banner, FAQ ngắn.

### Phân biệt phác thảo và tính năng thật

- Làm thật ở frontend: điều hướng, form, chọn mẫu, chỉnh text/màu, lưu draft local, mở lại, xuất nội dung có sẵn.
- Phần chưa có LLM: ghi “Nội dung mẫu để thử giao diện”, không gọi là AI đã phân tích thương hiệu.
- Phần hình mẫu: ghi rõ dùng template/ảnh mẫu; không giả có kết quả sinh AI.
- Kịch bản video không phải video đã render. Lịch dự kiến không phải đã đăng mạng xã hội.
- Không hiển thị điểm hiệu quả, số lượt xem hay đơn hàng giả như dữ liệu thật.
- Mẫu phải phản ánh dữ kiện user nhập; không bịa ngày giờ/giá/cam kết.

## 5. Áp dụng cho Việt Nam — giả thuyết cần kiểm chứng

- Text tiếng Việt có nhiều giọng: gần gũi, chuyên nghiệp, súc tích, trẻ trung; cho xem mẫu trước khi chọn.
- Font hỗ trợ dấu đầy đủ; kiểm tra xuống dòng và text dài ở mỗi tỷ lệ.
- Preset theo tình huống: khai trương, tuyển sinh, workshop, tuyển dụng, giới thiệu chuyên gia, ra mắt app, ưu đãi. Không chỉ “sản phẩm + giá”.
- Ngày giờ, địa chỉ, giá và phương thức liên hệ là trường dữ liệu xác nhận, không để model tự điền.
- Cho tái sử dụng chiến dịch và đổi thông tin cho lần tiếp theo.
- Cần thử với người dùng Việt để biết chất lượng và mức sẵn lòng trả tiền; nghiên cứu tính năng đối thủ không chứng minh product-market fit.

## 6. Hướng kỹ thuật sau khi duyệt phác thảo

- Dùng `CampaignBrief`, `BrandProfile`, `Concept`, `Creative`, `Template`, `Asset`, `Revision`; đối tượng truyền thông không luôn là Product.
- Template có schema trường dữ liệu, bố cục và các biến thể định dạng, không chỉ một prompt.
- Prompt nằm phía backend và được dựng từ dữ kiện đã xác nhận.
- Tách dịch vụ gen text, gen ảnh, render layout, export; giữ text editable thay vì raster hóa ngay.
- Chỉnh giá/ngày/CTA cần báo các asset liên quan đang dùng thông tin cũ; không âm thầm ghi đè bản đã sửa tay.
- Job ảnh ComfyUI đang có chỉ là một adapter. Không mặc định workflow ảnh giày xử lý được chân dung, poster hoặc screenshot.
- Giữ nguồn dữ kiện, phiên bản, lỗi từng đầu ra; cho retry từng phần và báo chi phí khi có tích hợp thật.

## 7. Việc tiếp theo

Đề xuất bắt đầu phác thảo web với: Tổng quan → brief động → ba concept → bộ kết quả → editor đơn giản → lưu/mở lại. Hiển thị ba demo: workshop, app và dịch vụ. Chưa thay đổi code web trong đợt nghiên cứu này; cần tiếp tục phần implementation đã được anh yêu cầu trước đó sau khi thống nhất phạm vi từ nghiên cứu.
