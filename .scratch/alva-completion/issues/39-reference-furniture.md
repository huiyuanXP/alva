# 39: 参考家具变成可确认实例

**ID:** ALVA-046

**Parent scope:** T14

**Review reference:** R35

**What to build:** 其他功能完成后，将参考家具匹配为可比较、可确认的真实实例。

**Blocked by:** [ALVA-018](11-cancel-retry.md), [ALVA-019](12-voice-transcription.md), [ALVA-022](15-room-purpose.md), [ALVA-025](18-furniture-properties.md), [ALVA-026](19-furniture-return.md), [ALVA-027](20-furniture-transfer.md), [ALVA-037](30-snapshot-preview.md), [ALVA-038](31-snapshot-restore.md), [ALVA-039](32-desktop-walkthrough.md), [ALVA-040](33-sunlight-seasons.md), [ALVA-045](38-delivery-bundle.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 严格最后实施约束；来源/许可、推断尺寸与实测状态可见，不把图片当可靠几何。
- [ ] 至少可比较候选资产，确认后产生新UUID并保留来源，拒绝不改变场景。
- [ ] 新实例可编辑、保存和导出，缺可用许可资产时明确失败，不造假资产。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
