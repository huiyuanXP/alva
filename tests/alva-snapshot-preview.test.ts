import {ensureCurrentReview} from '../api/review/service.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedSnapshotProject} from './fixtures/alva/snapshot.js';

const code='alva037-test-code-123456';
const headers=(login:any)=>({cookie:`alva_session=${login.cookies[0].value}`,origin:'http://localhost'});

test('ALVA-037 preview backend lists only manual saves and reads immutable full snapshots without touching the draft',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-037');await store.ensureAccessCode(project.id);const app=await buildAlva(store,{assets:false,origin:'http://localhost'});
 try{
  const login=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code}}),h=headers(login);assert.deepEqual((await app.inject({url:'/api/versions',headers:h})).json(),[]);
  let p=await store.mutate(project.id,randomUUID(),0,'seed-rich',{},seedSnapshotProject);assert.equal((await store.versions(project.id)).length,0);
  p=await store.mutate(project.id,randomUUID(),p.revision,'ordinary-edit',{},x=>{x.name='工作稿保存前';x.scene!.rooms[0].purpose='保存时的阅读空间'});assert.equal((await store.versions(project.id)).length,0);
  p=await ensureCurrentReview(store,p.id,p.revision);
  const save=await app.inject({method:'POST',url:'/api/save',headers:h,payload:{requestId:randomUUID(),expectedRevision:p.revision,confirmed:true}});assert.equal(save.statusCode,200,save.body);p=save.json();const list=(await app.inject({url:'/api/versions',headers:h})).json();assert.equal(list.length,1);assert.equal(list[0].version,1);assert.ok(Number.isFinite(Date.parse(list[0].created_at)));
  const snapshot=(await app.inject({url:'/api/versions/1',headers:h})).json();assert.equal(snapshot.name,'工作稿保存前');assert.equal(snapshot.scene.rooms[0].purpose,'保存时的阅读空间');assert.equal(snapshot.answers.length,2);assert.equal(snapshot.evidence.length,2);assert.ok(snapshot.confirmedBuilding);
  const current=await store.mutate(project.id,randomUUID(),p.revision,'unsaved-after-save',{},x=>{x.name='当前未保存工作稿';x.answers=[];x.scene!.rooms[0].purpose='当前工作稿的新用途';x.dirty=true});const currentJson=JSON.stringify(current),versionsJson=JSON.stringify(await store.versions(project.id));
  const reread=(await app.inject({url:'/api/versions/1',headers:h})).json();assert.deepEqual(reread,snapshot);assert.equal(JSON.stringify(await store.get(project.id)),currentJson);assert.equal(JSON.stringify(await store.versions(project.id)),versionsJson);
  const missing=await app.inject({url:'/api/versions/999',headers:h});assert.equal(missing.statusCode,404);assert.equal(JSON.stringify(await store.get(project.id)),currentJson);assert.equal(JSON.stringify(await store.versions(project.id)),versionsJson);
 }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});

test('ALVA-037 preview GET is read-only for designer and cannot restore without explicit owner mutation',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-037 designer');await store.ensureAccessCode(project.id);let p=await store.mutate(project.id,randomUUID(),0,'seed',{},seedSnapshotProject);const app=await buildAlva(store,{assets:false,origin:'http://localhost'});
 try{p=await ensureCurrentReview(store,p.id,p.revision);const owner=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code}}),oh=headers(owner);const saved=await app.inject({method:'POST',url:'/api/save',headers:oh,payload:{requestId:randomUUID(),expectedRevision:p.revision,confirmed:true}});assert.equal(saved.statusCode,200,saved.body);p=saved.json();const invite=await store.invite(project.id,'designer'),designer=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code,inviteToken:invite.token}}),dh=headers(designer);assert.equal((await app.inject({url:'/api/versions',headers:dh})).statusCode,200);assert.equal((await app.inject({url:'/api/versions/1',headers:dh})).statusCode,200);const restore=await app.inject({method:'POST',url:'/api/restore',headers:dh,payload:{requestId:randomUUID(),expectedRevision:p.revision,version:1,confirmed:true}});assert.equal(restore.statusCode,403);assert.equal((await store.get(project.id)).revision,p.revision)}finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
