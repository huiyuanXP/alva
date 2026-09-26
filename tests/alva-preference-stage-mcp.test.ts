import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createReferenceBatch} from '../api/references.js';
import {seedSnapshotProject} from './fixtures/alva/snapshot.js';
import type {CodexInput} from '../api/codex.js';

const code='alva042-stage-code-123456',png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const header=(login:any)=>({cookie:`alva_session=${login.cookies[0].value}`,origin:'http://localhost'});

test('ALVA-042 actual living Stage MCP discovers and calls confirmed-reference tool without leaking pending analysis',async()=>{
 const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-042 stage mcp');await store.ensureAccessCode(project.id);let seeded=await store.mutate(project.id,randomUUID(),0,'seed',{},seedSnapshotProject);
 const roomId=seeded.scene!.rooms[0].id,roomName=seeded.scene!.rooms[0].name;
 const confirmed=await createReferenceBatch(store,{projectId:project.id,requestId:randomUUID(),roomId,filename:'confirmed.png',image:{mime:'image/png',data:png},sourceText:'我确认喜欢柔和木质感和低饱和暖色',candidates:[{origin:'model',preference:'like',feature:'柔和木质感和低饱和暖色'}]});
 await createReferenceBatch(store,{projectId:project.id,requestId:randomUUID(),roomId,filename:'pending.png',image:{mime:'image/png',data:png},sourceText:'未确认的亮金色候选',candidates:[{origin:'model',preference:'like',feature:'亮金色'}]});
 let mcpResult:any,catalogNames:string[]=[];
 const model=async(input:CodexInput)=>{await input.session?.onThread(input.session.threadId||`thread-${input.session.key}`);if(input.resumeOnly)return input.session!.threadId!;if(input.injectOnly){await input.session?.onHandoffsDelivered?.((input.session.handoffs||[]).map(h=>h.id));return input.session!.threadId!}const list=input.tools?.find(t=>t.name==='mcp_list_tools'),call=input.tools?.find(t=>t.name==='mcp_call_tool');assert.ok(list&&call,'living Chat must expose only stage MCP bridge');const catalog=await list!.run({}) as any;catalogNames=catalog.tools.map((t:any)=>t.name);assert.ok(catalogNames.includes('get_confirmed_reference_preferences'));mcpResult=await call!.run({name:'get_confirmed_reference_preferences',arguments:{roomId}});assert.equal(mcpResult.status,'confirmed_only');assert.equal(mcpResult.preferences.length,1);assert.equal(mcpResult.preferences[0].feature,'柔和木质感和低饱和暖色');assert.equal(JSON.stringify(mcpResult).includes('亮金色'),false);const answer=`我会参考你已确认的偏好“${mcpResult.preferences[0].feature}”。来源：${mcpResult.preferences[0].sourceText}；作用房间：${mcpResult.preferences[0].roomName||roomName}。`;input.onDelta?.(answer);return answer};
 const app=await buildAlva(store,{assets:false,origin:'http://localhost',chatCodex:model});
 try{const login=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code}}),h=header(login);const confirm=await app.inject({method:'POST',url:'/api/references/confirm',headers:h,payload:{requestId:randomUUID(),expectedRevision:seeded.revision,batchId:confirmed.id,annotationIds:[confirmed.annotations[0].id],confirmed:true}});assert.equal(confirm.statusCode,200,confirm.body);seeded=confirm.json();const switched=await app.inject({method:'POST',url:'/api/chat/stages/switch',headers:h,payload:{stage:'living',expectedRevision:seeded.revision}});assert.equal(switched.statusCode,200,switched.body);const current=await store.get(project.id);const chat=await app.inject({method:'POST',url:'/api/chat',headers:h,payload:{requestId:randomUUID(),expectedRevision:current.revision,text:'请基于我已经确认的参考图偏好给建议，并说明来源。',roomId,model:'gemini-3.8-flash-high'}});assert.equal(chat.statusCode,200,chat.body);assert.ok(mcpResult);assert.ok(catalogNames.includes('get_confirmed_reference_preferences'));const after=await store.get(project.id),reply=after.messages.at(-1)?.text||'';assert.match(reply,/柔和木质感和低饱和暖色/);assert.match(reply,/我确认喜欢柔和木质感和低饱和暖色/);assert.equal(reply.includes('亮金色'),false);assert.equal(after.answers.some(a=>a.locked&&a.text==='锁定答案'),false)}finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
});
