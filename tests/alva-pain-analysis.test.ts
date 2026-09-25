import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {AlvaStore} from '../api/store.js'
import {buildAlva} from '../api/api.js'
import {itemFromAsset,type SceneData} from '../api/model.js'

const scene=():SceneData=>{
 const table=itemFromAsset('alva-table','room-1',3,3);table.width=.6
 const sofa=itemFromAsset('alva-sofa','room-1',3,1);sofa.clearance=.1
 const plant=itemFromAsset('alva-plant','room-1',1.5,.3);plant.height=1.8
 return {
  walls:[{id:'wall-1',a:{x:0,y:0},b:{x:5,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
  rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:5,y:0},{x:5,y:5},{x:0,y:5}],locked:false}],
  openings:[{id:'window-1',wallId:'wall-1',kind:'window',offset:.3,width:1,height:1.2,sill:.9}],
  items:[table,sofa,plant],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-028 合成样本'}
 }
}

const painFindings=(p:any)=>p.findings.filter((f:any)=>f.stage==='intake'&&['furniture','behavior','requirement'].includes(f.kind))

test('ALVA-028 confirmed answer creates sourced life-pain findings idempotently',async()=>{
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false})
 try{
  const created=await store.create('ALVA-028 痛点分析回归');await store.ensureAccessCode(created.project.id)
  const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene()})
  const h={cookie:'alva_session='+(await store.issueInternalSession(created.project.id)).token}
  const answer={questionId:'Q01',roomId:null,text:'每天喝咖啡，家里有狗和玩具，喜欢绿植和明亮采光',state:'answered',locked:false,confirmed:true}
  const first=await app.inject({method:'POST',url:'/api/answers',headers:h,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,answer}})
  assert.equal(first.statusCode,200,first.body)
  const findings=painFindings(first.json())
  assert.equal(findings.length,3)
  for(const finding of findings){assert.ok(finding.evidenceIds.length);assert.equal(finding.status,'pending');assert.ok(finding.reason);assert.ok(finding.suggestion);assert.ok(first.json().evidence.some((e:any)=>finding.evidenceIds.includes(e.id)&&e.quote===answer.text))}
  const repeated=await app.inject({method:'POST',url:'/api/answers',headers:h,payload:{requestId:randomUUID(),expectedRevision:first.json().revision,answer}})
  assert.equal(repeated.statusCode,200,repeated.body)
  assert.equal(painFindings(repeated.json()).length,3)
 }finally{await app.close();await store.close()}
})

test('ALVA-028 negative wording produces no invented pain finding',async()=>{
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false})
 try{
  const created=await store.create('ALVA-028 反例回归');await store.ensureAccessCode(created.project.id)
  const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene()})
  const h={cookie:'alva_session='+(await store.issueInternalSession(created.project.id)).token}
  const answer={questionId:'Q01',roomId:null,text:'不喝咖啡，不养宠物，不需要绿植',state:'answered',locked:false,confirmed:true}
  const response=await app.inject({method:'POST',url:'/api/answers',headers:h,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,answer}})
  assert.equal(response.statusCode,200,response.body);assert.equal(painFindings(response.json()).length,0)
 }finally{await app.close();await store.close()}
})
