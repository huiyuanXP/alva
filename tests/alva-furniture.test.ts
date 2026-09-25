import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const scene=():SceneData=>({
  walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
  rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],
  openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-023 合成回归样本'}
});

test('ALVA-023 furniture add/copy is atomic, room-scoped and keeps the licensed asset pool immutable',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-023-test-code-123456';
  const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
  try{
    const created=await store.create('ALVA-023 家具实例回归');await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene()});
    const internal=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+internal.token};
    const before=await store.get(created.project.id),assetSnapshot=JSON.stringify(before.assets);
    const add=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,changes:[{action:'add',targetId:randomUUID(),values:{assetId:'alva-sofa',roomId:'room-1',x:2,y:2}}],confirmed:true,reason:'从家具库添加实例'}});
    assert.equal(add.statusCode,200,add.body);const added=add.json();const item=added.scene.items[0];
    assert.match(item.id,/^[0-9a-f-]{36}$/);assert.equal(item.roomId,'room-1');assert.equal(item.assetId,'alva-sofa');assert.equal(JSON.stringify(added.assets),assetSnapshot);
    const copy=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:added.revision,changes:[{action:'copy',targetId:item.id,values:{roomId:'room-1',x:2.4,y:2.4}}],confirmed:true,reason:'复制家具实例'}});
    assert.equal(copy.statusCode,200,copy.body);const copied=copy.json().scene.items.find((i:any)=>i.sourceId===item.id);assert.ok(copied);assert.notEqual(copied.id,item.id);assert.equal(copied.roomId,'room-1');assert.equal(copied.x,2.4);assert.equal(copied.y,2.4);
    const invalid=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:copy.json().revision,changes:[{action:'add',targetId:randomUUID(),values:{assetId:'not-licensed',roomId:'room-1',x:3,y:3}}],confirmed:true}});
    assert.equal(invalid.statusCode,422,invalid.body);const afterAsset=await store.get(created.project.id);assert.equal(afterAsset.scene!.items.length,2);assert.equal(JSON.stringify(afterAsset.assets),assetSnapshot);
    const invalidRoom=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:afterAsset.revision,changes:[{action:'add',targetId:randomUUID(),values:{assetId:'alva-chair',roomId:'missing-room',x:3,y:3}}],confirmed:true}});
    assert.equal(invalidRoom.statusCode,422,invalidRoom.body);const final=await store.get(created.project.id);assert.equal(final.scene!.items.length,2);assert.deepEqual(final.scene!.items.map(i=>i.id),afterAsset.scene!.items.map(i=>i.id));
    const reloaded=await store.get(created.project.id);assert.deepEqual(reloaded.scene,final.scene);assert.equal(JSON.stringify(reloaded.assets),assetSnapshot);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
