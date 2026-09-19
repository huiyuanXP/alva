import {z} from 'zod';
import {Type} from 'typebox';
import {randomUUID} from 'node:crypto';
import {Command,Id,type ProjectData,type ReferencePlan} from '../../packages/contracts/index.js';
import {canonical} from '../../packages/contracts/canonical.js';
import {Store,HttpError} from './store.js';
import {hasUnitScale} from './reference-integrity.js';
import {furnitureCatalog} from '../../vendor/openplan3d/src/lib/utils/furnitureCatalog.js';
import {createConsultationAgent,providerErrorStatus,finalAgentText} from './provider.js';
export const Assets=['chair','storage','bookshelf'] as const;
export const ReferenceLines=z.array(z.object({asset_id:z.enum(Assets),quantity:z.number().int().min(1).max(4)}).strict()).min(1).max(3).refine(a=>new Set(a.map(x=>x.asset_id)).size===a.length&&a.reduce((n,x)=>n+x.quantity,0)<=8);
export const ReferenceRequest=Command.extend({room_id:Id,text:z.string().min(1).max(4000)}).strict();
export const ReferenceDecision=Command.extend({room_id:Id,plan_id:Id,object_ids:z.array(Id).min(1).max(8).refine(a=>new Set(a).size===a.length),action:z.enum(['accept','remove']),confirmed:z.boolean().optional()}).strict();
export const ReferenceQuantity=Command.extend({room_id:Id,plan_id:Id,asset_id:z.enum(Assets),quantity:z.number().int().min(1).max(4)}).strict();
export async function generateReferences(p:ProjectData,roomId:string,text:string){
 let lines:z.infer<typeof ReferenceLines>|undefined;
 const agent=await createConsultationAgent('你是ROOMNOTE家具助手。使用中文。根据用户要求调用 propose_reference_plan 一次，仅提供白名单目录家具和数量，生成未采用的参考摆放。椅子用chair，柜子用storage，书架用bookshelf。不是正式需求，不确认装修方案，不执行代码，不推断几何安全。服务器固定房间。',[
 {name:'propose_reference_plan',label:'添加未采用参考家具',description:'Use only catalog asset IDs for a pending reference plan.',parameters:Type.Object({items:Type.Array(Type.Object({asset_id:Type.Union(Assets.map(a=>Type.Literal(a))),quantity:Type.Integer({minimum:1,maximum:4})},{additionalProperties:false}),{minItems:1,maxItems:3})},{additionalProperties:false}),execute:async(_id,args)=>{
 const next=z.object({items:ReferenceLines}).strict().parse(args).items;if(lines&&canonical(lines)!==canonical(next))throw new Error('本轮已生成参考，请由用户调整数量');lines??=next;return {content:[{type:'text',text:'已生成未采用参考，等待用户确认'}],details:{pending:true}};
 }}]);const timer=setTimeout(()=>agent.abort(),60000);
 try{await agent.prompt(JSON.stringify({project_id:p.id,room_id:roomId,room:p.rooms.find(r=>r.id===roomId),user_text:text}));if(providerErrorStatus(agent)||!lines)throw new HttpError(503,'参考方案未生成');return {lines,text:finalAgentText(agent)};}finally{clearTimeout(timer);}
}
function room(p:ProjectData,id:string){const r=p.rooms.find(r=>r.id===id);if(!r)throw new HttpError(404,'房间不存在');return r;}
function plan(p:ProjectData,id:string,roomId:string){room(p,roomId);const plan=p.reference_plans?.find(s=>s.id===id&&s.room_id===roomId);if(!plan||plan.status!=='proposed')throw new HttpError(404,'此房间的参考方案不存在');return plan;}
export function setReferenceQuantity(p:ProjectData,s:ReferencePlan,line:ReferencePlan['lines'][number],quantity:number){
 const r=room(p,s.room_id);const floor=p.scene.floors.find(f=>f.id===r.floor_id)!;const asset=furnitureCatalog.find(a=>a.id===line.asset_id&&Assets.includes(a.id as any));if(!asset)throw new HttpError(400,'资产不在白名单');
 if(line.object_ids.some(id=>floor.furniture.some(o=>o.id===id&&o.reference_status==='accepted')))throw new HttpError(409,'已有明确采用对象，不能批量调整此项数量');
 if(s.lines.reduce((n,l)=>n+(l===line?quantity:l.quantity),0)>8)throw new HttpError(400,'单方案最多8件参考家具');
 for(let i=line.object_ids.length;i<quantity;i++)line.object_ids.push(`ref-${s.id}-${line.asset_id}-${i}`);
 floor.furniture=floor.furniture.filter(o=>!line.object_ids.slice(quantity).includes(o.id));
 for(let i=0;i<quantity;i++)if(!floor.furniture.some(o=>o.id===line.object_ids[i])){
 const index=s.lines.indexOf(line)*4+i;floor.furniture.push({id:line.object_ids[i],catalogId:asset.id,position:{x:r.bounds.x+70+(index%3)*110,y:r.bounds.y+80+Math.floor(index/3)*90},rotation:0,scale:{x:1,y:1,z:1},width:asset.width,depth:asset.depth,height:asset.height,color:asset.color,room_id:r.id,suggestion_id:s.id,reference_status:'pending'});
 }line.quantity=quantity;
}
export class ReferenceService{
 constructor(private store:Store,private generate:typeof generateReferences=generateReferences){}
 async start(id:string,owner:string,b:z.infer<typeof ReferenceRequest>){let claimed=false;
 const p=await this.store.mutate(id,owner,b.request_id,b.expected_version,'reference_started',b,p=>{room(p,b.room_id);claimed=true;(p.reference_plans??=[]).push({id:b.request_id,room_id:b.room_id,raw_text:b.text,status:'running',text:'',lines:[]});p.evidence.push({id:b.request_id,quote:b.text,room_id:b.room_id,source:'reference_user',created_at:new Date().toISOString()});});
 if(!claimed)return this.store.get(id,owner);
 try{const result=await this.generate(p,b.room_id,b.text);const lines=ReferenceLines.parse(result.lines);return await this.store.mutate(id,owner,randomUUID(),p.version,'scene_changed',{reference_id:b.request_id},q=>{const s=q.reference_plans!.find(s=>s.id===b.request_id)!;s.status='proposed';s.text=result.text;s.lines=lines.map(l=>({...l,object_ids:[]}));for(const l of s.lines)setReferenceQuantity(q,s,l,l.quantity);},'agent');}
 catch{return this.store.mutate(id,owner,randomUUID(),null,'reference_failed',{reference_id:b.request_id},q=>{const s=q.reference_plans!.find(s=>s.id===b.request_id)!;s.status='failed';s.text='生成未完成或项目已变化；原话已保留，请重试。';},'agent');}
 }
 async quantity(id:string,owner:string,b:z.infer<typeof ReferenceQuantity>){return this.store.mutate(id,owner,b.request_id,b.expected_version,'scene_changed',b,p=>{const s=plan(p,b.plan_id,b.room_id);const line=s.lines.find(l=>l.asset_id===b.asset_id);if(!line)throw new HttpError(404,'方案中没有此资产');setReferenceQuantity(p,s,line,b.quantity);});}
 async decide(id:string,owner:string,b:z.infer<typeof ReferenceDecision>){if(b.action==='accept'&&b.confirmed!==true)throw new HttpError(400,'采用必须明确确认范围');return this.store.mutate(id,owner,b.request_id,b.expected_version,'scene_changed',b,p=>{
 const s=plan(p,b.plan_id,b.room_id);const r=room(p,b.room_id);const floor=p.scene.floors.find(f=>f.id===r.floor_id)!;
 const objects=b.object_ids.map(id=>{const o=floor.furniture.find(o=>o.id===id&&o.suggestion_id===s.id&&o.room_id===r.id&&o.reference_status==='pending');if(!o)throw new HttpError(409,'范围含不存在、其他房间或已采用对象');if(o.position.x<r.bounds.x||o.position.x>=r.bounds.x+r.bounds.width||o.position.y<r.bounds.y||o.position.y>=r.bounds.y+r.bounds.depth)throw new HttpError(409,'参考家具已移出绑定房间，请先调整位置');return o;});
 if(b.action==='accept' && objects.some(o=>!hasUnitScale(o)))throw new HttpError(409,'参考家具带有不支持的缩放；请恢复缩放并用尺寸字段调整后再确认采用。');
 if(b.action==='remove'){floor.furniture=floor.furniture.filter(o=>!b.object_ids.includes(o.id));return;}
 for(const o of objects){const key=`furniture:${o.id}`;if(p.requirements.some(r=>r.field_key===key))throw new HttpError(409,'此对象已有正式需求，不能覆盖');o.reference_status='accepted';p.requirements.push({id:randomUUID(),room_id:r.id,field_key:key,value:JSON.stringify({object_id:o.id,asset_id:o.catalogId,width:o.width,depth:o.depth,height:o.height,color:o.color,elevation:o.elevation??0}),answer_state:'answered',confirmation_state:'confirmed',professional_status:'pending',source:'accepted',evidence_ids:[s.id],version:p.version+1});}
 p.evidence.push({id:randomUUID(),quote:JSON.stringify({suggestion_id:s.id,object_ids:b.object_ids,scope:'家具资产、数量与当前属性；不确认整套装修'}),source:'reference_confirmation',room_id:r.id,created_at:new Date().toISOString()});
 });}
}
