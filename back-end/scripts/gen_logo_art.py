"""Gen kho LOGO MINH HOẠ (vector nhiều màu, kiểu emblem) — chạy OFFLINE 1 lần, lưu tĩnh (kiến trúc Mivy).

Z-Image-Turbo (Apache 2.0) chạy tại máy qua ComfyUI + GGUF (mặc định) hoặc Space HF free (--engine space) → rembg tách nền
→ data/logo-art/<chủ đề>/{raw,png}/<id>.*  (CHƯA đưa vào web cho tới khi anh duyệt). --svg: thêm bản vtracer (đã thử, xấu).
Đã thử và anh loại: Flux qua Pollinations, OmniSVG, Flux + vtracer. Z-Image được anh duyệt (2026-10-26).

Chạy:  .venv/bin/python scripts/gen_logo_art.py [id ...] [--theme pets] [--force]
       .venv/bin/python scripts/gen_logo_art.py --queue 3 [--themes pets,salon]   # xoay vòng mọi ngành, tối đa 3 hình/ngành (0 = hết)
Máy khác (Mac mini…): bash scripts/logo_art_batch.sh — tự cài ComfyUI + model rồi chạy --queue (xem docs/LOGO_ART_GEN.md).
"""

from __future__ import annotations

import argparse
import urllib.parse
import io
import os
import re
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT_ROOT = ROOT / "data" / "logo-art"
os.environ.setdefault("U2NET_HOME", str(ROOT / ".comfyui" / "models" / "rembg"))


STYLE = (
    "Elegant mascot logo of {subject}, professional flat vector illustration, smooth clean curves, "
    "{palette} colors, logo design for a {shop}, centered on a plain white background, no text"
)
PALETTES = [
    "magenta, coral pink and orange",
    "deep teal, turquoise and warm yellow",
    "navy blue, sky blue and coral",
    "plum purple, pink and peach",
    "dark brown, caramel and cream orange",
]

# Ngành → (tên hiển thị, loại shop cho prompt, hình). Chia theo nhóm ngành bán chạy trên sàn VN (làm đẹp, thời trang,
# nhà cửa, mẹ & bé, đồ ăn, thú cưng, công nghệ...) + dịch vụ địa phương (salon, nail, cà phê, quán ăn) — kiểu "ngành lớn →
# ngành con" của Looka/Fiverr Logo Maker.
THEMES: dict[str, dict] = {
    "pets": {"name": "Cá cảnh & thú cưng", "shop": "pet shop", "subjects": {
        "betta": "a betta fish, sweeping long fins and tail drawn as layered flowing ribbon shapes, stylized scales as small dots",
        "goldfish": "a fancy goldfish, flowing double tail drawn as layered ribbon shapes, round body",
        "koi": "a koi carp fish swimming in a graceful S curve, flowing fins, spotted pattern",
        "angelfish": "a tropical angelfish, tall triangular fins and long trailing streamers, striped body",
        "fishbowl": "a round glass fish bowl with a small goldfish and a water plant, simple curved shapes",
        "cat_head": "a cute cat head, big round eyes, pointed ears, simple geometric face",
        "cat_sitting": "a sitting cat seen from the side, elegant curled tail, sleek silhouette",
        "shiba": "a smiling shiba inu dog head, fluffy cheeks, perky ears",
        "corgi": "a happy corgi dog head, big ears, tongue out",
        "dog_cat": "a dog and a cat sitting together side by side, friendly, overlapping silhouettes",
        "paw_heart": "a pet paw print merged with a heart shape",
        "parrot": "a colorful parrot perched on a branch, long tail feathers drawn as flowing ribbons",
        "hamster": "a chubby hamster holding a sunflower seed, round body",
        "rabbit": "a cute rabbit sitting, long ears, fluffy round tail",
        "turtle": "a small turtle walking, patterned hexagon shell",
    }},
    "salon": {"name": "Tóc & barber", "shop": "hair salon", "subjects": {
        "woman_hair": "a woman's face in profile with long flowing wavy hair drawn as ribbon curves",
        "scissors_comb": "crossed hair scissors and a comb, elegant",
        "barber_man": "a bearded man's head with a stylish pompadour haircut, barber shop style",
        "mustache_razor": "a curly mustache with a straight razor",
        "hair_dryer": "a professional hair dryer with flowing air waves",
        "barber_pole": "a classic barber pole with spiral stripes",
        "bun_hair": "a woman's head from behind with an elegant hair bun and a flower",
        "curly_hair": "a woman with voluminous curly afro hair, side profile",
        "brush_scissors": "a round hair brush and scissors with sparkles",
        "braid": "a long braided hair forming an elegant curve",
    }},
    "nail_spa": {"name": "Nail & spa", "shop": "nail and spa salon", "subjects": {
        "hand_nails": "an elegant woman's hand with long polished nails",
        "nail_polish": "a nail polish bottle with a drip of color",
        "lotus_spa": "a lotus flower blooming over water, spa and wellness",
        "spa_stones": "stacked massage stones with a bamboo leaf",
        "face_leaf": "a serene woman's face in profile with leaves, wellness",
        "candle_flower": "an aromatherapy candle with a flower and soft steam",
        "lashes": "an eye with long beautiful eyelashes and a closed eyelid",
        "towel_orchid": "a rolled spa towel with an orchid flower",
        "foot_spa": "a foot dipped in water with petals, pedicure",
        "butterfly_beauty": "a butterfly whose wings are made of elegant leaves",
    }},
    "cosmetics": {"name": "Mỹ phẩm & skincare", "shop": "cosmetics and skincare brand", "subjects": {
        "serum": "a dropper serum bottle with a single drop",
        "cream_jar": "an open cream jar with a smooth swirl of cream",
        "perfume": "an elegant perfume bottle with a flower",
        "lipstick": "a lipstick tube and a kiss mark",
        "leaf_drop": "a green leaf with a water droplet, natural skincare",
        "makeup_brush": "a makeup brush with a powder swirl",
        "mirror": "an oval hand mirror with sparkles",
        "rose_bottle": "a cosmetic bottle wrapped by a rose",
        "aloe": "an aloe vera plant with a drop of gel",
        "woman_glow": "a woman's face in profile with glowing skin and sparkles",
    }},
    "fashion": {"name": "Thời trang", "shop": "fashion boutique", "subjects": {
        "dress": "an elegant woman's dress on a hanger",
        "tshirt": "a t-shirt on a hanger",
        "high_heel": "a stylish high heel shoe",
        "handbag": "a chic ladies handbag",
        "hat": "a wide brim sun hat with a ribbon",
        "model": "a fashion model silhouette in a flowing gown",
        "sewing": "a sewing machine with thread and needle",
        "hanger_heart": "a clothes hanger forming a heart",
        "sneaker": "a modern sneaker shoe",
        "ao_dai": "a woman wearing a Vietnamese ao dai, flowing panels",
    }},
    "coffee_tea": {"name": "Cà phê & trà sữa", "shop": "coffee shop", "subjects": {
        "coffee_cup": "a steaming coffee cup with rising steam swirls",
        "beans": "coffee beans with a leaf",
        "phin": "a Vietnamese phin coffee filter dripping into a glass",
        "bubble_tea": "a bubble milk tea cup with tapioca pearls and a straw",
        "teapot": "a teapot pouring tea into a cup",
        "tea_leaf": "a tea cup with fresh tea leaves",
        "latte_art": "a latte cup with heart latte art seen from above",
        "iced_coffee": "a tall iced coffee glass with ice cubes",
        "coffee_bag": "a coffee bean bag with beans spilling",
        "cat_cup": "a cute cat peeking out of a coffee cup",
    }},
    "food": {"name": "Quán ăn & nhà hàng", "shop": "restaurant", "subjects": {
        "pho": "a steaming bowl of Vietnamese pho with chopsticks",
        "banh_mi": "a Vietnamese banh mi baguette sandwich",
        "chef": "a happy chef with a tall hat",
        "pot": "a cooking pot with steam and a ladle",
        "chicken": "a crispy fried chicken drumstick",
        "pizza": "a slice of pizza with melting cheese",
        "shrimp": "a cooked shrimp, seafood",
        "burger": "a juicy burger",
        "noodle": "a noodle bowl with chopsticks lifting noodles",
        "rice_bowl": "a bowl of rice with a fried egg",
    }},
    "bakery": {"name": "Tiệm bánh", "shop": "bakery", "subjects": {
        "cake": "a layered birthday cake with a cherry on top",
        "cupcake": "a cupcake with swirl frosting",
        "croissant": "a golden croissant",
        "rolling_pin": "a rolling pin with wheat",
        "donut": "a donut with sprinkles",
        "macaron": "a stack of macarons",
        "bread": "a loaf of artisan bread with wheat ears",
        "whisk": "a whisk with a splash of cream",
        "cookie": "a chocolate chip cookie with a bite",
        "baker_girl": "a cute baker girl holding a cake",
    }},
    "flowers": {"name": "Hoa & cây cảnh", "shop": "flower shop", "subjects": {
        "bouquet": "a flower bouquet wrapped in paper",
        "rose": "a single elegant rose",
        "monstera": "a monstera plant in a pot",
        "orchid": "an orchid flower branch",
        "cactus": "a cactus in a pot",
        "basket": "a basket full of flowers",
        "tulip": "a tulip flower",
        "bonsai": "a bonsai tree in a pot",
        "sunflower": "a sunflower",
        "wreath": "a floral wreath circle",
    }},
    "baby": {"name": "Mẹ & bé", "shop": "baby store", "subjects": {
        "baby_face": "a cute smiling baby face",
        "bottle": "a baby milk bottle",
        "teddy": "a teddy bear",
        "stroller": "a baby stroller",
        "mother_child": "a mother hugging a baby, tender",
        "baby_shoes": "a pair of tiny baby shoes",
        "rattle": "a baby rattle toy",
        "stork": "a stork carrying a baby bundle",
        "rocking_horse": "a wooden rocking horse toy",
        "onesie": "a baby onesie",
    }},
    "fitness": {"name": "Thể thao & gym", "shop": "fitness gym", "subjects": {
        "dumbbell": "a dumbbell",
        "runner": "a running athlete in motion",
        "yoga": "a woman in a yoga pose",
        "boxing": "a boxing glove",
        "bicycle": "a racing bicycle",
        "muscle": "a strong flexed arm",
        "football": "a football soccer ball",
        "swimmer": "a swimmer in water",
        "kettlebell": "a kettlebell",
        "shuttlecock": "a badminton shuttlecock and racket",
    }},
    "tech": {"name": "Công nghệ & điện thoại", "shop": "phone and electronics store", "subjects": {
        "phone": "a smartphone",
        "headphones": "headphones with sound waves",
        "laptop": "a laptop",
        "camera": "a camera",
        "smartwatch": "a smartwatch",
        "game_controller": "a game controller",
        "charger": "a charging cable with a lightning bolt",
        "drone": "a flying drone",
        "chip": "a computer chip",
        "speaker": "a bluetooth speaker with sound waves",
    }},
    "home": {"name": "Nhà cửa & nội thất", "shop": "home decor store", "subjects": {
        "house": "a cozy house",
        "armchair": "an armchair",
        "lamp": "a table lamp",
        "key": "a house key",
        "paint_roller": "a paint roller",
        "plant_shelf": "a shelf with a plant",
        "window": "a window with curtains",
        "bed": "a cozy bed",
        "kitchen": "kitchen pots and utensils",
        "broom": "a cleaning broom with sparkles",
    }},
    "auto": {"name": "Xe & sửa chữa", "shop": "motorbike and car repair shop", "subjects": {
        "motorbike": "a scooter motorbike",
        "car": "a sports car",
        "wrench": "crossed wrenches",
        "tire": "a car tire",
        "helmet": "a motorcycle helmet",
        "piston": "an engine piston",
        "gear": "a gear",
        "bike_rider": "a rider on a motorbike",
        "car_wash": "a car with water splash and bubbles",
        "spark_plug": "a spark plug",
    }},
    "edu": {"name": "Giáo dục & sách", "shop": "education center", "subjects": {
        "book": "an open book",
        "grad_cap": "a graduation cap",
        "pencil": "a pencil",
        "globe": "a globe",
        "owl": "a wise owl with glasses",
        "lightbulb": "a lightbulb with an idea spark",
        "abc": "toy blocks",
        "backpack": "a school backpack",
        "rocket_book": "a book launching a rocket",
        "student": "a student reading a book",
    }},
}

PALETTES_OF = {k: i for i, k in enumerate(THEMES)}


COMFY = "http://127.0.0.1:8188"


# Model GGUF trong ComfyUI — máy RAM 8GB dùng bản Q4_K_M (logo_art_batch.sh tự đặt)
UNET = os.environ.get("ZIMAGE_UNET", "z-image-turbo-Q6_K.gguf")
CLIP = os.environ.get("ZIMAGE_CLIP", "Qwen3-4B-Q6_K.gguf")
TIMEOUT = int(os.environ.get("ZIMAGE_TIMEOUT", "3600"))  # máy yếu 1 hình có thể >15 phút


def fetch_local(prompt: str, seed: int) -> bytes:
    """Z-Image-Turbo chạy TẠI MÁY qua ComfyUI (GGUF Q6, free, không giới hạn). Cần ComfyUI đang chạy ở :8188."""
    import json
    import urllib.request
    import uuid

    wf = {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": UNET}},
        "2": {"class_type": "CLIPLoaderGGUF", "inputs": {"clip_name": CLIP, "type": "lumina2"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "z_image_ae.safetensors"}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": 3.0}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "6": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["5", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0],
                                                    "seed": seed, "steps": 9, "cfg": 1.0, "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": "logo_art"}},
    }
    body = json.dumps({"prompt": wf, "client_id": uuid.uuid4().hex}).encode()
    pid = json.load(urllib.request.urlopen(urllib.request.Request(f"{COMFY}/prompt", data=body, headers={"Content-Type": "application/json"})))["prompt_id"]
    t0 = time.time()
    while time.time() - t0 < TIMEOUT:
        h = json.load(urllib.request.urlopen(f"{COMFY}/history/{pid}"))
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error":
                raise RuntimeError(f"ComfyUI lỗi: {st.get('messages', [])[-1:]}")
            imgs = [im for o in h[pid]["outputs"].values() for im in o.get("images", [])]
            if imgs:
                im = imgs[0]
                q = urllib.parse.urlencode({"filename": im["filename"], "subfolder": im["subfolder"], "type": im["type"]})
                return urllib.request.urlopen(f"{COMFY}/view?{q}").read()
        time.sleep(2)
    raise RuntimeError(f"ComfyUI quá {TIMEOUT // 60} phút chưa xong")


_client = None


def fetch(prompt: str, seed: int) -> bytes:
    """Z-Image-Turbo qua Space Hugging Face (free). Trả về bytes PNG."""
    global _client
    from gradio_client import Client

    last: Exception | None = None
    for attempt in range(3):
        try:
            if _client is None:
                _client = Client("Tongyi-MAI/Z-Image-Turbo", verbose=False)
            r = _client.predict(prompt=prompt, resolution="1024x1024 ( 1:1 )", seed=seed, steps=9, shift=3.0,
                                random_seed=False, gallery_images=[], api_name="/generate")
            g = r[0] if isinstance(r, (list, tuple)) else r
            item = g[-1] if isinstance(g, list) else g
            path = item.get("image") if isinstance(item, dict) else item
            path = path.get("path") if isinstance(path, dict) else path
            return Path(path).read_bytes()
        except Exception as e:  # noqa: BLE001 — Space bận/hết lượt → chờ rồi thử lại
            last = e
            _client = None
            time.sleep(20 * (attempt + 1))
    raise RuntimeError(f"gen thất bại: {last}")


def cutout(raw: bytes, session):
    from PIL import Image
    from rembg import remove

    img = remove(Image.open(io.BytesIO(raw)).convert("RGB"), session=session).convert("RGBA")
    box = img.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        raise RuntimeError("tách nền ra rỗng")
    img = img.crop(box)
    side = int(max(img.size) * 1.08)
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    canvas.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)
    return canvas.resize((768, 768), Image.LANCZOS)


def to_svg(png_path: Path, svg_path: Path, colors: int = 4) -> int:
    """PNG trong suốt → SVG mượt: gom còn vài màu phẳng + viền alpha sắc, phóng 2x rồi mới trace. Trả về số path."""
    import tempfile

    import vtracer
    from PIL import Image, ImageFilter

    im = Image.open(png_path).convert("RGBA")
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    alpha = im.getchannel("A").filter(ImageFilter.GaussianBlur(1.2)).point(lambda a: 255 if a > 128 else 0)
    rgb = Image.new("RGB", im.size, (255, 255, 255)); rgb.paste(im.convert("RGB"), mask=alpha)
    q = rgb.filter(ImageFilter.MedianFilter(5)).quantize(colors=colors + 1, method=Image.Quantize.MEDIANCUT).convert("RGB")
    out = Image.new("RGBA", im.size, (0, 0, 0, 0)); out.paste(q, mask=alpha)
    with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tf:
        out.save(tf.name)
        vtracer.convert_image_to_svg_py(
            tf.name, str(svg_path), colormode="color", hierarchical="stacked", mode="spline",
            filter_speckle=24, color_precision=6, layer_difference=32, corner_threshold=90,
            length_threshold=8.0, max_iterations=10, splice_threshold=60, path_precision=2,
        )
    return len(re.findall(r"<path", svg_path.read_text()))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="*")
    ap.add_argument("--theme", default="pets")
    ap.add_argument("--queue", type=int, metavar="N", help="xoay vòng mọi ngành, tối đa N hình/ngành (0 = hết), bỏ qua hình đã có")
    ap.add_argument("--themes", help="--queue: chỉ các ngành này, cách nhau dấu phẩy")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--svg", action="store_true", help="thêm bản SVG vtracer (thử nghiệm)")
    ap.add_argument("--engine", choices=["local", "space"], default="local", help="local = ComfyUI tại máy (mặc định), space = HF Space free (giới hạn lượt)")
    a = ap.parse_args()
    if a.queue is not None:  # (ngành, id) xen kẽ: hình 1 mọi ngành, rồi hình 2 mọi ngành…
        names = a.themes.split(",") if a.themes else list(THEMES)
        lists = {t: list(THEMES[t]["subjects"])[: a.queue or None] for t in names}
        jobs = [(t, ids[i]) for i in range(max(map(len, lists.values()))) for t, ids in lists.items() if i < len(ids)]
    else:
        jobs = [(a.theme, id_) for id_ in (a.ids or list(THEMES[a.theme]["subjects"]))]

    from rembg import new_session

    session = new_session("birefnet-general", providers=["CPUExecutionProvider"])
    failed = []
    for n, (theme_id, id_) in enumerate(jobs, 1):
        theme, base = THEMES[theme_id], OUT_ROOT / theme_id
        subjects = theme["subjects"]
        for sub in ("raw", "png") + (("svg",) if a.svg else ()):
            (base / sub).mkdir(parents=True, exist_ok=True)
        png = base / "png" / f"{id_}.png"
        tag = f"[{n}/{len(jobs)}] {theme_id}/{id_}"
        if png.exists() and not a.force:
            print(f"{tag}: có rồi, bỏ qua", flush=True)
            continue
        try:
            t = time.time()
            prompt = STYLE.format(subject=subjects[id_], shop=theme["shop"], palette=PALETTES[(list(subjects).index(id_) + PALETTES_OF[theme_id]) % len(PALETTES)])
            raw = (fetch_local if a.engine == "local" else fetch)(prompt, seed=7)
            (base / "raw" / f"{id_}.png").write_bytes(raw)
            cutout(raw, session).save(png, optimize=True)
            extra = f", {to_svg(png, base / 'svg' / f'{id_}.svg')} path" if a.svg else ""
            print(f"{time.strftime('%H:%M')} {tag}: ok ({time.time() - t:.0f}s{extra})", flush=True)
        except Exception as e:  # noqa: BLE001
            failed.append(id_)
            print(f"{time.strftime('%H:%M')} {tag}: LỖI {e}", flush=True)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
