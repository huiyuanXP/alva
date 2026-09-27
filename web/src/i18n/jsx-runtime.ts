/** Presentation-only JSX adapter: React owns every node; no DOM mutation/observer. */
import {createElement,useContext,type ReactNode,type ElementType} from 'react';
import {jsx as reactJsx,jsxs as reactJsxs,Fragment} from 'react/jsx-runtime';
import {TranslationEnabled,useLanguage} from './language.js';
import {translate} from '../../../packages/contracts/alva/i18n/locale.js';
export {Fragment};
export type {JSX} from 'react/jsx-runtime';
type Props={tag:string;original:Record<string,any>};
function LocalizedElement({tag,original}:Props){
 const locale=useLanguage(),parentEnabled=useContext(TranslationEnabled),enabled=parentEnabled&&original.translate!=='no';
 const localize=(value:ReactNode):ReactNode=>typeof value==='string'?translate(value,locale):Array.isArray(value)?value.map(localize):value;
 const props={...original};
 if(enabled){for(const attr of ['title','placeholder','aria-label','aria-description','alt','label'])if(typeof props[attr]==='string')props[attr]=translate(props[attr],locale);props.children=localize(props.children)}
 const element=createElement(tag,props);
 return enabled===parentEnabled?element:createElement(TranslationEnabled.Provider,{value:enabled},element);
}
export function jsx(type:ElementType,props:any,key?:string){return typeof type==='string'?reactJsx(LocalizedElement,{tag:type,original:props||{}},key):reactJsx(type,props,key)}
export const jsxs=jsx;
