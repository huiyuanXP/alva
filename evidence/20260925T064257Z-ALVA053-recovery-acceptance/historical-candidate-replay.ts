import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {Scene,validateScene} from '../../api/model.js';
import {validateTopology} from '../../api/topology/validate.js';
import {analyzeTopology} from '../../api/topology/diagnostics.js';
const root='evidence/20260922T083952Z-ALVA053-bd41742e';
const before=JSON.parse(await readFile(root+'/topology-replay.json','utf8'));
const rows=[];const result=(f:()=>unknown)=>{try{f();return {accepted:true}}catch(e){return {accepted:false,error:String(e)}}};
for(const original of before.archived){
 const text=await readFile(original.path,'utf8');const object=JSON.parse(text);const scene=Scene.parse(object);
 const d=analyzeTopology(scene);rows.push({source:original.path,sha256:createHash('sha256').update(text).digest('hex'),historical:original,now:{import:result(()=>validateScene(scene)),confirmation:result(()=>validateTopology(scene)),diagnosticCodes:d.issues.map(x=>x.code),undefinedAreaM2:d.measurements.undefinedAreaM2},inputUnchanged:JSON.stringify(object)===JSON.stringify(JSON.parse(text))});
}
const out={sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),evaluatedAt:new Date().toISOString(),productionMutations:false,syntheticOrHistoricalOnly:true,rows};
console.log(JSON.stringify(out,null,2));
