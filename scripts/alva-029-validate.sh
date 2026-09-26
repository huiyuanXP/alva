#!/usr/bin/env bash
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
bash scripts/alva-029-run.sh final-types bash scripts/alva-029-verify.sh types
bash scripts/alva-029-run.sh final-regression bash scripts/alva-029-verify.sh tests tests/alva-user-context.test.ts tests/alva-layout-review.test.ts tests/alva-layout-review-store.test.ts tests/alva-context-chat.test.ts tests/alva-snapshot-restore.test.ts
bash scripts/alva-029-run.sh final-build bash scripts/alva-029-verify.sh build
