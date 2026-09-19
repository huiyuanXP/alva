"""Create a source-only validation bundle; excludes all credentials and user data."""
from pathlib import Path
import base64
import gzip
import json
source = json.loads(gzip.decompress(Path('.runtime/validation-source.json.gz').read_bytes()))
source['files'] = {p: s for p, s in source['files'].items() if p.startswith('apps/') or p.startswith('vendor/') or p in ('package.json', 'tsconfig.json')}
source['files']['packages/contracts/index.ts'] = Path('packages/contracts/index.ts').read_text()
print(base64.b64encode(gzip.compress(json.dumps(source, ensure_ascii=False).encode())).decode())
