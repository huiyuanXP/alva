# 15: 房间用途与布局分开确认

**ID:** ALVA-022

**Parent scope:** T05

**Review reference:** R10

**What to build:** 先改变房间用途，再独立决定是否采用布局建议。

**Blocked by:** [ALVA-021](14-candidate-adoption.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 只确认用途不会自动移动、替换或删除家具。
- [ ] 用途引发的布局建议可预览、拒绝或局部采用。
- [ ] 锁定房间拒绝修改；用途与布局分别保存确认依据。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
