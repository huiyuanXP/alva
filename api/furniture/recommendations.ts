import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {applyChanges,ChangeSchema} from '../business.js';
import {DomainError,type Project,type Proposal} from '../model.js';
import type {BusinessTool} from '../codex.js';
import type {AlvaStore} from '../store.js';

export function recommendationContext(p:Project,id:string){
 const job=p.answerRecommendations?.find(j=>j.id===id);if(!job||job.status==='invalidated')throw new DomainError(409,'回答建议任务已失效');
 const answer=p.answers.find(a=>a.evidenceId===job.evidenceId&&a.confirmed);if(!answer)throw new DomainError(409,'依据回答已被更正，请使用新回答生成建议');
 const rooms=(p.scene?.rooms||[]).filter(r=>!r.locked&&(!answer.roomId||r.id===answer.roomId));
 return {job,answer,rooms};
}
const Suggestion=z.object({expectedRevision:z.number().int().min(0),roomIds:z.array(z.string()).min(1).max(30),variants:z.array(z.object({title:z.string().min(1).max(100),rationale:z.string().min(1).max(1200),changes:z.array(ChangeSchema).min(1).max(30)}).strict()).min(1).max(3)}).strict();
export function recommendationTools(store:AlvaStore,projectId:string,jobId:string|undefined,proposals:Proposal[]):BusinessTool[]{
 return [{name:'suggest_furniture',description:'仅在本轮由已确认问卷回答触发时，提出相关房间的家具候选。服务端检查许可资产、房间边界与碰撞；不采用，等待用户确认。不能基于问卷草稿调用。',inputSchema:z.toJSONSchema(Suggestion),run:async args=>{
  if(!jobId)throw new DomainError(422,'请先确认问卷回答，再使用对应的家具建议任务');
  const b=Suggestion.parse(args),p=await store.get(projectId);if(p.revision!==b.expectedRevision)throw new DomainError(409,'项目已更新，请重读快照');
  const {job,rooms}=recommendationContext(p,jobId);if(!p.scene||!p.confirmedBuilding)throw new DomainError(422,'请先确认建筑');
  if(b.roomIds.some(id=>!rooms.some(r=>r.id===id)))throw new DomainError(422,'建议包含不相关、不存在或锁定的房间');
  if(proposals.length)throw new DomainError(422,'本轮已提出候选，请先由用户比较确认');
  const candidates:Proposal[]=[];
  for(const v of b.variants){
   for(const change of v.changes){
    if(change.action!=='add')throw new DomainError(422,'问卷家具建议只能新增候选，现有物品调整请另行讨论');
    const roomId=typeof change.values.roomId==='string'?change.values.roomId:change.targetId;
    if(!b.roomIds.includes(roomId))throw new DomainError(422,'家具目标不属于本轮相关房间');change.values.newId=randomUUID();
   }
   applyChanges(p.scene,v.changes);
   candidates.push({id:randomUUID(),...v,evidenceIds:[job.evidenceId],baseRevision:p.revision+1,status:'proposed',scopeRequired:false});
  }
  proposals.push(...candidates);return {status:'pending_owner_confirmation',variants:candidates.map(p=>({id:p.id,title:p.title})),relatedRoomIds:b.roomIds};
 }}];
}
