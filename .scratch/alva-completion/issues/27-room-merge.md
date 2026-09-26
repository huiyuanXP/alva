# 27: 空间合并与需求迁移

**ID:** ALVA-034

**Parent scope:** T09

**Review reference:** R22

**What to build:** 合并空间时确认家具、问卷和证据的归属，再一次性落地。

**Blocked by:** [ALVA-033](26-wall-renovation.md)

**Status:** in-progress

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-034-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-034-Lexie`

- [ ] 预览合并后的边界、房间ID与来源关系，冲突或目标不明先询问。
- [ ] 家具、门窗、锁定项及原话均有明确去向；任一步失败整体回滚。
- [ ] 保存并恢复前后版本，2D/3D/问卷无悬空引用，变更可供交付读取。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
