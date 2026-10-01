try:
    from PIL import Image, ImageDraw
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

from app.benchmark.providers.base import BaseDesignProvider
from app.benchmark.types import BenchmarkRequest, ProviderCapabilities
from app.services.visual_service import create_valid_png


class OfflineFixtureProvider(BaseDesignProvider):
    provider_id = "offline_fixture"
    model_id = "offline-fixture-test"

    def get_capabilities(self) -> ProviderCapabilities:
        return ProviderCapabilities(
            provider_id=self.provider_id,
            model_id=self.model_id,
            supports_full_design=True,
            supports_reference_asset=True,
            supported_languages=["en", "vi", "mixed"],
            is_commercial_licensed=False,
            is_cloud_api=False,
            estimated_cost_per_image="0.00",
            availability_status="AVAILABLE",
            blocking_reason=None,
        )

    def build_prompt(self, req: BenchmarkRequest) -> str:
        return f"[OFFLINE TEST] {req.case.id}: {req.case.brief}"

    def _execute_generation(self, req: BenchmarkRequest, prompt: str) -> tuple[bytes, dict]:
        # Aspect 4:5 -> 1024x1280
        width = 1024
        height = 1280 if req.case.aspect == "4:5" else 1024

        if HAS_PIL:
            import io
            img = Image.new("RGB", (width, height), (15, 23, 42))
            draw = ImageDraw.Draw(img)

            draw.text((40, 40), f"TEST FIXTURE: {req.case.id}", fill=(16, 185, 129))
            draw.text((40, 80), f"Aspect: {req.case.aspect} ({width}x{height})", fill=(148, 163, 184))

            y = 140
            for text in req.case.exact_text:
                if y > height - 60:
                    break
                draw.text((40, y), text, fill=(248, 250, 252))
                y += 40

            buf = io.BytesIO()
            img.save(buf, format="PNG")
            return buf.getvalue(), {"cost_usd": 0.0, "is_offline_fixture": True}
        else:
            return create_valid_png(width, height, color=(15, 23, 42)), {"cost_usd": 0.0, "is_offline_fixture": True}

