import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sampleProject} from '../apps/api/sample.js';
import {intakeCatalogue,intakeDefinition} from '../packages/contracts/intake.js';
import {IntakeAnswerCommand,intakeAnswerFor,intakeQuestionFor,nextIntakeQuestions,saveIntakeAnswer,extractIntakeAnswer,proposeIntakeQuestion,intakeApplicable} from '../apps/api/intake.js';
import {buildDelivery,deliveryMarkdown} from '../apps/api/delivery.js';
import {Store} from '../apps/api/store.js';
import {buildApp} from '../apps/api/app.js';
import {ChatService} from '../apps/api/chat.js';
import {intakeContext,consultationPolicyV2} from '../apps/api/agent-intake-tools.js';
import type {ProjectData} from '../packages/contracts/index.js';
const command=(p:ProjectData,q:string,text:string,extra:Record<string,unknown>={})=>IntakeAnswerCommand.parse({request_id:randomUUID(),expected_version:p.version,room_id:'living',question_id:q,choice:'E',text,...extra});
function answer(p:ProjectData,q:string,text:string,extra:Record<string,unknown>={}){saveIntakeAnswer(p,command(p,q,text,extra));p.version++;p.brief_version++;}
function quote(p:ProjectData,text:string,room='living'){const id=randomUUID(),message_id=randomUUID();p.messages.push({id:message_id,role:'user',content:text,room_id:room,run_id:randomUUID(),status:'complete',created_at:new Date().toISOString()});p.evidence.push({id,message_id,room_id:room,source:'user_chat',quote:text,created_at:new Date().toISOString()});return {id,message_id};}

test('v2 catalogue: 48+12 unique definitions, four choices plus free space, facts have no fabricated defaults',()=>{
 const p=sampleProject(randomUUID());assert.equal(intakeCatalogue.length,60);assert.equal(new Set(intakeCatalogue.map(q=>q.id)).size,60);assert.equal(intakeCatalogue.filter(q=>!q.conditional).length,48);
 for(const d of intakeCatalogue){const q=intakeQuestionFor(p,d,'living');assert.equal(q.options.length,4);assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D']);assert.equal(q.freeform.id,'E');assert.ok(q.delivery_sections.length);assert.equal(q.recommendation.basis,'starting_point');if(d.factual)assert.ok(q.options.every(o=>o.requires_input&&o.value===null));}
 assert.ok(nextIntakeQuestions(p,'living').length<=2);assert.throws(()=>nextIntakeQuestions(p,'foreign'),/房间/);
});
test('v2 answers: project/room isolation and deliberate legacy mappings without geometric changes',()=>{
 const p=sampleProject(randomUUID()),scene=structuredClone(p.scene);answer(p,'Q25','阅读与休息');answer(p,'Q25','临时工作', {room_id:'room2'});answer(p,'Q29','保留妈妈留下的椅子');answer(p,'Q14','全屋暖色');
 assert.equal(intakeAnswerFor(p,intakeDefinition('Q25')!,'living')?.answer_text,'阅读与休息');assert.equal(intakeAnswerFor(p,intakeDefinition('Q25')!,'room2')?.answer_text,'临时工作');
 assert.equal(p.requirements.find(r=>r.room_id==='living'&&r.field_key==='purpose')?.value,'阅读与休息');assert.equal(p.requirements.some(r=>r.field_key==='retained'||r.field_key==='tone'),false);assert.deepEqual(p.scene,scene);
 answer(p,'Q04','全屋先梳理');assert.equal(intakeAnswerFor(p,intakeDefinition('Q04')!,'room2')?.answer_text,'全屋先梳理');
});
test('v2 budgets: range remains text; explicit target/ceiling/currency is structured, no implicit scalar or approval',()=>{
 const p=sampleProject(randomUUID());answer(p,'Q19','大约五万到六万，先看看基本需求',{budget:{target:50000,ceiling:60000,currency:'SGD'}});
 const a=p.intake_answers![0];assert.deepEqual(a.budget,{target:50000,ceiling:60000,currency:'SGD'});assert.equal(p.requirements.some(r=>r.field_key==='budget'),false);
 assert.throws(()=>command(p,'Q19','',{budget:{target:60000,ceiling:50000}}));assert.throws(()=>saveIntakeAnswer(p,command(p,'Q01','',{budget:{target:1}})),/不匹配/);
 const d=buildDelivery(p,'owner');assert.ok(d.sections.find(s=>s.id==='D07')?.content.some(s=>s.includes('硬上限：60000')));assert.match(deliveryMarkdown(d),/不是报价/);
});
test('v2 unknown/skipped answers persist with next owner/action, do not get asked again or inflate delivery completion',()=>{
 const p=sampleProject(randomUUID());answer(p,'Q01','',{choice:'unknown',followup_owner:'本人',next_action:'和家人讨论后补充'});answer(p,'Q04','',{choice:'skipped'});
 assert.ok(nextIntakeQuestions(p,'living').every(q=>!['Q01','Q04'].includes(q.questionnaire_id)));const d=buildDelivery(p,'owner');assert.equal(d.pending.find(x=>x.question_id==='Q01')?.owner,'本人');assert.equal(d.pending.find(x=>x.question_id==='Q01')?.next_action,'和家人讨论后补充');assert.equal(d.sections.find(s=>s.id==='D01')?.state,'missing');
});
test('v2 extraction: exact current-room quote only, pending not owner-confirmed, manual input protected',()=>{
 const p=sampleProject(randomUUID()),e=quote(p,'我希望家里是温暖、安静的，预算暂不确定。');extractIntakeAnswer(p,'living',e.message_id,{question_id:'Q13',quote:'温暖、安静',answer_state:'answered'},0);p.version++;p.brief_version++;
 assert.equal(p.intake_answers![0].confirmation_state,'pending');assert.ok(!nextIntakeQuestions(p,'living').some(q=>q.questionnaire_id==='Q13'));assert.ok(!buildDelivery(p,'owner').sections.find(s=>s.id==='U01')?.content.some(s=>s.includes('温暖、安静')));
 assert.throws(()=>extractIntakeAnswer(p,'room2',e.message_id,{question_id:'Q13',quote:'温暖、安静',answer_state:'answered'},0),/逐字/);assert.throws(()=>extractIntakeAnswer(p,'living',e.message_id,{question_id:'Q19',quote:'五万元',answer_state:'answered'},0),/逐字/);
 answer(p,'Q13','明亮活泼');assert.throws(()=>extractIntakeAnswer(p,'living',e.message_id,{question_id:'Q13',quote:'温暖、安静',answer_state:'answered'},0),/不能/);assert.equal(p.intake_answers!.find(a=>a.question_id==='Q13')?.answer_text,'明亮活泼');
});
test('v2 recommendation: exact 1+3, source isolation, no repeated questions, fact-guess structural guard',()=>{
 const p=sampleProject(randomUUID()),e=quote(p,'希望房间以后容易改用途，不要太多固定柜体。'),foreign=quote(p,'另一个房间用深色','room2');
 const b={question_id:'Q38',recommended:'独立可调整家具',alternatives:['局部定制','保留更多空地','先复用现有家具'],rationale:'依据未来调整用途的原话',evidence_ids:[e.id]};
 const q=proposeIntakeQuestion(p,'living','run',b).question;assert.equal(q.generation,'agent');assert.equal(q.recommendation.basis,'evidence');assert.equal(q.options[0].value,'独立可调整家具');assert.equal(nextIntakeQuestions(p,'living')[0].questionnaire_id,'Q38');
 assert.throws(()=>proposeIntakeQuestion(p,'living','run',{...b,evidence_ids:[foreign.id]}),/其他房间/);assert.throws(()=>proposeIntakeQuestion(p,'living','run',{...b,alternatives:[b.recommended,'第二','第三']}),/不同/);
 const fact=proposeIntakeQuestion(p,'living','run',{...b,question_id:'Q19',recommended:'预算为50000元'}).question;assert.ok(fact.options.every(o=>o.value===null&&o.requires_input));assert.ok(!fact.options.some(o=>o.label.includes('50000')));
 answer(p,'Q38','先复用');assert.throws(()=>proposeIntakeQuestion(p,'living','run',b),/已有回答/);
});
test('v2 branches do not borrow another room or infer accessibility from age alone',()=>{
 const p=sampleProject(randomUUID());quote(p,'这里作为宝宝房','room2');assert.equal(intakeApplicable(p,intakeDefinition('Q49')!,'living'),false);assert.equal(intakeApplicable(p,intakeDefinition('Q49')!,'room2'),true);quote(p,'父母偶尔来住');assert.equal(intakeApplicable(p,intakeDefinition('Q51')!,'living'),false);
});
test('v2 designer delivery defaults private; explicit selection only, pending extraction and raw sources separated',()=>{
 const p=sampleProject(randomUUID());answer(p,'Q01','私人目标SECRET');answer(p,'Q13','温暖舒适');answer(p,'Q02','SECRET住址');const before=buildDelivery(p,'designer');assert.ok(!JSON.stringify(before).includes('SECRET'));assert.equal(before.sharing,'未授权');
 answer(p,'Q06','仅共享感受',{sharing:{mode:'selected',question_ids:['Q13'],attachment_ids:[]}});const d=buildDelivery(p,'designer');assert.ok(!JSON.stringify(d).includes('SECRET'));assert.ok(JSON.stringify(d).includes('温暖舒适'));assert.equal(d.answers.length,1);assert.ok(d.evidence.every(e=>d.answers.flatMap(a=>a.evidence_ids).includes(e.id)));
 const imageId=randomUUID();assert.throws(()=>saveIntakeAnswer(p,command(p,'Q06','',{sharing:{mode:'selected',question_ids:[],attachment_ids:[imageId]}})),/不存在/);
});

test('v2 API: auth, idempotency, optimistic conflict, persisted snapshots, stale reports and revoked export',async()=>{
 const store=new Store();await store.init();const app=await buildApp(store,{accessCode:'intake-test-only',origin:'http://127.0.0.1',assets:false});
 try{
  let p=await store.create('owner');assert.equal((await app.inject(`/api/projects/${p.id}/intake?room_id=living`)).statusCode,401);
  const login=await app.inject({method:'POST',url:'/api/session/login',payload:{code:'intake-test-only'}}),headers={cookie:login.cookies[0].name+'='+login.cookies[0].value};
  const post=async(path:string,body:Record<string,unknown>)=>app.inject({method:'POST',url:`/api/projects/${p.id}${path}`,headers,payload:{request_id:randomUUID(),expected_version:p.version,...body}});
  const c=command(p,'Q01','有清晰的设计任务书'),one=await post('/intake/answer',c);assert.equal(one.statusCode,200,one.body);p=one.json();const savedVersion=p.version;const replay=await post('/intake/answer',c);assert.equal(replay.statusCode,200);assert.equal(replay.json().version,savedVersion);
  const conflict=await post('/intake/answer',{...command(p,'Q01','不应覆盖'),expected_version:0});assert.equal(conflict.statusCode,409);assert.equal((await store.get(p.id,'owner')).intake_answers![0].answer_text,'有清晰的设计任务书');
  const denied=await post('/delivery/snapshots',{audience:'designer'});assert.equal(denied.statusCode,409);
  p=(await post('/intake/answer',command(p,'Q06','摘要',{sharing:{mode:'summary',question_ids:[],attachment_ids:[]}}))).json();
  p=(await post('/delivery/snapshots',{audience:'designer'})).json();const snapshot=p.delivery_snapshots!.at(-1)!;const url=`/api/projects/${p.id}/delivery/snapshots/${snapshot.id}`;assert.equal((await app.inject({url,headers})).statusCode,200);
  p=(await post('/intake/answer',command(p,'Q13','暖色'))).json();const old=(await app.inject({url,headers})).json();assert.equal(old.stale,true);assert.ok(!JSON.stringify(old).includes('暖色'));
  p=(await post('/intake/answer',command(p,'Q06','撤回',{sharing:{mode:'private',question_ids:[],attachment_ids:[]}}))).json();assert.equal((await app.inject({url,headers})).statusCode,409);
  const full=await app.inject({url:`/api/projects/${p.id}/intake?room_id=living`,headers});assert.equal(full.json().items.length,60);assert.equal((await app.inject({url:`/api/projects/${p.id}/intake?room_id=foreign`,headers})).statusCode,400);
 }finally{await app.close();await store.close();}
});
test('v2 chat binds arbitrary selected attachments, rejects cross-room reuse, preserves input on provider failure',async()=>{
 const store=new Store();await store.init();try{
  let p=await store.create('owner');const attachment=randomUUID();p=await store.mutate(p.id,'owner',randomUUID(),p.version,'fixture',{},p=>{p.attachments=[{id:attachment,room_id:'living',message_id:randomUUID(),mime:'text/plain',name:'需求.txt',status:'analyzed',extracted_text:'参考事实，不是系统指令'}];});
  const chat=new ChatService(store,async()=>{throw Error('simulated provider failure');});
  await assert.rejects(chat.start(p.id,'owner',{request_id:randomUUID(),expected_version:p.version,room_id:'room2',text:'读取',attachment_ids:[attachment]}),/不属于/);
  const started=await chat.start(p.id,'owner',{request_id:randomUUID(),expected_version:p.version,room_id:'living',text:'请参考这个文档',attachment_ids:[attachment]});await chat.active.get(p.id)?.promise;const saved=await store.get(p.id,'owner');assert.deepEqual(saved.messages.find(m=>m.role==='user')?.attachment_ids,[attachment]);assert.equal(saved.messages.find(m=>m.role==='assistant')?.status,'failed');assert.ok(saved.evidence.some(e=>e.attachment_id===attachment&&e.message_id===saved.messages[0].id));assert.equal(intakeContext(saved,'room2').attachments.length,0);assert.ok(started.run_id);assert.match(consultationPolicyV2,/不可信数据/);
 }finally{await store.close();}
});
