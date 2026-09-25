import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData,Proposal} from '../api/model.js';

const scene=():SceneData=>({
  walls:[{id:'wall-1',a:{x:0,y:0},b:{x:10,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],
  rooms:[
    {id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:5,y:0},{x:5,y:5},{x:0,y:5}],locked:false},
    {id:'study',name:'书房',purpose:'工作',polygon:[{x:5,y:0},{x:10,y:0},{x:10,y:5},{x:5,y:5}],locked:true}
  ],
  openings:[],
  items:[
    {id:'sofa',assetId:'alva-sofa',roomId:'living',name:'沙发',x:2,y:2,width:2.1,depth:.9,height:.8,rotation:0,color:'#9da991',material:'fabric',clearance:0,locked:false},
    {id:'table',assetId:'alva-table',roomId:'living',name:'书桌',x:4,y:2,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false},
    {id:'locked-bed',assetId:'alva-bed',roomId:'study',name:'床',x:7,y:2,width:1.8,depth:2,height:.55,rotation:0,color:'#c8baa8',material:'fabric',clearance:0,locked:false}
  ],
  calibration:null,
  geography:{latitude:31,north:0,assumption:'ALVA-022 合成回归样本'}
});

test('ALVA-022 purpose confirmation is independent from layout and rejects locked rooms',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-022-test-code-123456';
  const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
  try{
    const created=await store.create('ALVA-022 用途分离回归');await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene()});
    const internal=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+internal.token};
    const before=await store.get(created.project.id),beforeItems=JSON.stringify(before.scene!.items.map(i=>({id:i.id,x:i.x,y:i.y,width:i.width,roomId:i.roomId})));
    const confirmed=await app.inject({method:'POST',url:'/api/purpose/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,roomId:'living',purpose:'亲子阅读',sourceText:'客厅改为亲子阅读空间',confirmed:true}});
    assert.equal(confirmed.statusCode,200,confirmed.body);
    const after=confirmed.json();
    assert.equal(after.scene.rooms.find((r:any)=>r.id==='living').purpose,'亲子阅读');
    assert.equal(JSON.stringify(after.scene.items.map((i:any)=>({id:i.id,x:i.x,y:i.y,width:i.width,roomId:i.roomId}))),beforeItems);
    assert.equal(after.purposeConfirmations.length,1);
    assert.equal(after.purposeConfirmations[0].roomId,'living');
    assert.equal(after.purposeConfirmations[0].purpose,'亲子阅读');
    assert.equal(after.layoutConfirmations.length,0);
    assert.equal(after.evidence.find((e:any)=>e.id===after.purposeConfirmations[0].evidenceId).quote,'客厅改为亲子阅读空间');

    const generic=await app.inject({method:'POST',url:'/api/commands',headers,payload:{requestId:randomUUID(),expectedRevision:after.revision,changes:[{action:'purpose',targetId:'living',values:{purpose:'绕过独立确认'}}],confirmed:true}});
    assert.equal(generic.statusCode,422,generic.body);
    const locked=await app.inject({method:'POST',url:'/api/purpose/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:after.revision,roomId:'study',purpose:'儿童房',sourceText:'锁定房间不应被改用途',confirmed:true}});
    assert.equal(locked.statusCode,422,locked.body);
    const final=await store.get(created.project.id);
    assert.equal(final.scene!.rooms.find(r=>r.id==='study')!.purpose,'工作');
    assert.equal(final.purposeConfirmations!.length,1);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});

test('ALVA-022 purpose can produce previewable layout proposals and only a separately selected layout is adopted',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-022-chat-code-123456';
  const store=new AlvaStore();await store.init();
  const chatCodex=async(input:{text?:string;tools?:{name:string;run:(args:unknown)=>Promise<unknown>}[]})=>{
    const snapshot=input.tools!.find(tool=>tool.name==='get_snapshot')!,changes=input.tools!.find(tool=>tool.name==='propose_changes')!;
    const current:any=await snapshot.run({});
    assert.equal(current.project.scene.rooms.find((r:any)=>r.id==='living').purpose,'亲子阅读');
    await changes.run({variants:[
      {title:'阅读布局 A',rationale:'保留现有家具，仅调整阅读位。',changes:[
        {action:'update',targetId:'sofa',values:{x:2.4}}
      ]},
      {title:'阅读布局 B',rationale:'另一组可比较的桌面位置。',changes:[
        {action:'update',targetId:'table',values:{x:4.8}}
      ]}
    ]});
    return '已根据新用途生成两个布局候选，请分别预览后决定是否采用。';
  };
  const app=await buildAlva(store,{assets:false,chatCodex});
  try{
    const created=await store.create('ALVA-022 布局建议回归');await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene()});
    const internal=await store.issueInternalSession(created.project.id),headers={cookie:'alva_session='+internal.token};
    const purpose=await app.inject({method:'POST',url:'/api/purpose/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,roomId:'living',purpose:'亲子阅读',sourceText:'客厅改为亲子阅读空间',confirmed:true}});
    const chat=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:purpose.json().revision,text:'用途确认后请按0.2米调整阅读布局',roomId:'living',model:'gemini-3.1-flash-lite'}});
    assert.equal(chat.statusCode,200,chat.body);
    let current=await store.get(created.project.id);
    assert.equal(current.proposals.length,2);
    assert.equal(current.layoutConfirmations?.length||0,0);
    assert.equal(current.scene!.items.find(i=>i.id==='sofa')!.x,2);
    const rejected=current.proposals[0]!;
    const reject=await app.inject({method:'POST',url:'/api/proposals/reject',headers,payload:{requestId:randomUUID(),expectedRevision:current.revision,id:rejected.id,confirmed:true}});
    assert.equal(reject.statusCode,200,reject.body);
    current=await store.get(created.project.id);
    assert.equal(current.scene!.items.find(i=>i.id==='sofa')!.x,2);
    assert.equal(current.scene!.items.find(i=>i.id==='table')!.x,4);
    assert.equal(current.proposals.find(p=>p.id===rejected.id)!.status,'rejected');
    const candidate=current.proposals[1]!;
    const accept=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{requestId:randomUUID(),expectedRevision:current.revision,id:candidate.id,selectedIds:['table'],confirmed:true}});
    assert.equal(accept.statusCode,200,accept.body);
    current=await store.get(created.project.id);
    assert.equal(current.scene!.items.find(i=>i.id==='sofa')!.x,2);
    assert.equal(current.scene!.items.find(i=>i.id==='table')!.x,4.8);
    assert.equal(current.proposals.find(p=>p.id===candidate.id)!.status,'accepted');
    assert.equal(current.proposals[0]!.status,'rejected');
    assert.equal(current.layoutConfirmations?.length,1);
    assert.deepEqual(current.layoutConfirmations![0]!.selectedIds,['table']);
    assert.equal(current.layoutConfirmations![0]!.proposalId,candidate.id);
    assert.equal(current.purposeConfirmations?.length,1);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
