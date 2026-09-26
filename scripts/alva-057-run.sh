#!/usr/bin/env bash
# Run one isolated validation task with the shared heavy-task lock and hard limits.
set -euo pipefail
label=${1:?label required}; memory=${2:?1200M or 1600M required}; shift 2
[[ $label =~ ^[a-z0-9-]+$ ]] || { echo 'Invalid task label' >&2; exit 2; }
[[ $memory == 1200M || $memory == 1600M ]] || { echo 'Unsupported memory limit' >&2; exit 2; }
[[ $# -gt 0 ]] || exit 2
root=$(git rev-parse --show-toplevel)
common=$(git rev-parse --path-format=absolute --git-common-dir)
cd "$root"
exec 9>"$common/alva-heavy-task.lock"
flock -n 9 || { echo 'Another heavy task holds the shared lock; not started.' >&2; exit 75; }
available=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
required=$(( ${memory%M} + 256 ))
(( available >= required )) || { echo "Insufficient headroom: ${available} MiB available; ${required} required." >&2; exit 75; }
run="$(date -u +%Y%m%dT%H%M%SZ)-ALVA057-${label}-$$"
out="$root/evidence/$run"
mkdir -p "$out"
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
printf 'run=%s\nCPUQuota=80%%\nMemoryMax=%s\nMemorySwapMax=0\nheadroomMiB=%s\n' "$run" "$memory" "$available" > "$out/limits.txt"
git rev-parse HEAD >> "$out/limits.txt"
set +e
systemd-run --user --quiet --wait --pipe --collect --unit="alva057-${label}-$$" \
 --property=CPUQuota=80% --property="MemoryMax=$memory" --property=MemorySwapMax=0 \
 --property=TasksMax=192 --property=RuntimeMaxSec=540 --property=KillMode=control-group \
 --working-directory="$root" --setenv="PATH=$PATH" \
 bash scripts/alva-057-task.sh "$out" "$@" 2>&1 | tee "$out/output.log"
status=${PIPESTATUS[0]}
set -e
# Stopping a transient unit can make systemd-run return 0 without completing the command.
if [[ ! -f "$out/command-exit.txt" ]]; then
 echo 'Validation did not complete; no command exit receipt.' >&2
 status=125
elif [[ $(cat "$out/command-exit.txt") != 0 ]]; then
 status=$(cat "$out/command-exit.txt")
fi
if [[ -f "$out/memory-events.txt" ]] && awk '$1=="oom_kill" && $2>0 {found=1} END {exit !found}' "$out/memory-events.txt"; then
 echo 'Validation had an OOM kill; not accepted.' >&2
 status=137
fi
printf '{"exitCode":%s,"cpuQuota":"80%%","memoryMax":"%s","run":"%s"}\n' "$status" "$memory" "$run" > "$out/result.json"
printf '\nEvidence: evidence/%s (exit %s)\n' "$run" "$status"
exit "$status"
