import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyTopologyCommand} from '../api/topology/commands.js';
import {describeWall,validateTopology} from '../api/topology/validate.js';
import {applyTopologyRepair,firstTopologyRepairIssue} from '../api/topology/repair.js';
import type {SceneData} from '../api/model.js';

const scene=():SceneData=>({walls:[
 {id:'wall-a',a:{x:0,y:0},b:{x:4,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-b',a:{x:4,y:0},b:{x:4,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-c',a:{x:4,y:3},b:{x:2,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-d',a:{x:2,y:3},b:{x:0,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-e',a:{x:0,y:3},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-f',a:{x:2,y:3},b:{x:2,y:1.5},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 ],rooms:[
  {id:'room-a',name:'客餐厅',purpose:'用途待确认',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:2,y:3},{x:0,y:3}],locked:false},
  {id:'room-b',name:'书房',purpose:'用途待确认',polygon:[{x:2,y:1.5},{x:4,y:1.5},{x:4,y:3},{x:2,y:3}],locked:false},
 ],openings:[{id:'door-a',wallId:'wall-f',kind:'door',offset:.5,width:.8,height:2.1,sill:0}],items:[],calibration:{wallId:'wall-a',length:4,source:'已有测量',confirmed:true},geography:{latitude:31,north:0,assumption:'图上方为北，尺寸待校准'}});

function cookie(response:any){return response.cookies[0].name+'='+response.cookies[0].value}

test('ALVA-010 keeps shared vertices and stable IDs while correcting a non-rectangular multi-room candidate',()=>{
 const base=scene(),result=applyTopologyCommand(base,{kind:'move-wall-endpoint',wallId:'wall-a',end:'b',point:{x:4.5,y:0}});
 assert.equal(result.scene.walls.find(w=>w.id==='wall-a')!.b.x,4.5);
 assert.equal(result.scene.walls.find(w=>w.id==='wall-b')!.a.x,4.5);
 assert.equal(result.scene.rooms[0].polygon[1].x,4.5);
 assert.equal(result.scene.walls.find(w=>w.id==='wall-a')!.id,'wall-a');
 assert.deepEqual(result.scene.rooms[0].polygon.map(p=>[p.x,p.y]),[[0,0],[4.5,0],[4,3],[2,3],[0,3]]);
 const split=applyTopologyCommand({...base,openings:[]},{kind:'split-wall',wallId:'wall-a'});
 assert.equal(split.scene.walls.length,7);assert.ok(split.scene.walls.at(-1)!.evidence.some(e=>e.includes('split-from:wall-a')));
 const added=applyTopologyCommand(base,{kind:'add-wall',a:{x:0,y:4},b:{x:3,y:4}});assert.equal(added.scene.walls.length,7);
 assert.throws(()=>applyTopologyCommand(base,{kind:'remove-wall',wallId:'wall-f'}),/门窗/);
 assert.throws(()=>applyTopologyCommand(base,{kind:'move-room-vertex',roomId:'room-a',index:2,point:{x:2,y:0}}),/拓扑校验失败/);assert.throws(()=>applyTopologyCommand(base,{kind:'remove-room-vertex',roomId:'room-a',index:0}),/与墙连接/);
});

test('ALVA-010 rejects zero, duplicate and crossing topology with a located 422 error',()=>{
 const base=scene();assert.throws(()=>applyTopologyCommand(base,{kind:'add-wall',a:{x:1,y:1},b:{x:1,y:1}}),/墙体长度不能为零/);
 assert.throws(()=>applyTopologyCommand(base,{kind:'add-wall',a:{x:0,y:0},b:{x:4,y:0}}),/重复/);
 assert.throws(()=>validateTopology({...base,walls:[...base.walls,{...base.walls[0],id:'cross',a:{x:1,y:-1},b:{x:1,y:1}}]}),/自交/);
});

test('ALVA-010 persists topology changes, clears calibration, survives reload and replays idempotently',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-010-test-code-123456';const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
 try{const created=await store.create('Topology test');await store.ensureAccessCode(created.project.id);const login=await app.inject({method:'POST',url:'/api/access',payload:{code:'alva-010-test-code-123456'}});assert.equal(login.statusCode,200);const headers={cookie:cookie(login)};const requestId=randomUUID();const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.candidate=scene();p.dirty=true});const changed=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:{requestId,expectedRevision:seeded.revision,operation:{kind:'move-wall-endpoint',wallId:'wall-a',end:'b',point:{x:4.5,y:0}}}});assert.equal(changed.statusCode,200);const body=changed.json();assert.equal(body.candidate.calibration,null);assert.equal(body.candidate.walls.find((w:any)=>w.id==='wall-a').b.x,4.5);assert.equal(body.candidate.walls.find((w:any)=>w.id==='wall-b').a.x,4.5);const replay=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:{requestId,expectedRevision:seeded.revision,operation:{kind:'move-wall-endpoint',wallId:'wall-a',end:'b',point:{x:4.5,y:0}}}});assert.equal(replay.statusCode,200);assert.equal(replay.json().revision,body.revision);const reloaded=await app.inject({method:'GET',url:'/api/project',headers});assert.equal(reloaded.json().candidate.walls.find((w:any)=>w.id==='wall-a').id,'wall-a');assert.equal(reloaded.json().candidate.calibration,null);const bad=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:{requestId:randomUUID(),expectedRevision:body.revision,operation:{kind:'add-wall',a:{x:1,y:1},b:{x:1,y:1}}}});assert.equal(bad.statusCode,422);assert.match(bad.json().error,/拓扑校验失败/);assert.equal((await store.get(created.project.id)).candidate!.walls.length,6)}finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}}
);


test('topology errors identify walls by room and direction, explain T-junction cause and give repair options',()=>{
 const base=scene();assert.match(describeWall(base,base.walls[0]),/客餐厅上侧墙/);
 const tScene:SceneData={...base,walls:[...base.walls.filter(w=>w.id!=='wall-f'),{id:'wall-t',a:{x:2,y:0},b:{x:2,y:1.5},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],openings:[]};
 let message='';try{validateTopology(tScene)}catch(error){message=(error as Error).message}
 assert.match(message,/客餐厅/);assert.match(message,/中间/);assert.match(message,/可能原因/);assert.match(message,/T 型/);assert.match(message,/建议修正/);assert.match(message,/分成两段/);assert.match(message,/墙角/);assert.match(message,/误识别墙/);assert.match(message,/技术信息（供开发排查）/);assert.doesNotMatch(message,/拓扑校验失败：墙 wall-t/);
});


test('owner can choose a T-junction repair and backend performs exact split, snap or removal',()=>{
 const base:SceneData={walls:[
  {id:'host',a:{x:0,y:0},b:{x:4,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
  {id:'guest',a:{x:2,y:0},b:{x:2,y:2},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 ],rooms:[{id:'room',name:'客厅',purpose:'客厅',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'test'}};
 const issue=firstTopologyRepairIssue(base);assert.equal(issue?.kind,'t-junction');assert.ok(issue?.options.some(o=>o.id.startsWith('split-host:')));
 const splitOption=issue!.options.find(o=>o.id.startsWith('split-host:'))!;const split=applyTopologyRepair(base,issue!.id,splitOption.id);assert.equal(split.scene.walls.length,3);assert.equal(firstTopologyRepairIssue(split.scene),null);assert.ok(split.scene.walls.filter(w=>nearPoint(w.a,{x:2,y:0})||nearPoint(w.b,{x:2,y:0})).length>=3);
 const snapOption=issue!.options.find(o=>o.id.startsWith('snap-guest:'))!;const snapped=applyTopologyRepair(base,issue!.id,snapOption.id);assert.equal(firstTopologyRepairIssue(snapped.scene),null);assert.deepEqual(snapped.scene.walls.find(w=>w.id==='guest')!.a,{x:0,y:0});
 const removeOption=issue!.options.find(o=>o.id.startsWith('remove-guest:'))!;const removed=applyTopologyRepair(base,issue!.id,removeOption.id);assert.equal(removed.scene.walls.some(w=>w.id==='guest'),false);assert.equal(firstTopologyRepairIssue(removed.scene),null);
 assert.throws(()=>applyTopologyRepair(base,'stale-issue',splitOption.id),/问题已经变化/);
});

function nearPoint(a:{x:number;y:number},b:{x:number;y:number}){return Math.hypot(a.x-b.x,a.y-b.y)<.001}

test('automatic T-junction split migrates openings to the correct new wall segment and rejects an opening spanning the split',()=>{
 const base:SceneData={walls:[
  {id:'host',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
  {id:'guest',a:{x:3,y:0},b:{x:3,y:2},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 ],rooms:[{id:'room',name:'客厅',purpose:'客厅',polygon:[{x:0,y:0},{x:6,y:0},{x:6,y:3},{x:0,y:3}],locked:false}],openings:[{id:'window',wallId:'host',kind:'window',offset:.8,width:.8,height:1.2,sill:.9}],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'test'}};
 const issue=firstTopologyRepairIssue(base)!,option=issue.options.find(o=>o.id.startsWith('split-host:'))!;const fixed=applyTopologyRepair(base,issue.id,option.id);const opening=fixed.scene.openings[0];assert.notEqual(opening.wallId,'host');assert.ok(opening.offset>0&&opening.offset<1);
 const unsafe=structuredClone(base);unsafe.openings[0]={id:'door',wallId:'host',kind:'door',offset:.5,width:1,height:2.1,sill:0};const unsafeIssue=firstTopologyRepairIssue(unsafe)!,unsafeOption=unsafeIssue.options.find(o=>o.id.startsWith('split-host:'))!;assert.throws(()=>applyTopologyRepair(unsafe,unsafeIssue.id,unsafeOption.id),/跨有门窗/);
});
