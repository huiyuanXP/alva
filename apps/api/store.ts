import {recomputeGeometry} from "./geometry.js";
import { acceptedReferenceIssue } from './reference-integrity.js';
import { PGlite } from "@electric-sql/pglite";
import { randomUUID, createHash, randomBytes } from "node:crypto";
import type {
  ProjectData,
  ProjectEvent,
} from "../../packages/contracts/index.js";
import { sampleProject } from "./sample.js";
import { canonical } from "../../packages/contracts/canonical.js";
export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
export class Store {
  db: PGlite;
  constructor(path?: string) {
    this.db = new PGlite(path);
  }
  async init() {
    await this.db
      .exec(`CREATE TABLE IF NOT EXISTS attachments(id text PRIMARY KEY,project_id text NOT NULL,mime text NOT NULL,data text NOT NULL,original_mime text,original_data text,byte_size integer NOT NULL);
      CREATE TABLE IF NOT EXISTS projects(id text PRIMARY KEY, owner_id text NOT NULL, version integer NOT NULL, data jsonb NOT NULL);
      CREATE TABLE IF NOT EXISTS commands(project_id text NOT NULL, request_id text NOT NULL, fingerprint text NOT NULL, response jsonb NOT NULL, PRIMARY KEY(project_id,request_id));
      CREATE TABLE IF NOT EXISTS events(event_id bigserial PRIMARY KEY, project_id text NOT NULL, project_version integer NOT NULL, type text NOT NULL, payload jsonb NOT NULL);
      CREATE INDEX IF NOT EXISTS events_project_idx ON events(project_id,event_id);
      CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY, owner_id text NOT NULL, role text NOT NULL DEFAULT 'owner', project_id text, member_id text, expires_at timestamptz NOT NULL);
      CREATE TABLE IF NOT EXISTS project_members(project_id text NOT NULL, owner_id text NOT NULL, member_id text NOT NULL, role text NOT NULL, invite_hash text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(project_id, member_id));
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS project_id text;
      ALTER TABLE sessions ADD COLUMN IF NOT EXISTS member_id text;
      UPDATE projects SET data=jsonb_set(data,'{reference_plans}','[]'::jsonb) WHERE NOT data ? 'reference_plans';
      UPDATE projects SET data=jsonb_set(data,'{object_messages}','[]'::jsonb) WHERE NOT data ? 'object_messages';
      UPDATE projects SET data=jsonb_set(data,'{brief_version}',to_jsonb(version)) WHERE NOT data ? 'brief_version';`);
  }
  async list(owner: string) {
    return (
      await this.db.query<{ id: string; name: string; version: number }>(
        "SELECT id, data->>'name' AS name,version FROM projects WHERE owner_id=$1 ORDER BY id",
        [owner],
      )
    ).rows;
  }
  async create(owner: string) {
    const p = sampleProject(randomUUID());
    recomputeGeometry(p);
    await this.db.query("INSERT INTO projects VALUES ($1,$2,$3,$4)", [
      p.id,
      owner,
      0,
      JSON.stringify(p),
    ]);
    return p;
  }
  async get(id: string, owner: string) {
    const row = (
      await this.db.query<{ data: ProjectData }>(
        "SELECT data FROM projects WHERE id=$1 AND owner_id=$2",
        [id, owner],
      )
    ).rows[0];
    if (!row) throw new HttpError(404, "项目不存在或无权访问");
    if(!row.data.geometry_diagnostics)recomputeGeometry(row.data);
    return row.data;
  }
  async mutate(
    id: string,
    owner: string,
    requestId: string,
    expectedVersion: number | null,
    kind: string,
    input: unknown,
    fn: (p: ProjectData, tx: any) => void | Promise<void>,
    actor = "owner",
  ) {
    const hash = createHash("sha256")
      .update(canonical({ kind, input }))
      .digest("hex");
    return this.db.transaction(async (tx) => {
      const row = (
        await tx.query<{ data: ProjectData; version: number }>(
          "SELECT data,version FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE",
          [id, owner],
        )
      ).rows[0];
      if (!row) throw new HttpError(404, "项目不存在或无权访问");
      const old = (
        await tx.query<{ fingerprint: string; response: ProjectData }>(
          "SELECT fingerprint,response FROM commands WHERE project_id=$1 AND request_id=$2",
          [id, requestId],
        )
      ).rows[0];
      if (old) {
        if (old.fingerprint !== hash)
          throw new HttpError(409, "request_id 已用于不同操作");
        return old.response;
      }
      if (expectedVersion !== null && row.version !== expectedVersion)
        throw new HttpError(
          409,
          `版本冲突：服务器 v${row.version}。请重新读取后确认，未覆盖任何字段。`,
        );
      const p = row.data;
      await fn(p,tx);
      if (kind === 'scene_changed' || kind === 'object_changed') {
        const issue = acceptedReferenceIssue(p);
        if (issue) throw new HttpError(409, issue);
      }
      p.version = row.version + 1;
      if(kind === "scene_changed")for(const requirement of p.requirements.filter(r=>r.field_key.startsWith('furniture:'))){
        const object=p.scene.floors.flatMap(f=>f.furniture).find(o=>requirement.field_key===`furniture:${o.id}`);
        if(!object){requirement.confirmation_state='pending';continue;}
        let previous:any;try{previous=JSON.parse(String(requirement.value));}catch{requirement.confirmation_state='pending';continue;}
        const values={...previous,width:object.width,depth:object.depth,height:object.height,color:object.color,elevation:object.elevation??0};
        if(canonical(previous)!==canonical(values)){requirement.value=JSON.stringify(values);requirement.version=p.version;const evidenceId=randomUUID();requirement.evidence_ids.push(evidenceId);p.evidence.push({id:evidenceId,source:'scene_confirmation',room_id:requirement.room_id,quote:JSON.stringify({request_id:requestId,object_id:object.id,values}),created_at:new Date().toISOString()});}
      }
      if (kind === "scene_changed" || kind === "object_changed") recomputeGeometry(p);
      if (
        [
          "requirements_changed",
          "suggestions_adopted",
          "scene_changed",
          "object_changed",
          "extracted_answer",
          "chat_started",
          "intake_answered",
          "intake_extracted",
          "document_uploaded",
          "document_reparsed",
          "attachment_uploaded",
          "media_analyzed",
        ].includes(kind)
      )
        p.brief_version = (p.brief_version || 0) + 1;
      p.revisions.push({
        id: randomUUID(),
        version: p.version,
        actor,
        kind,
        request_id: requestId,
        at: new Date().toISOString(),
      });
      await tx.query("UPDATE projects SET version=$1,data=$2 WHERE id=$3", [
        p.version,
        JSON.stringify(p),
        id,
      ]);
      await tx.query("INSERT INTO commands VALUES ($1,$2,$3,$4)", [
        id,
        requestId,
        hash,
        JSON.stringify(p),
      ]);
      await tx.query(
        "INSERT INTO events(project_id,project_version,type,payload) VALUES ($1,$2,$3,$4)",
        [id, p.version, kind, JSON.stringify({ version: p.version })],
      );
      return p;
    });
  }
  async event(
    id: string,
    version: number,
    type: string,
    payload: Record<string, unknown>,
  ) {
    const r = await this.db.query<{ event_id: number }>(
      "INSERT INTO events(project_id,project_version,type,payload) VALUES ($1,$2,$3,$4) RETURNING event_id",
      [id, version, type, JSON.stringify(payload)],
    );
    return Number(r.rows[0].event_id);
  }
  async createDesignerInvite(id: string, owner: string) {
    const code = randomBytes(24).toString('base64url');
    const memberId = 'designer:' + randomUUID();
    await this.db.transaction(async (tx) => {
      const row = (await tx.query<{ owner_id: string }>("SELECT owner_id FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE", [id, owner])).rows[0];
      if (!row) throw new HttpError(404, '项目不存在或无权访问');
      await tx.query("DELETE FROM project_members WHERE project_id=$1 AND role='designer'", [id]);
      await tx.query("INSERT INTO project_members(project_id,owner_id,member_id,role,invite_hash) VALUES($1,$2,$3,'designer',$4)", [id, row.owner_id, memberId, createHash('sha256').update(code).digest('hex')]);
    });
    return { project_id: id, role: 'designer' as const, code, member_id: memberId };
  }
  async findDesignerInvite(code: string) {
    return (await this.db.query<{ project_id: string; owner_id: string; member_id: string }>("SELECT project_id,owner_id,member_id FROM project_members WHERE role='designer' AND invite_hash=$1", [createHash('sha256').update(code).digest('hex')])).rows[0] ?? null;
  }
  async events(id: string, after: number) {
    const r = await this.db.query<ProjectEvent>(
      "SELECT * FROM events WHERE project_id=$1 AND event_id>$2 ORDER BY event_id LIMIT 500",
      [id, after],
    );
    return r.rows.map((e) => ({ ...e, event_id: Number(e.event_id) }));
  }
  async close() {
    await this.db.close();
  }
  async replay(
    id: string,
    owner: string,
    requestId: string,
    kind: string,
    input: unknown,
  ): Promise<ProjectData | null> {
    await this.get(id, owner);
    const old = (
      await this.db.query<{ fingerprint: string; response: ProjectData }>(
        "SELECT fingerprint,response FROM commands WHERE project_id=$1 AND request_id=$2",
        [id, requestId],
      )
    ).rows[0];
    if (!old) return null;
    const fingerprint = createHash("sha256")
      .update(canonical({ kind, input }))
      .digest("hex");
    if (old.fingerprint !== fingerprint)
      throw new HttpError(409, "request_id 已用于不同操作");
    return old.response;
  }
  async streamProgress(
    id: string,
    owner: string,
    runId: string,
    content: string,
  ) {
    // Transient message progress is atomic with its event, but is not a new brief revision.
    await this.db.transaction(async (tx) => {
      const row = (
        await tx.query<{ data: ProjectData }>(
          "SELECT data FROM projects WHERE id=$1 AND owner_id=$2 FOR UPDATE",
          [id, owner],
        )
      ).rows[0];
      if (!row) return;
      const p = row.data,
        m = p.messages.find(
          (m) => m.run_id === runId && m.role === "assistant",
        );
      if (!m || m.status !== "running") return;
      m.content = content;
      await tx.query("UPDATE projects SET data=$1 WHERE id=$2", [
        JSON.stringify(p),
        id,
      ]);
      await tx.query(
        "INSERT INTO events(project_id,project_version,type,payload) VALUES ($1,$2,$3,$4)",
        [
          id,
          p.version,
          "message_progress",
          JSON.stringify({
            run_id: runId,
            message_id: m.id,
            content,
            room_id: m.room_id,
          }),
        ],
      );
    });
  }
  async recoverInterruptedRuns() {
    const rows = (
      await this.db.query<{ id: string; owner_id: string; data: ProjectData }>(
        "SELECT id,owner_id,data FROM projects",
      )
    ).rows;
    for (const row of rows)
      if (row.data.messages.some((m) => m.status === "running"))
        await this.mutate(
          row.id,
          row.owner_id,
          randomUUID(),
          null,
          "chat_recovered",
          {},
          (p) => {
            for (const m of p.messages)
              if (m.status === "running") {
                m.status = "failed";
                m.content += "\n\n连接中断；已有内容已保存，请重新发送以继续。";
              }
          },
          "system",
        );
  }
}
