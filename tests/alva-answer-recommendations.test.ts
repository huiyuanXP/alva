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
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  calls++;const data=await input.tools!.find(t=>t.name==='get_snapshot')!.run({}) as any;
  await input.tools!.find(t=>t.name==='suggest_furniture')!.run({expectedRevision:data.project.revision,roomIds:['room'],variants:[{title:'阅读椅候选',rationale:'根据已确认阅读习惯，在房间空闲处建议阅读椅',changes:[{action:'add',targetId:'room',values:{roomId:'room',assetId:'alva-chair',x:1,y:1,rotation:90}}]}]});return '已生成待确认的阅读椅候选';
 }});
 const post=(url:string,payload:Record<string,unknown>)=>app.inject({method:'POST',url,headers,payload});
 try{
  const answer={questionId:'Q01',roomId:null,text:'优先考虑安静阅读',state:'answered'};
  const draft=await post('/api/intake/progress',{requestId:randomUUID(),expectedRevision:p.revision,drafts:[answer],cursor:{questionId:'Q01',roomId:null}});assert.equal(draft.statusCode,200,draft.body);p=draft.json();assert.equal(p.answerRecommendations,undefined);assert.equal(calls,0);
  const confirmed=await post('/api/intake/confirm',{requestId:randomUUID(),expectedRevision:p.revision,answer,confirmed:true});assert.equal(confirmed.statusCode,200,confirmed.body);p=confirmed.json();assert.equal(p.answerRecommendations?.length,1);const job=p.answerRecommendations![0];assert.equal(job.status,'pending');
  const chat=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,recommendationId:job.id,text:'触发已确认回答建议',roomId:null,model:'gemini-3.1-flash-lite'});assert.match(chat.body,/event: done/);assert.match(chat.body,/suggest_furniture/);assert.equal(calls,1);
  p=await store.get(p.id);assert.equal(p.answerRecommendations![0].status,'completed');assert.equal(p.proposals.length,1);assert.deepEqual(p.scene,original);assert.deepEqual(p.proposals[0].evidenceIds,[job.evidenceId]);
  const duplicate=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,recommendationId:job.id,text:'重复',roomId:null,model:'gemini-3.1-flash-lite'});assert.equal(duplicate.statusCode,409);assert.equal(calls,1);
  const proposal=p.proposals[0],adopt=await post('/api/proposals/accept',{requestId:randomUUID(),expectedRevision:p.revision,id:proposal.id,selectedIds:['room'],confirmed:true});assert.equal(adopt.statusCode,200,adopt.body);assert.equal(adopt.json().scene.items.length,original!.items.length+1);assert.equal(adopt.json().scene.items.at(-1).rotation,90);
 }finally{await app.close();await store.close()}
});

test('recommendation tools reject unconfirmed invocation, disallowed assets, collisions and replaced answer sources',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic recommendation rules');
 try{
  let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);applyAnswer(p,{questionId:'Q01',roomId:null,text:'需要阅读空间',state:'answered',locked:false,confirmed:true})});
  const job=p.answerRecommendations![0],proposals:Proposal[]=[];
  const input=(assetId:string,x=1,y=1)=>({expectedRevision:p.revision,roomIds:['room'],variants:[{title:'候选',rationale:'确认回答的建议',changes:[{action:'add',targetId:'room',values:{assetId,roomId:'room',x,y}}]}]});
  await assert.rejects(recommendationTools(store,p.id,undefined,proposals)[0].run(input('alva-chair')),/先确认问卷/);
  const tool=recommendationTools(store,p.id,job.id,proposals)[0];const malformed=input('alva-chair');(malformed.variants[0].changes[0] as any).values={position:{x:5.5,y:3.5}};await assert.rejects(tool.run(malformed),(e:any)=>e.detail?.code==='FURNITURE_ARGUMENTS_INVALID'&&e.detail.repairActions[0].message.includes('position'));const mismatch=input('alva-chair');mismatch.variants[0].changes[0].targetId='alva-chair';await assert.rejects(tool.run(mismatch),(e:any)=>e.detail?.code==='FURNITURE_ROOM_MISMATCH');await assert.rejects(tool.run(input('unlicensed')),/资产不存在/);await assert.rejects(tool.run(input('alva-chair',2,2)),/重叠/);assert.equal(proposals.length,0);
  p=await store.mutate(p.id,randomUUID(),p.revision,'replace',{},p=>applyAnswer(p,{questionId:'Q01',roomId:null,text:'不需要阅读空间',state:'answered',locked:false,confirmed:true}));
  await assert.rejects(tool.run(input('alva-chair')),/失效/);assert.equal(p.answerRecommendations![0].status,'invalidated');
 }finally{await store.close()}
});

test('server starts the stage Agent after confirmation without a follow-up browser Chat request',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic automatic trigger');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},seedLivingStage);let calls=0;
 const headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};
 const app=await buildAlva(store,{assets:false,chatCodex:async input=>{calls++;const snapshot=await input.tools!.find(t=>t.name==='get_snapshot')!.run({}) as any;await input.tools!.find(t=>t.name==='suggest_furniture')!.run({expectedRevision:snapshot.project.revision,roomIds:['room'],variants:[{title:'椅子建议',rationale:'已确认的阅读需求',changes:[{action:'add',targetId:'room',values:{roomId:'room',assetId:'alva-chair',x:1,y:1}}]}]});return '有一份家具候选等待你确认'}});
 try{
  const r=await app.inject({method:'POST',url:'/api/intake/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,answer:{questionId:'Q01',roomId:null,text:'需要阅读空间',state:'answered'},confirmed:true}});assert.equal(r.statusCode,200,r.body);
  const deadline=Date.now()+10_000;do{await new Promise(resolve=>setTimeout(resolve,50));p=await store.get(p.id)}while(p.answerRecommendations?.[0]?.status!=='completed'&&Date.now()<deadline);
  assert.equal(p.answerRecommendations![0].status,'completed');assert.equal(calls,1);assert.equal(p.proposals.length,1);assert.ok(p.messages.at(-1)?.toolCalls?.some(t=>t.name==='suggest_furniture'&&!t.isError));
 }finally{await app.close();await store.close()}
});

test('a silent model cannot complete a recommendation; an explicit MCP no-furniture reason can',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic outcome proof');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);applyAnswer(p,{questionId:'Q01',roomId:null,text:'暂不需要新增家具',state:'answered',locked:false,confirmed:true})});
 let explicit=false;const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{if(explicit)await input.tools!.find(t=>t.name==='skip_furniture_suggestion')!.run({reason:'已确认回答明确不需要新增家具，保留现有物品'});return '本轮没有家具候选'}}),headers={cookie:`alva_session=${(await store.issueInternalSession(p.id)).token}`};
 const chat=()=>app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,recommendationId:p.answerRecommendations![0].id,text:'本轮确认回答建议',roomId:null,model:'gemini-3.1-flash-lite'}});
 try{
  const silent=await chat();assert.match(silent.body,/event: error/);p=await store.get(p.id);assert.equal(p.answerRecommendations![0].status,'failed');assert.equal(p.proposals.length,0);assert.match(p.answerRecommendations![0].error!,/不能标记为完成/);
  explicit=true;const resolved=await chat();assert.match(resolved.body,/event: done/);p=await store.get(p.id);assert.equal(p.answerRecommendations![0].status,'completed');assert.match(p.answerRecommendations![0].noFurnitureReason!,/不需要新增家具/);assert.equal(p.proposals.length,0);assert.ok(p.messages.at(-1)?.toolCalls?.some(t=>t.name==='skip_furniture_suggestion'&&!t.isError));
 }finally{await app.close();await store.close()}
});
