# MIVY — template riêng theo ngành

## Mục tiêu
Thay 12 bộ lọc dùng chung 6 layout bằng template có cấu trúc nội dung, ảnh và bố cục riêng từng ngành. Không xem đổi palette hay tên mẫu là template mới.

## Phân công và giới hạn
- Codex: PO/PM, tiêu chí nghiệm thu, review tích hợp và QC.
- Gemini qua Antigravity: thiết kế schema, code các đợt triển khai, sửa lỗi theo báo cáo QC.
- Không dùng Claude nếu anh chưa cho phép. Không tự chuyển sang Codex code khi Gemini hết quota. Không gọi API trả phí.
- Gemini làm patch riêng, không ghi đè thay đổi đang có. Chỉ tích hợp sau kiểm tra.

## Đợt 1 — ba ngành có cấu trúc khác rõ rệt
1. Tuyển dụng: vị trí, lương (nếu có), địa điểm, yêu cầu, quyền lợi, liên hệ. Hai concept: thông báo tuyển dụng và hồ sơ đội ngũ.
2. Bất động sản: loại bất động sản, giá, diện tích, địa chỉ, phòng ngủ, tiện ích, liên hệ. Hai concept: ảnh kiến trúc lớn với dải thông số và brochure nhiều ảnh.
3. Ẩm thực: món/combo, giá, mô tả, ưu đãi, địa chỉ/đặt món. Hai concept: hero món ăn và menu/combo.
Mỗi ngành có form, content mapping và bố cục riêng. Một concept dùng chung các tỷ lệ nhưng phải reflow, không kéo giãn.

## Đợt 2
Khóa học, sự kiện, làm đẹp: mỗi ngành hai concept riêng sau khi đợt 1 được duyệt.

## Đợt 3
Du lịch, sản phẩm, thể thao, app/công nghệ, thương hiệu cá nhân, dịch vụ. Chưa làm xong thì hiển thị mẫu dùng chung rõ ràng; không gắn nhãn template chuyên ngành.

## Luồng người dùng
Chọn ngành → chọn mẫu bằng preview có dữ liệu minh họa đúng ngành → nhập thông tin → thêm ảnh nền/ảnh chính → chỉnh và tải xuống.
Preview thư viện không lấy JD tuyển dụng đang mở để minh họa bất động sản. Chọn mẫu không chèn dữ liệu minh họa vào chiến dịch thật. Draft riêng theo ngành; chuyển ngành không mất nội dung.

## Ảnh và chữ
- Hai lớp độc lập: nền phủ canvas; ảnh chính đúng slot. Không tráo vai trò.
- Giữ bo góc, fit/contain, zoom/pan; xuất PNG/ZIP giống preview.
- Ngành không có ảnh vẫn có layout phù hợp, không để khung trống lớn.
- VI/EN/mixed giữ dấu và ngôn ngữ. Không bịa giá/lương/liên hệ, không lặng lẽ bỏ thông tin dài; phân trang khi cần.

## QC bắt buộc
1. Data: category/template tương thích; dữ liệu ví dụ không rò vào chiến dịch; lưu/khôi phục draft theo ngành.
2. Render: 3 ngành × 2 concept × 3 tỷ lệ; cả không ảnh/nền/ảnh chính/cả hai; tiếng Việt dài và English.
3. Export: đúng tỷ lệ, đủ trang, fonts tải xong, nền và crop giống preview.
4. Visual: review contact sheet của 6 concept với cùng brief trong từng ngành; khác hierarchy, ảnh, detail và cấu trúc, không chỉ đổi màu.
5. Không công bố đạt thương mại chỉ vì TypeScript hoặc canvas tests pass. Anh duyệt chất lượng hình ở bước cuối.

## Bước đang giao Gemini
Contract và 6 concept đợt 1 đã có triển khai, nhưng chưa đạt nghiệm thu thẩm mỹ. Không mở đợt 2.
- Đang chặn: phiên Gemini property-edge chưa trả artifact hoàn chỉnh; không dispatch trùng. Xem IMPLEMENTATION_STATUS.md.
- Ưu tiên sửa: PROPERTY_EDGE_REPAIR.md (nội dung ít/dài ở bất động sản), sau đó CONTACT_MIGRATION_QC.md (liên hệ trong bản nháp cũ).
- QC còn lại: đối chiếu preview/PNG/ZIP cho concept mới, phân trang và hai lớp ảnh độc lập. ZIP legacy và PNG property VI/EN 4:5 mới được kiểm tra phạm vi hẹp.
- Không chạy production build vào .next đang phục vụ dev; cache cũ đã được giữ khi khôi phục runtime.


Checkpoint 2026-10-07 14:45 UTC: prioritize outstanding draft persistence races/durability before renderer expansion. Gemini follow-up active; see DRAFT_ASSET_REVIEW.md revision section and IMPLEMENTATION_STATUS.md. Overall acceptance unchanged.

Checkpoint 2026-10-07 15:40 UTC: controller revision reviewed, asset cache integrity reproduction failed; follow-up pending unlocked Antigravity. See DRAFT_ASSET_REVIEW.md. No expansion.
