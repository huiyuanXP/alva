/** Real model and browser acceptance for living tools, using an explicitly synthetic building prerequisite. */
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-living-browser-'+randomUUID().slice(0,6);
const root=resolve('.runtime',run),evidence=resolve('evidence',run);await mkdir(root,{recursive:true,mode:0o700});await mkdir(evidence,{recursive:true});
process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;assert.ok(process.env.OPENAI_API_KEY,'Authorized model environment required');
process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_DATA_DIR=resolve(root,'data');process.env.ALVA_UPLOAD_DIR=resolve(root,'uploads');
const store=new AlvaStore(resolve(root,'db'));await store.init();const {project}=await store.create('ALVA-066 synthetic living acceptance');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),0,'synthetic-prerequisite',{},seedLivingStage);
const probe=createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const address=probe.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>((r,j)=>probe.close(e=>e?j(e):r()));const origin=`http://127.0.0.1:${port}`;process.env.ALVA_PORT=String(port);const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});
let browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});let page=await browser.newPage({viewport:{width:1280,height:800}});const errors:string[]=[],checks:Record<string,unknown>={syntheticBuildingPrerequisite:true,realVisionAcceptance:false};page.on('pageerror',e=>errors.push(e.message));
page.setDefaultTimeout(20_000);page.setDefaultNavigationTimeout(30_000);
const access=await store.issueInternalSession(project.id);await page.context().addCookies([{name:'alva_session',value:access.token,url:origin,httpOnly:true,sameSite:'Strict'}]);
async function chat(text:string,names:string[]){
 console.log('browser: model turn',names.join(','));const before=(await store.get(project.id)).messages.length;
 const browserTurn=names.includes('set_view');
 if(browserTurn){await page.getByLabel('咨询消息').fill(text);const responsePromise=page.waitForResponse(r=>r.url().endsWith('/api/chat')&&r.request().method()==='POST',{timeout:150_000});await page.getByRole('button',{name:'发送 ↑',exact:true}).click();const response=await responsePromise;assert.equal(response.status(),200,await response.text())}
 else{await browser.close();const current=await store.get(project.id);const response=await fetch(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',cookie:`alva_session=${access.token}`,origin},body:JSON.stringify({requestId:randomUUID(),expectedRevision:current.revision,text,roomId:null,model:'gemini-3.1-flash-lite'}),signal:AbortSignal.timeout(150_000)});const body=await response.text();assert.equal(response.status,200,body);assert.ok(body.includes('event: done'),body);browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(20_000);page.on('pageerror',e=>errors.push(e.message));await page.context().addCookies([{name:'alva_session',value:access.token,url:origin,httpOnly:true,sameSite:'Strict'}]);await page.goto(origin);await page.getByLabel('咨询消息').waitFor()}

 const deadline=Date.now()+150_000;let p=await store.get(project.id);
 while(Date.now()<deadline){await page.waitForTimeout(500);p=await store.get(project.id);if(p.messages.slice(before).some(m=>m.role==='assistant'&&['completed','failed','cancelled'].includes(m.status)))break}
 const messages=p.messages.slice(before),assistant=messages.find(m=>m.role==='assistant');await writeFile(resolve(root,`turn-${before}.json`),JSON.stringify(messages,null,2));
 assert.equal(assistant?.status,'completed',assistant?.text);for(const name of names)assert.ok(assistant?.toolCalls?.some(t=>t.name===name&&!t.isError),`Missing successful real MCP call ${name}: ${assistant?.text}`);
 await page.getByRole('button',{name:'发送 ↑',exact:true}).waitFor({state:'visible'});return p;
}
try{
 console.log('browser: loading project');await page.goto(origin);await writeFile(resolve(root,'initial-page.txt'),await page.locator('body').innerText());await page.getByLabel('咨询消息').waitFor();
 let p=await chat('请实际调用工具将预览切换到三维，等待页面回执。然后为 room 房间提出一个温暖简约样式候选：墙面 #e8dcc8，paint；地面 #a87b51，wood。先读取最新快照，用实际 revision。不要确认采用，不改几何。',['set_view','propose_room_style']);
 assert.equal(p.roomStyles?.room,undefined);assert.equal(p.roomStyleCandidates?.filter(c=>c.status==='pending').length,1);checks.realUiReceipt=true;
 const geometry=JSON.stringify(p.scene),card=page.locator('[data-style-candidate]').first();await card.getByRole('button',{name:'在画面预览'}).click();await page.screenshot({path:resolve(evidence,'style-preview-3d.png')});await card.getByRole('button',{name:'确认采用样式'}).click();
 await page.waitForFunction(()=>!document.querySelector('[data-style-candidate]'));p=await store.get(project.id);assert.equal(p.roomStyles?.room.floor.color,'#a87b51');assert.equal(JSON.stringify(p.scene),geometry);checks.styleConfirmedWithoutGeometryChange=true;await writeFile(resolve(evidence,'checkpoint.json'),JSON.stringify({run,checks},null,2));
 p=await chat('我的生活习惯是每天晚上在客厅阅读半小时。请读取最新快照，引用我这句话对应的真实 evidence ID，用 propose_user_context 把这句话分类为 habits 的待确认条目，只提出这一条。',['propose_user_context']);
 assert.equal(p.userContextEntries?.at(-1)?.status,'pending');await page.getByRole('button',{name:'确认分类',exact:true}).click();await page.getByRole('button',{name:'确认分类',exact:true}).waitFor({state:'hidden'});
 p=await chat('请使用 read_user_context 实际读取已确认分类的 Markdown，再 run_layout_review 复核当前布局，最后 request_save 提出保存确认卡。不要调用其他变更工具，不要替我确认。',['read_user_context','run_layout_review','request_save']);
 assert.ok(p.layoutReview);const action=page.locator('[data-action-kind="save_design"]');await action.waitFor();await action.getByRole('button',{name:/确认/}).click();
 const deadline=Date.now()+10_000;while(Date.now()<deadline){p=await store.get(project.id);if(p.savedVersion)break;await page.waitForTimeout(100)}assert.equal(p.savedVersion,1);assert.ok(p.layoutReviewAdoption);checks.realContextReviewSave=true;
 await page.reload();await page.getByLabel('咨询消息').waitFor();p=await store.get(project.id);assert.equal(p.roomStyles?.room.floor.color,'#a87b51');assert.equal(p.userContextEntries?.at(-1)?.status,'confirmed');checks.reread=true;
 const state=await store.chatState(project.id);assert.ok(state.threads.living.threadId);assert.deepEqual(errors,[]);await page.screenshot({path:resolve(evidence,'saved-living.png')});
 await writeFile(resolve(evidence,'result.json'),JSON.stringify({pass:true,run,checks,errors,toolCalls:p.messages.flatMap(m=>m.toolCalls||[]),threadId:state.threads.living.threadId},null,2));console.log(JSON.stringify({pass:true,run,checks}));
}catch(error){await page.screenshot({path:resolve(evidence,'failure.png'),timeout:5000}).catch(()=>{});await writeFile(resolve(evidence,'result.json'),JSON.stringify({pass:false,run,checks,errors,error:String(error)},null,2));throw error}
finally{await browser.close();await app.close();await store.close()}
