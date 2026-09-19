#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

if [ ! -x .comfyui/.venv/bin/python ] || [ ! -f .comfyui/models/checkpoints/dreamshaper_8.safetensors ]; then
  echo "ComfyUI or DreamShaper 8 is missing. Complete the local setup first." >&2
  exit 1
fi

export GENERATION_ENGINE=comfyui

cleanup() {
  kill "$COMFY_PID" "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

scripts/run-comfyui.sh &
COMFY_PID=$!
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir app &
API_PID=$!

wait
