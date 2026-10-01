"""Gemini Imagen 3 design provider for benchmark."""

import os
import httpx
from app.benchmark.providers.base import BaseDesignProvider, ProviderBlockedError
from app.benchmark.types import BenchmarkRequest, ProviderCapabilities


class GeminiImageProvider(BaseDesignProvider):
    provider_id = "gemini_image"
    model_id = "imagen-3.0-generate-002"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    def get_capabilities(self) -> ProviderCapabilities:
        has_key = bool(self.api_key)
        return ProviderCapabilities(
            provider_id=self.provider_id,
            model_id=self.model_id,
            supports_full_design=True,
            supports_reference_asset=True,
            supported_languages=["en", "vi", "mixed"],
            is_commercial_licensed=True,
            is_cloud_api=True,
            estimated_cost_per_image="Pay-as-you-go",
            availability_status="AVAILABLE" if has_key else "BLOCKED",
            blocking_reason=None if has_key else "Missing GEMINI_API_KEY / GOOGLE_API_KEY. Imagen 3 requires Google AI Studio or Vertex AI credentials.",
        )

    def build_prompt(self, req: BenchmarkRequest) -> str:
        texts_str = "\n".join([f"- {t}" for t in req.case.exact_text])
        prompt = (
            f"Professional advertising poster design, high quality editorial layout, {req.case.aspect} aspect ratio. "
            f"Campaign Brief: {req.case.brief}. "
            f"Typography must precisely include all the following text elements without hallucination:\n"
            f"{texts_str}\n"
            f"Balanced layout, sharp text rendering, intentional color palette and lighting."
        )
        return prompt

    def _execute_generation(self, req: BenchmarkRequest, prompt: str) -> tuple[bytes, dict]:
        if not self.api_key:
            raise ProviderBlockedError(
                "Missing GEMINI_API_KEY. Imagen 3 requires Google AI Studio / Vertex AI credentials."
            )

        # Google AI Studio Imagen 3 endpoint
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_id}:predict?key={self.api_key}"
        payload = {
            "instances": [{"prompt": prompt}],
            "parameters": {
                "sampleCount": 1,
                "aspectRatio": "4:5" if req.case.aspect == "4:5" else "1:1",
            },
        }

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, json=payload)
            if resp.status_code != 200:
                raise RuntimeError(f"Gemini Imagen API error: {resp.status_code} - {resp.text}")
            data = resp.json()
            import base64
            img_b64 = data["predictions"][0]["bytesBase64Encoded"]
            return base64.b64decode(img_b64), {"cost_usd": None}
