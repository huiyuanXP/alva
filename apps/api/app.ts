import Fastify from "fastify";
import cookie from "@fastify/cookie";
import staticPlugin from "@fastify/static";
import rateLimit from "@fastify/rate-limit";
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { z, ZodError } from "zod";
import { Command, Id, Scene } from "../../packages/contracts/index.js";
import { config, root } from "./config.js";
import { Store, HttpError } from "./store.js";
import { boardPayload } from "./board.js";
import { registerBusiness } from "./business-routes.js";
import { syncRoomGeometry } from "./scene.js";
import { ObjectUpdate, objectInfo, updateObject } from "./objects.js";
import {ObjectChatService,ObjectChatCommand,ObjectDecision} from "./object-chat.js";
import {ReferenceService,ReferenceRequest,ReferenceDecision,ReferenceQuantity} from "./references.js";
import {registerMedia} from "./media.js";
import { registerCollaboration } from './collaboration.js';
export type AppOptions = {
 referenceGenerator?: ConstructorParameters<typeof ReferenceService>[1];
  objectGenerator?: ConstructorParameters<typeof ObjectChatService>[1];
  accessCode?: string;
  origin?: string;
  assets?: boolean;
};
export async function buildApp(store: Store, options: AppOptions = {}) {
  const app = Fastify({
    logger: false,
    bodyLimit: 2 * 1024 * 1024,
    forceCloseConnections: true,
  });
  const references=new ReferenceService(store,options.referenceGenerator);
  const objectChat = new ObjectChatService(store,options.objectGenerator);
  const origin = options.origin || config.publicOrigin;
  const access = options.accessCode || config.accessCode;
  const hash = (value: string) =>
    createHash("sha256").update(value).digest("hex");
  await app.register(cookie);
  await app.register(rateLimit, {
    global: true,
    allowList: (req) => !req.url.startsWith("/api/"),
    max: 240,
    timeWindow: "1 minute",
  });
  app.setErrorHandler((err, _req, reply) => {
    const status =
      err instanceof ZodError
        ? 400
        : (err as { statusCode?: number }).statusCode || 500;
    reply
      .code(status)
      .send({
        error:
          status === 500
            ? "服务器内部错误；已保留原有数据"
            : err instanceof Error
              ? err.message
              : "请求无效",
      });
  });
  app.addHook("onRequest", async (req, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "same-origin");
    reply.header(
      "Content-Security-Policy",
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'self'; frame-ancestors 'self'; worker-src 'self' blob:",
    );
    if (req.url.startsWith("/api/")) reply.header("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.headers.origin &&
      req.headers.origin !== origin
    )
      throw new HttpError(403, "来源校验失败");
    if (
      req.url.startsWith("/api/") &&
      req.url.split("?")[0] !== "/api/session/login"
    ) {
      const token = req.cookies.roomnote_session;
      if (!token) throw new HttpError(401, "请先输入工作台访问口令");
      const row = (
      await store.db.query<{ owner_id: string; role: string; project_id: string | null; member_id: string | null }>(
          "SELECT owner_id,role,project_id,member_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",
          [hash(token)],
        )
      ).rows[0];
      if (!row) throw new HttpError(401, "会话已过期，请重新登录");
      (req as any).owner = row.owner_id;
      (req as any).role = row.role;
      (req as any).project_id = row.project_id;
      (req as any).member_id = row.member_id || row.owner_id;
      const path = req.url.split('?')[0], match = path.match(/^\/api\/projects(?:\/([^/]+))?/);
      const designerReads = ['/api/projects', '/api/projects/' + row.project_id + '/designer-board', '/api/projects/' + row.project_id + '/collaboration/view'];
      const suggestionPath = '/api/projects/' + row.project_id + '/collaboration/suggestions';
      const sessionPath = path === '/api/session' || path === '/api/session/logout';
      if (row.role === 'designer' && ((match && ((match[1] && match[1] !== row.project_id) || (!designerReads.includes(path) && path !== suggestionPath))) || (!match && !sessionPath))) throw new HttpError(403, '设计师只能通过共享看板读取当前项目');
      if (row.role === 'designer' && req.method !== 'GET' && req.method !== 'HEAD' && path !== suggestionPath && path !== '/api/session/logout') throw new HttpError(403, '设计师入口为只读；仅可提交独立设计建议');
    }
  });
  app.post(
    "/api/session/login",
    { config: { rateLimit: { max: 10, timeWindow: "1 minute" } } },
    async (req, reply) => {
      const b = z.object({ code: z.string().min(1).max(200) }).parse(req.body);
      const token = randomBytes(32).toString("base64url");
      const invite = await store.findDesignerInvite(b.code);
      let ownerId = '', role: 'owner' | 'designer' = 'owner', projectId: string | null = null, memberId: string | null = null;
      if (timingSafeEqual(Buffer.from(hash(b.code)), Buffer.from(hash(access)))) ownerId = 'owner';
      else if (invite) { ownerId = invite.owner_id; role = 'designer'; projectId = invite.project_id; memberId = invite.member_id; }
      else throw new HttpError(401, '访问口令不正确或设计师入口已失效');
      await store.db.query("INSERT INTO sessions(token_hash,owner_id,role,project_id,member_id,expires_at) VALUES ($1,$2,$3,$4,$5,now()+interval '7 days')", [hash(token), ownerId, role, projectId, memberId]);
      reply.setCookie("roomnote_session", token, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: origin.startsWith("https:"),
        maxAge: 604800,
      });
      return { ok: true, role, project_id: projectId, member_id: memberId };
    },
  );
  app.get("/api/session", async (req) => ({ authenticated: true, role: (req as any).role, project_id: (req as any).project_id ?? null }));
  app.post("/api/session/logout", async (req, reply) => {
    await store.db.query("DELETE FROM sessions WHERE token_hash=$1", [
      hash(req.cookies.roomnote_session || ""),
    ]);
    reply.clearCookie("roomnote_session", { path: "/" });
    return { ok: true };
  });
  app.get("/api/projects", async (req) => { const projects = await store.list((req as any).owner); return { projects: (req as any).role === 'designer' ? projects.filter(p => p.id === (req as any).project_id) : projects }; });
  app.post("/api/projects", async (req) => store.create((req as any).owner));
  app.get("/api/projects/:id", async (req) =>
    store.get(Id.parse((req.params as any).id), (req as any).owner),
  );
  app.post("/api/projects/:id/scene/save", async (req) => {
    const b = Command.extend({ scene: Scene }).parse(req.body),
      id = Id.parse((req.params as any).id);
    if (b.scene.id !== id) throw new HttpError(400, "场景与项目 ID 不一致");
    return store.mutate(
      id,
      (req as any).owner,
      b.request_id,
      b.expected_version,
      "scene_changed",
      b.scene,
      (p) => {
        const priorRefs=p.scene.floors.flatMap(f=>f.furniture).filter(o=>o.suggestion_id);
        const nextItems=b.scene.floors.flatMap(f=>f.furniture);
        for(const old of priorRefs){const next=nextItems.find(o=>o.id===old.id);if(!next||['suggestion_id','room_id','reference_status','catalogId'].some(k=>next[k]!==old[k]))throw new HttpError(409,'参考家具状态与资产由专用命令管理，请刷新后使用采用或移除操作');}
        if(nextItems.some(o=>o.suggestion_id&&!priorRefs.some(old=>old.id===o.id)))throw new HttpError(400,'参考家具必须由白名单命令创建');
        p.scene = b.scene;
        syncRoomGeometry(p);
      },
    );
  });
  app.post('/api/projects/:id/references',async req=>references.start(Id.parse((req.params as any).id),(req as any).owner,ReferenceRequest.parse(req.body)));
  app.post('/api/projects/:id/references/quantity',async req=>references.quantity(Id.parse((req.params as any).id),(req as any).owner,ReferenceQuantity.parse(req.body)));
  app.post('/api/projects/:id/references/decision',async req=>references.decide(Id.parse((req.params as any).id),(req as any).owner,ReferenceDecision.parse(req.body)));
  app.post("/api/projects/:id/objects/chat",async req=>objectChat.start(Id.parse((req.params as any).id),(req as any).owner,ObjectChatCommand.parse(req.body)));
  app.post("/api/projects/:id/objects/decision",async req=>objectChat.decide(Id.parse((req.params as any).id),(req as any).owner,ObjectDecision.parse(req.body)));
  app.get("/api/projects/:id/objects/:object", async req => {
    const params = req.params as any;
    return objectInfo(await store.get(Id.parse(params.id), (req as any).owner), Id.parse(params.object));
  });
  app.post("/api/projects/:id/objects/update", async req => {
    const b = ObjectUpdate.parse(req.body);
    return store.mutate(Id.parse((req.params as any).id), (req as any).owner, b.request_id, b.expected_version, "object_changed", b, p => updateObject(p,b));
  });
  app.get("/api/projects/:id/events", async (req, reply) => {
    const id = Id.parse((req.params as any).id);
    await store.get(id, (req as any).owner);
    const q = req.headers["last-event-id"] ?? (req.query as any).after ?? "0";
    let after = z.coerce.number().int().nonnegative().parse(q);
    reply.hijack();
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    let closed = false,
      busy = false;
    reply.raw.write("retry: 1000\n\n");
    const pump = async () => {
      if (closed || busy) return;
      busy = true;
      try {
        for (const e of await store.events(id, after)) {
          if (closed) break;
          reply.raw.write(`id: ${e.event_id}\ndata: ${JSON.stringify(e)}\n\n`);
          after = e.event_id;
        }
      } catch {
        if (!closed) reply.raw.end();
      } finally {
        busy = false;
      }
    };
    const interval = setInterval(() => void pump(), 250),
      heartbeat = setInterval(() => {
        if (!closed) reply.raw.write(": heartbeat\n\n");
      }, 15000);
    reply.raw.on("close", () => {
      closed = true;
      clearInterval(interval);
      clearInterval(heartbeat);
    });
    await pump();
  });
  const consultation=registerBusiness(app, store);
  registerMedia(app,store,consultation);
  registerCollaboration(app, store);
  app.get("/healthz", async () => ({
    ok: true,
    service: "renovation-workbench",
    pid: process.pid,
  }));
  app.get("/todo/api/board", async () => boardPayload());
  for (const route of ["/todo", "/todo/"])
    app.get(route, async (_req, reply) =>
      reply
        .type("text/html; charset=utf-8")
        .send(readFileSync(resolve(root, "taskboard/index.html"))),
    );
  if (options.assets !== false) {
    const enginePath = resolve(process.env.APP_ENGINE_DIR || resolve(root, "vendor/openplan3d/build"), "handler.js");
    if (existsSync(enginePath)) {
      const { handler } = await import(pathToFileURL(enginePath).href);
      app.get("/engine/*", async (req, reply) => {
        const path = req.url.split("?")[0];
        if (
          !(
            path === "/engine/embed" ||
            path === "/engine/embed/" ||
            path.startsWith("/engine/_app/") ||
            path.startsWith("/engine/models/") ||
            path.startsWith("/engine/textures/")
          )
        )
          return reply.code(404).send({ error: "Not found" });
        reply.hijack();
        handler(req.raw, reply.raw, () => {
          reply.raw.writeHead(404);
          reply.raw.end();
        });
      });
    }
    const web = resolve(process.env.APP_WEB_DIST || resolve(root, "apps/web/dist"));
    const newUiWeb = process.env.APP_NEW_UI_DIST ? resolve(process.env.APP_NEW_UI_DIST) : web;
    if (existsSync(web)) {
      await app.register(staticPlugin, {
        root: web,
        prefix: "/",
        wildcard: false,
      });
      app.setNotFoundHandler((req, reply) => {
        if (
          req.url.startsWith("/api/") ||
          req.url.startsWith("/engine/") ||
          req.url.includes(".") ||
          req.url.startsWith("/todo/")
        )
          return reply.code(404).send({ error: "Not found" });
        return reply
          .type("text/html")
          .send(readFileSync(resolve(/^\/new-ui\/?$/.test(req.url.split('?')[0]) ? newUiWeb : web, "index.html")));
      });
    }
  }
  return app;
}
