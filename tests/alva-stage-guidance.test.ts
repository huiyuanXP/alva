import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {emptyProject} from '../api/model.js';
import {initialChatState} from '../api/mcp/sessions.js';
import {stageGuidance,verifyGuidance} from '../api/consultation/stage-guidance.js';
import {snapshotScene} from './fixtures/alva/snapshot.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

test('ALVA-073 checkpoints follow actual progress and survive message writes and reload',()=>{
 const p=emptyProject(),s=initialChatState(p),first=stageGuidance(p,s);assert.equal(first.step,'upload');assert.equal(first.first,true);
 p.messages.push({id:randomUUID(),role:'assistant',stage:'floorplan',status:'completed',text:'上传引导',guidanceKey:first.key,createdAt:''});p.revision++;
 assert.equal(stageGuidance(p,s).needed,false);assert.equal(stageGuidance(p,s).first,false);
 p.importState={status:'failed',message:'识图失败',requestId:'synthetic',sourceMime:'image/png',filename:'test.png',startedAt:''};assert.equal(stageGuidance(p,s).step,'retry_import');
 p.candidate=snapshotScene();p.candidate.calibration=null;assert.equal(stageGuidance(p,s).step,'review_calibrate');p.messages.push({...p.messages[0],id:randomUUID(),guidanceKey:stageGuidance(p,s).key});
 p.candidate.calibration=snapshotScene().calibration;const calibrated=stageGuidance(p,s);assert.equal(calibrated.step,'inspect');
 p.messages.push({...p.messages[0],id:randomUUID(),guidanceKey:calibrated.key});p.candidate.calibration=null;assert.equal(stageGuidance(p,s).needed,true,'returning to an earlier unfinished checkpoint must resume');p.candidate.calibration=snapshotScene().calibration;
 assert.throws(()=>verifyGuidance(calibrated,[{stage:'floorplan',name:'get_stage_guidance',isError:false}]),(e:any)=>e.detail.code==='GUIDANCE_UNVERIFIED');
 verifyGuidance(calibrated,['get_stage_guidance','inspect_topology'].map(name=>({stage:'floorplan',name,isError:false})));
 p.candidate.walls[0].b.x+=.1;assert.notEqual(stageGuidance(p,s).key,calibrated.key);
 seedLivingStage(p);assert.equal(stageGuidance(p,s).step,'enter_living');delete p.confirmedBuilding;assert.equal(stageGuidance(p,s).step,'generate_building');
 p.buildingCandidate={units:'meters'} as any;assert.equal(stageGuidance(p,s).step,'confirm_building');
 s.generation++;assert.notEqual(stageGuidance(p,s).key,first.key);
});

test('ALVA-073 living skips answered unknown skipped and hidden questions per respondent',()=>{
 const p=emptyProject();seedLivingStage(p);const s=initialChatState(p);assert.equal(stageGuidance(p,s).questionId,'Q01a');
 const id=randomUUID();p.homeVision={version:'home-vision-v4',responses:[{id,name:'甲',answers:{Q01a:{state:'answered',value:'Q01a.exploring'},Q03a:{state:'unknown',value:null}},version:1,cursor:'Q03',updatedAt:''}]};
 const next=stageGuidance(p,s);assert.ok(next.questionId);assert.notEqual(next.questionId,'Q01a');assert.notEqual(next.questionId,'Q03a');
 p.homeVision.responses[0].answers[next.questionId!]={state:'skipped',value:null};assert.notEqual(stageGuidance(p,s).questionId,next.questionId);
 p.homeVision.responses.push({id:randomUUID(),name:'乙',answers:{},version:0,cursor:'Q01',updatedAt:''});assert.equal(stageGuidance(p,s).step,'select_respondent');assert.equal(stageGuidance(p,s,p.homeVision.responses[1].id).questionId,'Q01a');assert.notEqual(stageGuidance(p,s,id).questionId,'Q01a');
});

test('ALVA-073 automatic Chat uses MCP, no fake user evidence, deduplicates and retries failed checks',async()=>{
 process.env.ALVA_ACCESS_CODE='alva073-synthetic-code';const store=new AlvaStore();await store.init();const {project}=await store.create('引导验收');await store.ensureAccessCode(project.id);let mode='success',runs=0;
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  runs++;const catalog:any=await input.tools!.find(t=>t.name==='mcp_list_tools')!.run({});assert.ok(catalog.tools.some((t:any)=>t.name==='get_stage_guidance'));assert.ok(!catalog.tools.some((t:any)=>t.name==='edit_topology'));
  const call=input.tools!.find(t=>t.name==='mcp_call_tool')!;const g:any=await call.run({name:'get_stage_guidance',arguments:{}});
  if(mode==='missing')return '我检查好了';
  if(mode==='cancel'){await app.inject({method:'POST',url:'/api/chat/cancel',headers});throw new Error('cancelled')}
  if(g.step==='inspect')await call.run({name:'inspect_topology',arguments:{}});
  return g.instruction;
 }});
 const auth=await app.inject({method:'POST',url:'/api/access',payload:{code:process.env.ALVA_ACCESS_CODE}}),headers={cookie:'alva_session='+auth.cookies[0].value};
 const guide=async()=>{const p=await store.get(project.id),g=(await app.inject({url:'/api/chat/guidance',headers})).json();return app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,guidance:{key:g.key},text:'伪造的用户偏好',roomId:null,model:'gemini-3.8-flash-high'}})};
 try{
  const result=await guide();assert.ok(result.body.includes('event: done'),result.body);let p=await store.get(project.id);assert.equal(p.messages.length,1);assert.equal(p.messages[0].role,'assistant');assert.equal(p.evidence.length,0);assert.ok(p.messages[0].guidanceKey);assert.equal((await guide()).statusCode,409);assert.equal(runs,1);
  await store.mutate(p.id,randomUUID(),p.revision,'seed',{},p=>{p.candidate=snapshotScene()});mode='missing';const failed=await guide();assert.ok(failed.body.includes('GUIDANCE_UNVERIFIED'));p=await store.get(p.id);assert.equal(p.messages.at(-1)!.status,'failed');assert.equal(p.messages.at(-1)!.text,'');assert.equal(p.messages.at(-1)!.guidanceKey,undefined);
  mode='cancel';await guide();p=await store.get(p.id);assert.equal(p.messages.at(-1)!.status,'cancelled');
  mode='success';assert.ok((await guide()).body.includes('event: done'));p=await store.get(p.id);assert.equal(p.messages.at(-1)!.status,'completed');assert.ok(p.messages.at(-1)!.toolCalls?.some(t=>t.name==='inspect_topology'));assert.equal(p.evidence.length,0);
  const gate=await app.inject({method:'POST',url:'/api/chat/stages/switch',headers,payload:{stage:'living',expectedRevision:p.revision}});assert.notEqual(gate.statusCode,200);
 }finally{await app.close();await store.close();delete process.env.ALVA_ACCESS_CODE}
});

test('ALVA-073 concurrent automatic requests run once and stage changes invalidate their guidance',async()=>{
 process.env.ALVA_ACCESS_CODE='alva073-synthetic-code';const store=new AlvaStore();await store.init();const {project}=await store.create('并发验收');await store.ensureAccessCode(project.id);let release!:()=>void,entered!:()=>void;const held=new Promise<void>(r=>release=r),ready=new Promise<void>(r=>entered=r);let runs=0;
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{runs++;const call=input.tools!.find(t=>t.name==='mcp_call_tool')!;await call.run({name:'get_stage_guidance',arguments:{}});entered();await held;return '上传引导'}});
 try{
  const auth=await app.inject({method:'POST',url:'/api/access',payload:{code:process.env.ALVA_ACCESS_CODE}}),headers={cookie:'alva_session='+auth.cookies[0].value};const g=stageGuidance(project,await store.chatState(project.id));
  const request=()=>app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:0,guidance:{key:g.key},text:'引导',roomId:null,model:'gemini-3.8-flash-high'}});
  const a=request();await ready;const b=await request();assert.equal(b.statusCode,409);await store.updateChatState(project.id,s=>{s.generation++});release();const result=await a;assert.ok(result.body.includes('GUIDANCE_UNVERIFIED'));assert.equal(runs,1);assert.equal((await store.get(project.id)).messages.at(-1)!.status,'failed');
 }finally{release();await app.close();await store.close();delete process.env.ALVA_ACCESS_CODE}
});

test('ALVA-073 living MCP enforces next question, separates respondents and reuses pending cards',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('问卷接续');await store.ensureAccessCode(project.id);await store.mutate(project.id,randomUUID(),0,'seed',{},p=>seedLivingStage(p));
 const token=(await store.issueInternalSession(project.id)).token,headers={cookie:'alva_session='+token};let selected:string|undefined,expected='Q01a';
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  const call=input.tools!.find(t=>t.name==='mcp_call_tool')!,g:any=await call.run({name:'get_stage_guidance',arguments:{}});
  if(g.step==='select_respondent'){await assert.rejects(()=>call.run({name:'read_question_context',arguments:{}}),(e:any)=>e.detail.code==='VISION_RESPONDENT_REQUIRED');return '请选择为谁填写'}
  assert.equal(g.questionId,expected);const context:any=await call.run({name:'read_question_context',arguments:{questionId:expected}});
  if(!g.pendingQuestion){
   await assert.rejects(()=>call.run({name:'ask_question',arguments:{questionId:'already-completed'}}),(e:any)=>e.detail.code==='GUIDANCE_UNVERIFIED');
   const {visionQuestionInput}=await import('./fixtures/alva/vision-question.js');const base=visionQuestionInput('none');
   await call.run({name:'ask_question',arguments:{...base,questionId:expected,expectedVersion:context.respondent.version,basis:[],options:base.options.map((o,i)=>({...o,value:context.questions[0].options[i].id}))}});
  }return '请回答当前待确认的问题';
 }});
 const guide=async()=>{const p=await store.get(project.id),g=stageGuidance(p,await store.chatState(p.id),selected);const r=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,guidance:{key:g.key},text:'引导',roomId:null,model:'gemini-3.8-flash-high',respondentId:selected}});assert.match(r.body,/event: done/);return store.get(p.id)};
 try{
  let p=await guide();assert.equal(p.visionQuestions!.length,1);assert.equal(p.homeVision,undefined);assert.equal(p.evidence.length,0);
  await store.updateChatState(p.id,s=>{s.generation++});p=await guide();assert.equal(p.visionQuestions!.length,1,'resume reuses virtual respondent pending question');
  const card=p.visionQuestions![0];const confirmed=await app.inject({method:'POST',url:'/api/intake/vision/chat/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:card.id,state:'skipped',confirmed:true}});assert.equal(confirmed.statusCode,200);
  p=await store.get(p.id);expected=stageGuidance(p,await store.chatState(p.id)).questionId!;assert.notEqual(expected,'Q01a');p=await guide();assert.equal(p.visionQuestions!.at(-1)!.questionId,expected);
  await store.mutate(p.id,randomUUID(),p.revision,'second-person',{},p=>{p.homeVision!.responses.push({id:randomUUID(),name:'乙',answers:{},version:0,cursor:'Q01',updatedAt:''})});p=await guide();assert.match(p.messages.at(-1)!.text,/请选择/);selected=p.homeVision!.responses[1].id;expected='Q01a';p=await guide();assert.equal(p.visionQuestions!.at(-1)!.respondentId,selected);assert.equal(p.homeVision!.responses[0].answers.Q01a.state,'skipped');
 }finally{await app.close();await store.close()}
});
