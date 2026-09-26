import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {Project} from '../model.js';
import type {UserContextCategory, UserContextEntry, UserContextProjection} from '../../packages/contracts/alva/user-context.js';
import {ContextProjectionError} from './errors.js';

export type UserContextProject = Project & {userContextEntries?: UserContextEntry[]};
export const categories: UserContextCategory[] = ['habits', 'preferences', 'requirements', 'unresolved'];
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value)
    .filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b, 'en'))
    .map(([key, v]) => JSON.stringify(key) + ':' + canonical(v)).join(',') + '}';
  return JSON.stringify(value) ?? 'null';
}
export const fingerprint = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex');
export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');
const ids = z.array(z.string().min(1).max(200)).max(200);
const entrySchema = z.object({
  id: z.string().min(1).max(200), category: z.enum(['habits', 'preferences', 'requirements', 'unresolved']),
  text: z.string().min(1).max(16000), quote: z.string().min(1).max(16000),
  sourceMessageIds: ids, sourceEvidenceIds: ids, sourceQuestionIds: ids, roomIds: ids, objectIds: ids,
  status: z.enum(['confirmed', 'pending', 'inferred', 'rejected']), updatedAt: z.string().datetime(),
  supersedesId: z.string().min(1).max(200).optional(),
}).strict();
const sorted = (values: string[]) => [...new Set(values)].sort();
const invalid = (message: string): never => { throw new ContextProjectionError('CONTEXT_SOURCE_INVALID', message); };

export function assertProjectIdentity(project: UserContextProject) {
  if (!z.string().uuid().safeParse(project.id).success || !Number.isSafeInteger(project.revision) || project.revision < 0) {
    invalid('用户信息必须绑定有效的服务端项目 ID 和 revision。');
  }
}

function normalizeEntry(raw: UserContextEntry, project: UserContextProject): UserContextEntry {
  const parsed = entrySchema.safeParse(raw);
  if (!parsed.success) invalid('用户信息字段、状态或时间格式无效。');
  const entry = parsed.data!;
  const evidence = entry.sourceEvidenceIds.map(id => project.evidence.find(e => e.id === id));
  const messages = entry.sourceMessageIds.map(id => project.messages.find(m => m.id === id && m.role === 'user'));
  if (evidence.some(e => !e) || messages.some(m => !m) || (!evidence.length && !messages.length)) {
    invalid('用户信息引用了缺失或非本项目的原话/证据，不能作为审查依据。');
  }
  if (![...evidence.map(e => e!.quote), ...messages.map(m => m!.text)].some(text => text.includes(entry.quote))) {
    invalid('用户信息的引文不在其引用的真实原话或证据中。');
  }
  if (entry.sourceQuestionIds.some(id => !project.answers.some(a => a.questionId === id))) {
    invalid('用户信息引用的问题没有本项目回答来源。');
  }
  const normalized: UserContextEntry = {...entry};
  for (const key of ['sourceMessageIds', 'sourceEvidenceIds', 'sourceQuestionIds', 'roomIds', 'objectIds'] as const) {
    normalized[key] = sorted(entry[key]);
  }
  return normalized;
}

/** Classification is explicit. Unclassified legacy text stays unclassified, not guessed. */
export function buildUserContextProjection(project: UserContextProject): UserContextProjection {
  assertProjectIdentity(project);
  if ((project.userContextEntries?.length || 0) > 3000) invalid('用户信息条目过多，请先合并重复条目。');
  if (new Set(project.evidence.map(e => e.id)).size !== project.evidence.length ||
      new Set(project.messages.map(m => m.id)).size !== project.messages.length) invalid('项目原话/证据 ID 重复。');
  const explicit = (project.userContextEntries || []).map(e => normalizeEntry(e, project));
  if (new Set(explicit.map(e => e.id)).size !== explicit.length) invalid('用户信息条目 ID 重复。');
  if (explicit.some(e => /^(evidence:|finding:)/.test(e.id))) invalid('用户信息 ID 使用了投影保留前缀。');
  const entries: UserContextEntry[] = [];
  const handled = new Set<string>();
  const explicitlyRepresented = new Set(explicit.flatMap(entry => entry.sourceEvidenceIds));
  const activeAnswers = new Map(project.answers.map(a => [a.evidenceId, a]));

  // Explicit server-confirmed classifications take precedence over automatic legacy rows.
  for (const original of explicit) {
    const entry = structuredClone(original);
    const replacedQuestionnaire = entry.sourceEvidenceIds.some(id => {
      const evidence = project.evidence.find(e => e.id === id)!;
      return evidence.source === 'questionnaire' && !activeAnswers.has(id);
    });
    const replacedAnswer = entry.sourceQuestionIds.some(questionId => {
      const answers = project.answers.filter(a => a.questionId === questionId &&
        (a.roomId === null ? !entry.roomIds.length : entry.roomIds.includes(a.roomId)));
      return answers.length > 0 && !answers.some(a => entry.sourceEvidenceIds.includes(a.evidenceId));
    });
    if (replacedQuestionnaire || replacedAnswer) entry.status = 'rejected';
    if (entry.status === 'rejected') entry.category = 'unresolved';
    entries.push(entry);
    if (entry.status === 'confirmed' || entry.status === 'rejected') {
      for (const id of entry.sourceEvidenceIds) handled.add(id);
    }
  }

  for (const answer of project.answers) {
    const evidence = project.evidence.find(e => e.id === answer.evidenceId);
    if (!evidence) invalid('当前回答的原话证据缺失，不能生成用户信息。');
    if (handled.has(evidence!.id)) continue;
    entries.push({id: `evidence:${evidence!.id}`, category: 'unresolved', text: answer.text || evidence!.quote,
      quote: evidence!.quote, sourceMessageIds: [], sourceEvidenceIds: [evidence!.id], sourceQuestionIds: [answer.questionId],
      roomIds: answer.roomId ? [answer.roomId] : [], objectIds: [],
      status: answer.confirmed && answer.state === 'answered' ? 'confirmed' : 'pending', updatedAt: evidence!.createdAt});
    handled.add(evidence!.id);
  }

  // ALVA-041 writes these records only on explicit preference confirmation. An image by itself is not proof.
  for (const finding of project.findings.filter(f => f.stage === 'intake')) {
    const sources = finding.evidenceIds.map(id => project.evidence.find(e => e.id === id));
    if (sources.some(e => !e)) invalid('当前需求分析引用了不存在的证据。');
    if (!sources.length) continue; // Unsourced professional observations are not personal facts.
    const confirmedReference = finding.kind === 'requirement' && finding.title.startsWith('参考图偏好：') &&
      sources.every(e => e!.source === 'image') && project.changes.some(change =>
        change.description.startsWith('确认参考图偏好 ') && finding.evidenceIds.every(id => change.evidenceIds.includes(id)));
    if (confirmedReference) {
      for (const source of sources) {
        if (handled.has(source!.id)) continue;
        entries.push({id: `evidence:${source!.id}`, category: 'preferences', text: finding.title, quote: source!.quote,
          sourceMessageIds: [], sourceEvidenceIds: [source!.id], sourceQuestionIds: [], roomIds: sorted(finding.roomIds),
          objectIds: [], status: 'confirmed', updatedAt: source!.createdAt});
        handled.add(source!.id);
      }
    } else {
      entries.push({id: `finding:${finding.id}`, category: 'unresolved', text: `${finding.title}：${finding.reason}`,
        quote: sources[0]!.quote, sourceMessageIds: [], sourceEvidenceIds: sorted(finding.evidenceIds), sourceQuestionIds: [],
        roomIds: sorted(finding.roomIds), objectIds: sorted(finding.objectIds), status: 'inferred', updatedAt: sources[0]!.createdAt});
    }
  }
  for (const evidence of project.evidence) {
    if (handled.has(evidence.id) || explicitlyRepresented.has(evidence.id)) continue;
    entries.push({id: `evidence:${evidence.id}`, category: 'unresolved', text: evidence.quote, quote: evidence.quote,
      sourceMessageIds: [], sourceEvidenceIds: [evidence.id], sourceQuestionIds: [], roomIds: evidence.roomId ? [evidence.roomId] : [],
      objectIds: [], status: evidence.source === 'questionnaire' ? 'rejected' : 'pending', updatedAt: evidence.createdAt});
  }
  const byId = new Map(entries.map(e => [e.id, e]));
  const replacements = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.supersedesId) continue;
    if (!byId.has(entry.supersedesId) || entry.supersedesId === entry.id) invalid('用户信息更正关系缺少被更正的条目。');
    if (!['confirmed', 'rejected'].includes(entry.status)) continue; // A proposed correction cannot erase a confirmed fact.
    if (replacements.has(entry.supersedesId)) invalid('同一用户信息存在多个生效更正，请先确认哪一条有效。');
    replacements.set(entry.supersedesId, entry.id);
  }
  for (const id of replacements.keys()) {
    const visited = new Set<string>(); let current: string | undefined = id;
    while (current && replacements.has(current)) {
      if (visited.has(current)) invalid('用户信息更正关系存在循环。');
      visited.add(current); current = replacements.get(current);
    }
    byId.get(id)!.status = 'rejected'; byId.get(id)!.category = 'unresolved';
  }
  const normalized = entries.map(e => normalizeEntry(e, project)).sort((a, b) => a.id.localeCompare(b.id, 'en'));
  if (new Set(normalized.map(e => e.id)).size !== normalized.length) invalid('投影条目 ID 冲突。');
  const limitations = [
    '未分类的历史已确认回答保留在 unresolved，不推断健康、身份、家庭成员或专业性能。',
    'pending/inferred/rejected 不是已确认事实；有来源的分析结论仍是 inferred，不因用户取舍升级为事实。',
    'review 阶段结果不反向进入用户信息，避免审查输出污染下次审查输入。',
    '未显式分类的聊天原话只进入未决项；主 Chat 必须通过确认/更正入口维护 userContextEntries。',
  ];
  return {schemaVersion: 1, projectId: project.id, projectRevision: project.revision,
    sourceFingerprint: fingerprint({entries: normalized, limitations}), entries: normalized, limitations};
}
