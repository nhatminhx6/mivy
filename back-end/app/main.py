import asyncio
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.creative import router as creative_router
from app.api.generations import router as generations_router
from app.api.health import router as health_router
from app.core.config import Settings, get_settings
from app.core.logging import configure_logging
from app.db.database import Database
from app.engines.base import GenerationEngine
from app.engines.comfyui_engine import ComfyUIEngine
from app.engines.mock_engine import MockGenerationEngine
from app.engines.product_engine import ProductImageEngine
from app.services.generation_service import GenerationService
from app.services.job_queue import JobQueue
from app.services.storage_service import StorageService
from app.services.text_service import TextService
from app.services.visual_service import VisualService


def build_engine(
    settings: Settings, visual_service: VisualService | None = None
) -> GenerationEngine:
    if settings.generation_engine == "mock":
        return MockGenerationEngine(settings.output_dir)
    if settings.generation_engine == "comfyui":
        illustration_engine = ComfyUIEngine(
            settings.comfyui_base_url,
            settings.comfyui_workflow_path,
            settings.output_dir,
            settings.generation_timeout_seconds,
        )
        return ProductImageEngine(
            illustration_engine,
            settings.product_python,
            settings.output_dir,
            settings.product_model_home,
            settings.product_cache_dir,
            settings.product_model,
            settings.generation_timeout_seconds,
            visual_service=visual_service,
        )
    raise ValueError(f"Unsupported generation engine: {settings.generation_engine}")


def create_app(
    settings: Settings | None = None, generation_engine: GenerationEngine | None = None
) -> FastAPI:
    resolved_settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        configure_logging()
        resolved_settings.upload_dir.mkdir(parents=True, exist_ok=True)
        resolved_settings.output_dir.mkdir(parents=True, exist_ok=True)
        database = Database(resolved_settings.database_url)
        await database.create_tables()
        generation_service = GenerationService(database.sessions)
        visual_service = VisualService(resolved_settings)
        engine = generation_engine or build_engine(resolved_settings, visual_service=visual_service)
        app.state.ai_lock = asyncio.Lock()
        app.state.text_service = TextService(resolved_settings)
        job_queue = JobQueue(generation_service, engine, app.state.ai_lock)

        app.state.settings = resolved_settings
        app.state.database = database
        app.state.storage = StorageService(
            resolved_settings.upload_dir, resolved_settings.max_upload_size_mb
        )
        app.state.generation_service = generation_service
        app.state.job_queue = job_queue
        app.state.visual_service = visual_service

        job_queue.start()
        for job_id in await generation_service.recover_jobs():
            await job_queue.enqueue(job_id)
        try:
            yield
        finally:
            await job_queue.stop()
            await database.close()

    app = FastAPI(title=resolved_settings.app_name, lifespan=lifespan)
    app.state.settings = resolved_settings
    app.state.ai_lock = asyncio.Lock()
    app.state.text_service = TextService(resolved_settings)
    app.state.visual_service = VisualService(resolved_settings)
    app.state.storage = StorageService(
        resolved_settings.upload_dir, resolved_settings.max_upload_size_mb
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router)
    app.include_router(creative_router)
    app.include_router(generations_router)
    web_dir = Path(__file__).parent.parent / "web"
    app.mount("/ui", StaticFiles(directory=web_dir, html=True), name="ui")

    @app.get("/", include_in_schema=False)
    async def web_ui() -> RedirectResponse:
        return RedirectResponse(url="/ui/")

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if not isinstance(detail, dict):
            detail = {"code": "http_error", "message": str(detail)}
        return JSONResponse(status_code=exc.status_code, content={"error": detail})

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        _request: Request, _exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={"error": {"code": "validation_error", "message": "Invalid request"}},
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content={"error": {"code": "internal_error", "message": "Internal server error"}},
        )

    return app


app = create_app()
