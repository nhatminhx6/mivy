# Plan: Brand Kit (nhận diện thương hiệu)

Mục tiêu: user nhập 1 lần **logo, màu, font, giọng văn** → lưu lại → **tự áp vào mọi poster/ảnh** của mọi chiến dịch. Copy đúng điểm mạnh AIDesigner ("brand stays in context"), bản VN.

## Nguyên tắc (BẮT BUỘC — xem CLAUDE.md)
**0 AI realtime.** Tất cả bằng preset sẵn + code:
- Màu/font: **bộ preset curate sẵn** (hardcode) để user bấm chọn, khỏi gõ hex.
- Logo: **user upload** (không gen AI).
- Giọng văn: chỉ là tham số đưa vào prompt Ollama **khi user bấm "Viết lại"** (việc nhẹ, không mặc định).

## 1. Data model
Thêm type `BrandKit` (trong `src/types/index.ts`):
```ts
export interface BrandKit {
  name: string;        // tên thương hiệu
  logo?: string;       // dataURL user upload
  colorPrimary: string;   // nền/đậm
  colorAccent: string;    // nhấn (CTA, số thứ tự...)
  colorInk: string;       // chữ chính
  fontId: string;      // id trong FONT_PRESETS
  voice: 'than-thien' | 'chuyen-nghiep' | 'nang-dong' | 'sang-trong';
}
```
Lưu riêng: `localStorage['mivy-brand-v1']` (dùng chung mọi chiến dịch, KHÔNG nằm trong từng draft).

## 2. Preset offline (curate sẵn trong code, không AI)
- `COLOR_PRESETS`: ~12 bộ {name, primary, accent, ink} phối sẵn đẹp (vd: Xanh ngọc, Đỏ nhiệt, Tím sang, Cam năng động, Đen tối giản, Pastel...).
- `FONT_PRESETS`: ~4 cặp font hỗ trợ tiếng Việt đủ dấu (Be Vietnam Pro, Montserrat, Lora, Playfair Display...). Load qua Google Fonts trong layout.
- `VOICE_OPTIONS`: 4 giọng (thân thiện / chuyên nghiệp / năng động / sang trọng).

## 3. UI — route mới `/studio/brand`
- Form: tên, upload logo (preview), chọn bộ màu (grid swatch preset) + chỉnh tay nếu muốn, chọn font (preview chữ Việt), chọn giọng.
- Preview nhỏ 1 poster mẫu áp brand ngay (dùng drawIndustryPoster).
- Nút Lưu → localStorage. Thêm mục "Thương hiệu" vào sidebar/nav studio.

## 4. Tích hợp vào render (quan trọng)
- Load `BrandKit` từ localStorage, đưa vào state khi render marketing (vd `state.brandKit` hoặc đọc trong page rồi truyền).
- Trong `catalog-renderer.ts` + `design-engine.ts`: nếu có brandKit thì **override**:
  - `accent` ← `brandKit.colorAccent` (CTA, pill số, kẻ).
  - `ink`/nền chữ ← theo brandKit khi hợp lý.
  - `FONT` ← font của brandKit.
  - **Logo**: nếu có `brandKit.logo` → vẽ logo thay cho chip chữ brand ở góc trên (giữ tỉ lệ, cao ~h*.05).
- Nếu chưa có brandKit → giữ nguyên theme hiện tại (không vỡ).

## 5. Giọng văn → copy
Khi user bấm "Viết lại bằng AI" (đã có), thêm `voice` vào payload `/v1/creative/marketing` để Ollama viết đúng giọng. KHÔNG tự gọi khi chỉ đổi brand.

## 6. Ràng buộc
- `npx tsc --noEmit` sạch. Không phá export PNG/ZIP, không đổi API ngoài việc thêm field `voice` optional.
- Giữ tiếng Việt đủ dấu ở mọi font preset.
- Brand kit optional: chưa set thì mọi thứ chạy như cũ.

## 7. Nghiệm thu
- Set brand (logo + màu + font) ở `/studio/brand` → qua `/studio/marketing` bấm ngành: poster **tự áp màu accent + font + logo** của brand.
- Đổi brand → mọi poster đổi theo, không phải sửa tay.
- Không có call AI nào khi set/áp brand.
