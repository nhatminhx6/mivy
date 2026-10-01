"""Data types and schemas for MIVY Design Benchmark."""

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class BenchmarkCase:
    id: str
    language: str
    aspect: str
    brief: str
    exact_text: list[str]
    forbidden_facts: list[str]
    asset_required: bool = False
    asset_path: str | None = None

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "BenchmarkCase":
        return cls(
            id=data["id"],
            language=data["language"],
            aspect=data.get("aspect", "4:5"),
            brief=data["brief"],
            exact_text=list(data.get("exact_text", [])),
            forbidden_facts=list(data.get("forbidden_facts", [])),
            asset_required=bool(data.get("asset_required", False)),
            asset_path=data.get("asset_path"),
        )


@dataclass
class ProviderCapabilities:
    provider_id: str
    model_id: str
    supports_full_design: bool
    supports_reference_asset: bool
    supported_languages: list[str]
    is_commercial_licensed: bool
    is_cloud_api: bool
    estimated_cost_per_image: str
    availability_status: str  # "AVAILABLE", "BLOCKED", "INELIGIBLE"
    blocking_reason: str | None = None


@dataclass
class BenchmarkRequest:
    case: BenchmarkCase
    run_index: int
    output_dir: Path
    seed: int | None = None


@dataclass
class BenchmarkResult:
    case_id: str
    provider_id: str
    model_id: str
    status: str  # "SUCCESS", "BLOCKED", "ERROR", "TIMEOUT"
    prompt: str
    input_hashes: dict[str, str]
    image_path: str | None = None
    image_dimensions: tuple[int, int] | None = None
    latency_seconds: float = 0.0
    cost_usd: float | None = None
    error_message: str | None = None
    automated_eval: dict[str, Any] = field(default_factory=dict)
