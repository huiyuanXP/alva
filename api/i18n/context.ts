import {AsyncLocalStorage} from 'node:async_hooks';
import {localeOf,translate,type Locale} from '../../packages/contracts/alva/i18n/locale.js';
import type {BusinessTool} from '../codex.js';
const context=new AsyncLocalStorage<Locale>();
export const currentLanguage=()=>context.getStore()||'zh';
export const withLanguage=<T>(language:Locale,run:()=>T)=>context.run(language,run);
export const requestLanguage=(req:{headers:Record<string,unknown>})=>localeOf(req.headers['x-alva-language']);
export const localize=(text:string)=>translate(text,currentLanguage());
export function languagePacks<T extends Record<'floorplan'|'living',BusinessTool[]>>(packs:T,language:Locale):T{
 const info:BusinessTool={name:'get_interface_language',description:'Read the user-selected interface and output language for this turn. Does not change the language or project.',inputSchema:{type:'object',properties:{},additionalProperties:false},run:async()=>({language,outputLanguage:language==='en'?'English':'简体中文'})};
 const wrap=(tools:BusinessTool[])=>[info,...tools].map(tool=>({...tool,run:(args:unknown)=>withLanguage(language,()=>tool.run(args))}));
 return {...packs,floorplan:wrap(packs.floorplan),living:wrap(packs.living)};
}
