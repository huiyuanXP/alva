import {readFileSync, readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

const field = (raw: string, name: string) => raw.match(new RegExp(`^\\*\\*${name}:\\*\\*[ \\t]*([^\\n]*)`, 'm'))?.[1].trim() || '';

/** Reads the integrated tracker. No database, copied status or write endpoints. */
export function boardPayload(root = process.cwd()) {
  const source = '.scratch/alva-completion';
  const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
  const plan = read('NextTask.md');
  const claims = new Map<string, {owner: string; worktree: string; coordination: string}>();
  for (const line of plan.split('\n')) {
    const cells = line.split('|').slice(1, -1).map(c => c.trim());
    const id = cells[0]?.match(/^\[(ALVA-\d+)\]\(/)?.[1];
    if (id && cells.length === 6) claims.set(id, {owner: cells[3], worktree: cells[4], coordination: cells[5]});
  }
  const tickets = readdirSync(resolve(root, source, 'issues')).filter(f => /^\d{2}-.+\.md$/.test(f)).sort().map(file => {
    const raw = read(`${source}/issues/${file}`);
    const id = field(raw, 'ID');
    const status = field(raw, 'Status');
    if (!/^ALVA-\d{3,}$/.test(id)) throw Error(`Invalid Ticket ID: ${file}`);
    if (!['ready-for-agent', 'in-progress', 'blocked', 'done'].includes(status)) throw Error(`Invalid Ticket status: ${id}`);
    const checks = [...raw.matchAll(/^- \[([ xX])\]/gm)].map(m => m[1]);
    const claim = claims.get(id);
    return {id, localId: file.slice(0, 2), file, title: raw.split('\n')[0].replace(/^#\s*\d+[:：]\s*/, ''), raw,
      summary: field(raw, 'What to build'), status, phase: field(raw, 'Parallel lane').match(/`([^`]+)`/)?.[1] || '',
      owner: claim?.owner || '', worktree: claim?.worktree || '', coordination: claim?.coordination || '',
      checks: checks.length, checked: checks.filter(c => c.toLowerCase() === 'x').length,
      deps: [] as string[], waiting: [] as string[], column: ''};
  });
  if (!tickets.length) throw Error('Ticket source is empty');
  const byId = new Map(tickets.map(t => [t.id, t]));
  const byLocal = new Map(tickets.map(t => [t.localId, t.id]));
  if (byId.size !== tickets.length || byLocal.size !== tickets.length) throw Error('Duplicate Ticket ID');
  for (const ticket of tickets) {
    const dependency = field(ticket.raw, 'Blocked by');
    if (/^None\b/.test(dependency)) continue;
    const ids = [...dependency.matchAll(/ALVA-\d+/g)].map(m => m[0]);
    const local = dependency.match(/^(\d{2})[：:]/)?.[1];
    ticket.deps = [...new Set(ids.length ? ids : local ? [byLocal.get(local) || local] : [])];
    if (!ticket.deps.length || ticket.deps.some(d => !byId.has(d))) throw Error(`Unresolved dependency: ${ticket.id}`);
  }
  const visited = new Set<string>(), stack = new Set<string>();
  function visit(id: string) {
    if (stack.has(id)) throw Error(`Dependency cycle: ${id}`);
    if (visited.has(id)) return;
    stack.add(id); byId.get(id)!.deps.forEach(visit); stack.delete(id); visited.add(id);
  }
  tickets.forEach(t => visit(t.id));
  for (const ticket of tickets) {
    ticket.waiting = ticket.deps.filter(d => byId.get(d)!.status !== 'done');
    ticket.column = ticket.status === 'done' ? 'done' : ticket.waiting.length || ticket.status === 'blocked' ? 'blocked' : ticket.status === 'in-progress' || ticket.owner ? 'progress' : 'ready';
  }
  const data = {source, spec: read('SPEC.md'), plan, index: read(`${source}/README.md`), tickets};
  return {...data, updated: new Date().toISOString(), revision: createHash('sha256').update(JSON.stringify(data)).digest('hex').slice(0, 12)};
}
