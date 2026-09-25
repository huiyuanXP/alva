import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {recognizeLayout,layoutRecognitionModel} from '../api/import.js';
import {validateTopology} from '../api/topology/validate.js';
import {analyzeTopology} from '../api/topology/diagnostics.js';

const pairs=process.argv.slice(2);
if(pairs.length<2||pairs.length%2)throw new Error('pass first/repair raw response paths in pairs');
const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA064-replay-'+randomUUID().slice(0,6);
const dir=resolve('evidence',runId);await mkdir(dir,{recursive:true});
const cases=[];
for(let i=0;i<pairs.length;i+=2){
 const raw=[await readFile(pairs[i],'utf8'),await readFile(pairs[i+1],'utf8')];
 const attempts:{model:string;reasoningEffort:string|undefined}[]=[];
 try{
  const scene=await recognizeLayout('data:image/png;base64,iVBORw0KGgo=',undefined,undefined,async input=>{attempts.push({model:input.model||'',reasoningEffort:input.reasoningEffort});return raw[attempts.length-1]});
  let topologyError='';try{validateTopology(scene)}catch(error){topologyError=String(error)}
  const diagnostics=analyzeTopology(scene);
  cases.push({source:pairs[i+1],rawSha256:createHash('sha256').update(raw[1]).digest('hex'),attempts,counts:{walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length},topologyError,issues:diagnostics.issues.length,undefinedAreaM2:diagnostics.measurements.undefinedAreaM2,wallComponents:diagnostics.measurements.wallComponents,ok:attempts.length===2&&!topologyError&&diagnostics.issues.length===0});
 }catch(error){cases.push({source:pairs[i+1],attempts,error:String(error),ok:false})}
}
const result={runId,model:layoutRecognitionModel(),cases,ok:cases.every(item=>item.ok)};
await writeFile(resolve(dir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));if(!result.ok)process.exitCode=1;
