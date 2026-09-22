import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

test('intake drafts survive retrieval without becoming answers/snapshots; confirmation and auth are enforced',async()=>{
 const code='alva054-synthetic-access-code';process.env.ALVA_ACCESS_CODE=code;
 const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-054 synthetic');await store.ensureAccessCode(project.id);const app=await buildAlva(store,{assets:false});
 try{
  assert.equal((await app.inject({url:'/api/intake'})).statusCode,401);
  const login=await app.inject({method:'POST',url:'/api/access',payload:{code}}),headers={cookie:`alva_session=${login.cookies[0].value}`};
  const post=async(path:string,body:object,revision?:number)=>app.inject({method:'POST',url:'/api/intake/'+path,headers,payload:{requestId:randomUUID(),expectedRevision:revision??(await store.get(project.id)).revision,...body}});
  const read=(await app.inject({url:'/api/intake',headers})).json();assert.equal(read.questions.length,54);assert.ok(!read.questions.some((q:any)=>['Q19','Q20','Q21','Q22','Q58','Q60'].includes(q.id)));assert.equal(read.questions.find((q:any)=>q.id==='Q01').question,'这次咨询结束，你最希望手里多出什么？');
  const answer={questionId:'Q01',roomId:null,text:'希望得到清楚的需求任务书',state:'answered'};
  const saved=await post('progress',{drafts:[answer],cursor:{questionId:'Q01',roomId:null}});assert.equal(saved.statusCode,200);assert.equal(saved.json().answers.length,0);assert.equal(saved.json().evidence.length,0);assert.equal((await store.versions(project.id)).length,0);
  assert.equal((await app.inject({url:'/api/intake',headers})).json().progress.drafts[0].text,answer.text);
  assert.equal((await post('confirm',{answer,confirmed:true},0)).statusCode,409);
  const confirmed=await post('confirm',{answer,confirmed:true});assert.equal(confirmed.statusCode,200);assert.equal(confirmed.json().answers[0].text,answer.text);assert.equal(confirmed.json().evidence[0].quote,answer.text);assert.equal(confirmed.json().intakeProgress.drafts.length,0);assert.equal(confirmed.json().savedVersion,0);
  assert.equal((await post('progress',{drafts:[{...answer,questionId:'Q19'}],cursor:null})).statusCode,422);
  assert.equal((await post('confirm',{answer:{...answer,questionId:'Q25'},confirmed:true})).statusCode,422);
  assert.equal((await post('confirm',{answer:{...answer,state:'not_applicable',text:''},confirmed:true})).statusCode,422);
  await store.mutate(project.id,randomUUID(),null,'fixture-lock',{},p=>{p.answers[0].locked=true});
  assert.equal((await post('confirm',{answer,confirmed:true})).statusCode,422);
  const invite=await store.invite(project.id,'designer');const designer=await app.inject({method:'POST',url:'/api/access',payload:{code,inviteToken:invite.token}});
  const deny=await app.inject({method:'POST',url:'/api/intake/progress',headers:{cookie:`alva_session=${designer.cookies[0].value}`},payload:{requestId:randomUUID(),expectedRevision:(await store.get(project.id)).revision,drafts:[],cursor:null}});assert.equal(deny.statusCode,403);
 }finally{await app.close();await store.close();delete process.env.ALVA_ACCESS_CODE}
});
