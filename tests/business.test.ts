import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../apps/api/store.js";
import { buildApp } from "../apps/api/app.js";
import { applyManual, addSuggestion } from "../apps/api/requirements.js";
import { nextQuestions, questionGroups } from "../apps/api/questions.js";
import { ChatService } from "../apps/api/chat.js";
import { sampleProject } from "../apps/api/sample.js";
import type { ProjectData } from "../packages/contracts/index.js";
async function fixture() {
  const store = new Store();
  await store.init();
  const app = await buildApp(store, {
    accessCode: "test-code",
    origin: "http://127.0.0.1",
    assets: false,
  });
  const login = await app.inject({
    method: "POST",
    url: "/api/session/login",
    payload: { code: "test-code" },
  });
  const headers = {
    cookie: login.cookies[0].name + "=" + login.cookies[0].value,
  };
  let p = await store.create("owner");
  return {
    store,
    app,
    headers,
    get p() {
      return p;
    },
    set p(value: ProjectData) {
      p = value;
    },
    async post(path: string, body: Record<string, unknown>) {
      const response = await app.inject({
        method: "POST",
        url: `/api/projects/${p.id}${path}`,
        headers,
        payload: {
          expected_version: p.version,
          request_id: randomUUID(),
          ...body,
        },
      });
      if (response.statusCode === 200 && response.json().version !== undefined)
        p = response.json();
      return response;
    },
    async close() {
      await app.close();
      await store.close();
    },
  };
}
test("02: per-room persistence, cm geometry vs target meters, unknown budget and scope validation", async () => {
  const f = await fixture();
  try {
    const original = structuredClone(f.p.scene);
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: "living",
          field_key: "purpose",
          value: "客厅兼阅读",
          answer_state: "answered",
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: "room2",
          field_key: "purpose",
          value: "宝宝房",
          answer_state: "answered",
        })
      ).statusCode,
      200,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: "living",
          field_key: "target_width",
          value: 5.2,
          answer_state: "answered",
        })
      ).statusCode,
      200,
    );
    assert.deepEqual(f.p.scene, original);
    assert.equal(f.p.rooms[0].geometry_cm.width, 480);
    assert.equal(
      f.p.requirements.find((r) => r.field_key === "target_width")
        ?.professional_status,
      "pending",
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: null,
          field_key: "budget",
          value: null,
          answer_state: "unknown",
        })
      ).statusCode,
      200,
    );
    assert.equal(
      f.p.requirements.find((r) => r.field_key === "budget")?.value,
      null,
    );
    assert.equal(
      f.p.requirements.some((r) => r.field_key === "currency"),
      false,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: "other-project-room",
          field_key: "purpose",
          value: "卧室",
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: "living",
          field_key: "budget",
          value: 2000,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: null,
          field_key: "currency",
          value: "默认",
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: "living",
          field_key: "target_width",
          value: -1,
        })
      ).statusCode,
      400,
    );
    assert.equal(
      (
        await f.post("/requirements", {
          room_id: null,
          field_key: "budget",
          value: 50000,
          answer_state: "unknown",
        })
      ).statusCode,
      400,
    );
    const editedScene = structuredClone(f.p.scene);
    for (const wall of editedScene.floors[0].walls) {
      if (!wall.id.startsWith("living-")) continue;
      if (wall.start.x === 480) wall.start.x = 500;
      if (wall.end.x === 480) wall.end.x = 500;
    }
    const sceneSave = await f.post("/scene/save", { scene: editedScene });
    assert.equal(sceneSave.statusCode, 200, sceneSave.body);
    assert.equal(f.p.rooms[0].geometry_cm.width, 500);
    assert.equal(f.p.requirements.find(r => r.field_key === "target_width")?.value, 5.2);
    const invalidScene = structuredClone(f.p.scene);
    invalidScene.floors[0].walls = invalidScene.floors[0].walls.filter(w => w.id !== "living-n");
    assert.equal((await f.post("/scene/save", { scene: invalidScene })).statusCode, 400);
    const restored = await f.store.get(f.p.id, "owner");
    assert.equal(restored.scene.floors[0].walls.length, 8);
    assert.equal(
      restored.requirements.find(
        (r) => r.room_id === "living" && r.field_key === "purpose",
      )?.value,
      "客厅兼阅读",
    );
    assert.equal(
      restored.requirements.find(
        (r) => r.room_id === "room2" && r.field_key === "purpose",
      )?.value,
      "宝宝房",
    );
  } finally {
    await f.close();
  }
});
test("04: explicit scoped adoption, idempotency, stale hand-edit protection and group rollback", async () => {
  const f = await fixture();
  try {
    await f.post("/requirements", {
      room_id: "living",
      field_key: "purpose",
      value: "一家三口活动",
    });
    const evidence = f.p.evidence[0].id,
      base = f.p.version;
    f.p = await f.store.mutate(
      f.p.id,
      "owner",
      randomUUID(),
      base,
      "suggestion_created",
      {},
      (p) => {
        addSuggestion(
          p,
          {
            room_id: "living",
            field_key: "tone",
            value: "暖中性",
            rationale: "依据活动空间偏好",
            evidence_ids: [evidence],
          },
          base,
        );
        addSuggestion(
          p,
          {
            room_id: "living",
            field_key: "functions",
            value: "可调整收纳",
            rationale: "依据使用场景",
            evidence_ids: [evidence],
          },
          base,
        );
      },
    );
    assert.equal(
      f.p.requirements.some((r) => r.field_key === "tone"),
      false,
    );
    const tone = f.p.suggestions.find((s) => s.field_key === "tone")!,
      functions = f.p.suggestions.find((s) => s.field_key === "functions")!;
    await f.post("/requirements", {
      room_id: "living",
      field_key: "purpose",
      value: "阅读优先",
    });
    assert.equal(
      f.p.requirements.some((r) => r.field_key === "tone"),
      false,
      "Ordinary save must not adopt placeholders",
    );
    const request_id = randomUUID(),
      expected_version = f.p.version;
    const adopted = await f.post("/suggestions/adopt", {
      suggestion_ids: [tone.id],
      request_id,
      expected_version,
    });
    assert.equal(adopted.statusCode, 200, adopted.body);
    assert.equal(
      f.p.requirements.find((r) => r.field_key === "tone")?.value,
      "暖中性",
    );
    assert.equal(
      f.p.requirements.some((r) => r.field_key === "functions"),
      false,
    );
    const version = f.p.version;
    const replay = await f.post("/suggestions/adopt", {
      suggestion_ids: [tone.id],
      request_id,
      expected_version,
    });
    assert.equal(replay.statusCode, 200);
    assert.equal(f.p.version, version);
    await f.post("/requirements", {
      room_id: "living",
      field_key: "functions",
      value: "业主手动决定：书架",
    });
    const currentVersion = f.p.version;
    assert.equal(
      (await f.post("/suggestions/adopt", { suggestion_ids: [functions.id] }))
        .statusCode,
      409,
    );
    assert.equal((await f.store.get(f.p.id, "owner")).version, currentVersion);
    assert.equal(
      f.p.requirements.find((r) => r.field_key === "functions")?.value,
      "业主手动决定：书架",
    );
    const newerBase = f.p.version;
    f.p = await f.store.mutate(
      f.p.id,
      "owner",
      randomUUID(),
      newerBase,
      "suggestion_created",
      {},
      (p) => {
        addSuggestion(
          p,
          {
            room_id: "room2",
            field_key: "tone",
            value: "浅木色",
            rationale: "可选方案",
            evidence_ids: [evidence],
          },
          newerBase,
        );
      },
    );
    const other = f.p.suggestions.at(-1)!;
    assert.equal(
      (
        await f.post("/suggestions/adopt", {
          suggestion_ids: [other.id, functions.id],
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (await f.store.get(f.p.id, "owner")).suggestions.find(
        (s) => s.id === other.id,
      )?.status,
      "proposed",
    );
  } finally {
    await f.close();
  }
});
test("04: five question groups, max two questions, no repeat of answered/unknown/skipped fields", () => {
  const p = sampleProject(randomUUID());
  assert.equal(questionGroups.length, 5);
  assert.ok(
    questionGroups.every(
      (g) => g.validation.includes("未") || g.validation.includes("待"),
    ),
  );
  assert.equal(nextQuestions(p, "living").length, 2);
  for (const key of [
    "occupants",
    "decision_makers",
    "budget",
    "timeline",
    "scope",
    "retained",
    "style",
    "priorities",
  ]) {
    applyManual(p, {
      room_id: null,
      field_key: key,
      value: null,
      answer_state: key === "budget" ? "unknown" : "skipped",
    });
    p.version++;
  }
  for (const key of [
    "purpose",
    "target_width",
    "target_depth",
    "target_height",
    "tone",
  ]) {
    applyManual(p, {
      room_id: "living",
      field_key: key,
      value: null,
      answer_state: "skipped",
    });
    p.version++;
  }
  p.evidence.push({
    id: randomUUID(),
    quote: "房间用于宝宝照护",
    room_id: "living",
    source: "user_chat",
    created_at: new Date().toISOString(),
  });
  const questions = nextQuestions(p, "living");
  assert.equal(questions.length, 1);
  assert.equal(questions[0].field_key, "functions");
  assert.match(questions[0].options[0].label, /分类收纳/);
  assert.equal(questions[0].options.length, 4);
  assert.equal(questions[0].freeform.id, "E");
  assert.ok(
    !questions.some((q) =>
      ["budget", "currency", "budget_scope"].includes(q.field_key),
    ),
  );
});
test("05: fixed original evidence, unknown budget scope, professional checks, retained stale reports", async () => {
  const f = await fixture();
  try {
    await f.post("/requirements", {
      room_id: null,
      field_key: "budget",
      value: 50000,
    });
    await f.post("/requirements", {
      room_id: "living",
      field_key: "target_width",
      value: 4.8,
    });
    const briefVersion = f.p.brief_version,
      source = structuredClone(f.p.evidence);
    const response = await f.post("/reviews", { use_model: false });
    assert.equal(response.statusCode, 200, response.body);
    const report = f.p.reports[0];
    assert.equal(report.brief_version, briefVersion);
    assert.equal(f.p.brief_version, briefVersion);
    assert.deepEqual(report.evidence_snapshot, source);
    assert.ok(
      report.findings.some((r) => r.text.includes("币种或包含范围未知")),
    );
    assert.equal(
      report.findings.filter((r) => r.category === "专业复核").length,
      2,
    );
    assert.match(report.model_status, /未运行模型/);
    await f.post("/requirements", {
      room_id: "living",
      field_key: "target_width",
      value: 5.1,
    });
    assert.notEqual(f.p.brief_version, report.brief_version);
    assert.equal(f.p.reports.length, 1);
    assert.equal(
      f.p.reports[0].requirement_snapshot.find(
        (r) => r.field_key === "target_width",
      )?.value,
      4.8,
    );
    assert.deepEqual(f.p.reports[0].evidence_snapshot, source);
  } finally {
    await f.close();
  }
});
test("03: provider failure preserves user input and replay does not create another run", async () => {
  const store = new Store();
  await store.init();
  try {
    const p = await store.create("owner");
    const chat = new ChatService(store, async () => {
      throw new Error("simulated provider outage");
    });
    const body = {
      request_id: randomUUID(),
      expected_version: 0,
      room_id: "living",
      text: "客厅希望方便阅读，预算暂不确定。",
    };
    await chat.start(p.id, "owner", body);
    await chat.active.get(p.id)?.promise;
    const saved = await store.get(p.id, "owner");
    assert.equal(saved.messages.length, 2);
    assert.equal(saved.messages[0].content, body.text);
    assert.equal(saved.messages[1].status, "failed");
    assert.match(saved.messages[1].content, /已保留/);
    assert.ok(saved.evidence.some((e) => e.quote === body.text));
    const repeat = await chat.start(p.id, "owner", body);
    assert.equal(repeat.replayed, true);
    assert.equal((await store.get(p.id, "owner")).messages.length, 2);
  } finally {
    await store.close();
  }
});
test("03: cancellation during model initialization preserves input; outbox replay is strictly ordered", async () => {
  const store = new Store();
  await store.init();
  try {
    const p = await store.create("owner");
    const chat = new ChatService(store, async () => {
      await new Promise((r) => setTimeout(r, 40));
      throw new Error("cancelled test provider");
    });
    const started = await chat.start(p.id, "owner", {
      request_id: randomUUID(),
      expected_version: 0,
      room_id: "living",
      text: "暂时取消这一轮",
    });
    await chat.cancel(p.id, "owner", started.run_id!);
    await chat.active.get(p.id)?.promise;
    const saved = await store.get(p.id, "owner");
    assert.equal(saved.messages[1].status, "cancelled");
    assert.equal(saved.messages[0].content, "暂时取消这一轮");
    const events = await store.events(p.id, 0);
    assert.ok(events.length >= 2);
    const later = await store.events(p.id, events[0].event_id);
    assert.ok(later.every((e) => e.event_id > events[0].event_id));
    assert.equal(new Set(events.map((e) => e.event_id)).size, events.length);
    await store.mutate(
      p.id,
      "owner",
      randomUUID(),
      null,
      "test_interruption",
      {},
      (p) => {
        p.messages[1].status = "running";
      },
    );
    await store.recoverInterruptedRuns();
    assert.equal((await store.get(p.id, "owner")).messages[1].status, "failed");
  } finally {
    await store.close();
  }
});
