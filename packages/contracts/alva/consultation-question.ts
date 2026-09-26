/** A model-authored illustration is never a placed or validated design. */
export type OutcomeOption = {
  id: string;
  title: string;
  outcome: string;
  example: string;
  tradeoff: string;
};
export type OutcomeQuestion = {
  id: string;
  questionId: string;
  roomId: string | null;
  question: string;
  reason: string;
  options: OutcomeOption[];
  evidenceIds: string[];
  recommendedOptionId: string | null;
  recommendationReason: string;
  assumptions: string[];
  createdAt: string;
  status: 'awaiting_owner_confirmation';
};
/** Save exactly the selected meaning; an example stays explicitly illustrative. */
export function outcomeAnswer(option: OutcomeOption): string {
  return `${option.title}：${option.outcome}\n示例（仅说明效果，未采用）：${option.example}\n取舍：${option.tradeoff}`;
}
