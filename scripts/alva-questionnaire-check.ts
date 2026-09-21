import {chromium} from '@playwright/test';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const port=Number(process.env.ALVA_PORT||4214),origin=`http://127.0.0.1:${port}`,runId=process.env.ALVA_RUN_ID||`${new Date().toISOString().replace(/[-:.]/g,'').replace('Z','Z')}-ALVA014-browser`,evidence=resolve('evidence',runId),data=resolve('.runtime',`${runId}-data`),code='alva014-browser-code-123456';
await mkdir(evidence,{recursive:true});await rm(data,{recursive:true,force:true});await mkdir(data,{recursive:true,mode:0o700});process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_PORT=String(port);process.env.ALVA_DATA_DIR=data;
const scene:SceneData={walls:[{id:'n',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}],locked:false},{id:'study',name:'书房',purpose:'工作',polygon:[{x:3,y:0},{x:6,y:0},{x:6,y:3},{x:3,y:3}],locked:false}],openings:[],items:[],calibration:{wallId:'n',length:6,source:'合成验收',confirmed:true},geography:{latitude:1.3,north:0,assumption:'ALVA-014 synthetic acceptance'}};
const store=new AlvaStore(resolve(data,'db'));await store.init();const created=await store.create('ALVA-014 Browser');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene;p.dirty=false});
const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1600,height:1000}});const consoleErrors:string[]=[];page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text())});page.on('pageerror',e=>consoleErrors.push(e.message));
const checks:Record<string,unknown>={};
try{
 await page.goto(origin);await page.getByLabel('统一验证码').fill(code);await page.getByRole('button',{name:/验证并进入/}).click();await page.waitForTimeout(1500);if(!(await page.getByText('ALVA-014 Browser').count())){console.error('LOGIN_DIAGNOSTIC',await page.locator('body').innerText())}await page.getByText('ALVA-014 Browser').waitFor();consoleErrors.length=0;
 const questionSelect=page.getByLabel('问卷问题');const optionValues=await questionSelect.locator('option').evaluateAll(options=>options.map(o=>(o as HTMLOptionElement).value));checks.disabled_hidden=['Q19','Q20','Q21','Q22','Q58','Q60'].every(id=>!optionValues.includes(id));checks.active_count=optionValues.length;checks.no_budget_ui=(await page.getByText('预算边界',{exact:true}).count())===0;
 await questionSelect.selectOption('Q25');await page.getByLabel('Q25自由回答').fill('阅读与休息');await page.getByRole('button',{name:'确认回答'}).click();await page.getByText('已记录：阅读与休息').waitFor();
 await page.getByLabel('定位房间').selectOption('study');await questionSelect.selectOption('Q25');checks.study_initial_empty=(await page.getByLabel('Q25自由回答').inputValue())==='';await page.getByLabel('Q25自由回答').fill('临时工作');await page.getByRole('button',{name:'确认回答'}).click();await page.getByText('已记录：临时工作').waitFor();
 await page.getByLabel('定位房间').selectOption('living');await questionSelect.selectOption('Q25');checks.living_restored=(await page.getByLabel('Q25自由回答').inputValue())==='阅读与休息';
 await questionSelect.selectOption('Q26');await page.getByRole('button',{name:'暂不确定'}).click();await page.getByText('已记录：暂不确定').waitFor();checks.unknown_displayed=true;
 await questionSelect.selectOption('Q27');await page.getByLabel('Q27自由回答').fill('门窗保持现状');await page.getByLabel('锁定此回答，避免被建议覆盖').check();await page.getByRole('button',{name:'确认回答'}).click();await page.getByText('已记录：门窗保持现状').waitFor();checks.lock_button_disabled=await page.getByRole('button',{name:'确认回答'}).isDisabled();
 const current=await (await page.request.get(`${origin}/api/project`)).json();const overwrite=await page.request.post(`${origin}/api/answers`,{data:{requestId:randomUUID(),expectedRevision:current.revision,answer:{questionId:'Q27',roomId:'living',text:'不应覆盖',state:'answered',locked:false,confirmed:true}}});checks.lock_server_status=overwrite.status();
 await page.reload();await page.getByText('ALVA-014 Browser').waitFor();await page.getByLabel('定位房间').selectOption('living');await page.getByLabel('问卷问题').selectOption('Q25');checks.reload_persisted=(await page.getByLabel('Q25自由回答').inputValue())==='阅读与休息';checks.console_errors=consoleErrors;
 await page.screenshot({path:resolve(evidence,'questionnaire.png'),fullPage:true});
 const pass=Object.entries(checks).every(([key,value])=>['active_count','console_errors','lock_server_status'].includes(key)?true:value===true)&&checks.lock_server_status===422&&consoleErrors.length===0&&checks.active_count===54;const result={ticket:'ALVA-014',runId,pass,checks};await writeFile(resolve(evidence,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));if(!pass)process.exitCode=1;
} finally {await browser.close();await app.close();await store.close();await rm(data,{recursive:true,force:true});}
