import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {AlvaStore} from '../api/store.js'
import {buildAlva} from '../api/api.js'
import {itemFromAsset,type SceneData} from '../api/model.js'

const scene=():SceneData=>({
 walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
 rooms:[
  {id:'room-a',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:5},{x:0,y:5}],locked:false},
  {id:'room-b',name:'餐厅',purpose:'用餐',polygon:[{x:4,y:0},{x:8,y:0},{x:8,y:5},{x:4,y:5}],locked:false}
 ],
 openings:[],items:[{...itemFromAsset('alva-sofa','room-a',2,2),id:'sofa-1'}],
 calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-027 跨房间转移样本'}
})

test('ALVA-027 transfer retires old instance and keeps queryable provenance atomically',async()=>{
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false})
 try{
  const created=await store.create('ALVA-027 跨房间转移回归');await store.ensureAccessCode(created.project.id)
  const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{
   p.scene=scene()
   p.messages.push({id:'m1',role:'user',text:'把客厅沙发转到餐厅',status:'completed',createdAt:new Date().toISOString()})
   p.evidence.push({id:'e1',quote:'把客厅沙发转到餐厅',source:'chat',roomId:'room-a',createdAt:new Date().toISOString()})
  })
  const h={cookie:'alva_session='+(await store.issueInternalSession(created.project.id)).token}
  const transfer=await app.inject({method:'POST',url:'/api/commands',headers:h,payload:{
   requestId:randomUUID(),expectedRevision:seeded.revision,confirmed:true,reason:'跨房间转移家具',
   changes:[{action:'transfer',targetId:'sofa-1',values:{roomId:'room-b',x:6,y:2.5}}]
  }})
  assert.equal(transfer.statusCode,200,transfer.body)
  const moved=transfer.json(),item=moved.scene.items[0]
  assert.equal(moved.scene.items.length,1);assert.notEqual(item.id,'sofa-1');assert.equal(item.roomId,'room-b');assert.equal(item.sourceId,'sofa-1')
  assert.equal(moved.archivedFurniture.length,1);assert.equal(moved.archivedFurniture[0].id,'sofa-1');assert.equal(moved.archivedFurniture[0].item.roomId,'room-a')
  assert.equal(moved.evidence[0].quote,'把客厅沙发转到餐厅');assert.match(moved.changes.at(-1).context.join('；'),/sofa-1/)
  const invalid=await app.inject({method:'POST',url:'/api/commands',headers:h,payload:{
   requestId:randomUUID(),expectedRevision:moved.revision,confirmed:true,reason:'非法目标回滚',
   changes:[{action:'transfer',targetId:item.id,values:{roomId:'missing-room',x:6,y:2.5}}]
  }})
  assert.equal(invalid.statusCode,422);const afterInvalid=await store.get(created.project.id)
  assert.equal(afterInvalid.revision,moved.revision);assert.equal(afterInvalid.scene!.items[0].roomId,'room-b')
  const locked=await app.inject({method:'POST',url:'/api/locks',headers:h,payload:{requestId:randomUUID(),expectedRevision:afterInvalid.revision,confirmed:true,id:item.id,locked:true}})
  assert.equal(locked.statusCode,200,locked.body)
  const lockedTransfer=await app.inject({method:'POST',url:'/api/commands',headers:h,payload:{
   requestId:randomUUID(),expectedRevision:locked.json().revision,confirmed:true,reason:'锁定对象拒绝转移',
   changes:[{action:'transfer',targetId:item.id,values:{roomId:'room-a',x:2,y:2}}]
  }})
  assert.equal(lockedTransfer.statusCode,422);const afterLocked=await store.get(created.project.id)
  assert.equal(afterLocked.scene!.items.length,1);assert.equal(afterLocked.scene!.items[0].roomId,'room-b')
 }finally{await app.close();await store.close()}
})
