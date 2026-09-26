import {DomainError,validateScene,type Project} from '../model.js';
import type {AlvaStore} from '../store.js';
import {currentSaveReview,adoptCurrentReview} from '../review/service.js';
const queues=new WeakMap<AlvaStore,Map<string,Promise<unknown>>>();
/** Serializes review-read + save across HTTP/MCP so duplicate requests retain one receipt. */
export async function saveProjectWithReview(store:AlvaStore,projectId:string,requestId:string,expectedRevision:number,input:unknown,chatActionId?:string,assertBeforeSave?:(p:Project)=>void):Promise<Project>{
 let queue=queues.get(store);if(!queue){queue=new Map();queues.set(store,queue)}
 const previous=queue.get(projectId)||Promise.resolve();
 const run=previous.catch(()=>{}).then(async()=>{
  const replay=await store.replay(projectId,requestId,'save',input);if(replay)return replay;
  const p=await store.get(projectId);if(p.revision!==expectedRevision)throw new DomainError(409,'项目已更新，请重新读取后确认');
  const context=await currentSaveReview(store,projectId);
  return store.mutate(projectId,requestId,expectedRevision,'save',input,p=>{assertBeforeSave?.(p);if(p.scene)validateScene(p.scene);adoptCurrentReview(p,context)},chatActionId);
 });queue.set(projectId,run);
 try{return await run}finally{if(queue.get(projectId)===run)queue.delete(projectId)}
}
