import {seedLivingStage} from './fixtures/alva/living-stage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {listReferenceBatches,parseReferenceAnalysis} from '../api/references.js';
import type {CodexInput} from '../api/codex.js';
import type {SceneData} from '../api/model.js';

const code='alva041-test-code-123456';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const scene:SceneData={walls:[{id:'w1',a:{x:0,y:0},b:{x:4,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'w2',a:{x:4,y:0},b:{x:4,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'w3',a:{x:4,y:3},b:{x:0,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'w4',a:{x:0,y:3},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'test'}};
function cookie(login:any){return {cookie:'alva_session='+login.cookies[0].value,origin:'http://localhost'}}

test('ALVA-041 model/manual candidates stay pending until explicit confirmation; cancel does not pollute requirements',async()=>{
 const prior=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;
 const store=new AlvaStore();await store.init();const created=await store.create('ALVA-041');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene);seedLivingStage(p)});
 let calls=0;const model=async(input:CodexInput)=>{calls++;assert.ok(input.images?.[0]?.startsWith('data:image/png;base64,'));assert.match(input.text||'',/不能.*尺寸|禁止输出具体尺寸/);return JSON.stringify({annotations:[{preference:'like',feature:'浅色、留白和轻盈家具造型'},{preference:'dislike',feature:'过于复杂的吊灯造型'}]})};
 const app=await buildAlva(store,{assets:false,origin:'http://localhost',chatCodex:model});
 try{
  const login=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code}}),headers=cookie(login),before=await store.get(created.project.id),beforeEvidence=before.evidence.length,beforeFindings=before.findings.length;
  const analyze=await app.inject({method:'POST',url:'/api/references/analyze',headers,payload:{requestId:randomUUID(),expectedRevision:before.revision,roomId:'living',filename:'living.png',sourceText:'我喜欢这张图的轻盈感，但不喜欢太复杂的吊灯。',image:{mime:'image/png',data:png}}});assert.equal(analyze.statusCode,200,analyze.body);const batch=analyze.json();assert.equal(batch.status,'pending');assert.equal(batch.annotations.length,2);assert.ok(batch.annotations.every((a:any)=>a.origin==='model'));
  const afterAnalyze=await store.get(created.project.id);assert.equal(afterAnalyze.revision,before.revision);assert.equal(afterAnalyze.evidence.length,beforeEvidence);assert.equal(afterAnalyze.findings.length,beforeFindings);
  const manual=await app.inject({method:'POST',url:`/api/references/${batch.id}/manual`,headers,payload:{requestId:randomUUID(),expectedRevision:before.revision,preference:'like',feature:'低矮、横向展开的沙发造型'}});assert.equal(manual.statusCode,200,manual.body);const manualAnnotation=manual.json().annotations.find((a:any)=>a.origin==='manual');assert.ok(manualAnnotation);
  const chosen=[batch.annotations[0].id,manualAnnotation.id];const confirm=await app.inject({method:'POST',url:'/api/references/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:before.revision,batchId:batch.id,annotationIds:chosen,confirmed:true}});assert.equal(confirm.statusCode,200,confirm.body);const confirmed=confirm.json();assert.equal(confirmed.evidence.length,beforeEvidence+2);assert.equal(confirmed.findings.length,beforeFindings+2);assert.ok(confirmed.evidence.slice(-2).every((e:any)=>e.source==='image'&&e.roomId==='living'&&e.quote.includes('living.png')));assert.ok(confirmed.findings.slice(-2).every((f:any)=>f.reason.includes('用户')&&f.suggestion.includes('不得作为尺寸、结构或材料真实性/性能的证据')));
  const listed=await listReferenceBatches(store,created.project.id),confirmedBatch=listed.find(x=>x.id===batch.id)!;assert.equal(confirmedBatch.status,'confirmed');assert.equal(confirmedBatch.annotations.filter(a=>a.status==='confirmed').length,2);assert.equal(confirmedBatch.annotations.filter(a=>a.status==='cancelled').length,1);assert.equal(confirmedBatch.sourceText,'我喜欢这张图的轻盈感，但不喜欢太复杂的吊灯。');assert.equal(confirmedBatch.roomId,'living');
  const current=await store.get(created.project.id),second=await app.inject({method:'POST',url:'/api/references/analyze',headers,payload:{requestId:randomUUID(),expectedRevision:current.revision,roomId:null,filename:'whole.png',sourceText:'先看看这张，暂时不要记需求。',image:{mime:'image/png',data:png}}});assert.equal(second.statusCode,200);const secondId=second.json().id,evidenceBeforeCancel=current.evidence.length,findingsBeforeCancel=current.findings.length,revisionBeforeCancel=current.revision;const cancelled=await app.inject({method:'POST',url:`/api/references/${secondId}/cancel`,headers,payload:{requestId:randomUUID(),expectedRevision:revisionBeforeCancel}});assert.equal(cancelled.statusCode,200);const afterCancel=await store.get(created.project.id);assert.equal(afterCancel.revision,revisionBeforeCancel);assert.equal(afterCancel.evidence.length,evidenceBeforeCancel);assert.equal(afterCancel.findings.length,findingsBeforeCancel);assert.equal((await listReferenceBatches(store,created.project.id)).find(x=>x.id===secondId)?.status,'cancelled');assert.equal(calls,2);
 }finally{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=prior}
});

test('ALVA-041 rejects reference candidates that pretend to prove dimensions, structure or performance',()=>{
 assert.throws(()=>parseReferenceAnalysis(JSON.stringify({annotations:[{preference:'like',feature:'这面承重墙很安全'}]})),/不能记录尺寸、结构或材料性能/);
 assert.throws(()=>parseReferenceAnalysis(JSON.stringify({annotations:[{preference:'like',feature:'沙发宽度 2.4 米'}]})),/不能记录尺寸、结构或材料性能/);
 assert.doesNotThrow(()=>parseReferenceAnalysis(JSON.stringify({annotations:[{preference:'like',feature:'木质感和温暖的视觉氛围'}]})));
});

test('ALVA-041 main Chat actually invokes the pending reference-preference tool for an attached reference image',async()=>{
 const prior=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const store=new AlvaStore();await store.init();const created=await store.create('ALVA-041-chat');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene);seedLivingStage(p)});let captured:CodexInput|undefined,toolResult:any;
 const chatCodex=async(input:CodexInput)=>{captured=input;const tool=input.tools?.find(t=>t.name==='propose_reference_preferences');assert.ok(tool);toolResult=await tool!.run({annotations:[{preference:'like',feature:'低饱和浅色与简洁家具线条'}]});input.onDelta?.('我先把这张图里的视觉偏好作为待确认候选。');return '我先把这张图里的视觉偏好作为待确认候选，请你确认后再进入正式需求。'};
 const app=await buildAlva(store,{assets:false,origin:'http://localhost',chatCodex});
 try{const login=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code}}),headers=cookie(login),before=await store.get(created.project.id),response=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:before.revision,text:'我喜欢这张图的浅色和简洁感，作为客厅参考。',roomId:'living',model:'gemini-3.8-flash-high',image:{mime:'image/png',data:png}}});assert.equal(response.statusCode,200,response.body);assert.ok(captured);assert.match(captured!.text||'',/propose_reference_preferences/);assert.equal(toolResult.status,'pending_owner_confirmation');const batches=await listReferenceBatches(store,created.project.id);assert.equal(batches.length,1);assert.equal(batches[0].status,'pending');assert.equal(batches[0].roomId,'living');assert.equal(batches[0].sourceText,'我喜欢这张图的浅色和简洁感，作为客厅参考。');assert.equal(batches[0].annotations[0].origin,'model');const after=await store.get(created.project.id);assert.equal(after.findings.some(f=>f.objectIds.includes(`reference:${batches[0].id}`)),false)}finally{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=prior}
});
