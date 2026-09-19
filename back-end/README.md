# Mivy backend

For product direction, current implementation status, and cross-AI continuation notes, read
[HANDOFF.md](HANDOFF.md).

The initial local-first backend for Mivy. It accepts a product image, persists a generation
job, and processes jobs one at a time using either a working mock engine or a ComfyUI adapter.

## Requirements and setup

Python 3.12 is required.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e '.[dev]'
cp .env.example .env
```

Settings are read from environment variables or `.env`. Local data is stored under `data/` by
default, and database tables/directories are created automatically at startup.

## Run the backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open the local test UI at [http://127.0.0.1:8000/ui/](http://127.0.0.1:8000/ui/) or
Swagger UI at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

## Test and lint

```bash
ruff check .
pytest
```

## Try the mock generation flow

The default `GENERATION_ENGINE=mock` copies the uploaded image to the output directory after a
short delay. Create a job:

```bash
curl -i -X POST http://127.0.0.1:8000/v1/generations/images \
  -F 'image=@/absolute/path/to/product.png;type=image/png' \
  -F 'prompt=Premium studio advertisement' \
  -F 'style=minimal' \
  -F 'aspect_ratio=1:1'
```

Use the returned UUID to check status and download the result:

```bash
curl http://127.0.0.1:8000/v1/generations/JOB_ID
curl -o result.png http://127.0.0.1:8000/v1/generations/JOB_ID/result
```

## Switch to ComfyUI

Run ComfyUI separately on its local API port, then set:

```env
GENERATION_ENGINE=comfyui
COMFYUI_BASE_URL=http://127.0.0.1:8188
COMFYUI_WORKFLOW_PATH=./workflows/product_ad.json
GENERATION_TIMEOUT_SECONDS=600
```

In ComfyUI, build and validate the image workflow, then choose **Save (API Format)** (enable dev
mode in ComfyUI settings if that option is hidden). Save the JSON as
`workflows/product_ad.json`. Replace the applicable input values in that API JSON with these
literal strings:

- `{{INPUT_IMAGE}}` in the load-image node's image input
- `{{PROMPT}}` in the positive text-prompt input
- `{{OUTPUT_PREFIX}}` in the save-image node's filename-prefix input

All three placeholders are required. The adapter deliberately does not assume node IDs: it
performs placeholder substitution, uploads the source image, submits `/prompt`, polls `/history`,
and downloads the resulting image through `/view`. A missing workflow or placeholder produces a
clear failed-job message.

### Bundled local setup

This checkout includes a project-local Apple Silicon ComfyUI installation, DreamShaper 8 model,
and an image-to-image workflow. Start ComfyUI and Mivy together with:

```bash
./scripts/run-local.sh
```

Then use the Mivy UI at `http://127.0.0.1:8000/ui/`. Stop both processes with `Ctrl+C`.

`run-local.sh` explicitly selects the ComfyUI engine. The workflow center-crops the uploaded
image to 512×512 before generation to keep memory usage manageable on a 16 GB Mac.
The current workflow produces square images regardless of the requested aspect ratio.
The workflow segments the product with U2NetP, inpaints the background, then composites the
original product back onto the result. Product interiors are preserved; segmentation boundaries
can still need refinement, especially for transparent products or cluttered photos. It keeps the
original product angle rather than generating a new viewpoint.

The project custom node needs additional dependencies in ComfyUI's environment:

```bash
uv pip install --python .comfyui/.venv/bin/python -r comfy_nodes/requirements.txt
```

`run-comfyui.sh` links `comfy_nodes/mivy_product` into ComfyUI and stores the segmentation model
under `.comfyui/models/rembg/` (downloaded automatically on first use).

The local checkpoint is [DreamShaper 8 by Lykon](https://huggingface.co/Lykon/DreamShaper/blob/main/DreamShaper_8_pruned.safetensors),
saved as `.comfyui/models/checkpoints/dreamshaper_8.safetensors`.

## API errors

Errors use a consistent shape and never include local file paths or stack traces:

```json
{"error": {"code": "job_not_found", "message": "Generation job was not found"}}
```
