import {ReferencePanel} from './ReferencePanel.js';
import React, { useState } from "react";
import {PanelResize} from './PanelResize.js';
import {useOutsideDismiss} from './useOutsideDismiss.js';
import {
  fields,
  type ProjectData,
  type Requirement,
} from "../../../packages/contracts/index.js";
export type Commit = (
  path: string,
  body: Record<string, unknown>,
) => Promise<ProjectData>;
const roomKeys = [
  "purpose",
  "target_width",
  "target_depth",
  "target_height",
  "tone",
  "functions",
] as const;
const projectKeys = [
  "occupants",
  "decision_makers",
  "budget",
  "currency",
  "budget_scope",
  "timeline",
  "scope",
  "retained",
  "style",
  "priorities",
] as const;
function Field({
  project,
  roomId,
  fieldKey,
  commit,
  onError,
  readOnly = false,
}: {
  project: ProjectData;
  roomId: string | null;
  fieldKey: keyof typeof fields;
  commit: Commit;
  onError: (s: string) => void;
  readOnly?: boolean;
}) {
  const current = project.requirements.find(
      (r) => r.room_id === roomId && r.field_key === fieldKey,
    ),
    suggestion = project.suggestions.findLast(
      (s) =>
        s.room_id === roomId &&
        s.field_key === fieldKey &&
        s.status === "proposed",
    );
  const [draft, setDraft] = useState<{
      text: string;
      state: Requirement["answer_state"];
      version: number;
    } | null>(null),
    [busy, setBusy] = useState(false);
  const text = draft?.text ?? String(current?.value ?? ""),
    state = draft?.state ?? current?.answer_state ?? "answered";
  const number = fieldKey.startsWith("target_") || fieldKey === "budget";
  async function save() {
    setBusy(true);
    try {
      const value =
        state === "answered"
          ? number
            ? text.trim()
              ? Number(text)
              : null
            : text.trim()
          : null;
      await commit("/requirements", {
        room_id: roomId,
        field_key: fieldKey,
        value,
        answer_state: state,
        ...(draft ? { expected_version: draft.version } : {}),
      });
      setDraft(null);
    } catch (err) {
      onError((err as Error).message);
      setDraft((d) => (d ? { ...d, version: project.version } : d));
    } finally {
      setBusy(false);
    }
  }
  const label = fields[fieldKey];
  return (
    <div className="requirement-field" data-field={fieldKey}>
      <div className="field-heading">
        <label htmlFor={`${roomId || "project"}-${fieldKey}`}>{label}</label>
        <span
          className={
            current?.confirmation_state === "confirmed"
              ? "field-confirmed"
              : "field-status"
          }
        >
          {current
            ? current.confirmation_state === "pending"
              ? "原话提取 · 待核对"
              : current.source === "accepted"
                ? "已采用"
                : current.answer_state === "answered"
                  ? "业主填写"
                  : state === "unknown"
                    ? "暂不确定"
                    : state === "skipped"
                      ? "已跳过"
                      : "不适用"
            : "待补充"}
        </span>
      </div>
      <div className="field-input-row">
        <input
          id={`${roomId || "project"}-${fieldKey}`}
          aria-label={label}
          type={number ? "number" : "text"}
          step={number ? "any" : undefined}
          value={text}
          disabled={readOnly || state !== "answered"}
          maxLength={2000}
          placeholder={
            suggestion
              ? `AI 建议：${suggestion.value}`
              : fieldKey === "currency"
                ? "例如 SGD，暂不默认"
                : number
                  ? "尚未确定"
                  : "填写你的偏好"
          }
          onChange={(e) =>
            setDraft((d) => ({
              text: e.target.value,
              state,
              version: d?.version ?? project.version,
            }))
          }
        />
        <button
          disabled={busy || readOnly}
          aria-label={`保存${label}`}
          onClick={() => void save()}
        >
          {busy ? "…" : "保存"}
        </button>
      </div>
      <div className="field-foot">
        <select
          aria-label={`${label}回答状态`}
          value={state}
          disabled={readOnly}
          onChange={(e) =>
            setDraft((d) => ({
              text,
              state: e.target.value as Requirement["answer_state"],
              version: d?.version ?? project.version,
            }))
          }
        >
          <option value="answered">填写数值或文字</option>
          <option value="unknown">暂不确定</option>
          <option value="skipped">暂时跳过</option>
          <option value="not_applicable">不适用</option>
        </select>
        {current?.professional_status === "pending" && (
          <span className="needs-check">待专业测量</span>
        )}
      </div>
      {suggestion && (
        <div className="field-suggestion">
          <div>
            <span className="suggestion-tag">AI 建议 · 未采用</span>
            <strong>{String(suggestion.value)}</strong>
            <p>{suggestion.rationale}</p>
            <small>
              来源{" "}
              {suggestion.evidence_ids.map((id) => id.slice(0, 6)).join(" · ")}
            </small>
          </div>
          <button
            className="adopt"
            disabled={readOnly}
            onClick={async () => {
              try {
                await commit("/suggestions/adopt", {
                  suggestion_ids: [suggestion.id],
                });
                setDraft(null);
              } catch (err) {
                onError((err as Error).message);
              }
            }}
          >
            采用此字段
          </button>
        </div>
      )}
    </div>
  );
}
export function RequirementsPanel({
  project,
  roomId,
  focus,
  commit,
  onClose,
  onError,
  readOnly = false,
}: {
  project: ProjectData;
  roomId: string;
  focus: (id: string) => void;
  commit: Commit;
  onClose: () => void;
  onError: (s: string) => void;
  readOnly?: boolean;
}) {
  const [panelWidth, setPanelWidth] = useState(430);
  useOutsideDismiss(true,'.requirements-panel, .paper-rail, .paper-mobile-tabs',onClose);
  const room = project.rooms.find((r) => r.id === roomId)!;
  const proposals = project.suggestions.filter(
    (s) => s.status === "proposed" && s.room_id === roomId,
  );
  const answered = project.requirements.filter(
    (r) => r.answer_state === "answered",
  ).length;
  return (
    <aside className="requirements-panel" aria-label="需求收集面板" style={{"--panel-width": `${panelWidth}px`} as React.CSSProperties}>
      <PanelResize width={panelWidth} onChange={setPanelWidth} max={620} label="调整需求面板宽度" />
      {!readOnly && (
        <ReferencePanel
          key={roomId}
          project={project}
          roomId={roomId}
          commit={commit}
        />
      )}
      <div className="panel-header">
        <div>
          <span className="eyebrow">需求记录 / 你的正式偏好</span>
          <h2>把家的想法，慢慢填满</h2>
        </div>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="收起需求面板"
        >
          →
        </button>
      </div>
      <div className="panel-progress">
        <span>{answered} 项已填写</span>
        <span>可先跳过不确定的部分</span>
      </div>
      <div className="panel-scroll">
        <section className="room-section">
          <div className="section-heading">
            <h3>01 / 房间需求</h3>
            <span>点击房间即可定位</span>
          </div>
          <div className="panel-room-tabs">
            {project.rooms.map((r) => (
              <button
                key={r.id}
                className={r.id === roomId ? "active" : ""}
                onClick={() => focus(r.id)}
              >
                {r.name}
              </button>
            ))}
          </div>
          <button className="room-title" onClick={() => focus(roomId)}>
            {room.name}
            <span>⌖ 定位空间</span>
          </button>
          <div className="geometry">
            <span>
              <b>{room.geometry_cm.width / 100}</b> m 宽
            </span>
            <span>
              <b>{room.geometry_cm.depth / 100}</b> m 深
            </span>
            <span>
              <b>{room.geometry_cm.height / 100}</b> m 高
            </span>
          </div>
          <p className="micro-note">
            以上为场景几何，不是实测认证。下方目标尺寸仅记录需求，不会自动拉伸墙体。
          </p>
          <div key={roomId}>
            {roomKeys.map((k) => (
              <Field
                key={k}
                project={project}
                roomId={roomId}
                fieldKey={k}
                commit={commit}
                onError={onError}
                readOnly={readOnly}
        />
            ))}
          </div>
          {proposals.length > 1 && (
            <button
              className="group-adopt"
              disabled={readOnly}
              onClick={async () => {
                const names = proposals
                  .map((s) => fields[s.field_key as keyof typeof fields])
                  .join("、");
                if (
                  !window.confirm(
                    `仅采用以下 ${proposals.length} 个字段：${names}。其他字段和 3D 几何保持不变。`,
                  )
                )
                  return;
                try {
                  await commit("/suggestions/adopt", {
                    suggestion_ids: proposals.map((s) => s.id),
                  });
                } catch (err) {
                  onError((err as Error).message);
                }
              }}
            >
              审阅并采用本房间 {proposals.length} 项建议
            </button>
          )}
        </section>
        <section>
          <div className="section-heading">
            <h3>02 / 全屋信息</h3>
            <span>跨房间共享</span>
          </div>
          {projectKeys.map((k) => (
            <Field
              key={k}
              project={project}
              roomId={null}
              fieldKey={k}
              commit={commit}
              onError={onError}
              readOnly={readOnly}
            />
          ))}
        </section>
        <div className="panel-notice">
          {readOnly ? '设计师只读入口：需求与家具属性不会在此保存；请在设计师看板提交独立建议。' : '填写和采用只表示业主偏好，不等于预算、结构或施工安全批准。'}
        </div>
      </div>
    </aside>
  );
}
