"""Ideogram design provider for benchmark."""

import os
import httpx
from app.benchmark.providers.base import BaseDesignProvider, ProviderBlockedError
from app.benchmark.types import BenchmarkRequest, ProviderCapabilities


class IdeogramProvider(BaseDesignProvider):
    provider_id = "ideogram"
    model_id = "ideogram-v2"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("IDEOGRAM_API_KEY")

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
            estimated_cost_per_image="$0.08",
            availability_status="AVAILABLE" if has_key else "BLOCKED",
            blocking_reason=None if has_key else "Missing IDEOGRAM_API_KEY. Ideogram is a paid commercial cloud API requiring approved budget and credentials.",
        )

    def build_prompt(self, req: BenchmarkRequest) -> str:
        texts_quoted = ", ".join([f'"{t}"' for t in req.case.exact_text])
        prompt = (
            f"Commercial graphic design poster for marketing campaign. "
            f"Aspect ratio {req.case.aspect}. "
            f"Creative brief: {req.case.brief}. "
            f"Language: {req.case.language}. "
            f"Must render the following exact text clearly with professional typography and hierarchy: {texts_quoted}. "
            f"No spelling errors, clean layout, no unnecessary invented facts."
        )
        return prompt

    def _execute_generation(self, req: BenchmarkRequest, prompt: str) -> tuple[bytes, dict]:
        if not self.api_key:
            raise ProviderBlockedError(
                "Missing IDEOGRAM_API_KEY. Ideogram is a paid commercial API and cannot be called without credentials."
            )

        headers = {
            "Api-Key": self.api_key,
            "Content-Type": "application/json",
        }
        aspect_ratio_map = {
            "4:5": "ASPECT_4_5",
            "1:1": "ASPECT_1_1",
            "9:16": "ASPECT_9_16",
            "16:9": "ASPECT_16_9",
        }
        payload = {
            "image_request": {
                "prompt": prompt,
                "aspect_ratio": aspect_ratio_map.get(req.case.aspect, "ASPECT_4_5"),
                "model": "V_2",
                "magic_prompt_option": "AUTO",
                "style_type": "DESIGN",
            }
        }

        with httpx.Client(timeout=120.0) as client:
            resp = client.post("https://api.ideogram.ai/generate", json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"Ideogram API error: {resp.status_code} - {resp.text}")
            data = resp.json()
            image_url = data["data"][0]["url"]
            img_resp = client.get(image_url)
            return img_resp.content, {"cost_usd": 0.08, "seed": req.seed}
