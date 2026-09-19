import type { FieldValue, Requirement } from './index.js';

export type AskOption = {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  value: FieldValue;
  answer_state: Requirement['answer_state'];
  requires_input?: boolean;
};
export type AskQuestion = {
  id: string; field_key: string; room_id: string | null; group: string; text: string;
  base_version: number;
  recommendation: { label: string; rationale: string; basis: 'evidence' | 'starting_point'; evidence_ids: string[]; suggestion_id?: string };
  options: [AskOption, AskOption, AskOption, AskOption];
  freeform: { id: 'E'; label: string; placeholder: string };
};

/** Convert an explicit selection into exactly one existing form field; never infer a number. */
export function questionAnswer(q: AskQuestion, choice: string, text: string) {
  const option = q.options.find(o => o.id === choice);
  if (choice !== 'E' && !option) throw new Error('请选择一个选项，或填写自己的答案');
  let value: FieldValue = option?.value ?? null;
  const answer_state = choice === 'E' ? 'answered' : option!.answer_state;
  if (choice === 'E' || option?.requires_input) {
    const input = text.trim();
    if (!input) throw new Error('请补充具体答案；不确定时可使用“暂不确定”');
    if (input.length > 2000) throw new Error('本字段最多 2000 字，更多讨论可放入聊天');
    if (q.field_key === 'budget' || q.field_key.startsWith('target_')) {
      // Do not silently convert blanks, ranges, commas or currency-bearing strings into facts.
      if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(input)) throw new Error('请只填写单个数值；预算不含币种，尺寸单位为米。范围可先在聊天说明');
      value = Number(input);
      if (!Number.isFinite(value) || value < 0 || (q.field_key.startsWith('target_') && (value <= 0 || value > 200)) || (q.field_key === 'budget' && value > 1e12)) throw new Error('数值超出此字段范围');
    } else if (q.field_key === 'currency') {
      value = input.toUpperCase();
      if (!/^[A-Z]{3}$/.test(value)) throw new Error('币种请使用三位代码，例如 SGD、CNY、USD');
    } else value = input;
  }
  if (answer_state !== 'answered') value = null;
  if (answer_state === 'answered' && (value === null || value === '')) throw new Error('此答案仍缺少具体值');
  return { room_id: q.room_id, field_key: q.field_key, value, answer_state };
}

/** E stays genuinely free even when its corresponding form field is numeric or a currency code. */
export function needsFreeDiscussion(q: AskQuestion, choice: string, text: string): boolean {
  if (choice !== 'E' || !text.trim() || !['budget','currency','target_width','target_depth','target_height'].includes(q.field_key)) return false;
  try { questionAnswer(q,choice,text); return false; } catch { return true; }
}
