#!/usr/bin/env python3
"""Bounded, foreground Codex acceptance jobs. No credentials or permissions are changed."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import subprocess
import sys
import time
import uuid

ROOT = Path(__file__).resolve().parents[1]
RUNS = ROOT / '.runtime' / 'codex-runs'
CHECKS = ('typecheck', 'unit', 'browser_core', 'browser_live', 'http', 'visual')


def save(path: Path, value: object) -> None:
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.chmod(0o600)
    temp.replace(path)


def source_state() -> dict[str, str]:
    def git(*args: str) -> bytes:
        return subprocess.check_output(['git', *args], cwd=ROOT, stderr=subprocess.DEVNULL)
    names = git('ls-files', '--cached', '--others', '--exclude-standard', '-z', '--',
                'apps', 'packages', 'tests', 'scripts', 'vendor/openplan3d/src',
                'vendor/openplan3d/svelte.config.js', 'vendor/openplan3d/vite.config.ts',
                'vendor/openplan3d/tooling', 'vendor/openplan3d/package.json',
                'vendor/openplan3d/package-lock.json', 'package.json', 'package-lock.json',
                'tsconfig.json', 'playwright.config.ts').decode().split('\0')
    digest = hashlib.sha256()
    for name in sorted(set(filter(None, names))):
        path = ROOT / name
        if '__pycache__' in path.parts or path.suffix in ('.pyc', '.pyo'):
            continue
        if path.is_symlink():
            content = ('SYMLINK:' + os.readlink(path)).encode()
        elif path.is_file():
            content = path.read_bytes()
        else:
            content = b'<deleted>'
        digest.update(name.encode() + b'\0' + hashlib.sha256(content).digest())
    return {'head': git('rev-parse', 'HEAD').decode().strip(), 'fingerprint': digest.hexdigest()}


def get_run(name: str) -> Path:
    if RUNS.is_symlink() or RUNS.parent.is_symlink():
        raise ValueError('Private runtime directories must not be symlinks')
    if not name or Path(name).name != name or name in ('.', '..'):
        raise ValueError('Use a run directory basename, not an arbitrary path')
    path = RUNS / name
    if path.is_symlink() or path.resolve().parent != RUNS.resolve():
        raise ValueError('Run path escapes its private directory')
    return path


def schema() -> dict:
    def obj(properties: dict) -> dict:
        return {'type': 'object', 'additionalProperties': False, 'properties': properties, 'required': list(properties)}
    string = {'type': 'string'}
    strings = {'type': 'array', 'items': string}
    return obj({
        'run_id': string, 'baseline_head': string, 'baseline_fingerprint': string,
        'outcome': {'type': 'string', 'enum': ['passed', 'failed', 'blocked']},
        'checks': {'type': 'array', 'items': obj({
            'id': {'type': 'string', 'enum': list(CHECKS)},
            'status': {'type': 'string', 'enum': ['passed', 'failed', 'blocked', 'skipped']},
            'commands': strings, 'evidence_paths': strings, 'notes': string,
        })},
        'changed_files': strings, 'blockers': strings, 'next_actions': strings,
    })


def prepare() -> Path:
    if RUNS.is_symlink() or RUNS.parent.is_symlink():
        raise ValueError('Private runtime directories must not be symlinks')
    RUNS.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = get_run(time.strftime('%Y%m%dT%H%M%SZ', time.gmtime()) + '-' + uuid.uuid4().hex[:8])
    path.mkdir(mode=0o700)
    (path / 'evidence').mkdir(mode=0o700)
    baseline = source_state()
    manifest = {'run_id': path.name, 'created_at_unix': time.time(), 'baseline': baseline,
                'scope': 'Week 1 acceptance only; no Week 2 changes', 'required_checks': list(CHECKS)}
    save(path / 'manifest.json', manifest)
    save(path / 'report.schema.json', schema())
    evidence = (path / 'evidence').relative_to(ROOT).as_posix()
    prompt = f'''You are the acceptance worker for the owner-authorized ROOMNOTE project.
Run ID: {path.name}
Baseline HEAD: {baseline['head']}
Baseline source fingerprint: {baseline['fingerprint']}
Write fresh evidence only under {evidence}/, and use relative-to-project evidence_paths.
Read AGENTS.md, docs/handoffs/CURRENT.md, docs/WEEK1-VALIDATION.md and tickets 01-05 first.
The owner already completed Week 1 deployment; audit rather than reinstalling or undoing it.

Scope and guardrails:
- Product source is read-only for this acceptance job. Do not commit, reset, clean, mark tickets done,
  implement Week 2, stop/restart production, rebuild live assets, or change systemd/tunnel/MCP policy.
- Do not elevate privileges or disable sandboxes. A denied operation is BLOCKED, not a reason to try
  another privileged execution path. Do not open host credential files or print secrets.
- Browser tests MUST use the existing fixed 127.0.0.1:4175 and .runtime/browser-test-data fixture.
  Never point tests at .data, reuse production sessions, or run the default 4174 preview.
- Preserve existing docs/evidence. RENOVATION_ACCEPTANCE_DIR is already set to {evidence}.
  The existing browser tests now honor it. Capture new logs there too; do not copy old evidence
  and label it as a new test. Do not rebuild outputs beneath the live production server.

Required checks (inspect scripts before executing):
Run these checks sequentially on this shared host. Wait for typecheck and unit commands to exit
before starting browser_core, and wait for browser_core to exit before browser_live. A yielded
tool call is still running until polled to completion. Do not overlap CPU-heavy test processes;
keep the existing test timeouts and assertions unchanged.
1. typecheck: npm run check, capture exact exit code and log.
2. unit: npm test, capture exact exit code and counts; do not weaken tests to pass.
3. browser_core: npm run test:browser -- tests/browser/01-engine.spec.ts tests/browser/02-05-workflow.spec.ts.
   Preserve that run's JSON report as browser-core-results.json before another suite writes it.
4. browser_live: existing tests/browser/03-04-live.spec.ts (synthetic data, real configured provider).
   If authentication/network is unavailable, report BLOCKED; never replace the real provider with a mock.
5. http: read-only GET checks of 4173 /healthz, /, /todo and /todo/api/board; anonymous /api/projects
   must be denied. No owner login, private file reads, system service operations or production writes.
6. visual: actually inspect the fresh desktop/mobile screenshots. Distinguish automated layout
   assertions from visual inspection. If images cannot be inspected, mark this check BLOCKED.

Report every required check exactly once. For passed checks attach actual commands and nonempty
fresh evidence files. Include failed/blocked/skipped checks honestly. Return structured JSON matching
report.schema.json using the exact run_id and baseline values above. Overall passed requires all six
checks passed. Include concrete defects and next actions; a final message is not acceptance approval.
'''
    (path / 'prompt.md').write_text(prompt)
    (path / 'prompt.md').chmod(0o600)
    save(path / 'receipt.json', {'run_id': path.name, 'status': 'prepared', 'accepted': False})
    return path


def validate(path: Path, current: dict[str, str]) -> dict:
    manifest = json.loads((path / 'manifest.json').read_text())
    result = {'run_id': manifest['run_id'], 'status': 'invalid_report', 'accepted': False,
              'review_required': True, 'errors': [], 'artifacts': []}
    errors = result['errors']
    if (path / 'evidence').is_symlink():
        errors.append('Symlinked run evidence directory is not allowed')
        save(path / 'receipt.json', result)
        return result
    if current != manifest['baseline']:
        errors.append('Source changed since dispatch: report is stale; do not accept it')
    try:
        execution = json.loads((path / 'exit.json').read_text())
        if execution.get('run_id') != manifest['run_id'] or execution.get('exit_code') != 0:
            errors.append('Codex process did not finish successfully for this run')
        events = [json.loads(line) for line in (path / 'events.jsonl').read_text().splitlines() if line.strip()]
        types = [event.get('type') for event in events]
        if 'turn.completed' not in types or any(t in ('turn.failed', 'error') for t in types):
            errors.append('JSONL stream lacks clean turn.completed')
        report = json.loads((path / 'report.json').read_text())
        required = set(schema()['required'])
        if not isinstance(report, dict) or set(report) != required:
            raise ValueError('Final report has missing or unknown keys')
        for field, expected in [('run_id', manifest['run_id']), ('baseline_head', manifest['baseline']['head']),
                                ('baseline_fingerprint', manifest['baseline']['fingerprint'])]:
            if report.get(field) != expected:
                errors.append('Final report mismatch: ' + field)
        if report['outcome'] not in ('passed', 'failed', 'blocked'):
            raise ValueError('Invalid outcome')
        for field in ('changed_files', 'blockers', 'next_actions'):
            if not isinstance(report[field], list) or not all(isinstance(s, str) for s in report[field]):
                raise ValueError('Invalid report list: ' + field)
        checks = report['checks']
        if not isinstance(checks, list) or len(checks) != len(CHECKS) or {c.get('id') for c in checks} != set(CHECKS):
            raise ValueError('All six required checks must appear exactly once')
        seen = set()
        for check in checks:
            if set(check) != {'id', 'status', 'commands', 'evidence_paths', 'notes'}:
                raise ValueError('Malformed check')
            if check['status'] not in ('passed', 'failed', 'blocked', 'skipped') or not isinstance(check['notes'], str):
                raise ValueError('Invalid check status or notes')
            for field in ('commands', 'evidence_paths'):
                if not isinstance(check[field], list) or not all(isinstance(s, str) and s.strip() for s in check[field]):
                    raise ValueError('Invalid check list: ' + field)
            if check['status'] == 'passed' and (not check['commands'] or not check['evidence_paths']):
                errors.append(check['id'] + ': passed without command/evidence')
            for name in check['evidence_paths']:
                file = (ROOT / name).resolve()
                if Path(name).is_absolute() or not file.is_relative_to((path / 'evidence').resolve()):
                    errors.append(check['id'] + ': artifact outside this run'); continue
                if not file.is_file() or file.stat().st_size == 0:
                    errors.append(check['id'] + ': artifact missing or empty'); continue
                if name not in seen:
                    result['artifacts'].append({'path': name, 'bytes': file.stat().st_size,
                                                'sha256': hashlib.sha256(file.read_bytes()).hexdigest()})
                    seen.add(name)
        all_passed = all(c['status'] == 'passed' for c in checks)
        if report['outcome'] == 'passed' and (not all_passed or report['blockers']):
            errors.append('Overall passed contradicts check statuses or blockers')
        if report['changed_files']:
            errors.append('Acceptance worker changed files; inspect changes before any acceptance')
        result['reported_outcome'] = report['outcome']
        result['checks'] = {c['id']: c['status'] for c in checks}
        if not errors:
            result['status'] = 'ready_for_review' if all_passed and report['outcome'] == 'passed' else 'needs_attention'
    except (OSError, ValueError, TypeError, KeyError, AttributeError) as exc:
        errors.append('Missing or malformed completion evidence: ' + str(exc))
    save(path / 'receipt.json', result)
    return result


def run(path: Path, timeout: int) -> dict:
    if not 30 <= timeout <= 540:
        raise ValueError('Timeout must be between 30 and 540 seconds')
    if any((path / name).exists() for name in ('exit.json', 'events.jsonl', 'report.json', 'stderr.log')):
        raise ValueError('Run already attempted; prepare a fresh run rather than overwrite evidence')
    manifest = json.loads((path / 'manifest.json').read_text())
    if source_state() != manifest['baseline']:
        raise ValueError('Source changed after prepare; prepare a fresh request')
    executable = shutil.which('codex')
    if not executable:
        result = {'run_id': path.name, 'status': 'blocked', 'code': 'CODEX_NOT_ON_PATH',
                  'accepted': False, 'codex_started': False,
                  'detail': 'The current execution environment does not expose codex. Configure an authorized CLI entry; do not bypass filesystem or sandbox policy.'}
        save(path / 'receipt.json', result)
        return result
    env = os.environ.copy()
    # Preserve the caller's authentication/HOME; never read or copy credential files.
    env['RENOVATION_ACCEPTANCE_DIR'] = str((path / 'evidence').relative_to(ROOT))
    version_file = ROOT / '.runtime/node-version'
    if version_file.exists():
        version = version_file.read_text().strip()
        local_bin = ROOT / '.runtime' / ('node-' + version + '-linux-x64') / 'bin'
        if local_bin.is_dir():
            env['PATH'] = str(local_bin) + os.pathsep + env.get('PATH', '')
    if (ROOT / '.runtime/browsers').is_dir():
        env['PLAYWRIGHT_BROWSERS_PATH'] = str(ROOT / '.runtime/browsers')
    command = [executable, '-a', 'never', 'exec', '--sandbox', 'workspace-write', '--json',
               '--output-schema', str(path / 'report.schema.json'), '-o', str(path / 'report.json'), '-']
    # If the parent tool cancels this wrapper, clean up this specific child job too.
    def interrupted(_signal: int, _frame: object) -> None:
        raise KeyboardInterrupt
    old_handler = signal.signal(signal.SIGTERM, interrupted)
    save(path / 'receipt.json', {'run_id': path.name, 'status': 'running', 'accepted': False, 'codex_started': True})
    timed_out = False
    started = time.time()
    with (path / 'events.jsonl').open('w') as out, (path / 'stderr.log').open('w') as err, (path / 'prompt.md').open() as inp:
        # Own process group exists only to terminate this job and its children on timeout.
        process = subprocess.Popen(command, cwd=ROOT, env=env, stdin=inp, stdout=out, stderr=err, start_new_session=True)
        try:
            code = process.wait(timeout=timeout)
        except (subprocess.TimeoutExpired, KeyboardInterrupt):
            timed_out = True
            try:
                os.killpg(process.pid, signal.SIGTERM)
            except ProcessLookupError:
                pass
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                os.killpg(process.pid, signal.SIGKILL)
                process.wait()
            code = 124
    signal.signal(signal.SIGTERM, old_handler)
    save(path / 'exit.json', {'run_id': path.name, 'exit_code': code, 'timed_out': timed_out,
                             'started_at_unix': started, 'finished_at_unix': time.time()})
    return validate(path, source_state())


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=('prepare', 'run', 'inspect'))
    parser.add_argument('--run-id', help='Existing prepared run basename')
    parser.add_argument('--timeout', type=int, default=420)
    args = parser.parse_args()
    os.umask(0o077)
    try:
        if args.action == 'inspect':
            if not args.run_id:
                raise ValueError('inspect requires --run-id')
            result = validate(get_run(args.run_id), source_state())
        else:
            path = get_run(args.run_id) if args.run_id else prepare()
            if args.action == 'prepare':
                result = {'run_id': path.name, 'status': 'prepared', 'accepted': False,
                          'request_directory': str(path.relative_to(ROOT))}
            else:
                result = run(path, args.timeout)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0 if result['status'] in ('prepared', 'ready_for_review') else 2
    except (OSError, ValueError, subprocess.SubprocessError) as exc:
        print(json.dumps({'status': 'blocked', 'accepted': False, 'error_type': type(exc).__name__, 'detail': str(exc)}, ensure_ascii=False))
        return 2


if __name__ == '__main__':
    sys.exit(main())
