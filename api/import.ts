import {runCodex} from './codex.js';
import {Scene,validateScene,type SceneData} from './model.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {LayoutOutputError,parseLayoutOutput,layoutRepairPrompt} from './import/response.js';
import {VISION_TIMEOUT_MS} from './codex-timeout.js';
/** Images produce an unconfirmed candidate. No saved scene is changed here. */
export async function recognizeLayout(imageUrl:string,onDelta?:(text:string)=>void,signal?:AbortSignal):Promise<SceneData>{
 const schema=z.toJSONSchema(Scene);const strict=(node:any)=>{if(!node||typeof node!=='object')return;if(node.properties){node.required=Object.keys(node.properties);node.additionalProperties=false}delete node.default;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(strict);else if(value&&typeof value==='object')strict(value)};strict(schema);
 let raw=await runCodex({text:`请读取用户户型图并创建可编辑的墙、门窗和房间候选，严格按输出schema返回JSON。只读图，不调用外部资源。
坐标：x向右，y向下，米。没有真实尺寸时将图上最长整体边暂设为10米，calibration必须null。纬度31、north0、assumption写“暂用纬度31°、图上方为北；待用户确认”。墙高度2.8、厚度0.15仅估算，structural全部unknown、evidence为空。
沿可见粗线重建外墙和内墙，每条墙a/b不相等，尽量共用交点；门窗必须绑定实际wallId，offset是距墙起点的比例，width不能越界；门洞中心与宽度从图上比例估算。门高度2.1/sill0，窗height1.2/sill0.9。
房间polygon至少3个顶点、按同一方向环绕、不得自交；房间可以是非矩形；区分厨房的水槽灶台和卧室的床。看不清用途请写“用途待确认”，不要仅根据家具猜出身份/健康信息。每个ID不同。rooms.locked全部false。items为空，不从固定样例填家具。只产候选，后续由用户校准和修正。`,images:[imageUrl],outputSchema:schema,timeoutMs:VISION_TIMEOUT_MS,onDelta,signal});
 let s:SceneData;
 try{s=parseLayoutOutput(raw)}catch(error){
  if(!(error instanceof LayoutOutputError))throw error;
  signal?.throwIfAborted();
  raw=await runCodex({text:layoutRepairPrompt(raw,error),images:[imageUrl],outputSchema:schema,timeoutMs:VISION_TIMEOUT_MS,onDelta,signal});
  // JSON, schema and geometry all share the same one-repair budget. A second
  // invalid response propagates; it must never become a saved candidate.
  s=parseLayoutOutput(raw);
 }
 s.calibration=null;
 const map=new Map<string,string>();for(const x of [...s.walls,...s.rooms,...s.openings]){map.set(x.id,randomUUID())}
 for(const w of s.walls){w.id=map.get(w.id)!;w.structural='unknown';w.evidence=[]}
 for(const r of s.rooms)r.id=map.get(r.id)!;
 for(const o of s.openings){o.id=map.get(o.id)!;o.wallId=map.get(o.wallId)||o.wallId}
 s.items=[];return validateScene(s);
}
