import asyncio
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import FileResponse

from app.db.models import JobStatus
from app.schemas.generation import GenerationAccepted, GenerationStatus
from app.services.storage_service import UploadValidationError

router = APIRouter(prefix="/v1/generations", tags=["generations"])


def api_error(status_code: int, code: str, message: str) -> HTTPException:
    return HTTPException(status_code=status_code, detail={"code": code, "message": message})


@router.post("/images", response_model=GenerationAccepted, status_code=status.HTTP_202_ACCEPTED)
async def create_image_generation(
    request: Request,
    image: Annotated[UploadFile, File()],
    prompt: Annotated[str, Form(min_length=1)],
    style: Annotated[str | None, Form()] = None,
    aspect_ratio: Annotated[str, Form()] = "1:1",
) -> GenerationAccepted:
    try:
        input_path = await request.app.state.storage.save_upload(image)
    except UploadValidationError as exc:
        code = "upload_too_large" if "exceeds" in str(exc) else "unsupported_file_type"
        error_status = status.HTTP_413_CONTENT_TOO_LARGE if "exceeds" in str(exc) else 415
        raise api_error(error_status, code, str(exc)) from exc
    job = await request.app.state.generation_service.create_job(
        input_path, prompt.strip(), style, aspect_ratio
    )
    await request.app.state.job_queue.enqueue(job.id)
    return GenerationAccepted(job_id=job.id, status=job.status)


@router.get("/{job_id}", response_model=GenerationStatus)
async def get_generation(request: Request, job_id: str) -> GenerationStatus:
    job = await request.app.state.generation_service.get_job(job_id)
    if job is None:
        raise api_error(404, "job_not_found", "Generation job was not found")
    output_url = (
        str(request.url_for("get_generation_result", job_id=job.id))
        if job.status == JobStatus.COMPLETED
        else None
    )
    return GenerationStatus(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        error=job.error,
        output_url=output_url,
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


@router.get("/{job_id}/result", name="get_generation_result", response_class=FileResponse)
async def get_generation_result(request: Request, job_id: str) -> FileResponse:
    job = await request.app.state.generation_service.get_job(job_id)
    if job is None:
        raise api_error(404, "job_not_found", "Generation job was not found")
    if job.status != JobStatus.COMPLETED or job.output_path is None:
        raise api_error(409, "job_not_completed", "Generation job is not completed")
    output_path = Path(job.output_path)
    if not await asyncio.to_thread(output_path.is_file):
        raise api_error(404, "result_not_found", "Generated image is unavailable")
    return FileResponse(output_path)


@router.get("/{job_id}/cutout", response_class=FileResponse)
async def get_generation_cutout(request: Request, job_id: str) -> FileResponse:
    job = await request.app.state.generation_service.get_job(job_id)
    if job is None or job.status != JobStatus.COMPLETED or not job.output_path:
        raise api_error(404, "cutout_not_found", "Chưa có ảnh đã tách nền.")
    path = Path(job.output_path).with_suffix(".cutout.png")
    if not await asyncio.to_thread(path.is_file):
        raise api_error(404, "cutout_not_found", "Ảnh này không có bản tách nền.")
    return FileResponse(path, media_type="image/png")
