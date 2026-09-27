import messages from './messages.json';
export type Locale='zh'|'en';
export const localeOf=(value:unknown):Locale=>typeof value==='string'&&/^en(?:$|[-_,;])/i.test(value)?'en':'zh';
export const outputLanguageInstruction=(locale:Locale)=>locale==='en'
 ?'Output language: English. Write all user-facing replies, greetings, guidance, question cards, option titles, explanations, proposal text and generated labels in English. This overrides the language of earlier turns and examples. Preserve IDs, enum values, schema keys, quoted user evidence and existing user-authored names. Do not translate or invent saved answers.'
 :'输出语言：简体中文。所有面向用户的回复、开场、引导、问卷题卡、选项标题、解释、方案文案和新增标签均使用简体中文。本轮语言设置优先于历史轮次和示例的语言。保留ID、枚举值、结构字段、引用的用户原话和已有用户命名，不翻译或编造已保存答案。';
const manual=[{zh:'你想为家做些什么？',en:'What brings you here?'},{zh:'已选',en:'selected'},{zh:'请输入有效的 https:// 链接',en:'Enter a valid https:// link'},{zh:'单位',en:'Units'},{zh:'设计师任务书',en:'Designer brief'},{zh:'同版本高清平面图',en:'High-resolution floorplan of this version'},{zh:'业主需求与方案交付 · 同一保存版本 · 待专业核实项独立列出',en:'Owner requirements and design handover · One saved version · Items for professional verification listed separately'},{zh:'中文',en:'Chinese'},{zh:'英文',en:'English'},{zh:'语言',en:'Language'},{zh:'户型导入',en:'Floorplan import'},{zh:'生活设计',en:'Living design'},{zh:'你的理想家',en:'Your Home Vision'},{zh:'语言切换',en:'Switch language'}];
const rows=[...messages,...manual];
const normalize=(s:string)=>s.replace(/\s+/g,' ').trim();
const exact=new Map<string,{zh:string;en:string}>();
for(const row of rows){exact.set(normalize(row.zh),row);exact.set(normalize(row.en),row)}
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const templates=rows.flatMap(row=>(['zh','en'] as const).filter(from=>/\{\d+\}/.test(row[from])).map(from=>{
 const order=[...row[from].matchAll(/\{(\d+)\}/g)].map(m=>m[1]);
 return {from,row,order,pattern:new RegExp('^'+row[from].split(/\{\d+\}/).map(escape).join('([\\s\\S]*?)')+'$')};
})).sort((a,b)=>b.row[b.from].replace(/\{\d+\}/g,'').length-a.row[a.from].replace(/\{\d+\}/g,'').length);
const cache=new Map<string,string>();
/** Translate presentation strings only. Never pass identifiers or user-authored content. */
export function translate(text:string,locale:Locale):string{
 if(locale==='zh'&&text.trim()==='of')return text.replace('of','/');
 const key=locale+'\0'+text,cached=cache.get(key);if(cached!==undefined)return cached;
 const source=normalize(text),row=exact.get(source);let result=row?.[locale];
 if(result===undefined){for(const t of templates){if(t.from===locale)continue;const match=source.match(t.pattern);if(!match)continue;const values=Object.fromEntries(t.order.map((id,i)=>[id,match[i+1]]));result=t.row[locale].replace(/\{(\d+)\}/g,(_,id)=>values[id]??'');break}}
 result??=text;
 if(locale==='en'&&/[：:]$/.test(source)&&/[：:]$/.test(result))result+=' ';
 if(row&&text!==source)result=(text.match(/^\s*/)?.[0]||'')+result+(text.match(/\s*$/)?.[0]||'');
 if(cache.size>12000)cache.clear();cache.set(key,result);return result;
}
