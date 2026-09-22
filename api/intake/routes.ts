import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {catalogue,applyAnswer} from '../business.js';
import {reject,type Project} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {attachmentQuestions} from './source.js';

const Selection=z.object({questionId:z.string(),roomId:z.string().nullable(),text:z.string().max(3000),state:z.enum(['answered','unknown','skipped','not_applicable'])}).strict();
const Cursor=Selection.pick({questionId:true,roomId:true});
const Command=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().min(0)});
export type IntakeDraft=z.infer<typeof Selection>;
export type IntakeProgress={drafts:IntakeDraft[];cursor:z.infer<typeof Cursor>|null;updatedAt:string};
export const intakeKey=(d:{questionId:string;roomId:string|null})=>JSON.stringify([d.questionId,d.roomId]);
function checkScope(p:Project,d:{questionId:string;roomId:string|null}){
 const q=catalogue.find(q=>q.id===d.questionId&&q.enabled);
 if(!q)reject('问题不存在或已停用');
 if(q!.scope==='project'&&d.roomId!==null)reject('此题属于全屋需求');
 if(q!.scope==='room'&&(!d.roomId||!p.scene?.rooms.some(r=>r.id===d.roomId)))reject('请先确认户型并选择有效房间');
 return q!;
}
export function registerIntake(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.get('/api/intake',async req=>{
  const p=await store.get(session(req).projectId);
  return {questions:catalogue.filter(q=>q.enabled).map(q=>({...q,question:q.id==='Q18'?q.question:attachmentQuestions[q.id]?.question||q.question,why:attachmentQuestions[q.id]?.why||''})),progress:p.intakeProgress||{drafts:[],cursor:null,updatedAt:''}};
 });
 app.post('/api/intake/progress',async req=>{
  const b=Command.extend({drafts:z.array(Selection).max(200),cursor:Cursor.nullable()}).strict().parse(req.body);
  const s=session(req);if(s.role!=='owner')reject('仅业主可保存问卷',403);
  return store.mutate(s.projectId,b.requestId,b.expectedRevision,'intake-progress',b,p=>{
   const keys=new Set<string>();for(const d of b.drafts){checkScope(p,d);const key=intakeKey(d);if(keys.has(key))reject('同一题目与房间不能重复');keys.add(key);if(p.answers.some(a=>intakeKey(a)===key&&a.locked))reject('此回答已锁定，请先解除锁定');}
   if(b.cursor)checkScope(p,b.cursor);
   p.intakeProgress={drafts:b.drafts,cursor:b.cursor,updatedAt:new Date().toISOString()};p.dirty=true;
  });
 });
 app.post('/api/intake/confirm',async req=>{
  const b=Command.extend({answer:Selection,confirmed:z.literal(true)}).strict().parse(req.body);
  const s=session(req);if(s.role!=='owner')reject('仅业主可确认问卷',403);
  return store.mutate(s.projectId,b.requestId,b.expectedRevision,'intake-confirm',b,p=>{
   checkScope(p,b.answer);
   if(b.answer.state==='not_applicable'&&!b.answer.text.trim())reject('请补充不适用的原因');
   applyAnswer(p,{...b.answer,locked:false,confirmed:true});
   p.intakeProgress={drafts:(p.intakeProgress?.drafts||[]).filter(d=>intakeKey(d)!==intakeKey(b.answer)),cursor:{questionId:b.answer.questionId,roomId:b.answer.roomId},updatedAt:new Date().toISOString()};
  });
 });
}
