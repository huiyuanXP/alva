import {createHash,randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {DomainError,type Project} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import type {ChatAction,ChatActionKind} from '../../packages/contracts/alva/chat-actions.js';
import {confirmCandidate,reopenTopology} from '../topology/service.js';
import {confirmBuilding} from '../building/service.js';
import {switchChatStage} from './sessions.js';
import {review} from '../business.js';

export function actionBasis(p:Project){return createHash('sha256').update(JSON.stringify({candidate:p.candidate,scene:p.scene,topology:p.confirmedTopology,building:p.buildingCandidate,confirmedBuilding:p.confirmedBuilding,answers:p.answers,roomStyles:p.roomStyles})).digest('hex')}
const descriptions:Record<ChatActionKind,[string,string]>={confirm_topology:['确认户型拓扑','请核对墙、房间、门窗和校准尺寸，确认后生成不可变拓扑版本。'],reopen_topology:['返回修改户型','将清除依赖旧户型的空间设计、家具方案与建筑 3D；原图、回答和聊天保留。'],confirm_building:['确认建筑并进入生活设计','请先查看建筑 3D；确认后进入生活设计阶段。'],save_design:['保存全局快照','只有点击确认才生成编号快照；将先复核当前设计。']};
export async function requestChatAction(store:AlvaStore,p:Project,kind:ChatActionKind){
 const stage=kind==='save_design'?'living':'floorplan';
 if(kind==='confirm_topology'&&!p.candidate?.calibration?.confirmed)throw new DomainError(422,'请先完成候选校准');
 if(kind==='reopen_topology'&&!p.confirmedTopology)throw new DomainError(422,'当前没有已确认拓扑');
 if(kind==='confirm_building'&&!p.buildingCandidate)throw new DomainError(422,'请先生成并预览建筑候选');
 const basis=actionBasis(p),existing=(await store.chatActions(p.id)).find(a=>a.kind===kind&&a.status==='pending'&&a.basis===basis);
 const action:ChatAction=existing||{id:randomUUID(),projectId:p.id,stage,kind,title:descriptions[kind][0],description:descriptions[kind][1],status:'pending',basis,createdAt:new Date().toISOString()};
 if(!existing)await store.putChatAction(action);
 return {status:'awaiting_owner_confirmation',action};
}
export function registerChatActions(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session,active:Map<string,AbortController>){
 app.get('/api/chat/actions',async req=>{const id=session(req).projectId,p=await store.get(id);return (await store.chatActions(id)).map(a=>({...a,stale:a.status==='pending'&&a.basis!==actionBasis(p)}))});
 app.post('/api/chat/actions/confirm',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可确认');
  if(active.has(user.projectId))throw new DomainError(409,'请先等待或取消当前请求');
  const b=z.object({id:z.string().uuid(),expectedRevision:z.number().int().min(0),confirmed:z.literal(true)}).strict().parse(req.body);
  const action=(await store.chatActions(user.projectId)).find(a=>a.id===b.id);if(!action)throw new DomainError(404,'确认请求不存在');if(action.status==='rejected')throw new DomainError(409,'请求已取消');
  const op=action.kind==='save_design'?'save':'chat-action-'+action.kind;
  const project=await store.mutate(user.projectId,action.id,b.expectedRevision,op,{actionId:action.id},p=>{
   if(action.basis!==actionBasis(p))throw new DomainError(409,'设计或回答已变化，请重新生成确认请求');
   if(action.kind==='confirm_topology')confirmCandidate(p,{});
   if(action.kind==='reopen_topology')reopenTopology(p,{});
   if(action.kind==='confirm_building')confirmBuilding(p);
   if(action.kind==='save_design')p.findings=[...p.findings.filter(f=>f.stage!=='review'),...review(p,'review')];
  },action.id);
  if(action.kind==='confirm_building')await switchChatStage(store,user.projectId,'living',project.revision);
  if(action.kind==='reopen_topology')await switchChatStage(store,user.projectId,'floorplan',project.revision);
  return project;
 });
 app.post('/api/chat/actions/reject',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可取消');
  const b=z.object({id:z.string().uuid()}).strict().parse(req.body),action=(await store.chatActions(user.projectId)).find(a=>a.id===b.id);
  if(!action||action.status!=='pending')throw new DomainError(409,'请求已处理或不存在');
  await store.rejectChatAction(user.projectId,b.id);return {status:'rejected'};
 });
}
