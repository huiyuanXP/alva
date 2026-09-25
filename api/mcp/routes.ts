import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {DomainError} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {switchChatStage} from './sessions.js';

export function registerStageRoutes(app:FastifyInstance,store:AlvaStore,session:(request:object)=>Session,active:Map<string,AbortController>){
 app.get('/api/chat/stages',async req=>store.chatState(session(req).projectId));
 app.post('/api/chat/stages/switch',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可切换设计阶段');
  const input=z.object({stage:z.enum(['floorplan','living']),expectedRevision:z.number().int().min(0)}).parse(req.body);
  if(active.has(user.projectId))throw new DomainError(409,'请先等待或取消当前 Chat 请求再切换阶段');
  return switchChatStage(store,user.projectId,input.stage,input.expectedRevision);
 });
}
