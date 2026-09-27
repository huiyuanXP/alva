import {createServer} from 'node:net';
/** Actual main Chat → living HTTP MCP → batch candidates → browser decisions. */
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyAnswer} from '../api/business.js';
import {questionnaireChanges} from '../packages/contracts/alva/questionnaire-batch.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA077-real-chat',out=resolve(process.env.ALVA_ACCEPTANCE_DIR||resolve('.runtime','acceptance',run)),root=resolve(process.env.ALVA_ACCEPTANCE_DIR||resolve('.runtime','acceptance',run),'private');await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});
process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;assert.ok(process.env.OPENAI_API_KEY);process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('Batch questionnaire synthetic verification');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),0,'synthetic-building-and-answers',{},p=>{
 seedLivingStage(p);applyAnswer(p,{questionId:'Q01',roomId:null,text:'I want one small reading chair in the available corner of the living room. Keep the existing sofa. Suggest a catalogue chair around x=1,y=1 if that fits.',state:'answered',confirmed:true,locked:false});
 p.homeVision={version:'home-vision-v4',responses:[{id:randomUUID(),name:'Alex (synthetic)',version:1,updatedAt:new Date().toISOString(),cursor:'Q01',answers:{Q01a:{state:'answered',value:'Q01a.refresh'},Q07b:{state:'answered',value:'I prefer calm green fabric for the reading chair; avoid bright red.'}}}]};
});
const port=await new Promise<number>(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const p=(server.address() as {port:number}).port;server.close(()=>done(p))})}),origin='http://127.0.0.1:'+port;
const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin);await page.locator('header .language-switch select').selectOption('en');await expect(page.getByTestId('send-questionnaire')).toBeEnabled();
 await page.getByRole('button',{name:'Your Home Vision',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
 const refresh=dialog.getByRole('radio',{name:/Giving my current home a new style/}),exploring=dialog.getByRole('radio',{name:/Exploring my design ideas/});await exploring.click();await refresh.click();await exploring.click();await refresh.click();
 await dialog.getByRole('button',{name:'Save and close questionnaire'}).click();await expect(dialog).toHaveCount(0);await page.waitForTimeout(1200);let p=await store.get(project.id);assert.equal(p.messages.length,0);assert.ok(questionnaireChanges(p)>=3);checks.push('rapid questionnaire choices save and close at any time without starting Chat');
 const before=JSON.stringify(p.scene);await page.getByTestId('send-questionnaire').click();await expect.poll(async()=>{const p=await store.get(project.id);return p.questionnaireDelivery?.status},{timeout:600000,intervals:[1500]}).toBe('completed');
 p=await store.get(project.id);const message=p.messages.at(-1)!;assert.equal(message.status,'completed');assert.ok(message.toolCalls?.some(t=>t.name==='read_questionnaire_batch'&&!t.isError),JSON.stringify(message));assert.ok(message.toolCalls?.some(t=>t.name==='suggest_furniture'&&!t.isError),JSON.stringify(message));assert.equal(questionnaireChanges(p),0);assert.equal(JSON.stringify(p.scene),before);assert.equal(p.messages.filter(m=>m.role==='user').length,1);checks.push('one owner click invokes real main Agent, reads multi-answer batch via living MCP and generates once without adopting');
 const card=page.locator('.conversation-cards article.proposal');await expect(card).toHaveCount(1);await expect(card.locator('[data-testid="scene-view"] canvas')).toHaveCount(1);await expect(card.getByTestId('sunlight-readout')).toHaveCount(0);await page.screenshot({path:resolve(out,'candidate.png')});checks.push('actual candidate preview renders with no Solar time overlay');
 const first=p.proposals.find(p=>p.status==='proposed')!.id;await card.getByRole('button',{name:'Close without applying'}).click();await expect.poll(async()=>(await store.get(project.id)).proposals.find(p=>p.id===first)?.status).toBe('rejected');p=await store.get(project.id);assert.equal(JSON.stringify(p.scene),before);await page.reload();await expect(page.getByTestId('send-questionnaire')).toBeDisabled();checks.push('close is persisted rejection with no design mutation; refresh keeps sent batch consumed');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,errors,toolCalls:message.toolCalls,proposalCount:p.proposals.length,thread:(await store.chatState(project.id)).threads.living.threadId},null,2));console.log(JSON.stringify({out,checks}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors,messages:(await store.get(project.id)).messages},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error}finally{await browser.close();await app.close();await store.close()}
