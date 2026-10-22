"""Gen kho minh hoạ 3D cho poster — chạy OFFLINE 1 lần, lưu tĩnh (kiến trúc Mivy: không gen theo request user).

Flux (Pollinations, free) gen hình theo 1 style prompt cố định → BiRefNet (rembg) tách nền → cắt sát viền
→ PNG 768px nền trong suốt tại web/public/illustrations/gen/<id>.png. Ảnh gốc giữ ở data/illustrations/raw/.

Chạy:  .venv/bin/python scripts/gen_illustrations.py [id ...] [--sheet out.png] [--force]
"""

from __future__ import annotations

import argparse
import io
import os
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "illustrations" / "raw"
OUT_DIR = ROOT.parent / "web" / "public" / "illustrations" / "gen"
os.environ.setdefault("U2NET_HOME", str(ROOT / ".comfyui" / "models" / "rembg"))

BASE_URL = "https://image.pollinations.ai/prompt/"
SIZE = 1024
OUT_SIZE = 768

STYLE = (
    "3D icon of {subject}, cute stylized 3D render, glossy plastic and soft clay materials, "
    "rounded smooth shapes, soft studio lighting, subtle rim light, vibrant but soft colors, "
    "single object centered, whole object fully visible with margin, isolated on pure white background, "
    "minimal, high quality, octane render, no text, no letters"
)

# id → mô tả chủ thể (tiếng Anh cho model). Giữ id trùng kho Fluent để thay thế dần.
SUBJECTS: dict[str, str] = {
    "shopping_bags": "two colorful shopping bags with rope handles",
    "wrapped_gift": "a gift box wrapped with a big ribbon bow",
    "bubble_tea": "a cup of bubble milk tea with tapioca pearls and a straw",
    "lipstick": "an elegant lipstick tube with the cap off",
    "laptop": "an open laptop showing colorful charts on screen",
    "trophy": "a shiny golden trophy cup with a star",
}


def fetch(prompt: str, seed: int) -> bytes:
    url = BASE_URL + urllib.parse.quote(prompt) + f"?width={SIZE}&height={SIZE}&model=flux&nologo=true&seed={seed}"
    last: Exception | None = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "mivy-illustrations/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) < 10_000:
                raise RuntimeError(f"ảnh quá nhỏ ({len(data)} bytes)")
            return data
        except Exception as e:  # noqa: BLE001 — thử lại khi mạng/rate limit
            last = e
            time.sleep(8 * (attempt + 1))
    raise RuntimeError(f"gen thất bại: {last}")


def cutout(raw: bytes, session) -> "Image.Image":
    from PIL import Image
    from rembg import remove

    img = remove(Image.open(io.BytesIO(raw)).convert("RGB"), session=session).convert("RGBA")
    alpha = img.getchannel("A").point(lambda a: 255 if a > 8 else 0)
    box = alpha.getbbox()
    if not box:
        raise RuntimeError("tách nền ra rỗng")
    img = img.crop(box)
    side = int(max(img.size) * 1.08)  # chừa viền 4% mỗi bên
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas.resize((OUT_SIZE, OUT_SIZE), Image.LANCZOS)


def contact_sheet(ids: list[str], out: Path) -> None:
    from PIL import Image, ImageDraw

    cell, cols = 360, 3
    rows = (len(ids) + cols - 1) // cols
    sheet = Image.new("RGB", (cell * cols, (cell + 36) * rows), (241, 245, 249))
    draw = ImageDraw.Draw(sheet)
    for i, id_ in enumerate(ids):
        x, y = (i % cols) * cell, (i // cols) * (cell + 36)
        im = Image.open(OUT_DIR / f"{id_}.png").resize((cell - 40, cell - 40), Image.LANCZOS)
        sheet.paste(im, (x + 20, y + 20), im)
        draw.text((x + 20, y + cell), id_, fill=(51, 65, 85))
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*", help="id cần gen (mặc định: tất cả)")
    ap.add_argument("--sheet", type=Path, help="xuất ảnh tổng hợp để duyệt")
    ap.add_argument("--force", action="store_true", help="gen lại cả id đã có")
    a = ap.parse_args()

    ids = a.ids or list(SUBJECTS)
    unknown = [i for i in ids if i not in SUBJECTS]
    if unknown:
        print("id không có trong SUBJECTS:", unknown)
        return 1

    from rembg import new_session

    session = new_session("birefnet-general", providers=["CPUExecutionProvider"])
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    failed = []
    for n, id_ in enumerate(ids, 1):
        out = OUT_DIR / f"{id_}.png"
        if out.exists() and not a.force:
            print(f"[{n}/{len(ids)}] {id_}: có rồi, bỏ qua")
            continue
        try:
            t = time.time()
            raw = fetch(STYLE.format(subject=SUBJECTS[id_]), seed=sum(map(ord, id_)) * 7)
            (RAW_DIR / f"{id_}.png").write_bytes(raw)
            cutout(raw, session).save(out, optimize=True)
            print(f"[{n}/{len(ids)}] {id_}: ok ({time.time() - t:.0f}s)")
        except Exception as e:  # noqa: BLE001
            failed.append(id_)
            print(f"[{n}/{len(ids)}] {id_}: LỖI {e}")
    if a.sheet:
        contact_sheet([i for i in ids if (OUT_DIR / f"{i}.png").exists()], a.sheet)
        print("sheet:", a.sheet)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
