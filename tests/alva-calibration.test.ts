import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {validateOpenings} from '../api/topology/calibration.js';
import type {SceneData} from '../api/model.js';

const scene=():SceneData=>({walls:[
 {id:'wall-n',a:{x:0,y:0},b:{x:5,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-e',a:{x:5,y:0},b:{x:5,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-s',a:{x:5,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-w',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
],rooms:[{id:'room-a',name:'客餐厅',purpose:'用途待确认',polygon:[{x:0,y:0},{x:5,y:0},{x:5,y:4},{x:0,y:4}],locked:false}],openings:[{id:'door-a',wallId:'wall-s',kind:'door',offset:.5,width:.9,height:2.1,sill:0}],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'真实户型图方位待确认'}});
const cookie=(response:any)=>response.cookies[0].name+'='+response.cookies[0].value;
const command=(revision:number,operation:unknown)=>({requestId:randomUUID(),expectedRevision:revision,operation});

test('ALVA-011 validates opening bounds, overlap, wall association and vertical clearance',()=>{
 const base=scene();assert.throws(()=>validateOpenings({...base,openings:[...base.openings,{id:'window-b',wallId:'wall-s',kind:'window',offset:.5,width:1,height:1,sill:1}]}),/重叠/);
 assert.throws(()=>validateOpenings({...base,openings:[{...base.openings[0],offset:.99}]}),/超出墙段/);
 assert.throws(()=>validateOpenings({...base,openings:[{...base.openings[0],height:2,sill:1}]}),/超出墙高/);
 assert.throws(()=>validateOpenings({...base,openings:[{...base.openings[0],wallId:'missing'}]}),/未关联有效墙体/);
});

test('ALVA-011 edits openings, calibrates, confirms immutable topology and survives reload',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-011-test-code-123456';const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
 try{const created=await store.create('ALVA-011 校准测试');await store.ensureAccessCode(created.project.id);let project=await store.mutate(created.project.id,randomUUID(),0,'seed',{fixture:'real-floorplan'},p=>{p.candidate=scene();p.dirty=true});const login=await app.inject({method:'POST',url:'/api/access',payload:{code:'alva-011-test-code-123456'}});const headers={cookie:cookie(login)};
  let response=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:command(project.revision,{kind:'add-opening',wallId:'wall-n',openingKind:'window',offset:.35,width:1.2,height:1.2,sill:1})});assert.equal(response.statusCode,200);project=response.json();const opening=project.candidate!.openings.find((o:any)=>o.kind==='window');assert.ok(opening?.id);
  response=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:command(project.revision,{kind:'update-opening',openingId:opening.id,offset:.65,width:1.1,sill:.9})});assert.equal(response.statusCode,200);project=response.json();assert.equal(project.candidate!.openings.find((o:any)=>o.id===opening.id)!.offset,.65);
  const bad=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:command(project.revision,{kind:'update-opening',openingId:opening.id,width:5})});assert.equal(bad.statusCode,422);assert.equal((await store.get(created.project.id)).candidate!.openings.find((o:any)=>o.id===opening.id)!.width,1.1);
  response=await app.inject({method:'POST',url:'/api/candidate/calibrate',headers,payload:{requestId:randomUUID(),expectedRevision:project.revision,wallId:'wall-n',length:10,source:'真实户型图已知墙长'}});assert.equal(response.statusCode,200);project=response.json();assert.equal(project.candidate!.walls.find((w:any)=>w.id==='wall-n')!.b.x,10);assert.ok(Math.abs(project.candidate!.openings.find((o:any)=>o.id===opening.id)!.width-2.2)<.01);
  response=await app.inject({method:'POST',url:'/api/candidate/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:project.revision,confirmed:true}});assert.equal(response.statusCode,200);project=response.json();assert.equal(project.candidate,null);assert.equal(project.topologyVersions.length,1);assert.equal(project.confirmedTopology!.version,1);assert.match(project.confirmedTopology!.sourceFingerprint,/^[a-f0-9]{64}$/);assert.equal(project.confirmedTopology!.scene.openings.length,2);assert.equal(project.confirmedTopology!.calibration.source,'真实户型图已知墙长');assert.ok(project.confirmedTopology!.assumptions.length>=2);
  const confirmed=structuredClone(project.confirmedTopology);const reloaded=(await app.inject({method:'GET',url:'/api/topology/confirmed',headers})).json();assert.deepEqual(reloaded,confirmed);
  const removed=await app.inject({method:'POST',url:'/api/candidate/topology',headers,payload:command(project.revision,{kind:'remove-opening',openingId:opening.id})});assert.equal(removed.statusCode,422);assert.deepEqual((await app.inject({method:'GET',url:'/api/topology/confirmed',headers})).json(),confirmed);
 }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
