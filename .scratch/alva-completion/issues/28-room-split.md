# 28: 空间拆分与需求分配

**ID:** ALVA-035

**Parent scope:** T09

**Review reference:** R23

**What to build:** 把一个空间拆分，明确各子空间的需求和对象归属。

**Blocked by:** [ALVA-033](26-wall-renovation.md)

**Status:** done

**Execution:** 2026-09-26 由 lzy 在独立 Worktree `task/ALVA-035-lzy` / `/home/ubuntu/Alva-worktrees/ALVA-035-lzy` 完成实施与验收；依赖 ALVA-033 已在 main 集成。

- [x] 子房间新旧来源可追溯；跨边界家具、开口和全屋/房间需求逐项确认。
- [x] 不丢锁定项与原话，歧义不自动猜；失败整个事务回滚。
- [x] 拆分预览、确认、保存和整版恢复可演示，2D/3D/问卷一致。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- 新增 `/api/rooms/split/preview` 与 `/api/rooms/split/confirm`，以及 `preview_room_split` / `confirm_room_split` MCP 工具。
- 拆分候选以多边形裁剪生成两个真实子空间；家具、门窗、问卷、原话、发现和房间需求必须逐项分配，预览只读。
- 确认后记录来源与分配关系，保留锁定项和原话，生成新拓扑版本并使旧建筑 3D 过期；保存版本与整体恢复保持一致。
- 前端新增“空间拆分”面板，提供拆分方向、比例、子空间名称/用途、2D/3D 候选和逐项归属控件。
- `npm run check`、`npm run build:alva`、`git diff --check` 通过；`tests/alva-room-split.test.ts` 4/4 通过；真实 Cloudflare 浏览器通道完成登录、面板、候选预览和对象分配入口验收。
