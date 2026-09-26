# 37: 设计师任务书与业主说明

**ID:** ALVA-044

**Parent scope:** T13

**Review reference:** R33

**What to build:** 同一保存版本产生可编辑设计师任务书与业主PDF。

**Blocked by:** [ALVA-016](09-unanswered-followup.md), [ALVA-030](23-professional-unknowns.md), [ALVA-036](29-manual-snapshot.md), [ALVA-042](35-preference-confirmation.md), [ALVA-043](36-business-guidance.md)

**Status:** in-progress

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-044-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-044-Lexie`

- [ ] 逐项映射业务D01–D10/U01–U05：原话、需求、偏好、痛点、取舍、未决、家具材料、实施计划。
- [ ] DOCX有可编辑正文，PDF与之使用同一版本；不是截图Word，不包含预算或金额章节。
- [ ] 未决与专业未知不被写成已解决；业务指导可追溯，不宣称施工图。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `delivery`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
