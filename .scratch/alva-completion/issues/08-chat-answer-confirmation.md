# 08: Chat提取与手填双向确认

**ID:** ALVA-015

**Parent scope:** T03

**Review reference:** R02

**What to build:** 聊天提取的原话经点击确认进入问卷，手填结果也能被后续对话读取。

**Blocked by:** [ALVA-014](07-questionnaire-scope.md)

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；原实现提交 `1db54df0245788e67330c32e95ad61cf6c21a3a5`，随后 squash 集成到 `main`。

- [x] 真实Codex产生待确认答案，未确认不覆盖已确认值。
- [x] 确认保存来源原话、题ID、房间及状态；手填与Chat结果一致。
- [x] 重复确认不重复写入；锁定值服务端拒绝修改，解锁需明确确认。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `questions`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

Lexie 已在 `task/ALVA-015-lexie` 完成本票实现。Chat 提取确认后的最终答案直接引用精确用户原话的 `chat` evidence；手填答案继续使用 `questionnaire` evidence。两类答案都进入 `get_snapshot`，后续 Chat 使用同一 answers/evidence 合同读取。重复确认返回 422 且不重复写入；锁定答案由服务端拒绝覆盖，解锁必须 `confirmed:true`。

Round 1 `evidence/20260921T143000Z-ALVA015-round1/`：真实 Codex 生成 Q25 待确认答案，4 个非空增量；未确认不写入，确认后精确保留原话与 chat 来源，重复确认 422；手填 Q01 后第二次真实 Chat 成功读取，4 个增量。Round 2 `evidence/20260921T145000Z-ALVA015-round2/`：Chromium 完成真实提取、点击确认、手填并锁定、后续 Chat 读取、显式解除锁定，console error 0。
