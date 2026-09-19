import type { ProjectData } from "../../packages/contracts/index.js";
import { withQuestionOptions } from './question-options.js';
export const questionGroups = [
  {
    id: "people",
    name: "居住与决策",
    fields: ["occupants", "decision_makers", "purpose"],
    source: "用户确认的咨询 spec：使用者与空间用途",
    validation: "设计师访谈待验证",
  },
  {
    id: "budget",
    name: "预算与时间",
    fields: ["budget", "currency", "budget_scope", "timeline"],
    source: "咨询 spec：预算不可擅自假定币种或范围",
    validation: "业务规则已实现；访谈待验证",
  },
  {
    id: "space",
    name: "空间与改造",
    fields: [
      "scope",
      "target_width",
      "target_depth",
      "target_height",
      "retained",
    ],
    source: "咨询 spec：目标尺寸与测量事实分离",
    validation: "必须现场测量；未做专业验证",
  },
  {
    id: "experience",
    name: "风格与生活",
    fields: ["tone", "style", "functions"],
    source: "用户要求：推荐先于追问，保留原话",
    validation: "设计师访谈待验证",
  },
  {
    id: "priorities",
    name: "取舍与确认",
    fields: ["priorities"],
    source: "咨询 spec：用户确认不等于施工安全批准",
    validation: "设计师访谈待验证",
  },
];
const wording: Record<string, string> = {
  occupants: "这个家会有哪些人长期居住？",
  decision_makers: "哪些人需要共同确认设计方案？",
  purpose: "这个房间最常用于什么活动？",
  budget: "整体预算目前有范围吗？也可以选择暂不确定。",
  currency: "预算使用什么币种？",
  budget_scope: "这份预算包含施工、家具和家电中的哪些部分？",
  timeline: "希望何时开始、何时可以入住？",
  scope: "这次主要改家具布局，还是也涉及硬装？",
  target_width: "目标宽度是多少米？还没有测量可以标为未知。",
  target_depth: "目标进深是多少米？",
  target_height: "净高是否已经现场测量？",
  retained: "有哪些家具或设备需要保留？",
  tone: "更喜欢偏暖、偏冷还是中性色调？",
  style: "有喜欢的风格或参考图片、视频链接吗？",
  functions: "这个房间希望兼顾哪些功能？",
  priorities: "预算、收纳、活动空间和维护方便中，哪两项最重要？",
};
const roomKeys = new Set([
  "purpose",
  "target_width",
  "target_depth",
  "target_height",
  "tone",
  "functions",
]);
export function nextQuestions(p: ProjectData, roomId: string) {
  const all = questionGroups.flatMap((g) =>
    g.fields.map((field_key) => ({
      id: `${roomKeys.has(field_key) ? roomId : "project"}:${field_key}`,
      field_key,
      room_id: roomKeys.has(field_key) ? roomId : null,
      group: g.id,
      text: wording[field_key],
    })),
  );
  const answered = (key: string, r: string | null) =>
    p.requirements.some((x) => x.field_key === key && x.room_id === r);
  let available = all.filter((q) => !answered(q.field_key, q.room_id));
  // Currency/scope only become the next question after an actual numeric budget, never inferred.
  const budget = p.requirements.find((r) => r.field_key === "budget");
  if (!budget || budget.answer_state !== "answered")
    available = available.filter(
      (q) => !["currency", "budget_scope"].includes(q.field_key),
    );
  return available.slice(0, 2).map(q => withQuestionOptions(p, q));
}
