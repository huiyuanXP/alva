# ALVA-065 主 Chat Agent 与 Harness 合同

2026-09-25 起，本文件是后续功能接入主 Chat 的现役入口说明。主 Chat 的代码身份是 `api/main-chat-agent.ts` 中的 `mainChatAgent`；服务端装配在 `api/chat.ts`，运行器在 `api/codex.ts`。网页唯一主入口是登录后首页左侧“咨询”栏，`web/src/main.tsx` 的发送动作请求 `POST /api/chat`；`POST /api/chat/cancel` 取消当前请求。`GET /api/models` 当前只列出 `gemini-3.1-flash-lite`。Gemini 3.8 Flash High 是**图片户型识别**模型，由 `api/import.ts` 选择，不能误写成主 Chat 模型。

## 现役执行链

```text
登录后的咨询输入框 → POST /api/chat → registerConsultation
  → 本轮项目快照、用户原话与图片 + 明确注册的 BusinessTool[]
  → runCodex → Codex App Server / Responses provider → 动态工具白名单
  → SSE 状态/文本/项目 → 项目消息和候选持久化 → 网页展示
```

`runCodex` 为每次调用建隔离的临时进程和 thread，使用只读 sandbox、`approvalPolicy=never`、无 shell、文件写入、网页搜索和 MCP 工具。只有本轮 `BusinessTool[]` 能被模型调用；未注册的工具请求被拒绝。服务端对工具参数、项目权限、revision、确认条件和结果负责；模型输出本身不等于状态变更。跨轮连续性来自项目存储和注入的快照/最近消息，**不是**保留同一个 Codex thread。ALVA-063 的“同会话截图自查”是独立隔离流程，没有自动接入主 Chat。

主 Chat 的业务提示词和工具注册目前在 `api/chat.ts`；Codex 进程协议、工具分发、超时和取消在 `api/codex.ts`。`api/main-chat-agent.ts` 固定 agent 名称、路由、现役模型与基础指令。后续改主 Chat 模型、入口、基础指令或 Harness 行为，必须把代码、本文、受影响测试和生产验收一起更新；新增业务工具按下面的接入约定实施。`api/codex.ts` 同时服务识图和建筑生成，不能把它们都称为主 Chat agent。

## 新功能接入约定

每个后续用户功能在同一 Ticket 的验收范围内包含主 Chat 适配：为 agent 提供受控工具或调用流程，使用户可以从左侧咨询栏用自然语言发起、获得进度/结果，并在需要时确认；既有直接按钮可以继续作为操作入口。工具只能调用已有业务服务，不复制一套状态逻辑。参数和返回值要有明确合同；必须沿用业主权限、项目 revision、请求幂等、取消/重试、确认和候选边界。功能不适合由模型自行决定的部分，agent 应引导到明确的上传、预览或确认控件，并在 Chat 中解释下一步；不能假称已经调用成功。

完成判据是一次真实或隔离端到端路径：用户从主 Chat 发出该功能请求，服务端实际调用对应适配，返回可见结果；拒绝越权/错误输入；状态更新可从项目重读，必要确认仍由用户完成。仅有 API、按钮、提示词或模型口头回答均不算主 Chat 接入完成。现有功能可按后续独立任务补齐，不把 ALVA-065 文档视作它们已经接入。

当前缺口：`/api/import` 户型图上传、`/api/building/generate` 建筑生成、保存和导出等仍由页面直接发起。主 Chat 当前没有识图或建筑生成工具；上传原图仍需通过“＋ → 户型图 / PDF”，确认拓扑后建筑生成仍需右侧按钮。下一项应优先把上传附件与识图候选挂到 Chat 流程，再处理建筑生成；用户原图准确性校核保持独立确认。

后续任务 Prompt 使用 [主 Chat 接入模板](MAIN-CHAT-FEATURE-PROMPT.md)。这份 Prompt 要求开发 Agent 在功能完成时自动做接口适配和验收；它不能让运行中的产品 Agent 自动发现或获得未注册的工具。
