import type {BusinessTool} from '../codex.js';
import type {AlvaStore,Session} from '../store.js';
import {z} from 'zod';
import {ProjectNavigation,listProjects,prepareNavigation} from './service.js';
export function projectTools(store:AlvaStore,session:Session,view:BusinessTool):BusinessTool[]{return [
 {name:'list_projects',description:'列出业主已授权项目的名称、ID与阶段，用于新建或切换项目。只读，不读取其他项目设计内容。',inputSchema:{type:'object',properties:{},additionalProperties:false},run:async()=>({projects:await listProjects(store,session),currentProjectId:session.projectId})},
 {name:'request_project_navigation',description:'打开新建/切换项目确认面板。create 提供项目名称；switch 先list_projects取目标ID。等待真实页面回执，只表示面板打开；用户点击后才新建或切换。旧项目保留，不能宣称已创建或已切换。',inputSchema:z.toJSONSchema(ProjectNavigation),run:async args=>{const navigation=await prepareNavigation(store,session,args);const receipt=await view.run({kind:'project_manager',navigation});return {status:'awaiting_user_confirmation',navigation,receipt}}},
]}
