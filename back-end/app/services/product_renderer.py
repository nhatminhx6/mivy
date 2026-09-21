"""Deterministic product composition. Run in the image runtime, not the API venv."""

import argparse
import hashlib
import json
import os
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps

SIZES = {"1:1": (1080, 1080), "4:5": (1080, 1350), "9:16": (1080, 1920)}
BACKGROUNDS = {"studio_white", "gradient"}


def compose(source: Image.Image, mask: Image.Image, aspect: str, background: str):
    if aspect not in SIZES or background not in BACKGROUNDS:
        raise ValueError("Khổ ảnh hoặc nền chưa được hỗ trợ.")
    if source.size != mask.size:
        raise ValueError("Kích thước ảnh và vùng tách nền không khớp.")
    alpha = np.asarray(mask.convert("L")).copy()
    # Remove only negligible model noise. Keep real holes and antialiased boundaries.
    alpha[alpha < 5] = 0
    alpha[alpha > 250] = 255
    support = Image.fromarray(np.where(alpha > 8, 255, 0).astype(np.uint8))
    bounds = support.getbbox()
    coverage = float((alpha > 128).mean())
    if bounds is None or coverage < 0.005:
        raise ValueError("Chưa tách được sản phẩm. Anh thử ảnh rõ hơn hoặc ảnh PNG đã tách nền.")
    rgba = source.convert("RGBA")
    rgba.putalpha(Image.fromarray(alpha))
    cutout = rgba.crop(bounds)
    width, height = SIZES[aspect]
    padding = round(min(width, height) * 0.08)
    scale = min((width - 2 * padding) / cutout.width, (height - 2 * padding) / cutout.height)
    size = (max(1, round(cutout.width * scale)), max(1, round(cutout.height * scale)))
    fitted = cutout.resize(size, Image.Resampling.LANCZOS)
    if background == "studio_white":
        canvas = Image.new("RGBA", (width, height), "white")
    else:
        x = np.linspace(0, 1, width, dtype=np.float32)[None, :]
        y = np.linspace(0, 1, height, dtype=np.float32)[:, None]
        blend = ((x + y) / 2)[..., None]
        colors = (1 - blend) * np.array([246, 217, 224]) + blend * np.array([217, 228, 246])
        canvas = Image.fromarray(colors.astype(np.uint8)).convert("RGBA")
    position = ((width - size[0]) // 2, (height - size[1]) // 2)
    canvas.alpha_composite(fitted, position)
    return (
        canvas.convert("RGB"),
        rgba,
        {
            "source_size": list(source.size),
            "source_subject_box": list(bounds),
            "output_size": [width, height],
            "subject_size": list(size),
            "subject_position": list(position),
            "padding": padding,
            "background": background,
            "coverage": coverage,
        },
    )


def render(
    input_path: Path, output_path: Path, cache_dir: Path, model: str, aspect: str, background: str
):
    started = time.monotonic()
    with Image.open(input_path) as raw:
        if raw.width * raw.height > 24_000_000:
            raise ValueError("Ảnh quá lớn. Anh dùng ảnh dưới 24 megapixel nhé.")
        source = ImageOps.exif_transpose(raw).convert("RGBA")
    cache_dir.mkdir(parents=True, exist_ok=True)
    digest = hashlib.sha256(input_path.read_bytes() + model.encode() + b"cutout-v1").hexdigest()
    mask_path = cache_dir / f"{digest}.png"
    if source.getextrema()[3][0] < 255:
        mask = source.getchannel("A")
        used_model = "input_alpha"
    elif mask_path.exists():
        with Image.open(mask_path) as cached:
            mask = cached.convert("L")
        used_model = model
    else:
        from rembg import new_session, remove

        model_home = Path(os.environ["U2NET_HOME"])
        if not (model_home / f"{model}.onnx").is_file():
            raise ValueError("Thiếu model tách nền. Anh chạy scripts/setup-product.sh trước nhé.")
        session = new_session(model, providers=["CPUExecutionProvider"])
        mask = remove(source.convert("RGB"), session=session, only_mask=True)
        temp_mask = mask_path.with_suffix(".tmp.png")
        mask.save(temp_mask)
        temp_mask.replace(mask_path)
        used_model = model
    result, cutout, metadata = compose(source, mask, aspect, background)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    # Separate artifacts allow diagnosing segmentation vs placement errors.
    mask.save(output_path.with_suffix(".mask.png"))
    cutout.save(output_path.with_suffix(".cutout.png"))
    temp = output_path.with_suffix(".tmp.png")
    result.save(temp)
    temp.replace(output_path)
    metadata.update(model=used_model, seconds=round(time.monotonic() - started, 3))
    output_path.with_suffix(".json").write_text(json.dumps(metadata, indent=2))
    return metadata


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    for key in ("input", "output", "cache", "model", "aspect", "background"):
        parser.add_argument("--" + key, required=True)
    args = parser.parse_args()
    try:
        print(
            json.dumps(
                render(
                    Path(args.input),
                    Path(args.output),
                    Path(args.cache),
                    args.model,
                    args.aspect,
                    args.background,
                )
            )
        )
    except Exception as exc:
        message = str(exc) if isinstance(exc, ValueError) else "Không xử lý được ảnh đầu vào."
        print(json.dumps({"error": message}))
        raise SystemExit(1) from None
