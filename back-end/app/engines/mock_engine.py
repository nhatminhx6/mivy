import asyncio
import shutil
from pathlib import Path

from app.engines.base import GenerationEngine, GenerationInput, GenerationOutput


class MockGenerationEngine(GenerationEngine):
    def __init__(self, output_dir: Path, delay_seconds: float = 0.05) -> None:
        self.output_dir = output_dir
        self.delay_seconds = delay_seconds

    async def generate(self, generation_input: GenerationInput) -> GenerationOutput:
        await asyncio.sleep(self.delay_seconds)
        suffix = generation_input.input_image_path.suffix.lower()
        output_path = self.output_dir / f"{generation_input.job_id}{suffix}"
        await asyncio.to_thread(shutil.copy2, generation_input.input_image_path, output_path)
        return GenerationOutput(output_image_path=output_path)

