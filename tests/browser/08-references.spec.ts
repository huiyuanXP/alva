import {test,expect} from '@playwright/test';import {login,bridge} from './helpers.js';import {evidencePath} from './evidence.js';
test('fresh owned project: real model reference furniture, scope dismiss/adopt/remove and reload',async({page})=>{
 test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await login(page);const url=page.url();const id=new URL(url).searchParams.get('project')!;const read=async()=>(await page.request.get(`/api/projects/${id}`)).json();const before=await read();expect(before.version).toBe(0);
 const panel=page.getByRole('region',{name:'参考家具方案'});await panel.getByLabel('希望添加的参考家具').fill('请调用工具添加两把椅子 chair 和一个储物柜 storage，作为未采用参考家具。不要添加其他资产。');
 const response=page.waitForResponse(r=>r.url().endsWith('/references')&&r.request().method()==='POST',{timeout:90000});await panel.getByRole('button',{name:'生成参考家具',exact:true}).click();expect((await response).status()).toBe(200);
 await expect(panel.getByText('未采用 · 参考家具',{exact:true})).toHaveCount(3);let q=await read();const plan=q.reference_plans[0];const ids=plan.lines.flatMap((l:any)=>l.object_ids);expect(ids).toHaveLength(3);expect(q.requirements).toEqual(before.requirements);
 await expect.poll(async()=>(await bridge(page,'inspect',{})).camera.referenceLabels.length).toBe(3);await bridge(page,'focus',{room_id:'living'});
 await panel.getByText('未采用 · 参考家具',{exact:true}).first().scrollIntoViewIfNeeded();
 expect(await page.evaluate(()=>window.scrollY)).toBe(0);await page.screenshot({path:evidencePath('08-pending-desktop.png')});
 await page.setViewportSize({width:375,height:812});await panel.getByText('未采用 · 参考家具',{exact:true}).first().scrollIntoViewIfNeeded();await page.screenshot({path:evidencePath('08-pending-mobile.png')});await page.setViewportSize({width:1440,height:960});
 await panel.getByRole('button',{name:/采用本组参考家具/}).click();expect(await page.evaluate(()=>window.scrollY)).toBe(0);const dialog=page.getByRole('dialog',{name:'确认参考家具范围'});await expect(dialog).toContainText(ids[0]);await page.screenshot({path:evidencePath('08-scope-desktop.png')});await dialog.getByRole('button',{name:'暂不采用'}).click();expect((await read()).requirements).toEqual(before.requirements);
 await panel.getByRole('button',{name:'移除此参考'}).last().click();await expect(panel.getByText('未采用 · 参考家具',{exact:true})).toHaveCount(2);
 await panel.getByRole('button',{name:/采用本组参考家具/}).click();await dialog.getByRole('button',{name:'确认采用列出范围'}).click();await expect(panel.getByText('已采用家具',{exact:true})).toHaveCount(2);
 await page.reload();await expect(panel.getByText('已采用家具',{exact:true})).toHaveCount(2);expect(page.url()).toBe(url);q=await read();expect(q.requirements.length).toBe(before.requirements.length+2);await expect.poll(async()=>{try{return (await bridge(page,'inspect',{})).camera.referenceLabels.length;}catch{return -1;}}).toBe(0);
 await page.setViewportSize({width:375,height:812});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:evidencePath('08-mobile.png')});expect(errors).toEqual([]);
 await page.goto('/?project=missing-project');await expect(page.getByText('项目不存在或无权访问',{exact:true})).toBeVisible();await expect(page.locator('iframe')).toHaveCount(0);
});
