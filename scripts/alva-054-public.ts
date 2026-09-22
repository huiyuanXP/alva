import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parse} from 'dotenv';
const origin='https://prod.huiyuanxp.com';
const config=parse(await readFile('.runtime/alva-prod.env','utf8'));
const code=config.ALVA_ACCESS_CODE||(await readFile(config.ALVA_ACCESS_CODE_FILE||'.runtime/alva-access-code','utf8')).trim();
const run=new Date().toISOString().replace(/[:.]/g,'')+'-ALVA054-public',dir='evidence/'+run;
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:1440,height:1000}});
try{
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const health=await page.goto(origin+'/healthz');if(!health?.ok())throw new Error('public browser health failed');
 await page.goto(origin);await page.getByPlaceholder('输入项目发起人提供的验证码').fill(code);const loginResponse=page.waitForResponse(r=>r.url().endsWith('/api/access')&&r.request().method()==='POST');await page.getByRole('button',{name:'验证并进入 →',exact:true}).click();
 const login=await loginResponse;if(!login.ok()){await page.getByPlaceholder('输入项目发起人提供的验证码').fill('');throw new Error('Configured access code rejected; HTTP '+login.status())}
 await expect(page.getByRole('button',{name:'聊聊你的家',exact:true})).toBeVisible();
 const before=await page.evaluate(async()=>{const r=await fetch('/api/project');if(!r.ok)throw new Error('project GET failed');return r.json()});
 await page.getByRole('button',{name:'聊聊你的家',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(page.getByLabel('选择问卷题目')).toBeVisible();
 const intake=await page.evaluate(async()=>{const r=await fetch('/api/intake');if(!r.ok)throw new Error('intake GET failed');return r.json()});if(intake.questions.length!==54)throw new Error('question count');
 await page.getByLabel('关闭问卷').click();await expect(dialog).toBeHidden();await page.getByRole('button',{name:'聊聊你的家',exact:true}).click();await expect(dialog).toBeVisible();await page.getByLabel('关闭问卷').click();
 const after=await page.evaluate(async()=>{const r=await fetch('/api/project');if(!r.ok)throw new Error('project GET failed');return r.json()});if(before.revision!==after.revision)throw new Error('read-only smoke changed project revision or concurrent mutation; inspect');if(errors.length)throw new Error(errors.join(';'));
 const result={ok:true,origin,questions:intake.questions.length,checks:['HTTPS health','authenticated new entry','questionnaire opens/closes/reopens','no business data written','zero page errors'],errors};await writeFile(dir+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({dir,...result}));
 await page.getByRole('button',{name:'退出',exact:true}).click();
}catch(e){await writeFile(dir+'/result.json',JSON.stringify({ok:false,error:String(e)},null,2));console.error(dir);throw e}finally{await browser.close()}
