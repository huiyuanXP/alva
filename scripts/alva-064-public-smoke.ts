import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
const origin='https://prod.huiyuanxp.com';
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA064-public-'+randomUUID().slice(0,6);
const dir=resolve('evidence',runId);await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:960}});let errors=0;page.on('pageerror',()=>errors++);
let result:Record<string,unknown>={runId,origin,ok:false};
try{const health=await page.goto(origin+'/healthz');if(!health?.ok())throw new Error('health failed');const homepage=await page.goto(origin);if(!homepage?.ok())throw new Error('homepage failed');await page.getByPlaceholder('输入项目发起人提供的验证码').waitFor();if(errors)throw new Error('page script error');result={runId,origin,ok:true,healthStatus:health.status(),homepageStatus:homepage.status(),loginVisible:true,pageErrors:errors}}
catch(error){result.error=String(error).slice(0,300)}finally{await browser.close();await writeFile(resolve(dir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1}
