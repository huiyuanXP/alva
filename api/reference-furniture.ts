import type {FastifyInstance} from 'fastify';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {applyChanges,review} from './business.js';
import {DomainError,reject,type Project,type ItemData} from './model.js';
import {listReferenceBatches,type ReferenceBatch} from './references.js';
import type {AlvaStore,Session} from './store.js';

const Command=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0)});
const categories:Record<string,string[]>={
 'alva-sofa':['沙发','sofa','座椅','会客'], 'alva-table':['桌','书桌','餐桌','工作台','table','desk','台面'],
 'alva-bed':['床','bed','睡眠'], 'alva-chair':['椅','chair','座椅'], 'alva-cabinet':['柜','收纳','cabinet','storage'],
 'alva-plant':['绿植','植物','plant'], 'alva-coffee':['咖啡','coffee','咖啡机']
};
export type ReferenceFurnitureCandidate={assetId:string;name:string;license:string;width:number;depth:number;height:number;material:string;color:string;matchReasons:string[];dimensionBasis:'licensed-asset-defaults';measurementStatus:'not-measured';referenceGeometryReliable:false;source:{batchId:string;filename:string;annotationIds:string[];confirmedFeatures:string[]}};

function textFor(batch:ReferenceBatch){return [batch.sourceText,...batch.annotations.filter(a=>a.status==='confirmed').map(a=>a.feature)].join(' ').toLowerCase()}
export function referenceFurnitureCandidates(project:Project,batch:ReferenceBatch):ReferenceFurnitureCandidate[]{
 if(batch.status!=='confirmed')throw new DomainError(422,'只有已确认的参考图偏好才能匹配家具');
 const confirmed=batch.annotations.filter(a=>a.status==='confirmed'),text=textFor(batch),licensed=project.assets.filter(a=>typeof a.license==='string'&&a.license.trim());
 if(!licensed.length)throw new DomainError(422,'当前项目没有可用的许可家具资产，不能从参考图伪造资产');
 const ranked=licensed.map(asset=>{const matched=(categories[asset.id]||[]).filter(k=>text.includes(k.toLowerCase()));return {asset,matched,score:matched.length}}).sort((a,b)=>b.score-a.score||a.asset.name.localeCompare(b.asset.name,'zh-CN'));
 const chosen=(ranked.some(x=>x.score>0)?ranked.filter(x=>x.score>0):ranked).slice(0,3);
 return chosen.map(({asset,matched})=>({assetId:asset.id,name:asset.name,license:asset.license,width:asset.width,depth:asset.depth,height:asset.height,material:asset.material,color:asset.color,matchReasons:matched.length?matched.map(k=>`已确认文字包含“${k}”`):['没有可靠的类别文字命中，仅列出许可目录候选供人工比较'],dimensionBasis:'licensed-asset-defaults',measurementStatus:'not-measured',referenceGeometryReliable:false,source:{batchId:batch.id,filename:batch.filename,annotationIds:confirmed.map(a=>a.id),confirmedFeatures:confirmed.map(a=>a.feature)}}));
}
async function confirmedBatch(store:AlvaStore,projectId:string,batchId:string){const batch=(await listReferenceBatches(store,projectId)).find(b=>b.id===batchId);if(!batch)reject('参考图不存在',404);if(batch!.status!=='confirmed')reject('参考图偏好尚未确认');return batch!}

export function registerReferenceFurniture(app:FastifyInstance,store:AlvaStore,session:(r:object)=>Session){
 const owner=(req:object)=>{const s=session(req);if(s.role!=='owner')reject('仅业主可确认参考家具',403);return s};
 app.get('/api/reference-furniture/:batchId/candidates',async req=>{const s=session(req),batch=await confirmedBatch(store,s.projectId,(req.params as {batchId:string}).batchId),project=await store.get(s.projectId);return {status:'comparison_only',revision:project.revision,batch:{id:batch.id,filename:batch.filename,roomId:batch.roomId,sourceText:batch.sourceText},rule:'参考图不提供可靠几何；尺寸均来自许可资产目录默认值，尚未实测。',candidates:referenceFurnitureCandidates(project,batch)}});
 app.post('/api/reference-furniture/reject',async req=>{const s=owner(req),b=Command.extend({batchId:z.string(),assetId:z.string(),confirmed:z.literal(true)}).strict().parse(req.body),project=await store.get(s.projectId);if(project.revision!==b.expectedRevision)reject('项目已更新，请重新比较候选',409);const batch=await confirmedBatch(store,s.projectId,b.batchId),candidate=referenceFurnitureCandidates(project,batch).find(c=>c.assetId===b.assetId);if(!candidate)reject('候选资产已不可用，请重新比较');return {rejected:true,sceneChanged:false,revision:project.revision,assetId:b.assetId}});
 app.post('/api/reference-furniture/confirm',async req=>{const s=owner(req),b=Command.extend({batchId:z.string(),assetId:z.string(),roomId:z.string(),x:z.number().finite(),y:z.number().finite(),rotation:z.number().finite().optional(),confirmed:z.literal(true)}).strict().parse(req.body),batch=await confirmedBatch(store,s.projectId,b.batchId);return store.mutate(s.projectId,b.requestId,b.expectedRevision,'reference-furniture-confirm',b,(p:Project)=>{
   if(!p.scene)reject('请先确认户型');if(batch.roomId&&batch.roomId!==b.roomId)reject('参考图限定了作用房间，请在原房间内确认家具');const room=p.scene!.rooms.find(r=>r.id===b.roomId);if(!room||room.locked)reject('目标房间不存在或已锁定');const candidate=referenceFurnitureCandidates(p,batch).find(c=>c.assetId===b.assetId);if(!candidate)reject('候选资产已不可用，请重新比较');const matched=candidate!;const id=randomUUID(),next=applyChanges(p.scene!,[{action:'add',targetId:b.roomId,values:{assetId:b.assetId,roomId:b.roomId,x:b.x,y:b.y,rotation:b.rotation||0,newId:id}}]);const item=next.items.find(i=>i.id===id)! as ItemData;item.sourceId=`reference:${batch.id}`;item.referenceSource={batchId:batch.id,annotationIds:matched.source.annotationIds,assetId:matched.assetId,license:matched.license,dimensionBasis:'licensed-asset-defaults',measurementStatus:'not-measured',referenceGeometryReliable:false};p.scene=next;p.dirty=true;p.findings=[...p.findings.filter(f=>f.stage!=='review'),...review(p,'review')];p.changes.push({id:randomUUID(),description:`从参考图候选确认家具：${matched.name}`,evidenceIds:p.findings.filter(f=>f.objectIds.includes(`reference:${batch.id}`)).flatMap(f=>f.evidenceIds),context:[`参考图 ${batch.filename} 仅用于视觉匹配`,`资产 ${matched.assetId}；许可 ${matched.license}`,`尺寸 ${matched.width}×${matched.depth}×${matched.height}m 来自许可资产目录默认值，未实测；没有使用参考图几何`],createdAt:new Date().toISOString()})
  })});
}
