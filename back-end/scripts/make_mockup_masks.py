"""Tạo mặt nạ VÙNG SẢN PHẨM cho ảnh mockup (chạy OFFLINE 1 lần, lưu tĩnh) → web đổi màu áo/nón/ly ngay trên ảnh thật.

BiRefNet (rembg) tách tiền cảnh; với đồ trắng, giữ thêm điều kiện "ít bão hoà + đủ sáng" để loại da người / quần jean
(ảnh áo thun có người mặc). Túi giấy kraft thì lấy cả tiền cảnh. Mép mặt nạ làm mềm nhẹ.

Chạy:  .venv/bin/python scripts/make_mockup_masks.py
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MOCK = ROOT.parent / "web" / "public" / "mockups"
OUT = MOCK / "masks"
os.environ.setdefault("U2NET_HOME", str(ROOT / ".comfyui" / "models" / "rembg"))

# vùng in đã biết (khớp PHOTO_PRINT ở merch-engine) — dùng để tự kiểm mặt nạ phủ đúng sản phẩm
PRINT = {
    "tshirt": (398, 330, 290, 250), "mug": (388, 356, 440, 420), "tumbler": (398, 430, 286, 312),
    "tote": (360, 388, 362, 290), "cap": (326, 300, 430, 232), "box": (520, 442, 338, 238),
}
KEEP_COLOR = {"box"}  # kraft: không lọc theo độ bão hoà
# viền cổ áo đo trên ảnh gốc (toạ độ 1080) — vùng phía trên là da cổ
NECK = {"tshirt": [(410, 0), (670, 0), (670, 52), (645, 57), (625, 80), (600, 100), (570, 113), (535, 117), (500, 110), (470, 95), (450, 78), (436, 63), (410, 58)]}


def main() -> int:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFilter
    from rembg import new_session, remove

    session = new_session("birefnet-general", providers=["CPUExecutionProvider"])
    OUT.mkdir(parents=True, exist_ok=True)
    bad = 0
    for id_, (x, y, w, h) in PRINT.items():
        img = Image.open(MOCK / f"{id_}.jpg").convert("RGB")
        fg = np.asarray(remove(img, session=session, only_mask=True).convert("L"), dtype=np.float32) / 255.0
        if id_ not in KEEP_COLOR:
            hsv = np.asarray(img.convert("HSV"), dtype=np.float32) / 255.0
            garment = ((hsv[..., 1] < 0.2) & (hsv[..., 2] > 0.28)).astype(np.float32)
            g = Image.fromarray((garment * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5))
            fg = fg * (np.asarray(g, dtype=np.float32) / 255.0)
        m = Image.fromarray((np.clip(fg, 0, 1) * 255).astype(np.uint8))
        if id_ in NECK:
            # cổ người mẫu (da vùng tối ít bão hoà dễ bị nhận nhầm là vải): cắt mọi thứ phía trên viền cổ áo
            ImageDraw.Draw(m).polygon(NECK[id_], fill=0)
        # làm mượt mép: mở (bỏ đốm/răng cưa nhỏ) rồi đóng (lấp lỗ), sau đó feather nhẹ
        m = m.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.MaxFilter(5))
        m = m.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.MinFilter(7))
        m = m.filter(ImageFilter.GaussianBlur(1.6))
        # lưu mặt nạ vào KÊNH ALPHA (web dùng trực tiếp cho destination-in / đọc alpha)
        Image.merge("LA", (Image.new("L", m.size, 0), m)).save(OUT / f"{id_}.png", optimize=True)
        a = np.asarray(m, dtype=np.float32) / 255.0
        inside = float(a[y:y + h, x:x + w].mean())
        corners = float(np.mean([a[:60, :60].mean(), a[:60, -60:].mean(), a[-60:, :60].mean(), a[-60:, -60:].mean()]))
        ok = inside > 0.85 and corners < 0.05
        bad += not ok
        print(f"{id_:8s} phủ vùng in {inside:.2f}  góc nền {corners:.3f}  {'OK' if ok else 'CẦN XEM LẠI'}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
