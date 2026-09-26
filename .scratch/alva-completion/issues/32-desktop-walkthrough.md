# 32: 桌面漫游与输入暂停

**ID:** ALVA-039

**Parent scope:** T11

**Review reference:** R27

**What to build:** 从全屋进入房间，使用键鼠在真实门洞与碰撞限制下漫游。

**Blocked by:** [ALVA-013](06-example-building-views.md), [ALVA-024](17-furniture-transform.md)

**Status:** in-progress

**Execution:** 2026-09-26 按用户明确指令由 Lexie 认领。与 ALVA-040 同属 render lane，但明确文件隔离：ALVA-039 仅新增 `web/src/scene/walkthrough/*` 并最小修改 `web/src/main.tsx` 装配，不修改 ALVA-040 占用的 `BuildingView.tsx`、`SceneView.tsx` 或 `scene/sunlight*`。

- [ ] WASD前后/横移与鼠标视角有效，墙和家具阻挡、合法门洞可通过。
- [ ] 输入框聚焦、Esc、失焦均立即清空移动状态，恢复后不自动滑行。
- [ ] 全屋/房间导航可返回，保留桌面实测截图和控制台结果。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `render`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
