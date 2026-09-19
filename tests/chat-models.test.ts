import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import type {Agent} from '@earendil-works/pi-agent-core';
import {isChatModelId,type createConsultationAgent} from '../apps/api/provider.js';
import {Store} from '../apps/api/store.js';
import {buildApp} from '../apps/api/app.js';
import {ChatService} from '../apps/api/chat.js';

test('model IDs exclude non-chat modalities and injection-shaped identifiers',()=>{
  for(const id of ['unit-chat-a','provider/gpt-4.1-mini','claude-3-7-sonnet:latest'])assert.equal(isChatModelId(id),true);
  for(const id of ['',null,'../../secrets?key=x','gpt-image-1','whisper-1','tts-1','embedding-text','model\nAuthorization: secret','x'.repeat(201)])assert.equal(isChatModelId(id),false);
});

test('model catalogue requires session; malformed model cannot create a run or mutate a project',async()=>{
  const store=new Store();await store.init();const app=await buildApp(store,{assets:false,accessCode:'isolated-model-test',origin:'http://localhost'});
  try{
    const denied=await app.inject({method:'GET',url:'/api/chat/models'});assert.equal(denied.statusCode,401);
    const login=await app.inject({method:'POST',url:'/api/session/login',payload:{code:'isolated-model-test'}});
    const cookie=String(login.headers['set-cookie']).split(';')[0];
    const p=await store.create('owner');
    const rejected=await app.inject({method:'POST',url:`/api/projects/${p.id}/chat`,headers:{cookie},payload:{request_id:randomUUID(),expected_version:p.version,room_id:'living',text:'不能因此生成消息',model_id:'../../private?token=bad'}});
    assert.equal(rejected.statusCode,400);const after=await store.get(p.id,'owner');assert.equal(after.version,p.version);assert.deepEqual(after.messages,[]);
  }finally{await app.close();await store.close();}
});

test('selected model binds primary and formatting turns, persisted messages, and idempotency identity',async()=>{
  const store=new Store();await store.init();
  try{
    const p=await store.create('owner');const seen:(string|undefined)[]=[];
    const factory:typeof createConsultationAgent=async(_prompt,_tools,limits)=>{
      seen.push(limits?.modelId);let listener:(event:any)=>void=()=>{};
      return {state:{messages:[]},abort(){},subscribe(fn:(event:any)=>void){listener=fn;return()=>{};},async prompt(){listener({type:'message_update',assistantMessageEvent:{type:'text_delta',delta:'先比较家具布局方向。'}});}} as unknown as Agent;
    };
    const chat=new ChatService(store,factory),request={request_id:randomUUID(),expected_version:p.version,room_id:'living',text:'比较几个家具布局方向',model_id:'unit-chat-alternative'};
    await chat.start(p.id,'owner',request);await chat.active.get(p.id)?.promise;
    assert.deepEqual(seen,['unit-chat-alternative','unit-chat-alternative']);
    const saved=await store.get(p.id,'owner');assert.equal(saved.messages.length,2);assert.ok(saved.messages.every(m=>m.model_id==='unit-chat-alternative'));
    // The deliberate stub does not create a valid card; it must remain a failure.
    assert.equal(saved.messages[1].status,'failed');assert.equal(saved.messages[1].failure_code,'structured_question_missing');
    const replay=await chat.start(p.id,'owner',request);assert.equal(replay.replayed,true);
    await assert.rejects(()=>chat.start(p.id,'owner',{...request,model_id:'unit-chat-other'}));
    assert.equal((await store.get(p.id,'owner')).messages.length,2);
  }finally{await store.close();}
});
