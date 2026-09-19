import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Store } from "../apps/api/store.js";
import { buildApp } from "../apps/api/app.js";
import { Scene } from "../packages/contracts/index.js";
test("native scene persists IDs/attributes; unauthorized access, version conflict, idempotency and rollback", async () => {
  const store = new Store();
  await store.init();
  const app = await buildApp(store, {
    accessCode: "test-owner-code",
    origin: "http://127.0.0.1:4174",
    assets: false,
  });
  try {
    assert.equal((await app.inject("/api/projects")).statusCode, 401);
    const bad = await app.inject({
      method: "POST",
      url: "/api/session/login",
      payload: { code: "wrong" },
    });
    assert.equal(bad.statusCode, 401);
    const login = await app.inject({
      method: "POST",
      url: "/api/session/login",
      payload: { code: "test-owner-code" },
    });
    assert.equal(login.statusCode, 200);
    const cookie = login.cookies[0].name + "=" + login.cookies[0].value;
    const headers = { cookie, origin: "http://127.0.0.1:4174" };
    const created = await app.inject({
      method: "POST",
      url: "/api/projects",
      headers,
      payload: {},
    });
    assert.equal(created.statusCode, 200);
    const p = created.json();
    Scene.parse(p.scene);
    assert.equal((await app.inject(`/api/projects/${p.id}`)).statusCode, 401);
    await assert.rejects(store.get(p.id, "other-owner"), /无权/);
    const scene = structuredClone(p.scene);
    scene.floors[0].furniture[0].color = "#aabbcc";
    const request_id = randomUUID();
    const payload = { scene, expected_version: 0, request_id };
    const save = await app.inject({
      method: "POST",
      url: `/api/projects/${p.id}/scene/save`,
      headers,
      payload,
    });
    assert.equal(save.statusCode, 200, save.body);
    assert.equal(save.json().version, 1);
    const replay = await app.inject({
      method: "POST",
      url: `/api/projects/${p.id}/scene/save`,
      headers,
      payload,
    });
    assert.equal(replay.json().version, 1);
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/projects/${p.id}/scene/save`,
          headers,
          payload: { ...payload, request_id: randomUUID() },
        })
      ).statusCode,
      409,
    );
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/projects/${p.id}/scene/save`,
          headers,
          payload: { ...payload, scene: p.scene },
        })
      ).statusCode,
      409,
    );
    const restored = await store.get(p.id, "owner");
    assert.equal(restored.scene.floors[0].furniture[0].id, "sofa-main");
    assert.equal(restored.scene.floors[0].furniture[0].color, "#aabbcc");
    assert.equal(restored.revisions.length, 1);
    assert.equal((await store.events(p.id, 0)).length, 1);
    const foreign = await app.inject({
      method: "POST",
      url: `/api/projects/${p.id}/scene/save`,
      headers: { ...headers, origin: "https://untrusted.example" },
      payload,
    });
    assert.equal(foreign.statusCode, 403);
    scene.floors[0].furniture[0].width = -1;
    assert.equal(
      (
        await app.inject({
          method: "POST",
          url: `/api/projects/${p.id}/scene/save`,
          headers,
          payload: { scene, expected_version: 1, request_id: randomUUID() },
        })
      ).statusCode,
      400,
    );
    await assert.rejects(
      store.mutate(p.id, "owner", randomUUID(), 1, "fail", {}, () => {
        throw new Error("rollback");
      }),
    );
    assert.equal((await store.get(p.id, "owner")).version, 1);
  } finally {
    await app.close();
    await store.close();
  }
});
