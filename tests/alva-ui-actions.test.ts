import {test} from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import {UiActionBridge} from '../api/mcp/ui-actions.js';
import type {AlvaStore} from '../api/store.js';
import {emptyProject} from '../api/model.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import type {UiActionRequest} from '../packages/contracts/alva/ui-action.js';

test('UI action waits for exact authenticated page receipt and cancellation is explainable',async()=>{
 const app=Fastify(),p=emptyProject();seedLivingStage(p);let projectId=p.id;
 const bridge=new UiActionBridge(app,()=>({projectId,role:'owner',authGeneration:1})),store={get:async()=>p} as unknown as AlvaStore;
 const controller=new AbortController();let emitted:UiActionRequest|undefined;let done=false;
 const tool=bridge.tool(store,p.id,controller.signal,request=>{emitted=request});
 try{
  const result=tool.run({kind:'sunlight',time:10,day:172}).then(value=>{done=true;return value});
  await new Promise(resolve=>setImmediate(resolve));assert.ok(emitted);assert.equal(done,false);
  projectId='other';assert.notEqual((await app.inject({method:'POST',url:'/api/chat/ui-receipts',payload:{id:emitted.id,status:'applied',applied:emitted.action}})).statusCode,200);projectId=p.id;
  const mismatch=await app.inject({method:'POST',url:'/api/chat/ui-receipts',payload:{id:emitted.id,status:'applied',applied:{kind:'sunlight',time:11,day:172}}});assert.notEqual(mismatch.statusCode,200);assert.equal(done,false);
  const receipt=await app.inject({method:'POST',url:'/api/chat/ui-receipts',payload:{id:emitted.id,status:'applied',applied:emitted.action}});assert.equal(receipt.statusCode,200);assert.equal((await result as any).status,'applied');
  const cancelled=tool.run({kind:'view',mode:'3d'});await new Promise(resolve=>setImmediate(resolve));controller.abort();await assert.rejects(cancelled,/已取消/);
 }finally{await app.close()}
});
