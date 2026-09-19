# 09: 未答看板与退出问卷分析

**ID:** ALVA-016

**Parent scope:** T03

**Review reference:** R03

**What to build:** 从房间未答项回到Chat，退出问卷时只分析新信息。

**Blocked by:** [ALVA-015](08-chat-answer-confirmation.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 按房间/全屋范围统计，不因另一房间答过同题就消失；禁用项不计入。
- [ ] 点击未答项带题目和房间进入Chat，不仅切换问卷标签。
- [ ] 退出问卷增量分析，重复退出不重处理；已处理问题不重复询问，失败可重试。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `questions`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
