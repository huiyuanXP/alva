/** Replays the normal layout-recognition path once with an isolated image and output. */
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {recognizeLayout,layoutRecognitionModel} from '../api/import.js';
import {runCodex,type CodexInput} from '../api/codex.js';
import {validateTopology} from '../api/topology/validate.js';
import {analyzeTopology} from '../api/topology/diagnostics.js';

const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA064-gemini-prodkey-'+randomUUID().slice(0,6);
const dir=resolve('.runtime',runId);
await mkdir(dir,{recursive:true,mode:0o700});
const image=await readFile('references/room-study-handoff/public/floorplan.png');
const attempts:{model:string;reasoningEffort:string;timeoutMs:number|undefined;outputSchema:boolean;eventCounts:Record<string,number>}[]=[];
const startedAt=new Date().toISOString();
const report:Record<string,unknown>={runId,startedAt,imageSha256:createHash('sha256').update(image).digest('hex'),model:layoutRecognitionModel(),reasoningEffort:process.env.OPENAI_VISION_REASONING_EFFORT||'high',route:'api/import.recognizeLayout → api/codex.runCodex',attempts};
try {
  const scene=await recognizeLayout(`data:image/png;base64,${image.toString('base64')}`,undefined,undefined,async(input:CodexInput)=>{
    const attempt={model:input.model||'',reasoningEffort:process.env.OPENAI_VISION_REASONING_EFFORT||'high',timeoutMs:input.timeoutMs,outputSchema:!!input.outputSchema,eventCounts:{} as Record<string,number>};
    attempts.push(attempt);
    const raw=await runCodex({...input,onEvent:event=>{const method=(event as {method?:string}).method||'other';attempt.eventCounts[method]=(attempt.eventCounts[method]||0)+1}});
    await writeFile(resolve(dir,`raw-response-${attempts.length}.txt`),raw,{mode:0o600});
    return raw;
  });
  await writeFile(resolve(dir,'candidate.json'),JSON.stringify(scene,null,2),{mode:0o600});
  let topologyError='';try{validateTopology(scene)}catch(error){topologyError=String(error).slice(0,800)}
  const diagnostics=analyzeTopology(scene);
  const issues=diagnostics.issues.reduce((counts:Record<string,number>,issue)=>{counts[issue.code]=(counts[issue.code]||0)+1;return counts},{});
  const counts={walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length};
  Object.assign(report,{counts,renderableCandidate:true,topologyError,diagnostics:{status:diagnostics.status,checks:diagnostics.checks,issues,undefinedAreaM2:diagnostics.measurements.undefinedAreaM2,wallComponents:diagnostics.measurements.wallComponents},validCandidate:scene.walls.length>0&&scene.rooms.length>0&&!topologyError&&diagnostics.status==='complete'&&diagnostics.issues.length===0});
}catch(error){Object.assign(report,{validCandidate:false,error:String(error).slice(0,800)})}
report.finishedAt=new Date().toISOString();
await writeFile(resolve(dir,'result.json'),JSON.stringify(report,null,2),{mode:0o600});
console.log(JSON.stringify(report));
if(!report.validCandidate)process.exitCode=1;
