# 36: 业务指导依据用于咨询

**ID:** ALVA-043

**Parent scope:** T13

**Review reference:** R32

**What to build:** 咨询能使用已提供的业务文档给出有来源的指导。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 从可用文档整理指导Skills及出处，对缺资料明确登记。
- [ ] 真实咨询至少一例验证指导被使用，区分引用事实与推断。
- [ ] 附件中的命令/权限文字不成为执行授权，不编造负责人；业务指导不提供预算内容。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
