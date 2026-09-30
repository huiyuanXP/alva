import {VisionTemplate} from '../vision/VisionTemplate.js';
import React,{useEffect,useImperativeHandle,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import type {Project} from '../../../api/model.js';
import type {ChatAction,ChatStage} from '../../../packages/contracts/alva/chat-actions.js';
type Action=ChatAction&{stale:boolean;staleReason?:string};
export type StageNavigation={switchTo:(stage:ChatStage)=>Promise<void>};
export function StageControls({beforeSwitch,navigationRef,onReady,onWorking,project,busy,readOnly,request,onProject,onStage,onError,onRequest,saveReview,contentTarget}:{beforeSwitch?:()=>Promise<void>;navigationRef?:React.Ref<StageNavigation>;onReady?:(ready:boolean)=>void;onWorking?:(working:boolean)=>void;project:Project;busy:boolean;readOnly:boolean;request:(path:string,body?:unknown)=>Promise<any>;onProject:(p:Project)=>void;onStage:(stage:ChatStage)=>void;onError:(message:string)=>void;onRequest?:(text:string)=>void;saveReview?:React.ReactNode;contentTarget?:HTMLElement|null}){
 const [stage,setStage]=useState<ChatStage>('floorplan'),[actions,setActions]=useState<Action[]>([]),[working,setWorkingState]=useState(false),[entryWarning,setEntryWarning]=useState(''),[notice,setNotice]=useState('');
 const setWorking=(value:boolean)=>{workingRef.current=value;setWorkingState(value);onWorking?.(value)};
 const sequence=useRef(0),workingRef=useRef(false);
 useImperativeHandle(navigationRef,()=>({switchTo}),[project,stage,busy,readOnly,beforeSwitch]);
 const refresh=async()=>{
  const current=++sequence.current;
  // A failed confirmation-card read must not hide the authoritative stage.
  const state=await request('/chat/stages');
  if(current!==sequence.current)return;
  setEntryWarning(state.entryWarning?.message||'');setStage(state.active);onStage(state.active);onReady?.(true);
  try{const list=await request('/chat/actions');if(current===sequence.current)setActions(list.filter((a:Action)=>a.status==='pending'))}catch(e){if(current===sequence.current)onError((e as Error).message)}
  return state;
 };
 useEffect(()=>{onReady?.(false);return()=>{sequence.current++}},[project.id]);
 useEffect(()=>{void refresh().catch(e=>onError(e.message));const sync=()=>{if(document.visibilityState==='visible'&&!workingRef.current)void refresh().catch(e=>onError(e.message))};const timer=window.setInterval(sync,15000);window.addEventListener('focus',sync);return()=>{window.clearInterval(timer);window.removeEventListener('focus',sync)}},[project.id,project.revision,busy]);
 const reload=async()=>{const latest=await request('/project');onProject(latest);return latest as Project};
 async function switchTo(next:ChatStage){
  if(workingRef.current)return;
  if(readOnly){setNotice('当前为只读访问，不能切换设计阶段。');return}
  setWorking(true);setNotice('');sequence.current++;
  try{
   if(busy){setNotice('正在停止当前回复并切换阶段…');if(!beforeSwitch)throw new Error('当前操作尚未结束，请等待或取消当前请求后再切换。');await beforeSwitch()}
   const latest=await reload();
   // Always ask the server: the visible stage can lag a building confirmation or another tab.
   const current=await request('/chat/stages');
   if(next==='living'&&(latest.candidate||!latest.scene||!latest.confirmedTopology)){
    await request('/chat/stages/prepare-living',{expectedRevision:latest.revision});
    await refresh();setNotice('请查看确认卡；可以保留当前问题继续生活设计。');return;
   }
   const state=current.active===next?current:await request('/chat/stages/switch',{stage:next,expectedRevision:latest.revision});
   sequence.current++;setEntryWarning(state.entryWarning?.message||'');setStage(state.active);onStage(state.active);onReady?.(true);
   await refresh();
  }catch(e){onError((e as Error).message);await refresh().catch(()=>{})}finally{setWorking(false)}
 }
 const refreshAction=async(action:Action)=>{setWorking(true);setNotice('');try{const latest=await reload();await request('/chat/actions/refresh',{id:action.id,expectedRevision:latest.revision});await refresh();setNotice('确认卡已更新。请核对当前内容，再点击确认；尚未执行确认。')}catch(e){onError((e as Error).message)}finally{setWorking(false)}};
 const retryEntry=async()=>{setWorking(true);setNotice('正在重新送达阶段交接…');try{const latest=await reload();const state=await request('/chat/stages/retry-entry',{stage,expectedRevision:latest.revision});setEntryWarning(state.entryWarning?.message||'');setNotice(state.entryWarning?'交接仍未送达，请查看下面的原因后重试。':'阶段交接已送达，可以继续对话。');await refresh()}catch(e){setNotice(`重试失败：${(e as Error).message}`);await refresh().catch(()=>{})}finally{setWorking(false)}};
 const decide=async(action:Action,confirmed:boolean)=>{setWorking(true);setNotice('');try{const latest=confirmed?await reload():project;const result=await request('/chat/actions/'+(confirmed?'confirm':'reject'),confirmed?{id:action.id,expectedRevision:latest.revision,confirmed:true}:{id:action.id});if(confirmed)onProject(result);await refresh()}catch(e){onError((e as Error).message);await reload().catch(()=>{})}finally{setWorking(false)}};
 const unavailable=busy?'当前操作尚未结束，请等待或取消当前请求后再切换。':working?'正在刷新或切换阶段，请稍候。':readOnly?'当前为只读访问，不能切换或确认设计阶段。':'';
 const livingReason=project.scene&&project.confirmedTopology&&!project.candidate?'':project.candidate?'可以修正或校准户型，也可以保留当前问题进入生活设计。':'请先上传并识别户型。';
 return <><section aria-label="设计阶段" className="chat-stages"><div className="segmented">{(['floorplan','living'] as const).map(value=><button key={value} aria-current={value===stage?'step':undefined} title={unavailable||(value==='living'?livingReason:'')||(value===stage?'当前阶段；点击刷新状态':value==='living'?'切换到生活设计':'切换到户型导入')} className={stage===value?'active':''} disabled={working||readOnly} onClick={()=>void switchTo(value)}>{value==='floorplan'?'户型导入':'生活设计'}</button>)}</div>{(notice||livingReason)&&<p role="status" className="stage-navigation-notice">{notice||livingReason}</p>}</section>{contentTarget&&createPortal(<div className="stage-chat-content">{unavailable&&<p role="status">{unavailable}</p>}{entryWarning&&<div className="stage-entry-warning" role="alert"><strong>阶段交接尚未完成</strong><p>{entryWarning}</p><button type="button" disabled={!!unavailable} onClick={()=>void retryEntry()}>{working?'正在重试…':'重试送达阶段交接'}</button></div>}{actions.filter(a=>a.stage===stage&&a.kind!=='confirm_building'&&a.kind!=='confirm_topology').map(action=><VisionTemplate key={action.id} title="Your Room Vision"><article className="chat-confirmation" data-action-kind={action.kind}><strong>{action.title}</strong><p>{action.description}</p>{action.kind==='save_design'&&saveReview}{action.stale&&<p role="status">{action.staleReason||'确认依据已变化，请刷新确认卡后重新核对。'}</p>}{action.stale?<button disabled={!!unavailable} onClick={()=>void refreshAction(action)}>刷新确认卡</button>:<button disabled={!!unavailable} onClick={()=>void decide(action,true)}>{action.kind==='enter_living'?'保留当前户型，进入生活设计':action.title.startsWith('确认')?action.title:'确认'+action.title}</button>}<button disabled={!!unavailable} onClick={()=>void decide(action,false)}>暂不执行</button></article></VisionTemplate>)}</div>,contentTarget)}</>;
}
