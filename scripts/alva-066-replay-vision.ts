import assert from 'node:assert/strict';
import {mkdir,readFile,readdir,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {parseGeminiLayoutOutput} from '../api/import/response.js';
import {normalizeStructuredOutput} from '../api/import.js';
import {firstTopologyRepairIssue} from '../api/topology/repair.js';
const root=resolve('.runtime/20260925T202946472Z-ALVA066-floorplan-upload'),run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-vision-replay',out=resolve('evidence',run);await mkdir(out,{recursive:true});const results=[];
const files=await Promise.all(['vision-20b26e8a-6ba8-498e-a3a8-73df2c8b45ca.txt','vision-7985efbf-0500-46a7-abb0-ff6b6a109b13.txt'].map(async file=>({file,time:(await stat(resolve(root,file))).mtimeMs})));files.sort((a,b)=>a.time-b.time);
for(const {file} of files){const raw=await readFile(resolve(root,file),'utf8'),sha256=createHash('sha256').update(raw).digest('hex');try{const scene=parseGeminiLayoutOutput(normalizeStructuredOutput(raw));assert.ok(scene.rooms.length);results.push({file,sha256,pass:true,counts:{walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length},topologyIssue:firstTopologyRepairIssue(scene)});await writeFile(resolve(root,file+'.parsed.json'),JSON.stringify(scene,null,2))}catch(error){results.push({file,sha256,pass:false,error:String(error).slice(0,1200)})}}
assert.equal(results[0]?.pass,false);assert.equal(results.at(-1)?.pass,true,'The actual repaired model output must pass; original invalid evidence fields remain rejected');
assert.equal(results.length,2);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,run,scope:'Replay of two captured real vision outputs; not a new model or successful Chat call',results},null,2));console.log(JSON.stringify({pass:true,run,results}));
