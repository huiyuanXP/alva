import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import {readUserContextProjection} from '../api/user-context/index.js';

test('Chat produces sourced classification, owner confirms, MCP reads Markdown and saves the actual adopted review',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-029/066 synthetic joint');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},seedLivingStage),step=0;
 const headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};
 const app=await buildAlva(store,{assets:false,chatCodex:async input=>{
  const call=(name:string,args:unknown={})=>input.tools!.find(t=>t.name===name)!.run(args);
  const snapshot=await call('get_snapshot') as any;
  if(step===0){const evidence=snapshot.project.evidence.at(-1);await assert.rejects(call('propose_user_context',{expectedRevision:snapshot.project.revision,category:'preferences',text:'不使用木质墙面',quote:'不喜欢木质墙面',sourceEvidenceId:evidence.id,roomIds:['room'],objectIds:['room']}),(e:any)=>e.detail?.code==='CONTEXT_SCOPE_INVALID'&&e.detail.repairActions[0].message.includes('objectIds填[]'));assert.equal((await store.get(project.id)).userContextEntries,undefined);await call('propose_user_context',{expectedRevision:snapshot.project.revision,category:'preferences',text:'不使用木质墙面',quote:'不喜欢木质墙面',sourceEvidenceId:evidence.id,roomIds:['room'],objectIds:[]});return '已提出偏好分类，请确认'}
  const context=await call('read_user_context') as any;assert.match(context.markdown['preferences.md'],/不喜欢木质墙面/);assert.ok(context.entries.some((e:any)=>e.status==='confirmed'&&e.category==='preferences'));
  const result=await call('run_layout_review') as any;assert.equal(result.persisted,true);assert.ok(result.review.findings.some((f:any)=>f.ruleId==='room-wall-material-preference'));
  await call('request_save');return '复核已经完成，请查看取舍并确认保存';
 }});
 const post=(url:string,payload:Record<string,unknown>)=>app.inject({method:'POST',url,headers,payload});
 const chat=async(text:string)=>{p=await store.get(p.id);const r=await post('/api/chat',{requestId:randomUUID(),expectedRevision:p.revision,text,roomId:'room',model:'gemini-3.1-flash-lite'});assert.match(r.body,/event: done/,r.body);p=await store.get(p.id)};
 try{
  await chat('我不喜欢木质墙面，请记录为这个房间的偏好。');const entry=p.userContextEntries![0];assert.equal(entry.status,'pending');assert.equal((await readUserContextProjection(p)).entries.find(e=>e.id===entry.id)?.status,'pending');
  const confirmed=await post('/api/user-context/decide',{requestId:randomUUID(),expectedRevision:p.revision,id:entry.id,decision:'confirm',confirmed:true});assert.equal(confirmed.statusCode,200,confirmed.body);p=confirmed.json();
  p=await store.mutate(p.id,randomUUID(),p.revision,'synthetic-style',{},p=>{p.roomStyles={room:{tags:['自然'],wall:{color:'#abcdef',material:'wood'},floor:{color:'#cccccc',material:'tile'}}}});
  step=1;await chat('请复核当前布局和偏好，再请求保存。');const reviewedRevision=p.layoutReview!.projectRevision;
  const action=(await store.chatActions(p.id)).find(a=>a.kind==='save_design')!;
  const finding=p.layoutReview!.findings.find(f=>f.ruleId==='room-wall-material-preference')!;
  const decision=await post('/api/layout-review/decide',{requestId:randomUUID(),expectedRevision:p.revision,reviewId:p.layoutReview!.id,findingId:finding.id,decision:'accept_tradeoff',note:'此处明确保留木质视觉候选',confirmed:true});assert.equal(decision.statusCode,200,decision.body);p=decision.json();
  const saved=await post('/api/chat/actions/confirm',{id:action.id,expectedRevision:p.revision,confirmed:true});assert.equal(saved.statusCode,200,saved.body);
  const snapshot=await store.snapshot(p.id,saved.json().savedVersion);assert.equal(snapshot.layoutReviewAdoption!.reviewedRevision,reviewedRevision);assert.equal(snapshot.layoutReviewAdoption!.adoptedAtRevision,p.revision);assert.equal(snapshot.layoutReviewAdoption!.decisions[0].note,'此处明确保留木质视觉候选');
  const after=await store.mutate(p.id,randomUUID(),saved.json().revision,'change-style',{},p=>{p.roomStyles!.room.wall.material='stone'});
  const stale=await post('/api/save',{requestId:randomUUID(),expectedRevision:after.revision,confirmed:true});assert.equal(stale.statusCode,409);assert.equal(stale.json().code,'REVIEW_STALE');
 }finally{await app.close();await store.close()}
});
