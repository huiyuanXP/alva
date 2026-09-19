import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { sampleProject } from '../apps/api/sample.js';
import { withQuestionOptions, questionEvidence } from '../apps/api/question-options.js';
import { nextQuestions, questionGroups } from '../apps/api/questions.js';
import { questionAnswer, needsFreeDiscussion } from '../packages/contracts/ask-question.js';
import { applyManual, addSuggestion } from '../apps/api/requirements.js';
import { buildApp } from '../apps/api/app.js';
import { Store } from '../apps/api/store.js';
const basic=(field_key:string,room_id:string|null='living')=>({id:`${room_id||'project'}:${field_key}`,field_key,room_id,group:'test',text:'请确认这个字段'});

test('intake v1: every existing field has exactly A+B+C+D and free input; generation is read only',()=>{
 const p=sampleProject(randomUUID()),before=JSON.stringify(p);
 for(const field of questionGroups.flatMap(g=>g.fields)) {
  const q=withQuestionOptions(p,basic(field));
  assert.deepEqual(q.options.map(o=>o.id),['A','B','C','D']);assert.equal(q.freeform.id,'E');
  assert.ok(q.options.every(o=>o.label.length>0));assert.ok(q.recommendation.rationale.length>0);
 }
 assert.equal(JSON.stringify(p),before);assert.equal(nextQuestions(p,'living').length,2);
});
test('intake v1: same-room information guides recommendation; other room and unscoped evidence do not leak',()=>{
 const p=sampleProject(randomUUID());
 p.evidence.push({id:'baby-other',room_id:'room2',quote:'房间用于宝宝照护',source:'user_chat',created_at:new Date().toISOString()});
 p.evidence.push({id:'legacy',quote:'宝宝房',source:'user_chat',created_at:new Date().toISOString()});
 const living=withQuestionOptions(p,basic('functions'));assert.doesNotMatch(living.options[0].label,/尿布/);
 const nursery=withQuestionOptions(p,basic('functions','room2'));assert.match(nursery.options[0].label,/尿布/);assert.deepEqual(nursery.recommendation.evidence_ids,['baby-other']);
 assert.ok(!questionEvidence(p,'living').some(e=>['baby-other','legacy'].includes(e.id)));
 const message_id=randomUUID();p.messages.push({id:message_id,role:'user',content:'阅读优先',room_id:'living',run_id:randomUUID(),status:'complete',created_at:new Date().toISOString()});
 p.evidence.push({id:'reading',message_id,quote:'阅读优先',source:'user_chat',created_at:new Date().toISOString()});
 assert.match(withQuestionOptions(p,basic('functions')).options[0].label,/阅读/);
});
test('intake v1: missing facts have no fabricated amount, dimension, currency or household',()=>{
 const p=sampleProject(randomUUID());
 for(const field of ['budget','currency','occupants','target_width','target_depth','target_height']) {
  const q=withQuestionOptions(p,basic(field));assert.equal(q.options[0].value,null);assert.equal(q.options[0].requires_input,true);assert.equal(q.recommendation.basis,'starting_point');
  assert.throws(()=>questionAnswer(q,'A',''));
 }
 const budget=withQuestionOptions(p,basic('budget',null));assert.equal(questionAnswer(budget,'A','50000').value,50000);
 assert.equal(needsFreeDiscussion(budget,'E','五万到六万之间，但我更在意哪些需要先做'),true);
 assert.equal(needsFreeDiscussion(budget,'E','50000'),false);
 assert.equal(needsFreeDiscussion(budget,'A','不是一个数字'),false);
 for(const text of ['', '50000 SGD','50,000','50000-60000','-1','NaN','Infinity'])assert.throws(()=>questionAnswer(budget,'E',text));
 assert.equal(questionAnswer(budget,'B','').answer_state,'unknown');assert.equal(questionAnswer(budget,'B','').value,null);
 const currency=withQuestionOptions(p,basic('currency',null));assert.equal(questionAnswer(currency,'E','sgd').value,'SGD');
 assert.throws(()=>questionAnswer(withQuestionOptions(p,basic('target_width')),'E','0'));
});
test('intake v1: arbitrary free response is one field only; skipped answers are not repeated',()=>{
 const p=sampleProject(randomUUID()),q=withQuestionOptions(p,basic('functions'));
 assert.throws(()=>questionAnswer(q,'',''));
 const answer=questionAnswer(q,'E','我想把这里做成音乐室，而不是推荐的用途');
 assert.equal(answer.value,'我想把这里做成音乐室，而不是推荐的用途');assert.equal(answer.room_id,'living');
 const originalScene=JSON.stringify(p.scene);applyManual(p,answer);p.version++;
 assert.equal(p.requirements.length,1);assert.equal(p.requirements[0].source,'manual');assert.equal(p.requirements[0].confirmation_state,'provided');assert.equal(JSON.stringify(p.scene),originalScene);
 applyManual(p,{room_id:null,field_key:'occupants',value:null,answer_state:'skipped'});p.version++;
 assert.ok(!nextQuestions(p,'living').some(q=>q.field_key==='occupants'));
});
test('intake v1: existing evidence-backed proposal keeps its adoption ID; mismatched-room references rejected',()=>{
 const p=sampleProject(randomUUID());applyManual(p,{room_id:'living',field_key:'purpose',value:'阅读优先',answer_state:'answered'});p.version++;
 const proposal=addSuggestion(p,{room_id:'living',field_key:'functions',value:'书籍易取放并搭配阅读照明',rationale:'根据阅读用途',evidence_ids:[p.evidence[0].id]},p.version);
 const q=withQuestionOptions(p,basic('functions'));assert.equal(q.recommendation.suggestion_id,proposal.id);assert.equal(q.options[0].value,proposal.value);
 p.evidence[0].room_id='room2';assert.equal(withQuestionOptions(p,basic('functions')).recommendation.suggestion_id,undefined);
});
test('intake v1: existing answer route persists choices with idempotency and optimistic-concurrency protection',async()=>{
 const store=new Store();await store.init();const app=await buildApp(store,{accessCode:'intake-fixture-only',origin:'http://127.0.0.1',assets:false});
 try {
  const login=await app.inject({method:'POST',url:'/api/session/login',payload:{code:'intake-fixture-only'}});
  const headers={cookie:login.cookies[0].name+'='+login.cookies[0].value};const p=await store.create('owner');
  const qs=await app.inject({url:`/api/projects/${p.id}/questions?room_id=living`,headers});assert.equal(qs.statusCode,200);assert.equal(qs.json().questions[0].options.length,4);
  const q=withQuestionOptions(p,basic('functions')),payload={...questionAnswer(q,'E','不需要茶几，保留活动区'),expected_version:p.version,request_id:randomUUID()};
  const post=()=>app.inject({method:'POST',url:`/api/projects/${p.id}/requirements`,headers,payload});
  const saved=await post();assert.equal(saved.statusCode,200);const replay=await post();assert.equal(replay.statusCode,200);assert.equal(saved.json().version,replay.json().version);
  const stale=await app.inject({method:'POST',url:`/api/projects/${p.id}/requirements`,headers,payload:{...payload,request_id:randomUUID(),value:'过时的修改'}});assert.equal(stale.statusCode,409);
  assert.equal((await store.get(p.id,'owner')).requirements[0].value,payload.value);
 }finally{await app.close();await store.close();}
});
