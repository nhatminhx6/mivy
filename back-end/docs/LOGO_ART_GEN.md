# Gen kho logo minh hoạ trên máy khác (Mac mini M1…)

Dành cho agent (Antigravity…) hoặc người chạy tay. Chỉ cần làm đúng các bước dưới, **không sửa code, không đổi prompt/model**
(anh đã duyệt chất lượng của đúng cấu hình này: Z-Image-Turbo GGUF qua ComfyUI, seed 7, 9 bước, 1024px).

## Cần có
- Mac Apple Silicon, còn trống **≥ 20GB** ổ đĩa, có mạng (lần đầu tải ~10GB model).
- `git` (nếu thiếu: `xcode-select --install`). Không cần cài Python — script tự cài qua `uv`.
- Code Mivy đã clone về máy.

## Chạy
```bash
cd back-end
bash scripts/logo_art_batch.sh
```
Script tự làm hết: cài uv → ComfyUI + ComfyUI-GGUF (bản đã test) → tải model → bật ComfyUI → gen.
Máy RAM < 16GB tự dùng model nhẹ Q4_K_M; ≥ 16GB dùng Q6_K. Trong lúc chạy, máy không tự ngủ (`caffeinate`).

Tuỳ chọn:
| Lệnh | Tác dụng |
|---|---|
| `bash scripts/logo_art_batch.sh --setup-only` | Chỉ cài + tải model, chưa gen (nên chạy trước để kiểm tra) |
| `PER_THEME=3 bash scripts/logo_art_batch.sh` | Tối đa 3 hình mỗi ngành |
| `THEMES=pets,salon bash scripts/logo_art_batch.sh` | Chỉ vài ngành |
| `QUANT=Q4_K_M bash scripts/logo_art_batch.sh` | Ép model nhẹ nếu máy bị đơ/hết RAM |

## Khi chạy
- Mỗi hình mất ~15–30 phút trên M1. Kho có 155 hình, hình nào có rồi tự bỏ qua → **bị ngắt thì cứ chạy lại lệnh cũ**, nó gen tiếp.
- Thứ tự xoay vòng: hình 1 của mọi ngành, rồi hình 2 của mọi ngành… → dừng sớm thì ngành nào cũng đã có hình.
- Theo dõi: `tail -f data/logo-art/gen.log` (mỗi hình 1 dòng `ok` hoặc `LỖI`). Log ComfyUI: `data/logo-art/comfyui.log`.
- Dòng `LỖI` lẻ tẻ: kệ, chạy lại lệnh sau. Lỗi liên tục: xem `comfyui.log`, thử `QUANT=Q4_K_M`.

## Xong thì
Hình ở `back-end/data/logo-art/<ngành>/png/<id>.png` (nền trong suốt) và `raw/` (ảnh gốc).
Mang cả thư mục `back-end/data/logo-art/` về máy chính (git hoặc nén zip). **Không** tự chép vào `web/` —
anh duyệt từng hình trước, hình đạt mới được đưa vào `web/public/logo-art/` + `web/src/lib/logo-art.ts`.
