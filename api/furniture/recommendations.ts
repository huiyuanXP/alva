import type {QuestionnaireSnapshot} from '../../packages/contracts/alva/questionnaire-batch.js';
import {McpError} from '../mcp/contracts.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {applyChanges} from '../business.js';
import {assets,DomainError,type Project,type Proposal} from '../model.js';
import type {BusinessTool} from '../codex.js';
import type {AlvaStore} from '../store.js';

export function recommendationContext(p:Project,id:string){
 const job=p.answerRecommendations?.find(j=>j.id===id);if(!job||job.status==='invalidated')throw new DomainError(409,'回答建议任务已失效');
 const extension=job.respondentId?p.homeVision?.responses.find(r=>r.id===job.respondentId)?.chatAnswers?.find(a=>a.evidenceId===job.evidenceId&&a.status==='active'&&a.state==='answered'):undefined;
 const answer=job.respondentId?(extension?{questionId:extension.questionId,roomId:extension.roomId,text:extension.text,state:extension.state,confirmed:true,evidenceId:extension.evidenceId,locked:false}:undefined):p.answers.find(a=>a.evidenceId===job.evidenceId&&a.confirmed);if(!answer)throw new DomainError(409,'依据回答已被更正，请使用新回答生成建议');
 const rooms=(p.scene?.rooms||[]).filter(r=>!r.locked&&(!answer.roomId||r.id===answer.roomId));
 return {job,answer,rooms};
}
const FurnitureAddition=z.object({action:z.literal('add'),targetId:z.string().min(1).describe('目标房间ID，必须与values.roomId相同；不是资产ID'),values:z.object({assetId:z.string().min(1).describe('快照许可资产ID，例如alva-chair'),roomId:z.string().min(1).describe('目标房间ID'),x:z.number().finite().describe('房间内部的平面横坐标，单位米'),y:z.number().finite().describe('房间内部的平面纵坐标，单位米'),rotation:z.number().finite().optional()}).strict()}).strict();
const Suggestion=z.object({expectedRevision:z.number().int().min(0),roomIds:z.array(z.string()).min(1).max(30),variants:z.array(z.object({title:z.string().min(1).max(100),rationale:z.string().min(1).max(1200),changes:z.array(FurnitureAddition).min(1).max(30)}).strict()).min(1).max(3)}).strict();
/** Bounded read-only search through the same placement validator; hints never adopt furniture. */
function placementHints(scene:NonNullable<Project['scene']>,change:z.infer<typeof FurnitureAddition>){
 const room=scene.rooms.find(r=>r.id===change.values.roomId);if(!room||!assets.some(a=>a.id===change.values.assetId))return [];
 const xs=room.polygon.map(p=>p.x),ys=room.polygon.map(p=>p.y),minX=Math.min(...xs),minY=Math.min(...ys),width=Math.max(...xs)-minX,depth=Math.max(...ys)-minY;
 const hints:{x:number;y:number;rotation:number}[]=[];
 for(let row=1;row<20&&hints.length<3;row++)for(let col=1;col<20&&hints.length<3;col++){
  const x=Math.round((minX+width*col/20)*20)/20,y=Math.round((minY+depth*row/20)*20)/20,rotation=change.values.rotation||0;
  try{applyChanges(scene,[{...change,values:{...change.values,x,y,newId:randomUUID()}}]);hints.push({x,y,rotation})}catch{/* Only validated points are returned. */}
 }
 return hints;
}
export function recommendationTools(store:AlvaStore,projectId:string,jobId:string|undefined,proposals:Proposal[],onNoFurniture?:(reason:string)=>void,batch?:QuestionnaireSnapshot):BusinessTool[]{
 let suggestionFailed=false;
 const tools:BusinessTool[]=[{name:'suggest_furniture',description:'仅在业主明确发送问卷批次或重试已确认回答时，综合本批多题提出相关房间的家具候选。服务端检查许可资产、房间边界与碰撞；不采用，等待用户确认。不能基于问卷草稿调用。',inputSchema:z.toJSONSchema(Suggestion),run:async args=>{
  if(!jobId&&!batch)throw new DomainError(422,'请先确认问卷回答，再使用对应的家具建议任务');
  const parsed=Suggestion.safeParse(args);if(!parsed.success)throw new McpError({code:'FURNITURE_ARGUMENTS_INVALID',message:'家具候选参数无效：'+parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).join('；').slice(0,1200),retryable:true,repairActions:[{action:'correct_furniture_arguments',message:'每项changes使用{action:add,targetId:房间ID,values:{assetId:许可资产ID,roomId:同一房间ID,x:横坐标,y:纵坐标}}；坐标是values.x和values.y，不是position对象。重读快照取得当前revision与房间范围后修正。'}]});const b=parsed.data,p=await store.get(projectId);if(p.revision!==b.expectedRevision)throw new DomainError(409,'项目已更新，请重读快照');
  const {rooms}=batch?{rooms:(p.scene?.rooms||[]).filter(r=>!r.locked)}:recommendationContext(p,jobId!);const evidenceIds=batch?[...batch.answers.map(a=>a.evidenceId),...(batch.homeVision?.responses||[]).flatMap(r=>(r.chatAnswers||[]).map(a=>a.evidenceId))]:[recommendationContext(p,jobId!).job.evidenceId];if(!p.scene||!p.confirmedBuilding)throw new DomainError(422,'请先确认建筑');
  if(b.roomIds.some(id=>!rooms.some(r=>r.id===id)))throw new DomainError(422,'建议包含不相关、不存在或锁定的房间');
  if(proposals.length)throw new DomainError(422,'本轮已提出候选，请先由用户比较确认');
  const candidates:Proposal[]=[];
  for(const v of b.variants){
   for(const change of v.changes){
    if(change.action!=='add')throw new DomainError(422,'问卷家具建议只能新增候选，现有物品调整请另行讨论');
    const roomId=typeof change.values.roomId==='string'?change.values.roomId:change.targetId;
    if(!b.roomIds.includes(roomId)||change.targetId!==roomId)throw new McpError({code:'FURNITURE_ROOM_MISMATCH',message:'家具targetId和values.roomId必须都是本轮roomIds中的同一房间ID；资产ID填values.assetId',retryable:true,repairActions:[{action:'correct_room_id',message:'重读get_snapshot，将targetId与values.roomId设为目标房间ID，不要填资产ID'}]});
   }
   const changes=v.changes.map(change=>({...change,values:{...change.values,newId:randomUUID()}}));try{applyChanges(p.scene,changes)}catch(error){if(!(error instanceof DomainError))throw error;throw new McpError({code:'FURNITURE_PLACEMENT_INVALID',message:error.message,retryable:true,repairActions:[{action:'adjust_placement',message:'保留现有家具，按许可资产的完整宽深与旋转占地选取房间内空位；坐标是家具中心，不是边角。不能把几次位置失败说成整个房间无空间。候选尺寸与位置：'+JSON.stringify(changes.map(c=>({roomId:c.values.roomId,x:c.values.x,y:c.values.y,rotation:c.values.rotation||0,asset:assets.find(a=>a.id===c.values.assetId)})))+'；现有物品：'+JSON.stringify(p.scene.items.filter(i=>b.roomIds.includes(i.roomId)).map(i=>({id:i.id,x:i.x,y:i.y,width:i.width,depth:i.depth,rotation:i.rotation}))) },{action:'validated_positions',message:JSON.stringify({scope:'仅首件候选，有限采样验证，不代表最优动线或自动采用；空列表不代表房间无解',positions:placementHints(p.scene,v.changes[0])})}]})};
   candidates.push({id:randomUUID(),...v,changes,evidenceIds,baseRevision:p.revision+1,status:'proposed',scopeRequired:false});
  }
  proposals.push(...candidates);return {status:'pending_owner_confirmation',variants:candidates.map(p=>({id:p.id,title:p.title})),relatedRoomIds:b.roomIds};
 }},...(!onNoFurniture?[]:[{name:'skip_furniture_suggestion',description:'已确认回答与新增家具无关时，明确记录不提出家具的原因。不能用它掩盖工具失败或缺少调用；不修改场景。',inputSchema:z.toJSONSchema(z.object({reason:z.string().trim().min(5).max(1200)}).strict()),run:async(args:unknown)=>{
  if(!jobId&&!batch)throw new DomainError(422,'当前没有已确认回答触发的建议任务');const {reason}=z.object({reason:z.string().trim().min(5).max(1200)}).strict().parse(args);if(!batch)recommendationContext(await store.get(projectId),jobId!);if(suggestionFailed||/工具|失败|错误|权限|冲突|暂不可用|不支持|无法处理|碰撞|重叠|空位|technical|error|fail/i.test(reason))throw new McpError({code:'RECOMMENDATION_UNRESOLVED_ERROR',message:'工具失败不能作为不需要家具的原因，请修复调用后重试',retryable:true,repairActions:[{action:'mcp_list_tools',message:'获取suggest_furniture的完整参数结构，再用mcp_call_tool传name和arguments对象调用；持续失败应报错，不能记为无家具需求'}]});if(proposals.length)throw new DomainError(422,'已有家具候选，不能同时记录无建议');onNoFurniture(reason);return {status:'no_furniture_needed',reason};
 }}])];
 return tools.map(tool=>tool.name!=='suggest_furniture'?tool:{...tool,run:async args=>{try{return await tool.run(args)}catch(error){suggestionFailed=true;throw error}}});
}
