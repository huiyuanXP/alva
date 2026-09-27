#!/usr/bin/env python3
"""Development artifacts only: 24h GC and consume-once visual inspection."""
import argparse
import base64
import fcntl
import json
import os
from pathlib import Path
import re
import subprocess
import time

TTL = 86400
PROTECTED = re.compile(r'production|release|backup|deploy|live', re.I)


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def tracked(root):
    return {root / os.fsdecode(p) for p in git(root, 'ls-files', '-z').split(b'\0') if p}


def roots(root, all_worktrees=False):
    if not all_worktrees:
        return [root]
    return [Path(line[9:]) for line in git(root, 'worktree', 'list', '--porcelain').decode().splitlines()
            if line.startswith('worktree ')]


def files(root):
    if root.is_symlink():
        return
    for parent, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = [d for d in dirs if not (Path(parent)/d).is_symlink() and d not in ('node_modules', '.git', 'worktrees')]
        for name in names:
            p = Path(parent)/name
            if not p.is_symlink() and p.is_file():
                yield p


def candidates(root):
    # Evidence has always been development output. Production release backups are elsewhere.
    for name in ('evidence', '.runtime/acceptance', '.runtime/visual'):
        base = root/name
        if base.is_symlink() or not base.is_dir():
            continue
        for p in base.iterdir():
            if not p.is_symlink():
                yield p
    # Legacy isolated acceptance runs: deliberately exclude every release/deploy/backup name.
    runtime = root/'.runtime'
    if runtime.is_dir() and not runtime.is_symlink():
        for p in runtime.iterdir():
            if p.is_dir() and not p.is_symlink() and re.match(r'^(?:\d{8}T|\d{4}-\d{2}-\d{2}T).*ALVA', p.name, re.I) and not PROTECTED.search(p.name):
                yield p


def active_paths():
    result = set()
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        try:
            result.add((proc/'cwd').resolve(strict=True))
            for arg in (proc/'cmdline').read_bytes().split(b'\0'):
                value = os.fsdecode(arg)
                if value.startswith('/'):
                    result.add(Path(value))
            for item in (proc/'environ').read_bytes().split(b'\0'):
                if b'=' in item:
                    value = os.fsdecode(item.split(b'=', 1)[1])
                    if value.startswith('/'):
                        result.add(Path(value))
            for fd in (proc/'fd').iterdir():
                try:
                    result.add(fd.resolve(strict=True))
                except OSError:
                    pass
        except (OSError, PermissionError):
            pass
    return result


def collect(root, apply=False, all_worktrees=False, now=None, active=None):
    now = now or time.time()
    active = active_paths() if active is None else active
    report = dict(mode='apply' if apply else 'preview', files=0, bytes=0, trackedSkipped=0, activeSkipped=0, runs=[])
    for workspace in roots(root, all_worktrees):
        keep = tracked(workspace)
        for candidate in candidates(workspace):
            if any(p == candidate or candidate in p.parents for p in active):
                report['activeSkipped'] += 1
                continue
            paths = list(files(candidate)) if candidate.is_dir() else [candidate]
            if not paths:
                continue
            # Run age is the newest artifact, so an active/recent run is never partially expired.
            if max(p.stat().st_mtime for p in paths) > now - TTL:
                continue
            deletable = [p for p in paths if p not in keep and p.name != '.active']
            report['trackedSkipped'] += sum(p in keep for p in paths)
            lock = candidate/'.active' if candidate.is_dir() else None
            handle = None
            try:
                if lock and lock.exists():
                    if lock.is_symlink():
                        continue
                    handle = lock.open('r')
                    try:
                        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
                    except BlockingIOError:
                        report['activeSkipped'] += 1
                        continue
                count = size = 0
                for p in deletable:
                    if p.is_symlink() or not p.is_file() or p.stat().st_mtime > now-TTL:
                        continue
                    size += p.stat().st_size
                    count += 1
                    if apply:
                        p.unlink()
                if count:
                    report['files'] += count
                    report['bytes'] += size
                    report['runs'].append(dict(path=str(candidate), files=count, bytes=size))
                if apply and candidate.is_dir():
                    for parent, _, _ in os.walk(candidate, topdown=False):
                        try:
                            Path(parent).rmdir()
                        except OSError:
                            pass
            finally:
                if handle:
                    handle.close()
    return report


def consume(root, path):
    path = Path(os.path.abspath(path))
    allowed = [root/'evidence', root/'.runtime/visual', root/'.runtime/acceptance']
    if not any(base in path.parents for base in allowed) or path.suffix.lower() != '.png':
        raise ValueError('Only development PNG screenshots can be consumed')
    if path.resolve() != path or path in tracked(root):
        raise ValueError('Symlink or Git-tracked image: migrate to disposable output first')
    data = path.read_bytes()
    if not data.startswith(b'\x89PNG\r\n\x1a\n'):
        raise ValueError('Invalid PNG')
    # The tool receives image bytes before deletion; no persisted screenshot is needed afterward.
    result = {'image_url': 'data:image/png;base64,' + base64.b64encode(data).decode()}
    path.unlink()
    return result


def run(root, run_id, command):
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_.-]*', run_id) or not command:
        raise ValueError('Run ID and command required')
    base = root/'.runtime/acceptance'/run_id
    base.mkdir(parents=True, exist_ok=False)
    with (base/'.active').open('w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        env = dict(os.environ, ALVA_ACCEPTANCE_DIR=str(base))
        code = subprocess.call(command, env=env, cwd=root)
        (base/'finished.json').write_text(json.dumps({'exitCode': code, 'finishedAt': time.time()}))
    (base/'.active').unlink()
    return code


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=Path.cwd())
    sub = parser.add_subparsers(dest='action', required=True)
    gc = sub.add_parser('gc')
    gc.add_argument('--apply', action='store_true')
    gc.add_argument('--all-worktrees', action='store_true')
    view = sub.add_parser('consume')
    view.add_argument('path', type=Path)
    discard = sub.add_parser('discard')
    discard.add_argument('path', type=Path)
    runner = sub.add_parser('run')
    runner.add_argument('run_id')
    runner.add_argument('command', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    root = args.root.resolve()
    if args.action == 'gc':
        print(json.dumps(collect(root, args.apply, args.all_worktrees), ensure_ascii=False))
    elif args.action == 'consume':
        print(json.dumps(consume(root, args.path)))
    elif args.action == 'discard':
        consume(root, args.path)
        print(json.dumps({'deleted': str(args.path)}))
    else:
        raise SystemExit(run(root, args.run_id, args.command))


if __name__ == '__main__':
    main()
