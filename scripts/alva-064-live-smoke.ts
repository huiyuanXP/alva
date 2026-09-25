import {chromium} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {parse} from 'dotenv';

const origin='https://prod.huiyuanxp.com';
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA064-live-'+randomUUID().slice(0,6);
const evidence=resolve('evidence',runId);await mkdir(evidence,{recursive:true});
const config=parse(await readFile('/home/ubuntu/Alva/.runtime/alva-prod.env','utf8'));
const browser=await chromium.launch({headless:true});
const result:Record<string,unknown>={runId,origin,startedAt:new Date().toISOString()};
try{
 const page=await browser.newPage({viewport:{width:1440,height:960}});let pageErrors=0,consoleErrors=0;const consoleErrorDetails:string[]=[];const unauthorizedPaths:string[]=[];
 page.on('response',r=>{if(r.status()===401)unauthorizedPaths.push(new URL(r.url()).pathname)});
 page.on('pageerror',()=>pageErrors++);page.on('console',message=>{if(message.type()==='error'){consoleErrors++;consoleErrorDetails.push(message.text().replaceAll(process.env.ALVA_SMOKE_CODE||'\u0000','[redacted]').slice(0,200))}});
 const response=await page.goto(origin);if(!response?.ok())throw new Error('public homepage failed');
 const login=page.getByPlaceholder('输入项目发起人提供的验证码');
 if(await login.isVisible()){
  const code=process.env.ALVA_SMOKE_CODE||config.ALVA_ACCESS_CODE||(await readFile(config.ALVA_ACCESS_CODE_FILE||'/home/ubuntu/Alva/.runtime/alva-access-code','utf8')).trim();
  await login.fill(code);const loginResponse=page.waitForResponse(r=>r.url().endsWith('/api/access')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'验证并进入 →',exact:true}).click();const authResponse=await loginResponse;if(!authResponse.ok())throw new Error(`login HTTP ${authResponse.status()} server=${authResponse.headers()['server']||'unknown'}`);
  if(unauthorizedPaths.some(path=>path!=='/api/session'))throw new Error(`unexpected pre-login 401: ${unauthorizedPaths.join(',')}`);
  await page.waitForTimeout(100);pageErrors=0;consoleErrors=0;consoleErrorDetails.length=0;
 }
 const before=await page.evaluate(async()=>{const r=await fetch('/api/project');if(!r.ok)throw new Error('project unavailable');const p=await r.json();return {id:p.id,revision:p.revision}});
 const after=await page.evaluate(async()=>{const r=await fetch('/api/project');if(!r.ok)throw new Error('project unavailable');const p=await r.json();return {id:p.id,revision:p.revision}});
 if(before.id!==after.id||before.revision!==after.revision)throw new Error('read-only smoke changed project');
 if(pageErrors||consoleErrors)throw new Error(`browser errors ${pageErrors}/${consoleErrors}: ${consoleErrorDetails.join(' | ')}; unauthorized=${unauthorizedPaths.join(',')}`);
 Object.assign(result,{ok:true,homepageStatus:response.status(),projectReadable:true,revisionUnchanged:true,pageErrors,consoleErrors,unauthorizedPaths});
}catch(error){Object.assign(result,{ok:false,error:String(error).slice(0,300)})}finally{result.finishedAt=new Date().toISOString();await browser.close();await writeFile(resolve(evidence,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1}
