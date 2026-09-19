# 18: 家具属性与款式替换

**ID:** ALVA-025

**Parent scope:** T06

**Review reference:** R13

**What to build:** 修改支持的尺寸、颜色、材质或许可款式，并看到持久变化。

**Blocked by:** [ALVA-023](16-furniture-add-copy.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 尺寸影响显示与碰撞，外观影响渲染，2D/3D与刷新后数据一致。
- [ ] 资产来源/许可可查；替换保留实例关联需求，不修改共享资产定义。
- [ ] 批量调整全成或全败；无效尺寸、锁定与版本冲突拒绝，Chat和手动一致。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `furniture`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
