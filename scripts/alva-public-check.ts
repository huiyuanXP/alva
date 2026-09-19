import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {randomUUID,createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import {chromium} from '@playwright/test';
const origin='https://prod.huiyuanxp.com',run=`evidence/${new Date().toISOString().replace(/[-:.]/g,'')}-${randomUUID().slice(0,8)}`;
await mkdir(run,{recursive:true});
const checks:{name:string;detail:unknown}[]=[];
const browser=await chromium.launch({headless:true});const context=await browser.newContext();const page=await context.newPage();await page.goto(origin);
const streams:{chunks:number;firstChunkMs:number;elapsedMs:number}[]=[];
async function request(path:string,body?:unknown){
 const out=await page.evaluate(async({path,body})=>{const start=performance.now();const r=await fetch(path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(150000)});let text='',chunks=0,firstChunkMs=0;if(r.headers.get('content-type')?.includes('text/event-stream')){const reader=r.body!.getReader(),decoder=new TextDecoder();while(true){const c=await reader.read();if(c.done)break;if(!chunks)firstChunkMs=performance.now()-start;chunks++;text+=decoder.decode(c.value,{stream:true})}}else{text=await r.text()}return {text,status:r.status,headers:[...r.headers],stream:chunks?{chunks,firstChunkMs,elapsedMs:performance.now()-start}:null}},{path,body});
 if(out.stream)streams.push(out.stream);return new Response(out.text,{status:out.status,headers:out.headers});
}
async function json(path:string,body?:unknown){const r=await request(path,body);assert.equal(r.status,200,`${path}: ${r.status}`);return r.json() as Promise<any>}
async function login(token:string){const r=await request('/api/access',{token});assert.equal(r.status,200);const c=(await context.cookies()).find(c=>c.name==='alva_session');assert.ok(c?.secure);assert.ok(c?.httpOnly)}
try{
 for(let i=0;i<10;i++){const health=await json('/healthz');assert.equal(health.application,'alva');const r=await request('/');assert.equal(r.status,200);assert.match(await r.text(),/<title>alva/i)}
 checks.push({name:'HTTPS health and application HTML',detail:'10/10 pairs'});
 assert.equal((await request('/api/project')).status,401);
 const initial=new URL((await readFile('.runtime/alva-data/initial-access-link','utf8')).trim());await login(new URLSearchParams(initial.hash.slice(1)).get('access')!);
 const created=await json('/api/projects',{name:'公网验收 · 合成项目'});await login(created.token);
 await writeFile('.runtime/public-check-entry',origin+'/#access='+created.token+'\n',{mode:0o600});
 assert.equal((await request('/api/projects/'+randomUUID())).status,403);
 checks.push({name:'Secure project session and cross-project rejection',detail:'anonymous 401; foreign project 403; Secure HttpOnly cookie'});
 let p=await json('/api/project');
 const command=()=>({requestId:randomUUID(),expectedRevision:p.revision});
 const candidate=JSON.parse(await readFile('evidence/20260919T111613210Z-a51bbaee/candidate.json','utf8'));
 p=await json('/api/candidate/correct',{...command(),scene:candidate});
 p=await json('/api/candidate/calibrate',{...command(),wallId:p.candidate.walls[0].id,length:8,source:'公网恢复测试合成长度，非实际测量'});
 p=await json('/api/candidate/confirm',{...command(),confirmed:true});
 // Uses a previously real-recognized synthetic scene; does not count as another import.
 p=await json('/api/save',{...command(),confirmed:true});
 const savedHash=createHash('sha256').update(JSON.stringify(await json('/api/versions/1'))).digest('hex');
 const image={mime:'image/png',data:(await readFile('references/room-study-handoff/public/floorplan.png')).toString('base64')};
 const r=await request('/api/chat',{...command(),text:'请读取当前项目，并描述参考图片中可见的一个空间特征。不要修改家具或提交方案；先问我一个需要澄清的需求。',roomId:p.scene.rooms[0].id,model:'gpt-5.5',image});
 assert.equal(r.status,200);assert.match(r.headers.get('content-type')||'',/text\/event-stream/);
 const reader=r.body!.getReader(),decoder=new TextDecoder();let buffer='',deltas=0,done=false;
 while(true){const chunk=await reader.read();if(chunk.done)break;buffer+=decoder.decode(chunk.value,{stream:true});let index;while((index=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,index);buffer=buffer.slice(index+2);const event=frame.match(/^event: (.+)$/m)?.[1],raw=frame.match(/^data: (.+)$/m)?.[1];if(!raw)continue;const data=JSON.parse(raw);if(event==='error')throw Error(data.error);if(event==='delta'&&data.text)deltas++;if(event==='done')done=data.ok===true}}
 assert.ok(done);assert.ok((streams.at(-1)?.chunks||0)>=2,'browser did not receive multiple network chunks');assert.ok(deltas>=2,`only ${deltas} stream increments`);
 p=await json('/api/project');assert.equal(p.messages.at(-1).status,'completed');
 assert.equal(createHash('sha256').update(JSON.stringify(await json('/api/versions/1'))).digest('hex'),savedHash);
 checks.push({name:'Real public multimodal Codex SSE',detail:{deltas,network:streams.at(-1),completed:true,savedSnapshotUnchanged:true}});
 const before=createHash('sha256').update(JSON.stringify(p)).digest('hex');
 execFileSync('sudo',['-n','systemctl','restart','alva.service']);execFileSync('sudo',['-n','systemctl','restart','alva-tunnel.service']);
 let ready=false;for(let i=0;i<30;i++){try{const r=await request('/healthz');if(r.ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,1000))}assert.ok(ready);
 const after=await json('/api/project');assert.equal(createHash('sha256').update(JSON.stringify(after)).digest('hex'),before);assert.equal(createHash('sha256').update(JSON.stringify(await json('/api/versions/1'))).digest('hex'),savedHash);
 checks.push({name:'Application and named tunnel restart persistence',detail:{projectHash:before,snapshotHash:savedHash,sessionSurvived:true}});
 await writeFile(run+'/result.json',JSON.stringify({ok:true,origin,checks,scope:'Public core release acceptance; not complete eight-group product acceptance'},null,2));console.log(JSON.stringify({run,checks}));
}catch(e){await writeFile(run+'/result.json',JSON.stringify({ok:false,checks,error:String(e)},null,2));console.error(JSON.stringify({run,error:String(e)}));process.exitCode=1}finally{await browser.close()}
