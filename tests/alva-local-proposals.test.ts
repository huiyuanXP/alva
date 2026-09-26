import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData,Proposal,Change} from '../api/model.js';

const scene=():SceneData=>({
  walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
  rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],
  openings:[],
  items:[
    {id:'sofa-1',assetId:'alva-sofa',roomId:'room-1',name:'沙发',x:2,y:2,width:2.1,depth:.9,height:.8,rotation:0,color:'#9da991',material:'fabric',clearance:0,locked:false},
    {id:'table-1',assetId:'alva-table',roomId:'room-1',name:'书桌',x:5,y:2,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}
  ],
  calibration:null,
  geography:{latitude:31,north:0,assumption:'合成回归样本'}
});

const proposal=(id:string,baseRevision:number,changes:Change[],referenceIds:string[]=[]):Proposal=>({
  id,title:id,rationale:'回归候选',evidenceIds:[],baseRevision,changes,status:'proposed',referenceIds
});

test('ALVA-021 preview exposes real candidate scene and adoption is selected-only, idempotent, stale-safe and atomic',async()=>{
  const previousCode=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-021-test-code-123456';
  const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
  try{
    const created=await store.create('ALVA-021 候选采用回归');
    await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{
      p.scene=scene();
      p.proposals=[
        proposal('selected',1,[{action:'update',targetId:'sofa-1',values:{x:2.5}}],['table-1']),
        proposal('bad-group',1,[{action:'update',targetId:'sofa-1',values:{x:3}},{action:'update',targetId:'missing',values:{x:3}}]),
        proposal('old-candidate',1,[{action:'update',targetId:'table-1',values:{x:5.5}}])
      ];
    });
    assert.equal(seeded.revision,1);
    const internal=await store.issueInternalSession(created.project.id);
    const headers={cookie:'alva_session='+internal.token};
    const preview=await app.inject({method:'GET',url:'/api/proposals/selected/preview',headers});
    assert.equal(preview.statusCode,200,preview.body);
    assert.deepEqual(preview.json().proposal.referenceIds,['table-1']);
    assert.equal(preview.json().scene.items.find((i:any)=>i.id==='sofa-1').x,2.5);

    const bad=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{id:'bad-group',selectedIds:['sofa-1','missing'],confirmed:true,requestId:randomUUID(),expectedRevision:1}});
    assert.equal(bad.statusCode,422,bad.body);
    const afterBad=await store.get(created.project.id);
    assert.equal(afterBad.revision,1);
    assert.equal(afterBad.scene!.items.find(i=>i.id==='sofa-1')!.x,2);
    assert.equal(afterBad.proposals.find(p=>p.id==='bad-group')!.status,'proposed');

    const requestId=randomUUID();
    const accepted=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{id:'selected',selectedIds:['sofa-1'],confirmed:true,requestId,expectedRevision:1}});
    assert.equal(accepted.statusCode,200,accepted.body);
    assert.equal(accepted.json().scene.items.find((i:any)=>i.id==='sofa-1').x,2.5);
    assert.equal(accepted.json().scene.items.find((i:any)=>i.id==='table-1').x,5);

    const replay=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{id:'selected',selectedIds:['sofa-1'],confirmed:true,requestId,expectedRevision:1}});
    assert.equal(replay.statusCode,200,replay.body);
    assert.deepEqual(replay.json(),accepted.json());

    const stale=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{id:'old-candidate',selectedIds:['table-1'],confirmed:true,requestId:randomUUID(),expectedRevision:2}});
    assert.equal(stale.statusCode,409,stale.body);
    assert.match(stale.json().error,/版本|重新生成/);
    const final=await store.get(created.project.id);
    assert.equal(final.scene!.items.find(i=>i.id==='table-1')!.x,5);
    assert.equal(final.proposals.find(p=>p.id==='old-candidate')!.status,'proposed');
  }finally{await app.close();await store.close();if(previousCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previousCode}
});


test('ALVA-021 requires two different candidates for ambiguous requests but allows one precise candidate',async()=>{
  const store=new AlvaStore();await store.init();
  const chatCodex=async(input:{tools?:{name:string;run:(args:unknown)=>Promise<unknown>}[]})=>{
    const tool=input.tools!.find(item=>item.name==='propose_changes')!;
    const text=String((input as any).text||'');
    if(text.includes('精确')) await tool.run({variants:[{title:'精确移动',rationale:'仅改变沙发位置',changes:[{action:'update',targetId:'sofa-1',values:{x:2.2}}]}]});
    else await tool.run({variants:[{title:'单一候选',rationale:'不应接受',changes:[{action:'update',targetId:'sofa-1',values:{x:2.2}}]}]});
    return '候选已提出';
  };
  const app=await buildAlva(store,{assets:false,chatCodex});
  try{
    const created=await store.create('ALVA-021 候选数量回归');await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene()});
    const internal=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+internal.token};
    const first=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,text:'帮我调整一下沙发',roomId:null,model:'gemini-3.8-flash-high'}});
    assert.equal(first.statusCode,200,first.body);
    let current=await store.get(created.project.id);
    assert.equal(current.proposals.length,0);
    assert.equal(current.messages.at(-1)!.status,'failed');
    const precise=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:current.revision,text:'精确把沙发移动 0.2 米',roomId:null,model:'gemini-3.8-flash-high'}});
    assert.equal(precise.statusCode,200,precise.body);
    current=await store.get(created.project.id);
    assert.equal(current.proposals.length,1);
    assert.equal(current.proposals[0]!.title,'精确移动');
  }finally{await app.close();await store.close()}
});
