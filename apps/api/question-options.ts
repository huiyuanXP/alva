import type { ProjectData } from '../../packages/contracts/index.js';
import type { AskOption, AskQuestion } from '../../packages/contracts/ask-question.js';

type Basic = { id:string; field_key:string; room_id:string|null; group:string; text:string };
const option = (id: AskOption['id'], label: string, value: string | null = label, answer_state: AskOption['answer_state'] = 'answered', requires_input = false): AskOption => ({id,label,value,answer_state,...(requires_input?{requires_input:true}:{})});
const choices = (a:string,b:string,c:string,d:string): AskQuestion['options'] => [option('A',a),option('B',b),option('C',c),option('D',d)];
const input = (id:AskOption['id'],label:string) => option(id,label,null,'answered',true);
const unknown = (id:AskOption['id'],label:string) => option(id,label,null,'unknown');

/** Evidence from another room or an unscoped legacy chat is not a basis for this question. */
export function questionEvidence(p: ProjectData, roomId: string | null) {
  const allowedRequirements = p.requirements.filter(r => r.room_id === null || (roomId !== null && r.room_id === roomId));
  const ids = new Set(allowedRequirements.flatMap(r => r.evidence_ids));
  return p.evidence.filter(e => {
    if (e.room_id === null || (roomId !== null && e.room_id === roomId)) return true;
    if (e.room_id !== undefined) return false;
    if (e.message_id) return roomId !== null && p.messages.some(m => m.id === e.message_id && m.room_id === roomId);
    return ids.has(e.id);
  });
}

export function withQuestionOptions(p: ProjectData, q: Basic): AskQuestion {
  let opts: AskQuestion['options'];
  const key = q.field_key;
  if (key === 'occupants') opts = [input('A','先填写已确定的常住成员'),unknown('B','居住安排还在变化'),option('C','暂不披露家庭构成',null,'skipped'),option('D','目前只讨论空房用途',null,'not_applicable')];
  else if (key === 'decision_makers') opts = choices('先由我汇总，再和其他决策人确认','由我独立确认','多人共同确认，稍后补充分工','先咨询，确认人稍后确定');
  else if (key === 'budget') opts = [input('A','填写自己已确定的总预算'),unknown('B','预算未定，先梳理需求'),option('C','暂不披露预算',null,'skipped'),option('D','仅了解概念，暂不设预算',null,'not_applicable')];
  else if (key === 'currency') opts = [input('A','先填写币种，不按地址默认'),option('B','SGD · 新加坡元','SGD'),option('C','CNY · 人民币','CNY'),option('D','USD · 美元','USD')];
  else if (key.startsWith('target_')) opts = [input('A','填写已知尺寸（米），保留待复核标记'),input('B','填写期望尺寸（米），不当作实测值'),unknown('C','尺寸未知，稍后补充'),option('D','暂不指定这个尺寸',null,'skipped')];
  else if (key === 'purpose') opts = choices('保留主要用途，再加入一个辅助功能','优先专注工作或学习','优先休息和放松','优先多人交流和活动');
  else if (key === 'budget_scope') opts = choices('施工、家具和家电均纳入；税费与服务费另核实','只含施工及固定柜体','只含活动家具与软装','先分项记录，包含范围待确认');
  else if (key === 'timeline') opts = choices('先完成需求和测量，再确认排期','已有入住日期，需要倒排计划','可以分阶段完成，不急于一次做完','先了解方案，时间暂未确定');
  else if (key === 'scope') opts = choices('优先尝试布局和家具调整，再评估硬装','仅家具、灯光和软装调整','需要局部硬装，范围待专业核实','考虑整体翻新，先做可行性与预算核实');
  else if (key === 'retained') opts = [input('A','先列出有纪念意义或仍好用的物品'),option('B','现有主要家具尽量保留'),option('C','可以全部重新选择'),unknown('D','需要先整理保留清单')];
  else if (key === 'tone') opts = choices('柔和暖中性色，先用小范围材料样板验证','清爽冷中性色','保留中性背景，增加少量鲜明色彩','深色、对比更强的色调');
  else if (key === 'style') opts = choices('温暖简洁，强调舒适和容易维护','利落现代，强调统一线条','自然混搭，保留有故事的物品','个性鲜明，强调色彩与展示');
  else if (key === 'functions') opts = choices('保留主要活动空间，增加可调整收纳','阅读或居家办公优先','接待与多人活动优先','展示收藏或兴趣活动优先');
  else opts = choices('优先活动空间与实用收纳','优先控制总预算','优先风格一致与视觉效果','优先低维护与后续可调整');

  const relevant = questionEvidence(p,q.room_id);
  const allowed = new Set(relevant.map(e => e.id));
  let evidence_ids: string[] = [];
  let rationale = '目前信息还不足，这是一个可修改的起点，不代表我们已知道你的答案。';
  let basis: AskQuestion['recommendation']['basis'] = 'starting_point';
  const factKeys = new Set(['budget','currency','occupants','target_width','target_depth','target_height']);
  const proposal = !factKeys.has(key) && p.suggestions.findLast(s => s.status === 'proposed' && s.room_id === q.room_id && s.field_key === key && typeof s.value === 'string' && s.evidence_ids.length > 0 && s.evidence_ids.every(id => allowed.has(id)));
  if (proposal) {
    opts[0] = option('A',String(proposal.value)); evidence_ids = proposal.evidence_ids;
    rationale = proposal.rationale; basis = 'evidence';
  } else {
    const purpose = p.requirements.find(r => r.room_id === q.room_id && r.field_key === 'purpose' && r.answer_state === 'answered' && r.confirmation_state !== 'rejected');
    const roomEvidence = relevant.filter(e => q.room_id !== null && (e.room_id === q.room_id || (e.message_id && p.messages.some(m => m.id === e.message_id && m.room_id === q.room_id))));
    const scopedText = [purpose?.value,...roomEvidence.map(e => e.quote)].join(' ');
    const baby = /宝宝房|婴儿房|宝宝照护|婴儿照护|nursery/i.test(scopedText) && !/不(?:是|需要|做|设).{0,4}(?:宝宝|婴儿)|不要.{0,3}(?:宝宝|婴儿)/.test(scopedText);
    if (key === 'functions' && baby) {
      opts = choices('按衣物、尿布、喂养用品和耗材分类收纳，优先可调整模块','保留照护者休息位置，收纳适当精简','兼作客房，使用可移动的收纳模块','留出更多活动区，收纳放到其他房间');
      const hits = roomEvidence.filter(e => /宝宝|婴儿|nursery/i.test(e.quote));
      evidence_ids = [...new Set([...(purpose?.evidence_ids.filter(id => allowed.has(id)) || []),...hits.map(e => e.id)])];
      rationale = '你提到宝宝房或宝宝照护，因此先建议分类且可调整的收纳；四类物品不等于四个柜子。家具固定、材料与使用安全仍需专业核实。';
      basis = evidence_ids.length ? 'evidence' : 'starting_point';
    } else if (key === 'functions' && /阅读|读书/.test(scopedText)) {
      opts[0] = option('A','阅读照明和易取书籍的收纳优先，保留活动通道');
      evidence_ids = [...new Set([...(purpose?.evidence_ids.filter(id => allowed.has(id)) || []),...roomEvidence.filter(e => /阅读|读书/.test(e.quote)).map(e => e.id)])];
      rationale = '已有信息提到阅读，因此建议先处理阅读照明、书籍取放和通行；尚未决定具体尺寸或灯具。';
      basis = evidence_ids.length ? 'evidence' : 'starting_point';
    } else if (factKeys.has(key)) rationale = '这属于需要你提供或核实的事实。资料不足时，我们推荐补充方法，不猜家庭成员、金额、币种或尺寸。';
  }
  // A must not simply duplicate a B/C/D option after an evidence-based proposal replaces it.
  for (let i=1;i<4;i++) if (opts[i].label === opts[0].label) opts[i] = input(opts[i].id,'保留推荐中的一部分，填写具体调整');
  return {...q,base_version:p.version,recommendation:{label:basis==='evidence'?'根据已有信息，建议先考虑':'资料不足，建议从这里开始',rationale,basis,evidence_ids,...(proposal?{suggestion_id:proposal.id}:{})},options:opts,
    freeform:{id:'E',label:'其他：完全按我的想法',placeholder:factKeys.has(key)?'也可以自由说明范围、来源或不确定原因。不能作为单个数值或币种保存的原话，会继续留在聊天中讨论，不强行转换成事实。':'可以完全不同于上面的选项。自由输入将作为这个字段的答案，而不是附加说明。'}};
}

export const recommendationQuestionPolicy = `
提问采用一个待确认推荐 + 三个有实质区别的替代选项 + 始终可见的自由输入。读取 next_questions 的结构化卡片，不在正文再复制四个选项或追加新的问卷。
每次围绕一个决策维度；优先引用本房间或全屋适用的明确原话。说明推荐的简短理由和关键取舍，不声称它已被用户接受。资料不足时明确说这是探索起点，不猜预算、币种、尺寸、居住成员或工程可行性。
若用户新增信息足以改变推荐，先使用现有 propose_field 更新该字段的待确认建议，并引用有效证据。推测不能调用 record_answer。已回答字段不重复询问，冲突单独说明，手填值不可覆盖。
四类收纳不等于四个柜子；宝宝房用途不等于同意特定婴儿床或承认材料安全。安全判断、现场测量和预算批准保持待专业核实。
不预选 A，不使用选择题诱导用户接受更贵的方案；用户可选 B/C/D、完全自定义、暂不确定、跳过或不适用。逐字段确认不等于确认整份方案。
情绪价值来自准确复述用户在意的生活细节、尊重其选择和解释下一步，不来自空洞夸奖或结果保证。`;
