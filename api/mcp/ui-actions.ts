import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import type {BusinessTool} from '../codex.js';
import type {AlvaStore,Session} from '../store.js';
import {DomainError} from '../model.js';
import {McpError} from './contracts.js';
import {SceneUiActionSchema,UiActionSchema,type UiActionRequest} from '../../packages/contracts/alva/ui-action.js';

type Pending={projectId:string;request:UiActionRequest;resolve:(value:unknown)=>void;reject:(error:Error)=>void};
export class UiActionBridge{
 private pending=new Map<string,Pending>();
 constructor(app:FastifyInstance,session:(req:object)=>Session){
  app.post('/api/chat/ui-receipts',async req=>{
   const user=session(req);if(user.role!=='owner')throw new DomainError(403,'只接受业主页面回执');
   const b=z.object({id:z.string().uuid(),status:z.enum(['applied','failed']),applied:UiActionSchema.optional(),reason:z.string().max(300).optional()}).strict().parse(req.body);
   const entry=this.pending.get(b.id);if(!entry||entry.projectId!==user.projectId)throw new DomainError(404,'界面操作已过期或不属于此项目');
   if(b.status==='applied'&&JSON.stringify(b.applied)!==JSON.stringify(entry.request.action))throw new DomainError(422,'回执参数与请求不一致');
   if(b.status==='applied')entry.resolve({status:'applied',receiptId:b.id,applied:b.applied});
   else entry.reject(new McpError({code:'UI_ACTION_FAILED',message:b.reason||'页面未能执行操作',retryable:true,repairActions:[{action:'refresh_preview',message:'请刷新预览，再重试界面操作'}]}));
   return {received:true};
  });
 }
 tool(store:AlvaStore,projectId:string,signal:AbortSignal,emit:(request:UiActionRequest)=>void):BusinessTool{return {
  name:'set_view',description:'请求当前页面切换二维/全屋三维/漫游（walk）、聚焦房间或调整日照（时间与年内日期）。仅改变显示，等待真实页面回执；没有 applied 回执不能宣称生效。',inputSchema:z.toJSONSchema(SceneUiActionSchema),run:async args=>{
   const action=UiActionSchema.parse(args),p=await store.get(projectId),scene=p.scene||p.candidate;
   if(!scene&&action.kind!=='project_manager')throw new DomainError(422,'请先导入户型才能调整预览');
   if(action.kind==='focus_room'&&action.roomId&&!scene!.rooms.some(r=>r.id===action.roomId))throw new DomainError(422,'房间不存在');
   const request={id:randomUUID(),action};
   return new Promise((resolve,reject)=>{
    let timer:ReturnType<typeof setTimeout>;
    const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);this.pending.delete(request.id)};
    const done=(value:unknown)=>{cleanup();resolve(value)},fail=(error:Error)=>{cleanup();reject(error)};
    const abort=()=>fail(new McpError({code:'CANCELLED',message:'界面操作已取消',retryable:true,repairActions:[{action:'check_view',message:'请核对当前画面后重试'}]}));
    timer=setTimeout(()=>fail(new McpError({code:'UI_RECEIPT_TIMEOUT',message:'未收到页面执行回执，无法确认操作是否生效',retryable:true,repairActions:[{action:'check_view',message:'请保持项目页面打开，核对画面后重试'}]})),20_000);
    this.pending.set(request.id,{projectId,request,resolve:done,reject:fail});signal.addEventListener('abort',abort,{once:true});
    if(signal.aborted){abort();return}try{emit(request)}catch(e){fail(e instanceof Error?e:new Error('界面消息发送失败'))}
   });
  }
 }}
}
