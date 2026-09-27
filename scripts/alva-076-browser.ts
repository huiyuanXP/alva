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
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA076-browser',out=resolve('evidence',run),root=resolve('.runtime',run);
await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('阶段导航合成验收');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),project.revision,'seed',{},p=>{
 seedLivingStage(p);
 for(const stage of ['floorplan','living'] as const)p.messages.push({id:randomUUID(),role:'assistant',stage,text:stage==='floorplan'?'户型历史测试消息':'生活历史测试消息',status:'completed',createdAt:new Date().toISOString()});
});
const port=await new Promise<number>(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const p=(server.address() as {port:number}).port;server.close(()=>done(p))})}),origin=`http://127.0.0.1:${port}`;
await store.updateChatState(project.id,state=>{state.active='floorplan'});
let started=0,cancelled=0;
const app=await buildAlva(store,{origin,assets:true,automaticRecommendations:false,chatCodex:async input=>{
 await input.session?.onThread(input.session.threadId||`synthetic-${input.session.key}`);
 if(input.injectOnly||input.resumeOnly){await input.session?.onHandoffsDelivered?.((input.session.handoffs||[]).map(h=>h.id));return input.session?.threadId||'synthetic-thread'}
 started++;
 await new Promise<void>((_,reject)=>{const abort=()=>{cancelled++;reject(new Error('Cancelled for stage navigation'))};if(input.signal?.aborted)abort();else input.signal?.addEventListener('abort',abort,{once:true})});return '';
}});

await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});
const context=await browser.newContext({viewport:{width:1440,height:900}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
const floor=page.locator('.chat-stages button').nth(0),living=page.locator('.chat-stages button').nth(1);
async function switchWhileGuiding(target:'floorplan'|'living'){
 await expect(page.getByRole('button',{name:/^(取消|Cancel)$/,exact:true})).toBeVisible({timeout:30000});
 await expect.poll(()=>started-cancelled,{timeout:30000}).toBeGreaterThan(0);
 const before=cancelled;await (target==='floorplan'?floor:living).click();
 await expect(target==='floorplan'?floor:living).toHaveAttribute('aria-current','step',{timeout:30000});
 await expect.poll(()=>cancelled).toBeGreaterThan(before);
 assert.equal((await store.chatState(project.id)).active,target);
}
try{
 await page.goto(origin);await expect(floor).toHaveAttribute('aria-current','step');
 await switchWhileGuiding('living');checks.push('click living interrupts in-flight automatic floorplan guidance, waits for cancellation and switches');
 await switchWhileGuiding('floorplan');checks.push('click floorplan interrupts in-flight living guidance and resumes original conversation');
 await page.locator('header .language-switch select').selectOption('en');
 await switchWhileGuiding('living');checks.push('English navigation works while automatic guidance is streaming');
 await page.setViewportSize({width:390,height:844});await switchWhileGuiding('floorplan');checks.push('narrow English navigation remains clickable during streaming');
 await page.route('**/api/chat/guidance*',route=>route.fulfill({json:{needed:false}}));
 // Cancel the final automatic turn before checking a project whose building is not confirmed.
 await context.request.post(origin+'/api/chat/cancel',{data:{}});
 await expect(page.getByRole('button',{name:/^(取消|Cancel)$/,exact:true})).toHaveCount(0,{timeout:30000});
 let current=await store.get(project.id);await store.mutate(project.id,randomUUID(),current.revision,'synthetic-unconfirmed',{},p=>{delete p.confirmedBuilding;p.buildingState.status='idle'});
 await page.reload();await expect(living).toBeEnabled();await living.click();await expect(page.locator('.stage-navigation-notice')).toBeVisible();assert.equal((await store.chatState(project.id)).active,'floorplan');checks.push('unconfirmed building explains prerequisite visibly instead of a dead disabled tab');
 const after=await store.get(project.id);assert.equal(after.savedVersion,0);assert.deepEqual(errors,[]);assert.ok(started>=4);assert.ok(cancelled>=4);
 await page.screenshot({path:resolve(out,'navigation.png')});await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,errors,started,cancelled},null,2));console.log(JSON.stringify({out,checks,started,cancelled}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors,started,cancelled},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error}finally{await browser.close();await app.close();await store.close()}
