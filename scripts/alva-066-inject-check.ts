import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {runCodex} from '../api/codex.js';
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA066-inject';const root=resolve('.runtime',run),out=resolve('evidence',run);await mkdir(root,{recursive:true});await mkdir(out,{recursive:true});process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;assert.ok(process.env.OPENAI_API_KEY);
let threadId='';const id=randomUUID(),nonce=randomUUID(),delivered:string[][]=[];const session=()=>({key:run,...(threadId?{threadId}:{}),onThread:async(value:string)=>{if(threadId)assert.equal(value,threadId);threadId=value},handoffs:[{id,text:'阶段交接中的唯一nonce为 '+nonce}],onHandoffsDelivered:async(ids:string[])=>{delivered.push(ids)}});
try{
 await runCodex({injectOnly:true,text:'最新项目快照：合成项目，revision 7。',model:'gemini-3.1-flash-lite',session:session()});
 await runCodex({injectOnly:true,text:'',model:'gemini-3.1-flash-lite',session:session()});
 const reply=await runCodex({text:'只回答阶段交接中的唯一nonce，不能猜测。',model:'gemini-3.1-flash-lite',session:{...session(),handoffs:[]}});assert.ok(reply.includes(nonce),reply);
 let count=0;for(const file of await readdir(resolve(root,'agents'),{recursive:true})){if(!file.endsWith('.jsonl'))continue;for(const line of (await readFile(resolve(root,'agents',file),'utf8')).split('\n')){if(!line.trim())continue;const r=JSON.parse(line);if(r.type==='response_item'&&r.payload?.type==='message'&&r.payload.role==='user'&&JSON.stringify(r.payload.content).includes('[ALVA_HANDOFF:'+id+']'))count++}}
 assert.equal(count,1,'Repeated stage entry must not inject the handoff twice');await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,run,threadId,nonceReadFromPersistedInjection:true,injections:count,deliveryCallbacks:delivered.length},null,2));console.log(JSON.stringify({pass:true,run,threadId,count}));
}catch(error){await writeFile(resolve(out,'result.json'),JSON.stringify({pass:false,run,threadId,error:String(error)},null,2));throw error}
