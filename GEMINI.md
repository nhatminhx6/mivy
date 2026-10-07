# Mivy Project Rules & UI Engineering Standards

## 1. UI & Typography Perfection (Bắt buộc 100%)
- **Zero Coordinate Guessing**: Tuyệt đối không đoán tọa độ mò Y (không dùng số ngẫu nhiên `+ 4`, `+ 10`). Toàn bộ số thứ tự (`01`, `02`, `BƯỚC 1`) và text/tiêu đề đi kèm PHẢI được tính toán qua trục tim ngang chung `centerY` (`badgeY = centerY - badgeH/2`, `textY = centerY - totalTextH/2`).
- **Dynamic Text Placement**: Vị trí X của text sau badge luôn tính động: `textX = badgeX + badgeW + gap` (tối thiểu 16px).
- **Anti-Bleed & Clipping**: Toàn bộ thẻ Bento hoặc box chứa nội dung động (lương, quyền lợi, mô tả) bắt buộc phải có `ctx.clip()` bo theo khung để triệt tiêu 100% nguy cơ tràn chữ sang ô kế bên.
- **Auto Wrap & Scale**: Dùng `posterText` để tự động xuống dòng và co giãn font chữ khi nội dung dài, không vẽ 1 dòng thô bằng `fillText`.

## 2. Server & Communication
- Luôn xưng hô "anh" - "em", ngắn gọn, thực tế, đúng trọng tâm.
- Chạy lệnh tự động trong sandbox, không hỏi xác nhận làm mất thời gian.
- Backend chạy port 8000, Web chạy port 3009.
- Không dùng API tính phí bên ngoài (0đ chi phí vận hành).

## 3. Lệnh Chạy Dự Án (Run Commands)

### Terminal 1 — Backend (Port 8000)
```bash
# Cách 1 (Khuyên dùng): Tự động bật Ollama + ComfyUI + Backend API
cd back-end && sh scripts/run-local.sh

# Cách 2: Chỉ chạy FastAPI Backend (nhẹ & reload khi sửa code)
cd back-end && .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- Health check: `http://localhost:8000/health`

### Terminal 2 — Frontend Next.js (Port 3009)
```bash
cd web && npm run dev
```
- Studio Marketing (giao diện chính): `http://localhost:3009/studio/marketing`
- Studio Image: `http://localhost:3009/studio/image`

