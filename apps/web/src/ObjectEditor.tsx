import React, {useEffect, useRef, useState} from 'react';
import {ObjectChat} from './ObjectChat.js';
import type {ProjectData} from '../../../packages/contracts/index.js';
import type {Commit} from './RequirementsPanel.js';
import {api} from './api.js';
export function ObjectEditor({projectId, objectId, save, close, project, commit, preview, restore, adopt}:{project:ProjectData;commit:Commit;preview:(id:string)=>Promise<void>;restore:()=>Promise<void>;adopt:(id:string)=>Promise<void>;projectId:string;objectId:string;save:(room:string,patch:Record<string,unknown>,baseline:number)=>Promise<void>;close:()=>void}) {
 const [chatBusy,setChatBusy]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const [info,setInfo]=useState<any>(null),[draft,setDraft]=useState<Record<string,any>>({}),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
   const previous=document.activeElement as HTMLElement|null;
   dialog.current?.showModal();
   let alive=true;
   api<any>(`/api/projects/${projectId}/objects/${objectId}`).then(i=>{if(alive){setInfo(i);setDraft(i.values);}}).catch(e=>setError(e.message));
   return ()=>{alive=false;previous?.focus();};
 },[projectId,objectId]);
 return <dialog ref={dialog} className="object-editor" aria-labelledby="object-title" onPointerDown={e=>{if(e.target!==e.currentTarget||busy)return;const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}} onCancel={e=>{e.preventDefault();if(!busy)close();}}>
   <form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const patch=Object.fromEntries(Object.entries(draft).filter(([k,v])=>v!==info.values[k]));if(!Object.keys(patch).length){close();return;}await save(info.room_id,patch,info.project_version);close();}catch(e){if((e as any).status!==409)setDraft(info.values);setError((e as Error).message+'；未保存。版本冲突时保留当前草稿，请读取最新值后重新核对。');}finally{setBusy(false);}}}>
   <h2 id="object-title">家具属性</h2><p>{objectId}</p>
   <button type="button" aria-label="关闭家具属性" disabled={busy} onClick={close}>×</button>
   {info && <><div className="object-fields">{([['width','宽度'],['depth','进深'],['height','物件高度'],['elevation','离地高度']] as const).map(([key,label])=><label key={key}>{label}（cm）<input type="number" step="0.1" min={key==='elevation'?0:1} max={key==='elevation'?1000:2000} required disabled={busy||chatBusy||!info.capabilities.size} value={draft[key]??''} onChange={e=>setDraft({...draft,[key]:e.target.value===''?'':Number(e.target.value)})}/></label>)}</div>
   <label>颜色<input type="color" value={draft.color||'#808080'} disabled={busy||chatBusy||!info.capabilities.color} onChange={e=>setDraft({...draft,color:e.target.value})}/></label>
   <label>材质<select aria-label="材质" disabled aria-describedby="material-reason"><option>原生模型材质</option></select></label><p id="material-reason">{info.capabilities.reason}</p>
   <p>确认仅保存此家具属性，不确认整套装修方案。</p>
   <button className="primary" disabled={busy||chatBusy||!info.capabilities.size}>{busy?'保存中…':'确认保存家具'}</button></>}
   {error&&<><p role="alert">{error}</p><button type="button" onClick={async()=>{try{const i=await api<any>(`/api/projects/${projectId}/objects/${objectId}`);setInfo(i);setDraft(i.values);setError('');}catch(e){setError((e as Error).message);}}}>读取最新值并重新核对</button></>}
   </form>
   {info&&<ObjectChat project={project} objectId={objectId} roomId={info.room_id} commit={commit} preview={preview} restore={restore} adopt={adopt} onBusy={setChatBusy}/>}
 </dialog>;
}
