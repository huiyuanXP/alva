# 14: 局部3D候选比较与采用

**ID:** ALVA-021

**Parent scope:** T05

**Review reference:** R09

**What to build:** 比较候选后只采用勾选的修改，周边物体仅作参考。

**Blocked by:** [ALVA-020](13-scope-confirmation.md), [ALVA-013](06-example-building-views.md)

**Status:** ready-for-agent

**Execution:** 用户已批准发布本票；尚未实施或上线。发布不等于实施指令，执行时先完成首批六票，再按依赖串行推进。

- [ ] 模糊请求至少两个实际不同、可旋转缩放的3D候选；精确请求可一个。
- [ ] 未采用不写正式设计；周边参考物不默认勾选；仅所选范围原子提交。
- [ ] 旧版本候选拒绝、重复提交幂等、组内任一失败整体回滚，均含正反案例。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。
