import {chromium,devices,expect} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash,randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const run=`evidence/${new Date().toISOString().replace(/[-:.]/g,'')}-${randomUUID().slice(0,8)}`;
await mkdir(run,{recursive:true});const browser=await chromium.launch({headless:true});
const checks:unknown[]=[],errors:string[]=[];let sharedHash='';
try{
 for(const device of ['desktop','mobile-emulation']){
  const context=await browser.newContext(device==='desktop'?{viewport:{width:1440,height:1000}}:devices['iPhone 13']);
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  for(const visit of ['first','reload','cleared-cookies']){
   if(visit==='cleared-cookies')await context.clearCookies();
   await page.goto('https://prod.huiyuanxp.com/');await expect(page.locator('.project-name')).toBeVisible({timeout:20000});
   const p=await page.evaluate(async()=>{const r=await fetch('/api/project');if(!r.ok)throw Error('Project unavailable');return r.json()});
   const hash=createHash('sha256').update(JSON.stringify(p)).digest('hex');if(sharedHash)assert.equal(hash,sharedHash);else sharedHash=hash;
   assert.equal(page.url(),'https://prod.huiyuanxp.com/');assert.equal(await page.locator('[role=alert]').count(),0);
   const cookie=(await context.cookies()).find(c=>c.name==='alva_session');assert.ok(cookie?.secure&&cookie.httpOnly);
   checks.push({device,visit,projectUnchanged:true});
  }
  await page.screenshot({path:`${run}/${device}.png`});await context.close();
 }
 const context=await browser.newContext();const page=await context.newPage();await page.goto((await readFile('.runtime/alva-data/initial-access-link','utf8')).trim());await expect(page.locator('.project-name')).toBeVisible();await context.close();
 assert.deepEqual(errors,[]);checks.push({legacyLink:true,consoleErrors:0});
 await writeFile(run+'/result.json',JSON.stringify({ok:true,checks,scope:'Two isolated browser contexts; mobile is browser emulation, not a physical handset'},null,2));console.log(JSON.stringify({run,checks}));
}catch(e){await writeFile(run+'/result.json',JSON.stringify({ok:false,checks,errors,error:String(e)},null,2));console.error(String(e),run);process.exitCode=1}finally{await browser.close()}
