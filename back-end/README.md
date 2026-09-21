# Mivy backend

For product direction, current implementation status, and cross-AI continuation notes, read
[HANDOFF.md](HANDOFF.md).

Mivy Studio turns a short campaign brief into Vietnamese copy, captions and a video script
using local Ollama (`qwen3:8b`), then generates an image using ComfyUI. No API key is needed.
Open `/ui/`, choose a brief, select a direction, click **Viết bộ nội dung bằng AI**, then
**Thiết kế → Tạo ảnh AI**. Uploaded product subjects can optionally be preserved.

Start the installed local stack with `./scripts/run-local.sh`. The script reuses services
already running. Stop with Ctrl+C to stop only services started by that invocation.
Campaign drafts live in browser localStorage; image jobs/results live in SQLite and `data/`.
AI errors never fall back to template content. Generated images are 512×512; poster export
is a 1080×1080 canvas composition. Video output is a script, not a rendered video.

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

Open Mivy Studio at [http://127.0.0.1:8000/ui/](http://127.0.0.1:8000/ui/) or
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

All three placeholders are required. The bundled adapter maps known node IDs when switching
to text-to-image (EmptyLatentImage, bypassing input/mask/composite). Keep the bundled node IDs
when editing this workflow. It uploads reference images when provided, submits `/prompt`,
polls `/history`, and downloads results through `/view`. A missing workflow or placeholder produces a
clear failed-job message.

### Bundled local setup

This checkout includes a project-local Apple Silicon ComfyUI installation, DreamShaper 8 model,
and an image-to-image workflow. Start ComfyUI and Mivy together with:

```bash
./scripts/run-local.sh
```

Then use the Mivy UI at `http://127.0.0.1:8000/ui/`. Stop both processes with `Ctrl+C`.

`run-local.sh` selects the real image engine. Uploaded products use local BiRefNet
segmentation and deterministic composition, preserving original product pixels and fitting
the entire cutout with padding. Supported backgrounds: white and pastel gradient.
Exports are PNG: 1080×1080, 1080×1350, or 1080×1920. No diffusion is used for uploaded products.
Illustrations without an uploaded photo still use ComfyUI.

Install the product runtime/model once (about 973 MB download):

```bash
./scripts/setup-product.sh
```

Masks are cached in `data/cutout_cache/`. Each output also has `.mask.png`, `.cutout.png`
and `.json` diagnostics beside it. Segmentation can still fail on transparent objects,
complex backgrounds, or tiny details; these are not validated product categories yet.

The local checkpoint is [DreamShaper 8 by Lykon](https://huggingface.co/Lykon/DreamShaper/blob/main/DreamShaper_8_pruned.safetensors),
saved as `.comfyui/models/checkpoints/dreamshaper_8.safetensors`.

## API errors

Errors use a consistent shape and never include local file paths or stack traces:

```json
{"error": {"code": "job_not_found", "message": "Generation job was not found"}}
```

## Local creative API

- `POST /v1/creative/text`: JSON brief (`name`, `details`, `type`, `brand`, `audience`,
  `tone`, `concept` 0–2, optional `when`, `where`, `cta`). Returns validated outputs + model.
- `POST /v1/creative/images`: multipart `prompt`, optional `image`; returns queued job ID.
  This endpoint refuses the mock engine. Poll existing `/v1/generations/{id}`.
- `OLLAMA_BASE_URL`, `TEXT_MODEL`, `TEXT_TIMEOUT_SECONDS` configure text inference.
  The local runner assumes default service ports (11434/8188/8000).
- Text calls and image worker share a process-local lock. Run one API process for this local
  setup; it is not a distributed/multi-worker queue.
