"""Thử GHÉP ÁO BẰNG CODE (không AI nặng): ảnh áo của shop → uốn khớp vùng áo trên ảnh người mẫu mẫu → phủ nếp vải.

Người mẫu mẫu = ảnh mặc áo TRẮNG trơn (đã có mask vùng áo + bản đồ nếp vải). Áo của shop: tách nền (rembg) rồi
uốn theo từng hàng ngang: mép trái/phải của áo ↔ mép trái/phải vùng áo trên người. Sau đó nhân bóng/nếp của áo trắng.

Chạy:  .venv/bin/python scripts/test_garment_fit.py [ảnh_áo] --out file.jpg
"""

from __future__ import annotations

import argparse
import os
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
os.environ.setdefault("U2NET_HOME", str(ROOT / ".comfyui" / "models" / "rembg"))
MODEL = ROOT / "data" / "tryon" / "raw" / "model-tshirt-01.jpg"
MASK = ROOT / "data" / "tryon" / "raw" / "model-tshirt-01-mask.png"


def row_extents(mask: np.ndarray) -> tuple[int, int, np.ndarray, np.ndarray]:
    ys = np.where(mask.any(axis=1))[0]
    y0, y1 = int(ys[0]), int(ys[-1])
    left = np.full(mask.shape[0], -1.0); right = np.full(mask.shape[0], -1.0)
    for y in range(y0, y1 + 1):
        xs = np.where(mask[y])[0]
        if len(xs): left[y], right[y] = xs[0], xs[-1]
    # làm mượt mép để áo không bị răng cưa
    for arr in (left, right):
        seg = arr[y0:y1 + 1]; valid = seg >= 0
        seg[~valid] = np.interp(np.where(~valid)[0], np.where(valid)[0], seg[valid]) if valid.any() else 0
        arr[y0:y1 + 1] = cv2.GaussianBlur(seg.reshape(-1, 1).astype(np.float32), (1, 0), sigmaX=0, sigmaY=4).ravel()
    return y0, y1, left, right


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("garment", nargs="?", type=Path, default=ROOT.parent / "web" / "public" / "test-raw" / "ao-thun-mau.jpg")
    ap.add_argument("--out", type=Path, default=ROOT / "data" / "tryon" / "out" / "garment-fit.jpg")
    a = ap.parse_args()

    from rembg import new_session, remove

    model = np.array(Image.open(MODEL).convert("RGB"), dtype=np.float32) / 255.0
    H, W = model.shape[:2]
    T = np.array(Image.open(MASK).convert("L").resize((W, H)), dtype=np.float32) / 255.0
    Tb = T > 0.5

    g = remove(Image.open(a.garment).convert("RGB"), session=new_session("u2net")).convert("RGBA")
    g = np.array(g, dtype=np.float32) / 255.0
    Gb = g[..., 3] > 0.5

    ty0, ty1, tl, tr = row_extents(Tb)
    gy0, gy1, gl, gr = row_extents(Gb)

    # bản đồ toạ độ: mỗi pixel vùng áo người mẫu → pixel tương ứng trên áo của shop
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    t = np.clip((yy - ty0) / max(1, ty1 - ty0), 0, 1)
    gy = gy0 + t * (gy1 - gy0)
    gyi = np.clip(gy.round().astype(int), 0, g.shape[0] - 1)
    tlr, trr = tl[yy.astype(int)], tr[yy.astype(int)]
    u = np.clip((xx - tlr) / np.maximum(1, trr - tlr), 0, 1)
    gx = gl[gyi] + u * (gr[gyi] - gl[gyi])
    warped = cv2.remap(g, gx.astype(np.float32), gy.astype(np.float32), interpolation=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    # làm phẳng ánh sáng sẵn có của ảnh áo, rồi phủ bóng/nếp của áo trắng trên người mẫu
    gl_lum = cv2.GaussianBlur(cv2.cvtColor(warped[..., :3], cv2.COLOR_RGB2GRAY), (0, 0), 25)
    flat = warped[..., :3] / np.clip(gl_lum / max(1e-3, float(np.median(gl_lum[Tb]))), 0.5, 1.6)[..., None] ** 0.6
    L = cv2.cvtColor(model, cv2.COLOR_RGB2GRAY)
    ref = np.percentile(L[Tb], 92)
    S = np.clip(L / max(1e-3, ref), 0, 1.15)
    shaded = np.clip(flat * S[..., None] ** 1.05 + np.clip(S - 1, 0, None)[..., None] * 0.5, 0, 1)

    alpha = cv2.GaussianBlur(T, (0, 0), 1.2)[..., None]
    out = model * (1 - alpha) + shaded * alpha
    a.out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(a.out, quality=92)
    print("ok →", a.out)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
