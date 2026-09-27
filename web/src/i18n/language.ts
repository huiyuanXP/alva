import {createContext,createElement,useEffect,useSyncExternalStore,type ReactNode} from 'react';
import {localeOf,translate,type Locale} from '../../../packages/contracts/alva/i18n/locale.js';
export type {Locale};
const storageKey='alva-language';
let current:Locale='zh';try{current=localeOf(localStorage.getItem(storageKey))}catch{}
const listeners=new Set<()=>void>();
export const getLanguage=()=>current;
export const subscribeLanguage=(fn:()=>void)=>{listeners.add(fn);return()=>{listeners.delete(fn)}};
export function setLanguage(value:Locale){if(value===current)return;current=value;try{localStorage.setItem(storageKey,value)}catch{}listeners.forEach(fn=>fn())}
if(typeof window!=='undefined')window.addEventListener('storage',e=>{if(e.key===storageKey){current=localeOf(e.newValue);listeners.forEach(fn=>fn())}});
export const useLanguage=()=>useSyncExternalStore(subscribeLanguage,getLanguage,()=> 'zh' as Locale);
export const t=(text:string)=>translate(text,current);
export const TranslationEnabled=createContext(true);
export function RawText({children}:{children?:ReactNode}){return createElement(TranslationEnabled.Provider,{value:false},children)}
export const raw=(children:ReactNode)=>createElement(RawText,null,children);
export function LanguageSwitch({disabled=false}:{disabled?:boolean}){
 const locale=useLanguage();
 useEffect(()=>{document.documentElement.lang=locale==='en'?'en':'zh-CN';document.title=locale==='en'?'alva · Make room for your life':'alva · 一起想清楚家的样子'},[locale]);
 return createElement('label',{className:'language-switch'},createElement('span',null,locale==='en'?'Language':'语言'),createElement('select',{'aria-label':locale==='en'?'Language':'语言',value:locale,disabled,onChange:(e:{target:{value:string}})=>setLanguage(localeOf(e.target.value))},createElement('option',{value:'zh'},'中文'),createElement('option',{value:'en'},'English')));
}
