"""Benchmark providers registry."""

from app.benchmark.providers.base import BaseDesignProvider
from app.benchmark.providers.ideogram_provider import IdeogramProvider
from app.benchmark.providers.gemini_image_provider import GeminiImageProvider
from app.benchmark.providers.qwen_image_provider import QwenImageProvider
from app.benchmark.providers.fixture_provider import OfflineFixtureProvider

PROVIDER_REGISTRY: dict[str, type[BaseDesignProvider]] = {
    "ideogram": IdeogramProvider,
    "gemini_image": GeminiImageProvider,
    "qwen_image": QwenImageProvider,
    "offline_fixture": OfflineFixtureProvider,
}

def get_provider(provider_id: str, **kwargs) -> BaseDesignProvider:
    if provider_id not in PROVIDER_REGISTRY:
        raise ValueError(f"Unknown provider: '{provider_id}'. Available: {list(PROVIDER_REGISTRY.keys())}")
    return PROVIDER_REGISTRY[provider_id](**kwargs)
