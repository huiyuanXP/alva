import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { Store } from "../apps/api/store.js";
import { ChatService } from "../apps/api/chat.js";
import { applyManual, adoptSuggestions } from "../apps/api/requirements.js";
import { buildReview } from "../apps/api/review.js";
const receipt: Record<string, unknown> = {
  at: new Date().toISOString(),
  synthetic_fixture: true,
  real_provider: true,
  designer_interview_conducted: false,
};
const store = new Store();
await store.init();
try {
  let p = await store.create("walkthrough");
  p = await store.mutate(
    p.id,
    "walkthrough",
    randomUUID(),
    p.version,
    "requirements_changed",
    {},
    (p) =>
      applyManual(p, {
        room_id: null,
        field_key: "budget",
        value: null,
        answer_state: "unknown",
      }),
  );
  const chat = new ChatService(store);
  await chat.start(p.id, "walkthrough", {
    room_id: "living",
    request_id: randomUUID(),
    expected_version: p.version,
    text: "这是合成验收案例。客厅是一家三口的活动空间，我们准备迎接宝宝，希望兼顾阅读和衣物、尿布收纳。预算暂不确定。请基于这条原话，调用 propose_field 对当前客厅的 functions 字段提出一项具体建议，供我决定是否采用；不要替我确认预算。",
  });
  await chat.active.get(p.id)?.promise;
  p = await store.get(p.id, "walkthrough");
  receipt.chat_status = p.messages.at(-1)?.status;
  receipt.stream_events = (await store.events(p.id, 0)).filter(
    (e) => e.type === "message_progress",
  ).length;
  receipt.proposals = p.suggestions.length;
  receipt.proposal_fields = p.suggestions.map((s) => s.field_key);
  receipt.no_implicit_adoption = !p.requirements.some(
    (r) => r.field_key === "functions",
  );
  const suggestion = p.suggestions.find(
    (s) => s.field_key === "functions" && s.status === "proposed",
  );
  if (suggestion) {
    p = await store.mutate(
      p.id,
      "walkthrough",
      randomUUID(),
      p.version,
      "suggestions_adopted",
      { ids: [suggestion.id] },
      (p) => adoptSuggestions(p, [suggestion.id]),
    );
    receipt.explicit_adoption =
      p.requirements.find((r) => r.field_key === "functions")
        ?.confirmation_state === "confirmed";
  }
  const review = await buildReview(structuredClone(p), true);
  receipt.review_status = review.model_status;
  receipt.review_findings = review.findings;
  receipt.original_evidence_count = review.evidence_snapshot.length;
  receipt.unknown_budget_preserved =
    p.requirements.find((r) => r.field_key === "budget")?.value === null &&
    !p.requirements.some((r) => r.field_key === "currency");
  receipt.passed =
    receipt.chat_status === "complete" &&
    Number(receipt.stream_events) > 0 &&
    receipt.no_implicit_adoption === true &&
    receipt.explicit_adoption === true &&
    review.model_status === "独立 Pi 审查完成" &&
    receipt.unknown_budget_preserved === true;
} catch {
  receipt.passed = false;
  receipt.error =
    "Walkthrough failed; no credentials or real customer data are included in this report.";
} finally {
  await store.close();
}
writeFileSync(
  "docs/evidence/week1/walkthrough.json",
  JSON.stringify(receipt, null, 2),
);
console.log(JSON.stringify(receipt, null, 2));
if (!receipt.passed) process.exitCode = 1;
