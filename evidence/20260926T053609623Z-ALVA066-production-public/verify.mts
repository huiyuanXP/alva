import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const origin='https://prod.huiyuanxp.com',run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-production-public',out='evidence/'+run;await mkdir(out,{recursive:true});
const result:Record<string,unknown>={run,origin,pass:false};
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-extensions','--use-angle=swiftshader','--enable-unsafe-swiftshader']});const page=await browser.newPage({viewport:{width:1280,height:900}});const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const h=await page.goto(origin+'/healthz');assert.equal(h?.status(),200);await page.goto(origin);
 const assets=await page.locator('script[type="module"],link[rel="stylesheet"]').evaluateAll(es=>es.map(e=>e.getAttribute('src')||e.getAttribute('href')||'').filter(x=>x.startsWith('/assets/')));assert.equal(assets.length,2);result.assets={};
 for(const a of assets){assert.match(a,/^\/assets\/[\w.-]+\.(js|css)$/);const remote=await page.evaluate(async url=>{const r=await fetch(url),buffer=await r.arrayBuffer(),digest=await crypto.subtle.digest('SHA-256',buffer),text=new TextDecoder().decode(buffer);return {status:r.status,sha256:Array.from(new Uint8Array(digest)).map(x=>x.toString(16).padStart(2,'0')).join(''),stages:text.includes('/chat/stages'),progress:text.includes('chat-progress')}},a);assert.equal(remote.status,200);const local=await readFile('web/dist'+a);assert.equal(remote.sha256,createHash('sha256').update(local).digest('hex'));(result.assets as any)[a]=remote.sha256;if(a.endsWith('.js')){assert.ok(remote.stages);assert.ok(remote.progress)}}
 assert.equal(await page.evaluate(async()=>(await fetch('/api/chat/stages')).status),401);result.unauthenticatedStages=401;
 if(process.argv[2]){
 const code=(await readFile(process.argv[2],'utf8')).trim();await page.getByLabel('统一验证码').fill(code);const logged=page.waitForResponse(r=>r.url().endsWith('/api/access')&&r.request().method()==='POST');await page.getByRole('button',{name:'验证并进入 →'}).click();assert.equal((await logged).status(),200,'Current production code rejected');await page.getByLabel('咨询消息').waitFor();
 const state=await page.evaluate(async()=>{const p=await(await fetch('/api/project')).json(),s=await(await fetch('/api/chat/stages')).json();return {revision:p.revision,active:s.active,threads:s.threads}});result.authenticated=true;result.stage=state.active;result.revision=state.revision;
 await page.getByRole('region',{name:'设计阶段'}).waitFor();assert.equal(await page.getByLabel('咨询模型').inputValue(),'gemini-3.8-flash-high');
 const revision=await page.evaluate(async()=>(await(await fetch('/api/project')).json()).revision);assert.equal(revision,state.revision);result.noBusinessWrites=true;
 }else{result.authenticated=false;result.pending='Current production access code required for authenticated MCP verification'}
 assert.deepEqual(errors,[]);result.errors=errors;result.pass=true;await page.screenshot({path:out+'/public.png'});
}catch(e){result.error=String(e);throw e}finally{await browser.close();await writeFile(out+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result))}
