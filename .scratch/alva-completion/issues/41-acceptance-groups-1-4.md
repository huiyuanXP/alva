# 41: 最终回归：导入、Chat、问卷、痛点

**ID:** ALVA-048

**Parent scope:** T15

**Review reference:** R37

**What to build:** 在最终功能代码上跑完验收第1–4组并展示真实证据。

**Blocked by:** [ALVA-047](40-group-proposals.md)

**Status:** in-progress

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-048-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-048-Lexie`

- [ ] 两张不同真实户型经识图/校准；同源拓扑与建筑生成关联有效，保留坏几何拒绝。
- [ ] 真实文字/图片/转写、取消重试、问卷双向/锁定、痛点双阶段正反例全部验证。
- [ ] 统计必验断言与截图，新验收skip为0；实体麦克风缺证保持待验，不冒充完成。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `acceptance-business`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
