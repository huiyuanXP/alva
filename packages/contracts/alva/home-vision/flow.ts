import type {VisionChatAnswer} from './chat.js';
import {effectiveValue} from './field-values.js';
import source from './catalogue.json';
export type Option={id:string;label:string;helper?:string;show_if?:string;sets?:string[];tags?:string[];exclusive?:boolean;note_if?:Record<string,string>;label_variants?:Record<string,string>};
export type Item={id:string;type:string;prompt?:string;label?:string;helper?:string;field?:string;show_if?:string;options?:Option[]|string[];fields?:Item[];max?:number;min?:number;other?:boolean;display?:string;prompt_variants?:Record<string,string>;options_from?:string;rooms_from?:string;collapsed?:boolean;expanded_if?:string;units?:string[];milestones?:Option[];prompt_pairs?:string[];accepts?:string[];prefill_from?:string;allow_voice_note?:boolean;display_order_by_market?:Record<string,string[]>};
export type Card={card:string;stage:string;title:string;show_if:string;insert_after?:string;collapsed?:boolean;items:Item[]};
export type Value=string|number|boolean|null|Value[]|{[key:string]:Value};
export type Answer={state:'answered'|'unknown'|'skipped';value:Value};
export type Answers=Record<string,Answer>;
export type Response={chatAnswers?:VisionChatAnswer[];id:string;name:string;answers:Answers;cursor:string;updatedAt:string;version:number};
export type Vision={version:'home-vision-v4';responses:Response[]};
export const cards=source.cards as unknown as Card[];
export const frame=source.stageItem as Item;
export const items=[frame,...cards.flatMap(c=>c.items)];
export const stages=['Getting started','Look & feel','Room by room','What matters to you','The practical bits','Budget','Working together'];
export const raw=(a:Answers,id:string):Value|undefined=>a[id]?.state==='answered'?a[id].value:undefined;
export const values=(v:Value|undefined):string[]=>typeof v==='string'?[v]:Array.isArray(v)?v.filter((x):x is string=>typeof x==='string'):v&&typeof v==='object'&&'choice'in v?values(v.choice):[];
export const picked=(a:Answers,id:string)=>values(raw(a,id));
export function answered(a:Answers,id:string):boolean{const v=raw(a,id);const present=(x:Value|undefined):boolean=>{if(x===undefined||x===null)return false;if(typeof x==='string')return !!x.trim();if(Array.isArray(x))return x.some(present);if(typeof x==='object'){if(typeof x.choice==='string'&&x.choice.endsWith('.other'))return typeof x.text==='string'&&!!x.text.trim();return Object.values(x).some(present)}return true};return present(v)}

export function condition(expr:string|undefined,a:Answers,f:Set<string>,people:Response[]=[]):boolean{
 if(!expr||expr==='always')return true;let s=expr.trim();
 const split=(op:string)=>{let n=0;for(let i=0;i<s.length;i++){if(s[i]==='('||s[i]==='[')n++;if(s[i]===')'||s[i]===']')n--;if(!n&&s.slice(i,i+op.length)===op)return [s.slice(0,i),s.slice(i+op.length)];}return null};
 let parts=split('||');if(parts)return parts.some(x=>condition(x,a,f,people));parts=split('&&');if(parts)return parts.every(x=>condition(x,a,f,people));
 if(s[0]==='!')return !condition(s.slice(1),a,f,people);if(s[0]==='('&&s.at(-1)===')')return condition(s.slice(1,-1),a,f,people);
 let m=s.match(/^selected\(([^)]+)\)$/);if(m){const id=m[1],answer=a[id.split('.')[0]];if(id.endsWith('.not_sure'))return answer?.state==='unknown';if(id.endsWith('.skip'))return answer?.state==='skipped';return picked(a,id.split('.')[0]).includes(id)}
 m=s.match(/^answered\(([^)]+)\)$/);if(m)return answered(a,m[1]);
 m=s.match(/^count_selected\(([^)]+)\)\s*>=\s*(\d+)$/);if(m)return selectedRooms(a,m[1],f).length>=+m[2];
 m=s.match(/^count_tag\(([^)]+)\)\s*>=\s*(\d+)$/);if(m)return items.flatMap(i=>((i.options||[]) as Option[]).filter(o=>o.tags?.includes(m![1])&&picked(a,i.id).includes(o.id)&&condition(i.show_if,a,f)&&condition(o.show_if,a,f))).length>=+m[2];
 m=s.match(/^any_market\(([^)]+)\)$/);if(m)return m[1].split(',').some(x=>f.has(x.trim().startsWith('MARKET_')?x.trim():'MARKET_'+x.trim()));
 m=s.match(/^C3a.type (includes|in) (.+)$/);if(m){const rows=raw(a,'C3a');const wanted=m[2].replace(/[\[\]]/g,'').split(',').map(x=>x.trim());return Array.isArray(rows)&&rows.some(r=>r&&typeof r==='object'&&!Array.isArray(r)&&wanted.includes(String(r['C3a.type'])))}
 m=s.match(/^fixed_date_within_weeks\(([^,]+),\s*(\d+)\)$/);if(m){const rows=raw(a,m[1]);return Array.isArray(rows)&&rows.some(r=>{if(!r||typeof r!=='object'||Array.isArray(r)||r.flexibility!=='fixed')return false;const d=Date.parse(String(r.date))-Date.now();return d>=0&&d<=+m![2]*7*86400000})}
 m=s.match(/^responses_differ\(([^)]+)\)$/);if(m)return m[1].split(',').some(key=>{const id=key.trim(),item=items.find(i=>i.id===id);return new Set(people.filter(p=>answered(p.answers,id)).map(p=>{const value=raw(p.answers,id);return JSON.stringify(item?.type==='multi'&&Array.isArray(value)?[...value].sort():value)})).size>1});
 return f.has(s);
}
export function flags(a:Answers):Set<string>{
 let f=new Set<string>();const country=(raw(a,'Q02a') as Record<string,Value>|undefined)?.country;
 const market=country?({'United States':'US','United Kingdom':'UK',Singapore:'SG',Japan:'JP'}[String(country)]||'OTHER'):'OTHER';
 if(market)f.add('MARKET_'+market);
 for(let pass=0;pass<8;pass++){
  const next=new Set<string>(market?['MARKET_'+market]:[]);
  for(const c of cards)if(condition(c.show_if,a,f))for(const i of c.items)if(condition(i.show_if,a,f)) {
   const selection=picked(a,i.id);
   if(i.id==='Q05a'&&f.has('ONE_ROOM')&&(selection.length!==1||selection.includes('Q05a.whole_home')))continue;
   for(const o of (i.options||[]) as Option[])if(typeof o==='object'&&condition(o.show_if,a,f)&&selection.includes(o.id))for(const flag of o.sets||[])next.add(flag);
  }
  if(!next.has('ONE_ROOM')&&picked(a,'Q05a').includes('Q05a.whole_home')&&(next.has('HAS_CHILDREN')||next.has('BABY_DUE')))next.add('ROOM_KIDS');
  if([...next].sort().join() === [...f].sort().join())return next;f=next;
 }return f;
}
export function selectedRooms(a:Answers,id='Q05a',knownFlags?:Set<string>):string[]{const v=picked(a,id),f=knownFlags||flagsWithoutRooms(a);if(id==='Q05a'&&f.has('ONE_ROOM')&&(v.length!==1||v.includes('Q05a.whole_home')))return [];if(id==='Q05a'&&v.includes('Q05a.whole_home'))return ((items.find(i=>i.id==='Q05a')!.options||[]) as Option[]).filter(o=>o.id!=='Q05a.whole_home'&&condition(o.show_if,a,f)).map(o=>o.id);return v.filter(x=>!x.endsWith('.other'))}
function flagsWithoutRooms(a:Answers){const b={...a};delete b.Q05a;return flags(b)}
export function options(i:Item,a:Answers,f=flags(a)):Option[]{
 let opts=(i.options||[]).map(o=>typeof o==='string'?{id:o,label:o.replaceAll('_',' ')}:o);
 if(i.options_from){const src=items.find(x=>x.id===i.options_from);opts=src?options(src,a,f):[];if(i.id==='Q05b')opts=opts.filter(o=>selectedRooms(a,'Q05a',f).includes(o.id));}
 opts=opts.filter(o=>condition(o.show_if,a,f));
 if(i.id==='Q46a'||i.id==='Q46b'){const other=i.id==='Q46a'?'Q46b':'Q46a';opts=opts.filter(o=>!picked(a,other).includes(other+'.'+o.id.split('.')[1]))}
 const order=Object.entries(i.display_order_by_market||{}).find(([e])=>condition(e,a,f))?.[1];if(order)opts.sort((x,y)=>order.indexOf(x.id.split('.')[1])-order.indexOf(y.id.split('.')[1]));
 return opts.map(o=>({...o,label:Object.entries(o.label_variants||{}).find(([e])=>condition(e,a,f))?.[1]||o.label}));
}
export const prompt=(i:Item,a:Answers,f=flags(a))=>Object.entries(i.prompt_variants||{}).find(([e])=>condition(e,a,f))?.[1]||i.prompt||i.label||i.id;
const roomCards:Record<string,string[]>={entry:['Q12'],living:['Q13','Q14','Q24'],kitchen:['Q15','Q16','Q17','Q14'],dining:['Q17','Q14'],bedroom:['Q18','Q19'],bathroom:['Q20'],office:['Q21'],kids:['Q22','C1'],nursery:['C1'],laundry:['Q23'],guest:['Q24'],outdoor:['Q25']};
export function path(a:Answers):Card[]{const f=flags(a);let list=cards.filter(c=>c.card!=='Q02'&&condition(c.show_if,a,f));if(f.has('ONE_ROOM')){const ids=roomCards[selectedRooms(a,'Q05a',f)[0]?.split('.')[1]]||[];list=list.filter(c=>c.stage!=='S3'||ids.includes(c.card)||['Q26','Q27','Q28'].includes(c.card))}if(f.has('EXPLORING'))list=list.filter(c=>c.stage!=='S5'||c.card==='Q34').filter(c=>c.stage!=='S6'||c.card==='Q43');
 const sorted:Card[]=[];for(const c of list.filter(c=>!c.insert_after)){sorted.push(c);sorted.push(...list.filter(x=>x.insert_after===c.card))}for(const c of list)if(!sorted.includes(c))sorted.push(c);
 const priorityRoom=picked(a,'Q05b')[0];
 const priority=selectedRooms(a,'Q05a',f).includes(priorityRoom)?roomCards[priorityRoom?.split('.')[1]]||[]:[];
 sorted.sort((x,y)=>x.stage.localeCompare(y.stage)||(x.stage==='S3'?Number(priority.includes(y.card))-Number(priority.includes(x.card)):0));
 if(f.has('NEW_HOME')){const at=sorted.findIndex(c=>c.stage==='S3');sorted.splice(at,0,{card:'S3_frame',stage:'S3',title:'Room questions',show_if:'always',items:[frame]})}return sorted;
}
export function activeAnswers(a:Answers):Answers {
 const f=flags(a),out:Answers={};
 for(const c of path(a))for(const i of c.items) {
  if(!condition(i.show_if,a,f)||!a[i.id])continue;
  let answer=a[i.id];
  if(answer.state==='answered') {
   if(i.id==='Q05a'&&f.has('ONE_ROOM')&&selectedRooms(a,'Q05a',f).length!==1)continue;
   let value=answer.value;
   if(['single','multi'].includes(i.type)) {
    const allowed=new Set(options(i,a,f).map(o=>o.id));
    if(i.other!==false)allowed.add(i.id+'.other');
    if(values(value).some(x=>!allowed.has(x))) {
     if(Array.isArray(value))value=value.filter(x=>typeof x==='string'&&allowed.has(x));
     else continue;
    }
   }
   if(i.type==='per_room_single'&&value&&typeof value==='object'&&!Array.isArray(value)) {
    const rooms=new Set(selectedRooms(a,i.rooms_from||'Q05a',f));
    const allowed=new Set(options(i,a,f).map(o=>o.id));
    value=Object.fromEntries(Object.entries(value).filter(([room,level])=>rooms.has(room)&&typeof level==='string'&&allowed.has(level)));
   }
   const active=effectiveValue(i,value,field=>condition(field.show_if,a,f));
   if(active===undefined)continue;
   answer={...answer,value:active};
  }
  out[i.id]=answer;
 }
 return out;
}
export function validation(a:Answers):string[] {
 const errors:string[]=[];
 for(const [id,answer] of Object.entries(a)) {
  const item=items.find(i=>i.id===id);
  if(!item){errors.push('Unknown question');continue}
  if(answer.state!=='answered')continue;
  const value=answer.value;
  if(value===null||value==='')continue;
  if(['single','multi'].includes(item.type)) {
   const selected=values(value);
   const source=item.options_from?items.find(i=>i.id===item.options_from):item;
   // Stored inactive choices remain legal drafts even when upstream answers change.
   const allowed=(source?.options||[]).map(o=>typeof o==='string'?o:o.id);
   const object=value&&typeof value==='object'&&!Array.isArray(value)?value:null;
   if(typeof value!=='string'&&!Array.isArray(value)&&(!object||typeof object.choice!=='string'))errors.push('Invalid selection: '+id);
   if(Array.isArray(value)&&value.some(v=>typeof v!=='string'))errors.push('Invalid selection: '+id);
   if(object&&(object.choice!==id+'.other'||(object.text!==undefined&&typeof object.text!=='string')))errors.push('Invalid other answer: '+id);
   if(new Set(selected).size!==selected.length)errors.push('Duplicate option: '+id);
   if(selected.some(v=>!allowed.includes(v)&&(v!==id+'.other'||item.other===false)))errors.push('Invalid option: '+id);
   const max=item.type==='single'?1:item.max;
   if(max&&selected.length>max)errors.push('Too many options: '+id);
   if(selected.length>1&&(source?.options as Option[]|undefined)?.some(o=>o.exclusive&&selected.includes(o.id)))errors.push('Exclusive option: '+id);
  }
  const numbers=(field:Item,current:Value|undefined):void=>{
   if(current===undefined||current===null||current==='')return;
   if(field.type==='number'&&(typeof current!=='number'||!Number.isFinite(current)||current<0))errors.push('Enter a non-negative number: '+field.id);
   if(current&&typeof current==='object'&&!Array.isArray(current)) {
    if(field.type==='number_unit') {
     if(current.amount!==undefined&&current.amount!==''&&(typeof current.amount!=='number'||current.amount<0))errors.push('Invalid amount: '+field.id);
     if(current.unit!==undefined&&current.unit!==''&&(typeof current.unit!=='string'||!field.units?.includes(current.unit)))errors.push('Invalid unit: '+field.id);
    }
    if(field.type==='currency_range')for(const key of ['comfortable','maximum'])if(current[key]!==undefined&&current[key]!==''&&(typeof current[key]!=='number'||Number(current[key])<0))errors.push('Invalid budget amount');
    if(field.type==='group')for(const child of field.fields||[])numbers(child,current[child.id]);
   }
  };
  numbers(item,value);
 }
 return errors;
}
export function brief(a:Answers){const active=activeAnswers(a);return items.filter(i=>answered(active,i.id)).map(i=>({id:i.id,prompt:prompt(i,a),field:i.field,value:raw(active,i.id)}))}
export function priorities(a:Answers,people:Response[]){const active=activeAnswers(a),f=flags(active);const respondents=people.map(person=>({...person,answers:activeAnswers(person.answers)}));return source.priorityRules.filter(r=>r.id!=='R99'&&condition(r.when,active,f,respondents))}

// Uploaded bytes remain in the project store; model context receives names and references only.
export function consultationVision(v:Vision|undefined){if(!v)return undefined;const trim=(x:Value|undefined):Value=>{if(x===undefined)return null;if(Array.isArray(x))return x.map(trim);if(x&&typeof x==='object')return Object.fromEntries(Object.entries(x).filter(([k])=>k!=='data').map(([k,y])=>[k,trim(y)]));return x};return {version:v.version,responses:v.responses.map(r=>({id:r.id,name:r.name,chatAnswers:r.chatAnswers?.filter(a=>a.status==='active'),answers:brief(r.answers).map(x=>({...x,value:trim(x.value)}))}))}}
