import {randomUUID} from 'node:crypto';
import {writeFileSync,mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {Store} from '../apps/api/store.js';
import {ChatService} from '../apps/api/chat.js';
import {canonical} from '../packages/contracts/canonical.js';
// Synthetic in-memory project only. The configured provider is called normally;
// no production project, credential value or raw provider error is printed.
const directory=process.env.INTAKE_PROBE_OUTPUT;
if(!directory||!resolve(directory).startsWith(resolve('.runtime')+'/'))throw Error('Private .runtime output directory required');
mkdirSync(directory,{recursive:true,mode:0o700});
const store=new Store();await store.init();let passed=false;
try{
 const p=await store.create('owner'),chat=new ChatService(store),request_id=randomUUID();
 const text='我平时会在客厅读书，周末也会招待朋友；将来可能调整房间用途，不想做太多固定柜体。现在想比较家具怎么安排：请先结合这些习惯推荐一个方向，再给我其他几个方向让我选，先不要替我定方案。';
 await chat.start(p.id,'owner',{request_id,expected_version:p.version,room_id:'living',text});await chat.active.get(p.id)?.promise;
 const saved=await store.get(p.id,'owner'),message=saved.messages.find(m=>m.role==='assistant'),questions=(saved.intake_questions??[]).filter(q=>q.run_id===message?.run_id);
 // PostgreSQL JSONB reorders object keys. Compare semantic canonical scenes,
 // preserving values and array order, rather than raw serialization order.
 const checks={completed:message?.status==='complete',structured_question_present:questions.length>0&&questions.length<=2,four_distinct_options:questions.every(q=>q.question.options.length===4&&new Set(q.question.options.map(o=>o.label)).size===4),cited_current_evidence:questions.every(q=>q.question.recommendation.evidence_ids.every(id=>saved.evidence.some(e=>e.id===id&&(e.room_id===null||e.room_id==='living')))),not_owner_confirmed:(saved.intake_answers??[]).every(a=>a.confirmation_state==='pending'),scene_unchanged:canonical(saved.scene)===canonical(p.scene),has_recommended_direction:questions.some(q=>q.question.generation==='agent')};
 passed=Object.values(checks).every(Boolean);const receipt={at:new Date().toISOString(),fixture:'synthetic ordinary-language owner message; no tool names or question IDs in user text',provider:'actual configured provider, not stubbed',checks,passed,assistant:message?{content:message.content,status:message.status,failure_code:message.failure_code}:null,questions,events:(await store.events(p.id,0)).filter(e=>['tool_status','chat_finished','intake_question_rejected','intake_question_formatting'].includes(e.type)).map(e=>({type:e.type,...e.payload}))};
 writeFileSync(resolve(directory,'natural-language-result.json'),JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify({passed,checks,failure_code:message?.failure_code,question_ids:questions.map(q=>q.question.questionnaire_id)},null,2));
}finally{await store.close();}
if(!passed)process.exitCode=1;
