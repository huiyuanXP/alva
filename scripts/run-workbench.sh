#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
NODE_VERSION="$(cat .runtime/node-version)"
export PATH="$ROOT/.runtime/node-$NODE_VERSION-linux-x64/bin:$PATH"
export PORT="${PORT:-4174}"
export APP_ORIGIN="${APP_ORIGIN:-http://127.0.0.1:$PORT}"
export PUBLIC_ENABLE_ANALYTICS=false
if [[ ! -f "${APP_WEB_DIST:-$ROOT/apps/web/dist}/index.html" || ! -f "${APP_ENGINE_DIR:-$ROOT/vendor/openplan3d/build}/handler.js" ]]; then
  echo 'Production assets are missing. Run npm run build before starting.' >&2
  exit 1
fi
# Never kill an existing listener, change tunnel configuration, or read credentials into stdout.
python3 - "$PORT" <<'PY'
import socket, sys
s=socket.socket()
# Match Node listen semantics: TIME_WAIT from the previous service is not a listener.
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(('127.0.0.1',int(sys.argv[1])))
except OSError:
    print('Port is occupied. Verify the existing service before switching; no process was stopped.',file=sys.stderr)
    sys.exit(2)
finally:
    s.close()
PY
exec node node_modules/tsx/dist/cli.mjs apps/api/server.ts
