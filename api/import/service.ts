import {randomUUID} from 'node:crypto';
import {recognizeLayout,layoutRecognitionModel,type LayoutCodexCall} from '../import.js';
import {DomainError,type ImportState} from '../model.js';
import type {AlvaStore} from '../store.js';
import {imageData} from './image-data.js';

export type LayoutImportInput={requestId:string;expectedRevision:number;mime:string;data:string;filename:string};
/** Shared by the direct upload route and MCP attachment recognition. */
export async function importFloorplan(store:AlvaStore,projectId:string,b:LayoutImportInput,signal:AbortSignal,status:(text:string)=>void=()=>{},codex?:LayoutCodexCall){
 const input={mime:b.mime,data:b.data,filename:b.filename};
 const replay=await store.replay(projectId,b.requestId,'import',input);if(replay)return replay;
 const current=await store.get(projectId);
 if(current.revision!==b.expectedRevision)throw new DomainError(409,'项目已更新，请重新读取后识图');
 if(current.confirmedTopology)throw new DomainError(422,'修改已确认户型前，请先明确确认返回修改户型并放弃后续设计');
 const startedAt=new Date().toISOString();
 try{
  if(signal.aborted)throw new DOMException('已取消','AbortError');
  status(b.mime==='application/pdf'?'正在读取PDF第1页…':'正在读取户型图…');
  await store.setImportState(projectId,{status:'processing',message:'正在读取真实附件并交给 Codex 识别',requestId:b.requestId,sourceMime:b.mime,filename:b.filename,startedAt});
  const image=await imageData(b.mime,b.data,b.filename);
  status(image.page?`正在识别 PDF 第${image.page}页（共${image.pages}页）…`:'正在识别原图中的墙、门窗和房间…');
  const candidate=await recognizeLayout(`data:${image.mime};base64,${image.data}`,undefined,signal,codex);
  if(signal.aborted)throw new DOMException('已取消','AbortError');
  const finishedAt=new Date().toISOString();
  return await store.mutate(projectId,b.requestId,b.expectedRevision,'import',input,p=>{
   if(p.confirmedTopology)throw new DomainError(409,'户型已确认，请先明确确认返回修改');
   p.candidate=candidate;p.sourceImage=image;p.importState={status:'succeeded',message:'Codex已完成识别，二维候选待你核对和校准。',requestId:b.requestId,sourceMime:image.originalMime,filename:image.filename,page:image.page,pages:image.pages,provider:'codex',model:layoutRecognitionModel(),startedAt,finishedAt};p.dirty=true;
   p.evidence.push({id:randomUUID(),quote:`用户上传${image.originalMime==='application/pdf'?'PDF第1页预览':'户型图'}；Codex实际读取该附件并生成墙、房间、门窗候选，尺寸仍未校准`,source:'image',createdAt:finishedAt});
  });
 }catch(error){
  const cancelled=signal.aborted,state:ImportState={status:cancelled?'cancelled':'failed',message:cancelled?'导入已取消，原工作稿和已确认场景保持不变':'识图未成功，原工作稿和已确认场景保持不变；请重试或更换清晰附件',requestId:b.requestId,sourceMime:b.mime,filename:b.filename,startedAt,finishedAt:new Date().toISOString()};
  await store.setImportState(projectId,state);await store.failure(projectId,'import',cancelled?'取消':'识图失败');throw error;
 }
}
