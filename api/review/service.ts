import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import {DomainError,type Project} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {loadCurrentUserContext,ContextProjectionError} from '../user-context/index.js';
import type {UserContextReadResult} from '../../packages/contracts/alva/user-context.js';
import {runLayoutReview,isLayoutReviewCurrent} from './engine.js';
import {recordLayoutReviewDecision,prepareLayoutReviewForSave} from './decisions.js';
export async function currentSaveReview(store:AlvaStore,projectId:string){
 const p=await store.get(projectId);if(!p.scene)return undefined;
 const {project,context}=await loadCurrentUserContext({getProject:()=>store.get(projectId)});
 if(!project.layoutReview)throw new ContextProjectionError('REVIEW_REQUIRED','保存前请先复核当前布局，并查看提示与取舍。',false);
 prepareLayoutReviewForSave(project,context,project.layoutReview);return context;
}
export function adoptCurrentReview(p:Project,context?:UserContextReadResult){
 if(!p.scene)return;
 if(!context||!p.layoutReview)throw new ContextProjectionError('REVIEW_REQUIRED','请先复核当前布局。',false);
 p.layoutReviewAdoption=prepareLayoutReviewForSave(p,context,p.layoutReview);
}
export async function ensureCurrentReview(store:AlvaStore,projectId:string,expectedRevision:number){
 const {project,context}=await loadCurrentUserContext({getProject:()=>store.get(projectId)});
 if(project.revision!==expectedRevision)throw new DomainError(409,'项目已更新，请重读后复核');
 if(project.layoutReview&&isLayoutReviewCurrent(project,context,project.layoutReview))return project;
 const result=runLayoutReview(project,context);
 return store.mutate(projectId,randomUUID(),project.revision,'layout-review',{reviewId:result.id},p=>{p.layoutReview=result});
}
export function registerLayoutReview(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 const owner=(req:object)=>{const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可复核及确认取舍');return user};
 app.post('/api/layout-review/prepare',async req=>{const user=owner(req),b=z.object({expectedRevision:z.number().int().min(0)}).strict().parse(req.body);return ensureCurrentReview(store,user.projectId,b.expectedRevision)});
 app.get('/api/layout-review',async req=>{
  const {project,context}=await loadCurrentUserContext({getProject:()=>store.get(session(req).projectId)});
  return {review:project.layoutReview||null,current:!!project.layoutReview&&isLayoutReviewCurrent(project,context,project.layoutReview)};
 });
 app.post('/api/layout-review/decide',async req=>{
  const user=owner(req),b=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0),reviewId:z.string(),findingId:z.string(),decision:z.enum(['accept_tradeoff','defer']),note:z.string().trim().min(1).max(2000),confirmed:z.literal(true)}).strict().parse(req.body);
  const {context}=await loadCurrentUserContext({getProject:()=>store.get(user.projectId)});
  return store.mutate(user.projectId,b.requestId,b.expectedRevision,'layout-review-decision',b,p=>{
   if(!p.layoutReview)throw new ContextProjectionError('REVIEW_REQUIRED','请先复核当前布局。',false);
   const {requestId,expectedRevision,...decision}=b;p.layoutReview=recordLayoutReviewDecision(p,context,p.layoutReview,decision);
  });
 });
}
