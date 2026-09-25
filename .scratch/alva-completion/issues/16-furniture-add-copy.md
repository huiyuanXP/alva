# 16: 家具添加、选择与复制

**ID:** ALVA-023

**Parent scope:** T06

**Review reference:** R11

**What to build:** 从许可家具库添加、选中并复制一个独立实例。

**Blocked by:** None（已有核心可独立验证）

**Status:** done

**Execution:** 已由 lzy 在独立 Worktree 完成，并在验证通过后合入 main。

- [x] 2D/3D选中同一实例，新增/复制每次分配新UUID。
- [x] 库资产定义不被实例修改，新增物体属于明确房间。
- [x] 刷新后身份与位置一致；无效资产或房间不产生半个实例。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `furniture`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Owner: lzy; Worktree: /home/ubuntu/Alva-worktrees/ALVA-023-lzy; implementation commit: 07e9359; main integration commit: 46255de.
- Added furniture inspector test IDs and 2D instance markers; retained server-side licensed asset validation, explicit room ownership, fresh UUID creation for add/copy, sourceId on copies, immutable asset definitions, and atomic command failure behavior. Three.js selection resolves the same item ID used by the 2D plan and inspector.
- Verification: npm run check; ALVA-023 API/browser test plus ALVA-021/022/business regressions: 8/8 passed; npm run build:alva; real Chromium result evidence/20260925T094742274Z-ALVA023-browser-5e3711/result.json with pass=true and console errors 0. The browser run used a deterministic synthetic scene and does not claim model recognition.
- Main integration is required before the ticket is released; no production deployment or database migration was performed.
