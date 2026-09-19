import React, { useId, useRef, useState } from 'react';
import type { IntakeAnswer, IntakeQuestion } from '../../../packages/contracts/intake.js';
import { intakeCatalogue } from '../../../packages/contracts/intake.js';
import type { ProjectData } from '../../../packages/contracts/index.js';
import type { Commit } from './RequirementsPanel.js';
import {OptionList} from './components/tool-ui/option-list/index.js';
import './tool-ui.css';

export function IntakeCard({question,project,roomId,answer,commit,keyboard,onDone,onDirty,toolOptions=false}:{question:IntakeQuestion;project:ProjectData;roomId:string;answer?:IntakeAnswer|null;commit:Commit;keyboard:(v:boolean)=>void;onDone:()=>void;onDirty?:(id:string,dirty:boolean)=>void;toolOptions?:boolean}) {
  const uid=useId(),retry=useRef<{fingerprint:string;id:string}|null>(null),submitting=useRef(false);
  const [frozen,setFrozen]=useState<IntakeQuestion|null>(null),[choice,setChoice]=useState(''),[text,setText]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [target,setTarget]=useState(''),[ceiling,setCeiling]=useState(''),[currency,setCurrency]=useState('');
  const [mode,setMode]=useState<'private'|'summary'|'selected'>('private'),[sharedQuestions,setSharedQuestions]=useState<string[]>([]),[sharedAttachments,setSharedAttachments]=useState<string[]>([]);
  const [owner,setOwner]=useState(''),[nextAction,setNextAction]=useState('');
  const q=frozen??question,stale=!!frozen&&frozen.base_version!==project.version;
  const dirty=()=>{setFrozen(f=>f??question);setError('');onDirty?.(question.id,true);};
  const choose=(id:string)=>{dirty();setChoice(id);if(q.questionnaire_id==='Q06')setMode(id==='B'?'summary':id==='C'?'selected':'private');};
  async function submit(state?:string) {
    if(submitting.current)return;
    submitting.current=true;
    setBusy(true);setError('');
    try{
      const version=frozen?.base_version??question.base_version;
      if(version!==project.version)throw Error('资料已更新，草稿保留。先核对最新回答再确认。');
      const b:Record<string,unknown>={question_id:q.questionnaire_id,room_id:roomId,choice:state??choice,text:state?'':text,expected_version:version,...(owner.trim()?{followup_owner:owner.trim()}:{}),...(nextAction.trim()?{next_action:nextAction.trim()}: {})};
      if(!state&&q.questionnaire_id==='Q19'&&(target||ceiling||currency)){
        const number=(value:string)=>{if(!/^\d+(\.\d+)?$/.test(value))throw Error('结构化金额只填非负数值；预算范围也可以直接自由描述');return Number(value);};
        b.budget={...(target?{target:number(target)}:{}),...(ceiling?{ceiling:number(ceiling)}:{}),...(currency?{currency:currency.toUpperCase()}: {})};
      }
      if(!state&&q.questionnaire_id==='Q06')b.sharing={mode,question_ids:mode==='selected'?sharedQuestions:[],attachment_ids:mode==='selected'?sharedAttachments:[]};
      const fingerprint=JSON.stringify(b);if(retry.current?.fingerprint!==fingerprint)retry.current={fingerprint,id:crypto.randomUUID()};
      await commit('/intake/answer',{...b,request_id:retry.current.id});
      onDirty?.(q.id,false);setFrozen(null);setChoice('');setText('');keyboard(false);onDone();
    }catch(e){setError((e as Error).message);}finally{submitting.current=false;setBusy(false);}
  }
  const toggle=(values:string[],id:string)=>values.includes(id)?values.filter(v=>v!==id):[...values,id];
  return <fieldset className="ask-card intake-card intake-design" disabled={busy} data-question-id={q.id} onFocusCapture={()=>keyboard(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))keyboard(false);}}>
    <legend><span className="intake-id">{q.questionnaire_id} · {q.group}</span>{q.text}</legend>
    {answer&&<div className="intake-existing"><b>{answer.confirmation_state==='pending'?'原话提取 · 待你核对':'当前回答'}</b><p>{answer.answer_text||({unknown:'暂不确定',skipped:'已跳过',not_applicable:'不适用'} as Record<string,string>)[answer.answer_state]}</p>{answer.confirmation_state==='pending'&&<button type="button" onClick={()=>{dirty();setChoice('E');setText(answer.answer_text);}}>用这段原话填写，核对后确认</button>}</div>}
    <p className="ask-basis"><b>{q.recommendation.basis==='evidence'?'根据已有信息，我倾向于：':'可供比较的起点：'}{q.recommendation.label}</b><br/>{q.recommendation.rationale}</p>
    {q.recommendation.evidence_ids.length>0&&<details className="intake-sources"><summary>查看推荐依据（{q.recommendation.evidence_ids.length}）</summary>{q.recommendation.evidence_ids.map(id=><blockquote key={id}>{project.evidence.find(e=>e.id===id)?.quote??'此来源不在当前快照中'}</blockquote>)}</details>}
    {toolOptions ? <OptionList id={q.id} selectionMode="single" value={choice||null} actions={[]} options={[...q.options.map(o=>({id:o.id,label:o.label,description:o.id==='A'?'顾问建议 · 由你确认':o.requires_input?'请补充实际资料':undefined,disabled:busy})),{id:'E',label:q.freeform.label,disabled:busy}]} onChange={value=>{if(typeof value==='string')choose(value);}} /> : <div className="ask-options" role="radiogroup" aria-label={q.text}>{q.options.map(o=><label key={o.id} className={choice===o.id?'is-selected':''}><input type="radio" name={uid} checked={choice===o.id} onChange={()=>choose(o.id)}/><span><b>{o.id}{o.id==='A'?' · 推荐 / 待确认':''}</b>{o.label}{o.requires_input&&<small>填写实际资料；不会替你推断</small>}</span></label>)}<label className={choice==='E'?'is-selected':''}><input type="radio" name={uid} checked={choice==='E'} onChange={()=>choose('E')}/><span><b>E · 自由描述</b>{q.freeform.label}</span></label></div>}
    <label className="ask-freeform" htmlFor={uid+'-text'}>自由填写 / 补充具体资料</label><textarea id={uid+'-text'} aria-label="自由填写问卷答案" rows={3} maxLength={4000} value={text} placeholder={q.freeform.placeholder} onChange={e=>{dirty();setText(e.target.value);setChoice('E');}}/>
    {q.questionnaire_id==='Q19'&&<div className="intake-special"><p>可选：单独记录目标与硬上限。原有文字回答不会被强行转换为金额。</p><label>目标金额<input inputMode="decimal" aria-label="预算目标" value={target} onChange={e=>{dirty();setTarget(e.target.value);setChoice('E');}}/></label><label>硬上限<input inputMode="decimal" aria-label="预算硬上限" value={ceiling} onChange={e=>{dirty();setCeiling(e.target.value);setChoice('E');}}/></label><label>币种代码<input aria-label="预算币种代码" maxLength={3} placeholder="SGD / CNY / USD" value={currency} onChange={e=>{dirty();setCurrency(e.target.value);setChoice('E');}}/></label></div>}
    {q.questionnaire_id==='Q06'&&<div className="intake-special"><label>本次实际保存的共享权限<select aria-label="共享范围" value={mode} onChange={e=>{dirty();setMode(e.target.value as typeof mode);setChoice('E');}}><option value="private">仅本人可见</option><option value="summary">允许整理后的需求摘要（不含原话和附件）</option><option value="selected">仅勾选的需求与附件</option></select></label><p>这是导出筛选规则，不会发送给任何人。共享前仍需检查文字中的个人信息。</p>{mode==='selected'&&<details open><summary>逐项勾选授权内容（没有默认勾选）</summary><div className="sharing-list">{intakeCatalogue.filter(d=>d.id!=='Q06').map(d=><label key={d.id}><input type="checkbox" checked={sharedQuestions.includes(d.id)} onChange={()=>{dirty();setSharedQuestions(toggle(sharedQuestions,d.id));}}/>{d.id} {d.question}</label>)}{(project.attachments??[]).map(a=><label key={a.id}><input type="checkbox" checked={sharedAttachments.includes(a.id)} onChange={()=>{dirty();setSharedAttachments(toggle(sharedAttachments,a.id));}}/>附件：{a.name??a.mime} · {project.rooms.find(r=>r.id===a.room_id)?.name}</label>)}</div></details>}</div>}
    <details className="intake-followup"><summary>还需补资料？记录负责人和下一步（可选）</summary><label>负责人<input aria-label="待补资料负责人" value={owner} maxLength={200} onChange={e=>{dirty();setOwner(e.target.value);}}/></label><label>下一步动作<input aria-label="待补资料下一步" value={nextAction} maxLength={500} onChange={e=>{dirty();setNextAction(e.target.value);}}/></label></details>
    <small>{q.why}</small>
    {stale&&<div className="ask-conflict" role="status"><p>最新回答：{answer?.answer_text||'尚无正式回答'}。本次草稿未丢失，尚未覆盖任何内容。</p><button type="button" onClick={()=>{setFrozen({...q,base_version:project.version});retry.current=null;setError('');}}>我已核对最新资料，保留草稿再确认</button></div>}
    {error&&<p className="ask-error" role="alert">{error}</p>}
    <div className="ask-actions"><button type="button" className="primary" disabled={busy||stale||!choice} onClick={()=>void submit()}>{busy?'保存中…':'确认此回答'}</button><span>没有默认选中项</span></div>
    <div className="ask-neutral"><button type="button" disabled={stale} onClick={()=>void submit('unknown')}>暂不确定</button><button type="button" disabled={stale} onClick={()=>void submit('skipped')}>先跳过</button><button type="button" disabled={stale} onClick={()=>void submit('not_applicable')}>不适用</button></div>
  </fieldset>;
}
