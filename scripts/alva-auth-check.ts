import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const port=4181,origin=`http://127.0.0.1:${port}`,code='browser-unified-code-123456';
const dataDir=await mkdtemp(join(tmpdir(),'alva-auth-browser-'));
process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_DATA_DIR=dataDir;process.env.ALVA_ORIGIN=origin;process.env.ALVA_ACCESS_CODE_FILE=join(dataDir,'access-code');
const store=new AlvaStore(join(dataDir,'db'));await store.init();const project=await store.create('浏览器验收项目');await store.ensureAccessCode(project.project.id);const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const a=await browser.newContext(),b=await browser.newContext(),pageA=await a.newPage(),pageB=await b.newPage();
 await pageA.goto(origin);await assertPageLogin(pageA);await pageB.goto(`${origin}/#access=${project.token}`);await assertPageLogin(pageB);assert.match(await pageB.locator('body').innerText(),/旧链接不能单独进入/);
 await login(pageA);await login(pageB);assert.match(await pageA.locator('body').innerText(),/浏览器验收项目/);assert.match(await pageB.locator('body').innerText(),/浏览器验收项目/);
 await pageA.reload();await pageB.reload();assert.match(await pageA.locator('body').innerText(),/浏览器验收项目/);assert.match(await pageB.locator('body').innerText(),/浏览器验收项目/);
 await pageA.getByRole('button',{name:'退出'}).click();await assertPageLogin(pageA);assert.match(await pageB.locator('body').innerText(),/浏览器验收项目/);await login(pageA);assert.match(await pageA.locator('body').innerText(),/浏览器验收项目/);
 const direct=await pageB.request.get(`${origin}/api/project`);assert.equal(direct.status(),200);assert.equal((await pageA.request.get(`${origin}/api/public-access`)).status(),404);
 await a.close();await b.close();
}finally{await browser.close();await app.close();await store.close();await rm(dataDir,{recursive:true,force:true})}

async function assertPageLogin(page:import('@playwright/test').Page){await page.getByLabel('统一验证码').waitFor();assert.match(await page.locator('body').innerText(),/统一访问验证/)}
async function login(page:import('@playwright/test').Page){await page.getByLabel('统一验证码').fill(code);const responsePromise=page.waitForResponse(response=>response.url().endsWith('/api/access'));await page.getByRole('button',{name:/验证并进入/}).click();const response=await responsePromise;if(!response.ok())throw new Error(`access ${response.status()}: ${await response.text()}`);await page.getByText('浏览器验收项目').waitFor()}
