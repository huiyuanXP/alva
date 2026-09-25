import assert from 'node:assert/strict';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData,Proposal} from '../api/model.js';

const runId=process.env.ALVA_RUN_ID||new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA021-browser';
const port=Number(process.env.ALVA_PORT||4231),origin='http://127.0.0.1:'+port,root=resolve('.runtime',runId),evidence=resolve('evidence',runId),code='alva021-browser-code-123456';
process.env.ALVA_ACCESS_CODE=code;
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});await mkdir(evidence,{recursive:true,mode:0o700});
const scene:SceneData={walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],openings:[],items:[
 {id:'sofa-1',assetId:'alva-sofa',roomId:'room-1',name:'沙发',x:2,y:2,width:2.1,depth:.9,height:.8,rotation:0,color:'#9da991',material:'fabric',clearance:0,locked:false},
 {id:'table-1',assetId:'alva-table',roomId:'room-1',name:'书桌',x:5,y:2,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}
],calibration:null,geography:{latitude:31,north:0,assumption:'真实浏览器合成布局对照'}};
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-021 Browser');await store.ensureAccessCode(created.project.id);
await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene);p.proposals=[
 {id:'candidate-a',title:'客厅布局候选 A',rationale:'调整沙发与书桌位置，客厅作为对照范围。',evidenceIds:[],baseRevision:1,changes:[{action:'update',targetId:'sofa-1',values:{x:2.5}},{action:'update',targetId:'table-1',values:{x:5.5}}],status:'proposed',referenceIds:['room-1']},
 {id:'candidate-b',title:'客厅布局候选 B',rationale:'另一组不同位置组合。',evidenceIds:[],baseRevision:1,changes:[{action:'update',targetId:'sofa-1',values:{x:3}}],status:'proposed',referenceIds:['room-1']}
] as Proposal[]});
const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome';
const browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const checks:Record<string,unknown>={};
try{
 await page.goto(origin);await page.getByLabel('统一验证码').fill(code);await page.getByRole('button',{name:/验证并进入/}).click();await page.getByText('ALVA-021 Browser',{exact:true}).waitFor();errors.length=0;
 const cards=page.locator('[data-testid^="proposal-card-"]');await cards.nth(0).waitFor();assert.equal(await cards.count(),2);checks.two_distinct_candidate_cards=true;
 const first=page.getByTestId('proposal-card-candidate-a');await first.getByTestId('proposal-3d-candidate-a').waitFor();
 assert.equal(await first.getByTestId('proposal-3d-candidate-a').locator('canvas[aria-label="全屋三维场景"]').count(),1);checks.real_3d_canvas=true;
 const reference=first.getByTestId('proposal-reference-room-1').locator('input');assert.equal(await reference.isDisabled(),true);assert.equal(await reference.isChecked(),false);checks.reference_not_selected=true;
 const table=first.getByTestId('proposal-target-table-1').locator('input');assert.equal(await table.isChecked(),true);await table.uncheck();assert.equal(await table.isChecked(),false);checks.partial_selection_visible=true;
 await first.getByRole('button',{name:'仅确认勾选范围'}).click();await first.waitFor({state:'detached'});
 const after=await (await page.request.get(origin+'/api/project')).json();assert.equal(after.scene.items.find((i:any)=>i.id==='sofa-1').x,2.5);assert.equal(after.scene.items.find((i:any)=>i.id==='table-1').x,5);assert.equal(after.proposals.find((p:any)=>p.id==='candidate-a').status,'accepted');assert.equal(after.proposals.find((p:any)=>p.id==='candidate-b').status,'proposed');checks.atomic_selected_only=true;
 assert.deepEqual(errors,[]);checks.console_errors=errors;
 await page.screenshot({path:resolve(evidence,'candidate-comparison.png'),fullPage:true});await writeFile(resolve(evidence,'result.json'),JSON.stringify({ticket:'ALVA-021',runId,pass:true,checks},null,2));console.log(JSON.stringify({ticket:'ALVA-021',runId,pass:true,checks},null,2));
}finally{await browser.close();await app.close();await store.close();await rm(root,{recursive:true,force:true})}
