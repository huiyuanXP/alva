#!/usr/bin/env bash
# Isolated module gates only. Does not deploy or claim real Chat/MCP acceptance.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
run() { bash scripts/alva-029-run.sh "$@"; }
run final-typecheck env GOMEMLIMIT=700MiB GOGC=50 GOMAXPROCS=1 node node_modules/typescript/bin/tsc --noEmit
run final-regression node --max-old-space-size=512 --max-semi-space-size=8 --liftoff-only --no-wasm-tier-up \
 --wasm-lazy-compilation --wasm-num-compilation-tasks=1 --import tsx --test --test-concurrency=1 \
 tests/alva-user-context.test.ts tests/alva-layout-review.test.ts tests/alva-layout-review-store.test.ts \
 tests/alva-pain-analysis.test.ts tests/alva-snapshots.test.ts
run final-build node --max-old-space-size=640 --max-semi-space-size=8 node_modules/vite/bin/vite.js build --config web/vite.config.ts
