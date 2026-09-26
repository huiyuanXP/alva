/** The database owns these facts. Markdown is a rebuildable, project-scoped projection. */
export type UserContextCategory = 'habits' | 'preferences' | 'requirements' | 'unresolved';
export type UserContextStatus = 'confirmed' | 'pending' | 'inferred' | 'rejected';
export type UserContextEntry = {
  id: string;
  category: UserContextCategory;
  text: string;
  quote: string;
  sourceMessageIds: string[];
  sourceEvidenceIds: string[];
  sourceQuestionIds: string[];
  roomIds: string[];
  objectIds: string[];
  status: UserContextStatus;
  updatedAt: string;
  supersedesId?: string;
};
export type UserContextFile = `${UserContextCategory}.md`;
export type UserContextMarkdownFile = UserContextFile | 'index.md';
export type UserContextProjection = {
  schemaVersion: 1;
  projectId: string;
  projectRevision: number;
  sourceFingerprint: string;
  entries: UserContextEntry[];
  limitations: string[];
};
export type UserContextManifest = {
  schemaVersion: 1;
  projectId: string;
  projectRevision: number;
  sourceFingerprint: string;
  generation: string;
  generatedAt: string;
  files: Record<UserContextFile, {sha256: string; bytes: number}>;
  /** index.md contains category hashes; only current.json contains the index's own hash. */
  indexSha256: string;
};
export type UserContextReadResult = {
  manifest: UserContextManifest;
  entries: UserContextEntry[];
  markdown: Record<UserContextMarkdownFile, string>;
};
