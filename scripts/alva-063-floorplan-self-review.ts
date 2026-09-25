import {spawn} from 'node:child_process';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createInterface} from 'node:readline';
import {chromium,expect} from '@playwright/test';
import {recognizeLayout,normalizeStructuredOutput} from '../api/import.js';
import {parseLayoutOutput,layoutRepairPrompt,LayoutOutputError} from '../api/import/response.js';
import {validateScene,type SceneData} from '../api/model.js';
import {validateTopology} from '../api/topology/validate.js';
import {analyzeTopology} from '../api/topology/diagnostics.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {CodexInput} from '../api/codex.js';

const model='gemini-3.8-flash-high';
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA063-selfreview-'+randomUUID().slice(0,6);
const privateDir=resolve('.runtime',runId),evidenceDir=resolve('evidence',runId);
await mkdir(privateDir,{recursive:true,mode:0o700});await mkdir(evidenceDir,{recursive:true});
const source=await readFile('references/room-study-handoff/public/floorplan.png');
const sourceUrl=`data:image/png;base64,${source.toString('base64')}`;
const skill=await readFile('docs/skills/alva-floorplan-self-review/SKILL.md','utf8');
const sha=(value:Uint8Array|string)=>createHash('sha256').update(value).digest('hex');
let captured:CodexInput|undefined;
try{await recognizeLayout(sourceUrl,undefined,undefined,async input=>{captured=input;throw new Error('capture-prompt')})}catch(error){if(String(error)!=='Error: capture-prompt')throw error}
if(!captured)throw new Error('layout prompt unavailable');
if(!process.env.NEWAPI_KEY)throw new Error('NEWAPI_KEY missing');
const key=process.env.NEWAPI_KEY;
const work=resolve(privateDir,'agent');await mkdir(work,{recursive:true,mode:0o700});
const home=resolve(work,'config');await mkdir(home,{mode:0o700});
const args=['app-server','--listen','stdio://','-c','model_provider="alva"','-c','model_reasoning_effort="high"','-c','model_providers.alva.name="Alva"','-c','model_providers.alva.base_url="https://chat.huiyuanxp.com/v1"','-c','model_providers.alva.env_key="OPENAI_API_KEY"','-c','model_providers.alva.wire_api="responses"','-c','project_doc_max_bytes=0','-c','features.shell_tool=false','-c','features.apply_patch_freeform=false','-c','features.multi_agent=false','-c','web_search="disabled"','-c','mcp_servers={}'];
const child=spawn('codex',args,{cwd:work,env:{PATH:process.env.PATH,HOME:process.env.HOME,CODEX_HOME:home,OPENAI_API_KEY:key},stdio:['pipe','pipe','pipe']});
let sequence=0,threadId='',diagnostic='',currentTurn:{id:string;final:string;resolve:(value:string)=>void;reject:(error:Error)=>void}|undefined;
const pending=new Map<number,{resolve:(value:any)=>void;reject:(error:Error)=>void}>();
const send=(value:unknown)=>child.stdin.write(JSON.stringify(value)+'\n');
const rpc=(method:string,params:unknown)=>new Promise<any>((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});send({id,method,params})});
const lines=createInterface({input:child.stdout});
lines.on('line',line=>{let event:any;try{event=JSON.parse(line)}catch{return}
 if(event.id!==undefined&&pending.has(event.id)&&!event.method){const p=pending.get(event.id)!;pending.delete(event.id);event.error?p.reject(new Error(event.error.message||'Codex protocol error')):p.resolve(event.result);return}
 if(event.method==='item/completed'&&event.params?.item?.type==='agentMessage'&&currentTurn)currentTurn.final=event.params.item.text;
 if(event.method==='turn/completed'&&currentTurn){const active=currentTurn;currentTurn=undefined;event.params.turn.status==='completed'?active.resolve(active.final):active.reject(new Error(event.params.turn.error?.message||`turn ${event.params.turn.status}`))}
 if(event.id!==undefined&&event.method)send({id:event.id,error:{code:-32601,message:'No tools in this review session'}});
});
child.stderr.on('data',data=>{diagnostic=(diagnostic+String(data)).slice(-1500).replaceAll(key,'[REDACTED]')});
child.on('exit',code=>{const error=new Error(`Codex exited ${code}: ${diagnostic}`);currentTurn?.reject(error);for(const p of pending.values())p.reject(error);pending.clear()});
const turns:{kind:string;turnId:string;threadId:string}[]=[];
async function turn(kind:string,text:string,images:string[],outputSchema?:unknown){
 let finish!:(value:string)=>void,fail!:(error:Error)=>void;
 const completed=new Promise<string>((resolve,reject)=>{finish=resolve;fail=reject});
 currentTurn={id:'',final:'',resolve:finish,reject:fail};
 const started=await rpc('turn/start',{threadId,input:[{type:'text',text},...images.map(url=>({type:'image',url}))],...(outputSchema?{outputSchema}:{})});
 currentTurn.id=started.turn.id;turns.push({kind,turnId:started.turn.id,threadId});
 const timeout=setTimeout(()=>fail(new Error(`${kind} timed out`)),600000);
 try{return await completed}finally{clearTimeout(timeout);currentTurn=undefined}
}
function adaptShape(raw:string):SceneData{
 const text=normalizeStructuredOutput(raw);const value=JSON.parse(text);
 const {walls,rooms,doors,windows,items,calibration,latitude,north,assumption}=value;
 if(!Array.isArray(walls)||!Array.isArray(rooms)||!Array.isArray(doors)||!Array.isArray(windows)||!Array.isArray(items)||items.length||calibration!==null)throw new Error('unsupported generated shape');
 return parseLayoutOutput(JSON.stringify({walls,rooms:rooms.map((room:Record<string,unknown>)=>({...room,purpose:room.purpose??room.name})),openings:[...doors.map((opening:Record<string,unknown>)=>({...opening,kind:'door'})),...windows.map((opening:Record<string,unknown>)=>({...opening,kind:'window'}))],items,calibration,geography:{latitude,north,assumption}}));
}
let app:Awaited<ReturnType<typeof buildAlva>>|undefined,store:AlvaStore|undefined,browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const report:Record<string,unknown>={runId,model,sourceSha256:sha(source),skillPath:'docs/skills/alva-floorplan-self-review/SKILL.md',startedAt:new Date().toISOString(),turns};
try{
 await rpc('initialize',{clientInfo:{name:'alva-self-review',version:'0.1.0'},capabilities:{experimentalApi:true}});send({method:'initialized',params:{}});
 const started=await rpc('thread/start',{model,modelProvider:'alva',cwd:work,ephemeral:true,approvalPolicy:'never',sandbox:'read-only',environments:[],runtimeWorkspaceRoots:[],baseInstructions:'You are Alva floor-plan recognition assistant. Use only the supplied images and instructions. No tools or file access. Never claim a layout is confirmed.',dynamicTools:[]});
 threadId=started.thread.id;report.threadId=threadId;
 let raw=await turn('generate',`${captured.text}\n\n生成完成后，我会把本轮候选的平面截图作为下一轮输入发回同一会话。届时请按项目 Skill alva-floorplan-self-review 自查；先完成本轮 JSON。`,[sourceUrl],captured.outputSchema);
 await writeFile(resolve(privateDir,'raw-generation-1.txt'),raw,{mode:0o600});
 let scene:SceneData|undefined,contract='native';
 try{scene=parseLayoutOutput(normalizeStructuredOutput(raw))}catch(error){
  if(!(error instanceof LayoutOutputError))throw error;
  raw=await turn('repair',layoutRepairPrompt(raw,error),[sourceUrl],captured.outputSchema);
  await writeFile(resolve(privateDir,'raw-generation-2.txt'),raw,{mode:0o600});
  try{scene=parseLayoutOutput(normalizeStructuredOutput(raw))}catch(second){contract='preview-field-map';scene=adaptShape(raw)}
 }
 scene=validateScene(scene);
 await writeFile(resolve(privateDir,'candidate.json'),JSON.stringify(scene,null,2),{mode:0o600});
 let topologyError='';try{validateTopology(scene)}catch(error){topologyError=String(error)}
 const diagnostics=analyzeTopology(scene);
 Object.assign(report,{contract,candidateSha256:sha(JSON.stringify(scene)),counts:{walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length},topologyError,diagnostics:{status:diagnostics.status,issues:diagnostics.issues.length,undefinedAreaM2:diagnostics.measurements.undefinedAreaM2,wallComponents:diagnostics.measurements.wallComponents}});
 const dataDir=resolve(privateDir,'preview-data');store=new AlvaStore(resolve(dataDir,'db'));await mkdir(dataDir,{recursive:true,mode:0o700});await store.init();
 const created=await store.create('Gemini 3.8 同会话自查预览');const accessCode=randomBytes(24).toString('base64url');process.env.ALVA_ACCESS_CODE=accessCode;await store.ensureAccessCode(created.project.id);
 await store.mutate(created.project.id,randomUUID(),created.project.revision,'selfreview-preview',{runId},project=>{project.candidate=scene!;project.sourceImage={mime:'image/png',data:source.toString('base64'),originalMime:'image/png',filename:'floorplan.png'};project.importState={status:'succeeded',message:'Gemini 3.8 自查候选，待人工校核。',requestId:randomUUID(),sourceMime:'image/png',filename:'floorplan.png',provider:'codex',model,startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()}});
 process.env.ALVA_ORIGIN='http://127.0.0.1:4263';app=await buildAlva(store);await app.listen({host:'127.0.0.1',port:4263});
 browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:4263');await page.getByPlaceholder('输入项目发起人提供的验证码').fill(accessCode);await page.getByRole('button',{name:'验证并进入 →',exact:true}).click();
 await expect(page.locator('svg').first()).toBeVisible();
 const svgIndex=await page.locator('svg').evaluateAll(nodes=>nodes.map((node,index)=>({index,area:node.getBoundingClientRect().width*node.getBoundingClientRect().height})).sort((a,b)=>b.area-a.area)[0]?.index);
 if(svgIndex===undefined)throw new Error('plan SVG absent');
 const screenshot=await page.locator('svg').nth(svgIndex).screenshot({path:resolve(evidenceDir,'plan-only.png')});
 report.screenshotSha256=sha(screenshot);report.screenshotKind='largest visible plan SVG';
 const screenshotUrl=`data:image/png;base64,${screenshot.toString('base64')}`;
 const reviewPrompt=`请显式调用并遵循以下项目 Skill；它未安装在标准 Skill 目录，因此全文随 prompt 提供。以下第一张图是原始户型图，第二张是你刚生成的候选渲染出的平面截图。只对照平面，不评价全屋 3D。\n\n${skill}\n\n请自查刚才同一会话生成的候选，按 Skill 输出 JSON。`;
 const review=await turn('self-review',reviewPrompt,[sourceUrl,screenshotUrl]);
 await writeFile(resolve(privateDir,'self-review-raw.txt'),review,{mode:0o600});
 const parsedReview=JSON.parse(normalizeStructuredOutput(review));
 if(!['match','mismatch','uncertain'].includes(parsedReview.overall)||!Array.isArray(parsedReview.findings)||typeof parsedReview.needsHumanReview!=='boolean')throw new Error('self-review contract invalid');
 await writeFile(resolve(evidenceDir,'review.json'),JSON.stringify(parsedReview,null,2));
 report.reviewRawSha256=sha(review);report.reviewOverall=parsedReview.overall;report.reviewFindingCount=parsedReview.findings.length;report.review=review;
 report.sameThread=turns.length>=2&&turns.every(item=>item.threadId===threadId);
 report.ok=true;
}catch(error){report.ok=false;report.error=String(error).slice(0,1200)}
finally{report.finishedAt=new Date().toISOString();await writeFile(resolve(privateDir,'result.json'),JSON.stringify(report,null,2),{mode:0o600});const publicReport={...report};delete publicReport.review;delete publicReport.threadId;await writeFile(resolve(evidenceDir,'result.json'),JSON.stringify(publicReport,null,2));await browser?.close().catch(()=>{});await app?.close().catch(()=>{});await store?.close().catch(()=>{});lines.close();child.kill('SIGTERM');}
console.log(JSON.stringify({...report,review:typeof report.review==='string'?String(report.review).slice(0,3000):undefined}));if(!report.ok)process.exitCode=1;
