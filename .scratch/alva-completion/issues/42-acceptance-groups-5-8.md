# 42: 最终回归：编辑、保存、交付、桌面

**ID:** ALVA-049

**Parent scope:** T15

**Review reference:** R38

**What to build:** 在同一最终功能代码上跑完验收第5–8组并补齐所有保留UI证据。

**Blocked by:** [ALVA-047](40-group-proposals.md)

**Status:** in-progress

**Execution:** 2026-09-26 由 lzy 认领，在独立 Worktree `task/ALVA-049-lzy` / `/home/ubuntu/Alva-worktrees/ALVA-049-lzy` 实施；ALVA-047 已在 main 集成。

- [ ] 家具/用途/受控墙改/合并拆分、版本回退与导出逐项覆盖，含故障和越权负例。
- [ ] 漫游、碰撞、光照、焦点在理想机器上真实浏览器验证，控制台error为0。
- [ ] 逐个保留UI映射测试/截图、八组汇总无漏项；不删除测试或放宽断言。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `acceptance-scene`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
