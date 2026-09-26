# 35: 偏好确认与后续建议引用

## 2026-09-26 接入等待已解除

ALVA-066 已在 main `e44c23a` 集成，阶段 MCP 接入前置已满足，066 的共享入口开发占用已释放。原负责人可同步最新 main 后完成本票工具挂载和真实主 Chat 联合验收，无需等待066生产发布。本票保持原署名与 in-progress；以下“等待066合main/运行层未实现/禁止修改066共享入口”均为历史记录，不再是当前阻塞。自身验收条件继续有效。


**ID:** ALVA-042

**Parent scope:** T12

**Review reference:** R31

**What to build:** 将图中偏好确认成有来源的需求，后续建议能引用。

**Blocked by:** [ALVA-041](34-reference-annotation.md), [ALVA-015](08-chat-answer-confirmation.md)

**Status:** done

**Execution:** 2026-09-26 按用户明确指令由 Lexie 认领。业务实现 `de7bb04` 已完成两轮验收：第一轮 4/4，第二轮真实 HTTP + 保存/重启恢复通过，ALVA-041+042 回归 7/7；当前仍为 `in-progress`，因为 ALVA-066 阶段 MCP 运行层尚未合入 main。已导出 confirmed-reference 工具工厂，等待 066 合入后做实际生活设计阶段 MCP 联合门禁；在此之前不冒充 done。

- [x] 点击确认才进入需求，不能覆盖锁定答案或错误房间。
- [x] 真实咨询能读取已确认偏好并解释来源，未确认分析不冒充已确认。
- [x] 刷新、保存后来源仍可追溯，交付可明确标为参考。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `references`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Acceptance re-check · 2026-09-26

按用户明确要求重新验收 ALVA-042。第一轮对 Lexie 实现分支 `task/ALVA-042-Lexie` / `de7bb04` 复验通过：`tests/alva-preference-confirmation.test.ts` 4/4；真实 HTTP 确认→保存 v1→服务/数据库重启→confirmed-only 查询→保存快照→真实 Chat 引用来源全部通过，锁定答案保持不变、pending 不泄漏、交付继续标为“参考图偏好·仅参考”。TypeScript 与 `git diff --check` 通过。证据：`evidence/20260926T-ALVA042-reaccept-round1/result.json`。

第二轮针对当前产品 `main` 的阶段 MCP 完成门禁未通过：当前 main 尚无 `api/mcp/` 运行层，也没有 `get_confirmed_reference_preferences`；ALVA-066 最新分支 `43f4466` 虽已有 living stage MCP，但其 living 工具包当前也没有挂载 ALVA-042 的 confirmed-reference 工具。现役 dynamicTools / `get_snapshot` 能读取 confirmed 来源，但项目规则明确这不能替代生活设计阶段 MCP 实际调用验收。因此本票继续保持 `in-progress`，三项 checklist 暂不勾选，直到 ALVA-066 合入并在同一集成 SHA 上完成“主 Chat → living stage MCP → get_confirmed_reference_preferences → confirmed-only 来源解释”的真实联合验收。证据：`evidence/20260926T-ALVA042-reaccept-round2/result.json`。


## Final acceptance · 2026-09-26 · Lexie

ALVA-066 已合入 main 后，本票在最新 main 基线上完成最后接线：`confirmedReferencePreferencesTool()` 以 `get_confirmed_reference_preferences` 挂载到 living Stage MCP；`api/export.ts` 保留现有 roomStyles/userContext/layoutReview/可取消导出等主线能力，并在设计师/业主交付文本和 sidecar 中加入 `referencePreferences` 与“参考图偏好·仅参考”标识。

第一轮：`tests/alva-preference-confirmation.test.ts`、`tests/alva-reference-annotation.test.ts`、`tests/alva-preference-stage-mcp.test.ts` 共 8/8 通过。真实 Chat 回归已经适配现役 Stage MCP bridge：通过 `mcp_call_tool(get_snapshot)` 读取快照；新的 living 联合测试必须先 `mcp_list_tools` 发现 `get_confirmed_reference_preferences`，再通过 `mcp_call_tool` 实际调用，确认仅返回 confirmed 项、pending 候选不泄漏，并在回复中引用用户原话来源。TypeScript、production build、`git diff --check` 通过。

第二轮：真实监听 `127.0.0.1:43142` + 隔离 PGlite + 真实 cookie/session。链路为：确认参考偏好 → 现役布局复核门禁 → 手动保存 v1 → 关闭服务/数据库 → 同数据目录重启 → `/api/references/confirmed` 只返回1条 confirmed → 保存快照交付含“参考图偏好·仅参考”且不含 pending → 真实 `/api/chat` living Stage MCP 实际调用 confirmed-reference 工具并解释来源。结果：savedVersion=1、confirmedCount=1、pendingExcluded=true、deliveryMarkedReference=true、stageMcpCalled=true、chatCitedConfirmedSource=true、serviceRestartReload=true。证据：`evidence/20260926T1500Z-ALVA042-final-round2/result.json`。main 集成态再次执行 ALVA-032+042 专项共 12/12、TypeScript、production build 和同一真实 HTTP/Stage MCP 链路均通过；集成态证据：`evidence/20260926T1500Z-ALVA042-final-round2-main/result.json`。
