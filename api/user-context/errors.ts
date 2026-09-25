export type ContextErrorCode = 'CONTEXT_MISSING' | 'CONTEXT_STALE' | 'CONTEXT_CORRUPT' |
  'CONTEXT_SOURCE_INVALID' | 'CONTEXT_IO_FAILED' | 'CONTEXT_BUSY' |
  'REVIEW_REQUIRED' | 'REVIEW_SCENE_REQUIRED' | 'REVIEW_SCENE_INVALID' | 'REVIEW_STALE' | 'REVIEW_DECISION_INVALID';

/** ALVA-066 can pass detail to its MCP error envelope without exposing filesystem paths. */
export class ContextProjectionError extends Error {
  readonly name = 'ContextProjectionError';
  readonly statusCode: number;
  readonly detail: {
    code: ContextErrorCode; message: string; retryable: boolean;
    repairActions: {action: string; message: string}[]; confirmationRequired?: boolean;
  };
  constructor(readonly code: ContextErrorCode, message: string, readonly retryable = false) {
    super(message);
    this.statusCode = code === 'CONTEXT_MISSING' ? 404 :
      ['CONTEXT_STALE', 'CONTEXT_BUSY', 'REVIEW_STALE'].includes(code) ? 409 :
      code === 'CONTEXT_IO_FAILED' ? 503 : 422;
    const action = code.startsWith('REVIEW_') ? 'rerun_layout_review' :
      code === 'CONTEXT_SOURCE_INVALID' ? 'correct_user_context_sources' : 'rebuild_user_context';
    this.detail = {code, message, retryable, repairActions: [{action, message:
      action === 'rerun_layout_review' ? '重读当前项目并运行布局复核，再由用户确认取舍。' :
      action === 'correct_user_context_sources' ? '核对本项目原话、证据和更正关系，再重新确认信息。' :
      '从当前项目的已持久化数据重建用户信息；仍失败时修复存储后重试。'}]};
  }
  get repairActions() { return this.detail.repairActions; }
}
