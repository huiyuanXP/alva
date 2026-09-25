/** Metadata for a manual save, not a recoverable per-operation history. */
export type SaveCommand = {
  requestId: string;
  expectedRevision: number;
  confirmed: true;
};

export type SaveReceipt = {
  requestId: string;
  version: number;
  revision: number;
  createdAt: string;
};
