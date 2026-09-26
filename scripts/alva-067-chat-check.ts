import {chromium,expect} from '@playwright/test';
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
const dir='evidence/'+new Date().toISOString().replace(/[:.]/g,'')+'-ALVA067-chat-'+randomUUID().slice(0,6);
await mkdir(dir,{recursive:true});
process.env.ALVA_ACCESS_CODE='alva067-synthetic-validation-code';
const store=new AlvaStore();await store.init();const {project}=await store.create('Synthetic chat feedback');await store.ensureAccessCode(project.id);
let advance:()=>void=()=>{},mode='success',requestedModel='';
const gate=()=>new Promise<void>(resolve=>{advance=resolve});
const probe=createServer();await new Promise<void>(resolve=>probe.listen(0,'127.0.0.1',resolve));const reserved=probe.address();assert.ok(reserved&&typeof reserved!=='string');const port=reserved.port;await new Promise<void>((resolve,reject)=>probe.close(e=>e?reject(e):resolve()));const origin='http://127.0.0.1:'+port;
const app=await buildAlva(store,{origin,chatCodex:async input=>{
 requestedModel=input.model||'';
 const cancelled=new Promise<never>((_,reject)=>input.signal?.addEventListener('abort',()=>reject(new Error('已取消')),{once:true}));
 await Promise.race([gate(),cancelled]);
 input.onEvent?.({method:'item/tool/call'});
 await Promise.race([gate(),cancelled]);
 if(mode==='failure')throw new Error('Synthetic provider failure');
 input.onDelta?.('已读取资料。');
 await Promise.race([gate(),cancelled]);
 return '已读取资料。';
}});
await app.listen({host:'127.0.0.1',port});
const address=app.server.address();assert.ok(address&&typeof address!=='string');

const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const session=await store.issueInternalSession(project.id);await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}]);
const page=await context.newPage(),errors:string[]=[],checks:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(origin);await expect(page.getByLabel('咨询模型')).toHaveValue('gemini-3.8-flash-high');
 const progress=page.locator('.message.assistant .chat-progress');
 const send=async()=>{await page.getByLabel('咨询消息').fill('请读取项目资料');await page.getByRole('button',{name:'发送 ↑',exact:true}).click();await expect(progress).toHaveText('正在思考…')};
 await send();assert.equal(requestedModel,'gemini-3.8-flash-high');await expect(page.locator('.status.banner')).toHaveCount(0);
 await page.screenshot({path:dir+'/thinking.png'});
 advance();await expect(progress).toHaveText('正在核对项目资料与建议范围…');await expect(progress).toHaveCount(1);await expect(page.getByText('正在思考…',{exact:true})).toHaveCount(0);
 assert.equal(await progress.evaluate(e=>e.nextElementSibling!==null),true);
 await page.screenshot({path:dir+'/tool-progress.png'});checks.push('new model selected; one muted status above existing loading content; no top banner; previous status replaced');
 advance();await expect(page.locator('.message.assistant').last()).toContainText('已读取资料。');await expect(progress).toBeVisible();advance();await expect(progress).toHaveCount(0);checks.push('streaming keeps progress; completion clears it');
 mode='failure';await send();advance();await expect(progress).toHaveText('正在核对项目资料与建议范围…');advance();await expect(progress).toHaveCount(0);await expect(page.getByLabel('咨询消息')).toHaveValue('请读取项目资料');checks.push('failure clears progress and retains draft');
 mode='cancel';await send();await page.getByRole('button',{name:'取消',exact:true}).click();await expect(progress).toHaveCount(0);checks.push('cancel clears progress');
 await page.setViewportSize({width:390,height:844});mode='success';await send();advance();await expect(progress).toHaveText('正在核对项目资料与建议范围…');await page.screenshot({path:dir+'/mobile-progress.png'});assert.ok(await progress.evaluate(e=>e.scrollWidth<=e.clientWidth+1));advance();await expect(page.locator('.message.assistant').last()).toContainText('已读取资料。');advance();await expect(progress).toHaveCount(0);checks.push('mobile progress fits chat');
 assert.deepEqual(errors,[]);await writeFile(dir+'/result.json',JSON.stringify({ok:true,checks,errors},null,2));console.log(JSON.stringify({ok:true,dir,checks}));
} catch(e){await page.screenshot({path:dir+'/failure.png'});await writeFile(dir+'/result.json',JSON.stringify({ok:false,error:String(e),checks,errors},null,2));throw e}
finally{await browser.close();await app.close();await store.close()}
