import type {BusinessTool} from '../codex.js';
import {z} from 'zod';
import {assets,type Project,type Change,DomainError} from '../model.js';
import {ChangeSchema} from '../business.js';
import {activeScope} from '../scope.js';
import {McpError} from '../mcp/contracts.js';
import {FurnitureAddition,placementHints} from './recommendations.js';

const proposalChange=z.union([FurnitureAddition,ChangeSchema.extend({action:z.enum(['update','remove','copy','transfer','purpose','wall'])})]);
export const proposalInputSchema=z.toJSONSchema(z.object({variants:z.array(z.object({title:z.string(),rationale:z.string(),referenceIds:z.array(z.string()).optional(),changes:z.array(proposalChange).min(1).max(30)})).min(1).max(3)}));
export function furnitureContext(p:Project){
 return {projectId:p.id,revision:p.revision,assets,rooms:p.scene?.rooms||[],items:p.scene?.items||[],scope:activeScope(p),
  placement:{units:'metres',origin:'使用房间polygon的全局平面坐标；x/y是家具中心，rotation单位度。',example:{action:'add',targetId:'目标房间ID',values:{assetId:'alva-chair',roomId:'同一目标房间ID',x:1,y:1,rotation:0}},rule:'只用assets中的真实ID；不同variants是替代布局。目录不含的设备须明确未生成，不能以其缺失为由跳过已有沙发、床、书桌等资产。候选不采用、不保存。'}};
}
export function placementFailure(p:Project,changes:Change[],error:unknown){
 if(!(error instanceof DomainError)&&!(error instanceof z.ZodError))throw error;
 const first=changes.find(c=>c.action==='add'),parsed=first?FurnitureAddition.safeParse({ ...first,values:Object.fromEntries(Object.entries(first.values).filter(([k])=>k!=='newId'))}):undefined;
 const positions=p.scene&&parsed?.success?placementHints(p.scene,parsed.data):[];
 return new McpError({code:'FURNITURE_PLACEMENT_INVALID',message:error.message,retryable:true,repairActions:[
  {action:'get_furniture_context',message:'读取精简家具上下文。可用assetId：'+assets.map(a=>a.id).join(', ')+'。add的targetId与values.roomId均为房间ID；坐标填values.x/y，不能填position。'},
  {action:'propose_changes',message:'修正所有候选后重新提交；失败调用不保留部分候选。首件家具在原场景中经边界/碰撞校验的位置（仍需整组校验，不代表最优布局）：'+JSON.stringify(positions)}]});
}

export function scopeGenerationPacks(packs:{floorplan:BusinessTool[];living:BusinessTool[]},continuing:boolean){
 if(!continuing)return packs;
 const names=new Set(['get_furniture_context','get_snapshot','propose_changes','generate_furniture_model','propose_room_style']);
 return {...packs,living:packs.living.filter(t=>names.has(t.name))};
}
