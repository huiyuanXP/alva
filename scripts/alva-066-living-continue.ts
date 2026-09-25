/** Continue the same synthetic isolated project across bounded fresh processes. */
import assert from 'node:assert/strict';
import {resolve,basename} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
const root=resolve(process.argv[2]||''),step=process.argv[3];assert.ok(root.startsWith(resolve('.runtime')+'/')&&basename(root).includes('-ALVA066-living-browser-'));
assert.ok(['context-model','context-confirm','review-model','save-confirm','render-stability'].includes(step));
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-'+step;const out=resolve('evidence',run);await mkdir(out,{recursive:true});
process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_DATA_DIR=resolve(root,'data');process.env.ALVA_UPLOAD_DIR=resolve(root,'uploads');process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;
const store=new AlvaStore(resolve(root,'db'));await store.init();const row=(await store.db.query<{id:string}>('SELECT id FROM alva_projects')).rows;assert.equal(row.length,1);const id=row[0].id;assert.equal((await store.get(id)).name,'ALVA-066 synthetic living acceptance');
const probe=createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const address=probe.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>((r,j)=>probe.close(e=>e?j(e):r()));const origin=`http://127.0.0.1:${port}`;
const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});const access=await store.issueInternalSession(id);let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 if(step.endsWith('model')){
  assert.ok(process.env.OPENAI_API_KEY);const p=await store.get(id),before=p.messages.length;
  const text=step==='context-model'?'我的生活习惯是每天晚上在客厅阅读半小时。请读取最新快照，引用我这句话对应的真实 evidence ID，用 propose_user_context 把这句话分类为 habits 的待确认条目，只提出这一条。':'请使用 read_user_context 实际读取已确认分类的 Markdown，再 run_layout_review 复核当前布局，最后 request_save 提出保存确认卡。不要调用其他变更工具，不要替我确认。';
  const response=await fetch(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',cookie:`alva_session=${access.token}`,origin},body:JSON.stringify({requestId:randomUUID(),expectedRevision:p.revision,text,roomId:null,model:'gemini-3.1-flash-lite'}),signal:AbortSignal.timeout(150_000)});const body=await response.text();await writeFile(resolve(root,run+'-sse.txt'),body);assert.equal(response.status,200);assert.ok(body.includes('event: done'));
  const latest=await store.get(id),assistant=latest.messages.slice(before).find(m=>m.role==='assistant');assert.ok(assistant);assert.equal(assistant.status,'completed',assistant.text);
  const names=step==='context-model'?['propose_user_context']:['read_user_context','run_layout_review','request_save'];for(const name of names)assert.ok(assistant.toolCalls?.some(t=>t.name===name&&!t.isError),`missing ${name}: ${assistant.text}`);
  await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,run,step,projectId:id,threadId:(await store.chatState(id)).threads.living.threadId,toolCalls:assistant.toolCalls,continuedFrom:basename(root)},null,2));
 }else{
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(20_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.context().addCookies([{name:'alva_session',value:access.token,url:origin,httpOnly:true,sameSite:'Strict'}]);await page.goto(origin);await page.getByLabel('咨询消息').waitFor();
  if(step==='render-stability'){
   await page.getByRole('button',{name:'全屋',exact:true}).click();await page.waitForFunction(()=>!!(document.querySelector('[data-testid="building-canvas"]') as any)?.alvaView);
   await page.evaluate(()=>{const view=(document.querySelector('[data-testid="building-canvas"]') as any).alvaView;(window as any).alvaAcceptanceRenderer=view.renderer;view.camera.position.set(8,9,10);view.controls.target.set(2,0,2);view.controls.update()});
   for(let i=0;i<12;i++){await page.getByLabel('咨询消息').fill('输入中的咨询文字 '+i);await page.waitForTimeout(50);assert.equal(await page.evaluate(()=>(document.querySelector('[data-testid="building-canvas"]') as any).alvaView.renderer===(window as any).alvaAcceptanceRenderer),true,'Typing must preserve the renderer and camera')}
  }else if(step==='context-confirm'){await page.getByRole('button',{name:'确认分类',exact:true}).last().click();await page.getByRole('button',{name:'确认分类',exact:true}).waitFor({state:'hidden'});assert.ok((await store.get(id)).userContextEntries?.some(e=>e.status==='confirmed'))}
  else{const action=page.locator('[data-action-kind="save_design"]');await action.getByRole('button',{name:/确认/}).click();const deadline=Date.now()+10_000;let p=await store.get(id);while(!p.savedVersion&&Date.now()<deadline){await page.waitForTimeout(100);p=await store.get(id)}assert.equal(p.savedVersion,1);assert.ok(p.layoutReviewAdoption);await page.reload();await page.getByLabel('咨询消息').waitFor();assert.equal((await store.get(id)).roomStyles?.room.floor.color,'#a87b51')}
  assert.deepEqual(errors,[]);await page.screenshot({path:resolve(out,step+'.png')});const p=await store.get(id);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,run,step,projectId:id,continuedFrom:basename(root),savedVersion:p.savedVersion,adoption:p.layoutReviewAdoption,errors},null,2));
 }
 console.log(JSON.stringify({pass:true,run,step}));
}catch(error){await writeFile(resolve(out,'result.json'),JSON.stringify({pass:false,run,step,error:String(error),continuedFrom:basename(root)},null,2));throw error}
finally{await browser?.close();await app.close();await store.close()}
