import type {Project} from '../model.js';

// These legacy questions were explicitly removed from snapshot/delivery scope.
// Do not change the working questionnaire or rewrite previously saved versions.
const budgetQuestions = new Set(['Q19', 'Q20', 'Q21', 'Q22', 'Q60']);

function projectValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.filter(item => !isBudgetAnswer(item)).map(projectValue);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'budget').map(
      ([key, item]) => [key, projectValue(item)],
    ));
  }
  return value;
}

function isBudgetAnswer(value: unknown): boolean {
  return !!value && typeof value === 'object' && 'questionId' in value &&
    budgetQuestions.has(String(value.questionId));
}

/** A complete point-in-time projection; no review or other business side effects. */
export function snapshotProject(project: Project): Project {
  const snapshot = projectValue(project) as Project;
  const excludedEvidence = new Set(project.answers.filter(isBudgetAnswer).map(answer => answer.evidenceId));
  const retainedEvidence = new Set(snapshot.answers.map(answer => answer.evidenceId));
  snapshot.evidence = snapshot.evidence.filter(e => !excludedEvidence.has(e.id) || retainedEvidence.has(e.id));
  const keptEvidence = new Set(snapshot.evidence.map(e => e.id));
  const removedEvidence = new Set(project.evidence.filter(e => !keptEvidence.has(e.id)).map(e => e.id));
  snapshot.lastAnalysisEvidence = project.lastAnalysisEvidence - project.evidence.slice(0, project.lastAnalysisEvidence).filter(e => removedEvidence.has(e.id)).length;
  for (const record of [...snapshot.findings, ...snapshot.proposals, ...snapshot.changes]) {
    record.evidenceIds = record.evidenceIds.filter(id => !removedEvidence.has(id));
  }
  if (snapshot.intakeProgress?.cursor && isBudgetAnswer(snapshot.intakeProgress.cursor)) snapshot.intakeProgress.cursor = null;
  return snapshot;
}
