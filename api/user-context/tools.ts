import {z} from 'zod';
import type {BusinessTool} from '../codex.js';
import {readUserContextProjection, writeUserContextProjection, assertUserContextCurrent, type UserContextOptions} from './files.js';
import {ContextProjectionError} from './errors.js';
import type {UserContextProject} from './projection.js';

export type UserContextToolOptions = UserContextOptions & {getProject: () => Promise<UserContextProject>};
const emptyArguments = z.object({}).strict();
export function validateContextToolArguments(args: unknown) { emptyArguments.parse(args); }
export const noArguments = {type: 'object', properties: {}, additionalProperties: false};

/** One repair from authoritative data, followed by a fresh read. No infinite retries. */
export async function loadCurrentUserContext(options: UserContextToolOptions) {
  const project = await options.getProject();
  let context;
  try { context = await readUserContextProjection(project, options); }
  catch (error) {
    if (!(error instanceof ContextProjectionError) || !['CONTEXT_MISSING', 'CONTEXT_STALE', 'CONTEXT_CORRUPT'].includes(error.code)) throw error;
    context = await writeUserContextProjection(project, options);
  }
  const latest = await options.getProject();
  assertUserContextCurrent(latest, context);
  return {project: latest, context};
}

/** ALVA-066 owns authorization and packs.living registration; this creates no server. */
export function createUserContextTools(options: UserContextToolOptions): BusinessTool[] {
  return [{name: 'read_user_context', description: '读取当前授权项目分类后的用户习惯、偏好、需求与未决项 Markdown。逐条保留原话、来源及确认状态；pending/inferred/rejected 不得作为确认事实。缺失或过期时仅尝试从当前项目重建一次，失败必须据实提示。',
    inputSchema: noArguments, run: async args => {
      validateContextToolArguments(args);
      const {context} = await loadCurrentUserContext(options);
      return context;
    }}];
}
