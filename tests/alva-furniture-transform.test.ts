import {seedLivingStage} from './fixtures/alva/living-stage.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyChanges} from '../api/business.js';
import {itemFromAsset,type SceneData} from '../api/model.js';

const scene=():SceneData=>({
  walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
  rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],
  openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-024 合成回归样本'}
});

test('ALVA-024 normalizes transforms and rejects boundary, collision and locked bypass atomically',()=>{
  const base=scene(),chair=itemFromAsset('alva-chair','room-1',1,1),table=itemFromAsset('alva-table','room-1',6,3);base.items=[chair,table];
  const moved=applyChanges(base,[{action:'update',targetId:chair.id,values:{x:1.03,y:1.02,rotation:22}}]);
  const result=moved.items.find(i=>i.id===chair.id)!;assert.equal(result.x,1.05);assert.equal(result.y,1);assert.equal(result.rotation,15);
  assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{x:7.9,y:4.9}}]),/超出所属房间边界/);
  assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{x:6,y:3}}]),/占地重叠/);
  const before=JSON.stringify(base);assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{x:1.03}},{action:'update',targetId:table.id,values:{x:7.9,y:4.9}}]));assert.equal(JSON.stringify(base),before);
  base.items[0].locked=true;assert.throws(()=>applyChanges(base,[{action:'update',targetId:chair.id,values:{x:2,y:2}}]),/锁定/);
});

test('ALVA-024 Chat proposal uses the same server transform rules before preview and adoption',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-024-chat-code-123456';
  const store=new AlvaStore();await store.init();
  const chatCodex=async(input:{text?:string;tools?:{name:string;run:(args:unknown)=>Promise<unknown>}[]})=>{
    const tool=input.tools!.find(value=>value.name==='propose_changes')!;
    await tool.run({variants:[{title:'吸附并旋转椅子',rationale:'按网格调整方向和位置',changes:[{action:'update',targetId:'chair-1',values:{x:1.03,y:1.02,rotation:22}}]}]});
    return '已生成家具调整候选，请确认。';
  };
  const app=await buildAlva(store,{assets:false,chatCodex});
  try{
    const created=await store.create('ALVA-024 Chat家具回归');await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene();p.scene.items=[{...itemFromAsset('alva-chair','room-1',1,1),id:'chair-1'}];seedLivingStage(p)});
    const session=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+session.token};
    const response=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,text:'把椅子移动到 1.03 米并旋转 22 度',roomId:null,model:'gemini-3.1-flash-lite'}});
    assert.equal(response.statusCode,200,response.body);
    const current=await store.get(created.project.id);assert.equal(current.proposals.length,1);
    const preview=await app.inject({method:'GET',url:'/api/proposals/'+current.proposals[0].id+'/preview',headers});assert.equal(preview.statusCode,200,preview.body);
    const previewItem=preview.json().scene.items[0];assert.equal(previewItem.x,1.05);assert.equal(previewItem.y,1);assert.equal(previewItem.rotation,15);
    const accepted=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{id:current.proposals[0].id,selectedIds:['chair-1'],confirmed:true,requestId:randomUUID(),expectedRevision:current.revision}});
    assert.equal(accepted.statusCode,200,accepted.body);const final=accepted.json().scene.items[0];assert.equal(final.x,1.05);assert.equal(final.rotation,15);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
