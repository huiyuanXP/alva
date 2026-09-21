# 08: Chat提取与手填双向确认

**ID:** ALVA-015

**Parent scope:** T03

**Review reference:** R02

**What to build:** 聊天提取的原话经点击确认进入问卷，手填结果也能被后续对话读取。

**Blocked by:** [ALVA-014](07-questionnaire-scope.md)

**Status:** in-progress

**Execution:** Lexie 已按 NextTask 正式认领；分支 `task/ALVA-015-lexie`，独立 Worktree `/home/ubuntu/Alva-worktrees/ALVA-015-lexie`。

- [ ] 真实Codex产生待确认答案，未确认不覆盖已确认值。
- [ ] 确认保存来源原话、题ID、房间及状态；手填与Chat结果一致。
- [ ] 重复确认不重复写入；锁定值服务端拒绝修改，解锁需明确确认。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `questions`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
