import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { FastifyInstance } from 'fastify';
import { Command, Id, fields, type ProjectData } from '../../packages/contracts/index.js';
import { INTAKE_VERSION, intakeCatalogue, intakeDefinition, type IntakeAnswer, type DeliverySnapshot, type DeliverySection } from '../../packages/contracts/intake.js';
import { intakeAnswerFor, intakeApplicable } from './intake.js';
import { Store, HttpError } from './store.js';

const titles:Record<string,string>={D01:'项目摘要',D02:'分房间需求',D03:'偏好与原话依据',D04:'家具、材料与性能意向',D05:'讨论与决策记录',D06:'待决策和下一步',D07:'预算、口径与上限',D08:'实施计划与依赖',D09:'风险及专业复核',D10:'可编辑交付与验证',U01:'我们听见了什么',U02:'全屋功能预期',U03:'一天的生活场景',U04:'细节参考卡',U05:'已经清楚与仍可改变'};
export function allIntakeAnswers(p:ProjectData):IntakeAnswer[] {
  return intakeCatalogue.flatMap(d=>(d.scope==='project'?p.rooms.slice(0,1):p.rooms).flatMap(room=>{const a=intakeAnswerFor(p,d,room.id);return a?[a]:[];}));
}
export function buildDelivery(p:ProjectData,audience:'owner'|'designer'):DeliverySnapshot {
  const all=allIntakeAnswers(p),privacy=all.find(a=>a.question_id==='Q06'&&a.source==='owner'&&a.confirmation_state==='confirmed');
  const policy=privacy?.sharing??{mode:'private' as const,question_ids:[],attachment_ids:[]};
  const allowed=(a:IntakeAnswer)=>audience==='owner'||(policy.mode==='summary'&&!['Q02','Q06','Q07','Q08','Q45','Q51','Q53'].includes(a.question_id))||(policy.mode==='selected'&&policy.question_ids.includes(a.question_id));
  const answers=all.filter(a=>allowed(a)&&(audience==='owner'||policy.mode!=='summary'||a.confirmation_state==='confirmed'));
  const ready=answers.filter(a=>a.answer_state==='answered'&&a.confirmation_state==='confirmed');
  const text=(id:string)=>ready.filter(a=>a.question_id===id).map(a=>a.answer_text);
  const roomName=(id:string|null)=>id===null?'全屋':audience==='designer'?`空间 ${p.rooms.findIndex(r=>r.id===id)+1}`:p.rooms.find(r=>r.id===id)?.name??'未知空间';
  const lines=(ids:string[])=>ready.filter(a=>ids.includes(a.question_id)).map(a=>`${roomName(a.room_id)} · ${intakeDefinition(a.question_id)?.question} ${a.answer_text}`);
  const legacy=audience==='owner'?p.requirements.filter(r=>r.answer_state==='answered').map(r=>`${roomName(r.room_id)} · ${fields[r.field_key as keyof typeof fields]??r.field_key}：${r.value}（${r.confirmation_state==='pending'?'待核对提取':r.source==='accepted'?'用户已采用':'业主填写'}；非专业核实）`):[];
  const visibleAttachments=(p.attachments??[]).filter(a=>audience==='owner'||policy.mode==='selected'&&policy.attachment_ids.includes(a.id));
  const authorizedEvidence=new Set(answers.flatMap(a=>a.evidence_ids));
  const evidence=p.evidence.filter(e=>audience==='owner'||policy.mode==='selected'&&(authorizedEvidence.has(e.id)||!!e.attachment_id&&policy.attachment_ids.includes(e.attachment_id))).map(e=>({id:e.id,quote:e.quote,source:e.source,room_id:e.room_id,attachment_id:e.attachment_id}));
  const rooms=p.rooms.map(room=>({id:room.id,name:roomName(room.id),intent:ready.filter(a=>a.room_id===room.id&&['Q25','Q30','Q31','Q32','Q33','Q34','Q35','Q36','Q38'].includes(a.question_id)).map(a=>a.answer_text)}));
  const pending=intakeCatalogue.flatMap(d=>(d.scope==='project'?p.rooms.slice(0,1):p.rooms).flatMap(room=>{if(!intakeApplicable(p,d,room.id))return [];const a=intakeAnswerFor(p,d,room.id);if(a?.answer_state==='answered'&&a.confirmation_state==='confirmed')return [];if(a?.answer_state==='not_applicable')return [];return [{question_id:d.id,room_id:d.scope==='project'?null:room.id,question:d.question,state:a?.confirmation_state==='pending'?'提取待核对':a?.answer_state??'未收集',owner:audience==='owner'||a&&allowed(a)?a?.followup_owner||'待指定':'待指定',next_action:audience==='owner'||a&&allowed(a)?a?.next_action||'补充资料或明确记录待定原因，不强制立即回答':'请业主确认共享范围'}];}));
  const sections:DeliverySection[]=[];
  const add=(id:string,content:string[],next_action:string,state?:DeliverySection['state'])=>sections.push({id,title:titles[id],state:state??(content.length?'draft':'missing'),content,evidence_ids:[...new Set(ready.filter(a=>intakeDefinition(a.question_id)?.delivery_sections.includes(id)).flatMap(a=>a.evidence_ids))],next_action});
  add('D01',lines(['Q01','Q04','Q07','Q08','Q23']),'确认范围、参与者和时间依赖；不承诺未知工期',['Q01','Q04','Q07','Q08','Q23'].every(id=>text(id).length)?'ready':undefined);
  add('D02',[...rooms.flatMap(r=>r.intent.map(t=>`${r.name}：${t}`)),...lines(['Q26','Q27','Q28','Q29'])],'逐房间补全用途、物品、现状条件与来源');
  add('D03',lines(['Q13','Q14','Q15','Q16','Q17','Q18','Q45']),'逐项检查喜欢、不喜欢、原因与参考出处');
  add('D04',[...lines(['Q29','Q30','Q37','Q38','Q39','Q40','Q41','Q42','Q49','Q54']),...legacy],'核对尺寸来源、设备接口、材质和维护要求');
  add('D05',[...lines(['Q43','Q47','Q59']),...(audience==='owner'?p.suggestions.map(s=>`${s.status==='accepted'?'已采用':s.status==='rejected'?'已否决':'未作为正式值'}：${s.field_key} = ${s.value}；理由：${s.rationale}`):[])],'保留否决理由与分歧；字段确认不等于整套方案确认');
  add('D06',pending.slice(0,12).map(q=>`${q.question_id} · ${q.question} [${q.state}] 负责人：${q.owner}；${q.next_action}`),'先处理影响范围、预算和空间约束的缺口','draft');
  const numeric=ready.find(a=>a.question_id==='Q19')?.budget;
  const oldBudget=audience==='owner'?p.requirements.find(r=>r.field_key==='budget'&&r.answer_state==='answered'):undefined;
  add('D07',[...lines(['Q19','Q20','Q21','Q22','Q60']),...(numeric?[`结构化目标：${numeric.target??'未填'}；硬上限：${numeric.ceiling??'未填'}；币种：${numeric.currency??'请核对Q20'}。仅为用户意向，不是报价。`]:[]),...(oldBudget?[`既有总预算：${oldBudget.value}；硬上限和含税/安装口径须分别确认。`]:[])],'目标、上限、币种和包含范围未齐时，不得标记预算批准');
  add('D08',[...lines(['Q23','Q24','Q56']), '建议阶段1：业主补资料，设计师确认现场测量、权属与不能改变的条件。', '建议阶段2：比较全屋功能和重点房间的两种方向，由明确的决策人确认取舍。', '建议阶段3：设计师深化尺寸、材料、设备接口，施工/供应方提供同口径报价。', '建议阶段4：取得必要专业核实及许可后，再确定采购、施工、验收顺序。以上不是已承诺工期。'],'为每阶段指定负责人、输入依赖和评审点','draft');
  add('D09',[...lines(['Q03','Q26','Q27','Q50','Q51','Q53','Q55']), '尺寸来源与现场实测分开；既有3D模型不能证明墙体性质或结构安全。', '墙体删除、机电、重物连接、防滑、婴幼儿及无障碍条件仍需相应专业人员核实。'],'不得将用户确认或模型意见写成工程认证','draft');
  add('D10',['本交付支持固定版本任务书与问卷的JSON/Markdown。','原生OpenPlan3D重新导入、同版本全屋截图和正式PDF整包验收仍属后续专门交付。'],'完成真实文件生成及重新打开验证后，才能关闭这一项','missing');
  add('U01',[...text('Q01').map(t=>`你希望通过这次咨询得到：${t}`),...text('Q13').map(t=>`希望家带来的感受：${t}`),...text('Q17').map(t=>`对你有特别意义、需要保留的是：${t}`),...text('Q18').map(t=>`方案取舍时先守住：${t}`)],'请指出哪一句准确、哪一句还没有理解对');
  add('U02',rooms.flatMap(r=>r.intent.length?[`${r.name}：${r.intent.join('；')}`]:[`${r.name}：用途尚未确认，不能据此承诺全屋效果`]),'补全房间功能与关键动线，再补真实场景视图','draft');
  add('U03',lines(['Q09','Q10','Q11','Q12','Q24','Q36','Q40']),'将回家、用餐、工作和休息连成实际生活情景');
  add('U04',visibleAttachments.filter(a=>a.mime.startsWith('image/')).map(a=>`${a.name??'参考图'} · ${roomName(a.room_id)} · ${a.status}。${a.analysis_summary??'尚未读取图像内容'}。喜欢与不照搬的细节仍需用户逐图标注。`),'每张图补充喜欢哪里、不复制哪里、来源、取舍和待核实事项');
  add('U05',[...lines(['Q46','Q48']),`已明确 ${ready.length} 项；原话提取待核对 ${answers.filter(a=>a.confirmation_state==='pending').length} 项。暂不确定和跳过不计作已明确。`],'保存认可之处，明确仍可改变的少数决定','draft');
  if(audience==='designer'&&policy.mode==='private')for(const s of sections){s.state='missing';s.content=['尚未授权共享；本页不展示私有需求、原话或附件。'];s.evidence_ids=[];s.next_action='在Q06明确保存共享范围后重新生成';}
  return {id:randomUUID(),audience,project_id:p.id,project_name:audience==='owner'?p.name:'项目需求交接',project_version:p.version,brief_version:p.brief_version,created_at:new Date().toISOString(),catalogue_version:INTAKE_VERSION,sharing_version:privacy?.version??0,sections,answers:audience==='designer'&&policy.mode==='private'?[]:answers,evidence,rooms,pending,references:visibleAttachments.map(a=>({attachment_id:a.id,name:a.name??'用户附件',room_id:a.room_id,status:a.status,note:a.extraction_note??'用户参考资料；不代表偏好已确认'})),limits:['初访任务书，不是施工图、结构鉴定、预算批准或材料安全认证。','AI推测、用户正式值、确认范围与专业核实分开；未采用建议不能充当正式需求。','尚未生成的全屋场景图、细节图、PDF或原生重导入结果不会标为已完成。','摘要不含原始对话及未授权附件，但填写文本仍需本人检查个人信息；不承诺自动脱敏。'],sharing:audience==='owner'?'本人私有视图':policy.mode==='private'?'未授权':policy.mode==='summary'?'仅整理后的摘要；不含原话/附件':'仅明确勾选的需求与附件'};
}
export function deliveryMarkdown(s:DeliverySnapshot) {
  const clean=(s:string)=>s.replace(/\r/g,'');
  return [`# ${s.project_name} — ${s.audience==='owner'?'业主理解与预期':'设计师需求交接'}`,`版本 ${s.project_version} / 任务书 ${s.brief_version} · ${s.created_at}`,`共享范围：${s.sharing}`,...s.sections.flatMap(x=>[`\n## ${x.id} ${x.title} [${x.state==='ready'?'已齐备':x.state==='draft'?'草案':'待补充'}]`,...x.content.map(clean),`下一步：${x.next_action}`]),'\n## 完整问卷记录',...s.answers.map(a=>`${a.question_id} / ${a.room_id??'全屋'} / ${a.answer_state} / ${a.confirmation_state}\n${clean(a.answer_text)}\n来源：${a.evidence_ids.join(', ')}${a.budget?'\n预算结构：'+JSON.stringify(a.budget):''}`),'\n## 待处理清单',...s.pending.map(q=>`${q.question_id} / ${q.room_id??'全屋'} / ${q.state}：${q.question}\n负责人：${q.owner}；下一步：${q.next_action}`),'\n## 证据索引',...s.evidence.map(e=>`${e.id} [${e.source}]\n${clean(e.quote)}`),'\n## 使用边界',...s.limits].join('\n\n');
}
export function registerDelivery(app:FastifyInstance,store:Store) {
  app.get('/api/projects/:id/delivery',async req=>{const p=await store.get(Id.parse((req.params as any).id),(req as any).owner);return buildDelivery(p,z.enum(['owner','designer']).default('owner').parse((req.query as any).audience));});
  app.post('/api/projects/:id/delivery/snapshots',async req=>{const id=Id.parse((req.params as any).id),b=Command.extend({audience:z.enum(['owner','designer'])}).strict().parse(req.body);return store.mutate(id,(req as any).owner,b.request_id,b.expected_version,'delivery_snapshot_created',b,p=>{const s=buildDelivery(p,b.audience);if(b.audience==='designer'&&s.sharing==='未授权')throw new HttpError(409,'请先在Q06保存共享范围；未生成可对外分享的私有副本');(p.delivery_snapshots??=[]).push(s);});});
  app.get('/api/projects/:id/delivery/snapshots/:snapshot',async(req,reply)=>{const p=await store.get(Id.parse((req.params as any).id),(req as any).owner),s=p.delivery_snapshots?.find(s=>s.id===Id.parse((req.params as any).snapshot));if(!s)throw new HttpError(404,'交付快照不存在');if(s.audience==='designer'&&(allIntakeAnswers(p).find(a=>a.question_id==='Q06')?.version??0)!==s.sharing_version)throw new HttpError(409,'共享授权已变化，请按当前授权重新生成，不能导出旧授权副本');const format=z.enum(['json','md']).default('json').parse((req.query as any).format);reply.header('Content-Disposition',`attachment; filename="roomnote-${s.audience}-v${s.brief_version}.${format}"`);return format==='md'?reply.type('text/markdown; charset=utf-8').send(deliveryMarkdown(s)):reply.send({...s,stale:s.brief_version!==p.brief_version});});
}
