"""Benchmark harness execution engine."""

import json
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.benchmark.evaluator import (
    check_forbidden_facts,
    validate_image_file,
)
from app.benchmark.providers import get_provider
from app.benchmark.types import BenchmarkCase, BenchmarkRequest, BenchmarkResult


class BenchmarkHarness:
    def __init__(self, cases_file: Path | str, base_output_dir: Path | str):
        self.cases_file = Path(cases_file)
        self.base_output_dir = Path(base_output_dir)
        self.cases_data: dict[str, Any] = {}
        self.cases: dict[str, BenchmarkCase] = {}
        self._load_cases()

    def _load_cases(self):
        with open(self.cases_file, "r", encoding="utf-8") as f:
            self.cases_data = json.load(f)
        for c in self.cases_data.get("cases", []):
            case_obj = BenchmarkCase.from_dict(c)
            self.cases[case_obj.id] = case_obj

    def get_pilot_case_ids(self) -> list[str]:
        return list(self.cases_data.get("pilot_case_ids", []))

    def run_benchmark(
        self,
        case_ids: list[str] | None = None,
        provider_ids: list[str] | None = None,
        runs_per_case: int = 2,
        run_id: str | None = None,
    ) -> Path:
        """Execute benchmark run and save reports."""
        if not case_ids:
            case_ids = self.get_pilot_case_ids()
        if not provider_ids:
            provider_ids = ["ideogram", "gemini_image"]

        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        if not run_id:
            run_id = f"run_{timestamp}"

        run_dir = self.base_output_dir / run_id
        images_dir = run_dir / "images"
        run_dir.mkdir(parents=True, exist_ok=True)
        images_dir.mkdir(parents=True, exist_ok=True)

        results: list[BenchmarkResult] = []
        providers_caps: dict[str, Any] = {}

        for p_id in provider_ids:
            provider = get_provider(p_id)
            caps = provider.get_capabilities()
            providers_caps[p_id] = {
                "provider_id": caps.provider_id,
                "model_id": caps.model_id,
                "status": caps.availability_status,
                "blocking_reason": caps.blocking_reason,
                "supports_full_design": caps.supports_full_design,
                "cost": caps.estimated_cost_per_image,
            }

        for cid in case_ids:
            if cid not in self.cases:
                print(f"[WARN] Case '{cid}' not found in {self.cases_file}")
                continue
            case = self.cases[cid]

            for p_id in provider_ids:
                provider = get_provider(p_id)

                for r_idx in range(1, runs_per_case + 1):
                    req = BenchmarkRequest(
                        case=case,
                        run_index=r_idx,
                        output_dir=images_dir,
                        seed=1000 + r_idx,
                    )
                    print(f"-> Running case='{cid}' provider='{p_id}' run={r_idx}...")
                    res = provider.generate_full_design(req)

                    # Automated evaluation if image exists
                    if res.status == "SUCCESS" and res.image_path:
                        img_eval = validate_image_file(res.image_path, case.aspect)
                        res.automated_eval["image"] = img_eval
                        res.automated_eval["forbidden_facts"] = check_forbidden_facts(res.prompt, case.forbidden_facts)

                    results.append(res)

        # Build manifest
        manifest = {
            "run_id": run_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "cases_file": str(self.cases_file),
            "cases_tested": case_ids,
            "providers": providers_caps,
            "total_runs": len(results),
            "summary": {
                "success_count": sum(1 for r in results if r.status == "SUCCESS"),
                "blocked_count": sum(1 for r in results if r.status == "BLOCKED"),
                "error_count": sum(1 for r in results if r.status == "ERROR"),
            },
            "results": [
                {
                    "case_id": r.case_id,
                    "provider_id": r.provider_id,
                    "model_id": r.model_id,
                    "status": r.status,
                    "prompt": r.prompt,
                    "input_hashes": r.input_hashes,
                    "image_path": str(Path(r.image_path).name) if r.image_path else None,
                    "image_dimensions": r.image_dimensions,
                    "latency_seconds": r.latency_seconds,
                    "cost_usd": r.cost_usd,
                    "error_message": r.error_message,
                    "automated_eval": r.automated_eval,
                }
                for r in results
            ],
        }

        manifest_file = run_dir / "manifest.json"
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        # Generate scorecard markdown
        scorecard_file = run_dir / "scorecard.md"
        self._write_scorecard(scorecard_file, run_id, results, providers_caps)

        print(f"\n[DONE] Benchmark run complete! Reports saved to: {run_dir}")
        return run_dir

    def _write_scorecard(
        self,
        scorecard_file: Path,
        run_id: str,
        results: list[BenchmarkResult],
        providers_caps: dict[str, Any],
    ):
        content = [
            f"# Phiếu Đánh Giá Thủ Công (Visual Scorecard) — {run_id}",
            f"\n**Thời gian:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
            "\n## Quy Chuẩn Chấm Điểm (Thang điểm 1–5 theo PLAN_FOR_GEMINI.md mục 6.B):",
            "1. **Concept & Visual chủ đạo:** Đúng thông điệp, không stock/abstract vô nghĩa.",
            "2. **Chất lượng hình ảnh & Chi tiết:** Ánh sáng, kết cấu, không méo vật thể/AI artifact.",
            "3. **Typography:** Đúng chính tả Việt/Anh, phân cấp rõ, đọc tốt trên mobile.",
            "4. **Bố cục & Khoảng thở:** Phối hợp ảnh-chữ cân đối, hài hòa.",
            "5. **Nhận diện & Hoàn thiện:** Đồng bộ phong cách, không phải template đổi màu.",
            "6. **Tuân thủ Brief & Sử dụng được:** Giữ nguyên sản phẩm/logo, sạch 100% fake facts.",
            "\n*Lưu ý: Tiêu chuẩn qua vòng là không lỗi loại trực tiếp và điểm mỗi tiêu chí >= 4/5 do reviewer chấm.*\n",
            "## Bảng Tổng Hợp Kết Quả & Chấm Điểm",
            "\n| Case ID | Provider / Model | Trạng thái | Đường dẫn ảnh | Tiêu chí 1-6 (1-5đ) | Tổng / 30 | Ghi chú Reviewer |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
        ]

        for r in results:
            img_name = Path(r.image_path).name if r.image_path else "N/A"
            status_display = r.status
            if r.status == "BLOCKED":
                status_display = "⛔ BLOCKED"
            elif r.status == "SUCCESS":
                status_display = "✓ SUCCESS"
            elif r.status == "ERROR":
                status_display = "❌ ERROR"

            content.append(
                f"| `{r.case_id}` | `{r.provider_id}` ({r.model_id}) | {status_display} | `{img_name}` | [ ]/[ ]/[ ]/[ ]/[ ]/[ ] | /30 | {r.error_message or ''} |"
            )

        content.append("\n## Người Chấm Điểm (Reviewer):")
        content.append("- Tên reviewer: ___________________________")
        content.append("- Ngày duyệt: ___________________________")
        content.append("- Quyết định của anh: [ ] DUYỆT ĐẠT    [ ] CẦN CẢI THIỆN    [ ] TỪ CHỐI\n")

        scorecard_file.write_text("\n".join(content), encoding="utf-8")
