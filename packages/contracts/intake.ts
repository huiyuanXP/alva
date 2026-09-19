import type { AskQuestion } from './ask-question.js';
import type { Requirement } from './index.js';

export const INTAKE_VERSION = '2.0.0';
export type IntakeDefinition = {
  id: string; field_key: string; scope: 'project' | 'room'; group: string;
  question: string; choices: [string, string, string, string];
  factual: boolean; conditional: boolean; delivery_sections: string[];
  legacy_field?: string;
};
export type IntakeAnswer = {
  id: string; question_id: string; room_id: string | null; answer_text: string;
  answer_state: Requirement['answer_state']; choice: string;
  source: 'owner' | 'extracted'; confirmation_state: 'confirmed' | 'pending';
  evidence_ids: string[]; version: number; updated_at: string;
  followup_owner?: string; next_action?: string;
  budget?: { target?: number; ceiling?: number; currency?: string };
  sharing?: { mode: 'private' | 'summary' | 'selected'; question_ids: string[]; attachment_ids: string[] };
};
export type IntakeQuestion = AskQuestion & {
  questionnaire_id: string; catalogue_version: string; why: string;
  delivery_sections: string[]; generation: 'catalogue' | 'agent';
};
export type IntakeProposal = {
  id: string; question: IntakeQuestion; brief_version: number; run_id: string;
};
export type DeliverySection = { id: string; title: string; state: 'ready' | 'draft' | 'missing'; content: string[]; evidence_ids: string[]; next_action: string };
export type DeliverySnapshot = {
  id: string; audience: 'owner' | 'designer'; project_id: string; project_name: string;
  project_version: number; brief_version: number; created_at: string; catalogue_version: string;
  sharing_version: number;
  sections: DeliverySection[];
  answers: IntakeAnswer[];
  evidence: { id: string; quote: string; source: string; room_id?: string | null; attachment_id?: string }[];
  rooms: { id: string; name: string; intent: string[] }[];
  pending: { question_id: string; room_id: string | null; question: string; state: string; owner: string; next_action: string }[];
  references: { attachment_id: string; name: string; room_id: string; status: string; note: string }[];
  limits: string[]; sharing: string;
};

// Adapted from the approved 48+12 intake design. Example household, city, price and
// measurements have deliberately NOT been copied into live answer defaults.
type Row = [string, string, 'project' | 'room', string, string, string, string, string, string];
const rows: Row[] = [
 ['Q01','project_goal','project','项目边界','这次咨询结束，你最希望手里多出什么？','先形成可转交设计师的需求任务书','先看整体空间方向','先解决一个重点房间','先梳理预算与取舍'],
 ['Q02','property_context','project','项目边界','房屋在哪个城市、属于什么类型？','填写城市与房型，不需要详细住址','只提供城市','先补充房屋类型','暂不提供房屋信息'],
 ['Q03','tenure_authority','project','项目边界','哪些改动需要房东、共同业主或物业同意？','先列出需核实的权限，不默认已获准','先收集书面同意','仅记录希望申请的改动','先讨论不涉及施工的方向'],
 ['Q04','scope','project','项目边界','这轮先做哪些空间、做到什么程度？','全屋梳理，逐房间确认优先级','先深化一个重点房间','先调整家具与房间用途','列出希望改动的墙体，等待专业核实'],
 ['Q05','plans_media','project','项目边界','现有户型图或现场资料，哪一种最方便提供？','提供现有图纸并注明来源与未核实处','提供现场照片','安排测量后再补','先画房间与门窗草图'],
 ['Q06','privacy_consent','project','项目边界','哪些资料可以共享给设计师？','先逐项审核共享范围，默认仅本人可见','仅共享整理后的需求摘要','选择允许共享的需求和附件','只在本人账户保存'],
 ['Q07','occupants','project','居住与日常','这个家主要由哪些人使用？','填写实际居住成员，不推断年龄或健康','只记录当前居住者','补充长期同住家人','区分常住者与偶尔来访者'],
 ['Q08','decision_makers','project','居住与日常','哪些人共同决定，分歧时怎么确认？','填写参与者与重要选择的确认方式','指定一位最终确认人','按房间分工','重大事项全体确认'],
 ['Q09','weekday_routine','project','居住与日常','工作日回家后，最常发生的一个场景是什么？','优先理顺进门放包与临时物品的位置','先改善回家休息区','先优化换鞋与收纳','先处理餐桌多用途'],
 ['Q10','work_study','project','居住与日常','家里需要怎样的工作或学习空间？','可收线、背景整洁的固定工作位','可收起的临时工作位','独立书房','共享大桌但分时使用'],
 ['Q11','guests','project','居住与日常','亲友来访时，最常需要家里支持什么？','保留偶尔过夜能力，不让客床常占活动区','设置固定客房','只支持聚餐不留宿','客厅灵活改为临时休息区'],
 ['Q12','maintenance','project','居住与日常','你愿意为整理、清洁花多少精力？','封闭收纳为主，减少逐件擦拭的陈列','开放展示为主','开放与封闭各半','先保留现状观察习惯'],
 ['Q13','desired_feeling','project','感受与偏好','用生活感受而不是风格名，你希望家像什么？','温暖、松弛、有日常生活痕迹','利落安静','明亮活泼','有仪式感、适合招待'],
 ['Q14','tone','project','感受与偏好','全屋冷暖和明暗偏好，更接近哪一种？','暖白加浅木色','暖灰加深木','明亮白色加少量彩色','保持中性再看实物样本'],
 ['Q15','style_reference','project','感受与偏好','你喜欢参考图里的哪一部分？','先拆成色调、材质、家具形状逐项确认','主要看布局','主要看灯光与氛围','主要看收纳和整洁程度'],
 ['Q16','dislikes','project','感受与偏好','有没有一看到就不想要的做法？','减少大面积高反光表面和复杂装饰','主要避免镜面','主要避免高饱和色彩','先看局部样板再决定'],
 ['Q17','meaningful_items','project','感受与偏好','有什么必须留在新家，理由不仅是实用？','以纪念物品为设计起点，先核对状况与尺寸','换位置继续使用','局部修复后保留','保留其中有纪念意义的部分'],
 ['Q18','priorities','project','感受与偏好','当预算或空间不够时，哪两件事最不能牺牲？','收纳便利与易维护','活动空间与采光','视觉效果与接待','控制总投入与快速完成'],
 ['Q19','budget','project','预算与时间','你已经考虑过的预算目标与硬上限是什么？','分别填写目标、上限和已知口径，不猜金额','只填写目标数','只填写上限数','先做范围规划再提供金额'],
 ['Q20','currency','project','预算与时间','金额使用哪一种币种？','填写三位币种代码，不根据城市猜测','核对报价所用币种','分别记录不同币种，不直接相加','暂不确定币种'],
 ['Q21','budget_scope','project','预算与时间','这笔预算实际包含哪些费用？','施工、家具、家电合并考虑，另核对税费与服务费','仅施工','施工加固定柜体','仅家具软装与家电'],
 ['Q22','contingency','project','预算与时间','预算里是否留了不可预见事项的余量？','说明预留方式，不自动替你分配金额','填写明确预留金额','按自己确定的比例留存','保留逐项审批，不设固定比例'],
 ['Q23','timeline','project','预算与时间','什么时候需要能入住，哪些日期不能延后？','填写目标日期与尚未确定的依赖','拿钥匙后分阶段完成','先保证基本入住','条件确定后再承诺日期'],
 ['Q24','phasing','project','预算与时间','哪些可以先做，哪些愿意以后再补？','基本起居与收纳先做，装饰和非必要单品后补','所有空间一次完成','先完成一个示范房间','按每阶段预算上限推进'],
 ['Q25','room_purpose','room','现状与物品','这个房间最常做什么，偶尔又会做什么？','以日常活动为主，保留可调整的兼用功能','观影与休闲优先','接待会客优先','工作学习兼用优先'],
 ['Q26','measured_dimensions','room','现状与物品','房间尺寸来自实测、图纸还是估计？','填写尺寸来源、日期与仍需复测的部分','记录已有实测和日期','交给设计师复测','先不填尺寸，只讨论功能'],
 ['Q27','openings_structure','room','现状与物品','门窗、柱梁或管井中，哪些位置已知不能变？','先列出现状约束；墙体可改性待专业核实','上传有标记的户型图','安排现场勘查','只讨论不涉及墙体的摆放'],
 ['Q28','utilities','room','现状与物品','哪些电器和水电位置会影响布局？','收集设备尺寸、插座与网络条件','优先核对厨房设备','优先核对空调与通风','先做设备清单再定位置'],
 ['Q29','retained','room','现状与物品','这个房间保留哪些物品，尺寸依据是什么？','逐件填写物品、尺寸来源和搬运限制','仅保留小件','先比较保留与替换','逐件拍照后决定'],
 ['Q30','storage_inventory','room','现状与物品','哪些东西最占空间，哪些需要随手拿？','先盘点物品容量，不直接决定柜子数量','按每日与每周使用频率分','按每位家人分','先拍现有收纳和外溢物品'],
 ['Q31','living_layout','room','房间使用','客厅中心的位置，更希望留给什么？','减少固定中心家具，优先连续活动区','保留大茶几','使用可移动边几','阅读与会客组合'],
 ['Q32','dining','room','房间使用','餐桌平时与来客时分别需要怎样的容量？','日常紧凑、来客可扩展','固定多人桌','吧台或小圆桌','餐桌兼办公大桌'],
 ['Q33','kitchen','room','房间使用','做饭的频率和最在意的不便是什么？','先评估操作动线与排烟条件，再选开放程度','独立厨房优先','可开合厨房方向','轻食为主、更多社交台面'],
 ['Q34','bedroom','room','房间使用','卧室里最影响放松或入睡体验的是什么？','遮光与床边随手收纳','隔离工作区','增加衣柜','保留更大活动空间'],
 ['Q35','bathroom','room','房间使用','卫生间更需要解决收纳、清洁还是使用不便？','先核查干湿使用和清洁路径，防滑排水待专业设计','扩大收纳','改善照明通风','仅更换可移动小件'],
 ['Q36','laundry_entry','room','房间使用','洗晒与进门的杂物，最常卡在哪一步？','清洁设备停靠位与包裹临时位','鞋包收纳','洗晒流程','减少设备和物品'],
 ['Q37','cabinet_access','room','细节与性能','柜子内部，更在意容量、拿取还是展示？','常用小物采用可分隔、易查看的储物方式','最大容量优先','部分开放展示','减少柜体、精简物品'],
 ['Q38','furniture_flexibility','room','细节与性能','未来变化时，愿意移动或替换哪些家具？','独立可调整家具优先，固定部分只做长期需要','按已明确的长期用途规划','当前照护或工作功能优先','保留多功能空房'],
 ['Q39','materials','room','细节与性能','材料触感、外观、维护与检测资料，最在意什么？','好维护的表面，并索取具体产品资料','真实木质触感','耐磨易清洁','成本优先但保留必要验证'],
 ['Q40','lighting','room','细节与性能','白天、工作时和夜晚，灯光分别要支持什么？','分别规划任务照明与柔和环境照明','简单统一照明','照明分区但不联网','按场景做可调控制'],
 ['Q41','comfort','room','细节与性能','目前最在意的舒适度问题是什么？','先了解日照、通风与习惯，再讨论遮阳和设备','降噪','遮光','温度分区'],
 ['Q42','smart_home','room','细节与性能','智能功能希望做到哪一步？','物理开关可独立使用，智能功能作附加','完全不做智能','仅少量自动化','整屋联动但保留手动控制'],
 ['Q43','option_tradeoff','project','确认与交付','比较方案时，愿意接受哪个代价？','比较留白增加后的收纳缺口','收纳容量优先','开阔感优先','局部柜体加分散收纳'],
 ['Q44','visual_coverage','project','确认与交付','报告里哪些画面最能帮助做决定？','全屋总览，加主要活动视角','收纳内部细节','夜间灯光情景','两个布局的并排比较'],
 ['Q45','designer_handoff','project','确认与交付','交给设计师时，哪些内容希望原话保留？','将原话与具体设计原则并排保留','仅保留标准化需求','敏感原话仅自己可见','逐条审核后共享'],
 ['Q46','open_questions','project','确认与交付','还有哪个决定让你拿不准？','保留为待决策，先说明顾虑','先看不采用该项的方案','先比较兼用方案','交给设计师现场讨论'],
 ['Q47','revision_approval','project','确认与交付','这次确认只覆盖哪部分内容？','说明字段与版本；不自动确认整套方案','仅功能需求','仅色材方向','暂不确认，继续修改'],
 ['Q48','satisfaction','project','确认与交付','这份总结哪里像你，哪里还没有理解对？','保留已认可的部分，具体指出需要调整的地方','整体方向重新讨论','只修改一个房间','先看实际材料再判断'],
 ['Q49','nursery_storage','room','条件分支','宝宝房里哪些用品需要在照护时随手拿？','日常护理、衣物、喂养用品与备品分类，数量另核对','一座组合柜','两个低柜分担','移动收纳搭配现有柜体'],
 ['Q50','nursery_sleep','room','条件分支','婴幼儿睡眠家具已有确定型号或安排吗？','收集实际型号和说明，不推断安全合规','提供已有产品说明','先讨论照护动线','只记录需求暂不排布'],
 ['Q51','accessibility','project','条件分支','哪些动作或通行场景需要更方便？','填写具体动作与辅助器具，不根据年龄猜能力','核对门口通行','核对坐卧转换','邀请使用者一起走查'],
 ['Q52','pets','project','条件分支','宠物的休息、活动和清洁用品如何安排？','便于清洁且不干扰主要活动的候选位置','独立宠物用品区','多处分散设置','改善现有位置'],
 ['Q53','material_sensitivity','room','条件分支','有哪些不舒适的气味或接触体验需要避开？','自愿描述使用感受，不要求诊断或健康资料','只列不想用的材质','提供愿意分享的专业要求','暂不讨论这一项'],
 ['Q54','custom_joinery','room','条件分支','定制柜主要解决什么，哪些尺寸有依据？','先写容量与用途，尺寸及固定方式待设计深化','以成品柜为主','局部定制','测量后再讨论'],
 ['Q55','stone_load','room','条件分支','重台面或悬挂物的重量与支撑资料齐全吗？','填写已有资料，承重结论交专业复核','先换轻量方案比较','提供厂家设计资料','仅保留外观参考'],
 ['Q56','renovation_while_living','project','条件分支','施工或安装期间是否还需要住在家里？','先规划可居住区和分区施工约束，工序待施工方确认','短期临时住宿','先做非居住空间','延后噪声或粉尘较大工作'],
 ['Q57','image_annotation','project','条件分支','参考图里，哪个点喜欢，哪个点不想照搬？','将喜欢的元素和不复制的部分分别标注','只借用灯光','只借用家具比例','整体不参考，换一张'],
 ['Q58','video_reference','project','条件分支','视频中最值得保留的是哪个时间点或动作？','标出时间点并描述动作；未读取前不声称看过','提供关键帧截图','文字描述使用过程','只保存链接待后续解析'],
 ['Q59','conflicting_preferences','room','条件分支','不同使用者的偏好，先按什么方式比较？','保留各自原始选择，比较公共区与私人区分区方案','比较两套完整方向','共同接受的中性底色','邀请双方共同讨论'],
 ['Q60','over_budget','project','条件分支','意向超出预算时，先保住哪些结果？','保留必要功能，延后非必要装饰，再询价确认','减少本期房间范围','替换部分材质或型号','调整明确认可的总预算'],
];
const factual = new Set(['Q02','Q03','Q05','Q06','Q07','Q08','Q19','Q20','Q22','Q23','Q26','Q27','Q28','Q29','Q47','Q50','Q51','Q53','Q55']);
const legacy: Record<string,string> = {Q04:'scope',Q07:'occupants',Q08:'decision_makers',Q18:'priorities',Q20:'currency',Q21:'budget_scope',Q23:'timeline',Q25:'purpose'};
const sections: Record<string,string[]> = {'项目边界':['D01','D07','U01'],'居住与日常':['D02','U03'],'感受与偏好':['D03','U01','U04'],'预算与时间':['D07','D08'],'现状与物品':['D02','D04','D09'],'房间使用':['D02','U02'],'细节与性能':['D04','U04'],'确认与交付':['D05','D06','U05'],'条件分支':['D02','D09','U04']};
export const intakeCatalogue: IntakeDefinition[] = rows.map(([id,field_key,scope,group,question,a,b,c,d])=>({id,field_key,scope,group,question,choices:[a,b,c,d],factual:factual.has(id),conditional:Number(id.slice(1))>48,delivery_sections:sections[group],...(legacy[id]?{legacy_field:legacy[id]}:{})}));
export const intakeDefinition = (id:string) => intakeCatalogue.find(q=>q.id===id);
