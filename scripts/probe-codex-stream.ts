import {runCodex} from '../api/codex.js';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const run=`evidence/${new Date().toISOString().replace(/[-:.]/g,'')}-${randomUUID().slice(0,8)}`;await mkdir(run,{recursive:true});
const events:unknown[]=[],deltas:string[]=[];let calls=0;
try{
const text=await runCodex({text:'先调用 get_snapshot。根据快照给业主写三句简短中文，说明厨房用途尚待确认，并让用户输入已知墙长。请勿提出施工结论。',tools:[{name:'get_snapshot',description:'Read only the current project snapshot.',inputSchema:{type:'object',properties:{},additionalProperties:false},run:async()=>{calls++;return {project_id:'synthetic-alva-probe',rooms:[{id:'kitchen',purpose:'待确认'}],calibrated:false}}}],onDelta:t=>deltas.push(t),onEvent:e=>events.push(e)});
const image=await readFile('references/room-study-handoff/public/floorplan.png');
const vision=await runCodex({text:'读这张户型图。仅描述右上方有水槽与L形操作台的空间及图中没有标明的尺寸。不要猜测具体长度。',images:['data:image/png;base64,'+image.toString('base64')],onEvent:e=>events.push(e)});
const result={text,vision,tool_calls:calls,delta_count:deltas.filter(Boolean).length,assertions:{business_tool_called:calls===1,real_incremental_text:deltas.filter(Boolean).length>=2,final_matches_deltas:deltas.join('')===text,image_input_returned:vision.length>0}};
await writeFile(`${run}/result.json`,JSON.stringify(result,null,2));await writeFile(`${run}/events.json`,JSON.stringify(events,null,2));
console.log(JSON.stringify({run,...result}));if(!Object.values(result.assertions).every(Boolean))process.exitCode=1;
}catch(e){await writeFile(`${run}/failure.txt`,String(e));console.error(String(e),run);process.exitCode=1}
