import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {emptyProject,type Project} from '../api/model.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createVisionQuestionTools} from '../api/consultation/vision-questions.js';
import {confirmVisionQuestion} from '../api/consultation/vision-routes.js';
import {saveVisionResponse} from '../api/intake/vision-service.js';
import {recommendationContext} from '../api/furniture/recommendations.js';
import type {VisionQuestion} from '../packages/contracts/alva/home-vision/chat.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import {visionQuestionInput} from './fixtures/alva/vision-question.js';
const quote='喜欢浅木色，但不喜欢每天擦柜子';
function seed(){const p=emptyProject();seedLivingStage(p);const messageId=randomUUID();p.messages.push({id:messageId,role:'user',text:quote,status:'completed',createdAt:new Date().toISOString()});return {p,messageId}}
function toolset(p:Project,messageId:string,respondentId?:string){const queued:VisionQuestion[]=[],tools=createVisionQuestionTools({readProject:async()=>p,sourceMessageId:messageId,roomId:null,respondentId,queue:c=>queued.push(c)});return {queued,ask:tools.find(t=>t.name==='ask_question')!,read:tools.find(t=>t.name==='read_question_context')!}}
const command=(p:Project,id:string)=>({requestId:randomUUID(),expectedRevision:p.revision,id,state:'answered' as const,optionId:'A',confirmed:true as const});
const error=(code:string)=>(e:any)=>e.detail?.code===code&&!!e.detail.repairActions?.length;
test('hypothesis and queued expanded question do not save answers or recommendation jobs',async()=>{
 const {p,messageId}=seed(),before=structuredClone(p),tools=toolset(p,messageId);
 const context=await tools.read.run({questionId:'Q07a'}) as any;assert.equal(context.respondent.version,0);assert.equal(context.sources[0].quote,quote);
 await tools.ask.run(visionQuestionInput(messageId));assert.equal(tools.queued.length,1);assert.deepEqual(p,before);assert.equal(p.homeVision,undefined);
});
test('multi-person selection and exact source quotes prevent mixing preferences',async()=>{
 const {p,messageId}=seed();for(const name of ['Alex','Sam'])saveVisionResponse(p,{id:randomUUID(),name,expectedVersion:0,cursor:'Q07',answers:{}});
 await assert.rejects(toolset(p,messageId).read.run({}),error('VISION_RESPONDENT_REQUIRED'));
 const alex=p.homeVision!.responses[0],sam=p.homeVision!.responses[1],tools=toolset(p,messageId,alex.id);
 const input={...visionQuestionInput(messageId),expectedVersion:1,basis:[{id:`answer:${sam.id}:Q07a`,quote:'虚构偏好'}]};await assert.rejects(tools.ask.run(input),error('VISION_BASIS_INVALID'));
 await assert.rejects(toolset(p,messageId,randomUUID()).read.run({}),error('VISION_RESPONDENT_MISSING'));
});
test('native choice constraints reject old IDs, hidden options and duplicate answers',async()=>{
 const {p,messageId}=seed(),tools=toolset(p,messageId);
 await assert.rejects(tools.read.run({questionId:'Q07'}),error('VISION_QUESTION_HIDDEN'));
 const invalid=visionQuestionInput(messageId);invalid.options[0].value='Q07a.invented';await assert.rejects(tools.ask.run(invalid),error('VISION_VALUE_INVALID'));
 const duplicate=visionQuestionInput(messageId);duplicate.options[1].value=duplicate.options[0].value;await assert.rejects(tools.ask.run(duplicate),error('VISION_DUPLICATE_OPTIONS'));
});
test('explicit confirmation syncs native answer and illustrative details without legacy mapping',async()=>{
 const {p,messageId}=seed(),tools=toolset(p,messageId);await tools.ask.run(visionQuestionInput(messageId));p.visionQuestions=tools.queued;
 confirmVisionQuestion(p,command(p,tools.queued[0].id));const r=p.homeVision!.responses[0];assert.equal(r.answers.Q07a.value,'Q07a.warm_light_wood');assert.equal(r.version,1);assert.match(r.chatAnswers![0].text,/标准双门柜/);assert.equal(p.answers.length,0);
 assert.equal(p.answerRecommendations!.length,1);assert.match(recommendationContext(p,p.answerRecommendations![0].id).answer.text,/未采用/);
 confirmVisionQuestion(p,command(p,tools.queued[0].id));assert.equal(p.answerRecommendations!.length,1);assert.equal(r.version,1);
});
test('independent form edits invalidate old cards and recommendations while preserving unrelated answers',async()=>{
 const {p,messageId}=seed(),tools=toolset(p,messageId);await tools.ask.run(visionQuestionInput(messageId));p.visionQuestions=tools.queued;confirmVisionQuestion(p,command(p,tools.queued[0].id));let r=p.homeVision!.responses[0];
 const second=toolset(p,messageId,r.id);await second.ask.run({...visionQuestionInput(messageId),expectedVersion:1});p.visionQuestions.push(...second.queued);
 saveVisionResponse(p,{...r,expectedVersion:1,answers:{...r.answers,Q07a:{state:'answered',value:'Q07a.cool_gray'},Q06a:{state:'answered',value:['Q06a.calm']}}});
 assert.throws(()=>confirmVisionQuestion(p,command(p,second.queued[0].id)),error('VISION_VERSION_CONFLICT'));
 r=p.homeVision!.responses[0];assert.equal(r.chatAnswers![0].status,'superseded');assert.equal(p.answerRecommendations![0].status,'invalidated');assert.deepEqual(r.answers.Q06a.value,['Q06a.calm']);
 assert.throws(()=>recommendationContext(p,p.answerRecommendations![0].id),/失效/);
});
test('free text syncs to supported other value, unknown answers never generate furniture',async()=>{
 const {p,messageId}=seed(),tools=toolset(p,messageId);await tools.ask.run(visionQuestionInput(messageId));p.visionQuestions=tools.queued;
 const b=command(p,tools.queued[0].id);confirmVisionQuestion(p,{...b,optionId:undefined,customText:'不喜欢这些配色，想先看米灰色'});
 assert.deepEqual(p.homeVision!.responses[0].answers.Q07a.value,{choice:'Q07a.other',text:'不喜欢这些配色，想先看米灰色'});
 const q=seed(),t=toolset(q.p,q.messageId);await t.ask.run(visionQuestionInput(q.messageId));q.p.visionQuestions=t.queued;confirmVisionQuestion(q.p,{...command(q.p,t.queued[0].id),state:'unknown',optionId:undefined});assert.equal(q.p.answerRecommendations,undefined);assert.equal(q.p.homeVision!.responses[0].answers.Q07a.state,'unknown');
});
test('actual Chat routes persist successful cards, discard failed turns and synchronize through confirmation route',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-068 route fixture');await store.ensureAccessCode(project.id);await store.mutate(project.id,randomUUID(),0,'seed',{},seedLivingStage);
 let fail=false;const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  const p=await store.get(project.id),message=p.messages.filter(m=>m.role==='user').at(-1)!;
  const tools=input.tools!;const read=await tools.find(t=>t.name==='read_question_context')!.run({questionId:'Q07a'}) as any;
  await tools.find(t=>t.name==='ask_question')!.run({...visionQuestionInput(message.id),expectedVersion:read.respondent.version});if(fail)throw Error('synthetic cancel/failure');return '需求猜测与扩展题卡已生成，等你确认。';
 }});const headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};
 const post=(url:string,payload:any)=>app.inject({method:'POST',url,headers,payload});
 try{
  let p=await store.get(project.id);const chat=()=>post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,text:quote,roomId:null,model:'gemini-3.8-flash-high'});
  let response=await chat();assert.match(response.body,/event: done/);p=await store.get(project.id);assert.equal(p.visionQuestions?.length,1);assert.equal(p.homeVision,undefined);
  const card=p.visionQuestions![0];response=await post('/api/intake/vision/chat/confirm',command(p,card.id));assert.equal(response.statusCode,200,response.body);p=await store.get(project.id);assert.equal(p.homeVision!.responses[0].answers.Q07a.value,'Q07a.warm_light_wood');
  const oldCardCount=p.visionQuestions!.length;fail=true;response=await chat();assert.match(response.body,/event: error/);p=await store.get(project.id);assert.equal(p.visionQuestions!.length,oldCardCount);
  const foreign=await post('/api/intake/vision/chat/confirm',command(p,randomUUID()));assert.equal(foreign.statusCode,409);assert.equal(foreign.json().detail.code,'VISION_CARD_MISSING');
  const read=await app.inject({method:'GET',url:'/api/intake/vision',headers});assert.equal(read.json().responses[0].chatAnswers[0].status,'active');assert.equal((await app.inject({method:'POST',url:'/api/intake/vision/chat/confirm',payload:command(p,card.id)})).statusCode,401);
 }finally{await app.close();await store.close()}
});

test('confirmed native Chat answer automatically starts the living Agent and floorplan cannot confirm',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-068 automatic native answer');await store.ensureAccessCode(project.id);
 const seeded=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);p.messages.push({id:'source',role:'user',text:quote,status:'completed',createdAt:new Date().toISOString()})});
 const t=toolset(seeded,'source');await t.ask.run(visionQuestionInput('source'));
 let p=await store.mutate(project.id,randomUUID(),seeded.revision,'seed-card',{},p=>{p.visionQuestions=t.queued});let calls=0;
 const app=await buildAlva(store,{assets:false,chatCodex:async input=>{calls++;const snapshot=await input.tools!.find(t=>t.name==='get_snapshot')!.run({}) as any;assert.equal(snapshot.project.homeVision.responses[0].answers.find((a:any)=>a.id==='Q07a').value,'Q07a.warm_light_wood');await input.tools!.find(t=>t.name==='skip_furniture_suggestion')!.run({reason:'本次只确认墙地配色，不需要增加家具'});return '配色已经记录，本次无需新增家具。'}});
 const headers={cookie:`alva_session=${(await store.issueInternalSession(p.id)).token}`};
 try{
  await store.updateChatState(p.id,s=>{s.active='floorplan';s.generation++});
  const denied=await app.inject({method:'POST',url:'/api/intake/vision/chat/confirm',headers,payload:command(p,t.queued[0].id)});assert.equal(denied.statusCode,409);assert.equal(denied.json().detail.code,'VISION_WRONG_STAGE');assert.equal((await store.get(p.id)).homeVision,undefined);
  await store.updateChatState(p.id,s=>{s.active='living';s.generation++});
  const confirmed=await app.inject({method:'POST',url:'/api/intake/vision/chat/confirm',headers,payload:command(p,t.queued[0].id)});assert.equal(confirmed.statusCode,200,confirmed.body);
  const deadline=Date.now()+10000;do{await new Promise(r=>setTimeout(r,50));p=await store.get(p.id)}while(p.answerRecommendations?.[0]?.status!=='completed'&&Date.now()<deadline);
  assert.equal(p.answerRecommendations?.[0]?.status,'completed');assert.equal(calls,1);assert.equal(p.proposals.length,0);
 }finally{await app.close();await store.close()}
});
