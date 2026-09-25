/** Continue real uploaded-image acceptance; never seeds candidate geometry. */
import assert from 'node:assert/strict';
import {resolve,basename} from 'node:path';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
const root=resolve(process.argv[2]||''),step=process.argv[3];
assert.ok(root.startsWith(resolve('.runtime')+'/')&&basename(root).includes('-ALVA066-floorplan-'));
assert.ok(['prepare-model','topology-confirm','building-model','building-confirm','preview'].includes(step));
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-'+step,out=resolve('evidence',run);await mkdir(out,{recursive:true});
process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_DATA_DIR=resolve(root,'data');process.env.ALVA_UPLOAD_DIR=resolve(root,'uploads');process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;
const {projectId:id}=JSON.parse(await readFile(resolve(root,'run-state.json'),'utf8'));
const store=new AlvaStore(resolve(root,'db'));await store.init();
const probe=createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const address=probe.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>((r,j)=>probe.close(e=>e?j(e):r()));const origin=`http://127.0.0.1:${port}`;process.env.ALVA_PORT=String(port);
const app=await buildAlva(store,{origin});await app.listen({host:'127.0.0.1',port});const access=await store.issueInternalSession(id);let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
try{
 const before=await store.get(id),initialState=await store.chatState(id);assert.equal(before.name,'ALVA-066 real reference floorplan acceptance');
 if(step.endsWith('model')){
  assert.ok(process.env.OPENAI_API_KEY);
  let text:string,names:string[];
  if(step==='prepare-model'){
   assert.ok(before.candidate);const room=before.candidate.rooms.find(r=>/客|living/i.test(r.name))||before.candidate.rooms[0],wall=before.candidate.walls[0];
   const length=Math.hypot(wall.a.x-wall.b.x,wall.a.y-wall.b.y);
   text=`请实际读取快照，通过 edit_topology 将房间 ${room.id} 标注改为“客餐厅（验收标注）”，其余坐标不要改动。随后用 calibrate_floorplan 校准墙 ${wall.id}，长度 ${length} 米。来源必须明确写“隔离验收合成长度，仅测试校准流程，非现场实测”，不得称为真实测量。再 inspect_topology 检查，并 request_topology_confirmation 给我确认卡，不替我确认。`;
   names=['edit_topology','calibrate_floorplan','inspect_topology','request_topology_confirmation'];
  }else{text='请基于刚才由我确认的拓扑实际调用 generate_building 生成建筑3D候选，然后 request_building_confirmation 提供确认卡。不要替我确认或切换阶段；辅助模型失败时如实报告错误。';names=['generate_building','request_building_confirmation'];assert.ok(before.confirmedTopology)}
  const response=await fetch(origin+'/api/chat',{method:'POST',headers:{'Content-Type':'application/json',cookie:`alva_session=${access.token}`,origin},body:JSON.stringify({requestId:randomUUID(),expectedRevision:before.revision,text,roomId:null,model:'gemini-3.1-flash-lite'}),signal:AbortSignal.timeout(630_000)});
  const body=await response.text();await writeFile(resolve(root,run+'-sse.txt'),body);assert.equal(response.status,200);
  const p=await store.get(id),assistant=p.messages.slice(before.messages.length).find(m=>m.role==='assistant');await writeFile(resolve(out,'tool-calls.json'),JSON.stringify(assistant?.toolCalls||[],null,2));
  assert.equal(assistant?.status,'completed',assistant?.text);for(const name of names)assert.ok(assistant?.toolCalls?.some(t=>t.name===name&&!t.isError),`missing ${name}: ${assistant?.text}`);
  assert.equal((await store.chatState(id)).threads.floorplan.threadId,initialState.threads.floorplan.threadId);
  if(step==='prepare-model'){assert.equal(p.confirmedTopology,undefined);assert.ok(p.candidate?.calibration?.confirmed)}else{assert.ok(p.buildingCandidate);assert.equal(p.confirmedBuilding,undefined)}
 }else{
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:1280,height:800}});page.setDefaultTimeout(30_000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.context().addCookies([{name:'alva_session',value:access.token,url:origin,httpOnly:true,sameSite:'Strict'}]);await page.goto(origin);await page.getByLabel('咨询消息').waitFor();
  if(step==='building-confirm'){await page.getByRole('button',{name:'全屋',exact:true}).click();await page.locator('[data-testid="building-canvas"]').waitFor();await page.screenshot({path:resolve(out,'building-before-confirm.png')})}
  if(step!=='preview'){
   const kind=step==='topology-confirm'?'confirm_topology':'confirm_building';const response=page.waitForResponse(r=>r.url().endsWith('/api/chat/actions/confirm'));await page.locator(`[data-action-kind="${kind}"]`).getByRole('button',{name:/确认/}).click();const confirmed=await response;assert.equal(confirmed.status(),200,await confirmed.text());
   const p=await store.get(id);assert.ok(p.confirmedTopology);if(step==='building-confirm'){assert.ok(p.confirmedBuilding);const state=await store.chatState(id);assert.equal(state.active,'living');assert.ok(state.threads.living.threadId);const pending=state.handoffs.filter(h=>h.to==='living'&&!state.threads.living.deliveredIds.includes(h.id));assert.equal(pending.length,0,'Stage entry must deliver handoff immediately')}
   await page.reload();await page.getByLabel('咨询消息').waitFor();
  }
  await page.screenshot({path:resolve(out,step+'.png')});assert.deepEqual(errors,[]);
 }
 const p=await store.get(id),state=await store.chatState(id);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,run,step,privateRun:basename(root),revision:p.revision,stage:state.active,threads:state.threads,topologyVersion:p.confirmedTopology?.version,buildingConfirmed:!!p.confirmedBuilding,calibration:p.candidate?.calibration||p.confirmedTopology?.calibration},null,2));console.log(JSON.stringify({pass:true,run,step}));
}catch(error){await writeFile(resolve(out,'result.json'),JSON.stringify({pass:false,run,step,error:String(error)},null,2));throw error}
finally{await browser?.close();await app.close();await store.close()}
