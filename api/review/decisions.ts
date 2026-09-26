import {z} from 'zod';
import type {Project} from '../model.js';
import type {UserContextReadResult} from '../../packages/contracts/alva/user-context.js';
import type {LayoutReviewResult, LayoutReviewAdoption} from '../../packages/contracts/alva/layout-review.js';
import {ContextProjectionError} from '../user-context/index.js';
import {isLayoutReviewCurrent} from './engine.js';

const decisionSchema = z.object({reviewId: z.string(), findingId: z.string(), decision: z.enum(['accept_tradeoff', 'defer']),
  note: z.string().trim().min(1).max(2000), confirmed: z.literal(true)}).strict();

/** Caller authenticates owner and persists atomically with expectedRevision; this is pure. */
export function recordLayoutReviewDecision(project: Project, context: UserContextReadResult, review: LayoutReviewResult, input: unknown): LayoutReviewResult {
  if (!isLayoutReviewCurrent(project, context, review)) throw new ContextProjectionError('REVIEW_STALE', '布局或需求已变化，请重新审查后再确认取舍。', true);
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success || parsed.data.reviewId !== review.id) throw new ContextProjectionError('REVIEW_DECISION_INVALID', '请明确确认当前审查中的一项，并填写取舍理由。');
  const {reviewId: _reviewId, ...decision} = parsed.data;
  const finding = review.findings.find(f => f.id === decision.findingId);
  if (!finding) throw new ContextProjectionError('REVIEW_DECISION_INVALID', '该提示不属于当前审查。');
  if (finding.kind === 'professional' && decision.decision === 'accept_tradeoff') throw new ContextProjectionError('REVIEW_DECISION_INVALID', '生活偏好确认不能关闭专业待核实项。');
  const updated = structuredClone(review);
  updated.decisions = [...updated.decisions.filter(d => d.findingId !== decision.findingId), decision].sort((a, b) => a.findingId.localeCompare(b.findingId, 'en'));
  updated.findings.find(f => f.id === decision.findingId)!.status = decision.decision === 'accept_tradeoff' ? 'acknowledged' : 'pending';
  return updated;
}

/** Records exactly which review and choices are adopted; never runs review or creates a snapshot. */
export function prepareLayoutReviewForSave(project: Project, context: UserContextReadResult, review: LayoutReviewResult): LayoutReviewAdoption {
  if (!isLayoutReviewCurrent(project, context, review)) throw new ContextProjectionError('REVIEW_STALE', '保存前的审查已过期，请先对当前布局重新复核。', true);
  // Validate persisted decisions too; a forged acknowledged flag is never sufficient.
  let verified: LayoutReviewResult = {...structuredClone(review), decisions: [], findings: review.findings.map(f => ({...f, status: 'pending'}))};
  if (new Set(review.decisions.map(d => d.findingId)).size !== review.decisions.length) throw new ContextProjectionError('REVIEW_DECISION_INVALID', '审查取舍记录重复，请重新确认。');
  for (const decision of review.decisions) verified = recordLayoutReviewDecision(project, context, verified, {reviewId: review.id, ...decision});
  return {reviewId: review.id, reviewedRevision: review.projectRevision, adoptedAtRevision: project.revision,
    sceneFingerprint: review.sceneFingerprint, contextFingerprint: review.contextFingerprint, decisions: structuredClone(verified.decisions),
    pendingFindingIds: verified.findings.filter(f => f.status === 'pending').map(f => f.id),
    professionalUnknownIds: verified.findings.filter(f => f.kind === 'professional').map(f => f.id)};
}
