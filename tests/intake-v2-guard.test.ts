import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Agent} from '@earendil-works/pi-agent-core';
import type {createConsultationAgent} from '../apps/api/provider.js';
import {Store} from '../apps/api/store.js';
import {ChatService} from '../apps/api/chat.js';
import {ensureIntakeQuestion} from '../apps/api/intake-question-guard.js';

test('postcondition formatting pass creates one genuinely validated card, never treats prose as saved data',async()=>{
 const store=new Store();await store.init();try{
  let p=await store.create('owner');const messageId=randomUUID(),evidenceId=randomUUID(),runId=randomUUID();p=await store.mutate(p.id,'owner',randomUUID(),0,'fixture',{},p=>{p.messages.push({id:messageId,role:'user',content:'希望家具以后可以调整',room_id:'living',status:'complete',run_id:runId,created_at:new Date().toISOString()});p.evidence.push({id:evidenceId,source:'user_chat',room_id:'living',message_id:messageId,quote:'希望家具以后可以调整',created_at:new Date().toISOString()});});
  let calls=0;
  const factory:typeof createConsultationAgent=async(_system,tools,limits)=>{
   calls++;assert.equal(limits?.maxTurns,2);assert.equal(tools?.length,1);assert.equal(tools![0].name,'ask_intake_question');
   return {abort(){},async prompt(){await tools![0].execute('fixture-call',{question_id:'Q38',recommended:'可移动独立家具',alternatives:['局部固定收纳','保持现有布局','先减少家具数量'],rationale:'依据希望以后调整家具的原话',evidence_ids:[evidenceId]});}} as unknown as Agent;
  };
  const ctx={id:p.id,owner:'owner',room:'living',runId,messageId,baseVersion:p.version,cancelled:()=>false};
  assert.deepEqual(await ensureIntakeQuestion(store,ctx,factory,()=>{}),{needed:true,provided:true});const saved=await store.get(p.id,'owner');assert.equal(saved.intake_questions?.length,1);assert.equal(saved.intake_questions![0].question.recommendation.evidence_ids[0],evidenceId);assert.equal(saved.intake_answers?.length??0,0);
  assert.deepEqual(await ensureIntakeQuestion(store,ctx,factory,()=>{}),{needed:false,provided:true});assert.equal(calls,1);
 }finally{await store.close();}
});

test('chat completion cannot claim success when the model says a card exists but none was saved',async()=>{
 const store=new Store();await store.init();try{
  const p=await store.create('owner');let calls=0;
  const factory:typeof createConsultationAgent=async()=>{
   calls++;const primary=calls===1;let subscriber:(event:any)=>void=()=>{};
   return {state:{messages:[]},abort(){},subscribe(fn:(event:any)=>void){subscriber=fn;return()=>{};},async prompt(){if(primary)subscriber({type:'message_update',assistantMessageEvent:{type:'text_delta',delta:'建议卡片已生成，请选择。'}});}} as unknown as Agent;
  };
  const chat=new ChatService(store,factory);await chat.start(p.id,'owner',{request_id:randomUUID(),expected_version:p.version,room_id:'living',text:'请先给我几个家具布局方向供选择'});await chat.active.get(p.id)?.promise;
  const saved=await store.get(p.id,'owner'),message=saved.messages.find(m=>m.role==='assistant')!;assert.equal(calls,2);assert.equal(message.status,'failed');assert.equal(message.failure_code,'structured_question_missing');assert.match(message.content,/更正：本轮结构化选择卡未通过生成校验/);assert.equal(saved.intake_questions?.length??0,0);assert.equal(saved.messages[0].content,'请先给我几个家具布局方向供选择');
 }finally{await store.close();}
});
