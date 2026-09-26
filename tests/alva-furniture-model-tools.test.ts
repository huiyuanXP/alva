import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {furnitureModelTools} from '../api/furniture/model-tools.js';
import {catalogueFurniture} from '../web/src/scene/furniture/catalogue.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import {applyChanges} from '../api/business.js';
import type {Proposal} from '../api/model.js';
import {snapshotProject,prepareSnapshotRestore} from '../api/snapshots/state.js';
const critique={verdict:'pass',detailAdequate:true,matchesRequest:true,observations:['前视图有真实独立抽屉和圆角桌面','后视图有完整支撑及封闭抽屉背板','侧视图可見桌腿和五金连接细节'],issues:[],repairs:[]};
const rendered={images:Array(3).fill('data:image/png;base64,YQ=='),views:['front-right','back-left','front-detail'],stats:{meshes:12,triangles:30000},bounds:{min:[-.5,0,-.5],max:[.5,1,.5]}};
test('model tool rejects stale/locked targets; concurrent revision prevents proposal; success is preview-only and snapshot-safe',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'alva071-tool-')),previous=process.env.ALVA_FURNITURE_AUDIT_DIR;process.env.ALVA_FURNITURE_AUDIT_DIR=dir;const store=new AlvaStore();await store.init();
 try{
  const created=await store.create('ALVA071 test');let p=await store.mutate(created.project.id,randomUUID(),0,'seed',{},s=>seedLivingStage(s));const proposals:Proposal[]=[];let calls=0,changeDuringCritic=false;
  const tool=furnitureModelTools({store,projectId:p.id,originalPrompt:'有细节的浅木色书桌',evidenceId:'synthetic-evidence',proposals,signal:new AbortController().signal,render:async()=>rendered,call:async input=>{calls++;if(input.images?.length){if(changeDuringCritic)await store.mutate(p.id,randomUUID(),null,'concurrent',{},s=>{s.name='changed'});return JSON.stringify(critique)}return JSON.stringify(catalogueFurniture('alva-table','#b49a75','wood'))}})[0];
  await assert.rejects(tool.run({expectedRevision:0,target:{kind:'existing',itemId:'table'}}),/更新/);assert.equal(calls,0);
  p=await store.mutate(p.id,randomUUID(),p.revision,'lock',{},s=>{s.scene!.items[0].locked=true});await assert.rejects(tool.run({expectedRevision:p.revision,target:{kind:'existing',itemId:'table'}}),/锁定/);assert.equal(calls,0);
  p=await store.mutate(p.id,randomUUID(),p.revision,'unlock',{},s=>{s.scene!.items[0].locked=false});changeDuringCritic=true;await assert.rejects(tool.run({expectedRevision:p.revision,target:{kind:'existing',itemId:'table'}}),/变化/);assert.equal(proposals.length,0);assert.equal((await store.get(p.id)).scene!.items[0].visualModel,undefined);
  changeDuringCritic=false;p=await store.get(p.id);await tool.run({expectedRevision:p.revision,target:{kind:'existing',itemId:'table'}});assert.equal(proposals.length,1);assert.equal((await store.get(p.id)).scene!.items[0].visualModel,undefined);
  const scene=applyChanges(p.scene!,proposals[0].changes);assert.ok(scene.items[0].visualModel);const snapshot=snapshotProject({...p,scene});const restored=prepareSnapshotRestore(snapshot,p.revision,0);assert.deepEqual(restored.scene!.items[0].visualModel,scene.items[0].visualModel);
  const updated=applyChanges(scene,[{action:'update',targetId:'table',values:{assetId:'alva-table',x:2.1,y:2}}]);assert.equal(updated.items[0].visualModel?.modelHash,scene.items[0].visualModel?.modelHash,'ordinary UI property update must preserve generated geometry');
  proposals.length=0;await tool.run({expectedRevision:p.revision,target:{kind:'new',assetId:'alva-chair',roomId:'room',x:4,y:2,rotation:0},dimensions:{width:.7,depth:.7,height:.95}});assert.equal(proposals[0].changes.length,1,'dimensions and reviewed model must be one atomic selectable addition');const added=applyChanges(p.scene!,proposals[0].changes).items.at(-1)!;assert.equal(added.width,.7);assert.equal(added.height,.95);assert.deepEqual(added.visualModel?.dimensions,{width:.7,depth:.7,height:.95});assert.equal((await store.get(p.id)).scene!.items.length,1,'new model proposal must not adopt automatically');
 }finally{await store.close();if(previous===undefined)delete process.env.ALVA_FURNITURE_AUDIT_DIR;else process.env.ALVA_FURNITURE_AUDIT_DIR=previous;await rm(dir,{recursive:true,force:true})}
});

test('main Chat suppresses a fabricated success response after furniture rendering fails',async()=>{
 const {buildAlva}=await import('../api/api.js');const dir=await mkdtemp(join(tmpdir(),'alva071-chat-')),prior=process.env.ALVA_FURNITURE_AUDIT_DIR,priorCode=process.env.ALVA_ACCESS_CODE;process.env.ALVA_FURNITURE_AUDIT_DIR=dir;process.env.ALVA_ACCESS_CODE='alva071-synthetic-code-123456';const store=new AlvaStore();await store.init();
 const created=await store.create('ALVA071 failure guard');await store.ensureAccessCode(created.project.id);const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>seedLivingStage(p));
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,furnitureCodex:async()=>JSON.stringify(catalogueFurniture('alva-table','#b49a75','wood')),furnitureRender:async()=>{throw new Error('synthetic render failure')},chatCodex:async input=>{const call=input.tools!.find(t=>t.name==='mcp_call_tool')!;const snapshot=await call.run({name:'get_snapshot',arguments:{}}) as any;try{await call.run({name:'generate_furniture_model',arguments:{expectedRevision:snapshot.project.revision,target:{kind:'existing',itemId:'table'}}})}catch{/* Deliberately adversarial model reply; the harness must prevent it. */}return '成功生成了精细高模并通过自检';}});
 try{const session=await store.issueInternalSession(created.project.id);const response=await app.inject({method:'POST',url:'/api/chat',headers:{cookie:'alva_session='+session.token},payload:{requestId:randomUUID(),expectedRevision:seeded.revision,text:'给桌子增加细节',roomId:'room',model:'gemini-3.8-flash-high'}});assert.equal(response.statusCode,200);assert.ok(response.body.includes('FURNITURE_RENDER_FAILED'));assert.ok(!response.body.includes('成功生成了精细高模'));const p=await store.get(created.project.id);assert.equal(p.messages.at(-1)?.status,'failed');assert.equal(p.proposals.length,0);assert.deepEqual(p.scene,seeded.scene)}finally{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_FURNITURE_AUDIT_DIR;else process.env.ALVA_FURNITURE_AUDIT_DIR=prior;if(priorCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=priorCode;await rm(dir,{recursive:true,force:true})}
});
