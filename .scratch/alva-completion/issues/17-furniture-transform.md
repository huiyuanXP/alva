# 17: 家具移动、旋转与吸附

**ID:** ALVA-024

**Parent scope:** T06

**Review reference:** R12

**What to build:** 在2D/3D中调整家具位置和方向，Chat也遵循相同规则。

**Blocked by:** [ALVA-023](16-furniture-add-copy.md)

**Status:** ready-for-agent

**Execution:** 用户已批准发布本票；尚未实施或上线。发布不等于实施指令，执行时先完成首批六票，再按依赖串行推进。

- [ ] 手动与Chat共用服务端修改规则；位置、旋转、吸附在两种视图一致。
- [ ] 网格和碰撞同步更新，刷新后保留；锁定对象不能绕过限制。
- [ ] 边界非法或失败不写入部分坐标，用户得到可理解反馈。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。
