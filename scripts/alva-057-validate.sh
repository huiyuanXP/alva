#!/usr/bin/env bash
# Reproduce the isolated questionnaire gates; never deploy or read production credentials.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
run() { bash scripts/alva-057-run.sh "$@"; }
wasm=(--max-semi-space-size=8 --liftoff-only --no-wasm-tier-up --wasm-lazy-compilation --wasm-num-compilation-tasks=1)
run release-typecheck 1200M env GOMEMLIMIT=700MiB GOGC=50 GOMAXPROCS=1 node node_modules/typescript/bin/tsc --noEmit
run release-regression 1200M node --max-old-space-size=512 "${wasm[@]}" --import tsx --test --test-concurrency=1 \
 tests/alva-home-vision-recovery.test.ts tests/alva-home-vision.test.ts tests/alva-intake.test.ts \
 tests/alva-chat.test.ts tests/alva-chat-answer-confirmation.test.ts \
 tests/alva-questionnaire-scope.test.ts tests/alva-snapshots.test.ts
run release-build 1200M node --max-old-space-size=640 --max-semi-space-size=8 node_modules/vite/bin/vite.js build --config web/vite.config.ts
run release-recovery-browser 1600M node --max-old-space-size=448 "${wasm[@]}" --import tsx scripts/alva-057-recovery-browser.ts
run release-layout-browser 1600M node --max-old-space-size=448 "${wasm[@]}" --import tsx scripts/alva-057-browser.ts
