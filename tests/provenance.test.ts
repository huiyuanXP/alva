import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { applyManual, applyExtracted } from "../apps/api/requirements.js";
import { nextQuestions } from "../apps/api/questions.js";
import { sampleProject } from "../apps/api/sample.js";
import { canonical } from "../packages/contracts/canonical.js";
test("spoken unknown answers are pending, traceable, not re-asked and cannot overwrite manual input", () => {
  const p = sampleProject(randomUUID()),
    message_id = randomUUID();
  p.messages.push({
    id: message_id,
    role: "user",
    content: "预算暂不确定，客厅是阅读空间。",
    room_id: "living",
    run_id: randomUUID(),
    status: "complete",
    created_at: new Date().toISOString(),
  });
  applyExtracted(
    p,
    {
      room_id: null,
      field_key: "budget",
      value: null,
      answer_state: "unknown",
      quote: "预算暂不确定",
      message_id,
    },
    0,
  );
  p.version++;
  assert.equal(p.requirements[0].confirmation_state, "pending");
  assert.equal(p.requirements[0].source, "extracted");
  assert.equal(p.evidence[0].quote, "预算暂不确定");
  assert.ok(!nextQuestions(p, "living").some((q) => q.field_key === "budget"));
  assert.throws(() =>
    applyExtracted(
      p,
      {
        room_id: "room2",
        field_key: "purpose",
        value: "阅读空间",
        answer_state: "answered",
        quote: "客厅是阅读空间",
        message_id,
      },
      1,
    ),
  );
  assert.throws(() =>
    applyExtracted(
      p,
      {
        room_id: "living",
        field_key: "purpose",
        value: "宝宝房",
        answer_state: "answered",
        quote: "客厅是阅读空间",
        message_id,
      },
      1,
    ),
  );
  applyManual(p, {
    room_id: null,
    field_key: "budget",
    value: 60000,
    answer_state: "answered",
  });
  p.version++;
  assert.throws(() =>
    applyExtracted(
      p,
      {
        room_id: null,
        field_key: "budget",
        value: null,
        answer_state: "unknown",
        quote: "预算暂不确定",
        message_id,
      },
      0,
    ),
  );
  assert.equal(p.requirements[0].value, 60000);
});
test("canonical JSON ignores PostgreSQL object-key order without ignoring changed values or array order", () => {
  assert.equal(
    canonical({ a: 1, b: { d: 2, c: 3 } }),
    canonical({ b: { c: 3, d: 2 }, a: 1 }),
  );
  assert.notEqual(canonical({ a: 1 }), canonical({ a: 2 }));
  assert.notEqual(canonical([1, 2]), canonical([2, 1]));
});
