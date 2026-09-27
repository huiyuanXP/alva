import {createServer} from 'node:net';
/** Browser regression on a synthetic project; real rendering, deterministic model replies. */
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyAnswer} from '../api/business.js';
import {publishProposals} from '../api/furniture/proposal-decisions.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA077-browser',out=resolve('evidence',run);await mkdir(out,{recursive:true});process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore();await store.init();const {project}=await store.create('Questionnaire batches');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);applyAnswer(p,{questionId:'Q01',roomId:null,text:'Reading chair',state:'answered',confirmed:true,locked:false})});
let calls=0;let release:(()=>void)|undefined;
const port=await new Promise<number>(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const p=(server.address() as {port:number}).port;server.close(()=>done(p))})}),origin='http://127.0.0.1:'+port;
const app=await buildAlva(store,{origin,assets:true,chatCodex:async input=>{
 calls++;if(calls===2)await new Promise<void>(done=>{release=done});
 const call=async(name:string,args={})=>input.tools!.find(t=>t.name===name)!.run(args) as Promise<any>;
 await call('read_questionnaire_batch');const snapshot=await call('get_snapshot');
 await call('suggest_furniture',{expectedRevision:snapshot.project.revision,roomIds:['room'],variants:[1,4].map((x,i)=>({title:'Reading option '+(i+1),rationale:'Combined questionnaire preferences',changes:[{action:'add',targetId:'room',values:{assetId:'alva-chair',roomId:'room',x,y:1}}]}))});return 'Two proposals ready';
}});await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
const cards=page.locator('.conversation-cards article.proposal'),batch=page.getByTestId('send-questionnaire');
try{
 await page.goto(origin);await expect(batch).toBeEnabled();await page.waitForTimeout(1500);assert.equal(calls,0);checks.push('saved questionnaire and page reload do not automatically call Chat');
 await batch.click();await expect.poll(async()=>(await store.get(project.id)).questionnaireDelivery?.status,{timeout:30000}).toBe('completed');await expect(cards).toHaveCount(1);await expect(cards.locator('h3')).toHaveText('Reading option 1');await expect(cards.locator('.sunlight-readout')).toHaveCount(0);assert.equal(await cards.locator('[data-testid="scene-view"] canvas').count(),1);checks.push('one explicit send makes one batch; one visible card with unobscured real 3D preview');
 await page.locator('header .language-switch select').selectOption('en');await expect(batch).toHaveText('Send questionnaire changes to Chat');await expect(cards.getByRole('button',{name:'Close without applying'})).toBeEnabled();
 await cards.getByRole('button',{name:'Close without applying'}).click();await expect(cards.locator('h3')).toHaveText('Reading option 2');checks.push('English close means reject and reveals the next card');
 await store.mutate(project.id,randomUUID(),null,'next-answers',{},p=>applyAnswer(p,{questionId:'Q01',roomId:null,text:'A quiet reading chair',state:'answered',confirmed:true,locked:false}));await page.reload();await expect(batch).toBeEnabled();await batch.click();await expect.poll(()=>!!release).toBe(true);
 await cards.getByRole('button',{name:'Close without applying'}).click();await expect(cards).toHaveCount(0);checks.push('dismiss remains usable while Chat is generating');release!();await expect.poll(async()=>(await store.get(project.id)).questionnaireDelivery?.status,{timeout:30000}).toBe('completed');await expect(cards).toHaveCount(1);
 let p=await store.get(project.id);const old=p.proposals.filter(x=>x.status==='proposed').map(x=>x.id);
 await store.mutate(project.id,randomUUID(),null,'new-decision',{},p=>publishProposals(p,[{...structuredClone(p.proposals.at(-1)!),id:randomUUID(),title:'Latest decision',changes:[{action:'update',targetId:'missing',values:{x:3}}],status:'proposed'}],'new-turn'));
 await page.reload();await expect(cards.locator('h3')).toHaveText('Latest decision');await expect(cards.locator('[role="alert"]')).toBeVisible();await cards.getByRole('button',{name:'Close without applying'}).click();await expect(cards).toHaveCount(0);p=await store.get(project.id);assert.ok(old.every(id=>p.proposals.find(x=>x.id===id)!.status==='rejected'));checks.push('new decision replaces old queue; preview errors do not prevent dismiss');
 await page.setViewportSize({width:390,height:844});await expect(batch).toBeVisible();await page.screenshot({path:resolve(out,'mobile.png')});assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,calls,errors},null,2));console.log(JSON.stringify({out,checks}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error}finally{release?.();await browser.close();await app.close();await store.close()}
