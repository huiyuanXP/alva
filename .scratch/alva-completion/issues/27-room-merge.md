# 27: 空间合并与需求迁移

**ID:** ALVA-034

**Parent scope:** T09

**Review reference:** R22

**What to build:** 合并空间时确认家具、问卷和证据的归属，再一次性落地。

**Blocked by:** [ALVA-033](26-wall-renovation.md)

**Status:** done

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-034-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-034-Lexie`

- [x] 预览合并后的边界、房间ID与来源关系，冲突或目标不明先询问。
- [x] 家具、门窗、锁定项及原话均有明确去向；任一步失败整体回滚。
- [x] 保存并恢复前后版本，2D/3D/问卷无悬空引用，变更可供交付读取。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Agent: Lexie。新增 `api/topology/room-merge.ts`，API 为 `POST /api/rooms/merge/preview` / `confirm`，Floorplan MCP 同步暴露 `preview_room_merge` / `confirm_room_merge`；前端“改造预览”页新增空间合并面板。
- 预览以来源房间多边形 union 生成连续新边界，并生成拓扑绑定的新房间 ID；显示来源房间、门窗稳定 ID/原墙段连续性、问卷与房间样式冲突。来源包含锁定房间时不允许静默解除锁定。
- 确认在同一数据库事务中迁移家具、已确认/草稿问卷、原话证据、findings、user context、zones、用途确认、scope、推荐任务、Home Vision 房间引用、样式与候选、proposal 以及 reference batch / Chat action 的 roomId；未决候选按语义失效。任一校验或数据库写入失败整体回滚。
- 合并后建立新拓扑版本，旧建筑 3D 因引用旧房间 ID 明确作废并要求重生成；`roomMergeHistory` 保存来源关系，D03/D06 及 sidecar 可读取合并来源。手动快照可分别保存合并前/后状态，明确恢复能在两版本间往返且无旧 roomId 悬空引用。
- 第一轮正式验收：`npm run check && tsx --test tests/alva-room-merge.test.ts` → 4/4 pass，0 fail，0 skip。过程中曾发现 confirm 将确认专属字段误传严格 preview schema 导致 400，已通过 `previewFields` 修复；后续完整重跑通过。
- 第二轮正式验收：`npm run check`、`npm run build:alva` 通过；ALVA-034 + 033 + 032 + Stage MCP/Chat + snapshot restore + ALVA-030 兼容回归 27/27 pass，0 fail，0 skip。构建仅保留既有 >500 kB bundle warning。
- `git diff --check` 通过。命名的 neat-freak skill 当前未由可用 Agent 工具暴露，因此没有伪造调用；已人工复核 diff、临时文件和测试产物。
