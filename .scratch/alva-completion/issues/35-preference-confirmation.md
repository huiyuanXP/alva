# 35: 偏好确认与后续建议引用

**ID:** ALVA-042

**Parent scope:** T12

**Review reference:** R31

**What to build:** 将图中偏好确认成有来源的需求，后续建议能引用。

**Blocked by:** [ALVA-041](34-reference-annotation.md), [ALVA-015](08-chat-answer-confirmation.md)

**Status:** ready-for-agent

**Execution:** 用户已批准发布本票；尚未实施或上线。发布不等于实施指令，执行时先完成首批六票，再按依赖串行推进。

- [ ] 点击确认才进入需求，不能覆盖锁定答案或错误房间。
- [ ] 真实咨询能读取已确认偏好并解释来源，未确认分析不冒充已确认。
- [ ] 刷新、保存后来源仍可追溯，交付可明确标为参考。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。
