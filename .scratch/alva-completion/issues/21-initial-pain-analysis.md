# 21: 首次需求分析与生活痛点

**ID:** ALVA-028

**Parent scope:** T07

**Review reference:** R16

**What to build:** 确认需求后显示有原话依据的生活痛点。

**Blocked by:** [ALVA-015](08-chat-answer-confirmation.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 咖啡操作台、宠物玩具、绿植遮光各具命中和不命中样例。
- [ ] 区分偏好推导与特殊需求，保留原话、理由、空间、置信及待确认状态。
- [ ] 不编造健康或身份；重复分析不重复生成同一条问题。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `review`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
