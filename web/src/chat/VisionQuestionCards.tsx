import React from 'react';
import type {Project} from '../../../api/model.js';
import {OutcomeQuestionCard} from './OutcomeQuestionCard.js';
export function VisionQuestionCards({project,disabled,mutate}:{project:Project;disabled:boolean;mutate:(path:string,body:Record<string,unknown>)=>Promise<unknown>}){
 return <>{project.visionQuestions?.filter(c=>c.status==='awaiting_owner_confirmation').map(card=>{
 const stale=(project.homeVision?.responses.find(r=>r.id===card.respondentId)?.version||0)!==card.responseVersion||card.topologyVersion!==(project.confirmationVersions?.topology??0);
 return <article key={card.id} data-testid="vision-chat-question">
  <small>为 {card.respondentName} 填写 · 确认后同步 Your Home Vision</small>
  <h3>先猜你的需求 · 尚未确认</h3><p>{card.hypothesis}</p><p>依据：{card.basis.length?card.basis.map(b=>b.quote).join('；'):'信息不足，目前只是待验证的猜测'}</p><p>还需确认：{card.uncertainty}</p>
  {stale&&<p role="alert">问卷或房屋已有新修改。这张卡不能覆盖新答案，请让 Chat 重新出题。</p>}
  <OutcomeQuestionCard card={{...card,status:'awaiting_owner_confirmation'}} allowNotApplicable={false} disabled={disabled||stale} onConfirm={(text,state,optionId)=>mutate('/intake/vision/chat/confirm',{id:card.id,state,confirmed:true,...(state==='answered'?(optionId?{optionId}:{customText:text}):{})})}/>
  <button disabled={disabled} onClick={()=>void mutate('/intake/vision/chat/dismiss',{id:card.id}).catch(()=>{})}>暂不回答，收起这题</button>
 </article>})}</>;
}
