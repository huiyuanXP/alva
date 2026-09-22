# 11: 咨询取消与故障重试

**ID:** ALVA-018

**Parent scope:** T04

**Review reference:** R06

**What to build:** 用户取消或遇到失败后保留输入，安全重试当前请求。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；原实现提交 `42b592b263a553dbdb50b06bfa39bab9502000d4`，随后 squash 集成到 `main`。

- [x] 取消终止后续增量与工具副作用，不污染下一次会话。
- [x] 超时及真实不可用模型故障均可见，保留文本与附件输入并可重试。
- [x] 隔离故障留证；重试不重复确认需求、采用方案或写正式场景。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

Lexie 已在 `task/ALVA-018-lexie` 完成本票实现。Chat 取消改为专属 `/api/chat/cancel`，只中止当前项目的 Chat controller，不再复用会同时影响其他长任务的全局取消入口；旧请求 finally 仅在 controller 仍为当前 active 时清理，避免污染后续请求。取消或失败只更新 assistant 状态和失败留证，正常完成前积累的 proposal / pending answer 均不会写入项目。失败信息区分“已取消”“模型响应超时”“模型当前不可用或处理失败”。

前端发送时保存完整 `ChatDraft`（文本、参考图、房间、模型）；取消、超时或模型不可用后自动恢复文本与附件并显示“重试上一条消息（保留原输入与附件）”，重试使用新的 requestId，成功后才清除草稿和附件。`buildAlva` 新增可选 `chatCodex` 注入仅用于验收，生产默认仍使用真实 `runCodex`。

Round 1 `evidence/20260922T104500Z-ALVA018-round1/`：真实模型请求建立后立即取消，assistant 标记 cancelled，scene/answers/pending/accepted proposal 均无副作用；随后新 requestId 原样重试成功并收到 8 个非空流式增量。Round 2 `evidence/20260922T112500Z-ALVA018-round2/`：Chromium 首次请求通过真实供应端的不存在模型触发不可用故障，文本和参考图自动恢复、重试按钮可见；点击重试后使用正常真实模型成功完成，输入与附件清空，scene 不变、无自动采用方案、图片不持久化、console error 0。
