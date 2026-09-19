import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  Command,
  Id,
  RequirementPatch,
} from "../../packages/contracts/index.js";
import { Store, HttpError } from "./store.js";
import { applyManual, adoptSuggestions } from "./requirements.js";
import { nextQuestions, questionGroups } from "./questions.js";
import { ChatService } from "./chat.js";
import { buildReview } from "./review.js";
import { registerIntake } from './intake.js';
import { registerDelivery } from './delivery.js';
import { registerDocuments } from './document-routes.js';
import { isChatModelId, listChatModels, resolveModel } from './provider.js';
export function registerBusiness(app: FastifyInstance, store: Store) {
  registerIntake(app, store);
  registerDelivery(app, store);
  registerDocuments(app, store);
  const chat = new ChatService(store),
    reviews = new Set<string>();
  app.get('/api/chat/models', async () => listChatModels());
  const identity = (req: any) => ({
    id: Id.parse(req.params.id),
    owner: String(req.owner),
  });
  app.get("/api/projects/:id/questions", async (req) => {
    const { id, owner } = identity(req);
    const p = await store.get(id, owner);
    const room = Id.parse((req.query as any).room_id);
    if (!p.rooms.some((r) => r.id === room))
      throw new HttpError(400, "未知房间");
    return { groups: questionGroups, questions: nextQuestions(p, room) };
  });
  app.post("/api/projects/:id/requirements", async (req) => {
    const { id, owner } = identity(req),
      b = RequirementPatch.parse(req.body);
    const input = {
      room_id: b.room_id,
      field_key: b.field_key,
      value: b.value,
      answer_state: b.answer_state,
    };
    return store.mutate(
      id,
      owner,
      b.request_id,
      b.expected_version,
      "requirements_changed",
      input,
      (p) => applyManual(p, b),
    );
  });
  app.post("/api/projects/:id/suggestions/adopt", async (req) => {
    const { id, owner } = identity(req),
      b = Command.extend({
        suggestion_ids: z.array(z.string().uuid()).min(1).max(12),
      }).parse(req.body);
    return store.mutate(
      id,
      owner,
      b.request_id,
      b.expected_version,
      "suggestions_adopted",
      { suggestion_ids: b.suggestion_ids },
      (p) => adoptSuggestions(p, b.suggestion_ids),
    );
  });
  app.post("/api/projects/:id/suggestions/reject", async (req) => {
    const { id, owner } = identity(req),
      b = Command.extend({ suggestion_id: z.string().uuid() }).parse(req.body);
    return store.mutate(
      id,
      owner,
      b.request_id,
      b.expected_version,
      "suggestion_rejected",
      { suggestion_id: b.suggestion_id },
      (p) => {
        const s = p.suggestions.find((s) => s.id === b.suggestion_id);
        if (!s || s.status !== "proposed")
          throw new HttpError(409, "建议已处理或不存在");
        s.status = "rejected";
      },
    );
  });
  app.post("/api/projects/:id/chat", async (req) => {
    const { id, owner } = identity(req),
      b = Command.extend({
        room_id: Id,
        text: z.string().trim().min(1).max(8000),
        attachment_ids: z.array(Id).max(6).optional(),
        model_id: z.string().min(1).max(200).refine(isChatModelId,'模型标识无效').optional(),
      }).parse(req.body);
    // Reject an unlisted selection before persisting a message or starting work.
    if (b.model_id) await resolveModel(b.model_id);
    return chat.start(id, owner, b);
  });
  app.post("/api/projects/:id/chat/cancel", async (req) => {
    const { id, owner } = identity(req),
      b = z.object({ run_id: z.string().uuid() }).parse(req.body);
    return chat.cancel(id, owner, b.run_id);
  });
  app.post("/api/projects/:id/reviews", async (req) => {
    const { id, owner } = identity(req),
      b = Command.extend({ use_model: z.boolean().default(true) }).parse(
        req.body,
      ),
      input = { use_model: b.use_model, expected_version: b.expected_version };
    const replay = await store.replay(
      id,
      owner,
      b.request_id,
      "review_created",
      input,
    );
    if (replay) return store.get(id, owner);
    if (reviews.has(id)) throw new HttpError(409, "本项目已有审查进行中");
    reviews.add(id);
    try {
      const snapshot = await store.get(id, owner);
      if (snapshot.version !== b.expected_version)
        throw new HttpError(409, "版本已更新，请重新读取后生成审查");
      const report = await buildReview(structuredClone(snapshot), b.use_model);
      // Preserve a completed fixed-version report even if facts changed during model review.
      return store.mutate(
        id,
        owner,
        b.request_id,
        null,
        "review_created",
        input,
        (p) => {
          p.reports.push(report);
        },
        "reviewer",
      );
    } finally {
      reviews.delete(id);
    }
  });
  app.addHook("onClose", async () => chat.stop());
  return chat;
}
