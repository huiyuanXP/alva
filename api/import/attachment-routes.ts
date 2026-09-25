import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {DomainError} from '../model.js';
import type {Session} from '../store.js';
import {saveFloorplanAttachment} from './attachments.js';

export function registerFloorplanAttachments(app:FastifyInstance,session:(req:object)=>Session){
 app.post('/api/chat/attachments',async req=>{
  const user=session(req);if(user.role!=='owner')throw new DomainError(403,'仅业主可上传户型附件');
  const b=z.object({mime:z.enum(['image/png','image/jpeg','application/pdf']),filename:z.string().trim().min(1).max(255),data:z.string().min(1).max(16_000_000)}).strict().parse(req.body);
  const attachment=await saveFloorplanAttachment(user.projectId,b);
  return {attachmentId:attachment.id,filename:attachment.filename,mime:attachment.mime,bytes:attachment.bytes,createdAt:attachment.createdAt,status:'uploaded'};
 });
}
