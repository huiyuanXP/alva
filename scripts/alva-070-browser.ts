import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {chromium, expect, type Browser, type BrowserContext, type Locator, type Page} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createTopologyVersion} from '../api/topology/calibration.js';
import {validateBuildingScene, type BuildingSceneData} from '../api/building/types.js';
import type {SceneData} from '../api/model.js';
import type {SunlightState} from '../packages/contracts/alva/sunlight.js';

type ViewState = {sun:SunlightState;intensity:number;castShadow:boolean;relativeY:number;camera:number[];quaternion:number[]};
type FramePixels = {image:string;noShadow:string;changed:number;centroid:number[]|null};
type FrameSummary = {pixelsChangedByShadows:number;shadowCentroid:number[]|null;frameSha256:string;state:ViewState};

// This is an explicitly synthetic renderer fixture, not model output or a surveyed home.
const fixture: SceneData = {
  walls: [
    {id:'wall-n',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-e',a:{x:8,y:0},b:{x:8,y:6},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-s',a:{x:8,y:6},b:{x:0,y:6},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
    {id:'wall-w',a:{x:0,y:6},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
  ],
  rooms:[{id:'room-living',name:'日照验收客厅',purpose:'客厅',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:6},{x:0,y:6}],locked:false}],
  openings:[{id:'door',wallId:'wall-n',kind:'door',offset:.3,width:1,height:2.1,sill:0},{id:'window',wallId:'wall-n',kind:'window',offset:.75,width:1.2,height:1.2,sill:.9}],items:[{id:'chair',assetId:'alva-sofa',roomId:'room-living',name:'测试家具',clearance:.5,x:4,y:3,width:1,depth:1,height:1,rotation:0,color:'#aabbcc',material:'fabric',locked:false}],calibration:null,
  geography:{latitude:31,north:0,assumption:'合成测试布局；暂用纬度31°、图上方为北，未作现场测量。'},
};
function buildingFor(topology: SceneData, version: number, fingerprint: string): BuildingSceneData {
  const components: BuildingSceneData['components'] = [
    {id:'floor-living',kind:'floor',topologyId:'room-living',position:{x:4,y:-.05,z:3},size:{x:8,y:.1,z:6},rotation:0,material:'floor',color:'#c8b99d'},
    ...topology.walls.map(wall => ({id:`building-${wall.id}`,kind:'wall' as const,topologyId:wall.id,
      position:{x:(wall.a.x+wall.b.x)/2,y:wall.height/2,z:(wall.a.y+wall.b.y)/2},
      size:{x:Math.hypot(wall.b.x-wall.a.x,wall.b.y-wall.a.y),y:wall.height,z:wall.thickness},
      rotation:Math.atan2(wall.b.y-wall.a.y,wall.b.x-wall.a.x),material:'plaster' as const,color:'#d7d5ca'})),
  ];
  for(const o of topology.openings){for(const kind of (o.kind==='door'?['door-frame']:['window-frame','glass']) as Array<'door-frame'|'window-frame'|'glass'>)components.push({id:kind+o.id,kind,topologyId:o.id,position:{x:o.offset*8,y:o.sill+o.height/2,z:0},size:{x:o.width,y:o.height,z:.05},rotation:0,material:'plaster',color:'#abcdef'})}
  return validateBuildingScene({units:'meters',topologyVersion:version,topologyFingerprint:fingerprint,
    components,camera:{position:{x:12,y:11,z:12},target:{x:4,y:1,z:3}}}, topology, version, fingerprint);
}


const runId=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA070-browser';
const evidence=resolve('evidence',runId);await mkdir(evidence,{recursive:true});
process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore();await store.init();
const created=await store.create('ALVA070 synthetic');await store.ensureAccessCode(created.project.id);
await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=fixture;const v=createTopologyVersion(p,fixture);p.confirmedTopology=v;p.topologyVersions=[v];p.confirmedBuilding=buildingFor(fixture,v.version,v.sourceFingerprint);p.buildingState={status:'confirmed',topologyVersion:v.version,topologyFingerprint:v.sourceFingerprint,attempts:1,updatedAt:new Date().toISOString()}});
const app=await buildAlva(store,{assets:true,origin:'http://127.0.0.1'});const origin=await app.listen({host:'127.0.0.1',port:0});
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const checks:string[]=[],errors:string[]=[];
try{
 const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript('globalThis.__name = (value) => value');const session=await store.issueInternalSession(created.project.id);await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}]);const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.getByRole('button',{name:'全屋',exact:true}).click();
 const host=page.getByTestId('scene-view');await expect(host.locator('canvas')).toBeVisible();checks.push('confirmed building uses SceneView');
 await host.evaluate((el:any)=>{const v=el.alvaView;v.orbit.enableDamping=false;v.camera.position.set(4,12,7);v.orbit.target.set(4,0,3);v.orbit.update();v.camera.updateMatrixWorld();el.original=v;});
 const position=()=>host.evaluate((el:any)=>el.alvaView.camera.position.toArray());
 const itemPoint=()=>host.evaluate((el:any)=>{const v=el.alvaView,mesh=v.world.children.find((x:any)=>x.userData.id==='chair');const p=mesh.position.clone().project(v.camera),r=el.querySelector('canvas').getBoundingClientRect();return{x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2}});
 await page.waitForTimeout(200);const before=await position(),point=await itemPoint();await page.screenshot({path:resolve(evidence,'before-click.png')});console.log({point,before,picks:await host.evaluate((el:any)=>{const v=el.alvaView,mesh=v.world.children.find((x:any)=>x.userData.id==='chair'),p=mesh.position.clone().project(v.camera),r=el.querySelector('canvas').getBoundingClientRect();return v.pick(r.x+(p.x+1)*r.width/2,r.y+(1-p.y)*r.height/2)})});await page.mouse.click(point.x,point.y);await expect.poll(()=>host.evaluate((el:any)=>el.alvaView.world.children.find((x:any)=>x.userData.id==='chair').children.length)).toBe(1);assert.deepEqual(await position(),before);assert.equal(await host.evaluate((el:any)=>el.original===el.alvaView),true);checks.push('click selects furniture without renderer or camera reset');
 await page.mouse.move(point.x,point.y);await page.mouse.down();await page.mouse.move(point.x+90,point.y+20,{steps:8});await page.mouse.up();await page.waitForTimeout(200);assert.notDeepEqual(await position(),before);assert.equal(await host.evaluate((el:any)=>el.original===el.alvaView),true);assert.equal((await store.get(created.project.id)).scene!.items[0].x,4);checks.push('drag selected furniture rotates without moving or rebuilding');
 const geometry=await host.evaluate((el:any)=>{const v=el.alvaView;const walls=v.world.children.filter((o:any)=>o.userData.id==='wall-n');const occupied=(x:number,y:number)=>walls.some((o:any)=>Math.abs(o.position.x-x)<o.geometry.parameters.width/2&&Math.abs(o.position.y-y)<o.geometry.parameters.height/2);return{door:occupied(2.4,1),window:occupied(6,1.5),sill:occupied(6,.4),header:occupied(2.4,2.5),glassShadow:v.world.children.find((o:any)=>o.userData.id==='window').castShadow,shadowAuto:v.renderer.shadowMap.autoUpdate}});assert.deepEqual(geometry,{door:false,window:false,sill:true,header:true,glassShadow:false,shadowAuto:false});checks.push('door/window openings, sill/header and cached shadows verified');
 const rotated=await position();await page.getByRole('slider',{name:'太阳时',exact:true}).fill('10');await page.waitForTimeout(200);assert.ok((await position()).every((value:number,index:number)=>Math.abs(value-rotated[index])<1e-9),'Sunlight must preserve camera to floating-point precision');checks.push('sunlight updates preserve camera');
 await page.screenshot({path:resolve(evidence,'scene.png')});assert.deepEqual(errors,[]);await writeFile(resolve(evidence,'result.json'),JSON.stringify({checks,errors,geometry},null,2));
} catch(e){await writeFile(resolve(evidence,'failure.json'),JSON.stringify({checks,errors,error:String(e)},null,2));throw e}finally{await browser.close();await app.close();await store.close()}
