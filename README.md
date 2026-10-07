# Mivy Studio

Hệ thống AI Visual Marketing & Studio Poster Design (0đ chi phí vận hành, chạy local).

---

## 🚀 Hướng Dẫn Chạy Dự Án (2 Terminal Riêng Biệt)

### Terminal 1 — Backend (Port 8000)

```bash
# Cách 1 (Khuyên dùng): Tự động khởi động Ollama + ComfyUI + FastAPI Backend
cd back-end && sh scripts/run-local.sh

# Cách 2: Chỉ chạy FastAPI Backend (nhẹ, tự reload khi sửa code)
cd back-end && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

- **API Docs (Swagger UI):** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health check:** [http://localhost:8000/health](http://localhost:8000/health)

---

### Terminal 2 — Frontend Next.js (Port 3009)

```bash
cd web && npm run dev
```

- **Giao diện chính (Studio Marketing):** [http://localhost:3009/studio/marketing](http://localhost:3009/studio/marketing)
- **Studio Image:** [http://localhost:3009/studio/image](http://localhost:3009/studio/image)

---

## 🧪 Chạy Kiểm Thử (Tests)

### Backend Pytest (39 tests)
```bash
cd back-end && .venv/bin/pytest -v tests
```

### Frontend Build & Type Check
```bash
cd web && npm run build
```

---

## 📂 Cấu Trúc Thư Mục

- `web/`: Ứng dụng Next.js 14 hiện hành (Tailwind CSS, Canvas Design Engine). *(Lưu ý: Không dùng `back-end/web/` legacy).*
- `back-end/`: FastAPI backend, dịch vụ bóc tách brief Marketing, tích hợp Ollama text model (`qwen3:8b`), ComfyUI visual pipeline.
- `GEMINI.md`: Tiêu chuẩn kỹ thuật UI, căn chỉnh typography pixel-perfect và quy ước dự án.
