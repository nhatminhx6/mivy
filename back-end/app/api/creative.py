import asyncio
from typing import Annotated

import httpx
from fastapi import APIRouter, File, Form, Request, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.api.generations import api_error
from app.schemas.creative import CreativeBrief, CreativeResponse
from app.schemas.generation import GenerationAccepted
from app.services.marketing_service import (
    MarketingBrief,
    fallback_marketing_copy,
    generate_marketing,
)
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
    # For text-to-image or product rendering, engine will try ComfyUI if configured or fallback to Visual AI (0đ Flux)
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
    ai_lock = getattr(request.app.state, "ai_lock", None)
    if ai_lock and ai_lock.locked():
        return fallback_marketing_copy(brief)
    settings = getattr(request.app.state, "settings", None)
    if ai_lock:
        try:
            async with asyncio.timeout(15.0):
                async with ai_lock:
                    return await generate_marketing(settings, brief)
        except Exception:
            return fallback_marketing_copy(brief)
    try:
        async with asyncio.timeout(15.0):
            return await generate_marketing(settings, brief)
    except Exception:
        return fallback_marketing_copy(brief)


class BackgroundRequest(BaseModel):
    industry: str = "recruitment"
    theme: str = "emerald_pro"
    prompt: str | None = None
    aspect_ratio: str = "4:5"
    seed: int | None = None


class BackgroundResponse(BaseModel):
    url: str
    aspect_ratio: str
    prompt: str


@router.post("/background", response_model=BackgroundResponse)
async def create_background(request: Request, body: BackgroundRequest) -> BackgroundResponse:
    visual_service = request.app.state.visual_service
    prompt = visual_service.get_prompt_for_industry(body.industry, body.theme, body.prompt)
    url, _ = await visual_service.generate_background(
        industry=body.industry,
        theme=body.theme,
        prompt=body.prompt,
        aspect_ratio=body.aspect_ratio,
        seed=body.seed,
    )
    return BackgroundResponse(url=url, aspect_ratio=body.aspect_ratio, prompt=prompt)


@router.get("/backgrounds/{filename}", response_class=FileResponse)
async def get_background_file(request: Request, filename: str) -> FileResponse:
    path = request.app.state.settings.output_dir / "backgrounds" / filename
    if not await asyncio.to_thread(path.is_file):
        raise api_error(404, "background_not_found", "Không tìm thấy ảnh nền.")
    media_type = "image/jpeg" if filename.endswith((".jpg", ".jpeg")) else "image/png"
    return FileResponse(path, media_type=media_type)
