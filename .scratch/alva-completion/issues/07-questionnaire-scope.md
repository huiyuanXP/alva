# 07: 问卷范围精简与逐题回答

**ID:** ALVA-014

**Parent scope:** T03

**Review reference:** R01

**What to build:** 在房间问卷中完成一题并刷新保留结果。

**Blocked by:** None（已有核心可独立验证）

**Status:** in-progress

**Execution:** Lexie 已按 NextTask 正式认领；分支 `task/ALVA-014-lexie`，独立 Worktree `../Alva-worktrees/ALVA-014-lexie`。

- [ ] Q01–Q60 ID保留；Q19–Q22、Q60预算题及Q58视频题禁用且不进入问答/未答统计；清除其他题的预算选项，时间安排仍保留。每轮1题，直接相关最多2题。
- [ ] A推荐/B/C/D不同替代及自由回答可用；未知、跳过、不适用分别存储与显示。
- [ ] 房间级与全屋级答案分开，切换房间不串值；锁定答案拒绝覆盖。
- [ ] 移除现有预算界面、字段写入/接口与模型工具能力；本轮应用合同不包含预算，不自动删除历史用户数据或改写旧快照。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `questions`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
