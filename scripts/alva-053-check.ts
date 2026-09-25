/** ALVA-053 diagnostic replay and explicit live App Server acceptance.
 * Real provider calls are opt-in. No production database, project or credentials
 * file is read; full responses/events remain under this worktree's .runtime. */
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {resolve,relative} from 'node:path';
import {z} from 'zod';
import {runCodex,type CodexInput} from '../api/codex.js';
import {Scene,validateScene} from '../api/model.js';
import {parseLayoutOutput,LayoutOutputError,layoutRepairPrompt} from '../api/import/response.js';
import {VISION_TIMEOUT_MS} from '../api/codex-timeout.js';
import {validateTopology} from '../api/topology/validate.js';
import {analyzeTopology} from '../api/topology/diagnostics.js';
import {rectangleScene,wall,room} from '../tests/fixtures/alva/topology-quality.js';

const sha=(s:string|Buffer)=>createHash('sha256').update(s).digest('hex');
const live=process.argv.includes('--live');
const recordedIndex=process.argv.indexOf('--recorded-native-dir');
const recordedDir=recordedIndex>=0?resolve(process.argv[recordedIndex+1]||''):null;
if(live&&recordedDir)throw new Error('Live App Server and recorded native CLI are distinct checks');
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA053-'+randomUUID().slice(0,6);
const privateDir=resolve('.runtime',runId),outDir=resolve('evidence',runId);
await mkdir(privateDir,{recursive:true,mode:0o700});await mkdir(outDir,{recursive:true});
const safe=(e:unknown)=>{
 let s=e instanceof Error?e.message:String(e);
 for(const key of ['OPENAI_API_KEY','NEWAPI_KEY','MIMO_API_KEY'])if(process.env[key])s=s.replaceAll(process.env[key]!,'[REDACTED]');
 return s.replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').replace(/https?:\/\/\S+/g,'[endpoint]').slice(0,1800);
};
const report:Record<string,any>={ticket:'ALVA-053',runId,sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),startedAt:new Date().toISOString(),live,productionMutations:false,privateEvidence:relative(process.cwd(),privateDir),sourceFiles:{}};
for(const f of ['api/codex.ts','api/import.ts','api/import/response.ts','api/codex-timeout.ts','api/model.ts','api/topology/validate.ts','api/topology/diagnostics.ts','scripts/alva-053-check.ts'])report.sourceFiles[f]=sha(await readFile(f));
const outcome=(fn:()=>unknown)=>{try{fn();return {accepted:true}}catch(e){return {accepted:false,error:safe(e)}}};
const cases:Record<string,ReturnType<typeof rectangleScene>>={};
const t=rectangleScene();t.walls=[wall('horizontal',0,0,10,0),wall('vertical',5,0,5,4)];t.rooms=[];t.openings=[];t.calibration=null;
cases['T-junction forward']=t;cases['T-junction reverse']={...t,walls:[...t.walls].reverse()};
const overlap={...t,walls:[wall('short',2,0,4,0),wall('long',0,0,10,0)]};
cases['contained overlap forward']=overlap;cases['contained overlap reverse']={...overlap,walls:[...overlap.walls].reverse()};
const gap=rectangleScene();gap.walls[0].a.x=.04;cases['4cm boundary gap']=gap;
const rooms=rectangleScene();rooms.rooms.push(room('overlap',[[1,1],[4,1],[4,3],[1,3]]));cases['room overlap']=rooms;
report.replay=Object.entries(cases).map(([name,scene])=>({name,synthetic:true,import:outcome(()=>validateScene(scene)),confirmation:outcome(()=>validateTopology(scene)),diagnosticCodes:analyzeTopology(scene).issues.map(i=>i.code)}));
report.orderInvariant=report.replay[0].confirmation.accepted===report.replay[1].confirmation.accepted&&report.replay[2].confirmation.accepted===report.replay[3].confirmation.accepted;
const sourcePath=resolve('references/room-study-handoff/public/floorplan.png'),image=await readFile(sourcePath),source=await readFile('api/import.ts','utf8');
report.image={path:relative(process.cwd(),sourcePath),sha256:sha(image),bytes:image.length,kind:'repository original, NOT the latest annotated screenshot original'};
const prompt=source.match(/runCodex\(\{text:`([\s\S]*?)`,images:/)?.[1];
if(!prompt)throw new Error('Current import prompt cannot be frozen unambiguously');
const schema=z.toJSONSchema(Scene);
function strict(node:any){if(!node||typeof node!=='object')return;if(node.properties){node.required=Object.keys(node.properties);node.additionalProperties=false}delete node.default;for(const v of Object.values(node))if(Array.isArray(v))v.forEach(strict);else strict(v)}
strict(schema);report.promptSha256=sha(prompt);report.schemaSha256=sha(JSON.stringify(schema));
await writeFile(resolve(privateDir,'frozen-prompt.txt'),prompt,{mode:0o600});
await writeFile(resolve(privateDir,'schema.json'),JSON.stringify(schema,null,2),{mode:0o600});

if(recordedDir){
 const execution=JSON.parse(await readFile(resolve(recordedDir,'execution.json'),'utf8'));
 const raw=await readFile(resolve(recordedDir,'raw-response.txt'),'utf8');
 const events=(await readFile(resolve(recordedDir,'stdout.log'),'utf8')).split('\n').flatMap(line=>{try{return [JSON.parse(line)]}catch{return []}});
 const args:string[]=execution.cmd;
 report.recordedNative={sourceDirectory:recordedDir,execution,profile:args[args.indexOf('--profile')+1],requestedModel:args.includes('--model')?args[args.indexOf('--model')+1]:'profile default',rawOutput:{characters:raw.length,sha256:sha(raw)},tokenUsage:events.filter(e=>e.type==='turn.completed').map(e=>e.usage),transportCompleted:execution.exitCode===0&&events.some(e=>e.type==='turn.completed'),evaluation:'offline replay of preserved live native CLI output, NOT the blocked App Server retest'};
 try{
  const candidate=parseLayoutOutput(raw);const diagnostics=analyzeTopology(candidate);
  report.recordedNative.contractPassed=true;
  report.recordedNative.counts={walls:candidate.walls.length,rooms:candidate.rooms.length,openings:candidate.openings.length};
  report.recordedNative.confirmation=outcome(()=>validateTopology(candidate));
  report.recordedNative.diagnostics={status:diagnostics.status,codes:diagnostics.issues.map(i=>i.code),undefinedAreaM2:diagnostics.measurements.undefinedAreaM2};
 }catch(e){report.recordedNative.contractPassed=false;report.recordedNative.error=safe(e);report.recordedNative.stage=e instanceof LayoutOutputError?e.stage:'unknown'}
}

if(live){
 const model=process.env.ALVA_AUDIT_MODEL;
 if(!model||!process.env.OPENAI_API_KEY)throw new Error('Explicit ALVA_AUDIT_MODEL and environment credential required');
 report.requestedModel=model;report.transport='existing api/codex.ts App Server adapter, not an inherited CLI profile';
 report.upstreamIdentity='unverified beyond gateway response/request metadata';
 const key=process.env.OPENAI_API_KEY,base=process.env.OPENAI_BASE_URL||'https://chat.huiyuanxp.com/v1';
 const before=performance.now();
 try{
  const response=await fetch(base.replace(/\/$/,'')+'/models',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(15000)});
  const data:any=await response.json();
  report.modelDirectory={status:response.status,elapsedMs:performance.now()-before,matchingIds:Array.isArray(data.data)?data.data.map((m:any)=>m.id).filter((id:unknown)=>typeof id==='string'&&/^(mimo-|gemini-3\.8)/.test(id as string)):[],error:response.ok?undefined:safe(data.error?.message||'model directory failed')};
 }catch(e){report.modelDirectory={elapsedMs:performance.now()-before,error:safe(e)}}
 const calls:any[]=[];report.calls=calls;
 async function call(label:string,input:CodexInput){
  const events:unknown[]=[];let deltas=0;const startedAt=new Date().toISOString(),clock=performance.now();
  const row:any={label,model:input.model||model,startedAt,timeoutMs:input.timeoutMs??120_000};calls.push(row);
  try{
   const raw=await runCodex({...input,model:input.model||model,onDelta:()=>deltas++,onEvent:e=>events.push(e)});
   await writeFile(resolve(privateDir,label+'-raw.txt'),raw,{mode:0o600});row.output={characters:raw.length,sha256:sha(raw)};row.ok=true;
   return raw;
  }catch(e){row.ok=false;row.error=safe(e);throw e}
  finally{
   row.finishedAt=new Date().toISOString();row.elapsedMs=performance.now()-clock;row.nonemptyDeltas=deltas;
   row.tokenEvents=(events as any[]).filter(e=>e.method==='thread/tokenUsage/updated').map(e=>e.params?.tokenUsage);
   row.protocolEventCounts=(events as any[]).reduce((a:Record<string,number>,e)=>{a[e.method]=(a[e.method]||0)+1;return a},{});
   await writeFile(resolve(privateDir,label+'-events.json'),JSON.stringify(events,null,2),{mode:0o600});
  }
 }
 let toolCalls=0;
 try{
  const raw=await call('tool-stream',{text:'调用只读工具 alva_probe_echo 一次，value必须等于ALVA053_INPUT。读取工具返回的receipt，然后只回复这个receipt，不调用任何其他工具。',tools:[{name:'alva_probe_echo',description:'Synthetic read-only acceptance tool. No production data.',inputSchema:{type:'object',properties:{value:{type:'string'}},required:['value'],additionalProperties:false},run:async(args:any)=>{if(args?.value!=='ALVA053_INPUT')throw new Error('unexpected tool argument');toolCalls++;return {receipt:'ALVA053_TOOL_VERIFIED'}}}]});
  report.toolAcceptance={toolCalls,passed:toolCalls===1&&raw.includes('ALVA053_TOOL_VERIFIED')&&calls.at(-1).nonemptyDeltas>=2};
 }catch(e){report.toolAcceptance={toolCalls,passed:false,error:safe(e)}}
 // Retest the old alias only when the current platform still lists it. Its
 // failure must not silently fall back to another model or invalidate MiMo.
 const oldAlias=report.modelDirectory?.matchingIds?.find((id:string)=>id==='gemini-3.8-flash-high');
 if(oldAlias){
  try{await call('legacy-gemini-route',{model:oldAlias,text:'只回复ALVA053_ROUTE_OK'});report.legacyGemini={listed:true,transportPassed:true}}
  catch(e){report.legacyGemini={listed:true,transportPassed:false,error:safe(e),activeRouteUnchanged:true}}
 }else report.legacyGemini={listed:false,requested:false,activeRouteUnchanged:true};
 try{
  const raw=await call('vision-first',{text:prompt,images:['data:image/png;base64,'+image.toString('base64')],outputSchema:schema,timeoutMs:VISION_TIMEOUT_MS});
  let candidate;
  try{candidate=parseLayoutOutput(raw);report.vision={attempts:1,contractPassed:true}}
  catch(error){
   if(!(error instanceof LayoutOutputError))throw error;
   report.firstContractFailure={stage:error.stage,error:safe(error)};
   const repaired=await call('vision-one-repair',{text:layoutRepairPrompt(raw,error),images:['data:image/png;base64,'+image.toString('base64')],outputSchema:schema,timeoutMs:VISION_TIMEOUT_MS});
   candidate=parseLayoutOutput(repaired);report.vision={attempts:2,contractPassed:true};
  }
  await writeFile(resolve(privateDir,'candidate.json'),JSON.stringify(candidate,null,2),{mode:0o600});
  report.vision.counts={walls:candidate.walls.length,rooms:candidate.rooms.length,openings:candidate.openings.length};
  report.vision.confirmation=outcome(()=>validateTopology(candidate));
  const diagnostics=analyzeTopology(candidate);report.vision.diagnostics={status:diagnostics.status,codes:diagnostics.issues.map(i=>i.code),undefinedAreaM2:diagnostics.measurements.undefinedAreaM2};
 }catch(e){report.vision={contractPassed:false,error:safe(e),attempts:calls.filter(c=>c.label.startsWith('vision')).length}}
}
report.completedAt=new Date().toISOString();report.acceptancePassed=report.orderInvariant&&(!live||(report.toolAcceptance?.passed&&report.vision?.contractPassed))&&(!recordedDir||(report.recordedNative.transportCompleted&&report.recordedNative.contractPassed));
report.boundaries=['not a production import or deployment','no latest screenshot/source association or ground-truth accuracy claim','diagnostic findings are not silently repaired or confirmed','legacy Gemini availability is recorded, not required by the active MiMo route'];
await writeFile(resolve(outDir,'result.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));if(!report.acceptancePassed)process.exitCode=1;
