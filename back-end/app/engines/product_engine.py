import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any

from app.engines.base import (
    GenerationEngine,
    GenerationEngineError,
    GenerationInput,
    GenerationOutput,
)

logger = logging.getLogger(__name__)


class ProductImageEngine(GenerationEngine):
    """Uploaded products use cutout + fit; only illustrations use diffusion."""

    def __init__(
        self,
        fallback: GenerationEngine,
        python: Path,
        output_dir: Path,
        model_home: Path,
        cache_dir: Path,
        model: str,
        timeout: int,
        visual_service: Any = None,
    ):
        self.fallback = fallback
        self.visual_service = visual_service
        # Preserve the venv executable symlink: resolving it loses site-packages.
        self.python = python.absolute()
        self.output_dir = output_dir.resolve()
        self.model_home = model_home.resolve()
        self.cache_dir = cache_dir.resolve()
        self.model = model
        self.timeout = timeout
        self.project_dir = Path(__file__).resolve().parents[2]

    async def generate(self, generation_input: GenerationInput) -> GenerationOutput:
        if generation_input.input_image_path is None:
            try:
                return await self.fallback.generate(generation_input)
            except Exception as exc:
                if self.visual_service is not None:
                    logger.info("Illustration generation fallback to Visual AI: %s", exc)
                    _, output_path = await self.visual_service.generate_image(
                        prompt=generation_input.prompt,
                        aspect_ratio=generation_input.aspect_ratio,
                        style=generation_input.style,
                        job_id=generation_input.job_id,
                    )
                    return GenerationOutput(output_image_path=output_path)
                raise
        python_bin = self.python
        if not python_bin.is_file():
            import sys
            cur_py = Path(sys.executable)
            venv_py = self.project_dir / ".venv" / "bin" / "python"
            if cur_py.is_file():
                python_bin = cur_py
            elif venv_py.is_file():
                python_bin = venv_py
            else:
                raise GenerationEngineError("Thiếu môi trường xử lý ảnh. Anh chạy setup trước nhé.")
        style = generation_input.style or "product:studio_white"
        background = (
            style.removeprefix("product:") if style.startswith("product:") else "studio_white"
        )
        if background not in {"studio_white", "gradient"}:
            raise GenerationEngineError("Nền này chưa được hỗ trợ. Anh chọn trắng hoặc gradient.")
        output = self.output_dir / f"{generation_input.job_id}.png"
        model_home = self.model_home
        if not model_home.exists():
            model_home = self.project_dir / "data" / "models" / "rembg"
            model_home.mkdir(parents=True, exist_ok=True)
        env = {**os.environ, "U2NET_HOME": str(model_home), "OMP_NUM_THREADS": "2"}
        process = await asyncio.create_subprocess_exec(
            str(python_bin),
            "-m",
            "app.services.product_renderer",
            "--input",
            str(generation_input.input_image_path.resolve()),
            "--output",
            str(output),
            "--cache",
            str(self.cache_dir),
            "--model",
            self.model,
            "--aspect",
            generation_input.aspect_ratio,
            "--background",
            background,
            env=env,
            cwd=self.project_dir,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, _stderr = await asyncio.wait_for(process.communicate(), self.timeout)
        except (TimeoutError, asyncio.CancelledError) as exc:
            if process.returncode is None:
                process.kill()
            await process.communicate()
            if isinstance(exc, asyncio.CancelledError):
                raise
            raise GenerationEngineError("Tách nền quá thời gian chờ. Anh thử lại nhé.") from exc
        if process.returncode != 0:
            try:
                message = json.loads(stdout.decode().splitlines()[-1])["error"]
            except (ValueError, IndexError, KeyError):
                message = "Không xử lý được ảnh. Anh thử ảnh khác nhé."
            raise GenerationEngineError(message)
        if not output.is_file():
            raise GenerationEngineError("Chưa xuất được ảnh.")
        return GenerationOutput(output)
