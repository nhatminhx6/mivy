import asyncio
from typing import Annotated

import httpx
from fastapi import APIRouter, File, Form, Request, UploadFile

from app.api.generations import api_error
from app.schemas.creative import CreativeBrief, CreativeResponse
from app.schemas.generation import GenerationAccepted
from app.services.marketing_service import MarketingBrief, generate_marketing
from app.services.storage_service import UploadValidationError
from app.services.text_service import TextGenerationError

router = APIRouter(prefix="/v1/creative", tags=["creative"])

# Deterministic product backgrounds; creative scenes remain unavailable until validated.
BACKGROUND_PRESETS = {"studio_white": "White background", "gradient": "Pastel gradient"}
ASPECT_RATIOS = {"1:1", "4:5", "9:16"}


def build_image_prompt(prompt: str | None, background: str | None) -> str | None:
    if background in BACKGROUND_PRESETS:
        return BACKGROUND_PRESETS[background]
    return prompt.strip() if prompt and prompt.strip() else None


@router.post("/text", response_model=CreativeResponse)
async def create_text(request: Request, brief: CreativeBrief) -> CreativeResponse:
    # Text and images share the Mac's memory. Do not run both models simultaneously.
    if request.app.state.ai_lock.locked():
        raise api_error(409, "ai_busy", "AI đang xử lý yêu cầu khác. Anh thử lại sau nhé.")
    async with request.app.state.ai_lock:
        try:
            async with asyncio.timeout(request.app.state.settings.text_timeout_seconds):
                outputs = await request.app.state.text_service.generate(brief)
        except TimeoutError as exc:
            raise api_error(504, "text_timeout", "AI xử lý quá lâu. Anh thử lại nhé.") from exc
        except TextGenerationError as exc:
            raise api_error(503, "text_generation_failed", str(exc)) from exc
    return CreativeResponse(outputs=outputs, model=request.app.state.settings.text_model)


@router.post("/images", response_model=GenerationAccepted, status_code=202)
async def create_creative_image(
    request: Request,
    prompt: Annotated[str | None, Form(max_length=2000)] = None,
    background: Annotated[str | None, Form(max_length=50)] = None,
    aspect_ratio: Annotated[str, Form()] = "1:1",
    image: Annotated[UploadFile | None, File()] = None,
) -> GenerationAccepted:
    if background and image is None:
        raise api_error(422, "image_required", "Anh thêm ảnh sản phẩm trước nhé.")
    if aspect_ratio not in ASPECT_RATIOS:
        raise api_error(422, "invalid_aspect", "Tỷ lệ ảnh chưa hợp lệ.")
    if background and background not in BACKGROUND_PRESETS:
        raise api_error(422, "unsupported_background", "Anh chọn nền trắng hoặc gradient nhé.")
    if image is not None:
        background = background or "studio_white"
    final_prompt = build_image_prompt(prompt, background)
    if final_prompt is None or len(final_prompt) < 10:
        raise api_error(422, "invalid_prompt", "Anh chọn kiểu nền hoặc nhập mô tả nhé.")
    settings = request.app.state.settings
    if settings.generation_engine != "comfyui":
        raise api_error(503, "image_not_configured", "Tạo ảnh thật chưa được cấu hình.")
    if image is None:
        try:
            async with httpx.AsyncClient(timeout=3) as client:
                response = await client.get(f"{settings.comfyui_base_url}/system_stats")
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise api_error(
                503, "image_unavailable", "ComfyUI chưa chạy. Anh chạy scripts/run-local.sh."
            ) from exc
    input_path = None
    if image is not None:
        try:
            input_path = await request.app.state.storage.save_upload(image)
        except UploadValidationError as exc:
            raise api_error(
                413 if "exceeds" in str(exc) else 415, "invalid_image", str(exc)
            ) from exc
    job = await request.app.state.generation_service.create_job(
        input_path, final_prompt, f"product:{background}" if input_path else None, aspect_ratio
    )
    await request.app.state.job_queue.enqueue(job.id)
    return GenerationAccepted(job_id=job.id, status=job.status)


@router.post("/marketing")
async def create_marketing(request: Request, brief: MarketingBrief):
    if request.app.state.ai_lock.locked():
        raise api_error(409, "ai_busy", "AI đang xử lý. Anh thử lại sau nhé.")
    async with request.app.state.ai_lock:
        try:
            return await generate_marketing(request.app.state.settings, brief)
        except TextGenerationError as exc:
            raise api_error(503, "marketing_failed", str(exc)) from exc
