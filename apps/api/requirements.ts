import { randomUUID } from "node:crypto";
import type {
  ProjectData,
  Requirement,
  FieldValue,
  Suggestion,
} from "../../packages/contracts/index.js";
import { fields } from "../../packages/contracts/index.js";
import { HttpError } from "./store.js";
export const roomFields = new Set([
  "purpose",
  "target_width",
  "target_depth",
  "target_height",
  "tone",
  "functions",
]);
export function validateField(
  p: ProjectData,
  roomId: string | null,
  key: string,
  value: FieldValue,
  state: Requirement["answer_state"] = "answered",
) {
  if (!Object.hasOwn(fields, key)) throw new HttpError(400, "未知需求字段");
  if (roomFields.has(key) !== (roomId !== null))
    throw new HttpError(400, "房间字段和项目字段的作用范围不一致");
  if (roomId && !p.rooms.some((r) => r.id === roomId))
    throw new HttpError(400, "房间不属于当前项目");
  if (state !== "answered" && value !== null)
    throw new HttpError(400, "未知、跳过或不适用的字段必须保存为 null");
  if (
    state === "answered" &&
    (value === null || (typeof value === "string" && !value.trim()))
  )
    throw new HttpError(400, "请填写值，或明确选择暂不确定");
  if (
    value !== null &&
    key.startsWith("target_") &&
    !(
      typeof value === "number" &&
      Number.isFinite(value) &&
      value > 0 &&
      value <= 200
    )
  )
    throw new HttpError(400, "目标尺寸使用米，必须大于 0 且不超过 200");
  if (
    value !== null &&
    key === "budget" &&
    !(
      typeof value === "number" &&
      Number.isFinite(value) &&
      value >= 0 &&
      value <= 1e12
    )
  )
    throw new HttpError(400, "预算必须为非负数值");
  if (
    value !== null &&
    key === "currency" &&
    !(typeof value === "string" && /^[A-Z]{3}$/.test(value))
  )
    throw new HttpError(400, "币种请使用三位大写代码，例如 SGD");
}
export function applyManual(
  p: ProjectData,
  b: {
    room_id: string | null;
    field_key: string;
    value: FieldValue;
    answer_state: Requirement["answer_state"];
  },
) {
  validateField(p, b.room_id, b.field_key, b.value, b.answer_state);
  const evidence = {
    id: randomUUID(),
    source: "manual_form",
    room_id: b.room_id,
    field_key: b.field_key,
    quote: `${fields[b.field_key as keyof typeof fields]}：${b.answer_state === "answered" ? String(b.value) : b.answer_state}`,
    created_at: new Date().toISOString(),
  };
  p.evidence.push(evidence);
  putRequirement(p, {
    ...b,
    evidence_ids: [evidence.id],
    source: "manual",
    confirmation_state: "provided",
  });
}
function putRequirement(
  p: ProjectData,
  b: {
    room_id: string | null;
    field_key: string;
    value: FieldValue;
    answer_state: Requirement["answer_state"];
    evidence_ids: string[];
    source: Requirement["source"];
    confirmation_state: Requirement["confirmation_state"];
  },
) {
  const index = p.requirements.findIndex(
    (r) => r.room_id === b.room_id && r.field_key === b.field_key,
  );
  const record: Requirement = {
    id: index < 0 ? randomUUID() : p.requirements[index].id,
    ...b,
    professional_status: b.field_key.startsWith("target_")
      ? "pending"
      : "not_required",
    version: p.version + 1,
  };
  if (index < 0) p.requirements.push(record);
  else p.requirements[index] = record;
}
export function addSuggestion(
  p: ProjectData,
  b: {
    room_id: string | null;
    field_key: string;
    value: FieldValue;
    rationale: string;
    evidence_ids: string[];
  },
  baseVersion: number,
): Suggestion {
  validateField(p, b.room_id, b.field_key, b.value);
  if (
    b.evidence_ids.length === 0 ||
    b.evidence_ids.some((id) => !p.evidence.some((e) => e.id === id))
  )
    throw new HttpError(400, "建议必须引用当前项目已有证据");
  const target = p.requirements.find(
    (r) => r.room_id === b.room_id && r.field_key === b.field_key,
  );
  if (target && target.version > baseVersion && target.source !== "extracted")
    throw new HttpError(409, "生成建议期间字段已修改，已丢弃过时建议");
  for (const s of p.suggestions)
    if (
      s.status === "proposed" &&
      s.room_id === b.room_id &&
      s.field_key === b.field_key
    )
      s.status = "superseded";
  const s: Suggestion = {
    ...b,
    id: randomUUID(),
    base_version: Math.max(baseVersion, target?.version || 0),
    status: "proposed",
    scope: [b.field_key],
  };
  p.suggestions.push(s);
  return s;
}
export function adoptSuggestions(p: ProjectData, ids: string[]) {
  if (!ids.length || new Set(ids).size !== ids.length)
    throw new HttpError(400, "采纳范围为空或重复");
  const chosen = ids.map((id) => {
    const s = p.suggestions.find((s) => s.id === id);
    if (!s || s.status !== "proposed")
      throw new HttpError(409, "建议已处理或不存在");
    return s;
  });
  const scope = new Set<string>();
  for (const s of chosen) {
    const key = `${s.room_id}:${s.field_key}`;
    if (scope.has(key)) throw new HttpError(400, "同一字段不能同时采用多个值");
    scope.add(key);
    const current = p.requirements.find(
      (r) => r.room_id === s.room_id && r.field_key === s.field_key,
    );
    if (current && current.version > s.base_version)
      throw new HttpError(
        409,
        "该字段已有更新的手工输入，请重新确认，未覆盖新值",
      );
  }
  for (const s of chosen) {
    putRequirement(p, {
      room_id: s.room_id,
      field_key: s.field_key,
      value: s.value,
      answer_state: "answered",
      evidence_ids: s.evidence_ids,
      source: "accepted",
      confirmation_state: "confirmed",
    });
    s.status = "accepted";
  }
}
export function applyExtracted(
  p: ProjectData,
  b: {
    room_id: string | null;
    field_key: string;
    value: FieldValue;
    answer_state: Requirement["answer_state"];
    quote: string;
    message_id: string;
  },
  baseVersion: number,
) {
  validateField(p, b.room_id, b.field_key, b.value, b.answer_state);
  const message = p.messages.find(
    (m) => m.id === b.message_id && m.role === "user",
  );
  if (
    !message ||
    b.quote.trim().length < 2 ||
    !message.content.includes(b.quote)
  )
    throw new HttpError(400, "提取必须引用用户的逐字原话");
  if (b.room_id !== null && message.room_id !== b.room_id)
    throw new HttpError(400, "不能把其他房间的原话写入此房间");
  if (b.answer_state === "answered" && !b.quote.includes(String(b.value)))
    throw new HttpError(400, "改写或推测的值必须作为建议，不能当作原话提取");
  if (
    b.answer_state === "unknown" &&
    !/不确定|未知|不知道|暂不|还没|unknown|unsure|not sure/i.test(b.quote)
  )
    throw new HttpError(400, "没有明确表达未知状态");
  if (b.answer_state === "skipped" && !/跳过|稍后|以后|skip/i.test(b.quote))
    throw new HttpError(400, "没有明确要求跳过");
  if (
    b.answer_state === "not_applicable" &&
    !/不适用|不需要|not applicable/i.test(b.quote)
  )
    throw new HttpError(400, "没有明确表达不适用");
  const old = p.requirements.find(
    (r) => r.room_id === b.room_id && r.field_key === b.field_key,
  );
  if (old && (old.source !== "extracted" || old.version > baseVersion))
    throw new HttpError(409, "已有业主填写或更新内容，提取不得覆盖");
  const evidence = {
    id: randomUUID(),
    quote: b.quote,
    message_id: b.message_id,
    room_id: b.room_id,
    field_key: b.field_key,
    source: "user_quote",
    created_at: new Date().toISOString(),
  };
  p.evidence.push(evidence);
  putRequirement(p, {
    room_id: b.room_id,
    field_key: b.field_key,
    value: b.value,
    answer_state: b.answer_state,
    evidence_ids: [evidence.id],
    source: "extracted",
    confirmation_state: "pending",
  });
}
