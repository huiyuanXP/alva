import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {parse} from 'dotenv';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {runCodex} from '../api/codex.js';
import {mainChatAgent} from '../api/main-chat-agent.js';
const envPath=process.argv[2];
if(envPath){const env=parse(await readFile(envPath));for(const key of ['OPENAI_API_KEY','OPENAI_BASE_URL'])if(env[key])process.env[key]=env[key]}
if(!process.env.OPENAI_API_KEY)throw new Error('Provide the authorized runtime env path or OPENAI_API_KEY');
const dir='evidence/'+new Date().toISOString().replace(/[:.]/g,'')+'-ALVA067-real-chat-'+randomUUID().slice(0,6);await mkdir(dir,{recursive:true});
process.env.ALVA_ACCESS_CODE='alva067-real-model-synthetic-code';
const store=new AlvaStore();await store.init();const {project}=await store.create('Synthetic Gemini 3.8 chat acceptance');await store.ensureAccessCode(project.id);
const tools:string[]=[];let requestedModel='';
const app=await buildAlva(store,{assets:false,origin:'http://localhost',chatCodex:async input=>{
 requestedModel=input.model||'';
 return runCodex({...input,tools:input.tools?.map(t=>({...t,run:async args=>{tools.push(t.name);return t.run(args)}}))});
}});
const started=Date.now();
try{
 const session=await store.issueInternalSession(project.id);
 const response=await app.inject({method:'POST',url:'/api/chat',headers:{origin:'http://localhost',cookie:'alva_session='+session.token},payload:{requestId:randomUUID(),expectedRevision:project.revision,model:mainChatAgent.model,roomId:null,text:'请先实际调用 get_snapshot 读取当前项目，再简短告诉我是否已经有户型，不修改任何内容。'}});
 const latest=await store.get(project.id),last=latest.messages.at(-1);
 assert.equal(response.statusCode,200);assert.equal(requestedModel,'gemini-3.8-flash-high');assert.equal(last?.status,'completed');assert.ok(last?.text);assert.ok(tools.includes('get_snapshot'));
 await writeFile(dir+'/result.json',JSON.stringify({ok:true,model:requestedModel,tools,status:last.status,elapsedMs:Date.now()-started,reply:last.text,scope:'real POST /api/chat on isolated synthetic project; main baseline tools, not ALVA-066 stage MCP acceptance'},null,2));console.log(JSON.stringify({ok:true,model:requestedModel,tools,dir,elapsedMs:Date.now()-started}));
}catch(e){await writeFile(dir+'/result.json',JSON.stringify({ok:false,model:requestedModel,tools,error:String(e),elapsedMs:Date.now()-started},null,2));throw e}
finally{await app.close();await store.close()}
