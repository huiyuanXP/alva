import type {Project} from './model.js';
import {catalogue} from './business.js';
import {confirmedReferencePreferencesFromProject} from './references.js';

export type DeliveryAudience='owner'|'designer';
export type DeliverySection=[string,string[]];
const excluded=/预算|报价|费用|金额|budget|price|pricing|cost\b/i;
const clean=(lines:(string|undefined|null)[])=>[...new Set(lines.map(v=>String(v??'').trim()).filter(v=>v&&!excluded.test(v)))];
const fallback=(lines:string[],text:string)=>lines.length?lines:[text];
const roomName=(p:Project,id:string)=>p.scene?.rooms.find(r=>r.id===id)?.name||id;
const evidenceQuotes=(p:Project,ids:string[])=>clean(ids.map(id=>p.evidence.find(e=>e.id===id)?.quote));

function reviewLines(p:Project){
 const review=p.layoutReview,adoption=p.layoutReviewAdoption;
 if(!review||!adoption||adoption.reviewId!==review.id)return {decisions:[] as string[],pending:[] as string[],professional:[] as string[]};
 const decisions=clean(adoption.decisions.map(decision=>{const finding=review.findings.find(f=>f.id===decision.findingId);if(!finding)return `用户取舍 [${decision.findingId}]：${decision.note}；原始依据：未找到对应复核项`;const basis=clean([...(p.userContextEntries||[]).filter(e=>finding.contextEntryIds.includes(e.id)).map(e=>e.quote),...evidenceQuotes(p,finding.evidenceIds)]);return `用户取舍 [${finding.title}]：${decision.note}；状态：${decision.decision==='accept_tradeoff'?'已确认保留该取舍':'继续待处理'}；原始依据：${basis.join('；')||'当前复核没有用户原话依据'}`}));
 const pendingFindings=adoption.pendingFindingIds.map(id=>review.findings.find(f=>f.id===id)).filter((f):f is NonNullable<typeof f>=>!!f);
 const pending=clean(pendingFindings.filter(f=>f.kind!=='professional').map(f=>`复核未决 [${f.title}]：${f.reason}；${f.suggestion}；状态：未决；原始依据：${clean([...(p.userContextEntries||[]).filter(e=>f.contextEntryIds.includes(e.id)).map(e=>e.quote),...evidenceQuotes(p,f.evidenceIds)]).join('；')||'未提供可关闭该项的原始依据'}`));
 const professional=clean(pendingFindings.filter(f=>f.kind==='professional').map(f=>`专业待核实 [${f.title}]：${f.reason}；${f.suggestion}；状态：未决；不能由用户偏好或知悉操作关闭。`));
 return {decisions,pending,professional};
}

function guidanceLines(p:Project){
 const lines:string[]=[];
 for(const message of p.messages.filter(m=>m.role==='assistant'&&m.status==='completed'&&/\[BG\d+ · references\//.test(m.text))){
  const citations=[...message.text.matchAll(/\[(BG\d+ · references\/[^\]\n]+)\]/g)].map(m=>m[1]);
  for(const citation of citations)lines.push(`业务指导来源：${citation}；仅作为咨询依据，具体方案仍需结合当前项目事实与未决项。`);
 }
 return clean(lines);
}

export function deliverySections(p:Project,audience:DeliveryAudience):DeliverySection[]{
 if(!p.scene)throw new Error('交付内容需要已确认场景');
 const enabledAnswers=p.answers.filter(a=>catalogue.find(q=>q.id===a.questionId)?.enabled);
 const answers=clean(enabledAnswers.map(a=>`${a.questionId} ${catalogue.find(q=>q.id===a.questionId)?.question||''}：${a.state==='answered'?a.text:a.state}（${a.confirmed?'业主已确认':'待确认'}${a.locked?'；已锁定':''}）`));
 const requirements=clean([...(p.userContextEntries||[]).filter(e=>e.category==='requirements'&&e.status!=='rejected').map(e=>`需求：${e.text}；原话：“${e.quote}”${e.roomIds.length?`；房间：${e.roomIds.map(id=>roomName(p,id)).join('、')}`:''}`),...enabledAnswers.filter(a=>a.state==='answered'&&a.confirmed).map(a=>`确认需求：${a.text}${a.roomId?`；房间：${roomName(p,a.roomId)}`:'；全屋'}`)]);
 const preferences=clean([...(p.userContextEntries||[]).filter(e=>e.category==='preferences'&&e.status!=='rejected').map(e=>`偏好：${e.text}；原话：“${e.quote}”`),...confirmedReferencePreferencesFromProject(p).map(pref=>`参考图偏好·仅参考：${pref.title}；来源：${pref.evidence.map(e=>e.quote).join('；')}；不得作为尺寸、结构或材料性能证据；也不能据此确认真实材料身份`)]);
 const raw=clean(p.evidence.filter(e=>e.source==='chat'||e.source==='questionnaire').map(e=>`[${e.id}] ${e.quote}`));
 const rooms=clean(p.scene.rooms.map(r=>{const merge=p.roomMergeHistory?.findLast(m=>m.mergedRoomId===r.id);const roomReq=requirements.filter(line=>line.includes(`房间：${r.name}`));return `${r.name}：用途 ${r.purpose||'待确认'}；${r.locked?'已锁定':'可调整'}${merge?`；合并来源：${merge.sourceRoomNames.join(' + ')}`:''}${roomReq.length?`；关联需求 ${roomReq.length} 项`:''}`}));
 const items=clean(p.scene.items.map(i=>`${i.name} [${i.id}]：房间 ${roomName(p,i.roomId)}；${i.width}×${i.depth}×${i.height}m；材质标签 ${i.material}；颜色 ${i.color}；${i.locked?'已锁定':'可调整'}；参数用于方案预览，不替代厂家资料${i.referenceSource?`；参考家具来源 batch ${i.referenceSource.batchId}；资产 ${i.referenceSource.assetId}；许可 ${i.referenceSource.license}；尺寸依据=许可资产目录默认值，未实测；参考图几何不可靠`:''}`));
 const styles=clean(Object.entries(p.roomStyles||{}).map(([id,s])=>`房间样式 ${roomName(p,id)}：墙面 ${s.wall.material} ${s.wall.color}；地面 ${s.floor.material} ${s.floor.color}；标签 ${s.tags.join('、')}；视觉标记不等同材料性能结论`));
 const pain=clean(p.findings.filter(f=>f.stage==='intake'&&f.kind!=='professional').map(f=>`痛点/需求提示 [${f.title}]：${f.reason}；建议：${f.suggestion}；状态：${f.status==='acknowledged'?'已知悉，不代表问题已解决':'待确认'}；依据：${evidenceQuotes(p,f.evidenceIds).join('；')||'当前记录未附独立原话'}`));
 const professionalDirect=clean(p.findings.filter(f=>f.kind==='professional').map(f=>`专业待核实 [${f.title}]：${f.reason}；${f.suggestion}；状态：未决`));
 const review=reviewLines(p);
 const proposalDecisions=clean(p.proposals.map(v=>`方案 [${v.title}]：${v.status}；理由：${v.rationale}；依据：${evidenceQuotes(p,v.evidenceIds).join('；')||'当前记录未附独立原话'}`));
 const changes=clean(p.changes.map(c=>`变更记录：${c.description}；依据：${evidenceQuotes(p,c.evidenceIds).join('；')||clean(c.context).join('；')||'无独立依据'}`));
 const mergeDecisions=clean((p.roomMergeHistory||[]).map(m=>`空间合并：${m.sourceRoomNames.join(' + ')} → ${m.name} [${m.mergedRoomId}]；来源房间ID：${m.sourceRoomIds.join('、')}`));
 const decisions=clean([...proposalDecisions,...review.decisions,...mergeDecisions]);
 const unanswered=clean(catalogue.filter(q=>q.enabled).flatMap(q=>q.scope==='project'?(!p.answers.some(a=>a.questionId===q.id&&a.roomId===null)?[`${q.id} ${q.question}：全屋未回答`]:[]):p.scene!.rooms.filter(r=>!p.answers.some(a=>a.questionId===q.id&&a.roomId===r.id)).map(r=>`${q.id} ${q.question}：${r.name} 未回答`)));
 const unresolvedContext=clean((p.userContextEntries||[]).filter(e=>e.category==='unresolved'&&e.status!=='rejected').map(e=>`未决：${e.text}；原话：“${e.quote}”`));
 const professional=clean([...professionalDirect,...review.professional]);
 const pending=clean([...unanswered,...unresolvedContext,...review.pending]);
 const guidance=guidanceLines(p);
 const next=clean(['现场核对：责任人待指定；输入为原图、现场尺寸及设备资料，输出为带来源的核对记录。','方案深化：设计师待指定；依赖已确认需求与专业核实，输出为可比较的设计候选。','产品与材料核对：责任人待指定；依赖产品数据与样品资料，输出为可追溯的选择记录。']);
 const boundaries=clean(['本交付用于需求梳理、方案沟通、证据追溯与后续协作，不是施工图、BIM模型或工程批准文件。','现场尺寸、结构安全、材料性能、机电条件及产品适用性必须以带来源资料或相应专业核实为准。','参考图只表达经确认的视觉偏好，不证明尺寸、结构、真实材料身份或性能。']);
 const provenance=`保存版本 v${p.savedVersion}；项目 revision ${p.revision}；场景房间 ${p.scene.rooms.length} 个；家具 ${p.scene.items.length} 件。`;
 const licenses=clean([...new Set(p.assets.map(a=>a.license))].map(x=>`资产许可：${x}`));
 if(audience==='designer')return [
  ['D01 项目摘要',fallback(clean([p.name,provenance,...requirements.slice(0,12),...preferences.slice(0,8)]),'当前保存版本未记录项目摘要。')],
  ['D02 现状、尺寸与依据',fallback(clean([`校准依据：${p.scene.calibration?.source||'待确认'}；未被来源支持的尺寸仍需核对。`,...(p.confirmedTopology?.assumptions||[]).map(a=>`拓扑假设：${a}`),...raw.slice(0,12)]),'当前保存版本没有可交付的现场依据。')],
  ['D03 房间任务书',fallback(clean([...rooms,...requirements]),'当前保存版本没有房间任务书。')],
  ['D04 家具、设备与材料',fallback(clean([...items,...styles,...preferences]),'当前保存版本没有家具、设备或材料记录。')],
  ['D05 用户原话与证据',fallback(clean([...raw,...preferences]),'当前保存版本没有可交付的用户原话或参考偏好证据。')],
  ['D06 方案决策与取舍',fallback(clean([...decisions,...pain,...changes]),'当前保存版本没有已记录的方案决策或修订。')],
  ['D07 范围边界与声明',boundaries],
  ['D08 实现计划与业务指导',fallback(clean([...next,...guidance]),'当前保存版本没有实施计划或已使用的业务指导记录。')],
  ['D09 待核实与风险',fallback(clean([...professional,...pending]),'当前保存版本没有未决或专业待核实项。')],
  ['D10 交接、版本与权限',clean([provenance,'交付包包含可编辑设计师任务书、业主说明、高清平面图、全屋/房间场景图、scene.json、sidecar.json 与 manifest.json。','设计师访问为只读；变更仍需回到业主工作流确认。',...licenses,...boundaries.slice(0,1)])],
 ];
 const recorded=clean([...requirements,...preferences,...decisions]);
 return [
  ['U01 我们听到的你',fallback(clean([...raw.slice(0,12),...requirements,...preferences]),'当前保存版本还没有足够的原话与偏好记录。')],
  ['U02 全屋功能与空间角色',fallback(clean([...rooms,...preferences]),'当前保存版本还没有完整的全屋空间角色记录。')],
  ['U03 生活场景与痛点',fallback(clean([...pain,...answers]),'当前保存版本还没有明确的生活场景或痛点记录。')],
  ['U04 细节、偏好与取舍',fallback(clean([...items,...styles,...preferences,...decisions]),'当前保存版本还没有明确的细节或取舍记录。')],
  ['U05 已确认、待核实与下一步',clean([`当前已有 ${recorded.length} 条可追溯需求、偏好或决策记录；保存版本 v${p.savedVersion}。`,...recorded.map(x=>`已记录：${x}`),...professional.map(x=>`仍需专业核实：${x}`),...pending.map(x=>`仍待处理：${x}`),...next.map(x=>`下一步：${x}`),...boundaries])],
 ];
}

export function financialContentExcluded(value:unknown){return !excluded.test(typeof value==='string'?value:JSON.stringify(value));}
