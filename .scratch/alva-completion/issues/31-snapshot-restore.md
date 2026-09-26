# 31: 从快照恢复全局状态

**ID:** ALVA-038

**Parent scope:** T10

**Review reference:** R26

**What to build:** 在快照预览中明确点击恢复，将当前全局状态替换成该快照。

**Blocked by:** [ALVA-037](30-snapshot-preview.md)

**Status:** done

**Execution:** 2026-09-26 由 Lexie 完成；复用 ALVA-037 只读预览层并强化 restore 合同，补齐全局原子恢复、冲突/失败不污染、恢复不建新快照、重启可读、建筑生成并发保护与建筑结果一致性。两轮验收通过后集成 main。

- [x] 恢复入口只接受已存在的手动快照；点击快照只预览，点击恢复才覆盖当前工作状态，明确未保存修改将被替换。
- [x] 场景、拓扑、建筑结果、需求、原话依据和取舍整体恢复；失败/冲突不部分写入，不提供单步撤销或任意操作点恢复。
- [x] 恢复不自动生成新快照或“恢复前备份点”；只有再次手动保存才新增存档。重启后已有快照仍可读取，过期建筑结果不误用。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `snapshots`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff · 2026-09-26 · Lexie

实现完成：保留 ALVA-037 的“只读预览”和现有 `/api/restore` 显式入口，但强化恢复合同。新增 `prepareSnapshotRestore()`：从手动快照深拷贝完整 Project 状态，保留当前 revision / savedVersion 计数并将恢复结果标记 dirty；scene、candidate、confirmedTopology、topologyVersions、building、answers、evidence、messages、findings、proposals、changes、zones、roomLabelPositions 等均按快照整体恢复，不提供单步恢复或任意操作点恢复。

建筑安全边界：恢复前若当前有 active building generation，服务端直接 409，避免旧异步生成任务在恢复后覆盖工作稿。快照中的 buildingCandidate / confirmedBuilding 会对快照自身的 confirmedTopology version + fingerprint 做验证；旧版或损坏快照的建筑结果若不一致则清空并把 buildingState 标为 expired，要求重新生成，不能误用过期3D。

失败/冲突仍通过 `store.mutate` 事务保护：不存在版本 404、stale revision 409、数据库 receipt 写入故障 500 都不会部分修改项目、版本列表或已有快照。恢复本身不 INSERT 新快照，也不会创建“恢复前备份点”；UI 二次确认文案明确当前未保存修改会被替换、恢复前不会自动备份，恢复后如需保留必须再次手动保存。

第一轮验收：ALVA-038 专项 + ALVA-037/036 快照回归共 19/19 通过；覆盖完整全局恢复、缺失快照、stale revision、数据库故障原子回滚、恢复不建新快照、损坏/过期建筑结果失效。TypeScript、production build、`git diff --check` 通过。证据：`evidence/20260926T-ALVA038-round1/result.json`。

第二轮验收：真实监听 `127.0.0.1:43138` + 隔离 PGlite + production assets。真实 HTTP 链路验证：手动保存→当前工作稿分叉→显式 restore 整体恢复→版本数仍为1；启动真实异步 building generation 后 restore=409；服务/数据库关闭重启后版本列表和快照仍存在，重新 restore 成功，版本数仍不增加。production bundle 含“明确恢复到工作稿 / 当前未保存修改会被替换 / 恢复前不会自动创建备份点 / 再次手动保存”确认文案。随后相关回归共 24/24，通过 TypeScript、production build、`git diff --check`。证据：`evidence/20260926T-ALVA038-round2/result.json`。main 集成态再次执行同一恢复链路、建筑生成并发保护与重启恢复均通过，证据：`evidence/20260926T-ALVA038-round2-main/result.json`。
