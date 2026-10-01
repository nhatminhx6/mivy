"""Review real benchmark images using Codex image input; never approve fixtures."""

import argparse
import json
import subprocess
import tempfile
from pathlib import Path

from run import SCHEMA, command


def candidates(manifest):
    return [
        r
        for r in manifest.get("results", [])
        if r.get("status") == "SUCCESS"
        and r.get("image_path")
        and r.get("provider_id") != "offline_fixture"
    ]


def review(manifest_path, cases_path, out):
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads(manifest_path.read_text())
    cases = {c["id"]: c for c in json.loads(cases_path.read_text())["cases"]}
    rows = candidates(manifest)
    if not rows:
        result = {
            "status": "BLOCKED_NO_REAL_IMAGES",
            "reviews": [],
            "reason": "No successful non-fixture output. No visual quality claim possible.",
        }
    else:
        reviews = []
        for i, row in enumerate(rows):
            image = (manifest_path.parent / "images" / row["image_path"]).resolve()
            if not image.is_relative_to((manifest_path.parent / "images").resolve()):
                raise ValueError("Image path escapes report")
            if not image.is_file():
                raise ValueError("Missing image")
            case = cases[row["case_id"]]
            source = None
            if case.get("asset_required"):
                source = Path(case.get("asset_path") or "__missing_asset__")
                if not source.is_absolute():
                    source = cases_path.parent / source
                if not source.is_file():
                    reviews.append(
                        {
                            "case_id": row["case_id"],
                            "image": str(image),
                            "review": {
                                "passed": False,
                                "issues": ["Missing original product image"],
                                "summary": "Cannot verify product fidelity",
                            },
                        }
                    )
                    continue
            response = out / f"{i}.json"
            schema = out / "schema.json"
            schema.write_text(json.dumps(SCHEMA))
            prompt = (
                "Review the attached marketing design visually. No tools or delegation. "
                "Check exact text, Vietnamese accents/English, every required fact, concept, "
                "hero visual, graphic detail/artifacts, typography, balance, mobile legibility. "
                "List specific observed issues. Empty patch. passed=false if uncertain. "
                "Do not claim product fidelity without source image. "
                "Human final approval required. "
                + json.dumps(cases[row["case_id"]], ensure_ascii=False)
            )
            argv = command("codex", prompt, response.resolve(), schema.resolve())
            argv[-1:-1] = ["--image", str(image)]
            if source:
                argv[-1:-1] = ["--image", str(source.resolve())]
            with tempfile.TemporaryDirectory(prefix="mivy-visual-qc-") as cwd:
                proc = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=210)
            if proc.returncode:
                raise RuntimeError("Visual reviewer failed; no pass recorded")
            reviews.append(
                {
                    "case_id": row["case_id"],
                    "image": str(image),
                    "review": json.loads(response.read_text()),
                }
            )
        result = {
            "status": "AWAITING_USER_REVIEW"
            if all(r["review"].get("passed") is True for r in reviews)
            else "NEEDS_FIX",
            "reviews": reviews,
        }
    (out / "visual-qc.json").write_text(json.dumps(result, ensure_ascii=False, indent=2))
    return result


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--manifest", required=True, type=Path)
    p.add_argument("--cases", required=True, type=Path)
    p.add_argument("--output", required=True, type=Path)
    a = p.parse_args()
    print(json.dumps(review(a.manifest, a.cases, a.output), ensure_ascii=False))
