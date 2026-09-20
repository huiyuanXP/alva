import test from 'node:test';
import assert from 'node:assert/strict';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

test('统一验证码支持多设备、刷新、退出、过期和轮换，不再提供公共入口',async()=>{
 const previousCode=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='test-unified-code-123456';
 const store=new AlvaStore();await store.init();const project=await store.create('Shared');await store.ensureAccessCode(project.project.id);const app=await buildAlva(store,{assets:false});
 try{
  const a=await app.inject({method:'POST',url:'/api/access',payload:{code:'test-unified-code-123456'}}),b=await app.inject({method:'POST',url:'/api/access',payload:{code:'test-unified-code-123456'}});
  assert.equal(a.statusCode,200);assert.equal(b.statusCode,200);assert.notEqual(a.cookies[0].value,b.cookies[0].value);
  const cookie=`alva_session=${a.cookies[0].value}`,cookieB=`alva_session=${b.cookies[0].value}`;
  assert.equal((await app.inject({url:'/api/project',headers:{cookie}})).json().id,project.project.id);assert.equal((await app.inject({url:'/api/project',headers:{cookie:cookieB}})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/logout',headers:{cookie},payload:{}})).statusCode,200);assert.equal((await app.inject({url:'/api/project',headers:{cookie}})).statusCode,401);
  await store.db.exec("UPDATE alva_sessions SET expires_at=now()-interval '1 day'");assert.equal((await app.inject({url:'/api/project',headers:{cookie:cookieB}})).statusCode,401);
  const fresh=await app.inject({method:'POST',url:'/api/access',payload:{code:'test-unified-code-123456'}});assert.equal(fresh.statusCode,200);const freshCookie=`alva_session=${fresh.cookies[0].value}`;
  const rotated=await store.rotateAccessCode('rotated-unified-code-123456');assert.equal(rotated,'rotated-unified-code-123456');assert.equal((await app.inject({url:'/api/project',headers:{cookie:freshCookie}})).statusCode,401);assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{code:'test-unified-code-123456'}})).statusCode,401);assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{code:rotated}})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/public-access',payload:{}})).statusCode,404);
 }finally{await app.close();await store.close();if(previousCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previousCode}
});

test('旧邀请需要统一验证码且保持设计师只读身份',async()=>{
 const previousCode=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='test-unified-code-123456';
 const store=new AlvaStore();await store.init();const project=await store.create('Designer');await store.ensureAccessCode(project.project.id);const invite=await store.invite(project.project.id,'designer');const app=await buildAlva(store,{assets:false});
 try{assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{inviteToken:invite.token}})).statusCode,400);assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{code:'test-unified-code-123456',inviteToken:invite.token}})).json().role,'designer');await store.revoke(project.project.id,invite.linkId);assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{code:'test-unified-code-123456',inviteToken:invite.token}})).statusCode,401)}finally{await app.close();await store.close();if(previousCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previousCode}
});
