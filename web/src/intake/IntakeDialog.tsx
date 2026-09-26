import React,{useEffect,useRef,useState} from 'react';
import type {Project} from '../../../api/model.js';
import {type Answers,type Response,type Value,stages,cards,path,flags,condition,prompt,answered,raw,options,priorities,activeAnswers,picked} from '../../../packages/contracts/alva/home-vision/flow.js';
import {Field} from './VisionFields.js';
import {completeValue,hasValue} from '../../../packages/contracts/alva/home-vision/field-values.js';
import {updateReferences} from '../../../packages/contracts/alva/home-vision/references.js';
import './vision.css';
type Props={project:Project;readOnly:boolean;onUpdate:(p:Project)=>void;onClose:()=>void};
function display(v:Value|undefined):string{if(v==null)return 'Not answered';if(typeof v==='string'||typeof v==='number')return String(v);if(Array.isArray(v))return v.map(display).join(', ');return Object.entries(v).filter(([k])=>!['data','mime'].includes(k)).map(([k,x])=>k==='name'?String(x):display(x)).join(' · ')}
export function IntakeDialog({project,readOnly,onUpdate,onClose}:Props){
 const dialog=useRef<HTMLDialogElement>(null),focus=useRef(document.activeElement as HTMLElement|null);
 const [people,setPeople]=useState<Response[]>([]),[current,setCurrent]=useState<Response|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState(''),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[saved,setSaved]=useState(false),[overview,setOverview]=useState(false),[newName,setNewName]=useState(''),[addPerson,setAddPerson]=useState(false),[conflict,setConflict]=useState(false);
 const state=useRef<Response|null>(null),generation=useRef(0),persisted=useRef(0),mutex=useRef<Promise<boolean>|null>(null),mounted=useRef(true);
 const pending=useRef<{body:string;id:string;version:number;generation:number}|null>(null);
 const assign=(r:Response,changed=true)=>{state.current=r;setCurrent(r);if(changed){generation.current++;setDirty(true);setSaved(false)}};
 const load=async()=>{
  setLoading(true);setError('');
  try {
   const response=await fetch('/api/intake/vision');
   if(!response.ok)throw new Error('Unable to load your answers. Please retry.');
   const data=await response.json();
   if(!mounted.current)return;
   const wanted=state.current?.id||new URLSearchParams(location.hash.slice(1)).get('vision');
   const selected=data.responses.find((r:Response)=>r.id===wanted);
   if(wanted&&!selected)throw new Error('This response is not available. Check the shared link or reopen from the project.');
   const next=selected||data.responses[0]||{id:crypto.randomUUID(),name:'Your answers',answers:{},cursor:'Q01',updatedAt:'',version:0};
   pending.current=null;generation.current=0;persisted.current=0;
   setPeople(data.responses);setDirty(false);setConflict(false);assign(next,false);
  }catch(e){if(mounted.current)setError((e as Error).message)}
  finally{if(mounted.current)setLoading(false)}
 };
 useEffect(()=>{
  const old=document.body.style.overflow;
  document.documentElement.classList.add('hv-modal-open');
  document.body.style.overflow='hidden';dialog.current?.showModal();mounted.current=true;void load();
  return()=>{mounted.current=false;document.documentElement.classList.remove('hv-modal-open');document.body.style.overflow=old;focus.current?.focus()};
 },[]);
 useEffect(()=>{if(error)dialog.current?.querySelector('[role="alert"]')?.scrollIntoView({block:'center'})},[error]);
 const persist=async():Promise<boolean>=>{
  if(readOnly)return true;
  if(conflict)return false;
  if(mutex.current){const running=mutex.current;const ok=await running;if(mutex.current===running)mutex.current=null;if(!ok)return false;return persist()}
  if(!state.current||generation.current===persisted.current)return true;
  const run=async()=>{
   setSaving(true);setError('');
   try {
    while(generation.current!==persisted.current) {
     if(!pending.current) {
      const r=state.current!,n=generation.current;
      pending.current={id:r.id,version:r.version,generation:n,body:JSON.stringify({requestId:crypto.randomUUID(),id:r.id,name:r.name,answers:r.answers,cursor:r.cursor,expectedVersion:r.version})};
     }
     // Retry the exact request: a transport or 5xx failure may follow a commit.
     const attempt=pending.current;
     const response=await fetch('/api/intake/vision',{method:'POST',headers:{'Content-Type':'application/json'},body:attempt.body});
     const savedProject=await response.json();
     if(!response.ok) {
      if(response.status<500)pending.current=null;
      if(response.status===409)setConflict(true);
      throw new Error(response.status===409?'Another window saved newer answers. Your edits are still here. Copy them before choosing to load the saved answers.':savedProject.error||savedProject.message||'Could not save. Your answers are still here; please retry.');
     }
     const stored=savedProject.homeVision.responses.find((r:Response)=>r.id===attempt.id);
     // Replays return the current project; do not adopt another writer's version.
     if(!stored||stored.version!==attempt.version+1) {
      pending.current=null;setConflict(true);
      throw new Error('Newer answers were saved in another window. Your edits are still here; copy them before loading the saved answers.');
     }
     state.current={...state.current!,version:stored.version,updatedAt:stored.updatedAt};
     pending.current=null;persisted.current=attempt.generation;
     setCurrent(state.current);setPeople(savedProject.homeVision.responses);onUpdate(savedProject);
    }
    setDirty(false);setSaved(true);return true;
   }catch(e){setError((e as Error).message);return false}
   finally{setSaving(false)}
  };
  const running=run();mutex.current=running;const ok=await running;
  if(mutex.current===running)mutex.current=null;
  return ok;
 };
 useEffect(()=>{if(!dirty||readOnly||error||loading||conflict)return;const t=setTimeout(()=>void persist(),650);return()=>clearTimeout(t)},[current,dirty,error,loading,conflict]);
 useEffect(()=>{const handler=(e:BeforeUnloadEvent)=>{if(generation.current!==persisted.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',handler);return()=>window.removeEventListener('beforeunload',handler)},[]);
 const close=async()=>{if(await persist())onClose()};
 const a=current?.answers||{},f=flags(a),route=path(a),cursor=current?.cursor||'Q01',summary=cursor.startsWith('summary:'),done=cursor==='complete';
 const stage=summary?cursor.split(':')[1]:done?'S7':route.find(c=>c.card===cursor)?.stage||'S1';
 const card=route.find(c=>c.card===cursor)||route.find(c=>c.stage===stage)||route[0],stageCards=route.filter(c=>c.stage===stage),idx=stageCards.findIndex(c=>c.card===card?.card),visible=card.items.filter(i=>condition(i.show_if,a,f));
 const go=(next:string)=>{if(!current)return;assign({...state.current!,cursor:next},!readOnly);setOverview(false);dialog.current?.scrollTo({top:0});};
 const put=(id:string,value:Value,status:'answered'|'unknown'|'skipped'='answered')=>{if(readOnly||!state.current)return;const base=id==='Q09a'&&status==='answered'?updateReferences(state.current.answers,value):state.current.answers;const next={...base,[id]:{state:status,value}};assign({...state.current,answers:next});if(!conflict)setError('')};
 const progressTotal=stageCards.filter(c=>c.card.startsWith('Q')).length||stageCards.length;const progressPosition=Math.max(1,stageCards.slice(0,idx+1).filter(c=>c.card.startsWith('Q')).length);
 const next=()=>{const n=route.indexOf(card);go(route[n+1]?.stage===stage?route[n+1].card:'summary:'+stage)};
 const skip=()=>{if(!readOnly&&state.current){const answers={...a};for(const i of visible)if(!answered(a,i.id))answers[i.id]={state:'skipped',value:null};assign({...state.current,answers})}next()};
 const effective=activeAnswers(a);
 const ready=visible.some(i=>answered(effective,i.id)||a[i.id]?.state==='unknown');
 const valid=visible.every(i=>!hasValue(raw(a,i.id))||completeValue(i,raw(a,i.id),field=>condition(field.show_if,a,f)));
 const switchPerson=async(id:string)=>{if(!await persist())return;const r=people.find(p=>p.id===id);if(r){generation.current=0;persisted.current=0;assign(r,false);setDirty(false);setOverview(false)}};
 const create=async()=>{if(!newName.trim()||!await persist())return;generation.current=0;persisted.current=0;assign({id:crypto.randomUUID(),name:newName.trim(),answers:{},cursor:'Q01',version:0,updatedAt:''});setAddPerson(false);setNewName('')};
 const title=summary?'Your '+stages[Number(stage.slice(1))-1].toLowerCase()+' summary':done?'Your home vision, captured':overview?'Your answers':prompt(visible[0]||card.items[0],a,f);
 return <dialog data-card={card.card} className={'hv-dialog '+(['Q05','Q07','Q08'].includes(card.card)||summary||overview?'wide':'')} ref={dialog} aria-label="Your Home Vision" onCancel={e=>{e.preventDefault();void close()}}><div className="hv-shell">
 <div className="hv-top">{!loading&&cursor!=='Q01'&&<button className="hv-round" aria-label="Previous question" onClick={()=>{if(summary)go(stageCards.at(-1)!.card);else if(overview)setOverview(false);else go(route[Math.max(0,route.indexOf(card)-1)].card)}}>‹</button>}<div><span className="hv-stage">{stages[Number(stage.slice(1))-1]} · {summary||done?progressTotal:progressPosition} of {progressTotal}</span><progress max={progressTotal||1} value={summary||done?progressTotal:progressPosition} aria-label="Stage progress"/></div><button className="hv-round" aria-label="Save and close questionnaire" onClick={()=>void close()}>×</button></div>
 {loading?<p role="status">Loading your answers…</p>:!current?<p>Unable to load the questionnaire.</p>:<>
 <div className="hv-heading"><h2 className="hv-title" id="hv-title">{title}</h2><p className="hv-subtitle">{summary?'Review your answers. Select a question to make a change.':done?'Review your answers with your designer. Nothing is final until you agree on it together.':overview?'Pick a stage to review or continue.':visible[0]?.helper&&visible[0].helper!=='Collapsed by default.'?visible[0].helper:card.card==='Q05'?'Select all that apply.':''}</p></div>
 {overview?<div className="hv-summary">{stages.map((s,n)=><button key={s} onClick={()=>go('summary:S'+(n+1))}><b>{s}</b><small>{route.filter(c=>c.stage==='S'+(n+1)).flatMap(c=>c.items).filter(i=>answered(a,i.id)).length} answers recorded</small></button>)}</div>:summary||done?<div className="hv-summary">{(done?route:stageCards).map(c=><button key={c.card} onClick={()=>go(c.card)}><b>{prompt(c.items[0],a,f)}</b>{c.items.filter(i=>condition(i.show_if,a,f)).map(i=>{const answer=a[i.id];const opts=options(i,a,f);let value=display(raw(effective,i.id));for(const o of opts)value=value.replaceAll(o.id,o.label);return <small key={i.id}>{answer?.state==='unknown'?'Not sure yet':answer?.state==='skipped'?'Skipped — revisit anytime':value}</small>})}</button>)}{done&&priorities(a,people).length>0&&<details><summary>Topics to discuss with your designer</summary>{priorities(a,people).map(p=><p className="hv-note" key={p.id}>{p.note}</p>)}</details>}</div>:<div className="hv-items" key={card.card}>{card.collapsed?<details><summary>Optional: share sensitivities</summary>{visible.map(i=><Field key={i.id} item={i} answers={a} put={put} disabled={readOnly}/>)}</details>:visible.map((i,n)=><Field key={i.id} item={i} answers={a} put={put} disabled={readOnly} hideTitle={n===0}/>)}</div>}
 {!valid&&<p className="hv-note">Complete the fields and required selections before continuing. You can skip this question instead.</p>}
 {f.has('ACCESS_SIGNAL')&&!a.C2a&&!['C2','Q01','Q02','Q03','Q04'].includes(card.card)&&<button className="hv-ghost" onClick={()=>go('C2')}>Would you like to share any accessibility needs?</button>}
 {(done||card.card==='C5')&&f.has('MULTI_DECIDER')&&!readOnly&&<div><button className="hv-ghost" onClick={()=>setAddPerson(true)}>Invite someone to add their own answers</button><p className="hv-note">Keep each person's preferences separate. They can answer here, or use a link with the project's existing access code.</p>{addPerson&&<div className="hv-row"><input className="hv-field" placeholder="Their name" aria-label="New respondent name" value={newName} maxLength={80} onChange={e=>setNewName(e.target.value)}/><button className="hv-ghost" onClick={()=>void create()}>Create separate response</button></div>}</div>}
 <div className="hv-footer"><div>{summary||done||overview?<button className="hv-ghost" onClick={()=>setOverview(!overview)}>Review all stages</button>:<button className="hv-ghost" onClick={skip}>Skip for now</button>}<small>You can change this anytime.</small></div><button className="hv-cta" disabled={loading||saving||(!summary&&!done&&!overview&&!readOnly&&(!ready||!valid))} onClick={()=>{if(done)void close();else if(summary){const n=Number(stage.slice(1));go(n===7?'complete':route.find(c=>c.stage==='S'+(n+1))?.card||'complete')}else if(overview)setOverview(false);else next()}}>{done?'Save & close':summary?'Next stage':'Continue'}</button></div>
 </>}
 {error&&<div role="alert" className="hv-error">{error}{!current?<button className="hv-ghost" disabled={loading} onClick={()=>void load()}>Retry loading</button>:conflict?<><button className="hv-ghost" onClick={()=>void navigator.clipboard.writeText(JSON.stringify(state.current,null,2)).catch(()=>setError('Could not copy. Your edits are still in this window.'))}>Copy unsaved answers</button><button className="hv-ghost" onClick={()=>{if(window.confirm('Discard the unsaved edits in this window and load the latest saved answers?'))void load()}}>Load saved answers</button></>:<button className="hv-ghost" disabled={saving} onClick={()=>void persist()}>Retry save</button>}</div>}
 <div className="hv-savebar"><span role="status">{readOnly?'Read-only view':saving?'Saving…':dirty?'Unsaved changes':saved||current?.updatedAt?'All changes saved':'Answers save automatically'}</span><div className="hv-row">{people.length>1&&<select aria-label="Respondent" className="hv-person" value={current?.id} onChange={e=>void switchPerson(e.target.value)}>{people.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}<button className="hv-ghost" disabled={loading} onClick={()=>setOverview(!overview)}>Review</button><button className="hv-ghost" disabled={loading||saving||readOnly} onClick={()=>void persist()}>Save now</button>{current&&people.length>1&&<button className="hv-ghost" onClick={()=>void navigator.clipboard.writeText(location.origin+location.pathname+'#vision='+current.id).then(()=>setSaved(true)).catch(()=>setError('Unable to copy the link.'))}>Copy link</button>}</div></div>
 </div></dialog>;
}
