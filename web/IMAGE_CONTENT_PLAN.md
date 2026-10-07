# Plan: Gen ảnh ĐÚNG NỘI DUNG theo ngành (cho Gemini)

## Vấn đề
Hiện ảnh nền gen bằng prompt **trừu tượng** ("abstract gradient / glass sculpture") → ra nền vô hồn (vd Bún Bò Huế lại ra nền tím). **Nội dung sai = rác, không thu hút user.** (Không phải vấn đề độ nét — chỉ là nội dung.)

## Cách sửa (cốt lõi)
Thay prompt trừu tượng bằng **prompt mô tả đúng chủ đề từng ngành**, rồi **gen sẵn offline 1 lần** → lưu tĩnh → user chọn (không gọi AI mỗi lần tạo poster).

## Việc cần làm
1. **Viết script gen offline** (node hoặc python) đọc bảng prompt bên dưới, gen **3–5 ảnh/ngành** (nhiều `seed` khác nhau), lưu vào `web/public/backgrounds/<industry>/<n>.jpg`.
2. **Provider gen ảnh**: mặc định Pollinations (free, không bắt buộc key). Nếu bị rate-limit (lỗi 402) hoặc muốn ổn định hơn thì dùng token — đọc từ env `IMAGE_GEN_TOKEN` (đã để sẵn placeholder, xem mục Key).
   - URL Pollinations: `https://image.pollinations.ai/prompt/<URL-encoded prompt>?width=768&height=1024&nologo=true&seed=<n>&model=flux` (thêm `&token=<IMAGE_GEN_TOKEN>` nếu có).
   - Nếu đổi provider khác (fal.ai / Replicate / OpenAI / Google Imagen) thì đọc cùng env key đó.
3. **Nối vào UI** `src/app/studio/marketing/page.tsx`: thay `PRESET_BACKGROUNDS` (đang 4 nền gradient chung) bằng **ảnh theo ngành** — khi bấm ngành, `bgUrl` lấy từ bộ ảnh của chính ngành đó (`/backgrounds/<industry>/...`). Giữ gallery cho user chọn giữa vài ảnh của ngành + nút "Đổi nền" xoay vòng.
4. Giữ nguyên: user upload ảnh thật của họ (ưu tiên cao nhất), auto blur+dim khi upload.

## Bảng prompt theo ngành (English — model hiểu tốt hơn; đừng dịch sang tiếng Việt)
Mọi prompt kết thúc bằng: `, appetizing/beautiful, natural light, high detail, no text, no words, no watermark`.

| industry (category id) | Prompt nội dung |
|---|---|
| recruitment | modern bright office workspace, diverse team collaborating at desks with laptops, professional corporate environment |
| education | bright modern classroom, students learning, open books and laptop on wooden desk, warm inspiring study atmosphere |
| event | live acoustic music night on a cozy cafe stage, warm spotlights, intimate audience, atmospheric evening |
| food | authentic Vietnamese dish, steaming delicious bowl on rustic wooden table, fresh herbs lime chili, appetizing close-up food photography |
| beauty | clean modern spa interior, soft folded towels, lit candles, orchid flower, calm wellness atmosphere |
| property | luxury modern apartment living room, large bright windows, elegant minimalist interior design, city view |
| travel | scenic Vietnam travel destination, Hoi An ancient town lanterns and My Khe beach, golden sunset, landscape photography |
| retail | premium product on a clean minimal studio table, soft shadow, commercial product photography (ảnh sản phẩm cụ thể nên để user upload) |
| fitness | modern gym interior, dumbbells and equipment, energetic bright training atmosphere |
| technology | sleek smartphone showing a clean app UI on a modern desk, minimal tech workspace |
| personal | confident professional person at a modern workspace, warm natural portrait lighting |
| service | professional business consulting meeting in a modern office, people discussing, clean corporate setting |

> Gợi ý: mỗi ngành gen 3–5 seed để user có lựa chọn. Với `food`/`travel`/`retail` có thể thêm biến thể (vd food: phở, cơm tấm, cà phê…) nếu muốn đa dạng.

## Key (để sẵn, anh replace sau)
- Backend: `back-end/.env.example` có `IMAGE_GEN_TOKEN=REPLACE_ME` (và field `image_gen_token` trong `app/core/config.py`). Anh điền token thật vào `back-end/.env`.
- Nếu script gen chạy ở FE (node trong `web/`): tạo `web/.env.local` với `IMAGE_GEN_TOKEN=REPLACE_ME`.
- **Không commit token thật.** Chỉ để placeholder `REPLACE_ME`.

## Nghiệm thu
- Bấm mỗi ngành → nền là ảnh **đúng chủ đề ngành đó** (food ra món ăn, travel ra cảnh đẹp…), không còn gradient trừu tượng.
- Không gọi AI khi user tạo poster (ảnh đã gen sẵn, load tĩnh).
- User upload được ảnh riêng, tự mờ nền cho chữ nổi.
- `npx tsc --noEmit` sạch.
