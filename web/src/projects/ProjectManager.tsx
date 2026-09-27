import {useEffect,useRef,useState} from 'react';
import type {UiAction} from '../../../packages/contracts/alva/ui-action.js';
import {projectFetch} from './session.js';
import './projects.css';
export type Navigation=Extract<UiAction,{kind:'project_manager'}>['navigation'];
type Summary={id:string;name:string;createdAt:string;savedVersion:number;stage:string};
export function ProjectManager({currentId,busy,request,onClose}:{currentId:string;busy:boolean;request:Navigation|null;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),attempt=useRef<{requestId:string;expectedProjectId:string;navigation:Navigation}|null>(null);
 const [projects,setProjects]=useState<Summary[]>([]),[name,setName]=useState(request?.mode==='create'?request.name:''),[loading,setLoading]=useState(true),[working,setWorking]=useState(false),[error,setError]=useState('');
 useEffect(()=>{dialog.current?.showModal();void projectFetch('/api/projects').then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);setProjects(data.projects)}).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 useEffect(()=>{if(request?.mode==='create')setName(request.name)},[request]);
 const navigate=async(navigation:Navigation)=>{
  setWorking(true);setError('');try{
   if(!attempt.current||JSON.stringify(attempt.current.navigation)!==JSON.stringify(navigation))attempt.current={requestId:crypto.randomUUID(),expectedProjectId:currentId,navigation};
   const r=await projectFetch('/api/projects/navigate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(attempt.current)}),data=await r.json();if(!r.ok)throw new Error(data.error||'项目操作失败');
   // Reload clears all project-local forms, stage state, media and pending handlers.
   location.replace(location.pathname);
  }catch(e){setError((e as Error).message);setWorking(false)}
 };
 return <dialog ref={dialog} className="project-manager" aria-labelledby="projects-title" onCancel={event=>{if(working)event.preventDefault();else onClose()}}>
  <div className="projects-heading"><h2 id="projects-title">新建 / 切换项目</h2><button aria-label="关闭项目面板" disabled={working} onClick={onClose}>关闭</button></div>
  <p>每个项目独立保存户型、设计和聊天。切换会保留当前工作稿；还没发送的文字或附件请先处理。</p>
  <form onSubmit={event=>{event.preventDefault();void navigate({mode:'create',name:name.trim()})}}>
   <label htmlFor="project-name">新项目名称</label><div className="projects-create"><input id="project-name" value={name} maxLength={100} placeholder="例如：新家的户型方案" onChange={e=>setName(e.target.value)} autoFocus/><button className="primary" disabled={busy||working||!name.trim()}>新建并进入</button></div>
   <small>从导入户型图开始，不复制现有项目内容。</small>
  </form>
  {error&&<p role="alert" className="error">{error}</p>}
  <h3>我的项目</h3>{loading?<p role="status">正在加载项目…</p>:<ul className="projects-list">{projects.map(project=><li key={project.id} className={request?.mode==='switch'&&request.targetProjectId===project.id?'suggested':''}><div><strong>{project.name}</strong><small>{project.stage==='living'?'生活设计':'户型导入'} · {project.savedVersion?`已保存 v${project.savedVersion}`:'尚无保存版本'} · {new Date(project.createdAt).toLocaleDateString()}</small></div><button disabled={busy||working||project.id===currentId} onClick={()=>void navigate({mode:'switch',targetProjectId:project.id})}>{project.id===currentId?'当前项目':'切换到此项目'}</button></li>)}</ul>}
  {busy&&<p role="status">顾问正在处理，完成后即可确认新建或切换。</p>}
 </dialog>;
}
