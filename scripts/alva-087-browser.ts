import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
import {createVisionQuestionTools} from '../api/consultation/vision-questions.js';
import {visionQuestionInput} from '../tests/fixtures/alva/vision-question.js';
import {questionnaireChanges} from '../packages/contracts/alva/questionnaire-batch.js';
import type {VisionQuestion} from '../packages/contracts/alva/home-vision/chat.js';
const real=process.argv.includes('--real'),out=resolve(process.env.ALVA_ACCEPTANCE_DIR!),root=resolve(out,'private');await mkdir(root,{recursive:true});
process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('Chat concurrency synthetic home');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),0,'seed',{},async p=>{seedLivingStage(p);const messageId=randomUUID();p.messages.push({id:messageId,role:'user',text:'喜欢浅木色，但不喜欢每天擦柜子',status:'completed',stage:'living',createdAt:new Date().toISOString()});const queued:VisionQuestion[]=[];const tools=createVisionQuestionTools({readProject:async()=>p,sourceMessageId:messageId,roomId:null,queue:c=>queued.push(c)});await tools.find(t=>t.name==='ask_question')!.run(visionQuestionInput(messageId));p.visionQuestions=queued;});
let release=()=>{},calls=0;const gate=new Promise<void>(ok=>{release=ok});
const port=await new Promise<number>(done=>{const server=createServer();server.listen(0,'127.0.0.1',()=>{const p=(server.address() as any).port;server.close(()=>done(p))})}),origin='http://127.0.0.1:'+port;
const app=await buildAlva(store,{origin,assets:true,...(real?{}:{chatCodex:async(input:any)=>{calls++;const call=async(name:string,args={})=>input.tools.find((t:any)=>t.name===name).run(args);if(calls===1){await call('propose_changes',{variants:[{title:'Move table to destination',rationale:'Absolute position',changes:[{action:'update',targetId:'table',values:{x:3,y:2}}]}]});await gate;}else{await call('read_questionnaire_batch');await call('skip_furniture_suggestion',{reason:'No additional furniture requested.'})}return 'Ready for your confirmation.';}})});await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu','--single-process','--no-zygote']});const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin);await page.locator('header .language-switch select').selectOption('en');const sidebar=page.getByRole('complementary',{name:'Home Vision questionnaire'});await expect(sidebar.getByTestId('vision-chat-question')).toBeVisible();
 const before=(await store.get(project.id)).messages.filter(m=>m.role==='user').length;
 await page.locator('.composer textarea').fill('Move only furniture instance table to absolute x=3m and y=2m. Use get_furniture_context then propose_changes with update targetId table values x:3,y:2. Keep other properties. This is a precise single-object request; no new questionnaire or scope is needed.');await page.locator('.composer-actions > button').last().click();
 await expect.poll(async()=>(await store.get(project.id)).messages.at(-1)?.status).toBe('running');
 await expect(sidebar.locator('.hv-opt').first()).toBeEnabled();await sidebar.locator('.hv-opt').first().click();
 await expect(page.locator('header .language-switch select')).toBeEnabled();
 // A real user drag while the Chat stream is active.
 const item=page.getByTestId('plan-item-table'),box=await item.boundingBox();assert.ok(box);await page.mouse.move(box.x+box.width/2,box.y+box.height-2);await page.mouse.down();await page.mouse.move(box.x+box.width/2-35,box.y+box.height-2,{steps:5});await page.mouse.up();
 await expect.poll(async()=>(await store.get(project.id)).scene!.items[0].x).not.toBe(2);checks.push('Chat running: questionnaire, language switch and furniture drag remain usable');
 await sidebar.getByTestId('vision-section-next').click();await expect.poll(async()=>(await store.get(project.id)).visionQuestions![0].status).toBe('confirmed');
 assert.equal((await store.get(project.id)).messages.filter(m=>m.role==='user').length,before+1);assert.ok(questionnaireChanges(await store.get(project.id))>0);
 await expect(page.getByTestId('send-questionnaire')).toBeVisible();await expect(page.getByTestId('send-questionnaire')).toBeDisabled();checks.push('section Submit during Chat persists answers without starting or cancelling another turn; send button remains visible');
 if(!real){await expect(sidebar.locator('.hv-embedded')).toBeVisible();for(let i=0;i<4;i++){const end=await sidebar.getByRole('button',{name:'Submit',exact:true}).count()>0;await sidebar.getByRole('button',{name:'Skip for now',exact:true}).click();if(end)break}await sidebar.getByRole('button',{name:'Submit',exact:true}).click();assert.equal((await store.get(project.id)).messages.filter(m=>m.role==='user').length,before+1);await expect(page.getByTestId('send-questionnaire')).toBeDisabled();checks.push('native questionnaire also advances and saves a whole section during Chat without sending another turn')}
 release();await expect.poll(async()=>(await store.get(project.id)).messages.at(-1)?.status,{timeout:600000,intervals:[1000]}).toBe('completed');
 let p=await store.get(project.id);assert.equal(p.messages.filter(m=>m.role==='user').length,before+1);assert.ok(p.messages.at(-1)!.toolCalls!.some(t=>t.name==='propose_changes'&&!t.isError));assert.equal(p.proposals.filter(p=>p.status==='proposed').length,1);
 await page.getByRole('dialog',{name:'Your Room Vision'}).getByRole('button',{name:'Confirm checked scope only'}).click();await expect.poll(async()=>(await store.get(project.id)).scene!.items[0].x).toBe(3);checks.push('main Chat MCP candidate survives the concurrent drag; confirmation moves the latest item to x=3');
 await expect(page.getByTestId('send-questionnaire')).toBeEnabled();await page.waitForTimeout(1500);assert.equal((await store.get(project.id)).messages.filter(m=>m.role==='user').length,before+1);
 await page.getByTestId('send-questionnaire').click();await expect.poll(async()=>(await store.get(project.id)).questionnaireDelivery?.status,{timeout:600000,intervals:[1000]}).toBe('completed');p=await store.get(project.id);assert.equal(p.messages.filter(m=>m.role==='user').length,before+2);assert.equal(questionnaireChanges(p),0);assert.ok(p.messages.at(-1)!.toolCalls!.some(t=>t.name==='read_questionnaire_batch'&&!t.isError));checks.push('idle alone sends nothing; explicit button starts exactly one questionnaire batch through MCP');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({real,checks,errors,toolCalls:p.messages.filter(m=>m.role==='assistant').map(m=>m.toolCalls)},null,2));console.log(JSON.stringify({out,checks}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors,project:await store.get(project.id)},null,2));throw error}finally{release();await browser.close();await app.close();await store.close()}
