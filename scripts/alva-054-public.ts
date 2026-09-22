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
 const health=await context.request.get(origin+'/healthz');if(!health.ok())throw new Error('public health failed');
 const login=await context.request.post(origin+'/api/access',{data:{code}});if(!login.ok())throw new Error('public login failed: '+login.status());
 const before=await (await context.request.get(origin+'/api/project')).json();
 const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin);await page.getByRole('button',{name:'聊聊你的家',exact:true}).click();
 const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();await expect(page.getByLabel('选择问卷题目')).toBeVisible();
 const intake=await (await context.request.get(origin+'/api/intake')).json();if(intake.questions.length!==54)throw new Error('question count');
 await page.getByLabel('关闭问卷').click();await expect(dialog).toBeHidden();await page.getByRole('button',{name:'聊聊你的家',exact:true}).click();await expect(dialog).toBeVisible();await page.getByLabel('关闭问卷').click();
 const after=await (await context.request.get(origin+'/api/project')).json();if(before.revision!==after.revision)throw new Error('read-only smoke changed project revision or concurrent mutation; inspect');if(errors.length)throw new Error(errors.join(';'));
 const result={ok:true,origin,questions:intake.questions.length,checks:['HTTPS health','authenticated new entry','questionnaire opens/closes/reopens','no business data written','zero page errors'],errors};await writeFile(dir+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({dir,...result}));
 await context.request.post(origin+'/api/logout',{data:{}});
}finally{await browser.close()}
