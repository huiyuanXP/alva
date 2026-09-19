import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {Command,Id,type ProjectData,type ObjectConversation} from '../../packages/contracts/index.js';
import {canonical} from '../../packages/contracts/canonical.js';
import {Store,HttpError} from './store.js';
import {objectInfo,ObjectUpdate,updateObject} from './objects.js';
import {proposeObjectEdit} from './object-agent.js';
export const ObjectChatCommand=Command.extend({room_id:Id,object_id:Id,text:z.string().min(1).max(4000).refine(s=>s.trim().length>0)}).strict();
export const ObjectDecision=Command.extend({room_id:Id,object_id:Id,message_id:Id,action:z.enum(['confirm','reject']),confirmed:z.boolean().optional()}).strict();

export function assertObjectScope(p:ProjectData,room:string,object:string){const info=objectInfo(p,object);if(info.room_id!==room)throw new HttpError(400,'家具与房间不匹配');if(!info.capabilities.size)throw new HttpError(400,info.capabilities.reason);return info;}
export function assertFreshProposal(p:ProjectData,m:ObjectConversation){
 if(canonical(p.scene)!==m.scene_fingerprint || p.revisions.some(r=>r.version>m.base_version && ['scene_changed','object_changed'].includes(r.kind)))throw new HttpError(409,'场景已手工修改；请重新咨询并确认，未覆盖任何值');
}
export class ObjectChatService {
 constructor(private store:Store,private generate:typeof proposeObjectEdit=proposeObjectEdit){}
 async start(id:string,owner:string,b:z.infer<typeof ObjectChatCommand>){
  let claimed=false;
  const snapshot=await this.store.mutate(id,owner,b.request_id,b.expected_version,'object_chat_started',b,p=>{
   assertObjectScope(p,b.room_id,b.object_id);claimed=true;
   (p.object_messages??=[]).push({id:b.request_id,project_id:id,room_id:b.room_id,object_id:b.object_id,raw_user_evidence:b.text,text:'',status:'running',patch:null,base_version:p.version,scene_fingerprint:canonical(p.scene),created_at:new Date().toISOString()});
   p.evidence.push({id:b.request_id,quote:b.text,source:'object_chat_user',room_id:b.room_id,created_at:new Date().toISOString()});
  });
  if(!claimed)return this.store.get(id,owner);
  let result:Awaited<ReturnType<typeof proposeObjectEdit>>|undefined;
  try{result=await this.generate(snapshot,b.object_id,b.text);}catch{/* Never expose provider details or lose original input. */}
  return this.store.mutate(id,owner,randomUUID(),null,'object_chat_finished',{message_id:b.request_id},p=>{
   const m=p.object_messages!.find(m=>m.id===b.request_id)!;
   if(m.status!=='running')return;
   m.text=result?.text||'咨询未完成，原话已保留；请重试。';m.patch=result?.patch??null;m.status=result?'proposed':'failed';
  },'agent');
 }
 async decide(id:string,owner:string,b:z.infer<typeof ObjectDecision>){
  if(b.action==='confirm'&&b.confirmed!==true)throw new HttpError(400,'采用家具建议需要明确确认');
  return this.store.mutate(id,owner,b.request_id,b.expected_version,b.action==='confirm'?'object_changed':'object_chat_rejected',b,p=>{
   assertObjectScope(p,b.room_id,b.object_id);
   const m=p.object_messages?.find(m=>m.id===b.message_id&&m.project_id===id&&m.room_id===b.room_id&&m.object_id===b.object_id);
   if(!m)throw new HttpError(404,'此家具的建议不存在');
   if(!['running','proposed','failed'].includes(m.status))throw new HttpError(409,'此建议已处理');
   if(b.action==='reject'){m.status='rejected';return;}
   if(m.status!=='proposed'||!m.patch)throw new HttpError(400,'没有可采用的参数建议');
   assertFreshProposal(p,m);
   updateObject(p,ObjectUpdate.parse({request_id:b.request_id,expected_version:b.expected_version,room_id:b.room_id,object_id:b.object_id,patch:m.patch,confirmed:true}));
   m.status='accepted';
   p.evidence.push({id:randomUUID(),quote:JSON.stringify({message_id:m.id,object_id:m.object_id,patch:m.patch,raw_user_evidence:m.raw_user_evidence}),source:'object_chat_confirmation',room_id:m.room_id,created_at:new Date().toISOString()});
  });
 }
}
