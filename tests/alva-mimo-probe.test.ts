import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyMiMoFailure,redactProbeError,summarizeMiMoOutcome,freezeImportPrompt,verifyMiMoRepairSource} from '../scripts/lib/mimo-probe.js';
import {readFileSync} from 'node:fs';
import {buildMiMoArgs,selectMiMoModel,readMiMoProfile,probeTimeoutMs,type MiMoProfileMetadata} from '../scripts/lib/mimo-profile.js';

test('ALVA-056 distinguishes revoked Codex login from model or JSON failure',()=>{
 assert.equal(classifyMiMoFailure(['Your access token could not be refreshed because your refresh token was revoked. Please log out and sign in again.'],1),'codex-authentication-unavailable');
});
test('ALVA-056 distinguishes unavailable environment credentials from provider rejection and unsupported model',()=>{
 assert.equal(classifyMiMoFailure(['Missing environment variable: MIMO_API_KEY.'],1),'missing-provider-environment-credential');
 assert.equal(classifyMiMoFailure(['401 unauthorized'],1),'provider-authentication-rejected');
 assert.equal(classifyMiMoFailure(["responses_feature_not_supported: text.format type 'json_schema' is not supported, only 'text' and 'json_object' are allowed."],1),'output-format-unsupported');
 assert.equal(classifyMiMoFailure(['Model is not supported when using a ChatGPT account'],1),'model-route-unavailable');
});
test('ALVA-056 timeout, spawn failure and successful transport are separate outcomes',()=>{
 assert.equal(classifyMiMoFailure([],null,true),'timeout');
 assert.equal(classifyMiMoFailure([],null,false,'ENOENT'),'process-start');
 assert.equal(classifyMiMoFailure([],0),null);
});
test('ALVA-056 public protocol errors redact keys and endpoint query strings',()=>{
 const s=redactProbeError('Bearer secret-secret sk-abcdefghijklmnopqrst https://example.invalid/api?secret=value');
 assert.equal(s.includes('secret-secret'),false);assert.equal(s.includes('abcdefghijklmnopqrst'),false);assert.equal(s.includes('secret=value'),false);
});
test('ALVA-056 replays actual sanitized failures without making new provider calls',()=>{
 const cases=[
  ['20260922T105705151Z-ALVA056-mimo-ff43a8','codex-authentication-unavailable'],
  ['20260922T105903721Z-ALVA056-mimo-455835','missing-provider-environment-credential']
 ];
 for(const [run,expected] of cases){
  const report=JSON.parse(readFileSync(`evidence/${run}/result.json`,'utf8'));
  assert.equal(classifyMiMoFailure(report.protocolErrors,report.phases.model.exitCode,report.phases.model.timedOut),expected);
  assert.equal(report.rawOutput.characters,0);assert.equal(report.transportCompleted,false);
 }
});

const metadata=():MiMoProfileMetadata=>({profile:'mimo',home:'/synthetic/.codex',model:'mimo-v2.6-pro',provider:'mimo',endpoint:'https://example.invalid/v1',envKey:'NEWAPI_KEY',credentialPresent:true,requiresOpenAIAuth:false,catalogModels:[{id:'mimo-v2.6-pro',inputModalities:['text','image']},{id:'mimo-v2.6-flash',inputModalities:['text','image']}],fingerprints:{},hookEvents:[],mcpServers:[]});
const options=()=>({metadata:metadata(),privateDir:'/synthetic/run',imagePath:'/synthetic/image.png',lastMessage:'/synthetic/result.txt',schemaPath:'/synthetic/schema.json',outputMode:'json-schema' as const});
const goodPhases=()=>({productionParser:{ok:true},schema:{ok:true},geometry:{ok:true},confirmationTopology:{ok:true},diagnostics:{ok:true,status:'complete',counts:{}}});
test('ALVA-056 defaults to the real profile model without a stale CLI model override',()=>{
 const args=buildMiMoArgs(options());assert.deepEqual(args.slice(0,3),['exec','--profile','mimo']);
 assert.equal(args.includes('-m'),false);assert.equal(args.includes('--model'),false);assert.equal(args.includes('mimo-v2.5'),false);
 assert.equal(selectMiMoModel(metadata()),'mimo-v2.6-pro');
 const changed=metadata();changed.model='mimo-v2.6-flash';assert.equal(selectMiMoModel(changed),'mimo-v2.6-flash');
});
test('ALVA-056 only an explicit within-catalog model choice adds a model flag',()=>{
 const args=buildMiMoArgs({...options(),modelOverride:'mimo-v2.6-flash'});assert.equal(args[args.indexOf('--model')+1],'mimo-v2.6-flash');
 for(const model of ['mimo-v2.5','gpt-6-astra'])assert.throws(()=>selectMiMoModel(metadata(),model));
});
test('ALVA-056 rejects text-only, non-MiMo catalog and missing environment credentials before launch',()=>{
 const textOnly=metadata();textOnly.catalogModels[0].inputModalities=['text'];assert.throws(()=>selectMiMoModel(textOnly),/image/);
 const mixed=metadata();mixed.catalogModels.push({id:'other-provider',inputModalities:['image']});assert.throws(()=>selectMiMoModel(mixed),/MiMo-only/);
 const missing=metadata();missing.credentialPresent=false;assert.throws(()=>selectMiMoModel(missing),/Missing environment/);
 const login=metadata();login.requiresOpenAIAuth=true;assert.throws(()=>selectMiMoModel(login));
 assert.throws(()=>readMiMoProfile('../unapproved'),/Invalid Codex profile/);
});
test('ALVA-056 native schema and schema-in-prompt remain distinct transport modes',()=>{
 assert.ok(buildMiMoArgs(options()).includes('--output-schema'));
 const args=buildMiMoArgs({...options(),outputMode:'schema-in-prompt'});assert.equal(args.includes('--output-schema'),false);assert.equal(args.includes('json_object'),false);
});
test('ALVA-056 disables inherited MCP endpoints, hooks, shell, snapshots, patches and agents',()=>{
 const m=metadata();m.mcpServers=['example.external'];m.hookEvents=['SessionStart','Stop'];
 const args=buildMiMoArgs({...options(),metadata:m});
 for(const value of ['features.shell_tool=false','features.shell_snapshot=false','features.apply_patch_freeform=false','features.multi_agent=false','mcp_servers."example.external".enabled=false','hooks.SessionStart=[]','hooks.Stop=[]'])assert.ok(args.includes(value));
 assert.equal(args[args.indexOf('--sandbox')+1],'read-only');
});
test('ALVA-056 deadline cannot be disabled, made infinite or raised past600seconds',()=>{
 assert.equal(probeTimeoutMs(),600_000);assert.equal(probeTimeoutMs('1000'),1000);assert.equal(probeTimeoutMs('600000'),600_000);assert.equal(probeTimeoutMs('120000'),120_000);
 for(const value of ['0','999','600001','Infinity','NaN','1.5',''])assert.throws(()=>probeTimeoutMs(value));
});
test('ALVA-056 successful transport cannot conceal parse, schema or geometry failures',()=>{
 for(const [stage,expected] of [['json','json-parse'],['schema','schema-contract'],['geometry','geometry-validation']]){
  const phases:any=goodPhases();phases.productionParser={ok:false,stage};const result=summarizeMiMoOutcome(true,null,phases);
  assert.equal(result.failureClass,expected);assert.equal(result.validCandidate,false);
 }
});
test('ALVA-056 confirmation errors and warning-only or inconclusive diagnostics require review',()=>{
 const bad:any=goodPhases();bad.confirmationTopology={ok:false};assert.equal(summarizeMiMoOutcome(true,null,bad).failureClass,'confirmation-topology');
 for(const status of ['complete','inconclusive']){
  const p:any=goodPhases();p.diagnostics={ok:true,status,counts:status==='complete'?{internal_void:1}:{}};
  const result=summarizeMiMoOutcome(true,null,p);assert.equal(result.outputContractPassed,true);assert.equal(result.validCandidate,false);assert.equal(result.requiresReview,true);
 }
});
test('ALVA-056 missing completion, changed profile and unexpected tools are never valid candidates',()=>{
 assert.equal(summarizeMiMoOutcome(false,null,goodPhases()).failureClass,'protocol-incomplete');
 assert.equal(summarizeMiMoOutcome(true,'profile-changed-during-run',goodPhases()).validCandidate,false);
 assert.equal(summarizeMiMoOutcome(true,null,goodPhases(),true).failureClass,'unexpected-tool-execution');
});
test('ALVA-056 even a clean structural result never authorizes automatic adoption',()=>{
 const result=summarizeMiMoOutcome(true,null,goodPhases());assert.equal(result.validCandidate,true);assert.equal(result.humanReviewRequired,true);assert.equal(result.automaticConfirmationAllowed,false);
});
test('ALVA-056 configured non-prefix secret values are also redacted',()=>{
 assert.equal(redactProbeError('credential=SYNTHETIC_SECRET_VALUE',['SYNTHETIC_SECRET_VALUE']).includes('SYNTHETIC_SECRET_VALUE'),false);
});

test('ALVA-056 hook state metadata is not misinterpreted as a lifecycle event array',()=>{
 const m=metadata();m.hookEvents=['state','SessionStart'];const args=buildMiMoArgs({...options(),metadata:m});
 assert.ok(args.includes('features.hooks=false'));assert.equal(args.includes('hooks.state=[]'),false);assert.ok(args.includes('hooks.SessionStart=[]'));
});

test('ALVA-056 empty schema-valid response is a recognition failure, not only a topology warning',()=>{
 const outcome=summarizeMiMoOutcome(true,null,{...goodPhases(),content:{ok:false}});
 assert.equal(outcome.failureClass,'empty-candidate');assert.equal(outcome.outputContractPassed,false);assert.equal(outcome.validCandidate,false);
});

test('ALVA-056 freezes both supported import call names without inventing or ambiguously selecting prompts',()=>{
 const original='await runCodex({text:`original prompt`,images:[image]})';
 assert.equal(freezeImportPrompt(original),'original prompt');assert.equal(freezeImportPrompt(original.replace('runCodex','codex')),'original prompt');
 assert.throws(()=>freezeImportPrompt('const text=otherSource;'),/unambiguously/);assert.throws(()=>freezeImportPrompt(original+';'+original),/unambiguously/);
});

test('ALVA-056 the current model prompt unambiguously defines center-fraction offsets',()=>{
 const prompt=freezeImportPrompt(readFileSync('api/import.ts','utf8'));assert.ok(prompt.includes('开口中心（不是起始边缘）'));assert.ok(prompt.includes('width/(2*墙长)'));assert.ok(prompt.includes('offset=0.5'));
});

test('ALVA-056 explicit correction binds one original image, schema and raw response',()=>{
 const current={runId:'synthetic-first',imageSha256:'image-a',rawSha256:'raw-a',schemaSha256:'schema-a'};
 const report={ticket:'ALVA-056',runId:current.runId,attempts:1,automaticRepair:false,attemptKind:'first-attempt',source:{sha256:current.imageSha256},rawOutput:{sha256:current.rawSha256},schemaSha256:current.schemaSha256};
 assert.doesNotThrow(()=>verifyMiMoRepairSource(report,current));
 for(const key of ['runId','imageSha256','rawSha256','schemaSha256'] as const)
  assert.throws(()=>verifyMiMoRepairSource(report,{...current,[key]:'different'}),/Repair provenance/);
 assert.throws(()=>verifyMiMoRepairSource({...report,attemptKind:'explicit-single-repair-followup'},current),/cannot be corrected again/);
 assert.throws(()=>verifyMiMoRepairSource({...report,repairSource:{runId:'another'}},current),/cannot be corrected again/);
 assert.throws(()=>verifyMiMoRepairSource({...report,attempts:2},current),/single ALVA-056/);
 assert.throws(()=>verifyMiMoRepairSource(undefined,current),/prior report/);
});
