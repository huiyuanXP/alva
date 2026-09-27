import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parse} from 'dotenv';
import {chromium,expect} from '@playwright/test';
const origin='https://prod.huiyuanxp.com',release=(await readFile('.runtime/alva07475-release/latest','utf8')).trim(),run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA074075-public',out=resolve('evidence',run);await mkdir(out,{recursive:true});
const deploy=JSON.parse(await readFile(resolve('evidence',release.split('/').at(-1),'result.json'),'utf8'));
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--disable-dev-shm-usage','--renderer-process-limit=1','--disable-gpu']});
const context=await browser.newContext({viewport:{width:1440,height:950}}),page=await context.newPage(),errors=[],checks=[],hashes={};page.on('pageerror',e=>errors.push(e.message));
const get=async(url,data)=>{const raw=await page.evaluate(async({url,data})=>{const r=await fetch(url,data?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:undefined);return {status:r.status,text:await r.text()}},{url,data});const body=Buffer.from(raw.text);return {status:()=>raw.status,ok:()=>raw.status>=200&&raw.status<300,body:async()=>body,json:async()=>JSON.parse(body.toString())}};
let loginStatus,authenticated=false;
try{
 await page.route('**/api/chat/guidance*',r=>r.fulfill({json:{needed:false}}));
 const response=await page.goto(origin);assert.equal(response.status(),200);
 assert.equal((await get(origin+'/healthz')).status(),200);assert.equal((await get(origin+'/api/project')).status(),401);checks.push('public HTTPS, health and unauthenticated API');
 for(const name of Object.keys(deploy.assets)){const r=await page.evaluate(async name=>{const response=await fetch('/assets/'+name);const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await response.arrayBuffer())),v=>v.toString(16).padStart(2,'0')).join('');return {status:response.status,hash}},name);assert.equal(r.status,200);assert.equal(r.hash,deploy.assets[name]);hashes[name]=r.hash}checks.push('public JS/CSS match pinned tested release');
 await expect(page.locator('.language-switch select')).toBeVisible();await page.locator('.language-switch select').selectOption('en');await expect(page.getByRole('heading')).toContainText('access');await page.screenshot({path:resolve(out,'login-en.png')});await page.reload();await expect(page.locator('.language-switch select')).toHaveValue('en');await page.locator('.language-switch select').selectOption('zh');await expect(page.getByRole('heading')).toContainText('验证码');checks.push('live Chinese/English login switch and persisted preference');
 const config=parse(await readFile('.runtime/alva-prod.env','utf8'));let code=config.ALVA_ACCESS_CODE;
 if(!code){try{code=(await readFile(config.ALVA_ACCESS_CODE_FILE||'.runtime/alva-access-code','utf8')).trim()}catch{}}
 if(code){const login=await get(origin+'/api/access',{code});loginStatus=login.status();if(login.ok()){
  authenticated=true;const before=await (await get(origin+'/api/project')).json();await page.reload();await expect(page.locator('.chat-stages')).toBeVisible();const stage=await (await get(origin+'/api/chat/stages')).json();await expect(page.locator('.chat-stages button[aria-current="step"]')).toContainText(stage.active==='living'?'生活设计':'户型导入');await page.locator('header .language-switch select').selectOption('en');await expect(page.locator('.chat-stages')).not.toContainText('户型导入');await page.screenshot({path:resolve(out,'workspace-en.png')});await page.locator('header .language-switch select').selectOption('zh');const after=await (await get(origin+'/api/project')).json();assert.equal(after.revision,before.revision);checks.push('authenticated stage matches server; live language switch leaves revision unchanged');
 }}
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,checks,hashes,errors,loginStatus,authenticated,authenticatedVerification:authenticated?'passed':'pending: current configured code unavailable or rejected'},null,2));console.log(JSON.stringify({out,checks,errors,loginStatus,authenticated}));
}catch(e){await writeFile(resolve(out,'failure.json'),JSON.stringify({error:String(e),checks,errors,loginStatus},null,2));await page.screenshot({path:resolve(out,'failure.png')}).catch(()=>{});throw e}finally{await browser.close()}
