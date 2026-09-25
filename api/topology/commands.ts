import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {DomainError,distance,type SceneData,type XY} from '../model.js';
import {validateTopology} from './validate.js';
import {snapOrthogonalPoint,syncRoomsToWalls} from './rooms-from-walls.js';

const Point=z.object({x:z.number().finite().min(-1000).max(1000),y:z.number().finite().min(-1000).max(1000)}).strict();
const Base=z.object({kind:z.enum(['move-wall-endpoint','move-room-vertex','add-wall','split-wall','remove-wall','add-room-vertex','remove-room-vertex','add-opening','update-opening','remove-opening','rename-room'])});
export const TopologyCommand= z.discriminatedUnion('kind',[
 Base.extend({kind:z.literal('move-wall-endpoint'),wallId:z.string().min(1),end:z.enum(['a','b']),point:Point}),
 Base.extend({kind:z.literal('move-room-vertex'),roomId:z.string().min(1),index:z.number().int().min(0),point:Point}),
 Base.extend({kind:z.literal('add-wall'),a:Point,b:Point,thickness:z.number().min(.05).max(1).default(.15),height:z.number().min(1).max(6).default(2.8)}),
 Base.extend({kind:z.literal('split-wall'),wallId:z.string().min(1)}),
 Base.extend({kind:z.literal('remove-wall'),wallId:z.string().min(1)}),
 Base.extend({kind:z.literal('add-room-vertex'),roomId:z.string().min(1),index:z.number().int().min(0),point:Point}),
 Base.extend({kind:z.literal('remove-room-vertex'),roomId:z.string().min(1),index:z.number().int().min(0)}),
 Base.extend({kind:z.literal('add-opening'),wallId:z.string().min(1),openingKind:z.enum(['door','window']),offset:z.number().finite().min(0).max(1),width:z.number().finite().min(.3).max(5),height:z.number().finite().min(.3).max(4),sill:z.number().finite().min(0).max(3)}),
 Base.extend({kind:z.literal('update-opening'),openingId:z.string().min(1),wallId:z.string().min(1).optional(),openingKind:z.enum(['door','window']).optional(),offset:z.number().finite().min(0).max(1).optional(),width:z.number().finite().min(.3).max(5).optional(),height:z.number().finite().min(.3).max(4).optional(),sill:z.number().finite().min(0).max(3).optional()}),
 Base.extend({kind:z.literal('remove-opening'),openingId:z.string().min(1)}),
 Base.extend({kind:z.literal('rename-room'),roomId:z.string().min(1),name:z.string().trim().min(1).max(80)})
]);
export type TopologyCommandInput=z.infer<typeof TopologyCommand>;
const invalid=(message:string):never=>{throw new DomainError(422,`拓扑校验失败：${message}`)};
const near=(a:XY,b:XY)=>distance(a,b)<.01;
function moveConnected(scene:SceneData,old:XY,next:XY){for(const wall of scene.walls)for(const end of ['a','b'] as const)if(near(wall[end],old))wall[end]={...next};for(const room of scene.rooms)for(const point of room!.polygon)if(near(point,old)){point.x=next.x;point.y=next.y}}
function insertOnRoomEdges(scene:SceneData,a:XY,b:XY,mid:XY){for(const room of scene.rooms){for(let i=0;i<room!.polygon.length;i++){const next=room!.polygon[(i+1)%room!.polygon.length];const p=room!.polygon[i];if((near(p,a)&&near(next,b))||(near(p,b)&&near(next,a))){room!.polygon.splice(i+1,0,{...mid});break}}}}
export function applyTopologyCommand(input:SceneData,raw:unknown):{scene:SceneData;description:string}{
 const command=TopologyCommand.parse(raw),scene=structuredClone(input);
 switch(command.kind){
  case 'move-wall-endpoint':{const wall=scene.walls.find(w=>w.id===command.wallId);if(!wall)invalid(`找不到墙 ${command.wallId}`);const old={...wall![command.end]},fixed=wall![command.end==='a'?'b':'a'],point=snapOrthogonalPoint(fixed,command.point,10);moveConnected(scene,old,point);syncRoomsToWalls(scene);return {scene:validateTopology(scene),description:`移动墙 ${wall!.id} 的 ${command.end} 端点（连接点同步；接近水平/垂直时自动正交）`}}
  case 'move-room-vertex':{const room=scene.rooms.find(r=>r.id===command.roomId);if(!room)invalid(`找不到房间 ${command.roomId}`);if(command.index>=room!.polygon.length)invalid(`房间 ${room!.id} 不存在顶点 ${command.index}`);const old={...room!.polygon[command.index]};moveConnected(scene,old,command.point);return {scene:validateTopology(scene),description:`修正房间 ${room!.id} 的顶点 ${command.index}`}}
  case 'add-wall':{const wall={id:`wall-${randomUUID()}`,a:command.a,b:command.b,thickness:command.thickness??.15,height:command.height??2.8,structural:'unknown' as const,evidence:['topology:add']};scene.walls.push(wall);syncRoomsToWalls(scene);return {scene:validateTopology(scene),description:`补画墙线 ${wall!.id}`}}
  case 'split-wall':{const wall=scene.walls.find(w=>w.id===command.wallId);if(!wall)invalid(`找不到墙 ${command.wallId}`);if(scene.openings.some(o=>o.wallId===wall!.id))invalid(`墙 ${wall!.id} 仍有门窗引用，请先在门窗校核票处理中迁移或标记待核对`);const oldB={...wall!.b},mid={x:(wall!.a.x+wall!.b.x)/2,y:(wall!.a.y+wall!.b.y)/2};wall!.b=mid;wall!.evidence=[...new Set([...wall!.evidence,`topology:split-from:${wall!.id}`])];const second={id:`wall-${randomUUID()}`,a:{...mid},b:oldB,thickness:wall!.thickness,height:wall!.height,structural:wall!.structural,evidence:[...wall!.evidence,`topology:split-from:${command.wallId}`]};scene.walls.push(second);insertOnRoomEdges(scene,wall!.a,oldB,mid);syncRoomsToWalls(scene);return {scene:validateTopology(scene),description:`分段墙 ${command.wallId}，保留原实体并新增 ${second.id}`}}
  case 'remove-wall':{const index=scene.walls.findIndex(w=>w.id===command.wallId);if(index<0)invalid(`找不到墙 ${command.wallId}`);const refs=scene.openings.filter(o=>o.wallId===command.wallId);if(refs.length)invalid(`不能移除墙 ${command.wallId}：门窗 ${refs.map(o=>o.id).join('、')} 仍引用它，避免静默丢失引用`);scene.walls.splice(index,1);syncRoomsToWalls(scene);return {scene:validateTopology(scene),description:`移除误识别墙 ${command.wallId}`}}
  case 'rename-room':{const room=scene.rooms.find(r=>r.id===command.roomId);if(!room)invalid(`找不到区域 ${command.roomId}`);const old=room!.name;room!.name=command.name;room!.purpose=room!.purpose===old?command.name:room!.purpose;return {scene:validateTopology(scene),description:`区域重命名：${old} → ${command.name}`}}
  case 'add-room-vertex':{const room=scene.rooms.find(r=>r.id===command.roomId);if(!room)invalid(`找不到房间 ${command.roomId}`);if(command.index>=room!.polygon.length)invalid(`房间 ${room!.id} 不存在边 ${command.index}`);room!.polygon.splice(command.index+1,0,command.point);return {scene:validateTopology(scene),description:`为房间 ${room!.id} 补充轮廓顶点`}}
  case 'remove-room-vertex':{const room=scene.rooms.find(r=>r.id===command.roomId);if(!room)invalid(`找不到房间 ${command.roomId}`);if(command.index>=room!.polygon.length)invalid(`房间 ${room!.id} 不存在顶点 ${command.index}`);if(room!.polygon.length<=3)invalid(`房间 ${room!.id} 至少保留三个轮廓顶点`);const point=room!.polygon[command.index];if(scene.walls.some(w=>near(w.a,point)||near(w.b,point)))invalid(`房间 ${room!.id} 的顶点 ${command.index} 与墙连接，不能静默移除`);room!.polygon.splice(command.index,1);return {scene:validateTopology(scene),description:`移除房间 ${room!.id} 的轮廓顶点 ${command.index}`}}
  case 'add-opening':{if(!scene.walls.some(w=>w.id===command.wallId))invalid(`门窗关联墙体 ${command.wallId} 不存在`);const opening={id:`opening-${randomUUID()}`,wallId:command.wallId,kind:command.openingKind,offset:command.offset,width:command.width,height:command.height,sill:command.sill};scene.openings.push(opening);return {scene:validateTopology(scene),description:`添加${opening.kind==='door'?'门':'窗'} ${opening.id}，关联墙体 ${opening.wallId}`}}
  case 'update-opening':{const opening=scene.openings.find(o=>o.id===command.openingId);if(!opening)invalid(`找不到门窗 ${command.openingId}`);if(command.wallId!==undefined)opening!.wallId=command.wallId;if(command.openingKind!==undefined)opening!.kind=command.openingKind;if(command.offset!==undefined)opening!.offset=command.offset;if(command.width!==undefined)opening!.width=command.width;if(command.height!==undefined)opening!.height=command.height;if(command.sill!==undefined)opening!.sill=command.sill;return {scene:validateTopology(scene),description:`调整门窗 ${opening!.id} 的墙段、位置或尺寸`}}
  case 'remove-opening':{const index=scene.openings.findIndex(o=>o.id===command.openingId);if(index<0)invalid(`找不到门窗 ${command.openingId}`);const [opening]=scene.openings.splice(index,1);return {scene:validateTopology(scene),description:`移除误识别门窗 ${opening.id}`}}
 }
}
