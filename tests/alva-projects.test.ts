import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
const code='alva072-synthetic-access-code';

test('ALVA-072 navigation preserves projects and isolates sessions, stale tabs, invitations and replay',async()=>{
 const root=await mkdtemp(join(tmpdir(),'alva-072-'));const old=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;
 let store=new AlvaStore(join(root,'db'));await store.init();const first=await store.create('原项目'),hidden=await store.create('未授权项目');await store.ensureAccessCode(first.project.id);
 await store.mutate(first.project.id,randomUUID(),0,'seed',{},p=>seedLivingStage(p));const before=await store.get(first.project.id);
 let app=await buildAlva(store,{assets:false,automaticRecommendations:false});
 try{
  const login=async(inviteToken?:string)=>{const r=await app.inject({method:'POST',url:'/api/access',payload:{code,inviteToken}});assert.equal(r.statusCode,200);return {cookie:'alva_session='+r.cookies[0].value}};
  const a=await login(),b=await login();const call=(url:string,payload?:unknown,headers=a)=>app.inject({url,headers,...payload===undefined?{}:{method:'POST' as const,payload:payload as any}});
  assert.deepEqual((await call('/api/projects')).json().projects.map((p:any)=>p.id),[first.project.id]);
  const create={requestId:randomUUID(),expectedProjectId:first.project.id,navigation:{mode:'create',name:'  空白新家  '}};
  const invalid=await call('/api/projects/navigate',{...create,navigation:{mode:'create',name:'   '}});assert.equal(invalid.statusCode,400);
  const created=await call('/api/projects/navigate',create);assert.equal(created.statusCode,200);const id=created.json().projectId;assert.notEqual(id,first.project.id);
  assert.equal((await call('/api/projects/navigate',create, {...a,'x-alva-project':first.project.id} as any)).json().projectId,id);
  const empty=(await call('/api/project')).json();assert.equal(empty.name,'空白新家');assert.equal(empty.revision,0);assert.equal(empty.savedVersion,0);assert.equal(empty.scene,null);assert.equal(empty.candidate,null);for(const key of ['messages','answers','evidence','proposals','topologyVersions'])assert.deepEqual(empty[key],[]);
  assert.equal((await call('/api/project',undefined,b)).json().id,first.project.id);
  assert.equal((await call('/api/project',undefined,{...a,'x-alva-project':first.project.id} as any)).statusCode,409);
  assert.equal((await call('/api/invites',{}, {...a,'x-alva-project':first.project.id} as any)).statusCode,409);
  assert.equal((await call('/api/projects/'+first.project.id)).statusCode,403);
  assert.equal((await call('/api/projects/navigate',{requestId:randomUUID(),expectedProjectId:id,navigation:{mode:'switch',targetProjectId:hidden.project.id}})).statusCode,404);
  assert.equal((await call('/api/projects/navigate',{...create,navigation:{mode:'create',name:'不同名称'}})).statusCode,409);
  const invite=(await call('/api/invites',{})).json(),designer=await login(invite.token);assert.equal((await call('/api/project',undefined,designer)).json().id,id);
  for(const path of ['/api/projects','/api/projects/navigate'])assert.equal((await call(path,path.endsWith('navigate')?{requestId:randomUUID(),expectedProjectId:id,navigation:{mode:'switch',targetProjectId:first.project.id}}:undefined,designer)).statusCode,403);
  const back=await call('/api/projects/navigate',{requestId:randomUUID(),expectedProjectId:id,navigation:{mode:'switch',targetProjectId:first.project.id}});assert.equal(back.statusCode,200);
  assert.deepEqual((await call('/api/project')).json(),before);assert.equal((await call('/api/project',undefined,designer)).json().id,id);
  assert.equal((await call('/api/projects/navigate',create)).statusCode,409);
  assert.equal((await call('/api/projects')).json().projects.length,2);
  const invited=await store.invite(id,'designer');const other=await login(invited.token);await store.revoke(id,invited.linkId);assert.equal((await call('/api/project',undefined,other)).statusCode,401);
  // Default login remains the original project, independently of other devices.
  assert.equal((await call('/api/project',undefined,await login())).json().id,first.project.id);
 }finally{await app.close();await store.close();await rm(root,{recursive:true,force:true});if(old===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=old}
});

test('ALVA-072 both stage MCP packs expose project navigation with explicit errors and no implicit creation',async()=>{
 const old=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const store=new AlvaStore();await store.init();const first=await store.create('MCP');await store.ensureAccessCode(first.project.id);let calls=0;
 const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  const catalog:any=await input.tools!.find(t=>t.name==='mcp_list_tools')!.run({});assert.ok(catalog.tools.some((t:any)=>t.name==='request_project_navigation'));
  const call=input.tools!.find(t=>t.name==='mcp_call_tool')!;const listed:any=await call.run({name:'list_projects',arguments:{}});assert.equal(listed.projects.length,1);
  await assert.rejects(()=>call.run({name:'request_project_navigation',arguments:{mode:'switch',targetProjectId:randomUUID()}}),(e:any)=>e.detail.code&&e.detail.repairActions.length>0);
  await assert.rejects(()=>call.run({name:'request_project_navigation',arguments:{mode:'create',name:' '}}),(e:any)=>e.detail.code==='INVALID_ARGUMENTS');calls++;return '项目列表已读取，未创建或切换项目。';
 }});
 try{const auth=await app.inject({method:'POST',url:'/api/access',payload:{code}}),headers={cookie:'alva_session='+auth.cookies[0].value};
  for(const stage of ['floorplan','living']){
   if(stage==='living'){const p=await store.get(first.project.id);await store.mutate(p.id,randomUUID(),p.revision,'seed',{},p=>seedLivingStage(p));await store.updateChatState(p.id,s=>{s.active='living';return s})}
   const p=await store.get(first.project.id);const result=await app.inject({url:'/api/chat',method:'POST',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,text:'列出项目并检查错误目标',model:'gemini-3.8-flash-high',roomId:null}});assert.equal(result.statusCode,200);assert.ok(result.body.includes('event: done'),result.body.slice(-1200));
  }assert.equal(calls,2);assert.equal((await store.db.query('SELECT id FROM alva_projects')).rows.length,1);
 }finally{await app.close();await store.close();if(old===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=old}
});
