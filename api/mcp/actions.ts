import {acceptLivingEntry,livingEntryPreview} from '../topology/living-entry.js';
import {confirmRoomPurpose,RoomPurposeInput} from '../room-purpose/service.js';
import {saveProjectWithReview} from '../snapshots/service.js';
import {currentSaveReview} from '../review/service.js';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {DomainError,type Project} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import type {ChatAction,ChatActionKind} from '../../packages/contracts/alva/chat-actions.js';
import {confirmCandidate,reopenTopology} from '../topology/service.js';
import {confirmBuilding} from '../building/service.js';
import {switchChatStage} from './sessions.js';

export function actionVersion(p:Project,kind:ChatActionKind){
 const domain=kind==='confirm_building'?'building':(kind==='confirm_topology'||kind==='enter_living')?'topology':'design';
 return p.confirmationVersions?.[domain]??0;
}
function staleReason(kind:ChatActionKind){return kind==='confirm_building'?'建筑候选或其拓扑依据已变化，需要刷新确认卡并重新核对。':(kind==='confirm_topology'||kind==='enter_living')?'户型候选或校准已变化，需要刷新确认卡并重新核对。':'确认依据已变化，需要刷新确认卡并重新核对。'}

const descriptions:Record<ChatActionKind,[string,string]>={enter_living:['按当前户型进入生活设计','3D直接由户型数据显示，无需单独生成或校验建筑模型。'],confirm_purpose:['确认房间用途','确认用途不会自行采用家具或布局方案。'],confirm_topology:['确认户型拓扑','请核对墙、房间、门窗和校准尺寸，确认后生成不可变拓扑版本。'],reopen_topology:['返回修改户型','将清除依赖旧户型的空间设计、家具方案与建筑 3D；原图、回答和聊天保留。'],confirm_building:['确认建筑并进入生活设计','请先查看建筑 3D；确认后进入生活设计阶段。'],save_design:['保存全局快照','只有点击确认才生成编号快照；将先复核当前设计。']};
export async function requestChatAction(store:AlvaStore,p:Project,kind:ChatActionKind,details?:ChatAction['details']){
 const stage=kind==='save_design'||kind==='confirm_purpose'?'living':'floorplan';
 if(kind==='confirm_purpose'){details=RoomPurposeInput.strict().parse(details);const room=p.scene?.rooms.find(r=>r.id===details!.roomId);if(!room||room.locked)throw new DomainError(422,'目标房间不存在或已锁定')}
 if(kind==='save_design')await currentSaveReview(store,p.id);
 if(kind==='confirm_topology'&&!p.candidate?.calibration?.confirmed)throw new DomainError(422,'请先完成候选校准');
 if(kind==='reopen_topology'&&!p.confirmedTopology)throw new DomainError(422,'当前没有已确认拓扑');
 if(kind==='confirm_building'&&!p.buildingCandidate)throw new DomainError(422,'请先生成并预览建筑候选');
 const entry=kind==='enter_living'?livingEntryPreview(p):undefined;
 const version=actionVersion(p,kind),existing=(await store.chatActions(p.id)).find(a=>a.kind===kind&&a.status==='pending'&&a.version===version&&JSON.stringify(a.details)===JSON.stringify(details));
 const action:ChatAction=existing||{id:randomUUID(),projectId:p.id,stage,kind,title:descriptions[kind][0],description:entry?(entry.warnings.length?'当前户型有待核对项：'+entry.warnings.join('；')+'。可以保留这些问题继续，也可以暂不执行并返回修改。':'按当前户型继续，3D会自动显示。'):descriptions[kind][1],status:'pending',version,...(details?{details,description:`${p.scene?.rooms.find(r=>r.id===details.roomId)?.name}：${details.purpose}。确认用途后再单独比较布局。`}:{}),createdAt:new Date().toISOString()};
 if(!existing)await store.putChatAction(action);
 return {status:'awaiting_owner_confirmation',action};
}
export function registerChatActions(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session,active:Map<string,AbortController>){
 app.get('/api/chat/actions',async req=>{const id=session(req).projectId,p=await store.get(id);return (await store.chatActions(id)).map(a=>({...a,stale:a.status==='pending'&&a.version!==actionVersion(p,a.kind),staleReason:a.status==='pending'&&a.version!==actionVersion(p,a.kind)?staleReason(a.kind):undefined}))});
 app.post('/api/chat/actions/refresh',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可刷新确认卡');
  if(active.has(user.projectId))throw new DomainError(409,'请先等待或取消当前请求');
  const b=z.object({id:z.string().uuid(),expectedRevision:z.number().int().min(0)}).strict().parse(req.body);
  const action=(await store.chatActions(user.projectId)).find(a=>a.id===b.id);if(!action||action.status!=='pending')throw new DomainError(409,'确认请求已处理或不存在，请刷新项目');
  const state=await store.chatState(user.projectId);if(state.active!==action.stage)throw new DomainError(409,'请切回确认卡所属阶段');
  const p=await store.get(user.projectId);if(p.revision!==b.expectedRevision)throw new DomainError(409,'项目已更新，请重读后刷新确认卡');
  const result=await requestChatAction(store,p,action.kind,action.details);
  if(result.action.id!==action.id)await store.rejectChatAction(user.projectId,action.id);
  return result;
 });
 app.post('/api/chat/actions/confirm',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可确认');
  if(active.has(user.projectId))throw new DomainError(409,'请先等待或取消当前请求');
  const b=z.object({id:z.string().uuid(),expectedRevision:z.number().int().min(0),confirmed:z.literal(true)}).strict().parse(req.body);
  const action=(await store.chatActions(user.projectId)).find(a=>a.id===b.id);if(!action)throw new DomainError(404,'确认请求不存在');if(action.status==='rejected')throw new DomainError(409,'请求已取消');
  const op=action.kind==='save_design'?'save':'chat-action-'+action.kind;
  const project=action.kind==='save_design'?await saveProjectWithReview(store,user.projectId,action.id,b.expectedRevision,{actionId:action.id},action.id,p=>{if(action.version!==actionVersion(p,action.kind))throw new DomainError(409,'设计或回答已变化，请重新生成确认请求')}):await store.mutate(user.projectId,action.id,b.expectedRevision,op,{actionId:action.id},p=>{
   if(action.version!==actionVersion(p,action.kind))throw new DomainError(409,'设计或回答已变化，请重新生成确认请求');
   if(action.kind==='confirm_purpose')confirmRoomPurpose(p,RoomPurposeInput.parse(action.details));
   if(action.kind==='enter_living')acceptLivingEntry(p);
   if(action.kind==='confirm_topology')confirmCandidate(p,{});
   if(action.kind==='reopen_topology')reopenTopology(p,{});
   if(action.kind==='confirm_building')confirmBuilding(p);
  },action.id);
  if(action.kind==='confirm_building'||action.kind==='enter_living')await switchChatStage(store,user.projectId,'living',project.revision,{deferEntry:true});
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
