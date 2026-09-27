import {useEffect,useState} from 'react';
import type {UiAction,UiActionRequest} from '../../../packages/contracts/alva/ui-action.js';
export function useUiActions(options:{onProjectNavigation:(navigation:Extract<UiAction,{kind:'project_manager'}>['navigation'])=>void;mode:string;time:number;day:number;room:string;request:(path:string,body:unknown)=>Promise<unknown>;setMode:(mode:'2d'|'3d')=>void;setTime:(time:number)=>void;setDay:(day:number)=>void;setRoom:(room:string)=>void;onError:(message:string)=>void}){
 const [pending,setPending]=useState<UiActionRequest|null>(null);
 const apply=(request:UiActionRequest)=>{setPending(request);const a=request.action;if(a.kind==='project_manager')options.onProjectNavigation(a.navigation);if(a.kind==='view')options.setMode(a.mode);if(a.kind==='sunlight'){options.setMode('3d');options.setTime(a.time);options.setDay(a.day)}if(a.kind==='focus_room'){options.setMode('3d');options.setRoom(a.roomId)}};
 useEffect(()=>{
  if(!pending)return;
  const a=pending.action,applied=a.kind==='project_manager'?true:a.kind==='view'?options.mode===a.mode:a.kind==='sunlight'?options.mode==='3d'&&options.time===a.time&&options.day===a.day:options.mode==='3d'&&options.room===a.roomId;
  if(!applied)return;
  let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>{
   const rendered=a.kind==='project_manager'?!!document.querySelector('dialog.project-manager[open]'):!!document.querySelector('.canvas-wrap svg,.canvas-wrap canvas');
   void options.request('/chat/ui-receipts',{id:pending.id,status:rendered?'applied':'failed',...(rendered?{applied:a}:{reason:'当前预览尚未渲染'})}).catch(e=>options.onError(e.message)).finally(()=>setPending(current=>current?.id===pending.id?null:current));
  })});return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second)};
 },[pending,options.mode,options.time,options.day,options.room]);
 return apply;
}
