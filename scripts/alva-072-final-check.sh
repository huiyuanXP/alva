#!/usr/bin/env bash
set -euo pipefail
bash scripts/alva-066-verify.sh types
bash scripts/alva-066-verify.sh build
node --max-old-space-size=128 --max-semi-space-size=2 --liftoff-only --no-wasm-tier-up --wasm-lazy-compilation --wasm-num-compilation-tasks=1 --import tsx scripts/alva-072-browser.ts
root=$(python3 - <<'PY'
from pathlib import Path
print(sorted(Path('.runtime').glob('*-ALVA072-browser'))[-1])
PY
)
node --max-old-space-size=128 --max-semi-space-size=2 --liftoff-only --no-wasm-tier-up --wasm-lazy-compilation --wasm-num-compilation-tasks=1 --import tsx scripts/alva-072-restart.ts "$root"
