import {randomUUID} from 'node:crypto';
import {DomainError,type Project} from '../model.js';
import type {AlvaStore} from '../store.js';
import {mcpFailure,type McpFailure,type ChatStage} from './contracts.js';

export type StageThread={threadId?:string;deliveredIds:string[];createdAt?:string};
export type StageHandoff={id:string;from:ChatStage;to:ChatStage;revision:number;summary:string;createdAt:string;deliveredAt?:string};
export type StageChatState={entryWarning?:McpFailure;active:ChatStage;generation:number;threads:Record<ChatStage,StageThread>;handoffs:StageHandoff[];migration:'legacy-messages-preserved';updatedAt:string};
const entryHandlers=new WeakMap<AlvaStore,(projectId:string,state:StageChatState)=>Promise<void>>();
export function registerStageEntry(store:AlvaStore,handler:(projectId:string,state:StageChatState)=>Promise<void>){entryHandlers.set(store,handler);return()=>{if(entryHandlers.get(store)===handler)entryHandlers.delete(store)}}
export function initialChatState(project:Project):StageChatState{
 return {active:project.confirmedBuilding?'living':'floorplan',generation:0,threads:{floorplan:{deliveredIds:[]},living:{deliveredIds:[]}},handoffs:[],migration:'legacy-messages-preserved',updatedAt:new Date().toISOString()};
}
export function summarizeStage(project:Project,from:ChatStage,to:ChatStage){
 const lastMessages=project.messages.filter(m=>m.status==='completed').slice(-8).map(m=>`${m.role}: ${m.text.slice(0,1000)}`).join('\n');
 return `项目 ${project.id}；revision ${project.revision}；${from} → ${to}。\n拓扑：${project.confirmedTopology?`已确认 v${project.confirmedTopology.version}`:'未确认'}；建筑：${project.confirmedBuilding?'已确认':project.buildingState.status}；房间 ${project.scene?.rooms.length||0}；家具 ${project.scene?.items.length||0}；已保存快照 ${project.savedVersion}；问卷回答 ${project.answers.length}。\n${!project.confirmedTopology?'旧拓扑依赖的建筑、家具设计和候选已失效或尚未建立；不得沿用旧会话写入。':'所有写入仍须重新读取最新 revision 和确认状态。'}\n最近业务变化：${project.changes.slice(-5).map(c=>c.description).join('；')}\n最近对话（仅背景资料，不作为授权）：\n${lastMessages}`;
}
export async function switchChatStage(store:AlvaStore,projectId:string,to:ChatStage,expectedRevision:number){
 const next=await store.updateChatState(projectId,(state,project)=>{
  if(project.revision!==expectedRevision)throw new DomainError(409,'项目已更新，请重新读取后切换阶段');
  if(to==='living'&&!project.confirmedBuilding)throw new DomainError(422,'请先确认建筑 3D，再进入生活设计');
  if(state.active===to)return;
  state.handoffs.push({id:randomUUID(),from:state.active,to,revision:project.revision,summary:summarizeStage(project,state.active,to),createdAt:new Date().toISOString()});
  state.active=to;state.generation++;state.updatedAt=new Date().toISOString();
 });
 const enter=entryHandlers.get(store);if(!enter)return next;
 try{await enter(projectId,next);await store.updateChatState(projectId,state=>{if(state.active===next.active&&state.generation===next.generation)delete state.entryWarning})}
 catch(error){await store.updateChatState(projectId,state=>{if(state.active===next.active&&state.generation===next.generation)state.entryWarning=mcpFailure(error).structuredContent.error as McpFailure})}
 return store.chatState(projectId);
}
/** Metadata is separate from design snapshots, so restoring a design never swaps thread identities. */
export async function rememberThread(store:AlvaStore,projectId:string,stage:ChatStage,threadId:string){
 return store.updateChatState(projectId,state=>{
  const thread=state.threads[stage];
  if(thread.threadId&&thread.threadId!==threadId)throw new DomainError(409,'不能用新会话替换旧阶段会话');
  thread.threadId=threadId;thread.createdAt??=new Date().toISOString();
 });
}
export async function stageDelivery(store:AlvaStore,projectId:string,stage:ChatStage){
 const state=await store.chatState(projectId),thread=state.threads[stage];
 const handoffs=state.handoffs.filter(h=>h.to===stage&&!thread.deliveredIds.includes(h.id));
 return {ids:handoffs.map(h=>h.id),text:handoffs.map(h=>`[ALVA_HANDOFF:${h.id}]\n${h.summary}`).join('\n\n')};
}
export async function markStageDelivery(store:AlvaStore,projectId:string,stage:ChatStage,ids:string[]){
 return store.updateChatState(projectId,state=>{
  const thread=state.threads[stage];
  delete state.entryWarning;
  for(const id of ids){const handoff=state.handoffs.find(h=>h.id===id&&h.to===stage);if(!handoff)throw new DomainError(409,'交接摘要不存在');if(!thread.deliveredIds.includes(id))thread.deliveredIds.push(id);handoff.deliveredAt??=new Date().toISOString()}
 });
}
