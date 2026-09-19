import React, {useEffect, useState} from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import {api} from './api.js';

export function ChatIcon({name}: {name: 'plus'|'mic'|'up'|'stop'|'chevron'|'copy'|'close'|'sun'|'moon'|'expand'}) {
  const paths: Record<string, React.ReactNode> = {
    plus: <path d="M12 5v14M5 12h14"/>,
    mic: <><rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></>,
    up: <path d="m6 11 6-6 6 6M12 5v14"/>,
    stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>,
    chevron: <path d="m7 10 5 5 5-5"/>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/></>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1"/></>,
    moon: <path d="M20 14a8 8 0 0 1-10-10 8 8 0 1 0 10 10Z"/>,
    expand: <path d="M14 4h6v6M20 4l-7 7M10 20H4v-6m0 6 7-7"/>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
export type ModelCatalogue = {models: {id:string;is_default:boolean}[];default_id:string|null;notice:string};
let pending:Promise<ModelCatalogue>|null=null;
const loadModels=()=>pending??=api<ModelCatalogue>('/api/chat/models').finally(()=>{pending=null;});
export function ModelPicker({value,onChange,disabled}: {value:string;onChange:(id:string)=>void;disabled:boolean}) {
  const [data,setData]=useState<ModelCatalogue|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  useEffect(()=>{let alive=true;loadModels().then(d=>{if(alive){setData(d);if(!value||!d.models.some(m=>m.id===value))onChange(d.default_id??'');}}).catch(()=>{if(alive)setError('模型列表加载失败，发送时使用服务端默认模型。');}).finally(()=>{if(alive)setLoading(false);});return()=>{alive=false;};},[]);
  return <DropdownMenu.Root><DropdownMenu.Trigger asChild><button type="button" className="model-trigger" aria-label="选择咨询模型" disabled={disabled||loading} title={value||'服务端默认模型'}><span>{loading?'读取模型…':value||'默认模型'}</span><ChatIcon name="chevron"/></button></DropdownMenu.Trigger><DropdownMenu.Portal><DropdownMenu.Content className="paper-menu model-menu" align="end" side="top" sideOffset={10} collisionPadding={12}>
    <DropdownMenu.Label className="menu-eyebrow">本轮咨询模型</DropdownMenu.Label>
    <DropdownMenu.RadioGroup value={value} onValueChange={onChange}>{data?.models.map(m=><DropdownMenu.RadioItem key={m.id} value={m.id} className="paper-menu-item"><span className="model-check"><DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator></span><span>{m.id}</span>{m.is_default&&<small>默认</small>}</DropdownMenu.RadioItem>)}</DropdownMenu.RadioGroup>
    <p className="menu-note">{error||data?.notice}<br/>此选择用于咨询对话；图片识别和语音转写仍使用各自的专用服务。</p>
    <DropdownMenu.Item className="paper-menu-item" onSelect={()=>{setLoading(true);loadModels().then(d=>{setData(d);setError('');if(!d.models.some(m=>m.id===value))onChange(d.default_id??'');}).catch(()=>setError('模型列表加载失败，请稍后重试。')).finally(()=>setLoading(false));}}>重新读取列表</DropdownMenu.Item>
  </DropdownMenu.Content></DropdownMenu.Portal></DropdownMenu.Root>;
}
export function ThemeToggle() {
  const [theme,setTheme]=useState(()=>document.documentElement.dataset.theme??'light');
  return <button type="button" className="theme-toggle" aria-label={theme==='dark'?'切换为浅色':'切换为深色'} onClick={()=>{const next=theme==='dark'?'light':'dark';setTheme(next);document.documentElement.dataset.theme=next;try{localStorage.setItem('roomnote:paper-theme',next);}catch{}}}><ChatIcon name={theme==='dark'?'sun':'moon'}/><span>{theme==='dark'?'浅色':'深色'}</span></button>;
}
