import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { Command, Id, type ProjectData } from '../../packages/contracts/index.js';
import { intakeDefinition, type IntakeAnswer } from '../../packages/contracts/intake.js';
import { allIntakeAnswers, buildDelivery } from './delivery.js';
import { Store, HttpError } from './store.js';

export type DesignerBoard = {
  project_id: string; project_name: string; project_version: number; brief_version: number; sharing: string;
  requirements: { id: string; room_id: string | null; room_name: string; label: string; value: string; state: string; source: string; evidence: { id: string; quote: string }[]; object_id?: string }[];
  budget: { target?: number; ceiling?: number; currency?: string; scope?: string; state: string };
  pending: { question_id: string; room_id: string | null; question: string; state: string; owner: string; next_action: string }[];
  suggestions: { id: string; room_id: string | null; object_id?: string; text: string; status: string; created_at: string }[];
};
function privacy(p: ProjectData) { return allIntakeAnswers(p).find(a => a.question_id === 'Q06' && a.source === 'owner' && a.confirmation_state === 'confirmed'); }
function visible(p: ProjectData, a: IntakeAnswer) {
  const policy = privacy(p)?.sharing ?? { mode: 'private' as const, question_ids: [], attachment_ids: [] };
  if (policy.mode === 'summary') return !['Q02','Q06','Q07','Q08','Q45','Q51','Q53'].includes(a.question_id) && a.confirmation_state === 'confirmed';
  return policy.mode === 'selected' && policy.question_ids.includes(a.question_id);
}
function evidenceFor(p: ProjectData, a: IntakeAnswer) { const evidence = a.evidence_ids.map(id => p.evidence.find(e => e.id === id)).filter(Boolean).map(e => ({ id: e!.id, quote: e!.quote })); return evidence.length ? evidence : [{ id: a.id, quote: a.answer_text }]; }
function objectFor(evidence: { quote: string }[]) { for (const e of evidence) { try { const value = JSON.parse(e.quote); if (typeof value.object_id === 'string') return value.object_id; } catch {} } return undefined; }
function roomName(p: ProjectData, id: string | null) { return id === null ? '全屋' : p.rooms.find(r => r.id === id)?.name ?? '空间'; }
export function buildDesignerBoard(p: ProjectData): DesignerBoard {
  const delivery = buildDelivery(p, 'designer'), all = allIntakeAnswers(p);
  const requirements = all.filter(a => visible(p, a)).map(a => { const evidence = evidenceFor(p, a), object_id = objectFor(evidence); return { id: a.id, room_id: a.room_id, room_name: roomName(p, a.room_id), label: intakeDefinition(a.question_id)?.question ?? a.question_id, value: a.answer_text, state: a.confirmation_state, source: a.source === 'owner' ? (a.confirmation_state === 'confirmed' ? '业主已确认' : '业主原话待核对') : '资料提取 · 待业主核对', evidence, ...(object_id ? { object_id } : {}) }; });
  const q19 = all.find(a => a.question_id === 'Q19' && visible(p, a)), budgetAnswer = q19?.budget, currency = all.find(a => a.question_id === 'Q20' && visible(p, a))?.answer_text, scope = all.find(a => a.question_id === 'Q21' && visible(p, a))?.answer_text;
  const budgetCurrency = budgetAnswer?.currency ?? currency;
  const budget = { ...(budgetAnswer?.target !== undefined ? { target: budgetAnswer.target } : {}), ...(budgetAnswer?.ceiling !== undefined ? { ceiling: budgetAnswer.ceiling } : {}), ...(budgetCurrency ? { currency: budgetCurrency } : {}), ...(scope ? { scope } : {}), state: budgetAnswer?.ceiling !== undefined ? '用户意向 · 非报价' : q19 ? '已填写但待核对' : '待补充' };
  return { project_id: p.id, project_name: p.name, project_version: p.version, brief_version: p.brief_version, sharing: delivery.sharing, requirements, budget, pending: delivery.pending, suggestions: (p.collaboration_suggestions ?? []).map(s => ({ id: s.id, room_id: s.room_id, ...(s.object_id ? { object_id: s.object_id } : {}), text: s.text, status: s.status, created_at: s.created_at })) };
}
export function sharedProject(p: ProjectData): ProjectData {
  const delivery = buildDelivery(p, 'designer'), allowedEvidence = new Set(delivery.evidence.map(e => e.id)), evidence = p.evidence.filter(e => allowedEvidence.has(e.id));
  const allowedAnswers = new Set(delivery.answers.map(a => a.id));
  return { ...p, name: '项目需求交接', intake_answers: (p.intake_answers ?? []).filter(a => allowedAnswers.has(a.id)), intake_questions: [], delivery_snapshots: [], requirements: p.requirements.filter(r => r.evidence_ids.some(id => allowedEvidence.has(id))), evidence, attachments: (p.attachments ?? []).filter(a => delivery.references.some(x => x.attachment_id === a.id)), messages: [], suggestions: p.suggestions.filter(s => s.evidence_ids.some(id => allowedEvidence.has(id))), reports: [], object_messages: [], collaboration_suggestions: p.collaboration_suggestions ?? [] };
}
export function registerCollaboration(app: FastifyInstance, store: Store) {
  app.post('/api/projects/:id/collaboration/invite', async req => { if ((req as any).role !== 'owner') throw new HttpError(403, '只有业主可以生成设计师入口'); return store.createDesignerInvite(Id.parse((req.params as any).id), String((req as any).owner)); });
  app.get('/api/projects/:id/designer-board', async req => buildDesignerBoard(await store.get(Id.parse((req.params as any).id), String((req as any).owner))));
  app.get('/api/projects/:id/collaboration/view', async req => { if ((req as any).role !== 'designer') throw new HttpError(403, '该入口仅供设计师使用'); const p = await store.get(Id.parse((req.params as any).id), String((req as any).owner)); return { project: sharedProject(p), board: buildDesignerBoard(p) }; });
  app.post('/api/projects/:id/collaboration/suggestions', async req => { if ((req as any).role !== 'designer') throw new HttpError(403, '只有设计师可以提交设计建议'); const id = Id.parse((req.params as any).id), b = Command.extend({ room_id: Id.nullable(), object_id: Id.optional(), text: z.string().trim().min(2).max(2000) }).strict().parse(req.body); return store.mutate(id, String((req as any).owner), b.request_id, b.expected_version, 'collaboration_suggestion_created', b, p => { const object = b.object_id && p.scene.floors.flatMap(f => f.furniture).find(o => o.id === b.object_id); if (b.object_id && (!object || object.room_id && object.room_id !== b.room_id)) throw new HttpError(400, '关联家具不存在或不属于该房间'); (p.collaboration_suggestions ??= []).push({ id: randomUUID(), author_id: String((req as any).member_id), author_role: 'designer', room_id: b.room_id, ...(b.object_id ? { object_id: b.object_id } : {}), text: b.text, status: 'proposed', base_version: p.version, created_at: new Date().toISOString() }); }, 'designer'); });
}
