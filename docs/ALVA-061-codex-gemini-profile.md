# ALVA-061 · Codex Gemini profile

2026-09-25 完成。本机 Codex 使用一个 `gemini` profile，复用现有 `newapi` provider（one_api/New API 网关）和 `NEWAPI_KEY` 环境变量。用户配置位于 `~/.codex/gemini.config.toml`，模型目录位于 `~/.codex/model-catalogs/gemini-newapi.json`；两者均不入 Git，也不包含密钥值。

模型目录列出 `gemini-3.6-flash-high`、`gemini-3.7-flash-high`、`gemini-3.8-flash-high`，默认 3.8。启动 `codex --profile gemini` 后从 Codex 模型设置切换；非交互调用可使用 `codex exec --profile gemini -m gemini-3.7-flash-high '...'`。模型 ID 来自当前网关 `/v1/models` 响应。

验证：三个型号分别以 `codex exec --profile gemini --strict-config --ephemeral --sandbox read-only -m <model>` 发送最小提示，均返回 `OK` 且进程退出码为 0。仅证明当前网关与 Codex Responses 文本调用可用；未测图像输入、工具调用或业务识图质量。调用时 Codex 提示系统未安装 bubblewrap，但改用自带版本完成了只读调用。

Neat-freak 收尾：用户配置、模型目录与实际调用为 `changed-and-verified`；仓库文档、Handoff、NextTask、GlobalHandoff 为 `changed-and-verified`；业务运行态为 `out-of-scope`；规则与生成记忆为 `out-of-scope`；其他并行任务的工作区残留保留，不属本任务。
