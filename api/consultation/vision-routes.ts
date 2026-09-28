import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import type {AlvaStore,Session} from '../store.js';
import {reject,type Project} from '../model.js';
import {McpError} from '../mcp/contracts.js';
import {items,type Value} from '../../packages/contracts/alva/home-vision/flow.js';
import {outcomeAnswer} from '../../packages/contracts/alva/consultation-question.js';
import {saveVisionResponse} from '../intake/vision-service.js';
import {validateVisionValue,visionError} from './vision-questions.js';
const Confirm=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),id:z.string().uuid(),optionId:z.string().optional(),customText:z.string().trim().min(1).max(2000).optional(),state:z.enum(['answered','unknown','skipped']),confirmed:z.literal(true)}).strict();
export function confirmVisionQuestion(p:Project,b:z.infer<typeof Confirm>){
 const card=p.visionQuestions?.find(c=>c.id===b.id);if(!card)visionError('VISION_CARD_MISSING','题卡不存在，请在本项目重新提问。');
 if(card.status==='confirmed')return;
 if(card.status!=='awaiting_owner_confirmation')visionError('VISION_CARD_EXPIRED','题卡已取消，请重新提问。');
 if(card.topologyVersion!==(p.confirmationVersions?.topology??0)||!p.confirmedBuilding||(card.roomId&&!p.scene?.rooms.some(r=>r.id===card.roomId)))visionError('VISION_SCENE_CHANGED','房屋或房间已变化，请在确认建筑后重新出题。');
 const people=p.homeVision?.responses||[],existing=people.find(r=>r.id===card.respondentId);
 if(!existing&&people.length)visionError('VISION_RESPONDENT_CHANGED','独立问卷新增了填写者，请选择本人并重新出题。','select_respondent');
 if((existing?.version||0)!==card.responseVersion)visionError('VISION_VERSION_CONFLICT','独立问卷已有新修改，旧卡不能覆盖；请重新出题。');
 const r=existing||{id:card.respondentId,name:card.respondentName,answers:{},cursor:'Q01',updatedAt:'',version:0};
 let value:Value=null,text='',synced=true;
 if(b.state==='answered'){
  if((!!b.optionId)===(!!b.customText))visionError('VISION_SELECTION_REQUIRED','请选择一个结果或填写自己的想法，不能同时提交两者。');
  if(b.optionId){const option=card.options.find(o=>o.id===b.optionId);if(!option)visionError('VISION_OPTION_MISSING','所选选项不属于此题卡。');value=option.value;text=outcomeAnswer(option,card.language);validateVisionValue(r,card.questionId,value)}
  else{
   text=b.customText!;const item=items.find(i=>i.id===card.questionId)!;
   if(item.type==='text')value=text;
   else if(['single','multi'].includes(item.type)&&item.other!==false)value={choice:item.id+'.other',text};
   else synced=false;
   if(synced)validateVisionValue(r,card.questionId,value);
  }
 }else{if(b.optionId||b.customText)visionError('VISION_SELECTION_INVALID','跳过或暂不确定时不能同时提交选项。');text=b.state==='unknown'?'暂不确定':'跳过'}
 const answers=synced?{...r.answers,[card.questionId]:{state:b.state,value}}:r.answers;
 const updated=saveVisionResponse(p,{...r,answers,expectedVersion:r.version});
 const prior=new Set(updated.chatAnswers?.filter(a=>a.questionId===card.questionId&&a.status==='active').map(a=>a.evidenceId));
 for(const a of updated.chatAnswers||[])if(a.questionId===card.questionId)a.status='superseded';
 for(const j of p.answerRecommendations||[])if(prior.has(j.evidenceId))j.status='invalidated';
 const evidenceId=randomUUID(),at=new Date().toISOString();
 updated.chatAnswers=[...(updated.chatAnswers||[]),{id:card.id,questionId:card.questionId,roomId:card.roomId,question:card.question,hypothesis:card.hypothesis,text,state:b.state,...(synced?{value}:{}),synced,evidenceId,confirmedAt:at,status:'active'}];
 p.evidence.push({id:evidenceId,quote:`${updated.name}确认的扩展问卷 ${card.questionId}：${text}`,source:'questionnaire',...(card.roomId?{roomId:card.roomId}:{}),createdAt:at});
 if(b.state==='answered')p.answerRecommendations=[...(p.answerRecommendations||[]),{id:randomUUID(),questionId:card.questionId,respondentId:r.id,roomId:card.roomId,evidenceId,status:'pending',createdAt:at}];
 card.status='confirmed';
}
const SectionConfirm=Confirm.omit({id:true,optionId:true,customText:true,state:true}).extend({answers:z.array(Confirm.pick({id:true,optionId:true,customText:true,state:true})).min(1).max(4)});
export function confirmVisionSection(p:Project,b:z.infer<typeof SectionConfirm>){
 const cards=b.answers.map(a=>p.visionQuestions?.find(c=>c.id===a.id));
 if(new Set(b.answers.map(a=>a.id)).size!==b.answers.length||cards.some(c=>!c))visionError('VISION_SECTION_INVALID','本段题目缺失或重复，请重新读取问卷。');
 const first=cards[0]!;
 if(cards.some(c=>c!.respondentId!==first.respondentId||c!.sourceMessageId!==first.sourceMessageId))visionError('VISION_SECTION_MIXED','一段问卷必须属于同一填写者和同一轮。');
 if(cards.every(c=>c!.status==='confirmed')){
  const saved=p.homeVision?.responses.find(r=>r.id===first.respondentId)?.chatAnswers||[];
  const same=b.answers.every((a,i)=>{const c=cards[i]!,prior=saved.find(x=>x.id===a.id&&x.status==='active'),option=c.options.find(o=>o.id===a.optionId);return prior?.state===a.state&&(a.state!=='answered'||prior.text===(a.customText||(option?outcomeAnswer(option,c.language):'')))});
  if(!same)visionError('VISION_SECTION_ALREADY_SUBMITTED','本段已提交，请读取已保存回答，修改时重新生成问卷。');
  return;
 }
 const version=p.homeVision?.responses.find(r=>r.id===first.respondentId)?.version||0;
 if(cards.some(c=>c!.status!=='awaiting_owner_confirmation'||c!.responseVersion!==version))visionError('VISION_VERSION_CONFLICT','本段问卷已变化，请重新读取后提交。');
 // Work on a clone: validation of a later conditional answer cannot partially save a section.
 const draft=structuredClone(p);
 for(const answer of b.answers){
  const card=draft.visionQuestions!.find(c=>c.id===answer.id)!;
  card.responseVersion=draft.homeVision?.responses.find(r=>r.id===card.respondentId)?.version||0;
  confirmVisionQuestion(draft,{...b,...answer});
 }
 Object.assign(p,draft);
}
export function registerVisionChat(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.post('/api/intake/vision/chat/section',async(req,reply)=>{
  try{
   const user=session(req);if(user.role!=='owner')reject('仅业主可以确认问卷',403);
   const b=SectionConfirm.parse(req.body);if((await store.chatState(user.projectId)).active!=='living')visionError('VISION_WRONG_STAGE','请切回生活设计阶段后提交问卷。');
   return await store.mutate(user.projectId,b.requestId,null,'vision-section-confirm',b,p=>confirmVisionSection(p,b));
  }catch(e){if(e instanceof McpError)return reply.code(409).send({error:e.message,detail:e.detail});throw e}
 });
 app.post('/api/intake/vision/chat/confirm',async(req,reply)=>{
  try{
   const user=session(req);if(user.role!=='owner')reject('仅业主可以确认问卷',403);
   const b=Confirm.parse(req.body);if((await store.chatState(user.projectId)).active!=='living')visionError('VISION_WRONG_STAGE','请切回生活设计阶段后确认问卷。');
   return await store.mutate(user.projectId,b.requestId,null,'vision-chat-confirm',b,p=>confirmVisionQuestion(p,b));
  }catch(e){if(e instanceof McpError)return reply.code(409).send({error:e.message,detail:e.detail});throw e}
 });
 app.post('/api/intake/vision/chat/dismiss',async req=>{
  const user=session(req);if(user.role!=='owner')reject('仅业主可以取消题卡',403);
  const b=z.object({requestId:z.string().uuid(),expectedRevision:z.number().int().nonnegative(),id:z.string().uuid()}).strict().parse(req.body);
  return store.mutate(user.projectId,b.requestId,b.expectedRevision,'vision-chat-dismiss',b,p=>{const card=p.visionQuestions?.find(c=>c.id===b.id);if(card?.status==='awaiting_owner_confirmation')card.status='dismissed'});
 });
}
