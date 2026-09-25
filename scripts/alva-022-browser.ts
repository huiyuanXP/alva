import assert from 'node:assert/strict';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData,Proposal} from '../api/model.js';

const runId=process.env.ALVA_RUN_ID||new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA022-browser';
const port=Number(process.env.ALVA_PORT||4232),origin='http://127.0.0.1:'+port,root=resolve('.runtime',runId),evidence=resolve('evidence',runId),code='alva022-browser-code-123456';
process.env.ALVA_ACCESS_CODE=code;
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});await mkdir(evidence,{recursive:true,mode:0o700});
const scene:SceneData={walls:[{id:'wall-1',a:{x:0,y:0},b:{x:10,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[
 {id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:5,y:0},{x:5,y:5},{x:0,y:5}],locked:false},
 {id:'study',name:'书房',purpose:'工作',polygon:[{x:5,y:0},{x:10,y:0},{x:10,y:5},{x:5,y:5}],locked:true}
],openings:[],items:[
 {id:'sofa',assetId:'alva-sofa',roomId:'living',name:'沙发',x:2,y:2,width:2.1,depth:.9,height:.8,rotation:0,color:'#9da991',material:'fabric',clearance:0,locked:false},
 {id:'table',assetId:'alva-table',roomId:'living',name:'书桌',x:4,y:2,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}
],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-022 真实浏览器样本'}};
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-022 Browser');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene)});
const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const checks:Record<string,unknown>={};
try{
 await page.goto(origin);await page.getByLabel('统一验证码').fill(code);await page.getByRole('button',{name:/验证并进入/}).click();await page.getByText('ALVA-022 Browser',{exact:true}).waitFor();errors.length=0;
 const initial=await (await page.request.get(origin+'/api/project')).json(),initialItems=JSON.stringify(initial.scene.items.map((i:any)=>({id:i.id,x:i.x,y:i.y})));
 await page.getByLabel('房间用途').fill('亲子阅读');await page.getByTestId('confirm-purpose').click();await page.getByTestId('purpose-confirmed').waitFor();
 let current=await (await page.request.get(origin+'/api/project')).json();assert.equal(current.scene.rooms.find((r:any)=>r.id==='living').purpose,'亲子阅读');assert.equal(JSON.stringify(current.scene.items.map((i:any)=>({id:i.id,x:i.x,y:i.y}))),initialItems);assert.equal(current.purposeConfirmations.length,1);assert.equal(current.layoutConfirmations.length,0);checks.purpose_only_no_furniture_move=true;
 await store.mutate(created.project.id,randomUUID(),current.revision,'seed-layout-proposals',{},p=>{p.proposals=[
  {id:'layout-a',title:'阅读布局 A',rationale:'沙发阅读位候选。',evidenceIds:[],baseRevision:p.revision+1,changes:[{action:'update',targetId:'sofa',values:{x:2.4}}],status:'proposed'},
  {id:'layout-b',title:'阅读布局 B',rationale:'书桌阅读位候选。',evidenceIds:[],baseRevision:p.revision+1,changes:[{action:'update',targetId:'table',values:{x:4.8}}],status:'proposed'}
 ] as Proposal[]});
 await page.reload();await page.getByText('阅读布局 A',{exact:true}).waitFor();const cardA=page.getByTestId('proposal-card-layout-a'),cardB=page.getByTestId('proposal-card-layout-b');await cardA.getByTestId('proposal-3d-layout-a').locator('canvas[aria-label="全屋三维场景"]').waitFor();checks.layout_candidates_previewable=true;
 await cardA.getByRole('button',{name:'暂不采用'}).click();await cardA.waitFor({state:'detached'});current=await (await page.request.get(origin+'/api/project')).json();assert.equal(current.scene.items.find((i:any)=>i.id==='sofa').x,2);assert.equal(current.proposals.find((p:any)=>p.id==='layout-a').status,'rejected');checks.layout_rejected_without_change=true;
 await cardB.getByRole('button',{name:'仅确认勾选范围'}).click();await cardB.waitFor({state:'detached'});current=await (await page.request.get(origin+'/api/project')).json();assert.equal(current.scene.items.find((i:any)=>i.id==='table').x,4.8);assert.equal(current.scene.items.find((i:any)=>i.id==='sofa').x,2);assert.equal(current.layoutConfirmations.length,1);assert.deepEqual(current.layoutConfirmations[0].selectedIds,['table']);checks.layout_separately_adopted=true;
 await page.getByLabel('定位房间').selectOption('study');await page.getByLabel('房间用途').fill('儿童房');assert.equal(await page.getByTestId('confirm-purpose').isDisabled(),true);checks.locked_room_button_disabled=true;
 const locked=await page.request.post(origin+'/api/purpose/confirm',{data:{requestId:randomUUID(),expectedRevision:current.revision,roomId:'study',purpose:'儿童房',sourceText:'锁定房间不应修改',confirmed:true}});assert.equal(locked.status(),422);checks.locked_room_rejected=true;
 assert.deepEqual(errors,[]);checks.console_errors=errors;
 await page.screenshot({path:resolve(evidence,'purpose-layout-separation.png'),fullPage:true});await writeFile(resolve(evidence,'result.json'),JSON.stringify({ticket:'ALVA-022',runId,pass:true,checks},null,2));console.log(JSON.stringify({ticket:'ALVA-022',runId,pass:true,checks},null,2));
}finally{await browser.close();await app.close();await store.close();await rm(root,{recursive:true,force:true})}
