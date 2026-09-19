#!/usr/bin/env python3
"""Read-only prerequisites audit. Exit 2 means required inputs are missing."""
import datetime, hashlib, json, pathlib, socket, subprocess, uuid
ROOT = pathlib.Path(__file__).resolve().parents[1]
OLD = pathlib.Path('/home/ubuntu/aws-hackthon/renovation-consultation')
REQUIRED = ['项目定位.md', '提议审批.md', '00_industry_research.html',
 '01_sample_delivery.html', '02_intake_form.html',
 'room-study-handoff/references/assistant-ui-design.md',
 'room-study-handoff/room-study-standalone.html',
 'room-study-handoff/src/math.js', 'room-study-handoff/src/model.js',
 'room-study-handoff/src/renderer.js', 'room-study-handoff/src/app.js',
 'room-study-handoff/public/floorplan.png']
def command(args):
 r = subprocess.run(args, capture_output=True, text=True)
 return {'command': args, 'exit_code': r.returncode, 'stdout': r.stdout.strip(), 'stderr': r.stderr.strip()}
def main():
 run_id = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '-' + uuid.uuid4().hex[:8]
 out = ROOT / 'evidence' / run_id
 out.mkdir(parents=True, exist_ok=False)
 inputs = []
 for name in REQUIRED:
  path = ROOT / 'references' / name
  inputs.append({'path': str(path), 'exists': path.is_file(), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None})
 missing = [x['path'] for x in inputs if not x['exists']]
 report = {'run_id': run_id, 'hostname': socket.gethostname(), 'inputs': inputs,
  'original_floorplan': 'references/room-study-handoff/public/floorplan.png',
  'old_head': command(['git', '-C', str(OLD), 'rev-parse', 'HEAD']),
  'old_worktree': command(['git', '-C', str(OLD), 'status', '--short']),
  'runtime': [command(c) for c in [['node','--version'],['npm','--version'],['python3','--version'],['git','--version'],['codex','--version'],['cloudflared','--version']]],
  'listeners': command(['ss','-ltn']),
  'blockers': {'missing_required_inputs': missing, 'alva_destination': str(ROOT), 'domain': 'prod.huiyuanxp.com (authorized by user); release not performed'},
  'status': 'blocked' if missing else 'inputs_verified', 'product_acceptance': 'not run'}
 (out / 'result.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
 print(json.dumps({'run_id':run_id,'report':str(out/'result.json'),'status':'blocked' if missing else 'inputs_verified','missing_named_inputs':len(missing)}, ensure_ascii=False))
 return 2 if missing else 0
if __name__ == '__main__':
 raise SystemExit(main())
