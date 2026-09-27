/** Actual main Chat + HTTP MCP after user-driven stage navigation. Synthetic project only. */
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {randomUUID,randomBytes} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA076-real-chat',out=resolve('evidence',run),root=resolve('.runtime',run);await mkdir(out,{recursive:true});await mkdir(root,{recursive:true});
process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;assert.ok(process.env.OPENAI_API_KEY);process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('阶段导航真实Chat合成验收');await store.ensureAccessCode(project.id);await store.chatState(project.id);
await store.mutate(project.id,randomUUID(),project.revision,'synthetic-building',{},p=>seedLivingStage(p));
await store.updateChatState(project.id,state=>{state.active='floorplan'});
const port=await new Promise<number>(done=>{const s=createServer();s.listen(0,'127.0.0.1',()=>{const port=(s.address() as {port:number}).port;s.close(()=>done(port))})}),origin=`http://127.0.0.1:${port}`;
const app=await buildAlva(store,{assets:true,automaticRecommendations:false,origin});await app.listen({host:'127.0.0.1',port});const auth=await store.issueInternalSession(project.id);
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});const context=await browser.newContext({viewport:{width:1280,height:900}});await context.addCookies([{name:'alva_session',value:auth.token,url:origin}]);const page=await context.newPage(),checks:string[]=[],errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
// Explicit user messages exercise the real Agent; suppress only unsolicited automatic guidance.
await page.route('**/api/chat/guidance*',r=>r.fulfill({json:{needed:false}}));
async function send(text:string,tool:string){const before=(await store.get(project.id)).messages.length;await page.getByRole('textbox',{name:'咨询消息'}).fill(text);await page.getByRole('button',{name:'发送 ↑',exact:true}).click();await expect.poll(async()=>{const p=await store.get(project.id);return p.messages.length>before?p.messages.at(-1)?.status:''},{timeout:240000,intervals:[1000]}).toBe('completed');await expect(page.getByRole('button',{name:'取消',exact:true})).toHaveCount(0);const p=await store.get(project.id),m=p.messages.at(-1)!;assert.ok(m.toolCalls?.some(t=>t.name===tool&&!t.isError),JSON.stringify(m));return m}
try{
 await page.goto(origin);await expect(page.getByRole('button',{name:'户型导入',exact:true})).toHaveAttribute('aria-current','step');const floorMessage=await send('请实际读取当前阶段断点，简短说明现在的下一步，不修改任何设计。','get_stage_guidance');assert.equal(floorMessage.stage,'floorplan');const floorThread=(await store.chatState(project.id)).threads.floorplan.threadId;assert.ok(floorThread);checks.push('floorplan main Chat actually calls current-stage MCP');
 await page.getByRole('button',{name:'进入生活设计 →',exact:true}).click();await expect(page.getByRole('button',{name:'生活设计',exact:true})).toHaveAttribute('aria-current','step',{timeout:90000});const livingMessage=await send('请实际读取生活问卷当前进度，简短告诉我哪些信息还没填，不生成或修改家具。','read_question_context');assert.equal(livingMessage.stage,'living');const livingThread=(await store.chatState(project.id)).threads.living.threadId;assert.ok(livingThread);assert.notEqual(livingThread,floorThread);checks.push('right stage entry → living transcript and real living questionnaire MCP');
 await page.getByRole('button',{name:'户型导入',exact:true}).click();await expect(page.getByRole('button',{name:'户型导入',exact:true})).toHaveAttribute('aria-current','step',{timeout:90000});assert.equal((await store.chatState(project.id)).threads.floorplan.threadId,floorThread);await expect(page.locator('.message.assistant')).toHaveCount((await store.get(project.id)).messages.filter(m=>m.role==='assistant'&&m.stage==='floorplan').length);checks.push('left return resumes original floorplan thread and history');
 await page.getByRole('button',{name:'生活设计',exact:true}).click();await expect(page.getByRole('button',{name:'生活设计',exact:true})).toHaveAttribute('aria-current','step',{timeout:90000});assert.equal((await store.chatState(project.id)).threads.living.threadId,livingThread);await page.reload();await expect(page.getByRole('button',{name:'生活设计',exact:true})).toHaveAttribute('aria-current','step');checks.push('left living return and reload retain living thread');
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,errors,floorThread,livingThread,messages:(await store.get(project.id)).messages},null,2));console.log(JSON.stringify({out,checks}));
}catch(error){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(error),checks,errors},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw error}finally{await browser.close();await app.close();await store.close()}
