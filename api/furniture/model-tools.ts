import {proposalArchitectureKey} from './proposal-decisions.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {BusinessTool,CodexInput} from '../codex.js';
import {assets,itemFromAsset,DomainError,type Proposal,type Change} from '../model.js';
import type {AlvaStore} from '../store.js';
import {applyChanges} from '../business.js';
import {activeScope,assertProposalScope} from '../scope.js';
import {McpError} from '../mcp/contracts.js';
import {generateFurnitureModel} from './generate-model.js';
import type {FurnitureRenderer} from './render.js';
export const FurnitureModelRequest=z.object({expectedRevision:z.number().int().min(0),target:z.discriminatedUnion('kind',[
 z.object({kind:z.literal('existing'),itemId:z.string().min(1)}).strict(),
 z.object({kind:z.literal('new'),assetId:z.string().min(1),roomId:z.string().min(1),x:z.number().finite(),y:z.number().finite(),rotation:z.number().finite().default(0)}).strict()
]),dimensions:z.object({width:z.number().min(.05).max(10),depth:z.number().min(.05).max(10),height:z.number().min(.02).max(5)}).strict().optional()}).strict();
export function rejectUnreviewedModels(changes:Change[]){if(changes.some(c=>'visualModel' in c.values))throw new McpError({code:'FURNITURE_CRITIC_REQUIRED',message:'不能直接提交自称已审查的家具模型；必须通过generate_furniture_model实际生成和视觉检查',retryable:true,repairActions:[{action:'generate_furniture_model',message:'调用详细建模工具；只有服务端通过critic的候选可以由业主确认采用'}]})}
export function furnitureModelTools(options:{store:AlvaStore;projectId:string;originalPrompt:string;evidenceId:string;proposals:Proposal[];render:FurnitureRenderer;signal:AbortSignal;call?:(input:CodexInput)=>Promise<string>;onProgress?:(text:string)=>void;authorize?:()=>Promise<unknown>}):BusinessTool[]{return [{
 name:'generate_furniture_model',description:'为指定现有家具或目录类别的新家具生成高细节3D候选，包含真实曲面/主体/支撑/细节；自动以用户原话、建模说明及三张实渲染图做视觉critic，不合格最多修改3轮。通过后仅生成待业主确认的候选，不直接改场景。用户要求具体造型、高模、细节或新家具时优先使用；目录基础资产不能冒称定制高模。',inputSchema:z.toJSONSchema(FurnitureModelRequest),run:async args=>{
  const input=FurnitureModelRequest.parse(args),p=await options.store.get(options.projectId);if(p.revision!==input.expectedRevision)throw new DomainError(409,'项目已更新，请重读get_snapshot');if(!p.scene||(!p.scene||!p.confirmedTopology||!!p.candidate))throw new DomainError(422,'请先确认按当前户型继续');if(options.proposals.length)throw new DomainError(422,'本轮已有候选，请先确认或拒绝，再生成详细家具模型');
  const target=input.target,item=target.kind==='existing'?p.scene.items.find(i=>i.id===target.itemId):itemFromAsset(target.assetId,target.roomId,target.x,target.y);if(!item)throw new DomainError(422,'目标家具不存在');if(item.locked||p.scene.rooms.find(r=>r.id===item.roomId)?.locked)throw new DomainError(422,'家具或房间已锁定');
  const dimensions=input.dimensions||{width:item.width,height:item.height,depth:item.depth};
  const change:Change=target.kind==='existing'?{action:'update',targetId:item.id,values:{...dimensions}}:{action:'add',targetId:item.roomId,values:{assetId:item.assetId,roomId:item.roomId,x:item.x,y:item.y,rotation:target.rotation,newId:item.id,...dimensions}};
  // New model dimensions use the same business placement validation as adopting the result.
  const changes=[change];
  const scope=activeScope(p);const proposal:Proposal={id:randomUUID(),title:'详细模型 · '+item.name,rationale:'',evidenceIds:[options.evidenceId],baseRevision:p.revision+1,changes,status:'proposed',scopeId:scope?.id,scopeRequired:!!scope};
  if(scope)assertProposalScope(p.scene,proposal,p.scopeRequests||[]);applyChanges(p.scene,changes);
  const visualModel=await generateFurnitureModel({originalPrompt:options.originalPrompt,assetName:assets.find(a=>a.id===item.assetId)?.name||item.name,dimensions,baseAppearance:{color:item.color,material:item.material},render:options.render,signal:options.signal,call:options.call,onProgress:options.onProgress});
  options.signal.throwIfAborted();await options.authorize?.();const current=await options.store.get(options.projectId);if(proposalArchitectureKey(current)!==proposalArchitectureKey(p)||(target.kind==='existing'&&current.scene?.items.find(i=>i.id===target.itemId)?.assetId!==item.assetId))throw new DomainError(409,'建模期间房屋结构或目标家具类别已变化，请重读后重新生成');
  // Only this server-owned path attaches a critic-approved model to a proposal.
  change.values.visualModel=visualModel;applyChanges(current.scene!,changes);proposal.rationale=`三视角视觉自检通过（第${visualModel.attempts}轮），待你预览确认。${visualModel.model.designSummary}`;options.proposals.push(proposal);
  return {status:'pending_owner_confirmation',proposalId:proposal.id,modelHash:visualModel.modelHash,parts:visualModel.model.parts.length,attempts:visualModel.attempts,critique:visualModel.critique,renderHashes:visualModel.renderHashes,rule:'仅待确认候选，未采用、未保存；这是模型视觉自检，不代替用户验收或工程认证'};
 }
}]}
