#!/usr/bin/env bash
# Run with alva-066-run.sh: shared 20% memory budget, sequential checks.
set -euo pipefail
mode=${1:?types, tests or build}; shift
case "$mode" in
 types)
  python3 - <<'PY'
from pathlib import Path
import json
root=Path('.runtime/alva066-check');root.mkdir(parents=True,exist_ok=True)
for name,include in [('api',['../../api/**/*.ts','../../packages/contracts/**/*.ts']),('web',['../../web/**/*.ts','../../web/**/*.tsx']),('tests',['../../tests/alva-stage-recovery.test.ts','../../tests/alva-stage-chat.test.ts','../../tests/alva-stage-mcp.test.ts'])]:
 (root/('tsconfig-'+name+'.json')).write_text(json.dumps({'extends':'../../tsconfig.json','include':include},indent=2)+'\n')
PY
  for group in api web tests; do
   env GOMEMLIMIT=400MiB GOGC=20 GOMAXPROCS=1 node node_modules/typescript/bin/tsc --noEmit -p ".runtime/alva066-check/tsconfig-$group.json"
  done
  ;;
 tests)
  python3 - "$@" <<'PY'
import re,subprocess,pathlib,sys
files=sys.argv[1:] or ['tests/alva-stage-chat.test.ts','tests/alva-stage-mcp.test.ts','tests/alva-stage-recovery.test.ts','tests/alva-topology-quality.test.ts']
count=0
for file in files:
 names=re.findall(r"(?:^|\n)test\('([^']+)'",pathlib.Path(file).read_text())
 assert names,file
 for name in names:
  subprocess.run(['node','--max-old-space-size=160','--max-semi-space-size=4','--liftoff-only','--no-wasm-tier-up','--wasm-lazy-compilation','--wasm-num-compilation-tasks=1','--import','tsx','--test','--test-concurrency=1','--test-name-pattern','^'+re.escape(name)+'$',file],check=True)
  count+=1
print('Isolated test cases passed:',count)
PY
  ;;
 build) node --max-old-space-size=384 node_modules/vite/bin/vite.js build --config web/vite.config.ts ;;
 *) exit 2 ;;
esac
