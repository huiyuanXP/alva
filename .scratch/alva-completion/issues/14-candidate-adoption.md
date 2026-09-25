# 14: 局部3D候选比较与采用

**ID:** ALVA-021

**Parent scope:** T05

**Review reference:** R09

**What to build:** 比较候选后只采用勾选的修改，周边物体仅作参考。

**Blocked by:** [ALVA-020](13-scope-confirmation.md), [ALVA-013](06-example-building-views.md)

**Status:** done

**Execution:** 已由 lzy 在独立 Worktree 完成完整验证并合入 main，集成提交 c2594e8；后续依赖可按 NextTask 规则继续。

- [x] 模糊请求至少两个实际不同、可旋转缩放的3D候选；精确请求可一个。
- [x] 未采用不写正式设计；周边参考物不默认勾选；仅所选范围原子提交。
- [x] 旧版本候选拒绝、重复提交幂等、组内任一失败整体回滚，均含正反案例。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- owner: lzy
- branch/worktree: task/ALVA-021-lzy / /home/ubuntu/Alva-worktrees/ALVA-021-lzy
- implementation: 候选协议增加 referenceIds；模糊请求服务端强制至少两个不同变更候选；候选卡使用真实 Three.js 3D预览，参考对象禁用且不进入采用目标；保留现有 revision、幂等和事务回滚约束。
- verification: npm run check；npx tsx --test tests/alva-local-proposals.test.ts（2/2）；受影响 ALVA-012/020 回归（9/9）；npm run build:alva；真实 Chromium 脚本 scripts/alva-021-browser.ts 通过，证据 evidence/20260925T091243419Z-ALVA021-browser/，控制台错误 0。
- state: implemented, verified, and integrated into main.
