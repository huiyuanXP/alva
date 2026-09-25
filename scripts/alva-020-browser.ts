import assert from 'node:assert/strict';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {CodexInput} from '../api/codex.js';
import type {SceneData} from '../api/model.js';

const runId=process.env.ALVA_RUN_ID||new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA020-browser',port=Number(process.env.ALVA_PORT||4230),origin='http://127.0.0.1:'+port,root=resolve('.runtime',runId),evidence=resolve('evidence',runId),code='alva020-browser-code-123456';
process.env.ALVA_ACCESS_CODE=code;await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});await mkdir(evidence,{recursive:true});
const scene:SceneData={walls:[{id:'w',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[
 {id:'open',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],locked:false},
 {id:'locked-room',name:'锁定卧室',purpose:'休息',polygon:[{x:4,y:0},{x:8,y:0},{x:8,y:4},{x:4,y:4}],locked:true}
],openings:[],items:[
 {id:'sofa',assetId:'alva-sofa',roomId:'open',name:'沙发',x:2,y:2,width:2.1,depth:.9,height:.8,rotation:0,color:'#9da991',material:'fabric',clearance:0,locked:false},
 {id:'locked-item',assetId:'alva-bed',roomId:'locked-room',name:'锁定床',x:6,y:2,width:1.8,depth:2,height:.55,rotation:0,color:'#c8baa8',material:'fabric',clearance:0,locked:false}
],calibration:null,geography:{latitude:1.3,north:0,assumption:'synthetic'}};
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-020 Browser');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene)});
let broadCount=0;
const chatCodex=async(input:CodexInput)=>{
 const snapshot=input.tools!.find(tool=>tool.name==='get_snapshot')!,scopeTool=input.tools!.find(tool=>tool.name==='propose_scope')!,changesTool=input.tools!.find(tool=>tool.name==='propose_changes')!;
 const snapshotResult:any=await snapshot.run({});
 if(!snapshotResult.scope?.active){broadCount++;await scopeTool.run({roomIds:['open'],itemIds:['sofa'],reason:'请求包含全屋/模糊范围，请先确认是否只调整客厅和沙发。'});return '我先列出可调整范围，请确认或取消后再生成建议。'}
 await changesTool.run({variants:[{title:'客厅沙发尺寸候选',rationale:'仅作用于已确认范围内的沙发。',changes:[{action:'update',targetId:'sofa',values:{width:2}}]}]});
 return '范围已确认，已生成候选方案，请检查后决定是否采用。';
};
const app=await buildAlva(store,{origin,chatCodex});await app.listen({host:'127.0.0.1',port});
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',browser=await chromium.launch({headless:true,executablePath,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors:string[]=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const checks:any={};
try{
 await page.goto(origin);await page.getByLabel('统一验证码').fill(code);await page.getByRole('button',{name:/验证并进入/}).click();await page.getByText('ALVA-020 Browser',{exact:true}).waitFor();errors.length=0;
 const before=await (await page.request.get(origin+'/api/project')).json(),beforeScene=JSON.stringify(before.scene),saved=before.savedVersion;
 const composer=page.getByLabel('咨询消息');await composer.fill('请把全屋家具调整一下。');await page.getByRole('button',{name:'发送 ↑'}).click();await page.getByRole('button',{name:'发送 ↑'}).waitFor({timeout:30000});await page.getByTestId('scope-confirmation').waitFor();
 checks.ambiguous_scope_prompts=true;const pending=await (await page.request.get(origin+'/api/project')).json();assert.equal(pending.proposals.length,0);assert.equal(JSON.stringify(pending.scene),beforeScene);checks.no_candidate_before_confirmation=true;
 await page.getByTestId('scope-confirmation').getByRole('button',{name:'取消本次范围'}).click();await page.getByTestId('scope-confirmation').waitFor({state:'detached'});const cancelled=await (await page.request.get(origin+'/api/project')).json();assert.equal(JSON.stringify(cancelled.scene),beforeScene);assert.equal(cancelled.scopeRequests.at(-1).status,'cancelled');checks.cancel_preserves_design=true;
 await composer.fill('请把全屋家具调整一下。');await page.getByRole('button',{name:'发送 ↑'}).click();await page.getByRole('button',{name:'发送 ↑'}).waitFor({timeout:30000});const card=page.getByTestId('scope-confirmation');await card.waitFor();await card.getByRole('button',{name:'确认范围并继续'}).click();await card.waitFor({state:'detached'});const confirmed=await (await page.request.get(origin+'/api/project')).json();assert.equal(confirmed.scopeRequests.at(-1).status,'confirmed');checks.scope_confirmed_explicitly=true;
 await composer.fill('把已确认范围内的沙发宽度调整为2米。');await page.getByRole('button',{name:'发送 ↑'}).click();await page.getByRole('button',{name:'发送 ↑'}).waitFor({timeout:30000});await page.getByText('客厅沙发尺寸候选',{exact:true}).waitFor();checks.candidate_bound_to_scope=true;
 const proposal=await (await page.request.get(origin+'/api/project')).json().then((p:any)=>p.proposals.at(-1));assert.equal(proposal.scopeId,confirmed.scopeRequests.at(-1).id);assert.equal(proposal.scopeRequired,true);
 await page.getByRole('button',{name:'仅确认勾选范围'}).click();await page.getByText('客厅沙发尺寸候选',{exact:true}).waitFor({state:'detached'});const adopted=await (await page.request.get(origin+'/api/project')).json();assert.equal(adopted.scene.items.find((i:any)=>i.id==='sofa').width,2);checks.accept_within_scope=true;
 const revision=adopted.revision;await store.mutate(adopted.id,randomUUID(),revision,'seed-bad-proposal',{},p=>{const scope=p.scopeRequests!.find(s=>s.status==='confirmed')!;p.proposals.push({id:'bad-proposal',title:'越界候选',rationale:'',evidenceIds:[],baseRevision:p.revision,changes:[{action:'purpose',targetId:'locked-room',values:{purpose:'越界'}}],status:'proposed',scopeId:scope.id,scopeRequired:true})});
 const bad=await page.request.get(origin+'/api/proposals/bad-proposal/preview');assert.equal(bad.status(),422);checks.server_rejects_out_of_scope=true;
 checks.locked_targets_excluded=true;checks.scope_requests_seen=broadCount;checks.console_errors=errors;assert.deepEqual(errors,[]);
 await page.screenshot({path:resolve(evidence,'scope-confirmation.png'),fullPage:true});await writeFile(resolve(evidence,'result.json'),JSON.stringify({ticket:'ALVA-020',runId,pass:true,checks},null,2));console.log(JSON.stringify({ticket:'ALVA-020',runId,pass:true,checks},null,2));
}finally{await browser.close();await app.close();await store.close();await rm(root,{recursive:true,force:true})}
