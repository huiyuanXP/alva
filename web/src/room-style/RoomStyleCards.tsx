import {VisionTemplate} from '../vision/VisionTemplate.js';
import React from 'react';
import type {RoomStyleCandidate} from '../../../packages/contracts/alva/room-style.js';
export function RoomStyleCards({candidates,previewId,disabled,onPreview,onDecide}:{candidates:RoomStyleCandidate[];previewId:string;disabled:boolean;onPreview:(id:string)=>void;onDecide:(id:string,decision:'confirm'|'reject')=>void}){
 if(!candidates.some(c=>c.status==='pending'))return null;
 return <VisionTemplate title="Your Room Vision">{candidates.filter(c=>c.status==='pending').map(c=><article className="chat-confirmation" key={c.id} data-style-candidate={c.id}><strong>房间样式 · {c.style.tags.join(' / ')}</strong><p>{c.reason}</p><p>墙面 <span style={{background:c.style.wall.color}}>　</span> {c.style.wall.color} · {c.style.wall.material}<br/>地面 <span style={{background:c.style.floor.color}}>　</span> {c.style.floor.color} · {c.style.floor.material}</p><small>材料为视觉候选，实际产品性能待核实。</small><div><button disabled={disabled} onClick={()=>onPreview(previewId===c.id?'':c.id)}>{previewId===c.id?'退出样式预览':'在画面预览'}</button><button disabled={disabled||previewId!==c.id} onClick={()=>onDecide(c.id,'confirm')}>确认采用样式</button><button disabled={disabled} onClick={()=>onDecide(c.id,'reject')}>不采用</button></div></article>)}</VisionTemplate>;
}
