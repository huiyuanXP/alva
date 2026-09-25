import React,{useEffect,useRef,useState} from 'react';
import type {Project} from '../../../api/model.js';
import type {IntakeDraft} from '../../../api/intake/routes.js';
import './intake.css';

type Question={id:string;scope:'project'|'room';group:string;question:string;choices:string[];conditional:boolean;why:string};
type Props={project:Project;readOnly:boolean;onUpdate:(p:Project)=>void;onClose:()=>void};
const key=(q:string,r:string|null)=>JSON.stringify([q,r]);
const labels={answered:'已回答',unknown:'暂不确定',skipped:'暂时跳过',not_applicable:'不适用'};
export function IntakeDialog({project,readOnly,onUpdate,onClose}:Props){
 const dialog=useRef<HTMLDialogElement>(null),active=useRef(document.activeElement as HTMLElement|null),revision=useRef(project.revision);
 const [questions,setQuestions]=useState<Question[]>([]),[drafts,setDrafts]=useState<Record<string,IntakeDraft>>({}),[questionId,setQuestionId]=useState('Q01'),[roomId,setRoomId]=useState(''),[branch,setBranch]=useState(false),[summary,setSummary]=useState(false),[dirty,setDirty]=useState(false),[saving,setSaving]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[closing,setClosing]=useState(false);
 useEffect(()=>{revision.current=project.revision},[project.revision]);
 useEffect(()=>{dialog.current?.showModal();const previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';let cancelled=false;
  fetch('/api/intake').then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error);return d}).then(d=>{if(cancelled)return;setQuestions(d.questions);setDrafts(Object.fromEntries(d.progress.drafts.map((x:IntakeDraft)=>[key(x.questionId,x.roomId),x])));const cursor=d.progress.cursor;const first=d.questions.find((q:Question)=>!q.conditional&&q.scope==='project'&&!project.answers.some(a=>a.questionId===q.id));setQuestionId(cursor?.questionId||first?.id||'Q01');setBranch(!!d.questions.find((q:Question)=>q.id===cursor?.questionId)?.conditional);setRoomId(cursor?.roomId||project.scene?.rooms[0]?.id||'');setNotice(d.progress.updatedAt?'已恢复上次保存的进度':'每次聊一个问题，按自己的节奏来。')}).catch(e=>{if(!cancelled)setError(e.message)}).finally(()=>{if(!cancelled)setLoading(false)});
  return()=>{cancelled=true;document.body.style.overflow=previousOverflow;active.current?.focus()};
 },[]);
 useEffect(()=>{const warn=(e:BeforeUnloadEvent)=>{if(dirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 const list=questions.filter(q=>q.conditional===branch),q=list.find(q=>q.id===questionId)||list[0],index=list.findIndex(x=>x.id===q?.id),rid=q?.scope==='room'?roomId||null:null,k=key(q?.id||'',rid),existing=project.answers.find(a=>key(a.questionId,a.roomId)===k),draft=drafts[k],value=draft||existing;
 const locked=!!existing?.locked,editable=!readOnly&&!locked&&!saving,scopeOK=q?.scope==='project'||!!project.scene?.rooms.some(r=>r.id===rid);
 const currentText=value?.text||'',currentState=value?.state||'answered';
 const picked=q?.choices.find(c=>currentText===c||currentText.startsWith(c+'\n补充：'));
 const supplement=picked?(currentText.startsWith(picked+'\n补充：')?currentText.slice(picked.length+4):''):currentText;
 const put=(text:string,state:IntakeDraft['state']=currentState)=>{if(!q||!editable||!scopeOK)return;setDrafts(d=>({...d,[k]:{questionId:q.id,roomId:rid,text,state}}));setDirty(true);setNotice('有未保存的修改');setError('')};
 const cursor=()=>q&&scopeOK?{questionId:q.id,roomId:rid}:null;
 const request=async(path:string,body:object)=>{const r=await fetch('/api/intake/'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),expectedRevision:revision.current,...body})});const p=await r.json();if(!r.ok){if(r.status===409){const fresh=await fetch('/api/project');if(fresh.ok){const current=await fresh.json();revision.current=current.revision;onUpdate(current)}}throw new Error(r.status===409?'项目已更新，已刷新版本；你的草稿仍在，请检查后再次保存。':p.error||'保存失败，请重试')}revision.current=p.revision;onUpdate(p);return p as Project};
 const save=async(close=false)=>{if(readOnly||saving)return;setSaving(true);setError('');try{await request('progress',{drafts:Object.values(drafts),cursor:cursor()});setDirty(false);setNotice('进度已保存，可以放心关闭。');setClosing(false);if(close)onClose()}catch(e){setError((e as Error).message)}finally{setSaving(false)}};
 const confirm=async()=>{if(!q||!scopeOK||!editable)return;setSaving(true);setError('');try{await request('progress',{drafts:Object.values(drafts),cursor:cursor()});await request('confirm',{answer:{questionId:q.id,roomId:rid,text:currentText,state:currentState},confirmed:true});const remaining={...drafts};delete remaining[k];setDrafts(remaining);setDirty(false);setNotice('此回答已确认并保存。');if(index+1<list.length){const next=list[index+1];setQuestionId(next.id);if(next.group!==q.group)setSummary(true)}else setSummary(true)}catch(e){setError((e as Error).message)}finally{setSaving(false)}};
 const close=()=>{if(dirty&&!readOnly)setClosing(true);else onClose()};
 const go=(id:string)=>{setQuestionId(id);setSummary(false);setNotice('');if(!readOnly)setDirty(true)};
 const answered=list.filter(x=>project.answers.some(a=>a.questionId===x.id&&a.roomId===(x.scope==='project'?null:roomId))).length;
 return <dialog ref={dialog} className="intake-dialog" aria-labelledby="intake-title" onCancel={e=>{e.preventDefault();close()}}>
  <div className="intake-shell">
   <div className="intake-heading"><div><span className="eyebrow">从生活出发 · alva</span><h2 id="intake-title">聊聊你的家</h2></div><button className="intake-close" aria-label="关闭问卷" onClick={close}>×</button></div>
   <p className="intake-intro">不急着填完。一次一个问题，让家的想法慢慢清晰。</p>
   {loading?<p role="status">正在读取问卷与已保存进度…</p>:<>
    <div className="intake-navigation"><div className="intake-tabs"><button aria-pressed={!branch} onClick={()=>{setBranch(false);setQuestionId(questions.find(x=>!x.conditional)!.id);setSummary(false)}}>基础问题</button><button aria-pressed={branch} onClick={()=>{setBranch(true);setQuestionId(questions.find(x=>x.conditional)!.id);setSummary(false)}}>按需补充</button></div><button className="intake-text-button" onClick={()=>setSummary(s=>!s)}>{summary?'回到当前问题':'查看已答小结'}</button></div>
    <div className="intake-progress"><span>{branch?'相关时再补充，无需逐项填写':'可以跳过，也可以随时回来修改'}</span><span>已记录 {answered} / {list.length}</span></div><progress value={answered} max={list.length||1} aria-label="问卷完成进度"/>
    {summary?<section className="intake-summary"><h3>目前，我们了解了这些</h3><p>点击一条回答，可返回该题查看或更正。</p>{project.answers.filter(a=>questions.some(x=>x.id===a.questionId)).map(a=><button key={key(a.questionId,a.roomId)} onClick={()=>{const target=questions.find(x=>x.id===a.questionId)!;setBranch(target.conditional);setRoomId(a.roomId||roomId);go(a.questionId)}}><small>{a.questionId} · {a.roomId?project.scene?.rooms.find(r=>r.id===a.roomId)?.name:'全屋'} · {labels[a.state]}</small><b>{questions.find(x=>x.id===a.questionId)?.question}</b><span>{a.text||labels[a.state]}</span></button>)}{!project.answers.length&&<p>还没有正式确认的回答。已保存的草稿可回到题目继续填写。</p>}<button onClick={()=>setSummary(false)}>继续聊聊</button></section>:q&&<>
    <div className="intake-question-nav"><label>当前题目<select aria-label="选择问卷题目" value={q.id} onChange={e=>go(e.target.value)}>{list.map(x=><option key={x.id} value={x.id}>{x.id} · {x.group} · {x.question}</option>)}</select></label>{q.scope==='room'&&<label>这道题属于<select aria-label="问卷房间" value={roomId} onChange={e=>{setRoomId(e.target.value);setNotice('');if(!readOnly)setDirty(true)}}><option value="">请选择房间</option>{project.scene?.rooms.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>}</div>
    <section className="intake-card" aria-labelledby="intake-question"><div className="intake-meta"><span>{q.group} · {q.id}</span><span>{index+1} / {list.length}</span></div><h3 id="intake-question">{q.question}</h3>{q.why&&<p className="intake-why">{q.why}</p>}
     {!scopeOK&&<p className="intake-hint">房间问题需要先确认户型并选择房间。你可以先填写全屋问题，或保存进度后继续。</p>}
     {locked&&<p className="intake-hint">这条回答已锁定。请在右侧“需求”中解除锁定后修改。</p>}
     {readOnly&&<p className="intake-hint">当前为只读预览，可以查看已记录的回答。</p>}
     <div className="intake-options" role="group" aria-label="回答选项">{q.choices.map((choice,i)=><button key={choice} disabled={!editable||!scopeOK} aria-pressed={picked===choice&&currentState==='answered'} onClick={()=>put(choice+(supplement?'\n补充：'+supplement:''),'answered')}><span className="intake-letter">{String.fromCharCode(65+i)}</span><span>{choice}</span><span className="intake-check" aria-hidden="true">{picked===choice&&currentState==='answered'?'✓':''}</span></button>)}</div>
     <label className="intake-free">E · 自由补充<textarea aria-label="问卷自由补充" disabled={!editable||!scopeOK} maxLength={2500} placeholder="都不完全符合？直接写下你的想法，也可以补充所选答案。" value={supplement} onChange={e=>put(picked?picked+(e.target.value?'\n补充：'+e.target.value:''):e.target.value)}/></label>
     <div className="intake-states">{currentState!=='answered'&&<button disabled={!editable||!scopeOK} onClick={()=>put(currentText,'answered')}>改为填写回答</button>}{(['unknown','skipped','not_applicable'] as const).map(state=><button key={state} disabled={!editable||!scopeOK} aria-pressed={currentState===state} onClick={()=>put('',state)}>{labels[state]}</button>)}</div>
     {currentState==='not_applicable'&&<p className="intake-hint">请在自由补充中简要说明不适用的原因。</p>}
     <p className="intake-scope">本次确认仅记录：{q.scope==='project'?'全屋':project.scene?.rooms.find(r=>r.id===rid)?.name||'待选房间'} · {q.question} 不会确认整套方案。</p>
     {existing&&!draft&&<small>已记录：{labels[existing.state]}{existing.text?' · '+existing.text:''}</small>}
     <div className="intake-step-actions"><button disabled={index<=0||saving} onClick={()=>go(list[index-1].id)}>上一题</button><button disabled={!editable||!scopeOK||((currentState==='answered'||currentState==='not_applicable')&&!currentText.trim())} className="intake-primary" onClick={()=>void confirm()}>确认此回答</button><button disabled={index>=list.length-1||saving} onClick={()=>go(list[index+1].id)}>下一题 →</button></div>
    </section></>}
   </>}
   {error&&<p role="alert" className="intake-error">{error}</p>}
   {closing&&<div className="intake-close-prompt" role="group" aria-label="关闭前保存"><b>还有未保存的修改</b><p>保存进度后，下次可以接着填写。</p><div><button disabled={saving} className="intake-primary" onClick={()=>void save(true)}>保存并关闭</button><button disabled={saving} onClick={onClose}>放弃未保存修改</button><button onClick={()=>setClosing(false)}>继续填写</button></div></div>}
   <div className="intake-footer"><span role="status">{saving?'正在保存…':notice}</span><div><button onClick={close}>稍后再聊</button><button className="intake-primary" disabled={loading||saving||readOnly||!questions.length} onClick={()=>void save()}>保存进度</button></div></div>
  </div>
 </dialog>;
}
