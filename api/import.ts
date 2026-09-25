import {runCodex,type CodexInput} from './codex.js';
import {Scene,validateScene,type SceneData} from './model.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {LayoutOutputError,parseLayoutOutput,parseGeminiLayoutOutput,layoutRepairPrompt} from './import/response.js';
import {VISION_TIMEOUT_MS} from './codex-timeout.js';

export type LayoutCodexCall=(input:CodexInput)=>Promise<string>;
export function layoutRecognitionModel(){return process.env.OPENAI_VISION_MODEL?.trim()||'gemini-3.8-flash-high'}
export function normalizeStructuredOutput(raw:string){let text=raw.trim();const fenced=text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);if(fenced)text=fenced[1].trim();if(text.startsWith('{')||text.startsWith('['))return text;const starts=[text.indexOf('{'),text.indexOf('[')].filter(i=>i>=0);const start=starts.length?Math.min(...starts):-1;if(start<0)return text;const stack:string[]=[];let quoted=false,escaped=false;for(let i=start;i<text.length;i++){const ch=text[i];if(quoted){if(escaped)escaped=false;else if(ch==='\\')escaped=true;else if(ch==='"')quoted=false;continue}if(ch==='"'){quoted=true;continue}if(ch==='{'||ch==='[')stack.push(ch);else if(ch==='}'||ch===']'){const expected=ch==='}'?'{':'[';if(stack.at(-1)!==expected)break;stack.pop();if(!stack.length)return text.slice(start,i+1).trim()}}return text.slice(start).trim()}
export function normalizeSceneContract(value:unknown){if(!value||typeof value!=='object'||Array.isArray(value))return value;const raw=structuredClone(value as Record<string,any>),metadata=raw.metadata&&typeof raw.metadata==='object'?raw.metadata:{};const point=(p:any)=>Array.isArray(p)&&p.length>=2?{x:Number(p[0]),y:Number(p[1])}:p;raw.walls=Array.isArray(raw.walls)?raw.walls.map((w:any)=>({...w,a:point(w.a),b:point(w.b),evidence:Array.isArray(w.evidence)?w.evidence:[]})):raw.walls;raw.rooms=Array.isArray(raw.rooms)?raw.rooms.map((r:any)=>{const name=typeof r.name==='string'&&r.name.trim()?r.name:typeof r.purpose==='string'&&r.purpose.trim()?r.purpose:'用途待确认';return {id:r.id,name,purpose:typeof r.purpose==='string'&&r.purpose.trim()?r.purpose:name,polygon:Array.isArray(r.polygon)?r.polygon.map(point):r.polygon,locked:typeof r.locked==='boolean'?r.locked:false}}):raw.rooms;raw.openings=Array.isArray(raw.openings)?raw.openings.map((o:any)=>({id:o.id,wallId:o.wallId,kind:o.kind??o.type,offset:o.offset,width:o.width,height:o.height,sill:o.sill??o.sillHeight??0})):raw.openings;raw.items=[];raw.calibration=null;const g=raw.geography&&typeof raw.geography==='object'?raw.geography:metadata;raw.geography={latitude:Number(g.latitude??31),north:Number(g.north??0),assumption:typeof g.assumption==='string'&&g.assumption.trim()?g.assumption:'暂用纬度31°、图上方为北；待用户确认'};delete raw.metadata;return raw}
/** Images produce an unconfirmed candidate. No saved scene is changed here. */
export async function recognizeLayout(imageUrl:string,onDelta?:(text:string)=>void,signal?:AbortSignal,codex:LayoutCodexCall=runCodex):Promise<SceneData>{
 const schema=z.toJSONSchema(Scene);const strict=(node:any)=>{if(!node||typeof node!=='object')return;if(node.properties){node.required=Object.keys(node.properties);node.additionalProperties=false}delete node.default;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(strict);else if(value&&typeof value==='object')strict(value)};strict(schema);
 const model=layoutRecognitionModel();
 const reasoningEffort=process.env.OPENAI_VISION_REASONING_EFFORT?.trim()||(model==='gemini-3.8-flash-high'?'high':undefined);
 let raw=await codex({text:`请读取用户户型图并创建可编辑的墙、门窗和房间候选，严格按输出schema返回JSON。只读图，不调用外部资源。
坐标：x向右，y向下，米。没有真实尺寸时将图上最长整体边暂设为10米，calibration必须null。纬度31、north0、assumption写“暂用纬度31°、图上方为北；待用户确认”。墙高度2.8、厚度0.15仅估算，structural全部unknown、evidence为空。
沿可见粗线重建外墙和内墙，每条墙a/b不相等，尽量共用交点；门窗必须放在openings数组中，kind只能是door或window，不要输出独立doors/windows字段；房间必须有purpose。门窗必须绑定实际wallId，offset是开口中心（不是起始边缘）沿墙a到b的距离除以墙长，width用米。必须满足width/(2*墙长)<=offset<=1-width/(2*墙长)。例如墙长2米、开口宽1.6米且居中时offset=0.5，不能填左边缘比例0.1；不能越界；门洞中心与宽度从图上比例估算。门高度2.1/sill0，窗height1.2/sill0.9。
房间polygon至少3个顶点、按同一方向环绕、不得自交；房间可以是非矩形；区分厨房的水槽灶台和卧室的床。看不清用途请写“用途待确认”，不要仅根据家具猜出身份/健康信息。每个ID不同。rooms.locked全部false。items为空，不从固定样例填家具。只产候选，后续由用户校准和修正。`,images:[imageUrl],model,reasoningEffort,outputSchema:schema,timeoutMs:VISION_TIMEOUT_MS,onDelta,signal});
 let s:SceneData;
 try{s=parseLayoutOutput(normalizeStructuredOutput(raw))}catch(error){
  if(!(error instanceof LayoutOutputError))throw error;
  signal?.throwIfAborted();
  raw=await codex({text:layoutRepairPrompt(raw,error),images:[imageUrl],model,reasoningEffort,outputSchema:schema,timeoutMs:VISION_TIMEOUT_MS,onDelta,signal});
  // JSON, schema and geometry all share the same one-repair budget. A second
  // invalid response propagates; it must never become a saved candidate.
  try{s=parseLayoutOutput(normalizeStructuredOutput(raw))}
  catch(repairError){
   if(model!=='gemini-3.8-flash-high'||!(repairError instanceof LayoutOutputError)||repairError.stage!=='schema')throw repairError;
   s=parseGeminiLayoutOutput(normalizeStructuredOutput(raw));
  }
 }
 s.calibration=null;
 const map=new Map<string,string>();for(const x of [...s.walls,...s.rooms,...s.openings]){map.set(x.id,randomUUID())}
 for(const w of s.walls){w.id=map.get(w.id)!;w.structural='unknown';w.evidence=[]}
 for(const r of s.rooms)r.id=map.get(r.id)!;
 for(const o of s.openings){o.id=map.get(o.id)!;o.wallId=map.get(o.wallId)||o.wallId}
 s.items=[];return validateScene(s);
}
