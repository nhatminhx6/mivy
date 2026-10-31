#!/bin/bash
# Gen kho LOGO MINH HOẠ hàng loạt trên 1 máy Mac bất kỳ (vd Mac mini M1) — free, không giới hạn lượt.
# Tự cài: uv → ComfyUI + ComfyUI-GGUF (bản đã test) → model Z-Image-Turbo GGUF + Qwen3-4B + VAE → rembg.
# Rồi bật ComfyUI và chạy scripts/gen_logo_art.py --queue (xoay vòng mọi ngành, bỏ qua hình đã có → ngắt rồi chạy lại vẫn tiếp).
# Kết quả: data/logo-art/<ngành>/{raw,png}/<id>.png, nhật ký: data/logo-art/gen.log.  Hướng dẫn: docs/LOGO_ART_GEN.md
#
#   bash scripts/logo_art_batch.sh                  # cài (nếu thiếu) + gen hết 155 hình
#   PER_THEME=3 bash scripts/logo_art_batch.sh      # tối đa 3 hình/ngành
#   THEMES=pets,salon bash scripts/logo_art_batch.sh
#   QUANT=Q4_K_M bash scripts/logo_art_batch.sh     # ép model nhẹ (mặc định: RAM < 16GB → Q4_K_M, còn lại Q6_K)
#   bash scripts/logo_art_batch.sh --setup-only     # chỉ cài, không gen
set -euo pipefail

BE=$(cd "$(dirname "$0")/.." && pwd)
COMFY="$BE/.comfyui"
COMFY_REV=4d7e61b7d4c8494c490d12231f70955d9518f55f   # ComfyUI đã test với Z-Image GGUF
GGUF_REV=6ea2651e7df66d7585f6ffee804b20e92fb38b8a    # ComfyUI-GGUF đã test
PORT=8188
OUT="$BE/data/logo-art"
LOG="$OUT/gen.log"

RAM_GB=$(( $(sysctl -n hw.memsize) / 1073741824 ))
if [ -z "${QUANT:-}" ]; then
  if [ "$RAM_GB" -lt 16 ]; then QUANT=Q4_K_M; else QUANT=Q6_K; fi
fi
UNET="z-image-turbo-$QUANT.gguf"
CLIP="Qwen3-4B-$QUANT.gguf"

say() { printf '\n==> %s\n' "$*"; }

# ---------- 1. Cài đặt (bước nào có rồi thì bỏ qua) ----------
say "Máy: $(sysctl -n machdep.cpu.brand_string), RAM ${RAM_GB}GB → model $QUANT"
command -v git >/dev/null || { echo "Thiếu git: chạy 'xcode-select --install' rồi chạy lại."; exit 1; }
if ! command -v uv >/dev/null; then
  say "Cài uv (quản lý Python)"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$HOME/.local/bin:$PATH"
fi

if [ ! -d "$COMFY/.git" ]; then
  say "Tải ComfyUI"
  git clone https://github.com/Comfy-Org/ComfyUI.git "$COMFY"
  git -C "$COMFY" checkout -q "$COMFY_REV"
fi
GGUF="$COMFY/custom_nodes/ComfyUI-GGUF"
if [ ! -d "$GGUF/.git" ]; then
  say "Tải ComfyUI-GGUF"
  git clone https://github.com/city96/ComfyUI-GGUF.git "$GGUF"
  git -C "$GGUF" checkout -q "$GGUF_REV"
fi

PY="$COMFY/.venv/bin/python"
[ -x "$PY" ] || { say "Tạo môi trường Python 3.12"; uv venv --python 3.12 "$COMFY/.venv"; }
say "Cài thư viện (lần đầu vài phút)"
uv pip install --python "$PY" -q -r "$COMFY/requirements.txt" -r "$GGUF/requirements.txt" "rembg[cpu]==2.0.74" pillow

dl() { # dl <url> <file> — tải tiếp được nếu đứt mạng
  [ -s "$2" ] && return 0
  mkdir -p "$(dirname "$2")"
  say "Tải $(basename "$2")"
  curl -fL --retry 5 --retry-delay 10 -C - -o "$2.part" "$1"
  mv "$2.part" "$2"
}
M="$COMFY/models"
dl "https://huggingface.co/unsloth/Z-Image-Turbo-GGUF/resolve/main/$UNET" "$M/diffusion_models/$UNET"
dl "https://huggingface.co/unsloth/Qwen3-4B-GGUF/resolve/main/$CLIP" "$M/text_encoders/$CLIP"
dl "https://huggingface.co/Comfy-Org/Z-Image-Turbo/resolve/main/split_files/vae/ae.safetensors" "$M/vae/z_image_ae.safetensors"

if [ "${1:-}" = "--setup-only" ]; then say "Cài xong. Chạy lại không kèm --setup-only để gen."; exit 0; fi

# ---------- 2. Bật ComfyUI (nếu chưa chạy) ----------
mkdir -p "$OUT"
up() { curl -fs "http://127.0.0.1:$PORT/system_stats" >/dev/null 2>&1; }
if ! up; then
  say "Bật ComfyUI ở cổng $PORT (log: $OUT/comfyui.log)"
  (cd "$COMFY" && U2NET_HOME="$M/rembg" "$PY" main.py --listen 127.0.0.1 --port "$PORT" >"$OUT/comfyui.log" 2>&1) &
  COMFY_PID=$!
  trap 'kill $COMFY_PID 2>/dev/null || true' EXIT
  for _ in $(seq 1 120); do up && break; sleep 3; done
  up || { echo "ComfyUI không bật được, xem $OUT/comfyui.log"; exit 1; }
fi

# ---------- 3. Gen (caffeinate: máy không ngủ giữa chừng) ----------
say "Bắt đầu gen — mỗi hình ~15-30 phút trên M1. Nhật ký: $LOG"
cd "$BE"
ZIMAGE_UNET="$UNET" ZIMAGE_CLIP="$CLIP" caffeinate -dims \
  "$PY" scripts/gen_logo_art.py --queue "${PER_THEME:-0}" ${THEMES:+--themes "$THEMES"} 2>&1 \
  | grep --line-buffered -v -i warning | tee -a "$LOG"
say "Xong. Hình ở $OUT/<ngành>/png — gửi về máy chính để duyệt."
