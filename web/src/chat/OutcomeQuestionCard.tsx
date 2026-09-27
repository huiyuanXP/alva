import {useLanguage} from '../i18n/language.js';
import React,{useEffect,useState} from 'react';
import './outcome-question.css';
import {outcomeAnswer,type OutcomeQuestion} from '../../../packages/contracts/alva/consultation-question.js';

type Props={card:OutcomeQuestion;disabled:boolean;allowNotApplicable?:boolean;onConfirm:(text:string,state:'answered'|'unknown'|'skipped'|'not_applicable',optionId?:string)=>Promise<unknown>};
export function OutcomeQuestionCard({card,disabled,onConfirm,allowNotApplicable=true}:Props){
 const language=useLanguage();
 const [selected,setSelected]=useState(''),[custom,setCustom]=useState(''),[saving,setSaving]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setSelected(value=>value==='custom'?value:'')},[JSON.stringify(card.options)]);
 const option=card.options.find(o=>o.id===selected),answer=selected==='custom'?custom:option?outcomeAnswer(option,language):'';
 const confirm=async(text:string,state:'answered'|'unknown'|'skipped'|'not_applicable')=>{setSaving(true);setError('');try{await onConfirm(text,state,state==='answered'&&selected!=='custom'?selected:undefined)}catch(e){setError(e instanceof Error?e.message:'确认失败，请重试')}finally{setSaving(false)}};
 const blocked=disabled||saving;
 return <section className="question-card outcome-question" aria-label="按结果选择" data-testid="outcome-question">
  <small>{card.questionId} · 效果示例，尚未采用</small><h3>{card.question}</h3><p>{card.reason}</p>
  {!!card.assumptions.length&&<p>示例前提：{card.assumptions.join('；')}</p>}
  <div className="choices">{card.options.map(o=><button type="button" key={o.id} disabled={blocked} aria-pressed={selected===o.id} onClick={()=>setSelected(o.id)}>
   <strong>{o.id} · {o.title}{card.recommendedOptionId===o.id?' · 推荐':''}</strong>
   <p>选择后的结果：{o.outcome}</p><p>具体示例：{o.example}</p><p>需要取舍：{o.tradeoff}</p>
  </button>)}</div>
  {card.recommendedOptionId&&<p>推荐依据：{card.recommendationReason}</p>}
  <label>自己的想法<textarea aria-label="自己的结果描述" disabled={blocked} value={custom} onChange={e=>{setCustom(e.target.value);setSelected('custom')}}/></label>
  <button disabled={blocked||!answer.trim()} onClick={()=>void confirm(answer,'answered')}>确认这个回答</button>
  <div className="answer-states">{([['unknown','暂不确定'],['skipped','跳过'],['not_applicable','不适用']] as const).filter(([state])=>allowNotApplicable||state!=='not_applicable').map(([state,label])=><button key={state} disabled={blocked} onClick={()=>void confirm('',state)}>{label}</button>)}</div>
  {error&&<p role="alert">{error}</p>}
 </section>;
}
