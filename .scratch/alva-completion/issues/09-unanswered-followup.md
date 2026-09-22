# 09: 未答看板与退出问卷分析

**ID:** ALVA-016

**Parent scope:** T03

**Review reference:** R03

**What to build:** 从房间未答项回到Chat，退出问卷时只分析新信息。

**Blocked by:** [ALVA-015](08-chat-answer-confirmation.md)

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；原实现提交 `04ca6de1a3e1f58f70c9f84bfe6e091c40d3f68a`，随后 squash 集成到 `main`。

- [x] 按房间/全屋范围统计，不因另一房间答过同题就消失；禁用项不计入。
- [x] 点击未答项带题目和房间进入Chat，不仅切换问卷标签。
- [x] 退出问卷增量分析，重复退出不重处理；已处理问题不重复询问，失败可重试。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `questions`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

Lexie 已在 `task/ALVA-016-lexie` 完成本票实现。未答看板现在按“全屋 + 每个房间”分别统计，仅计算启用问题；同一房间回答不会让另一房间同题消失。点击未答项会把题号、问题文本和目标房间带入左侧 Chat composer，同时切换当前房间并聚焦输入框，而不是只切回问卷标签。

退出问卷时 `/api/analyze` 使用 `lastAnalysisEvidence` 作为增量游标，只把新增 evidence 交给真实 Codex；模型只能通过白名单 `ask_question` 排入仍未回答且未排队的问题，每轮最多两题。模型或处理失败时游标不前进，恢复后可用新请求重试；没有新增 evidence 时直接返回当前项目，不增加 revision；已有“题目 + scope”不会重复排队。普通 Chat 生成的 question card 也开始保存 `roomId`，前端按卡片自身 scope 渲染。

Round 1 `evidence/20260921T151500Z-ALVA016-round1/`：故意注入模型失败后游标保持不变，恢复真实模型后重试成功；只消费新增 evidence，重复退出 revision 不变，问题 scope 不重复。Round 2 `evidence/20260921T153000Z-ALVA016-round2/`：Chromium 验证全屋/客厅/书房独立未答分组、禁用项排除、书房 Q25 点击后带题目与房间进入 Chat，并完成一次真实咨询，console error 0。
