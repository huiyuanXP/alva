import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {requestChatAction} from '../api/mcp/actions.js';
import {seedSnapshotProject} from './fixtures/alva/snapshot.js';
import type {CodexInput} from '../api/codex.js';
const resume=async(input:CodexInput)=>{await input.session?.onThread(input.session.threadId||'synthetic-'+input.session.key);await input.session?.onHandoffsDelivered?.((input.session.handoffs||[]).map(h=>h.id));return 'ok'};

test('building card survives unrelated answers, refreshes changed candidate without adopting, then explicitly confirms',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-066 stage recovery');await store.ensureAccessCode(project.id);
 const headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};const app=await buildAlva(store,{assets:false,chatCodex:resume});
 const post=(url:string,payload:Record<string,unknown>)=>app.inject({method:'POST',url,headers,payload});
 try{
  let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedSnapshotProject(p);p.confirmedBuilding=undefined});
  const original=await requestChatAction(store,p,'confirm_building');assert.equal(original.action.version,p.confirmationVersions!.building);assert.equal(original.action.basis,undefined);
  p=await store.mutate(project.id,randomUUID(),p.revision,'answer',{},p=>{p.answers[0].text='与建筑几何无关的回答'});
  let list=(await app.inject({url:'/api/chat/actions',headers})).json();assert.equal(list.find((a:any)=>a.id===original.action.id).stale,false);
  p=await store.mutate(project.id,randomUUID(),p.revision,'regenerate',{},p=>{p.buildingCandidate!.components[0].color='#eeeeee'});
  list=(await app.inject({url:'/api/chat/actions',headers})).json();assert.equal(list.find((a:any)=>a.id===original.action.id).stale,true);assert.match(list[0].staleReason,/建筑候选/);
  assert.equal((await post('/api/chat/actions/confirm',{id:original.action.id,expectedRevision:p.revision,confirmed:true})).statusCode,409);
  assert.equal((await post('/api/chat/actions/refresh',{id:original.action.id,expectedRevision:p.revision-1})).statusCode,409);
  assert.equal((await post('/api/chat/actions/refresh',{id:randomUUID(),expectedRevision:p.revision})).statusCode,409);
  const refreshed=await post('/api/chat/actions/refresh',{id:original.action.id,expectedRevision:p.revision});assert.equal(refreshed.statusCode,200,refreshed.body);const next=refreshed.json().action;assert.notEqual(next.id,original.action.id);
  assert.equal((await store.get(project.id)).confirmedBuilding,undefined);assert.equal((await store.chatState(project.id)).active,'floorplan');assert.equal((await store.get(project.id)).revision,p.revision);
  assert.equal((await post('/api/chat/actions/confirm',{id:original.action.id,expectedRevision:p.revision,confirmed:true})).statusCode,409);
  const confirmed=await post('/api/chat/actions/confirm',{id:next.id,expectedRevision:p.revision,confirmed:true});assert.equal(confirmed.statusCode,200,confirmed.body);assert.ok(confirmed.json().confirmedBuilding);assert.equal((await store.chatState(project.id)).active,'living');
  const replay=await post('/api/chat/actions/confirm',{id:next.id,expectedRevision:p.revision,confirmed:true});assert.equal(replay.statusCode,200,replay.body);
 }finally{await app.close();await store.close()}
});

test('Chat reads complete UI diagnostics in both packs even when confirmed topology has no candidate',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-066 diagnostic recovery');await store.ensureAccessCode(project.id);
 const headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};let captured:any;
 const model=async(input:CodexInput)=>{await resume(input);if(input.injectOnly||input.resumeOnly)return 'ok';const stage=input.session!.key.split(':').at(-1);captured=await input.tools!.find(t=>t.name===(stage==='floorplan'?'inspect_topology':'get_topology_diagnostics'))!.run({});return '已读取告警详情'};
 const app=await buildAlva(store,{assets:false,chatCodex:model});
 try{
  let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedSnapshotProject(p);p.scene!.walls.pop();p.candidate=null});
  for(const stage of ['floorplan','living']){
   if(stage==='living'){const switched=await app.inject({method:'POST',url:'/api/chat/stages/switch',headers,payload:{stage,expectedRevision:p.revision}});assert.equal(switched.statusCode,200,switched.body)}
   const ui=(await app.inject({url:'/api/topology/diagnostics',headers})).json();assert.ok(ui.analysis.issues.some((i:any)=>i.code==='open_boundary'));
   const response=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,text:'请解释户型中报错的具体内容和修复方法',roomId:null,model:'gemini-3.1-flash-lite'}});assert.equal(response.statusCode,200,response.body);assert.match(response.body,/event: done/);
   assert.equal(captured.source,'scene');assert.equal(captured.sceneFingerprint,ui.sceneFingerprint);assert.deepEqual(captured.analysis,ui.analysis);assert.equal(captured.issue,null,'automatic repair list is distinct from warning list');assert.equal(captured.repair.requiresReopenConfirmation,true);assert.ok(captured.repair.guidance.length>0);assert.ok(captured.analysis.issues.every((i:any)=>i.message&&i.wallIds.length&&i.location));
   p=await store.get(project.id);assert.equal(p.candidate,null);assert.equal(p.scene!.walls.length,3);
  }
 }finally{await app.close();await store.close()}
});
