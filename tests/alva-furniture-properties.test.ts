import {seedLivingStage} from './fixtures/alva/living-stage.js';
import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {AlvaStore} from '../api/store.js'
import {buildAlva} from '../api/api.js'
import {applyChanges} from '../api/business.js'
import {itemFromAsset,type SceneData} from '../api/model.js'

const scene=():SceneData=>({
  walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
  rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],
  openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-025 合成回归样本'}
})

test('ALVA-025 licensed style replacement preserves instance identity and asset definitions',()=>{
  const base=scene(),chair=itemFromAsset('alva-chair','room-1',1,1),table=itemFromAsset('alva-table','room-1',6,3)
  base.items=[chair,table]
  const assetSnapshot=JSON.stringify({chair:chair.id,room:chair.roomId,table:table.id})
  const replaced=applyChanges(base,[{action:'update',targetId:chair.id,values:{assetId:'alva-sofa',width:1.8,color:'#112233',material:'metal',height:.9}}])
  const next=replaced.items.find(item=>item.id===chair.id)!
  assert.equal(next.id,chair.id)
  assert.equal(next.roomId,'room-1')
  assert.equal(next.assetId,'alva-sofa')
  assert.equal(next.name,'沙发')
  assert.equal(next.width,1.8)
  assert.equal(next.color,'#112233')
  assert.equal(next.material,'metal')
  assert.equal(JSON.stringify({chair:base.items[0].id,room:base.items[0].roomId,table:base.items[1].id}),assetSnapshot)
  assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{assetId:'not-licensed'}}]),/资产不在许可目录/)
  const before=JSON.stringify(base)
  assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{color:'#abcdef'}},{action:'update',targetId:table.id,values:{width:20}}]))
  assert.equal(JSON.stringify(base),before)
  base.items[0].locked=true
  assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{assetId:'alva-bed'}}]),/锁定/)
})

test('ALVA-025 API persists 2D/3D attributes atomically and rejects stale revisions',async()=>{
  const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false})
  try{
    const created=await store.create('ALVA-025 属性持久化回归');await store.ensureAccessCode(created.project.id)
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene();p.scene.items=[{...itemFromAsset('alva-chair','room-1',1,1),id:'chair-1'}];seedLivingStage(p)})
    const internal=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+internal.token}
    const assetsBefore=JSON.stringify((await store.get(created.project.id)).assets)
    const update={requestId:randomUUID(),expectedRevision:seeded.revision,changes:[{action:'update',targetId:'chair-1',values:{assetId:'alva-sofa',width:1.8,depth:.8,height:.9,color:'#102030',material:'metal',x:1.03,y:1.02,rotation:22}}],confirmed:true}
    const response=await app.inject({method:'POST',url:'/api/commands',headers,payload:update})
    assert.equal(response.statusCode,200,response.body)
    const current=response.json(),item=current.scene.items.find((value:any)=>value.id==='chair-1')
    assert.equal(item.assetId,'alva-sofa');assert.equal(item.width,1.8);assert.equal(item.color,'#102030');assert.equal(item.material,'metal');assert.equal(item.x,1.05);assert.equal(item.y,1);assert.equal(item.rotation,15);assert.equal(JSON.stringify(current.assets),assetsBefore)
    const stale=await app.inject({method:'POST',url:'/api/commands',headers,payload:{...update,requestId:randomUUID(),expectedRevision:seeded.revision}})
    assert.equal(stale.statusCode,409,stale.body)
    const invalid=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:current.revision,changes:[{action:'update',targetId:'chair-1',values:{width:20}}],confirmed:true}})
    assert.equal(invalid.statusCode,422,invalid.body);assert.match(invalid.json().error,/宽度.*0.05.*10/)
    const afterInvalid=await store.get(created.project.id);assert.equal(afterInvalid.revision,current.revision);assert.equal(afterInvalid.scene!.items[0]!.width,1.8)
    const locked=await app.inject({method:'POST',url:'/api/locks',headers,payload:{requestId:randomUUID(),expectedRevision:current.revision,id:'chair-1',locked:true,confirmed:true}})
    assert.equal(locked.statusCode,200,locked.body)
    const lockedUpdate=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:locked.json().revision,changes:[{action:'update',targetId:'chair-1',values:{assetId:'alva-bed'}}],confirmed:true}})
    assert.equal(lockedUpdate.statusCode,422,lockedUpdate.body)
  }finally{await app.close();await store.close()}
})

test('ALVA-025 Chat style proposal uses the same licensed replacement contract',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-025-chat-code-123456'
  const store=new AlvaStore();await store.init()
  const chatCodex=async(input:{tools?:{name:string;run:(args:unknown)=>Promise<unknown>}[]})=>{
    const snapshot=input.tools!.find(tool=>tool.name==='get_snapshot')!
    const changes=input.tools!.find(tool=>tool.name==='propose_changes')!
    const current:any=await snapshot.run({})
    assert.equal(current.project.scene.items[0].assetId,'alva-chair')
    await changes.run({variants:[{title:'沙发款式候选',rationale:'替换为许可沙发并保留房间关联。',changes:[{action:'update',targetId:'chair-1',values:{assetId:'alva-sofa',width:1.8,color:'#223344',material:'fabric'}}]}]})
    return '已生成家具款式候选，请确认。'
  }
  const app=await buildAlva(store,{assets:false,chatCodex})
  try{
    const created=await store.create('ALVA-025 Chat款式回归');await store.ensureAccessCode(created.project.id)
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene();p.scene.items=[{...itemFromAsset('alva-chair','room-1',1,1),id:'chair-1'}];seedLivingStage(p)})
    const internal=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+internal.token}
    const response=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,text:'把椅子换成沙发款式，颜色 #223344，并保留房间关联',roomId:'room-1',model:'gemini-3.1-flash-lite'}})
    assert.equal(response.statusCode,200,response.body)
    const current=await store.get(created.project.id);assert.equal(current.proposals.length,1)
    const preview=await app.inject({method:'GET',url:'/api/proposals/'+current.proposals[0].id+'/preview',headers})
    assert.equal(preview.statusCode,200,preview.body);assert.equal(preview.json().scene.items[0].assetId,'alva-sofa')
    const accepted=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{id:current.proposals[0].id,selectedIds:['chair-1'],confirmed:true,requestId:randomUUID(),expectedRevision:current.revision}})
    assert.equal(accepted.statusCode,200,accepted.body);const final=accepted.json().scene.items[0]
    assert.equal(final.id,'chair-1');assert.equal(final.roomId,'room-1');assert.equal(final.assetId,'alva-sofa');assert.equal(final.color,'#223344')
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
})
