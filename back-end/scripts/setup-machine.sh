#!/bin/bash
# ==============================================================================
# Mivy — Automated Multi-Machine Setup Script
# Works on: macOS (Apple Silicon / Intel) & Linux (Ubuntu / Debian / Fedora)
# ==============================================================================
set -euo pipefail

PROJECT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$PROJECT_DIR"

echo "========================================================"
echo "🚀 Bắt đầu cài đặt Mivy trên máy mới..."
echo "📂 Thư mục dự án: $PROJECT_DIR"
echo "========================================================"

# 1. Kiểm tra Python
if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Lỗi: Chưa cài đặt python3. Vui lòng cài đặt Python 3.12+ trước." >&2
  exit 1
fi

PY_VER=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✔ Đã tìm thấy Python: $PY_VER"

# 2. Tạo Virtual Environment (.venv)
if [ ! -d ".venv" ]; then
  echo "📦 Đang tạo môi trường ảo Python (.venv)..."
  python3 -m venv .venv
else
  echo "✔ Môi trường ảo .venv đã tồn tại."
fi

# 3. Cài đặt Python Dependencies
echo "📦 Đang cài đặt thư viện cho backend..."
.venv/bin/pip install --upgrade pip --quiet
.venv/bin/pip install -e ".[dev]" --quiet
echo "✔ Đã cài đặt xong backend dependencies."

# 4. Khởi tạo file cấu hình .env nếu chưa có
if [ ! -f ".env" ]; then
  echo "⚙ Đang tạo file .env từ .env.example..."
  cp .env.example .env
  # Mặc định bật Visual Engine Pollinations (Free Flux 3D Backgrounds)
  if ! grep -q "VISUAL_ENGINE" .env; then
    echo "VISUAL_ENGINE=pollinations" >> .env
    echo "POLLINATIONS_BASE_URL=https://image.pollinations.ai" >> .env
  fi
  echo "✔ Đã tạo file .env"
else
  echo "✔ File .env đã tồn tại."
fi

# 5. Tạo các thư mục dữ liệu cần thiết
mkdir -p data/uploads data/outputs/backgrounds data/cutout_cache
echo "✔ Đã chuẩn bị sẵn các thư mục data/"

# 6. Kiểm tra & Chuẩn bị Ollama
echo "--------------------------------------------------------"
if command -v ollama >/dev/null 2>&1; then
  echo "✔ Đã tìm thấy Ollama."
  # Kiểm tra ollama daemon
  if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
    echo "⏳ Đang khởi động ollama serve..."
    ollama serve >/dev/null 2>&1 &
    sleep 3
  fi
  # Tải model qwen3:8b nếu chưa có
  if ! ollama list | grep -q "qwen3:8b"; then
    echo "📥 Đang tải model qwen3:8b vào Ollama (khoảng 5.2GB)..."
    ollama pull qwen3:8b
  else
    echo "✔ Model qwen3:8b đã có sẵn trong Ollama."
  fi
else
  echo "⚠️ Chú ý: Chưa tìm thấy 'ollama' trên máy."
  echo "   Anh có thể cài đặt dễ dàng:"
  echo "   - macOS: brew install ollama  (hoặc tải tại https://ollama.com)"
  echo "   - Linux: curl -fsSL https://ollama.com/install.sh | sh"
  echo "   Sau khi cài xong, chạy lệnh: ollama pull qwen3:8b"
fi

echo "========================================================"
echo "🎉 CÀI ĐẶT HOÀN TẤT!"
echo "👉 Để khởi động toàn bộ dịch vụ Mivy, anh chỉ cần chạy:"
echo "   bash scripts/run-local.sh"
echo "🌐 Sau đó truy cập: http://localhost:8000/ui/"
echo "========================================================"
