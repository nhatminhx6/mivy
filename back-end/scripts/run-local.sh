#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

cleanup() {
  kill "$COMFY_PID" "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

scripts/run-comfyui.sh &
COMFY_PID=$!
.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload &
API_PID=$!

wait
