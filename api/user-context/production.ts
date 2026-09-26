import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import type {BusinessTool} from '../codex.js';
import {DomainError,type Project} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {buildUserContextProjection,writeUserContextProjection} from './index.js';
import {mcpFailure,McpError} from '../mcp/contracts.js';

/** Runs after the database commit. Projection failure never rolls back a confirmed answer. */
export function registerContextProjection(app:FastifyInstance,store:AlvaStore){
 const unsubscribe=store.onProjectCommitted(async p=>{
  try{await writeUserContextProjection(p)}catch(error){p.contextProjectionWarning=mcpFailure(error).structuredContent.error as Project['contextProjectionWarning']}
 });app.addHook('onClose',async()=>unsubscribe());
}
const Candidate=z.object({expectedRevision:z.number().int().min(0),category:z.enum(['habits','preferences','requirements','unresolved']),text:z.string().trim().min(1).max(3000),quote:z.string().min(1).max(3000),sourceEvidenceId:z.string().min(1),roomIds:z.array(z.string()).max(30).default([]).describe('仅填写快照scene.rooms中的房间ID；全屋信息使用空数组'),objectIds:z.array(z.string()).max(100).default([]).describe('仅填写快照scene.items中的家具实例ID；不能填房间ID，没有特定家具时必须为空数组'),supersedesId:z.string().optional()}).strict();
export function userContextProductionTools(store:AlvaStore,projectId:string,onProject:(p:Project)=>void):BusinessTool[]{return [{name:'propose_user_context',description:'依据本项目真实原话证据，把习惯、偏好、明确需求或未决项分类为待确认候选。sourceEvidenceId与quote必须匹配；模型不能确认条目。更正旧条目使用supersedesId，用户确认前旧依据仍有效。',inputSchema:z.toJSONSchema(Candidate),run:async args=>{
 const b=Candidate.parse(args);let entryId='';
 const p=await store.mutate(projectId,randomUUID(),b.expectedRevision,'propose-user-context',b,p=>{
  const source=p.evidence.find(e=>e.id===b.sourceEvidenceId);if(!source||!source.quote.includes(b.quote))throw new DomainError(422,'分类必须引用本项目真实原话中的内容');
  const invalidRooms=b.roomIds.filter(id=>!p.scene?.rooms.some(r=>r.id===id)),invalidObjects=b.objectIds.filter(id=>!p.scene?.items.some(i=>i.id===id));
  if(invalidRooms.length||invalidObjects.length)throw new McpError({code:'CONTEXT_SCOPE_INVALID',message:`分类范围无效：房间ID ${invalidRooms.join('、')||'无'}；家具实例ID ${invalidObjects.join('、')||'无'}。房间ID不能填入objectIds。`,retryable:true,repairActions:[{action:'correct_context_scope',message:`重读快照并修正候选范围。roomIds可用：${p.scene?.rooms.map(r=>r.id).join('、')||'无'}；objectIds仅限：${p.scene?.items.map(i=>i.id).join('、')||'无'}。没有提及特定家具时objectIds填[]；仅修正候选参数无需额外确认，采用仍由用户点击确认。`}]});
  if(b.supersedesId&&!p.userContextEntries?.some(e=>e.id===b.supersedesId))throw new DomainError(422,'被更正条目不存在');
  const existing=p.userContextEntries?.find(e=>e.status==='pending'&&e.category===b.category&&e.text===b.text&&e.sourceEvidenceIds.includes(source.id));if(existing){entryId=existing.id;return}
  entryId=randomUUID();p.userContextEntries=[...(p.userContextEntries||[]),{id:entryId,category:b.category,text:b.text,quote:b.quote,sourceEvidenceIds:[source.id],sourceMessageIds:[],sourceQuestionIds:p.answers.filter(a=>a.evidenceId===source.id).map(a=>a.questionId),roomIds:b.roomIds,objectIds:b.objectIds,status:'pending',updatedAt:new Date().toISOString(),...(b.supersedesId?{supersedesId:b.supersedesId}:{})}];buildUserContextProjection(p);
 });onProject(p);return {status:'pending_owner_confirmation',revision:p.revision,entry:p.userContextEntries!.find(e=>e.id===entryId),projectionWarning:p.contextProjectionWarning};
 }}]}
export function registerUserContextDecisions(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.post('/api/user-context/decide',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可确认分类');
  const b=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0),id:z.string().uuid(),decision:z.enum(['confirm','reject']),confirmed:z.literal(true)}).strict().parse(req.body);
  const stage=await store.chatState(user.projectId);if(stage.active!=='living')throw new DomainError(409,'请返回生活设计阶段');
  return store.mutate(user.projectId,b.requestId,b.expectedRevision,'user-context-decision',b,p=>{
   const entry=p.userContextEntries?.find(e=>e.id===b.id);if(!entry||entry.status!=='pending')throw new DomainError(409,'分类候选已处理或不存在');
   entry.status=b.decision==='confirm'?'confirmed':'rejected';entry.updatedAt=new Date().toISOString();
   // Rejecting a proposed correction must not invalidate the earlier confirmed fact.
   if(b.decision==='reject'){entry.category='unresolved';delete entry.supersedesId}
   buildUserContextProjection(p);
  },undefined,stage);
 });
}
