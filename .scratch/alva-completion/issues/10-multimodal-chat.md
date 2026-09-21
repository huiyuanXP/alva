# 10: 文字与图片真实流式咨询

**ID:** ALVA-017

**Parent scope:** T04

**Review reference:** R05

**What to build:** 在三栏工作台发送文字/附件并收到真实流式答复。

**Blocked by:** None（已有核心可独立验证）

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；实现提交 `0356cef4fe98df84bb172e5550ec11f193b6fbb2`、`c35e707256d6d24e117b602df68df42a87d4f7d5`，同步 ALVA-011 最新 main 后完成最终前端模型接入并 squash 集成到 `main`。

- [x] 使用assistant-ui原语完成左咨询/中全屋/右问卷；模型选项与实际可用模型一致。
- [x] 文字和图片各有真实调用，至少两个非空增量；加载/完成/错误状态可辨。
- [x] 调用与附件限定当前项目；仅白名单工具，模型不能直接写正式设计，原始Codex接口不公开。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

Lexie 已在 `task/ALVA-017-lexie` 完成本票实现；实现提交为 `0356cef4fe98df84bb172e5550ec11f193b6fbb2` 与 `c35e707256d6d24e117b602df68df42a87d4f7d5`。现役三栏工作台继续使用 assistant-ui 原语；咨询模型不再在前端硬编码，而是从 `/api/models` 读取当前可用列表并把实际选择随请求发送。供应端目录仍列出 GPT 系列，但本轮真实调用发现当前凭据对 `gpt-5.5`/`gpt-5.6` 已达使用上限，因此本票以已真实验证可用的 `gemini-3-flash` 作为当前聊天模型。

后端对参考图增加 PNG/JPEG 内容与 MIME 一致性、大小和 base64 校验；模型目录和聊天入参共享同一白名单。聊天仍只暴露 `get_snapshot`、`ask_question`、`propose_answer`、`propose_changes` 等业务工具，原始 Codex 路由不存在；参考图只随当前项目的当前请求进入模型，不持久化图片字节，模型输出不能直接修改 scene 或创建保存快照。

两轮验收证据：`evidence/20260921T103000Z-ALVA017-round1/` 为隔离 API + 真实 Codex 验收，文字 5 个非空增量、图片 4 个非空增量，均完成；跨项目 403、原始 Codex 路由 404、scene/savedVersion 不变、图片未持久化。`evidence/20260921T110500Z-ALVA017-round2/` 为 Chromium 真实 UI 验收，三栏工作台、动态模型选项、文字与图片真实调用、加载/完成状态、场景不被直接修改及 console 0 error 全部通过。
