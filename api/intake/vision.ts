import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {reject} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {validation,brief,priorities,cards,type Answers} from '../../packages/contracts/alva/home-vision/flow.js';
const Value:z.ZodType<any>=z.lazy(()=>z.union([z.string().max(6000000),z.number().finite(),z.boolean(),z.null(),z.array(Value).max(100),z.record(z.string().max(100),Value)]));
const cursors=new Set([...cards.map(card=>card.card),'S3_frame','complete',...Array.from({length:7},(_,i)=>`summary:S${i+1}`)]);
export function registerVision(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.get('/api/intake/vision',async req=>{const p=await store.get(session(req).projectId);return p.homeVision||{version:'home-vision-v4',responses:[]}});
 app.post('/api/intake/vision',{bodyLimit:8*1024*1024},async req=>{
  const s=session(req);if(s.role!=='owner')reject('Read-only access',403);
  const b=z.object({requestId:z.string().uuid(),id:z.string().uuid(),name:z.string().trim().min(1).max(80),expectedVersion:z.number().int().nonnegative(),cursor:z.string().max(60),answers:z.record(z.string().max(40),z.object({state:z.enum(['answered','unknown','skipped']),value:Value}).strict())}).strict().parse(req.body);
  if(Object.keys(b.answers).length>110||JSON.stringify(b.answers).length>7000000)reject('Response is too large');
  if(!cursors.has(b.cursor))reject('Unknown questionnaire screen');
  const errors=validation(b.answers as Answers);if(errors.length)reject(errors[0]);
  return store.mutate(s.projectId,b.requestId,null,'home-vision-progress',b,p=>{
   p.homeVision??={version:'home-vision-v4',responses:[]};const previous=p.homeVision.responses.find(r=>r.id===b.id);
   if((previous?.version||0)!==b.expectedVersion)reject('These answers changed in another window. Reopen the questionnaire to review the latest version.',409);
   if(!previous&&p.homeVision.responses.length>=10)reject('Up to 10 separate responses per project');
   const response={id:b.id,name:b.name,answers:b.answers as Answers,cursor:b.cursor,updatedAt:new Date().toISOString(),version:b.expectedVersion+1};
   p.homeVision.responses=previous?p.homeVision.responses.map(r=>r.id===b.id?response:r):[...p.homeVision.responses,response];p.dirty=true;
  });
 });
 app.get('/api/intake/vision/brief',async req=>{const p=await store.get(session(req).projectId);const people=p.homeVision?.responses||[];return {version:'home-vision-v4',responses:people.map(r=>({id:r.id,name:r.name,answers:brief(r.answers),priorities:priorities(r.answers,people)}))}});
}
