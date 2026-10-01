"""Private source snapshots: no mutation of original index, files or refs."""

import hashlib
import json
import shutil
import subprocess
from pathlib import Path


def snapshot(repo: Path, dest: Path):
    dest.mkdir(parents=True, exist_ok=False)
    names = (
        subprocess.check_output(
            ["git", "-C", str(repo), "ls-files", "-z", "--cached", "--others", "--exclude-standard"]
        )
        .decode()
        .split("\0")
    )
    hashes = {}
    excluded = []
    for name in sorted(set(filter(None, names))):
        src = repo / name
        parts = Path(name).parts
        if (
            src.is_symlink()
            or not src.is_file()
            or any(p in {"node_modules", "dist_test", "__pycache__", "reports"} for p in parts)
            or src.name.startswith(".env")
            or src.suffix in {".pem", ".key", ".tsbuildinfo"}
        ):
            excluded.append(name)
            continue
        target = dest / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, target)
        hashes[name] = hashlib.sha256(target.read_bytes()).hexdigest()
    subprocess.run(["git", "init", "-q", str(dest)], check=True)
    subprocess.run(["git", "-C", str(dest), "add", "-f", "."], check=True)
    subprocess.run(
        [
            "git",
            "-C",
            str(dest),
            "-c",
            "user.name=Mivy Snapshot",
            "-c",
            "user.email=snapshot@example.invalid",
            "commit",
            "-qm",
            "Source snapshot",
        ],
        check=True,
    )
    (dest.parent / "snapshot.json").write_text(
        json.dumps({"source": str(repo), "files": hashes, "excluded": excluded}, indent=2)
    )
    return dest
