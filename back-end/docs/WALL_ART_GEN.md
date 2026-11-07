# Tranh treo tường — Brief gen kho ảnh (cho Antigravity đọc & tự làm)

> Đây là bản GIAO VIỆC cho AI agent (Antigravity) trên máy mạnh. Đọc hiểu rồi tự chọn công cụ,
> tự viết code/gọi model để gen. **Không cần ai gõ lệnh tay** — bạn (Antigravity) tự lo khâu chạy.

## 1. Bối cảnh
Mivy = web thiết kế miễn phí + dịch vụ in (môi giới). Kiến trúc bắt buộc: **AI gen SẴN tài nguyên
offline, 1 lần → lưu tĩnh → web chỉ CHỌN + cá nhân hoá (ghép khung/chữ bằng code) → xuất file in.**
KHÔNG gen theo từng request user.

**Nhiệm vụ của bạn:** gen một **KHO TRANH TREO TƯỜNG** (canvas decor) chất lượng cao, làm tài nguyên tĩnh
cho sản phẩm in "Tranh treo tường" của Mivy.

## 2. Yêu cầu tổng
- **Khổ:** ưu tiên **dọc 2:3** (tối thiểu 896×1344, càng lớn càng tốt vì để IN canvas — nhắm ≥1200×1800).
  Có thể gen thêm **ngang 3:2** và **vuông 1:1** cho mỗi bố cục nếu còn thời gian.
- **Mỗi bố cục gen 3–4 biến thể** (seed khác nhau) để anh chọn tấm ưng nhất.
- **Chất:** đẹp như tranh treo tường decor THẬT bán ngoài tiệm, **không lộ "AI"**. Chủ shop (anh) chấm gu rất gắt.
- **Model:** bạn tự chọn, **ưu tiên chất lượng cao** — Flux.1-dev / Flux.1-schnell, hoặc SDXL + checkpoint đẹp,
  hoặc model tương đương. (Z-Image-Turbo cũng được nhưng chất thường thấp hơn Flux.)

## 3. ⚠️ Ràng buộc quan trọng (đọc kỹ)
- Ảnh là **RUỘT tranh thuần tuý** — **KHÔNG vẽ sẵn khung ảnh, KHÔNG chữ, KHÔNG watermark, KHÔNG chữ ký/triện.**
  (Web Mivy sẽ tự ghép khung + chữ cá nhân hoá lên sau bằng code.)
- Bố cục chừa không gian hợp lý, không để chủ thể sát mép bị khung ăn mất.
- Không nội dung nhạy cảm, không logo thương hiệu có thật.

## 4. Output
- Lưu: `back-end/data/wall-art/<style>/<subject>_<n>.png` (n = số biến thể, bắt đầu 1).
  Ví dụ: `data/wall-art/sondau/nha_tranh_hoadao_1.png`.
- **Gửi anh DUYỆT trước.** Chỉ khi anh nói "đạt" mới copy sang `web/public/wall-art/<style>/` cho web dùng.
  (Đừng tự đánh giá ảnh đạt hay không — anh là người chấm.)

## 5. Kho prompt
Mỗi prompt = **base của style** (thay `{subj}`) + **đuôi chất lượng** chung:

> Đuôi chất lượng: `beautiful wall art decor painting, masterpiece, highly detailed, elegant, gallery quality`

### Style `sondau` — Sơn dầu phong cảnh ấm (BẬT — anh đã duyệt gu)
Base: `romantic oil painting, warm soft light, painterly brush strokes, {subj}`

| subject | {subj} |
|---|---|
| nha_tranh_hoadao | a cozy rustic cottage with a tiled roof on a hillside, a blooming pink cherry blossom tree, golden sunset over layered misty mountains, wildflowers |
| thuyen_ho_suong | a lone wooden boat on a calm misty lake at dawn, distant mountains, soft reflections |
| canh_dong_lavender | a lavender field stretching to rolling hills at sunset, warm purple and gold sky |
| rung_thu_suoi | an autumn forest with golden and red leaves and a small stream, sunlight through trees |
| lang_chai_binhminh | a peaceful coastal fishing village at sunrise, small boats, warm glowing light |
| nui_tuyet_ho | snowy mountain peaks reflected in a turquoise alpine lake, pine trees |
| dong_lua_vn | a Vietnamese countryside rice paddy at golden hour, palm trees and a water buffalo, warm light |
| hoian_den_long | Hoi An ancient town with glowing lanterns reflected on the river at dusk |

### Style `thuymac` — Thủy mặc / mực nước (BẬT — anh đã duyệt gu)
Base: `traditional Chinese shan shui ink wash painting, {subj}, monochrome black ink, authentic sumi-e brushwork, wet and dry brush, soft ink wash gradients, large empty negative space, on white rice paper, no seal`

| subject | {subj} |
|---|---|
| nui_thong | misty layered mountain peaks and a lone gnarled pine on a cliff |
| truc | a few tall bamboo stalks and leaves swaying in the wind |
| sen_ca_chep | lotus flowers and lily pads with koi carp swimming below |
| thac_nui | a waterfall cascading between tall misty cliffs |
| hac_tung | two red-crowned cranes standing by an old pine tree |
| thuyen_cau | a small fisherman's boat on a wide misty river at dawn |
| son_thuy | a classic shan shui river valley with distant mountains and a village |
| ma_phi | galloping horses in expressive ink brush strokes |

### Style `botanical` — Hoa & thực vật (TÙY CHỌN — gen nếu anh muốn)
Base: `elegant botanical art print, {subj}, soft neutral background, minimalist, decorative`

| subject | {subj} |
|---|---|
| la_nhietdoi | lush green tropical monstera and palm leaves |
| hoa_dai_mau_nuoc | a watercolor bouquet of soft wildflowers |
| canh_dao_toithieu | a single blooming branch, minimalist, beige background |
| co_lau | soft pampas grass in neutral beige tones |
| la_vang | golden eucalyptus leaves, luxury botanical, cream background |
| xuong_rong | desert cacti in warm earthy terracotta tones |

### Style `abstract` — Trừu tượng / Bắc Âu (TÙY CHỌN — gen nếu anh muốn)
Base: `modern abstract wall art, {subj}, minimalist, scandinavian style`

| subject | {subj} |
|---|---|
| mang_mau_earthy | abstract color blocks in beige, terracotta and cream |
| line_art_mat | a minimalist single continuous line drawing of a face, beige |
| nui_hinhhoc | geometric mountains and a rising sun, mid-century modern |
| song_nuoc | calm abstract wavy lines evoking the ocean, soft blue and sand |
| marble_vang | abstract marble texture with delicate gold veins, luxury |
| bauhaus | bauhaus geometric shapes in muted primary colors |

## 6. Gu từng style (để chỉnh prompt nếu ra chưa đạt)
- **sondau:** ấm áp, lãng mạn, có nét cọ sơn dầu, ánh sáng hoàng hôn mềm. Mẫu anh thích: nhà tranh + hoa đào + núi hoàng hôn.
- **thuymac:** mực ĐEN làm chủ, **nét cọ thật** (ướt thấm giấy + cọ khô), **nhiều khoảng trắng** (lưu bạch). TRÁNH kiểu mờ ảo mượt "digital".
- **botanical/abstract:** tối giản, tông trung tính, sang — hợp phòng khách hiện đại.

## 7. Khi xong
Báo lại: đã gen style nào, bao nhiêu tấm, path. Gửi vài tấm đại diện mỗi style cho anh chấm.
Anh duyệt → copy sang `web/public/wall-art/`.

---
*(Có sẵn script mẫu `back-end/scripts/gen_wall_art.py` nếu bạn muốn tham khảo cấu hình/prompt dạng code — không bắt buộc dùng.)*
