import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";
import { parse } from "dotenv";
export const root = resolve(import.meta.dirname, "../..");
// Only these provider settings are read. Tunnel credentials never enter the application config.
const local = existsSync(resolve(root, ".env"))
  ? parse(readFileSync(resolve(root, ".env")))
  : {};
export const dataDir = process.env.APP_DATA_DIR || resolve(root, ".data");
mkdirSync(dataDir, { recursive: true, mode: 0o700 });
const accessPath = resolve(dataDir, "owner-access-code");
if (!existsSync(accessPath))
  writeFileSync(accessPath, randomBytes(24).toString("base64url"), {
    mode: 0o600,
  });
export const config = {
  host: "127.0.0.1",
  port: Number(process.env.PORT || 4174),
  publicOrigin: process.env.APP_ORIGIN || "https://prod.huiyuanxp.com",
  accessCode:
    process.env.APP_OWNER_ACCESS_CODE ||
    readFileSync(accessPath, "utf8").trim(),
  apiKey: process.env.OPENAI_API_KEY || local.openai_apikey || "",
  baseUrl: (
    process.env.OPENAI_BASE_URL ||
    local.openai_baseurl ||
    "https://api.openai.com/v1"
  ).replace(/\/$/, ""),
  visionModel: process.env.OPENAI_VISION_MODEL || local.openai_vision_model || "gemini-3-flash",
  transcriptionModel: process.env.OPENAI_TRANSCRIPTION_MODEL || local.openai_transcription_model || "gemini-3-flash",
  audioApi: process.env.AUDIO_API || "chat-input-audio",
  model: process.env.OPENAI_MODEL || local.openai_model || "",
};
