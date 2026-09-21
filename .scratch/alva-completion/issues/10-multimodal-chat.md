# 10: 文字与图片真实流式咨询

**ID:** ALVA-017

**Parent scope:** T04

**Review reference:** R05

**What to build:** 在三栏工作台发送文字/附件并收到真实流式答复。

**Blocked by:** None（已有核心可独立验证）

**Status:** in-progress

**Execution:** Lexie 已按 NextTask 正式认领；分支 `task/ALVA-017-lexie`，独立 Worktree `/home/ubuntu/Alva-worktrees/ALVA-017-lexie`。为避免与 ALVA-011 冲突，本票不修改其占用的 `api/api.ts`、`api/store.ts`、`web/src/main.tsx`。

- [ ] 使用assistant-ui原语完成左咨询/中全屋/右问卷；模型选项与实际可用模型一致。
- [ ] 文字和图片各有真实调用，至少两个非空增量；加载/完成/错误状态可辨。
- [ ] 调用与附件限定当前项目；仅白名单工具，模型不能直接写正式设计，原始Codex接口不公开。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
