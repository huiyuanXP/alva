import React from 'react';
import type {Response} from '../../../packages/contracts/alva/home-vision/flow.js';
export function ChatAnswers({response}:{response:Response}){
 const answers=response.chatAnswers?.filter(a=>a.status==='active')||[];
 if(!answers.length)return null;
 return <details className="hv-chat-answers" data-testid="vision-chat-answers" open><summary>Chat 确认的扩展问答 · {response.name}</summary>
 {answers.map(a=><article key={a.id}><strong>{a.question}</strong><p style={{whiteSpace:'pre-wrap'}}>{a.text}</p><small>{a.synced?'已同步原题答案，可在对应题目继续修改。':'已保存为补充说明；原题需填写有效数值或选项后才能更新。'}</small><details><summary>出题时的猜测（不是确认结论）</summary><p>{a.hypothesis}</p></details></article>)}
 </details>;
}
