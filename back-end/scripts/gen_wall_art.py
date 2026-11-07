"""Gen KHO TRANH TREO TƯỜNG (canvas decor) cho Mivy — OFFLINE, 1 lần, lưu tĩnh (kiến trúc Mivy).

⚠️ CHẠY TRÊN MÁY MẠNH (vd qua Antigravity), KHÔNG chạy trên máy anh (yếu, lag).

Mô hình Mivy: AI gen SẴN kho tranh → lưu tĩnh → web chỉ CHỌN + cá nhân hoá (khung/chữ) → render code → file in canvas.
Mỗi style là 1 gu tranh; mỗi "subject" là 1 bố cục; mỗi subject gen --per biến thể (seed khác) cho phong phú.

────────────────────────────────────────────────────────
CÀI ĐẶT (chọn 1 engine):
  • Flux (chất cao, cần GPU ≥12GB) — MẶC ĐỊNH, dùng FLUX.1-schnell (Apache, free, KHÔNG cần token HF):
        pip install torch diffusers transformers accelerate sentencepiece pillow
  • Space (không cần GPU, free, gu Z-Image anh đã duyệt) — dựa HF Space, giới hạn lượt:
        pip install gradio_client pillow

CHẠY:
  python gen_wall_art.py                          # mọi style đang bật, engine flux, khổ dọc 2:3
  python gen_wall_art.py --styles sondau,thuymac  # chỉ vài style
  python gen_wall_art.py --per 8                   # 8 biến thể / bố cục
  python gen_wall_art.py --engine space           # dùng HF Space Z-Image thay vì Flux
  python gen_wall_art.py --aspect ngang           # dọc | ngang | vuong
  python gen_wall_art.py --force                   # gen đè tấm đã có

KẾT QUẢ: ./data/wall-art/<style>/<subject>_<n>.png
  → Gửi anh DUYỆT trước. Đạt rồi mới copy sang web/public/wall-art/<style>/ để web dùng.
  (KHÔNG tự đánh giá ảnh — anh là người chấm.)
────────────────────────────────────────────────────────
"""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]           # back-end/
OUT_ROOT = ROOT / "data" / "wall-art"

# Đuôi chất lượng chung — đẩy độ chi tiết, chất "tranh treo tường decor".
QUALITY = "beautiful wall art decor painting, masterpiece, highly detailed, elegant, gallery quality"

# ── KHO STYLE ──────────────────────────────────────────────────────────────
# enabled=True: gen mặc định. Bật thêm style = đổi False→True (anh chấm gu rồi quyết).
# base: câu mô tả gu chung của style; mỗi subject là 1 bố cục cụ thể.
STYLES: dict[str, dict] = {
    "sondau": {  # Sơn dầu phong cảnh ấm — anh đã duyệt gu (tấm nhà tranh + hoa đào)
        "enabled": True,
        "base": "romantic oil painting, warm soft light, painterly brush strokes, {subj}",
        "subjects": {
            "nha_tranh_hoadao": "a cozy rustic cottage with a tiled roof on a hillside, a blooming pink cherry blossom tree, golden sunset over layered misty mountains, wildflowers",
            "thuyen_ho_suong": "a lone wooden boat on a calm misty lake at dawn, distant mountains, soft reflections",
            "canh_dong_lavender": "a lavender field stretching to rolling hills at sunset, warm purple and gold sky",
            "rung_thu_suoi": "an autumn forest with golden and red leaves and a small stream, sunlight through trees",
            "lang_chai_binhminh": "a peaceful coastal fishing village at sunrise, small boats, warm glowing light",
            "nui_tuyet_ho": "snowy mountain peaks reflected in a turquoise alpine lake, pine trees",
            "dong_lua_vn": "a Vietnamese countryside rice paddy at golden hour, palm trees and a water buffalo, warm light",
            "hoian_den_long": "Hoi An ancient town with glowing lanterns reflected on the river at dusk",
        },
    },
    "thuymac": {  # Thủy mặc / mực nước
        "enabled": True,
        "base": ("traditional Chinese shan shui ink wash painting, {subj}, "
                 "monochrome black ink, authentic sumi-e brushwork, wet and dry brush, "
                 "soft ink wash gradients, large empty negative space, on white rice paper, no seal"),
        "subjects": {
            "nui_thong": "misty layered mountain peaks and a lone gnarled pine on a cliff",
            "truc": "a few tall bamboo stalks and leaves swaying in the wind",
            "sen_ca_chep": "lotus flowers and lily pads with koi carp swimming below",
            "thac_nui": "a waterfall cascading between tall misty cliffs",
            "hac_tung": "two red-crowned cranes standing by an old pine tree",
            "thuyen_cau": "a small fisherman's boat on a wide misty river at dawn",
            "son_thuy": "a classic shan shui river valley with distant mountains and a village",
            "ma_phi": "galloping horses in expressive ink brush strokes",
        },
    },
    "botanical": {  # Hoa & thực vật — trang trí nhẹ (để sẵn, anh bật nếu thích)
        "enabled": False,
        "base": "elegant botanical art print, {subj}, soft neutral background, minimalist, decorative",
        "subjects": {
            "la_nhietdoi": "lush green tropical monstera and palm leaves",
            "hoa_dai_mau_nuoc": "a watercolor bouquet of soft wildflowers",
            "canh_dao_toithieu": "a single blooming branch, minimalist, beige background",
            "co_lau": "soft pampas grass in neutral beige tones",
            "la_vang": "golden eucalyptus leaves, luxury botanical, cream background",
            "xuong_rong": "desert cacti in warm earthy terracotta tones",
        },
    },
    "abstract": {  # Trừu tượng / Bắc Âu tối giản (để sẵn, anh bật nếu thích)
        "enabled": False,
        "base": "modern abstract wall art, {subj}, minimalist, scandinavian style",
        "subjects": {
            "mang_mau_earthy": "abstract color blocks in beige, terracotta and cream",
            "line_art_mat": "a minimalist single continuous line drawing of a face, beige",
            "nui_hinhhoc": "geometric mountains and a rising sun, mid-century modern",
            "song_nuoc": "calm abstract wavy lines evoking the ocean, soft blue and sand",
            "marble_vang": "abstract marble texture with delicate gold veins, luxury",
            "bauhaus": "bauhaus geometric shapes in muted primary colors",
        },
    },
}

# Khổ (aspect) → kích thước pixel (dọc hợp tranh treo tường nhất).
ASPECTS = {
    "doc":   (896, 1344),   # 2:3 đứng — mặc định
    "ngang": (1344, 896),   # 3:2 nằm
    "vuong": (1024, 1024),  # 1:1
}
# Space (Z-Image) dùng chuỗi dropdown cố định; nếu Space đổi option, sửa ở đây.
SPACE_RES = {
    "doc":   "1024x1536 ( 2:3 )",
    "ngang": "1536x1024 ( 3:2 )",
    "vuong": "1024x1024 ( 1:1 )",
}


# ── ENGINE: FLUX.1-schnell local (mặc định, chất cao) ───────────────────────
_flux = None


def gen_flux(prompt: str, seed: int, w: int, h: int) -> "object":
    """Trả về PIL.Image. Dùng FLUX.1-schnell (Apache, free, không cần token)."""
    global _flux
    import torch
    from diffusers import FluxPipeline

    if _flux is None:
        _flux = FluxPipeline.from_pretrained(
            "black-forest-labs/FLUX.1-schnell", torch_dtype=torch.bfloat16
        )
        _flux.enable_model_cpu_offload()  # chạy được cả GPU VRAM vừa phải
    g = torch.Generator("cpu").manual_seed(seed)
    return _flux(prompt, width=w, height=h, guidance_scale=0.0,
                 num_inference_steps=4, max_sequence_length=256, generator=g).images[0]


# ── ENGINE: Z-Image Space HF (không cần GPU) ────────────────────────────────
_space = None


def gen_space(prompt: str, seed: int, aspect: str):
    """Trả về PIL.Image từ HF Space Z-Image-Turbo (gu anh đã duyệt)."""
    global _space
    from PIL import Image
    from gradio_client import Client

    if _space is None:
        _space = Client("Tongyi-MAI/Z-Image-Turbo", verbose=False)
    res = SPACE_RES.get(aspect, SPACE_RES["vuong"])
    last = None
    for res_try in (res, SPACE_RES["vuong"]):          # khổ dọc lỗi → fallback 1:1
        try:
            r = _space.predict(prompt=prompt, resolution=res_try, seed=seed, steps=9, shift=3.0,
                               random_seed=False, gallery_images=[], api_name="/generate")
            g = r[0] if isinstance(r, (list, tuple)) else r
            item = g[-1] if isinstance(g, list) else g
            p = item.get("image") if isinstance(item, dict) else item
            p = p.get("path") if isinstance(p, dict) else p
            return Image.open(p)
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(10)
    raise RuntimeError(f"Space lỗi: {last}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--engine", choices=["flux", "space"], default="flux")
    ap.add_argument("--styles", help="chỉ các style này, cách nhau dấu phẩy (mặc định: mọi style enabled)")
    ap.add_argument("--per", type=int, default=4, help="số biến thể mỗi bố cục (seed khác nhau)")
    ap.add_argument("--aspect", choices=list(ASPECTS), default="doc")
    ap.add_argument("--force", action="store_true", help="gen đè tấm đã có")
    a = ap.parse_args()

    names = a.styles.split(",") if a.styles else [k for k, v in STYLES.items() if v["enabled"]]
    w, h = ASPECTS[a.aspect]
    jobs = [(st, sub, n) for st in names for sub in STYLES[st]["subjects"] for n in range(1, a.per + 1)]
    print(f"Engine={a.engine} aspect={a.aspect}({w}x{h}) styles={names} → {len(jobs)} tấm", flush=True)

    failed = 0
    for i, (st, sub, n) in enumerate(jobs, 1):
        style = STYLES[st]
        out_dir = OUT_ROOT / st
        out_dir.mkdir(parents=True, exist_ok=True)
        out = out_dir / f"{sub}_{n}.png"
        tag = f"[{i}/{len(jobs)}] {st}/{sub}_{n}"
        if out.exists() and not a.force:
            print(f"{tag}: có rồi, bỏ qua", flush=True)
            continue
        prompt = f"{style['base'].format(subj=style['subjects'][sub])}, {QUALITY}"
        seed = 1000 * list(STYLES).index(st) + 100 * list(style["subjects"]).index(sub) + n
        t = time.time()
        try:
            img = gen_flux(prompt, seed, w, h) if a.engine == "flux" else gen_space(prompt, seed, a.aspect)
            img.convert("RGB").save(out, quality=92)
            print(f"{time.strftime('%H:%M')} {tag}: ok ({time.time() - t:.0f}s)", flush=True)
        except Exception as e:  # noqa: BLE001
            failed += 1
            print(f"{time.strftime('%H:%M')} {tag}: LỖI {e}", flush=True)
    print(f"Xong. Lỗi: {failed}/{len(jobs)}. Output: {OUT_ROOT}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
