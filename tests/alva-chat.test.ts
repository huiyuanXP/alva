import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {chatModels,validateChatImage} from '../api/chat.js';

test('ALVA-017 chat model catalogue is explicit and reference images require matching PNG/JPEG bytes',()=>{
  assert.deepEqual(chatModels,['gemini-3.1-flash-lite']);
  const png=Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0]).toString('base64');
  assert.equal(validateChatImage({mime:'image/png',data:png}).data,png);
  assert.throws(()=>validateChatImage({mime:'image/jpeg',data:png}),/内容与类型不匹配/);
  assert.throws(()=>validateChatImage({mime:'image/png',data:'not@@base64'}),/内容无效/);
});

test('ALVA-017 routes keep model/chat private, reject raw Codex surface and invalid image before mutation',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva017-test-code-123456';
  const store=new AlvaStore();await store.init();const created=await store.create('ALVA-017');await store.ensureAccessCode(created.project.id);const app=await buildAlva(store,{assets:false,origin:'http://localhost'});
  try{
    assert.equal((await app.inject({url:'/api/models'})).statusCode,401);
    assert.equal((await app.inject({method:'POST',url:'/api/chat',payload:{}})).statusCode,401);
    assert.equal((await app.inject({method:'POST',url:'/api/codex',payload:{prompt:'raw'}})).statusCode,401);
    const login=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code:'alva017-test-code-123456'}});assert.equal(login.statusCode,200);const headers={cookie:`alva_session=${login.cookies[0].value}`,origin:'http://localhost'};
    const models=await app.inject({url:'/api/models',headers});assert.equal(models.statusCode,200);assert.deepEqual(models.json(),{models:['gemini-3.1-flash-lite']});
    assert.equal((await app.inject({method:'POST',url:'/api/codex',headers,payload:{prompt:'raw'}})).statusCode,404);
    const before=await store.get(created.project.id);
    const invalid=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:before.revision,text:'看图',roomId:null,model:'gemini-3.1-flash-lite',image:{mime:'image/png',data:Buffer.from('not a png').toString('base64')}}});
    assert.equal(invalid.statusCode,422);const after=await store.get(created.project.id);assert.equal(after.revision,before.revision);assert.deepEqual(after.messages,before.messages);assert.deepEqual(after.evidence,before.evidence);
    const badModel=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:before.revision,text:'hello',roomId:null,model:'gpt-image-1'}});assert.equal(badModel.statusCode,400);assert.equal((await store.get(created.project.id)).revision,before.revision);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
