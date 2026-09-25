# 34: 参考图片偏好标注

**ID:** ALVA-041

**Parent scope:** T12

**Review reference:** R30

**What to build:** 上传参考图片并标出喜欢或不喜欢的特征。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** in-progress

**Execution:** 2026-09-25 由 chatgpt-alva041 按用户明确指令认领；独立 Worktree `task/ALVA-041-chatgpt` 开发，候选参考偏好使用独立持久化，不修改 ALVA-057 正占用的 `api/model.ts` 与 `web/src/main.tsx`。

- [ ] 真实模型分析与用户手动标注明确区分。
- [ ] 保留图片来源、原话与作用房间，删除/取消未确认候选不污染需求。
- [ ] 参考图不作为尺寸、结构或材料性能的证据。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `references`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
