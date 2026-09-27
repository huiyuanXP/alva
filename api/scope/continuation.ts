import type {Project} from '../model.js';
import {McpError} from '../mcp/contracts.js';
import {activeScope,assertProposalScope} from '../scope.js';
import type {Proposal} from '../model.js';
const fail=(code:string,message:string):never=>{throw new McpError({code,message,retryable:true,repairActions:[{action:'resume_scope',message:'重读项目和已确认范围，再点击继续生成；已生成的候选请直接预览确认。'}]})};
export function scopeContinuation(p:Project,id:string){
 const scope=p.scopeRequests?.find(s=>s.id===id);
 if(!scope||scope.status!=='confirmed'||activeScope(p)?.id!==id)return fail('SCOPE_NOT_CURRENT','作用范围尚未确认、已取消或已被新范围替换');
 if(scope.generation?.status==='completed'||p.proposals.some(v=>v.scopeId===id))return fail('SCOPE_ALREADY_GENERATED','此范围已经生成候选，请处理已有候选；新的设计请求请另行发送');
 const source=p.messages.find(m=>m.id===scope.sourceMessageId&&m.role==='user');
 if(!source)return fail('SCOPE_SOURCE_MISSING','找不到本次范围的原始需求，请重新发送需求');
 return {scope,sourceText:source.text};
}
export function scopeContinuationPrompt(p:Project,id:string){
 const {scope,sourceText}=scopeContinuation(p,id);
 return `业主已经点击确认操作范围，现在必须接续原始设计需求，不能只口头承诺后续生成。先通过mcp_list_tools读取完整schema，再mcp_call_tool调用get_furniture_context读取精简许可资产、房间几何及最新revision。不要再次propose_scope，不用问卷抢占这次确认。普通家具摆放使用propose_changes，给出至少两个实际不同的候选；优先完成许可资产支持的家具，坐标必须在房间内且不碰撞。仅当原始需求明确要求定制/详细模型时调用generate_furniture_model。先实际完成家具候选，再处理颜色需求propose_room_style；不支持的资产如实列出，不能编造assetId。遵守工具repairActions修正失败；没有真实候选不得说已生成或已摆放。只生成候选等待业主采用，不代为采用或保存。限定范围：${JSON.stringify({scopeId:scope.id,roomIds:scope.roomIds,itemIds:scope.itemIds})}。原始需求：${sourceText}`;
}
export function requireScopeCandidates(proposals:Proposal[]){
 if(!proposals.length)return fail('SCOPE_GENERATION_INCOMPLETE','范围已确认，但本轮没有生成可预览的家具或布局候选，请重试生成');
}
export function completeScopeGeneration(p:Project,id:string,proposals:Proposal[]){
 const {scope}=scopeContinuation(p,id);
 requireScopeCandidates(proposals);
 for(const proposal of proposals){proposal.scopeId=id;proposal.scopeRequired=true;assertProposalScope(p.scene!,proposal,[scope])}
 scope.generation={status:'completed',proposalIds:proposals.map(v=>v.id)};
}
