# 11: 咨询取消与故障重试

**ID:** ALVA-018

**Parent scope:** T04

**Review reference:** R06

**What to build:** 用户取消或遇到失败后保留输入，安全重试当前请求。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** in-progress

**Execution:** Lexie 已按 NextTask 正式认领；分支 `task/ALVA-018-lexie`，独立 Worktree `/home/ubuntu/Alva-worktrees/ALVA-018-lexie`。

- [ ] 取消终止后续增量与工具副作用，不污染下一次会话。
- [ ] 超时及真实不可用模型故障均可见，保留文本与附件输入并可重试。
- [ ] 隔离故障留证；重试不重复确认需求、采用方案或写正式场景。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
