import {createServer,type Server} from 'node:http';
import {randomBytes} from 'node:crypto';
import type {AddressInfo} from 'node:net';
import type {BusinessTool} from '../codex.js';
import {McpError,mcpFailure,mcpSuccess,type McpBinding,type McpResult} from './contracts.js';

type Grant={binding:McpBinding;tools:BusinessTool[];expires:number;authorize:()=>Promise<{revision:number}>;signal?:AbortSignal;onCall?:(event:{name:string;result:McpResult})=>void};
/** One loopback listener inside the Alva process, with two independently scoped paths. */
export class StageMcpServer{
 private server:Server;
 private grants=new Map<string,Grant>();
 private listening?:Promise<string>;
 constructor(){this.server=createServer((req,res)=>{void this.handle(req,res).catch(()=>{if(!res.headersSent)res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'MCP transport failure'}))})})}
 async start():Promise<string>{
  if(!this.listening)this.listening=new Promise((ok,no)=>{this.server.once('error',no);this.server.listen(0,'127.0.0.1',()=>ok(`http://127.0.0.1:${(this.server.address() as AddressInfo).port}`))});
  return this.listening;
 }
 async grant(options:Omit<Grant,'expires'>&{ttlMs?:number}){
  const base=await this.start(),token=randomBytes(32).toString('base64url');
  for(const [key,grant] of this.grants)if(grant.expires<=Date.now())this.grants.delete(key);
  const grant:Grant={...options,expires:Date.now()+Math.min(options.ttlMs??660_000,900_000)};
  if(new Set(options.tools.map(t=>t.name)).size!==options.tools.length)throw new Error('Duplicate MCP tool');
  this.grants.set(token,grant);
  const revoke=()=>{this.grants.delete(token);options.signal?.removeEventListener('abort',revoke)};
  options.signal?.addEventListener('abort',revoke,{once:true});if(options.signal?.aborted)revoke();
  return {url:`${base}/mcp/${options.binding.stage}`,token,revoke};
 }
 private async handle(req:import('node:http').IncomingMessage,res:import('node:http').ServerResponse){
  const send=(status:number,body?:unknown)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(body===undefined?undefined:JSON.stringify(body))};
  // Browser origins are not part of this server-to-server transport.
  if(req.headers.origin)return send(403,{error:'Origin not allowed'});
  const token=req.headers.authorization?.replace(/^Bearer /,'')||'',grant=this.grants.get(token);
  if(!grant||grant.expires<=Date.now()||grant.signal?.aborted)return send(401,{error:'Expired or invalid MCP grant'});
  if(req.url!==`/mcp/${grant.binding.stage}`)return send(403,{error:'MCP stage binding mismatch'});
  if(req.method!=='POST')return send(405,{error:'POST required'});
  let raw='';for await(const chunk of req){raw+=chunk.toString();if(Buffer.byteLength(raw)>1_000_000)return send(413,{error:'MCP request too large'})}
  let packet:any;try{packet=JSON.parse(raw)}catch{return send(400,{error:'Invalid JSON'})}
  if(!packet||packet.jsonrpc!=='2.0'||typeof packet.method!=='string')return send(400,{error:'Invalid JSON-RPC request'});
  const response=(result:unknown)=>send(200,{jsonrpc:'2.0',id:packet.id,result});
  let revision:number|undefined;
  try{
   revision=(await grant.authorize()).revision;
   if(packet.id===undefined)return send(202);
   if(packet.method==='initialize')return response({protocolVersion:packet.params?.protocolVersion||'2025-03-26',capabilities:{tools:{}},serverInfo:{name:`alva-${grant.binding.stage}`,version:'1.0.0'}});
   if(packet.method==='ping')return response({});
   if(packet.method==='tools/list')return response({tools:grant.tools.map(({run,...tool})=>tool)});
   if(packet.method!=='tools/call')return send(200,{jsonrpc:'2.0',id:packet.id,error:{code:-32601,message:'Unknown MCP method'}});
   const tool=grant.tools.find(t=>t.name===packet.params?.name);
   if(!tool)throw new McpError({code:'TOOL_NOT_IN_STAGE',message:'当前阶段没有此工具',retryable:false,repairActions:[{action:'switch_stage',message:'请切换到该功能所属阶段后重试'}]});
   // Model-supplied identifiers never change the authenticated binding.
   const args=packet.params.arguments??{};
   if(args.projectId!==undefined&&args.projectId!==grant.binding.projectId)throw new McpError({code:'PROJECT_MISMATCH',message:'不能访问其他项目',retryable:false,repairActions:[{action:'open_project',message:'请通过目标项目的授权入口进入'}]});
   const result=mcpSuccess(await tool.run(args));grant.onCall?.({name:tool.name,result});return response(result);
  }catch(error){const result=mcpFailure(error,revision);grant.onCall?.({name:String(packet.params?.name||packet.method),result});return response(result)}
 }
 async close(){this.grants.clear();if(this.server.listening)await new Promise<void>((ok,no)=>this.server.close(e=>e?no(e):ok()));this.listening=undefined}
}

export type McpLease=Awaited<ReturnType<StageMcpServer['grant']>>;
/** All fallback calls still cross the authenticated HTTP MCP endpoint. */
export async function bridgeMcpTools(lease:McpLease,signal?:AbortSignal,options:{catalogBridge?:boolean}={}):Promise<BusinessTool[]>{
 let sequence=0;
 const rpc=async(method:string,params:unknown)=>{
  const response=await fetch(lease.url,{method:'POST',headers:{Authorization:`Bearer ${lease.token}`,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:++sequence,method,params}),signal:AbortSignal.any([AbortSignal.timeout(660_000),...(signal?[signal]:[])])});
  if(!response.ok)throw new McpError({code:response.status===401?'AUTH_EXPIRED':'MCP_UNAVAILABLE',message:response.status===401?'本次工具凭据已过期，请重新发起请求':'MCP 连接失败',retryable:response.status>=500,repairActions:[{action:'retry_chat',message:'请重新发起本轮 Chat；先核对项目状态，避免重复操作'}]});
  const packet=await response.json() as any;if(packet.error)throw new Error('MCP protocol error');return packet.result;
 };
 await rpc('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'alva-harness',version:'1'}});
 const catalog=await rpc('tools/list',{});
 if(catalog.isError)throw new McpError(catalog.structuredContent.error);
 const call=async(name:string,args:unknown)=>{
  const result=await rpc('tools/call',{name,arguments:args});
  if(result.isError)throw new McpError(result.structuredContent.error);
  return result.structuredContent;
 };
 const tools:BusinessTool[]=catalog.tools.map((tool:Omit<BusinessTool,'run'>)=>({...tool,run:(args:unknown)=>call(tool.name,args)}));
 // App Server restores the original dynamicTools catalog on Resume. These stable
 // adapters let existing threads discover and call newly deployed stage tools.
 if(options.catalogBridge)tools.push(
  {name:'mcp_list_tools',description:'读取当前阶段最新 MCP 工具目录。恢复旧会话后先调用；新功能也出现在这里。',inputSchema:{type:'object',properties:{},additionalProperties:false},run:async()=>{const result=await rpc('tools/list',{});if(result.isError)throw new McpError(result.structuredContent.error);return result}},
  {name:'mcp_call_tool',description:'按 mcp_list_tools 返回的工具名称和输入结构调用当前阶段 MCP。用于旧会话尚未列出的新工具；权限、确认和版本校验仍由服务端执行。',inputSchema:{type:'object',properties:{name:{type:'string'},arguments:{type:'object'}},required:['name','arguments'],additionalProperties:false},run:async args=>{
   const input=args as {name?:unknown;arguments?:unknown};
   if(!input||typeof input.name!=='string'||!input.arguments||typeof input.arguments!=='object'||Array.isArray(input.arguments))throw new McpError({code:'INVALID_ARGUMENTS',message:'请传入目录中的工具名称与参数对象',retryable:false,repairActions:[{action:'mcp_list_tools',message:'读取当前阶段工具目录及输入结构'}]});
   return call(input.name,input.arguments);
  }}
 );
 return tools;
}
