# Hướng dẫn Thiết lập Mivy trên Máy Mới (Multi-Machine Setup)

Tài liệu này giúp anh cài đặt và chạy trọn vẹn dự án **Mivy** trên bất kỳ máy làm việc nào (Mac Apple Silicon, Intel Mac, Ubuntu/Debian Linux, hoặc Windows WSL2) một cách nhanh chóng, **hoàn toàn miễn phí (0đ API)**.

---

## 1. Kiến trúc Tổng thể của Mivy

Mivy hoạt động theo mô hình **Hybrid Studio** kết hợp giữa các model AI miễn phí:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Ollama Local (qwen3:8b)                                  │
│    👉 Đóng vai trò Giám đốc Sáng tạo (Art Director):        │
│       Viết nội dung quảng cáo, lọc tiêu chí JD, phối màu    │
│       và định hình bố cục poster.                           │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Visual AI Engine (Flux.1 qua Pollinations / ComfyUI)     │
│    👉 Tự động gen Visual Art / 3D Abstract / Background     │
│       điện ảnh theo phong cách thương hiệu (0đ, không API)   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Modern Design Engine (HTML5/CSS & Canvas Renderer)       │
│    👉 Ghép Typography tiếng Việt sắc nét 100%, Bảng ma trận  │
│       tuyển dụng 4 cột chuẩn thị trường lên nền Visual AI.  │
│    👉 Xuất file PNG sắc nét (1080x1350) và tải trọn bộ ZIP. │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Yêu cầu Hệ thống (Prerequisites)

1. **Hệ điều hành:** macOS (khuyến nghị Apple Silicon), Linux (Ubuntu 22.04+), hoặc Windows 11 (qua WSL2).
2. **Python:** Phiên bản **3.12** trở lên.
3. **Ollama:** Để chạy LLM local (`qwen3:8b`). Cài đặt từ [https://ollama.com](https://ollama.com).
4. **Git:** Đã cài sẵn trên máy.

---

## 3. Cài đặt Tự Động (Khuyến nghị — 1 Dòng Lệnh)

Trên máy mới, sau khi clone source code về, anh chỉ cần mở Terminal tại thư mục `back-end` và chạy:

```bash
cd back-end
bash scripts/setup-machine.sh
```

**Script trên sẽ tự động:**
- Tạo môi trường ảo Python `.venv`.
- Cài đặt đầy đủ các thư viện backend (`fastapi`, `uvicorn`, `sqlalchemy`, `httpx`, `aiofiles`...).
- Tạo file cấu hình `.env` tối ưu sẵn.
- Tạo các thư mục lưu trữ ảnh (`data/uploads`, `data/outputs/backgrounds`).
- Kiểm tra Ollama và tự động kéo model `qwen3:8b` (nếu máy có Ollama).

---

## 4. Khởi động Mivy

Sau khi cài đặt xong, mỗi lần làm việc anh chỉ cần chạy:

```bash
bash scripts/run-local.sh
```

Terminal sẽ khởi động các dịch vụ:
- **Ollama Daemon:** Chạy ngầm tại cổng `11434`.
- **FastAPI Backend:** Chạy tại cổng `8000`.
- Tự động mở giao diện web Mivy Studio tại: **[http://localhost:8000/ui/](http://localhost:8000/ui/)**.

---

## 5. Cấu hình theo Từng Cấu Hình Máy (.env)

File `.env` nằm ở thư mục `back-end/.env`. Dưới đây là các cấu hình quan trọng anh có thể tinh chỉnh:

```ini
# Cấu hình Web & Server
APP_NAME=mivy-backend
PORT=8000
MAX_UPLOAD_SIZE_MB=25

# 1. Visual Engine (Tạo ảnh nền nghệ thuật bằng AI)
# Giá trị: 'pollinations' (Khuyến nghị: Free Flux.1, cực nhanh, 0 tốn RAM) hoặc 'mock' (khi test offline)
VISUAL_ENGINE=pollinations
POLLINATIONS_BASE_URL=https://image.pollinations.ai

# 2. Text LLM (Viết nội dung quảng cáo)
OLLAMA_BASE_URL=http://127.0.0.1:11434
TEXT_MODEL=qwen3:8b
TEXT_TIMEOUT_SECONDS=300
```

### Lựa chọn theo cấu hình phần cứng:
- **Máy 8GB - 16GB RAM (Macbook Air / Pro M1/M2/M3):**
  - Giữ nguyên `VISUAL_ENGINE=pollinations` và `TEXT_MODEL=qwen3:8b`.
  - Đây là cấu hình nhẹ nhất, máy chạy mát, không bị đầy RAM hay quạt hú.
- **Máy 32GB+ RAM hoặc có GPU rời (Nvidia / Mac Studio):**
  - Có thể nâng lên model thông minh hơn: `TEXT_MODEL=qwen3:14b` (chạy `ollama pull qwen3:14b`).
  - Có thể cài thêm ComfyUI local để tự render diffusion tại máy bằng lệnh: `bash scripts/setup-product.sh`.

---

## 6. Hướng dẫn Thủ công (Manual Setup từng bước nếu không dùng script)

Nếu anh muốn tự kiểm soát từng bước mà không chạy script:

```bash
# 1. Di chuyển vào thư mục backend
cd back-end

# 2. Tạo virtualenv và cài dependencies
python3 -m venv .venv
.venv/bin/pip install --upgrade pip
.venv/bin/pip install -e ".[dev]"

# 3. Tạo file .env
cp .env.example .env

# 4. Kéo model Ollama
ollama serve &
ollama pull qwen3:8b

# 5. Khởi động server
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

---

## 7. Các Lệnh Kiểm tra Hệ thống (Health Check)

Để xác nhận hệ thống trên máy mới đã hoạt động hoàn hảo:

```bash
# Chạy bộ test backend (26 tests)
.venv/bin/pytest -q

# Kiểm tra cú pháp và logic poster trên Node.js
node --test tests/industry-poster.test.mjs

# Kiểm tra linter
.venv/bin/ruff check .
```

---

## 8. Xử lý Sự cố Thường gặp (Troubleshooting)

1. **Lỗi cổng bị chiếm (Port in use - 8000 hoặc 11434):**
   - Kiểm tra tiến trình đang chạy: `lsof -i :8000`
   - Tắt tiến trình cũ: `kill -9 <PID>`
2. **Không kết nối được Ollama:**
   - Đảm bảo service đang chạy: `curl http://127.0.0.1:11434/api/tags`
   - Nếu chưa chạy, mở terminal chạy: `ollama serve`
3. **Trình duyệt hiển thị giao diện cũ (Browser Cache):**
   - Nhấn `Ctrl + F5` (hoặc `Cmd + Shift + R` trên Mac) để xóa cache. File `index.html` đã tích hợp sẵn mã cache-buster tự động cập nhật phiên bản mới nhất.
