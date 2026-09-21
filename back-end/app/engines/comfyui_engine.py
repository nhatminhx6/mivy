import asyncio
import hashlib
import json
from pathlib import Path
from typing import Any

import aiofiles
import httpx

from app.engines.base import (
    GenerationEngine,
    GenerationEngineError,
    GenerationInput,
    GenerationOutput,
)


class ComfyUIEngine(GenerationEngine):
    # Base render sizes tuned for SD 1.5 (DreamShaper 8); upscaled 2x before saving so
    # the exported image is large enough to post on Shopee/TikTok/Facebook.
    ASPECT_DIMENSIONS = {"1:1": (512, 512), "4:5": (512, 640), "9:16": (512, 896)}
    UPSCALE_BY = 2.0

    def __init__(self, base_url: str, workflow_path: Path, output_dir: Path, timeout: int) -> None:
        self.base_url = base_url.rstrip("/")
        self.workflow_path = workflow_path
        self.output_dir = output_dir
        self.timeout = timeout

    async def generate(self, generation_input: GenerationInput) -> GenerationOutput:
        try:
            async with asyncio.timeout(self.timeout):
                async with httpx.AsyncClient(base_url=self.base_url, timeout=30) as client:
                    uploaded_name = (
                        await self._upload(client, generation_input.input_image_path)
                        if generation_input.input_image_path
                        else None
                    )
                    prompt = generation_input.prompt
                    if generation_input.style:
                        prompt = f"{prompt}, {generation_input.style} advertising style"
                    workflow = await self._load_and_map_workflow(
                        uploaded_name,
                        prompt,
                        generation_input.job_id,
                        generation_input.aspect_ratio,
                    )
                    prompt_id = await self._submit(client, workflow)
                    image = await self._wait_for_image(client, prompt_id)
                    output_path = await self._download(client, image, generation_input.job_id)
                    try:
                        await client.post(
                            "/free", json={"unload_models": True, "free_memory": True}
                        )
                    except httpx.HTTPError:
                        pass  # Image is already saved; cleanup must not discard it.
                    return GenerationOutput(output_path, prompt_id)
        except TimeoutError as exc:
            raise GenerationEngineError("Generation timed out") from exc
        except httpx.HTTPError as exc:
            raise GenerationEngineError("ComfyUI is unavailable") from exc

    async def _upload(self, client: httpx.AsyncClient, path: Path) -> str:
        async with aiofiles.open(path, "rb") as file:
            content = await file.read()
        response = await client.post(
            "/upload/image", files={"image": (path.name, content, "application/octet-stream")}
        )
        response.raise_for_status()
        data = response.json()
        name = data.get("name")
        if not isinstance(name, str):
            raise GenerationEngineError("ComfyUI returned an invalid upload response")
        return name

    async def _load_and_map_workflow(
        self,
        input_name: str | None,
        prompt: str,
        output_prefix: str,
        aspect_ratio: str = "1:1",
    ) -> dict[str, Any]:
        if not self.workflow_path.is_file():
            raise GenerationEngineError("ComfyUI workflow file is missing")
        async with aiofiles.open(self.workflow_path, encoding="utf-8") as file:
            raw = await file.read()
        placeholders = {
            "{{INPUT_IMAGE}}": input_name or "",
            "{{PROMPT}}": prompt,
            "{{OUTPUT_PREFIX}}": output_prefix,
        }
        missing = [placeholder for placeholder in placeholders if placeholder not in raw]
        if missing:
            raise GenerationEngineError(
                "ComfyUI workflow is missing placeholders: " + ", ".join(missing)
            )
        try:
            workflow = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise GenerationEngineError("ComfyUI workflow is not valid JSON") from exc
        if not isinstance(workflow, dict):
            raise GenerationEngineError("ComfyUI workflow must be a JSON object")
        mapped = self._replace_placeholders(workflow, placeholders)
        width, height = self.ASPECT_DIMENSIONS.get(aspect_ratio, (512, 512))
        if input_name is None:
            for key in ("2", "9", "10", "11"):
                mapped.pop(key, None)
            mapped["3"] = {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": width, "height": height, "batch_size": 1},
            }
            upscale_source = ["7", 0]
        else:
            mapped["9"]["inputs"]["width"] = width
            mapped["9"]["inputs"]["height"] = height
            # Generate scenery independently; never let diffusion redraw/extend the shoe.
            mapped["3"] = {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": width, "height": height, "batch_size": 1},
            }
            mapped["5"]["inputs"]["text"] += ", products, shoes, footwear, people, hands"
            upscale_source = ["11", 0]
        # Upscale the finished image so the export is large enough to post.
        mapped["12"] = {
            "class_type": "ImageScaleBy",
            "inputs": {
                "image": upscale_source,
                "upscale_method": "lanczos",
                "scale_by": self.UPSCALE_BY,
            },
        }
        mapped["8"]["inputs"]["images"] = ["12", 0]
        self._randomize_sampler_seeds(mapped, output_prefix)
        return mapped

    def _randomize_sampler_seeds(self, workflow: dict[str, Any], job_id: str) -> None:
        seed = int.from_bytes(hashlib.sha256(job_id.encode()).digest()[:8], "big")
        for node in workflow.values():
            if isinstance(node, dict) and node.get("class_type") == "KSampler":
                inputs = node.get("inputs")
                if isinstance(inputs, dict):
                    inputs["seed"] = seed

    def _replace_placeholders(self, value: Any, placeholders: dict[str, str]) -> Any:
        if isinstance(value, dict):
            return {
                key: self._replace_placeholders(item, placeholders) for key, item in value.items()
            }
        if isinstance(value, list):
            return [self._replace_placeholders(item, placeholders) for item in value]
        if isinstance(value, str):
            for placeholder, replacement in placeholders.items():
                value = value.replace(placeholder, replacement)
        return value

    async def _submit(self, client: httpx.AsyncClient, workflow: dict[str, Any]) -> str:
        response = await client.post("/prompt", json={"prompt": workflow})
        response.raise_for_status()
        prompt_id = response.json().get("prompt_id")
        if not isinstance(prompt_id, str):
            raise GenerationEngineError("ComfyUI returned an invalid prompt response")
        return prompt_id

    async def _wait_for_image(self, client: httpx.AsyncClient, prompt_id: str) -> dict[str, str]:
        while True:
            response = await client.get(f"/history/{prompt_id}")
            response.raise_for_status()
            record = response.json().get(prompt_id)
            if record:
                status = record.get("status", {})
                if status.get("status_str") == "error":
                    raise GenerationEngineError("ComfyUI generation failed")
                for node_output in record.get("outputs", {}).values():
                    images = node_output.get("images", [])
                    if images:
                        return images[0]
                if status.get("completed"):
                    raise GenerationEngineError("ComfyUI completed without an output image")
            await asyncio.sleep(1)

    async def _download(
        self, client: httpx.AsyncClient, image: dict[str, str], job_id: str
    ) -> Path:
        filename = image.get("filename")
        if not filename:
            raise GenerationEngineError("ComfyUI returned invalid output metadata")
        response = await client.get(
            "/view",
            params={
                "filename": filename,
                "subfolder": image.get("subfolder", ""),
                "type": image.get("type", "output"),
            },
        )
        response.raise_for_status()
        suffix = Path(filename).suffix or ".png"
        output_path = self.output_dir / f"{job_id}{suffix}"
        async with aiofiles.open(output_path, "wb") as file:
            await file.write(response.content)
        return output_path
