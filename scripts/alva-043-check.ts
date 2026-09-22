import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {chatModels} from '../api/chat.js';
import type {SceneData} from '../api/model.js';

const runId=process.env.ALVA_RUN_ID||'20260922T170000Z-ALVA043-round1',port=Number(process.env.ALVA_PORT||43430),origin='http://127.0.0.1:'+port,root=resolve('.runtime',runId),evidence=resolve('evidence',runId),code='alva043-round1-code-123456';
assert.ok(process.env.OPENAI_API_KEY,'OPENAI_API_KEY must be supplied');process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_AGENT_DIR=resolve(root,'agent');await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});await mkdir(evidence,{recursive:true});
const scene:SceneData={walls:[{id:'w1',a:{x:0,y:0},b:{x:4,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'study',name:'书房',purpose:'工作学习',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],locked:false}],openings:[],items:[],calibration:{wallId:'w1',length:4,source:'ALVA-043 synthetic acceptance',confirmed:true},geography:{latitude:1.3,north:0,assumption:'synthetic'}};
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-043 Round 1');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene)});
const app=await buildAlva(store,{assets:false,origin});await app.listen({host:'127.0.0.1',port});let cookie='';
async function login(){const r=await fetch(origin+'/api/access',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({code})});assert.equal(r.status,200);cookie=(r.headers.get('set-cookie')||'').split(';')[0];assert.ok(cookie)}
async function project(){const r=await fetch(origin+'/api/project',{headers:{cookie}});assert.equal(r.status,200);return r.json() as Promise<any>}
async function chat(payload:any){const r=await fetch(origin+'/api/chat',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,200);const reader=r.body!.getReader(),decoder=new TextDecoder();let buffer='',done=false;const deltas:string[]=[],errors:string[]=[];while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let cut;while((cut=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const event=frame.match(/^event: (.+)$/m)?.[1],raw=frame.match(/^data: (.+)$/m)?.[1];if(!event||!raw)continue;const data=JSON.parse(raw);if(event==='delta'&&data.text)deltas.push(data.text);if(event==='error')errors.push(data.error||'error');if(event==='done')done=data.ok===true}}return {done,deltas,errors}}
try{
 await login();const before=await project();const run=await chat({requestId:randomUUID(),expectedRevision:before.revision,text:'我每周在家办公两天，经常开视频会议。请使用你已有的业务指导，按“资料事实”“基于我的情况的推断/建议”“缺少资料”三部分告诉我工作位怎么考虑，并标出来源。不要修改设计。',roomId:'study',model:chatModels[0]});assert.equal(run.done,true,JSON.stringify(run));assert.deepEqual(run.errors,[]);assert.ok(run.deltas.length>=1,'expected grounded streamed output');
 const after=await project(),answer=after.messages.at(-1)?.text||'';assert.match(answer,/BG01/);assert.match(answer,/references\/02_intake_form\.html#Q10/);assert.match(answer,/资料事实/);assert.match(answer,/推断|建议/);assert.match(answer,/缺少|缺失|需要补充/);assert.equal(after.proposals.length,0);assert.equal(JSON.stringify(after.scene),JSON.stringify(before.scene));
 const result={ticket:'ALVA-043',round:1,provider:'real',model:chatModels[0],passed:true,deltas:run.deltas.length,answer,checks:{guidance_used:/BG01/.test(answer),source_cited:/02_intake_form\.html#Q10/.test(answer),fact_inference_separated:/资料事实/.test(answer)&&/推断|建议/.test(answer),gap_disclosed:/缺少|缺失|需要补充/.test(answer),scene_unchanged:JSON.stringify(after.scene)===JSON.stringify(before.scene),no_proposal:after.proposals.length===0}};await writeFile(resolve(evidence,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await app.close();await store.close();await rm(root,{recursive:true,force:true})}
