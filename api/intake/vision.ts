import {saveVisionResponse} from './vision-service.js';
import {registerVisionChat} from '../consultation/vision-routes.js';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {reject} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {brief,priorities,type Answers} from '../../packages/contracts/alva/home-vision/flow.js';
const Value:z.ZodType<any>=z.lazy(()=>z.union([z.string().max(6000000),z.number().finite(),z.boolean(),z.null(),z.array(Value).max(100),z.record(z.string().max(100),Value)]));

export function registerVision(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 registerVisionChat(app,store,session);
 app.get('/api/intake/vision',async req=>{const p=await store.get(session(req).projectId);return p.homeVision||{version:'home-vision-v4',responses:[]}});
 app.post('/api/intake/vision',{bodyLimit:8*1024*1024},async req=>{
  const s=session(req);if(s.role!=='owner')reject('Read-only access',403);
  const b=z.object({requestId:z.string().uuid(),id:z.string().uuid(),name:z.string().trim().min(1).max(80),expectedVersion:z.number().int().nonnegative(),cursor:z.string().max(60),answers:z.record(z.string().max(40),z.object({state:z.enum(['answered','unknown','skipped']),value:Value}).strict())}).strict().parse(req.body);
  return store.mutate(s.projectId,b.requestId,null,'home-vision-progress',b,p=>{saveVisionResponse(p,{...b,answers:b.answers as Answers})});
 });
 app.get('/api/intake/vision/brief',async req=>{const p=await store.get(session(req).projectId);const people=p.homeVision?.responses||[];return {version:'home-vision-v4',responses:people.map(r=>({id:r.id,name:r.name,answers:brief(r.answers),priorities:priorities(r.answers,people)}))}});
}
