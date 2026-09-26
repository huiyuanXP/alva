import type {Project} from '../model.js';
import {validateBuildingScene} from '../building/types.js';

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


/** Prepare a saved snapshot as the new working draft without mutating the saved copy.
 *  Current revision/version counters are retained; incompatible legacy building results are expired instead of reused. */
export function prepareSnapshotRestore(snapshot: Project, currentRevision: number, currentSavedVersion: number): Project {
  const restored = structuredClone(snapshot);
  restored.revision = currentRevision;
  restored.savedVersion = currentSavedVersion;
  restored.dirty = true;
  const topology = restored.confirmedTopology;
  if (!topology) {
    restored.buildingCandidate = undefined;
    restored.confirmedBuilding = undefined;
    if (restored.buildingState.status !== 'idle') restored.buildingState = {status: 'expired', attempts: restored.buildingState.attempts || 0, updatedAt: new Date().toISOString(), error: '恢复的快照没有已确认拓扑，建筑结果已作废'};
    return restored;
  }
  let buildingValid = true;
  for (const building of [restored.buildingCandidate, restored.confirmedBuilding]) {
    if (!building) continue;
    try { validateBuildingScene(building, topology.scene, topology.version, topology.sourceFingerprint); }
    catch { buildingValid = false; break; }
  }
  const stateMatches = !restored.buildingState.topologyFingerprint || restored.buildingState.topologyFingerprint === topology.sourceFingerprint;
  if (!buildingValid || !stateMatches) {
    restored.buildingCandidate = undefined;
    restored.confirmedBuilding = undefined;
    restored.buildingState = {status: 'expired', topologyVersion: topology.version, topologyFingerprint: topology.sourceFingerprint, attempts: restored.buildingState.attempts || 0, updatedAt: new Date().toISOString(), error: '快照中的建筑结果与保存时拓扑不一致，已作废；请重新生成建筑3D'};
  }
  return restored;
}
