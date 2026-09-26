# 35: 偏好确认与后续建议引用

**ID:** ALVA-042

**Parent scope:** T12

**Review reference:** R31

**What to build:** 将图中偏好确认成有来源的需求，后续建议能引用。

**Blocked by:** [ALVA-041](34-reference-annotation.md), [ALVA-015](08-chat-answer-confirmation.md)

**Status:** in-progress

**Execution:** 2026-09-26 按用户明确指令由 Lexie 认领。业务实现 `de7bb04` 已完成两轮验收：第一轮 4/4，第二轮真实 HTTP + 保存/重启恢复通过，ALVA-041+042 回归 7/7；当前仍为 `in-progress`，因为 ALVA-066 阶段 MCP 运行层尚未合入 main。已导出 confirmed-reference 工具工厂，等待 066 合入后做实际生活设计阶段 MCP 联合门禁；在此之前不冒充 done。

- [ ] 点击确认才进入需求，不能覆盖锁定答案或错误房间。
- [ ] 真实咨询能读取已确认偏好并解释来源，未确认分析不冒充已确认。
- [ ] 刷新、保存后来源仍可追溯，交付可明确标为参考。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `references`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Acceptance re-check · 2026-09-26

按用户明确要求重新验收 ALVA-042。第一轮对 Lexie 实现分支 `task/ALVA-042-Lexie` / `de7bb04` 复验通过：`tests/alva-preference-confirmation.test.ts` 4/4；真实 HTTP 确认→保存 v1→服务/数据库重启→confirmed-only 查询→保存快照→真实 Chat 引用来源全部通过，锁定答案保持不变、pending 不泄漏、交付继续标为“参考图偏好·仅参考”。TypeScript 与 `git diff --check` 通过。证据：`evidence/20260926T-ALVA042-reaccept-round1/result.json`。

第二轮针对当前产品 `main` 的阶段 MCP 完成门禁未通过：当前 main 尚无 `api/mcp/` 运行层，也没有 `get_confirmed_reference_preferences`；ALVA-066 最新分支 `43f4466` 虽已有 living stage MCP，但其 living 工具包当前也没有挂载 ALVA-042 的 confirmed-reference 工具。现役 dynamicTools / `get_snapshot` 能读取 confirmed 来源，但项目规则明确这不能替代生活设计阶段 MCP 实际调用验收。因此本票继续保持 `in-progress`，三项 checklist 暂不勾选，直到 ALVA-066 合入并在同一集成 SHA 上完成“主 Chat → living stage MCP → get_confirmed_reference_preferences → confirmed-only 来源解释”的真实联合验收。证据：`evidence/20260926T-ALVA042-reaccept-round2/result.json`。
