# 21: 首次需求分析与生活痛点

**ID:** ALVA-028

**Parent scope:** T07

**Review reference:** R16

**What to build:** 确认需求后显示有原话依据的生活痛点。

**Blocked by:** [ALVA-015](08-chat-answer-confirmation.md)

**Status:** done

**Owner:** lzy

**Branch / Worktree:** task/ALVA-028-yang-chatgpt / /home/ubuntu/Alva-worktrees/ALVA-028-yang-chatgpt

**Execution:** 2026-09-22 由 yang-chatgpt 认领；用户要求仅认领并说明，暂不实施。任务聚焦确认需求后的生活痛点分析与展示，不涉及3D开发。

**Execution state:** completed


**完成交接：** 已在独立 Worktree 实施并完成 API 与网页展示；不改 3D。

- [x] 咖啡操作台、宠物玩具、绿植遮光各具命中和不命中样例。
- [x] 区分偏好推导与特殊需求，保留原话、理由、空间、置信及待确认状态。
- [x] 不编造健康或身份；重复分析不重复生成同一条问题。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `review`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## 实施交接

- 确认问卷答案或 Chat 提取答案后，服务端刷新 intake findings。
- 网页需求面板显示生活痛点标题、原话依据、空间、推导类型、置信度、理由、建议和待确认状态。
- 重复确认使用稳定 finding ID 并替换同阶段结果，不累积重复痛点。
- 专项测试：tests/alva-pain-analysis.test.ts；覆盖咖啡、宠物、绿植命中/反例、来源和幂等。
