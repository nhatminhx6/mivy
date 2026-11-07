"""Body templates with a CLOSED collar (ghép vest v2).

The overlay keeps the user's own neck; it only fits naturally when the shirt collar wraps snugly round
the neck (collar stand all round, buttoned to the top, tie knot high). Open-V templates leave a long,
ruler-cut skin V that gives the composite away.

Run on the GEN machine (not the dev laptop), against a ComfyUI with Z-Image-Turbo GGUF:
    COMFY=http://127.0.0.1:8188 python3 gen_body_closed.py <out-dir>
Writes <name>-s<seed>.png (1024x1024), several seeds per job; skips files that already exist.
"""
import json, os, sys, time, uuid, urllib.request, urllib.parse
from pathlib import Path

COMFY = os.environ.get("COMFY", "http://127.0.0.1:8188")
SEEDS = [11, 23, 37, 41]

BASE = ("professional passport ID photo, head and shoulders, exact front view, camera at eye level, {who}, "
        "looking straight at the camera, neutral closed-mouth expression, head upright, level shoulders, "
        "{outfit}, the shirt collar fits snugly around the neck with the collar stand visible all the way round, "
        "only a short section of neck visible between the chin and the collar, "
        "plain pure white background, soft even frontal studio lighting, sharp focus, photorealistic, 85mm portrait")
MAN = "a young Vietnamese man with short neat black hair, no hair on the neck"
WOMAN = "a slim young Vietnamese woman with long black hair tied back in a low bun behind her head, no hair on the shoulders or neck"
JOBS = [
    ("man-navy", MAN, "wearing a navy blue suit jacket over a crisp white dress shirt buttoned to the top, "
                      "a navy tie with a small neat knot pulled up tight to the top of the collar"),
    ("man-black", MAN, "wearing a black suit jacket over a crisp white dress shirt buttoned to the top, "
                       "a black tie with a small neat knot pulled up tight to the top of the collar"),
    ("woman-navy", WOMAN, "wearing a navy blue blazer over a crisp white shirt buttoned all the way to the top button, "
                          "small pointed collar points close together under the chin, no tie"),
    ("woman-black", WOMAN, "wearing a black blazer over a crisp white shirt buttoned all the way to the top button, "
                           "small pointed collar points close together under the chin, no tie"),
]

# v3: the AI still drew a skin V down to the knot with v2 — spell out the collar band closing at the throat
BASE_V3 = ("professional passport ID photo, head and shoulders, exact front view, camera at eye level, {who}, "
           "looking straight at the camera, neutral closed-mouth expression, head upright, level shoulders, {outfit}, "
           "the white collar band of the shirt goes all the way round the neck and is buttoned closed at the front of "
           "the throat, the collar band is clearly visible as a white strip around the base of the neck, "
           "no skin visible below the collar band, no V-neck opening, "
           "plain pure white background, soft even frontal studio lighting, sharp focus, photorealistic, 85mm portrait")
JOBS_V3 = [
    ("man-navy-v3", MAN, "wearing a navy blue suit jacket over a crisp white dress shirt with the top button fastened, "
                         "a navy tie with a small tight knot pushed right up against the closed collar band"),
    ("woman-navy-v3", WOMAN, "wearing a navy blue blazer over a crisp white shirt with the top button fastened, "
                             "small collar points touching each other right under the chin, no tie"),
]


# builds: the overlay picks the template whose neck / collar opening best fits the user's neck, so the collar is
# never bent to fit (bending it gave stubs, flat tops and ledges). Same v2 prompt, different necks.
MAN_THICK = ("a stocky Vietnamese man in his late thirties with a round full face, a short thick neck and broad shoulders, "
             "short neat black hair, no hair on the neck")
MAN_SLIM = "a slim young Vietnamese man with a long slender neck, short neat black hair, no hair on the neck"
WOMAN_FULL = ("a Vietnamese woman in her thirties with a round full face and a fuller neck, long black hair tied back "
              "in a low bun behind her head, no hair on the shoulders or neck")
NAVY_MAN = ("wearing a navy blue suit jacket over a crisp white dress shirt buttoned to the top, "
            "a navy tie with a small neat knot pulled up tight to the top of the collar")
NAVY_WOMAN = ("wearing a navy blue blazer over a crisp white shirt buttoned all the way to the top button, "
              "small pointed collar points close together under the chin, no tie")
JOBS_BUILD = [
    ("man-navy-b-thick", MAN_THICK, NAVY_MAN),
    ("man-navy-b-slim", MAN_SLIM, NAVY_MAN),
    ("woman-navy-b-full", WOMAN_FULL, NAVY_WOMAN),
]


# clean collar: no fold / notch where the shirt collar meets the jacket collar at the side of the neck — the
# overlay has to reshape that spot, and a fold there always ends up as a stub or a kink
CLEAN = ("the white shirt collar is smooth and uncreased with straight clean edges, the jacket collar lies flat and "
         "smooth behind it with no folds or wrinkles, at each side of the neck the shirt collar and the jacket collar "
         "form one clean simple outline")
JOBS_CLEAN = [
    ("man-navy-c", MAN, NAVY_MAN + ", " + CLEAN),
    ("man-navy-c-thick", MAN_THICK, NAVY_MAN + ", " + CLEAN),
    ("woman-navy-c", WOMAN, NAVY_WOMAN + ", " + CLEAN),
    ("man-navy-c-slim", MAN_SLIM, NAVY_MAN + ", " + CLEAN),
    ("woman-navy-c-full", WOMAN_FULL, NAVY_WOMAN + ", " + CLEAN),
]


def wf(prompt, seed, prefix):
    return {
        "1": {"class_type": "UnetLoaderGGUF", "inputs": {"unet_name": "z-image-turbo-Q6_K.gguf"}},
        "2": {"class_type": "CLIPLoaderGGUF", "inputs": {"clip_name": "Qwen3-4B-Q6_K.gguf", "type": "lumina2"}},
        "3": {"class_type": "VAELoader", "inputs": {"vae_name": "z_image_ae.safetensors"}},
        "4": {"class_type": "ModelSamplingAuraFlow", "inputs": {"model": ["1", 0], "shift": 3.0}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["2", 0], "text": prompt}},
        "6": {"class_type": "ConditioningZeroOut", "inputs": {"conditioning": ["5", 0]}},
        "7": {"class_type": "EmptySD3LatentImage", "inputs": {"width": 1024, "height": 1024, "batch_size": 1}},
        "8": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0],
                                                    "latent_image": ["7", 0], "seed": seed, "steps": 9, "cfg": 1.0,
                                                    "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }


def main():
    out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
    pending = {}
    for name, who, outfit in JOBS:
        for seed in SEEDS:
            dst = out / f"{name}-s{seed}.png"
            if dst.exists():
                continue
            body = json.dumps({"prompt": wf(BASE.format(who=who, outfit=outfit), seed, "fotodocs_body_closed"),
                               "client_id": uuid.uuid4().hex}).encode()
            req = urllib.request.Request(f"{COMFY}/prompt", data=body, headers={"Content-Type": "application/json"})
            pid = json.load(urllib.request.urlopen(req))["prompt_id"]
            pending[pid] = dst
            print("queued", dst.name, flush=True)

    t0 = time.time()
    while pending and time.time() - t0 < 4 * 3600:
        for pid, dst in list(pending.items()):
            h = json.load(urllib.request.urlopen(f"{COMFY}/history/{pid}"))
            if pid not in h:
                continue
            if h[pid].get("status", {}).get("status_str") == "error":
                print("ERROR", dst.name, flush=True); del pending[pid]; continue
            imgs = [im for o in h[pid]["outputs"].values() for im in o.get("images", [])]
            if imgs:
                im = imgs[0]
                q = urllib.parse.urlencode({"filename": im["filename"], "subfolder": im["subfolder"], "type": im["type"]})
                dst.write_bytes(urllib.request.urlopen(f"{COMFY}/view?{q}").read())
                print("ok", dst.name, int(time.time() - t0), "s", flush=True); del pending[pid]
        time.sleep(10)
    print("done", flush=True)


if __name__ == "__main__":
    main()
