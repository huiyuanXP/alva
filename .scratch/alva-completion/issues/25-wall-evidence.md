# 25: 墙体分类、证据与专业授权

**ID:** ALVA-032

**Parent scope:** T08

**Review reference:** R20

**What to build:** 受明确授权的专业角色录入墙体分类依据，业主能查看其来源。

**Blocked by:** [ALVA-011](04-openings-scale-confirm.md), [ALVA-031](24-designer-readonly.md)

**Status:** in-progress

**Execution:** 2026-09-26 按用户明确指令由 Lexie 认领；独立 Worktree `task/ALVA-032-Lexie` 开发。专业授权与 owner/designer 分离，墙体分类必须保留证据与操作者；unknown/load-bearing/protected 墙的正式拆改由服务端硬拒绝。

- [ ] 专业能力与业主/设计师只读角色区分，可由受控服务端配置授予及撤回并留痕。
- [ ] 分类保留证据来源与操作者，业主或模型不能自行伪造专业授权。
- [ ] 未知、承重、受保护墙禁止正式拆改；校准不授予拆改许可。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
