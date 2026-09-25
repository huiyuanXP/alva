import {ensureCurrentReview} from '../api/review/service.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {CodexInput} from '../api/codex.js';
import {seedSnapshotProject} from './fixtures/alva/snapshot.js';
import {requestChatAction} from '../api/mcp/actions.js';

test('actual Chat routes bridge only active MCP pack, retain threads, resume on switch, and require owner confirmation',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-066 synthetic stage acceptance');await store.ensureAccessCode(project.id);
 const token=(await store.issueInternalSession(project.id)).token,headers={cookie:`alva_session=${token}`};
 const runs:{stage:string;names:string[];resume:boolean}[]=[];let requestReopen=false;
 const model=async(input:CodexInput)=>{
  assert.ok(input.session);const stage=input.session.key.split(':').at(-1)!;
  runs.push({stage,names:input.tools?.map(t=>t.name)||[],resume:!!input.resumeOnly});
  await input.session.onThread(input.session.threadId||`original-${stage}`);
  if(input.resumeOnly)return input.session.threadId!;
  if(input.injectOnly){await input.session.onHandoffsDelivered?.((input.session.handoffs||[]).map(h=>h.id));return input.session.threadId||`original-${stage}`}
  const snapshot=await input.tools!.find(t=>t.name==='get_snapshot')!.run({}) as any;
  const p=stage==='floorplan'?snapshot.snapshot.project:snapshot.project;
  assert.equal(p.id,project.id);assert.ok(p.revision>0);
  if(stage==='floorplan'){
   assert.ok(!input.tools!.some(t=>t.name==='propose_changes'));
   assert.match(input.text,/户型导入顾问/);
   await assert.rejects(input.tools!.find(t=>t.name==='calibrate_floorplan')!.run({expectedRevision:p.revision-1,wallId:'wall-0',length:5,source:'synthetic'}),/项目已更新/);
   if(requestReopen)await input.tools!.find(t=>t.name==='request_topology_reopen')!.run({expectedRevision:p.revision});
  }else{
   assert.ok(!input.tools!.some(t=>t.name==='recognize_floorplan'));
   await input.tools!.find(t=>t.name==='run_layout_review')!.run({});
   await input.tools!.find(t=>t.name==='request_save')!.run({});
  }
  await input.session.onHandoffsDelivered?.((input.session.handoffs||[]).map(h=>h.id));
  input.onDelta?.('已读取真实工具结果');return '已读取真实工具结果';
 };
 const app=await buildAlva(store,{assets:false,chatCodex:model});
 const post=async(url:string,payload:Record<string,unknown>)=>app.inject({method:'POST',url,headers,payload});
 const chat=async()=>{const p=await store.get(project.id);const response=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,text:'读取当前状态',roomId:null,model:'gemini-3.1-flash-lite'});assert.equal(response.statusCode,200,response.body);assert.match(response.body,/event: done/);assert.match(response.body,/event: tool/);return store.get(project.id)};
 try{
  const first=await chat();assert.equal(first.messages.length,2);assert.equal(first.messages[0].stage,'floorplan');
  const seeded=await store.mutate(project.id,randomUUID(),first.revision,'synthetic-building',{},p=>{const history=p.messages;seedSnapshotProject(p);p.messages=history});
  const switchLiving=await post('/api/chat/stages/switch',{stage:'living',expectedRevision:seeded.revision});assert.equal(switchLiving.statusCode,200,switchLiving.body);assert.equal(switchLiving.json().threads.living.deliveredIds.length,1,'Handoff delivered on entry, before the next chat');
  const living=await chat();assert.equal(living.savedVersion,0);assert.equal(living.messages.at(-1)?.stage,'living');
  const save=(await store.chatActions(project.id)).find(a=>a.kind==='save_design')!;assert.equal(save.status,'pending');
  const confirmed=await post('/api/chat/actions/confirm',{id:save.id,confirmed:true,expectedRevision:living.revision});assert.equal(confirmed.statusCode,200,confirmed.body);assert.equal(confirmed.json().savedVersion,1);
  const replay=await post('/api/chat/actions/confirm',{id:save.id,confirmed:true,expectedRevision:living.revision});assert.equal(replay.statusCode,200,replay.body);assert.equal(replay.json().savedVersion,1);
  const cancelledAfter=await post('/api/chat/actions/reject',{id:save.id});assert.equal(cancelledAfter.statusCode,409);
  const beforeSwitch=await store.get(project.id);const switched=await post('/api/chat/stages/switch',{stage:'floorplan',expectedRevision:beforeSwitch.revision});assert.equal(switched.statusCode,200,switched.body);assert.ok(runs.some(r=>r.stage==='floorplan'&&r.resume));assert.deepEqual(runs.at(-1)?.names,['mcp_list_tools','mcp_call_tool']);
  assert.deepEqual((await store.get(project.id)).scene,beforeSwitch.scene);
  requestReopen=true;const floor=await chat();const reopen=(await store.chatActions(project.id)).find(a=>a.kind==='reopen_topology')!;assert.ok(floor.confirmedBuilding);assert.equal(reopen.status,'pending');
  const reopened=await post('/api/chat/actions/confirm',{id:reopen.id,expectedRevision:floor.revision,confirmed:true});assert.equal(reopened.statusCode,200,reopened.body);assert.equal(reopened.json().scene,null);assert.equal(reopened.json().confirmedBuilding,undefined);assert.equal(reopened.json().messages.length,6);
  const state=await store.chatState(project.id);assert.equal(state.threads.floorplan.threadId,'original-floorplan');assert.equal(state.threads.living.threadId,'original-living');assert.equal(state.threads.living.deliveredIds.length,1);assert.equal(state.threads.floorplan.deliveredIds.length,1);
  const blocked=await post('/api/chat/stages/switch',{stage:'living',expectedRevision:reopened.json().revision});assert.equal(blocked.statusCode,422);
 }finally{await app.close();await store.close()}
});

test('confirmation rejects stale basis, wrong stage, cross-project ID and concurrent reject/confirm',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-066 action isolation');await store.ensureAccessCode(project.id);
 let seeded=await store.mutate(project.id,randomUUID(),0,'seed',{},seedSnapshotProject);seeded=await ensureCurrentReview(store,project.id,seeded.revision);
 const headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};const app=await buildAlva(store,{assets:false});
 const confirm=(id:string,revision:number)=>app.inject({method:'POST',url:'/api/chat/actions/confirm',headers,payload:{id,expectedRevision:revision,confirmed:true}});
 try{
  const other=(await store.create('other')).project;const otherAction=await requestChatAction(store,other,'save_design');assert.equal((await confirm(otherAction.action.id,seeded.revision)).statusCode,404);
  const reopen=await requestChatAction(store,seeded,'reopen_topology');assert.equal((await confirm(reopen.action.id,seeded.revision)).statusCode,409);
  const save=await requestChatAction(store,seeded,'save_design');let changed=await store.mutate(project.id,randomUUID(),seeded.revision,'change-answer',{},p=>{p.answers[0].text='changed'});
  assert.equal((await confirm(save.action.id,changed.revision)).statusCode,409);
  changed=await ensureCurrentReview(store,project.id,changed.revision);const current=await requestChatAction(store,changed,'save_design');
  const results=await Promise.all([confirm(current.action.id,changed.revision),app.inject({method:'POST',url:'/api/chat/actions/reject',headers,payload:{id:current.action.id}})]);
  assert.deepEqual(results.map(r=>r.statusCode).sort(),[200,409]);const action=(await store.chatActions(project.id)).find(a=>a.id===current.action.id)!;
  assert.equal((await store.get(project.id)).savedVersion,action.status==='confirmed'?1:0);
 }finally{await app.close();await store.close()}
});
