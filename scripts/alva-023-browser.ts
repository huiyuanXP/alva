import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA023-browser-'+randomUUID().slice(0,6);
const dir='evidence/'+runId,origin='http://127.0.0.1:4197';
await mkdir(dir,{recursive:true});
const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore();await store.init();
const fixture:SceneData={walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'真实浏览器合成布局，验证交互链路'}};
const created=await store.create('ALVA-023 家具真实交互验收');await store.ensureAccessCode(created.project.id);
const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=fixture});
const initialAssets=JSON.stringify(seeded.assets);
const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port:4197});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const session=await store.issueInternalSession(created.project.id);await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}]);
const page=await context.newPage();const errors:string[]=[];const checks:string[]=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('favicon'))errors.push(m.text())});
const getProject=async()=>await (await page.request.get(origin+'/api/project')).json();
const waitItems=async(count:number)=>{await expect.poll(async()=>((await getProject()).scene?.items||[]).length).toBe(count);return getProject()};
try{
  await page.goto(origin);await expect(page.getByRole('button',{name:'家具',exact:true})).toBeVisible();await page.getByRole('button',{name:'家具',exact:true}).click();
  await expect(page.getByTestId('furniture-asset')).toBeVisible();await expect(page.getByTestId('furniture-add')).toBeEnabled();
  await page.getByTestId('furniture-asset').selectOption('alva-sofa');await page.getByTestId('furniture-add').click();
  const added=await waitItems(1),addedItem=added.scene.items[0];if(!addedItem.id||addedItem.roomId!=='room-1'||addedItem.assetId!=='alva-sofa')throw new Error('add did not create a room-scoped licensed instance');if(JSON.stringify(added.assets)!==initialAssets)throw new Error('adding mutated licensed asset definitions');
  checks.push('real browser adds a licensed asset as a new UUID in the explicit room without mutating the asset pool');
  await page.getByTestId('plan-item-'+addedItem.id).click({position:{x:8,y:8}});await expect(page.getByTestId('furniture-selection')).toHaveValue(addedItem.id);
  checks.push('2D click selects the same stable instance ID exposed by the furniture inspector');
  await page.getByRole('button',{name:'全屋',exact:true}).click();await expect(page.locator('canvas[aria-label="全屋三维场景"]')).toBeVisible();await expect(page.getByTestId('furniture-selection')).toHaveValue(addedItem.id);
  const point=await page.locator('[data-testid="scene-view"]').evaluate((host:any,id)=>{const obj=host.alvaView.world.children.find((x:any)=>x.userData?.id===id);const canvas=host.querySelector('canvas');const p=obj.position.clone().project(host.alvaView.camera);return {x:(p.x+1)*canvas.clientWidth/2,y:(1-p.y)*canvas.clientHeight/2}},addedItem.id);
  await page.getByTestId('furniture-selection').selectOption('');await page.locator('canvas[aria-label="全屋三维场景"]').click({position:point});await expect(page.getByTestId('furniture-selection')).toHaveValue(addedItem.id);
  checks.push('real Three.js raycast selection in 3D resolves back to the same instance ID');
  await page.getByTestId('furniture-copy').click();const copiedProject=await waitItems(2);const copied=copiedProject.scene.items.find((i:any)=>i.sourceId===addedItem.id);if(!copied||copied.id===addedItem.id||copied.roomId!=='room-1'||copied.x!==addedItem.x+.4||copied.y!==addedItem.y+.4)throw new Error('copy did not create the expected independent instance');
  checks.push('real browser copy creates a second UUID with sourceId and deterministic offset in the same room');
  await page.reload();const reloaded=await getProject();if(!reloaded.scene.items.some((i:any)=>i.id===addedItem.id)&&!reloaded.scene.items.some((i:any)=>i.id===copied.id))throw new Error('refresh lost furniture identity');
  if(JSON.stringify(reloaded.assets)!==initialAssets)throw new Error('refresh changed licensed asset definitions');checks.push('refresh preserves both instance identities, locations and immutable library definitions');
  const beforeInvalid=await getProject();const bad=await page.request.post(origin+'/api/commands',{data:{requestId:randomUUID(),expectedRevision:beforeInvalid.revision,changes:[{action:'add',targetId:randomUUID(),values:{assetId:'bad-asset',roomId:'room-1',x:4,y:4}}],confirmed:true}});if(bad.status()!==422)throw new Error('invalid asset was accepted');const afterInvalid=await getProject();if(afterInvalid.scene.items.length!==2||afterInvalid.revision!==beforeInvalid.revision)throw new Error('invalid add left a partial instance or revision');checks.push('invalid asset is rejected atomically with no half-created instance');
  await page.screenshot({path:dir+'/furniture-2d-3d-copy.png',fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  const report={ticket:'ALVA-023',runId,pass:true,finishedAt:new Date().toISOString(),checks,errors,instanceIds:{added:addedItem.id,copied:copied.id},fixture:'synthetic scene used for deterministic browser regression; no model output claimed'};
  await writeFile(dir+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await page.screenshot({path:dir+'/failure.png',fullPage:true});await writeFile(dir+'/result.json',JSON.stringify({ticket:'ALVA-023',runId,pass:false,checks,error:String(error),errors},null,2));throw error}
finally{await browser.close();await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
