import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {objectInfo, updateObject} from '../apps/api/objects.js';
import {Store} from '../apps/api/store.js';
import {buildApp} from '../apps/api/app.js';
test('object API validates scope, strict values, replay, conflict and atomic revision/outbox',async()=>{
 const store=new Store();await store.init();
 const app=await buildApp(store,{assets:false,accessCode:'synthetic'});
 try {
 const login=await app.inject({method:'POST',url:'/api/session/login',payload:{code:'synthetic'}});
 const headers={cookie:login.cookies[0].name+'='+login.cookies[0].value};
 const p=await store.create('owner');
 const base={expected_version:0,request_id:randomUUID(),room_id:'living',object_id:'sofa-main',confirmed:true,patch:{width:230,elevation:20,color:'#aabbcc'}};
 const send=(payload:any,id=p.id)=>app.inject({method:'POST',url:`/api/projects/${id}/objects/update`,headers,payload});
 for(const change of [{patch:{width:0}},{patch:{height:2001}},{patch:{elevation:-1}},{patch:{material:'wood'}},{actor:'agent'},{confirmed:false},{room_id:'room2'},{object_id:'missing'}]){
 const r=await send({...base,...change});assert.ok([400,404].includes(r.statusCode),r.body);
 }
 const scaled=structuredClone(p);scaled.scene.floors[0].furniture[0].scale.x=2;
 assert.equal(objectInfo(scaled,'sofa-main').capabilities.size,false);
 assert.throws(()=>updateObject(scaled,base as any),/缩放/);
 const other=await store.create('other');assert.equal((await send(base,other.id)).statusCode,404);
 assert.equal((await store.get(p.id,'owner')).version,0);
 const result=await send(base);assert.equal(result.statusCode,200,result.body);
 const updated=result.json();assert.equal(updated.version,1);assert.equal(updated.revisions[0].actor,'owner');
 assert.deepEqual(updated.scene.floors[0].furniture.slice(1),p.scene.floors[0].furniture.slice(1));
 assert.equal((await store.events(p.id,0)).length,1);
 assert.equal((await send(base)).json().version,1);
 assert.equal((await send({...base,patch:{width:240}})).statusCode,409);
 assert.equal((await send({...base,request_id:randomUUID()})).statusCode,409);
 assert.equal((await store.events(p.id,0)).length,1);
 }finally{await app.close();await store.close();}
});

test('API and login limits survive static asset exemption',async()=>{
 const store=new Store();await store.init();const app=await buildApp(store,{assets:false,accessCode:'synthetic'});
 try {
 for(let i=0;i<260;i++) assert.notEqual((await app.inject({url:'/missing-static.js'})).statusCode,429);
 const login=await app.inject({method:'POST',url:'/api/session/login',payload:{code:'synthetic'}});
 const cookie=login.cookies[0].name+'='+login.cookies[0].value;
 for(let i=0;i<9;i++) assert.equal((await app.inject({method:'POST',url:'/api/session/login',payload:{code:'wrong'}})).statusCode,401);
 assert.equal((await app.inject({method:'POST',url:'/api/session/login',payload:{code:'wrong'}})).statusCode,429);
 let limited=false;for(let i=0;i<245;i++) if((await app.inject({url:'/api/session',headers:{cookie}})).statusCode===429) limited=true;
 assert.ok(limited);
 }finally{await app.close();await store.close();}
});
