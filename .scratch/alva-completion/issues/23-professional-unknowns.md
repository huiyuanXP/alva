# 23: 专业未知与用户取舍分离

**ID:** ALVA-030

**Parent scope:** T07

**Review reference:** R18

**What to build:** 用户可以确认偏好取舍，但专业待核实项保持独立。

**Blocked by:** [ALVA-029](22-layout-review.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 没有重量/支撑证据只列待核实，不判定承载成立或失效。
- [ ] 确认偏好或知悉问题不能关闭专业风险。
- [ ] 取舍、原始依据及未决状态随保存保留，可供导出读取。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `review`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
