# 19: 移回家具库并保留证据

**ID:** ALVA-026

**Parent scope:** T06

**Review reference:** R14

**What to build:** 移除场景实例后仍保留其需求来源和已存快照，后续可重新添加。

**Blocked by:** [ALVA-023](16-furniture-add-copy.md)

**Status:** done

**Execution:** 已完成。由 lzy 在独立 Worktree 实施，验证通过后自动合入 main。

- [x] 移回库不缩减资产池，不删除原话、独立需求或手动保存的快照。
- [x] 当前来源关系与旧快照中的引用可辨认，不要求逐操作退役日志。
- [x] 重新添加使用新实例ID，刷新和保存后仍能追溯来源。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `furniture`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff

- 负责人：lzy；分支 task/ALVA-026-lzy；Worktree /home/ubuntu/Alva-worktrees/ALVA-026-lzy。
- 实现：项目新增 archivedFurniture 退役实例记录；移除时保存完整原实例、原房间、资产和时间，变更上下文保留实例来源；资产池、原话、证据和历史快照不变。家具库重新添加可选择已移回来源，服务端校验来源存在并生成新实例 UUID 与 sourceId。
- 验证：npm run check；ALVA-026 回归 1/1 通过；既有 ALVA-023 回归通过；npm run build:alva；真实 Chromium 点击移回、来源选择、重新添加 3 项通过。
- 交付提交：实现提交待集成 Agent 记录；未部署生产服务。
