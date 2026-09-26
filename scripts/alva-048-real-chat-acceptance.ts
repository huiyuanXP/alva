import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createCanvas} from '@napi-rs/canvas';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const port=Number(process.env.ALVA_048_PORT||42951),origin='http://127.0.0.1:'+port;
const root=resolve('.runtime','20260926T-ALVA048-chat-acceptance'),evidence=resolve('evidence','20260926T-ALVA048-chat-acceptance');
const code='alva048-chat-acceptance-code-2026',model='gemini-3.8-flash-high';
process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_AGENT_DIR=resolve(root,'agent');
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true});await mkdir(evidence,{recursive:true});
const scene:SceneData={walls:[{id:'w1',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'Living room',purpose:'reading',polygon:[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}],locked:false}],openings:[],items:[],calibration:{wallId:'w1',length:6,source:'ALVA-048 acceptance',confirmed:true},geography:{latitude:1.3,north:0,assumption:'acceptance'}};
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-048 real Chat acceptance');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene)});
const app=await buildAlva(store,{assets:false,origin});await app.listen({host:'127.0.0.1',port});
let cookie='';const req=async(path:string,init:RequestInit={})=>fetch(origin+path,init);
const login=async()=>{const r=await req('/api/access',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({code})});assert.equal(r.status,200);cookie=(r.headers.get('set-cookie')||'').split(';')[0];assert.ok(cookie)};
const project=async()=>{const r=await req('/api/project',{headers:{cookie}});assert.equal(r.status,200);return r.json() as Promise<any>};
const chat=async(payload:any)=>{const r=await req('/api/chat',{method:'POST',headers:{cookie,origin,'content-type':'application/json'},body:JSON.stringify(payload)});assert.equal(r.status,200);const reader=r.body!.getReader(),decoder=new TextDecoder();let buffer='',done=false;const deltas:string[]=[],errors:string[]=[];for(;;){const part=await reader.read();if(part.done)break;buffer+=decoder.decode(part.value,{stream:true});let cut=-1;while((cut=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,cut);buffer=buffer.slice(cut+2);const event=frame.match(/^event: (.+)$/m)?.[1],raw=frame.match(/^data: (.+)$/m)?.[1];if(!event||!raw)continue;const data=JSON.parse(raw);if(event==='delta'&&typeof data.text==='string'&&data.text.trim())deltas.push(data.text);if(event==='error')errors.push(data.error||'error');if(event==='done')done=data.ok===true}}return {done,deltas,errors}};
try{await login();const models=await (await req('/api/models',{headers:{cookie}})).json() as any;assert.deepEqual(models,{models:[model]});const before=await project(),sceneBefore=JSON.stringify(before.scene),savedBefore=before.savedVersion;
const textRun=await chat({requestId:randomUUID(),expectedRevision:before.revision,text:'Describe one concrete reading advantage of this living room and ask one confirmation question. Do not change the design.',roomId:'living',model});assert.equal(textRun.done,true);assert.deepEqual(textRun.errors,[]);assert.ok(textRun.deltas.join('').trim().length>20);const afterText=await project();assert.equal(JSON.stringify(afterText.scene),sceneBefore);assert.equal(afterText.savedVersion,savedBefore);assert.equal(afterText.messages.at(-1)?.status,'completed');
const canvas=createCanvas(320,220),ctx=canvas.getContext('2d');ctx.fillStyle='#f4efe6';ctx.fillRect(0,0,320,220);ctx.fillStyle='#c94b40';ctx.fillRect(50,45,220,120);ctx.fillStyle='#111';ctx.font='24px sans-serif';ctx.fillText('RED SOFA',95,112);const image={mime:'image/png',data:canvas.toBuffer('image/png').toString('base64')};
const imageRun=await chat({requestId:randomUUID(),expectedRevision:afterText.revision,text:'Describe the most visible color and object in the attached reference image. Do not change the design.',roomId:'living',model,image});assert.equal(imageRun.done,true);assert.deepEqual(imageRun.errors,[]);assert.ok(imageRun.deltas.join('').trim().length>10);const afterImage=await project();assert.equal(JSON.stringify(afterImage.scene),sceneBefore);assert.equal(afterImage.savedVersion,savedBefore);assert.equal(afterImage.messages.at(-1)?.status,'completed');assert.equal(JSON.stringify(afterImage).includes(image.data),false);
const result={ticket:'ALVA-048',model,text:{done:textRun.done,responseChars:textRun.deltas.join('').length},image:{done:imageRun.done,responseChars:imageRun.deltas.join('').length},sceneUnchanged:true,snapshotUnchanged:true,imageNotPersisted:true,errors:[]};await writeFile(resolve(evidence,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));}finally{await app.close();await store.close();await rm(root,{recursive:true,force:true})}

