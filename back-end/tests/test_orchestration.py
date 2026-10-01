import importlib.util
import subprocess
from pathlib import Path

import pytest

spec = importlib.util.spec_from_file_location(
    "runner", Path(__file__).parents[1] / "scripts/orchestration/run.py"
)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


def test_claude_blocked():
    with pytest.raises(ValueError):
        runner.command("claude", "", Path("/tmp/out"), Path("/tmp/schema"))


def test_patch_cannot_escape(tmp_path):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    with pytest.raises(subprocess.CalledProcessError):
        runner.apply_patch(
            tmp_path,
            "diff --git a/../escape b/../escape\nnew file mode 100644\n"
            "--- /dev/null\n+++ b/../escape\n"
            "@@ -0,0 +1 @@\n+bad\n",
        )
    assert not (tmp_path.parent / "escape").exists()


def test_qc_repair_cycle(tmp_path):
    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    (repo / "value.txt").write_text("old\n")
    subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
    subprocess.run(
        [
            "git",
            "-C",
            str(repo),
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.invalid",
            "commit",
            "-qm",
            "init",
        ],
        check=True,
    )
    calls = []

    def fake(provider, role, prompt, run, number):
        calls.append(role)
        return {
            "summary": "ok",
            "passed": True,
            "issues": [],
            "patch": "diff --git a/value.txt b/value.txt\n--- a/value.txt\n+++ b/value.txt\n"
            "@@ -1 +1 @@\n-old\n+new\n"
            if role == "DEV"
            else "",
        }

    state = runner.run_task(
        repo,
        {
            "goal": "change",
            "acceptance": ["new"],
            "files": ["value.txt"],
            "test_command": ["python3", "-c", "assert open('value.txt').read() == 'new\\n'"],
        },
        tmp_path / "run",
        fake,
    )
    assert state["status"] == "AWAITING_USER_REVIEW"
    assert calls == ["PO", "DEV", "QC"]
    assert (repo / "value.txt").read_text() == "old\n"


def test_patch_without_final_newline(tmp_path):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    (tmp_path / "value.txt").write_text("old\n")
    runner.apply_patch(
        tmp_path,
        "--- a/value.txt\n+++ b/value.txt\n@@ -1 +1 @@\n-old\n+new",
    )
    assert (tmp_path / "value.txt").read_text() == "new\n"


def test_resume_does_not_repeat_completed_agents(tmp_path):
    import json

    repo = tmp_path / "repo"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    (repo / "x").write_text("a\n")
    subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
    subprocess.run(
        [
            "git",
            "-C",
            str(repo),
            "-c",
            "user.name=T",
            "-c",
            "user.email=t@example.invalid",
            "commit",
            "-qm",
            "init",
        ],
        check=True,
    )
    calls = []

    def fake(provider, role, prompt, run, number):
        calls.append(role)
        if role == "QC" and calls.count("QC") == 1:
            raise RuntimeError("quota interruption")
        return {
            "summary": "ok",
            "issues": [],
            "passed": True,
            "patch": "--- a/x\n+++ b/x\n@@ -1 +1 @@\n-a\n+b\n" if role == "DEV" else "",
        }

    task = {
        "goal": "change",
        "acceptance": ["b"],
        "files": ["x"],
        "test_command": ["python3", "-c", "assert open('x').read()=='b\\n'"],
    }
    dest = tmp_path / "run"
    assert runner.run_task(repo, task, dest, fake)["status"] == "BLOCKED"
    assert runner.run_task(repo, task, dest, fake, resume=True)["status"] == "AWAITING_USER_REVIEW"
    assert calls == ["PO", "DEV", "QC", "QC"]
    assert json.loads((dest / "tests-0.json").read_text())["exit_code"] == 0


def test_snapshot_preserves_dirty_source_without_secrets(tmp_path):
    spec2 = importlib.util.spec_from_file_location(
        "workspace", Path(runner.__file__).with_name("workspace.py")
    )
    mod = importlib.util.module_from_spec(spec2)
    spec2.loader.exec_module(mod)
    repo = tmp_path / "original"
    repo.mkdir()
    subprocess.run(["git", "init", "-q", str(repo)], check=True)
    (repo / "source.py").write_text("dirty source")
    (repo / ".env").write_text("private")
    snap = mod.snapshot(repo, tmp_path / "snapshot")
    assert (snap / "source.py").read_text() == "dirty source"
    assert not (snap / ".env").exists()
    assert (repo / "source.py").read_text() == "dirty source"


def test_visual_qc_rejects_fixture_only(tmp_path, monkeypatch):
    import json
    import sys

    monkeypatch.setitem(sys.modules, "run", runner)
    vspec = importlib.util.spec_from_file_location(
        "visual", Path(runner.__file__).with_name("visual_qc.py")
    )
    visual = importlib.util.module_from_spec(vspec)
    vspec.loader.exec_module(visual)
    manifest = tmp_path / "manifest.json"
    manifest.write_text(
        json.dumps(
            {
                "results": [
                    {
                        "status": "SUCCESS",
                        "provider_id": "offline_fixture",
                        "image_path": "fake.png",
                    }
                ]
            }
        )
    )
    cases = tmp_path / "cases.json"
    cases.write_text('{"cases":[]}')
    assert visual.review(manifest, cases, tmp_path / "out")["status"] == "BLOCKED_NO_REAL_IMAGES"


def test_patch_recounts_incorrect_hunk_size(tmp_path):
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    (tmp_path / "value.txt").write_text("old\n")
    runner.apply_patch(tmp_path, "--- a/value.txt\n+++ b/value.txt\n@@ -1,9 +1,8 @@\n-old\n+new\n")
    assert (tmp_path / "value.txt").read_text() == "new\n"
