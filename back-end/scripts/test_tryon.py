"""Test AI MẶC THỬ (virtual try-on): ảnh người mẫu + ảnh áo thật của shop → người mẫu mặc đúng áo đó.

Qwen-Image-Edit-2511 (Apache 2.0, dùng thương mại được) qua Space Hugging Face miễn phí (giới hạn lượt GPU).
Chỉ chạy 1 ảnh, không chạy model trên máy (máy 16GB không gánh nổi).

Chạy:  .venv/bin/python scripts/test_tryon.py [ảnh_áo] [--model ảnh_người_mẫu] [--out file.png] [--fast]
"""

from __future__ import annotations

import argparse
import shutil
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SHIRT = ROOT.parent / "web" / "public" / "test-raw" / "ao-so-mi-ke-soc.jpg"
DEFAULT_MODEL = ROOT / "data" / "tryon" / "raw" / "model-tshirt-01.jpg"
PROMPT = (
    "The woman in image 1 is now wearing the shirt from image 2. Keep her face, hair, pose, jeans, body shape and the "
    "background exactly the same. The shirt must keep the exact same pattern, stripes, colors, collar, buttons and fabric "
    "as in image 2, fitted naturally on her body with realistic folds and lighting. Photorealistic fashion e-commerce photo."
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("shirt", nargs="?", type=Path, default=DEFAULT_SHIRT)
    ap.add_argument("--model", type=Path, default=DEFAULT_MODEL)
    ap.add_argument("--out", type=Path, default=ROOT / "data" / "tryon" / "out" / "tryon-test.png")
    ap.add_argument("--fast", action="store_true", help="dùng bản 4 bước (đỡ tốn lượt GPU, kém nét hơn)")
    a = ap.parse_args()

    from gradio_client import Client, handle_file

    space = "linoyts/Qwen-Image-Edit-2511-Fast" if a.fast else "Qwen/Qwen-Image-Edit-2511"
    steps, cfg = (4, 1.0) if a.fast else (40, 4.0)
    t = time.time()
    try:
        r = Client(space, verbose=False).predict(
            images=[{"image": handle_file(str(a.model))}, {"image": handle_file(str(a.shirt))}],
            prompt=PROMPT, seed=11, randomize_seed=False, true_guidance_scale=cfg, num_inference_steps=steps,
            height=1152, width=864, rewrite_prompt=False, api_name="/infer",
        )
    except Exception as e:  # noqa: BLE001
        msg = str(e)
        print("HẾT LƯỢT GPU MIỄN PHÍ — thử lại sau" if "quota" in msg.lower() else f"LỖI: {msg[:300]}")
        return 1
    g = r[0] if isinstance(r, (list, tuple)) else r
    item = g[0] if isinstance(g, list) else g
    path = item.get("image") if isinstance(item, dict) else item
    path = path.get("path") if isinstance(path, dict) else path
    a.out.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(path, a.out)
    print(f"ok ({time.time() - t:.0f}s) → {a.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
