import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {switchChatStage,rememberThread,stageDelivery,markStageDelivery} from '../api/mcp/sessions.js';
import type {Project} from '../api/model.js';
import {randomUUID} from 'node:crypto';

test('stage threads, summaries and delivery IDs survive store restart and preserve legacy messages',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'alva066-session-'));let store=new AlvaStore(join(dir,'db'));
 try{
  await store.init();const {project}=await store.create('stage test');const id=project.id;
  const legacy=await store.mutate(id,randomUUID(),0,'fixture',{},p=>{p.messages.push({id:randomUUID(),role:'user',text:'历史对话',status:'completed',createdAt:new Date().toISOString()})});
  assert.equal((await store.chatState(id)).active,'floorplan');
  await rememberThread(store,id,'floorplan','floor-original');
  await assert.rejects(switchChatStage(store,id,'living',legacy.revision),/确认建筑/);
  const built=await store.mutate(id,randomUUID(),legacy.revision,'fixture-building',{},p=>{p.confirmedBuilding={} as NonNullable<Project['confirmedBuilding']>});
  const living=await switchChatStage(store,id,'living',built.revision);assert.equal(living.handoffs.length,1);assert.equal(living.handoffs[0].revision,built.revision);
  await rememberThread(store,id,'living','living-original');const batch=await stageDelivery(store,id,'living');assert.equal(batch.ids.length,1);assert.match(batch.text,/历史对话/);
  await markStageDelivery(store,id,'living',batch.ids);await markStageDelivery(store,id,'living',batch.ids);assert.equal((await stageDelivery(store,id,'living')).ids.length,0);
  await store.close();store=new AlvaStore(join(dir,'db'));await store.init();
  const restored=await store.chatState(id);assert.equal(restored.threads.floorplan.threadId,'floor-original');assert.equal(restored.threads.living.threadId,'living-original');assert.equal(restored.threads.living.deliveredIds.length,1);
  await switchChatStage(store,id,'floorplan',built.revision);assert.equal((await store.get(id)).revision,built.revision);assert.equal((await store.get(id)).messages[0].text,'历史对话');
  await assert.rejects(rememberThread(store,id,'floorplan','fake-new-thread'),/新会话替换/);
  const stale=await store.mutate(id,randomUUID(),built.revision,'fixture-reopen',{},p=>{p.confirmedBuilding=undefined;p.confirmedTopology=undefined});
  await assert.rejects(switchChatStage(store,id,'living',built.revision),/项目已更新/);
  await assert.rejects(switchChatStage(store,id,'living',stale.revision),/确认建筑/);
  const rebuilt=await store.mutate(id,randomUUID(),stale.revision,'fixture-rebuild',{},p=>{p.confirmedBuilding={} as NonNullable<Project['confirmedBuilding']>});
  await switchChatStage(store,id,'living',rebuilt.revision);const next=await stageDelivery(store,id,'living');assert.equal(next.ids.length,1);assert.notEqual(next.ids[0],batch.ids[0]);assert.match(next.text,/失效/);
  const other=(await store.create('other')).project;assert.equal((await store.chatState(other.id)).threads.living.threadId,undefined);
 }finally{await store.close();await rm(dir,{recursive:true,force:true})}
});
