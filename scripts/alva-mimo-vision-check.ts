/** One explicit inference through the native MiMo profile; first attempt by default.
 * No production state, login files, automatic repair or provider-key transfer. */
import {spawn,execFileSync} from 'node:child_process';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,relative,basename,dirname} from 'node:path';
import {z} from 'zod';
import {Scene,validateScene} from '../api/model.js';
import {normalizeStructuredOutput} from '../api/import.js';
import {parseLayoutOutput,LayoutOutputError,layoutRepairPrompt} from '../api/import/response.js';
import {validateTopology} from '../api/topology/validate.js';
import {analyzeTopology} from '../api/topology/diagnostics.js';
import {classifyMiMoFailure,redactProbeError,summarizeMiMoOutcome,freezeImportPrompt,verifyMiMoRepairSource} from './lib/mimo-probe.js';
import {readMiMoProfile,selectMiMoModel,buildMiMoArgs,probeTimeoutMs} from './lib/mimo-profile.js';

const sha=(data:string|Buffer)=>createHash('sha256').update(data).digest('hex');
const probeStartedClock=performance.now();
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA056-mimo-'+randomUUID().slice(0,6);
const root=process.cwd(),privateDir=resolve('.runtime',runId),outDir=resolve('evidence',runId);
await mkdir(privateDir,{recursive:true,mode:0o700});await mkdir(outDir,{recursive:true});
const profile=process.env.ALVA_VISION_PROBE_PROFILE||'mimo';
const report:Record<string,any>={ticket:'ALVA-056',runId,sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),profile,startedAt:new Date().toISOString(),attempts:0,automaticRepair:false,phases:{},productionMutations:false,transportCompleted:false,rawOutput:{characters:0,sha256:sha('')},rawEvidence:relative(root,privateDir)};
let failureStage='source';let redact=(s:string)=>redactProbeError(s);
try{
 const imagePath=resolve(process.argv[2]||'references/room-study-handoff/public/floorplan.png');
 const image=await readFile(imagePath),source=await readFile('api/import.ts','utf8');
 if(image.length>20_000_000)throw new Error('Probe image exceeds20MB');
 const importPrompt=freezeImportPrompt(source);let prompt=importPrompt;
 let repairProvenance:unknown;let repairRunId:string|undefined;
 report.attemptKind='first-attempt';report.importPromptSha256=sha(importPrompt);
 if(process.env.ALVA_VISION_PROBE_REPAIR_FROM){
  const previous=resolve(process.env.ALVA_VISION_PROBE_REPAIR_FROM),rel=relative(root,previous);
  if(!/^\.runtime\/[A-Za-z0-9_-]+\/raw-response\.txt$/.test(rel))throw new Error('Explicit repair source must be a private raw-response.txt from this worktree');
  repairRunId=basename(dirname(previous));
  repairProvenance=JSON.parse(await readFile(resolve('evidence',repairRunId,'result.json'),'utf8'));
  const prior=await readFile(previous,'utf8');let failure:LayoutOutputError|undefined;
  try{parseLayoutOutput(normalizeStructuredOutput(prior))}catch(e){if(e instanceof LayoutOutputError)failure=e;else throw e}
  if(!failure)throw new Error('Explicit repair source already passes the import output contract');
  prompt=layoutRepairPrompt(prior,failure);report.attemptKind='explicit-single-repair-followup';report.repairSource={path:rel,sha256:sha(prior),stage:failure.stage};
 }
 const schema=z.toJSONSchema(Scene);
 function strict(value:any){if(!value||typeof value!=='object')return;if(value.properties){value.required=Object.keys(value.properties);value.additionalProperties=false}delete value.default;for(const child of Object.values(value))if(Array.isArray(child))child.forEach(strict);else strict(child)}
 strict(schema);
 const requestedMode=process.env.ALVA_VISION_PROBE_OUTPUT_MODE||'json-schema';
 const outputMode=requestedMode==='json-object'?'schema-in-prompt':requestedMode;
 if(outputMode!=='json-schema'&&outputMode!=='schema-in-prompt')throw new Error('Unsupported probe output mode');
 if(process.env.ALVA_VISION_PROBE_ROUTE&&process.env.ALVA_VISION_PROBE_ROUTE!=='configured-codex')throw new Error('This recovery probe uses the configured native profile only; legacy direct-provider probes remain in commit0d7ea5f');
 const schemaText=JSON.stringify(schema,null,2),schemaPath=resolve(privateDir,'output-schema.json'),lastMessage=resolve(privateDir,'raw-response.txt');
 if(repairRunId){
  verifyMiMoRepairSource(repairProvenance,{runId:repairRunId,imageSha256:sha(image),rawSha256:report.repairSource.sha256,schemaSha256:sha(schemaText)});
  report.repairSource.runId=repairRunId;report.repairSource.provenanceVerified=true;
 }
 const effectivePrompt=outputMode==='schema-in-prompt'?`${prompt}\n\n输出schema（只作JSON对象结构约束；返回纯JSON对象，不要Markdown围栏）：\n${schemaText}`:prompt;
 await writeFile(schemaPath,schemaText,{mode:0o600});await writeFile(resolve(privateDir,'prompt.txt'),prompt,{mode:0o600});await writeFile(resolve(privateDir,'effective-prompt.txt'),effectivePrompt,{mode:0o600});
 report.source={path:relative(root,imagePath),sha256:sha(image),bytes:image.length,kind:process.argv[2]?'explicit supplied source; origin must be reviewed':'repository original; NOT the latest annotated screenshot original'};
 Object.assign(report,{frozenPromptSha256:sha(prompt),effectivePromptSha256:sha(effectivePrompt),schemaSha256:sha(schemaText),importSourceSha256:sha(source),requestedOutputMode:requestedMode,outputMode,route:'configured-codex',schemaInPromptIsNotApiJsonObjectMode:true});
 report.sourceFiles={};for(const f of ['scripts/alva-mimo-vision-check.ts','scripts/lib/mimo-profile.ts','scripts/lib/mimo-probe.ts','api/import/response.ts','api/codex-timeout.ts','api/model.ts','api/topology/validate.ts','api/topology/diagnostics.ts'])report.sourceFiles[f]=sha(await readFile(f));
 failureStage='configuration';const metadata=readMiMoProfile(profile),modelOverride=process.env.ALVA_VISION_PROBE_MODEL;
 report.profileMetadata=metadata;report.requestedModel=selectMiMoModel(metadata,modelOverride);
 report.modelSelection=modelOverride?'explicit model within profile catalog':'profile default, no CLI model override';
 redact=s=>redactProbeError(s,[process.env[metadata.envKey]||'']);
 report.codexVersion=execFileSync('codex',['--version'],{encoding:'utf8'}).trim();
 report.credentialHandling='native configured Codex environment authentication; metadata only, no login files or key values copied';
 report.upstreamProvider='unverified; requested profile/model and client catalog are not independent provider identity evidence';
 const timeoutMs=probeTimeoutMs(process.env.ALVA_VISION_PROBE_TIMEOUT_MS);
 const args=buildMiMoArgs({metadata,modelOverride,privateDir,imagePath,lastMessage,schemaPath,outputMode});
 report.invocation={command:'codex',args,timeoutMs,toolsDisabled:true};
 let stdout='',stderr='',timedOut=false,outputLimitExceeded=false,interrupted=false,spawnError='';
 const clock=performance.now(),modelStartedAt=new Date().toISOString();failureStage='transport';report.attempts=1;
 const child=spawn('codex',args,{cwd:privateDir,env:process.env,stdio:['pipe','pipe','pipe'],detached:process.platform!=='win32'});
 let escalation:NodeJS.Timeout|undefined;
 const signal=(value:NodeJS.Signals)=>{try{if(child.pid&&process.platform!=='win32')process.kill(-child.pid,value);else child.kill(value)}catch{}};
 const stop=()=>{signal('SIGTERM');if(!escalation)escalation=setTimeout(()=>signal('SIGKILL'),1500)};
 child.stdout.on('data',b=>{stdout+=String(b);if(stdout.length>20_000_000){stdout=stdout.slice(0,20_000_000);outputLimitExceeded=true;stop()}});
 child.stderr.on('data',b=>{stderr+=String(b);if(stderr.length>2_000_000){stderr=stderr.slice(0,2_000_000);outputLimitExceeded=true;stop()}});
 const interrupt=()=>{interrupted=true;stop()};process.once('SIGTERM',interrupt);process.once('SIGINT',interrupt);
 const timer=setTimeout(()=>{timedOut=true;stop()},timeoutMs);
 const completion=new Promise<number|null>(done=>{child.once('error',e=>{spawnError=e.message;done(null)});child.once('close',code=>done(code))});
 child.stdin.on('error',()=>{});child.stdin.end(effectivePrompt);
 const exitCode=await completion;clearTimeout(timer);if(escalation)clearTimeout(escalation);process.off('SIGTERM',interrupt);process.off('SIGINT',interrupt);
 report.phases.model={startedAt:modelStartedAt,finishedAt:new Date().toISOString(),elapsedMs:performance.now()-clock,exitCode,timedOut,timeoutMs,outputLimitExceeded,interrupted};
 await writeFile(resolve(privateDir,'codex-events.jsonl'),stdout,{mode:0o600});await writeFile(resolve(privateDir,'codex-stderr.log'),stderr,{mode:0o600});
 const events:any[]=[];for(const line of stdout.split('\n'))try{events.push(JSON.parse(line))}catch{}
 report.events=events.reduce((a:Record<string,number>,e)=>{const type=e.type||e.method||'other';a[type]=(a[type]||0)+1;return a},{});
 report.tokenUsage=events.filter(e=>e.type==='turn.completed'&&e.usage).map(e=>e.usage);
 report.threadIds=events.filter(e=>e.type==='thread.started').map(e=>e.thread_id);
 const errors=events.filter(e=>e.type==='error'||e.type==='turn.failed').map(e=>String(e.message||e.error?.message||''));
 report.protocolErrors=errors.map(redact);report.failureEvidence=errors.length?'turn-protocol':'startup-stderr';
 report.transportCompleted=exitCode===0&&events.some(e=>e.type==='turn.completed');
 const unexpectedTools=events.some(e=>e.item?.type&&!['reasoning','agent_message'].includes(e.item.type));
 report.unexpectedTools=unexpectedTools;
 let transportFailure=outputLimitExceeded?'output-limit':interrupted?'interrupted':classifyMiMoFailure(errors.length?errors:[stderr],exitCode,timedOut,spawnError);
 let raw='';try{raw=await readFile(lastMessage,'utf8')}catch{raw=events.filter(e=>e.type==='item.completed'&&e.item?.type==='agent_message').at(-1)?.item?.text||'';if(raw)await writeFile(lastMessage,raw,{mode:0o600})}
 if(raw.length>2_000_000){transportFailure='output-limit';raw=raw.slice(0,2_000_000)}
 report.rawOutput={characters:raw.length,sha256:sha(raw)};failureStage='output';let parsed:unknown;const parseStartedClock=performance.now();
 if(!raw)report.phases.json={status:'not-run',reason:'No model output; do not call this a JSON failure'};
 else try{parsed=JSON.parse(raw);report.phases.json={ok:true,elapsedMs:performance.now()-parseStartedClock}}
 catch(e){report.phases.json={ok:false,elapsedMs:performance.now()-parseStartedClock,error:redact(String(e)).slice(0,240)}}
 if(parsed===undefined){const fence=raw.trim().match(/^```(?:json)?\s*\n([\s\S]*?)\n```$/i);if(fence)try{parsed=JSON.parse(fence[1]);report.envelopeDiagnostic={onlyCompleteFenceRemoved:true,ok:true,productionParserSupportsSameLosslessEnvelope:true}}catch{report.envelopeDiagnostic={ok:false}}}
 const normalized=normalizeStructuredOutput(raw);report.phases.normalization={function:'api/import.normalizeStructuredOutput',changed:normalized!==raw,sha256:sha(normalized),schemaInput:'production-normalized-output'};
 if(raw){try{parsed=JSON.parse(normalized)}catch{parsed=undefined}}
 if(raw){const t=performance.now();try{parseLayoutOutput(normalized);report.phases.productionParser={ok:true,elapsedMs:performance.now()-t}}catch(e){report.phases.productionParser={ok:false,elapsedMs:performance.now()-t,stage:e instanceof LayoutOutputError?e.stage:'unknown',error:redact(String(e)).slice(0,500)}}}
 if(parsed!==undefined){
  await writeFile(resolve(privateDir,'parsed-object.json'),JSON.stringify(parsed,null,2),{mode:0o600});
  const t=performance.now(),validation=Scene.safeParse(parsed);report.phases.schema={ok:validation.success,elapsedMs:performance.now()-t,...(!validation.success?{errors:validation.error.issues.slice(0,40).map(e=>({path:e.path,message:e.message}))}:{})};
  if(validation.success){
   const scene=validation.data;report.counts={walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length};report.phases.content={ok:scene.walls.length>0&&scene.rooms.length>0,required:'at least one wall and one room; empty template is not floorplan recognition'};
   for(const [name,fn] of [['geometry',validateScene],['confirmationTopology',validateTopology]] as const){const start=performance.now();try{fn(scene);report.phases[name]={ok:true,elapsedMs:performance.now()-start}}catch(e){report.phases[name]={ok:false,elapsedMs:performance.now()-start,error:redact(String(e)).slice(0,500)}}}
   const start=performance.now();try{const d=analyzeTopology(scene);await writeFile(resolve(privateDir,'diagnostics.json'),JSON.stringify(d,null,2),{mode:0o600});report.phases.diagnostics={ok:true,elapsedMs:performance.now()-start,status:d.status,checks:d.checks,counts:d.issues.reduce((a:Record<string,number>,i)=>{a[i.code]=(a[i.code]||0)+1;return a},{}),undefinedAreaM2:d.measurements.undefinedAreaM2,wallComponents:d.measurements.wallComponents,dominantAngleDegrees:d.measurements.dominantAngleDegrees}}catch(e){report.phases.diagnostics={ok:false,elapsedMs:performance.now()-start,error:redact(String(e))}}
  }
 }
 const after=readMiMoProfile(profile);report.profileUnchanged=JSON.stringify(after.fingerprints)===JSON.stringify(metadata.fingerprints);
 if(!report.profileUnchanged)transportFailure='profile-changed-during-run';
 Object.assign(report,summarizeMiMoOutcome(report.transportCompleted,transportFailure,report.phases,unexpectedTools));
 report.inspectionCompleted=!!(report.transportCompleted&&report.phases.schema?.ok&&report.phases.diagnostics?.ok);
}catch(e){report.failureClass=failureStage==='configuration'?'profile-preflight':failureStage==='source'?'input-preflight':'probe-infrastructure';report.error=redact(String(e)).slice(0,1200);report.validCandidate=false;report.inspectionCompleted=false}
report.completedAt=new Date().toISOString();report.elapsedMs=performance.now()-probeStartedClock;
report.scope='one explicitly requested inference; first-attempt by default or one explicit repair follow-up; never automatic retries, adoption or production import';
report.runnerDifference='Frozen current user prompt/schema with native CLI profile; not a controlled paired comparison with business App Server system context.';
await writeFile(resolve(outDir,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
if(!report.validCandidate)process.exitCode=1;
