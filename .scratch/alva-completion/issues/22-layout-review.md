# 22: 布局调整与保存前冲突复核

**ID:** ALVA-029

**Parent scope:** T07

**Review reference:** R17

**What to build:** 布局变动后重新定位问题，保存前呈现当前审查结果。

**Blocked by:** [ALVA-028](21-initial-pain-analysis.md), [ALVA-024](17-furniture-transform.md)

**Status:** ready-for-agent

**Execution:** 用户已批准发布本票；尚未实施或上线。发布不等于实施指令，执行时先完成首批六票，再按依赖串行推进。

- [ ] 对当前版本分别检查几何、通行路径、风格/行为、原需求冲突和家具合理性。
- [ ] 每项显示原因/建议并定位对象或路径；上述三类生活痛点复跑正反例。
- [ ] 旧审查与当前布局不混淆；保存记录采用的审查版本和用户取舍。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。
