#!/usr/bin/env bash
# A single bounded validation task; never changes production service limits.
set -euo pipefail
label=${1:?label required}; shift
[[ $label =~ ^[a-z0-9-]+$ ]] || exit 2
root=$(git rev-parse --show-toplevel)
common=$(git rev-parse --path-format=absolute --git-common-dir)
cd "$root"
exec 9>"$common/alva-heavy-task.lock"
flock -n 9 || { echo 'Another heavy task holds the shared lock; not started.' >&2; exit 75; }
available=$(awk '/MemAvailable:/ {print int($2/1024)}' /proc/meminfo)
(( available >= 1456 )) || { echo "Insufficient headroom: ${available} MiB; 1456 required." >&2; exit 75; }
run="$(date -u +%Y%m%dT%H%M%SZ)-ALVA029-${label}-$$"
out="$root/evidence/$run"
mkdir -p "$out"
export XDG_RUNTIME_DIR=${XDG_RUNTIME_DIR:-/run/user/$(id -u)}
printf 'run=%s\nCPUQuota=80%%\nMemoryMax=20%%\nMemorySwapMax=0\nheadroomMiB=%s\n' "$run" "$available" > "$out/limits.txt"
git rev-parse HEAD >> "$out/limits.txt"
# Bind evidence to actual sources, including uncommitted integration changes.
python3 - "$out/source-manifest.json" <<'PYMANIFEST'
import hashlib,json,pathlib,subprocess,sys
paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z','api','web/src','packages/contracts','tests','scripts','package.json','package-lock.json','tsconfig.json']).decode().split('\0')
files={p:hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest() for p in sorted(set(paths)) if p and pathlib.Path(p).is_file()}
pathlib.Path(sys.argv[1]).write_text(json.dumps(files,sort_keys=True,indent=2)+'\n')
PYMANIFEST
model_env=()
if [[ -n ${NEWAPI_KEY:-} ]]; then model_env+=(--setenv=NEWAPI_KEY); fi
task_seconds=${ALVA029_TASK_SECONDS:-540}
[[ $task_seconds =~ ^[0-9]+$ ]] && (( task_seconds >= 1 && task_seconds <= 1800 )) || exit 2
set +e
systemd-run --user --quiet --wait --pipe --collect --unit="alva029-${label}-$$" \
 --slice=alva029.slice --property=CPUQuota=80% --property=MemoryMax=20% --property=MemorySwapMax=0 \
 --property=TasksMax=192 --property=RuntimeMaxSec="$task_seconds" --property=KillMode=control-group \
 --working-directory="$root" --setenv="PATH=$PATH" "${model_env[@]}" \
 bash scripts/alva-029-task.sh "$out" "$@" 2>&1 | tee "$out/output.log"
status=${PIPESTATUS[0]}
set -e
if [[ ! -f "$out/command-exit.txt" ]]; then status=125;
elif [[ $(cat "$out/command-exit.txt") != 0 ]]; then status=$(cat "$out/command-exit.txt"); fi
if [[ -f "$out/memory-events.txt" ]] && awk '$1=="oom_kill" && $2>0 {found=1} END {exit !found}' "$out/memory-events.txt"; then status=137; fi
printf '{"exitCode":%s,"cpuQuota":"80%%","memoryMax":"20%%","run":"%s"}\n' "$status" "$run" > "$out/result.json"
printf '\nEvidence: evidence/%s (exit %s)\n' "$run" "$status"
exit "$status"
