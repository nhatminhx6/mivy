"""Automated tests for MIVY Design Benchmark harness, cases, and evaluator."""

import hashlib
import json
from pathlib import Path
import pytest
from app.services.visual_service import parse_image_dimensions

from app.benchmark.evaluator import (
    check_exact_text_items,
    check_forbidden_facts,
    normalize_text,
    validate_image_file,
)
from app.benchmark.harness import BenchmarkHarness
from app.benchmark.providers import (
    GeminiImageProvider,
    IdeogramProvider,
    OfflineFixtureProvider,
    QwenImageProvider,
)
from app.benchmark.types import BenchmarkCase, BenchmarkRequest


BASE_DIR = Path(__file__).resolve().parents[1]
CASES_FILE = BASE_DIR / "docs" / "design-benchmark" / "cases.json"
FIXTURE_SHOE = BASE_DIR / "docs" / "design-benchmark" / "fixtures" / "product_shoe.jpg"
EXPECTED_SHOE_HASH = "862f2fc97e06be2e98d9175961069070caa00daff1863576223bd0c6084c4c92"


def test_cases_json_schema_and_validity():
    """Verify cases.json exists, contains all required pilot cases and valid structure."""
    assert CASES_FILE.is_file(), f"cases.json missing at {CASES_FILE}"
    with open(CASES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "pilot_case_ids" in data
    assert data["pilot_case_ids"] == ["recruitment-mixed", "product-vi", "course-en"]

    cases_map = {c["id"]: c for c in data["cases"]}
    for cid in ["recruitment-mixed", "product-vi", "course-en", "recruitment-en", "course-vi"]:
        assert cid in cases_map, f"Missing case: {cid}"
        c = cases_map[cid]
        assert len(c["exact_text"]) >= 3, f"Case {cid} has insufficient exact_text"
        assert len(c["forbidden_facts"]) >= 1, f"Case {cid} has no forbidden_facts specified"
        assert c["aspect"] in ["4:5", "1:1", "9:16", "16:9"]

    # Verify recruitment-mixed has all 8 core JD points + brand + header + cta
    mixed_exact = cases_map["recruitment-mixed"]["exact_text"]
    assert any("5 years" in t for t in mixed_exact)
    assert any("distributed systems" in t for t in mixed_exact)
    assert any("unfamiliar codebase" in t for t in mixed_exact)
    assert any("pay down debt" in t for t in mixed_exact)
    assert any("mentor engineers" in t for t in mixed_exact)
    assert any("stakeholders" in t for t in mixed_exact)
    assert any("ĐANG TUYỂN" in t for t in mixed_exact)


def test_product_asset_shoe_fixture_and_hash():
    """Verify that product-vi references the exact original shoe asset and hash matches."""
    assert FIXTURE_SHOE.is_file(), f"Shoe asset fixture missing at {FIXTURE_SHOE}"
    file_bytes = FIXTURE_SHOE.read_bytes()
    computed_hash = hashlib.sha256(file_bytes).hexdigest()
    assert computed_hash == EXPECTED_SHOE_HASH, f"Hash mismatch: got {computed_hash}"

    mime_type, w, h = parse_image_dimensions(file_bytes)
    assert (w, h) == (600, 600)
    assert mime_type == "image/jpeg"


def test_candidate_providers_blocked_without_credentials(monkeypatch):
    """Verify that unconfigured commercial providers report BLOCKED and never return fake success."""
    monkeypatch.delenv("IDEOGRAM_API_KEY", raising=False)
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    monkeypatch.delenv("GOOGLE_API_KEY", raising=False)
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)

    ideogram = IdeogramProvider()
    assert ideogram.get_capabilities().availability_status == "BLOCKED"
    assert "IDEOGRAM_API_KEY" in ideogram.get_capabilities().blocking_reason

    gemini = GeminiImageProvider()
    assert gemini.get_capabilities().availability_status == "BLOCKED"
    assert "GEMINI_API_KEY" in gemini.get_capabilities().blocking_reason

    qwen = QwenImageProvider()
    assert qwen.get_capabilities().availability_status == "BLOCKED"
    assert "DASHSCOPE_API_KEY" in qwen.get_capabilities().blocking_reason

    # Test generation returns BLOCKED
    dummy_case = BenchmarkCase(
        id="test-case",
        language="en",
        aspect="4:5",
        brief="Test brief",
        exact_text=["Item 1"],
        forbidden_facts=["salary"],
    )
    req = BenchmarkRequest(case=dummy_case, run_index=1, output_dir=BASE_DIR / "data" / "test_out")
    res = ideogram.generate_full_design(req)
    assert res.status == "BLOCKED"
    assert res.image_path is None
    assert "Missing IDEOGRAM_API_KEY" in res.error_message


def test_evaluator_text_normalization_and_matching():
    """Test Unicode NFC normalization and exact text checking."""
    corpus = "MIVY ĐANG TUYỂN Lead / Senior Fullstack Developer (ReactJS, NodeJS) Ứng tuyển ngay"
    exact = ["MIVY", "ĐANG TUYỂN", "Ứng tuyển"]
    res = check_exact_text_items(corpus, exact)
    assert res["all_passed"] is True
    assert res["matched_count"] == 3

    # Missing item
    exact_with_missing = ["MIVY", "Unobtainable Item 404"]
    res_missing = check_exact_text_items(corpus, exact_with_missing)
    assert res_missing["all_passed"] is False
    assert "Unobtainable Item 404" in res_missing["missing_items"]


def test_evaluator_forbidden_facts_detection():
    """Test detection of forbidden business facts."""
    corpus_clean = "We are hiring engineers to build distributed systems. Apply today."
    res_clean = check_forbidden_facts(corpus_clean, ["salary", "location", "email"])
    assert res_clean["clean"] is True

    corpus_dirty = "Lương 45 triệu VNĐ, làm việc tại TP.HCM, gửi CV về hr@mivy.vn"
    res_dirty = check_forbidden_facts(corpus_dirty, ["salary", "location", "email"])
    assert res_dirty["clean"] is False
    assert len(res_dirty["violations"]) == 3


def test_benchmark_harness_offline_run(tmp_path):
    """Test end-to-end benchmark harness run using offline fixture provider."""
    harness = BenchmarkHarness(cases_file=CASES_FILE, base_output_dir=tmp_path)
    run_dir = harness.run_benchmark(
        case_ids=["recruitment-mixed", "product-vi"],
        provider_ids=["offline_fixture"],
        runs_per_case=1,
        run_id="test_run_1",
    )

    manifest_file = run_dir / "manifest.json"
    scorecard_file = run_dir / "scorecard.md"
    assert manifest_file.is_file()
    assert scorecard_file.is_file()

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["run_id"] == "test_run_1"
    assert manifest["total_runs"] == 2
    assert manifest["summary"]["success_count"] == 2
    assert manifest["summary"]["blocked_count"] == 0

    # Check that image was validated
    for r in manifest["results"]:
        assert r["status"] == "SUCCESS"
        assert r["image_path"] is not None
        assert r["automated_eval"]["image"]["valid"] is True
        assert r["automated_eval"]["image"]["aspect_ok"] is True
