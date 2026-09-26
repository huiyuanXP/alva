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
  openings:[],items:[],calibration:null,
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
  return validateBuildingScene({units:'meters',topologyVersion:version,topologyFingerprint:fingerprint,
    components,camera:{position:{x:12,y:11,z:12},target:{x:4,y:1,z:3}}}, topology, version, fingerprint);
}

const runId = new Date().toISOString().replace(/[-:.]/g,'') + '-ALVA040-browser-' + randomUUID().slice(0,6);
const evidence = resolve('evidence', runId);
await mkdir(evidence, {recursive:true});
const previousCode = process.env.ALVA_ACCESS_CODE;
process.env.ALVA_ACCESS_CODE = randomBytes(24).toString('hex');
const store = new AlvaStore();
let browser: Browser | undefined;
let app: Awaited<ReturnType<typeof buildAlva>> | undefined;
let currentPage: Page | undefined;
const errors: string[] = [], checks: string[] = [];
const observations: Record<string, unknown> = {};
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
try {
  await store.init();
  const created = await store.create('ALVA-040 synthetic browser test');
  await store.ensureAccessCode(created.project.id);
  app = await buildAlva(store,{assets:true,origin:'http://127.0.0.1'});
  const origin = await app.listen({host:'127.0.0.1',port:0});
  browser = await chromium.launch({headless:true,
    executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || '/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',
    args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage'],
  });
  for (const mode of ['scene','building'] as const) {
    // The current shared-code contract permits one authorized project. Seed its next
    // synthetic renderer case between contexts rather than weakening that boundary.
    const id=created.project.id,current=await store.get(id);
    await store.mutate(id,randomUUID(),current.revision,'seed-synthetic-sunlight',{},project => {
      project.scene=structuredClone(fixture);
      if(mode==='building'){
        const version=createTopologyVersion(project,fixture);
        project.topologyVersions=[version];project.confirmedTopology=version;
        project.confirmedBuilding=buildingFor(fixture,version.version,version.sourceFingerprint);
        project.buildingState={status:'confirmed',topologyVersion:version.version,topologyFingerprint:version.sourceFingerprint,attempts:1,updatedAt:new Date().toISOString()};
      }
    });
    const context:BrowserContext = await browser.newContext({viewport:{width:1440,height:1000}});
    try {
      const session = await store.issueInternalSession(id);
      await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}]);
      const page:Page = await context.newPage(); currentPage = page;
      page.on('pageerror',error => errors.push(`${mode}: ${error.message}`));
      page.on('console',message => {if(message.type()==='error') errors.push(`${mode}: ${message.text()}`);});
      await page.goto(origin);
      await page.getByRole('button',{name:'全屋',exact:true}).click();
      const selector = `[data-testid="${mode==='building'?'building-canvas':'scene-view'}"]`;
      const host:Locator = page.locator(selector);
      await expect(host.locator('canvas')).toBeVisible();
      await page.waitForFunction(selector => !!(document.querySelector(selector) as any)?.alvaView?.sunlight?.state,selector);
      await expect(page.getByTestId('sunlight-readout')).toContainText('北纬 31.0°');
      await expect(page.getByTestId('sunlight-readout')).toContainText('北向 0.0°');
      await expect(page.getByTestId('sunlight-readout')).toContainText('太阳时不是钟表时间');
      await expect(page.getByTestId('sunlight-readout')).toContainText('非现场精确日照');
      const projectBefore = await (await page.request.get(origin+'/api/project')).json();
      const versionsBefore = await (await page.request.get(origin+'/api/versions')).json();
      const state = async ():Promise<ViewState> => host.evaluate((element:any) => {
        const v=element.alvaView;
        return {sun:v.sunlight.state,intensity:v.sun.intensity,castShadow:v.sun.castShadow,
          relativeY:v.sun.position.y-v.sun.target.position.y,camera:v.camera.position.toArray(),quaternion:v.camera.quaternion.toArray()};
      });
      const settle = async () => page.evaluate(async () => {await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));});
      const slider = async (name:'太阳时'|'季节日期',value:number) => {
        const control=page.getByRole('slider',{name,exact:true});
        await control.focus();
        const step=name==='太阳时'?.5:1,min=name==='太阳时'?0:1,max=name==='太阳时'?24:365;
        if(value-min<=max-value){await control.press('Home');for(let i=0;i<Math.round((value-min)/step);i++) await control.press('ArrowRight');}
        else{await control.press('End');for(let i=0;i<Math.round((max-value)/step);i++) await control.press('ArrowLeft');}
        await expect(control).toHaveValue(String(value));
        await expect.poll(async () => (await state()).sun.settings[name==='太阳时'?'time':'day']).toBe(value);
        await settle();
      };
      // Zoom with real pointer input, then prove subsequent slider changes preserve the camera and GPU canvas.
      await host.locator('canvas').hover(); await page.mouse.wheel(0,-120);
      let previousCamera:number[]=[];let stableCameraSamples=0;
      await expect.poll(async()=>{
        const current=(await state()).camera as number[];
        if(previousCamera.length && current.every((value,index)=>Math.abs(value-previousCamera[index])<1e-9))stableCameraSamples++;
        else stableCameraSamples=0;
        previousCamera=current;return stableCameraSamples;
      },{timeout:30000}).toBeGreaterThanOrEqual(3);
      await host.evaluate((element:any) => {element.__alva040View=element.alvaView;element.__alva040Canvas=element.querySelector('canvas');});
      const cameraBefore = await state();
      await slider('太阳时',9);
      const morning = await state();
      assert.ok(morning.sun.direction.x>0 && morning.castShadow && morning.intensity>0);
      assert.ok(await host.evaluate((element:any) => element.__alva040View===element.alvaView && element.__alva040Canvas===element.querySelector('canvas')),'slider recreated renderer');
      const difference = (a:number[],b:number[]) => Math.max(...a.map((n,i)=>Math.abs(n-b[i])));
      assert.ok(difference(cameraBefore.camera,morning.camera)<1e-5 && difference(cameraBefore.quaternion,morning.quaternion)<1e-5,'slider reset the camera');
      checks.push(`${mode}: existing sliders update the real light without rebuilding renderer or resetting camera`);

      // Real WebGL shadow ablation: identical geometry/camera/light, only casting disabled for one captured frame.
      // Pixel differences therefore cannot be explained by changing the sky colour.
      const capture = async (name:string):Promise<FrameSummary> => {
        await settle();
        const result:FramePixels = await host.evaluate(async (element:any) => {
          const v=element.alvaView,world=v.world||v.scene,renderer=v.renderer;
          renderer.render(world,v.camera);
          const image=renderer.domElement.toDataURL('image/png'),oldCast=v.sun.castShadow;
          let noShadow:string;
          try{v.sun.castShadow=false;renderer.render(world,v.camera);noShadow=renderer.domElement.toDataURL('image/png');}
          finally{v.sun.castShadow=oldCast;v.sun.shadow.needsUpdate=true;renderer.render(world,v.camera);}
          const buffers:Uint8ClampedArray[]=[];
          for(const url of [image,noShadow!]){
            const decoded=new Image();decoded.src=url;await decoded.decode();
            const canvas=document.createElement('canvas');canvas.width=decoded.width;canvas.height=decoded.height;
            const context=canvas.getContext('2d')!;context.drawImage(decoded,0,0);
            buffers.push(context.getImageData(0,0,canvas.width,canvas.height).data);
          }
          const [a,b]=buffers,width=renderer.domElement.width;
          let changed=0,sumX=0,sumY=0;
          for(let i=0;i<a.length;i+=4){const delta=Math.abs(a[i]-b[i])+Math.abs(a[i+1]-b[i+1])+Math.abs(a[i+2]-b[i+2]);
            if(delta>=18){changed++;sumX+=(i/4)%width;sumY+=Math.floor(i/4/width);}}
          return {image,noShadow:noShadow!,changed,centroid:changed?[sumX/changed,sumY/changed]:null};
        });
        await writeFile(resolve(evidence,`${mode}-${name}-canvas.png`),Buffer.from(result.image.split(',')[1],'base64'));
        await writeFile(resolve(evidence,`${mode}-${name}-shadow-disabled.png`),Buffer.from(result.noShadow.split(',')[1],'base64'));
        await page.screenshot({path:resolve(evidence,`${mode}-${name}.png`),fullPage:true});
        const summary:FrameSummary={pixelsChangedByShadows:result.changed,shadowCentroid:result.centroid,frameSha256:hash(result.image),state:await state()};
        observations[`${mode}-${name}`]=summary;
        return summary;
      };
      const morningFrame=await capture('summer-morning');
      assert.ok(morningFrame.pixelsChangedByShadows>60,`${mode}: no measurable real shadow pixels in morning`);
      await slider('太阳时',15);
      const afternoon=await state(),afternoonFrame=await capture('summer-afternoon');
      assert.ok(afternoon.sun.direction.x<0);
      assert.ok(afternoonFrame.pixelsChangedByShadows>60,`${mode}: no measurable real shadow pixels in afternoon`);
      assert.notEqual(morningFrame.frameSha256,afternoonFrame.frameSha256);
      assert.ok(difference(morningFrame.shadowCentroid!,afternoonFrame.shadowCentroid!)>2,`${mode}: shadow placement did not change`);
      checks.push(`${mode}: morning/afternoon sun and rendered shadow pixels move, verified against shadow-disabled control frames`);
      await slider('太阳时',9);
      const replay=await host.evaluate((element:any) => element.alvaView.capture());
      assert.equal(hash(replay),morningFrame.frameSha256,`${mode}: same inputs did not reproduce the same frame`);
      checks.push(`${mode}: returning to the same parameters reproduces the exact rendered frame`);
      await slider('太阳时',12); await slider('季节日期',355);
      const winter=await state(),winterFrame=await capture('winter-noon');
      assert.ok(winter.sun.altitudeDegrees>35 && winter.sun.altitudeDegrees<36);
      assert.ok(winterFrame.pixelsChangedByShadows>60);
      await expect(page.getByTestId('sunlight-readout')).toContainText('12月21日');
      checks.push(`${mode}: winter date changes actual elevation and shadows; numerical date/latitude/orientation assumptions visible`);
      await slider('太阳时',0);
      const night=await state();
      assert.equal(night.intensity,0);assert.equal(night.castShadow,false);assert.ok(night.relativeY<0);
      await expect(page.getByTestId('sunlight-readout')).toContainText('日光阴影已关闭');
      await page.screenshot({path:resolve(evidence,`${mode}-winter-night.png`),fullPage:true});
      observations[`${mode}-night`]=night;
      await slider('太阳时',14.5);
      await expect(page.getByTestId('sunlight-readout')).toContainText('14:30');
      assert.ok((await state()).intensity>0 && (await state()).castShadow);
      checks.push(`${mode}: night disables direct sun/shadows and daylight is restored, half-hour shown correctly`);
      if(mode==='building'){
        await page.getByTestId('building-cutaway').click();
        await expect.poll(async()=>host.evaluate((element:any)=>element.alvaView.wallMeshes.every((mesh:any)=>mesh.material.clippingPlanes.length===1))).toBe(true);
        assert.equal((await state()).sun.settings.time,14.5);
        await page.getByTestId('building-reset').click();
        await expect(page.getByLabel('建筑房间视角')).toHaveValue('');
        checks.push('building: cutaway and reset retain the chosen sunlight parameters');
        await page.getByLabel('建筑房间视角').selectOption('room-living');
        const roomInitial=await state();
        const roomDistance=Math.hypot(roomInitial.camera[0]-4,roomInitial.camera[1]-1.2,roomInitial.camera[2]-3);
        assert.ok(roomDistance>8,'room view starts too close to see the room');
        await page.screenshot({path:resolve(evidence,'building-room-initial.png'),fullPage:true});
        await host.locator('canvas').hover();
        await page.mouse.wheel(0,-200);
        await expect.poll(async()=>difference((await state()).camera,roomInitial.camera)>0.1).toBe(true);
        const roomZoomed=await state();
        await slider('太阳时',9);
        await slider('季节日期',355);
        const roomAfter=await state();
        assert.ok(difference(roomZoomed.camera,roomAfter.camera)<1e-5,'sunlight slider reset selected-room camera');
        assert.ok(difference(roomZoomed.quaternion,roomAfter.quaternion)<1e-5,'sunlight slider reset selected-room orientation');
        assert.equal(await host.evaluate((element:any)=>element.alvaView.renderer.domElement===element.querySelector('canvas')),true);
        await page.screenshot({path:resolve(evidence,'building-room-winter-after-sliders.png'),fullPage:true});
        checks.push('building: selected room starts fully framed and preserves custom zoom across sunlight sliders');
      }
      assert.deepEqual(await (await page.request.get(origin+'/api/project')).json(),projectBefore,'view changes mutated the project');
      assert.deepEqual(await (await page.request.get(origin+'/api/versions')).json(),versionsBefore,'view changes created snapshots');
      checks.push(`${mode}: scene, revision, confirmed data and saved snapshots remain unchanged`);
      assert.deepEqual(errors,[]);
    } catch(error){
      if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:resolve(evidence,`${mode}-failure.png`),fullPage:true}).catch(()=>{});
      throw error;
    } finally {await context.close();currentPage=undefined;}
  }
  const result={ticket:'ALVA-040',runId,pass:true,checks,errors,observations,
    fixture:'synthetic 8m x 6m room; deterministic building components; no model or surveyed-source claim',
    boundary:'isolated real API/browser renderer regression; stage MCP and main-Chat UI action acknowledgement pending ALVA-066; not production acceptance'};
  await writeFile(resolve(evidence,'result.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({ticket:result.ticket,runId,pass:true,checks,errors,evidence},null,2));
} catch(error){
  if(currentPage&&!currentPage.isClosed())await currentPage.screenshot({path:resolve(evidence,'failure.png'),fullPage:true}).catch(()=>{});
  await writeFile(resolve(evidence,'result.json'),JSON.stringify({ticket:'ALVA-040',runId,pass:false,error:String(error),checks,errors,observations},null,2)+'\n');
  throw error;
} finally {
  await browser?.close();await app?.close();await store.close();
  if(previousCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previousCode;
}
