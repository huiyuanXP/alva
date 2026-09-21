# 07: 问卷范围精简与逐题回答

**ID:** ALVA-014

**Parent scope:** T03

**Review reference:** R01

**What to build:** 在房间问卷中完成一题并刷新保留结果。

**Blocked by:** None（已有核心可独立验证）

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；原实现提交 `9e309ec241116f276c738c9d7ef4aecd7ea6a06c`，随后按 NextTask 规则 squash 集成到 `main`。

- [x] Q01–Q60 ID保留；Q19–Q22、Q60预算题及Q58视频题禁用且不进入问答/未答统计；清除其他题的预算选项，时间安排仍保留。每轮1题，直接相关最多2题。
- [x] A推荐/B/C/D不同替代及自由回答可用；未知、跳过、不适用分别存储与显示。
- [x] 房间级与全屋级答案分开，切换房间不串值；锁定答案拒绝覆盖。
- [x] 移除现有预算界面、字段写入/接口与模型工具能力；本轮应用合同不包含预算，不自动删除历史用户数据或改写旧快照。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `questions`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

Lexie 已在 `task/ALVA-014-lexie` 完成本票实现；原实现提交 `9e309ec241116f276c738c9d7ef4aecd7ea6a06c`。现役问卷仍保留 Q01–Q60 稳定 ID，但 Q19–Q22、Q58、Q60 在 API/Chat/UI/未答统计中停用；其他现役题已清除预算措辞并保留 Q23/Q24 时间安排。前端保留 A 推荐、B/C/D 替代、自由回答和 unknown/skipped/not_applicable，房间级与项目级答案按 scope 隔离，锁定值继续由服务端拒绝覆盖。

预算能力已从现役 `Project` 合同、预算写接口、问卷 UI、Chat 工具快照和交付导出中移除。兼容策略是不迁移或删除数据库/旧快照中的历史 `budget` 数据：旧 JSON 仍可在持久层存在，但当前 HTTP 返回、模型快照和新导出不会把它作为现役能力暴露。

验证证据：`evidence/20260921T073000Z-ALVA014-round1/`（TypeScript、生产构建及 8 个相关回归全部通过）与 `evidence/20260921T074000Z-ALVA014-round2/`（Chromium 真实页面验收通过：54 个可用题、6 个停用题隐藏、无预算 UI、房间答案隔离、unknown 显示、锁定 422、刷新持久化、无登录后 console error）。补充全量 `npm test` 为 70/73；3 个失败均与本票无关：tracker frontier 因 ALVA-014 已认领/ALVA-031 当前可用而静态期望过时，另 2 个 media 测试因未提供 `RENOVATION_MEDIA_FIXTURES`。
