#!/usr/bin/env bash
set -euo pipefail
python3 - "$@" <<'PY'
import re,subprocess,pathlib,sys
count=0
for file in sys.argv[1:]:
 for name in re.findall(r"(?:^|\n)test\('([^']+)'",pathlib.Path(file).read_text()):
  subprocess.run(['node','--max-old-space-size=128','--max-semi-space-size=2','--liftoff-only','--no-wasm-tier-up','--wasm-lazy-compilation','--wasm-num-compilation-tasks=1','--import','tsx','--test','--test-isolation=none','--test-concurrency=1','--test-name-pattern','^'+re.escape(name)+'$',file],check=True)
  count+=1
print('Isolated test cases passed:',count)
PY
