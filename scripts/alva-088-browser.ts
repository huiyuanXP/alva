import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {snapshotScene} from '../tests/fixtures/alva/snapshot.js';
import {topologyDiagnosticsFor} from '../api/topology/inspection.js';
const real=process.argv.includes('--real'),out=resolve(process.env.ALVA_ACCEPTANCE_DIR!),root=resolve(out,'private');await mkdir(root,{recursive:true});
process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_DATA_DIR=root;process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');delete process.env.ALVA_PUBLIC_ACCESS_TOKEN;
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('ALVA-088 synthetic floorplan');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{p.candidate=snapshotScene();p.candidate.calibration=null;p.candidate.walls.push({...p.candidate.walls[0],id:'unusual-wall',a:{x:2,y:0},b:{x:2.1,y:1}})});
const original=(await store.get(project.id)).candidate,diagnostics=topologyDiagnosticsFor(await store.get(project.id));
const port=await new Promise<number>(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const port=(server.address() as any).port;server.close(()=>done(port))})}),origin='http://127.0.0.1:'+port;
const app=await buildAlva(store,{origin,assets:true,automaticRecommendations:false,...(real?{}:{chatCodex:async(input:any)=>{
 const catalog=await input.tools.find((t:any)=>t.name==='mcp_list_tools').run({});
 const call=(name:string,args={})=>input.tools.find((t:any)=>t.name==='mcp_call_tool').run({name,arguments:args});
 assert.ok(!catalog.tools.some((t:any)=>['generate_building','request_building_confirmation'].includes(t.name)));
 const g=await call('get_stage_guidance');
 if(g.stage==='floorplan'){await call('inspect_topology');await call('request_living_entry',{expectedRevision:(await store.get(project.id)).revision})}
 else{await call('read_question_context')}
 return '请查看确认卡，可以保留当前问题继续。';
 }})});
await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu','--single-process','--no-zygote']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
// Trigger the actual user Chat explicitly so the acceptance is reproducible.
await page.route('**/api/chat/guidance*',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({needed:false})}));
const idle=(count:number)=>expect.poll(async()=>{const messages=(await store.get(project.id)).messages.filter(m=>m.role==='assistant');return messages.length>=count?messages.at(-1)?.status:'waiting'},{timeout:600000,intervals:[1000]}).toBe('completed');
try{
 await page.goto(origin);await page.locator('header .language-switch select').selectOption('zh');
 await expect(page.getByText('生成建筑3D',{exact:true})).toHaveCount(0);
 await page.locator('.chat-stages').getByRole('button',{name:'生活设计',exact:true}).click();await expect(page.locator('[data-action-kind="enter_living"]')).toBeVisible();await page.locator('[data-action-kind="enter_living"]').getByRole('button',{name:'暂不执行',exact:true}).click();await expect(page.locator('[data-action-kind="enter_living"]')).toHaveCount(0);assert.ok((await store.get(project.id)).candidate);checks.push('Stage button opens the same entry card; dismissal preserves candidate and floorplan stage');
 await page.locator('.composer textarea').fill('我确认保留这面奇怪的墙和当前估算尺寸，不再修复告警，也不要生成或校验建筑模型。请读取当前户型并出示按当前户型进入生活设计的确认卡，由我点击。');await page.locator('.composer-actions > button').last().click();await idle(1);
 await expect(page.locator('[data-action-kind="enter_living"]')).toBeVisible();
 let p=await store.get(project.id);assert.ok(p.messages.at(-1)!.toolCalls!.some(t=>t.name==='request_living_entry'&&!t.isError));assert.deepEqual(p.candidate,original);assert.equal((await store.chatState(p.id)).active,'floorplan');checks.push('Main Chat actually requests entry via stage HTTP MCP; candidate and stage remain unchanged before confirmation');
 await page.getByRole('button',{name:'保留当前户型，进入生活设计',exact:true}).click();
 await expect(page.locator('.chat-stages button[aria-current="step"]')).toHaveText('生活设计');p=await store.get(p.id);assert.deepEqual(p.scene,original);assert.equal(p.candidate,null);assert.equal(p.confirmedBuilding,undefined);assert.equal(p.confirmedTopology?.calibration,null);assert.deepEqual(topologyDiagnosticsFor(p).analysis.issues,diagnostics.analysis.issues);checks.push('Explicit confirmation enters living design with uncalibrated dimensions and unchanged unusual wall / diagnostic warnings, without building generation');
 await page.locator('.composer textarea').fill('请实际读取生活设计的当前问卷上下文，并告诉我下一步。');await page.locator('.composer-actions > button').last().click();await idle(2);p=await store.get(p.id);assert.ok(p.messages.at(-1)!.toolCalls!.some(t=>t.name==='read_question_context'&&!t.isError));checks.push('Living MCP reads questionnaire successfully without a confirmed building');
 await page.reload();await expect(page.locator('.chat-stages button[aria-current="step"]')).toHaveText('生活设计');
 await page.locator('.chat-stages').getByRole('button',{name:'户型导入',exact:true}).click();await expect(page.locator('.chat-stages button[aria-current="step"]')).toHaveText('户型导入');
 await page.locator('.chat-stages').getByRole('button',{name:'生活设计',exact:true}).click();await expect(page.locator('.chat-stages button[aria-current="step"]')).toHaveText('生活设计');checks.push('Reload and round-trip navigation preserve adopted floorplan and do not require legacy model steps');
 await page.getByRole('button',{name:'全屋',exact:true}).click();await expect(page.locator('canvas')).toBeVisible();await page.waitForTimeout(1000);checks.push('3D canvas renders the adopted floorplan without separate building output');
 await page.screenshot({path:resolve(out,'living.png')});assert.deepEqual(errors,[]);
 await writeFile(resolve(out,'result.json'),JSON.stringify({real,checks,errors,toolCalls:(await store.get(p.id)).messages.filter(m=>m.role==='assistant').map(m=>m.toolCalls)},null,2));console.log(JSON.stringify({out,checks,errors}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors,project:await store.get(project.id)},null,2));throw error}finally{await browser.close();await app.close();await store.close()}
