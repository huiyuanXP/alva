import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {AlvaStore} from '../api/store.js'
import {buildAlva} from '../api/api.js'
import {itemFromAsset,type SceneData} from '../api/model.js'
const scene=():SceneData=>({walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],openings:[],items:[{...itemFromAsset('alva-sofa','room-1',2,2),id:'sofa-1'}],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-026 合成样本'}})
test('ALVA-026 remove preserves source evidence and old snapshot, re-adds a new traceable instance',async()=>{
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false})
 try{
  const created=await store.create('ALVA-026 移回家具库回归');await store.ensureAccessCode(created.project.id)
  const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene();p.messages.push({id:'m1',role:'user',text:'客厅需要一张沙发',status:'completed',createdAt:new Date().toISOString()});p.evidence.push({id:'e1',quote:'客厅需要一张沙发',source:'chat',roomId:'room-1',createdAt:new Date().toISOString()})})
  const h={cookie:'alva_session='+(await store.issueInternalSession(created.project.id)).token}
  const review=await app.inject({method:'POST',url:'/api/layout-review/prepare',headers:h,payload:{expectedRevision:seeded.revision}});assert.equal(review.statusCode,200,review.body)
  const before=await app.inject({method:'POST',url:'/api/save',headers:h,payload:{requestId:randomUUID(),expectedRevision:review.json().revision,confirmed:true}})
  assert.equal(before.statusCode,200,before.body);const oldVersion=before.json().savedVersion;const assets=JSON.stringify(before.json().assets)
  const removed=await app.inject({method:'POST',url:'/api/commands',headers:h,payload:{requestId:randomUUID(),expectedRevision:before.json().revision,changes:[{action:'remove',targetId:'sofa-1',values:{}}],confirmed:true,reason:'移回家具库，保留原话依据'}})
  assert.equal(removed.statusCode,200,removed.body);const afterRemove=removed.json()
  assert.equal(afterRemove.scene.items.length,0);assert.equal(afterRemove.archivedFurniture.length,1);assert.equal(afterRemove.archivedFurniture[0].id,'sofa-1');assert.equal(afterRemove.archivedFurniture[0].item.name,'沙发');assert.equal(JSON.stringify(afterRemove.assets),assets);assert.equal(afterRemove.evidence[0].quote,'客厅需要一张沙发');assert.match(afterRemove.changes.at(-1).context.join('；'),/sofa-1/)
  const old=await store.snapshot(created.project.id,oldVersion);assert.equal(old.scene!.items[0].id,'sofa-1');assert.equal(old.evidence[0].quote,'客厅需要一张沙发')
  const added=await app.inject({method:'POST',url:'/api/commands',headers:h,payload:{requestId:randomUUID(),expectedRevision:afterRemove.revision,changes:[{action:'add',targetId:randomUUID(),values:{assetId:'alva-sofa',roomId:'room-1',x:3,y:2,sourceId:'sofa-1'}}],confirmed:true,reason:'从家具库重新添加并追溯原实例'}})
  assert.equal(added.statusCode,200,added.body);const next=added.json(),item=next.scene.items[0];assert.notEqual(item.id,'sofa-1');assert.equal(item.sourceId,'sofa-1');assert.equal(next.archivedFurniture.length,1)
  const review2=await app.inject({method:'POST',url:'/api/layout-review/prepare',headers:h,payload:{expectedRevision:next.revision}});assert.equal(review2.statusCode,200,review2.body)
  const saved=await app.inject({method:'POST',url:'/api/save',headers:h,payload:{requestId:randomUUID(),expectedRevision:review2.json().revision,confirmed:true}});assert.equal(saved.statusCode,200,saved.body)
  const reloaded=await store.get(created.project.id);assert.equal(reloaded.scene!.items[0].sourceId,'sofa-1');assert.equal(JSON.stringify(reloaded.assets),assets);assert.equal(reloaded.archivedFurniture!.length,1)
 }finally{await app.close();await store.close()}
})
