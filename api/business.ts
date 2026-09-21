import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {intakeCatalogue} from '../packages/contracts/intake.js';
import {validateScene,itemFromAsset,pointInPolygon,reject,Item,type Project,type Change,type Finding,type SceneData} from './model.js';
const disabledQuestions=new Set(['Q19','Q20','Q21','Q22','Q58','Q60']);
const questionOverrides:Record<string,{question?:string;group?:string;choices?:[string,string,string,string]}>= {
 Q01:{choices:['先形成可转交设计师的需求任务书','先看整体空间方向','先解决一个重点房间','先梳理优先级与取舍']},
 Q18:{question:'当空间或条件受限时，哪两件事最不能牺牲？'},
 Q23:{group:'时间安排'},
 Q24:{group:'时间安排',choices:['基本起居与收纳先做，装饰和非必要单品后补','所有空间一次完成','先完成一个示范房间','按每阶段完成条件推进']},
 Q39:{choices:['好维护的表面，并索取具体产品资料','真实木质触感','耐磨易清洁','耐久与可维护优先，并保留必要验证']},
};
export const catalogue=intakeCatalogue.map(q=>{
 const disabled=disabledQuestions.has(q.id),override=questionOverrides[q.id]||{};
 return {...q,...override,delivery_sections:disabled?[]:q.delivery_sections.filter(section=>section!=='D07'),...(disabled?{field_key:'disabled',group:'已停用',question:'此题在当前范围已停用。',choices:['当前不收集','保留题号','稍后再议','不适用'] as [string,string,string,string],factual:false}:{}),enabled:!disabled};
});
export const ChangeSchema=z.object({action:z.enum(['add','update','remove','copy','transfer','purpose','wall']),targetId:z.string(),values:z.record(z.string(),z.unknown())}).strict();
export function applyChanges(scene:SceneData,changes:Change[],professional=false):SceneData{
 const s=structuredClone(scene);
 for(const change of changes){const room=s.rooms.find(r=>r.id===change.targetId),wall=s.walls.find(w=>w.id===change.targetId),item=s.items.find(i=>i.id===change.targetId);
  if(change.action==='wall'){
   if(!wall||wall.structural!=='nonloadbearing'||!wall.evidence.length||!professional)reject('墙体拆改须已授权专业角色及非承重证据；比例校准不构成许可',403);
   if(s.openings.some(o=>o.wallId===wall!.id))reject('须先明确门窗迁移方案');Object.assign(wall!,change.values);continue;
  }
  if(change.action==='purpose'){if(!room)reject('房间不存在');if(room!.locked)reject('房间已锁定');const v=z.object({purpose:z.string().min(1).max(120)}).strict().parse(change.values);room!.purpose=v.purpose;continue}
  if(change.action==='add'){
   const v=z.object({assetId:z.string(),roomId:z.string(),x:z.number(),y:z.number(),newId:z.string().uuid().optional()}).strict().parse(change.values);const r=s.rooms.find(r=>r.id===v.roomId);if(!r||r.locked)reject('目标房间无效或已锁定');const added=itemFromAsset(v.assetId,v.roomId,v.x,v.y);if(v.newId)added.id=v.newId;s.items.push(added);continue;
  }
  if(!item)reject('家具实例不存在');if(item!.locked||s.rooms.find(r=>r.id===item!.roomId)?.locked)reject('家具或房间已锁定，请单独解除');
  if(change.action==='remove'){s.items=s.items.filter(i=>i.id!==item!.id);continue}
  if(change.action==='copy'||change.action==='transfer'){
   const v=z.object({roomId:z.string(),x:z.number(),y:z.number(),newId:z.string().uuid().optional()}).strict().parse(change.values);const r=s.rooms.find(r=>r.id===v.roomId);if(!r||r.locked)reject('目标房间无效或已锁定');const cloned={...item!,id:v.newId||randomUUID(),sourceId:item!.id,roomId:v.roomId,x:v.x,y:v.y};if(change.action==='transfer')s.items=s.items.filter(i=>i.id!==item!.id);s.items.push(cloned);continue;
  }
  if(change.action==='update'){
   const patch=Item.omit({id:true,roomId:true,locked:true,sourceId:true}).partial().strict().parse(change.values);Object.assign(item!,patch);
  }
 }
 return validateScene(s);
}
export function applyAnswer(p:Project,raw:unknown){
 const b=z.object({questionId:z.string(),roomId:z.string().nullable(),text:z.string().max(3000),state:z.enum(['answered','unknown','skipped','not_applicable']),locked:z.boolean(),confirmed:z.literal(true)}).strict().parse(raw);
 const q=catalogue.find(q=>q.id===b.questionId);if(!q?.enabled)reject('问题不存在或已禁用');if(q!.scope==='room'&&!p.scene?.rooms.some(r=>r.id===b.roomId))reject('请选择有效房间');if(q!.scope==='project'&&b.roomId!==null)reject('项目问题不能写入房间范围');if(b.state==='answered'&&!b.text.trim())reject('请填写回答或选择独立状态');
 const previous=p.answers.find(a=>a.questionId===b.questionId&&a.roomId===b.roomId);if(previous?.locked)reject('该回答已锁定，请先解除锁定');
 const quote=b.state==='answered'?b.text:({unknown:'暂不确定',skipped:'跳过',not_applicable:'不适用'}[b.state]);const id=randomUUID();p.evidence.push({id,quote,source:'questionnaire',...(b.roomId?{roomId:b.roomId}:{}),createdAt:new Date().toISOString()});
 const answer={...b,evidenceId:id};p.answers=p.answers.filter(a=>!(a.questionId===b.questionId&&a.roomId===b.roomId));p.answers.push(answer);p.dirty=true;
}
export function review(p:Project,stage:'intake'|'review'):Finding[]{
 const findings:Finding[]=[];if(!p.scene)return findings;const scene=p.scene;
 const add=(kind:Finding['kind'],title:string,reason:string,suggestion:string,objectIds:string[],roomIds:string[],evidenceIds:string[]=[],confidence:Finding['confidence']='medium')=>findings.push({id:`${stage}-${kind}-${title}-${objectIds.join('-')}`,kind,title,reason,suggestion,objectIds,roomIds,evidenceIds,confidence,status:'pending',stage});
 const positive=(pattern:RegExp,negative:RegExp)=>p.evidence.filter(e=>pattern.test(e.quote)&&!negative.test(e.quote));
 const coffee=positive(/咖啡/,/不喝咖啡|不需要咖啡|没有咖啡/),pets=positive(/宠物|狗|猫/,/不养|没有宠物|无宠物/),plants=positive(/绿植|植物|采光|光照/,/不要绿植|不需要绿植|没有植物/);
 const overlap=(a:typeof scene.items[number],b:typeof scene.items[number])=>{
  const corners=(i:typeof a)=>{const angle=i.rotation*Math.PI/180;return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:i.x+x*i.width/2*Math.cos(angle)-y*i.depth/2*Math.sin(angle),y:i.y+x*i.width/2*Math.sin(angle)+y*i.depth/2*Math.cos(angle)}))};
  const A=corners(a),B=corners(b);for(const poly of [A,B])for(let j=0;j<2;j++){const edge={x:poly[j+1].x-poly[j].x,y:poly[j+1].y-poly[j].y},axis={x:-edge.y,y:edge.x};const av=A.map(p=>p.x*axis.x+p.y*axis.y),bv=B.map(p=>p.x*axis.x+p.y*axis.y);if(Math.max(...av)<=Math.min(...bv)+.0001||Math.max(...bv)<=Math.min(...av)+.0001)return false}return true;
 };
 for(const item of scene.items){const room=scene.rooms.find(r=>r.id===item.roomId)!;
  if(!pointInPolygon({x:item.x,y:item.y},room.polygon))add('geometry','家具中心超出房间',`${item.name}当前坐标超出所属空间。`,'移回房间或使用跨房间转移。',[item.id],[room.id],[], 'high');
  for(const other of scene.items){if(item.id<other.id&&overlap(item,other)&&item.height>.1&&other.height>.1)add('geometry','家具占地重叠',`${item.name}与${other.name}占用的平面区域重叠。`,'调整位置并检查实际使用空间。',[item.id,other.id],[room.id],[],'high')}
  if(coffee.length&&item.assetId==='alva-table'&&item.width<.8)add('furniture','咖啡操作空间待补充','现有台面宽度可能只够设备，未留明确的磨粉、压粉和清洁操作区。','确认设备尺寸与工作流程，再预留侧方操作面。',[item.id],[room.id],coffee.map(e=>e.id));
  if(pets.length&&item.assetId==='alva-sofa'&&item.clearance>=.06&&item.clearance<=.22)add('behavior','宠物玩具可能滚入沙发底','若玩具直径小于底部空隙，取回玩具可能不便；玩具实际尺寸尚待确认。','考虑贴地底座或可拆挡条，并确认清洁方式。',[item.id],[room.id],pets.map(e=>e.id));
  if(plants.length&&item.assetId==='alva-plant'&&item.height>1.4){const near=scene.openings.some(o=>{if(o.kind!=='window')return false;const w=scene.walls.find(w=>w.id===o.wallId)!;return Math.hypot(item.x-w.a.x-(w.b.x-w.a.x)*o.offset,item.y-w.a.y-(w.b.y-w.a.y)*o.offset)<.8});if(near)add('requirement','高绿植可能遮挡采光','高绿植靠近窗户，可能与保留采光的偏好冲突；遮挡程度需要现场确认。','降低植物高度或侧移，比较日照预览。',[item.id],[room.id],plants.map(e=>e.id))}
  if(item.material==='stone'||item.material==='glass')add('professional','材料支撑待专业核实','缺少重量、连接与支撑证据，无法判断承载是否成立。','由设计师或相关专业人员补齐材料与支撑资料。',[item.id],[room.id],[],'low');
 }
 for(const door of scene.openings.filter(o=>o.kind==='door')){const w=scene.walls.find(w=>w.id===door.wallId)!,x=w.a.x+(w.b.x-w.a.x)*door.offset,y=w.a.y+(w.b.y-w.a.y)*door.offset;const items=scene.items.filter(i=>Math.hypot(i.x-x,i.y-y)<Math.max(i.width,i.depth)/2+.45);if(items.length)add('navigation','门口通行空间受挤占','家具靠近门洞，可能阻碍开门或通行。','检查门扇与实际通道，调整家具位置。',items.map(i=>i.id),[...new Set(items.map(i=>i.roomId))]);}
 return findings;
}
