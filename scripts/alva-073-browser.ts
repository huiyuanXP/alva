/** Real main Agent + HTTP MCP in browser; all floorplan/household inputs are synthetic. */
import {createServer} from 'node:net';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {snapshotScene} from '../tests/fixtures/alva/snapshot.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA073-browser',out=resolve('evidence',run),root=resolve('.runtime',run);await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});
process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;assert.ok(process.env.OPENAI_API_KEY);process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('主动引导合成验收');await store.ensureAccessCode(project.id);
const port=await new Promise<number>(done=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const port=(s.address() as {port:number}).port;s.close(()=>done(port))})}),origin=`http://127.0.0.1:${port}`;
const app=await buildAlva(store,{assets:true,automaticRecommendations:false,origin});await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addInitScript('globalThis.__name = (v) => v');await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[],messages:unknown[]=[];page.on('pageerror',e=>errors.push(e.message));
const waitGuide=async(count:number)=>{
 await expect.poll(async()=>{const p=await store.get(project.id);return p.messages.length>count&&p.messages.at(-1)?.status!=='running'?p.messages.at(-1)?.status:''},{timeout:240000,intervals:[1500]}).toBe('completed');
 const p=await store.get(project.id),m=p.messages.at(-1)!;assert.ok(m.guidanceKey,JSON.stringify(m));assert.ok(m.toolCalls?.some(t=>t.name==='get_stage_guidance'&&!t.isError));await expect(page.getByRole('button',{name:'取消',exact:true})).toHaveCount(0,{timeout:30000});messages.push(m);await page.screenshot({path:resolve(out,`step-${checks.length}.png`)});return p;
};
const seed=async(fn:Parameters<AlvaStore['mutate']>[5])=>{const p=await store.get(project.id);await store.mutate(p.id,randomUUID(),p.revision,'synthetic-checkpoint',{},fn);await page.reload();return p.messages.length};
try{
 await page.goto(origin);let p=await waitGuide(0);assert.equal(p.messages.length,1);assert.equal(p.evidence.length,0);assert.match(p.messages[0].text,/户型规划专家/);assert.match(p.messages[0].text,/上传/);checks.push('first browser initialization → real floorplan Agent welcome + upload guidance without fake user evidence');
 const floorThread=(await store.chatState(p.id)).threads.floorplan.threadId;assert.ok(floorThread);await page.reload();await page.waitForTimeout(2000);assert.equal((await store.get(p.id)).messages.length,1);checks.push('reload reuses persisted checkpoint without duplicate welcome');
 p=await waitGuide(await seed(p=>{p.candidate=snapshotScene();p.candidate.calibration=null}));assert.match(p.messages.at(-1)!.text,/门|窗/);assert.match(p.messages.at(-1)!.text,/校准|长度/);assert.equal((await store.chatState(p.id)).threads.floorplan.threadId,floorThread);checks.push('resume original thread at wall/opening review and known-length calibration');
 // A real calibration API mutation triggers automatic inspection on next page resume.
 let response=await context.request.post(origin+'/api/candidate/calibrate',{data:{requestId:randomUUID(),expectedRevision:p.revision,wallId:'wall-0',length:5,source:'合成实测'}});assert.equal(response.status(),200);const before=p.messages.length;await page.reload();p=await waitGuide(before);assert.ok(p.messages.at(-1)!.toolCalls?.some(t=>t.name==='inspect_topology'&&!t.isError));checks.push('calibration → actual MCP topology self-inspection');
 const count=await seed(p=>{p.candidate!.walls.push({id:'isolated',a:{x:10,y:10},b:{x:11,y:10},thickness:.15,height:2.8,structural:'unknown',evidence:[]})});p=await waitGuide(count);assert.ok(p.messages.at(-1)!.toolCalls?.some(t=>t.name==='inspect_topology'&&!t.isError));assert.match(p.messages.at(-1)!.text,/孤立|断|墙/);checks.push('changed calibrated geometry is actually inspected and repair guidance replaces success claim');
 // Synthetic confirmed building exercises the existing gate; this is not a generation acceptance test.
 await seed(p=>{p.candidate=null;seedLivingStage(p)});
 await page.getByRole('button',{name:'生活设计',exact:true}).click();p=await waitGuide(p.messages.length);assert.equal((await store.chatState(p.id)).active,'living');assert.ok(p.messages.at(-1)!.toolCalls?.some(t=>t.name==='read_question_context'&&!t.isError));assert.ok(p.messages.at(-1)!.toolCalls?.some(t=>t.name==='ask_question'&&!t.isError));assert.equal(p.visionQuestions?.at(-1)?.questionId,'Q01a');await expect(page.getByTestId('vision-chat-question')).toBeVisible();checks.push('switch to living → actual questionnaire lookup, welcome and first visible question card');
 const livingThread=(await store.chatState(p.id)).threads.living.threadId;const oldCount=p.messages.length;
 await page.getByTestId('vision-chat-question').getByRole('button',{name:'暂不确定',exact:true}).click();p=await waitGuide(oldCount);assert.equal(p.homeVision?.responses[0].answers.Q01a.state,'unknown');assert.notEqual(p.visionQuestions?.at(-1)?.questionId,'Q01a');assert.ok(p.messages.at(-1)!.toolCalls?.some(t=>t.name==='read_question_context'&&!t.isError));checks.push('owner response automatically advances to an unfinished question and skips explicitly unknown Q01a');
 await page.getByRole('button',{name:'户型导入',exact:true}).click();p=await waitGuide(p.messages.length);assert.match(p.messages.at(-1)!.text,/生活设计/);assert.equal((await store.chatState(p.id)).threads.floorplan.threadId,floorThread);const cards=p.visionQuestions!.length;
 await page.getByRole('button',{name:'生活设计',exact:true}).click();p=await waitGuide(p.messages.length);assert.equal((await store.chatState(p.id)).threads.living.threadId,livingThread);assert.equal(p.visionQuestions!.length,cards);assert.doesNotMatch(p.messages.at(-1)!.text,/我是你的|欢迎来到/);checks.push('returning stages resumes both original threads and reuses pending next question without repeating completed work');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,errors,messages,floorThread,livingThread},null,2));console.log(JSON.stringify({out,checks}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors,messages,project:await store.get(project.id)},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error}finally{await browser.close();await app.close();await store.close()}
