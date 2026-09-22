import {chromium,expect,devices} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {createHash,randomUUID,randomBytes} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {DomainError} from '../api/model.js';
import {annotatedFailureScene,rectangleScene} from '../tests/fixtures/alva/topology-quality.js';

const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA055-browser-'+randomUUID().slice(0,6);
const dir='evidence/'+runId,origin='http://127.0.0.1:4195';
await mkdir(dir,{recursive:true});
const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-055 三类错误 · 合成验证，不是模型输出');await store.ensureAccessCode(project.id);
await store.mutate(project.id,randomUUID(),0,'synthetic-fixture',{},p=>{p.scene=rectangleScene();p.candidate=annotatedFailureScene()});
const app=await buildAlva(store,{origin});let failNextDiagnostics=false;
app.addHook('onRequest',async req=>{if(req.url==='/api/topology/diagnostics'&&failNextDiagnostics){failNextDiagnostics=false;throw new DomainError(503,'ALVA-055 isolated diagnostic failure')}});
await app.listen({host:'127.0.0.1',port:4195});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1050}});
const session=await store.issueInternalSession(project.id);const cookie={name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'};
await context.addCookies([cookie]);const page=await context.newPage();
const errors:string[]=[],expectedFaults:string[]=[],expectedRejections:string[]=[],checks:string[]=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('console',m=>{
 if(m.type()!=='error')return;
 if(m.text().includes('503')&&m.location().url.includes('/api/topology/diagnostics'))expectedFaults.push(m.text());
 else if(m.text().includes('422')&&m.location().url.includes('/api/candidate/topology'))expectedRejections.push(m.text());
 else errors.push(m.text());
});
const initial=JSON.stringify(await store.get(project.id)),saved=await store.versions(project.id);
try{
 await page.goto(origin);const panel=page.getByRole('region',{name:'拓扑质量检查'});
 await expect(panel.getByText('核对墙、门窗与空间。')).toBeVisible();
 for(const code of ['internal_void','unreasonable_skew','isolated_component'])await expect(page.locator(`[data-warning-code="${code}"]`).first()).toBeVisible();
 checks.push('real API reports all three synthetic error classes in the existing UI');
 await page.screenshot({path:dir+'/overview.png',fullPage:true});
 const svg=page.getByLabel('可校正二维户型图'),full=await svg.getAttribute('viewBox');
 for(const code of ['internal_void','unreasonable_skew','isolated_component']){
  const button=page.locator(`[data-warning-code="${code}"]`).first();await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
  await expect(page.locator(`[data-diagnostic-marker="${code}"][data-active="true"]`).first()).toBeVisible();
  if(await svg.getAttribute('viewBox')===full)throw new Error('warning selection did not locate its bounds');
  await page.screenshot({path:`${dir}/${code}.png`,fullPage:true});
  await panel.getByRole('button',{name:'显示完整平面'}).click();await expect(svg).toHaveAttribute('viewBox',full!);
 }
 checks.push('each category selects its entities, highlights geometry and zooms; full-plan reset works');
 await page.reload();await expect(page.locator('[data-warning-code="internal_void"]').first()).toBeVisible();
 if(JSON.stringify(await store.get(project.id))!==initial)throw new Error('read-only report changed project');
 checks.push('reload recomputes warnings without changing project revision, source or confirmed scene');
 failNextDiagnostics=true;await page.reload();await expect(panel.getByRole('alert')).toContainText('拓扑检查未完成');
 await expect(page.locator('[data-warning-code]')).toHaveCount(0);
 await panel.getByRole('button',{name:'重新检查拓扑'}).click();await expect(page.locator('[data-warning-code="internal_void"]').first()).toBeVisible();
 checks.push('real service fault is not reported as zero warnings; retry invokes the real handler');
 await page.locator('[data-warning-code="isolated_component"]').first().click();
 await page.getByRole('button',{name:'移除误识别墙',exact:true}).click();
 // The isolated wall has a window. Existing protection must refuse deletion, not silently remove it.
 await expect(page.getByRole('alert').filter({hasText:/门窗/})).toBeVisible();
 checks.push('warning location preserves existing opening-reference deletion protection');
 const current=await store.get(project.id);
 const corrected=await page.request.post(origin+'/api/candidate/correct',{data:{requestId:randomUUID(),expectedRevision:current.revision,scene:rectangleScene()}});
 if(corrected.status()!==200)throw new Error('real candidate correction API failed');
 await page.reload();await expect(panel.getByText('本次规则未发现问题，仍需对照原图核对。')).toBeVisible();await expect(page.locator('[data-warning-code]')).toHaveCount(0);
 checks.push('real correction followed by reload clears warnings for normal control');
 const final=await store.get(project.id);if(JSON.stringify(final.scene)!==JSON.stringify(JSON.parse(initial).scene))throw new Error('candidate edit overwrote confirmed scene');
 if(JSON.stringify(await store.versions(project.id))!==JSON.stringify(saved))throw new Error('diagnostics or candidate edits created snapshot');
 await page.screenshot({path:dir+'/normal-control.png',fullPage:true});
 const narrow=await browser.newContext({...devices['iPhone 13']});await narrow.addCookies([cookie]);const mobile=await narrow.newPage();await mobile.goto(origin);
 const narrowPanel=mobile.getByRole('region',{name:'拓扑质量检查'});await expect(narrowPanel.getByText('本次规则未发现问题，仍需对照原图核对。')).toBeVisible();
 const fits=await narrowPanel.evaluate(el=>el.scrollWidth<=el.clientWidth+1);if(!fits)throw new Error('new diagnostic panel overflows at device width');
 await mobile.screenshot({path:dir+'/narrow.png',fullPage:true});await narrow.close();checks.push('new panel fits actual mobile device emulation');
 if(errors.length)throw new Error(errors.join('\n'));
 if(expectedFaults.length!==1||expectedRejections.length!==1)throw new Error('expected one injected 503 and one protected 422 rejection');
 const fingerprintFiles=['api/api.ts','api/model.ts','api/store.ts','api/topology/diagnostics.ts','api/topology/planar-graph.ts','api/topology/routes.ts','api/topology/validate.ts','packages/contracts/alva/topology-diagnostics.ts','web/src/main.tsx','web/src/topology/Diagnostics.tsx','web/src/topology/diagnostics.css','tests/fixtures/alva/topology-quality.ts','scripts/alva-topology-quality-browser.ts','package-lock.json'];
 const digest=createHash('sha256');for(const file of fingerprintFiles){digest.update(file);digest.update(await readFile(file))}
 const report={ticket:'ALVA-055',runId,pass:true,finishedAt:new Date().toISOString(),sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sourceFingerprint:digest.digest('hex'),fingerprintFiles,fixtureSha256:createHash('sha256').update(JSON.stringify(annotatedFailureScene())).digest('hex'),fixtureKind:'synthetic error reproduction; not user image or model output',checks,errors,expectedFaults,expectedRejections};
 await writeFile(dir+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify({runId,pass:true,checks},null,2));
}catch(error){await page.screenshot({path:dir+'/failure.png',fullPage:true});await writeFile(dir+'/result.json',JSON.stringify({ticket:'ALVA-055',runId,pass:false,checks,error:String(error),errors,expectedFaults},null,2));console.error(dir);throw error}
finally{await browser.close();await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
