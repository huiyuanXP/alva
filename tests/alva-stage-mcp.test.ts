import {test} from 'node:test';
import assert from 'node:assert/strict';
import {StageMcpServer,bridgeMcpTools} from '../api/mcp/server.js';
import {McpError} from '../api/mcp/contracts.js';
import {DomainError} from '../api/model.js';

test('two loopback MCP packs enforce stage, project, expiry and current authorization',async()=>{
 const server=new StageMcpServer();let revision=4,stage='floorplan',calls=0;
 const lease=await server.grant({binding:{projectId:'project-a',role:'owner',stage:'floorplan'},authorize:async()=>{if(stage!=='floorplan')throw new DomainError(403,'阶段已切换');return {revision}},tools:[{name:'read_floorplan',description:'read',inputSchema:{type:'object',properties:{}},run:async()=>{calls++;return {revision}}}]});
 const rpc=async(url:string,token:string,name:string,args:unknown={})=>fetch(url,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name,arguments:args}})});
 try{
  assert.match(lease.url,/^http:\/\/127\.0\.0\.1:\d+\/mcp\/floorplan$/);
  const tools=await bridgeMcpTools(lease);assert.deepEqual(tools.map(t=>t.name),['read_floorplan']);
  assert.deepEqual(await tools[0].run({}),{revision:4});revision=9;assert.deepEqual(await tools[0].run({}),{revision:9});
  const cross=await rpc(lease.url,lease.token,'read_floorplan',{projectId:'project-b'});assert.equal((await cross.json() as any).result.structuredContent.error.code,'PROJECT_MISMATCH');
  const hidden=await rpc(lease.url,lease.token,'living_tool');assert.equal((await hidden.json() as any).result.structuredContent.error.code,'TOOL_NOT_IN_STAGE');
  assert.equal((await rpc(lease.url.replace('/floorplan','/living'),lease.token,'read_floorplan')).status,403);
  assert.equal((await rpc(lease.url,'bad-token','read_floorplan')).status,401);
  stage='living';await assert.rejects(tools[0].run({}),(e:unknown)=>e instanceof McpError&&e.detail.code==='FORBIDDEN');
  assert.equal(calls,2);lease.revoke();assert.equal((await rpc(lease.url,lease.token,'read_floorplan')).status,401);
 }finally{lease.revoke();await server.close()}
});

test('MCP errors retain revision and actionable repair in the dynamic bridge',async()=>{
 const server=new StageMcpServer();const events:unknown[]=[];
 const lease=await server.grant({binding:{projectId:'a',role:'owner',stage:'living'},authorize:async()=>({revision:42}),tools:[{name:'write_candidate',description:'reject stale',inputSchema:{type:'object',properties:{}},run:async()=>{throw new DomainError(409,'项目已更新，请重新读取后确认')}}],onCall:e=>events.push(e)});
 try{
  const [tool]=await bridgeMcpTools(lease);
  await assert.rejects(tool.run({}),(e:unknown)=>{assert.ok(e instanceof McpError);assert.equal(e.detail.code,'REVISION_CONFLICT');assert.equal(e.detail.currentRevision,42);assert.equal(e.detail.retryable,false);assert.equal(e.detail.repairActions[0].action,'reload_project');return true});
  assert.equal(events.length,1);
 }finally{lease.revoke();await server.close()}
});

test('expired grants and cancellation cannot execute tools',async()=>{
 const server=new StageMcpServer();let calls=0;const abort=new AbortController();
 const config={binding:{projectId:'a',role:'owner' as const,stage:'living' as const},authorize:async()=>({revision:0}),tools:[{name:'read',description:'read',inputSchema:{type:'object'},run:async()=>{calls++;return {ok:true}}}]};
 const expired=await server.grant({...config,ttlMs:-1});
 const cancelled=await server.grant({...config,signal:abort.signal});
 try{
  await assert.rejects(bridgeMcpTools(expired));abort.abort();await assert.rejects(bridgeMcpTools(cancelled));assert.equal(calls,0);
 }finally{expired.revoke();cancelled.revoke();await server.close()}
});
