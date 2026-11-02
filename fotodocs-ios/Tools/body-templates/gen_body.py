import json, sys, time, uuid, urllib.request, urllib.parse
from pathlib import Path
COMFY = "http://127.0.0.1:8188"
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)  # usage: gen_body.py <out-dir>
BASE = ("professional passport ID photo, head and shoulders, exact front view, {who}, looking straight at the camera, "
        "neutral closed-mouth expression, head upright, chin slightly raised, slim long neck clearly visible between the chin and the shirt collar, "
        "{outfit}, plain pure white background, soft even studio lighting, sharp focus, photorealistic, 85mm portrait")
JOBS = [
    ("woman-navy", "a slim young Vietnamese woman with long black hair tied back in a low bun behind her head, no hair on the shoulders",
     "wearing a navy blue blazer over a crisp white shirt with a pointed collar"),
    ("woman-black", "a slim young Vietnamese woman with long black hair tied back in a low bun behind her head, no hair on the shoulders",
     "wearing a black blazer over a crisp white shirt with a pointed collar"),
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
        "8": {"class_type": "KSampler", "inputs": {"model": ["4", 0], "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["7", 0],
                                                    "seed": seed, "steps": 9, "cfg": 1.0, "sampler_name": "res_multistep", "scheduler": "simple", "denoise": 1.0}},
        "9": {"class_type": "VAEDecode", "inputs": {"samples": ["8", 0], "vae": ["3", 0]}},
        "10": {"class_type": "SaveImage", "inputs": {"images": ["9", 0], "filename_prefix": prefix}},
    }
pending = {}
for name, who, outfit in JOBS:
    dst = out / f"{name}.png"
    if dst.exists(): continue
    body = json.dumps({"prompt": wf(BASE.format(who=who, outfit=outfit), 7, "fotodocs_body"), "client_id": uuid.uuid4().hex}).encode()
    pid = json.load(urllib.request.urlopen(urllib.request.Request(f"{COMFY}/prompt", data=body, headers={"Content-Type": "application/json"})))["prompt_id"]
    pending[pid] = dst; print("queued", name, flush=True)
t0 = time.time()
while pending and time.time() - t0 < 4 * 3600:
    for pid, dst in list(pending.items()):
        h = json.load(urllib.request.urlopen(f"{COMFY}/history/{pid}"))
        if pid in h:
            st = h[pid].get("status", {})
            if st.get("status_str") == "error": print("ERROR", dst.name, flush=True); del pending[pid]; continue
            imgs = [im for o in h[pid]["outputs"].values() for im in o.get("images", [])]
            if imgs:
                im = imgs[0]; q = urllib.parse.urlencode({"filename": im["filename"], "subfolder": im["subfolder"], "type": im["type"]})
                dst.write_bytes(urllib.request.urlopen(f"{COMFY}/view?{q}").read()); print("ok", dst.name, int(time.time() - t0), "s", flush=True); del pending[pid]
    time.sleep(10)
print("done", flush=True)
