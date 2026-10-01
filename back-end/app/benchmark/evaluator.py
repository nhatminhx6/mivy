"""Automated evaluation module for design benchmark."""

import re
import unicodedata
from pathlib import Path
from typing import Any
from app.services.visual_service import parse_image_dimensions


def normalize_text(text: str) -> str:
    """Normalize text using Unicode NFC and standardized spacing."""
    if not text:
        return ""
    norm = unicodedata.normalize("NFC", text)
    # Collapse multiple whitespaces
    norm = re.sub(r"\s+", " ", norm).strip().lower()
    return norm


def validate_image_file(image_path: Path | str, expected_aspect: str = "4:5") -> dict[str, Any]:
    """Verify that output image exists, can be decoded, matches aspect ratio, and is not blank."""
    p = Path(image_path)
    if not p.is_file():
        return {
            "valid": False,
            "error": f"Image file does not exist: {p}",
        }

    try:
        data = p.read_bytes()
        mime_type, w, h = parse_image_dimensions(data)

        if w < 256 or h < 256:
            return {
                "valid": False,
                "error": f"Image too small: {w}x{h} (minimum 256x256)",
                "width": w,
                "height": h,
            }

        # Check aspect ratio
        actual_ratio = w / h
        target_ratios = {
            "4:5": 4.0 / 5.0,  # 0.8
            "1:1": 1.0,
            "9:16": 9.0 / 16.0,  # 0.5625
            "16:9": 16.0 / 9.0,  # 1.7778
        }
        expected_ratio = target_ratios.get(expected_aspect, 0.8)
        aspect_diff = abs(actual_ratio - expected_ratio)
        aspect_ok = aspect_diff <= 0.05

        return {
            "valid": True,
            "width": w,
            "height": h,
            "format": mime_type,
            "actual_ratio": round(actual_ratio, 4),
            "expected_ratio": round(expected_ratio, 4),
            "aspect_ok": aspect_ok,
        }
    except Exception as e:
        return {
            "valid": False,
            "error": f"Failed to decode image: {str(e)}",
        }


def check_exact_text_items(corpus: str, exact_texts: list[str]) -> dict[str, Any]:
    """Check how many required exact_text items are present in text corpus."""
    norm_corpus = normalize_text(corpus)
    matched = []
    missing = []

    for text in exact_texts:
        norm_t = normalize_text(text)
        if norm_t in norm_corpus:
            matched.append(text)
        else:
            missing.append(text)

    total = len(exact_texts)
    pass_rate = round(len(matched) / total, 2) if total > 0 else 1.0
    return {
        "total_required": total,
        "matched_count": len(matched),
        "missing_count": len(missing),
        "pass_rate": pass_rate,
        "missing_items": missing,
        "all_passed": len(missing) == 0,
    }


def check_forbidden_facts(corpus: str, forbidden_types: list[str]) -> dict[str, Any]:
    """Detect accidental presence of forbidden business facts."""
    norm_corpus = normalize_text(corpus)
    detected_violations = []

    for fact_type in forbidden_types:
        f = fact_type.lower()
        if "salary" in f or "price" in f or "giá" in f or "lương" in f:
            if re.search(r"\b(\d+\s*(?:triệu|tr|vnd|vnđ|usd|\$))\b", norm_corpus):
                detected_violations.append(f"{fact_type} detected (pattern matched currency/salary)")
        elif "email" in f or "contact" in f:
            if re.search(r"[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}", norm_corpus):
                detected_violations.append(f"{fact_type} detected (email address found)")
        elif "location" in f or "địa điểm" in f:
            if re.search(r"\b(tp\.hcm|hà nội|đà nẵng|hồ chí minh|remote|hybrid)\b", norm_corpus):
                detected_violations.append(f"{fact_type} detected (location name found)")

    return {
        "violations": detected_violations,
        "clean": len(detected_violations) == 0,
    }
