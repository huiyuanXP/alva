import { randomUUID } from "node:crypto";
import { Type } from "typebox";
import type { Agent } from "@earendil-works/pi-agent-core";
import { z } from "zod";
import { Store, HttpError } from "./store.js";
import { createConsultationAgent, providerErrorStatus } from "./provider.js";
import { addSuggestion, applyExtracted } from "./requirements.js";
import { fields, type ProjectData } from "../../packages/contracts/index.js";
import { consultationPolicyV2, intakeContext, intakeTools } from './agent-intake-tools.js';
import { ensureIntakeQuestion } from './intake-question-guard.js';
type Run = {
  id: string;
  requestId: string;
  owner: string;
  cancelled: boolean;
  timedOut: boolean;
  modelId?: string;
  agent?: Agent;
  promise?: Promise<void>;
};
export class ChatService {
  active = new Map<string, Run>();
  constructor(
    private store: Store,
    private agentFactory: typeof createConsultationAgent = createConsultationAgent,
  ) {}
  async start(
    id: string,
    owner: string,
    b: {
      request_id: string;
      expected_version: number;
      room_id: string;
      text: string;
      attachment_id?: string;
      attachment_ids?: string[];
      model_id?: string;
    },
  ) {
    const input = { room_id: b.room_id, text: b.text, ...(b.model_id?{model_id:b.model_id}:{}), ...(b.attachment_id?{attachment_id:b.attachment_id}:{}), ...(b.attachment_ids?{attachment_ids:b.attachment_ids}:{}) };
    const prior = await this.store.replay(
      id,
      owner,
      b.request_id,
      "chat_started",
      input,
    );
    if (prior)
      return {
        project: await this.store.get(id, owner),
        run_id: prior.messages.find((m) => m.id === b.request_id)?.run_id,
        replayed: true,
      };
    const running = this.active.get(id);
    if (running) {
      if (running.requestId === b.request_id)
        return {
          project: await this.store.get(id, owner),
          run_id: running.id,
          replayed: true,
        };
      throw new HttpError(409, "当前项目仍有一轮咨询运行，请先完成或取消");
    }
    const run: Run = {
      id: randomUUID(),
      requestId: b.request_id,
      owner,
      cancelled: false,
      timedOut: false,
      modelId: b.model_id,
    };
    this.active.set(id, run);
    try {
      const project = await this.store.mutate(
        id,
        owner,
        b.request_id,
        b.expected_version,
        "chat_started",
        input,
        (p) => {
          if (!p.rooms.some((r) => r.id === b.room_id))
            throw new HttpError(400, "未知房间");
          if(b.attachment_ids){
            if(b.attachment_ids.length>6||new Set(b.attachment_ids).size!==b.attachment_ids.length)throw new HttpError(400,'每轮最多6个不重复附件');
            if(b.attachment_ids.some(id=>!p.attachments?.some(a=>a.id===id&&a.room_id===b.room_id)))throw new HttpError(404,'附件不属于本项目当前房间');
          }
          if(b.attachment_id){const a=p.attachments?.find(a=>a.id===b.attachment_id&&a.room_id===b.room_id&&a.mime==='audio/wav');if(!a)throw new HttpError(404,'此房间音频不存在');a.corrected_transcript=b.text;a.status='confirmed';}
          const now = new Date().toISOString();
          p.messages.push(
            {
              id: b.request_id,
              role: "user",
              ...(b.model_id ? { model_id: b.model_id } : {}),
              content: b.text,
              room_id: b.room_id,
              run_id: run.id,
              status: "complete",
              created_at: now,
              ...((b.attachment_ids?.length||b.attachment_id)?{attachment_ids:b.attachment_ids??[b.attachment_id!]}:{}),
            },
            {
              id: randomUUID(),
              role: "assistant",
              ...(b.model_id ? { model_id: b.model_id } : {}),
              content: "",
              room_id: b.room_id,
              run_id: run.id,
              status: "running",
              created_at: now,
            },
          );
          p.evidence.push({
            id: randomUUID(),
            message_id: b.request_id,
            room_id: b.room_id,
            source: b.attachment_id ? "user_corrected_transcript" : "user_chat",
            ...(b.attachment_id?{attachment_id:b.attachment_id,region:"whole_audio" as const}:{}),
            quote: b.text,
            created_at: now,
          });
          for(const attachmentId of b.attachment_ids??[]){
            const attachment=p.attachments!.find(a=>a.id===attachmentId)!;
            p.evidence.push({id:randomUUID(),message_id:b.request_id,room_id:b.room_id,attachment_id:attachmentId,source:'chat_attachment_reference',quote:`用户本轮引用附件：${attachment.name??attachment.mime}；不自动确认附件中全部内容`,created_at:now});
          }
        },
      );
      run.promise = this.run(id, run, b.room_id, b.text, project).finally(
        () => {
          if (this.active.get(id) === run) this.active.delete(id);
        },
      );
      return { project, run_id: run.id, replayed: false };
    } catch (error) {
      if (this.active.get(id) === run) this.active.delete(id);
      throw error;
    }
  }
  async cancel(id: string, owner: string, runId: string) {
    await this.store.get(id, owner);
    const run = this.active.get(id);
    if (run && run.owner === owner && run.id === runId) {
      run.cancelled = true;
      run.agent?.abort();
    }
    return { ok: true };
  }
  private async run(
    id: string,
    run: Run,
    roomId: string,
    text: string,
    snapshot: ProjectData,
  ) {
    let structuralFailure=false;
    let content = "",
      status: "complete" | "cancelled" | "failed" = "complete",
      lastFlushed = 0;
    const timer = setTimeout(() => {
      run.timedOut = true;
      run.cancelled = true;
      run.agent?.abort();
    }, 90000);
    const flush = async () => {
      await this.store.streamProgress(id, run.owner, run.id, content);
      lastFlushed = Date.now();
    };
    try {
      const system = `你是ROOMNOTE全屋装修初访助手，使用中文。项目和当前房间由服务器绑定，不能切换到其他人的项目。先调用read_consultation读取原话、问卷及真实参考资料，再按照下面的v2流程进行咨询。模型最多六轮调用，应保留最后一轮作简短说明。工具未成功时不得声称已保存、已确认或已生成卡片。结构、施工、婴幼儿和无障碍安全须专业核实，不编造测量、认证、零甲醛或批准预算。`;
      const suggestionSchema = z.object({
        room_id: z.string().nullable(),
        field_key: z.string(),
        value: z.union([z.string().max(2000), z.number().finite()]),
        rationale: z.string().min(1).max(800),
        evidence_ids: z.array(z.string()).min(1).max(10),
      });
      run.agent = await this.agentFactory(
        system + consultationPolicyV2 +
          " 仅当用户明确指定原有field_key时，对该字段使用record_answer或propose_field；functions是功能关键词，不要替换成purpose。其他信息优先整理到60题的record_intake_answer，不要为了每个新问卷题目额外调用旧字段工具。",
        [
          ...intakeTools(this.store,{id,owner:run.owner,room:roomId,runId:run.id,messageId:run.requestId,baseVersion:snapshot.version,cancelled:()=>run.cancelled}),
          {
            name: "read_consultation",
            label: "读取本房间需求与原话",
            description:
              "Read only the authorized project snapshot, evidence and at most two unresolved questions.",
            parameters: Type.Object({}),
            execute: async () => {
              const latest = await this.store.get(id,run.owner);
              return ({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    project_id: id,
                    room_id: roomId,
                    version: latest.version,
                    field_schema: fields,
                    rooms: snapshot.rooms,
                    requirements: latest.requirements.filter(
                      (r) => r.room_id === null || r.room_id === roomId,
                    ),
                    evidence: latest.evidence
                      .filter((e) => e.room_id === null || e.room_id === roomId)
                      .slice(-32),
                    ...intakeContext(latest,roomId),
                    current_attachment_ids:latest.messages.find(m=>m.id===run.requestId)?.attachment_ids??[],
                  }),
                },
              ],
              details: { read_only: true },
            });},
          },
          {
            name: "record_answer",
            label: "提取原话（待核对）",
            description:
              "Record only an explicitly stated exact quote or explicit unknown/skipped state. Never infer a value. It stays pending verification and cannot overwrite manual input.",
            parameters: Type.Object({
              room_id: Type.Union([Type.String(), Type.Null()]),
              field_key: Type.Union(
                Object.keys(fields).map((k) => Type.Literal(k)),
              ),
              value: Type.Union([Type.String(), Type.Number(), Type.Null()]),
              answer_state: Type.Union(
                ["answered", "unknown", "skipped", "not_applicable"].map((k) =>
                  Type.Literal(k),
                ),
              ),
              quote: Type.String(),
            }),
            execute: async (_callId, args) => {
              if (run.cancelled) throw new Error("Run cancelled");
              const b = z
                .object({
                  room_id: z.string().nullable(),
                  field_key: z.string(),
                  value: z.union([
                    z.string().max(2000),
                    z.number().finite(),
                    z.null(),
                  ]),
                  answer_state: z.enum([
                    "answered",
                    "unknown",
                    "skipped",
                    "not_applicable",
                  ]),
                  quote: z.string().min(2).max(1000),
                })
                .parse(args);
              if (b.room_id !== null && b.room_id !== roomId)
                throw new Error("Wrong room");
              await this.store.mutate(
                id,
                run.owner,
                randomUUID(),
                null,
                "extracted_answer",
                { run_id: run.id, ...b },
                (p) =>
                  applyExtracted(
                    p,
                    { ...b, message_id: run.requestId },
                    snapshot.version,
                  ),
                "agent",
              );
              return {
                content: [
                  {
                    type: "text",
                    text: "原话已记录为待核对；不再重复询问此字段，尚未专业验证。",
                  },
                ],
                details: { confirmation_state: "pending" },
              };
            },
          },
          {
            name: "propose_field",
            label: "生成待确认字段建议",
            description:
              "Propose exactly one field backed by existing evidence IDs. Does not adopt or overwrite user facts.",
            executionMode: "sequential",
            parameters: Type.Object({
              room_id: Type.Union([Type.String(), Type.Null()]),
              field_key: Type.Union(
                Object.keys(fields).map((k) => Type.Literal(k)),
              ),
              value: Type.Union([Type.String(), Type.Number()]),
              rationale: Type.String(),
              evidence_ids: Type.Array(Type.String()),
            }),
            execute: async (toolCallId, args) => {
              if (run.cancelled) throw new Error("Run cancelled");
              const b = suggestionSchema.parse(args);
              if (b.room_id !== null && b.room_id !== roomId)
                throw new Error("Cannot propose fields for a different room");
              const requestId = randomUUID();
              let proposalId = "";
              await this.store.mutate(
                id,
                run.owner,
                requestId,
                null,
                "suggestion_created",
                { run_id: run.id, toolCallId, ...b },
                (p) => {
                  proposalId = addSuggestion(p, b, snapshot.version).id;
                },
                "agent",
              );
              return {
                content: [
                  {
                    type: "text",
                    text: JSON.stringify({
                      proposal_id: proposalId,
                      status: "proposed",
                      requires_explicit_adoption: true,
                    }),
                  },
                ],
                details: { proposal_id: proposalId },
              };
            },
          },
        ],
        {maxTurns:6, modelId:run.modelId},
      );
      if (run.cancelled) {
        status = run.timedOut ? "failed" : "cancelled";
        return;
      }
      run.agent.subscribe(async (e) => {
        if (
          e.type === "message_update" &&
          e.assistantMessageEvent.type === "text_delta"
        ) {
          content = (content + e.assistantMessageEvent.delta).slice(0, 12000);
          // Structured question tools enforce the card limit; do not truncate an
          // otherwise valid response merely because quoted evidence has question marks.
          if (Date.now() - lastFlushed > 180) await flush();
        }
        if (
          e.type === "tool_execution_start" ||
          e.type === "tool_execution_end"
        )
          await this.store.event(id, snapshot.version, "tool_status", {
            run_id: run.id,
            room_id: roomId,
            name: e.toolName,
            status:
              e.type === "tool_execution_start"
                ? "running"
                : e.isError
                  ? "failed"
                  : "complete",
          });
      });
      const history = snapshot.messages
        .filter((m) => m.room_id === roomId && m.status === "complete")
        .slice(-6)
        .map((m) => ({ role: m.role, text: m.content.slice(0,1200), truncated:m.content.length>1200 }));
      await run.agent.prompt(
        JSON.stringify({
          room_id: roomId,
          history,
          current_user_message: text,
        }),
      );
      if (run.cancelled) status = run.timedOut ? "failed" : "cancelled";
      else if (providerErrorStatus(run.agent) || !content.trim())
        status = "failed";
      else {
        structuralFailure=true;
        const result=await ensureIntakeQuestion(this.store,{id,owner:run.owner,room:roomId,runId:run.id,messageId:run.requestId,baseVersion:snapshot.version,cancelled:()=>run.cancelled},(system,tools,limits)=>this.agentFactory(system,tools,{...limits,modelId:run.modelId}),agent=>{run.agent=agent;});
        structuralFailure=result.needed&&!result.provided;
        if(structuralFailure)status='failed';
        if(run.cancelled)status=run.timedOut?'failed':'cancelled';
      }
    } catch {
      status = run.cancelled && !run.timedOut ? "cancelled" : "failed";
    } finally {
      clearTimeout(timer);
      const failureCode=status!=='failed'?undefined:run.timedOut?'timeout':structuralFailure?'structured_question_missing':run.agent&&providerErrorStatus(run.agent)?'provider_error':run.agent&&!content.trim()?'empty_response':'request_failed';
      const assistantTurns=run.agent?.state.messages.filter(m=>m.role==='assistant').length??0;
      const notice =
        status === "cancelled"
          ? "本轮已取消，之前的输入和已生成内容已保留。"
          : status === "failed"
            ? structuralFailure ? "更正：本轮结构化选择卡未通过生成校验，不能以正文的完成表述为准。你的输入已保留，下方只显示基础题库；可重新发送或在完整问卷中填写。" : "模型请求未完成，已有输入和内容已保留。你仍可在右侧手动填写，或重新发送。"
            : "";
      if (notice) content += (content ? "\n\n" : "") + notice;
      try {
        await this.store.mutate(
          id,
          run.owner,
          randomUUID(),
          null,
          "chat_finished",
          { run_id: run.id, status, ...(failureCode?{failure_code:failureCode}:{}), assistant_turns:assistantTurns },
          (p) => {
            const m = p.messages.find(
              (m) => m.run_id === run.id && m.role === "assistant",
            );
            if (m) {
              m.content = content;
              m.status = status;
              m.failure_code=failureCode;
            }
          },
          "agent",
        );
      } catch {
        /* Startup recovery marks still-running rows as failed without dropping input. */
      }
    }
  }
  async stop() {
    for (const run of this.active.values()) {
      run.cancelled = true;
      run.agent?.abort();
    }
    await Promise.allSettled([...this.active.values()].map((r) => r.promise));
  }
}
