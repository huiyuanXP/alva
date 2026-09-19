import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import staticPlugin from '@fastify/static';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {existsSync} from 'node:fs';
import {AlvaStore,type Session} from './store.js';
import {DomainError,validateScene,calibrate,reject,type Project} from './model.js';
import {registerExports} from './export.js';
import {registerConsultation} from './chat.js';
import {review} from './business.js';
import {recognizeLayout} from './import.js';
import {createCanvas,DOMMatrix,ImageData,Path2D} from '@napi-rs/canvas';
const Command=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0)});
export async function imageData(mime:string,base64:string):Promise<{mime:string;data:string}>{
 if(base64.length>16_000_000||!base64.length)reject('文件最大12MB');
 const data=Buffer.from(base64,'base64');
 if(mime==='image/png'&&data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime,data:base64};
 if(mime==='image/jpeg'&&data[0]===255&&data[1]===216&&data[2]===255)return {mime,data:base64};
 if(mime==='application/pdf'&&data.subarray(0,5).toString()==='%PDF-'){
  // Single-floor import uses page one and shows that choice to the owner.
  Object.assign(globalThis,{DOMMatrix,ImageData,Path2D});
  const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
  const task=getDocument({data:new Uint8Array(data),useSystemFonts:true});const doc=await task.promise;
  try{const page=await doc.getPage(1),initial=page.getViewport({scale:1}),view=page.getViewport({scale:Math.min(2,1800/Math.max(initial.width,initial.height))});const canvas=createCanvas(Math.ceil(view.width),Math.ceil(view.height));await page.render({canvasContext:canvas.getContext('2d') as never,viewport:view,canvas:canvas as never}).promise;return {mime:'image/png',data:canvas.toBuffer('image/png').toString('base64')}}finally{await task.destroy()}
 }
 return reject('仅支持内容有效的PNG、JPEG或PDF');
}
export async function buildAlva(store:AlvaStore,{assets=true,origin=process.env.ALVA_ORIGIN||'http://127.0.0.1:4180',publicAccessToken=process.env.ALVA_PUBLIC_ACCESS_TOKEN}={}){
 const app=Fastify({logger:false,bodyLimit:17_000_000,forceCloseConnections:true});
 await app.register(cookie);await app.register(rateLimit,{max:180,timeWindow:'1 minute'});
 const sessions=new WeakMap<object,Session>();
 const session=(req:object)=>{const s=sessions.get(req);if(!s)throw new DomainError(401,'请通过项目链接进入');return s};
 const active=new Map<string,AbortController>();
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
 app.get('/healthz',async()=>({ok:true,application:'alva'}));
 app.post('/api/access',async(req,reply)=>{const {token}=z.object({token:z.string().min(32).max(100)}).parse(req.body);const s=await store.exchange(token);reply.setCookie('alva_session',s.token,{httpOnly:true,sameSite:'strict',secure:origin.startsWith('https:'),path:'/',maxAge:604800});return {projectId:s.projectId,role:s.role}});
 app.post('/api/public-access',async(req,reply)=>{
  if(req.cookies.alva_session){try{return await store.session(req.cookies.alva_session)}catch(e){if(!(e instanceof DomainError)||e.statusCode!==401)throw e}}
  if(!publicAccessToken)throw new DomainError(404,'当前站点未开启公共项目入口');
  const s=await store.exchange(publicAccessToken);
  reply.setCookie('alva_session',s.token,{httpOnly:true,sameSite:'strict',secure:origin.startsWith('https:'),path:'/',maxAge:604800});
  return {projectId:s.projectId,role:s.role};
 });
 app.get('/api/session',async req=>session(req));
 app.get('/api/projects/:id',async req=>store.get(session(req).projectId));
 app.get('/api/project',async req=>store.get(session(req).projectId));
 app.get('/api/versions',async req=>store.versions(session(req).projectId));
 app.get('/api/versions/:version',async req=>store.snapshot(session(req).projectId,z.coerce.number().int().positive().parse((req.params as {version:string}).version)));
 app.post('/api/invites',async req=>{const s=session(req);if(s.role!=='owner')reject('仅业主可生成只读链接',403);return store.invite(s.projectId,'designer')});
 app.post('/api/invites/:id/revoke',async req=>{const s=session(req);if(s.role!=='owner')reject('仅业主可撤销链接',403);await store.revoke(s.projectId,(req.params as {id:string}).id);return {revoked:true}});
 app.post('/api/projects',async req=>{if(session(req).role!=='owner')reject('仅业主可新建',403);const {name}=z.object({name:z.string().min(1).max(100)}).parse(req.body);return store.create(name)});
 const mutate=async(req:object,body:unknown,operation:string,fn:(p:Project)=>void|Promise<void>)=>{const s=session(req);if(s.role!=='owner')reject('仅业主可修改设计',403);const b=Command.parse(body);return store.mutate(s.projectId,b.requestId,b.expectedRevision,operation,body,fn)};
 app.post('/api/candidate/correct',async req=>{const b=Command.extend({scene:z.unknown()}).parse(req.body);return mutate(req,b,'candidate-correct',p=>{const candidate=validateScene(b.scene);candidate.calibration=null;for(const w of candidate.walls){w.structural='unknown';w.evidence=[]}p.candidate=candidate})});
 app.post('/api/candidate/calibrate',async req=>{const b=Command.extend({wallId:z.string(),length:z.number().positive(),source:z.string().min(1)}).parse(req.body);return mutate(req,b,'calibrate',p=>{if(!p.candidate)reject('请先导入户型');p.candidate=calibrate(p.candidate!,b.wallId,b.length,b.source)})});
 app.post('/api/candidate/confirm',async req=>{const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);return mutate(req,b,'confirm-layout',p=>{if(!p.candidate?.calibration?.confirmed)reject('请先用已知墙长完成校准');p.scene=validateScene(p.candidate);p.candidate=null;p.dirty=true;p.changes.push({id:randomUUID(),description:'确认已校准户型',evidenceIds:[],context:[],createdAt:new Date().toISOString()})})});
 registerConsultation(app,store,session,active);registerExports(app,store,session);
 app.post('/api/save',async req=>{const b=Command.extend({confirmed:z.literal(true)}).parse(req.body);return mutate(req,b,'save',p=>{if(!p.scene)reject('请先确认户型');validateScene(p.scene);p.findings=[...p.findings.filter(f=>f.stage!=='review'),...review(p,'review')]})});
 app.post('/api/restore',async req=>{const b=Command.extend({version:z.number().int().positive(),confirmed:z.literal(true)}).parse(req.body);const snap=await store.snapshot(session(req).projectId,b.version);return mutate(req,b,'restore',p=>{const revision=p.revision,savedVersion=p.savedVersion;Object.assign(p,structuredClone(snap),{revision,savedVersion,dirty:true});p.changes.push({id:randomUUID(),description:`回退到保存版本${b.version}（工作稿）`,evidenceIds:[],context:[],createdAt:new Date().toISOString()})})});
 app.post('/api/import',async(req,reply)=>{
  const s=session(req);if(s.role!=='owner')reject('仅业主可导入',403);
  const b=Command.extend({mime:z.string(),data:z.string()}).parse(req.body);
  if(active.has(s.projectId))reject('当前项目仍在处理，请取消或等待',409);
  const current=await store.get(s.projectId);if(current.revision!==b.expectedRevision)reject('项目已更新，请重新导入',409);
  const image=await imageData(b.mime,b.data);const controller=new AbortController();active.set(s.projectId,controller);
  reply.hijack();reply.raw.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache','X-Accel-Buffering':'no','Connection':'keep-alive'});
  const emit=(type:string,data:unknown)=>{if(!reply.raw.destroyed)reply.raw.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`)};
  const heartbeat=setInterval(()=>emit('status',{text:'正在识别墙、门窗和房间…'}),12000);
  const disconnect=()=>{if(!reply.raw.writableEnded)controller.abort()};reply.raw.on('close',disconnect);
  try{
   emit('status',{text:b.mime==='application/pdf'?'正在读取PDF第1页…':'正在读取户型图…'});
   const candidate=await recognizeLayout(`data:${image.mime};base64,${image.data}`,undefined,controller.signal);
   if(controller.signal.aborted)throw new Error('已取消');
   const p=await store.mutate(s.projectId,b.requestId,b.expectedRevision,'import',{mime:b.mime,data:b.data},p=>{p.candidate=candidate;p.sourceImage=image;p.evidence.push({id:randomUUID(),quote:'用户上传户型图；待校准候选，尺寸不是实测',source:'image',createdAt:new Date().toISOString()})});emit('project',p);emit('done',{ok:true});
  }catch(e){await store.failure(s.projectId,'import',controller.signal.aborted?'取消':'识图失败');emit('error',{error:controller.signal.aborted?'已取消导入':e instanceof DomainError?e.message:'识图未成功，原设计保持不变，请重试或更换清晰图片'})}
  finally{clearInterval(heartbeat);active.delete(s.projectId);reply.raw.end()}
 });
 app.post('/api/cancel',async req=>{active.get(session(req).projectId)?.abort();return {cancelled:true}});
 app.addHook('onClose',async()=>{for(const controller of active.values())controller.abort()});
 if(assets){const dir=resolve('web/dist');if(existsSync(dir)){await app.register(staticPlugin,{root:dir});app.setNotFoundHandler(async(req,reply)=>{if(req.url.startsWith('/api/'))return reply.code(404).send({error:'接口不存在'});return reply.sendFile('index.html')})}}
 return app;
}
