import {DomainError} from '../model.js';
import {runCodex,type BusinessTool,type CodexInput} from '../codex.js';
import type {AlvaStore,Session} from '../store.js';
import {StageMcpServer,bridgeMcpTools} from './server.js';
import {rememberThread,markStageDelivery} from './sessions.js';
import {McpError,type ChatStage,type McpResult} from './contracts.js';

export type StageRunInput={
 store:AlvaStore;server:StageMcpServer;session:Session;
 /** Revalidate the original authenticated browser session, including revocation. */
 authorize:()=>Promise<Session>;
 packs:Record<ChatStage,BusinessTool[]>;
 snapshot:()=>Promise<unknown>;
 input:Omit<CodexInput,'session'|'tools'>;
 runModel?:(input:CodexInput)=>Promise<string>;
 completionRepair?:()=>string|undefined;
 onTool?:(event:{stage:ChatStage;name:string;result:McpResult})=>void;
};
/** Uses exactly the active pack; callers cannot grant a stage via model arguments. */
export async function runStageChat(options:StageRunInput){
 const {store,session,server,input}=options;
 if(session.role!=='owner')throw new DomainError(403,'仅业主可使用设计 Agent');
 const state=await store.chatState(session.projectId),stage=state.active;
 const authorize=async()=>{
  const fresh=await options.authorize();
  if(fresh.projectId!==session.projectId||fresh.role!==session.role||fresh.authGeneration!==session.authGeneration)throw new DomainError(403,'项目授权已变化，请重新登录');
  const latest=await store.chatState(session.projectId),project=await store.get(session.projectId);
  if(latest.active!==stage||latest.generation!==state.generation)throw new DomainError(403,'阶段已切换，请在当前阶段重新发起请求');
  if(stage==='living'&&!project.confirmedBuilding)throw new DomainError(422,'建筑尚未确认或已失效，请返回户型阶段完成确认');
  return {revision:project.revision};
 };
 const current=await authorize();
 let businessCalls=0;
 const lease=await server.grant({binding:{projectId:session.projectId,role:session.role,stage},tools:options.packs[stage],authorize,signal:input.signal,onCall:event=>{businessCalls++;options.onTool?.({stage,...event})}});
 try{
  const tools=await bridgeMcpTools(lease,input.signal,{catalogBridge:true});
  const pending=state.handoffs.filter(h=>h.to===stage&&!state.threads[stage].deliveredIds.includes(h.id));
  const migration=state.threads[stage].threadId?'':`本阶段首次建立持久会话。历史页面消息保持保留；此前临时 thread 已删除，不能声称 Resume 了旧会话。`;
  const text=`调用约定：本轮所有业务操作必须通过 mcp_call_tool({name:"业务工具名",arguments:{...业务参数}}) 发出，先 mcp_list_tools 获取参数结构。不要把业务工具名当成可直接调用的入口；即使旧会话保留直接入口，也优先使用这两个固定入口。\n本轮服务端已装载的业务工具名称：${options.packs[stage].map(t=>t.name).join(', ')}。如果名称在此列表但旧thread没有直接入口，必须使用 mcp_list_tools 获取参数结构，然后 mcp_call_tool 调用，不能声称该工具未接入。\n当前阶段：${stage==='floorplan'?'户型导入':'生活设计'}。你只能使用本阶段 MCP 工具。每轮先调用 mcp_list_tools 读取现役目录；旧会话目录未列出新工具时，用 mcp_call_tool 按现役目录调用；不能因旧工具名仍在会话中就假定可用。工具错误包含修复步骤，须据实提示用户；没有成功结果或界面回执不得宣称操作生效。调用mcp_list_tools只是在读取目录，不代表业务工具已经执行。没有实际业务调用结果时，只能说明尚未执行，不能声称尝试失败、服务不可用或编造失败原因。request_save、propose_room_purpose、request_topology_confirmation、request_building_confirmation、request_topology_reopen仅出示待用户点击的确认卡，不等于确认或采用；用户已经要求出示确认卡且前置条件满足时，应实际调用对应工具，不要再次询问是否可以出示。必须取得工具返回的action才能说确认卡已出示；最终确认仍由用户在页面执行。收到 REVIEW_STALE 或 REVIEW_REQUIRED 时，表示缺少当前审查而不是工具不可用；按 repairActions 在本轮实际执行 read_user_context → run_layout_review，成功后再 request_save，不能建议绕过审查直接保存。VISION_OUTPUT_JSON/SCHEMA/GEOMETRY表示模型输出校验失败，不能据此推断附件损坏、未上传、图像不清晰或缺少标注；明确告知模型输出问题和可选重试，持续失败提示系统排查。\n${migration}\n当前项目 ${session.projectId}；revision ${current.revision}。本轮不重复注入完整项目或历史消息；需要状态时实际调用 get_snapshot，写入前必须重读并使用最新revision。阶段交接快照只作背景，不能当成当前状态。\n\n${input.text}`;
  let activeThreadId=state.threads[stage].threadId;
  const invoke=async(turnText:string,timeoutMs:number)=> (options.runModel||runCodex)({...input,timeoutMs,text:turnText,onDelta:undefined,tools,session:{key:`${session.projectId}:${stage}`,threadId:activeThreadId,onThread:async threadId=>{await rememberThread(store,session.projectId,stage,threadId);activeThreadId=threadId},handoffs:pending.map(h=>({id:h.id,text:h.summary})),onHandoffsDelivered:async ids=>{await markStageDelivery(store,session.projectId,stage,ids)}}});
  const deadline=Date.now()+(input.timeoutMs??(stage==='floorplan'?600_000:120_000));
  let result=await invoke(text,Math.max(1,deadline-Date.now()));
  const unobservedFailure=(reply:string)=>businessCalls===0&&/(?:工具|MCP)[\s\S]{0,100}(?:不可用|异常|未成功|不支持调用|未.{0,12}响应|调用.{0,12}失败)/i.test(reply);
  if(unobservedFailure(result)){
   // No business calls means there are no writes to repeat. Keep the same thread and one total deadline.
   await authorize();
   if(deadline-Date.now()>1000&&!input.signal?.aborted)result=await invoke(`执行核对：上一轮没有发出任何业务MCP调用，只有工具目录读取。因此不能报告业务工具不可用或调用失败。请继续完成原请求，实际使用 mcp_call_tool({name:"业务工具名",arguments:{}})；如只需讨论则如实回答。原请求：${input.text}`,deadline-Date.now());
   if(unobservedFailure(result))throw new McpError({code:'MCP_EXECUTION_UNVERIFIED',message:'Agent未实际调用业务工具，本次操作尚未执行；没有证据表明MCP服务不可用',retryable:true,repairActions:[{action:'retry_requested_operation',message:'重试原请求并检查实际业务工具结果；不要跳过复核或确认步骤'}]});
  }
  const repair=options.completionRepair?.();
  if(repair&&deadline-Date.now()>1000&&!input.signal?.aborted){
   await authorize();
   result=await invoke(repair+'\n原请求：'+input.text,deadline-Date.now());
  }
  // Publish only the checked response; failed guesses must not be streamed as facts.
  input.onDelta?.(result);
  return result;

 }finally{lease.revoke()}
}
