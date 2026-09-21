#!/bin/sh
set -eu
PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$PROJECT_DIR"
.venv/bin/python - <<'PY'
import os
import subprocess
from app.core.config import get_settings
s = get_settings()
env = {**os.environ, 'U2NET_HOME': str(s.product_model_home.resolve()), 'OMP_NUM_THREADS': '2'}
subprocess.run(['uv', 'pip', 'install', '--python', str(s.product_python), 'rembg[cpu]==2.0.74'], check=True)
subprocess.run([str(s.product_python), '-c', 'from rembg import new_session; import sys; new_session(sys.argv[1], providers=["CPUExecutionProvider"])', s.product_model], env=env, check=True)
print('Product model ready.')
PY
