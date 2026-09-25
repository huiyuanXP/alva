import {persistedHandoffs} from './mcp/handoff-history.js';
import {mainChatAgent} from './main-chat-agent.js';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
import {mkdir,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {mcpFailure} from './mcp/contracts.js';
import {codexTimeoutMs} from './codex-timeout.js';
export type BusinessTool={name:string;description:string;inputSchema:unknown;run:(args:unknown)=>Promise<unknown>};
export type CodexSession={key:string;threadId?:string;onThread:(threadId:string)=>Promise<void>;onTurnStarted?:()=>Promise<void>;handoffs?:{id:string;text:string}[];onHandoffsDelivered?:(ids:string[])=>Promise<void>};
export type CodexInput={injectOnly?:boolean;resumeOnly?:boolean;session?:CodexSession;text:string;images?:string[];model?:string;reasoningEffort?:string;tools?:BusinessTool[];outputSchema?:unknown;timeoutMs?:number;signal?:AbortSignal;onDelta?:(text:string)=>void;onEvent?:(event:unknown)=>void};
/** Auxiliary calls are ephemeral; main Chat explicitly supplies its persistent stage session. */
export async function runCodex(input:CodexInput):Promise<string>{
 if(input.injectOnly&&!input.session)throw new Error('追加阶段上下文需要持久会话');
 if(input.resumeOnly&&!input.session?.threadId)throw new Error('恢复阶段需要已有 thread ID');
 const timeoutMs=codexTimeoutMs(input.timeoutMs);
 const work=resolve(process.env.ALVA_AGENT_DIR||'.runtime/alva-agent',input.session?'stage-'+createHash('sha256').update(input.session.key).digest('hex'):randomUUID());
 await mkdir(work,{recursive:true,mode:0o700});
 const home=resolve(work,'config');await mkdir(home,{recursive:true,mode:0o700});
 const reasoningEffort=input.reasoningEffort?.trim()||process.env.OPENAI_REASONING_EFFORT?.trim();
 const config:Record<string,unknown>={model_provider:'alva',...(reasoningEffort?{model_reasoning_effort:reasoningEffort}:{}),model_providers:{alva:{name:'Alva',base_url:process.env.OPENAI_BASE_URL||'https://chat.huiyuanxp.com/v1',env_key:'OPENAI_API_KEY',wire_api:'responses'}},project_doc_max_bytes:0,features:{shell_tool:false,apply_patch_freeform:false,multi_agent:false},web_search:'disabled',mcp_servers:{}};
 const args=['app-server','--listen','stdio://'];
 const configure=(object:Record<string,unknown>,prefix='')=>{for(const [key,value]of Object.entries(object)){const path=prefix?`${prefix}.${key}`:key;if(value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).length)configure(value as Record<string,unknown>,path);else args.push('-c',`${path}=${JSON.stringify(value)}`)}};configure(config);
 // CODEX_HOME is used for its documented purpose: isolate this application call's Codex configuration and state.
 const child=spawn('codex',args,{cwd:work,env:{PATH:process.env.PATH,HOME:process.env.HOME,CODEX_HOME:home,OPENAI_API_KEY:process.env.OPENAI_API_KEY},stdio:['pipe','pipe','pipe']});
 const exited=new Promise<void>(ok=>child.once('exit',()=>ok()));
 let sequence=0,threadId='',turnId='',final='',settled=false,diagnostic='';
 const pending=new Map<number,{resolve:(v:any)=>void;reject:(e:Error)=>void}>();
 let finish!:(s:string)=>void,fail!:(e:Error)=>void;
 const completion=new Promise<string>((ok,no)=>{finish=ok;fail=no});
 // Attach immediately so startup/turn errors never cause an unhandled rejection.
 completion.catch(()=>{});
 const failAll=(error:Error)=>{if(settled)return;settled=true;fail(error);for(const p of pending.values())p.reject(error);pending.clear()};
 const send=(packet:unknown)=>{if(!child.stdin.destroyed)child.stdin.write(JSON.stringify(packet)+'\n')};
 const rpc=(method:string,params:unknown)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});send({id,method,params})});
 const timer=setTimeout(()=>failAll(new Error(`Codex调用超时（${timeoutMs/1000}秒），请重试`)),timeoutMs);
 const abort=()=>{if(threadId&&turnId)send({id:++sequence,method:'turn/interrupt',params:{threadId,turnId}});failAll(new Error('已取消'));child.kill('SIGTERM')};
 input.signal?.addEventListener('abort',abort,{once:true});
 const lines=createInterface({input:child.stdout});
 lines.on('line',line=>{void(async()=>{
  let event:any;try{event=JSON.parse(line)}catch{return}
  // Forward protocol metadata only to callers' private evidence sinks, never raw config/auth.
  if(event.method)input.onEvent?.({method:event.method,params:event.params});
  if(event.id!==undefined&&pending.has(event.id)&&!event.method){const p=pending.get(event.id)!;pending.delete(event.id);event.error?p.reject(new Error(event.error.message||'Codex协议错误')):p.resolve(event.result);return}
  if(event.id!==undefined&&event.method){
   if(event.method==='item/tool/call'){
    const tool=input.tools?.find(t=>t.name===event.params.tool);
    try{if(!tool)throw new Error('业务工具不在白名单');const result=await tool.run(event.params.arguments);send({id:event.id,result:{success:true,contentItems:[{type:'inputText',text:JSON.stringify(result)}]}})}
    catch(e){send({id:event.id,result:{success:false,contentItems:[{type:'inputText',text:JSON.stringify(mcpFailure(e).structuredContent)}]}})}
   }else send({id:event.id,error:{code:-32601,message:'此应用不允许该请求'}});
   return;
  }
  if(event.method==='item/agentMessage/delta')input.onDelta?.(event.params.delta);
  if(event.method==='item/completed'&&event.params.item?.type==='agentMessage')final=event.params.item.text;
  if(event.method==='turn/completed'){
   const turn=event.params.turn;
   if(turn.status==='completed'){settled=true;finish(final)}else failAll(new Error(turn.error?.message||`Codex ${turn.status}`));
  }
 })().catch(e=>failAll(e instanceof Error?e:new Error('Codex事件错误')))});
 // Provider diagnostics can include private URLs. Keep only an exit classification here.
 child.stderr.on('data',data=>{diagnostic=(diagnostic+String(data)).slice(-2000).replaceAll(process.env.OPENAI_API_KEY||'__absent__','[REDACTED]')});
 child.on('error',failAll);child.on('exit',code=>{if(!settled)failAll(new Error(`Codex进程退出(${code}): ${diagnostic}`))});
 try{
  if(input.signal?.aborted)throw new Error('已取消');
  await rpc('initialize',{clientInfo:{name:'alva',version:'0.1.0'},capabilities:{experimentalApi:true}});send({method:'initialized',params:{}});
  const started=await rpc(input.session?.threadId?'thread/resume':'thread/start',{model:input.model||process.env.OPENAI_MODEL||'gpt-5.5',modelProvider:'alva',cwd:work,...(input.session?.threadId?{threadId:input.session.threadId}:{ephemeral:!input.session}),approvalPolicy:'never',sandbox:'read-only',environments:[],runtimeWorkspaceRoots:[],baseInstructions:mainChatAgent.baseInstructions,...(!input.session?.threadId?{dynamicTools:(input.tools||[]).map(({run,...t})=>({type:'function',...t}))}:{})});
  threadId=started.thread.id;
  if(input.session?.threadId&&threadId!==input.session.threadId)throw new Error('Codex未恢复原会话');
  await input.session?.onThread(threadId);
  if(input.resumeOnly){settled=true;return threadId}
  let handoffs=input.session?.handoffs||[];
  if(input.session?.threadId&&handoffs.length){
   const history=JSON.stringify(await rpc('thread/read',{threadId,includeTurns:true}));
   const persisted=started.thread.path?await persistedHandoffs(started.thread.path,home,threadId,handoffs.map(h=>h.id)):new Set<string>();
   const delivered=handoffs.filter(h=>persisted.has(h.id)||history.includes(`[ALVA_HANDOFF:${h.id}]`));
   if(delivered.length)await input.session.onHandoffsDelivered?.(delivered.map(h=>h.id));
   handoffs=handoffs.filter(h=>!delivered.includes(h));
  }
  const turnText=[...handoffs.map(h=>`[ALVA_HANDOFF:${h.id}]\n${h.text}`),input.text].join('\n\n');
  if(input.injectOnly){if(turnText.trim())await rpc('thread/inject_items',{threadId,items:[{type:'message',role:'user',content:[{type:'input_text',text:turnText}]}]});if(handoffs.length)await input.session?.onHandoffsDelivered?.(handoffs.map(h=>h.id));settled=true;return threadId}
  const turn=await rpc('turn/start',{threadId,input:[{type:'text',text:turnText},...(input.images||[]).map(url=>({type:'image',url}))],...(input.outputSchema?{outputSchema:input.outputSchema}:{})});
  turnId=turn.turn.id;
  await input.session?.onTurnStarted?.();
  if(handoffs.length)await input.session?.onHandoffsDelivered?.(handoffs.map(h=>h.id));
  return await completion;
 }finally{clearTimeout(timer);input.signal?.removeEventListener('abort',abort);lines.close();child.kill('SIGTERM');await Promise.race([exited,new Promise<void>(ok=>{const killTimer=setTimeout(()=>{child.kill('SIGKILL');ok()},3000);killTimer.unref();exited.then(()=>{clearTimeout(killTimer);ok()})})]);for(const p of pending.values())p.reject(new Error('调用已结束'));pending.clear();if(!input.session)await rm(work,{recursive:true,force:true}).catch(()=>{})}
}
