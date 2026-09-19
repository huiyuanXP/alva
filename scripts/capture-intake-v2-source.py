"""Capture non-secret source and built-web identities for a reviewed candidate.
This is a recovery snapshot, NOT a privileged or deployable release installer.
Never includes .data, .env, credentials, node_modules, browser traces or uploads.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import datetime

root = Path(__file__).resolve().parents[1]
run_id = (root / '.runtime/agent-intake-v2-current').read_text().strip()
if not re.fullmatch(r'agent-intake-v2-\d{8}T\d{6}Z-[a-f0-9]{6}', run_id):
    raise SystemExit('Unexpected run identifier')
run = root / '.runtime' / run_id
out = run / 'candidate-source'
if out.exists():
    raise SystemExit('Candidate already captured; preserve it and use a new run for new code')
out.mkdir(mode=0o700)
files = []
for directory in ['apps', 'packages', 'scripts', 'tests', 'taskboard']:
    for path in (root / directory).rglob('*'):
        if not path.is_file() or path.is_symlink():
            continue
        rel = path.relative_to(root)
        if any(part.startswith('.') or part in ['dist', 'node_modules', '__pycache__'] for part in rel.parts):
            continue
        if path.suffix in ['.ts', '.tsx', '.js', '.mjs', '.css', '.json', '.html', '.py', '.sh', '.md']:
            files.append(path)
files += [root / p for p in ['package.json', 'package-lock.json', 'tsconfig.json', 'playwright.config.ts', 'docs/AGENT-INTAKE-V2.md']]
manifest = {}
for path in sorted(set(files)):
    if not path.is_file():
        continue
    rel = path.relative_to(root)
    data = path.read_bytes()
    manifest[str(rel)] = hashlib.sha256(data).hexdigest()
    dest = out / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
web = {}
for path in sorted((run / 'web').rglob('*')):
    if path.is_file() and not path.is_symlink():
        web[str(path.relative_to(run / 'web'))] = hashlib.sha256(path.read_bytes()).hexdigest()
canonical = json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()
receipt = {
    'run_id': run_id, 'captured_at': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'head': subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=root, text=True).strip(),
    'source_sha256': hashlib.sha256(canonical).hexdigest(), 'source_files': manifest,
    'built_web': web, 'engine_reused': '.runtime/week2-release/engine',
    'engine_handler_sha256': hashlib.sha256((root / '.runtime/week2-release/engine/handler.js').read_bytes()).hexdigest(),
    'scope': 'Non-secret recovery source snapshot; not a complete deployable release and no production operations',
    'production_changed': False,
}
(run / 'candidate-fingerprint.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2))
print(json.dumps({'source_sha256': receipt['source_sha256'], 'source_files': len(manifest), 'web_files': len(web), 'output': str(out.relative_to(root))}))
