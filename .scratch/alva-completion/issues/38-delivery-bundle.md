# 38: 同版本完整交付包

**ID:** ALVA-045

**Parent scope:** T13

**Review reference:** R34

**What to build:** 下载包含真实场景图、业务文档及数据清单的完整交付包。

**Blocked by:** [ALVA-044](37-audience-documents.md), [ALVA-034](27-room-merge.md), [ALVA-035](28-room-split.md), [ALVA-013](06-example-building-views.md)

**Status:** in-progress

**Execution:** 2026-09-26 由 lzy 认领，在独立 Worktree `task/ALVA-045-lzy` / `/home/ubuntu/Alva-worktrees/ALVA-045-lzy` 实施；依赖 ALVA-044、034、035、013 已在 main 集成。

- [ ] 高清平面图、全屋/局部图来自选定保存场景，参考图显式标注。
- [ ] DOCX/PDF/JSON/sidecar/manifest版本和校验和一致，不混入未保存工作稿。
- [ ] 合并/拆分和退役关系在交付中正确体现，无缺图或悬空引用；不声称重新导入能力。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `delivery`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
