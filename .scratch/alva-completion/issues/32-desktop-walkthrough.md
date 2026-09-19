# 32: 桌面漫游与输入暂停

**ID:** ALVA-039

**Parent scope:** T11

**Review reference:** R27

**What to build:** 从全屋进入房间，使用键鼠在真实门洞与碰撞限制下漫游。

**Blocked by:** [ALVA-013](06-example-building-views.md), [ALVA-024](17-furniture-transform.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] WASD前后/横移与鼠标视角有效，墙和家具阻挡、合法门洞可通过。
- [ ] 输入框聚焦、Esc、失焦均立即清空移动状态，恢复后不自动滑行。
- [ ] 全屋/房间导航可返回，保留桌面实测截图和控制台结果。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `render`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
