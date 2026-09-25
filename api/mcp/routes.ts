import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {DomainError} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {runCodex,type CodexInput} from '../codex.js';
import {mainChatAgent} from '../main-chat-agent.js';
import {switchChatStage} from './sessions.js';

export function registerStageRoutes(app:FastifyInstance,store:AlvaStore,session:(request:object)=>Session,active:Map<string,AbortController>,resume:(input:CodexInput)=>Promise<string>=runCodex){
 app.get('/api/chat/stages',async req=>store.chatState(session(req).projectId));
 app.post('/api/chat/stages/switch',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可切换设计阶段');
  const input=z.object({stage:z.enum(['floorplan','living']),expectedRevision:z.number().int().min(0)}).parse(req.body);
  if(active.has(user.projectId))throw new DomainError(409,'请先等待或取消当前 Chat 请求再切换阶段');
  const controller=new AbortController();active.set(user.projectId,controller);
  try{
   const state=await store.chatState(user.projectId),project=await store.get(user.projectId);
   if(project.revision!==input.expectedRevision)throw new DomainError(409,'项目已更新，请重读后切换');
   if(input.stage==='living'&&!project.confirmedBuilding)throw new DomainError(422,'请先确认建筑 3D');
   const threadId=state.threads[input.stage].threadId;
   if(threadId)await resume({resumeOnly:true,text:'',model:mainChatAgent.model,signal:controller.signal,timeoutMs:30_000,session:{key:`${user.projectId}:${input.stage}`,threadId,onThread:async actual=>{if(actual!==threadId)throw new DomainError(409,'未恢复原阶段会话')}}});
   return await switchChatStage(store,user.projectId,input.stage,input.expectedRevision);
  }finally{if(active.get(user.projectId)===controller)active.delete(user.projectId)}
 });
}
