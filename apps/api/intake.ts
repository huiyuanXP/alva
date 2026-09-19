import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { Command, Id, type ProjectData } from '../../packages/contracts/index.js';
import { INTAKE_VERSION, intakeCatalogue, intakeDefinition, type IntakeAnswer, type IntakeDefinition, type IntakeQuestion } from '../../packages/contracts/intake.js';
import { Store, HttpError } from './store.js';
import { applyManual } from './requirements.js';

export function intakeRoom(p:ProjectData,d:IntakeDefinition,room:string):string|null {
  if(!p.rooms.some(r=>r.id===room))throw new HttpError(400,'未知房间');
  return d.scope==='room'?room:null;
}
export function intakeAnswerFor(p:ProjectData,d:IntakeDefinition,room:string):IntakeAnswer|undefined {
  const scope=intakeRoom(p,d,room);
  const answer=p.intake_answers?.find(a=>a.question_id===d.id&&a.room_id===scope);
  const old=d.legacy_field?p.requirements.find(a=>a.field_key===d.legacy_field&&a.room_id===scope):undefined;
  if(old&&(!answer||old.version>answer.version))return {id:old.id,question_id:d.id,room_id:scope,answer_text:old.value===null?'':String(old.value),answer_state:old.answer_state,choice:'legacy',source:old.source==='extracted'?'extracted':'owner',confirmation_state:old.confirmation_state==='pending'?'pending':'confirmed',evidence_ids:old.evidence_ids,version:old.version,updated_at:''};
  return answer;
}
export function intakeEvidence(p:ProjectData,room:string) {
  return p.evidence.filter(e=>(e.room_id===null||e.room_id===room)&&!['agent','media_interpretation'].includes(e.source));
}
const branches:Record<string,RegExp>={Q49:/宝宝|婴儿|婴幼儿|尿布|nursery|baby/i,Q50:/婴儿床|婴幼儿|宝宝.*睡|crib|infant.*sleep/i,Q51:/轮椅|行动不便|无障碍|通行困难|拐杖|accessib|wheelchair/i,Q52:/宠物|猫|狗|pet\b|cat\b|dog\b/i,Q53:/气味|敏感|过敏|刺激|sensitivity|allerg/i,Q54:/定制|柜体|joinery|built.in/i,Q55:/重物|承重|悬挂|悬挑|石材|台面|stone|cantilever/i,Q56:/边住边|住着.*装修|施工.*居住|while living/i,Q58:/视频|youtu|vimeo|bilibili|\.mp4|video/i,Q59:/分歧|不同意|意见不同|不一致|冲突|disagree|conflict/i,Q60:/超预算|超过.*预算|over.budget/i};
export function intakeApplicable(p:ProjectData,d:IntakeDefinition,room:string) {
  if(!d.conditional)return true;
  if(d.id==='Q57')return !!p.attachments?.some(a=>a.room_id===room&&a.mime.startsWith('image/')&&['analyzed','confirmed'].includes(a.status));
  const context=intakeEvidence(p,room).map(e=>e.quote).join('\n')+'\n'+(p.intake_answers??[]).filter(a=>a.room_id===null||a.room_id===room).map(a=>a.answer_text).join('\n');
  return branches[d.id]?.test(context)??false;
}
export function intakeQuestionFor(p:ProjectData,d:IntakeDefinition,room:string):IntakeQuestion {
  const scope=intakeRoom(p,d,room),id=`${scope??'project'}:${d.id}`;
  const active=p.intake_questions?.findLast(q=>q.question.id===id&&q.brief_version===p.brief_version);
  if(active)return {...active.question,base_version:p.version};
  const options=d.choices.map((label,i)=>({id:['A','B','C','D'][i] as 'A'|'B'|'C'|'D',label,value:d.factual?null:label,answer_state:'answered' as const,...(d.factual?{requires_input:true}:{})})) as IntakeQuestion['options'];
  return {id,questionnaire_id:d.id,catalogue_version:INTAKE_VERSION,field_key:d.field_key,room_id:scope,group:d.group,text:d.question,base_version:p.version,generation:'catalogue',why:'用于'+d.delivery_sections.join('、')+'；只填写本项，不代表整套方案或施工批准。',delivery_sections:d.delivery_sections,
    recommendation:{label:options[0].label,rationale:d.factual?'已有资料不足，先补充事实；不替你猜金额、身份、尺寸或权限。':'这是供比较的起点，并非根据你的资料得出的结论。可换选项或自由描述。',basis:'starting_point',evidence_ids:[]},options,
    freeform:{id:'E',label:'都不完全符合，我来描述 / 补充',placeholder:'完整说说你的想法、理由或顾虑；不必用专业术语。'}};
}
export function nextIntakeQuestions(p:ProjectData,room:string,limit=2):IntakeQuestion[] {
  if(!p.rooms.some(r=>r.id===room))throw new HttpError(400,'未知房间');
  const available=intakeCatalogue.filter(d=>intakeApplicable(p,d,room)&&!intakeAnswerFor(p,d,room));
  const latest=p.messages.findLast(m=>m.room_id===room&&m.role==='user')?.content??'';
  const priority=['Q01','Q04','Q18','Q07','Q25','Q19','Q06'];
  const score=(d:IntakeDefinition)=>{
    const proposal=p.intake_questions?.some(q=>q.question.questionnaire_id===d.id&&q.question.room_id===intakeRoom(p,d,room)&&q.brief_version===p.brief_version);
    if(proposal)return 1000;
    if(d.conditional)return 200;
    let result=100-(priority.indexOf(d.id)<0?Number(d.id.slice(1))+20:priority.indexOf(d.id));
    const terms=d.question.match(/[\u4e00-\u9fff]{2}/g)??[];
    result+=terms.filter(term=>latest.includes(term)).length*12;
    return result;
  };
  return available.sort((a,b)=>score(b)-score(a)).slice(0,Math.min(2,limit)).map(d=>intakeQuestionFor(p,d,room));
}

const budget=z.object({target:z.number().min(0).max(1e12).optional(),ceiling:z.number().min(0).max(1e12).optional(),currency:z.string().regex(/^[A-Z]{3}$/).optional()}).strict().refine(b=>b.target===undefined||b.ceiling===undefined||b.target<=b.ceiling,'目标不能超过硬上限');
export const IntakeAnswerCommand=Command.extend({question_id:z.string().regex(/^Q(?:0[1-9]|[1-5][0-9]|60)$/),room_id:Id,choice:z.enum(['A','B','C','D','E','unknown','skipped','not_applicable']),text:z.string().max(4000).default(''),followup_owner:z.string().max(200).optional(),next_action:z.string().max(500).optional(),budget:budget.optional(),sharing:z.object({mode:z.enum(['private','summary','selected']),question_ids:z.array(z.string()).max(60),attachment_ids:z.array(Id).max(60)}).strict().optional()}).strict();
export function saveIntakeAnswer(p:ProjectData,b:z.infer<typeof IntakeAnswerCommand>) {
  const d=intakeDefinition(b.question_id)!;if(!d)throw new HttpError(400,'题目不存在');
  const scope=intakeRoom(p,d,b.room_id),q=intakeQuestionFor(p,d,b.room_id);
  if(b.budget&&d.id!=='Q19'||b.sharing&&d.id!=='Q06')throw new HttpError(400,'结构化内容与题目不匹配');
  if(b.sharing){if(b.sharing.question_ids.some(id=>!intakeDefinition(id))||b.sharing.attachment_ids.some(id=>!p.attachments?.some(a=>a.id===id)))throw new HttpError(400,'共享范围含不存在的题目或附件');if(new Set(b.sharing.question_ids).size!==b.sharing.question_ids.length||new Set(b.sharing.attachment_ids).size!==b.sharing.attachment_ids.length)throw new HttpError(400,'共享范围重复');}
  const state=['unknown','skipped','not_applicable'].includes(b.choice)?b.choice as IntakeAnswer['answer_state']:'answered';
  if(state!=='answered'&&(b.budget||b.sharing))throw new HttpError(400,'未知或跳过时不能隐式保存金额或共享权限');
  const option=q.options.find(o=>o.id===b.choice);
  let text=state==='answered'?(b.choice==='E'||option?.requires_input?b.text.trim():String(option?.value??'')):'';
  if(b.budget&&state==='answered'&&!text)text=[b.budget.target!==undefined?`目标 ${b.budget.target}`:'',b.budget.ceiling!==undefined?`硬上限 ${b.budget.ceiling}`:'',b.budget.currency??'币种待确认'].filter(Boolean).join('；');
  if(b.sharing&&state==='answered'&&!text)text=b.sharing.mode==='private'?'仅本人可见':b.sharing.mode==='summary'?'允许整理后的摘要；不含原话和附件':'仅允许明确勾选的需求与附件';
  if(state==='answered'&&!text)throw new HttpError(400,'请补充事实或自由描述，也可以明确选择暂不确定');
  const evidenceId=randomUUID(),now=new Date().toISOString();
  p.evidence.push({id:evidenceId,room_id:scope,field_key:`intake:${d.id}`,source:'owner_intake',quote:state==='answered'?text:`${d.question}：${state}`,created_at:now});
  const old=p.intake_answers?.find(a=>a.question_id===d.id&&a.room_id===scope);
  const answer:IntakeAnswer={id:old?.id??randomUUID(),question_id:d.id,room_id:scope,answer_text:text,answer_state:state,choice:b.choice,source:'owner',confirmation_state:'confirmed',evidence_ids:[evidenceId],version:p.version+1,updated_at:now,...(b.followup_owner?{followup_owner:b.followup_owner}:{}),...(b.next_action?{next_action:b.next_action}:{}),...(b.budget?{budget:b.budget}:{}),...(b.sharing?{sharing:b.sharing}:{})};
  p.intake_answers=(p.intake_answers??[]).filter(a=>!(a.question_id===d.id&&a.room_id===scope));p.intake_answers.push(answer);
  // Only exact, explicitly documented mappings are synchronized. A whole-home tone,
  // per-room retained inventory or budget range never masquerades as a legacy field.
  if(d.legacy_field&&(d.id!=='Q20'||state!=='answered'||/^[A-Z]{3}$/.test(text))){applyManual(p,{room_id:scope,field_key:d.legacy_field,value:state==='answered'?text:null,answer_state:state});}
  return answer;
}
export function extractIntakeAnswer(p:ProjectData,room:string,messageId:string,b:{question_id:string;quote:string;answer_state:IntakeAnswer['answer_state']},baseVersion:number) {
  const d=intakeDefinition(b.question_id);if(!d)throw new HttpError(400,'题目不存在');
  const scope=intakeRoom(p,d,room),message=p.messages.find(m=>m.id===messageId&&m.role==='user'&&m.room_id===room);
  if(!message||!b.quote.trim()||!message.content.includes(b.quote))throw new HttpError(400,'提取必须逐字引用本房间用户消息，不能把附件或推测当用户确认');
  const current=intakeAnswerFor(p,d,room);
  if(current&&(current.source==='owner'||current.version>baseVersion))throw new HttpError(409,'已有回答被保留，不能用模型提取覆盖');
  if(b.answer_state!=='answered'&&!/不确定|不知道|未知|跳过|不适用|unknown|skip|not applicable/i.test(b.quote))throw new HttpError(400,'未知或跳过状态必须有明确原话');
  const id=randomUUID(),now=new Date().toISOString();p.evidence.push({id,room_id:scope,message_id:messageId,source:'intake_extraction',quote:b.quote,field_key:`intake:${d.id}`,created_at:now});
  const answer:IntakeAnswer={id:current?.id??randomUUID(),question_id:d.id,room_id:scope,answer_text:b.quote,answer_state:b.answer_state,choice:'extracted',source:'extracted',confirmation_state:'pending',evidence_ids:[id],version:p.version+1,updated_at:now};
  p.intake_answers=(p.intake_answers??[]).filter(a=>!(a.question_id===d.id&&a.room_id===scope));p.intake_answers.push(answer);return answer;
}
export const IntakeQuestionProposal=z.object({question_id:z.string(),recommended:z.string().trim().min(2).max(220),alternatives:z.array(z.string().trim().min(2).max(220)).length(3),rationale:z.string().trim().min(2).max(500),evidence_ids:z.array(z.string()).min(1).max(8)}).strict();
export function proposeIntakeQuestion(p:ProjectData,room:string,runId:string,b:z.infer<typeof IntakeQuestionProposal>) {
  const d=intakeDefinition(b.question_id);if(!d||!intakeApplicable(p,d,room))throw new HttpError(400,'题目不存在或条件尚未触发');
  if(intakeAnswerFor(p,d,room))throw new HttpError(409,'这个问题已有回答，不重复追问；可在问卷中主动修正');
  const allowed=intakeEvidence(p,room);if(b.evidence_ids.some(id=>!allowed.some(e=>e.id===id)))throw new HttpError(400,'推荐引用了其他房间或不存在的证据');
  const choices=[b.recommended,...b.alternatives];if(new Set(choices.map(t=>t.replace(/\s/g,'').toLowerCase())).size!==4)throw new HttpError(400,'四个选项必须实质不同');
  const q=intakeQuestionFor({...p,intake_questions:[]},d,room);
  // Structural guard, not just a prompt: never let the model invent factual choices.
  if(!d.factual){q.options=q.options.map((o,i)=>({...o,label:choices[i],value:choices[i]})) as IntakeQuestion['options'];q.recommendation={label:b.recommended,rationale:b.rationale,basis:'evidence',evidence_ids:b.evidence_ids};q.generation='agent';}
  q.base_version=p.version+1;
  const proposal={id:randomUUID(),question:q,brief_version:p.brief_version,run_id:runId};
  p.intake_questions=(p.intake_questions??[]).filter(x=>x.question.id!==q.id).slice(-119);p.intake_questions.push(proposal);return proposal;
}
export function registerIntake(app:FastifyInstance,store:Store) {
  app.get('/api/projects/:id/intake',async req=>{const id=Id.parse((req.params as any).id),room=Id.parse((req.query as any).room_id),p=await store.get(id,(req as any).owner);return {catalogue_version:INTAKE_VERSION,project_version:p.version,next:nextIntakeQuestions(p,room),items:intakeCatalogue.map(d=>({...d,applicable:intakeApplicable(p,d,room),answer:intakeAnswerFor(p,d,room)??null,card:intakeQuestionFor(p,d,room)}))};});
  app.post('/api/projects/:id/intake/answer',async req=>{const id=Id.parse((req.params as any).id),b=IntakeAnswerCommand.parse(req.body);return store.mutate(id,(req as any).owner,b.request_id,b.expected_version,'intake_answered',b,p=>{saveIntakeAnswer(p,b);});});
}
