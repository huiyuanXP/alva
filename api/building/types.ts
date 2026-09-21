import {z} from 'zod';
import type {SceneData} from '../model.js';

const Vec3=z.object({x:z.number().finite(),y:z.number().finite(),z:z.number().finite()}).strict();
const Size3=z.object({x:z.number().finite().positive(),y:z.number().finite().positive(),z:z.number().finite().positive()}).strict();
const Material=z.enum(['concrete','plaster','wood','metal','glass','floor']);
export const BuildingComponent=z.object({
 id:z.string().min(1).max(120),kind:z.enum(['floor','wall','door-frame','window-frame','glass']),topologyId:z.string().min(1).max(120),
 position:Vec3,size:Size3,rotation:z.number().finite(),material:Material,color:z.string().regex(/^#[a-fA-F0-9]{6}$/)
}).strict();
export const BuildingScene=z.object({
 units:z.literal('meters'),topologyVersion:z.number().int().positive(),topologyFingerprint:z.string().length(64).regex(/^[a-f0-9]+$/),
 components:z.array(BuildingComponent).min(1).max(1000),camera:z.object({position:Vec3,target:Vec3}).strict()
}).strict();
export type BuildingComponentData=z.infer<typeof BuildingComponent>;
export type BuildingSceneData=z.infer<typeof BuildingScene>;

const near=(a:number,b:number,tolerance=.06)=>Math.abs(a-b)<=tolerance;
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);
const center=(a:{x:number;y:number},b:{x:number;y:number})=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
const angle=(a:{x:number;y:number},b:{x:number;y:number})=>Math.atan2(b.y-a.y,b.x-a.x);
const axisDelta=(actual:number,expected:number)=>{const delta=Math.abs(Math.atan2(Math.sin(actual-expected),Math.cos(actual-expected)));return Math.min(delta,Math.abs(Math.PI-delta))};

export function validateBuildingScene(raw:unknown,topology:SceneData,version:number,fingerprint:string):BuildingSceneData{
 const scene=BuildingScene.parse(raw);
 if(scene.units!=='meters'||scene.topologyVersion!==version||scene.topologyFingerprint!==fingerprint)throw new Error('建筑输出未回指当前确认拓扑版本或来源指纹');
 const ids=new Set<string>();const kindByTopology=new Map<string,Set<string>>();for(const component of scene.components){if(ids.has(component.id))throw new Error(`建筑构件ID重复：${component.id}`);ids.add(component.id);const kinds=kindByTopology.get(component.topologyId)||new Set<string>();kinds.add(component.kind);kindByTopology.set(component.topologyId,kinds)}
 const validIds=new Set([...topology.walls,...topology.openings,...topology.rooms].map(item=>item.id));
 const referenced=new Set<string>();
 for(const component of scene.components){
  if(component.topologyId!=='floor'&&!validIds.has(component.topologyId))throw new Error(`建筑构件 ${component.id} 引用不存在的拓扑实体 ${component.topologyId}`);
  if(component.topologyId!=='floor')referenced.add(component.topologyId);
  if(component.kind==='floor'&&(component.topologyId==='floor'||topology.rooms.some(room=>room.id===component.topologyId))===false)throw new Error(`地面构件 ${component.id} 未关联房间`);
  const wall=topology.walls.find(item=>item.id===component.topologyId);
  if(wall){
   if(component.kind!=='wall')throw new Error(`墙体 ${wall.id} 的构件类型错误`);
   const len=distance(wall.a,wall.b),mid=center(wall.a,wall.b);if(!near(component.position.x,mid.x)||!near(component.position.z,mid.y)||!near(component.position.y,wall.height/2)||!near(component.size.x,len)||!near(component.size.y,wall.height)||!near(component.size.z,wall.thickness)||axisDelta(component.rotation,angle(wall.a,wall.b))>.06)throw new Error(`墙体构件 ${component.id} 未保持墙 ${wall.id} 的坐标、尺寸或方向`);
  }
  const opening=topology.openings.find(item=>item.id===component.topologyId);
  if(opening){
   if(!['door-frame','window-frame','glass'].includes(component.kind))throw new Error(`门窗 ${opening.id} 的构件类型错误`);
   const wallForOpening=topology.walls.find(item=>item.id===opening.wallId);if(!wallForOpening)throw new Error(`门窗 ${opening.id} 的墙体不存在`);
   const len=distance(wallForOpening.a,wallForOpening.b),a=angle(wallForOpening.a,wallForOpening.b),point={x:wallForOpening.a.x+Math.cos(a)*opening.offset*len,y:wallForOpening.a.y+Math.sin(a)*opening.offset*len};
   if(!near(component.position.x,point.x)||!near(component.position.z,point.y)||!near(component.position.y,opening.sill+opening.height/2)||!near(component.size.x,opening.width)||!near(component.size.y,opening.height)||axisDelta(component.rotation,a)>.06)throw new Error(`门窗构件 ${component.id} 未保持开口 ${opening.id} 的位置或尺寸`);
  }
 }
 for(const room of topology.rooms)if(!kindByTopology.get(room.id)?.has('floor'))throw new Error(`缺少房间 ${room.id} 的地面构件`);
 for(const wall of topology.walls)if(!referenced.has(wall.id))throw new Error(`缺少墙体 ${wall.id} 的建筑构件`);
 for(const opening of topology.openings){const kinds=kindByTopology.get(opening.id);if(!kinds)throw new Error(`缺少门窗 ${opening.id} 的建筑构件`);if(opening.kind==='door'&&!kinds.has('door-frame'))throw new Error(`门 ${opening.id} 缺少门框构件`);if(opening.kind==='window'&&(!kinds.has('window-frame')||!kinds.has('glass')))throw new Error(`窗 ${opening.id} 缺少窗框或玻璃构件`)}
 return scene;
}
