import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { Store } from "../apps/api/store.js";
import { buildApp } from "../apps/api/app.js";
const store = new Store();
await store.init();
const app = await buildApp(store, {
  accessCode: "ephemeral-http-smoke",
  origin: "http://127.0.0.1",
});
const checks: Record<string, unknown> = {
  at: new Date().toISOString(),
  browser_rendering_tested: false,
};
try {
  const base = await app.listen({ host: "127.0.0.1", port: 0 });
  const get = async (path: string) => {
    const r = await fetch(base + path);
    return {
      status: r.status,
      type: r.headers.get("content-type"),
      body: await r.text(),
    };
  };
  const health = await get("/healthz");
  checks.health =
    health.status === 200 &&
    JSON.parse(health.body).service === "renovation-workbench";
  const home = await get("/");
  checks.react_shell = home.status === 200 && home.body.includes("ROOMNOTE");
  const board = await get("/todo/api/board");
  checks.taskboard =
    board.status === 200 && JSON.parse(board.body).tickets.length === 16;
  const engine = await get("/engine/embed?project=smoke-room");
  checks.engine_html =
    engine.status === 200 && engine.type?.includes("text/html");
  const entry = readdirSync(
    "vendor/openplan3d/build/client/engine/_app/immutable/entry",
  ).find((f) => f.endsWith(".js"))!;
  const asset = await get("/engine/_app/immutable/entry/" + entry);
  checks.engine_asset =
    asset.status === 200 && asset.type?.includes("javascript");
  const webEntry = readdirSync("apps/web/dist/assets").find((f) =>
    f.endsWith(".js"),
  )!;
  const webAsset = await get("/assets/" + webEntry);
  checks.react_asset =
    webAsset.status === 200 && webAsset.type?.includes("javascript");
  checks.api_anonymous_denied = (await get("/api/projects")).status === 401;
  checks.env_not_exposed = (await get("/.env")).status === 404;
  checks.access_code_not_exposed =
    (await get("/.data/owner-access-code")).status === 404;
  checks.upstream_ai_api_disabled =
    (await fetch(base + "/engine/api/render", { method: "POST" })).status ===
    404;
  const checkNames = [
    "health",
    "react_shell",
    "taskboard",
    "engine_html",
    "engine_asset",
    "react_asset",
    "api_anonymous_denied",
    "env_not_exposed",
    "access_code_not_exposed",
    "upstream_ai_api_disabled",
  ];
  checks.passed = checkNames.every((k) => checks[k] === true);
} catch (error) {
  checks.passed = false;
  checks.error = error instanceof Error ? error.message : "HTTP smoke failed";
} finally {
  await app.close();
  await store.close();
}
writeFileSync(
  "docs/evidence/week1/http-smoke.json",
  JSON.stringify(checks, null, 2),
);
console.log(JSON.stringify(checks, null, 2));
if (!checks.passed) process.exitCode = 1;
