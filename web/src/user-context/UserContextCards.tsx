import {VisionTemplate} from '../vision/VisionTemplate.js';
import {raw as untranslated} from '../i18n/language.js';
import React from 'react';
import type {UserContextEntry} from '../../../packages/contracts/alva/user-context.js';
const labels={habits:'生活习惯',preferences:'偏好',requirements:'明确需求',unresolved:'未决项'};
export function UserContextCards({entries,disabled,onDecide}:{entries:UserContextEntry[];disabled:boolean;onDecide:(id:string,decision:'confirm'|'reject')=>void}){
 if(!entries.some(c=>c.status==='pending'))return null;
 return <VisionTemplate title="Your Room Vision">{entries.filter(e=>e.status==='pending').map(e=><article key={e.id} className="chat-confirmation"><strong>待确认 · {labels[e.category]}</strong><p>{e.text}</p><blockquote>{untranslated(e.quote)}</blockquote>{e.supersedesId&&<small>确认后将更正原条目。</small>}<button disabled={disabled} onClick={()=>onDecide(e.id,'confirm')}>确认分类</button><button disabled={disabled} onClick={()=>onDecide(e.id,'reject')}>不采用分类</button></article>)}</VisionTemplate>;
}
