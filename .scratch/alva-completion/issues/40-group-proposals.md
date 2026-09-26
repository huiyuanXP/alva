# 40: 整组参考方案采用与回退

**ID:** ALVA-047

**Parent scope:** T14

**Review reference:** R36

**What to build:** 比较整组方案，只采用勾选范围，必要时恢复用户此前手动保存的快照；没有快照时不提供回退。

**Blocked by:** [ALVA-046](39-reference-furniture.md)

**Status:** done

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-047-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-047-Lexie`

- [x] 至少两组真实差异且可预览，周边参考不自动勾选，锁定对象排除。
- [x] 整组全成或全败、版本冲突和幂等均验证，失败不留部分家具。
- [x] 新实例与来源稳定；只有手动保存创建存档，采用方案不自动建立回退点，快照恢复及交付一致。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Agent: Lexie。`Proposal` 增加可选 `groupId`；生活设计 `propose_changes` 在一次生成包含2–3个真实不同 variants 时分配同一个 groupId，单个精确候选保持旧行为。重复 changes 会继续被拒绝。
- 新增 `GET /api/proposal-groups/:groupId`：要求同组至少2个候选且 changes 真实不同；每个候选返回实际预览 scene、selectableIds、referenceIds 与 excludedLockedIds。周边 referenceIds 始终不可选；锁定家具/锁定房间目标从预览修改和可选范围中排除，不因一个锁定目标让整组比较失效。
- 新增 `POST /api/proposal-groups/accept`：在单次 `store.mutate` 中校验 group、proposal、revision、scope 与勾选范围；只过滤并应用被勾选 changes，复用现有 `applyProjectFurnitureChanges/applyChanges` 原子规则。任一 change 失败整组不写入；成功后所选 proposal=accepted，同组其余=rejected，并记录 layoutConfirmation/changes。
- 幂等沿用 store request receipt：同 requestId 重放返回首次结果，不重复创建实例。组内新增家具继续使用 proposal 生成时预分配 newId，因此预览/确认/重放的实例ID稳定。
- 采用组方案不会调用 save/snapshot，也不会自动建立回退点。专项验证在已有手动快照 v1 后采用方案，versions 数量保持1；只有显式 `/api/restore` 才恢复 v1，恢复本身也不新增快照，随后交付仍读取指定手动保存版本。没有手动快照时 UI 不新增任何“自动回退”入口，沿用现有快照历史的空状态。
- 前端新增 `ProposalGroupCard`：同组候选并排展示真实3D预览，每个候选独立勾选采用范围；referenceIds 以禁用 checkbox 展示，锁定目标不进入可勾选列表；明确提示采用本身不会创建快照。无 groupId 的旧 ProposalCard 不受影响。
- 第一轮专项：`tests/alva-proposal-groups.test.ts` 4/4 pass，0 fail，0 skip。首次运行曾发现组预览仍执行锁定 target 导致422，已修复为预览剔除并报告 excludedLockedIds；来源测试同时遵守现有 archivedFurniture sourceId 合同。
- 第二轮正式：`npm run check`、`npm run build:alva` 通过；ALVA-047/021/020/046/025/027/024/036/037/038/044/045 及回答家具建议扩大回归 44/44 pass，0 fail，0 skip。构建仅有既有 >500 kB chunk warning。
- `git diff --check` 通过；未发布生产、未修改真实项目数据。
