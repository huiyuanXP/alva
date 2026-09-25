import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {reject,type Project} from './model.js';
import {divideRoomByVirtualLine,zoneFromThreeWalls} from './zones.js';
const Point=z.object({x:z.number().finite(),y:z.number().finite()}).strict();
export const ZoneOperation=z.discriminatedUnion('kind',[
 z.object({kind:z.literal('divide'),a:Point,b:Point}).strict(),
 z.object({kind:z.literal('three-wall'),point:Point}).strict(),
 z.object({kind:z.literal('rename'),zoneId:z.string().min(1),name:z.string().trim().min(1).max(80)}).strict(),
 z.object({kind:z.literal('remove'),zoneId:z.string().min(1)}).strict(),
]);
export function applyZoneOperation(p:Project,input:z.infer<typeof ZoneOperation>){
 const b=ZoneOperation.parse(input);
 if(p.candidate||!p.scene||!p.confirmedTopology)reject('请先确认户型，再进行功能分区');
 let description:string;
 if(b.kind==='divide'){
  const zones=divideRoomByVirtualLine(p.scene!,b.a,b.b,(p.zones?.length||0)+1),roomId=zones[0]!.roomId;
  if(p.scene!.rooms.find(r=>r.id===roomId)?.locked)reject('房间已锁定，不能修改分区');
  p.zones=[...(p.zones||[]).filter(z=>z.roomId!==roomId),...zones];description=`新增虚拟分区线并形成 ${zones.length} 个功能区`;
 }else if(b.kind==='three-wall'){
  const zone=zoneFromThreeWalls(p.scene!,b.point,(p.zones?.length||0)+1);
  if(p.scene!.rooms.find(r=>r.id===zone.roomId)?.locked)reject('房间已锁定，不能修改分区');
  p.zones=[...(p.zones||[]),zone];description=`根据三面墙形成新功能区“${zone.name}”`;
 }else{
  const zone=(p.zones||[]).find(z=>z.id===b.zoneId);if(!zone)reject('功能区不存在');
  if(p.scene!.rooms.find(r=>r.id===zone!.roomId)?.locked)reject('房间已锁定，不能修改分区');
  if(b.kind==='rename'){zone!.name=b.name;description=`功能区重命名为“${b.name}”`}
  else{p.zones=(p.zones||[]).filter(z=>z.id!==b.zoneId);description='删除功能区'}
 }
 p.dirty=true;p.changes.push({id:randomUUID(),description,evidenceIds:[],context:['功能分区不新增实体墙，不改变已确认拓扑或建筑3D结构'],createdAt:new Date().toISOString()});
}
