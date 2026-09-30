import {createVisionQuestionTools} from '../api/consultation/vision-questions.js';
import {confirmVisionQuestion} from '../api/consultation/vision-routes.js';
import {visionQuestionInput} from './fixtures/alva/vision-question.js';
import {roomStyleTools} from '../api/room-style/index.js';
import type {VisionQuestion} from '../packages/contracts/alva/home-vision/chat.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {emptyProject} from '../api/model.js';
import {acceptLivingEntry,livingEntryPreview} from '../api/topology/living-entry.js';
import {snapshotScene} from './fixtures/alva/snapshot.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {requestChatAction} from '../api/mcp/actions.js';
import {stageGuidance} from '../api/consultation/stage-guidance.js';

test('ALVA-088 adopts unusual walls and uncalibrated dimensions without a generated building',()=>{
 const p=emptyProject();p.candidate=snapshotScene();p.candidate.calibration=null;
 p.candidate.walls.push({...p.candidate.walls[0],id:'unusual-wall',a:{x:2,y:0},b:{x:2.1,y:1}});
 const before=structuredClone(p.candidate),preview=livingEntryPreview(p);assert.ok(preview.warnings.length);assert.ok(preview.geometryIssue);
 acceptLivingEntry(p);assert.deepEqual(p.scene,before);assert.equal(p.candidate,null);assert.equal(p.confirmedBuilding,undefined);assert.equal(p.buildingState.attempts,0);assert.equal(p.confirmedTopology?.calibration,null);assert.ok(p.changes.at(-1)!.context.some(c=>c.includes('未声称检查通过')));
 assert.deepEqual(livingEntryPreview(p).warnings,preview.warnings);assert.throws(()=>livingEntryPreview(emptyProject()),/请先上传/);
});

test('ALVA-088 confirmation is explicit, versioned and replayable; living MCP works without a building',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('entry synthetic');await store.ensureAccessCode(project.id);
 await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{p.candidate=snapshotScene();p.candidate.calibration=null});
 const auth=await store.issueInternalSession(project.id),headers={cookie:'alva_session='+auth.token};
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  const catalog:any=await input.tools!.find(t=>t.name==='mcp_list_tools')!.run({});
  const call=input.tools!.find(t=>t.name==='mcp_call_tool')!;
  assert.ok(!catalog.tools.some((t:any)=>['generate_building','request_building_confirmation'].includes(t.name)));
  if(catalog.tools.some((t:any)=>t.name==='request_living_entry')){
   const p=await store.get(project.id);await call.run({name:'request_living_entry',arguments:{expectedRevision:p.revision}});
  }else{await call.run({name:'read_question_context',arguments:{}})}return '请查看当前操作';
 }});
 const post=(url:string,payload:unknown)=>app.inject({method:'POST',url,headers,payload:payload as any});
 try{
  let p=await store.get(project.id);
  const noSkip=await post('/api/chat/stages/switch',{stage:'living',expectedRevision:p.revision});assert.equal(noSkip.statusCode,422);
  const chat=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,text:'保留现有问题，进入生活设计',roomId:null,model:'gemini-3.8-flash-high'});assert.match(chat.body,/event: done/);
  p=await store.get(project.id);assert.ok(p.messages.at(-1)!.toolCalls?.some(c=>c.name==='request_living_entry'&&!c.isError));assert.ok(p.candidate);assert.equal((await store.chatState(p.id)).active,'floorplan');
  let action=(await store.chatActions(p.id)).find(a=>a.kind==='enter_living')!;
  p=await store.mutate(p.id,randomUUID(),p.revision,'edit',{},p=>{p.candidate!.rooms[0].name='changed'});
  assert.equal((await post('/api/chat/actions/confirm',{id:action.id,expectedRevision:p.revision,confirmed:true})).statusCode,409);
  action=(await requestChatAction(store,p,'enter_living')).action;
  const body={id:action.id,expectedRevision:p.revision,confirmed:true};assert.equal((await post('/api/chat/actions/confirm',body)).statusCode,200);
  const once=await store.get(p.id);assert.equal((await store.chatState(p.id)).active,'living');assert.equal(once.confirmedBuilding,undefined);
  assert.equal((await post('/api/chat/actions/confirm',body)).statusCode,200);assert.equal((await store.get(p.id)).revision,once.revision);
  assert.equal((await post('/api/chat',{requestId:randomUUID(),expectedRevision:once.revision,text:'读取生活问卷',roomId:null,model:'gemini-3.8-flash-high'})).statusCode,200);
  p=await store.get(p.id);assert.ok(p.messages.at(-1)!.toolCalls?.some(c=>c.name==='read_question_context'&&!c.isError));
  const floor=await post('/api/chat/stages/switch',{stage:'floorplan',expectedRevision:p.revision});assert.equal(floor.statusCode,200);assert.equal(stageGuidance(p,floor.json()).step,'enter_living');
  assert.equal((await post('/api/chat/stages/switch',{stage:'living',expectedRevision:p.revision})).statusCode,200);
 }finally{await app.close();await store.close()}
});

test('ALVA-088 questionnaire confirmation and room style adoption work on a floorplan without building output',async()=>{
 const p=emptyProject();p.candidate=snapshotScene();p.candidate.calibration=null;acceptLivingEntry(p);
 const messageId=randomUUID();p.messages.push({id:messageId,role:'user',text:'喜欢浅木色，但不喜欢每天擦柜子',status:'completed',createdAt:''});
 const cards:VisionQuestion[]=[],tools=createVisionQuestionTools({readProject:async()=>p,sourceMessageId:messageId,roomId:null,queue:c=>cards.push(c)});
 await tools.find(t=>t.name==='ask_question')!.run(visionQuestionInput(messageId));p.visionQuestions=cards;
 confirmVisionQuestion(p,{requestId:randomUUID(),expectedRevision:p.revision,id:cards[0].id,state:'answered',optionId:'A',confirmed:true});assert.equal(p.homeVision!.responses[0].answers.Q07a.value,'Q07a.warm_light_wood');
 const store=new AlvaStore();await store.init();const {project}=await store.create('style without building');await store.ensureAccessCode(project.id);
 await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{p.candidate=snapshotScene();acceptLivingEntry(p)});
 await store.updateChatState(project.id,s=>{s.active='living'});
 const app=await buildAlva(store,{assets:false}),auth=await store.issueInternalSession(project.id);
 try{
  const result:any=await roomStyleTools(store,project.id,()=>{})[0].run({expectedRevision:1,roomId:'room',style:{tags:['minimal'],wall:{color:'#ffffff',material:'paint'},floor:{color:'#ccbbaa',material:'wood'}},reason:'user choice'});
  const reply=await app.inject({method:'POST',url:'/api/room-styles/decide',headers:{cookie:'alva_session='+auth.token},payload:{requestId:randomUUID(),expectedRevision:result.revision,id:result.candidate.id,decision:'confirm',confirmed:true}});assert.equal(reply.statusCode,200,reply.body);assert.deepEqual((await store.get(project.id)).roomStyles!.room.tags,['minimal']);
 }finally{await app.close();await store.close()}
});
