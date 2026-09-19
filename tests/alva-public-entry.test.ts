import test from 'node:test';
import assert from 'node:assert/strict';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

test('public entry supports independent devices, repeated visits and expired sessions without overriding designer access',async()=>{
 const store=new AlvaStore();await store.init();const project=await store.create('Shared');
 const app=await buildAlva(store,{assets:false,publicAccessToken:project.token});
 try{
  const enter=()=>app.inject({method:'POST',url:'/api/public-access',payload:{}});
  const a=await enter(),b=await enter();assert.equal(a.statusCode,200);assert.equal(b.statusCode,200);
  assert.equal(a.json().projectId,project.project.id);assert.equal(b.json().projectId,project.project.id);assert.notEqual(a.cookies[0].value,b.cookies[0].value);
  const cookie=`alva_session=${a.cookies[0].value}`;
  assert.equal((await app.inject({url:'/api/project',headers:{cookie}})).json().id,project.project.id);
  assert.equal((await app.inject({method:'POST',url:'/api/public-access',headers:{cookie},payload:{}})).json().projectId,project.project.id);
  await store.db.exec("UPDATE alva_sessions SET expires_at=now()-interval '1 day'");
  const refreshed=await app.inject({method:'POST',url:'/api/public-access',headers:{cookie},payload:{}});assert.equal(refreshed.statusCode,200);assert.notEqual(refreshed.cookies[0].value,a.cookies[0].value);
  const invite=await store.invite(project.project.id,'designer');const auth=await app.inject({method:'POST',url:'/api/access',payload:{token:invite.token}});
  const designer=await app.inject({method:'POST',url:'/api/public-access',headers:{cookie:`alva_session=${auth.cookies[0].value}`},payload:{}});assert.equal(designer.json().role,'designer');
  await store.revoke(project.project.id,project.linkId);assert.equal((await enter()).statusCode,401);
 }finally{await app.close();await store.close()}
});

test('public entry stays disabled unless explicitly configured',async()=>{
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false,publicAccessToken:''});
 try{assert.equal((await app.inject({method:'POST',url:'/api/public-access',payload:{}})).statusCode,404);assert.equal((await app.inject({url:'/api/project'})).statusCode,401)}finally{await app.close();await store.close()}
});
