import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createScopeRequest} from '../api/scope.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';

test('confirmed scope resumes original demand, fails without candidates, retries and adopts once',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic scope');await store.ensureAccessCode(project.id);
 const original='请在客厅放一张阅读椅，保留原家具。';
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);const id=randomUUID();p.messages.push({id,role:'user',text:original,status:'completed',createdAt:new Date().toISOString()});p.scopeRequests=[createScopeRequest(p,{roomIds:['room'],itemIds:[],reason:'reading chair',sourceMessageId:id})]});
 const scope=p.scopeRequests![0];let calls=0,generate=false;
 const app=await buildAlva(store,{assets:false,chatCodex:async input=>{calls++;assert.ok(input.text.includes(original));assert.ok(input.text.includes(scope.id));if(generate)await input.tools!.find(t=>t.name==='propose_changes')!.run({variants:[1,4].map(x=>({title:'Reading '+x,rationale:'synthetic',changes:[{action:'add',targetId:'room',values:{assetId:'alva-chair',roomId:'room',x,y:1}}]}))});return '候选已准备';}});
 const headers={cookie:'alva_session='+(await store.issueInternalSession(p.id)).token};
 const post=(url:string,extra:object)=>app.inject({method:'POST',url,headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,...extra}});
 const chat=()=>post('/api/chat',{scopeContinuationId:scope.id,text:'client must not replace original demand',roomId:null,model:'gemini-3.8-flash-high'});
 try{
  let r=await chat();assert.equal(r.statusCode,409);assert.equal(r.json().detail.code,'SCOPE_NOT_CURRENT');assert.equal(calls,0);
  r=await post('/api/scope/confirm',{scopeId:scope.id,roomIds:['room'],itemIds:[],confirmed:true});assert.equal(r.statusCode,200,r.body);p=r.json();const before=JSON.stringify(p.scene),saved=p.savedVersion;
  r=await chat();assert.match(r.body,/SCOPE_GENERATION_INCOMPLETE/);p=await store.get(p.id);assert.equal(p.scopeRequests![0].generation?.status,'failed');assert.equal(p.messages.at(-1)?.text,'');assert.equal(JSON.stringify(p.scene),before);
  generate=true;r=await chat();assert.match(r.body,/event: done/,r.body);p=await store.get(p.id);assert.equal(p.scopeRequests![0].generation?.status,'completed');assert.equal(p.proposals.length,2);assert.equal(JSON.stringify(p.scene),before);assert.ok(p.proposals.every(v=>v.scopeId===scope.id&&v.scopeRequired));assert.equal(p.savedVersion,saved);
  r=await chat();assert.equal(r.statusCode,409);assert.equal(r.json().detail.code,'SCOPE_ALREADY_GENERATED');assert.equal(calls,3);
  const chosen=p.proposals[0];r=await post('/api/proposal-groups/accept',{groupId:chosen.groupId,proposalId:chosen.id,selectedIds:['room'],confirmed:true});assert.equal(r.statusCode,200,r.body);p=r.json();assert.equal(p.scene!.items.length,2);assert.equal(p.savedVersion,saved);assert.equal(p.proposals[0].status,'accepted');assert.equal(p.proposals[1].status,'rejected');
 }finally{await app.close();await store.close()}
});


test('scope repair resumes same thread with compact assets, explicit add schema and atomic variants',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic repair');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);const id=randomUUID();p.messages.push({id,role:'user',text:'给房间生成阅读家具和配色',status:'completed',createdAt:new Date().toISOString()});p.scopeRequests=[createScopeRequest(p,{roomIds:['room'],itemIds:[],reason:'reading',sourceMessageId:id})];p.scopeRequests[0].status='confirmed'});
 let calls=0;const app=await buildAlva(store,{assets:false,chatCodex:async input=>{
  calls++;await input.session!.onThread('repair-thread');
  const call=(name:string,args:unknown)=>input.tools!.find(t=>t.name==='mcp_call_tool')!.run({name,arguments:args});
  const context=await call('get_furniture_context',{}) as any;assert.ok(context.assets.some((a:any)=>a.id==='alva-chair'));assert.ok(JSON.stringify(context).length<10000);
  const catalog=await input.tools!.find(t=>t.name==='mcp_list_tools')!.run({}) as any;const schema=catalog.tools.find((t:any)=>t.name==='propose_changes').inputSchema;assert.match(JSON.stringify(schema),/assetId/);assert.match(JSON.stringify(schema),/rotation/);
  const variant=(x:number,assetId='alva-chair')=>({title:'Reading '+x,rationale:'synthetic',changes:[{action:'add',targetId:'room',values:{assetId,roomId:'room',x,y:1}}]});
  if(calls===1){await assert.rejects(call('propose_changes',{variants:[variant(1),variant(4,'sofa')]}),(e:any)=>e.detail?.code==='FURNITURE_PLACEMENT_INVALID'&&JSON.stringify(e.detail).includes('alva-sofa'));return '配色已准备，家具目录不可用';}
  assert.equal(input.session!.threadId,'repair-thread');assert.match(input.text,/没有任何可预览家具候选/);
  await call('propose_changes',{variants:[variant(1),variant(4)]});return '两种家具候选已准备，请预览采用';
 }});
 try{const r=await app.inject({method:'POST',url:'/api/chat',headers:{cookie:'alva_session='+(await store.issueInternalSession(p.id)).token},payload:{requestId:randomUUID(),expectedRevision:p.revision,scopeContinuationId:p.scopeRequests![0].id,text:'继续',roomId:null,model:'gemini-3.8-flash-high'}});assert.match(r.body,/event: done/,r.body);p=await store.get(p.id);assert.equal(calls,2);assert.equal(p.proposals.length,2,'failed first variant must not leak');assert.equal(p.scopeRequests![0].generation?.status,'completed');assert.equal(p.scene!.items.length,1);assert.doesNotMatch(r.body,/配色已准备，家具目录不可用/);}finally{await app.close();await store.close()}
});
