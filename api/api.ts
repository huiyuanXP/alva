import {registerRoomStyles} from './room-style/index.js';
import {registerChatActions} from './mcp/actions.js';
import {generateBuildingCandidate,confirmBuilding} from './building/service.js';
import {switchChatStage} from './mcp/sessions.js';
import {applyCandidateTopology,calibrateCandidate,confirmCandidate,reopenTopology} from './topology/service.js';
import {registerFloorplanAttachments} from './import/attachment-routes.js';
import {importFloorplan} from './import/service.js';
import {registerStageRoutes} from './mcp/routes.js';
import {registerIntake} from './intake/routes.js';
import {registerSnapshots} from './snapshots/routes.js';
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {AlvaStore,type Session} from './store.js';
import {DomainError,validateScene,calibrate,pointInPolygon,reject,type ImportState,type Project,type SourceImage} from './model.js';
import {applyTopologyCommand} from './topology/commands.js';
import {validateTopology} from './topology/validate.js';
import {registerTopologyDiagnostics} from './topology/routes.js';
import {addWallFromClicks,applyTopologyRepair,firstTopologyRepairIssue} from './topology/repair.js';
import {divideRoomByVirtualLine,zoneFromThreeWalls} from './zones.js';
import {createTopologyVersion} from './topology/calibration.js';
import {generateBuilding,buildingFailureMessage,type BuildingCodexCall} from './building/generate.js';
import {registerTodo} from './todo/routes.js';
import {registerExports} from './export.js';
import {registerConsultation,type TranscriptionCall} from './chat.js';
import type {CodexInput} from './codex.js';
import {review} from './business.js';
import {registerReferences} from './references.js';
import {recognizeLayout,layoutRecognitionModel} from './import.js';
import {imageData} from './import/image-data.js';
export {imageData} from './import/image-data.js';
const Command=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0)});
export async function buildAlva(store:AlvaStore,{assets=true,origin=process.env.ALVA_ORIGIN||'http://127.0.0.1:4180',buildingCodex,chatCodex,transcriptionCall}:{assets?:boolean;origin?:string;buildingCodex?:BuildingCodexCall;chatCodex?:(input:CodexInput)=>Promise<string>;transcriptionCall?:TranscriptionCall}={}){
 const publicPayload=(value:unknown):unknown=>{if(Array.isArray(value))return value.map(publicPayload);if(value&&typeof value==='object'){const result:Record<string,unknown>={};for(const [key,item] of Object.entries(value as Record<string,unknown>)){if(key==='budget')continue;result[key]=publicPayload(item)}return result}return value};
 const app=Fastify({logger:false,bodyLimit:17_000_000,forceCloseConnections:true});
 app.addHook('preSerialization',async(_req,_reply,payload)=>publicPayload(payload));
 await app.register(cookie);await app.register(rateLimit,{max:180,timeWindow:'1 minute'});
 const sessions=new WeakMap<object,Session>();
 const session=(req:object)=>{const s=sessions.get(req);if(!s)throw new DomainError(401,'请通过项目链接进入');return s};
 const active=new Map<string,AbortController>();
 const activeBuilding=new Map<string,AbortController>();
 const activeTranscriptions=new Map<string,AbortController>();
 const failedAccess=new Map<string,{count:number;resetAt:number}>();
 app.setErrorHandler((err,req,reply)=>{if(!(err instanceof DomainError)&&!(err instanceof z.ZodError)){const detail=String(err instanceof Error?err.stack:err).replaceAll(process.env.OPENAI_API_KEY||'__absent_key__','[REDACTED]');console.error('[alva request error]',req.url.split('?')[0],detail)}const code=err instanceof DomainError?err.statusCode:err instanceof z.ZodError?400:500;reply.code(code).send({error:code===500?'处理失败，草稿已保留，请重试':err instanceof Error?err.message:'请求无效'})});
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer');
  if(req.url.startsWith('/api/'))reply.header('Cache-Control','no-store');
  if(req.headers.origin&&req.headers.origin!==origin&&!['GET','HEAD'].includes(req.method))throw new DomainError(403,'来源不匹配');
  if(req.url.startsWith('/api/')&&!['/api/access','/api/public-access'].includes(req.url.split('?')[0])){
   const s=await store.session(req.cookies.alva_session||'');sessions.set(req,s);
   const id=req.url.match(/^\/api\/projects\/([^/?]+)/)?.[1];if(id&&id!==s.projectId)throw new DomainError(403,'无权访问其他项目');
   if(s.role==='designer'&&!['GET','HEAD'].includes(req.method))throw new DomainError(403,'设计师入口为只读');
  }
 });
 registerFloorplanAttachments(app,session);
 registerStageRoutes(app,store,session,active,chatCodex);
 registerChatActions(app,store,session,active);
 registerRoomStyles(app,store,session);
 registerTodo(app);
 registerTopologyDiagnostics(app,store,session);
 app.get('/healthz',async()=>({ok:true,application:'alva'}));
 app.post('/api/access',async(req,reply)=>{
  const b=z.object({code:z.string().trim().min(16).max(200),inviteToken:z.string().min(32).max(200).optional()}).parse(req.body),key=req.ip,now=Date.now(),prior=failedAccess.get(key);
  if(prior&&prior.resetAt>now&&prior.count>=8)throw new DomainError(429,'尝试次数过多，请稍后再试');
  try{const s=await store.exchangeAccessCode(b.code,b.inviteToken);failedAccess.delete(key);reply.setCookie('alva_session',s.token,{httpOnly:true,sameSite:'strict',secure:origin.startsWith('https:'),path:'/',maxAge:store.sessionMaxAgeSeconds()});return {projectId:s.projectId,role:s.role}}
  catch(error){if(error instanceof DomainError&&error.statusCode===401){const current=failedAccess.get(key);failedAccess.set(key,{count:(current&&current.resetAt>now?current.count:0)+1,resetAt:current&&current.resetAt>now?current.resetAt:now+600_000})}throw error}
 });
 app.post('/api/logout',async(req,reply)=>{const token=req.cookies.alva_session;const s=session(req);await store.logout(token||'');reply.clearCookie('alva_session',{path:'/',httpOnly:true,sameSite:'strict',secure:origin.startsWith('https:')});return {loggedOut:true,projectId:s.projectId}});
 app.get('/api/session',async req=>session(req));
 app.get('/api/projects/:id',async req=>store.get(session(req).projectId));
 app.get('/api/project',async req=>store.get(session(req).projectId));
 app.get('/api/versions',async req=>store.versions(session(req).projectId));
 app.get('/api/versions/:version',async req=>store.snapshot(session(req).projectId,z.coerce.number().int().positive().parse((req.params as {version:string}).version)));
 app.get('/api/topology/versions',async req=>(await store.get(session(req).projectId)).topologyVersions||[]);
 app.get('/api/topology/confirmed',async req=>(await store.get(session(req).projectId)).confirmedTopology||null);
 app.post('/api/invites',async req=>{const s=session(req);if(s.role!=='owner')reject('仅业主可生成只读链接',403);return store.invite(s.projectId,'designer')});
 app.post('/api/invites/:id/revoke',async req=>{const s=session(req);if(s.role!=='owner')reject('仅业主可撤销链接',403);await store.revoke(s.projectId,(req.params as {id:string}).id);return {revoked:true}});
 app.post('/api/projects',async req=>{if(session(req).role!=='owner')reject('仅业主可新建',403);const {name}=z.object({name:z.string().min(1).max(100)}).parse(req.body);return store.create(name)});
 const mutate=async(req:object,body:unknown,operation:string,fn:(p:Project)=>void|Promise<void>)=>{const s=session(req);if(s.role!=='owner')reject('仅业主可修改设计',403);const b=Command.parse(body);return store.mutate(s.projectId,b.requestId,b.expectedRevision,operation,body,fn)};
 app.post('/api/candidate/correct',async req=>{const b=Command.extend({scene:z.unknown()}).parse(req.body);return mutate(req,b,'candidate-correct',p=>{const candidate=validateTopology(b.scene);candidate.calibration=null;for(const w of candidate.walls){w.structural='unknown';w.evidence=[]}p.candidate=candidate})});
 app.post('/api/candidate/topology',async req=>{const b=Command.extend({operation:z.unknown()}).parse(req.body);return mutate(req,b,'candidate-topology',p=>{applyCandidateTopology(p,b)})});
 app.get('/api/candidate/topology/problem',async req=>{const p=await store.get(session(req).projectId);return {issue:p.candidate?firstTopologyRepairIssue(p.candidate):null,revision:p.revision}});
 app.post('/api/candidate/topology/repair',async req=>{const b=Command.extend({issueId:z.string().min(1),optionId:z.string().min(1)}).parse(req.body);return mutate(req,b,'candidate-topology-repair',p=>{const candidate=p.candidate;if(!candidate)reject('请先导入户型');const result=applyTopologyRepair(candidate!,b.issueId,b.optionId);p.candidate=result.scene;p.changes.push({id:randomUUID(),description:result.description,evidenceIds:[],context:['业主从拓扑错误建议中选择修复方案；后台执行后重新检查'],createdAt:new Date().toISOString()})})});
 app.post('/api/candidate/topology/draw-wall',async req=>{const b=Command.extend({a:z.object({x:z.number().finite(),y:z.number().finite()}),b:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'candidate-draw-wall',p=>{const candidate=p.candidate;if(!candidate)reject('请先导入户型');const result=addWallFromClicks(candidate!,b.a,b.b);p.candidate=result.scene;p.changes.push({id:randomUUID(),description:result.description,evidenceIds:[],context:['业主在二维平面图上点击起点和终点补画墙线；后台自动吸附到附近端点或墙体'],createdAt:new Date().toISOString()})})});
 app.post('/api/ui/room-label',async req=>{const b=Command.extend({roomId:z.string().min(1),position:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'room-label-position',p=>{const scene=p.candidate||p.scene;if(!scene)reject('当前没有可编辑户型');const currentScene=scene!;const room=currentScene.rooms.find(r=>r.id===b.roomId);if(!room)reject('区域不存在');if(!pointInPolygon(b.position,room!.polygon))reject('区域名称请放在对应区域内部');p.roomLabelPositions={...(p.roomLabelPositions||{}),[b.roomId]:b.position}})});
 app.post('/api/zones/divide',async req=>{const b=Command.extend({a:z.object({x:z.number().finite(),y:z.number().finite()}),b:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'zone-divide',p=>{if(p.candidate||!p.scene||!p.confirmedTopology)reject('请先确认户型，再进行功能分区');const zones=divideRoomByVirtualLine(p.scene!,b.a,b.b,(p.zones?.length||0)+1),roomId=zones[0]!.roomId;p.zones=[...(p.zones||[]).filter(z=>z.roomId!==roomId),...zones];p.dirty=true;p.changes.push({id:randomUUID(),description:`新增虚拟分区线并形成 ${zones.length} 个功能区`,evidenceIds:[],context:['功能分区不新增实体墙，不改变已确认拓扑或建筑3D结构'],createdAt:new Date().toISOString()})})});
 app.post('/api/zones/three-wall',async req=>{const b=Command.extend({point:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'zone-three-wall',p=>{if(p.candidate||!p.scene||!p.confirmedTopology)reject('请先确认户型，再进行功能分区');const zone=zoneFromThreeWalls(p.scene!,b.point,(p.zones?.length||0)+1);p.zones=[...(p.zones||[]),zone];p.dirty=true;p.changes.push({id:randomUUID(),description:`根据三面墙自动形成新功能区“${zone.name}”`,evidenceIds:[],context:['第四边为虚拟分区边界，不创建真实墙体'],createdAt:new Date().toISOString()})})});
 app.post('/api/zones/rename',async req=>{const b=Command.extend({zoneId:z.string().min(1),name:z.string().trim().min(1).max(80)}).parse(req.body);return mutate(req,b,'zone-rename',p=>{const zone=(p.zones||[]).find(z=>z.id===b.zoneId);if(!zone)reject('功能区不存在');zone!.name=b.name;p.dirty=true})});
 app.post('/api/zones/remove',async req=>{const b=Command.extend({zoneId:z.string().min(1)}).parse(req.body);return mutate(req,b,'zone-remove',p=>{const before=p.zones?.length||0;p.zones=(p.zones||[]).filter(z=>z.id!==b.zoneId);if(p.zones.length===before)reject('功能区不存在');p.dirty=true})});
 app.post('/api/candidate/calibrate',async req=>{const b=Command.extend({wallId:z.string(),length:z.number().positive(),source:z.string().min(1)}).parse(req.body);return mutate(req,b,'calibrate',p=>{calibrateCandidate(p,b)})});
 app.post('/api/candidate/confirm',async req=>{const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);return mutate(req,b,'confirm-layout',p=>{confirmCandidate(p,b)})});
 app.post('/api/topology/reopen',async req=>{const b=Command.extend({confirmed:z.literal(true),discardDownstream:z.literal(true)}).parse(req.body);const s=session(req);if(activeBuilding.has(s.projectId))reject('当前仍在生成建筑3D，请先取消或等待完成',409);return mutate(req,b,'reopen-topology',p=>{reopenTopology(p,b)})});
 app.get('/api/building',async req=>{const p=await store.get(session(req).projectId);return {state:p.buildingState,candidate:p.buildingCandidate||null,confirmed:p.confirmedBuilding||null}});
 app.post('/api/building/generate',async req=>{
  const b=Command.parse(req.body),s=session(req);if(s.role!=='owner')reject('仅业主可生成建筑',403);
  if(activeBuilding.has(s.projectId))reject('当前已有建筑生成任务，请等待或取消',409);
  const controller=new AbortController();activeBuilding.set(s.projectId,controller);
  try{return await generateBuildingCandidate(store,s.projectId,b,controller.signal,buildingCodex)}finally{activeBuilding.delete(s.projectId)}
 });
 app.post('/api/building/confirm',async req=>{
  const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);
  const project=await mutate(req,b,'confirm-building',p=>confirmBuilding(p));
  await switchChatStage(store,project.id,'living',project.revision);return project;
 });
 registerIntake(app,store,session);
 registerConsultation(app,store,session,active,chatCodex,activeTranscriptions,transcriptionCall);registerReferences(app,store,session,chatCodex);registerExports(app,store,session);
 registerSnapshots(app,store,session);
 app.post('/api/restore',async req=>{const b=Command.extend({version:z.number().int().positive(),confirmed:z.literal(true)}).parse(req.body);const snap=await store.snapshot(session(req).projectId,b.version);return mutate(req,b,'restore',p=>{const revision=p.revision,savedVersion=p.savedVersion;Object.assign(p,structuredClone(snap),{revision,savedVersion,dirty:true});p.changes.push({id:randomUUID(),description:`回退到保存版本${b.version}（工作稿）`,evidenceIds:[],context:[],createdAt:new Date().toISOString()})})});
 app.post('/api/import',async(req,reply)=>{
  const s=session(req);if(s.role!=='owner')reject('仅业主可导入',403);
  const b=Command.extend({mime:z.string(),data:z.string(),filename:z.string().trim().min(1).max(255).optional()}).parse(req.body);
  if(active.has(s.projectId))reject('当前项目仍在处理，请取消或等待',409);
  const filename=b.filename||'户型图',input={mime:b.mime,data:b.data,filename};
  const replay=await store.replay(s.projectId,b.requestId,'import',input);
  if(!replay){const current=await store.get(s.projectId);if(current.revision!==b.expectedRevision)reject('项目已更新，请重新导入',409)}
  const controller=new AbortController();active.set(s.projectId,controller);
  reply.hijack();reply.raw.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Accel-Buffering':'no','Connection':'keep-alive'});
  const emit=(type:string,data:unknown)=>{if(!reply.raw.destroyed)reply.raw.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)};
  const heartbeat=setInterval(()=>emit('status',{text:'正在识别墙、门窗和房间…'}),12000);
  const disconnect=()=>{if(!reply.raw.writableEnded)controller.abort()};reply.raw.on('close',disconnect);
  try{
   if(replay){emit('status',{text:'正在返回已完成的导入结果…'});emit('project',replay);emit('done',{ok:true,replayed:true});return}
   const project=await importFloorplan(store,s.projectId,{...b,filename},controller.signal,text=>emit('status',{text}));
   emit('project',project);emit('done',{ok:true});
  }catch(e){emit('error',{error:controller.signal.aborted?'已取消导入':e instanceof DomainError?e.message:'识图未成功，原设计保持不变，请重试或更换清晰图片'})}
  finally{clearInterval(heartbeat);active.delete(s.projectId);reply.raw.end()}
 });
 app.post('/api/cancel',async req=>{const id=session(req).projectId;active.get(id)?.abort();activeBuilding.get(id)?.abort();return {cancelled:true}});
 app.post('/api/building/cancel',async req=>{activeBuilding.get(session(req).projectId)?.abort();return {cancelled:true}});
 app.addHook('onClose',async()=>{for(const controller of active.values())controller.abort();for(const controller of activeBuilding.values())controller.abort();for(const controller of activeTranscriptions.values())controller.abort()});
 if(assets){const dir=resolve('web/dist');if(existsSync(dir)){await app.register(staticPlugin,{root:dir});app.setNotFoundHandler(async(req,reply)=>{if(req.url.startsWith('/api/'))return reply.code(404).send({error:'接口不存在'});return reply.sendFile('index.html')})}}
 return app;
}
