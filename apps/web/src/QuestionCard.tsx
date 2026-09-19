import React, { useId, useRef, useState } from 'react';
import type { AskQuestion } from '../../../packages/contracts/ask-question.js';
import { questionAnswer, needsFreeDiscussion } from '../../../packages/contracts/ask-question.js';
import type { Requirement } from '../../../packages/contracts/index.js';
import type { Commit } from './RequirementsPanel.js';
import './question-card.css';

type Props = {
  question: AskQuestion; projectVersion: number; current?: Requirement; commit: Commit;
  keyboard: (locked:boolean)=>void; onError:(text:string)=>void;
  onDirty:(id:string,dirty:boolean)=>void; onAnswered:(id:string)=>void;
  onDiscuss:(text:string)=>Promise<void>;
};
export function QuestionCard({question:q,projectVersion,current,commit,keyboard,onError,onDirty,onAnswered,onDiscuss}:Props) {
  const uid=useId();
  const [choice,setChoice]=useState(''),[text,setText]=useState(''),[base,setBase]=useState<number|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const retry=useRef<{fingerprint:string;id:string}|null>(null);
  const dirty=()=>{if(base===null)setBase(q.base_version);onDirty(q.id,true);setError('');};
  const stale=base!==null && base!==projectVersion;
  const freeDiscussion=needsFreeDiscussion(q,choice,text);
  async function submit(state?:Requirement['answer_state']) {
    setBusy(true);setError('');
    try {
      if(!state && freeDiscussion) {
        if(stale)throw new Error('资料版本已变化，请先核对最新状态');
        await onDiscuss(`关于“${q.text}”（field_key: ${q.field_key}），我的自由回答：\n${text.trim()}\n请保留原话，尚未确定的内容不要当作已确认数值。`);
        onDirty(q.id,false);onAnswered(q.id);keyboard(false);return;
      }
      const answer=state?{room_id:q.room_id,field_key:q.field_key,value:null,answer_state:state}:questionAnswer(q,choice,text);
      const version=base??q.base_version;
      if(version!==projectVersion)throw new Error('资料版本已变化，请先核对最新值，再确认本次草稿');
      const adoptId=!state&&choice==='A'?q.recommendation.suggestion_id:undefined;
      const path=adoptId?'/suggestions/adopt':'/requirements';
      const payload=adoptId?{suggestion_ids:[adoptId]}:answer;
      const fingerprint=JSON.stringify({path,payload,version});
      if(retry.current?.fingerprint!==fingerprint)retry.current={fingerprint,id:crypto.randomUUID()};
      await commit(path,{...payload,expected_version:version,request_id:retry.current.id});
      onDirty(q.id,false);onAnswered(q.id);keyboard(false);
    } catch(err) {const message=(err as Error).message;setError(message);onError(message);}
    finally{setBusy(false);}
  }
  return <fieldset className="ask-card" disabled={busy} data-question-id={q.id}
    onFocusCapture={()=>keyboard(true)} onBlurCapture={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))keyboard(false);}}>
    <legend>{q.text}</legend>
    <p className="ask-basis"><b>{q.recommendation.label}</b><br/>{q.recommendation.rationale}</p>
    {q.recommendation.evidence_ids.length>0&&<small className="ask-source">依据 {q.recommendation.evidence_ids.map(id=>id.slice(0,6)).join(' · ')} · 待你选择</small>}
    <div className="ask-options" role="radiogroup" aria-label={q.text}>
      {q.options.map(o=><label key={o.id} className={choice===o.id?'is-selected':''}>
        <input type="radio" name={`ask-${uid}`} value={o.id} checked={choice===o.id} onChange={()=>{dirty();setChoice(o.id);}}/>
        <span><b>{o.id}{o.id==='A'?' · 建议起点':''}</b>{o.label}{o.requires_input&&<small>选择后请在下方补充具体值</small>}</span>
      </label>)}
      <label className={choice==='E'?'is-selected':''}><input type="radio" name={`ask-${uid}`} value="E" checked={choice==='E'} onChange={()=>{dirty();setChoice('E');}}/><span><b>E · 自由发挥</b>{q.freeform.label}</span></label>
    </div>
    <label className="ask-freeform" htmlFor={`ask-text-${uid}`}>自由填写 / 补充具体值</label>
    <textarea id={`ask-text-${uid}`} aria-label="自由填写答案" maxLength={2000} rows={3} value={text} placeholder={q.freeform.placeholder}
      onChange={e=>{dirty();setText(e.target.value);if(!q.options.find(o=>o.id===choice)?.requires_input)setChoice('E');}}/>
    {text&&choice!=='E'&&!q.options.find(o=>o.id===choice)?.requires_input&&<p className="ask-warning">已保留你的文字；当前将提交所选项。要提交文字，请选择 E。</p>}
    <small>{freeDiscussion?'这段原话将发到当前房间聊天；字段仍待确认，不会强行转换成金额、币种或尺寸。':'只记录此字段，不会改变其他字段、3D 场景或整份方案的确认状态。'}</small>
    {stale&&<div className="ask-conflict" role="status"><p>资料已更新。最新值：{current?current.answer_state==='answered'?String(current.value):current.answer_state:'尚未填写'}。草稿未丢失，也未覆盖新值。</p><button type="button" onClick={()=>{setBase(projectVersion);retry.current=null;setError('');}}>我已核对最新值，保留草稿再确认</button></div>}
    {error&&<p className="ask-error" role="alert">{error}</p>}
    <div className="ask-actions"><button type="button" className="primary" disabled={busy||stale||!choice} onClick={()=>void submit()}>{busy?'保存中…':freeDiscussion?'保留原话并继续讨论':'确认此回答'}</button><span>没有默认选中项</span></div>
    <div className="ask-neutral"><button type="button" disabled={busy||stale} onClick={()=>void submit('unknown')}>暂不确定</button><button type="button" disabled={busy||stale} onClick={()=>void submit('skipped')}>先跳过</button><button type="button" disabled={busy||stale} onClick={()=>void submit('not_applicable')}>不适用</button></div>
  </fieldset>;
}
