import {raw,useLanguage} from '../i18n/language.js';
import {House,Palette,Sofa,Sparkles} from 'lucide-react';
import React,{useState} from 'react';
import type {Project} from '../../../api/model.js';
import type {VisionQuestion} from '../../../packages/contracts/alva/home-vision/chat.js';
import {VisionTemplate,VisionOption} from '../vision/VisionTemplate.js';
type Answer={id:string;state:'answered'|'unknown'|'skipped';optionId?:string;customText?:string};
type Props={project:Project;disabled:boolean;respondentId?:string;mutate:(path:string,body:Record<string,unknown>)=>Promise<unknown>;onSubmit:(respondentId:string,text:string)=>Promise<unknown>};
export function VisionQuestionCards(props:Props){
 const pending=props.project.visionQuestions?.filter(c=>c.status==='awaiting_owner_confirmation'&&(!props.respondentId||c.respondentId===props.respondentId))||[];
 const latest=pending.at(-1);
 const cards=pending.filter(c=>c.sourceMessageId===latest?.sourceMessageId&&c.respondentId===latest?.respondentId).slice(0,4);
 return cards.length?<VisionSection key={cards.map(c=>c.id).join(':')} {...props} cards={cards}/>:null;
}
function VisionSection({project,disabled,mutate,onSubmit,cards}:Props&{cards:VisionQuestion[]}){
 const en=useLanguage()==='en',[index,setIndex]=useState(0),[answers,setAnswers]=useState<Record<string,Answer>>({}),[error,setError]=useState(''),[saving,setSaving]=useState(false);
 const card=cards[index],answer=answers[card.id],blocked=disabled||saving;
 const stale=cards.some(c=>(project.homeVision?.responses.find(r=>r.id===c.respondentId)?.version||0)!==c.responseVersion||c.topologyVersion!==(project.confirmationVersions?.topology??0));
 const Icon=card.questionId.startsWith('Q07')?Palette:card.roomId?Sofa:card.questionId.startsWith('Q01')?House:Sparkles;
 const put=(value:Omit<Answer,'id'>)=>setAnswers(old=>({...old,[card.id]:{id:card.id,...value}}));
 const submit=async()=>{setSaving(true);setError('');try{await mutate('/intake/vision/chat/section',{answers:cards.map(c=>answers[c.id]),confirmed:true});await onSubmit(card.respondentId,cards.map(c=>{const a=answers[c.id];return c.question+'\n'+(a.state==='unknown'?(en?'Not sure yet':'暂不确定'):a.state==='skipped'?(en?'Skipped':'跳过'):a.customText||c.options.find(o=>o.id===a.optionId)?.title)}).join('\n\n'))}catch(e){setError((e as Error).message)}finally{setSaving(false)}};
 return <VisionTemplate title={card.roomId?'Your Room Vision':'Your Home Vision'}>
 <div className="hv-top"><button className="hv-round" aria-label={en?'Previous question':'上一题'} disabled={blocked||index===0} onClick={()=>setIndex(index-1)}>‹</button><div><span className="hv-stage">{index+1} / {cards.length} · {raw(card.respondentName)}</span><progress value={index+1} max={cards.length}/></div></div>
 <div data-testid="vision-chat-question"><h2 className="hv-title">{card.question}</h2><p className="hv-subtitle">{card.reason}</p></div>
 <details><summary>{en?'Why this question?':'为什么问这题？'}</summary><p>{card.hypothesis}</p><p>{raw(card.basis.map(b=>b.quote).join('；'))}</p><p>{card.uncertainty}</p><p>{card.assumptions.join('；')}</p></details>
 {stale&&<p role="alert">{en?'Your answers or home have changed. Ask Chat to refresh this section.':'问卷或房屋已有新修改，请让Chat重新生成本段。'}</p>}
 <div className="hv-options">{card.options.map(option=><VisionOption key={option.id} icon={<Icon size={22} strokeWidth={1.5}/>} selected={answer?.optionId===option.id} disabled={blocked||stale} onClick={()=>put({state:'answered',optionId:option.id})}><strong>{option.title}</strong><small>{option.outcome}</small><small>{option.example}</small><small>{option.tradeoff}</small></VisionOption>)}</div>
 <label>{en?'Your own idea':'自己的想法'}<textarea className="hv-field" disabled={blocked||stale} value={answer?.customText||''} onChange={e=>put({state:'answered',customText:e.target.value})}/></label>
 <div className="hv-controls">{(['unknown','skipped'] as const).map(state=><button className={'hv-ghost '+(answer?.state===state?'on':'')} disabled={blocked||stale} key={state} onClick={()=>put({state})}>{state==='unknown'?(en?'Not sure yet':'暂不确定'):(en?'Skip for now':'暂时跳过')}</button>)}</div>
 <div className="hv-footer"><small>{en?'Submit this section to your Chat agent.':'本段填写完后，一次提交给Chat。'}</small><button className="hv-cta" data-testid="vision-section-next" disabled={blocked||stale||!answer||(answer.state==='answered'&&!answer.optionId&&!answer.customText?.trim())} onClick={()=>index<cards.length-1?setIndex(index+1):void submit()}>{saving?(en?'Submitting…':'正在提交…'):index<cards.length-1?(en?'Continue':'继续'):(en?'Submit':'提交')}</button></div>
 {error&&<p className="hv-error" role="alert">{error}</p>}
 </VisionTemplate>;
}
