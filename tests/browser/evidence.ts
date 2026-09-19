import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { basename, isAbsolute, relative, resolve, sep } from 'node:path';

/** Keep delegated reruns separate from the already accepted Week 1 evidence. */
export function evidencePath(name: string): string {
  if (!name || basename(name) !== name || name === '.' || name === '..') {
    throw new Error('Evidence filename must be a basename');
  }
  const root = realpathSync(resolve('.'));
  const override = process.env.RENOVATION_ACCEPTANCE_DIR;
  const directory = resolve(root, override || 'docs/evidence/week1');
  const allowed = resolve(root, '.runtime/codex-runs');
  const inside = (parent: string, child: string) => {
    const rel = relative(parent, child);
    return rel !== '' && !isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`);
  };
  if (override) {
    if (!inside(allowed, directory)) throw new Error('Delegated evidence must be under .runtime/codex-runs/<run>/');
    // Check existing ancestors before creating directories; never follow an escaping symlink.
    let current = root;
    for (const part of relative(root, directory).split(sep)) {
      current = resolve(current, part);
      if (existsSync(current) && realpathSync(current) !== current) {
        throw new Error('Symlinked evidence directories are not allowed');
      }
    }
  }
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const target = resolve(directory, name);
  if (existsSync(target) && realpathSync(target) !== target) throw new Error('Symlinked evidence files are not allowed');
  return target;
}
