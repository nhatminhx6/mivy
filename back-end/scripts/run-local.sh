#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"

command -v ollama >/dev/null || { echo "Install Ollama first: https://ollama.com" >&2; exit 1; }

HAS_COMFYUI=0
if [ -x .comfyui/.venv/bin/python ] && [ -f .comfyui/models/checkpoints/dreamshaper_8.safetensors ]; then
  HAS_COMFYUI=1
  export GENERATION_ENGINE=comfyui
else
  export GENERATION_ENGINE=mock
  echo "Notice: ComfyUI or DreamShaper 8 is not installed. Running in lightweight mode (Ollama + Pollinations Visual AI)."
fi

TEXT_MODEL=${TEXT_MODEL:-$(.venv/bin/python -c 'from app.core.config import get_settings; print(get_settings().text_model)')}
export TEXT_MODEL
CHILD_PIDS=""
cleanup() {
  for child_pid in $CHILD_PIDS; do kill "$child_pid" 2>/dev/null || true; done
}
trap cleanup EXIT
trap 'exit 0' INT TERM

wait_ready() {
  attempt=0
  until curl -fsS "$1" >/dev/null 2>&1; do
    attempt=$((attempt+1))
    if [ "$attempt" -ge 60 ]; then echo "Service did not start: $1" >&2; exit 1; fi
    sleep 1
  done
}

if ! curl -fsS http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  ollama serve &
  CHILD_PIDS="$CHILD_PIDS $!"
fi
wait_ready http://127.0.0.1:11434/api/tags
if ! ollama show "$TEXT_MODEL" >/dev/null 2>&1; then ollama pull "$TEXT_MODEL"; fi

if [ "$HAS_COMFYUI" -eq 1 ]; then
  if ! curl -fsS http://127.0.0.1:8188/system_stats >/dev/null 2>&1; then
    scripts/run-comfyui.sh &
    CHILD_PIDS="$CHILD_PIDS $!"
  fi
  wait_ready http://127.0.0.1:8188/system_stats
fi

if ! curl -fsS http://127.0.0.1:8000/health >/dev/null 2>&1; then
  .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload --reload-dir app &
  CHILD_PIDS="$CHILD_PIDS $!"
fi
wait_ready http://127.0.0.1:8000/health
echo "Mivy ready: http://localhost:8000/ui/ — text model: $TEXT_MODEL"
if [ -n "$CHILD_PIDS" ]; then wait; fi
