import test from 'node:test';
import assert from 'node:assert/strict';
import {divideRoomByVirtualLine,zoneFromThreeWalls} from '../api/zones.js';
import type {SceneData} from '../api/model.js';

const wall=(id:string,ax:number,ay:number,bx:number,by:number)=>({id,a:{x:ax,y:ay},b:{x:bx,y:by},thickness:.15,height:2.8,structural:'unknown' as const,evidence:[]});
const rectangle=():SceneData=>({
 walls:[wall('top',0,0,8,0),wall('right',8,0,8,6),wall('bottom',8,6,0,6),wall('left',0,6,0,0)],
 rooms:[{id:'living',name:'客餐厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:6},{x:0,y:6}],locked:false}],
 openings:[],items:[],calibration:{wallId:'top',length:8,source:'test',confirmed:true},geography:{latitude:31,north:0,assumption:'test'},
});
const polygonArea=(p:{x:number;y:number}[])=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a.x*b.y-b.x*a.y},0)/2);

test('a virtual divider snaps to one physical room boundary and creates two semantic zones without adding walls',()=>{
 const scene=rectangle(),beforeWalls=scene.walls.length;
 const zones=divideRoomByVirtualLine(scene,{x:4.08,y:.08},{x:3.94,y:5.92});
 assert.equal(zones.length,2);assert.equal(scene.walls.length,beforeWalls);assert.ok(zones.every(z=>z.roomId==='living'&&z.source==='divider'));
 assert.ok(Math.abs(zones[0].boundary.a.y-0)<.001);assert.ok(Math.abs(zones[0].boundary.b.y-6)<.001);
 assert.ok(Math.abs(polygonArea(zones[0].polygon)+polygonArea(zones[1].polygon)-48)<.01);
});

test('divider endpoints must belong to the same room boundary and cross its interior',()=>{
 const scene=rectangle();
 assert.throws(()=>divideRoomByVirtualLine(scene,{x:2,y:2},{x:6,y:4}),/两端需要落在同一个房间边界/);
 assert.throws(()=>divideRoomByVirtualLine(scene,{x:0,y:1},{x:0,y:5}),/没有形成两个有效区域|穿过房间内部/);
});

test('double click inside a three-wall U creates a rectangular functional zone with only the missing side virtual',()=>{
 const scene=rectangle();scene.walls.push(wall('u-left',1,1,1,4),wall('u-top',1,1,4,1),wall('u-right',4,1,4,4));
 const before=scene.walls.length,zone=zoneFromThreeWalls(scene,{x:2.5,y:2.5});
 assert.equal(scene.walls.length,before);assert.equal(zone.source,'three-wall');assert.equal(zone.roomId,'living');assert.equal(zone.polygon.length,4);
 assert.ok(Math.abs(zone.boundary.a.y-4)<.001&&Math.abs(zone.boundary.b.y-4)<.001);assert.ok(Math.abs(polygonArea(zone.polygon)-9)<.01);
});

test('three-wall auto zone refuses an ordinary point with no U-shaped three-wall enclosure',()=>{
 assert.throws(()=>zoneFromThreeWalls(rectangle(),{x:4,y:3}),/没有识别到由三面近似直角墙围成的矩形区域/);
});

import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createTopologyVersion} from '../api/topology/calibration.js';
import {randomUUID} from 'node:crypto';

test('zone API persists semantic partitions and reopening topology clears them as downstream design state',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-zones-test-12345678';
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
 try{
  const created=await store.create('zones');await store.ensureAccessCode(created.project.id);const topology=rectangle(),version=createTopologyVersion(created.project,topology);
  const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed-zones',{},p=>{p.topologyVersions=[version];p.confirmedTopology=version;p.scene=structuredClone(topology);p.dirty=true});
  const internal=await store.issueInternalSession(created.project.id),headers={cookie:`alva_session=${internal.token}`};
  const divide=await app.inject({method:'POST',url:'/api/zones/divide',headers,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,a:{x:4,y:0},b:{x:4,y:6}}});
  assert.equal(divide.statusCode,200,divide.body);const divided=divide.json();assert.equal(divided.zones.length,2);
  const persisted=await store.get(created.project.id);assert.equal(persisted.zones?.length,2);
  const reopen=await app.inject({method:'POST',url:'/api/topology/reopen',headers,payload:{requestId:randomUUID(),expectedRevision:divided.revision,confirmed:true,discardDownstream:true}});
  assert.equal(reopen.statusCode,200,reopen.body);assert.deepEqual(reopen.json().zones,[]);assert.ok(reopen.json().candidate);
 }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});

import {emptyProject} from '../api/model.js';
import {applyZoneOperation} from '../api/zones-service.js';
test('shared zone service protects locked rooms and preserves physical geometry through rename/remove',()=>{
 const p=emptyProject('synthetic zones');p.scene=rectangle();p.confirmedTopology=createTopologyVersion(p,p.scene);const geometry=structuredClone(p.scene);
 applyZoneOperation(p,{kind:'divide',a:{x:4,y:0},b:{x:4,y:6}});const id=p.zones![0].id;
 applyZoneOperation(p,{kind:'rename',zoneId:id,name:'阅读区'});assert.equal(p.zones![0].name,'阅读区');assert.deepEqual(p.scene,geometry);
 p.scene.rooms[0].locked=true;assert.throws(()=>applyZoneOperation(p,{kind:'remove',zoneId:id}),/锁定/);assert.equal(p.zones!.length,2);
 p.scene.rooms[0].locked=false;applyZoneOperation(p,{kind:'remove',zoneId:id});assert.equal(p.zones!.length,1);assert.deepEqual(p.scene,geometry);
});
