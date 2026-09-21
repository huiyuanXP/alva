import assert from 'node:assert/strict';
import {readFile,mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const port=4221,origin=`http://127.0.0.1:${port}`,code='alva-011-browser-code-123456';
const runId=`${new Date().toISOString().replace(/[-:.]/g,'').replace('Z','Z')}-ALVA011-real-browser`,evidence=resolve('evidence',runId),data=resolve('.runtime',`${runId}-data`);
await mkdir(evidence,{recursive:true});await rm(data,{recursive:true,force:true});await mkdir(data,{recursive:true,mode:0o700});
process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_DATA_DIR=data;process.env.ALVA_ORIGIN=origin;
const png=await readFile(resolve('references/room-study-handoff/public/floorplan.png'));const pngData=png.toString('base64');
const scene:SceneData={walls:[
 {id:'wall-n',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-e',a:{x:6,y:0},b:{x:6,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-s',a:{x:6,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-w',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'wall-inner',a:{x:3,y:.5},b:{x:3,y:3.5},thickness:.12,height:2.8,structural:'unknown',evidence:[]},
],rooms:[{id:'room-living',name:'客餐厅',purpose:'用途待确认',polygon:[{x:0,y:0},{x:3,y:0},{x:3,y:4},{x:0,y:4}],locked:false},{id:'room-study',name:'书房',purpose:'用途待确认',polygon:[{x:3,y:0},{x:6,y:0},{x:6,y:4},{x:3,y:4}],locked:false}],openings:[{id:'door-a',wallId:'wall-s',kind:'door',offset:.5,width:.9,height:2.1,sill:0}],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'真实户型图方位待确认'}};
const store=new AlvaStore(resolve(data,'db'));await store.init();const created=await store.create('ALVA-011 真实户型图网页验收');await store.ensureAccessCode(created.project.id);
await store.mutate(created.project.id,randomUUID(),0,'real-floorplan-seed',{source:'references/room-study-handoff/public/floorplan.png'},p=>{p.candidate=scene;p.sourceImage={mime:'image/png',data:pngData,originalMime:'image/png',filename:'floorplan.png'};p.importState={status:'succeeded',message:'Codex 已基于真实附件完成识别，候选待校核。',requestId:randomUUID(),sourceMime:'image/png',filename:'floorplan.png',provider:'codex',model:'gpt-5.5',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()};p.dirty=true;p.evidence.push({id:randomUUID(),quote:'真实附件 floorplan.png 已加载到二维候选对照区；识别候选来源为既有实际模型调用结果。',source:'image',createdAt:new Date().toISOString()})});
const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});const topologyStatuses:number[]=[];const notFoundApi:string[]=[];const consoleErrors:string[]=[];
page.on('response',response=>{if(response.url().includes('/api/candidate/topology')){topologyStatuses.push(response.status());if(response.status()===404)notFoundApi.push(response.url())}});page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});page.on('pageerror',error=>consoleErrors.push(error.message));
const checks:Record<string,unknown>={};
try{
 await page.goto(origin);await page.getByLabel('统一验证码').fill(code);await page.getByRole('button',{name:/验证并进入/}).click();await page.getByText('ALVA-011 真实户型图网页验收').waitFor();checks.real_attachment=await page.getByText(/来源：floorplan\.png/).count()===1;
 const splitResponse=page.waitForResponse(response=>response.url().endsWith('/api/candidate/topology'));await page.locator('svg.plan line').nth(1).click({force:true});await page.getByRole('button',{name:'墙线分段'}).click();const split=await splitResponse;if(split.status()!==200)throw new Error(`split ${split.status()} ${await split.text()}`);checks.wall_split_route=true;
 await page.locator('svg.plan rect').first().click();await page.getByText('门窗校核').waitFor();await page.getByLabel('门窗宽度').fill('1.1');const updateResponse=page.waitForResponse(response=>response.url().endsWith('/api/candidate/topology'));await page.getByRole('button',{name:'保存门窗修改'}).click();assert.equal((await updateResponse).status(),200);checks.opening_update=true;
 await page.getByLabel('门窗位置比例').fill('.1');await page.getByLabel('门窗宽度').fill('5');const invalidResponse=page.waitForResponse(response=>response.url().endsWith('/api/candidate/topology'));await page.getByRole('button',{name:'保存门窗修改'}).click();assert.equal((await invalidResponse).status(),422);await page.waitForTimeout(300);assert.match(await page.locator('body').innerText(),/超出墙(?:段|体)/);checks.invalid_opening_rejected=true;
 await page.getByLabel('门窗宽度').fill('1.1');await page.getByRole('button',{name:'保存门窗修改'}).click();await page.waitForTimeout(250);
 await page.getByLabel('门窗关联墙').selectOption('wall-n');await page.getByLabel('门窗位置比例').fill('.35');await page.getByLabel('门窗宽度').fill('1.2');await page.getByLabel('门窗高度').fill('1.2');await page.getByLabel('窗台高度').fill('1');await page.locator('svg.plan line').first().click({force:true});await page.getByRole('button',{name:'添加门窗'}).click();await page.waitForTimeout(400);checks.opening_add=(await page.locator('svg.plan rect').count())===2;
 await page.locator('svg.plan rect').last().click();await page.getByRole('button',{name:'移除门窗'}).click();await page.waitForTimeout(300);checks.opening_remove=(await page.locator('svg.plan rect').count())===1;
 await page.getByLabel('门窗关联墙').selectOption('wall-n');await page.getByLabel('门窗位置比例').fill('.35');await page.getByLabel('门窗宽度').fill('1.2');await page.getByLabel('门窗高度').fill('1.2');await page.getByLabel('窗台高度').fill('1');await page.getByRole('button',{name:'添加门窗'}).click();await page.waitForTimeout(300);
 await page.getByLabel('校准墙').selectOption('wall-n');await page.getByLabel('真实墙长').fill('10');await page.getByLabel('测量依据').fill('真实 floorplan.png 的现场测量');const calibrationResponse=page.waitForResponse(response=>response.url().endsWith('/api/candidate/calibrate'));await page.getByRole('button',{name:/按这条长度校准/}).click();assert.equal((await calibrationResponse).status(),200);const calibrated=await page.request.get(`${origin}/api/project`).then(response=>response.json());assert.equal(calibrated.candidate.calibration.confirmed,true);assert.equal(calibrated.candidate.walls.find((w:any)=>w.id==='wall-n').b.x,10);checks.calibration=true;
 const confirmResponse=page.waitForResponse(response=>response.url().endsWith('/api/candidate/confirm'));await page.getByRole('button',{name:/确认户型，开始规划/}).click();assert.equal((await confirmResponse).status(),200);await page.getByTestId('confirmed-topology').waitFor();checks.confirmed_version=(await page.getByTestId('confirmed-topology').innerText()).startsWith('已确认拓扑 v1');
 const confirmed=await page.request.get(`${origin}/api/topology/confirmed`).then(response=>response.json());checks.stable_fingerprint=/^[a-f0-9]{64}$/.test(confirmed.sourceFingerprint);await page.reload();await page.getByTestId('confirmed-topology').waitFor();checks.reload_persisted=(await page.getByTestId('confirmed-topology').innerText())===(await page.getByTestId('confirmed-topology').innerText());checks.topology_statuses=topologyStatuses;checks.no_topology_404=notFoundApi.length===0;const unexpectedConsoleErrors=consoleErrors.filter(error=>!/(401|422)/.test(error));checks.console_errors=unexpectedConsoleErrors;
 await page.screenshot({path:resolve(evidence,'alva-011-real-floorplan.png'),fullPage:true});const result={ticket:'ALVA-011',runId,pass:Object.entries(checks).every(([key,value])=>['topology_statuses','console_errors'].includes(key)?true:value===true)&&topologyStatuses.includes(200)&&topologyStatuses.includes(422)&&notFoundApi.length===0&&(!checks.console_errors || (checks.console_errors as string[]).length===0),checks,source:{filename:'floorplan.png',bytes:png.length}};await writeFile(resolve(evidence,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!result.pass)process.exitCode=1;
}finally{await page.close();await browser.close();await app.close();await store.close();await rm(data,{recursive:true,force:true})}

