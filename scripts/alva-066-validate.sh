#!/usr/bin/env bash
# Bounded runner is supplied by systemd-run. Poll the same unit; never duplicate a live run.
set -euo pipefail
cd "$(dirname "$0")/.."
run_id="$(date -u +%Y%m%dT%H%M%SZ)-ALVA066-validation-$$"
result_dir="$PWD/evidence/$run_id"
mkdir -p "$result_dir"
shared_git_dir="$(git rev-parse --path-format=absolute --git-common-dir)"
exec 9>"$shared_git_dir/alva-heavy-task.lock"
printf '%s\n' "$result_dir"
heartbeat_pid=''
cleanup(){ if [[ -n "$heartbeat_pid" ]]; then kill "$heartbeat_pid" 2>/dev/null || true; wait "$heartbeat_pid" 2>/dev/null || true; fi; }
trap cleanup EXIT
(while true; do date -u +%Y-%m-%dT%H:%M:%SZ > "$result_dir/heartbeat"; sleep 10; done) &
heartbeat_pid=$!
printf '%s\n' 'waiting-heavy-task-lock' > "$result_dir/current-step"
if ! flock -w 600 9; then
  printf '{"status":"not-started","reason":"heavy-task-lock-wait-timeout"}\n' > "$result_dir/result.json"
  exit 75
fi
run_step(){
 local label="$1"; shift
 printf '%s\n' "$label" > "$result_dir/current-step"
 if "$@" > "$result_dir/$label.log" 2>&1; then
  printf '%s passed\n' "$label"
 else
  local status=$?
  printf '{"pass":false,"step":"%s","exitCode":%d}\n' "$label" "$status" > "$result_dir/result.json"
  cat "$result_dir/$label.log"
  exit "$status"
 fi
}
run_step typecheck env GOMEMLIMIT=700MiB GOGC=50 GOMAXPROCS=1 npm run check
run_step tests node --max-old-space-size=512 --max-semi-space-size=8 --liftoff-only --no-wasm-tier-up --wasm-lazy-compilation --wasm-num-compilation-tasks=1 --import tsx --test --test-concurrency=1 tests/alva-stage-chat.test.ts tests/alva-room-style.test.ts tests/alva-ui-actions.test.ts tests/alva-answer-recommendations.test.ts tests/alva-business-guidance.test.ts tests/alva-furniture-properties.test.ts tests/alva-furniture-transform.test.ts tests/alva-local-proposals.test.ts tests/alva-reference-annotation.test.ts tests/alva-room-purpose.test.ts tests/alva-chat-attachments.test.ts tests/alva-import.test.ts tests/alva-stage-sessions.test.ts tests/alva-stage-mcp.test.ts tests/alva-building.test.ts tests/alva-calibration.test.ts tests/alva-topology.test.ts
printf '{"pass":true,"steps":["typecheck","tests"],"scope":"stage MCP, sessions, attachments and affected direct import/topology/building regression; not full ALVA-066 acceptance"}\n' > "$result_dir/result.json"
cat "$result_dir/tests.log"
