/** Bounded, restartable acceptance: real main Chat -> HTTP MCP -> browser -> saved review.
 * Geometry/building are synthetic prerequisites; this does not test vision or production data. */
import assert from 'node:assert/strict';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,basename} from 'node:path';
import {execFileSync} from 'node:child_process';
import {chromium,type Page} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {itemFromAsset,type Project} from '../api/model.js';
import {reviewProject,painFurniture} from '../tests/fixtures/alva/layout-review.js';
import {validateBuildingScene} from '../api/building/types.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
import {readUserContextProjection} from '../api/user-context/index.js';
const step=process.argv[2],root=resolve(process.argv[3]||'.runtime/alva029-joint-v2');
assert.ok(root.startsWith(resolve('.runtime')+'/')&&basename(root).startsWith('alva029-'));
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA029-'+step,out=resolve('evidence',run);
await mkdir(root,{recursive:true,mode:0o700});await mkdir(out,{recursive:true});
process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_DATA_DIR=resolve(root,'data');process.env.ALVA_UPLOAD_DIR=resolve(root,'uploads');
process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;
const store=new AlvaStore(resolve(root,'db'));await store.init();
let id:string;
if(step==='seed'){
 const created=await store.create('ALVA-029 合成布局联合验收');id=created.project.id;
 await store.mutate(id,randomUUID(),0,'synthetic-prerequisite',{},p=>{
  const fixture=reviewProject();painFurniture(fixture);fixture.scene!.items.find(i=>i.id==='sofa')!.x=1.4;
  fixture.scene!.items.push({...itemFromAsset('alva-cabinet','room-1',3.3,3),id:'barrier',width:.4,depth:5.4});
  p.scene=fixture.scene;seedLivingStage(p);
  // Complete synthetic opening components so snapshot restore retains a valid building.
  for(const opening of p.scene!.openings){const wall=p.scene!.walls.find(w=>w.id===opening.wallId)!;
   for(const kind of (opening.kind==='door'?['door-frame']:['window-frame','glass']) as ('door-frame'|'window-frame'|'glass')[])
    p.confirmedBuilding!.components.push({id:kind+'-'+opening.id,kind,topologyId:opening.id,position:{x:wall.a.x+(wall.b.x-wall.a.x)*opening.offset,y:opening.sill+opening.height/2,z:wall.a.y+(wall.b.y-wall.a.y)*opening.offset},size:{x:opening.width,y:opening.height,z:.08},rotation:Math.atan2(wall.b.y-wall.a.y,wall.b.x-wall.a.x),material:kind==='glass'?'glass':'wood',color:'#cccccc'});
  }
  validateBuildingScene(p.confirmedBuilding,p.confirmedTopology!.scene,p.confirmedTopology!.version,p.confirmedTopology!.sourceFingerprint);
 });await writeFile(resolve(root,'project-id'),id);
}else id=(await readFile(resolve(root,'project-id'),'utf8')).trim();
await store.ensureAccessCode(id);
const probe=createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const address=probe.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>((r,j)=>probe.close(e=>e?j(e):r()));const origin=`http://127.0.0.1:${port}`;
const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});
const session=await store.issueInternalSession(id);let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const checks:Record<string,unknown>={syntheticPrerequisite:true},errors:string[]=[];
const get=()=>store.get(id),commands=async()=>({requestId:randomUUID(),expectedRevision:(await get()).revision,confirmed:true});
const http=async(path:string,body?:unknown)=>{const response=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{cookie:`alva_session=${session.token}`,'Content-Type':'application/json',origin},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json() as any}};
const pains=(p:Project)=>p.layoutReview!.findings.filter(f=>['coffee-worktop','pet-toy-clearance','plant-daylight'].includes(f.ruleId));
async function pageStart(){
 browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--renderer-process-limit=1']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(20_000);page.on('pageerror',e=>errors.push(e.message));
 await page.context().addCookies([{name:'alva_session',value:session.token,url:origin,httpOnly:true,sameSite:'Strict'}]);await page.goto(origin);await page.getByLabel('咨询消息').waitFor();return page;
}
async function currentPanel(page:Page){const panel=page.locator('[data-action-kind="save_design"] .layout-review-panel');await panel.locator('[data-review-current="true"]').waitFor();return panel}
async function model(text:string,names:string[]){
 assert.ok(process.env.OPENAI_API_KEY,'Authorized model environment required');
 const p=await get(),before=p.messages.length;
 const response=await fetch(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',cookie:`alva_session=${session.token}`,origin},body:JSON.stringify({requestId:randomUUID(),expectedRevision:p.revision,text,roomId:null,model:'gemini-3.8-flash-high'}),signal:AbortSignal.timeout(180_000)});
 const body=await response.text();await writeFile(resolve(root,run+'-sse.txt'),body);assert.equal(response.status,200,body);assert.ok(body.includes('event: done'),body);
 const after=await get(),assistant=after.messages.slice(before).find(m=>m.role==='assistant');assert.equal(assistant?.status,'completed',assistant?.text);
 for(const name of names)assert.ok(assistant!.toolCalls?.some(t=>t.name===name&&!t.isError),`Missing successful ${name}: ${assistant!.text}`);
 checks.toolCalls=assistant!.toolCalls;checks.reply=assistant!.text;return after;
}
try{
 if(step==='seed'){
  const result=await http('/save',await commands());assert.equal(result.status,422);assert.equal(result.data.code,'REVIEW_REQUIRED');assert.equal((await store.versions(id)).length,0);checks.noReviewSaveRejected=result.data;
 }else if(step==='context-model'){
  await model('我的真实原话是“每天做咖啡，家里养狗，喜欢绿植与明亮采光。”请将引号里的原话合为一条 habits 分类候选，范围是整个合成客厅。用 propose_user_context 和这次消息的真实证据ID，不要拆成多条，不要填问卷、不要生成家具或保存，等我点击确认。',['propose_user_context']);
  assert.equal((await get()).userContextEntries?.filter(e=>e.status==='pending').length,1);
 }else if(step==='context-confirm'){
  const page=await pageStart();await page.getByRole('button',{name:'确认分类',exact:true}).click();await page.getByRole('button',{name:'确认分类',exact:true}).waitFor({state:'hidden'});
  const p=await get(),context=await readUserContextProjection(p);assert.ok(context.entries.some(e=>e.status==='confirmed'));
  checks.markdownConfirmed=context.entries.filter(e=>e.status==='confirmed').map(e=>({category:e.category,quote:e.quote}));await page.screenshot({path:resolve(out,'confirmed.png')});
 }else if(step==='review-model'||step==='negative-review-model'){
  const p=await model('请实际 read_user_context 读取已确认分类的Markdown，然后 run_layout_review 复核当前布局，最后 request_save 出示保存确认卡供我查看问题和取舍。不要修改设计、不要替我确认。请明确区分资料不足和检查通过。',['read_user_context','run_layout_review','request_save']);
  assert.equal(pains(p).length,step==='review-model'?3:0);assert.deepEqual(Object.keys(p.layoutReview!.checks).sort(),['behavior','furniture','geometry','navigation','requirement']);checks.findings=p.layoutReview!.findings.map(f=>({ruleId:f.ruleId,objects:f.objectIds,path:f.path}));
 }else if(step==='review-browser'){
  const page=await pageStart(),panel=await currentPanel(page);
  for(const rule of ['coffee-worktop','pet-toy-clearance','plant-daylight','door-route-blocked']){
   await panel.locator(`[data-review-rule="${rule}"]`).getByRole('button',{name:'定位',exact:true}).click();await page.getByTestId('review-location').waitFor();
   if(rule==='door-route-blocked'){await page.getByTestId('review-path').waitFor();assert.equal(await page.locator('[data-review-opening]').count(),2);assert.ok(await page.locator('[data-review-object="barrier"]').count())}
   else assert.ok(await page.locator('[data-review-object]').count());
   await page.screenshot({path:resolve(out,rule+'.png')});
  }
  const reviewed=(await get()).layoutReview!.projectRevision;
  const coffee=panel.locator('[data-review-rule="coffee-worktop"]');await coffee.getByLabel('取舍说明').fill('先保留现有咖啡台，实际设备到场后再补操作面。');await coffee.getByRole('button',{name:'确认保留并记录取舍',exact:true}).click();await panel.getByText('已确认取舍',{exact:false}).first().waitFor();
  await page.locator('[data-action-kind="save_design"]').getByRole('button',{name:'确认保存全局快照',exact:true}).click();
  await page.waitForFunction(()=>document.body.innerText.includes('已保存 · v1'));const p=await get();assert.equal(p.savedVersion,1);assert.equal(p.layoutReviewAdoption!.reviewedRevision,reviewed);assert.equal(p.layoutReviewAdoption!.decisions.length,1);
  const snapshot=await store.snapshot(id,1);assert.deepEqual(snapshot.layoutReviewAdoption,p.layoutReviewAdoption);checks.adoption=p.layoutReviewAdoption;
  await page.reload();await page.getByLabel('咨询消息').waitFor();assert.equal((await get()).savedVersion,1);await page.screenshot({path:resolve(out,'saved-v1.png')});
  const before=await get();const changed=await http('/commands',{...await commands(),changes:[{action:'update',targetId:'table',values:{width:1.2}},{action:'update',targetId:'sofa',values:{clearance:0}},{action:'update',targetId:'plant',values:{height:.8}},{action:'remove',targetId:'barrier',values:{}}]});assert.equal(changed.status,200,JSON.stringify(changed.data));
  await page.reload();await page.getByText('当前布局复核与取舍',{exact:true}).click();const oldPanel=page.locator('aside.chat details .layout-review-panel');await oldPanel.locator('[data-review-current="false"]').waitFor();assert.equal(await oldPanel.getByRole('button',{name:'确认保留并记录取舍',exact:true}).first().isDisabled(),true);
  const stale=await http('/save',await commands());assert.equal(stale.status,409);assert.equal(stale.data.code,'REVIEW_STALE');assert.ok(stale.data.repairActions.length);
  const staleDecision=await http('/layout-review/decide',{...await commands(),reviewId:before.layoutReview!.id,findingId:before.layoutReview!.findings[0].id,decision:'defer',note:'旧审查应拒绝',confirmed:true});assert.equal(staleDecision.status,409);assert.equal(staleDecision.data.code,'REVIEW_STALE');checks.staleSave=stale.data;checks.staleDecision=staleDecision.data;
  assert.equal((await store.versions(id)).length,1);await page.screenshot({path:resolve(out,'stale-layout.png')});
 }else if(step==='repair-model'){
  const p=await model('请先实际调用 request_save 给我保存确认卡；如果服务端说复核过期，就按照它的修复步骤读取Markdown并复核，再重新请求保存。不要绕过门禁、不要修改任何家具、不要代我确认。',['read_user_context','run_layout_review','request_save']);assert.equal(pains(p).length,0);assert.ok(!p.layoutReview!.findings.some(f=>f.ruleId==='door-route-blocked'));checks.fixedPainRules=true;
 }else if(step==='restore-browser'){
  const page=await pageStart();await currentPanel(page);await page.locator('[data-action-kind="save_design"]').getByRole('button',{name:'确认保存全局快照',exact:true}).click();await page.waitForFunction(()=>document.body.innerText.includes('已保存 · v2'));assert.equal((await get()).savedVersion,2);
  const thread=(await store.chatState(id)).threads.living.threadId;
  await page.getByRole('button',{name:'历史',exact:true}).click();const history=page.getByRole('dialog',{name:'保存快照历史'});await history.locator('article').filter({hasText:/^v1 /}).getByRole('button',{name:'只读预览'}).click();await history.getByText('预览保存版本 v1',{exact:true}).waitFor();
  page.once('dialog',dialog=>void dialog.accept());await history.getByRole('button',{name:'明确恢复到工作稿',exact:true}).click();await history.waitFor({state:'hidden'});
  const restored=await get(),snapshot=await store.snapshot(id,1);assert.deepEqual(restored.layoutReviewAdoption,snapshot.layoutReviewAdoption);assert.equal(restored.layoutReviewAdoption!.decisions.length,1);assert.equal((await store.versions(id)).length,2);assert.equal((await store.chatState(id)).threads.living.threadId,thread);checks.restoredAdoption=restored.layoutReviewAdoption;
  await page.reload();await page.getByLabel('咨询消息').waitFor();assert.deepEqual((await get()).layoutReviewAdoption,snapshot.layoutReviewAdoption);await page.screenshot({path:resolve(out,'restored.png')});
 }else if(step==='correction-model'){
  const p=await get(),old=p.userContextEntries!.find(e=>e.status==='confirmed')!;
  await model(`更正以前的生活习惯，新的真实原话是“不喝咖啡，不养宠物，不需要绿植。”请实际提出一条 habits 分类候选，以 supersedesId=${old.id} 更正旧记录。引用这次消息的真实证据，仅提出，不要代我确认、不要保存、不要改家具。`,['propose_user_context']);
  const context=await readUserContextProjection(await get());assert.ok(context.entries.some(e=>e.id===old.id&&e.status==='confirmed'));checks.pendingCorrectionPreservesPrior=true;
 }else if(step==='negative-browser'){
  const page=await pageStart();const panel=await currentPanel(page);assert.equal(await panel.locator('[data-review-rule="coffee-worktop"],[data-review-rule="pet-toy-clearance"],[data-review-rule="plant-daylight"]').count(),0);
  assert.equal((await get()).scene!.items.find(i=>i.id==='table')!.width,.6);assert.equal((await store.versions(id)).length,2);await page.locator('[data-action-kind="save_design"]').getByRole('button',{name:'暂不执行',exact:true}).click();await page.locator('[data-action-kind="save_design"]').waitFor({state:'hidden'});checks.negativeCasesWithoutLayoutChange=true;
  await page.screenshot({path:resolve(out,'negative-cases.png')});
 }else if(step==='saved-state-model'){
  const p=await model('请实际读取 get_snapshot，告诉我当前 savedVersion 的数字，以及是否有手动保存记录。只读，不保存、不修改。',['get_snapshot']);assert.equal(p.savedVersion,2);assert.match(String(checks.reply),/2/);assert.doesNotMatch(String(checks.reply),/没有.{0,10}保存记录|尚未.{0,5}保存|未曾保存/);checks.savedStateAccurate=true;
 }else throw new Error('Unknown step '+step);
 assert.deepEqual(errors,[]);const p=await get();await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,run,step,candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),checks,errors,revision:p.revision,savedVersion:p.savedVersion,threadId:(await store.chatState(id)).threads.living.threadId},null,2));console.log(JSON.stringify({pass:true,run,step,revision:p.revision}));
}catch(error){await writeFile(resolve(out,'result.json'),JSON.stringify({pass:false,run,step,checks,errors,error:String(error)},null,2));throw error}
finally{await browser?.close();await app.close();await store.close()}
