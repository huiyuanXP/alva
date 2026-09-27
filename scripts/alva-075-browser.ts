/** Real browser and API navigation; synthetic project, deterministic stage injection. */
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA075-browser',out=resolve('evidence',run),root=resolve('.runtime',run);
await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('阶段导航合成验收');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),project.revision,'seed',{},p=>{
 seedLivingStage(p);p.buildingCandidate=p.confirmedBuilding;delete p.confirmedBuilding;p.buildingState.status='succeeded';
 for(const stage of ['floorplan','living'] as const)p.messages.push({id:randomUUID(),role:'assistant',stage,text:stage==='floorplan'?'户型历史测试消息':'生活历史测试消息',status:'completed',createdAt:new Date().toISOString()});
});
const port=await new Promise<number>(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const p=(server.address() as {port:number}).port;server.close(()=>done(p))})}),origin=`http://127.0.0.1:${port}`;
const app=await buildAlva(store,{origin,assets:true,automaticRecommendations:false,chatCodex:async input=>{await input.session?.onThread(input.session.threadId||`synthetic-${input.session.key}`);await input.session?.onHandoffsDelivered?.((input.session.handoffs||[]).map(h=>h.id));return input.session?.threadId||'synthetic-thread'}});
await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});
const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
// Navigation tests deliberately exclude model latency; actual MCP is checked separately.
await page.route('**/api/chat/guidance*',route=>route.fulfill({json:{needed:false}}));
const floor=page.getByRole('button',{name:'户型导入',exact:true}),living=page.getByRole('button',{name:'生活设计',exact:true});
try{
 await page.goto(origin);await expect(floor).toBeEnabled();await expect(living).toBeDisabled();await expect(page.getByText('户型历史测试消息',{exact:true})).toBeVisible();checks.push('floorplan navigation enabled; living gated until building confirmation');
 await page.getByRole('button',{name:'确认建筑预览',exact:true}).click();await expect(living).toHaveAttribute('aria-current','step');await expect(living).toBeEnabled();await expect(page.getByText('生活历史测试消息',{exact:true})).toBeVisible();await expect(page.getByText('户型历史测试消息',{exact:true})).toHaveCount(0);checks.push('right building confirmation synchronizes left active stage and transcript');
 await floor.click();await expect(floor).toHaveAttribute('aria-current','step');await expect(page.getByText('户型历史测试消息',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'进入生活设计 →',exact:true})).toBeEnabled();checks.push('left navigation returns to retained floorplan conversation without reopening topology');
 await page.getByRole('button',{name:'进入生活设计 →',exact:true}).click();await expect(living).toHaveAttribute('aria-current','step');await expect(page.getByText('生活历史测试消息',{exact:true})).toBeVisible();checks.push('right living entry uses same server stage navigation');
 await page.route('**/api/chat/actions',route=>route.fulfill({status:503,json:{error:'合成确认卡读取失败'}}));await floor.click();await expect(floor).toHaveAttribute('aria-current','step');await expect(page.getByText('户型历史测试消息',{exact:true})).toBeVisible();await expect(floor).toBeEnabled();await living.click();await expect(living).toHaveAttribute('aria-current','step');checks.push('confirmation-card failure does not freeze stage or navigation');
 await page.unroute('**/api/chat/actions');await page.reload();await expect(living).toHaveAttribute('aria-current','step');await expect(page.getByText('生活历史测试消息',{exact:true})).toBeVisible();checks.push('reload restores server stage and matching transcript');
 await page.setViewportSize({width:390,height:844});await floor.click();await expect(floor).toHaveAttribute('aria-current','step');await living.click();await expect(living).toHaveAttribute('aria-current','step');checks.push('narrow viewport buttons remain clickable in both directions');
 const p=await store.get(project.id);assert.ok(p.confirmedBuilding);assert.equal(p.savedVersion,0);assert.equal(p.messages.length,2);assert.deepEqual(errors,[]);
 await page.screenshot({path:resolve(out,'navigation.png')});await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,errors},null,2));console.log(JSON.stringify({out,checks}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error}finally{await browser.close();await app.close();await store.close()}
