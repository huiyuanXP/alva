import {chromium,expect} from '@playwright/test';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const origin='https://immune-indoor-coat-pose.trycloudflare.com';
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA063-public';
const dir=resolve('evidence',runId);await mkdir(dir,{recursive:true});
const code=(await readFile('/home/ubuntu/Alva/.runtime/worktrees/ALVA-056-render-preview/.runtime/preview-data/access-code','utf8')).trim();
const browser=await chromium.launch({headless:true});
try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 const health=await page.goto(origin+'/healthz');if(!health?.ok())throw new Error('public health failed');
 await page.goto(origin);await page.getByPlaceholder('输入项目发起人提供的验证码').fill(code);
 const login=page.waitForResponse(response=>response.url().endsWith('/api/access')&&response.request().method()==='POST');
 await page.getByRole('button',{name:'验证并进入 →',exact:true}).click();if(!(await login).ok())throw new Error('login failed');
 const project=await page.evaluate(async()=>{const response=await fetch('/api/project');if(!response.ok)throw new Error('project GET failed');return response.json()});
 const candidate=project.candidate;if(!candidate)throw new Error('candidate missing');
 const counts={walls:candidate.walls.length,rooms:candidate.rooms.length,openings:candidate.openings.length};
 if(counts.walls!==19||counts.rooms!==5||counts.openings!==7)throw new Error('candidate mismatch '+JSON.stringify(counts));
 await expect(page.locator('svg').first()).toBeVisible();
 await page.screenshot({path:resolve(dir,'selfreview-2d.png'),fullPage:true});
 await page.getByRole('button',{name:'全屋',exact:true}).click();
 await expect(page.locator('canvas').first()).toBeVisible();
 await page.screenshot({path:resolve(dir,'selfreview-3d.png'),fullPage:true});
 if(errors.length)throw new Error('page errors: '+errors.join(';'));
 const result={ok:true,origin,runId,counts,canvas:true,pageErrors:errors.length};
 await writeFile(resolve(dir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{await browser.close()}
