import {randomUUID} from 'node:crypto';
import {reject,type Change,type Project,type Proposal,type SceneData} from './model.js';

export type ScopeStatus='pending'|'confirmed'|'cancelled';
export type ScopeRequest={
 id:string;
 status:ScopeStatus;
 reason:string;
 roomIds:string[];
 itemIds:string[];
 excludedRoomIds:string[];
 excludedItemIds:string[];
 sourceMessageId?:string;
 baseRevision:number;
 createdAt:string;
 confirmedAt?:string;
};

function selectable(scene:SceneData,roomIds:string[],itemIds:string[]){
 const rooms=scene.rooms.filter(room=>roomIds.includes(room.id));
 const items=scene.items.filter(item=>itemIds.includes(item.id));
 if(rooms.length!==new Set(roomIds).size||items.length!==new Set(itemIds).size)reject('范围包含不存在的房间或物品');
 if(rooms.some(room=>room.locked))reject('范围包含已锁定房间');
 if(items.some(item=>item.locked||scene.rooms.find(room=>room.id===item.roomId)?.locked))reject('范围包含已锁定物品或锁定房间中的物品');
 if(!rooms.length&&!items.length)reject('至少选择一个房间或物品');
 return {roomIds:[...new Set(roomIds)],itemIds:[...new Set(itemIds)]};
}

export function scopeCandidates(scene:SceneData){
 const lockedRoomIds=scene.rooms.filter(room=>room.locked).map(room=>room.id);
 const eligibleRoomIds=scene.rooms.filter(room=>!room.locked).map(room=>room.id);
 const lockedItemIds=scene.items.filter(item=>item.locked||lockedRoomIds.includes(item.roomId)).map(item=>item.id);
 const eligibleItemIds=scene.items.filter(item=>!item.locked&&!lockedRoomIds.includes(item.roomId)).map(item=>item.id);
 return {eligibleRoomIds,eligibleItemIds,lockedRoomIds,lockedItemIds};
}

export function createScopeRequest(project:Project,input:{roomIds?:string[];itemIds?:string[];reason:string;sourceMessageId?:string}):ScopeRequest{
 if(!project.scene)reject('请先完成户型');
 const candidates=scopeCandidates(project.scene!);
 const roomIds=input.roomIds===undefined?candidates.eligibleRoomIds:input.roomIds;
 const itemIds=input.itemIds===undefined?candidates.eligibleItemIds:input.itemIds;
 const selected=selectable(project.scene!,roomIds,itemIds);
 return {id:randomUUID(),status:'pending',reason:input.reason.trim().slice(0,500)||'请确认本次建议涉及的范围',...selected,excludedRoomIds:candidates.lockedRoomIds,excludedItemIds:candidates.lockedItemIds,sourceMessageId:input.sourceMessageId,baseRevision:project.revision+1,createdAt:new Date().toISOString()};
}

export function activeScope(project:Project){return [...(project.scopeRequests||[])].reverse().find(scope=>scope.status==='confirmed')}

export function collectChangeTargets(scene:SceneData,changes:Change[]){
 const roomIds=new Set<string>(),itemIds=new Set<string>();
 for(const change of changes){
  const room=scene.rooms.find(room=>room.id===change.targetId),item=scene.items.find(item=>item.id===change.targetId);
  if(room)roomIds.add(room.id);
  if(item){itemIds.add(item.id);roomIds.add(item.roomId)}
  const values=change.values as {roomId?:unknown};
  if(typeof values.roomId==='string')roomIds.add(values.roomId);
 }
 return {roomIds:[...roomIds],itemIds:[...itemIds]};
}

export function assertProposalScope(scene:SceneData,proposal:Proposal,scopes:ScopeRequest[],selectedIds=proposal.changes.map(change=>change.targetId)){
 const changes=proposal.changes.filter(change=>selectedIds.includes(change.targetId));
 if(proposal.scopeRequired&&!proposal.scopeId)reject('该候选尚未绑定已确认的作用范围');
 if(!proposal.scopeId)return;
 const scope=scopes.find(candidate=>candidate.id===proposal.scopeId);
 if(!scope||scope.status!=='confirmed')reject('作用范围尚未确认或已取消');
 const targets=collectChangeTargets(scene,changes),rooms=new Set(scope!.roomIds),items=new Set(scope!.itemIds);
 if(!targets.roomIds.every(id=>rooms.has(id))||!targets.itemIds.every(id=>items.has(id)||rooms.has(scene.items.find(item=>item.id===id)?.roomId||'')))reject('候选超出已确认作用范围');
}

export function confirmScope(project:Project,scopeId:string,roomIds:string[],itemIds:string[]){
 const requests=project.scopeRequests||[],request=requests.find(scope=>scope.id===scopeId);
 if(!request||request.status!=='pending')reject('范围请求不存在、已确认或已取消');
 if(roomIds.some(id=>!request!.roomIds.includes(id))||itemIds.some(id=>!request!.itemIds.includes(id)))reject('确认范围不能超出待确认范围');
 const selected=selectable(project.scene!,roomIds,itemIds);
 project.scopeRequests=requests.map(scope=>scope.id===scopeId?{...scope,...selected,status:'confirmed' as const,baseRevision:project.revision+1,confirmedAt:new Date().toISOString()}:scope);
 return project;
}

export function cancelScope(project:Project,scopeId:string){
 const requests=project.scopeRequests||[],request=requests.find(scope=>scope.id===scopeId);
 if(!request||request.status!=='pending')reject('范围请求不存在、已确认或已取消');
 project.scopeRequests=requests.map(scope=>scope.id===scopeId?{...scope,status:'cancelled' as const}:scope);
 return project;
}
