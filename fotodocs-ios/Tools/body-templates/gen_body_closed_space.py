"""Same templates as gen_body_closed.py, generated on the free Hugging Face Space (Z-Image-Turbo):
the Space's servers do the work, this machine only sends the prompt and downloads the PNG.
    back-end/.venv/bin/python gen_body_closed_space.py <out-dir> [name ...]   (name ending -v3: the v3 collar prompt; name with -b-: the builds)
"""
import sys, time
from pathlib import Path
from gen_body_closed import BASE, JOBS, SEEDS, BASE_V3, JOBS_V3, JOBS_BUILD, JOBS_CLEAN

_client = None


def fetch(prompt, seed):
    global _client
    from gradio_client import Client
    last = None
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
        except Exception as e:  # Space busy / out of quota: wait, retry
            last = e; _client = None; time.sleep(20 * (attempt + 1))
    raise RuntimeError(f"gen failed: {last}")


out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
only = set(sys.argv[2:])
v3 = any(o.endswith("-v3") or "-v3-" in o for o in only)
if v3:
    BASE, JOBS = BASE_V3, JOBS_V3
elif any("-c" in o for o in only):       # clean collar (no fold where it meets the jacket collar)
    JOBS = JOBS_CLEAN
elif any("-b-" in o for o in only):      # builds (different necks), v2 prompt
    JOBS = JOBS_BUILD
for name, who, outfit in JOBS:
    if only and not any(name == o or f"{name}-s" in o for o in only):
        continue
    for seed in SEEDS:
        dst = out / f"{name}-s{seed}.png"
        if dst.exists() or (only and name not in only and f"{name}-s{seed}" not in only):
            continue
        t = time.time()
        dst.write_bytes(fetch(BASE.format(who=who, outfit=outfit), seed))
        print("ok", dst.name, int(time.time() - t), "s", flush=True)
print("done", flush=True)
