import {LayoutOutputError} from './import/response.js';
import {registerRecommendationQueue} from './mcp/recommendation-queue.js';
import {registerLayoutReview} from './review/service.js';
import {ContextProjectionError} from './user-context/index.js';
import {registerContextProjection,registerUserContextDecisions} from './user-context/production.js';
import {registerRoomStyles} from './room-style/index.js';
import {registerChatActions} from './mcp/actions.js';
import {generateBuildingCandidate,confirmBuilding} from './building/service.js';
import {switchChatStage} from './mcp/sessions.js';
import {applyCandidateTopology,calibrateCandidate,confirmCandidate,reopenTopology,repairCandidateTopology,drawCandidateWall} from './topology/service.js';
import {registerFloorplanAttachments} from './import/attachment-routes.js';
import {importFloorplan} from './import/service.js';
import {registerStageRoutes} from './mcp/routes.js';
import {registerIntake} from './intake/routes.js';
import {registerDesignerAccess} from './access/designer-access.js';
import {registerSnapshots} from './snapshots/routes.js';
import {prepareSnapshotRestore} from './snapshots/state.js';
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
import {registerProfessionalWalls} from './topology/professional-access.js';
import {firstTopologyRepairIssue} from './topology/repair.js';
import {applyZoneOperation} from './zones-service.js';
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
export async function buildAlva(store:AlvaStore,{assets=true,origin=process.env.ALVA_ORIGIN||'http://127.0.0.1:4180',buildingCodex,chatCodex,visionCodex,transcriptionCall,automaticRecommendations=true}:{automaticRecommendations?:boolean;assets?:boolean;origin?:string;buildingCodex?:BuildingCodexCall;chatCodex?:(input:CodexInput)=>Promise<string>;visionCodex?:(input:CodexInput)=>Promise<string>;transcriptionCall?:TranscriptionCall}={}){
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
 app.setErrorHandler((err,req,reply)=>{if(!(err instanceof DomainError)&&!(err instanceof ContextProjectionError)&&!(err instanceof LayoutOutputError)&&!(err instanceof z.ZodError)){const detail=String(err instanceof Error?err.stack:err).replaceAll(process.env.OPENAI_API_KEY||'__absent_key__','[REDACTED]');console.error('[alva request error]',req.url.split('?')[0],detail)}const code=err instanceof DomainError||err instanceof ContextProjectionError||err instanceof LayoutOutputError?err.statusCode:err instanceof z.ZodError?400:500;reply.code(code).send({...err instanceof ContextProjectionError||err instanceof LayoutOutputError?err.detail:{},error:code===500?'处理失败，草稿已保留，请重试':err instanceof Error?err.message:'请求无效'})});
 app.addHook('onRequest',async(req,reply)=>{
  reply.header('X-Content-Type-Options','nosniff').header('Referrer-Policy','no-referrer');
  if(req.url.startsWith('/api/'))reply.header('Cache-Control','no-store');
  if(req.headers.origin&&req.headers.origin!==origin&&!['GET','HEAD'].includes(req.method))throw new DomainError(403,'来源不匹配');
  if(req.url.startsWith('/api/')&&!['/api/access','/api/public-access'].includes(req.url.split('?')[0])){
   const s=await store.session(req.cookies.alva_session||'');sessions.set(req,s);
   const id=req.url.match(/^\/api\/projects\/([^/?]+)/)?.[1];if(id&&id!==s.projectId)throw new DomainError(403,'无权访问其他项目');
   const path=req.url.split('?')[0];
   if(s.role==='professional'&&!['GET','HEAD'].includes(req.method)&&!['/api/logout','/api/professional/walls/classify','/api/professional/walls/remove'].includes(path))throw new DomainError(403,'专业角色仅可执行受控墙体专业操作');
   if(s.role==='designer'&&!['GET','HEAD'].includes(req.method)&&path!=='/api/logout')throw new DomainError(403,'设计师入口为只读');
  }
 });
 registerFloorplanAttachments(app,session);
 registerStageRoutes(app,store,session,active,chatCodex);
 registerChatActions(app,store,session,active);
 registerRoomStyles(app,store,session);
 registerContextProjection(app,store);registerUserContextDecisions(app,store,session);registerLayoutReview(app,store,session);
 if(automaticRecommendations)registerRecommendationQueue(app,store,session,active);
 registerTodo(app);
 registerTopologyDiagnostics(app,store,session);
 registerProfessionalWalls(app,store,session);
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
 registerDesignerAccess(app,store,session);
 app.post('/api/projects',async req=>{if(session(req).role!=='owner')reject('仅业主可新建',403);const {name}=z.object({name:z.string().min(1).max(100)}).parse(req.body);return store.create(name)});
 const mutate=async(req:object,body:unknown,operation:string,fn:(p:Project)=>void|Promise<void>)=>{const s=session(req);if(s.role!=='owner')reject('仅业主可修改设计',403);const b=Command.parse(body);return store.mutate(s.projectId,b.requestId,b.expectedRevision,operation,body,fn)};
 app.post('/api/candidate/correct',async req=>{const b=Command.extend({scene:z.unknown()}).parse(req.body);return mutate(req,b,'candidate-correct',p=>{const candidate=validateTopology(b.scene);candidate.calibration=null;for(const w of candidate.walls){w.structural='unknown';w.evidence=[]}p.candidate=candidate})});
 app.post('/api/candidate/topology',async req=>{const b=Command.extend({operation:z.unknown()}).parse(req.body);return mutate(req,b,'candidate-topology',p=>{applyCandidateTopology(p,b)})});
 app.get('/api/candidate/topology/problem',async req=>{const p=await store.get(session(req).projectId);return {issue:p.candidate?firstTopologyRepairIssue(p.candidate):null,revision:p.revision}});
 app.post('/api/candidate/topology/repair',async req=>{const b=Command.extend({issueId:z.string().min(1),optionId:z.string().min(1)}).parse(req.body);return mutate(req,b,'candidate-topology-repair',p=>repairCandidateTopology(p,b))});
 app.post('/api/candidate/topology/draw-wall',async req=>{const b=Command.extend({a:z.object({x:z.number().finite(),y:z.number().finite()}),b:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'candidate-draw-wall',p=>drawCandidateWall(p,b))});
 app.post('/api/ui/room-label',async req=>{const b=Command.extend({roomId:z.string().min(1),position:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'room-label-position',p=>{const scene=p.candidate||p.scene;if(!scene)reject('当前没有可编辑户型');const currentScene=scene!;const room=currentScene.rooms.find(r=>r.id===b.roomId);if(!room)reject('区域不存在');if(!pointInPolygon(b.position,room!.polygon))reject('区域名称请放在对应区域内部');p.roomLabelPositions={...(p.roomLabelPositions||{}),[b.roomId]:b.position}})});
 app.post('/api/zones/divide',async req=>{const b=Command.extend({a:z.object({x:z.number().finite(),y:z.number().finite()}),b:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'zone-divide',p=>applyZoneOperation(p,{kind:'divide',a:b.a,b:b.b}))});
 app.post('/api/zones/three-wall',async req=>{const b=Command.extend({point:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'zone-three-wall',p=>applyZoneOperation(p,{kind:'three-wall',point:b.point}))});
 app.post('/api/zones/rename',async req=>{const b=Command.extend({zoneId:z.string().min(1),name:z.string().trim().min(1).max(80)}).parse(req.body);return mutate(req,b,'zone-rename',p=>applyZoneOperation(p,{kind:'rename',zoneId:b.zoneId,name:b.name}))});
 app.post('/api/zones/remove',async req=>{const b=Command.extend({zoneId:z.string().min(1)}).parse(req.body);return mutate(req,b,'zone-remove',p=>applyZoneOperation(p,{kind:'remove',zoneId:b.zoneId}))});
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
 registerConsultation(app,store,session,active,chatCodex,activeTranscriptions,transcriptionCall,visionCodex);registerReferences(app,store,session,chatCodex);registerExports(app,store,session);
 registerSnapshots(app,store,session);
 app.post('/api/restore',async req=>{const b=Command.extend({version:z.number().int().positive(),confirmed:z.literal(true)}).parse(req.body),s=session(req);if(activeBuilding.has(s.projectId))reject('当前仍在生成建筑3D，请先取消或等待完成后再恢复快照',409);const snap=await store.snapshot(s.projectId,b.version);return mutate(req,b,'restore',p=>{const restored=prepareSnapshotRestore(snap,p.revision,p.savedVersion);Object.assign(p,restored);p.changes.push({id:randomUUID(),description:`恢复到保存版本${b.version}（当前工作稿）`,evidenceIds:[],context:['用户明确确认：当前未保存修改将被该手动快照整体替换','恢复本身不会创建新的快照；如需保留恢复后的状态，请再次手动保存'],createdAt:new Date().toISOString()})})});
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
   const project=await importFloorplan(store,s.projectId,{...b,filename},controller.signal,text=>emit('status',{text}),visionCodex);
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
