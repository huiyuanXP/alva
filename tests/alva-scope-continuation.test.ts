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
  r=await chat();assert.equal(r.statusCode,409);assert.equal(r.json().detail.code,'SCOPE_ALREADY_GENERATED');assert.equal(calls,2);
  const chosen=p.proposals[0];r=await post('/api/proposal-groups/accept',{groupId:chosen.groupId,proposalId:chosen.id,selectedIds:['room'],confirmed:true});assert.equal(r.statusCode,200,r.body);p=r.json();assert.equal(p.scene!.items.length,2);assert.equal(p.savedVersion,saved);assert.equal(p.proposals[0].status,'accepted');assert.equal(p.proposals[1].status,'rejected');
 }finally{await app.close();await store.close()}
});
