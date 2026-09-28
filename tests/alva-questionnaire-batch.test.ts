import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyAnswer} from '../api/business.js';
import {questionnaireChanges,questionnaireSnapshot} from '../packages/contracts/alva/questionnaire-batch.js';
import {publishProposals} from '../api/furniture/proposal-decisions.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import type {Proposal} from '../api/model.js';
const candidate=(x:number):Proposal=>({id:randomUUID(),title:'Test candidate',rationale:'Synthetic decision',evidenceIds:[],baseRevision:0,changes:[{action:'add',targetId:'room',values:{assetId:'alva-chair',roomId:'room',x,y:1,newId:randomUUID()}}],status:'proposed'});
const answer=(text:string)=>({questionId:'Q01',roomId:null,text,state:'answered',confirmed:true,locked:false});

test('batch MCP reads multiple answers once, keeps later changes pending and retries failure',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA077 batch');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);applyAnswer(p,answer('reading'));p.homeVision={version:'home-vision-v4',responses:[{id:randomUUID(),name:'Alex',version:1,updatedAt:'',cursor:'Q01',answers:{Q01a:{state:'answered',value:'Q01a.refresh'}}}]}});
 let calls=0,fail=true;const app=await buildAlva(store,{assets:false,chatCodex:async input=>{
  calls++;const call=async(name:string,args={})=>input.tools!.find(t=>t.name===name)!.run(args) as Promise<any>;
  const batch=await call('read_questionnaire_batch');assert.equal(batch.snapshot.answers[0].text,calls===1?'reading':'quiet reading');assert.equal(batch.snapshot.homeVision.responses[0].name,'Alex');
  if(fail){await store.mutate(p.id,randomUUID(),null,'later-answer',{},p=>applyAnswer(p,answer('quiet reading')));throw new Error('synthetic failure')}
  await store.mutate(p.id,randomUUID(),null,'during-generation',{},p=>applyAnswer(p,answer('next batch')));
  const latest=await call('get_snapshot');await call('suggest_furniture',{expectedRevision:latest.project.revision,roomIds:['room'],variants:[{title:'Reading chair',rationale:'Combined questionnaire',changes:[{action:'add',targetId:'room',values:{assetId:'alva-chair',roomId:'room',x:1,y:1}}]}]});return 'Candidate ready';
 }});const headers={cookie:'alva_session='+(await store.issueInternalSession(p.id)).token};
 const send=()=>app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,questionnaireBatch:true,text:'Send batch',roomId:null,model:'gemini-3.8-flash-high'}});
 try{
  assert.ok(questionnaireChanges(p)>=2);let result=await send();assert.match(result.body,/event: error/);p=await store.get(p.id);assert.equal(p.questionnaireDelivery?.status,'failed');assert.ok(questionnaireChanges(p));assert.equal(p.questionnaireSent,undefined);
  fail=false;result=await send();assert.match(result.body,/event: done/,result.body);p=await store.get(p.id);assert.equal(calls,2);assert.equal(p.questionnaireSent?.answers[0].text,'quiet reading');assert.equal(p.answers[0].text,'next batch');assert.equal(questionnaireChanges(p),1);assert.equal(p.proposals.length,1);assert.ok(p.messages.at(-1)?.toolCalls?.some(t=>t.name==='read_questionnaire_batch'&&!t.isError));
 }finally{await app.close();await store.close()}
});

test('proposal decisions ignore questionnaire revisions; dismiss works during Chat and with broken previews',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA077 decisions');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);publishProposals(p,[candidate(1),candidate(4)],'turn1')});
 const app=await buildAlva(store,{assets:false});const headers={cookie:'alva_session='+(await store.issueInternalSession(p.id)).token};
 const post=(url:string,extra:object,revision=0)=>app.inject({method:'POST',url,headers,payload:{requestId:randomUUID(),expectedRevision:revision,confirmed:true,...extra}});
 try{
  const [a,b]=p.proposals;p=await store.mutate(p.id,randomUUID(),null,'questionnaire',{},p=>applyAnswer(p,answer('reading')));
  let r=await post('/api/proposals/accept',{id:a.id,selectedIds:['room']});assert.equal(r.statusCode,200,r.body);
  r=await post('/api/proposals/accept',{id:b.id,selectedIds:['room']});assert.equal(r.statusCode,200,r.body);assert.equal(r.json().proposals.filter((p:Proposal)=>p.status==='accepted').length,2);
  p=await store.mutate(p.id,randomUUID(),null,'new-turn',{},p=>publishProposals(p,[candidate(5)],'turn2'));const old=p.proposals.at(-1)!;
  p=await store.mutate(p.id,randomUUID(),null,'layout',{},p=>{p.scene!.rooms[0].locked=true});r=await post('/api/proposals/accept',{id:old.id,selectedIds:['room']},p.revision);assert.notEqual(r.statusCode,200);
  p=await store.mutate(p.id,randomUUID(),null,'broken-preview',{},p=>{p.proposals.at(-1)!.changes[0].targetId='missing'});
  r=await post('/api/proposals/reject',{id:old.id});assert.equal(r.statusCode,200,r.body);const scene=r.json().scene;r=await post('/api/proposals/reject',{id:old.id});assert.equal(r.statusCode,200);assert.deepEqual(r.json().scene,scene);
  p=await store.mutate(p.id,randomUUID(),null,'older-turn',{},p=>publishProposals(p,[candidate(5)],'turn3'));const replaced=p.proposals.at(-1)!.id;
  p=await store.mutate(p.id,randomUUID(),null,'latest-turn',{},p=>publishProposals(p,[candidate(5),candidate(6)],'turn4'));assert.equal(p.proposals.find(x=>x.id===replaced)!.status,'rejected');assert.equal(p.proposals.filter(x=>x.status==='proposed').length,2);
  r=await post('/api/proposals/reject',{id:a.id});assert.equal(r.json().proposals.find((x:Proposal)=>x.id===a.id).status,'accepted');
 }finally{await app.close();await store.close()}
});
