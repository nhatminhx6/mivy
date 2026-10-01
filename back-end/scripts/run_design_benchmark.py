#!/usr/bin/env python3
"""CLI script to run MIVY design benchmark."""

import argparse
import sys
from pathlib import Path

# Add back-end to sys.path
BASE_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BASE_DIR))

from app.benchmark.harness import BenchmarkHarness


def main():
    parser = argparse.ArgumentParser(description="MIVY Design Benchmark CLI Harness")
    parser.add_argument(
        "--cases-file",
        type=str,
        default=str(BASE_DIR / "docs" / "design-benchmark" / "cases.json"),
        help="Path to cases.json file",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=str(BASE_DIR / "docs" / "design-benchmark" / "reports"),
        help="Directory to save benchmark reports",
    )
    parser.add_argument(
        "--cases",
        type=str,
        default=None,
        help="Comma-separated list of case IDs (default: pilot_case_ids in cases.json)",
    )
    parser.add_argument(
        "--providers",
        type=str,
        default="ideogram,gemini_image",
        help="Comma-separated list of providers (e.g. ideogram,gemini_image,qwen_image,offline_fixture)",
    )
    parser.add_argument(
        "--runs",
        type=int,
        default=2,
        help="Number of runs per case (default: 2)",
    )
    parser.add_argument(
        "--run-id",
        type=str,
        default=None,
        help="Custom run ID",
    )

    args = parser.parse_args()

    cases_file = Path(args.cases_file)
    if not cases_file.exists():
        print(f"Error: Cases file not found: {cases_file}", file=sys.stderr)
        sys.exit(1)

    case_ids = [c.strip() for c in args.cases.split(",")] if args.cases else None
    provider_ids = [p.strip() for p in args.providers.split(",")] if args.providers else None

    harness = BenchmarkHarness(cases_file=cases_file, base_output_dir=args.output_dir)
    print(f"=== MIVY DESIGN BENCHMARK ===")
    print(f"Cases File: {cases_file}")
    print(f"Output Dir: {args.output_dir}")
    print(f"Providers:  {provider_ids}")
    print(f"Runs/Case:  {args.runs}")
    print(f"=============================")

    out_dir = harness.run_benchmark(
        case_ids=case_ids,
        provider_ids=provider_ids,
        runs_per_case=args.runs,
        run_id=args.run_id,
    )
    print(f"\nManifest and scorecard generated at: {out_dir}")


if __name__ == "__main__":
    main()
