export type LayoutReviewKind = 'geometry' | 'navigation' | 'behavior' | 'requirement' | 'furniture';
export type LayoutReviewFinding = {
  id: string;
  ruleId: string;
  kind: LayoutReviewKind | 'professional';
  title: string;
  reason: string;
  suggestion: string;
  roomIds: string[];
  objectIds: string[];
  evidenceIds: string[];
  contextEntryIds: string[];
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'acknowledged';
  path?: {openingIds: string[]; points: {x: number; y: number}[]; clearanceMetres: number};
};
export type LayoutReviewDecision = {
  findingId: string;
  decision: 'accept_tradeoff' | 'defer';
  note: string;
  confirmed: true;
};
export type LayoutReviewResult = {
  schemaVersion: 1;
  algorithmVersion: 'alva-layout-review-v1';
  id: string;
  projectId: string;
  /** Revision actually reviewed, not the revision of a later acknowledgement/save. */
  projectRevision: number;
  sceneFingerprint: string;
  contextFingerprint: string;
  findings: LayoutReviewFinding[];
  checks: Record<LayoutReviewKind, {status: 'checked' | 'needs_information'; findingIds: string[]; method: string}>;
  decisions: LayoutReviewDecision[];
  assumptions: {passageWidthMetres: number; navigationGridMetres: number; maximumRoomCells: number};
  limitations: string[];
};
export type LayoutReviewAdoption = {
  reviewId: string;
  reviewedRevision: number;
  adoptedAtRevision: number;
  sceneFingerprint: string;
  contextFingerprint: string;
  decisions: LayoutReviewDecision[];
  pendingFindingIds: string[];
  professionalUnknownIds: string[];
};
