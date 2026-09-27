import {localize} from '../i18n/context.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Project} from '../model.js';
import type {BusinessTool} from '../codex.js';
import {McpError} from '../mcp/contracts.js';
import {activeAnswers,brief,flags,condition,path,options,prompt,validation,items,type Response,type Value} from '../../packages/contracts/alva/home-vision/flow.js';
import type {VisionQuestion} from '../../packages/contracts/alva/home-vision/chat.js';

const short=z.string().trim().min(1).max(240);
const ValueSchema=z.union([z.string().max(2000),z.number().finite(),z.array(z.string().max(100)).max(20),z.object({choice:z.string(),text:z.string().max(2000)}).strict()]);
export const VisionQuestionInput=z.object({questionId:z.string(),expectedVersion:z.number().int().nonnegative(),
 hypothesis:short.describe('先猜测用户可能需要什么，使用“可能/我猜”，不能冒充确认事实'),
 basis:z.array(z.object({id:z.string(),quote:short}).strict()).max(6),uncertainty:short.describe('明确还不确定什么，需要通过本题验证'),
 question:short,reason:short,
 options:z.array(z.object({id:z.enum(['A','B','C','D']),title:z.string().trim().min(1).max(50),outcome:short,example:short,tradeoff:short,value:ValueSchema.describe('该结果对应的本题原生答案值；只能使用上下文中可用的选项ID或合法文本/数值，不能编造题号')}).strict()).min(2).max(4),
 assumptions:z.array(short).min(1).max(4),recommendedOptionId:z.enum(['A','B','C','D']).nullable(),recommendationReason:z.string().trim().max(240),
}).strict();
export function visionError(code:string,message:string,action='read_question_context'):never{
 throw new McpError({code,message,retryable:false,repairActions:[{action,message:action==='select_respondent'?'请在Chat“为谁填写”中选择本人，再重试。':'读取最新问卷上下文与填写者版本，再根据原生题号/可见选项修改参数；不要覆盖新回答。'}]});
}
export function chooseRespondent(p:Project,id:string|undefined,draftId:string):Response{
 const people=p.homeVision?.responses||[];
 if(id){const person=people.find(r=>r.id===id);if(!person)visionError('VISION_RESPONDENT_MISSING','所选填写者不存在，请重新选择。','select_respondent');return person}
 if(people.length>1)visionError('VISION_RESPONDENT_REQUIRED','有多位填写者，不能猜测本轮属于谁。','select_respondent');
 return people[0]||{id:draftId,name:localize('我的回答'),answers:{},cursor:'Q01',version:0,updatedAt:''};
}
const supported=new Set(['single','multi','text','number','date']);
export function visibleVisionItems(r:Response){const f=flags(r.answers);return path(r.answers).flatMap(c=>c.items).filter(i=>condition(i.show_if,r.answers,f));}
export function validateVisionValue(r:Response,questionId:string,value:Value){
 const item=visibleVisionItems(r).find(i=>i.id===questionId);
 if(!item)visionError('VISION_QUESTION_HIDDEN','该原生题号不存在或被当前问卷条件隐藏，请先确认前置问题。');
 if(!supported.has(item.type))visionError('VISION_USE_FORM','本题需要附件或复杂表单，请在独立问卷完成后继续Chat；不能凭文字冒充读取附件。','open_questionnaire');
 if(item.type==='single'&&typeof value!=='string'&&!(value&&typeof value==='object'&&!Array.isArray(value)))visionError('VISION_VALUE_INVALID','单选答案必须是选项ID或自填对象。');
 if(item.type==='multi'&&!Array.isArray(value)&&!(value&&typeof value==='object'))visionError('VISION_VALUE_INVALID','多选答案须为选项ID数组或自填对象。');
 if(item.type==='text'&&(typeof value!=='string'||!value.trim()))visionError('VISION_VALUE_INVALID','请填写非空文本。');
 if(item.type==='date'&&(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))))visionError('VISION_VALUE_INVALID','日期须明确填写为YYYY-MM-DD，不能推测用户日期。');
 if(item.type==='number'&&(typeof value!=='number'||!Number.isFinite(value)||value<0))visionError('VISION_VALUE_INVALID','数值必须由用户选择确认，且为非负有限数字。');
 const next={...r.answers,[questionId]:{state:'answered' as const,value}};
 const errors=validation(next);if(errors.length)visionError('VISION_VALUE_INVALID',errors.join('；'));
 const effective=activeAnswers(next)[questionId];
 if(!effective||JSON.stringify(effective.value)!==JSON.stringify(value))visionError('VISION_VALUE_INACTIVE','答案含隐藏、不完整或不可用选项，请按当前上下文重新构建。');
 return item;
}
function basisFor(p:Project,r:Response,sourceMessageId:string){
 const message=p.messages.find(m=>m.id===sourceMessageId&&m.role==='user');
 return [
  ...(message?[{id:`message:${message.id}`,quote:message.text,kind:'本轮原话（需求尚待确认）'}]:[]),
  ...brief(r.answers).filter(a=>supported.has(items.find(i=>i.id===a.id)?.type||'')).map(a=>({id:`answer:${r.id}:${a.id}`,quote:JSON.stringify(a.value),kind:'当前填写者已保存回答'})),
  ...(r.chatAnswers||[]).filter(a=>a.status==='active'&&a.state==='answered').slice(-12).map(a=>({id:`extension:${a.id}`,quote:a.text,kind:'当前填写者已确认扩展回答'})),
 ];
}
export function createVisionQuestionTools(o:{readProject:()=>Promise<Project>;respondentId?:string;sourceMessageId:string;roomId:string|null;queue:(card:VisionQuestion)=>void}):BusinessTool[]{
 const draftId=randomUUID(),asked=new Map<string,VisionQuestion>();
 return [{name:'read_question_context',description:'先读取当前填写者的原生Home Vision题目、选项、已保存回答和本轮原话，再猜测需求并出扩展问题。questionId可省略以列出相关题目，选定后传questionId读取详细选项；不写数据。多人须先由用户在页面选择填写者。',inputSchema:z.toJSONSchema(z.object({questionId:z.string().optional()}).strict()),run:async raw=>{
  const {questionId}=z.object({questionId:z.string().optional()}).strict().parse(raw),p=await o.readProject(),r=chooseRespondent(p,o.respondentId,draftId);
  const visible=visibleVisionItems(r);if(questionId&&!visible.some(i=>i.id===questionId))visionError('VISION_QUESTION_HIDDEN','题号不在当前原生问卷路径中；请省略questionId读取现役题目，不能将旧Q12映射成Q12a。');
  return {respondent:{id:r.id,name:r.name,version:r.version},queuedQuestionIds:[...asked.keys()],remainingSectionCapacity:4-asked.size,sources:basisFor(p,r,o.sourceMessageId),questions:visible.filter(i=>!questionId||i.id===questionId).map(i=>({id:i.id,prompt:prompt(i,r.answers),helper:i.helper,type:i.type,max:i.max,min:i.min,otherAllowed:i.other!==false,options:questionId?options(i,r.answers):undefined,currentAnswer:r.answers[i.id],chatSupported:supported.has(i.type)})),instructions:'先展示有依据且明确未确认的需求猜测，再用有具体结果、示例与取舍的2–4个选项验证；包括能纠正猜测的不同方向，不能只提供赞同猜测的选项。用户确认后才同步独立问卷。'};
 }},{name:'ask_question',description:'基于read_question_context提出“需求猜测→扩展问卷”卡片，每个选项含原生答案value及具体结果/示例/取舍。不会保存答案；确认后回填同一填写者的独立问卷。旧题号不可用。',inputSchema:z.toJSONSchema(VisionQuestionInput),run:async raw=>{
  const parsed=VisionQuestionInput.safeParse(raw);if(!parsed.success)visionError('VISION_QUESTION_INVALID',parsed.error.issues.slice(0,5).map(i=>i.path.join('.')+': '+i.message).join('；'));
  const b=parsed.data,p=await o.readProject(),r=chooseRespondent(p,o.respondentId,draftId);
  if(r.version!==b.expectedVersion)visionError('VISION_VERSION_CONFLICT','独立问卷已更新，请重读后出题。');
  if(asked.has(b.questionId))return {status:'awaiting_owner_confirmation',card:asked.get(b.questionId),notice:'本段已包含这题，不重复排队；请继续尚未排入的题目或结束本轮回复。'};
  if(asked.size>=4)visionError('VISION_TURN_LIMIT','本段已经生成四题，请结束本轮回复，等待用户Submit后再生成下一段。');
  if(o.roomId&&!p.scene?.rooms.some(r=>r.id===o.roomId))visionError('VISION_ROOM_MISSING','当前房间已不存在，请重新选择。');
  const sources=basisFor(p,r,o.sourceMessageId);
  if(b.basis.some(ref=>!sources.some(s=>s.id===ref.id&&s.quote.includes(ref.quote))))visionError('VISION_BASIS_INVALID','猜测依据必须引用此填写者的已保存回答或本轮原话，不能编造或借用他人偏好。');
  if(b.recommendedOptionId&&(!b.basis.length||!b.recommendationReason))visionError('VISION_RECOMMENDATION_UNGROUNDED','推荐须给出本轮可用依据和理由；信息不足时不推荐。');
  if(new Set(b.options.map(x=>x.id)).size!==b.options.length||new Set(b.options.map(x=>JSON.stringify(x.value))).size!==b.options.length)visionError('VISION_DUPLICATE_OPTIONS','请给出不同的结果选项，不要重复同一答案。');
  if(b.recommendedOptionId&&!b.options.some(x=>x.id===b.recommendedOptionId))visionError('VISION_QUESTION_INVALID','推荐必须属于所展示的选项。');
  for(const option of b.options)validateVisionValue(r,b.questionId,option.value);
  const item=items.find(i=>i.id===b.questionId)!;if(b.question===prompt(item,r.answers))visionError('VISION_VERBATIM','请结合需求猜测重构验证问题，不照读原题。');
  const {expectedVersion:_,...content}=b;
  const card:VisionQuestion={...content,id:randomUUID(),respondentId:r.id,respondentName:r.name,responseVersion:r.version,roomId:o.roomId,topologyVersion:p.confirmationVersions?.topology??0,sourceMessageId:o.sourceMessageId,status:'awaiting_owner_confirmation',createdAt:new Date().toISOString(),options:b.options,evidenceIds:b.basis.map(s=>s.id)};
  o.queue(card);asked.set(b.questionId,card);return {status:card.status,card,notice:'待确认题卡已生成，将随成功响应返回；猜测和答案尚未写入独立问卷。'};
 }}];
}
