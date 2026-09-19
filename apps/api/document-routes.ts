import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { Command, Id } from '../../packages/contracts/index.js';
import { Store, HttpError } from './store.js';
import { documentMimes, validateDocument, extractDocument } from './documents.js';

export const DocumentUpload=Command.extend({room_id:Id,name:z.string().trim().min(1).max(160),mime:z.enum(documentMimes),data:z.string().max(7000000)}).strict();
export async function uploadDocument(store:Store,id:string,owner:string,b:z.infer<typeof DocumentUpload>) {
  const prior=await store.replay(id,owner,b.request_id,'document_uploaded',b);
  if(prior)return store.get(id,owner);
  const current=await store.get(id,owner);
  if(!current.rooms.some(r=>r.id===b.room_id))throw new HttpError(400,'房间不存在');
  if(current.version!==b.expected_version)throw new HttpError(409,'资料版本已更新，文件仍保留在浏览器中，请核对后重试');
  const bytes=Buffer.from(b.data,'base64');
  if(!bytes.length||bytes.length>5*1024*1024||bytes.toString('base64')!==b.data)throw new HttpError(400,'文档为空、编码无效或超过5MB');
  validateDocument(b.mime,bytes);
  const extracted=await extractDocument(b.mime,bytes);
  return store.mutate(id,owner,b.request_id,b.expected_version,'document_uploaded',b,async(p,tx)=>{
    const quota=(await tx.query('SELECT count(*)::int AS count,coalesce(sum(byte_size),0)::int AS total FROM attachments WHERE project_id=$1',[id])).rows[0];
    if(quota.count>=10||quota.total+bytes.length>20*1024*1024)throw new HttpError(413,'当前项目附件限10个、总计20MB；文档和媒体共用配额');
    const attachment=randomUUID();
    await tx.query('INSERT INTO attachments VALUES($1,$2,$3,$4,$5,$6,$7)',[attachment,id,b.mime,b.data,null,null,bytes.length]);
    (p.attachments??=[]).push({id:attachment,room_id:b.room_id,message_id:b.request_id,mime:b.mime,name:b.name,byte_size:bytes.length,status:extracted.text?'analyzed':'failed',extracted_text:extracted.text,extraction_note:extracted.note});
    p.evidence.push({id:attachment,attachment_id:attachment,message_id:b.request_id,room_id:b.room_id,region:'document_text',source:'user_document',quote:`参考文档：${b.name}。${extracted.note} 内容不是用户正式确认。`,created_at:new Date().toISOString()});
  });
}
export function registerDocuments(app:FastifyInstance,store:Store) {
  app.post('/api/projects/:id/documents',{bodyLimit:7500000},async req=>uploadDocument(store,Id.parse((req.params as any).id),(req as any).owner,DocumentUpload.parse(req.body)));
  app.post('/api/projects/:id/documents/retry',async req=>{
    const id=Id.parse((req.params as any).id),owner=String((req as any).owner),b=Command.extend({attachment_id:Id}).strict().parse(req.body);
    const prior=await store.replay(id,owner,b.request_id,'document_reparsed',b);if(prior)return store.get(id,owner);
    const p=await store.get(id,owner);if(p.version!==b.expected_version)throw new HttpError(409,'资料版本已变化，请核对后重试');
    const meta=p.attachments?.find(a=>a.id===b.attachment_id);if(!meta||!(documentMimes as readonly string[]).includes(meta.mime))throw new HttpError(404,'此项目文档不存在');
    const row=(await store.db.query<{data:string}>('SELECT data FROM attachments WHERE id=$1 AND project_id=$2',[meta.id,id])).rows[0];if(!row)throw new HttpError(404,'文档原件不存在');
    const extracted=await extractDocument(meta.mime,Buffer.from(row.data,'base64'));
    return store.mutate(id,owner,b.request_id,b.expected_version,'document_reparsed',b,p=>{const a=p.attachments!.find(a=>a.id===meta.id)!;a.extracted_text=extracted.text;a.extraction_note=extracted.note;a.status=extracted.text?'analyzed':'failed';});
  });
}
