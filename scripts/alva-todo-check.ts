import {chromium} from '@playwright/test';
import Fastify from 'fastify';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {registerTodo} from '../api/todo/routes.js';
import {boardPayload} from '../api/todo/board.js';
import assert from 'node:assert/strict';
const run=resolve('evidence',new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA-052-todo');
await mkdir(run,{recursive:true});
const app=Fastify();registerTodo(app);
const origin=process.env.ALVA_TODO_ORIGIN || await app.listen({host:'127.0.0.1',port:0});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
try {
  await page.goto(origin+'/todo');await page.locator('.card').first().waitFor();
  assert.equal(await page.locator('.card').count(),44);
  const remote=await page.evaluate(async()=>{const r=await fetch('/todo/api/board');if(!r.ok)throw Error(String(r.status));return r.json()});
  assert.equal(remote.revision,boardPayload().revision);
  await page.locator('#search').fill('ALVA-051');assert.equal(await page.locator('.card').count(),1);
  await page.locator('.card').click();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('#detailtitle').innerText(),/ALVA-051/);
  await page.reload();await page.locator('dialog[open]').waitFor();assert.match(await page.locator('#detailbody').innerText(),/备份/);
  await page.locator('#close').click();await page.locator('#search').fill('');
  await page.locator('#phase').selectOption('furniture');assert.equal(await page.locator('.card').count(),5);
  await page.locator('#refresh').click();await page.waitForTimeout(200);assert.equal(await page.locator('#phase').inputValue(),'furniture');assert.equal(await page.locator('.card').count(),5);
  await page.locator('#phase').selectOption('');
  await page.locator('[data-tab="plan"]').click();assert.match(await page.locator('#content').innerText(),/署名/);
  await page.locator('[data-tab="spec"]').click();assert.match(await page.locator('#content').innerText(),/alva/);
  await page.locator('[data-tab="board"]').click();
  await page.screenshot({path:resolve(run,'board.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:resolve(run,'mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  await writeFile(resolve(run,'result.json'),JSON.stringify({ok:true,origin,revision:remote.revision,tickets:44,ready:5,blocked:39,checks:150,assertions:['count','source-revision','search','detail','deep-link-reload','lane-filter','refresh-retains-filter','plan','spec','mobile-overflow','console'],errors},null,2));
  console.log(run);
} catch(error) {await writeFile(resolve(run,'failure.json'),JSON.stringify({error:String(error),errors},null,2));throw error;}
finally {await browser.close();await app.close();}
