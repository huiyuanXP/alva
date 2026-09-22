import {runCodex,type CodexInput} from './codex.js';
import {Scene,validateScene,type SceneData} from './model.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';

export type LayoutCodexCall=(input:CodexInput)=>Promise<string>;

/** Dedicated model routing for floor-plan vision + structured output. */
export function layoutRecognitionModel(){
 return process.env.OPENAI_VISION_MODEL?.trim()||process.env.OPENAI_MODEL?.trim()||'gpt-5.5';
}

/**
 * Normalize provider text into the JSON payload promised by outputSchema.
 * Bare JSON passes through unchanged; Markdown fences or surrounding prose are tolerated.
 */
export function normalizeStructuredOutput(raw:string){
 let text=raw.trim();
 const fenced=text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
 if(fenced)text=fenced[1].trim();
 if(text.startsWith('{')||text.startsWith('['))return text;
 const objectStart=text.indexOf('{'),arrayStart=text.indexOf('[');
 const candidates=[objectStart,arrayStart].filter(i=>i>=0),start=candidates.length?Math.min(...candidates):-1;
 if(start<0)return text;
 const stack:string[]=[];let quoted=false,escaped=false;
 for(let i=start;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}
  if(ch==='"'){quoted=true;continue}
  if(ch==='{'||ch==='[')stack.push(ch);
  else if(ch==='}'||ch===']'){
   const expected=ch==='}'?'{':'[';
   if(stack.at(-1)!==expected)break;
   stack.pop();if(!stack.length)return text.slice(start,i+1).trim();
  }
 }
 return text.slice(start).trim();
}

export function normalizeSceneContract(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return value;
 const raw=structuredClone(value as Record<string,any>),metadata=raw.metadata&&typeof raw.metadata==='object'?raw.metadata:{};
 const point=(p:any)=>Array.isArray(p)&&p.length>=2?{x:Number(p[0]),y:Number(p[1])}:p;
 raw.walls=Array.isArray(raw.walls)?raw.walls.map((wall:any)=>({...wall,a:point(wall.a),b:point(wall.b),evidence:Array.isArray(wall.evidence)?wall.evidence:[]})):raw.walls;
 raw.rooms=Array.isArray(raw.rooms)?raw.rooms.map((room:any)=>{const name=typeof room.name==='string'&&room.name.trim()?room.name:typeof room.purpose==='string'&&room.purpose.trim()?room.purpose:'用途待确认';return {id:room.id,name,purpose:typeof room.purpose==='string'&&room.purpose.trim()?room.purpose:name,polygon:Array.isArray(room.polygon)?room.polygon.map(point):room.polygon,locked:typeof room.locked==='boolean'?room.locked:false}}):raw.rooms;
 raw.openings=Array.isArray(raw.openings)?raw.openings.map((opening:any)=>({id:opening.id,wallId:opening.wallId,kind:opening.kind??opening.type,offset:opening.offset,width:opening.width,height:opening.height,sill:opening.sill??opening.sillHeight??0})):raw.openings;
 raw.items=[];
 raw.calibration=null;
 const geography=raw.geography&&typeof raw.geography==='object'?raw.geography:metadata;
 raw.geography={latitude:Number(geography.latitude??31),north:Number(geography.north??0),assumption:typeof geography.assumption==='string'&&geography.assumption.trim()?geography.assumption:'暂用纬度31°、图上方为北；待用户确认'};
 delete raw.metadata;
 return raw;
}

function parseSceneOutput(raw:string){return validateScene(Scene.parse(normalizeSceneContract(JSON.parse(normalizeStructuredOutput(raw)))))}

/** Images produce an unconfirmed candidate. No saved scene is changed here. */
export async function recognizeLayout(imageUrl:string,onDelta?:(text:string)=>void,signal?:AbortSignal,codex:LayoutCodexCall=runCodex):Promise<SceneData>{
 const schema=z.toJSONSchema(Scene);const strict=(node:any)=>{if(!node||typeof node!=='object')return;if(node.properties){node.required=Object.keys(node.properties);node.additionalProperties=false}delete node.default;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(strict);else if(value&&typeof value==='object')strict(value)};strict(schema);
 const model=layoutRecognitionModel();
 let raw=await codex({text:`请读取用户户型图并创建可编辑的墙、门窗和房间候选，严格按输出schema返回JSON。只读图，不调用外部资源。不要使用Markdown代码块，不要在JSON前后添加解释文字。
坐标：x向右，y向下，米。没有真实尺寸时将图上最长整体边暂设为10米，calibration必须null。纬度31、north0、assumption写“暂用纬度31°、图上方为北；待用户确认”。墙高度2.8、厚度0.15仅估算，structural全部unknown、evidence为空。
沿可见粗线重建外墙和内墙，每条墙a/b不相等，尽量共用交点；门窗必须绑定实际wallId，offset是距墙起点的比例，width不能越界；门洞中心与宽度从图上比例估算。门高度2.1/sill0，窗height1.2/sill0.9。
房间polygon至少3个顶点、按同一方向环绕、不得自交；房间可以是非矩形；区分厨房的水槽灶台和卧室的床。看不清用途请写“用途待确认”，不要仅根据家具猜出身份/健康信息。每个ID不同。rooms.locked全部false。items为空，不从固定样例填家具。只产候选，后续由用户校准和修正。`,images:[imageUrl],model,outputSchema:schema,onDelta,signal});
 let s:SceneData;
 try{s=parseSceneOutput(raw)}catch(error){
  if(signal?.aborted)throw error;
  raw=await codex({text:`上一轮户型候选无法通过结构化解析或几何校验：${String(error)}。请对照同一原图修正，并只返回完整裸JSON，不要Markdown代码块或解释文字。不要放宽校验：门窗中心距起点=offset*墙长；开口半宽不可超过到任一端点的距离。不要把门洞关联到短墙碎片，需与图上相应完整墙段关联。房间不得自交。\n上一轮输出：${raw}`,images:[imageUrl],model,outputSchema:schema,onDelta,signal});
  s=parseSceneOutput(raw);
 }
 s.calibration=null;
 const map=new Map<string,string>();for(const x of [...s.walls,...s.rooms,...s.openings]){map.set(x.id,randomUUID())}
 for(const w of s.walls){w.id=map.get(w.id)!;w.structural='unknown';w.evidence=[]}
 for(const r of s.rooms)r.id=map.get(r.id)!;
 for(const o of s.openings){o.id=map.get(o.id)!;o.wallId=map.get(o.wallId)||o.wallId}
 s.items=[];return validateScene(s);
}
