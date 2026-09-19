import React,{useEffect,useRef,useState} from 'react';
import {ChatIcon} from './ChatControls.js';
import type {ProjectData} from '../../../packages/contracts/index.js';
import type {Commit} from './RequirementsPanel.js';
export function ObjectChat({project,objectId,roomId,commit,preview,restore,adopt,onBusy}:{project:ProjectData;objectId:string;roomId:string;commit:Commit;preview:(id:string)=>Promise<void>;restore:()=>Promise<void>;adopt:(id:string)=>Promise<void>;onBusy:(b:boolean)=>void}){
 const [text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[previewId,setPreviewId]=useState<string|null>(null);
 const alive=useRef(true);useEffect(()=>{alive.current=true;return()=>{alive.current=false;void restore();};},[]);
 const act=async(fn:()=>Promise<unknown>)=>{setBusy(true);onBusy(true);setError('');try{await fn();}catch(e){if(alive.current)setError((e as Error).message);}finally{if(alive.current){setBusy(false);onBusy(false);}}};
 const messages=(project.object_messages??[]).filter(m=>m.object_id===objectId&&m.room_id===roomId&&m.project_id===project.id);
 return <section className="object-chat" aria-label="当前家具聊天"><h3>只聊这件家具</h3><p className="scope">房间 {roomId} · 家具 {objectId}</p>
 <div aria-live="polite">{messages.map(m=><article key={m.id}><p>你：{m.raw_user_evidence}</p><p>{m.text||'正在生成建议…'}</p><p>{({running:'生成中',proposed:'AI 建议 · 未采用',accepted:'已明确采用',rejected:'已取消',failed:'生成失败 · 原话已保留'} as const)[m.status]}</p>
 {m.patch&&<dl>{Object.entries(m.patch).map(([k,v])=><div key={k}><dt>{({width:'宽度（cm）',depth:'进深（cm）',height:'物件高度（cm）',elevation:'离地高度（cm）',color:'颜色'} as Record<string,string>)[k]}</dt><dd>{String(v)}</dd></div>)}</dl>}
 {m.status==='proposed'&&m.patch&&<><button disabled={busy} onClick={()=>void act(async()=>{await preview(m.id);if(alive.current)setPreviewId(m.id);})}>预览此家具</button><button disabled={busy||previewId!==m.id} onClick={()=>void act(async()=>{await adopt(m.id);setPreviewId(null);})}>确认采用此建议</button></>}
 {['running','proposed','failed'].includes(m.status)&&<button disabled={busy&&m.status!=='running'} onClick={()=>{const reject=async()=>{await restore();setPreviewId(null);await commit('/objects/decision',{room_id:roomId,object_id:objectId,message_id:m.id,action:'reject'});};if(m.status==='running')void reject().catch(e=>{if(alive.current)setError(e.message);});else void act(reject);}}>取消此建议</button>}
 </article>)}</div>
 {previewId&&<p role="status">仅预览，尚未保存。关闭或取消会恢复正式场景。</p>}
 <form className="object-composer" onSubmit={e=>{e.preventDefault();void act(async()=>{await restore();setPreviewId(null);await commit('/objects/chat',{room_id:roomId,object_id:objectId,text});if(alive.current)setText('');});}}><label>对这件家具的要求<textarea maxLength={4000} required value={text} disabled={busy} onChange={e=>setText(e.target.value)}/></label><div className="object-composer-tools"><span>仅针对当前家具生成待确认建议</span><button aria-label="发送家具要求" title="发送家具要求" disabled={busy||!text.trim()}><ChatIcon name={busy?'stop':'up'}/></button></div></form>
 {error&&<p role="alert">{error}</p>}</section>;
}
