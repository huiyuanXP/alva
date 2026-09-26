import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';

const url=process.env.ALVA049_URL,code=process.env.ALVA049_CODE,dir=process.env.ALVA049_EVIDENCE||'evidence/ALVA049-cloudflare';
if(!url||!code)throw new Error('ALVA049_URL and ALVA049_CODE are required');
await mkdir(dir,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({acceptDownloads:true,viewport:{width:1600,height:1000}});const consoleErrors:string[]=[],pageErrors:string[]=[];
page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});page.on('pageerror',error=>pageErrors.push(error.message));
try{
 await page.goto(url,{waitUntil:'domcontentloaded'});const login=page.getByPlaceholder('输入项目发起人提供的验证码');await login.waitFor();assert.equal(await page.getByRole('button',{name:/验证并进入/}).isDisabled(),true);await login.fill(code);await page.getByRole('button',{name:/验证并进入/}).click();await page.getByRole('button',{name:'交付包'}).waitFor();await page.screenshot({path:`${dir}/workspace.png`,fullPage:true});
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'交付包'}).click();await (await download).path();await page.getByText('交付包已生成').waitFor();await page.screenshot({path:`${dir}/delivery.png`,fullPage:true});
 const expectedConsole=consoleErrors.filter(error=>/status of 401/.test(error));const unexpectedConsole=consoleErrors.filter(error=>!expectedConsole.includes(error));const result={ticket:'ALVA-049',pass:pageErrors.length===0&&unexpectedConsole.length===0,pageErrors,consoleErrors,expectedConsole,unexpectedConsole,checks:['empty-code-disabled','cloudflare-login','delivery-download','delivery-success-status'],source:'真实 Chromium + 独立 Cloudflare 通道；登录前 session 401 是预期门禁响应；私有验证码未写入结果'};await writeFile(`${dir}/result.json`,JSON.stringify(result,null,2));assert.deepEqual(pageErrors,[]);assert.deepEqual(unexpectedConsole,[]);console.log(JSON.stringify(result,null,2));
}finally{await browser.close()}
