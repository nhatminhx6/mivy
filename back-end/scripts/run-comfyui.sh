#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
if [ ! -e "$PROJECT_DIR/.comfyui/custom_nodes/mivy_product" ]; then
  ln -s "$PROJECT_DIR/comfy_nodes/mivy_product" "$PROJECT_DIR/.comfyui/custom_nodes/mivy_product"
fi
export U2NET_HOME="$PROJECT_DIR/.comfyui/models/rembg"
cd "$PROJECT_DIR/.comfyui"
exec .venv/bin/python main.py --listen 127.0.0.1 --port 8188
