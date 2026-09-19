import { z } from 'zod';
import { Command, Id, type ProjectData } from '../../packages/contracts/index.js';
import { HttpError } from './store.js';
import { hasUnitScale } from './reference-integrity.js';
import { furnitureCatalog } from '../../vendor/openplan3d/src/lib/utils/furnitureCatalog.js';
const size = z.number().finite().min(1).max(2000);
export const ObjectUpdate = Command.extend({room_id: Id, object_id: Id, confirmed: z.literal(true), patch: z.object({width:size.optional(), depth:size.optional(), height:size.optional(), elevation:z.number().finite().min(0).max(1000).optional(), color:z.string().regex(/^#[0-9a-fA-F]{6}$/).optional()}).strict().refine(p=>Object.keys(p).length>0)}).strict();
export function objectInfo(p:ProjectData, id:string) {
 const floor=p.scene.floors.find(f=>f.furniture.some(o=>o.id===id));
 const item=floor?.furniture.find(o=>o.id===id);
 if(!floor || !item) throw new HttpError(404,'家具不存在');
 const rooms=p.rooms.filter(r=>r.floor_id===floor.id && item.position.x>=r.bounds.x && item.position.x<r.bounds.x+r.bounds.width && item.position.y>=r.bounds.y && item.position.y<r.bounds.y+r.bounds.depth);
 if(rooms.length!==1) throw new HttpError(400,'家具无法唯一关联房间');
 if(item.suggestion_id && item.room_id!==rooms[0].id) throw new HttpError(409,'参考家具仍绑定原房间，请先将它移回后再编辑；不会修改其他房间需求。');
 const def=furnitureCatalog.find(c=>c.id===item.catalogId);
 const scaled=!hasUnitScale(item);
 const supported=!!def && !def.symbol && !scaled;
 return {project_version:p.version, item, room_id:rooms[0].id, values:{width:item.width??def?.width,depth:item.depth??def?.depth,height:item.height??def?.height,elevation:item.elevation??0,color:item.color??def?.color}, capabilities:{size:supported,color:supported,elevation:supported,material:false,reason:supported?'原生程序模型暂不支持替换材质贴图；颜色可单独编辑。':scaled?'此家具带有平面缩放；请先在平面编辑器恢复缩放后编辑尺寸、颜色或高度。':'此目录对象没有可编辑的 3D 模型。'}};
}
export function updateObject(p:ProjectData,b:z.infer<typeof ObjectUpdate>){
 const info=objectInfo(p,b.object_id);
 if(info.room_id!==b.room_id)throw new HttpError(400,'家具与房间不匹配');
 if(!info.capabilities.size)throw new HttpError(400,info.capabilities.reason);
 if(p.requirements.some(r=>r.field_key===`furniture:${b.object_id}` && r.room_id!==info.room_id))throw new HttpError(409,'家具与正式需求的房间绑定不一致，未保存任何字段。');
 Object.assign(info.item,b.patch);
 const evidenceId=crypto.randomUUID();
 for(const requirement of p.requirements.filter(r=>r.field_key===`furniture:${b.object_id}`)){
   const previous=JSON.parse(String(requirement.value));
   requirement.value=JSON.stringify({...previous,...b.patch});requirement.version=p.version+1;
   requirement.evidence_ids.push(evidenceId);requirement.source='manual';
 }

 p.evidence.push({id:evidenceId,quote:JSON.stringify({object_id:b.object_id,room_id:b.room_id,patch:b.patch,request_id:b.request_id}),source:'manual_object_confirmation',room_id:b.room_id,created_at:new Date().toISOString()});
}
