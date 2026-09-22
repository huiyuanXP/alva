import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createTopologyVersion} from '../api/topology/calibration.js';
import type {SceneData} from '../api/model.js';
import {buildingGenerationModel,generateBuilding,type BuildingCodexCall} from '../api/building/generate.js';
import type {BuildingSceneData} from '../api/building/types.js';

const scene=(lShape=false):SceneData=>({
  walls:lShape?[
    {id:'wall-a',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-b',a:{x:8,y:0},b:{x:8,y:5},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-c',a:{x:8,y:5},b:{x:4,y:5},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-d',a:{x:4,y:5},b:{x:4,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-e',a:{x:4,y:3},b:{x:0,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-f',a:{x:0,y:3},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
  ]:[
    {id:'wall-a',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-b',a:{x:6,y:0},b:{x:6,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-c',a:{x:6,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-d',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
  ],
  rooms:lShape?[{id:'room-main',name:'客餐厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:4,y:5},{x:4,y:3},{x:0,y:3}],locked:false}]:[{id:'room-main',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}],locked:false}],
  openings:[{id:'opening-main',wallId:'wall-c',kind:'window',offset:.5,width:1.4,height:1.2,sill:.9}],
  items:[],calibration:{wallId:'wall-a',length:lShape?8:6,source:'现场测量',confirmed:true},geography:{latitude:31,north:0,assumption:'图上方为北'},
});

function buildingFor(topology:SceneData,version:number,fingerprint:string):BuildingSceneData{
  const components:any[]=[];
  for(const room of topology.rooms){
    const xs=room.polygon.map(p=>p.x),zs=room.polygon.map(p=>p.y);
    components.push({id:`floor-${room.id}`,kind:'floor',topologyId:room.id,position:{x:(Math.min(...xs)+Math.max(...xs))/2,y:0,z:(Math.min(...zs)+Math.max(...zs))/2},size:{x:Math.max(...xs)-Math.min(...xs),y:.08,z:Math.max(...zs)-Math.min(...zs)},rotation:0,material:'floor',color:'#c9b79e'});
  }
  for(const wall of topology.walls){
    const dx=wall.b.x-wall.a.x,dy=wall.b.y-wall.a.y,len=Math.hypot(dx,dy),a=Math.atan2(dy,dx);
    components.push({id:`wall-${wall.id}`,kind:'wall',topologyId:wall.id,position:{x:(wall.a.x+wall.b.x)/2,y:wall.height/2,z:(wall.a.y+wall.b.y)/2},size:{x:len,y:wall.height,z:wall.thickness},rotation:a,material:'plaster',color:'#ddd8ca'});
  }
  for(const opening of topology.openings){
    const wall=topology.walls.find(w=>w.id===opening.wallId)!,len=Math.hypot(wall.b.x-wall.a.x,wall.b.y-wall.a.y),a=Math.atan2(wall.b.y-wall.a.y,wall.b.x-wall.a.x),x=wall.a.x+Math.cos(a)*opening.offset*len,z=wall.a.y+Math.sin(a)*opening.offset*len;
    const base={position:{x,y:opening.sill+opening.height/2,z},size:{x:opening.width,y:opening.height,z:.12},rotation:a,topologyId:opening.id};
    components.push({id:`frame-${opening.id}`,kind:'window-frame',...base,material:'wood',color:'#8b6b4a'});
    components.push({id:`glass-${opening.id}`,kind:'glass',...base,size:{x:opening.width,y:opening.height,z:.03},material:'glass',color:'#9fc4cf'});
  }
  return {units:'meters',topologyVersion:version,topologyFingerprint:fingerprint,components,camera:{position:{x:10,y:8,z:12},target:{x:3,y:1,z:2}}};
}

test('ALVA-012 generates two topology-bound layouts and confirms each saved preview',async()=>{
  const png=(await readFile('references/room-study-handoff/public/floorplan.png')).toString('base64');
  let calls=0;let activeTopology=scene(false);
  const codex:BuildingCodexCall=async input=>{
    calls++;assert.equal(input.images?.length,1);assert.match(input.text,/确认拓扑版本/);
    const fingerprint=(input.text.match(/来源指纹：([A-Fa-f0-9]{64})/)||[])[1]!;
    const version=Number((input.text.match(/确认拓扑版本：([0-9]+)/)||[])[1]);
    assert.ok(fingerprint);assert.ok(Number.isInteger(version));
    return JSON.stringify(buildingFor(activeTopology,version,fingerprint));
  };
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-012-test-code-123456';
  const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false,buildingCodex:codex});
  try{
    const created=await store.create('ALVA-012 两种布局');await store.ensureAccessCode(created.project.id);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{source:'real-floorplan'},p=>{
      p.sourceImage={mime:'image/png',data:png,originalMime:'image/png',filename:'floorplan.png'};
      const version=createTopologyVersion(p,activeTopology);p.topologyVersions=[version];p.confirmedTopology=version;p.scene=structuredClone(activeTopology);p.dirty=true;
    });
    const internal=await store.issueInternalSession(created.project.id);const headers={cookie:`alva_session=${internal.token}`};
    const generateAndConfirm=async(expectedRevision:number)=>{
      const generated=await app.inject({method:'POST',url:'/api/building/generate',headers,payload:{requestId:randomUUID(),expectedRevision}});
      assert.equal(generated.statusCode,200,generated.body);const project=generated.json();
      assert.equal(project.buildingState.status,'succeeded');assert.equal(project.buildingCandidate.topologyFingerprint,project.confirmedTopology.sourceFingerprint);assert.ok(project.buildingCandidate.components.some((c:any)=>c.kind==='wall'));
      const confirmed=await app.inject({method:'POST',url:'/api/building/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:project.revision,confirmed:true}});
      assert.equal(confirmed.statusCode,200,confirmed.body);const final=confirmed.json();assert.equal(final.buildingCandidate,undefined);assert.equal(final.buildingState.status,'confirmed');
      const reload=await app.inject({method:'GET',url:'/api/building',headers});assert.deepEqual(reload.json().confirmed,final.confirmedBuilding);return final;
    };
    let final=await generateAndConfirm(seeded.revision);assert.equal(calls,1);
    activeTopology=scene(true);
    final=await store.mutate(created.project.id,randomUUID(),final.revision,'topology-change',{source:'real-floorplan'},p=>{
      const version=createTopologyVersion(p,activeTopology);p.topologyVersions=[...p.topologyVersions,version];p.confirmedTopology=version;p.scene=structuredClone(activeTopology);p.buildingState={...p.buildingState,status:'expired',topologyVersion:version.version,topologyFingerprint:version.sourceFingerprint,updatedAt:new Date().toISOString()};p.dirty=true;
    });
    final=await generateAndConfirm(final.revision);assert.equal(calls,2);assert.equal(final.confirmedBuilding.topologyFingerprint,final.confirmedTopology.sourceFingerprint);assert.equal(final.confirmedBuilding.components.filter((c:any)=>c.kind==='wall').length,6);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous;}
});

test('ALVA-012 rejects a forged output and retains no unverified building',async()=>{
  const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-012-bad-code-123456';let calls=0;
  const badCodex:BuildingCodexCall=async()=>{calls++;return JSON.stringify({units:'meters',topologyVersion:1,topologyFingerprint:'0'.repeat(64),components:[],camera:{position:{x:1,y:1,z:1},target:{x:0,y:0,z:0}}});};
  const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false,buildingCodex:badCodex});
  try{
    const created=await store.create('ALVA-012 bad output');await store.ensureAccessCode(created.project.id);const topology=scene(false);
    const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{const version=createTopologyVersion(p,topology);p.topologyVersions=[version];p.confirmedTopology=version;p.scene=topology;p.dirty=true;});
    const login=await app.inject({method:'POST',url:'/api/access',payload:{code:'alva-012-bad-code-123456'}});const headers={cookie:`alva_session=${login.cookies[0].value}`};
    const response=await app.inject({method:'POST',url:'/api/building/generate',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision}});assert.equal(response.statusCode,422,response.body);
    const after=await store.get(created.project.id);assert.equal(after.confirmedBuilding,undefined);assert.equal(after.buildingState.status,'failed');assert.equal(calls,2);
  }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous;}
});


test('building generation uses dedicated OPENAI_BUILDING_MODEL without changing general OPENAI_MODEL',()=>{
 const previousBuilding=process.env.OPENAI_BUILDING_MODEL,previousGeneral=process.env.OPENAI_MODEL;process.env.OPENAI_BUILDING_MODEL='building-model-test';process.env.OPENAI_MODEL='general-model-kept';
 try{assert.equal(buildingGenerationModel(),'building-model-test');assert.equal(process.env.OPENAI_MODEL,'general-model-kept')}finally{if(previousBuilding===undefined)delete process.env.OPENAI_BUILDING_MODEL;else process.env.OPENAI_BUILDING_MODEL=previousBuilding;if(previousGeneral===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=previousGeneral}
});


test('building generation normalizes provider items alias and fixed units before strict validation',async()=>{
 const topology=scene(false),fingerprint='a'.repeat(64),version=3,project:any={sourceImage:undefined};const expected=buildingFor(topology,version,fingerprint);
 const provider:any={camera:expected.camera,topologyVersion:version,topologyFingerprint:fingerprint,items:expected.components.map(({id,...component}:any)=>component)};
 const codex:BuildingCodexCall=async()=>JSON.stringify(provider);const result=await generateBuilding(project,topology,version,fingerprint,undefined,codex);
 assert.equal(result.units,'meters');assert.equal(result.components.length,expected.components.length);assert.ok(result.components.every((c:BuildingSceneData['components'][number])=>typeof c.id==='string'&&c.id.length>0));
});
