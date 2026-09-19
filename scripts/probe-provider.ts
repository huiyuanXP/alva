import { Type } from "typebox";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  createConsultationAgent,
  finalAgentText,
  providerErrorStatus,
  resolveModel,
} from "../apps/api/provider.js";
const report: { [k: string]: unknown } = {
  at: new Date().toISOString(),
  framework: "Pi Agent Core / OpenAI completions adapter",
  real_provider: true,
};
try {
  const model = await resolveModel();
  report.model = model.id;
  let executed = 0,
    deltas = 0;
  const agent = await createConsultationAgent(
    "You are running a non-sensitive integration probe. You MUST call read_room with room_id living before replying. Then say the returned unit and name in one short sentence.",
    [
      {
        name: "read_room",
        label: "读取样例房间",
        description: "Return sample room data. Call this before answering.",
        parameters: Type.Object({ room_id: Type.Literal("living") }),
        execute: async () => {
          executed++;
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  room_id: "living",
                  name: "客厅",
                  unit: "cm",
                }),
              },
            ],
            details: { sample: true },
          };
        },
      },
    ],
  );
  agent.subscribe((e) => {
    if (
      e.type === "message_update" &&
      e.assistantMessageEvent.type === "text_delta"
    )
      deltas++;
  });
  const timer = setTimeout(() => agent.abort(), 60000);
  try {
    await agent.prompt(
      "Read the living room using the read_room tool and tell me its name and unit.",
    );
  } finally {
    clearTimeout(timer);
  }
  report.tool_executions = executed;
  report.text_deltas = deltas;
  report.answer = finalAgentText(agent);
  report.passed = executed > 0 && deltas > 0 && !providerErrorStatus(agent);
} catch (error) {
  report.passed = false;
  report.error =
    error instanceof Error && "statusCode" in error
      ? error.message
      : "Provider connection or schema validation failed (credentials omitted)";
}
mkdirSync("docs/evidence/week1", { recursive: true });
writeFileSync(
  "docs/evidence/week1/provider-probe.json",
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));
if (!report.passed) process.exitCode = 1;
