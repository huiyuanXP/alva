import React, { useState } from "react";
import type {
  ProjectData,
  Report,
  Requirement,
} from "../../../packages/contracts/index.js";
import { fields } from "../../../packages/contracts/index.js";
import type { Commit } from "./RequirementsPanel.js";
const show = (r: Requirement) =>
  r.answer_state === "answered"
    ? String(r.value)
    : (
        {
          unknown: "暂不确定",
          skipped: "暂时跳过",
          not_applicable: "不适用",
        } as Record<string, string>
      )[r.answer_state];
export function briefMarkdown(p: ProjectData) {
  return `# ${p.name} · 初步需求任务书\n\n需求版本 ${p.brief_version}。本文件不构成施工、结构安全或预算批准。\n\n## 1. 项目概览\n${
    p.requirements
      .filter((r) => r.room_id === null)
      .map(
        (r) =>
          `- ${fields[r.field_key as keyof typeof fields]}：${show(r)}（${r.confirmation_state === "pending" ? "待核对提取；" : ""}来源 ${r.evidence_ids.join(", ")}）`,
      )
      .join("\n") || "尚待补充"
  }\n\n## 2. 房间需求\n${p.rooms
    .map(
      (room) =>
        `### ${room.name}\n${
          p.requirements
            .filter((r) => r.room_id === room.id)
            .map(
              (r) =>
                `- ${fields[r.field_key as keyof typeof fields]}：${show(r)}；${r.confirmation_state === "pending" ? "待核对提取；" : ""}${r.professional_status === "pending" ? "待专业复核" : "业主偏好"}`,
            )
            .join("\n") || "尚待补充"
        }`,
    )
    .join(
      "\n\n",
    )}\n\n## 3. 参考资料与原话\n${p.evidence.map((e) => `- [${e.id}] ${e.source}: ${e.quote}`).join("\n") || "暂无资料"}\n\n## 4. 待决策\n${
    p.suggestions
      .filter((s) => s.status === "proposed")
      .map(
        (s) =>
          `- 未采用：${fields[s.field_key as keyof typeof fields]} = ${s.value}`,
      )
      .join("\n") || "暂无待采用建议；信息完整性仍需审查"
  }\n\n## 5. 来源与修改\n${p.revisions.map((r) => `- v${r.version} ${r.kind} / ${r.actor} / ${r.at}`).join("\n")}\n`;
}
export function BriefPanel({
  project,
  onClose,
  commit,
  onError,
}: {
  project: ProjectData;
  onClose: () => void;
  commit: Commit;
  onError: (s: string) => void;
}) {
  const [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<string>("");
  const report: Report | undefined =
    project.reports.find((r) => r.id === selected) || project.reports.at(-1);
  const Row = ({ r }: { r: Requirement }) => (
    <div className="brief-field">
      <span>{fields[r.field_key as keyof typeof fields]}</span>
      <strong>{show(r)}</strong>
      <small>
        {r.confirmation_state === "pending"
          ? "原话提取 · 待核对"
          : r.confirmation_state === "confirmed"
            ? "已采用"
            : "业主填写"}
        {r.professional_status === "pending" ? " · 待专业测量" : ""}
      </small>
    </div>
  );
  return (
    <div className="brief-backdrop" onPointerDown={e=>{if(e.target===e.currentTarget)onClose();}}>
      <section
        className="brief-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="brief-title"
      >
        <header>
          <div>
            <span className="eyebrow">
              INITIAL DESIGN BRIEF / V{project.brief_version}
            </span>
            <h2 id="brief-title">家的需求任务书</h2>
          </div>
          <button
            aria-label="关闭任务书"
            className="icon-button"
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="brief-scroll">
          <div className="brief-callout">
            这是一份可追溯的初步咨询记录，不是施工图、安全认证或获批准的预算。
          </div>
          <section>
            <h3>01 / 项目概览</h3>
            {project.requirements
              .filter((r) => r.room_id === null)
              .map((r) => (
                <Row key={r.id} r={r} />
              ))}
            {!project.requirements.some((r) => r.room_id === null) && (
              <p className="empty-note">
                预算、成员、决策人和改造范围尚待补充。
              </p>
            )}
          </section>
          <section>
            <h3>02 / 房间需求</h3>
            {project.rooms.map((room) => (
              <div key={room.id}>
                <h4>{room.name}</h4>
                {project.requirements
                  .filter((r) => r.room_id === room.id)
                  .map((r) => (
                    <Row key={r.id} r={r} />
                  ))}
                <small>
                  场景几何：{room.geometry_cm.width / 100} ×{" "}
                  {room.geometry_cm.depth / 100} ×{" "}
                  {room.geometry_cm.height / 100} m；不代表实测认证。
                </small>
              </div>
            ))}
          </section>
          <section>
            <h3>03 / 参考资料与原话</h3>
            {project.evidence.length ? (
              project.evidence.map((e) => (
                <details key={e.id}>
                  <summary>
                    {e.source === "manual_form" ? "手动填写" : "用户原话"} ·{" "}
                    {e.id.slice(0, 8)} · {e.created_at.slice(0, 16)}
                  </summary>
                  <blockquote>{e.quote}</blockquote>
                </details>
              ))
            ) : (
              <p className="empty-note">还没有提交参考资料或原话。</p>
            )}
          </section>
          <section>
            <h3>04 / 待决策与独立审查</h3>
            {project.suggestions
              .filter((s) => s.status === "proposed")
              .map((s) => (
                <p className="pending-line" key={s.id}>
                  未采用 · {fields[s.field_key as keyof typeof fields]}：
                  {String(s.value)}
                </p>
              ))}
            <button
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const p = await commit("/reviews", { use_model: true });
                  setSelected(p.reports.at(-1)?.id || "");
                } catch (err) {
                  onError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "独立审查中…" : "生成独立审查"}
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const p = await commit("/reviews", { use_model: false });
                  setSelected(p.reports.at(-1)?.id || "");
                } catch (err) {
                  onError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              仅运行规则检查
            </button>
            {report && (
              <div className="review-report">
                <select
                  aria-label="历史审查报告"
                  value={report.id}
                  onChange={(e) => setSelected(e.target.value)}
                >
                  {project.reports.map((r) => (
                    <option value={r.id} key={r.id}>
                      需求 v{r.brief_version} · {r.created_at.slice(0, 16)}
                      {r.brief_version !== project.brief_version
                        ? " · 已过期"
                        : ""}
                    </option>
                  ))}
                </select>
                <p
                  className={
                    report.brief_version === project.brief_version
                      ? "review-current"
                      : "review-stale"
                  }
                >
                  {report.brief_version === project.brief_version
                    ? "对应当前需求版本"
                    : "报告已过期：需求已发生修改，原报告仍保留"}
                </p>
                <small>
                  {report.model_status} · 冻结 {report.evidence_snapshot.length}{" "}
                  条原始证据
                </small>
                {report.findings.map((f, i) => (
                  <div className="finding" key={i}>
                    <span>{f.category}</span>
                    <p>{f.text}</p>
                    {f.evidence_ids.map((id) => (
                      <details key={id}>
                        <summary>查看原始证据 {id.slice(0, 8)}</summary>
                        <blockquote>
                          {report.evidence_snapshot.find((e) => e.id === id)
                            ?.quote || "来源不可用"}
                        </blockquote>
                      </details>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h3>05 / 来源与修改</h3>
            <p className="empty-note">
              字段采用仅限所选范围；普通保存不会采用灰色 AI 建议。
            </p>
            {project.revisions
              .slice()
              .reverse()
              .map((r) => (
                <div className="revision" key={r.id}>
                  <b>v{r.version}</b>
                  <span>{r.kind}</span>
                  <small>
                    {r.actor} · {new Date(r.at).toLocaleString("zh-CN")}
                  </small>
                </div>
              ))}
          </section>
        </div>
        <footer>
          <span>原始证据、建议与确认分开保存</span>
          <button
            onClick={() => {
              const url = URL.createObjectURL(
                new Blob([briefMarkdown(project)], {
                  type: "text/markdown;charset=utf-8",
                }),
              );
              const a = document.createElement("a");
              a.href = url;
              a.download = `roomnote-brief-v${project.brief_version}.md`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            导出 Markdown ↓
          </button>
        </footer>
      </section>
    </div>
  );
}
