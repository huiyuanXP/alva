import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {parse} from 'dotenv';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
const origin='https://prod.huiyuanxp.com',dir='evidence/'+new Date().toISOString().replace(/[:.]/g,'')+'-ALVA057-public';
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
const result:Record<string,unknown>={origin,checks:[],authenticated:false};
try{
 const health=await page.goto(origin+'/healthz');if(!health?.ok())throw new Error('HTTPS health failed');
 const home=await page.goto(origin);if(!home?.ok())throw new Error('HTTPS home failed');
 const bundle=await page.locator('script[type="module"]').getAttribute('src');if(!bundle)throw new Error('No module asset');
 if(!/^\/assets\/[A-Za-z0-9._-]+\.js$/.test(bundle))throw new Error('Unexpected module asset path');
 const asset=await page.request.get(origin+bundle);
 const hash=(data:Buffer)=>createHash('sha256').update(data).digest('hex');
 const localHash=hash(await readFile(resolve('web/dist',bundle.slice(1))));
 if(!asset.ok()||hash(await asset.body())!==localHash)throw new Error('Live module does not match the validated build');
 result.bundleSha256=localHash;
 const checks=await page.evaluate(async src=>{const r=await fetch(src!);const text=await r.text();return {asset:r.status,entry:text.includes('Your Home Vision'),questions:text.includes('Which palette appeals most to you?'),unauthorized:(await fetch('/api/intake/vision')).status}},bundle);
 if(checks.asset!==200||!checks.entry||!checks.questions||checks.unauthorized!==401)throw new Error('Live asset or access boundary failed');
 result.checks=['HTTPS health/home','current questionnaire asset','unauthenticated API rejects access'];result.bundle=bundle;
 const productionRoot=process.env.ALVA_PRODUCTION_ROOT||process.cwd();
 const config=parse(await readFile(process.env.ALVA_PRODUCTION_CONFIG||resolve(productionRoot,'.runtime/alva-prod.env'),'utf8'));
 let code=config.ALVA_ACCESS_CODE;
 if(!code)try{code=(await readFile(resolve(productionRoot,config.ALVA_ACCESS_CODE_FILE||'.runtime/alva-access-code'),'utf8')).trim()}catch{}
 if(code){
  const input=page.getByPlaceholder('输入项目发起人提供的验证码');await input.fill(code);
  const response=page.waitForResponse(r=>r.url().endsWith('/api/access')&&r.request().method()==='POST');
  await page.getByRole('button',{name:'验证并进入 →',exact:true}).click();const login=await response;result.loginStatus=login.status();
  if(login.ok()){
   const before=await page.evaluate(async()=>{const p=await(await fetch('/api/project')).json();return p.revision});
   await page.getByRole('button',{name:/Your Home Vision/}).click();await expect(page.getByRole('dialog',{name:'Your Home Vision'})).toBeVisible();
   const version=await page.evaluate(async()=>{const r=await fetch('/api/intake/vision');if(!r.ok)throw new Error('Questionnaire unavailable');return (await r.json()).version});
   if(version!=='home-vision-v4')throw new Error('Wrong questionnaire version');
   await page.getByRole('button',{name:'Save and close questionnaire'}).click();await expect(page.getByRole('dialog')).toBeHidden();
   const after=await page.evaluate(async()=>{const p=await(await fetch('/api/project')).json();return p.revision});
   result.authenticated=true;result.noBusinessWrites=before===after;
   (result.checks as string[]).push('authenticated entry and questionnaire open/close');
  }else{await input.fill('');result.authenticatedBlocker='Configured access code rejected; no code was changed';}
 }else result.authenticatedBlocker='No configured access code available';
 result.pageErrors=errors;result.ok=errors.length===0&&result.authenticated===true&&result.noBusinessWrites===true;
 await writeFile(dir+'/result.json',JSON.stringify(result,null,2));console.log(JSON.stringify({dir,...result},null,2));
 if(!result.ok)throw new Error('Authenticated live verification did not pass; see the recorded blocker.');
}catch(e){await writeFile(dir+'/result.json',JSON.stringify({...result,ok:false,error:String(e)},null,2));throw e}finally{await browser.close()}
