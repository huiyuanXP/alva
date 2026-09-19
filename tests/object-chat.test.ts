import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Store} from '../apps/api/store.js';
import {buildApp} from '../apps/api/app.js';
import {mkdtemp} from 'node:fs/promises';
import {resolve} from 'node:path';
test('durable object chat: scope, provider replay, explicit confirmation, conflicts and failure evidence',async()=>{
 const dir=await mkdtemp(resolve(process.env.RENOVATION_ACCEPTANCE_DIR||'.runtime','object-store-'));
 let closed=false;const store=new Store(dir);await store.init();let calls=0;let fail=false;
 const app=await buildApp(store,{assets:false,accessCode:'synthetic',objectGenerator:async(p,o,text)=>{calls++;if(fail)throw Error('private provider failure');return {project_id:p.id,room_id:'living',object_id:o,base_version:p.version,status:'proposed',patch:{width:227},text:'建议宽度227',raw_user_evidence:text};}});
 const login=await app.inject({method:'POST',url:'/api/session/login',payload:{code:'synthetic'}});const headers={cookie:login.cookies[0].name+'='+login.cookies[0].value};
 const p=await store.create('owner');
 const send=(route:string,payload:any,id=p.id)=>app.inject({method:'POST',url:`/api/projects/${id}/objects/${route}`,headers,payload});
 const b={expected_version:0,request_id:randomUUID(),room_id:'living',object_id:'sofa-main',text:'  沙发宽227厘米  '};
 try{
 for(const patch of [{room_id:'room2'},{object_id:'missing'},{asset_id:'unknown'},{text:' '}])assert.ok((await send('chat',{...b,...patch})).statusCode>=400);
 const other=await store.create('other');assert.equal((await send('chat',b,other.id)).statusCode,404);
 const r=await send('chat',b);assert.equal(r.statusCode,200,r.body);let q=r.json();assert.deepEqual(q.scene,p.scene);assert.equal(q.object_messages[0].raw_user_evidence,b.text);
 assert.equal((await send('chat',b)).statusCode,200);assert.equal(calls,1);
 assert.equal((await send('chat',{...b,text:'other'})).statusCode,409);
 const d={expected_version:q.version,request_id:randomUUID(),room_id:'living',object_id:'sofa-main',message_id:b.request_id,action:'confirm'};
 assert.equal((await send('decision',d)).statusCode,400);
 assert.equal((await send('decision',{...d,confirmed:true,object_id:'chair-main'})).statusCode,404);
 const manual=await send('update',{expected_version:q.version,request_id:randomUUID(),room_id:'living',object_id:'sofa-main',confirmed:true,patch:{width:230}});assert.equal(manual.statusCode,200);
 assert.equal((await send('decision',{...d,confirmed:true,expected_version:manual.json().version})).statusCode,409);
 const next={...b,request_id:randomUUID(),expected_version:manual.json().version};q=(await send('chat',next)).json();
 const confirm={...d,request_id:randomUUID(),message_id:next.request_id,expected_version:q.version,confirmed:true};const adopted=await send('decision',confirm);assert.equal(adopted.statusCode,200,adopted.body);q=adopted.json();assert.equal(q.scene.floors[0].furniture[0].width,227);assert.equal(q.object_messages[1].status,'accepted');
 assert.equal((await send('decision',confirm)).json().version,q.version);
 fail=true;const failed=await send('chat',{...b,expected_version:q.version,request_id:randomUUID(),text:'失败原话'});q=failed.json();assert.equal(q.object_messages.at(-1).status,'failed');assert.equal(q.object_messages.at(-1).raw_user_evidence,'失败原话');assert.equal(q.scene.floors[0].furniture[0].width,227);
 await app.close();await store.close();closed=true;const reopened=new Store(dir);await reopened.init();const restored=await reopened.get(p.id,'owner');assert.deepEqual(restored.object_messages,q.object_messages);await reopened.close();
 }finally{if(!closed){await app.close();await store.close();}}
});

test('cancel during generation stays rejected and duplicate request never invokes provider again',async()=>{
 const {ObjectChatService}=await import('../apps/api/object-chat.js');
 const store=new Store();await store.init();const p=await store.create('owner');let release!:()=>void;let started!:()=>void;
 const entered=new Promise<void>(r=>started=r);const paused=new Promise<void>(r=>release=r);let calls=0;
 const service=new ObjectChatService(store,async(p,o,text)=>{calls++;started();await paused;return {project_id:p.id,room_id:'living',object_id:o,base_version:p.version,status:'proposed',patch:{width:250},text:'待确认',raw_user_evidence:text};});
 const b={request_id:randomUUID(),expected_version:0,room_id:'living',object_id:'sofa-main',text:'宽250'};
 try{const running=service.start(p.id,'owner',b);await entered;const replay=await service.start(p.id,'owner',b);assert.equal(replay.object_messages![0].status,'running');assert.equal(calls,1);
 await service.decide(p.id,'owner',{request_id:randomUUID(),expected_version:replay.version,room_id:'living',object_id:'sofa-main',message_id:b.request_id,action:'reject'});release();const done=await running;assert.equal(done.object_messages![0].status,'rejected');assert.deepEqual(done.scene,p.scene);
 }finally{release?.();await store.close();}
});
