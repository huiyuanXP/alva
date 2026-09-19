# 44: 备份、干净复现与最终交接

**ID:** ALVA-051

**Parent scope:** T15

**Review reference:** R40

**What to build:** 交付可隔离恢复、可干净安装、可回滚的最终源码与操作资料。

**Blocked by:** [ALVA-050](43-public-verification.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 隔离备份恢复逐项核验，生产恢复正常；私有备份不进入源码包。
- [ ] 无凭据源码包干净安装/类型/构建/启动通过，环境模板及功能/API/测试清单齐全。
- [ ] 汇总同一代码版本的八组100%通过、skip0、公网与恢复证据后才标ready_for_review；任一缺项保持待验。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `production`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
