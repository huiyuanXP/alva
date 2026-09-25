import {randomUUID} from 'node:crypto';
import type {AlvaStore} from '../store.js';
import {DomainError,reject,type Project} from '../model.js';
import {generateBuilding,buildingFailureMessage,type BuildingCodexCall} from './generate.js';

export async function generateBuildingCandidate(store:AlvaStore,projectId:string,b:{requestId:string;expectedRevision:number},signal:AbortSignal,codex?:BuildingCodexCall){
 const before=await store.get(projectId),topology=before.confirmedTopology;
 if(!topology)throw new DomainError(422,'请先确认拓扑版本');
 if(before.buildingState.requestId===b.requestId&&['succeeded','confirmed'].includes(before.buildingState.status))return before;
 if(before.buildingState.status==='processing')throw new DomainError(409,'当前已有建筑生成任务，请等待或取消');
 if(before.buildingState.attempts>=3)throw new DomainError(422,'建筑生成失败次数已达上限，请先确认拓扑后再重试');
 if(signal.aborted)throw new DOMException('已取消','AbortError');
 const started=await store.mutate(projectId,randomUUID(),b.expectedRevision,'building-start',{requestId:b.requestId,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint},p=>{p.buildingState={status:'processing',requestId:b.requestId,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,attempts:p.buildingState.attempts+1,updatedAt:new Date().toISOString()}});
 try{
  const generated=await generateBuilding(started,topology.scene,topology.version,topology.sourceFingerprint,signal,codex);
  if(signal.aborted)throw new DOMException('已取消','AbortError');
  return await store.mutate(projectId,randomUUID(),started.revision,'building-complete',{requestId:b.requestId},p=>{p.buildingCandidate=generated;p.buildingState={status:'succeeded',requestId:b.requestId,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,attempts:p.buildingState.attempts,updatedAt:new Date().toISOString()}});
 }catch(error){
  const cancelled=signal.aborted,current=await store.get(projectId),message=cancelled?'建筑生成已取消，已有场景保持不变':buildingFailureMessage(error);
  // A newer topology/job must never be overwritten by an old failure callback.
  if(current.buildingState.requestId===b.requestId)await store.mutate(projectId,randomUUID(),current.revision,'building-failed',{requestId:b.requestId,error:message},p=>{p.buildingState={...p.buildingState,status:cancelled?'cancelled':'failed',error:message,updatedAt:new Date().toISOString()}});
  throw new DomainError(cancelled?409:422,message);
 }
}
export function confirmBuilding(p:Project){
 if(!p.buildingCandidate)reject('请先生成并预览建筑场景');
 if(!p.confirmedTopology||p.buildingState.topologyFingerprint!==p.confirmedTopology.sourceFingerprint)reject('建筑场景已过期，请针对当前拓扑重新生成');
 p.confirmedBuilding=structuredClone(p.buildingCandidate);p.buildingCandidate=undefined;p.buildingState={...p.buildingState,status:'confirmed',updatedAt:new Date().toISOString()};p.dirty=true;
 p.changes.push({id:randomUUID(),description:`确认建筑场景（拓扑 v${p.confirmedTopology!.version}）`,evidenceIds:[],context:[`建筑生成回指来源指纹 ${p.confirmedTopology!.sourceFingerprint}`],createdAt:new Date().toISOString()});
}
