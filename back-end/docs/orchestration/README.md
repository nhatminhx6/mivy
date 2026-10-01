# MIVY orchestration prototype

Entry point: `python3 scripts/orchestration/run.py --repo /absolute/clean/repo --task /absolute/task.json --output /absolute/new-run-dir` (from back-end).

Task JSON: `goal` string, `acceptance` string array, `files` repo-relative paths, `test_command` argv array. Only supply trusted test commands; they execute locally. Agent receives only explicitly selected text files, not the whole repository. Keep secrets out of selected files.

Flow: Codex PO → Gemini Dev → runner validates/applies patch in detached worktree → trusted tests → independent Codex QC. Maximum3 attempts, last uses Codex Dev / Gemini QC. Gemini invocation failure falls back to Codex Dev. Claude is not an allowed provider; Antigravity always uses explicit Gemini ID. No Claude authorization mechanism is implemented: remains blocked even if requested until a separately scoped extension is implemented.

Outputs: state.json, numbered prompt/response/log folders, tests-N.json, change.patch and retained worktree. AWAITING_USER_REVIEW is not merged or commercially approved. Original checkout unchanged. Use --snapshot for a private source repository including tracked modifications and untracked nonignored files. Environment files, key files, symlinks, generated reports/builds are excluded and listed in snapshot.json. Original index/refs untouched.

Offline validation: `.venv/bin/pytest tests/test_orchestration.py -q`.

Current limits:
- Prototype for small text-code tasks, not unattended general-purpose developer. Use --resume with the identical task/output to reuse completed model checkpoints and continue the interrupted attempt. No daemon, parallel task queue or quota-based scheduling yet.
- Roles ask agents not to use tools and use read-only/plan sandbox modes. This is not a hardened isolation guarantee for all installed plugins/hooks; do not run untrusted tasks.
- Gemini model explicitly set in runner; Codex default model comes from CLI with user config ignored. No statistical performance-based routing yet.
- Code QC examines selected source, diff and test results. visual_qc.py accepts --manifest, --cases, --output and attaches real output images to Codex; fixture-only reports are BLOCKED_NO_REAL_IMAGES. This visual adapter has not yet been validated on real benchmark outputs. Human final design approval remains required.
- No paid API key inherited from environment; Antigravity configuration checked for API provider/credit fallback. Credentials/quotas can still fail; never claim quota remaining from model discovery.
- Files and model reports may contain sensitive project content; run folders remain local. Do not use company projects without separate authorization.

## 25/09 integration check
- Eight offline tests pass, including dirty snapshot exclusion, interrupted QC resume without repeating PO/Dev, and fixture-only image rejection.
- Current Gemini benchmark manifest contains six fixture successes and eighteen blocked cloud calls, hence no real model image eligible for visual review.
- Real isolated MIVY task: fix aspect mismatch acceptance in evaluator.py; artifacts at /tmp/mivy-benchmark-audit-20260925. Original MIVY files are not auto-merged.
- Resume does not re-run completed model responses, but may repeat trusted tests. Keep test commands idempotent. This is a prototype: concurrent invocation against the same run directory is not supported.

Live MIVY task completed after fixing runner hunk-count handling and resuming: aspect validation patch, trusted tests exit0, independent Gemini QC passed. Artifacts: mivy-audit-result/. Runner repair required Codex intervention in this development run; do not represent this as mature hands-free reliability. Visual live evaluation remains blocked for lack of real generated images.
