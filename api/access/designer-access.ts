import type {FastifyInstance} from 'fastify';
import {reject} from '../model.js';
import type {AlvaStore,Session} from '../store.js';

export function registerDesignerAccess(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 const owner=(req:object)=>{const s=session(req);if(s.role!=='owner')reject('仅业主可管理设计师访问',403);return s};
 app.get('/api/invites',async req=>{const s=owner(req);return {projectId:s.projectId,invites:await store.listInvites(s.projectId)}});
 app.post('/api/invites',async req=>{const s=owner(req);const created=await store.invite(s.projectId,'designer');return {...created,role:'designer' as const}});
 app.post('/api/invites/:id/revoke',async req=>{const s=owner(req),id=(req.params as {id:string}).id;const revoked=await store.revoke(s.projectId,id);if(!revoked)reject('只读邀请不存在或不属于当前项目',404);return {revoked:true,linkId:id}});
}
