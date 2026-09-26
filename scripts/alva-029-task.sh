#!/usr/bin/env bash
set -euo pipefail
out=${1:?evidence directory required}; shift
cg="/sys/fs/cgroup$(awk -F: '$1==0 {print $3}' /proc/self/cgroup)"
for file in cpu.max memory.max memory.swap.max pids.max; do printf '%s=' "$file"; cat "$cg/$file"; done > "$out/enforced-limits.txt"
[[ $(cat "$cg/cpu.max") == '80000 100000' ]] || exit 78
[[ $(cat "$cg/memory.max") == '1258291200' ]] || exit 78
[[ $(cat "$cg/memory.swap.max") == '0' ]] || exit 78
sample() { while :; do
 printf '%s\t%s\t%s\t' "$(date -u +%FT%TZ)" "$(cat "$cg/memory.current")" "$(cat "$cg/memory.peak")"
 awk '$1=="usage_usec" {printf "%s\n", $2}' "$cg/cpu.stat"
 sleep 2
done; }
printf 'time\tmemoryBytes\tpeakBytes\tcpuUsec\n' > "$out/resources.tsv"
sample >> "$out/resources.tsv" & sampler=$!
cleanup() {
 kill "$sampler" 2>/dev/null || true
 wait "$sampler" 2>/dev/null || true
 cat "$cg/memory.events" > "$out/memory-events.txt"
 cat "$cg/memory.peak" > "$out/memory-peak.txt"
 cat "$cg/cpu.stat" > "$out/cpu-stat.txt"
}
trap cleanup EXIT
set +e
"$@"
status=$?
printf '%s\n' "$status" > "$out/command-exit.txt"
exit "$status"
