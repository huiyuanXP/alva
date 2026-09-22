import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {analyzeTopology} from '../api/topology/diagnostics.js';
import {validateTopology} from '../api/topology/validate.js';
import {buildPlanarGraph} from '../api/topology/planar-graph.js';
import {pointInPolygon} from '../api/model.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {rectangleScene,annotatedFailureScene,rotatedScene,room,wall} from './fixtures/alva/topology-quality.js';

test('ALVA-055 fully defined rectangular home with a door is connected and has no warnings',()=>{
 const s=rectangleScene(),before=JSON.stringify(s),a=analyzeTopology(s);
 assert.equal(a.status,'complete');assert.deepEqual(a.issues,[]);assert.equal(a.measurements.wallComponents,1);
 assert.equal(a.checks.internalVoid,'complete');assert.equal(a.measurements.enclosedAreaM2,60);assert.equal(JSON.stringify(s),before);
});

test('ALVA-055 detects all three annotated error classes with useful entity and position references',()=>{
 const s=annotatedFailureScene(),before=JSON.stringify(s),a=analyzeTopology(s);
 const voids=a.issues.filter(i=>i.code==='internal_void');assert.ok(voids.length>0);assert.ok(voids[0].areaM2!>20);
 const skew=a.issues.find(i=>i.code==='unreasonable_skew'&&i.wallIds.includes('bottom'))!;assert.ok(skew);assert.ok(skew.deviationDegrees!>8);assert.ok(skew.openingIds.includes('skew-window'));
 const isolated=a.issues.find(i=>i.code==='isolated_component'&&i.wallIds.includes('isolated-fragment'))!;assert.ok(isolated);assert.ok(isolated.openingIds.includes('isolated-window'));
 assert.equal(a.calibrated,false);assert.equal(JSON.stringify(s),before);
});

test('ALVA-055 subtracts room union rather than room area sum; overlaps cannot hide undefined space',()=>{
 const s=rectangleScene();s.rooms=[room('left-a',[[0,0],[5,0],[5,6],[0,6]]),room('left-b',[[0,0],[5,0],[5,6],[0,6]])];
 const a=analyzeTopology(s);assert.ok(a.measurements.undefinedAreaM2>28);assert.ok(a.measurements.undefinedAreaM2<30);
});

test('ALVA-055 excludes outside concavities and wall thickness from internal voids',()=>{
 const points=[[0,0],[6,0],[6,3],[3,3],[3,6],[0,6]];
 const s=rectangleScene();s.walls=points.map(([x,y],i)=>{const b=points[(i+1)%points.length];return wall(`w${i}`,x,y,b[0],b[1])});s.openings=[];s.rooms=[room('L形空间',points)];
 assert.equal(analyzeTopology(s).issues.filter(i=>i.code==='internal_void').length,0);
 const r=rectangleScene();r.rooms=[room('内侧净空',[[.075,.075],[9.925,.075],[9.925,5.925],[.075,5.925]])];
 assert.equal(analyzeTopology(r).issues.filter(i=>i.code==='internal_void').length,0);
});

test('ALVA-055 finds unassigned closed subspaces and deduplicates nested enclosure faces',()=>{
 const s=rectangleScene();s.rooms=[room('left-room',[[0,0],[4,0],[4,6],[0,6]])];s.walls.push(wall('partition',4,0,4,6));
 const a=analyzeTopology(s);assert.equal(a.measurements.wallComponents,1);assert.ok(a.measurements.undefinedAreaM2>33&&a.measurements.undefinedAreaM2<35);
 const t=rectangleScene();t.rooms=[];t.walls.push(wall('inner-a',2,2,3,2),wall('inner-b',3,2,3,3),wall('inner-c',3,3,2,3),wall('inner-d',2,3,2,2));
 const b=analyzeTopology(t);assert.equal(b.measurements.enclosedAreaM2,60);assert.ok(b.measurements.undefinedAreaM2<60);assert.equal(b.issues.filter(i=>i.code==='isolated_component').length,1);
});

test('ALVA-055 void location never falls inside a defined island/inner ring',()=>{
 const s=rectangleScene();s.rooms=[room('central',[[2,2],[8,2],[8,4],[2,4]])];
 const a=analyzeTopology(s),v=a.issues.find(i=>i.code==='internal_void')!;
 assert.ok(v.rings!.length>1);assert.ok(v.location);assert.ok(pointInPolygon(v.location!,v.rings![0]));
 assert.equal(pointInPolygon(v.location!,s.rooms[0].polygon),false);
});

test('ALVA-055 rotation, wall direction and array order do not create false skew or disconnection',()=>{
 for(const degrees of [0,15,27,44,67,89,91,137]){
  const s=rotatedScene(rectangleScene(),degrees);s.walls.reverse();for(const w of s.walls)[w.a,w.b]=[w.b,w.a];
  const a=analyzeTopology(s);assert.equal(a.issues.length,0,JSON.stringify({degrees,issues:a.issues}));assert.equal(a.measurements.wallComponents,1);
 }
 const s=annotatedFailureScene(),a=analyzeTopology(s);s.walls.reverse();for(const w of s.walls)[w.a,w.b]=[w.b,w.a];
 const b=analyzeTopology(s);assert.deepEqual(a.issues.map(i=>i.code).sort(),b.issues.map(i=>i.code).sort());
});

test('ALVA-055 short curved-wall approximation is warned rather than bypassing length threshold',()=>{
 const s=rectangleScene();s.walls.push(wall('curve-1',1,1,1.18,1.1),wall('curve-2',1.18,1.1,1.32,1.24),wall('curve-3',1.32,1.24,1.42,1.42));
 const a=analyzeTopology(s);assert.ok(a.issues.some(i=>i.code==='unreasonable_skew'&&i.wallIds.length===3&&i.message.includes('曲线')));
});

test('ALVA-055 missing hosts and opening bounds produce errors, not invented position or connections',()=>{
 const s=rectangleScene();s.openings.push({...s.openings[0],id:'orphan',wallId:'missing'});s.openings[0].offset=0;
 const a=analyzeTopology(s),orphan=a.issues.find(i=>i.openingIds.includes('orphan'))!;
 assert.equal(orphan.code,'invalid_opening');assert.equal(orphan.location,null);assert.equal(orphan.severity,'error');
 assert.ok(a.issues.some(i=>i.code==='invalid_opening'&&i.openingIds.includes('door')));assert.equal(a.measurements.wallComponents,1);
});

test('ALVA-055 tiny omitted area is below documented threshold; open boundaries are inconclusive',()=>{
 const s=rectangleScene();s.rooms=[room('almost-all',[[0,0],[9.99,0],[9.99,6],[0,6]])];assert.equal(analyzeTopology(s).issues.length,0);
 const open=rectangleScene();open.walls=open.walls.filter(w=>w.id!=='right');open.openings=[];
 const a=analyzeTopology(open);assert.equal(a.checks.internalVoid,'unavailable');assert.equal(a.status,'partial');assert.ok(a.issues.some(i=>i.code==='open_boundary'));
 for(const gap of [.02,.04]){const t=rectangleScene();t.walls.find(w=>w.id==='right')!.a.y=gap;const b=analyzeTopology(t);assert.equal(b.checks.internalVoid,'unavailable');assert.equal(b.status,'partial')}
});

test('ALVA-055 no scene, invalid coordinates, self-crossing rooms and unsupported curves are not safe results',()=>{
 assert.equal(analyzeTopology(null).status,'empty');assert.equal(analyzeTopology(null).checks.internalVoid,'unavailable');
 const s=rectangleScene();s.walls[0].a.x=NaN;assert.throws(()=>analyzeTopology(s),/无法执行/);
 const t=rectangleScene();t.rooms=[room('bowtie',[[1,1],[9,5],[1,5],[9,1]])];const a=analyzeTopology(t);assert.equal(a.status,'partial');assert.ok(a.issues.some(i=>i.code==='invalid_geometry'));assert.ok(a.issues.some(i=>i.code==='internal_void'));
 const c=rectangleScene();assert.throws(()=>analyzeTopology({...c,walls:[{...c.walls[0],curve:'unsupported'}]}),/无法执行/);
});

test('ALVA-055 T-junction and collinear overlap rejection is symmetric without changing the analysis graph',()=>{
 const s=rectangleScene();s.walls=[wall('horizontal',0,0,6,0),wall('vertical',3,0,3,2)];s.rooms=[];s.openings=[];
 for(let i=0;i<2;i++){assert.throws(()=>validateTopology(s),/中段/);assert.equal(buildPlanarGraph(s.walls,.03).components.length,1);s.walls.reverse()}
 s.walls=[wall('short',1,0,3,0),wall('long',0,0,5,0)];
 for(let i=0;i<2;i++){assert.throws(()=>validateTopology(s),/中段/);s.walls.reverse()}
});

test('ALVA-055 authenticated GET diagnoses current candidate, edits refresh, read-only access never changes design',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva-055-synthetic-access-code';
 const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});
 try{
  const created=await store.create('Synthetic topology diagnostics');await store.ensureAccessCode(created.project.id);
  assert.equal((await app.inject({method:'GET',url:'/api/topology/diagnostics'})).statusCode,401);
  const login=await app.inject({method:'POST',url:'/api/access',payload:{code:process.env.ALVA_ACCESS_CODE}});assert.equal(login.statusCode,200);
  const headers={cookie:`alva_session=${login.cookies[0].value}`};
  const p=await store.mutate(created.project.id,randomUUID(),0,'test-fixture',{},p=>{p.scene=rectangleScene();p.candidate=annotatedFailureScene()});
  const before=JSON.stringify(await store.get(p.id)),versions=await store.versions(p.id);
  const response=await app.inject({method:'GET',url:'/api/topology/diagnostics',headers});assert.equal(response.statusCode,200);
  const report=response.json();assert.equal(report.source,'candidate');assert.equal(report.revision,p.revision);assert.equal(report.sceneFingerprint.length,64);assert.ok(report.analysis.issues.some((i:any)=>i.code==='isolated_component'));
  assert.equal(JSON.stringify(await store.get(p.id)),before);assert.deepEqual(await store.versions(p.id),versions);
  const another=await store.create('Other synthetic project');assert.equal((await app.inject({method:'GET',url:`/api/projects/${another.project.id}`,headers})).statusCode,403);
  const spoof=await app.inject({method:'GET',url:`/api/topology/diagnostics?projectId=${another.project.id}`,headers});assert.equal(spoof.json().projectId,p.id);
  const corrected=await app.inject({method:'POST',url:'/api/candidate/correct',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,scene:rectangleScene()}});assert.equal(corrected.statusCode,200);
  const reloaded=await app.inject({method:'GET',url:'/api/topology/diagnostics',headers});assert.equal(reloaded.json().revision,p.revision+1);assert.equal(reloaded.json().analysis.issues.length,0);
  assert.deepEqual((await store.get(p.id)).scene,p.scene);assert.deepEqual(await store.versions(p.id),versions);
  const invitation=await store.invite(p.id,'designer');const designer=await app.inject({method:'POST',url:'/api/access',payload:{code:process.env.ALVA_ACCESS_CODE,inviteToken:invitation.token}});
  const readHeaders={cookie:`alva_session=${designer.cookies[0].value}`};assert.equal((await app.inject({method:'GET',url:'/api/topology/diagnostics',headers:readHeaders})).statusCode,200);
  assert.equal((await app.inject({method:'POST',url:'/api/topology/diagnostics',headers:readHeaders,payload:{}})).statusCode,403);
 }finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
