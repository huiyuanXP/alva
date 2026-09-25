import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyAnswer} from '../api/business.js';
import {recommendationTools} from '../api/furniture/recommendations.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import type {Proposal} from '../api/model.js';

test('only confirmed answers queue recommendations; main Chat calls MCP and retains candidates until owner adoption',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic answer suggestions');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},seedLivingStage);const original=structuredClone(p.scene),headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};let calls=0;
 const app=await buildAlva(store,{assets:false,chatCodex:async input=>{
  calls++;const data=await input.tools!.find(t=>t.name==='get_snapshot')!.run({}) as any;
  await input.tools!.find(t=>t.name==='suggest_furniture')!.run({expectedRevision:data.project.revision,roomIds:['room'],variants:[{title:'阅读椅候选',rationale:'根据已确认阅读习惯，在房间空闲处建议阅读椅',changes:[{action:'add',targetId:'room',values:{roomId:'room',assetId:'alva-chair',x:1,y:1}}]}]});return '已生成待确认的阅读椅候选';
 }});
 const post=(url:string,payload:Record<string,unknown>)=>app.inject({method:'POST',url,headers,payload});
 try{
  const answer={questionId:'Q01',roomId:null,text:'优先考虑安静阅读',state:'answered'};
  const draft=await post('/api/intake/progress',{requestId:randomUUID(),expectedRevision:p.revision,drafts:[answer],cursor:{questionId:'Q01',roomId:null}});assert.equal(draft.statusCode,200,draft.body);p=draft.json();assert.equal(p.answerRecommendations,undefined);assert.equal(calls,0);
  const confirmed=await post('/api/intake/confirm',{requestId:randomUUID(),expectedRevision:p.revision,answer,confirmed:true});assert.equal(confirmed.statusCode,200,confirmed.body);p=confirmed.json();assert.equal(p.answerRecommendations?.length,1);const job=p.answerRecommendations![0];assert.equal(job.status,'pending');
  const chat=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,recommendationId:job.id,text:'触发已确认回答建议',roomId:null,model:'gemini-3.1-flash-lite'});assert.match(chat.body,/event: done/);assert.match(chat.body,/suggest_furniture/);assert.equal(calls,1);
  p=await store.get(p.id);assert.equal(p.answerRecommendations![0].status,'completed');assert.equal(p.proposals.length,1);assert.deepEqual(p.scene,original);assert.deepEqual(p.proposals[0].evidenceIds,[job.evidenceId]);
  const duplicate=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,recommendationId:job.id,text:'重复',roomId:null,model:'gemini-3.1-flash-lite'});assert.equal(duplicate.statusCode,409);assert.equal(calls,1);
  const proposal=p.proposals[0],adopt=await post('/api/proposals/accept',{requestId:randomUUID(),expectedRevision:p.revision,id:proposal.id,selectedIds:['room'],confirmed:true});assert.equal(adopt.statusCode,200,adopt.body);assert.equal(adopt.json().scene.items.length,original!.items.length+1);
 }finally{await app.close();await store.close()}
});

test('recommendation tools reject unconfirmed invocation, disallowed assets, collisions and replaced answer sources',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic recommendation rules');
 try{
  let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);applyAnswer(p,{questionId:'Q01',roomId:null,text:'需要阅读空间',state:'answered',locked:false,confirmed:true})});
  const job=p.answerRecommendations![0],proposals:Proposal[]=[];
  const input=(assetId:string,x=1,y=1)=>({expectedRevision:p.revision,roomIds:['room'],variants:[{title:'候选',rationale:'确认回答的建议',changes:[{action:'add',targetId:'room',values:{assetId,roomId:'room',x,y}}]}]});
  await assert.rejects(recommendationTools(store,p.id,undefined,proposals)[0].run(input('alva-chair')),/先确认问卷/);
  const tool=recommendationTools(store,p.id,job.id,proposals)[0];await assert.rejects(tool.run(input('unlicensed')),/资产不存在/);await assert.rejects(tool.run(input('alva-chair',2,2)),/重叠/);assert.equal(proposals.length,0);
  p=await store.mutate(p.id,randomUUID(),p.revision,'replace',{},p=>applyAnswer(p,{questionId:'Q01',roomId:null,text:'不需要阅读空间',state:'answered',locked:false,confirmed:true}));
  await assert.rejects(tool.run(input('alva-chair')),/失效/);assert.equal(p.answerRecommendations![0].status,'invalidated');
 }finally{await store.close()}
});
