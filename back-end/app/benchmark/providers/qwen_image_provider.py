"""Qwen Tongyi Wanxiang design provider for benchmark."""

import os
import httpx
from app.benchmark.providers.base import BaseDesignProvider, ProviderBlockedError
from app.benchmark.types import BenchmarkRequest, ProviderCapabilities


class QwenImageProvider(BaseDesignProvider):
    provider_id = "qwen_image"
    model_id = "wanx-v2.1"

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("DASHSCOPE_API_KEY")

    def get_capabilities(self) -> ProviderCapabilities:
        has_key = bool(self.api_key)
        return ProviderCapabilities(
            provider_id=self.provider_id,
            model_id=self.model_id,
            supports_full_design=True,
            supports_reference_asset=True,
            supported_languages=["en", "zh", "vi"],
            is_commercial_licensed=True,
            is_cloud_api=True,
            estimated_cost_per_image="Alibaba DashScope Pricing",
            availability_status="AVAILABLE" if has_key else "BLOCKED",
            blocking_reason=None if has_key else "Missing DASHSCOPE_API_KEY. Wanx-v2.1 requires Alibaba Cloud DashScope credentials. Local execution is not feasible on 16GB RAM Apple M5.",
        )

    def build_prompt(self, req: BenchmarkRequest) -> str:
        texts_str = "; ".join(req.case.exact_text)
        prompt = (
            f"Commercial poster design, high resolution marketing key visual. "
            f"Brief: {req.case.brief}. "
            f"Exact text required on image: {texts_str}."
        )
        return prompt

    def _execute_generation(self, req: BenchmarkRequest, prompt: str) -> tuple[bytes, dict]:
        if not self.api_key:
            raise ProviderBlockedError(
                "Missing DASHSCOPE_API_KEY. Wanx-v2.1 requires Alibaba Cloud DashScope credentials."
            )

        url = "https://dashscope.aliyuncs.com/api/v1/services/aigc/text2image/image-synthesis"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "X-DashScope-Async": "enable",
        }
        payload = {
            "model": "wanx-v2.1",
            "input": {"prompt": prompt},
            "parameters": {
                "size": "1024*1280" if req.case.aspect == "4:5" else "1024*1024",
                "n": 1,
            },
        }

        with httpx.Client(timeout=120.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"DashScope API error: {resp.status_code} - {resp.text}")
            data = resp.json()
            # Dashscope task polling would go here when live API key is present
            return b"", {"task_id": data.get("output", {}).get("task_id")}
