from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path


class GenerationEngineError(RuntimeError):
    """A safe, user-facing generation error."""


@dataclass(frozen=True)
class GenerationInput:
    input_image_path: Path
    prompt: str
    style: str | None
    aspect_ratio: str
    job_id: str


@dataclass(frozen=True)
class GenerationOutput:
    output_image_path: Path
    external_prompt_id: str | None = None


class GenerationEngine(ABC):
    @abstractmethod
    async def generate(self, generation_input: GenerationInput) -> GenerationOutput:
        """Generate an image and return its local output path."""
