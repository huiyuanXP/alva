import { Agent, type AgentTool } from "@earendil-works/pi-agent-core";
import { streamSimple } from "@earendil-works/pi-ai/api/openai-completions";
import type { Model } from "@earendil-works/pi-ai";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { config, dataDir } from "./config.js";
import { HttpError } from "./store.js";
const modelFile = resolve(dataDir, "model-id");
let cached: Model<"openai-completions"> | undefined;
async function resolveDefaultModel(): Promise<Model<"openai-completions">> {
  if (cached) return cached;
  if (!config.apiKey)
    throw new HttpError(503, "尚未配置咨询模型，手工填写仍可使用");
  let id =
    config.model ||
    (existsSync(modelFile) ? readFileSync(modelFile, "utf8").trim() : "");
  if (!id) {
    const response = await fetch(config.baseUrl + "/models", {
      headers: { Authorization: `Bearer ${config.apiKey}` },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new HttpError(
        503,
        `模型列表不可用（HTTP ${response.status}），请配置 OPENAI_MODEL`,
      );
    const data = (await response.json()) as { data?: { id: string }[] };
    const ids = (data.data || [])
      .map((x) => x.id)
      .filter(
        (id) =>
          typeof id === "string" &&
          !/image|embedding|whisper|tts|audio|realtime|dall|sora|video/i.test(
            id,
          ),
      );
    // Prefer a small general text model actually returned by this configured provider.
    const preferred = [
      /gpt-4\.1-mini$/i,
      /gpt-4o-mini$/i,
      /gpt-5-mini$/i,
      /claude.*haiku/i,
      /gemini.*flash/i,
      /gpt-4\.1$/i,
      /gpt-4o$/i,
    ];
    id =
      preferred.map((re) => ids.find((x) => re.test(x))).find(Boolean) ||
      ids[0] ||
      "";
    if (!id)
      throw new HttpError(503, "没有发现可用的文本模型，请配置 OPENAI_MODEL");
    writeFileSync(modelFile, id, { mode: 0o600 });
  }
  // These are conservative application request limits, NOT claims about vendor limits or prices.
  cached = {
    id,
    name: id,
    provider: "roomnote-configured",
    api: "openai-completions",
    baseUrl: config.baseUrl,
    reasoning: false,
    input: ["text"],
    contextWindow: 16000,
    maxTokens: 1600,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    compat: { supportsDeveloperRole: false, maxTokensField: "max_tokens" },
  };
  return cached;
}
export type ChatModelCatalogue = {
  models: { id: string; is_default: boolean }[];
  default_id: string | null;
  notice: string;
};
let catalogueCache: { expires: number; value: ChatModelCatalogue } | undefined;
let cataloguePending: Promise<ChatModelCatalogue> | undefined;
export function isChatModelId(id: unknown): id is string {
  return typeof id === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9._:/@+-]{0,199}$/.test(id)
    && !/image|embedding|whisper|tts|audio|realtime|dall|sora|video/i.test(id);
}
// This is the configured provider's actual catalogue, not a capability rating.
// A failed catalogue lookup retains only the existing configured default.
export async function listChatModels(): Promise<ChatModelCatalogue> {
  if (catalogueCache && catalogueCache.expires > Date.now()) return catalogueCache.value;
  if (cataloguePending) return cataloguePending;
  cataloguePending = (async () => {
    let defaultModel: Model<'openai-completions'>;
    try { defaultModel = await resolveDefaultModel(); }
    catch { return { models: [], default_id: null, notice: '咨询模型尚不可用，手工填写和资料管理仍可使用。' }; }
    const ids = new Set([defaultModel.id]);
    let notice = '来自当前服务商的模型列表；各模型的工具调用支持及可用额度以实际请求为准。';
    try {
      const response = await fetch(config.baseUrl + '/models', {
        headers: { Authorization: `Bearer ${config.apiKey}` }, signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw Error('catalogue unavailable');
      const data = await response.json() as { data?: { id?: unknown }[] };
      for (const item of (Array.isArray(data.data) ? data.data : []).slice(0, 2000)) {
        if (isChatModelId(item.id) && ids.size < 100) ids.add(item.id);
      }
    } catch { notice = '模型列表暂时不可用，仅保留已配置的默认模型。'; }
    return { models: [...ids].map(id => ({ id, is_default: id === defaultModel.id })), default_id: defaultModel.id, notice };
  })();
  try {
    const value = await cataloguePending;
    catalogueCache = { value, expires: Date.now() + (value.models.length ? 300000 : 15000) };
    return value;
  } finally { cataloguePending = undefined; }
}
export async function resolveModel(modelId?: string): Promise<Model<'openai-completions'>> {
  const model = await resolveDefaultModel();
  if (!modelId || modelId === model.id) return model;
  const catalogue = await listChatModels();
  if (!isChatModelId(modelId) || !catalogue.models.some(m => m.id === modelId))
    throw new HttpError(400, '所选模型不在当前可用列表中，请刷新模型列表后重试');
  return { ...model, id: modelId, name: modelId };
}
export async function createConsultationAgent(
  systemPrompt: string,
  tools: AgentTool[] = [],
  limits: { maxTurns?: number; modelId?: string } = {},
) {
  const model = await resolveModel(limits.modelId);
  let turns = 0;
  return new Agent({
    initialState: { systemPrompt, model, tools, thinkingLevel: "off" },
    streamFn: (m, context, options) =>
      streamSimple(m as Model<"openai-completions">, context, {
        ...options,
        apiKey: config.apiKey,
        maxTokens: 1400,
        timeoutMs: 45000,
        maxRetries: 0,
      }),
    toolExecution: "sequential",
    // A multi-input consultation may need read, extract, verify, propose and a
    // final prose turn. Other agents retain their existing four-turn ceiling.
    shouldStopAfterTurn: () => ++turns >= Math.min(6,Math.max(1,limits.maxTurns??4)),
  });
}
export function finalAgentText(agent: Agent): string {
  return agent.state.messages
    .filter((m) => m.role === "assistant")
    .flatMap((m) =>
      m.role === "assistant"
        ? m.content
            .filter((c) => c.type === "text")
            .map((c) => (c.type === "text" ? c.text : ""))
        : [],
    )
    .join("\n");
}
export function providerErrorStatus(agent: Agent): boolean {
  return agent.state.messages.some(
    (m) =>
      m.role === "assistant" &&
      (m.stopReason === "error" || m.stopReason === "aborted"),
  );
}
