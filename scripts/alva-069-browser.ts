import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID,randomBytes} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const evidence=resolve('evidence',new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA069-browser-'+randomUUID().slice(0,6));
await mkdir(evidence,{recursive:true});
process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
process.env.ALVA_DATA_DIR=resolve('.runtime','alva069-browser-'+randomUUID());
const store=new AlvaStore();let app:Awaited<ReturnType<typeof buildAlva>>|undefined;let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const scene:SceneData={walls:[{id:'w1',a:{x:0,y:0},b:{x:6,y:0},height:2.8,thickness:.15,structural:'unknown',evidence:[]},{id:'w2',a:{x:6,y:0},b:{x:6,y:4},height:2.8,thickness:.15,structural:'unknown',evidence:[]},{id:'w3',a:{x:6,y:4},b:{x:0,y:4},height:2.8,thickness:.15,structural:'unknown',evidence:[]},{id:'w4',a:{x:0,y:4},b:{x:0,y:0},height:2.8,thickness:.15,structural:'unknown',evidence:[]}],rooms:[{id:'room',name:'测试房间',purpose:'客厅',polygon:[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'合成数据'}};
try{
 await store.init();const {project}=await store.create('ALVA-069 synthetic chat layout');await store.ensureAccessCode(project.id);
 await store.mutate(project.id,randomUUID(),project.revision,'seed-chat-ui',{},p=>{p.scene=scene;p.messages.push({id:randomUUID(),role:'user',text:'我希望厨房采光好，而且窗边有足够空间放一张小桌子。',status:'completed',createdAt:new Date().toISOString()},{id:randomUUID(),role:'assistant',text:'**先看采光。**\n\n- 检查窗户位置\n- 留出桌子的通行空间\n\n这两个方面可以一起比较。',status:'completed',createdAt:new Date().toISOString()})});
 await store.updateChatState(project.id,state=>{state.entryWarning={code:'HANDOFF_RETRY',message:'工具处理失败，请重读项目状态后重试',retryable:true,repairActions:['重试交接']} as any});
 app=await buildAlva(store,{assets:true,origin:'http://127.0.0.1'});const origin=await app.listen({host:'127.0.0.1',port:0});
 browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
 const context=await browser.newContext({viewport:{width:1440,height:900}});const session=await store.issueInternalSession(project.id);await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}]);const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);
 await expect(page.getByText('先看采光。')).toBeVisible();await expect(page.locator('.message.assistant strong')).toHaveText('先看采光。');await expect(page.locator('.message.assistant li')).toHaveCount(2);
 const bubble=await page.locator('.message.user').boundingBox(),column=await page.locator('aside.chat').boundingBox(),warning=await page.locator('.stage-entry-warning').boundingBox();assert.ok(bubble&&column&&warning);
 assert.ok(bubble.width<column.width*.9,`user bubble ${bubble.width} too wide for chat ${column.width}`);assert.ok(await page.locator('.messages .stage-entry-warning').count()===1,'handoff warning should scroll with chat');assert.equal(await page.locator('.chat-stages>small').count(),0);assert.ok((await page.locator('.chat-stages').boundingBox())!.height<48,'stage tabs should not reserve blank height');await expect(page.getByRole('button',{name:'户型导入'})).toBeVisible();await expect(page.getByRole('button',{name:'生活设计'})).toBeVisible();await expect(page.getByRole('textbox',{name:'咨询消息'})).toHaveAttribute('placeholder','上传户型图，告诉我你想怎样调整家的空间…');await expect(page.locator('.message.assistant small').first()).toHaveText('alva · 空间顾问');
 await page.screenshot({path:resolve(evidence,'chat-desktop.png')});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:resolve(evidence,'chat-narrow.png')});
 let retries=0,delivered=false;
 await page.route('**/api/chat/stages/retry-entry',async route=>{retries++;assert.equal(route.request().postDataJSON().stage,'floorplan');delivered=true;await route.fulfill({contentType:'application/json',body:JSON.stringify({active:'floorplan',entryWarning:null})})});
 await page.route('**/api/chat/stages',async route=>{if(delivered)await route.fulfill({contentType:'application/json',body:JSON.stringify({active:'floorplan',entryWarning:null})});else await route.continue()});
 await page.getByRole('button',{name:'重试送达阶段交接'}).click();await expect(page.getByText('阶段交接已送达，可以继续对话。')).toBeVisible();await expect(page.locator('.stage-entry-warning')).toHaveCount(0);assert.equal(retries,1);
 await page.unroute('**/api/chat/stages');await store.updateChatState(project.id,state=>{state.active='living';delete state.entryWarning});await page.reload();await expect(page.getByRole('button',{name:'生活设计'})).toHaveAttribute('aria-current','step');await expect(page.getByRole('textbox',{name:'咨询消息'})).toHaveAttribute('placeholder','聊聊生活习惯，或想调整的地方…');await expect(page.locator('.message.assistant small').first()).toHaveText('alva · 设计顾问');await expect(page.locator('.chat-stages>small')).toHaveCount(0);assert.ok((await page.locator('.chat-stages').boundingBox())!.height<48,'living tabs should not reserve blank height');await page.screenshot({path:resolve(evidence,'chat-living-narrow.png')});
 assert.deepEqual(errors,[]);await writeFile(resolve(evidence,'result.json'),JSON.stringify({pass:true,bubbleWidth:bubble.width,chatWidth:column.width,errors},null,2));
 console.log(JSON.stringify({pass:true,evidence,bubbleWidth:bubble.width,chatWidth:column.width,errors}));await context.close();
}finally{await browser?.close();await app?.close();await store.close()}
