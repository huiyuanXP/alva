import { z } from "zod";
import type { IntakeAnswer, IntakeProposal, DeliverySnapshot } from './intake.js';
export const Id = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[a-zA-Z0-9_-]+$/);
const Point = z.object({ x: z.number().finite(), y: z.number().finite() });
const Dimension = z.number().finite().positive().max(20000);
const Wall = z
  .object({
    id: Id,
    start: Point,
    end: Point,
    thickness: Dimension,
    height: Dimension,
    color: z.string().max(80),
  })
  .passthrough();
const Furniture = z
  .object({
    id: Id,
    catalogId: Id,
    position: Point,
    rotation: z.number().finite(),
    scale: z.object({ x: Dimension, y: Dimension, z: Dimension }),
    width: Dimension.optional(),
    depth: Dimension.optional(),
    height: Dimension.optional(),
    elevation: z.number().finite().min(0).max(1000).optional(),
    color: z.string().max(80).optional(),
  })
  .passthrough();
const Room = z
  .object({
    id: Id,
    name: z.string().max(200),
    walls: z.array(Id).max(100),
    area: z.number().finite(),
    floorTexture: z.string().max(80),
  })
  .passthrough();
export const Scene = z
  .object({
    id: Id,
    name: z.string().max(200),
    activeFloorId: Id,
    createdAt: z.string(),
    updatedAt: z.string(),
    floors: z
      .array(
        z
          .object({
            id: Id,
            name: z.string(),
            level: z.number().int().min(-100).max(100),
            elevation: z.number().finite().min(-30000).max(30000).optional(),
            walls: z.array(Wall).max(1000),
            rooms: z.array(Room).max(100),
            furniture: z.array(Furniture).max(1000),
            doors: z.array(z.unknown()).max(1000),
            windows: z.array(z.unknown()).max(1000),
          })
          .passthrough(),
      )
      .min(1)
      .max(10),
  })
  .passthrough()
  .superRefine((s, ctx) => {
    if (!s.floors.some((f) => f.id === s.activeFloorId))
      ctx.addIssue({ code: "custom", message: "Unknown active floor" });
    const ids = s.floors.flatMap((f) => [
      f.id,
      ...f.walls.map((w) => w.id),
      ...f.rooms.map((r) => r.id),
      ...f.furniture.map((i) => i.id),
    ]);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({ code: "custom", message: "Duplicate stable IDs" });
  });
export type NativeScene = z.infer<typeof Scene>;
export const Command = z.object({
  expected_version: z.number().int().nonnegative(),
  request_id: z.string().uuid(),
});
export type FieldValue = string | number | null;
export type Requirement = {
  id: string;
  room_id: string | null;
  field_key: string;
  value: FieldValue;
  answer_state: "answered" | "unknown" | "skipped" | "not_applicable";
  confirmation_state: "provided" | "pending" | "confirmed" | "rejected";
  professional_status: "not_required" | "pending" | "verified";
  evidence_ids: string[];
  version: number;
  source: "manual" | "extracted" | "accepted";
};
export type Evidence = {
  attachment_id?: string;
  region?: "whole_image" | "whole_audio" | "document_text";
  id: string;
  quote: string;
  message_id?: string;
  room_id?: string | null;
  field_key?: string;
  source: string;
  created_at: string;
};
export type RoomInfo = {
  id: string;
  name: string;
  floor_id: string;
  wall_ids: string[];
  geometry_cm: { width: number; depth: number; height: number };
  bounds: { x: number; y: number; width: number; depth: number };
};
export type ChatMessage = {
  model_id?: string;
  failure_code?: string;
  attachment_ids?: string[];
  id: string;
  role: "user" | "assistant";
  content: string;
  room_id: string;
  run_id: string;
  status: "complete" | "running" | "cancelled" | "failed";
  created_at: string;
};
export type Suggestion = {
  id: string;
  room_id: string | null;
  field_key: string;
  value: FieldValue;
  rationale: string;
  evidence_ids: string[];
  base_version: number;
  status: "proposed" | "accepted" | "rejected" | "superseded";
  scope: string[];
};
export type CollaborationSuggestion = {
  id: string;
  author_id: string;
  author_role: 'designer';
  room_id: string | null;
  object_id?: string;
  text: string;
  status: 'proposed' | 'accepted' | 'rejected';
  base_version: number;
  created_at: string;
};
export type Report = {
  id: string;
  brief_version: number;
  created_at: string;
  evidence_snapshot: Evidence[];
  requirement_snapshot: Requirement[];
  findings: { category: string; text: string; evidence_ids: string[] }[];
  summary: string;
  model_status: string;
};
export type ObjectConversation={id:string;project_id:string;room_id:string;object_id:string;raw_user_evidence:string;text:string;status:'running'|'proposed'|'accepted'|'rejected'|'failed';patch:{width?:number;depth?:number;height?:number;elevation?:number;color?:string}|null;base_version:number;scene_fingerprint:string;created_at:string};
export type ReferencePlan={id:string;room_id:string;raw_text:string;status:'running'|'proposed'|'failed';text:string;lines:{asset_id:string;quantity:number;object_ids:string[]}[]};
export type GeometryDiagnostic = {id:string;rule:"boundary"|"collision"|"unknown";rule_version:number;object_ids:string[];status:"active"|"resolved";severity:"warning"|"uncertain";evidence:string;advice:string;first_version:number;last_version:number};
export type ProjectData = {
  collaboration_suggestions?: CollaborationSuggestion[];
  intake_answers?: IntakeAnswer[];
  intake_questions?: IntakeProposal[];
  delivery_snapshots?: DeliverySnapshot[];
  geometry_diagnostics?: GeometryDiagnostic[];
  media_analyses?: {request_id:string;attachment_id:string;started_at?:string;status:"running"|"complete"|"failed"}[];
  attachments?: {id:string;room_id:string;message_id:string;mime:string;name?:string;byte_size?:number;status:"uploaded"|"analyzing"|"analyzed"|"confirmed"|"failed";transcript?:string;corrected_transcript?:string;extracted_text?:string;extraction_note?:string;analysis_summary?:string}[];
  reference_plans?: ReferencePlan[];
  object_messages?: ObjectConversation[];
  id: string;
  name: string;
  version: number;
  brief_version: number;
  scene: NativeScene;
  rooms: RoomInfo[];
  requirements: Requirement[];
  evidence: Evidence[];
  messages: ChatMessage[];
  suggestions: Suggestion[];
  reports: Report[];
  revisions: {
    id: string;
    version: number;
    actor: string;
    kind: string;
    request_id: string;
    at: string;
  }[];
};
export type ProjectEvent = {
  event_id: number;
  project_id: string;
  project_version: number;
  type: string;
  payload: Record<string, unknown>;
};
export const fields = {
  purpose: "用途",
  target_width: "目标宽度（米）",
  target_depth: "目标进深（米）",
  target_height: "目标净高（米）",
  tone: "色调",
  functions: "功能关键词",
  budget: "总预算",
  currency: "币种",
  budget_scope: "预算包含范围",
  timeline: "时间安排",
  decision_makers: "决策人",
  occupants: "居住成员",
  retained: "保留物品",
  style: "风格偏好",
  priorities: "优先级",
  scope: "改造范围",
} as const;
export const RequirementPatch = Command.extend({
  room_id: Id.nullable(),
  field_key: z.enum(
    Object.keys(fields) as [keyof typeof fields, ...(keyof typeof fields)[]],
  ),
  value: z.union([z.string().max(2000), z.number().finite(), z.null()]),
  answer_state: z
    .enum(["answered", "unknown", "skipped", "not_applicable"])
    .default("answered"),
});
