import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {runCodex,type CodexInput} from '../codex.js';
import type {Project,SceneData} from '../model.js';
import {BuildingScene,validateBuildingScene,type BuildingSceneData} from './types.js';
import {normalizeStructuredOutput} from '../import.js';

export type BuildingCodexCall=(input:CodexInput)=>Promise<string>;
export function buildingGenerationModel(){return process.env.OPENAI_BUILDING_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||'gpt-5.5'}
const normalizeGeneratedOutput=(raw:unknown,topology:SceneData,version:number,fingerprint:string):unknown=>{
 if(!raw||typeof raw!=='object')return raw;const source=raw as any;if(source.topologyVersion!==undefined&&source.topologyVersion!==version)throw new Error('建筑输出回指的拓扑版本不匹配');if(source.topologyFingerprint!==undefined&&source.topologyFingerprint!==fingerprint)throw new Error('建筑输出回指的拓扑指纹不匹配');const provided=Array.isArray(source.components)?source.components:Array.isArray(source.items)?source.items:[];
 const materialAliases:Record<string,string>={wall:'plaster',wall_finish:'plaster',flooring:'floor',floor_finish:'floor',tile:'floor',metal_frame:'metal',window_frame:'metal',glass_panel:'glass'};
 const style=(topologyId:string,kind:string,material:string,color:string)=>{const match=provided.find((c:any)=>c?.topologyId===topologyId&&c?.kind===kind)||provided.find((c:any)=>c?.topologyId===topologyId);const m=typeof match?.material==='string'?(materialAliases[match.material]||match.material):material,c=typeof match?.color==='string'&&/^#?[a-f0-9]{6}$/i.test(match.color)?(match.color.startsWith('#')?match.color:`#${match.color}`):color;return {material:['concrete','plaster','wood','metal','glass','floor'].includes(m)?m:material,color:c}};
 const components:any[]=[];
 for(const room of topology.rooms){const xs=room.polygon.map(point=>point.x),ys=room.polygon.map(point=>point.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);components.push({id:`floor-${room.id}`,kind:'floor',topologyId:room.id,position:{x:(minX+maxX)/2,y:0,z:(minY+maxY)/2},size:{x:Math.max(maxX-minX,.01),y:.08,z:Math.max(maxY-minY,.01)},rotation:0,...style(room.id,'floor','floor','#D9D1C3')})}
 for(const wall of topology.walls){const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y,len=Math.hypot(dx,dy);components.push({id:`wall-${wall.id}`,kind:'wall',topologyId:wall.id,position:{x:(wall.a.x+wall.b.x)/2,y:wall.height/2,z:(wall.a.y+wall.b.y)/2},size:{x:Math.max(len,.01),y:Math.max(wall.height,.01),z:Math.max(wall.thickness,.01)},rotation:Math.atan2(dy,dx),...style(wall.id,'wall','plaster','#FFFFFF')})}
 for(const opening of topology.openings){const wall=topology.walls.find(item=>item.id===opening.wallId);if(!wall)continue;const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y,len=Math.hypot(dx,dy),rotation=Math.atan2(dy,dx),position={x:wall.a.x+opening.offset*dx,y:opening.sill+opening.height/2,z:wall.a.y+opening.offset*dy};if(opening.kind==='door')components.push({id:`door-${opening.id}`,kind:'door-frame',topologyId:opening.id,position,size:{x:Math.max(opening.width,.01),y:Math.max(opening.height,.01),z:.12},rotation,...style(opening.id,'door-frame','wood','#8B6B4A')});else{components.push({id:`window-${opening.id}`,kind:'window-frame',topologyId:opening.id,position,size:{x:Math.max(opening.width,.01),y:Math.max(opening.height,.01),z:.12},rotation,...style(opening.id,'window-frame','metal','#6D7478')});components.push({id:`glass-${opening.id}`,kind:'glass',topologyId:opening.id,position,size:{x:Math.max(opening.width,.01),y:Math.max(opening.height,.01),z:.03},rotation,...style(opening.id,'glass','glass','#9FC4CF')})}}
 const pts=topology.walls.flatMap(w=>[w.a,w.b]),xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),cx=xs.length?(Math.min(...xs)+Math.max(...xs))/2:0,cz=ys.length?(Math.min(...ys)+Math.max(...ys))/2:0,span=Math.max(xs.length?Math.max(...xs)-Math.min(...xs):6,ys.length?Math.max(...ys)-Math.min(...ys):6,6),camera=source.camera&&source.camera.position&&source.camera.target?source.camera:{position:{x:cx+span*.9,y:Math.max(6,span*.75),z:cz+span*.9},target:{x:cx,y:1,z:cz}};
 return {units:'meters',topologyVersion:version,topologyFingerprint:fingerprint,components,camera};
};
const strictSchema=()=>{const schema=z.toJSONSchema(BuildingScene);const strict=(node:any)=>{if(!node||typeof node!=='object')return;if(node.properties){node.required=Object.keys(node.properties);node.additionalProperties=false}delete node.default;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(strict);else if(value&&typeof value==='object')strict(value)};strict(schema);return schema};
export function buildingPrompt(project:Project,topology:SceneData,version:number,fingerprint:string){
 const source=project.sourceImage?{filename:project.sourceImage.filename,mime:project.sourceImage.originalMime,page:project.sourceImage.page,pages:project.sourceImage.pages}:null;
 return `你是 alva 建筑场景生成器。只返回符合输出schema的JSON，不要Markdown、HTML、脚本或解释。必须严格把已确认拓扑当作硬约束，禁止新增、删除、移动、缩放或重命名墙、门窗、房间；不要生成家具、资产、施工建议或专业结论。
输入来源：${JSON.stringify(source)}。确认拓扑版本：${version}，来源指纹：${fingerprint}。单位必须是米，世界坐标 x向右、y向上、z对应拓扑平面y。
建筑输出要求：每个房间至少一个 kind=floor、topologyId=房间ID 的地面构件；每面墙一个 kind=wall、topologyId=墙ID 的墙构件，position严格按 {x=平面x, y=竖向高度, z=平面y}，墙中心的 y=墙高/2，size严格按 {x=墙长, y=墙高, z=墙厚}，rotation是墙在平面的弧度；每个门至少一个 door-frame，每个窗至少一个 window-frame 和一个 glass，构件 topologyId 使用对应门窗ID，位置、尺寸、朝向必须与开口严格一致。门窗中心必须按公式 position.x=wall.a.x+opening.offset*(wall.b.x-wall.a.x)，position.z=wall.a.y+opening.offset*(wall.b.y-wall.a.y)，position.y=opening.sill+opening.height/2，size.x=opening.width、size.y=opening.height；不要把 opening.offset 当作绝对坐标。地面 position.y 必须为0，不能把平面 y 写到 position.y；camera 也使用 {x=平面x,y=竖向高度,z=平面y}。所有构件ID唯一，material 只能逐字使用 concrete、plaster、wood、metal、glass、floor 之一，绝不能使用 wall、stone 或自然语言材质；color 必须逐字是带 # 的六位十六进制字符串，例如 #FFFFFF，不能省略 #、不能写颜色名称。camera给出能看到全屋的米制位置和target。topologyVersion和topologyFingerprint必须原样回填。
格式示例（仅示意字段语义，数值必须根据当前拓扑计算）：{"kind":"wall","position":{"x":3,"y":1.4,"z":0},"size":{"x":6,"y":2.8,"z":0.15},"rotation":0,"material":"plaster","color":"#FFFFFF"}。
当前确认拓扑JSON：${JSON.stringify(topology)}`;
}

export async function generateBuilding(project:Project,topology:SceneData,version:number,fingerprint:string,signal?:AbortSignal,codex:BuildingCodexCall=runCodex):Promise<BuildingSceneData>{
 const image=project.sourceImage?`data:${project.sourceImage.mime};base64,${project.sourceImage.data}`:undefined;
 const base=buildingPrompt(project,topology,version,fingerprint),input={images:image?[image]:[],model:buildingGenerationModel(),outputSchema:strictSchema(),signal};
 const raw=await codex({text:base,...input});
 try{return validateBuildingScene(normalizeGeneratedOutput(JSON.parse(normalizeStructuredOutput(raw)),topology,version,fingerprint),topology,version,fingerprint)}catch(error){
  if(signal?.aborted)throw error;
  const repaired=await codex({text:`${base}\n上一轮输出未通过服务端校验：${error instanceof Error?error.message:'结构无效'}。请只修正这些问题并返回完整JSON；不要改变任何拓扑实体、坐标、开口、房间关系或版本指纹。特别检查：position.y 是竖向高度、position.z 才是拓扑平面 y；material 只能是 concrete/plaster/wood/metal/glass/floor；每个 color 必须补齐为 # 加六位十六进制（如 #FFFFFF）。上一轮输出：${raw.slice(0,120000)}`,...input});
  return validateBuildingScene(normalizeGeneratedOutput(JSON.parse(normalizeStructuredOutput(repaired)),topology,version,fingerprint),topology,version,fingerprint);
 }
}

export function buildingFailureMessage(error:unknown){const message=error instanceof Error?error.message:String(error||'');if(/429|too many requests|retry limit/i.test(message))return '建筑生成模型当前请求受限（429），与户型拓扑本身无关。请稍后重试，或为 OPENAI_BUILDING_MODEL 切换可用模型。';return message||'建筑生成失败，请重试';}
export const buildingRequestId=()=>randomUUID();
