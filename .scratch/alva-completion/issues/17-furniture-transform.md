# 17: 家具移动、旋转与吸附

**ID:** ALVA-024

**Parent scope:** T06

**Review reference:** R12

**What to build:** 在2D/3D中调整家具位置和方向，Chat也遵循相同规则。

**Blocked by:** [ALVA-023](16-furniture-add-copy.md)

**Status:** done

**Execution:** 已由 lzy 在独立 Worktree 完成，并在验证通过后合入 main。

- [x] 手动与Chat共用服务端修改规则；位置、旋转、吸附在两种视图一致。
- [x] 网格和碰撞同步更新，刷新后保留；锁定对象不能绕过限制。
- [x] 边界非法或失败不写入部分坐标，用户得到可理解反馈。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `furniture`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Owner: lzy; Worktree: /home/ubuntu/Alva-worktrees/ALVA-024-lzy; implementation commit: pending until Worktree commit.
- Added shared server-side furniture transform rules: 5cm position snapping, 15-degree rotation normalization, rotated-footprint room-boundary checks, same-room collision rejection for updates, and locked-object enforcement. Add/copy/transfer positions also use the same grid and boundary validation. Three.js drag now rolls the local mesh back when the server rejects the command.
- Chat proposals and manual commands both pass through applyChanges, so preview and adoption use the same transform rules. Frontend 2D and 3D controls retain the shared item identity and surface boundary/collision errors.
- Verification: npm run check; 10/10 ALVA-024, ALVA-023, ALVA-021, ALVA-022 and business regressions; npm run build:alva; real Chromium result evidence/20260925T102254871Z-ALVA024-browser-2a4841/result.json with pass=true and console errors 0. Coverage includes 2D drag, Three.js 3D drag, rotation, collision and boundary rejection, lock bypass rejection, and refresh persistence. Browser fixture is synthetic and Chat parity is covered by the API test; no model output is claimed.
- Main integration is required before the ticket is released; no production deployment or database migration was performed.
