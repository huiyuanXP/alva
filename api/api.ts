import {registerIntake} from './intake/routes.js';
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
import {addWallFromClicks,applyTopologyRepair,firstTopologyRepairIssue} from './topology/repair.js';
import {createTopologyVersion} from './topology/calibration.js';
import {generateBuilding,buildingFailureMessage,type BuildingCodexCall} from './building/generate.js';
import {registerTodo} from './todo/routes.js';
import {registerExports} from './export.js';
import {registerConsultation,type TranscriptionCall} from './chat.js';
import type {CodexInput} from './codex.js';
import {review} from './business.js';
import {recognizeLayout,layoutRecognitionModel} from './import.js';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
const Command=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0)});
export async function imageData(mime:string,base64:string,filename='户型图'):Promise<SourceImage>{
 if(base64.length>16_000_000||!base64.length)reject('文件最大12MB');
 const data=Buffer.from(base64,'base64');
 if(mime==='image/png'&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime,data:base64,originalMime:mime,filename};
 if(mime==='image/jpeg'&&data[0]===255&&data[1]===216&&data[2]===255)return {mime,data:base64,originalMime:mime,filename};
 if(mime==='application/pdf'&&data.subarray(0,5).toString()==='%PDF-'){
  // Single-floor import uses page one and shows that choice to the owner.
  Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(data),useSystemFonts:true});const doc=await task.promise;
  try{const page=await doc.getPage(1),initial=page.getViewport({scale:1}),view=page.getViewport({scale:Math.min(2,1800/Math.max(initial.width,initial.height))});const canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await page.render({canvasContext:canvas.getContext('2d') as never,viewport:view,canvas:canvas as never}).promise;return {mime:'image/png',data:canvas.toBuffer('image/png').toString('base64'),originalMime:mime,originalData:base64,filename,page:1,pages:doc.numPages}}finally{await task.destroy()}
 }
 return reject('仅支持内容有效的PNG、JPEG或PDF');
}
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
 registerTodo(app);
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
 app.post('/api/candidate/topology',async req=>{const b=Command.extend({operation:z.unknown()}).parse(req.body);return mutate(req,b,'candidate-topology',p=>{if(!p.candidate)reject('请先导入户型');const result=applyTopologyCommand(p.candidate!,b.operation);result.scene.calibration=null;p.candidate=result.scene;p.changes.push({id:randomUUID(),description:result.description,evidenceIds:[],context:['ALVA-010 墙线与房间轮廓校正'],createdAt:new Date().toISOString()})})});
 app.get('/api/candidate/topology/problem',async req=>{const p=await store.get(session(req).projectId);return {issue:p.candidate?firstTopologyRepairIssue(p.candidate):null,revision:p.revision}});
 app.post('/api/candidate/topology/repair',async req=>{const b=Command.extend({issueId:z.string().min(1),optionId:z.string().min(1)}).parse(req.body);return mutate(req,b,'candidate-topology-repair',p=>{const candidate=p.candidate;if(!candidate)reject('请先导入户型');const result=applyTopologyRepair(candidate!,b.issueId,b.optionId);p.candidate=result.scene;p.changes.push({id:randomUUID(),description:result.description,evidenceIds:[],context:['业主从拓扑错误建议中选择修复方案；后台执行后重新检查'],createdAt:new Date().toISOString()})})});
 app.post('/api/candidate/topology/draw-wall',async req=>{const b=Command.extend({a:z.object({x:z.number().finite(),y:z.number().finite()}),b:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'candidate-draw-wall',p=>{const candidate=p.candidate;if(!candidate)reject('请先导入户型');const result=addWallFromClicks(candidate!,b.a,b.b);p.candidate=result.scene;p.changes.push({id:randomUUID(),description:result.description,evidenceIds:[],context:['业主在二维平面图上点击起点和终点补画墙线；后台自动吸附到附近端点或墙体'],createdAt:new Date().toISOString()})})});
 app.post('/api/ui/room-label',async req=>{const b=Command.extend({roomId:z.string().min(1),position:z.object({x:z.number().finite(),y:z.number().finite()})}).parse(req.body);return mutate(req,b,'room-label-position',p=>{const scene=p.candidate||p.scene;if(!scene)reject('当前没有可编辑户型');const currentScene=scene!;const room=currentScene.rooms.find(r=>r.id===b.roomId);if(!room)reject('区域不存在');if(!pointInPolygon(b.position,room!.polygon))reject('区域名称请放在对应区域内部');p.roomLabelPositions={...(p.roomLabelPositions||{}),[b.roomId]:b.position}})});
 app.post('/api/candidate/calibrate',async req=>{const b=Command.extend({wallId:z.string(),length:z.number().positive(),source:z.string().min(1)}).parse(req.body);return mutate(req,b,'calibrate',p=>{if(!p.candidate)reject('请先导入户型');p.candidate=validateTopology(calibrate(p.candidate!,b.wallId,b.length,b.source))})});
 app.post('/api/candidate/confirm',async req=>{const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);return mutate(req,b,'confirm-layout',p=>{if(!p.candidate?.calibration?.confirmed)reject('请先用已知墙长完成校准');const confirmed=validateTopology(p.candidate);const topology=createTopologyVersion(p,confirmed);p.topologyVersions=[...(p.topologyVersions||[]),topology];p.confirmedTopology=topology;p.scene=structuredClone(confirmed);p.candidate=null;if(p.confirmedBuilding&&p.buildingState.topologyFingerprint!==topology.sourceFingerprint)p.buildingState={status:'expired',topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,attempts:p.buildingState.attempts,updatedAt:new Date().toISOString(),error:'拓扑已更新，旧建筑场景需要重新生成'};p.dirty=true;p.changes.push({id:randomUUID(),description:`确认已校准拓扑 v${topology.version}`,evidenceIds:[],context:topology.assumptions,createdAt:new Date().toISOString()})})});
 app.post('/api/topology/reopen',async req=>{const b=Command.extend({confirmed:z.literal(true),discardDownstream:z.literal(true)}).parse(req.body);const s=session(req);if(activeBuilding.has(s.projectId))reject('当前仍在生成建筑3D，请先取消或等待完成',409);return mutate(req,b,'reopen-topology',p=>{const topology=p.confirmedTopology;if(!topology)reject('当前没有已确认户型可返回修改');const candidate=structuredClone(topology!.scene);candidate.items=[];p.candidate=candidate;p.scene=null;p.confirmedTopology=undefined;p.buildingCandidate=undefined;p.confirmedBuilding=undefined;p.buildingState={status:'idle',attempts:0,updatedAt:new Date().toISOString()};p.proposals=[];p.findings=p.findings.filter(f=>f.stage!=='review');p.dirty=true;p.changes.push({id:randomUUID(),description:`返回修改户型（基于原确认拓扑 v${topology!.version}）；已清除该户型之后的空间设计、家具方案与建筑3D`,evidenceIds:[],context:['用户明确确认：修改房型将放弃当前房型之后的所有空间设计修改；原图、证据、问卷回答和聊天记录保留'],createdAt:new Date().toISOString()})})});
 app.get('/api/building',async req=>{const p=await store.get(session(req).projectId);return {state:p.buildingState,candidate:p.buildingCandidate||null,confirmed:p.confirmedBuilding||null}});
 app.post('/api/building/generate',async req=>{const b=Command.parse(req.body);const s=session(req);if(s.role!=='owner')reject('仅业主可生成建筑',403);const before=await store.get(s.projectId),topology=before.confirmedTopology!;if(!topology)reject('请先确认拓扑版本');if(before.buildingState?.status==='processing')reject('当前已有建筑生成任务，请等待或取消',409);if((before.buildingState?.attempts||0)>=3)reject('建筑生成失败次数已达上限，请先确认拓扑后再重试');const controller=new AbortController();activeBuilding.set(s.projectId,controller);const started=await store.mutate(s.projectId,randomUUID(),b.expectedRevision,'building-start',{requestId:b.requestId,topologyVersion:topology!.version,topologyFingerprint:topology!.sourceFingerprint},p=>{p.buildingState={status:'processing',requestId:b.requestId,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,attempts:(p.buildingState?.attempts||0)+1,updatedAt:new Date().toISOString()}});
  try{const generated=await generateBuilding(started,topology!.scene,topology!.version,topology!.sourceFingerprint,controller.signal,buildingCodex);return await store.mutate(s.projectId,randomUUID(),started.revision,'building-complete',{requestId:b.requestId},p=>{p.buildingCandidate=generated;p.buildingState={status:'succeeded',requestId:b.requestId,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,attempts:p.buildingState.attempts,updatedAt:new Date().toISOString()}})}catch(error){const cancelled=controller.signal.aborted,current=await store.get(s.projectId);const message=cancelled?'建筑生成已取消，已有场景保持不变':buildingFailureMessage(error);await store.mutate(s.projectId,randomUUID(),current.revision,'building-failed',{requestId:b.requestId,error:message},p=>{p.buildingState={status:cancelled?'cancelled':'failed',requestId:b.requestId,topologyVersion:topology.version,topologyFingerprint:topology.sourceFingerprint,attempts:p.buildingState.attempts,error:message,updatedAt:new Date().toISOString()}});throw new DomainError(cancelled?409:422,message)}finally{activeBuilding.delete(s.projectId)}});
 app.post('/api/building/confirm',async req=>{const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);return mutate(req,b,'confirm-building',p=>{if(!p.buildingCandidate)reject('请先生成并预览建筑场景');if(!p.confirmedTopology||p.buildingState.topologyFingerprint!==p.confirmedTopology!.sourceFingerprint)reject('建筑场景已过期，请针对当前拓扑重新生成');p.confirmedBuilding=structuredClone(p.buildingCandidate);p.buildingCandidate=undefined;p.buildingState={...p.buildingState,status:'confirmed',updatedAt:new Date().toISOString()};p.dirty=true;p.changes.push({id:randomUUID(),description:`确认建筑场景（拓扑 v${p.confirmedTopology!.version}）`,evidenceIds:[],context:[`建筑生成回指来源指纹 ${p.confirmedTopology!.sourceFingerprint}`],createdAt:new Date().toISOString()})})});
 registerIntake(app,store,session);
 registerConsultation(app,store,session,active,chatCodex,activeTranscriptions,transcriptionCall);registerExports(app,store,session);
 app.post('/api/save',async req=>{const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);return mutate(req,b,'save',p=>{if(!p.scene)reject('请先确认户型');validateScene(p.scene);p.findings=[...p.findings.filter(f=>f.stage!=='review'),...review(p,'review')]})});
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
 const startedAt=new Date().toISOString();
  try{
   if(replay){emit('status',{text:'正在返回已完成的导入结果…'});emit('project',replay);emit('done',{ok:true,replayed:true});return}
   emit('status',{text:b.mime==='application/pdf'?'正在读取PDF第1页…':'正在读取户型图…'});
   await store.setImportState(s.projectId,{status:'processing',message:b.mime==='application/pdf'?'正在读取PDF第1页并交给Codex识别…':'正在读取户型图并交给Codex识别…',requestId:b.requestId,sourceMime:b.mime,filename,startedAt});
   const image=await imageData(b.mime,b.data,filename);
   await store.setImportState(s.projectId,{status:'processing',message:image.page?`正在识别PDF第${image.page}页（共${image.pages}页）…`:'正在由Codex识别当前附件…',requestId:b.requestId,sourceMime:b.mime,filename,page:image.page,pages:image.pages,startedAt});
   const candidate=await recognizeLayout(`data:${image.mime};base64,${image.data}`,undefined,controller.signal);
   if(controller.signal.aborted)throw new Error('已取消');
   const finishedAt=new Date().toISOString();
   const p=await store.mutate(s.projectId,b.requestId,b.expectedRevision,'import',input,p=>{p.candidate=candidate;p.sourceImage=image;p.importState={status:'succeeded',message:'Codex已完成识别，二维候选待你核对和校准。',requestId:b.requestId,sourceMime:image.originalMime,filename:image.filename,page:image.page,pages:image.pages,provider:'codex',model:layoutRecognitionModel(),startedAt,finishedAt};p.dirty=true;p.evidence.push({id:randomUUID(),quote:`用户上传${image.originalMime==='application/pdf'?'PDF第1页预览':'户型图'}；Codex实际读取该附件并生成墙、房间、门窗候选，尺寸仍未校准`,source:'image',createdAt:finishedAt})});emit('project',p);emit('done',{ok:true});
  }catch(e){const cancelled=controller.signal.aborted;const status:ImportState={status:cancelled?'cancelled':'failed',message:cancelled?'导入已取消，原工作稿和已确认场景保持不变':'识图未成功，原工作稿和已确认场景保持不变；请重试或更换清晰附件',requestId:b.requestId,sourceMime:b.mime,filename,startedAt,finishedAt:new Date().toISOString()};try{await store.setImportState(s.projectId,status);await store.failure(s.projectId,'import',cancelled?'取消':'识图失败')}catch{}emit('error',{error:cancelled?'已取消导入':e instanceof DomainError?e.message:'识图未成功，原设计保持不变，请重试或更换清晰图片'})}
  finally{clearInterval(heartbeat);active.delete(s.projectId);reply.raw.end()}
 });
 app.post('/api/cancel',async req=>{const id=session(req).projectId;active.get(id)?.abort();activeBuilding.get(id)?.abort();return {cancelled:true}});
 app.post('/api/building/cancel',async req=>{activeBuilding.get(session(req).projectId)?.abort();return {cancelled:true}});
 app.addHook('onClose',async()=>{for(const controller of active.values())controller.abort();for(const controller of activeBuilding.values())controller.abort();for(const controller of activeTranscriptions.values())controller.abort()});
 if(assets){const dir=resolve('web/dist');if(existsSync(dir)){await app.register(staticPlugin,{root:dir});app.setNotFoundHandler(async(req,reply)=>{if(req.url.startsWith('/api/'))return reply.code(404).send({error:'接口不存在'});return reply.sendFile('index.html')})}}
 return app;
}
