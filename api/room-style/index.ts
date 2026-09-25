import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import {RoomStyleSchema} from '../../packages/contracts/alva/room-style.js';
import type {BusinessTool} from '../codex.js';
import {DomainError,type Project} from '../model.js';
import type {AlvaStore,Session} from '../store.js';

export const roomStyleBasis=(p:Project,roomId:string)=>createHash('sha256').update(JSON.stringify({topology:p.confirmedTopology?.sourceFingerprint,room:p.scene?.rooms.find(r=>r.id===roomId),style:p.roomStyles?.[roomId]})).digest('hex');
const Proposal=z.object({expectedRevision:z.number().int().min(0),roomId:z.string(),style:RoomStyleSchema,reason:z.string().trim().min(1).max(800)}).strict();
export function roomStyleTools(store:AlvaStore,projectId:string,onProject:(p:Project)=>void):BusinessTool[]{return [{name:'propose_room_style',description:'按房间提出风格标签及墙面/地面颜色与材料候选。用户在二维或三维预览后点击确认才采用；不修改墙体几何，材料只是视觉候选。',inputSchema:z.toJSONSchema(Proposal),run:async args=>{
 const b=Proposal.parse(args);let candidateId='';
 const p=await store.mutate(projectId,randomUUID(),b.expectedRevision,'propose-room-style',b,p=>{
  if(!p.confirmedBuilding)throw new DomainError(422,'请先确认建筑');const room=p.scene?.rooms.find(r=>r.id===b.roomId);if(!room)throw new DomainError(422,'房间不存在');if(room.locked)throw new DomainError(422,'房间已锁定');
  const candidate={id:randomUUID(),roomId:b.roomId,style:b.style,reason:b.reason,basis:roomStyleBasis(p,b.roomId),status:'pending' as const,createdAt:new Date().toISOString()};candidateId=candidate.id;p.roomStyleCandidates=[...(p.roomStyleCandidates||[]),candidate];
 });onProject(p);return {status:'pending_owner_confirmation',revision:p.revision,candidate:p.roomStyleCandidates!.find(c=>c.id===candidateId)};
 }}]}
export function registerRoomStyles(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.post('/api/room-styles/decide',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可确认房间样式');
  const b=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0),id:z.string().uuid(),decision:z.enum(['confirm','reject']),confirmed:z.literal(true)}).strict().parse(req.body);
  const stage=await store.chatState(user.projectId);if(stage.active!=='living')throw new DomainError(409,'请先切回生活设计阶段');
  return store.mutate(user.projectId,b.requestId,b.expectedRevision,'room-style-decision',b,p=>{
   const c=p.roomStyleCandidates?.find(c=>c.id===b.id);if(!c||c.status!=='pending')throw new DomainError(409,'样式候选已处理或不存在');
   if(b.decision==='reject'){c.status='rejected';return}
   if(!p.confirmedBuilding||c.basis!==roomStyleBasis(p,c.roomId))throw new DomainError(409,'房间或原样式已变化，请重新生成候选');
   if(p.scene?.rooms.find(r=>r.id===c.roomId)?.locked)throw new DomainError(422,'房间已锁定');
   p.roomStyles={...p.roomStyles,[c.roomId]:c.style};c.status='confirmed';c.confirmedAt=new Date().toISOString();p.dirty=true;
   p.changes.push({id:randomUUID(),description:`确认房间样式：${c.style.tags.join('、')}`,evidenceIds:[],context:[c.reason],createdAt:c.confirmedAt});
  },undefined,stage);
 });
}
