from pathlib import Path
from uuid import uuid4

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.db.models import GenerationJob, JobStatus, utc_now


class GenerationService:
    def __init__(self, sessions: async_sessionmaker) -> None:  # type: ignore[type-arg]
        self.sessions = sessions

    async def create_job(
        self, input_path: Path, prompt: str, style: str | None, aspect_ratio: str
    ) -> GenerationJob:
        job = GenerationJob(
            id=str(uuid4()),
            status=JobStatus.QUEUED,
            prompt=prompt,
            style=style,
            aspect_ratio=aspect_ratio,
            input_path=str(input_path),
            progress=0,
        )
        async with self.sessions() as session:
            session.add(job)
            await session.commit()
        return job

    async def get_job(self, job_id: str) -> GenerationJob | None:
        async with self.sessions() as session:
            return await session.get(GenerationJob, job_id)

    async def set_state(
        self,
        job_id: str,
        status: JobStatus,
        progress: int,
        *,
        output_path: Path | None = None,
        error: str | None = None,
        prompt_id: str | None = None,
    ) -> None:
        values: dict[str, object] = {
            "status": status,
            "progress": progress,
            "updated_at": utc_now(),
            "error": error,
        }
        if output_path is not None:
            values["output_path"] = str(output_path)
        if prompt_id is not None:
            values["comfyui_prompt_id"] = prompt_id
        async with self.sessions() as session:
            statement = update(GenerationJob).where(GenerationJob.id == job_id).values(**values)
            await session.execute(statement)
            await session.commit()

    async def recover_jobs(self) -> list[str]:
        async with self.sessions() as session:
            await session.execute(
                update(GenerationJob)
                .where(GenerationJob.status == JobStatus.PROCESSING)
                .values(
                    status=JobStatus.FAILED,
                    error="Generation interrupted by application restart",
                    updated_at=utc_now(),
                )
            )
            queued = await session.scalars(
                select(GenerationJob.id).where(GenerationJob.status == JobStatus.QUEUED)
            )
            await session.commit()
            return list(queued)
