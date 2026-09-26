import {mcpFailure} from './contracts.js';
import {randomUUID} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import type {AlvaStore,Session} from '../store.js';
import {mainChatAgent} from '../main-chat-agent.js';
/** Durable pending jobs live in Project; only the in-flight drain is process-local. */
export function registerRecommendationQueue(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session,active:Map<string,AbortController>){
 const drains=new Map<string,Promise<void>>();let closing=false;
 const drain=async(projectId:string,token:string)=>{
  while(!closing){
   if(active.has(projectId))return;
   const user=await store.session(token);if(user.projectId!==projectId||user.role!=='owner')return;
   const p=await store.get(projectId),state=await store.chatState(projectId);if(!p.confirmedBuilding||state.active!=='living')return;
   const job=p.answerRecommendations?.find(j=>j.status==='pending'||j.status==='running');if(!job)return;
   const response=await app.inject({method:'POST',url:mainChatAgent.route,headers:{cookie:`alva_session=${token}`},payload:{requestId:randomUUID(),expectedRevision:p.revision,recommendationId:job.id,text:'根据已确认回答生成家具建议',roomId:job.roomId,model:mainChatAgent.model}});
   if(response.statusCode!==200)return;
   // Successful/failed turns atomically finish the job; do not spin on a partial response.
   const latest=await store.get(projectId);if(['pending','running'].includes(latest.answerRecommendations?.find(j=>j.id===job.id)?.status||''))return;
  }
 };
 const routes=new Set(['/api/intake/vision/chat/confirm','/api/project','/api/answers','/api/intake/confirm','/api/pending-answers/confirm','/api/chat/stages/switch','/api/chat/actions/confirm','/api/building/confirm']);
 app.addHook('onResponse',async(req,reply)=>{
  if(closing||reply.statusCode>=400||!routes.has(req.url.split('?')[0]))return;
  let user:Session;try{user=session(req)}catch{return}if(user.role!=='owner'||drains.has(user.projectId))return;
  const token=req.cookies.alva_session||'';
  const task=new Promise<void>(resolve=>setImmediate(resolve)).then(()=>drain(user.projectId,token)).catch(async error=>{
   try{
    const authorized=await store.session(token);if(authorized.projectId!==user.projectId||authorized.role!=='owner')return;
    const p=await store.get(user.projectId),job=p.answerRecommendations?.find(j=>j.status==='pending'||j.status==='running');if(!job)return;
    const detail=mcpFailure(error).structuredContent.error as {message:string};
    await store.mutate(p.id,randomUUID(),p.revision,'recommendation-start-failed',{jobId:job.id},p=>{const current=p.answerRecommendations!.find(j=>j.id===job.id)!;current.status='failed';current.error=detail.message});
   }catch{/* Expired authorization cannot mutate the project; the page receives its own auth error. */}
  }).finally(()=>{if(drains.get(user.projectId)===task)drains.delete(user.projectId)});
  drains.set(user.projectId,task);
 });
 app.addHook('preClose',async()=>{closing=true;for(const controller of active.values())controller.abort()});
 app.addHook('onClose',async()=>{await Promise.allSettled(drains.values())});
}
