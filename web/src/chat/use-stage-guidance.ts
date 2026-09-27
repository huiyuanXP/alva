import {useEffect,useRef,useState} from 'react';
import type {Project} from '../../../api/model.js';
type Options={language:'zh'|'en';project:Project|null;stage:'floorplan'|'living';respondentId:string;model:string;enabled:boolean;busy:boolean;idle:boolean;request:(path:string)=>Promise<any>;stream:(path:string,body:unknown,receive:(type:string,data:any)=>void)=>Promise<void>;onProject:(p:Project)=>void;setBusy:(busy:boolean)=>void;setProgress:(text:string|null)=>void};
/** Checkpoints are persisted by the server; local attempts prevent retry loops. */
export function useStageGuidance(o:Options){
 const latest=useRef(o);latest.current=o;
 const inFlight=useRef(false),attemptedKey=useRef('');
 const conflictCount=useRef(0);
 const [error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  if(!o.project||!o.enabled||o.busy||!o.idle||!o.model||inFlight.current)return;
  let cancelled=false;
  const timer=setTimeout(()=>void(async()=>{
   let claimed=false,attempt='';
   try{
    const g=await o.request('/chat/guidance?language='+o.language+(o.respondentId?'&respondentId='+encodeURIComponent(o.respondentId):''));
    const now=latest.current;
    if(cancelled||now.busy||!now.idle||now.project?.id!==o.project!.id||g.stage!==now.stage||!g.needed)return;
    if(g.busy){setTimeout(()=>setRetry(n=>n+1),2000);return}
    attempt=o.project!.id+':'+g.key;
    if(attemptedKey.current===attempt)return;
    inFlight.current=true;claimed=true;attemptedKey.current=attempt;setError('');o.setBusy(true);o.setProgress('正在接续当前步骤…');
    const p=await o.request('/project');if(!latest.current.enabled||latest.current.project?.id!==p.id)return;o.onProject(p);
    let failure='';
    await o.stream('/chat',{requestId:crypto.randomUUID(),expectedRevision:p.revision,guidance:{key:g.key},language:o.language,text:'阶段引导',roomId:null,model:o.model,...(o.respondentId?{respondentId:o.respondentId}:{})},(type,data)=>{
     if(latest.current.project?.id!==p.id)return;
     if(type==='project')o.onProject(data);
     if(type==='status')o.setProgress(data.text);
     if(type==='error')failure=data.error;
    });
    if(failure)setError(failure);else conflictCount.current=0;
   }catch(e){if((e as {status?:number}).status===409&&conflictCount.current++<3){if(attemptedKey.current===attempt)attemptedKey.current='';setTimeout(()=>setRetry(n=>n+1),2000)}else if(claimed)setError((e as Error).message);else if(!cancelled)setError('暂时无法读取引导进度，请重试。')}
   finally{if(claimed){inFlight.current=false;o.setBusy(false);o.setProgress(null)}}
  })(),700);
  return()=>{cancelled=true;clearTimeout(timer)};
 },[o.language,o.project?.id,o.project?.revision,o.stage,o.respondentId,o.model,o.enabled,o.busy,o.idle,retry]);
 return {error,retry:()=>{attemptedKey.current='';setError('');setRetry(n=>n+1)}};
}
