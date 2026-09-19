import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { root } from "./config.js";
export function boardPayload() {
  const plan = resolve(root, ".scratch/openplan3d-consultation");
  const tickets = readdirSync(resolve(plan, "issues"))
    .filter((f) => /^\d{2}\.md$/.test(f))
    .sort()
    .map((file) => {
      const raw = readFileSync(resolve(plan, "issues", file), "utf8");
      const field = (name: string) =>
        raw.match(new RegExp(`\\*\\*${name}:\\*\\*\\s*([^\\n]+)`))?.[1] || "";
      const deps = Array.from(
        field("Blocked by").matchAll(/(?:^|;\s*)(\d{2})\s*[—-]/g),
        (m) => m[1],
      );
      const checks = Array.from(raw.matchAll(/^- \[([ xX])\]/gm), (m) => m[1]);
      return {
        id: file.slice(0, 2),
        title: raw.split("\n")[0].replace(/^#\s*\d+ — /, ""),
        raw,
        status: field("Status"),
        phase: field("Phase"),
        owner: field("建议负责人"),
        estimate: field("粗估"),
        summary: field("What to build"),
        deps,
        checks: checks.length,
        checked: checks.filter((x) => x.toLowerCase() === "x").length,
        waiting: [] as string[],
        column: "",
      };
    });
  const done = new Set(
    tickets.filter((t) => t.status === "done").map((t) => t.id),
  );
  for (const t of tickets) {
    t.waiting = t.deps.filter((d) => !done.has(d));
    t.column =
      t.status === "done"
        ? "done"
        : t.status === "in-progress"
          ? "progress"
          : t.waiting.length || t.status === "blocked"
            ? "blocked"
            : "ready";
  }
  const data = {
    spec: readFileSync(resolve(plan, "spec.md"), "utf8"),
    plan: readFileSync(resolve(plan, "PLAN.md"), "utf8"),
    tickets,
  };
  return {
    ...data,
    updated: new Date().toISOString(),
    revision: createHash("sha256")
      .update(JSON.stringify(data))
      .digest("hex")
      .slice(0, 12),
  };
}
