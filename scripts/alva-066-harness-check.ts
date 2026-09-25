/** Real installed Harness + real gateway + HTTP MCP, isolated from application data. */
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {runCodex} from '../api/codex.js';
import {StageMcpServer,bridgeMcpTools} from '../api/mcp/server.js';
import {DomainError} from '../api/model.js';
import type {ChatStage} from '../api/mcp/contracts.js';
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-harness-'+randomUUID().slice(0,6);
const privateDir=resolve('.runtime',run),evidenceDir=resolve('evidence',run);await mkdir(privateDir,{recursive:true});await mkdir(evidenceDir,{recursive:true});
process.env.ALVA_AGENT_DIR=resolve(privateDir,'agents');process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;
assert.ok(process.env.OPENAI_API_KEY,'Authorized model environment is required');
const handoffId=randomUUID();const deliveryCallbacks:string[][]=[];
const server=new StageMcpServer(),calls:{stage:ChatStage;name:string;error:boolean}[]=[],turns:unknown[]=[];let current:ChatStage='floorplan',revision=1;
try{
 for(const stage of ['floorplan','living','floorplan'] as const){
  current=stage;revision++;const name=stage==='floorplan'?'read_floorplan':'read_living';const nonce=randomUUID();
  const lease=await server.grant({binding:{projectId:'isolated-project',role:'owner',stage},authorize:async()=>{if(current!==stage)throw new DomainError(403,'阶段已切换');return {revision}},tools:[{name,description:'Read the current isolated project and return its fresh nonce. Call every turn; old nonce is invalid.',inputSchema:{type:'object',properties:{},additionalProperties:false},run:async()=>({stage,revision,nonce})},{name:'check_revision',description:'Check an intentionally stale revision to receive repair guidance.',inputSchema:{type:'object',properties:{},additionalProperties:false},run:async()=>{throw new DomainError(409,'项目已变化，请重读后再提交')}}],onCall:e=>calls.push({stage,name:e.name,error:!!e.result.isError})});
  const file=resolve(privateDir,stage+'.json');let previous:string|undefined;try{previous=JSON.parse(await readFile(file,'utf8')).threadId}catch{}
  let threadId='';const before=calls.length;const methods=new Set<string>();
  try{
   const text=await runCodex({model:'gemini-3.1-flash-lite',text:`实际调用 ${name} 取得本轮 nonce，再调用 check_revision 一次。不要重试失败工具。用中文报告 nonce 和失败的具体修复方法。`,tools:await bridgeMcpTools(lease),session:{key:`isolated-project:${stage}`,threadId:previous,onThread:async id=>{threadId=id;await writeFile(file,JSON.stringify({threadId:id}))},handoffs:stage==='floorplan'?[{id:handoffId,text:'测试交接摘要；只可注入一次。'}]:[],onHandoffsDelivered:async ids=>{deliveryCallbacks.push(ids)}},onEvent:(e:any)=>methods.add(e.method)});
   assert.ok(text.includes(nonce),'Must return nonce actually read this turn');assert.ok(calls.slice(before).some(c=>c.name===name&&!c.error));assert.ok(calls.slice(before).some(c=>c.name==='check_revision'&&c.error));assert.match(text,/重新|重读|更新|读取/);if(previous)assert.equal(threadId,previous);
   turns.push({stage,threadId,resumed:!!previous,revision,nonceReturned:true,repairExplained:true,methods:[...methods]});
  }finally{lease.revoke()}
 }
 const files=await readdir(resolve(privateDir,'agents'),{recursive:true});let handoffInjections=0;
 for(const file of files.filter(f=>f.endsWith('.jsonl'))){
  for(const line of (await readFile(resolve(privateDir,'agents',file),'utf8')).trim().split('\n')){
   const record=JSON.parse(line);if(record.type==='response_item'&&record.payload?.type==='message'&&record.payload.role==='user'&&JSON.stringify(record.payload.content).includes(`[ALVA_HANDOFF:${handoffId}]`))handoffInjections++;
  }
 }
 assert.equal(handoffInjections,1,'Replayed delivery must not reinject a handoff already in the resumed thread');
 assert.equal(deliveryCallbacks.length,2,'Both first delivery and recovery acknowledge the same handoff');
 await writeFile(resolve(evidenceDir,'result.json'),JSON.stringify({pass:true,run,handoffInjections,deliveryCallbacks,transport:'dynamicTools-to-HTTP-MCP',turns,calls},null,2));console.log(JSON.stringify({pass:true,run,handoffInjections,turns,calls},null,2));
}catch(error){await writeFile(resolve(evidenceDir,'result.json'),JSON.stringify({pass:false,run,turns,calls,error:error instanceof Error?error.message:'failed'},null,2));throw error}
finally{await server.close()}
