"""Small sequential PO/Dev/QC runner. Agents return patches; runner applies them in a worktree."""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import time
from pathlib import Path

AGY = Path.home() / ".local/share/mivy-tools/bin/agy"
GEMINI = "gemini-3.1-pro-high"


def command(provider, prompt, output, schema):
    # Fail closed: neither a Claude binary nor a Claude model is routable.
    if provider == "gemini":
        settings = Path.home() / ".gemini/antigravity-cli/settings.json"
        cfg = json.loads(settings.read_text()) if settings.exists() else {}
        if cfg.get("modelProvider") or cfg.get("useG1Credits", False):
            raise RuntimeError(
                "Antigravity API billing/credits configuration must be disabled first"
            )
        return [
            str(AGY),
            "--model",
            GEMINI,
            "--mode",
            "plan",
            "--sandbox",
            "--print-timeout",
            "180s",
            "--output-format",
            "json",
            "--json-schema",
            str(schema),
            "-p",
            prompt,
        ]
    if provider == "codex":
        return [
            shutil.which("codex") or "codex",
            "exec",
            "--ignore-user-config",
            "--ephemeral",
            "--sandbox",
            "read-only",
            "--skip-git-repo-check",
            "--output-schema",
            str(schema),
            "-o",
            str(output),
            prompt,
        ]
    raise ValueError(
        "Provider blocked: only codex and gemini are allowed; "
        "Claude requires separate authorization"
    )


SCHEMA = {
    "type": "object",
    "properties": {
        "summary": {"type": "string"},
        "patch": {"type": "string"},
        "passed": {"type": "boolean"},
        "issues": {"type": "array", "items": {"type": "string"}},
    },
    "required": ["summary", "patch", "passed", "issues"],
    "additionalProperties": False,
}


def git(cwd, *args):
    return subprocess.check_output(["git", "-C", str(cwd), *args], text=True)


def apply_patch(work, patch):
    if not patch.strip():
        raise ValueError("Dev returned empty patch")
    patch = patch.rstrip("\n") + "\n"
    # git apply rejects paths outside worktree; no shell interpolation.
    for args in (["--check"], []):
        subprocess.run(
            ["git", "apply", "--recount", *args, "-"],
            cwd=work,
            input=patch,
            text=True,
            check=True,
            capture_output=True,
        )


def call(provider, role, prompt, run, number):
    slot = run / f"{number:02d}-{role}-{provider}"
    slot.mkdir()
    schema = slot / "schema.json"
    schema.write_text(json.dumps(SCHEMA))
    output = slot / "response.json"
    full = (
        "You are an agent in a bounded workflow. Do not call tools, delegate, access files, "
        "or run commands. Work ONLY with the supplied context. Return JSON matching schema. "
        "Never invoke Claude. User is anh, assistant em in Vietnamese. "
        f"Role: {role}.\n" + prompt
    )
    (slot / "prompt.txt").write_text(full)
    argv = command(provider, full, output, schema)
    # No project context or inherited API keys supplied to agents.
    env = {
        k: v
        for k, v in os.environ.items()
        if not any(s in k.upper() for s in ["API_KEY", "TOKEN", "SECRET"])
    }
    with tempfile.TemporaryDirectory(prefix="mivy-agent-") as cwd:
        result = subprocess.run(argv, cwd=cwd, env=env, text=True, capture_output=True, timeout=210)
    (slot / "stdout.txt").write_text(result.stdout)
    (slot / "stderr.txt").write_text(result.stderr)
    if result.returncode:
        raise RuntimeError(f"{provider} failed (exit {result.returncode}); see {slot}")
    if provider == "gemini":
        envelope = json.loads(result.stdout)
        if envelope.get("status") != "SUCCESS" or envelope.get("denied_actions"):
            raise RuntimeError(f"Antigravity did not complete: {slot}")
        data = envelope.get("structured_output") or json.loads(envelope["response"])
    else:
        data = json.loads(output.read_text())
    if (
        not isinstance(data.get("passed"), bool)
        or not isinstance(data.get("patch"), str)
        or not isinstance(data.get("summary"), str)
        or not isinstance(data.get("issues"), list)
    ):
        raise ValueError("Invalid agent response")
    output.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    return data


def run_task(repo, task, destination, invoke=call, resume=False):
    run = destination.resolve()
    run.mkdir(parents=True, exist_ok=resume)
    state = {"status": "STARTING", "events": [], "claude": "disabled", "started": time.time()}

    if resume:
        state = json.loads((run / "state.json").read_text())
        if json.loads((run / "task.json").read_text()) != task:
            raise ValueError("Cannot resume a different task")
        if state["status"] == "AWAITING_USER_REVIEW":
            return state
    else:
        (run / "task.json").write_text(json.dumps(task))

    def save(status, **extra):
        if status != "BLOCKED" and status != "NEEDS_ATTENTION":
            state.pop("reason", None)
        state.update(status=status, **extra)
        tmp = run / "state.tmp"
        tmp.write_text(json.dumps(state, indent=2, ensure_ascii=False))
        tmp.replace(run / "state.json")

    work = run / "worktree"
    n = 0

    def agent(provider, role, context):
        nonlocal n
        n += 1
        state["events"].append({"role": role, "provider": provider})
        save(role, active_provider=provider)
        cache = run / f"checkpoint-{n:02d}.json"
        digest = hashlib.sha256((provider + role + context).encode()).hexdigest()
        if cache.exists():
            saved = json.loads(cache.read_text())
            if saved["hash"] != digest:
                raise ValueError("Checkpoint context mismatch")
            return saved["data"]
        # interrupted invocation gets a unique folder, preserving old logs
        while any(run.glob(f"{n:02d}-{role}-{provider}*")):
            old = run / f"{n:02d}-{role}-{provider}"
            if old.exists():
                old.rename(run / f"interrupted-{time.time_ns()}-{role}")
            break
        data = invoke(provider, role, context, run, n)
        cache.write_text(json.dumps({"hash": digest, "data": data}))
        return data

    try:
        if not work.exists():
            if git(repo, "status", "--porcelain").strip():
                raise RuntimeError("Use --snapshot to include dirty source safely")
            git(repo, "worktree", "add", "--detach", str(work), "HEAD")
        source = {}
        for rel in task["files"]:
            path = (work / rel).resolve()
            if not path.is_relative_to(work.resolve()):
                raise ValueError("Input path outside workspace")
            source[rel] = path.read_text() if path.exists() else "(new file)"
        original = run / "original-source.json"
        if original.exists():
            source = json.loads(original.read_text())
        else:
            original.write_text(json.dumps(source))
        brief = json.dumps(
            {"goal": task["goal"], "acceptance": task["acceptance"], "files": source}
        )
        plan = agent(
            "codex", "PO", brief + "\nWrite implementation/acceptance plan in summary. Empty patch."
        )
        context = brief + "\nPLAN: " + plan["summary"]
        feedback = ""
        progress_file = run / "progress.json"
        start_attempt = 0
        if progress_file.exists():
            progress = json.loads(progress_file.read_text())
            start_attempt = progress["attempt"]
            context, feedback, n = progress["context"], progress["feedback"], progress["number"]
        for attempt in range(start_attempt, 3):
            provider = "gemini" if attempt < 2 else "codex"
            try:
                dev = agent(
                    provider,
                    "DEV",
                    context
                    + "\n"
                    + feedback
                    + "\nReturn unified git diff patch against CURRENT files. No markdown fences.",
                )
            except (RuntimeError, subprocess.TimeoutExpired):
                if provider != "gemini":
                    raise
                provider = "codex"
                dev = agent(
                    provider, "DEV", context + "\n" + feedback + "\nReturn unified git diff patch."
                )
            try:
                applied = run / f"applied-{attempt}.json"
                if not applied.exists():
                    before = git(work, "diff", "HEAD")
                    (run / f"before-{attempt}.patch").write_text(before)
                    reverse = subprocess.run(
                        ["git", "apply", "--recount", "--reverse", "--check", "-"],
                        cwd=work,
                        input=dev["patch"].rstrip("\n") + "\n",
                        text=True,
                        capture_output=True,
                    )
                    if reverse.returncode != 0:
                        apply_patch(work, dev["patch"])
                    applied.write_text(
                        json.dumps(
                            {"patch_hash": hashlib.sha256(dev["patch"].encode()).hexdigest()}
                        )
                    )
                # Include new files in diff without committing them.
                git(work, "add", "-N", ".")
                result = subprocess.run(
                    task["test_command"], cwd=work, text=True, capture_output=True, timeout=120
                )
                tests = {
                    "exit_code": result.returncode,
                    "stdout": result.stdout,
                    "stderr": result.stderr,
                }
            except (ValueError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
                tests = {
                    "exit_code": 1,
                    "error": str(exc),
                    "stderr": str(getattr(exc, "stderr", "")),
                }
            (run / f"tests-{attempt}.json").write_text(json.dumps(tests, indent=2))
            diff = git(work, "diff", "HEAD")
            # QC never shares the Dev conversation. Independent invocation.
            qc = agent(
                "codex" if provider == "gemini" else "gemini",
                "QC",
                brief
                + "\nDIFF:\n"
                + diff
                + "\nTESTS:\n"
                + json.dumps(tests)
                + "\nReview correctness independently. "
                "passed only if acceptance is met; empty patch.",
            )
            if tests["exit_code"] == 0 and qc["passed"]:
                (run / "change.patch").write_text(diff)
                save("AWAITING_USER_REVIEW", summary=qc["summary"], worktree=str(work))
                return state
            source = {
                rel: (work / rel).read_text() if (work / rel).exists() else "(new file)"
                for rel in task["files"]
            }
            context = brief + "\nCURRENT FILES:\n" + json.dumps(source)
            feedback = json.dumps({"qc": qc, "tests": tests})
            progress_file.write_text(
                json.dumps(
                    {"attempt": attempt + 1, "context": context, "feedback": feedback, "number": n}
                )
            )
        save("NEEDS_ATTENTION", reason="Three repair attempts exhausted")
    except Exception as exc:
        save("BLOCKED", reason=str(exc))
    return state


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--repo", type=Path, required=True)
    p.add_argument("--task", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--resume", action="store_true")
    p.add_argument("--snapshot", action="store_true")
    args = p.parse_args()
    if args.snapshot and not args.resume:
        from workspace import snapshot

        args.repo = snapshot(
            args.repo.resolve(), args.output.resolve().parent / (args.output.name + "-source")
        )
    result = run_task(
        args.repo.resolve(), json.loads(args.task.read_text()), args.output, resume=args.resume
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "AWAITING_USER_REVIEW" else 1)
