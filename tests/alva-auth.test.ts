import test from 'node:test';
import assert from 'node:assert/strict';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const code='test-unified-code-123456';

test('ALVA-008 requires the shared code before project, media, export, or model routes',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;
 const store=new AlvaStore();await store.init();const project=await store.create('Auth gate');await store.ensureAccessCode(project.project.id);const app=await buildAlva(store,{assets:false});
 try{
  for(const request of [
   app.inject({url:'/api/project'}),
   app.inject({url:'/api/versions'}),
   app.inject({url:'/api/export/1'}),
   app.inject({method:'POST',url:'/api/chat',payload:{text:'绕过验证码'}}),
  ])assert.equal((await request).statusCode,401);
  assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{code:''}})).statusCode,400);
  assert.equal((await app.inject({method:'POST',url:'/api/access',payload:{code:'wrong-unified-code-123456'}})).statusCode,401);
  const first=await app.inject({method:'POST',url:'/api/access',payload:{code}}),second=await app.inject({method:'POST',url:'/api/access',payload:{code}});assert.equal(first.statusCode,200);assert.equal(second.statusCode,200);assert.notEqual(first.cookies[0].value,second.cookies[0].value);
  const firstCookie={cookie:`alva_session=${first.cookies[0].value}`},secondCookie={cookie:`alva_session=${second.cookies[0].value}`};assert.equal((await app.inject({url:'/api/project',headers:firstCookie})).statusCode,200);assert.equal((await app.inject({url:'/api/project',headers:secondCookie})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/logout',headers:firstCookie,payload:{}})).statusCode,200);assert.equal((await app.inject({url:'/api/project',headers:firstCookie})).statusCode,401);assert.equal((await app.inject({url:'/api/project',headers:secondCookie})).statusCode,200);
 }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
