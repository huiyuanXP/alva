import { resolve } from "node:path";
import { writeFileSync } from "node:fs";
import { config, dataDir } from "./config.js";
import { Store } from "./store.js";
import { buildApp } from "./app.js";
const store = new Store(resolve(dataDir, "postgres"));
await store.init();
await store.recoverInterruptedRuns();
const app = await buildApp(store);
await app.listen({ host: config.host, port: config.port });
writeFileSync(resolve(dataDir, "app.pid"), String(process.pid), {
  mode: 0o600,
});
console.log(
  `ROOMNOTE listening on ${config.host}:${config.port}; owner access code is stored privately in .data/owner-access-code`,
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await app.close();
  await store.close();
  process.exit(0);
}
process.on("SIGTERM", () => void stop());
process.on("SIGINT", () => void stop());
