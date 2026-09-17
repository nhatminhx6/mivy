import asyncio
import logging
from contextlib import suppress
from pathlib import Path

from app.db.models import JobStatus
from app.engines.base import GenerationEngine, GenerationEngineError, GenerationInput
from app.services.generation_service import GenerationService

logger = logging.getLogger(__name__)


class JobQueue:
    def __init__(self, service: GenerationService, engine: GenerationEngine) -> None:
        self.service = service
        self.engine = engine
        self.queue: asyncio.Queue[str] = asyncio.Queue()
        self.worker_task: asyncio.Task[None] | None = None

    def start(self) -> None:
        self.worker_task = asyncio.create_task(self._worker(), name="generation-worker")

    async def stop(self) -> None:
        if self.worker_task is None:
            return
        self.worker_task.cancel()
        with suppress(asyncio.CancelledError):
            await self.worker_task

    async def enqueue(self, job_id: str) -> None:
        await self.queue.put(job_id)

    async def _worker(self) -> None:
        while True:
            job_id = await self.queue.get()
            try:
                await self._process(job_id)
            except Exception:
                logger.exception("Unexpected worker error for job %s", job_id)
            finally:
                self.queue.task_done()

    async def _process(self, job_id: str) -> None:
        job = await self.service.get_job(job_id)
        if job is None:
            return
        await self.service.set_state(job_id, JobStatus.PROCESSING, 10)
        generation_input = GenerationInput(
            input_image_path=Path(job.input_path),
            prompt=job.prompt,
            style=job.style,
            aspect_ratio=job.aspect_ratio,
            job_id=job.id,
        )
        try:
            result = await self.engine.generate(generation_input)
            await self.service.set_state(
                job_id,
                JobStatus.COMPLETED,
                100,
                output_path=result.output_image_path,
                prompt_id=result.external_prompt_id,
            )
        except Exception as exc:
            logger.warning("Generation failed for job %s: %s", job_id, exc)
            error = str(exc) if isinstance(exc, GenerationEngineError) else "Generation failed"
            await self.service.set_state(job_id, JobStatus.FAILED, 0, error=error)
