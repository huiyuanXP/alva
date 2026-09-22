import test from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {AlvaStore,type Session} from '../api/store.js';
import {registerConsultation,chatFailureReason} from '../api/chat.js';

test('ALVA-018 dedicated chat cancellation aborts only the active chat controller',async()=>{
 const store=new AlvaStore();await store.init();const created=await store.create('ALVA-018');const app=Fastify();const session=():Session=>({projectId:created.project.id,role:'owner',authGeneration:1});const active=new Map<string,AbortController>(),controller=new AbortController();active.set(created.project.id,controller);registerConsultation(app,store,session,active);
 try{const response=await app.inject({method:'POST',url:'/api/chat/cancel',payload:{}});assert.equal(response.statusCode,200);assert.deepEqual(response.json(),{cancelled:true});assert.equal(controller.signal.aborted,true);const second=await app.inject({method:'POST',url:'/api/chat/cancel',payload:{}});assert.equal(second.statusCode,200);assert.deepEqual(second.json(),{cancelled:true})}finally{await app.close();await store.close()}
});

test('ALVA-018 failure reasons distinguish cancel, timeout and unavailable provider',()=>{
 assert.equal(chatFailureReason(new Error('anything'),true),'已取消');
 assert.equal(chatFailureReason(new Error('request timed out')),'模型响应超时');
 assert.equal(chatFailureReason(new Error('deadline exceeded')),'模型响应超时');
 assert.equal(chatFailureReason(new Error('provider unavailable')),'模型当前不可用或处理失败');
});
