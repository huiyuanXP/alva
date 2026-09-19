# 28: 空间拆分与需求分配

**ID:** ALVA-035

**Parent scope:** T09

**Review reference:** R23

**What to build:** 把一个空间拆分，明确各子空间的需求和对象归属。

**Blocked by:** [ALVA-033](26-wall-renovation.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 子房间新旧来源可追溯；跨边界家具、开口和全屋/房间需求逐项确认。
- [ ] 不丢锁定项与原话，歧义不自动猜；失败整个事务回滚。
- [ ] 拆分预览、确认、保存和整版恢复可演示，2D/3D/问卷一致。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
