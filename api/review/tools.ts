import type {BusinessTool} from '../codex.js';
import type {LayoutReviewResult} from '../../packages/contracts/alva/layout-review.js';
import {loadCurrentUserContext, noArguments, validateContextToolArguments, type UserContextToolOptions} from '../user-context/tools.js';
import {ContextProjectionError} from '../user-context/errors.js';
import {isLayoutReviewCurrent, runLayoutReview} from './engine.js';

export type LayoutReviewToolOptions = UserContextToolOptions & {onReview?: (result: LayoutReviewResult) => Promise<void>};
export function createLayoutReviewTools(options: LayoutReviewToolOptions): BusinessTool[] {
  return [{name: 'run_layout_review', description: '根据最新布局和分类用户 Markdown 复核几何、通行、风格行为、原需求冲突及家具合理性。返回原因、定位、建议及输入版本。只生成审查，不自动修改家具、确认取舍或创建全局快照；专业未知不能被生活偏好关闭。',
    inputSchema: noArguments, run: async args => {
      validateContextToolArguments(args);
      const {project, context} = await loadCurrentUserContext(options);
      const review = runLayoutReview(project, context);
      if (options.onReview) await options.onReview(review);
      const latest = await loadCurrentUserContext(options);
      if (!isLayoutReviewCurrent(latest.project, latest.context, review)) throw new ContextProjectionError('REVIEW_STALE', '复核期间布局或需求已变化，当前结果不能作为保存依据。', true);
      return {review, persisted: !!options.onReview};
    }}];
}
