#!/usr/bin/env bash
set -euo pipefail
bash scripts/alva-066-verify.sh types
mkdir -p .runtime/alva073-check
python3 - <<'PY'
import json,pathlib
pathlib.Path('.runtime/alva073-check/tsconfig.json').write_text(json.dumps({'extends':'../../tsconfig.json','include':['../../tests/alva-stage-guidance.test.ts','../../scripts/alva-073-browser.ts']},indent=2))
PY
node node_modules/typescript/bin/tsc --noEmit -p .runtime/alva073-check/tsconfig.json
bash scripts/alva-066-verify.sh build
bash scripts/alva-072-tests.sh tests/alva-stage-guidance.test.ts
