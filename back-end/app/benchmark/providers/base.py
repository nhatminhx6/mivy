"""Base interface for design benchmark providers."""

import hashlib
import time
from abc import ABC, abstractmethod
from pathlib import Path

from app.benchmark.types import BenchmarkRequest, BenchmarkResult, ProviderCapabilities


class ProviderBlockedError(Exception):
    """Raised when a provider cannot execute due to missing credentials, quota or hardware."""


class BaseDesignProvider(ABC):
    provider_id: str
    model_id: str

    @abstractmethod
    def get_capabilities(self) -> ProviderCapabilities:
        """Return provider capabilities and availability status."""

    @abstractmethod
    def build_prompt(self, req: BenchmarkRequest) -> str:
        """Format the specific prompt sent to the model for this brief and exact text."""

    @abstractmethod
    def _execute_generation(self, req: BenchmarkRequest, prompt: str) -> tuple[bytes, dict]:
        """Internal call to model. Returns image bytes and metadata dict."""

    def compute_hashes(self, req: BenchmarkRequest) -> dict[str, str]:
        brief_hash = hashlib.sha256(req.case.brief.encode("utf-8")).hexdigest()
        text_corpus = "\n".join(req.case.exact_text)
        text_hash = hashlib.sha256(text_corpus.encode("utf-8")).hexdigest()
        hashes = {
            "brief_sha256": brief_hash,
            "exact_text_sha256": text_hash,
        }
        if req.case.asset_path:
            asset_file = Path(req.case.asset_path)
            if not asset_file.is_absolute():
                # Relative to benchmark docs or repo root
                benchmark_dir = Path(__file__).resolve().parents[3] / "docs" / "design-benchmark"
                candidate = benchmark_dir / req.case.asset_path
                if candidate.exists():
                    asset_file = candidate
            if asset_file.exists():
                hashes["asset_sha256"] = hashlib.sha256(asset_file.read_bytes()).hexdigest()
                hashes["asset_resolved_path"] = str(asset_file)
            else:
                hashes["asset_error"] = f"File not found: {req.case.asset_path}"
        return hashes

    def generate_full_design(self, req: BenchmarkRequest) -> BenchmarkResult:
        caps = self.get_capabilities()
        prompt = self.build_prompt(req)
        hashes = self.compute_hashes(req)

        if caps.availability_status == "BLOCKED":
            return BenchmarkResult(
                case_id=req.case.id,
                provider_id=self.provider_id,
                model_id=self.model_id,
                status="BLOCKED",
                prompt=prompt,
                input_hashes=hashes,
                error_message=caps.blocking_reason,
            )

        start_time = time.perf_counter()
        try:
            image_bytes, meta = self._execute_generation(req, prompt)
            latency = time.perf_counter() - start_time

            # Save original image
            req.output_dir.mkdir(parents=True, exist_ok=True)
            out_filename = f"{req.case.id}_{self.provider_id}_run{req.run_index}.png"
            image_path = req.output_dir / out_filename
            image_path.write_bytes(image_bytes)

            from app.services.visual_service import parse_image_dimensions
            _, w, h = parse_image_dimensions(image_bytes)
            dims = (w, h)

            return BenchmarkResult(
                case_id=req.case.id,
                provider_id=self.provider_id,
                model_id=self.model_id,
                status="SUCCESS",
                prompt=prompt,
                input_hashes=hashes,
                image_path=str(image_path),
                image_dimensions=dims,
                latency_seconds=round(latency, 2),
                cost_usd=meta.get("cost_usd"),
            )
        except ProviderBlockedError as e:
            latency = time.perf_counter() - start_time
            return BenchmarkResult(
                case_id=req.case.id,
                provider_id=self.provider_id,
                model_id=self.model_id,
                status="BLOCKED",
                prompt=prompt,
                input_hashes=hashes,
                latency_seconds=round(latency, 2),
                error_message=str(e),
            )
        except Exception as e:
            latency = time.perf_counter() - start_time
            return BenchmarkResult(
                case_id=req.case.id,
                provider_id=self.provider_id,
                model_id=self.model_id,
                status="ERROR",
                prompt=prompt,
                input_hashes=hashes,
                latency_seconds=round(latency, 2),
                error_message=str(e),
            )
